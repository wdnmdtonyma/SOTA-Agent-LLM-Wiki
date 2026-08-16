---
id: command.code-review
title: 代码与评审命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/chatwidget/transcript_export.rs]
symbols: [SlashCommand::Review, SlashCommand::Diff, SlashCommand::Copy, SlashCommand::Export, SlashCommand::Raw]
related: [subsys.core.review-mode, cli.exec-mode, cli.subcommands, subsys.config-auth.config-loading, subsys.tui.chatwidget]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> 代码与评审 slash commands 是 `SlashCommand` enum 中负责 review、diff、copy、export 和 raw scrollback 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:31][E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:48][E: codex-rs/tui/src/slash_command.rs:49]

## 能回答的问题

- `/review` 是否支持 inline args?
- `/export` 如何选择 clipboard 或文件路径?
- `/diff`、`/copy`、`/raw`、`/export` 是否可在 task 运行中使用?
- 哪些代码与评审命令可在 active side conversation 中使用?
- `/copy` 的平台可见性门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:150][E: codex-rs/tui/src/slash_command.rs:151][E: codex-rs/tui/src/slash_command.rs:266][E: codex-rs/tui/src/slash_command.rs:268][E: codex-rs/tui/src/slash_command.rs:269]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:155][E: codex-rs/tui/src/slash_command.rs:158][E: codex-rs/tui/src/slash_command.rs:168][E: codex-rs/tui/src/slash_command.rs:180][E: codex-rs/tui/src/slash_command.rs:183]

`/export` 无参数打开 clipboard/file picker；带路径则直接导出到该文件。clipboard 选项在 Android 上禁用。[E: codex-rs/tui/src/slash_command.rs:168][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:688][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:691][E: codex-rs/tui/src/chatwidget/transcript_export.rs:20][E: codex-rs/tui/src/chatwidget/transcript_export.rs:29]

| 命令名 | enum variant | description | inline args | during task | side conversation | visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/review` | `Review` | review my current changes and find issues | 是 [E: codex-rs/tui/src/slash_command.rs:158] | 否 [E: codex-rs/tui/src/slash_command.rs:211] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:260] | [E: codex-rs/tui/src/slash_command.rs:31][E: codex-rs/tui/src/slash_command.rs:90] |
| `/diff` | `Diff` | show git diff (including untracked files) | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:217] | 是 [E: codex-rs/tui/src/slash_command.rs:186] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:260] | [E: codex-rs/tui/src/slash_command.rs:49][E: codex-rs/tui/src/slash_command.rs:102] |
| `/copy` | `Copy` | copy last response as markdown | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:222] | 是 [E: codex-rs/tui/src/slash_command.rs:183] | hidden on Android [E: codex-rs/tui/src/slash_command.rs:257] | [E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:99] |
| `/export` | `Export` | export the conversation as markdown | 是 [E: codex-rs/tui/src/slash_command.rs:168] | 否 [E: codex-rs/tui/src/slash_command.rs:203] | 是 [E: codex-rs/tui/src/slash_command.rs:184] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:260] | [E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:100] |
| `/raw` | `Raw` | toggle raw scrollback mode for copy-friendly terminal selection | 是 [E: codex-rs/tui/src/slash_command.rs:169] | 是 [E: codex-rs/tui/src/slash_command.rs:223] | 是 [E: codex-rs/tui/src/slash_command.rs:185] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:260] | [E: codex-rs/tui/src/slash_command.rs:48][E: codex-rs/tui/src/slash_command.rs:101] |

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`
- `codex-rs/tui/src/chatwidget/transcript_export.rs`

## 相关

- [subsys.core.review-mode](../../subsystems/core/review-mode.md)
- [cli.exec-mode](../cli/exec-mode.md)
- [cli.subcommands](../cli/subcommands.md)
- [subsys.config-auth.config-loading](../../subsystems/config-auth/config-loading.md)
- [subsys.tui.chatwidget](../../subsystems/tui/chatwidget.md)
