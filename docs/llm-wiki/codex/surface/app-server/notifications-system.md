---
id: rpc.notifications-system
title: server notifications: system
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/notification.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/fs.rs, codex-rs/app-server-protocol/src/protocol/v2/process.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/app-server-protocol/src/protocol/v2/environment.rs, codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs]
symbols: [ServerNotification, ErrorNotification, ServerRequestResolvedNotification, AccountUpdatedNotification, McpServerStatusUpdatedNotification, EnvironmentConnectionNotification, FsChangedNotification, ProcessOutputDeltaNotification, ModelSafetyBufferingUpdatedNotification, ConfigWarningNotification]
related: [surface.cli.external-agent-import, rpc.overview, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.server-requests]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> system server notifications 是 app-server 推给客户端的 error/warning、server-request resolution、account、MCP、app list、remote control、fs/process/model/config/Windows/fuzzy-search 等非 thread-item 事件 catalog。

## 能回答的问题

- system notification 当前有哪些 wire method？
- account login completion、server request resolution、fs changed、process output delta 分别用哪些 payload？
- 哪些 system notifications 被 experimental gate 保护？
- system notification 与 thread/turn/item notification 如何分工？

## 共性机制

本节点列出不属于 thread/turn/item/hook/raw-response streaming 面的 29 个 `ServerNotification`；它们与 thread catalog 合计覆盖 72 个 server notification 宏实例。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1637]

`AccountLoginCompleted` 在宏调用中通过 serde/TS/strum rename 固定为 `account/login/completed`，不是默认 camelCase wire name。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1735][E: codex-rs/app-server-protocol/src/protocol/common.rs:1736][E: codex-rs/app-server-protocol/src/protocol/common.rs:1737][E: codex-rs/app-server-protocol/src/protocol/common.rs:1738]

## Notification catalog

| Variant | Wire method | Payload type | Gate | Evidence |
|---|---|---|---|---|
| `Error` | `error` | `v2::ErrorNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1639] |
| `SkillsChanged` | `skills/changed` | `v2::SkillsChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1646] |
| `EnvironmentConnected` | `thread/environment/connected` | `v2::EnvironmentConnectionNotification` | experimental: thread/environment/connected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1650][E: codex-rs/app-server-protocol/src/protocol/common.rs:1651] |
| `EnvironmentDisconnected` | `thread/environment/disconnected` | `v2::EnvironmentConnectionNotification` | experimental: thread/environment/disconnected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1652][E: codex-rs/app-server-protocol/src/protocol/common.rs:1653] |
| `CommandExecOutputDelta` | `command/exec/outputDelta` | `v2::CommandExecOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1675] |
| `ProcessOutputDelta` | `process/outputDelta` | `v2::ProcessOutputDeltaNotification` | experimental: process/outputDelta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1677][E: codex-rs/app-server-protocol/src/protocol/common.rs:1678] |
| `ProcessExited` | `process/exited` | `v2::ProcessExitedNotification` | experimental: process/exited | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1680][E: codex-rs/app-server-protocol/src/protocol/common.rs:1681] |
| `ServerRequestResolved` | `serverRequest/resolved` | `v2::ServerRequestResolvedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1687] |
| `McpServerOauthLoginCompleted` | `mcpServer/oauthLogin/completed` | `v2::McpServerOauthLoginCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1689] |
| `McpServerStatusUpdated` | `mcpServer/startupStatus/updated` | `v2::McpServerStatusUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1690] |
| `AccountUpdated` | `account/updated` | `v2::AccountUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1691] |
| `AccountRateLimitsUpdated` | `account/rateLimits/updated` | `v2::AccountRateLimitsUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1692] |
| `AppListUpdated` | `app/list/updated` | `v2::AppListUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1693] |
| `RemoteControlStatusChanged` | `remoteControl/status/changed` | `v2::RemoteControlStatusChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1694] |
| `ExternalAgentConfigImportProgress` | `externalAgentConfig/import/progress` | `v2::ExternalAgentConfigImportProgressNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1695] |
| `ExternalAgentConfigImportCompleted` | `externalAgentConfig/import/completed` | `v2::ExternalAgentConfigImportCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1696] |
| `FsChanged` | `fs/changed` | `v2::FsChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1697] |
| `ModelRerouted` | `model/rerouted` | `v2::ModelReroutedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1703] |
| `ModelVerification` | `model/verification` | `v2::ModelVerificationNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1704] |
| `ModelSafetyBufferingUpdated` | `model/safetyBuffering/updated` | `v2::ModelSafetyBufferingUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1707] |
| `Warning` | `warning` | `v2::WarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1708] |
| `GuardianWarning` | `guardianWarning` | `v2::GuardianWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1709] |
| `DeprecationNotice` | `deprecationNotice` | `v2::DeprecationNoticeNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1710] |
| `ConfigWarning` | `configWarning` | `v2::ConfigWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1711] |
| `FuzzyFileSearchSessionUpdated` | `fuzzyFileSearch/sessionUpdated` | `FuzzyFileSearchSessionUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1712] |
| `FuzzyFileSearchSessionCompleted` | `fuzzyFileSearch/sessionCompleted` | `FuzzyFileSearchSessionCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1713] |
| `WindowsWorldWritableWarning` | `windows/worldWritableWarning` | `v2::WindowsWorldWritableWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1732] |
| `WindowsSandboxSetupCompleted` | `windowsSandbox/setupCompleted` | `v2::WindowsSandboxSetupCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1733] |
| `AccountLoginCompleted` | `account/login/completed` | `v2::AccountLoginCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1735][E: codex-rs/app-server-protocol/src/protocol/common.rs:1738] |

两个 environment connection notifications 共用只含 `thread_id` 与 `environment_id` 的 payload；虽然 wire name 以 `thread/` 开头，它们描述 execution-environment connectivity，因此归 system catalog。[E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:24][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:27][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:28][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:29]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/notification.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/model.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/config.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/environment.rs`
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
