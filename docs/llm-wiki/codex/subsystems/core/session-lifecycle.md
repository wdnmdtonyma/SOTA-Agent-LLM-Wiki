---
id: subsys.core.session-lifecycle
title: Session 生命周期
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/turn_input.rs, codex-rs/core/src/session/thread_settings.rs, codex-rs/core/src/session/extension_interruption.rs, codex-rs/core/src/elicitation.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/state/service.rs, codex-rs/core/src/thread_manager.rs, codex-rs/protocol/src/protocol.rs]
symbols: [Session, SessionIo, SessionSpawnArgs, SessionConfiguration, SessionState, ActiveTurn, TurnState, ElicitationService, ElicitationRegistration, submission_loop, Session::spawn, Session::spawn_task, Session::start_task, Session::on_task_finished, Session::interrupt_turn_if_no_pending_input, CodexThread, ThreadManager, Op::InterruptIfNoPendingInput]
related: [spine.sq-eq-architecture, spine.turn-end-to-end, subsys.core.turn-engine, subsys.core.compaction, subsys.core.unified-exec, subsys.core.thread-queue]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Session lifecycle is the core SQ/EQ control plane: runtime state lives on `Session`，`SessionIo` 持 submission sender、event receiver、agent-status receiver 与 loop-termination future；`Session::spawn` 包一层 `thread_spawn` span 后进 `spawn_internal`，后台跑 `submission_loop`。protocol `Op` 现为 **29** 个变体，新增 `Op::InterruptIfNoPendingInput { turn_id, reply }`：仅当该 turn 无 queued input 才中断，`reply: oneshot::Sender<bool>` 在 cancellation 完成前 ack；`Op::Interrupt` 仍在。[E: codex-rs/core/src/session/mod.rs:404][E: codex-rs/core/src/session/mod.rs:511][E: codex-rs/core/src/session/mod.rs:539][E: codex-rs/protocol/src/protocol.rs:590][E: codex-rs/protocol/src/protocol.rs:597]

## 能回答的问题

- `Session::spawn` 如何建立 session、`SessionIo` queue endpoints 和后台 loop？
- `Session`、`SessionState`、`ActiveTurn`、`TurnState` 分别保存哪些生命周期状态？
- `Op::TurnInput` 如何变成 active turn 里的 `RegularTask`，又何时只是 steer 当前 turn？
- `Op::InterruptIfNoPendingInput` 与 `Op::Interrupt` 有何差别？
- `Op::ThreadSettings` / `Op::TurnSettings` / `Op::SuspendTurnAndShutdown` 如何进入 submission loop？`Op::ThreadRollback` 是否还存在？
- reserved thread ID 何时覆盖自动生成的 id？
- regular/review/compact task 共享哪些 `SessionTask` 约定？
- shutdown 会清理哪些 session-scoped runtime？

## 职责边界

`Session` 是状态和服务容器，`SessionIo` 是可丢弃的 queue/lifecycle endpoints；public `CodexThread` 组合二者成为 bidirectional conduit。[E: codex-rs/core/src/session/mod.rs:404][E: codex-rs/core/src/session/session.rs:63]

`SessionTask` 抽象 regular chat、review、compact 等后台任务：trait 要求 `kind`、`span_name`、`run`，直接传入 `Arc<Session>` 与 `Arc<TurnContext>`，并提供可覆盖的 `abort` cleanup hook。[E: codex-rs/core/src/tasks/mod.rs:179][E: codex-rs/core/src/tasks/mod.rs:182][E: codex-rs/core/src/tasks/mod.rs:185][E: codex-rs/core/src/tasks/mod.rs:197][E: codex-rs/core/src/tasks/mod.rs:210]

## 关键 crate/文件

- `codex-rs/core/src/session/mod.rs`: `SessionIo`、`SessionSpawnArgs`、`Session::spawn`、submit/event receive queue endpoints。[E: codex-rs/core/src/session/mod.rs:404][E: codex-rs/core/src/session/mod.rs:433][E: codex-rs/core/src/session/mod.rs:511][E: codex-rs/core/src/session/mod.rs:949]
- `codex-rs/core/src/session/session.rs`: `Session` 和 `SessionConfiguration` fields。[E: codex-rs/core/src/session/session.rs:59][E: codex-rs/core/src/session/session.rs:102]
- `codex-rs/core/src/session/handlers.rs`: `submission_loop` 与 per-op dispatch handler。[E: codex-rs/core/src/session/handlers.rs:420][E: codex-rs/core/src/session/handlers.rs:435]
- `codex-rs/core/src/session/turn_input.rs`: `Op::TurnInput` start/steer/reject。[E: codex-rs/core/src/session/turn_input.rs:205]
- `codex-rs/core/src/session/thread_settings.rs`: standalone `Op::ThreadSettings`。[E: codex-rs/core/src/session/thread_settings.rs:32]
- `codex-rs/core/src/tasks/mod.rs`: task spawn/start/finish 共享逻辑。[E: codex-rs/core/src/tasks/mod.rs:271][E: codex-rs/core/src/tasks/mod.rs:286][E: codex-rs/core/src/tasks/mod.rs:629]
- `codex-rs/core/src/state/session.rs` 与 `codex-rs/core/src/state/turn.rs`: session-scoped state、active turn 和 turn-local waiters/queues。[E: codex-rs/core/src/state/session.rs:69][E: codex-rs/core/src/state/turn.rs:33][E: codex-rs/core/src/state/turn.rs:90]

## 数据模型

`Session` 持有 `thread_id`、`tx_event`、`agent_status`、`SessionState` mutex、与 compaction 解耦的 `thread_settings_persistence` semaphore、`active_turn`、`InputQueue`、`SessionServices` 和 `next_internal_sub_id`。[E: codex-rs/core/src/session/session.rs:59][E: codex-rs/core/src/session/session.rs:62][E: codex-rs/core/src/session/session.rs:64][E: codex-rs/core/src/session/session.rs:67][E: codex-rs/core/src/session/session.rs:91][E: codex-rs/core/src/session/session.rs:94]

`SessionState` 保存 `session_configuration`、`history: ContextManager`、`history_reset` token、rate limit / token usage、additional context、previous turn settings、`last_started_turn_id`、auto-compact window、startup prewarm、active connector selection、pending session-start sources、granted permissions 和 `next_turn_is_first`。[E: codex-rs/core/src/state/session.rs:69][E: codex-rs/core/src/state/session.rs:75][E: codex-rs/core/src/state/session.rs:77][E: codex-rs/core/src/state/session.rs:89][E: codex-rs/core/src/state/session.rs:97][E: codex-rs/core/src/state/session.rs:104]

`ActiveTurn` 持有当前 `RunningTask` 与共享 `TurnState`；`TurnState` 保存 approval/request-permissions/user-input/elicitation/dynamic-tool waiters、pending input、mailbox delivery phase、turn-scoped granted permissions、strict auto-review flag、tool call count、memory citation flag 和 turn-start token usage。[E: codex-rs/core/src/state/turn.rs:32][E: codex-rs/core/src/state/turn.rs:34][E: codex-rs/core/src/state/turn.rs:89][E: codex-rs/core/src/state/turn.rs:90][E: codex-rs/core/src/state/turn.rs:91][E: codex-rs/core/src/state/turn.rs:92][E: codex-rs/core/src/state/turn.rs:93][E: codex-rs/core/src/state/turn.rs:94][E: codex-rs/core/src/state/turn.rs:95][E: codex-rs/core/src/state/turn.rs:96][E: codex-rs/core/src/state/turn.rs:97][E: codex-rs/core/src/state/turn.rs:98][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:100][E: codex-rs/core/src/state/turn.rs:101]

`SessionServices` 是 long-lived managers 的集合，包括 MCP runtime、unified exec、elicitation service、analytics、hooks、auth/model managers、skills/plugins、extensions、agent control 和 network proxy services。[E: codex-rs/core/src/state/service.rs:48][E: codex-rs/core/src/state/service.rs:50][E: codex-rs/core/src/state/service.rs:53][E: codex-rs/core/src/state/service.rs:54][E: codex-rs/core/src/state/service.rs:59][E: codex-rs/core/src/state/service.rs:60][E: codex-rs/core/src/state/service.rs:65][E: codex-rs/core/src/state/service.rs:68][E: codex-rs/core/src/state/service.rs:73][E: codex-rs/core/src/state/service.rs:75][E: codex-rs/core/src/state/service.rs:77][E: codex-rs/core/src/state/service.rs:84][E: codex-rs/core/src/state/service.rs:88]

`ElicitationService` 用 reference-counted registration 统一表示 session 是否处于用户交互暂停：并发 MCP elicitation、approval 等 holder 全部释放后 watch 才回到 false。Unified exec 与 code-mode result delivery 都订阅/等待这一状态，因此不再只针对某一种 out-of-band elicitation。[E: codex-rs/core/src/elicitation.rs:66][E: codex-rs/core/src/elicitation.rs:70][E: codex-rs/core/src/session/mod.rs:1360]

## 控制流

1. `Session::spawn` wraps `spawn_internal` in a `thread_spawn` span；`spawn_internal` destructures `SessionSpawnArgs`（含 optional `reserved_thread_id`）。[E: codex-rs/core/src/session/mod.rs:511][E: codex-rs/core/src/session/mod.rs:539][E: codex-rs/core/src/session/mod.rs:472]
2. spawn 后启动后台 `session_loop` task，内部运行 `submission_loop`；返回 `(Arc<Session>, SessionIo)`。[E: codex-rs/core/src/session/mod.rs:928][E: codex-rs/core/src/session/mod.rs:943]
3. `submit`/`submit_with_trace` 创建 `Submission` 并把它送入 `tx_sub`；`next_event` 从 `rx_event` 读取 user-visible `Event`。[E: codex-rs/core/src/session/mod.rs:949][E: codex-rs/core/src/session/mod.rs:957][E: codex-rs/core/src/session/mod.rs:1053]
4. `submission_loop` 从 `rx_sub.recv()` 取 submission 按 `Op` match：`Op::Interrupt` 立即 interrupt；`Op::InterruptIfNoPendingInput` 调 `sess.interrupt_turn_if_no_pending_input(&turn_id, reply)`。[E: codex-rs/core/src/session/handlers.rs:420][E: codex-rs/core/src/session/handlers.rs:436][E: codex-rs/core/src/session/handlers.rs:440][E: codex-rs/core/src/session/extension_interruption.rs:61]
5. `Op::TurnInput` 交给 `turn_input::handle`：先 `steer_input`，没有 active turn 才 start `RegularTask`。persistent `ThreadSettingsOverrides` 在 Started/Steered 后才 apply。[E: codex-rs/core/src/session/handlers.rs:485][E: codex-rs/core/src/session/turn_input.rs:205][E: codex-rs/core/src/session/turn_input.rs:305][E: codex-rs/core/src/session/turn_input.rs:316]
6. `Op::ThreadSettings` 走 `thread_settings::update`，不启动 turn；`Op::TurnSettings` 走 `sess.apply_turn_settings`；`Op::SuspendTurnAndShutdown` 在成功 `Suspended` 后退出 loop。[E: codex-rs/core/src/session/handlers.rs:509][E: codex-rs/core/src/session/handlers.rs:522][E: codex-rs/core/src/session/handlers.rs:554] `Op` 没有 `ThreadRollback` 变体，`submission_loop` 也没有对应分支；未知 op 落入 `_ => false`。[E: codex-rs/protocol/src/protocol.rs:590][E: codex-rs/core/src/session/handlers.rs:638] Paginated 磁盘撤销不走 SQ，而是 app-server `thread/revert` / `ThreadStore::revert_thread`。[I]
7. reserved thread ID：`New`/`Cleared`/`Forked` 使用预分配 id；`Resumed` 带 reserved id 是错误。[E: codex-rs/core/src/session/session.rs:852][E: codex-rs/core/src/session/session.rs:861]
8. `spawn_task` aborts current tasks then `start_task`；task 结束后 flush rollout 并 `on_task_finished`。[E: codex-rs/core/src/tasks/mod.rs:271][E: codex-rs/core/src/tasks/mod.rs:277][E: codex-rs/core/src/tasks/mod.rs:279]
9. `Op::Shutdown` 调用 `shutdown()`，内部先跑 `shutdown_session_runtime`：abort prewarm/tasks、关 realtime/unified exec/code mode/MCP/guardian。[E: codex-rs/core/src/session/handlers.rs:629][E: codex-rs/core/src/session/handlers.rs:338][E: codex-rs/core/src/session/handlers.rs:287]

## Task 类型

`RegularTask` 的 `kind()` 返回 `TaskKind::Regular`，`run` 发送 `TurnStarted` 并循环调用 `run_turn`。[E: codex-rs/core/src/tasks/regular.rs:23][E: codex-rs/core/src/tasks/regular.rs:32][E: codex-rs/core/src/tasks/regular.rs:40][E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/regular.rs:105]

`CompactTask` 的 `kind()` 返回 `TaskKind::Compact`；`run` 按 feature/provider 在 token-budget、remote v2 与 local 三条路径中选择（不再有 remote v1），local path 会合成 compact prompt user input。[E: codex-rs/core/src/tasks/compact.rs:17][E: codex-rs/core/src/tasks/compact.rs:20][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:48][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:56]

`ReviewTask` 从 `TurnInput::UserInput` 提取 user input（忽略 ResponseItem / FunctionCallOutput / InterAgentCommunication），启动 review sub-conversation；review 子 agent config 会关闭 web search、Collab 和 MultiAgentV2，并设置 review prompt 与 `AskForApproval::Never`。已删除的 SpawnCsv 不再有额外 disable。[E: codex-rs/core/src/tasks/review.rs:69][E: codex-rs/core/src/tasks/review.rs:70][E: codex-rs/core/src/tasks/review.rs:110][E: codex-rs/core/src/tasks/review.rs:115][E: codex-rs/core/src/tasks/review.rs:116][E: codex-rs/core/src/tasks/review.rs:119][E: codex-rs/core/src/tasks/review.rs:121]

## 设计动机与权衡

`SessionIo` 暴露 queue-pair API，`Session` 持 mutable state/services，`submission_loop` 统一分发 ops；分离 endpoints 还允许所有 submission sender 被 drop 后终止 loop。[E: codex-rs/core/src/session/mod.rs:404][E: codex-rs/core/src/session/handlers.rs:420][I]

`spawn_task` 启动任何新 task 前都会 abort active tasks；active turn 内的 `steer_input` 允许当前 task 吸收追加输入。[E: codex-rs/core/src/tasks/mod.rs:277][E: codex-rs/core/src/session/turn_input.rs:305][I]

## gotcha

- `SessionIo::submit` 只返回 submission id；用户可见结果来自 `next_event`。[E: codex-rs/core/src/session/mod.rs:949][E: codex-rs/core/src/session/mod.rs:975][E: codex-rs/core/src/session/mod.rs:1053]
- `Op::TurnInput` 不总是启动新 task；active turn 存在时可被 `steer_input` 接住。[E: codex-rs/core/src/session/turn_input.rs:305][E: codex-rs/core/src/session/turn_input.rs:316]
- `shutdown_and_wait` 是提交 `Op::Shutdown` 后等待 session-loop termination，不是直接同步调用 runtime teardown。[E: codex-rs/core/src/session/mod.rs:1042][E: codex-rs/core/src/session/mod.rs:1044]
- 不要把 `EventMsg::ThreadRolledBack` 当成活 SQ 操作：它仍在 EQ enum 里供 replay，但 `submission_loop` 不再 dispatch rollback Op。[E: codex-rs/protocol/src/protocol.rs:1404][E: codex-rs/core/src/session/handlers.rs:638]

## Sources

- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/turn_input.rs`
- `codex-rs/core/src/session/thread_settings.rs`
- `codex-rs/core/src/session/extension_interruption.rs`
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
