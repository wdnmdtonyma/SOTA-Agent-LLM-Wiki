---
id: tool.exec-command
title: exec_command 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/unified_exec/oneshot.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/features/src/lib.rs]
symbols: [ExecCommandHandler, ExecCommandHandlerOptions, ExecCommandArgs, ExecCommandLifetime, create_exec_command_tool_with_environment_id, resolve_max_tokens, ConfigShellToolType::UnifiedExec]
related: [tool.write-stdin, tool.shell-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> `exec_command` 是当前唯一注册的命令执行 handler：模型提交 `cmd`，handler 解析环境、工作目录、shell/login/TTY/权限字段，分配 process id 后交给 `UnifiedExecProcessManager`。UnifiedExec=on 时命令未结束可带 `session_id` 给 `write_stdin`；UnifiedExec=off 时走 `ExecCommandHandler::one_shot`，跑到 completion 且不可 resume。`tty` 还受 `Feature::UnifiedExecTty` 门控，不是始终暴露。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:96][E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:104][E: codex-rs/features/src/lib.rs:954]

## 能回答的问题

- `exec_command` 的 wire name、ToolSpec 类型、具体 handler 是什么？
- `exec_command` 的 schema 字段和 runtime 默认值在哪里定义？
- `add_shell_tools` 何时注册 interactive handler，何时 `one_shot`？
- Guardian reviewer turn 为什么仍能看到它？
- 它怎样解析 environment/workdir/shell/login/权限，并交给 unified-exec manager？
- 它的输出 schema、文本输出和 code-mode JSON 如何对应？
- 它是否支持 parallel tool calls？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ExecCommandHandler::tool_name()` 返回 plain `"exec_command"`；schema constructor 也把 `ResponsesApiTool.name` 设为 `"exec_command"`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:113][E: codex-rs/core/src/tools/handlers/shell_spec.rs:96] |
| concrete handler | `ExecCommandHandler` 保存 `ExecCommandHandlerOptions` 与 `ExecCommandLifetime`（`Interactive` 或 `OneShot`）。`new` 设 Interactive，`one_shot` 设 OneShot。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:70][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:97][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:104] |
| ToolSpec | `create_exec_command_tool_with_environment_id` 返回 `ToolSpec::Function`；OneShot 再经 `one_shot_exec_command_spec` 改 description、删 `tty`/`yield_time_ms`、加 `timeout_ms`、删 output `session_id`。`allow_tty=false` 时 Interactive spec 也会删除 `tty`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:95][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:117][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:131][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:486] |
| handler contract | 实现 `ToolExecutor<ToolInvocation>`，`supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:142] |

## 2 用途定位

`exec_command` 负责启动或等待一条 shell 命令。Interactive 模式与 `write_stdin` 通过 `session_id` 衔接：`exec_command` required 只有 `cmd`，`write_stdin` required 是 `session_id`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:110][E: codex-rs/core/src/tools/handlers/shell_spec.rs:154]

运行时按 turn environment 解析 `environment_id` 与 `workdir`，再按 `UnifiedExecShellMode`（Direct 或 ZshFork）由 `get_command` 派生命令 argv。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:187][E: codex-rs/core/src/tools/handlers/unified_exec.rs:99][E: codex-rs/core/src/tools/handlers/unified_exec.rs:115]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `cmd` | `string` | 是 | 无 | schema properties 固定包含 `cmd`，required 只要求 `cmd`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:37][E: codex-rs/core/src/tools/handlers/shell_spec.rs:110] | `ExecCommandArgs.cmd` 是 string；handler 将其作为 hook command，并由 `get_command` 派生 argv。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:29][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:251][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:290] |
| `workdir` | `string` | 否 | selected environment cwd | schema 描述默认 turn cwd。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:41] | handler 先按 `environment_id` 选环境，再把相对 `workdir` join 到该环境 cwd。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:59][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:197] |
| `shell` | `string` | 否 | session/environment shell | 只有 `include_shell_parameter` 为 true 时 schema 插入 `shell`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:65] | local zsh-fork 拒绝显式 `shell`；Direct 可用模型 shell path；remote 只接受与 reported shell type 匹配的 `shell`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:128][E: codex-rs/core/src/tools/handlers/unified_exec.rs:116][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:273] |
| `login` | `boolean` | 否 | `allow_login_shell` | 只有 `allow_login_shell` 为 true 时 schema 插入 `login`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:73] | `get_command` 在 config 禁止 login shell 但模型传 `true` 时返回错误。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:105] |
| `environment_id` | `string` | 否 | primary environment | 只有 multiple-environment 模式插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:82] | handler 先解析 `ExecCommandEnvironmentArgs.environment_id`，再 `resolve_tool_environment(...)`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:53][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:186] |
| `tty` | `boolean` | 否 | `false` | schema 描述是否分配 PTY；仅 `Feature::UnifiedExecTty` 开启且非 OneShot 时保留该字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:48][E: codex-rs/core/src/tools/spec_plan.rs:1095] | serde default `default_tty()` 返回 false；flag 关闭时 handler 拒绝 `tty=true`；OneShot 强制 `tty = false` 并从 spec 删除该字段。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:70][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:244][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:313][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:496] |
| `yield_time_ms` | `number` | 否 | `10000` | Unix-like 有效范围 250–30000ms；Windows 下限 10000ms。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:30][E: codex-rs/core/src/unified_exec/mod.rs:73][E: codex-rs/core/src/unified_exec/mod.rs:74] | OneShot spec 删除该字段。runtime `clamp_yield_time` 使用相同边界。[E: codex-rs/core/src/unified_exec/mod.rs:210] |
| `timeout_ms` | `number` | 否 | `10000` | 仅 OneShot spec 插入。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:498] | `ExecCommandArgs.timeout_ms` 是 optional；OneShot 用它构造 completion timeout，默认 `DEFAULT_EXEC_COMMAND_TIMEOUT_MS`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:39][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:341] |
| `max_output_tokens` | `number` | 否 | `10000 tokens` | schema 描述输出 token 预算默认 10000。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:59] | runtime 默认常量是 `10_000`。[E: codex-rs/core/src/unified_exec/mod.rs:79][E: codex-rs/core/src/unified_exec/mod.rs:219] |
| `sandbox_permissions` | enum string | 否 | `use_default` | 可选 `use_default` / `require_escalated`；ExecPermissionApprovals 开启时还有 `with_additional_permissions`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:235][E: codex-rs/core/src/tools/handlers/shell_spec.rs:249] | 若给出 `justification` 却省略此字段，`resolve_sandbox_permissions` 返回模型错误。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:249] |
| `additional_permissions` | object | 否 | 无 | 只有 ExecPermissionApprovals 开启时插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:268] | handler 只在相关 feature 或预批准权限存在时允许 additional permissions。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:314] |
| `justification` | `string` | 否 | 无 | approval helper 插入用户可见说明。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:255] | 只能与显式 `sandbox_permissions` 一起使用。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:249] |
| `prefix_rule` | `array<string>` | 否 | 无 | 可复用 approval prefix。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:261] | handler 把 `prefix_rule` 放进 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:439] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["cmd"]), Some(false))`，schema 层 required 只有 `cmd`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:108]

## 4 输出 schema & 截断

`exec_command` 声明 `output_schema: Some(unified_exec_output_schema())`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:113] 该 schema 是 object，properties 包含 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count`、`output`，required 是 `wall_time_seconds` 和 `output`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:198][E: codex-rs/core/src/tools/handlers/shell_spec.rs:227]

普通 function-call 输出由 `ExecCommandToolOutput::response_text()` 生成文本：可含 chunk id、wall time、exit code、running session id、original token count 和截断后的 `Output:`。[E: codex-rs/core/src/tools/context.rs:500][E: codex-rs/core/src/tools/context.rs:526]

code-mode nested result 是结构化 JSON，对齐 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count` 和 `output`。[E: codex-rs/core/src/tools/context.rs:424][E: codex-rs/core/src/tools/context.rs:439]

## 5 注册与门控

`add_core_tool_sources` 先处理 Guardian reviewer：非 Managed permission profile 直接返回；Managed 且有 environment 时，还要求 `Feature::ShellTool` + `Feature::UnifiedExec` 且模型 shell type 不是 Disabled，才注册 interactive `ExecCommandHandler` 与 `WriteStdinHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:994][E: codex-rs/core/src/tools/spec_plan.rs:998][E: codex-rs/core/src/tools/spec_plan.rs:1014]

普通 turn 走 `add_shell_tools`。没有 environment / ShellTool 关 / 模型 Disabled 时不注册。[E: codex-rs/core/src/tools/spec_plan.rs:1079][E: codex-rs/core/src/tools/spec_plan.rs:1083]

`Feature::UnifiedExec` 全平台默认 `true`。[E: codex-rs/features/src/lib.rs:947][E: codex-rs/features/src/lib.rs:950] 开启时注册 `ExecCommandHandler::new` + `WriteStdinHandler`；关闭时只注册 `ExecCommandHandler::one_shot`，**不再**注册 `ShellCommandHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/spec_plan.rs:1111] `Feature::UnifiedExecTty` 默认 true，控制 `allow_tty`。[E: codex-rs/features/src/lib.rs:953][E: codex-rs/core/src/tools/spec_plan.rs:1095]

`ConfigShellToolType` 只剩 `UnifiedExec` 与 `Disabled`；legacy `"shell_command"` alias 反序列化为 `UnifiedExec`。[E: codex-rs/protocol/src/openai_models.rs:315][E: codex-rs/protocol/src/openai_models.rs:316]

zsh-fork 不再改 shell type，而是 session 级 `UnifiedExecShellMode::for_session`：Unix + ShellTool + UnifiedExec + ShellZshFork + UnifiedExecZshFork + 用户 shell 是 Zsh + 两条 path 都可转成 `AbsolutePathBuf` 时才进 `ZshFork`，否则 `Direct`。[E: codex-rs/tools/src/tool_config.rs:41][E: codex-rs/tools/src/tool_config.rs:70]

## 6 parallel support

`ExecCommandHandler::supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:142]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:170]
2. 从 session services 取 `UnifiedExecProcessManager`，建立 `UnifiedExecContext`，并选择 turn environment。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:179][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:187]
3. 解析 `workdir`、检查 native path convention 与 sandbox 要求，再按 base path 解析完整参数。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:197][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:211][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:233]
4. 校验 TTY feature、选择 local/remote shell mode、校验 remote shell override、分配 process id。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:244][E: codex-rs/core/src/tools/handlers/unified_exec.rs:146][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:289]
5. 合并 turn grants、校验 additional permissions 与 non-OnRequest escalation，再规范化权限请求。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:333][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:348]
6. 若命令是 `apply_patch`，调用 `intercept_apply_patch`；命中时释放 process id 并包装成 `ExecCommandToolOutput`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:385][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:403]
7. Interactive 走 `manager.exec_command`；OneShot 走 `exec_command_to_completion`。请求携带 command、shell type、process id、yield/max tokens、cwd、environment、network、TTY、权限和 approval hints。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:421][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:468]
8. sandbox denial 被转成 terminal `ExecCommandToolOutput`，明确 `process_id: None`，因此不会再由 `write_stdin` 续写。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:450][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:468]

## 8 hooks / edge

pre hook 以 Bash hook name 暴露原始 `cmd`，hook rewrite 会把更新后的 command 写回 `cmd` 字段。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:520][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:525]

post hook 复用 unified-exec helper，使用 Bash hook name，并从 tool output 取 hook input / response。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:80]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/unified_exec/oneshot.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [write_stdin 工具](write-stdin.md) — 对 interactive `exec_command` 返回的 live session 写 stdin 或轮询输出。
- [shell_command（已退役）](shell-command.md) — reserved name；不再注册 handler。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — process manager、PTY、output chunk 与 stdin 续写机制。
