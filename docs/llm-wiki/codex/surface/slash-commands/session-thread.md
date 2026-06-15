---
id: command.session-thread
title: 会话与线程命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [spine.sq-eq-architecture, spine.process-lifecycle, subsys.core.session-lifecycle, subsys.core.rollout-persistence, cli.subcommands]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 会话与线程 slash commands 是 `SlashCommand` enum 中负责启动、恢复、fork、压缩、重命名、清屏、退出和定位 rollout 文件的 TUI built-in command 子集；本 catalog 的边界不纳入 `Agent`/`MultiAgents` 的 active agent thread 切换，也不纳入 `Side` 的 ephemeral fork side conversation 入口。[E: codex-rs/tui/src/slash_command.rs:108][E: codex-rs/tui/src/slash_command.rs:109]

## 能回答的问题

- `SlashCommand` 如何把 enum variant 映射成 `/new`、`/resume`、`/fork` 这类命令名?
- 会话与线程命令哪些支持 inline args?
- 会话与线程命令哪些不能在任务运行中触发?
- `/quit`、`/exit`、`/rollout`、`/clear` 在 popup 可见性和行为约束上有什么差异?

## Catalog

`SlashCommand` 使用 `#[strum(serialize_all = "kebab-case")]`，因此普通 variant 通过 kebab-case 生成 wire command string；`built_in_slash_commands()` 枚举 `SlashCommand::iter()` 后按 `is_visible()` 过滤，并返回 `(command string, SlashCommand)` 对。[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:220][E: codex-rs/tui/src/slash_command.rs:221][E: codex-rs/tui/src/slash_command.rs:222] 表格中的“默认可见”表示 command 没有命中 `is_visible()` 中 `SandboxReadRoot`、`Copy`、`Rollout` 或 `TestApproval` 的显式门控分支，并落入 `_ => true` 默认分支。[E: codex-rs/tui/src/slash_command.rs:210][E: codex-rs/tui/src/slash_command.rs:211][E: codex-rs/tui/src/slash_command.rs:212][E: codex-rs/tui/src/slash_command.rs:213]

| 命令名 | enum variant | 类型 | inline args | during task | side conversation | 默认/门控 | 含义与为什么 | 源 |
|---|---|---|---:|---:|---:|---|---|---|
| `/new` | `New` | built-in slash command | 否 | 否 | 否 | 默认可见 | 描述为 start a new chat during a conversation；`available_during_task()` 对 `New` 返回 false。[E: codex-rs/tui/src/slash_command.rs:76][E: codex-rs/tui/src/slash_command.rs:159] | `codex-rs/tui/src/slash_command.rs:28` |
| `/clear` | `Clear` | built-in slash command | 否 | 否 | 否 | 默认可见 | 描述为 clear the terminal and start a new chat；`available_during_task()` 对 `Clear` 返回 false。[E: codex-rs/tui/src/slash_command.rs:82][E: codex-rs/tui/src/slash_command.rs:176] | `codex-rs/tui/src/slash_command.rs:57` |
| `/resume` | `Resume` | built-in slash command | 是 | 否 | 否 | 默认可见 | 描述为 resume a saved chat；`supports_inline_args()` 把 `Resume` 列入可带参数命令，`available_during_task()` 对 `Resume` 返回 false。[E: codex-rs/tui/src/slash_command.rs:81][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:160] | `codex-rs/tui/src/slash_command.rs:29` |
| `/fork` | `Fork` | built-in slash command | 否 | 否 | 否 | 默认可见 | 描述为 fork the current chat；`available_during_task()` 对 `Fork` 返回 false。[E: codex-rs/tui/src/slash_command.rs:83][E: codex-rs/tui/src/slash_command.rs:161] | `codex-rs/tui/src/slash_command.rs:30` |
| `/compact` | `Compact` | built-in slash command | 否 | 否 | 否 | 默认可见 | 描述为 summarize conversation to prevent hitting the context limit；`available_during_task()` 对 `Compact` 返回 false。[E: codex-rs/tui/src/slash_command.rs:78][E: codex-rs/tui/src/slash_command.rs:163] | `codex-rs/tui/src/slash_command.rs:32` |
| `/rename` | `Rename` | built-in slash command | 是 | 是 | 否 | 默认可见 | 描述为 rename the current thread；`Rename` 支持 inline args，且 `available_during_task()` 返回 true。[E: codex-rs/tui/src/slash_command.rs:80][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:182] | `codex-rs/tui/src/slash_command.rs:27` |
| `/rollout` | `Rollout` | built-in slash command | 否 | 是 | 否 | `cfg!(debug_assertions)` 为 true 时可见 | 打印 rollout file path；`is_visible()` 对 `Rollout` 使用 `cfg!(debug_assertions)` 门控。[E: codex-rs/tui/src/slash_command.rs:122][E: codex-rs/tui/src/slash_command.rs:196][E: codex-rs/tui/src/slash_command.rs:212] | `codex-rs/tui/src/slash_command.rs:53` |
| `/quit` | `Quit` | built-in slash command | 否 | 是 | 否 | 默认可见 | 退出 Codex；`description()` 把 `Quit` 和 `Exit` 合并为同一说明，`available_during_task()` 对 `Quit` 返回 true。[E: codex-rs/tui/src/slash_command.rs:85][E: codex-rs/tui/src/slash_command.rs:193] | `codex-rs/tui/src/slash_command.rs:50` |
| `/exit` | `Exit` | built-in slash command | 否 | 是 | 否 | 默认可见 | 退出 Codex；`Exit` 是独立 enum variant，但 description 与 `Quit` 相同，`available_during_task()` 对 `Exit` 返回 true。[E: codex-rs/tui/src/slash_command.rs:85][E: codex-rs/tui/src/slash_command.rs:194] | `codex-rs/tui/src/slash_command.rs:51` |

## 共性机制

`SlashCommand` enum 的声明顺序就是 popup presentation order，源码明确禁止 alpha-sort，因为更常用的命令应排在前面。[E: codex-rs/tui/src/slash_command.rs:13][E: codex-rs/tui/src/slash_command.rs:14] `supports_inline_args()` 的白名单列出 `Review`、`Rename`、`Plan`、`Fast`、`Mcp`、`Side`、`Resume` 和 `SandboxReadRoot`；本节点命令里只有 `Rename` 与 `Resume` 出现在该白名单中。[E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:144]

`available_in_side_conversation()` 只允许 `Copy`、`Diff`、`Mention` 和 `Status` 留在 active side conversation 中；本节点所有会话与线程命令在 side conversation 中都不可用。[E: codex-rs/tui/src/slash_command.rs:152]

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [SQ/EQ 双队列架构](../../spine/sq-eq-architecture.md) — 解释 thread/turn 命令最终影响的会话消息循环。
- [进程生命周期](../../spine/process-lifecycle.md) — 解释 CLI/TUI 如何启动并进入 interactive command surface。
- [CLI 子命令 catalog](../cli/subcommands.md) — 覆盖 `codex resume` 和 `codex fork` 的非 slash 入口。
