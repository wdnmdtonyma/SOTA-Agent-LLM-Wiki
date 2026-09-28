---
id: subsys.core.review-mode
title: Review mode 与 Guardian review session
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/review.rs, codex-rs/core/src/tasks/review.rs, codex-rs/protocol/src/items.rs, codex-rs/protocol/src/legacy_events.rs, codex-rs/protocol/src/review_format.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/ext/guardian-reviewer/src/outcome.rs, codex-rs/ext/guardian-reviewer/src/pool.rs, codex-rs/ext/guardian-reviewer/src/settings.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ReviewTask, spawn_review_thread, ReviewRequest, ReviewOutputEvent, ReviewFinding, EnteredReviewModeItem, ExitedReviewModeItem, EnteredReviewModeEvent, ExitedReviewModeEvent, format_review_findings_block, render_review_output_text]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Review mode 有两条相邻但独立的路径：显式 `Op::Review` dispatch 到 `review(...)`、spawn `ReviewTask`，并以 canonical `TurnItem` 宣告 enter/exit；legacy `EnteredReviewMode`/`ExitedReviewMode` 由 item 兼容转换 fan out。Guardian review session 则是 approval auto-review path：host adapter 在 `review_session.rs`（已删除 `review_session_factory.rs`），pool/outcome 在 `ext/guardian-reviewer`。[E: codex-rs/protocol/src/protocol.rs:747][E: codex-rs/core/src/session/handlers.rs:630][E: codex-rs/core/src/session/review.rs:218][E: codex-rs/core/src/session/review.rs:222][E: codex-rs/core/src/tasks/review.rs:252][E: codex-rs/protocol/src/legacy_events.rs:141][E: codex-rs/core/src/guardian/review_session.rs:122][E: codex-rs/core/src/guardian/review_session.rs:126]

## 能回答的问题

- `Op::Review` 从 protocol 到 session handler 如何进入 review thread？
- review child turn 为什么禁用 web search、spawn/collab features？
- reviewer 输出如何解析成 `ReviewOutputEvent`，失败时如何 fallback？
- `EnteredReviewMode`/`ExitedReviewMode` 的 event payload 是什么？
- Guardian review session 与显式 review mode 有哪些共享概念和边界差异？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/items.rs` / `legacy_events.rs` | 定义 canonical review enter/exit `TurnItem`，并在兼容层转换为带 turn/item correlation 的 legacy events。[E: codex-rs/protocol/src/items.rs:73][E: codex-rs/protocol/src/items.rs:74][E: codex-rs/protocol/src/items.rs:173][E: codex-rs/protocol/src/items.rs:180][E: codex-rs/protocol/src/legacy_events.rs:141][E: codex-rs/protocol/src/legacy_events.rs:152] |
| `codex-rs/protocol/src/protocol.rs` | 定义 `Op::Review`、legacy review enter/exit events、`ReviewRequest`、`ReviewOutputEvent`、`ReviewFinding`。[E: codex-rs/protocol/src/protocol.rs:747][E: codex-rs/protocol/src/protocol.rs:1534][E: codex-rs/protocol/src/protocol.rs:1537][E: codex-rs/protocol/src/protocol.rs:3490][E: codex-rs/protocol/src/protocol.rs:3499][E: codex-rs/protocol/src/protocol.rs:3519] |
| `codex-rs/core/src/session/handlers.rs` | submission loop 把 `Op::Review` dispatch 到 `review(...)`。[E: codex-rs/core/src/session/handlers.rs:420][E: codex-rs/core/src/session/handlers.rs:630][E: codex-rs/core/src/session/handlers.rs:631] |
| `codex-rs/core/src/session/review.rs` | 构造 review turn context，spawn `ReviewTask`，发送 `EnteredReviewMode`。[E: codex-rs/core/src/session/review.rs:7][E: codex-rs/core/src/session/review.rs:153][E: codex-rs/core/src/session/review.rs:218][E: codex-rs/core/src/session/review.rs:222] |
| `codex-rs/core/src/tasks/review.rs` | review task 生命周期、one-shot reviewer child、event filtering、output parsing、exit event。[E: codex-rs/core/src/tasks/review.rs:41][E: codex-rs/core/src/tasks/review.rs:125][E: codex-rs/core/src/tasks/review.rs:142][E: codex-rs/core/src/tasks/review.rs:193][E: codex-rs/core/src/tasks/review.rs:206] |
| `codex-rs/protocol/src/review_format.rs` | 纯文本 rendering，和 session/task 状态机解耦。[E: codex-rs/protocol/src/review_format.rs:23][E: codex-rs/protocol/src/review_format.rs:64] |
| `codex-rs/core/src/guardian/review_session.rs` | Guardian host adapter：`GuardianReviewSession` 实现 `ReviewerSession`，pool 类型是 `ReviewerPool`。[E: codex-rs/core/src/guardian/review_session.rs:122][E: codex-rs/core/src/guardian/review_session.rs:126][E: codex-rs/core/src/guardian/review_session.rs:895] |
| `codex-rs/ext/guardian-reviewer/src/pool.rs` | trunk reuse 与 ephemeral isolated session。[E: codex-rs/ext/guardian-reviewer/src/pool.rs:76][E: codex-rs/ext/guardian-reviewer/src/pool.rs:173][E: codex-rs/ext/guardian-reviewer/src/pool.rs:243] |
| `codex-rs/ext/guardian-reviewer/src/outcome.rs` | `GuardianReviewSessionOutcome` 定义处。[E: codex-rs/ext/guardian-reviewer/src/outcome.rs:79] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ReviewRequest` | 包含 `target` 和可选 `user_facing_hint`。[E: codex-rs/protocol/src/protocol.rs:3490][E: codex-rs/protocol/src/protocol.rs:3491][E: codex-rs/protocol/src/protocol.rs:3494] |
| `ReviewOutputEvent` | 包含 `findings`、`overall_correctness`、`overall_explanation`、`overall_confidence_score`；default 是空 findings/strings 和 0 confidence。[E: codex-rs/protocol/src/protocol.rs:3499][E: codex-rs/protocol/src/protocol.rs:3500][E: codex-rs/protocol/src/protocol.rs:3501][E: codex-rs/protocol/src/protocol.rs:3502][E: codex-rs/protocol/src/protocol.rs:3503][E: codex-rs/protocol/src/protocol.rs:3506][E: codex-rs/protocol/src/protocol.rs:3512] |
| `ReviewFinding` | 结构化 finding 包含 title、body、confidence、priority、code location。[E: codex-rs/protocol/src/protocol.rs:3519][E: codex-rs/protocol/src/protocol.rs:3520][E: codex-rs/protocol/src/protocol.rs:3521][E: codex-rs/protocol/src/protocol.rs:3522][E: codex-rs/protocol/src/protocol.rs:3523][E: codex-rs/protocol/src/protocol.rs:3524] |
| `ReviewTask` | 零字段 task；`SessionTask::run` 现在直接接收 `Arc<Session>`（不再经已删除的 `SessionTaskContext`），再从 input 中收集 `UserInput` 并启动 review conversation。[E: codex-rs/core/src/tasks/review.rs:37][E: codex-rs/core/src/tasks/review.rs:54][E: codex-rs/core/src/tasks/review.rs:56][E: codex-rs/core/src/tasks/review.rs:69] |
| `GuardianReviewSessionOutcome` | 定义在 `ext/guardian-reviewer`：`Completed`、`PromptBuildFailed`、`InputBudgetExceeded`、`SessionFailed`、`TimedOut`、`Aborted`；core 再 `pub use`。[E: codex-rs/ext/guardian-reviewer/src/outcome.rs:79][E: codex-rs/ext/guardian-reviewer/src/outcome.rs:80][E: codex-rs/ext/guardian-reviewer/src/outcome.rs:81][E: codex-rs/ext/guardian-reviewer/src/outcome.rs:82][E: codex-rs/ext/guardian-reviewer/src/outcome.rs:83][E: codex-rs/ext/guardian-reviewer/src/outcome.rs:88][E: codex-rs/ext/guardian-reviewer/src/outcome.rs:89][E: codex-rs/core/src/guardian/review_session.rs:102] |

## 显式 review mode 控制流

1. Protocol 入口是 `Op::Review { review_request }`；submission loop 收到后调用 `review(&sess, &config, ...)`。[E: codex-rs/protocol/src/protocol.rs:747][E: codex-rs/core/src/session/handlers.rs:630][E: codex-rs/core/src/session/handlers.rs:631]
2. `review(...)` 用 `new_turn_with_default_settings` 创建 turn context、resolve review request，成功后调用 `spawn_review_thread`。[E: codex-rs/core/src/session/handlers.rs:383][E: codex-rs/core/src/session/handlers.rs:390][E: codex-rs/core/src/session/handlers.rs:395][E: codex-rs/core/src/session/handlers.rs:397]
3. `spawn_review_thread` 选择 `review_model`，没有配置时回退 parent model；它为 review 禁用 `Feature::WebSearchRequest`、`WebSearchCached` 和 `Goals`。注释仍提到 view_image，但没有 `Feature::ViewImage` disable 调用。[E: codex-rs/core/src/session/review.rs:14][E: codex-rs/core/src/session/review.rs:17][E: codex-rs/core/src/session/review.rs:32][E: codex-rs/core/src/session/review.rs:33][E: codex-rs/core/src/session/review.rs:34][E: codex-rs/core/src/session/review.rs:35]
4. review `TurnContext { ... }` 复制 parent 的 environments、network、cwd、permission-derived metadata 和 skills snapshot；token-budget 按 parent config 的 explicit settings 决定是否用 model defaults。[E: codex-rs/core/src/session/review.rs:153][E: codex-rs/core/src/session/review.rs:173][E: codex-rs/core/src/session/review.rs:181][E: codex-rs/core/src/session/review.rs:184][E: codex-rs/core/src/session/review.rs:151][E: codex-rs/core/src/session/review.rs:158]
5. review prompt 被作为 synthesized `UserInput::Text` 注入，随后 `spawn_task(..., ReviewTask::new())`；session 再依次 emit `EnteredReviewModeItem` 的 started/completed lifecycle。[E: codex-rs/core/src/session/review.rs:197][E: codex-rs/core/src/session/review.rs:218][E: codex-rs/core/src/session/review.rs:222]
6. `ReviewTask::run` 记录 telemetry，启动 child review conversation；若未取消，结束时调用 `exit_review_mode`。[E: codex-rs/core/src/tasks/review.rs:60][E: codex-rs/core/src/tasks/review.rs:70][E: codex-rs/core/src/tasks/review.rs:83][E: codex-rs/core/src/tasks/review.rs:86][E: codex-rs/core/src/tasks/review.rs:89]
7. `start_review_conversation` 复制 config，禁用 web search、Collab 与 MultiAgentV2，设置 `base_instructions = REVIEW_PROMPT`，并把 approval policy 限制为 `AskForApproval::Never`。已删除的 SpawnCsv 不再有额外 runtime disable。[E: codex-rs/core/src/tasks/review.rs:103][E: codex-rs/core/src/tasks/review.rs:119][E: codex-rs/core/src/tasks/review.rs:121]
8. child reviewer 用 `run_codex_thread_one_shot` 以 `SubAgentSource::Review` 运行。[E: codex-rs/core/src/tasks/review.rs:128][E: codex-rs/core/src/tasks/review.rs:133]
9. `process_review_events` 抑制 assistant item-completed/delta，`TurnComplete.last_agent_message` 作为 review 输出文本；`TurnAborted` 返回 None。[E: codex-rs/core/src/tasks/review.rs:142][E: codex-rs/core/src/tasks/review.rs:162][E: codex-rs/core/src/tasks/review.rs:163][E: codex-rs/core/src/tasks/review.rs:164][E: codex-rs/core/src/tasks/review.rs:169][E: codex-rs/core/src/tasks/review.rs:172]
10. `parse_review_output_event` 先尝试整段 JSON，再尝试抽取首尾 `{...}`，仍失败则把原文放入 `overall_explanation` fallback。[E: codex-rs/core/src/tasks/review.rs:193][E: codex-rs/core/src/tasks/review.rs:194][E: codex-rs/core/src/tasks/review.rs:197][E: codex-rs/core/src/tasks/review.rs:202]
11. `exit_review_mode` 记录 review rollout messages，emit `ExitedReviewModeItem { review_output }` 的 started/completed lifecycle，再输出 assistant message，最后显式 materialize rollout persistence。[E: codex-rs/core/src/tasks/review.rs:238][E: codex-rs/core/src/tasks/review.rs:252][E: codex-rs/core/src/tasks/review.rs:256][E: codex-rs/core/src/tasks/review.rs:257][E: codex-rs/core/src/tasks/review.rs:277]

## Guardian review session 对照

- `ReviewerPool` 维护一个 reusable trunk；busy 或不兼容的 trunk 走 isolated ephemeral session。显式 `ReviewTask` 通过 one-shot child runner 运行，不使用 Guardian pool。[E: codex-rs/ext/guardian-reviewer/src/pool.rs:76][E: codex-rs/ext/guardian-reviewer/src/pool.rs:173][E: codex-rs/ext/guardian-reviewer/src/pool.rs:243][E: codex-rs/core/src/tasks/review.rs:128][I]
- trunk reuse key mismatch 且 trunk lock 可获得时 pool 会丢弃旧 trunk；ephemeral 走 `review_ephemeral`。[E: codex-rs/ext/guardian-reviewer/src/pool.rs:191][E: codex-rs/ext/guardian-reviewer/src/pool.rs:192][E: codex-rs/ext/guardian-reviewer/src/pool.rs:243]
- Guardian reviewer settings 把 approval policy 设为 `AskForApproval::Never`；host turn 带 output `schema`。显式 review mode 解析 reviewer 文本，失败则落入 `overall_explanation`。[E: codex-rs/ext/guardian-reviewer/src/settings.rs:82][E: codex-rs/core/src/guardian/review_session.rs:677][E: codex-rs/core/src/tasks/review.rs:193][E: codex-rs/core/src/tasks/review.rs:204]

## 输出格式

- `format_review_findings_block` 输出标题、location 和 body；有 selection 时用 checkbox marker，没有 selection 时用简单 bullet。[E: codex-rs/protocol/src/review_format.rs:23][E: codex-rs/protocol/src/review_format.rs:41][E: codex-rs/protocol/src/review_format.rs:43][E: codex-rs/protocol/src/review_format.rs:47][E: codex-rs/protocol/src/review_format.rs:49][E: codex-rs/protocol/src/review_format.rs:52]
- `render_review_output_text` 拼接 overall explanation 和 findings block；两者都空时返回 fallback message。[E: codex-rs/protocol/src/review_format.rs:64][E: codex-rs/protocol/src/review_format.rs:66][E: codex-rs/protocol/src/review_format.rs:70][E: codex-rs/protocol/src/review_format.rs:77][E: codex-rs/protocol/src/review_format.rs:80]

## Gotcha

- `ReviewDecision` 是 approval 决策 enum，不是显式 review mode 的输出格式；显式 review mode 输出是 `ReviewOutputEvent`。[E: codex-rs/protocol/src/protocol.rs:3499][E: codex-rs/protocol/src/protocol.rs:4159][I]
- 显式 review mode 的 child reviewer 不保证输出 structured findings；非 JSON 会变成 `overall_explanation`。[E: codex-rs/core/src/tasks/review.rs:193][E: codex-rs/core/src/tasks/review.rs:202]
- review turns 退出时专门 materialize rollout；这是为了避免 review 输出后没有持久化文件。[E: codex-rs/core/src/tasks/review.rs:277][I]

## Sources

- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/review.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/protocol/src/items.rs`
- `codex-rs/protocol/src/legacy_events.rs`
- `codex-rs/protocol/src/review_format.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/ext/guardian-reviewer/src/outcome.rs`
- `codex-rs/ext/guardian-reviewer/src/pool.rs`
- `codex-rs/ext/guardian-reviewer/src/settings.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
- [Session lifecycle](session-lifecycle.md)
- [Approval Guardian](approval-guardian.md)
