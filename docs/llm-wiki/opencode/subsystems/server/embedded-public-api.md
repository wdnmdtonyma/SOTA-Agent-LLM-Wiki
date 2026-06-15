---
id: server.embedded-public-api
title: Embedded Public API
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/public/
symbols:
  - OpenCode
  - OpenCode.Service
  - Session.Interface
  - Tool.Interface
related:
  - session-v2.location-wiring
  - spine.v2-overview
evidence: explicit
status: verified
updated: 92c70c9c3
---

`server.embedded-public-api` 描述 V2 core 的 native embedded facade。公开出口是 `packages/core/src/public/index.ts`，该文件导出 `OpenCode`、`Session`、`Tool`、`Location` 等 public-facing modules。[E: packages/core/src/public/index.ts:2][E: packages/core/src/public/index.ts:9] 它不是 HTTP server，而是 native API facade。[I]

## Public surface

`public/index.ts` 导出 `Agent`、`Model`、`OpenCode`、`Session`、`Tool`、`Location`、`Prompt`、`AbsolutePath`。[E: packages/core/src/public/index.ts:2][E: packages/core/src/public/index.ts:9] `OpenCode.Interface` 只有两个字段: `sessions: Session.Interface` 和 `tools: Tool.Interface`。[E: packages/core/src/public/opencode.ts:18][E: packages/core/src/public/opencode.ts:20] service tag 是 `@opencode/public/OpenCode`。[E: packages/core/src/public/opencode.ts:24]

`Session.Interface` 的方法包括 create、get、list、prompt、switchModel、interrupt、messages、message、context、events。[E: packages/core/src/public/session.ts:105][E: packages/core/src/public/session.ts:118] `CreateInput.location` 是必填 `Location.Ref`，而 `id`、`agent`、`model` 是可选字段。[E: packages/core/src/public/session.ts:66][E: packages/core/src/public/session.ts:70] `MessagesInput` 使用 `cursor` 分页，`EventsInput` 使用 `after` 游标。[E: packages/core/src/public/session.ts:85][E: packages/core/src/public/session.ts:102]

`Tool.Interface.register` 的签名要求 `Scope.Scope`，因此 public tool registration 是 scope-bound API；接口 doc-comment 还把它描述为 current Scope 上的 same-process tools，并说明 location tools 同名时优先、scope close 会移除工具。[E: packages/core/src/public/tool.ts:16][I] 已读实现侧的 `ApplicationTools.register` 展示了 tool name 校验、registration 构造和 entry 写入 state；cleanup path 不在该实现片段中出现。[E: packages/core/src/tool/application-tools.ts:45][E: packages/core/src/tool/application-tools.ts:52][I]

## Layer wiring

`OpenCode.layer` 先定义 `ApplicationToolsLayer = ApplicationTools.layer`，再把 `LocationServiceMap.layer` pipe 到 `ApplicationToolsLayer`。[E: packages/core/src/public/opencode.ts:35][E: packages/core/src/public/opencode.ts:36] `SessionsLayer` 合并 `SessionV2.layer`，并提供 `SessionProjector.layer`、`SessionExecutionLocal.layer`、`SessionStore.layer`、`EventV2.layer`、`Database.defaultLayer`、`ProjectV2.defaultLayer`，随后再与 `SessionModelValidationLayer` merge。[E: packages/core/src/public/opencode.ts:70][E: packages/core/src/public/opencode.ts:80] 这就是 embedded facade 真接通 V2 session store/execution/event pipeline 的核心证据。[I]

`OpenCode.layer` 目前只提供 Effect layer form；Promise facade `OpenCode.create(...)` 仍未在 public exports 中出现。[E: packages/core/src/public/index.ts:4][E: packages/core/src/public/opencode.ts:83][I]

## Sessions

`sessions.create` 在 facade 层把 public input 的 `id`、`agent`、`model`、`location` 传给 `SessionV2.create`。[E: packages/core/src/public/opencode.ts:92][E: packages/core/src/public/opencode.ts:97] `SessionV2.create` 会生成或接受 session id，解析 project，插入 `ProjectTable`，构造 `SessionV1.SessionInfo`，并 publish `SessionV1.Event.Created`；`location` 是 publish options，不是 event data 字段。[E: packages/core/src/session.ts:201][E: packages/core/src/session.ts:204][E: packages/core/src/session.ts:206][E: packages/core/src/session.ts:212][E: packages/core/src/session.ts:234]

`sessions.prompt` 在 facade 层只转发 `id`、`sessionID`、`prompt`、`delivery`，没有转发 `resume`。[E: packages/core/src/public/opencode.ts:107][E: packages/core/src/public/opencode.ts:112] `SessionV2.prompt` 调用 `SessionInput.admit(db, events, ...)`，如果 `resume !== false`，会对 admitted input 调 `enqueueWake`。[E: packages/core/src/session.ts:353][E: packages/core/src/session.ts:359] `enqueueWake` 调 `execution.wake(admitted.sessionID, admitted.admittedSeq)` 并 fork 到 scope。[E: packages/core/src/session.ts:177][E: packages/core/src/session.ts:184] 因为 public facade 不传 `resume`，public prompt path 的可见行为是 admit input 后唤醒本进程 execution。[I]

`sessions.switchModel` 先读取 session，再用 session location 做 model validation，最后调用 `sessions.switchModel(input)`。[E: packages/core/src/public/opencode.ts:101][E: packages/core/src/public/opencode.ts:104] validation 会等待 `PluginBoot.Service.wait()`，再从 catalog 找 model；未找到 model 抛 `ModelUnavailableError`，variant 不存在抛 `VariantUnavailableError`。[E: packages/core/src/public/opencode.ts:44][E: packages/core/src/public/opencode.ts:46][E: packages/core/src/public/opencode.ts:50][E: packages/core/src/public/opencode.ts:59]

`sessions.messages` 映射 `cursor`，`sessions.events` 映射 `after`。[E: packages/core/src/public/opencode.ts:114][E: packages/core/src/public/opencode.ts:119][E: packages/core/src/public/opencode.ts:123]

## Execution context

`SessionExecutionLocal.layer` 是本进程 execution layer: 它从 `LocationServiceMap` 取 locations，并在 drain 中用 `locations.get(session.location)` 提供给 `SessionRunner.Service.use(...runner.run...)`。[E: packages/core/src/session/execution/local.ts:15][E: packages/core/src/session/execution/local.ts:20][E: packages/core/src/session/execution/local.ts:21][I]

`LocationServiceMap.lookup` 会把 location、policy、config、reference、PluginV2、Catalog、Connector、CommandV2、AgentV2、PluginBoot、FileSystem、Watcher、Pty、SkillV2 等 location-scoped layers merge 到 base layer。[E: packages/core/src/location-layer.ts:55][E: packages/core/src/location-layer.ts:72] 它还构造 tool output resources、permission/tool registry、image、file mutation、skill/reference guidance、todos、questions、built-in tools、model 和 runner layers。[E: packages/core/src/location-layer.ts:73][E: packages/core/src/location-layer.ts:113]

## Design notes

Embedded public API 把 opencode 作为 Effect service 暴露: host 可以拿 `OpenCode.Service`，注册 same-process tools，并通过 V2 session API 创建、提示、切模型、读取消息和事件。[E: packages/core/src/public/opencode.ts:89][E: packages/core/src/public/opencode.ts:123] 它和 V2 HTTP `/api/*` 不是同一层；HTTP server 属于 `packages/server`，此节点只描述 `packages/core/src/public` 的 native facade。[I]

## Sources

- `packages/core/src/public/index.ts`
- `packages/core/src/public/opencode.ts`
- `packages/core/src/public/session.ts`
- `packages/core/src/public/tool.ts`
- `packages/core/src/tool/application-tools.ts`
- `packages/core/src/session.ts`
- `packages/core/src/session/execution/local.ts`
- `packages/core/src/location-layer.ts`

## Related

- [session-v2.location-wiring](../session-v2/location-wiring.md)
- [spine.v2-overview](../../spine/v2-overview.md)
