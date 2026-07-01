---
id: subsys.core.unified-exec
title: Unified Exec
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/core/src/tools/runtimes/unified_exec.rs, codex-rs/core/src/tools/orchestrator.rs, codex-rs/core/src/unified_exec/head_tail_buffer.rs, codex-rs/core/src/unified_exec/async_watcher.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [ExecCommandHandler, WriteStdinHandler, ExecCommandArgs, WriteStdinRequest, UnifiedExecProcessManager, UnifiedExecRuntime, ToolOrchestrator, HeadTailBuffer]
related: [subsys.core.tool-system, subsys.core.tool-router, subsys.core.approval-guardian, subsys.core.session-lifecycle, tool.exec-command, tool.write-stdin]
evidence: explicit
status: verified
updated: db887d03e1
---

> Unified Exec 是 Codex 的交互式 shell/process 执行面：`spec_plan.rs` 在 unified shell type 下暴露 `exec_command` 与 `write_stdin`，handler 解析模型参数，`UnifiedExecProcessManager` 管进程生命周期，`UnifiedExecRuntime` 经 `ToolOrchestrator` 接入 approval/sandbox/retry 协议。[E: codex-rs/core/src/tools/spec_plan.rs:659][E: codex-rs/core/src/tools/spec_plan.rs:673][E: codex-rs/core/src/unified_exec/process_manager.rs:408][E: codex-rs/core/src/unified_exec/process_manager.rs:450][E: codex-rs/core/src/unified_exec/process_manager.rs:1182]

## 能回答的问题

- `exec_command` 和 `write_stdin` 的 schema/handler 在哪里？
- Unified Exec 如何保存后台进程，供后续 `write_stdin` 续接？
- approval、sandbox、network approval 和 retry 如何接入？
- 输出 delta、head/tail buffer、initial response 和结束事件如何分工？
- session shutdown 为什么会终止所有 unified exec processes？

## 1 Registration

`add_shell_tools` 只有在 turn 有 environment 时继续；当 `shell_type_for_model_and_features(...)` 返回 `ConfigShellToolType::UnifiedExec`，计划器添加 `ExecCommandHandler`、`WriteStdinHandler`，并 hidden 注册 legacy `ShellCommandHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:641][E: codex-rs/core/src/tools/spec_plan.rs:673]

`ExecCommandHandler` 的 wire name 是 `exec_command`，spec 来自 `create_exec_command_tool_with_environment_id`，并声明支持 parallel tool calls。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:80][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:94]
`WriteStdinHandler` 的 wire name 是 `write_stdin`，spec 来自 `create_write_stdin_tool()`；该 handler 没有覆盖 `supports_parallel_tool_calls`，因此走 `ToolExecutor` 默认 false。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:34][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:44][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65]

## 2 Schemas 与参数

`exec_command` schema 由 `shell_spec.rs` 创建：`cmd` 是 required，`workdir/tty/yield_time_ms/max_output_tokens` 是基础属性；`shell`、`login`、`environment_id` 和 approval 参数按 options/gates 插入；output schema 使用 unified exec output schema。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:21][E: codex-rs/core/src/tools/handlers/shell_spec.rs:107]

runtime-side `ExecCommandArgs` 要求 `cmd: String`，并解析 `shell/login/tty/yield_time_ms/max_output_tokens/sandbox_permissions/additional_permissions/justification/prefix_rule`；默认 `yield_time_ms` 是 10000，默认 `tty` 是 false。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:28][E: codex-rs/core/src/tools/handlers/unified_exec.rs:48][E: codex-rs/core/src/tools/handlers/unified_exec.rs:60][E: codex-rs/core/src/tools/handlers/unified_exec.rs:70]

`write_stdin` schema 要求 `session_id`，可选 `chars/yield_time_ms/max_output_tokens`；runtime handler 把模型字段 `session_id` 映射为 `WriteStdinRequest.process_id`，把 `chars` 映射为 input。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:110][E: codex-rs/core/src/tools/handlers/shell_spec.rs:151][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:21][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:79]

## 3 Exec Flow

`ExecCommandHandler` 只接受 Function payload；它通过 `step_context.environments` 解析 tool environment、根据 sandbox 初始选择判断是否能用 native cwd 解析参数，然后分配 process id、解析 shell command。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:120][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:132][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:157][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:180][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:238]

如果命令被识别为 apply_patch，handler 释放 process id 并返回 synthetic `ExecCommandToolOutput`，`process_id` 为 `None`，不进入 process manager。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:290][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:339]

普通命令会构造 `ExecCommandRequest`，字段包括 command、shell type、process id、yield/max output、cwd、turn environment、network、TTY、sandbox/additional permissions、justification 和 prefix rule，然后调用 `manager.exec_command(...)`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:343][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:362][E: codex-rs/core/src/unified_exec/mod.rs:92][E: codex-rs/core/src/unified_exec/mod.rs:110]

`UnifiedExecProcessManager::exec_command` 调 `open_session_with_sandbox` 启动进程，开始 output streaming，并在 initial yield wait 前把仍活着的 process 存进 process store，避免 turn interrupt drop 最后一个 `Arc` 终止后台进程。[E: codex-rs/core/src/unified_exec/process_manager.rs:408][E: codex-rs/core/src/unified_exec/process_manager.rs:416][E: codex-rs/core/src/unified_exec/process_manager.rs:450][E: codex-rs/core/src/unified_exec/process_manager.rs:454][E: codex-rs/core/src/unified_exec/process_manager.rs:470]

initial response collection 会 clamp `yield_time_ms`，从 output handles 收集到 deadline；后续 `refresh_process_state` 会把已退出进程从 store 移除，或返回仍 alive 的 process id。[E: codex-rs/core/src/unified_exec/process_manager.rs:478][E: codex-rs/core/src/unified_exec/process_manager.rs:496][E: codex-rs/core/src/unified_exec/process_manager.rs:796][E: codex-rs/core/src/unified_exec/process_manager.rs:819]

## 4 Stdin / Poll

`WriteStdinHandler` 解析 `WriteStdinArgs` 后调用 `session.services.unified_exec_manager.write_stdin(...)`；空 `chars` 是 poll，非空 `chars` 是写入 stdin。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:69][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:80]

handler 只在非空 stdin 或 response 仍有 live process id 时发送 `TerminalInteraction` event；这让空 poll 不制造无意义 UI 交互记录。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:85][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:99]

process manager 通过 `prepare_process_handles` 从 process store 找到 process/output handles；找不到时返回 `UnknownProcessId`。[E: codex-rs/core/src/unified_exec/process_manager.rs:822][E: codex-rs/core/src/unified_exec/process_manager.rs:830]

## 5 Approval / Sandbox

`open_session_with_sandbox` 构造 shell env、`CODEX_THREAD_ID` env、exec-server env config 和 `ExecApprovalRequest`，再创建 `UnifiedExecRuntime` 并调用 `ToolOrchestrator::run`。[E: codex-rs/core/src/unified_exec/process_manager.rs:1113][E: codex-rs/core/src/unified_exec/process_manager.rs:1118][E: codex-rs/core/src/unified_exec/process_manager.rs:1125][E: codex-rs/core/src/unified_exec/process_manager.rs:1131][E: codex-rs/core/src/unified_exec/process_manager.rs:1132][E: codex-rs/core/src/unified_exec/process_manager.rs:1137][E: codex-rs/core/src/unified_exec/process_manager.rs:1182]

`UnifiedExecRuntime` 的 sandbox preference 是 `Auto`，`escalate_on_failure()` 返回 true；runtime run 会根据 attempt permissions 生成 launch sandbox permissions、network env，并在本地/remote/ZshFork 路径间分流。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:147][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:150][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:294][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:323][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:368][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:416]

`ToolOrchestrator::run` 负责 approval 与 sandbox attempt；sandbox denial 后，只有 runtime 允许 escalate 且 approval/network 条件允许，才会进入 retry 路径；retry sandbox 由 `retry_sandbox_requested` 决定，该值为 false 时使用 `SandboxType::None`，否则重新 `select_initial(...)`。[E: codex-rs/core/src/tools/orchestrator.rs:134][E: codex-rs/core/src/tools/orchestrator.rs:151][E: codex-rs/core/src/tools/orchestrator.rs:297][E: codex-rs/core/src/tools/orchestrator.rs:364][E: codex-rs/core/src/tools/orchestrator.rs:404][E: codex-rs/core/src/tools/orchestrator.rs:419][E: codex-rs/core/src/tools/orchestrator.rs:426][E: codex-rs/core/src/tools/orchestrator.rs:427][E: codex-rs/core/src/tools/orchestrator.rs:435]

## 6 Output / Shutdown

`HeadTailBuffer` 默认最多保留 `UNIFIED_EXEC_OUTPUT_MAX_BYTES`，将 budget 分成 head/tail，超限时丢弃中间；snapshot 返回 head chunks 后接 tail chunks。[E: codex-rs/core/src/unified_exec/mod.rs:71][E: codex-rs/core/src/unified_exec/head_tail_buffer.rs:27][E: codex-rs/core/src/unified_exec/head_tail_buffer.rs:33][E: codex-rs/core/src/unified_exec/head_tail_buffer.rs:71][E: codex-rs/core/src/unified_exec/head_tail_buffer.rs:100]

`start_streaming_output` 后台读取 process output，写入 transcript，并在 UTF-8 边界发送 `ExecCommandOutputDelta`；单个 delta 最大 8192 bytes。[E: codex-rs/core/src/unified_exec/async_watcher.rs:35][E: codex-rs/core/src/unified_exec/async_watcher.rs:40][E: codex-rs/core/src/unified_exec/async_watcher.rs:179][E: codex-rs/core/src/unified_exec/async_watcher.rs:291]

`SessionServices` 初始化 `UnifiedExecProcessManager::new(config.background_terminal_max_timeout)`；session shutdown 会 abort tasks、shutdown conversation，然后调用 `terminate_all_processes()`。[E: codex-rs/core/src/session/session.rs:1044][E: codex-rs/core/src/session/session.rs:1056][E: codex-rs/core/src/session/session.rs:1057][E: codex-rs/core/src/session/handlers.rs:591][E: codex-rs/core/src/session/handlers.rs:592][E: codex-rs/core/src/session/handlers.rs:593][E: codex-rs/core/src/session/handlers.rs:595]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/core/src/unified_exec/process_manager.rs`
- `codex-rs/core/src/tools/runtimes/unified_exec.rs`
- `codex-rs/core/src/tools/orchestrator.rs`
- `codex-rs/core/src/unified_exec/head_tail_buffer.rs`
- `codex-rs/core/src/unified_exec/async_watcher.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [工具系统机制](tool-system.md)
- [Tool router](tool-router.md)
- [Guardian 审批流](approval-guardian.md)
- [Session 生命周期](session-lifecycle.md)
- [exec_command 工具](../../surface/tools/exec-command.md)
