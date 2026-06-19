---
id: command.tools-integrations
title: 工具与集成命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs]
symbols: [SlashCommand, SlashCommand::description, SlashCommand::supports_inline_args, SlashCommand::available_during_task, SlashCommand::available_in_side_conversation, SlashCommand::is_visible, built_in_slash_commands]
related: [surface.cli.external-agent-import, subsys.config-auth.skills, subsys.mcp.client, subsys.config-auth.plugins, subsys.mcp.connectors, tool.mcp-namespace-tools]
evidence: explicit
status: verified
updated: 5670360009
---

> 工具与集成 slash commands 是 `SlashCommand` enum 中打开 skills、Claude Code import、hooks、MCP、apps、plugins 和 file mention surface 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:7][E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:81]

## 能回答的问题

- `/skills`、`/import`、`/hooks`、`/mcp`、`/apps`、`/plugins`、`/mention` 当前是否存在?
- 哪些工具与集成命令支持 inline args?
- 哪些工具与集成命令可在 task 运行中使用?
- 为什么 `/mention` 可在 active side conversation 中使用?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:146][E: codex-rs/tui/src/slash_command.rs:148][E: codex-rs/tui/src/slash_command.rs:149][E: codex-rs/tui/src/slash_command.rs:257][E: codex-rs/tui/src/slash_command.rs:258][E: codex-rs/tui/src/slash_command.rs:259][E: codex-rs/tui/src/slash_command.rs:260][E: codex-rs/tui/src/slash_command.rs:261][E: codex-rs/tui/src/slash_command.rs:262]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:152][E: codex-rs/tui/src/slash_command.rs:153][E: codex-rs/tui/src/slash_command.rs:154][E: codex-rs/tui/src/slash_command.rs:156][E: codex-rs/tui/src/slash_command.rs:169][E: codex-rs/tui/src/slash_command.rs:173][E: codex-rs/tui/src/slash_command.rs:174][E: codex-rs/tui/src/slash_command.rs:175][E: codex-rs/tui/src/slash_command.rs:177][E: codex-rs/tui/src/slash_command.rs:184]

| 命令名 | enum variant | description | inline args | during task | side conversation | visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/skills` | `Skills` | use skills to improve how Codex performs specific tasks | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:218] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:28][E: codex-rs/tui/src/slash_command.rs:102] |
| `/import` | `Import` | import setup, this project, and recent chats from Claude Code | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:206] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:29][E: codex-rs/tui/src/slash_command.rs:103] |
| `/hooks` | `Hooks` | view and manage lifecycle hooks | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:219] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:30][E: codex-rs/tui/src/slash_command.rs:104] |
| `/mcp` | `Mcp` | list configured MCP tools; use /mcp verbose for details | 是 [E: codex-rs/tui/src/slash_command.rs:162] | 是 [E: codex-rs/tui/src/slash_command.rs:227] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:58][E: codex-rs/tui/src/slash_command.rs:137] |
| `/apps` | `Apps` | manage apps | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:228] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:59][E: codex-rs/tui/src/slash_command.rs:138] |
| `/plugins` | `Plugins` | browse plugins | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:229] | 否 | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:60][E: codex-rs/tui/src/slash_command.rs:139] |
| `/mention` | `Mention` | mention a file | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:217] | 是 [E: codex-rs/tui/src/slash_command.rs:180] | 默认可见 [E: codex-rs/tui/src/slash_command.rs:252] | [E: codex-rs/tui/src/slash_command.rs:49][E: codex-rs/tui/src/slash_command.rs:101] |

## Sources

- `codex-rs/tui/src/slash_command.rs`

## 相关

- [subsys.config-auth.skills](../../subsystems/config-auth/skills.md)
- [subsys.mcp.client](../../subsystems/mcp/client.md)
- [subsys.config-auth.plugins](../../subsystems/config-auth/plugins.md)
- [subsys.mcp.connectors](../../subsystems/mcp/connectors.md)
- [tool.mcp-namespace-tools](../tools/mcp-namespace-tools.md)
- [从外部 agent 导入](../cli/external-agent-import.md)
