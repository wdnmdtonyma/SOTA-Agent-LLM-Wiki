---
id: subsys.core.session-lifecycle
title: Session 生命周期
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/elicitation.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/state/service.rs]
symbols: [Session, SessionIo, SessionSpawnArgs, SessionConfiguration, SessionState, ActiveTurn, TurnState, ElicitationService, ElicitationRegistration, SessionTask, submission_loop, Session::spawn, Session::spawn_task, Session::start_task, Session::on_task_finished]
related: [spine.sq-eq-architecture, spine.turn-end-to-end, subsys.core.turn-engine, subsys.core.compaction, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Session lifecycle is the core SQ/EQ control plane: runtime state lives on `Session`, while `SessionIo` holds submission sender、event receiver、agent-status receiver and shared loop-termination future；`Session::spawn_internal` starts the background `submission_loop`。[E: codex-rs/core/src/session/mod.rs:387][E: codex-rs/core/src/session/mod.rs:392][E: codex-rs/core/src/session/mod.rs:399][E: codex-rs/core/src/session/mod.rs:469][E: codex-rs/core/src/session/mod.rs:721][E: codex-rs/core/src/session/mod.rs:726]

## 能回答的问题

- `Session::spawn` 如何建立 session、`SessionIo` queue endpoints 和后台 loop？
- `Session`、`SessionState`、`ActiveTurn`、`TurnState` 分别保存哪些生命周期状态？
- `Op::UserInput` 如何变成 active turn 里的 `RegularTask`，又何时只是 steer 当前 turn？
- regular/review/compact task 共享哪些 `SessionTask` 约定？
- shutdown 会清理哪些 session-scoped runtime？

## 职责边界

`Session` 是状态和服务容器，`SessionIo` 是可丢弃的 queue/lifecycle endpoints；public `CodexThread` 组合二者成为 bidirectional conduit。[E: codex-rs/core/src/session/mod.rs:387][E: codex-rs/core/src/session/mod.rs:392][E: codex-rs/core/src/codex_thread.rs:162][E: codex-rs/core/src/codex_thread.rs:187]

`SessionTask` 抽象 regular chat、review、compact 等后台任务：trait 要求 `kind`、`span_name`、`run`，并提供可覆盖的 `abort` cleanup hook。[E: codex-rs/core/src/tasks/mod.rs:214][E: codex-rs/core/src/tasks/mod.rs:217][E: codex-rs/core/src/tasks/mod.rs:220][E: codex-rs/core/src/tasks/mod.rs:232][E: codex-rs/core/src/tasks/mod.rs:245]

## 关键 crate/文件

- `codex-rs/core/src/session/mod.rs`: `SessionIo`、`SessionSpawnArgs`、`Session::spawn`、submit/event receive queue endpoints。[E: codex-rs/core/src/session/mod.rs:392][E: codex-rs/core/src/session/mod.rs:404][E: codex-rs/core/src/session/mod.rs:471][E: codex-rs/core/src/session/mod.rs:737][E: codex-rs/core/src/session/mod.rs:800]
- `codex-rs/core/src/session/session.rs`: `Session` 和 `SessionConfiguration` fields。[E: codex-rs/core/src/session/session.rs:28][E: codex-rs/core/src/session/session.rs:51]
- `codex-rs/core/src/session/handlers.rs`: `submission_loop` 与 per-op dispatch handler。[E: codex-rs/core/src/session/handlers.rs:710][E: codex-rs/core/src/session/handlers.rs:721]
- `codex-rs/core/src/tasks/mod.rs`: task spawn/start/finish 共享逻辑。[E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:325][E: codex-rs/core/src/tasks/mod.rs:459][E: codex-rs/core/src/tasks/mod.rs:568]
- `codex-rs/core/src/state/session.rs` 与 `codex-rs/core/src/state/turn.rs`: session-scoped state、active turn 和 turn-local waiters/queues。[E: codex-rs/core/src/state/session.rs:26][E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:87]

## 数据模型

`Session` 持有 thread/session identity、event sender、agent status sender、`SessionState` mutex、realtime conversation manager、`active_turn` mutex、`InputQueue`、guardian review session manager、`SessionServices` 和 internal sub-id counter。[E: codex-rs/core/src/session/session.rs:29][E: codex-rs/core/src/session/session.rs:30][E: codex-rs/core/src/session/session.rs:31][E: codex-rs/core/src/session/session.rs:32][E: codex-rs/core/src/session/session.rs:33][E: codex-rs/core/src/session/session.rs:42][E: codex-rs/core/src/session/session.rs:43][E: codex-rs/core/src/session/session.rs:44][E: codex-rs/core/src/session/session.rs:45][E: codex-rs/core/src/session/session.rs:46][E: codex-rs/core/src/session/session.rs:47]

`SessionState` 保存 session configuration、`ContextManager` history、rate limit/server reasoning state、additional context、previous turn settings、auto-compact window、startup prewarm、active connector selection、pending session-start sources、granted permissions 和 next-turn-is-first flag。[E: codex-rs/core/src/state/session.rs:27][E: codex-rs/core/src/state/session.rs:28][E: codex-rs/core/src/state/session.rs:29][E: codex-rs/core/src/state/session.rs:30][E: codex-rs/core/src/state/session.rs:32][E: codex-rs/core/src/state/session.rs:36][E: codex-rs/core/src/state/session.rs:38][E: codex-rs/core/src/state/session.rs:40][E: codex-rs/core/src/state/session.rs:42][E: codex-rs/core/src/state/session.rs:43][E: codex-rs/core/src/state/session.rs:44][E: codex-rs/core/src/state/session.rs:45]

`ActiveTurn` 持有当前 `RunningTask` 与共享 `TurnState`；`TurnState` 保存 approval/request-permissions/user-input/elicitation/dynamic-tool waiters、pending input、mailbox delivery phase、turn-scoped granted permissions、strict auto-review flag、tool call count、memory citation flag 和 turn-start token usage。[E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:87][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99]

`SessionServices` 是 long-lived managers 的集合，包括 MCP runtime、unified exec、elicitation counter/service、analytics、hooks、auth/model managers、skills/plugins、extensions、agent control 和 network proxy services。[E: codex-rs/core/src/state/service.rs:51][E: codex-rs/core/src/state/service.rs:53][E: codex-rs/core/src/state/service.rs:59][E: codex-rs/core/src/state/service.rs:65][E: codex-rs/core/src/state/service.rs:66][E: codex-rs/core/src/state/service.rs:70][E: codex-rs/core/src/state/service.rs:71][E: codex-rs/core/src/state/service.rs:72][E: codex-rs/core/src/state/service.rs:78][E: codex-rs/core/src/state/service.rs:82]

`ElicitationService` 用 reference-counted registration 统一表示 session 是否处于用户交互暂停：并发 MCP elicitation、approval 等 holder 全部释放后 watch 才回到 false。Unified exec 的 timeout deadline 与 code-mode result delivery 都订阅/等待这一状态，因此不再只针对某一种 out-of-band elicitation。[E: codex-rs/core/src/elicitation.rs:7][E: codex-rs/core/src/elicitation.rs:38][E: codex-rs/core/src/elicitation.rs:66][E: codex-rs/core/src/elicitation.rs:70][E: codex-rs/core/src/session/mod.rs:1084]

## 控制流

1. `Session::spawn` wraps `spawn_internal` in a `thread_spawn` span；`spawn_internal` destructures `SessionSpawnArgs` and creates bounded SQ/unbounded EQ。[E: codex-rs/core/src/session/mod.rs:469][E: codex-rs/core/src/session/mod.rs:483][E: codex-rs/core/src/session/mod.rs:487][E: codex-rs/core/src/session/mod.rs:495][E: codex-rs/core/src/session/mod.rs:533]
2. spawn 后启动后台 `session_loop` task，内部运行 `submission_loop(session_for_loop, config, rx_sub)`；返回 `(Arc<Session>, SessionIo)`，后者持有 tx/rx/status/termination endpoints。[E: codex-rs/core/src/session/mod.rs:721][E: codex-rs/core/src/session/mod.rs:726][E: codex-rs/core/src/session/mod.rs:733]
3. `submit`/`submit_with_trace` 创建 `Submission` 并把它送入 `tx_sub`；`next_event` 从 `rx_event` 读取 user-visible `Event`。[E: codex-rs/core/src/session/mod.rs:748][E: codex-rs/core/src/session/mod.rs:749][E: codex-rs/core/src/session/mod.rs:755][E: codex-rs/core/src/session/mod.rs:782][E: codex-rs/core/src/session/mod.rs:805][E: codex-rs/core/src/session/mod.rs:802]
4. `submission_loop` 从 `rx_sub.recv()` 取 submission，按 `Op` match；`Op::Review` 进入 review handler，`Op::Shutdown` 返回 should-exit。[E: codex-rs/core/src/session/handlers.rs:710][E: codex-rs/core/src/session/handlers.rs:717][E: codex-rs/core/src/session/handlers.rs:721][E: codex-rs/core/src/session/handlers.rs:837][E: codex-rs/core/src/session/handlers.rs:838][E: codex-rs/core/src/session/handlers.rs:839]
5. `user_input_or_turn_inner` 为 user input 创建 `TurnContext`，先尝试 `steer_input`；如果没有 active turn，则 merge additional context、构造 `task_input`，再用 `RegularTask::new()` 调 `spawn_task`。[E: codex-rs/core/src/session/handlers.rs:192][E: codex-rs/core/src/session/handlers.rs:216][E: codex-rs/core/src/session/handlers.rs:229][E: codex-rs/core/src/session/handlers.rs:242][E: codex-rs/core/src/session/handlers.rs:256][E: codex-rs/core/src/session/handlers.rs:258][E: codex-rs/core/src/session/handlers.rs:269][E: codex-rs/core/src/session/handlers.rs:272]
6. `spawn_task` aborts current tasks, clears connector selection, then calls `start_task`; `start_task` creates cancellation token/done notify, migrates pending input into turn state, emits turn-start lifecycle, and tokio-spawns task `run`.[E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:320][E: codex-rs/core/src/tasks/mod.rs:321][E: codex-rs/core/src/tasks/mod.rs:322][E: codex-rs/core/src/tasks/mod.rs:344][E: codex-rs/core/src/tasks/mod.rs:345][E: codex-rs/core/src/tasks/mod.rs:353][E: codex-rs/core/src/tasks/mod.rs:362][E: codex-rs/core/src/tasks/mod.rs:364][E: codex-rs/core/src/tasks/mod.rs:402][E: codex-rs/core/src/tasks/mod.rs:406]
7. task body 完成后，spawn wrapper flushes rollout；若未取消，则调用 `on_task_finished`。[E: codex-rs/core/src/tasks/mod.rs:415][E: codex-rs/core/src/tasks/mod.rs:427][E: codex-rs/core/src/tasks/mod.rs:429]
8. `on_task_finished` 取消 git enrichment、从 active turn 取出 task handle、读 pending input/turn stats。[E: codex-rs/core/src/tasks/mod.rs:568][E: codex-rs/core/src/tasks/mod.rs:581][E: codex-rs/core/src/tasks/mod.rs:586][E: codex-rs/core/src/tasks/mod.rs:588][E: codex-rs/core/src/tasks/mod.rs:596][E: codex-rs/core/src/tasks/mod.rs:600]
9. mailbox-triggered pending work 可在 session idle 时启动 synthetic regular turn：`maybe_start_turn_for_pending_work_with_sub_id` 要求有 trigger-turn mailbox item 且当前没有 active turn，然后用 empty input start `RegularTask`。[E: codex-rs/core/src/tasks/mod.rs:474][E: codex-rs/core/src/tasks/mod.rs:478][E: codex-rs/core/src/tasks/mod.rs:484][E: codex-rs/core/src/tasks/mod.rs:487][E: codex-rs/core/src/tasks/mod.rs:490][E: codex-rs/core/src/tasks/mod.rs:493]
10. shutdown runtime 会 abort startup prewarm、abort active tasks、shutdown realtime conversation、terminate unified exec processes、shutdown code mode、MCP manager 和 guardian review session；`shutdown` also shuts down live thread persistence before session end.[E: codex-rs/core/src/session/handlers.rs:597][E: codex-rs/core/src/session/handlers.rs:599][E: codex-rs/core/src/session/handlers.rs:602][E: codex-rs/core/src/session/handlers.rs:601][E: codex-rs/core/src/session/handlers.rs:605][E: codex-rs/core/src/session/handlers.rs:607][E: codex-rs/core/src/session/handlers.rs:603][E: codex-rs/core/src/session/handlers.rs:611][E: codex-rs/core/src/session/handlers.rs:627][E: codex-rs/core/src/session/handlers.rs:646][E: codex-rs/core/src/session/handlers.rs:647]

## Task 类型

`RegularTask` 的 `kind()` 返回 `TaskKind::Regular`，`run` 发送 `TurnStarted` 并循环调用 `run_turn`。[E: codex-rs/core/src/tasks/regular.rs:28][E: codex-rs/core/src/tasks/regular.rs:30][E: codex-rs/core/src/tasks/regular.rs:50][E: codex-rs/core/src/tasks/regular.rs:57][E: codex-rs/core/src/tasks/regular.rs:73][E: codex-rs/core/src/tasks/regular.rs:74]

`CompactTask` 的 `kind()` 返回 `TaskKind::Compact`；`run` 根据 provider/feature 在 token-budget, remote v2, remote and local compaction paths 间选择，local path 会合成 compact prompt user input。[E: codex-rs/core/src/tasks/compact.rs:18][E: codex-rs/core/src/tasks/compact.rs:20][E: codex-rs/core/src/tasks/compact.rs:35][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:40][E: codex-rs/core/src/tasks/compact.rs:44][E: codex-rs/core/src/tasks/compact.rs:51][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:66]

`ReviewTask` 从 `TurnInput` 提取 user input，启动 review sub-conversation；review 子 agent config 会关闭 web search、spawn csv、collab 和 multi-agent v2，并设置 review prompt 与 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:53][E: codex-rs/core/src/tasks/review.rs:66][E: codex-rs/core/src/tasks/review.rs:75][E: codex-rs/core/src/tasks/review.rs:109][E: codex-rs/core/src/tasks/review.rs:113][E: codex-rs/core/src/tasks/review.rs:114][E: codex-rs/core/src/tasks/review.rs:115][E: codex-rs/core/src/tasks/review.rs:118][E: codex-rs/core/src/tasks/review.rs:119]

## 设计动机与权衡

`SessionIo` 暴露 queue-pair API，`Session` 持 mutable state/services，`submission_loop` 统一分发 ops；分离 endpoints 还允许所有 submission sender 被 drop 后终止 loop。[E: codex-rs/core/src/session/mod.rs:387][E: codex-rs/core/src/session/mod.rs:389][E: codex-rs/core/src/session/mod.rs:737][E: codex-rs/core/src/session/handlers.rs:710][I]

`spawn_task` 启动任何新 task 前都会 abort active tasks，体现了 session 以 `active_turn` 承载当前 task 的约束；但 active turn 内的 `steer_input` 和 pending-input loop 允许当前 task 吸收追加输入。[E: codex-rs/core/src/session/session.rs:43][E: codex-rs/core/src/tasks/mod.rs:320][E: codex-rs/core/src/session/handlers.rs:229][E: codex-rs/core/src/tasks/regular.rs:83][I]

## gotcha

- `SessionIo::submit` 只返回 submission id；用户可见结果来自 `next_event`。[E: codex-rs/core/src/session/mod.rs:737][E: codex-rs/core/src/session/mod.rs:756][E: codex-rs/core/src/session/mod.rs:800]
- `Op::UserInput` 不总是启动新 task；active turn 存在时可被 `steer_input` 接住。[E: codex-rs/core/src/session/handlers.rs:229][E: codex-rs/core/src/session/handlers.rs:242]
- `shutdown_and_wait` 是提交 `Op::Shutdown` 后等待 session-loop termination，不是直接同步调用 runtime teardown。[E: codex-rs/core/src/session/mod.rs:794][E: codex-rs/core/src/session/mod.rs:791][E: codex-rs/core/src/session/mod.rs:796]

## Sources

- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/elicitation.rs`
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
