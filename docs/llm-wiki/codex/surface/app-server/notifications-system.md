---
id: rpc.notifications-system
title: server notifications: system
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/notification.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/fs.rs, codex-rs/app-server-protocol/src/protocol/v2/process.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs]
symbols: [ServerNotification, ErrorNotification, ServerRequestResolvedNotification, AccountUpdatedNotification, McpServerStatusUpdatedNotification, FsChangedNotification, ProcessOutputDeltaNotification, ConfigWarningNotification]
related: [surface.cli.external-agent-import, rpc.overview, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.server-requests]
evidence: explicit
status: verified
updated: 5670360009
---

> system server notifications 是 app-server 推给客户端的 error/warning、server-request resolution、account、MCP、app list、remote control、fs/process/model/config/Windows/fuzzy-search 等非 thread-item 事件 catalog。

## 能回答的问题

- system notification 当前有哪些 wire method？
- account login completion、server request resolution、fs changed、process output delta 分别用哪些 payload？
- 哪些 system notifications 被 experimental gate 保护？
- system notification 与 thread/turn/item notification 如何分工？

## 共性机制

本节点列出不属于 thread/turn/item/hook/rawResponseItem streaming 面的 26 个 `ServerNotification`；它们与 thread catalog 合计覆盖 68 个 server notification 宏实例。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1570]

`AccountLoginCompleted` 在宏调用中通过 serde/TS/strum rename 固定为 `account/login/completed`，不是默认 camelCase wire name。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1661][E: codex-rs/app-server-protocol/src/protocol/common.rs:1662][E: codex-rs/app-server-protocol/src/protocol/common.rs:1663][E: codex-rs/app-server-protocol/src/protocol/common.rs:1664]

## Notification catalog

| Variant | Wire method | Payload type | Gate | Evidence |
|---|---|---|---|---|
| `Error` | `error` | `v2::ErrorNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1572] |
| `SkillsChanged` | `skills/changed` | `v2::SkillsChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1579] |
| `CommandExecOutputDelta` | `command/exec/outputDelta` | `v2::CommandExecOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1602] |
| `ProcessOutputDelta` | `process/outputDelta` | `v2::ProcessOutputDeltaNotification` | experimental: process/outputDelta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1604][E: codex-rs/app-server-protocol/src/protocol/common.rs:1605] |
| `ProcessExited` | `process/exited` | `v2::ProcessExitedNotification` | experimental: process/exited | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1607][E: codex-rs/app-server-protocol/src/protocol/common.rs:1608] |
| `ServerRequestResolved` | `serverRequest/resolved` | `v2::ServerRequestResolvedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1614] |
| `McpServerOauthLoginCompleted` | `mcpServer/oauthLogin/completed` | `v2::McpServerOauthLoginCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1616] |
| `McpServerStatusUpdated` | `mcpServer/startupStatus/updated` | `v2::McpServerStatusUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1617] |
| `AccountUpdated` | `account/updated` | `v2::AccountUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1618] |
| `AccountRateLimitsUpdated` | `account/rateLimits/updated` | `v2::AccountRateLimitsUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1619] |
| `AppListUpdated` | `app/list/updated` | `v2::AppListUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1620] |
| `RemoteControlStatusChanged` | `remoteControl/status/changed` | `v2::RemoteControlStatusChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1621] |
| `ExternalAgentConfigImportProgress` | `externalAgentConfig/import/progress` | `v2::ExternalAgentConfigImportProgressNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1622] |
| `ExternalAgentConfigImportCompleted` | `externalAgentConfig/import/completed` | `v2::ExternalAgentConfigImportCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1623] |
| `FsChanged` | `fs/changed` | `v2::FsChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1624] |
| `ModelRerouted` | `model/rerouted` | `v2::ModelReroutedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1630] |
| `ModelVerification` | `model/verification` | `v2::ModelVerificationNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1631] |
| `Warning` | `warning` | `v2::WarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1634] |
| `GuardianWarning` | `guardianWarning` | `v2::GuardianWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1635] |
| `DeprecationNotice` | `deprecationNotice` | `v2::DeprecationNoticeNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1636] |
| `ConfigWarning` | `configWarning` | `v2::ConfigWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1637] |
| `FuzzyFileSearchSessionUpdated` | `fuzzyFileSearch/sessionUpdated` | `FuzzyFileSearchSessionUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1638] |
| `FuzzyFileSearchSessionCompleted` | `fuzzyFileSearch/sessionCompleted` | `FuzzyFileSearchSessionCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1639] |
| `WindowsWorldWritableWarning` | `windows/worldWritableWarning` | `v2::WindowsWorldWritableWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1658] |
| `WindowsSandboxSetupCompleted` | `windowsSandbox/setupCompleted` | `v2::WindowsSandboxSetupCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1659] |
| `AccountLoginCompleted` | `account/login/completed` | `v2::AccountLoginCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1661][E: codex-rs/app-server-protocol/src/protocol/common.rs:1664] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/notification.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/model.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/config.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/apps.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
- [从外部 agent 导入](../cli/external-agent-import.md)
