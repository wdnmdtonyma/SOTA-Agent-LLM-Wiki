---
id: ref.protocol-op
title: Protocol Op 变体索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/turn_input.rs]
symbols: [Submission, Op, ThreadMemoryMode, TurnInputRequest, RecoverTurnRequest, TurnInputMode]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `Submission` 是客户端提交到 agent queue 的 envelope，字段是 `id`、`op`、可选 W3C trace carrier、可选 core-generated `parent_turn_id` 与可选 `root_turn_id`；`op` 的 payload 类型是当前 `Op` enum。[E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/protocol/src/protocol.rs:186][E: codex-rs/protocol/src/protocol.rs:188][E: codex-rs/protocol/src/protocol.rs:190][E: codex-rs/protocol/src/protocol.rs:194][E: codex-rs/protocol/src/protocol.rs:196]

## 能回答的问题

- 当前 `Op` 一共有多少个变体,每个变体在哪一行定义?
- 哪些 `Op` 开启/更新 turn,哪些只改变 thread/session 状态?
- approval、elicitation、dynamic tool 的 response payload 分别走哪些 `Op`?
- realtime conversation 相关 operation 覆盖哪些输入形态?
- `ThreadSettingsOverrides` 与 `ThreadMemoryMode` 当前承载哪些 thread 级配置?
- `TurnInput` / `RecoverTurn` 如何替代旧的 `UserInput` submission?

## Wire surface

`Op` 在当前源码中是 `#[non_exhaustive]` enum，因此外部 consumer 不能假设变体集合永久封闭。[E: codex-rs/protocol/src/protocol.rs:540][E: codex-rs/protocol/src/protocol.rs:541] 当前 `Op` 定义 27 个变体，从 `Interrupt` 到 `RunUserShellCommand`。相对 `7750465934`，旧的 `UserInput` variant 被 `TurnInput` 与 `RecoverTurn` 替换，净增 1。[E: codex-rs/protocol/src/protocol.rs:544][E: codex-rs/protocol/src/protocol.rs:569][E: codex-rs/protocol/src/protocol.rs:576][E: codex-rs/protocol/src/protocol.rs:692][I]

`TurnInput` 通过 `TurnInputRequest` 携带 `input`、`thread_settings`、`start`、`additional_context`、`responsesapi_client_metadata` 与 optional `trace`；`TurnInputMode` 决定 start-or-steer、idle-start 或 steer-only。[E: codex-rs/protocol/src/turn_input.rs:32][E: codex-rs/protocol/src/turn_input.rs:33][E: codex-rs/protocol/src/turn_input.rs:34][E: codex-rs/protocol/src/turn_input.rs:35][E: codex-rs/protocol/src/turn_input.rs:36][E: codex-rs/protocol/src/turn_input.rs:37][E: codex-rs/protocol/src/turn_input.rs:38][E: codex-rs/protocol/src/turn_input.rs:117][E: codex-rs/protocol/src/turn_input.rs:119][E: codex-rs/protocol/src/turn_input.rs:121][E: codex-rs/protocol/src/turn_input.rs:123] `RecoverTurn` 恢复被打断的 regular turn，payload 是 `thread_settings` 加 oneshot reply。[E: codex-rs/protocol/src/protocol.rs:576][E: codex-rs/protocol/src/protocol.rs:577][E: codex-rs/protocol/src/protocol.rs:578] `ThreadSettings` 则只应用同一组持久 thread-settings overrides，不启动 turn。[E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:587]

`ConversationStartParams` 仍承载 realtime session 控制：delegation acknowledgement filler、session start/end developer instructions、handoff/model/modality/initial history/transport/version/voice fields，以及 BEM channel prefixes 与 `codex_responses_as_items`。[E: codex-rs/protocol/src/protocol.rs:210][E: codex-rs/protocol/src/protocol.rs:212][E: codex-rs/protocol/src/protocol.rs:215][E: codex-rs/protocol/src/protocol.rs:220][E: codex-rs/protocol/src/protocol.rs:227][E: codex-rs/protocol/src/protocol.rs:229][E: codex-rs/protocol/src/protocol.rs:237][E: codex-rs/protocol/src/protocol.rs:239][E: codex-rs/protocol/src/protocol.rs:242][E: codex-rs/protocol/src/protocol.rs:244][E: codex-rs/protocol/src/protocol.rs:245][I]

## Op 全量变体表

| # | Variant | Payload | 语义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Interrupt` | unit | 中断当前 task,不终止后台 terminal process；响应侧发送 `TurnAborted`。[E: codex-rs/protocol/src/protocol.rs:544] | `protocol.rs:544` |
| 2 | `CleanBackgroundTerminals` | unit | 终止当前 thread 的所有后台 terminal process。[E: codex-rs/protocol/src/protocol.rs:548] | `protocol.rs:548` |
| 3 | `RealtimeConversationStart` | `ConversationStartParams` | 启动 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:551] | `protocol.rs:551` |
| 4 | `RealtimeConversationAudio` | `ConversationAudioParams` | 向运行中的 realtime conversation stream 发送 audio input。[E: codex-rs/protocol/src/protocol.rs:554] | `protocol.rs:554` |
| 5 | `RealtimeConversationText` | `ConversationTextParams` | 向 realtime conversation stream 发送 text input。[E: codex-rs/protocol/src/protocol.rs:557] | `protocol.rs:557` |
| 6 | `RealtimeConversationSpeech` | `ConversationSpeechParams` | 向 realtime conversation stream 追加 speakable text。[E: codex-rs/protocol/src/protocol.rs:560] | `protocol.rs:560` |
| 7 | `RealtimeConversationClose` | unit | 关闭运行中的 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:563] | `protocol.rs:563` |
| 8 | `RealtimeConversationListVoices` | unit | 请求 realtime conversation 支持的 voice 列表。[E: codex-rs/protocol/src/protocol.rs:566] | `protocol.rs:566` |
| 9 | `TurnInput` | `request: Box<TurnInputRequest>`, `mode: TurnInputMode`, oneshot `reply` | 按 `TurnInputMode` 提交 turn input；`TurnInputRequest` 可先应用 thread-settings overrides。[E: codex-rs/protocol/src/protocol.rs:569][E: codex-rs/protocol/src/protocol.rs:570][E: codex-rs/protocol/src/protocol.rs:571][E: codex-rs/protocol/src/protocol.rs:572][E: codex-rs/protocol/src/turn_input.rs:32] | `protocol.rs:569` |
| 10 | `RecoverTurn` | `thread_settings`, oneshot `reply` | 恢复被打断的 regular turn。[E: codex-rs/protocol/src/protocol.rs:576][E: codex-rs/protocol/src/protocol.rs:576][E: codex-rs/protocol/src/protocol.rs:577][E: codex-rs/protocol/src/protocol.rs:578] | `protocol.rs:576` |
| 11 | `ThreadSettings` | `thread_settings` | 只应用持久 thread-settings overrides,不启动 turn。[E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:587] | `protocol.rs:585` |
| 12 | `InterAgentCommunication` | `communication` | 记录 inter-agent communication 为 agent-message history,仍走 normal thread submission lifecycle。[E: codex-rs/protocol/src/protocol.rs:592][E: codex-rs/protocol/src/protocol.rs:592][E: codex-rs/protocol/src/protocol.rs:593] | `protocol.rs:592` |
| 13 | `ExecApproval` | `id`, `turn_id?`, `decision` | 回答 command execution approval request。[E: codex-rs/protocol/src/protocol.rs:597][E: codex-rs/protocol/src/protocol.rs:599][E: codex-rs/protocol/src/protocol.rs:601][E: codex-rs/protocol/src/protocol.rs:603] | `protocol.rs:597` |
| 14 | `PatchApproval` | `id`, `decision` | 回答 code patch approval request。[E: codex-rs/protocol/src/protocol.rs:607][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/protocol/src/protocol.rs:611] | `protocol.rs:607` |
| 15 | `ResolveElicitation` | `server_name`, `request_id`, `decision`, `content?`, `meta?` | 回答 MCP elicitation request。[E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:617][E: codex-rs/protocol/src/protocol.rs:619][E: codex-rs/protocol/src/protocol.rs:621][E: codex-rs/protocol/src/protocol.rs:623][E: codex-rs/protocol/src/protocol.rs:625] | `protocol.rs:615` |
| 16 | `UserInputAnswer` | `id`, `response` | 回答 `request_user_input` tool call。[E: codex-rs/protocol/src/protocol.rs:629][E: codex-rs/protocol/src/protocol.rs:633] | `protocol.rs:629` |
| 17 | `RequestPermissionsResponse` | `id`, `response` | 回答 `request_permissions` tool call。[E: codex-rs/protocol/src/protocol.rs:637][E: codex-rs/protocol/src/protocol.rs:641] | `protocol.rs:637` |
| 18 | `DynamicToolResponse` | `id`, `response` | 回答 dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:645][E: codex-rs/protocol/src/protocol.rs:649] | `protocol.rs:645` |
| 19 | `RefreshMcpServers` | unit | 重新初始化 MCP servers 并刷新 cached tool lists。[E: codex-rs/protocol/src/protocol.rs:653] | `protocol.rs:653` |
| 20 | `ReloadUserConfig` | unit | 重新加载 active session 的 user config layer overrides。[E: codex-rs/protocol/src/protocol.rs:659] | `protocol.rs:659` |
| 21 | `Compact` | unit | 要求 agent 总结当前 conversation context；summary 作为 `AgentMessage` event 返回。[E: codex-rs/protocol/src/protocol.rs:664] | `protocol.rs:664` |
| 22 | `SetThreadMemoryMode` | `mode: ThreadMemoryMode` | 持久化 thread 是否 eligible for memory generation,不调用模型。[E: codex-rs/protocol/src/protocol.rs:670] | `protocol.rs:670` |
| 23 | `ThreadRollback` | `num_turns` | 从 in-memory context 丢弃最后 N 个 user turns；不尝试 revert 本地文件系统变更。[E: codex-rs/protocol/src/protocol.rs:676] | `protocol.rs:676` |
| 24 | `Review` | `review_request` | 请求 agent 做 code review。[E: codex-rs/protocol/src/protocol.rs:679] | `protocol.rs:679` |
| 25 | `ApproveGuardianDeniedAction` | `event: GuardianAssessmentEvent` | 记录用户批准重试一个具体 Guardian-denied action。[E: codex-rs/protocol/src/protocol.rs:682] | `protocol.rs:682` |
| 26 | `Shutdown` | unit | 请求关闭 codex instance。[E: codex-rs/protocol/src/protocol.rs:685] | `protocol.rs:685` |
| 27 | `RunUserShellCommand` | `command` | 执行 `!cmd` 触发的 user-initiated shell command；输出通过 `ExecCommand*` events streaming。[E: codex-rs/protocol/src/protocol.rs:692][E: codex-rs/protocol/src/protocol.rs:694] | `protocol.rs:692` |

## Thread settings companion

`ThreadSettingsOverrides` 集中承载 future-turn/thread 级覆盖项，字段包括 `environments`、`profile_workspace_roots`、`approval_policy`、`approvals_reviewer`、`sandbox_policy`、`permission_profile`、`active_permission_profile`、`windows_sandbox_level`、`model`、`effort`、`summary`、`service_tier`、`collaboration_mode` 与 `personality`；当前没有独立 `workspace_roots` 字段。[E: codex-rs/protocol/src/protocol.rs:470][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:476][E: codex-rs/protocol/src/protocol.rs:479][E: codex-rs/protocol/src/protocol.rs:482][E: codex-rs/protocol/src/protocol.rs:485][E: codex-rs/protocol/src/protocol.rs:488][E: codex-rs/protocol/src/protocol.rs:492][E: codex-rs/protocol/src/protocol.rs:495][E: codex-rs/protocol/src/protocol.rs:498][E: codex-rs/protocol/src/protocol.rs:504][E: codex-rs/protocol/src/protocol.rs:507][E: codex-rs/protocol/src/protocol.rs:513][E: codex-rs/protocol/src/protocol.rs:517][E: codex-rs/protocol/src/protocol.rs:520]

`ThreadMemoryMode` 是 `SetThreadMemoryMode` 的 payload companion enum,当前只有 `Enabled` 与 `Disabled`,wire rename 为 lowercase。[E: codex-rs/protocol/src/protocol.rs:698][E: codex-rs/protocol/src/protocol.rs:701][E: codex-rs/protocol/src/protocol.rs:702]

`TurnInput` payload enum（不是 `Op` variant）有 `UserInput`、`ResponseItem`、`InterAgentCommunication` 三个输入形态；`client_id` 现在挂在 `TurnInput::UserInput` 上，不再是 `Submission` 字段。[E: codex-rs/protocol/src/turn_input.rs:18][E: codex-rs/protocol/src/turn_input.rs:19][E: codex-rs/protocol/src/turn_input.rs:21][E: codex-rs/protocol/src/turn_input.rs:23][E: codex-rs/protocol/src/turn_input.rs:24][E: codex-rs/protocol/src/protocol.rs:184][I]

## 设计动机速记

- `TurnInput` 和独立 `ThreadSettings` 共享 `ThreadSettingsOverrides`,说明 current protocol 把”更新 thread defaults”和”发起/steer 用户输入”拆成两个可排序的 submission 动作；恢复被打断 turn 则走第三条 `RecoverTurn`。[E: codex-rs/protocol/src/turn_input.rs:34][E: codex-rs/protocol/src/protocol.rs:576][E: codex-rs/protocol/src/protocol.rs:585][I]
- approval / elicitation / dynamic-tool response `Op` 都带 request/call id,用于把客户端返回的决策或 tool output 关联回等待中的交互。[E: codex-rs/protocol/src/protocol.rs:599][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/protocol/src/protocol.rs:619][E: codex-rs/protocol/src/protocol.rs:631][E: codex-rs/protocol/src/protocol.rs:639][E: codex-rs/protocol/src/protocol.rs:647][I]
- `RunUserShellCommand` 明确是 user-initiated shell path,而 normal agent command execution 的生命周期由 `EventMsg::ExecCommand*` 事件表示。[E: codex-rs/protocol/src/protocol.rs:692][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/turn_input.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
