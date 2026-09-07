---
id: command.model-mode
title: 模型、模式与输入体验命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs]
symbols: [SlashCommand::Model, SlashCommand::Ide, SlashCommand::Permissions, SlashCommand::Keymap, SlashCommand::Vim, SlashCommand::Experimental, SlashCommand::AutoReview, SlashCommand::Plan, SlashCommand::Personality, SlashCommand::Theme, SlashCommand::Pets]
related: [subsys.core.collaboration-modes, subsys.config-auth.features-system, config.model-provider, config.approval-sandbox, config.ui-tui, subsys.tui.keymap]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> 模型、模式与输入体验 slash commands 是 `SlashCommand` enum 中选择模型、IDE context、权限、keymap、Vim、experimental features、auto-review retry、Plan mode、personality、theme 和 terminal pet 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:15]

## 能回答的问题

- `/model`、`/ide`、`/permissions`、`/plan` 当前是否仍存在?
- 哪些模型/模式命令支持 inline args?
- 哪些模型/模式命令不能在 task 运行中触发?
- `/approve` 和 `/pets` 的 canonical command string 从哪里来?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:160][E: codex-rs/tui/src/slash_command.rs:272][E: codex-rs/tui/src/slash_command.rs:284]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:165][E: codex-rs/tui/src/slash_command.rs:192]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:75][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:79][E: codex-rs/tui/src/bottom_pane/command_popup.rs:153]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/model` | `Model` | choose what model and reasoning effort to use | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:236] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:15][E: codex-rs/tui/src/slash_command.rs:127] |
| `/ide` | `Ide` | include current selection, open files, and other context from your IDE | 是 [E: codex-rs/tui/src/slash_command.rs:175] | 是 [E: codex-rs/tui/src/slash_command.rs:260] | 是 [E: codex-rs/tui/src/slash_command.rs:204] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:16][E: codex-rs/tui/src/slash_command.rs:128] |
| `/permissions` | `Permissions` | choose what Codex is allowed to do | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:238] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:17][E: codex-rs/tui/src/slash_command.rs:139] |
| `/keymap` | `Keymap` | remap TUI shortcuts | 是 [E: codex-rs/tui/src/slash_command.rs:176] | 否 [E: codex-rs/tui/src/slash_command.rs:220] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:18][E: codex-rs/tui/src/slash_command.rs:140] |
| `/vim` | `Vim` | toggle Vim mode for the composer | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:221] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:19][E: codex-rs/tui/src/slash_command.rs:141] |
| `/experimental` | `Experimental` | toggle experimental features | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:224] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:24][E: codex-rs/tui/src/slash_command.rs:146] |
| `/approve` | `AutoReview` | approve one retry of a recent auto-review denial | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:258] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:26][E: codex-rs/tui/src/slash_command.rs:147][E: codex-rs/tui/src/slash_command.rs:25] |
| `/plan` | `Plan` | switch to Plan mode | 是 [E: codex-rs/tui/src/slash_command.rs:173] | 否 [E: codex-rs/tui/src/slash_command.rs:228] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:43][E: codex-rs/tui/src/slash_command.rs:132] |
| `/personality` | `Personality` | choose a communication style for Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:237] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:76][E: codex-rs/tui/src/slash_command.rs:131] |
| `/theme` | `Theme` | choose a syntax highlighting theme | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:268] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:61][E: codex-rs/tui/src/slash_command.rs:121] |
| `/pets` | `Pets` | choose or hide the terminal pet | 是 [E: codex-rs/tui/src/slash_command.rs:183] | 否 [E: codex-rs/tui/src/slash_command.rs:268] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:63][E: codex-rs/tui/src/slash_command.rs:122][E: codex-rs/tui/src/slash_command.rs:62] |

## `/keymap` 子命令边界

`/keymap` 无参数时打开交互式 shortcut picker；`/keymap debug` 用当前 `[tui.keymap]` 构建 `RuntimeKeymap` 并打开 debug view；其他参数只显示 `Usage: /keymap [debug]`。单键、两段式 chord、context precedence、conflict validation 和持久化由 `subsys.tui.keymap` 权威覆盖。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:767][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:768][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:769][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:780]

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`

## 相关

- [subsys.core.collaboration-modes](../../subsystems/core/collaboration-modes.md)
- [subsys.config-auth.features-system](../../subsystems/config-auth/features-system.md)
- [config.model-provider](../config/model-provider.md)
- [config.approval-sandbox](../config/approval-sandbox.md)
- [config.ui-tui](../config/ui-tui.md)
- [subsys.tui.keymap](../../subsystems/tui/keymap.md)
