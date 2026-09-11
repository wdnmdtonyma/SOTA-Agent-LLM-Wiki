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
updated: 02a8f038b8
---

> 代码与评审 slash commands 是 `SlashCommand` enum 中负责 review、diff、copy、export 和 raw scrollback 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:29][E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:48][E: codex-rs/tui/src/slash_command.rs:49][E: codex-rs/tui/src/slash_command.rs:50]

## 能回答的问题

- `/review` 是否支持 inline args?
- `/export` 如何选择 clipboard 或文件路径?
- `/diff`、`/copy`、`/raw`、`/export` 是否可在 task 运行中使用?
- 哪些代码与评审命令可在 active side conversation 中使用?
- `/copy` 的平台可见性门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:157][E: codex-rs/tui/src/slash_command.rs:269][E: codex-rs/tui/src/slash_command.rs:281]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:162][E: codex-rs/tui/src/slash_command.rs:189]

`/export` 无参数打开 clipboard/file picker；带路径则直接导出到该文件。clipboard 选项在 Android 上禁用。[E: codex-rs/tui/src/slash_command.rs:176][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:739][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:740][E: codex-rs/tui/src/chatwidget/transcript_export.rs:23][E: codex-rs/tui/src/chatwidget/transcript_export.rs:32]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/review` | `Review` | review my current changes and find issues | 是 [E: codex-rs/tui/src/slash_command.rs:165] | 否 [E: codex-rs/tui/src/slash_command.rs:223] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:29][E: codex-rs/tui/src/slash_command.rs:95] |
| `/diff` | `Diff` | show git diff (including untracked files) | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:230] | 是 [E: codex-rs/tui/src/slash_command.rs:196] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:50][E: codex-rs/tui/src/slash_command.rs:108] |
| `/copy` | `Copy` | copy the last response, code block, or quote | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:235] | 是 [E: codex-rs/tui/src/slash_command.rs:192] | hidden on Android [E: codex-rs/tui/src/slash_command.rs:271] | [E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:103] |
| `/export` | `Export` | export the conversation as markdown | 是 [E: codex-rs/tui/src/slash_command.rs:176] | 否 [E: codex-rs/tui/src/slash_command.rs:216] | 是 [E: codex-rs/tui/src/slash_command.rs:194] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:48][E: codex-rs/tui/src/slash_command.rs:106] |
| `/raw` | `Raw` | toggle raw scrollback mode for copy-friendly terminal selection | 是 [E: codex-rs/tui/src/slash_command.rs:177] | 是 [E: codex-rs/tui/src/slash_command.rs:236] | 是 [E: codex-rs/tui/src/slash_command.rs:195] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:49][E: codex-rs/tui/src/slash_command.rs:107] |

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
