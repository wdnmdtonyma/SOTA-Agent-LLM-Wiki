---
id: rpc.notifications-system
title: server notifications: system
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/notification.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/fs.rs, codex-rs/app-server-protocol/src/protocol/v2/process.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/app-server-protocol/src/protocol/v2/environment.rs, codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs]
symbols: [ErrorNotification, ServerRequestResolvedNotification, AccountUpdatedNotification, McpServerStatusUpdatedNotification, EnvironmentConnectionNotification, FsChangedNotification, ProcessOutputDeltaNotification, ModelSafetyBufferingUpdatedNotification, ConfigWarningNotification]
related: [surface.cli.external-agent-import, rpc.overview, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread, rpc.server-requests]
evidence: explicit
status: verified
updated: 7750465934
---

> system server notifications 是 app-server 推给客户端的 error/warning、server-request resolution、account、MCP、app list、remote control、fs/process/model/config/Windows/fuzzy-search 等非 thread-item 事件 catalog。

## 能回答的问题

- system notification 当前有哪些 wire method？
- account login completion、server request resolution、fs changed、process output delta 分别用哪些 payload？
- 哪些 system notifications 被 experimental gate 保护？
- system notification 与 thread/turn/item notification 如何分工？

## 共性机制

本节点列出不属于 thread/turn/item/hook/raw-response streaming 面的 29 个 `ServerNotification`；它们与 thread catalog 合计覆盖 72 个 server notification 宏实例。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1684]

`AccountLoginCompleted` 在宏调用中通过 serde/TS/strum rename 固定为 `account/login/completed`，不是默认 camelCase wire name。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1782][E: codex-rs/app-server-protocol/src/protocol/common.rs:1783][E: codex-rs/app-server-protocol/src/protocol/common.rs:1784][E: codex-rs/app-server-protocol/src/protocol/common.rs:1785]

该 notification 的 payload 新增 nullable `onboardingEntrypoint`，当前唯一值是 `life_sciences`。browser OAuth callback 只接受原 state 或精确追加 `.onboarding_entrypoint=life_sciences` 的 state，并把解析结果传入完成通知；任意其他 suffix 不应被解释为 onboarding entrypoint。[E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:669][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:678][E: codex-rs/login/src/callback_params.rs:1][E: codex-rs/login/src/callback_params.rs:13][E: codex-rs/app-server/src/request_processors/account_processor.rs:560][E: codex-rs/app-server/src/request_processors/account_processor.rs:587]

## Notification catalog

| Variant | Wire method | Payload type | Gate | Evidence |
|---|---|---|---|---|
| `Error` | `error` | `v2::ErrorNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1686] |
| `SkillsChanged` | `skills/changed` | `v2::SkillsChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1693] |
| `EnvironmentConnected` | `thread/environment/connected` | `v2::EnvironmentConnectionNotification` | experimental: thread/environment/connected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1697][E: codex-rs/app-server-protocol/src/protocol/common.rs:1698] |
| `EnvironmentDisconnected` | `thread/environment/disconnected` | `v2::EnvironmentConnectionNotification` | experimental: thread/environment/disconnected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1699][E: codex-rs/app-server-protocol/src/protocol/common.rs:1700] |
| `CommandExecOutputDelta` | `command/exec/outputDelta` | `v2::CommandExecOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1722] |
| `ProcessOutputDelta` | `process/outputDelta` | `v2::ProcessOutputDeltaNotification` | experimental: process/outputDelta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1724][E: codex-rs/app-server-protocol/src/protocol/common.rs:1725] |
| `ProcessExited` | `process/exited` | `v2::ProcessExitedNotification` | experimental: process/exited | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1727][E: codex-rs/app-server-protocol/src/protocol/common.rs:1728] |
| `ServerRequestResolved` | `serverRequest/resolved` | `v2::ServerRequestResolvedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1734] |
| `McpServerOauthLoginCompleted` | `mcpServer/oauthLogin/completed` | `v2::McpServerOauthLoginCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1736] |
| `McpServerStatusUpdated` | `mcpServer/startupStatus/updated` | `v2::McpServerStatusUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1737] |
| `AccountUpdated` | `account/updated` | `v2::AccountUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1738] |
| `AccountRateLimitsUpdated` | `account/rateLimits/updated` | `v2::AccountRateLimitsUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1739] |
| `AppListUpdated` | `app/list/updated` | `v2::AppListUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1740] |
| `RemoteControlStatusChanged` | `remoteControl/status/changed` | `v2::RemoteControlStatusChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1741] |
| `ExternalAgentConfigImportProgress` | `externalAgentConfig/import/progress` | `v2::ExternalAgentConfigImportProgressNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1742] |
| `ExternalAgentConfigImportCompleted` | `externalAgentConfig/import/completed` | `v2::ExternalAgentConfigImportCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1743] |
| `FsChanged` | `fs/changed` | `v2::FsChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1744] |
| `ModelRerouted` | `model/rerouted` | `v2::ModelReroutedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1750] |
| `ModelVerification` | `model/verification` | `v2::ModelVerificationNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1751] |
| `ModelSafetyBufferingUpdated` | `model/safetyBuffering/updated` | `v2::ModelSafetyBufferingUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1754] |
| `Warning` | `warning` | `v2::WarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1755] |
| `GuardianWarning` | `guardianWarning` | `v2::GuardianWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1756] |
| `DeprecationNotice` | `deprecationNotice` | `v2::DeprecationNoticeNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1757] |
| `ConfigWarning` | `configWarning` | `v2::ConfigWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1758] |
| `FuzzyFileSearchSessionUpdated` | `fuzzyFileSearch/sessionUpdated` | `FuzzyFileSearchSessionUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1759] |
| `FuzzyFileSearchSessionCompleted` | `fuzzyFileSearch/sessionCompleted` | `FuzzyFileSearchSessionCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1760] |
| `WindowsWorldWritableWarning` | `windows/worldWritableWarning` | `v2::WindowsWorldWritableWarningNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1779] |
| `WindowsSandboxSetupCompleted` | `windowsSandbox/setupCompleted` | `v2::WindowsSandboxSetupCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1780] |
| `AccountLoginCompleted` | `account/login/completed` | `v2::AccountLoginCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1782][E: codex-rs/app-server-protocol/src/protocol/common.rs:1785] |

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
