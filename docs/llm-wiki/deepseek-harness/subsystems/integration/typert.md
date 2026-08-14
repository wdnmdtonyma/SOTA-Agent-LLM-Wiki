---
id: subsys.integration.typert
title: Typert 类型图
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/typert/protocol/src/index.ts
  - packages/typert/protocol/src/types.ts
  - packages/typert/registry/src/index.ts
  - packages/typert/registry/src/service.ts
  - packages/typert/registry/src/types.ts
  - packages/typert/registry/src/client/index.ts
  - packages/typert/registry/tests/typert.spec.ts
  - packages/typert/generator/src/index.ts
  - packages/typert/generator/src/analyzer.ts
  - packages/typert/generator/src/emitter.ts
  - packages/typert/generator/src/cordis-catalog.ts
  - packages/typert/loader/src/index.ts
  - packages/typert/loader/tests/loader.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/api/gateway/src/index.ts
  - packages/api/remotes/src/agent-lookup.ts
  - vendor/cordis/src/events.ts
symbols:
  - TypertRegistry
  - TypertLookupFailure
  - isTypertRemoteSegment
  - apply
related:
  - spine.overview
  - spine.capability-seams
  - subsys.integration.api-gateway
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: 47f943859b
---

> Typert 是 **host↔client 远程方法的类型图 + 运行时注册表 + 生成器 + Loader 扫描器**：`@deepseek-ai/dsh-typert-protocol` 持 decorator / Remote 段语法 / `TypertLookupFailure`，`TypertRegistry` 提供 `ctx.typert`，`dsh-typert-generator` 在编译期做严格反射，`typert-loader` 的 `apply` 把各包 `./typert` 产物登记进注册表。它不是 HTTP API，不是 MCP，也不是 `dsh-host-apiproxy`。

## 能回答的问题

- `dsh-base` 的 `id: typert` / `typert-loader` / `typert-gateway` 分别是哪个 npm 包？哪一行才是本页、哪一行交给 gateway？
- `ctx.typert` 的四个子表（`local` / `remotes` / `lookups` / `contexts`）各自登记什么？fiber dispose 撤什么、不撤什么？
- `./typert` 产物怎样被 `typert-loader` 发现？缺 `ctx.baseUrl`、face 不是 `host`、激活期坏产物分别怎样失败？
- protocol 的 `Remote` / `isTypertRemoteSegment` / `TypertLookupFailure` 和 generator 的严格反射怎么分工？
- 为什么不能把 `dsh-web-app` 的 `id: api-gateway`（`dsh-host-apiproxy`）写成 Typert？

## 职责边界

本页拥有四包叠层，全部是 **host 面** 的类型图基础设施（默认产品路径仍是 `dsh web` 本地 Web GUI；本仓没有 shipped TUI）：

- `@deepseek-ai/dsh-typert-protocol`：compiler-independent 的 Remote decorator、段字符校验、`TypertLookupFailure`、以及 `Context.typert: TypertRegistryContract` 的类型缝。[E: packages/typert/protocol/src/index.ts:18] [E: packages/typert/protocol/src/index.ts:25] [E: packages/typert/protocol/src/types.ts:489]
- `@deepseek-ai/dsh-typert-registry`：`TypertRegistry` Service，构造时 `super(ctx, 'typert')`。`register` 只把传入的 `TypertContribution` 写入 map，不跑 analyzer、不 `z.object` 现场建模。[E: packages/typert/registry/src/service.ts:446] [E: packages/typert/registry/src/service.ts:455] [E: packages/typert/registry/src/service.ts:508]
- `@deepseek-ai/dsh-typert-loader`：named 插件 `typert-loader`，`inject = ['typert', 'loader']`，`apply` 观察 Loader 条目并 `ctx.typert.register`。[E: packages/typert/loader/src/index.ts:42] [E: packages/typert/loader/src/index.ts:44] [E: packages/typert/loader/src/index.ts:284]
- `@deepseek-ai/dsh-typert-generator`：构建期 `WorkspaceAnalyzer` / `FaceModelEmitter` / `CordisCatalogProjector`。`dsh-base` 的 `dependencies` 只有 registry 与 loader，**没有** generator。[E: packages/typert/generator/src/index.ts:8] [E: packages/bundle/base/package.json:111] [E: packages/bundle/base/package.json:112]

`dsh-base` 挂三行：`id: typert` = `@deepseek-ai/dsh-typert-registry`；`id: typert-loader` = `@deepseek-ai/dsh-typert-loader`；`id: typert-gateway` = `@deepseek-ai/dsh-api-gateway`。[E: packages/bundle/base/cordis.patch.yml:30] [E: packages/bundle/base/cordis.patch.yml:31] [E: packages/bundle/base/cordis.patch.yml:33] [E: packages/bundle/base/cordis.patch.yml:34] [E: packages/bundle/base/cordis.patch.yml:36] [E: packages/bundle/base/cordis.patch.yml:37] 第三行的 invoke / `TypertGatewayError` 交给 [`subsys.integration.api-gateway`](api-gateway.md)（`subsys.integration.api-gateway`）。

它**不**拥有：

- 进程内 Remote dispatch、`/api` RPC intercept、`claimsEndpoint` — [`subsys.integration.api-gateway`](api-gateway.md)（`subsys.integration.api-gateway`）。Gateway `static inject = ['typert']`。[E: packages/api/gateway/src/index.ts:91]
- `dsh-api-remotes` 的 agent / session lookup 绑定。`dsh-web-app` 另挂 `id: api-remotes`。[E: packages/bundle/web-app/cordis.patch.yml:165] [E: packages/bundle/web-app/cordis.patch.yml:166]
- host HTTP 代理。`dsh-web-app` 的 `id: api-gateway` 的 `name` 是 `@deepseek-ai/dsh-host-apiproxy`，**不是** Typert，也不是 `dsh-base` 那行 `typert-gateway`。[E: packages/bundle/web-app/cordis.patch.yml:99] [E: packages/bundle/web-app/cordis.patch.yml:100]
- MCP tools 桥、ACP / SDK JSON-RPC。那些是别的 integration 节点。
- agent-preset 面。四个 shipped `agent.cordis.yml` 没有 `typert*` remount，也没有 isolate 副本。

**没有 waterfall listener。** registry / loader 用可逆 `ctx.effect` 与 `ctx.on('internal/plugin')`。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/typert/protocol/src/index.ts` | `isTypertRemoteSegment`、`TypertLookupFailure`、`Remote` / `RemoteScope`、`bindTypertRemote`、`remoteMethods` |
| `packages/typert/protocol/src/types.ts` | `InvocationDescriptor`、`TypertRegistryContract`、把 `ctx.typert` 写进 Cordis `Context` |
| `packages/typert/registry/src/service.ts` | `TypertRegistry`；`typertKey` / `typertPackageKey` / `typertEndpoint`；default export |
| `packages/typert/registry/src/index.ts` | Host 入口；给 `TypertRegistryContract` 补 `register` / `get` / `resolve` / `list*` / `toJSONSchema` |
| `packages/typert/registry/src/client/index.ts` | Client 面 `apply`：`new TypertRegistry(ctx)`，`inject = []` |
| `packages/typert/registry/src/types.ts` | `TypertContribution`（`package` / `face` / `schemas` / `model` / `invocations`） |
| `packages/typert/loader/src/index.ts` | named 插件：`name` / `inject` / `Config` / `apply` / `validateTypertManifest` |
| `packages/typert/generator/src/analyzer.ts` | 从 TypeScript Program 抽 `FaceModel` 与 `@Remote` invocation |
| `packages/typert/generator/src/emitter.ts` | 写出 `export const TYPERT`（及可选 `TYPERT_REMOTE`） |
| `packages/typert/generator/src/cordis-catalog.ts` | 同一份 face 上的 Cordis catalog 投影；不是运行时注册表 |
| `packages/bundle/base/cordis.patch.yml` | shipped host 三行 |
| `packages/bundle/web-app/cordis.patch.yml` | `id: api-gateway` = apiproxy；`id: api-remotes` = remotes |

## 数据模型

| 符号 | 要点 |
|---|---|
| `isTypertRemoteSegment` | 段必须匹配 `^[A-Za-z0-9_$.-]+$`，且不是 `'.'` / `'..'`。namespace、method、lookup key、Context 段都走这条语法。[E: packages/typert/protocol/src/index.ts:10] [E: packages/typert/protocol/src/index.ts:18] |
| `TypertLookupFailure<Failure>` | `name = 'TypertLookupFailure'`。payload 在 `failure`；`message` 固定为 lookup policy 拒绝，不嵌入被拒身份。[E: packages/typert/protocol/src/index.ts:35] [E: packages/typert/protocol/src/index.ts:34] [E: packages/typert/protocol/src/index.ts:27] Gateway 见到它会原样再抛，不当成基础设施故障。[E: packages/api/gateway/src/index.ts:388] |
| `Remote` / `RemoteScope` | 标准 method decorator。标记进模块私有 `WeakMap`，**不是** emitDecoratorMetadata。`remoteMethods(service)` 按类声明序读快照。[E: packages/typert/protocol/src/index.ts:168] [E: packages/typert/protocol/src/index.ts:204] [E: packages/typert/protocol/src/index.ts:224] |
| `bindTypertRemote` / `typertRemote` | 显式 Service→Gateway 绑定：`service` + `serviceKey` + `namespace`（默认等于 key）。`TypertRemoteService` 构造里写好这个字段。[E: packages/typert/protocol/src/index.ts:135] [E: packages/typert/protocol/src/index.ts:159] |
| `InvocationDescriptor` | 一条导出方法：`id`、`service`、`namespace`、`method`、可选 `implementation`；`invocation` 为 `{ kind: 'direct' }` 或 `{ kind: 'context', context, wire, codec }`；`parameters[].source` 为 `'json' \| 'lookup'`；可选 `scope`（只允许 direct + 唯一 lookup）；可选 `cancellation.parameter === 'signal'`；`result` 为 `strict` 或 `src-json`。[E: packages/typert/protocol/src/types.ts:173] |
| `TypertContribution` | 生成物登记单元：`package` + `face: 'host' \| 'client'` + Zod `schemas` + `model`（services / events / objects）+ `invocations`。[E: packages/typert/registry/src/types.ts:81] |
| `typertKey` / `typertPackageKey` / `typertEndpoint` | schema = `` `${package}#${name}` ``；package-face = `` `${package}#${face}` ``；invocation = `` `${namespace}/${method}` ``。[E: packages/typert/registry/src/service.ts:49] [E: packages/typert/registry/src/service.ts:59] [E: packages/typert/registry/src/service.ts:68] |
| `ctx.typert` 合同 | protocol 钉四个视图：`local` / `remotes` / `lookups` / `contexts`。[E: packages/typert/protocol/src/types.ts:481] registry Host 入口再补 `register` / `get` / `resolve` / `list` / `getPackage` / `listPackages` / `toJSONSchema`。[E: packages/typert/registry/src/index.ts:19] |
| `local.hasSeen` | `commit` 把 endpoint 记进 `history`；withdraw 只删 `entries`，`hasSeen` 读 history。测试里 dispose 后 `list()` 为空而 `hasSeen('goals/create')` 仍 true。[E: packages/typert/registry/src/service.ts:143] [E: packages/typert/registry/src/service.ts:170] [E: packages/typert/registry/tests/typert.spec.ts:222] Gateway 用 `get` 或 `hasSeen` 认领 `/api` 端点。[E: packages/api/gateway/src/index.ts:117] |
| loader `Config.packages` | 额外、必须能 resolve 且必须导出 `./typert` 的 npm 名。默认 `[]`（只扫 Loader 条目）。[E: packages/typert/loader/src/index.ts:54] |
| `TYPERT` 产物 | emitter 写出 `export const TYPERT = { package, face, schemas, invocations, model }`。[E: packages/typert/generator/src/emitter.ts:200] loader 只收 `face === 'host'` 且 codec `mode === 'strict'` 的 zod v4 实例。[E: packages/typert/loader/src/index.ts:93] [E: packages/typert/loader/src/index.ts:266] |

## 控制流

1. **编译期（不进 shipped 运行时树）。** `WorkspaceAnalyzer@packages/typert/generator/src/analyzer.ts` 扫 host/client tsconfig，从带 `@Remote` / `@RemoteScope` 的 public 实例方法抽 `InvocationModel`；找不到 `typertRemote` / `TypertRemoteService` 绑定时 `gatewayBinding` 返回 `undefined` 并 fail。[E: packages/typert/generator/src/analyzer.ts:950] [E: packages/typert/generator/src/analyzer.ts:960] `FaceModelEmitter` 把模型打成 `TYPERT` JS。`projectCordisCatalog@packages/typert/generator/src/cordis-catalog.ts` 可再投影 events/services（标 `@mode waterfall` 却没有尾参 `next` 会违规），供文档 / `tool-cordis` catalog，**不是** `ctx.typert` 的写入路径。[E: packages/typert/generator/src/cordis-catalog.ts:365] [E: packages/typert/generator/src/cordis-catalog.ts:207]

2. **组合挂载。** `profile → bundle → agent preset` 里，`dsh-base` 根 `insert` 写上 `typert` / `typert-loader` / `typert-gateway` 三行。[E: packages/bundle/base/cordis.patch.yml:30] 这是 host 单例，不是 preset isolate。`dsh-base` `package.json` 依赖 registry、loader、以及 gateway 包 `@deepseek-ai/dsh-api-gateway`；generator 不在这份 dependencies 里。[E: packages/bundle/base/package.json:62] [E: packages/bundle/base/package.json:111]

3. **Registry 进 `ctx`。** Host 用 default export 的 `TypertRegistry` 当 Cordis plugin：`await ctx.plugin(TypertRegistry)`。[E: packages/typert/registry/src/service.ts:721] [E: packages/typert/registry/tests/typert.spec.ts:30] 构造函数 `super(ctx, 'typert')`，内部建 `local` / `remote` / `lookup` / `context` 四个 store。[E: packages/typert/registry/src/service.ts:455] Client 面不 import Host 入口，而是 `apply@packages/typert/registry/src/client/index.ts` 里 `new TypertRegistry(ctx)`，`inject = []`。[E: packages/typert/registry/src/client/index.ts:13] [E: packages/typert/registry/src/client/index.ts:7]

4. **`typert-loader.apply@packages/typert/loader/src/index.ts`。** `inject` 等到 `typert` 与 `loader`。`ctx.baseUrl` 必须是 config 树（`cordis.yml` 目录）的 file URL，用来 `createRequire` 解析兄弟包；缺了直接抛。[E: packages/typert/loader/src/index.ts:289] [E: packages/typert/loader/tests/loader.spec.ts:385] `ctx.effect` 标 `'typert loader lifetime'`：dispose 时 `active = false` 并清空 dirty。[E: packages/typert/loader/src/index.ts:308]

5. **发现与缓存。** 每个 Loader 条目名尝试 `require.resolve(`${name}/package.json`)`，读 `exports['./typert']`（字符串或 `{ default: string }`）。没有该 export 的条目静默跳过并缓存 `null`；**显式** `Config.packages` 缺包或缺 export 则 fail-loud。[E: packages/typert/loader/src/index.ts:39] [E: packages/typert/loader/src/index.ts:336] [E: packages/typert/loader/tests/loader.spec.ts:185] `artifactPath` 命中（含 `null`）直接返回，没有失效逻辑；插件集变更要重启才生效。[E: packages/typert/loader/src/index.ts:317]

6. **激活扫描 vs 稳态。** `ctx.on('internal/plugin')` 把 `fiber.entry.options.name` 标 dirty，`queueMicrotask` flush。[E: packages/typert/loader/src/index.ts:411] 激活时把已有 `loader.entries()` 与 `Config.packages` 一次性 dirty，失败聚成 `AggregateError`（FAILED loader fiber）。[E: packages/typert/loader/src/index.ts:432] [E: packages/typert/loader/tests/loader.spec.ts:308] 稳态单个坏包只 `ctx.logger.error`，不毒死其它包。[E: packages/typert/loader/src/index.ts:420]

7. **`validateTypertManifest` → `register`。** import 后的 `TYPERT` 必须 `package === pkgName`、`face === 'host'`、schemas 是带 `_zod` 的对象、invocation codec 全是 `strict` + `parse`。[E: packages/typert/loader/src/index.ts:88] [E: packages/typert/loader/src/index.ts:93] [E: packages/typert/loader/src/index.ts:266] 合格后 `registered.set(entryName, ctx.typert.register(manifest))`。[E: packages/typert/loader/src/index.ts:383] 卸掉 loader fiber 或条目 unmount 会跑这个 disposer。手写 `ctx.typert.register()` 仍可用于没有 `./typert` 的测试 / 非 Loader 组合。

8. **`TypertRegistry.register@packages/typert/registry/src/service.ts`。** 先 `validatePackage` / `validateSchemas` / `localStore.validate`：重名 package-face、schema key、invocation `id` 或 endpoint 整批拒绝、不落盘。[E: packages/typert/registry/src/service.ts:499] [E: packages/typert/registry/src/service.ts:503] [E: packages/typert/registry/tests/typert.spec.ts:154] 通过后 `ctx.effect('typert.register()')` 写入 packages / schemas / local descriptors；yield 时按 owner 撤回。[E: packages/typert/registry/src/service.ts:506] [E: packages/typert/registry/src/service.ts:508] 登记插件自己的 fiber dispose 也会带走 contribution。[E: packages/typert/registry/tests/typert.spec.ts:143]

9. **Remote 贡献与 lookup / Context。** Client 程序选的 Host-for-Client 描述符走 `ctx.typert.remotes.register`：按 `contribution.package` 互斥，同样是 `ctx.effect`。[E: packages/typert/registry/src/service.ts:196] `lookups.register` / `contexts.registerHost` / `registerClient` 也是 effect；`configure` / `configureHost` **可以先于** provider，但没有 live provider 时 `get()` 仍是 `undefined`。[E: packages/typert/registry/src/service.ts:251] [E: packages/typert/registry/tests/typert.spec.ts:365] 同一 lookup key 在本 Service 生命周期内改 `parameter` / `wire` / type symbol 会抛 `changed its wire declaration`。[E: packages/typert/registry/src/service.ts:306]

10. **Consumer 读表，不拥有表。** `dsh-api-gateway` 用 `local.get` / `hasSeen` 认领 `/api` 端点。[E: packages/api/gateway/src/index.ts:117] Context / lookup `resolve` 若抛出 `TypertLookupFailure` 则原样再抛；其它 throw 才收成 `TypertGatewayError`（`context-failed` / `lookup-failed`）。[E: packages/api/gateway/src/index.ts:388] [E: packages/api/gateway/src/index.ts:451] 细节在 [`subsys.integration.api-gateway`](api-gateway.md)。`dsh-web-app` 的 `api-remotes` 在 `ctx.inject(['typert'])` 里 `lookups.configure('agent' | 'session')` 与 `contexts.configureHost('agent')`，找不到 agent 时 `throw new TypertLookupFailure(found.error)`。[E: packages/api/remotes/src/agent-lookup.ts:199] [E: packages/api/remotes/src/agent-lookup.ts:202] [E: packages/api/remotes/src/agent-lookup.ts:205]

11. **校验边界（registry 比 loader 宽）。** registry 允许 `codec.mode === 'src-json'`（无 schema）；loader 强制 strict zod。[E: packages/typert/registry/src/service.ts:698] [E: packages/typert/loader/src/index.ts:266] wire 名走与 protocol 相同的段字符；`#` 不能出现在 package / schema / lookup key 里。[E: packages/typert/registry/src/service.ts:706] [E: packages/typert/registry/src/service.ts:712] `scope` 必须指向 **唯一** lookup 参数，且 receiver 必须是 `direct`。[E: packages/typert/registry/src/service.ts:673]

12. **观察者。** `subscribe` 本身是 `ctx.effect`。`emit` 里 listener 抛错走 `report`，后续 listener 仍会跑。[E: packages/typert/registry/src/service.ts:90] [E: packages/typert/registry/src/service.ts:101] [E: packages/typert/registry/tests/typert.spec.ts:582]

## 设计动机

protocol 只留 decorator 与段语法，是为了让业务包、生成物、Gateway、Client 共享同一份 **compiler-independent** 合同；TypeScript 程序、符号、缺失注解写回，全部停在 generator。`Remote` 标记进私有 `WeakMap`，运行时不必开 `emitDecoratorMetadata`。

registry 只存已经生成的 Zod / 描述符 / provider。重复身份 fail-loud 且原子，避免两个包静默抢同一个 `namespace/method`。`configure` 可先于 `register`，让 composition（例如 `api-remotes`）覆盖默认 lookup，而不改 Provider 包。

loader 跟 Loader 条目走，是因为每个业务包自己的 `package.json` `exports['./typert']` 才是 host face 的权威产物。嵌在另一条 Loader 条目后面的包没有可 resolve 的 entry name，所以才有显式 `Config.packages`。负向缓存不过期：避免每个 `internal/plugin` 都去碰磁盘；换插件集等于换进程。

`TypertLookupFailure` 把「策略拒绝」和「解析器崩溃」分开，Gateway 才能把 adapter 拥有的 `{ code, message, details }` 送回调用方。

## Gotcha

- **三行不要并成一个插件。** `id: typert` 是注册表；`id: typert-loader` 是扫描器；`id: typert-gateway` 才是 `@deepseek-ai/dsh-api-gateway`。缺 loader 时 registry 仍在，只是没有自动 `./typert` 登记。
- **`dsh-web-app` 的 `id: api-gateway` 不是 Typert。** 那行的 `name` 是 `@deepseek-ai/dsh-host-apiproxy`（host HTTP 代理）。Typert dispatch 在 `dsh-base` 的 `id: typert-gateway`。[E: packages/bundle/web-app/cordis.patch.yml:100] [E: packages/bundle/base/cordis.patch.yml:37]
- **generator 包存在 ≠ 运行时装了。** shipped 树认 `dsh-base` patch + `package.json` dependencies。构建机跑 analyzer；进程里只有 registry / loader / gateway。
- **loader 只吃 host face。** `TYPERT.face === 'client'` 在 `validateTypertManifest` 就抛。Client Remote 走 `typert.remotes.register`（或 Gateway Client `$mount`），不是 `./typert` 这条扫描器。[E: packages/typert/loader/src/index.ts:93]
- **`hasSeen` 比 `get` 长寿。** 卸掉贡献后 Gateway 仍可能认领该 endpoint（然后因方法已撤而失败）。不要把 `hasSeen` 当成「现在还能调」。
- **`configure` 不等于 `get`。** 只有 resolver、没有 provider 时 `lookups.get(key)` 是 `undefined`。wire 字段声明永远属于后来的 provider。[E: packages/typert/registry/tests/typert.spec.ts:365]
- **手写 register 可以 `src-json`；`./typert` 不能。** 测试里常见 `codec: { mode: 'src-json' }`。生成物流经 loader 必须 strict zod v4。
- **缺 `ctx.baseUrl` 不能 load。** loader 不能用自己的 `import.meta.url` 当 resolve 锚，pnpm isolated `node_modules` 会找不到兄弟包。[E: packages/typert/loader/src/index.ts:290]
- **不是 MCP，也不是 HTTP 路由表。** 模型可见工具名与 `web_search` / MCP `publicToolName` 无关。transport / 相关属于 Connection；本页只到描述符与注册表。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-typert-protocol` 的 `TypertRegistryContract` + merge 表（`TypertLookupMap` / `TypertContextMap` / `TypertRemoteMap`） | `ctx.typert`。protocol **没有** bundle 行，只是类型与 decorator 运行时 |
| **Provider（本页，runtime）** | `@deepseek-ai/dsh-typert-registry` 的 `TypertRegistry` | Service key `typert`。**host**：`dsh-base` `id: typert`。Client 面另有 `apply` 装同一 class |
| **Provider（本页，扫描）** | `@deepseek-ai/dsh-typert-loader` 的 `apply` | `inject = ['typert', 'loader']`。**host**：`dsh-base` `id: typert-loader`。四个 shipped preset **不** remount |
| **Provider（本页，构建）** | `@deepseek-ai/dsh-typert-generator` | 无 runtime `ctx` 键，不进 `dsh-base` dependencies |
| **Consumer（dispatch）** | `@deepseek-ai/dsh-api-gateway` | `inject = ['typert']`，服务键 `typertGateway`。**host**：`dsh-base` `id: typert-gateway`。走读见 [`subsys.integration.api-gateway`](api-gateway.md) |
| **Consumer（lookup 政策）** | `@deepseek-ai/dsh-api-remotes` | `lookups.configure` / `contexts.configureHost`。**web-app**：`id: api-remotes`。不在 `dsh-base` |
| **非本缝** | `@deepseek-ai/dsh-host-apiproxy` | `dsh-web-app` `id: api-gateway`。HTTP 代理，不是 Typert Remote |

换 Remote 实现 = 改业务包的 `@Remote` + 重新生成 `./typert`，或 overlay 另一个 lookup `configure`。同 endpoint / 同 package-face 再 `register` 会抛，不会覆盖。

## Sources

- packages/typert/protocol/src/index.ts
- packages/typert/protocol/src/types.ts
- packages/typert/registry/src/index.ts
- packages/typert/registry/src/service.ts
- packages/typert/registry/src/types.ts
- packages/typert/registry/src/client/index.ts
- packages/typert/registry/tests/typert.spec.ts
- packages/typert/generator/src/index.ts
- packages/typert/generator/src/analyzer.ts
- packages/typert/generator/src/emitter.ts
- packages/typert/generator/src/cordis-catalog.ts
- packages/typert/loader/src/index.ts
- packages/typert/loader/tests/loader.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/api/gateway/src/index.ts
- packages/api/remotes/src/agent-lookup.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角；本页是 `ctx.typert` 这条缝。
- [subsys.integration.api-gateway](api-gateway.md)（`subsys.integration.api-gateway`）：`id: typert-gateway` 的进程内 dispatch 与 `TypertGatewayError`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 挂 `typert` / `typert-loader` / `typert-gateway` 的那份真树。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）：`id: api-gateway` = `dsh-host-apiproxy`，以及 `id: api-remotes`。
