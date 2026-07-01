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
updated: db887d03e1
---

> server->client requests 是 app-server 在 turn/tool/approval/auth 场景中反向向客户端发出的 typed request catalog，客户端必须返回对应 `ServerResponse`。

## 能回答的问题

- 当前 server->client request 有哪些 wire method？
- 每个 request 的 params 和 response type 是什么？
- deprecated v1 approval requests 是否仍在协议中？
- server request resolved notification 如何和 request catalog 关联？

## 共性机制

`server_request_definitions!` 生成 `ServerRequest`、`ServerResponse` 和 `ServerRequestPayload`；`ServerRequestPayload::request_with_id` 把 payload 和 `RequestId` 组合成可发送 request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1197][E: codex-rs/app-server-protocol/src/protocol/common.rs:1212][E: codex-rs/app-server-protocol/src/protocol/common.rs:1252][E: codex-rs/app-server-protocol/src/protocol/common.rs:1286][E: codex-rs/app-server-protocol/src/protocol/common.rs:1291]

当前宏实例含 11 个 server request，其中 9 个显式 v2 wire method 和 2 个 deprecated v1 camelCase approval request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1452][E: codex-rs/app-server-protocol/src/protocol/common.rs:1505][E: codex-rs/app-server-protocol/src/protocol/common.rs:1513][E: codex-rs/app-server-protocol/src/protocol/common.rs:1519]

## Request catalog

| Variant | Wire method | Params type | Response type | Evidence |
|---|---|---|---|---|
| `CommandExecutionRequestApproval` | `item/commandExecution/requestApproval` | `v2::CommandExecutionRequestApprovalParams` | `v2::CommandExecutionRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1456][E: codex-rs/app-server-protocol/src/protocol/common.rs:1457][E: codex-rs/app-server-protocol/src/protocol/common.rs:1458] |
| `FileChangeRequestApproval` | `item/fileChange/requestApproval` | `v2::FileChangeRequestApprovalParams` | `v2::FileChangeRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1463][E: codex-rs/app-server-protocol/src/protocol/common.rs:1464][E: codex-rs/app-server-protocol/src/protocol/common.rs:1465] |
| `ToolRequestUserInput` | `item/tool/requestUserInput` | `v2::ToolRequestUserInputParams` | `v2::ToolRequestUserInputResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1469][E: codex-rs/app-server-protocol/src/protocol/common.rs:1470][E: codex-rs/app-server-protocol/src/protocol/common.rs:1471] |
| `McpServerElicitationRequest` | `mcpServer/elicitation/request` | `v2::McpServerElicitationRequestParams` | `v2::McpServerElicitationRequestResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1475][E: codex-rs/app-server-protocol/src/protocol/common.rs:1476][E: codex-rs/app-server-protocol/src/protocol/common.rs:1477] |
| `PermissionsRequestApproval` | `item/permissions/requestApproval` | `v2::PermissionsRequestApprovalParams` | `v2::PermissionsRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1481][E: codex-rs/app-server-protocol/src/protocol/common.rs:1482][E: codex-rs/app-server-protocol/src/protocol/common.rs:1483] |
| `DynamicToolCall` | `item/tool/call` | `v2::DynamicToolCallParams` | `v2::DynamicToolCallResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1487][E: codex-rs/app-server-protocol/src/protocol/common.rs:1488][E: codex-rs/app-server-protocol/src/protocol/common.rs:1489] |
| `ChatgptAuthTokensRefresh` | `account/chatgptAuthTokens/refresh` | `v2::ChatgptAuthTokensRefreshParams` | `v2::ChatgptAuthTokensRefreshResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1492][E: codex-rs/app-server-protocol/src/protocol/common.rs:1493][E: codex-rs/app-server-protocol/src/protocol/common.rs:1494] |
| `AttestationGenerate` | `attestation/generate` | `v2::AttestationGenerateParams` | `v2::AttestationGenerateResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1498][E: codex-rs/app-server-protocol/src/protocol/common.rs:1499][E: codex-rs/app-server-protocol/src/protocol/common.rs:1500] |
| `CurrentTimeRead` | `currentTime/read` | `v2::CurrentTimeReadParams` | `v2::CurrentTimeReadResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1505][E: codex-rs/app-server-protocol/src/protocol/common.rs:1506][E: codex-rs/app-server-protocol/src/protocol/common.rs:1507][E: codex-rs/app-server-protocol/src/protocol/v2/current_time.rs:9][E: codex-rs/app-server-protocol/src/protocol/v2/current_time.rs:16] |
| `ApplyPatchApproval` | `applyPatchApproval` | `v1::ApplyPatchApprovalParams` | `v1::ApplyPatchApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1211][E: codex-rs/app-server-protocol/src/protocol/common.rs:1513][E: codex-rs/app-server-protocol/src/protocol/common.rs:1514][E: codex-rs/app-server-protocol/src/protocol/common.rs:1515] |
| `ExecCommandApproval` | `execCommandApproval` | `v1::ExecCommandApprovalParams` | `v1::ExecCommandApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1211][E: codex-rs/app-server-protocol/src/protocol/common.rs:1519][E: codex-rs/app-server-protocol/src/protocol/common.rs:1520][E: codex-rs/app-server-protocol/src/protocol/common.rs:1521] |

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
