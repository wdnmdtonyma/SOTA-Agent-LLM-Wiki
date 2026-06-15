---
id: rpc.notifications-thread
title: server notifications: thread/turn/item
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2.rs]
symbols: [ServerNotification, ThreadStartedNotification, TurnStartedNotification, TurnCompletedNotification, ItemStartedNotification, ItemCompletedNotification, AgentMessageDeltaNotification]
related: [rpc.overview, rpc.thread-methods, rpc.turn-methods, rpc.notifications-system, rpc.server-requests]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> thread/turn/item notifications 是 app-server 从服务器推给客户端的 conversation event stream：thread 生命周期、turn 生命周期、item 增量与完成、approval review、reasoning/plan/message delta、file/command output 和 server request resolution 都在这个节点列出。

## 能回答的问题

- thread/turn/item 相关 server notification 的 wire name、payload type 是什么？
- `turn/plan/updated`、`item/agentMessage/delta`、`item/completed` 分别承载什么层级的信息？
- server request 完成后客户端如何知道 request id 已 resolved？
- token usage、context compaction、model reroute 这类 turn-adjacent 事件在哪个 notification 上？

## Notification envelope

`server_notification_definitions!` 生成 `ServerNotification`，serde 使用 `method` tag 和 `params` content；带显式 `=> "..."` 的 row 会把该 wire literal 写进 notification envelope 的 `method` 字段。[E: codex-rs/app-server-protocol/src/protocol/common.rs:779][E: codex-rs/app-server-protocol/src/protocol/common.rs:783][E: codex-rs/app-server-protocol/src/protocol/common.rs:798][E: codex-rs/app-server-protocol/src/protocol/common.rs:800][E: codex-rs/app-server-protocol/src/protocol/common.rs:803]

thread lifecycle payloads 返回 `thread_id` 或 `Thread`/status 信息；`ThreadTokenUsageUpdatedNotification` 返回 `thread_id`、`turn_id` 和 `token_usage`，`ThreadTokenUsage` 拆成 total/last/context window。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:5922][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5929][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5930][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5937][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5944][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5951][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4375][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4376][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4377][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4384][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4385][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4388]

turn/item payloads 用 `thread_id`、`turn_id`、`item_id` 或 `turn` 绑定到运行中的 turn；`ItemCompletedNotification` 携带完整 `item`，`AgentMessageDeltaNotification` 携带 `delta`，`ServerRequestResolvedNotification` 携带 resolved 的 server request id。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:5977][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5978][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6003][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6004][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6139][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6140][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6141][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6158][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6159][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6160][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6161][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6277][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6278]

## Notification catalog

| Variant | Wire method | Payload type | 说明 | Evidence |
|---|---|---|---|---|
| `ThreadStarted` | `thread/started` | `v2::ThreadStartedNotification` | thread 已启动，payload 含 thread object。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1015][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5922] |
| `ThreadStatusChanged` | `thread/status/changed` | `v2::ThreadStatusChangedNotification` | thread runtime status changed，payload 含 `thread_id` 和 `status`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1016][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5929][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5930] |
| `ThreadArchived` | `thread/archived` | `v2::ThreadArchivedNotification` | thread 被归档。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1017][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5936] |
| `ThreadUnarchived` | `thread/unarchived` | `v2::ThreadUnarchivedNotification` | thread 取消归档。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1018][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5943] |
| `ThreadClosed` | `thread/closed` | `v2::ThreadClosedNotification` | loaded/subscribed thread closed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1019][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5950] |
| `ThreadNameUpdated` | `thread/name/updated` | `v2::ThreadNameUpdatedNotification` | thread name updated，payload 带 `thread_id` 和新的 optional `thread_name`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1021][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5967][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5970] |
| `ThreadTokenUsageUpdated` | `thread/tokenUsage/updated` | `v2::ThreadTokenUsageUpdatedNotification` | turn token usage updated。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1022][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4374] |
| `TurnStarted` | `turn/started` | `v2::TurnStartedNotification` | turn created/started。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1023][E: codex-rs/app-server-protocol/src/protocol/v2.rs:5976] |
| `TurnCompleted` | `turn/completed` | `v2::TurnCompletedNotification` | turn terminal event；payload 带 `thread_id` 和 `turn`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1025][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6003][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6004] |
| `TurnDiffUpdated` | `turn/diff/updated` | `v2::TurnDiffUpdatedNotification` | turn diff summary updated。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1027][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6021] |
| `TurnPlanUpdated` | `turn/plan/updated` | `v2::TurnPlanUpdatedNotification` | plan explanation 和 steps/status updated。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1028][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6031][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6032][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6033][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6034][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6041][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6042] |
| `ItemStarted` | `item/started` | `v2::ItemStartedNotification` | thread item created/in progress。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1029][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6076] |
| `ItemGuardianApprovalReviewStarted` | `item/autoApprovalReview/started` | `v2::ItemGuardianApprovalReviewStartedNotification` | guardian approval review item started。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1030][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6087] |
| `ItemGuardianApprovalReviewCompleted` | `item/autoApprovalReview/completed` | `v2::ItemGuardianApprovalReviewCompletedNotification` | guardian approval review item completed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1031][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6113] |
| `ItemCompleted` | `item/completed` | `v2::ItemCompletedNotification` | item terminal event；payload 带 completed `item`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1032][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6139] |
| `RawResponseItemCompleted` | `rawResponseItem/completed` | `v2::RawResponseItemCompletedNotification` | raw Responses API item completed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1034][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6148][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6149][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6150] |
| `AgentMessageDelta` | `item/agentMessage/delta` | `v2::AgentMessageDeltaNotification` | assistant message text delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1035][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6161] |
| `PlanDelta` | `item/plan/delta` | `v2::PlanDeltaNotification` | plan item delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1037][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6169][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6173] |
| `CommandExecutionOutputDelta` | `item/commandExecution/outputDelta` | `v2::CommandExecutionOutputDeltaNotification` | thread command execution output delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1040][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6226] |
| `TerminalInteraction` | `item/commandExecution/terminalInteraction` | `v2::TerminalInteractionNotification` | terminal interaction event。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1041][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6218][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6219] |
| `FileChangeOutputDelta` | `item/fileChange/outputDelta` | `v2::FileChangeOutputDeltaNotification` | file change output delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1042][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6256] |
| `FileChangePatchUpdated` | `item/fileChange/patchUpdated` | `v2::FileChangePatchUpdatedNotification` | file patch updated。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1043][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6266] |
| `ServerRequestResolved` | `serverRequest/resolved` | `v2::ServerRequestResolvedNotification` | server request 已有 client response。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1044][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6278] |
| `ReasoningSummaryTextDelta` | `item/reasoning/summaryTextDelta` | `v2::ReasoningSummaryTextDeltaNotification` | reasoning summary text delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1053][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6183][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6185] |
| `ReasoningSummaryPartAdded` | `item/reasoning/summaryPartAdded` | `v2::ReasoningSummaryPartAddedNotification` | reasoning summary part added。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1054][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6196] |
| `ReasoningTextDelta` | `item/reasoning/textDelta` | `v2::ReasoningTextDeltaNotification` | raw reasoning text delta。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1055][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6202] |
| `ContextCompacted` | `thread/compacted` | `v2::ContextCompactedNotification` | context compaction completed。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1057][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6368][E: codex-rs/app-server-protocol/src/protocol/v2.rs:6369] |
| `ModelRerouted` | `model/rerouted` | `v2::ModelReroutedNotification` | turn model rerouted，payload 带 from/to model 和 reason。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1058][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7200][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7201][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7202][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7203][E: codex-rs/app-server-protocol/src/protocol/v2.rs:7204] |

## 控制流与设计动机

thread/turn/item notifications 把长期 conversation state 拆成 lifecycle、streaming delta、terminal item、terminal turn 四层，客户端可以用同一 notification stream 更新 thread list、live transcript、plan UI、tool output UI 和 final response。[I] `ServerRequestResolved` 把 server->client request 的结束事件也投到 notification stream，使客户端即使不拥有原始 request handler，也能把 pending approval/input UI 从 active 状态移除。[I]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2.rs`

## 相关

- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.server-requests` -> [server->client requests](server-requests.md)
