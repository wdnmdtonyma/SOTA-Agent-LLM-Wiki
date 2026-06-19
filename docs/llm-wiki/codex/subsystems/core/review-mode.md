---
id: subsys.core.review-mode
title: Review mode 与 Guardian review session
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/review.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/review_format.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ReviewTask, spawn_review_thread, ReviewRequest, ReviewOutputEvent, ReviewFinding, ExitedReviewModeEvent, format_review_findings_block, render_review_output_text, GuardianReviewSessionManager, GuardianReviewSessionOutcome]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 5670360009
---

> Review mode 有两条相邻但不同的路径：用户显式 `Op::Review` 会启动 `ReviewTask` 并发 `EnteredReviewMode`/`ExitedReviewMode`；Guardian review session 是 approval auto-review 的 read-only child Codex，不走这些 review-mode UI events。[E: codex-rs/protocol/src/protocol.rs:645][E: codex-rs/core/src/session/handlers.rs:826][E: codex-rs/core/src/session/review.rs:4][E: codex-rs/core/src/session/review.rs:163][E: codex-rs/core/src/tasks/review.rs:42][E: codex-rs/core/src/tasks/review.rs:255][E: codex-rs/core/src/guardian/review_session.rs:291][I]

## 能回答的问题

- `Op::Review` 从 protocol 到 session handler 如何进入 review thread？
- review child turn 为什么禁用 web search、spawn/collab features？
- reviewer 输出如何解析成 `ReviewOutputEvent`，失败时如何 fallback？
- `EnteredReviewMode`/`ExitedReviewMode` 的 event payload 是什么？
- Guardian review session 与显式 review mode 有哪些共享概念和边界差异？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/protocol.rs` | 定义 `Op::Review`、review enter/exit events、`ReviewRequest`、`ReviewOutputEvent`、`ReviewFinding`。[E: codex-rs/protocol/src/protocol.rs:645][E: codex-rs/protocol/src/protocol.rs:1375][E: codex-rs/protocol/src/protocol.rs:1879][E: codex-rs/protocol/src/protocol.rs:3163][E: codex-rs/protocol/src/protocol.rs:3172][E: codex-rs/protocol/src/protocol.rs:3192] |
| `codex-rs/core/src/session/handlers.rs` | submission loop 把 `Op::Review` dispatch 到 `review(...)`。[E: codex-rs/core/src/session/handlers.rs:698][E: codex-rs/core/src/session/handlers.rs:826][E: codex-rs/core/src/session/handlers.rs:827] |
| `codex-rs/core/src/session/review.rs` | 构造 review turn context，spawn `ReviewTask`，发送 `EnteredReviewMode`。[E: codex-rs/core/src/session/review.rs:5][E: codex-rs/core/src/session/review.rs:104][E: codex-rs/core/src/session/review.rs:161][E: codex-rs/core/src/session/review.rs:168] |
| `codex-rs/core/src/tasks/review.rs` | review task 生命周期、one-shot reviewer child、event filtering、output parsing、exit event。[E: codex-rs/core/src/tasks/review.rs:42][E: codex-rs/core/src/tasks/review.rs:95][E: codex-rs/core/src/tasks/review.rs:141][E: codex-rs/core/src/tasks/review.rs:195][E: codex-rs/core/src/tasks/review.rs:214] |
| `codex-rs/core/src/review_format.rs` | 纯文本 rendering，和 session/task 状态机解耦。[E: codex-rs/core/src/review_format.rs:4][E: codex-rs/core/src/review_format.rs:23][E: codex-rs/core/src/review_format.rs:64] |
| `codex-rs/core/src/guardian/review_session.rs` | Guardian approval reviewer 的 trunk/ephemeral session pool，不是显式 `ReviewTask`。[E: codex-rs/core/src/guardian/review_session.rs:93][E: codex-rs/core/src/guardian/review_session.rs:324][E: codex-rs/core/src/guardian/review_session.rs:552] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ReviewRequest` | 包含 `target` 和可选 `user_facing_hint`。[E: codex-rs/protocol/src/protocol.rs:3163][E: codex-rs/protocol/src/protocol.rs:3164][E: codex-rs/protocol/src/protocol.rs:3167] |
| `ReviewOutputEvent` | 包含 `findings`、`overall_correctness`、`overall_explanation`、`overall_confidence_score`；default 是空 findings/strings 和 0 confidence。[E: codex-rs/protocol/src/protocol.rs:3172][E: codex-rs/protocol/src/protocol.rs:3173][E: codex-rs/protocol/src/protocol.rs:3176][E: codex-rs/protocol/src/protocol.rs:3179][E: codex-rs/protocol/src/protocol.rs:3182][E: codex-rs/protocol/src/protocol.rs:3185] |
| `ReviewFinding` | 结构化 finding 包含 title、body、confidence、priority、code location。[E: codex-rs/protocol/src/protocol.rs:3192][E: codex-rs/protocol/src/protocol.rs:3193][E: codex-rs/protocol/src/protocol.rs:3194][E: codex-rs/protocol/src/protocol.rs:3195][E: codex-rs/protocol/src/protocol.rs:3196][E: codex-rs/protocol/src/protocol.rs:3197] |
| `ReviewTask` | 零字段 task；`SessionTask::run` 从 input 中收集 `UserInput` 并启动 review conversation。[E: codex-rs/core/src/tasks/review.rs:34][E: codex-rs/core/src/tasks/review.rs:42][E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:64][E: codex-rs/core/src/tasks/review.rs:73] |
| `GuardianReviewSessionOutcome` | Guardian auto-review session 的结果枚举是 `Completed`、`PromptBuildFailed`、`SessionFailed`、`TimedOut`、`Aborted`。[E: codex-rs/core/src/guardian/review_session.rs:62][E: codex-rs/core/src/guardian/review_session.rs:63][E: codex-rs/core/src/guardian/review_session.rs:64][E: codex-rs/core/src/guardian/review_session.rs:65][E: codex-rs/core/src/guardian/review_session.rs:69][E: codex-rs/core/src/guardian/review_session.rs:70] |

## 显式 review mode 控制流

1. Protocol 入口是 `Op::Review { review_request }`；submission loop 收到后调用 `review(&sess, &config, ...)`。[E: codex-rs/protocol/src/protocol.rs:645][E: codex-rs/protocol/src/protocol.rs:646][E: codex-rs/core/src/session/handlers.rs:826][E: codex-rs/core/src/session/handlers.rs:827]
2. `review(...)` 创建 default turn context、刷新 MCP servers、resolve review request，成功后调用 `spawn_review_thread`。[E: codex-rs/core/src/session/handlers.rs:662][E: codex-rs/core/src/session/handlers.rs:668][E: codex-rs/core/src/session/handlers.rs:671][E: codex-rs/core/src/session/handlers.rs:674][E: codex-rs/core/src/session/handlers.rs:676]
3. `spawn_review_thread` 选择 `review_model`，没有配置时回退 parent model；它为 review 禁用 web search request/cache 和 goals。[E: codex-rs/core/src/session/review.rs:12][E: codex-rs/core/src/session/review.rs:15][E: codex-rs/core/src/session/review.rs:21][E: codex-rs/core/src/session/review.rs:23][E: codex-rs/core/src/session/review.rs:25]
4. review turn context 复制 parent 的 permission、network、collaboration mode 等上下文，但把 developer/user instructions 置空，并关闭 multi-agent version。[E: codex-rs/core/src/session/review.rs:104][E: codex-rs/core/src/session/review.rs:123][E: codex-rs/core/src/session/review.rs:124][E: codex-rs/core/src/session/review.rs:125][E: codex-rs/core/src/session/review.rs:126][E: codex-rs/core/src/session/review.rs:128][E: codex-rs/core/src/session/review.rs:129][E: codex-rs/core/src/session/review.rs:130]
5. review prompt 被作为 synthesized `UserInput::Text` 注入，随后 `spawn_task(..., ReviewTask::new())` 并发送 `EnteredReviewMode(review_request)`。[E: codex-rs/core/src/session/review.rs:145][E: codex-rs/core/src/session/review.rs:146][E: codex-rs/core/src/session/review.rs:161][E: codex-rs/core/src/session/review.rs:163][E: codex-rs/core/src/session/review.rs:168]
6. `ReviewTask::run` 记录 telemetry，启动 child review conversation；若未取消，结束时调用 `exit_review_mode`。[E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:58][E: codex-rs/core/src/tasks/review.rs:73][E: codex-rs/core/src/tasks/review.rs:81][E: codex-rs/core/src/tasks/review.rs:84][E: codex-rs/core/src/tasks/review.rs:85]
7. `start_review_conversation` 复制 config，禁用 web search、SpawnCsv、Collab、MultiAgentV2，设置 `base_instructions = REVIEW_PROMPT`，并把 approval policy 限制为 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:101][E: codex-rs/core/src/tasks/review.rs:105][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:112][E: codex-rs/core/src/tasks/review.rs:113][E: codex-rs/core/src/tasks/review.rs:116][E: codex-rs/core/src/tasks/review.rs:117]
8. child reviewer 用 `run_codex_thread_one_shot` 以 `SubAgentSource::Review` 运行，不传 final output schema 或 initial history。[E: codex-rs/core/src/tasks/review.rs:124][E: codex-rs/core/src/tasks/review.rs:132][E: codex-rs/core/src/tasks/review.rs:133][E: codex-rs/core/src/tasks/review.rs:134]
9. `process_review_events` 抑制 assistant item-completed/delta，`TurnComplete.last_agent_message` 作为 review 输出文本；`TurnAborted` 返回 None。[E: codex-rs/core/src/tasks/review.rs:141][E: codex-rs/core/src/tasks/review.rs:161][E: codex-rs/core/src/tasks/review.rs:165][E: codex-rs/core/src/tasks/review.rs:166][E: codex-rs/core/src/tasks/review.rs:174]
10. `parse_review_output_event` 先尝试整段 JSON，再尝试抽取首尾 `{...}`，仍失败则把原文放入 `overall_explanation` fallback。[E: codex-rs/core/src/tasks/review.rs:195][E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:199][E: codex-rs/core/src/tasks/review.rs:202][E: codex-rs/core/src/tasks/review.rs:206][E: codex-rs/core/src/tasks/review.rs:207]
11. `exit_review_mode` 记录 review rollout messages，发送 `ExitedReviewModeEvent { review_output }`，然后显式 materialize rollout persistence。[E: codex-rs/core/src/tasks/review.rs:214][E: codex-rs/core/src/tasks/review.rs:221][E: codex-rs/core/src/tasks/review.rs:242][E: codex-rs/core/src/tasks/review.rs:255][E: codex-rs/core/src/tasks/review.rs:258][E: codex-rs/core/src/tasks/review.rs:276][E: codex-rs/core/src/tasks/review.rs:279]

## Guardian review session 对照

- Guardian review session manager 维护一个 reusable trunk 和多个 ephemeral reviews；显式 `ReviewTask` 不使用这套 pool。[E: codex-rs/core/src/guardian/review_session.rs:93][E: codex-rs/core/src/guardian/review_session.rs:98][E: codex-rs/core/src/guardian/review_session.rs:99][E: codex-rs/core/src/guardian/review_session.rs:100][I]
- trunk key mismatch 或 trunk busy 时 Guardian 会跑 ephemeral review；显式 review mode 每次通过 one-shot child runner 运行。[E: codex-rs/core/src/guardian/review_session.rs:401][E: codex-rs/core/src/guardian/review_session.rs:411][E: codex-rs/core/src/guardian/review_session.rs:552][E: codex-rs/core/src/tasks/review.rs:124][I]
- Guardian review turn 使用 final output schema、`AskForApproval::Never`、read-only permission profile 和 Default collaboration mode；显式 review mode 解析 reviewer 文本，schema 失败时 fallback。[E: codex-rs/core/src/guardian/review_session.rs:765][E: codex-rs/core/src/guardian/review_session.rs:767][E: codex-rs/core/src/guardian/review_session.rs:775][E: codex-rs/core/src/guardian/review_session.rs:777][E: codex-rs/core/src/guardian/review_session.rs:780][E: codex-rs/core/src/tasks/review.rs:195][I]

## 输出格式

- `format_review_findings_block` 输出标题、location 和 body；有 selection 时用 checkbox marker，没有 selection 时用简单 bullet。[E: codex-rs/core/src/review_format.rs:16][E: codex-rs/core/src/review_format.rs:23][E: codex-rs/core/src/review_format.rs:31][E: codex-rs/core/src/review_format.rs:43][E: codex-rs/core/src/review_format.rs:49][E: codex-rs/core/src/review_format.rs:52]
- `render_review_output_text` 拼接 overall explanation 和 findings block；两者都空时返回 fallback message。[E: codex-rs/core/src/review_format.rs:60][E: codex-rs/core/src/review_format.rs:64][E: codex-rs/core/src/review_format.rs:66][E: codex-rs/core/src/review_format.rs:70][E: codex-rs/core/src/review_format.rs:77]

## Gotcha

- `ReviewDecision` 是 approval 决策 enum，不是显式 review mode 的输出格式；显式 review mode 输出是 `ReviewOutputEvent`。[E: codex-rs/protocol/src/protocol.rs:3172][E: codex-rs/protocol/src/protocol.rs:3792][I]
- 显式 review mode 的 child reviewer 不保证输出 structured findings；非 JSON 会变成 `overall_explanation`。[E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:206][E: codex-rs/core/src/tasks/review.rs:207]
- review turns 可能在普通 user turn 之前运行，所以退出时专门 materialize rollout，避免 review 输出后没有持久化文件。[E: codex-rs/core/src/tasks/review.rs:276][E: codex-rs/core/src/tasks/review.rs:279]

## Sources

- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/review.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/review_format.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
- [Session lifecycle](session-lifecycle.md)
- [Approval Guardian](approval-guardian.md)
