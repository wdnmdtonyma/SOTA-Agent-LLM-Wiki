---
id: rpc.overview
title: App-Server 协议总览
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v1.rs, codex-rs/app-server-protocol/src/jsonrpc_lite.rs, codex-rs/app-server-protocol/src/lib.rs, codex-rs/app-server-protocol/src/experimental_api.rs, codex-rs/app-server-transport/src/transport/mod.rs, codex-rs/app-server/src/transport.rs]
symbols: [ClientRequest, ClientResponse, ServerRequest, ServerResponse, ServerNotification, JSONRPCMessage, JSONRPCRequest, JSONRPCNotification, JSONRPCResponse, JSONRPCError, AppServerTransport]
related: [rpc.thread-methods, rpc.turn-methods, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.notifications-system, rpc.server-requests, subsys.app-server.transport, subsys.app-server.message-processor]
evidence: explicit
status: verified
updated: 5670360009
---

> App-Server protocol 是 Codex 面向客户端连接的 typed JSON-RPC-like 控制面：客户端发 `ClientRequest`，服务器回 `ClientResponse`、推 `ServerNotification`，必要时服务器反向发 `ServerRequest` 等客户端响应。

## 能回答的问题

- App-Server protocol 的 wire envelope 长什么样？
- `ClientRequest`、`ClientResponse`、`ServerRequest`、`ServerResponse`、`ServerNotification` 分别由哪个宏生成？
- 当前 RPC catalog 的 client request、server notification、server request 计数是多少？
- app-server 当前支持哪些 transport listen URL？
- initialize 和 deprecated v1 方法还留在哪个命名空间？

## 协议形态

`jsonrpc_lite.rs` 明确说明 app-server 不发送也不期待 `jsonrpc: "2.0"` 字段，因此这是 JSON-RPC-like envelope，而不是完整 JSON-RPC 2.0；同一文件仍定义 `RequestId`、`JSONRPCMessage`、request、notification、response 和 error 结构。[E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:1][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:11][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:17][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:37][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:46][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:60][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:69][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:76]

`ClientRequest` 使用 serde tag `method` 和 camelCase 默认命名，显式 wire name 通过 `#[serde(rename = ...)]` 写入变体；`ClientResponse` 也按 `method` tagged enum 建模。[E: codex-rs/app-server-protocol/src/protocol/common.rs:209][E: codex-rs/app-server-protocol/src/protocol/common.rs:208][E: codex-rs/app-server-protocol/src/protocol/common.rs:212][E: codex-rs/app-server-protocol/src/protocol/common.rs:259][E: codex-rs/app-server-protocol/src/protocol/common.rs:258] `server_request_definitions!` 生成 server-to-client request/response/payload helper；`server_notification_definitions!` 生成 server-to-client notification enum。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1184][E: codex-rs/app-server-protocol/src/protocol/common.rs:1198][E: codex-rs/app-server-protocol/src/protocol/common.rs:1238][E: codex-rs/app-server-protocol/src/protocol/common.rs:1272][E: codex-rs/app-server-protocol/src/protocol/common.rs:1331][E: codex-rs/app-server-protocol/src/protocol/common.rs:1352]

## Experimental 与 transport

`ExperimentalApi` 的约定是返回方法级或字段级 reason；`ExperimentalField` 的 reason 注释约定为 `<method>` 或 `<method>.<field>`。[E: codex-rs/app-server-protocol/src/experimental_api.rs:5][E: codex-rs/app-server-protocol/src/experimental_api.rs:13][E: codex-rs/app-server-protocol/src/experimental_api.rs:19] outbound 发送时，未启用 experimental API 的连接会跳过 experimental notification，并会对 `CommandExecutionRequestApproval` 剥离 experimental fields。[E: codex-rs/app-server/src/transport.rs:98][E: codex-rs/app-server/src/transport.rs:109][E: codex-rs/app-server/src/transport.rs:174][E: codex-rs/app-server/src/transport.rs:182][E: codex-rs/app-server/src/transport.rs:186]

`AppServerTransport` 当前有 `Stdio`、`UnixSocket`、`WebSocket` 和 `Off`；默认 listen URL 是 `stdio://`，解析器接受 `unix://`、`unix://PATH`、`ws://IP:PORT` 和 `off`。[E: codex-rs/app-server-transport/src/transport/mod.rs:73][E: codex-rs/app-server-transport/src/transport/mod.rs:112][E: codex-rs/app-server-transport/src/transport/mod.rs:114][E: codex-rs/app-server-transport/src/transport/mod.rs:119][E: codex-rs/app-server-transport/src/transport/mod.rs:144][E: codex-rs/app-server-transport/src/transport/mod.rs:148]

## Catalog 计数

当前 `common.rs` 中三组宏实例清点为 123 个 `ClientRequest`、68 个 `ServerNotification`、10 个 `ServerRequest`；这个计数来自 `client_request_definitions!`、`server_notification_definitions!`、`server_request_definitions!` 三个宏调用的逐项解析。[E: codex-rs/app-server-protocol/src/protocol/common.rs:466][E: codex-rs/app-server-protocol/src/protocol/common.rs:1422][E: codex-rs/app-server-protocol/src/protocol/common.rs:1570]

## Overview 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `Initialize` | `initialize` | `v1::InitializeParams` | `v1::InitializeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:209][E: codex-rs/app-server-protocol/src/protocol/common.rs:467][E: codex-rs/app-server-protocol/src/protocol/common.rs:468][E: codex-rs/app-server-protocol/src/protocol/common.rs:470] |
| `GetConversationSummary` | `getConversationSummary` | `v1::GetConversationSummaryParams` | `v1::GetConversationSummaryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:209][E: codex-rs/app-server-protocol/src/protocol/common.rs:1137][E: codex-rs/app-server-protocol/src/protocol/common.rs:1138][E: codex-rs/app-server-protocol/src/protocol/common.rs:1140] |
| `GitDiffToRemote` | `gitDiffToRemote` | `v1::GitDiffToRemoteParams` | `v1::GitDiffToRemoteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:209][E: codex-rs/app-server-protocol/src/protocol/common.rs:1142][E: codex-rs/app-server-protocol/src/protocol/common.rs:1143][E: codex-rs/app-server-protocol/src/protocol/common.rs:1145] |
| `GetAuthStatus` | `getAuthStatus` | `v1::GetAuthStatusParams` | `v1::GetAuthStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:209][E: codex-rs/app-server-protocol/src/protocol/common.rs:1148][E: codex-rs/app-server-protocol/src/protocol/common.rs:1149][E: codex-rs/app-server-protocol/src/protocol/common.rs:1151] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v1.rs`
- `codex-rs/app-server-protocol/src/jsonrpc_lite.rs`
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
