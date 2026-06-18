---
id: server-api.overview
title: Server API 总览
kind: surface
tier: T1
v: shared
source: [packages/opencode/src/server/routes/instance/httpapi/api.ts, packages/opencode/src/server/routes/instance/httpapi/server.ts, packages/opencode/src/server/server.ts, packages/server/src/api.ts, packages/server/src/routes.ts, packages/server/src/handlers.ts, specs/v2/api.html]
symbols: [OpenCodeHttpApi, RootHttpApi, InstanceHttpApi, Api, createRoutes, HttpApiApp]
related: [server-api.v1-routes, server-api.v2-routes, server.http-server]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> opencode server API 是 Effect HttpApi surface：V1 server 在 `packages/opencode/src/server/routes/instance/httpapi` 装配 legacy routes，同时把 V2 `@opencode-ai/server/api` 的 `/api/*` group 挂进同一个 route tree；两个 HTTP server 都不是 Hono。

## 能回答的问题

- V1 legacy API 与 V2 `/api/*` API 分别在哪里声明、在哪里挂载？
- `RootHttpApi`、`InstanceHttpApi`、`OpenCodeHttpApi` 的边界是什么？
- 为什么 V1 server 仍然能暴露 V2 `/api/*` routes？
- `/doc`、`/openapi.json`、SSE、WebSocket upgrade 和 UI fallback 的装配规则是什么？
- V2 API 的 request context 和 session-pinned context 设计动机是什么？

## V1

### API declaration

V1 declared route tree 使用 `effect/unstable/httpapi` 的 `HttpApi`，不是 Hono；`api.ts` 第一行 imports `HttpApi`，随后用 `.addHttpApi(...)` 组合各 group。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:2][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:44][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:51] `RootHttpApi` 覆盖 control/control-plane/global routes，并挂 `SchemaErrorMiddleware` 与 `Authorization`。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:44][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:47][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:48][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:49]

`InstanceHttpApi` 覆盖 config、experimental/file/instance/mcp/project/project-copy/pty/question/permission/provider/session/sync/tui/workspace 这些 instance routes，并挂 schema error middleware。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:51][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:52][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:66][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:67] `OpenCodeHttpApi` 把 `RootHttpApi`、`EventApi`、`InstanceHttpApi`、V2 `Api` 和 `PtyConnectApi` 合在一起，因此 V1 server process 暴露 legacy routes 与 V2 `/api/*` routes。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:69][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:70][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:73][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:74]

### Route assembly

V1 route assembly 文件是 `packages/opencode/src/server/routes/instance/httpapi/server.ts`。它把 route tree 分成 root API、typed SSE event API、typed PTY WebSocket upgrade API、instance API 和 raw UI fallback。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:132][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:137][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:145][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:185] `rootApiRoutes` 用 `HttpApiBuilder.layer(RootHttpApi)` 并提供 control/control-plane/global handlers、schema error layer 和 auth layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:132][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:133][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:134][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:135]

`eventApiRoutes` 和 `ptyConnectApiRoutes` 都是 typed `HttpApiBuilder.layer(...)`，只是前者带 workspace routing 与 instance context，后者用 ticket-aware pty auth。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:137][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:139][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:143] `instanceRoutes` 把 all instance handlers 提供给 `InstanceHttpApi`，再统一提供 auth、workspace routing、instance context 和 schema error layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:145][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:161][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:165][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:166]

V1 server route tree 直接 `HttpApiBuilder.layer(Api)` 挂载 V2 server API，并提供 `@opencode-ai/server/handlers` 与 server auth/schema error layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:168][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:170][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:171] `createRoutes()` 最终 `Layer.mergeAll()` 合并 root/event/pty/instance/server/doc/ui routes，并提供 V1 runtime services，包括 `LLM.defaultLayer`、`SessionPrompt.defaultLayer`、`Provider.defaultLayer`、`ProviderAuth.defaultLayer`、`EventV2Bridge.defaultLayer` 和 `ToolRegistry.defaultLayer`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:261][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:264][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:269][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:223][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:234][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:248][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:252]

### Public OpenAPI and raw fallback

`/doc` route lazily computes `OpenApi.fromApi(PublicApi)` and returns cached JSON response so CLI/server startup does not pay OpenAPI serialization at module load.[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:179][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:181] `public.ts` normalizes legacy OpenAPI by stripping legacy auth metadata for non-`/api` paths and documenting `/event` plus `/global/event` as `text/event-stream` because HttpApi has no first-class SSE response schema.[E: packages/opencode/src/server/routes/instance/httpapi/public.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:150][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:155][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:161]

`AGENTS.md` in the V1 HttpApi directory is the local route design rule: normal endpoints and streaming SSE should use `HttpApiBuilder.group(...)`; raw `HttpRouter.use(...)` should be reserved for route surface outside the declared API, such as catch-all UI fallback.[E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:3][E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:15][E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:29] The actual `uiRoute` is a raw `HttpRouter.use(...)` wildcard `"/*"` route calling `serveUIEffect()` and protected by router auth middleware.[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:185][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:190][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:191][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:194]

## V2

### API declaration

V2 server package uses the same Effect HttpApi family. `packages/server/src/api.ts` imports `HttpApi` and `OpenApi`, creates `Api = HttpApi.make("server")`, and adds Health, Location, Agent, Session, Message, Model, Provider, Integration, Credential, Permission, FileSystem, Command, Skill, Event, Pty, Question, Reference and ProjectCopy groups.[E: packages/server/src/api.ts:1][E: packages/server/src/api.ts:23][E: packages/server/src/api.ts:31][E: packages/server/src/api.ts:32][E: packages/server/src/api.ts:38][E: packages/server/src/api.ts:41] V2 `Api` annotates OpenAPI metadata title `"opencode HttpApi"`, version `"0.0.1"`, description `"Experimental HttpApi surface for selected instance routes."`, then installs Authorization and SchemaError middleware.[E: packages/server/src/api.ts:42][E: packages/server/src/api.ts:44][E: packages/server/src/api.ts:46][E: packages/server/src/api.ts:49][E: packages/server/src/api.ts:50]

`packages/server/src/routes.ts` exposes `createRoutes(password?)` as a standalone V2 server route layer. It uses `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })` and provides handlers, authorization, schema error layer, ServerAuth config, LocationServiceMap, Database, EventV2 and FetchHttpClient.[E: packages/server/src/routes.ts:14][E: packages/server/src/routes.ts:15][E: packages/server/src/routes.ts:17][E: packages/server/src/routes.ts:25][E: packages/server/src/routes.ts:28] `webHandler()` converts that Effect route layer to a web handler with `HttpRouter.toWebHandler(...)`.[E: packages/server/src/routes.ts:34][E: packages/server/src/routes.ts:35]

V2 handler assembly merges all group handler layers, then provides session-location middleware, location handler layer, `SessionV2.defaultLayer`, local session execution, saved permissions and LocationServiceMap.[E: packages/server/src/handlers.ts:29][E: packages/server/src/handlers.ts:47][E: packages/server/src/handlers.ts:49][E: packages/server/src/handlers.ts:51][E: packages/server/src/handlers.ts:52][E: packages/server/src/handlers.ts:54]

### Design context

`specs/v2/api.html` frames V2 as a single `/api` route surface for simple clients and multi-directory frontends, where the core design question is how runtime context is resolved.[E: specs/v2/api.html:412][E: specs/v2/api.html:414] The spec says canonical routes split into server-scoped operations, request-context operations, and session-pinned operations; non-session route examples resolve from request/default runtime context, while `/api/session/:id/prompt` resolves context from the session row.[E: specs/v2/api.html:427][E: specs/v2/api.html:431][E: specs/v2/api.html:459][E: specs/v2/api.html:472] The same design doc states the SDK is the source of truth and `/api/*` HTTP routes are mounts for RPC-style operations.[E: specs/v2/api.html:510][E: specs/v2/api.html:514]

The V2 API design also defines an event envelope with `id`, `type`, `time`, `context` and `payload`, placing runtime identity in `context` and resource identity in `payload`.[E: specs/v2/api.html:1064][E: specs/v2/api.html:1068][E: specs/v2/api.html:1072][E: specs/v2/api.html:1076]

## V1/V2 对照

| 维度 | V1 legacy surface | V2 surface |
|---|---|---|
| API declaration | `RootHttpApi`、`EventApi`、`InstanceHttpApi`、`PtyConnectApi` under `packages/opencode/src/server/routes/instance/httpapi`。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:44][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:69] | `Api = HttpApi.make("server")` in `packages/server/src/api.ts`。[E: packages/server/src/api.ts:23] |
| Mount location | V1 server route tree merges root/event/pty/instance routes and also mounts V2 `Api` as `serverRoutes`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:264][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:269] | Standalone V2 `createRoutes()` mounts only V2 `Api` and serves `/openapi.json`。[E: packages/server/src/routes.ts:14][E: packages/server/src/routes.ts:15] |
| Auth/OpenAPI | Legacy OpenAPI strips security and 401 from non-`/api` paths for old SDK stability。[E: packages/opencode/src/server/routes/instance/httpapi/public.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:151] | V2 `Api` carries Authorization middleware and schema error middleware at `Api` level。[E: packages/server/src/api.ts:49][E: packages/server/src/api.ts:50] |
| Route design | Local AGENTS says use `HttpApiBuilder.group` for typed routes and raw router only for declared-surface outsiders。[E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:3][E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:29] | V2 spec favors canonical `/api/*` operations with request/session context rules。[E: specs/v2/api.html:412][E: specs/v2/api.html:510] |

## Sources

- packages/opencode/src/server/routes/instance/httpapi/api.ts
- packages/opencode/src/server/routes/instance/httpapi/server.ts
- packages/opencode/src/server/server.ts
- packages/opencode/src/server/routes/instance/httpapi/public.ts
- packages/opencode/src/server/routes/instance/httpapi/AGENTS.md
- packages/server/src/api.ts
- packages/server/src/routes.ts
- packages/server/src/handlers.ts
- specs/v2/api.html

## 相关

- [V1 routes catalog](v1-routes.md)
- [V2 routes catalog](v2-routes.md)
- [HTTP server subsystem](../../subsystems/server/http-server.md)
