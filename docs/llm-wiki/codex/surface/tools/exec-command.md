---
id: tool.exec-command
title: exec_command 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/unified_exec.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [build_tool_router, add_tool_sources, add_shell_tools, ExecCommandHandler, ExecCommandHandlerOptions, ExecCommandArgs, create_exec_command_tool_with_environment_id, unified_exec_output_schema, resolve_max_tokens, ToolSpec::Function, ConfigShellToolType::UnifiedExec]
related: [tool.write-stdin, tool.shell-command, subsys.core.unified-exec, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: db887d03e1
---

> `exec_command` 是当前 unified-exec shell surface 的启动工具：模型提交 `cmd`，handler 解析环境、工作目录、shell/login/TTY/权限字段，分配 process id 后交给 `UnifiedExecProcessManager::exec_command`；命令未结束时输出可携带 `session_id`，供后续 `write_stdin` 调用使用。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:88][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:344][E: codex-rs/core/src/tools/context.rs:427]

## 能回答的问题

- `exec_command` 的 wire name、ToolSpec 类型、具体 handler 是什么?
- `exec_command` 的 schema 字段和 runtime 默认值在哪里定义?
- 它何时由 `spec_plan.rs` 暴露，何时和 legacy `shell_command` 共存?
- 它怎样解析 environment/workdir/shell/login/权限，并交给 unified-exec manager?
- 它的输出 schema、文本输出和 code-mode JSON 如何对应?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ExecCommandHandler::tool_name()` 返回 plain `"exec_command"`；schema constructor 也把 `ResponsesApiTool.name` 设为 `"exec_command"`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:82][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:82][E: codex-rs/core/src/tools/handlers/shell_spec.rs:88][E: codex-rs/core/src/tools/handlers/shell_spec.rs:89] |
| concrete handler | `ExecCommandHandler` 保存 `ExecCommandHandlerOptions`，`spec_plan.rs` 的 unified-exec 分支构造并注册它。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:50][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:58][E: codex-rs/core/src/tools/spec_plan.rs:660] |
| ToolSpec | `create_exec_command_tool_with_environment_id` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:21][E: codex-rs/core/src/tools/handlers/shell_spec.rs:88][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:19] |
| handler contract | handler 实现 `ToolExecutor<ToolInvocation>`，`spec()` 调用当前 schema constructor，`supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:82][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:86][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:97] |

## 2 用途定位

`exec_command` 负责启动或等待一条 shell 命令；schema 上它与 `write_stdin` 通过 `session_id` 衔接：`exec_command` 的 required 只有 `cmd`，`write_stdin` 的 required 是 `session_id`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:101][E: codex-rs/core/src/tools/handlers/shell_spec.rs:103][E: codex-rs/core/src/tools/handlers/shell_spec.rs:145][E: codex-rs/core/src/tools/handlers/shell_spec.rs:147]

运行时会先按 turn environment 解析 `environment_id` 与 `workdir`，然后根据环境选择 shell mode、分配 process id，并由 `get_command` 派生命令 argv。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:131][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:132][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:146][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:148][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:203][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:232]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `cmd` | `string` | 是 | 无 | schema properties 固定包含 `cmd`，required 列表只要求 `cmd`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:26][E: codex-rs/core/src/tools/handlers/shell_spec.rs:28][E: codex-rs/core/src/tools/handlers/shell_spec.rs:101][E: codex-rs/core/src/tools/handlers/shell_spec.rs:103] | `ExecCommandArgs.cmd` 是 string；handler 将其作为 hook command，并由 `get_command` 派生 argv。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:28][E: codex-rs/core/src/tools/handlers/unified_exec.rs:29][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:192][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:232] |
| `workdir` | `string` | 否 | selected environment cwd | schema 描述 `workdir` 默认 turn cwd。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:31][E: codex-rs/core/src/tools/handlers/shell_spec.rs:34] | handler 先按 `environment_id` 选环境，再把相对 `workdir` join 到该环境 cwd。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:51][E: codex-rs/core/src/tools/handlers/unified_exec.rs:57][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:132][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:146][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:148] |
| `shell` | `string` | 否 | session/environment shell | 只有 `include_shell_parameter` 为 true 时 schema 插入 `shell`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:58][E: codex-rs/core/src/tools/handlers/shell_spec.rs:60] | local zsh-fork 模式拒绝显式 `shell`，Direct 模式可用模型提供 shell path 覆盖 session shell；remote environment 只接受与该 environment reported shell type 匹配的 `shell`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:113][E: codex-rs/core/src/tools/handlers/unified_exec.rs:115][E: codex-rs/core/src/tools/handlers/unified_exec.rs:125][E: codex-rs/core/src/tools/handlers/unified_exec.rs:126][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:214][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:223][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:224] |
| `login` | `boolean` | 否 | `allow_login_shell` | 只有 `allow_login_shell` 为 true 时 schema 插入 `login`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:66][E: codex-rs/core/src/tools/handlers/shell_spec.rs:68] | `get_command` 在 config 禁止 login shell 但模型传 `true` 时返回错误，否则默认使用 `allow_login_shell`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:103][E: codex-rs/core/src/tools/handlers/unified_exec.rs:104][E: codex-rs/core/src/tools/handlers/unified_exec.rs:109][E: codex-rs/core/src/tools/handlers/unified_exec.rs:110] |
| `environment_id` | `string` | 否 | primary environment | 只有 multiple-environment 模式传入 `include_environment_id` 时 schema 插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:75][E: codex-rs/core/src/tools/handlers/shell_spec.rs:77] | handler 先解析 `ExecCommandEnvironmentArgs.environment_id`，再 `resolve_tool_environment(...)`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:51][E: codex-rs/core/src/tools/handlers/unified_exec.rs:53][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:131][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:132] |
| `tty` | `boolean` | 否 | `false` | schema 描述是否分配 PTY。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:39][E: codex-rs/core/src/tools/handlers/shell_spec.rs:41] | serde default `default_tty()` 返回 false；handler 把 `tty` 放进 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:34][E: codex-rs/core/src/tools/handlers/unified_exec.rs:69][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:268][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:357] |
| `yield_time_ms` | `number` | 否 | `10000` | schema 描述等待输出时间，默认 10000ms。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:46][E: codex-rs/core/src/tools/handlers/shell_spec.rs:48] | runtime default `default_exec_yield_time_ms()` 返回 `10_000`，请求传给 manager。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:36][E: codex-rs/core/src/tools/handlers/unified_exec.rs:61][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:245][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:350] |
| `max_output_tokens` | `number` | 否 | `10000 tokens` | schema 描述输出 token 预算默认 10000 tokens。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:52][E: codex-rs/core/src/tools/handlers/shell_spec.rs:54] | runtime 默认常量是 `10_000`，输出再受 truncation policy cap，并按 token policy 截断 raw bytes 的 lossy UTF-8 文本。[E: codex-rs/core/src/unified_exec/mod.rs:70][E: codex-rs/core/src/unified_exec/mod.rs:177][E: codex-rs/core/src/unified_exec/mod.rs:178][E: codex-rs/core/src/tools/context.rs:407][E: codex-rs/core/src/tools/context.rs:407][E: codex-rs/core/src/tools/context.rs:408][E: codex-rs/core/src/tools/context.rs:412] |
| `sandbox_permissions` | enum string | 否 | `use_default` | approval helper 总是插入 `sandbox_permissions`；可选值包含 `use_default` 和 `require_escalated`，ExecPermissionApprovals 开启时还包含 `with_additional_permissions`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:295][E: codex-rs/core/src/tools/handlers/shell_spec.rs:298][E: codex-rs/core/src/tools/handlers/shell_spec.rs:299][E: codex-rs/core/src/tools/handlers/shell_spec.rs:300][E: codex-rs/core/src/tools/handlers/shell_spec.rs:302][E: codex-rs/core/src/tools/handlers/shell_spec.rs:311] | `ExecCommandArgs.sandbox_permissions` 有 serde default；handler 合并 turn grants 后校验 sandbox override 与 approval policy。[E: codex-rs/core/src/tools/handlers/unified_exec.rs:40][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:259][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:273][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:277] |
| `additional_permissions` | object | 否 | 无 | 只有 ExecPermissionApprovals 开启时 approval helper 才插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:331][E: codex-rs/core/src/tools/handlers/shell_spec.rs:337] | handler 只在相关 feature 或预批准权限存在时允许 additional permissions。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:254][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:267][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:268] |
| `justification` | `string` | 否 | 无 | approval helper 插入用户可见说明字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:317][E: codex-rs/core/src/tools/handlers/shell_spec.rs:320] | handler 把 `justification` 放进 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:249][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:362] |
| `prefix_rule` | `array<string>` | 否 | 无 | approval helper 插入可复用 approval prefix 字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:323][E: codex-rs/core/src/tools/handlers/shell_spec.rs:326] | handler 把 `prefix_rule` 放进 `ExecCommandRequest`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:250][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:363] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["cmd"]), Some(false))`，所以 schema 层 required 只有 `cmd`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:101][E: codex-rs/core/src/tools/handlers/shell_spec.rs:103][E: codex-rs/core/src/tools/handlers/shell_spec.rs:104]

## 4 输出 schema & 截断

`exec_command` 声明 `output_schema: Some(unified_exec_output_schema())`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:106] 该 schema 是 object，properties 包含 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count`、`output`，required 是 `wall_time_seconds` 和 `output`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:261][E: codex-rs/core/src/tools/handlers/shell_spec.rs:264][E: codex-rs/core/src/tools/handlers/shell_spec.rs:265][E: codex-rs/core/src/tools/handlers/shell_spec.rs:269][E: codex-rs/core/src/tools/handlers/shell_spec.rs:273][E: codex-rs/core/src/tools/handlers/shell_spec.rs:277][E: codex-rs/core/src/tools/handlers/shell_spec.rs:281][E: codex-rs/core/src/tools/handlers/shell_spec.rs:285][E: codex-rs/core/src/tools/handlers/shell_spec.rs:290]

普通 function-call 输出仍由 `ExecCommandToolOutput::response_text()` 生成文本：它可包含 chunk id、wall time、exit code、running session id、original token count 和截断后的 `Output:`。[E: codex-rs/core/src/tools/context.rs:412][E: codex-rs/core/src/tools/context.rs:416][E: codex-rs/core/src/tools/context.rs:423][E: codex-rs/core/src/tools/context.rs:423][E: codex-rs/core/src/tools/context.rs:427][E: codex-rs/core/src/tools/context.rs:434][E: codex-rs/core/src/tools/context.rs:434][E: codex-rs/core/src/tools/context.rs:435]

code-mode nested result 是结构化 JSON，对齐 `chunk_id`、`wall_time_seconds`、`exit_code`、`session_id`、`original_token_count` 和 `output` 字段。[E: codex-rs/core/src/tools/context.rs:369][E: codex-rs/core/src/tools/context.rs:376][E: codex-rs/core/src/tools/context.rs:374][E: codex-rs/core/src/tools/context.rs:376][E: codex-rs/core/src/tools/context.rs:381][E: codex-rs/core/src/tools/context.rs:380][E: codex-rs/core/src/tools/context.rs:381][E: codex-rs/core/src/tools/context.rs:385]

## 5 注册与门控

`build_tool_router` 调用 `build_tool_specs_and_registry`，后者通过 `add_tool_sources` 进入 `add_shell_tools`。[E: codex-rs/core/src/tools/spec_plan.rs:160][E: codex-rs/core/src/tools/spec_plan.rs:165][E: codex-rs/core/src/tools/spec_plan.rs:613][E: codex-rs/core/src/tools/spec_plan.rs:614] `add_shell_tools` 先取 `tool_environment_mode()`，没有 environment 时直接返回。[E: codex-rs/core/src/tools/spec_plan.rs:641][E: codex-rs/core/src/tools/spec_plan.rs:644][E: codex-rs/core/src/tools/spec_plan.rs:645][E: codex-rs/core/src/tools/spec_plan.rs:646]

shell 类型选择来自 `shell_type_for_model_and_features`：ShellTool 或 UnifiedExec feature 关闭会禁用 unified-exec；ShellZshFork 只有和 UnifiedExecZshFork 同开才进入 unified-exec zsh-fork 组合；最后还要求 ConPTY 支持，否则回落到 `ShellCommand`。[E: codex-rs/tools/src/tool_config.rs:67][E: codex-rs/tools/src/tool_config.rs:68][E: codex-rs/tools/src/tool_config.rs:70][E: codex-rs/tools/src/tool_config.rs:71][E: codex-rs/tools/src/tool_config.rs:81][E: codex-rs/tools/src/tool_config.rs:102][E: codex-rs/tools/src/tool_config.rs:107][E: codex-rs/tools/src/tool_config.rs:108][E: codex-rs/tools/src/tool_config.rs:111]

当结果是 `ConfigShellToolType::UnifiedExec` 时，`spec_plan.rs` 通过普通 `add` 注册 `ExecCommandHandler` 与 `WriteStdinHandler`，并把 `ShellCommandHandler` 通过 `add_dispatch_only` 包成 hidden legacy tool；visible-spec 构建只收集 direct exposure 的 runtime specs。[E: codex-rs/protocol/src/openai_models.rs:271][E: codex-rs/protocol/src/openai_models.rs:274][E: codex-rs/core/src/tools/spec_plan.rs:130][E: codex-rs/core/src/tools/spec_plan.rs:134][E: codex-rs/core/src/tools/spec_plan.rs:245][E: codex-rs/core/src/tools/spec_plan.rs:250][E: codex-rs/core/src/tools/spec_plan.rs:251][E: codex-rs/core/src/tools/spec_plan.rs:253][E: codex-rs/core/src/tools/spec_plan.rs:658][E: codex-rs/core/src/tools/spec_plan.rs:659][E: codex-rs/core/src/tools/spec_plan.rs:660][E: codex-rs/core/src/tools/spec_plan.rs:669][E: codex-rs/core/src/tools/spec_plan.rs:673]

## 6 parallel support

`ExecCommandHandler::supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:96][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:97] router 查询 registry 的支持位，找不到时才回退 false。[E: codex-rs/core/src/tools/router.rs:100][E: codex-rs/core/src/tools/router.rs:102][E: codex-rs/core/src/tools/router.rs:103]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:120][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:121][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:123]
2. 它从 session services 取 `UnifiedExecProcessManager`，建立 `UnifiedExecContext`，并选择 turn environment。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:129][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:130][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:132]
3. 它解析 `workdir`、检查 native path convention 与 sandbox 要求，再按 base path 解析完整参数。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:146][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:148][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:157][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:167][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:183]
4. 它可触发 implicit skill invocation，随后选择 local/remote shell mode、校验 remote shell override、分配 process id。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:195][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:201][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:203][E: codex-rs/core/src/tools/handlers/unified_exec.rs:144][E: codex-rs/core/src/tools/handlers/unified_exec.rs:148][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:214][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:223][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:231]
5. 它合并 turn grants、校验 additional permissions 与 non-OnRequest escalation，再规范化权限请求。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:259][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:267][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:273][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:289][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:296]
6. 如果命令是 `apply_patch`，handler 会调用 `intercept_apply_patch`，命中时释放 process id 并包装成 `ExecCommandToolOutput`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:314][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:327][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:328]
7. 普通命令进入 `manager.exec_command(ExecCommandRequest { ... })`；请求携带 command、shell type、process id、yield/max tokens、cwd、environment、network、TTY、权限和 approval hints。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:343][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:344][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:345][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:346][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:347][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:349][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:350][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:352][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:354][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:356][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:357][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:358][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:359][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:362][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:363]
8. sandbox denial 被转成 terminal `ExecCommandToolOutput`，明确 `process_id: None`，因此不会再由 `write_stdin` 续写。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:370][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:373][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:382]

## 8 hooks / edge

pre hook 以 Bash hook name 暴露原始 `cmd`，hook rewrite 会把更新后的 command 写回 `cmd` 字段。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:400][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:427][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:408][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:409][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:413][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:424][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:427][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:428]

post hook 复用 unified-exec helper，使用 Bash hook name，并从 tool output 取 hook input / response。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:434][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:439][E: codex-rs/core/src/tools/handlers/unified_exec.rs:78][E: codex-rs/core/src/tools/handlers/unified_exec.rs:86][E: codex-rs/core/src/tools/handlers/unified_exec.rs:88][E: codex-rs/core/src/tools/handlers/unified_exec.rs:90]

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

## 相关

- [write_stdin 工具](write-stdin.md) — 对 `exec_command` 返回的 live session 写 stdin 或轮询输出。
- [shell_command 工具](shell-command.md) — legacy/非 unified shell surface；在 unified-exec 可见时仍 hidden dispatch-only。
- [Unified-exec 运行时](../../subsystems/core/unified-exec.md) — process manager、PTY、output chunk 与 stdin 续写机制。
