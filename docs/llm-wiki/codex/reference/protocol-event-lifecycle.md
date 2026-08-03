---
id: ref.protocol-event-lifecycle
title: Protocol EventMsg 生命周期事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Event, EventMsg, EnvironmentConnectionEvent, TurnStartedEvent, TurnCompleteEvent, ThreadSettingsAppliedEvent, SessionConfiguredEvent, TurnAbortedEvent, ThreadGoalUpdatedEvent, SubAgentActivityEvent]
related: [spine.turn-end-to-end, subsys.core.turn-engine, ref.protocol-event-streaming, ref.protocol-op]
evidence: explicit
status: verified
updated: 7750465934
---

> `Event` 是 agent 到客户端的 queue entry,用 submission correlation `id` 和 `msg: EventMsg` 承载 response payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1274][E: codex-rs/protocol/src/protocol.rs:1288]

## 能回答的问题

- 当前 `EventMsg` 一共有多少个变体,生命周期/control 子集覆盖哪些?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- session、thread settings、thread goal、turn abort、review mode、shutdown 分别对应哪些 event?
- approval、permission、elicitation、guardian 请求分别对应哪些 event?
- collab agent 和 v2 sub-agent activity 的 event 名称有哪些?

## EventMsg 分区

当前 `EventMsg` enum 仍有 80 个变体，从 `Error` 到 `SubAgentActivity`；相对 `61a44880a8` 没有 variant 增删。[E: codex-rs/protocol/src/protocol.rs:1288][E: codex-rs/protocol/src/protocol.rs:1290][E: codex-rs/protocol/src/protocol.rs:1494][I] 其中 31 个内容/item/tool/patch streaming 变体由 `ref.protocol-event-streaming` 收录；本节点收录其余 49 个 lifecycle/control 变体。[E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1470][I]

`TurnStarted` 的 wire name 保留 v1 `task_started`,同时接受 `turn_started` alias；`TurnComplete` 的 wire name 保留 v1 `task_complete`,同时接受 `turn_complete` alias。[E: codex-rs/protocol/src/protocol.rs:1331][E: codex-rs/protocol/src/protocol.rs:1332][E: codex-rs/protocol/src/protocol.rs:1340][E: codex-rs/protocol/src/protocol.rs:1341]

本轮没有新增 usage event，但 `TokenUsage` 增加 provider-reported `codex_rollout_budget_units`。该字段明确 `skip_serializing`、`schemars(skip)`、`ts(skip)`，因此供 core 内部 rollout-budget 计算使用，不扩张 `TokenCount` 的公开 JSON/TS schema。[E: codex-rs/protocol/src/protocol.rs:2064][E: codex-rs/protocol/src/protocol.rs:2078][E: codex-rs/protocol/src/protocol.rs:2080][E: codex-rs/protocol/src/protocol.rs:2081][E: codex-rs/protocol/src/protocol.rs:2082][E: codex-rs/protocol/src/protocol.rs:2083][E: codex-rs/protocol/src/protocol.rs:2154][E: codex-rs/protocol/src/protocol.rs:2155][I]

## Lifecycle / control EventMsg 表

| # | Variant | Payload | 生命周期/control 含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败；payload 含 message 和 optional `codex_error_info`。[E: codex-rs/protocol/src/protocol.rs:1290][E: codex-rs/protocol/src/protocol.rs:1931][E: codex-rs/protocol/src/protocol.rs:1932][E: codex-rs/protocol/src/protocol.rs:1934] | `protocol.rs:1290` |
| 2 | `Warning` | `WarningEvent` | turn 继续执行但需要通知用户。[E: codex-rs/protocol/src/protocol.rs:1294][E: codex-rs/protocol/src/protocol.rs:1947][E: codex-rs/protocol/src/protocol.rs:1948] | `protocol.rs:1294` |
| 3 | `GuardianWarning` | `WarningEvent` | Guardian automatic approval reviewer 发出的 warning。[E: codex-rs/protocol/src/protocol.rs:1297] | `protocol.rs:1297` |
| 4 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start,带 optional session id 与 version。[E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1645][E: codex-rs/protocol/src/protocol.rs:1646][E: codex-rs/protocol/src/protocol.rs:1647] | `protocol.rs:1300` |
| 5 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close,可带 reason。[E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:1656][E: codex-rs/protocol/src/protocol.rs:1658] | `protocol.rs:1306` |
| 6 | `ModelReroute` | `ModelRerouteEvent` | backend/model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1312][E: codex-rs/protocol/src/protocol.rs:1959][E: codex-rs/protocol/src/protocol.rs:1960][E: codex-rs/protocol/src/protocol.rs:1961] | `protocol.rs:1312` |
| 7 | `ModelVerification` | `ModelVerificationEvent` | backend 建议本 turn 需要额外 account verification。[E: codex-rs/protocol/src/protocol.rs:1315][E: codex-rs/protocol/src/protocol.rs:1973][E: codex-rs/protocol/src/protocol.rs:1974] | `protocol.rs:1315` |
| 8 | `TurnModerationMetadata` | `TurnModerationMetadataEvent` | first-party turn presentation 用 moderation metadata。[E: codex-rs/protocol/src/protocol.rs:1318][E: codex-rs/protocol/src/protocol.rs:1978][E: codex-rs/protocol/src/protocol.rs:1979] | `protocol.rs:1318` |
| 9 | `SafetyBuffering` | `SafetyBufferingEvent` | backend safety review buffering state,带 model、use cases、reasons、UI flag 和 optional faster model。[E: codex-rs/protocol/src/protocol.rs:1321][E: codex-rs/protocol/src/protocol.rs:1983][E: codex-rs/protocol/src/protocol.rs:1984][E: codex-rs/protocol/src/protocol.rs:1988] | `protocol.rs:1321` |
| 10 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被自动或手动 compaction。[E: codex-rs/protocol/src/protocol.rs:1324][E: codex-rs/protocol/src/protocol.rs:1992] | `protocol.rs:1324` |
| 11 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃最后 N 个 user turns。[E: codex-rs/protocol/src/protocol.rs:1327][E: codex-rs/protocol/src/protocol.rs:3667][E: codex-rs/protocol/src/protocol.rs:3669] | `protocol.rs:1327` |
| 12 | `TurnStarted` | `TurnStartedEvent` | agent turn started,带 turn id、trace id、started time、context window、collaboration mode kind。[E: codex-rs/protocol/src/protocol.rs:1332][E: codex-rs/protocol/src/protocol.rs:2021][E: codex-rs/protocol/src/protocol.rs:2022][E: codex-rs/protocol/src/protocol.rs:2034] | `protocol.rs:1332` |
| 13 | `ThreadSettingsApplied` | `ThreadSettingsAppliedEvent` | correlated submission 的 persistent thread settings 已应用到 session config。[E: codex-rs/protocol/src/protocol.rs:1336][E: codex-rs/protocol/src/protocol.rs:2038][E: codex-rs/protocol/src/protocol.rs:2039] | `protocol.rs:1336` |
| 14 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 actions,带 turn id、last agent message、completion time/duration/TTFT。[E: codex-rs/protocol/src/protocol.rs:1341][E: codex-rs/protocol/src/protocol.rs:1995][E: codex-rs/protocol/src/protocol.rs:1996][E: codex-rs/protocol/src/protocol.rs:2017] | `protocol.rs:1341` |
| 15 | `TokenCount` | `TokenCountEvent` | current session usage update,包括 totals 和 last turn；optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1345][E: codex-rs/protocol/src/protocol.rs:2154][E: codex-rs/protocol/src/protocol.rs:2156] | `protocol.rs:1345` |
| 16 | `SessionConfigured` | `SessionConfiguredEvent` | configure ack,返回 session/thread id、model/provider、approval/permission/settings 等 session snapshot。[E: codex-rs/protocol/src/protocol.rs:1363][E: codex-rs/protocol/src/protocol.rs:3928][E: codex-rs/protocol/src/protocol.rs:3929][E: codex-rs/protocol/src/protocol.rs:3953] | `protocol.rs:1363` |
| 17 | `EnvironmentConnected` | `EnvironmentConnectionEvent` | selected environment 完成 connection handshake；payload 是 `environment_id`。[E: codex-rs/protocol/src/protocol.rs:1278][E: codex-rs/protocol/src/protocol.rs:1279][E: codex-rs/protocol/src/protocol.rs:1366] | `protocol.rs:1366` |
| 18 | `EnvironmentDisconnected` | `EnvironmentConnectionEvent` | selected environment 丢失已建立的连接；复用同一个 environment-id payload。[E: codex-rs/protocol/src/protocol.rs:1278][E: codex-rs/protocol/src/protocol.rs:1279][E: codex-rs/protocol/src/protocol.rs:1369] | `protocol.rs:1369` |
| 19 | `ThreadGoalUpdated` | `ThreadGoalUpdatedEvent` | long-running goal metadata 更新,带 thread id、optional turn id 与 goal。[E: codex-rs/protocol/src/protocol.rs:1372][E: codex-rs/protocol/src/protocol.rs:4109][E: codex-rs/protocol/src/protocol.rs:4110][E: codex-rs/protocol/src/protocol.rs:4114] | `protocol.rs:1372` |
| 20 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress,带 server 与 startup status。[E: codex-rs/protocol/src/protocol.rs:1375][E: codex-rs/protocol/src/protocol.rs:3746][E: codex-rs/protocol/src/protocol.rs:3748][E: codex-rs/protocol/src/protocol.rs:3750] | `protocol.rs:1375` |
| 21 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary,带 ready/failed/cancelled lists。[E: codex-rs/protocol/src/protocol.rs:1378][E: codex-rs/protocol/src/protocol.rs:3776][E: codex-rs/protocol/src/protocol.rs:3777][E: codex-rs/protocol/src/protocol.rs:3779] | `protocol.rs:1378` |
| 22 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | command execution approval prompt。[E: codex-rs/protocol/src/protocol.rs:1406] | `protocol.rs:1406` |
| 23 | `RequestPermissions` | `RequestPermissionsEvent` | `request_permissions` tool 向客户端发起权限请求。[E: codex-rs/protocol/src/protocol.rs:1408] | `protocol.rs:1408` |
| 24 | `RequestUserInput` | `RequestUserInputEvent` | `request_user_input` tool 向客户端发起用户输入请求。[E: codex-rs/protocol/src/protocol.rs:1410] | `protocol.rs:1410` |
| 25 | `ElicitationRequest` | `ElicitationRequestEvent` | MCP elicitation request event。[E: codex-rs/protocol/src/protocol.rs:1416] | `protocol.rs:1416` |
| 26 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | apply_patch approval prompt。[E: codex-rs/protocol/src/protocol.rs:1418] | `protocol.rs:1418` |
| 27 | `GuardianAssessment` | `GuardianAssessmentEvent` | Guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1421] | `protocol.rs:1421` |
| 28 | `DeprecationNotice` | `DeprecationNoticeEvent` | deprecated feature guidance,带 summary 和 optional details。[E: codex-rs/protocol/src/protocol.rs:1425][E: codex-rs/protocol/src/protocol.rs:3658][E: codex-rs/protocol/src/protocol.rs:3660][E: codex-rs/protocol/src/protocol.rs:3663] | `protocol.rs:1425` |
| 29 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect,系统正在处理 retry/backoff 等恢复路径。[E: codex-rs/protocol/src/protocol.rs:1429][E: codex-rs/protocol/src/protocol.rs:3673][E: codex-rs/protocol/src/protocol.rs:3674][E: codex-rs/protocol/src/protocol.rs:3681] | `protocol.rs:1429` |
| 30 | `TurnDiff` | `TurnDiffEvent` | turn diff payload,字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1441][E: codex-rs/protocol/src/protocol.rs:3741][E: codex-rs/protocol/src/protocol.rs:3742] | `protocol.rs:1441` |
| 31 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices list response。[E: codex-rs/protocol/src/protocol.rs:1444][E: codex-rs/protocol/src/protocol.rs:3813][E: codex-rs/protocol/src/protocol.rs:3814] | `protocol.rs:1444` |
| 32 | `PlanUpdate` | `UpdatePlanArgs` | update_plan tool/checklist 状态事件。[E: codex-rs/protocol/src/protocol.rs:1446] | `protocol.rs:1446` |
| 33 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification,带 optional turn id、reason、completed time 与 duration。[E: codex-rs/protocol/src/protocol.rs:1448][E: codex-rs/protocol/src/protocol.rs:4213][E: codex-rs/protocol/src/protocol.rs:4214][E: codex-rs/protocol/src/protocol.rs:4227] | `protocol.rs:1448` |
| 34 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1451] | `protocol.rs:1451` |
| 35 | `EnteredReviewMode` | `EnteredReviewModeEvent` | legacy entered-review notification；payload 带 target，以及 optional hint、turn id 和 item id。[E: codex-rs/protocol/src/protocol.rs:1454][E: codex-rs/protocol/src/protocol.rs:1903] | `protocol.rs:1454` |
| 36 | `ExitedReviewMode` | `ExitedReviewModeEvent` | exited review mode,可带 optional final review output。[E: codex-rs/protocol/src/protocol.rs:1457][E: codex-rs/protocol/src/protocol.rs:1918][E: codex-rs/protocol/src/protocol.rs:1925] | `protocol.rs:1457` |
| 37 | `HookStarted` | `HookStartedEvent` | hook run started,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1464][E: codex-rs/protocol/src/protocol.rs:1613][E: codex-rs/protocol/src/protocol.rs:1614][E: codex-rs/protocol/src/protocol.rs:1615] | `protocol.rs:1464` |
| 38 | `HookCompleted` | `HookCompletedEvent` | hook run completed,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1465][E: codex-rs/protocol/src/protocol.rs:1620][E: codex-rs/protocol/src/protocol.rs:1621][E: codex-rs/protocol/src/protocol.rs:1622] | `protocol.rs:1465` |
| 39 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collab agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1473][E: codex-rs/protocol/src/protocol.rs:4240][E: codex-rs/protocol/src/protocol.rs:4242][E: codex-rs/protocol/src/protocol.rs:4251] | `protocol.rs:1473` |
| 40 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collab agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1475][E: codex-rs/protocol/src/protocol.rs:4281][E: codex-rs/protocol/src/protocol.rs:4283][E: codex-rs/protocol/src/protocol.rs:4304] | `protocol.rs:1475` |
| 41 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collab agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1477][E: codex-rs/protocol/src/protocol.rs:4308][E: codex-rs/protocol/src/protocol.rs:4310][E: codex-rs/protocol/src/protocol.rs:4319] | `protocol.rs:1477` |
| 42 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collab agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1479][E: codex-rs/protocol/src/protocol.rs:4323][E: codex-rs/protocol/src/protocol.rs:4325][E: codex-rs/protocol/src/protocol.rs:4342] | `protocol.rs:1479` |
| 43 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collab waiting begin。[E: codex-rs/protocol/src/protocol.rs:1481][E: codex-rs/protocol/src/protocol.rs:4367][E: codex-rs/protocol/src/protocol.rs:4371][E: codex-rs/protocol/src/protocol.rs:4378] | `protocol.rs:1481` |
| 44 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collab waiting end。[E: codex-rs/protocol/src/protocol.rs:1483][E: codex-rs/protocol/src/protocol.rs:4382][E: codex-rs/protocol/src/protocol.rs:4384][E: codex-rs/protocol/src/protocol.rs:4393] | `protocol.rs:1483` |
| 45 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collab close begin。[E: codex-rs/protocol/src/protocol.rs:1485][E: codex-rs/protocol/src/protocol.rs:4397][E: codex-rs/protocol/src/protocol.rs:4399][E: codex-rs/protocol/src/protocol.rs:4405] | `protocol.rs:1485` |
| 46 | `CollabCloseEnd` | `CollabCloseEndEvent` | collab close end。[E: codex-rs/protocol/src/protocol.rs:1487][E: codex-rs/protocol/src/protocol.rs:4409][E: codex-rs/protocol/src/protocol.rs:4411][E: codex-rs/protocol/src/protocol.rs:4426] | `protocol.rs:1487` |
| 47 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collab resume begin。[E: codex-rs/protocol/src/protocol.rs:1489][E: codex-rs/protocol/src/protocol.rs:4430][E: codex-rs/protocol/src/protocol.rs:4432][E: codex-rs/protocol/src/protocol.rs:4438] | `protocol.rs:1489` |
| 48 | `CollabResumeEnd` | `CollabResumeEndEvent` | collab resume end。[E: codex-rs/protocol/src/protocol.rs:1491][E: codex-rs/protocol/src/protocol.rs:4448][E: codex-rs/protocol/src/protocol.rs:4450][E: codex-rs/protocol/src/protocol.rs:4465] | `protocol.rs:1491` |
| 49 | `SubAgentActivity` | `SubAgentActivityEvent` | path-based v2 sub-agent activity,带 event id、time、agent thread/path 和 activity kind。[E: codex-rs/protocol/src/protocol.rs:1494][E: codex-rs/protocol/src/protocol.rs:4355][E: codex-rs/protocol/src/protocol.rs:4356][E: codex-rs/protocol/src/protocol.rs:4363] | `protocol.rs:1494` |

## 设计动机速记

- `Event` 的 submission correlation `id` 与 `EventMsg` payload 分离,让同一种 payload 可以在不同 submission 上复用。[E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1274][I]
- lifecycle/control 与 streaming 是文档分区；Rust 源码里它们都是同一个 `EventMsg` enum 的 sibling variants。[E: codex-rs/protocol/src/protocol.rs:1288][I]
- v1 wire names `task_started` / `task_complete` 仍是 serialized names,`turn_started` / `turn_complete` 只是 accepted aliases。[E: codex-rs/protocol/src/protocol.rs:1331][E: codex-rs/protocol/src/protocol.rs:1340]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
