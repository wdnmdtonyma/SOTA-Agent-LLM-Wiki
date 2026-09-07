---
id: ref.session-tasks
title: Session task 类型与调度索引
kind: reference
tier: T3
source: [codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/tasks/user_shell.rs, codex-rs/core/src/tasks/lifecycle.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/turn_context.rs]
symbols: [SessionTask, AnySessionTask, UserShellCommandTask, RunningTask, TaskKind]
related: [subsys.core.turn-engine, subsys.core.session-lifecycle, subsys.core.ghost-undo, subsys.core.review-mode]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `SessionTask` is the async workflow trait for session turns; implementations now receive `Arc<Session>` and `Arc<TurnContext>` directly, active-turn state holds at most one `RunningTask`, and current `TaskKind` is limited to `Regular`, `Review`, and `Compact`.[E: codex-rs/core/src/tasks/mod.rs:179][E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:69]

## 能回答的问题

- `SessionTask` 与 `AnySessionTask` 当前接口是什么?
- `Session::spawn_task` / `start_task` 如何创建 active task?
- `ActiveTurn` / `RunningTask` / `TurnState` 当前保存哪些状态?
- 当前 concrete task 实现有哪些?
- `/shell`、`compact`、`review`、`thread rollback` 分别如何接入 task/handler path?

## Core task contracts

`SessionTaskContext` 已被移除。`SessionTask::run` 直接取得 `Arc<Session>`、`Arc<TurnContext>`、`Vec<TurnInput>` 与 cancellation token；`abort` 同样直接取得 session 和 turn context。turn-scoped extension data 由 `TurnContext.extension_data` 持有。[E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/tasks/mod.rs:200][E: codex-rs/core/src/tasks/mod.rs:210][E: codex-rs/core/src/session/turn_context.rs:239]

`SessionTask` requires `kind()`, `span_name()` and an RPITIT `run()` future with `Send`; it also provides `abort()` with a no-op `Send` future default. The interface is owned by a `Session` and executed on background Tokio tasks.[E: codex-rs/core/src/tasks/mod.rs:179][E: codex-rs/core/src/tasks/mod.rs:182][E: codex-rs/core/src/tasks/mod.rs:185][E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/tasks/mod.rs:210]

`AnySessionTask` type-erases concrete `SessionTask` implementations into boxed futures for `run()` and `abort()` while preserving direct session/turn arguments；`RunningTask.task` stores `Arc<dyn AnySessionTask>`.[E: codex-rs/core/src/tasks/mod.rs:221][E: codex-rs/core/src/tasks/mod.rs:222][E: codex-rs/core/src/tasks/mod.rs:224][E: codex-rs/core/src/state/turn.rs:78]

## Active turn state

`ActiveTurn` has `task: Option<RunningTask>` and `turn_state: Arc<Mutex<TurnState>>`; this is a single active task slot, not the old map of multiple running session tasks.[E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:34][E: codex-rs/core/src/state/turn.rs:35]

`RunningTask` stores completion notification, task kind, erased task, cancellation token, abort-on-drop handle, turn context, optional agent execution guard, and E2E timer；extension data lives inside that `TurnContext`, not in a separate `RunningTask` field。[E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:78][E: codex-rs/core/src/state/turn.rs:79][E: codex-rs/core/src/state/turn.rs:80][E: codex-rs/core/src/state/turn.rs:81][E: codex-rs/core/src/state/turn.rs:82][E: codex-rs/core/src/state/turn.rs:85][E: codex-rs/core/src/session/turn_context.rs:239]

`TurnState` stores pending approval/request-permissions/user-input/elicitation/dynamic-tool responders, pending input, mailbox delivery phase, granted permissions, strict auto-review state, tool-call count, memory-citation flag, and token usage at turn start.[E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100][E: codex-rs/core/src/state/turn.rs:101][E: codex-rs/core/src/state/turn.rs:102][E: codex-rs/core/src/state/turn.rs:103]

`MailboxDeliveryPhase` is a small state machine: current-turn mail can join the running turn, late mail after visible terminal output remains queued for a later turn, and explicit same-turn work can reopen current-turn delivery.[E: codex-rs/core/src/state/turn.rs:50][E: codex-rs/core/src/state/turn.rs:53][E: codex-rs/core/src/state/turn.rs:56]

## Scheduling flow

`Session::spawn_task()` first aborts current work with `TurnAbortReason::Replaced`, clears connector selection, then delegates to `start_task()`.[E: codex-rs/core/src/tasks/mod.rs:271][E: codex-rs/core/src/tasks/mod.rs:278][E: codex-rs/core/src/tasks/mod.rs:279][E: codex-rs/core/src/tasks/mod.rs:282]

`start_task()` erases the task, records kind/span/timing/token usage, creates a cancellation token and done notifier, clears the guardian rejection circuit breaker for the turn, moves queued input into the turn state, and emits turn-start lifecycle callbacks.[E: codex-rs/core/src/tasks/mod.rs:293][E: codex-rs/core/src/tasks/mod.rs:294][E: codex-rs/core/src/tasks/mod.rs:295][E: codex-rs/core/src/tasks/mod.rs:297][E: codex-rs/core/src/tasks/mod.rs:306][E: codex-rs/core/src/tasks/mod.rs:307][E: codex-rs/core/src/tasks/mod.rs:313][E: codex-rs/core/src/tasks/mod.rs:324][E: codex-rs/core/src/tasks/mod.rs:326]

`start_task()` then spawns the task under a tracing span. After `run()` returns, it flushes rollout, emits a warning if flush failed, and calls `on_task_finished()` unless the task cancellation token was cancelled.[E: codex-rs/core/src/tasks/mod.rs:360][E: codex-rs/core/src/tasks/mod.rs:363][E: codex-rs/core/src/tasks/mod.rs:373][E: codex-rs/core/src/tasks/mod.rs:375][E: codex-rs/core/src/tasks/mod.rs:385][E: codex-rs/core/src/tasks/mod.rs:387]

The `RunningTask` inserted into `ActiveTurn` contains the spawned handle, task kind, cancellation token, turn context, agent execution guard and telemetry timer；turn extension data remains owned by the stored `TurnContext`。[E: codex-rs/core/src/tasks/mod.rs:398][E: codex-rs/core/src/tasks/mod.rs:400][E: codex-rs/core/src/tasks/mod.rs:401][E: codex-rs/core/src/tasks/mod.rs:402][E: codex-rs/core/src/tasks/mod.rs:403][E: codex-rs/core/src/tasks/mod.rs:404][E: codex-rs/core/src/tasks/mod.rs:405][E: codex-rs/core/src/tasks/mod.rs:407][E: codex-rs/core/src/tasks/mod.rs:409][E: codex-rs/core/src/session/turn_context.rs:239]

`on_task_finished()` is the common finish path for spawned tasks.[E: codex-rs/core/src/tasks/mod.rs:588]

Turn lifecycle extension callbacks are emitted from `tasks/lifecycle.rs`: start sends `on_turn_start`, abort sends `on_turn_abort`, error sends `on_turn_error`, and idle checks call `on_thread_idle` only when no active turn or trigger-turn mailbox work remains.[E: codex-rs/core/src/tasks/lifecycle.rs:11][E: codex-rs/core/src/tasks/lifecycle.rs:19][E: codex-rs/core/src/tasks/lifecycle.rs:43][E: codex-rs/core/src/tasks/lifecycle.rs:55][E: codex-rs/core/src/tasks/lifecycle.rs:61][E: codex-rs/core/src/tasks/lifecycle.rs:70][E: codex-rs/core/src/tasks/lifecycle.rs:77][E: codex-rs/core/src/tasks/lifecycle.rs:87]

## Concrete tasks

| Task | Kind | Span | Current behavior |
|---|---|---|---|
| `RegularTask` | `Regular` | `session_task.turn` | Emits `TurnStarted` inline, consumes startup prewarm, loops `run_turn()` while the input queue still has pending input.[E: codex-rs/core/src/tasks/regular.rs:23][E: codex-rs/core/src/tasks/regular.rs:32][E: codex-rs/core/src/tasks/regular.rs:37][E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/regular.rs:60][E: codex-rs/core/src/tasks/regular.rs:78][E: codex-rs/core/src/tasks/regular.rs:79] |
| `CompactTask` | `Compact` | `session_task.compact` | Selects remote v2, remote, or local compaction based on provider/features; local compaction synthesizes the compact prompt as user input.[E: codex-rs/core/src/tasks/compact.rs:17][E: codex-rs/core/src/tasks/compact.rs:21][E: codex-rs/core/src/tasks/compact.rs:25][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:66][E: codex-rs/core/src/tasks/compact.rs:76] |
| `ReviewTask` | `Review` | `session_task.review` | Counts review telemetry, converts `TurnInput::UserInput` into review input, starts a sub-codex review conversation, processes review events, and exits review mode unless cancelled; abort also exits review mode.[E: codex-rs/core/src/tasks/review.rs:37][E: codex-rs/core/src/tasks/review.rs:47][E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:64][E: codex-rs/core/src/tasks/review.rs:69][E: codex-rs/core/src/tasks/review.rs:77][E: codex-rs/core/src/tasks/review.rs:85][E: codex-rs/core/src/tasks/review.rs:88] |
| `UserShellCommandTask` | `Regular` | `session_task.user_shell` | Standalone `/shell` task calls `execute_user_shell_command`; auxiliary mode runs inside an already active turn and must not emit a second `TurnStarted`/`TurnComplete` pair.[E: codex-rs/core/src/tasks/user_shell.rs:52][E: codex-rs/core/src/tasks/user_shell.rs:58][E: codex-rs/core/src/tasks/user_shell.rs:62][E: codex-rs/core/src/tasks/user_shell.rs:78][E: codex-rs/core/src/tasks/user_shell.rs:82][E: codex-rs/core/src/tasks/user_shell.rs:92][E: codex-rs/core/src/tasks/user_shell.rs:98] |

## Handler entry points

`compact()` creates a default turn context and spawns `CompactTask`; `review()` creates a default turn, resolves the review request, then calls `spawn_review_thread`.[E: codex-rs/core/src/session/handlers.rs:246][E: codex-rs/core/src/session/handlers.rs:251][E: codex-rs/core/src/session/handlers.rs:492][E: codex-rs/core/src/session/handlers.rs:506]

`run_user_shell_command()` executes as `ActiveTurnAuxiliary` when a turn is already active; otherwise it creates a default turn context and spawns `UserShellCommandTask` as a standalone task.[E: codex-rs/core/src/session/handlers.rs:98][E: codex-rs/core/src/session/handlers.rs:104][E: codex-rs/core/src/session/handlers.rs:115][E: codex-rs/core/src/session/handlers.rs:122]

`thread_rollback()` is a handler path, not a `SessionTask`: it rejects `num_turns == 0`, rejects rollback while a turn is active, requires persisted thread history, flushes and reloads that history, and emits rollback errors or a `ThreadRolledBack` event.[E: codex-rs/core/src/session/handlers.rs:254][E: codex-rs/core/src/session/handlers.rs:255]

## Gotchas

- Do not carry forward legacy ghost/undo task structs as current concrete tasks; current `TaskKind` exposes only `Regular`, `Review`, and `Compact`.[E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71][E: codex-rs/core/src/state/turn.rs:72]
- `ActiveTurn` now stores one optional task plus shared turn state; same-turn auxiliary work such as `/shell` uses handler/runtime paths rather than adding a second `RunningTask` entry.[E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/session/handlers.rs:104][E: codex-rs/core/src/session/handlers.rs:115]
- Regular turns emit `TurnStarted` inside `RegularTask::run`; user-shell standalone mode also emits `TurnStarted`, but auxiliary mode explicitly avoids duplicate lifecycle events.[E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/user_shell.rs:55][E: codex-rs/core/src/tasks/user_shell.rs:58]

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

## 相关

- [subsys.core.turn-engine](../subsystems/core/turn-engine.md)
- [subsys.core.session-lifecycle](../subsystems/core/session-lifecycle.md)
- [subsys.core.ghost-undo](../subsystems/core/ghost-undo.md)
- [subsys.core.review-mode](../subsystems/core/review-mode.md)
