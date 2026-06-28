---
id: subsys.coding-agent.event-bus
title: 事件总线(pub/sub)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/event-bus.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/index.ts
symbols:
  - EventBus
  - EventBusController
  - createEventBus
related:
  - subsys.coding-agent.extension-runner
evidence: explicit
status: verified
updated: 5a073885
---

> `EventBus` 是 pi-coding-agent 给 extensions 共享的轻量 pub/sub: publisher 用 string channel 和 `unknown` payload 发事件, subscriber 注册 handler 并拿到 unsubscribe function。

## 能回答的问题

- `EventBus` 暴露哪些最小 API, payload 有没有 schema?
- `createEventBus()` 怎样用 Node `EventEmitter` 实现 emit/on/clear?
- extension 的 `pi.events` 从哪里来, 生命周期由谁持有?
- handler 抛错时会不会中断 publisher 或其他 listener?
- `EventBusController.clear()` 为什么不是 extension API 的一部分?
- 这个 event bus 与 `ExtensionRunner` 的 extension hook dispatch 有什么区别?

## 职责边界

`EventBus` 只覆盖 inter-extension communication 的 shared bus, 不覆盖 pi 自身的 extension hooks。extension hooks 是 `pi.on("session_start", handler)` 这类注册, 由 `ExtensionRunner` 按 typed extension events 调用; event bus 是 `pi.events.emit(channel, data)` / `pi.events.on(channel, handler)` 这类任意 channel 的 side channel [E: packages/coding-agent/src/core/extensions/loader.ts:220] [E: packages/coding-agent/src/core/extensions/loader.ts:360] [I]。

`EventBus` 的 channel 是普通 `string`, payload 是 `unknown`, handler 只收到 payload 而没有 sender、context 或 event object;源码没有 channel registry、payload validation、priority、once listener、wildcard matching 或 replay storage [E: packages/coding-agent/src/core/event-bus.ts:3] [E: packages/coding-agent/src/core/event-bus.ts:4] [E: packages/coding-agent/src/core/event-bus.ts:5] [I]。

`EventBusController` 在 `EventBus` 之外额外暴露 `clear()`, 但 extension API 的 `events` 字段类型是 `EventBus`, 所以 extension 正常只能 emit/on/unsubscribe, 不能直接清空整个 bus [E: packages/coding-agent/src/core/event-bus.ts:8] [E: packages/coding-agent/src/core/event-bus.ts:9] [E: packages/coding-agent/src/core/extensions/types.ts:1355]。

## 关键文件

- `packages/coding-agent/src/core/event-bus.ts`: 定义 `EventBus`、`EventBusController` 和 `createEventBus()` 的完整实现 [E: packages/coding-agent/src/core/event-bus.ts:3] [E: packages/coding-agent/src/core/event-bus.ts:8] [E: packages/coding-agent/src/core/event-bus.ts:12]。
- `packages/coding-agent/src/core/resource-loader.ts`: `DefaultResourceLoader` 接收 optional `eventBus`, 缺省创建一个 bus, 并把同一个 bus 传入 extension loading path [E: packages/coding-agent/src/core/resource-loader.ts:129] [E: packages/coding-agent/src/core/resource-loader.ts:221] [E: packages/coding-agent/src/core/resource-loader.ts:505] [E: packages/coding-agent/src/core/resource-loader.ts:525] [E: packages/coding-agent/src/core/resource-loader.ts:548]。
- `packages/coding-agent/src/core/extensions/loader.ts`: extension loader 把 bus 注入 `ExtensionAPI.events`, path extensions 与 inline factories 都走这个注入点 [E: packages/coding-agent/src/core/extensions/loader.ts:212] [E: packages/coding-agent/src/core/extensions/loader.ts:216] [E: packages/coding-agent/src/core/extensions/loader.ts:360] [E: packages/coding-agent/src/core/extensions/loader.ts:441] [E: packages/coding-agent/src/core/extensions/loader.ts:464]。
- `packages/coding-agent/src/core/extensions/types.ts`: public `ExtensionAPI` 类型把 `events` 描述为 shared event bus for extension communication [E: packages/coding-agent/src/core/extensions/types.ts:1355]。
- `packages/coding-agent/src/index.ts`: package root re-export `createEventBus`, `EventBus` 和 `EventBusController`, 因此外部 embedding/test code 可以显式构造或传入 bus [E: packages/coding-agent/src/index.ts:60] [I]。

## 数据模型

`EventBus` 是两个 method 的 structural interface: `emit(channel: string, data: unknown): void` 和 `on(channel: string, handler: (data: unknown) => void): () => void` [E: packages/coding-agent/src/core/event-bus.ts:3] [E: packages/coding-agent/src/core/event-bus.ts:4] [E: packages/coding-agent/src/core/event-bus.ts:5]。这意味着 channel 命名、payload shape、versioning 和 type narrowing 都是 extension 作者之间的约定, 不是 core event-bus 层强制的 contract [I]。

`EventBusController` extends `EventBus` 并添加 `clear(): void`;`createEventBus()` 返回 controller, 但调用链中多数参数只接受 `EventBus`, 例如 resource-loader options 和 extension loader parameters [E: packages/coding-agent/src/core/event-bus.ts:8] [E: packages/coding-agent/src/core/event-bus.ts:9] [E: packages/coding-agent/src/core/event-bus.ts:12] [E: packages/coding-agent/src/core/resource-loader.ts:129] [E: packages/coding-agent/src/core/extensions/loader.ts:216]。

`createEventBus()` 内部只创建一个 Node `EventEmitter`, 没有额外 map、queue 或 state snapshot;listener state 全部由 `EventEmitter` 持有 [E: packages/coding-agent/src/core/event-bus.ts:13] [I]。

## 控制流

1. `createEventBus@packages/coding-agent/src/core/event-bus.ts:12` 创建局部 `EventEmitter`, 然后返回包含 `emit`、`on` 和 `clear` 的 controller object [E: packages/coding-agent/src/core/event-bus.ts:12] [E: packages/coding-agent/src/core/event-bus.ts:13] [E: packages/coding-agent/src/core/event-bus.ts:14]。
2. `emit@packages/coding-agent/src/core/event-bus.ts:15` 直接调用 `emitter.emit(channel, data)`;method 自身返回 `void`, 没有把 listener return values 暴露给 publisher [E: packages/coding-agent/src/core/event-bus.ts:4] [E: packages/coding-agent/src/core/event-bus.ts:15] [E: packages/coding-agent/src/core/event-bus.ts:16]。
3. `on@packages/coding-agent/src/core/event-bus.ts:18` 为每个 handler 包一层 `safeHandler`, 该 wrapper `await handler(data)` 并捕获异常 [E: packages/coding-agent/src/core/event-bus.ts:18] [E: packages/coding-agent/src/core/event-bus.ts:19] [E: packages/coding-agent/src/core/event-bus.ts:21] [E: packages/coding-agent/src/core/event-bus.ts:22]。
4. handler 异常不会从 `safeHandler` 继续抛给 publisher;它被写到 `console.error` 并带上 channel 名称 [E: packages/coding-agent/src/core/event-bus.ts:21] [E: packages/coding-agent/src/core/event-bus.ts:22] [E: packages/coding-agent/src/core/event-bus.ts:23]。
5. `on()` 把 `safeHandler` 注册到 `EventEmitter`, 并返回一个 closure;调用该 closure 会用同一个 `safeHandler` 执行 `emitter.off(channel, safeHandler)` [E: packages/coding-agent/src/core/event-bus.ts:26] [E: packages/coding-agent/src/core/event-bus.ts:27]。
6. `clear()` 调用 `emitter.removeAllListeners()`, 一次性移除所有 channel 的所有 listeners [E: packages/coding-agent/src/core/event-bus.ts:29] [E: packages/coding-agent/src/core/event-bus.ts:30]。
7. `DefaultResourceLoader.constructor@resource-loader.ts:217` 把调用方传入的 bus 保存到 loader, 没传时使用 `createEventBus()`;后续 `loadExtensionsCached()` 和 `loadExtensionFromFactory()` 都使用该字段, 让同一次 loader/runtime 下的 extensions 共享同一个 bus [E: packages/coding-agent/src/core/resource-loader.ts:217] [E: packages/coding-agent/src/core/resource-loader.ts:221] [E: packages/coding-agent/src/core/resource-loader.ts:505] [E: packages/coding-agent/src/core/resource-loader.ts:902] [I]。
8. `createExtensionAPI@extensions/loader.ts:212` 把传入 bus 挂到 `api.events`;path extension factory 和 inline extension factory 都收到这个 API object [E: packages/coding-agent/src/core/extensions/loader.ts:212] [E: packages/coding-agent/src/core/extensions/loader.ts:360] [E: packages/coding-agent/src/core/extensions/loader.ts:441] [E: packages/coding-agent/src/core/extensions/loader.ts:465]。

## 设计动机与权衡

event-bus 是 deliberately small API: 它把 extension-to-extension signaling 留给 string channel 和 arbitrary payload, 避免 core 层维护一份新的 typed event catalog [E: packages/coding-agent/src/core/event-bus.ts:4] [E: packages/coding-agent/src/core/event-bus.ts:5] [I]。这个选择让 extension 作者容易创建私有 namespace, 但也意味着 typo、schema drift 和 listener ordering 都不能由 TypeScript 在 core 层兜底 [I]。

`safeHandler` 的设计偏向隔离 handler failure:一个 subscriber 抛错会被记录到 stderr, 不会通过 event-bus API 变成 publisher 的 return value 或 typed diagnostic [E: packages/coding-agent/src/core/event-bus.ts:21] [E: packages/coding-agent/src/core/event-bus.ts:23] [I]。如果调用方需要 block/transform/cancel 这类组合语义, 应走 `ExtensionRunner` 的专用 extension hooks, 例如 tool/input/context/session-before events, 而不是 event-bus channel [I]。

`emit()` 没有 `Promise` return type, `EventEmitter.emit()` 的 return value 也没有传出;因此 publisher 不能用 `await pi.events.emit(...)` 等待所有 async listeners 完成 [E: packages/coding-agent/src/core/event-bus.ts:4] [E: packages/coding-agent/src/core/event-bus.ts:15] [E: packages/coding-agent/src/core/event-bus.ts:16] [I]。这使 event-bus 更适合 notification / fan-out, 不适合需要同步 ack 或 ordered mutation 的工作流 [I]。

## Gotcha

- `handler` 的 TypeScript signature 写成 `(data: unknown) => void`, 但 wrapper 使用 `await handler(data)`;这能捕获实际返回 promise 的 async handler rejection, 但类型层不会告诉 publisher handler 是否完成 [E: packages/coding-agent/src/core/event-bus.ts:5] [E: packages/coding-agent/src/core/event-bus.ts:21] [I]。
- `clear()` 是 controller-only 管理能力;把 `createEventBus()` 返回值直接共享给不可信调用方时, 对方如果持有 controller 类型就能清空所有 listeners [E: packages/coding-agent/src/core/event-bus.ts:8] [E: packages/coding-agent/src/core/event-bus.ts:30] [I]。
- event-bus 不自动绑定 `ExtensionContext`;listener 只拿到 payload, 如果需要 UI/session/model 等 context, extension 必须自己在 extension hook 中保存或传递所需状态 [E: packages/coding-agent/src/core/event-bus.ts:5] [E: packages/coding-agent/src/core/extensions/types.ts:1355] [I]。

## 跨包边界

`EventBus` 属于 `pi-coding-agent` 产品层, public export 也来自 `@earendil-works/pi-coding-agent` package root;源码没有把该 bus 下沉到 `pi-agent-core` 或 `pi-ai` [E: packages/coding-agent/src/index.ts:60] [I]。

[subsys.coding-agent.extension-runner](extension-runner.md) 是 extension hook dispatch 的执行引擎: 它处理 session/tool/input/context 等 typed lifecycle events、handler ordering 和 result aggregation;本节点只描述 `pi.events` 这条任意 channel 的 pub/sub side channel [I]。

## Sources

- packages/coding-agent/src/core/event-bus.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/index.ts

## 相关

- [subsys.coding-agent.extension-runner](extension-runner.md): extension lifecycle hooks 的 typed dispatch、result aggregation 和 error handling。
