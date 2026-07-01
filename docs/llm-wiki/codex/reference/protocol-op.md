---
id: ref.protocol-op
title: Protocol Op 变体索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Submission, Op, ThreadSettingsOverrides, ThreadMemoryMode]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: db887d03e1
---

> `Submission` 是客户端提交到 agent queue 的 envelope,字段是 `id`、`op`、可选 `client_user_message_id` 与可选 W3C trace carrier；`op` 的 payload 类型是当前 `Op` enum。[E: codex-rs/protocol/src/protocol.rs:161][E: codex-rs/protocol/src/protocol.rs:165][E: codex-rs/protocol/src/protocol.rs:167][E: codex-rs/protocol/src/protocol.rs:169]

## 能回答的问题

- 当前 `Op` 一共有多少个变体,每个变体在哪一行定义?
- 哪些 `Op` 开启/更新 turn,哪些只改变 thread/session 状态?
- approval、elicitation、dynamic tool 的 response payload 分别走哪些 `Op`?
- realtime conversation 相关 operation 覆盖哪些输入形态?
- `ThreadSettingsOverrides` 与 `ThreadMemoryMode` 当前承载哪些 thread 级配置?

## Wire surface

`Op` 在当前源码中是 `#[non_exhaustive]` enum,因此外部 consumer 不能假设变体集合永久封闭。[E: codex-rs/protocol/src/protocol.rs:514][E: codex-rs/protocol/src/protocol.rs:515] 当前 `Op` 定义 26 个变体,从 `Interrupt` 到 `RunUserShellCommand`。[E: codex-rs/protocol/src/protocol.rs:518][E: codex-rs/protocol/src/protocol.rs:668]

`UserInput` 现在可以在启动 turn 前携带 `thread_settings` overrides,也可以携带 `additional_context` 和 Responses API client metadata；`ThreadSettings` 则只应用同一组持久 thread-settings overrides,不启动 turn。[E: codex-rs/protocol/src/protocol.rs:543][E: codex-rs/protocol/src/protocol.rs:549][E: codex-rs/protocol/src/protocol.rs:551][E: codex-rs/protocol/src/protocol.rs:554][E: codex-rs/protocol/src/protocol.rs:561][E: codex-rs/protocol/src/protocol.rs:563]

## Op 全量变体表

| # | Variant | Payload | 语义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `Interrupt` | unit | 中断当前 task,不终止后台 terminal process；响应侧发送 `TurnAborted`。[E: codex-rs/protocol/src/protocol.rs:518] | `protocol.rs:509` |
| 2 | `CleanBackgroundTerminals` | unit | 终止当前 thread 的所有后台 terminal process。[E: codex-rs/protocol/src/protocol.rs:522] | `protocol.rs:513` |
| 3 | `RealtimeConversationStart` | `ConversationStartParams` | 启动 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:525] | `protocol.rs:516` |
| 4 | `RealtimeConversationAudio` | `ConversationAudioParams` | 向运行中的 realtime conversation stream 发送 audio input。[E: codex-rs/protocol/src/protocol.rs:528] | `protocol.rs:519` |
| 5 | `RealtimeConversationText` | `ConversationTextParams` | 向 realtime conversation stream 发送 text input。[E: codex-rs/protocol/src/protocol.rs:531] | `protocol.rs:522` |
| 6 | `RealtimeConversationSpeech` | `ConversationSpeechParams` | 向 realtime conversation stream 追加 speakable text。[E: codex-rs/protocol/src/protocol.rs:534] | `protocol.rs:525` |
| 7 | `RealtimeConversationClose` | unit | 关闭运行中的 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:537] | `protocol.rs:528` |
| 8 | `RealtimeConversationListVoices` | unit | 请求 realtime conversation 支持的 voice 列表。[E: codex-rs/protocol/src/protocol.rs:540] | `protocol.rs:531` |
| 9 | `UserInput` | `items`, `final_output_json_schema`, `responsesapi_client_metadata`, `additional_context`, `thread_settings` | 用户输入并可先应用 thread-settings overrides。[E: codex-rs/protocol/src/protocol.rs:543][E: codex-rs/protocol/src/protocol.rs:545][E: codex-rs/protocol/src/protocol.rs:547][E: codex-rs/protocol/src/protocol.rs:549][E: codex-rs/protocol/src/protocol.rs:551][E: codex-rs/protocol/src/protocol.rs:554] | `protocol.rs:543` |
| 10 | `ThreadSettings` | `thread_settings` | 只应用持久 thread-settings overrides,不启动 turn。[E: codex-rs/protocol/src/protocol.rs:561][E: codex-rs/protocol/src/protocol.rs:563] | `protocol.rs:561` |
| 11 | `InterAgentCommunication` | `communication` | 记录 inter-agent communication 为 agent-message history,仍走 normal thread submission lifecycle。[E: codex-rs/protocol/src/protocol.rs:568][E: codex-rs/protocol/src/protocol.rs:569] | `protocol.rs:559` |
| 12 | `ExecApproval` | `id`, `turn_id?`, `decision` | 回答 command execution approval request。[E: codex-rs/protocol/src/protocol.rs:573][E: codex-rs/protocol/src/protocol.rs:575][E: codex-rs/protocol/src/protocol.rs:577][E: codex-rs/protocol/src/protocol.rs:579] | `protocol.rs:573` |
| 13 | `PatchApproval` | `id`, `decision` | 回答 code patch approval request。[E: codex-rs/protocol/src/protocol.rs:583][E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:587] | `protocol.rs:583` |
| 14 | `ResolveElicitation` | `server_name`, `request_id`, `decision`, `content?`, `meta?` | 回答 MCP elicitation request。[E: codex-rs/protocol/src/protocol.rs:591][E: codex-rs/protocol/src/protocol.rs:593][E: codex-rs/protocol/src/protocol.rs:595][E: codex-rs/protocol/src/protocol.rs:597][E: codex-rs/protocol/src/protocol.rs:599][E: codex-rs/protocol/src/protocol.rs:601] | `protocol.rs:582` |
| 15 | `UserInputAnswer` | `id`, `response` | 回答 `request_user_input` tool call。[E: codex-rs/protocol/src/protocol.rs:605][E: codex-rs/protocol/src/protocol.rs:609] | `protocol.rs:596` |
| 16 | `RequestPermissionsResponse` | `id`, `response` | 回答 `request_permissions` tool call。[E: codex-rs/protocol/src/protocol.rs:613][E: codex-rs/protocol/src/protocol.rs:617] | `protocol.rs:604` |
| 17 | `DynamicToolResponse` | `id`, `response` | 回答 dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:621][E: codex-rs/protocol/src/protocol.rs:625] | `protocol.rs:612` |
| 18 | `RefreshMcpServers` | `config: McpServerRefreshConfig` | 重新初始化 MCP servers 并刷新 cached tool lists。[E: codex-rs/protocol/src/protocol.rs:629] | `protocol.rs:620` |
| 19 | `ReloadUserConfig` | unit | 重新加载 active session 的 user config layer overrides。[E: codex-rs/protocol/src/protocol.rs:635] | `protocol.rs:626` |
| 20 | `Compact` | unit | 要求 agent 总结当前 conversation context；summary 作为 `AgentMessage` event 返回。[E: codex-rs/protocol/src/protocol.rs:640] | `protocol.rs:640` |
| 21 | `SetThreadMemoryMode` | `mode: ThreadMemoryMode` | 持久化 thread 是否 eligible for memory generation,不调用模型。[E: codex-rs/protocol/src/protocol.rs:646] | `protocol.rs:637` |
| 22 | `ThreadRollback` | `num_turns` | 从 in-memory context 丢弃最后 N 个 user turns；不尝试 revert 本地文件系统变更。[E: codex-rs/protocol/src/protocol.rs:652] | `protocol.rs:643` |
| 23 | `Review` | `review_request` | 请求 agent 做 code review。[E: codex-rs/protocol/src/protocol.rs:655] | `protocol.rs:646` |
| 24 | `ApproveGuardianDeniedAction` | `event: GuardianAssessmentEvent` | 记录用户批准重试一个具体 Guardian-denied action。[E: codex-rs/protocol/src/protocol.rs:658] | `protocol.rs:649` |
| 25 | `Shutdown` | unit | 请求关闭 codex instance。[E: codex-rs/protocol/src/protocol.rs:661] | `protocol.rs:661` |
| 26 | `RunUserShellCommand` | `command` | 执行 `!cmd` 触发的 user-initiated shell command；输出通过 `ExecCommand*` events streaming。[E: codex-rs/protocol/src/protocol.rs:668][E: codex-rs/protocol/src/protocol.rs:670] | `protocol.rs:659` |

## Thread settings companion

`ThreadSettingsOverrides` 集中承载 future-turn/thread 级覆盖项,字段包括 `environments`、`workspace_roots`、`profile_workspace_roots`、`approval_policy`、`approvals_reviewer`、`sandbox_policy`、`permission_profile`、`active_permission_profile`、`windows_sandbox_level`、`model`、`effort`、`summary`、`service_tier`、`collaboration_mode` 与 `personality`。[E: codex-rs/protocol/src/protocol.rs:440][E: codex-rs/protocol/src/protocol.rs:442][E: codex-rs/protocol/src/protocol.rs:446][E: codex-rs/protocol/src/protocol.rs:450][E: codex-rs/protocol/src/protocol.rs:453][E: codex-rs/protocol/src/protocol.rs:456][E: codex-rs/protocol/src/protocol.rs:459][E: codex-rs/protocol/src/protocol.rs:462][E: codex-rs/protocol/src/protocol.rs:466][E: codex-rs/protocol/src/protocol.rs:469][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:478][E: codex-rs/protocol/src/protocol.rs:481][E: codex-rs/protocol/src/protocol.rs:487][E: codex-rs/protocol/src/protocol.rs:491][E: codex-rs/protocol/src/protocol.rs:494]

`ThreadMemoryMode` 是 `SetThreadMemoryMode` 的 payload companion enum,当前只有 `Enabled` 与 `Disabled`,wire rename 为 lowercase。[E: codex-rs/protocol/src/protocol.rs:676][E: codex-rs/protocol/src/protocol.rs:677][E: codex-rs/protocol/src/protocol.rs:678]

## 设计动机速记

- `UserInput` 和独立 `ThreadSettings` 共享 `ThreadSettingsOverrides`,说明 current protocol 把”更新 thread defaults”和”发起用户输入”拆成两个可排序的 submission 动作。[E: codex-rs/protocol/src/protocol.rs:545][E: codex-rs/protocol/src/protocol.rs:561][I]
- approval / elicitation / dynamic-tool response `Op` 都带 request/call id,用于把客户端返回的决策或 tool output 关联回等待中的交互。[E: codex-rs/protocol/src/protocol.rs:575][E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:595][E: codex-rs/protocol/src/protocol.rs:607][E: codex-rs/protocol/src/protocol.rs:615][E: codex-rs/protocol/src/protocol.rs:623][I]
- `RunUserShellCommand` 明确是 user-initiated shell path,而 normal agent command execution 的生命周期由 `EventMsg::ExecCommand*` 事件表示。[E: codex-rs/protocol/src/protocol.rs:668][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
