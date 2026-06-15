---
id: ref.protocol-op
title: Protocol Op 变体索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [Op, ThreadMemoryMode]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `Op` 是 `Submission` 承载的 operation payload；它用 `serde(tag = "type", rename_all = "snake_case")` 做 tagged enum 序列化，并且被声明为 `#[non_exhaustive]`，所以外部 consumer 需要把未来新增变体当作协议演进处理。[E: codex-rs/protocol/src/protocol.rs:123][E: codex-rs/protocol/src/protocol.rs:129][E: codex-rs/protocol/src/protocol.rs:400][E: codex-rs/protocol/src/protocol.rs:402]

## 能回答的问题

- `Op::UserTurn` 和 legacy `Op::UserInput` 在协议字段上有什么差异?
- 哪些 `Op` 是 approval / permission / elicitation 回调?
- 哪些 `Op` 只修改 session/thread 状态而不排队模型 turn?
- realtime conversation 使用哪些 `Op`?
- `Op` 共有多少个变体,每个变体在哪一行定义?

## Wire shape and control intent

`Op` 的 wire discriminator 来自 Rust enum 变体名的 snake_case 形式；`UserInputAnswer` 通过 `serde(rename = "user_input_answer", alias = "request_user_input_response")` 承担兼容 wire 名称。[E: codex-rs/protocol/src/protocol.rs:400][E: codex-rs/protocol/src/protocol.rs:608]

`Op::UserTurn` 是带有额外 turn context 的 user-input variant；它携带 `items`、`cwd`、`approval_policy`、`sandbox_policy`、`model`、reasoning effort/summary、service tier、final output schema、collaboration mode、personality、environment selections 等字段。[E: codex-rs/protocol/src/protocol.rs:445][E: codex-rs/protocol/src/protocol.rs:447][E: codex-rs/protocol/src/protocol.rs:449][E: codex-rs/protocol/src/protocol.rs:453][E: codex-rs/protocol/src/protocol.rs:456][E: codex-rs/protocol/src/protocol.rs:464][E: codex-rs/protocol/src/protocol.rs:468][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:479][E: codex-rs/protocol/src/protocol.rs:487][E: codex-rs/protocol/src/protocol.rs:490][E: codex-rs/protocol/src/protocol.rs:495][E: codex-rs/protocol/src/protocol.rs:499][E: codex-rs/protocol/src/protocol.rs:503]

`Op::OverrideTurnContext` 不排队输入，而是覆盖后续依赖 session-level 默认值的 turn context；源码注释说明 omitted field 会保留旧值，且该 operation "does not enqueue any input"。[E: codex-rs/protocol/src/protocol.rs:512][E: codex-rs/protocol/src/protocol.rs:514][E: codex-rs/protocol/src/protocol.rs:515][E: codex-rs/protocol/src/protocol.rs:518]

## Op 全量变体表

| # | Variant / wire intent | Payload shape | 语义 | 定义处 |
|---:|---|---|---|---|
| 1 | `Interrupt` | unit | 请求中断当前 task,不终止后台 terminal process；响应侧会发 `EventMsg::TurnAborted`。[E: codex-rs/protocol/src/protocol.rs:404][E: codex-rs/protocol/src/protocol.rs:405][E: codex-rs/protocol/src/protocol.rs:406] | `Op::Interrupt` |
| 2 | `CleanBackgroundTerminals` | unit | 请求终止当前 thread 的所有后台 terminal process。[E: codex-rs/protocol/src/protocol.rs:408][E: codex-rs/protocol/src/protocol.rs:409][E: codex-rs/protocol/src/protocol.rs:410] | `Op::CleanBackgroundTerminals` |
| 3 | `RealtimeConversationStart` | `ConversationStartParams` tuple | 启动 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:412][E: codex-rs/protocol/src/protocol.rs:413] | `Op::RealtimeConversationStart` |
| 4 | `RealtimeConversationAudio` | `ConversationAudioParams` tuple | 向正在运行的 realtime conversation stream 发送 audio input。[E: codex-rs/protocol/src/protocol.rs:415][E: codex-rs/protocol/src/protocol.rs:416] | `Op::RealtimeConversationAudio` |
| 5 | `RealtimeConversationText` | `ConversationTextParams` tuple | 向 realtime conversation stream 发送 text input。[E: codex-rs/protocol/src/protocol.rs:418][E: codex-rs/protocol/src/protocol.rs:419] | `Op::RealtimeConversationText` |
| 6 | `RealtimeConversationClose` | unit | 关闭正在运行的 realtime conversation stream。[E: codex-rs/protocol/src/protocol.rs:421][E: codex-rs/protocol/src/protocol.rs:422] | `Op::RealtimeConversationClose` |
| 7 | `RealtimeConversationListVoices` | unit | 请求 realtime conversation voices 列表。[E: codex-rs/protocol/src/protocol.rs:424][E: codex-rs/protocol/src/protocol.rs:425] | `Op::RealtimeConversationListVoices` |
| 8 | `UserInput` | `{ items, environments, final_output_json_schema, responsesapi_client_metadata }` | legacy user input；源码注释要求优先使用 `UserTurn` 以便每轮提供完整上下文。[E: codex-rs/protocol/src/protocol.rs:427][E: codex-rs/protocol/src/protocol.rs:429][E: codex-rs/protocol/src/protocol.rs:431][E: codex-rs/protocol/src/protocol.rs:433][E: codex-rs/protocol/src/protocol.rs:436][E: codex-rs/protocol/src/protocol.rs:439][E: codex-rs/protocol/src/protocol.rs:442] | `Op::UserInput` |
| 9 | `UserTurn` | `{ items, cwd, approval_policy, approvals_reviewer, sandbox_policy, model, effort, summary, service_tier, final_output_json_schema, collaboration_mode, personality, environments }` | CodexThread turn 的 user-input variant，显式携带 cwd、approval、sandbox、model 与 turn-scoped 设置。[E: codex-rs/protocol/src/protocol.rs:445][E: codex-rs/protocol/src/protocol.rs:447][E: codex-rs/protocol/src/protocol.rs:449][E: codex-rs/protocol/src/protocol.rs:453][E: codex-rs/protocol/src/protocol.rs:456][E: codex-rs/protocol/src/protocol.rs:461][E: codex-rs/protocol/src/protocol.rs:464][E: codex-rs/protocol/src/protocol.rs:468][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:479][E: codex-rs/protocol/src/protocol.rs:487][E: codex-rs/protocol/src/protocol.rs:490][E: codex-rs/protocol/src/protocol.rs:495][E: codex-rs/protocol/src/protocol.rs:499][E: codex-rs/protocol/src/protocol.rs:503] | `Op::UserTurn` |
| 10 | `InterAgentCommunication` | `{ communication }` | 把 inter-agent communication 记录为 assistant history，同时仍使用 normal thread submission lifecycle。[E: codex-rs/protocol/src/protocol.rs:506][E: codex-rs/protocol/src/protocol.rs:507][E: codex-rs/protocol/src/protocol.rs:508] | `Op::InterAgentCommunication` |
| 11 | `OverrideTurnContext` | 多个 optional overrides | 覆盖持久 turn context 的字段，省略字段保持原值。[E: codex-rs/protocol/src/protocol.rs:512][E: codex-rs/protocol/src/protocol.rs:514][E: codex-rs/protocol/src/protocol.rs:518] | `Op::OverrideTurnContext` |
| 12 | `ExecApproval` | `{ id, turn_id, decision }` | 回答 command execution approval；`turn_id` 是 optional 字段。[E: codex-rs/protocol/src/protocol.rs:572][E: codex-rs/protocol/src/protocol.rs:573][E: codex-rs/protocol/src/protocol.rs:575][E: codex-rs/protocol/src/protocol.rs:578][E: codex-rs/protocol/src/protocol.rs:580] | `Op::ExecApproval` |
| 13 | `PatchApproval` | `{ id, decision }` | 回答 code patch approval。[E: codex-rs/protocol/src/protocol.rs:583][E: codex-rs/protocol/src/protocol.rs:584][E: codex-rs/protocol/src/protocol.rs:586][E: codex-rs/protocol/src/protocol.rs:588] | `Op::PatchApproval` |
| 14 | `ResolveElicitation` | `{ server_name, request_id, decision, content, meta }` | 回答 MCP elicitation request，携带 `decision: ElicitationAction`、optional structured `content` 与 optional `meta`。[E: codex-rs/protocol/src/protocol.rs:591][E: codex-rs/protocol/src/protocol.rs:592][E: codex-rs/protocol/src/protocol.rs:594][E: codex-rs/protocol/src/protocol.rs:596][E: codex-rs/protocol/src/protocol.rs:598][E: codex-rs/protocol/src/protocol.rs:601][E: codex-rs/protocol/src/protocol.rs:604] | `Op::ResolveElicitation` |
| 15 | `UserInputAnswer` | `{ id, response }` | 回答 `request_user_input` tool call；wire rename 为 `user_input_answer`，兼容 alias `request_user_input_response`。[E: codex-rs/protocol/src/protocol.rs:607][E: codex-rs/protocol/src/protocol.rs:608][E: codex-rs/protocol/src/protocol.rs:611][E: codex-rs/protocol/src/protocol.rs:613] | `Op::UserInputAnswer` |
| 16 | `RequestPermissionsResponse` | `{ id, response }` | 回答 `request_permissions` tool call，payload 是 user-granted permissions。[E: codex-rs/protocol/src/protocol.rs:616][E: codex-rs/protocol/src/protocol.rs:617][E: codex-rs/protocol/src/protocol.rs:619][E: codex-rs/protocol/src/protocol.rs:621] | `Op::RequestPermissionsResponse` |
| 17 | `DynamicToolResponse` | `{ id, response }` | 回答 dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:624][E: codex-rs/protocol/src/protocol.rs:625][E: codex-rs/protocol/src/protocol.rs:627][E: codex-rs/protocol/src/protocol.rs:629] | `Op::DynamicToolResponse` |
| 18 | `AddToHistory` | `{ text }` | 追加 cross-session message history entry；源码注释说明 history disabled 或 sensitive patterns 可能阻止写入。[E: codex-rs/protocol/src/protocol.rs:632][E: codex-rs/protocol/src/protocol.rs:634][E: codex-rs/protocol/src/protocol.rs:635][E: codex-rs/protocol/src/protocol.rs:636][E: codex-rs/protocol/src/protocol.rs:638] | `Op::AddToHistory` |
| 19 | `GetHistoryEntryRequest` | `{ offset, log_id }` | 按 `log_id + offset` 请求单条 history entry。[E: codex-rs/protocol/src/protocol.rs:641][E: codex-rs/protocol/src/protocol.rs:642] | `Op::GetHistoryEntryRequest` |
| 20 | `ListMcpTools` | unit | 请求所有 configured MCP servers 的 tool 列表；响应通过 `EventMsg::McpListToolsResponse` 发送。[E: codex-rs/protocol/src/protocol.rs:644][E: codex-rs/protocol/src/protocol.rs:645][E: codex-rs/protocol/src/protocol.rs:646] | `Op::ListMcpTools` |
| 21 | `RefreshMcpServers` | `{ config }` | 请求 MCP servers 重新初始化并刷新 cached tool lists。[E: codex-rs/protocol/src/protocol.rs:648][E: codex-rs/protocol/src/protocol.rs:649] | `Op::RefreshMcpServers` |
| 22 | `ReloadUserConfig` | unit | 重新加载 active session 的 user config layer overrides。[E: codex-rs/protocol/src/protocol.rs:651][E: codex-rs/protocol/src/protocol.rs:655] | `Op::ReloadUserConfig` |
| 23 | `ListSkills` | `{ cwds, force_reload }` | 按 cwd scope 请求 skills 列表；空 `cwds` 使用 session default working directory。[E: codex-rs/protocol/src/protocol.rs:657][E: codex-rs/protocol/src/protocol.rs:658][E: codex-rs/protocol/src/protocol.rs:662][E: codex-rs/protocol/src/protocol.rs:667] | `Op::ListSkills` |
| 24 | `Compact` | unit | 要求 agent 总结当前 conversation context；响应以 `AgentMessage` event 返回 summary。[E: codex-rs/protocol/src/protocol.rs:670][E: codex-rs/protocol/src/protocol.rs:671][E: codex-rs/protocol/src/protocol.rs:672][E: codex-rs/protocol/src/protocol.rs:673] | `Op::Compact` |
| 25 | `DropMemories` | unit | 删除 persisted memory artifacts 与 memory-tracking DB rows。[E: codex-rs/protocol/src/protocol.rs:675][E: codex-rs/protocol/src/protocol.rs:676] | `Op::DropMemories` |
| 26 | `UpdateMemories` | unit | 触发一次 startup memory pipeline。[E: codex-rs/protocol/src/protocol.rs:678][E: codex-rs/protocol/src/protocol.rs:679] | `Op::UpdateMemories` |
| 27 | `SetThreadName` | `{ name }` | 在 persisted rollout metadata 中设置 user-facing thread name；源码注释说明该操作 local-only 且不调用模型。[E: codex-rs/protocol/src/protocol.rs:681][E: codex-rs/protocol/src/protocol.rs:682][E: codex-rs/protocol/src/protocol.rs:683][E: codex-rs/protocol/src/protocol.rs:684] | `Op::SetThreadName` |
| 28 | `SetThreadMemoryMode` | `{ mode }` | 持久化 thread-level memory mode，不调用模型；mode 是 `ThreadMemoryMode`。[E: codex-rs/protocol/src/protocol.rs:686][E: codex-rs/protocol/src/protocol.rs:688][E: codex-rs/protocol/src/protocol.rs:689][E: codex-rs/protocol/src/protocol.rs:690] | `Op::SetThreadMemoryMode` |
| 29 | `Undo` | unit | 请求 Codex undo 一个 turn，源码注释把效果描述为与 CMD+Z 类似。[E: codex-rs/protocol/src/protocol.rs:692][E: codex-rs/protocol/src/protocol.rs:693] | `Op::Undo` |
| 30 | `ThreadRollback` | `{ num_turns }` | 从 in-memory context 丢弃最后 N 个 user turns；不尝试 revert 本地文件系统变更。[E: codex-rs/protocol/src/protocol.rs:695][E: codex-rs/protocol/src/protocol.rs:697][E: codex-rs/protocol/src/protocol.rs:698][E: codex-rs/protocol/src/protocol.rs:699] | `Op::ThreadRollback` |
| 31 | `Review` | `{ review_request }` | 请求 agent 做 code review。[E: codex-rs/protocol/src/protocol.rs:701][E: codex-rs/protocol/src/protocol.rs:702] | `Op::Review` |
| 32 | `Shutdown` | unit | 请求关闭 codex instance。[E: codex-rs/protocol/src/protocol.rs:704][E: codex-rs/protocol/src/protocol.rs:705] | `Op::Shutdown` |
| 33 | `RunUserShellCommand` | `{ command }` | 执行由 `!cmd` 触发的 user-initiated one-off shell command；输出通过 `ExecCommand*` events streaming。[E: codex-rs/protocol/src/protocol.rs:707][E: codex-rs/protocol/src/protocol.rs:710][E: codex-rs/protocol/src/protocol.rs:711][E: codex-rs/protocol/src/protocol.rs:712][E: codex-rs/protocol/src/protocol.rs:714] | `Op::RunUserShellCommand` |
| 34 | `ListModels` | unit | 请求 available models 列表。[E: codex-rs/protocol/src/protocol.rs:717][E: codex-rs/protocol/src/protocol.rs:718] | `Op::ListModels` |

## Companion enum

| Symbol | Variants | 含义 | 定义处 |
|---|---|---|---|
| `ThreadMemoryMode` | `Enabled`, `Disabled` | `SetThreadMemoryMode` 的 payload 类型；wire 使用 lowercase rename。[E: codex-rs/protocol/src/protocol.rs:690][E: codex-rs/protocol/src/protocol.rs:722][E: codex-rs/protocol/src/protocol.rs:724][E: codex-rs/protocol/src/protocol.rs:725] | `protocol.rs` |

## 设计动机速记

- `UserInput` 与 `UserTurn` 并存体现协议兼容设计[I]: legacy `UserInput` 仍可提交 `items`，`UserTurn` 可把 cwd、approval、sandbox、model 等每轮上下文显式写入提交体。[E: codex-rs/protocol/src/protocol.rs:427][E: codex-rs/protocol/src/protocol.rs:433][E: codex-rs/protocol/src/protocol.rs:445][E: codex-rs/protocol/src/protocol.rs:453][E: codex-rs/protocol/src/protocol.rs:456][E: codex-rs/protocol/src/protocol.rs:464][E: codex-rs/protocol/src/protocol.rs:468]
- approval / permission / dynamic-tool response `Op` 都通过 id 字段把用户决策或 tool response 关联到等待中的 request。[E: codex-rs/protocol/src/protocol.rs:575][E: codex-rs/protocol/src/protocol.rs:580][E: codex-rs/protocol/src/protocol.rs:586][E: codex-rs/protocol/src/protocol.rs:588][E: codex-rs/protocol/src/protocol.rs:619][E: codex-rs/protocol/src/protocol.rs:621][E: codex-rs/protocol/src/protocol.rs:627][E: codex-rs/protocol/src/protocol.rs:629][I]
- local-only state 操作被保留为 `Op` 而不是工具调用，说明客户端可以直接要求 core 调整 thread metadata、memory mode 或 reload config，而不需要模型参与。[I]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.turn-end-to-end](../spine/turn-end-to-end.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
