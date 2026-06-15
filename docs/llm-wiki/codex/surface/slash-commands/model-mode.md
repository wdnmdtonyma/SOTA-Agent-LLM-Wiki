---
id: command.model-mode
title: 模型与模式命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::is_visible]
related: [subsys.core.collaboration-modes, subsys.config-auth.features-system, config.model-provider, config.approval-sandbox, config.ui-tui]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 模型与模式 slash commands 是 `SlashCommand` enum 中调整 model、reasoning、approval policy、permissions、collaboration mode、experimental features、theme 和 personality 的 TUI built-in command 子集。

## 能回答的问题

- `/model`、`/fast`、`/plan`、`/collab` 的 command string 与可用性来自哪里?
- 哪些模型/模式命令支持 inline args?
- 哪些模型/模式命令在任务运行时不可用?
- `/fast`、`/personality` 这类命令是否永远在 popup 中出现?

## Catalog

模型与模式命令的 wire name 主要来自 `SlashCommand` variant 的 kebab-case 自动序列化和 `IntoStaticStr` conversion；`command()` 返回 `self.into()`，因此 `built_in_slash_commands()` 的 command string 来自 enum-to-string 结果。[E: codex-rs/tui/src/slash_command.rs:9][E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:129][E: codex-rs/tui/src/slash_command.rs:130][E: codex-rs/tui/src/slash_command.rs:222] `ElevateSandbox` 和 `SandboxReadRoot` 使用显式 `strum` serialize 覆盖，因此 wire name 分别是 `/setup-default-sandbox` 和 `/sandbox-add-read-dir`。[E: codex-rs/tui/src/slash_command.rs:19][E: codex-rs/tui/src/slash_command.rs:21] 表格中的“默认可见”表示 command 没有命中 `is_visible()` 中 `SandboxReadRoot`、`Copy`、`Rollout` 或 `TestApproval` 的显式门控分支，并落入 `_ => true` 默认分支。[E: codex-rs/tui/src/slash_command.rs:210][E: codex-rs/tui/src/slash_command.rs:211][E: codex-rs/tui/src/slash_command.rs:212][E: codex-rs/tui/src/slash_command.rs:213]

| 命令名 | enum variant | 类型 | inline args | during task | 默认/门控 | 含义与为什么 | 源 |
|---|---|---|---:|---:|---|---|---|
| `/model` | `Model` | built-in slash command | 否 | 否 | 默认可见 | 描述为选择 model 和 reasoning effort；`available_during_task()` 对 `Model` 返回 false。[E: codex-rs/tui/src/slash_command.rs:99][E: codex-rs/tui/src/slash_command.rs:165] | `codex-rs/tui/src/slash_command.rs:15` |
| `/fast` | `Fast` | built-in slash command | 是 | 否 | 默认可见 | 切换 Fast mode，让推理更快且增加 plan usage；`supports_inline_args()` 把 `Fast` 列入可带 inline args 的白名单。[E: codex-rs/tui/src/slash_command.rs:101][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:166] | `codex-rs/tui/src/slash_command.rs:16` |
| `/approvals` | `Approvals` | built-in slash command | 否 | 否 | 默认可见 | 描述为选择 Codex 被允许执行什么；`available_during_task()` 对 `Approvals` 返回 false。[E: codex-rs/tui/src/slash_command.rs:110][E: codex-rs/tui/src/slash_command.rs:168] | `codex-rs/tui/src/slash_command.rs:17` |
| `/permissions` | `Permissions` | built-in slash command | 否 | 否 | 默认可见 | 选择 Codex 被允许执行什么；它与 `/approvals` 共享 description，但作为独立 command variant 暴露。[E: codex-rs/tui/src/slash_command.rs:111][E: codex-rs/tui/src/slash_command.rs:169] | `codex-rs/tui/src/slash_command.rs:18` |
| `/experimental` | `Experimental` | built-in slash command | 否 | 否 | 默认可见 | 切换 experimental features；`available_during_task()` 对 `Experimental` 返回 false。[E: codex-rs/tui/src/slash_command.rs:116][E: codex-rs/tui/src/slash_command.rs:172] | `codex-rs/tui/src/slash_command.rs:23` |
| `/plan` | `Plan` | built-in slash command | 是 | 否 | 默认可见 | 切换 Plan mode；`supports_inline_args()` 把 `Plan` 列入可带 inline args 的白名单，`available_during_task()` 对 `Plan` 返回 false。[E: codex-rs/tui/src/slash_command.rs:106][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:175] | `codex-rs/tui/src/slash_command.rs:33` |
| `/collab` | `Collab` | built-in slash command | 否 | 是 | 默认可见 | 改变 collaboration mode；源码 description 标注为 experimental，且 `available_during_task()` 返回 true。[E: codex-rs/tui/src/slash_command.rs:107][E: codex-rs/tui/src/slash_command.rs:200] | `codex-rs/tui/src/slash_command.rs:34` |
| `/theme` | `Theme` | built-in slash command | 否 | 否 | 默认可见 | 选择 syntax highlighting theme；`available_during_task()` 对 `Theme` 返回 false。[E: codex-rs/tui/src/slash_command.rs:94][E: codex-rs/tui/src/slash_command.rs:203] | `codex-rs/tui/src/slash_command.rs:45` |
| `/personality` | `Personality` | built-in slash command | 否 | 否 | 默认可见 | 选择 Codex communication style；`available_during_task()` 对 `Personality` 返回 false。[E: codex-rs/tui/src/slash_command.rs:103][E: codex-rs/tui/src/slash_command.rs:167] | `codex-rs/tui/src/slash_command.rs:58` |

## 共性机制

模型与模式命令大多不允许在 active task 中运行；`available_during_task()` 将 `Model`、`Fast`、`Personality`、`Approvals`、`Permissions`、`Experimental`、`Plan` 和 `Theme` 归为 false，只把本节点中的 `Collab` 归为 true。[E: codex-rs/tui/src/slash_command.rs:165][E: codex-rs/tui/src/slash_command.rs:166][E: codex-rs/tui/src/slash_command.rs:167][E: codex-rs/tui/src/slash_command.rs:168][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:172][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:200][E: codex-rs/tui/src/slash_command.rs:203]

`supports_inline_args()` 的白名单列出 `Review`、`Rename`、`Plan`、`Fast`、`Mcp`、`Side`、`Resume` 和 `SandboxReadRoot`；本节点命令里只有 `Plan` 和 `Fast` 出现在该白名单中。[E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:144]

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [Collaboration modes](../../subsystems/core/collaboration-modes.md) — 解释 `/plan` 和 `/collab` 背后的模式指令。
- [模型与 provider 设置](../config/model-provider.md) — 覆盖 model、reasoning 和 service tier 的配置入口。
- [审批与沙箱设置](../config/approval-sandbox.md) — 覆盖 `/approvals` 和 `/permissions` 影响的配置域。
