---
id: surface.slash-commands.overview
title: slash 命令
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/docs/usage.md
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/settings-manager.ts
symbols:
  - SlashCommandInfo
  - builtin commands
related:
  - ref.coding-agent.slash-commands
  - surface.skills.system
  - surface.prompt-templates.system
evidence: explicit
status: verified
updated: 5a073885
---

> slash 命令是 pi-coding-agent 在交互输入里用 `/` 暴露的命令面:内置命令来自 `BUILTIN_SLASH_COMMANDS`,动态命令来自 extension、prompt template 和 skill。

## 能回答的问题

- pi 内置 slash command 的权威清单在哪里,当前有哪些命令?
- `/` 自动补全为什么同时出现内置命令、extension 命令、prompt template 和 `/skill:name`?
- `SlashCommandInfo` 描述的是哪类命令,为什么它不覆盖内置命令?
- 用户输入 `/model`、`/reload`、`/skill:name` 或 `/template` 时分别走哪条路径?
- extension 命令名撞上内置命令时 autocomplete 怎样处理?
- 当前 index 里的 slash command 数量和源码清单是否一致?

## 公开入口

用户文档把 slash command 的入口定义为在 editor 输入 `/` 打开命令补全;同一句说明 extension 可以注册自定义命令,skill 以 `/skill:name` 形式出现,prompt template 以 `/templatename` 形式展开 [E: packages/coding-agent/docs/usage.md:34]。interactive mode 的 autocomplete provider 先把 `BUILTIN_SLASH_COMMANDS` 映射成 `SlashCommand`,再追加 prompt template、extension command 和 skill command list [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:487] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:489] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:527] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:535] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:547] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:558]。

`enableSkillCommands` 是 `/skill:name` 命令的开关,settings schema 注释写明默认 true 且用途是注册 skills as `/skill:name` commands;interactive autocomplete 只有在 `settingsManager.getEnableSkillCommands()` 为真时才构造 skill command list [E: packages/coding-agent/src/core/settings-manager.ts:108] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:547] [E: packages/coding-agent/src/core/settings-manager.ts:1033] [E: packages/coding-agent/src/core/settings-manager.ts:1034]。这个开关不控制 `BUILTIN_SLASH_COMMANDS`,所以 `/settings`、`/model`、`/quit` 等内置命令仍属于交互 UI 自身的命令面 [I]。

## 内置命令 ground truth

内置命令的权威源码是 `packages/coding-agent/src/core/slash-commands.ts` 中的 `BUILTIN_SLASH_COMMANDS`;当前数组从 `settings` 到 `quit` 共 22 项 [E: packages/coding-agent/src/core/slash-commands.ts:18] [E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/core/slash-commands.ts:40]。`docs/llm-wiki/pi/index.json` 的 `group.slash-commands.instance_count` 仍写 21,与当前源码逐项计数不一致;本节点按源码的 22 项写,不改 index [U]。

| 命令 | 源码描述 | 证据 |
| --- | --- | --- |
| `/settings` | Open settings menu | [E: packages/coding-agent/src/core/slash-commands.ts:19] |
| `/model` | Select model (opens selector UI) | [E: packages/coding-agent/src/core/slash-commands.ts:20] |
| `/scoped-models` | Enable/disable models for Ctrl+P cycling | [E: packages/coding-agent/src/core/slash-commands.ts:21] |
| `/export` | Export session (HTML default, or specify path: .html/.jsonl) | [E: packages/coding-agent/src/core/slash-commands.ts:22] |
| `/import` | Import and resume a session from a JSONL file | [E: packages/coding-agent/src/core/slash-commands.ts:23] |
| `/share` | Share session as a secret GitHub gist | [E: packages/coding-agent/src/core/slash-commands.ts:24] |
| `/copy` | Copy last agent message to clipboard | [E: packages/coding-agent/src/core/slash-commands.ts:25] |
| `/name` | Set session display name | [E: packages/coding-agent/src/core/slash-commands.ts:26] |
| `/session` | Show session info and stats | [E: packages/coding-agent/src/core/slash-commands.ts:27] |
| `/changelog` | Show changelog entries | [E: packages/coding-agent/src/core/slash-commands.ts:28] |
| `/hotkeys` | Show all keyboard shortcuts | [E: packages/coding-agent/src/core/slash-commands.ts:29] |
| `/fork` | Create a new fork from a previous user message | [E: packages/coding-agent/src/core/slash-commands.ts:30] |
| `/clone` | Duplicate the current session at the current position | [E: packages/coding-agent/src/core/slash-commands.ts:31] |
| `/tree` | Navigate session tree (switch branches) | [E: packages/coding-agent/src/core/slash-commands.ts:32] |
| `/trust` | Save project trust decision for future sessions | [E: packages/coding-agent/src/core/slash-commands.ts:33] |
| `/login` | Configure provider authentication | [E: packages/coding-agent/src/core/slash-commands.ts:34] |
| `/logout` | Remove provider authentication | [E: packages/coding-agent/src/core/slash-commands.ts:35] |
| `/new` | Start a new session | [E: packages/coding-agent/src/core/slash-commands.ts:36] |
| `/compact` | Manually compact the session context | [E: packages/coding-agent/src/core/slash-commands.ts:37] |
| `/resume` | Resume a different session | [E: packages/coding-agent/src/core/slash-commands.ts:38] |
| `/reload` | Reload keybindings, extensions, skills, prompts, and themes | [E: packages/coding-agent/src/core/slash-commands.ts:39] |
| `/quit` | Quit pi | [E: packages/coding-agent/src/core/slash-commands.ts:40] |

用户文档的 Slash Commands 表也列出 `/login`、`/logout`、`/model`、`/scoped-models`、`/settings`、`/resume`、`/new`、`/name`、`/session`、`/tree`、`/trust`、`/fork`、`/clone`、`/compact`、`/copy`、`/export`、`/import`、`/share`、`/reload`、`/hotkeys`、`/changelog` 和 `/quit` [E: packages/coding-agent/docs/usage.md:36] [E: packages/coding-agent/docs/usage.md:38] [E: packages/coding-agent/docs/usage.md:58]。`/reload` 在用户文档中说 reload keybindings、extensions、skills、prompts 和 context files,而源码内置描述说 reload keybindings、extensions、skills、prompts 和 themes;context files 与 themes 的用户承诺边界需要在 catalog 或实现节点里继续核对 [E: packages/coding-agent/docs/usage.md:55] [E: packages/coding-agent/src/core/slash-commands.ts:39] [U]。

## `SlashCommandInfo` 的范围

`SlashCommandInfo` 有 `name`、可选 `description`、`source` 和 `sourceInfo`;其中 `source` 只能是 `"extension"`、`"prompt"` 或 `"skill"` [E: packages/coding-agent/src/core/slash-commands.ts:4] [E: packages/coding-agent/src/core/slash-commands.ts:6] [E: packages/coding-agent/src/core/slash-commands.ts:9] [E: packages/coding-agent/src/core/slash-commands.ts:10]。因此 `SlashCommandInfo` 是动态命令的元数据类型,不是内置命令的类型;内置命令使用单独的 `BuiltinSlashCommand` 和 `BUILTIN_SLASH_COMMANDS` [E: packages/coding-agent/src/core/slash-commands.ts:13] [E: packages/coding-agent/src/core/slash-commands.ts:18]。

AgentSession 绑定给 extension core 的 `getCommands()` 返回三段动态命令:extension runner registered commands、当前 prompt templates、resource loader skills;skill 的 name 在这里被加上 `skill:` 前缀 [E: packages/coding-agent/src/core/agent-session.ts:2195] [E: packages/coding-agent/src/core/agent-session.ts:2196] [E: packages/coding-agent/src/core/agent-session.ts:2197] [E: packages/coding-agent/src/core/agent-session.ts:2204] [E: packages/coding-agent/src/core/agent-session.ts:2211] [E: packages/coding-agent/src/core/agent-session.ts:2212] [E: packages/coding-agent/src/core/agent-session.ts:2218]。这个 API 不返回内置 `/settings`、`/model` 等命令;extension 想知道可由 `prompt` 调用的动态命令时,看的是 session 当前资源状态 [I]。

## 输入分发

interactive mode 对内置命令走显式 `if` 分支,例如 `/settings` 调 `showSettingsSelector()`,`/scoped-models` 调 `showModelsSelector()`,`/model` 调 `handleModelCommand()`,`/export` 调 `handleExportCommand()`,`/reload` 调 `handleReloadCommand()`,`/resume` 调 `showSessionSelector()`,`/quit` 调 `shutdown()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2539] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2545] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2550] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2555] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2561] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2642] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2662] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2667]。

未被内置分支截获的普通输入会由 interactive loop 从 `getUserInput()` 取得后调用 `session.prompt(...)`;streaming 时 submit handler 直接以 `streamingBehavior: "steer"` 调 `session.prompt(...)` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:831] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:833] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2708]。`AgentSession.prompt()` 对以 `/` 开头的文本先尝试执行 extension command,随后发出 input event,再展开 `/skill:name` 和 prompt template [E: packages/coding-agent/src/core/agent-session.ts:998] [E: packages/coding-agent/src/core/agent-session.ts:1006] [E: packages/coding-agent/src/core/agent-session.ts:1007] [E: packages/coding-agent/src/core/agent-session.ts:1018] [E: packages/coding-agent/src/core/agent-session.ts:1019] [E: packages/coding-agent/src/core/agent-session.ts:1038] [E: packages/coding-agent/src/core/agent-session.ts:1039]。在 streaming/queue 场景中,`steer()` 和 `followUp()` 会展开 skill command 与 prompt template,但会拒绝 extension command,因为 extension command 不能排队执行 [E: packages/coding-agent/src/core/agent-session.ts:1219] [E: packages/coding-agent/src/core/agent-session.ts:1221] [E: packages/coding-agent/src/core/agent-session.ts:1222] [E: packages/coding-agent/src/core/agent-session.ts:1226] [E: packages/coding-agent/src/core/agent-session.ts:1239] [E: packages/coding-agent/src/core/agent-session.ts:1241] [E: packages/coding-agent/src/core/agent-session.ts:1242] [E: packages/coding-agent/src/core/agent-session.ts:1246]。

## 冲突与非公开边界

autocomplete 会把内置命令名做成 `builtinNames`;extension registered command 如果与内置命令重名,诊断会提示冲突,并且 autocomplete 过滤掉直接重名的 extension command 或提示它的 alternate invocation name [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:472] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:473] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:475] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:476] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:480] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:482] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:535] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:537]。

interactive submit handler 还存在 `/debug`、`/arminsayshi` 和 `/dementedelves` 分支,但它们不在 `BUILTIN_SLASH_COMMANDS` 也不在用户文档 Slash Commands 表内;按本 wiki 的 ground-truth 约定,本节点不把这些分支列为公开内置 slash command [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2647] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2652] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2657] [E: packages/coding-agent/src/core/slash-commands.ts:18] [E: packages/coding-agent/docs/usage.md:36] [U]。

## 跨包关系

[ref.coding-agent.slash-commands](../../reference/slash-commands.md) 应逐项覆盖内置 slash command catalog,包括命令名、参数形态、handler 和用户文档描述;本 surface 节点只解释 slash command 作为用户可见入口的组成和分发边界 [I]。

[surface.skills.system](../skills/system.md) 覆盖 skill 如何被发现、如何进入系统提示以及 `enableSkillCommands` 怎样控制 `/skill:name`;本节点只记录 `/skill:name` 在 slash command surface 中的注册和展开位置 [E: packages/coding-agent/src/core/settings-manager.ts:108] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:547] [I]。

[surface.prompt-templates.system](../prompts/system.md) 覆盖 prompt template 的文件加载、参数替换和模板语法;本节点只记录 prompt template 以 `/templateName` 进入 autocomplete,并在 `AgentSession.prompt()` 内被 `expandPromptTemplate()` 展开 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:527] [E: packages/coding-agent/src/core/agent-session.ts:1039] [I]。

## Sources

- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/docs/usage.md
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/settings-manager.ts

## 相关

- [ref.coding-agent.slash-commands](../../reference/slash-commands.md): 内置 slash command 逐项 catalog。
- [surface.skills.system](../skills/system.md): skills 加载、系统提示呈现与 `/skill:name` 命令注册。
- [surface.prompt-templates.system](../prompts/system.md): prompt template 加载、参数替换与 `/templateName` 展开。
