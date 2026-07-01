---
id: server.http-server
title: HTTP Server
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/server/server.ts
  - packages/opencode/src/server/routes/instance/httpapi/server.ts
  - packages/server/src/api.ts
  - packages/server/src/routes.ts
  - packages/server/src/handlers.ts
  - packages/server/src/middleware/authorization.ts
  - packages/server/src/middleware/session-location.ts
  - packages/protocol/src/api.ts
  - packages/protocol/src/groups/session.ts
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
updated: 8b68dc0d7
---

`server.http-server` 覆盖两个 Effect HTTP server surface: V1 `packages/opencode/src/server` host listener，以及 V2 `@opencode-ai/server` package mounted under the same process. 两者都 use Effect `HttpRouter`/`HttpServer`/`HttpApiBuilder`;本节点读取的 server code 中没有 Hono app construction。[E: packages/opencode/src/server/server.ts:6][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/server/src/routes.ts:14][E: packages/server/src/routes.ts:15][I]

## 能回答的问题
- opencode 当前 HTTP listener 是哪个模块启动的?
- V1 host 怎样把 V2 `/api/*` server routes 挂进同一个 route tree?
- V2 server package 的 API group 现在在哪声明?
- auth 和 session-location middleware 如何接入 route layer?

## V1 host listener

`Server.Default` 是 lazy singleton；它取 `HttpApiApp.webHandler().handler`，把 `app.fetch(request)` 转成 `handler(request, HttpApiApp.context)`，因此进程内 caller 可以不启动 socket 直接调用 V1 HTTP app。[E: packages/opencode/src/server/server.ts:56][E: packages/opencode/src/server/server.ts:57][E: packages/opencode/src/server/server.ts:59]

`Server.openapi()` 返回 `OpenApi.fromApi(PublicApi)`。[E: packages/opencode/src/server/server.ts:67][E: packages/opencode/src/server/server.ts:68] `Server.listen(opts)` 运行 `listenEffect(opts)`，返回 hostname、port、url 和 stop function。[E: packages/opencode/src/server/server.ts:73][E: packages/opencode/src/server/server.ts:79]

V1 listener layer 用 `HttpRouter.serve(HttpApiApp.createRoutes(opts), ...)`，并设置 `disableLogger: true` 和 `disableListenLog: true`。[E: packages/opencode/src/server/server.ts:100][E: packages/opencode/src/server/server.ts:103][E: packages/opencode/src/server/server.ts:104] 当 `opts.port === 0` 时，`startWithPortFallback` 先试 4096，再 fallback 到任意空闲端口 0。[E: packages/opencode/src/server/server.ts:117][E: packages/opencode/src/server/server.ts:121]

`serverLayer` 创建 Node `createServer()`，通过 `NodeHttpServer.layer(() => server, { port, host, gracefulShutdownTimeout: "1 second" })` 接入 Effect HTTP server。[E: packages/opencode/src/server/server.ts:199][E: packages/opencode/src/server/server.ts:214] `stop(true)` 的 force close 由 `closeAll` 设置 `serverRef.forceStop = true`，并在必要时调用 `server.closeAllConnections()`。[E: packages/opencode/src/server/server.ts:217][E: packages/opencode/src/server/server.ts:219]

## V1 route tree

V1 route tree 明确拆成 root、event、pty connect、instance、V2 server、doc、UI raw catch-all routes。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:150][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:154][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:177][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:190][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:194]

`instanceApiRoutes` 挂载 config、experimental、file、instance、MCP、project、project-copy、pty、question、permission、provider、session、sync、tui、workspace handlers。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:155][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:170]

V2 `serverRoutes` 在 V1 tree 中通过 `HttpApiBuilder.layer(Api)` 建出来，并 provide `handlers`、`PluginPtyEnvironment.layer`、server auth layer 和 V2 schema-error layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:177][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:178][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:179][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:180]

`createRoutes()` merge root/event/pty/instance/server/doc/UI 七个 route layer，并在外层提供 error/compression/cors/fence、MoveSession、HttpServer services、Observability、session location、location layer、PtyEnvironment、SessionV2 local execution、locationServiceMapV2 和 V1 app services。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:271][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:276][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:291][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:295][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:301][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:306][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:308]

`/doc` route 返回 cached `HttpServerResponse.jsonUnsafe(OpenApi.fromApi(PublicApi))`，不是 Swagger UI。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:188][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:190]

## V2 server package

`packages/server/src/api.ts` no longer declares groups inline; it imports `makeDefaultApi` from `@opencode-ai/protocol/api` and calls it with concrete `LocationMiddleware` and `SessionLocationMiddleware` keys。[E: packages/server/src/api.ts:1][E: packages/server/src/api.ts:5][E: packages/server/src/api.ts:7]

The protocol package owns the default API group list. `makeApiFromGroup` creates `HttpApi.make("server")`, adds health/location/agent/session/message/model/provider/integration/credential/permission/filesystem/command/skill/event/pty/question/reference/projectCopy groups, then attaches `Authorization` and `SchemaErrorMiddleware`。[E: packages/protocol/src/api.ts:37][E: packages/protocol/src/api.ts:38][E: packages/protocol/src/api.ts:55][E: packages/protocol/src/api.ts:63][E: packages/protocol/src/api.ts:64]

V2 `createRoutes(password?)` chooses a `ServerAuth.Config` layer, then `makeRoutes` builds `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })` and provides handlers, session-location layer, location layer, authorization, schema-error, auth config, and application services。[E: packages/server/src/routes.ts:39][E: packages/server/src/routes.ts:52][E: packages/server/src/routes.ts:54][E: packages/server/src/routes.ts:61]

V2 `webHandler()` converts routes to a Web handler with `HttpRouter.toWebHandler(..., { disableLogger: true })`。[E: packages/server/src/routes.ts:67][E: packages/server/src/routes.ts:68]

`handlers` merges 18 handler layers: health, location, agent, session, message, model, provider, integration, credential, permission, filesystem, command, skill, event, pty, question, reference and project-copy。[E: packages/server/src/handlers.ts:21][E: packages/server/src/handlers.ts:39]

## Middleware and session group

V2 authorization reads `auth_token` query or Basic authorization header, decodes base64 credentials, and either returns original effect when auth is not required or enforces `ServerAuth.authorized` with a `www-authenticate` pre-response header on failure。[E: packages/server/src/middleware/authorization.ts:31][E: packages/server/src/middleware/authorization.ts:33][E: packages/server/src/middleware/authorization.ts:42][E: packages/server/src/middleware/authorization.ts:50][E: packages/server/src/middleware/authorization.ts:52]

Session-location middleware decodes route `sessionID`, reads `SessionTable.directory` and `SessionTable.workspace_id`, and provides `locations.get(Location.Ref.make({ directory, workspaceID }))` to downstream effects。[E: packages/server/src/middleware/session-location.ts:33][E: packages/server/src/middleware/session-location.ts:42][E: packages/server/src/middleware/session-location.ts:57][E: packages/server/src/middleware/session-location.ts:59]

`makeSessionGroup` defines `GET /api/session`, `POST /api/session`, and `POST /api/session/:sessionID/prompt`; prompt payload includes optional `resume`, and its OpenAPI description says execution is scheduled unless resume is false。[E: packages/protocol/src/groups/session.ts:106][E: packages/protocol/src/groups/session.ts:109][E: packages/protocol/src/groups/session.ts:129][E: packages/protocol/src/groups/session.ts:205][E: packages/protocol/src/groups/session.ts:211][E: packages/protocol/src/groups/session.ts:221]

## V1 / V2 对照

| 维度 | V1 host | V2 server package |
| --- | --- | --- |
| HTTP stack | `HttpRouter.serve(HttpApiApp.createRoutes(...))` plus Node `createServer`。[E: packages/opencode/src/server/server.ts:100][E: packages/opencode/src/server/server.ts:199] | `HttpApiBuilder.layer(Api)` plus `HttpRouter.toWebHandler`。[E: packages/server/src/routes.ts:54][E: packages/server/src/routes.ts:67] |
| API ownership | V1 local route tree also mounts V2 `serverRoutes`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:177][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:281] | Group declarations live in `packages/protocol/src/api.ts`, concrete middleware keys come from `packages/server/src/api.ts`。[E: packages/protocol/src/api.ts:37][E: packages/server/src/api.ts:5] |
| Auth | V1 root/event/instance/pty/server routes use separate auth layers from `packages/opencode` server middleware。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:136][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:139] | V2 package authorization accepts Basic/query credentials and uses `ServerAuth` config。[E: packages/server/src/middleware/authorization.ts:42][E: packages/server/src/middleware/authorization.ts:50] |

## Sources

- `packages/opencode/src/server/server.ts`
- `packages/opencode/src/server/routes/instance/httpapi/server.ts`
- `packages/server/src/api.ts`
- `packages/server/src/routes.ts`
- `packages/server/src/handlers.ts`
- `packages/server/src/middleware/authorization.ts`
- `packages/server/src/middleware/session-location.ts`
- `packages/protocol/src/api.ts`
- `packages/protocol/src/groups/session.ts`

## Related

- [server-api.overview](../../surface/server-api/overview.md)
- [spine.cli-to-session](../../spine/cli-to-session.md)
