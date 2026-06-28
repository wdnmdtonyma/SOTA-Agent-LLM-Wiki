---
id: ref.agent.message-types
title: 消息类型目录
kind: catalog
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/harness/messages.ts
symbols:
  - CustomAgentMessages
  - AgentMessage
  - BashExecutionMessage
  - CustomMessage
  - BranchSummaryMessage
  - CompactionSummaryMessage
  - COMPACTION_SUMMARY_PREFIX
  - COMPACTION_SUMMARY_SUFFIX
  - BRANCH_SUMMARY_PREFIX
  - BRANCH_SUMMARY_SUFFIX
  - bashExecutionToText
  - createBranchSummaryMessage
  - createCompactionSummaryMessage
  - createCustomMessage
  - convertToLlm
related:
  - subsys.agent-core.message-model
evidence: explicit
status: verified
updated: 5a073885
---

> `ref.agent.message-types` 是 `AgentMessage` 相关类型与 variant 的目录:覆盖 agent-core 的 `AgentMessage` union、可扩展 `CustomAgentMessages` 接口、harness 默认注入的 4 个 custom message role,以及这些 role 进入 LLM `Message[]` 的默认转换边界。

## 能回答的问题

- `AgentMessage` 在本 source 范围内包含哪些 harness custom role,default converter 又显式 pass-through 哪些标准 LLM role?
- `CustomAgentMessages` 为什么默认为空,又怎样被 `harness/messages.ts` 扩展?
- `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 每个 message variant 有哪些字段?
- default `convertToLlm(messages)` 怎样处理每个 `AgentMessage.role`?
- 哪些 AgentMessage 相关 exported 类型只承载 agent-core 状态或事件,不是新的 message variant?

## 覆盖摘要

本目录覆盖 6 个 agent-core/harness exported message 类型: `CustomAgentMessages`、`AgentMessage`、`BashExecutionMessage`、`CustomMessage<T>`、`BranchSummaryMessage`、`CompactionSummaryMessage`。[E: packages/agent/src/types.ts:305][E: packages/agent/src/types.ts:314][E: packages/agent/src/harness/messages.ts:19][E: packages/agent/src/harness/messages.ts:31][E: packages/agent/src/harness/messages.ts:40][E: packages/agent/src/harness/messages.ts:47] 同时覆盖 `harness/messages.ts` 导出的 9 个 message helper/constant:4 个 summary boundary constants、`bashExecutionToText`、3 个 `create*Message` constructor、`convertToLlm`。[E: packages/agent/src/harness/messages.ts:4][E: packages/agent/src/harness/messages.ts:9][E: packages/agent/src/harness/messages.ts:12][E: packages/agent/src/harness/messages.ts:17][E: packages/agent/src/harness/messages.ts:63][E: packages/agent/src/harness/messages.ts:81][E: packages/agent/src/harness/messages.ts:90][E: packages/agent/src/harness/messages.ts:103][E: packages/agent/src/harness/messages.ts:120]

`AgentMessage` 在本 source 范围内的 custom variant 由 harness module augmentation 注入 4 个 role:`bashExecution`、`custom`、`branchSummary`、`compactionSummary`;default `convertToLlm` 另显式 pass-through `Message` 侧的 `user`、`assistant`、`toolResult` 三个 role。[E: packages/agent/src/types.ts:8][E: packages/agent/src/types.ts:314][E: packages/agent/src/harness/messages.ts:54][E: packages/agent/src/harness/messages.ts:56][E: packages/agent/src/harness/messages.ts:57][E: packages/agent/src/harness/messages.ts:58][E: packages/agent/src/harness/messages.ts:59][E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:156][E: packages/agent/src/harness/messages.ts:157]

## AgentMessage Union

| 类型 / variant | 字段 / 签名 | 默认 / 可选 | 含义 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `CustomAgentMessages` | empty interface | 默认无字段;apps 可通过 declaration merging 添加 key | custom app message 的扩展槽;接口本身声明为 `CustomAgentMessages`。[E: packages/agent/src/types.ts:305] | `AgentMessage` 用 `CustomAgentMessages[keyof CustomAgentMessages]` 读取扩展值,让 app 在不改 core union 的情况下加入自定义消息。[E: packages/agent/src/types.ts:314] | `packages/agent/src/types.ts` |
| `AgentMessage` | `Message \| CustomAgentMessages[keyof CustomAgentMessages]` | 标准侧来自 imported `Message`;custom 侧来自 declaration merging | agent-core transcript 的顶层 message union。[E: packages/agent/src/types.ts:8][E: packages/agent/src/types.ts:314] | 同一个 transcript 既能保留 provider-visible LLM messages,又能携带 UI/harness-only 或需转换的 custom messages。[E: packages/agent/src/types.ts:314] | `packages/agent/src/types.ts` |
| standard `user` | `Message` union 的 `role: "user"` 分支 | 本节点不展开字段;字段级定义归 `ref.ai.core-types` | default converter 对 `user` 直接 pass through。[E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:158] | `convertToLlm` 的返回类型是 LLM-compatible `Message[]`,该分支直接返回 `m`。[E: packages/agent/src/types.ts:169][E: packages/agent/src/harness/messages.ts:158] | `packages/agent/src/types.ts`, `packages/agent/src/harness/messages.ts` |
| standard `assistant` | `Message` union 的 `role: "assistant"` 分支 | 本节点不展开字段;字段级定义归 `ref.ai.core-types` | default converter 对 `assistant` 直接 pass through。[E: packages/agent/src/harness/messages.ts:156][E: packages/agent/src/harness/messages.ts:158] | `convertToLlm` 的返回类型是 `Message[]`;streaming update 的增量事件另由 `AssistantMessageEvent` 字段承载,不是新的 `AgentMessage.role`。[E: packages/agent/src/types.ts:3][E: packages/agent/src/types.ts:169][E: packages/agent/src/types.ts:423] | `packages/agent/src/types.ts`, `packages/agent/src/harness/messages.ts` |
| standard `toolResult` | `Message` union 的 `role: "toolResult"` 分支 | 本节点不展开字段;字段级定义归 `ref.ai.core-types` | default converter 对 `toolResult` 直接 pass through。[E: packages/agent/src/harness/messages.ts:157][E: packages/agent/src/harness/messages.ts:158] | `convertToLlm` 的返回类型是 `Message[]`;turn context 也把 tool results typed as `ToolResultMessage[]`。[E: packages/agent/src/types.ts:13][E: packages/agent/src/types.ts:121][E: packages/agent/src/types.ts:169] | `packages/agent/src/types.ts`, `packages/agent/src/harness/messages.ts` |

## Harness Custom Variants

| role / 类型 | 字段 | 默认 / 可选 | LLM 转换 | 为什么存在 | 源 path |
| --- | --- | --- | --- | --- | --- |
| `bashExecution` / `BashExecutionMessage` | `role: "bashExecution"`, `command`, `output`, `exitCode`, `cancelled`, `truncated`, `fullOutputPath?`, `timestamp`, `excludeFromContext?`。[E: packages/agent/src/harness/messages.ts:19][E: packages/agent/src/harness/messages.ts:20][E: packages/agent/src/harness/messages.ts:21][E: packages/agent/src/harness/messages.ts:22][E: packages/agent/src/harness/messages.ts:23][E: packages/agent/src/harness/messages.ts:24][E: packages/agent/src/harness/messages.ts:25][E: packages/agent/src/harness/messages.ts:26][E: packages/agent/src/harness/messages.ts:27][E: packages/agent/src/harness/messages.ts:28] | `exitCode` 可为 `undefined`;`fullOutputPath`、`excludeFromContext` 可选。[E: packages/agent/src/harness/messages.ts:23][E: packages/agent/src/harness/messages.ts:26][E: packages/agent/src/harness/messages.ts:28] | `excludeFromContext` 为 true 时过滤;否则转成 `role: "user"` 且 content 为 `bashExecutionToText(m)` 的 text block。[E: packages/agent/src/harness/messages.ts:124][E: packages/agent/src/harness/messages.ts:125][E: packages/agent/src/harness/messages.ts:126][E: packages/agent/src/harness/messages.ts:128][E: packages/agent/src/harness/messages.ts:129][E: packages/agent/src/harness/messages.ts:130] | 让 harness 保存 shell execution transcript,并在需要时把 command/output/exit 状态变成模型可见文本。[E: packages/agent/src/harness/messages.ts:63][E: packages/agent/src/harness/messages.ts:64][E: packages/agent/src/harness/messages.ts:65][E: packages/agent/src/harness/messages.ts:70][E: packages/agent/src/harness/messages.ts:72][E: packages/agent/src/harness/messages.ts:75] | `packages/agent/src/harness/messages.ts` |
| `custom` / `CustomMessage<T = unknown>` | `role: "custom"`, `customType`, `content`, `display`, `details?`, `timestamp`。[E: packages/agent/src/harness/messages.ts:31][E: packages/agent/src/harness/messages.ts:32][E: packages/agent/src/harness/messages.ts:33][E: packages/agent/src/harness/messages.ts:34][E: packages/agent/src/harness/messages.ts:35][E: packages/agent/src/harness/messages.ts:36][E: packages/agent/src/harness/messages.ts:37] | generic `T` 默认为 `unknown`;`details` 可选;`content` 可为 string 或 text/image content array。[E: packages/agent/src/harness/messages.ts:31][E: packages/agent/src/harness/messages.ts:34][E: packages/agent/src/harness/messages.ts:36] | string content 会包成 single text block;content array 原样作为 user content;最终转成 `role: "user"`。[E: packages/agent/src/harness/messages.ts:133][E: packages/agent/src/harness/messages.ts:134][E: packages/agent/src/harness/messages.ts:135][E: packages/agent/src/harness/messages.ts:136][E: packages/agent/src/harness/messages.ts:137] | 提供通用 app-defined message envelope,既能控制 UI display,也能携带 structured `details`。[E: packages/agent/src/harness/messages.ts:33][E: packages/agent/src/harness/messages.ts:35][E: packages/agent/src/harness/messages.ts:36] | `packages/agent/src/harness/messages.ts` |
| `branchSummary` / `BranchSummaryMessage` | `role: "branchSummary"`, `summary`, `fromId`, `timestamp`。[E: packages/agent/src/harness/messages.ts:40][E: packages/agent/src/harness/messages.ts:41][E: packages/agent/src/harness/messages.ts:42][E: packages/agent/src/harness/messages.ts:43][E: packages/agent/src/harness/messages.ts:44] | 无可选字段 | 转成 `role: "user"`;text 为 `BRANCH_SUMMARY_PREFIX + summary + BRANCH_SUMMARY_SUFFIX`。[E: packages/agent/src/harness/messages.ts:141][E: packages/agent/src/harness/messages.ts:142][E: packages/agent/src/harness/messages.ts:143][E: packages/agent/src/harness/messages.ts:144][E: packages/agent/src/harness/messages.ts:145] | 表示从另一个 conversation branch 返回时注入的 branch summary,并保留来源 branch id。[E: packages/agent/src/harness/messages.ts:12][E: packages/agent/src/harness/messages.ts:17][E: packages/agent/src/harness/messages.ts:42][E: packages/agent/src/harness/messages.ts:43] | `packages/agent/src/harness/messages.ts` |
| `compactionSummary` / `CompactionSummaryMessage` | `role: "compactionSummary"`, `summary`, `tokensBefore`, `timestamp`。[E: packages/agent/src/harness/messages.ts:47][E: packages/agent/src/harness/messages.ts:48][E: packages/agent/src/harness/messages.ts:49][E: packages/agent/src/harness/messages.ts:50][E: packages/agent/src/harness/messages.ts:51] | 无可选字段 | 转成 `role: "user"`;text 为 `COMPACTION_SUMMARY_PREFIX + summary + COMPACTION_SUMMARY_SUFFIX`。[E: packages/agent/src/harness/messages.ts:147][E: packages/agent/src/harness/messages.ts:148][E: packages/agent/src/harness/messages.ts:149][E: packages/agent/src/harness/messages.ts:150][E: packages/agent/src/harness/messages.ts:151][E: packages/agent/src/harness/messages.ts:153] | 表示 conversation history 被压缩后的 summary,并记录压缩前 token 数。[E: packages/agent/src/harness/messages.ts:4][E: packages/agent/src/harness/messages.ts:10][E: packages/agent/src/harness/messages.ts:49][E: packages/agent/src/harness/messages.ts:50] | `packages/agent/src/harness/messages.ts` |

## Declaration Merging

`harness/messages.ts` 通过 `declare module "../types.ts"` 扩展 `CustomAgentMessages`,逐 key 注入 `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 四个 custom message type。[E: packages/agent/src/harness/messages.ts:54][E: packages/agent/src/harness/messages.ts:55][E: packages/agent/src/harness/messages.ts:56][E: packages/agent/src/harness/messages.ts:57][E: packages/agent/src/harness/messages.ts:58][E: packages/agent/src/harness/messages.ts:59]

因为 `AgentMessage` 读取的是 `CustomAgentMessages[keyof CustomAgentMessages]`,module augmentation 会把这四个 harness interfaces 纳入 `AgentMessage` union。[E: packages/agent/src/types.ts:305][E: packages/agent/src/types.ts:314][E: packages/agent/src/harness/messages.ts:54][I]

## Constructors And Conversion Helpers

| 导出 | 签名 / 字段 | 行为 | 源 path |
| --- | --- | --- | --- |
| `COMPACTION_SUMMARY_PREFIX` / `COMPACTION_SUMMARY_SUFFIX` | string constants | 包裹 compaction summary 的 `<summary>` 文本边界。[E: packages/agent/src/harness/messages.ts:4][E: packages/agent/src/harness/messages.ts:9][E: packages/agent/src/harness/messages.ts:10] | `packages/agent/src/harness/messages.ts` |
| `BRANCH_SUMMARY_PREFIX` / `BRANCH_SUMMARY_SUFFIX` | string constants | 包裹 branch summary 的 `<summary>` 文本边界。[E: packages/agent/src/harness/messages.ts:12][E: packages/agent/src/harness/messages.ts:17] | `packages/agent/src/harness/messages.ts` |
| `bashExecutionToText(msg)` | `(BashExecutionMessage) => string` | 输出 `Ran \`command\``、stdout/stderr 文本或 `(no output)`,并追加 cancelled、非零 exit code、truncated full output path 等状态文本。[E: packages/agent/src/harness/messages.ts:63][E: packages/agent/src/harness/messages.ts:64][E: packages/agent/src/harness/messages.ts:65][E: packages/agent/src/harness/messages.ts:68][E: packages/agent/src/harness/messages.ts:70][E: packages/agent/src/harness/messages.ts:72][E: packages/agent/src/harness/messages.ts:75][E: packages/agent/src/harness/messages.ts:78] | `packages/agent/src/harness/messages.ts` |
| `createBranchSummaryMessage(summary, fromId, timestamp)` | returns `BranchSummaryMessage` | 生成 `role: "branchSummary"` message,并把 timestamp string 转成 `new Date(timestamp).getTime()`。[E: packages/agent/src/harness/messages.ts:81][E: packages/agent/src/harness/messages.ts:83][E: packages/agent/src/harness/messages.ts:84][E: packages/agent/src/harness/messages.ts:85][E: packages/agent/src/harness/messages.ts:86] | `packages/agent/src/harness/messages.ts` |
| `createCompactionSummaryMessage(summary, tokensBefore, timestamp)` | returns `CompactionSummaryMessage` | 生成 `role: "compactionSummary"` message,并把 timestamp string 转成 numeric timestamp。[E: packages/agent/src/harness/messages.ts:90][E: packages/agent/src/harness/messages.ts:96][E: packages/agent/src/harness/messages.ts:97][E: packages/agent/src/harness/messages.ts:98][E: packages/agent/src/harness/messages.ts:99] | `packages/agent/src/harness/messages.ts` |
| `createCustomMessage(customType, content, display, details, timestamp)` | returns `CustomMessage` | 生成 `role: "custom"` message,保留 customType/content/display/details,并把 timestamp string 转成 numeric timestamp。[E: packages/agent/src/harness/messages.ts:103][E: packages/agent/src/harness/messages.ts:111][E: packages/agent/src/harness/messages.ts:112][E: packages/agent/src/harness/messages.ts:113][E: packages/agent/src/harness/messages.ts:114][E: packages/agent/src/harness/messages.ts:115][E: packages/agent/src/harness/messages.ts:116] | `packages/agent/src/harness/messages.ts` |
| `convertToLlm(messages)` | `(AgentMessage[]) => Message[]` | 对每个 `AgentMessage` switch by role,映射成 `Message | undefined`,最后过滤 `undefined`。[E: packages/agent/src/harness/messages.ts:120][E: packages/agent/src/harness/messages.ts:121][E: packages/agent/src/harness/messages.ts:122][E: packages/agent/src/harness/messages.ts:123][E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160][E: packages/agent/src/harness/messages.ts:163] | `packages/agent/src/harness/messages.ts` |

## 消费点

`AgentLoopConfig.convertToLlm` 是 core config 里的正式转换边界:签名把 `AgentMessage[]` 映射为 `Message[] | Promise<Message[]>`;default harness converter 通过 `Message | undefined` map + filter 实现 pass-through、降级和过滤。[E: packages/agent/src/types.ts:169][E: packages/agent/src/harness/messages.ts:120][E: packages/agent/src/harness/messages.ts:122][E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160][E: packages/agent/src/harness/messages.ts:163]

`AgentLoopConfig.transformContext`、`getSteeringMessages`、`getFollowUpMessages` 都以 `AgentMessage[]` 为输入或输出,所以 custom messages 可以先在 agent-core transcript 层参与上下文管理,再经 `convertToLlm` 降级或过滤。[E: packages/agent/src/types.ts:191][E: packages/agent/src/types.ts:235][E: packages/agent/src/types.ts:248][I]

`AgentState.messages` 和 `AgentContext.messages` 都保存 `AgentMessage[]`;`AgentState.streamingMessage`、`AgentEvent.agent_end.messages`、`AgentEvent.turn_end.message`、`message_start/message_update/message_end.message` 也使用 `AgentMessage`,因此消息 union 同时覆盖持久 transcript、当前 streaming message 和 UI event payload。[E: packages/agent/src/types.ts:333][E: packages/agent/src/types.ts:334][E: packages/agent/src/types.ts:342][E: packages/agent/src/types.ts:401][E: packages/agent/src/types.ts:416][E: packages/agent/src/types.ts:419][E: packages/agent/src/types.ts:421][E: packages/agent/src/types.ts:423][E: packages/agent/src/types.ts:424]

## 边界与 Gotcha

在这两个 source 中没有独立 `system` message case;agent-core 把 system prompt 放在 `AgentState.systemPrompt` 和 `AgentContext.systemPrompt` 字段,default harness converter 只处理 message array。[E: packages/agent/src/types.ts:324][E: packages/agent/src/types.ts:399][E: packages/agent/src/harness/messages.ts:120]

Default `convertToLlm` 的 `default` 分支返回 `undefined`,所以扩展方如果只通过 declaration merging 添加新的 custom role,但没有同步提供 converter 逻辑,该 role 会被过滤出 LLM context。[E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160][I]

标准 `user`、`assistant`、`toolResult` 的字段级定义来自 `@earendil-works/pi-ai` 的 `Message` union;本节点只覆盖 agent-core source 中可核到的 union 引用、pass-through 行为和 harness custom variant。[E: packages/agent/src/types.ts:8][E: packages/agent/src/types.ts:314][E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:156][E: packages/agent/src/harness/messages.ts:157][I]

## Sources

- `packages/agent/src/types.ts`
- `packages/agent/src/harness/messages.ts`

## 相关

- [subsys.agent-core.message-model](../subsystems/agent-core/message-model.md) - `AgentMessage`、`AgentToolCall`、`AgentToolResult` 的结构边界和 agent-core message model 语义。
