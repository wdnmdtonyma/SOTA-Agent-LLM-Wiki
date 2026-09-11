---
id: subsys.core.unified-exec
title: Unified Exec
kind: subsystem
tier: T2
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/core/src/unified_exec/oneshot.rs, codex-rs/core/src/unified_exec/process.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/core/src/unified_exec/stdin_approval.rs, codex-rs/core/src/unified_exec/async_watcher.rs, codex-rs/core/src/unified_exec/head_tail_buffer.rs, codex-rs/core/src/tools/runtimes/unified_exec.rs, codex-rs/core/src/tools/runtimes/zsh_fork.rs, codex-rs/core/src/tools/orchestrator.rs, codex-rs/core/src/tools/approvals.rs, codex-rs/core/src/exec.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/tools/src/tool_config.rs, codex-rs/features/src/lib.rs]
symbols: [UnifiedExecProcess, UnifiedExecProcessManager, UnifiedExecRuntime, UnifiedExecApprovalKey, UnifiedExecShellMode, HeadTailBuffer, format_output_omission_marker, unified_exec_output_schema]
related: [subsys.core.tool-system, subsys.core.tool-router, subsys.core.approval-guardian, subsys.core.session-lifecycle, tool.exec-command, tool.write-stdin]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Unified Exec 是 Codex 当前唯一的命令执行面：`add_shell_tools` 只注册 `ExecCommandHandler`；`Feature::UnifiedExec` 开则加 `WriteStdinHandler`，关则 `ExecCommandHandler::one_shot`。`Feature::UnifiedExecTty`（key `unified_exec_tty`，默认 true）控制 schema 是否暴露 `tty` 以及 runtime 是否允许 PTY。handler 解析模型参数，`UnifiedExecProcessManager` 管进程生命周期，`UnifiedExecRuntime` 经 `ToolOrchestrator` 接入 approval/sandbox。已删除的 `ShellCommandHandler` / `ShellRuntime` 不再参与。[E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/spec_plan.rs:1111][E: codex-rs/features/src/lib.rs:950][E: codex-rs/core/src/unified_exec/process_manager.rs:488]

## 能回答的问题

- `exec_command` 和 `write_stdin` 的 schema/handler 在哪里？
- Windows 默认为什么也会走 Unified Exec？
- Guardian reviewer turn 如何只拿到 unified-exec 工具？
- Unified Exec 如何保存后台进程，供后续 `write_stdin` 续接？
- one-shot 模式为什么没有 resumable process？
- approval、sandbox、network approval 和 retry 如何接入？
- 输出 delta、head/tail buffer、initial response 和结束事件如何分工？
- session shutdown 为什么会终止所有 unified exec processes？

## 1 Registration

`add_shell_tools` 只有在 turn 有 environment、`Feature::ShellTool` 开启、且模型 shell type 不是 Disabled 时继续。[E: codex-rs/core/src/tools/spec_plan.rs:1083] `Feature::UnifiedExec` 开启时注册 `ExecCommandHandler::new` + `WriteStdinHandler`；关闭时只注册 `ExecCommandHandler::one_shot`，**不再**注册 `ShellCommandHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/spec_plan.rs:1111]

`Feature::UnifiedExec` 全平台默认 `true`（含 Windows）。[E: codex-rs/features/src/lib.rs:943][E: codex-rs/features/src/lib.rs:946] `Feature::UnifiedExecTty`（`unified_exec_tty`）同样默认 `true`，但可关掉：`allow_tty` 来自该 flag，handler 在 flag 关闭时从 spec 删除 `tty`。[E: codex-rs/features/src/lib.rs:949][E: codex-rs/core/src/tools/spec_plan.rs:1095][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:131] zsh-fork 不再改 shell type，而是 session 级 `UnifiedExecShellMode::for_session`：Unix + ShellTool + UnifiedExec + ShellZshFork + UnifiedExecZshFork + 用户 shell 是 Zsh + 两条 path 都能转成 `AbsolutePathBuf` 时才进 `ZshFork`，否则 `Direct`。[E: codex-rs/tools/src/tool_config.rs:41]

Guardian reviewer source 不会走 `add_shell_tools`。`add_core_tool_sources` 在 `is_basic_session_source` 时提前返回：非 Managed permission profile 不注册任何 core tool；Managed 且有 environment 时，还要求 ShellTool + UnifiedExec 且模型不是 Disabled，才注册 interactive `exec_command`、`write_stdin` 和可选 `view_image`。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:994][E: codex-rs/core/src/tools/spec_plan.rs:1014]

`ExecCommandHandler` 的 wire name 是 `exec_command`，`new` 是 Interactive，`one_shot` 是 OneShot，并声明支持 parallel tool calls。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:104][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:104][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:113][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:142]
`WriteStdinHandler` 的 wire name 是 `write_stdin`；该 handler 也显式覆盖 `supports_parallel_tool_calls()` 为 true。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:38][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:45]

## 2 Schemas 与参数

`exec_command` schema 由 `shell_spec.rs` 创建：`cmd` 是 required，`workdir/tty/yield_time_ms/max_output_tokens` 是基础属性；`shell`、`login`、`environment_id` 和 approval 参数按 options/gates 插入；output schema 使用 unified exec output schema。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:110][E: codex-rs/core/src/tools/handlers/shell_spec.rs:113]

runtime-side `ExecCommandArgs` 要求 `cmd: String`，并解析 `shell/login/tty/yield_time_ms/timeout_ms/max_output_tokens/sandbox_permissions/additional_permissions/justification/prefix_rule`；默认 `yield_time_ms` 是 10000，默认 `tty` 是 false。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:28][E: codex-rs/core/src/tools/handlers/unified_exec.rs:63][E: codex-rs/core/src/tools/handlers/unified_exec.rs:70]

OneShot spec 删除 `tty`/`yield_time_ms`，加入 `timeout_ms`（默认 10000 ms），并从 output schema 删除 `session_id`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:496][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:498][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:510]

Windows 上 initial exec 的有效 yield 下限是 10000 ms；其它平台下限是 250 ms，上限均为 30000 ms，tool description 与 runtime `clamp_yield_time` 使用相同边界。[E: codex-rs/core/src/unified_exec/mod.rs:73][E: codex-rs/core/src/unified_exec/mod.rs:74][E: codex-rs/core/src/unified_exec/mod.rs:210]

`write_stdin` schema 要求 `session_id`，可选 `chars/yield_time_ms/max_output_tokens`；runtime handler 把模型字段 `session_id` 映射为 `WriteStdinRequest.process_id`，把 `chars` 映射为 input。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:154][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:90]

## 3 Exec Flow

`ExecCommandHandler` 只接受 Function payload；它通过 `step_context.environments` 解析 tool environment，校验 sandbox/justification，分配 process id，再解析 shell command。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:170][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:187]

如果命令被识别为 apply_patch，handler 释放 process id 并返回 synthetic `ExecCommandToolOutput`，`process_id` 为 `None`，不进入 process manager。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:412][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:405]

普通命令构造 `ExecCommandRequest` 后：Interactive 走 `manager.exec_command`；OneShot 走 `exec_command_to_completion`，强制 `tty=false`，timeout 默认 `DEFAULT_EXEC_COMMAND_TIMEOUT_MS`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:468][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:312]

`UnifiedExecProcessManager::exec_command` 调 `exec_command_inner` → `open_session_with_sandbox` 启动进程。[E: codex-rs/core/src/unified_exec/process_manager.rs:488][E: codex-rs/core/src/unified_exec/process_manager.rs:497]

process id 由 `allocate_process_id` 预留，失败或完成后由 `release_process_id` 释放。[E: codex-rs/core/src/unified_exec/process_manager.rs:447][E: codex-rs/core/src/unified_exec/process_manager.rs:474]

sandbox denial 在 handler 侧是 terminal：`process_id: None`，因此不能再由 `write_stdin` 续写。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:468]

## 4 Stdin / Poll

`WriteStdinHandler` 解析 `WriteStdinArgs` 后调用 `session.services.unified_exec_manager.write_stdin(...)`；空 `chars` 是 poll，非空 `chars` 是写入 stdin。handler 把 `WriteStdinInteractionEvent` 放进 request，自己不再直接发 UI event。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:87][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:100]

manager 只在非空 stdin 或 response 仍有 live process id 时发送 `TerminalInteraction` event；这让空 poll 不制造无意义 UI 交互记录。[E: codex-rs/core/src/unified_exec/process_manager.rs:1047][E: codex-rs/core/src/unified_exec/process_manager.rs:1060]

同一个 terminal 的 poll/write 由 process-owned `interaction_lock` 串行化，避免共享 draining output buffer 与 lifecycle 重叠；不同 terminal 仍可并发。[E: codex-rs/core/src/unified_exec/process_manager.rs:835]

`Feature::WriteStdinApproval` 开启时，非空 stdin 可走 `ProcessEntry::stdin_approval`；空输入、非 TTY 上的 `\u{3}`、或 feature 关闭则 skip。[E: codex-rs/core/src/unified_exec/stdin_approval.rs:185][E: codex-rs/core/src/unified_exec/stdin_approval.rs:190]

非 TTY 时仅 Ctrl-C (`INTERRUPT`) 可 `interrupt()`，其它输入返回 `StdinClosed`。[E: codex-rs/core/src/unified_exec/process_manager.rs:924][E: codex-rs/core/src/unified_exec/process_manager.rs:927]

空 poll 的 yield clamp 到 `MIN_EMPTY_YIELD_TIME_MS`（5000）与 `max_write_stdin_yield_time_ms`；非空写上限 `MAX_YIELD_TIME_MS`（30000）。[E: codex-rs/core/src/unified_exec/process_manager.rs:957][E: codex-rs/core/src/unified_exec/mod.rs:76]

## 5 Approval / Sandbox

`open_session_with_sandbox` 构造 shell env、`CODEX_THREAD_ID` env、exec-server env config，再创建 `UnifiedExecRuntime` 并调用 `ToolOrchestrator::run`。[E: codex-rs/core/src/unified_exec/process_manager.rs:1373][E: codex-rs/core/src/unified_exec/process_manager.rs:1390]

`UnifiedExecRuntime` 的 sandbox preference 是 `Auto`，`escalate_on_failure()` 返回 true。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:162][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:166]

approval cache key 是 `UnifiedExecApprovalKey`：environment_id、executable、command、cwd（`PathUri`）、tty、sandbox_permissions、additional_permissions。`ApprovalAction::ExecCommand` 从这些字段构造 cache key。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:95][E: codex-rs/core/src/tools/approvals.rs:248]

ZshFork 路径：runtime 调 `maybe_prepare_unified_exec`，Unix 上再进 `prepare_unified_exec_zsh_fork`。[E: codex-rs/core/src/tools/runtimes/zsh_fork.rs:20][E: codex-rs/core/src/tools/runtimes/zsh_fork.rs:69]

进程退出检查会把 executor-reported denial 与本地启发式合并；若进程尚未退出，或 executor 未报告 denial 且 sandbox 是 `SandboxType::None`，则跳过本地 backend 归因。[E: codex-rs/core/src/unified_exec/process.rs:313]

## 6 Output / Shutdown

`HeadTailBuffer` 默认最多保留 `UNIFIED_EXEC_OUTPUT_MAX_BYTES`（1 MiB），将 budget 分成 head/tail 并精确累计 omitted bytes。[E: codex-rs/core/src/unified_exec/mod.rs:80][E: codex-rs/core/src/unified_exec/head_tail_buffer.rs:11]

`start_streaming_output` 后台读取 process output，写入 transcript，并在 UTF-8 边界发送 `ExecCommandOutputDelta`。[E: codex-rs/core/src/unified_exec/async_watcher.rs:60]

`SessionServices` 初始化 `UnifiedExecProcessManager::new(config.background_terminal_max_timeout)`；session shutdown 调用 `terminate_all_processes()`。[E: codex-rs/core/src/session/session.rs:1512][E: codex-rs/core/src/session/handlers.rs:427]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/core/src/unified_exec/oneshot.rs`
- `codex-rs/core/src/unified_exec/process.rs`
- `codex-rs/core/src/unified_exec/process_manager.rs`
- `codex-rs/core/src/unified_exec/stdin_approval.rs`
- `codex-rs/core/src/unified_exec/async_watcher.rs`
- `codex-rs/core/src/unified_exec/head_tail_buffer.rs`
- `codex-rs/core/src/tools/runtimes/unified_exec.rs`
- `codex-rs/core/src/tools/runtimes/zsh_fork.rs`
- `codex-rs/core/src/tools/orchestrator.rs`
- `codex-rs/core/src/tools/approvals.rs`
- `codex-rs/core/src/exec.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [工具系统机制](tool-system.md)
- [Tool router](tool-router.md)
- [Guardian 审批流](approval-guardian.md)
- [Session 生命周期](session-lifecycle.md)
- [exec_command 工具](../../surface/tools/exec-command.md)
