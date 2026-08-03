---
id: server-api.overview
title: Server API 总览
kind: surface
tier: T1
v: shared
source: [packages/opencode/src/server/routes/instance/httpapi/api.ts, packages/opencode/src/server/routes/instance/httpapi/server.ts, packages/opencode/src/server/server.ts, packages/protocol/src/api.ts, packages/server/src/api.ts, packages/server/src/routes.ts, packages/server/src/handlers.ts, specs/v2/api.html]
symbols: [OpenCodeHttpApi, RootHttpApi, InstanceHttpApi, Api, createRoutes, HttpApiApp]
related: [server-api.v1-routes, server-api.v2-routes, server.http-server]
evidence: explicit
status: verified
updated: 89130db6b0
---

> opencode server API 是 Effect HttpApi surface：V1 server 在 `packages/opencode/src/server/routes/instance/httpapi` 装配 legacy routes，同时把 V2 `@opencode-ai/server/api` 的 `/api/*` group 挂进同一个 route tree；V2 API declaration 由 `@opencode-ai/protocol/api` 生成，两个 HTTP server 都不是 Hono。

## 能回答的问题

- V1 legacy API 与 V2 `/api/*` API 分别在哪里声明、在哪里挂载？
- `RootHttpApi`、`InstanceHttpApi`、`OpenCodeHttpApi` 的边界是什么？
- 为什么 V1 server 仍然能暴露 V2 `/api/*` routes？
- `/doc`、`/openapi.json`、SSE、WebSocket upgrade 和 UI fallback 的装配规则是什么？
- V2 API 的 request context 和 session-pinned context 设计动机是什么？

## V1

### API declaration

V1 declared route tree 使用 `effect/unstable/httpapi` 的 `HttpApi`，不是 Hono；`api.ts` imports `HttpApi`，随后用 `.addHttpApi(...)` 组合各 group。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:2][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:54][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:61] `RootHttpApi` 覆盖 control/control-plane/global routes，并挂 `SchemaErrorMiddleware` 与 `Authorization`。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:54][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:55][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:56][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:57][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:58][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:59]

`InstanceHttpApi` 覆盖 config、experimental/file/instance/mcp/project/project-copy/pty/question/permission/provider/session/sync/tui/workspace 这些 instance routes，并挂 schema error middleware。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:61][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:62][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:76][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:77] `OpenCodeHttpApi` 把 `RootHttpApi`、`EventApi`、`InstanceHttpApi`、由 protocol `makeApi(...)` 生成的 `ServerApi` 和 `PtyConnectApi` 合在一起，供 public OpenAPI 使用。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:28][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:48][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:79][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:80][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:81][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:82][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:83][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:84]

### Route assembly

V1 route assembly 文件是 `packages/opencode/src/server/routes/instance/httpapi/server.ts`。它把 route tree 分成 root API、typed SSE event API、typed PTY WebSocket upgrade API、instance API、V2 server API、`/doc` route 和 raw UI fallback。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:150][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:154][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:177][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:190][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:194] `rootApiRoutes` 用 `HttpApiBuilder.layer(RootHttpApi)` 并提供 control/control-plane/global handlers、schema error layer 和 auth layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:141][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:142][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:143][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:144]

`eventApiRoutes` 和 `ptyConnectApiRoutes` 都是 typed `HttpApiBuilder.layer(...)`，只是前者带 workspace routing 与 instance context，后者用 ticket-aware pty auth。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:148][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:150][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:152] `instanceRoutes` 把 all instance handlers 提供给 `InstanceHttpApi`，再统一提供 auth、workspace routing、instance context 和 schema error layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:154][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:155][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:170][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:174][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:175]

V1 server route tree 直接 `HttpApiBuilder.layer(Api)` 挂载 V2 server API，并提供 `@opencode-ai/server/handlers`、plugin PTY environment、server auth layer 和 V2 schema error layer。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:74][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:177][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:178][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:179][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:180] `createRoutes()` 最终 `Layer.mergeAll()` 合并 root/event/pty/instance/server/doc/ui routes，并通过 `app` layer 提供 V1 runtime services，包括 `LLM`、`SessionPrompt`、`Provider`、`ProviderAuth`、`EventV2Bridge` 和 `ToolRegistry`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:276][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:277][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:281][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:283][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:226][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:227][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:240][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:246][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:248][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:254]

### Public OpenAPI and raw fallback

`/doc` route defines `docResponse` with `lazy(() => HttpServerResponse.jsonUnsafe(OpenApi.fromApi(PublicApi)))` and serves that response from `GET /doc`; this defers and reuses OpenAPI response creation.[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:188][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:190] `public.ts` normalizes legacy OpenAPI by stripping legacy auth metadata for non-`/api` paths and documenting `/event` plus `/global/event` as `text/event-stream` because HttpApi has no first-class SSE response schema.[E: packages/opencode/src/server/routes/instance/httpapi/public.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:150][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:155][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:161]

`AGENTS.md` in the V1 HttpApi directory is the local route design rule: normal endpoints and streaming SSE should use `HttpApiBuilder.group(...)`; raw `HttpRouter.use(...)` should be reserved for route surface outside the declared API, such as catch-all UI fallback.[E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:3][E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:15][E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:29] The actual `uiRoute` is a raw `HttpRouter.use(...)` wildcard `"/*"` route calling `serveUIEffect()` and protected by router auth middleware.[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:194][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:199][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:200][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:203]

## V2

### API declaration

V2 server package uses the same Effect HttpApi family, but the route declaration now lives in `@opencode-ai/protocol/api`: `packages/server/src/api.ts` imports `makeDefaultApi(...)`, passes server `LocationMiddleware` and `SessionLocationMiddleware`, and exports `Api` from that protocol factory.[E: packages/server/src/api.ts:1][E: packages/server/src/api.ts:5][E: packages/server/src/api.ts:6][E: packages/server/src/api.ts:7] `packages/protocol/src/api.ts` imports `HttpApi` and `OpenApi`, creates `HttpApi.make("server")`, and adds Health, Location, Agent, Session, Message, Model, Provider, Integration, Credential, Permission, FileSystem, Command, Skill, Event, Pty, Question, Reference and ProjectCopy groups.[E: packages/protocol/src/api.ts:2][E: packages/protocol/src/api.ts:37][E: packages/protocol/src/api.ts:38][E: packages/protocol/src/api.ts:41][E: packages/protocol/src/api.ts:45][E: packages/protocol/src/api.ts:55] V2 `Api` annotates OpenAPI metadata title `"opencode HttpApi"`, version `"0.0.1"`, description `"Experimental HttpApi surface for selected instance routes."`, then installs Authorization and SchemaError middleware.[E: packages/protocol/src/api.ts:57][E: packages/protocol/src/api.ts:58][E: packages/protocol/src/api.ts:59][E: packages/protocol/src/api.ts:60][E: packages/protocol/src/api.ts:63][E: packages/protocol/src/api.ts:64]

`packages/server/src/routes.ts` exposes `createRoutes(password?)` as a standalone V2 server route layer. It uses `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })` and provides handlers, session-location middleware, location middleware, authorization, schema error layer, ServerAuth config and the application service layer.[E: packages/server/src/routes.ts:39][E: packages/server/src/routes.ts:51][E: packages/server/src/routes.ts:54][E: packages/server/src/routes.ts:55][E: packages/server/src/routes.ts:56][E: packages/server/src/routes.ts:57][E: packages/server/src/routes.ts:58][E: packages/server/src/routes.ts:59][E: packages/server/src/routes.ts:60][E: packages/server/src/routes.ts:61] `webHandler()` converts that Effect route layer to a web handler with `HttpRouter.toWebHandler(...)`.[E: packages/server/src/routes.ts:67][E: packages/server/src/routes.ts:68]

V2 handler assembly merges all group handler layers in `packages/server/src/handlers.ts`, while `packages/server/src/routes.ts` builds runtime services from Database, EventV2, httpClient, ToolOutputStore, SessionV2, PermissionSaved, PtyTicket, Credential, PtyEnvironment and LocationServiceMap, plus local session execution.[E: packages/server/src/handlers.ts:21][E: packages/server/src/handlers.ts:29][E: packages/server/src/handlers.ts:39][E: packages/server/src/routes.ts:26][E: packages/server/src/routes.ts:27][E: packages/server/src/routes.ts:31][E: packages/server/src/routes.ts:36][E: packages/server/src/routes.ts:52]

### Design context

`specs/v2/api.html` frames V2 as a single `/api` route surface for simple clients and multi-directory frontends, where the core design question is how runtime context is resolved.[E: specs/v2/api.html:412][E: specs/v2/api.html:414] The spec says canonical routes split into server-scoped operations, request-context operations, and session-pinned operations; non-session route examples resolve from request/default runtime context, while `/api/session/:id/prompt` resolves context from the session row.[E: specs/v2/api.html:427][E: specs/v2/api.html:431][E: specs/v2/api.html:459][E: specs/v2/api.html:472] The same design doc states the SDK is the source of truth and `/api/*` HTTP routes are mounts for RPC-style operations.[E: specs/v2/api.html:510][E: specs/v2/api.html:514]

The V2 API design also defines an event envelope with `id`, `type`, `time`, `context` and `payload`, placing runtime identity in `context` and resource identity in `payload`.[E: specs/v2/api.html:1064][E: specs/v2/api.html:1068][E: specs/v2/api.html:1072][E: specs/v2/api.html:1076]

## V1/V2 对照

| 维度 | V1 legacy surface | V2 surface |
|---|---|---|
| API declaration | `RootHttpApi`、`EventApi`、`InstanceHttpApi`、`PtyConnectApi` under `packages/opencode/src/server/routes/instance/httpapi`。[E: packages/opencode/src/server/routes/instance/httpapi/api.ts:54][E: packages/opencode/src/server/routes/instance/httpapi/api.ts:79] | `Api = makeDefaultApi(...)` in `packages/server/src/api.ts`, backed by `HttpApi.make("server")` in `packages/protocol/src/api.ts`。[E: packages/server/src/api.ts:5][E: packages/protocol/src/api.ts:37] |
| Mount location | V1 server route tree merges root/event/pty/instance routes and also mounts V2 `Api` as `serverRoutes`。[E: packages/opencode/src/server/routes/instance/httpapi/server.ts:276][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:281] | Standalone V2 `createRoutes()` mounts only V2 `Api` and serves `/openapi.json`。[E: packages/server/src/routes.ts:39][E: packages/server/src/routes.ts:54] |
| Auth/OpenAPI | Legacy OpenAPI strips security and 401 from non-`/api` paths for old SDK stability。[E: packages/opencode/src/server/routes/instance/httpapi/public.ts:146][E: packages/opencode/src/server/routes/instance/httpapi/public.ts:151] | V2 `Api` carries Authorization middleware and schema error middleware at `Api` level。[E: packages/protocol/src/api.ts:63][E: packages/protocol/src/api.ts:64] |
| Route design | Local AGENTS says use `HttpApiBuilder.group` for typed routes and raw router only for declared-surface outsiders。[E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:3][E: packages/opencode/src/server/routes/instance/httpapi/AGENTS.md:29] | V2 spec favors canonical `/api/*` operations with request/session context rules。[E: specs/v2/api.html:412][E: specs/v2/api.html:510] |

## Sources

- packages/opencode/src/server/routes/instance/httpapi/api.ts
- packages/opencode/src/server/routes/instance/httpapi/server.ts
- packages/opencode/src/server/server.ts
- packages/opencode/src/server/routes/instance/httpapi/public.ts
- packages/opencode/src/server/routes/instance/httpapi/AGENTS.md
- packages/protocol/src/api.ts
- packages/server/src/api.ts
- packages/server/src/routes.ts
- packages/server/src/handlers.ts
- specs/v2/api.html

## 相关

- [V1 routes catalog](v1-routes.md)
- [V2 routes catalog](v2-routes.md)
- [HTTP server subsystem](../../subsystems/server/http-server.md)
