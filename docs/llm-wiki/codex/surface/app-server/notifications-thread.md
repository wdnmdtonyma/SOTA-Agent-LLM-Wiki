---
id: rpc.notifications-thread
title: server notifications: thread/turn/item
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/turn.rs, codex-rs/app-server-protocol/src/protocol/v2/item.rs, codex-rs/app-server-protocol/src/protocol/v2/hook.rs, codex-rs/app-server-protocol/src/protocol/v2/realtime.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs]
symbols: [ServerNotification, ThreadStartedNotification, TurnStartedNotification, ItemStartedNotification, AgentMessageDeltaNotification, ThreadRealtimeStartedNotification]
related: [rpc.overview, rpc.thread-methods, rpc.turn-methods, rpc.notifications-system, rpc.server-requests]
evidence: explicit
status: verified
updated: db887d03e1
---

> thread/turn/item server notifications 是 app-server 从服务器推给客户端的 thread lifecycle、turn lifecycle、hook、item streaming、reasoning 和 realtime 事件 catalog。

## 能回答的问题

- thread/turn/item notification 当前有哪些 wire method？
- 哪些 notification 是 experimental？
- item streaming、reasoning delta、realtime delta 分别落在哪些 payload type？
- thread notification 与 system notification 的边界是什么？

## 共性机制

`ServerNotification` 是 serde tag `method`、content `params` 的 tagged enum；默认命名是 camelCase，显式 wire method 在宏实例行给出。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1361][E: codex-rs/app-server-protocol/src/protocol/common.rs:1380][E: codex-rs/app-server-protocol/src/protocol/common.rs:1382][E: codex-rs/app-server-protocol/src/protocol/common.rs:1385]

本节点列出 wire 前缀为 `thread/`、`turn/`、`hook/`、`item/` 以及 `rawResponseItem/completed` 的 42 个 notification；其余 27 个 notification 在 system catalog。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1607]

## Notification catalog

| Variant | Wire method | Payload type | Gate | Evidence |
|---|---|---|---|---|
| `ThreadStarted` | `thread/started` | `v2::ThreadStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1610] |
| `ThreadStatusChanged` | `thread/status/changed` | `v2::ThreadStatusChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1611] |
| `ThreadArchived` | `thread/archived` | `v2::ThreadArchivedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1612] |
| `ThreadDeleted` | `thread/deleted` | `v2::ThreadDeletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1613] |
| `ThreadUnarchived` | `thread/unarchived` | `v2::ThreadUnarchivedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1614] |
| `ThreadClosed` | `thread/closed` | `v2::ThreadClosedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1615] |
| `ThreadNameUpdated` | `thread/name/updated` | `v2::ThreadNameUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1617] |
| `ThreadGoalUpdated` | `thread/goal/updated` | `v2::ThreadGoalUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1618] |
| `ThreadGoalCleared` | `thread/goal/cleared` | `v2::ThreadGoalClearedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1619] |
| `ThreadSettingsUpdated` | `thread/settings/updated` | `v2::ThreadSettingsUpdatedNotification` | experimental: thread/settings/updated | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1620][E: codex-rs/app-server-protocol/src/protocol/common.rs:1621] |
| `ThreadTokenUsageUpdated` | `thread/tokenUsage/updated` | `v2::ThreadTokenUsageUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1622] |
| `TurnStarted` | `turn/started` | `v2::TurnStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1623] |
| `HookStarted` | `hook/started` | `v2::HookStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1624] |
| `TurnCompleted` | `turn/completed` | `v2::TurnCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1625] |
| `HookCompleted` | `hook/completed` | `v2::HookCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1626] |
| `TurnDiffUpdated` | `turn/diff/updated` | `v2::TurnDiffUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1627] |
| `TurnPlanUpdated` | `turn/plan/updated` | `v2::TurnPlanUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1628] |
| `ItemStarted` | `item/started` | `v2::ItemStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1629] |
| `ItemGuardianApprovalReviewStarted` | `item/autoApprovalReview/started` | `v2::ItemGuardianApprovalReviewStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1630] |
| `ItemGuardianApprovalReviewCompleted` | `item/autoApprovalReview/completed` | `v2::ItemGuardianApprovalReviewCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1631] |
| `ItemCompleted` | `item/completed` | `v2::ItemCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1632] |
| `RawResponseItemCompleted` | `rawResponseItem/completed` | `v2::RawResponseItemCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1634] |
| `AgentMessageDelta` | `item/agentMessage/delta` | `v2::AgentMessageDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1635] |
| `PlanDelta` | `item/plan/delta` | `v2::PlanDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1637] |
| `CommandExecutionOutputDelta` | `item/commandExecution/outputDelta` | `v2::CommandExecutionOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1646] |
| `TerminalInteraction` | `item/commandExecution/terminalInteraction` | `v2::TerminalInteractionNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1647] |
| `FileChangeOutputDelta` | `item/fileChange/outputDelta` | `v2::FileChangeOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1649] |
| `FileChangePatchUpdated` | `item/fileChange/patchUpdated` | `v2::FileChangePatchUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1650] |
| `McpToolCallProgress` | `item/mcpToolCall/progress` | `v2::McpToolCallProgressNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1652] |
| `ReasoningSummaryTextDelta` | `item/reasoning/summaryTextDelta` | `v2::ReasoningSummaryTextDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1662] |
| `ReasoningSummaryPartAdded` | `item/reasoning/summaryPartAdded` | `v2::ReasoningSummaryPartAddedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1663] |
| `ReasoningTextDelta` | `item/reasoning/textDelta` | `v2::ReasoningTextDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1664] |
| `ContextCompacted` | `thread/compacted` | `v2::ContextCompactedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1666] |
| `TurnModerationMetadata` | `turn/moderationMetadata` | `v2::TurnModerationMetadataNotification` | experimental: turn/moderationMetadata | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1669][E: codex-rs/app-server-protocol/src/protocol/common.rs:1670] |
| `ThreadRealtimeStarted` | `thread/realtime/started` | `v2::ThreadRealtimeStartedNotification` | experimental: thread/realtime/started | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1678][E: codex-rs/app-server-protocol/src/protocol/common.rs:1679] |
| `ThreadRealtimeItemAdded` | `thread/realtime/itemAdded` | `v2::ThreadRealtimeItemAddedNotification` | experimental: thread/realtime/itemAdded | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1680][E: codex-rs/app-server-protocol/src/protocol/common.rs:1681] |
| `ThreadRealtimeTranscriptDelta` | `thread/realtime/transcript/delta` | `v2::ThreadRealtimeTranscriptDeltaNotification` | experimental: thread/realtime/transcript/delta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1682][E: codex-rs/app-server-protocol/src/protocol/common.rs:1683] |
| `ThreadRealtimeTranscriptDone` | `thread/realtime/transcript/done` | `v2::ThreadRealtimeTranscriptDoneNotification` | experimental: thread/realtime/transcript/done | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1684][E: codex-rs/app-server-protocol/src/protocol/common.rs:1685] |
| `ThreadRealtimeOutputAudioDelta` | `thread/realtime/outputAudio/delta` | `v2::ThreadRealtimeOutputAudioDeltaNotification` | experimental: thread/realtime/outputAudio/delta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1686][E: codex-rs/app-server-protocol/src/protocol/common.rs:1687] |
| `ThreadRealtimeSdp` | `thread/realtime/sdp` | `v2::ThreadRealtimeSdpNotification` | experimental: thread/realtime/sdp | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1688][E: codex-rs/app-server-protocol/src/protocol/common.rs:1689] |
| `ThreadRealtimeError` | `thread/realtime/error` | `v2::ThreadRealtimeErrorNotification` | experimental: thread/realtime/error | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1690][E: codex-rs/app-server-protocol/src/protocol/common.rs:1691] |
| `ThreadRealtimeClosed` | `thread/realtime/closed` | `v2::ThreadRealtimeClosedNotification` | experimental: thread/realtime/closed | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1692][E: codex-rs/app-server-protocol/src/protocol/common.rs:1693] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/turn.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/item.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/hook.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/realtime.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/model.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
