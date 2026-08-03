---
id: rpc.server-requests
title: server->client requests
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/item.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/attestation.rs, codex-rs/app-server-protocol/src/protocol/v2/permissions.rs, codex-rs/app-server-protocol/src/protocol/v2/current_time.rs, codex-rs/app-server-protocol/src/protocol/v1.rs]
symbols: [ServerRequestPayload, CommandExecutionRequestApprovalParams, FileChangeRequestApprovalParams, ToolRequestUserInputParams, McpServerElicitationRequestParams, PermissionsRequestApprovalParams, DynamicToolCallParams, ChatgptAuthTokensRefreshParams, AttestationGenerateParams, CurrentTimeReadParams]
related: [rpc.overview, rpc.notifications-system, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.approval-policy]
evidence: explicit
status: verified
updated: 7750465934
---

> server->client requests 是 app-server 在 turn/tool/approval/auth 场景中反向向客户端发出的 typed request catalog，客户端必须返回对应 `ServerResponse`。

## 能回答的问题

- 当前 server->client request 有哪些 wire method？
- 每个 request 的 params 和 response type 是什么？
- deprecated v1 approval requests 是否仍在协议中？
- server request resolved notification 如何和 request catalog 关联？

## 共性机制

`server_request_definitions!` 生成 `ServerRequest`、`ServerResponse` 和 `ServerRequestPayload`；`ServerRequestPayload::request_with_id` 把 payload 和 `RequestId` 组合成可发送 request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1265][E: codex-rs/app-server-protocol/src/protocol/common.rs:1280][E: codex-rs/app-server-protocol/src/protocol/common.rs:1320][E: codex-rs/app-server-protocol/src/protocol/common.rs:1354][E: codex-rs/app-server-protocol/src/protocol/common.rs:1359]

当前宏实例含 11 个 server request，其中 9 个显式 v2 wire method 和 2 个 deprecated v1 camelCase approval request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1529][E: codex-rs/app-server-protocol/src/protocol/common.rs:1582][E: codex-rs/app-server-protocol/src/protocol/common.rs:1590][E: codex-rs/app-server-protocol/src/protocol/common.rs:1596]

两个 legacy v1 approval response 复用 core `ReviewDecision`；其 `denied` wire value 现在带 `{ rejection }` 对象字段，而不是无 payload 的字符串 variant。该变化仅应归因到 legacy v1 approval response，不要误写成 v2 approval response shape。[E: codex-rs/app-server-protocol/src/protocol/v1.rs:146][E: codex-rs/app-server-protocol/src/protocol/v1.rs:169][E: codex-rs/protocol/src/protocol.rs:4120][E: codex-rs/protocol/src/protocol.rs:4143]

本轮 `server_request_definitions!` 没有新增或删除 reverse request，因此 9+2 的反向请求 catalog 保持完整。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1529][E: codex-rs/app-server-protocol/src/protocol/common.rs:1584][E: codex-rs/app-server-protocol/src/protocol/common.rs:1590][E: codex-rs/app-server-protocol/src/protocol/common.rs:1596]

`ToolRequestUserInputParams` 新增显式 `isBlocking`；旧客户端 payload 缺该字段时 deserialize 为 `true`，而 `autoResolutionMs` 已标记 deprecated，只应继续作为兼容字段读取。[E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:1631][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:1636][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:1643][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:1665]

MCP elicitation number schema 的 integer 变体在序列化时会把 integral float 的 minimum/maximum/default 归一成 JSON integer；`McpAuthStatus` 也增加 `Unknown` 兼容值。这些是 payload 变化，不改变 reverse-request 计数。[E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:17][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:347][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:354]

## Request catalog

| Variant | Wire method | Params type | Response type | Evidence |
|---|---|---|---|---|
| `CommandExecutionRequestApproval` | `item/commandExecution/requestApproval` | `v2::CommandExecutionRequestApprovalParams` | `v2::CommandExecutionRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1533][E: codex-rs/app-server-protocol/src/protocol/common.rs:1534][E: codex-rs/app-server-protocol/src/protocol/common.rs:1535] |
| `FileChangeRequestApproval` | `item/fileChange/requestApproval` | `v2::FileChangeRequestApprovalParams` | `v2::FileChangeRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1540][E: codex-rs/app-server-protocol/src/protocol/common.rs:1541][E: codex-rs/app-server-protocol/src/protocol/common.rs:1542] |
| `ToolRequestUserInput` | `item/tool/requestUserInput` | `v2::ToolRequestUserInputParams` | `v2::ToolRequestUserInputResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1546][E: codex-rs/app-server-protocol/src/protocol/common.rs:1547][E: codex-rs/app-server-protocol/src/protocol/common.rs:1548] |
| `McpServerElicitationRequest` | `mcpServer/elicitation/request` | `v2::McpServerElicitationRequestParams` | `v2::McpServerElicitationRequestResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1552][E: codex-rs/app-server-protocol/src/protocol/common.rs:1553][E: codex-rs/app-server-protocol/src/protocol/common.rs:1554] |
| `PermissionsRequestApproval` | `item/permissions/requestApproval` | `v2::PermissionsRequestApprovalParams` | `v2::PermissionsRequestApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1558][E: codex-rs/app-server-protocol/src/protocol/common.rs:1559][E: codex-rs/app-server-protocol/src/protocol/common.rs:1560] |
| `DynamicToolCall` | `item/tool/call` | `v2::DynamicToolCallParams` | `v2::DynamicToolCallResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1564][E: codex-rs/app-server-protocol/src/protocol/common.rs:1565][E: codex-rs/app-server-protocol/src/protocol/common.rs:1566] |
| `ChatgptAuthTokensRefresh` | `account/chatgptAuthTokens/refresh` | `v2::ChatgptAuthTokensRefreshParams` | `v2::ChatgptAuthTokensRefreshResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1569][E: codex-rs/app-server-protocol/src/protocol/common.rs:1570][E: codex-rs/app-server-protocol/src/protocol/common.rs:1571] |
| `AttestationGenerate` | `attestation/generate` | `v2::AttestationGenerateParams` | `v2::AttestationGenerateResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1575][E: codex-rs/app-server-protocol/src/protocol/common.rs:1576][E: codex-rs/app-server-protocol/src/protocol/common.rs:1577] |
| `CurrentTimeRead` | `currentTime/read` | `v2::CurrentTimeReadParams` | `v2::CurrentTimeReadResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1582][E: codex-rs/app-server-protocol/src/protocol/common.rs:1583][E: codex-rs/app-server-protocol/src/protocol/common.rs:1584][E: codex-rs/app-server-protocol/src/protocol/v2/current_time.rs:9][E: codex-rs/app-server-protocol/src/protocol/v2/current_time.rs:16] |
| `ApplyPatchApproval` | `applyPatchApproval` | `v1::ApplyPatchApprovalParams` | `v1::ApplyPatchApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1279][E: codex-rs/app-server-protocol/src/protocol/common.rs:1590][E: codex-rs/app-server-protocol/src/protocol/common.rs:1591][E: codex-rs/app-server-protocol/src/protocol/common.rs:1592] |
| `ExecCommandApproval` | `execCommandApproval` | `v1::ExecCommandApprovalParams` | `v1::ExecCommandApprovalResponse` | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1279][E: codex-rs/app-server-protocol/src/protocol/common.rs:1596][E: codex-rs/app-server-protocol/src/protocol/common.rs:1597][E: codex-rs/app-server-protocol/src/protocol/common.rs:1598] |

`CurrentTimeRead` 是本 catalog 中显式标记为 experimental 的 server request，gate 名为 `currentTime/read`；其余表项不能由此推断为 experimental。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1580][E: codex-rs/app-server-protocol/src/protocol/common.rs:1582]

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
