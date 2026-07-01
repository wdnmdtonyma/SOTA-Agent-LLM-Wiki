---
id: subsys.ai.lazy-loading
title: wire 客户端懒加载
kind: subsystem
tier: T2
pkg: ai
source: [packages/ai/src/api/lazy.ts]
symbols: [lazyApi, lazyStream]
related: [subsys.ai.wire-protocol-dispatch]
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.lazy-loading` 描述 `pi-ai` 的 wire API 懒加载薄层: `lazyApi(load)` 把异步 API module loader 包装成 `ProviderStreams`, `lazyStream(model, setup)` 先同步返回外层 assistant event stream,再把 setup 成功或失败接入同一个 stream 协议。

## 能回答的问题

- `lazyApi` 返回的 `ProviderStreams` 有哪些字段?
- `lazyApi` 的动态 import loader 在什么时候被等待?
- `lazyStream` 为什么能让 caller 先拿到 `AssistantMessageEventStream`?
- setup、auth 或 lazy module loading 失败时会发出什么 error event?
- `lazyApi` / `lazyStream` 和 `subsys.ai.wire-protocol-dispatch` 的边界是什么?

## 职责边界

`packages/ai/src/api/lazy.ts` 的显式可核表面是两个通用包装器: `lazyStream` 接收一个会产出 inner assistant event iterable 的 async `setup`, `lazyApi` 接收一个会产出 `ProviderStreams` 的 async `load`。[E: packages/ai/src/api/lazy.ts:39][E: packages/ai/src/api/lazy.ts:41][E: packages/ai/src/api/lazy.ts:63] 从本文件看,它没有 provider-specific payload builder 或 provider event normalization 分支。[I]

`lazyApi` 自身不选择 provider 或 wire protocol;wire protocol dispatch 的选择发生在 `subsys.ai.wire-protocol-dispatch` 覆盖的 provider/model 层,本节点只说明 dispatch 选中某个 `ProviderStreams` value 后,这个 value 如何延迟加载并调用目标 implementation。[I]

## 关键文件

- `packages/ai/src/api/lazy.ts`:定义 setup failure 的 assistant message shape、inner stream 转发、`lazyStream`、`lazyApi`。[E: packages/ai/src/api/lazy.ts:4][E: packages/ai/src/api/lazy.ts:25][E: packages/ai/src/api/lazy.ts:39][E: packages/ai/src/api/lazy.ts:63]

## 数据模型

`lazyStream(model, setup)` 的输入模型用于构造 setup error message: error message 会保留 `model.api`、`model.provider` 和 `model.id`,usage/cost 全部写零值,`stopReason` 写 `"error"`,并把 unknown error 转成 `errorMessage` 字符串。[E: packages/ai/src/api/lazy.ts:4][E: packages/ai/src/api/lazy.ts:8][E: packages/ai/src/api/lazy.ts:9][E: packages/ai/src/api/lazy.ts:10][E: packages/ai/src/api/lazy.ts:11][E: packages/ai/src/api/lazy.ts:19][E: packages/ai/src/api/lazy.ts:20]

`lazyApi(load)` 返回一个 `ProviderStreams` 对象 literal,其中定义 `stream(model, context, options)` 和 `streamSimple(model, context, options)` 两个字段;二者都把调用包进 `lazyStream`,然后在 async setup 内等待 `load()` 并转调目标 module 的同名字段。[E: packages/ai/src/api/lazy.ts:63][E: packages/ai/src/api/lazy.ts:64][E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]

`load` 的类型是 `() => Promise<ProviderStreams>`,generic `lazyApi` 只依赖 Promise-returning loader contract,并在 `stream` / `streamSimple` 的 async setup 内 `await load()` 后转调目标 stream 字段。[E: packages/ai/src/api/lazy.ts:63][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:68] 动态 import implementation module 的说法来自本文件注释与各 wire wrapper 的惯例,实际 import specifier 不在本节点 source 内。[I]

## 控制流

1. `lazyStream@packages/ai/src/api/lazy.ts:39` 先创建 `outer = new AssistantMessageEventStream()`,不等待 `setup` 完成就准备返回这个 outer stream。[E: packages/ai/src/api/lazy.ts:39][E: packages/ai/src/api/lazy.ts:43][E: packages/ai/src/api/lazy.ts:55]
2. `setup()` 成功 resolve 为 `inner` 后,`lazyStream` 调用 `forwardStream(outer, inner)`;`forwardStream` 逐个 `for await` 读取 inner events 并 `target.push(event)`,inner 结束后调用 `target.end()`。[E: packages/ai/src/api/lazy.ts:25][E: packages/ai/src/api/lazy.ts:27][E: packages/ai/src/api/lazy.ts:28][E: packages/ai/src/api/lazy.ts:30][E: packages/ai/src/api/lazy.ts:45][E: packages/ai/src/api/lazy.ts:47]
3. `setup()` reject 时,`lazyStream` 用 `createSetupErrorMessage(model, error)` 构造 terminal assistant message,向 outer stream push `{ type: "error", reason: "error", error: message }`,然后用同一个 message 调 `outer.end(message)`。[E: packages/ai/src/api/lazy.ts:49][E: packages/ai/src/api/lazy.ts:50][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:52]
4. `lazyApi.stream` 调用 `lazyStream(model, async () => (await load()).stream(model, context, options))`;因此 module loading 和目标 `stream` 调用都发生在 lazy setup 阶段,而 caller 先拿到 `AssistantMessageEventStream`。[E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:43][E: packages/ai/src/api/lazy.ts:55]
5. `lazyApi.streamSimple` 对 `streamSimple` 做同样包装,区别只在转调目标 `ProviderStreams.streamSimple` 字段。[E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]

## error / edge

setup error message 按 `AssistantMessage` 返回: `content` 是空数组,usage/cost 全为零,`timestamp` 在错误发生时写入,并把 `error instanceof Error ? error.message : String(error)` 保存到 `errorMessage`。[E: packages/ai/src/api/lazy.ts:4][E: packages/ai/src/api/lazy.ts:7][E: packages/ai/src/api/lazy.ts:11][E: packages/ai/src/api/lazy.ts:12][E: packages/ai/src/api/lazy.ts:13][E: packages/ai/src/api/lazy.ts:14][E: packages/ai/src/api/lazy.ts:15][E: packages/ai/src/api/lazy.ts:16][E: packages/ai/src/api/lazy.ts:17][E: packages/ai/src/api/lazy.ts:20][E: packages/ai/src/api/lazy.ts:21]

`lazyStream` 的失败分支覆盖 `setup()` reject。当 `lazyApi` 的 loader 或目标 stream 建立前的逻辑在 setup 内 reject 时,这些失败会被编码为 stream 内 `error` event。[E: packages/ai/src/api/lazy.ts:45][E: packages/ai/src/api/lazy.ts:49][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:52][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:68] auth resolution、lazy module loading 和 setup failure 同属该异步边界的说法来自源码注释,按注释-only 处理。[I]

`lazy.ts` 没有手写 module memoization state;从本文件能确认 `lazyApi` 每次 stream call 都会等待 `load()`。[E: packages/ai/src/api/lazy.ts:63][E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68] load dedupe 归给 host import cache 的说法来自源码注释,不是 `lazyApi` 自己缓存,按注释-only 处理。[I]

## 跨包边界

`subsys.ai.wire-protocol-dispatch` 覆盖 `Model.api` 如何选中一个 `ProviderStreams` implementation;`subsys.ai.lazy-loading` 覆盖被选中的 `ProviderStreams` 如何通过 `lazyApi(load)` 延迟加载 implementation module,以及 `lazyStream` 如何把 setup 成败统一投递到 `AssistantMessageEventStream`。[I]

`lazyStream` 属于 `ai` 包的 stream contract 边界:上层调用者可以按 assistant event stream 消费成功、失败和 final result,而不需要理解具体 provider module 是何时被 dynamic import 的。[E: packages/ai/src/api/lazy.ts:39][E: packages/ai/src/api/lazy.ts:43][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:55][I]

## Sources

- packages/ai/src/api/lazy.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `Model.api` 到 `ProviderStreams` implementation 的选择层,本节点描述选择后的懒加载与 setup error 编码。
