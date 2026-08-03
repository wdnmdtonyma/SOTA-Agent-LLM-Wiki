---
id: ref.protocol-op
title: Protocol Op 变体索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Submission, Op, ThreadMemoryMode]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 7750465934
---

> `Submission` 是客户端提交到 agent queue 的 envelope，字段是 `id`、`op`、可选 `client_user_message_id`、可选 W3C trace carrier 与可选 core-generated `parent_turn_id`；`op` 的 payload 类型是当前 `Op` enum。[E: codex-rs/protocol/src/protocol.rs:176][E: codex-rs/protocol/src/protocol.rs:178][E: codex-rs/protocol/src/protocol.rs:180][E: codex-rs/protocol/src/protocol.rs:182][E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/protocol/src/protocol.rs:186]

## 能回答的问题

- 当前 `Op` 一共有多少个变体,每个变体在哪一行定义?
- 哪些 `Op` 开启/更新 turn,哪些只改变 thread/session 状态?
- approval、elicitation、dynamic tool 的 response payload 分别走哪些 `Op`?
- realtime conversation 相关 operation 覆盖哪些输入形态?
- `ThreadSettingsOverrides` 与 `ThreadMemoryMode` 当前承载哪些 thread 级配置?

## Wire surface

`Op` 在当前源码中是 `#[non_exhaustive]` enum，因此外部 consumer 不能假设变体集合永久封闭。[E: codex-rs/protocol/src/protocol.rs:530][E: codex-rs/protocol/src/protocol.rs:531] 当前 `Op` 仍定义 26 个变体，从 `Interrupt` 到 `RunUserShellCommand`；相对 `61a44880a8` 没有 variant 增删。[E: codex-rs/protocol/src/protocol.rs:534][E: codex-rs/protocol/src/protocol.rs:684][I]

`UserInput` 现在可以在启动 turn 前携带 `thread_settings` overrides,也可以携带 `additional_context` 和 Responses API client metadata；`ThreadSettings` 则只应用同一组持久 thread-settings overrides,不启动 turn。[E: codex-rs/protocol/src/protocol.rs:559][E: codex-rs/protocol/src/protocol.rs:565][E: codex-rs/protocol/src/protocol.rs:567][E: codex-rs/protocol/src/protocol.rs:570][E: codex-rs/protocol/src/protocol.rs:577][E: codex-rs/protocol/src/protocol.rs:579]

`ConversationStartParams` 在本轮增加三项 realtime session 控制：可选 delegation acknowledgement filler，以及 session start/end 两段 developer instructions；其余 handoff、model、modality、initial history、transport/version/voice fields 仍在同一 payload 中。[E: codex-rs/protocol/src/protocol.rs:200][E: codex-rs/protocol/src/protocol.rs:202][E: codex-rs/protocol/src/protocol.rs:205][E: codex-rs/protocol/src/protocol.rs:215][E: codex-rs/protocol/src/protocol.rs:221][E: codex-rs/protocol/src/protocol.rs:225][E: codex-rs/protocol/src/protocol.rs:227][E: codex-rs/protocol/src/protocol.rs:229][E: codex-rs/protocol/src/protocol.rs:235][I]

## Op 全量变体表

| # | Variant | Payload | 语义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Interrupt` | unit | 中断当前 task,不终止后台 terminal process；响应侧发送 `TurnAborted`。[E: codex-rs/protocol/src/protocol.rs:534] | `protocol.rs:534` |
| 2 | `CleanBackgroundTerminals` | unit | 终止当前 thread 的所有后台 terminal process。[E: codex-rs/protocol/src/protocol.rs:538] | `protocol.rs:538` |
| 3 | `RealtimeConversationStart` | `ConversationStartParams` | 启动 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:541] | `protocol.rs:541` |
| 4 | `RealtimeConversationAudio` | `ConversationAudioParams` | 向运行中的 realtime conversation stream 发送 audio input。[E: codex-rs/protocol/src/protocol.rs:544] | `protocol.rs:544` |
| 5 | `RealtimeConversationText` | `ConversationTextParams` | 向 realtime conversation stream 发送 text input。[E: codex-rs/protocol/src/protocol.rs:547] | `protocol.rs:547` |
| 6 | `RealtimeConversationSpeech` | `ConversationSpeechParams` | 向 realtime conversation stream 追加 speakable text。[E: codex-rs/protocol/src/protocol.rs:550] | `protocol.rs:550` |
| 7 | `RealtimeConversationClose` | unit | 关闭运行中的 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:553] | `protocol.rs:553` |
| 8 | `RealtimeConversationListVoices` | unit | 请求 realtime conversation 支持的 voice 列表。[E: codex-rs/protocol/src/protocol.rs:556] | `protocol.rs:556` |
| 9 | `UserInput` | `items`, `final_output_json_schema`, `responsesapi_client_metadata`, `additional_context`, `thread_settings` | 用户输入并可先应用 thread-settings overrides。[E: codex-rs/protocol/src/protocol.rs:559][E: codex-rs/protocol/src/protocol.rs:561][E: codex-rs/protocol/src/protocol.rs:563][E: codex-rs/protocol/src/protocol.rs:565][E: codex-rs/protocol/src/protocol.rs:567][E: codex-rs/protocol/src/protocol.rs:570] | `protocol.rs:559` |
| 10 | `ThreadSettings` | `thread_settings` | 只应用持久 thread-settings overrides,不启动 turn。[E: codex-rs/protocol/src/protocol.rs:577][E: codex-rs/protocol/src/protocol.rs:579] | `protocol.rs:577` |
| 11 | `InterAgentCommunication` | `communication` | 记录 inter-agent communication 为 agent-message history,仍走 normal thread submission lifecycle。[E: codex-rs/protocol/src/protocol.rs:584][E: codex-rs/protocol/src/protocol.rs:585] | `protocol.rs:584` |
| 12 | `ExecApproval` | `id`, `turn_id?`, `decision` | 回答 command execution approval request。[E: codex-rs/protocol/src/protocol.rs:589][E: codex-rs/protocol/src/protocol.rs:591][E: codex-rs/protocol/src/protocol.rs:593][E: codex-rs/protocol/src/protocol.rs:595] | `protocol.rs:589` |
| 13 | `PatchApproval` | `id`, `decision` | 回答 code patch approval request。[E: codex-rs/protocol/src/protocol.rs:599][E: codex-rs/protocol/src/protocol.rs:601][E: codex-rs/protocol/src/protocol.rs:603] | `protocol.rs:599` |
| 14 | `ResolveElicitation` | `server_name`, `request_id`, `decision`, `content?`, `meta?` | 回答 MCP elicitation request。[E: codex-rs/protocol/src/protocol.rs:607][E: codex-rs/protocol/src/protocol.rs:609][E: codex-rs/protocol/src/protocol.rs:611][E: codex-rs/protocol/src/protocol.rs:613][E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:617] | `protocol.rs:607` |
| 15 | `UserInputAnswer` | `id`, `response` | 回答 `request_user_input` tool call。[E: codex-rs/protocol/src/protocol.rs:621][E: codex-rs/protocol/src/protocol.rs:625] | `protocol.rs:621` |
| 16 | `RequestPermissionsResponse` | `id`, `response` | 回答 `request_permissions` tool call。[E: codex-rs/protocol/src/protocol.rs:629][E: codex-rs/protocol/src/protocol.rs:633] | `protocol.rs:629` |
| 17 | `DynamicToolResponse` | `id`, `response` | 回答 dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:637][E: codex-rs/protocol/src/protocol.rs:641] | `protocol.rs:637` |
| 18 | `RefreshMcpServers` | unit | 重新初始化 MCP servers 并刷新 cached tool lists。[E: codex-rs/protocol/src/protocol.rs:645] | `protocol.rs:645` |
| 19 | `ReloadUserConfig` | unit | 重新加载 active session 的 user config layer overrides。[E: codex-rs/protocol/src/protocol.rs:651] | `protocol.rs:651` |
| 20 | `Compact` | unit | 要求 agent 总结当前 conversation context；summary 作为 `AgentMessage` event 返回。[E: codex-rs/protocol/src/protocol.rs:656] | `protocol.rs:656` |
| 21 | `SetThreadMemoryMode` | `mode: ThreadMemoryMode` | 持久化 thread 是否 eligible for memory generation,不调用模型。[E: codex-rs/protocol/src/protocol.rs:662] | `protocol.rs:662` |
| 22 | `ThreadRollback` | `num_turns` | 从 in-memory context 丢弃最后 N 个 user turns；不尝试 revert 本地文件系统变更。[E: codex-rs/protocol/src/protocol.rs:668] | `protocol.rs:668` |
| 23 | `Review` | `review_request` | 请求 agent 做 code review。[E: codex-rs/protocol/src/protocol.rs:671] | `protocol.rs:671` |
| 24 | `ApproveGuardianDeniedAction` | `event: GuardianAssessmentEvent` | 记录用户批准重试一个具体 Guardian-denied action。[E: codex-rs/protocol/src/protocol.rs:674] | `protocol.rs:674` |
| 25 | `Shutdown` | unit | 请求关闭 codex instance。[E: codex-rs/protocol/src/protocol.rs:677] | `protocol.rs:677` |
| 26 | `RunUserShellCommand` | `command` | 执行 `!cmd` 触发的 user-initiated shell command；输出通过 `ExecCommand*` events streaming。[E: codex-rs/protocol/src/protocol.rs:684][E: codex-rs/protocol/src/protocol.rs:686] | `protocol.rs:684` |

## Thread settings companion

`ThreadSettingsOverrides` 集中承载 future-turn/thread 级覆盖项，字段包括 `environments`、`profile_workspace_roots`、`approval_policy`、`approvals_reviewer`、`sandbox_policy`、`permission_profile`、`active_permission_profile`、`windows_sandbox_level`、`model`、`effort`、`summary`、`service_tier`、`collaboration_mode` 与 `personality`；当前没有独立 `workspace_roots` 字段。[E: codex-rs/protocol/src/protocol.rs:460][E: codex-rs/protocol/src/protocol.rs:462][E: codex-rs/protocol/src/protocol.rs:466][E: codex-rs/protocol/src/protocol.rs:469][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:475][E: codex-rs/protocol/src/protocol.rs:478][E: codex-rs/protocol/src/protocol.rs:482][E: codex-rs/protocol/src/protocol.rs:485][E: codex-rs/protocol/src/protocol.rs:488][E: codex-rs/protocol/src/protocol.rs:494][E: codex-rs/protocol/src/protocol.rs:497][E: codex-rs/protocol/src/protocol.rs:503][E: codex-rs/protocol/src/protocol.rs:507][E: codex-rs/protocol/src/protocol.rs:510]

`ThreadMemoryMode` 是 `SetThreadMemoryMode` 的 payload companion enum,当前只有 `Enabled` 与 `Disabled`,wire rename 为 lowercase。[E: codex-rs/protocol/src/protocol.rs:692][E: codex-rs/protocol/src/protocol.rs:693][E: codex-rs/protocol/src/protocol.rs:694]

## 设计动机速记

- `UserInput` 和独立 `ThreadSettings` 共享 `ThreadSettingsOverrides`,说明 current protocol 把”更新 thread defaults”和”发起用户输入”拆成两个可排序的 submission 动作。[E: codex-rs/protocol/src/protocol.rs:561][E: codex-rs/protocol/src/protocol.rs:577][I]
- approval / elicitation / dynamic-tool response `Op` 都带 request/call id,用于把客户端返回的决策或 tool output 关联回等待中的交互。[E: codex-rs/protocol/src/protocol.rs:591][E: codex-rs/protocol/src/protocol.rs:601][E: codex-rs/protocol/src/protocol.rs:611][E: codex-rs/protocol/src/protocol.rs:623][E: codex-rs/protocol/src/protocol.rs:631][E: codex-rs/protocol/src/protocol.rs:639][I]
- `RunUserShellCommand` 明确是 user-initiated shell path,而 normal agent command execution 的生命周期由 `EventMsg::ExecCommand*` 事件表示。[E: codex-rs/protocol/src/protocol.rs:684][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
