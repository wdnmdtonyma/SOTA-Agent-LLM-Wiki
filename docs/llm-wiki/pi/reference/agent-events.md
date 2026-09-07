---
id: ref.agent.agent-events
title: Agent/Harness 事件目录
kind: catalog
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/events.ts
  - packages/agent/src/harness/runtime/harness.ts
  - packages/agent/src/harness/types.ts
symbols:
  - AgentEvent
  - HarnessEvent
  - HarnessEventPayload
  - HarnessEventType
related:
  - subsys.agent-core.turn-control
  - subsys.agent-core.harness-events
  - ref.coding-agent.session-events
evidence: explicit
status: verified
updated: 9767ba275f
---

> `ref.agent.agent-events` 是当前 agent-core 事件 catalog：低层 `AgentEvent` 的 10 个 runtime variant，加上 `agent-harness.ts` 的 `HarnessEvent` / `HarnessEventPayload`。旧 `AgentHarnessEvent` / `AgentHarnessOwnEvent` 与仅含 `run_start`/`run_end` 的窄 `HarnessEvent` 都已过期。

## 能回答的问题

- `AgentEvent` 现在有哪些 lifecycle / turn / message / tool execution variant？
- `HarnessEvent` 的 discriminator 和字段是什么？
- 旧 `AgentHarnessEvent`（queue_update、save_point、before_agent_start 等）还在类型面吗？
- 谁订阅 `AgentEvent`，谁订阅 `HarnessEvent`？

## 已删除的 AgentHarnessEvent

`packages/agent/src/harness/types.ts` 不再导出 `AgentHarnessEvent`、`AgentHarnessOwnEvent`、`QueueUpdateEvent`、`SavePointEvent`、`AbortEvent`、`SettledEvent`、hook event interfaces 或 `AgentHarnessEventResultMap`。对这些名字的 grep 在该文件中为零命中。旧 catalog 里的 22 个 harness-owned variant 不能再当作当前公开类型。[E: packages/agent/src/harness/types.ts:73] [I]

`agent-harness.ts` 的 `HookName` / `HookMap`（`before_run`、`before_tool` 等）是 hook 注册名，不是 `HarnessEvent` variant，本 catalog 不把它们列成 event。[E: packages/agent/src/harness/agent-harness.ts:502]

## Core AgentEvent variants

`AgentEvent` 是 10-arm discriminated union，成员覆盖 `agent_*`、`turn_*`、`message_*` 与 `tool_execution_*`。[E: packages/agent/src/types.ts:433] [E: packages/agent/src/types.ts:436] [E: packages/agent/src/types.ts:439] [E: packages/agent/src/types.ts:444]

`Agent.subscribe(listener)` 把 listener 放进 set，返回 unsubscribe。[E: packages/agent/src/agent.ts:250] [E: packages/agent/src/agent.ts:251] [E: packages/agent/src/agent.ts:252] `processEvents` 取出 `activeRun.abortController.signal`，再按订阅顺序 `await listener(event, signal)`。[E: packages/agent/src/agent.ts:584] [E: packages/agent/src/agent.ts:588] [E: packages/agent/src/agent.ts:589] `finishRun()` resolve `activeRun` 后 `waitForIdle()` 才完成，因此 idle 晚于 `agent_end` 本身。[E: packages/agent/src/agent.ts:529] [E: packages/agent/src/agent.ts:328]

| Variant | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `AgentEvent` | 10-arm discriminated union | core agent runtime event 总 union。[E: packages/agent/src/types.ts:433] | 不包含 `HarnessEvent`。两套 union 独立。[E: packages/agent/src/harness/agent-harness.ts:388] [I] | `packages/agent/src/types.ts:431` |
| `agent_start` | `{ type: "agent_start" }` | 一次 agent run 开始；无额外 payload。[E: packages/agent/src/types.ts:433] | emit 时机属于 `runLoop` / `Agent`，本表只记静态 shape。[I] | `packages/agent/src/types.ts:433` |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[] }` | 一次 agent run 结束，携带本次 run 的 `messages`。[E: packages/agent/src/types.ts:436] | `Agent` 在失败路径也会发 `agent_end`；`finishRun()` 之后 `waitForIdle()` 才 resolve。[E: packages/agent/src/agent.ts:526] [E: packages/agent/src/agent.ts:529] | `packages/agent/src/types.ts:434` |
| `turn_start` | `{ type: "turn_start" }` | 一个 turn 开始；无额外 payload。[E: packages/agent/src/types.ts:436] | turn 的 runtime 边界属于 `runLoop`；本表只记静态 shape。[I] | `packages/agent/src/types.ts:436` |
| `turn_end` | `{ type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }` | 一个 turn 完成，携带 assistant `message` 与 `toolResults`。[E: packages/agent/src/types.ts:439] | 旧 harness `save_point` 已不存在于类型面。[I] | `packages/agent/src/types.ts:437` |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | message 生命周期开始。[E: packages/agent/src/types.ts:441] | `Agent.processEvents` 在 `message_start` 把 `streamingMessage` 设为该 message。[E: packages/agent/src/agent.ts:546] [E: packages/agent/src/agent.ts:547] | `packages/agent/src/types.ts:439` |
| `message_update` | `{ type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }` | streaming 中的 message 更新，带当前 `message` 与 `assistantMessageEvent`。[E: packages/agent/src/types.ts:441] | `processEvents` 用它刷新 `streamingMessage`。[E: packages/agent/src/agent.ts:550] [E: packages/agent/src/agent.ts:551] `AssistantMessageEvent` 来自 `@earendil-works/pi-ai`。[I] | `packages/agent/src/types.ts:441` |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | message 生命周期结束，携带最终 message。[E: packages/agent/src/types.ts:444] | `Agent.processEvents` 在 `message_end` 把 message push 进 `state.messages`。[E: packages/agent/src/agent.ts:554] [E: packages/agent/src/agent.ts:556] | `packages/agent/src/types.ts:442` |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }` | 一个 tool call 开始执行。[E: packages/agent/src/types.ts:446] | `args` 静态类型是 `any`。[E: packages/agent/src/types.ts:444] | `packages/agent/src/types.ts:444` |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }` | tool 执行中的 partial update。[E: packages/agent/src/types.ts:445] | `partialResult` 静态类型是 `any`。[E: packages/agent/src/types.ts:445] | `packages/agent/src/types.ts:445` |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }` | tool 执行完成。[E: packages/agent/src/types.ts:446] | 并行完成顺序属于 `ToolExecutionMode` 与 loop，本 variant 只声明 payload。[I] | `packages/agent/src/types.ts:446` |

## HarnessEvent variants

`HarnessEvent` / `HarnessEventPayload` 定义在 `packages/agent/src/harness/agent-harness.ts`，不是 `harness/types.ts`。[E: packages/agent/src/harness/agent-harness.ts:255] [E: packages/agent/src/harness/agent-harness.ts:388] 投递机制见 [subsys.agent-core.harness-events](../subsystems/agent-core/harness-events.md)。

`HarnessEvent` 在 payload 上叠加 `lane` / `recovery`：多数 lane 事件带 `lane`；`fault` / `value_update` 不带；`usage` 自带 `lane`；global `config_update` 不带 lane。[E: packages/agent/src/harness/agent-harness.ts:388]

| 类型名 / Variant | 字段/签名 | 语义 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `run_start` | `runId`; `startedAt` | 一条 lane 上一次 run 开始。[E: packages/agent/src/harness/agent-harness.ts:256] | `reduceLaneSnapshot` 据此打开 `operation.kind: "run"`。[E: packages/agent/src/harness/runtime/reducer.ts:28] | `packages/agent/src/harness/agent-harness.ts:256` |
| `run_resume` | `runId` | 从 deferred 恢复。[E: packages/agent/src/harness/agent-harness.ts:257] | reducer 删除 `operation.deferred`。[E: packages/agent/src/harness/runtime/reducer.ts:64] | `packages/agent/src/harness/agent-harness.ts:257` |
| `run_suspend` | `runId`; `reason: "deferred"`; `deferred`; `poll` | run 挂起等待 deferred。[E: packages/agent/src/harness/agent-harness.ts:258] | reducer 写入 `operation.deferred`。[E: packages/agent/src/harness/runtime/reducer.ts:69] | `packages/agent/src/harness/agent-harness.ts:258` |
| `operation_abort` | `operationId`; `steer`; `followUp` | 请求中止当前 operation。[E: packages/agent/src/harness/agent-harness.ts:259] | reducer 把 matching operation 标成 `aborting`。[E: packages/agent/src/harness/runtime/reducer.ts:59] | `packages/agent/src/harness/agent-harness.ts:259` |
| `run_end` | `runId`; `fromTipId`; `tipId`; `endedAt`; `status: completed\|aborted\|failed` | run 结束。failed 时带 `error: OperationError`。[E: packages/agent/src/harness/agent-harness.ts:260] | 没有独立的 `suspended` status；suspend 走 `run_suspend`。[E: packages/agent/src/harness/agent-harness.ts:258] | `packages/agent/src/harness/agent-harness.ts:260` |
| `fault` | `code`; `message` | harness 级存储/不变量故障。[E: packages/agent/src/harness/agent-harness.ts:264] | `Harness.fault` 发出后 close bus。[E: packages/agent/src/harness/runtime/harness.ts:317] | `packages/agent/src/harness/agent-harness.ts:264` |
| `handler_error` | `error`; `stack?`; `kind: hook\|event` | listener/hook 抛错的隔离报告。[E: packages/agent/src/harness/agent-harness.ts:265] | bus 对 `handler_error` 不再递归报错。[E: packages/agent/src/harness/events.ts:148] | `packages/agent/src/harness/agent-harness.ts:265` |
| `turn_start` | `runId`; `turnId` | harness turn 开始。[E: packages/agent/src/harness/agent-harness.ts:269] | reducer 忽略（不改 snapshot）。[E: packages/agent/src/harness/runtime/reducer.ts:226] | `packages/agent/src/harness/agent-harness.ts:269` |
| `turn_end` | `runId`; `turnId`; `message`; `toolResults` | harness turn 结束。[E: packages/agent/src/harness/agent-harness.ts:271] | reducer 忽略。[E: packages/agent/src/harness/runtime/reducer.ts:227] | `packages/agent/src/harness/agent-harness.ts:271` |
| `retry_scheduled` | `runId`; `step`; `attempt`; `maxAttempts`; `delayMs`; `notBefore`; `errorMessage` | 安排一次 retry。[E: packages/agent/src/harness/agent-harness.ts:278] | reducer 写入 `operation.retry`。[E: packages/agent/src/harness/runtime/reducer.ts:76] | `packages/agent/src/harness/agent-harness.ts:278` |
| `retry_start` / `retry_end` | `runId`; `step`; `attempt`（end 带 `success` / `finalError?`） | retry 开始/结束。[E: packages/agent/src/harness/agent-harness.ts:287] [E: packages/agent/src/harness/agent-harness.ts:289] | reducer 删除 `operation.retry`。[E: packages/agent/src/harness/runtime/reducer.ts:87] | `packages/agent/src/harness/agent-harness.ts:287` |
| `message_start` | `runId?`; `message` | 一条 message 开始。[E: packages/agent/src/harness/agent-harness.ts:296] | reducer 只在 pending assistant 时写入 `streamingMessage`。[E: packages/agent/src/harness/runtime/reducer.ts:93] | `packages/agent/src/harness/agent-harness.ts:296` |
| `message_update` | `runId`; `message`; `event`; `frame?` | streaming 更新。字段名是 `event`，不是 `assistantMessageEvent`。[E: packages/agent/src/harness/agent-harness.ts:298] | reducer 刷新 `streamingMessage`。[E: packages/agent/src/harness/runtime/reducer.ts:105] | `packages/agent/src/harness/agent-harness.ts:298` |
| `message_end` | `runId?`; `message`; `entryId?` | message 完成。[E: packages/agent/src/harness/agent-harness.ts:304] | reducer 删除 `streamingMessage`。[E: packages/agent/src/harness/runtime/reducer.ts:111] | `packages/agent/src/harness/agent-harness.ts:304` |
| `tool_start` | `runId`; `turnId`; `toolCallId`; `toolName`; `args` | 一个 tool 开始。[E: packages/agent/src/harness/agent-harness.ts:306] | reducer upsert `runningTools`。[E: packages/agent/src/harness/runtime/reducer.ts:117] | `packages/agent/src/harness/agent-harness.ts:306` |
| `tool_update` | `runId`; `turnId`; `toolCallId`; `toolName`; `partialResult` | tool 部分结果。[E: packages/agent/src/harness/agent-harness.ts:314] | 只更新 `status: "running"` 的那条。[E: packages/agent/src/harness/runtime/reducer.ts:128] | `packages/agent/src/harness/agent-harness.ts:314` |
| `tool_end` | `runId`; `turnId`; `toolCallId`; `toolName`; `result`; `isError`; `terminate` | tool 完成。[E: packages/agent/src/harness/agent-harness.ts:322] | reducer 标成 `settled`。[E: packages/agent/src/harness/runtime/reducer.ts:134] | `packages/agent/src/harness/agent-harness.ts:322` |
| `entry_added` | `entry` | session tree 追加一条 `Entry`。[E: packages/agent/src/harness/agent-harness.ts:331] | compaction 会 splice transcript；否则 push 并更新 tip。[E: packages/agent/src/harness/runtime/reducer.ts:150] | `packages/agent/src/harness/agent-harness.ts:331` |
| `queue_update` | `queues` | lane inbox 投影。[E: packages/agent/src/harness/agent-harness.ts:332] | reducer 整表替换 `snapshot.queues`。[E: packages/agent/src/harness/runtime/reducer.ts:165] | `packages/agent/src/harness/agent-harness.ts:332` |
| `value_update` | `session_name` 或 `entry_label` | 会话名 / entry label 变更。[E: packages/agent/src/harness/agent-harness.ts:333] | reducer 忽略。[E: packages/agent/src/harness/runtime/reducer.ts:228] | `packages/agent/src/harness/agent-harness.ts:333` |
| `config_update` | `property` + value/previous | model / thinking / tools / stream / retry / compaction / queue mode 等。[E: packages/agent/src/harness/agent-harness.ts:337] | reducer 只应用带 matching `lane` 的 model/thinking/activeTools。[E: packages/agent/src/harness/runtime/reducer.ts:171] | `packages/agent/src/harness/agent-harness.ts:337` |
| `compaction_start` / `compaction_end` | `runId`; `reason: manual\|threshold\|overflow` | 压缩开始/结束。[E: packages/agent/src/harness/agent-harness.ts:357] [E: packages/agent/src/harness/agent-harness.ts:362] | start 只在 `operation === null` 时打开 compaction operation。[E: packages/agent/src/harness/runtime/reducer.ts:38] | `packages/agent/src/harness/agent-harness.ts:357` |
| `navigation_start` / `navigation_end` | `runId`; tip 字段 | 导航开始/结束。[E: packages/agent/src/harness/agent-harness.ts:367] [E: packages/agent/src/harness/agent-harness.ts:368] | `navigation_end` 让 reducer 返回 `"rebase"`。[E: packages/agent/src/harness/runtime/reducer.ts:220] | `packages/agent/src/harness/agent-harness.ts:367` |
| `lane_created` | `at` | 新 lane 被 attach。[E: packages/agent/src/harness/agent-harness.ts:372] | reducer 忽略。[E: packages/agent/src/harness/runtime/reducer.ts:229] | `packages/agent/src/harness/agent-harness.ts:372` |
| `usage` | `lane`; `row`; `totals` | 一条 usage 入账后的 totals。[E: packages/agent/src/harness/agent-harness.ts:373] | reducer 写 `snapshot.stats.usage`。[E: packages/agent/src/harness/runtime/reducer.ts:168] | `packages/agent/src/harness/agent-harness.ts:373` |
| `HarnessEvent` | payload + `lane?` + `recovery?` | bus 事件总 union。[E: packages/agent/src/harness/agent-harness.ts:388] | 不是 `AgentEvent` 的超集。[I] | `packages/agent/src/harness/agent-harness.ts:388` |
| `HarnessEventType` | `HarnessEvent["type"]` | payload discriminator 字面量集合。[E: packages/agent/src/harness/agent-harness.ts:413] | `Events.on` 用它做 type 参数。[E: packages/agent/src/harness/agent-harness.ts:420] | `packages/agent/src/harness/agent-harness.ts:413` |

## 订阅面

| API | 事件 union | 回放 / snapshot | 源码证据 |
| --- | --- | --- | --- |
| `Agent.subscribe(listener)` | `AgentEvent` | 无回放；`processEvents` 把当前 run 的 `AbortSignal` 一并传入并 await。[E: packages/agent/src/agent.ts:250] [E: packages/agent/src/agent.ts:589] | `packages/agent/src/agent.ts:250` |
| `HarnessEventBus.on(type, listener)` | 单个 `HarnessEvent` type | 只把 wrapper 加进 type set，无历史回放。[E: packages/agent/src/harness/events.ts:14] [E: packages/agent/src/harness/events.ts:26] | `packages/agent/src/harness/events.ts:14` |
| `HarnessEventBus.watch(snapshot, filter)` | filter 后的 `HarnessEvent` | 先订阅再缓冲；`start()` 刷 buffer；可选 `resnapshot`。[E: packages/agent/src/harness/events.ts:48] [E: packages/agent/src/harness/events.ts:198] | `packages/agent/src/harness/events.ts:48` |
| `AgentHarness.events.on` | typed `HarnessEvent` | `Harness.events` 就是这个 bus。[E: packages/agent/src/harness/runtime/harness.ts:45] [E: packages/agent/src/harness/agent-harness.ts:610] | `packages/agent/src/harness/runtime/harness.ts:45` |
| `AgentLane.watch` | filter 后的 lane 事件 | 拍 `LaneSnapshot`，filter 本 lane 或 `usage`。[E: packages/agent/src/harness/runtime/lane.ts:1705] [E: packages/agent/src/harness/runtime/lane.ts:1709] | `packages/agent/src/harness/runtime/lane.ts:1705` |

## 关系边界

`subsys.agent-core.turn-control` 解释低层 `AgentEvent` 的 emit 顺序和 `terminate` 如何结束 run；本节点只声明静态 payload。[E: packages/agent/src/types.ts:431] [I]

`subsys.agent-core.harness-events` 解释 `HarnessEventBus` 的 listener / watch 算法；本节点只列 `HarnessEvent` 实例。[E: packages/agent/src/harness/agent-harness.ts:388] [I]

`ref.coding-agent.session-events` 覆盖产品层 `AgentSessionEvent`。本节点不展开 coding-agent UI/RPC event。[I]

`ref.agent.message-types` 覆盖 `AgentMessage` union；本节点只在 payload 里引用该类型。[I]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/events.ts
- packages/agent/src/harness/runtime/harness.ts
- packages/agent/src/harness/runtime/lane.ts
- packages/agent/src/harness/runtime/reducer.ts
- packages/agent/src/harness/types.ts

## 相关

- [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md)：`runLoop` 如何 emit 和消费 `AgentEvent`。
- [subsys.agent-core.harness-events](../subsystems/agent-core/harness-events.md)：`HarnessEventBus` 订阅与 watch。
- [ref.coding-agent.session-events](session-events.md)：coding-agent `AgentSessionEvent` 目录。
