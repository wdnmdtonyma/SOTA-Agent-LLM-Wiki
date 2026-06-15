---
id: cmd.model-config
title: Model and configuration command catalog
kind: command
tier: T1
source: [commands.ts, types/command.ts, commands/model/index.ts, commands/effort/index.ts, commands/advisor.ts, commands/config/index.ts, commands/theme/index.ts, commands/color/index.ts, commands/vim/index.ts, commands/keybindings/index.ts, commands/output-style/index.ts, commands/statusline.tsx]
symbols: [model, effort, advisor, config, theme, color, vim, keybindings, outputStyle, statusline]
related: [subsys.command-system, subsys.config-settings, group.commands]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Model and configuration command catalog 覆盖模型选择、effort、advisor、UI preference 和输入配置相关 slash commands。

## 能回答的问题

- `/model`、`/effort` 和 `/advisor` 分别改哪类 inference config？
- 哪些 config commands 是即时执行 `immediate`？
- `/config` 的 alias 是什么？
- `/output-style` 为什么仍在注册表里但隐藏？
- `/keybindings` 和 `/vim` 的 command kind 有什么差别？

## 清单边界

本节点只覆盖 `cmd.model-config` 分配的 10 个命令。`CommandBase` 定义了 `isEnabled`、`isHidden`、`aliases`、`argumentHint`、`immediate` 等共享字段 [E: types/command.ts:180] [E: types/command.ts:182] [E: types/command.ts:184] [E: types/command.ts:186] [E: types/command.ts:199]；`Command` 的具体执行形态来自 `prompt`、`local`、`local-jsx` 三类联合 [E: types/command.ts:205] [E: types/command.ts:206]。表中 `未声明` 表示当前 command object 没有显式字段，属于局部读源结论 [I]。没有 `availability` 字段的命令在 availability filter 中直接通过 [E: commands.ts:418]。

## Catalog

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
|---|---|---|---|---|---|
| `/model` | 未声明 [I] | `local-jsx` [E: commands/model/index.ts:6] | `COMMANDS` builtin entry [E: commands.ts:290]; `immediate` 由 `shouldInferenceConfigCommandBeImmediate()` 决定 [E: commands/model/index.ts:13] | `[model]` [E: commands/model/index.ts:11] | 设置 Claude Code 的 AI model，描述文本会显示当前模型 [E: commands/model/index.ts:9]。 |
| `/effort` | 未声明 [I] | `local-jsx` [E: commands/effort/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:276]; `immediate` 由 `shouldInferenceConfigCommandBeImmediate()` 决定 [E: commands/effort/index.ts:10] | `[low|medium|high|max|auto]` [E: commands/effort/index.ts:8] | 设置 model usage 的 effort level [E: commands/effort/index.ts:7]。 |
| `/advisor` | 未声明 [I] | `local` [E: commands/advisor.ts:97] | `COMMANDS` builtin entry [E: commands.ts:260]; 仅 `canUserConfigureAdvisor()` 为真时启用 [E: commands/advisor.ts:101] | `[<model>|off]` [E: commands/advisor.ts:100] | 配置 advisor model [E: commands/advisor.ts:99]。 |
| `/config` | `settings` [E: commands/config/index.ts:4] | `local-jsx` [E: commands/config/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:268] | 未声明 [I] | 打开 config panel [E: commands/config/index.ts:7]。 |
| `/theme` | 未声明 [I] | `local-jsx` [E: commands/theme/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:306] | 未声明 [I] | 更换 terminal theme [E: commands/theme/index.ts:6]。 |
| `/color` | 未声明 [I] | `local-jsx` [E: commands/color/index.ts:8] | `COMMANDS` builtin entry [E: commands.ts:266]; `immediate` [E: commands/color/index.ts:11] | `<color|default>` [E: commands/color/index.ts:12] | 设置本 session 的 prompt bar color [E: commands/color/index.ts:10]。 |
| `/vim` | 未声明 [I] | `local` [E: commands/vim/index.ts:7] | `COMMANDS` builtin entry [E: commands.ts:319]; non-interactive 不支持 [E: commands/vim/index.ts:6] | 未声明 [I] | 在 Vim editing mode 和 Normal editing mode 之间切换 [E: commands/vim/index.ts:5]。 |
| `/keybindings` | 未声明 [I] | `local` [E: commands/keybindings/index.ts:9] | `COMMANDS` builtin entry [E: commands.ts:284]; 仅 keybinding customization enabled 时启用 [E: commands/keybindings/index.ts:7] | 未声明 [I] | 打开或创建 user keybindings configuration file [E: commands/keybindings/index.ts:6]。 |
| `/output-style` | 未声明 [I] | `local-jsx` [E: commands/output-style/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:291]; `isHidden: true` [E: commands/output-style/index.ts:7] | 未声明 [I] | deprecated command，提示改用 `/config` 变更 output style [E: commands/output-style/index.ts:6]。 |
| `/statusline` | 无 [E: commands/statusline.tsx:9] | `prompt` [E: commands/statusline.tsx:5] | `COMMANDS` builtin entry [E: commands.ts:303]; `source: 'builtin'` [E: commands/statusline.tsx:13]; non-interactive 禁用 [E: commands/statusline.tsx:14] | `[<自然语言说明>]` [E: commands/statusline.tsx:16] | 配置 Claude Code 的 status line UI：spawn 一个 `statusline-setup` subagent，按 shell PS1 等写入 settings.json [E: commands/statusline.tsx:6][E: commands/statusline.tsx:19]。 |

## 复杂命令深挖

`/advisor` 是本类唯一 `local` inference command。无参数时读取当前 `advisorModel` 并报告 unset、inactive 或当前值 [E: commands/advisor.ts:22] [E: commands/advisor.ts:23] [E: commands/advisor.ts:24] [E: commands/advisor.ts:28] [E: commands/advisor.ts:34] [E: commands/advisor.ts:39]；`unset` 或 `off` 会把 AppState 和 user settings 中的 `advisorModel` 清空 [E: commands/advisor.ts:43] [E: commands/advisor.ts:47] [E: commands/advisor.ts:49]；设置新模型时先规范化和校验模型，再写入 AppState 和 user settings [E: commands/advisor.ts:58] [E: commands/advisor.ts:60] [E: commands/advisor.ts:77] [E: commands/advisor.ts:79] [E: commands/advisor.ts:81]。

`/model` 和 `/effort` 都是 `local-jsx`，并且是否 immediate 统一委托给 `shouldInferenceConfigCommandBeImmediate()` [E: commands/model/index.ts:13] [E: commands/effort/index.ts:10]。这个设计让模型与 effort 的 UI command 在同一类 inference config 时机下执行 [I]。

`/output-style` 保持注册但隐藏：command object 仍声明 `name: 'output-style'` [E: commands/output-style/index.ts:5]，同时设置 `isHidden: true` [E: commands/output-style/index.ts:7]，描述明确要求使用 `/config` [E: commands/output-style/index.ts:6]。

`/statusline` 是本类唯一 `prompt` 类型命令：它不直接改配置，而是 `getPromptForCommand` 返回一段文本，指示主循环 spawn 一个 `subagent_type: "statusline-setup"` 的 Agent 来完成配置 [E: commands/statusline.tsx:5][E: commands/statusline.tsx:15][E: commands/statusline.tsx:19]。无参数时默认 prompt 为“按我的 shell PS1 配置 statusLine” [E: commands/statusline.tsx:16]。它的 `allowedTools` 被收窄为 Agent、`Read(~/**)` 与 `Edit(~/.claude/settings.json)`，即只允许读 home 下文件并写用户 settings [E: commands/statusline.tsx:12]，因此 status line 配置最终落在 `settings.json` 的 `statusLine` 键（见 [hooks 设置](../settings/hooks.md)，该键是 `{ type: "command", command }` 且受 `disableAllHooks` 管控）。

## Sources

- commands.ts
- types/command.ts
- commands/model/index.ts
- commands/effort/index.ts
- commands/advisor.ts
- commands/config/index.ts
- commands/theme/index.ts
- commands/color/index.ts
- commands/vim/index.ts
- commands/keybindings/index.ts
- commands/output-style/index.ts
- commands/statusline.tsx

## 相关

- [命令系统机制](../../subsystems/command-system.md)
- [配置与设置](../../subsystems/config-settings.md)
