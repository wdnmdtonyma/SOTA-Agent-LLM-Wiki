---
id: subsys.agent-core.branch-summary
title: 分支总结子系统
kind: subsystem
tier: T2
pkg: agent
source: [packages/agent/src/harness/compaction/branch-summarization.ts, packages/agent/src/harness/compaction/compaction.ts]
symbols: [collectEntriesForBranchSummary, generateBranchSummary]
related: [spine.compaction-flow, subsys.agent-core.compaction, subsys.coding-agent.usage-accounting]
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.branch-summary` 覆盖 pi-agent-core 在切换会话树分支时的 abandoned branch summary: `collectEntriesForBranchSummary()` 收集旧 leaf 到 common ancestor 之间的 entry,`generateBranchSummary()` 准备这些 entry、构造 LLM prompt,并在成功路径返回 summary、read files、modified files [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:117] [E: packages/agent/src/harness/compaction/branch-summarization.ts:219] [E: packages/agent/src/harness/compaction/branch-summarization.ts:249] [E: packages/agent/src/harness/compaction/branch-summarization.ts:263] [E: packages/agent/src/harness/compaction/branch-summarization.ts:294] [E: packages/agent/src/harness/compaction/branch-summarization.ts:298]。

## 能回答的问题

- `collectEntriesForBranchSummary()` 如何找到旧分支和目标分支的 common ancestor?
- 分支总结会收集哪些 entry,顺序如何保证?
- `prepareBranchEntries()` 如何把 entry 转成 message、file operations 和 token estimate?
- `generateBranchSummary()` 如何构造 summary prompt 并调用模型?
- branch summary 与 context compaction 的边界在哪里?

## 职责边界

本节点只覆盖 `packages/agent/src/harness/compaction/branch-summarization.ts` 中的分支 entry collection、branch preparation、summary prompt/generation 和 file operation result 组装 [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:131] [E: packages/agent/src/harness/compaction/branch-summarization.ts:189] [E: packages/agent/src/harness/compaction/branch-summarization.ts:219]。

`BranchSummaryDetails` 是生成后的 branch summary entry details 形状,只记录 `readFiles` 和 `modifiedFiles` 两个数组;`BranchPreparation` 是待总结内容的中间形态,包含 `messages`、`fileOps` 和 `totalTokens` [E: packages/agent/src/harness/compaction/branch-summarization.ts:41] [E: packages/agent/src/harness/compaction/branch-summarization.ts:43] [E: packages/agent/src/harness/compaction/branch-summarization.ts:45] [E: packages/agent/src/harness/compaction/branch-summarization.ts:51] [E: packages/agent/src/harness/compaction/branch-summarization.ts:53] [E: packages/agent/src/harness/compaction/branch-summarization.ts:55] [E: packages/agent/src/harness/compaction/branch-summarization.ts:57]。

`GenerateBranchSummaryOptions` 要求 `models`、`model`，可选 `customInstructions`、`replaceInstructions`、`reserveTokens`、`retry`、`callbacks`；没有 `signal` [E: packages/agent/src/harness/compaction/branch-summarization.ts:69] [E: packages/agent/src/harness/compaction/branch-summarization.ts:71] [E: packages/agent/src/harness/compaction/branch-summarization.ts:73]。abort 经 `generateBranchSummary(entries, options, context)` 的 `context.abortSignal`，由 `createSummaryRequestOptions` 写入 request [E: packages/agent/src/harness/compaction/branch-summarization.ts:219] [E: packages/agent/src/harness/compaction/branch-summarization.ts:274] [E: packages/agent/src/harness/compaction/compaction.ts:117] [E: packages/agent/src/harness/compaction/compaction.ts:120]。

## 关键文件

- `packages/agent/src/harness/compaction/branch-summarization.ts`: 定义 `BranchSummaryDetails`、`BranchPreparation`、`CollectEntriesResult`、`GenerateBranchSummaryOptions`,以及 `collectEntriesForBranchSummary()`、`prepareBranchEntries()`、`generateBranchSummary()` [E: packages/agent/src/harness/compaction/branch-summarization.ts:41] [E: packages/agent/src/harness/compaction/branch-summarization.ts:51] [E: packages/agent/src/harness/compaction/branch-summarization.ts:61] [E: packages/agent/src/harness/compaction/branch-summarization.ts:69] [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:131] [E: packages/agent/src/harness/compaction/branch-summarization.ts:219]。

## Entry Collection

`collectEntriesForBranchSummary(branch, session, oldTipId, targetId, context)` 在没有旧 tip 时直接返回空 `entries` 和 `commonAncestorId: null`;这个返回值本身不包含待总结 entry [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:90] [E: packages/agent/src/harness/compaction/branch-summarization.ts:94] [E: packages/agent/src/harness/compaction/branch-summarization.ts:95]。

有旧 tip 时,函数用 `branch.findEntries({ start: oldTipId }, context)` 建旧路径 `Set`,再 `branch.findEntries({ start: targetId }, context)` 作为目标路径 [E: packages/agent/src/harness/compaction/branch-summarization.ts:97] [E: packages/agent/src/harness/compaction/branch-summarization.ts:98]。默认 leaf-toward-root 的 `targetPath` 从数组开头（start/leaf 端）向前扫描,第一个也存在于旧路径 `Set` 的 entry id 被记为 `commonAncestorId` [E: packages/agent/src/harness/compaction/branch-summarization.ts:99] [E: packages/agent/src/harness/compaction/branch-summarization.ts:100] [E: packages/agent/src/harness/compaction/branch-summarization.ts:101] [E: packages/agent/src/harness/compaction/branch-summarization.ts:103]。

确定 common ancestor 后,函数从 `oldTipId` 开始沿 `parentId` 向上走,直到走到 `commonAncestorId` 或空 parent 为止;每一步通过 `session.getEntry(current, context)` 读取 entry,缺失时抛 `Error("Corrupt session: ...")`,不是 `SessionError("invalid_entry")` [E: packages/agent/src/harness/compaction/branch-summarization.ts:107] [E: packages/agent/src/harness/compaction/branch-summarization.ts:110] [E: packages/agent/src/harness/compaction/branch-summarization.ts:111] [E: packages/agent/src/harness/compaction/branch-summarization.ts:113]。收集到的 entries 先是从旧 tip 往祖先的逆序,函数最后 `entries.reverse()` 后返回 chronological order [E: packages/agent/src/harness/compaction/branch-summarization.ts:112] [E: packages/agent/src/harness/compaction/branch-summarization.ts:115] [E: packages/agent/src/harness/compaction/branch-summarization.ts:117]。

## Entry To Message

`getMessageFromEntry()` 只把三类 entry 转成 summary prompt 可用的 `AgentMessage`:非 `toolResult` 的 `message` entry、`branch_summary` 和 `compaction` [E: packages/agent/src/harness/compaction/branch-summarization.ts:119] [E: packages/agent/src/harness/compaction/branch-summarization.ts:121] [E: packages/agent/src/harness/compaction/branch-summarization.ts:122] [E: packages/agent/src/harness/compaction/branch-summarization.ts:123] [E: packages/agent/src/harness/compaction/branch-summarization.ts:125] [E: packages/agent/src/harness/compaction/branch-summarization.ts:128]。

`branch_summary` 通过 `createBranchSummaryMessage(entry.summary, entry.fromId, entry.timestamp)` 进入 prompt;`compaction` 通过 `createCompactionSummaryMessage(entry.summary, entry.tokensBefore, entry.timestamp)` 进入 prompt。`type === "custom"` 返回 `undefined`，从不调用 `createCustomMessage` [E: packages/agent/src/harness/compaction/branch-summarization.ts:125] [E: packages/agent/src/harness/compaction/branch-summarization.ts:126] [E: packages/agent/src/harness/compaction/branch-summarization.ts:128] [E: packages/agent/src/harness/compaction/branch-summarization.ts:129] [E: packages/agent/src/harness/compaction/branch-summarization.ts:130] [E: packages/agent/src/harness/compaction/branch-summarization.ts:131]。

以下 entry 不进入 branch summary prompt:`thinking_level_change`、`model_change`、`active_tools_change` 和 `custom` 都返回 `undefined` [E: packages/agent/src/harness/compaction/branch-summarization.ts:128] [E: packages/agent/src/harness/compaction/branch-summarization.ts:130] [E: packages/agent/src/harness/compaction/branch-summarization.ts:130] [E: packages/agent/src/harness/compaction/branch-summarization.ts:130] [E: packages/agent/src/harness/compaction/branch-summarization.ts:131]。

## Summary Preparation

`prepareBranchEntries(entries, tokenBudget = 0)` 先创建空 `messages`、`fileOps` 和 `totalTokens` accumulator [E: packages/agent/src/harness/compaction/branch-summarization.ts:136] [E: packages/agent/src/harness/compaction/branch-summarization.ts:137] [E: packages/agent/src/harness/compaction/branch-summarization.ts:138] [E: packages/agent/src/harness/compaction/branch-summarization.ts:139]。第一轮扫描会复用任意已有 `branch_summary.details`（没有 `!entry.fromHook` 守卫）:若 `details.readFiles` 或 `details.modifiedFiles` 是数组,分别加入 `fileOps.read` 和 `fileOps.edited` [E: packages/agent/src/harness/compaction/branch-summarization.ts:140] [E: packages/agent/src/harness/compaction/branch-summarization.ts:168] [E: packages/agent/src/harness/compaction/branch-summarization.ts:150] [E: packages/agent/src/harness/compaction/branch-summarization.ts:149] [E: packages/agent/src/harness/compaction/branch-summarization.ts:150] [E: packages/agent/src/harness/compaction/branch-summarization.ts:154] [E: packages/agent/src/harness/compaction/branch-summarization.ts:156]。

第二轮扫描从 entries 尾部往前处理,把能转成 message 的 entry 交给 `extractFileOpsFromMessage(message, fileOps)`,再用 `estimateTokens(message)` 估算 token cost [E: packages/agent/src/harness/compaction/branch-summarization.ts:160] [E: packages/agent/src/harness/compaction/branch-summarization.ts:162] [E: packages/agent/src/harness/compaction/branch-summarization.ts:163] [E: packages/agent/src/harness/compaction/branch-summarization.ts:164] [E: packages/agent/src/harness/compaction/branch-summarization.ts:166]。

当 `tokenBudget > 0` 且加入当前 message 会超过预算时,普通 entry 会触发 `break`;只有当前 entry 是 `compaction` 或 `branch_summary` 且当前累计小于预算的 90% 时,函数才把该 summary message `unshift` 进保留消息 [E: packages/agent/src/harness/compaction/branch-summarization.ts:167] [E: packages/agent/src/harness/compaction/branch-summarization.ts:168] [E: packages/agent/src/harness/compaction/branch-summarization.ts:169] [E: packages/agent/src/harness/compaction/branch-summarization.ts:170] [E: packages/agent/src/harness/compaction/branch-summarization.ts:171] [E: packages/agent/src/harness/compaction/branch-summarization.ts:174]。未超预算的 message 始终 `unshift` 到 `messages`,因此输出消息仍保持 chronological order [E: packages/agent/src/harness/compaction/branch-summarization.ts:177] [E: packages/agent/src/harness/compaction/branch-summarization.ts:178] [E: packages/agent/src/harness/compaction/branch-summarization.ts:181]。

## Summary Prompt And Generation

`BRANCH_SUMMARY_PROMPT` 要求模型生成固定结构:Goal、Constraints & Preferences、Progress(Done/In Progress/Blocked)、Key Decisions、Next Steps,并要求保留 exact file paths、function names 和 error messages [E: packages/agent/src/harness/compaction/branch-summarization.ts:189] [E: packages/agent/src/harness/compaction/branch-summarization.ts:191] [E: packages/agent/src/harness/compaction/branch-summarization.ts:193] [E: packages/agent/src/harness/compaction/branch-summarization.ts:196] [E: packages/agent/src/harness/compaction/branch-summarization.ts:200] [E: packages/agent/src/harness/compaction/branch-summarization.ts:210] [E: packages/agent/src/harness/compaction/branch-summarization.ts:213] [E: packages/agent/src/harness/compaction/branch-summarization.ts:216]。

`generateBranchSummary()` 先从 `model.contextWindow || 128000` 推导 context window,再用 `reserveTokens` 默认值 16384 计算 `tokenBudget`;`prepareBranchEntries(entries, tokenBudget)` 产生待总结 `messages` 和 `fileOps` [E: packages/agent/src/harness/compaction/branch-summarization.ts:219] [E: packages/agent/src/harness/compaction/branch-summarization.ts:224] [E: packages/agent/src/harness/compaction/branch-summarization.ts:225] [E: packages/agent/src/harness/compaction/branch-summarization.ts:226] [E: packages/agent/src/harness/compaction/branch-summarization.ts:249]。如果没有可总结 messages,函数返回 `ok({ summary: "No content to summarize", readFiles: [], modifiedFiles: [] })` [E: packages/agent/src/harness/compaction/branch-summarization.ts:250] [E: packages/agent/src/harness/compaction/branch-summarization.ts:251]。

有可总结 messages 时,函数先 `convertToLlm(messages)`,再 `serializeConversation(llmMessages)`,最后把序列化会话包进 `<conversation>...</conversation>` 并拼上 instructions [E: packages/agent/src/harness/compaction/branch-summarization.ts:253] [E: packages/agent/src/harness/compaction/branch-summarization.ts:254] [E: packages/agent/src/harness/compaction/branch-summarization.ts:263]。instructions 的选择规则是: `replaceInstructions && customInstructions` 时只用 custom instructions;只有 `customInstructions` 时在默认 prompt 后追加 `Additional focus`;否则使用默认 `BRANCH_SUMMARY_PROMPT` [E: packages/agent/src/harness/compaction/branch-summarization.ts:255] [E: packages/agent/src/harness/compaction/branch-summarization.ts:256] [E: packages/agent/src/harness/compaction/branch-summarization.ts:257] [E: packages/agent/src/harness/compaction/branch-summarization.ts:258] [E: packages/agent/src/harness/compaction/branch-summarization.ts:259] [E: packages/agent/src/harness/compaction/branch-summarization.ts:260] [E: packages/agent/src/harness/compaction/branch-summarization.ts:261]。

LLM request 是一条 user message,content 是 `promptText`,timestamp 使用 `Date.now()`；`generateBranchSummaryWithRequest` 把 `SUMMARIZATION_SYSTEM_PROMPT` 和这条 message 交给 caller 的 `request`,options 是 `createSummaryRequestOptions({ maxTokens: 2048 }, context)`,没有 options 级 `signal` [E: packages/agent/src/harness/compaction/branch-summarization.ts:265] [E: packages/agent/src/harness/compaction/branch-summarization.ts:268] [E: packages/agent/src/harness/compaction/branch-summarization.ts:272] [E: packages/agent/src/harness/compaction/branch-summarization.ts:274]。

`response.stopReason === "aborted"` 会返回 `BranchSummaryError("aborted", ...)`;`response.stopReason === "error"` 会返回 `BranchSummaryError("summarization_failed", ...)` [E: packages/agent/src/harness/compaction/branch-summarization.ts:277] [E: packages/agent/src/harness/compaction/branch-summarization.ts:278] [E: packages/agent/src/harness/compaction/branch-summarization.ts:280] [E: packages/agent/src/harness/compaction/branch-summarization.ts:282] [E: packages/agent/src/harness/compaction/branch-summarization.ts:283] [E: packages/agent/src/harness/compaction/branch-summarization.ts:284]。成功响应只拼接 text content block,前置 `BRANCH_SUMMARY_PREAMBLE`,再追加 `formatFileOperations(readFiles, modifiedFiles)` 的文件操作段 [E: packages/agent/src/harness/compaction/branch-summarization.ts:289] [E: packages/agent/src/harness/compaction/branch-summarization.ts:268] [E: packages/agent/src/harness/compaction/branch-summarization.ts:268] [E: packages/agent/src/harness/compaction/branch-summarization.ts:289] [E: packages/agent/src/harness/compaction/branch-summarization.ts:290] [E: packages/agent/src/harness/compaction/branch-summarization.ts:291] [E: packages/agent/src/harness/compaction/branch-summarization.ts:292]。

成功路径的返回对象包含 summary、provider `usage` 和从 `fileOps` 计算出的 `readFiles`、`modifiedFiles`;若拼接后的 summary 为空,函数使用 `"No summary generated"` 兜底 [E: packages/agent/src/harness/compaction/branch-summarization.ts:291] [E: packages/agent/src/harness/compaction/branch-summarization.ts:294] [E: packages/agent/src/harness/compaction/branch-summarization.ts:295] [E: packages/agent/src/harness/compaction/branch-summarization.ts:296] [E: packages/agent/src/harness/compaction/branch-summarization.ts:298]。

## Compaction 边界

branch summary 与 compaction 共用部分消息化和 token 预算工具:本文件从 `./compaction.ts` 导入 `estimateTokens` 与 `SUMMARIZATION_SYSTEM_PROMPT`,从 `./utils.ts` 导入 file operation、conversation serialization 和 formatting helpers [E: packages/agent/src/harness/compaction/branch-summarization.ts:22] [E: packages/agent/src/harness/compaction/branch-summarization.ts:23] [E: packages/agent/src/harness/compaction/branch-summarization.ts:24] [E: packages/agent/src/harness/compaction/branch-summarization.ts:25] [E: packages/agent/src/harness/compaction/branch-summarization.ts:26] [E: packages/agent/src/harness/compaction/branch-summarization.ts:28] [E: packages/agent/src/harness/compaction/branch-summarization.ts:29]。

branch summary 会把已有 `compaction` entry 作为一种 summary message 纳入 prompt,但不会在本文件里选择 compaction cut point 或生成 `CompactResult`;`getMessageFromEntry()` 对 `compaction` entry 只调用 `createCompactionSummaryMessage(entry.summary, entry.tokensBefore, entry.timestamp)` [E: packages/agent/src/harness/compaction/branch-summarization.ts:128] [E: packages/agent/src/harness/compaction/branch-summarization.ts:129]。当 token budget 超限时,`prepareBranchEntries()` 对 `compaction` 和 `branch_summary` entry 有同一条保留例外:若当前累计仍小于预算 90%,可以保留该 summary message 再停止扫描 [E: packages/agent/src/harness/compaction/branch-summarization.ts:167] [E: packages/agent/src/harness/compaction/branch-summarization.ts:168] [E: packages/agent/src/harness/compaction/branch-summarization.ts:169] [E: packages/agent/src/harness/compaction/branch-summarization.ts:170] [E: packages/agent/src/harness/compaction/branch-summarization.ts:174]。

本文件在 LLM 成功路径构造的 branch summary result object 字段是 `summary`、provider `usage`、`readFiles` 和 `modifiedFiles`;该 return object 不包含 compaction 专用的 `firstKeptEntryId` 或 `tokensBefore` 输出字段。无可总结 messages 的 fast path 返回 summary 与两个空 file lists，并省略可选 `usage` [E: packages/agent/src/harness/compaction/branch-summarization.ts:250] [E: packages/agent/src/harness/compaction/branch-summarization.ts:251] [E: packages/agent/src/harness/compaction/branch-summarization.ts:294] [E: packages/agent/src/harness/compaction/branch-summarization.ts:295] [E: packages/agent/src/harness/compaction/branch-summarization.ts:296] [E: packages/agent/src/harness/compaction/branch-summarization.ts:297] [E: packages/agent/src/harness/compaction/branch-summarization.ts:298]。

## Gotcha

- `collectEntriesForBranchSummary()` 只收集旧 tip 到 common ancestor 之间的 abandoned entries;target branch 本身不是 summary input [E: packages/agent/src/harness/compaction/branch-summarization.ts:97] [E: packages/agent/src/harness/compaction/branch-summarization.ts:98] [E: packages/agent/src/harness/compaction/branch-summarization.ts:109] [E: packages/agent/src/harness/compaction/branch-summarization.ts:113]。
- `message` entry 中 `role === "toolResult"` 的消息不会直接进入 branch summary prompt;file operations 仍通过进入 prompt 的消息和已有 branch summary details 提取 [E: packages/agent/src/harness/compaction/branch-summarization.ts:121] [E: packages/agent/src/harness/compaction/branch-summarization.ts:122] [E: packages/agent/src/harness/compaction/branch-summarization.ts:140] [E: packages/agent/src/harness/compaction/branch-summarization.ts:164]。
- `replaceInstructions` 只有在同时存在 `customInstructions` 时才替换默认 prompt;没有 custom instructions 时仍使用 `BRANCH_SUMMARY_PROMPT` [E: packages/agent/src/harness/compaction/branch-summarization.ts:256] [E: packages/agent/src/harness/compaction/branch-summarization.ts:257] [E: packages/agent/src/harness/compaction/branch-summarization.ts:260] [E: packages/agent/src/harness/compaction/branch-summarization.ts:261]。
- 已有 `branch_summary.details` 只要存在就会复用进 file operation accumulator；没有 `fromHook` 守卫，hook 生成的 details 也会被带入 [E: packages/agent/src/harness/compaction/branch-summarization.ts:168]。

## 跨包边界

更大的 compaction/branch navigation flow 不在本 source 内展开;本节点只覆盖 `branch-summarization.ts` 的 collection、preparation 和 model generation helper [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:131] [E: packages/agent/src/harness/compaction/branch-summarization.ts:219]。

context compaction 的 threshold、cut point 和 `CompactResult` 不是本文件成功路径返回的 branch summary result object;本节点只说明 branch summary 如何消费已有 `compaction` entry 和共用 summarization prompt/tooling [E: packages/agent/src/harness/compaction/branch-summarization.ts:22] [E: packages/agent/src/harness/compaction/branch-summarization.ts:128] [E: packages/agent/src/harness/compaction/branch-summarization.ts:129] [E: packages/agent/src/harness/compaction/branch-summarization.ts:167] [E: packages/agent/src/harness/compaction/branch-summarization.ts:168] [E: packages/agent/src/harness/compaction/branch-summarization.ts:294] [E: packages/agent/src/harness/compaction/branch-summarization.ts:298]。

## Sources

- packages/agent/src/harness/compaction/branch-summarization.ts
- packages/agent/src/harness/compaction/compaction.ts

## 相关

- [spine.compaction-flow](../../spine/compaction-flow.md): context compaction 与 branch summary 的整体 flow。
- [subsys.agent-core.compaction](compaction.md): compaction threshold、cut point、summary generation 和 `CompactResult`。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): branch-summary usage 在产品层 entry 与总量中的流转。
