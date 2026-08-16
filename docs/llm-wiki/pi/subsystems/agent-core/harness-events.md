---
id: subsys.agent-core.harness-events
title: Harness 事件订阅与 watch
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/events.ts
  - packages/agent/test/harness/events.test.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/index.ts
  - packages/agent/src/agent.ts
symbols:
  - HarnessEvent
  - HarnessEventBus
  - Events
  - WatchHandle
  - RunStartEvent
  - RunEndEvent
related:
  - subsys.agent-core.agent-harness-lifecycle
  - ref.agent.agent-events
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.harness-events` 说明 `HarnessEventBus` 如何把 `run_start` / `run_end` 同时送给 typed direct listeners 与带 snapshot 的 buffered watches。

## 能回答的问题

- `HarnessEvent` 当前有哪些 variant 和字段？
- `on(type, listener)` 会不会回放历史事件？
- `watch(captureSnapshot)` 如何避免 snapshot 与后续事件之间的缺口？
- `start()` 刷新 buffer 时若再次 emit，顺序如何保持？
- `AgentHarness.events` 现在是不是这个 bus？

## 职责边界

`packages/agent/src/harness/events.ts` 只定义 harness 自有 run 生命周期事件和内存 bus。它不发射 `AgentEvent`，也不实现 session persistence。[E: packages/agent/src/harness/events.ts:15] [E: packages/agent/src/harness/events.ts:37]

`HarnessEventBus` 实现同文件的 `Events` 接口：`on()` 按 type 订阅未来事件。[E: packages/agent/src/harness/events.ts:20] [E: packages/agent/src/harness/events.ts:37] `watch()` 是 bus 上的额外方法，不在 `Events` 接口里。[E: packages/agent/src/harness/events.ts:20] [E: packages/agent/src/harness/events.ts:75]

`packages/agent/src/index.ts` 没有再导出 `events.ts`。调用方必须直接引用该模块，或等其它入口接线。[E: packages/agent/src/index.ts:45] [I]

`AgentHarness.events` 是 `agent-harness.ts` 里另一个同名 `Events` 接口，由 `UnavailableRegistry` 实现，`on()` 抛 `HarnessNotImplemented`。它不是 `HarnessEventBus`。[E: packages/agent/src/harness/agent-harness.ts:215] [E: packages/agent/src/harness/agent-harness.ts:327] [E: packages/agent/src/harness/agent-harness.ts:233]

## 数据模型

`RunStartEvent`：`type: "run_start"`，字段 `lane: string`、`runId: string`。[E: packages/agent/src/harness/events.ts:1] [E: packages/agent/src/harness/events.ts:2] [E: packages/agent/src/harness/events.ts:3] [E: packages/agent/src/harness/events.ts:4]

`RunEndEvent`：`type: "run_end"`，字段 `lane`、`runId`、`outcome: "completed" | "aborted" | "failed"`、`leafId: string`。[E: packages/agent/src/harness/events.ts:7] [E: packages/agent/src/harness/events.ts:8] [E: packages/agent/src/harness/events.ts:9] [E: packages/agent/src/harness/events.ts:10] [E: packages/agent/src/harness/events.ts:11] [E: packages/agent/src/harness/events.ts:12] 没有 `suspended` outcome。

`HarnessEvent` 就是这两个 variant 的 union。`HarnessEventType` 是 `"run_start" | "run_end"`。`HarnessEventOfType<T>` 用 `Extract` 收窄。[E: packages/agent/src/harness/events.ts:15] [E: packages/agent/src/harness/events.ts:16] [E: packages/agent/src/harness/events.ts:17]

`HarnessEventListener` 允许 `void | Promise<void>`。[E: packages/agent/src/harness/events.ts:18] `emit()` 对 listener 返回值做 `void listener(event)`，不 await。[E: packages/agent/src/harness/events.ts:69]

`WatchHandle<TSnapshot>` 暴露 `snapshot`、`start(listener)`、`unsubscribe()`。[E: packages/agent/src/harness/events.ts:31] [E: packages/agent/src/harness/events.ts:32] [E: packages/agent/src/harness/events.ts:33] [E: packages/agent/src/harness/events.ts:34]

## Direct listeners

`on(type, listener)` 为该 type 拿或建一个 `Set`，再包一层 `receive`：仅当 `event.type === type` 时调用 typed listener。[E: packages/agent/src/harness/events.ts:50] [E: packages/agent/src/harness/events.ts:55] [E: packages/agent/src/harness/events.ts:56] [E: packages/agent/src/harness/events.ts:58]

返回的 unsubscribe 从 set 删除这个 wrapper；set 空了就从 map 删掉该 type。[E: packages/agent/src/harness/events.ts:59] [E: packages/agent/src/harness/events.ts:60] [E: packages/agent/src/harness/events.ts:61]

`on()` 只 `listeners.add(receive)`，没有遍历历史事件或构造 snapshot 的路径。[E: packages/agent/src/harness/events.ts:58] 测试：先 `on("run_start")`，emit start 与 end，unsubscribe 后再 emit start，direct 数组只留下第一次 start。[E: packages/agent/test/harness/events.test.ts:31] [E: packages/agent/test/harness/events.test.ts:36]

## Buffered watches

`watch(captureSnapshot)` 先注册内部 `receive`：若 `start()` 已安装 listener 就转发，否则 `buffered.push(event)`。[E: packages/agent/src/harness/events.ts:76] [E: packages/agent/src/harness/events.ts:78] [E: packages/agent/src/harness/events.ts:79] [E: packages/agent/src/harness/events.ts:80] [E: packages/agent/src/harness/events.ts:82] 然后才调用 `captureSnapshot()` 得到 `snapshot`。[E: packages/agent/src/harness/events.ts:83]

因此 snapshot 捕获期间发生的 emit 会进 buffer，不会丢在 snapshot 与 `start()` 之间。测试在 `captureSnapshot` 里 emit `run_start`，`start()` 前 `received` 仍为空，`start()` 后先刷出这条 start。[E: packages/agent/test/harness/events.test.ts:43] [E: packages/agent/test/harness/events.test.ts:51] [E: packages/agent/test/harness/events.test.ts:56]

`start(nextListener)` 在赋值 `listener` 之前先排空 buffer。循环写法是：只要 `buffered.length > 0`，就取出当前数组、换成新空数组，再逐条 `void nextListener(event)`。flush 期间新 emit 仍因 `listener` 未设置而进下一轮 buffer，从而保持顺序。[E: packages/agent/src/harness/events.ts:87] [E: packages/agent/src/harness/events.ts:90] [E: packages/agent/src/harness/events.ts:91] [E: packages/agent/src/harness/events.ts:92] [E: packages/agent/src/harness/events.ts:94]

`unsubscribe()` 从 `watchListeners` 删除 `receive` 并清空 buffer。之后的 emit 不再到达该 watch。测试在 unsubscribe 后再 emit start，`received` 不再增长。[E: packages/agent/src/harness/events.ts:96] [E: packages/agent/src/harness/events.ts:97] [E: packages/agent/src/harness/events.ts:98] [E: packages/agent/test/harness/events.test.ts:61] [E: packages/agent/test/harness/events.test.ts:63]

watch listener 收全部 `HarnessEvent`，不像 `on()` 按 type 过滤。测试中同一个 watch 按顺序收到 start、end、再一次 start。[E: packages/agent/src/harness/events.ts:72] [E: packages/agent/test/harness/events.test.ts:37]

## emit 分发

`emit(event)` 先遍历该 type 的 direct set，再遍历全部 watch listeners。[E: packages/agent/src/harness/events.ts:66] [E: packages/agent/src/harness/events.ts:69] [E: packages/agent/src/harness/events.ts:72] 两路都不 await。源码没有把 listener 异常变成 bus 级错误；未捕获 reject 会变成未处理 Promise。[E: packages/agent/src/harness/events.ts:69] [I]

## 设计动机与权衡

direct `on()` 是 fire-and-forget 订阅，适合只关心未来 `run_start` 或 `run_end` 的旁路观察者。`watch()` 用“先订阅再拍 snapshot”填缺口，适合需要当前 leaf/lane 状态再跟上后续 run 的 UI。[E: packages/agent/src/harness/events.ts:58] [E: packages/agent/src/harness/events.ts:82] [E: packages/agent/src/harness/events.ts:83] [I]

`start()` 延迟安装 live listener，是为了让调用方先读 `snapshot` 再决定如何合并 buffer。[E: packages/agent/src/harness/events.ts:87] [I]

## Gotcha

- `on()` 的 wrapper 用 `event.type === type` 再分发；unsubscribe 必须删 wrapper 而不是原始 listener，所以同一 listener 函数注册两次会有两份 wrapper。[E: packages/agent/src/harness/events.ts:55] [E: packages/agent/src/harness/events.ts:60] [I]
- watch 在 `start()` 之前会无限缓冲；长时间不 `start()` 也不 `unsubscribe()` 会积压事件。[E: packages/agent/src/harness/events.ts:80] [I]
- `AgentHarness.watch()` / `watchSession()` 仍是 `unavailable()`，不会返回这个 `WatchHandle`。[E: packages/agent/src/harness/agent-harness.ts:440] [E: packages/agent/src/harness/agent-harness.ts:502]

## 跨包边界

本模块属于 `pi-agent-core` harness 层。`AgentEvent` 仍由 `Agent.subscribe()` 投递；coding-agent 的 `AgentSessionEvent` 是产品层另一套 union。字段目录在 [ref.agent.agent-events](../../reference/agent-events.md)。[E: packages/agent/src/agent.ts:250] [I]

## Sources

- packages/agent/src/harness/events.ts
- packages/agent/test/harness/events.test.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/index.ts
- packages/agent/src/agent.ts

## 相关

- [subsys.agent-core.agent-harness-lifecycle](agent-harness-lifecycle.md)：`AgentHarness.events` 仍是 unimplemented registry。
- [ref.agent.agent-events](../../reference/agent-events.md)：`AgentEvent` 与 `HarnessEvent` 逐 variant 目录。
