---
id: tool.write-stdin
title: write_stdin 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/core/src/unified_exec/stdin_approval.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/features/src/lib.rs]
symbols: [WriteStdinHandler, WriteStdinArgs, create_write_stdin_tool, WriteStdinRequest, UnifiedExecProcessManager::write_stdin, ProcessEntry::stdin_approval, TerminalInteractionEvent]
related: [tool.exec-command, tool.shell-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `write_stdin` 是 unified-exec 的续写/轮询工具：模型用 `session_id` 指向已有 `exec_command` process，传入 `chars` 可向 TTY session 写 stdin；未传或传空字符串时，它也可作为 poll，等待已有输出或最终完成。它只在 `Feature::UnifiedExec` 开启时与 interactive `ExecCommandHandler` 一起注册；one-shot 路径不暴露该工具。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:117][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:90][E: codex-rs/core/src/tools/spec_plan.rs:1110]

## 能回答的问题

- `write_stdin` 的 wire name、ToolSpec 类型、具体 handler 是什么？
- 它的输入 schema、required 字段和 runtime 默认值是什么？
- 它何时随 `exec_command` 注册，Guardian reviewer 是否也能看到它？
- 它怎样调用 unified-exec manager 并发出 terminal interaction event？
- `Feature::WriteStdinApproval` 何时对非空 stdin 走 approval？
- 它为什么复用 unified-exec output schema？
- 它是否支持 parallel tool calls？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `WriteStdinHandler::tool_name()` 返回 plain `"write_stdin"`；schema constructor 也把 `ResponsesApiTool.name` 设为 `"write_stdin"`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:38][E: codex-rs/core/src/tools/handlers/shell_spec.rs:146] |
| concrete handler | `WriteStdinHandler` 是独立 handler，由 `spec_plan.rs` 在 unified-exec 分支和 Guardian reviewer 分支注册。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:34][E: codex-rs/core/src/tools/spec_plan.rs:1021][E: codex-rs/core/src/tools/spec_plan.rs:1112] |
| ToolSpec | `create_write_stdin_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:145] |
| handler contract | handler 实现 `ToolExecutor<ToolInvocation>`，`spec()` 直接返回 `create_write_stdin_tool()`，`supports_parallel_tool_calls()` 返回 `true`，`handle()` 进入 `handle_call`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:41][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:45][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:49] |

## 2 用途定位

`write_stdin` 依赖 `exec_command` 的 running session id：unified-exec output schema 把 `session_id` 描述为 process still running 时传给 `write_stdin` 的 identifier。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:214] 文本输出同样在 `process_id` 存在时写出 running session id。[E: codex-rs/core/src/tools/context.rs:505]

空 `chars` 是 background poll；非空 `chars` 在 manager 成功后会被记录为 terminal interaction。handler 本身不再发 event，而是把 `WriteStdinInteractionEvent` 交给 manager；manager 只在非空输入或 process 仍存活时发送 `TerminalInteraction`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:95][E: codex-rs/core/src/unified_exec/process_manager.rs:1024][E: codex-rs/core/src/unified_exec/process_manager.rs:1037]

非空 stdin 受 session 形态约束：manager 只有在 TTY process 上执行 `process.write(...)`；非 TTY 时仅 Ctrl-C interrupt 特例（`INTERRUPT = "\u{3}"`）会触发 `process.interrupt()`，其它输入返回 `StdinClosed`。[E: codex-rs/core/src/unified_exec/process_manager.rs:900][E: codex-rs/core/src/unified_exec/process_manager.rs:901][E: codex-rs/core/src/unified_exec/process_manager.rs:904][E: codex-rs/core/src/unified_exec/process_manager.rs:103] 因此需要交互式 stdin 的 `exec_command` 应以 `tty: true` 创建，而 `tty` serde 默认是 `default_tty() -> false`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:70]

`Feature::WriteStdinApproval` 开启时，非空 stdin 可能在写入前走 `ProcessEntry::stdin_approval`；空输入、非 TTY 上的 `\u{3}`、或 feature 关闭则跳过。[E: codex-rs/core/src/unified_exec/stdin_approval.rs:185][E: codex-rs/core/src/unified_exec/stdin_approval.rs:190][E: codex-rs/features/src/lib.rs:1124]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `session_id` | `number` | 是 | 无 | schema properties 包含 `session_id`，required 列表只要求 `session_id`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:120][E: codex-rs/core/src/tools/handlers/shell_spec.rs:154] | runtime struct 字段类型是 `i32`，请求中映射为 `process_id`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:25][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:90] |
| `chars` | `string` | 否 | `""` | schema 描述该字段默认为空，可用于无写入 poll。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:128] | `WriteStdinArgs.chars` 带 serde default；handler 把它作为 `WriteStdinRequest.input`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:27][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:91] |
| `yield_time_ms` | `number` | 否 | serde default `250`; empty poll effective minimum `5000` | schema 描述里同时写了非空写默认 250ms 和空 poll 的 5000-300000ms 等待范围。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:134] | Rust args 的 serde default 统一返回 `250`；manager 随后把非空写限制在 `MAX_YIELD_TIME_MS`（30000），把空 poll clamp 到 `MIN_EMPTY_YIELD_TIME_MS` 与 `max_write_stdin_yield_time_ms` 之间。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:67][E: codex-rs/core/src/unified_exec/mod.rs:76][E: codex-rs/core/src/unified_exec/mod.rs:77][E: codex-rs/core/src/unified_exec/process_manager.rs:934] |
| `max_output_tokens` | `number` | 否 | `10000 tokens` | schema 描述输出 token 预算默认 10000 tokens。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:140] | 请求把该值传给 manager；runtime 默认常量是 `10_000`，输出再受 truncation policy cap 并按 token policy 截断。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:93][E: codex-rs/core/src/unified_exec/mod.rs:79][E: codex-rs/core/src/tools/context.rs:449] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["session_id"]), Some(false))`，所以 schema 层 required 只有 `session_id`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:154]

## 4 输出 schema & 截断

`write_stdin` 和 `exec_command` 复用同一个 `unified_exec_output_schema()`，声明的 object 字段包括 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count`、`output`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:157][E: codex-rs/core/src/tools/handlers/shell_spec.rs:198]

`UnifiedExecProcessManager::write_stdin` 返回 `ExecCommandToolOutput`；handler 将该 response boxed 返回，因此后续使用同一个 `ExecCommandToolOutput` 文本/code-mode 输出逻辑。[E: codex-rs/core/src/unified_exec/process_manager.rs:803][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:115][E: codex-rs/core/src/tools/context.rs:414]

## 5 注册与门控

`add_core_tool_sources` 对 Guardian reviewer 提前返回：需 Managed permission profile、有 environment、且 `Feature::ShellTool` + `Feature::UnifiedExec` + 模型 shell type 不是 Disabled，才连续注册 interactive `ExecCommandHandler` 与 `WriteStdinHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:989][E: codex-rs/core/src/tools/spec_plan.rs:1005][E: codex-rs/core/src/tools/spec_plan.rs:1021]

普通 turn 走 `add_shell_tools`。没有 environment / ShellTool 关 / 模型 Disabled 时不注册。[E: codex-rs/core/src/tools/spec_plan.rs:1090] `Feature::UnifiedExec` 开启时注册 `ExecCommandHandler::new` + `WriteStdinHandler`；关闭时只注册 `ExecCommandHandler::one_shot`，**不**注册 `write_stdin`。[E: codex-rs/core/src/tools/spec_plan.rs:1110][E: codex-rs/core/src/tools/spec_plan.rs:1117]

`Feature::WriteStdinApproval` 当前 stage 是 UnderDevelopment，默认 `false`。[E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1127]

## 6 parallel support

`WriteStdinHandler::supports_parallel_tool_calls()` 显式返回 true，因此 router 可将对不同 exec sessions 的交互视为 parallel-safe。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:45][E: codex-rs/core/src/tools/router.rs:235]

同一 terminal 的 poll/write 由 process-owned `interaction_lock` 串行化；不同 process id 仍可并发。[E: codex-rs/core/src/unified_exec/process_manager.rs:817]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:73]
2. 它解析 `WriteStdinArgs`，建立 `UnifiedExecContext`，调用 `session.services.unified_exec_manager.write_stdin(...)`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:81][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:87]
3. `WriteStdinRequest` 中 `process_id` 来自 `session_id`，`input` 来自 `chars`，并携带 wait/max-output/truncation policy 和 optional interaction event。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:90]
4. manager 先按 process id 取 process、加 `interaction_lock`，再调用 `entry.stdin_approval(...)`；需要审批时走 `session.request_approval`。[E: codex-rs/core/src/unified_exec/process_manager.rs:817][E: codex-rs/core/src/unified_exec/process_manager.rs:831][E: codex-rs/core/src/unified_exec/process_manager.rs:877]
5. manager 错误被转成 model-facing 文本：sandbox/policy reject 是 `write_stdin rejected: ...`，审批失败是 `write_stdin approval failed: ...`，其余是 `write_stdin failed: ...`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:104][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:108][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:110]
6. manager 在非空输入或仍在运行的 process 上发送 `EventMsg::TerminalInteraction`，其中 `call_id` 来自 response、`process_id` 来自 response 或原始 session id、`stdin` 来自 `chars`。[E: codex-rs/core/src/unified_exec/process_manager.rs:1024][E: codex-rs/core/src/unified_exec/process_manager.rs:1028]
7. 最终 response 直接 boxed 返回。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:115]

## 8 hooks / edge

`write_stdin` 是已有 exec session 的传输层，不发新的 pre hook；`pre_tool_use_payload` 当前直接返回 `None`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:124]

post hook 则可能代表原始 `exec_command` 的最终完成：`write_stdin` 调用统一 helper，该 helper 从 output 派生 original exec 的 hook input/response，并使用 Bash hook name。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:138][E: codex-rs/core/src/tools/handlers/unified_exec.rs:92]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/core/src/unified_exec/process_manager.rs`
- `codex-rs/core/src/unified_exec/stdin_approval.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [exec_command 工具](exec-command.md) — 启动 unified-exec process session 并产生可续写的 `session_id`。
- [shell_command（已退役）](shell-command.md) — reserved name；不再注册 handler。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — process id、stdin、PTY 与 output polling 的运行时细节。
