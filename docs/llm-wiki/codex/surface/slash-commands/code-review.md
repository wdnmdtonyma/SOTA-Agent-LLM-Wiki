---
id: command.code-review
title: 代码与评审命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible]
related: [subsys.core.review-mode, cli.exec-mode, cli.subcommands, subsys.config-auth.config-loading]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 代码与评审 slash commands 是 `SlashCommand` enum 中负责 review、diff、copy 和初始化 AGENTS.md 的 TUI built-in command 子集。

## 能回答的问题

- `/review` 是否支持 inline args?
- `/diff` 和 `/copy` 为什么能在任务运行中使用?
- `/init` 是否能在任务运行中使用?
- 代码与评审命令在 side conversation 中哪些仍可用?

## Catalog

| 命令名 | enum variant | 类型 | inline args | during task | side conversation | 默认/门控 | 含义与为什么 | 源 |
|---|---|---|---:|---:|---:|---|---|---|
| `/review` | `Review` | built-in slash command | 是 | 否 | 否 | 默认可见 | 审查当前 changes 并发现 issues；`supports_inline_args()` 把 `Review` 列入可带参数命令，`available_during_task()` 对 `Review` 返回 false。[E: codex-rs/tui/src/slash_command.rs:79][E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:174] | `codex-rs/tui/src/slash_command.rs:26` |
| `/diff` | `Diff` | built-in slash command | 否 | 是 | 是 | 默认可见 | 显示 git diff，包括 untracked files；`available_during_task()` 和 `available_in_side_conversation()` 都允许 `Diff`。[E: codex-rs/tui/src/slash_command.rs:87][E: codex-rs/tui/src/slash_command.rs:180][E: codex-rs/tui/src/slash_command.rs:152] | `codex-rs/tui/src/slash_command.rs:39` |
| `/copy` | `Copy` | built-in slash command | 否 | 是 | 是 | Android 不可见 | 复制 last response as markdown；`is_visible()` 在 Android 隐藏 `Copy`，其余平台默认可见。[E: codex-rs/tui/src/slash_command.rs:86][E: codex-rs/tui/src/slash_command.rs:181][E: codex-rs/tui/src/slash_command.rs:211] | `codex-rs/tui/src/slash_command.rs:38` |
| `/init` | `Init` | built-in slash command | 否 | 否 | 否 | 默认可见 | 创建 AGENTS.md instructions 文件；`available_during_task()` 对 `Init` 返回 false。[E: codex-rs/tui/src/slash_command.rs:77][E: codex-rs/tui/src/slash_command.rs:162] | `codex-rs/tui/src/slash_command.rs:31` |

## 共性机制

代码与评审命令使用同一个 `SlashCommand` popup 机制；`built_in_slash_commands()` 只返回 `is_visible()` 为 true 的 command。[E: codex-rs/tui/src/slash_command.rs:221] `Copy`、`Diff` 是 `available_in_side_conversation()` 白名单中的 command，因此 active side conversation 仍能使用这两个 command。[E: codex-rs/tui/src/slash_command.rs:152]

`supports_inline_args()` 的白名单列出 `Review`、`Rename`、`Plan`、`Fast`、`Mcp`、`Side`、`Resume` 和 `SandboxReadRoot`；本组只有 `Review` 出现在该白名单中。[E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:144]

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [Review mode](../../subsystems/core/review-mode.md) — 解释 `/review` 背后的 review task 生命周期。
- [exec 非交互模式](../cli/exec-mode.md) — 覆盖 `codex exec review` 和 `codex review` 的非交互入口。
- [配置加载](../../subsystems/config-auth/config-loading.md) — 解释 `/init` 创建的 AGENTS.md 如何成为 instruction 输入。
