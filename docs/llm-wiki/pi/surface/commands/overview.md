---
id: surface.slash-commands.overview
title: slash 命令(24 内置)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/docs/usage.md
  - packages/coding-agent/docs/slash-commands.md
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/llama/index.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/modes/interactive/bug-report.ts
symbols:
  - SlashCommandInfo
  - BuiltinSlashCommand
  - BUILTIN_SLASH_COMMANDS
related:
  - ref.coding-agent.slash-commands
  - surface.skills.system
  - surface.prompt-templates.system
  - surface.providers.llama-cpp
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> slash 命令是 pi-coding-agent 在交互输入里用 `/` 暴露的命令面:内置命令来自 `BUILTIN_SLASH_COMMANDS` 的 **24** 项,动态命令来自 extension、prompt template 和 skill。`/mcp` 由 replaceable 的内置 `mcp` 扩展注册,不计入这 24 项。

## 能回答的问题

- pi 内置 slash command 的权威清单在哪里,当前有哪些命令?
- `/` 自动补全为什么同时出现内置命令、extension 命令、prompt template 和 `/skill:name`?
- `SlashCommandInfo` 描述的是哪类命令,为什么它不覆盖内置命令?
- 用户输入 `/model`、`/reload`、`/mcp`、`/skill:name` 或 `/template` 时分别走哪条路径?
- extension 命令名撞上内置命令时 autocomplete 怎样处理?
- `/mcp` 和 `/llama` 是否属于 `BUILTIN_SLASH_COMMANDS`?

## 公开入口

用户文档把 slash 入口写成:在 editor 输入 `/` 搜索当前 session 可用命令;同一段列出最常用的 `/model`、`/thinking`、`/login`、`/logout`、`/settings`,并指向完整 Slash Commands 参考 [E: packages/coding-agent/docs/usage.md:46] [E: packages/coding-agent/docs/usage.md:48] [E: packages/coding-agent/docs/usage.md:53]。`docs/slash-commands.md` 说明 extension、prompt template 和 skill 可以往同一菜单加命令 [E: packages/coding-agent/docs/slash-commands.md:3] [E: packages/coding-agent/docs/slash-commands.md:5]。

interactive mode 的 autocomplete provider 先把 `BUILTIN_SLASH_COMMANDS` 映射成 `SlashCommand`,再追加 prompt template、extension command 和 skill command list [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:714] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:716] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:776] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:784] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:808]。

`enableSkillCommands` 是 `/skill:name` 命令的开关,settings schema 注释写明默认 true 且用途是 register skills as `/skill:name` commands;interactive autocomplete 只有在 `settingsManager.getEnableSkillCommands()` 为真时才构造 skill command list [E: packages/coding-agent/src/core/settings-manager.ts:164] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [E: packages/coding-agent/src/core/settings-manager.ts:1264] [E: packages/coding-agent/src/core/settings-manager.ts:1265]。这个开关不控制 `BUILTIN_SLASH_COMMANDS`,所以 `/settings`、`/model`、`/quit` 等内置命令仍属于交互 UI 自身的命令面 [I]。

## 内置命令 ground truth

内置命令的权威源码是 `packages/coding-agent/src/core/slash-commands.ts` 中的 `BUILTIN_SLASH_COMMANDS`;当前数组从 `settings` 到 `quit` 共 **24** 项(含 `/bug` 与 `/tree`)。逐项 handler、参数形态和 runtime 行为由 [ref.coding-agent.slash-commands](../../reference/slash-commands.md) 覆盖 [E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/core/slash-commands.ts:20] [E: packages/coding-agent/src/core/slash-commands.ts:22] [E: packages/coding-agent/src/core/slash-commands.ts:28] [E: packages/coding-agent/src/core/slash-commands.ts:43]。

| 命令 | 源码描述 | 证据 |
| --- | --- | --- |
| `/settings` | Open settings menu | [E: packages/coding-agent/src/core/slash-commands.ts:20] |
| `/model` | Select model (opens selector UI) | [E: packages/coding-agent/src/core/slash-commands.ts:21] |
| `/tree` | Navigate session tree (switch branches) | [E: packages/coding-agent/src/core/slash-commands.ts:22] |
| `/thinking` | Set thinking level | [E: packages/coding-agent/src/core/slash-commands.ts:23] |
| `/scoped-models` | Enable/disable models for Ctrl+P cycling | [E: packages/coding-agent/src/core/slash-commands.ts:24] |
| `/export` | Export session (HTML default, or specify path: .html/.jsonl) | [E: packages/coding-agent/src/core/slash-commands.ts:25] |
| `/import` | Import and resume a session from a JSONL file | [E: packages/coding-agent/src/core/slash-commands.ts:26] |
| `/share` | Share session as a secret GitHub gist | [E: packages/coding-agent/src/core/slash-commands.ts:27] |
| `/bug` | Report a bug to the Pi developers | [E: packages/coding-agent/src/core/slash-commands.ts:28] |
| `/copy` | Copy last agent message to clipboard | [E: packages/coding-agent/src/core/slash-commands.ts:29] |
| `/name` | Set session display name | [E: packages/coding-agent/src/core/slash-commands.ts:30] |
| `/session` | Show session info and stats | [E: packages/coding-agent/src/core/slash-commands.ts:31] |
| `/changelog` | Show changelog entries | [E: packages/coding-agent/src/core/slash-commands.ts:32] |
| `/hotkeys` | Show all keyboard shortcuts | [E: packages/coding-agent/src/core/slash-commands.ts:33] |
| `/fork` | Create a new fork from a previous user message | [E: packages/coding-agent/src/core/slash-commands.ts:34] |
| `/clone` | Duplicate the current session at the current position | [E: packages/coding-agent/src/core/slash-commands.ts:35] |
| `/trust` | Save project trust decision for future sessions | [E: packages/coding-agent/src/core/slash-commands.ts:36] |
| `/login` | Configure provider authentication | [E: packages/coding-agent/src/core/slash-commands.ts:37] |
| `/logout` | Remove provider authentication | [E: packages/coding-agent/src/core/slash-commands.ts:38] |
| `/new` | Start a new session | [E: packages/coding-agent/src/core/slash-commands.ts:39] |
| `/compact` | Manually compact the session context | [E: packages/coding-agent/src/core/slash-commands.ts:40] |
| `/resume` | Resume a different session | [E: packages/coding-agent/src/core/slash-commands.ts:41] |
| `/reload` | Reload keybindings, extensions, skills, prompts, themes, and context files | [E: packages/coding-agent/src/core/slash-commands.ts:42] |
| `/quit` | `Quit ${APP_NAME}` | [E: packages/coding-agent/src/core/slash-commands.ts:43] |

用户文档 `docs/slash-commands.md` 按主题重排这张表,并额外列出 `/llama`;`/bug` 现在也在用户表的 Export and share 段 [E: packages/coding-agent/docs/slash-commands.md:17] [E: packages/coding-agent/docs/slash-commands.md:40]。`/llama` 是用户文档行,不是 `BUILTIN_SLASH_COMMANDS` 成员 [I]。`/reload` 的源码描述与用户文档对齐:reload keybindings、extensions、skills、templates/prompts、themes 和 context files [E: packages/coding-agent/docs/slash-commands.md:49] [E: packages/coding-agent/src/core/slash-commands.ts:42]。

## `SlashCommandInfo` 的范围

`SlashCommandInfo` 有 `name`、可选 `description`、`source` 和 `sourceInfo`;其中 `source` 只能是 `"extension"`、`"prompt"` 或 `"skill"` [E: packages/coding-agent/src/core/slash-commands.ts:4] [E: packages/coding-agent/src/core/slash-commands.ts:6] [E: packages/coding-agent/src/core/slash-commands.ts:9] [E: packages/coding-agent/src/core/slash-commands.ts:10]。因此 `SlashCommandInfo` 是动态命令的元数据类型,不是内置命令的类型;内置命令使用单独的 `BuiltinSlashCommand` 和 `BUILTIN_SLASH_COMMANDS` [E: packages/coding-agent/src/core/slash-commands.ts:13] [E: packages/coding-agent/src/core/slash-commands.ts:19]。

AgentSession 绑定给 extension core 的 `getCommands()` 返回三段动态命令:extension runner registered commands、当前 prompt templates、resource loader skills;skill 的 name 在这里被加上 `skill:` 前缀 [E: packages/coding-agent/src/core/agent-session.ts:3314] [E: packages/coding-agent/src/core/agent-session.ts:3316] [E: packages/coding-agent/src/core/agent-session.ts:3322] [E: packages/coding-agent/src/core/agent-session.ts:3329] [E: packages/coding-agent/src/core/agent-session.ts:3330] [E: packages/coding-agent/src/core/agent-session.ts:3336]。这个 API 不返回内置 `/settings`、`/model` 等命令 [I]。

## `/mcp` 与 `/llama`(扩展贡献,不计入 24)

`/mcp` 由 replaceable 内置扩展 `mcp` 注册:`pi.registerCommand("mcp", ...)` 的 description 是 Manage MCP servers: sign in, reconnect, enable or disable, and change exposure [E: packages/coding-agent/src/extensions/index.ts:13] [E: packages/coding-agent/src/extensions/mcp/index.ts:1141] [E: packages/coding-agent/src/extensions/mcp/index.ts:1142]。无参数时 TUI 打开 manager;否则 `login`/`logout`/`reconnect` [E: packages/coding-agent/src/extensions/mcp/index.ts:274] [E: packages/coding-agent/src/extensions/mcp/index.ts:1167]。它不进入 24 项 `BUILTIN_SLASH_COMMANDS` [I]。

`/llama` 由 hidden built-in `llama.cpp` 扩展 `registerCommand("llama", ...)` 提供,仅在 TUI 中管理 llama.cpp router 模型 [E: packages/coding-agent/src/extensions/index.ts:8] [E: packages/coding-agent/src/extensions/llama/index.ts:183] [E: packages/coding-agent/src/extensions/llama/index.ts:186]。完整行为见 [surface.providers.llama-cpp](../providers/llama-cpp.md)。

## 输入分发

interactive mode 对内置命令走显式 `if` 分支,例如 `/settings` 调 `showSettingsSelector()`,`/scoped-models` 调 `showModelsSelector()`,`/model` 调 `handleModelCommand()`,`/thinking` 调 `handleThinkingCommand()`,`/export` 调 `handleExportCommand()`,`/bug` 与 `/bug <hint>` 调 `handleBugCommand(hint)`,`/reload` 调 `handleReloadCommand()`,`/resume` 调 `showSessionSelector()`,`/quit` 调 `shutdown()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3152] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3158] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3163] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3168] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3174] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3195] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3198] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3268] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3288] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3293]。`handleBugCommand` 把当前 session/UI 交给 `reportBug()`;crash resume 文案也会提示 `/bug` 自动附带 crash details [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2152] [E: packages/coding-agent/src/modes/interactive/bug-report.ts:50]。

未被内置分支截获的普通输入会由 interactive loop 从 `getUserInput()` 取得后调用 `session.prompt(...)`;streaming 时 submit handler 直接以 `streamingBehavior: "steer"` 调 `session.prompt(...)` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1241] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1243] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3334]。`AgentSession.prompt()` 对以 `/` 开头的文本先尝试执行 extension command,随后发出 input event,再展开 `/skill:name` 和 prompt template [E: packages/coding-agent/src/core/agent-session.ts:1921] [E: packages/coding-agent/src/core/agent-session.ts:1930] [E: packages/coding-agent/src/core/agent-session.ts:1931] [E: packages/coding-agent/src/core/agent-session.ts:1946] [E: packages/coding-agent/src/core/agent-session.ts:1961] [E: packages/coding-agent/src/core/agent-session.ts:1962]。因此 `/mcp`、`/llama` 以及其它 extension command 不走内置 `if` 表,而是经 `session.prompt()` 的 extension command 路径执行 [I]。

在 streaming/queue 场景中,`steer()` 和 `followUp()` 会展开 skill command 与 prompt template,但会拒绝 extension command,因为 extension command 不能排队执行 [E: packages/coding-agent/src/core/agent-session.ts:2126] [E: packages/coding-agent/src/core/agent-session.ts:2132] [E: packages/coding-agent/src/core/agent-session.ts:2133] [E: packages/coding-agent/src/core/agent-session.ts:2144] [E: packages/coding-agent/src/core/agent-session.ts:2147]。

## 冲突与非公开边界

autocomplete 丢掉 `cmd.name` 落在 builtin 名集合里的 extension command(`filter((cmd) => !builtinCommandNames.has(cmd.name))`),列表项只用 `cmd.invocationName` 作为 `name` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:783] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:784] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:786] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:788]。alternate-name 文案只出现在 `getBuiltInCommandConflictDiagnostics()`:当 `invocationName === name` 时提示 Skipping in autocomplete,否则提示 Available as `/${invocationName}` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:699] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:700] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:703] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:707] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:709]。

interactive submit handler 还存在 `/debug`、`/arminsayshi` 和 `/dementedelves` 分支,但它们不在 `BUILTIN_SLASH_COMMANDS` 也不在用户文档 Slash Commands 表内;按 ground-truth 约定,本节点不把这些分支列为公开内置 slash command [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3273] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3278] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3283] [E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/docs/slash-commands.md:3] [U]。

## 跨包关系

[ref.coding-agent.slash-commands](../../reference/slash-commands.md) 逐项覆盖内置 slash command catalog,包括命令名、参数形态、handler 和用户文档描述;本 surface 节点只解释 slash command 作为用户可见入口的组成和分发边界 [I]。

[surface.skills.system](../skills/system.md) 覆盖 skill 如何被发现、如何进入系统提示以及 `enableSkillCommands` 怎样控制 `/skill:name`;本节点只记录 `/skill:name` 在 slash command surface 中的注册和展开位置 [E: packages/coding-agent/src/core/settings-manager.ts:164] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:796] [I]。

[surface.prompt-templates.system](../prompts/system.md) 覆盖 prompt template 的文件加载、参数替换和模板语法;本节点只记录 prompt template 以 `/templateName` 进入 autocomplete,并在 `AgentSession.prompt()` 内被 `expandPromptTemplate()` 展开 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:776] [E: packages/coding-agent/src/core/agent-session.ts:1962] [I]。

## Sources

- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/docs/usage.md
- packages/coding-agent/docs/slash-commands.md
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/llama/index.ts
- packages/coding-agent/src/extensions/mcp/index.ts
- packages/coding-agent/src/modes/interactive/bug-report.ts

## 相关

- [ref.coding-agent.slash-commands](../../reference/slash-commands.md): 内置 slash command 逐项 catalog(24)以及 `/mcp`/`/llama` 扩展额外项。
- [surface.skills.system](../skills/system.md): skills 加载、系统提示呈现与 `/skill:name` 命令注册。
- [surface.prompt-templates.system](../prompts/system.md): prompt template 加载、参数替换与 `/templateName` 展开。
- [surface.providers.llama-cpp](../providers/llama-cpp.md): hidden built-in extension 提供的 `/llama` 动态命令。
