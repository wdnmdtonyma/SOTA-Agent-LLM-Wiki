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
updated: db887d03e1
---

> Review mode has two adjacent but distinct paths: explicit `Op::Review` dispatches to `review(...)`, spawns `ReviewTask`, and emits `EnteredReviewMode`/`ExitedReviewMode`; Guardian review session is the approval auto-review path with its own session manager and outcome enum.[E: codex-rs/protocol/src/protocol.rs:655][E: codex-rs/core/src/session/handlers.rs:830][E: codex-rs/core/src/session/review.rs:165][E: codex-rs/core/src/session/review.rs:172][E: codex-rs/core/src/tasks/review.rs:35][E: codex-rs/core/src/tasks/review.rs:259][E: codex-rs/core/src/guardian/review_session.rs:64][E: codex-rs/core/src/guardian/review_session.rs:95]

## 能回答的问题

- `Op::Review` 从 protocol 到 session handler 如何进入 review thread？
- review child turn 为什么禁用 web search、spawn/collab features？
- reviewer 输出如何解析成 `ReviewOutputEvent`，失败时如何 fallback？
- `EnteredReviewMode`/`ExitedReviewMode` 的 event payload 是什么？
- Guardian review session 与显式 review mode 有哪些共享概念和边界差异？

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/protocol.rs` | 定义 `Op::Review`、review enter/exit events、`ReviewRequest`、`ReviewOutputEvent`、`ReviewFinding`。[E: codex-rs/protocol/src/protocol.rs:655][E: codex-rs/protocol/src/protocol.rs:1427][E: codex-rs/protocol/src/protocol.rs:1430][E: codex-rs/protocol/src/protocol.rs:3402][E: codex-rs/protocol/src/protocol.rs:3411][E: codex-rs/protocol/src/protocol.rs:3431] |
| `codex-rs/core/src/session/handlers.rs` | submission loop 把 `Op::Review` dispatch 到 `review(...)`。[E: codex-rs/core/src/session/handlers.rs:702][E: codex-rs/core/src/session/handlers.rs:830][E: codex-rs/core/src/session/handlers.rs:831] |
| `codex-rs/core/src/session/review.rs` | 构造 review turn context，spawn `ReviewTask`，发送 `EnteredReviewMode`。[E: codex-rs/core/src/session/review.rs:5][E: codex-rs/core/src/session/review.rs:108][E: codex-rs/core/src/session/review.rs:165][E: codex-rs/core/src/session/review.rs:172] |
| `codex-rs/core/src/tasks/review.rs` | review task 生命周期、one-shot reviewer child、event filtering、output parsing、exit event。[E: codex-rs/core/src/tasks/review.rs:43][E: codex-rs/core/src/tasks/review.rs:125][E: codex-rs/core/src/tasks/review.rs:142][E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:215] |
| `codex-rs/core/src/review_format.rs` | 纯文本 rendering，和 session/task 状态机解耦。[E: codex-rs/core/src/review_format.rs:23][E: codex-rs/core/src/review_format.rs:64] |
| `codex-rs/core/src/guardian/review_session.rs` | Guardian approval reviewer 维护 trunk/ephemeral review sessions。[E: codex-rs/core/src/guardian/review_session.rs:95][E: codex-rs/core/src/guardian/review_session.rs:102][E: codex-rs/core/src/guardian/review_session.rs:103] |

## 数据模型

| 实体 | 当前形态 |
|---|---|
| `ReviewRequest` | 包含 `target` 和可选 `user_facing_hint`。[E: codex-rs/protocol/src/protocol.rs:3402][E: codex-rs/protocol/src/protocol.rs:3403][E: codex-rs/protocol/src/protocol.rs:3406] |
| `ReviewOutputEvent` | 包含 `findings`、`overall_correctness`、`overall_explanation`、`overall_confidence_score`；default 是空 findings/strings 和 0 confidence。[E: codex-rs/protocol/src/protocol.rs:3411][E: codex-rs/protocol/src/protocol.rs:3412][E: codex-rs/protocol/src/protocol.rs:3413][E: codex-rs/protocol/src/protocol.rs:3414][E: codex-rs/protocol/src/protocol.rs:3415][E: codex-rs/protocol/src/protocol.rs:3421][E: codex-rs/protocol/src/protocol.rs:3424] |
| `ReviewFinding` | 结构化 finding 包含 title、body、confidence、priority、code location。[E: codex-rs/protocol/src/protocol.rs:3431][E: codex-rs/protocol/src/protocol.rs:3432][E: codex-rs/protocol/src/protocol.rs:3433][E: codex-rs/protocol/src/protocol.rs:3434][E: codex-rs/protocol/src/protocol.rs:3435][E: codex-rs/protocol/src/protocol.rs:3436] |
| `ReviewTask` | 零字段 task；`SessionTask::run` 从 input 中收集 `UserInput` 并启动 review conversation。[E: codex-rs/core/src/tasks/review.rs:35][E: codex-rs/core/src/tasks/review.rs:43][E: codex-rs/core/src/tasks/review.rs:52][E: codex-rs/core/src/tasks/review.rs:65][E: codex-rs/core/src/tasks/review.rs:74] |
| `GuardianReviewSessionOutcome` | Guardian auto-review session 的结果枚举是 `Completed`、`PromptBuildFailed`、`SessionFailed`、`TimedOut`、`Aborted`。[E: codex-rs/core/src/guardian/review_session.rs:64][E: codex-rs/core/src/guardian/review_session.rs:65][E: codex-rs/core/src/guardian/review_session.rs:66][E: codex-rs/core/src/guardian/review_session.rs:67][E: codex-rs/core/src/guardian/review_session.rs:71][E: codex-rs/core/src/guardian/review_session.rs:72] |

## 显式 review mode 控制流

1. Protocol 入口是 `Op::Review { review_request }`；submission loop 收到后调用 `review(&sess, &config, ...)`。[E: codex-rs/protocol/src/protocol.rs:655][E: codex-rs/core/src/session/handlers.rs:830][E: codex-rs/core/src/session/handlers.rs:831]
2. `review(...)` 创建 default turn context、刷新 MCP servers、resolve review request，成功后调用 `spawn_review_thread`。[E: codex-rs/core/src/session/handlers.rs:666][E: codex-rs/core/src/session/handlers.rs:672][E: codex-rs/core/src/session/handlers.rs:675][E: codex-rs/core/src/session/handlers.rs:678][E: codex-rs/core/src/session/handlers.rs:680]
3. `spawn_review_thread` 选择 `review_model`，没有配置时回退 parent model；它为 review 禁用 web search request/cache 和 goals。[E: codex-rs/core/src/session/review.rs:12][E: codex-rs/core/src/session/review.rs:15][E: codex-rs/core/src/session/review.rs:23][E: codex-rs/core/src/session/review.rs:24][E: codex-rs/core/src/session/review.rs:25]
4. review turn context 复制 parent 的环境、日期、时区、permission 和 network 等上下文，但把 developer instructions 置空，并关闭 multi-agent version。[E: codex-rs/core/src/session/review.rs:122][E: codex-rs/core/src/session/review.rs:125][E: codex-rs/core/src/session/review.rs:126][E: codex-rs/core/src/session/review.rs:128][E: codex-rs/core/src/session/review.rs:130][E: codex-rs/core/src/session/review.rs:132][E: codex-rs/core/src/session/review.rs:133][E: codex-rs/core/src/session/review.rs:134]
5. review prompt 被作为 synthesized `UserInput::Text` 注入，随后 `spawn_task(..., ReviewTask::new())` 并发送 `EnteredReviewMode(review_request)`。[E: codex-rs/core/src/session/review.rs:157][E: codex-rs/core/src/session/review.rs:165][E: codex-rs/core/src/session/review.rs:168][E: codex-rs/core/src/session/review.rs:172]
6. `ReviewTask::run` 记录 telemetry，启动 child review conversation；若未取消，结束时调用 `exit_review_mode`。[E: codex-rs/core/src/tasks/review.rs:59][E: codex-rs/core/src/tasks/review.rs:74][E: codex-rs/core/src/tasks/review.rs:82][E: codex-rs/core/src/tasks/review.rs:85][E: codex-rs/core/src/tasks/review.rs:86]
7. `start_review_conversation` 复制 config，禁用 web search、SpawnCsv、Collab、MultiAgentV2，设置 `base_instructions = REVIEW_PROMPT`，并把 approval policy 限制为 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:103][E: codex-rs/core/src/tasks/review.rs:108][E: codex-rs/core/src/tasks/review.rs:112][E: codex-rs/core/src/tasks/review.rs:113][E: codex-rs/core/src/tasks/review.rs:114][E: codex-rs/core/src/tasks/review.rs:117][E: codex-rs/core/src/tasks/review.rs:118]
8. child reviewer 用 `run_codex_thread_one_shot` 以 `SubAgentSource::Review` 运行。[E: codex-rs/core/src/tasks/review.rs:125][E: codex-rs/core/src/tasks/review.rs:133]
9. `process_review_events` 抑制 assistant item-completed/delta，`TurnComplete.last_agent_message` 作为 review 输出文本；`TurnAborted` 返回 None。[E: codex-rs/core/src/tasks/review.rs:142][E: codex-rs/core/src/tasks/review.rs:162][E: codex-rs/core/src/tasks/review.rs:166][E: codex-rs/core/src/tasks/review.rs:167][E: codex-rs/core/src/tasks/review.rs:172][E: codex-rs/core/src/tasks/review.rs:175]
10. `parse_review_output_event` 先尝试整段 JSON，再尝试抽取首尾 `{...}`，仍失败则把原文放入 `overall_explanation` fallback。[E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:197][E: codex-rs/core/src/tasks/review.rs:200][E: codex-rs/core/src/tasks/review.rs:203][E: codex-rs/core/src/tasks/review.rs:207][E: codex-rs/core/src/tasks/review.rs:208]
11. `exit_review_mode` 记录 review rollout messages，发送 `ExitedReviewModeEvent { review_output }`，然后显式 materialize rollout persistence。[E: codex-rs/core/src/tasks/review.rs:215][E: codex-rs/core/src/tasks/review.rs:243][E: codex-rs/core/src/tasks/review.rs:257][E: codex-rs/core/src/tasks/review.rs:259][E: codex-rs/core/src/tasks/review.rs:263][E: codex-rs/core/src/tasks/review.rs:280]

## Guardian review session 对照

- Guardian review session manager 维护一个 reusable trunk 和多个 ephemeral reviews；显式 `ReviewTask` 通过 one-shot child runner 运行，不使用 Guardian pool。[E: codex-rs/core/src/guardian/review_session.rs:95][E: codex-rs/core/src/guardian/review_session.rs:102][E: codex-rs/core/src/guardian/review_session.rs:103][E: codex-rs/core/src/tasks/review.rs:125][I]
- trunk reuse key mismatch 且 trunk lock 可获得时 Guardian 会丢弃旧 trunk；ephemeral review 会把 fork config 标记为 ephemeral 并单独 spawn review session。[E: codex-rs/core/src/guardian/review_session.rs:383][E: codex-rs/core/src/guardian/review_session.rs:384][E: codex-rs/core/src/guardian/review_session.rs:387][E: codex-rs/core/src/guardian/review_session.rs:601][E: codex-rs/core/src/guardian/review_session.rs:602][E: codex-rs/core/src/guardian/review_session.rs:607]
- Guardian review turn submits user input with a final output schema, `AskForApproval::Never`, and a read-only permission profile; explicit review mode parses reviewer text and falls back to `overall_explanation` when parsing fails.[E: codex-rs/core/src/guardian/review_session.rs:808][E: codex-rs/core/src/guardian/review_session.rs:810][E: codex-rs/core/src/guardian/review_session.rs:818][E: codex-rs/core/src/guardian/review_session.rs:820][E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:207]

## 输出格式

- `format_review_findings_block` 输出标题、location 和 body；有 selection 时用 checkbox marker，没有 selection 时用简单 bullet。[E: codex-rs/core/src/review_format.rs:23][E: codex-rs/core/src/review_format.rs:41][E: codex-rs/core/src/review_format.rs:43][E: codex-rs/core/src/review_format.rs:47][E: codex-rs/core/src/review_format.rs:49][E: codex-rs/core/src/review_format.rs:52]
- `render_review_output_text` 拼接 overall explanation 和 findings block；两者都空时返回 fallback message。[E: codex-rs/core/src/review_format.rs:64][E: codex-rs/core/src/review_format.rs:66][E: codex-rs/core/src/review_format.rs:70][E: codex-rs/core/src/review_format.rs:77][E: codex-rs/core/src/review_format.rs:80]

## Gotcha

- `ReviewDecision` 是 approval 决策 enum，不是显式 review mode 的输出格式；显式 review mode 输出是 `ReviewOutputEvent`。[E: codex-rs/protocol/src/protocol.rs:3411][E: codex-rs/protocol/src/protocol.rs:4046][I]
- 显式 review mode 的 child reviewer 不保证输出 structured findings；非 JSON 会变成 `overall_explanation`。[E: codex-rs/core/src/tasks/review.rs:196][E: codex-rs/core/src/tasks/review.rs:207][E: codex-rs/core/src/tasks/review.rs:208]
- review turns 退出时专门 materialize rollout；这是为了避免 review 输出后没有持久化文件。[E: codex-rs/core/src/tasks/review.rs:280][I]

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
