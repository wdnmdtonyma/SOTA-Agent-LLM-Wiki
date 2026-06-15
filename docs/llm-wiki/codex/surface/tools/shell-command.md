---
id: tool.shell-command
title: shell_command 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/local_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/models.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/runtimes/shell.rs, codex-rs/core/src/tools/events.rs]
symbols: [create_shell_command_tool, CommandToolOptions, ToolHandlerKind::ShellCommand, ShellCommandHandler, ShellCommandToolCallParams, ShellRuntimeBackend]
related: [tool.shell, tool.exec-command, tool.local-shell, subsys.core.tool-system, subsys.exec-sandbox.shell-parsing, subsys.exec-sandbox.shell-escalation]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `shell_command` 工具是 Codex 的字符串脚本 shell surface:模型传 `command: string`，handler 用当前用户 shell 派生 argv，再复用 `ShellRuntime` 的审批、沙箱和执行机制。[E: codex-rs/tools/src/local_tool.rs:203][E: codex-rs/core/src/tools/handlers/shell.rs:149][E: codex-rs/core/src/tools/handlers/shell.rs:151][E: codex-rs/core/src/tools/handlers/shell.rs:546]

## 能回答的问题

- `shell_command` 和 `shell` 的输入形态有什么差别?
- `shell_command` 的 schema 字段和 runtime struct 是什么?
- `shell_command` 如何被 `Feature::ShellZshFork` 或 `ConfigShellToolType::ShellCommand` 门控?
- `shell_command` 的 zsh-fork backend 在哪里选择?
- `shell_command` 是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `shell_command`; `create_shell_command_tool` 把 `ResponsesApiTool.name` 固定为 `"shell_command"`。[E: codex-rs/tools/src/local_tool.rs:256] |
| aliases | registry plan 直接注册 `"shell_command"` 到 `ToolHandlerKind::ShellCommand`。[E: codex-rs/tools/src/tool_registry_plan.rs:190] |
| ToolHandlerKind | `ToolHandlerKind::ShellCommand` 是独立 handler kind，不同于 `ToolHandlerKind::Shell`。[E: codex-rs/tools/src/tool_registry_plan_types.rs:34] |
| concrete handler | `core/src/tools/spec.rs` 创建 `ShellCommandHandler`，并把 `ToolHandlerKind::ShellCommand` 注册到该 handler。[E: codex-rs/core/src/tools/spec.rs:156][E: codex-rs/core/src/tools/spec.rs:255] |
| 所属文件 | schema constructor 在 `codex-rs/tools/src/local_tool.rs`; handler/runtime 在 `codex-rs/core/src/tools/handlers/shell.rs` 与 `codex-rs/core/src/tools/runtimes/shell.rs`。[E: codex-rs/tools/src/local_tool.rs:199][E: codex-rs/core/src/tools/handlers/shell.rs:52][E: codex-rs/core/src/tools/runtimes/shell.rs:91] |

## 2 用途定位

`shell_command` 的 `command` 是一段 shell script string，而 `shell` 的 `command` 是 argv array。[E: codex-rs/tools/src/local_tool.rs:203][E: codex-rs/tools/src/local_tool.rs:140] runtime 通过 `ShellCommandHandler::base_command(shell, command, use_login_shell)` 调用 `shell.derive_exec_args(...)`，所以脚本文本会由 session user shell 解释。[E: codex-rs/core/src/tools/handlers/shell.rs:139][E: codex-rs/core/src/tools/handlers/shell.rs:151]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | schema 描述为在用户默认 shell 中执行的 shell script。[E: codex-rs/tools/src/local_tool.rs:203][E: codex-rs/tools/src/local_tool.rs:205] | protocol struct `ShellCommandToolCallParams.command` 是 string。[E: codex-rs/protocol/src/models.rs:982] |
| `workdir` | `string` | 否 | turn cwd [I] | schema 描述为命令工作目录。[E: codex-rs/tools/src/local_tool.rs:209][E: codex-rs/tools/src/local_tool.rs:210] | handler 解析 base cwd，再用 `turn.resolve_path(params.workdir.clone())` 生成 `workdir`。[E: codex-rs/core/src/tools/handlers/shell.rs:359][E: codex-rs/core/src/tools/handlers/shell.rs:361] |
| `timeout_ms` | `number` | 否 | `None` -> runtime default expiration [I] | schema 描述为毫秒超时。[E: codex-rs/tools/src/local_tool.rs:215][E: codex-rs/tools/src/local_tool.rs:216] | protocol struct 支持 `timeout_ms`，并通过 alias 接受 `timeout`。[E: codex-rs/protocol/src/models.rs:989][E: codex-rs/protocol/src/models.rs:990] |
| `login` | `boolean` | 否 | `allow_login_shell` | 只有 `CommandToolOptions.allow_login_shell` 为 true 时 schema 才插入 `login`。[E: codex-rs/tools/src/local_tool.rs:220] | `resolve_use_login_shell` 在 config 禁止 login shell 且模型传 `true` 时返回模型错误，否则使用配置默认值。[E: codex-rs/core/src/tools/handlers/shell.rs:129][E: codex-rs/core/src/tools/handlers/shell.rs:135] |
| `sandbox_permissions` | `string` | 否 | `UseDefault` via `unwrap_or_default()` | 由 `create_approval_parameters` 注入。[E: codex-rs/tools/src/local_tool.rs:229][E: codex-rs/tools/src/local_tool.rs:338] | runtime struct `ShellCommandToolCallParams.sandbox_permissions` 是 optional，handler 用 `unwrap_or_default()` 取值。[E: codex-rs/protocol/src/models.rs:991][E: codex-rs/protocol/src/models.rs:993][E: codex-rs/core/src/tools/handlers/shell.rs:160] |
| `additional_permissions` | `object` | 否 | 无 | 只有 exec permission approvals 开启时 schema 才加入。[E: codex-rs/tools/src/local_tool.rs:369] | handler 传入 `ShellHandler::run_exec_like`，由 shared permissions logic 校验。[E: codex-rs/core/src/tools/handlers/shell.rs:381][E: codex-rs/core/src/tools/handlers/shell.rs:450] |
| `justification` | `string` | 否 | 无 | 用于解释 escalated execution request。[E: codex-rs/tools/src/local_tool.rs:349] | `ShellCommandHandler::to_exec_params` 把 `params.justification` 放入 `ExecParams`。[E: codex-rs/core/src/tools/handlers/shell.rs:166] |
| `prefix_rule` | `array<string>` | 否 | 无 | 用于建议可复用审批前缀。[E: codex-rs/tools/src/local_tool.rs:361][E: codex-rs/tools/src/local_tool.rs:364] | handler 把 `prefix_rule` 传给 shared run path。[E: codex-rs/core/src/tools/handlers/shell.rs:369][E: codex-rs/core/src/tools/handlers/shell.rs:382] |

`create_shell_command_tool` 的 required 列表只包含 `command`，并关闭 additional properties。[E: codex-rs/tools/src/local_tool.rs:262][E: codex-rs/tools/src/local_tool.rs:263]

## 4 输出 schema & 截断

`shell_command` 没有声明 `output_schema`。[E: codex-rs/tools/src/local_tool.rs:265] 它返回 `FunctionToolOutput`，由 `FunctionToolOutput::to_response_item` 输出为 `FunctionCallOutput`。[E: codex-rs/core/src/tools/context.rs:266][E: codex-rs/core/src/tools/context.rs:277]

`ShellCommandHandler::handle` 以 `freeform: true` 调用 shared run path，因此 `ToolEmitter::format_exec_output_for_model` 对 `shell_command` 使用 freeform formatter。[E: codex-rs/core/src/tools/handlers/shell.rs:387][E: codex-rs/core/src/tools/events.rs:295][E: codex-rs/core/src/tools/events.rs:296] 执行捕获仍使用 `ExecCapturePolicy::ShellTool`。[E: codex-rs/core/src/tools/runtimes/shell.rs:269]

## 5 ToolSpec 类型

`shell_command` 是 `ToolSpec::Function`，因为它通过 `ResponsesApiTool` 暴露 JSON object 输入。[E: codex-rs/tools/src/local_tool.rs:255][E: codex-rs/tools/src/tool_spec.rs:24] Function 输入把 command script 与 permissions/timeout/login 控制字段分离，避免模型把审批元数据拼进 shell 脚本文本。[I]

## 6 注册与门控

`shell_command` spec 在 `config.has_environment` 为 true 且 `config.shell_type == ConfigShellToolType::ShellCommand` 时推入。[E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:173][E: codex-rs/tools/src/tool_registry_plan.rs:174] `ToolsConfig::new` 会在 `Feature::ShellZshFork` 开启时把 `shell_type` 设为 `ShellCommand`，也会在 unified exec 不可用或模型本身选择 shell-command 时落到 `ShellCommand`。[E: codex-rs/tools/src/tool_config.rs:177][E: codex-rs/tools/src/tool_config.rs:178][E: codex-rs/tools/src/tool_config.rs:185]

`shell_command_backend` 在 `Feature::ShellTool` 与 `Feature::ShellZshFork` 都开启时为 `ZshFork`，否则为 `Classic`。[E: codex-rs/tools/src/tool_config.rs:164][E: codex-rs/tools/src/tool_config.rs:166][E: codex-rs/tools/src/tool_config.rs:168] `core/src/tools/spec.rs` 用 `ShellCommandHandler::from(config.shell_command_backend)` 构造 handler。[E: codex-rs/core/src/tools/spec.rs:156]

## 7 parallel-safe

`shell_command` spec 的 plan-level `supports_parallel_tool_calls` 是 true。[E: codex-rs/tools/src/tool_registry_plan.rs:174][E: codex-rs/tools/src/tool_registry_plan.rs:179] `ShellCommandHandler::is_mutating` 会派生命令 argv 并用 `is_known_safe_command` 判定是否 mutating。[E: codex-rs/core/src/tools/handlers/shell.rs:313][E: codex-rs/core/src/tools/handlers/shell.rs:315]

## 8 handler 走读

1. `ToolRouter` 将 function call 构造成 `ToolPayload::Function { arguments }`。[E: codex-rs/core/src/tools/router.rs:178][E: codex-rs/core/src/tools/router.rs:200]
2. `core/src/tools/spec.rs` 将 `"shell_command"` 的 `ToolHandlerKind::ShellCommand` 映射到 `ShellCommandHandler`。[E: codex-rs/core/src/tools/spec.rs:255]
3. `ShellCommandHandler::handle` 只接受 function payload，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/shell.rs:352][E: codex-rs/core/src/tools/handlers/shell.rs:356]
4. handler 解析 `ShellCommandToolCallParams`，触发 implicit skill invocation 检测，复制 `prefix_rule`，并调用 `to_exec_params`。[E: codex-rs/core/src/tools/handlers/shell.rs:360][E: codex-rs/core/src/tools/handlers/shell.rs:362][E: codex-rs/core/src/tools/handlers/shell.rs:370]
5. `to_exec_params` 使用 session user shell 和 login-shell 规则把字符串脚本派生为 argv。[E: codex-rs/core/src/tools/handlers/shell.rs:149][E: codex-rs/core/src/tools/handlers/shell.rs:151]
6. handler 进入 `ShellHandler::run_exec_like`，其中 `freeform: true` 且 `shell_runtime_backend` 来自 `self.shell_runtime_backend()`。[E: codex-rs/core/src/tools/handlers/shell.rs:377][E: codex-rs/core/src/tools/handlers/shell.rs:388]
7. shared run path 会先拦截 apply_patch，再建立 exec approval requirement，最后交给 `ShellRuntime`。[E: codex-rs/core/src/tools/handlers/shell.rs:482][E: codex-rs/core/src/tools/handlers/shell.rs:512][E: codex-rs/core/src/tools/handlers/shell.rs:546]
8. `ShellRuntime::for_shell_command` 保存 backend；当 backend 是 `ShellCommandZshFork` 时，会先尝试 zsh-fork adapter，条件不满足再 fallback 到普通执行。[E: codex-rs/core/src/tools/runtimes/shell.rs:110][E: codex-rs/core/src/tools/runtimes/shell.rs:250][E: codex-rs/core/src/tools/runtimes/shell.rs:257]

## 9 设计动机·edge·历史

`shell_command` 给模型一个更自然的脚本字符串 surface，同时保留 `workdir`、timeout、审批和权限字段作为结构化参数。[E: codex-rs/tools/src/local_tool.rs:203][E: codex-rs/tools/src/local_tool.rs:209][E: codex-rs/tools/src/local_tool.rs:215][I]

zsh-fork backend 是 `shell_command` 专属 runtime backend，而不是 generic `shell` 的默认行为；`ShellRuntimeBackend` 注释明确 `Generic` 不是 `ShellCommandClassic`，`ShellCommand*` variants 只用于 `shell_command` family。[E: codex-rs/core/src/tools/runtimes/shell.rs:65][E: codex-rs/core/src/tools/runtimes/shell.rs:86]

`shell_command` 的 model description 要求设置 `workdir` 并避免不必要的 `cd`，这是为了让 cwd 进入结构化参数和 approval/sandbox context，而不是藏在 script 里。[E: codex-rs/tools/src/local_tool.rs:251][I]

## Sources

- `codex-rs/tools/src/local_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/handlers/shell.rs`
- `codex-rs/core/src/tools/runtimes/shell.rs`
- `codex-rs/core/src/tools/events.rs`

## 相关

- [shell 工具](shell.md) — argv-array shell surface。
- [exec_command 工具](exec-command.md) — unified-exec shell surface。
- [local_shell 工具](local-shell.md) — Responses API built-in local shell surface。
