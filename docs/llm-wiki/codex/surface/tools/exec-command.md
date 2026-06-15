---
id: tool.exec-command
title: exec_command 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/local_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/responses_api.rs, codex-rs/protocol/src/models.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/context.rs]
symbols: [create_exec_command_tool, CommandToolOptions, ToolHandlerKind::UnifiedExec, UnifiedExecHandler, ExecCommandArgs]
related: [tool.write-stdin, tool.shell, tool.shell-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `exec_command` 工具是 Codex 的 unified-exec 单命令 function surface:模型传一段 shell command 字符串，runtime 可以返回终止输出，也可以返回可继续交互的 `session_id` 给 `write_stdin`。[E: codex-rs/tools/src/local_tool.rs:22][E: codex-rs/tools/src/tool_registry_plan.rs:164][E: codex-rs/core/src/tools/context.rs:456]

## 能回答的问题

- `exec_command` 的 wire name、`ToolHandlerKind` 和 handler 是什么?
- `exec_command` 的输入字段、默认值、审批字段如何定义?
- `exec_command` 的 output schema 与实际输出文本/CodeMode JSON 之间是什么关系?
- `exec_command` 什么时候注册，如何受 `ConfigShellToolType::UnifiedExec` 门控?
- `exec_command` 是否支持 parallel tool calls，为什么 `write_stdin` 不支持?
- `UnifiedExecHandler` 如何处理 `exec_command`，如何分配 process id、执行、截断、回传?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `exec_command`; `create_exec_command_tool` 把 `ResponsesApiTool.name` 固定为 `"exec_command"`。[E: codex-rs/tools/src/local_tool.rs:71] |
| aliases | registry plan 直接给 `"exec_command"` 注册 `ToolHandlerKind::UnifiedExec`。[E: codex-rs/tools/src/tool_registry_plan.rs:169] |
| ToolHandlerKind | `ToolHandlerKind::UnifiedExec` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:40] |
| concrete handler | `core/src/tools/spec.rs` 创建共享 `UnifiedExecHandler`，并把 `ToolHandlerKind::UnifiedExec` 注册到该 handler。[E: codex-rs/core/src/tools/spec.rs:149][E: codex-rs/core/src/tools/spec.rs:282] |
| 所属 crate | schema 在 `codex_tools::local_tool`; runtime handler 在 `codex_core::tools::handlers::unified_exec`。[E: codex-rs/tools/src/local_tool.rs:19][E: codex-rs/core/src/tools/handlers/unified_exec.rs:41] |

## 2 用途定位

`exec_command` 是 `ConfigShellToolType::UnifiedExec` 分支暴露的主执行工具，和 `write_stdin` 配套:前者启动/轮询命令，后者向仍在运行的 process session 写 stdin。[E: codex-rs/tools/src/tool_registry_plan.rs:155][E: codex-rs/tools/src/tool_registry_plan.rs:165][E: codex-rs/tools/src/tool_registry_plan.rs:170] `UnifiedExecHandler` 通过 `UnifiedExecProcessManager` 分配 process id，并在 command 未结束时把该 id 暴露为输出中的 `session_id`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:196][E: codex-rs/core/src/tools/handlers/unified_exec.rs:211][E: codex-rs/core/src/tools/context.rs:456]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `cmd` | `string` | 是 | 无 | schema 描述为要执行的 shell command。[E: codex-rs/tools/src/local_tool.rs:22] | `ExecCommandArgs.cmd` 是 string，handler 用它派生命令 argv。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:45][E: codex-rs/core/src/tools/handlers/unified_exec.rs:212] |
| `workdir` | `string` | 否 | turn cwd | schema 描述为可选工作目录，默认 turn cwd。[E: codex-rs/tools/src/local_tool.rs:26] | handler 用 `resolve_workdir_base_path` 和 `turn.resolve_path` 解析相对路径。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:201][E: codex-rs/core/src/tools/handlers/unified_exec.rs:203] |
| `shell` | `string` | 否 | session user shell | schema 描述为 shell binary，默认用户默认 shell。[E: codex-rs/tools/src/local_tool.rs:33] | `get_command` 在 `UnifiedExecShellMode::Direct` 时可用模型提供的 shell path 覆盖 session shell。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:431][E: codex-rs/core/src/tools/handlers/unified_exec.rs:437] |
| `tty` | `boolean` | 否 | false | schema 说明是否分配 TTY，默认 false。[E: codex-rs/tools/src/local_tool.rs:39] | `ExecCommandArgs.tty` 的 serde default 是 `default_tty()`，该函数返回 false。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:52][E: codex-rs/core/src/tools/handlers/unified_exec.rs:88] |
| `yield_time_ms` | `number` | 否 | 10000 | schema 描述为等待输出的毫秒数。[E: codex-rs/tools/src/local_tool.rs:46] | runtime default 是 `default_exec_yield_time_ms()` 返回 `10_000`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:54][E: codex-rs/core/src/tools/handlers/unified_exec.rs:80] |
| `max_output_tokens` | `number` | 否 | runtime resolve | schema 描述为最大返回 token 数，超出截断。[E: codex-rs/tools/src/local_tool.rs:52] | `ExecCommandToolOutput::truncated_output` 通过 `resolve_max_tokens` 和 token truncation policy 截断 raw output。[E: codex-rs/core/src/tools/context.rs:435][E: codex-rs/core/src/tools/context.rs:438] |
| `login` | `boolean` | 否 | `allow_login_shell` | 只有 `CommandToolOptions.allow_login_shell` 为 true 时 schema 才插入 `login`。[E: codex-rs/tools/src/local_tool.rs:58] | `get_command` 在 `login=true` 但 config 禁止 login shell 时返回错误，否则默认 `allow_login_shell`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:420][E: codex-rs/core/src/tools/handlers/unified_exec.rs:427] |
| `sandbox_permissions` | `string` | 否 | `SandboxPermissions` serde default | shell-like approval helper 注入该字段。[E: codex-rs/tools/src/local_tool.rs:338] | `ExecCommandArgs.sandbox_permissions` 有 serde default，类型是 `SandboxPermissions`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:58] |
| `additional_permissions` | `object` | 否 | 无 | 只有 exec permission approvals feature 允许时 schema 才加入该字段。[E: codex-rs/tools/src/local_tool.rs:369] | handler 将 sticky grants 与 inline permissions 合并，并校验是否允许请求 additional permissions。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:236][E: codex-rs/core/src/tools/handlers/unified_exec.rs:276] |
| `justification` | `string` | 否 | 无 | 用于 explain escalated execution request。[E: codex-rs/tools/src/local_tool.rs:349] | handler 把 `justification` 放入 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:338] |
| `prefix_rule` | `array<string>` | 否 | 无 | 用于建议可复用审批前缀。[E: codex-rs/tools/src/local_tool.rs:360] | handler 把 `prefix_rule` 放入 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:339] |

`create_exec_command_tool` 的 required 列表只包含 `cmd`，`additionalProperties` 为 false。[E: codex-rs/tools/src/local_tool.rs:85][E: codex-rs/tools/src/local_tool.rs:86]

## 4 输出 schema & 截断

`exec_command` 声明了 `unified_exec_output_schema()` 作为 `output_schema`。[E: codex-rs/tools/src/local_tool.rs:88] 该 schema 的 object properties 包括 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count` 和 `output`，required 是 `wall_time_seconds` 与 `output`。[E: codex-rs/tools/src/local_tool.rs:302][E: codex-rs/tools/src/local_tool.rs:328]

直接 function-call response 仍是 text content: `ExecCommandToolOutput::to_response_item` 调用 `response_text()` 生成文本，而 `response_text()` 会逐段输出 chunk id、wall time、exit code、running session id、original token count 和 `Output:`。[E: codex-rs/core/src/tools/context.rs:390][E: codex-rs/core/src/tools/context.rs:444][E: codex-rs/core/src/tools/context.rs:464] code-mode nested call 则使用 `ExecCommandToolOutput::code_mode_result` 生成 JSON object，字段与 `unified_exec_output_schema` 基本对齐。[E: codex-rs/core/src/tools/context.rs:406][E: codex-rs/core/src/tools/context.rs:425][I]

截断发生在 `ExecCommandToolOutput::truncated_output`:它先用 `String::from_utf8_lossy` 把 raw bytes 转成 UTF-8 lossy string，再按 token policy 截断。[E: codex-rs/core/src/tools/context.rs:436][E: codex-rs/core/src/tools/context.rs:438]

## 5 ToolSpec 类型

`exec_command` 是 `ToolSpec::Function`，因为它通过 `ResponsesApiTool` 暴露 JSON schema 参数和 `output_schema`。[E: codex-rs/tools/src/local_tool.rs:70][E: codex-rs/tools/src/responses_api.rs:26] Function 形态让 unified-exec 可以精确声明 `cmd`、TTY、polling 和权限字段，而不会把控制参数混入 raw shell script body。[I]

## 6 注册与门控

`exec_command` 只在 `config.has_environment` 为 true 且 `config.shell_type == ConfigShellToolType::UnifiedExec` 时被推入 spec。[E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:155] `ToolsConfig::new` 在 `Feature::UnifiedExec` 开启且当前环境允许 unified exec 时选择 `ConfigShellToolType::UnifiedExec`，但如果 ConPTY 不可用会回退到 `ShellCommand`。[E: codex-rs/tools/src/tool_config.rs:179][E: codex-rs/tools/src/tool_config.rs:180][E: codex-rs/tools/src/tool_config.rs:183]

同一分支会同时注册 `exec_command` 和 `write_stdin` 到 `ToolHandlerKind::UnifiedExec`，所以两者共享 `UnifiedExecHandler`。[E: codex-rs/tools/src/tool_registry_plan.rs:169][E: codex-rs/tools/src/tool_registry_plan.rs:170]

## 7 parallel-safe

`exec_command` 的 plan-level `supports_parallel_tool_calls` 是 true。[E: codex-rs/tools/src/tool_registry_plan.rs:156][E: codex-rs/tools/src/tool_registry_plan.rs:161] `ToolRouter::configured_tool_supports_parallel` 会对带 true 的 function spec 返回 true。[E: codex-rs/core/src/tools/router.rs:148][E: codex-rs/core/src/tools/router.rs:152]

parallel-safe 仍受 mutability 判定约束。`UnifiedExecHandler::is_mutating` 会解析 `ExecCommandArgs`，派生命令 argv，并对非 known-safe command 返回 true。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:103][E: codex-rs/core/src/tools/handlers/unified_exec.rs:115][E: codex-rs/core/src/tools/handlers/unified_exec.rs:124]

## 8 handler 走读

1. `ToolRouter::build_tool_call` 把普通 function call 转成 `ToolPayload::Function { arguments }`。[E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:200]
2. `ToolRegistry` 通过 `"exec_command"` 找到 `UnifiedExecHandler`，检查 payload kind 后进入 `handle_any`。[E: codex-rs/core/src/tools/spec.rs:282][E: codex-rs/core/src/tools/registry.rs:307]
3. `UnifiedExecHandler::handle` 只接受 `ToolPayload::Function`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:180]
4. handler 确认 turn environment 存在，取得 `UnifiedExecProcessManager` 和 `UnifiedExecContext`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:189][E: codex-rs/core/src/tools/handlers/unified_exec.rs:196][E: codex-rs/core/src/tools/handlers/unified_exec.rs:197]
5. 对 `"exec_command"` 分支，handler 解析 cwd 和 args，触发 implicit skill invocation 检测，分配 process id，调用 `get_command` 派生 argv。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:199][E: codex-rs/core/src/tools/handlers/unified_exec.rs:202][E: codex-rs/core/src/tools/handlers/unified_exec.rs:204][E: codex-rs/core/src/tools/handlers/unified_exec.rs:211]
6. handler 校验 additional permissions、approval policy 和 sandbox override 请求。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:233][E: codex-rs/core/src/tools/handlers/unified_exec.rs:249][E: codex-rs/core/src/tools/handlers/unified_exec.rs:276]
7. handler 调用 `intercept_apply_patch`;如果命令实际是 apply_patch，handler 释放 process id 并把 apply_patch 输出包装成 `ExecCommandToolOutput`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:294][E: codex-rs/core/src/tools/handlers/unified_exec.rs:306][E: codex-rs/core/src/tools/handlers/unified_exec.rs:317]
8. 普通命令进入 `manager.exec_command(ExecCommandRequest { ... })`；请求中包含 command、process_id、yield time、max tokens、workdir、network、TTY、sandbox permissions 和 approval hints。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:322][E: codex-rs/core/src/tools/handlers/unified_exec.rs:325][E: codex-rs/core/src/tools/handlers/unified_exec.rs:339]
9. sandbox denial 会被转换成 terminal `ExecCommandToolOutput`，没有 live process，因此 `process_id: None`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:346][E: codex-rs/core/src/tools/handlers/unified_exec.rs:357]

## 9 设计动机·edge·历史

unified-exec 把 command 启动和 stdin 续写拆成 `exec_command`/`write_stdin`，使长时间运行的命令可以 yield 早期输出并由 `session_id` 继续交互。[E: codex-rs/tools/src/local_tool.rs:74][E: codex-rs/tools/src/local_tool.rs:92][I]

`get_command` 支持两种 shell mode: `Direct` 使用模型指定 shell 或 session shell，`ZshFork` 固定通过配置的 zsh path 和 `-lc`/`-c` 执行；这个分支让 unified-exec 可以在不同 shell backend 下保留相同 wire schema。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:430][E: codex-rs/core/src/tools/handlers/unified_exec.rs:440][I]

`post_tool_use_payload` 对 TTY 命令返回 None，避免把交互式 TTY session 的中间状态当成普通 completed command 输出交给 PostToolUse hook。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:157][E: codex-rs/core/src/tools/handlers/unified_exec.rs:158][I]

## Sources

- `codex-rs/tools/src/local_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/context.rs`

## 相关

- [write_stdin 工具](write-stdin.md) — 向 `exec_command` 返回的 session 写 stdin。
- [shell 工具](shell.md) — argv-array shell surface。
- [shell_command 工具](shell-command.md) — 字符串脚本 shell surface。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — unified-exec process manager 的系统节点。
