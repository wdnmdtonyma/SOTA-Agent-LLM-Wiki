---
id: rpc.server-requests
title: server->client requests
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/item.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/attestation.rs, codex-rs/app-server-protocol/src/protocol/v2/permissions.rs, codex-rs/app-server-protocol/src/protocol/v1.rs]
symbols: [ServerRequest, ServerResponse, ServerRequestPayload, CommandExecutionRequestApprovalParams, FileChangeRequestApprovalParams, ToolRequestUserInputParams, McpServerElicitationRequestParams, PermissionsRequestApprovalParams, DynamicToolCallParams, ChatgptAuthTokensRefreshParams, AttestationGenerateParams]
related: [rpc.overview, rpc.notifications-system, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.approval-policy]
evidence: explicit
status: verified
updated: 5670360009
---

> server->client requests 是 app-server 在 turn/tool/approval/auth 场景中反向向客户端发出的 typed request catalog，客户端必须返回对应 `ServerResponse`。

## 能回答的问题

- 当前 server->client request 有哪些 wire method？
- 每个 request 的 params 和 response type 是什么？
- deprecated v1 approval requests 是否仍在协议中？
- server request resolved notification 如何和 request catalog 关联？

## 共性机制

`server_request_definitions!` 生成 `ServerRequest`、`ServerResponse` 和 `ServerRequestPayload`；`ServerRequestPayload::request_with_id` 把 payload 和 `RequestId` 组合成可发送 request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1184][E: codex-rs/app-server-protocol/src/protocol/common.rs:1198][E: codex-rs/app-server-protocol/src/protocol/common.rs:1238][E: codex-rs/app-server-protocol/src/protocol/common.rs:1272][E: codex-rs/app-server-protocol/src/protocol/common.rs:1276]

当前宏实例含 10 个 server request，其中 8 个显式 v2 wire method 和 2 个 deprecated v1 camelCase approval request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1422][E: codex-rs/app-server-protocol/src/protocol/common.rs:1473][E: codex-rs/app-server-protocol/src/protocol/common.rs:1476][E: codex-rs/app-server-protocol/src/protocol/common.rs:1482]

## Request catalog

| Variant | Wire method | Params type | Response type | Evidence |
|---|---|---|---|---|
| `CommandExecutionRequestApproval` | `item/commandExecution/requestApproval` | `v2::CommandExecutionRequestApprovalParams` | `v2::CommandExecutionRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1426][E: codex-rs/app-server-protocol/src/protocol/common.rs:1427][E: codex-rs/app-server-protocol/src/protocol/common.rs:1428] |
| `FileChangeRequestApproval` | `item/fileChange/requestApproval` | `v2::FileChangeRequestApprovalParams` | `v2::FileChangeRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1433][E: codex-rs/app-server-protocol/src/protocol/common.rs:1434][E: codex-rs/app-server-protocol/src/protocol/common.rs:1435] |
| `ToolRequestUserInput` | `item/tool/requestUserInput` | `v2::ToolRequestUserInputParams` | `v2::ToolRequestUserInputResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1439][E: codex-rs/app-server-protocol/src/protocol/common.rs:1440][E: codex-rs/app-server-protocol/src/protocol/common.rs:1441] |
| `McpServerElicitationRequest` | `mcpServer/elicitation/request` | `v2::McpServerElicitationRequestParams` | `v2::McpServerElicitationRequestResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1445][E: codex-rs/app-server-protocol/src/protocol/common.rs:1446][E: codex-rs/app-server-protocol/src/protocol/common.rs:1447] |
| `PermissionsRequestApproval` | `item/permissions/requestApproval` | `v2::PermissionsRequestApprovalParams` | `v2::PermissionsRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1451][E: codex-rs/app-server-protocol/src/protocol/common.rs:1452][E: codex-rs/app-server-protocol/src/protocol/common.rs:1453] |
| `DynamicToolCall` | `item/tool/call` | `v2::DynamicToolCallParams` | `v2::DynamicToolCallResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1457][E: codex-rs/app-server-protocol/src/protocol/common.rs:1458][E: codex-rs/app-server-protocol/src/protocol/common.rs:1459] |
| `ChatgptAuthTokensRefresh` | `account/chatgptAuthTokens/refresh` | `v2::ChatgptAuthTokensRefreshParams` | `v2::ChatgptAuthTokensRefreshResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1462][E: codex-rs/app-server-protocol/src/protocol/common.rs:1463][E: codex-rs/app-server-protocol/src/protocol/common.rs:1464] |
| `AttestationGenerate` | `attestation/generate` | `v2::AttestationGenerateParams` | `v2::AttestationGenerateResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1468][E: codex-rs/app-server-protocol/src/protocol/common.rs:1469][E: codex-rs/app-server-protocol/src/protocol/common.rs:1470] |
| `ApplyPatchApproval` | `applyPatchApproval` | `v1::ApplyPatchApprovalParams` | `v1::ApplyPatchApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1198][E: codex-rs/app-server-protocol/src/protocol/common.rs:1476][E: codex-rs/app-server-protocol/src/protocol/common.rs:1477][E: codex-rs/app-server-protocol/src/protocol/common.rs:1478] |
| `ExecCommandApproval` | `execCommandApproval` | `v1::ExecCommandApprovalParams` | `v1::ExecCommandApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1198][E: codex-rs/app-server-protocol/src/protocol/common.rs:1482][E: codex-rs/app-server-protocol/src/protocol/common.rs:1483][E: codex-rs/app-server-protocol/src/protocol/common.rs:1484] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/item.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/attestation.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/permissions.rs`
- `codex-rs/app-server-protocol/src/protocol/v1.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
