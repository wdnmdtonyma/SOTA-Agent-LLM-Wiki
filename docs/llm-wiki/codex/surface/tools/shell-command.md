---
id: tool.shell-command
title: shell_command 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/shell_spec.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/handlers/shell/shell_command.rs, codex-rs/core/src/tools/runtimes/shell.rs, codex-rs/tools/src/tool_config.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [add_shell_tools, ShellCommandHandler, ShellCommandHandlerOptions, ShellCommandBackendConfig, ShellCommandToolCallParams, create_shell_command_tool, shell_command_backend_for_features, ShellRuntimeBackend, run_exec_like, ConfigShellToolType::ShellCommand]
related: [tool.exec-command, tool.write-stdin, subsys.core.tool-system, subsys.exec-sandbox.shell-parsing, subsys.exec-sandbox.shell-escalation]
evidence: explicit
status: verified
updated: 5670360009
---

> `shell_command` 是 Codex 的 legacy shell function surface：模型传 `command: string`，handler 用 session user shell 派生 argv，再走 shared shell runtime 的权限、approval、sandbox 和 output event 流。当前它在 `Default`、`Local` 或 `ShellCommand` shell 类型下通过普通 `add` 注册；`Disabled` 不注册；当 unified-exec 可见时，它以 hidden dispatch-only handler 注册以兼容旧调用。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:154][E: codex-rs/core/src/tools/handlers/shell_spec.rs:210][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:92][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:94][E: codex-rs/core/src/tools/spec_plan.rs:655][E: codex-rs/core/src/tools/spec_plan.rs:657][E: codex-rs/core/src/tools/spec_plan.rs:659][E: codex-rs/core/src/tools/spec_plan.rs:660][E: codex-rs/core/src/tools/spec_plan.rs:663]

## 能回答的问题

- `shell_command` 的 wire name、ToolSpec 类型、具体 handler 是什么?
- 它的 schema 字段和 `ShellCommandToolCallParams` 如何对应?
- 它在 `spec_plan.rs` 中何时可见、何时 hidden dispatch-only?
- 它怎样把 shell script 字符串派生为 argv 并运行?
- zsh-fork backend 在哪里选择和执行?
- 它是否支持 parallel tool calls，是否等待 runtime cancellation?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ShellCommandHandler::tool_name()` 返回 plain `"shell_command"`；schema constructor 也把 `ResponsesApiTool.name` 设为 `"shell_command"`。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:131][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:133][E: codex-rs/core/src/tools/handlers/shell_spec.rs:210][E: codex-rs/core/src/tools/handlers/shell_spec.rs:211] |
| concrete handler | `ShellCommandHandler` 保存 backend 与 options；`ShellCommandHandler::new` 根据 `ShellCommandBackendConfig` 选择 Classic 或 ZshFork。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:40][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:41][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:42][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:46][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:47][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:54][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:56] |
| ToolSpec | `create_shell_command_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，且 `output_schema: None`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:154][E: codex-rs/core/src/tools/handlers/shell_spec.rs:210][E: codex-rs/core/src/tools/handlers/shell_spec.rs:220][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:19] |
| handler contract | handler 实现 `ToolExecutor<ToolInvocation>`，`spec()` 调用 `create_shell_command_tool(...)`，`supports_parallel_tool_calls()` 返回 true。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:131][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:136][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:143][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:144] |

## 2 用途定位

`shell_command` 的核心输入是一段 shell script 字符串，而不是 argv array。handler 通过 `ShellCommandHandler::base_command(shell, command, use_login_shell)` 调用 `shell.derive_exec_args(...)`，让用户 shell 解释这段脚本。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:81][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:82][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:92][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:94]

该工具先构造 `ExecParams`，再进入 `run_exec_like`，由 `ShellRuntime::for_shell_command(...)` 和 `ToolOrchestrator` 执行。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:187][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:195][E: codex-rs/core/src/tools/handlers/shell.rs:204][E: codex-rs/core/src/tools/handlers/shell.rs:205][E: codex-rs/core/src/tools/handlers/shell.rs:212]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | schema properties 固定包含 `command`，required 列表只要求 `command`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:155][E: codex-rs/core/src/tools/handlers/shell_spec.rs:157][E: codex-rs/core/src/tools/handlers/shell_spec.rs:215][E: codex-rs/core/src/tools/handlers/shell_spec.rs:217] | protocol struct `ShellCommandToolCallParams.command` 是 string；handler 解析后用它触发 implicit skill invocation 并派生 argv。[E: codex-rs/protocol/src/models.rs:1696][E: codex-rs/protocol/src/models.rs:1697][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:176][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:179] |
| `workdir` | `string` | 否 | turn cwd | schema 描述工作目录默认 turn cwd。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:163][E: codex-rs/core/src/tools/handlers/shell_spec.rs:165] | handler 先解析 base cwd，再用 `turn.resolve_path(params.workdir.clone())` 生成执行 cwd。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:175][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:176][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:177][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:178] |
| `timeout_ms` | `number` | 否 | runtime expiration default | schema 描述最大运行时间默认 10000ms。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:169][E: codex-rs/core/src/tools/handlers/shell_spec.rs:171] | protocol struct 支持 `timeout_ms`，并通过 serde alias 接受 `timeout`；`to_exec_params` 把它转为 `ExecParams.expiration`。[E: codex-rs/protocol/src/models.rs:1703][E: codex-rs/protocol/src/models.rs:1704][E: codex-rs/protocol/src/models.rs:1705][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:101] |
| `login` | `boolean` | 否 | `allow_login_shell` | 只有 `allow_login_shell` 为 true 时 schema 插入 `login`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:175][E: codex-rs/core/src/tools/handlers/shell_spec.rs:177] | `resolve_use_login_shell` 在 config 禁止 login shell 但模型传 `true` 时返回模型错误，否则使用配置默认值。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:68][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:72][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:78] |
| `sandbox_permissions` | enum string | 否 | `UseDefault` | approval helper 插入 sandbox override 字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:184][E: codex-rs/core/src/tools/handlers/shell_spec.rs:295][E: codex-rs/core/src/tools/handlers/shell_spec.rs:311] | protocol 字段是 optional；`to_exec_params` 使用 `unwrap_or_default()`。[E: codex-rs/protocol/src/models.rs:1706][E: codex-rs/protocol/src/models.rs:1708][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:109] |
| `additional_permissions` | object | 否 | 无 | ExecPermissionApprovals 开启时 approval helper 才插入。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:331][E: codex-rs/core/src/tools/handlers/shell_spec.rs:337] | handler 把它传给 `run_exec_like`，后者合并 turn grants 并校验是否允许请求 additional permissions。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:201][E: codex-rs/core/src/tools/handlers/shell.rs:92][E: codex-rs/core/src/tools/handlers/shell.rs:100][E: codex-rs/core/src/tools/handlers/shell.rs:110] |
| `justification` | `string` | 否 | 无 | approval helper 插入用户可见说明字段。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:317][E: codex-rs/core/src/tools/handlers/shell_spec.rs:320] | `to_exec_params` 把 `params.justification` 放进 `ExecParams`。[E: codex-rs/protocol/src/models.rs:1715][E: codex-rs/protocol/src/models.rs:1716][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:115] |
| `prefix_rule` | `array<string>` | 否 | 无 | approval helper 插入可复用 approval prefix 字段；当前 schema 文案仍写 `cmd`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:323][E: codex-rs/core/src/tools/handlers/shell_spec.rs:326] | handler 克隆 `prefix_rule` 并传入 shared run path，最后进入 exec approval request。[E: codex-rs/protocol/src/models.rs:1709][E: codex-rs/protocol/src/models.rs:1711][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:186][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:202][E: codex-rs/core/src/tools/handlers/shell.rs:181] |

`parameters` 使用 `JsonSchema::object(..., Some(vec!["command"]), Some(false))`，所以 schema 层 required 只有 `command`，并关闭 additional properties。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:215][E: codex-rs/core/src/tools/handlers/shell_spec.rs:217][E: codex-rs/core/src/tools/handlers/shell_spec.rs:218]

## 4 输出与截断

`shell_command` 不声明 structured `output_schema`。[E: codex-rs/core/src/tools/handlers/shell_spec.rs:220] 它最终返回 `FunctionToolOutput`，body 是单个 `InputText` content item；成功得到 runtime output 时，`post_tool_use_response` 保存格式化后的 exec output 字符串。[E: codex-rs/core/src/tools/handlers/shell.rs:228][E: codex-rs/core/src/tools/handlers/shell.rs:230][E: codex-rs/core/src/tools/handlers/shell.rs:232][E: codex-rs/core/src/tools/handlers/shell.rs:234][E: codex-rs/core/src/tools/handlers/shell.rs:238][E: codex-rs/core/src/tools/handlers/shell.rs:239][E: codex-rs/core/src/tools/handlers/shell.rs:243]

执行输出的捕获策略在 `to_exec_params` 和 runtime options 中都是 `ExecCapturePolicy::ShellTool`。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:102][E: codex-rs/core/src/tools/runtimes/shell.rs:319][E: codex-rs/core/src/tools/runtimes/shell.rs:321]

## 5 注册与门控

`add_shell_tools` 没有 environment 时直接返回。[E: codex-rs/core/src/tools/spec_plan.rs:628][E: codex-rs/core/src/tools/spec_plan.rs:631][E: codex-rs/core/src/tools/spec_plan.rs:632] shell command options 中的 backend 来自 `shell_command_backend_for_features(features)`，该函数在 `ShellTool` 与 `ShellZshFork` 同开时选择 `ZshFork`，否则选择 `Classic`。[E: codex-rs/core/src/tools/spec_plan.rs:639][E: codex-rs/core/src/tools/spec_plan.rs:640][E: codex-rs/tools/src/tool_config.rs:11][E: codex-rs/tools/src/tool_config.rs:12][E: codex-rs/tools/src/tool_config.rs:13][E: codex-rs/tools/src/tool_config.rs:49][E: codex-rs/tools/src/tool_config.rs:50][E: codex-rs/tools/src/tool_config.rs:51][E: codex-rs/tools/src/tool_config.rs:53]

当 shell 类型是 `UnifiedExec` 时，`shell_command` 不进入 model-visible specs，而是通过 `add_dispatch_only` 以 hidden exposure 注册。[E: codex-rs/core/src/tools/spec_plan.rs:645][E: codex-rs/core/src/tools/spec_plan.rs:646][E: codex-rs/core/src/tools/spec_plan.rs:655][E: codex-rs/core/src/tools/spec_plan.rs:657][E: codex-rs/core/src/tools/spec_plan.rs:127][E: codex-rs/core/src/tools/spec_plan.rs:131] 当 shell 类型是 `Default`、`Local` 或 `ShellCommand` 时，`spec_plan.rs` 直接 `planned_tools.add(ShellCommandHandler::new(...))`；普通 handler 默认 exposure 是 `Direct`，visible-spec 构建会收集 direct runtime specs。[E: codex-rs/core/src/tools/spec_plan.rs:660][E: codex-rs/core/src/tools/spec_plan.rs:661][E: codex-rs/core/src/tools/spec_plan.rs:662][E: codex-rs/core/src/tools/spec_plan.rs:663][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:56][E: codex-rs/core/src/tools/spec_plan.rs:241][E: codex-rs/core/src/tools/spec_plan.rs:247][E: codex-rs/core/src/tools/spec_plan.rs:249]

shell 类型由 feature/model 合成：`Default`/`Local` 被映射成 `ShellCommand`；如果模型请求 `UnifiedExec` 但 unified-exec feature mode disabled，也回落到 `ShellCommand`；`ShellZshFork` backend 会把 shell command type 固定为 `ShellCommand`；ShellTool 关闭会 `Disabled`；UnifiedExec 模式还可能因 ConPTY 不支持回落到 `ShellCommand`。[E: codex-rs/tools/src/tool_config.rs:67][E: codex-rs/tools/src/tool_config.rs:68][E: codex-rs/tools/src/tool_config.rs:70][E: codex-rs/tools/src/tool_config.rs:71][E: codex-rs/tools/src/tool_config.rs:74][E: codex-rs/tools/src/tool_config.rs:77][E: codex-rs/tools/src/tool_config.rs:81][E: codex-rs/tools/src/tool_config.rs:85][E: codex-rs/tools/src/tool_config.rs:89][E: codex-rs/tools/src/tool_config.rs:90][E: codex-rs/tools/src/tool_config.rs:92][E: codex-rs/tools/src/tool_config.rs:97][E: codex-rs/tools/src/tool_config.rs:99][E: codex-rs/tools/src/tool_config.rs:102][E: codex-rs/tools/src/tool_config.rs:107][E: codex-rs/tools/src/tool_config.rs:108][E: codex-rs/tools/src/tool_config.rs:111][E: codex-rs/protocol/src/openai_models.rs:265][E: codex-rs/protocol/src/openai_models.rs:270]

## 6 parallel support / cancellation wait

`ShellCommandHandler::supports_parallel_tool_calls()` 返回 `true`。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:143][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:144] 它还覆写 `waits_for_runtime_cancellation()`，返回 `true`。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:214][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:219][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:220]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`，否则返回 unsupported payload。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:167][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:168][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:169]
2. 它解析 workdir base 和 `ShellCommandToolCallParams`，触发 implicit skill invocation，并保存 `prefix_rule`。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:175][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:176][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:179][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:186]
3. `to_exec_params` 用 session user shell、login-shell 规则和 `base_command` 构造 argv，并将 command、cwd、timeout、env policy、network、`network_environment_id: None`、sandbox permissions、justification 放入 `ExecParams`。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:92][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:93][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:94][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:99][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:100][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:101][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:103][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:107][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:108][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:109][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:115]
4. `run_exec_like` 要求 primary environment 存在，合并 granted permissions，校验 explicit escalation 和 additional permissions。[E: codex-rs/core/src/tools/handlers/shell.rs:76][E: codex-rs/core/src/tools/handlers/shell.rs:92][E: codex-rs/core/src/tools/handlers/shell.rs:100][E: codex-rs/core/src/tools/handlers/shell.rs:103][E: codex-rs/core/src/tools/handlers/shell.rs:123][E: codex-rs/core/src/tools/handlers/shell.rs:126]
5. shared path 先拦截 `apply_patch`，再发 begin event，建立 exec approval requirement。[E: codex-rs/core/src/tools/handlers/shell.rs:141][E: codex-rs/core/src/tools/handlers/shell.rs:142][E: codex-rs/core/src/tools/handlers/shell.rs:158][E: codex-rs/core/src/tools/handlers/shell.rs:166][E: codex-rs/core/src/tools/handlers/shell.rs:168][E: codex-rs/core/src/tools/handlers/shell.rs:171]
6. 它构造 `ShellRequest`，创建 `ToolOrchestrator` 和 `ShellRuntime::for_shell_command(...)`，再运行 runtime。[E: codex-rs/core/src/tools/handlers/shell.rs:185][E: codex-rs/core/src/tools/handlers/shell.rs:204][E: codex-rs/core/src/tools/handlers/shell.rs:205][E: codex-rs/core/src/tools/handlers/shell.rs:212][E: codex-rs/core/src/tools/handlers/shell.rs:213]
7. runtime 结束后，handler 通过 emitter finish 生成 model content，并包装为 `FunctionToolOutput`。[E: codex-rs/core/src/tools/handlers/shell.rs:222][E: codex-rs/core/src/tools/handlers/shell.rs:235][E: codex-rs/core/src/tools/handlers/shell.rs:236][E: codex-rs/core/src/tools/handlers/shell.rs:238]

## 8 zsh-fork 与 hooks

`ShellRuntimeBackend` 只有 `ShellCommandClassic` 和 `ShellCommandZshFork` 两种 shell-command backend；ZshFork 在 Unix 上尝试 zsh-fork + `codex-shell-escalation` adapter，条件不满足会 fallback 到 standard flow。[E: codex-rs/core/src/tools/runtimes/shell.rs:74][E: codex-rs/core/src/tools/runtimes/shell.rs:76][E: codex-rs/core/src/tools/runtimes/shell.rs:81][E: codex-rs/core/src/tools/runtimes/shell.rs:87][E: codex-rs/core/src/tools/runtimes/shell.rs:301][E: codex-rs/core/src/tools/runtimes/shell.rs:302][E: codex-rs/core/src/tools/runtimes/shell.rs:306]

pre hook 用 Bash hook name 暴露原始 command，hook rewrite 会写回 `command` 字段；post hook 同样用 Bash hook name，并把 tool response 交给 hook runtime。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:223][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:224][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:225][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:226][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:230][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:241][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:244][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:251][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:260][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:262][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:263]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/shell_spec.rs`
- `codex-rs/core/src/tools/handlers/shell.rs`
- `codex-rs/core/src/tools/handlers/shell/shell_command.rs`
- `codex-rs/core/src/tools/runtimes/shell.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/openai_models.rs`

## 相关

- [exec_command 工具](exec-command.md) — unified-exec 可见 shell surface 的启动工具。
- [write_stdin 工具](write-stdin.md) — unified-exec session 的 stdin/poll 续写工具。
