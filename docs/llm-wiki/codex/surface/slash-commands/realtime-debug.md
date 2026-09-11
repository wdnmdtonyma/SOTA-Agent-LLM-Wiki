---
id: command.realtime-debug
title: 实时、子代理与调试命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs]
symbols: [SlashCommand::Agents, SlashCommand::MultiAgents, SlashCommand::Side, SlashCommand::Btw, SlashCommand::Voice, SlashCommand::TestApproval, SlashCommand::MemoryDrop, SlashCommand::MemoryUpdate]
related: [subsys.core.realtime-conversation, spine.trace-subagent, tool.spawn-agent-v2, config.ui-tui, config.agents-memory]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> 实时、子代理与调试 slash commands 是 `SlashCommand` enum 中负责 voice、active agent thread switching、side conversation、approval testing 和 memory debug hooks 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:44]

## 能回答的问题

- `/agents` 和 `/subagents` 当前如何映射?
- `/side` 与 `/btw` 是否都支持 inline args?
- `/voice` 与 `/voice settings` 如何映射，可见性由什么门控?
- 哪些 realtime/debug 命令可在 task 运行中使用?
- `/debug-m-drop`、`/debug-m-update` 和 `/test-approval` 的调试属性在哪里定义?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:157][E: codex-rs/tui/src/slash_command.rs:281][E: codex-rs/tui/src/slash_command.rs:283]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:162][E: codex-rs/tui/src/slash_command.rs:189]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤，且 `/side` 与 `/btw` 在 review mode 下还会被 dispatch 层拒绝。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:72][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:83][E: codex-rs/tui/src/bottom_pane/command_popup.rs:23][E: codex-rs/tui/src/bottom_pane/command_popup.rs:76][E: codex-rs/tui/src/bottom_pane/command_popup.rs:81][E: codex-rs/tui/src/bottom_pane/command_popup.rs:155][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:1282]

`SlashCommand::Voice` 的 `is_visible()` 恒为 true，但 popup/composer 在 `flags.voice_command_enabled` 为假时过滤掉 `Voice`。带参时 dispatch 接受 `settings`（选音色）、`mute`、`stop`。[E: codex-rs/tui/src/slash_command.rs:273][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:65][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:83][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:762]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/voice` | `Voice` | start or stop voice; use /voice settings to choose a voice | 是 [E: codex-rs/tui/src/slash_command.rs:172] | 是 [E: codex-rs/tui/src/slash_command.rs:249] | 否 | `is_visible` true；popup 另需 `voice_command_enabled` [E: codex-rs/tui/src/slash_command.rs:273][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:83] | [E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:132] |
| `/agents` | `Agents` | view and switch between all active agent sessions | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:264] | 是 [E: codex-rs/tui/src/slash_command.rs:193] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:44][E: codex-rs/tui/src/slash_command.rs:134] |
| `/subagents` | `MultiAgents` | switch between this session's subagents | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:264] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:77][E: codex-rs/tui/src/slash_command.rs:135] |
| `/side` | `Side` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:182] | 是 [E: codex-rs/tui/src/slash_command.rs:260] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:45][E: codex-rs/tui/src/slash_command.rs:136] |
| `/btw` | `Btw` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:183] | 是 [E: codex-rs/tui/src/slash_command.rs:261] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:136] |
| `/test-approval` | `TestApproval` | test approval request | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:263] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:274] | [E: codex-rs/tui/src/slash_command.rs:76][E: codex-rs/tui/src/slash_command.rs:151] |
| `/debug-m-drop` | `MemoryDrop` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:228] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:80][E: codex-rs/tui/src/slash_command.rs:124] |
| `/debug-m-update` | `MemoryUpdate` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:229] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:82][E: codex-rs/tui/src/slash_command.rs:125] |

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`

## 相关

- [subsys.core.realtime-conversation](../../subsystems/core/realtime-conversation.md)
- [spine.trace-subagent](../../spine/trace-subagent.md)
- [tool.spawn-agent-v2](../tools/spawn-agent-v2.md)
- [config.ui-tui](../config/ui-tui.md)
- [config.agents-memory](../config/agents-memory.md)
