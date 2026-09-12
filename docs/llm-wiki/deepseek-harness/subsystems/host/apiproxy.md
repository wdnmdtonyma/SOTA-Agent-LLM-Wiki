---
id: subsys.host.apiproxy
title: Host HTTP API（三个 *-controller + workspace-files + webserver）
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
  - packages/api/workspace-files/package.json
  - packages/api/workspace-files/src/index.ts
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
  - WorkspaceFiles
  - ctx.workspaceFiles
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
  - surface.web.workbench
  - subsys.composition.bundle-web-app
  - subsys.host.webserver
  - subsys.client.connection
  - subsys.composition.agent-presets
  - subsys.integration.api-gateway
evidence: explicit
status: verified
updated: c291e7961a
---

> 旧包 `@deepseek-ai/dsh-host-apiproxy` / `packages/host/apiproxy` **已删除**。Host HTTP API 现为四个 Typert Remote 所有者（`session` / `workspaceFiles` / `settings` / `workspace`）加上 `dsh-api-gateway` 的 `/api` mux 与 `dsh-host-webserver` 的 `node:http` 登记。本节点 id `subsys.host.apiproxy` 是稳定别名，**不要**再写 `ctx.apiProxy` 或 `ApiProxy`。

## 能回答的问题

- `packages/host/apiproxy` 还在不在？谁替代 `ctx.apiProxy`？
- `session` / `workspaceFiles` / `settings` / `workspace` 四个 Remote namespace 由哪些包 `provide`？yml 行在哪份 bundle？
- `typertGateway` 与 controller 谁先吃 `/api`？物理 listen 在哪？
- Session Host Remote 动词完整名单是什么？`follow` / `control` 是不是 stream？
- `session.create` 如何分配 `session-<uuid>`、决议 cwd、workspace 附着失败时会话还在不在？
- `session.prompt` 何时 `followup`、何时 `steer`？
- workspace-files Remote 读文件能不能离开 workspace？和 `session.openWorkspacePath` 差在哪？

## 职责边界

DSH 是 **Cordis 组合运行时**（profile → bundle → agent preset）。Host HTTP 面不是独立 BFF 包。默认 GUI 路径仍是 `dsh web`（硬编码 profile alias）；另外还可用 `dsh --profile sdk|sdk-minimal|acp|headless`。`desktop` 不是 CLI profile。`--host 0.0.0.0` 的产品拒绝在 `web-startup`，**不是**本页 controller。

本页拥有：

- Host Session 业务 API：`SessionController` / `ctx.sessionController`，Remote namespace `'session'`。[E: packages/api/session-controller/src/index.ts:121]
- Host workspace 文件：`WorkspaceFiles` / `'workspaceFiles'`。[E: packages/api/workspace-files/src/index.ts:182]
- Host Settings + 挂载的 `CredentialsController`：`ctx.settingsController`，namespace `'settings'`。[E: packages/api/settings-controller/src/index.ts:102]
- Host Workspace：`ctx.workspaceController`，namespace `'workspace'`。[E: packages/api/workspace-controller/src/index.ts:42]
- Typert 分发：`TypertGatewayService` / `ctx.typertGateway`。
- `node:http` 路由登记：`ctx.webServer`。[E: packages/host/webserver/src/index.ts:144]

明确不拥有：

- `ApiProxy` / `RpcMethodMap` / `toFetchHandler`：包已删除，路径 `packages/host/apiproxy/**` 不得再当 source。
- 信任篱笆、`/api` prefix 绑定：[`subsys.client.connection`](../client/connection.md)。`API_PATH = '/api'`。[E: packages/client/connection/src/api-path.ts:7]
- preset roster / `leakedServices`：[`subsys.composition.agent-presets`](../composition/agent-presets.md)。Session Controller 只 `get('agentPresets')` 后 `resolve` + unpublished `setup` 里 `mount`。[E: packages/api/session-controller/src/agent.ts:379] [E: packages/api/session-controller/src/agent.ts:387]
- 浏览器半边 object layer：`packages/api/session-controller/src/client/` 装 `ctx.sessions`。[E: packages/api/session-controller/src/client/index.ts:99]
- SPA dist：`@deepseek-ai/dsh-host-frontend-static` 占 fallback 座。[E: packages/host/frontend-static/src/index.ts:27] [E: packages/host/frontend-static/src/index.ts:124]
- `present` 模型 schema：权威在 [`surface.tools.present`](../../surface/tools/present.md)。

`SessionController.static inject`：`agentDefaultModel` / `agents` / `attachments` / `fileUploads` / `llm` / `sessions` / `sessionProjections` / `sessionQuery` / `typert` / `workspaceRegistry`。[E: packages/api/session-controller/src/index.ts:88] `agentPresets` **不**在 inject 里。`WorkspaceController.static inject` 是 `typert` / `workspaceRegistry`。[E: packages/api/workspace-controller/src/index.ts:35]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/api/session-controller/src/index.ts` | `SessionController`：namespace `session`、Host Remote 动词 |
| `packages/api/session-controller/src/commands.ts` | `create` / `prompt` / `selectModel` 等命令实现 |
| `packages/api/session-controller/src/agent.ts` | `composeAgent` / `ensureSession` |
| `packages/api/workspace-files/src/index.ts` | `WorkspaceFiles` Remote：读 / 列 / 观察 |
| `packages/api/settings-controller/src/index.ts` | `settings` namespace；`ctx.plugin(CredentialsController)` |
| `packages/api/workspace-controller/src/index.ts` | `workspace` namespace + `DirectoryPickerController` 子插件 |
| `packages/api/gateway/src/index.ts` | `typertGateway`：`connection.rpc.intercept('/api', …)` + WS mux |
| `packages/host/webserver/src/index.ts` | listen、named route、单 fallback |
| `packages/host/frontend-static/src/index.ts` | SPA dist `registerFallback` |
| `packages/bundle/web-app/cordis.patch.yml` | insert controller + workspace-files + webserver + connection |
| `packages/bundle/base/cordis.patch.yml` | `id: typert-gateway` → `@deepseek-ai/dsh-api-gateway` |
| `packages/bundle/headless/cordis.patch.yml` | 无 controller / 无 webserver |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionController` | `TypertRemoteService`，服务名 `'sessionController'`，namespace `'session'`。[E: packages/api/session-controller/src/index.ts:121] |
| Session Remote 动词 | unary：`list` `search` `create` `selectModel` `modelCatalog` `canOpenWorkspacePath` `openWorkspacePath` `rename` `fork` `prompt` `attachment` `updateQueue` `cancel` `page`；stream：`follow` `control`。[E: packages/api/session-controller/src/index.ts:272] [E: packages/api/session-controller/src/index.ts:400] [E: packages/api/session-controller/src/index.ts:410] |
| Remote Event | `api-session/added` `removed` `status` `error` `activity`。[E: packages/api/session-controller/src/remote-events.ts:2] |
| `WorkspaceFiles` | 服务名 `'workspaceFiles'`。读类动词可离开 workspace；`list` / `changes` 锁在 workspace。[E: packages/api/workspace-files/src/index.ts:232] [E: packages/api/workspace-files/src/index.ts:337] |
| `SettingsController` | namespace `'settings'`；`describe` 始终 `redactSecrets: true`。[E: packages/api/settings-controller/src/index.ts:102] [E: packages/api/settings-controller/src/index.ts:122] |
| Settings 动词 | `describe` `canOpenAgentPresetDirectory` `update` `replace` `mutate` `openSettingsDocument` `openAgentPresetDirectory`。[E: packages/api/settings-controller/src/index.ts:117] [E: packages/api/settings-controller/src/index.ts:131] |
| `credentials` | 同包 `CredentialsController`，namespace `'credentials'`。[E: packages/api/settings-controller/src/credentials.ts:70] |
| Workspace 动词 | `create` `rename` `delete` `insertBefore` `insertSessionBefore` `archiveSession`；stream `follow`。[E: packages/api/workspace-controller/src/index.ts:57] [E: packages/api/workspace-controller/src/index.ts:117] |
| `WebServer.Config.host` | 仅 `'127.0.0.1' \| '0.0.0.0'`。[E: packages/host/webserver/src/index.ts:61] |
| Mux 路径 | `REMOTE_STREAM_MUX_PATH = '/api/remote.mux'`。[E: packages/api/gateway/src/stream-protocol.ts:6] |

包名：`@deepseek-ai/dsh-api-session-controller`、`@deepseek-ai/dsh-api-workspace-files` [E: packages/api/workspace-files/package.json:2]、`@deepseek-ai/dsh-api-settings-controller`、`@deepseek-ai/dsh-api-workspace-controller`、`@deepseek-ai/dsh-api-gateway`、`@deepseek-ai/dsh-host-webserver`、`@deepseek-ai/dsh-host-frontend-static`。webserver 描述：不知道 harness 概念、不 serve 文件，组合应用拥有 dist。

## 控制流

1. **web-app 插入 controller。** `dsh-web-app` 的 `cordis.patch.yml`：`id: session-controller`，然后 `workspace-files`，再 settings / workspace。[E: packages/bundle/web-app/cordis.patch.yml:105] [E: packages/bundle/web-app/cordis.patch.yml:110] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:119] `dsh-base` 插入的是 `id: typert-gateway` / `@deepseek-ai/dsh-api-gateway`，**没有**这些 controller 行。`dsh-headless` insert 是 `code-runtime` / `headless-startup` / `headless-runner`，无 HTTP Host。[E: packages/bundle/headless/cordis.patch.yml:20]

2. **webserver 由 web-app 提供。** 行 `id: webserver`，`inject: [webStartup]`，缺省 host `127.0.0.1`、port `3080`。[E: packages/bundle/web-app/cordis.patch.yml:135]

3. **connection 绑 `/api`；Gateway intercept 同一前缀。** `TypertGatewayService` 构造后 `connection.rpc.intercept('/api', claimsEndpoint, dispatchRpc)`。[E: packages/api/gateway/src/index.ts:199] 信任篱笆：`requestRejection` 先 Host/Origin → 403，再 browser auth → 401。[E: packages/client/connection/src/rpc-host.ts:97] Live stream 另走 `registerUpgrade` 到 `REMOTE_STREAM_MUX_PATH`。[E: packages/api/gateway/src/index.ts:213]

4. **`SessionController` 立刻 `super(..., { namespace: 'session' })`。** 再装 model-selection projection、list/history/control，以及 `fileUploads.registerAgentResolver`。[E: packages/api/session-controller/src/index.ts:121] [E: packages/api/session-controller/src/index.ts:125]

5. **`session.create`。** `workspaceId` 与 `cwd` 互斥 → `gateway/bad-request`。[E: packages/api/session-controller/src/commands.ts:88] `sessionId = request.sessionId ?? session-${randomUUID()}`。[E: packages/api/session-controller/src/commands.ts:91] workspace 缺失 → `workspace/not-found`。[E: packages/api/session-controller/src/commands.ts:96] cwd = `workspace.path ?? request.cwd ?? defaultCwd`。`ensureSession` 之后才 `attachSession`；附着失败抛 `session/workspace-attach-failed`，会话已经创建。[E: packages/api/session-controller/src/commands.ts:118]

6. **`composeAgent`。** 无 `ctx.agentPresets` 时 setup 只 `installSelection`。[E: packages/api/session-controller/src/agent.ts:379] 有 roster 则 `presets.resolve(presetId)`，`mount` 放进 unpublished `setup`。[E: packages/api/session-controller/src/agent.ts:387]

7. **`session.prompt`。** 可选 `clientTimeZone` 必须是 UTC 或合法 IANA，否则 `session/invalid-time-zone`。[E: packages/api/session-controller/src/commands.ts:313] 当前 selection 的 provider 无 adapter → `session/model-unavailable`。[E: packages/api/session-controller/src/commands.ts:325] `request.mode === 'steer'` 则 `agent.steer`，否则 `agent.followup`。[E: packages/api/session-controller/src/commands.ts:363]

8. **workspace-files Remote（折叠）。** `read` / `readBytes` / `readAll` / `readRelated` / `stat` 的 path 可以指向 workspace 外；`list` 与 stream `changes` 必须落在 session workspace root。[E: packages/api/workspace-files/src/index.ts:232] [E: packages/api/workspace-files/src/index.ts:337] [E: packages/api/workspace-files/src/index.ts:364] 这不是 `session.openWorkspacePath`（原生桌面 opener）。[E: packages/api/session-controller/src/index.ts:293]

9. **Settings 读永远打码。** `describe()` 调 `settings.describe({ redactSecrets: true })`。[E: packages/api/settings-controller/src/index.ts:122]

10. **Workspace `follow` 是 stream。** `@Remote({ mode: 'stream' }) follow`。[E: packages/api/workspace-controller/src/index.ts:117]

11. **SPA fallback。** `frontend-static` `inject = ['webServer', 'connection']`，`registerFallback`。[E: packages/host/frontend-static/src/index.ts:27] [E: packages/host/frontend-static/src/index.ts:124]

12. **浏览器 Session 层。** client `inject` 要求 `connection` / `fileUpload` / `typert` / `remote` / `remote.commands` / `remote.session` / `remote.subagents`；`apply` 装 `ClientSessions`。[E: packages/api/session-controller/src/client/index.ts:85] [E: packages/api/session-controller/src/client/index.ts:99]

## 设计动机

- **拆 BFF 巨石。** 会话命令、工作区文件、配置、工作区各有 Remote namespace 与 inject 面；Typert Gateway 只做 `namespace/method` 分发与流 mux。
- **HTTP 载体与业务分开。** `WebServer` 只登记路由；业务错误走 `RemoteError` 码。
- **web overlay 才挂 GUI Host。** base 有 Typert registry + gateway；controller 与 webserver 是 `dsh-web-app` 的事。headless / sdk / acp 走各自 stdio 面。
- **preset 仍在 create 的 unpublished setup 里 mount。** 无 roster 时会话吃 host 全局组合。

## Gotcha

- yml **没有**再写 `id: api-gateway` → `dsh-host-apiproxy`。`id: typert-gateway` 加载 `@deepseek-ai/dsh-api-gateway`。controller 的 id 就是 `session-controller` / `workspace-files` 等。[E: packages/bundle/web-app/cordis.patch.yml:105]
- 不要在正文或 `source:` 写 `packages/host/apiproxy`、`ctx.apiProxy`、`createApiProxy`、`toFetchHandler`。
- `dsh web` 不是唯一宿主入口：`dsh --profile sdk|sdk-minimal|acp|headless` 也是 shipped profile。`desktop` 不是 CLI profile。
- workspace 附着失败时会话已 publish：错误码 `session/workspace-attach-failed`。[E: packages/api/session-controller/src/commands.ts:118]
- Gateway intercept 调用**没有**旧文档里的 `{ authority: 'trusted-host' }` 第三选项对象；信任在 `connection.requestRejection`。[E: packages/api/gateway/src/index.ts:199] [E: packages/client/connection/src/rpc-host.ts:97]
- `WebServer.Config.host` 仍承认 `'0.0.0.0'`；产品旗标拒绝在 web-startup。[E: packages/host/webserver/src/index.ts:61]

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.sessionController` | `SessionController` / namespace `'session'` | **web-app** `id: session-controller`。**base / headless：无此行** | Typert Gateway `claimsEndpoint`；client `remote.session` |
| `ctx.workspaceFiles` | `WorkspaceFiles` / `'workspaceFiles'` | **web-app** `id: workspace-files` | 右栏文件树 / 文档预览；读可出 workspace |
| `ctx.settingsController` | `SettingsController` / `'settings'`（挂 `credentials`） | **web-app** `id: settings-controller` | 配置页 Remote |
| `ctx.workspaceController` | `WorkspaceController` / `'workspace'` | **web-app** `id: workspace-controller` | GUI workspace 面；`follow` 流 |
| `ctx.typertGateway` | `TypertGateway` | **base** `id: typert-gateway`；web 叠 base 后带着 | `connection.rpc.intercept('/api')` |
| `ctx.webServer` | `WebServer` / `WebRoute` | **web-app** `id: webserver` | connection `/api`、gateway WS upgrade、frontend-static fallback |
| `ctx.agentPresets` | `AgentPresets.resolve` / `mount` | **web-app** `id: agent-presets` `default: standard`。**base / headless：无** | `composeAgent` |

换掉 web-app 的 controller 行：浏览器 Remote 无 owner。删掉 `agent-presets`：`composeAgent` 退回 host 全局工具集。Gateway 只要 base 仍在，仍能 intercept 自己声称的 endpoint。

## Sources

- packages/api/session-controller/package.json
- packages/api/session-controller/src/index.ts
- packages/api/session-controller/src/commands.ts
- packages/api/session-controller/src/agent.ts
- packages/api/session-controller/src/remote-events.ts
- packages/api/session-controller/src/client/index.ts
- packages/api/workspace-files/package.json
- packages/api/workspace-files/src/index.ts
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
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面；Open In / 右栏 / resources 折叠在那边。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` 真树。
- [`subsys.host.webserver`](webserver.md) — `node:http` listen 与 route-registration carrier。
- [`subsys.client.connection`](../client/connection.md) — `/api` HTTP + 信任篱笆。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — roster、`mount`、isolate。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `typertGateway` Remote 分发。
