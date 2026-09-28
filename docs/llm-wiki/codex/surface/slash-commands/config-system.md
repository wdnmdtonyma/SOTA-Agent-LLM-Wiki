---
id: command.config-system
title: 配置与系统命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs]
symbols: [SlashCommand::ElevateSandbox, SlashCommand::Memories, SlashCommand::Status, SlashCommand::Daemon, SlashCommand::Warnings, SlashCommand::Cd, SlashCommand::Pwd, SlashCommand::Usage, SlashCommand::DebugConfig, SlashCommand::Title, SlashCommand::Statusline, SlashCommand::Logout, SlashCommand::Feedback, SlashCommand::Ps, SlashCommand::Stop]
related: [config.approval-sandbox, config.ui-tui, config.storage-telemetry-misc, subsys.platform.telemetry-otel, subsys.core.unified-exec]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> 配置与系统 slash commands 是 `SlashCommand` enum（当前 **62** 个变体）中负责 sandbox setup、memory settings、status/usage/debug views、daemon 与 retained warnings、title/statusline controls、logout、feedback 和 background terminal management 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:21][E: codex-rs/tui/src/slash_command.rs:54][E: codex-rs/tui/src/slash_command.rs:55]

## 能回答的问题

- `/setup-default-sandbox` 的 command string 从哪里来?
- `/cd`、`/pwd`、`/status`、`/usage`、`/debug-config` 当前如何映射，哪些可在 task 中使用?
- `/ps` 与 `/stop` 是否仍是 background terminal controls?
- `/daemon` 与 `/warnings` 如何映射，能否在 side conversation 中使用?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:161][E: codex-rs/tui/src/slash_command.rs:316][E: codex-rs/tui/src/slash_command.rs:318]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations。[E: codex-rs/tui/src/slash_command.rs:166][E: codex-rs/tui/src/slash_command.rs:193]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:74][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:73][E: codex-rs/tui/src/bottom_pane/command_popup.rs:78][E: codex-rs/tui/src/bottom_pane/command_popup.rs:152]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/setup-default-sandbox` | `ElevateSandbox` | set up elevated agent sandbox | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:253] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:21][E: codex-rs/tui/src/slash_command.rs:146][E: codex-rs/tui/src/slash_command.rs:20] |
| `/memories` | `Memories` | configure memory use and generation | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:255] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:25][E: codex-rs/tui/src/slash_command.rs:149] |
| `/status` | `Status` | show current session configuration and token usage | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:274] | 是 [E: codex-rs/tui/src/slash_command.rs:202] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:53][E: codex-rs/tui/src/slash_command.rs:118] |
| `/daemon` | `Daemon` | Manage the local background server | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:275] | 是 [E: codex-rs/tui/src/slash_command.rs:203] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:54][E: codex-rs/tui/src/slash_command.rs:116] |
| `/warnings` | `Warnings` | view retained warnings and diagnostic details | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:276] | 是 [E: codex-rs/tui/src/slash_command.rs:204] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:55][E: codex-rs/tui/src/slash_command.rs:117] |
| `/cd` | `Cd` | change the current working directory | 是 [E: codex-rs/tui/src/slash_command.rs:182] | 否 [E: codex-rs/tui/src/slash_command.rs:259] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:56][E: codex-rs/tui/src/slash_command.rs:119] |
| `/pwd` | `Pwd` | show the current working directory | 是 [E: codex-rs/tui/src/slash_command.rs:183] | 是 [E: codex-rs/tui/src/slash_command.rs:277] | 是 [E: codex-rs/tui/src/slash_command.rs:205] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:57][E: codex-rs/tui/src/slash_command.rs:120] |
| `/usage` | `Usage` | view account usage or use a usage limit reset | 是 [E: codex-rs/tui/src/slash_command.rs:184] | 是 [E: codex-rs/tui/src/slash_command.rs:278] | 是 [E: codex-rs/tui/src/slash_command.rs:206] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:59][E: codex-rs/tui/src/slash_command.rs:121] |
| `/debug-config` | `DebugConfig` | show config layers and requirement sources for debugging | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:279] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:60][E: codex-rs/tui/src/slash_command.rs:122] |
| `/title` | `Title` | configure which items appear in the terminal title | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:288] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:61][E: codex-rs/tui/src/slash_command.rs:123] |
| `/statusline` | `Statusline` | configure which items appear in the status line | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:289] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:62][E: codex-rs/tui/src/slash_command.rs:124] |
| `/logout` | `Logout` | log out of Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:261] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:69][E: codex-rs/tui/src/slash_command.rs:153] |
| `/feedback` | `Feedback` | send logs to maintainers | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:291] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:72][E: codex-rs/tui/src/slash_command.rs:92] |
| `/ps` | `Ps` | list background terminals | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:280] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:74][E: codex-rs/tui/src/slash_command.rs:127] |
| `/stop` | `Stop` | stop all background terminals | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:281] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:75][E: codex-rs/tui/src/slash_command.rs:128] |

`/daemon` dispatch 发送 `AppEvent::OpenDaemonMenu`；`/warnings` 发送 `AppEvent::OpenWarnings`。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:507][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:508] `Warnings` 还在 `available_when_thread_unavailable()` 白名单中。[E: codex-rs/tui/src/slash_command.rs:229]

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`

## 相关

- [config.approval-sandbox](../config/approval-sandbox.md)
- [config.ui-tui](../config/ui-tui.md)
- [config.storage-telemetry-misc](../config/storage-telemetry-misc.md)
- [subsys.platform.telemetry-otel](../../subsystems/platform/telemetry-otel.md)
- [subsys.core.unified-exec](../../subsystems/core/unified-exec.md)
