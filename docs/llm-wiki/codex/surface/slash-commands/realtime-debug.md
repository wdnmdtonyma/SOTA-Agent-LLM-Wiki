---
id: command.realtime-debug
title: 实时、子代理与调试命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [subsys.core.realtime-conversation, spine.trace-subagent, tool.spawn-agent-v2, config.ui-tui, config.agents-memory]
evidence: explicit
status: verified
updated: 5670360009
---

> 实时、子代理与调试 slash commands 是 `SlashCommand` enum 中负责 active agent thread switching、side conversation、approval testing 和 memory debug hooks 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:7][E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:81]

## 能回答的问题

- `/agent` 和 `/subagents` 当前如何映射?
- `/side` 与 `/btw` 是否都支持 inline args?
- 哪些 realtime/debug 命令可在 task 运行中使用?
- `/debug-m-drop`、`/debug-m-update` 和 `/test-approval` 的调试属性在哪里定义?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:146][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:257][E: codex-rs/tui/src/slash_command.rs:258][E: codex-rs/tui/src/slash_command.rs:259][E: codex-rs/tui/src/slash_command.rs:260][E: codex-rs/tui/src/slash_command.rs:261][E: codex-rs/tui/src/slash_command.rs:262]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:152][E: codex-rs/tui/src/slash_command.rs:153][E: codex-rs/tui/src/slash_command.rs:154][E: codex-rs/tui/src/slash_command.rs:156][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:173][E: codex-rs/tui/src/slash_command.rs:174][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:177][E: codex-rs/tui/src/slash_command.rs:184]

| 命令名 | enum variant | description | inline args | during task | side conversation | visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/agent` | `Agent` | switch the active agent thread | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:241] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:43][E: codex-rs/tui/src/slash_command.rs:123] |
| `/subagents` | `MultiAgents` | switch the active agent thread | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:241] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:72][E: codex-rs/tui/src/slash_command.rs:73][E: codex-rs/tui/src/slash_command.rs:123] |
| `/side` | `Side` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:166] | 是 [E: codex-rs/tui/src/slash_command.rs:237] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:44][E: codex-rs/tui/src/slash_command.rs:124][E: codex-rs/tui/src/slash_command.rs:125] |
| `/btw` | `Btw` | start a side conversation in an ephemeral fork | 是 [E: codex-rs/tui/src/slash_command.rs:167] | 是 [E: codex-rs/tui/src/slash_command.rs:238] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:45][E: codex-rs/tui/src/slash_command.rs:124][E: codex-rs/tui/src/slash_command.rs:125] |
| `/test-approval` | `TestApproval` | test approval request | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:240] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:251] | [E: codex-rs/tui/src/slash_command.rs:71][E: codex-rs/tui/src/slash_command.rs:142] |
| `/debug-m-drop` | `MemoryDrop` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:211] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:75][E: codex-rs/tui/src/slash_command.rs:76][E: codex-rs/tui/src/slash_command.rs:114] |
| `/debug-m-update` | `MemoryUpdate` | DO NOT USE | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:212] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:77][E: codex-rs/tui/src/slash_command.rs:78][E: codex-rs/tui/src/slash_command.rs:115] |

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [subsys.core.realtime-conversation](../../subsystems/core/realtime-conversation.md)
- [spine.trace-subagent](../../spine/trace-subagent.md)
- [tool.spawn-agent-v2](../tools/spawn-agent-v2.md)
- [config.ui-tui](../config/ui-tui.md)
- [config.agents-memory](../config/agents-memory.md)
