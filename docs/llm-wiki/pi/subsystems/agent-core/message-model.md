---
id: subsys.agent-core.message-model
title: 对话消息模型
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/types.ts
symbols:
  - AgentMessage
  - AgentState
  - CustomAgentMessages
  - AgentContext
related:
  - ref.agent.message-types
  - spine.agent-loop
  - ref.agent.agent-events
  - subsys.agent-core.turn-control
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.agent-core.message-model` 描述 `pi-agent-core` 在 `packages/agent/src/types.ts` 里的 transcript union 与公开状态：`AgentMessage`、`AgentState`、空的 `CustomAgentMessages` 扩展点，以及 `AgentContext.messages`。本节点不覆盖已删除的 `packages/agent/src/harness/messages.ts`。

## 能回答的问题

- `AgentMessage` 怎样把 provider `Message` 与 app custom message 放进同一个 transcript union？
- `CustomAgentMessages` 默认有哪些成员，谁通过 declaration merging 扩展它？
- `AgentState` 的 `systemPrompt` / `tools` / `messages` 读写语义是什么？
- `AgentContext` 与 `AgentState` 在 messages 上如何对齐？
- `convertToLlm` 在 agent-core 里是实现还是类型边界？

## 职责边界

`AgentMessage` 是 agent-core 的 transcript union：它等于 provider 层 `Message` 加上 `CustomAgentMessages[keyof CustomAgentMessages]`。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374] `CustomAgentMessages` 在 core 类型文件中是空接口，注释约定 apps 用 declaration merging 扩展。[E: packages/agent/src/types.ts:365]

`AgentLoopConfig.convertToLlm` 是 `AgentMessage[]` 到 provider-compatible `Message[]` 的显式类型边界：它接收 `AgentMessage[]`，返回 `Message[] | Promise<Message[]>`。[E: packages/agent/src/types.ts:193] [E: packages/agent/src/types.ts:222] agent-core **不**再提供 default converter 实现；`packages/agent/src/harness/messages.ts` 已删除。[I]

本节点只读 `packages/agent/src/types.ts`。coding-agent 的 custom roles（`bashExecution` / `custom` / `branchSummary` / `compactionSummary`）与 `convertToLlm` 实现不在本 source 内展开，见 [ref.agent.message-types](../../reference/message-types.md)。

## 类型结构

`AgentMessage` 的标准侧来自 `@earendil-works/pi-ai` 的 imported `Message`；本节点不展开 `Message` 的字段级定义。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:374] 空的 `CustomAgentMessages` 使 `keyof CustomAgentMessages` 在未扩展时不增加成员；扩展后 union 自动纳入新 role。[E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374]

`AgentContext.messages` 和 `AgentState.messages` 都使用 `AgentMessage[]`。[E: packages/agent/src/types.ts:407] [E: packages/agent/src/types.ts:408] [E: packages/agent/src/types.ts:500] [E: packages/agent/src/types.ts:502] `AgentContext` 是 loop 一次 request 的 snapshot：`messages` 加可选 `tools`。[E: packages/agent/src/types.ts:500] [E: packages/agent/src/types.ts:504]

## `AgentState`

`AgentState` 是公开 agent 状态。`tools` 和 `messages` 用 accessor，实现可以在赋值时 copy 顶层数组。[E: packages/agent/src/types.ts:382] [E: packages/agent/src/types.ts:400] [E: packages/agent/src/types.ts:407]

| 字段 | 类型 / 访问 | 语义 |
| --- | --- | --- |
| `systemPrompt` | `readonly string` | 从 transcript 的 system messages replay 出来的当前 prompt。只读：改 prompt 必须 append 一条带 `content` 或 `sections` 的 system message。`initialState` 用它播种 leading system message。[E: packages/agent/src/types.ts:389] |
| `model` | `Model<any>` | 后续 turn 使用的 active model。[E: packages/agent/src/types.ts:391] |
| `thinkingLevel` | `ThinkingLevel` | 后续 turn 的 requested reasoning level。[E: packages/agent/src/types.ts:393] |
| `tools` | getter / setter `AgentTool<any>[]` | 可执行工具。赋值 copy 顶层数组。与 transcript 中声明的 tools 的差异会在下次 request 前用 system message 通知模型。[E: packages/agent/src/types.ts:400] [E: packages/agent/src/types.ts:401] |
| `messages` | getter / setter `AgentMessage[]` | 会话 transcript。赋值 copy 顶层数组。system messages 携带 prompt 与 tool declarations。[E: packages/agent/src/types.ts:407] [E: packages/agent/src/types.ts:408] |
| `isStreaming` | `readonly boolean` | prompt 或 continuation 进行中为 true，直到 awaited `agent_end` listeners settle。[E: packages/agent/src/types.ts:414] |
| `streamingMessage` | `readonly AgentMessage \| undefined` | 当前 streamed assistant 的 partial message。[E: packages/agent/src/types.ts:416] |
| `pendingToolCalls` | `ReadonlySet<string>` | 正在执行的 tool call ids。[E: packages/agent/src/types.ts:418] |
| `errorMessage` | `readonly string \| undefined` | 最近一次 failed / aborted assistant turn 的错误信息。[E: packages/agent/src/types.ts:420] |

`ThinkingLevel` 是 `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"`。[E: packages/agent/src/types.ts:349]

## assistant / user / system 语义

标准 LLM messages 是 `Message` 的 `user` / `assistant` / `toolResult` / `system` roles，经 `AgentMessage` 原样进入 transcript。[E: packages/agent/src/types.ts:8] [E: packages/agent/src/types.ts:374] System prompt 在 public state 里是独立字段 `AgentState.systemPrompt`，但真正发给模型的 prompt 来自 transcript 的 system messages。[E: packages/agent/src/types.ts:389] [E: packages/agent/src/types.ts:407]

`AgentLoopConfig.convertToLlm` 的类型是 `(messages: AgentMessage[]) => Message[] | Promise<Message[]>`。源码注释要求每个 `AgentMessage` 转成 `SystemMessage` / `UserMessage` / `AssistantMessage` / `ToolResultMessage`，无法转换的应过滤；契约是不得 throw/reject，应返回安全 fallback。[E: packages/agent/src/types.ts:222] [I]

`transformContext` 是可选的、在 `convertToLlm` 之前作用于 `AgentMessage[]` 的变换（例如 pruning）。[E: packages/agent/src/types.ts:244]

## tool call / result 在 types.ts 中的锚点

`AgentToolCall` 不是单独定义的新 shape，而是从 `AssistantMessage["content"][number]` 中抽取 `{ type: "toolCall" }` content block。[E: packages/agent/src/types.ts:58]

`AgentToolResult<T>` 是 tool implementation 返回的 final 或 partial envelope：`content`、`details`、可选 `structuredContent`、可选 `usage`、可选 `isError`、可选 `terminate`。[E: packages/agent/src/types.ts:424] [E: packages/agent/src/types.ts:426] [E: packages/agent/src/types.ts:428] [E: packages/agent/src/types.ts:440] [E: packages/agent/src/types.ts:445] `isError: true` 让模型把 `content` 当 error result，同时保留 `details` / `structuredContent` 给 UI。[E: packages/agent/src/types.ts:440]

`AgentTool.execute` 接收 `toolCallId`、validated params、可选 abort signal、可选 partial update callback，并返回 `Promise<AgentToolResult<TDetails>>`。[E: packages/agent/src/types.ts:481]

Turn contexts 携带 provider-visible `ToolResultMessage[]`，字段级定义来自 `@earendil-works/pi-ai`。[E: packages/agent/src/types.ts:13] [E: packages/agent/src/types.ts:139]

## gotcha

- `CustomAgentMessages` 在本文件为空。未做 declaration merging 时，`AgentMessage` 就是 `Message`。[E: packages/agent/src/types.ts:365] [E: packages/agent/src/types.ts:374]
- 不要再 cite `packages/agent/src/harness/messages.ts` 或把 default `convertToLlm` 写成 agent-core 导出实现。现行 `packages/agent/src/index.ts` 只 re-export agent loop / proxy / types。[I]
- `AgentState.systemPrompt` 只读；直接赋值不会改 prompt。[E: packages/agent/src/types.ts:389]
- `convertToLlm` 若 throw，会打断低层 loop 且不产生正常事件序列。[E: packages/agent/src/types.ts:222] [I]

## 跨包边界

[ref.agent.message-types](../../reference/message-types.md) 应枚举 `AgentMessage` 相关消息类型与 coding-agent custom roles；本节点覆盖 `AgentMessage` 与 `AgentState` 在 agent-core types 中的结构与语义边界。[E: packages/agent/src/types.ts:374] [E: packages/agent/src/types.ts:382]

[spine.agent-loop](../../spine/agent-loop.md) 与 [subsys.agent-core.turn-control](turn-control.md) 消费这些类型；[ref.agent.agent-events](../../reference/agent-events.md) 的 payload 引用 `AgentMessage`。[I]

## Sources

- packages/agent/src/types.ts

## 相关

- [ref.agent.message-types](../../reference/message-types.md) - agent message 类型目录（含产品层 custom roles）。
- [spine.agent-loop](../../spine/agent-loop.md) - loop 如何把 `AgentState.messages` 交给 provider。
- [ref.agent.agent-events](../../reference/agent-events.md) - payload 里的 `AgentMessage`。
- [subsys.agent-core.turn-control](turn-control.md) - turn 结束时如何 append messages。
