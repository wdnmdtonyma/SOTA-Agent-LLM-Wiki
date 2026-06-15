---
id: subsys.core.session-lifecycle
title: Session 生命周期
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/tasks/review.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/state/service.rs]
symbols: [Codex, CodexSpawnArgs, Session, SessionConfiguration, SessionState, ActiveTurn, TurnState, SessionTask, submission_loop, Codex::spawn, Session::new, Session::spawn_task]
related: [spine.sq-eq-architecture, spine.turn-end-to-end, subsys.core.turn-engine, subsys.core.compaction, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Session 生命周期是 `Codex::spawn` 创建 submission queue / event queue、构造 `Session`、启动 `submission_loop`，再由 handlers 从 submission channel 读取 `Op` 并分发为 task 或 event side effect 的异步控制面。[E: codex-rs/core/src/session/mod.rs:410][E: codex-rs/core/src/session/mod.rs:458][E: codex-rs/core/src/session/mod.rs:459][E: codex-rs/core/src/session/mod.rs:633][E: codex-rs/core/src/session/mod.rs:660][E: codex-rs/core/src/session/handlers.rs:1012][E: codex-rs/core/src/session/handlers.rs:1016][I]

## 能回答的问题

- `Codex::spawn` 和 `Session::new` 分别初始化哪些对象？
- Submission Queue / Event Queue 在源码中是哪两个 channel？
- `Op::UserTurn` 如何变成 `RegularTask`？
- active turn、pending input、pending approvals、tool calls 存在哪里？
- manual compact、review、regular turn task 的生命周期有什么差异？
- shutdown 如何停止 background terminals、guardian session 和 rollout recorder？

## 职责边界

`Codex` 是外部调用者持有的 high-level handle，字段包含 submission sender、event receiver、agent status、shared session 和 session loop termination join handle。[E: codex-rs/core/src/session/mod.rs:362][E: codex-rs/core/src/session/mod.rs:363][E: codex-rs/core/src/session/mod.rs:365][E: codex-rs/core/src/session/mod.rs:366][E: codex-rs/core/src/session/mod.rs:369] `Session` 是内部共享状态与 services 容器，持有 `state`、realtime conversation、active turn、mailbox、guardian review session、services 和 JS REPL handle。[E: codex-rs/core/src/session/session.rs:12][E: codex-rs/core/src/session/session.rs:20][E: codex-rs/core/src/session/session.rs:21][E: codex-rs/core/src/session/session.rs:22][E: codex-rs/core/src/session/session.rs:23][E: codex-rs/core/src/session/session.rs:24][E: codex-rs/core/src/session/session.rs:25][E: codex-rs/core/src/session/session.rs:26][E: codex-rs/core/src/session/session.rs:27]

`SessionTask` 是 regular/review/compact 等长期任务的抽象；它有 `kind`、`span_name`、`run` 和 `abort`，regular/review/compact 各自实现该 trait。[E: codex-rs/core/src/tasks/mod.rs:144][E: codex-rs/core/src/tasks/mod.rs:147][E: codex-rs/core/src/tasks/mod.rs:150][E: codex-rs/core/src/tasks/mod.rs:160][E: codex-rs/core/src/tasks/mod.rs:173][E: codex-rs/core/src/tasks/regular.rs:27][E: codex-rs/core/src/tasks/compact.rs:13][E: codex-rs/core/src/tasks/review.rs:50]

## 关键 crate/文件

- `codex-rs/core/src/session/mod.rs`: `Codex` public handle、spawn、submit、event delivery、initial context、history operations。[E: codex-rs/core/src/session/mod.rs:359][E: codex-rs/core/src/session/mod.rs:410][E: codex-rs/core/src/session/mod.rs:676][E: codex-rs/core/src/session/mod.rs:731][E: codex-rs/core/src/session/mod.rs:2233][E: codex-rs/core/src/session/mod.rs:2244][E: codex-rs/core/src/session/mod.rs:2311][E: codex-rs/core/src/session/mod.rs:2589]
- `codex-rs/core/src/session/session.rs`: `Session` 和 `SessionConfiguration` 的 fields、`Session::new` 初始化 services。[E: codex-rs/core/src/session/session.rs:4][E: codex-rs/core/src/session/session.rs:31][E: codex-rs/core/src/session/session.rs:216][E: codex-rs/core/src/session/session.rs:634]
- `codex-rs/core/src/session/handlers.rs`: `submission_loop` 和每个 `Op` 的 handler 入口。[E: codex-rs/core/src/session/handlers.rs:1006][E: codex-rs/core/src/session/handlers.rs:1012][E: codex-rs/core/src/session/handlers.rs:1016]
- `codex-rs/core/src/tasks/mod.rs`: active task 启动、取消、完成与 pending work 调度。[E: codex-rs/core/src/tasks/mod.rs:241][E: codex-rs/core/src/tasks/mod.rs:253][E: codex-rs/core/src/tasks/mod.rs:399][E: codex-rs/core/src/tasks/mod.rs:413]

## 数据模型

`SessionConfiguration` 保存 provider、collaboration mode、developer/user/base instructions、compact prompt、approval/sandbox policy、cwd、codex_home、thread_name、original config、session source、dynamic tools、history persistence、shell snapshot/override 等 session-level 设置。[E: codex-rs/core/src/session/session.rs:31][E: codex-rs/core/src/session/session.rs:34][E: codex-rs/core/src/session/session.rs:36][E: codex-rs/core/src/session/session.rs:41][E: codex-rs/core/src/session/session.rs:44][E: codex-rs/core/src/session/session.rs:50][E: codex-rs/core/src/session/session.rs:53][E: codex-rs/core/src/session/session.rs:56][E: codex-rs/core/src/session/session.rs:59][E: codex-rs/core/src/session/session.rs:68][E: codex-rs/core/src/session/session.rs:70][E: codex-rs/core/src/session/session.rs:72][E: codex-rs/core/src/session/session.rs:75][E: codex-rs/core/src/session/session.rs:81][E: codex-rs/core/src/session/session.rs:82][E: codex-rs/core/src/session/session.rs:83][E: codex-rs/core/src/session/session.rs:84][E: codex-rs/core/src/session/session.rs:85]

`SessionState` 持有 `session_configuration`、`history: ContextManager`、token/rate limit state、dependency env、previous turn settings、active connector selection 和 granted permissions。[E: codex-rs/core/src/state/session.rs:21][E: codex-rs/core/src/state/session.rs:22][E: codex-rs/core/src/state/session.rs:23][E: codex-rs/core/src/state/session.rs:25][E: codex-rs/core/src/state/session.rs:27][E: codex-rs/core/src/state/session.rs:30][E: codex-rs/core/src/state/session.rs:33][E: codex-rs/core/src/state/session.rs:35]

`ActiveTurn` 保存 running tasks 与 `TurnState`；`TurnState` 保存 pending approvals、pending request permissions、pending user input、pending dynamic tool calls、pending input queue、mailbox delivery phase、granted permissions、tool_calls 计数、memory citation 标记和 turn-start token usage。[E: codex-rs/core/src/state/turn.rs:28][E: codex-rs/core/src/state/turn.rs:30][E: codex-rs/core/src/state/turn.rs:31][E: codex-rs/core/src/state/turn.rs:99][E: codex-rs/core/src/state/turn.rs:101][E: codex-rs/core/src/state/turn.rs:102][E: codex-rs/core/src/state/turn.rs:103][E: codex-rs/core/src/state/turn.rs:105][E: codex-rs/core/src/state/turn.rs:106][E: codex-rs/core/src/state/turn.rs:107][E: codex-rs/core/src/state/turn.rs:108][E: codex-rs/core/src/state/turn.rs:109][E: codex-rs/core/src/state/turn.rs:110][E: codex-rs/core/src/state/turn.rs:111]

`SessionServices` 是长生命周期 service map，包含 model/auth/MCP、unified exec manager、approval stores、guardian rejections、model client、code mode service 等 runtime services。[E: codex-rs/core/src/state/service.rs:33][E: codex-rs/core/src/state/service.rs:34][E: codex-rs/core/src/state/service.rs:36][E: codex-rs/core/src/state/service.rs:48][E: codex-rs/core/src/state/service.rs:49][E: codex-rs/core/src/state/service.rs:51][E: codex-rs/core/src/state/service.rs:52][E: codex-rs/core/src/state/service.rs:55][E: codex-rs/core/src/state/service.rs:63][E: codex-rs/core/src/state/service.rs:64]

## 控制流

1. `Codex::spawn` 验证 trace id，随后进入 `spawn_internal`。[E: codex-rs/core/src/session/mod.rs:410][E: codex-rs/core/src/session/mod.rs:413][E: codex-rs/core/src/session/mod.rs:424][E: codex-rs/core/src/session/mod.rs:428]
2. `spawn_internal` 创建 bounded submission channel 与 unbounded event channel；submission channel capacity 是 512。[E: codex-rs/core/src/session/mod.rs:406][E: codex-rs/core/src/session/mod.rs:458][E: codex-rs/core/src/session/mod.rs:459]
3. `spawn_internal` 构建 environment、加载 plugins/skills、处理 subagent depth 限制、禁用不兼容 Node 下的 JS REPL/code mode，并用 `AgentsMdManager` 读取 user instructions。[E: codex-rs/core/src/session/mod.rs:461][E: codex-rs/core/src/session/mod.rs:465][E: codex-rs/core/src/session/mod.rs:467][E: codex-rs/core/src/session/mod.rs:468][E: codex-rs/core/src/session/mod.rs:478][E: codex-rs/core/src/session/mod.rs:485][E: codex-rs/core/src/session/mod.rs:502][E: codex-rs/core/src/session/mod.rs:509][E: codex-rs/core/src/session/mod.rs:513]
4. `spawn_internal` 构造 `SessionConfiguration`，调用 `Session::new`，然后 spawn `submission_loop` task 并返回 `Codex` handle。[E: codex-rs/core/src/session/mod.rs:599][E: codex-rs/core/src/session/mod.rs:633][E: codex-rs/core/src/session/mod.rs:658][E: codex-rs/core/src/session/mod.rs:665]
5. `Session::new` 并行初始化 rollout/state DB、history metadata、auth/MCP，然后创建 `SessionState` 与 `SessionServices`。[E: codex-rs/core/src/session/session.rs:300][E: codex-rs/core/src/session/session.rs:305][E: codex-rs/core/src/session/session.rs:330][E: codex-rs/core/src/session/session.rs:345][E: codex-rs/core/src/session/session.rs:362][E: codex-rs/core/src/session/session.rs:367][E: codex-rs/core/src/session/session.rs:546][E: codex-rs/core/src/session/session.rs:634]
6. `Session::new` 把 `UnifiedExecProcessManager::new(config.background_terminal_max_timeout)` 放进 services，并初始化 `guardian_rejections`、`model_client` 和 `code_mode_service`。[E: codex-rs/core/src/session/session.rs:647][E: codex-rs/core/src/session/session.rs:663][E: codex-rs/core/src/session/session.rs:673][E: codex-rs/core/src/session/session.rs:684]
7. `Session::new` 在 session 完成构造后发送 `SessionConfigured` 事件；源码把该事件作为 watcher 启动前的事件发送位置。[E: codex-rs/core/src/session/session.rs:723][E: codex-rs/core/src/session/session.rs:752][E: codex-rs/core/src/session/session.rs:756]
8. `submission_loop` 从 `rx_sub` 读 `Submission`，按 `sub.op.clone()` 分发；`Op::UserInput | Op::UserTurn` 进入 `user_input_or_turn`。[E: codex-rs/core/src/session/handlers.rs:1012][E: codex-rs/core/src/session/handlers.rs:1016][E: codex-rs/core/src/session/handlers.rs:1098]
9. `user_input_or_turn_inner` 把 `Op::UserTurn` 的 model/approval/sandbox/cwd 等覆盖项变成 `SessionSettingsUpdate`，随后创建 turn context。[E: codex-rs/core/src/session/handlers.rs:128][E: codex-rs/core/src/session/handlers.rs:156][E: codex-rs/core/src/session/handlers.rs:191]
10. 如果 `steer_input` 命中 active turn，handler 不启动新 task；如果返回 `NoActiveTurn`，handler 刷新 MCP server 并 `spawn_task(..., RegularTask::new())`。[E: codex-rs/core/src/session/handlers.rs:200][E: codex-rs/core/src/session/handlers.rs:208][E: codex-rs/core/src/session/handlers.rs:212][E: codex-rs/core/src/session/handlers.rs:219][E: codex-rs/core/src/session/handlers.rs:222][E: codex-rs/core/src/session/handlers.rs:225]
11. `Session::spawn_task` 会 abort 当前 active tasks、清理 connector selection，再调用 `start_task`。[E: codex-rs/core/src/tasks/mod.rs:241][E: codex-rs/core/src/tasks/mod.rs:248][E: codex-rs/core/src/tasks/mod.rs:249][E: codex-rs/core/src/tasks/mod.rs:250]
12. `start_task` 记录 turn start token usage、建立 cancellation token、插入 `RunningTask`，并 spawn 任务 future；任务结束后调用 `on_task_finished`。[E: codex-rs/core/src/tasks/mod.rs:267][E: codex-rs/core/src/tasks/mod.rs:269][E: codex-rs/core/src/tasks/mod.rs:282][E: codex-rs/core/src/tasks/mod.rs:308][E: codex-rs/core/src/tasks/mod.rs:334][E: codex-rs/core/src/tasks/mod.rs:345][E: codex-rs/core/src/tasks/mod.rs:354]
13. `on_task_finished` 移除 active task、汇总 token usage 和 memory metric、发送 `TurnComplete`，然后尝试 `maybe_start_turn_for_pending_work`。[E: codex-rs/core/src/tasks/mod.rs:430][E: codex-rs/core/src/tasks/mod.rs:498][E: codex-rs/core/src/tasks/mod.rs:549][E: codex-rs/core/src/tasks/mod.rs:559][E: codex-rs/core/src/tasks/mod.rs:565][E: codex-rs/core/src/tasks/mod.rs:567][E: codex-rs/core/src/tasks/mod.rs:571]
14. `shutdown` handler aborts tasks、关闭 realtime、terminate unified exec processes、shutdown guardian review session、flush rollout、发送 `ShutdownComplete`。[E: codex-rs/core/src/session/handlers.rs:923][E: codex-rs/core/src/session/handlers.rs:924][E: codex-rs/core/src/session/handlers.rs:925][E: codex-rs/core/src/session/handlers.rs:928][E: codex-rs/core/src/session/handlers.rs:929][E: codex-rs/core/src/session/handlers.rs:930][E: codex-rs/core/src/session/handlers.rs:950][E: codex-rs/core/src/session/handlers.rs:951][E: codex-rs/core/src/session/handlers.rs:966]

## Task 类型

`RegularTask` 的 `kind()` 返回 `TaskKind::Regular`，`run` 负责发送 `TurnStarted` 并循环调用 `run_turn`。[E: codex-rs/core/src/tasks/regular.rs:29][E: codex-rs/core/src/tasks/regular.rs:47][E: codex-rs/core/src/tasks/regular.rs:53][E: codex-rs/core/src/tasks/regular.rs:67][E: codex-rs/core/src/tasks/regular.rs:68]

`CompactTask` 的 `kind()` 返回 `TaskKind::Compact`，`run` 会按 provider capability 在 remote compaction 与 local compaction 之间选择。[E: codex-rs/core/src/tasks/compact.rs:15][E: codex-rs/core/src/tasks/compact.rs:30][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:43]

`ReviewTask` 的 `kind()` 返回 `TaskKind::Review`，review subagent config 会禁用 web search、spawn/collab，设置 approval never，并用 `run_codex_thread_one_shot` 执行 review。[E: codex-rs/core/src/tasks/review.rs:52][E: codex-rs/core/src/tasks/review.rs:105][E: codex-rs/core/src/tasks/review.rs:107][E: codex-rs/core/src/tasks/review.rs:111][E: codex-rs/core/src/tasks/review.rs:112][E: codex-rs/core/src/tasks/review.rs:116][E: codex-rs/core/src/tasks/review.rs:123]

## 设计动机与权衡

`Codex` 暴露 sender/receiver handle，而 `Session` 集中持有 mutable state 与 services，形成 SQ/EQ 架构；这让 API caller 与 internal state machine 解耦。[E: codex-rs/core/src/session/mod.rs:359][E: codex-rs/core/src/session/mod.rs:676][E: codex-rs/core/src/session/mod.rs:731][I]

`spawn_task` 默认 abort 当前 active tasks 后再启动新 task，降低一个 session 的主 active turn 同时跑多个 regular/compact/review task 的风险；pending input 与 mailbox 的衔接由 `maybe_start_turn_for_pending_work` 处理。[E: codex-rs/core/src/tasks/mod.rs:248][E: codex-rs/core/src/tasks/mod.rs:357][I]

`Session` 和 `SessionServices` 把 long-lived managers 放在 session 生命周期内，例如 `SessionServices.unified_exec_manager` 与 `Session.guardian_review_session`；shutdown 显式关闭这些 managers，避免 background resources 在 thread 结束后继续运行。[E: codex-rs/core/src/state/service.rs:36][E: codex-rs/core/src/session/session.rs:25][E: codex-rs/core/src/session/session.rs:647][E: codex-rs/core/src/session/handlers.rs:928][E: codex-rs/core/src/session/handlers.rs:930][I]

## gotcha

- `Codex::submit` 只是把 `Submission` 送入 channel；用户可见结果要从 `next_event` 的 `EventMsg` 读取。[E: codex-rs/core/src/session/mod.rs:677][E: codex-rs/core/src/session/mod.rs:702][E: codex-rs/core/src/session/mod.rs:703][E: codex-rs/core/src/session/mod.rs:731]
- `UserInput` 可能 steer 到 active turn，不一定启动新 `RegularTask`。[E: codex-rs/core/src/session/handlers.rs:200][E: codex-rs/core/src/session/handlers.rs:208]
- `shutdown_and_wait` 通过提交 `Op::Shutdown` 再等待 session loop termination。[E: codex-rs/core/src/session/mod.rs:720][E: codex-rs/core/src/session/mod.rs:722][E: codex-rs/core/src/session/mod.rs:727]

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
