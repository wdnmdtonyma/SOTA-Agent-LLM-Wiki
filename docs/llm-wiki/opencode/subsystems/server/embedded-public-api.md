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
symbols:
  - SessionV2
  - ApplicationTools
  - SessionExecutionLocal
  - LocationServiceMap
related:
  - session-v2.location-wiring
  - spine.v2-overview
evidence: explicit
status: verified
updated: 8b68dc0d7
---

`server.embedded-public-api` 记录 8b68dc0d7 下 V2 core 的 same-process embedding surface。旧 `packages/core/src/public/*` facade 在当前源码树中没有等价文件；本节点把可核证部分收敛到 core Effect services: `SessionV2`、`ApplicationTools`、`SessionExecutionLocal` 和 `LocationServiceMap`。[U]

## 能回答的问题
- 8b68dc0d7 还有没有 `packages/core/src/public` embedded facade?
- same-process 调用 V2 session 的核心 service 是哪个?
- 本进程 session execution 如何拿到 location-scoped services?
- application-defined tools 现在落在哪个 registry service?

## 当前边界

`@opencode-ai/core` package exports 采用 wildcard `./*` 指到 `./src/*.ts`，没有单独导出 `./public/*` facade。[E: packages/core/package.json:18][E: packages/core/package.json:23] 当前源码树中未找到 `packages/core/src/public/index.ts`、`packages/core/src/public/opencode.ts`、`packages/core/src/public/session.ts`、`packages/core/src/public/tool.ts` 的 replacement；“旧 public facade 已删除但 replacement 名称未确认”按存疑处理。[U]

这意味着旧节点里 `OpenCode.Interface`、`OpenCode.layer`、`Session.Interface`、`Tool.Interface`、`OpenCode.create(...)` 等 public-facing 断言不能继续标 `[E]`。当前可证的 embedded path 是 host 直接组合 Effect services，而不是通过 `OpenCode.Service` facade。[I]

## Session service

`SessionV2.Service` 的 tag 是 `@opencode/v2/Session`，接口包含 `create`、`get`、`list`、`messages`、`message`、`context`、`events`、`history`、`switchAgent`、`switchModel`、`prompt`、`shell`、`skill`、`compact`、`wait`、`active`、`resume`、`interrupt` 和 `revert`。[E: packages/core/src/session.ts:120][E: packages/core/src/session.ts:182]

`SessionV2.create` 接受或生成 `sessionID`，解析 `input.location.directory` 对应 project，写入 `ProjectTable`，构造 `SessionV1.SessionInfo`，并把 `SessionV1.Event.Created` 作为 event publish，`input.location` 是 publish options。[E: packages/core/src/session.ts:208][E: packages/core/src/session.ts:212][E: packages/core/src/session.ts:213][E: packages/core/src/session.ts:220][E: packages/core/src/session.ts:242]

`SessionV2.prompt` 先 `result.get(input.sessionID)`，再 `SessionInput.admit(db, events, ...)` durable admit prompt；如果 `input.resume !== false`，它调用 `execution.wake(admitted.sessionID)`。[E: packages/core/src/session.ts:360][E: packages/core/src/session.ts:363][E: packages/core/src/session.ts:368][E: packages/core/src/session.ts:382]

`SessionV2.switchModel` 读取 session，若 provider/model/variant 没变化就返回；否则 publish `SessionEvent.ModelSwitched`，payload 带 `sessionID`、新 `messageID`、timestamp 和 model ref。[E: packages/core/src/session.ts:402][E: packages/core/src/session.ts:410][E: packages/core/src/session.ts:414]

## Application tools

`ApplicationTools.Interface.register` 接受 `Readonly<Record<string, Tool.AnyTool>>`，effect type 仍带 `Scope.Scope` requirement；注册失败类型是 `RegistrationError`。[E: packages/core/src/tool/application-tools.ts:23][E: packages/core/src/tool/application-tools.ts:24] 当前实现校验 tool name、构造 registrations、把 registration 写入 state，并通过 `entries()` 暴露当前 map；旧节点里“scope close 会移除工具”的 cleanup path 在 8b68dc0d7 的 `application-tools.ts` 中没有出现。[E: packages/core/src/tool/application-tools.ts:43][E: packages/core/src/tool/application-tools.ts:46][E: packages/core/src/tool/application-tools.ts:47][E: packages/core/src/tool/application-tools.ts:49][E: packages/core/src/tool/application-tools.ts:52][I]

`ApplicationTools` 的 public-facing 位置现在不是 `packages/core/src/public/tool.ts`，而是 location service graph 里的 `ToolRegistry`/application tools 能力。[I]

## Execution context

`SessionExecutionLocal` 是当前进程 execution layer。它从 `SessionStore.Service` 读取 session，从 `LocationServiceMap.Service` 取 location map，再在 drain 中用 `locations.get(session.location)` provide 给 `SessionRunner.Service.use(...runner.run...)`。[E: packages/core/src/session/execution/local.ts:14][E: packages/core/src/session/execution/local.ts:15][E: packages/core/src/session/execution/local.ts:20][E: packages/core/src/session/execution/local.ts:21]

`locationServices` 现在集中声明 location-scoped graph，包含 `Location`、`Policy`、`Config`、`AgentV2`、`CommandV2`、`Reference`、`Integration`、`Catalog`、`AISDK`、`PluginV2`、`PluginInternal`、`ProjectCopy`、filesystem、watcher、pty、skill、system context、permission、tool registry、built-in tools、runner model、snapshot 和 LLM runner nodes。[E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:78]

`buildLocationServiceMap()` 用 `LayerMap.make` 按 `Location.Ref` 构造 layer，给每个 ref 追加 `Location.boundNode(ref)` replacement，compile 后用 `Layer.fresh` 和全局 hoisted layer provide。[E: packages/core/src/location-services.ts:84][E: packages/core/src/location-services.ts:91][E: packages/core/src/location-services.ts:94][E: packages/core/src/location-services.ts:102]

`LocationServiceMap.Service.get(ref)` 只是把 `locations.get(ref)` unwrap 成 `Layer`，service tag 是 `@opencode/example/LocationServiceMap`。[E: packages/core/src/location-service-map.ts:7][E: packages/core/src/location-service-map.ts:12]

## Design notes

8b68dc0d7 的 embedded story 更像“直接组合 Effect nodes/services”，而不是“导入一个 public `OpenCode` facade”。`packages/server/src/routes.ts` 也体现同一模式: server route layer 用 `AppNodeBuilder.build(applicationServices, [[SessionExecution.node, SessionExecutionLocal.node]])` 组合 core services。[E: packages/server/src/routes.ts:26][E: packages/server/src/routes.ts:52][I]

## Sources

- `packages/core/package.json`
- `packages/core/src/session.ts`
- `packages/core/src/tool/application-tools.ts`
- `packages/core/src/session/execution/local.ts`
- `packages/core/src/location-services.ts`
- `packages/core/src/location-service-map.ts`
- `packages/server/src/routes.ts`

## Related

- [session-v2.location-wiring](../session-v2/location-wiring.md)
- [spine.v2-overview](../../spine/v2-overview.md)
