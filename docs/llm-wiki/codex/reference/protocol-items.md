---
id: ref.protocol-items
title: Protocol items 与审批 payload 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/items.rs, codex-rs/protocol/src/legacy_events.rs, codex-rs/protocol/src/approvals.rs, codex-rs/protocol/src/protocol.rs, codex-rs/ext/items/src/lib.rs]
symbols: [TurnItem, UserMessageItem, AgentMessageItem, ImageViewItem, ExtensionItem, EnteredReviewModeItem, ExitedReviewModeItem, FileChangeItem, McpToolCallItem, ContextCompactionItem, HasLegacyEvent, ExecApprovalRequestEvent, GuardianAssessmentEvent, ElicitationRequest, ApplyPatchApprovalRequestEvent]
related: [ref.protocol-event-streaming, ref.protocol-op, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `items.rs` 定义 turn-item stream 的 `TurnItem` tagged union；`approvals.rs` 定义 approval、guardian assessment、network policy amendment、MCP elicitation 和 apply-patch approval 的交互 payload。[E: codex-rs/protocol/src/items.rs:44][E: codex-rs/protocol/src/approvals.rs:218][E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:173][E: codex-rs/protocol/src/approvals.rs:337][E: codex-rs/protocol/src/approvals.rs:395]

## 能回答的问题

- `TurnItem` 当前有哪些 variant,各自 payload 字段是什么?
- user/assistant/reasoning item 如何映射到 legacy `EventMsg`?
- MCP tool、file change、image view、extension-owned item 在 turn stream 中如何表达?
- exec approval、guardian assessment、MCP elicitation、apply-patch approval 的 payload 字段在哪里定义?
- network approval 可展示哪些默认 decision?

## TurnItem stream 表

`TurnItem` 使用 `serde(tag = "type")` 和 TS tag 生成 tagged union；当前有 18 个变体。[E: codex-rs/protocol/src/items.rs:42][E: codex-rs/protocol/src/items.rs:43][E: codex-rs/protocol/src/items.rs:44][E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:74]

| # | Variant | Payload | 字段/含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `UserMessage` | `UserMessageItem` | `id`, optional `client_id`, `content: Vec<UserInput>`。[E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:78][E: codex-rs/protocol/src/items.rs:83] | `items.rs:53` |
| 2 | `HookPrompt` | `HookPromptItem` | `id`, `fragments`; fragment 包含 `text` 与 `hook_run_id`。[E: codex-rs/protocol/src/items.rs:46][E: codex-rs/protocol/src/items.rs:87][E: codex-rs/protocol/src/items.rs:89][E: codex-rs/protocol/src/items.rs:96][E: codex-rs/protocol/src/items.rs:97] | `items.rs:54` |
| 3 | `AgentMessage` | `AgentMessageItem` | `id`, `content`, optional `phase`, optional `memory_citation`。[E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:122][E: codex-rs/protocol/src/items.rs:124][E: codex-rs/protocol/src/items.rs:131][E: codex-rs/protocol/src/items.rs:134] | `items.rs:55` |
| 4 | `Plan` | `PlanItem` | `id`, `text`。[E: codex-rs/protocol/src/items.rs:48][E: codex-rs/protocol/src/items.rs:151][E: codex-rs/protocol/src/items.rs:153] | `items.rs:56` |
| 5 | `Reasoning` | `ReasoningItem` | `id`, `summary_text`, defaulted `raw_content`。[E: codex-rs/protocol/src/items.rs:49][E: codex-rs/protocol/src/items.rs:157][E: codex-rs/protocol/src/items.rs:161] | `items.rs:57` |
| 6 | `CommandExecution` | `CommandExecutionItem` | `id`, optional `process_id`, command/cwd/parsed command/source/interaction input, execution status, optional output/duration/formatted output。[E: codex-rs/protocol/src/items.rs:50][E: codex-rs/protocol/src/items.rs:184][E: codex-rs/protocol/src/items.rs:189][E: codex-rs/protocol/src/items.rs:214] | `items.rs:58` |
| 7 | `DynamicToolCall` | `DynamicToolCallItem` | dynamic tool item,带 optional namespace、tool、arguments、status、content items、success/error/duration。[E: codex-rs/protocol/src/items.rs:51][E: codex-rs/protocol/src/items.rs:226][E: codex-rs/protocol/src/items.rs:230][E: codex-rs/protocol/src/items.rs:245] | `items.rs:59` |
| 8 | `CollabAgentToolCall` | `CollabAgentToolCallItem` | collab agent tool item,带 tool/status/sender/receivers/prompt/model/reasoning effort/agent states。[E: codex-rs/protocol/src/items.rs:52][E: codex-rs/protocol/src/items.rs:267][E: codex-rs/protocol/src/items.rs:269][E: codex-rs/protocol/src/items.rs:286] | `items.rs:60` |
| 9 | `SubAgentActivity` | `SubAgentActivityItem` | sub-agent activity item,带 kind、agent thread id 和 agent path。[E: codex-rs/protocol/src/items.rs:53][E: codex-rs/protocol/src/items.rs:290][E: codex-rs/protocol/src/items.rs:292][E: codex-rs/protocol/src/items.rs:294] | `items.rs:61` |
| 10 | `WebSearch` | `WebSearchItem` | `id`, `query`, `action: WebSearchAction`。[E: codex-rs/protocol/src/items.rs:58][E: codex-rs/protocol/src/items.rs:298][E: codex-rs/protocol/src/items.rs:301] | `items.rs:62` |
| 11 | `ImageView` | `ImageViewItem` | `id`, environment-resolved `path: PathUri`。[E: codex-rs/protocol/src/items.rs:59][E: codex-rs/protocol/src/items.rs:313][E: codex-rs/protocol/src/items.rs:319] | `items.rs:63` |
| 12 | `Extension` | `ExtensionItem` | extension-owned flattened envelope；当前 `kind` 是 `image_gen.generation`、`clock.sleep` 或 `web.search`,core 只依赖统一 `id()`。[E: codex-rs/protocol/src/items.rs:60][E: codex-rs/protocol/src/items.rs:64][E: codex-rs/ext/items/src/lib.rs:30][E: codex-rs/ext/items/src/lib.rs:35][E: codex-rs/ext/items/src/lib.rs:47] | `items.rs:64` |
| 13 | `ImageGeneration` | `ImageGenerationItem` | hosted Responses API image generation；由 core 负责 persistence 与 legacy fanout,区别于 standalone extension item。[E: codex-rs/protocol/src/items.rs:65][E: codex-rs/protocol/src/items.rs:69] | `items.rs:69` |
| 14 | `EnteredReviewMode` | `EnteredReviewModeItem` | `id`, `target`, `user_facing_hint`; canonical review-entry item。[E: codex-rs/protocol/src/items.rs:70][E: codex-rs/protocol/src/items.rs:137][E: codex-rs/protocol/src/items.rs:142] | `items.rs:70` |
| 15 | `ExitedReviewMode` | `ExitedReviewModeItem` | `id` 与 optional `review_output`; canonical review-exit item。[E: codex-rs/protocol/src/items.rs:71][E: codex-rs/protocol/src/items.rs:144][E: codex-rs/protocol/src/items.rs:148] | `items.rs:71` |
| 16 | `FileChange` | `FileChangeItem` | `id`, `changes`, optional `status`, `auto_approved`, `stdout`, `stderr`。[E: codex-rs/protocol/src/items.rs:72] | `items.rs:72` |
| 17 | `McpToolCall` | `McpToolCallItem` | `id`, `server`, `tool`, `arguments`, optional app/plugin metadata, `status`, optional `result`, `error`, `duration`。[E: codex-rs/protocol/src/items.rs:73] | `items.rs:73` |
| 18 | `ContextCompaction` | `ContextCompactionItem` | `id`; legacy conversion 生成 `ContextCompacted`。[E: codex-rs/protocol/src/items.rs:74][E: codex-rs/protocol/src/legacy_events.rs:71][E: codex-rs/protocol/src/legacy_events.rs:74] | `items.rs:74` |

## TurnItem 兼容转换要点

- `AgentMessageContent` 当前只有 `Text { text }`,所以 `AgentMessageItem.content` 是 text content vector。[E: codex-rs/protocol/src/items.rs:112][E: codex-rs/protocol/src/items.rs:113][E: codex-rs/protocol/src/items.rs:124]
- `AgentMessageItem.phase` 是 optional field；`AgentMessageItem` 同时保存 `content` 和 optional `memory_citation`。[E: codex-rs/protocol/src/items.rs:124][E: codex-rs/protocol/src/items.rs:131][E: codex-rs/protocol/src/items.rs:134]
- `UserMessageItem::as_legacy_event()` flatten text inputs 到 `UserMessageEvent.message`,并保留 remote/local image 列表、detail hints 与 text elements；audio 仍保留在 canonical `UserMessageItem.content`，不进入 legacy user-message payload。兼容实现已从 `protocol.rs` 搬到 `legacy_events.rs`。[E: codex-rs/protocol/src/items.rs:520][E: codex-rs/protocol/src/items.rs:530][E: codex-rs/protocol/src/legacy_events.rs:77][E: codex-rs/protocol/src/legacy_events.rs:81][E: codex-rs/protocol/src/legacy_events.rs:92]
- review enter/exit 首先是 canonical `TurnItem`；item completion 再借助 `legacy_events.rs` fan out `EnteredReviewMode` / `ExitedReviewMode`，并补上 turn/item correlation。[E: codex-rs/protocol/src/legacy_events.rs:112][E: codex-rs/protocol/src/legacy_events.rs:118][E: codex-rs/protocol/src/legacy_events.rs:123][E: codex-rs/protocol/src/legacy_events.rs:129]
- standalone image generation、sleep 与 web search 走 `TurnItem::Extension`; hosted Responses API 的 web/image item 仍保留 core-owned variant。[E: codex-rs/protocol/src/items.rs:54][E: codex-rs/protocol/src/items.rs:56][E: codex-rs/protocol/src/items.rs:60][E: codex-rs/protocol/src/items.rs:69]

## Approval / guardian / elicitation payload 表

| Symbol | Shape | 关键字段/变体 | 用途 | 定义锚 |
|---|---|---|---|---|
| `ResolvedPermissionProfile` | struct | `permission_profile` | resolved permission profile payload 直接携带 `PermissionProfile`。[E: codex-rs/protocol/src/approvals.rs:19][E: codex-rs/protocol/src/approvals.rs:20] | `approvals.rs:19` |
| `EscalationPermissions` | enum | `AdditionalPermissionProfile`, `ResolvedPermissionProfile` | escalation payload 可以 merge 额外权限或替换为 fully resolved profile。[E: codex-rs/protocol/src/approvals.rs:25][E: codex-rs/protocol/src/approvals.rs:29] | `approvals.rs:25` |
| `ExecPolicyAmendment` | transparent struct | `command: Vec<String>` | execpolicy amendment payload 是 transparent string-vector command prefix。[E: codex-rs/protocol/src/approvals.rs:40][E: codex-rs/protocol/src/approvals.rs:41] | `approvals.rs:40` |
| `NetworkApprovalProtocol` | enum | `Http`, `Https`, `Socks5Tcp`, `Socks5Udp` | network approval 的协议维度；`Https` 有兼容 alias。[E: codex-rs/protocol/src/approvals.rs:62][E: codex-rs/protocol/src/approvals.rs:66][E: codex-rs/protocol/src/approvals.rs:69] | `approvals.rs:62` |
| `NetworkApprovalContext` | struct | `host`, `protocol` | blocked network request 的展示上下文。[E: codex-rs/protocol/src/approvals.rs:73][E: codex-rs/protocol/src/approvals.rs:74][E: codex-rs/protocol/src/approvals.rs:75] | `approvals.rs:73` |
| `NetworkPolicyAmendment` | struct | `host`, `action` | network policy rule change payload；action 是 `Allow` 或 `Deny`。[E: codex-rs/protocol/src/approvals.rs:80][E: codex-rs/protocol/src/approvals.rs:82][E: codex-rs/protocol/src/approvals.rs:173][E: codex-rs/protocol/src/approvals.rs:175] | `approvals.rs:173` |
| `GuardianAssessmentAction` | tagged enum | `Command`, `Execve`, `ApplyPatch`, `NetworkAccess`, `McpToolCall`, `RequestPermissions` | Guardian assessment 中被审查的 canonical action payload。[E: codex-rs/protocol/src/approvals.rs:137][E: codex-rs/protocol/src/approvals.rs:138][E: codex-rs/protocol/src/approvals.rs:166] | `approvals.rs:137` |
| `GuardianAssessmentEvent` | struct | `id`, optional target/completion/risk/auth/rationale/decision source, `turn_id`, `started_at_ms`, `status`, `action` | Guardian review lifecycle event。[E: codex-rs/protocol/src/approvals.rs:179][E: codex-rs/protocol/src/approvals.rs:196][E: codex-rs/protocol/src/approvals.rs:214] | `approvals.rs:179` |
| `ExecApprovalRequestEvent` | struct | `call_id`, optional `approval_id`, `turn_id`, optional `environmentId`, `started_at_ms`, command/cwd/reason, optional network/execpolicy/network-policy/additional-permission context, optional `available_decisions`, `parsed_cmd` | command approval prompt payload。[E: codex-rs/protocol/src/approvals.rs:218][E: codex-rs/protocol/src/approvals.rs:241][E: codex-rs/protocol/src/approvals.rs:274] | `approvals.rs:218` |
| `ExecApprovalRequestEvent::effective_approval_id` | method | `approval_id.unwrap_or(call_id)` | subcommand approval 有独立 approval id；缺省时回退到 command item id。[E: codex-rs/protocol/src/approvals.rs:277][E: codex-rs/protocol/src/approvals.rs:281] | `approvals.rs:278` |
| `ExecApprovalRequestEvent::default_available_decisions` | method | network -> approved/session/(allow network-policy amendment if present)/abort; additional permissions -> approved/abort; execpolicy -> approved/(amendment if present)/abort | older sender 未提供 `available_decisions` 时推导默认决策集。[E: codex-rs/protocol/src/approvals.rs:284][E: codex-rs/protocol/src/approvals.rs:303][E: codex-rs/protocol/src/approvals.rs:315][E: codex-rs/protocol/src/approvals.rs:330] | `approvals.rs:298` |
| `ElicitationRequest` | tagged enum | `Form { _meta?, message, requested_schema }`, `OpenAiForm { _meta?, message, requested_schema }`, `Url { _meta?, message, url, elicitation_id }` | MCP elicitation 支持普通表单、OpenAI form wire name 和外部 URL mode。[E: codex-rs/protocol/src/approvals.rs:337][E: codex-rs/protocol/src/approvals.rs:338][E: codex-rs/protocol/src/approvals.rs:347][E: codex-rs/protocol/src/approvals.rs:354] | `approvals.rs:337` |
| `ElicitationRequestEvent` | struct | optional `turn_id`, `server_name`, `id`, `request` | 绑定 MCP server、request id 与 elicitation payload。[E: codex-rs/protocol/src/approvals.rs:375][E: codex-rs/protocol/src/approvals.rs:383] | `approvals.rs:364` |
| `ElicitationAction` | enum | `Accept`, `Decline`, `Cancel` | client 对 elicitation request 的三态决策。[E: codex-rs/protocol/src/approvals.rs:388][E: codex-rs/protocol/src/approvals.rs:389][E: codex-rs/protocol/src/approvals.rs:391] | `approvals.rs:388` |
| `ApplyPatchApprovalRequestEvent` | struct | `call_id`, `turn_id`, `started_at_ms`, `changes`, optional `reason`, optional `grant_root` | apply-patch approval prompt payload。[E: codex-rs/protocol/src/approvals.rs:395][E: codex-rs/protocol/src/approvals.rs:397][E: codex-rs/protocol/src/approvals.rs:410] | `approvals.rs:395` |

## 设计动机速记

- turn-item stream 与 legacy `EventMsg` 并存：`ItemStartedEvent`/`ItemCompletedEvent` 仍能通过 `HasLegacyEvent` 生成兼容事件,但 canonical payload 是 `TurnItem`。[E: codex-rs/protocol/src/protocol.rs:1836][E: codex-rs/protocol/src/protocol.rs:1844][E: codex-rs/protocol/src/legacy_events.rs:65][I]
- approval payload 把”prompt 内容”和”可展示 decision 列表”放在事件侧；对应 response 则由 `Op::ExecApproval`、`Op::PatchApproval`、`Op::ResolveElicitation` 等回传。[E: codex-rs/protocol/src/approvals.rs:273][E: codex-rs/protocol/src/protocol.rs:586][E: codex-rs/protocol/src/protocol.rs:596][E: codex-rs/protocol/src/protocol.rs:604][I]

## Sources

- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/legacy_events.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/ext/items/src/lib.rs`

## 相关

- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
- [subsys.core.approval-guardian](../subsystems/core/approval-guardian.md)
