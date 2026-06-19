---
id: spine.overview
title: Codex 源码总览
kind: flow
tier: T0
source: [codex-rs/cli/src/main.rs, codex-rs/arg0/src/lib.rs, codex-rs/core/src/lib.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec_plan.rs]
symbols: [main, arg0_dispatch_or_else, ThreadManager, Codex, CodexThread, Submission, Op, EventMsg, RegularTask, run_turn, ToolRouter, build_tool_router]
related: [spine.sq-eq-architecture, spine.process-lifecycle, spine.turn-end-to-end, spine.tool-call-anatomy, subsys.core.session-lifecycle, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 5670360009
---

> Codex 的主干是一条从 CLI/arg0 dispatch 进入 core `ThreadManager`，再经 `Codex` session 的 Submission Queue、regular turn、Responses streaming、ToolRouter runtime、Event Queue 回到 UI/client 的 agent runtime。[E: codex-rs/cli/src/main.rs:955][E: codex-rs/core/src/thread_manager.rs:1344][E: codex-rs/core/src/session/mod.rs:459][E: codex-rs/core/src/session/turn.rs:1885][E: codex-rs/core/src/tools/router.rs:35]

## 能回答的问题

- CLI/TUI/exec/app-server/MCP surface 如何汇入 core？
- Thread、Session、Submission Queue、Event Queue 的主边界在哪里？
- 一次 regular turn 如何从 `Op` 到 model stream，再到 tool futures？
- 当前工具系统入口为什么是 `ToolRouter::from_turn_context` / `spec_plan::build_tool_router`？

```mermaid
flowchart TD
    CLI["cli main"] --> ARG0["arg0_dispatch_or_else"]
    ARG0 --> CLI_MAIN["cli_main / subcommands"]
    CLI_MAIN --> TM["ThreadManager"]
    TM --> SPAWN["Codex::spawn"]
    SPAWN --> SESSION["Session + Codex"]
    CLIENT["CodexThread submit"] --> SQ["Submission channel"]
    SQ --> LOOP["submission_loop"]
    LOOP --> TASK["RegularTask"]
    TASK --> TURN["run_turn"]
    TURN --> STREAM["ModelClientSession::stream"]
    TURN --> ROUTER["ToolRouter"]
    ROUTER --> SPECPLAN["spec_plan::build_tool_router"]
    STREAM --> TOOLS["handle_output_item_done -> tool futures"]
    TOOLS --> EQ["Event / rollout"]
    TURN --> EQ
```

该图是当前源码主线的压缩索引；细节以本节点下面的 evidence 为准。

## 1 Entry Surfaces

CLI binary 的 `main` 调用 `arg0_dispatch_or_else`；wrapper 调 `arg0_dispatch()` 先处理 argv0/argv1 helper dispatch，然后在运行时线程中执行传入的 async main closure。[E: codex-rs/cli/src/main.rs:955][E: codex-rs/cli/src/main.rs:960][E: codex-rs/arg0/src/lib.rs:58][E: codex-rs/arg0/src/lib.rs:100][E: codex-rs/arg0/src/lib.rs:215][E: codex-rs/arg0/src/lib.rs:221]

`cli_main` 解析 `MultitoolCli`，把 feature toggles 折叠进 config overrides，然后按 subcommand 分流到 TUI、exec、review、MCP server 等 surface。[E: codex-rs/cli/src/main.rs:963][E: codex-rs/cli/src/main.rs:977][E: codex-rs/cli/src/main.rs:1001][E: codex-rs/cli/src/main.rs:1044]

`codex-core` 是共享 runtime crate：`lib.rs` 公开 re-export `CodexThread`、`TurnContext`、`ThreadManager` 等 selected surfaces，同时以 private modules 挂载 `unified_exec`、`thread_manager`、`tools` 等内部实现。[E: codex-rs/core/src/lib.rs:21][E: codex-rs/core/src/lib.rs:31][E: codex-rs/core/src/lib.rs:103][E: codex-rs/core/src/lib.rs:110][E: codex-rs/core/src/lib.rs:143]

## 2 Thread 与 Session

`ThreadManagerState::spawn_thread_with_source` 是创建/恢复 thread 的核心入口；它会处理 resumed thread 已运行的情况，然后调用 `Codex::spawn` 并在 `finalize_thread_spawn` 中把 `Codex` 包成 `CodexThread` 登记到 thread map。[E: codex-rs/core/src/thread_manager.rs:1344][E: codex-rs/core/src/thread_manager.rs:1383][E: codex-rs/core/src/thread_manager.rs:1400][E: codex-rs/core/src/thread_manager.rs:1436][E: codex-rs/core/src/thread_manager.rs:1463]

`Codex::spawn` 初始化 session；当前 submission channel capacity 常量为 512，`Session::new` 得到 event sender 并创建 session 服务。[E: codex-rs/core/src/session/mod.rs:459][E: codex-rs/core/src/session/mod.rs:466][E: codex-rs/core/src/session/mod.rs:642][E: codex-rs/core/src/session/mod.rs:665]

协议层把输入建模成 `Submission { id, op, client_user_message_id, trace }` 和 `Op` enum，把输出建模成 `Event { id, msg }` 和 `EventMsg` enum。[E: codex-rs/protocol/src/protocol.rs:150][E: codex-rs/protocol/src/protocol.rs:158][E: codex-rs/protocol/src/protocol.rs:506][E: codex-rs/protocol/src/protocol.rs:1205][E: codex-rs/protocol/src/protocol.rs:1218]

`CodexThread::submit` 委托给 `Codex::submit`；`Codex::submit_with_trace` 生成 UUID v7 submission id 后走 `submit_with_id`，`submit_with_id` 补 trace 并发送到 SQ；`CodexThread::next_event` 委托给 `Codex::next_event` 从 EQ 取事件。[E: codex-rs/core/src/codex_thread.rs:189][E: codex-rs/core/src/session/mod.rs:698][E: codex-rs/core/src/session/mod.rs:741][E: codex-rs/core/src/codex_thread.rs:400][E: codex-rs/core/src/session/mod.rs:767]

## 3 Turn 主线

`submission_loop` 从 SQ 读取 `Submission` 并按 `Op` 分派；用户 turn path 会调用 `sess.spawn_task(..., RegularTask::new())`。[E: codex-rs/core/src/session/handlers.rs:698][E: codex-rs/core/src/session/handlers.rs:710][E: codex-rs/core/src/session/handlers.rs:260][E: codex-rs/core/src/session/handlers.rs:264]

`RegularTask` 在 run_turn 前发送 `TurnStarted`，消费 startup prewarm，然后循环调用 `run_turn`；如果一轮结束后还有 pending input，任务可继续下一次 sampling。[E: codex-rs/core/src/tasks/regular.rs:48][E: codex-rs/core/src/tasks/regular.rs:57][E: codex-rs/core/src/tasks/regular.rs:72][E: codex-rs/core/src/tasks/regular.rs:81]

`run_turn` 先做 pre-sampling compaction、context update、skills/plugins build、hooks/input recording，然后进入 sampling request。[E: codex-rs/core/src/session/turn.rs:140][E: codex-rs/core/src/session/turn.rs:166][E: codex-rs/core/src/session/turn.rs:172]

`run_sampling_request` 通过 `built_tools` 拿到 `ToolRouter`，构造 `ToolCallRuntime`，用 prompt + router 构造请求，并通过 `ModelClientSession::stream` 发起 streaming。[E: codex-rs/core/src/session/turn.rs:1049][E: codex-rs/core/src/session/turn.rs:1068][E: codex-rs/core/src/session/turn.rs:1087][E: codex-rs/core/src/session/turn.rs:1897]

`built_tools` 的当前工具系统入口是 `ToolRouter::from_turn_context(...)`，它接收 direct/deferred MCP、tool suggest、extension executors 和 dynamic tools，再进入 `spec_plan::build_tool_router`。[E: codex-rs/core/src/session/turn.rs:1273][E: codex-rs/core/src/session/turn.rs:1283][E: codex-rs/core/src/tools/router.rs:60][E: codex-rs/core/src/tools/spec_plan.rs:157]

当 stream item 完成时，`handle_output_item_done` 调 `ToolRouter::build_tool_call`；若产生 tool future，sampling loop 放入 `in_flight`，最后 `drain_in_flight` 把 tool output 写回 conversation history。[E: codex-rs/core/src/stream_events_utils.rs:405][E: codex-rs/core/src/stream_events_utils.rs:415][E: codex-rs/core/src/session/turn.rs:2031][E: codex-rs/core/src/session/turn.rs:2040][E: codex-rs/core/src/session/turn.rs:1826][E: codex-rs/core/src/session/turn.rs:1836]

事件由 `Session::send_event` 包成 `Event { id: turn_context.sub_id, msg }` 后进入 `send_event_raw`；`send_event_raw` 先持久化 rollout item，再记录 protocol event 并 deliver 到 event channel。[E: codex-rs/core/src/session/mod.rs:1676][E: codex-rs/core/src/session/mod.rs:1683][E: codex-rs/core/src/session/mod.rs:1833][E: codex-rs/core/src/session/mod.rs:1840]

## Sources

- `codex-rs/cli/src/main.rs`
- `codex-rs/arg0/src/lib.rs`
- `codex-rs/core/src/lib.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/codex_thread.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/stream_events_utils.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/spec_plan.rs`

## 相关

- [SQ/EQ 架构](sq-eq-architecture.md)
- [进程生命周期](process-lifecycle.md)
- [一次 turn 端到端](turn-end-to-end.md)
- [工具调用解剖](tool-call-anatomy.md)
- [工具系统机制](../subsystems/core/tool-system.md)
