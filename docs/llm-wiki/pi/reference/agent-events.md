---
id: ref.agent.agent-events
title: AgentEvent 目录
kind: catalog
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
symbols:
  - AgentEvent
related:
  - subsys.agent-core.turn-control
  - spine.agent-loop
  - ref.coding-agent.session-events
  - subsys.durable.harness
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.agent.agent-events` 是 `pi-agent-core` 低层 loop 事件 catalog：只覆盖 `packages/agent/src/types.ts` 里 `AgentEvent` 的 10 个 runtime variant。`pi-agent-core` 1.0 已删除 experimental harness；本节点不收录 `HarnessEvent`。durable `watchEvents()` 另有一个同名 `AgentEvent` 类型，不是本 union。

## 能回答的问题

- `AgentEvent` 现在有哪些 lifecycle / turn / message / tool execution variant？
- 每个 variant 的静态 payload 字段是什么？
- 谁订阅 `AgentEvent`，idle 与 `agent_end` 的先后关系是什么？
- 本 union 是否包含 harness / coding-agent session 事件？

## 职责边界

`AgentEvent` 是 10-arm discriminated union，成员覆盖 `agent_*`、`turn_*`、`message_*` 与 `tool_execution_*`。[E: packages/agent/src/types.ts:514] [E: packages/agent/src/types.ts:516] [E: packages/agent/src/types.ts:519] [E: packages/agent/src/types.ts:522] [E: packages/agent/src/types.ts:527]

`Agent.subscribe(listener)` 把 listener 放进 set，返回 unsubscribe。[E: packages/agent/src/agent.ts:266] [E: packages/agent/src/agent.ts:267] [E: packages/agent/src/agent.ts:268] `processEvents` 取出 `activeRun.abortController.signal`，再按订阅顺序 `await listener(event, signal)`。[E: packages/agent/src/agent.ts:605] [E: packages/agent/src/agent.ts:609] [E: packages/agent/src/agent.ts:610] `agent_end` 是一次 run 发出的最后一个事件，但 awaited `agent_end` listeners 仍算 run settlement；`waitForIdle()` 在那些 listeners 结束且 `finishRun()` 清掉 runtime-owned state 之后才完成。[E: packages/agent/src/types.ts:514] [E: packages/agent/src/agent.ts:350] [E: packages/agent/src/agent.ts:550] [I]

本 catalog **不**收录：

- 已删除的 `packages/agent/src/harness/**` 上的 `HarnessEvent` / `AgentHarnessEvent`
- coding-agent `AgentSessionEvent`（见 [ref.coding-agent.session-events](session-events.md)）
- durable `watchEvents()` 的 `AgentEvent`（见 [subsys.durable.harness](../subsystems/durable/harness.md)）

## Core AgentEvent variants

| Variant | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `AgentEvent` | 10-arm discriminated union | core agent runtime event 总 union。[E: packages/agent/src/types.ts:514] | 不包含 durable / coding-agent 事件 union。[I] | `packages/agent/src/types.ts:514` |
| `agent_start` | `{ type: "agent_start" }` | 一次 agent run 开始；无额外 payload。[E: packages/agent/src/types.ts:516] | emit 时机属于 `runLoop` / `Agent`，本表只记静态 shape。[I] | `packages/agent/src/types.ts:516` |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[] }` | 一次 agent run 结束，携带本次 run 的 `messages`。[E: packages/agent/src/types.ts:517] | `Agent` 在失败路径也会发 `agent_end`；`finishRun()` 之后 `waitForIdle()` 才 resolve。[E: packages/agent/src/agent.ts:547] [E: packages/agent/src/agent.ts:550] | `packages/agent/src/types.ts:517` |
| `turn_start` | `{ type: "turn_start" }` | 一个 turn 开始；无额外 payload。[E: packages/agent/src/types.ts:519] | turn 的 runtime 边界属于 `runLoop`；本表只记静态 shape。[I] | `packages/agent/src/types.ts:519` |
| `turn_end` | `{ type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }` | 一个 turn 完成，携带 assistant `message` 与 `toolResults`。[E: packages/agent/src/types.ts:520] | `processEvents` 在 assistant 带 `errorMessage` 时写入 `state.errorMessage`。[E: packages/agent/src/agent.ts:594] [E: packages/agent/src/agent.ts:596] | `packages/agent/src/types.ts:520` |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | message 生命周期开始。注释约定覆盖 system / user / assistant / toolResult。[E: packages/agent/src/types.ts:522] | `Agent.processEvents` 在 `message_start` 把 `streamingMessage` 设为该 message。[E: packages/agent/src/agent.ts:567] [E: packages/agent/src/agent.ts:568] | `packages/agent/src/types.ts:522` |
| `message_update` | `{ type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }` | streaming 中的 message 更新，带当前 `message` 与 `assistantMessageEvent`。只为 assistant streaming 发出。[E: packages/agent/src/types.ts:524] | `processEvents` 用它刷新 `streamingMessage`。[E: packages/agent/src/agent.ts:571] [E: packages/agent/src/agent.ts:572] `AssistantMessageEvent` 来自 `@earendil-works/pi-ai`。[E: packages/agent/src/types.ts:4] | `packages/agent/src/types.ts:524` |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | message 生命周期结束，携带最终 message。[E: packages/agent/src/types.ts:525] | `Agent.processEvents` 在 `message_end` 把 message push 进 `state.messages`。[E: packages/agent/src/agent.ts:575] [E: packages/agent/src/agent.ts:577] | `packages/agent/src/types.ts:525` |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }` | 一个 tool call 开始执行。[E: packages/agent/src/types.ts:527] | `args` 静态类型是 `any`。`processEvents` 把 `toolCallId` 加入 `pendingToolCalls`。[E: packages/agent/src/agent.ts:580] [E: packages/agent/src/agent.ts:582] | `packages/agent/src/types.ts:527` |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }` | tool 执行中的 partial update。[E: packages/agent/src/types.ts:528] | `partialResult` 静态类型是 `any`。[E: packages/agent/src/types.ts:528] | `packages/agent/src/types.ts:528` |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }` | tool 执行完成。[E: packages/agent/src/types.ts:529] | `processEvents` 从 `pendingToolCalls` 删除该 id。[E: packages/agent/src/agent.ts:587] [E: packages/agent/src/agent.ts:589] | `packages/agent/src/types.ts:529` |

失败路径 `handleRunFailure()` 依次 emit `message_start` / `message_end` / `turn_end` / `agent_end`，构造一条 `stopReason` 为 `"aborted"` 或 `"error"` 的空 assistant message。[E: packages/agent/src/agent.ts:544] [E: packages/agent/src/agent.ts:545] [E: packages/agent/src/agent.ts:546] [E: packages/agent/src/agent.ts:547]

## 订阅面

| API | 事件 union | 回放 / snapshot | 源码证据 |
| --- | --- | --- | --- |
| `Agent.subscribe(listener)` | `AgentEvent` | 无回放；`processEvents` 把当前 run 的 `AbortSignal` 一并传入并 await。没有 active run 时 listener 调用会 throw `"Agent listener invoked outside active run"`。[E: packages/agent/src/agent.ts:266] [E: packages/agent/src/agent.ts:606] [E: packages/agent/src/agent.ts:610] | `packages/agent/src/agent.ts:266` |
| `Agent.waitForIdle()` | 无事件 | 当前 run 与全部 awaited listeners 结束后 resolve；无 active run 时立刻 resolve。[E: packages/agent/src/agent.ts:350] [E: packages/agent/src/agent.ts:351] | `packages/agent/src/agent.ts:350` |

## 关系边界

[subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) 解释低层 `AgentEvent` 的 emit 顺序和 `finishTurn` 如何结束 run；本节点只声明静态 payload。[E: packages/agent/src/types.ts:514] [I]

[spine.agent-loop](../spine/agent-loop.md) 是 `runAgentLoop` 端到端视角。[I]

[ref.coding-agent.session-events](session-events.md) 覆盖产品层 `AgentSessionEvent`。本节点不展开 coding-agent UI/RPC event。[I]

durable `watchEvents()` 导出的 `AgentEvent` 在 `packages/durable/src/harness/events.ts`，与本 union 不是同一类型。[I]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts

## 相关

- [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) - `runLoop` 如何 emit 和消费 `AgentEvent`。
- [spine.agent-loop](../spine/agent-loop.md) - 一次 turn 的事件顺序。
- [ref.coding-agent.session-events](session-events.md) - coding-agent `AgentSessionEvent` 目录。
- [subsys.durable.harness](../subsystems/durable/harness.md) - durable `watchEvents()` 的另一套 `AgentEvent`。
