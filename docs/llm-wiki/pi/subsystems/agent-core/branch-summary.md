---
id: subsys.agent-core.branch-summary
title: 分支总结子系统
kind: subsystem
tier: T2
pkg: agent
source: [packages/agent/src/harness/compaction/branch-summarization.ts]
symbols: [collectEntriesForBranchSummary, generateBranchSummary]
related: [spine.compaction-flow, subsys.agent-core.compaction]
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.agent-core.branch-summary` 覆盖 pi-agent-core 在切换会话树分支时的 abandoned branch summary: `collectEntriesForBranchSummary()` 收集旧 leaf 到 common ancestor 之间的 entry,`generateBranchSummary()` 准备这些 entry、构造 LLM prompt,并在成功路径返回 summary、read files、modified files [E: packages/agent/src/harness/compaction/branch-summarization.ts:67] [E: packages/agent/src/harness/compaction/branch-summarization.ts:95] [E: packages/agent/src/harness/compaction/branch-summarization.ts:199] [E: packages/agent/src/harness/compaction/branch-summarization.ts:207] [E: packages/agent/src/harness/compaction/branch-summarization.ts:222] [E: packages/agent/src/harness/compaction/branch-summarization.ts:256] [E: packages/agent/src/harness/compaction/branch-summarization.ts:259]。

## 能回答的问题

- `collectEntriesForBranchSummary()` 如何找到旧分支和目标分支的 common ancestor?
- 分支总结会收集哪些 entry,顺序如何保证?
- `prepareBranchEntries()` 如何把 entry 转成 message、file operations 和 token estimate?
- `generateBranchSummary()` 如何构造 summary prompt 并调用模型?
- branch summary 与 context compaction 的边界在哪里?

## 职责边界

本节点只覆盖 `packages/agent/src/harness/compaction/branch-summarization.ts` 中的分支 entry collection、branch preparation、summary prompt/generation 和 file operation result 组装 [E: packages/agent/src/harness/compaction/branch-summarization.ts:67] [E: packages/agent/src/harness/compaction/branch-summarization.ts:123] [E: packages/agent/src/harness/compaction/branch-summarization.ts:169] [E: packages/agent/src/harness/compaction/branch-summarization.ts:199]。

`BranchSummaryDetails` 是生成后的 branch summary entry details 形状,只记录 `readFiles` 和 `modifiedFiles` 两个数组;`BranchPreparation` 是待总结内容的中间形态,包含 `messages`、`fileOps` 和 `totalTokens` [E: packages/agent/src/harness/compaction/branch-summarization.ts:23] [E: packages/agent/src/harness/compaction/branch-summarization.ts:25] [E: packages/agent/src/harness/compaction/branch-summarization.ts:27] [E: packages/agent/src/harness/compaction/branch-summarization.ts:33] [E: packages/agent/src/harness/compaction/branch-summarization.ts:35] [E: packages/agent/src/harness/compaction/branch-summarization.ts:37] [E: packages/agent/src/harness/compaction/branch-summarization.ts:39]。

`GenerateBranchSummaryOptions` 要求 caller 提供 `models`、`model`、`signal`,并允许提供 `customInstructions`、`replaceInstructions` 和 `reserveTokens`;generation request 通过 `models.completeSimple()` 发出 [E: packages/agent/src/harness/compaction/branch-summarization.ts:51] [E: packages/agent/src/harness/compaction/branch-summarization.ts:53] [E: packages/agent/src/harness/compaction/branch-summarization.ts:55] [E: packages/agent/src/harness/compaction/branch-summarization.ts:57] [E: packages/agent/src/harness/compaction/branch-summarization.ts:59] [E: packages/agent/src/harness/compaction/branch-summarization.ts:61] [E: packages/agent/src/harness/compaction/branch-summarization.ts:63] [E: packages/agent/src/harness/compaction/branch-summarization.ts:231]。

## 关键文件

- `packages/agent/src/harness/compaction/branch-summarization.ts`: 定义 `BranchSummaryDetails`、`BranchPreparation`、`CollectEntriesResult`、`GenerateBranchSummaryOptions`,以及 `collectEntriesForBranchSummary()`、`prepareBranchEntries()`、`generateBranchSummary()` [E: packages/agent/src/harness/compaction/branch-summarization.ts:23] [E: packages/agent/src/harness/compaction/branch-summarization.ts:33] [E: packages/agent/src/harness/compaction/branch-summarization.ts:43] [E: packages/agent/src/harness/compaction/branch-summarization.ts:51] [E: packages/agent/src/harness/compaction/branch-summarization.ts:67] [E: packages/agent/src/harness/compaction/branch-summarization.ts:123] [E: packages/agent/src/harness/compaction/branch-summarization.ts:199]。

## Entry Collection

`collectEntriesForBranchSummary(session, oldLeafId, targetId)` 在没有旧 leaf 时直接返回空 `entries` 和 `commonAncestorId: null`;这个返回值本身不包含待总结 entry [E: packages/agent/src/harness/compaction/branch-summarization.ts:67] [E: packages/agent/src/harness/compaction/branch-summarization.ts:72] [E: packages/agent/src/harness/compaction/branch-summarization.ts:73]。

有旧 leaf 时,函数先把 `session.getBranch(oldLeafId)` 的 entry ids 放进 `Set`,再读取 `session.getBranch(targetId)` 作为目标路径 [E: packages/agent/src/harness/compaction/branch-summarization.ts:75] [E: packages/agent/src/harness/compaction/branch-summarization.ts:76]。它从目标路径末尾向前扫描,第一个也存在于旧路径 `Set` 的 entry id 被记为 `commonAncestorId` [E: packages/agent/src/harness/compaction/branch-summarization.ts:77] [E: packages/agent/src/harness/compaction/branch-summarization.ts:78] [E: packages/agent/src/harness/compaction/branch-summarization.ts:79] [E: packages/agent/src/harness/compaction/branch-summarization.ts:80]。

确定 common ancestor 后,函数从 `oldLeafId` 开始沿 `parentId` 向上走,直到走到 `commonAncestorId` 或空 parent 为止;每一步通过 `session.getEntry(current)` 读取 entry,缺失时抛 `SessionError("invalid_session", ...)` [E: packages/agent/src/harness/compaction/branch-summarization.ts:84] [E: packages/agent/src/harness/compaction/branch-summarization.ts:85] [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:88] [E: packages/agent/src/harness/compaction/branch-summarization.ts:89] [E: packages/agent/src/harness/compaction/branch-summarization.ts:91]。收集到的 entries 先是从旧 leaf 往祖先的逆序,函数最后 `entries.reverse()` 后返回 chronological order [E: packages/agent/src/harness/compaction/branch-summarization.ts:90] [E: packages/agent/src/harness/compaction/branch-summarization.ts:93] [E: packages/agent/src/harness/compaction/branch-summarization.ts:95]。

## Entry To Message

`getMessageFromEntry()` 只把四类 entry 转成 summary prompt 可用的 `AgentMessage`:非 `toolResult` 的 `message` entry、`custom_message`、`branch_summary` 和 `compaction` [E: packages/agent/src/harness/compaction/branch-summarization.ts:97] [E: packages/agent/src/harness/compaction/branch-summarization.ts:99] [E: packages/agent/src/harness/compaction/branch-summarization.ts:100] [E: packages/agent/src/harness/compaction/branch-summarization.ts:101] [E: packages/agent/src/harness/compaction/branch-summarization.ts:103] [E: packages/agent/src/harness/compaction/branch-summarization.ts:106] [E: packages/agent/src/harness/compaction/branch-summarization.ts:109]。

`custom_message` 通过 `createCustomMessage(entry.customType, entry.content, entry.display, entry.details, entry.timestamp)` 进入 prompt;`branch_summary` 通过 `createBranchSummaryMessage(entry.summary, entry.fromId, entry.timestamp)` 进入 prompt;`compaction` 通过 `createCompactionSummaryMessage(entry.summary, entry.tokensBefore, entry.timestamp)` 进入 prompt [E: packages/agent/src/harness/compaction/branch-summarization.ts:103] [E: packages/agent/src/harness/compaction/branch-summarization.ts:104] [E: packages/agent/src/harness/compaction/branch-summarization.ts:106] [E: packages/agent/src/harness/compaction/branch-summarization.ts:107] [E: packages/agent/src/harness/compaction/branch-summarization.ts:109] [E: packages/agent/src/harness/compaction/branch-summarization.ts:110]。

以下 entry 不进入 branch summary prompt:`thinking_level_change`、`model_change`、`active_tools_change`、`custom`、`label`、`session_info` 和 `leaf` 都返回 `undefined` [E: packages/agent/src/harness/compaction/branch-summarization.ts:111] [E: packages/agent/src/harness/compaction/branch-summarization.ts:112] [E: packages/agent/src/harness/compaction/branch-summarization.ts:113] [E: packages/agent/src/harness/compaction/branch-summarization.ts:114] [E: packages/agent/src/harness/compaction/branch-summarization.ts:115] [E: packages/agent/src/harness/compaction/branch-summarization.ts:116] [E: packages/agent/src/harness/compaction/branch-summarization.ts:117] [E: packages/agent/src/harness/compaction/branch-summarization.ts:118]。

## Summary Preparation

`prepareBranchEntries(entries, tokenBudget = 0)` 先创建空 `messages`、`fileOps` 和 `totalTokens` accumulator [E: packages/agent/src/harness/compaction/branch-summarization.ts:123] [E: packages/agent/src/harness/compaction/branch-summarization.ts:124] [E: packages/agent/src/harness/compaction/branch-summarization.ts:125] [E: packages/agent/src/harness/compaction/branch-summarization.ts:126]。第一轮扫描会复用非 hook 生成的 `branch_summary.details`:若 `details.readFiles` 或 `details.modifiedFiles` 是数组,分别加入 `fileOps.read` 和 `fileOps.edited` [E: packages/agent/src/harness/compaction/branch-summarization.ts:127] [E: packages/agent/src/harness/compaction/branch-summarization.ts:128] [E: packages/agent/src/harness/compaction/branch-summarization.ts:129] [E: packages/agent/src/harness/compaction/branch-summarization.ts:130] [E: packages/agent/src/harness/compaction/branch-summarization.ts:131] [E: packages/agent/src/harness/compaction/branch-summarization.ts:133] [E: packages/agent/src/harness/compaction/branch-summarization.ts:135]。

第二轮扫描从 entries 尾部往前处理,把能转成 message 的 entry 交给 `extractFileOpsFromMessage(message, fileOps)`,再用 `estimateTokens(message)` 估算 token cost [E: packages/agent/src/harness/compaction/branch-summarization.ts:140] [E: packages/agent/src/harness/compaction/branch-summarization.ts:142] [E: packages/agent/src/harness/compaction/branch-summarization.ts:143] [E: packages/agent/src/harness/compaction/branch-summarization.ts:144] [E: packages/agent/src/harness/compaction/branch-summarization.ts:146]。

当 `tokenBudget > 0` 且加入当前 message 会超过预算时,普通 entry 会触发 `break`;只有当前 entry 是 `compaction` 或 `branch_summary` 且当前累计小于预算的 90% 时,函数才把该 summary message `unshift` 进保留消息 [E: packages/agent/src/harness/compaction/branch-summarization.ts:147] [E: packages/agent/src/harness/compaction/branch-summarization.ts:148] [E: packages/agent/src/harness/compaction/branch-summarization.ts:149] [E: packages/agent/src/harness/compaction/branch-summarization.ts:150] [E: packages/agent/src/harness/compaction/branch-summarization.ts:151] [E: packages/agent/src/harness/compaction/branch-summarization.ts:154]。未超预算的 message 始终 `unshift` 到 `messages`,因此输出消息仍保持 chronological order [E: packages/agent/src/harness/compaction/branch-summarization.ts:157] [E: packages/agent/src/harness/compaction/branch-summarization.ts:158] [E: packages/agent/src/harness/compaction/branch-summarization.ts:161]。

## Summary Prompt And Generation

`BRANCH_SUMMARY_PROMPT` 要求模型生成固定结构:Goal、Constraints & Preferences、Progress(Done/In Progress/Blocked)、Key Decisions、Next Steps,并要求保留 exact file paths、function names 和 error messages [E: packages/agent/src/harness/compaction/branch-summarization.ts:169] [E: packages/agent/src/harness/compaction/branch-summarization.ts:171] [E: packages/agent/src/harness/compaction/branch-summarization.ts:173] [E: packages/agent/src/harness/compaction/branch-summarization.ts:176] [E: packages/agent/src/harness/compaction/branch-summarization.ts:180] [E: packages/agent/src/harness/compaction/branch-summarization.ts:190] [E: packages/agent/src/harness/compaction/branch-summarization.ts:193] [E: packages/agent/src/harness/compaction/branch-summarization.ts:196]。

`generateBranchSummary()` 先从 `model.contextWindow || 128000` 推导 context window,再用 `reserveTokens` 默认值 16384 计算 `tokenBudget`;`prepareBranchEntries(entries, tokenBudget)` 产生待总结 `messages` 和 `fileOps` [E: packages/agent/src/harness/compaction/branch-summarization.ts:199] [E: packages/agent/src/harness/compaction/branch-summarization.ts:203] [E: packages/agent/src/harness/compaction/branch-summarization.ts:204] [E: packages/agent/src/harness/compaction/branch-summarization.ts:205] [E: packages/agent/src/harness/compaction/branch-summarization.ts:207]。如果没有可总结 messages,函数返回 `ok({ summary: "No content to summarize", readFiles: [], modifiedFiles: [] })` [E: packages/agent/src/harness/compaction/branch-summarization.ts:209] [E: packages/agent/src/harness/compaction/branch-summarization.ts:210]。

有可总结 messages 时,函数先 `convertToLlm(messages)`,再 `serializeConversation(llmMessages)`,最后把序列化会话包进 `<conversation>...</conversation>` 并拼上 instructions [E: packages/agent/src/harness/compaction/branch-summarization.ts:212] [E: packages/agent/src/harness/compaction/branch-summarization.ts:213] [E: packages/agent/src/harness/compaction/branch-summarization.ts:222]。instructions 的选择规则是: `replaceInstructions && customInstructions` 时只用 custom instructions;只有 `customInstructions` 时在默认 prompt 后追加 `Additional focus`;否则使用默认 `BRANCH_SUMMARY_PROMPT` [E: packages/agent/src/harness/compaction/branch-summarization.ts:214] [E: packages/agent/src/harness/compaction/branch-summarization.ts:215] [E: packages/agent/src/harness/compaction/branch-summarization.ts:216] [E: packages/agent/src/harness/compaction/branch-summarization.ts:217] [E: packages/agent/src/harness/compaction/branch-summarization.ts:218] [E: packages/agent/src/harness/compaction/branch-summarization.ts:219] [E: packages/agent/src/harness/compaction/branch-summarization.ts:220]。

LLM request 是一条 user message,content 是 `promptText`,timestamp 使用 `Date.now()`;`models.completeSimple()` 使用 `SUMMARIZATION_SYSTEM_PROMPT`、这条 summarization message、调用方传入的 `signal`,并把 `maxTokens` 设为 2048 [E: packages/agent/src/harness/compaction/branch-summarization.ts:224] [E: packages/agent/src/harness/compaction/branch-summarization.ts:226] [E: packages/agent/src/harness/compaction/branch-summarization.ts:227] [E: packages/agent/src/harness/compaction/branch-summarization.ts:228] [E: packages/agent/src/harness/compaction/branch-summarization.ts:231] [E: packages/agent/src/harness/compaction/branch-summarization.ts:233] [E: packages/agent/src/harness/compaction/branch-summarization.ts:234]。

`response.stopReason === "aborted"` 会返回 `BranchSummaryError("aborted", ...)`;`response.stopReason === "error"` 会返回 `BranchSummaryError("summarization_failed", ...)` [E: packages/agent/src/harness/compaction/branch-summarization.ts:236] [E: packages/agent/src/harness/compaction/branch-summarization.ts:237] [E: packages/agent/src/harness/compaction/branch-summarization.ts:239] [E: packages/agent/src/harness/compaction/branch-summarization.ts:241] [E: packages/agent/src/harness/compaction/branch-summarization.ts:242] [E: packages/agent/src/harness/compaction/branch-summarization.ts:243]。成功响应只拼接 text content block,前置 `BRANCH_SUMMARY_PREAMBLE`,再追加 `formatFileOperations(readFiles, modifiedFiles)` 的文件操作段 [E: packages/agent/src/harness/compaction/branch-summarization.ts:248] [E: packages/agent/src/harness/compaction/branch-summarization.ts:249] [E: packages/agent/src/harness/compaction/branch-summarization.ts:250] [E: packages/agent/src/harness/compaction/branch-summarization.ts:251] [E: packages/agent/src/harness/compaction/branch-summarization.ts:252] [E: packages/agent/src/harness/compaction/branch-summarization.ts:253] [E: packages/agent/src/harness/compaction/branch-summarization.ts:254]。

成功路径的返回对象包含 summary 字符串和从 `fileOps` 计算出的 `readFiles`、`modifiedFiles`;若拼接后的 summary 为空,函数使用 `"No summary generated"` 兜底 [E: packages/agent/src/harness/compaction/branch-summarization.ts:253] [E: packages/agent/src/harness/compaction/branch-summarization.ts:256] [E: packages/agent/src/harness/compaction/branch-summarization.ts:257] [E: packages/agent/src/harness/compaction/branch-summarization.ts:258] [E: packages/agent/src/harness/compaction/branch-summarization.ts:259]。

## Compaction 边界

branch summary 与 compaction 共用部分消息化和 token 预算工具:本文件从 `./compaction.ts` 导入 `estimateTokens` 与 `SUMMARIZATION_SYSTEM_PROMPT`,从 `./utils.ts` 导入 file operation、conversation serialization 和 formatting helpers [E: packages/agent/src/harness/compaction/branch-summarization.ts:12] [E: packages/agent/src/harness/compaction/branch-summarization.ts:13] [E: packages/agent/src/harness/compaction/branch-summarization.ts:14] [E: packages/agent/src/harness/compaction/branch-summarization.ts:15] [E: packages/agent/src/harness/compaction/branch-summarization.ts:16] [E: packages/agent/src/harness/compaction/branch-summarization.ts:18] [E: packages/agent/src/harness/compaction/branch-summarization.ts:19]。

branch summary 会把已有 `compaction` entry 作为一种 summary message 纳入 prompt,但不会在本文件里选择 compaction cut point 或生成 `CompactionResult`;`getMessageFromEntry()` 对 `compaction` entry 只调用 `createCompactionSummaryMessage(entry.summary, entry.tokensBefore, entry.timestamp)` [E: packages/agent/src/harness/compaction/branch-summarization.ts:109] [E: packages/agent/src/harness/compaction/branch-summarization.ts:110]。当 token budget 超限时,`prepareBranchEntries()` 对 `compaction` 和 `branch_summary` entry 有同一条保留例外:若当前累计仍小于预算 90%,可以保留该 summary message 再停止扫描 [E: packages/agent/src/harness/compaction/branch-summarization.ts:147] [E: packages/agent/src/harness/compaction/branch-summarization.ts:148] [E: packages/agent/src/harness/compaction/branch-summarization.ts:149] [E: packages/agent/src/harness/compaction/branch-summarization.ts:150] [E: packages/agent/src/harness/compaction/branch-summarization.ts:154]。

本文件在成功路径构造的 branch summary result object 字段是 `summary`、`readFiles` 和 `modifiedFiles`;该 return object 不包含 compaction 专用的 `firstKeptEntryId` 或 `tokensBefore` 输出字段 [E: packages/agent/src/harness/compaction/branch-summarization.ts:256] [E: packages/agent/src/harness/compaction/branch-summarization.ts:257] [E: packages/agent/src/harness/compaction/branch-summarization.ts:258] [E: packages/agent/src/harness/compaction/branch-summarization.ts:259]。

## Gotcha

- `collectEntriesForBranchSummary()` 只收集旧 leaf 到 common ancestor 之间的 abandoned entries;target branch 本身不是 summary input [E: packages/agent/src/harness/compaction/branch-summarization.ts:75] [E: packages/agent/src/harness/compaction/branch-summarization.ts:76] [E: packages/agent/src/harness/compaction/branch-summarization.ts:87] [E: packages/agent/src/harness/compaction/branch-summarization.ts:91]。
- `message` entry 中 `role === "toolResult"` 的消息不会直接进入 branch summary prompt;file operations 仍通过进入 prompt 的消息和已有 branch summary details 提取 [E: packages/agent/src/harness/compaction/branch-summarization.ts:99] [E: packages/agent/src/harness/compaction/branch-summarization.ts:100] [E: packages/agent/src/harness/compaction/branch-summarization.ts:127] [E: packages/agent/src/harness/compaction/branch-summarization.ts:144]。
- `replaceInstructions` 只有在同时存在 `customInstructions` 时才替换默认 prompt;没有 custom instructions 时仍使用 `BRANCH_SUMMARY_PROMPT` [E: packages/agent/src/harness/compaction/branch-summarization.ts:215] [E: packages/agent/src/harness/compaction/branch-summarization.ts:216] [E: packages/agent/src/harness/compaction/branch-summarization.ts:219] [E: packages/agent/src/harness/compaction/branch-summarization.ts:220]。
- hook 生成的已有 branch summary details 不会被复用进新 file operation accumulator,因为复用条件要求 `entry.type === "branch_summary" && !entry.fromHook && entry.details` [E: packages/agent/src/harness/compaction/branch-summarization.ts:128]。

## 跨包边界

更大的 compaction/branch navigation flow 不在本 source 内展开;本节点只覆盖 `branch-summarization.ts` 的 collection、preparation 和 model generation helper [E: packages/agent/src/harness/compaction/branch-summarization.ts:67] [E: packages/agent/src/harness/compaction/branch-summarization.ts:123] [E: packages/agent/src/harness/compaction/branch-summarization.ts:199]。

context compaction 的 threshold、cut point 和 `CompactionResult` 不是本文件成功路径返回的 branch summary result object;本节点只说明 branch summary 如何消费已有 `compaction` entry 和共用 summarization prompt/tooling [E: packages/agent/src/harness/compaction/branch-summarization.ts:12] [E: packages/agent/src/harness/compaction/branch-summarization.ts:109] [E: packages/agent/src/harness/compaction/branch-summarization.ts:110] [E: packages/agent/src/harness/compaction/branch-summarization.ts:147] [E: packages/agent/src/harness/compaction/branch-summarization.ts:148] [E: packages/agent/src/harness/compaction/branch-summarization.ts:256] [E: packages/agent/src/harness/compaction/branch-summarization.ts:259]。

## Sources

- packages/agent/src/harness/compaction/branch-summarization.ts

## 相关

- [spine.compaction-flow](../../spine/compaction-flow.md): context compaction 与 branch summary 的整体 flow。
- [subsys.agent-core.compaction](compaction.md): compaction threshold、cut point、summary generation 和 `CompactionResult`。
