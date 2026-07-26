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
updated: 61a44880a8
---

> `Event` 是 agent 到客户端的 queue entry,用 submission correlation `id` 和 `msg: EventMsg` 承载 response payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1261][E: codex-rs/protocol/src/protocol.rs:1265][E: codex-rs/protocol/src/protocol.rs:1279]

## 能回答的问题

- 当前 `EventMsg` 一共有多少个变体,生命周期/control 子集覆盖哪些?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- session、thread settings、thread goal、turn abort、review mode、shutdown 分别对应哪些 event?
- approval、permission、elicitation、guardian 请求分别对应哪些 event?
- collab agent 和 v2 sub-agent activity 的 event 名称有哪些?

## EventMsg 分区

当前 `EventMsg` enum 有 80 个变体,从 `Error` 到 `SubAgentActivity`。[E: codex-rs/protocol/src/protocol.rs:1279][E: codex-rs/protocol/src/protocol.rs:1281][E: codex-rs/protocol/src/protocol.rs:1488] 其中 31 个内容/item/tool/patch streaming 变体由 `ref.protocol-event-streaming` 收录；本节点收录其余 49 个 lifecycle/control 变体。[E: codex-rs/protocol/src/protocol.rs:1294][E: codex-rs/protocol/src/protocol.rs:1461][I]

`TurnStarted` 的 wire name 保留 v1 `task_started`,同时接受 `turn_started` alias；`TurnComplete` 的 wire name 保留 v1 `task_complete`,同时接受 `turn_complete` alias。[E: codex-rs/protocol/src/protocol.rs:1322][E: codex-rs/protocol/src/protocol.rs:1323][E: codex-rs/protocol/src/protocol.rs:1331][E: codex-rs/protocol/src/protocol.rs:1332]

## Lifecycle / control EventMsg 表

| # | Variant | Payload | 生命周期/control 含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败；payload 含 message 和 optional `codex_error_info`。[E: codex-rs/protocol/src/protocol.rs:1281][E: codex-rs/protocol/src/protocol.rs:1922][E: codex-rs/protocol/src/protocol.rs:1923][E: codex-rs/protocol/src/protocol.rs:1925] | `protocol.rs:1287` |
| 2 | `Warning` | `WarningEvent` | turn 继续执行但需要通知用户。[E: codex-rs/protocol/src/protocol.rs:1285][E: codex-rs/protocol/src/protocol.rs:1938][E: codex-rs/protocol/src/protocol.rs:1939] | `protocol.rs:1291` |
| 3 | `GuardianWarning` | `WarningEvent` | Guardian automatic approval reviewer 发出的 warning。[E: codex-rs/protocol/src/protocol.rs:1288] | `protocol.rs:1294` |
| 4 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start,带 optional session id 与 version。[E: codex-rs/protocol/src/protocol.rs:1291][E: codex-rs/protocol/src/protocol.rs:1636][E: codex-rs/protocol/src/protocol.rs:1637][E: codex-rs/protocol/src/protocol.rs:1638] | `protocol.rs:1297` |
| 5 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close,可带 reason。[E: codex-rs/protocol/src/protocol.rs:1297][E: codex-rs/protocol/src/protocol.rs:1647][E: codex-rs/protocol/src/protocol.rs:1649] | `protocol.rs:1303` |
| 6 | `ModelReroute` | `ModelRerouteEvent` | backend/model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1950][E: codex-rs/protocol/src/protocol.rs:1951][E: codex-rs/protocol/src/protocol.rs:1952] | `protocol.rs:1309` |
| 7 | `ModelVerification` | `ModelVerificationEvent` | backend 建议本 turn 需要额外 account verification。[E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:1964][E: codex-rs/protocol/src/protocol.rs:1965] | `protocol.rs:1312` |
| 8 | `TurnModerationMetadata` | `TurnModerationMetadataEvent` | first-party turn presentation 用 moderation metadata。[E: codex-rs/protocol/src/protocol.rs:1309][E: codex-rs/protocol/src/protocol.rs:1969][E: codex-rs/protocol/src/protocol.rs:1970] | `protocol.rs:1315` |
| 9 | `SafetyBuffering` | `SafetyBufferingEvent` | backend safety review buffering state,带 model、use cases、reasons、UI flag 和 optional faster model。[E: codex-rs/protocol/src/protocol.rs:1312][E: codex-rs/protocol/src/protocol.rs:1974][E: codex-rs/protocol/src/protocol.rs:1975][E: codex-rs/protocol/src/protocol.rs:1979] | `protocol.rs:1318` |
| 10 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被自动或手动 compaction。[E: codex-rs/protocol/src/protocol.rs:1315][E: codex-rs/protocol/src/protocol.rs:1983] | `protocol.rs:1321` |
| 11 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃最后 N 个 user turns。[E: codex-rs/protocol/src/protocol.rs:1318][E: codex-rs/protocol/src/protocol.rs:3646][E: codex-rs/protocol/src/protocol.rs:3648] | `protocol.rs:1324` |
| 12 | `TurnStarted` | `TurnStartedEvent` | agent turn started,带 turn id、trace id、started time、context window、collaboration mode kind。[E: codex-rs/protocol/src/protocol.rs:1323][E: codex-rs/protocol/src/protocol.rs:2012][E: codex-rs/protocol/src/protocol.rs:2013][E: codex-rs/protocol/src/protocol.rs:2025] | `protocol.rs:1329` |
| 13 | `ThreadSettingsApplied` | `ThreadSettingsAppliedEvent` | correlated submission 的 persistent thread settings 已应用到 session config。[E: codex-rs/protocol/src/protocol.rs:1327][E: codex-rs/protocol/src/protocol.rs:2029][E: codex-rs/protocol/src/protocol.rs:2030] | `protocol.rs:1333` |
| 14 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 actions,带 turn id、last agent message、completion time/duration/TTFT。[E: codex-rs/protocol/src/protocol.rs:1332][E: codex-rs/protocol/src/protocol.rs:1986][E: codex-rs/protocol/src/protocol.rs:1987][E: codex-rs/protocol/src/protocol.rs:2008] | `protocol.rs:1338` |
| 15 | `TokenCount` | `TokenCountEvent` | current session usage update,包括 totals 和 last turn；optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1336][E: codex-rs/protocol/src/protocol.rs:2140][E: codex-rs/protocol/src/protocol.rs:2142] | `protocol.rs:1342` |
| 16 | `SessionConfigured` | `SessionConfiguredEvent` | configure ack,返回 session/thread id、model/provider、approval/permission/settings 等 session snapshot。[E: codex-rs/protocol/src/protocol.rs:1354][E: codex-rs/protocol/src/protocol.rs:3905][E: codex-rs/protocol/src/protocol.rs:3906][E: codex-rs/protocol/src/protocol.rs:3930] | `protocol.rs:1360` |
| 16a | `EnvironmentConnected` | `EnvironmentConnectionEvent` | selected environment 完成 connection handshake；payload 是 `environment_id`。[E: codex-rs/protocol/src/protocol.rs:1268][E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1357] | `protocol.rs:1363` |
| 16b | `EnvironmentDisconnected` | `EnvironmentConnectionEvent` | selected environment 丢失已建立的连接；复用同一个 environment-id payload。[E: codex-rs/protocol/src/protocol.rs:1360] | `protocol.rs:1366` |
| 17 | `ThreadGoalUpdated` | `ThreadGoalUpdatedEvent` | long-running goal metadata 更新,带 thread id、optional turn id 与 goal。[E: codex-rs/protocol/src/protocol.rs:1363][E: codex-rs/protocol/src/protocol.rs:4086][E: codex-rs/protocol/src/protocol.rs:4087][E: codex-rs/protocol/src/protocol.rs:4091] | `protocol.rs:1369` |
| 18 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress,带 server 与 startup status。[E: codex-rs/protocol/src/protocol.rs:1366][E: codex-rs/protocol/src/protocol.rs:3725][E: codex-rs/protocol/src/protocol.rs:3727][E: codex-rs/protocol/src/protocol.rs:3729] | `protocol.rs:1372` |
| 19 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary,带 ready/failed/cancelled lists。[E: codex-rs/protocol/src/protocol.rs:1369][E: codex-rs/protocol/src/protocol.rs:3755][E: codex-rs/protocol/src/protocol.rs:3756][E: codex-rs/protocol/src/protocol.rs:3758] | `protocol.rs:1375` |
| 20 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | command execution approval prompt。[E: codex-rs/protocol/src/protocol.rs:1397] | `protocol.rs:1403` |
| 21 | `RequestPermissions` | `RequestPermissionsEvent` | `request_permissions` tool 向客户端发起权限请求。[E: codex-rs/protocol/src/protocol.rs:1399] | `protocol.rs:1405` |
| 22 | `RequestUserInput` | `RequestUserInputEvent` | `request_user_input` tool 向客户端发起用户输入请求。[E: codex-rs/protocol/src/protocol.rs:1401] | `protocol.rs:1407` |
| 23 | `ElicitationRequest` | `ElicitationRequestEvent` | MCP elicitation request event。[E: codex-rs/protocol/src/protocol.rs:1407] | `protocol.rs:1413` |
| 24 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | apply_patch approval prompt。[E: codex-rs/protocol/src/protocol.rs:1409] | `protocol.rs:1415` |
| 25 | `GuardianAssessment` | `GuardianAssessmentEvent` | Guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1412] | `protocol.rs:1418` |
| 26 | `DeprecationNotice` | `DeprecationNoticeEvent` | deprecated feature guidance,带 summary 和 optional details。[E: codex-rs/protocol/src/protocol.rs:1416][E: codex-rs/protocol/src/protocol.rs:3637][E: codex-rs/protocol/src/protocol.rs:3639][E: codex-rs/protocol/src/protocol.rs:3642] | `protocol.rs:1422` |
| 27 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect,系统正在处理 retry/backoff 等恢复路径。[E: codex-rs/protocol/src/protocol.rs:1420][E: codex-rs/protocol/src/protocol.rs:3652][E: codex-rs/protocol/src/protocol.rs:3653][E: codex-rs/protocol/src/protocol.rs:3660] | `protocol.rs:1426` |
| 28 | `TurnDiff` | `TurnDiffEvent` | turn diff payload,字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1432][E: codex-rs/protocol/src/protocol.rs:3720][E: codex-rs/protocol/src/protocol.rs:3721] | `protocol.rs:1438` |
| 29 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices list response。[E: codex-rs/protocol/src/protocol.rs:1435][E: codex-rs/protocol/src/protocol.rs:3790][E: codex-rs/protocol/src/protocol.rs:3791] | `protocol.rs:1441` |
| 30 | `PlanUpdate` | `UpdatePlanArgs` | update_plan tool/checklist 状态事件。[E: codex-rs/protocol/src/protocol.rs:1437] | `protocol.rs:1443` |
| 31 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification,带 optional turn id、reason、completed time 与 duration。[E: codex-rs/protocol/src/protocol.rs:1439][E: codex-rs/protocol/src/protocol.rs:4190][E: codex-rs/protocol/src/protocol.rs:4191][E: codex-rs/protocol/src/protocol.rs:4204] | `protocol.rs:1445` |
| 32 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1442] | `protocol.rs:1448` |
| 33 | `EnteredReviewMode` | `EnteredReviewModeEvent` | legacy entered-review notification；payload 带 target，以及 optional hint、turn id 和 item id。[E: codex-rs/protocol/src/protocol.rs:1445][E: codex-rs/protocol/src/protocol.rs:1894] | `protocol.rs:1451` |
| 34 | `ExitedReviewMode` | `ExitedReviewModeEvent` | exited review mode,可带 optional final review output。[E: codex-rs/protocol/src/protocol.rs:1448][E: codex-rs/protocol/src/protocol.rs:1909][E: codex-rs/protocol/src/protocol.rs:1916] | `protocol.rs:1454` |
| 35 | `HookStarted` | `HookStartedEvent` | hook run started,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1455][E: codex-rs/protocol/src/protocol.rs:1604][E: codex-rs/protocol/src/protocol.rs:1605][E: codex-rs/protocol/src/protocol.rs:1606] | `protocol.rs:1461` |
| 36 | `HookCompleted` | `HookCompletedEvent` | hook run completed,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1456][E: codex-rs/protocol/src/protocol.rs:1611][E: codex-rs/protocol/src/protocol.rs:1612][E: codex-rs/protocol/src/protocol.rs:1613] | `protocol.rs:1462` |
| 37 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collab agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1464][E: codex-rs/protocol/src/protocol.rs:4217][E: codex-rs/protocol/src/protocol.rs:4219][E: codex-rs/protocol/src/protocol.rs:4228] | `protocol.rs:1470` |
| 38 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collab agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1466][E: codex-rs/protocol/src/protocol.rs:4258][E: codex-rs/protocol/src/protocol.rs:4260][E: codex-rs/protocol/src/protocol.rs:4281] | `protocol.rs:1472` |
| 39 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collab agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1468][E: codex-rs/protocol/src/protocol.rs:4285][E: codex-rs/protocol/src/protocol.rs:4287][E: codex-rs/protocol/src/protocol.rs:4296] | `protocol.rs:1474` |
| 40 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collab agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1470][E: codex-rs/protocol/src/protocol.rs:4300][E: codex-rs/protocol/src/protocol.rs:4302][E: codex-rs/protocol/src/protocol.rs:4319] | `protocol.rs:1476` |
| 41 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collab waiting begin。[E: codex-rs/protocol/src/protocol.rs:1472][E: codex-rs/protocol/src/protocol.rs:4344][E: codex-rs/protocol/src/protocol.rs:4348][E: codex-rs/protocol/src/protocol.rs:4355] | `protocol.rs:1478` |
| 42 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collab waiting end。[E: codex-rs/protocol/src/protocol.rs:1474][E: codex-rs/protocol/src/protocol.rs:4359][E: codex-rs/protocol/src/protocol.rs:4361][E: codex-rs/protocol/src/protocol.rs:4370] | `protocol.rs:1480` |
| 43 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collab close begin。[E: codex-rs/protocol/src/protocol.rs:1476][E: codex-rs/protocol/src/protocol.rs:4374][E: codex-rs/protocol/src/protocol.rs:4376][E: codex-rs/protocol/src/protocol.rs:4382] | `protocol.rs:1482` |
| 44 | `CollabCloseEnd` | `CollabCloseEndEvent` | collab close end。[E: codex-rs/protocol/src/protocol.rs:1478][E: codex-rs/protocol/src/protocol.rs:4386][E: codex-rs/protocol/src/protocol.rs:4388][E: codex-rs/protocol/src/protocol.rs:4403] | `protocol.rs:1484` |
| 45 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collab resume begin。[E: codex-rs/protocol/src/protocol.rs:1480][E: codex-rs/protocol/src/protocol.rs:4407][E: codex-rs/protocol/src/protocol.rs:4409][E: codex-rs/protocol/src/protocol.rs:4415] | `protocol.rs:1486` |
| 46 | `CollabResumeEnd` | `CollabResumeEndEvent` | collab resume end。[E: codex-rs/protocol/src/protocol.rs:1482][E: codex-rs/protocol/src/protocol.rs:4425][E: codex-rs/protocol/src/protocol.rs:4427][E: codex-rs/protocol/src/protocol.rs:4442] | `protocol.rs:1488` |
| 47 | `SubAgentActivity` | `SubAgentActivityEvent` | path-based v2 sub-agent activity,带 event id、time、agent thread/path 和 activity kind。[E: codex-rs/protocol/src/protocol.rs:1485][E: codex-rs/protocol/src/protocol.rs:4332][E: codex-rs/protocol/src/protocol.rs:4333][E: codex-rs/protocol/src/protocol.rs:4340] | `protocol.rs:1491` |

## 设计动机速记

- `Event` 的 submission correlation `id` 与 `EventMsg` payload 分离,让同一种 payload 可以在不同 submission 上复用。[E: codex-rs/protocol/src/protocol.rs:1261][E: codex-rs/protocol/src/protocol.rs:1265][I]
- lifecycle/control 与 streaming 是文档分区；Rust 源码里它们都是同一个 `EventMsg` enum 的 sibling variants。[E: codex-rs/protocol/src/protocol.rs:1279][I]
- v1 wire names `task_started` / `task_complete` 仍是 serialized names,`turn_started` / `turn_complete` 只是 accepted aliases。[E: codex-rs/protocol/src/protocol.rs:1322][E: codex-rs/protocol/src/protocol.rs:1331]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
