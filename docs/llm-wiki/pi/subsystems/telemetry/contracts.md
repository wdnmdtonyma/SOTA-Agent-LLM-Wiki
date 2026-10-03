---
id: subsys.telemetry.contracts
title: pi-telemetry 契约与适配器
kind: subsystem
tier: T2
pkg: telemetry
source:
  - packages/telemetry/package.json
  - packages/telemetry/src/index.ts
  - packages/telemetry/src/memory.ts
  - packages/telemetry/src/noop.ts
  - packages/telemetry/src/testing/conformance.ts
  - packages/telemetry/src/testing/index.ts
  - packages/telemetry/src/testing/types.ts
  - packages/telemetry/README.md
  - packages/telemetry/test/conformance.test.ts
  - packages/telemetry/test/telemetry.test.ts
symbols:
  - TelemetryContext
  - TelemetrySpan
  - NOOP_TELEMETRY_CONTEXT
  - InMemoryTelemetryContext
  - createTypedSpanStarter
  - defineTelemetrySchema
  - createTelemetryAdapterConformance
related:
  - subsys.coding-agent.telemetry
  - subsys.durable.runtime
  - spine.agent-loop
  - spine.provider-stream
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.telemetry.contracts` 是 `@earendil-works/pi-telemetry` 的 vendor-neutral 契约层:显式 callback `TelemetryContext` / `TelemetrySpan`、共享 `NOOP_TELEMETRY_CONTEXT`、进程内 `InMemoryTelemetryContext`、typed schema 工具,以及 runner-independent adapter conformance。本包不包含 exporter、全局 current-span 或 backend SDK,也不包含已删除的 agent-core harness telemetry schema。

## 能回答的问题

- `TelemetryContext.startSpan()` 如何拥有 span 生命周期,调用方为什么看不到 `end()`?
- `NOOP_TELEMETRY_CONTEXT` 与 `InMemoryTelemetryContext` 在 admission、settlement、payload 上差在哪里?
- adapter 必须满足哪些可观察语义,`@earendil-works/pi-telemetry/testing` 测哪些组?
- `defineTelemetrySchema()` / `createTypedSpanStarter()` 做不做 runtime 校验?
- 本包是否导出 `startAiSpan()` / `HARNESS_TELEMETRY_SCHEMA`?
- 本节点与 `subsys.coding-agent.telemetry` 的 install/attribution 开关是不是同一套系统?

## 职责边界

`@earendil-works/pi-telemetry` 的 package description 是 “Vendor-neutral telemetry contracts and typed schema utilities for pi”。[E: packages/telemetry/package.json:3] 公开入口只有 `.` 与 `./testing`;根入口不依赖 Node assertion,testing 子路径才用 `node:assert/strict`。[E: packages/telemetry/package.json:8] [E: packages/telemetry/package.json:13] [E: packages/telemetry/src/testing/conformance.ts:1]

本包提供契约、noop、进程内 reference adapter、可序列化 schema 类型工具和 conformance suite。README 写明:没有 exporter、没有全局 current-span state、不依赖某个 telemetry backend。[E: packages/telemetry/README.md:11] `package.json` 只有 `devDependencies`,没有 `dependencies` 字段。[I]

README 还写:Pi packages 显式传递 telemetry context,并在各自包里定义 domain schema。[E: packages/telemetry/README.md:13] 本节点 source 只含 `packages/telemetry`,因此不把 `AI_TELEMETRY_SCHEMA` / `HARNESS_TELEMETRY_SCHEMA` / `startAiSpan` / `startHarnessSpan` 当作本包导出。那些 helper 曾属于已删除的 `packages/agent/src/harness/telemetry.ts`。[I]

本节点不是 [subsys.coding-agent.telemetry](../coding-agent/telemetry.md)。那个节点覆盖 `PI_TELEMETRY` / install ping / provider attribution headers / `PI_TIMING`,与本包的 span 契约无关。

## 关键文件

- `packages/telemetry/src/index.ts`:定义 `AttributeValue`、`SpanAttributes`、`SpanOptions`、`SpanStatus`、`TelemetryContext`、`TelemetrySpan`,以及 `defineTelemetrySchema()` / `createTypedSpanStarter()`。[E: packages/telemetry/src/index.ts:1] [E: packages/telemetry/src/index.ts:14] [E: packages/telemetry/src/index.ts:18] [E: packages/telemetry/src/index.ts:72] [E: packages/telemetry/src/index.ts:349]
- `packages/telemetry/src/noop.ts`:共享冻结 inert span,并把它同时当作 `NOOP_TELEMETRY_CONTEXT`。[E: packages/telemetry/src/noop.ts:11] [E: packages/telemetry/src/noop.ts:17] [E: packages/telemetry/src/noop.ts:20]
- `packages/telemetry/src/memory.ts`:`InMemoryTelemetryContext` 与 `RecordedTelemetrySpan` / `RecordedTelemetryEvent`。[E: packages/telemetry/src/memory.ts:11] [E: packages/telemetry/src/memory.ts:16] [E: packages/telemetry/src/memory.ts:192]
- `packages/telemetry/src/testing/types.ts`:`TelemetryAdapterFixture`、`TelemetryAdapterFixtureFactory`、`TelemetryAdapterConformanceCase`。[E: packages/telemetry/src/testing/types.ts:5] [E: packages/telemetry/src/testing/types.ts:11] [E: packages/telemetry/src/testing/types.ts:14]
- `packages/telemetry/src/testing/conformance.ts`:`createTelemetryAdapterConformance()`。[E: packages/telemetry/src/testing/conformance.ts:61]
- `packages/telemetry/src/testing/index.ts`:re-export conformance factory 与 fixture 类型。[E: packages/telemetry/src/testing/index.ts:1] [E: packages/telemetry/src/testing/index.ts:2]

## 数据模型

`AttributeValue` 只允许 `string | number | boolean` 及其 readonly 数组。[E: packages/telemetry/src/index.ts:1] `SpanAttributes` 是开放 bag,值可为 `undefined`。[E: packages/telemetry/src/index.ts:3] `SpanOptions` 只有必填 `name` 和可选 `attributes`。[E: packages/telemetry/src/index.ts:7] `SpanStatus` 是 `{ status: "ok" }` 或 `{ status: "error"; error?: { name: string; message: string } }`。[E: packages/telemetry/src/index.ts:12]

`TelemetryContext` 只有 `startSpan(options, callback): Promise<T>`。[E: packages/telemetry/src/index.ts:14] [E: packages/telemetry/src/index.ts:15] `TelemetrySpan` 扩展 `TelemetryContext`,再加 `addEvent`、`setAttributes`、`setStatus`。[E: packages/telemetry/src/index.ts:18] 因此一个 callback span 可以直接当作子 span 的 parent context 传入下一次 `startSpan()`。

公开 API 没有 `end()`。settlement 由 `startSpan()` 拥有:callback 同步返回、返回的 Promise resolve/reject、或同步 throw(转成以同一值 reject 的 Promise)时结束。[E: packages/telemetry/src/noop.ts:3] [E: packages/telemetry/src/memory.ts:169] [E: packages/telemetry/src/memory.ts:176] [E: packages/telemetry/README.md:103]

Schema 侧:`TelemetrySchemaDefinition` 含 `version` 与 `spans` map;`TelemetrySpanDefinition` 含 `description`、`parents`、`startAttributes`、`endAttributes`、可选 `events`、以及 `{ default: "ok"; errorWhen: string }`。[E: packages/telemetry/src/index.ts:57] [E: packages/telemetry/src/index.ts:66] `TelemetryParentDefinition` 三种:`any`、`root_or_external`、`{ kind: "spans"; spans: readonly string[] }`。[E: packages/telemetry/src/index.ts:52] parent 元数据是描述性 schema 数据,adapters 不需要理解 schema 对象。[E: packages/telemetry/README.md:357] [E: packages/telemetry/README.md:363]

`defineTelemetrySchema()` 是 typed identity:原样返回入参,不做 runtime validation 或 parent-rule 强制。[E: packages/telemetry/src/index.ts:72] [E: packages/telemetry/src/index.ts:73] [E: packages/telemetry/README.md:338]

## 控制流

### startSpan 生命周期

1. `TelemetryContext.startSpan@packages/telemetry/src/index.ts:15` 同步承认 callback 恰好一次,并把返回值包进 `Promise`。[E: packages/telemetry/src/noop.ts:4] [E: packages/telemetry/src/memory.ts:169] [E: packages/telemetry/src/testing/conformance.ts:73]
2. 同步 throw 变成 `Promise.reject(同一值)`;异步 rejection 保持同一 rejection value,包括 `undefined` 与 unreadable proxy。[E: packages/telemetry/src/noop.ts:6] [E: packages/telemetry/src/memory.ts:171] [E: packages/telemetry/src/testing/conformance.ts:93] [E: packages/telemetry/src/testing/conformance.ts:108]
3. 正常完成默认 `ok`;throw/reject 默认 `error`,除非 callback 期间已 `setStatus()`。重复 `setStatus()` last-write-wins,显式 status 不会被自动 error 覆盖。[E: packages/telemetry/src/memory.ts:96] [E: packages/telemetry/src/testing/conformance.ts:142] [E: packages/telemetry/src/testing/conformance.ts:172]
4. `setAttributes()` 合并:后写的已定义值覆盖同名键,`undefined` 忽略。[E: packages/telemetry/src/memory.ts:63] [E: packages/telemetry/src/memory.ts:66] [E: packages/telemetry/src/testing/conformance.ts:199]
5. settlement 之后的 `setAttributes` / `addEvent` / `setStatus` 以及在已 settle 的 memory parent 上 `startSpan` 子 span,对记录面是 inert;callback 仍会执行。[E: packages/telemetry/src/memory.ts:126] [E: packages/telemetry/src/memory.ts:142] [E: packages/telemetry/src/memory.ts:150] [E: packages/telemetry/src/memory.ts:158] [E: packages/telemetry/src/testing/conformance.ts:228] [E: packages/telemetry/src/testing/conformance.ts:240]

### Noop adapter

`startNoopSpan()` 同步调用 callback,再用 `Promise.resolve` / `Promise.reject` 包装结果。[E: packages/telemetry/src/noop.ts:3] `noopTelemetrySpan` 的 recording 方法是空函数,且 `Object.freeze`。[E: packages/telemetry/src/noop.ts:13] [E: packages/telemetry/src/noop.ts:17] `NOOP_TELEMETRY_CONTEXT` 就是这个同一对象,因此嵌套 `startSpan` 复用同一 inert span。[E: packages/telemetry/src/noop.ts:20] [E: packages/telemetry/test/telemetry.test.ts:164] noop 不检查、不保留 name / attributes / events / status;unreadable payload 也不会让它抛错。[E: packages/telemetry/test/telemetry.test.ts:187] [E: packages/telemetry/README.md:152]

### In-memory reference adapter

`InMemoryTelemetryContext` 每个实例自带 `spans`、`nextSpanId` 从 1、`nextEndSequence` 从 1。[E: packages/telemetry/src/memory.ts:193] 根 `startSpan()` 以 `parent === undefined` 进入 `startInMemorySpan()`。[E: packages/telemetry/src/memory.ts:200] 新建 span 失败或 parent 已 settle 时,回退到 `NOOP_TELEMETRY_CONTEXT.startSpan()`,保证业务 callback 仍执行一次。[E: packages/telemetry/src/memory.ts:126] [E: packages/telemetry/src/memory.ts:132]

`getSpans()` 按 start 顺序返回 detached snapshot:复制 attributes / events / status,不暴露可变内部状态,也不记录 timestamp。[E: packages/telemetry/src/memory.ts:204] [E: packages/telemetry/src/memory.ts:205] [E: packages/telemetry/test/conformance.test.ts:23] [E: packages/telemetry/README.md:174] 未 settle 的 span 没有 `endSequence`。[E: packages/telemetry/src/memory.ts:216] [E: packages/telemetry/test/conformance.test.ts:34]

自动 error status 只提取 `Error` 的 `name`/`message`;检查 `instanceof Error` 失败则退成无 details 的 `{ status: "error" }`。[E: packages/telemetry/src/memory.ts:78] [E: packages/telemetry/src/memory.ts:83] recording 方法把 copy/merge 包在 try/catch 里,畸形 payload 被吞掉。[E: packages/telemetry/src/memory.ts:143] [E: packages/telemetry/src/memory.ts:151] [E: packages/telemetry/src/memory.ts:159]

### Typed schema 与 starter

`createTypedSpanStarter(telemetryContext, schemas)` 只把 schema 用于类型推断:实现立刻丢掉 `_schemas`,调用 `bindTypedSpanStarter(telemetryContext)`。[E: packages/telemetry/src/index.ts:349] [E: packages/telemetry/src/index.ts:351] [E: packages/telemetry/src/index.ts:353] 运行时 starter 就是 `telemetryContext.startSpan({ name, attributes }, ...)`,并把同一 schemas 再 bind 到 callback span,作为 `startChildSpan`。[E: packages/telemetry/src/index.ts:335] [E: packages/telemetry/src/index.ts:338] 跨 schema 的字面量重复 span 名在类型层拒绝;`as const` / inline tuple 保留 tuple 类型。[E: packages/telemetry/src/index.ts:293] [E: packages/telemetry/test/telemetry.test.ts:150]

测试证明:unreadable schema 数组不会让 `createTypedSpanStarter()` 抛错,因为 schema 值不被读取。[E: packages/telemetry/test/telemetry.test.ts:122]

## Adapter conformance

`createTelemetryAdapterConformance(factory)` 返回只读 case 列表。每个 case 的 `run()` 用 `await using fixture = await factory()` 拿一份新鲜 adapter,再执行断言。[E: packages/telemetry/src/testing/conformance.ts:61] [E: packages/telemetry/src/testing/conformance.ts:21] fixture 必须提供 `context`、`getSpans()`(可先 flush 异步 exporter)和 `Symbol.asyncDispose`。[E: packages/telemetry/src/testing/types.ts:5] [E: packages/telemetry/README.md:209]

| group | case | 断言要点 |
|---|---|---|
| callback lifecycle | admits once synchronously and preserves the result | 同步 admission、单次调用、返回值 identity、默认 `ok` 且 settled |
| callback lifecycle | preserves synchronous and asynchronous rejection values | sync/async/`undefined`/unreadable rejection identity,对应 span status 为 `error` |
| status | uses last explicit status without automatic overwrite | last-write-wins;显式 status 不被后续 throw/reject 覆盖;返回值表示的 expected failure 可显式标 error |
| recording | merges attributes and records ordered events | start/`setAttributes` 合并,`undefined` 忽略,events 保序 |
| recording | ignores failed attribute calls atomically | 含 unreadable 值的整次 `setAttributes` 不留下 partial |
| recording | makes calls after settlement inert | settle 后改 attributes/events/status 无效;late child callback 仍跑,但不入库 |
| parentage | records nested and concurrent child relationships | 并发子 span 共享 parentId;先完成的 child `endSequence` 更小;parent 最后 settle |
| passivity | suppresses unreadable telemetry payload failures | unreadable `SpanOptions` 仍执行 callback 一次且不入库;unreadable recording 不抛 |
| passivity | ignores failed status calls atomically | unreadable `setStatus` 不阻止后续自动 error status |

本包自己的 `conformance.test.ts` 用 `InMemoryTelemetryContext` 跑完整 suite,并额外断言 snapshot 隔离。[E: packages/telemetry/test/conformance.test.ts:5] [E: packages/telemetry/test/conformance.test.ts:23]

## Domain schema 不在本包

`createTypedSpanStarter()` 接受任意 `TelemetrySchemaDefinition` tuple,但 `packages/telemetry/src` 没有 `pi.ai.request` 或 `pi.harness.*` 字面量 schema。[E: packages/telemetry/src/index.ts:349] README 的 “Pi Package Integration” 仍把 AI-request / harness schema 写在 `@earendil-works/pi-agent-core` 名下,并示例 `AGENT_TELEMETRY_SCHEMAS` / `startAiSpan`。[E: packages/telemetry/README.md:369] [E: packages/telemetry/README.md:371] [E: packages/telemetry/README.md:376] 那些符号不是本包 export,本节点不以 README 示例当作 shipped agent-core API。[I]

消费方应在自己的包里 `defineTelemetrySchema()`,再用 `createTypedSpanStarter(ctx, schemas)` 做 compile-time 词汇量约束。schema 与 adapter 解耦:低层 API 接受开放 name/attribute bag。[E: packages/telemetry/src/index.ts:72] [E: packages/telemetry/src/index.ts:349] [E: packages/telemetry/README.md:213]

## 设计动机与权衡

显式 context 传递而不是 `AsyncLocalStorage`:README 说包适合 Node / Bun / browsers / workers,backend adapter 自己负责 runtime 兼容。[E: packages/telemetry/README.md:391] callback 拥有 settlement,避免调用方漏 `end()` 或在 Promise 未完成时提前结束。[E: packages/telemetry/README.md:103] [I]

recording 必须 passive:adapter 失败或 payload 不可读时,业务 callback 仍恰好执行一次,且失败的那次 attribute/status 写入是原子丢弃。[E: packages/telemetry/src/testing/conformance.ts:206] [E: packages/telemetry/src/testing/conformance.ts:274] [E: packages/telemetry/README.md:128] 这把 telemetry 定位成诊断数据,而不是控制业务成败的通道。[E: packages/telemetry/README.md:62] [I]

start/end attributes 不是两份存储,只是“何时通常已知”;end attributes 始终可选,`setAttributes()` 可以一次都不调用。[E: packages/telemetry/README.md:294] [E: packages/telemetry/README.md:317]

`InMemoryTelemetryContext` 明确无界、进程内、无 exporter,适合测试与本地诊断;隔离靠新建实例。[E: packages/telemetry/src/memory.ts:192] [E: packages/telemetry/README.md:176]

## Gotcha

- `createTypedSpanStarter()` / `defineTelemetrySchema()` **不** 在运行时校验 span 名、required attributes 或 parent 规则。错名或错父在 JS 里仍会 `startSpan`。[E: packages/telemetry/src/index.ts:349] [E: packages/telemetry/src/index.ts:72]
- union 型 span 名必须先收窄,否则类型系统拒绝调用,以保住 name↔attribute 对应。[E: packages/telemetry/test/telemetry.test.ts:141]
- 已 settle 的 memory parent 上开 child,child 会进 noop,`getSpans()` 看不到它;但 child callback 仍然同步执行并返回值。[E: packages/telemetry/src/memory.ts:126] [E: packages/telemetry/src/testing/conformance.ts:232]
- attribute 值仅限 primitive scalar/array。README 要求 domain instrumentation 默认避开 prompt、completion、tool 参数/输出、文件内容、provider payload、headers、凭证和自由文本错误细节。[E: packages/telemetry/src/index.ts:1] [E: packages/telemetry/README.md:389]
- 不要再 cite `packages/agent/src/harness/telemetry.ts` 或把 `startAiSpan` / `HARNESS_TELEMETRY_SCHEMA` 写成本包符号。[I]

## 跨包边界

[subsys.coding-agent.telemetry](../coding-agent/telemetry.md) 管 install telemetry 与 attribution headers,不实现 `TelemetryContext`。

[subsys.durable.runtime](../durable/runtime.md) 是 `pi-durable` session/runtime 边界。本节点不覆盖 durable 是否已经按某个 domain schema 发射 span。

[spine.agent-loop](../../spine/agent-loop.md) 与 [spine.provider-stream](../../spine/provider-stream.md) 是 loop / provider stream 走读。本包只提供 `TelemetryContext` 契约;谁在 request 上传播 `telemetryContext` 属于 `pi-ai` / 产品层。[E: packages/telemetry/README.md:13] [I]

## Sources

- packages/telemetry/package.json
- packages/telemetry/src/index.ts
- packages/telemetry/src/memory.ts
- packages/telemetry/src/noop.ts
- packages/telemetry/src/testing/conformance.ts
- packages/telemetry/src/testing/index.ts
- packages/telemetry/src/testing/types.ts
- packages/telemetry/README.md
- packages/telemetry/test/conformance.test.ts
- packages/telemetry/test/telemetry.test.ts

## 相关

- [subsys.coding-agent.telemetry](../coding-agent/telemetry.md): coding-agent 的 install telemetry / attribution / timing 开关,与本契约包分离。
- [subsys.durable.runtime](../durable/runtime.md): `pi-durable` session/runtime 边界;domain span 不在本包。
- [spine.agent-loop](../../spine/agent-loop.md): agent loop 端到端走读。
- [spine.provider-stream](../../spine/provider-stream.md): provider stream 走读。
