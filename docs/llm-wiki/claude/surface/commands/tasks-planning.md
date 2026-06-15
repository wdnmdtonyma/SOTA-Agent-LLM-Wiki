---
id: cmd.tasks-planning
path: surface/commands/tasks-planning.md
title: Tasks and planning slash commands
kind: command
tier: T1
source: [commands.ts, commands/plan/index.ts, commands/plan/plan.tsx, commands/tasks/index.ts, commands/tasks/tasks.tsx, commands/btw/index.ts, commands/btw/btw.tsx, commands/thinkback/index.ts, commands/thinkback/thinkback.tsx, commands/thinkback-play/index.ts, commands/thinkback-play/thinkback-play.ts]
symbols: [plan, tasks, btw, thinkback, thinkbackPlay]
related: [subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Tasks and planning 命令 catalog 覆盖 `/plan`、`/tasks`、`/btw`、`/think-back`、`/thinkback-play`,即规划模式、后台任务面板、旁路问题和 Think Back flow。

## 能回答的问题

- `/plan` 如何进入 plan mode,以及 `/plan open` 如何打开计划文件?
- `/tasks` 和 `/btw` 分别如何处理后台任务与 side question?
- `/think-back` 与 hidden `/thinkback-play` 共享哪些 animation 播放逻辑?
- 哪些命令是 immediate、hidden 或 feature-gated?

## 简介

`commands.ts` 在 `COMMANDS` 数组后段注册 `thinkback`、`thinkbackPlay`、`plan`、`tasks`,并在前段注册 `btw`。[E: commands.ts:263][E: commands.ts:329][E: commands.ts:330][E: commands.ts:332][E: commands.ts:340] `btw` 也在 `REMOTE_SAFE_COMMANDS` 中,说明 remote mode TUI 仍保留这个 quick note/side question 入口。[E: commands.ts:630]

## 命令清单

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
| --- | --- | --- | --- | --- | --- |
| `/plan` | - | `local-jsx` | `COMMANDS` 直接包含 `plan`; command metadata 声明用于启用 plan mode 或查看当前 session plan。[E: commands.ts:332][E: commands/plan/index.ts:4][E: commands/plan/index.ts:5][E: commands/plan/index.ts:6] | `[open/<description>]`;非 `open` description 会触发下一轮 query。[E: commands/plan/index.ts:7][E: commands/plan/plan.tsx:83][E: commands/plan/plan.tsx:85][E: commands/plan/plan.tsx:86] | 未在 plan mode 时切换 permission mode 到 `plan`;已在 plan mode 时展示 plan,`/plan open` 调外部编辑器打开 plan file。[E: commands/plan/plan.tsx:73][E: commands/plan/plan.tsx:74][E: commands/plan/plan.tsx:77][E: commands/plan/plan.tsx:95][E: commands/plan/plan.tsx:104][E: commands/plan/plan.tsx:105] |
| `/tasks` | `bashes` | `local-jsx` | `COMMANDS` 直接包含 `tasks`; command object 声明 alias `bashes`。[E: commands.ts:340][E: commands/tasks/index.ts:4][E: commands/tasks/index.ts:5][E: commands/tasks/index.ts:6] | 无显式参数; `call()` 只接收 command context。[E: commands/tasks/tasks.tsx:5] | 渲染 `BackgroundTasksDialog`,把 `LocalJSXCommandContext` 作为 `toolUseContext` 传入以管理后台任务。[E: commands/tasks/tasks.tsx:6] |
| `/btw` | - | `local-jsx` | `COMMANDS` 直接包含 `btw`; command metadata 设置 `immediate: true`。[E: commands.ts:263][E: commands/btw/index.ts:4][E: commands/btw/index.ts:5][E: commands/btw/index.ts:8] | `<question>`;缺少问题时返回 usage system message。[E: commands/btw/index.ts:9][E: commands/btw/btw.tsx:230][E: commands/btw/btw.tsx:232] | 构建 cache-safe side question context,调用 `runSideQuestion()` 获取旁路回答,同时不打断主对话。[E: commands/btw/btw.tsx:92][E: commands/btw/btw.tsx:208][E: commands/btw/btw.tsx:220][E: commands/btw/btw.tsx:241] |
| `/think-back` | - | `local-jsx` | `COMMANDS` 直接包含 `thinkback`; command name 是 `think-back`,由 `tengu_thinkback` gate 启用。[E: commands.ts:329][E: commands/thinkback/index.ts:5][E: commands/thinkback/index.ts:6][E: commands/thinkback/index.ts:9] | 无显式参数; UI menu 决定 play/edit/fix/regenerate flow。[E: commands/thinkback/thinkback.tsx:269][E: commands/thinkback/thinkback.tsx:282] | 确保 Think Back plugin/marketplace 可用,查找 skill dir,再根据是否已有 `year_in_review.js` 展示播放或生成菜单。[E: commands/thinkback/thinkback.tsx:167][E: commands/thinkback/thinkback.tsx:181][E: commands/thinkback/thinkback.tsx:210][E: commands/thinkback/thinkback.tsx:425][E: commands/thinkback/thinkback.tsx:454][E: commands/thinkback/thinkback.tsx:455][E: commands/thinkback/thinkback.tsx:457][E: commands/thinkback/thinkback.tsx:282][E: commands/thinkback/thinkback.tsx:537] |
| `/thinkback-play` | - | `local` | `COMMANDS` 直接包含 `thinkbackPlay`; command hidden,也由 `tengu_thinkback` gate 启用,不支持 non-interactive。[E: commands.ts:330][E: commands/thinkback-play/index.ts:7][E: commands/thinkback-play/index.ts:8][E: commands/thinkback-play/index.ts:11][E: commands/thinkback-play/index.ts:12][E: commands/thinkback-play/index.ts:13] | 无显式参数; `call()` 不读取 args。[E: commands/thinkback-play/thinkback-play.ts:18] | 从 installed plugins config 找到 Think Back skill dir,然后调用 `/think-back` 共享的 `playAnimation()`。[E: commands/thinkback-play/thinkback-play.ts:20][E: commands/thinkback-play/thinkback-play.ts:22][E: commands/thinkback-play/thinkback-play.ts:40][E: commands/thinkback-play/thinkback-play.ts:41] |

## 复杂命令深挖

### `/plan`

`/plan` 的 first branch 是 mode transition:读取当前 `toolPermissionContext.mode`,非 `plan` 时调用 `handlePlanModeTransition()` 并用 `applyPermissionUpdate(prepareContextForPlanMode(...), { type: 'setMode', mode: 'plan' })` 写回 session permission mode。[E: commands/plan/plan.tsx:70][E: commands/plan/plan.tsx:73][E: commands/plan/plan.tsx:74][E: commands/plan/plan.tsx:77][E: commands/plan/plan.tsx:78][E: commands/plan/plan.tsx:79] 已处于 plan mode 时,命令通过 `getPlan()` 与 `getPlanFilePath()` 获取内容和路径;`open` 参数调用 `editFileInEditor(planPath)`。[E: commands/plan/plan.tsx:95][E: commands/plan/plan.tsx:96][E: commands/plan/plan.tsx:104][E: commands/plan/plan.tsx:105]

### `/btw`

`/btw` 将当前消息裁到 compact boundary 并剔除未完成 assistant message,优先复用 `getLastCacheSafeParams()` 中的 system/user/system context bytes,否则重新构建 system prompt、user context 和 system context。[E: commands/btw/btw.tsx:201][E: commands/btw/btw.tsx:203][E: commands/btw/btw.tsx:204][E: commands/btw/btw.tsx:209][E: commands/btw/btw.tsx:210][E: commands/btw/btw.tsx:212][E: commands/btw/btw.tsx:220] `call()` 保存 `btwUseCount` 后渲染 `BtwSideQuestion`,该 component 内部运行 `runSideQuestion()` 并以 scrollable Markdown 显示回答。[E: commands/btw/btw.tsx:92][E: commands/btw/btw.tsx:237][E: commands/btw/btw.tsx:241][E: commands/btw/btw.tsx:143]

### `/think-back` 与 `/thinkback-play`

`/think-back` 的 `playAnimation()` 先要求 skill dir 内存在 `year_in_review.js` 和 `player.js`,进入 alternate screen 后用 `node player.js` 运行动画,退出后若存在 `year_in_review.html` 则用平台 open command 打开 HTML。[E: commands/thinkback/thinkback.tsx:63][E: commands/thinkback/thinkback.tsx:64][E: commands/thinkback/thinkback.tsx:75][E: commands/thinkback/thinkback.tsx:90][E: commands/thinkback/thinkback.tsx:113][E: commands/thinkback/thinkback.tsx:115][E: commands/thinkback/thinkback.tsx:123][E: commands/thinkback/thinkback.tsx:127][E: commands/thinkback/thinkback.tsx:131] `/thinkback-play` 复用这个 function,因此 hidden command 只负责定位 installed plugin 的 skill directory。[E: commands/thinkback-play/thinkback-play.ts:20][E: commands/thinkback-play/thinkback-play.ts:40][E: commands/thinkback-play/thinkback-play.ts:41]

## Sources

- `commands.ts`
- `commands/plan/index.ts`
- `commands/plan/plan.tsx`
- `commands/tasks/index.ts`
- `commands/tasks/tasks.tsx`
- `commands/btw/index.ts`
- `commands/btw/btw.tsx`
- `commands/thinkback/index.ts`
- `commands/thinkback/thinkback.tsx`
- `commands/thinkback-play/index.ts`
- `commands/thinkback-play/thinkback-play.ts`

## 相关

- [命令系统机制](../../subsystems/command-system.md)
