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
updated: 7750465934
---

> `SessionTask` is the async workflow trait for session turns; implementations now receive `Arc<Session>` and `Arc<TurnContext>` directly, active-turn state holds at most one `RunningTask`, and current `TaskKind` is limited to `Regular`, `Review`, and `Compact`.[E: codex-rs/core/src/tasks/mod.rs:184][E: codex-rs/core/src/tasks/mod.rs:202][E: codex-rs/core/src/tasks/mod.rs:204][E: codex-rs/core/src/tasks/mod.rs:205][E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:67]

## 能回答的问题

- `SessionTask` 与 `AnySessionTask` 当前接口是什么?
- `Session::spawn_task` / `start_task` 如何创建 active task?
- `ActiveTurn` / `RunningTask` / `TurnState` 当前保存哪些状态?
- 当前 concrete task 实现有哪些?
- `/shell`、`compact`、`review`、`thread rollback` 分别如何接入 task/handler path?

## Core task contracts

`SessionTaskContext` 已被移除。`SessionTask::run` 直接取得 `Arc<Session>`、`Arc<TurnContext>`、`Vec<TurnInput>` 与 cancellation token；`abort` 同样直接取得 session 和 turn context。turn-scoped extension data 由 `TurnContext.extension_data` 持有。[E: codex-rs/core/src/tasks/mod.rs:202][E: codex-rs/core/src/tasks/mod.rs:204][E: codex-rs/core/src/tasks/mod.rs:205][E: codex-rs/core/src/tasks/mod.rs:206][E: codex-rs/core/src/tasks/mod.rs:207][E: codex-rs/core/src/tasks/mod.rs:215][E: codex-rs/core/src/tasks/mod.rs:217][E: codex-rs/core/src/tasks/mod.rs:218][E: codex-rs/core/src/session/turn_context.rs:138]

`SessionTask` requires `kind()`, `span_name()` and an RPITIT `run()` future with `Send`; it also provides `abort()` with a no-op `Send` future default. The interface is owned by a `Session` and executed on background Tokio tasks.[E: codex-rs/core/src/tasks/mod.rs:184][E: codex-rs/core/src/tasks/mod.rs:187][E: codex-rs/core/src/tasks/mod.rs:190][E: codex-rs/core/src/tasks/mod.rs:202][E: codex-rs/core/src/tasks/mod.rs:208][E: codex-rs/core/src/tasks/mod.rs:215][E: codex-rs/core/src/tasks/mod.rs:219]

`AnySessionTask` type-erases concrete `SessionTask` implementations into boxed futures for `run()` and `abort()` while preserving direct session/turn arguments；`RunningTask.task` stores `Arc<dyn AnySessionTask>`.[E: codex-rs/core/src/tasks/mod.rs:226][E: codex-rs/core/src/tasks/mod.rs:231][E: codex-rs/core/src/tasks/mod.rs:239][E: codex-rs/core/src/tasks/mod.rs:242][E: codex-rs/core/src/tasks/mod.rs:254][E: codex-rs/core/src/state/turn.rs:76]

## Active turn state

`ActiveTurn` has `task: Option<RunningTask>` and `turn_state: Arc<Mutex<TurnState>>`; this is a single active task slot, not the old map of multiple running session tasks.[E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:57][E: codex-rs/core/src/state/turn.rs:60][E: codex-rs/core/src/state/turn.rs:61]

`RunningTask` stores completion notification, task kind, erased task, cancellation token, abort-on-drop handle, turn context, optional agent execution guard, and E2E timer；extension data lives inside that `TurnContext`, not in a separate `RunningTask` field。[E: codex-rs/core/src/state/turn.rs:73][E: codex-rs/core/src/state/turn.rs:74][E: codex-rs/core/src/state/turn.rs:75][E: codex-rs/core/src/state/turn.rs:76][E: codex-rs/core/src/state/turn.rs:77][E: codex-rs/core/src/state/turn.rs:78][E: codex-rs/core/src/state/turn.rs:79][E: codex-rs/core/src/state/turn.rs:80][E: codex-rs/core/src/state/turn.rs:82][E: codex-rs/core/src/session/turn_context.rs:138]

`TurnState` stores pending approval/request-permissions/user-input/elicitation/dynamic-tool responders, pending input, mailbox delivery phase, granted permissions, strict auto-review state, tool-call count, memory-citation flag, and token usage at turn start.[E: codex-rs/core/src/state/turn.rs:87][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100]

`MailboxDeliveryPhase` is a small state machine: current-turn mail can join the running turn, late mail after visible terminal output remains queued for a later turn, and explicit same-turn work can reopen current-turn delivery.[E: codex-rs/core/src/state/turn.rs:48][E: codex-rs/core/src/state/turn.rs:51][E: codex-rs/core/src/state/turn.rs:54]

## Scheduling flow

`Session::spawn_task()` first aborts current work with `TurnAbortReason::Replaced`, clears connector selection, then delegates to `start_task()`.[E: codex-rs/core/src/tasks/mod.rs:275][E: codex-rs/core/src/tasks/mod.rs:276][E: codex-rs/core/src/tasks/mod.rs:282][E: codex-rs/core/src/tasks/mod.rs:283][E: codex-rs/core/src/tasks/mod.rs:322]

`start_task()` erases the task, records kind/span/timing/token usage, creates a cancellation token and done notifier, clears the guardian rejection circuit breaker for the turn, moves queued input into the turn state, and emits turn-start lifecycle callbacks.[E: codex-rs/core/src/tasks/mod.rs:288][E: codex-rs/core/src/tasks/mod.rs:295][E: codex-rs/core/src/tasks/mod.rs:296][E: codex-rs/core/src/tasks/mod.rs:297][E: codex-rs/core/src/tasks/mod.rs:298][E: codex-rs/core/src/tasks/mod.rs:306][E: codex-rs/core/src/tasks/mod.rs:308][E: codex-rs/core/src/tasks/mod.rs:305][E: codex-rs/core/src/tasks/mod.rs:353][E: codex-rs/core/src/tasks/mod.rs:330][E: codex-rs/core/src/tasks/mod.rs:331][E: codex-rs/core/src/tasks/mod.rs:334]

`start_task()` then spawns the task under a tracing span. After `run()` returns, it flushes rollout, emits a warning if flush failed, and calls `on_task_finished()` unless the task cancellation token was cancelled.[E: codex-rs/core/src/tasks/mod.rs:353][E: codex-rs/core/src/tasks/mod.rs:368][E: codex-rs/core/src/tasks/mod.rs:365][E: codex-rs/core/src/tasks/mod.rs:372][E: codex-rs/core/src/tasks/mod.rs:381][E: codex-rs/core/src/tasks/mod.rs:383][E: codex-rs/core/src/tasks/mod.rs:393]

The `RunningTask` inserted into `ActiveTurn` contains the spawned handle, task kind, cancellation token, turn context, agent execution guard and telemetry timer；turn extension data remains owned by the stored `TurnContext`。[E: codex-rs/core/src/tasks/mod.rs:402][E: codex-rs/core/src/tasks/mod.rs:405][E: codex-rs/core/src/tasks/mod.rs:406][E: codex-rs/core/src/tasks/mod.rs:407][E: codex-rs/core/src/tasks/mod.rs:408][E: codex-rs/core/src/tasks/mod.rs:409][E: codex-rs/core/src/tasks/mod.rs:410][E: codex-rs/core/src/tasks/mod.rs:412][E: codex-rs/core/src/tasks/mod.rs:413][E: codex-rs/core/src/tasks/mod.rs:414][E: codex-rs/core/src/tasks/mod.rs:416][E: codex-rs/core/src/session/turn_context.rs:138]

`on_task_finished()` detaches the handle, takes pending input, records memory/tool-call/token usage data, processes pending input through hooks, records turn token usage telemetry, and is the common finish path for spawned tasks.[E: codex-rs/core/src/tasks/mod.rs:550][E: codex-rs/core/src/tasks/mod.rs:553][E: codex-rs/core/src/tasks/mod.rs:583][E: codex-rs/core/src/tasks/mod.rs:584][E: codex-rs/core/src/tasks/mod.rs:591][E: codex-rs/core/src/tasks/mod.rs:595][E: codex-rs/core/src/tasks/mod.rs:603][E: codex-rs/core/src/tasks/mod.rs:605][E: codex-rs/core/src/tasks/mod.rs:642][E: codex-rs/core/src/tasks/mod.rs:661][E: codex-rs/core/src/tasks/mod.rs:698]

Turn lifecycle extension callbacks are emitted from `tasks/lifecycle.rs`: start sends `on_turn_start`, abort sends `on_turn_abort`, error sends `on_turn_error`, and idle checks call `on_thread_idle` only when no active turn or trigger-turn mailbox work remains.[E: codex-rs/core/src/tasks/lifecycle.rs:10][E: codex-rs/core/src/tasks/lifecycle.rs:81][E: codex-rs/core/src/tasks/lifecycle.rs:18][E: codex-rs/core/src/tasks/lifecycle.rs:42][E: codex-rs/core/src/tasks/lifecycle.rs:43][E: codex-rs/core/src/tasks/lifecycle.rs:49][E: codex-rs/core/src/tasks/lifecycle.rs:59][E: codex-rs/core/src/tasks/lifecycle.rs:64][E: codex-rs/core/src/tasks/lifecycle.rs:66][E: codex-rs/core/src/tasks/lifecycle.rs:76][E: codex-rs/core/src/tasks/lifecycle.rs:81][E: codex-rs/core/src/tasks/lifecycle.rs:83]

## Concrete tasks

| Task | Kind | Span | Current behavior |
|---|---|---|---|
| `RegularTask` | `Regular` | `session_task.turn` | Emits `TurnStarted` inline, consumes startup prewarm, loops `run_turn()` while the input queue still has pending input.[E: codex-rs/core/src/tasks/regular.rs:29][E: codex-rs/core/src/tasks/regular.rs:30][E: codex-rs/core/src/tasks/regular.rs:34][E: codex-rs/core/src/tasks/regular.rs:49][E: codex-rs/core/src/tasks/regular.rs:58][E: codex-rs/core/src/tasks/regular.rs:75][E: codex-rs/core/src/tasks/regular.rs:76][E: codex-rs/core/src/tasks/regular.rs:85] |
| `CompactTask` | `Compact` | `session_task.compact` | Selects remote v2, remote, or local compaction based on provider/features; local compaction synthesizes the compact prompt as user input.[E: codex-rs/core/src/tasks/compact.rs:18][E: codex-rs/core/src/tasks/compact.rs:19][E: codex-rs/core/src/tasks/compact.rs:23][E: codex-rs/core/src/tasks/compact.rs:32][E: codex-rs/core/src/tasks/compact.rs:44][E: codex-rs/core/src/tasks/compact.rs:51][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:66][E: codex-rs/core/src/tasks/compact.rs:76] |
| `ReviewTask` | `Review` | `session_task.review` | Counts review telemetry, converts `TurnInput::UserInput` into review input, starts a sub-codex review conversation, processes review events, and exits review mode unless cancelled; abort also exits review mode.[E: codex-rs/core/src/tasks/review.rs:43][E: codex-rs/core/src/tasks/review.rs:44][E: codex-rs/core/src/tasks/review.rs:48][E: codex-rs/core/src/tasks/review.rs:52][E: codex-rs/core/src/tasks/review.rs:64][E: codex-rs/core/src/tasks/review.rs:73][E: codex-rs/core/src/tasks/review.rs:81][E: codex-rs/core/src/tasks/review.rs:84][E: codex-rs/core/src/tasks/review.rs:90][E: codex-rs/core/src/tasks/review.rs:91] |
| `UserShellCommandTask` | `Regular` | `session_task.user_shell` | Standalone `/shell` task calls `execute_user_shell_command`; auxiliary mode runs inside an already active turn and must not emit a second `TurnStarted`/`TurnComplete` pair.[E: codex-rs/core/src/tasks/user_shell.rs:49][E: codex-rs/core/src/tasks/user_shell.rs:52][E: codex-rs/core/src/tasks/user_shell.rs:55][E: codex-rs/core/src/tasks/user_shell.rs:69][E: codex-rs/core/src/tasks/user_shell.rs:70][E: codex-rs/core/src/tasks/user_shell.rs:74][E: codex-rs/core/src/tasks/user_shell.rs:85][E: codex-rs/core/src/tasks/user_shell.rs:90] |

## Handler entry points

`compact()` creates a default turn context and spawns `CompactTask`; `review()` creates a default turn, refreshes MCP if requested, resolves the review request, then spawns the review thread path.[E: codex-rs/core/src/session/handlers.rs:455][E: codex-rs/core/src/session/handlers.rs:456][E: codex-rs/core/src/session/handlers.rs:458][E: codex-rs/core/src/session/handlers.rs:680][E: codex-rs/core/src/session/handlers.rs:686][E: codex-rs/core/src/session/handlers.rs:705][E: codex-rs/core/src/session/handlers.rs:690][E: codex-rs/core/src/session/handlers.rs:692]

`run_user_shell_command()` executes as `ActiveTurnAuxiliary` when a turn is already active; otherwise it creates a default turn context and spawns `UserShellCommandTask` as a standalone task.[E: codex-rs/core/src/session/handlers.rs:304][E: codex-rs/core/src/session/handlers.rs:305][E: codex-rs/core/src/session/handlers.rs:309][E: codex-rs/core/src/session/handlers.rs:310][E: codex-rs/core/src/session/handlers.rs:315][E: codex-rs/core/src/session/handlers.rs:319][E: codex-rs/core/src/session/handlers.rs:322][E: codex-rs/core/src/session/handlers.rs:323][E: codex-rs/core/src/session/handlers.rs:326]

`thread_rollback()` is a handler path, not a `SessionTask`: it rejects invalid/active-turn cases, requires persisted thread history, flushes and reloads that history, and emits rollback errors or a `ThreadRolledBack` event.[E: codex-rs/core/src/session/handlers.rs:462][E: codex-rs/core/src/session/handlers.rs:463][E: codex-rs/core/src/session/handlers.rs:475][E: codex-rs/core/src/session/handlers.rs:488][E: codex-rs/core/src/session/handlers.rs:503][E: codex-rs/core/src/session/handlers.rs:515][E: codex-rs/core/src/session/handlers.rs:530]

## Gotchas

- Do not carry forward legacy ghost/undo task structs as current concrete tasks; current `TaskKind` exposes only `Regular`, `Review`, and `Compact`.[E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70]
- `ActiveTurn` now stores one optional task plus shared turn state; same-turn auxiliary work such as `/shell` uses handler/runtime paths rather than adding a second `RunningTask` entry.[E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/session/handlers.rs:305][E: codex-rs/core/src/session/handlers.rs:310]
- Regular turns emit `TurnStarted` inside `RegularTask::run`; user-shell standalone mode also emits `TurnStarted`, but auxiliary mode explicitly avoids duplicate lifecycle events.[E: codex-rs/core/src/tasks/regular.rs:49]

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
