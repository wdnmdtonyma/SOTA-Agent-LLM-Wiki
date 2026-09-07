---
id: subsys.chord.runtime
title: Chord facets / services / host
kind: subsystem
tier: T2
pkg: chord
source:
  - packages/chord/package.json
  - packages/chord/README.md
  - packages/chord/src/index.ts
  - packages/chord/src/api.ts
  - packages/chord/src/types.ts
  - packages/chord/src/json.ts
  - packages/chord/src/facets/host.ts
  - packages/chord/src/facets/loader.ts
  - packages/chord/src/services/provider.ts
  - packages/chord/src/services/consumer.ts
  - packages/chord/src/services/handle.ts
  - packages/chord/src/services/errors.ts
  - packages/chord/src/services/wire.ts
  - packages/chord/src/services/loopback.ts
  - packages/chord/src/context/index.ts
  - packages/chord/src/bundler.ts
  - packages/chord/src/node.ts
  - packages/chord/src/node/package.ts
  - packages/chord/src/node/bundle.ts
  - packages/chord/src/node/bundle-loader.ts
  - packages/chord/src/node/manifest.ts
  - packages/chord/test/services.test.ts
  - packages/chord/test/facets.test.ts
  - packages/chord/test/facet-loader.test.ts
  - packages/client/src/index.ts
  - packages/client/src/client.ts
  - package.json
symbols:
  - defineFacet
  - defineService
  - createFacetHost
  - createStaticFacetLoader
  - combineFacetLoaders
  - createRemoteServiceBinding
  - createRemoteServiceEndpoint
  - RemoteServiceProvider
  - Facet
  - FacetEnvironment
  - FacetHost
  - FacetLoader
  - Service
  - ServiceMode
  - RemoteServiceTransport
  - RemoteServiceSource
  - isJsonValue
  - JsonRepresentation
  - BACKGROUND_CONTEXT
  - REMOTE_SERVICE_ERROR_CODES
  - parseServiceCall
  - createFacetBundleLoader
  - bundleFacetPackage
related:
  - spine.layered-architecture
  - subsys.chord.delta
  - subsys.client.remote-session-client
  - ref.package-index
evidence: explicit
status: verified
updated: 9767ba275f
---

> `@earendil-works/chord` 是独立的 application-composition runtime：同步 `defineFacet()` 声明服务依赖与供给，`createFacetHost()` 校验图、按拓扑激活、并在 reload 时替换 singleton 而不断开稳定 handle；服务分 singleton / keyed，可走进程内任意对象或远程 JSON 边界。Chord **不依赖任何其它 Pi workspace 包**。[E: packages/chord/package.json:2][E: packages/chord/package.json:4][E: packages/chord/README.md:5][E: packages/chord/README.md:6][E: packages/chord/package.json:65]

## 能回答的问题

- `defineFacet()` / `defineService()` 各自返回什么，`$chord.*` 为什么不能当服务 id？
- `createFacetHost()` 从 setup 到 active 经过哪些 phase，失败时如何回滚？
- singleton `use`/`provide` 与 keyed `observe`/`provideMany` 在声明、绑定、reload 上差在哪里？
- `createStaticFacetLoader()`、`combineFacetLoaders()`、Node bundle loader 分别负责哪一层？
- `RemoteServiceTransport` 与 `$chord.service` control call 覆盖什么，Chord 不规定什么？
- 为什么 Chord 能被无关应用单独使用，而 `pi-client` 反而依赖它？

## 职责边界

`package.json` description 是 “Application composition runtime for services, replicated state, RPC, and plugins”。[E: packages/chord/package.json:4] 公开入口是 `.`、`./context`、`./delta`、`./bundler`、`./node`。[E: packages/chord/package.json:8][E: packages/chord/package.json:14][E: packages/chord/package.json:19][E: packages/chord/package.json:24][E: packages/chord/package.json:29]

根入口导出 facet/host/loader 工厂、`defineService` / `replicatedState`、remote binding/endpoint、wire parsers 与 `isJsonValue()`。[E: packages/chord/src/index.ts:4][E: packages/chord/src/index.ts:13][E: packages/chord/src/index.ts:20] Context 常量和函数在 `@earendil-works/chord/context`，避免 `createContextKey` / `withCancel` 这类泛名污染根 API。[E: packages/chord/README.md:63][E: packages/chord/src/context/index.ts:55][E: packages/chord/src/context/index.ts:58] Delta 原语在 `@earendil-works/chord/delta`，权威节点是 [subsys.chord.delta](delta.md)。

Chord 在 Pi monorepo 里开发，但 README 写明它不是 Pi 包：不依赖其它 Pi workspace 包，可供无关应用使用。[E: packages/chord/README.md:5][E: packages/chord/README.md:6] `dependencies` 只有 `esbuild`；没有 `@earendil-works/pi-*`。[E: packages/chord/package.json:65][E: packages/chord/package.json:66] 根 `build` 把 `packages/chord` 放在 tui / telemetry / ai / agent 之前。[E: package.json:16]

Chord-owned 标识用 `chord.*` 命名空间；保留服务前缀是 `$chord.*`。[E: packages/chord/README.md:66][E: packages/chord/README.md:67] `defineService()` 拒绝空 id 和 `$chord.` 前缀。[E: packages/chord/src/api.ts:78][E: packages/chord/src/api.ts:80]

本节点不覆盖 `track()` / `apply()` / `publish()` 的 op 词汇与 untrusted path 校验；那些在 [subsys.chord.delta](delta.md)。本节点也不覆盖 `pi-client` 的 `Client` 会话握手；那个节点是 [subsys.client.remote-session-client](../client/remote-session-client.md)。

## 关键文件

- `packages/chord/src/api.ts`：`createFacetHost()`、`defineFacet()`、`defineService()`、`createStaticFacetLoader()`、`combineFacetLoaders()`、`createRemoteServiceBinding()`、`replicatedState()`。[E: packages/chord/src/api.ts:19][E: packages/chord/src/api.ts:29][E: packages/chord/src/api.ts:38][E: packages/chord/src/api.ts:66][E: packages/chord/src/api.ts:77][E: packages/chord/src/api.ts:84][E: packages/chord/src/api.ts:88]
- `packages/chord/src/types.ts`：`Facet` / `FacetEnvironment` / `FacetHost` / `Service` / `RemoteServiceTransport` / `RemoteServiceSource` / `JsonValue`。[E: packages/chord/src/types.ts:63][E: packages/chord/src/types.ts:185][E: packages/chord/src/types.ts:206][E: packages/chord/src/types.ts:225]
- `packages/chord/src/facets/host.ts`：`FacetKernel` 生命周期、依赖图、reload cutover。[E: packages/chord/src/facets/host.ts:340][E: packages/chord/src/facets/host.ts:388][E: packages/chord/src/facets/host.ts:423]
- `packages/chord/src/facets/loader.ts`：`disposeLoadedFacets()`，给组合 loader 做失败回滚。[E: packages/chord/src/facets/loader.ts:3]
- `packages/chord/src/services/provider.ts`：`RemoteServiceProvider`、`createRemoteServiceEndpoint()`、远程 member 分类。[E: packages/chord/src/services/provider.ts:77][E: packages/chord/src/services/provider.ts:502][E: packages/chord/src/services/provider.ts:540]
- `packages/chord/src/services/consumer.ts`：`RemoteServiceBindingImpl` 稳定 facade、`ready()` / `rebind()`。[E: packages/chord/src/services/consumer.ts:425][E: packages/chord/src/services/consumer.ts:501][E: packages/chord/src/services/consumer.ts:521]
- `packages/chord/src/services/handle.ts`：`ServiceSlot` 把 consumer view 与可替换 implementation 分开。[E: packages/chord/src/services/handle.ts:9][E: packages/chord/src/services/handle.ts:23]
- `packages/chord/src/services/wire.ts`：`$chord.service` control call 与 snapshot/update parsers。[E: packages/chord/src/services/wire.ts:39][E: packages/chord/src/services/wire.ts:54][E: packages/chord/src/services/wire.ts:89]
- `packages/chord/src/services/loopback.ts`：host 内部把远程服务接到同一套 binding 语义。[E: packages/chord/src/services/loopback.ts:5]
- `packages/chord/src/node/bundle-loader.ts`：`createFacetBundleLoader()` SHA-256 + `node:vm` `compileFunction`。[E: packages/chord/src/node/bundle-loader.ts:134][E: packages/chord/src/node/bundle-loader.ts:192][E: packages/chord/src/node/bundle-loader.ts:231]
- `packages/chord/src/node/package.ts` / `node/bundle.ts`：`bundleFacetPackage()` / `bundleFacets()` 原子写 outdir。[E: packages/chord/src/node/package.ts:30][E: packages/chord/src/node/bundle.ts:39][E: packages/chord/src/node/bundle.ts:70]

## 数据模型

`Facet` 只有 `id` 与同步 `setup(env)`。[E: packages/chord/src/types.ts:225][E: packages/chord/src/types.ts:227] `defineFacet()` 是 typed identity，原样返回入参。[E: packages/chord/src/api.ts:66][E: packages/chord/src/api.ts:67]

`Service<T>` 是稳定 token：`id`、`local`，外加只存在于类型层的 `SERVICE_TYPE` marker。[E: packages/chord/src/types.ts:63][E: packages/chord/src/types.ts:66] `defineService(id)` 默认 `local: false`（可远程暴露）；`{ local: true }` 才是进程内任意对象契约。[E: packages/chord/src/api.ts:81][E: packages/chord/src/types.ts:66] `ServiceMode` 是 `"singleton" | "keyed"`。[E: packages/chord/src/types.ts:60]

`FacetEnvironment` 在 setup 窗口声明形状：

| 方法 | 模式 | 作用 |
|---|---|---|
| `use(service)` | singleton | 硬依赖，返回稳定 handle |
| `observe(service, handler)` | keyed | 硬依赖，观察每个 live instance |
| `provide(service, implementation)` | singleton | 安装本 facet 的唯一实现 |
| `provideMany(service)` | keyed | 返回稍后 `spawn(key, implementation)` 的 `ServiceSpawner` |
| `replicatedState(initial)` | — | 创建可 `publish` 的 tracked state（语义见 [subsys.chord.delta](delta.md)） |
| `own` / `onActivate` / `onDeactivate` | — | 资源与生命周期回调 |

[E: packages/chord/src/types.ts:208][E: packages/chord/src/types.ts:210][E: packages/chord/src/types.ts:212][E: packages/chord/src/types.ts:214][E: packages/chord/src/types.ts:216][E: packages/chord/src/types.ts:218][E: packages/chord/src/types.ts:220][E: packages/chord/src/types.ts:222]

远程契约 `RemoteServiceContract<T>` 只在类型层强制：每个 member 必须是 trailing-`Context` 的 `Promise` 方法（参数/结果是 JSON 或 `void`），或 `ReplicatedState`（state value 是 JSON）。[E: packages/chord/src/types.ts:92][E: packages/chord/src/types.ts:96][E: packages/chord/src/types.ts:110] 运行时 `defineService<NonJsonArgument>(...)` **不会** throw；`local: true` 才允许非 JSON 对象。[E: packages/chord/test/services.test.ts:65][E: packages/chord/test/services.test.ts:75][E: packages/chord/test/services.test.ts:76]

`JsonValue` 是 `null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }`。[E: packages/chord/src/types.ts:21] `JsonRepresentation<T>` 把 unknown payload 收成 `JsonValue`。[E: packages/chord/src/types.ts:26] `isJsonValue()` 检查有限、无环、plain object、finite number；不 normalize。[E: packages/chord/src/json.ts:4][E: packages/chord/test/json.test.ts:5][E: packages/chord/test/json.test.ts:7]

`RemoteServiceTransport` 只有 `invoke(call, context)` 与 `subscribe(serviceId, mode, listener, context)`。[E: packages/chord/src/types.ts:185][E: packages/chord/src/types.ts:186] Chord 要求跨越该边界的值是 strict JSON，但不规定 framing、routing、transport 或应用 envelope；也不 clone。[E: packages/chord/src/types.ts:185][E: packages/chord/README.md:50] `ServiceCall.args` 是 `readonly JsonValue[]`：类型层要求 JSON，运行时不 clone。[E: packages/chord/src/types.ts:167]

`RemoteServiceSource` 用 `catalogue()` 广告外部服务，再用 `open()` 打开 binding；`acceptsUnavailableServices` 允许暂时认领尚未出现的 requirement。[E: packages/chord/src/types.ts:232][E: packages/chord/src/types.ts:233][E: packages/chord/src/types.ts:234]

`FacetHost` 暴露 `services`（`RemoteServiceProvider`）、`reload(facets)`、`dispose()`。[E: packages/chord/src/types.ts:247][E: packages/chord/src/types.ts:250] `FacetLoader.load()` 返回 `{ facets, dispose }`。[E: packages/chord/src/types.ts:254][E: packages/chord/src/types.ts:259]

`REMOTE_SERVICE_ERROR_CODES` 是 `service_not_allowed`、`service_not_found`、`service_mode_mismatch`、`service_member_not_found`、`service_member_mismatch`、`service_instance_not_found`、`service_stale_instance`、`service_invalid_value`。[E: packages/chord/src/services/errors.ts:1][E: packages/chord/src/services/errors.ts:9]

## 控制流

### defineService 与 defineFacet

1. `defineService@packages/chord/src/api.ts:77` 拒绝空字符串 id。[E: packages/chord/src/api.ts:78]
2. id 以 `$chord.` 开头则 throw `Service IDs beginning with $chord. are reserved`。[E: packages/chord/src/api.ts:80][E: packages/chord/test/services.test.ts:83]
3. 返回冻结 `{ id, local: options?.local ?? false }`。[E: packages/chord/src/api.ts:81]
4. `RemoteServiceProvider` 构造函数拒绝 `local === true` 的 token：`Local service … cannot be published remotely`。[E: packages/chord/src/services/provider.ts:87][E: packages/chord/src/services/provider.ts:88][E: packages/chord/test/services.test.ts:86]
5. `defineFacet@packages/chord/src/api.ts:66` 不改对象，只做类型标注。[E: packages/chord/src/api.ts:67]

### createFacetHost 启动

1. `createFacetHost@packages/chord/src/api.ts:19` 构造 `FacetKernel`，`await kernel.activate()`，再冻结返回 `{ services, reload, dispose }`。[E: packages/chord/src/api.ts:20][E: packages/chord/src/api.ts:21][E: packages/chord/src/api.ts:22]
2. 构造期检查 facet id 非空且 generation 内唯一。[E: packages/chord/src/facets/host.ts:355][E: packages/chord/src/facets/host.ts:356]
3. `FacetKernel.activate@packages/chord/src/facets/host.ts:388` 按传入顺序对每个 facet 调 `setup()`。`setup` 若返回 thenable，host 吞掉 rejection 并 throw `setup must be synchronous`。[E: packages/chord/src/facets/host.ts:381][E: packages/chord/src/facets/host.ts:383]
4. setup 期间 `use`/`provide`/`observe`/`provideMany` 只记录形状；`ServiceSlot.view()` 已发给 consumer，但 `lifecycle.assertServiceAccess()` 在 `setting_up` 为 false，调用 handle 会 throw。[E: packages/chord/src/facets/host.ts:87][E: packages/chord/src/facets/host.ts:569][E: packages/chord/test/facets.test.ts:73]
5. phase `assembling`：拉各 `RemoteServiceSource.catalogue()`，同一 `serviceId` 不能被两个 source 提供；本地未提供的 requirement 可落到 `acceptsUnavailableServices` 的唯一 deferred source。[E: packages/chord/src/facets/host.ts:398][E: packages/chord/src/facets/host.ts:606][E: packages/chord/src/facets/host.ts:620]
6. `validateFacets@packages/chord/src/facets/host.ts:808` 检查：同一服务不能既 singleton 又 keyed、不能被两个 facet 或 host+facet 同时 provide、缺失 provider、mode 不一致；然后 Kahn 拓扑排序，环则 `Facet dependency cycle: …`。[E: packages/chord/src/facets/host.ts:822][E: packages/chord/src/facets/host.ts:841][E: packages/chord/src/facets/host.ts:876][E: packages/chord/test/facets.test.ts:660]
7. `#assembleProviders@packages/chord/src/facets/host.ts:655` 为非 local 供给建 `RemoteServiceProvider`，再用 `createLoopbackServiceTransport(provider)` 包一层内部 `RemoteServiceBindingImpl`；local keyed 走 `LocalKeyedServiceRegistry`。[E: packages/chord/src/facets/host.ts:658][E: packages/chord/src/facets/host.ts:661][E: packages/chord/src/facets/host.ts:667][E: packages/chord/src/services/loopback.ts:5]
8. `#bindServices` 把 singleton slot `bind` 到 local implementation 或 loopback `use()` 的 facade；keyed 绑到 local registry 或内部 binding。[E: packages/chord/src/facets/host.ts:687][E: packages/chord/src/facets/host.ts:694][E: packages/chord/src/services/handle.ts:23]
9. phase `connecting`：所有 source binding 与内部 binding `ready(BACKGROUND_CONTEXT)`。[E: packages/chord/src/facets/host.ts:404][E: packages/chord/src/facets/host.ts:407][E: packages/chord/src/context/index.ts:55]
10. phase `activating`：按拓扑顺序 `FacetLifecycle.activate()`——先开 observation，再跑 `onActivate`。[E: packages/chord/src/facets/host.ts:412][E: packages/chord/src/facets/host.ts:121] 测试锁：setup 按数组顺序，activate 按 provider→consumer。[E: packages/chord/test/facets.test.ts:106]
11. 任一步失败则 `#terminate()`；若 cleanup 也失败，抛 `AggregateError` “Facet generation startup and cleanup failed”。[E: packages/chord/src/facets/host.ts:414][E: packages/chord/src/facets/host.ts:417]
12. dispose 按激活顺序的反向跑 lifecycle；host 只能在 `active` 时 dispose。[E: packages/chord/src/facets/host.ts:513][E: packages/chord/src/facets/host.ts:780][E: packages/chord/test/facets.test.ts:111]

### singleton vs keyed

**Singleton。** `env.provide` 只在 setup 登记一个 object implementation。[E: packages/chord/src/facets/host.ts:531][E: packages/chord/src/facets/host.ts:533] `env.use` 从 `HostServiceSlots.getSingleton` 拿同一 view；未 bind 时 `ServiceSlot.resolve` throw `Service … is disconnected`。[E: packages/chord/src/facets/host.ts:223][E: packages/chord/src/services/handle.ts:34] 远程 singleton 经 loopback binding 的 facade 调用，这样进程内远程服务与跨进程走同一套 member/JSON/Context 规则。[E: packages/chord/src/facets/host.ts:693]

**Keyed。** `env.provideMany` 返回 `StagedServiceSpawner`：`spawn` 只能在 facet `active` 之后，空 key 非法，同一 key 不能双活。[E: packages/chord/src/facets/host.ts:306][E: packages/chord/src/facets/host.ts:307][E: packages/chord/src/facets/host.ts:551] `env.observe` 把 handler 推迟到 activate 才订阅 directory。[E: packages/chord/src/facets/host.ts:582][E: packages/chord/test/facets.test.ts:114] local keyed 的 generation 从 1 递增；同一 key 再次 spawn 是新 generation。[E: packages/chord/src/facets/host.ts:179] 远程 keyed 的 `ServiceInstanceAddress` 是 `{ key, generation }`，invoke 带错 generation 是 `service_stale_instance`。[E: packages/chord/src/types.ts:129][E: packages/chord/src/services/provider.ts:411]

`RemoteServiceBinding.use` / `observe` 拒绝 `service.local`（`service_not_allowed`），并记住每个 id 的 mode，混用 throw `service_mode_mismatch`。[E: packages/chord/src/services/consumer.ts:616][E: packages/chord/src/services/consumer.ts:617][E: packages/chord/src/services/consumer.ts:626]

### reload

1. `FacetHost.reload@packages/chord/src/types.ts:250` 只在 `active` 时允许；替换 facet 必须已经在 generation 里，id 非空且唯一。[E: packages/chord/src/facets/host.ts:424][E: packages/chord/src/facets/host.ts:426][E: packages/chord/src/facets/host.ts:429]
2. 先 setup 候选。`sameFacetShape` 比较 requires/provides 的 `(serviceId, mode)` 集合；形状变了 throw `Reloaded facet … must preserve its service requirements and provisions`。[E: packages/chord/src/facets/host.ts:441][E: packages/chord/src/facets/host.ts:891][E: packages/chord/test/facet-loader.test.ts:167]
3. 远程 singleton 在 cutover 前 `validateReplacement`：member 名与 kind（method vs state）必须保持。[E: packages/chord/src/facets/host.ts:521][E: packages/chord/src/services/provider.ts:141][E: packages/chord/src/services/provider.ts:376]
4. 候选按原激活顺序 `activate`。失败则 dispose 候选，host 回到 `active`，旧 provider 仍在路由。[E: packages/chord/src/facets/host.ts:466][E: packages/chord/src/facets/host.ts:477]
5. cutover：local singleton 直接 `ServiceSlot.bind` 新 implementation；远程 singleton `provider.replace()`，发 `replaced` snapshot，**不**先 `unavailable`。[E: packages/chord/src/facets/host.ts:487][E: packages/chord/src/services/provider.ts:151][E: packages/chord/src/services/provider.ts:167] 因此稳定 handle 在普通 reload 期间保持连通。[E: packages/chord/README.md:197][E: packages/chord/test/facet-loader.test.ts:78]
6. 旧 facet 反向 dispose 之后，keyed provision 才 `connectLocal` / `connectRemote`。keyed instance 是 incarnation-specific，替换拿到新 generation。[E: packages/chord/src/facets/host.ts:499][E: packages/chord/README.md:199]

### 远程服务边界

1. Adapter 在自己的 framing 里交换已经是 strict JSON 的值；Chord 提供 `isJsonValue()` 做边界检查，不规定外层 envelope。[E: packages/chord/src/json.ts:4][E: packages/chord/README.md:52]
2. Consumer 用 `createServiceCatalogueCall()` / `createServiceSubscribeCall()` / `createServiceUnsubscribeCall()` 发 `$chord.service` control call。[E: packages/chord/src/services/wire.ts:39][E: packages/chord/src/services/wire.ts:54][E: packages/chord/src/services/wire.ts:58][E: packages/chord/src/services/wire.ts:62]
3. `createRemoteServiceEndpoint(provider)@packages/chord/src/services/provider.ts:502` 解码这些 control call：`catalogue` 返回 provider catalogue；`subscribe` 建订阅、`activate()`、返回 snapshot；`unsubscribe` 关掉；其余走 `provider.invoke`。[E: packages/chord/src/services/provider.ts:509][E: packages/chord/src/services/provider.ts:511][E: packages/chord/src/services/provider.ts:529]
4. `parseServiceCall()` / `parseServiceCatalogue()` / `parseWireServiceSubscriptionSnapshot()` / `parseWireServiceProviderUpdate()` 在 adapter 建立 JSON 边界之后校验 Chord 语义。[E: packages/chord/src/services/wire.ts:89][E: packages/chord/src/services/wire.ts:99][E: packages/chord/src/services/wire.ts:118][E: packages/chord/src/services/wire.ts:128][E: packages/chord/README.md:75]
5. `classifyRemoteServiceImplementation` 只接受 data property：function → method，`getReplicatedStateInternals` 命中 → state，否则 throw `not remotely exposable`；零 member 也非法。[E: packages/chord/src/services/provider.ts:552][E: packages/chord/src/services/provider.ts:557][E: packages/chord/src/services/provider.ts:561][E: packages/chord/src/services/provider.ts:566][E: packages/chord/src/services/provider.ts:568]
6. 远程方法调用必须带 trailing `Context`；consumer 用 `args.at(-1)` 识别，缺了是 `service_invalid_value`。[E: packages/chord/src/services/consumer.ts:126][E: packages/chord/src/services/consumer.ts:130] provider `invoke` 把 `call.args` 展开后再拼上接收端 context：`Reflect.apply(method, impl, [...call.args, context])`。[E: packages/chord/src/services/provider.ts:233] Context 是本地 invocation bag（`abortSignal` + `value(key)`），不是 `ServiceCall.args` 里的业务 JSON。[E: packages/chord/src/types.ts:15][E: packages/chord/src/types.ts:167][I]
7. `createRemoteServiceBinding({ services, transport })` 立刻返回稳定 facade；`bound` 默认 true，`use()` 后异步 `transport.subscribe`。`ready()` 等到当前 acquired service 都装完 initial snapshot。[E: packages/chord/src/services/consumer.ts:445][E: packages/chord/src/services/consumer.ts:448][E: packages/chord/src/types.ts:120] `rebind(false)` 关掉订阅并 `facade.clear()`，replica 变 unready，直到再 bind 并 hydrate。[E: packages/chord/src/services/consumer.ts:521][E: packages/chord/README.md:38]
8. 每个 remote client/state 流的 path 字典由 `createServiceStateEncoder()` / `createServiceStateDecoder()` 拥有，细节在 [subsys.chord.delta](delta.md)。[E: packages/chord/README.md:81]

对称 RPC peer 是该边界的**计划中**可选实现，不是当前导出。[E: packages/chord/README.md:53][I]

### Loaders 与 bundler

1. `createStaticFacetLoader(facets)` 每次 `load()` 返回同一冻结数组，`dispose` 是空操作。[E: packages/chord/src/api.ts:29][E: packages/chord/src/api.ts:33]
2. `combineFacetLoaders(loaders)` 按顺序 `load()`；中途失败则对已 load 的条目**反向** `disposeLoadedFacets`。[E: packages/chord/src/api.ts:43][E: packages/chord/src/api.ts:45] 成功后的组合 `dispose` 也反向，且幂等。[E: packages/chord/src/api.ts:54][E: packages/chord/src/api.ts:57]
3. `@earendil-works/chord/bundler` 的 `bundleFacetPackage({ packagePath, outdir, defaultFacets })` 读 `package.json` 的 `name` / `version` / `peerDependencies` / `chord.facets`，把 peer 标成 external，再调 `bundleFacets()`。[E: packages/chord/src/node/package.ts:30][E: packages/chord/src/node/package.ts:33][E: packages/chord/src/node/package.ts:37] Chord 不安装依赖、不跑 lifecycle script。[E: packages/chord/README.md:163]
4. `bundleFacets` 先写完整临时目录，再 `replaceDirectory` 换掉旧 outdir，避免 loader 看到半成品。[E: packages/chord/src/node/bundle.ts:45][E: packages/chord/src/node/bundle.ts:70][E: packages/chord/README.md:201] 产物是每个 entry 一个 content-addressed `.cjs` 加 `chord-facets.json`（`FACET_BUNDLE_FORMAT` = `chord.facet-bundle`，version `2`）。[E: packages/chord/src/node/manifest.ts:1][E: packages/chord/src/node/manifest.ts:2][E: packages/chord/src/node/manifest.ts:3]
5. `createFacetBundleLoader({ manifestPath, entry, resolveExternal })` 读 manifest、默认校验 `sha256-` integrity、用 `compileFunction` 直接编译 CommonJS，**不**进 Node CJS/ESM module cache。[E: packages/chord/src/node/bundle-loader.ts:134][E: packages/chord/src/node/bundle-loader.ts:147][E: packages/chord/src/node/bundle-loader.ts:192][E: packages/chord/README.md:183] `dispose` 丢掉 facet 引用，编译代码在插件自有资源释放后可被 GC。[E: packages/chord/src/node/bundle-loader.ts:155][E: packages/chord/README.md:187]
6. 跨 Node host：`readFacetBundleArtifact()` 打包已校验 entry；`createFacetBundleArtifactLoader()` 物化临时 generation，externals 在接收端解析。[E: packages/chord/src/node/bundle-loader.ts:56][E: packages/chord/src/node/bundle-loader.ts:84]
7. 热更新约定：先 load 候选，交给 `FacetHost.reload()`，失败 dispose 候选，成功后再 dispose 退役的 `LoadedFacets`。[E: packages/chord/README.md:194]

## 设计动机与权衡

Facet 把“一个产品功能”拆成可装进不同进程/环境的同步 setup 单元（worker / TUI / browser），host 在全部声明完之后才绑定，避免半图激活。[E: packages/chord/README.md:11][E: packages/chord/README.md:18] setup 强制同步，是为了让 requires/provides 在 activate 前成为完整、可校验的形状。[E: packages/chord/src/facets/host.ts:383][I]

稳定 facade（`ServiceSlot` / remote `ServiceFacade`）把 consumer 持有的对象与当前 implementation 分开：provider 断开或 reload 替换时，handle identity 不变。[E: packages/chord/src/services/handle.ts:9][E: packages/chord/src/services/handle.ts:23][E: packages/chord/README.md:32] keyed 不走这条路：instance 带 generation，替换是新 incarnation。[E: packages/chord/README.md:199]

远程边界只拥有 service wire grammar，不拥有 socket/CBOR/session envelope。应用用 adapter 填 transport；`pi-client` 的 `createClientServiceTransport()` 是其中一个 adapter，不是 Chord 的依赖。[E: packages/chord/README.md:49][E: packages/client/src/client.ts:448]

Context 是显式传递的 Go 风格 bag（`abortSignal` + `value(key)`），应用可塞权限或 telemetry，Chord 自身不依赖这两样。[E: packages/chord/src/types.ts:15][E: packages/chord/src/types.ts:16][E: packages/chord/README.md:56][E: packages/chord/README.md:58] `BACKGROUND_CONTEXT` 是 host 内部 catalogue/ready/subscribe 用的空 context。[E: packages/chord/src/context/index.ts:55]

## Gotcha

- `setup` 不能是 `async`。返回 Promise 会被当成错误，即使 Promise 后来 resolve。[E: packages/chord/src/facets/host.ts:381]
- setup 阶段拿到的 singleton handle 不能调用；要等 `onActivate` 或 activate 之后。[E: packages/chord/test/facets.test.ts:73]
- `onDeactivate` 实际登记为 `lifecycle.own(callback)`，与 `own()` 一样在 dispose 时**反向**执行。[E: packages/chord/src/facets/host.ts:592][E: packages/chord/src/facets/host.ts:129]
- 远程 JSON 契约主要是 TypeScript：`defineService` 运行时不扫 member 类型。真正挡非远程 member 的是 `classifyRemoteServiceImplementation`（提供时）和 consumer 的 trailing-`Context` 检查（调用时）。[E: packages/chord/test/services.test.ts:65][E: packages/chord/src/services/provider.ts:566][E: packages/chord/src/services/consumer.ts:126]
- `isJsonValue()` 拒绝 `undefined`、`Infinity`、typed array、循环、非 plain prototype；它不改值。[E: packages/chord/test/json.test.ts:7][E: packages/chord/test/json.test.ts:9][E: packages/chord/src/json.ts:4]
- reload 失败若发生在 cutover **之后**，`#abort` 会拆掉整个 generation（`Facet reload failed after cutover`），不是退回旧 facet。[E: packages/chord/src/facets/host.ts:506][E: packages/chord/src/facets/host.ts:508]
- `$chord.service` 是保留 control id，应用 `defineService` 不能占用 `$chord.` 前缀。[E: packages/chord/src/services/wire.ts:39][E: packages/chord/src/api.ts:80]

## 跨包边界

Chord **零** Pi workspace 依赖。箭头只能从其它包指向 Chord，不能反过来。[E: packages/chord/package.json:65][E: packages/chord/README.md:6]

[spine.layered-architecture](../../spine/layered-architecture.md) 描述 Pi 分层栈。Chord 是该栈最底层的 composition runtime：根 build 现为 chord → tui → telemetry → ai → agent → sqlite-node → protocol → client → server → coding-agent。[E: package.json:16]

[subsys.chord.delta](delta.md) 拥有 `replicatedState` / `publish` / `Op` / untrusted `apply`。本节点只说明 `env.replicatedState()` 与远程 state member 的挂载点。[E: packages/chord/src/facets/host.ts:586]

[subsys.client.remote-session-client](../client/remote-session-client.md) 的现行公开面是 `Client` + `createClientServiceTransport(client, getTarget)`：把 `Client.request` / `subscribeService` 适配成 `RemoteServiceTransport`。[E: packages/client/src/index.ts:1][E: packages/client/src/client.ts:62][E: packages/client/src/client.ts:448][E: packages/client/src/client.ts:458] Chord 不 import `pi-client`。

[ref.package-index](../../reference/package-index.md) 枚举 workspace / publish 边界。`@earendil-works/chord` 版本锁步 `0.85.1`，与其它公开包同一 release 周期。[E: packages/chord/package.json:3]

## Sources

- packages/chord/package.json
- packages/chord/README.md
- packages/chord/src/index.ts
- packages/chord/src/api.ts
- packages/chord/src/types.ts
- packages/chord/src/json.ts
- packages/chord/src/facets/host.ts
- packages/chord/src/facets/loader.ts
- packages/chord/src/services/provider.ts
- packages/chord/src/services/consumer.ts
- packages/chord/src/services/handle.ts
- packages/chord/src/services/errors.ts
- packages/chord/src/services/wire.ts
- packages/chord/src/services/loopback.ts
- packages/chord/src/context/index.ts
- packages/chord/src/bundler.ts
- packages/chord/src/node.ts
- packages/chord/src/node/package.ts
- packages/chord/src/node/bundle.ts
- packages/chord/src/node/bundle-loader.ts
- packages/chord/src/node/manifest.ts
- packages/chord/test/services.test.ts
- packages/chord/test/facets.test.ts
- packages/chord/test/facet-loader.test.ts
- packages/chord/test/json.test.ts
- packages/client/src/index.ts
- packages/client/src/client.ts
- package.json

## 相关

- [spine.layered-architecture](../../spine/layered-architecture.md): Pi 分层与包边界；Chord 是不依赖其它 Pi 包的 composition 底层。
- [subsys.chord.delta](delta.md): `replicatedState` / `publish` / delta op / untrusted apply。
- [subsys.client.remote-session-client](../client/remote-session-client.md): `Client` + `createClientServiceTransport`，Chord `RemoteServiceTransport` 的一个应用 adapter。
- [ref.package-index](../../reference/package-index.md): monorepo workspace 与 lockstep 版本。
