---
id: sdk.overview
title: TypeScript SDK 总览
kind: surface
tier: T1
v: shared
source: [packages/sdk/js/src/index.ts, packages/sdk/js/src/client.ts, packages/sdk/js/src/server.ts, packages/sdk/js/src/v2/index.ts, packages/sdk/js/src/v2/client.ts, packages/sdk/js/src/v2/server.ts, packages/sdk/js/script/build.ts, packages/sdk/js/package.json]
symbols: [createOpencodeClient, createOpencodeServer, createOpencode, OpencodeClient]
related: [sdk.surface, server-api.overview]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> TypeScript SDK 有两个入口：`@opencode-ai/sdk` 是旧/小 legacy SDK；`@opencode-ai/sdk/v2` 是当前全量 SDK，包含 legacy namespaces 与 `.v2.*` `/api/*` namespace。

## 能回答的问题

- `@opencode-ai/sdk` 与 `@opencode-ai/sdk/v2` 分别从哪些源码入口 export？
- SDK client wrapper 为什么把 `x-opencode-directory` 和 `x-opencode-workspace` 改写成 query 参数？
- 哪套 generated SDK 会被 `script/build.ts` 重新生成？
- `createOpencode()` 如何启动本地 opencode server 并返回 client/server？
- V2 SDK 为什么同时有 legacy routes 和 `.v2.*` routes？

## V1 legacy SDK

`packages/sdk/js/package.json` 的 package name 是 `@opencode-ai/sdk`，根 export `"."` 指向 `./src/index.ts`，`./client` 指向 `./src/client.ts`，`./server` 指向 `./src/server.ts`。[E: packages/sdk/js/package.json:3][E: packages/sdk/js/package.json:11][E: packages/sdk/js/package.json:12][E: packages/sdk/js/package.json:13] `src/index.ts` re-export client/server，并提供 `createOpencode(options)`：它先 `createOpencodeServer(options)`，再用 server url 创建 client，最后返回 `{ client, server }`。[E: packages/sdk/js/src/index.ts:1][E: packages/sdk/js/src/index.ts:4][E: packages/sdk/js/src/index.ts:8][E: packages/sdk/js/src/index.ts:13][E: packages/sdk/js/src/index.ts:17]

`src/client.ts` 引入 `./gen/*` generated client/types/sdk，并用 `error-interceptor` 包装 client error，最后返回 `new OpencodeClient({ client })`。[E: packages/sdk/js/src/client.ts:1][E: packages/sdk/js/src/client.ts:3][E: packages/sdk/js/src/client.ts:5][E: packages/sdk/js/src/client.ts:6][E: packages/sdk/js/src/client.ts:55][E: packages/sdk/js/src/client.ts:56] 如果 caller 没提供 fetch，legacy wrapper 注入一个 Bun-friendly fetch wrapper，把 request timeout 设为 false。[E: packages/sdk/js/src/client.ts:33][E: packages/sdk/js/src/client.ts:34][E: packages/sdk/js/src/client.ts:35][E: packages/sdk/js/src/client.ts:37] 如果 config 有 `directory`，legacy wrapper 写 header `x-opencode-directory`，request interceptor 只对 GET/HEAD request 把该 header 转成 `directory` query，再删掉 header。[E: packages/sdk/js/src/client.ts:17][E: packages/sdk/js/src/client.ts:18][E: packages/sdk/js/src/client.ts:20][E: packages/sdk/js/src/client.ts:24][E: packages/sdk/js/src/client.ts:28][E: packages/sdk/js/src/client.ts:46]

Legacy generated `OpencodeClient` 暴露 old V1 namespaces，例如 `global`、`project`、`pty`、`config`、`tool`、`instance`、`path`、`vcs`、`session`、`command`、`provider`、`find`、`file`、`app`、`mcp`、`lsp`、`formatter`、`tui`、`auth` 和 `event`。[E: packages/sdk/js/src/gen/sdk.gen.ts:1177][E: packages/sdk/js/src/gen/sdk.gen.ts:1196] 旧 generated SDK 还有一个 direct method `postSessionIdPermissionsPermissionId()` 映射 `/session/{id}/permissions/{permissionID}`。[E: packages/sdk/js/src/gen/sdk.gen.ts:1157][E: packages/sdk/js/src/gen/sdk.gen.ts:1161][E: packages/sdk/js/src/gen/sdk.gen.ts:1169]

## V2 SDK

`package.json` export `./v2` 指向 `./src/v2/index.ts`，`./v2/client` 指向 `./src/v2/client.ts`，`./v2/server` 指向 `./src/v2/server.ts`。[E: packages/sdk/js/package.json:15][E: packages/sdk/js/package.json:16][E: packages/sdk/js/package.json:18] `src/v2/index.ts` 与 legacy root 一样 export client/server 并提供 `createOpencode(options)`；它还 `export * as data from "./data.js"`。[E: packages/sdk/js/src/v2/index.ts:1][E: packages/sdk/js/src/v2/index.ts:8][E: packages/sdk/js/src/v2/index.ts:10][E: packages/sdk/js/src/v2/index.ts:15]

`src/v2/client.ts` 使用 `./gen/*` 的 current generated SDK。它导出 V2 types，并把 `FileSystemContent` 与 `FileSystemEntry` 重新命名为 `LocationFileSystemContent` / `LocationFileSystemEntry` 供 callers 使用。[E: packages/sdk/js/src/v2/client.ts:1][E: packages/sdk/js/src/v2/client.ts:2][E: packages/sdk/js/src/v2/client.ts:5] V2 wrapper 接受 `directory` 与 `experimental_workspaceID`，分别写入 `x-opencode-directory` 与 `x-opencode-workspace` headers。[E: packages/sdk/js/src/v2/client.ts:53][E: packages/sdk/js/src/v2/client.ts:66][E: packages/sdk/js/src/v2/client.ts:69][E: packages/sdk/js/src/v2/client.ts:73][E: packages/sdk/js/src/v2/client.ts:76]

V2 request interceptor 对 GET/HEAD request 做 context rewrite。普通 legacy path 只补 `directory`/`workspace` query；`/api/*` path 会同时尝试补 `directory`/`workspace` 和 nested `location[directory]`/`location[workspace]` query，以适配 V2 location object 参数。[E: packages/sdk/js/src/v2/client.ts:21][E: packages/sdk/js/src/v2/client.ts:22][E: packages/sdk/js/src/v2/client.ts:27][E: packages/sdk/js/src/v2/client.ts:37][E: packages/sdk/js/src/v2/client.ts:39] V2 wrapper 额外拦截 `content-type: text/html` response，抛出 “server version unsupported” 类错误，避免 SDK consumer 把 UI fallback HTML 当 API response。[E: packages/sdk/js/src/v2/client.ts:87][E: packages/sdk/js/src/v2/client.ts:88][E: packages/sdk/js/src/v2/client.ts:90]

V2 generated `OpencodeClient` 有 legacy namespaces，也有 `v2` getter；`V2` class 下面挂 `health/location/agent/session/model/provider/connector/permission/fs/command/skill/event/question/reference` namespaces，对应 `/api/*` routes。[E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6199][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6200][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6215][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6230][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6240][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6265][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6409]

## Generation

`script/build.ts` 生成过程先在 `packages/opencode` 下运行 `bun dev generate > openapi.json`，然后调用 `@hey-api/openapi-ts` 的 `createClient()`，输出路径固定为 `./src/v2/gen` 且 `clean: true`。[E: packages/sdk/js/script/build.ts:12][E: packages/sdk/js/script/build.ts:14][E: packages/sdk/js/script/build.ts:16][E: packages/sdk/js/script/build.ts:19][E: packages/sdk/js/script/build.ts:21] 这意味着当前 build script 重新生成的是 `src/v2/gen`，不是旧 `src/gen`；旧 `src/gen` 只在后续 prettier 步骤里被格式化。[E: packages/sdk/js/script/build.ts:61][E: packages/sdk/js/script/build.ts:62][I]

The generator config uses `@hey-api/typescript`、`@hey-api/sdk` with `instance: "OpencodeClient"` and `paramsStructure: "flat"`、以及 `@hey-api/client-fetch` baseUrl `http://localhost:4096`。[E: packages/sdk/js/script/build.ts:23][E: packages/sdk/js/script/build.ts:29][E: packages/sdk/js/script/build.ts:30][E: packages/sdk/js/script/build.ts:33][E: packages/sdk/js/script/build.ts:36][E: packages/sdk/js/script/build.ts:38] Build script patches a `@hey-api/openapi-ts` SSE type bug in `src/v2/gen/client/types.gen.ts` by removing the erroneous `TError` generic from `ServerSentEventsResult`.[E: packages/sdk/js/script/build.ts:49][E: packages/sdk/js/script/build.ts:52][E: packages/sdk/js/script/build.ts:59]

## Server launcher

Both legacy and V2 server wrappers spawn the `opencode` binary with `serve --hostname=... --port=...` and pass config via `OPENCODE_CONFIG_CONTENT` environment variable。[E: packages/sdk/js/src/server.ts:32][E: packages/sdk/js/src/server.ts:35][E: packages/sdk/js/src/server.ts:38][E: packages/sdk/js/src/v2/server.ts:32][E: packages/sdk/js/src/v2/server.ts:35][E: packages/sdk/js/src/v2/server.ts:38] They wait for stdout line starting with `opencode server listening`, parse the URL, and return `{ url, close() }`.[E: packages/sdk/js/src/server.ts:51][E: packages/sdk/js/src/server.ts:56][E: packages/sdk/js/src/server.ts:57][E: packages/sdk/js/src/server.ts:93][E: packages/sdk/js/src/v2/server.ts:51][E: packages/sdk/js/src/v2/server.ts:93]

## V1/V2 对照

| 维度 | `@opencode-ai/sdk` | `@opencode-ai/sdk/v2` |
|---|---|---|
| export path | `"." -> ./src/index.ts`。[E: packages/sdk/js/package.json:12] | `"./v2" -> ./src/v2/index.ts`。[E: packages/sdk/js/package.json:15] |
| generated dir | `src/gen` legacy generated SDK imported by `src/client.ts`。[E: packages/sdk/js/src/client.ts:3][E: packages/sdk/js/src/client.ts:5] | `src/v2/gen` current generated SDK imported by `src/v2/client.ts`。[E: packages/sdk/js/src/v2/client.ts:7][E: packages/sdk/js/src/v2/client.ts:9] |
| context rewrite | GET/HEAD `x-opencode-directory` -> `directory`。[E: packages/sdk/js/src/client.ts:17][E: packages/sdk/js/src/client.ts:24] | GET/HEAD `x-opencode-directory`/`x-opencode-workspace` -> top-level query and `/api/*` location query。[E: packages/sdk/js/src/v2/client.ts:27][E: packages/sdk/js/src/v2/client.ts:37] |
| surface | Legacy V1 namespaces only plus one direct permission method。[E: packages/sdk/js/src/gen/sdk.gen.ts:1157][E: packages/sdk/js/src/gen/sdk.gen.ts:1177] | Legacy compatibility namespaces plus `.v2.*` native `/api/*` namespaces。[E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6271][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6409] |
| regeneration | Not regenerated by current `script/build.ts`; only prettier touches `src/gen`。[E: packages/sdk/js/script/build.ts:61][I] | Regenerated from `bun dev generate` into `src/v2/gen` with clean output。[E: packages/sdk/js/script/build.ts:14][E: packages/sdk/js/script/build.ts:19][E: packages/sdk/js/script/build.ts:21] |

## Sources

- packages/sdk/js/package.json
- packages/sdk/js/src/index.ts
- packages/sdk/js/src/client.ts
- packages/sdk/js/src/server.ts
- packages/sdk/js/src/gen/sdk.gen.ts
- packages/sdk/js/src/v2/index.ts
- packages/sdk/js/src/v2/client.ts
- packages/sdk/js/src/v2/server.ts
- packages/sdk/js/src/v2/gen/sdk.gen.ts
- packages/sdk/js/script/build.ts

## 相关

- [SDK method surface](surface.md)
- [Server API overview](../server-api/overview.md)
