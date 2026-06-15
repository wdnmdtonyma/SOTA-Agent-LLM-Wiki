---
id: ref.protocol-items
title: Protocol items 与审批 payload 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/items.rs, codex-rs/protocol/src/approvals.rs]
symbols: [TurnItem, UserMessageItem, AgentMessageItem, PlanItem, ReasoningItem, WebSearchItem, ImageGenerationItem, ContextCompactionItem, ExecApprovalRequestEvent, GuardianAssessmentEvent, ElicitationRequest, ApplyPatchApprovalRequestEvent]
related: [ref.protocol-event-streaming, ref.protocol-op, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `items.rs` 定义 Codex turn-item stream 的 `TurnItem` tagged union，`approvals.rs` 定义 exec approval、guardian assessment、network policy amendment、MCP elicitation、apply_patch approval 等交互 payload。[E: codex-rs/protocol/src/items.rs:26][E: codex-rs/protocol/src/items.rs:28][E: codex-rs/protocol/src/approvals.rs:213][E: codex-rs/protocol/src/approvals.rs:180][E: codex-rs/protocol/src/approvals.rs:174][E: codex-rs/protocol/src/approvals.rs:347][E: codex-rs/protocol/src/approvals.rs:367]

## 能回答的问题

- `TurnItem` 有哪些 variant,各自 payload 是什么?
- `UserMessageItem` 如何把多段 `UserInput` flatten 成 legacy `UserMessageEvent`?
- `AgentMessageItem` 的 `phase` 和 `memory_citation` 字段有什么兼容含义?
- exec approval、guardian assessment、MCP elicitation、apply_patch approval 的 payload 字段在哪里定义?
- network approval 可展示哪些 decision?

## TurnItem stream 表

`TurnItem` 使用 `serde(tag = "type")` 和 TS tag 生成 tagged union；它的 8 个 variant 覆盖 user message、hook prompt、assistant message、plan、reasoning、web search、image generation、context compaction。[E: codex-rs/protocol/src/items.rs:26][E: codex-rs/protocol/src/items.rs:27][E: codex-rs/protocol/src/items.rs:29][E: codex-rs/protocol/src/items.rs:30][E: codex-rs/protocol/src/items.rs:31][E: codex-rs/protocol/src/items.rs:32][E: codex-rs/protocol/src/items.rs:33][E: codex-rs/protocol/src/items.rs:34][E: codex-rs/protocol/src/items.rs:35][E: codex-rs/protocol/src/items.rs:36]

| # | Variant | Payload | 字段/含义 | 定义处 |
|---:|---|---|---|---|
| 1 | `UserMessage` | `UserMessageItem` | `{ id, content: Vec<UserInput> }`；表示用户输入内容。[E: codex-rs/protocol/src/items.rs:29][E: codex-rs/protocol/src/items.rs:41][E: codex-rs/protocol/src/items.rs:42] | `items.rs` |
| 2 | `HookPrompt` | `HookPromptItem` | `{ id, fragments }`；fragment 包含 `text` 与 `hook_run_id`。[E: codex-rs/protocol/src/items.rs:30][E: codex-rs/protocol/src/items.rs:47][E: codex-rs/protocol/src/items.rs:48][E: codex-rs/protocol/src/items.rs:55][E: codex-rs/protocol/src/items.rs:56] | `items.rs` |
| 3 | `AgentMessage` | `AgentMessageItem` | `{ id, content, phase?, memory_citation? }`；源码注释称它是 assistant-authored message payload。[E: codex-rs/protocol/src/items.rs:31][E: codex-rs/protocol/src/items.rs:76][E: codex-rs/protocol/src/items.rs:82][E: codex-rs/protocol/src/items.rs:83][E: codex-rs/protocol/src/items.rs:90][E: codex-rs/protocol/src/items.rs:93] | `items.rs` |
| 4 | `Plan` | `PlanItem` | `{ id, text }`；plan item 的字段模型。[E: codex-rs/protocol/src/items.rs:32][E: codex-rs/protocol/src/items.rs:98][E: codex-rs/protocol/src/items.rs:99] | `items.rs` |
| 5 | `Reasoning` | `ReasoningItem` | `{ id, summary_text, raw_content }`；`raw_content` 字段带 `serde(default)`。[E: codex-rs/protocol/src/items.rs:33][E: codex-rs/protocol/src/items.rs:104][E: codex-rs/protocol/src/items.rs:105][E: codex-rs/protocol/src/items.rs:106][E: codex-rs/protocol/src/items.rs:107] | `items.rs` |
| 6 | `WebSearch` | `WebSearchItem` | `{ id, query, action: WebSearchAction }`。[E: codex-rs/protocol/src/items.rs:34][E: codex-rs/protocol/src/items.rs:112][E: codex-rs/protocol/src/items.rs:113][E: codex-rs/protocol/src/items.rs:114] | `items.rs` |
| 7 | `ImageGeneration` | `ImageGenerationItem` | `{ id, status, revised_prompt?, result, saved_path? }`；`revised_prompt` 与 `saved_path` 是 optional。[E: codex-rs/protocol/src/items.rs:35][E: codex-rs/protocol/src/items.rs:119][E: codex-rs/protocol/src/items.rs:120][E: codex-rs/protocol/src/items.rs:123][E: codex-rs/protocol/src/items.rs:124][E: codex-rs/protocol/src/items.rs:127] | `items.rs` |
| 8 | `ContextCompaction` | `ContextCompactionItem` | `{ id }`；`new()` 使用 UUID string，`as_legacy_event()` 生成 `EventMsg::ContextCompacted`。[E: codex-rs/protocol/src/items.rs:36][E: codex-rs/protocol/src/items.rs:131][E: codex-rs/protocol/src/items.rs:132][E: codex-rs/protocol/src/items.rs:138][E: codex-rs/protocol/src/items.rs:143] | `items.rs` |

## TurnItem 兼容转换要点

- `AgentMessageContent` 当前只有 `Text { text }` variant，因此 `AgentMessageItem.content` 是 text content vector 而不是任意 multimodal payload。[E: codex-rs/protocol/src/items.rs:71][E: codex-rs/protocol/src/items.rs:72][E: codex-rs/protocol/src/items.rs:83]
- `AgentMessageItem.phase` 是 optional；源码注释说明并非所有 provider/model 都 emit phase，consumer 应在存在时使用并保留 legacy completion semantics。[E: codex-rs/protocol/src/items.rs:78][E: codex-rs/protocol/src/items.rs:79][E: codex-rs/protocol/src/items.rs:80][E: codex-rs/protocol/src/items.rs:90]
- `UserMessageItem::as_legacy_event()` 把 text inputs flatten 到 `UserMessageEvent.message`，并附带 images、local images、text elements。[E: codex-rs/protocol/src/items.rs:162][E: codex-rs/protocol/src/items.rs:163][E: codex-rs/protocol/src/items.rs:165][E: codex-rs/protocol/src/items.rs:166][E: codex-rs/protocol/src/items.rs:167][E: codex-rs/protocol/src/items.rs:168]
- `UserMessageItem::text_elements()` 会把每段 text chunk 内的 byte range offset 到 concatenated message 的 byte range，避免 legacy flatten 后 span 漂移。[E: codex-rs/protocol/src/items.rs:186][E: codex-rs/protocol/src/items.rs:192][E: codex-rs/protocol/src/items.rs:193][E: codex-rs/protocol/src/items.rs:195][E: codex-rs/protocol/src/items.rs:196][E: codex-rs/protocol/src/items.rs:197][E: codex-rs/protocol/src/items.rs:204]

## Approval / guardian / elicitation payload 表

| Symbol | 签名/变体 | 关键字段 | 用途 | 定义处 |
|---|---|---|---|---|
| `Permissions` | struct | `sandbox_policy`, `file_system_sandbox_policy`, `network_sandbox_policy` | 聚合 sandbox、filesystem、network 三类权限策略。[E: codex-rs/protocol/src/approvals.rs:20][E: codex-rs/protocol/src/approvals.rs:21][E: codex-rs/protocol/src/approvals.rs:22][E: codex-rs/protocol/src/approvals.rs:23] | `approvals.rs` |
| `EscalationPermissions` | enum | `PermissionProfile`, `Permissions` | escalation payload 可以携带高层 permission profile 或已展开 permissions。[E: codex-rs/protocol/src/approvals.rs:28][E: codex-rs/protocol/src/approvals.rs:29][E: codex-rs/protocol/src/approvals.rs:30] | `approvals.rs` |
| `ExecPolicyAmendment` | transparent struct | `command: Vec<String>` | 表示允许 command prefix 的 execpolicy amendment；源码注释说明这些 tokens 会加入 `prefix_rule(..., decision="allow")`。[E: codex-rs/protocol/src/approvals.rs:33][E: codex-rs/protocol/src/approvals.rs:35][E: codex-rs/protocol/src/approvals.rs:36][E: codex-rs/protocol/src/approvals.rs:39][E: codex-rs/protocol/src/approvals.rs:42] | `approvals.rs` |
| `NetworkApprovalProtocol` | enum | `Http`, `Https`, `Socks5Tcp`, `Socks5Udp` | network approval 的协议维度；`Https` 接受 `https_connect` 与 `http-connect` alias。[E: codex-rs/protocol/src/approvals.rs:63][E: codex-rs/protocol/src/approvals.rs:66][E: codex-rs/protocol/src/approvals.rs:67][E: codex-rs/protocol/src/approvals.rs:68][E: codex-rs/protocol/src/approvals.rs:69][E: codex-rs/protocol/src/approvals.rs:70] | `approvals.rs` |
| `NetworkApprovalContext` | struct | `host`, `protocol` | 用 `host` 和 `protocol` 描述 optional blocked network request context。[E: codex-rs/protocol/src/approvals.rs:74][E: codex-rs/protocol/src/approvals.rs:75][E: codex-rs/protocol/src/approvals.rs:76][E: codex-rs/protocol/src/approvals.rs:234][E: codex-rs/protocol/src/approvals.rs:237] | `approvals.rs` |
| `NetworkPolicyAmendment` | struct | `host`, `action` | network policy rule change payload；default decision builder 只选择 `Allow` amendment 并包装成 `ReviewDecision::NetworkPolicyAmendment`。[E: codex-rs/protocol/src/approvals.rs:174][E: codex-rs/protocol/src/approvals.rs:175][E: codex-rs/protocol/src/approvals.rs:176][E: codex-rs/protocol/src/approvals.rs:292][E: codex-rs/protocol/src/approvals.rs:294][E: codex-rs/protocol/src/approvals.rs:295] | `approvals.rs` |
| `GuardianAssessmentAction` | tagged enum | `Command`, `Execve`, `ApplyPatch`, `NetworkAccess`, `McpToolCall`, `RequestPermissions` | guardian assessment event 中的 canonical action payload。[E: codex-rs/protocol/src/approvals.rs:136][E: codex-rs/protocol/src/approvals.rs:137][E: codex-rs/protocol/src/approvals.rs:138][E: codex-rs/protocol/src/approvals.rs:139][E: codex-rs/protocol/src/approvals.rs:144][E: codex-rs/protocol/src/approvals.rs:150][E: codex-rs/protocol/src/approvals.rs:154][E: codex-rs/protocol/src/approvals.rs:160][E: codex-rs/protocol/src/approvals.rs:167][E: codex-rs/protocol/src/approvals.rs:208][E: codex-rs/protocol/src/approvals.rs:209] | `approvals.rs` |
| `GuardianAssessmentEvent` | struct | `id`, `target_item_id?`, `turn_id`, `status`, `risk_level?`, `user_authorization?`, `rationale?`, `decision_source?`, `action` | guardian review lifecycle event，status/risk/rationale/action 都在单个 payload 中。[E: codex-rs/protocol/src/approvals.rs:180][E: codex-rs/protocol/src/approvals.rs:182][E: codex-rs/protocol/src/approvals.rs:186][E: codex-rs/protocol/src/approvals.rs:190][E: codex-rs/protocol/src/approvals.rs:191][E: codex-rs/protocol/src/approvals.rs:195][E: codex-rs/protocol/src/approvals.rs:199][E: codex-rs/protocol/src/approvals.rs:203][E: codex-rs/protocol/src/approvals.rs:207][E: codex-rs/protocol/src/approvals.rs:209] | `approvals.rs` |
| `ExecApprovalRequestEvent` | struct | `call_id`, `approval_id?`, `turn_id`, `command`, `cwd`, `reason?`, `network_approval_context?`, `proposed_execpolicy_amendment?`, `proposed_network_policy_amendments?`, `additional_permissions?`, `available_decisions?`, `parsed_cmd` | command approval prompt payload，字段覆盖 command item id、specific approval callback id、turn id、command/cwd/reason、blocked network context、future execpolicy/network amendments、extra filesystem permissions、client decision list 与 parsed command。[E: codex-rs/protocol/src/approvals.rs:213][E: codex-rs/protocol/src/approvals.rs:214][E: codex-rs/protocol/src/approvals.rs:216][E: codex-rs/protocol/src/approvals.rs:219][E: codex-rs/protocol/src/approvals.rs:223][E: codex-rs/protocol/src/approvals.rs:226][E: codex-rs/protocol/src/approvals.rs:227][E: codex-rs/protocol/src/approvals.rs:229][E: codex-rs/protocol/src/approvals.rs:230][E: codex-rs/protocol/src/approvals.rs:231][E: codex-rs/protocol/src/approvals.rs:233][E: codex-rs/protocol/src/approvals.rs:234][E: codex-rs/protocol/src/approvals.rs:238][E: codex-rs/protocol/src/approvals.rs:242][E: codex-rs/protocol/src/approvals.rs:246][E: codex-rs/protocol/src/approvals.rs:250][E: codex-rs/protocol/src/approvals.rs:253][E: codex-rs/protocol/src/approvals.rs:257] | `approvals.rs` |
| `ExecApprovalRequestEvent::effective_approval_id` | method | `approval_id.unwrap_or(call_id)` | 当 `approval_id` 为空时回退到 `call_id`，源码注释说明 `approval_id` present for subcommand approvals。[E: codex-rs/protocol/src/approvals.rs:216][E: codex-rs/protocol/src/approvals.rs:218][E: codex-rs/protocol/src/approvals.rs:219][E: codex-rs/protocol/src/approvals.rs:261][E: codex-rs/protocol/src/approvals.rs:262][E: codex-rs/protocol/src/approvals.rs:264] | `approvals.rs` |
| `ExecApprovalRequestEvent::default_available_decisions` | method | network -> approved/session/policy/abort, additional permissions -> approved/abort, execpolicy -> approved/amendment/abort | 根据 network context、additional permissions、execpolicy amendment 推导默认 decision list。[E: codex-rs/protocol/src/approvals.rs:281][E: codex-rs/protocol/src/approvals.rs:287][E: codex-rs/protocol/src/approvals.rs:288][E: codex-rs/protocol/src/approvals.rs:294][E: codex-rs/protocol/src/approvals.rs:298][E: codex-rs/protocol/src/approvals.rs:302][E: codex-rs/protocol/src/approvals.rs:303][E: codex-rs/protocol/src/approvals.rs:306][E: codex-rs/protocol/src/approvals.rs:307][E: codex-rs/protocol/src/approvals.rs:308][E: codex-rs/protocol/src/approvals.rs:312] | `approvals.rs` |
| `ElicitationRequest` | tagged enum | `Form { meta?, message, requested_schema }`, `Url { meta?, message, url, elicitation_id }` | MCP elicitation payload 支持 form schema 与 external URL 两种 mode，两个 mode 的 `_meta` 字段都可选。[E: codex-rs/protocol/src/approvals.rs:318][E: codex-rs/protocol/src/approvals.rs:319][E: codex-rs/protocol/src/approvals.rs:321][E: codex-rs/protocol/src/approvals.rs:322][E: codex-rs/protocol/src/approvals.rs:324][E: codex-rs/protocol/src/approvals.rs:325][E: codex-rs/protocol/src/approvals.rs:326][E: codex-rs/protocol/src/approvals.rs:328][E: codex-rs/protocol/src/approvals.rs:329][E: codex-rs/protocol/src/approvals.rs:331][E: codex-rs/protocol/src/approvals.rs:332][E: codex-rs/protocol/src/approvals.rs:333][E: codex-rs/protocol/src/approvals.rs:334] | `approvals.rs` |
| `ElicitationRequestEvent` | struct | `turn_id?`, `server_name`, `id`, `request` | 将 MCP server 名称、request id 与 elicitation payload 绑定。[E: codex-rs/protocol/src/approvals.rs:347][E: codex-rs/protocol/src/approvals.rs:351][E: codex-rs/protocol/src/approvals.rs:352][E: codex-rs/protocol/src/approvals.rs:354][E: codex-rs/protocol/src/approvals.rs:355] | `approvals.rs` |
| `ElicitationAction` | enum | `Accept`, `Decline`, `Cancel` | client 对 elicitation request 的三态决策。[E: codex-rs/protocol/src/approvals.rs:360][E: codex-rs/protocol/src/approvals.rs:361][E: codex-rs/protocol/src/approvals.rs:362][E: codex-rs/protocol/src/approvals.rs:363] | `approvals.rs` |
| `ApplyPatchApprovalRequestEvent` | struct | `call_id`, `turn_id`, `changes`, `reason?`, `grant_root?` | apply_patch approval prompt 描述 patch changes、原因；`grant_root` 表示允许本 session 剩余时间在该 root 下写入。[E: codex-rs/protocol/src/approvals.rs:367][E: codex-rs/protocol/src/approvals.rs:369][E: codex-rs/protocol/src/approvals.rs:373][E: codex-rs/protocol/src/approvals.rs:374][E: codex-rs/protocol/src/approvals.rs:377][E: codex-rs/protocol/src/approvals.rs:378][E: codex-rs/protocol/src/approvals.rs:380] | `approvals.rs` |

## Sources

- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/approvals.rs`

## 相关

- [ref.protocol-event-streaming](protocol-event-streaming.md)
- [ref.protocol-op](protocol-op.md)
- [subsys.core.approval-guardian](../subsystems/core/approval-guardian.md)
