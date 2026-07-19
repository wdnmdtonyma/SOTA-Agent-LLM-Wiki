---
id: ref.protocol-event-lifecycle
title: Protocol EventMsg 生命周期事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Event, EventMsg, EnvironmentConnectionEvent, TurnStartedEvent, TurnCompleteEvent, ThreadSettingsAppliedEvent, SessionConfiguredEvent, TurnAbortedEvent, ThreadGoalUpdatedEvent, EnteredReviewModeEvent, SubAgentActivityEvent]
related: [spine.turn-end-to-end, subsys.core.turn-engine, ref.protocol-event-streaming, ref.protocol-op]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `Event` 是 agent 到客户端的 queue entry,用 submission correlation `id` 和 `msg: EventMsg` 承载 response payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1267][E: codex-rs/protocol/src/protocol.rs:1271][E: codex-rs/protocol/src/protocol.rs:1285]

## 能回答的问题

- 当前 `EventMsg` 一共有多少个变体,生命周期/control 子集覆盖哪些?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- session、thread settings、thread goal、turn abort、review mode、shutdown 分别对应哪些 event?
- approval、permission、elicitation、guardian 请求分别对应哪些 event?
- collab agent 和 v2 sub-agent activity 的 event 名称有哪些?

## EventMsg 分区

当前 `EventMsg` enum 有 80 个变体,从 `Error` 到 `SubAgentActivity`。[E: codex-rs/protocol/src/protocol.rs:1285][E: codex-rs/protocol/src/protocol.rs:1287][E: codex-rs/protocol/src/protocol.rs:1494] 其中 31 个内容/item/tool/patch streaming 变体由 `ref.protocol-event-streaming` 收录；本节点收录其余 49 个 lifecycle/control 变体。[E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1467][I]

`TurnStarted` 的 wire name 保留 v1 `task_started`,同时接受 `turn_started` alias；`TurnComplete` 的 wire name 保留 v1 `task_complete`,同时接受 `turn_complete` alias。[E: codex-rs/protocol/src/protocol.rs:1328][E: codex-rs/protocol/src/protocol.rs:1329][E: codex-rs/protocol/src/protocol.rs:1337][E: codex-rs/protocol/src/protocol.rs:1338]

## Lifecycle / control EventMsg 表

| # | Variant | Payload | 生命周期/control 含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败；payload 含 message 和 optional `codex_error_info`。[E: codex-rs/protocol/src/protocol.rs:1287][E: codex-rs/protocol/src/protocol.rs:1925][E: codex-rs/protocol/src/protocol.rs:1926][E: codex-rs/protocol/src/protocol.rs:1928] | `protocol.rs:1269` |
| 2 | `Warning` | `WarningEvent` | turn 继续执行但需要通知用户。[E: codex-rs/protocol/src/protocol.rs:1291][E: codex-rs/protocol/src/protocol.rs:1941][E: codex-rs/protocol/src/protocol.rs:1942] | `protocol.rs:1273` |
| 3 | `GuardianWarning` | `WarningEvent` | Guardian automatic approval reviewer 发出的 warning。[E: codex-rs/protocol/src/protocol.rs:1294] | `protocol.rs:1276` |
| 4 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start,带 optional session id 与 version。[E: codex-rs/protocol/src/protocol.rs:1297][E: codex-rs/protocol/src/protocol.rs:1642][E: codex-rs/protocol/src/protocol.rs:1643][E: codex-rs/protocol/src/protocol.rs:1644] | `protocol.rs:1279` |
| 5 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close,可带 reason。[E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1653][E: codex-rs/protocol/src/protocol.rs:1655] | `protocol.rs:1285` |
| 6 | `ModelReroute` | `ModelRerouteEvent` | backend/model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1309][E: codex-rs/protocol/src/protocol.rs:1953][E: codex-rs/protocol/src/protocol.rs:1954][E: codex-rs/protocol/src/protocol.rs:1955] | `protocol.rs:1291` |
| 7 | `ModelVerification` | `ModelVerificationEvent` | backend 建议本 turn 需要额外 account verification。[E: codex-rs/protocol/src/protocol.rs:1312][E: codex-rs/protocol/src/protocol.rs:1967][E: codex-rs/protocol/src/protocol.rs:1968] | `protocol.rs:1294` |
| 8 | `TurnModerationMetadata` | `TurnModerationMetadataEvent` | first-party turn presentation 用 moderation metadata。[E: codex-rs/protocol/src/protocol.rs:1315][E: codex-rs/protocol/src/protocol.rs:1972][E: codex-rs/protocol/src/protocol.rs:1973] | `protocol.rs:1297` |
| 9 | `SafetyBuffering` | `SafetyBufferingEvent` | backend safety review buffering state,带 model、use cases、reasons、UI flag 和 optional faster model。[E: codex-rs/protocol/src/protocol.rs:1318][E: codex-rs/protocol/src/protocol.rs:1977][E: codex-rs/protocol/src/protocol.rs:1978][E: codex-rs/protocol/src/protocol.rs:1982] | `protocol.rs:1300` |
| 10 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被自动或手动 compaction。[E: codex-rs/protocol/src/protocol.rs:1321][E: codex-rs/protocol/src/protocol.rs:1986] | `protocol.rs:1303` |
| 11 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃最后 N 个 user turns。[E: codex-rs/protocol/src/protocol.rs:1324][E: codex-rs/protocol/src/protocol.rs:3643][E: codex-rs/protocol/src/protocol.rs:3645] | `protocol.rs:1306` |
| 12 | `TurnStarted` | `TurnStartedEvent` | agent turn started,带 turn id、trace id、started time、context window、collaboration mode kind。[E: codex-rs/protocol/src/protocol.rs:1329][E: codex-rs/protocol/src/protocol.rs:2015][E: codex-rs/protocol/src/protocol.rs:2016][E: codex-rs/protocol/src/protocol.rs:2028] | `protocol.rs:1311` |
| 13 | `ThreadSettingsApplied` | `ThreadSettingsAppliedEvent` | correlated submission 的 persistent thread settings 已应用到 session config。[E: codex-rs/protocol/src/protocol.rs:1333][E: codex-rs/protocol/src/protocol.rs:2032][E: codex-rs/protocol/src/protocol.rs:2033] | `protocol.rs:1315` |
| 14 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 actions,带 turn id、last agent message、completion time/duration/TTFT。[E: codex-rs/protocol/src/protocol.rs:1338][E: codex-rs/protocol/src/protocol.rs:1989][E: codex-rs/protocol/src/protocol.rs:1990][E: codex-rs/protocol/src/protocol.rs:2011] | `protocol.rs:1320` |
| 15 | `TokenCount` | `TokenCountEvent` | current session usage update,包括 totals 和 last turn；optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1342][E: codex-rs/protocol/src/protocol.rs:2143][E: codex-rs/protocol/src/protocol.rs:2145] | `protocol.rs:1324` |
| 16 | `SessionConfigured` | `SessionConfiguredEvent` | configure ack,返回 session/thread id、model/provider、approval/permission/settings 等 session snapshot。[E: codex-rs/protocol/src/protocol.rs:1360][E: codex-rs/protocol/src/protocol.rs:3902][E: codex-rs/protocol/src/protocol.rs:3903][E: codex-rs/protocol/src/protocol.rs:3927] | `protocol.rs:1342` |
| 16a | `EnvironmentConnected` | `EnvironmentConnectionEvent` | selected environment 完成 connection handshake；payload 是 `environment_id`。[E: codex-rs/protocol/src/protocol.rs:1274][E: codex-rs/protocol/src/protocol.rs:1276][E: codex-rs/protocol/src/protocol.rs:1363] | `protocol.rs:1363` |
| 16b | `EnvironmentDisconnected` | `EnvironmentConnectionEvent` | selected environment 丢失已建立的连接；复用同一个 environment-id payload。[E: codex-rs/protocol/src/protocol.rs:1365][E: codex-rs/protocol/src/protocol.rs:1366] | `protocol.rs:1366` |
| 17 | `ThreadGoalUpdated` | `ThreadGoalUpdatedEvent` | long-running goal metadata 更新,带 thread id、optional turn id 与 goal。[E: codex-rs/protocol/src/protocol.rs:1369][E: codex-rs/protocol/src/protocol.rs:4083][E: codex-rs/protocol/src/protocol.rs:4084][E: codex-rs/protocol/src/protocol.rs:4088] | `protocol.rs:1345` |
| 18 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress,带 server 与 startup status。[E: codex-rs/protocol/src/protocol.rs:1372][E: codex-rs/protocol/src/protocol.rs:3722][E: codex-rs/protocol/src/protocol.rs:3724][E: codex-rs/protocol/src/protocol.rs:3726] | `protocol.rs:1348` |
| 19 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary,带 ready/failed/cancelled lists。[E: codex-rs/protocol/src/protocol.rs:1375][E: codex-rs/protocol/src/protocol.rs:3752][E: codex-rs/protocol/src/protocol.rs:3753][E: codex-rs/protocol/src/protocol.rs:3755] | `protocol.rs:1351` |
| 20 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | command execution approval prompt。[E: codex-rs/protocol/src/protocol.rs:1403] | `protocol.rs:1379` |
| 21 | `RequestPermissions` | `RequestPermissionsEvent` | `request_permissions` tool 向客户端发起权限请求。[E: codex-rs/protocol/src/protocol.rs:1405] | `protocol.rs:1381` |
| 22 | `RequestUserInput` | `RequestUserInputEvent` | `request_user_input` tool 向客户端发起用户输入请求。[E: codex-rs/protocol/src/protocol.rs:1407] | `protocol.rs:1383` |
| 23 | `ElicitationRequest` | `ElicitationRequestEvent` | MCP elicitation request event。[E: codex-rs/protocol/src/protocol.rs:1413] | `protocol.rs:1389` |
| 24 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | apply_patch approval prompt。[E: codex-rs/protocol/src/protocol.rs:1415] | `protocol.rs:1391` |
| 25 | `GuardianAssessment` | `GuardianAssessmentEvent` | Guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1418] | `protocol.rs:1394` |
| 26 | `DeprecationNotice` | `DeprecationNoticeEvent` | deprecated feature guidance,带 summary 和 optional details。[E: codex-rs/protocol/src/protocol.rs:1422][E: codex-rs/protocol/src/protocol.rs:3634][E: codex-rs/protocol/src/protocol.rs:3636][E: codex-rs/protocol/src/protocol.rs:3639] | `protocol.rs:1398` |
| 27 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect,系统正在处理 retry/backoff 等恢复路径。[E: codex-rs/protocol/src/protocol.rs:1426][E: codex-rs/protocol/src/protocol.rs:3649][E: codex-rs/protocol/src/protocol.rs:3650][E: codex-rs/protocol/src/protocol.rs:3657] | `protocol.rs:1402` |
| 28 | `TurnDiff` | `TurnDiffEvent` | turn diff payload,字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1438][E: codex-rs/protocol/src/protocol.rs:3717][E: codex-rs/protocol/src/protocol.rs:3718] | `protocol.rs:1414` |
| 29 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices list response。[E: codex-rs/protocol/src/protocol.rs:1441][E: codex-rs/protocol/src/protocol.rs:3787][E: codex-rs/protocol/src/protocol.rs:3788] | `protocol.rs:1417` |
| 30 | `PlanUpdate` | `UpdatePlanArgs` | update_plan tool/checklist 状态事件。[E: codex-rs/protocol/src/protocol.rs:1443] | `protocol.rs:1419` |
| 31 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification,带 optional turn id、reason、completed time 与 duration。[E: codex-rs/protocol/src/protocol.rs:1445][E: codex-rs/protocol/src/protocol.rs:4174][E: codex-rs/protocol/src/protocol.rs:4175][E: codex-rs/protocol/src/protocol.rs:4188] | `protocol.rs:1421` |
| 32 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1448] | `protocol.rs:1424` |
| 33 | `EnteredReviewMode` | `EnteredReviewModeEvent` | legacy entered-review notification；payload 带 target，以及 optional hint、turn id 和 item id。[E: codex-rs/protocol/src/protocol.rs:1451][E: codex-rs/protocol/src/protocol.rs:1897][E: codex-rs/protocol/src/protocol.rs:1909] | `protocol.rs:1451` |
| 34 | `ExitedReviewMode` | `ExitedReviewModeEvent` | exited review mode,可带 optional final review output。[E: codex-rs/protocol/src/protocol.rs:1454][E: codex-rs/protocol/src/protocol.rs:1912][E: codex-rs/protocol/src/protocol.rs:1919] | `protocol.rs:1430` |
| 35 | `HookStarted` | `HookStartedEvent` | hook run started,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1461][E: codex-rs/protocol/src/protocol.rs:1610][E: codex-rs/protocol/src/protocol.rs:1611][E: codex-rs/protocol/src/protocol.rs:1612] | `protocol.rs:1436` |
| 36 | `HookCompleted` | `HookCompletedEvent` | hook run completed,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1462][E: codex-rs/protocol/src/protocol.rs:1617][E: codex-rs/protocol/src/protocol.rs:1618][E: codex-rs/protocol/src/protocol.rs:1619] | `protocol.rs:1437` |
| 37 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collab agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1470][E: codex-rs/protocol/src/protocol.rs:4201][E: codex-rs/protocol/src/protocol.rs:4203][E: codex-rs/protocol/src/protocol.rs:4212] | `protocol.rs:1445` |
| 38 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collab agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1472][E: codex-rs/protocol/src/protocol.rs:4242][E: codex-rs/protocol/src/protocol.rs:4244][E: codex-rs/protocol/src/protocol.rs:4265] | `protocol.rs:1447` |
| 39 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collab agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1474][E: codex-rs/protocol/src/protocol.rs:4269][E: codex-rs/protocol/src/protocol.rs:4271][E: codex-rs/protocol/src/protocol.rs:4280] | `protocol.rs:1449` |
| 40 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collab agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1476][E: codex-rs/protocol/src/protocol.rs:4284][E: codex-rs/protocol/src/protocol.rs:4286][E: codex-rs/protocol/src/protocol.rs:4303] | `protocol.rs:1451` |
| 41 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collab waiting begin。[E: codex-rs/protocol/src/protocol.rs:1478][E: codex-rs/protocol/src/protocol.rs:4328][E: codex-rs/protocol/src/protocol.rs:4332][E: codex-rs/protocol/src/protocol.rs:4339] | `protocol.rs:1453` |
| 42 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collab waiting end。[E: codex-rs/protocol/src/protocol.rs:1480][E: codex-rs/protocol/src/protocol.rs:4343][E: codex-rs/protocol/src/protocol.rs:4345][E: codex-rs/protocol/src/protocol.rs:4354] | `protocol.rs:1455` |
| 43 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collab close begin。[E: codex-rs/protocol/src/protocol.rs:1482][E: codex-rs/protocol/src/protocol.rs:4358][E: codex-rs/protocol/src/protocol.rs:4360][E: codex-rs/protocol/src/protocol.rs:4366] | `protocol.rs:1457` |
| 44 | `CollabCloseEnd` | `CollabCloseEndEvent` | collab close end。[E: codex-rs/protocol/src/protocol.rs:1484][E: codex-rs/protocol/src/protocol.rs:4370][E: codex-rs/protocol/src/protocol.rs:4372][E: codex-rs/protocol/src/protocol.rs:4387] | `protocol.rs:1459` |
| 45 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collab resume begin。[E: codex-rs/protocol/src/protocol.rs:1486][E: codex-rs/protocol/src/protocol.rs:4391][E: codex-rs/protocol/src/protocol.rs:4393][E: codex-rs/protocol/src/protocol.rs:4399] | `protocol.rs:1461` |
| 46 | `CollabResumeEnd` | `CollabResumeEndEvent` | collab resume end。[E: codex-rs/protocol/src/protocol.rs:1488][E: codex-rs/protocol/src/protocol.rs:4409][E: codex-rs/protocol/src/protocol.rs:4411][E: codex-rs/protocol/src/protocol.rs:4426] | `protocol.rs:1463` |
| 47 | `SubAgentActivity` | `SubAgentActivityEvent` | path-based v2 sub-agent activity,带 event id、time、agent thread/path 和 activity kind。[E: codex-rs/protocol/src/protocol.rs:1491][E: codex-rs/protocol/src/protocol.rs:4316][E: codex-rs/protocol/src/protocol.rs:4317][E: codex-rs/protocol/src/protocol.rs:4324] | `protocol.rs:1466` |

## 设计动机速记

- `Event` 的 submission correlation `id` 与 `EventMsg` payload 分离,让同一种 payload 可以在不同 submission 上复用。[E: codex-rs/protocol/src/protocol.rs:1267][E: codex-rs/protocol/src/protocol.rs:1271][I]
- lifecycle/control 与 streaming 是文档分区；Rust 源码里它们都是同一个 `EventMsg` enum 的 sibling variants。[E: codex-rs/protocol/src/protocol.rs:1285][I]
- v1 wire names `task_started` / `task_complete` 仍是 serialized names,`turn_started` / `turn_complete` 只是 accepted aliases。[E: codex-rs/protocol/src/protocol.rs:1328][E: codex-rs/protocol/src/protocol.rs:1337]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
