---
id: subsys.agent-core.branch-summary
title: 分支总结子系统
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/compaction/branch-summarization.ts
  - packages/coding-agent/src/core/compaction/compaction.ts
  - packages/coding-agent/src/core/compaction/utils.ts
symbols:
  - collectEntriesForBranchSummary
  - generateBranchSummary
  - prepareBranchEntries
  - BranchSummaryResult
  - GenerateBranchSummaryOptions
related:
  - spine.compaction-flow
  - subsys.agent-core.compaction
  - subsys.coding-agent.usage-accounting
  - subsys.coding-agent.session-manager
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.agent-core.branch-summary` 覆盖 **pi-coding-agent** 在切换会话树分支时的 abandoned branch summary：`collectEntriesForBranchSummary()` 收集旧 leaf 到 common ancestor 之间的 entry，`generateBranchSummary()` 准备这些 entry、构造 LLM prompt，并在成功路径返回 summary、read files、modified files。实现全部在 `packages/coding-agent/src/core/compaction/`。

## 能回答的问题

- `collectEntriesForBranchSummary()` 如何找到旧分支和目标分支的 common ancestor？
- 分支总结会收集哪些 entry，顺序如何保证？
- `prepareBranchEntries()` 如何把 entry 转成 message、file operations 和 token estimate？
- `generateBranchSummary()` 如何构造 summary prompt 并调用模型？
- branch summary 与 context compaction 的边界在哪里？

## 职责边界

本节点只覆盖 `packages/coding-agent/src/core/compaction/branch-summarization.ts` 中的分支 entry collection、branch preparation、summary prompt/generation 和 file operation result 组装。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:108] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:195] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:293]

`BranchSummaryDetails` 是生成后的 branch summary entry details 形状，只记录 `readFiles` 和 `modifiedFiles` 两个数组；`BranchPreparation` 是待总结内容的中间形态，包含 `messages`、`fileOps` 和 `totalTokens`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:44] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:51]

`GenerateBranchSummaryOptions` 要求 `model` 与 `signal`，可选 `apiKey`、`headers`、`env`、`customInstructions`、`replaceInstructions`、`reserveTokens`、`streamFn`、`retry`、`callbacks`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:67] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:69] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:77] abort 经 `options.signal` 写入 request，没有 Chord `Context` 参数。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:352]

**不要**再 cite `packages/agent/src/harness/compaction/**`。[I]

## 关键文件

- `packages/coding-agent/src/core/compaction/branch-summarization.ts`：`collectEntriesForBranchSummary()`、`prepareBranchEntries()`、`generateBranchSummary()`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:108] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:195] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:293]
- `packages/coding-agent/src/core/compaction/compaction.ts`：共享 `completeSummarization()` / `estimateTokens()` / `getSummarizationFailure()`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:19]
- `packages/coding-agent/src/core/compaction/utils.ts`：file ops、`serializeConversation`、`SUMMARIZATION_SYSTEM_PROMPT`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:20]

## Entry Collection

`collectEntriesForBranchSummary(session, oldLeafId, targetId)` 在没有旧 tip 时直接返回空 `entries` 和 `commonAncestorId: null`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:108] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:114] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:115] `session` 类型是 `ReadonlySessionManager`，不是 durable `Session`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:18]

有旧 tip 时，函数用 `session.getBranch(oldLeafId)` 建旧路径 `Set`，再 `session.getBranch(targetId)` 作为目标路径。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:119] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:120] `getBranch()` 是 root-first，因此从数组末尾向前扫描，第一个也存在于旧路径 `Set` 的 entry id 被记为 `commonAncestorId`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:123] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:124] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:126]

确定 common ancestor 后，函数从 `oldLeafId` 开始沿 `parentId` 向上走，直到走到 `commonAncestorId` 或空 parent 为止；每一步通过 `session.getEntry(current)` 读取 entry，缺失时 `break`，不 throw。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:133] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:136] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:137] 收集到的 entries 先是从旧 tip 往祖先的逆序，函数最后 `entries.reverse()` 后返回 chronological order。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:143] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:145]

## Entry To Message

`getMessageFromEntry()` 把下列 entry 转成 summary prompt 可用的 `AgentMessage`：非 `toolResult` 的 `message`、`custom_message`、`branch_summary`、`compaction`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:157] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:160] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:163] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:166] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:169]

`custom_message` 通过 `createCustomMessage(...)` 进入 prompt；`branch_summary` 通过 `createBranchSummaryMessage(entry.summary, entry.fromId, entry.timestamp)`；`compaction` 通过 `createCompactionSummaryMessage(entry.summary, entry.tokensBefore, entry.timestamp)`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:164] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:167] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:170] 这些工厂来自 `packages/coding-agent/src/core/messages.ts`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:17]

以下 entry 不进入 branch summary prompt：`thinking_level_change`、`model_change`、`custom`、`label`、`session_info` 都返回 `undefined`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:173] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:178]

## Summary Preparation

`prepareBranchEntries(entries, tokenBudget = 0)` 先创建空 `messages`、`fileOps` 和 `totalTokens` accumulator。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:195] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:196] 第一轮扫描只复用 `branch_summary` 且 `!entry.fromHook` 的 details：若 `details.readFiles` 或 `details.modifiedFiles` 是数组，分别加入 `fileOps.read` 和 `fileOps.edited`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:204] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:206] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:212]

第二轮扫描从 entries 尾部往前处理，把能转成 message 的 entry 交给 `extractFileOpsFromMessage(message, fileOps)`，再用 `estimateTokens(message)` 估算 token cost。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:219] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:225] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:227]

当 `tokenBudget > 0` 且加入当前 message 会超过预算时，普通 entry 会触发 `break`；只有当前 entry 是 `compaction` 或 `branch_summary` 且当前累计小于预算的 90% 时，函数才把该 summary message `unshift` 进保留消息。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:230] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:232] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:233] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:239] 未超预算的 message 始终 `unshift` 到 `messages`，因此输出消息仍保持 chronological order。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:242]

## Summary Prompt And Generation

`BRANCH_SUMMARY_PROMPT` 要求模型生成固定结构：Goal、Constraints & Preferences、Progress(Done/In Progress/Blocked)、Key Decisions、Next Steps，并要求保留 exact file paths、function names 和 error messages。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:258] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:263] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:285]

`generateBranchSummary()` 先从 `model.contextWindow || 128000` 推导 context window，再用 `reserveTokens` 默认值 16384 计算 `tokenBudget`；`prepareBranchEntries(entries, tokenBudget)` 产生待总结 `messages` 和 `fileOps`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:293] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:305] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:312] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:315] 如果没有可总结 messages，函数返回 `{ summary: "No content to summarize" }`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:317] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:318]

有可总结 messages 时，函数先 `convertToLlm(messages)`，再 `serializeConversation(llmMessages)`，最后把序列化会话包进 `<conversation>...</conversation>` 并拼上 instructions。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:323] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:335] instructions 的选择规则是：`replaceInstructions && customInstructions` 时只用 custom instructions；只有 `customInstructions` 时在默认 prompt 后追加 `Additional focus`；否则使用默认 `BRANCH_SUMMARY_PROMPT`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:328] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:330] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:333]

LLM request 是一条 user message，content 是 `promptText`，timestamp 使用 `Date.now()`；`maxTokens` 是 `Math.min(4096, model.maxTokens > 0 ? model.maxTokens : Number.POSITIVE_INFINITY)`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:337] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:345] 实际调用走 `completeSummarization(model, context, requestOptions, streamFn, retry, callbacks)`，与 compaction 共用 retry / cacheRetention: none 路径。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:353] [E: packages/coding-agent/src/core/compaction/compaction.ts:619]

`response.stopReason === "aborted"` 返回 `{ aborted: true }`；`getSummarizationFailure()` 命中（`error` 或 `length`）返回 `{ error: failure }`；响应含 toolCall 返回 `{ error: "Branch summarization attempted to call a tool" }`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:356] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:359] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:363]

成功响应只拼接 text content block，前置 `BRANCH_SUMMARY_PREAMBLE`，再追加 `formatFileOperations(readFiles, modifiedFiles)` 的文件操作段。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:367] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:370] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:374] 成功路径的返回对象包含 summary、provider `usage` 和从 `fileOps` 计算出的 `readFiles`、`modifiedFiles`；若拼接后的 summary 为空，函数使用 `"No summary generated"` 兜底。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:376] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:377]

## Compaction 边界

branch summary 与 compaction 共用部分消息化和 token 预算工具：本文件从 `./compaction.ts` 导入 `completeSummarization`、`estimateTokens`、`getSummarizationFailure`，从 `./utils.ts` 导入 file operation、conversation serialization 和 formatting helpers。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:19] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:20]

branch summary 会把已有 `compaction` entry 作为一种 summary message 纳入 prompt，但不会在本文件里选择 compaction cut point 或生成 `CompactionResult`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:169] 当 token budget 超限时，`prepareBranchEntries()` 对 `compaction` 和 `branch_summary` entry 有同一条保留例外：若当前累计仍小于预算 90%，可以保留该 summary message 再停止扫描。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:232] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:233]

本文件成功路径的 `BranchSummaryResult` 字段是 `summary`、provider `usage`、`readFiles` 和 `modifiedFiles`；失败走 `aborted` / `error`，不是 compaction 的 throw。无可总结 messages 的 fast path 返回 summary 字符串并省略 file lists 与 usage。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:34] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:318] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:376]

## Gotcha

- `collectEntriesForBranchSummary()` 只收集旧 tip 到 common ancestor 之间的 abandoned entries；target branch 本身不是 summary input。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:119] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:132]
- `message` entry 中 `role === "toolResult"` 的消息不会直接进入 branch summary prompt；file operations 仍通过进入 prompt 的消息和已有 branch summary details 提取。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:160] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:204] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:225]
- `replaceInstructions` 只有在同时存在 `customInstructions` 时才替换默认 prompt；没有 custom instructions 时仍使用 `BRANCH_SUMMARY_PROMPT`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:328] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:333]
- 已有 `branch_summary.details` 只有 `!fromHook` 时才复用进 file operation accumulator；hook 生成的 details 不会被带入。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:204]
- `generateBranchSummary()` 不 throw summarization failure；调用方必须读 `result.aborted` / `result.error`。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:356] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:361]

## 跨包边界

更大的 compaction/branch navigation flow 不在本 source 内展开；本节点只覆盖 `branch-summarization.ts` 的 collection、preparation 和 model generation helper。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:108] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:195] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:293]

context compaction 的 threshold、cut point 和 `CompactionResult` 不是本文件成功路径返回的 branch summary result；本节点只说明 branch summary 如何消费已有 `compaction` entry 和共用 summarization prompt/tooling。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:19] [E: packages/coding-agent/src/core/compaction/branch-summarization.ts:169]

产品层 `AgentSession` 在 tree navigation 时调用这两个函数，再经 `SessionManager.branchWithSummary()` 落盘，见 [spine.compaction-flow](../../spine/compaction-flow.md)。[I]

## Sources

- packages/coding-agent/src/core/compaction/branch-summarization.ts
- packages/coding-agent/src/core/compaction/compaction.ts
- packages/coding-agent/src/core/compaction/utils.ts

## 相关

- [spine.compaction-flow](../../spine/compaction-flow.md) - context compaction 与 branch summary 的整体 flow。
- [subsys.agent-core.compaction](compaction.md) - compaction threshold、cut point、summary generation 和 `CompactionResult`。
- [subsys.coding-agent.session-manager](../coding-agent/session-manager.md) - `ReadonlySessionManager` / `getBranch` / `branchWithSummary`。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md) - branch-summary usage 在产品层 entry 与总量中的流转。
