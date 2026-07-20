---
id: spine.process-lifecycle
title: 进程生命周期
kind: flow
tier: T0
source: [codex-rs/cli/src/main.rs, codex-rs/arg0/src/lib.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/session/mod.rs]
symbols: [main, ThreadManagerState::spawn_thread_with_source]
related: [spine.overview, spine.sq-eq-architecture, spine.turn-end-to-end, cli.subcommands, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Codex 进程生命周期先由 CLI `main` 进入 arg0/argv1 helper dispatch，再由 `cli_main` 选择各 surface；agent runtime 边界是 `ThreadManagerState::spawn_thread_with_source` 调用 `Session::spawn`，返回 `Session` state 与 `SessionIo` endpoints。[E: codex-rs/cli/src/main.rs:956][E: codex-rs/arg0/src/lib.rs:208][E: codex-rs/core/src/thread_manager.rs:1584][E: codex-rs/core/src/thread_manager.rs:1652][E: codex-rs/core/src/session/mod.rs:471]

## 能回答的问题

- `codex` 可执行文件如何复用 argv0/argv1 helper 身份？
- TUI、exec、MCP server、app-server 在 CLI 入口如何分流？
- 一个 agent thread 何时从 process lifecycle 进入 session lifecycle？
- 为什么 `SessionConfigured` 必须作为新 thread 第一条事件？

```mermaid
flowchart TD
    OS["start codex binary"] --> MAIN["cli::main"]
    MAIN --> ARG0["arg0_dispatch_or_else"]
    ARG0 --> ALIAS["argv0/argv1 helper dispatch"]
    ARG0 --> CLI["cli_main"]
    CLI --> TUI["run_interactive_tui"]
    CLI --> EXEC["codex_exec::run_main"]
    CLI --> MCP["codex_mcp_server::run_main"]
    CLI --> APP["codex_app_server::run_main_with_transport_options"]
    TM["agent runtime entry: ThreadManagerState::spawn_thread_with_source"]
    TM --> CODEX["Session::spawn"]
    CODEX --> SESSION["Session + SessionIo + submission_loop"]
```

## 端到端步骤

1. CLI binary 的 `main` 读取 remote-control env，然后把 `cli_main` closure 交给 `arg0_dispatch_or_else`。[E: codex-rs/cli/src/main.rs:956][E: codex-rs/cli/src/main.rs:957][E: codex-rs/cli/src/main.rs:958]
2. `arg0_dispatch` 先检查 argv0：`codex-execve-wrapper` 走 shell escalation wrapper，`codex-linux-sandbox` 走 linux sandbox main，`apply_patch`/`applypatch` 走 standalone apply-patch main。[E: codex-rs/arg0/src/lib.rs:58][E: codex-rs/arg0/src/lib.rs:68][E: codex-rs/arg0/src/lib.rs:93][E: codex-rs/arg0/src/lib.rs:96]
3. `arg0_dispatch` 还检查 argv1：filesystem helper、Windows sandbox wrapper 和 `CODEX_CORE_APPLY_PATCH_ARG1` 都可以在进入普通 CLI 前被处理。[E: codex-rs/arg0/src/lib.rs:100][E: codex-rs/arg0/src/lib.rs:101][E: codex-rs/arg0/src/lib.rs:105][E: codex-rs/arg0/src/lib.rs:106][E: codex-rs/arg0/src/lib.rs:108]
4. 普通路径下，`arg0_dispatch_or_else` 创建 `codex-main` thread，在线程内构建 Tokio runtime 并运行 async main closure；`run_main_with_arg0_guard` 给 main_fn 传入 helper executable paths。[E: codex-rs/arg0/src/lib.rs:222][E: codex-rs/arg0/src/lib.rs:226][E: codex-rs/arg0/src/lib.rs:227][E: codex-rs/arg0/src/lib.rs:248][E: codex-rs/arg0/src/lib.rs:260]
5. `cli_main` 解析 `MultitoolCli`，把 `--enable/--disable` feature toggles 折叠为 config overrides，然后按 subcommand 分流。[E: codex-rs/cli/src/main.rs:968][E: codex-rs/cli/src/main.rs:977][E: codex-rs/cli/src/main.rs:978][E: codex-rs/cli/src/main.rs:987]
6. 没有 subcommand 时进入 interactive TUI；`exec` 分支调用 `codex_exec::run_main`；MCP server 分支调用 `codex_mcp_server::run_main`；VS Code app-server 分支调用 `codex_app_server::run_main_with_transport_options`。[E: codex-rs/cli/src/main.rs:987][E: codex-rs/cli/src/main.rs:1002][E: codex-rs/cli/src/main.rs:1016][E: codex-rs/cli/src/main.rs:1039][E: codex-rs/cli/src/main.rs:1045][E: codex-rs/cli/src/main.rs:1140]
7. Interactive TUI 的 retry loop 调用 `codex_tui::run_main`；本节点不展开各 surface 到 core 的桥接文件，agent runtime 的已证源码边界从下一步的 ThreadManager entry 开始。[E: codex-rs/cli/src/main.rs:2272][E: codex-rs/cli/src/main.rs:2273][E: codex-rs/cli/src/main.rs:2281][I]
8. `spawn_thread_with_source` 处理 resumed-thread 去重，加载 user instructions/parent trace，再调用 `Session::spawn(SessionSpawnArgs { ... })`。[E: codex-rs/core/src/thread_manager.rs:1584][E: codex-rs/core/src/thread_manager.rs:1606][E: codex-rs/core/src/thread_manager.rs:1628][E: codex-rs/core/src/thread_manager.rs:1652]
9. `Session::spawn` 包装 parent trace，`spawn_internal` 创建 channels、session state/services 和 background submission loop，返回 `(Arc<Session>, SessionIo)`。[E: codex-rs/core/src/session/mod.rs:471][E: codex-rs/core/src/session/mod.rs:487][E: codex-rs/core/src/session/mod.rs:533][E: codex-rs/core/src/session/mod.rs:721][E: codex-rs/core/src/session/mod.rs:726][E: codex-rs/core/src/session/mod.rs:733]
10. `finalize_thread_spawn` 先通过 `io.next_event()` 读取启动握手，要求第一条是 `SessionConfigured`/`INITIAL_SUBMIT_ID`，然后才把 session+io 组装成 `CodexThread` 插入 map。[E: codex-rs/core/src/thread_manager.rs:1699][E: codex-rs/core/src/thread_manager.rs:1705][E: codex-rs/core/src/thread_manager.rs:1711][E: codex-rs/core/src/thread_manager.rs:1720]

## 关键决策点

- argv0/argv1 helper dispatch 让一个 binary 承担 helper 和普通 CLI 多种身份；普通 Codex runtime 只在 helper dispatch 未接管时启动。[E: codex-rs/arg0/src/lib.rs:58][E: codex-rs/arg0/src/lib.rs:96][E: codex-rs/arg0/src/lib.rs:108][E: codex-rs/arg0/src/lib.rs:222]
- `SessionConfigured` first-event gate 是 thread 注册前的启动握手；不满足该约束时 `finalize_thread_spawn` 返回 `SessionConfiguredNotFirstEvent`。[E: codex-rs/core/src/thread_manager.rs:1707][E: codex-rs/core/src/thread_manager.rs:1713]
- process lifecycle 到 turn lifecycle 的边界是 `Session` 已创建、`SessionIo` 开始接收 submissions；一次 user turn 的细节属于 `spine.turn-end-to-end`。[I]

## 深挖入口

- `cli.subcommands` 应列出 `Subcommand` enum 与每个 CLI surface。
- `subsys.core.session-lifecycle` 应展开 `Session::new`、resume/fork、rollout replay。
- `spine.sq-eq-architecture` 解释 thread 创建后 SQ/EQ 如何承载请求和事件。

## Sources

- codex-rs/cli/src/main.rs
- codex-rs/arg0/src/lib.rs
- codex-rs/core/src/thread_manager.rs
- codex-rs/core/src/session/mod.rs

## 相关

- [Codex 源码总览](overview.md)
- [SQ/EQ 双队列架构](sq-eq-architecture.md)
- [一次 turn 端到端](turn-end-to-end.md)
- 索引 id：`cli.subcommands`
- [core session lifecycle](../subsystems/core/session-lifecycle.md)
