---
id: ref.session-tasks
title: Session task 类型与调度索引
kind: reference
tier: T3
source: [codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/tasks/undo.rs, codex-rs/core/src/tasks/ghost_snapshot.rs, codex-rs/core/src/tasks/user_shell.rs, codex-rs/core/src/state/turn.rs]
symbols: [SessionTask, AnySessionTask, SessionTaskContext, RegularTask, CompactTask, ReviewTask, UndoTask, GhostSnapshotTask, UserShellCommandTask, ActiveTurn, RunningTask, TaskKind, TurnState]
related: [subsys.core.turn-engine, subsys.core.session-lifecycle, subsys.core.ghost-undo, subsys.core.review-mode]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `SessionTask` 是 codex-core 内部驱动一个 session turn/workflow 的 async trait；源码注释说明 implementations encapsulate specific Codex workflow，并通过 `kind()`、`span_name()`、`run()` 和 optional `abort()` 接入 `Session::spawn_task` / `Session::start_task` 调度路径。[E: codex-rs/core/src/tasks/mod.rs:136][E: codex-rs/core/src/tasks/mod.rs:138][E: codex-rs/core/src/tasks/mod.rs:139][E: codex-rs/core/src/tasks/mod.rs:144][E: codex-rs/core/src/tasks/mod.rs:147][E: codex-rs/core/src/tasks/mod.rs:150][E: codex-rs/core/src/tasks/mod.rs:160][E: codex-rs/core/src/tasks/mod.rs:173][E: codex-rs/core/src/tasks/mod.rs:242][E: codex-rs/core/src/tasks/mod.rs:253]

## 能回答的问题

- `SessionTask` trait 要求 task 实现哪些方法?
- `Session::spawn_task` 如何替换当前 task 并启动新 task?
- `TurnComplete` 和 `TurnAborted` event 在 task 生命周期中由哪里统一发出?
- `RegularTask`、`CompactTask`、`ReviewTask`、`UndoTask`、`GhostSnapshotTask`、`UserShellCommandTask` 的职责和 span name 是什么?
- `ActiveTurn` / `RunningTask` / `TurnState` 保存了哪些 per-turn 状态?

## 核心调度类型表

| Symbol | 签名/变体 | 字段/方法 | 语义 | 定义处 |
|---|---|---|---|---|
| `SessionTaskContext` | `struct SessionTaskContext { session: Arc<Session> }` | `clone_session()`, `auth_manager()`, `models_manager()` | 对 task runner 暴露 `Session` 的受控子集。[E: codex-rs/core/src/tasks/mod.rs:112][E: codex-rs/core/src/tasks/mod.rs:114][E: codex-rs/core/src/tasks/mod.rs:115][E: codex-rs/core/src/tasks/mod.rs:123][E: codex-rs/core/src/tasks/mod.rs:127][E: codex-rs/core/src/tasks/mod.rs:131] | `tasks/mod.rs` |
| `SessionTask` | trait | `kind`, `span_name`, `run`, `abort` | task workflow 的核心 trait；`run` 返回 optional final agent message，`abort` 默认 no-op。[E: codex-rs/core/src/tasks/mod.rs:144][E: codex-rs/core/src/tasks/mod.rs:147][E: codex-rs/core/src/tasks/mod.rs:150][E: codex-rs/core/src/tasks/mod.rs:158][E: codex-rs/core/src/tasks/mod.rs:159][E: codex-rs/core/src/tasks/mod.rs:160][E: codex-rs/core/src/tasks/mod.rs:166][E: codex-rs/core/src/tasks/mod.rs:170][E: codex-rs/core/src/tasks/mod.rs:173][E: codex-rs/core/src/tasks/mod.rs:178] | `tasks/mod.rs` |
| `AnySessionTask` | trait object adapter | boxed `run`, boxed `abort` | 把 generic `SessionTask` erase 成 `Arc<dyn AnySessionTask>`，`RunningTask.task` 字段存储 `Arc<dyn AnySessionTask>`。[E: codex-rs/core/src/tasks/mod.rs:184][E: codex-rs/core/src/tasks/mod.rs:189][E: codex-rs/core/src/tasks/mod.rs:195][E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/tasks/mod.rs:201][E: codex-rs/core/src/tasks/mod.rs:204][E: codex-rs/core/src/state/turn.rs:74] | `tasks/mod.rs` |
| `ActiveTurn` | struct | `tasks: IndexMap<String, RunningTask>`, `turn_state` | 当前 running turn 的 task 集合和 mutable per-turn state。[E: codex-rs/core/src/state/turn.rs:29][E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:31] | `state/turn.rs` |
| `TaskKind` | enum | `Regular`, `Review`, `Compact` | task 粗分类；`SessionTask::kind` 注释说明 session 用该分类 surface telemetry 和 UI。[E: codex-rs/core/src/tasks/mod.rs:145][E: codex-rs/core/src/tasks/mod.rs:146][E: codex-rs/core/src/tasks/mod.rs:147][E: codex-rs/core/src/state/turn.rs:65][E: codex-rs/core/src/state/turn.rs:66][E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:68] | `state/turn.rs` |
| `RunningTask` | struct | `done`, `kind`, `task`, `cancellation_token`, `handle`, `turn_context`, `_timer` | 已启动 task 的 runtime handle、取消 token、turn context 和 lifecycle timer。[E: codex-rs/core/src/state/turn.rs:71][E: codex-rs/core/src/state/turn.rs:72][E: codex-rs/core/src/state/turn.rs:73][E: codex-rs/core/src/state/turn.rs:74][E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:79] | `state/turn.rs` |
| `TurnState` | struct | pending approvals/permissions/user-input/elicitations/dynamic-tools/input, mailbox phase, grants, counters, memory flag, token usage | 单个 turn 的 mutable state，包含等待用户/工具回调的 oneshot sender map、pending model input、mailbox delivery phase 与 memory citation flag。[E: codex-rs/core/src/state/turn.rs:100][E: codex-rs/core/src/state/turn.rs:101][E: codex-rs/core/src/state/turn.rs:102][E: codex-rs/core/src/state/turn.rs:103][E: codex-rs/core/src/state/turn.rs:104][E: codex-rs/core/src/state/turn.rs:105][E: codex-rs/core/src/state/turn.rs:106][E: codex-rs/core/src/state/turn.rs:107][E: codex-rs/core/src/state/turn.rs:108][E: codex-rs/core/src/state/turn.rs:109][E: codex-rs/core/src/state/turn.rs:110][E: codex-rs/core/src/state/turn.rs:111] | `state/turn.rs` |

## Session::spawn_task / start_task 控制流

1. `Session::spawn_task` 先 `abort_all_tasks(TurnAbortReason::Replaced)`，再 `clear_connector_selection()`，最后调用 `start_task()` 启动新 task。[E: codex-rs/core/src/tasks/mod.rs:242][E: codex-rs/core/src/tasks/mod.rs:248][E: codex-rs/core/src/tasks/mod.rs:249][E: codex-rs/core/src/tasks/mod.rs:250]
2. `start_task()` 将 concrete task 包装成 `Arc<dyn AnySessionTask>`，读取 `kind()` 与 `span_name()`，记录 turn start timing 和 turn start token usage。[E: codex-rs/core/src/tasks/mod.rs:259][E: codex-rs/core/src/tasks/mod.rs:260][E: codex-rs/core/src/tasks/mod.rs:261][E: codex-rs/core/src/tasks/mod.rs:263][E: codex-rs/core/src/tasks/mod.rs:264][E: codex-rs/core/src/tasks/mod.rs:265][E: codex-rs/core/src/tasks/mod.rs:267]
3. `start_task()` 把 queued next-turn response items 与 mailbox pending input 推入 `TurnState.pending_input`；这些 pending input 在后续 model request 中被消费属于调度含义推断。[E: codex-rs/core/src/tasks/mod.rs:272][E: codex-rs/core/src/tasks/mod.rs:273][E: codex-rs/core/src/tasks/mod.rs:283][E: codex-rs/core/src/tasks/mod.rs:284][E: codex-rs/core/src/tasks/mod.rs:286][E: codex-rs/core/src/tasks/mod.rs:287][I]
4. `start_task()` 创建 task-owned tracing span，并通过 `tokio::spawn` 调用 `task_for_run.run(...)`；task 完成后 flush rollout，未取消时统一调用 `on_task_finished()`。[E: codex-rs/core/src/tasks/mod.rs:301][E: codex-rs/core/src/tasks/mod.rs:308][E: codex-rs/core/src/tasks/mod.rs:312][E: codex-rs/core/src/tasks/mod.rs:320][E: codex-rs/core/src/tasks/mod.rs:332][E: codex-rs/core/src/tasks/mod.rs:334]
5. `start_task()` 把 `RunningTask` 放入 `ActiveTurn`，其中包括 `AbortOnDropHandle`、`CancellationToken`、`TaskKind` 和 `TurnContext`。[E: codex-rs/core/src/tasks/mod.rs:345][E: codex-rs/core/src/tasks/mod.rs:347][E: codex-rs/core/src/tasks/mod.rs:348][E: codex-rs/core/src/tasks/mod.rs:350][E: codex-rs/core/src/tasks/mod.rs:351][E: codex-rs/core/src/tasks/mod.rs:354]

## finish / abort 控制流

1. `on_task_finished()` 从 `ActiveTurn` 移除当前 `sub_id` 对应 task，`ActiveTurn::remove_task()` 在 `tasks.is_empty()` 时返回 true，调度层据此清空 active turn。[E: codex-rs/core/src/tasks/mod.rs:427][E: codex-rs/core/src/tasks/mod.rs:430][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/tasks/mod.rs:435]
2. `on_task_finished()` 取出 pending input，经过 hook inspection 后记录为 pending input 或 additional contexts。[E: codex-rs/core/src/tasks/mod.rs:442][E: codex-rs/core/src/tasks/mod.rs:444][E: codex-rs/core/src/tasks/mod.rs:451][E: codex-rs/core/src/tasks/mod.rs:453][E: codex-rs/core/src/tasks/mod.rs:458]
3. `on_task_finished()` 根据 turn start token usage 计算 current turn token usage，并发送 `EventMsg::TurnComplete`，payload 包含 `turn_id`、`last_agent_message`、`completed_at`、`duration_ms`。[E: codex-rs/core/src/tasks/mod.rs:498][E: codex-rs/core/src/tasks/mod.rs:499][E: codex-rs/core/src/tasks/mod.rs:500][E: codex-rs/core/src/tasks/mod.rs:501][E: codex-rs/core/src/tasks/mod.rs:506][E: codex-rs/core/src/tasks/mod.rs:507][E: codex-rs/core/src/tasks/mod.rs:512][E: codex-rs/core/src/tasks/mod.rs:513][E: codex-rs/core/src/tasks/mod.rs:559][E: codex-rs/core/src/tasks/mod.rs:560][E: codex-rs/core/src/tasks/mod.rs:561][E: codex-rs/core/src/tasks/mod.rs:562][E: codex-rs/core/src/tasks/mod.rs:563][E: codex-rs/core/src/tasks/mod.rs:565]
4. `abort_all_tasks()` drain active tasks 并调用 `handle_task_abort()`；`Interrupted` reason 会在 abort 后尝试启动 pending work。[E: codex-rs/core/src/tasks/mod.rs:399][E: codex-rs/core/src/tasks/mod.rs:401][E: codex-rs/core/src/tasks/mod.rs:402][E: codex-rs/core/src/tasks/mod.rs:408][E: codex-rs/core/src/tasks/mod.rs:409]
5. `handle_task_abort()` 取消 task token，等待最多 `GRACEFULL_INTERRUPTION_TIMEOUT_MS`，abort handle，调用 task-specific `abort()`，最后发送 `EventMsg::TurnAborted`。[E: codex-rs/core/src/tasks/mod.rs:604][E: codex-rs/core/src/tasks/mod.rs:610][E: codex-rs/core/src/tasks/mod.rs:613][E: codex-rs/core/src/tasks/mod.rs:618][E: codex-rs/core/src/tasks/mod.rs:621][E: codex-rs/core/src/tasks/mod.rs:622][E: codex-rs/core/src/tasks/mod.rs:645][E: codex-rs/core/src/tasks/mod.rs:651]

## Concrete SessionTask 实现表

| Task | `TaskKind` | `span_name` | run/abort 行为 | 定义处 |
|---|---|---|---|---|
| `RegularTask` | `Regular` | `session_task.turn` | 先 inline 发送 `TurnStarted`，再消费 startup prewarm，循环调用 `run_turn()`，直到没有 pending input。[E: codex-rs/core/src/tasks/regular.rs:19][E: codex-rs/core/src/tasks/regular.rs:29][E: codex-rs/core/src/tasks/regular.rs:33][E: codex-rs/core/src/tasks/regular.rs:45][E: codex-rs/core/src/tasks/regular.rs:47][E: codex-rs/core/src/tasks/regular.rs:53][E: codex-rs/core/src/tasks/regular.rs:55][E: codex-rs/core/src/tasks/regular.rs:56][E: codex-rs/core/src/tasks/regular.rs:57][E: codex-rs/core/src/tasks/regular.rs:67][E: codex-rs/core/src/tasks/regular.rs:68][E: codex-rs/core/src/tasks/regular.rs:77] | `regular.rs` |
| `CompactTask` | `Compact` | `session_task.compact` | 根据 provider info 选择 remote compact 或 local compact，并记录 `codex.task.compact` telemetry type。[E: codex-rs/core/src/tasks/compact.rs:11][E: codex-rs/core/src/tasks/compact.rs:15][E: codex-rs/core/src/tasks/compact.rs:19][E: codex-rs/core/src/tasks/compact.rs:30][E: codex-rs/core/src/tasks/compact.rs:31][E: codex-rs/core/src/tasks/compact.rs:34][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:38][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:43] | `compact.rs` |
| `ReviewTask` | `Review` | `session_task.review` | 启动 sub-codex review conversation，处理 receiver events，未取消时调用 `exit_review_mode()`；abort 也调用 `exit_review_mode(None)`。[E: codex-rs/core/src/tasks/review.rs:42][E: codex-rs/core/src/tasks/review.rs:52][E: codex-rs/core/src/tasks/review.rs:56][E: codex-rs/core/src/tasks/review.rs:72][E: codex-rs/core/src/tasks/review.rs:73][E: codex-rs/core/src/tasks/review.rs:81][E: codex-rs/core/src/tasks/review.rs:84][E: codex-rs/core/src/tasks/review.rs:85][E: codex-rs/core/src/tasks/review.rs:90][E: codex-rs/core/src/tasks/review.rs:91] | `review.rs` |
| `UndoTask` | `Regular` | `session_task.undo` | 发送 `UndoStarted`，在 history 中倒序查找 `ResponseItem::GhostSnapshot`，找到后用 blocking task restore ghost commit；取消或找不到 snapshot 会发失败的 `UndoCompleted`。[E: codex-rs/core/src/tasks/undo.rs:19][E: codex-rs/core/src/tasks/undo.rs:29][E: codex-rs/core/src/tasks/undo.rs:33][E: codex-rs/core/src/tasks/undo.rs:49][E: codex-rs/core/src/tasks/undo.rs:51][E: codex-rs/core/src/tasks/undo.rs:57][E: codex-rs/core/src/tasks/undo.rs:60][E: codex-rs/core/src/tasks/undo.rs:61][E: codex-rs/core/src/tasks/undo.rs:62][E: codex-rs/core/src/tasks/undo.rs:71][E: codex-rs/core/src/tasks/undo.rs:72][E: codex-rs/core/src/tasks/undo.rs:76][E: codex-rs/core/src/tasks/undo.rs:80][E: codex-rs/core/src/tasks/undo.rs:82][E: codex-rs/core/src/tasks/undo.rs:88][E: codex-rs/core/src/tasks/undo.rs:89][E: codex-rs/core/src/tasks/undo.rs:97][E: codex-rs/core/src/tasks/undo.rs:99] | `undo.rs` |
| `GhostSnapshotTask` | `Regular` | `session_task.ghost_snapshot` | 异步启动 ghost snapshot；超过 `SNAPSHOT_WARNING_THRESHOLD` 会 warning；实际 git snapshot 在 blocking pool 中执行并记录 `ResponseItem::GhostSnapshot`。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:22][E: codex-rs/core/src/tasks/ghost_snapshot.rs:26][E: codex-rs/core/src/tasks/ghost_snapshot.rs:30][E: codex-rs/core/src/tasks/ghost_snapshot.rs:34][E: codex-rs/core/src/tasks/ghost_snapshot.rs:44][E: codex-rs/core/src/tasks/ghost_snapshot.rs:59][E: codex-rs/core/src/tasks/ghost_snapshot.rs:63][E: codex-rs/core/src/tasks/ghost_snapshot.rs:64][E: codex-rs/core/src/tasks/ghost_snapshot.rs:85][E: codex-rs/core/src/tasks/ghost_snapshot.rs:88][E: codex-rs/core/src/tasks/ghost_snapshot.rs:111] | `ghost_snapshot.rs` |
| `UserShellCommandTask` | `Regular` | `session_task.user_shell` | 执行用户 shell command；`StandaloneTurn` mode 会发送 `TurnStarted`，`ActiveTurnAuxiliary` mode 不发送第二组 turn lifecycle events。[E: codex-rs/core/src/tasks/user_shell.rs:44][E: codex-rs/core/src/tasks/user_shell.rs:45][E: codex-rs/core/src/tasks/user_shell.rs:48][E: codex-rs/core/src/tasks/user_shell.rs:49][E: codex-rs/core/src/tasks/user_shell.rs:54][E: codex-rs/core/src/tasks/user_shell.rs:55][E: codex-rs/core/src/tasks/user_shell.rs:66][E: codex-rs/core/src/tasks/user_shell.rs:70][E: codex-rs/core/src/tasks/user_shell.rs:80][E: codex-rs/core/src/tasks/user_shell.rs:104][E: codex-rs/core/src/tasks/user_shell.rs:105][E: codex-rs/core/src/tasks/user_shell.rs:106][E: codex-rs/core/src/tasks/user_shell.rs:107][E: codex-rs/core/src/tasks/user_shell.rs:112][E: codex-rs/core/src/tasks/user_shell.rs:118][E: codex-rs/core/src/tasks/user_shell.rs:193] | `user_shell.rs` |

## 设计动机速记

- `SessionTask` trait 保持小接口，调度层统一负责 timing、telemetry timer、rollout flush、completion event 和 active-turn 清理；“具体 task 只负责 workflow 自身”是从接口分层和调度代码得出的设计推断。[E: codex-rs/core/src/tasks/mod.rs:141][E: codex-rs/core/src/tasks/mod.rs:142][E: codex-rs/core/src/tasks/mod.rs:144][E: codex-rs/core/src/tasks/mod.rs:263][E: codex-rs/core/src/tasks/mod.rs:341][E: codex-rs/core/src/tasks/mod.rs:343][E: codex-rs/core/src/tasks/mod.rs:320][E: codex-rs/core/src/tasks/mod.rs:333][E: codex-rs/core/src/tasks/mod.rs:334][E: codex-rs/core/src/tasks/mod.rs:430][E: codex-rs/core/src/tasks/mod.rs:435][E: codex-rs/core/src/tasks/mod.rs:559][I]
- `AnySessionTask` 的存在是为了把不同 concrete task 放进同一个 `RunningTask.task: Arc<dyn AnySessionTask>` 字段。[E: codex-rs/core/src/tasks/mod.rs:204][E: codex-rs/core/src/tasks/mod.rs:259][E: codex-rs/core/src/state/turn.rs:74][I]
- `UserShellCommandMode::ActiveTurnAuxiliary` 明确避免同一 active turn 出现第二组 `TurnStarted`/`TurnComplete`，这是 user shell auxiliary execution 与 standalone lifecycle 的关键差异。[E: codex-rs/core/src/tasks/user_shell.rs:48][E: codex-rs/core/src/tasks/user_shell.rs:49][E: codex-rs/core/src/tasks/user_shell.rs:104][E: codex-rs/core/src/tasks/user_shell.rs:105][E: codex-rs/core/src/tasks/user_shell.rs:106][E: codex-rs/core/src/tasks/user_shell.rs:107]

## Sources

- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/tasks/undo.rs`
- `codex-rs/core/src/tasks/ghost_snapshot.rs`
- `codex-rs/core/src/tasks/user_shell.rs`
- `codex-rs/core/src/state/turn.rs`

## 相关

- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [subsys.core.ghost-undo](../subsystems/core/ghost-undo.md)
- [subsys.core.review-mode](../subsystems/core/review-mode.md)
