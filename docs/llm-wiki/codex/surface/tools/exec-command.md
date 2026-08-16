---
id: tool.exec-command
title: exec_command 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/features/src/lib.rs]
symbols: [ExecCommandHandler, ExecCommandHandlerOptions, ExecCommandArgs, create_exec_command_tool_with_environment_id, resolve_max_tokens, ConfigShellToolType::UnifiedExec]
related: [tool.write-stdin, tool.shell-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `exec_command` 是当前 unified-exec shell surface 的启动工具：模型提交 `cmd`，handler 解析环境、工作目录、shell/login/TTY/权限字段，分配 process id 后交给 `UnifiedExecProcessManager::exec_command`；命令未结束时输出可携带 `session_id`，供后续 `write_stdin` 调用使用。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:91][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:350][E: codex-rs/core/src/tools/context.rs:456]

## 能回答的问题

- `exec_command` 的 wire name、ToolSpec 类型、具体 handler 是什么?
- `exec_command` 的 schema 字段和 runtime 默认值在哪里定义?
- 它何时由 `spec_plan.rs` 暴露，何时和 legacy `shell_command` 共存?
- Guardian reviewer turn 为什么仍能看到它?
- 它怎样解析 environment/workdir/shell/login/权限，并交给 unified-exec manager?
- 它的输出 schema、文本输出和 code-mode JSON 如何对应?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ExecCommandHandler::tool_name()` 返回 plain `"exec_command"`；schema constructor 也把 `ResponsesApiTool.name` 设为 `"exec_command"`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:82][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:83][E: codex-rs/core/src/tools/handlers/shell_spec.rs:91][E: codex-rs/core/src/tools/handlers/shell_spec.rs:92] |
| concrete handler | `ExecCommandHandler` 保存 `ExecCommandHandlerOptions`，`spec_plan.rs` 的 unified-exec 分支和 Guardian reviewer 分支都会构造并注册它。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:58][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:76][E: codex-rs/core/src/tools/spec_plan.rs:907][E: codex-rs/core/src/tools/spec_plan.rs:981] |
| ToolSpec | `create_exec_command_tool_with_environment_id` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:21][E: codex-rs/core/src/tools/handlers/shell_spec.rs:91][E: codex-rs/tools/src/tool_spec.rs:20] |
| handler contract | handler 实现 `ToolExecutor<ToolInvocation>`，`spec()` 调用当前 schema constructor，`supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:82][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:86][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:97] |

## 2 用途定位

`exec_command` 负责启动或等待一条 shell 命令；schema 上它与 `write_stdin` 通过 `session_id` 衔接：`exec_command` 的 required 只有 `cmd`，`write_stdin` 的 required 是 `session_id`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:104][E: codex-rs/core/src/tools/handlers/shell_spec.rs:106][E: codex-rs/core/src/tools/handlers/shell_spec.rs:148][E: codex-rs/core/src/tools/handlers/shell_spec.rs:150]

运行时会先按 turn environment 解析 `environment_id` 与 `workdir`，然后根据环境选择 shell mode、分配 process id，并由 `get_command` 派生命令 argv。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:133][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:144][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:203][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:232]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `cmd` | `string` | 是 | 无 | schema properties 固定包含 `cmd`，required 列表只要求 `cmd`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:33][E: codex-rs/core/src/tools/handlers/shell_spec.rs:34][E: codex-rs/core/src/tools/handlers/shell_spec.rs:104][E: codex-rs/core/src/tools/handlers/shell_spec.rs:106] | `ExecCommandArgs.cmd` 是 string；handler 将其作为 hook command，并由 `get_command` 派生 argv。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:28][E: codex-rs/core/src/tools/handlers/unified_exec.rs:29][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:193][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:232] |
| `workdir` | `string` | 否 | selected environment cwd | schema 描述 `workdir` 默认 turn cwd。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:37][E: codex-rs/core/src/tools/handlers/shell_spec.rs:39] | handler 先按 `environment_id` 选环境，再把相对 `workdir` join 到该环境 cwd。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:51][E: codex-rs/core/src/tools/handlers/unified_exec.rs:57][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:133][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:144][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:150] |
| `shell` | `string` | 否 | session/environment shell | 只有 `include_shell_parameter` 为 true 时 schema 插入 `shell`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:61][E: codex-rs/core/src/tools/handlers/shell_spec.rs:63] | local zsh-fork 模式拒绝显式 `shell`，Direct 模式可用模型提供 shell path 覆盖 session shell；remote environment 只接受与该 environment reported shell type 匹配的 `shell`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:125][E: codex-rs/core/src/tools/handlers/unified_exec.rs:127][E: codex-rs/core/src/tools/handlers/unified_exec.rs:114][E: codex-rs/core/src/tools/handlers/unified_exec.rs:119][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:214][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:223] |
| `login` | `boolean` | 否 | `allow_login_shell` | 只有 `allow_login_shell` 为 true 时 schema 插入 `login`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:69][E: codex-rs/core/src/tools/handlers/shell_spec.rs:71] | `get_command` 在 config 禁止 login shell 但模型传 `true` 时返回错误，否则默认使用 `allow_login_shell`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:103][E: codex-rs/core/src/tools/handlers/unified_exec.rs:104][E: codex-rs/core/src/tools/handlers/unified_exec.rs:109][E: codex-rs/core/src/tools/handlers/unified_exec.rs:110] |
| `environment_id` | `string` | 否 | primary environment | 只有 multiple-environment 模式传入 `include_environment_id` 时 schema 插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:78][E: codex-rs/core/src/tools/handlers/shell_spec.rs:80] | handler 先解析 `ExecCommandEnvironmentArgs.environment_id`，再 `resolve_tool_environment(...)`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:51][E: codex-rs/core/src/tools/handlers/unified_exec.rs:53][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:133][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:136] |
| `tty` | `boolean` | 否 | `false` | schema 描述是否分配 PTY。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:44][E: codex-rs/core/src/tools/handlers/shell_spec.rs:46] | serde default `default_tty()` 返回 false；handler 把 `tty` 放进 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:34][E: codex-rs/core/src/tools/handlers/unified_exec.rs:68][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:244][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:363] |
| `yield_time_ms` | `number` | 否 | `10000` | Unix-like 平台有效范围 250–30000ms；Windows 当前有效范围是 10000–30000ms。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:26][E: codex-rs/core/src/tools/handlers/shell_spec.rs:29][E: codex-rs/core/src/unified_exec/mod.rs:66][E: codex-rs/core/src/unified_exec/mod.rs:67] | runtime default `default_exec_yield_time_ms()` 返回 `10_000`，请求传给 manager。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:36][E: codex-rs/core/src/tools/handlers/unified_exec.rs:60][E: codex-rs/core/src/tools/handlers/unified_exec.rs:61] |
| `max_output_tokens` | `number` | 否 | `10000 tokens` | schema 描述输出 token 预算默认 10000 tokens。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:55][E: codex-rs/core/src/tools/handlers/shell_spec.rs:57] | runtime 默认常量是 `10_000`，输出再受 truncation policy cap，并按 token policy 截断 raw bytes 的 lossy UTF-8 文本。[E: codex-rs/core/src/unified_exec/mod.rs:72][E: codex-rs/core/src/unified_exec/mod.rs:203][E: codex-rs/core/src/unified_exec/mod.rs:204][E: codex-rs/core/src/tools/context.rs:409][E: codex-rs/core/src/tools/context.rs:412] |
| `sandbox_permissions` | enum string | 否 | `use_default` | approval helper 插入该字段；可选值包含 `use_default` 和 `require_escalated`，ExecPermissionApprovals 开启时还包含 `with_additional_permissions`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:301][E: codex-rs/core/src/tools/handlers/shell_spec.rs:305][E: codex-rs/core/src/tools/handlers/shell_spec.rs:314] | 参数在解析时仍是 optional；若同时给出 `justification` 却省略此字段，handler 明确返回模型错误，不再静默按默认权限执行。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:40][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:191] |
| `additional_permissions` | object | 否 | 无 | 只有 ExecPermissionApprovals 开启时 approval helper 才插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:334][E: codex-rs/core/src/tools/handlers/shell_spec.rs:340] | handler 只在相关 feature 或预批准权限存在时允许 additional permissions。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:267][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:269] |
| `justification` | `string` | 否 | 无 | approval helper 插入用户可见说明字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:321][E: codex-rs/core/src/tools/handlers/shell_spec.rs:323] | 只能与显式 `sandbox_permissions` 一起使用；unsandboxed 请求应传 `require_escalated`，否则应省略 justification。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:191] |
| `prefix_rule` | `array<string>` | 否 | 无 | approval helper 插入可复用 approval prefix 字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:327][E: codex-rs/core/src/tools/handlers/shell_spec.rs:329] | handler 把 `prefix_rule` 放进 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:250][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:369] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["cmd"]), Some(false))`，所以 schema 层 required 只有 `cmd`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:104][E: codex-rs/core/src/tools/handlers/shell_spec.rs:106][E: codex-rs/core/src/tools/handlers/shell_spec.rs:107]

## 4 输出 schema & 截断

`exec_command` 声明 `output_schema: Some(unified_exec_output_schema())`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:109] 该 schema 是 object，properties 包含 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count`、`output`，required 是 `wall_time_seconds` 和 `output`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:264][E: codex-rs/core/src/tools/handlers/shell_spec.rs:268][E: codex-rs/core/src/tools/handlers/shell_spec.rs:272][E: codex-rs/core/src/tools/handlers/shell_spec.rs:276][E: codex-rs/core/src/tools/handlers/shell_spec.rs:280][E: codex-rs/core/src/tools/handlers/shell_spec.rs:284][E: codex-rs/core/src/tools/handlers/shell_spec.rs:288][E: codex-rs/core/src/tools/handlers/shell_spec.rs:293]

普通 function-call 输出仍由 `ExecCommandToolOutput::response_text()` 生成文本：它可包含 chunk id、wall time、exit code、running session id、original token count 和截断后的 `Output:`。[E: codex-rs/core/src/tools/context.rs:442][E: codex-rs/core/src/tools/context.rs:446][E: codex-rs/core/src/tools/context.rs:450][E: codex-rs/core/src/tools/context.rs:453][E: codex-rs/core/src/tools/context.rs:457][E: codex-rs/core/src/tools/context.rs:464][E: codex-rs/core/src/tools/context.rs:465]

code-mode nested result 是结构化 JSON，对齐 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count` 和 `output` 字段。[E: codex-rs/core/src/tools/context.rs:374][E: codex-rs/core/src/tools/context.rs:378][E: codex-rs/core/src/tools/context.rs:381][E: codex-rs/core/src/tools/context.rs:383][E: codex-rs/core/src/tools/context.rs:385][E: codex-rs/core/src/tools/context.rs:386]

## 5 注册与门控

`build_tool_router` 经 `add_core_tool_sources` 进入两条互斥路径。Guardian reviewer source 先被单独处理：若当前 `permission_profile()` 不是 `PermissionProfile::Managed { .. }`，函数直接返回，不注册任何 core tool；若是 Managed 且 turn 有 environment，则只注册 `ExecCommandHandler`、`WriteStdinHandler` 和可选 `view_image`，然后提前返回。[E: codex-rs/core/src/tools/spec_plan.rs:896][E: codex-rs/core/src/tools/spec_plan.rs:898][E: codex-rs/core/src/tools/spec_plan.rs:902][E: codex-rs/core/src/tools/spec_plan.rs:905][E: codex-rs/core/src/tools/spec_plan.rs:907][E: codex-rs/core/src/tools/spec_plan.rs:916][E: codex-rs/core/src/tools/spec_plan.rs:930]

普通 turn 才进入 `add_shell_tools`。没有 environment 时立即返回。[E: codex-rs/core/src/tools/spec_plan.rs:933][E: codex-rs/core/src/tools/spec_plan.rs:961][E: codex-rs/core/src/tools/spec_plan.rs:965]

`Feature::UnifiedExec` 现在全平台默认 `true`（含 Windows）。[E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:841] shell 类型选择来自 `shell_type_for_model_and_features`：ShellTool 或 UnifiedExec feature 关闭会禁用 unified-exec；ShellZshFork 只有和 UnifiedExecZshFork 同开才进入 unified-exec zsh-fork 组合；最后还要求 ConPTY 支持，否则回落到 `ShellCommand`。[E: codex-rs/tools/src/tool_config.rs:67][E: codex-rs/tools/src/tool_config.rs:68][E: codex-rs/tools/src/tool_config.rs:70][E: codex-rs/tools/src/tool_config.rs:81][E: codex-rs/tools/src/tool_config.rs:105][E: codex-rs/tools/src/tool_config.rs:108][E: codex-rs/tools/src/tool_config.rs:111]

当结果是 `ConfigShellToolType::UnifiedExec` 时，registry 直接注册 `ExecCommandHandler` 与 `WriteStdinHandler`；若同时存在 single local environment，再以 Hidden exposure 注册 legacy `ShellCommandHandler`。Guardian reviewer 路径不会注册 `shell_command`。[E: codex-rs/core/src/tools/spec_plan.rs:979][E: codex-rs/core/src/tools/spec_plan.rs:990][E: codex-rs/core/src/tools/spec_plan.rs:992][E: codex-rs/core/src/tools/spec_plan.rs:997][E: codex-rs/core/src/tools/spec_plan.rs:930]

## 6 parallel support

`ExecCommandHandler::supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:97][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:98] router 查询 registry 的支持位，找不到时才回退 false。[E: codex-rs/core/src/tools/router.rs:137][E: codex-rs/core/src/tools/router.rs:139][E: codex-rs/core/src/tools/router.rs:140]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:121][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:122][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:124]
2. 它从 session services 取 `UnifiedExecProcessManager`，建立 `UnifiedExecContext`，并选择 turn environment。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:130][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:132][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:134]
3. 它解析 `workdir`、检查 native path convention 与 sandbox 要求，再按 base path 解析完整参数。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:144][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:158][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:167][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:180]
4. 它可触发 implicit skill invocation，随后选择 local/remote shell mode、校验 remote shell override、分配 process id。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:194][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:203][E: codex-rs/core/src/tools/handlers/unified_exec.rs:144][E: codex-rs/core/src/tools/handlers/unified_exec.rs:148][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:214][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231]
5. 它合并 turn grants、校验 additional permissions 与 non-OnRequest escalation，再规范化权限请求。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:259][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:267][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:273][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:289]
6. 如果命令是 `apply_patch`，handler 会调用 `intercept_apply_patch`，命中时释放 process id 并包装成 `ExecCommandToolOutput`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:314][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:331][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:332]
7. 普通命令进入 `manager.exec_command(ExecCommandRequest { ... })`；请求携带 command、shell type、process id、yield/max tokens、cwd、environment、network、TTY、权限和 approval hints。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:349][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:350][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:351][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:355][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:363][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:369]
8. sandbox denial 被转成 terminal `ExecCommandToolOutput`，明确 `process_id: None`，因此不会再由 `write_stdin` 续写。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:376][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:394][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:394]

## 8 hooks / edge

pre hook 以 Bash hook name 暴露原始 `cmd`，hook rewrite 会把更新后的 command 写回 `cmd` 字段。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:413][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:418][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:421][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:437][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:440]

post hook 复用 unified-exec helper，使用 Bash hook name，并从 tool output 取 hook input / response。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:447][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:452][E: codex-rs/core/src/tools/handlers/unified_exec.rs:78][E: codex-rs/core/src/tools/handlers/unified_exec.rs:86][E: codex-rs/core/src/tools/handlers/unified_exec.rs:88][E: codex-rs/core/src/tools/handlers/unified_exec.rs:90]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [write_stdin 工具](write-stdin.md) — 对 `exec_command` 返回的 live session 写 stdin 或轮询输出。
- [shell_command 工具](shell-command.md) — legacy/非 unified shell surface；在 unified-exec 可见时仍 hidden dispatch-only。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — process manager、PTY、output chunk 与 stdin 续写机制。
