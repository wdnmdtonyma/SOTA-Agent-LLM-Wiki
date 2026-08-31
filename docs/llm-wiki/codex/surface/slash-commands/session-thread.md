---
id: command.session-thread
title: 会话与线程命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs]
symbols: [SlashCommand::New, SlashCommand::Rename, SlashCommand::Archive, SlashCommand::Delete, SlashCommand::Resume, SlashCommand::Fork, SlashCommand::App, SlashCommand::Init, SlashCommand::Compact, SlashCommand::Goal, SlashCommand::Clear, SlashCommand::Rollout, SlashCommand::Quit, SlashCommand::Exit]
related: [spine.sq-eq-architecture, spine.process-lifecycle, subsys.core.session-lifecycle, subsys.core.rollout-persistence, cli.subcommands]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> 会话与线程 slash commands 是 `SlashCommand` enum 中负责新建、恢复、fork、归档、删除、压缩、目标、桌面接续、清屏、退出和定位 rollout 文件的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:33]

## 能回答的问题

- `/new`、`/resume`、`/fork`、`/archive`、`/delete`、`/recap` 当前如何映射到 enum variant?
- 哪些会话命令支持 inline args?
- 哪些会话命令可在 task 运行中触发?
- `/app` 与 `/rollout` 的可见性门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:150][E: codex-rs/tui/src/slash_command.rs:265][E: codex-rs/tui/src/slash_command.rs:265]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:152][E: codex-rs/tui/src/slash_command.rs:180]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()` 与 alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:70][E: codex-rs/tui/src/bottom_pane/command_popup.rs:23]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/new` | `New` | start a new chat during a conversation | 是；`/new <name>` 直接给新 thread 命名。 [E: codex-rs/tui/src/slash_command.rs:168] | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:33][E: codex-rs/tui/src/slash_command.rs:91] |
| `/rename` | `Rename` | rename the current thread | 是 [E: codex-rs/tui/src/slash_command.rs:167] | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:32][E: codex-rs/tui/src/slash_command.rs:96] |
| `/archive` | `Archive` | archive this session and exit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:34][E: codex-rs/tui/src/slash_command.rs:98] |
| `/delete` | `Delete` | permanently delete this session and exit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:35][E: codex-rs/tui/src/slash_command.rs:99] |
| `/resume` | `Resume` | resume a saved chat | 是 [E: codex-rs/tui/src/slash_command.rs:184] | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:36][E: codex-rs/tui/src/slash_command.rs:97] |
| `/fork` | `Fork` | fork the current chat | 是；`/fork <name>` 给新 fork 命名。 [E: codex-rs/tui/src/slash_command.rs:170] | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:37][E: codex-rs/tui/src/slash_command.rs:101] |
| `/app` | `App` | continue this session in the Desktop app | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | macOS/Windows only [E: codex-rs/tui/src/slash_command.rs:273] | [E: codex-rs/tui/src/slash_command.rs:38][E: codex-rs/tui/src/slash_command.rs:102] |
| `/init` | `Init` | create an AGENTS.md file with instructions for Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:39][E: codex-rs/tui/src/slash_command.rs:92] |
| `/compact` | `Compact` | summarize conversation to prevent hitting the context limit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:40][E: codex-rs/tui/src/slash_command.rs:93] |
| `/recap` | `Recap` | summarize the current conversation now | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:41][E: codex-rs/tui/src/slash_command.rs:94] |
| `/goal` | `Goal` | set or view the goal for a long-running task | 是 [E: codex-rs/tui/src/slash_command.rs:172] | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:43][E: codex-rs/tui/src/slash_command.rs:131] |
| `/clear` | `Clear` | clear the terminal and start a new chat | 是；`/clear <name>` 清屏并给 replacement thread 命名。 [E: codex-rs/tui/src/slash_command.rs:169] | 否 [E: codex-rs/tui/src/slash_command.rs:209] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:74][E: codex-rs/tui/src/slash_command.rs:100] |
| `/rollout` | `Rollout` | print the rollout file path | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:262] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:274] | [E: codex-rs/tui/src/slash_command.rs:70][E: codex-rs/tui/src/slash_command.rs:151] |
| `/quit` | `Quit` | exit Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:67][E: codex-rs/tui/src/slash_command.rs:103] |
| `/exit` | `Exit` | exit Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:231] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:68][E: codex-rs/tui/src/slash_command.rs:103] |

## Named fork 执行语义

bare `/fork` 和 `/fork <name>` 都发送 `ForkCurrentSession` event，后者带 `Some(trimmed_name)`。dispatcher 先调用 `fork_thread`，成功后再调用 `thread_set_name`；命名失败只在新 thread UI 中显示错误，不回滚已经成功的 fork。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:244][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:761][E: codex-rs/tui/src/app_event.rs:327][E: codex-rs/tui/src/app/event_dispatch.rs:218][E: codex-rs/tui/src/app/event_dispatch.rs:240][E: codex-rs/tui/src/app/event_dispatch.rs:243]

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`

## 相关

- [spine.sq-eq-architecture](../../spine/sq-eq-architecture.md)
- [spine.process-lifecycle](../../spine/process-lifecycle.md)
- [subsys.core.session-lifecycle](../../subsystems/core/session-lifecycle.md)
- [subsys.core.rollout-persistence](../../subsystems/core/rollout-persistence.md)
- [cli.subcommands](../cli/subcommands.md)
