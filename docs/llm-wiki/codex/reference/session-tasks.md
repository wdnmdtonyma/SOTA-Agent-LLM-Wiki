---
id: ref.session-tasks
title: Session task 类型与调度索引
kind: reference
tier: T3
source: [codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/tasks/user_shell.rs, codex-rs/core/src/tasks/lifecycle.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/protocol/src/protocol.rs]
symbols: [SessionTask, AnySessionTask, UserShellCommandTask, RunningTask, TaskKind]
related: [subsys.core.turn-engine, subsys.core.session-lifecycle, subsys.core.ghost-undo, subsys.core.review-mode]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `SessionTask` is the async workflow trait for session turns; implementations now receive `Arc<Session>` and `Arc<TurnContext>` directly, active-turn state holds at most one `RunningTask`, and current `TaskKind` is limited to `Regular`, `Review`, and `Compact`.[E: codex-rs/core/src/tasks/mod.rs:179][E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:68]

## 能回答的问题

- `SessionTask` 与 `AnySessionTask` 当前接口是什么?
- `Session::spawn_task` / `start_task` 如何创建 active task?
- `ActiveTurn` / `RunningTask` / `TurnState` 当前保存哪些状态?
- 当前 concrete task 实现有哪些?
- `/shell`、`compact`、`review` 分别如何接入 task/handler path？磁盘撤销走 `thread/revert`，不是 live `Op::ThreadRollback`。

## Core task contracts

`SessionTaskContext` 已被移除。`SessionTask::run` 直接取得 `Arc<Session>`、`Arc<TurnContext>`、`Vec<TurnInput>` 与 cancellation token；`abort` 同样直接取得 session 和 turn context。turn-scoped extension data 由 `TurnContext.extension_data` 持有。[E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/tasks/mod.rs:200][E: codex-rs/core/src/tasks/mod.rs:210][E: codex-rs/core/src/session/turn_context.rs:356]

`SessionTask` requires `kind()`, `span_name()` and an RPITIT `run()` future with `Send`; it also provides `abort()` with a no-op `Send` future default. The interface is owned by a `Session` and executed on background Tokio tasks.[E: codex-rs/core/src/tasks/mod.rs:179][E: codex-rs/core/src/tasks/mod.rs:182][E: codex-rs/core/src/tasks/mod.rs:185][E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/tasks/mod.rs:210]

`AnySessionTask` type-erases concrete `SessionTask` implementations into boxed futures for `run()` and `abort()` while preserving direct session/turn arguments；`RunningTask.task` stores `Arc<dyn AnySessionTask>`.[E: codex-rs/core/src/tasks/mod.rs:221][E: codex-rs/core/src/tasks/mod.rs:222][E: codex-rs/core/src/tasks/mod.rs:224][E: codex-rs/core/src/state/turn.rs:77]

## Active turn state

`ActiveTurn` has `task: Option<RunningTask>` and `turn_state: Arc<Mutex<TurnState>>`; this is a single active task slot, not the old map of multiple running session tasks.[E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:34]

`RunningTask` stores completion notification, task kind, erased task, cancellation token, abort-on-drop handle, turn context, optional agent execution guard, diagnostics gauge, and E2E timer；extension data lives inside that `TurnContext`, not in a separate `RunningTask` field。[E: codex-rs/core/src/state/turn.rs:74][E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:78][E: codex-rs/core/src/state/turn.rs:79][E: codex-rs/core/src/state/turn.rs:80][E: codex-rs/core/src/state/turn.rs:81][E: codex-rs/core/src/state/turn.rs:82][E: codex-rs/core/src/state/turn.rs:84][E: codex-rs/core/src/session/turn_context.rs:356]

`TurnState` stores pending approval (`pending_approvals`)/request-permissions/user-input/elicitation/dynamic-tool responders, pending input, mailbox delivery phase, granted permissions, strict auto-review state, tool-call count, memory-citation flag, token usage at turn start, per-model token usage, and optional last-known `StepContext`.[E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100][E: codex-rs/core/src/state/turn.rs:101][E: codex-rs/core/src/state/turn.rs:102][E: codex-rs/core/src/state/turn.rs:105]

`MailboxDeliveryPhase` is a small state machine: current-turn mail can join the running turn, late mail after visible terminal output remains queued for a later turn, and explicit same-turn work can reopen current-turn delivery.[E: codex-rs/core/src/state/turn.rs:49][E: codex-rs/core/src/state/turn.rs:52][E: codex-rs/core/src/state/turn.rs:55]

## Scheduling flow

`Session::spawn_task()` first aborts current work with `TurnAbortReason::Replaced`, clears connector selection, then delegates to `start_task()`.[E: codex-rs/core/src/tasks/mod.rs:271][E: codex-rs/core/src/tasks/mod.rs:277][E: codex-rs/core/src/tasks/mod.rs:278][E: codex-rs/core/src/tasks/mod.rs:279]

`start_task()` records kind/span/timing/token usage, creates a cancellation token and done notifier, drains mailbox input into the turn state, and emits `emit_turn_start_lifecycle`.[E: codex-rs/core/src/tasks/mod.rs:298][E: codex-rs/core/src/tasks/mod.rs:299][E: codex-rs/core/src/tasks/mod.rs:300][E: codex-rs/core/src/tasks/mod.rs:302][E: codex-rs/core/src/tasks/mod.rs:311][E: codex-rs/core/src/tasks/mod.rs:312][E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:326]

`start_task()` then spawns the task under a tracing span. After `run()` returns, it flushes rollout, emits a warning if flush failed, and calls `on_task_finished()` unless the task cancellation token was cancelled.[E: codex-rs/core/src/tasks/mod.rs:364][E: codex-rs/core/src/tasks/mod.rs:367][E: codex-rs/core/src/tasks/mod.rs:374][E: codex-rs/core/src/tasks/mod.rs:385][E: codex-rs/core/src/tasks/mod.rs:395][E: codex-rs/core/src/tasks/mod.rs:397]

The `RunningTask` inserted into `ActiveTurn` contains the spawned handle, task kind, cancellation token, turn context, agent execution guard, diagnostics gauge and telemetry timer；turn extension data remains owned by the stored `TurnContext`。[E: codex-rs/core/src/tasks/mod.rs:408][E: codex-rs/core/src/tasks/mod.rs:410][E: codex-rs/core/src/tasks/mod.rs:411][E: codex-rs/core/src/tasks/mod.rs:412][E: codex-rs/core/src/tasks/mod.rs:413][E: codex-rs/core/src/tasks/mod.rs:414][E: codex-rs/core/src/tasks/mod.rs:415][E: codex-rs/core/src/tasks/mod.rs:416][E: codex-rs/core/src/tasks/mod.rs:417][E: codex-rs/core/src/tasks/mod.rs:419][E: codex-rs/core/src/session/turn_context.rs:356]

`on_task_finished()` is the common finish path for spawned tasks.[E: codex-rs/core/src/tasks/mod.rs:629]

Turn lifecycle extension callbacks are emitted from `tasks/lifecycle.rs`: start sends `on_turn_start`, abort sends `on_turn_abort`, error sends `on_turn_error`, and idle checks call `on_thread_idle` only when no active turn or trigger-turn mailbox work remains.[E: codex-rs/core/src/tasks/lifecycle.rs:15][E: codex-rs/core/src/tasks/lifecycle.rs:34][E: codex-rs/core/src/tasks/lifecycle.rs:58][E: codex-rs/core/src/tasks/lifecycle.rs:70][E: codex-rs/core/src/tasks/lifecycle.rs:76][E: codex-rs/core/src/tasks/lifecycle.rs:85][E: codex-rs/core/src/tasks/lifecycle.rs:92][E: codex-rs/core/src/tasks/lifecycle.rs:102]

## Concrete tasks

| Task | Kind | Span | Current behavior |
|---|---|---|---|
| `RegularTask` | `Regular` | `session_task.turn` | Emits `TurnStarted` inline, consumes startup prewarm, loops `run_turn()` while the input queue still has pending input.[E: codex-rs/core/src/tasks/regular.rs:23][E: codex-rs/core/src/tasks/regular.rs:32][E: codex-rs/core/src/tasks/regular.rs:37][E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/regular.rs:79][E: codex-rs/core/src/tasks/regular.rs:104][E: codex-rs/core/src/tasks/regular.rs:105] |
| `CompactTask` | `Compact` | `session_task.compact` | If `Feature::TokenBudget` is enabled, runs `run_manual_compact_task` and returns; otherwise matches `RemoteCompactionSupport::V2` (`run_remote_compact_task`) vs `Unsupported` (local `run_compact_task` with a synthesized compact prompt as user input). There is no v1/remote-non-v2 arm。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:37][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:42][E: codex-rs/core/src/tasks/compact.rs:48][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:56][E: codex-rs/core/src/tasks/compact.rs:66] |
| `ReviewTask` | `Review` | `session_task.review` | Counts review telemetry, converts `TurnInput::UserInput` into review input, starts a sub-codex review conversation, processes review events, and exits review mode unless cancelled; abort also exits review mode.[E: codex-rs/core/src/tasks/review.rs:37][E: codex-rs/core/src/tasks/review.rs:47][E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:64][E: codex-rs/core/src/tasks/review.rs:69][E: codex-rs/core/src/tasks/review.rs:77][E: codex-rs/core/src/tasks/review.rs:85][E: codex-rs/core/src/tasks/review.rs:88] |
| `UserShellCommandTask` | `Regular` | `session_task.user_shell` | Standalone `/shell` task `run` calls `execute_user_shell_command` with `UserShellCommandMode::StandaloneTurn`; `ActiveTurnAuxiliary` runs inside an already active turn and must not emit a second `TurnStarted`/`TurnComplete` pair.[E: codex-rs/core/src/tasks/user_shell.rs:51][E: codex-rs/core/src/tasks/user_shell.rs:57][E: codex-rs/core/src/tasks/user_shell.rs:76][E: codex-rs/core/src/tasks/user_shell.rs:77][E: codex-rs/core/src/tasks/user_shell.rs:81][E: codex-rs/core/src/tasks/user_shell.rs:91][E: codex-rs/core/src/tasks/user_shell.rs:97] |

## Handler entry points

`compact()` creates a default turn context and spawns `CompactTask`; `review()` creates a default turn, resolves the review request, then calls `spawn_review_thread`.[E: codex-rs/core/src/session/handlers.rs:244][E: codex-rs/core/src/session/handlers.rs:251][E: codex-rs/core/src/session/handlers.rs:383][E: codex-rs/core/src/session/handlers.rs:397]

`run_user_shell_command()` executes as `ActiveTurnAuxiliary` when a turn is already active; otherwise it creates a default turn context and spawns `UserShellCommandTask` as a standalone task.[E: codex-rs/core/src/session/handlers.rs:96][E: codex-rs/core/src/session/handlers.rs:102][E: codex-rs/core/src/session/handlers.rs:113][E: codex-rs/core/src/session/handlers.rs:120]

`Op::ThreadRollback` 与 `thread_rollback()` handler 已删除。`handlers.rs` 在 compact 之后是 memory-mode persist / session shutdown / `review()`，没有 rollback 分派。[E: codex-rs/core/src/session/handlers.rs:244][E: codex-rs/core/src/session/handlers.rs:254][E: codex-rs/core/src/session/handlers.rs:338][E: codex-rs/core/src/session/handlers.rs:383] Paginated 磁盘撤销仍是 app-server `thread/revert`，不是 session task。[I]

`Op::InterruptIfNoPendingInput` 是 submission-side 条件中断，不是新的 `TaskKind`；`TaskKind` 仍只有 `Regular` / `Review` / `Compact`。[E: codex-rs/protocol/src/protocol.rs:597][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70]

## Gotchas

- Do not carry forward legacy ghost/undo task structs as current concrete tasks; current `TaskKind` exposes only `Regular`, `Review`, and `Compact`.[E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71]
- `ActiveTurn` now stores one optional task plus shared turn state; same-turn auxiliary work such as `/shell` uses handler/runtime paths rather than adding a second `RunningTask` entry.[E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/session/handlers.rs:102][E: codex-rs/core/src/session/handlers.rs:113]
- Regular turns emit `TurnStarted` inside `RegularTask::run`; user-shell standalone `run` passes `UserShellCommandMode::StandaloneTurn`, while `ActiveTurnAuxiliary` is the mode that must not emit a second `TurnStarted`/`TurnComplete` pair.[E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/user_shell.rs:57][E: codex-rs/core/src/tasks/user_shell.rs:97]

## Sources

- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/tasks/user_shell.rs`
- `codex-rs/core/src/tasks/lifecycle.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [subsys.core.ghost-undo](../subsystems/core/ghost-undo.md)
- [subsys.core.review-mode](../subsystems/core/review-mode.md)
