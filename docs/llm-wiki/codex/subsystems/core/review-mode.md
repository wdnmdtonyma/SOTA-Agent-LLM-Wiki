---
id: subsys.core.review-mode
title: Review mode 与 Guardian review session
kind: subsystem
tier: T2
source: [codex-rs/core/src/tasks/review.rs, codex-rs/core/src/review_format.rs, codex-rs/core/src/guardian/review_session.rs, codex-rs/core/src/session/review.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ReviewTask, spawn_review_thread, ReviewRequest, ReviewOutputEvent, format_review_findings_block, render_review_output_text, GuardianReviewSessionManager, GuardianReviewSessionOutcome, run_review_on_session, build_guardian_review_session_config]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle, subsys.core.approval-guardian]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Review mode 包含两条相邻但不同的审查流：用户显式 `Op::Review` 会创建独立 reviewer thread、发送 `EnteredReviewMode`，并在 `exit_review_mode` 发送 `ExitedReviewMode` 后物化 rollout；Guardian review session 复用或临时创建 read-only reviewer session，但不使用 `EnteredReviewMode`/`ExitedReviewMode` 事件。[E: codex-rs/core/src/session/handlers.rs:1198][E: codex-rs/core/src/session/review.rs:156][E: codex-rs/core/src/session/review.rs:163][E: codex-rs/core/src/tasks/review.rs:258][E: codex-rs/core/src/tasks/review.rs:261][E: codex-rs/core/src/tasks/review.rs:282][E: codex-rs/core/src/guardian/review_session.rs:285][I]

## 能回答的问题

- 用户触发 `Op::Review` 后，review thread 如何被创建？
- review mode 为什么禁用 web search 和 spawn/collab features？
- review 子任务如何从 one-shot subagent event stream 提取 JSON review output？
- `ExitedReviewModeEvent.review_output` 的格式和 fallback 是什么？
- Guardian review session 何时复用 trunk，何时开 ephemeral review？

## 职责边界

- `codex-rs/core/src/session/review.rs` 负责 root session 收到 review 请求后的 thread spawn 与 `EnteredReviewMode` 事件。[E: codex-rs/core/src/session/review.rs:12][E: codex-rs/core/src/session/review.rs:151]
- `codex-rs/core/src/tasks/review.rs` 负责 review task 的生命周期、one-shot reviewer thread、review output 解析和 `ExitedReviewMode` 事件。[E: codex-rs/core/src/tasks/review.rs:41][E: codex-rs/core/src/tasks/review.rs:212]
- `codex-rs/core/src/review_format.rs` 只做 UI-agnostic formatting；是否进入或退出 review 由 session/task 侧触发。[E: codex-rs/core/src/review_format.rs:4][E: codex-rs/core/src/session/review.rs:156][I]
- `codex-rs/core/src/guardian/review_session.rs` 管理 Guardian reviewer 的可复用 trunk/ephemeral session；它服务的是 Guardian 审查流，不是用户显式 `/review` 的 `ReviewTask`。[E: codex-rs/core/src/guardian/review_session.rs:78][E: codex-rs/core/src/guardian/review_session.rs:89][I]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/protocol/src/protocol.rs` | `Op::Review`、`EnteredReviewMode`、`ExitedReviewMode`、`ReviewRequest`、`ReviewOutputEvent`。[E: codex-rs/protocol/src/protocol.rs:701][E: codex-rs/protocol/src/protocol.rs:1601][E: codex-rs/protocol/src/protocol.rs:2058][E: codex-rs/protocol/src/protocol.rs:3045][E: codex-rs/protocol/src/protocol.rs:3054] |
| `codex-rs/core/src/session/review.rs` | 由 session 侧构造 review thread config、turn context 和 `ReviewTask`。[E: codex-rs/core/src/session/review.rs:12][E: codex-rs/core/src/session/review.rs:100] |
| `codex-rs/core/src/tasks/review.rs` | review task 状态机：run、abort、subagent event 处理、退出事件。[E: codex-rs/core/src/tasks/review.rs:50][E: codex-rs/core/src/tasks/review.rs:90] |
| `codex-rs/core/src/review_format.rs` | findings block、location string 和 fallback rendering。[E: codex-rs/core/src/review_format.rs:7][E: codex-rs/core/src/review_format.rs:23][E: codex-rs/core/src/review_format.rs:64] |
| `codex-rs/core/src/guardian/review_session.rs` | Guardian reviewer session pool、snapshot fork、read-only sandbox、安全配置。[E: codex-rs/core/src/guardian/review_session.rs:130][E: codex-rs/core/src/guardian/review_session.rs:821] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `ReviewTask` | 零字段 task struct | `ReviewTask` 本身不持有 `sub_id`、turn context 或 request；`SessionTask::run` 的参数接收 session、turn context、input 和 cancellation token。[E: codex-rs/core/src/tasks/review.rs:41][E: codex-rs/core/src/tasks/review.rs:42][E: codex-rs/core/src/tasks/review.rs:59][E: codex-rs/core/src/tasks/review.rs:62][E: codex-rs/core/src/tasks/review.rs:63][E: codex-rs/core/src/tasks/review.rs:64] |
| `ReviewRequest` | `target`、`user_facing_hint` | protocol review request 可指定审查 target 和 UI hint。[E: codex-rs/protocol/src/protocol.rs:3045][E: codex-rs/protocol/src/protocol.rs:3050] |
| `ReviewOutputEvent` | `findings`、`overall_correctness`、`overall_explanation`、`overall_confidence_score` | review output 是结构化 JSON 目标；Default 会给空 findings、空 correctness/explanation、0 confidence。[E: codex-rs/protocol/src/protocol.rs:3054][E: codex-rs/protocol/src/protocol.rs:3063] |
| `GuardianReviewSessionOutcome` | `Completed`、`PromptBuildFailed`、`SessionFailed`、`TimedOut`、`Aborted` | Guardian reviewer wait loop 用这些状态向 caller 汇报审查终态；源码没有独立 `Error` outcome variant。[E: codex-rs/core/src/guardian/review_session.rs:55][E: codex-rs/core/src/guardian/review_session.rs:57][E: codex-rs/core/src/guardian/review_session.rs:58][E: codex-rs/core/src/guardian/review_session.rs:59][E: codex-rs/core/src/guardian/review_session.rs:60][E: codex-rs/core/src/guardian/review_session.rs:61] |
| `GuardianReviewState` | `prior_review_count`、`last_reviewed_transcript_cursor`、`last_committed_fork_snapshot` | Guardian trunk 的 mutable state 保存审查次数、上次 transcript cursor 和已提交 fork snapshot；可复用 session 本身保存在外层 `GuardianReviewSessionState.trunk`。[E: codex-rs/core/src/guardian/review_session.rs:84][E: codex-rs/core/src/guardian/review_session.rs:85][E: codex-rs/core/src/guardian/review_session.rs:97][E: codex-rs/core/src/guardian/review_session.rs:98][E: codex-rs/core/src/guardian/review_session.rs:99][E: codex-rs/core/src/guardian/review_session.rs:100] |
| `GuardianReviewReuseKey` | model/provider/reasoning/tools/network 等 | reuse key 只包含会影响 spawned-session 行为的 settings，用于判断 trunk 是否仍可复用。[E: codex-rs/core/src/guardian/review_session.rs:130][E: codex-rs/core/src/guardian/review_session.rs:159] |

## 控制流：用户显式 review mode

1. `Op::Review { review_request }` 是 protocol 中的入口 operation；session handler 会调用 `review(...)`，`review(...)` resolve 成功后调用 `spawn_review_thread`。[E: codex-rs/protocol/src/protocol.rs:701][E: codex-rs/core/src/session/handlers.rs:1198][E: codex-rs/core/src/session/handlers.rs:1199][E: codex-rs/core/src/session/handlers.rs:982][E: codex-rs/core/src/session/handlers.rs:984]
2. `spawn_review_thread` 选择 `review_model`，没有配置时回退到当前 model；它会禁用 `Feature::WebSearchRequest`、`Feature::WebSearchCached` 并把 `WebSearchMode` 设为 disabled。[E: codex-rs/core/src/session/review.rs:12][E: codex-rs/core/src/session/review.rs:18][E: codex-rs/core/src/session/review.rs:23][E: codex-rs/core/src/session/review.rs:25]
3. review turn context 保留 parent 的 realtime/collaboration/approval/sandbox 等运行上下文，但把 developer/user instructions 置空；review prompt 作为 `UserInput::Text` 注入。[E: codex-rs/core/src/session/review.rs:100][E: codex-rs/core/src/session/review.rs:137][E: codex-rs/core/src/session/review.rs:145]
4. `spawn_review_thread` 创建 `ReviewTask` 后发送 `EnteredReviewMode`，事件 payload 里携带解析后的 target 和 UI hint。[E: codex-rs/core/src/session/review.rs:156][E: codex-rs/core/src/session/review.rs:159][E: codex-rs/core/src/session/review.rs:160][E: codex-rs/core/src/session/review.rs:161][E: codex-rs/core/src/session/review.rs:163]
5. `ReviewTask::run` 记录 telemetry 后调用 `start_review_conversation`；如果 cancellation token 没被取消，task 结束时调用 `exit_review_mode`。[E: codex-rs/core/src/tasks/review.rs:66][E: codex-rs/core/src/tasks/review.rs:72][E: codex-rs/core/src/tasks/review.rs:84]
6. `start_review_conversation` 复制 config，禁用 web search、`Feature::SpawnCsv` 和 `Feature::Collab`，把 base instructions 设置成 `REVIEW_PROMPT`，approval policy 设置为只允许 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:101][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:115][E: codex-rs/core/src/tasks/review.rs:116]
7. review 子线程通过 `run_codex_thread_one_shot` 以 `SubAgentSource::Review` 运行，且不传 schema/history。[E: codex-rs/core/src/tasks/review.rs:123][E: codex-rs/core/src/tasks/review.rs:131][E: codex-rs/core/src/tasks/review.rs:134]
8. `process_review_events` 抑制 assistant `ItemCompleted` 和 delta，把 `TurnComplete.last_agent_message` 当成最终 review 文本；`TurnAborted` 返回 `None`。[E: codex-rs/core/src/tasks/review.rs:140][E: codex-rs/core/src/tasks/review.rs:160][E: codex-rs/core/src/tasks/review.rs:164][E: codex-rs/core/src/tasks/review.rs:166][E: codex-rs/core/src/tasks/review.rs:174]
9. `parse_review_output_event` 先解析整个文本为 JSON；失败时提取第一段 `{...}` 再 parse；仍失败则把原文放进 `overall_explanation` fallback。[E: codex-rs/core/src/tasks/review.rs:190][E: codex-rs/core/src/tasks/review.rs:194][E: codex-rs/core/src/tasks/review.rs:198][E: codex-rs/core/src/tasks/review.rs:207]
10. `exit_review_mode` 根据成功/中断渲染模板，记录 user/assistant message，发送 `ExitedReviewMode`，并在事件发出后调用 `ensure_rollout_materialized()`。[E: codex-rs/core/src/tasks/review.rs:212][E: codex-rs/core/src/tasks/review.rs:231][E: codex-rs/core/src/tasks/review.rs:267][E: codex-rs/core/src/tasks/review.rs:279]

## 控制流：Guardian review session

1. `GuardianReviewSessionManager::run_review` 计算 deadline 和 reuse key；如果 trunk key 不匹配且锁可用，会把旧 trunk 从 state 取出并在锁外后台关闭。[E: codex-rs/core/src/guardian/review_session.rs:285][E: codex-rs/core/src/guardian/review_session.rs:289][E: codex-rs/core/src/guardian/review_session.rs:290][E: codex-rs/core/src/guardian/review_session.rs:302][E: codex-rs/core/src/guardian/review_session.rs:305][E: codex-rs/core/src/guardian/review_session.rs:344][E: codex-rs/core/src/guardian/review_session.rs:345]
2. 没有 trunk 时，manager 创建新 Guardian review session；key mismatch 或 trunk lock 不可得时，manager 改跑 ephemeral review。[E: codex-rs/core/src/guardian/review_session.rs:308][E: codex-rs/core/src/guardian/review_session.rs:314][E: codex-rs/core/src/guardian/review_session.rs:335][E: codex-rs/core/src/guardian/review_session.rs:357][E: codex-rs/core/src/guardian/review_session.rs:367][E: codex-rs/core/src/guardian/review_session.rs:370]
3. fork snapshot 通过 `load_rollout_items` 读取 rollout，并保存 `InitialHistory::Forked`、prior review count 和 output cursor。[E: codex-rs/core/src/guardian/review_session.rs:201][E: codex-rs/core/src/guardian/review_session.rs:213][E: codex-rs/core/src/guardian/review_session.rs:219]
4. `run_review_on_session` 首次 review 使用 Full prompt；已有 transcript cursor 时后续使用 Delta prompt；第二次 review 会加入 reminder。[E: codex-rs/core/src/guardian/review_session.rs:587][E: codex-rs/core/src/guardian/review_session.rs:600][E: codex-rs/core/src/guardian/review_session.rs:602][E: codex-rs/core/src/guardian/review_session.rs:603][E: codex-rs/core/src/guardian/review_session.rs:635]
5. Guardian review turn 提交 `Op::UserTurn`，强制 `approval_policy: AskForApproval::Never`、`sandbox_policy: SandboxPolicy::new_read_only_policy()`，并传入 final output schema/model/reasoning 设置。[E: codex-rs/core/src/guardian/review_session.rs:684][E: codex-rs/core/src/guardian/review_session.rs:687][E: codex-rs/core/src/guardian/review_session.rs:691][E: codex-rs/core/src/guardian/review_session.rs:693][E: codex-rs/core/src/guardian/review_session.rs:694][E: codex-rs/core/src/guardian/review_session.rs:695][E: codex-rs/core/src/guardian/review_session.rs:698]
6. `wait_for_guardian_review` 在 timeout/abort 时 interrupt 并 drain；`TurnComplete` 返回 `Completed(Ok(...))` 或携带 last error 的 `Completed(Err(...))`，`TurnAborted` 返回 `Aborted`。[E: codex-rs/core/src/guardian/review_session.rs:756][E: codex-rs/core/src/guardian/review_session.rs:768][E: codex-rs/core/src/guardian/review_session.rs:779][E: codex-rs/core/src/guardian/review_session.rs:789][E: codex-rs/core/src/guardian/review_session.rs:795][E: codex-rs/core/src/guardian/review_session.rs:801][E: codex-rs/core/src/guardian/review_session.rs:804]
7. `build_guardian_review_session_config` 克隆 parent config，但禁用 skill instructions、apps instructions、MCP servers、SpawnCsv、Collab、Hooks、Apps、Plugins 和 WebSearch；base instructions 来自 guardian policy config 或 default policy。[E: codex-rs/core/src/guardian/review_session.rs:821][E: codex-rs/core/src/guardian/review_session.rs:830][E: codex-rs/core/src/guardian/review_session.rs:831][E: codex-rs/core/src/guardian/review_session.rs:836][E: codex-rs/core/src/guardian/review_session.rs:842][E: codex-rs/core/src/guardian/review_session.rs:844][E: codex-rs/core/src/guardian/review_session.rs:864][E: codex-rs/core/src/guardian/review_session.rs:870]

## 输出格式与展示

- `format_location` 始终使用 `path:start-end`，让 finding location 能被纯文本 UI 消费。[E: codex-rs/core/src/review_format.rs:7][E: codex-rs/core/src/review_format.rs:11]
- `format_review_findings_block` 负责 heading、location、body 渲染；空 output 的 fallback 不在该函数里，而在 `render_review_output_text` 中判断 sections 为空时返回。[E: codex-rs/core/src/review_format.rs:23][E: codex-rs/core/src/review_format.rs:31][E: codex-rs/core/src/review_format.rs:41][E: codex-rs/core/src/review_format.rs:52][E: codex-rs/core/src/review_format.rs:77][E: codex-rs/core/src/review_format.rs:78]
- `render_review_output_text` 把 overall explanation 和 findings block 组合；两者都空时返回 fallback。[E: codex-rs/core/src/review_format.rs:64][E: codex-rs/core/src/review_format.rs:73][E: codex-rs/core/src/review_format.rs:80]

## 设计动机与权衡

- 用户显式 review mode 禁用 web search、spawn CSV 和 collab，说明 reviewer 被设计为聚焦当前可见仓库/上下文，而不是自行扩张工作面。[E: codex-rs/core/src/tasks/review.rs:106][E: codex-rs/core/src/tasks/review.rs:111][I]
- review 子线程使用 `SubAgentSource::Review` 和 one-shot runner，把审查和主线程交互隔离，同时保留事件转发给 parent 的能力。[E: codex-rs/core/src/tasks/review.rs:131][E: codex-rs/core/src/tasks/review.rs:182][I]
- Guardian review session 通过 trunk reuse 降低重复 reviewer 启动成本，但在 key mismatch 或锁竞争时用 ephemeral review 保持主流程不被卡住。[E: codex-rs/core/src/guardian/review_session.rs:377][E: codex-rs/core/src/guardian/review_session.rs:494][I]

## Gotcha

- `process_review_events` 抑制了 assistant `ItemCompleted` 和 delta；消费端不应把显式 review 子线程当成普通 turn 的完整 streaming transcript。[E: codex-rs/core/src/tasks/review.rs:157][E: codex-rs/core/src/tasks/review.rs:164][I]
- `parse_review_output_event` 的 fallback 会把非 JSON reviewer 文本当作 `overall_explanation`，这意味着 “review completed” 不保证有 structured findings。[E: codex-rs/core/src/tasks/review.rs:207][E: codex-rs/protocol/src/protocol.rs:3063]
- Guardian review config 会清空 MCP servers 并禁用 plugins/apps/web-search；相对于显式 review mode，这条 Guardian 审查流的隔离面更宽。[E: codex-rs/core/src/guardian/review_session.rs:844][E: codex-rs/core/src/guardian/review_session.rs:864][E: codex-rs/core/src/guardian/review_session.rs:870][I]

## Sources

- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/review_format.rs`
- `codex-rs/core/src/guardian/review_session.rs`
- `codex-rs/core/src/session/review.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
- [Session lifecycle](session-lifecycle.md)
- [Approval Guardian](approval-guardian.md)
