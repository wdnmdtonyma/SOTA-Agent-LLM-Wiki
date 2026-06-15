---
id: rpc.server-requests
title: server->client requests
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2.rs]
symbols: [ServerRequest, ServerResponse, CommandExecutionRequestApprovalParams, FileChangeRequestApprovalParams, ToolRequestUserInputParams, McpServerElicitationRequestParams, DynamicToolCallParams]
related: [rpc.overview, rpc.notifications-thread, rpc.notifications-system, rpc.mcp-skills-plugin-methods]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> server->client requests 是 app-server 在 turn 执行中反向要求客户端决策或执行动作的 JSON-RPC request catalog：approval、elicitation、dynamic tool call、token refresh 以及 legacy apply/exec approvals 都走这里。

## 能回答的问题

- 9 个 `ServerRequest` 的 wire method、params type 和 response type 是什么？
- command/file/permissions approval payload 分别包含哪些字段？
- `request_user_input` 和 MCP elicitation 的表单/URL schema 如何表达？
- dynamic tool call 的 request/response 字段是什么？

## Protocol shape

`server_request_definitions!` 生成 `ServerRequest` 和 `ServerResponse`；request enum 带 `request_id`、`params`，response enum 带同一个 `request_id` 和 typed `response`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:649][E: codex-rs/app-server-protocol/src/protocol/common.rs:663][E: codex-rs/app-server-protocol/src/protocol/common.rs:668][E: codex-rs/app-server-protocol/src/protocol/common.rs:669][E: codex-rs/app-server-protocol/src/protocol/common.rs:670][E: codex-rs/app-server-protocol/src/protocol/common.rs:686][E: codex-rs/app-server-protocol/src/protocol/common.rs:691][E: codex-rs/app-server-protocol/src/protocol/common.rs:692][E: codex-rs/app-server-protocol/src/protocol/common.rs:693] `ServerRequestPayload::request_with_id` 先保存 method payload，再补 `RequestId` 生成 outbound server request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:720][E: codex-rs/app-server-protocol/src/protocol/common.rs:725][E: codex-rs/app-server-protocol/src/protocol/common.rs:727]

`CommandExecutionRequestApprovalParams` 绑定 thread/turn/item，并可带 approval id、reason、network context、command/cwd/actions、additional permissions、execpolicy/network policy amendments 和 available decisions；其中 `additional_permissions` 与 `available_decisions` 被标为 experimental 字段。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:6376][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6377][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6378][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6388][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6392][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6396][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6400][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6404][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6408][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6410][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6413][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6417][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6421][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6423][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6426]

MCP elicitation request params 绑定 thread、optional turn、server name，并 flatten `McpServerElicitationRequest`；该 request enum 用 `mode` discriminator，且有 `Form` 和 `Url` 两种 mode，response 使用 action、optional content 和 `_meta`。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:6511][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6518][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6519][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6520][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6521][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6845][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6848][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6851][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6860][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6903][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6907][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6909][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6911]

`ToolRequestUserInputParams` 包含 thread/turn/item 和 questions；question 有 id/header/question、`is_other`、`is_secret` 和 optional options，response 的 `answers` 是 question id 到 `ToolRequestUserInputAnswer` 的 map，每个 answer object 内部再含 answer list。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:7036][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7037][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7038][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7039][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7021][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7022][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7023][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7025][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7027][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7028][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7046][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7047][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7055]

## Request catalog

| Variant | Wire method | Params type | Response type | 说明 | Evidence |
|---|---|---|---|---|---|
| `CommandExecutionRequestApproval` | `item/commandExecution/requestApproval` | `v2::CommandExecutionRequestApprovalParams` | `v2::CommandExecutionRequestApprovalResponse` | 请求客户端批准命令执行；response 是 `decision`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:874][E: codex-rs/app-server-protocol/src/protocol/common.rs:875][E: codex-rs/app-server-protocol/src/protocol/common.rs:876][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6442] |
| `FileChangeRequestApproval` | `item/fileChange/requestApproval` | `v2::FileChangeRequestApprovalParams` | `v2::FileChangeRequestApprovalResponse` | 请求客户端批准文件改动；params 可带 reason 和 grant_root。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:881][E: codex-rs/app-server-protocol/src/protocol/common.rs:882][E: codex-rs/app-server-protocol/src/protocol/common.rs:883][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6454][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6458] |
| `ToolRequestUserInput` | `item/tool/requestUserInput` | `v2::ToolRequestUserInputParams` | `v2::ToolRequestUserInputResponse` | tool 需要客户端收集用户输入。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:887][E: codex-rs/app-server-protocol/src/protocol/common.rs:888][E: codex-rs/app-server-protocol/src/protocol/common.rs:889][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7035] |
| `McpServerElicitationRequest` | `mcpServer/elicitation/request` | `v2::McpServerElicitationRequestParams` | `v2::McpServerElicitationRequestResponse` | MCP server 发起 elicitation，客户端返回 accept/decline/cancel 和 optional content。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:893][E: codex-rs/app-server-protocol/src/protocol/common.rs:894][E: codex-rs/app-server-protocol/src/protocol/common.rs:895][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6471][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6472][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6473][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6474][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6903][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6907] |
| `PermissionsRequestApproval` | `item/permissions/requestApproval` | `v2::PermissionsRequestApprovalParams` | `v2::PermissionsRequestApprovalResponse` | 请求客户端批准 permission profile，response 返回 granted permissions 和 scope。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:899][E: codex-rs/app-server-protocol/src/protocol/common.rs:900][E: codex-rs/app-server-protocol/src/protocol/common.rs:901][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6969][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6970][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6972] |
| `DynamicToolCall` | `item/tool/call` | `v2::DynamicToolCallParams` | `v2::DynamicToolCallResponse` | 要求客户端执行 dynamic tool call，response 返回 content_items 和 success。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:905][E: codex-rs/app-server-protocol/src/protocol/common.rs:906][E: codex-rs/app-server-protocol/src/protocol/common.rs:907][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6978][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6979][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6980] |
| `ChatgptAuthTokensRefresh` | `account/chatgptAuthTokens/refresh` | `v2::ChatgptAuthTokensRefreshParams` | `v2::ChatgptAuthTokensRefreshResponse` | external `chatgptAuthTokens` 模式下请求客户端刷新 ChatGPT token。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:27][E: codex-rs/app-server-protocol/src/protocol/common.rs:28][E: codex-rs/app-server-protocol/src/protocol/common.rs:29][E: codex-rs/app-server-protocol/src/protocol/common.rs:32][E: codex-rs/app-server-protocol/src/protocol/common.rs:910][E: codex-rs/app-server-protocol/src/protocol/common.rs:911][E: codex-rs/app-server-protocol/src/protocol/common.rs:912][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2005][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2021][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2022][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2023] |
| `ApplyPatchApproval` | `applyPatchApproval` | `v1::ApplyPatchApprovalParams` | `v1::ApplyPatchApprovalResponse` | Deprecated v1 patch approval request；wire name comes from `rename_all = "camelCase"`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:662][E: codex-rs/app-server-protocol/src/protocol/common.rs:915][E: codex-rs/app-server-protocol/src/protocol/common.rs:916][E: codex-rs/app-server-protocol/src/protocol/common.rs:918][E: codex-rs/app-server-protocol/src/protocol/common.rs:919][E: codex-rs/app-server-protocol/src/protocol/common.rs:920] |
| `ExecCommandApproval` | `execCommandApproval` | `v1::ExecCommandApprovalParams` | `v1::ExecCommandApprovalResponse` | Deprecated v1 command approval request；wire name comes from `rename_all = "camelCase"`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:662][E: codex-rs/app-server-protocol/src/protocol/common.rs:915][E: codex-rs/app-server-protocol/src/protocol/common.rs:922][E: codex-rs/app-server-protocol/src/protocol/common.rs:923][E: codex-rs/app-server-protocol/src/protocol/common.rs:924][E: codex-rs/app-server-protocol/src/protocol/common.rs:925][E: codex-rs/app-server-protocol/src/protocol/common.rs:926] |

## 控制流与设计动机

server requests 把“server 需要客户端决策或客户端本地能力”的场景统一成 request/response，而不是 notification；这样 app-server 可以在同一个 turn 中暂停等待 approval、elicitation、user input、dynamic tool output 或 token refresh，再继续执行。[I] legacy v1 approval methods 保留在同一 enum，说明 protocol surface 仍需要兼容旧客户端或旧 approval path。[I]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2.rs`

## 相关

- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
