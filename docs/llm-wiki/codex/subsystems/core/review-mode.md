---
id: subsys.core.review-mode
title: Review mode 与 Guardian review session
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/review.rs, codex-rs/core/src/tasks/review.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/legacy_events.rs, codex-rs/protocol/src/review_format.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ReviewTask, spawn_review_thread, ReviewRequest, ReviewOutputEvent, ReviewFinding, EnteredReviewModeItem, ExitedReviewModeItem, EnteredReviewModeEvent, ExitedReviewModeEvent, format_review_findings_block, render_review_output_text]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Review mode 有两条相邻但独立的路径：显式 `Op::Review` dispatch 到 `review(...)`、spawn `ReviewTask`，并以 canonical `TurnItem` 宣告 enter/exit；legacy `EnteredReviewMode`/`ExitedReviewMode` 由 item 兼容转换 fan out。Guardian review session 则是 approval auto-review path，有自己的 session manager 和 outcome enum。[E: codex-rs/protocol/src/protocol.rs:662][E: codex-rs/core/src/session/handlers.rs:820][E: codex-rs/core/src/session/review.rs:172][E: codex-rs/core/src/session/review.rs:175][E: codex-rs/core/src/tasks/review.rs:254][E: codex-rs/protocol/src/legacy_events.rs:114][E: codex-rs/core/src/guardian/review_session.rs:98]

## 能回答的问题

- `Op::Review` 从 protocol 到 session handler 如何进入 review thread？
- review child turn 为什么禁用 web search、spawn/collab features？
- reviewer 输出如何解析成 `ReviewOutputEvent`，失败时如何 fallback？
- `EnteredReviewMode`/`ExitedReviewMode` 的 event payload 是什么？
- Guardian review session 与显式 review mode 有哪些共享概念和边界差异？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/items.rs` / `legacy_events.rs` | 定义 canonical review enter/exit `TurnItem`，并在兼容层转换为带 turn/item correlation 的 legacy events。[E: codex-rs/protocol/src/items.rs:70][E: codex-rs/protocol/src/items.rs:71][E: codex-rs/protocol/src/items.rs:137][E: codex-rs/protocol/src/legacy_events.rs:114][E: codex-rs/protocol/src/legacy_events.rs:125] |
| `codex-rs/protocol/src/protocol.rs` | 定义 `Op::Review`、legacy review enter/exit events、`ReviewRequest`、`ReviewOutputEvent`、`ReviewFinding`。[E: codex-rs/protocol/src/protocol.rs:662][E: codex-rs/protocol/src/protocol.rs:1445][E: codex-rs/protocol/src/protocol.rs:1448][E: codex-rs/protocol/src/protocol.rs:3437][E: codex-rs/protocol/src/protocol.rs:3446][E: codex-rs/protocol/src/protocol.rs:3466] |
| `codex-rs/core/src/session/handlers.rs` | submission loop 把 `Op::Review` dispatch 到 `review(...)`。[E: codex-rs/core/src/session/handlers.rs:692][E: codex-rs/core/src/session/handlers.rs:820][E: codex-rs/core/src/session/handlers.rs:821] |
| `codex-rs/core/src/session/review.rs` | 构造 review turn context，spawn `ReviewTask`，发送 `EnteredReviewMode`。[E: codex-rs/core/src/session/review.rs:5][E: codex-rs/core/src/session/review.rs:111][E: codex-rs/core/src/session/review.rs:172][E: codex-rs/core/src/session/review.rs:172] |
| `codex-rs/core/src/tasks/review.rs` | review task 生命周期、one-shot reviewer child、event filtering、output parsing、exit event。[E: codex-rs/core/src/tasks/review.rs:44][E: codex-rs/core/src/tasks/review.rs:125][E: codex-rs/core/src/tasks/review.rs:142][E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:215] |
| `codex-rs/protocol/src/review_format.rs` | 纯文本 rendering，和 session/task 状态机解耦。[E: codex-rs/protocol/src/review_format.rs:23][E: codex-rs/protocol/src/review_format.rs:64] |
| `codex-rs/core/src/guardian/review_session.rs` | Guardian approval reviewer 维护 trunk/ephemeral review sessions。[E: codex-rs/core/src/guardian/review_session.rs:98][E: codex-rs/core/src/guardian/review_session.rs:105][E: codex-rs/core/src/guardian/review_session.rs:106] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ReviewRequest` | 包含 `target` 和可选 `user_facing_hint`。[E: codex-rs/protocol/src/protocol.rs:3437][E: codex-rs/protocol/src/protocol.rs:3438][E: codex-rs/protocol/src/protocol.rs:3441] |
| `ReviewOutputEvent` | 包含 `findings`、`overall_correctness`、`overall_explanation`、`overall_confidence_score`；default 是空 findings/strings 和 0 confidence。[E: codex-rs/protocol/src/protocol.rs:3446][E: codex-rs/protocol/src/protocol.rs:3447][E: codex-rs/protocol/src/protocol.rs:3448][E: codex-rs/protocol/src/protocol.rs:3449][E: codex-rs/protocol/src/protocol.rs:3450][E: codex-rs/protocol/src/protocol.rs:3456][E: codex-rs/protocol/src/protocol.rs:3459] |
| `ReviewFinding` | 结构化 finding 包含 title、body、confidence、priority、code location。[E: codex-rs/protocol/src/protocol.rs:3466][E: codex-rs/protocol/src/protocol.rs:3467][E: codex-rs/protocol/src/protocol.rs:3468][E: codex-rs/protocol/src/protocol.rs:3469][E: codex-rs/protocol/src/protocol.rs:3470][E: codex-rs/protocol/src/protocol.rs:3471] |
| `ReviewTask` | 零字段 task；`SessionTask::run` 从 input 中收集 `UserInput` 并启动 review conversation。[E: codex-rs/core/src/tasks/review.rs:36][E: codex-rs/core/src/tasks/review.rs:44][E: codex-rs/core/src/tasks/review.rs:53][E: codex-rs/core/src/tasks/review.rs:66][E: codex-rs/core/src/tasks/review.rs:75] |
| `GuardianReviewSessionOutcome` | Guardian auto-review session 的结果枚举是 `Completed`、`PromptBuildFailed`、`SessionFailed`、`TimedOut`、`Aborted`。[E: codex-rs/core/src/guardian/review_session.rs:67][E: codex-rs/core/src/guardian/review_session.rs:68][E: codex-rs/core/src/guardian/review_session.rs:69][E: codex-rs/core/src/guardian/review_session.rs:70][E: codex-rs/core/src/guardian/review_session.rs:74][E: codex-rs/core/src/guardian/review_session.rs:75] |

## 显式 review mode 控制流

1. Protocol 入口是 `Op::Review { review_request }`；submission loop 收到后调用 `review(&sess, &config, ...)`。[E: codex-rs/protocol/src/protocol.rs:662][E: codex-rs/core/src/session/handlers.rs:820][E: codex-rs/core/src/session/handlers.rs:821]
2. `review(...)` 创建 default turn context、刷新 MCP servers、resolve review request，成功后调用 `spawn_review_thread`。[E: codex-rs/core/src/session/handlers.rs:658][E: codex-rs/core/src/session/handlers.rs:664][E: codex-rs/core/src/session/handlers.rs:683][E: codex-rs/core/src/session/handlers.rs:668][E: codex-rs/core/src/session/handlers.rs:670]
3. `spawn_review_thread` 选择 `review_model`，没有配置时回退 parent model；它为 review 禁用 web search request/cache 和 goals。[E: codex-rs/core/src/session/review.rs:12][E: codex-rs/core/src/session/review.rs:15][E: codex-rs/core/src/session/review.rs:23][E: codex-rs/core/src/session/review.rs:24][E: codex-rs/core/src/session/review.rs:25]
4. review turn context 复制 parent 的环境、日期、时区、permission 和 network 等上下文，但把 developer instructions 置空，并关闭 multi-agent version。[E: codex-rs/core/src/session/review.rs:126][E: codex-rs/core/src/session/review.rs:129][E: codex-rs/core/src/session/review.rs:130][E: codex-rs/core/src/session/review.rs:132][E: codex-rs/core/src/session/review.rs:137][E: codex-rs/core/src/session/review.rs:139][E: codex-rs/core/src/session/review.rs:140][E: codex-rs/core/src/session/review.rs:141]
5. review prompt 被作为 synthesized `UserInput::Text` 注入，随后 `spawn_task(..., ReviewTask::new())`；session 再依次 emit `EnteredReviewModeItem` 的 started/completed lifecycle。[E: codex-rs/core/src/session/review.rs:172][E: codex-rs/core/src/session/review.rs:175][E: codex-rs/core/src/session/review.rs:181]
6. `ReviewTask::run` 记录 telemetry，启动 child review conversation；若未取消，结束时调用 `exit_review_mode`。[E: codex-rs/core/src/tasks/review.rs:60][E: codex-rs/core/src/tasks/review.rs:75][E: codex-rs/core/src/tasks/review.rs:83][E: codex-rs/core/src/tasks/review.rs:86][E: codex-rs/core/src/tasks/review.rs:87]
7. `start_review_conversation` 复制 config，禁用 web search、Collab 与 MultiAgentV2，设置 `base_instructions = REVIEW_PROMPT`，并把 approval policy 限制为 `AskForApproval::Never`。已删除的 SpawnCsv 不再有额外 runtime disable。[E: codex-rs/core/src/tasks/review.rs:103][E: codex-rs/core/src/tasks/review.rs:118]
8. child reviewer 用 `run_codex_thread_one_shot` 以 `SubAgentSource::Review` 运行。[E: codex-rs/core/src/tasks/review.rs:125][E: codex-rs/core/src/tasks/review.rs:133]
9. `process_review_events` 抑制 assistant item-completed/delta，`TurnComplete.last_agent_message` 作为 review 输出文本；`TurnAborted` 返回 None。[E: codex-rs/core/src/tasks/review.rs:142][E: codex-rs/core/src/tasks/review.rs:162][E: codex-rs/core/src/tasks/review.rs:166][E: codex-rs/core/src/tasks/review.rs:167][E: codex-rs/core/src/tasks/review.rs:172][E: codex-rs/core/src/tasks/review.rs:175]
10. `parse_review_output_event` 先尝试整段 JSON，再尝试抽取首尾 `{...}`，仍失败则把原文放入 `overall_explanation` fallback。[E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:197][E: codex-rs/core/src/tasks/review.rs:200][E: codex-rs/core/src/tasks/review.rs:203][E: codex-rs/core/src/tasks/review.rs:207][E: codex-rs/core/src/tasks/review.rs:208]
11. `exit_review_mode` 记录 review rollout messages，emit `ExitedReviewModeItem { review_output }` 的 started/completed lifecycle，再输出 assistant message，最后显式 materialize rollout persistence。[E: codex-rs/core/src/tasks/review.rs:241][E: codex-rs/core/src/tasks/review.rs:254][E: codex-rs/core/src/tasks/review.rs:259][E: codex-rs/core/src/tasks/review.rs:261][E: codex-rs/core/src/tasks/review.rs:278]

## Guardian review session 对照

- Guardian review session manager 维护一个 reusable trunk 和多个 ephemeral reviews；显式 `ReviewTask` 通过 one-shot child runner 运行，不使用 Guardian pool。[E: codex-rs/core/src/guardian/review_session.rs:98][E: codex-rs/core/src/guardian/review_session.rs:105][E: codex-rs/core/src/guardian/review_session.rs:106][E: codex-rs/core/src/tasks/review.rs:125][I]
- trunk reuse key mismatch 且 trunk lock 可获得时 Guardian 会丢弃旧 trunk；ephemeral review 会把 fork config 标记为 ephemeral 并单独 spawn review session。[E: codex-rs/core/src/guardian/review_session.rs:389][E: codex-rs/core/src/guardian/review_session.rs:390][E: codex-rs/core/src/guardian/review_session.rs:393][E: codex-rs/core/src/guardian/review_session.rs:609][E: codex-rs/core/src/guardian/review_session.rs:610][E: codex-rs/core/src/guardian/review_session.rs:615]
- Guardian review turn submits user input with a final output schema, `AskForApproval::Never`, and a read-only permission profile; explicit review mode parses reviewer text and falls back to `overall_explanation` when parsing fails.[E: codex-rs/core/src/guardian/review_session.rs:811][E: codex-rs/core/src/guardian/review_session.rs:814][E: codex-rs/core/src/guardian/review_session.rs:822][E: codex-rs/core/src/guardian/review_session.rs:824][E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:207]

## 输出格式

- `format_review_findings_block` 输出标题、location 和 body；有 selection 时用 checkbox marker，没有 selection 时用简单 bullet。[E: codex-rs/protocol/src/review_format.rs:23][E: codex-rs/protocol/src/review_format.rs:41][E: codex-rs/protocol/src/review_format.rs:43][E: codex-rs/protocol/src/review_format.rs:47][E: codex-rs/protocol/src/review_format.rs:49][E: codex-rs/protocol/src/review_format.rs:52]
- `render_review_output_text` 拼接 overall explanation 和 findings block；两者都空时返回 fallback message。[E: codex-rs/protocol/src/review_format.rs:64][E: codex-rs/protocol/src/review_format.rs:66][E: codex-rs/protocol/src/review_format.rs:70][E: codex-rs/protocol/src/review_format.rs:77][E: codex-rs/protocol/src/review_format.rs:80]

## Gotcha

- `ReviewDecision` 是 approval 决策 enum，不是显式 review mode 的输出格式；显式 review mode 输出是 `ReviewOutputEvent`。[E: codex-rs/protocol/src/protocol.rs:3446][E: codex-rs/protocol/src/protocol.rs:4097][I]
- 显式 review mode 的 child reviewer 不保证输出 structured findings；非 JSON 会变成 `overall_explanation`。[E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:207][E: codex-rs/core/src/tasks/review.rs:208]
- review turns 退出时专门 materialize rollout；这是为了避免 review 输出后没有持久化文件。[E: codex-rs/core/src/tasks/review.rs:278][I]

## Sources

- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/review.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/legacy_events.rs`
- `codex-rs/protocol/src/review_format.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
- [Session lifecycle](session-lifecycle.md)
- [Approval Guardian](approval-guardian.md)
