---
id: ui.tasks
title: UI Tasks 组件族
kind: subsystem
tier: T2
source: [components/tasks/BackgroundTasksDialog.tsx, components/tasks/BackgroundTaskStatus.tsx, components/tasks/AsyncAgentDetailDialog.tsx, components/tasks/RemoteSessionDetailDialog.tsx, components/tasks/ShellDetailDialog.tsx, components/tasks/renderToolActivity.tsx, components/tasks/taskStatusUtils.tsx, components/TaskListV2.tsx, components/AgentProgressLine.tsx, components/CoordinatorAgentStatus.tsx]
symbols: [BackgroundTasksDialog, BackgroundTaskStatus, AsyncAgentDetailDialog, RemoteSessionDetailDialog, ShellDetailDialog, renderToolActivity, TaskListV2, AgentProgressLine, CoordinatorTaskPanel]
related: [subsys.ui-components, subsys.swarm, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.tasks` 是 background task、local agent task、remote session、shell task 与 TODO V2 task list 的终端 UI 家族。[I]

## 能回答的问题
- background task footer 怎样从 `AppState.tasks` 生成 pill?
- `BackgroundTasksDialog` 支持哪些 task type?
- `TaskListV2` 怎样把 teammate activity 接到 TODO 列表?
- `renderToolActivity` 怎样复用 Tool schema 和 renderer?

## 族干什么
`BackgroundTasksDialog` 的 `ListItem` union 明确覆盖 local bash、remote agent、local agent、in-process teammate、workflow、monitor MCP、dream 和 leader 入口。[E: components/tasks/BackgroundTasksDialog.tsx:58][E: components/tasks/BackgroundTasksDialog.tsx:64][E: components/tasks/BackgroundTasksDialog.tsx:70][E: components/tasks/BackgroundTasksDialog.tsx:76][E: components/tasks/BackgroundTasksDialog.tsx:82][E: components/tasks/BackgroundTasksDialog.tsx:88][E: components/tasks/BackgroundTasksDialog.tsx:94][E: components/tasks/BackgroundTasksDialog.tsx:100] `BackgroundTasksDialog` 从 `AppState.tasks`、`foregroundedTaskId`、`expandedView` 取运行时状态,再用 `useSetAppState` 执行 foreground/kill 等动作。[E: components/tasks/BackgroundTasksDialog.tsx:132][E: components/tasks/BackgroundTasksDialog.tsx:133][E: components/tasks/BackgroundTasksDialog.tsx:134][E: components/tasks/BackgroundTasksDialog.tsx:135]

## 成员清单
- `BackgroundTasksDialog` 是 background task modal 的主入口。[E: components/tasks/BackgroundTasksDialog.tsx:127]
- `BackgroundTaskStatus` 是 footer/status line 的 task pill 组件,从 `AppState.tasks` 过滤 background tasks。[E: components/tasks/BackgroundTaskStatus.tsx:25][E: components/tasks/BackgroundTaskStatus.tsx:40]
- `AsyncAgentDetailDialog`、`RemoteSessionDetailDialog`、`ShellDetailDialog` 分别显示 async agent、remote session、shell task 细节。[E: components/tasks/AsyncAgentDetailDialog.tsx:25][E: components/tasks/RemoteSessionDetailDialog.tsx:778][E: components/tasks/ShellDetailDialog.tsx:49]
- `renderToolActivity` 用 `findToolByName`、`inputSchema.safeParse`、`renderToolUseMessage` 将 tool activity 渲染为用户可读文本。[E: components/tasks/renderToolActivity.tsx:8][E: components/tasks/renderToolActivity.tsx:13][E: components/tasks/renderToolActivity.tsx:19]
- `taskStatusUtils.tsx` 提供 task terminal-status 判断、status icon/color 和 working activity fallback。[E: components/tasks/taskStatusUtils.tsx:17][E: components/tasks/taskStatusUtils.tsx:23][E: components/tasks/taskStatusUtils.tsx:50][E: components/tasks/taskStatusUtils.tsx:81]
- `TaskListV2` 是 TODO V2 列表,入口读取 `teamContext` 和 `AppState.tasks`。[E: components/TaskListV2.tsx:30][E: components/TaskListV2.tsx:34][E: components/TaskListV2.tsx:35]
- `AgentProgressLine` 渲染 agent 运行树中的单行状态、tool use 计数与 token 数。[E: components/AgentProgressLine.tsx:23][E: components/AgentProgressLine.tsx:88]
- `CoordinatorTaskPanel` 管理可见 local agent tasks,从 `AppState.tasks` 派生 visible rows。[E: components/CoordinatorAgentStatus.tsx:31][E: components/CoordinatorAgentStatus.tsx:35]

## 巨型组件深挖
`BackgroundTasksDialog` 的主分流先把 background tasks 映射为 `ListItem`,按 running 状态和 startTime 排序,再拆成 bash、remote、agent、workflow、MCP monitor、dream、teammate 等分组。[E: components/tasks/BackgroundTasksDialog.tsx:183][E: components/tasks/BackgroundTasksDialog.tsx:184][E: components/tasks/BackgroundTasksDialog.tsx:193][E: components/tasks/BackgroundTasksDialog.tsx:194][E: components/tasks/BackgroundTasksDialog.tsx:196][E: components/tasks/BackgroundTasksDialog.tsx:197][E: components/tasks/BackgroundTasksDialog.tsx:198][E: components/tasks/BackgroundTasksDialog.tsx:199][E: components/tasks/BackgroundTasksDialog.tsx:201] `TaskListV2` 为 completed task 维护 30 秒 recent-completed TTL,并在 rows 太小时限制展示数量。[E: components/TaskListV2.tsx:21][E: components/TaskListV2.tsx:48][E: components/TaskListV2.tsx:75][E: components/TaskListV2.tsx:83]

## 与 hooks/AppState 接线
`BackgroundTaskStatus` 用 `useTerminalSize` 计算 pill 可用宽度,用 `useAppState` 读取 tasks、viewing agent、expanded view,并用 `useSetAppState` 进入或退出 teammate view。[E: components/tasks/BackgroundTaskStatus.tsx:36][E: components/tasks/BackgroundTaskStatus.tsx:39][E: components/tasks/BackgroundTaskStatus.tsx:40][E: components/tasks/BackgroundTaskStatus.tsx:51][E: components/tasks/BackgroundTaskStatus.tsx:114][E: components/tasks/BackgroundTaskStatus.tsx:118][E: components/tasks/BackgroundTaskStatus.tsx:155] `CoordinatorTaskPanel` 每秒 tick,把过期 panel tasks 从 `AppState.tasks` 驱逐。[E: components/CoordinatorAgentStatus.tsx:57][E: components/CoordinatorAgentStatus.tsx:61]

## Sources
- components/tasks/BackgroundTasksDialog.tsx
- components/tasks/BackgroundTaskStatus.tsx
- components/tasks/AsyncAgentDetailDialog.tsx
- components/tasks/RemoteSessionDetailDialog.tsx
- components/tasks/ShellDetailDialog.tsx
- components/tasks/renderToolActivity.tsx
- components/tasks/taskStatusUtils.tsx
- components/TaskListV2.tsx
- components/AgentProgressLine.tsx
- components/CoordinatorAgentStatus.tsx

## 相关
- `subsys.swarm` 说明 agent task 与 teammate task 的后端状态模型。
- `subsys.session-state` 说明 `AppState.tasks` 的 store 边界。
