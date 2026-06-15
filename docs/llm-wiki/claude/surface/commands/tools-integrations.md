---
id: cmd.tools-integrations
title: Tools and integrations command catalog
kind: command
tier: T1
source: [commands.ts, types/command.ts, commands/mcp/index.ts, commands/mcp/mcp.tsx, commands/mcp/addCommand.ts, commands/install-github-app/index.ts, commands/install-slack-app/index.ts, commands/ide/index.ts, commands/permissions/index.ts, commands/permissions/permissions.tsx, commands/hooks/index.ts, commands/hooks/hooks.tsx, commands/plugin/index.tsx, commands/reload-plugins/index.ts, commands/remote-env/index.ts, commands/skills/index.ts, commands/agents/index.ts]
symbols: [mcp, installGitHubApp, installSlackApp, ide, permissions, hooks, plugin, reloadPlugins, remoteEnv, skills, agents]
related: [subsys.command-system, subsys.mcp, subsys.permissions, subsys.hooks-feature, subsys.plugins, subsys.skills, group.commands]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Tools and integrations command catalog 覆盖 MCP、GitHub/Slack app、IDE、permissions、hooks、plugins、remote env、skills 和 agents 管理命令。

## 能回答的问题

- `/mcp` 支持哪些参数和 UI 分支？
- `/permissions` 和 `/hooks` 为什么都是 `local-jsx`？
- 哪些 integrations commands 有 auth/provider availability？
- `/plugin` 有哪些 aliases？
- `/reload-plugins` 与 `/plugin` 的职责差异是什么？

## 清单边界

本节点只覆盖 `cmd.tools-integrations` 分配的 11 个命令。`LocalJSXCommandModule` 带 `call` 字段，`LocalJSXCommand` 通过 `load()` 返回该 module [E: types/command.ts:141] [E: types/command.ts:151]，因此表中 `local-jsx` 命令通常对应一个配置 UI。表中 `未声明` 表示当前 command object 没有显式字段，属于局部读源结论 [I]。没有 `availability` 字段的命令在 availability filter 中直接通过 [E: commands.ts:418]。

## Catalog

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
|---|---|---|---|---|---|
| `/mcp` | 未声明 [I] | `local-jsx` [E: commands/mcp/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:287]; `immediate` [E: commands/mcp/index.ts:7] | `[enable|disable [server-name]]` [E: commands/mcp/index.ts:8] | 管理 MCP servers [E: commands/mcp/index.ts:6]。 |
| `/install-github-app` | 未声明 [I] | `local-jsx` [E: commands/install-github-app/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:285]; `availability: ['claude-ai', 'console']` [E: commands/install-github-app/index.ts:8] | 未声明 [I] | 为 repository 设置 Claude GitHub Actions [E: commands/install-github-app/index.ts:7]。 |
| `/install-slack-app` | 未声明 [I] | `local` [E: commands/install-slack-app/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:286]; `availability: ['claude-ai']` [E: commands/install-slack-app/index.ts:7] | 未声明 [I] | 安装 Claude Slack app [E: commands/install-slack-app/index.ts:6]。 |
| `/ide` | 未声明 [I] | `local-jsx` [E: commands/ide/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:282] | `[open]` [E: commands/ide/index.ts:7] | 管理 IDE integrations 并显示 status [E: commands/ide/index.ts:6]。 |
| `/permissions` | `allowed-tools` [E: commands/permissions/index.ts:6] | `local-jsx` [E: commands/permissions/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:331] | 未声明 [I] | 管理 allow 与 deny tool permission rules [E: commands/permissions/index.ts:7]。 |
| `/hooks` | 未声明 [I] | `local-jsx` [E: commands/hooks/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:334]; `immediate` [E: commands/hooks/index.ts:7] | 未声明 [I] | 查看 tool events 的 hook configurations [E: commands/hooks/index.ts:6]。 |
| `/plugin` | `plugins`, `marketplace` [E: commands/plugin/index.tsx:5] | `local-jsx` [E: commands/plugin/index.tsx:3] | `COMMANDS` builtin entry [E: commands.ts:293]; `immediate` [E: commands/plugin/index.tsx:7] | 未声明 [I] | 管理 Claude Code plugins [E: commands/plugin/index.tsx:6]。 |
| `/reload-plugins` | 未声明 [I] | `local` [E: commands/reload-plugins/index.ts:8] | `COMMANDS` builtin entry [E: commands.ts:296]; non-interactive 不支持 [E: commands/reload-plugins/index.ts:14] | 未声明 [I] | 激活当前 session 中 pending plugin changes [E: commands/reload-plugins/index.ts:10]。 |
| `/remote-env` | 未声明 [I] | `local-jsx` [E: commands/remote-env/index.ts:6] | `COMMANDS` builtin entry [E: commands.ts:292]; 需要 claude.ai subscriber 且 policy `allow_remote_sessions` [E: commands/remote-env/index.ts:10] | 未声明 [I] | 配置 teleport sessions 的 default remote environment [E: commands/remote-env/index.ts:8]。 |
| `/skills` | 未声明 [I] | `local-jsx` [E: commands/skills/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:300] | 未声明 [I] | 列出 available skills [E: commands/skills/index.ts:6]。 |
| `/agents` | 未声明 [I] | `local-jsx` [E: commands/agents/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:261] | 未声明 [I] | 管理 agent configurations [E: commands/agents/index.ts:6]。 |

## 复杂命令深挖

`/mcp` 的 slash command 入口是即时 `local-jsx` 管理面 [E: commands/mcp/index.ts:4] [E: commands/mcp/index.ts:7]。运行时先解析 args [E: commands/mcp/mcp.tsx:64] [E: commands/mcp/mcp.tsx:65]：`no-redirect` 返回 `MCPSettings` [E: commands/mcp/mcp.tsx:68] [E: commands/mcp/mcp.tsx:69]，`reconnect <server>` 返回 `MCPReconnect` [E: commands/mcp/mcp.tsx:71] [E: commands/mcp/mcp.tsx:72]，`enable|disable [server]` 返回 `MCPToggle` [E: commands/mcp/mcp.tsx:74] [E: commands/mcp/mcp.tsx:75]，默认渲染 `MCPSettings` [E: commands/mcp/mcp.tsx:83]。CLI 侧还有 `mcp add <name> <commandOrUrl> [args...]` 子命令 [E: commands/mcp/addCommand.ts:35]，支持 `--scope`、`--transport`、`--env`、`--header`、OAuth client fields 和 XAA [E: commands/mcp/addCommand.ts:49] [E: commands/mcp/addCommand.ts:54] [E: commands/mcp/addCommand.ts:58] [E: commands/mcp/addCommand.ts:62] [E: commands/mcp/addCommand.ts:65] [E: commands/mcp/addCommand.ts:67] [E: commands/mcp/addCommand.ts:71] [E: commands/mcp/addCommand.ts:77]。`mcp add` 可写入 SSE、HTTP 或 stdio server config [E: commands/mcp/addCommand.ts:174] [E: commands/mcp/addCommand.ts:220] [E: commands/mcp/addCommand.ts:267]。

`/permissions` 渲染 `PermissionRuleList`，退出回调是 `onDone`，retry denied commands 时会向 messages 追加 `createPermissionRetryMessage(commands)` [E: commands/permissions/permissions.tsx:6] [E: commands/permissions/permissions.tsx:7]。这说明 `/permissions` 不直接修改规则文本，而是进入 permission rules UI 并能把 denied command retry 写回 conversation [I]。

`/hooks` 调用时记录 analytics event [E: commands/hooks/hooks.tsx:7]，从 AppState 取 `toolPermissionContext` [E: commands/hooks/hooks.tsx:9]，用 `getTools(permissionContext).map(tool => tool.name)` 构造 tool name 列表 [E: commands/hooks/hooks.tsx:10]，最后渲染 `HooksConfigMenu` [E: commands/hooks/hooks.tsx:11]。这个 command 的 hook matcher 选项来自当前可用 tools [I]。

## Sources

- commands.ts
- types/command.ts
- commands/mcp/index.ts
- commands/mcp/mcp.tsx
- commands/mcp/addCommand.ts
- commands/install-github-app/index.ts
- commands/install-slack-app/index.ts
- commands/ide/index.ts
- commands/permissions/index.ts
- commands/permissions/permissions.tsx
- commands/hooks/index.ts
- commands/hooks/hooks.tsx
- commands/plugin/index.tsx
- commands/reload-plugins/index.ts
- commands/remote-env/index.ts
- commands/skills/index.ts
- commands/agents/index.ts

## 相关

- [命令系统机制](../../subsystems/command-system.md)
- [MCP](../../subsystems/mcp.md)
- [权限系统](../../subsystems/permissions.md)
- [Hooks feature](../../subsystems/hooks-feature.md)
- [Plugins](../../subsystems/plugins.md)
- [Skills](../../subsystems/skills.md)
