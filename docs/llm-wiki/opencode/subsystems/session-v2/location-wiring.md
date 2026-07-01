---
id: session-v2.location-wiring
title: Location-scoped runner 装配
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/location-service-map.ts
  - packages/core/src/location-services.ts
  - packages/core/src/effect/app-node-builder.ts
  - packages/core/src/session.ts
  - packages/core/src/session/execution.ts
  - packages/core/src/session/execution/local.ts
  - packages/server/src/routes.ts
  - packages/sdk-next/src/opencode.ts
  - packages/core/src/integration.ts
  - packages/core/src/project/copy.ts
  - specs/v2/session.md
symbols: [LocationServiceMap.Service, buildLocationServiceMap, locationServices, AppNodeBuilder.build, SessionExecution.noopLayer, SessionExecutionLocal.node, createEmbeddedRoutes, OpenCode.create]
related: [spine.v2-coordinator, persistence.project-instance-location, integrations.integration-v2, persistence.project-directories]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Location wiring 是 V2 runner 的 layer graph: `LocationServiceMap.Service` 为每个 `Location.Ref` 构建 runner/model/tools/context 等 Location-scoped services,server routes 用 `SessionExecutionLocal.node` 接入本进程 runner,embedded SDK 通过 in-memory HTTP routes 暴露同一 session API。

## 能回答的问题

- 哪个 layer 创建 Location-scoped `SessionRunner`、model resolver 和 tools?
- `SessionV2.node` 默认依赖的 execution 能力和 server replacement 有什么差异?
- 为什么单独使用 noop execution 只会 durable record,不会 drain runner?
- LocationServiceMap 的 process-global dependencies 怎样被 hoist?
- embedded API 的 `sessions.prompt` 如何进入 V2 session service?

## 职责边界

`LocationServiceMap.Service` 是 `LayerMap<Location.Ref, LocationServices, LocationError>` 的 service tag;消费侧通过 `Service.get(ref)` 或 map 的 `get(ref)` 进入 Location layer,它不是 public session API。[E: packages/core/src/location-service-map.ts:7][E: packages/core/src/location-service-map.ts:9][E: packages/core/src/location-service-map.ts:11][E: packages/core/src/session/execution/local.ts:15][E: packages/core/src/session/execution/local.ts:21][I]

`locationServices` 是 Location-scoped node group,包含 policy/config/catalog/integration/plugin/project copy/filesystem/watcher/pty/skill/system context/permission/tool registry/built-in tools/model resolver/snapshot/LLM runner 等 services。[E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:49][E: packages/core/src/location-services.ts:52][E: packages/core/src/location-services.ts:54][E: packages/core/src/location-services.ts:57][E: packages/core/src/location-services.ts:65][E: packages/core/src/location-services.ts:67][E: packages/core/src/location-services.ts:75][E: packages/core/src/location-services.ts:76][E: packages/core/src/location-services.ts:78]

V2 design says execution routing starts from Session ID,then loads the session,enters the session's LocationServiceMap entry,and runs `SessionRunner.run({ sessionID, force? })`。[E: specs/v2/session.md:39][E: specs/v2/session.md:42][E: specs/v2/session.md:43][E: specs/v2/session.md:44][E: specs/v2/session.md:45]

## LocationServiceMap 控制流

1. `LocationServiceMap.Service@packages/core/src/location-service-map.ts:7` is the global unbound service;`Service.get(ref)` unwraps the layer stored for a `Location.Ref`。[E: packages/core/src/location-service-map.ts:7][E: packages/core/src/location-service-map.ts:11][E: packages/core/src/location-service-map.ts:16]

2. `buildLocationServiceMap@packages/core/src/location-services.ts:84` returns a `Layer.Layer<LocationServiceMap.Service>` built with `LayerMap.make(...)`;each lookup adds a `Location.boundNode(ref)` replacement,hoists global dependencies,compiles the Location node fresh,and sets idle TTL to 60 minutes。[E: packages/core/src/location-services.ts:84][E: packages/core/src/location-services.ts:87][E: packages/core/src/location-services.ts:89][E: packages/core/src/location-services.ts:91][E: packages/core/src/location-services.ts:92][E: packages/core/src/location-services.ts:94][E: packages/core/src/location-services.ts:95][E: packages/core/src/location-services.ts:102][E: packages/core/src/location-services.ts:105]

3. `locationServices` names the concrete Location-scoped services. The old monolithic `packages/core/src/location-layer.ts` has been deleted; this node's source of truth is now `location-services.ts` plus `location-service-map.ts`。[E: packages/core/src/location-services.ts:42][I]

4. `AppNodeBuilder.build` auto-injects a `LocationServiceMap.node` replacement if the root graph needs it and caller did not provide one;it constructs the map with `buildLocationServiceMap(replacements)` and compiles the final root with all replacements。[E: packages/core/src/effect/app-node-builder.ts:6][E: packages/core/src/effect/app-node-builder.ts:10][E: packages/core/src/effect/app-node-builder.ts:11][E: packages/core/src/effect/app-node-builder.ts:12][E: packages/core/src/effect/app-node-builder.ts:13][E: packages/core/src/effect/app-node-builder.ts:16]

## Execution wiring

`SessionExecution.noopLayer` provides `active` as an empty set and `resume`/`wake`/`interrupt` as no-op effects;this makes it a durable-recording-only execution layer by implementation。[E: packages/core/src/session/execution.ts:26][E: packages/core/src/session/execution.ts:29][E: packages/core/src/session/execution.ts:30][E: packages/core/src/session/execution.ts:31][E: packages/core/src/session/execution.ts:32][I]

`SessionV2.node` is a global node that depends on `SessionExecution.node`;the concrete execution implementation is supplied by graph replacement. If callers provide noop execution,`SessionV2.prompt` still admits prompt rows and calls `execution.wake(admitted.sessionID)`,but noop wake resolves without draining runner。[E: packages/core/src/session.ts:382][E: packages/core/src/session.ts:474][E: packages/core/src/session.ts:481][E: packages/core/src/session/execution.ts:31][I]

`SessionExecutionLocal.node` is the current-process runner routing implementation:it loads the session from `SessionStore`,enters `locations.get(session.location)`,and calls `SessionRunner.Service.use((runner) => runner.run({ sessionID, force }))` inside that Location layer。[E: packages/core/src/session/execution/local.ts:11][E: packages/core/src/session/execution/local.ts:14][E: packages/core/src/session/execution/local.ts:15][E: packages/core/src/session/execution/local.ts:18][E: packages/core/src/session/execution/local.ts:20][E: packages/core/src/session/execution/local.ts:21][E: packages/core/src/session/execution/local.ts:40]

## Server and embedded API wiring

`packages/server/src/routes.ts` builds application services with `AppNodeBuilder.build(applicationServices, [[SessionExecution.node, SessionExecutionLocal.node]])`,so network and embedded server routes use local execution rather than noop execution。[E: packages/server/src/routes.ts:26][E: packages/server/src/routes.ts:31][E: packages/server/src/routes.ts:36][E: packages/server/src/routes.ts:52][E: packages/server/src/routes.ts:61]

`createEmbeddedRoutes()` calls the same route builder with passwordless auth config;`packages/sdk-next/src/opencode.ts` creates an in-memory web handler from those routes,wraps it as a fetch implementation,and constructs the generated Effect client against `http://opencode.local`。[E: packages/server/src/routes.ts:47][E: packages/server/src/routes.ts:48][E: packages/sdk-next/src/opencode.ts:20][E: packages/sdk-next/src/opencode.ts:22][E: packages/sdk-next/src/opencode.ts:23][E: packages/sdk-next/src/opencode.ts:32][E: packages/sdk-next/src/opencode.ts:35]

`OpenCode.create` also builds same-process `ApplicationTools.Service` and returns `tools.register` alongside the generated client;there is no current `packages/core/src/public/opencode.ts` source file in this HEAD。[E: packages/sdk-next/src/opencode.ts:13][E: packages/sdk-next/src/opencode.ts:18][E: packages/sdk-next/src/opencode.ts:39][E: packages/sdk-next/src/opencode.ts:41][I]

## 设计动机与权衡

- Location-scoped runner lets one process run different projects/workspaces with distinct catalog,integrations,permissions,tools,filesystem watcher,system context,model resolver and runner,while `AppNodeBuilder` hoists process-global dependencies outside each Location instance。[E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:49][E: packages/core/src/location-services.ts:65][E: packages/core/src/location-services.ts:67][E: packages/core/src/location-services.ts:76][E: packages/core/src/location-services.ts:78][E: packages/core/src/location-services.ts:92][E: packages/core/src/location-services.ts:102][I]
- `SessionExecutionLocal.layer` starts from only `sessionID` and resolves the current session location at drain time;this matches V2 spec and makes moved sessions route to the destination Location on the next run。[E: specs/v2/session.md:39][E: packages/core/src/session/execution/local.ts:18][E: packages/core/src/session/execution/local.ts:21][I]
- Server routes explicitly replace `SessionExecution.node` with `SessionExecutionLocal.node`;plain `SessionV2.node` remains reusable in tests or embedding graphs that want durable recording without local drains。[E: packages/server/src/routes.ts:52][E: packages/core/src/session/execution.ts:26][I]

## gotcha

- `LocationServiceMap` 的 service tag 字符串目前是 `"@opencode/example/LocationServiceMap"`;不要把这个 tag 当成 public package name 或云 integration。[E: packages/core/src/location-service-map.ts:10][I]
- `packages/core/src/integration.ts` 在 V2 是 integration registry 与 credential authorization/storage 相关服务,不是云连接器;`Integration.locationLayer` 只是 Location service graph 的一部分。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:221][E: packages/core/src/integration.ts:380][E: packages/core/src/location-services.ts:49][I]
- `ProjectCopy.locationLayer` 仍是 Location services 的一部分,但 it is not the LocationServiceMap implementation itself。[E: packages/core/src/location-services.ts:54][E: packages/core/src/project/copy.ts:281][I]
- 只提供 noop `SessionExecution` 时,`prompt` 会 admission,但 `wake` 不会 route through `LocationServiceMap`;server routes 或等价 graph replacement 才接通 local runner。[E: packages/core/src/session.ts:382][E: packages/core/src/session/execution.ts:31][E: packages/server/src/routes.ts:52]

## Sources

- packages/core/src/location-service-map.ts
- packages/core/src/location-services.ts
- packages/core/src/effect/app-node-builder.ts
- packages/core/src/session.ts
- packages/core/src/session/execution.ts
- packages/core/src/session/execution/local.ts
- packages/server/src/routes.ts
- packages/sdk-next/src/opencode.ts
- packages/core/src/integration.ts
- packages/core/src/project/copy.ts
- specs/v2/session.md

## 相关

- [spine.v2-coordinator](../../spine/v2-coordinator.md)
- [persistence.project-instance-location](../persistence/project-instance-location.md)
- [integrations.integration-v2](../integrations/integration-v2.md)
- [persistence.project-directories](../persistence/project-directories.md)
