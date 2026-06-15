---
id: rpc.overview
title: App-Server 协议总览
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/jsonrpc_lite.rs, codex-rs/app-server-protocol/src/lib.rs, codex-rs/app-server-protocol/src/experimental_api.rs, codex-rs/app-server/src/transport/mod.rs]
symbols: [ClientRequest, ClientResponse, ServerRequest, ServerResponse, ServerNotification, JSONRPCMessage, JSONRPCRequest, JSONRPCNotification, JSONRPCResponse, JSONRPCError, AppServerTransport]
related: [rpc.thread-methods, rpc.turn-methods, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.notifications-system, rpc.server-requests, subsys.app-server.transport, subsys.app-server.message-processor]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> App-Server protocol 是 Codex 面向客户端连接的 typed JSON-RPC-like 控制面：客户端发 `ClientRequest`，服务器回 `ClientResponse`、推 `ServerNotification`，必要时服务器反向发 `ServerRequest` 等客户端响应。

## 能回答的问题

- App-Server protocol 的 wire envelope 长什么样？
- App-Server protocol 为什么说是 JSON-RPC-like 而不是真正完整 JSON-RPC 2.0？
- `ClientRequest`、`ClientResponse`、`ServerRequest`、`ServerResponse`、`ServerNotification` 分别覆盖哪类消息？
- app-server 支持哪些 transport？
- 初始化、deprecated v1 方法和 v2 方法如何共存在同一协议命名空间？

## 协议形态

`codex-rs/app-server-protocol/src/jsonrpc_lite.rs` 明确写着 app-server "do not do true JSON-RPC 2.0"，原因是 Codex 既不发送也不期待 `"jsonrpc": "2.0"` 字段；文件仍保留 `JSONRPC_VERSION = "2.0"` 常量和 JSON-RPC 风格的 request/notification/response/error envelope 类型。[E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:1][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:11]

`JSONRPCMessage` 是 untagged union，按 JSON shape 解成 `JSONRPCRequest`、`JSONRPCNotification`、`JSONRPCResponse` 或 `JSONRPCError`。[E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:35][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:37] `JSONRPCRequest` 包含 `id`、`method`、可选 `params` 和可选 W3C trace context；`JSONRPCNotification` 只有 `method` 和可选 `params`；`JSONRPCResponse` 用 `id` 加 `result`；`JSONRPCError` 用 `id` 加 `error`。[E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:46][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:60][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:69][E: codex-rs/app-server-protocol/src/jsonrpc_lite.rs:76]

## Typed protocol enums

`client_request_definitions!` 生成 `ClientRequest` 和 `ClientResponse`，每个 client request variant 都带 `request_id`、`params` 和对应 response type；宏还生成 TypeScript/schema export helper。[E: codex-rs/app-server-protocol/src/protocol/common.rs:76][E: codex-rs/app-server-protocol/src/protocol/common.rs:95][E: codex-rs/app-server-protocol/src/protocol/common.rs:131][E: codex-rs/app-server-protocol/src/protocol/common.rs:196][E: codex-rs/app-server-protocol/src/protocol/common.rs:212][E: codex-rs/app-server-protocol/src/protocol/common.rs:223] `ClientRequest::method()` 和 `ClientResponse::method()` 都通过 serde 序列化后的 `"method"` 字段反查 wire name，所以显式 `=> "thread/start"` 与默认 camelCase 都由同一 serde tag 逻辑决定。[E: codex-rs/app-server-protocol/src/protocol/common.rs:94][E: codex-rs/app-server-protocol/src/protocol/common.rs:115][E: codex-rs/app-server-protocol/src/protocol/common.rs:130][E: codex-rs/app-server-protocol/src/protocol/common.rs:150]

`server_request_definitions!` 生成服务器发给客户端的 `ServerRequest`、客户端回给服务器的 `ServerResponse`，以及 `ServerRequestPayload::request_with_id` 这种先构造 payload 再补 `RequestId` 的 helper。[E: codex-rs/app-server-protocol/src/protocol/common.rs:645][E: codex-rs/app-server-protocol/src/protocol/common.rs:663][E: codex-rs/app-server-protocol/src/protocol/common.rs:686][E: codex-rs/app-server-protocol/src/protocol/common.rs:724][E: codex-rs/app-server-protocol/src/protocol/common.rs:725][E: codex-rs/app-server-protocol/src/protocol/common.rs:727]

`server_notification_definitions!` 生成 `ServerNotification`，serde 使用 `#[serde(tag = "method", content = "params", rename_all = "camelCase")]`，所以 notification envelope 是 `{ "method": "...", "params": ... }`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:777][E: codex-rs/app-server-protocol/src/protocol/common.rs:798][E: codex-rs/app-server-protocol/src/protocol/common.rs:800]

## Experimental gating

`ClientRequest` 实现 `ExperimentalApi`，每个 variant 可以通过 `#[experimental("reason")]` 做方法级门控，或者通过 `inspect_params: true` 调用 params type 的 `experimental_reason()` 做字段级门控。[E: codex-rs/app-server-protocol/src/protocol/common.rs:47][E: codex-rs/app-server-protocol/src/protocol/common.rs:48][E: codex-rs/app-server-protocol/src/protocol/common.rs:163][E: codex-rs/app-server-protocol/src/protocol/common.rs:168][E: codex-rs/app-server-protocol/src/protocol/common.rs:246] `experimental_api::ExperimentalField` 记录 type name、field name 和 reason，reason 的约定是 `<method>` 或 `<method>.<field>`。[E: codex-rs/app-server-protocol/src/experimental_api.rs:11][E: codex-rs/app-server-protocol/src/experimental_api.rs:17]

Transport 层还会在 outbound 方向按连接能力过滤一部分 experimental server request payload：`filter_outgoing_message_for_connection` 对 `CommandExecutionRequestApproval` 调 `strip_experimental_fields()`，且只有 `experimental_api_enabled` 为 false 时剥离字段。[E: codex-rs/app-server/src/transport/mod.rs:346][E: codex-rs/app-server/src/transport/mod.rs:354][E: codex-rs/app-server/src/transport/mod.rs:358]

## Transport

`AppServerTransport` 有 `Stdio`、`WebSocket { bind_address }` 和 `Off` 三种模式；默认 listen URL 是 `stdio://`，`from_listen_url` 还接受 `off` 和 `ws://IP:PORT`。[E: codex-rs/app-server/src/transport/mod.rs:42][E: codex-rs/app-server/src/transport/mod.rs:43][E: codex-rs/app-server/src/transport/mod.rs:44][E: codex-rs/app-server/src/transport/mod.rs:45][E: codex-rs/app-server/src/transport/mod.rs:72][E: codex-rs/app-server/src/transport/mod.rs:74][E: codex-rs/app-server/src/transport/mod.rs:79][E: codex-rs/app-server/src/transport/mod.rs:83] transport 将输入字符串解析成 `JSONRPCMessage` 后送进 `TransportEvent::IncomingMessage`；`transport/mod.rs` 也提供 `serialize_outgoing_message()`，用 `serde_json::to_string` 把 outgoing message 转成 JSON string。[E: codex-rs/app-server/src/transport/mod.rs:202][E: codex-rs/app-server/src/transport/mod.rs:208][E: codex-rs/app-server/src/transport/mod.rs:223][E: codex-rs/app-server/src/transport/mod.rs:260][E: codex-rs/app-server/src/transport/mod.rs:268]

## Client request catalog 本页分工

本批 RPC catalog 总计从 `client_request_definitions!`、`server_notification_definitions!` 和 `server_request_definitions!` 宏实例清点出 87 个 `ClientRequest`、57 个 `ServerNotification`、9 个 `ServerRequest`。[I] 本页只列协议入口和 legacy/handshake 方法；域内方法由相邻 catalog 节点逐实例列出。

| Variant | Wire method | Params type | Response type | 说明 | Evidence |
|---|---|---|---|---|---|
| `Initialize` | `initialize` | `v1::InitializeParams` | `v1::InitializeResponse` | 客户端 hello，返回 v1 initialize response。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:236][E: codex-rs/app-server-protocol/src/protocol/common.rs:237][E: codex-rs/app-server-protocol/src/protocol/common.rs:238] |
| `GetConversationSummary` | `getConversationSummary` | `v1::GetConversationSummaryParams` | `v1::GetConversationSummaryResponse` | Deprecated v1 conversation summary。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:610][E: codex-rs/app-server-protocol/src/protocol/common.rs:611][E: codex-rs/app-server-protocol/src/protocol/common.rs:612][E: codex-rs/app-server-protocol/src/protocol/common.rs:613] |
| `GitDiffToRemote` | `gitDiffToRemote` | `v1::GitDiffToRemoteParams` | `v1::GitDiffToRemoteResponse` | Deprecated v1 git diff helper。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:610][E: codex-rs/app-server-protocol/src/protocol/common.rs:615][E: codex-rs/app-server-protocol/src/protocol/common.rs:616][E: codex-rs/app-server-protocol/src/protocol/common.rs:617] |
| `GetAuthStatus` | `getAuthStatus` | `v1::GetAuthStatusParams` | `v1::GetAuthStatusResponse` | Deprecated；源码注释指定替代方法是 `GetAccount`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:610][E: codex-rs/app-server-protocol/src/protocol/common.rs:619][E: codex-rs/app-server-protocol/src/protocol/common.rs:620][E: codex-rs/app-server-protocol/src/protocol/common.rs:621][E: codex-rs/app-server-protocol/src/protocol/common.rs:622] |

## 设计动机

App-Server protocol 用 Rust enum 维护 typed source of truth，再导出 TS/schema；这样 wire method、Rust handler、SDK generated model 可以共享同一组 params/response 类型。[I] `lib.rs` re-export `protocol::common::*`、`protocol::v2::*` 和 v1 compatibility types，让外部 crate 可以从 `codex_app_server_protocol` 直接拿到 typed protocol surface。[E: codex-rs/app-server-protocol/src/lib.rs:15][E: codex-rs/app-server-protocol/src/lib.rs:16][E: codex-rs/app-server-protocol/src/lib.rs:19][E: codex-rs/app-server-protocol/src/lib.rs:20][E: codex-rs/app-server-protocol/src/lib.rs:24][E: codex-rs/app-server-protocol/src/lib.rs:25][E: codex-rs/app-server-protocol/src/lib.rs:26][E: codex-rs/app-server-protocol/src/lib.rs:27][E: codex-rs/app-server-protocol/src/lib.rs:28][E: codex-rs/app-server-protocol/src/lib.rs:29][E: codex-rs/app-server-protocol/src/lib.rs:30][E: codex-rs/app-server-protocol/src/lib.rs:31][E: codex-rs/app-server-protocol/src/lib.rs:33][E: codex-rs/app-server-protocol/src/lib.rs:34][E: codex-rs/app-server-protocol/src/lib.rs:35][E: codex-rs/app-server-protocol/src/lib.rs:42]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/jsonrpc_lite.rs`
- `codex-rs/app-server-protocol/src/lib.rs`
- `codex-rs/app-server-protocol/src/experimental_api.rs`
- `codex-rs/app-server/src/transport/mod.rs`

## 相关

- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.fs-command-methods` -> [fs 与 command 方法](fs-command-methods.md)
- `rpc.config-account-methods` -> [config/account/model 方法](config-account-methods.md)
- `rpc.mcp-skills-plugin-methods` -> [mcp/skills/plugin 方法](mcp-skills-plugin-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
