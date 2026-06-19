---
id: tool.write-stdin
title: write_stdin 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs]
symbols: [add_shell_tools, WriteStdinHandler, WriteStdinArgs, create_write_stdin_tool, unified_exec_output_schema, WriteStdinRequest, UnifiedExecProcessManager::write_stdin, TerminalInteractionEvent, ToolSpec::Function]
related: [tool.exec-command, tool.shell-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 5670360009
---

> `write_stdin` 是 unified-exec 的续写/轮询工具：模型用 `session_id` 指向已有 `exec_command` process，传入 `chars` 可向 TTY session 写 stdin；未传或传空字符串时，它也可作为 poll，等待已有输出或最终完成。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:110][E: codex-rs/core/src/tools/handlers/shell_spec.rs:113][E: codex-rs/core/src/tools/handlers/shell_spec.rs:119][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:69][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:73][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:75][E: codex-rs/core/src/unified_exec/process_manager.rs:639][E: codex-rs/core/src/unified_exec/process_manager.rs:647]

## 能回答的问题

- `write_stdin` 的 wire name、ToolSpec 类型、具体 handler 是什么?
- 它的输入 schema、required 字段和 runtime 默认值是什么?
- 它何时随 `exec_command` 注册?
- 它怎样调用 unified-exec manager 并发出 terminal interaction event?
- 它为什么复用 unified-exec output schema?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `WriteStdinHandler::tool_name()` 返回 plain `"write_stdin"`；schema constructor 也把 `ResponsesApiTool.name` 设为 `"write_stdin"`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:34][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:36][E: codex-rs/core/src/tools/handlers/shell_spec.rs:138][E: codex-rs/core/src/tools/handlers/shell_spec.rs:139] |
| concrete handler | `WriteStdinHandler` 是独立 handler，由 `spec_plan.rs` 在 unified-exec 分支注册。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:32][E: codex-rs/core/src/tools/spec_plan.rs:653] |
| ToolSpec | `create_write_stdin_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:110][E: codex-rs/core/src/tools/handlers/shell_spec.rs:138][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:19] |
| handler contract | handler 实现 `ToolExecutor<ToolInvocation>`，`spec()` 直接返回 `create_write_stdin_tool()`，`handle()` 进入 `handle_call`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:34][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:40][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:44] |

## 2 用途定位

`write_stdin` 依赖 `exec_command` 的 running session id：unified-exec output schema 把 `session_id` 描述为 process still running 时传给 `write_stdin` 的 identifier。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:277][E: codex-rs/core/src/tools/handlers/shell_spec.rs:279] 文本输出同样在 `process_id` 存在时写出 running session id。[E: codex-rs/core/src/tools/context.rs:423][E: codex-rs/core/src/tools/context.rs:424]

空 `chars` 是 background poll；非空 `chars` 在 manager 成功后会被记录为 terminal interaction。handler 只在非空输入或 process 仍存活时发送 `TerminalInteraction` event，避免完成后的空 poll 污染 UI 事件流。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:89][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:91][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:97]

非空 stdin 受 session 形态约束：manager 只有在 TTY process 上执行 `process.write(...)`；非 TTY 时仅 Ctrl-C interrupt 特例会触发 `process.interrupt()`，其它输入返回 `StdinClosed`。因此需要交互式 stdin 的 `exec_command` 应以 `tty: true` 创建，而 `tty` schema 默认是 false。[E: codex-rs/core/src/unified_exec/process_manager.rs:639][E: codex-rs/core/src/unified_exec/process_manager.rs:640][E: codex-rs/core/src/unified_exec/process_manager.rs:641][E: codex-rs/core/src/unified_exec/process_manager.rs:642][E: codex-rs/core/src/unified_exec/process_manager.rs:644][E: codex-rs/core/src/unified_exec/process_manager.rs:647][E: codex-rs/core/src/tools/handlers/shell_spec.rs:39][E: codex-rs/core/src/tools/handlers/shell_spec.rs:41]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `session_id` | `number` | 是 | 无 | schema properties 包含 `session_id`，required 列表只要求 `session_id`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:111][E: codex-rs/core/src/tools/handlers/shell_spec.rs:113][E: codex-rs/core/src/tools/handlers/shell_spec.rs:145][E: codex-rs/core/src/tools/handlers/shell_spec.rs:147] | runtime struct 注释说明模型训练使用 `session_id`，类型是 `i32`，请求中映射为 `process_id`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:21][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:22][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:23][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:74] |
| `chars` | `string` | 否 | `""` | schema 描述该字段默认为空，可用于无写入 poll。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:119][E: codex-rs/core/src/tools/handlers/shell_spec.rs:121] | `WriteStdinArgs.chars` 带 serde default；handler 把它作为 `WriteStdinRequest.input`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:25][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:75] |
| `yield_time_ms` | `number` | 否 | serde default `250`; empty poll effective minimum `5000` | schema 描述里同时写了非空写默认 250ms 和空 poll 的 5000-300000ms 等待范围。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:125][E: codex-rs/core/src/tools/handlers/shell_spec.rs:127] | Rust args 的 serde default 统一返回 `250`；manager 随后把非空写限制在普通 yield cap 内，把空 poll clamp 到 `MIN_EMPTY_YIELD_TIME_MS` 与 background timeout 上限之间。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:27][E: codex-rs/core/src/tools/handlers/unified_exec.rs:64][E: codex-rs/core/src/tools/handlers/unified_exec.rs:65][E: codex-rs/core/src/unified_exec/mod.rs:64][E: codex-rs/core/src/unified_exec/mod.rs:67][E: codex-rs/core/src/unified_exec/mod.rs:69][E: codex-rs/core/src/unified_exec/process_manager.rs:669][E: codex-rs/core/src/unified_exec/process_manager.rs:672][E: codex-rs/core/src/unified_exec/process_manager.rs:673][E: codex-rs/core/src/unified_exec/process_manager.rs:674][E: codex-rs/core/src/unified_exec/process_manager.rs:676] |
| `max_output_tokens` | `number` | 否 | `10000 tokens` | schema 描述输出 token 预算默认 10000 tokens。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:131][E: codex-rs/core/src/tools/handlers/shell_spec.rs:133] | 请求把该值传给 manager；runtime 默认常量是 `10_000`，输出再受 truncation policy cap 并按 token policy 截断。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:77][E: codex-rs/core/src/unified_exec/mod.rs:70][E: codex-rs/core/src/unified_exec/mod.rs:177][E: codex-rs/core/src/unified_exec/mod.rs:178][E: codex-rs/core/src/tools/context.rs:401][E: codex-rs/core/src/tools/context.rs:404][E: codex-rs/core/src/tools/context.rs:406] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["session_id"]), Some(false))`，所以 schema 层 required 只有 `session_id`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:145][E: codex-rs/core/src/tools/handlers/shell_spec.rs:147][E: codex-rs/core/src/tools/handlers/shell_spec.rs:148]

## 4 输出 schema & 截断

`write_stdin` 和 `exec_command` 复用同一个 `unified_exec_output_schema()`，声明的 object 字段包括 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count`、`output`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:106][E: codex-rs/core/src/tools/handlers/shell_spec.rs:150][E: codex-rs/core/src/tools/handlers/shell_spec.rs:261][E: codex-rs/core/src/tools/handlers/shell_spec.rs:264][E: codex-rs/core/src/tools/handlers/shell_spec.rs:265][E: codex-rs/core/src/tools/handlers/shell_spec.rs:269][E: codex-rs/core/src/tools/handlers/shell_spec.rs:273][E: codex-rs/core/src/tools/handlers/shell_spec.rs:277][E: codex-rs/core/src/tools/handlers/shell_spec.rs:281][E: codex-rs/core/src/tools/handlers/shell_spec.rs:285]

`UnifiedExecProcessManager::write_stdin` 返回 `ExecCommandToolOutput`；handler 将该 response boxed 返回，因此后续使用同一个 `ExecCommandToolOutput` 文本/code-mode 输出逻辑。[E: codex-rs/core/src/unified_exec/process_manager.rs:615][E: codex-rs/core/src/unified_exec/process_manager.rs:618][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:70][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:101][E: codex-rs/core/src/tools/context.rs:366][E: codex-rs/core/src/tools/context.rs:409]

## 5 注册与门控

`add_tool_sources` 调用 `add_shell_tools`；后者没有 environment 时直接返回，不会注册 shell family。[E: codex-rs/core/src/tools/spec_plan.rs:604][E: codex-rs/core/src/tools/spec_plan.rs:605][E: codex-rs/core/src/tools/spec_plan.rs:628][E: codex-rs/core/src/tools/spec_plan.rs:631][E: codex-rs/core/src/tools/spec_plan.rs:632] 当 shell 类型是 `ConfigShellToolType::UnifiedExec` 时，`spec_plan.rs` 连续注册 `ExecCommandHandler` 和 `WriteStdinHandler`，并把 legacy `ShellCommandHandler` hidden dispatch-only 注册。[E: codex-rs/core/src/tools/spec_plan.rs:645][E: codex-rs/core/src/tools/spec_plan.rs:646][E: codex-rs/core/src/tools/spec_plan.rs:647][E: codex-rs/core/src/tools/spec_plan.rs:653][E: codex-rs/core/src/tools/spec_plan.rs:657]

shell 类型来自 feature/model 合成：UnifiedExec feature 未生效、ShellTool 关闭、ConPTY 不可用或 zsh-fork 未进入 unified-exec composition 时，`tool_config.rs` 可能回落到 `ShellCommand` 或 `Disabled`，因此 `write_stdin` 不会出现。[E: codex-rs/tools/src/tool_config.rs:67][E: codex-rs/tools/src/tool_config.rs:68][E: codex-rs/tools/src/tool_config.rs:70][E: codex-rs/tools/src/tool_config.rs:81][E: codex-rs/tools/src/tool_config.rs:102][E: codex-rs/tools/src/tool_config.rs:107][E: codex-rs/tools/src/tool_config.rs:108][E: codex-rs/tools/src/tool_config.rs:111]

## 6 parallel support

`WriteStdinHandler` 的 `ToolExecutor` impl 只定义 `tool_name`、`spec` 和 `handle`，没有自己的 `supports_parallel_tool_calls()` override。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:34][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:39][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:43] 因此它使用 `ToolExecutor` trait 默认值 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65] router 查询 registry，缺省也会回退 false。[E: codex-rs/core/src/tools/router.rs:100][E: codex-rs/core/src/tools/router.rs:102][E: codex-rs/core/src/tools/router.rs:103]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:60][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:61][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:63]
2. 它解析 `WriteStdinArgs`，调用 `session.services.unified_exec_manager.write_stdin(...)`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:69][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:70][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:72][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:73]
3. `WriteStdinRequest` 中 `process_id` 来自 `session_id`，`input` 来自 `chars`，并携带 wait/max-output/truncation policy。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:73][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:74][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:75][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:76][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:77][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:78]
4. manager 错误被转成 model-facing `write_stdin failed: ...`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:81][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:82]
5. 成功后，非空输入或仍在运行的 process 会发送 `EventMsg::TerminalInteraction`，其中 `call_id` 来自 response、`process_id` 来自 response 或原始 session id、`stdin` 来自 `chars`。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:89][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:90][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:91][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:92][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:93][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:94][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:97]
6. 最终 response 直接 boxed 返回。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:101]

## 8 hooks / edge

`write_stdin` 是已有 exec session 的传输层，不发新的 pre hook；源码注释明确空写是 background poll，非空写也只是继续一个已经跑过 Bash PreToolUse 的命令。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:105][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:110][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:111][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:112][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:113][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:114]

post hook 则可能代表原始 `exec_command` 的最终完成：`write_stdin` 调用统一 helper，该 helper从 output 派生 original exec 的 hook input/response，并使用 Bash hook name。[E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:117][E: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:124][E: codex-rs/core/src/tools/handlers/unified_exec.rs:78][E: codex-rs/core/src/tools/handlers/unified_exec.rs:86][E: codex-rs/core/src/tools/handlers/unified_exec.rs:88][E: codex-rs/core/src/tools/handlers/unified_exec.rs:90]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/core/src/unified_exec/process_manager.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`

## 相关

- [exec_command 工具](exec-command.md) — 启动 unified-exec process session 并产生可续写的 `session_id`。
- [shell_command 工具](shell-command.md) — 非 unified 或 hidden dispatch-only 的 legacy shell surface。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — process id、stdin、PTY 与 output polling 的运行时细节。
