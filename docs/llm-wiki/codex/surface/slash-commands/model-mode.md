---
id: command.model-mode
title: 模型、模式与输入体验命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [subsys.core.collaboration-modes, subsys.config-auth.features-system, config.model-provider, config.approval-sandbox, config.ui-tui]
evidence: explicit
status: verified
updated: 5670360009
---

> 模型、模式与输入体验 slash commands 是 `SlashCommand` enum 中选择模型、IDE context、权限、keymap、Vim、experimental features、auto-review retry、Plan mode、personality、theme 和 terminal pet 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:7][E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:81]

## 能回答的问题

- `/model`、`/ide`、`/permissions`、`/plan` 当前是否仍存在?
- 哪些模型/模式命令支持 inline args?
- 哪些模型/模式命令不能在 task 运行中触发?
- `/approve` 和 `/pets` 的 canonical command string 从哪里来?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:146][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:257][E: codex-rs/tui/src/slash_command.rs:258][E: codex-rs/tui/src/slash_command.rs:259][E: codex-rs/tui/src/slash_command.rs:260][E: codex-rs/tui/src/slash_command.rs:261][E: codex-rs/tui/src/slash_command.rs:262]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:152][E: codex-rs/tui/src/slash_command.rs:153][E: codex-rs/tui/src/slash_command.rs:154][E: codex-rs/tui/src/slash_command.rs:156][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:173][E: codex-rs/tui/src/slash_command.rs:174][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:177][E: codex-rs/tui/src/slash_command.rs:184]

| 命令名 | enum variant | description | inline args | during task | side conversation | visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/model` | `Model` | choose what model and reasoning effort to use | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:197] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:15][E: codex-rs/tui/src/slash_command.rs:116] |
| `/ide` | `Ide` | include current selection, open files, and other context from your IDE | 是 [E: codex-rs/tui/src/slash_command.rs:160] | 是 [E: codex-rs/tui/src/slash_command.rs:234] | 是 [E: codex-rs/tui/src/slash_command.rs:183] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:16][E: codex-rs/tui/src/slash_command.rs:117][E: codex-rs/tui/src/slash_command.rs:118] |
| `/permissions` | `Permissions` | choose what Codex is allowed to do | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:199] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:17][E: codex-rs/tui/src/slash_command.rs:127] |
| `/keymap` | `Keymap` | remap TUI shortcuts | 是 [E: codex-rs/tui/src/slash_command.rs:161] | 否 [E: codex-rs/tui/src/slash_command.rs:200] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:18][E: codex-rs/tui/src/slash_command.rs:128] |
| `/vim` | `Vim` | toggle Vim mode for the composer | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:201] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:19][E: codex-rs/tui/src/slash_command.rs:129] |
| `/experimental` | `Experimental` | toggle experimental features | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:204] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:24][E: codex-rs/tui/src/slash_command.rs:134] |
| `/approve` | `AutoReview` | approve one retry of a recent auto-review denial | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:232] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:25][E: codex-rs/tui/src/slash_command.rs:26][E: codex-rs/tui/src/slash_command.rs:135] |
| `/plan` | `Plan` | switch to Plan mode | 是 [E: codex-rs/tui/src/slash_command.rs:158] | 否 [E: codex-rs/tui/src/slash_command.rs:208] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:41][E: codex-rs/tui/src/slash_command.rs:121] |
| `/personality` | `Personality` | choose a communication style for Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:198] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:70][E: codex-rs/tui/src/slash_command.rs:120] |
| `/theme` | `Theme` | choose a syntax highlighting theme | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:242] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:55][E: codex-rs/tui/src/slash_command.rs:110] |
| `/pets` | `Pets` | choose or hide the terminal pet | 是 [E: codex-rs/tui/src/slash_command.rs:165] | 否 [E: codex-rs/tui/src/slash_command.rs:242] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:56][E: codex-rs/tui/src/slash_command.rs:57][E: codex-rs/tui/src/slash_command.rs:111] |

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [subsys.core.collaboration-modes](../../subsystems/core/collaboration-modes.md)
- [subsys.config-auth.features-system](../../subsystems/config-auth/features-system.md)
- [config.model-provider](../config/model-provider.md)
- [config.approval-sandbox](../config/approval-sandbox.md)
- [config.ui-tui](../config/ui-tui.md)
