---
id: ref.protocol-event-lifecycle
title: Protocol EventMsg 生命周期事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Event, EventMsg, TurnStartedEvent, TurnCompleteEvent, ThreadSettingsAppliedEvent, SessionConfiguredEvent, TurnAbortedEvent, ThreadGoalUpdatedEvent, SubAgentActivityEvent]
related: [spine.turn-end-to-end, subsys.core.turn-engine, ref.protocol-event-streaming, ref.protocol-op]
evidence: explicit
status: verified
updated: db887d03e1
---

> `Event` 是 agent 到客户端的 queue entry,用 submission correlation `id` 和 `msg: EventMsg` 承载 response payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1254][E: codex-rs/protocol/src/protocol.rs:1258][E: codex-rs/protocol/src/protocol.rs:1267]

## 能回答的问题

- 当前 `EventMsg` 一共有多少个变体,生命周期/control 子集覆盖哪些?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- session、thread settings、thread goal、turn abort、review mode、shutdown 分别对应哪些 event?
- approval、permission、elicitation、guardian 请求分别对应哪些 event?
- collab agent 和 v2 sub-agent activity 的 event 名称有哪些?

## EventMsg 分区

当前 `EventMsg` enum 有 77 个变体,从 `Error` 到 `SubAgentActivity`。[E: codex-rs/protocol/src/protocol.rs:1267][E: codex-rs/protocol/src/protocol.rs:1269][E: codex-rs/protocol/src/protocol.rs:1466] 其中 30 个内容/item/tool/patch streaming 变体由 `ref.protocol-event-streaming` 收录；本节点收录其余 47 个 lifecycle/control 变体。[E: codex-rs/protocol/src/protocol.rs:1282][E: codex-rs/protocol/src/protocol.rs:1442][I]

`TurnStarted` 的 wire name 保留 v1 `task_started`,同时接受 `turn_started` alias；`TurnComplete` 的 wire name 保留 v1 `task_complete`,同时接受 `turn_complete` alias。[E: codex-rs/protocol/src/protocol.rs:1310][E: codex-rs/protocol/src/protocol.rs:1311][E: codex-rs/protocol/src/protocol.rs:1319][E: codex-rs/protocol/src/protocol.rs:1320]

## Lifecycle / control EventMsg 表

| # | Variant | Payload | 生命周期/control 含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败；payload 含 message 和 optional `codex_error_info`。[E: codex-rs/protocol/src/protocol.rs:1269][E: codex-rs/protocol/src/protocol.rs:1931][E: codex-rs/protocol/src/protocol.rs:1932][E: codex-rs/protocol/src/protocol.rs:1934] | `protocol.rs:1269` |
| 2 | `Warning` | `WarningEvent` | turn 继续执行但需要通知用户。[E: codex-rs/protocol/src/protocol.rs:1273][E: codex-rs/protocol/src/protocol.rs:1947][E: codex-rs/protocol/src/protocol.rs:1948] | `protocol.rs:1273` |
| 3 | `GuardianWarning` | `WarningEvent` | Guardian automatic approval reviewer 发出的 warning。[E: codex-rs/protocol/src/protocol.rs:1276] | `protocol.rs:1276` |
| 4 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start,带 optional session id 与 version。[E: codex-rs/protocol/src/protocol.rs:1279][E: codex-rs/protocol/src/protocol.rs:1605][E: codex-rs/protocol/src/protocol.rs:1606][E: codex-rs/protocol/src/protocol.rs:1607] | `protocol.rs:1279` |
| 5 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close,可带 reason。[E: codex-rs/protocol/src/protocol.rs:1285][E: codex-rs/protocol/src/protocol.rs:1616][E: codex-rs/protocol/src/protocol.rs:1618] | `protocol.rs:1285` |
| 6 | `ModelReroute` | `ModelRerouteEvent` | backend/model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1291][E: codex-rs/protocol/src/protocol.rs:1959][E: codex-rs/protocol/src/protocol.rs:1960][E: codex-rs/protocol/src/protocol.rs:1961] | `protocol.rs:1291` |
| 7 | `ModelVerification` | `ModelVerificationEvent` | backend 建议本 turn 需要额外 account verification。[E: codex-rs/protocol/src/protocol.rs:1294][E: codex-rs/protocol/src/protocol.rs:1973][E: codex-rs/protocol/src/protocol.rs:1974] | `protocol.rs:1294` |
| 8 | `TurnModerationMetadata` | `TurnModerationMetadataEvent` | first-party turn presentation 用 moderation metadata。[E: codex-rs/protocol/src/protocol.rs:1297][E: codex-rs/protocol/src/protocol.rs:1978][E: codex-rs/protocol/src/protocol.rs:1979] | `protocol.rs:1297` |
| 9 | `SafetyBuffering` | `SafetyBufferingEvent` | backend safety review buffering state,带 model、use cases、reasons、UI flag 和 optional faster model。[E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1983][E: codex-rs/protocol/src/protocol.rs:1984][E: codex-rs/protocol/src/protocol.rs:1988] | `protocol.rs:1300` |
| 10 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被自动或手动 compaction。[E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1992] | `protocol.rs:1303` |
| 11 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃最后 N 个 user turns。[E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:3595][E: codex-rs/protocol/src/protocol.rs:3597] | `protocol.rs:1306` |
| 12 | `TurnStarted` | `TurnStartedEvent` | agent turn started,带 turn id、trace id、started time、context window、collaboration mode kind。[E: codex-rs/protocol/src/protocol.rs:1311][E: codex-rs/protocol/src/protocol.rs:2013][E: codex-rs/protocol/src/protocol.rs:2014][E: codex-rs/protocol/src/protocol.rs:2026] | `protocol.rs:1311` |
| 13 | `ThreadSettingsApplied` | `ThreadSettingsAppliedEvent` | correlated submission 的 persistent thread settings 已应用到 session config。[E: codex-rs/protocol/src/protocol.rs:1315][E: codex-rs/protocol/src/protocol.rs:2030][E: codex-rs/protocol/src/protocol.rs:2031] | `protocol.rs:1315` |
| 14 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 actions,带 turn id、last agent message、completion time/duration/TTFT。[E: codex-rs/protocol/src/protocol.rs:1320][E: codex-rs/protocol/src/protocol.rs:1995][E: codex-rs/protocol/src/protocol.rs:1996][E: codex-rs/protocol/src/protocol.rs:2009] | `protocol.rs:1320` |
| 15 | `TokenCount` | `TokenCountEvent` | current session usage update,包括 totals 和 last turn；optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1324][E: codex-rs/protocol/src/protocol.rs:2138][E: codex-rs/protocol/src/protocol.rs:2140] | `protocol.rs:1324` |
| 16 | `SessionConfigured` | `SessionConfiguredEvent` | configure ack,返回 session/thread id、model/provider、approval/permission/settings 等 session snapshot。[E: codex-rs/protocol/src/protocol.rs:1342][E: codex-rs/protocol/src/protocol.rs:3854][E: codex-rs/protocol/src/protocol.rs:3855][E: codex-rs/protocol/src/protocol.rs:3879] | `protocol.rs:1342` |
| 17 | `ThreadGoalUpdated` | `ThreadGoalUpdatedEvent` | long-running goal metadata 更新,带 thread id、optional turn id 与 goal。[E: codex-rs/protocol/src/protocol.rs:1345][E: codex-rs/protocol/src/protocol.rs:4035][E: codex-rs/protocol/src/protocol.rs:4036][E: codex-rs/protocol/src/protocol.rs:4040] | `protocol.rs:1345` |
| 18 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress,带 server 与 startup status。[E: codex-rs/protocol/src/protocol.rs:1348][E: codex-rs/protocol/src/protocol.rs:3674][E: codex-rs/protocol/src/protocol.rs:3676][E: codex-rs/protocol/src/protocol.rs:3678] | `protocol.rs:1348` |
| 19 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary,带 ready/failed/cancelled lists。[E: codex-rs/protocol/src/protocol.rs:1351][E: codex-rs/protocol/src/protocol.rs:3704][E: codex-rs/protocol/src/protocol.rs:3705][E: codex-rs/protocol/src/protocol.rs:3707] | `protocol.rs:1351` |
| 20 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | command execution approval prompt。[E: codex-rs/protocol/src/protocol.rs:1379] | `protocol.rs:1379` |
| 21 | `RequestPermissions` | `RequestPermissionsEvent` | `request_permissions` tool 向客户端发起权限请求。[E: codex-rs/protocol/src/protocol.rs:1381] | `protocol.rs:1381` |
| 22 | `RequestUserInput` | `RequestUserInputEvent` | `request_user_input` tool 向客户端发起用户输入请求。[E: codex-rs/protocol/src/protocol.rs:1383] | `protocol.rs:1383` |
| 23 | `ElicitationRequest` | `ElicitationRequestEvent` | MCP elicitation request event。[E: codex-rs/protocol/src/protocol.rs:1389] | `protocol.rs:1389` |
| 24 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | apply_patch approval prompt。[E: codex-rs/protocol/src/protocol.rs:1391] | `protocol.rs:1391` |
| 25 | `GuardianAssessment` | `GuardianAssessmentEvent` | Guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1394] | `protocol.rs:1394` |
| 26 | `DeprecationNotice` | `DeprecationNoticeEvent` | deprecated feature guidance,带 summary 和 optional details。[E: codex-rs/protocol/src/protocol.rs:1398][E: codex-rs/protocol/src/protocol.rs:3586][E: codex-rs/protocol/src/protocol.rs:3588][E: codex-rs/protocol/src/protocol.rs:3591] | `protocol.rs:1398` |
| 27 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect,系统正在处理 retry/backoff 等恢复路径。[E: codex-rs/protocol/src/protocol.rs:1402][E: codex-rs/protocol/src/protocol.rs:3601][E: codex-rs/protocol/src/protocol.rs:3602][E: codex-rs/protocol/src/protocol.rs:3609] | `protocol.rs:1402` |
| 28 | `TurnDiff` | `TurnDiffEvent` | turn diff payload,字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1414][E: codex-rs/protocol/src/protocol.rs:3669][E: codex-rs/protocol/src/protocol.rs:3670] | `protocol.rs:1414` |
| 29 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices list response。[E: codex-rs/protocol/src/protocol.rs:1417][E: codex-rs/protocol/src/protocol.rs:3739][E: codex-rs/protocol/src/protocol.rs:3740] | `protocol.rs:1417` |
| 30 | `PlanUpdate` | `UpdatePlanArgs` | update_plan tool/checklist 状态事件。[E: codex-rs/protocol/src/protocol.rs:1419] | `protocol.rs:1419` |
| 31 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification,带 optional turn id、reason、completed time 与 duration。[E: codex-rs/protocol/src/protocol.rs:1421][E: codex-rs/protocol/src/protocol.rs:4126][E: codex-rs/protocol/src/protocol.rs:4127][E: codex-rs/protocol/src/protocol.rs:4136] | `protocol.rs:1421` |
| 32 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1424] | `protocol.rs:1424` |
| 33 | `EnteredReviewMode` | `ReviewRequest` | entered review mode。[E: codex-rs/protocol/src/protocol.rs:1427] | `protocol.rs:1427` |
| 34 | `ExitedReviewMode` | `ExitedReviewModeEvent` | exited review mode,可带 optional final review output。[E: codex-rs/protocol/src/protocol.rs:1430][E: codex-rs/protocol/src/protocol.rs:1924][E: codex-rs/protocol/src/protocol.rs:1925] | `protocol.rs:1430` |
| 35 | `HookStarted` | `HookStartedEvent` | hook run started,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1436][E: codex-rs/protocol/src/protocol.rs:1584][E: codex-rs/protocol/src/protocol.rs:1585][E: codex-rs/protocol/src/protocol.rs:1586] | `protocol.rs:1436` |
| 36 | `HookCompleted` | `HookCompletedEvent` | hook run completed,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1437][E: codex-rs/protocol/src/protocol.rs:1591][E: codex-rs/protocol/src/protocol.rs:1592][E: codex-rs/protocol/src/protocol.rs:1593] | `protocol.rs:1437` |
| 37 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collab agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1445][E: codex-rs/protocol/src/protocol.rs:4149][E: codex-rs/protocol/src/protocol.rs:4151][E: codex-rs/protocol/src/protocol.rs:4160] | `protocol.rs:1445` |
| 38 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collab agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1447][E: codex-rs/protocol/src/protocol.rs:4190][E: codex-rs/protocol/src/protocol.rs:4192][E: codex-rs/protocol/src/protocol.rs:4213] | `protocol.rs:1447` |
| 39 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collab agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1449][E: codex-rs/protocol/src/protocol.rs:4217][E: codex-rs/protocol/src/protocol.rs:4219][E: codex-rs/protocol/src/protocol.rs:4228] | `protocol.rs:1449` |
| 40 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collab agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1451][E: codex-rs/protocol/src/protocol.rs:4232][E: codex-rs/protocol/src/protocol.rs:4234][E: codex-rs/protocol/src/protocol.rs:4251] | `protocol.rs:1451` |
| 41 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collab waiting begin。[E: codex-rs/protocol/src/protocol.rs:1453][E: codex-rs/protocol/src/protocol.rs:4276][E: codex-rs/protocol/src/protocol.rs:4280][E: codex-rs/protocol/src/protocol.rs:4287] | `protocol.rs:1453` |
| 42 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collab waiting end。[E: codex-rs/protocol/src/protocol.rs:1455][E: codex-rs/protocol/src/protocol.rs:4291][E: codex-rs/protocol/src/protocol.rs:4293][E: codex-rs/protocol/src/protocol.rs:4302] | `protocol.rs:1455` |
| 43 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collab close begin。[E: codex-rs/protocol/src/protocol.rs:1457][E: codex-rs/protocol/src/protocol.rs:4306][E: codex-rs/protocol/src/protocol.rs:4308][E: codex-rs/protocol/src/protocol.rs:4314] | `protocol.rs:1457` |
| 44 | `CollabCloseEnd` | `CollabCloseEndEvent` | collab close end。[E: codex-rs/protocol/src/protocol.rs:1459][E: codex-rs/protocol/src/protocol.rs:4318][E: codex-rs/protocol/src/protocol.rs:4320][E: codex-rs/protocol/src/protocol.rs:4335] | `protocol.rs:1459` |
| 45 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collab resume begin。[E: codex-rs/protocol/src/protocol.rs:1461][E: codex-rs/protocol/src/protocol.rs:4339][E: codex-rs/protocol/src/protocol.rs:4341][E: codex-rs/protocol/src/protocol.rs:4347] | `protocol.rs:1461` |
| 46 | `CollabResumeEnd` | `CollabResumeEndEvent` | collab resume end。[E: codex-rs/protocol/src/protocol.rs:1463][E: codex-rs/protocol/src/protocol.rs:4357][E: codex-rs/protocol/src/protocol.rs:4359][E: codex-rs/protocol/src/protocol.rs:4374] | `protocol.rs:1463` |
| 47 | `SubAgentActivity` | `SubAgentActivityEvent` | path-based v2 sub-agent activity,带 event id、time、agent thread/path 和 activity kind。[E: codex-rs/protocol/src/protocol.rs:1466][E: codex-rs/protocol/src/protocol.rs:4264][E: codex-rs/protocol/src/protocol.rs:4265][E: codex-rs/protocol/src/protocol.rs:4272] | `protocol.rs:1466` |

## 设计动机速记

- `Event` 的 submission correlation `id` 与 `EventMsg` payload 分离,让同一种 payload 可以在不同 submission 上复用。[E: codex-rs/protocol/src/protocol.rs:1254][E: codex-rs/protocol/src/protocol.rs:1258][I]
- lifecycle/control 与 streaming 是文档分区；Rust 源码里它们都是同一个 `EventMsg` enum 的 sibling variants。[E: codex-rs/protocol/src/protocol.rs:1267][I]
- v1 wire names `task_started` / `task_complete` 仍是 serialized names,`turn_started` / `turn_complete` 只是 accepted aliases。[E: codex-rs/protocol/src/protocol.rs:1310][E: codex-rs/protocol/src/protocol.rs:1319]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
