---
id: command.session-thread
title: 会话与线程命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [spine.sq-eq-architecture, spine.process-lifecycle, subsys.core.session-lifecycle, subsys.core.rollout-persistence, cli.subcommands]
evidence: explicit
status: verified
updated: db887d03e1
---

> 会话与线程 slash commands 是 `SlashCommand` enum 中负责新建、恢复、fork、归档、删除、压缩、目标、桌面接续、清屏、退出和定位 rollout 文件的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:83]

## 能回答的问题

- `/new`、`/resume`、`/fork`、`/archive`、`/delete` 当前如何映射到 enum variant?
- 哪些会话命令支持 inline args?
- 哪些会话命令可在 task 运行中触发?
- `/app` 与 `/rollout` 的可见性门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:258][E: codex-rs/tui/src/slash_command.rs:259][E: codex-rs/tui/src/slash_command.rs:260][E: codex-rs/tui/src/slash_command.rs:261][E: codex-rs/tui/src/slash_command.rs:262]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:153][E: codex-rs/tui/src/slash_command.rs:154][E: codex-rs/tui/src/slash_command.rs:156][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:174][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:177][E: codex-rs/tui/src/slash_command.rs:184]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:70][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:78][E: codex-rs/tui/src/bottom_pane/command_popup.rs:23][E: codex-rs/tui/src/bottom_pane/command_popup.rs:77][E: codex-rs/tui/src/bottom_pane/command_popup.rs:151]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/new` | `New` | start a new chat during a conversation | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:190] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:33][E: codex-rs/tui/src/slash_command.rs:86] |
| `/rename` | `Rename` | rename the current thread | 是 [E: codex-rs/tui/src/slash_command.rs:157] | 是 [E: codex-rs/tui/src/slash_command.rs:216] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:32][E: codex-rs/tui/src/slash_command.rs:90] |
| `/archive` | `Archive` | archive this session and exit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:191] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:34][E: codex-rs/tui/src/slash_command.rs:92] |
| `/delete` | `Delete` | permanently delete this session and exit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:192] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:35][E: codex-rs/tui/src/slash_command.rs:93] |
| `/resume` | `Resume` | resume a saved chat | 是 [E: codex-rs/tui/src/slash_command.rs:168] | 是 [E: codex-rs/tui/src/slash_command.rs:210] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:36][E: codex-rs/tui/src/slash_command.rs:91] |
| `/fork` | `Fork` | fork the current chat | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:193] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:37][E: codex-rs/tui/src/slash_command.rs:95] |
| `/app` | `App` | continue this session in Codex Desktop | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:225] | 否 | macOS/Windows only [E: codex-rs/tui/src/slash_command.rs:250] | [E: codex-rs/tui/src/slash_command.rs:38][E: codex-rs/tui/src/slash_command.rs:96] |
| `/init` | `Init` | create an AGENTS.md file with instructions for Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:194] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:39][E: codex-rs/tui/src/slash_command.rs:87] |
| `/compact` | `Compact` | summarize conversation to prevent hitting the context limit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:195] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:40][E: codex-rs/tui/src/slash_command.rs:88] |
| `/goal` | `Goal` | set or view the goal for a long-running task | 是 [E: codex-rs/tui/src/slash_command.rs:159] | 是 [E: codex-rs/tui/src/slash_command.rs:226] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:122] |
| `/clear` | `Clear` | clear the terminal and start a new chat | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:205] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:69][E: codex-rs/tui/src/slash_command.rs:94] |
| `/rollout` | `Rollout` | print the rollout file path | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:239] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:251] | [E: codex-rs/tui/src/slash_command.rs:65][E: codex-rs/tui/src/slash_command.rs:141] |
| `/quit` | `Quit` | exit Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:235] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:62][E: codex-rs/tui/src/slash_command.rs:97] |
| `/exit` | `Exit` | exit Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:236] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:63][E: codex-rs/tui/src/slash_command.rs:97] |

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`

## 相关

- [spine.sq-eq-architecture](../../spine/sq-eq-architecture.md)
- [spine.process-lifecycle](../../spine/process-lifecycle.md)
- [subsys.core.session-lifecycle](../../subsystems/core/session-lifecycle.md)
- [subsys.core.rollout-persistence](../../subsystems/core/rollout-persistence.md)
- [cli.subcommands](../cli/subcommands.md)
