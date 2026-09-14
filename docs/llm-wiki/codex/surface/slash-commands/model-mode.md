---
id: command.model-mode
title: 模型、模式与输入体验命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs, codex-rs/tui/src/app_server_session.rs, codex-rs/tui/src/app/thread_settings.rs, codex-rs/features/src/lib.rs, codex-rs/config/src/config_toml.rs, codex-rs/protocol/src/config_types.rs]
symbols: [SlashCommand::Model, SlashCommand::Ide, SlashCommand::Permissions, SlashCommand::Keymap, SlashCommand::Vim, SlashCommand::Experimental, SlashCommand::AutoReview, SlashCommand::Plan, SlashCommand::Theme, SlashCommand::Pets, personality_opt_out_only]
related: [subsys.core.collaboration-modes, subsys.config-auth.features-system, config.model-provider, config.approval-sandbox, config.ui-tui, subsys.tui.keymap, subsys.providers.model-catalog]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> 模型、模式与输入体验 slash commands 是 `SlashCommand` enum 中选择模型、IDE context、权限、keymap、Vim、experimental features、auto-review retry、Plan mode、theme 和 terminal pet 的 TUI built-in command 子集。`SlashCommand` 当前 59 个变体（`Model` … `MemoryUpdate`），没有 `Personality`，因此 TUI 不再提供 `/personality`。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:15][E: codex-rs/tui/src/slash_command.rs:82]

## 能回答的问题

- `/model`、`/ide`、`/permissions`、`/plan` 当前是否仍存在?
- 哪些模型/模式命令支持 inline args?
- 哪些模型/模式命令不能在 task 运行中触发?
- `/approve` 和 `/pets` 的 canonical command string 从哪里来?
- `/personality` 是否仍是 TUI slash command？config `personality` 和 `Feature::Personality` 还在吗?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:155][E: codex-rs/tui/src/slash_command.rs:266][E: codex-rs/tui/src/slash_command.rs:278]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:160][E: codex-rs/tui/src/slash_command.rs:187]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:75][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:79][E: codex-rs/tui/src/bottom_pane/command_popup.rs:153]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/model` | `Model` | choose what model and reasoning effort to use | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:230] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:15][E: codex-rs/tui/src/slash_command.rs:125] |
| `/ide` | `Ide` | include current selection, open files, and other context from your IDE | 是 [E: codex-rs/tui/src/slash_command.rs:171] | 是 [E: codex-rs/tui/src/slash_command.rs:254] | 是 [E: codex-rs/tui/src/slash_command.rs:199] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:16][E: codex-rs/tui/src/slash_command.rs:126] |
| `/permissions` | `Permissions` | choose what Codex is allowed to do | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:17][E: codex-rs/tui/src/slash_command.rs:137] |
| `/keymap` | `Keymap` | remap TUI shortcuts | 是 [E: codex-rs/tui/src/slash_command.rs:172] | 否 [E: codex-rs/tui/src/slash_command.rs:215] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:18][E: codex-rs/tui/src/slash_command.rs:138] |
| `/vim` | `Vim` | toggle Vim mode for the composer | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:216] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:19][E: codex-rs/tui/src/slash_command.rs:139] |
| `/experimental` | `Experimental` | toggle experimental features | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:218] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:22][E: codex-rs/tui/src/slash_command.rs:141] |
| `/approve` | `AutoReview` | approve one retry of a recent auto-review denial | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:252] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:24][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:23] |
| `/plan` | `Plan` | switch to Plan mode | 是 [E: codex-rs/tui/src/slash_command.rs:168] | 否 [E: codex-rs/tui/src/slash_command.rs:222] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:41][E: codex-rs/tui/src/slash_command.rs:129] |
| `/theme` | `Theme` | choose a syntax highlighting theme | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:262] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:60][E: codex-rs/tui/src/slash_command.rs:119] |
| `/pets` | `Pets` | choose or hide the terminal pet | 是 [E: codex-rs/tui/src/slash_command.rs:179] | 否 [E: codex-rs/tui/src/slash_command.rs:262] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:62][E: codex-rs/tui/src/slash_command.rs:120][E: codex-rs/tui/src/slash_command.rs:61] |

## `/personality` 已删除

删掉的是 TUI 选择器，不是 personality 配置/feature 整段。`SlashCommand` 与 `slash_dispatch` 都没有 `Personality` 分支。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:82]

仍在的路径：

- `Feature::Personality` key `personality`，`Stage::Stable`，`default_enabled: true`。[E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:1678][E: codex-rs/features/src/lib.rs:1679][E: codex-rs/features/src/lib.rs:1680]
- `ConfigToml.personality: Option<Personality>` 仍是顶层 config 键；`Personality` 变体是 `None`、`Friendly`、`Pragmatic`。[E: codex-rs/config/src/config_toml.rs:387][E: codex-rs/protocol/src/config_types.rs:332][E: codex-rs/protocol/src/config_types.rs:333][E: codex-rs/protocol/src/config_types.rs:334][E: codex-rs/protocol/src/config_types.rs:335]
- TUI `turn/start` 与 `thread/settings/update` 只转发 `Personality::None` opt-out；`personality_opt_out_only` 会丢掉 `Friendly`/`Pragmatic`。[E: codex-rs/tui/src/app_server_session.rs:1829][E: codex-rs/tui/src/app_server_session.rs:1830][E: codex-rs/tui/src/app_server_session.rs:1360][E: codex-rs/tui/src/app/thread_settings.rs:220]

bundled GPT-5.4/5.5 可把 friendly 文本写进 catalog `instructions_template` 的 `# Personality` 段，那是模型指令，不是 TUI picker。权威细节见 [subsys.providers.model-catalog](../../subsystems/providers/model-catalog.md)。

## `/keymap` 子命令边界

`/keymap` 无参数时打开交互式 shortcut picker；`/keymap debug` 用当前 `[tui.keymap]` 构建 `RuntimeKeymap` 并打开 debug view；其他参数只显示 `Usage: /keymap [debug]`。单键、两段式 chord、context precedence、conflict validation 和持久化由 `subsys.tui.keymap` 权威覆盖。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:771][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:772][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:773][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:784]

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`
- `codex-rs/tui/src/app_server_session.rs`
- `codex-rs/tui/src/app/thread_settings.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/config/src/config_toml.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- [subsys.core.collaboration-modes](../../subsystems/core/collaboration-modes.md)
- [subsys.config-auth.features-system](../../subsystems/config-auth/features-system.md)
- [config.model-provider](../config/model-provider.md)
- [config.approval-sandbox](../config/approval-sandbox.md)
- [config.ui-tui](../config/ui-tui.md)
- [subsys.tui.keymap](../../subsystems/tui/keymap.md)
- [subsys.providers.model-catalog](../../subsystems/providers/model-catalog.md)
