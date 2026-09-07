---
id: tool.shell-command
title: shell_command（已退役）
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/unified_exec/oneshot.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/core/src/tools/registry_tests.rs]
symbols: [add_shell_tools, ExecCommandHandler::one_shot, ConfigShellToolType]
related: [tool.exec-command, tool.write-stdin, subsys.core.tool-system, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `shell_command` 已退役：`add_shell_tools` 不再注册任何 `ShellCommandHandler`。该名字仍是 reserved name，外部 runtime 不能占用。命令执行只走 `exec_command`；`Feature::UnifiedExec` 关闭时用 `ExecCommandHandler::one_shot`，不是复活 `shell_command`。[E: codex-rs/core/src/tools/spec_plan.rs:1104][E: codex-rs/core/src/tools/registry.rs:364][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:104]

## 能回答的问题

- `shell_command` 现在还有 handler 吗？
- 为什么 registry 仍把 `shell_command` 当 reserved name？
- UnifiedExec=off 时模型看到的是什么工具？
- 模型 `shell_type: "shell_command"` 现在如何反序列化？
- 旧的 `command: string` schema 还存在吗？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | 历史上是 `"shell_command"`。当前 **没有** `ShellCommandHandler`，也没有 `create_shell_command_tool`。`add_shell_tools` 只 `registry.add(ExecCommandHandler::...)`。[E: codex-rs/core/src/tools/spec_plan.rs:1105][E: codex-rs/core/src/tools/spec_plan.rs:1111] |
| reserved name | `ToolRegistry::register_external` 对 default namespace 下的 `"exec_command" \| "shell_command"` 直接 skip，并 warn `skipping external tool with reserved name`。[E: codex-rs/core/src/tools/registry.rs:363][E: codex-rs/core/src/tools/registry.rs:366] |
| 测试 | `reserved_command_tools_reject_external_runtimes_without_a_builtin` 同时覆盖 `"exec_command"` 与 `"shell_command"`。[E: codex-rs/core/src/tools/registry_tests.rs:316] |
| 替代 handler | 模型可见/可 dispatch 的命令工具是 `ExecCommandHandler`，wire name 固定 `"exec_command"`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:114] |

## 2 用途定位

旧 `shell_command` 接收 `command: string`，用 turn/session shell 派生 argv，再走已删除的 `run_exec_like` / `ShellRuntime`。这些类型和文件已不存在。

当前等价能力：

- UnifiedExec **开**：`exec_command` + `write_stdin`，可 resume。[E: codex-rs/core/src/tools/spec_plan.rs:1104]
- UnifiedExec **关**：`ExecCommandHandler::one_shot`，跑到 completion，不暴露 `session_id` / `write_stdin`。[E: codex-rs/core/src/tools/spec_plan.rs:1111][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:104]

不要把 one-shot `exec_command` 写成 `shell_command` handler。

## 3 输入 schema 表

`shell_command` **不再发布 schema**。`shell_spec.rs` 只构造 `exec_command` / `write_stdin` / `request_permissions`。

历史字段（`command` / `workdir` / `timeout_ms` / `login` / `sandbox_permissions`）不再有 constructor。one-shot `exec_command` 用 `cmd` + `timeout_ms`，并从 spec 里去掉 `tty` / `yield_time_ms` / output `session_id`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:486][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:496]

| 字段（历史） | 当前去向 |
|---|---|
| `command` | 由 `exec_command.cmd` 取代 |
| `timeout_ms` | one-shot `exec_command` 才插入该字段 |
| `login` / `sandbox_permissions` / `justification` | 仍在 `exec_command` schema（按 options 插入） |
| `workdir` | `exec_command.workdir` |

## 4 输出与截断

没有 `shell_command` output schema。one-shot `exec_command` 复用 unified-exec output schema，但会从 output properties 删除 `session_id`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:504][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:510]

超时后 `exec_command_to_completion` 把 `output.process_id = None`，因此不能续写。[E: codex-rs/core/src/unified_exec/oneshot.rs:78]

## 5 注册与门控

`add_shell_tools` 的门控是 environment + `Feature::ShellTool` + 模型 `shell_type != Disabled`。[E: codex-rs/core/src/tools/spec_plan.rs:1083]

`ConfigShellToolType` 只剩两个变体：`UnifiedExec`（serde alias 包含 `"default"` / `"local"` / `"shell_command"`）和 `Disabled`。模型 JSON 写 `"shell_type": "shell_command"` 会反序列化成 `UnifiedExec`，**不会**注册旧 handler。[E: codex-rs/protocol/src/openai_models.rs:310][E: codex-rs/protocol/src/openai_models.rs:311]

Guardian reviewer 路径也不注册 `shell_command`；它只可能注册 `exec_command` / `write_stdin` / `view_image`。[E: codex-rs/core/src/tools/spec_plan.rs:978][E: codex-rs/core/src/tools/spec_plan.rs:998]

## 6 parallel support / cancellation wait

本节点没有独立 handler，因此没有 `supports_parallel_tool_calls` 实现。替代工具 `ExecCommandHandler` 返回 `true`。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:142]

one-shot 路径用 child cancellation token；取消时 `terminate_confirmed` 目标进程。[E: codex-rs/core/src/unified_exec/oneshot.rs:37][E: codex-rs/core/src/unified_exec/oneshot.rs:59]

## 7 handler 走读

没有 `ShellCommandHandler`。若外部工具试图以 `shell_command` 注册，`register_external` 拒绝并记录 reserved-name collision。[E: codex-rs/core/src/tools/registry.rs:364][E: codex-rs/core/src/tools/registry.rs:366]

模型若仍发出名为 `shell_command` 的 function call，registry 没有对应 builtin，调用会按未知工具失败。[I]

## 8 设计动机·edge·历史

- 删除 `handlers/shell.rs`、`handlers/shell/shell_command.rs`、`runtimes/shell.rs` 后，命令执行只剩 unified-exec 一条路径。
- UnifiedExec=off 用 one-shot `exec_command` 保留“跑一条命令并返回输出”，同时禁止 resumable process，避免绕过 managed requirements。[E: codex-rs/core/src/tools/spec_plan.rs:1111]
- reserved name 阻止 MCP/extension 抢占旧模型仍可能吐出的 `shell_command` 名字。[E: codex-rs/core/src/tools/registry.rs:364]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/unified_exec/oneshot.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/core/src/tools/registry_tests.rs`

## 相关

- [exec_command 工具](exec-command.md) — 当前唯一命令执行 handler。
- [write_stdin 工具](write-stdin.md) — 仅 UnifiedExec=on 时注册。
- [shell exec flow](../../spine/shell-exec-flow.md)
