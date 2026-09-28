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
updated: 1cc7e23612
---

> 工具与集成 slash commands 是 `SlashCommand` enum（当前 **62** 个变体）中打开 skills、Claude Code import、hooks、MCP、apps、plugins 和 file mention surface 的 TUI built-in command 子集。[E: codex-rs/tui/src/slash_command.rs:12][E: codex-rs/tui/src/slash_command.rs:26]

## 能回答的问题

- `/skills`、`/import`、`/hooks`、`/mcp`、`/apps`、`/plugins`、`/mention` 当前是否存在?
- 哪些工具与集成命令支持 inline args?
- 哪些工具与集成命令可在 task 运行中使用?
- 为什么 `/mention` 可在 active side conversation 中使用?

## Catalog

`SlashCommand` uses `#[strum(serialize_all = "kebab-case")]`; `command()` returns the strum conversion, and `built_in_slash_commands()` iterates all variants, filters with `is_visible()`, and returns command-string/variant pairs.[E: codex-rs/tui/src/slash_command.rs:11][E: codex-rs/tui/src/slash_command.rs:161][E: codex-rs/tui/src/slash_command.rs:316][E: codex-rs/tui/src/slash_command.rs:318]

`supports_inline_args()` is a positive whitelist, so only listed variants support inline args; `available_in_side_conversation()` is also a positive whitelist for active side conversations。[E: codex-rs/tui/src/slash_command.rs:166][E: codex-rs/tui/src/slash_command.rs:193]

表格的 `is_visible gate` 只覆盖 `SlashCommand::is_visible()` 和 `built_in_slash_commands()`；composer input 与 command popup 还会通过 `builtins_for_input()`、`CommandPopup::new()` 和 empty-filter alias filtering 追加过滤。[E: codex-rs/tui/src/bottom_pane/slash_commands.rs:71][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:72][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:77][E: codex-rs/tui/src/bottom_pane/command_popup.rs:73][E: codex-rs/tui/src/bottom_pane/command_popup.rs:78][E: codex-rs/tui/src/bottom_pane/command_popup.rs:81]

| 命令名 | enum variant | description | inline args | available_during_task | side conversation | is_visible gate | 定义证据 |
|---|---|---|---|---|---|---|---|
| `/skills` | `Skills` | use skills to improve how Codex performs specific tasks | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:272] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:26][E: codex-rs/tui/src/slash_command.rs:113] |
| `/import` | `Import` | import setup, this project, and recent chats from Claude Code | 否 | 否 [E: codex-rs/tui/src/slash_command.rs:256] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:27][E: codex-rs/tui/src/slash_command.rs:114] |
| `/hooks` | `Hooks` | view and manage lifecycle hooks | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:273] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:28][E: codex-rs/tui/src/slash_command.rs:115] |
| `/mcp` | `Mcp` | list configured MCP tools; use /mcp verbose for details | 是 [E: codex-rs/tui/src/slash_command.rs:179] | 是 [E: codex-rs/tui/src/slash_command.rs:285] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:66][E: codex-rs/tui/src/slash_command.rs:150] |
| `/apps` | `Apps` | manage apps | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:286] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:67][E: codex-rs/tui/src/slash_command.rs:151] |
| `/plugins` | `Plugins` | browse plugins | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:287] | 否 | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:68][E: codex-rs/tui/src/slash_command.rs:152] |
| `/mention` | `Mention` | mention a file | 否 | 是 [E: codex-rs/tui/src/slash_command.rs:271] | 是 [E: codex-rs/tui/src/slash_command.rs:201] | `is_visible` 默认 true [E: codex-rs/tui/src/slash_command.rs:310] | [E: codex-rs/tui/src/slash_command.rs:52][E: codex-rs/tui/src/slash_command.rs:112] |

## MCP inventory 状态

`/mcp` 的 inventory surface 现在区分 `Unknown` 与 `Unsupported`：app-server `McpAuthStatus::Unknown` 会原样映射到 TUI auth status，并显示 `Auth: Unknown`。[E: codex-rs/tui/src/history_cell/mcp.rs:43][E: codex-rs/tui/src/history_cell/mcp.rs:707][E: codex-rs/tui/src/history_cell/mcp.rs:715] 这只是 auth-state 显示扩展；本轮 app-server protocol 新增的 MCP `read_only_hint` 没有在生产 TUI renderer 中被消费，不应写成 `/mcp` 或 tool-call cell 已显示 read-only 提示。[I]

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
