---
id: command.tools-integrations
title: 工具与集成命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible]
related: [subsys.config-auth.skills, subsys.mcp.client, subsys.config-auth.plugins, subsys.mcp.connectors, tool.mcp-namespace-tools]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 工具与集成 slash commands 是 `SlashCommand` enum 中打开 skills、MCP、apps、plugins 和 file mention surface 的 TUI built-in command 子集。

## 能回答的问题

- `/skills`、`/mcp`、`/apps`、`/plugins`、`/mention` 的 popup 描述是什么?
- 哪些工具与集成命令支持 inline args?
- 哪些工具与集成命令在任务运行中仍可用?
- `/mention` 为什么在 side conversation 中仍可用?

## Catalog

| 命令名 | enum variant | 类型 | inline args | during task | side conversation | 默认/门控 | 含义与为什么 | 源 |
|---|---|---|---:|---:|---:|---|---|---|
| `/skills` | `Skills` | built-in slash command | 否 | 是 | 否 | 默认可见 | 使用 skills 改善 Codex 执行特定任务的方式；`available_during_task()` 对 `Skills` 返回 true。[E: codex-rs/tui/src/slash_command.rs:89][E: codex-rs/tui/src/slash_command.rs:184] | `codex-rs/tui/src/slash_command.rs:25` |
| `/mcp` | `Mcp` | built-in slash command | 是 | 是 | 否 | 默认可见 | 列出 configured MCP tools，`/mcp verbose` 可展示详情；`supports_inline_args()` 允许该 verbose 参数。[E: codex-rs/tui/src/slash_command.rs:118][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:189] | `codex-rs/tui/src/slash_command.rs:46` |
| `/apps` | `Apps` | built-in slash command | 否 | 是 | 否 | 默认可见 | 管理 apps；`available_during_task()` 对 `Apps` 返回 true。[E: codex-rs/tui/src/slash_command.rs:119][E: codex-rs/tui/src/slash_command.rs:190] | `codex-rs/tui/src/slash_command.rs:47` |
| `/plugins` | `Plugins` | built-in slash command | 否 | 是 | 否 | 默认可见 | 浏览 plugins；`available_during_task()` 对 `Plugins` 返回 true。[E: codex-rs/tui/src/slash_command.rs:120][E: codex-rs/tui/src/slash_command.rs:191] | `codex-rs/tui/src/slash_command.rs:48` |
| `/mention` | `Mention` | built-in slash command | 否 | 是 | 是 | 默认可见 | 插入 file mention；`available_in_side_conversation()` 明确允许 `Mention`，因此 side conversation 可继续引用文件。[E: codex-rs/tui/src/slash_command.rs:88][E: codex-rs/tui/src/slash_command.rs:183][E: codex-rs/tui/src/slash_command.rs:152] | `codex-rs/tui/src/slash_command.rs:40` |

## 共性机制

`available_during_task()` 对 `Mention`、`Skills`、`Mcp`、`Apps` 和 `Plugins` 返回 true。[E: codex-rs/tui/src/slash_command.rs:183][E: codex-rs/tui/src/slash_command.rs:184][E: codex-rs/tui/src/slash_command.rs:189][E: codex-rs/tui/src/slash_command.rs:190][E: codex-rs/tui/src/slash_command.rs:191] 只有 `Mention` 被允许留在 side conversation 中，因为 side conversation 白名单只包含 `Copy`、`Diff`、`Mention` 和 `Status`。[E: codex-rs/tui/src/slash_command.rs:152]

`supports_inline_args()` 的白名单列出 `Review`、`Rename`、`Plan`、`Fast`、`Mcp`、`Side`、`Resume` 和 `SandboxReadRoot`；本组只有 `Mcp` 出现在该白名单中。[E: codex-rs/tui/src/slash_command.rs:137][E: codex-rs/tui/src/slash_command.rs:138][E: codex-rs/tui/src/slash_command.rs:139][E: codex-rs/tui/src/slash_command.rs:140][E: codex-rs/tui/src/slash_command.rs:141][E: codex-rs/tui/src/slash_command.rs:142][E: codex-rs/tui/src/slash_command.rs:143][E: codex-rs/tui/src/slash_command.rs:144]

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [Skills 系统](../../subsystems/config-auth/skills.md) — 解释 `/skills` 的加载与注入对象。
- [MCP client](../../subsystems/mcp/client.md) — 解释 `/mcp` 面向的 external MCP server 集成。
- [Plugins 系统](../../subsystems/config-auth/plugins.md) — 解释 `/plugins` 的 manifest 与 marketplace。
- [MCP namespace 工具](../tools/mcp-namespace-tools.md) — 解释 MCP tools 如何进入 model-visible tool registry。
