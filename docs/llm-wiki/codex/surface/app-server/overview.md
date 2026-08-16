---
id: rpc.overview
title: App-Server 协议总览
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v1.rs, codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs, codex-rs/app-server-protocol/src/rpc.rs, codex-rs/app-server-protocol/src/lib.rs, codex-rs/app-server-protocol/src/precomputed_exports.rs, codex-rs/app-server-protocol/src/experimental_api.rs, codex-rs/app-server-transport/src/transport/mod.rs, codex-rs/app-server/src/transport.rs, codex-rs/app-server/src/request_processors/diagnostics.rs]
symbols: [ClientRequest, ClientResponse, ServerRequest, ServerResponse, ServerNotification, ServerNotificationEnvelope, JSONRPCMessage, JSONRPCRequest, JSONRPCNotification, JSONRPCResponse, JSONRPCError, GenerateTsOptions, AppServerTransport, rpc.overview::ServerDiagnostics]
related: [rpc.thread-methods, rpc.turn-methods, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.notifications-system, rpc.server-requests, subsys.app-server.transport, subsys.app-server.message-processor, subsys.platform.diagnostics]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> App-Server protocol 是 Codex 面向客户端连接的 typed JSON-RPC-like 控制面：客户端发 `ClientRequest`，服务器回 `ClientResponse`、推 `ServerNotification`，必要时服务器反向发 `ServerRequest` 等客户端响应。

## 能回答的问题

- App-Server protocol 的 wire envelope 长什么样？
- `ClientRequest`、`ClientResponse`、`ServerRequest`、`ServerResponse`、`ServerNotification` 分别由哪个宏生成？
- 当前 RPC catalog 的 client request、server notification、server request 计数是多少？
- app-server 当前支持哪些 transport listen URL？
- initialize、`server/diagnostics` 和 deprecated v1 方法还留在哪个命名空间？

## 协议形态

`rpc.rs` 定义 `JSONRPC_VERSION` 常量，但 `JSONRPCRequest`、`JSONRPCNotification`、`JSONRPCResponse` 和 `JSONRPCError` 的序列化字段只覆盖 id/method/params/trace/result/error 等 envelope 字段，因此本文把 app-server wire envelope 称为 JSON-RPC-like，而不是完整 JSON-RPC 2.0。[E: codex-rs/app-server-protocol/src/rpc.rs:11][E: codex-rs/app-server-protocol/src/rpc.rs:47][E: codex-rs/app-server-protocol/src/rpc.rs:48][E: codex-rs/app-server-protocol/src/rpc.rs:51][E: codex-rs/app-server-protocol/src/rpc.rs:55][E: codex-rs/app-server-protocol/src/rpc.rs:61][E: codex-rs/app-server-protocol/src/rpc.rs:64][E: codex-rs/app-server-protocol/src/rpc.rs:70][E: codex-rs/app-server-protocol/src/rpc.rs:71][E: codex-rs/app-server-protocol/src/rpc.rs:77][E: codex-rs/app-server-protocol/src/rpc.rs:78][I] 同一文件仍定义 `RequestId` 和 `JSONRPCMessage`。[E: codex-rs/app-server-protocol/src/rpc.rs:17][E: codex-rs/app-server-protocol/src/rpc.rs:37]

`ClientRequest` 使用 serde tag `method` 建模；request-definition macro 要求每个 variant 都显式声明 wire string，`ClientResponse` 也按 `method` tagged enum 建模。[E: codex-rs/app-server-protocol/src/protocol/common.rs:203][E: codex-rs/app-server-protocol/src/protocol/common.rs:219][E: codex-rs/app-server-protocol/src/protocol/common.rs:284] `server_request_definitions!` 生成 server-to-client request/response/payload helper；`server_notification_definitions!` 生成 server-to-client notification enum。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1328][E: codex-rs/app-server-protocol/src/protocol/common.rs:1343][E: codex-rs/app-server-protocol/src/protocol/common.rs:1499][E: codex-rs/app-server-protocol/src/protocol/common.rs:1520]

## Experimental 与 transport

`ExperimentalApi` 的约定是返回方法级或字段级 reason；`ExperimentalField` 的 reason 注释约定为 `<method>` 或 `<method>.<field>`。[E: codex-rs/app-server-protocol/src/experimental_api.rs:5][E: codex-rs/app-server-protocol/src/experimental_api.rs:13][E: codex-rs/app-server-protocol/src/experimental_api.rs:19] outbound 发送时，未启用 experimental API 的连接会跳过 experimental notification，并会对 `CommandExecutionRequestApproval` 剥离 experimental fields。[E: codex-rs/app-server/src/transport.rs:100][E: codex-rs/app-server/src/transport.rs:111][E: codex-rs/app-server/src/transport.rs:176][E: codex-rs/app-server/src/transport.rs:184][E: codex-rs/app-server/src/transport.rs:188]

`AppServerTransport` 当前有 `Stdio`、`UnixSocket`、`WebSocket` 和 `Off`；默认 listen URL 是 `stdio://`，解析器接受 `unix://`、`unix://PATH`、`ws://IP:PORT` 和 `off`。[E: codex-rs/app-server-transport/src/transport/mod.rs:75][E: codex-rs/app-server-transport/src/transport/mod.rs:114][E: codex-rs/app-server-transport/src/transport/mod.rs:116][E: codex-rs/app-server-transport/src/transport/mod.rs:121][E: codex-rs/app-server-transport/src/transport/mod.rs:146][E: codex-rs/app-server-transport/src/transport/mod.rs:150]

## Catalog 计数

目标 `common.rs` 三组宏实例清点为 **144** 个 `ClientRequest`、**74** 个 `ServerNotification`、**11** 个 `ServerRequest`，合计 **229** 个 RPC 实例。旧 wiki 的 `219 = 136+72+11` 已过时。每个 `ClientRequest` variant 都显式声明 wire string，包括 `initialize`、`server/diagnostics` 与 deprecated v1 methods。[E: codex-rs/app-server-protocol/src/protocol/common.rs:487][E: codex-rs/app-server-protocol/src/protocol/common.rs:488][E: codex-rs/app-server-protocol/src/protocol/common.rs:496][E: codex-rs/app-server-protocol/src/protocol/common.rs:1317] 74 个 notification 中 73 个用 `Variant => "wire" (Type)`，`AccountLoginCompleted` 用 serde/TS/strum rename 固定为 `account/login/completed`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1747][E: codex-rs/app-server-protocol/src/protocol/common.rs:1749][E: codex-rs/app-server-protocol/src/protocol/common.rs:1849][E: codex-rs/app-server-protocol/src/protocol/common.rs:1852] `ServerRequest` 是 9 个显式 v2 wire 加 2 个 legacy camelCase approval variants。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1592][E: codex-rs/app-server-protocol/src/protocol/common.rs:1653][E: codex-rs/app-server-protocol/src/protocol/common.rs:1659]

相对旧 136/72/11 catalog，本轮 client request 至少新增 `server/diagnostics`、`thread/queue/{add,list,update,delete,reorder,start}`、`thread/settings/update`、`thread/rollback`、`thread/revert`、`thread/approveGuardianDeniedAction`；notification 至少新增 `thread/reverted`、`thread/queue/changed`、`thread/settings/updated`。queue / rollback / revert / approveGuardian 的完整字段在 thread catalog；`account/usage/read` 的 params/response 在 config/account catalog。[E: codex-rs/app-server-protocol/src/protocol/common.rs:496][E: codex-rs/app-server-protocol/src/protocol/common.rs:578][E: codex-rs/app-server-protocol/src/protocol/common.rs:624][E: codex-rs/app-server-protocol/src/protocol/common.rs:657][E: codex-rs/app-server-protocol/src/protocol/common.rs:680][E: codex-rs/app-server-protocol/src/protocol/common.rs:686][E: codex-rs/app-server-protocol/src/protocol/common.rs:1152]

协议导出不再在普通构建中运行 reflection exporter：`precomputed_exports.rs` 内嵌 stable/experimental 两套 zstd JSON archive，`generate_ts`/`generate_json` 解压后写文件；reflection 与 schema-fixture 模块只在测试构建启用，non-test derive 使用 noop macros。[E: codex-rs/app-server-protocol/src/precomputed_exports.rs:15][E: codex-rs/app-server-protocol/src/precomputed_exports.rs:62][E: codex-rs/app-server-protocol/src/lib.rs:1][E: codex-rs/app-server-protocol/src/lib.rs:64]

`ServerNotificationEnvelope` flatten `ServerNotification` 并附带 optional `emittedAtMs`，使旧客户端仍可 decode 没有时间戳的通知，而当前 app-server 会在 fan-out 前记录 emission time。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1860][E: codex-rs/app-server-protocol/src/protocol/common.rs:1862][E: codex-rs/app-server-protocol/src/protocol/common.rs:1872]

## Overview 方法 catalog

本节点只收 initialize、process-local diagnostics 与仍留在协议里的 deprecated v1 methods。thread/turn/fs/config/mcp families 分别在对应 catalog。

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `Initialize` | `initialize` | `v1::InitializeParams` | `v1::InitializeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:488][E: codex-rs/app-server-protocol/src/protocol/common.rs:489][E: codex-rs/app-server-protocol/src/protocol/common.rs:491] |
| `ServerDiagnostics` | `server/diagnostics` | `v2::ServerDiagnosticsParams` | `v2::ServerDiagnosticsResponse` | experimental: server/diagnostics | [E: codex-rs/app-server-protocol/src/protocol/common.rs:494][E: codex-rs/app-server-protocol/src/protocol/common.rs:496][E: codex-rs/app-server-protocol/src/protocol/common.rs:497][E: codex-rs/app-server-protocol/src/protocol/common.rs:499] |
| `GetConversationSummary` | `getConversationSummary` | `v1::GetConversationSummaryParams` | `v1::GetConversationSummaryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1281][E: codex-rs/app-server-protocol/src/protocol/common.rs:1282][E: codex-rs/app-server-protocol/src/protocol/common.rs:1284] |
| `GitDiffToRemote` | `gitDiffToRemote` | `v1::GitDiffToRemoteParams` | `v1::GitDiffToRemoteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1286][E: codex-rs/app-server-protocol/src/protocol/common.rs:1287][E: codex-rs/app-server-protocol/src/protocol/common.rs:1289] |
| `GetAuthStatus` | `getAuthStatus` | `v1::GetAuthStatusParams` | `v1::GetAuthStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1292][E: codex-rs/app-server-protocol/src/protocol/common.rs:1293][E: codex-rs/app-server-protocol/src/protocol/common.rs:1295] |

`server/diagnostics` 是 content-free、process-local 快照：params 为空 struct，response 含 `process.id`、optional RSS/physical footprint，以及 named gauges。app-server dispatcher 直接调用 `read_server_diagnostics()`，后者读 `codex_diagnostics::snapshot()`，不经过 thread/account processors。[E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:9][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:14][E: codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs:22][E: codex-rs/app-server/src/request_processors/diagnostics.rs:5][E: codex-rs/app-server/src/request_processors/diagnostics.rs:6][E: codex-rs/app-server/src/message_processor.rs:921]

`thread/approveGuardianDeniedAction` 是稳定 client request，但属于 thread catalog，不在本表。[E: codex-rs/app-server-protocol/src/protocol/common.rs:657]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v1.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/diagnostics.rs`
- `codex-rs/app-server-protocol/src/rpc.rs`
- `codex-rs/app-server-protocol/src/lib.rs`
- `codex-rs/app-server-protocol/src/precomputed_exports.rs`
- `codex-rs/app-server-protocol/src/experimental_api.rs`
- `codex-rs/app-server-transport/src/transport/mod.rs`
- `codex-rs/app-server/src/transport.rs`
- `codex-rs/app-server/src/request_processors/diagnostics.rs`

## 相关

- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.fs-command-methods` -> [fs 与 command 方法](fs-command-methods.md)
- `rpc.config-account-methods` -> [config/account/model 方法](config-account-methods.md)
- `rpc.mcp-skills-plugin-methods` -> [mcp/skills/plugin 方法](mcp-skills-plugin-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
- `subsys.app-server.transport`
- `subsys.app-server.message-processor`
- `subsys.platform.diagnostics`
