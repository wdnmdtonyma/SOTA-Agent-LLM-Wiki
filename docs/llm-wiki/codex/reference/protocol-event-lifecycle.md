---
id: ref.protocol-event-lifecycle
title: Protocol EventMsg 生命周期事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Event, EventMsg, EnvironmentConnectionEvent, TurnStartedEvent, TurnCompleteEvent, ThreadSettingsAppliedEvent, SessionConfiguredEvent, TurnAbortedEvent, ThreadGoalUpdatedEvent, ThreadQueueChangedEvent, SubAgentActivityEvent, AuthRecoveryEvent]
related: [spine.turn-end-to-end, subsys.core.turn-engine, ref.protocol-event-streaming, ref.protocol-op]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `Event` 是 agent 到客户端的 queue entry,用 submission correlation `id` 和 `msg: EventMsg` 承载 response payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1340][E: codex-rs/protocol/src/protocol.rs:1342][E: codex-rs/protocol/src/protocol.rs:1344][E: codex-rs/protocol/src/protocol.rs:1355][E: codex-rs/protocol/src/protocol.rs:1358]

## 能回答的问题

- 当前 `EventMsg` 一共有多少个变体,生命周期/control 子集覆盖哪些?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- session、thread settings、thread goal、thread queue、turn abort、review mode、shutdown 分别对应哪些 event?
- approval、permission、elicitation、guardian、auth recovery 请求分别对应哪些 event?
- collab agent 和 v2 sub-agent activity 的 event 名称有哪些?

## EventMsg 分区

当前 `EventMsg` enum 有 83 个变体，从 `Error` 到 `SubAgentActivity`。[E: codex-rs/protocol/src/protocol.rs:1358][E: codex-rs/protocol/src/protocol.rs:1360][E: codex-rs/protocol/src/protocol.rs:1367][E: codex-rs/protocol/src/protocol.rs:1370][E: codex-rs/protocol/src/protocol.rs:1574] 其中 31 个内容/item/tool/patch streaming 变体由 `ref.protocol-event-streaming` 收录；本节点收录其余 52 个 lifecycle/control 变体。

`TurnStarted` 的 wire name 保留 v1 `task_started`,同时接受 `turn_started` alias；`TurnComplete` 的 wire name 保留 v1 `task_complete`,同时接受 `turn_complete` alias。[E: codex-rs/protocol/src/protocol.rs:1408][E: codex-rs/protocol/src/protocol.rs:1417][E: codex-rs/protocol/src/protocol.rs:1417][E: codex-rs/protocol/src/protocol.rs:1418]

`TokenUsage` 仍带 provider-reported `codex_rollout_budget_units`。该字段明确 `skip_serializing`、`schemars(skip)`、`ts(skip)`，因此供 core 内部 rollout-budget 计算使用，不扩张 `TokenCount` 的公开 JSON/TS schema。[E: codex-rs/protocol/src/protocol.rs:2241][E: codex-rs/protocol/src/protocol.rs:2256][E: codex-rs/protocol/src/protocol.rs:2257][E: codex-rs/protocol/src/protocol.rs:2258][E: codex-rs/protocol/src/protocol.rs:2259][E: codex-rs/protocol/src/protocol.rs:1422]

`EventMsg` 仍是 83 个变体；lifecycle 页 52 + streaming 页 31。[E: codex-rs/protocol/src/protocol.rs:1358][E: codex-rs/protocol/src/protocol.rs:1574]

## Lifecycle / control EventMsg 表

| # | Variant | Payload | 生命周期/control 含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败；payload 含 message 和 optional `codex_error_info`。[E: codex-rs/protocol/src/protocol.rs:1360] | `protocol.rs:1360` |
| 2 | `Warning` | `WarningEvent` | turn 继续执行但需要通知用户。[E: codex-rs/protocol/src/protocol.rs:1364] | `protocol.rs:1364` |
| 3 | `AuthRecoveryStarted` | `AuthRecoveryEvent` | provider-owned authentication recovery 已为本 turn 开始；payload 是 `provider` 与 `message`。[E: codex-rs/protocol/src/protocol.rs:1367][E: codex-rs/protocol/src/protocol.rs:2102] | `protocol.rs:1367` |
| 4 | `AuthRecoveryCompleted` | `AuthRecoveryEvent` | provider-owned authentication recovery 已完成本 turn。[E: codex-rs/protocol/src/protocol.rs:1370][E: codex-rs/protocol/src/protocol.rs:2102] | `protocol.rs:1370` |
| 5 | `GuardianWarning` | `WarningEvent` | Guardian automatic approval reviewer 发出的 warning。[E: codex-rs/protocol/src/protocol.rs:1373] | `protocol.rs:1373` |
| 6 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start。[E: codex-rs/protocol/src/protocol.rs:1376] | `protocol.rs:1376` |
| 7 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close。[E: codex-rs/protocol/src/protocol.rs:1382] | `protocol.rs:1382` |
| 8 | `ModelReroute` | `ModelRerouteEvent` | backend/model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1388] | `protocol.rs:1388` |
| 9 | `ModelVerification` | `ModelVerificationEvent` | backend 建议本 turn 需要额外 account verification。[E: codex-rs/protocol/src/protocol.rs:1391] | `protocol.rs:1391` |
| 10 | `TurnModerationMetadata` | `TurnModerationMetadataEvent` | first-party turn presentation 用 moderation metadata。[E: codex-rs/protocol/src/protocol.rs:1394] | `protocol.rs:1394` |
| 11 | `SafetyBuffering` | `SafetyBufferingEvent` | backend safety review buffering state。[E: codex-rs/protocol/src/protocol.rs:1397] | `protocol.rs:1397` |
| 12 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被自动或手动 compaction。[E: codex-rs/protocol/src/protocol.rs:1400] | `protocol.rs:1400` |
| 13 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃最后 N 个 user turns。[E: codex-rs/protocol/src/protocol.rs:1404] | `protocol.rs:1404` |
| 14 | `TurnStarted` | `TurnStartedEvent` | agent turn started,带 turn id、trace id、started time、context window、collaboration mode kind。[E: codex-rs/protocol/src/protocol.rs:1409] | `protocol.rs:1409` |
| 15 | `ThreadSettingsApplied` | `ThreadSettingsAppliedEvent` | correlated submission 的 persistent thread settings 已应用到 session config。[E: codex-rs/protocol/src/protocol.rs:1413] | `protocol.rs:1413` |
| 16 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 actions。[E: codex-rs/protocol/src/protocol.rs:1418] | `protocol.rs:1418` |
| 17 | `TokenCount` | `TokenCountEvent` | current session usage update,包括 totals 和 last turn；optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1422] | `protocol.rs:1422` |
| 18 | `SessionConfigured` | `SessionConfiguredEvent` | configure ack,返回 session/thread id、model/provider、approval/permission/settings 等 session snapshot。[E: codex-rs/protocol/src/protocol.rs:1440] | `protocol.rs:1440` |
| 19 | `EnvironmentConnected` | `EnvironmentConnectionEvent` | selected environment 完成 connection handshake；payload 是 `environment_id`。[E: codex-rs/protocol/src/protocol.rs:1348][E: codex-rs/protocol/src/protocol.rs:1443] | `protocol.rs:1443` |
| 20 | `EnvironmentDisconnected` | `EnvironmentConnectionEvent` | selected environment 丢失已建立的连接；复用同一个 environment-id payload。[E: codex-rs/protocol/src/protocol.rs:1446] | `protocol.rs:1446` |
| 21 | `ThreadGoalUpdated` | `ThreadGoalUpdatedEvent` | long-running goal metadata 更新。[E: codex-rs/protocol/src/protocol.rs:1449] | `protocol.rs:1449` |
| 22 | `ThreadQueueChanged` | `ThreadQueueChangedEvent` | durable thread-scoped user-message queue 发生变化。[E: codex-rs/protocol/src/protocol.rs:1452] | `protocol.rs:1452` |
| 23 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress。[E: codex-rs/protocol/src/protocol.rs:1455] | `protocol.rs:1455` |
| 24 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary。[E: codex-rs/protocol/src/protocol.rs:1458] | `protocol.rs:1458` |
| 25 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | command execution approval prompt。[E: codex-rs/protocol/src/protocol.rs:1486] | `protocol.rs:1486` |
| 26 | `RequestPermissions` | `RequestPermissionsEvent` | `request_permissions` tool 向客户端发起权限请求。[E: codex-rs/protocol/src/protocol.rs:1488] | `protocol.rs:1488` |
| 27 | `RequestUserInput` | `RequestUserInputEvent` | `request_user_input` tool 向客户端发起用户输入请求。[E: codex-rs/protocol/src/protocol.rs:1490] | `protocol.rs:1490` |
| 28 | `ElicitationRequest` | `ElicitationRequestEvent` | MCP elicitation request event。[E: codex-rs/protocol/src/protocol.rs:1496] | `protocol.rs:1496` |
| 29 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | apply_patch approval prompt。[E: codex-rs/protocol/src/protocol.rs:1498] | `protocol.rs:1498` |
| 30 | `GuardianAssessment` | `GuardianAssessmentEvent` | Guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1501] | `protocol.rs:1501` |
| 31 | `DeprecationNotice` | `DeprecationNoticeEvent` | deprecated feature guidance。[E: codex-rs/protocol/src/protocol.rs:1505] | `protocol.rs:1505` |
| 32 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect,系统正在处理 retry/backoff 等恢复路径。[E: codex-rs/protocol/src/protocol.rs:1509] | `protocol.rs:1509` |
| 33 | `TurnDiff` | `TurnDiffEvent` | turn diff payload,字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1521] | `protocol.rs:1521` |
| 34 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices list response。[E: codex-rs/protocol/src/protocol.rs:1524] | `protocol.rs:1524` |
| 35 | `PlanUpdate` | `UpdatePlanArgs` | update_plan tool/checklist 状态事件。[E: codex-rs/protocol/src/protocol.rs:1526] | `protocol.rs:1526` |
| 36 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification。[E: codex-rs/protocol/src/protocol.rs:1528] | `protocol.rs:1528` |
| 37 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1531] | `protocol.rs:1531` |
| 38 | `EnteredReviewMode` | `EnteredReviewModeEvent` | legacy entered-review notification。[E: codex-rs/protocol/src/protocol.rs:1534] | `protocol.rs:1534` |
| 39 | `ExitedReviewMode` | `ExitedReviewModeEvent` | exited review mode,可带 optional final review output。[E: codex-rs/protocol/src/protocol.rs:1537] | `protocol.rs:1537` |
| 40 | `HookStarted` | `HookStartedEvent` | hook run started。[E: codex-rs/protocol/src/protocol.rs:1544] | `protocol.rs:1544` |
| 41 | `HookCompleted` | `HookCompletedEvent` | hook run completed。[E: codex-rs/protocol/src/protocol.rs:1545] | `protocol.rs:1545` |
| 42 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collab agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1553] | `protocol.rs:1553` |
| 43 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collab agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1555] | `protocol.rs:1555` |
| 44 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collab agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1557] | `protocol.rs:1557` |
| 45 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collab agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1559] | `protocol.rs:1559` |
| 46 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collab waiting begin。[E: codex-rs/protocol/src/protocol.rs:1561] | `protocol.rs:1561` |
| 47 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collab waiting end。[E: codex-rs/protocol/src/protocol.rs:1563] | `protocol.rs:1563` |
| 48 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collab close begin。[E: codex-rs/protocol/src/protocol.rs:1565] | `protocol.rs:1565` |
| 49 | `CollabCloseEnd` | `CollabCloseEndEvent` | collab close end。[E: codex-rs/protocol/src/protocol.rs:1567] | `protocol.rs:1567` |
| 50 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collab resume begin。[E: codex-rs/protocol/src/protocol.rs:1569] | `protocol.rs:1569` |
| 51 | `CollabResumeEnd` | `CollabResumeEndEvent` | collab resume end。[E: codex-rs/protocol/src/protocol.rs:1571] | `protocol.rs:1571` |
| 52 | `SubAgentActivity` | `SubAgentActivityEvent` | path-based v2 sub-agent activity。[E: codex-rs/protocol/src/protocol.rs:1574] | `protocol.rs:1574` |

## 设计动机速记

- `Event` 的 submission correlation `id` 与 `EventMsg` payload 分离,让同一种 payload 可以在不同 submission 上复用。[E: codex-rs/protocol/src/protocol.rs:1340][E: codex-rs/protocol/src/protocol.rs:1342][E: codex-rs/protocol/src/protocol.rs:1344]
- lifecycle/control 与 streaming 是文档分区；Rust 源码里它们都是同一个 `EventMsg` enum 的 sibling variants。[E: codex-rs/protocol/src/protocol.rs:1358]
- v1 wire names `task_started` / `task_complete` 仍是 serialized names,`turn_started` / `turn_complete` 只是 accepted aliases。[E: codex-rs/protocol/src/protocol.rs:1408][E: codex-rs/protocol/src/protocol.rs:1417]
- `AuthRecoveryStarted` / `AuthRecoveryCompleted` 复用同一个 `AuthRecoveryEvent`，只区分 recovery 阶段。[E: codex-rs/protocol/src/protocol.rs:1367][E: codex-rs/protocol/src/protocol.rs:1370][E: codex-rs/protocol/src/protocol.rs:2102]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
