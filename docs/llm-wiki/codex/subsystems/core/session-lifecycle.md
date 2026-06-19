---
id: subsys.core.session-lifecycle
title: Session 生命周期
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/state/service.rs]
symbols: [Codex, CodexSpawnArgs, Session, SessionConfiguration, SessionState, ActiveTurn, TurnState, SessionTask, submission_loop, Codex::spawn, Session::spawn_task, Session::start_task, Session::on_task_finished]
related: [spine.sq-eq-architecture, spine.turn-end-to-end, subsys.core.turn-engine, subsys.core.compaction, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 5670360009
---

> Session 生命周期是 Codex core 的 SQ/EQ 控制面：`Codex` 持有 submission sender、event receiver、agent status、共享 `Session` 和 session-loop termination future；`spawn_internal` 创建 submission/event channels、初始化 `Session`，再启动 `submission_loop` 从 submission queue 分发 `Op`。[E: codex-rs/core/src/session/mod.rs:385][E: codex-rs/core/src/session/mod.rs:386][E: codex-rs/core/src/session/mod.rs:387][E: codex-rs/core/src/session/mod.rs:390][E: codex-rs/core/src/session/mod.rs:393][E: codex-rs/core/src/session/mod.rs:522][E: codex-rs/core/src/session/mod.rs:642][E: codex-rs/core/src/session/mod.rs:677][E: codex-rs/core/src/session/handlers.rs:698]

## 能回答的问题

- `Codex::spawn` 如何建立 submission queue / event queue 和后台 session loop？
- `Session`、`SessionState`、`ActiveTurn`、`TurnState` 分别保存哪些生命周期状态？
- `Op::UserInput` 如何变成 active turn 里的 `RegularTask`，又何时只是 steer 当前 turn？
- regular/review/compact task 共享哪些 `SessionTask` 约定？
- shutdown 会清理哪些 session-scoped runtime？

## 职责边界

`Codex` 是调用方持有的 high-level handle；`Session` 是内部状态和服务容器，当前 running task 通过 `active_turn: Mutex<Option<ActiveTurn>>` 间接持有。[E: codex-rs/core/src/session/mod.rs:385][E: codex-rs/core/src/session/session.rs:26][E: codex-rs/core/src/session/session.rs:32][E: codex-rs/core/src/session/session.rs:42]

`SessionTask` 抽象 regular chat、review、compact 等后台任务：trait 要求 `kind`、`span_name`、`run`，并提供可覆盖的 `abort` cleanup hook。[E: codex-rs/core/src/tasks/mod.rs:210][E: codex-rs/core/src/tasks/mod.rs:213][E: codex-rs/core/src/tasks/mod.rs:216][E: codex-rs/core/src/tasks/mod.rs:226][E: codex-rs/core/src/tasks/mod.rs:239]

## 关键 crate/文件

- `codex-rs/core/src/session/mod.rs`: `Codex` handle、spawn、submit、event receive、history/context helpers。[E: codex-rs/core/src/session/mod.rs:385][E: codex-rs/core/src/session/mod.rs:466][E: codex-rs/core/src/session/mod.rs:694][E: codex-rs/core/src/session/mod.rs:767][E: codex-rs/core/src/session/mod.rs:3132]
- `codex-rs/core/src/session/session.rs`: `Session` 和 `SessionConfiguration` fields。[E: codex-rs/core/src/session/session.rs:26][E: codex-rs/core/src/session/session.rs:50]
- `codex-rs/core/src/session/handlers.rs`: `submission_loop` 与 per-op dispatch handler。[E: codex-rs/core/src/session/handlers.rs:698][E: codex-rs/core/src/session/handlers.rs:709]
- `codex-rs/core/src/tasks/mod.rs`: task spawn/start/abort/finish 共享逻辑。[E: codex-rs/core/src/tasks/mod.rs:307][E: codex-rs/core/src/tasks/mod.rs:319][E: codex-rs/core/src/tasks/mod.rs:486][E: codex-rs/core/src/tasks/mod.rs:557]
- `codex-rs/core/src/state/session.rs` 与 `codex-rs/core/src/state/turn.rs`: session-scoped state、active turn 和 turn-local waiters/queues。[E: codex-rs/core/src/state/session.rs:24][E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:87]

## 数据模型

`Session` 持有 thread/session identity、event sender、agent status sender、`SessionState` mutex、realtime conversation manager、`active_turn` mutex、`InputQueue`、guardian review session manager、`SessionServices` 和 internal sub-id counter。[E: codex-rs/core/src/session/session.rs:27][E: codex-rs/core/src/session/session.rs:29][E: codex-rs/core/src/session/session.rs:30][E: codex-rs/core/src/session/session.rs:32][E: codex-rs/core/src/session/session.rs:41][E: codex-rs/core/src/session/session.rs:42][E: codex-rs/core/src/session/session.rs:43][E: codex-rs/core/src/session/session.rs:44][E: codex-rs/core/src/session/session.rs:45][E: codex-rs/core/src/session/session.rs:46]

`SessionState` 保存 session configuration、`ContextManager` history、rate limit/server reasoning state、additional context、previous turn settings、auto-compact window、startup prewarm、active connector selection、pending session-start sources、granted permissions 和 next-turn-is-first flag。[E: codex-rs/core/src/state/session.rs:24][E: codex-rs/core/src/state/session.rs:25][E: codex-rs/core/src/state/session.rs:26][E: codex-rs/core/src/state/session.rs:27][E: codex-rs/core/src/state/session.rs:30][E: codex-rs/core/src/state/session.rs:34][E: codex-rs/core/src/state/session.rs:36][E: codex-rs/core/src/state/session.rs:38][E: codex-rs/core/src/state/session.rs:39][E: codex-rs/core/src/state/session.rs:40][E: codex-rs/core/src/state/session.rs:41][E: codex-rs/core/src/state/session.rs:42]

`ActiveTurn` 持有当前 `RunningTask` 与共享 `TurnState`；`TurnState` 保存 approval/request-permissions/user-input/elicitation/dynamic-tool waiters、pending input、mailbox delivery phase、turn-scoped granted permissions、tool call count、memory citation flag 和 turn-start token usage。[E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:87][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99]

`SessionServices` 是 long-lived managers 的集合，包括 MCP connection manager、unified exec manager、auth/model managers、telemetry、hooks、skills/plugins、extensions、network services、state DB、thread store、model client、code-mode service 和 turn environments。[E: codex-rs/core/src/state/service.rs:42][E: codex-rs/core/src/state/service.rs:44][E: codex-rs/core/src/state/service.rs:46][E: codex-rs/core/src/state/service.rs:52][E: codex-rs/core/src/state/service.rs:57][E: codex-rs/core/src/state/service.rs:58][E: codex-rs/core/src/state/service.rs:59][E: codex-rs/core/src/state/service.rs:64][E: codex-rs/core/src/state/service.rs:65][E: codex-rs/core/src/state/service.rs:67][E: codex-rs/core/src/state/service.rs:76][E: codex-rs/core/src/state/service.rs:78][E: codex-rs/core/src/state/service.rs:81][E: codex-rs/core/src/state/service.rs:82][E: codex-rs/core/src/state/service.rs:84]

## 控制流

1. `Codex::spawn` wraps `spawn_internal` in a `thread_spawn` span; `spawn_internal` destructures config/state args, builds bounded submission channel and unbounded event channel, resolves config/model/base instructions, creates `SessionConfiguration`, then awaits `Session::new`。[E: codex-rs/core/src/session/mod.rs:466][E: codex-rs/core/src/session/mod.rs:478][E: codex-rs/core/src/session/mod.rs:482][E: codex-rs/core/src/session/mod.rs:490][E: codex-rs/core/src/session/mod.rs:522][E: codex-rs/core/src/session/mod.rs:523][E: codex-rs/core/src/session/mod.rs:605][E: codex-rs/core/src/session/mod.rs:642]
2. spawn 后启动后台 `session_loop` task，内部运行 `submission_loop(session_for_loop, config, rx_sub)`；返回的 `Codex` 持有 tx/rx/session/status/termination future。[E: codex-rs/core/src/session/mod.rs:677][E: codex-rs/core/src/session/mod.rs:678][E: codex-rs/core/src/session/mod.rs:682][E: codex-rs/core/src/session/mod.rs:687]
3. `submit`/`submit_with_trace` 创建 `Submission` 并把它送入 `tx_sub`；`next_event` 从 `rx_event` 读取 user-visible `Event`。[E: codex-rs/core/src/session/mod.rs:694][E: codex-rs/core/src/session/mod.rs:703][E: codex-rs/core/src/session/mod.rs:704][E: codex-rs/core/src/session/mod.rs:738][E: codex-rs/core/src/session/mod.rs:767][E: codex-rs/core/src/session/mod.rs:769]
4. `submission_loop` 从 `rx_sub.recv()` 取 submission，按 `Op` match；`Op::UserInput` 进入 `user_input_or_turn`，`Op::Compact` 进入 compact handler，`Op::Review` 进入 review handler，`Op::Shutdown` 返回 should-exit。[E: codex-rs/core/src/session/handlers.rs:698][E: codex-rs/core/src/session/handlers.rs:705][E: codex-rs/core/src/session/handlers.rs:709][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:798][E: codex-rs/core/src/session/handlers.rs:825][E: codex-rs/core/src/session/handlers.rs:826]
5. `user_input_or_turn_inner` 为 user input 创建 `TurnContext`，先尝试 `steer_input`；如果没有 active turn，则 merge additional context、构造 `task_input`，再用 `RegularTask::new()` 调 `spawn_task`。[E: codex-rs/core/src/session/handlers.rs:183][E: codex-rs/core/src/session/handlers.rs:207][E: codex-rs/core/src/session/handlers.rs:220][E: codex-rs/core/src/session/handlers.rs:233][E: codex-rs/core/src/session/handlers.rs:245][E: codex-rs/core/src/session/handlers.rs:249][E: codex-rs/core/src/session/handlers.rs:260][E: codex-rs/core/src/session/handlers.rs:263]
6. `spawn_task` 先 abort 当前 tasks、清空 connector selection，再调用 `start_task`；`start_task` 创建 cancellation token/done notify，迁移 pending input 到 turn state，发 turn-start lifecycle，并 tokio-spawn task 的 `run`。[E: codex-rs/core/src/tasks/mod.rs:307][E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:315][E: codex-rs/core/src/tasks/mod.rs:316][E: codex-rs/core/src/tasks/mod.rs:338][E: codex-rs/core/src/tasks/mod.rs:347][E: codex-rs/core/src/tasks/mod.rs:355][E: codex-rs/core/src/tasks/mod.rs:358][E: codex-rs/core/src/tasks/mod.rs:395][E: codex-rs/core/src/tasks/mod.rs:398]
7. task body 完成后，spawn wrapper flushes rollout；若未取消，则调用 `on_task_finished`，再 notify waiters。[E: codex-rs/core/src/tasks/mod.rs:407][E: codex-rs/core/src/tasks/mod.rs:408][E: codex-rs/core/src/tasks/mod.rs:420][E: codex-rs/core/src/tasks/mod.rs:422][E: codex-rs/core/src/tasks/mod.rs:425]
8. `on_task_finished` 取消 git enrichment、从 active turn 取出 task handle、读 pending input/turn stats；如果仍有 pending input，它会逐项 inspect，并把未停止的 pending input 记录回 conversation/rollout 相关路径，而不是重新入队。[E: codex-rs/core/src/tasks/mod.rs:557][E: codex-rs/core/src/tasks/mod.rs:562][E: codex-rs/core/src/tasks/mod.rs:566][E: codex-rs/core/src/tasks/mod.rs:577][E: codex-rs/core/src/tasks/mod.rs:589][E: codex-rs/core/src/tasks/mod.rs:591][E: codex-rs/core/src/tasks/mod.rs:601]
9. mailbox-triggered pending work 可在 session idle 时启动 synthetic regular turn：`maybe_start_turn_for_pending_work_with_sub_id` 要求有 trigger-turn mailbox item 且当前没有 active turn，然后用 empty input start `RegularTask`。[E: codex-rs/core/src/tasks/mod.rs:453][E: codex-rs/core/src/tasks/mod.rs:467][E: codex-rs/core/src/tasks/mod.rs:472][E: codex-rs/core/src/tasks/mod.rs:479][E: codex-rs/core/src/tasks/mod.rs:482]
10. shutdown runtime 会 abort startup prewarm、abort active tasks、shutdown realtime conversation、terminate unified exec processes、shutdown code mode、MCP manager 和 guardian review session；`shutdown` 随后发送 `ShutdownComplete`。[E: codex-rs/core/src/session/handlers.rs:583][E: codex-rs/core/src/session/handlers.rs:584][E: codex-rs/core/src/session/handlers.rs:587][E: codex-rs/core/src/session/handlers.rs:588][E: codex-rs/core/src/session/handlers.rs:589][E: codex-rs/core/src/session/handlers.rs:593][E: codex-rs/core/src/session/handlers.rs:596][E: codex-rs/core/src/session/handlers.rs:601][E: codex-rs/core/src/session/handlers.rs:615][E: codex-rs/core/src/session/handlers.rs:650]

## Task 类型

`RegularTask` 的 `kind()` 返回 `TaskKind::Regular`，`run` 发送 `TurnStarted` 并循环调用 `run_turn`。[E: codex-rs/core/src/tasks/regular.rs:27][E: codex-rs/core/src/tasks/regular.rs:28][E: codex-rs/core/src/tasks/regular.rs:49][E: codex-rs/core/src/tasks/regular.rs:72]

`CompactTask` 的 `kind()` 返回 `TaskKind::Compact`；`run` 根据 provider/feature 在 remote v2、remote 和 local compaction 间选择，local path 会合成 compact prompt user input。[E: codex-rs/core/src/tasks/compact.rs:15][E: codex-rs/core/src/tasks/compact.rs:16][E: codex-rs/core/src/tasks/compact.rs:32][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:43][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:68]

`ReviewTask` 从 `TurnInput` 提取 user input，启动 review sub-conversation；review 子 agent config 会关闭 web search、spawn csv、collab 和 multi-agent v2，并设置 review prompt 与 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:64][E: codex-rs/core/src/tasks/review.rs:73][E: codex-rs/core/src/tasks/review.rs:105][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:112][E: codex-rs/core/src/tasks/review.rs:113][E: codex-rs/core/src/tasks/review.rs:116][E: codex-rs/core/src/tasks/review.rs:117]

## 设计动机与权衡

`Codex` 暴露 queue-pair API，`Session` 持有 mutable state/services，`submission_loop` 统一分发 ops；这让调用方只需要 submit/read events，但内部 task lifecycle 仍能集中控制 abort、pending input、rollout flush 和 shutdown。[E: codex-rs/core/src/session/mod.rs:385][E: codex-rs/core/src/session/mod.rs:694][E: codex-rs/core/src/session/mod.rs:767][E: codex-rs/core/src/session/handlers.rs:698][E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:408][I]

`spawn_task` 启动任何新 task 前都会 abort active tasks，体现了 session 以 `active_turn` 承载当前 task 的约束；但 active turn 内的 `steer_input` 和 pending-input loop 允许当前 task 吸收追加输入。[E: codex-rs/core/src/session/session.rs:42][E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/session/handlers.rs:220][E: codex-rs/core/src/tasks/regular.rs:83][I]

## gotcha

- `Codex::submit` 只返回 submission id；用户可见结果来自 `next_event`。[E: codex-rs/core/src/session/mod.rs:694][E: codex-rs/core/src/session/mod.rs:710][E: codex-rs/core/src/session/mod.rs:767]
- `Op::UserInput` 不总是启动新 task；active turn 存在时可被 `steer_input` 接住。[E: codex-rs/core/src/session/handlers.rs:220][E: codex-rs/core/src/session/handlers.rs:233]
- `shutdown_and_wait` 是提交 `Op::Shutdown` 后等待 session-loop termination，不是直接同步调用 runtime teardown。[E: codex-rs/core/src/session/mod.rs:756][E: codex-rs/core/src/session/mod.rs:758][E: codex-rs/core/src/session/mod.rs:763]

## Sources

- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/tasks/review.rs`
- `codex-rs/core/src/state/session.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/state/service.rs`

## 相关

- [SQ/EQ 架构](../../spine/sq-eq-architecture.md) — submission queue 与 event queue 的 T0 视角。
- [Turn 引擎](turn-engine.md) — `RegularTask` 内部的 sampling loop。
- [Compaction](compaction.md) — `CompactTask` 如何替换 history。
- [Unified-exec 运行时](unified-exec.md) — session shutdown 如何清理 background terminals。
