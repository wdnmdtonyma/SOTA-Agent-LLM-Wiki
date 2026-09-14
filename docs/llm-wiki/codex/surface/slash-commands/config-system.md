---
id: command.config-system
title: 配置与系统命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs]
symbols: [SlashCommand::ElevateSandbox, SlashCommand::Memories, SlashCommand::Status, SlashCommand::Cd, SlashCommand::Pwd, SlashCommand::Usage, SlashCommand::DebugConfig, SlashCommand::Title, SlashCommand::Statusline, SlashCommand::Logout, SlashCommand::Feedback, SlashCommand::Ps, SlashCommand::Stop]
related: [config.approval-sandbox, config.ui-tui, config.storage-telemetry-misc, subsys.platform.telemetry-otel, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> 配置与系统 slash commands 是 `SlashCommand` enum 中负责 sandbox setup、memory settings、status/usage/debug views、title/statusline controls、logout、feedback 和 background terminal management 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:21]

## 能回答的问题

- `/setup-default-sandbox` 的 command string 从哪里来?
- `/cd`、`/pwd`、`/status`、`/usage`、`/debug-config` 当前如何映射，哪些可在 task 中使用?
- `/ps` 与 `/stop` 是否仍是 background terminal controls?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:155][E: codex-rs/tui/src/slash_command.rs:278][E: codex-rs/tui/src/slash_command.rs:280]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:160][E: codex-rs/tui/src/slash_command.rs:187]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:74][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:74][E: codex-rs/tui/src/bottom_pane/command_popup.rs:79][E: codex-rs/tui/src/bottom_pane/command_popup.rs:153]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/setup-default-sandbox` | `ElevateSandbox` | set up elevated agent sandbox | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:217] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:21][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:20] |
| `/memories` | `Memories` | configure memory use and generation | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:219] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:25][E: codex-rs/tui/src/slash_command.rs:143] |
| `/status` | `Status` | show current session configuration and token usage | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:238] | 是 [E: codex-rs/tui/src/slash_command.rs:196] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:52][E: codex-rs/tui/src/slash_command.rs:112] |
| `/cd` | `Cd` | change the current working directory | 是 [E: codex-rs/tui/src/slash_command.rs:176] | 否 [E: codex-rs/tui/src/slash_command.rs:223] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:53][E: codex-rs/tui/src/slash_command.rs:113] |
| `/pwd` | `Pwd` | show the current working directory | 是 [E: codex-rs/tui/src/slash_command.rs:177] | 是 [E: codex-rs/tui/src/slash_command.rs:239] | 是 [E: codex-rs/tui/src/slash_command.rs:197] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:54][E: codex-rs/tui/src/slash_command.rs:114] |
| `/usage` | `Usage` | view account usage or use a usage limit reset | 是 [E: codex-rs/tui/src/slash_command.rs:178] | 是 [E: codex-rs/tui/src/slash_command.rs:240] | 是 [E: codex-rs/tui/src/slash_command.rs:198] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:56][E: codex-rs/tui/src/slash_command.rs:115] |
| `/debug-config` | `DebugConfig` | show config layers and requirement sources for debugging | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:241] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:57][E: codex-rs/tui/src/slash_command.rs:116] |
| `/title` | `Title` | configure which items appear in the terminal title | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:250] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:58][E: codex-rs/tui/src/slash_command.rs:117] |
| `/statusline` | `Statusline` | configure which items appear in the status line | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:251] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:59][E: codex-rs/tui/src/slash_command.rs:118] |
| `/logout` | `Logout` | log out of Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:225] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:66][E: codex-rs/tui/src/slash_command.rs:147] |
| `/feedback` | `Feedback` | send logs to maintainers | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:253] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:69][E: codex-rs/tui/src/slash_command.rs:89] |
| `/ps` | `Ps` | list background terminals | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:242] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:71][E: codex-rs/tui/src/slash_command.rs:121] |
| `/stop` | `Stop` | stop all background terminals | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:243] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:272] | [E: codex-rs/tui/src/slash_command.rs:72][E: codex-rs/tui/src/slash_command.rs:122] |

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`

## 相关

- [config.approval-sandbox](../config/approval-sandbox.md)
- [config.ui-tui](../config/ui-tui.md)
- [config.storage-telemetry-misc](../config/storage-telemetry-misc.md)
- [subsys.platform.telemetry-otel](../../subsystems/platform/telemetry-otel.md)
- [subsys.core.unified-exec](../../subsystems/core/unified-exec.md)
