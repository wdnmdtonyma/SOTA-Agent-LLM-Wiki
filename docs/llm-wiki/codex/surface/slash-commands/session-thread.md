---
id: command.session-thread
title: 会话与线程命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs]
symbols: [SlashCommand::New, SlashCommand::Rename, SlashCommand::Archive, SlashCommand::Delete, SlashCommand::Resume, SlashCommand::Fork, SlashCommand::Worktree, SlashCommand::App, SlashCommand::Init, SlashCommand::Compact, SlashCommand::Recap, SlashCommand::Goal, SlashCommand::Clear, SlashCommand::Rollout, SlashCommand::Quit, SlashCommand::Exit]
related: [spine.sq-eq-architecture, spine.process-lifecycle, subsys.core.session-lifecycle, subsys.core.rollout-persistence, cli.subcommands]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> 会话与线程 slash commands 是 `SlashCommand` enum 中负责新建、恢复、fork、worktree、归档、删除、压缩、目标、桌面接续、清屏、退出和定位 rollout 文件的 TUI built-in command 子集。当前 `SlashCommand` 共 60 个变体。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:33][E: codex-rs/tui/src/slash_command.rs:39]

## 能回答的问题

- `/new`、`/resume`、`/fork`、`/archive`、`/delete`、`/recap` 当前如何映射到 enum variant?
- 哪些会话命令支持 inline args?
- 哪些会话命令可在 task 运行中触发?
- `/app` 与 `/rollout` 的可见性门控是什么?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:160][E: codex-rs/tui/src/slash_command.rs:284][E: codex-rs/tui/src/slash_command.rs:287]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `Worktree` is not in that whitelist. `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:165][E: codex-rs/tui/src/slash_command.rs:192]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()` 与 alias filtering 追加过滤，其中 `Worktree` 还要求 `flags.worktrees_enabled`。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:80][E: codex-rs/tui/src/bottom_pane/command_popup.rs:23]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/new` | `New` | start a new chat during a conversation | 是；`/new <name>` 直接给新 thread 命名。 [E: codex-rs/tui/src/slash_command.rs:172] | 否 [E: codex-rs/tui/src/slash_command.rs:213] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:33][E: codex-rs/tui/src/slash_command.rs:93] |
| `/rename` | `Rename` | rename the current thread | 是 [E: codex-rs/tui/src/slash_command.rs:171] | 是 [E: codex-rs/tui/src/slash_command.rs:241] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:32][E: codex-rs/tui/src/slash_command.rs:98] |
| `/archive` | `Archive` | archive this session and exit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:214] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:34][E: codex-rs/tui/src/slash_command.rs:100] |
| `/delete` | `Delete` | permanently delete this session and exit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:216] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:35][E: codex-rs/tui/src/slash_command.rs:101] |
| `/resume` | `Resume` | resume a saved chat | 是 [E: codex-rs/tui/src/slash_command.rs:186] | 是 [E: codex-rs/tui/src/slash_command.rs:235] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:36][E: codex-rs/tui/src/slash_command.rs:99] |
| `/fork` | `Fork` | fork the current chat | 是；`/fork <name>` 给新 fork 命名。 [E: codex-rs/tui/src/slash_command.rs:174] | 否 [E: codex-rs/tui/src/slash_command.rs:217] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:37][E: codex-rs/tui/src/slash_command.rs:104] |
| `/worktree` | `Worktree` | start or continue a conversation in a new worktree | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:218] | 否 | `is_visible` 默认 true；popup 另需 `worktrees` feature [E: codex-rs/tui/src/slash_command.rs:278][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:80] | [E: codex-rs/tui/src/slash_command.rs:38][E: codex-rs/tui/src/slash_command.rs:105] |
| `/app` | `App` | continue this session in the Desktop app | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:251] | 否 | macOS/Windows only [E: codex-rs/tui/src/slash_command.rs:276] | [E: codex-rs/tui/src/slash_command.rs:40][E: codex-rs/tui/src/slash_command.rs:104] |
| `/init` | `Init` | create an AGENTS.md file with instructions for Codex | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:216] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:41][E: codex-rs/tui/src/slash_command.rs:94] |
| `/compact` | `Compact` | summarize conversation to prevent hitting the context limit | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:217] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:95] |
| `/recap` | `Recap` | summarize the current conversation now | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:218] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:42][E: codex-rs/tui/src/slash_command.rs:95] |
| `/goal` | `Goal` | set or view the goal for a long-running task | 是 [E: codex-rs/tui/src/slash_command.rs:174] | 是 [E: codex-rs/tui/src/slash_command.rs:252] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:44][E: codex-rs/tui/src/slash_command.rs:133] |
| `/clear` | `Clear` | clear the terminal and start a new chat | 是；`/clear <name>` 清屏并给 replacement thread 命名。 [E: codex-rs/tui/src/slash_command.rs:171] | 否 [E: codex-rs/tui/src/slash_command.rs:230] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:75][E: codex-rs/tui/src/slash_command.rs:102] |
| `/rollout` | `Rollout` | print the rollout file path | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:265] | 否 | debug_assertions only [E: codex-rs/tui/src/slash_command.rs:277] | [E: codex-rs/tui/src/slash_command.rs:71][E: codex-rs/tui/src/slash_command.rs:153] |
| `/quit` | `Quit` | exit Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:261] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:69][E: codex-rs/tui/src/slash_command.rs:105] |
| `/exit` | `Exit` | exit Codex | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:265] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:278] | [E: codex-rs/tui/src/slash_command.rs:69][E: codex-rs/tui/src/slash_command.rs:105] |

## Named fork 执行语义

bare `/fork` 与 `/fork <name>` 都走 `show_session_checkout_picker(ManagedWorktreeMode::Fork, …)`，而不是旧的 `ForkCurrentSession` AppEvent。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:250][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:816][E: codex-rs/tui/src/app_event.rs:427] `/worktree` 打开 managed worktree picker。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:253][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:254]

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
