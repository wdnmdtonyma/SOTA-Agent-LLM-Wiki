---
id: rpc.notifications-system
title: server notifications: system
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2.rs]
symbols: [ErrorNotification, SkillsChangedNotification, CommandExecOutputDeltaNotification, McpServerStatusUpdatedNotification, AccountUpdatedNotification, FsChangedNotification, ThreadRealtimeStartedNotification]
related: [rpc.overview, rpc.fs-command-methods, rpc.config-account-methods, rpc.mcp-skills-plugin-methods, rpc.notifications-thread]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> system notifications 覆盖 app-server 的非 transcript 主线推送：errors、skills/app/plugin/MCP/account/config/fs/hook、standalone command output、fuzzy search session、realtime、Windows sandbox setup、login completion，以及 MCP tool-call progress 这类 item-adjacent system UI 事件。

## 能回答的问题

- system notifications 的 29 个 wire methods 和 payload types 是什么？
- `command/exec/outputDelta` 与 `item/commandExecution/outputDelta` 的区别在哪里？
- account login completion、rate limit update、config warning 如何通知客户端？
- realtime session 的 notification family 覆盖哪些状态和媒体数据？

## System payload 要点

`ErrorNotification` 绑定 `thread_id`、`turn_id`，包含 `TurnError` 和 `will_retry`；这说明它属于 turn 运行错误，但在 catalog 中作为通用 `error` notification wire name 暴露。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1014][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4505][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4508][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4509][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4510]

`CommandExecOutputDeltaNotification` 是 standalone `command/exec` 的 connection-scoped output stream，payload 带 `process_id`、`stream` 和 base64 `delta_base64`；这不同于 thread item command execution output delta，后者绑定 `thread_id`、`turn_id`、`item_id` 和 text `delta`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1039][E: codex-rs/app-server-protocol/src/protocol/common.rs:1040][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6235][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6236][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6227][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6228][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6229][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6230][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6243][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6245][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6247]

`AccountLoginCompletedNotification` 返回 optional `login_id`、`success` 和 optional `error`；`AccountRateLimitsUpdatedNotification` 返回 `RateLimitSnapshot`，该 snapshot 包含 limit id/name、primary/secondary windows、credits、plan type 和 reached type。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:7191][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7192][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7193][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7062][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7069][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7070][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7071][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7072][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7073][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7074][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7075]

realtime notification family 使用 `thread/realtime/started`、`thread/realtime/itemAdded`、`thread/realtime/transcript/delta`、`thread/realtime/transcript/done`、`thread/realtime/outputAudio/delta`、`thread/realtime/sdp`、`thread/realtime/error`、`thread/realtime/closed` wire methods；started 带 session/version，itemAdded 带 raw item，transcript delta 带 role/delta，transcript done 带 role/text，outputAudio delta 带 audio chunk，sdp/error/closed 分别承载 WebRTC SDP、错误和关闭原因。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1065][E: codex-rs/app-server-protocol/src/protocol/common.rs:1067][E: codex-rs/app-server-protocol/src/protocol/common.rs:1069][E: codex-rs/app-server-protocol/src/protocol/common.rs:1071][E: codex-rs/app-server-protocol/src/protocol/common.rs:1073][E: codex-rs/app-server-protocol/src/protocol/common.rs:1075][E: codex-rs/app-server-protocol/src/protocol/common.rs:1077][E: codex-rs/app-server-protocol/src/protocol/common.rs:1079][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4671][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4672][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4681][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4691][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4693][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4703][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4705][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4714][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4723][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4732][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4741]

## Notification catalog

| Variant | Wire method | Payload type | 说明 | Evidence |
|---|---|---|---|---|
| `Error` | `error` | `v2::ErrorNotification` | turn-scoped error and retry status。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1014][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4505][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4508][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4509][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4510] |
| `SkillsChanged` | `skills/changed` | `v2::SkillsChangedNotification` | skills inventory changed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1020][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5961] |
| `HookStarted` | `hook/started` | `v2::HookStartedNotification` | hook execution started。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1024][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5984] |
| `HookCompleted` | `hook/completed` | `v2::HookCompletedNotification` | hook execution completed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1026][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6010] |
| `CommandExecOutputDelta` | `command/exec/outputDelta` | `v2::CommandExecOutputDeltaNotification` | standalone command/exec stdout/stderr delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1039][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6243][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6245][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6247] |
| `McpToolCallProgress` | `item/mcpToolCall/progress` | `v2::McpToolCallProgressNotification` | MCP tool call progress update，payload 绑定 thread/turn/item。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1045][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6285][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6286][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6287][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6288] |
| `McpServerOauthLoginCompleted` | `mcpServer/oauthLogin/completed` | `v2::McpServerOauthLoginCompletedNotification` | MCP OAuth login terminal event。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1046][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6295][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6296][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6299] |
| `McpServerStatusUpdated` | `mcpServer/startupStatus/updated` | `v2::McpServerStatusUpdatedNotification` | MCP server status changed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1047][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6316][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6317][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6318] |
| `AccountUpdated` | `account/updated` | `v2::AccountUpdatedNotification` | account auth mode/plan type changed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1048][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4367][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4368] |
| `AccountRateLimitsUpdated` | `account/rateLimits/updated` | `v2::AccountRateLimitsUpdatedNotification` | account rate limit snapshot changed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1049][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7061] |
| `AppListUpdated` | `app/list/updated` | `v2::AppListUpdatedNotification` | app/connectors list changed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1050][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2527] |
| `ExternalAgentConfigImportCompleted` | `externalAgentConfig/import/completed` | `v2::ExternalAgentConfigImportCompletedNotification` | external agent config import finished。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1051][E: codex-rs/app-server-protocol/src/protocol/v2.rs:1051] |
| `FsChanged` | `fs/changed` | `v2::FsChangedNotification` | filesystem watch event for `fs/watch` subscribers。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1052][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2930][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2934][E: codex-rs/app-server-protocol/src/protocol/v2.rs:2938] |
| `Warning` | `warning` | `v2::WarningNotification` | optional thread target plus user-facing warning message。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1059][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7221][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7224] |
| `DeprecationNotice` | `deprecationNotice` | `v2::DeprecationNoticeNotification` | deprecation summary and optional details。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1060][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7212][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7214] |
| `ConfigWarning` | `configWarning` | `v2::ConfigWarningNotification` | config warning summary/details/path/range。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1061][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7250][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7252][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7256][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7260] |
| `FuzzyFileSearchSessionUpdated` | `fuzzyFileSearch/sessionUpdated` | `FuzzyFileSearchSessionUpdatedNotification` | fuzzy search session query result update。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1062][E: codex-rs/app-server-protocol/src/protocol/common.rs:999] |
| `FuzzyFileSearchSessionCompleted` | `fuzzyFileSearch/sessionCompleted` | `FuzzyFileSearchSessionCompletedNotification` | fuzzy search session completed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1063][E: codex-rs/app-server-protocol/src/protocol/common.rs:1008] |
| `ThreadRealtimeStarted` | `thread/realtime/started` | `v2::ThreadRealtimeStartedNotification` | realtime startup accepted。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1065][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4665][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4671][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4672] |
| `ThreadRealtimeItemAdded` | `thread/realtime/itemAdded` | `v2::ThreadRealtimeItemAddedNotification` | raw non-audio realtime item。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1067][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4675][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4681] |
| `ThreadRealtimeTranscriptDelta` | `thread/realtime/transcript/delta` | `v2::ThreadRealtimeTranscriptDeltaNotification` | live transcript delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1069][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4684][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4691][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4693] |
| `ThreadRealtimeTranscriptDone` | `thread/realtime/transcript/done` | `v2::ThreadRealtimeTranscriptDoneNotification` | final transcript part text。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1071][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4696][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4703][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4705] |
| `ThreadRealtimeOutputAudioDelta` | `thread/realtime/outputAudio/delta` | `v2::ThreadRealtimeOutputAudioDeltaNotification` | streamed output audio chunk。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1073][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4708][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4714] |
| `ThreadRealtimeSdp` | `thread/realtime/sdp` | `v2::ThreadRealtimeSdpNotification` | WebRTC remote SDP。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1075][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4717][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4723] |
| `ThreadRealtimeError` | `thread/realtime/error` | `v2::ThreadRealtimeErrorNotification` | realtime error message。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1077][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4726][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4732] |
| `ThreadRealtimeClosed` | `thread/realtime/closed` | `v2::ThreadRealtimeClosedNotification` | realtime transport closed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1079][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4735][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4741] |
| `WindowsWorldWritableWarning` | `windows/worldWritableWarning` | `v2::WindowsWorldWritableWarningNotification` | Windows world-writable path warning。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1082][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6324] |
| `WindowsSandboxSetupCompleted` | `windowsSandbox/setupCompleted` | `v2::WindowsSandboxSetupCompletedNotification` | Windows sandbox setup terminal event。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1083][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6357] |
| `AccountLoginCompleted` | `account/login/completed` | `v2::AccountLoginCompletedNotification` | account login flow terminal event；wire name 通过 serde rename 指定。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1085][E: codex-rs/app-server-protocol/src/protocol/common.rs:1088][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7188] |

## 控制流与设计动机

system notifications 把“非主 transcript 但客户端必须响应”的状态变化放在同一 server notification enum 中：settings UI、MCP UI、standalone terminal UI、account UI、file watcher 和 realtime UI 都可以订阅同一 transport stream。[I] `CommandExecOutputDelta` 独立于 thread item output，是因为 `command/exec` 本身不创建 thread/turn，因此需要 connection-scoped process id 而不是 thread item id。[I]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2.rs`

## 相关

- `rpc.fs-command-methods` -> [fs 与 command 方法](fs-command-methods.md)
- `rpc.config-account-methods` -> [config/account/model 方法](config-account-methods.md)
- `rpc.mcp-skills-plugin-methods` -> [MCP/skills/plugin 方法](mcp-skills-plugin-methods.md)
