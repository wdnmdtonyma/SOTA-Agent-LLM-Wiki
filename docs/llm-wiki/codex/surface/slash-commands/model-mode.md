---
id: command.model-mode
title: 模型、模式与输入体验命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs, codex-rs/tui/src/app_server_session.rs, codex-rs/tui/src/app/thread_settings.rs, codex-rs/features/src/lib.rs, codex-rs/config/src/config_toml.rs, codex-rs/protocol/src/config_types.rs]
symbols: [SlashCommand::Model, SlashCommand::Ide, SlashCommand::Permissions, SlashCommand::Keymap, SlashCommand::Vim, SlashCommand::Experimental, SlashCommand::AutoReview, SlashCommand::Plan, SlashCommand::Theme, SlashCommand::Pets, SlashCommand::Tui, personality_opt_out_only]
related: [subsys.core.collaboration-modes, subsys.config-auth.features-system, config.model-provider, config.approval-sandbox, config.ui-tui, subsys.tui.keymap, subsys.providers.model-catalog]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> 模型、模式与输入体验 slash commands 是 `SlashCommand` enum 中选择模型、IDE context、权限、keymap、Vim、experimental features、auto-review retry、Plan mode、TUI mode、theme 和 terminal pet 的 TUI built-in command 子集。`SlashCommand` 当前 **62** 个变体（含 `Tui` / `Daemon` / `Warnings`），没有 `Personality`，因此 TUI 不再提供 `/personality`。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:50][E: codex-rs/tui/src/slash_command.rs:85]

## 能回答的问题

- `/model`、`/ide`、`/permissions`、`/plan` 当前是否仍存在?
- 哪些模型/模式命令支持 inline args?
- 哪些模型/模式命令不能在 task 运行中触发?
- `/approve` 和 `/pets` 的 canonical command string 从哪里来?
- `/personality` 是否仍是 TUI slash command？config `personality` 和 `Feature::Personality` 还在吗?
- `/tui` 做什么？能否在 task 运行中触发?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:161][E: codex-rs/tui/src/slash_command.rs:316][E: codex-rs/tui/src/slash_command.rs:318]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations。[E: codex-rs/tui/src/slash_command.rs:166][E: codex-rs/tui/src/slash_command.rs:193]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:75][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:78][E: codex-rs/tui/src/bottom_pane/command_popup.rs:152]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/model` | `Model` | choose what model and reasoning effort to use | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:266] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:15][E: codex-rs/tui/src/slash_command.rs:131] |
| `/ide` | `Ide` | include current selection, open files, and other context from your IDE | 是 [E: codex-rs/tui/src/slash_command.rs:177] | 是 [E: codex-rs/tui/src/slash_command.rs:292] | 是 [E: codex-rs/tui/src/slash_command.rs:207] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:16][E: codex-rs/tui/src/slash_command.rs:132] |
| `/permissions` | `Permissions` | choose what Codex is allowed to do | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:267] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:17][E: codex-rs/tui/src/slash_command.rs:143] |
| `/keymap` | `Keymap` | remap TUI shortcuts | 是 [E: codex-rs/tui/src/slash_command.rs:178] | 否 [E: codex-rs/tui/src/slash_command.rs:250] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:18][E: codex-rs/tui/src/slash_command.rs:144] |
| `/vim` | `Vim` | toggle Vim mode for the composer | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:252] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:19][E: codex-rs/tui/src/slash_command.rs:145] |
| `/experimental` | `Experimental` | toggle experimental features | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:254] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:22][E: codex-rs/tui/src/slash_command.rs:147] |
| `/approve` | `AutoReview` | approve one retry of a recent auto-review denial | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:290] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:24][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:23] |
| `/plan` | `Plan` | switch to Plan mode | 是 [E: codex-rs/tui/src/slash_command.rs:174] | 否 [E: codex-rs/tui/src/slash_command.rs:258] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:41][E: codex-rs/tui/src/slash_command.rs:135] |
| `/tui` | `Tui` | choose the TUI mode for the next launch | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:251] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:50][E: codex-rs/tui/src/slash_command.rs:110] |
| `/theme` | `Theme` | choose a syntax highlighting theme | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:300] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:63][E: codex-rs/tui/src/slash_command.rs:125] |
| `/pets` | `Pets` | choose or hide the terminal pet | 是 [E: codex-rs/tui/src/slash_command.rs:185] | 否 [E: codex-rs/tui/src/slash_command.rs:300] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:65][E: codex-rs/tui/src/slash_command.rs:126][E: codex-rs/tui/src/slash_command.rs:64] |

`/tui` dispatch 调用 `show_tui_mode_picker()`，为下一 launch 选 TUI mode。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:467]

## `/personality` 已删除

删掉的是 TUI 选择器，不是 personality 配置类型本身。`SlashCommand` 与 `slash_dispatch` 都没有 `Personality` 分支。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:85]

仍在的路径：

- `Feature::Personality` key `personality` 是 **Removed** compatibility no-op，`default_enabled: false`。[E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:1754][E: codex-rs/features/src/lib.rs:1755][E: codex-rs/features/src/lib.rs:1756]
- `ConfigToml.personality: Option<Personality>` 仍是顶层 config 键；`Personality` 变体是 `None`、`Friendly`、`Pragmatic`。[E: codex-rs/config/src/config_toml.rs:402][E: codex-rs/protocol/src/config_types.rs:332][E: codex-rs/protocol/src/config_types.rs:333][E: codex-rs/protocol/src/config_types.rs:334][E: codex-rs/protocol/src/config_types.rs:335]
- TUI `turn/start` 与 `thread/settings/update` 只转发 `Personality::None` opt-out；`personality_opt_out_only` 会丢掉 `Friendly`/`Pragmatic`。[E: codex-rs/tui/src/app_server_session.rs:1791][E: codex-rs/tui/src/app_server_session.rs:1792][E: codex-rs/tui/src/app_server_session.rs:1322][E: codex-rs/tui/src/app/thread_settings.rs:217]

bundled GPT-5.4/5.5 可把 friendly 文本写进 catalog `instructions_template` 的 `# Personality` 段，那是模型指令，不是 TUI picker。权威细节见 [subsys.providers.model-catalog](../../subsystems/providers/model-catalog.md)。

## `/keymap` 子命令边界

`/keymap` 无参数时打开交互式 shortcut picker；`/keymap debug` 用当前 `[tui.keymap]` 构建 `RuntimeKeymap` 并打开 debug view；其他参数只显示 `Usage: /keymap [debug]`。单键、两段式 chord、context precedence、conflict validation 和持久化由 `subsys.tui.keymap` 权威覆盖。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:810][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:811][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:812][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:823]

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
