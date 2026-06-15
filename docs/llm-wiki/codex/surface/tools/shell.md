---
id: tool.shell
title: shell 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/local_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_config.rs, codex-rs/protocol/src/models.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/handlers/mod.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/runtimes/shell.rs, codex-rs/core/src/tools/events.rs]
symbols: [create_shell_tool, ShellToolOptions, ToolHandlerKind::Shell, ShellHandler, ShellToolCallParams, ShellRuntime]
related: [tool.local-shell, tool.shell-command, tool.exec-command, subsys.core.tool-system, subsys.core.tool-router, subsys.exec-sandbox.overview]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `shell` 工具是 Codex 给模型暴露的 JSON function shell 执行面:模型传 `command: string[]`，core 解析成 `ShellToolCallParams`，再通过 `ShellHandler` 和 `ShellRuntime` 走审批、沙箱、执行、事件回传。[E: codex-rs/tools/src/local_tool.rs:140][E: codex-rs/protocol/src/models.rs:958][E: codex-rs/core/src/tools/handlers/shell.rs:242][E: codex-rs/core/src/tools/handlers/shell.rs:546]

## 能回答的问题

- `shell` 工具的 wire name、别名和 `ToolHandlerKind` 是什么?
- `shell` 工具的输入字段、必填字段、审批字段来自哪里?
- `shell` 工具什么时候注册，`ToolsConfig.shell_type` 如何门控它?
- `shell` 工具是否支持 parallel tool calls?
- `shell` 工具在 core 里如何执行，如何接入 apply_patch 拦截、审批、沙箱和 hooks?
- `shell` 工具为什么保留 `command: string[]` 形式，而不是 `shell_command` 的字符串脚本形式?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `shell`; `create_shell_tool` 把 `ResponsesApiTool.name` 固定为 `"shell"`。[E: codex-rs/tools/src/local_tool.rs:186] |
| aliases | model-visible spec 名称由 `create_shell_tool` 固定为 `shell`；`build_tool_registry_plan` 还会把 `container.exec` 注册到同一个 `ToolHandlerKind::Shell` handler。[E: codex-rs/tools/src/local_tool.rs:186][E: codex-rs/tools/src/tool_registry_plan.rs:188] |
| local_shell 关系 | `local_shell` 也注册到 `ToolHandlerKind::Shell`，但它的 model item 是 `ResponseItem::LocalShellCall` 而不是普通 function call。[E: codex-rs/tools/src/tool_registry_plan.rs:189][E: codex-rs/core/src/tools/router.rs:233] |
| ToolHandlerKind | `ToolHandlerKind::Shell` 是工具计划枚举里的一个 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:33] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::Shell` 注册到共享的 `shell_handler.clone()` 实例。[E: codex-rs/core/src/tools/spec.rs:252] |
| 所属文件 | tool schema constructor 在 `codex-rs/tools/src/local_tool.rs`; runtime handler struct 在 `codex-rs/core/src/tools/handlers/shell.rs`。[E: codex-rs/tools/src/local_tool.rs:136][E: codex-rs/core/src/tools/handlers/shell.rs:44] |

## 2 用途定位

`shell` 工具面向“直接执行一个 argv 数组”的 shell-like 命令:参数 `command` 是字符串数组，非 Windows 描述建议模型把常见终端命令写成 `["bash", "-lc", "..."]`，并要求设置 `workdir`。[E: codex-rs/tools/src/local_tool.rs:140][E: codex-rs/tools/src/local_tool.rs:180][E: codex-rs/tools/src/local_tool.rs:181] 运行时 `ShellHandler::to_exec_params` 直接使用 `params.command.clone()` 作为 `ExecParams.command`，所以 `shell` 不会先把脚本文本交给用户默认 shell 再拆 argv。[E: codex-rs/core/src/tools/handlers/shell.rs:99]

`shell`、`local_shell` 和 `shell_command` 最终都进入 shell runtime family；`shell_command` 先取 `session.user_shell()` 并调用 `derive_exec_args(...)` 从字符串脚本派生 argv。[E: codex-rs/core/src/tools/handlers/shell.rs:149][E: codex-rs/core/src/tools/handlers/shell.rs:151][E: codex-rs/core/src/tools/handlers/shell.rs:546]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `command` | `array<string>` | 是 | 无 | `create_shell_tool` 为 `command` 建 array schema，item 是 string，描述是要执行的命令。[E: codex-rs/tools/src/local_tool.rs:140][E: codex-rs/tools/src/local_tool.rs:142] | `ShellToolCallParams.command` 是 `Vec<String>`，handler 把该数组复制到 `ExecParams.command`。[E: codex-rs/protocol/src/models.rs:958][E: codex-rs/core/src/tools/handlers/shell.rs:99] |
| `workdir` | `string` | 否 | turn cwd [I] | schema 描述为命令工作目录。[E: codex-rs/tools/src/local_tool.rs:147][E: codex-rs/tools/src/local_tool.rs:148] | handler 先解析 `workdir` 得到 base path，再用 `turn_context.resolve_path` 生成执行 cwd。[E: codex-rs/core/src/tools/handlers/shell.rs:242][E: codex-rs/core/src/tools/handlers/shell.rs:100] |
| `timeout_ms` | `number` | 否 | `None` -> runtime 默认 expiration [I] | schema 描述为毫秒超时。[E: codex-rs/tools/src/local_tool.rs:153][E: codex-rs/tools/src/local_tool.rs:154] | protocol struct 接受 `timeout_ms`，还通过 `#[serde(alias = "timeout")]` 接受 `timeout`。[E: codex-rs/protocol/src/models.rs:962][E: codex-rs/protocol/src/models.rs:963] |
| `sandbox_permissions` | `string` | 否 | `use_default` | `create_approval_parameters` 总是加入该字段；说明依 `exec_permission_approvals_enabled` 区分是否推荐 `with_additional_permissions`。[E: codex-rs/tools/src/local_tool.rs:338][E: codex-rs/tools/src/local_tool.rs:340] | `SandboxPermissions::UseDefault`、`RequireEscalated`、`WithAdditionalPermissions` 是 protocol enum variants。[E: codex-rs/protocol/src/models.rs:93][E: codex-rs/protocol/src/models.rs:95][E: codex-rs/protocol/src/models.rs:98] |
| `additional_permissions` | `object` | 否 | 无 | 只有 `exec_permission_approvals_enabled` 为 true 时，schema 才插入 `additional_permissions`。[E: codex-rs/tools/src/local_tool.rs:370][E: codex-rs/tools/src/local_tool.rs:372] | handler 会合并 sticky grants，再调用 shared helper 校验该字段是否允许、非空且与 `with_additional_permissions` 搭配。[E: codex-rs/core/src/tools/handlers/shell.rs:433][E: codex-rs/core/src/tools/handlers/shell.rs:457][E: codex-rs/core/src/tools/handlers/mod.rs:115] |
| `justification` | `string` | 否 | 无 | schema 说明仅在 `sandbox_permissions` 为 `require_escalated` 时设置，用于向用户说明提权目的。[E: codex-rs/tools/src/local_tool.rs:351][E: codex-rs/tools/src/local_tool.rs:355] | runtime approval request 把 `justification` 带入 `GuardianApprovalRequest::Shell`。[E: codex-rs/core/src/tools/runtimes/shell.rs:170] |
| `prefix_rule` | `array<string>` | 否 | 无 | schema 说明仅在 `require_escalated` 时建议可复用的命令前缀。[E: codex-rs/tools/src/local_tool.rs:362][E: codex-rs/tools/src/local_tool.rs:364] | handler 把 `prefix_rule` 传给 exec policy，用于构造命令审批需求。[E: codex-rs/core/src/tools/handlers/shell.rs:244][E: codex-rs/core/src/tools/handlers/shell.rs:525] |

`create_shell_tool` 的 required 列表只包含 `command`，并把 `additionalProperties` 设为 false。[E: codex-rs/tools/src/local_tool.rs:192][E: codex-rs/tools/src/local_tool.rs:193]

## 4 输出 schema & 截断

`shell` tool spec 没有声明 `output_schema`; `ResponsesApiTool.output_schema` 为 `None`。[E: codex-rs/tools/src/local_tool.rs:195] handler 返回 `FunctionToolOutput`，`FunctionToolOutput::to_response_item` 会把文本或 content items 转成 `ResponseInputItem::FunctionCallOutput`。[E: codex-rs/core/src/tools/context.rs:266][E: codex-rs/core/src/tools/context.rs:277]

`ShellRuntime` 执行后产生 `ExecToolCallOutput`，`ToolEmitter::finish` 会用结构化或 freeform 的 formatter 生成给模型的文本。[E: codex-rs/core/src/tools/events.rs:302][E: codex-rs/core/src/tools/events.rs:309] 对于 `shell`，handler 传入 `freeform: false`。[E: codex-rs/core/src/tools/handlers/shell.rs:257] `ShellRuntime` 的捕获策略是 `ExecCapturePolicy::ShellTool`。[E: codex-rs/core/src/tools/runtimes/shell.rs:269]

## 5 ToolSpec 类型

`shell` 是 `ToolSpec::Function(ResponsesApiTool { ... })`，因为 `create_shell_tool` 返回普通 Responses API function 工具。[E: codex-rs/tools/src/local_tool.rs:185] `ToolSpec::Function` 是 `ToolSpec` 枚举的 function 变体。[E: codex-rs/tools/src/tool_spec.rs:24]

选择 Function 的直接动机是 `shell` 有固定 JSON object 输入，字段包括 `command`、`workdir`、`timeout_ms` 和审批字段。[E: codex-rs/tools/src/local_tool.rs:190][E: codex-rs/tools/src/local_tool.rs:192][I]

## 6 注册与门控

`shell` 只有在 `config.has_environment` 为 true 且 `config.shell_type == ConfigShellToolType::Default` 时被推入 model-visible specs。[E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:139][E: codex-rs/tools/src/tool_registry_plan.rs:140] `ToolsConfig::new` 会在 `Feature::ShellTool` 关闭时把 `shell_type` 设为 `ConfigShellToolType::Disabled`，否则根据 `Feature::ShellZshFork`、`Feature::UnifiedExec`、环境能力和 `model_info.shell_type` 选择具体 shell surface。[E: codex-rs/tools/src/tool_config.rs:175][E: codex-rs/tools/src/tool_config.rs:179][E: codex-rs/tools/src/tool_config.rs:189]

只要 `config.has_environment` 为 true 且 `config.shell_type != Disabled`，registry 都会注册 `shell`、`container.exec`、`local_shell`、`shell_command` 四个 handler 名称；这意味着 `shell` handler alias 的存在范围比 `shell` spec 本身更宽。[E: codex-rs/tools/src/tool_registry_plan.rs:186][E: codex-rs/tools/src/tool_registry_plan.rs:187][E: codex-rs/tools/src/tool_registry_plan.rs:190]

## 7 parallel-safe

`shell` spec 在 registry plan 中以 `supports_parallel_tool_calls = true` 推入。[E: codex-rs/tools/src/tool_registry_plan.rs:140][E: codex-rs/tools/src/tool_registry_plan.rs:144] `ToolRegistryBuilder` 会把该布尔值保存到 `ConfiguredToolSpec`。[E: codex-rs/core/src/tools/registry.rs:504][E: codex-rs/core/src/tools/registry.rs:510] `ToolRouter::configured_tool_supports_parallel` 只对带该布尔值的 function/freeform spec 返回 true，所以 `shell` direct function call 可被视为 parallel-safe。[E: codex-rs/core/src/tools/router.rs:150][E: codex-rs/core/src/tools/router.rs:152]

parallel-safe 不代表绕过 mutating gate。`ShellHandler::is_mutating` 会把未知或非 known safe command 当作 mutating，registry dispatch 对 mutating tool 会等待 `turn.tool_call_gate` 放行。[E: codex-rs/core/src/tools/handlers/shell.rs:199][E: codex-rs/core/src/tools/handlers/shell.rs:204][E: codex-rs/core/src/tools/registry.rs:376]

## 8 handler 走读

1. Responses API 返回 `ResponseItem::FunctionCall { name: "shell", arguments, call_id, ... }` 时，`ToolRouter::build_tool_call` 构造 `ToolCall { tool_name, payload: ToolPayload::Function { arguments } }`。[E: codex-rs/core/src/tools/router.rs:185][E: codex-rs/core/src/tools/router.rs:197][E: codex-rs/core/src/tools/router.rs:200]
2. `ToolRouter::dispatch_tool_call_with_code_mode_result` 把 `ToolCall` 包成 `ToolInvocation` 并调用 `registry.dispatch_any`。[E: codex-rs/core/src/tools/router.rs:294][E: codex-rs/core/src/tools/router.rs:304]
3. `ToolRegistry::dispatch_any` 找到 registered handler，检查 payload kind，执行 pre-tool hooks，必要时等待 mutating gate，然后调用 `handler.handle_any`。[E: codex-rs/core/src/tools/registry.rs:307][E: codex-rs/core/src/tools/registry.rs:326][E: codex-rs/core/src/tools/registry.rs:342][E: codex-rs/core/src/tools/registry.rs:381]
4. `ShellHandler` 接受 `ToolPayload::Function` 和 `ToolPayload::LocalShell`，所以 `shell` 与 `local_shell` 共享 handler。[E: codex-rs/core/src/tools/handlers/shell.rs:190][E: codex-rs/core/src/tools/handlers/shell.rs:193]
5. `ShellHandler::handle` 对 function payload 解析 `ShellToolCallParams`，构造 `ExecParams`，并进入 `ShellHandler::run_exec_like`。[E: codex-rs/core/src/tools/handlers/shell.rs:242][E: codex-rs/core/src/tools/handlers/shell.rs:247]
6. `run_exec_like` 先确认 turn environment 存在，合并 dependency env，然后应用 sticky/inline permissions。[E: codex-rs/core/src/tools/handlers/shell.rs:411][E: codex-rs/core/src/tools/handlers/shell.rs:418][E: codex-rs/core/src/tools/handlers/shell.rs:433]
7. `run_exec_like` 在真正执行前调用 `intercept_apply_patch`，如果命令实际是 apply_patch invocation，则返回 apply_patch 输出而不是执行 shell command。[E: codex-rs/core/src/tools/handlers/shell.rs:482][E: codex-rs/core/src/tools/handlers/shell.rs:494]
8. 普通命令进入 `ToolEmitter::shell(...).begin(...)` 发 `ExecCommandBegin`，再由 exec policy 创建审批需求，最后交给 `ShellRuntime` 和 `ToolOrchestrator` 执行。[E: codex-rs/core/src/tools/handlers/shell.rs:498][E: codex-rs/core/src/tools/handlers/shell.rs:512][E: codex-rs/core/src/tools/handlers/shell.rs:546]
9. `ShellRuntime::run` 构造 sandbox command，使用 `execute_env` 执行，并把 stdout streaming 接到 tool event channel。[E: codex-rs/core/src/tools/runtimes/shell.rs:261][E: codex-rs/core/src/tools/runtimes/shell.rs:274]

## 9 设计动机·edge·历史

`shell` 的 `command: string[]` 设计让模型明确给出 argv 边界，避免把所有命令都塞进一段字符串脚本；非 Windows 描述仍建议对大多数终端命令使用 `["bash", "-lc"]`，说明 Codex 同时保留 argv 边界和 shell-script 便利性。[E: codex-rs/tools/src/local_tool.rs:140][E: codex-rs/protocol/src/models.rs:958][E: codex-rs/tools/src/local_tool.rs:180][I]

`shell` 的 handler alias 包含 `container.exec`，这兼容了旧训练或外部 surface 中常见的 container-style tool name，但真实 model-visible spec 仍由 `create_shell_tool` 的 `"shell"` 决定。[E: codex-rs/tools/src/local_tool.rs:186][E: codex-rs/tools/src/tool_registry_plan.rs:188][I]

`shell` 的审批字段由 `create_approval_parameters` 注入，而不是手写在每个 shell schema 中；同一 helper 被 `shell`、`exec_command` 和 `shell_command` 复用，减少 shell-like tools 之间的权限语义漂移。[E: codex-rs/tools/src/local_tool.rs:158][E: codex-rs/tools/src/local_tool.rs:66][E: codex-rs/tools/src/local_tool.rs:229][I]

## Sources

- `codex-rs/tools/src/local_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/handlers/mod.rs`
- `codex-rs/core/src/tools/handlers/shell.rs`
- `codex-rs/core/src/tools/runtimes/shell.rs`
- `codex-rs/core/src/tools/events.rs`

## 相关

- [local_shell 工具](local-shell.md)
- [shell_command 工具](shell-command.md)
- [exec_command 工具](exec-command.md)
- [工具系统机制](../../subsystems/core/tool-system.md) — `ToolSpec`、`ToolHandlerKind`、registry plan 的总览。
