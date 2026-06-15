---
id: command.realtime-debug
title: 实时与调试命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible]
related: [subsys.core.realtime-conversation, spine.trace-subagent, tool.spawn-agent-v2, config.ui-tui, config.agents-memory]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 实时与调试 slash commands 是 `SlashCommand` enum 中负责 realtime voice、side conversation、agent thread switching、approval test 和 memory debug hooks 的 TUI built-in command 子集。

## 能回答的问题

- `/realtime`、`/side`、`/agent`、`/subagents` 的 enum variant 和可用性是什么?
- 哪些 realtime/debug 命令支持 inline args?
- `/debug-m-drop` 和 `/debug-m-update` 为什么标成 `DO NOT USE`?
- `/test-approval` 为什么 release build 中不可见?

## Catalog

| 命令名 | enum variant | 类型 | inline args | during task | active side conversation | 默认/门控 | 含义与为什么 | 源 |
|---|---|---|---:|---:|---:|---|---|---|
| `/agent` | `Agent` | built-in slash command | 否 | 是 | 否 | 默认可见 | 切换 active agent thread；`description()` 把 `Agent` 和 `MultiAgents` 合并为同一说明，任务运行中可用。[E: codex-rs/tui/src/slash_command.rs:108][E: codex-rs/tui/src/slash_command.rs:201] | `codex-rs/tui/src/slash_command.rs:35` |
| `/side` | `Side` | built-in slash command | 是 | 是 | 否 | 默认可见 | 在 ephemeral fork 中开始 side conversation；`supports_inline_args()` 允许直接把 side prompt 放在命令后。[E: codex-rs/tui/src/slash_command.rs:109][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:195] | `codex-rs/tui/src/slash_command.rs:36` |
| `/realtime` | `Realtime` | built-in slash command | 否 | 是 | 否 | 默认可见 | 切换 experimental realtime voice mode；`available_during_task()` 对 `Realtime` 返回 true。[E: codex-rs/tui/src/slash_command.rs:104][E: codex-rs/tui/src/slash_command.rs:198] | `codex-rs/tui/src/slash_command.rs:59` |
| `/test-approval` | `TestApproval` | built-in slash command | 否 | 是 | 否 | `debug_assertions` cfg 为 true 时可见 | 触发 test approval request；`is_visible()` 把它和 `Rollout` 一起限制为 `cfg!(debug_assertions)`。[E: codex-rs/tui/src/slash_command.rs:123][E: codex-rs/tui/src/slash_command.rs:197][E: codex-rs/tui/src/slash_command.rs:212] | `codex-rs/tui/src/slash_command.rs:61` |
| `/subagents` | `MultiAgents` | built-in slash command | 否 | 是 | 否 | 默认可见 | `MultiAgents` 通过 `strum(serialize = "subagents")` 暴露 `/subagents`，description 与 `/agent` 相同，用于切换 active agent thread。[E: codex-rs/tui/src/slash_command.rs:62][E: codex-rs/tui/src/slash_command.rs:108][E: codex-rs/tui/src/slash_command.rs:201] | `codex-rs/tui/src/slash_command.rs:63` |
| `/debug-m-drop` | `MemoryDrop` | built-in slash command | 否 | 否 | 否 | 默认可见 | memory debugging command；description 明确为 `DO NOT USE`，且 `available_during_task()` 的 false arm 覆盖 `MemoryDrop`。[E: codex-rs/tui/src/slash_command.rs:65][E: codex-rs/tui/src/slash_command.rs:97][E: codex-rs/tui/src/slash_command.rs:178][E: codex-rs/tui/src/slash_command.rs:179] | `codex-rs/tui/src/slash_command.rs:66` |
| `/debug-m-update` | `MemoryUpdate` | built-in slash command | 否 | 否 | 否 | 默认可见 | memory debugging command；description 明确为 `DO NOT USE`，且任务运行中不可触发。[E: codex-rs/tui/src/slash_command.rs:67][E: codex-rs/tui/src/slash_command.rs:98][E: codex-rs/tui/src/slash_command.rs:179] | `codex-rs/tui/src/slash_command.rs:68` |

## 共性机制

`supports_inline_args()` 的白名单列出 `Review`、`Rename`、`Plan`、`Fast`、`Mcp`、`Side`、`Resume` 和 `SandboxReadRoot`；本节点只有 `Side` 出现在该白名单中。[E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:144]

`available_in_side_conversation()` 只允许 `Copy`、`Diff`、`Mention` 和 `Status` 留在 active side conversation 中，因此本节点所有命令在 active side conversation 中都不可用。[E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:152]

`MemoryDrop` 和 `MemoryUpdate` 在源码注释下归为 debugging commands，description 都为 `DO NOT USE`，并且 `available_during_task()` 的 false arm 覆盖这两个 variant；`TestApproval` 同样是测试/调试 surface，但它在 `cfg!(debug_assertions)` 为 true 时可见且可在任务运行中触发。[E: codex-rs/tui/src/slash_command.rs:64][E: codex-rs/tui/src/slash_command.rs:97][E: codex-rs/tui/src/slash_command.rs:98][E: codex-rs/tui/src/slash_command.rs:178][E: codex-rs/tui/src/slash_command.rs:179][E: codex-rs/tui/src/slash_command.rs:197][E: codex-rs/tui/src/slash_command.rs:212]

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [Realtime 对话状态机](../../subsystems/core/realtime-conversation.md) — 解释 `/realtime` 背后的 realtime conversation。
- [trace: subagent](../../spine/trace-subagent.md) — 解释 `/agent` 和 `/subagents` 面向的 agent thread surface。
- [agents 与 memory 设置](../config/agents-memory.md) — 覆盖 agent 和 memory debug 命令涉及的配置域。
