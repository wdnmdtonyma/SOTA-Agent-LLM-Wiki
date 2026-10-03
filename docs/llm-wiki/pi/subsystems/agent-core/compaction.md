---
id: subsys.agent-core.compaction
title: 压缩子系统
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/compaction/compaction.ts
  - packages/coding-agent/src/core/compaction/utils.ts
  - packages/coding-agent/src/core/compaction/index.ts
symbols:
  - shouldCompact
  - prepareCompaction
  - compact
  - estimateTokens
  - estimateProjectedContextTokens
  - completeSummarization
  - generateSummaryWithUsage
  - getSummarizationFailure
  - CompactionResult
  - CompactionSettings
  - DEFAULT_COMPACTION_SETTINGS
related:
  - spine.compaction-flow
  - subsys.agent-core.branch-summary
  - ref.agent.compaction-config
  - subsys.coding-agent.usage-accounting
  - subsys.coding-agent.session-manager
  - subsys.coding-agent.agent-session
  - subsys.durable.harness
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.agent-core.compaction` 是 **pi-coding-agent** 产品层当前分支上下文压缩：`packages/coding-agent/src/core/compaction/`。它用 token threshold 决定是否该压缩，经 `buildSessionProjection()` 选 cut point，调用模型生成 checkpoint summary，并把文件读写 metadata 附在压缩结果上。`pi-agent-core` 1.0 已删除 experimental harness compaction。`pi-durable` 另有 `CompactionTask`，不共用这些函数。

## 能回答的问题

- 默认 compaction settings 是什么，`shouldCompact()` 的阈值公式是什么？
- `prepareCompaction()` 如何消费 session projection、定位 previous compaction boundary、cut point、split turn 和 `firstKeptEntryId`？
- `compact()` 何时生成普通 summary，何时额外生成 split-turn prefix summary？
- `estimateTokens()` 和 `estimateProjectedContextTokens()` 如何混用 provider usage 与本地字符估算？
- compaction summary 与 branch summary 的职责边界在哪里？

## 职责边界

本节点覆盖 `packages/coding-agent/src/core/compaction/compaction.ts` 与 `utils.ts` 中的 compaction settings、token 估算、准备阶段、summary 生成和文件操作 metadata；不覆盖 abandoned branch collection 或 branch-summary prompt，那些属于 [subsys.agent-core.branch-summary](branch-summary.md)。[E: packages/coding-agent/src/core/compaction/index.ts:5] [E: packages/coding-agent/src/core/compaction/index.ts:6]

`shouldCompact()` 是纯阈值 gate；`prepareCompaction()` 只接收 `pathEntries` 和 `settings`，没有接收 model context window，也没有在函数体内调用 `shouldCompact()`。[E: packages/coding-agent/src/core/compaction/compaction.ts:267] [E: packages/coding-agent/src/core/compaction/compaction.ts:872]

`compact()` 生成 `CompactionResult`，但这两个 source 文件没有把 result append 成 session entry；持久化走 `SessionManager.appendCompaction`，调用点在 `AgentSession`。[E: packages/coding-agent/src/core/compaction/compaction.ts:105] [E: packages/coding-agent/src/core/compaction/compaction.ts:965] [I]

**不要**再 cite `packages/agent/src/harness/compaction/**`。现行实现全部在 `packages/coding-agent/src/core/compaction/`。[E: packages/coding-agent/src/core/compaction/index.ts:5]

## Settings 与默认值

`CompactionSettings` 包含三个必填字段：`enabled` 控制 automatic compaction decision 是否启用，`reserveTokens` 给 summary prompt 和 output 预留 token，`keepRecentTokens` 表示压缩后尽量保留的 recent-context token 预算。[E: packages/coding-agent/src/core/compaction/compaction.ts:120] [E: packages/coding-agent/src/core/compaction/compaction.ts:121] [E: packages/coding-agent/src/core/compaction/compaction.ts:122] [E: packages/coding-agent/src/core/compaction/compaction.ts:123]

`DEFAULT_COMPACTION_SETTINGS` 默认启用 compaction，`reserveTokens` 为 `16384`，`keepRecentTokens` 为 `20000`。[E: packages/coding-agent/src/core/compaction/compaction.ts:126] [E: packages/coding-agent/src/core/compaction/compaction.ts:127] [E: packages/coding-agent/src/core/compaction/compaction.ts:128] [E: packages/coding-agent/src/core/compaction/compaction.ts:129]

`shouldCompact(contextTokens, contextWindow, settings)` 先检查 `settings.enabled`；禁用时直接返回 false，启用时使用 `contextTokens > contextWindow - settings.reserveTokens` 作为触发条件。[E: packages/coding-agent/src/core/compaction/compaction.ts:267] [E: packages/coding-agent/src/core/compaction/compaction.ts:268] [E: packages/coding-agent/src/core/compaction/compaction.ts:269]

产品 `settings.json` 的 `compaction.modelOverrides` 不在本对象上；`SettingsManager.getCompactionSettings(model)` 把它解析成这里的三字段，见 [ref.agent.compaction-config](../../reference/compaction-config.md)。

## Token Estimate

`calculateContextTokens(usage)` 优先返回 provider 报告的 `usage.totalTokens`；没有 total 时用 `usage.input + usage.output + usage.cacheRead + usage.cacheWrite` 相加。[E: packages/coding-agent/src/core/compaction/compaction.ts:140] [E: packages/coding-agent/src/core/compaction/compaction.ts:141]

`getAssistantUsage()` 只接受正常 assistant message 的 usage：assistant `stopReason` 为 `"aborted"` 或 `"error"` 时不会使用 usage，usage 缺失或计算后不大于 0 时也不会返回 usage。[E: packages/coding-agent/src/core/compaction/compaction.ts:148] [E: packages/coding-agent/src/core/compaction/compaction.ts:152] [E: packages/coding-agent/src/core/compaction/compaction.ts:153] [E: packages/coding-agent/src/core/compaction/compaction.ts:155]

`estimateContextTokens(messages)` 有 provider usage 时，使用最后一个有效 assistant usage 的 context token 作为基线，只对该 assistant 之后的 trailing messages 调用 `estimateTokens()`；没有 usage 时，逐条估算所有 messages。[E: packages/coding-agent/src/core/compaction/compaction.ts:196] [E: packages/coding-agent/src/core/compaction/compaction.ts:212] [E: packages/coding-agent/src/core/compaction/compaction.ts:219]

`estimateProjectedContextTokens(projection, branchEntries)` 在 last usage 之后若出现更新的 `context_edit` 或 `compaction`，丢弃 usage 基线，改用字符估算（system message 单独计入，其余非 system 逐条 `estimateTokens`）。[E: packages/coding-agent/src/core/compaction/compaction.ts:227] [E: packages/coding-agent/src/core/compaction/compaction.ts:248] [E: packages/coding-agent/src/core/compaction/compaction.ts:253] [E: packages/coding-agent/src/core/compaction/compaction.ts:261]

`estimateTokens(message)` 是字符数除以 4 后向上取整的 heuristic：`system` 累加 content / sections / toolsAdded，user/custom/toolResult 走 text/image content 字符估算，assistant 累加 text、thinking、toolCall name 与 serialized arguments，bashExecution 累加 command 与 output，branchSummary/compactionSummary 使用 summary 长度。[E: packages/coding-agent/src/core/compaction/compaction.ts:298] [E: packages/coding-agent/src/core/compaction/compaction.ts:302] [E: packages/coding-agent/src/core/compaction/compaction.ts:313] [E: packages/coding-agent/src/core/compaction/compaction.ts:319] [E: packages/coding-agent/src/core/compaction/compaction.ts:332] [E: packages/coding-agent/src/core/compaction/compaction.ts:337] [E: packages/coding-agent/src/core/compaction/compaction.ts:341] [E: packages/coding-agent/src/core/compaction/compaction.ts:344]

图片 content 不读取真实图像 token；`estimateTextAndImageContentChars()` 对每个 `type === "image"` block 加固定 `ESTIMATED_IMAGE_CHARS` 值 `4800`，再统一除以 4 变成 token 估算。[E: packages/coding-agent/src/core/compaction/compaction.ts:276] [E: packages/coding-agent/src/core/compaction/compaction.ts:287] [E: packages/coding-agent/src/core/compaction/compaction.ts:288]

## Prepare Compaction

`prepareCompaction(pathEntries, settings)` 在 path 非空且最后一个 entry 已是 `compaction` 时返回 `undefined`，避免连续 compaction entry。[E: packages/coding-agent/src/core/compaction/compaction.ts:872] [E: packages/coding-agent/src/core/compaction/compaction.ts:876] [E: packages/coding-agent/src/core/compaction/compaction.ts:877]

准备阶段先 `buildSessionProjection(pathEntries)`。最新 compaction 被投影在前；找到带 messages 的 previous compaction 后读取它的 `summary` 作为 `previousSummary`，并从该 index + 1 起算 `boundaryStart`。[E: packages/coding-agent/src/core/compaction/compaction.ts:880] [E: packages/coding-agent/src/core/compaction/compaction.ts:885] [E: packages/coding-agent/src/core/compaction/compaction.ts:892] [E: packages/coding-agent/src/core/compaction/compaction.ts:894]

`tokensBefore` 来自 `estimateProjectedContextTokens(projection, pathEntries).tokens`，因此准备阶段估算的是投影后模型 context 的 token 量，不是 raw entry 数量。[E: packages/coding-agent/src/core/compaction/compaction.ts:897]

cut 走内部 `findProjectedCutPoint(projectedEntries, boundaryStart, boundaryEnd, settings.keepRecentTokens)`：从末尾反向累加 projected message token，达到 `keepRecentTokens` 后选第一个不早于当前位置的 cut point。[E: packages/coding-agent/src/core/compaction/compaction.ts:898] [E: packages/coding-agent/src/core/compaction/compaction.ts:802] [E: packages/coding-agent/src/core/compaction/compaction.ts:824] 导出的 `findCutPoint()` 对 raw `SessionEntry[]` 做同类算法，但 `prepareCompaction()` 不调用它。[E: packages/coding-agent/src/core/compaction/compaction.ts:446]

valid cut point 包括 projected messages 里 `user` / `assistant` / `bashExecution` / `custom` / `branchSummary` / `compactionSummary`，不包括 `toolResult`；`sourceEntry.type === "compaction"` 不进 cut points。[E: packages/coding-agent/src/core/compaction/compaction.ts:351] [E: packages/coding-agent/src/core/compaction/compaction.ts:360] [E: packages/coding-agent/src/core/compaction/compaction.ts:811]

若 trailing suffix 是 overflow recovery 的 omitted assistant 尝试（无外部 replacement），cutIndex 再前进一格，以免 cut 停在未发送的 input 之前。[E: packages/coding-agent/src/core/compaction/compaction.ts:856]

cut 选出后向前移动 `cutIndex`，直到前一项是 compaction 或带 messages 的 entry，以免保留区前面残留孤立 metadata。[E: packages/coding-agent/src/core/compaction/compaction.ts:858] [E: packages/coding-agent/src/core/compaction/compaction.ts:860]

如果 cut entry 不是 turn start，用 `findProjectedTurnStartIndex()` 向前找同一 turn 的起点；找到时 `isSplitTurn: true`。[E: packages/coding-agent/src/core/compaction/compaction.ts:863] [E: packages/coding-agent/src/core/compaction/compaction.ts:868]

`prepareCompaction()` **会**钉 `firstKeptEntryId`：取 projected cut 处 `sourceEntry.id`，缺 id 则返回 `undefined`。[E: packages/coding-agent/src/core/compaction/compaction.ts:900] [E: packages/coding-agent/src/core/compaction/compaction.ts:901] [E: packages/coding-agent/src/core/compaction/compaction.ts:902] 没有可总结 messages 且没有 turn prefix 时也返回 `undefined`。[E: packages/coding-agent/src/core/compaction/compaction.ts:914]

非 split turn 时，`messagesToSummarize` 覆盖 `[boundaryStart, historyEnd)`；split turn 时，历史 summary 截止到 `turnStartIndex`，而 `turnPrefixMessages` 覆盖同一 turn 中 `turnStartIndex..firstKeptEntryIndex` 的 prefix。[E: packages/coding-agent/src/core/compaction/compaction.ts:903] [E: packages/coding-agent/src/core/compaction/compaction.ts:905] [E: packages/coding-agent/src/core/compaction/compaction.ts:908]

`getMessagesFromProjectedEntryForCompaction()` 跳过历史 `compaction` entry，并过滤 `role === "system"`（system 是 prompt state，由 compaction entry 自己 replay）。[E: packages/coding-agent/src/core/compaction/compaction.ts:98] [E: packages/coding-agent/src/core/compaction/compaction.ts:99] [E: packages/coding-agent/src/core/compaction/compaction.ts:101]

文件操作 metadata 从 `messagesToSummarize` 提取；split turn 时额外把 `turnPrefixMessages` 的文件操作并入同一个 accumulator。[E: packages/coding-agent/src/core/compaction/compaction.ts:917] [E: packages/coding-agent/src/core/compaction/compaction.ts:920] [E: packages/coding-agent/src/core/compaction/compaction.ts:922]

## Compact

`compact(preparation, model, apiKey, headers?, customInstructions?, signal?, thinkingLevel?, streamFn?, env?, retry?, callbacks?, sessionId?)` 按 `isSplitTurn` 和 `turnPrefixMessages.length` 选择 summary 路径，返回 `CompactionResult` 的 `summary` / `firstKeptEntryId` / `tokensBefore` / `usage` / `details`。[E: packages/coding-agent/src/core/compaction/compaction.ts:965] [E: packages/coding-agent/src/core/compaction/compaction.ts:105] [E: packages/coding-agent/src/core/compaction/compaction.ts:1064]

普通路径调用 `generateSummaryWithUsage()`：有 `previousSummary` 时使用 update prompt 并把 previous summary 放入 `<previous-summary>` 标签，否则使用 fresh summary prompt。[E: packages/coding-agent/src/core/compaction/compaction.ts:1036] [E: packages/coding-agent/src/core/compaction/compaction.ts:718] [E: packages/coding-agent/src/core/compaction/compaction.ts:730]

split turn 且有 prefix messages 时，先生成可选的 history summary，再生成 turn-prefix summary；如果没有 prior history，history side 使用 `"No prior history."` 占位。两次调用都接收同一 retry / callbacks，但是顺序 await，不是并行请求。[E: packages/coding-agent/src/core/compaction/compaction.ts:994] [E: packages/coding-agent/src/core/compaction/compaction.ts:995] [E: packages/coding-agent/src/core/compaction/compaction.ts:1017]

split turn 的最终 summary 是 history summary、分隔线、`**Turn Context (split turn):**` 和 prefix summary 的拼接。[E: packages/coding-agent/src/core/compaction/compaction.ts:1032] prefix summary 使用独立 prompt，要求描述 retained suffix 所需的原始请求、早期进展和上下文。[E: packages/coding-agent/src/core/compaction/compaction.ts:942]

`generateSummaryWithUsage()` 和 `generateTurnPrefixSummary()` 都先 `convertToLlm()`（从 `../messages.ts` 导入）再 `serializeConversation()`，把 conversation 放入单条 user message，再交给 `completeSummarization()`。[E: packages/coding-agent/src/core/compaction/compaction.ts:27] [E: packages/coding-agent/src/core/compaction/compaction.ts:725] [E: packages/coding-agent/src/core/compaction/compaction.ts:746] [E: packages/coding-agent/src/core/compaction/compaction.ts:1094]

`completeSummarization()` 把每次 summary 当作独立请求：强制 `cacheRetention: "none"`，没有 caller `sessionId` 时生成新的 `uuidv7()` routing id，再通过 `retryAssistantCall()` 执行。有 `streamFn` 时走 `streamFn(...).result()`，否则 `completeSimple()`。[E: packages/coding-agent/src/core/compaction/compaction.ts:619] [E: packages/coding-agent/src/core/compaction/compaction.ts:631] [E: packages/coding-agent/src/core/compaction/compaction.ts:632] [E: packages/coding-agent/src/core/compaction/compaction.ts:635]

summary 调用的 `maxTokens` 受 `reserveTokens` 与 `model.maxTokens` 双重限制：普通 summary 用 `Math.floor(0.8 * reserveTokens)`，turn-prefix summary 用 `Math.floor(0.5 * reserveTokens)`，两者都会再和正数 `model.maxTokens` 取较小值。[E: packages/coding-agent/src/core/compaction/compaction.ts:712] [E: packages/coding-agent/src/core/compaction/compaction.ts:713] [E: packages/coding-agent/src/core/compaction/compaction.ts:1090] [E: packages/coding-agent/src/core/compaction/compaction.ts:1091]

当 model 支持 reasoning 且 `thinkingLevel` 存在并且不是 `"off"` 时，summary request options 带 `reasoning: thinkingLevel`。[E: packages/coding-agent/src/core/compaction/compaction.ts:606] [E: packages/coding-agent/src/core/compaction/compaction.ts:607]

`getSummarizationFailure()` 把 `stopReason === "error"` 和 `"length"` 都当成不可落盘；`length` 表示 summary 被 token cap 截断。[E: packages/coding-agent/src/core/compaction/compaction.ts:585] [E: packages/coding-agent/src/core/compaction/compaction.ts:586] [E: packages/coding-agent/src/core/compaction/compaction.ts:589] 失败时 `generateSummaryWithUsage()` / `generateTurnPrefixSummary()` **throw `Error`**，不返回 Result。[E: packages/coding-agent/src/core/compaction/compaction.ts:757] 响应含 toolCall 同样 throw。[E: packages/coding-agent/src/core/compaction/compaction.ts:760]

split-turn 的两次摘要 usage 用 `combineUsage()` 合并，普通路径直接采用 summary usage。[E: packages/coding-agent/src/core/compaction/compaction.ts:35] [E: packages/coding-agent/src/core/compaction/compaction.ts:1033] [E: packages/coding-agent/src/core/compaction/compaction.ts:1053]

`compact()` 最后用 `computeFileLists(fileOps)` 得到 sorted read-only 与 modified file lists，把 `<read-files>` / `<modified-files>` metadata tags 追加到 summary，并在 result details 中保存同一组 file lists。[E: packages/coding-agent/src/core/compaction/compaction.ts:1057] [E: packages/coding-agent/src/core/compaction/compaction.ts:1058] [E: packages/coding-agent/src/core/compaction/compaction.ts:1069] [E: packages/coding-agent/src/core/compaction/utils.ts:67] [E: packages/coding-agent/src/core/compaction/utils.ts:77] 缺 `firstKeptEntryId` 时 throw `"First kept entry has no UUID - session may need migration"`。[E: packages/coding-agent/src/core/compaction/compaction.ts:1060] [E: packages/coding-agent/src/core/compaction/compaction.ts:1061]

## 文件操作 Metadata

`extractFileOpsFromMessage()` 读取 assistant `type === "toolCall"` 且带 string `arguments.path` 的 blocks；也读取 `toolResult.nestedCalls`（codemode 脚本里的嵌套调用）。工具名为 `read` 时加入 read set，`write` 加入 written set，`edit` 加入 edited set。[E: packages/coding-agent/src/core/compaction/utils.ts:30] [E: packages/coding-agent/src/core/compaction/utils.ts:31] [E: packages/coding-agent/src/core/compaction/utils.ts:33] [E: packages/coding-agent/src/core/compaction/utils.ts:47] [E: packages/coding-agent/src/core/compaction/utils.ts:51]

previous compaction 的 file details 只有 `!fromHook` 时才复制进下一次 extraction：历史 `readFiles` 加入 `fileOps.read`，历史 `modifiedFiles` 加入 `fileOps.edited`。[E: packages/coding-agent/src/core/compaction/compaction.ts:70] [E: packages/coding-agent/src/core/compaction/compaction.ts:73] [E: packages/coding-agent/src/core/compaction/compaction.ts:74] [E: packages/coding-agent/src/core/compaction/compaction.ts:77]

`computeFileLists()` 把 `edited` 和 `written` 合并为 modified set，再从 read set 中排除已 modified 的路径，因此同时 read+write/edit 的文件只出现在 `modifiedFiles` 中。[E: packages/coding-agent/src/core/compaction/utils.ts:67] [E: packages/coding-agent/src/core/compaction/utils.ts:68] [E: packages/coding-agent/src/core/compaction/utils.ts:69]

## Gotcha

- `prepareCompaction()` 不判断 context window 阈值；调用方需要先用 `shouldCompact()` 或其他策略决定是否进入准备阶段。[E: packages/coding-agent/src/core/compaction/compaction.ts:267] [E: packages/coding-agent/src/core/compaction/compaction.ts:872] [I]
- `toolResult` message 不会成为 valid cut point，但如果它位于被总结范围内，仍可能通过 projection messages 进入 `messagesToSummarize`。[E: packages/coding-agent/src/core/compaction/compaction.ts:360] [E: packages/coding-agent/src/core/compaction/compaction.ts:905]
- `serializeConversation()` 只序列化 user、assistant 和 toolResult LLM messages；tool result 截断到 `TOOL_RESULT_MAX_CHARS = 2000`。[E: packages/coding-agent/src/core/compaction/utils.ts:94] [E: packages/coding-agent/src/core/compaction/utils.ts:114] [E: packages/coding-agent/src/core/compaction/utils.ts:118] [E: packages/coding-agent/src/core/compaction/utils.ts:146]
- `formatFileOperations()` 在没有 read-only 或 modified 文件时返回空字符串，所以 result summary 不一定包含 file-operation tags。[E: packages/coding-agent/src/core/compaction/utils.ts:85]
- `stopReason === "length"` 会 throw，不得把半截 summary 写成 session checkpoint。[E: packages/coding-agent/src/core/compaction/compaction.ts:589]
- durable `pi.compaction` / `CompactionTask` 是另一条路径，见 [subsys.durable.harness](../durable/harness.md)。[I]

## Branch Summary 边界

[subsys.agent-core.branch-summary](branch-summary.md) 覆盖 `branch_summary` entry 的 abandoned-branch collection、branch-specific prompt 和 result shape；本节点只说明 compaction cut point 允许 `branchSummary` message 成为 retained-history boundary。[E: packages/coding-agent/src/core/compaction/compaction.ts:357] [E: packages/coding-agent/src/core/compaction/compaction.ts:358]

[spine.compaction-flow](../../spine/compaction-flow.md) 是端到端视角，同时串起 context compaction 和 branch summarization；本节点收窄到 `shouldCompact`、`prepareCompaction`、`compact` 和 token estimate。[I]

[ref.agent.compaction-config](../../reference/compaction-config.md) 枚举配置项、默认值、custom instructions 与 thinking-level 对 summary request 的影响；本节点只记录 settings interface 和当前默认常量。[E: packages/coding-agent/src/core/compaction/compaction.ts:120] [E: packages/coding-agent/src/core/compaction/compaction.ts:126]

## Sources

- packages/coding-agent/src/core/compaction/compaction.ts
- packages/coding-agent/src/core/compaction/utils.ts
- packages/coding-agent/src/core/compaction/index.ts

## 相关

- [spine.compaction-flow](../../spine/compaction-flow.md) - context compaction 与 branch summary 的端到端 flow。
- [subsys.agent-core.branch-summary](branch-summary.md) - abandoned branch summary 的独立子系统。
- [ref.agent.compaction-config](../../reference/compaction-config.md) - compaction settings 与配置项目录。
- [subsys.coding-agent.session-manager](../coding-agent/session-manager.md) - `appendCompaction` / `buildSessionProjection`。
- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md) - 产品层谁调用 `shouldCompact` / `compact`。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md) - summary usage 在产品会话中的持久化和总量统计。
- [subsys.durable.harness](../durable/harness.md) - 平行的 durable `CompactionTask`，不共用本目录函数。
