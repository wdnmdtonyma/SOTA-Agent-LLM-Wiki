---
id: ref.protocol-op
title: Protocol Op 变体索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/turn_input.rs]
symbols: [Submission, Op, ThreadMemoryMode, TurnInputRequest, RecoverTurnRequest, TurnInputMode, TurnSettingsUpdate]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `Submission` 是客户端提交到 agent queue 的 envelope，字段是 `id`、`op`、可选 W3C trace carrier、可选 core-generated `parent_turn_id` 与可选 `root_turn_id`；`op` 的 payload 类型是当前 `Op` enum。[E: codex-rs/protocol/src/protocol.rs:194][E: codex-rs/protocol/src/protocol.rs:196][E: codex-rs/protocol/src/protocol.rs:198][E: codex-rs/protocol/src/protocol.rs:198][E: codex-rs/protocol/src/protocol.rs:204][E: codex-rs/protocol/src/protocol.rs:204]

## 能回答的问题

- 当前 `Op` 一共有多少个变体,每个变体在哪一行定义?
- 哪些 `Op` 开启/更新 turn,哪些只改变 thread/session 状态?
- approval、elicitation、dynamic tool 的 response payload 分别走哪些 `Op`?
- realtime conversation 相关 operation 覆盖哪些输入形态?
- `ThreadSettingsOverrides` 与 `ThreadMemoryMode` 当前承载哪些 thread 级配置?
- `TurnInput` / `RecoverTurn` / `SuspendTurnAndShutdown` / `TurnSettings` 如何分工?

## Wire surface

`Op` 在当前源码中是 `#[non_exhaustive]` enum，因此外部 consumer 不能假设变体集合永久封闭。[E: codex-rs/protocol/src/protocol.rs:591][E: codex-rs/protocol/src/protocol.rs:611] 当前 `Op` 定义 29 个变体，从 `Interrupt` 到 `RunUserShellCommand`。[E: codex-rs/protocol/src/protocol.rs:614][E: codex-rs/protocol/src/protocol.rs:634][E: codex-rs/protocol/src/protocol.rs:649][E: codex-rs/protocol/src/protocol.rs:758]

`TurnInput` 通过 `TurnInputRequest` 携带 `input`、`thread_settings`、`start`、`additional_context`、`responsesapi_client_metadata` 与 optional `trace`。[E: codex-rs/protocol/src/turn_input.rs:47][E: codex-rs/protocol/src/turn_input.rs:48][E: codex-rs/protocol/src/turn_input.rs:49][E: codex-rs/protocol/src/turn_input.rs:50] `RecoverTurn` 恢复被打断的 regular turn，payload 是 `thread_settings`、`start_options` 加 oneshot reply。[E: codex-rs/protocol/src/protocol.rs:627][E: codex-rs/protocol/src/protocol.rs:628][E: codex-rs/protocol/src/protocol.rs:629][E: codex-rs/protocol/src/protocol.rs:649] `ThreadSettings` 只应用同一组持久 thread-settings overrides，不启动 turn。[E: codex-rs/protocol/src/protocol.rs:642][E: codex-rs/protocol/src/protocol.rs:663] `TurnSettings` 只更新一个已在跑的 named turn，不改 future settings。[E: codex-rs/protocol/src/protocol.rs:649][E: codex-rs/protocol/src/protocol.rs:669][E: codex-rs/protocol/src/protocol.rs:651] `SuspendTurnAndShutdown` 停掉 active root turn 且不记录 terminal turn event，oneshot 回报 `SuspendTurnOutcome`。[E: codex-rs/protocol/src/protocol.rs:634][E: codex-rs/protocol/src/protocol.rs:635][E: codex-rs/protocol/src/turn_input.rs:20]

`ConversationStartParams` 仍承载 realtime session 控制：delegation acknowledgement filler、session start/end developer instructions、handoff/model/modality/initial history/transport/version/voice fields，以及 BEM channel prefixes 与 `codex_responses_as_items`。[I]

## Op 全量变体表

| # | Variant | Payload | 语义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Interrupt` | unit | 中断当前 task,不终止后台 terminal process；响应侧发送 `TurnAborted`。[E: codex-rs/protocol/src/protocol.rs:595] | `protocol.rs:595` |
| 2 | `CleanBackgroundTerminals` | unit | 终止当前 thread 的所有后台 terminal process。[E: codex-rs/protocol/src/protocol.rs:599] | `protocol.rs:599` |
| 3 | `RealtimeConversationStart` | `ConversationStartParams` | 启动 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:621] | `protocol.rs:602` |
| 4 | `RealtimeConversationAudio` | `ConversationAudioParams` | 向运行中的 realtime conversation stream 发送 audio input。[E: codex-rs/protocol/src/protocol.rs:605] | `protocol.rs:605` |
| 5 | `RealtimeConversationText` | `ConversationTextParams` | 向 realtime conversation stream 发送 text input。[E: codex-rs/protocol/src/protocol.rs:627] | `protocol.rs:608` |
| 6 | `RealtimeConversationSpeech` | `ConversationSpeechParams` | 向 realtime conversation stream 追加 speakable text。[E: codex-rs/protocol/src/protocol.rs:630] | `protocol.rs:611` |
| 7 | `RealtimeConversationClose` | unit | 关闭运行中的 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:614] | `protocol.rs:614` |
| 8 | `RealtimeConversationListVoices` | unit | 请求 realtime conversation 支持的 voice 列表。[E: codex-rs/protocol/src/protocol.rs:617] | `protocol.rs:617` |
| 9 | `TurnInput` | `request: Box<TurnInputRequest>`, `mode: TurnInputMode`, oneshot `reply` | 按 `TurnInputMode` 提交 turn input；`TurnInputRequest` 可先应用 thread-settings overrides。[E: codex-rs/protocol/src/protocol.rs:620][E: codex-rs/protocol/src/protocol.rs:621][E: codex-rs/protocol/src/protocol.rs:622][E: codex-rs/protocol/src/protocol.rs:642][E: codex-rs/protocol/src/turn_input.rs:46] | `protocol.rs:620` |
| 10 | `RecoverTurn` | `thread_settings`, `start_options`, oneshot `reply` | 恢复被打断的 regular turn。[E: codex-rs/protocol/src/protocol.rs:627][E: codex-rs/protocol/src/protocol.rs:628][E: codex-rs/protocol/src/protocol.rs:629][E: codex-rs/protocol/src/protocol.rs:649] | `protocol.rs:627` |
| 11 | `SuspendTurnAndShutdown` | oneshot `reply: SuspendTurnOutcome` | 停掉 active root turn 且不记录 terminal turn event，供另一 worker recover。[E: codex-rs/protocol/src/protocol.rs:634][E: codex-rs/protocol/src/protocol.rs:635][E: codex-rs/protocol/src/turn_input.rs:20] | `protocol.rs:634` |
| 12 | `ThreadSettings` | `thread_settings` | 只应用持久 thread-settings overrides,不启动 turn；与 turn start 共用 submission queue 以保序。[E: codex-rs/protocol/src/protocol.rs:642][E: codex-rs/protocol/src/protocol.rs:644] | `protocol.rs:642` |
| 13 | `TurnSettings` | `turn_id`, `update: TurnSettingsUpdate`, oneshot `reply` | 只更新 named running turn 的 approvals_reviewer/model/effort/summary/service_tier，不改 future settings。[E: codex-rs/protocol/src/protocol.rs:649][E: codex-rs/protocol/src/protocol.rs:650][E: codex-rs/protocol/src/protocol.rs:651][E: codex-rs/protocol/src/protocol.rs:494] | `protocol.rs:649` |
| 14 | `InterAgentCommunication` | `communication` | 记录 inter-agent communication 为 agent-message history,仍走 normal thread submission lifecycle。[E: codex-rs/protocol/src/protocol.rs:657][E: codex-rs/protocol/src/protocol.rs:677][E: codex-rs/protocol/src/protocol.rs:659] | `protocol.rs:657` |
| 15 | `ExecApproval` | `id`, `turn_id?`, `decision` | 回答 command execution approval request。[E: codex-rs/protocol/src/protocol.rs:681][E: codex-rs/protocol/src/protocol.rs:683][E: codex-rs/protocol/src/protocol.rs:685][E: codex-rs/protocol/src/protocol.rs:669] | `protocol.rs:662` |
| 16 | `PatchApproval` | `id`, `decision` | 回答 code patch approval request。[E: codex-rs/protocol/src/protocol.rs:673][E: codex-rs/protocol/src/protocol.rs:675][E: codex-rs/protocol/src/protocol.rs:677] | `protocol.rs:673` |
| 17 | `ResolveElicitation` | `server_name`, `request_id`, `decision`, `content?`, `meta?` | 回答 MCP elicitation request。[E: codex-rs/protocol/src/protocol.rs:681][E: codex-rs/protocol/src/protocol.rs:683][E: codex-rs/protocol/src/protocol.rs:685][E: codex-rs/protocol/src/protocol.rs:687][E: codex-rs/protocol/src/protocol.rs:689][E: codex-rs/protocol/src/protocol.rs:691] | `protocol.rs:681` |
| 18 | `UserInputAnswer` | `id`, `response` | 回答 `request_user_input` tool call。[E: codex-rs/protocol/src/protocol.rs:695][E: codex-rs/protocol/src/protocol.rs:699] | `protocol.rs:695` |
| 19 | `RequestPermissionsResponse` | `id`, `response` | 回答 `request_permissions` tool call。[E: codex-rs/protocol/src/protocol.rs:703][E: codex-rs/protocol/src/protocol.rs:707] | `protocol.rs:703` |
| 20 | `DynamicToolResponse` | `id`, `response` | 回答 dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:730][E: codex-rs/protocol/src/protocol.rs:715] | `protocol.rs:711` |
| 21 | `RefreshMcpServers` | unit | 重新初始化 MCP servers 并刷新 cached tool lists。[E: codex-rs/protocol/src/protocol.rs:719] | `protocol.rs:718` |
| 22 | `ReloadUserConfig` | unit | 重新加载 active session 的 user config layer overrides。[E: codex-rs/protocol/src/protocol.rs:719] | `protocol.rs:721` |
| 23 | `Compact` | unit | 要求 agent 总结当前 conversation context；summary 作为 `AgentMessage` event 返回。[E: codex-rs/protocol/src/protocol.rs:725] | `protocol.rs:727` |
| 24 | `SetThreadMemoryMode` | `mode: ThreadMemoryMode` | 持久化 thread 是否 eligible for memory generation,不调用模型。[E: codex-rs/protocol/src/protocol.rs:736] | `protocol.rs:736` |
| 25 | `ThreadRollback` | `num_turns` | 从 in-memory context 丢弃最后 N 个 user turns；不尝试 revert 本地文件系统变更。[E: codex-rs/protocol/src/protocol.rs:742] | `protocol.rs:742` |
| 26 | `Review` | `review_request` | 请求 agent 做 code review。[E: codex-rs/protocol/src/protocol.rs:745] | `protocol.rs:745` |
| 27 | `ApproveGuardianDeniedAction` | `event: GuardianAssessmentEvent` | 记录用户批准重试一个具体 Guardian-denied action。[E: codex-rs/protocol/src/protocol.rs:748] | `protocol.rs:748` |
| 28 | `Shutdown` | unit | 请求关闭 codex instance。[E: codex-rs/protocol/src/protocol.rs:770] | `protocol.rs:751` |
| 29 | `RunUserShellCommand` | `command`, `timeout_ms?` | 执行 `!cmd` 触发的 user-initiated shell command；输出通过 `ExecCommand*` events streaming。[E: codex-rs/protocol/src/protocol.rs:758][E: codex-rs/protocol/src/protocol.rs:760][E: codex-rs/protocol/src/protocol.rs:762] | `protocol.rs:758` |

## Thread settings companion

`ThreadSettingsOverrides` 集中承载 future-turn/thread 级覆盖项，字段包括 `environments`、`profile_workspace_roots`、`approval_policy`、`approvals_reviewer`、`sandbox_policy`、`permission_profile`、`active_permission_profile`、`windows_sandbox_level`、`model`、`effort`、`summary`、`service_tier`、`collaboration_mode` 与 `personality`；当前没有独立 `workspace_roots` 字段。[E: codex-rs/protocol/src/protocol.rs:521][E: codex-rs/protocol/src/protocol.rs:523][E: codex-rs/protocol/src/protocol.rs:546][E: codex-rs/protocol/src/protocol.rs:549][E: codex-rs/protocol/src/protocol.rs:533][E: codex-rs/protocol/src/protocol.rs:555][E: codex-rs/protocol/src/protocol.rs:558][E: codex-rs/protocol/src/protocol.rs:543][E: codex-rs/protocol/src/protocol.rs:546][E: codex-rs/protocol/src/protocol.rs:568][E: codex-rs/protocol/src/protocol.rs:555][E: codex-rs/protocol/src/protocol.rs:558][E: codex-rs/protocol/src/protocol.rs:564][E: codex-rs/protocol/src/protocol.rs:568][E: codex-rs/protocol/src/protocol.rs:571]

`TurnSettingsUpdate` 是 live-task 稀疏更新：`approvals_reviewer`、`model`、`effort`（`Some(None)` 清除）、`summary`、`service_tier`（`Some(None)` 清除）。[E: codex-rs/protocol/src/protocol.rs:494][E: codex-rs/protocol/src/protocol.rs:496][E: codex-rs/protocol/src/protocol.rs:497][E: codex-rs/protocol/src/protocol.rs:499][E: codex-rs/protocol/src/protocol.rs:500][E: codex-rs/protocol/src/protocol.rs:521]

`ThreadMemoryMode` 是 `SetThreadMemoryMode` 的 payload companion enum,当前只有 `Enabled` 与 `Disabled`,wire rename 为 lowercase。[E: codex-rs/protocol/src/protocol.rs:768][E: codex-rs/protocol/src/protocol.rs:769][E: codex-rs/protocol/src/protocol.rs:770]

`TurnInput` payload enum（不是 `Op` variant）有 `UserInput`、`ResponseItem`、`InterAgentCommunication` 三个输入形态；`client_id` 现在挂在 `TurnInput::UserInput` 上，不再是 `Submission` 字段。[E: codex-rs/protocol/src/turn_input.rs:32][E: codex-rs/protocol/src/turn_input.rs:33][E: codex-rs/protocol/src/turn_input.rs:37][E: codex-rs/protocol/src/turn_input.rs:38][E: codex-rs/protocol/src/protocol.rs:192]

## 设计动机速记

- `TurnInput` 和独立 `ThreadSettings` 共享 `ThreadSettingsOverrides`,说明 current protocol 把”更新 thread defaults”和”发起/steer 用户输入”拆成两个可排序的 submission 动作；恢复被打断 turn 走 `RecoverTurn`，停 root turn 供 handoff 走 `SuspendTurnAndShutdown`，改正在跑的 turn 走 `TurnSettings`。[E: codex-rs/protocol/src/turn_input.rs:48][E: codex-rs/protocol/src/protocol.rs:627][E: codex-rs/protocol/src/protocol.rs:634][E: codex-rs/protocol/src/protocol.rs:642][E: codex-rs/protocol/src/protocol.rs:649]
- approval / elicitation / dynamic-tool response `Op` 都带 request/call id,用于把客户端返回的决策或 tool output 关联回等待中的交互。[E: codex-rs/protocol/src/protocol.rs:665][E: codex-rs/protocol/src/protocol.rs:675][E: codex-rs/protocol/src/protocol.rs:685][E: codex-rs/protocol/src/protocol.rs:697][E: codex-rs/protocol/src/protocol.rs:705][E: codex-rs/protocol/src/protocol.rs:713]
- `RunUserShellCommand` 明确是 user-initiated shell path,而 normal agent command execution 的生命周期由 `EventMsg::ExecCommand*` 事件表示。[E: codex-rs/protocol/src/protocol.rs:758]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/turn_input.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
