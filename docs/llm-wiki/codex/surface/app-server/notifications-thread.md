---
id: rpc.notifications-thread
title: server notifications: thread/turn/item
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs, codex-rs/app-server-protocol/src/protocol/v2/turn.rs, codex-rs/app-server-protocol/src/protocol/v2/item.rs, codex-rs/app-server-protocol/src/protocol/v2/hook.rs, codex-rs/app-server-protocol/src/protocol/v2/realtime.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server/src/bespoke_event_handling.rs, codex-rs/app-server/src/request_processors/thread_processor.rs, codex-rs/app-server/src/request_processors/thread_attachments.rs]
symbols: [ThreadStartedNotification, TurnStartedNotification, ItemStartedNotification, RawResponseCompletedNotification, AgentMessageDeltaNotification, ThreadRealtimeStartedNotification, ThreadAttachmentUpdatedNotification]
related: [rpc.overview, rpc.thread-methods, rpc.turn-methods, rpc.notifications-system, rpc.server-requests, subsys.core.thread-queue]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> thread/turn/item server notifications 是 app-server 从服务器推给客户端的 thread lifecycle、turn lifecycle、hook、item streaming、reasoning 和 realtime 事件 catalog。

## 能回答的问题

- thread/turn/item notification 当前有哪些 wire method？
- 哪些 notification 是 experimental？
- item streaming、reasoning delta、realtime delta 分别落在哪些 payload type？
- thread notification 与 system notification 的边界是什么？
- `thread/attachment/updated` 在什么时候发出？

## 共性机制

`ServerNotification` 是 serde tag `method`、content `params` 的 tagged enum；默认命名是 camelCase，显式 wire method 在宏实例行给出。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1673]

本节点按 thread lifecycle、turn/item streaming、hook、realtime 与 raw-response completion 语义列出 51 个 notification。本轮新增稳定 `thread/attachment/updated`。两个 `thread/environment/*` connectivity notifications 仍归入 system catalog。`thread/reverted` 在 target 上已是稳定 wire。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1911][E: codex-rs/app-server-protocol/src/protocol/common.rs:1914][E: codex-rs/app-server-protocol/src/protocol/common.rs:1923][E: codex-rs/app-server-protocol/src/protocol/common.rs:1926]

## Notification catalog

| Variant | Wire method | Payload type | Gate | Evidence |
|---|---|---|---|---|
| `ThreadStarted` | `thread/started` | `v2::ThreadStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1905] |
| `ThreadStatusChanged` | `thread/status/changed` | `v2::ThreadStatusChangedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1906] |
| `ThreadArchived` | `thread/archived` | `v2::ThreadArchivedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1907] |
| `ThreadDeleted` | `thread/deleted` | `v2::ThreadDeletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1908] |
| `ThreadUnarchived` | `thread/unarchived` | `v2::ThreadUnarchivedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1909] |
| `ThreadClosed` | `thread/closed` | `v2::ThreadClosedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1910] |
| `ThreadReverted` | `thread/reverted` | `v2::ThreadRevertedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1911] |
| `ThreadNameUpdated` | `thread/name/updated` | `v2::ThreadNameUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1913] |
| `ThreadAttachmentUpdated` | `thread/attachment/updated` | `v2::ThreadAttachmentUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1914] |
| `ThreadGoalUpdated` | `thread/goal/updated` | `v2::ThreadGoalUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1915] |
| `ThreadGoalCleared` | `thread/goal/cleared` | `v2::ThreadGoalClearedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1916] |
| `ThreadQueueChanged` | `thread/queue/changed` | `v2::ThreadQueueChangedNotification` | experimental: thread/queue/changed | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1918] |
| `ThreadProjectUpdated` | `thread/project/updated` | `v2::ThreadProjectUpdatedNotification` | experimental: thread/project/updated | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1922] |
| `ThreadSettingsUpdated` | `thread/settings/updated` | `v2::ThreadSettingsUpdatedNotification` | experimental: thread/settings/updated | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1928] |
| `ThreadTokenUsageUpdated` | `thread/tokenUsage/updated` | `v2::ThreadTokenUsageUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1929] |
| `TurnStarted` | `turn/started` | `v2::TurnStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1930] |
| `HookStarted` | `hook/started` | `v2::HookStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1931] |
| `TurnCompleted` | `turn/completed` | `v2::TurnCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1932] |
| `HookCompleted` | `hook/completed` | `v2::HookCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1933] |
| `TurnDiffUpdated` | `turn/diff/updated` | `v2::TurnDiffUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1934] |
| `TurnPlanUpdated` | `turn/plan/updated` | `v2::TurnPlanUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1935] |
| `ItemStarted` | `item/started` | `v2::ItemStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1936] |
| `ItemGuardianApprovalReviewStarted` | `item/autoApprovalReview/started` | `v2::ItemGuardianApprovalReviewStartedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1937] |
| `ItemGuardianApprovalReviewCompleted` | `item/autoApprovalReview/completed` | `v2::ItemGuardianApprovalReviewCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1938] |
| `StrictReviewRequired` | `autoApprovalReview/strictReviewRequired` | `v2::StrictReviewRequiredNotification` | experimental: autoApprovalReview/strictReviewRequired | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1940] |
| `ItemCompleted` | `item/completed` | `v2::ItemCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1941] |
| `RawResponseItemCompleted` | `rawResponseItem/completed` | `v2::RawResponseItemCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1943] |
| `RawResponseCompleted` | `rawResponse/completed` | `v2::RawResponseCompletedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1945] |
| `AgentMessageDelta` | `item/agentMessage/delta` | `v2::AgentMessageDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1946] |
| `PlanDelta` | `item/plan/delta` | `v2::PlanDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1948] |
| `CommandExecutionOutputDelta` | `item/commandExecution/outputDelta` | `v2::CommandExecutionOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1957] |
| `TerminalInteraction` | `item/commandExecution/terminalInteraction` | `v2::TerminalInteractionNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1958] |
| `FileChangeOutputDelta` | `item/fileChange/outputDelta` | `v2::FileChangeOutputDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1960] |
| `FileChangePatchUpdated` | `item/fileChange/patchUpdated` | `v2::FileChangePatchUpdatedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1961] |
| `McpToolCallProgress` | `item/mcpToolCall/progress` | `v2::McpToolCallProgressNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1963] |
| `ReasoningSummaryTextDelta` | `item/reasoning/summaryTextDelta` | `v2::ReasoningSummaryTextDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1975] |
| `ReasoningSummaryPartAdded` | `item/reasoning/summaryPartAdded` | `v2::ReasoningSummaryPartAddedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1976] |
| `ReasoningTextDelta` | `item/reasoning/textDelta` | `v2::ReasoningTextDeltaNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1977] |
| `ContextCompacted` | `thread/compacted` | `v2::ContextCompactedNotification` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1979] |
| `TurnModerationMetadata` | `turn/moderationMetadata` | `v2::TurnModerationMetadataNotification` | experimental: turn/moderationMetadata | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1985] |
| `ThreadRealtimeStarted` | `thread/realtime/started` | `v2::ThreadRealtimeStartedNotification` | experimental: thread/realtime/started | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1994] |
| `ThreadRealtimeItemAdded` | `thread/realtime/itemAdded` | `v2::ThreadRealtimeItemAddedNotification` | experimental: thread/realtime/itemAdded | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1996] |
| `ThreadRealtimeItemStarted` | `thread/realtime/item/started` | `v2::ThreadRealtimeItemStartedNotification` | experimental: thread/realtime/item/started | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1998] |
| `ThreadRealtimeItemTranscriptDelta` | `thread/realtime/item/transcript/delta` | `v2::ThreadRealtimeItemTranscriptDeltaNotification` | experimental: thread/realtime/item/transcript/delta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2000] |
| `ThreadRealtimeItemCompleted` | `thread/realtime/item/completed` | `v2::ThreadRealtimeItemCompletedNotification` | experimental: thread/realtime/item/completed | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2002] |
| `ThreadRealtimeTranscriptDelta` | `thread/realtime/transcript/delta` | `v2::ThreadRealtimeTranscriptDeltaNotification` | experimental: thread/realtime/transcript/delta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2004] |
| `ThreadRealtimeTranscriptDone` | `thread/realtime/transcript/done` | `v2::ThreadRealtimeTranscriptDoneNotification` | experimental: thread/realtime/transcript/done | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2006] |
| `ThreadRealtimeOutputAudioDelta` | `thread/realtime/outputAudio/delta` | `v2::ThreadRealtimeOutputAudioDeltaNotification` | experimental: thread/realtime/outputAudio/delta | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2008] |
| `ThreadRealtimeSdp` | `thread/realtime/sdp` | `v2::ThreadRealtimeSdpNotification` | experimental: thread/realtime/sdp | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2010] |
| `ThreadRealtimeError` | `thread/realtime/error` | `v2::ThreadRealtimeErrorNotification` | experimental: thread/realtime/error | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2012] |
| `ThreadRealtimeClosed` | `thread/realtime/closed` | `v2::ThreadRealtimeClosedNotification` | experimental: thread/realtime/closed | [E: codex-rs/app-server-protocol/src/protocol/common.rs:2014] |

`thread/reverted` 只带 `thread_id`，在 paginated revert 成功并 reload 后发出。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1974][E: codex-rs/app-server/src/request_processors/thread_processor.rs:612]

`thread/attachment/updated` 带 `threadId`、`attachmentType`、`identityKey`、`attachmentId` 与 `operation`（`created` / `deleted`）。processor 在 `thread/attachment/add` 创建成功、`thread/attachment/remove` 删除成功后广播；`Existing` add 不发通知。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs:92][E: codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs:101][E: codex-rs/app-server/src/request_processors/thread_attachments.rs:66][E: codex-rs/app-server/src/request_processors/thread_attachments.rs:81][E: codex-rs/app-server/src/request_processors/thread_attachments.rs:158]

`thread/queue/changed` 只带 `thread_id`；客户端必须再 `thread/queue/list`。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:2005][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:2006]

`turn/completed` 的成功通知现在可在 `turn.items` 中携带最终 agent message，并把 `itemsView` 标为 `summary`；没有 final item（包括失败路径）时 items 为空、view 为 `notLoaded`。客户端不能再假设 completed notification 的 items 恒为空。[E: codex-rs/app-server/src/bespoke_event_handling.rs:1319][E: codex-rs/app-server/src/bespoke_event_handling.rs:1320][E: codex-rs/app-server/src/bespoke_event_handling.rs:1321]

`RawResponseCompletedNotification` 带 thread/turn/response ids 和 optional `TokenUsageBreakdown`，面向需要 exact upstream usage 的内部客户端；它与逐 item 的 `rawResponseItem/completed` 是不同粒度。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1847][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1848][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1851]

`item/started`/`item/completed` 承载的 `ThreadItem::McpToolCall` 新增 nullable `readOnlyHint`，把 MCP tool annotations 的只读意图带到客户端；这不新增 notification method。[E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:327][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:339]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/turn.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/item.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/hook.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/realtime.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/model.rs`
- `codex-rs/app-server/src/bespoke_event_handling.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/thread_attachments.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
- `subsys.core.thread-queue` -> [Thread queue](../../subsystems/core/thread-queue.md)
