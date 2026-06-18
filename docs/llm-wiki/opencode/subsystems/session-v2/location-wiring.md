---
id: session-v2.location-wiring
title: Location-scoped runner 装配
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/location-layer.ts, packages/core/src/public/opencode.ts, packages/core/src/session.ts, packages/core/src/session/execution.ts, packages/core/src/session/execution/local.ts, packages/core/src/integration.ts, packages/core/src/project/copy.ts, specs/v2/session.md, AGENTS.md]
symbols: [LocationServiceMap, OpenCode.layer, SessionExecution.noopLayer, SessionExecutionLocal.layer, SessionsLayer, LocationServicesLayer, Integration.locationLayer, ProjectCopy.locationLayer]
related: [spine.v2-coordinator, persistence.project-instance-location, integrations.integration-v2, persistence.project-directories]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Location wiring 是 V2 真正能跑起来的 layer graph: `LocationServiceMap` 为每个 Location 构建 runner/model/tools/context 等服务,`OpenCode.layer` 再把 `SessionV2.layer` 接到 `SessionExecutionLocal.layer`。

## 能回答的问题
- 哪个 layer 创建 Location-scoped `SessionRunner`、model resolver 和 tools?
- `OpenCode.layer` 与 `SessionV2.defaultLayer` 的执行能力有什么差异?
- 为什么 V2 默认可能只 admit prompt 而不跑 runner?
- LocationServiceMap 的 process-global dependencies 有哪些?
- public embedded API 的 `sessions.prompt` 如何进入 V2 session service?

## 职责边界

`LocationServiceMap` 是按 `Location.Ref` 配置 `lookup(ref)` 的 `LayerMap.Service`;消费侧通过 LayerMap 的 `get(ref)` 进入 Location layer,它不是 public session API。[E: packages/core/src/location-layer.ts:51][E: packages/core/src/location-layer.ts:56][E: packages/core/src/session/execution/local.ts:21][I] `OpenCode.layer` 是 public API 组合点,它导出 `sessions` 和 `tools` 两个接口。[E: packages/core/src/public/opencode.ts:19][E: packages/core/src/public/opencode.ts:20][I]

V2 设计要求 `SessionExecution` process-global 且从 Session ID route 到 owning Location runner;`SessionRunner`、model resolver、tool registry、permission 和 filesystem 是 Location-scoped。[E: AGENTS.md:152][E: AGENTS.md:153]

## LocationServiceMap 控制流

1. `LocationServiceMap@packages/core/src/location-layer.ts:48` 是 `LayerMap.Service`,`lookup(ref)` 为一个 `Location.Ref` 构建 layer,并设置 idle TTL 为 60 minutes。[E: packages/core/src/location-layer.ts:51][E: packages/core/src/location-layer.ts:56][E: packages/core/src/location-layer.ts:125]

2. `lookup` 先建立 `Location.layer(ref)` 和 `SystemContextBuiltIns.locationLayer`,随后 `Layer.mergeAll(...)` 组合 location、policy、config、reference、plugin、catalog、integration、command、agent、plugin boot、project copy、filesystem、watcher、pty、skill、system context、location mutation。[E: packages/core/src/location-layer.ts:56][E: packages/core/src/location-layer.ts:57][E: packages/core/src/location-layer.ts:58][E: packages/core/src/location-layer.ts:59][E: packages/core/src/location-layer.ts:60][E: packages/core/src/location-layer.ts:61][E: packages/core/src/location-layer.ts:62][E: packages/core/src/location-layer.ts:63][E: packages/core/src/location-layer.ts:64][E: packages/core/src/location-layer.ts:65][E: packages/core/src/location-layer.ts:66][E: packages/core/src/location-layer.ts:67][E: packages/core/src/location-layer.ts:68][E: packages/core/src/location-layer.ts:69][E: packages/core/src/location-layer.ts:70][E: packages/core/src/location-layer.ts:71][E: packages/core/src/location-layer.ts:72][E: packages/core/src/location-layer.ts:73][E: packages/core/src/location-layer.ts:74][E: packages/core/src/location-layer.ts:75]

3. `resources` 是 `ToolOutputStore.layer` provided by base;`permissionsAndTools` 是 `ToolRegistry.layer` provided by `PermissionV2.locationLayer`、resources 和 base。[E: packages/core/src/location-layer.ts:77][E: packages/core/src/location-layer.ts:78][E: packages/core/src/location-layer.ts:79][E: packages/core/src/location-layer.ts:80][E: packages/core/src/location-layer.ts:81]

4. `services = Layer.mergeAll(base, resources, permissionsAndTools)` 成为 image、file mutation、skill guidance、reference guidance、todo、question 等下游 Location services 的 provider。[E: packages/core/src/location-layer.ts:83][E: packages/core/src/location-layer.ts:84][E: packages/core/src/location-layer.ts:85][E: packages/core/src/location-layer.ts:86][E: packages/core/src/location-layer.ts:87][E: packages/core/src/location-layer.ts:88][E: packages/core/src/location-layer.ts:89]

5. `BuiltInTools.locationLayer` 在同一 Location graph 中获得 services、mutation、resources、todos、questions 和 image,形成 `builtInTools` layer 供最终 merge 使用。[E: packages/core/src/location-layer.ts:90][E: packages/core/src/location-layer.ts:91][E: packages/core/src/location-layer.ts:92][E: packages/core/src/location-layer.ts:93][E: packages/core/src/location-layer.ts:94][E: packages/core/src/location-layer.ts:95][E: packages/core/src/location-layer.ts:96][E: packages/core/src/location-layer.ts:120]

6. `SessionRunnerModel.locationLayer` 由 `services` 提供,`SessionRunnerLLM.defaultLayer` 再由 services、model、skillGuidance、referenceGuidance 提供,形成 per-Location runner。[E: packages/core/src/location-layer.ts:98][E: packages/core/src/location-layer.ts:99][E: packages/core/src/location-layer.ts:100][E: packages/core/src/location-layer.ts:101][E: packages/core/src/location-layer.ts:102][E: packages/core/src/location-layer.ts:103]

7. `lookup` 最终 merge boot、services、image、mutation、resources、todos、questions、model、runner、builtInTools、referenceGuidance,并 `Layer.fresh`。[E: packages/core/src/location-layer.ts:110][E: packages/core/src/location-layer.ts:111][E: packages/core/src/location-layer.ts:112][E: packages/core/src/location-layer.ts:113][E: packages/core/src/location-layer.ts:114][E: packages/core/src/location-layer.ts:115][E: packages/core/src/location-layer.ts:116][E: packages/core/src/location-layer.ts:117][E: packages/core/src/location-layer.ts:118][E: packages/core/src/location-layer.ts:119][E: packages/core/src/location-layer.ts:120][E: packages/core/src/location-layer.ts:122][E: packages/core/src/location-layer.ts:123]

8. `LocationServiceMap.dependencies` 是 process-global/shared dependencies,包括 Project、EventV2、Credential、Npm、ModelsDev、FSUtil、Git、AppProcess、Global、Ripgrep、Database、ProjectDirectories、SessionStore、PermissionSaved、RepositoryCache、LLMClient、FetchHttpClient、ToolOutputStore cleanup 和 ApplicationTools。[E: packages/core/src/location-layer.ts:126][E: packages/core/src/location-layer.ts:127][E: packages/core/src/location-layer.ts:128][E: packages/core/src/location-layer.ts:129][E: packages/core/src/location-layer.ts:130][E: packages/core/src/location-layer.ts:131][E: packages/core/src/location-layer.ts:132][E: packages/core/src/location-layer.ts:133][E: packages/core/src/location-layer.ts:134][E: packages/core/src/location-layer.ts:135][E: packages/core/src/location-layer.ts:136][E: packages/core/src/location-layer.ts:137][E: packages/core/src/location-layer.ts:138][E: packages/core/src/location-layer.ts:139][E: packages/core/src/location-layer.ts:140][E: packages/core/src/location-layer.ts:141][E: packages/core/src/location-layer.ts:142][E: packages/core/src/location-layer.ts:143][E: packages/core/src/location-layer.ts:144][E: packages/core/src/location-layer.ts:145][I]

## Execution wiring

`SessionExecution.noopLayer` 提供的 `resume`、`wake`、`interrupt` 都是 `Effect.void`;把它定位为 durable Session recording compatibility layer 是由 noop implementation 与默认装配关系推出的解释。[E: packages/core/src/session/execution.ts:20][E: packages/core/src/session/execution.ts:22][I] `SessionV2.defaultLayer` 使用的正是 `SessionExecution.noopLayer`;在这个默认 layer 下,`prompt` 仍会走 `SessionInput.admit`,wake path 的 concrete effect 是 `execution.wake(admitted.sessionID, admitted.admittedSeq)`,而 noop wake resolves `Effect.void`;“不会真正 drain runner”是这些事实的组合推断。[E: packages/core/src/session.ts:177][E: packages/core/src/session.ts:359][E: packages/core/src/session.ts:429][E: packages/core/src/session/execution.ts:22][I]

`SessionExecutionLocal.layer` 是 runner routing implementation:它通过 `SessionStore.get(sessionID)` 取 session,然后 `locations.get(session.location)` 进入 Location layer,在其中调用 `SessionRunner.Service.use((runner) => runner.run({ sessionID, force: mode === "run" }))`。current process-local 的定位来自 layer 命名和 drain implementation。[E: packages/core/src/session/execution/local.ts:16][E: packages/core/src/session/execution/local.ts:18][E: packages/core/src/session/execution/local.ts:20][E: packages/core/src/session/execution/local.ts:21][I]

V2 session spec 也把 routing 写成 `SessionExecution.resume(sessionID) -> SessionStore.get(sessionID) -> LocationServiceMap.get(session.location) -> SessionRunner.run({ sessionID, force? })`。[E: specs/v2/session.md:35][E: specs/v2/session.md:36][E: specs/v2/session.md:37][E: specs/v2/session.md:38]

## OpenCode.layer

`OpenCode.layer` 先定义 `ApplicationToolsLayer = ApplicationTools.layer`,再用 `LocationServiceMap.layer.pipe(Layer.provide(ApplicationToolsLayer))` 构造 `LocationServicesLayer`。[E: packages/core/src/public/opencode.ts:35][E: packages/core/src/public/opencode.ts:36]

`SessionsLayer` 把 `SessionV2.layer` 与 `SessionModelValidationLayer` merge,并给 `SessionV2.layer` 显式 provide `SessionProjector.layer`、`SessionExecutionLocal.layer`、`SessionStore.layer`、`EventV2.layer`、`Database.defaultLayer`、`ProjectV2.defaultLayer`。[E: packages/core/src/public/opencode.ts:70][E: packages/core/src/public/opencode.ts:71][E: packages/core/src/public/opencode.ts:72][E: packages/core/src/public/opencode.ts:73][E: packages/core/src/public/opencode.ts:74][E: packages/core/src/public/opencode.ts:75][E: packages/core/src/public/opencode.ts:76][E: packages/core/src/public/opencode.ts:77][E: packages/core/src/public/opencode.ts:80] 这就是 `OpenCode.layer` 与 `SessionV2.defaultLayer` 的关键差异:前者接入 local execution,后者使用 noop execution。[E: packages/core/src/public/opencode.ts:73][E: packages/core/src/session.ts:429]

public service body 在 `OpenCode.layer` 中从 `SessionV2.Service` 和 `ApplicationTools.Service` 取 handles,返回 `tools.register` 和 session methods。[E: packages/core/src/public/opencode.ts:83][E: packages/core/src/public/opencode.ts:86][E: packages/core/src/public/opencode.ts:87][E: packages/core/src/public/opencode.ts:90][E: packages/core/src/public/opencode.ts:92] public `sessions.prompt` 转发 `id/sessionID/prompt/delivery`;它未传 `resume`,所以会进入 `SessionV2.prompt` 的 ordinary advisory wake path。[E: packages/core/src/public/opencode.ts:108][E: packages/core/src/public/opencode.ts:109][E: packages/core/src/public/opencode.ts:110][E: packages/core/src/public/opencode.ts:111][E: packages/core/src/public/opencode.ts:112][E: packages/core/src/session.ts:177][I]

## 设计动机与权衡

- Location-scoped runner 让同一个 process 中不同 project/location 拥有各自 catalog、integration、permissions、tools、filesystem watcher 和 system context,但共享 database/event/LLM client 等 process-global services。[E: packages/core/src/location-layer.ts:64][E: packages/core/src/location-layer.ts:65][E: packages/core/src/location-layer.ts:70][E: packages/core/src/location-layer.ts:71][E: packages/core/src/location-layer.ts:74][E: packages/core/src/location-layer.ts:78][E: packages/core/src/location-layer.ts:79][E: packages/core/src/location-layer.ts:98][E: packages/core/src/location-layer.ts:99][E: packages/core/src/location-layer.ts:128][E: packages/core/src/location-layer.ts:137][E: packages/core/src/location-layer.ts:142][I]
- `SessionExecutionLocal.layer` 在 drain start 时通过 session current location 进入 Location layer;这匹配 V2 spec 对 execution routing starts from only Session ID 的要求。[E: specs/v2/session.md:32][E: packages/core/src/session/execution/local.ts:18][E: packages/core/src/session/execution/local.ts:21][I]
- `SessionV2.defaultLayer` 使用 noop execution 是 durable Session recording compatibility layer;真正接通 execution 的是 `OpenCode.layer` 这种显式组合。[E: packages/core/src/session/execution.ts:20][E: packages/core/src/session/execution.ts:22][E: packages/core/src/session.ts:429][E: packages/core/src/public/opencode.ts:71][E: packages/core/src/public/opencode.ts:73][I]

## gotcha

- `LocationServiceMap` 的 service tag 字符串目前是 `"@opencode/example/LocationServiceMap"`;不要把这个 tag 当成 public package name 或云 integration 是基于 tag 命名与该文件职责边界的阅读提示。[E: packages/core/src/location-layer.ts:51][I]
- `packages/core/src/integration.ts` 在 V2 是 integration registry 与 credential authorization/storage 相关服务,不是云连接器;location layer 中的 `Integration.locationLayer` 只是 Location service graph 的一部分。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:205][E: packages/core/src/integration.ts:238][E: packages/core/src/integration.ts:253][E: packages/core/src/integration.ts:451][E: packages/core/src/integration.ts:477][E: packages/core/src/location-layer.ts:65][I]
- 只调用 `SessionV2.defaultLayer` 下的 `prompt` 会 admission,但 `wake` 是 no-op;provide `SessionExecutionLocal.layer` 或等价 execution layer 后才会 route through `LocationServiceMap` and drain runner。[E: packages/core/src/session.ts:177][E: packages/core/src/session.ts:359][E: packages/core/src/session.ts:429][E: packages/core/src/session/execution.ts:22][E: packages/core/src/public/opencode.ts:73][E: packages/core/src/session/execution/local.ts:18][E: packages/core/src/session/execution/local.ts:20][E: packages/core/src/session/execution/local.ts:21][I]

## Sources
- packages/core/src/location-layer.ts
- packages/core/src/public/opencode.ts
- packages/core/src/session.ts
- packages/core/src/session/execution.ts
- packages/core/src/session/execution/local.ts
- packages/core/src/integration.ts
- packages/core/src/project/copy.ts
- specs/v2/session.md
- AGENTS.md

## 相关
- [spine.v2-coordinator](../../spine/v2-coordinator.md)
- [persistence.project-instance-location](../persistence/project-instance-location.md)
- [integrations.integration-v2](../integrations/integration-v2.md)
- [persistence.project-directories](../persistence/project-directories.md)
