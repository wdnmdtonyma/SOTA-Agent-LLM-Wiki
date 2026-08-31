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
updated: a9519cbcdd
---

> `Submission` 是客户端提交到 agent queue 的 envelope，字段是 `id`、`op`、可选 W3C trace carrier、可选 core-generated `parent_turn_id` 与可选 `root_turn_id`；`op` 的 payload 类型是当前 `Op` enum。[E: codex-rs/protocol/src/protocol.rs:190][E: codex-rs/protocol/src/protocol.rs:192][E: codex-rs/protocol/src/protocol.rs:194][E: codex-rs/protocol/src/protocol.rs:196][E: codex-rs/protocol/src/protocol.rs:200][E: codex-rs/protocol/src/protocol.rs:202]

## 能回答的问题

- 当前 `Op` 一共有多少个变体,每个变体在哪一行定义?
- 哪些 `Op` 开启/更新 turn,哪些只改变 thread/session 状态?
- approval、elicitation、dynamic tool 的 response payload 分别走哪些 `Op`?
- realtime conversation 相关 operation 覆盖哪些输入形态?
- `ThreadSettingsOverrides` 与 `ThreadMemoryMode` 当前承载哪些 thread 级配置?
- `TurnInput` / `RecoverTurn` / `SuspendTurnAndShutdown` / `TurnSettings` 如何分工?

## Wire surface

`Op` 在当前源码中是 `#[non_exhaustive]` enum，因此外部 consumer 不能假设变体集合永久封闭。[E: codex-rs/protocol/src/protocol.rs:572][E: codex-rs/protocol/src/protocol.rs:573] 当前 `Op` 定义 29 个变体，从 `Interrupt` 到 `RunUserShellCommand`。相对 `9ded177ce7` 的 27 个变体，新增 `SuspendTurnAndShutdown` 与 `TurnSettings`。[E: codex-rs/protocol/src/protocol.rs:576][E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:630][E: codex-rs/protocol/src/protocol.rs:739]

`TurnInput` 通过 `TurnInputRequest` 携带 `input`、`thread_settings`、`start`、`additional_context`、`responsesapi_client_metadata` 与 optional `trace`；`TurnInputMode` 决定 start-or-steer、idle-start 或 steer-only。[E: codex-rs/protocol/src/turn_input.rs:47][E: codex-rs/protocol/src/turn_input.rs:48][E: codex-rs/protocol/src/turn_input.rs:49][E: codex-rs/protocol/src/turn_input.rs:50] `RecoverTurn` 恢复被打断的 regular turn，payload 是 `thread_settings`、`start_options` 加 oneshot reply。[E: codex-rs/protocol/src/protocol.rs:608][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/protocol/src/protocol.rs:610][E: codex-rs/protocol/src/protocol.rs:611] `ThreadSettings` 只应用同一组持久 thread-settings overrides，不启动 turn。[E: codex-rs/protocol/src/protocol.rs:623][E: codex-rs/protocol/src/protocol.rs:625] `TurnSettings` 只更新一个已在跑的 named turn，不改 future settings。[E: codex-rs/protocol/src/protocol.rs:630][E: codex-rs/protocol/src/protocol.rs:631][E: codex-rs/protocol/src/protocol.rs:632] `SuspendTurnAndShutdown` 停掉 active root turn 且不记录 terminal turn event，oneshot 回报 `SuspendTurnOutcome`。[E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:616][E: codex-rs/protocol/src/turn_input.rs:20]

`ConversationStartParams` 仍承载 realtime session 控制：delegation acknowledgement filler、session start/end developer instructions、handoff/model/modality/initial history/transport/version/voice fields，以及 BEM channel prefixes 与 `codex_responses_as_items`。[I]

## Op 全量变体表

| # | Variant | Payload | 语义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Interrupt` | unit | 中断当前 task,不终止后台 terminal process；响应侧发送 `TurnAborted`。[E: codex-rs/protocol/src/protocol.rs:576] | `protocol.rs:576` |
| 2 | `CleanBackgroundTerminals` | unit | 终止当前 thread 的所有后台 terminal process。[E: codex-rs/protocol/src/protocol.rs:580] | `protocol.rs:580` |
| 3 | `RealtimeConversationStart` | `ConversationStartParams` | 启动 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:583] | `protocol.rs:583` |
| 4 | `RealtimeConversationAudio` | `ConversationAudioParams` | 向运行中的 realtime conversation stream 发送 audio input。[E: codex-rs/protocol/src/protocol.rs:586] | `protocol.rs:586` |
| 5 | `RealtimeConversationText` | `ConversationTextParams` | 向 realtime conversation stream 发送 text input。[E: codex-rs/protocol/src/protocol.rs:589] | `protocol.rs:589` |
| 6 | `RealtimeConversationSpeech` | `ConversationSpeechParams` | 向 realtime conversation stream 追加 speakable text。[E: codex-rs/protocol/src/protocol.rs:592] | `protocol.rs:592` |
| 7 | `RealtimeConversationClose` | unit | 关闭运行中的 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:595] | `protocol.rs:595` |
| 8 | `RealtimeConversationListVoices` | unit | 请求 realtime conversation 支持的 voice 列表。[E: codex-rs/protocol/src/protocol.rs:598] | `protocol.rs:598` |
| 9 | `TurnInput` | `request: Box<TurnInputRequest>`, `mode: TurnInputMode`, oneshot `reply` | 按 `TurnInputMode` 提交 turn input；`TurnInputRequest` 可先应用 thread-settings overrides。[E: codex-rs/protocol/src/protocol.rs:601][E: codex-rs/protocol/src/protocol.rs:602][E: codex-rs/protocol/src/protocol.rs:603][E: codex-rs/protocol/src/protocol.rs:604][E: codex-rs/protocol/src/turn_input.rs:46] | `protocol.rs:601` |
| 10 | `RecoverTurn` | `thread_settings`, `start_options`, oneshot `reply` | 恢复被打断的 regular turn。[E: codex-rs/protocol/src/protocol.rs:608][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/protocol/src/protocol.rs:610][E: codex-rs/protocol/src/protocol.rs:611] | `protocol.rs:608` |
| 11 | `SuspendTurnAndShutdown` | oneshot `reply: SuspendTurnOutcome` | 停掉 active root turn 且不记录 terminal turn event，供另一 worker recover。[E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:616][E: codex-rs/protocol/src/turn_input.rs:20] | `protocol.rs:615` |
| 12 | `ThreadSettings` | `thread_settings` | 只应用持久 thread-settings overrides,不启动 turn；与 turn start 共用 submission queue 以保序。[E: codex-rs/protocol/src/protocol.rs:623][E: codex-rs/protocol/src/protocol.rs:625] | `protocol.rs:623` |
| 13 | `TurnSettings` | `turn_id`, `update: TurnSettingsUpdate`, oneshot `reply` | 只更新 named running turn 的 model/effort/summary/service_tier，不改 future settings。[E: codex-rs/protocol/src/protocol.rs:630][E: codex-rs/protocol/src/protocol.rs:631][E: codex-rs/protocol/src/protocol.rs:632][E: codex-rs/protocol/src/protocol.rs:477] | `protocol.rs:630` |
| 14 | `InterAgentCommunication` | `communication` | 记录 inter-agent communication 为 agent-message history,仍走 normal thread submission lifecycle。[E: codex-rs/protocol/src/protocol.rs:638][E: codex-rs/protocol/src/protocol.rs:639][E: codex-rs/protocol/src/protocol.rs:640] | `protocol.rs:638` |
| 15 | `ExecApproval` | `id`, `turn_id?`, `decision` | 回答 command execution approval request。[E: codex-rs/protocol/src/protocol.rs:644][E: codex-rs/protocol/src/protocol.rs:646][E: codex-rs/protocol/src/protocol.rs:648][E: codex-rs/protocol/src/protocol.rs:650] | `protocol.rs:644` |
| 16 | `PatchApproval` | `id`, `decision` | 回答 code patch approval request。[E: codex-rs/protocol/src/protocol.rs:654][E: codex-rs/protocol/src/protocol.rs:656][E: codex-rs/protocol/src/protocol.rs:658] | `protocol.rs:654` |
| 17 | `ResolveElicitation` | `server_name`, `request_id`, `decision`, `content?`, `meta?` | 回答 MCP elicitation request。[E: codex-rs/protocol/src/protocol.rs:662][E: codex-rs/protocol/src/protocol.rs:664][E: codex-rs/protocol/src/protocol.rs:666][E: codex-rs/protocol/src/protocol.rs:668][E: codex-rs/protocol/src/protocol.rs:670][E: codex-rs/protocol/src/protocol.rs:672] | `protocol.rs:662` |
| 18 | `UserInputAnswer` | `id`, `response` | 回答 `request_user_input` tool call。[E: codex-rs/protocol/src/protocol.rs:676][E: codex-rs/protocol/src/protocol.rs:680] | `protocol.rs:676` |
| 19 | `RequestPermissionsResponse` | `id`, `response` | 回答 `request_permissions` tool call。[E: codex-rs/protocol/src/protocol.rs:684][E: codex-rs/protocol/src/protocol.rs:688] | `protocol.rs:684` |
| 20 | `DynamicToolResponse` | `id`, `response` | 回答 dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:692][E: codex-rs/protocol/src/protocol.rs:696] | `protocol.rs:692` |
| 21 | `RefreshMcpServers` | unit | 重新初始化 MCP servers 并刷新 cached tool lists。[E: codex-rs/protocol/src/protocol.rs:700] | `protocol.rs:700` |
| 22 | `ReloadUserConfig` | unit | 重新加载 active session 的 user config layer overrides。[E: codex-rs/protocol/src/protocol.rs:706] | `protocol.rs:706` |
| 23 | `Compact` | unit | 要求 agent 总结当前 conversation context；summary 作为 `AgentMessage` event 返回。[E: codex-rs/protocol/src/protocol.rs:711] | `protocol.rs:711` |
| 24 | `SetThreadMemoryMode` | `mode: ThreadMemoryMode` | 持久化 thread 是否 eligible for memory generation,不调用模型。[E: codex-rs/protocol/src/protocol.rs:717] | `protocol.rs:717` |
| 25 | `ThreadRollback` | `num_turns` | 从 in-memory context 丢弃最后 N 个 user turns；不尝试 revert 本地文件系统变更。[E: codex-rs/protocol/src/protocol.rs:723] | `protocol.rs:723` |
| 26 | `Review` | `review_request` | 请求 agent 做 code review。[E: codex-rs/protocol/src/protocol.rs:726] | `protocol.rs:726` |
| 27 | `ApproveGuardianDeniedAction` | `event: GuardianAssessmentEvent` | 记录用户批准重试一个具体 Guardian-denied action。[E: codex-rs/protocol/src/protocol.rs:729] | `protocol.rs:729` |
| 28 | `Shutdown` | unit | 请求关闭 codex instance。[E: codex-rs/protocol/src/protocol.rs:732] | `protocol.rs:732` |
| 29 | `RunUserShellCommand` | `command`, `timeout_ms?` | 执行 `!cmd` 触发的 user-initiated shell command；输出通过 `ExecCommand*` events streaming。[E: codex-rs/protocol/src/protocol.rs:739][E: codex-rs/protocol/src/protocol.rs:741][E: codex-rs/protocol/src/protocol.rs:743] | `protocol.rs:739` |

## Thread settings companion

`ThreadSettingsOverrides` 集中承载 future-turn/thread 级覆盖项，字段包括 `environments`、`profile_workspace_roots`、`approval_policy`、`approvals_reviewer`、`sandbox_policy`、`permission_profile`、`active_permission_profile`、`windows_sandbox_level`、`model`、`effort`、`summary`、`service_tier`、`collaboration_mode` 与 `personality`；当前没有独立 `workspace_roots` 字段。[E: codex-rs/protocol/src/protocol.rs:502][E: codex-rs/protocol/src/protocol.rs:504][E: codex-rs/protocol/src/protocol.rs:508][E: codex-rs/protocol/src/protocol.rs:511][E: codex-rs/protocol/src/protocol.rs:514][E: codex-rs/protocol/src/protocol.rs:517][E: codex-rs/protocol/src/protocol.rs:520][E: codex-rs/protocol/src/protocol.rs:524][E: codex-rs/protocol/src/protocol.rs:527][E: codex-rs/protocol/src/protocol.rs:530][E: codex-rs/protocol/src/protocol.rs:536][E: codex-rs/protocol/src/protocol.rs:539][E: codex-rs/protocol/src/protocol.rs:545][E: codex-rs/protocol/src/protocol.rs:549][E: codex-rs/protocol/src/protocol.rs:552]

`TurnSettingsUpdate` 是 live-task 稀疏更新：`model`、`effort`（`Some(None)` 清除）、`summary`、`service_tier`（`Some(None)` 清除）。[E: codex-rs/protocol/src/protocol.rs:477][E: codex-rs/protocol/src/protocol.rs:478][E: codex-rs/protocol/src/protocol.rs:480][E: codex-rs/protocol/src/protocol.rs:481][E: codex-rs/protocol/src/protocol.rs:483]

`ThreadMemoryMode` 是 `SetThreadMemoryMode` 的 payload companion enum,当前只有 `Enabled` 与 `Disabled`,wire rename 为 lowercase。[E: codex-rs/protocol/src/protocol.rs:749][E: codex-rs/protocol/src/protocol.rs:750][E: codex-rs/protocol/src/protocol.rs:751]

`TurnInput` payload enum（不是 `Op` variant）有 `UserInput`、`ResponseItem`、`InterAgentCommunication` 三个输入形态；`client_id` 现在挂在 `TurnInput::UserInput` 上，不再是 `Submission` 字段。[E: codex-rs/protocol/src/turn_input.rs:32][E: codex-rs/protocol/src/turn_input.rs:33][E: codex-rs/protocol/src/turn_input.rs:37][E: codex-rs/protocol/src/turn_input.rs:38][E: codex-rs/protocol/src/protocol.rs:190]

## 设计动机速记

- `TurnInput` 和独立 `ThreadSettings` 共享 `ThreadSettingsOverrides`,说明 current protocol 把”更新 thread defaults”和”发起/steer 用户输入”拆成两个可排序的 submission 动作；恢复被打断 turn 走 `RecoverTurn`，停 root turn 供 handoff 走 `SuspendTurnAndShutdown`，改正在跑的 turn 走 `TurnSettings`。[E: codex-rs/protocol/src/turn_input.rs:48][E: codex-rs/protocol/src/protocol.rs:608][E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:623][E: codex-rs/protocol/src/protocol.rs:630]
- approval / elicitation / dynamic-tool response `Op` 都带 request/call id,用于把客户端返回的决策或 tool output 关联回等待中的交互。[E: codex-rs/protocol/src/protocol.rs:646][E: codex-rs/protocol/src/protocol.rs:656][E: codex-rs/protocol/src/protocol.rs:666][E: codex-rs/protocol/src/protocol.rs:678][E: codex-rs/protocol/src/protocol.rs:686][E: codex-rs/protocol/src/protocol.rs:694]
- `RunUserShellCommand` 明确是 user-initiated shell path,而 normal agent command execution 的生命周期由 `EventMsg::ExecCommand*` 事件表示。[E: codex-rs/protocol/src/protocol.rs:739]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/turn_input.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
