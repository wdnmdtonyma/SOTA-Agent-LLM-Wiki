---
id: subsys.core.session-lifecycle
title: Session 生命周期
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/turn_input.rs, codex-rs/core/src/session/thread_settings.rs, codex-rs/core/src/elicitation.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/state/service.rs, codex-rs/core/src/thread_manager.rs, codex-rs/protocol/src/protocol.rs]
symbols: [Session, SessionIo, SessionSpawnArgs, SessionConfiguration, SessionState, ActiveTurn, TurnState, ElicitationService, ElicitationRegistration, submission_loop, Session::spawn, Session::spawn_task, Session::start_task, Session::on_task_finished, CodexThread, ThreadManager]
related: [spine.sq-eq-architecture, spine.turn-end-to-end, subsys.core.turn-engine, subsys.core.compaction, subsys.core.unified-exec, subsys.core.thread-queue]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Session lifecycle is the core SQ/EQ control plane: runtime state lives on `Session`, while `SessionIo` holds submission sender、event receiver、agent-status receiver and shared loop-termination future；`Session::spawn_internal` starts the background `submission_loop`。[E: codex-rs/core/src/session/mod.rs:362][E: codex-rs/core/src/session/mod.rs:461][E: codex-rs/core/src/session/mod.rs:485][E: codex-rs/core/src/session/mod.rs:776]

## 能回答的问题

- `Session::spawn` 如何建立 session、`SessionIo` queue endpoints 和后台 loop？
- `Session`、`SessionState`、`ActiveTurn`、`TurnState` 分别保存哪些生命周期状态？
- `Op::TurnInput` 如何变成 active turn 里的 `RegularTask`，又何时只是 steer 当前 turn？
- `Op::ThreadSettings` / `Op::ThreadRollback` 如何进入 submission loop？
- reserved thread ID 何时覆盖自动生成的 id？
- regular/review/compact task 共享哪些 `SessionTask` 约定？
- shutdown 会清理哪些 session-scoped runtime？

## 职责边界

`Session` 是状态和服务容器，`SessionIo` 是可丢弃的 queue/lifecycle endpoints；public `CodexThread` 组合二者成为 bidirectional conduit。[E: codex-rs/core/src/session/mod.rs:362][E: codex-rs/core/src/session/session.rs:35]

`SessionTask` 抽象 regular chat、review、compact 等后台任务：trait 要求 `kind`、`span_name`、`run`，直接传入 `Arc<Session>` 与 `Arc<TurnContext>`，并提供可覆盖的 `abort` cleanup hook。[E: codex-rs/core/src/tasks/mod.rs:187][E: codex-rs/core/src/tasks/mod.rs:187][E: codex-rs/core/src/tasks/mod.rs:190][E: codex-rs/core/src/tasks/mod.rs:205][E: codex-rs/core/src/tasks/mod.rs:205][E: codex-rs/core/src/tasks/mod.rs:205][E: codex-rs/core/src/tasks/mod.rs:218]

## 关键 crate/文件

- `codex-rs/core/src/session/mod.rs`: `SessionIo`、`SessionSpawnArgs`、`Session::spawn`、submit/event receive queue endpoints。[E: codex-rs/core/src/session/mod.rs:362][E: codex-rs/core/src/session/mod.rs:389][E: codex-rs/core/src/session/mod.rs:461][E: codex-rs/core/src/session/mod.rs:794]
- `codex-rs/core/src/session/session.rs`: `Session` 和 `SessionConfiguration` fields。[E: codex-rs/core/src/session/session.rs:35][E: codex-rs/core/src/session/session.rs:69]
- `codex-rs/core/src/session/handlers.rs`: `submission_loop` 与 per-op dispatch handler。[E: codex-rs/core/src/session/handlers.rs:515][E: codex-rs/core/src/session/handlers.rs:526]
- `codex-rs/core/src/session/turn_input.rs`: `Op::TurnInput` start/steer/reject。[E: codex-rs/core/src/session/turn_input.rs:141]
- `codex-rs/core/src/session/thread_settings.rs`: standalone `Op::ThreadSettings`。[E: codex-rs/core/src/session/thread_settings.rs:17]
- `codex-rs/core/src/tasks/mod.rs`: task spawn/start/finish 共享逻辑。[E: codex-rs/core/src/tasks/mod.rs:274][E: codex-rs/core/src/tasks/mod.rs:288][E: codex-rs/core/src/tasks/mod.rs:548]
- `codex-rs/core/src/state/session.rs` 与 `codex-rs/core/src/state/turn.rs`: session-scoped state、active turn 和 turn-local waiters/queues。[E: codex-rs/core/src/state/session.rs:25][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:88]

## 数据模型

`Session` 持有 thread/session identity、event sender、agent status sender、`SessionState` mutex、realtime conversation manager、`active_turn` mutex、`InputQueue`、guardian review session manager、`SessionServices` 和 internal sub-id counter。[E: codex-rs/core/src/session/session.rs:36][E: codex-rs/core/src/session/session.rs:38][E: codex-rs/core/src/session/session.rs:40][E: codex-rs/core/src/session/session.rs:58][E: codex-rs/core/src/session/session.rs:60][E: codex-rs/core/src/session/session.rs:62]

`SessionState` 保存 session configuration、`ContextManager` history、rate limit/server reasoning state、additional context、previous turn settings、auto-compact window、startup prewarm、active connector selection、pending session-start sources、granted permissions 和 next-turn-is-first flag。[E: codex-rs/core/src/state/session.rs:28][E: codex-rs/core/src/state/session.rs:28][E: codex-rs/core/src/state/session.rs:29][E: codex-rs/core/src/state/session.rs:31][E: codex-rs/core/src/state/session.rs:32][E: codex-rs/core/src/state/session.rs:36][E: codex-rs/core/src/state/session.rs:40][E: codex-rs/core/src/state/session.rs:40][E: codex-rs/core/src/state/session.rs:42][E: codex-rs/core/src/state/session.rs:44][E: codex-rs/core/src/state/session.rs:44][E: codex-rs/core/src/state/session.rs:45]

`ActiveTurn` 持有当前 `RunningTask` 与共享 `TurnState`；`TurnState` 保存 approval/request-permissions/user-input/elicitation/dynamic-tool waiters、pending input、mailbox delivery phase、turn-scoped granted permissions、strict auto-review flag、tool call count、memory citation flag 和 turn-start token usage。[E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:88][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100]

`SessionServices` 是 long-lived managers 的集合，包括 MCP runtime、unified exec、elicitation counter/service、analytics、hooks、auth/model managers、skills/plugins、extensions、agent control 和 network proxy services。[E: codex-rs/core/src/state/service.rs:44][E: codex-rs/core/src/state/service.rs:48][E: codex-rs/core/src/state/service.rs:48][E: codex-rs/core/src/state/service.rs:54][E: codex-rs/core/src/state/service.rs:55][E: codex-rs/core/src/state/service.rs:59][E: codex-rs/core/src/state/service.rs:60][E: codex-rs/core/src/state/service.rs:63][E: codex-rs/core/src/state/service.rs:68][E: codex-rs/core/src/state/service.rs:72]

`ElicitationService` 用 reference-counted registration 统一表示 session 是否处于用户交互暂停：并发 MCP elicitation、approval 等 holder 全部释放后 watch 才回到 false。Unified exec 的 timeout deadline 与 code-mode result delivery 都订阅/等待这一状态，因此不再只针对某一种 out-of-band elicitation。[E: codex-rs/core/src/elicitation.rs:66][E: codex-rs/core/src/elicitation.rs:70][E: codex-rs/core/src/session/mod.rs:1131]

## 控制流

1. `Session::spawn` wraps `spawn_internal` in a `thread_spawn` span；`spawn_internal` destructures `SessionSpawnArgs`（含 optional `reserved_thread_id`）。[E: codex-rs/core/src/session/mod.rs:461][E: codex-rs/core/src/session/mod.rs:485][E: codex-rs/core/src/session/mod.rs:425]
2. spawn 后启动后台 `session_loop` task，内部运行 `submission_loop`；返回 `(Arc<Session>, SessionIo)`。[E: codex-rs/core/src/session/mod.rs:776][E: codex-rs/core/src/session/mod.rs:781]
3. `submit`/`submit_with_trace` 创建 `Submission` 并把它送入 `tx_sub`；`next_event` 从 `rx_event` 读取 user-visible `Event`。[E: codex-rs/core/src/session/mod.rs:794][E: codex-rs/core/src/session/mod.rs:802][E: codex-rs/core/src/session/mod.rs:891]
4. `submission_loop` 从 `rx_sub.recv()` 取 submission，按 `Op` match；`Op::Review` 进入 review handler，`Op::Shutdown` 返回 should-exit。[E: codex-rs/core/src/session/handlers.rs:515][E: codex-rs/core/src/session/handlers.rs:526][E: codex-rs/core/src/session/handlers.rs:662][E: codex-rs/core/src/session/handlers.rs:663]
5. `Op::TurnInput` 交给 `turn_input::handle`：先 `steer_input`，没有 active turn 才 start `RegularTask`。persistent `ThreadSettingsOverrides` 在 Started/Steered 后才 apply。[E: codex-rs/core/src/session/handlers.rs:570][E: codex-rs/core/src/session/turn_input.rs:141][E: codex-rs/core/src/session/turn_input.rs:196][E: codex-rs/core/src/session/turn_input.rs:208]
6. `Op::ThreadSettings` 走 `thread_settings::update`，不启动 turn；`Op::ThreadRollback` 走 `thread_rollback`，要求无 active turn 且有 persisted live thread。[E: codex-rs/core/src/session/handlers.rs:588][E: codex-rs/core/src/session/handlers.rs:639][E: codex-rs/core/src/session/handlers.rs:264][E: codex-rs/core/src/session/handlers.rs:278]
7. reserved thread ID：`New`/`Cleared`/`Forked` 使用预分配 id；`Resumed` 带 reserved id 是错误。[E: codex-rs/core/src/session/session.rs:667][E: codex-rs/core/src/session/session.rs:676]
8. `spawn_task` aborts current tasks then `start_task`；task 结束后 flush rollout 并 `on_task_finished`。[E: codex-rs/core/src/tasks/mod.rs:274]
9. shutdown runtime abort prewarm/tasks、关 realtime/unified exec/code mode/MCP/guardian；`Op::Shutdown` 调用 `shutdown_session_runtime`。[E: codex-rs/core/src/session/handlers.rs:397][E: codex-rs/core/src/session/handlers.rs:435]

## Task 类型

`RegularTask` 的 `kind()` 返回 `TaskKind::Regular`，`run` 发送 `TurnStarted` 并循环调用 `run_turn`。[E: codex-rs/core/src/tasks/regular.rs:26][E: codex-rs/core/src/tasks/regular.rs:31][E: codex-rs/core/src/tasks/regular.rs:49][E: codex-rs/core/src/tasks/regular.rs:55][E: codex-rs/core/src/tasks/regular.rs:75][E: codex-rs/core/src/tasks/regular.rs:76]

`CompactTask` 的 `kind()` 返回 `TaskKind::Compact`；`run` 根据 provider/feature 在 token-budget, remote v2, remote and local compaction paths 间选择，local path 会合成 compact prompt user input。[E: codex-rs/core/src/tasks/compact.rs:17][E: codex-rs/core/src/tasks/compact.rs:20][E: codex-rs/core/src/tasks/compact.rs:35][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:38][E: codex-rs/core/src/tasks/compact.rs:44][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:66]

`ReviewTask` 从 `TurnInput` 提取 user input，启动 review sub-conversation；review 子 agent config 会关闭 web search、spawn csv、collab 和 multi-agent v2，并设置 review prompt 与 `AskForApproval::Never`。[E: codex-rs/core/src/tasks/review.rs:51][E: codex-rs/core/src/tasks/review.rs:64][E: codex-rs/core/src/tasks/review.rs:70][E: codex-rs/core/src/tasks/review.rs:107][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:114][E: codex-rs/core/src/tasks/review.rs:117]

## 设计动机与权衡

`SessionIo` 暴露 queue-pair API，`Session` 持 mutable state/services，`submission_loop` 统一分发 ops；分离 endpoints 还允许所有 submission sender 被 drop 后终止 loop。[E: codex-rs/core/src/session/mod.rs:362][E: codex-rs/core/src/session/handlers.rs:515][I]

`spawn_task` 启动任何新 task 前都会 abort active tasks；active turn 内的 `steer_input` 允许当前 task 吸收追加输入。[E: codex-rs/core/src/session/session.rs:58][E: codex-rs/core/src/session/turn_input.rs:196][I]

## gotcha

- `SessionIo::submit` 只返回 submission id；用户可见结果来自 `next_event`。[E: codex-rs/core/src/session/mod.rs:794][E: codex-rs/core/src/session/mod.rs:817][E: codex-rs/core/src/session/mod.rs:891]
- `Op::TurnInput` 不总是启动新 task；active turn 存在时可被 `steer_input` 接住。[E: codex-rs/core/src/session/turn_input.rs:196][E: codex-rs/core/src/session/turn_input.rs:207]
- `shutdown_and_wait` 是提交 `Op::Shutdown` 后等待 session-loop termination，不是直接同步调用 runtime teardown。[E: codex-rs/core/src/session/mod.rs:880][E: codex-rs/core/src/session/mod.rs:882]

## Sources

- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/turn_input.rs`
- `codex-rs/core/src/session/thread_settings.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/protocol/src/protocol.rs`
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
- [Thread queue](thread-queue.md) — idle 时从 durable queue 调 `start_turn_if_idle`。
