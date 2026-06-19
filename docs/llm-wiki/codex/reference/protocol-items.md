---
id: ref.protocol-items
title: Protocol items 与审批 payload 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/items.rs, codex-rs/protocol/src/approvals.rs, codex-rs/protocol/src/protocol.rs]
symbols: [TurnItem, UserMessageItem, AgentMessageItem, ImageViewItem, SleepItem, FileChangeItem, McpToolCallItem, ContextCompactionItem, ExecApprovalRequestEvent, GuardianAssessmentEvent, ElicitationRequest, ApplyPatchApprovalRequestEvent]
related: [ref.protocol-event-streaming, ref.protocol-op, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 5670360009
---

> `items.rs` 定义 turn-item stream 的 `TurnItem` tagged union；`approvals.rs` 定义 approval、guardian assessment、network policy amendment、MCP elicitation 和 apply-patch approval 的交互 payload。[E: codex-rs/protocol/src/items.rs:38][E: codex-rs/protocol/src/items.rs:42][E: codex-rs/protocol/src/approvals.rs:218][E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:173][E: codex-rs/protocol/src/approvals.rs:337][E: codex-rs/protocol/src/approvals.rs:384]

## 能回答的问题

- `TurnItem` 当前有哪些 variant,各自 payload 字段是什么?
- user/assistant/reasoning item 如何映射到 legacy `EventMsg`?
- MCP tool、file change、image view、sleep item 在 turn stream 中如何表达?
- exec approval、guardian assessment、MCP elicitation、apply-patch approval 的 payload 字段在哪里定义?
- network approval 可展示哪些默认 decision?

## TurnItem stream 表

`TurnItem` 使用 `serde(tag = "type")` 和 TS tag 生成 tagged union；当前有 12 个变体。[E: codex-rs/protocol/src/items.rs:38][E: codex-rs/protocol/src/items.rs:40][E: codex-rs/protocol/src/items.rs:41][E: codex-rs/protocol/src/items.rs:42][E: codex-rs/protocol/src/items.rs:54]

| # | Variant | Payload | 字段/含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `UserMessage` | `UserMessageItem` | `id`, optional `client_id`, `content: Vec<UserInput>`。[E: codex-rs/protocol/src/items.rs:43][E: codex-rs/protocol/src/items.rs:58][E: codex-rs/protocol/src/items.rs:63] | `items.rs:43` |
| 2 | `HookPrompt` | `HookPromptItem` | `id`, `fragments`; fragment 包含 `text` 与 `hook_run_id`。[E: codex-rs/protocol/src/items.rs:44][E: codex-rs/protocol/src/items.rs:67][E: codex-rs/protocol/src/items.rs:69][E: codex-rs/protocol/src/items.rs:75][E: codex-rs/protocol/src/items.rs:77] | `items.rs:44` |
| 3 | `AgentMessage` | `AgentMessageItem` | `id`, `content`, optional `phase`, optional `memory_citation`。[E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:102][E: codex-rs/protocol/src/items.rs:104][E: codex-rs/protocol/src/items.rs:111][E: codex-rs/protocol/src/items.rs:114] | `items.rs:45` |
| 4 | `Plan` | `PlanItem` | `id`, `text`。[E: codex-rs/protocol/src/items.rs:46][E: codex-rs/protocol/src/items.rs:118][E: codex-rs/protocol/src/items.rs:120] | `items.rs:46` |
| 5 | `Reasoning` | `ReasoningItem` | `id`, `summary_text`, defaulted `raw_content`。[E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:124][E: codex-rs/protocol/src/items.rs:128] | `items.rs:47` |
| 6 | `WebSearch` | `WebSearchItem` | `id`, `query`, `action: WebSearchAction`。[E: codex-rs/protocol/src/items.rs:48][E: codex-rs/protocol/src/items.rs:132][E: codex-rs/protocol/src/items.rs:135] | `items.rs:48` |
| 7 | `ImageView` | `ImageViewItem` | `id`, local absolute `path`。[E: codex-rs/protocol/src/items.rs:49][E: codex-rs/protocol/src/items.rs:139][E: codex-rs/protocol/src/items.rs:141] | `items.rs:49` |
| 8 | `Sleep` | `SleepItem` | `id`, `duration_ms`。[E: codex-rs/protocol/src/items.rs:50][E: codex-rs/protocol/src/items.rs:145][E: codex-rs/protocol/src/items.rs:147] | `items.rs:50` |
| 9 | `ImageGeneration` | `ImageGenerationItem` | `id`, `status`, optional `revised_prompt`, `result`, optional `saved_path`。[E: codex-rs/protocol/src/items.rs:51][E: codex-rs/protocol/src/items.rs:151][E: codex-rs/protocol/src/items.rs:160] | `items.rs:51` |
| 10 | `FileChange` | `FileChangeItem` | `id`, `changes`, optional `status`, `auto_approved`, `stdout`, `stderr`。[E: codex-rs/protocol/src/items.rs:52][E: codex-rs/protocol/src/items.rs:164][E: codex-rs/protocol/src/items.rs:178] | `items.rs:52` |
| 11 | `McpToolCall` | `McpToolCallItem` | `id`, `server`, `tool`, `arguments`, optional app/plugin metadata, `status`, optional `result`, `error`, `duration`。[E: codex-rs/protocol/src/items.rs:53][E: codex-rs/protocol/src/items.rs:184][E: codex-rs/protocol/src/items.rs:204] | `items.rs:53` |
| 12 | `ContextCompaction` | `ContextCompactionItem` | `id`; `new()` 生成 UUID string,legacy event 是 `ContextCompacted`。[E: codex-rs/protocol/src/items.rs:54][E: codex-rs/protocol/src/items.rs:224][E: codex-rs/protocol/src/items.rs:231][E: codex-rs/protocol/src/items.rs:236] | `items.rs:54` |

## TurnItem 兼容转换要点

- `AgentMessageContent` 当前只有 `Text { text }`,所以 `AgentMessageItem.content` 是 text content vector。[E: codex-rs/protocol/src/items.rs:92][E: codex-rs/protocol/src/items.rs:93][E: codex-rs/protocol/src/items.rs:104]
- `AgentMessageItem.phase` 是 optional；源码注释说明不是所有 provider/model 都 emit phase,consumer 需要保留 legacy completion semantics。[E: codex-rs/protocol/src/items.rs:97][E: codex-rs/protocol/src/items.rs:101][E: codex-rs/protocol/src/items.rs:111]
- `UserMessageItem::as_legacy_event()` flatten text inputs 到 `UserMessageEvent.message`,并保留 remote/local image 列表、detail hints 与 text elements。[E: codex-rs/protocol/src/items.rs:255][E: codex-rs/protocol/src/items.rs:258][E: codex-rs/protocol/src/items.rs:265]
- `ItemStartedEvent` 会把 `WebSearch`、`ImageGeneration`、`FileChange`、`McpToolCall` 映射成对应 legacy begin event；`ImageView` 在 start 阶段不产出 legacy event。[E: codex-rs/protocol/src/protocol.rs:1752][E: codex-rs/protocol/src/protocol.rs:1758][E: codex-rs/protocol/src/protocol.rs:1765]

## Approval / guardian / elicitation payload 表

| Symbol | Shape | 关键字段/变体 | 用途 | 定义锚 |
|---|---|---|---|---|
| `ResolvedPermissionProfile` | struct | `permission_profile` | rerun intercepted child process 时可携带 fully resolved permissions。[E: codex-rs/protocol/src/approvals.rs:17][E: codex-rs/protocol/src/approvals.rs:20] | `approvals.rs:17` |
| `EscalationPermissions` | enum | `AdditionalPermissionProfile`, `ResolvedPermissionProfile` | escalation payload 可以 merge 额外权限或替换为 fully resolved profile。[E: codex-rs/protocol/src/approvals.rs:25][E: codex-rs/protocol/src/approvals.rs:29] | `approvals.rs:25` |
| `ExecPolicyAmendment` | transparent struct | `command: Vec<String>` | 允许以指定 token prefix 开头的命令；注释对应 execpolicy `prefix_rule(..., decision="allow")`。[E: codex-rs/protocol/src/approvals.rs:32][E: codex-rs/protocol/src/approvals.rs:36][E: codex-rs/protocol/src/approvals.rs:41] | `approvals.rs:40` |
| `NetworkApprovalProtocol` | enum | `Http`, `Https`, `Socks5Tcp`, `Socks5Udp` | network approval 的协议维度；`Https` 有兼容 alias。[E: codex-rs/protocol/src/approvals.rs:62][E: codex-rs/protocol/src/approvals.rs:70] | `approvals.rs:62` |
| `NetworkApprovalContext` | struct | `host`, `protocol` | blocked network request 的展示上下文。[E: codex-rs/protocol/src/approvals.rs:73][E: codex-rs/protocol/src/approvals.rs:76] | `approvals.rs:73` |
| `NetworkPolicyAmendment` | struct | `host`, `action` | network policy rule change payload；action 是 `Allow` 或 `Deny`。[E: codex-rs/protocol/src/approvals.rs:80][E: codex-rs/protocol/src/approvals.rs:83][E: codex-rs/protocol/src/approvals.rs:173][E: codex-rs/protocol/src/approvals.rs:176] | `approvals.rs:173` |
| `GuardianAssessmentAction` | tagged enum | `Command`, `Execve`, `ApplyPatch`, `NetworkAccess`, `McpToolCall`, `RequestPermissions` | Guardian assessment 中被审查的 canonical action payload。[E: codex-rs/protocol/src/approvals.rs:137][E: codex-rs/protocol/src/approvals.rs:170] | `approvals.rs:137` |
| `GuardianAssessmentEvent` | struct | `id`, optional target/completion/risk/auth/rationale/decision source, `turn_id`, `started_at_ms`, `status`, `action` | Guardian review lifecycle event。[E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:196][E: codex-rs/protocol/src/approvals.rs:214] | `approvals.rs:179` |
| `ExecApprovalRequestEvent` | struct | `call_id`, optional `approval_id`, `turn_id`, optional `environmentId`, `started_at_ms`, command/cwd/reason, optional network/execpolicy/network-policy/additional-permission context, optional `available_decisions`, `parsed_cmd` | command approval prompt payload。[E: codex-rs/protocol/src/approvals.rs:218][E: codex-rs/protocol/src/approvals.rs:241][E: codex-rs/protocol/src/approvals.rs:274] | `approvals.rs:218` |
| `ExecApprovalRequestEvent::effective_approval_id` | method | `approval_id.unwrap_or(call_id)` | subcommand approval 有独立 approval id；缺省时回退到 command item id。[E: codex-rs/protocol/src/approvals.rs:277][E: codex-rs/protocol/src/approvals.rs:281] | `approvals.rs:278` |
| `ExecApprovalRequestEvent::default_available_decisions` | method | network -> approved/session/(allow network-policy amendment if present)/abort; additional permissions -> approved/abort; execpolicy -> approved/(amendment if present)/abort | older sender 未提供 `available_decisions` 时推导默认决策集。[E: codex-rs/protocol/src/approvals.rs:284][E: codex-rs/protocol/src/approvals.rs:303][E: codex-rs/protocol/src/approvals.rs:315][E: codex-rs/protocol/src/approvals.rs:330] | `approvals.rs:298` |
| `ElicitationRequest` | tagged enum | `Form { _meta?, message, requested_schema }`, `Url { _meta?, message, url, elicitation_id }` | MCP elicitation 支持表单和外部 URL 两种 mode。[E: codex-rs/protocol/src/approvals.rs:337][E: codex-rs/protocol/src/approvals.rs:353] | `approvals.rs:337` |
| `ElicitationRequestEvent` | struct | optional `turn_id`, `server_name`, `id`, `request` | 绑定 MCP server、request id 与 elicitation payload。[E: codex-rs/protocol/src/approvals.rs:364][E: codex-rs/protocol/src/approvals.rs:372] | `approvals.rs:364` |
| `ElicitationAction` | enum | `Accept`, `Decline`, `Cancel` | client 对 elicitation request 的三态决策。[E: codex-rs/protocol/src/approvals.rs:377][E: codex-rs/protocol/src/approvals.rs:381] | `approvals.rs:377` |
| `ApplyPatchApprovalRequestEvent` | struct | `call_id`, `turn_id`, `started_at_ms`, `changes`, optional `reason`, optional `grant_root` | apply-patch approval prompt payload。[E: codex-rs/protocol/src/approvals.rs:384][E: codex-rs/protocol/src/approvals.rs:400] | `approvals.rs:384` |

## 设计动机速记

- turn-item stream 与 legacy `EventMsg` 并存：`ItemStartedEvent`/`ItemCompletedEvent` 仍能生成 legacy begin/end events,但 canonical payload 是 `TurnItem`。[E: codex-rs/protocol/src/protocol.rs:1745][E: codex-rs/protocol/src/protocol.rs:1772][E: codex-rs/protocol/src/protocol.rs:1787][I]
- approval payload 把”prompt 内容”和”可展示 decision 列表”放在事件侧；对应 response 则由 `Op::ExecApproval`、`Op::PatchApproval`、`Op::ResolveElicitation` 等回传。[E: codex-rs/protocol/src/approvals.rs:273][E: codex-rs/protocol/src/protocol.rs:564][E: codex-rs/protocol/src/protocol.rs:574][E: codex-rs/protocol/src/protocol.rs:582][I]

## Sources

- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
- [subsys.core.approval-guardian](../subsystems/core/approval-guardian.md)
