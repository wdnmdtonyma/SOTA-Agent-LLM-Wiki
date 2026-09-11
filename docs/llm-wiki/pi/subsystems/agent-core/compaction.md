---
id: subsys.agent-core.compaction
title: 压缩子系统
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/compaction/compaction.ts
  - packages/agent/src/harness/compaction/utils.ts
symbols:
  - shouldCompact
  - prepareCompaction
  - compact
  - estimateTokens
  - completeSimpleWithRetries
  - generateSummaryWithUsage
  - generateSummaryWithRequest
  - compactWithRequest
  - CompactResult
related:
  - spine.compaction-flow
  - subsys.agent-core.branch-summary
  - ref.agent.compaction-config
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.compaction` 是 `pi-agent-core` 的当前分支上下文压缩层: 它用 token threshold 决定是否该压缩,把 session path 切成 summary history 与 retained recent history,调用模型生成 checkpoint summary,并把文件读写 metadata 附在压缩结果上。

## 能回答的问题

- 默认 compaction settings 是什么,`shouldCompact()` 的阈值公式是什么?
- `prepareCompaction()` 如何定位 previous compaction boundary、cut point、split turn 和 `firstKeptEntryId`?
- `compact()` 何时生成普通 summary,何时额外生成 split-turn prefix summary?
- `estimateTokens()` 和 `estimateContextTokens()` 如何混用 provider usage 与本地字符估算?
- compaction summary 与 branch summary 的职责边界在哪里?

## 职责边界

本节点覆盖 `packages/agent/src/harness/compaction/compaction.ts` 与 `packages/agent/src/harness/compaction/utils.ts` 中的 compaction settings、token 估算、准备阶段、summary 生成和文件操作 metadata;不覆盖 abandoned branch collection 或 branch-summary prompt,那些属于 `subsys.agent-core.branch-summary` [E: packages/agent/src/harness/compaction/compaction.ts:22] [E: packages/agent/src/harness/compaction/compaction.ts:23] [E: packages/agent/src/harness/compaction/compaction.ts:28] [I]。

`shouldCompact()` 是纯阈值 gate;`prepareCompaction()` 只接收 `pathEntries` 和 `settings`,没有接收 model context window,也没有在函数体内调用 `shouldCompact()` [E: packages/agent/src/harness/compaction/compaction.ts:246] [E: packages/agent/src/harness/compaction/compaction.ts:634] [E: packages/agent/src/harness/compaction/compaction.ts:659] [E: packages/agent/src/harness/compaction/compaction.ts:636] [I]。

`compact()` 生成 `CompactResult`,但这两个 source 文件没有把 result append 成 session entry;持久化 `compaction` entry 的调用点属于 harness/session 上层 [E: packages/agent/src/harness/compaction/compaction.ts:98] [E: packages/agent/src/harness/compaction/compaction.ts:727] [E: packages/agent/src/harness/compaction/compaction.ts:815] [I]。

## Settings 与默认值

`CompactionSettings` 包含三个字段: `enabled` 控制 automatic compaction decision 是否启用,`reserveTokens` 给 summary prompt 和 output 预留 token,`keepRecentTokens` 表示压缩后尽量保留的 recent-context token 预算 [E: packages/agent/src/harness/compaction/compaction.ts:147] [E: packages/agent/src/harness/compaction/compaction.ts:149] [E: packages/agent/src/harness/compaction/compaction.ts:151] [E: packages/agent/src/harness/compaction/compaction.ts:153]。

`DEFAULT_COMPACTION_SETTINGS` 默认启用 compaction,`reserveTokens` 为 `16384`,`keepRecentTokens` 为 `20000` [E: packages/agent/src/harness/compaction/compaction.ts:157] [E: packages/agent/src/harness/compaction/compaction.ts:158] [E: packages/agent/src/harness/compaction/compaction.ts:159] [E: packages/agent/src/harness/compaction/compaction.ts:160]。

`shouldCompact(contextTokens, contextWindow, settings)` 先检查 `settings.enabled`;禁用时直接返回 false,启用时使用 `contextTokens > contextWindow - settings.reserveTokens` 作为触发条件 [E: packages/agent/src/harness/compaction/compaction.ts:246] [E: packages/agent/src/harness/compaction/compaction.ts:247] [E: packages/agent/src/harness/compaction/compaction.ts:248]。

## Token Estimate

`calculateContextTokens(usage)` 优先返回 provider 报告的 `usage.totalTokens`;没有 total 时用 `usage.input + usage.output + usage.cacheRead + usage.cacheWrite` 相加 [E: packages/agent/src/harness/compaction/compaction.ts:164] [E: packages/agent/src/harness/compaction/compaction.ts:165]。

`getAssistantUsage()` 只接受正常 assistant message 的 usage: assistant `stopReason` 为 `"aborted"` 或 `"error"` 时不会使用 usage,usage 缺失或计算后不大于 0 时也不会返回 usage [E: packages/agent/src/harness/compaction/compaction.ts:167] [E: packages/agent/src/harness/compaction/compaction.ts:168] [E: packages/agent/src/harness/compaction/compaction.ts:171] [E: packages/agent/src/harness/compaction/compaction.ts:172] [E: packages/agent/src/harness/compaction/compaction.ts:173] [E: packages/agent/src/harness/compaction/compaction.ts:174] [E: packages/agent/src/harness/compaction/compaction.ts:176]。

`estimateContextTokens(messages)` 有 provider usage 时,使用最后一个有效 assistant usage 的 context token 作为基线,只对该 assistant 之后的 trailing messages 调用 `estimateTokens()`;没有 usage 时,逐条估算所有 messages [E: packages/agent/src/harness/compaction/compaction.ts:215] [E: packages/agent/src/harness/compaction/compaction.ts:216] [E: packages/agent/src/harness/compaction/compaction.ts:218] [E: packages/agent/src/harness/compaction/compaction.ts:221] [E: packages/agent/src/harness/compaction/compaction.ts:231] [E: packages/agent/src/harness/compaction/compaction.ts:233] [E: packages/agent/src/harness/compaction/compaction.ts:234] [E: packages/agent/src/harness/compaction/compaction.ts:238]。

`estimateTokens(message)` 是字符数除以 4 后向上取整的 heuristic: user/custom/toolResult 走 text/image content 字符估算,assistant 累加 text、thinking、toolCall name 与 serialized arguments,bashExecution 累加 command 与 output,branchSummary/compactionSummary 使用 summary 长度 [E: packages/agent/src/harness/compaction/compaction.ts:270] [E: packages/agent/src/harness/compaction/compaction.ts:275] [E: packages/agent/src/harness/compaction/compaction.ts:278] [E: packages/agent/src/harness/compaction/compaction.ts:282] [E: packages/agent/src/harness/compaction/compaction.ts:283] [E: packages/agent/src/harness/compaction/compaction.ts:285] [E: packages/agent/src/harness/compaction/compaction.ts:287] [E: packages/agent/src/harness/compaction/compaction.ts:288] [E: packages/agent/src/harness/compaction/compaction.ts:295] [E: packages/agent/src/harness/compaction/compaction.ts:299] [E: packages/agent/src/harness/compaction/compaction.ts:304] [E: packages/agent/src/harness/compaction/compaction.ts:305]。

图片 content 不读取真实图像 token;`estimateTextAndImageContentChars()` 对每个 `type === "image"` block 加固定 `ESTIMATED_IMAGE_CHARS` 值 `4800`,再统一除以 4 变成 token 估算 [E: packages/agent/src/harness/compaction/compaction.ts:251] [E: packages/agent/src/harness/compaction/compaction.ts:253] [E: packages/agent/src/harness/compaction/compaction.ts:262] [E: packages/agent/src/harness/compaction/compaction.ts:263] [I]。

## Prepare Compaction

`prepareCompaction(pathEntries, settings)` 在 path 为空或最后一个 entry 已是 `compaction` 时返回 `ok(undefined)`,避免无内容或连续 compaction entry 的准备工作 [E: packages/agent/src/harness/compaction/compaction.ts:634] [E: packages/agent/src/harness/compaction/compaction.ts:638] [E: packages/agent/src/harness/compaction/compaction.ts:639]。

准备阶段会从 path 尾部寻找最近的 `compaction` entry;找到后读取它的 `summary` 作为 `previousSummary`,并用 `retainedTail` 生成 virtual message entries,再拼上 compaction 之后的 path 作为 `compactableEntries` [E: packages/agent/src/harness/compaction/compaction.ts:642] [E: packages/agent/src/harness/compaction/compaction.ts:652] [E: packages/agent/src/harness/compaction/compaction.ts:654] [E: packages/agent/src/harness/compaction/compaction.ts:655] [E: packages/agent/src/harness/compaction/compaction.ts:663]。

`tokensBefore` 来自 `estimateContextTokens(buildContextEntries(pathEntries).flatMap(sessionEntryToContextMessages)).tokens`,因此准备阶段估算的是当前 path 构成模型 context 后的 token 量,不是 raw entry 数量 [E: packages/agent/src/harness/compaction/compaction.ts:667] [E: packages/agent/src/harness/compaction/compaction.ts:668]。

`findCutPoint(entries, startIndex, endIndex, keepRecentTokens)` 先通过 valid cut points 限制可切边界,再从末尾反向累加 message token;当 accumulated tokens 达到 `keepRecentTokens` 时,选择第一个不早于当前位置的 cut point [E: packages/agent/src/harness/compaction/compaction.ts:370] [E: packages/agent/src/harness/compaction/compaction.ts:376] [E: packages/agent/src/harness/compaction/compaction.ts:384] [E: packages/agent/src/harness/compaction/compaction.ts:387] [E: packages/agent/src/harness/compaction/compaction.ts:389] [E: packages/agent/src/harness/compaction/compaction.ts:390] [E: packages/agent/src/harness/compaction/compaction.ts:391] [E: packages/agent/src/harness/compaction/compaction.ts:392]。

valid cut point 包括 `message` entry 中的 `bashExecution`、`custom`、`branchSummary`、`compactionSummary`、`user`、`assistant`,不包括普通 `toolResult`;entry 层只有额外的 `branch_summary` 会加入 cut points,`entry.type === "custom"` 不会 [E: packages/agent/src/harness/compaction/compaction.ts:319] [E: packages/agent/src/harness/compaction/compaction.ts:320] [E: packages/agent/src/harness/compaction/compaction.ts:324] [E: packages/agent/src/harness/compaction/compaction.ts:327] [E: packages/agent/src/harness/compaction/compaction.ts:334] [E: packages/agent/src/harness/compaction/compaction.ts:337]。

cut point 选出后,`findCutPoint()` 会向前移动 `cutIndex`,直到前一项是 `compaction` 或 `message`,以免保留区前面残留孤立 metadata entry [E: packages/agent/src/harness/compaction/compaction.ts:399] [E: packages/agent/src/harness/compaction/compaction.ts:400] [E: packages/agent/src/harness/compaction/compaction.ts:401] [E: packages/agent/src/harness/compaction/compaction.ts:404] [E: packages/agent/src/harness/compaction/compaction.ts:407] [I]。

如果 cut entry 不是 user message,`findCutPoint()` 用 `findTurnStartIndex()` 向前找同一 turn 的起点;找到时返回 `isSplitTurn: true`,否则不是 split turn [E: packages/agent/src/harness/compaction/compaction.ts:409] [E: packages/agent/src/harness/compaction/compaction.ts:410] [E: packages/agent/src/harness/compaction/compaction.ts:411] [E: packages/agent/src/harness/compaction/compaction.ts:413] [E: packages/agent/src/harness/compaction/compaction.ts:416]。

`prepareCompaction()` 不再钉 `firstKeptEntryId`,也不因缺 id 返回 `invalid_session`。它用 `cutPoint.firstKeptEntryIndex` 切 `compactableEntries`,并把 cut 之后的 messages 收进 `retainedTail` [E: packages/agent/src/harness/compaction/compaction.ts:671] [E: packages/agent/src/harness/compaction/compaction.ts:685] [E: packages/agent/src/harness/compaction/compaction.ts:697]。

非 split turn 时,`messagesToSummarize` 覆盖 `[0, historyEnd)`;split turn 时,历史 summary 截止到 `turnStartIndex`,而 `turnPrefixMessages` 覆盖同一 turn 中 `turnStartIndex..firstKeptEntryIndex` 的 prefix [E: packages/agent/src/harness/compaction/compaction.ts:672] [E: packages/agent/src/harness/compaction/compaction.ts:678] [E: packages/agent/src/harness/compaction/compaction.ts:680]。

`getMessageFromEntry()` 只把 `message`、`branch_summary`、`compaction` 转成 `AgentMessage`；`type === "custom"` 以及其它 variant 返回 `undefined`。`getMessageFromEntryForCompaction()` 额外跳过历史 `compaction` entry [E: packages/agent/src/harness/compaction/compaction.ts:77] [E: packages/agent/src/harness/compaction/compaction.ts:78] [E: packages/agent/src/harness/compaction/compaction.ts:81] [E: packages/agent/src/harness/compaction/compaction.ts:84] [E: packages/agent/src/harness/compaction/compaction.ts:87] [E: packages/agent/src/harness/compaction/compaction.ts:90] [E: packages/agent/src/harness/compaction/compaction.ts:91] [E: packages/agent/src/harness/compaction/compaction.ts:94]。

文件操作 metadata 从 `messagesToSummarize` 中的 assistant tool calls 提取;split turn 时额外把 `turnPrefixMessages` 的文件操作也并入同一个 accumulator [E: packages/agent/src/harness/compaction/compaction.ts:690] [E: packages/agent/src/harness/compaction/compaction.ts:691] [E: packages/agent/src/harness/compaction/compaction.ts:692] [E: packages/agent/src/harness/compaction/compaction.ts:693]。

## Compact

`compact(preparation, models, model, customInstructions, thinkingLevel, retry, callbacks, context)` 没有 positional `signal`；它转给 `compactWithRequest`,再按 `isSplitTurn` 和 `turnPrefixMessages.length` 选择 summary 路径,返回 `CompactResult` 的 `summary` / `tokensBefore` / `usage` / `retainedTail` / `details` [E: packages/agent/src/harness/compaction/compaction.ts:727] [E: packages/agent/src/harness/compaction/compaction.ts:735] [E: packages/agent/src/harness/compaction/compaction.ts:737] [E: packages/agent/src/harness/compaction/compaction.ts:98] [E: packages/agent/src/harness/compaction/compaction.ts:815]。

`compactWithRequest` 调用 `generateSummaryWithRequest`,不是 `generateSummaryWithUsage`;有 `previousSummary` 时,该函数使用 update prompt 并把 previous summary 放入 `<previous-summary>` 标签,否则使用 fresh summary prompt [E: packages/agent/src/harness/compaction/compaction.ts:753] [E: packages/agent/src/harness/compaction/compaction.ts:778] [E: packages/agent/src/harness/compaction/compaction.ts:800] [E: packages/agent/src/harness/compaction/compaction.ts:566] [E: packages/agent/src/harness/compaction/compaction.ts:573] [E: packages/agent/src/harness/compaction/compaction.ts:574]。

split turn 且有 prefix messages 时,`compact()` 先生成可选的 history summary，再生成 turn-prefix summary；如果没有 prior history,history side 使用 `"No prior history."` 占位。两次调用都接收同一 retry policy/callbacks，但当前实现是顺序 await，不是并行请求 [E: packages/agent/src/harness/compaction/compaction.ts:774] [E: packages/agent/src/harness/compaction/compaction.ts:778] [E: packages/agent/src/harness/compaction/compaction.ts:517] [E: packages/agent/src/harness/compaction/compaction.ts:788] [E: packages/agent/src/harness/compaction/compaction.ts:517]。

split turn 的最终 summary 是 history summary、分隔线、`**Turn Context (split turn):**` 和 prefix summary 的拼接;prefix summary 使用独立 prompt,要求描述 retained suffix 所需的原始请求、早期进展和上下文 [E: packages/agent/src/harness/compaction/compaction.ts:797] [E: packages/agent/src/harness/compaction/compaction.ts:709] [E: packages/agent/src/harness/compaction/compaction.ts:713] [E: packages/agent/src/harness/compaction/compaction.ts:716] [E: packages/agent/src/harness/compaction/compaction.ts:719]。

`generateSummaryWithRequest()` 和 `generateTurnPrefixSummary()` 都先 `convertToLlm()` 再 `serializeConversation()`,把 conversation 放入单条 user message,再交给 caller 的 `request`；`compact()` 把该 `request` 接到 `completeSimpleWithRetries()` [E: packages/agent/src/harness/compaction/compaction.ts:570] [E: packages/agent/src/harness/compaction/compaction.ts:578] [E: packages/agent/src/harness/compaction/compaction.ts:591] [E: packages/agent/src/harness/compaction/compaction.ts:829] [E: packages/agent/src/harness/compaction/compaction.ts:844] [E: packages/agent/src/harness/compaction/compaction.ts:737] [E: packages/agent/src/harness/compaction/compaction.ts:741]。

`completeSimpleWithRetries()` 把每次 summary 当作独立请求：强制 `cacheRetention: "none"`，为每次调用生成新的 `uuidv7()` session id，再通过 `retryAssistantCall()` 执行。因此 compaction 与复用该 wrapper 的 branch summary 不会把 standalone summary 写入可复用 prompt cache，也不沿用交互会话的 routing id。[E: packages/agent/src/harness/compaction/compaction.ts:127] [E: packages/agent/src/harness/compaction/compaction.ts:137] [E: packages/agent/src/harness/compaction/compaction.ts:122] [E: packages/agent/src/harness/compaction/compaction.ts:123] [E: packages/agent/src/harness/compaction/compaction.ts:138] [E: packages/agent/src/harness/compaction/compaction.ts:139] [E: packages/agent/src/harness/compaction/compaction.ts:140] [E: packages/agent/src/harness/compaction/compaction.ts:141]

summary 调用的 `maxTokens` 受 `reserveTokens` 与 `model.maxTokens` 双重限制:普通 summary 用 `Math.floor(0.8 * reserveTokens)`,turn-prefix summary 用 `Math.floor(0.5 * reserveTokens)`,两者都会再和正数 `model.maxTokens` 取较小值 [E: packages/agent/src/harness/compaction/compaction.ts:562] [E: packages/agent/src/harness/compaction/compaction.ts:563] [E: packages/agent/src/harness/compaction/compaction.ts:564] [E: packages/agent/src/harness/compaction/compaction.ts:825] [E: packages/agent/src/harness/compaction/compaction.ts:826] [E: packages/agent/src/harness/compaction/compaction.ts:827]。

当 model 支持 reasoning 且 `thinkingLevel` 存在并且不是 `"off"` 时,summary request options 带 `reasoning: thinkingLevel`;否则 options 只包含 `maxTokens` 和 `signal` [E: packages/agent/src/harness/compaction/compaction.ts:586] [E: packages/agent/src/harness/compaction/compaction.ts:841] [E: packages/agent/src/harness/compaction/compaction.ts:842] [E: packages/agent/src/harness/compaction/compaction.ts:843] [E: packages/agent/src/harness/compaction/compaction.ts:841] [E: packages/agent/src/harness/compaction/compaction.ts:842] [E: packages/agent/src/harness/compaction/compaction.ts:843]。

provider 返回 `stopReason === "aborted"` 时转换为 `CompactionError("aborted", ...)`;返回 `stopReason === "error"` 时转换为 `CompactionError("summarization_failed", ...)`;成功结果同时保留 text 与 provider usage [E: packages/agent/src/harness/compaction/compaction.ts:596] [E: packages/agent/src/harness/compaction/compaction.ts:599] [E: packages/agent/src/harness/compaction/compaction.ts:608] [E: packages/agent/src/harness/compaction/compaction.ts:610]。split-turn 的两次摘要 usage 用 `addUsage()` 合并，普通路径直接采用 summary usage；`compactWithRequest` 把最终 usage 与 `retainedTail` 一并返回 [E: packages/agent/src/harness/compaction/compaction.ts:21] [E: packages/agent/src/harness/compaction/compaction.ts:798] [E: packages/agent/src/harness/compaction/compaction.ts:808] [E: packages/agent/src/harness/compaction/compaction.ts:815]。

`compact()` 最后用 `computeFileLists(fileOps)` 得到 sorted read-only 与 modified file lists,把 `<read-files>` / `<modified-files>` metadata tags 追加到 summary,并在 result details 中保存同一组 file lists [E: packages/agent/src/harness/compaction/compaction.ts:811] [E: packages/agent/src/harness/compaction/compaction.ts:812] [E: packages/agent/src/harness/compaction/compaction.ts:861] [E: packages/agent/src/harness/compaction/compaction.ts:813] [E: packages/agent/src/harness/compaction/utils.ts:54] [E: packages/agent/src/harness/compaction/utils.ts:55] [E: packages/agent/src/harness/compaction/utils.ts:56] [E: packages/agent/src/harness/compaction/utils.ts:57] [E: packages/agent/src/harness/compaction/utils.ts:62] [E: packages/agent/src/harness/compaction/utils.ts:65] [E: packages/agent/src/harness/compaction/utils.ts:68]。

## 文件操作 Metadata

`extractFileOpsFromMessage()` 只读取 assistant message 中 `type === "toolCall"` 且带 string `arguments.path` 的 blocks;工具名为 `read` 时加入 read set,`write` 加入 written set,`edit` 加入 edited set [E: packages/agent/src/harness/compaction/utils.ts:24] [E: packages/agent/src/harness/compaction/utils.ts:25] [E: packages/agent/src/harness/compaction/utils.ts:28] [E: packages/agent/src/harness/compaction/utils.ts:30] [E: packages/agent/src/harness/compaction/utils.ts:31] [E: packages/agent/src/harness/compaction/utils.ts:36] [E: packages/agent/src/harness/compaction/utils.ts:37] [E: packages/agent/src/harness/compaction/utils.ts:39] [E: packages/agent/src/harness/compaction/utils.ts:41] [E: packages/agent/src/harness/compaction/utils.ts:44] [E: packages/agent/src/harness/compaction/utils.ts:47]。

previous compaction 的 file details 只要 `prevCompaction.details` 存在就会复制进下一次 extraction，没有 `!fromHook` 守卫；历史 `readFiles` 加入 `fileOps.read`，历史 `modifiedFiles` 加入 `fileOps.edited` [E: packages/agent/src/harness/compaction/compaction.ts:52] [E: packages/agent/src/harness/compaction/compaction.ts:53] [E: packages/agent/src/harness/compaction/compaction.ts:59] [E: packages/agent/src/harness/compaction/compaction.ts:59] [E: packages/agent/src/harness/compaction/compaction.ts:60] [E: packages/agent/src/harness/compaction/compaction.ts:64] [E: packages/agent/src/harness/compaction/compaction.ts:65]。

`computeFileLists()` 把 `edited` 和 `written` 合并为 modified set,再从 read set 中排除已 modified 的路径,因此同时 read+write/edit 的文件只出现在 `modifiedFiles` 中 [E: packages/agent/src/harness/compaction/utils.ts:54] [E: packages/agent/src/harness/compaction/utils.ts:55] [E: packages/agent/src/harness/compaction/utils.ts:56] [E: packages/agent/src/harness/compaction/utils.ts:57] [E: packages/agent/src/harness/compaction/utils.ts:58]。

## Gotcha

- `prepareCompaction()` 不判断 context window 阈值;调用方需要先用 `shouldCompact()` 或其他策略决定是否进入准备阶段 [E: packages/agent/src/harness/compaction/compaction.ts:246] [E: packages/agent/src/harness/compaction/compaction.ts:634] [I]。
- `toolResult` message 不会成为 valid cut point,但如果它位于被总结范围内,仍可能通过 entry-to-message 转换进入 `messagesToSummarize` [E: packages/agent/src/harness/compaction/compaction.ts:327] [E: packages/agent/src/harness/compaction/compaction.ts:328] [E: packages/agent/src/harness/compaction/compaction.ts:673] [E: packages/agent/src/harness/compaction/compaction.ts:699] [E: packages/agent/src/harness/compaction/compaction.ts:700] [E: packages/agent/src/harness/compaction/compaction.ts:676] [I]。
- `serializeConversation()` 只序列化 user、assistant 和 toolResult LLM messages;如果 `convertToLlm()` 过滤或映射了某类 harness message,summary prompt 看到的是映射后的 LLM representation [E: packages/agent/src/harness/compaction/utils.ts:91] [E: packages/agent/src/harness/compaction/utils.ts:94] [E: packages/agent/src/harness/compaction/utils.ts:95] [E: packages/agent/src/harness/compaction/utils.ts:98] [E: packages/agent/src/harness/compaction/utils.ts:123] [I]。
- `formatFileOperations()` 在没有 read-only 或 modified 文件时返回空字符串,所以 result summary 不一定包含 file-operation tags [E: packages/agent/src/harness/compaction/utils.ts:62] [E: packages/agent/src/harness/compaction/utils.ts:64] [E: packages/agent/src/harness/compaction/utils.ts:67] [E: packages/agent/src/harness/compaction/utils.ts:70]。

## Branch Summary 边界

`subsys.agent-core.branch-summary` 应覆盖 `branch_summary` entry 的 abandoned-branch collection、branch-specific prompt、branch preamble 和 branch result shape;本节点只说明 compaction cut point 允许 `branch_summary` entry 成为 retained-history boundary,以及 compaction replay 可把 `branch_summary` entry 转成 `branchSummary` message [E: packages/agent/src/harness/compaction/compaction.ts:81] [E: packages/agent/src/harness/compaction/compaction.ts:82] [E: packages/agent/src/harness/compaction/compaction.ts:356] [E: packages/agent/src/harness/compaction/compaction.ts:325] [I]。

`spine.compaction-flow` 是端到端视角,同时串起 context compaction 和 branch summarization;本节点收窄到 `shouldCompact`、`prepareCompaction`、`compact` 和 `estimateTokens` 这四个 compaction-side symbols [I]。

`ref.agent.compaction-config` 应枚举配置项、默认值、custom instructions 与 thinking-level 对 summary request 的影响;本节点只记录 settings interface 和当前默认常量 [E: packages/agent/src/harness/compaction/compaction.ts:147] [E: packages/agent/src/harness/compaction/compaction.ts:157] [I]。

## Sources

- packages/agent/src/harness/compaction/compaction.ts
- packages/agent/src/harness/compaction/utils.ts

## 相关

- [spine.compaction-flow](../../spine/compaction-flow.md): context compaction 与 branch summary 的端到端 flow。
- subsys.agent-core.branch-summary: abandoned branch summary 的独立子系统。
- ref.agent.compaction-config: compaction settings 与配置项目录。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): summary usage 在产品会话中的持久化和总量统计。
