---
id: tool.write-stdin
title: write_stdin 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/local_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/context.rs]
symbols: [create_write_stdin_tool, ToolHandlerKind::UnifiedExec, UnifiedExecHandler, WriteStdinArgs]
related: [tool.exec-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `write_stdin` 工具是 unified-exec 的续写/轮询 function:模型用 `session_id` 找到仍在运行的 `exec_command` session，写入 `chars`，并等待新输出或完成。[E: codex-rs/tools/src/local_tool.rs:95][E: codex-rs/tools/src/local_tool.rs:102][E: codex-rs/core/src/tools/handlers/unified_exec.rs:372]

## 能回答的问题

- `write_stdin` 的 wire name、handler kind 和 handler 是什么?
- `write_stdin` 的输入 schema 和 runtime 默认值是什么?
- 为什么 `write_stdin` 不支持 parallel tool calls?
- `write_stdin` 如何把 stdin 交给 `UnifiedExecProcessManager`?
- `write_stdin` 的输出 schema 为什么和 `exec_command` 相同?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `write_stdin`; `create_write_stdin_tool` 把 `ResponsesApiTool.name` 固定为 `"write_stdin"`。[E: codex-rs/tools/src/local_tool.rs:121] |
| aliases | 无 alias；registry plan 直接注册 `"write_stdin"` 到 `ToolHandlerKind::UnifiedExec`。[E: codex-rs/tools/src/tool_registry_plan.rs:170] |
| ToolHandlerKind | `ToolHandlerKind::UnifiedExec` 是 registry plan 的 handler kind；`exec_command` 与 `write_stdin` 都注册到它。[E: codex-rs/tools/src/tool_registry_plan_types.rs:40][E: codex-rs/tools/src/tool_registry_plan.rs:169][E: codex-rs/tools/src/tool_registry_plan.rs:170] |
| concrete handler | `core/src/tools/spec.rs` 创建共享 `UnifiedExecHandler`，并把 `ToolHandlerKind::UnifiedExec` 注册到该 handler。[E: codex-rs/core/src/tools/spec.rs:149][E: codex-rs/core/src/tools/spec.rs:282] |
| 所属 crate | schema 在 `codex_tools::local_tool`; runtime handler 在 `codex_core::tools::handlers::unified_exec`。[E: codex-rs/tools/src/local_tool.rs:92][E: codex-rs/core/src/tools/handlers/unified_exec.rs:41] |

## 2 用途定位

`write_stdin` 只在 unified-exec shell surface 下出现，并依赖 `exec_command` 返回的 live process id。[E: codex-rs/tools/src/tool_registry_plan.rs:165][E: codex-rs/core/src/tools/context.rs:456] 该工具可以写入非空 stdin，也可以让 `chars` 默认为空来轮询已有输出，因为 `WriteStdinArgs.chars` 有 serde default，默认 empty string。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:72][E: codex-rs/core/src/tools/handlers/unified_exec.rs:73]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `session_id` | `number` | 是 | 无 | schema 描述为 running unified exec session 的 identifier。[E: codex-rs/tools/src/local_tool.rs:96][E: codex-rs/tools/src/local_tool.rs:98] | runtime struct 注释说明模型训练使用 `session_id`，类型是 `i32`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:70][E: codex-rs/core/src/tools/handlers/unified_exec.rs:71] |
| `chars` | `string` | 否 | `""` | schema 描述为写入 stdin 的 bytes，可为空用于 poll。[E: codex-rs/tools/src/local_tool.rs:102][E: codex-rs/tools/src/local_tool.rs:103] | `WriteStdinArgs.chars` 带 serde default，未提供时为空 string。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:72][E: codex-rs/core/src/tools/handlers/unified_exec.rs:73] |
| `yield_time_ms` | `number` | 否 | 250 | schema 描述为等待输出的毫秒数。[E: codex-rs/tools/src/local_tool.rs:108][E: codex-rs/tools/src/local_tool.rs:110] | runtime default 函数返回 `250`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:74][E: codex-rs/core/src/tools/handlers/unified_exec.rs:85] |
| `max_output_tokens` | `number` | 否 | runtime resolve | schema 描述为最大返回 token 数。[E: codex-rs/tools/src/local_tool.rs:114][E: codex-rs/tools/src/local_tool.rs:116] | output truncation 由 `ExecCommandToolOutput::truncated_output` 执行。[E: codex-rs/core/src/tools/context.rs:437][E: codex-rs/core/src/tools/context.rs:438] |

`create_write_stdin_tool` 的 required 列表只包含 `session_id`，并关闭 additional properties。[E: codex-rs/tools/src/local_tool.rs:129][E: codex-rs/tools/src/local_tool.rs:130]

## 4 输出 schema & 截断

`write_stdin` 复用 `unified_exec_output_schema()`，因此声明的 output object 与 `exec_command` 相同:包含 chunk id、wall time、exit code、session id、original token count 和 output。[E: codex-rs/tools/src/local_tool.rs:132][E: codex-rs/tools/src/local_tool.rs:303][E: codex-rs/tools/src/local_tool.rs:325]

直接返回给模型时，`ExecCommandToolOutput::response_text()` 会把 process still running 写成 `Process running with session ID ...`，完成时可以写 exit code，并统一附加 `Output:` 文本。[E: codex-rs/core/src/tools/context.rs:452][E: codex-rs/core/src/tools/context.rs:456][E: codex-rs/core/src/tools/context.rs:463]

## 5 ToolSpec 类型

`write_stdin` 是 `ToolSpec::Function`，因为它是 JSON object 输入的 Responses API function tool。[E: codex-rs/tools/src/local_tool.rs:120][E: codex-rs/tools/src/local_tool.rs:127] 该 Function 形态让 `session_id` 成为显式 required 字段，而不是把 stdin/control 信息塞进 shell command 字符串。[I]

## 6 注册与门控

`write_stdin` 只在 `config.has_environment` 为 true 且 `config.shell_type == ConfigShellToolType::UnifiedExec` 时注册。[E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:155] registry plan 先推入 `exec_command`，再推入 `write_stdin`，并分别注册两个 wire name 到 `ToolHandlerKind::UnifiedExec`。[E: codex-rs/tools/src/tool_registry_plan.rs:156][E: codex-rs/tools/src/tool_registry_plan.rs:165][E: codex-rs/tools/src/tool_registry_plan.rs:170]

`ToolsConfig::new` 只有在 shell feature 启用、unified exec feature 启用、环境允许 unified exec 且 ConPTY 可用时选择 `ConfigShellToolType::UnifiedExec`；否则可能回退到 `ShellCommand`。[E: codex-rs/tools/src/tool_config.rs:175][E: codex-rs/tools/src/tool_config.rs:179][E: codex-rs/tools/src/tool_config.rs:183]

## 7 parallel-safe

`write_stdin` 的 plan-level `supports_parallel_tool_calls` 是 false。[E: codex-rs/tools/src/tool_registry_plan.rs:165][E: codex-rs/tools/src/tool_registry_plan.rs:166] 设计动机是 `write_stdin` 针对一个已有 process session 的顺序交互；并行写同一 session 会让 stdin 和 output ordering 难以预测。[I]

## 8 handler 走读

1. Responses API function call 进入 `ToolRouter::build_tool_call`，成为 `ToolPayload::Function { arguments }`。[E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:200]
2. `ToolRegistry` 根据 `"write_stdin"` 找到 `UnifiedExecHandler`，并通过 `matches_kind` 确认是 function payload。[E: codex-rs/core/src/tools/registry.rs:307][E: codex-rs/core/src/tools/handlers/unified_exec.rs:100]
3. `UnifiedExecHandler::handle` 进入 `tool_name.name == "write_stdin"` 分支，解析 `WriteStdinArgs`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:370][E: codex-rs/core/src/tools/handlers/unified_exec.rs:371]
4. handler 调用 `manager.write_stdin(WriteStdinRequest { process_id, input, yield_time_ms, max_output_tokens })`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:372][E: codex-rs/core/src/tools/handlers/unified_exec.rs:377]
5. 成功后 handler 发送 `EventMsg::TerminalInteraction`，其中 `process_id` 来自 `session_id`，`stdin` 来自 `chars`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:384][E: codex-rs/core/src/tools/handlers/unified_exec.rs:386][E: codex-rs/core/src/tools/handlers/unified_exec.rs:387]
6. handler 返回 `ExecCommandToolOutput`，后续由通用 `ToolOutput` 逻辑转成 function-call output。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:92][E: codex-rs/core/src/tools/handlers/unified_exec.rs:393][E: codex-rs/core/src/tools/context.rs:386]

## 9 设计动机·edge·历史

`write_stdin` 的 `chars` 默认为空使“poll without writing”成为同一 API 的自然行为；这减少了另设 `poll_exec` 工具的必要性。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:72][I]

`write_stdin` 与 `exec_command` 共用 `UnifiedExecHandler` 和 output type，保证启动命令、写 stdin、轮询输出的截断和 response formatting 一致。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:92][E: codex-rs/core/src/tools/handlers/unified_exec.rs:199][E: codex-rs/core/src/tools/handlers/unified_exec.rs:370][I]

## Sources

- `codex-rs/tools/src/local_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/context.rs`

## 相关

- [exec_command 工具](exec-command.md) — 启动 unified-exec process session。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — 管理 process id、PTY、stdin 和 output polling。
