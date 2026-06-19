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
updated: 5670360009
---

> `Event` 是 agent 到客户端的 queue entry,用 submission correlation `id` 和 `msg: EventMsg` 承载 response payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1205][E: codex-rs/protocol/src/protocol.rs:1209][E: codex-rs/protocol/src/protocol.rs:1212][E: codex-rs/protocol/src/protocol.rs:1218]

## 能回答的问题

- 当前 `EventMsg` 一共有多少个变体,生命周期/control 子集覆盖哪些?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- session、thread settings、thread goal、turn abort、review mode、shutdown 分别对应哪些 event?
- approval、permission、elicitation、guardian 请求分别对应哪些 event?
- collab agent 和 v2 sub-agent activity 的 event 名称有哪些?

## EventMsg 分区

当前 `EventMsg` enum 有 76 个变体,从 `Error` 到 `SubAgentActivity`。[E: codex-rs/protocol/src/protocol.rs:1218][E: codex-rs/protocol/src/protocol.rs:1220][E: codex-rs/protocol/src/protocol.rs:1414] 其中 30 个内容/item/tool/patch streaming 变体由 `ref.protocol-event-streaming` 收录；本节点收录其余 46 个 lifecycle/control 变体。[E: codex-rs/protocol/src/protocol.rs:1233][E: codex-rs/protocol/src/protocol.rs:1390][I]

`TurnStarted` 的 wire name 保留 v1 `task_started`,同时接受 `turn_started` alias；`TurnComplete` 的 wire name 保留 v1 `task_complete`,同时接受 `turn_complete` alias。[E: codex-rs/protocol/src/protocol.rs:1256][E: codex-rs/protocol/src/protocol.rs:1259][E: codex-rs/protocol/src/protocol.rs:1265][E: codex-rs/protocol/src/protocol.rs:1268]

## Lifecycle / control EventMsg 表

| # | Variant | Payload | 生命周期/control 含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败；payload 含 message 和 optional `codex_error_info`。[E: codex-rs/protocol/src/protocol.rs:1219][E: codex-rs/protocol/src/protocol.rs:1220][E: codex-rs/protocol/src/protocol.rs:1886][E: codex-rs/protocol/src/protocol.rs:1890] | `protocol.rs:1220` |
| 2 | `Warning` | `WarningEvent` | turn 继续执行但需要通知用户。[E: codex-rs/protocol/src/protocol.rs:1222][E: codex-rs/protocol/src/protocol.rs:1224][E: codex-rs/protocol/src/protocol.rs:1902][E: codex-rs/protocol/src/protocol.rs:1904] | `protocol.rs:1224` |
| 3 | `GuardianWarning` | `WarningEvent` | Guardian automatic approval reviewer 发出的 warning。[E: codex-rs/protocol/src/protocol.rs:1226][E: codex-rs/protocol/src/protocol.rs:1227] | `protocol.rs:1227` |
| 4 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start,带 optional session id 与 version。[E: codex-rs/protocol/src/protocol.rs:1229][E: codex-rs/protocol/src/protocol.rs:1230][E: codex-rs/protocol/src/protocol.rs:1562][E: codex-rs/protocol/src/protocol.rs:1565] | `protocol.rs:1230` |
| 5 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close,可带 reason。[E: codex-rs/protocol/src/protocol.rs:1235][E: codex-rs/protocol/src/protocol.rs:1236][E: codex-rs/protocol/src/protocol.rs:1573][E: codex-rs/protocol/src/protocol.rs:1575] | `protocol.rs:1236` |
| 6 | `ModelReroute` | `ModelRerouteEvent` | backend/model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1241][E: codex-rs/protocol/src/protocol.rs:1242][E: codex-rs/protocol/src/protocol.rs:1914][E: codex-rs/protocol/src/protocol.rs:1918] | `protocol.rs:1242` |
| 7 | `ModelVerification` | `ModelVerificationEvent` | backend 建议本 turn 需要额外 account verification。[E: codex-rs/protocol/src/protocol.rs:1244][E: codex-rs/protocol/src/protocol.rs:1245][E: codex-rs/protocol/src/protocol.rs:1928][E: codex-rs/protocol/src/protocol.rs:1930] | `protocol.rs:1245` |
| 8 | `TurnModerationMetadata` | `TurnModerationMetadataEvent` | first-party turn presentation 用 moderation metadata。[E: codex-rs/protocol/src/protocol.rs:1247][E: codex-rs/protocol/src/protocol.rs:1248][E: codex-rs/protocol/src/protocol.rs:1933][E: codex-rs/protocol/src/protocol.rs:1934] | `protocol.rs:1248` |
| 9 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被自动或手动 compaction。[E: codex-rs/protocol/src/protocol.rs:1250][E: codex-rs/protocol/src/protocol.rs:1251][E: codex-rs/protocol/src/protocol.rs:1938] | `protocol.rs:1251` |
| 10 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃最后 N 个 user turns。[E: codex-rs/protocol/src/protocol.rs:1253][E: codex-rs/protocol/src/protocol.rs:1254][E: codex-rs/protocol/src/protocol.rs:3353][E: codex-rs/protocol/src/protocol.rs:3355] | `protocol.rs:1254` |
| 11 | `TurnStarted` | `TurnStartedEvent` | agent turn started,带 turn id、trace id、started time、context window、collaboration mode kind。[E: codex-rs/protocol/src/protocol.rs:1256][E: codex-rs/protocol/src/protocol.rs:1259][E: codex-rs/protocol/src/protocol.rs:1959][E: codex-rs/protocol/src/protocol.rs:1972] | `protocol.rs:1259` |
| 12 | `ThreadSettingsApplied` | `ThreadSettingsAppliedEvent` | correlated submission 的 persistent thread settings 已应用到 session config。[E: codex-rs/protocol/src/protocol.rs:1261][E: codex-rs/protocol/src/protocol.rs:1263][E: codex-rs/protocol/src/protocol.rs:1976][E: codex-rs/protocol/src/protocol.rs:2000] | `protocol.rs:1263` |
| 13 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 actions,带 turn id、last agent message、completion time/duration/TTFT。[E: codex-rs/protocol/src/protocol.rs:1265][E: codex-rs/protocol/src/protocol.rs:1268][E: codex-rs/protocol/src/protocol.rs:1941][E: codex-rs/protocol/src/protocol.rs:1955] | `protocol.rs:1268` |
| 14 | `TokenCount` | `TokenCountEvent` | current session usage update,包括 totals 和 last turn；optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1272][E: codex-rs/protocol/src/protocol.rs:2003][E: codex-rs/protocol/src/protocol.rs:2022] | `protocol.rs:1272` |
| 15 | `SessionConfigured` | `SessionConfiguredEvent` | configure ack,返回 session/thread id、model/provider、approval/sandbox/settings 等 session snapshot。[E: codex-rs/protocol/src/protocol.rs:1289][E: codex-rs/protocol/src/protocol.rs:1290][E: codex-rs/protocol/src/protocol.rs:3600][E: codex-rs/protocol/src/protocol.rs:3625] | `protocol.rs:1290` |
| 16 | `ThreadGoalUpdated` | `ThreadGoalUpdatedEvent` | long-running goal metadata 更新,带 thread id、optional turn id 与 goal。[E: codex-rs/protocol/src/protocol.rs:1292][E: codex-rs/protocol/src/protocol.rs:1293][E: codex-rs/protocol/src/protocol.rs:3781][E: codex-rs/protocol/src/protocol.rs:3787] | `protocol.rs:1293` |
| 17 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress,带 server 与 startup status。[E: codex-rs/protocol/src/protocol.rs:1295][E: codex-rs/protocol/src/protocol.rs:1296][E: codex-rs/protocol/src/protocol.rs:3432][E: codex-rs/protocol/src/protocol.rs:3437] | `protocol.rs:1296` |
| 18 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary,带 ready/failed/cancelled lists。[E: codex-rs/protocol/src/protocol.rs:1298][E: codex-rs/protocol/src/protocol.rs:1299][E: codex-rs/protocol/src/protocol.rs:3450][E: codex-rs/protocol/src/protocol.rs:3454] | `protocol.rs:1299` |
| 19 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | command execution approval prompt。[E: codex-rs/protocol/src/protocol.rs:1327] | `protocol.rs:1327` |
| 20 | `RequestPermissions` | `RequestPermissionsEvent` | `request_permissions` tool 向客户端发起权限请求。[E: codex-rs/protocol/src/protocol.rs:1329] | `protocol.rs:1329` |
| 21 | `RequestUserInput` | `RequestUserInputEvent` | `request_user_input` tool 向客户端发起用户输入请求。[E: codex-rs/protocol/src/protocol.rs:1331] | `protocol.rs:1331` |
| 22 | `ElicitationRequest` | `ElicitationRequestEvent` | MCP elicitation request event。[E: codex-rs/protocol/src/protocol.rs:1337] | `protocol.rs:1337` |
| 23 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | apply_patch approval prompt。[E: codex-rs/protocol/src/protocol.rs:1339] | `protocol.rs:1339` |
| 24 | `GuardianAssessment` | `GuardianAssessmentEvent` | Guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1341][E: codex-rs/protocol/src/protocol.rs:1342] | `protocol.rs:1342` |
| 25 | `DeprecationNotice` | `DeprecationNoticeEvent` | deprecated feature guidance,带 summary 和 optional details。[E: codex-rs/protocol/src/protocol.rs:1344][E: codex-rs/protocol/src/protocol.rs:1346][E: codex-rs/protocol/src/protocol.rs:3344][E: codex-rs/protocol/src/protocol.rs:3350] | `protocol.rs:1346` |
| 26 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect,系统正在处理 retry/backoff 等恢复路径。[E: codex-rs/protocol/src/protocol.rs:1348][E: codex-rs/protocol/src/protocol.rs:1350][E: codex-rs/protocol/src/protocol.rs:3359][E: codex-rs/protocol/src/protocol.rs:3368] | `protocol.rs:1350` |
| 27 | `TurnDiff` | `TurnDiffEvent` | turn diff payload,字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1362][E: codex-rs/protocol/src/protocol.rs:3427][E: codex-rs/protocol/src/protocol.rs:3428] | `protocol.rs:1362` |
| 28 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices list response。[E: codex-rs/protocol/src/protocol.rs:1364][E: codex-rs/protocol/src/protocol.rs:1365][E: codex-rs/protocol/src/protocol.rs:3485][E: codex-rs/protocol/src/protocol.rs:3486] | `protocol.rs:1365` |
| 29 | `PlanUpdate` | `UpdatePlanArgs` | update_plan tool/checklist 状态事件。[E: codex-rs/protocol/src/protocol.rs:1367] | `protocol.rs:1367` |
| 30 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification,带 optional turn id、reason、completed time 与 duration。[E: codex-rs/protocol/src/protocol.rs:1369][E: codex-rs/protocol/src/protocol.rs:3872][E: codex-rs/protocol/src/protocol.rs:3883] | `protocol.rs:1369` |
| 31 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1371][E: codex-rs/protocol/src/protocol.rs:1372] | `protocol.rs:1372` |
| 32 | `EnteredReviewMode` | `ReviewRequest` | entered review mode。[E: codex-rs/protocol/src/protocol.rs:1374][E: codex-rs/protocol/src/protocol.rs:1375] | `protocol.rs:1375` |
| 33 | `ExitedReviewMode` | `ExitedReviewModeEvent` | exited review mode,可带 optional final review output。[E: codex-rs/protocol/src/protocol.rs:1377][E: codex-rs/protocol/src/protocol.rs:1378][E: codex-rs/protocol/src/protocol.rs:1879][E: codex-rs/protocol/src/protocol.rs:1881] | `protocol.rs:1378` |
| 34 | `HookStarted` | `HookStartedEvent` | hook run started,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1384][E: codex-rs/protocol/src/protocol.rs:1532][E: codex-rs/protocol/src/protocol.rs:1535] | `protocol.rs:1384` |
| 35 | `HookCompleted` | `HookCompletedEvent` | hook run completed,带 optional turn id 和 hook run summary。[E: codex-rs/protocol/src/protocol.rs:1385][E: codex-rs/protocol/src/protocol.rs:1539][E: codex-rs/protocol/src/protocol.rs:1542] | `protocol.rs:1385` |
| 36 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collab agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1392][E: codex-rs/protocol/src/protocol.rs:1393][E: codex-rs/protocol/src/protocol.rs:3895][E: codex-rs/protocol/src/protocol.rs:3907] | `protocol.rs:1393` |
| 37 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collab agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1394][E: codex-rs/protocol/src/protocol.rs:1395][E: codex-rs/protocol/src/protocol.rs:3936][E: codex-rs/protocol/src/protocol.rs:3960] | `protocol.rs:1395` |
| 38 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collab agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1396][E: codex-rs/protocol/src/protocol.rs:1397][E: codex-rs/protocol/src/protocol.rs:3963][E: codex-rs/protocol/src/protocol.rs:3975] | `protocol.rs:1397` |
| 39 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collab agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1398][E: codex-rs/protocol/src/protocol.rs:1399][E: codex-rs/protocol/src/protocol.rs:3978][E: codex-rs/protocol/src/protocol.rs:3998] | `protocol.rs:1399` |
| 40 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collab waiting begin。[E: codex-rs/protocol/src/protocol.rs:1400][E: codex-rs/protocol/src/protocol.rs:1401][E: codex-rs/protocol/src/protocol.rs:4022][E: codex-rs/protocol/src/protocol.rs:4034] | `protocol.rs:1401` |
| 41 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collab waiting end。[E: codex-rs/protocol/src/protocol.rs:1402][E: codex-rs/protocol/src/protocol.rs:1403][E: codex-rs/protocol/src/protocol.rs:4037][E: codex-rs/protocol/src/protocol.rs:4049] | `protocol.rs:1403` |
| 42 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collab close begin。[E: codex-rs/protocol/src/protocol.rs:1404][E: codex-rs/protocol/src/protocol.rs:1405][E: codex-rs/protocol/src/protocol.rs:4052][E: codex-rs/protocol/src/protocol.rs:4061] | `protocol.rs:1405` |
| 43 | `CollabCloseEnd` | `CollabCloseEndEvent` | collab close end。[E: codex-rs/protocol/src/protocol.rs:1406][E: codex-rs/protocol/src/protocol.rs:1407][E: codex-rs/protocol/src/protocol.rs:4064][E: codex-rs/protocol/src/protocol.rs:4082] | `protocol.rs:1407` |
| 44 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collab resume begin。[E: codex-rs/protocol/src/protocol.rs:1408][E: codex-rs/protocol/src/protocol.rs:1409][E: codex-rs/protocol/src/protocol.rs:4085][E: codex-rs/protocol/src/protocol.rs:4100] | `protocol.rs:1409` |
| 45 | `CollabResumeEnd` | `CollabResumeEndEvent` | collab resume end。[E: codex-rs/protocol/src/protocol.rs:1410][E: codex-rs/protocol/src/protocol.rs:1411][E: codex-rs/protocol/src/protocol.rs:4103][E: codex-rs/protocol/src/protocol.rs:4121] | `protocol.rs:1411` |
| 46 | `SubAgentActivity` | `SubAgentActivityEvent` | path-based v2 sub-agent activity,带 event id、time、agent thread/path 和 activity kind。[E: codex-rs/protocol/src/protocol.rs:1413][E: codex-rs/protocol/src/protocol.rs:1414][E: codex-rs/protocol/src/protocol.rs:4010][E: codex-rs/protocol/src/protocol.rs:4019] | `protocol.rs:1414` |

## 设计动机速记

- `Event` 的 submission correlation `id` 与 `EventMsg` payload 分离,让同一种 payload 可以在不同 submission 上复用。[E: codex-rs/protocol/src/protocol.rs:1205][E: codex-rs/protocol/src/protocol.rs:1209][I]
- lifecycle/control 与 streaming 是文档分区；Rust 源码里它们都是同一个 `EventMsg` enum 的 sibling variants。[E: codex-rs/protocol/src/protocol.rs:1218][I]
- v1 wire names `task_started` / `task_complete` 仍是 serialized names,`turn_started` / `turn_complete` 只是 accepted aliases。[E: codex-rs/protocol/src/protocol.rs:1258][E: codex-rs/protocol/src/protocol.rs:1267]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
