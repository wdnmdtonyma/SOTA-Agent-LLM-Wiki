---
id: command.tools-integrations
title: 工具与集成命令
kind: command
tier: T1
source: [codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/tui/src/bottom_pane/command_popup.rs, codex-rs/tui/src/history_cell/mcp.rs]
symbols: [SlashCommand::Skills, SlashCommand::Import, SlashCommand::Hooks, SlashCommand::Mcp, SlashCommand::Apps, SlashCommand::Plugins, SlashCommand::Mention]
related: [surface.cli.external-agent-import, subsys.config-auth.skills, subsys.mcp.client, subsys.config-auth.plugins, subsys.mcp.connectors, tool.mcp-namespace-tools]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> 工具与集成 slash commands 是 `SlashCommand` enum 中打开 skills、Claude Code import、hooks、MCP、apps、plugins 和 file mention surface 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:26]

## 能回答的问题

- `/skills`、`/import`、`/hooks`、`/mcp`、`/apps`、`/plugins`、`/mention` 当前是否存在?
- 哪些工具与集成命令支持 inline args?
- 哪些工具与集成命令可在 task 运行中使用?
- 为什么 `/mention` 可在 active side conversation 中使用?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:157][E: codex-rs/tui/src/slash_command.rs:269][E: codex-rs/tui/src/slash_command.rs:281]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations.[E: codex-rs/tui/src/slash_command.rs:162][E: codex-rs/tui/src/slash_command.rs:189]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:72][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:73][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:78][E: codex-rs/tui/src/bottom_pane/command_popup.rs:76][E: codex-rs/tui/src/bottom_pane/command_popup.rs:81][E: codex-rs/tui/src/bottom_pane/command_popup.rs:84]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/skills` | `Skills` | use skills to improve how Codex performs specific tasks | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:239] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:26][E: codex-rs/tui/src/slash_command.rs:110] |
| `/import` | `Import` | import setup, this project, and recent chats from Claude Code | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:222] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:27][E: codex-rs/tui/src/slash_command.rs:111] |
| `/hooks` | `Hooks` | view and manage lifecycle hooks | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:240] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:28][E: codex-rs/tui/src/slash_command.rs:112] |
| `/mcp` | `Mcp` | list configured MCP tools; use /mcp verbose for details | 是 [E: codex-rs/tui/src/slash_command.rs:175] | 是 [E: codex-rs/tui/src/slash_command.rs:250] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:63][E: codex-rs/tui/src/slash_command.rs:146] |
| `/apps` | `Apps` | manage apps | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:251] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:64][E: codex-rs/tui/src/slash_command.rs:147] |
| `/plugins` | `Plugins` | browse plugins | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:252] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:65][E: codex-rs/tui/src/slash_command.rs:148] |
| `/mention` | `Mention` | mention a file | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:238] | 是 [E: codex-rs/tui/src/slash_command.rs:197] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:275] | [E: codex-rs/tui/src/slash_command.rs:51][E: codex-rs/tui/src/slash_command.rs:109] |

## MCP inventory 状态

`/mcp` 的 inventory surface 现在区分 `Unknown` 与 `Unsupported`：app-server `McpAuthStatus::Unknown` 会原样映射到 TUI auth status，并显示 `Auth: Unknown`。[E: codex-rs/tui/src/history_cell/mcp.rs:39][E: codex-rs/tui/src/history_cell/mcp.rs:609][E: codex-rs/tui/src/history_cell/mcp.rs:617][E: codex-rs/tui/src/history_cell/mcp.rs:618] 这只是 auth-state 显示扩展；本轮 app-server protocol 新增的 MCP `read_only_hint` 没有在生产 TUI renderer 中被消费，不应写成 `/mcp` 或 tool-call cell 已显示 read-only 提示。[I]

## Sources

- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/tui/src/bottom_pane/command_popup.rs`
- `codex-rs/tui/src/history_cell/mcp.rs`

## 相关

- [subsys.config-auth.skills](../../subsystems/config-auth/skills.md)
- [subsys.mcp.client](../../subsystems/mcp/client.md)
- [subsys.config-auth.plugins](../../subsystems/config-auth/plugins.md)
- [subsys.mcp.connectors](../../subsystems/mcp/connectors.md)
- [tool.mcp-namespace-tools](../tools/mcp-namespace-tools.md)
- [从外部 agent 导入](../cli/external-agent-import.md)
