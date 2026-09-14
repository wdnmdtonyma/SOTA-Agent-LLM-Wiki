---
id: subsys.agent-core.harness-events
title: Harness 事件订阅与 watch
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/events.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/runtime/harness.ts
  - packages/agent/test/harness/execution-primitives.test.ts
  - packages/agent/src/index.ts
  - packages/agent/src/agent.ts
symbols:
  - HarnessEvent
  - HarnessEventPayload
  - HarnessEventBus
  - Events
  - WatchHandle
  - EventListener
related:
  - subsys.agent-core.agent-harness-lifecycle
  - ref.agent.agent-events
evidence: explicit
status: verified
updated: 71dca871bc
---

> `subsys.agent-core.harness-events` 说明 `HarnessEventBus` 如何把 typed `HarnessEvent` 同时送给 `on(type)` listeners 与带 snapshot / resnapshot 的 buffered watches。事件 shape 定义在 `agent-harness.ts`；bus 实现在 `events.ts`。`Harness` 构造时创建真实 bus，不再是 `UnavailableRegistry`。

## 能回答的问题

- `HarnessEvent` 当前有哪些 payload variant，谁带 `lane`？
- `on(type, listener)` 会不会回放历史事件？
- `watch(snapshot, filter)` 如何避免 snapshot 与后续事件之间的缺口？
- `emit` / `emitBatch` 如何串行、如何隔离 payload mutation？
- `AgentHarness.events` 现在是不是这个 bus？

## 职责边界

`packages/agent/src/harness/events.ts` 实现内存 bus。事件 union 与 `Events` / `WatchHandle` 合同写在 `agent-harness.ts`。[E: packages/agent/src/harness/events.ts:15] [E: packages/agent/src/harness/agent-harness.ts:255] [E: packages/agent/src/harness/agent-harness.ts:419]

`HarnessEventBus` 实现 `Events`：`on()` 按 type 订阅未来事件。[E: packages/agent/src/harness/events.ts:8] [E: packages/agent/src/harness/events.ts:14] `watch()` / `watchFromSnapshot()` 是 bus 上的额外方法，不在 `Events` 接口里。[E: packages/agent/src/harness/events.ts:48] [E: packages/agent/src/harness/events.ts:26] [E: packages/agent/src/harness/agent-harness.ts:419]

`packages/agent/src/index.ts` 没有再导出 `events.ts`。调用方从 `agent-harness.ts` 拿到类型，或直接引用 `events.ts`。[E: packages/agent/src/index.ts:43] [I]

`Harness.events` 就是这个 `HarnessEventBus`。`hooks` 错误也会 `emit({ type: "handler_error", kind: "hook", ... })`。[E: packages/agent/src/harness/runtime/harness.ts:45] [E: packages/agent/src/harness/runtime/harness.ts:47]

## 数据模型

`HarnessEventPayload` 是 payload 总 union（不带 `lane` / `recovery`）。主要 discriminator：

| type | 关键字段 |
| --- | --- |
| `run_start` | `runId`, `startedAt` |
| `run_resume` | `runId` |
| `run_suspend` | `runId`, `reason: "deferred"`, `deferred`, `poll` |
| `operation_abort` | `operationId`, `steer`, `followUp` |
| `run_end` | `runId`, `fromTipId`, `tipId`, `endedAt`, `status: completed\|aborted\|failed` |
| `fault` | `code`, `message` |
| `handler_error` | `error`, `stack?`, `kind: hook\|event` |
| `turn_start` / `turn_end` | `runId`, `turnId`（end 带 `message` / `toolResults`） |
| `retry_scheduled` / `retry_start` / `retry_end` | `runId`, `step`, `attempt` |
| `message_start` / `message_update` / `message_end` | `message`（update 带 `event` / `frame?`） |
| `tool_start` / `tool_update` / `tool_end` | `runId`, `turnId`, `toolCallId`, `toolName`（end 带 `result` / `isError` / `terminate`） |
| `entry_added` | `entry` |
| `queue_update` | `queues` |
| `value_update` | `session_name` 或 `entry_label` |
| `config_update` | `property` + 对应 value/previous |
| `compaction_start` / `compaction_end` | `runId`, `reason` |
| `navigation_start` / `navigation_end` | `runId`, tip 字段 |
| `lane_created` | `at` |
| `usage` | `lane`, `row`, `totals` |

[E: packages/agent/src/harness/agent-harness.ts:255] [E: packages/agent/src/harness/agent-harness.ts:260] [E: packages/agent/src/harness/agent-harness.ts:373]

`HarnessEvent` 在 payload 上叠加 `lane` / `recovery`：多数 lane 事件带 `lane: string` 与可选 `recovery?: true`；`fault` / `value_update` 不带 lane；`usage` 自带 lane 但不带 recovery；global `config_update`（tools/resources/streamOptions 等）不带 lane；`handler_error` 可带也可不带。[E: packages/agent/src/harness/agent-harness.ts:388]

`EventListener` 签名是 `(event, context) => void | Promise<void>`。[E: packages/agent/src/harness/agent-harness.ts:414] `WatchHandle<T>` 暴露 `snapshot`、`start(listener)`、`resnapshot(context)`、`unsubscribe()`。[E: packages/agent/src/harness/agent-harness.ts:181]

旧 `RunStartEvent` / `RunEndEvent` 具名 interface 已删除；`run_start` / `run_end` 仍是 payload variant，但 `run_end` 用 `status` 而不是 `outcome`，且含 `fromTipId` / `endedAt`。[E: packages/agent/src/harness/agent-harness.ts:256] [E: packages/agent/src/harness/agent-harness.ts:260]

## Direct listeners

`on(type, listener)` 在 closed 时 throw `closedError`。否则为该 type 拿或建一个 `Set`，再包一层 wrapper 调 typed listener。[E: packages/agent/src/harness/events.ts:4] [E: packages/agent/src/harness/events.ts:19] [E: packages/agent/src/harness/events.ts:26]

返回的 unsubscribe 从 set 删除这个 wrapper。`on()` 没有遍历历史事件或构造 snapshot 的路径。[E: packages/agent/src/harness/events.ts:27] [E: packages/agent/src/harness/events.ts:26]

## Buffered watches

`watch(snapshot, filter, context, resnapshot?)` 先 `installWatcher`，再返回 `WatchHandle`。内部 `watchListener` 只在 `filter(event)` 为真时 `watcher.push`。[E: packages/agent/src/harness/events.ts:48] [E: packages/agent/src/harness/events.ts:121]

`start(listener)` 只能调用一次：把 state 从 `buffering` 改成 `started`，再把已缓冲事件按 epoch enqueue。[E: packages/agent/src/harness/events.ts:198] [E: packages/agent/src/harness/events.ts:199] [E: packages/agent/src/harness/events.ts:204]

`buffering` 期间的 emit 进 `buffer`；`started` 后走 per-watcher delivery tail。`unsubscribe()` 清空 buffer 并摘掉 watch listener。测试：先 watch 再 emit `run_start:one`，`start()` 后先刷出 one，再 emit two；unsubscribe 后再 emit three 不再增长。[E: packages/agent/src/harness/events.ts:262] [E: packages/agent/src/harness/events.ts:246] [E: packages/agent/test/harness/execution-primitives.test.ts:370] [E: packages/agent/test/harness/execution-primitives.test.ts:381]

`resnapshot(context)` 要求调用方提供的 capture 调用 `markBoundary()`。boundary 之前的 in-flight 事件 drop，之后的 hold，snapshot 更新后再 push held 事件。[E: packages/agent/src/harness/events.ts:209] [E: packages/agent/src/harness/events.ts:239] [E: packages/agent/src/harness/events.ts:257] [E: packages/agent/test/harness/execution-primitives.test.ts:387]

`Lane.watch` 用 bus.watch：filter 是 `event.type === "usage" || !("lane" in event) || event.lane === this.name`，capture 先扫 transcript 再 `markBoundary`。[E: packages/agent/src/harness/runtime/lane.ts:1707] [E: packages/agent/src/harness/runtime/lane.ts:1711]

## emit 分发

`emit(event, context)` 转 `emitBatch([event], context)`。[E: packages/agent/src/harness/events.ts:30] closed 或空 batch 立刻 resolve。[E: packages/agent/src/harness/events.ts:36]

`emitBatch` 先对每条事件 `structuredClone`，并 `snapshotRecipients`（该 type 的 direct set + 全部 watch listeners），再挂到全局 `deliveryTail`。同一 batch 内事件按顺序 `deliver`。[E: packages/agent/src/harness/events.ts:38] [E: packages/agent/src/harness/events.ts:41] [E: packages/agent/src/harness/events.ts:134]

`deliver` **await** 每个 listener，传入再次 clone 的 payload。listener throw 且 `reportErrors` 时，再同步投递一条 `handler_error`（`kind: "event"`）；`handler_error` 自己不再递归报错。[E: packages/agent/src/harness/events.ts:146] [E: packages/agent/src/harness/events.ts:148] [E: packages/agent/src/harness/events.ts:159]

测试锁定：两个 `config_update` listener，第一个 mutate `value`，第二个仍看到原始 `["read"]`；并发 `emit` 按 process 顺序串行（one 整段结束后才 two）。[E: packages/agent/test/harness/execution-primitives.test.ts:464] [E: packages/agent/test/harness/execution-primitives.test.ts:483] [E: packages/agent/test/harness/execution-primitives.test.ts:486] [E: packages/agent/test/harness/execution-primitives.test.ts:507]

`close(error)` 记下 `closedError`，等 delivery tail 结束后清空 listeners。[E: packages/agent/src/harness/events.ts:50]

## 设计动机与权衡

direct `on()` 是按 type 的旁路订阅。`watch()` 用“先订阅再拍 snapshot / 可 resnapshot”填缺口，适合 UI 跟上当前 leaf 与后续 run。[E: packages/agent/src/harness/events.ts:26] [E: packages/agent/src/harness/events.ts:48] [I]

全局 delivery tail 让并发 `emit` 不交错；`structuredClone` 阻止 listener 互相污染 payload。[E: packages/agent/src/harness/events.ts:38] [E: packages/agent/src/harness/events.ts:146] [I]

## Gotcha

- `on()` 的 unsubscribe 删 wrapper 而不是原始 listener，同一函数注册两次会有两份 wrapper。[E: packages/agent/src/harness/events.ts:19] [E: packages/agent/src/harness/events.ts:27] [I]
- watch 在 `start()` 之前会缓冲；长时间不 `start()` 也不 `unsubscribe()` 会积压事件。[E: packages/agent/src/harness/events.ts:262] [I]
- `AgentHarness.watchSession()` 仍是 `SliceNotImplemented`，不会返回 session 级 `WatchHandle`。[E: packages/agent/src/harness/runtime/harness.ts:305]
- `packages/agent/test/harness/events.test.ts` 已删除；bus 测试在 `execution-primitives.test.ts` 的 `describe("HarnessEventBus")`。

## 跨包边界

本模块属于 `pi-agent-core` harness 层。低层 `AgentEvent` 仍由 `Agent.subscribe()` 投递；coding-agent 的 `AgentSessionEvent` 是产品层另一套 union。字段目录在 [ref.agent.agent-events](../../reference/agent-events.md)。[E: packages/agent/src/agent.ts:250]

## Sources

- packages/agent/src/harness/events.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/runtime/harness.ts
- packages/agent/src/harness/runtime/lane.ts
- packages/agent/test/harness/execution-primitives.test.ts
- packages/agent/src/index.ts
- packages/agent/src/agent.ts

## 相关

- [subsys.agent-core.agent-harness-lifecycle](agent-harness-lifecycle.md)：`Harness` 如何创建并关闭这个 bus。
- [ref.agent.agent-events](../../reference/agent-events.md)：`AgentEvent` 与 `HarnessEvent` 逐 variant 目录。
