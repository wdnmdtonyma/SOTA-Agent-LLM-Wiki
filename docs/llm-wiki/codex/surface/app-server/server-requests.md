---
id: rpc.server-requests
title: server->client requests
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/item.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/attestation.rs, codex-rs/app-server-protocol/src/protocol/v2/permissions.rs, codex-rs/app-server-protocol/src/protocol/v2/current_time.rs, codex-rs/app-server-protocol/src/protocol/v1.rs]
symbols: [ServerRequest, ServerResponse, ServerRequestPayload, CommandExecutionRequestApprovalParams, FileChangeRequestApprovalParams, ToolRequestUserInputParams, McpServerElicitationRequestParams, PermissionsRequestApprovalParams, DynamicToolCallParams, ChatgptAuthTokensRefreshParams, AttestationGenerateParams, CurrentTimeReadParams]
related: [rpc.overview, rpc.notifications-system, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.approval-policy]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> server->client requests 是 app-server 在 turn/tool/approval/auth 场景中反向向客户端发出的 typed request catalog，客户端必须返回对应 `ServerResponse`。

## 能回答的问题

- 当前 server->client request 有哪些 wire method？
- 每个 request 的 params 和 response type 是什么？
- deprecated v1 approval requests 是否仍在协议中？
- server request resolved notification 如何和 request catalog 关联？

## 共性机制

`server_request_definitions!` 生成 `ServerRequest`、`ServerResponse` 和 `ServerRequestPayload`；`ServerRequestPayload::request_with_id` 把 payload 和 `RequestId` 组合成可发送 request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1227][E: codex-rs/app-server-protocol/src/protocol/common.rs:1242][E: codex-rs/app-server-protocol/src/protocol/common.rs:1282][E: codex-rs/app-server-protocol/src/protocol/common.rs:1316][E: codex-rs/app-server-protocol/src/protocol/common.rs:1321]

当前宏实例含 11 个 server request，其中 9 个显式 v2 wire method 和 2 个 deprecated v1 camelCase approval request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1482][E: codex-rs/app-server-protocol/src/protocol/common.rs:1535][E: codex-rs/app-server-protocol/src/protocol/common.rs:1543][E: codex-rs/app-server-protocol/src/protocol/common.rs:1549]

本轮 `server_request_definitions!` 没有新增或删除 reverse request；新增面全部落在 4 个 client request 与 3 个 server notification，因此 9+2 的反向请求 catalog 保持完整。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1482][E: codex-rs/app-server-protocol/src/protocol/common.rs:1537][E: codex-rs/app-server-protocol/src/protocol/common.rs:1543][E: codex-rs/app-server-protocol/src/protocol/common.rs:1549]

## Request catalog

| Variant | Wire method | Params type | Response type | Evidence |
|---|---|---|---|---|
| `CommandExecutionRequestApproval` | `item/commandExecution/requestApproval` | `v2::CommandExecutionRequestApprovalParams` | `v2::CommandExecutionRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1486][E: codex-rs/app-server-protocol/src/protocol/common.rs:1487][E: codex-rs/app-server-protocol/src/protocol/common.rs:1488] |
| `FileChangeRequestApproval` | `item/fileChange/requestApproval` | `v2::FileChangeRequestApprovalParams` | `v2::FileChangeRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1493][E: codex-rs/app-server-protocol/src/protocol/common.rs:1494][E: codex-rs/app-server-protocol/src/protocol/common.rs:1495] |
| `ToolRequestUserInput` | `item/tool/requestUserInput` | `v2::ToolRequestUserInputParams` | `v2::ToolRequestUserInputResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1499][E: codex-rs/app-server-protocol/src/protocol/common.rs:1500][E: codex-rs/app-server-protocol/src/protocol/common.rs:1501] |
| `McpServerElicitationRequest` | `mcpServer/elicitation/request` | `v2::McpServerElicitationRequestParams` | `v2::McpServerElicitationRequestResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1505][E: codex-rs/app-server-protocol/src/protocol/common.rs:1506][E: codex-rs/app-server-protocol/src/protocol/common.rs:1507] |
| `PermissionsRequestApproval` | `item/permissions/requestApproval` | `v2::PermissionsRequestApprovalParams` | `v2::PermissionsRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1511][E: codex-rs/app-server-protocol/src/protocol/common.rs:1512][E: codex-rs/app-server-protocol/src/protocol/common.rs:1513] |
| `DynamicToolCall` | `item/tool/call` | `v2::DynamicToolCallParams` | `v2::DynamicToolCallResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1517][E: codex-rs/app-server-protocol/src/protocol/common.rs:1518][E: codex-rs/app-server-protocol/src/protocol/common.rs:1519] |
| `ChatgptAuthTokensRefresh` | `account/chatgptAuthTokens/refresh` | `v2::ChatgptAuthTokensRefreshParams` | `v2::ChatgptAuthTokensRefreshResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1522][E: codex-rs/app-server-protocol/src/protocol/common.rs:1523][E: codex-rs/app-server-protocol/src/protocol/common.rs:1524] |
| `AttestationGenerate` | `attestation/generate` | `v2::AttestationGenerateParams` | `v2::AttestationGenerateResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1528][E: codex-rs/app-server-protocol/src/protocol/common.rs:1529][E: codex-rs/app-server-protocol/src/protocol/common.rs:1530] |
| `CurrentTimeRead` | `currentTime/read` | `v2::CurrentTimeReadParams` | `v2::CurrentTimeReadResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1535][E: codex-rs/app-server-protocol/src/protocol/common.rs:1536][E: codex-rs/app-server-protocol/src/protocol/common.rs:1537][E: codex-rs/app-server-protocol/src/protocol/v2/current_time.rs:9][E: codex-rs/app-server-protocol/src/protocol/v2/current_time.rs:16] |
| `ApplyPatchApproval` | `applyPatchApproval` | `v1::ApplyPatchApprovalParams` | `v1::ApplyPatchApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1241][E: codex-rs/app-server-protocol/src/protocol/common.rs:1543][E: codex-rs/app-server-protocol/src/protocol/common.rs:1544][E: codex-rs/app-server-protocol/src/protocol/common.rs:1545] |
| `ExecCommandApproval` | `execCommandApproval` | `v1::ExecCommandApprovalParams` | `v1::ExecCommandApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1241][E: codex-rs/app-server-protocol/src/protocol/common.rs:1549][E: codex-rs/app-server-protocol/src/protocol/common.rs:1550][E: codex-rs/app-server-protocol/src/protocol/common.rs:1551] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/item.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/attestation.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/permissions.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/current_time.rs`
- `codex-rs/app-server-protocol/src/protocol/v1.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
