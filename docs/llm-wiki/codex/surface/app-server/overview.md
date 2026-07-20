---
id: rpc.overview
title: App-Server 协议总览
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v1.rs, codex-rs/app-server-protocol/src/rpc.rs, codex-rs/app-server-protocol/src/lib.rs, codex-rs/app-server-protocol/src/experimental_api.rs, codex-rs/app-server-transport/src/transport/mod.rs, codex-rs/app-server/src/transport.rs]
symbols: [ClientRequest, ClientResponse, ServerRequest, ServerResponse, ServerNotification, ServerNotificationEnvelope, JSONRPCMessage, JSONRPCRequest, JSONRPCNotification, JSONRPCResponse, JSONRPCError, AppServerTransport]
related: [rpc.thread-methods, rpc.turn-methods, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.notifications-system, rpc.server-requests, subsys.app-server.transport, subsys.app-server.message-processor]
evidence: explicit
status: verified
updated: 4d7a5c7c73
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

`ClientRequest` 使用 serde tag `method` 和 camelCase 默认命名，显式 wire name 通过 `#[serde(rename = ...)]` 写入变体；`ClientResponse` 也按 `method` tagged enum 建模。[E: codex-rs/app-server-protocol/src/protocol/common.rs:215][E: codex-rs/app-server-protocol/src/protocol/common.rs:214][E: codex-rs/app-server-protocol/src/protocol/common.rs:218][E: codex-rs/app-server-protocol/src/protocol/common.rs:265][E: codex-rs/app-server-protocol/src/protocol/common.rs:264] `server_request_definitions!` 生成 server-to-client request/response/payload helper；`server_notification_definitions!` 生成 server-to-client notification enum。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1227][E: codex-rs/app-server-protocol/src/protocol/common.rs:1242][E: codex-rs/app-server-protocol/src/protocol/common.rs:1268][E: codex-rs/app-server-protocol/src/protocol/common.rs:1282][E: codex-rs/app-server-protocol/src/protocol/common.rs:1316][E: codex-rs/app-server-protocol/src/protocol/common.rs:1391][E: codex-rs/app-server-protocol/src/protocol/common.rs:1412]

## Experimental 与 transport

`ExperimentalApi` 的约定是返回方法级或字段级 reason；`ExperimentalField` 的 reason 注释约定为 `<method>` 或 `<method>.<field>`。[E: codex-rs/app-server-protocol/src/experimental_api.rs:5][E: codex-rs/app-server-protocol/src/experimental_api.rs:13][E: codex-rs/app-server-protocol/src/experimental_api.rs:19] outbound 发送时，未启用 experimental API 的连接会跳过 experimental notification，并会对 `CommandExecutionRequestApproval` 剥离 experimental fields。[E: codex-rs/app-server/src/transport.rs:98][E: codex-rs/app-server/src/transport.rs:109][E: codex-rs/app-server/src/transport.rs:174][E: codex-rs/app-server/src/transport.rs:182][E: codex-rs/app-server/src/transport.rs:186]

`AppServerTransport` 当前有 `Stdio`、`UnixSocket`、`WebSocket` 和 `Off`；默认 listen URL 是 `stdio://`，解析器接受 `unix://`、`unix://PATH`、`ws://IP:PORT` 和 `off`。[E: codex-rs/app-server-transport/src/transport/mod.rs:73][E: codex-rs/app-server-transport/src/transport/mod.rs:112][E: codex-rs/app-server-transport/src/transport/mod.rs:114][E: codex-rs/app-server-transport/src/transport/mod.rs:119][E: codex-rs/app-server-transport/src/transport/mod.rs:144][E: codex-rs/app-server-transport/src/transport/mod.rs:148]

## Catalog 计数

当前 `common.rs` 中三组宏实例清点为 129 个 `ClientRequest`、72 个 `ServerNotification`、11 个 `ServerRequest`；相对基线新增 4 个 client request 与 3 个 server notification，反向 server request 没有新增。计数包含没有显式 wire string、依赖 camelCase 默认名的 legacy variants。[E: codex-rs/app-server-protocol/src/protocol/common.rs:472][E: codex-rs/app-server-protocol/src/protocol/common.rs:1482][E: codex-rs/app-server-protocol/src/protocol/common.rs:1637]

新增 client request 是 `thread/searchOccurrences`、`app/read`、`app/installed`、`environment/status`；新增 server notification 是 `thread/environment/connected`、`thread/environment/disconnected`、`rawResponse/completed`。它们已分别收入 thread、mcp/app、config/environment 与 notification catalogs，不需要另建第十个 RPC 节点。[E: codex-rs/app-server-protocol/src/protocol/common.rs:633][E: codex-rs/app-server-protocol/src/protocol/common.rs:634][E: codex-rs/app-server-protocol/src/protocol/common.rs:745][E: codex-rs/app-server-protocol/src/protocol/common.rs:755][E: codex-rs/app-server-protocol/src/protocol/common.rs:976][E: codex-rs/app-server-protocol/src/protocol/common.rs:978][E: codex-rs/app-server-protocol/src/protocol/common.rs:1650][E: codex-rs/app-server-protocol/src/protocol/common.rs:1653][E: codex-rs/app-server-protocol/src/protocol/common.rs:1670]

目标 HEAD 还新增 `ServerNotificationEnvelope`：它 flatten `ServerNotification` 并附带 optional `emittedAtMs`，使旧客户端仍可 decode 没有时间戳的通知，而当前 app-server 会在 fan-out 前记录 emission time。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1748][E: codex-rs/app-server-protocol/src/protocol/common.rs:1749][E: codex-rs/app-server-protocol/src/protocol/common.rs:1758]

## Overview 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `Initialize` | `initialize` | `v1::InitializeParams` | `v1::InitializeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:473][E: codex-rs/app-server-protocol/src/protocol/common.rs:474][E: codex-rs/app-server-protocol/src/protocol/common.rs:476] |
| `GetConversationSummary` | `getConversationSummary` | `v1::GetConversationSummaryParams` | `v1::GetConversationSummaryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1180][E: codex-rs/app-server-protocol/src/protocol/common.rs:1181][E: codex-rs/app-server-protocol/src/protocol/common.rs:1183] |
| `GitDiffToRemote` | `gitDiffToRemote` | `v1::GitDiffToRemoteParams` | `v1::GitDiffToRemoteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1185][E: codex-rs/app-server-protocol/src/protocol/common.rs:1186][E: codex-rs/app-server-protocol/src/protocol/common.rs:1188] |
| `GetAuthStatus` | `getAuthStatus` | `v1::GetAuthStatusParams` | `v1::GetAuthStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1191][E: codex-rs/app-server-protocol/src/protocol/common.rs:1192][E: codex-rs/app-server-protocol/src/protocol/common.rs:1194] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v1.rs`
- `codex-rs/app-server-protocol/src/rpc.rs`
- `codex-rs/app-server-protocol/src/lib.rs`
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
