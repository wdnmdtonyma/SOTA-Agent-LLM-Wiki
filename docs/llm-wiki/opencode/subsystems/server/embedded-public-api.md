---
id: server.embedded-public-api
title: Embedded Public API
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/package.json
  - packages/core/src/session.ts
  - packages/core/src/tool/application-tools.ts
  - packages/core/src/session/execution/local.ts
  - packages/core/src/location-services.ts
  - packages/core/src/location-service-map.ts
  - packages/server/src/routes.ts
  - packages/sdk-next/package.json
  - packages/sdk-next/src/opencode.ts
symbols:
  - OpenCode.create
  - OpenCode.Service
  - SessionV2
  - ApplicationTools
  - SessionExecutionLocal
  - LocationServiceMap
related:
  - session-v2.location-wiring
  - spine.v2-overview
  - subsys.tools.v2
evidence: explicit
status: verified
updated: 3fd77ae980
---

> `server.embedded-public-api` 记录 current V2 same-process embedding surface：monorepo-private 的 `@opencode-ai/sdk-next` 用 `OpenCode.create()` 把 embedded Effect HttpApi、generated Effect client、application-tool registration 和 permission state 组装成 consumer-facing scoped facade。[E: packages/sdk-next/package.json:3][E: packages/sdk-next/package.json:4][E: packages/sdk-next/src/opencode.ts:10][E: packages/sdk-next/src/opencode.ts:39][E: packages/sdk-next/src/opencode.ts:41]

## 能回答的问题
- 当前 same-process `OpenCode` facade 在哪里?
- `OpenCode.create()` 怎样把本地 route 变成 generated client?
- same-process 调用 V2 session 的核心 service 是哪个?
- 本进程 session execution 如何拿到 location-scoped services?
- application-defined tools 现在落在哪个 registry service?

## 当前边界

`@opencode-ai/core` package exports 采用 wildcard `./*` 指到 `./src/*.ts`，没有单独导出 `./public/*` facade。[E: packages/core/package.json:18][E: packages/core/package.json:23] current same-process replacement 位于 `packages/sdk-next/src/opencode.ts`；该 package 标记 `private: true`，所以这里的 consumer-facing facade 是 monorepo 内部 API，不代表已发布的外部 npm surface。[E: packages/sdk-next/package.json:4][E: packages/sdk-next/package.json:7][E: packages/sdk-next/src/opencode.ts:10][E: packages/sdk-next/src/opencode.ts:47][E: packages/sdk-next/src/opencode.ts:49]

`OpenCode.create()` 先在 caller `Scope` 内构建 `ApplicationTools` 与 `PermissionSaved` context；随后把 permission service 注入 `createEmbeddedRoutes()`，用 `HttpRouter.toWebHandler()` 得到本地 web handler，并注册 disposer。[E: packages/sdk-next/src/opencode.ts:11][E: packages/sdk-next/src/opencode.ts:13][E: packages/sdk-next/src/opencode.ts:14][E: packages/sdk-next/src/opencode.ts:18][E: packages/sdk-next/src/opencode.ts:19][E: packages/sdk-next/src/opencode.ts:20][E: packages/sdk-next/src/opencode.ts:22][E: packages/sdk-next/src/opencode.ts:23][E: packages/sdk-next/src/opencode.ts:24][E: packages/sdk-next/src/opencode.ts:30]

facade 再把 web handler 包成 local `fetch`，交给 generated Effect `OpenCode.make()`；返回值展开 generated client，并额外暴露 `tools.register`。`OpenCode.Service` 与 `OpenCode.layer` 分别提供 service tag 和可注入 Layer。[E: packages/sdk-next/src/opencode.ts:32][E: packages/sdk-next/src/opencode.ts:35][E: packages/sdk-next/src/opencode.ts:39][E: packages/sdk-next/src/opencode.ts:41][E: packages/sdk-next/src/opencode.ts:47][E: packages/sdk-next/src/opencode.ts:49]

## Session service

`SessionV2.Service` 的 tag 是 `@opencode/v2/Session`，接口包含 `create`、`get`、`list`、`messages`、`message`、`context`、`events`、`history`、`switchAgent`、`switchModel`、`prompt`、`shell`、`skill`、`compact`、`wait`、`active`、`resume`、`interrupt` 和 `revert`。[E: packages/core/src/session.ts:120][E: packages/core/src/session.ts:182]

`SessionV2.create` 接受或生成 `sessionID`，解析 `input.location.directory` 对应 project，写入 `ProjectTable`，构造 `SessionV1.SessionInfo`，并把 `SessionV1.Event.Created` 作为 event publish，`input.location` 是 publish options。[E: packages/core/src/session.ts:208][E: packages/core/src/session.ts:212][E: packages/core/src/session.ts:213][E: packages/core/src/session.ts:220][E: packages/core/src/session.ts:242]

`SessionV2.prompt` 先 `result.get(input.sessionID)`，再 `SessionInput.admit(db, events, ...)` durable admit prompt；如果 `input.resume !== false`，它调用 `execution.wake(admitted.sessionID)`。[E: packages/core/src/session.ts:360][E: packages/core/src/session.ts:363][E: packages/core/src/session.ts:368][E: packages/core/src/session.ts:382]

`SessionV2.switchModel` 读取 session，若 provider/model/variant 没变化就返回；否则 publish `SessionEvent.ModelSwitched`，payload 带 `sessionID`、新 `messageID`、timestamp 和 model ref。[E: packages/core/src/session.ts:402][E: packages/core/src/session.ts:410][E: packages/core/src/session.ts:414]

## Application tools

`ApplicationTools.Interface.register` 接受 `Readonly<Record<string, Tool.AnyTool>>`，effect type 仍带 `Scope.Scope` requirement；注册失败类型是 `RegistrationError`。[E: packages/core/src/tool/application-tools.ts:23][E: packages/core/src/tool/application-tools.ts:24] 当前实现校验 tool name、构造 registrations、把 registration 写入 state，并通过 `entries()` 暴露当前 map；旧节点里“scope close 会移除工具”的 cleanup path 在目标源码的 `application-tools.ts` 中没有出现。[E: packages/core/src/tool/application-tools.ts:43][E: packages/core/src/tool/application-tools.ts:46][E: packages/core/src/tool/application-tools.ts:47][E: packages/core/src/tool/application-tools.ts:49][E: packages/core/src/tool/application-tools.ts:52][I]

`OpenCode.create()` 在 global context 中构建并取出 `ApplicationTools.Service`，再把 `tools.register` 直接挂到 facade return 上。[E: packages/sdk-next/src/opencode.ts:14][E: packages/sdk-next/src/opencode.ts:18][E: packages/sdk-next/src/opencode.ts:41]

## Execution context

`SessionExecutionLocal` 是当前进程 execution layer。它从 `SessionStore.Service` 读取 session，从 `LocationServiceMap.Service` 取 location map，再在 drain 中用 `locations.get(session.location)` provide 给 `SessionRunner.Service.use(...runner.run...)`。[E: packages/core/src/session/execution/local.ts:14][E: packages/core/src/session/execution/local.ts:15][E: packages/core/src/session/execution/local.ts:20][E: packages/core/src/session/execution/local.ts:21]

`locationServices` 现在集中声明 location-scoped graph，包含 `Location`、`Policy`、`Config`、`AgentV2`、`CommandV2`、`Reference`、`Integration`、`Catalog`、`AISDK`、`PluginV2`、`PluginInternal`、`ProjectCopy`、filesystem、watcher、pty、skill、system context、permission、tool registry、built-in tools、runner model、snapshot 和 LLM runner nodes。[E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:78]

`buildLocationServiceMap()` 用 `LayerMap.make` 按 `Location.Ref` 构造 layer，给每个 ref 追加 `Location.boundNode(ref)` replacement，compile 后用 `Layer.fresh` 和全局 hoisted layer provide。[E: packages/core/src/location-services.ts:84][E: packages/core/src/location-services.ts:91][E: packages/core/src/location-services.ts:98][E: packages/core/src/location-services.ts:106]

`LocationServiceMap.Service.get(ref)` 只是把 `locations.get(ref)` unwrap 成 `Layer`，service tag 是 `@opencode/example/LocationServiceMap`。[E: packages/core/src/location-service-map.ts:7][E: packages/core/src/location-service-map.ts:12]

## Design notes

当前 embedded API 是“monorepo-private consumer-facing `OpenCode` facade 包住直接组合的 Effect nodes/services”：SDK layer 提供 `create/Service/layer`，server route layer 仍用 `AppNodeBuilder.build(applicationServices, [[SessionExecution.node, SessionExecutionLocal.node]])` 组合 core services。[E: packages/sdk-next/package.json:4][E: packages/sdk-next/src/opencode.ts:10][E: packages/sdk-next/src/opencode.ts:47][E: packages/sdk-next/src/opencode.ts:49][E: packages/server/src/routes.ts:26][E: packages/server/src/routes.ts:52]

## Sources

- `packages/core/package.json`
- `packages/core/src/session.ts`
- `packages/core/src/tool/application-tools.ts`
- `packages/core/src/session/execution/local.ts`
- `packages/core/src/location-services.ts`
- `packages/core/src/location-service-map.ts`
- `packages/server/src/routes.ts`
- `packages/sdk-next/package.json`
- `packages/sdk-next/src/opencode.ts`

## Related

- [session-v2.location-wiring](../session-v2/location-wiring.md)
- [spine.v2-overview](../../spine/v2-overview.md)
- [V2 tool system](../tools/v2.md)
