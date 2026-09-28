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
updated: 1cc7e23612
---

> 实时、子代理与调试 slash commands 是 `SlashCommand` enum（当前 **62** 个变体）中负责 voice、agent command center、side conversation、approval testing 和 memory debug hooks 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:44][E: codex-rs/tui/src/slash_command.rs:85]

## 能回答的问题

- `/agents` 和 `/subagents` 当前如何映射?
- `/side` 与 `/btw` 是否都支持 inline args?
- `/voice` 与 `/voice settings` 如何映射，可见性由什么门控?
- 哪些 realtime/debug 命令可在 task 运行中使用?
- `/debug-m-drop`、`/debug-m-update` 和 `/test-approval` 的调试属性在哪里定义?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:161][E: codex-rs/tui/src/slash_command.rs:316][E: codex-rs/tui/src/slash_command.rs:318]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations。[E: codex-rs/tui/src/slash_command.rs:166][E: codex-rs/tui/src/slash_command.rs:193]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤，且 `/side` 与 `/btw` 在 review mode 下还会被 dispatch 层拒绝。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:81][E: codex-rs/tui/src/bottom_pane/command_popup.rs:73][E: codex-rs/tui/src/bottom_pane/command_popup.rs:78][E: codex-rs/tui/src/bottom_pane/command_popup.rs:152][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:1323]

`SlashCommand::Voice` 的 `is_visible()` 恒为 true，但 popup/composer 在 `flags.voice_command_enabled` 为假时过滤掉 `Voice`。带参时 dispatch 接受 `settings`（选音色）、`mute`、`stop`。[E: codex-rs/tui/src/slash_command.rs:308][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:64][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:81][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:791]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/voice` | `Voice` | start or stop voice; use /voice settings to choose a voice | 是 [E: codex-rs/tui/src/slash_command.rs:176] | 是 [E: codex-rs/tui/src/slash_command.rs:284] | 否 | `is_visible` true；popup 另需 `voice_command_enabled` [E: codex-rs/tui/src/slash_command.rs:308][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:81] | [E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:136] |
| `/agents` | `Agents` | open the agent command center | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:299] | 是 [E: codex-rs/tui/src/slash_command.rs:197] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:44][E: codex-rs/tui/src/slash_command.rs:138] |
| `/subagents` | `MultiAgents` | switch between this session's subagents | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:299] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:79][E: codex-rs/tui/src/slash_command.rs:139] |
| `/side` | `Side` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:186] | 是 [E: codex-rs/tui/src/slash_command.rs:295] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:45][E: codex-rs/tui/src/slash_command.rs:140] |
| `/btw` | `Btw` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:187] | 是 [E: codex-rs/tui/src/slash_command.rs:296] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:140] |
| `/test-approval` | `TestApproval` | test approval request | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:298] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:309] | [E: codex-rs/tui/src/slash_command.rs:78][E: codex-rs/tui/src/slash_command.rs:155] |
| `/debug-m-drop` | `MemoryDrop` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:262] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:82][E: codex-rs/tui/src/slash_command.rs:129] |
| `/debug-m-update` | `MemoryUpdate` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:263] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:84][E: codex-rs/tui/src/slash_command.rs:130] |

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
