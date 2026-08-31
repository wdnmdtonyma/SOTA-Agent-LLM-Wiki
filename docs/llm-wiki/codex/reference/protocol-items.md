---
id: ref.protocol-items
title: Protocol items 与审批 payload 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/items.rs, codex-rs/protocol/src/legacy_events.rs, codex-rs/protocol/src/approvals.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/models.rs, codex-rs/ext/items/src/lib.rs, codex-rs/app-server-protocol/src/protocol/v2/item.rs]
symbols: [TurnItem, UserMessageItem, FunctionCallOutputItem, AgentMessageItem, ImageViewItem, ExtensionItem, FileChangeItem, McpToolCallItem, ContextCompactionItem, HasLegacyEvent, ElicitationRequest, ApplyPatchApprovalRequestEvent]
related: [ref.protocol-event-streaming, ref.protocol-op, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `items.rs` 定义 turn-item stream 的 `TurnItem` tagged union；`approvals.rs` 定义 approval、guardian assessment、network policy amendment、MCP elicitation 和 apply-patch approval 的交互 payload。[E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/approvals.rs:189][E: codex-rs/protocol/src/approvals.rs:245][E: codex-rs/protocol/src/approvals.rs:183][E: codex-rs/protocol/src/approvals.rs:375][E: codex-rs/protocol/src/approvals.rs:432]

## 能回答的问题

- `TurnItem` 当前有哪些 variant,各自 payload 字段是什么?
- user/assistant/reasoning item 如何映射到 legacy `EventMsg`?
- MCP tool、file change、image view、extension-owned item 在 turn stream 中如何表达?
- exec approval、guardian assessment、MCP elicitation、apply-patch approval 的 payload 字段在哪里定义?
- network approval 可展示哪些默认 decision?

## TurnItem stream 表

`TurnItem` 使用 `serde(tag = "type")` 和 TS tag 生成 tagged union；当前有 19 个变体。相对上一轮净增 `FunctionCallOutput`。[E: codex-rs/protocol/src/items.rs:43][E: codex-rs/protocol/src/items.rs:44][E: codex-rs/protocol/src/items.rs:45][E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:76]

| # | Variant | Payload | 字段/含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `UserMessage` | `UserMessageItem` | `id`, optional `client_id`, `content: Vec<UserInput>`。[E: codex-rs/protocol/src/items.rs:46][E: codex-rs/protocol/src/items.rs:80][E: codex-rs/protocol/src/items.rs:84][E: codex-rs/protocol/src/items.rs:85] | `items.rs:46` |
| 2 | `FunctionCallOutput` | `FunctionCallOutputItem` | `id`, `name`, optional `namespace`, `output: FunctionCallOutputBody`。`FunctionCallOutputBody` 是 untagged union：`Text(String)` 或 `ContentItems`。legacy fanout 不生成事件。[E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:89][E: codex-rs/protocol/src/items.rs:90][E: codex-rs/protocol/src/items.rs:91][E: codex-rs/protocol/src/items.rs:95][E: codex-rs/protocol/src/models.rs:2128][E: codex-rs/protocol/src/legacy_events.rs:523] | `items.rs:47` |
| 3 | `HookPrompt` | `HookPromptItem` | `id`, `fragments`；fragment 包含 `text` 与 `hook_run_id`。legacy fanout 不生成事件。[E: codex-rs/protocol/src/items.rs:48][E: codex-rs/protocol/src/items.rs:99][E: codex-rs/protocol/src/items.rs:100][E: codex-rs/protocol/src/items.rs:101][E: codex-rs/protocol/src/items.rs:108][E: codex-rs/protocol/src/items.rs:109][E: codex-rs/protocol/src/legacy_events.rs:523] | `items.rs:48` |
| 4 | `AgentMessage` | `AgentMessageItem` | `id`, `content`, optional `phase`, optional `memory_citation`, optional `delivery`。[E: codex-rs/protocol/src/items.rs:49][E: codex-rs/protocol/src/items.rs:142][E: codex-rs/protocol/src/items.rs:143][E: codex-rs/protocol/src/items.rs:144][E: codex-rs/protocol/src/items.rs:151][E: codex-rs/protocol/src/items.rs:154][E: codex-rs/protocol/src/items.rs:157] | `items.rs:49` |
| 5 | `Plan` | `PlanItem` | `id`, `text`。[E: codex-rs/protocol/src/items.rs:50][E: codex-rs/protocol/src/items.rs:174][E: codex-rs/protocol/src/items.rs:175][E: codex-rs/protocol/src/items.rs:176] | `items.rs:50` |
| 6 | `Reasoning` | `ReasoningItem` | `id`, `summary_text`, defaulted `raw_content`。[E: codex-rs/protocol/src/items.rs:51][E: codex-rs/protocol/src/items.rs:180][E: codex-rs/protocol/src/items.rs:181][E: codex-rs/protocol/src/items.rs:182][E: codex-rs/protocol/src/items.rs:184] | `items.rs:51` |
| 7 | `CommandExecution` | `CommandExecutionItem` | `id`, optional plugin/script/process identity, `command`/`cwd`/`parsed_cmd`/`source`/`interaction_input`, `status`, optional stdout/stderr/aggregated output/exit code/duration/formatted output。[E: codex-rs/protocol/src/items.rs:52][E: codex-rs/protocol/src/items.rs:225][E: codex-rs/protocol/src/items.rs:226][E: codex-rs/protocol/src/items.rs:229][E: codex-rs/protocol/src/items.rs:232][E: codex-rs/protocol/src/items.rs:235][E: codex-rs/protocol/src/items.rs:236][E: codex-rs/protocol/src/items.rs:243] | `items.rs:52` |
| 8 | `DynamicToolCall` | `DynamicToolCallItem` | `id`, optional `namespace`, `tool`, `arguments`, `status`, optional content items / success / error / duration。[E: codex-rs/protocol/src/items.rs:53][E: codex-rs/protocol/src/items.rs:273][E: codex-rs/protocol/src/items.rs:274][E: codex-rs/protocol/src/items.rs:277][E: codex-rs/protocol/src/items.rs:278][E: codex-rs/protocol/src/items.rs:280] | `items.rs:53` |
| 9 | `CollabAgentToolCall` | `CollabAgentToolCallItem` | `id`, `tool`, `status`, `sender_thread_id`, receivers, optional prompt/model/reasoning effort, `agents_states`。[E: codex-rs/protocol/src/items.rs:54][E: codex-rs/protocol/src/items.rs:319][E: codex-rs/protocol/src/items.rs:320][E: codex-rs/protocol/src/items.rs:321][E: codex-rs/protocol/src/items.rs:323] | `items.rs:54` |
| 10 | `SubAgentActivity` | `SubAgentActivityItem` | `id`, `kind`, `agent_thread_id`, `agent_path`。[E: codex-rs/protocol/src/items.rs:55][E: codex-rs/protocol/src/items.rs:342][E: codex-rs/protocol/src/items.rs:343][E: codex-rs/protocol/src/items.rs:344][E: codex-rs/protocol/src/items.rs:345][E: codex-rs/protocol/src/items.rs:346] | `items.rs:55` |
| 11 | `WebSearch` | `WebSearchItem` | hosted Responses API web-search：`id`, `query`, `action`, optional opaque `results` JSON。standalone web search 走 `Extension`。[E: codex-rs/protocol/src/items.rs:60][E: codex-rs/protocol/src/items.rs:350][E: codex-rs/protocol/src/items.rs:351][E: codex-rs/protocol/src/items.rs:352][E: codex-rs/protocol/src/items.rs:353][E: codex-rs/protocol/src/items.rs:361] | `items.rs:60` |
| 12 | `ImageView` | `ImageViewItem` | `id`, environment-resolved `path: PathUri`。[E: codex-rs/protocol/src/items.rs:61][E: codex-rs/protocol/src/items.rs:365][E: codex-rs/protocol/src/items.rs:366][E: codex-rs/protocol/src/items.rs:371] | `items.rs:61` |
| 13 | `Extension` | `ExtensionItem` | extension-owned flattened envelope；当前 `kind` 是 `image_gen.generation`、`clock.sleep` 或 `web.search`，core 只依赖统一 `id()`。[E: codex-rs/protocol/src/items.rs:66][E: codex-rs/ext/items/src/lib.rs:35][E: codex-rs/ext/items/src/lib.rs:38][E: codex-rs/ext/items/src/lib.rs:41][E: codex-rs/ext/items/src/lib.rs:44][E: codex-rs/ext/items/src/lib.rs:50] | `items.rs:66` |
| 14 | `ImageGeneration` | `ImageGenerationItem` | hosted Responses API image generation：`id`, `status`, optional `revised_prompt`, `result`, optional `saved_path`。由 core 负责 persistence 与 legacy fanout，区别于 standalone extension item。[E: codex-rs/protocol/src/items.rs:71][E: codex-rs/protocol/src/items.rs:375][E: codex-rs/protocol/src/items.rs:376][E: codex-rs/protocol/src/items.rs:377][E: codex-rs/protocol/src/items.rs:381] | `items.rs:71` |
| 15 | `EnteredReviewMode` | `EnteredReviewModeItem` | `id`, `target`, `user_facing_hint`；canonical review-entry item。[E: codex-rs/protocol/src/items.rs:72][E: codex-rs/protocol/src/items.rs:161][E: codex-rs/protocol/src/items.rs:162][E: codex-rs/protocol/src/items.rs:163][E: codex-rs/protocol/src/items.rs:164] | `items.rs:72` |
| 16 | `ExitedReviewMode` | `ExitedReviewModeItem` | `id` 与 optional `review_output`；canonical review-exit item。[E: codex-rs/protocol/src/items.rs:73][E: codex-rs/protocol/src/items.rs:168][E: codex-rs/protocol/src/items.rs:169][E: codex-rs/protocol/src/items.rs:170] | `items.rs:73` |
| 17 | `FileChange` | `FileChangeItem` | `id`, `changes`, optional `status`, `auto_approved`, `stdout`, `stderr`。[E: codex-rs/protocol/src/items.rs:74][E: codex-rs/protocol/src/items.rs:388][E: codex-rs/protocol/src/items.rs:389][E: codex-rs/protocol/src/items.rs:390][E: codex-rs/protocol/src/items.rs:393][E: codex-rs/protocol/src/items.rs:396] | `items.rs:74` |
| 18 | `McpToolCall` | `McpToolCallItem` | `id`, `server`, `tool`, `arguments`, optional connector/app/plugin metadata 与 `read_only_hint`、`status`、optional `result`/`error`/`duration`；hint 是 MCP tool annotation，不是执行结果。[E: codex-rs/protocol/src/items.rs:75][E: codex-rs/protocol/src/items.rs:408][E: codex-rs/protocol/src/items.rs:409][E: codex-rs/protocol/src/items.rs:410][E: codex-rs/protocol/src/items.rs:411][E: codex-rs/protocol/src/items.rs:433][E: codex-rs/protocol/src/items.rs:434] | `items.rs:75` |
| 19 | `ContextCompaction` | `ContextCompactionItem` | `id`；legacy conversion 生成 `ContextCompacted`。[E: codex-rs/protocol/src/items.rs:76][E: codex-rs/protocol/src/items.rs:463][E: codex-rs/protocol/src/items.rs:464][E: codex-rs/protocol/src/legacy_events.rs:72] | `items.rs:76` |

## TurnItem 兼容转换要点

- `AgentMessageContent` 当前只有 `Text { text }`，所以 `AgentMessageItem.content` 是 text content vector。[E: codex-rs/protocol/src/items.rs:124][E: codex-rs/protocol/src/items.rs:125][E: codex-rs/protocol/src/items.rs:144]
- `AgentMessageItem.phase` 与 `delivery` 都是 optional field；`delivery` 当前只有 `Async`。[E: codex-rs/protocol/src/items.rs:132][E: codex-rs/protocol/src/items.rs:151][E: codex-rs/protocol/src/items.rs:157]
- `UserMessageItem::as_legacy_event()` flatten text inputs 到 `UserMessageEvent.message`，并保留 remote/local image 与 audio 列表、detail hints 与 text elements。兼容实现在 `legacy_events.rs`。[E: codex-rs/protocol/src/legacy_events.rs:77][E: codex-rs/protocol/src/legacy_events.rs:81][E: codex-rs/protocol/src/legacy_events.rs:83][E: codex-rs/protocol/src/legacy_events.rs:84][E: codex-rs/protocol/src/legacy_events.rs:94]
- `TurnItem::as_legacy_events()` 对 `FunctionCallOutput` 与 `HookPrompt` 返回空向量，不生成 legacy `EventMsg`。[E: codex-rs/protocol/src/legacy_events.rs:520][E: codex-rs/protocol/src/legacy_events.rs:523]
- review enter/exit 首先是 canonical `TurnItem`；item completion 再借助 `legacy_events.rs` fan out `EnteredReviewMode` / `ExitedReviewMode`，并补上 turn/item correlation。[E: codex-rs/protocol/src/legacy_events.rs:116][E: codex-rs/protocol/src/legacy_events.rs:117][E: codex-rs/protocol/src/legacy_events.rs:127][E: codex-rs/protocol/src/legacy_events.rs:128]
- standalone image generation、sleep 与 web search 走 `TurnItem::Extension`；hosted Responses API 的 web/image item 仍保留 core-owned variant。[E: codex-rs/protocol/src/items.rs:66][E: codex-rs/protocol/src/items.rs:71]
- canonical `CommandExecutionItem`、legacy exec begin/end event 与 app-server v2 `ThreadItem::CommandExecution` 都携带 optional plugin id 和 safe plugin-relative script path；v2 只是把 canonical fields 投影为 `pluginId` / `scriptPath`。[E: codex-rs/protocol/src/items.rs:229][E: codex-rs/protocol/src/items.rs:232][E: codex-rs/protocol/src/protocol.rs:3419][E: codex-rs/protocol/src/protocol.rs:3421][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:290][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:293]
- app-server v2 的 `ThreadItem::McpToolCall` 同样投影 `read_only_hint`，因此 canonical core item、legacy MCP begin/end event 与 public v2 item 对这项 annotation 保持一致。[E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:324][E: codex-rs/app-server-protocol/src/protocol/v2/item.rs:336][E: codex-rs/protocol/src/items.rs:433]

## Approval / guardian / elicitation payload 表

| Symbol | Shape | 关键字段/变体 | 用途 | 定义锚 |
|---|---|---|---|---|
| `ResolvedPermissionProfile` | struct | `permission_profile` | resolved permission profile payload 直接携带 `PermissionProfile`。[E: codex-rs/protocol/src/approvals.rs:21][E: codex-rs/protocol/src/approvals.rs:22] | `approvals.rs:21` |
| `EscalationPermissions` | enum | `AdditionalPermissionProfile`, `ResolvedPermissionProfile` | escalation payload 可以 merge 额外权限或替换为 fully resolved profile。[E: codex-rs/protocol/src/approvals.rs:27][E: codex-rs/protocol/src/approvals.rs:29][E: codex-rs/protocol/src/approvals.rs:31] | `approvals.rs:27` |
| `ExecPolicyAmendment` | transparent struct | `command: Vec<String>` | execpolicy amendment payload 是 transparent string-vector command prefix。[E: codex-rs/protocol/src/approvals.rs:40][E: codex-rs/protocol/src/approvals.rs:42][E: codex-rs/protocol/src/approvals.rs:43] | `approvals.rs:42` |
| `NetworkApprovalProtocol` | enum | `Http`, `Https`, `Socks5Tcp`, `Socks5Udp` | network approval 的协议维度；`Https` 有兼容 alias。[E: codex-rs/protocol/src/approvals.rs:64][E: codex-rs/protocol/src/approvals.rs:67][E: codex-rs/protocol/src/approvals.rs:68][E: codex-rs/protocol/src/approvals.rs:70] | `approvals.rs:64` |
| `NetworkApprovalContext` | struct | `host`, `protocol` | blocked network request 的展示上下文。[E: codex-rs/protocol/src/approvals.rs:75][E: codex-rs/protocol/src/approvals.rs:76][E: codex-rs/protocol/src/approvals.rs:77] | `approvals.rs:75` |
| `NetworkPolicyAmendment` | struct | `host`, `action` | network policy rule change payload；action 是 `Allow` 或 `Deny`。[E: codex-rs/protocol/src/approvals.rs:183][E: codex-rs/protocol/src/approvals.rs:184][E: codex-rs/protocol/src/approvals.rs:185][E: codex-rs/protocol/src/approvals.rs:82] | `approvals.rs:183` |
| `GuardianAssessmentAction` | tagged enum | `Command`, `Execve`, `WriteStdin`, `ApplyPatch`, `NetworkAccess`, `McpToolCall`, `RequestPermissions` | Guardian assessment 中被审查的 canonical action payload。[E: codex-rs/protocol/src/approvals.rs:139][E: codex-rs/protocol/src/approvals.rs:140][E: codex-rs/protocol/src/approvals.rs:145][E: codex-rs/protocol/src/approvals.rs:152][E: codex-rs/protocol/src/approvals.rs:159] | `approvals.rs:139` |
| `GuardianAssessmentEvent` | struct | `id`, optional target/plugin/script/completion/risk/auth/rationale/decision source, `turn_id`, `started_at_ms`, `status`, `action` | Guardian review lifecycle event。[E: codex-rs/protocol/src/approvals.rs:189][E: codex-rs/protocol/src/approvals.rs:191][E: codex-rs/protocol/src/approvals.rs:207][E: codex-rs/protocol/src/approvals.rs:214][E: codex-rs/protocol/src/approvals.rs:232] | `approvals.rs:189` |
| `ExecApprovalRequestEvent` | struct | `kind` (`Command`/`WriteStdin`), `call_id`, optional `plugin_id` / `script_path` / `approval_id`, `turn_id`, optional `environmentId`, `started_at_ms`, command/cwd/reason, optional network/execpolicy/network-policy/additional-permission context, optional `available_decisions`, `parsed_cmd` | command approval prompt payload。[E: codex-rs/protocol/src/approvals.rs:245][E: codex-rs/protocol/src/approvals.rs:248][E: codex-rs/protocol/src/approvals.rs:250][E: codex-rs/protocol/src/approvals.rs:254][E: codex-rs/protocol/src/approvals.rs:265][E: codex-rs/protocol/src/approvals.rs:311] | `approvals.rs:245` |
| `ExecApprovalRequestEvent::effective_approval_id` | method | `approval_id.unwrap_or(call_id)` | subcommand approval 有独立 approval id；缺省时回退到 command item id。[E: codex-rs/protocol/src/approvals.rs:316][E: codex-rs/protocol/src/approvals.rs:317][E: codex-rs/protocol/src/approvals.rs:319] | `approvals.rs:316` |
| `ExecApprovalRequestEvent::default_available_decisions` | method | network -> approved/session/(allow network-policy amendment if present)/abort; additional permissions -> approved/abort; execpolicy -> approved/(amendment if present)/abort | older sender 未提供 `available_decisions` 时推导默认决策集。[E: codex-rs/protocol/src/approvals.rs:336][E: codex-rs/protocol/src/approvals.rs:342][E: codex-rs/protocol/src/approvals.rs:343][E: codex-rs/protocol/src/approvals.rs:357][E: codex-rs/protocol/src/approvals.rs:362] | `approvals.rs:336` |
| `ElicitationRequest` | tagged enum | `Form`, `OpenAiForm` (`openai/form`), `OpenAiElicitationForm` (`openaiForm`), `Url` | MCP elicitation 支持普通表单、两套 OpenAI form wire name 和外部 URL mode。[E: codex-rs/protocol/src/approvals.rs:375][E: codex-rs/protocol/src/approvals.rs:376][E: codex-rs/protocol/src/approvals.rs:383][E: codex-rs/protocol/src/approvals.rs:394][E: codex-rs/protocol/src/approvals.rs:401] | `approvals.rs:375` |
| `ElicitationRequestEvent` | struct | optional `turn_id`, `server_name`, `id`, `request` | 绑定 MCP server、request id 与 elicitation payload。[E: codex-rs/protocol/src/approvals.rs:412][E: codex-rs/protocol/src/approvals.rs:416][E: codex-rs/protocol/src/approvals.rs:417][E: codex-rs/protocol/src/approvals.rs:419][E: codex-rs/protocol/src/approvals.rs:420] | `approvals.rs:412` |
| `ElicitationAction` | enum | `Accept`, `Decline`, `Cancel` | client 对 elicitation request 的三态决策。[E: codex-rs/protocol/src/approvals.rs:425][E: codex-rs/protocol/src/approvals.rs:426][E: codex-rs/protocol/src/approvals.rs:427][E: codex-rs/protocol/src/approvals.rs:428] | `approvals.rs:425` |
| `ApplyPatchApprovalRequestEvent` | struct | `call_id`, `turn_id`, `started_at_ms`, `changes`, optional `reason`, optional `grant_root` | apply-patch approval prompt payload。[E: codex-rs/protocol/src/approvals.rs:432][E: codex-rs/protocol/src/approvals.rs:434][E: codex-rs/protocol/src/approvals.rs:438][E: codex-rs/protocol/src/approvals.rs:440][E: codex-rs/protocol/src/approvals.rs:441][E: codex-rs/protocol/src/approvals.rs:447] | `approvals.rs:432` |

## 设计动机速记

- turn-item stream 与 legacy `EventMsg` 并存：`ItemStartedEvent`/`ItemCompletedEvent` 仍能通过 `HasLegacyEvent` 生成兼容事件，但 canonical payload 是 `TurnItem`。[E: codex-rs/protocol/src/protocol.rs:1904][E: codex-rs/protocol/src/protocol.rs:1912][E: codex-rs/protocol/src/legacy_events.rs:551][E: codex-rs/protocol/src/legacy_events.rs:580]
- approval payload 把 prompt 内容和可展示 decision 列表放在事件侧；对应 response 则由 `Op::ExecApproval`、`Op::PatchApproval`、`Op::ResolveElicitation` 回传。[E: codex-rs/protocol/src/approvals.rs:311][E: codex-rs/protocol/src/protocol.rs:644][E: codex-rs/protocol/src/protocol.rs:654][E: codex-rs/protocol/src/protocol.rs:662]

## Sources

- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/legacy_events.rs`
- `codex-rs/protocol/src/approvals.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/ext/items/src/lib.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/item.rs`

## 相关

- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
- [subsys.core.approval-guardian](../subsystems/core/approval-guardian.md)
