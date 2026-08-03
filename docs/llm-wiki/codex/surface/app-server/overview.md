---
id: rpc.overview
title: App-Server 协议总览
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v1.rs, codex-rs/app-server-protocol/src/rpc.rs, codex-rs/app-server-protocol/src/lib.rs, codex-rs/app-server-protocol/src/precomputed_exports.rs, codex-rs/app-server-protocol/src/experimental_api.rs, codex-rs/app-server-transport/src/transport/mod.rs, codex-rs/app-server/src/transport.rs]
symbols: [ClientRequest, ClientResponse, ServerRequest, ServerResponse, ServerNotification, ServerNotificationEnvelope, JSONRPCMessage, JSONRPCRequest, JSONRPCNotification, JSONRPCResponse, JSONRPCError, GenerateTsOptions, AppServerTransport]
related: [rpc.thread-methods, rpc.turn-methods, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.notifications-system, rpc.server-requests, subsys.app-server.transport, subsys.app-server.message-processor]
evidence: explicit
status: verified
updated: 7750465934
---

> App-Server protocol 是 Codex 面向客户端连接的 typed JSON-RPC-like 控制面：客户端发 `ClientRequest`，服务器回 `ClientResponse`、推 `ServerNotification`，必要时服务器反向发 `ServerRequest` 等客户端响应。

## 能回答的问题

- App-Server protocol 的 wire envelope 长什么样？
- `ClientRequest`、`ClientResponse`、`ServerRequest`、`ServerResponse`、`ServerNotification` 分别由哪个宏生成？
- 当前 RPC catalog 的 client request、server notification、server request 计数是多少？
- app-server 当前支持哪些 transport listen URL？
- initialize 和 deprecated v1 方法还留在哪个命名空间？

## 协议形态

`rpc.rs` 定义 `JSONRPC_VERSION` 常量，但 `JSONRPCRequest`、`JSONRPCNotification`、`JSONRPCResponse` 和 `JSONRPCError` 的序列化字段只覆盖 id/method/params/trace/result/error 等 envelope 字段，因此本文把 app-server wire envelope 称为 JSON-RPC-like，而不是完整 JSON-RPC 2.0。[E: codex-rs/app-server-protocol/src/rpc.rs:11][E: codex-rs/app-server-protocol/src/rpc.rs:46][E: codex-rs/app-server-protocol/src/rpc.rs:48][E: codex-rs/app-server-protocol/src/rpc.rs:51][E: codex-rs/app-server-protocol/src/rpc.rs:55][E: codex-rs/app-server-protocol/src/rpc.rs:60][E: codex-rs/app-server-protocol/src/rpc.rs:64][E: codex-rs/app-server-protocol/src/rpc.rs:69][E: codex-rs/app-server-protocol/src/rpc.rs:71][E: codex-rs/app-server-protocol/src/rpc.rs:76][E: codex-rs/app-server-protocol/src/rpc.rs:78][I] 同一文件仍定义 `RequestId` 和 `JSONRPCMessage`。[E: codex-rs/app-server-protocol/src/rpc.rs:17][E: codex-rs/app-server-protocol/src/rpc.rs:37]

`ClientRequest` 使用 serde tag `method` 建模；目标 HEAD 的 request-definition macro 要求每个 variant 都显式声明 wire string，`ClientResponse` 也按 `method` tagged enum 建模。[E: codex-rs/app-server-protocol/src/protocol/common.rs:194][E: codex-rs/app-server-protocol/src/protocol/common.rs:220][E: codex-rs/app-server-protocol/src/protocol/common.rs:285][E: codex-rs/app-server-protocol/src/protocol/common.rs:1283] `server_request_definitions!` 生成 server-to-client request/response/payload helper；`server_notification_definitions!` 生成 server-to-client notification enum。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1265][E: codex-rs/app-server-protocol/src/protocol/common.rs:1280][E: codex-rs/app-server-protocol/src/protocol/common.rs:1306][E: codex-rs/app-server-protocol/src/protocol/common.rs:1320][E: codex-rs/app-server-protocol/src/protocol/common.rs:1354][E: codex-rs/app-server-protocol/src/protocol/common.rs:1436][E: codex-rs/app-server-protocol/src/protocol/common.rs:1457]

## Experimental 与 transport

`ExperimentalApi` 的约定是返回方法级或字段级 reason；`ExperimentalField` 的 reason 注释约定为 `<method>` 或 `<method>.<field>`。[E: codex-rs/app-server-protocol/src/experimental_api.rs:5][E: codex-rs/app-server-protocol/src/experimental_api.rs:13][E: codex-rs/app-server-protocol/src/experimental_api.rs:19] outbound 发送时，未启用 experimental API 的连接会跳过 experimental notification，并会对 `CommandExecutionRequestApproval` 剥离 experimental fields。[E: codex-rs/app-server/src/transport.rs:100][E: codex-rs/app-server/src/transport.rs:111][E: codex-rs/app-server/src/transport.rs:176][E: codex-rs/app-server/src/transport.rs:184][E: codex-rs/app-server/src/transport.rs:188]

`AppServerTransport` 当前有 `Stdio`、`UnixSocket`、`WebSocket` 和 `Off`；默认 listen URL 是 `stdio://`，解析器接受 `unix://`、`unix://PATH`、`ws://IP:PORT` 和 `off`。[E: codex-rs/app-server-transport/src/transport/mod.rs:75][E: codex-rs/app-server-transport/src/transport/mod.rs:114][E: codex-rs/app-server-transport/src/transport/mod.rs:116][E: codex-rs/app-server-transport/src/transport/mod.rs:121][E: codex-rs/app-server-transport/src/transport/mod.rs:146][E: codex-rs/app-server-transport/src/transport/mod.rs:150]

## Catalog 计数

当前 `common.rs` 中三组宏实例清点为 136 个 `ClientRequest`、72 个 `ServerNotification`、11 个 `ServerRequest`，合计 219 个 RPC 实例；包括 initialize 与 deprecated v1 variants 在内，每个 `ClientRequest` variant 都显式声明 wire string。`ServerRequest` 的两个 legacy v1 approval variants 仍由 camelCase 默认名派生。[E: codex-rs/app-server-protocol/src/protocol/common.rs:194][E: codex-rs/app-server-protocol/src/protocol/common.rs:474][E: codex-rs/app-server-protocol/src/protocol/common.rs:1214][E: codex-rs/app-server-protocol/src/protocol/common.rs:1529][E: codex-rs/app-server-protocol/src/protocol/common.rs:1684]

相对上一目标，本次新增 6 个 client-request wire method：稳定的 `thread/section/move` 与 `threadSection/list|create|update|delete`，以及 experimental `plugin/search`；notification 与 reverse-request variant 数不变。[E: codex-rs/app-server-protocol/src/protocol/common.rs:561][E: codex-rs/app-server-protocol/src/protocol/common.rs:634][E: codex-rs/app-server-protocol/src/protocol/common.rs:639][E: codex-rs/app-server-protocol/src/protocol/common.rs:644][E: codex-rs/app-server-protocol/src/protocol/common.rs:649][E: codex-rs/app-server-protocol/src/protocol/common.rs:732]

协议导出不再在普通构建中运行 reflection exporter：`precomputed_exports.rs` 内嵌 stable/experimental 两套 zstd JSON archive，`generate_ts`/`generate_json` 解压后写文件；reflection 与 schema-fixture 模块只在测试构建启用，non-test derive 使用 noop macros。[E: codex-rs/app-server-protocol/src/precomputed_exports.rs:14][E: codex-rs/app-server-protocol/src/precomputed_exports.rs:62][E: codex-rs/app-server-protocol/src/precomputed_exports.rs:98][E: codex-rs/app-server-protocol/src/precomputed_exports.rs:115][E: codex-rs/app-server-protocol/src/lib.rs:1][E: codex-rs/app-server-protocol/src/lib.rs:64]

目标 HEAD 还新增 `ServerNotificationEnvelope`：它 flatten `ServerNotification` 并附带 optional `emittedAtMs`，使旧客户端仍可 decode 没有时间戳的通知，而当前 app-server 会在 fan-out 前记录 emission time。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1795][E: codex-rs/app-server-protocol/src/protocol/common.rs:1796][E: codex-rs/app-server-protocol/src/protocol/common.rs:1805]

## Overview 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `Initialize` | `initialize` | `v1::InitializeParams` | `v1::InitializeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:475][E: codex-rs/app-server-protocol/src/protocol/common.rs:476][E: codex-rs/app-server-protocol/src/protocol/common.rs:478] |
| `GetConversationSummary` | `getConversationSummary` | `v1::GetConversationSummaryParams` | `v1::GetConversationSummaryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1218][E: codex-rs/app-server-protocol/src/protocol/common.rs:1219][E: codex-rs/app-server-protocol/src/protocol/common.rs:1221] |
| `GitDiffToRemote` | `gitDiffToRemote` | `v1::GitDiffToRemoteParams` | `v1::GitDiffToRemoteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1223][E: codex-rs/app-server-protocol/src/protocol/common.rs:1224][E: codex-rs/app-server-protocol/src/protocol/common.rs:1226] |
| `GetAuthStatus` | `getAuthStatus` | `v1::GetAuthStatusParams` | `v1::GetAuthStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1229][E: codex-rs/app-server-protocol/src/protocol/common.rs:1230][E: codex-rs/app-server-protocol/src/protocol/common.rs:1232] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v1.rs`
- `codex-rs/app-server-protocol/src/rpc.rs`
- `codex-rs/app-server-protocol/src/lib.rs`
- `codex-rs/app-server-protocol/src/precomputed_exports.rs`
- `codex-rs/app-server-protocol/src/experimental_api.rs`
- `codex-rs/app-server-transport/src/transport/mod.rs`
- `codex-rs/app-server/src/transport.rs`

## 相关

- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.fs-command-methods` -> [fs 与 command 方法](fs-command-methods.md)
- `rpc.config-account-methods` -> [config/account/model 方法](config-account-methods.md)
- `rpc.mcp-skills-plugin-methods` -> [mcp/skills/plugin 方法](mcp-skills-plugin-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
