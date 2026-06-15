---
id: ref.protocol-event-lifecycle
title: Protocol EventMsg 生命周期事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Event, EventMsg]
related: [spine.turn-end-to-end, subsys.core.turn-engine, ref.protocol-event-streaming, ref.protocol-op]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `Event` 是 agent 到客户端的 Event Queue Entry，包含 correlation `id` 和 payload `msg`；payload 类型 `EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 tagged enum。[E: codex-rs/protocol/src/protocol.rs:1417][E: codex-rs/protocol/src/protocol.rs:1420][E: codex-rs/protocol/src/protocol.rs:1423][E: codex-rs/protocol/src/protocol.rs:1429]

## 能回答的问题

- 哪些 `EventMsg` 表示 session、turn、thread、shutdown、undo、review 的生命周期?
- `task_started` / `task_complete` 和 `turn_started` / `turn_complete` 的兼容关系在哪里定义?
- approval、permission、elicitation、guardian 请求分别对应哪些 event?
- collab agent begin/end/wait/close/resume 的 event 名称有哪些?
- 本节点覆盖 EventMsg 81 个变体中的哪些生命周期类变体?

## Lifecycle 分类边界

本节点收录 "状态机阶段、请求/响应边界、控制面通知、审批请求、协作编排、session/thread 元数据变化" 类 `EventMsg` 变体；模型 token/content delta、tool 执行流、raw response item、patch streaming 由 `ref.protocol-event-streaming` 收录。[I]

`TurnStarted` 的 wire name 保留 v1 `task_started`，同时接受 v2 alias `turn_started`；`TurnComplete` 的 wire name 保留 v1 `task_complete`，同时接受 v2 alias `turn_complete`。[E: codex-rs/protocol/src/protocol.rs:1462][E: codex-rs/protocol/src/protocol.rs:1463][E: codex-rs/protocol/src/protocol.rs:1467][E: codex-rs/protocol/src/protocol.rs:1468]

## Lifecycle / control EventMsg 变体表

| # | Variant | Payload | 生命周期含义 | 定义处 |
|---:|---|---|---|---|
| 1 | `Error` | `ErrorEvent` | submission 执行失败。[E: codex-rs/protocol/src/protocol.rs:1433][E: codex-rs/protocol/src/protocol.rs:1434] | `EventMsg::Error` |
| 2 | `Warning` | `WarningEvent` | submission 继续执行但需要向用户显示 warning。[E: codex-rs/protocol/src/protocol.rs:1436][E: codex-rs/protocol/src/protocol.rs:1437][E: codex-rs/protocol/src/protocol.rs:1438] | `EventMsg::Warning` |
| 3 | `RealtimeConversationStarted` | `RealtimeConversationStartedEvent` | realtime conversation lifecycle start。[E: codex-rs/protocol/src/protocol.rs:1440][E: codex-rs/protocol/src/protocol.rs:1441] | `EventMsg::RealtimeConversationStarted` |
| 4 | `RealtimeConversationClosed` | `RealtimeConversationClosedEvent` | realtime conversation lifecycle close。[E: codex-rs/protocol/src/protocol.rs:1446][E: codex-rs/protocol/src/protocol.rs:1447] | `EventMsg::RealtimeConversationClosed` |
| 5 | `RealtimeConversationSdp` | `RealtimeConversationSdpEvent` | realtime session description protocol payload。[E: codex-rs/protocol/src/protocol.rs:1449][E: codex-rs/protocol/src/protocol.rs:1450] | `EventMsg::RealtimeConversationSdp` |
| 6 | `ModelReroute` | `ModelRerouteEvent` | model routing 从 requested model 切换到另一个 model。[E: codex-rs/protocol/src/protocol.rs:1452][E: codex-rs/protocol/src/protocol.rs:1453] | `EventMsg::ModelReroute` |
| 7 | `ContextCompacted` | `ContextCompactedEvent` | conversation history 被 automatic 或 manual compaction。[E: codex-rs/protocol/src/protocol.rs:1455][E: codex-rs/protocol/src/protocol.rs:1456] | `EventMsg::ContextCompacted` |
| 8 | `ThreadRolledBack` | `ThreadRolledBackEvent` | conversation history 丢弃 last N user turns。[E: codex-rs/protocol/src/protocol.rs:1458][E: codex-rs/protocol/src/protocol.rs:1459] | `EventMsg::ThreadRolledBack` |
| 9 | `TurnStarted` | `TurnStartedEvent` | agent turn 开始；wire rename/alias 兼容 task/turn 命名。[E: codex-rs/protocol/src/protocol.rs:1461][E: codex-rs/protocol/src/protocol.rs:1463][E: codex-rs/protocol/src/protocol.rs:1464] | `EventMsg::TurnStarted` |
| 10 | `TurnComplete` | `TurnCompleteEvent` | agent 完成所有 action；wire rename/alias 兼容 task/turn 命名。[E: codex-rs/protocol/src/protocol.rs:1466][E: codex-rs/protocol/src/protocol.rs:1468][E: codex-rs/protocol/src/protocol.rs:1469] | `EventMsg::TurnComplete` |
| 11 | `TokenCount` | `TokenCountEvent` | current session usage update，包含 totals 和 last turn，optional 表示 unknown。[E: codex-rs/protocol/src/protocol.rs:1471][E: codex-rs/protocol/src/protocol.rs:1472][E: codex-rs/protocol/src/protocol.rs:1473] | `EventMsg::TokenCount` |
| 12 | `SessionConfigured` | `SessionConfiguredEvent` | ack client's configure message。[E: codex-rs/protocol/src/protocol.rs:1498][E: codex-rs/protocol/src/protocol.rs:1499] | `EventMsg::SessionConfigured` |
| 13 | `ThreadNameUpdated` | `ThreadNameUpdatedEvent` | session metadata 更新，例如 thread name 变化。[E: codex-rs/protocol/src/protocol.rs:1501][E: codex-rs/protocol/src/protocol.rs:1502] | `EventMsg::ThreadNameUpdated` |
| 14 | `McpStartupUpdate` | `McpStartupUpdateEvent` | MCP startup incremental progress。[E: codex-rs/protocol/src/protocol.rs:1504][E: codex-rs/protocol/src/protocol.rs:1505] | `EventMsg::McpStartupUpdate` |
| 15 | `McpStartupComplete` | `McpStartupCompleteEvent` | MCP startup aggregate completion summary。[E: codex-rs/protocol/src/protocol.rs:1507][E: codex-rs/protocol/src/protocol.rs:1508] | `EventMsg::McpStartupComplete` |
| 16 | `ExecApprovalRequest` | `ExecApprovalRequestEvent` | `ExecApprovalRequestEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1536] | `EventMsg::ExecApprovalRequest` |
| 17 | `RequestPermissions` | `RequestPermissionsEvent` | `RequestPermissionsEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1538] | `EventMsg::RequestPermissions` |
| 18 | `RequestUserInput` | `RequestUserInputEvent` | `RequestUserInputEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1540] | `EventMsg::RequestUserInput` |
| 19 | `DynamicToolCallRequest` | `DynamicToolCallRequest` | `DynamicToolCallRequest` payload variant。[E: codex-rs/protocol/src/protocol.rs:1542] | `EventMsg::DynamicToolCallRequest` |
| 20 | `ElicitationRequest` | `ElicitationRequestEvent` | `ElicitationRequestEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1546] | `EventMsg::ElicitationRequest` |
| 21 | `ApplyPatchApprovalRequest` | `ApplyPatchApprovalRequestEvent` | `ApplyPatchApprovalRequestEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1548] | `EventMsg::ApplyPatchApprovalRequest` |
| 22 | `GuardianAssessment` | `GuardianAssessmentEvent` | guardian-reviewed approval request 的 structured lifecycle event。[E: codex-rs/protocol/src/protocol.rs:1550][E: codex-rs/protocol/src/protocol.rs:1551] | `EventMsg::GuardianAssessment` |
| 23 | `DeprecationNotice` | `DeprecationNoticeEvent` | 通知用户某功能 deprecated，应逐步停止使用。[E: codex-rs/protocol/src/protocol.rs:1553][E: codex-rs/protocol/src/protocol.rs:1554][E: codex-rs/protocol/src/protocol.rs:1555] | `EventMsg::DeprecationNotice` |
| 24 | `BackgroundEvent` | `BackgroundEventEvent` | `BackgroundEventEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1557] | `EventMsg::BackgroundEvent` |
| 25 | `UndoStarted` | `UndoStartedEvent` | `UndoStartedEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1559] | `EventMsg::UndoStarted` |
| 26 | `UndoCompleted` | `UndoCompletedEvent` | `UndoCompletedEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1561] | `EventMsg::UndoCompleted` |
| 27 | `StreamError` | `StreamErrorEvent` | model stream error/disconnect，系统正在处理，例如 retry/backoff。[E: codex-rs/protocol/src/protocol.rs:1563][E: codex-rs/protocol/src/protocol.rs:1564][E: codex-rs/protocol/src/protocol.rs:1565] | `EventMsg::StreamError` |
| 28 | `TurnDiff` | `TurnDiffEvent` | `TurnDiffEvent` payload variant，payload 字段是 `unified_diff`。[E: codex-rs/protocol/src/protocol.rs:1577][E: codex-rs/protocol/src/protocol.rs:3325][E: codex-rs/protocol/src/protocol.rs:3326] | `EventMsg::TurnDiff` |
| 29 | `GetHistoryEntryResponse` | `GetHistoryEntryResponseEvent` | `GetHistoryEntryRequest` 的响应。[E: codex-rs/protocol/src/protocol.rs:1579][E: codex-rs/protocol/src/protocol.rs:1580] | `EventMsg::GetHistoryEntryResponse` |
| 30 | `McpListToolsResponse` | `McpListToolsResponseEvent` | agent 可用 MCP tools 列表。[E: codex-rs/protocol/src/protocol.rs:1582][E: codex-rs/protocol/src/protocol.rs:1583] | `EventMsg::McpListToolsResponse` |
| 31 | `ListSkillsResponse` | `ListSkillsResponseEvent` | agent 可用 skills 列表。[E: codex-rs/protocol/src/protocol.rs:1585][E: codex-rs/protocol/src/protocol.rs:1586] | `EventMsg::ListSkillsResponse` |
| 32 | `RealtimeConversationListVoicesResponse` | `RealtimeConversationListVoicesResponseEvent` | realtime conversation voices 列表响应。[E: codex-rs/protocol/src/protocol.rs:1588][E: codex-rs/protocol/src/protocol.rs:1589] | `EventMsg::RealtimeConversationListVoicesResponse` |
| 33 | `SkillsUpdateAvailable` | unit | skill data 可能更新，client 可 reload。[E: codex-rs/protocol/src/protocol.rs:1591][E: codex-rs/protocol/src/protocol.rs:1592] | `EventMsg::SkillsUpdateAvailable` |
| 34 | `PlanUpdate` | `UpdatePlanArgs` | plan update event。[E: codex-rs/protocol/src/protocol.rs:1594] | `EventMsg::PlanUpdate` |
| 35 | `TurnAborted` | `TurnAbortedEvent` | turn aborted notification。[E: codex-rs/protocol/src/protocol.rs:1596] | `EventMsg::TurnAborted` |
| 36 | `ShutdownComplete` | unit | agent shutdown complete notification。[E: codex-rs/protocol/src/protocol.rs:1598][E: codex-rs/protocol/src/protocol.rs:1599] | `EventMsg::ShutdownComplete` |
| 37 | `EnteredReviewMode` | `ReviewRequest` | 进入 review mode。[E: codex-rs/protocol/src/protocol.rs:1601][E: codex-rs/protocol/src/protocol.rs:1602] | `EventMsg::EnteredReviewMode` |
| 38 | `ExitedReviewMode` | `ExitedReviewModeEvent` | 退出 review mode，可能带 optional final result。[E: codex-rs/protocol/src/protocol.rs:1604][E: codex-rs/protocol/src/protocol.rs:1605] | `EventMsg::ExitedReviewMode` |
| 39 | `ItemStarted` | `ItemStartedEvent` | item started event。[E: codex-rs/protocol/src/protocol.rs:1609] | `EventMsg::ItemStarted` |
| 40 | `ItemCompleted` | `ItemCompletedEvent` | item completed event。[E: codex-rs/protocol/src/protocol.rs:1610] | `EventMsg::ItemCompleted` |
| 41 | `HookStarted` | `HookStartedEvent` | `HookStartedEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1611] | `EventMsg::HookStarted` |
| 42 | `HookCompleted` | `HookCompletedEvent` | `HookCompletedEvent` payload variant。[E: codex-rs/protocol/src/protocol.rs:1612] | `EventMsg::HookCompleted` |
| 43 | `CollabAgentSpawnBegin` | `CollabAgentSpawnBeginEvent` | collaboration agent spawn begin。[E: codex-rs/protocol/src/protocol.rs:1619][E: codex-rs/protocol/src/protocol.rs:1620] | `EventMsg::CollabAgentSpawnBegin` |
| 44 | `CollabAgentSpawnEnd` | `CollabAgentSpawnEndEvent` | collaboration agent spawn end。[E: codex-rs/protocol/src/protocol.rs:1621][E: codex-rs/protocol/src/protocol.rs:1622] | `EventMsg::CollabAgentSpawnEnd` |
| 45 | `CollabAgentInteractionBegin` | `CollabAgentInteractionBeginEvent` | collaboration agent interaction begin。[E: codex-rs/protocol/src/protocol.rs:1623][E: codex-rs/protocol/src/protocol.rs:1624] | `EventMsg::CollabAgentInteractionBegin` |
| 46 | `CollabAgentInteractionEnd` | `CollabAgentInteractionEndEvent` | collaboration agent interaction end。[E: codex-rs/protocol/src/protocol.rs:1625][E: codex-rs/protocol/src/protocol.rs:1626] | `EventMsg::CollabAgentInteractionEnd` |
| 47 | `CollabWaitingBegin` | `CollabWaitingBeginEvent` | collaboration waiting begin。[E: codex-rs/protocol/src/protocol.rs:1627][E: codex-rs/protocol/src/protocol.rs:1628] | `EventMsg::CollabWaitingBegin` |
| 48 | `CollabWaitingEnd` | `CollabWaitingEndEvent` | collaboration waiting end。[E: codex-rs/protocol/src/protocol.rs:1629][E: codex-rs/protocol/src/protocol.rs:1630] | `EventMsg::CollabWaitingEnd` |
| 49 | `CollabCloseBegin` | `CollabCloseBeginEvent` | collaboration close begin。[E: codex-rs/protocol/src/protocol.rs:1631][E: codex-rs/protocol/src/protocol.rs:1632] | `EventMsg::CollabCloseBegin` |
| 50 | `CollabCloseEnd` | `CollabCloseEndEvent` | collaboration close end。[E: codex-rs/protocol/src/protocol.rs:1633][E: codex-rs/protocol/src/protocol.rs:1634] | `EventMsg::CollabCloseEnd` |
| 51 | `CollabResumeBegin` | `CollabResumeBeginEvent` | collaboration resume begin。[E: codex-rs/protocol/src/protocol.rs:1635][E: codex-rs/protocol/src/protocol.rs:1636] | `EventMsg::CollabResumeBegin` |
| 52 | `CollabResumeEnd` | `CollabResumeEndEvent` | collaboration resume end。[E: codex-rs/protocol/src/protocol.rs:1637][E: codex-rs/protocol/src/protocol.rs:1638] | `EventMsg::CollabResumeEnd` |

## 设计动机速记

- `Event` 使用独立 `id` 字段做 submission correlation，并用独立 `msg` 字段承载 payload；同一种 `EventMsg` payload 可出现在不同 submission correlation id 下是由这个字段布局推出的设计含义。[E: codex-rs/protocol/src/protocol.rs:1420][E: codex-rs/protocol/src/protocol.rs:1421][E: codex-rs/protocol/src/protocol.rs:1422][E: codex-rs/protocol/src/protocol.rs:1423][I]
- `EventMsg` enum 注释要求 "none of these values have optional types" 以避免 extension code-gen 问题。[E: codex-rs/protocol/src/protocol.rs:1427]
- lifecycle event 与 streaming event 分离是文档组织层面的分类；Rust 源码中它们都是同一个 `EventMsg` enum 的 sibling variants。[I]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
