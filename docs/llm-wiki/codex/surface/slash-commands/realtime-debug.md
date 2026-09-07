---
id: command.realtime-debug
title: 实时、子代理与调试命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs]
symbols: [SlashCommand::Agents, SlashCommand::MultiAgents, SlashCommand::Side, SlashCommand::Btw, SlashCommand::TestApproval, SlashCommand::MemoryDrop, SlashCommand::MemoryUpdate]
related: [subsys.core.realtime-conversation, spine.trace-subagent, tool.spawn-agent-v2, config.ui-tui, config.agents-memory]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> 实时、子代理与调试 slash commands 是 `SlashCommand` enum 中负责 active agent thread switching、side conversation、approval testing 和 memory debug hooks 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:45]

## 能回答的问题

- `/agents` 和 `/subagents` 当前如何映射?
- `/side` 与 `/btw` 是否都支持 inline args?
- 哪些 realtime/debug 命令可在 task 运行中使用?
- `/debug-m-drop`、`/debug-m-update` 和 `/test-approval` 的调试属性在哪里定义?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:160][E: codex-rs/tui/src/slash_command.rs:272][E: codex-rs/tui/src/slash_command.rs:284]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:165][E: codex-rs/tui/src/slash_command.rs:192]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤，且 `/side` 与 `/btw` 在 review mode 下还会被 dispatch 层拒绝。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:23][E: codex-rs/tui/src/bottom_pane/command_popup.rs:79][E: codex-rs/tui/src/bottom_pane/command_popup.rs:82][E: codex-rs/tui/src/bottom_pane/command_popup.rs:153][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:1277]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/agents` | `Agents` | view and switch between all active agent sessions | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:267] | 是 [E: codex-rs/tui/src/slash_command.rs:196] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:45][E: codex-rs/tui/src/slash_command.rs:134] |
| `/subagents` | `MultiAgents` | switch between this session's subagents | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:267] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:79][E: codex-rs/tui/src/slash_command.rs:135][E: codex-rs/tui/src/slash_command.rs:78] |
| `/side` | `Side` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:184] | 是 [E: codex-rs/tui/src/slash_command.rs:263] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:46][E: codex-rs/tui/src/slash_command.rs:136] |
| `/btw` | `Btw` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:185] | 是 [E: codex-rs/tui/src/slash_command.rs:264] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:47][E: codex-rs/tui/src/slash_command.rs:136] |
| `/test-approval` | `TestApproval` | test approval request | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:266] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:277] | [E: codex-rs/tui/src/slash_command.rs:77][E: codex-rs/tui/src/slash_command.rs:154] |
| `/debug-m-drop` | `MemoryDrop` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:232] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:82][E: codex-rs/tui/src/slash_command.rs:125][E: codex-rs/tui/src/slash_command.rs:81] |
| `/debug-m-update` | `MemoryUpdate` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:233] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:84][E: codex-rs/tui/src/slash_command.rs:126][E: codex-rs/tui/src/slash_command.rs:83] |

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
