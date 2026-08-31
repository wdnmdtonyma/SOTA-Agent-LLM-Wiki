---
id: subsys.host.apiproxy
title: Host HTTP API（三个 *-controller + webserver）
kind: subsystem
tier: T2
pkg: host
source:
  - packages/api/session-controller/package.json
  - packages/api/session-controller/src/index.ts
  - packages/api/session-controller/src/commands.ts
  - packages/api/session-controller/src/agent.ts
  - packages/api/session-controller/src/remote-events.ts
  - packages/api/session-controller/src/client/index.ts
  - packages/api/settings-controller/package.json
  - packages/api/settings-controller/src/index.ts
  - packages/api/settings-controller/src/credentials.ts
  - packages/api/workspace-controller/package.json
  - packages/api/workspace-controller/src/index.ts
  - packages/api/gateway/package.json
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/src/stream-protocol.ts
  - packages/host/webserver/package.json
  - packages/host/webserver/src/index.ts
  - packages/host/frontend-static/package.json
  - packages/host/frontend-static/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/client/connection/src/api-path.ts
  - packages/client/connection/src/rpc-host.ts
symbols:
  - SessionController
  - ctx.sessionController
  - SettingsController
  - ctx.settingsController
  - WorkspaceController
  - ctx.workspaceController
  - TypertGatewayService
  - ctx.typertGateway
  - WebServer
  - ctx.webServer
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.host.webserver
  - subsys.client.connection
  - subsys.composition.agent-presets
  - subsys.integration.api-gateway
evidence: explicit
status: verified
updated: 0a53fb55be
---

> 旧包 `@deepseek-ai/dsh-host-apiproxy` / `packages/host/apiproxy` **已删除**。Host HTTP API 现为三个 Typert Remote 所有者（`session` / `settings` / `workspace`）加上 `dsh-api-gateway` 的 `/api` mux 与 `dsh-host-webserver` 的 `node:http` 登记。本节点 id `subsys.host.apiproxy` 是稳定别名，**不要**再写 `ctx.apiProxy` 或 `ApiProxy`。

## 能回答的问题

- `packages/host/apiproxy` 还在不在？谁替代 `ctx.apiProxy`？
- `session` / `settings` / `workspace` 三个 Remote namespace 由哪些包 `provide`？yml 行在哪份 bundle？
- `typertGateway` 与三个 controller 谁先吃 `/api`？物理 listen 在哪？
- Session Host Remote 动词完整名单是什么？`follow` / `control` 是不是 stream？
- `session.create` 如何分配 `session-<uuid>`、决议 cwd、workspace 附着失败时会话还在不在？
- `session.prompt` 何时 `followup`、何时 `steer`？

## 职责边界

DSH 是 **Cordis 组合运行时**（profile → bundle → agent preset）。Host HTTP 面不是独立 BFF 包。默认 GUI 路径仍是 `dsh web`（硬编码 profile alias）；另外还可用 `dsh --profile sdk|sdk-minimal|acp|headless`。`--host 0.0.0.0` 的产品拒绝在 `web-startup`，**不是**本页三个 controller。

本页拥有：

- Host Session 业务 API：`SessionController` / `ctx.sessionController`，Remote namespace `'session'`。[E: packages/api/session-controller/src/index.ts:62] [E: packages/api/session-controller/src/index.ts:115]
- Host Settings + 挂载的 `CredentialsController`：`ctx.settingsController`，namespace `'settings'`。[E: packages/api/settings-controller/src/index.ts:77] [E: packages/api/settings-controller/src/index.ts:107]
- Host Workspace：`ctx.workspaceController`，namespace `'workspace'`。[E: packages/api/workspace-controller/src/index.ts:29] [E: packages/api/workspace-controller/src/index.ts:42]
- Typert 分发：`TypertGatewayService` / `ctx.typertGateway`。[E: packages/api/gateway/src/index.ts:169] [E: packages/api/gateway/src/index.ts:193]
- `node:http` 路由登记：`ctx.webServer`。[E: packages/host/webserver/src/index.ts:24] [E: packages/host/webserver/src/index.ts:144]

明确不拥有：

- `ApiProxy` / `RpcMethodMap` / `toFetchHandler`：包已删除，路径 `packages/host/apiproxy/**` 不得再当 source。
- 信任篱笆、`/api` prefix 绑定：[`subsys.client.connection`](../client/connection.md)。`API_PATH = '/api'`。[E: packages/client/connection/src/api-path.ts:7]
- preset roster / `leakedServices`：[`subsys.composition.agent-presets`](../composition/agent-presets.md)。Session Controller 只 `get('agentPresets')` 后 `resolve` + unpublished `setup` 里 `mount`。[E: packages/api/session-controller/src/agent.ts:373] [E: packages/api/session-controller/src/agent.ts:380]
- 浏览器半边 object layer：`packages/api/session-controller/src/client/` 装 `ctx.sessions`。[E: packages/api/session-controller/src/client/index.ts:71]
- SPA dist：[`@deepseek-ai/dsh-host-frontend-static`](webserver.md) 占 fallback 座。[E: packages/host/frontend-static/src/index.ts:27] [E: packages/host/frontend-static/src/index.ts:124]

`SessionController.static inject`：`agentDefaultModel` / `agents` / `attachments` / `llm` / `sessions` / `sessionProjections` / `sessionQuery` / `typert` / `workspaceRegistry`。[E: packages/api/session-controller/src/index.ts:84] `agentPresets` **不**在 inject 里。`WorkspaceController.static inject` 是 `typert` / `workspaceRegistry`。[E: packages/api/workspace-controller/src/index.ts:35] Gateway inject 只有 `typert`。[E: packages/api/gateway/src/index.ts:170]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/api/session-controller/src/index.ts` | `SessionController`：namespace `session`、Host Remote 动词 |
| `packages/api/session-controller/src/commands.ts` | `create` / `prompt` / `selectModel` 等命令实现 |
| `packages/api/session-controller/src/agent.ts` | `composeAgent` / `ensureSession` |
| `packages/api/session-controller/src/remote-events.ts` | Remote Event 选型：`api-session/*` |
| `packages/api/settings-controller/src/index.ts` | `settings` namespace；`ctx.plugin(CredentialsController)` |
| `packages/api/workspace-controller/src/index.ts` | `workspace` namespace + `DirectoryPickerController` 子插件 |
| `packages/api/gateway/src/index.ts` | `typertGateway`：`connection.rpc.intercept('/api', …)` + WS mux |
| `packages/host/webserver/src/index.ts` | listen、named route、单 fallback |
| `packages/host/frontend-static/src/index.ts` | SPA dist `registerFallback` |
| `packages/bundle/web-app/cordis.patch.yml` | insert 三个 controller + webserver + connection |
| `packages/bundle/base/cordis.patch.yml` | `id: typert-gateway` → `@deepseek-ai/dsh-api-gateway` |
| `packages/bundle/headless/cordis.patch.yml` | 无 controller / 无 webserver |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionController` | `TypertRemoteService`，服务名 `'sessionController'`，namespace `'session'`。[E: packages/api/session-controller/src/index.ts:115] |
| Session Remote 动词 | unary：`list` `search` `create` `selectModel` `modelCatalog` `canOpenWorkspacePath` `openWorkspacePath` `rename` `fork` `prompt` `attachment` `updateQueue` `cancel` `page`；stream：`follow` `control`。[E: packages/api/session-controller/src/index.ts:208] [E: packages/api/session-controller/src/index.ts:374] [E: packages/api/session-controller/src/index.ts:384] |
| Remote Event | `api-session/added` `removed` `status` `error` `activity`。[E: packages/api/session-controller/src/remote-events.ts:2] [E: packages/api/session-controller/src/index.ts:137] |
| `SettingsController` | namespace `'settings'`；`describe` 始终 `redactSecrets: true`。[E: packages/api/settings-controller/src/index.ts:107] [E: packages/api/settings-controller/src/index.ts:122] |
| Settings 动词 | `describe` `canOpenAgentPresetDirectory` `update` `replace` `mutate` `openSettingsDocument` `openAgentPresetDirectory`。[E: packages/api/settings-controller/src/index.ts:118] [E: packages/api/settings-controller/src/index.ts:131] |
| `credentials` | 同包 `CredentialsController`，namespace `'credentials'`：`describe` / `set` / `unset`。[E: packages/api/settings-controller/src/credentials.ts:70] [E: packages/api/settings-controller/src/credentials.ts:82] |
| Workspace 动词 | `create` `rename` `delete` `insertBefore` `insertSessionBefore` `archiveSession`；stream `follow`。[E: packages/api/workspace-controller/src/index.ts:57] [E: packages/api/workspace-controller/src/index.ts:117] |
| `WebServer.Config.host` | 仅 `'127.0.0.1' \| '0.0.0.0'`。[E: packages/host/webserver/src/index.ts:61] |
| Mux 路径 | `REMOTE_STREAM_MUX_PATH = '/api/remote.mux'`。[E: packages/api/gateway/src/stream-protocol.ts:6] |

包名：`@deepseek-ai/dsh-api-session-controller` [E: packages/api/session-controller/package.json:2]、`@deepseek-ai/dsh-api-settings-controller` [E: packages/api/settings-controller/package.json:2]、`@deepseek-ai/dsh-api-workspace-controller` [E: packages/api/workspace-controller/package.json:2]、`@deepseek-ai/dsh-api-gateway` [E: packages/api/gateway/package.json:2]、`@deepseek-ai/dsh-host-webserver` [E: packages/host/webserver/package.json:2]、`@deepseek-ai/dsh-host-frontend-static` [E: packages/host/frontend-static/package.json:2]。webserver 描述：不知道 harness 概念、不 serve 文件，组合应用拥有 dist。[E: packages/host/webserver/package.json:3]

## 控制流

1. **web-app 插入三个 controller。** `dsh-web-app` 的 `cordis.patch.yml`：`id: session-controller` / `@deepseek-ai/dsh-api-session-controller`，以及 settings / workspace 两行。[E: packages/bundle/web-app/cordis.patch.yml:86] [E: packages/bundle/web-app/cordis.patch.yml:87] [E: packages/bundle/web-app/cordis.patch.yml:91] [E: packages/bundle/web-app/cordis.patch.yml:95] `dsh-base` 插入的是 `id: typert-gateway` / `@deepseek-ai/dsh-api-gateway`，**没有**三个 controller 行。[E: packages/bundle/base/cordis.patch.yml:45] [E: packages/bundle/base/cordis.patch.yml:46] `dsh-headless` insert 是 `code-runtime` / `headless-startup` / `headless-runner`，无 HTTP Host。[E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26]

2. **webserver 由 web-app 提供。** 行 `id: webserver`，`inject: [webStartup]`，缺省 host `127.0.0.1`、port `3080`、gzip。[E: packages/bundle/web-app/cordis.patch.yml:111] [E: packages/bundle/web-app/cordis.patch.yml:115] 重复 named route 抛错；fallback 只能有一个。[E: packages/host/webserver/src/index.ts:168] [E: packages/host/webserver/src/index.ts:197]

3. **connection 绑 `/api`；Gateway intercept 同一前缀。** connection 行注明 node 半边把 gateway 绑到 webserver 的 `/api`。[E: packages/bundle/web-app/cordis.patch.yml:156] `TypertGatewayService` 构造后 `connection.rpc.intercept('/api', claimsEndpoint, dispatchRpc)`。[E: packages/api/gateway/src/index.ts:199] [E: packages/api/gateway/src/index.ts:200] Host 侧 `rpc.intercept` 登记 interceptor。[E: packages/client/connection/src/rpc-host.ts:82] 信任篱笆：`requestRejection` 先 Host/Origin → 403，再 browser auth → 401。[E: packages/client/connection/src/rpc-host.ts:97] Live stream 另走 `registerUpgrade` 到 `REMOTE_STREAM_MUX_PATH`。[E: packages/api/gateway/src/index.ts:213] [E: packages/api/gateway/src/index.ts:223]

4. **`SessionController` 立刻 `super(..., { namespace: 'session' })`。** 再装 model-selection projection、list/history/control、`SessionFileReferences` / `SessionSkillCatalog`。[E: packages/api/session-controller/src/index.ts:115] 会话生命周期事件映射到 `api-session/*`。[E: packages/api/session-controller/src/index.ts:137]

5. **`session.create`。** `workspaceId` 与 `cwd` 互斥 → `gateway/bad-request`。[E: packages/api/session-controller/src/commands.ts:74] `sessionId = request.sessionId ?? session-${randomUUID()}`。[E: packages/api/session-controller/src/commands.ts:76] workspace 缺失 → `workspace/not-found`。[E: packages/api/session-controller/src/commands.ts:81] cwd = `workspace.path ?? request.cwd ?? defaultCwd`（控制器构造传入 `process.cwd()`）。[E: packages/api/session-controller/src/commands.ts:86] [E: packages/api/session-controller/src/index.ts:117] `ensureSession` 之后才 `attachSession`；附着失败抛 `session/workspace-attach-failed`，会话已经创建。[E: packages/api/session-controller/src/commands.ts:100] [E: packages/api/session-controller/src/commands.ts:103]

6. **`composeAgent`。** 无 `ctx.agentPresets` 时 setup 只 `installSelection`。[E: packages/api/session-controller/src/agent.ts:374] 有 roster 则 `presets.resolve(presetId)`，`mount` 放进 unpublished `setup`。[E: packages/api/session-controller/src/agent.ts:375] [E: packages/api/session-controller/src/agent.ts:380]

7. **`session.prompt`。** 可选 `clientTimeZone` 必须是 UTC 或合法 IANA，否则 `session/invalid-time-zone`。[E: packages/api/session-controller/src/commands.ts:288] 当前 selection 的 provider 无 adapter → `session/model-unavailable`。[E: packages/api/session-controller/src/commands.ts:298] 图像还要过 `llm.resolveModelInfo` 的 `inputModalities`。[E: packages/api/session-controller/src/commands.ts:313] `request.mode === 'steer'` 则 `agent.steer`，否则 `agent.followup`。[E: packages/api/session-controller/src/commands.ts:324]

8. **Settings 读永远打码。** `describe()` 调 `settings.describe({ redactSecrets: true })`。[E: packages/api/settings-controller/src/index.ts:122] 写路径 `update` / `replace` / `mutate`。[E: packages/api/settings-controller/src/index.ts:144] [E: packages/api/settings-controller/src/index.ts:180]

9. **Workspace `follow` 是 stream。** `@Remote({ mode: 'stream' }) follow`。[E: packages/api/workspace-controller/src/index.ts:117] 目录选择是子插件 `DirectoryPickerController`，无 picking backend 时不注册 picking namespace。[E: packages/api/workspace-controller/src/index.ts:49]

10. **SPA fallback。** `frontend-static` `inject = ['webServer', 'connection']`，`registerFallback`。[E: packages/host/frontend-static/src/index.ts:27] [E: packages/host/frontend-static/src/index.ts:124]

11. **浏览器 Session 层。** client `inject` 要求 `typert`、`remote`、`remote.commands`、`remote.session`、`remote.subagents`；`apply` 装 `ClientSessions`。[E: packages/api/session-controller/src/client/index.ts:76] [E: packages/api/session-controller/src/client/index.ts:88]

## 设计动机

- **拆 BFF 巨石。** 会话命令、配置、工作区各有 Remote namespace 与 inject 面；Typert Gateway 只做 `namespace/method` 分发与流 mux，不再维护一份点分 `RpcMethodMap`。
- **HTTP 载体与业务分开。** `WebServer` 只登记路由；业务错误走 `RemoteError` 码（如 `session/not-found`、`workspace/not-found`），不是旧 `toFetchHandler` 的 200+RpcResult 信封。
- **web overlay 才挂 GUI Host。** base 有 Typert registry + gateway；三个 controller 与 webserver 是 `dsh-web-app` 的事。headless / sdk / acp 走各自 stdio 面，不假装还有 apiproxy。
- **preset 仍在 create 的 unpublished setup 里 mount。** 无 roster 时会话吃 host 全局组合。这是 GUI 多会话与 headless 单组合的分界。

## Gotcha

- yml **没有**再写 `id: api-gateway` → `dsh-host-apiproxy`。`id: typert-gateway` 加载 `@deepseek-ai/dsh-api-gateway`。[E: packages/bundle/base/cordis.patch.yml:45] 三个 controller 的 id 就是 `session-controller` 等。[E: packages/bundle/web-app/cordis.patch.yml:86]
- 不要在正文或 `source:` 写 `packages/host/apiproxy`、`ctx.apiProxy`、`createApiProxy`、`toFetchHandler`。
- `dsh web` 不是唯一宿主入口：`dsh --profile sdk|sdk-minimal|acp|headless` 也是 shipped profile。
- workspace 附着失败时会话已 publish：错误码 `session/workspace-attach-failed`。[E: packages/api/session-controller/src/commands.ts:103]
- Gateway 当前 intercept 调用**没有**旧文档里的 `{ authority: 'trusted-host' }` 第三选项对象；信任在 `connection.requestRejection`。[E: packages/api/gateway/src/index.ts:199] [E: packages/client/connection/src/rpc-host.ts:97]
- `WebServer.Config.host` 仍承认 `'0.0.0.0'`；产品旗标拒绝在 web-startup。一条替换 `webserver.config` 的 overlay 仍可能绑 all-interfaces。[E: packages/host/webserver/src/index.ts:61]

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.sessionController` | `SessionController` / namespace `'session'` | **web-app** `id: session-controller` `@deepseek-ai/dsh-api-session-controller`。**base / headless：无此行** | Typert Gateway `claimsEndpoint`；client `remote.session` |
| `ctx.settingsController` | `SettingsController` / `'settings'`（挂 `credentials`） | **web-app** `id: settings-controller` | 配置页 Remote；缺 settings provider 时方法仍注册并返回可行动诊断 |
| `ctx.workspaceController` | `WorkspaceController` / `'workspace'` | **web-app** `id: workspace-controller` | GUI workspace 面；`follow` 流 |
| `ctx.typertGateway` | `TypertGateway` | **base** `id: typert-gateway`；web 叠 base 后带着 | `connection.rpc.intercept('/api')`；plugin-inventory 等 Remote |
| `ctx.webServer` | `WebServer` / `WebRoute` | **web-app** `id: webserver` | connection `/api`、gateway WS upgrade、frontend-static fallback |
| `ctx.agentPresets` | `AgentPresets.resolve` / `mount` | **web-app** `id: agent-presets` `default: standard`。**base / headless：无** | `composeAgent` |

换掉 web-app 的三个 controller 行：浏览器 `session/*` Remote 无 owner。删掉 `agent-presets`：`composeAgent` 退回 host 全局工具集。Gateway 只要 base 仍在，仍能 intercept 自己声称的 endpoint。

## Sources

- packages/api/session-controller/package.json
- packages/api/session-controller/src/index.ts
- packages/api/session-controller/src/commands.ts
- packages/api/session-controller/src/agent.ts
- packages/api/session-controller/src/remote-events.ts
- packages/api/session-controller/src/client/index.ts
- packages/api/settings-controller/package.json
- packages/api/settings-controller/src/index.ts
- packages/api/settings-controller/src/credentials.ts
- packages/api/workspace-controller/package.json
- packages/api/workspace-controller/src/index.ts
- packages/api/gateway/package.json
- packages/api/gateway/src/index.ts
- packages/api/gateway/src/stream-protocol.ts
- packages/host/webserver/package.json
- packages/host/webserver/src/index.ts
- packages/host/frontend-static/package.json
- packages/host/frontend-static/src/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/client/connection/src/api-path.ts
- packages/client/connection/src/rpc-host.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一次 prompt 的端到端走读。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile：入口 alias、旗标、`--host 0.0.0.0`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` 真树：三个 controller、webserver、connection。
- [`subsys.host.webserver`](webserver.md) — `node:http` listen 与 route-registration carrier。
- [`subsys.client.connection`](../client/connection.md) — `/api` HTTP + 信任篱笆。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — roster、`mount`、isolate。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `typertGateway` Remote 分发。
