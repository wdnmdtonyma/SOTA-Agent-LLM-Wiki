---
id: tool.local-shell
title: local_shell 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/context.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/runtimes/shell.rs]
symbols: [create_local_shell_tool, ToolSpec::LocalShell, ToolHandlerKind::Shell, ResponseItem::LocalShellCall, LocalShellExecAction]
related: [tool.shell, tool.shell-command, tool.exec-command, subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `local_shell` 工具是 OpenAI Responses API 的 built-in local shell surface:Codex 暴露 `ToolSpec::LocalShell {}`，模型回传 `LocalShellCall`，Codex router 把 built-in action 转换成内部 `ShellHandler` 能执行的 `ShellToolCallParams`。[E: codex-rs/tools/src/tool_spec.rs:34][E: codex-rs/protocol/src/models.rs:469][E: codex-rs/core/src/tools/router.rs:245]

## 能回答的问题

- `local_shell` 为什么没有普通 JSON input schema?
- `local_shell` 的 `ToolSpec` 类型是什么?
- `local_shell` 如何从 Responses API item 映射到 Codex `ShellHandler`?
- `local_shell` 和 `shell` 的 handler 关系是什么?
- `local_shell` 的 parallel-safe 值有什么细微差别?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `local_shell`; `ToolSpec::name()` 对 `ToolSpec::LocalShell {}` 返回 `"local_shell"`。[E: codex-rs/tools/src/tool_spec.rs:66] |
| aliases | registry plan 把 `"local_shell"` 注册到 `ToolHandlerKind::Shell`。[E: codex-rs/tools/src/tool_registry_plan.rs:189] |
| ToolHandlerKind | `ToolHandlerKind::Shell`，与 `shell` 和 `container.exec` 共用 handler kind。[E: codex-rs/tools/src/tool_registry_plan.rs:187][E: codex-rs/tools/src/tool_registry_plan.rs:188][E: codex-rs/tools/src/tool_registry_plan.rs:189] |
| concrete handler | `ToolHandlerKind::Shell` 在 core 中注册到 `ShellHandler`。[E: codex-rs/core/src/tools/spec.rs:148][E: codex-rs/core/src/tools/spec.rs:252] |
| 所属文件 | built-in spec constructor 在 `codex-rs/tools/src/tool_spec.rs`; router 和 handler 在 `codex-rs/core/src/tools/router.rs` 与 `codex-rs/core/src/tools/handlers/shell.rs`。[E: codex-rs/tools/src/tool_spec.rs:84][E: codex-rs/core/src/tools/router.rs:233][E: codex-rs/core/src/tools/handlers/shell.rs:182] |

## 2 用途定位

`local_shell` 不是 `ResponsesApiTool` function，而是 `ToolSpec::LocalShell {}` built-in tool。[E: codex-rs/tools/src/tool_spec.rs:34][E: codex-rs/tools/src/tool_spec.rs:84] Responses API 的返回 item 是 `ResponseItem::LocalShellCall { id, call_id, status, action }`，其中 `action` 是 `LocalShellAction`。[E: codex-rs/protocol/src/models.rs:469][E: codex-rs/protocol/src/models.rs:477]

Codex runtime 只处理 `LocalShellAction::Exec`，并把 `LocalShellExecAction.command`、`working_directory`、`timeout_ms` 映射成 `ShellToolCallParams`。[E: codex-rs/core/src/tools/router.rs:244][E: codex-rs/core/src/tools/router.rs:246][E: codex-rs/core/src/tools/router.rs:248]

## 3 输入 schema 表

`local_shell` 的 Codex `ToolSpec::LocalShell {}` 没有 `JsonSchema` 参数字段；`create_local_shell_tool` 直接返回 built-in variant。[E: codex-rs/tools/src/tool_spec.rs:84] 对于 runtime 输入，Codex 从 protocol model 中读取 `LocalShellExecAction`:

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `action.type` | enum tag | 是 | 无 | `LocalShellAction` 是 tagged enum，目前只有 `Exec(LocalShellExecAction)`。[E: codex-rs/protocol/src/models.rs:847][E: codex-rs/protocol/src/models.rs:849] | router 只匹配 `LocalShellAction::Exec(exec)`。[E: codex-rs/core/src/tools/router.rs:244] |
| `command` | `array<string>` | 是 | 无 | `LocalShellExecAction.command` 是 `Vec<String>`。[E: codex-rs/protocol/src/models.rs:853][E: codex-rs/protocol/src/models.rs:854] | router 把它放入 `ShellToolCallParams.command`。[E: codex-rs/core/src/tools/router.rs:246] |
| `working_directory` | `string` | 否 | turn cwd | `LocalShellExecAction.working_directory` 是 optional string。[E: codex-rs/protocol/src/models.rs:856] | router 映射到 `ShellToolCallParams.workdir`。[E: codex-rs/core/src/tools/router.rs:247] |
| `timeout_ms` | `number` | 否 | shell runtime expiration default | `LocalShellExecAction.timeout_ms` 是 optional u64。[E: codex-rs/protocol/src/models.rs:855] | router 映射到 `ShellToolCallParams.timeout_ms`。[E: codex-rs/core/src/tools/router.rs:248] |
| `env` | `object` | 否 | 未使用 [I] | protocol model 允许 `env`，router 的 mapped field block 没有把它复制进 `ShellToolCallParams`。[E: codex-rs/protocol/src/models.rs:857][E: codex-rs/core/src/tools/router.rs:246][E: codex-rs/core/src/tools/router.rs:252] | 该字段在当前 local_shell router path 中被忽略。[I] |
| `user` | `string` | 否 | 未使用 [I] | protocol model 允许 `user`，router 的 mapped field block 没有把它复制进 `ShellToolCallParams`。[E: codex-rs/protocol/src/models.rs:858][E: codex-rs/core/src/tools/router.rs:246][E: codex-rs/core/src/tools/router.rs:252] | 该字段在当前 local_shell router path 中被忽略。[I] |

router 给 `local_shell` 填入 `sandbox_permissions: Some(SandboxPermissions::UseDefault)`，并把 additional permissions、prefix_rule、justification 都置为 None。[E: codex-rs/core/src/tools/router.rs:249][E: codex-rs/core/src/tools/router.rs:250][E: codex-rs/core/src/tools/router.rs:252]

## 4 输出 schema & 截断

`local_shell` 的 Codex tool spec 没有 `output_schema` 字段，因为 `ToolSpec::LocalShell` 是 built-in variant 而非 `ResponsesApiTool`。[E: codex-rs/tools/src/tool_spec.rs:34][E: codex-rs/tools/src/tool_spec.rs:84] runtime 输出走 `ShellHandler` 的 `FunctionToolOutput` path，最终由 `FunctionToolOutput::to_response_item` 写回 function/custom-compatible output item。[E: codex-rs/core/src/tools/handlers/shell.rs:183][E: codex-rs/core/src/tools/context.rs:277]

## 5 ToolSpec 类型

`local_shell` 的 ToolSpec 类型是 `LocalShell`，不是 `Function`、`Freeform` 或 `Namespace`。[E: codex-rs/tools/src/tool_spec.rs:34] `create_local_shell_tool` 只返回 `ToolSpec::LocalShell {}`，因此该工具的 wire schema 由 OpenAI built-in local shell protocol 定义，Codex 只在 router 处适配返回 item。[E: codex-rs/tools/src/tool_spec.rs:84][E: codex-rs/core/src/tools/router.rs:233]

## 6 注册与门控

`local_shell` spec 只在 `config.has_environment` 为 true 且 `config.shell_type == ConfigShellToolType::Local` 时推入。[E: codex-rs/tools/src/tool_registry_plan.rs:137][E: codex-rs/tools/src/tool_registry_plan.rs:148][E: codex-rs/tools/src/tool_registry_plan.rs:150] handler 注册则在 `config.has_environment && shell_type != Disabled` 下发生，因为 `"local_shell"` 映射到 `ToolHandlerKind::Shell`。[E: codex-rs/tools/src/tool_registry_plan.rs:186][E: codex-rs/tools/src/tool_registry_plan.rs:189]

`ConfigShellToolType` 枚举包含 `Local`，说明 model/provider metadata 可选择 built-in local shell surface。[E: codex-rs/protocol/src/openai_models.rs:183][E: codex-rs/protocol/src/openai_models.rs:185] `ModelInfo.shell_type` 是模型信息的一部分。[E: codex-rs/protocol/src/openai_models.rs:255]

## 7 parallel-safe

registry plan 给 `local_shell` spec 传入 `supports_parallel_tool_calls = true`。[E: codex-rs/tools/src/tool_registry_plan.rs:149][E: codex-rs/tools/src/tool_registry_plan.rs:151] 但 `ToolRouter::configured_tool_supports_parallel` 的 current implementation 只把 function/freeform spec 名称与 parallel flag 匹配，`ToolSpec::LocalShell {}` 在 match 中返回 false。[E: codex-rs/core/src/tools/router.rs:150][E: codex-rs/core/src/tools/router.rs:152][E: codex-rs/core/src/tools/router.rs:156] 因此可以精确表述为:plan-level flag 是 true，router-level `tool_supports_parallel` 对 built-in `LocalShell` call 不会通过 function/freeform 名称匹配返回 true。[I]

`ShellHandler::is_mutating` 仍会对 `ToolPayload::LocalShell` 使用 `is_known_safe_command` 判定是否需要 mutating gate。[E: codex-rs/core/src/tools/handlers/shell.rs:203]

## 8 handler 走读

1. Responses API 返回 `ResponseItem::LocalShellCall` 时，router 取 `call_id` 或 legacy `id`，缺失则报 `MissingLocalShellCallId`。[E: codex-rs/core/src/tools/router.rs:239][E: codex-rs/core/src/tools/router.rs:240][E: codex-rs/core/src/tools/router.rs:241]
2. router 只处理 `LocalShellAction::Exec(exec)`，并构造内部 `ShellToolCallParams`。[E: codex-rs/core/src/tools/router.rs:244][E: codex-rs/core/src/tools/router.rs:245]
3. router 生成 `ToolCall { tool_name: ToolName::plain("local_shell"), payload: ToolPayload::LocalShell { params } }`。[E: codex-rs/core/src/tools/router.rs:255][E: codex-rs/core/src/tools/router.rs:257]
4. registry 把 `"local_shell"` 映射到 `ShellHandler`，`ShellHandler::matches_kind` 接受 `ToolPayload::LocalShell`。[E: codex-rs/tools/src/tool_registry_plan.rs:189][E: codex-rs/core/src/tools/handlers/shell.rs:192]
5. `ShellHandler::handle` 对 `ToolPayload::LocalShell` 调用 `to_exec_params`，再进入 `run_exec_like`，且 additional permissions、prefix_rule 为 None。[E: codex-rs/core/src/tools/handlers/shell.rs:263][E: codex-rs/core/src/tools/handlers/shell.rs:265][E: codex-rs/core/src/tools/handlers/shell.rs:270]
6. 后续路径与 `shell` 一样:apply_patch interception、approval、sandbox、`ShellRuntime` execution、tool events。[E: codex-rs/core/src/tools/handlers/shell.rs:482][E: codex-rs/core/src/tools/handlers/shell.rs:512][E: codex-rs/core/src/tools/handlers/shell.rs:546]

## 9 设计动机·edge·历史

`local_shell` 保留 OpenAI built-in `local_shell` surface，同时在 Codex 内部复用 `ShellHandler`，使 built-in tool item 和 Codex function tool item 最终共享 approval/sandbox/event logic。[E: codex-rs/tools/src/tool_spec.rs:83][E: codex-rs/core/src/tools/handlers/shell.rs:262][I]

router 当前不转发 `LocalShellExecAction.env` 和 `user` 到 `ShellToolCallParams`，所以这两个 protocol 字段不影响当前 Codex shell execution path。[E: codex-rs/protocol/src/models.rs:857][E: codex-rs/protocol/src/models.rs:858][E: codex-rs/core/src/tools/router.rs:246][E: codex-rs/core/src/tools/router.rs:252][I]

## Sources

- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/core/src/tools/handlers/shell.rs`
- `codex-rs/core/src/tools/runtimes/shell.rs`

## 相关

- [shell 工具](shell.md) — `local_shell` 最终复用的 handler/runtime family。
- [shell_command 工具](shell-command.md) — 字符串脚本 shell surface。
- [exec_command 工具](exec-command.md) — unified-exec shell surface。
