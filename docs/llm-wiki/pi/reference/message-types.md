---
id: ref.agent.message-types
title: 消息类型目录
kind: catalog
tier: T3
pkg: agent
source:
 - packages/agent/src/types.ts
 - packages/coding-agent/src/core/messages.ts
 - packages/coding-agent/src/core/session-manager.ts
symbols:
 - CustomAgentMessages
 - AgentMessage
 - convertToLlm
 - BashExecutionMessage
 - CustomMessage
 - BranchSummaryMessage
 - CompactionSummaryMessage
 - SessionEntry
related:
 - subsys.agent-core.message-model
 - ref.coding-agent.session-format
 - subsys.coding-agent.session-manager
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.agent.message-types` 是 `AgentMessage` 相关类型目录:agent-core 的 `AgentMessage` 只等于 `Message | CustomAgentMessages[keyof CustomAgentMessages]`;core 不再注入 `bashExecution` / `branchSummary` 等 harness custom roles。产品层 custom `AgentMessage` 由 coding-agent `messages.ts` declaration merging 提供,持久化形态是 coding-agent `SessionEntry`。

## 能回答的问题

- agent-core 的 `AgentMessage` 现在包含哪些成员,`CustomAgentMessages` 默认有没有字段?
- `convertToLlm` 在 agent-core 里是类型还是实现?
- coding-agent 通过 declaration merging 注入了哪些 custom `AgentMessage` role,default `convertToLlm` 如何把它们变成 LLM `Message`?
- 哪些产品 custom 内容是 `SessionEntry` 而不是 `SessionMessageEntry.message`?
- `appendMessage()` 允许写入哪些 custom role,哪些必须走独立 session entry API?

## 覆盖摘要

agent-core 导出的消息 union 只有 `CustomAgentMessages` 与 `AgentMessage`。[E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374] `CustomAgentMessages` 默认是空接口;`AgentMessage` 是 imported `Message` 与 `CustomAgentMessages[keyof CustomAgentMessages]` 的并集。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374] `packages/agent/src/harness/messages.ts` 已删除,agent-core 不再导出 `BashExecutionMessage`、`BranchSummaryMessage` 或 default converter。[I]

coding-agent 在 `packages/coding-agent/src/core/messages.ts` 里对 `@earendil-works/pi-agent-core` 做 declaration merging,注入 `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 四个 custom role,并实现产品 `convertToLlm()`。[E: packages/coding-agent/src/core/messages.ts:70] [E: packages/coding-agent/src/core/messages.ts:71] [E: packages/coding-agent/src/core/messages.ts:72] [E: packages/coding-agent/src/core/messages.ts:73] [E: packages/coding-agent/src/core/messages.ts:74] [E: packages/coding-agent/src/core/messages.ts:75] [E: packages/coding-agent/src/core/messages.ts:148] 这些 custom 内容进入磁盘时,branch/compaction 是独立 `SessionEntry`;`bashExecution` / `custom` 可以进 `type: "message"`。[E: packages/coding-agent/src/core/session-manager.ts:64] [E: packages/coding-agent/src/core/session-manager.ts:91] [E: packages/coding-agent/src/core/session-manager.ts:106] [E: packages/coding-agent/src/core/session-manager.ts:1204]

## Agent-core Union

| 类型 / variant | 字段 / 签名 | 默认 / 可选 | 含义 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `CustomAgentMessages` | empty interface | 默认无字段;apps 可通过 declaration merging 添加 key | custom app message 的扩展槽。[E: packages/agent/src/types.ts:365] | `AgentMessage` 用 `CustomAgentMessages[keyof CustomAgentMessages]` 读取扩展值,让 app 在不改 core union 的情况下加入自定义消息。[E: packages/agent/src/types.ts:374] | `packages/agent/src/types.ts` |
| `AgentMessage` | `Message \| CustomAgentMessages[keyof CustomAgentMessages]` | 标准侧来自 imported `Message`;custom 侧来自 declaration merging | agent-core transcript 的顶层 message union。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:374] | 同一个 transcript 既能保留 provider-visible LLM messages,又能携带 app-only 或需转换的 custom messages。[E: packages/agent/src/types.ts:374] | `packages/agent/src/types.ts` |
| standard `system` | `Message` union 的 `role: "system"` 分支 | 本节点不展开字段;字段级定义归 `ref.ai.core-types` | `AgentState.systemPrompt` 从 transcript 的 system messages replay;只读,改 prompt 必须 append 带 `content` 或 `sections` 的 system message。[E: packages/agent/src/types.ts:389] | system messages 也是 `AgentMessage`,会出现在 `AgentState.messages` 与 `message_start` 等事件里。[E: packages/agent/src/types.ts:407] [E: packages/agent/src/types.ts:522] | `packages/agent/src/types.ts` |
| standard `user` | `Message` union 的 `role: "user"` 分支 | 本节点不展开字段 | 标准用户消息,属于 imported `Message`。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:374] | 与 assistant / toolResult 一起构成未扩展时的 `AgentMessage`。[E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374] | `packages/agent/src/types.ts` |
| standard `assistant` | `Message` union 的 `role: "assistant"` 分支 | 本节点不展开字段 | 标准助手消息。streaming 增量另由 `AssistantMessageEvent` 承载,不是新的 `AgentMessage.role`。[E: packages/agent/src/types.ts:3] [E: packages/agent/src/types.ts:524] | `AgentState.streamingMessage` 也是 `AgentMessage`。[E: packages/agent/src/types.ts:416] | `packages/agent/src/types.ts` |
| standard `toolResult` | `Message` union 的 `role: "toolResult"` 分支 | 本节点不展开字段 | 标准工具结果。turn context 把 tool results typed as `ToolResultMessage[]`。[E: packages/agent/src/types.ts:13] [E: packages/agent/src/types.ts:139] | `AfterToolCallResult.usage` 可覆盖 tool result usage。[E: packages/agent/src/types.ts:98] | `packages/agent/src/types.ts` |

`AgentLoopConfig.convertToLlm` 是 core config 里的正式转换边界:签名把 `AgentMessage[]` 映射为 `Message[] | Promise<Message[]>`。契约是不得 throw/reject,无法转换的 custom message 应过滤。[E: packages/agent/src/types.ts:222] agent-core **不**再提供 harness default converter;产品实现在 coding-agent `convertToLlm()`。[E: packages/coding-agent/src/core/messages.ts:148] [I]

`AgentLoopConfig.transformContext`、`getSteeringMessages`、`getFollowUpMessages` 都以 `AgentMessage[]` 为输入或输出,所以 custom messages 可以先在 transcript 层参与上下文管理,再经 `convertToLlm` 降级或过滤。[E: packages/agent/src/types.ts:244] [E: packages/agent/src/types.ts:293] [E: packages/agent/src/types.ts:306] [I]

`AgentState.messages` 和 `AgentContext.messages` 都保存 `AgentMessage[]`;`AgentState.streamingMessage`、`AgentEvent.agent_end.messages`、`AgentEvent.turn_end.message`、`message_start/message_update/message_end.message` 也使用 `AgentMessage`。[E: packages/agent/src/types.ts:407] [E: packages/agent/src/types.ts:408] [E: packages/agent/src/types.ts:416] [E: packages/agent/src/types.ts:502] [E: packages/agent/src/types.ts:517] [E: packages/agent/src/types.ts:520] [E: packages/agent/src/types.ts:522] [E: packages/agent/src/types.ts:524] [E: packages/agent/src/types.ts:525]

## Coding-agent Custom AgentMessage Roles

coding-agent 通过 `declare module "@earendil-works/pi-agent-core"` 扩展 `CustomAgentMessages`。[E: packages/coding-agent/src/core/messages.ts:70] [E: packages/coding-agent/src/core/messages.ts:71] 未做 merging 时 `keyof CustomAgentMessages` 不增加成员,`AgentMessage` 就是 `Message`。[E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374] [I]

| role / 类型 | 字段 | 默认 / 可选 | LLM 转换 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `bashExecution` / `BashExecutionMessage` | `role: "bashExecution"`, `command`, `output`, `exitCode`, `cancelled`, `truncated`, `fullOutputPath?`, `timestamp`, `excludeFromContext?`。[E: packages/coding-agent/src/core/messages.ts:29] [E: packages/coding-agent/src/core/messages.ts:30] [E: packages/coding-agent/src/core/messages.ts:31] [E: packages/coding-agent/src/core/messages.ts:32] [E: packages/coding-agent/src/core/messages.ts:33] [E: packages/coding-agent/src/core/messages.ts:34] [E: packages/coding-agent/src/core/messages.ts:35] [E: packages/coding-agent/src/core/messages.ts:36] [E: packages/coding-agent/src/core/messages.ts:37] [E: packages/coding-agent/src/core/messages.ts:39] | `exitCode` 可为 `undefined`;`fullOutputPath`、`excludeFromContext` 可选。[E: packages/coding-agent/src/core/messages.ts:33] [E: packages/coding-agent/src/core/messages.ts:36] [E: packages/coding-agent/src/core/messages.ts:39] | `excludeFromContext` 为 true 时过滤;否则转成 `role: "user"`,content 为 `bashExecutionToText(m)` 的 text block。[E: packages/coding-agent/src/core/messages.ts:152] [E: packages/coding-agent/src/core/messages.ts:154] [E: packages/coding-agent/src/core/messages.ts:157] [E: packages/coding-agent/src/core/messages.ts:159] | 保存 `!` 命令的 shell transcript,并在需要时把 command/output/exit 状态变成模型可见文本。[E: packages/coding-agent/src/core/messages.ts:29] [E: packages/coding-agent/src/core/messages.ts:82] | `packages/coding-agent/src/core/messages.ts` |
| `custom` / `CustomMessage<T = unknown>` | `role: "custom"`, `customType`, `content`, `display`, `details?`, `timestamp`。[E: packages/coding-agent/src/core/messages.ts:46] [E: packages/coding-agent/src/core/messages.ts:47] [E: packages/coding-agent/src/core/messages.ts:48] [E: packages/coding-agent/src/core/messages.ts:49] [E: packages/coding-agent/src/core/messages.ts:50] [E: packages/coding-agent/src/core/messages.ts:51] [E: packages/coding-agent/src/core/messages.ts:52] | generic `T` 默认为 `unknown`;`details` 可选;`content` 可为 string 或 text/image content array。[E: packages/coding-agent/src/core/messages.ts:46] [E: packages/coding-agent/src/core/messages.ts:49] [E: packages/coding-agent/src/core/messages.ts:51] | string content 会包成 single text block;content array 原样作为 user content;最终转成 `role: "user"`。[E: packages/coding-agent/src/core/messages.ts:163] [E: packages/coding-agent/src/core/messages.ts:164] [E: packages/coding-agent/src/core/messages.ts:165] | extension `sendMessage()` / `custom_message` entry 的通用 envelope。[E: packages/coding-agent/src/core/messages.ts:46] [E: packages/coding-agent/src/core/session-manager.ts:159] | `packages/coding-agent/src/core/messages.ts` |
| `branchSummary` / `BranchSummaryMessage` | `role: "branchSummary"`, `summary`, `fromId`, `timestamp`。[E: packages/coding-agent/src/core/messages.ts:55] [E: packages/coding-agent/src/core/messages.ts:56] [E: packages/coding-agent/src/core/messages.ts:57] [E: packages/coding-agent/src/core/messages.ts:58] [E: packages/coding-agent/src/core/messages.ts:59] | `fromId` 类型是 `string \| null`。[E: packages/coding-agent/src/core/messages.ts:58] | 转成 `role: "user"`;text 为 `BRANCH_SUMMARY_PREFIX + summary + BRANCH_SUMMARY_SUFFIX`。[E: packages/coding-agent/src/core/messages.ts:170] [E: packages/coding-agent/src/core/messages.ts:173] | 从另一个 conversation branch 返回时注入的 summary。[E: packages/coding-agent/src/core/messages.ts:19] [E: packages/coding-agent/src/core/session-manager.ts:106] | `packages/coding-agent/src/core/messages.ts` |
| `compactionSummary` / `CompactionSummaryMessage` | `role: "compactionSummary"`, `summary`, `tokensBefore`, `timestamp`。[E: packages/coding-agent/src/core/messages.ts:62] [E: packages/coding-agent/src/core/messages.ts:63] [E: packages/coding-agent/src/core/messages.ts:64] [E: packages/coding-agent/src/core/messages.ts:65] [E: packages/coding-agent/src/core/messages.ts:66] | 无可选字段 | 转成 `role: "user"`;text 为 `COMPACTION_SUMMARY_PREFIX + summary + COMPACTION_SUMMARY_SUFFIX`。[E: packages/coding-agent/src/core/messages.ts:176] [E: packages/coding-agent/src/core/messages.ts:180] | conversation history 被压缩后的 summary,并记录压缩前 token 数。[E: packages/coding-agent/src/core/messages.ts:11] [E: packages/coding-agent/src/core/session-manager.ts:91] | `packages/coding-agent/src/core/messages.ts` |

产品 `convertToLlm(messages)` 对每个 `AgentMessage` switch by role,映射成 `Message | undefined`,最后过滤 `undefined`。`system` / `user` / `assistant` / `toolResult` 直接 pass through;`default` 分支在 exhaustive check 后返回 `undefined`。[E: packages/coding-agent/src/core/messages.ts:148] [E: packages/coding-agent/src/core/messages.ts:149] [E: packages/coding-agent/src/core/messages.ts:150] [E: packages/coding-agent/src/core/messages.ts:184] [E: packages/coding-agent/src/core/messages.ts:185] [E: packages/coding-agent/src/core/messages.ts:186] [E: packages/coding-agent/src/core/messages.ts:187] [E: packages/coding-agent/src/core/messages.ts:188] [E: packages/coding-agent/src/core/messages.ts:191] [E: packages/coding-agent/src/core/messages.ts:195]

`bashExecutionToText(msg)` 输出 `Ran \`command\``、stdout 文本或 `(no output)`,并追加 cancelled、非零 exit code、truncated full output path。[E: packages/coding-agent/src/core/messages.ts:82] [E: packages/coding-agent/src/core/messages.ts:83] [E: packages/coding-agent/src/core/messages.ts:84] [E: packages/coding-agent/src/core/messages.ts:87] [E: packages/coding-agent/src/core/messages.ts:89] [E: packages/coding-agent/src/core/messages.ts:92] [E: packages/coding-agent/src/core/messages.ts:94]

## Product Session Entries

产品 JSONL 把部分 custom 内容做成独立 tree entry,而不是 `SessionMessageEntry.message`。完整字段目录见 [ref.coding-agent.session-format](session-format.md);本表只列与 `AgentMessage` 投影相关的 entry。

| SessionEntry | Discriminator / 关键字段 | 如何变成 `AgentMessage` | 写入入口 | 源 path |
| --- | --- | --- | --- | --- |
| `SessionMessageEntry` | `type: "message"`; `message: AgentMessage`。[E: packages/coding-agent/src/core/session-manager.ts:64] [E: packages/coding-agent/src/core/session-manager.ts:66] | `sessionEntryToContextMessages()` 直接返回 `entry.message`(缺 content 时补 `""` / `[]`)。[E: packages/coding-agent/src/core/session-manager.ts:440] [E: packages/coding-agent/src/core/session-manager.ts:444] [E: packages/coding-agent/src/core/session-manager.ts:451] | `appendMessage(message)` 接受 `Message \| CustomMessage \| BashExecutionMessage`,不允许直接写入 compaction/branch summary message。[E: packages/coding-agent/src/core/session-manager.ts:1204] | `packages/coding-agent/src/core/session-manager.ts` |
| `CustomMessageEntry<T>` | `type: "custom_message"`; `customType`; `content`; `details?`; `display`。[E: packages/coding-agent/src/core/session-manager.ts:159] [E: packages/coding-agent/src/core/session-manager.ts:160] [E: packages/coding-agent/src/core/session-manager.ts:161] [E: packages/coding-agent/src/core/session-manager.ts:162] [E: packages/coding-agent/src/core/session-manager.ts:163] [E: packages/coding-agent/src/core/session-manager.ts:164] | 调用 `createCustomMessage(...)` 得到 `role: "custom"`。[E: packages/coding-agent/src/core/session-manager.ts:453] [E: packages/coding-agent/src/core/session-manager.ts:455] | `appendCustomMessageEntry`。[E: packages/coding-agent/src/core/session-manager.ts:159] | `packages/coding-agent/src/core/session-manager.ts` |
| `BranchSummaryEntry<T>` | `type: "branch_summary"`; `fromId`; `summary`; `details?`; `usage?`; `fromHook?`。[E: packages/coding-agent/src/core/session-manager.ts:106] [E: packages/coding-agent/src/core/session-manager.ts:107] [E: packages/coding-agent/src/core/session-manager.ts:108] [E: packages/coding-agent/src/core/session-manager.ts:109] [E: packages/coding-agent/src/core/session-manager.ts:111] [E: packages/coding-agent/src/core/session-manager.ts:113] [E: packages/coding-agent/src/core/session-manager.ts:115] | 有 `summary` 时调用 `createBranchSummaryMessage`。[E: packages/coding-agent/src/core/session-manager.ts:458] [E: packages/coding-agent/src/core/session-manager.ts:459] | `branchWithSummary(...)`。[E: packages/coding-agent/src/core/session-manager.ts:1600] | `packages/coding-agent/src/core/session-manager.ts` |
| `CompactionEntry<T>` | `type: "compaction"`; `summary`; `firstKeptEntryId`; `tokensBefore`; `details?`; `usage?`; `fromHook?`; `systemMessage?`。[E: packages/coding-agent/src/core/session-manager.ts:91] [E: packages/coding-agent/src/core/session-manager.ts:92] [E: packages/coding-agent/src/core/session-manager.ts:93] [E: packages/coding-agent/src/core/session-manager.ts:94] [E: packages/coding-agent/src/core/session-manager.ts:95] [E: packages/coding-agent/src/core/session-manager.ts:97] [E: packages/coding-agent/src/core/session-manager.ts:99] [E: packages/coding-agent/src/core/session-manager.ts:101] [E: packages/coding-agent/src/core/session-manager.ts:103] | `createCompactionSummaryMessage`;若有 `systemMessage` 则先放 system message 再放 summary。[E: packages/coding-agent/src/core/session-manager.ts:461] [E: packages/coding-agent/src/core/session-manager.ts:462] [E: packages/coding-agent/src/core/session-manager.ts:463] | `appendCompaction(...)`。[E: packages/coding-agent/src/core/session-manager.ts:1261] | `packages/coding-agent/src/core/session-manager.ts` |
| `CustomEntry<T>` | `type: "custom"`; `customType`; `data?`。[E: packages/coding-agent/src/core/session-manager.ts:128] [E: packages/coding-agent/src/core/session-manager.ts:129] [E: packages/coding-agent/src/core/session-manager.ts:130] [E: packages/coding-agent/src/core/session-manager.ts:131] | `sessionEntryToContextMessages()` 对非上述类型返回 `[]`,因此 `custom` 不进 LLM context。[E: packages/coding-agent/src/core/session-manager.ts:128] [E: packages/coding-agent/src/core/session-manager.ts:465] | `appendCustomEntry`。[E: packages/coding-agent/src/core/session-manager.ts:1290] | `packages/coding-agent/src/core/session-manager.ts` |
| `UsageEntry` | `type: "usage"`; `kind`; `provider`; `model`; `usage`; `note?`。[E: packages/coding-agent/src/core/session-manager.ts:80] [E: packages/coding-agent/src/core/session-manager.ts:81] [E: packages/coding-agent/src/core/session-manager.ts:83] [E: packages/coding-agent/src/core/session-manager.ts:84] [E: packages/coding-agent/src/core/session-manager.ts:85] [E: packages/coding-agent/src/core/session-manager.ts:86] [E: packages/coding-agent/src/core/session-manager.ts:88] | 同样走 `return []`,不进 LLM context。[E: packages/coding-agent/src/core/session-manager.ts:465] | `appendUsage(...)`。[E: packages/coding-agent/src/core/session-manager.ts:1244] | `packages/coding-agent/src/core/session-manager.ts` |

`SessionEntry` union 还有 `thinking_level_change`、`model_change`、`context_edit`、`label`、`session_info`;它们也不是 LLM message variant,字段级目录归 session-format。[E: packages/coding-agent/src/core/session-manager.ts:183] [I]

## 边界与 Gotcha

- agent-core 没有 `bashExecution` / `custom` / `branchSummary` / `compactionSummary` 类型定义。那些 role 只在 coding-agent 对 `CustomAgentMessages` 做 merging 之后进入 `AgentMessage`。[E: packages/agent/src/types.ts:365] [E: packages/coding-agent/src/core/messages.ts:71] [I]
- `appendMessage()` 明确不接受 compaction/branch summary message,要求走 `appendCompaction()` / `branchWithSummary()`,以便它们作为 top-level session entry 可被查找。[E: packages/coding-agent/src/core/session-manager.ts:1204]
- `CustomEntry` (`type: "custom"`) 与 `CustomMessage` (`role: "custom"`) 不是同一层:`CustomEntry` 是 session 持久化状态;`CustomMessage` 是 transcript message,通常来自 `custom_message` entry 或 `appendMessage`。[E: packages/coding-agent/src/core/session-manager.ts:128] [E: packages/coding-agent/src/core/messages.ts:47] [I]
- 标准 `user` / `assistant` / `toolResult` / `system` 的字段级定义来自 `@earendil-works/pi-ai` 的 `Message` union;本节点只覆盖 agent-core 可核到的 union 引用,以及 coding-agent custom variant 与 session 投影。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:374] [I]

## Sources

- packages/agent/src/types.ts
- packages/coding-agent/src/core/messages.ts
- packages/coding-agent/src/core/session-manager.ts

## 相关

- [subsys.agent-core.message-model](../subsystems/agent-core/message-model.md) - `AgentMessage`、`AgentState`、空的 `CustomAgentMessages` 在 agent-core types 中的结构边界。
- [ref.coding-agent.session-format](session-format.md) - 产品 JSONL v3 的完整 `SessionEntry` 字段目录。
- [subsys.coding-agent.session-manager](../subsystems/coding-agent/session-manager.md) - `SessionManager` 如何 append / 投影这些 entry。
