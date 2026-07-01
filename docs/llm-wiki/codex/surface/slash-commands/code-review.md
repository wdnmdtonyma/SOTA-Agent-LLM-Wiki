---
id: command.code-review
title: 代码与评审命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [subsys.core.review-mode, cli.exec-mode, cli.subcommands, subsys.config-auth.config-loading]
evidence: explicit
status: verified
updated: db887d03e1
---

> 代码与评审 slash commands 是 `SlashCommand` enum 中负责 review、diff、copy 和 raw scrollback 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:31][E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:48][E: codex-rs/tui/src/slash_command.rs:81]

## 能回答的问题

- `/review` 是否支持 inline args?
- `/diff`、`/copy`、`/raw` 是否可在 task 运行中使用?
- 哪些代码与评审命令可在 active side conversation 中使用?
- `/copy` 的平台可见性门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:258][E: codex-rs/tui/src/slash_command.rs:259][E: codex-rs/tui/src/slash_command.rs:260][E: codex-rs/tui/src/slash_command.rs:261][E: codex-rs/tui/src/slash_command.rs:262]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:153][E: codex-rs/tui/src/slash_command.rs:154][E: codex-rs/tui/src/slash_command.rs:156][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:174][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:177][E: codex-rs/tui/src/slash_command.rs:184]

| 命令名 | enum variant | description | inline args | during task | side conversation | visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/review` | `Review` | review my current changes and find issues | 是 [E: codex-rs/tui/src/slash_command.rs:156] | 否 [E: codex-rs/tui/src/slash_command.rs:203] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:31][E: codex-rs/tui/src/slash_command.rs:89] |
| `/diff` | `Diff` | show git diff (including untracked files) | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:209] | 是 [E: codex-rs/tui/src/slash_command.rs:179] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:48][E: codex-rs/tui/src/slash_command.rs:100] |
| `/copy` | `Copy` | copy last response as markdown | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:214] | 是 [E: codex-rs/tui/src/slash_command.rs:177] | hidden on Android [E: codex-rs/tui/src/slash_command.rs:249] | [E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:98] |
| `/raw` | `Raw` | toggle raw scrollback mode for copy-friendly terminal selection | 是 [E: codex-rs/tui/src/slash_command.rs:163] | 是 [E: codex-rs/tui/src/slash_command.rs:215] | 是 [E: codex-rs/tui/src/slash_command.rs:178] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:99] |

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [subsys.core.review-mode](../../subsystems/core/review-mode.md)
- [cli.exec-mode](../cli/exec-mode.md)
- [cli.subcommands](../cli/subcommands.md)
- [subsys.config-auth.config-loading](../../subsystems/config-auth/config-loading.md)
