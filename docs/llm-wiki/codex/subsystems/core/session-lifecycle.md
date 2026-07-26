---
id: subsys.core.session-lifecycle
title: Session 生命周期
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/elicitation.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/state/service.rs]
symbols: [Session, SessionIo, SessionSpawnArgs, SessionConfiguration, SessionState, ActiveTurn, TurnState, ElicitationService, ElicitationRegistration, submission_loop, Session::spawn, Session::spawn_task, Session::start_task, Session::on_task_finished, CodexThread, ThreadManager]
related: [spine.sq-eq-architecture, spine.turn-end-to-end, subsys.core.turn-engine, subsys.core.compaction, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Session lifecycle is the core SQ/EQ control plane: runtime state lives on `Session`, while `SessionIo` holds submission sender、event receiver、agent-status receiver and shared loop-termination future；`Session::spawn_internal` starts the background `submission_loop`。[E: codex-rs/core/src/session/mod.rs:399][E: codex-rs/core/src/session/mod.rs:406][E: codex-rs/core/src/session/mod.rs:495][E: codex-rs/core/src/session/mod.rs:769][E: codex-rs/core/src/session/mod.rs:774]

## 能回答的问题

- `Session::spawn` 如何建立 session、`SessionIo` queue endpoints 和后台 loop？
- `Session`、`SessionState`、`ActiveTurn`、`TurnState` 分别保存哪些生命周期状态？
- `Op::UserInput` 如何变成 active turn 里的 `RegularTask`，又何时只是 steer 当前 turn？
- regular/review/compact task 共享哪些 `SessionTask` 约定？
- shutdown 会清理哪些 session-scoped runtime？

## 职责边界

`Session` 是状态和服务容器，`SessionIo` 是可丢弃的 queue/lifecycle endpoints；public `CodexThread` 组合二者成为 bidirectional conduit。[E: codex-rs/core/src/session/mod.rs:399][E: codex-rs/core/src/codex_thread.rs:182][E: codex-rs/core/src/codex_thread.rs:207]

`SessionTask` 抽象 regular chat、review、compact 等后台任务：trait 要求 `kind`、`span_name`、`run`，并提供可覆盖的 `abort` cleanup hook。[E: codex-rs/core/src/tasks/mod.rs:214][E: codex-rs/core/src/tasks/mod.rs:217][E: codex-rs/core/src/tasks/mod.rs:220][E: codex-rs/core/src/tasks/mod.rs:232][E: codex-rs/core/src/tasks/mod.rs:245]

## 关键 crate/文件

- `codex-rs/core/src/session/mod.rs`: `SessionIo`、`SessionSpawnArgs`、`Session::spawn`、submit/event receive queue endpoints。[E: codex-rs/core/src/session/mod.rs:399][E: codex-rs/core/src/session/mod.rs:426][E: codex-rs/core/src/session/mod.rs:497][E: codex-rs/core/src/session/mod.rs:785][E: codex-rs/core/src/session/mod.rs:848]
- `codex-rs/core/src/session/session.rs`: `Session` 和 `SessionConfiguration` fields。[E: codex-rs/core/src/session/session.rs:29][E: codex-rs/core/src/session/session.rs:62]
- `codex-rs/core/src/session/handlers.rs`: `submission_loop` 与 per-op dispatch handler。[E: codex-rs/core/src/session/handlers.rs:692][E: codex-rs/core/src/session/handlers.rs:703]
- `codex-rs/core/src/tasks/mod.rs`: task spawn/start/finish 共享逻辑。[E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:325][E: codex-rs/core/src/tasks/mod.rs:580]
- `codex-rs/core/src/state/session.rs` 与 `codex-rs/core/src/state/turn.rs`: session-scoped state、active turn 和 turn-local waiters/queues。[E: codex-rs/core/src/state/session.rs:26][E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:88]

## 数据模型

`Session` 持有 thread/session identity、event sender、agent status sender、`SessionState` mutex、realtime conversation manager、`active_turn` mutex、`InputQueue`、guardian review session manager、`SessionServices` 和 internal sub-id counter。[E: codex-rs/core/src/session/session.rs:30][E: codex-rs/core/src/session/session.rs:31][E: codex-rs/core/src/session/session.rs:32][E: codex-rs/core/src/session/session.rs:33][E: codex-rs/core/src/session/session.rs:34][E: codex-rs/core/src/session/session.rs:51][E: codex-rs/core/src/session/session.rs:52][E: codex-rs/core/src/session/session.rs:53][E: codex-rs/core/src/session/session.rs:54][E: codex-rs/core/src/session/session.rs:55][E: codex-rs/core/src/session/session.rs:58]

`SessionState` 保存 session configuration、`ContextManager` history、rate limit/server reasoning state、additional context、previous turn settings、auto-compact window、startup prewarm、active connector selection、pending session-start sources、granted permissions 和 next-turn-is-first flag。[E: codex-rs/core/src/state/session.rs:27][E: codex-rs/core/src/state/session.rs:28][E: codex-rs/core/src/state/session.rs:29][E: codex-rs/core/src/state/session.rs:30][E: codex-rs/core/src/state/session.rs:32][E: codex-rs/core/src/state/session.rs:36][E: codex-rs/core/src/state/session.rs:38][E: codex-rs/core/src/state/session.rs:40][E: codex-rs/core/src/state/session.rs:42][E: codex-rs/core/src/state/session.rs:43][E: codex-rs/core/src/state/session.rs:44][E: codex-rs/core/src/state/session.rs:45]

`ActiveTurn` 持有当前 `RunningTask` 与共享 `TurnState`；`TurnState` 保存 approval/request-permissions/user-input/elicitation/dynamic-tool waiters、pending input、mailbox delivery phase、turn-scoped granted permissions、strict auto-review flag、tool call count、memory citation flag 和 turn-start token usage。[E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100][E: codex-rs/core/src/state/turn.rs:101]

`SessionServices` 是 long-lived managers 的集合，包括 MCP runtime、unified exec、elicitation counter/service、analytics、hooks、auth/model managers、skills/plugins、extensions、agent control 和 network proxy services。[E: codex-rs/core/src/state/service.rs:43][E: codex-rs/core/src/state/service.rs:45][E: codex-rs/core/src/state/service.rs:46][E: codex-rs/core/src/state/service.rs:52][E: codex-rs/core/src/state/service.rs:53][E: codex-rs/core/src/state/service.rs:57][E: codex-rs/core/src/state/service.rs:58][E: codex-rs/core/src/state/service.rs:59][E: codex-rs/core/src/state/service.rs:64][E: codex-rs/core/src/state/service.rs:68]

`ElicitationService` 用 reference-counted registration 统一表示 session 是否处于用户交互暂停：并发 MCP elicitation、approval 等 holder 全部释放后 watch 才回到 false。Unified exec 的 timeout deadline 与 code-mode result delivery 都订阅/等待这一状态，因此不再只针对某一种 out-of-band elicitation。[E: codex-rs/core/src/elicitation.rs:66][E: codex-rs/core/src/elicitation.rs:70][E: codex-rs/core/src/session/mod.rs:1132]

## 控制流

1. `Session::spawn` wraps `spawn_internal` in a `thread_spawn` span；`spawn_internal` destructures `SessionSpawnArgs` and creates bounded SQ/unbounded EQ。[E: codex-rs/core/src/session/mod.rs:495][E: codex-rs/core/src/session/mod.rs:509][E: codex-rs/core/src/session/mod.rs:513][E: codex-rs/core/src/session/mod.rs:521][E: codex-rs/core/src/session/mod.rs:562]
2. spawn 后启动后台 `session_loop` task，内部运行 `submission_loop(session_for_loop, config, rx_sub)`；返回 `(Arc<Session>, SessionIo)`，后者持有 tx/rx/status/termination endpoints。[E: codex-rs/core/src/session/mod.rs:769][E: codex-rs/core/src/session/mod.rs:774][E: codex-rs/core/src/session/mod.rs:781]
3. `submit`/`submit_with_trace` 创建 `Submission` 并把它送入 `tx_sub`；`next_event` 从 `rx_event` 读取 user-visible `Event`。[E: codex-rs/core/src/session/mod.rs:796][E: codex-rs/core/src/session/mod.rs:797][E: codex-rs/core/src/session/mod.rs:803][E: codex-rs/core/src/session/mod.rs:830][E: codex-rs/core/src/session/mod.rs:853][E: codex-rs/core/src/session/mod.rs:850]
4. `submission_loop` 从 `rx_sub.recv()` 取 submission，按 `Op` match；`Op::Review` 进入 review handler，`Op::Shutdown` 返回 should-exit。[E: codex-rs/core/src/session/handlers.rs:692][E: codex-rs/core/src/session/handlers.rs:699][E: codex-rs/core/src/session/handlers.rs:703][E: codex-rs/core/src/session/handlers.rs:819][E: codex-rs/core/src/session/handlers.rs:820][E: codex-rs/core/src/session/handlers.rs:821]
5. `user_input_or_turn_inner` 为 user input 创建 `TurnContext`，先尝试 `steer_input`；如果没有 active turn，则 merge additional context、构造 `task_input`，再用 `RegularTask::new()` 调 `spawn_task`。[E: codex-rs/core/src/session/handlers.rs:176][E: codex-rs/core/src/session/handlers.rs:200][E: codex-rs/core/src/session/handlers.rs:213][E: codex-rs/core/src/session/handlers.rs:226][E: codex-rs/core/src/session/handlers.rs:235][E: codex-rs/core/src/session/handlers.rs:237][E: codex-rs/core/src/session/handlers.rs:248][E: codex-rs/core/src/session/handlers.rs:251]
6. `spawn_task` aborts current tasks, clears connector selection, then calls `start_task`; `start_task` creates cancellation token/done notify, migrates pending input into turn state, emits turn-start lifecycle, and tokio-spawns task `run`.[E: codex-rs/core/src/tasks/mod.rs:314][E: codex-rs/core/src/tasks/mod.rs:320][E: codex-rs/core/src/tasks/mod.rs:321][E: codex-rs/core/src/tasks/mod.rs:322][E: codex-rs/core/src/tasks/mod.rs:344][E: codex-rs/core/src/tasks/mod.rs:345][E: codex-rs/core/src/tasks/mod.rs:353][E: codex-rs/core/src/tasks/mod.rs:362][E: codex-rs/core/src/tasks/mod.rs:364][E: codex-rs/core/src/tasks/mod.rs:402][E: codex-rs/core/src/tasks/mod.rs:406]
7. task body 完成后，spawn wrapper flushes rollout；若未取消，则调用 `on_task_finished`。[E: codex-rs/core/src/tasks/mod.rs:415][E: codex-rs/core/src/tasks/mod.rs:427][E: codex-rs/core/src/tasks/mod.rs:429]
8. `on_task_finished` 取消 git enrichment、从 active turn 取出 task handle、读 pending input/turn stats。[E: codex-rs/core/src/tasks/mod.rs:580][E: codex-rs/core/src/tasks/mod.rs:595][E: codex-rs/core/src/tasks/mod.rs:600][E: codex-rs/core/src/tasks/mod.rs:602][E: codex-rs/core/src/tasks/mod.rs:610][E: codex-rs/core/src/tasks/mod.rs:614]
9. mailbox-triggered pending work 可在 session idle 时启动 synthetic regular turn：`maybe_start_turn_for_pending_work_with_sub_id` 要求有 trigger-turn mailbox item 且当前没有 active turn，然后用 empty input start `RegularTask`。[E: codex-rs/core/src/tasks/mod.rs:483][E: codex-rs/core/src/tasks/mod.rs:488][E: codex-rs/core/src/tasks/mod.rs:496][E: codex-rs/core/src/tasks/mod.rs:502][E: codex-rs/core/src/tasks/mod.rs:505]
10. shutdown runtime 会 abort startup prewarm、abort active tasks、shutdown realtime conversation、terminate unified exec processes、shutdown code mode、MCP manager 和 guardian review session；`shutdown` also shuts down live thread persistence before session end.[E: codex-rs/core/src/session/handlers.rs:576][E: codex-rs/core/src/session/handlers.rs:578][E: codex-rs/core/src/session/handlers.rs:581][E: codex-rs/core/src/session/handlers.rs:580][E: codex-rs/core/src/session/handlers.rs:584][E: codex-rs/core/src/session/handlers.rs:586][E: codex-rs/core/src/session/handlers.rs:582][E: codex-rs/core/src/session/handlers.rs:595][E: codex-rs/core/src/session/handlers.rs:611][E: codex-rs/core/src/session/handlers.rs:630][E: codex-rs/core/src/session/handlers.rs:631]

## Task 类型

`RegularTask` 的 `kind()` 返回 `TaskKind::Regular`，`run` 发送 `TurnStarted` 并循环调用 `run_turn`。[E: codex-rs/core/src/tasks/regular.rs:29][E: codex-rs/core/src/tasks/regular.rs:31][E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/regular.rs:58][E: codex-rs/core/src/tasks/regular.rs:77][E: codex-rs/core/src/tasks/regular.rs:78]

`CompactTask` 的 `kind()` 返回 `TaskKind::Compact`；`run` 根据 provider/feature 在 token-budget, remote v2, remote and local compaction paths 间选择，local path 会合成 compact prompt user input。[E: codex-rs/core/src/tasks/compact.rs:18][E: codex-rs/core/src/tasks/compact.rs:20][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:37][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:45][E: codex-rs/core/src/tasks/compact.rs:52][E: codex-rs/core/src/tasks/compact.rs:59][E: codex-rs/core/src/tasks/compact.rs:67]

`ReviewTask` 从 `TurnInput` 提取 user input，启动 review sub-conversation；review 子 agent config 会关闭 web search、spawn csv、collab 和 multi-agent v2，并设置 review prompt 与 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:53][E: codex-rs/core/src/tasks/review.rs:66][E: codex-rs/core/src/tasks/review.rs:75][E: codex-rs/core/src/tasks/review.rs:109][E: codex-rs/core/src/tasks/review.rs:113][E: codex-rs/core/src/tasks/review.rs:113][E: codex-rs/core/src/tasks/review.rs:114][E: codex-rs/core/src/tasks/review.rs:117][E: codex-rs/core/src/tasks/review.rs:118]

## 设计动机与权衡

`SessionIo` 暴露 queue-pair API，`Session` 持 mutable state/services，`submission_loop` 统一分发 ops；分离 endpoints 还允许所有 submission sender 被 drop 后终止 loop。[E: codex-rs/core/src/session/mod.rs:785][E: codex-rs/core/src/session/handlers.rs:692][I]

`spawn_task` 启动任何新 task 前都会 abort active tasks，体现了 session 以 `active_turn` 承载当前 task 的约束；但 active turn 内的 `steer_input` 和 pending-input loop 允许当前 task 吸收追加输入。[E: codex-rs/core/src/session/session.rs:52][E: codex-rs/core/src/tasks/mod.rs:320][E: codex-rs/core/src/session/handlers.rs:213][E: codex-rs/core/src/tasks/regular.rs:87][I]

## gotcha

- `SessionIo::submit` 只返回 submission id；用户可见结果来自 `next_event`。[E: codex-rs/core/src/session/mod.rs:785][E: codex-rs/core/src/session/mod.rs:804][E: codex-rs/core/src/session/mod.rs:848]
- `Op::UserInput` 不总是启动新 task；active turn 存在时可被 `steer_input` 接住。[E: codex-rs/core/src/session/handlers.rs:213][E: codex-rs/core/src/session/handlers.rs:226]
- `shutdown_and_wait` 是提交 `Op::Shutdown` 后等待 session-loop termination，不是直接同步调用 runtime teardown。[E: codex-rs/core/src/session/mod.rs:842][E: codex-rs/core/src/session/mod.rs:839][E: codex-rs/core/src/session/mod.rs:844]

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
