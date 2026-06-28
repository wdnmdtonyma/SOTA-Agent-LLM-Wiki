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
related:
  - spine.compaction-flow
  - subsys.agent-core.branch-summary
  - ref.agent.compaction-config
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.agent-core.compaction` 是 `pi-agent-core` 的当前分支上下文压缩层: 它用 token threshold 决定是否该压缩,把 session path 切成 summary history 与 retained recent history,调用模型生成 checkpoint summary,并把文件读写 metadata 附在压缩结果上。

## 能回答的问题

- 默认 compaction settings 是什么,`shouldCompact()` 的阈值公式是什么?
- `prepareCompaction()` 如何定位 previous compaction boundary、cut point、split turn 和 `firstKeptEntryId`?
- `compact()` 何时生成普通 summary,何时并行生成 split-turn prefix summary?
- `estimateTokens()` 和 `estimateContextTokens()` 如何混用 provider usage 与本地字符估算?
- compaction summary 与 branch summary 的职责边界在哪里?

## 职责边界

本节点覆盖 `packages/agent/src/harness/compaction/compaction.ts` 与 `packages/agent/src/harness/compaction/utils.ts` 中的 compaction settings、token 估算、准备阶段、summary 生成和文件操作 metadata;不覆盖 abandoned branch collection 或 branch-summary prompt,那些属于 `subsys.agent-core.branch-summary` [E: packages/agent/src/harness/compaction/compaction.ts:11] [E: packages/agent/src/harness/compaction/compaction.ts:12] [E: packages/agent/src/harness/compaction/compaction.ts:17] [I]。

`shouldCompact()` 是纯阈值 gate;`prepareCompaction()` 只接收 `pathEntries` 和 `settings`,没有接收 model context window,也没有在函数体内调用 `shouldCompact()` [E: packages/agent/src/harness/compaction/compaction.ts:200] [E: packages/agent/src/harness/compaction/compaction.ts:545] [E: packages/agent/src/harness/compaction/compaction.ts:546] [E: packages/agent/src/harness/compaction/compaction.ts:547] [I]。

`compact()` 生成 `CompactionResult`,但这两个 source 文件没有把 result append 成 session entry;持久化 `compaction` entry 的调用点属于 harness/session 上层 [E: packages/agent/src/harness/compaction/compaction.ts:630] [E: packages/agent/src/harness/compaction/compaction.ts:692] [I]。

## Settings 与默认值

`CompactionSettings` 包含三个字段: `enabled` 控制 automatic compaction decision 是否启用,`reserveTokens` 给 summary prompt 和 output 预留 token,`keepRecentTokens` 表示压缩后尽量保留的 recent-context token 预算 [E: packages/agent/src/harness/compaction/compaction.ts:101] [E: packages/agent/src/harness/compaction/compaction.ts:103] [E: packages/agent/src/harness/compaction/compaction.ts:105] [E: packages/agent/src/harness/compaction/compaction.ts:107]。

`DEFAULT_COMPACTION_SETTINGS` 默认启用 compaction,`reserveTokens` 为 `16384`,`keepRecentTokens` 为 `20000` [E: packages/agent/src/harness/compaction/compaction.ts:111] [E: packages/agent/src/harness/compaction/compaction.ts:112] [E: packages/agent/src/harness/compaction/compaction.ts:113] [E: packages/agent/src/harness/compaction/compaction.ts:114]。

`shouldCompact(contextTokens, contextWindow, settings)` 先检查 `settings.enabled`;禁用时直接返回 false,启用时使用 `contextTokens > contextWindow - settings.reserveTokens` 作为触发条件 [E: packages/agent/src/harness/compaction/compaction.ts:200] [E: packages/agent/src/harness/compaction/compaction.ts:201] [E: packages/agent/src/harness/compaction/compaction.ts:202]。

## Token Estimate

`calculateContextTokens(usage)` 优先返回 provider 报告的 `usage.totalTokens`;没有 total 时用 `usage.input + usage.output + usage.cacheRead + usage.cacheWrite` 相加 [E: packages/agent/src/harness/compaction/compaction.ts:118] [E: packages/agent/src/harness/compaction/compaction.ts:119]。

`getAssistantUsage()` 只接受正常 assistant message 的 usage: assistant `stopReason` 为 `"aborted"` 或 `"error"` 时不会使用 usage,usage 缺失或计算后不大于 0 时也不会返回 usage [E: packages/agent/src/harness/compaction/compaction.ts:121] [E: packages/agent/src/harness/compaction/compaction.ts:122] [E: packages/agent/src/harness/compaction/compaction.ts:125] [E: packages/agent/src/harness/compaction/compaction.ts:126] [E: packages/agent/src/harness/compaction/compaction.ts:127] [E: packages/agent/src/harness/compaction/compaction.ts:128] [E: packages/agent/src/harness/compaction/compaction.ts:130]。

`estimateContextTokens(messages)` 有 provider usage 时,使用最后一个有效 assistant usage 的 context token 作为基线,只对该 assistant 之后的 trailing messages 调用 `estimateTokens()`;没有 usage 时,逐条估算所有 messages [E: packages/agent/src/harness/compaction/compaction.ts:169] [E: packages/agent/src/harness/compaction/compaction.ts:170] [E: packages/agent/src/harness/compaction/compaction.ts:172] [E: packages/agent/src/harness/compaction/compaction.ts:175] [E: packages/agent/src/harness/compaction/compaction.ts:185] [E: packages/agent/src/harness/compaction/compaction.ts:187] [E: packages/agent/src/harness/compaction/compaction.ts:188] [E: packages/agent/src/harness/compaction/compaction.ts:192]。

`estimateTokens(message)` 是字符数除以 4 后向上取整的 heuristic: user/custom/toolResult 走 text/image content 字符估算,assistant 累加 text、thinking、toolCall name 与 serialized arguments,bashExecution 累加 command 与 output,branchSummary/compactionSummary 使用 summary 长度 [E: packages/agent/src/harness/compaction/compaction.ts:224] [E: packages/agent/src/harness/compaction/compaction.ts:229] [E: packages/agent/src/harness/compaction/compaction.ts:232] [E: packages/agent/src/harness/compaction/compaction.ts:236] [E: packages/agent/src/harness/compaction/compaction.ts:237] [E: packages/agent/src/harness/compaction/compaction.ts:239] [E: packages/agent/src/harness/compaction/compaction.ts:241] [E: packages/agent/src/harness/compaction/compaction.ts:242] [E: packages/agent/src/harness/compaction/compaction.ts:249] [E: packages/agent/src/harness/compaction/compaction.ts:253] [E: packages/agent/src/harness/compaction/compaction.ts:258] [E: packages/agent/src/harness/compaction/compaction.ts:259]。

图片 content 不读取真实图像 token;`estimateTextAndImageContentChars()` 对每个 `type === "image"` block 加固定 `ESTIMATED_IMAGE_CHARS` 值 `4800`,再统一除以 4 变成 token 估算 [E: packages/agent/src/harness/compaction/compaction.ts:205] [E: packages/agent/src/harness/compaction/compaction.ts:207] [E: packages/agent/src/harness/compaction/compaction.ts:216] [E: packages/agent/src/harness/compaction/compaction.ts:217] [I]。

## Prepare Compaction

`prepareCompaction(pathEntries, settings)` 在 path 为空或最后一个 entry 已是 `compaction` 时返回 `ok(undefined)`,避免无内容或连续 compaction entry 的准备工作 [E: packages/agent/src/harness/compaction/compaction.ts:545] [E: packages/agent/src/harness/compaction/compaction.ts:549] [E: packages/agent/src/harness/compaction/compaction.ts:550]。

准备阶段会从 path 尾部寻找最近的 `compaction` entry;找到后读取它的 `summary` 作为 `previousSummary`,并把 `boundaryStart` 设为 previous compaction 的 `firstKeptEntryId` 所在位置,找不到该 id 时退回到 previous compaction 后一项 [E: packages/agent/src/harness/compaction/compaction.ts:553] [E: packages/agent/src/harness/compaction/compaction.ts:554] [E: packages/agent/src/harness/compaction/compaction.ts:555] [E: packages/agent/src/harness/compaction/compaction.ts:564] [E: packages/agent/src/harness/compaction/compaction.ts:565] [E: packages/agent/src/harness/compaction/compaction.ts:566] [E: packages/agent/src/harness/compaction/compaction.ts:567]。

`tokensBefore` 来自 `estimateContextTokens(buildSessionContext(pathEntries).messages).tokens`,因此准备阶段估算的是当前 path 构成模型 context 后的 token 量,不是 raw entry 数量 [E: packages/agent/src/harness/compaction/compaction.ts:571] [I]。

`findCutPoint(entries, startIndex, endIndex, keepRecentTokens)` 先通过 valid cut points 限制可切边界,再从末尾反向累加 message token;当 accumulated tokens 达到 `keepRecentTokens` 时,选择第一个不早于当前位置的 cut point [E: packages/agent/src/harness/compaction/compaction.ts:333] [E: packages/agent/src/harness/compaction/compaction.ts:339] [E: packages/agent/src/harness/compaction/compaction.ts:347] [E: packages/agent/src/harness/compaction/compaction.ts:350] [E: packages/agent/src/harness/compaction/compaction.ts:352] [E: packages/agent/src/harness/compaction/compaction.ts:353] [E: packages/agent/src/harness/compaction/compaction.ts:354] [E: packages/agent/src/harness/compaction/compaction.ts:355]。

valid cut point 包括 `message` entry 中的 `bashExecution`、`custom`、`branchSummary`、`compactionSummary`、`user`、`assistant`,不包括普通 `toolResult`;entry 层的 `branch_summary` 和 `custom_message` 也会加入 cut points [E: packages/agent/src/harness/compaction/compaction.ts:270] [E: packages/agent/src/harness/compaction/compaction.ts:273] [E: packages/agent/src/harness/compaction/compaction.ts:274] [E: packages/agent/src/harness/compaction/compaction.ts:275] [E: packages/agent/src/harness/compaction/compaction.ts:276] [E: packages/agent/src/harness/compaction/compaction.ts:277] [E: packages/agent/src/harness/compaction/compaction.ts:278] [E: packages/agent/src/harness/compaction/compaction.ts:281] [E: packages/agent/src/harness/compaction/compaction.ts:298] [E: packages/agent/src/harness/compaction/compaction.ts:299]。

cut point 选出后,`findCutPoint()` 会向前移动 `cutIndex`,直到前一项是 `compaction` 或 `message`,以免保留区前面残留孤立 metadata entry [E: packages/agent/src/harness/compaction/compaction.ts:362] [E: packages/agent/src/harness/compaction/compaction.ts:363] [E: packages/agent/src/harness/compaction/compaction.ts:364] [E: packages/agent/src/harness/compaction/compaction.ts:367] [E: packages/agent/src/harness/compaction/compaction.ts:370] [I]。

如果 cut entry 不是 user message,`findCutPoint()` 用 `findTurnStartIndex()` 向前找同一 turn 的起点;找到时返回 `isSplitTurn: true`,否则不是 split turn [E: packages/agent/src/harness/compaction/compaction.ts:372] [E: packages/agent/src/harness/compaction/compaction.ts:373] [E: packages/agent/src/harness/compaction/compaction.ts:374] [E: packages/agent/src/harness/compaction/compaction.ts:376] [E: packages/agent/src/harness/compaction/compaction.ts:379]。

`prepareCompaction()` 把 cut point entry 的 `id` 固定为 `firstKeptEntryId`;如果该 entry 没有 id,返回 `CompactionError("invalid_session", ...)` [E: packages/agent/src/harness/compaction/compaction.ts:573] [E: packages/agent/src/harness/compaction/compaction.ts:574] [E: packages/agent/src/harness/compaction/compaction.ts:575] [E: packages/agent/src/harness/compaction/compaction.ts:576] [E: packages/agent/src/harness/compaction/compaction.ts:578]。

非 split turn 时,`messagesToSummarize` 覆盖 `boundaryStart..firstKeptEntryIndex`;split turn 时,历史 summary 截止到 `turnStartIndex`,而 `turnPrefixMessages` 覆盖同一 turn 中 `turnStartIndex..firstKeptEntryIndex` 的 prefix [E: packages/agent/src/harness/compaction/compaction.ts:580] [E: packages/agent/src/harness/compaction/compaction.ts:581] [E: packages/agent/src/harness/compaction/compaction.ts:582] [E: packages/agent/src/harness/compaction/compaction.ts:586] [E: packages/agent/src/harness/compaction/compaction.ts:587] [E: packages/agent/src/harness/compaction/compaction.ts:588]。

`getMessageFromEntryForCompaction()` 会跳过历史 `compaction` entry,但普通 replay helper 可把 `custom_message`、`branch_summary`、`compaction` entry 分别恢复成 custom、branch summary、compaction summary message [E: packages/agent/src/harness/compaction/compaction.ts:81] [E: packages/agent/src/harness/compaction/compaction.ts:82] [E: packages/agent/src/harness/compaction/compaction.ts:85] [E: packages/agent/src/harness/compaction/compaction.ts:63] [E: packages/agent/src/harness/compaction/compaction.ts:72] [E: packages/agent/src/harness/compaction/compaction.ts:75]。

文件操作 metadata 从 `messagesToSummarize` 中的 assistant tool calls 提取;split turn 时额外把 `turnPrefixMessages` 的文件操作也并入同一个 accumulator [E: packages/agent/src/harness/compaction/compaction.ts:593] [E: packages/agent/src/harness/compaction/compaction.ts:594] [E: packages/agent/src/harness/compaction/compaction.ts:595] [E: packages/agent/src/harness/compaction/compaction.ts:596]。

## Compact

`compact(preparation, models, model, customInstructions, signal, thinkingLevel)` 解构 `CompactionPreparation`,再次校验 `firstKeptEntryId`,然后根据 `isSplitTurn` 和 `turnPrefixMessages.length` 选择 summary 生成路径 [E: packages/agent/src/harness/compaction/compaction.ts:630] [E: packages/agent/src/harness/compaction/compaction.ts:638] [E: packages/agent/src/harness/compaction/compaction.ts:649] [E: packages/agent/src/harness/compaction/compaction.ts:655]。

普通 compaction 调用 `generateSummary(messagesToSummarize, models, model, settings.reserveTokens, signal, customInstructions, previousSummary, thinkingLevel)`;有 `previousSummary` 时,`generateSummary()` 使用 update prompt 并把 previous summary 放入 `<previous-summary>` 标签,否则使用 fresh summary prompt [E: packages/agent/src/harness/compaction/compaction.ts:675] [E: packages/agent/src/harness/compaction/compaction.ts:676] [E: packages/agent/src/harness/compaction/compaction.ts:679] [E: packages/agent/src/harness/compaction/compaction.ts:681] [E: packages/agent/src/harness/compaction/compaction.ts:682] [E: packages/agent/src/harness/compaction/compaction.ts:474] [E: packages/agent/src/harness/compaction/compaction.ts:481] [E: packages/agent/src/harness/compaction/compaction.ts:482]。

split turn 且有 prefix messages 时,`compact()` 用 `Promise.all()` 并行生成 history summary 和 turn-prefix summary;如果没有 prior history,history side 使用 `"No prior history."` 占位 [E: packages/agent/src/harness/compaction/compaction.ts:655] [E: packages/agent/src/harness/compaction/compaction.ts:656] [E: packages/agent/src/harness/compaction/compaction.ts:657] [E: packages/agent/src/harness/compaction/compaction.ts:668] [E: packages/agent/src/harness/compaction/compaction.ts:669]。

split turn 的最终 summary 是 history summary、分隔线、`**Turn Context (split turn):**` 和 prefix summary 的拼接;prefix summary 使用独立 prompt,要求描述 retained suffix 所需的原始请求、早期进展和上下文 [E: packages/agent/src/harness/compaction/compaction.ts:673] [E: packages/agent/src/harness/compaction/compaction.ts:612] [E: packages/agent/src/harness/compaction/compaction.ts:616] [E: packages/agent/src/harness/compaction/compaction.ts:619] [E: packages/agent/src/harness/compaction/compaction.ts:622]。

`generateSummary()` 和 `generateTurnPrefixSummary()` 都先 `convertToLlm()` 再 `serializeConversation()`,把 conversation 放入单条 user message,随后调用 `models.completeSimple()` [E: packages/agent/src/harness/compaction/compaction.ts:478] [E: packages/agent/src/harness/compaction/compaction.ts:479] [E: packages/agent/src/harness/compaction/compaction.ts:486] [E: packages/agent/src/harness/compaction/compaction.ts:499] [E: packages/agent/src/harness/compaction/compaction.ts:711] [E: packages/agent/src/harness/compaction/compaction.ts:712] [E: packages/agent/src/harness/compaction/compaction.ts:714] [E: packages/agent/src/harness/compaction/compaction.ts:722]。

summary 调用的 `maxTokens` 受 `reserveTokens` 与 `model.maxTokens` 双重限制:普通 summary 用 `Math.floor(0.8 * reserveTokens)`,turn-prefix summary 用 `Math.floor(0.5 * reserveTokens)`,两者都会再和正数 `model.maxTokens` 取较小值 [E: packages/agent/src/harness/compaction/compaction.ts:470] [E: packages/agent/src/harness/compaction/compaction.ts:471] [E: packages/agent/src/harness/compaction/compaction.ts:472] [E: packages/agent/src/harness/compaction/compaction.ts:707] [E: packages/agent/src/harness/compaction/compaction.ts:708] [E: packages/agent/src/harness/compaction/compaction.ts:709]。

当 model 支持 reasoning 且 `thinkingLevel` 存在并且不是 `"off"` 时,summary request options 带 `reasoning: thinkingLevel`;否则 options 只包含 `maxTokens` 和 `signal` [E: packages/agent/src/harness/compaction/compaction.ts:494] [E: packages/agent/src/harness/compaction/compaction.ts:495] [E: packages/agent/src/harness/compaction/compaction.ts:496] [E: packages/agent/src/harness/compaction/compaction.ts:497] [E: packages/agent/src/harness/compaction/compaction.ts:725] [E: packages/agent/src/harness/compaction/compaction.ts:726] [E: packages/agent/src/harness/compaction/compaction.ts:727]。

provider 返回 `stopReason === "aborted"` 时转换为 `CompactionError("aborted", ...)`;返回 `stopReason === "error"` 时转换为 `CompactionError("summarization_failed", ...)`;成功时只拼接 response 中的 text content blocks [E: packages/agent/src/harness/compaction/compaction.ts:504] [E: packages/agent/src/harness/compaction/compaction.ts:505] [E: packages/agent/src/harness/compaction/compaction.ts:507] [E: packages/agent/src/harness/compaction/compaction.ts:510] [E: packages/agent/src/harness/compaction/compaction.ts:516] [E: packages/agent/src/harness/compaction/compaction.ts:517] [E: packages/agent/src/harness/compaction/compaction.ts:519] [E: packages/agent/src/harness/compaction/compaction.ts:521]。

`compact()` 最后用 `computeFileLists(fileOps)` 得到 sorted read-only 与 modified file lists,把 `<read-files>` / `<modified-files>` metadata tags 追加到 summary,并在 result details 中保存同一组 file lists [E: packages/agent/src/harness/compaction/compaction.ts:689] [E: packages/agent/src/harness/compaction/compaction.ts:690] [E: packages/agent/src/harness/compaction/compaction.ts:692] [E: packages/agent/src/harness/compaction/compaction.ts:696] [E: packages/agent/src/harness/compaction/utils.ts:54] [E: packages/agent/src/harness/compaction/utils.ts:55] [E: packages/agent/src/harness/compaction/utils.ts:56] [E: packages/agent/src/harness/compaction/utils.ts:57] [E: packages/agent/src/harness/compaction/utils.ts:62] [E: packages/agent/src/harness/compaction/utils.ts:65] [E: packages/agent/src/harness/compaction/utils.ts:68]。

## 文件操作 Metadata

`extractFileOpsFromMessage()` 只读取 assistant message 中 `type === "toolCall"` 且带 string `arguments.path` 的 blocks;工具名为 `read` 时加入 read set,`write` 加入 written set,`edit` 加入 edited set [E: packages/agent/src/harness/compaction/utils.ts:24] [E: packages/agent/src/harness/compaction/utils.ts:25] [E: packages/agent/src/harness/compaction/utils.ts:28] [E: packages/agent/src/harness/compaction/utils.ts:30] [E: packages/agent/src/harness/compaction/utils.ts:31] [E: packages/agent/src/harness/compaction/utils.ts:36] [E: packages/agent/src/harness/compaction/utils.ts:37] [E: packages/agent/src/harness/compaction/utils.ts:39] [E: packages/agent/src/harness/compaction/utils.ts:41] [E: packages/agent/src/harness/compaction/utils.ts:44] [E: packages/agent/src/harness/compaction/utils.ts:47]。

previous compaction 的 file details 会被带入下一次 extraction,但只有 `!prevCompaction.fromHook && prevCompaction.details` 时才读取历史 `readFiles` 与 `modifiedFiles` [E: packages/agent/src/harness/compaction/compaction.ts:41] [E: packages/agent/src/harness/compaction/compaction.ts:42] [E: packages/agent/src/harness/compaction/compaction.ts:43] [E: packages/agent/src/harness/compaction/compaction.ts:45] [E: packages/agent/src/harness/compaction/compaction.ts:46] [E: packages/agent/src/harness/compaction/compaction.ts:48] [E: packages/agent/src/harness/compaction/compaction.ts:49]。

`computeFileLists()` 把 `edited` 和 `written` 合并为 modified set,再从 read set 中排除已 modified 的路径,因此同时 read+write/edit 的文件只出现在 `modifiedFiles` 中 [E: packages/agent/src/harness/compaction/utils.ts:54] [E: packages/agent/src/harness/compaction/utils.ts:55] [E: packages/agent/src/harness/compaction/utils.ts:56] [E: packages/agent/src/harness/compaction/utils.ts:57] [E: packages/agent/src/harness/compaction/utils.ts:58]。

## Gotcha

- `prepareCompaction()` 不判断 context window 阈值;调用方需要先用 `shouldCompact()` 或其他策略决定是否进入准备阶段 [E: packages/agent/src/harness/compaction/compaction.ts:200] [E: packages/agent/src/harness/compaction/compaction.ts:545] [I]。
- `toolResult` message 不会成为 valid cut point,但如果它位于被总结范围内,仍可能通过 entry-to-message 转换进入 `messagesToSummarize` [E: packages/agent/src/harness/compaction/compaction.ts:281] [E: packages/agent/src/harness/compaction/compaction.ts:282] [E: packages/agent/src/harness/compaction/compaction.ts:581] [E: packages/agent/src/harness/compaction/compaction.ts:582] [E: packages/agent/src/harness/compaction/compaction.ts:583] [E: packages/agent/src/harness/compaction/compaction.ts:584] [I]。
- `serializeConversation()` 只序列化 user、assistant 和 toolResult LLM messages;如果 `convertToLlm()` 过滤或映射了某类 harness message,summary prompt 看到的是映射后的 LLM representation [E: packages/agent/src/harness/compaction/utils.ts:91] [E: packages/agent/src/harness/compaction/utils.ts:94] [E: packages/agent/src/harness/compaction/utils.ts:95] [E: packages/agent/src/harness/compaction/utils.ts:104] [E: packages/agent/src/harness/compaction/utils.ts:132] [I]。
- `formatFileOperations()` 在没有 read-only 或 modified 文件时返回空字符串,所以 result summary 不一定包含 file-operation tags [E: packages/agent/src/harness/compaction/utils.ts:62] [E: packages/agent/src/harness/compaction/utils.ts:64] [E: packages/agent/src/harness/compaction/utils.ts:67] [E: packages/agent/src/harness/compaction/utils.ts:70]。

## Branch Summary 边界

`subsys.agent-core.branch-summary` 应覆盖 `branch_summary` entry 的 abandoned-branch collection、branch-specific prompt、branch preamble 和 branch result shape;本节点只说明 compaction cut point 允许 `branch_summary` entry 成为 retained-history boundary,以及 compaction replay 可把 `branch_summary` entry 转成 `branchSummary` message [E: packages/agent/src/harness/compaction/compaction.ts:72] [E: packages/agent/src/harness/compaction/compaction.ts:73] [E: packages/agent/src/harness/compaction/compaction.ts:298] [E: packages/agent/src/harness/compaction/compaction.ts:299] [I]。

`spine.compaction-flow` 是端到端视角,同时串起 context compaction 和 branch summarization;本节点收窄到 `shouldCompact`、`prepareCompaction`、`compact` 和 `estimateTokens` 这四个 compaction-side symbols [I]。

`ref.agent.compaction-config` 应枚举配置项、默认值、custom instructions 与 thinking-level 对 summary request 的影响;本节点只记录 settings interface 和当前默认常量 [E: packages/agent/src/harness/compaction/compaction.ts:101] [E: packages/agent/src/harness/compaction/compaction.ts:111] [I]。

## Sources

- packages/agent/src/harness/compaction/compaction.ts
- packages/agent/src/harness/compaction/utils.ts

## 相关

- [spine.compaction-flow](../../spine/compaction-flow.md): context compaction 与 branch summary 的端到端 flow。
- subsys.agent-core.branch-summary: abandoned branch summary 的独立子系统。
- ref.agent.compaction-config: compaction settings 与配置项目录。
