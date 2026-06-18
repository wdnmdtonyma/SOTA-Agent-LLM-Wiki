---
id: server.http-server
title: HTTP Server
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/server/server.ts
  - packages/server/src/routes.ts
  - packages/server/src/handlers.ts
symbols:
  - Server.Default
  - Server.listen
  - HttpApiApp.createRoutes
  - Api
  - handlers
related:
  - server-api.overview
  - spine.cli-to-session
evidence: explicit
status: verified
updated: 355a0bcf5
---

`server.http-server` 覆盖两个 Effect HTTP server surface。按本 wiki 的 V1/V2 迁移 taxonomy，一个 surface 是 V1 当前 opencode host server，另一个是 V2 `@opencode-ai/server` package。[I] 两者都使用 Effect `HttpApi` / `HttpRouter` / `HttpServer`: V1 server import Effect HTTP APIs，V2 server package 也 import `effect/unstable/http` 和 `effect/unstable/httpapi`。[E: packages/opencode/src/server/server.ts:5][E: packages/opencode/src/server/server.ts:6][E: packages/server/src/routes.ts:4][E: packages/server/src/routes.ts:5] 在本节点读取的 server source 中没有看到 Hono import 或 Hono app construction。[I]

## V1

### Entrypoint

`Server.Default` 是一个 lazy singleton。它取 `HttpApiApp.webHandler().handler`，并把 `app.fetch(request)` 实现为 `handler(request, HttpApiApp.context)`；这是进程内 caller 直接走 V1 HTTP app 的入口。[E: packages/opencode/src/server/server.ts:55][E: packages/opencode/src/server/server.ts:56][E: packages/opencode/src/server/server.ts:58] `Server.openapi()` 从 `PublicApi` 生成 OpenAPI document。[E: packages/opencode/src/server/server.ts:66][E: packages/opencode/src/server/server.ts:67]

`Server.listen(opts)` 运行 `listenEffect(opts)` 并返回 hostname、port、url、stop。[E: packages/opencode/src/server/server.ts:73][E: packages/opencode/src/server/server.ts:75][E: packages/opencode/src/server/server.ts:78] 当 `opts.port === 0` 时，V1 先尝试 `startListener(opts, 4096)`，失败后 catch 到 `startListener(opts, 0)`。[E: packages/opencode/src/server/server.ts:116][E: packages/opencode/src/server/server.ts:117][E: packages/opencode/src/server/server.ts:120]

### Listener layer

V1 listener layer 用 `HttpRouter.serve(HttpApiApp.createRoutes(opts), ...)` 构建 router，并显式设置 `disableLogger: true` 与 `disableListenLog: true`。[E: packages/opencode/src/server/server.ts:100][E: packages/opencode/src/server/server.ts:102][E: packages/opencode/src/server/server.ts:103] 它提供 `WebSocketTracker.layer` 和 `serverLayer({ port, hostname })`。[E: packages/opencode/src/server/server.ts:105][E: packages/opencode/src/server/server.ts:106]

`serverLayer` 创建 Node `createServer()` 实例，然后用 `NodeHttpServer.layer(() => server, { port, host, gracefulShutdownTimeout: "1 second" })` 交给 Effect HTTP server。[E: packages/opencode/src/server/server.ts:198][E: packages/opencode/src/server/server.ts:199][E: packages/opencode/src/server/server.ts:213] force stop 不是手动维护 socket set；实现是 monkey-patch `server.close`，并在 `forceStop` 为真时调用 `server.closeAllConnections()`。[E: packages/opencode/src/server/server.ts:205][E: packages/opencode/src/server/server.ts:208][E: packages/opencode/src/server/server.ts:216][E: packages/opencode/src/server/server.ts:218]

V1 listener 还安装 fresh `ConfigProvider.fromEnv()`，让每次 `listenerLayer` 都提供新的 env-backed config provider。[E: packages/opencode/src/server/server.ts:99][E: packages/opencode/src/server/server.ts:112][I]

### Route tree

V1 route tree 的代码形态包含 root API、event API、pty connect API、instance API、V2 serverRoutes、doc route 和 UI raw catch-all route。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:132][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:137][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:165][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:168][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:181][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:185] `createRoutes()` 实际 merge 七个 layer: `rootApiRoutes`、`eventApiRoutes`、`ptyConnectApiRoutes`、`instanceRoutes`、V2 `serverRoutes`、`docRoute`、`uiRoute`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:264][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:271]

`rootApiRoutes` 来自 `RootHttpApi`，提供 control、control-plane、global handlers，schema error layer 和 auth layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:132][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:133][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:134][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:135] `eventApiRoutes` 提供 event handlers、HTTP auth、workspace routing 和 instance context。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:137][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:138][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:139] `ptyConnectApiRoutes` 提供 pty connect handlers、ticket-aware auth、workspace routing 和 instance context。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:142][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:143]

`instanceApiRoutes` 挂载 V1 config、experimental、file、instance、MCP、project、project-copy、pty、question、permission、provider、session、sync、tui、workspace handlers。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:145][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:161] `serverRoutes` 则来自 V2 package 的 `Api`，并提供 V2 `handlers`、server auth layer 与 V2 schema-error layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:168][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:170][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:171]

`/doc` 返回 `OpenApi.fromApi(PublicApi)` 序列化后的 JSON response，而不是 Swagger UI。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:179][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:181] `uiRoute` 是 raw catch-all route，它调用 `serveUIEffect(request, { fs, client, disableEmbeddedWebUi })`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:185][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:191]

### V1 进程中嵌入的 V2 能力

V1 route layer 提供 `MoveSession.defaultLayer`、`ProjectV2.defaultLayer`、`EventV2Bridge.defaultLayer`、`EventV2.defaultLayer`、`ShareNext.defaultLayer`、`Workspace.defaultLayer` 等服务。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:230][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:279][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:246][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:248][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:249][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:254] 这支持“V1 host 挂入 V2/server 与 V2/core 服务”的迁移判断；“当前活跑”来自项目主线要求，本节点按该 taxonomy 标注为 V1。[I]

## V2

### API package

V2 `packages/server/src/api.ts` 定义 `Api = HttpApi.make("server")`，并添加 18 个 group: health、location、agent、session、message、model、provider、integration、credential、permission、filesystem、command、skill、event、pty、question、reference、projectCopy。[E: packages/server/src/api.ts:23][E: packages/server/src/api.ts:24][E: packages/server/src/api.ts:31][E: packages/server/src/api.ts:32][E: packages/server/src/api.ts:38][E: packages/server/src/api.ts:41] 这个 API 添加 `Authorization` 和 `SchemaErrorMiddleware`。[E: packages/server/src/api.ts:49][E: packages/server/src/api.ts:50]

`packages/server/src/routes.ts` 的 `createRoutes(password?)` 使用 `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })`，再提供 handlers、authorization、schema-error、ServerAuth config、LocationServiceMap、Database、EventV2 和 FetchHttpClient。[E: packages/server/src/routes.ts:15][E: packages/server/src/routes.ts:25][E: packages/server/src/routes.ts:28] V2 `webHandler()` 调用 `HttpRouter.toWebHandler(routes.pipe(Layer.provide(HttpServer.layerServices)), { disableLogger: true })`。[E: packages/server/src/routes.ts:34][E: packages/server/src/routes.ts:35]

V2 `handlers` 由 18 个 handler layer merge 而成，并额外提供 session-location layer、`SessionV2.defaultLayer`、`SessionExecutionLocal.defaultLayer`、`PermissionSaved.defaultLayer`、`PtyTicket.defaultLayer`、`LocationServiceMap.layer` 和 `Credential.defaultLayer`。[E: packages/server/src/handlers.ts:29][E: packages/server/src/handlers.ts:37][E: packages/server/src/handlers.ts:38][E: packages/server/src/handlers.ts:44][E: packages/server/src/handlers.ts:47][E: packages/server/src/handlers.ts:49][E: packages/server/src/handlers.ts:51][E: packages/server/src/handlers.ts:52][E: packages/server/src/handlers.ts:53][E: packages/server/src/handlers.ts:54][E: packages/server/src/handlers.ts:55][E: packages/server/src/handlers.ts:56]

### Middleware

V2 authorization middleware 在 `ServerAuth.required(config)` 为 false 时直接返回原 effect；需要 auth 时，它从 query `auth_token` 或 Basic header 解 base64 credential，并调用 `ServerAuth.authorized`。[E: packages/server/src/middleware/authorization.ts:20][E: packages/server/src/middleware/authorization.ts:34][E: packages/server/src/middleware/authorization.ts:35][E: packages/server/src/middleware/authorization.ts:36][E: packages/server/src/middleware/authorization.ts:37][E: packages/server/src/middleware/authorization.ts:45][E: packages/server/src/middleware/authorization.ts:53]

V2 session-location middleware 从 route params 解析 `sessionID`，只查询 `SessionTable.directory` 和 `SessionTable.workspace_id`，再构造 `Location.Ref.make({ directory, workspaceID })` 提供给下游 effect。[E: packages/server/src/middleware/session-location.ts:35][E: packages/server/src/middleware/session-location.ts:45][E: packages/server/src/middleware/session-location.ts:59][E: packages/server/src/middleware/session-location.ts:61]

### Session group

V2 `SessionGroup` 定义了多个 `/api/session` endpoint: list 使用 `GET /api/session`，create 使用 `POST /api/session`。[E: packages/server/src/groups/session.ts:90][E: packages/server/src/groups/session.ts:92][E: packages/server/src/groups/session.ts:112] `session.prompt` 使用 `POST /api/session/:sessionID/prompt`，并把 OpenAPI description 写成“durably admit one session input and schedule agent-loop execution unless resume is false”。[E: packages/server/src/groups/session.ts:144][E: packages/server/src/groups/session.ts:160] “不等待完整 run loop 结束”是从 admit/schedule 语义推导，不是该 group 文件直接声明。[I]

## V1 / V2 对照

| 维度 | V1 server | V2 server package |
| --- | --- | --- |
| HTTP 栈 | `HttpApiApp.createRoutes` + `HttpRouter.serve` + Node `createServer`。[E: packages/opencode/src/server/server.ts:100][E: packages/opencode/src/server/server.ts:199] | `HttpApiBuilder.layer(Api)` + `HttpRouter.toWebHandler`。[E: packages/server/src/routes.ts:15][E: packages/server/src/routes.ts:34] |
| Route shape | root/event/pty/instance/UI 这些 route layer 在同一个 `createRoutes()` merge 中组装，merge 时另挂 V2 `serverRoutes` 与 `/doc`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:132][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:137][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:165][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:185][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:269][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:270] | 15 个 group 由 `Api` 统一声明；具体 path 在各 group 文件中定义。[E: packages/server/src/api.ts:23][E: packages/server/src/api.ts:41][I] |
| Auth | root/event/instance 使用 `httpApiAuthLayer`，pty connect 使用 `ptyConnectHttpApiAuthLayer`，V2 `serverRoutes` 使用 `serverHttpApiAuthLayer`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:135][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:139][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:143][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:166][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:171] | V2 package 的 `authorizationLayer` 处理 Basic/query credential。[E: packages/server/src/middleware/authorization.ts:35][E: packages/server/src/middleware/authorization.ts:53] |
| Location | V1 route layer 同时提供 InstanceLayer、workspace routing、Workspace service。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:131][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:254][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:262] | V2 session-location middleware 从 session row 取 directory/workspaceID 并提供 location services。[E: packages/server/src/middleware/session-location.ts:45][E: packages/server/src/middleware/session-location.ts:59] |

## 设计动机

V1 host 把 V2 `Api` 作为 `serverRoutes` 挂进同一个 route tree，而不是启动另一个 listener；源码层面可见的是 V2 `Api`/`handlers` 在 V1 router 内被提供，并且 V1 route tree merge 了该 `serverRoutes`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:168][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:170][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:171][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:269] 迁移意图是从 V1 host 逐步暴露 V2 API，而不是瞬间替换 HTTP entrypoint。[I]

V2 server package 把 API declaration、handlers、middleware、route creation 拆成独立模块，并单独导出 `webHandler()`。[E: packages/server/src/api.ts:23][E: packages/server/src/handlers.ts:29][E: packages/server/src/routes.ts:34] V1 host 能嵌入它，是由 V1 `serverRoutes = HttpApiBuilder.layer(Api)` 并提供 V2 handlers 直接体现的。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:168][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:170]

## Sources

- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/server/routes/instance/httpapi/server.ts`
- `packages/opencode/src/server/routes/instance/httpapi/api.ts`
- `packages/server/src/api.ts`
- `packages/server/src/routes.ts`
- `packages/server/src/handlers.ts`
- `packages/server/src/middleware/authorization.ts`
- `packages/server/src/middleware/session-location.ts`
- `packages/server/src/groups/session.ts`

## Related

- [server-api.overview](../../surface/server-api/overview.md)
- [spine.cli-to-session](../../spine/cli-to-session.md)
