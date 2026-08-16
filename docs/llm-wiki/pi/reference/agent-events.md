---
id: ref.agent.agent-events
title: Agent/Harness 事件目录
kind: catalog
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/harness/events.ts
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/agent-harness.ts
symbols:
  - AgentEvent
  - HarnessEvent
  - RunStartEvent
  - RunEndEvent
related:
  - subsys.agent-core.turn-control
  - subsys.agent-core.harness-events
  - ref.coding-agent.session-events
evidence: explicit
status: verified
updated: 086c32e745
---

> `ref.agent.agent-events` 是当前 agent-core 事件 catalog：`AgentEvent` 的 10 个 runtime variant，加上 `harness/events.ts` 的 `HarnessEvent`（`run_start` / `run_end`）。旧 `AgentHarnessEvent` / `AgentHarnessOwnEvent` union 已从 `packages/agent/src/harness/types.ts` 删除。

## 能回答的问题

- `AgentEvent` 现在有哪些 lifecycle / turn / message / tool execution variant？
- `HarnessEvent` 的 discriminator 和字段是什么？
- 旧 `AgentHarnessEvent`（queue_update、save_point、before_agent_start 等）还在类型面吗？
- 谁订阅 `AgentEvent`，谁订阅 `HarnessEvent`？

## 已删除的 AgentHarnessEvent

`packages/agent/src/harness/types.ts` 不再导出 `AgentHarnessEvent`、`AgentHarnessOwnEvent`、`QueueUpdateEvent`、`SavePointEvent`、`AbortEvent`、`SettledEvent`、hook event interfaces 或 `AgentHarnessEventResultMap`。对这些名字的 grep 在该文件中为零命中。旧 catalog 里的 22 个 harness-owned variant 不能再当作当前公开类型。[E: packages/agent/src/harness/types.ts:70] [I]

`agent-harness.ts` 另有一份未接线的 `HookName` 字符串字面量（`before_run`、`before_tool` 等）。那是 hook 注册名，不是 `HarnessEvent` variant，本 catalog 不把它们列成 event。[E: packages/agent/src/harness/agent-harness.ts:198]

## Core AgentEvent variants

`AgentEvent` 是 10-arm discriminated union，成员覆盖 `agent_*`、`turn_*`、`message_*` 与 `tool_execution_*`。[E: packages/agent/src/types.ts:428] [E: packages/agent/src/types.ts:430] [E: packages/agent/src/types.ts:433] [E: packages/agent/src/types.ts:436] [E: packages/agent/src/types.ts:441]

`Agent.subscribe(listener)` 把 listener 放进 set，返回 unsubscribe。[E: packages/agent/src/agent.ts:250] [E: packages/agent/src/agent.ts:251] [E: packages/agent/src/agent.ts:252] `processEvents` 取出 `activeRun.abortController.signal`，再按订阅顺序 `await listener(event, signal)`。[E: packages/agent/src/agent.ts:584] [E: packages/agent/src/agent.ts:588] [E: packages/agent/src/agent.ts:589] `finishRun()` resolve `activeRun` 后 `waitForIdle()` 才完成，因此 idle 晚于 `agent_end` 本身。[E: packages/agent/src/agent.ts:529] [E: packages/agent/src/agent.ts:533] [E: packages/agent/src/agent.ts:328]

| Variant | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `AgentEvent` | 10-arm discriminated union | core agent runtime event 总 union。[E: packages/agent/src/types.ts:428] | 不包含 `HarnessEvent`。两套 union 独立。[E: packages/agent/src/harness/events.ts:15] [I] | `packages/agent/src/types.ts:428` |
| `agent_start` | `{ type: "agent_start" }` | 一次 agent run 开始；无额外 payload。[E: packages/agent/src/types.ts:430] | emit 时机属于 `runLoop` / `Agent`，本表只记静态 shape。[I] | `packages/agent/src/types.ts:430` |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[] }` | 一次 agent run 结束，携带本次 run 的 `messages`。[E: packages/agent/src/types.ts:431] | `Agent` 在失败路径也会发 `agent_end`；`finishRun()` 之后 `waitForIdle()` 才 resolve。[E: packages/agent/src/agent.ts:526] [E: packages/agent/src/agent.ts:529] | `packages/agent/src/types.ts:431` |
| `turn_start` | `{ type: "turn_start" }` | 一个 turn 开始；无额外 payload。[E: packages/agent/src/types.ts:433] | turn 的 runtime 边界属于 `runLoop`；本表只记静态 shape。[I] | `packages/agent/src/types.ts:433` |
| `turn_end` | `{ type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }` | 一个 turn 完成，携带 assistant `message` 与 `toolResults`。[E: packages/agent/src/types.ts:434] | 旧 harness `save_point` 已不存在于类型面。[I] | `packages/agent/src/types.ts:434` |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | message 生命周期开始。[E: packages/agent/src/types.ts:436] | `Agent.processEvents` 在 `message_start` 把 `streamingMessage` 设为该 message。[E: packages/agent/src/agent.ts:546] [E: packages/agent/src/agent.ts:547] | `packages/agent/src/types.ts:436` |
| `message_update` | `{ type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }` | streaming 中的 message 更新，带当前 `message` 与 `assistantMessageEvent`。[E: packages/agent/src/types.ts:438] | `processEvents` 用它刷新 `streamingMessage`。[E: packages/agent/src/agent.ts:550] [E: packages/agent/src/agent.ts:551] `AssistantMessageEvent` 来自 `@earendil-works/pi-ai`。[I] | `packages/agent/src/types.ts:438` |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | message 生命周期结束，携带最终 message。[E: packages/agent/src/types.ts:439] | `Agent.processEvents` 在 `message_end` 把 message push 进 `state.messages`。[E: packages/agent/src/agent.ts:554] [E: packages/agent/src/agent.ts:556] | `packages/agent/src/types.ts:439` |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }` | 一个 tool call 开始执行。[E: packages/agent/src/types.ts:441] | `args` 静态类型是 `any`。[E: packages/agent/src/types.ts:441] | `packages/agent/src/types.ts:441` |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }` | tool 执行中的 partial update。[E: packages/agent/src/types.ts:442] | `partialResult` 静态类型是 `any`。[E: packages/agent/src/types.ts:442] | `packages/agent/src/types.ts:442` |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }` | tool 执行完成。[E: packages/agent/src/types.ts:443] | 并行完成顺序属于 `ToolExecutionMode` 与 loop，本 variant 只声明 payload。[I] | `packages/agent/src/types.ts:443` |

## HarnessEvent variants

`HarnessEvent` 定义在 `packages/agent/src/harness/events.ts`，不是 `harness/types.ts`。[E: packages/agent/src/harness/events.ts:15] 投递机制见 [subsys.agent-core.harness-events](../subsystems/agent-core/harness-events.md)。

| 类型名 / Variant | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `RunStartEvent` / `run_start` | `lane: string`; `runId: string` | 一条 lane 上一次 run 开始。[E: packages/agent/src/harness/events.ts:1] [E: packages/agent/src/harness/events.ts:3] [E: packages/agent/src/harness/events.ts:4] | `AgentHarness` 尚未 emit 这些事件；bus 是独立实现。[E: packages/agent/src/harness/agent-harness.ts:327] [I] | `packages/agent/src/harness/events.ts:1` |
| `RunEndEvent` / `run_end` | `lane: string`; `runId: string`; `outcome: "completed" \| "aborted" \| "failed"`; `leafId: string` | 一次 run 结束，带 outcome 与当时 leaf id。[E: packages/agent/src/harness/events.ts:7] [E: packages/agent/src/harness/events.ts:11] [E: packages/agent/src/harness/events.ts:12] | `outcome` 没有 `suspended`，尽管 `RunOutcome` 类型含 `suspended`。[E: packages/agent/src/harness/agent-harness.ts:93] [E: packages/agent/src/harness/events.ts:11] [I] | `packages/agent/src/harness/events.ts:7` |
| `HarnessEvent` | `RunStartEvent \| RunEndEvent` | harness bus 事件总 union，目前恰好 2 个 variant。[E: packages/agent/src/harness/events.ts:15] | 不是 `AgentEvent` 的超集，也不再并入已删除的 `AgentHarnessEvent`。[I] | `packages/agent/src/harness/events.ts:15` |
| `HarnessEventType` | `HarnessEvent["type"]` | `"run_start" \| "run_end"`。[E: packages/agent/src/harness/events.ts:16] | `Events.on` 用它做 type 参数。[E: packages/agent/src/harness/events.ts:25] | `packages/agent/src/harness/events.ts:16` |

## 订阅面

| API | 事件 union | 回放 / snapshot | 源码证据 |
| --- | --- | --- | --- |
| `Agent.subscribe(listener)` | `AgentEvent` | 无回放；`processEvents` 把当前 run 的 `AbortSignal` 一并传入并 await。[E: packages/agent/src/agent.ts:250] [E: packages/agent/src/agent.ts:589] | `packages/agent/src/agent.ts:250` |
| `HarnessEventBus.on(type, listener)` | 单个 `HarnessEvent` type | 只把 wrapper 加进 type set，无历史回放。[E: packages/agent/src/harness/events.ts:45] [E: packages/agent/src/harness/events.ts:58] | `packages/agent/src/harness/events.ts:45` |
| `HarnessEventBus.watch(captureSnapshot)` | 全部 `HarnessEvent` | 先订阅再拍 snapshot，`start()` 刷 buffer。[E: packages/agent/src/harness/events.ts:75] [E: packages/agent/src/harness/events.ts:82] [E: packages/agent/src/harness/events.ts:83] | `packages/agent/src/harness/events.ts:75` |
| `AgentHarness.events.on` | `string` + `unknown` | 未实现，throw `HarnessNotImplemented` 或 `HarnessClosed`。[E: packages/agent/src/harness/agent-harness.ts:215] [E: packages/agent/src/harness/agent-harness.ts:233] | `packages/agent/src/harness/agent-harness.ts:215` |

## 关系边界

`subsys.agent-core.turn-control` 解释 `AgentEvent` 的 emit 顺序和 `terminate` 如何结束 run；本节点只声明静态 payload。[E: packages/agent/src/types.ts:428] [I]

`subsys.agent-core.harness-events` 解释 `HarnessEventBus` 的 listener / watch 算法；本节点只列 `HarnessEvent` 实例。[E: packages/agent/src/harness/events.ts:15] [I]

`ref.coding-agent.session-events` 覆盖产品层 `AgentSessionEvent`。本节点不展开 coding-agent UI/RPC event。[I]

`ref.agent.message-types` 覆盖 `AgentMessage` union；本节点只在 payload 里引用该类型。[I]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/harness/events.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/harness/agent-harness.ts

## 相关

- [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md)：`runLoop` 如何 emit 和消费 `AgentEvent`。
- [subsys.agent-core.harness-events](../subsystems/agent-core/harness-events.md)：`HarnessEventBus` 订阅与 watch。
- [ref.coding-agent.session-events](session-events.md)：coding-agent `AgentSessionEvent` 目录。
