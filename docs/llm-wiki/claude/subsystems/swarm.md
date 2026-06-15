---
id: subsys.swarm
path: subsystems/swarm.md
title: 多 agent 与 Swarm
kind: subsystem
tier: T2
status: verified
source: [coordinator/, utils/swarm/, tasks/, Task.ts]
symbols: [TaskType, TaskStatus, createTaskStateBase, isCoordinatorMode, getCoordinatorSystemPrompt, detectAndGetBackend, spawnInProcessTeammate, LocalAgentTaskState, RemoteAgentTaskState]
related: [tool.agent, tool.team-create]
updated: 2026-06-14
evidence: explicit
---

Swarm 是 Claude Code 的多 agent 执行层: `Task` 给所有后台工作统一 ID、状态和 metadata, coordinator mode 决定编排提示词和 worker tool surface, `utils/swarm` 再把 teammate 落到 tmux、iTerm2 或 in-process runtime。[E: Task.ts:6][E: Task.ts:15][E: coordinator/coordinatorMode.ts:80][E: utils/swarm/backends/types.ts:9]

## 能回答的问题

- 一个 agent/team/swarm 任务在状态层如何命名、注册和判断结束?
- Coordinator mode 如何决定可用 worker 工具和 system prompt?
- teammate 是如何选择 tmux、iTerm2 或 in-process executor 的?
- local agent、remote agent、in-process teammate 的任务状态有什么不同?

## 职责边界

Swarm 不直接实现模型主循环; 它把可运行的 worker 组织成 `Task` 对象, 并通过 pane backend 或 in-process executor 让 worker 跑起来。[E: Task.ts:72][E: utils/swarm/backends/types.ts:39][E: utils/swarm/spawnInProcess.ts:104] Coordinator prompt 负责告诉主 agent 何时创建 teammate、如何分解任务、如何使用 worker tools, 但真正的工具池仍由 coordinator context 根据模式选择注入。[E: coordinator/coordinatorMode.ts:80][E: coordinator/coordinatorMode.ts:111]

`TaskType` 覆盖 local bash、local agent、remote agent、in-process teammate、local workflow、monitor MCP 和 dream 七类后台任务, 这些类型共用 `TaskStatus` 的 pending/running/completed/failed/killed 状态集合。[E: Task.ts:6][E: Task.ts:15] `isTerminalTaskStatus` 只把 completed、failed、killed 视为 terminal status, 所以 running/pending 任务需要继续被 UI 或后台管理器追踪。[E: Task.ts:27]

## 关键文件

- `Task.ts`: 定义 task type、status、公共 state base、ID 前缀和 `Task` 接口。[E: Task.ts:45][E: Task.ts:72][E: Task.ts:79]
- `tasks/types.ts`: 把 LocalBash、LocalAgent、RemoteAgent、InProcessTeammate、LocalWorkflow 等 state 合成 `TaskState`, 并用 `isBackgroundTask` 识别带 `id/status/title` 的 background task。[E: tasks/types.ts:12][E: tasks/types.ts:37]
- `coordinator/coordinatorMode.ts`: 判断 coordinator 模式, 生成 coordinator user context 和 system prompt。[E: coordinator/coordinatorMode.ts:36][E: coordinator/coordinatorMode.ts:80][E: coordinator/coordinatorMode.ts:111]
- `utils/swarm/backends/registry.ts`: 注册、检测并选择 pane backend, 同时决定 teammate executor 是 pane 还是 in-process。[E: utils/swarm/backends/registry.ts:74][E: utils/swarm/backends/registry.ts:136][E: utils/swarm/backends/registry.ts:425]
- `utils/swarm/spawnInProcess.ts`: 在同一个 Node.js 进程内生成 teammate context、task state 和 cleanup hooks。[E: utils/swarm/spawnInProcess.ts:104][E: utils/swarm/spawnInProcess.ts:139][E: utils/swarm/spawnInProcess.ts:157]
- `tasks/LocalAgentTask/LocalAgentTask.tsx` 与 `tasks/RemoteAgentTask/RemoteAgentTask.tsx`: 分别定义本地 agent 和远端 agent 的 state shape、通知、completion metadata。[E: tasks/LocalAgentTask/LocalAgentTask.tsx:116][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:22]

## 数据模型 / 状态

所有 task 的公共字段来自 `TaskStateBase`: `id/type/status/description/toolUseId/startTime/endTime/totalPausedMs/outputFile/outputOffset/notified`。[E: Task.ts:45] `createTaskStateBase` 返回 pending 状态, 写入 description、toolUseId、startTime、outputFile、outputOffset 和 notified, 因此不同 task 类型可以共享最小创建语义。[E: Task.ts:108][E: Task.ts:117][E: Task.ts:118][E: Task.ts:119][E: Task.ts:120][E: Task.ts:121][E: Task.ts:122][E: Task.ts:123] ID 前缀由 task type 映射决定, local bash/local agent/remote agent/in-process teammate/local workflow/monitor MCP/dream 分别使用 `b/a/r/t/w/m/d`。[E: Task.ts:79][E: Task.ts:80][E: Task.ts:81][E: Task.ts:82][E: Task.ts:83][E: Task.ts:84][E: Task.ts:85][E: Task.ts:86]

`LocalAgentTaskState` 扩展了 agent prompt、model、allowedTools、cwd、permissionMode、mode、agentId、transcript、message queue 和 wakeup/progress 信息, 说明本地 agent task 同时是执行配置和 UI/notification 状态容器。[E: tasks/LocalAgentTask/LocalAgentTask.tsx:116] `RemoteAgentTaskState` 则使用 `remoteTaskType`、`remoteTaskMetadata`、`sessionId`、`command`、`title`、`todoList`、`log`、`isLongRunning`、`pollStartedAt`、`isRemoteReview`、`reviewProgress`、`isUltraplan` 和 `ultraplanPhase` 追踪远端任务。[E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:22][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:24][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:26][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:27][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:28][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:29][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:30][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:31][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:35][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:41][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:43][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:45][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:51][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:58]

In-process teammate 的 `Task` 对象只按公共 `Task` 接口暴露 `name/type/kill`; shutdown request、message append、user message injection 是旁路 helper functions, state shape 在 `InProcessTeammateTaskState` 中保存 identity、prompt、permissionMode、messages、pendingUserMessages、isIdle 和 shutdownRequested 等字段。[E: Task.ts:72][E: tasks/InProcessTeammateTask/InProcessTeammateTask.tsx:24][E: tasks/InProcessTeammateTask/InProcessTeammateTask.tsx:35][E: tasks/InProcessTeammateTask/InProcessTeammateTask.tsx:51][E: tasks/InProcessTeammateTask/InProcessTeammateTask.tsx:68][E: tasks/InProcessTeammateTask/types.ts:22][E: tasks/InProcessTeammateTask/types.ts:27][E: tasks/InProcessTeammateTask/types.ts:30][E: tasks/InProcessTeammateTask/types.ts:44][E: tasks/InProcessTeammateTask/types.ts:53][E: tasks/InProcessTeammateTask/types.ts:59][E: tasks/InProcessTeammateTask/types.ts:66][E: tasks/InProcessTeammateTask/types.ts:67] 运行中的 in-process teammate 会按 `identity.agentName` 字母序排序返回, 这让 UI 的多个入口共享同一顺序。[E: tasks/InProcessTeammateTask/InProcessTeammateTask.tsx:123]

Team 定义走 `utils/swarm/teamHelpers.ts`: schema 要求 `agents` 至少一个, team 文件包含 `name/description/agents/created_at/updated_at`, 存放路径由 `getTeamDir` 和 `getTeamFilePath` 从配置目录计算。[E: utils/swarm/teamHelpers.ts:19][E: utils/swarm/teamHelpers.ts:64][E: utils/swarm/teamHelpers.ts:115][E: utils/swarm/teamHelpers.ts:122]

## 控制流

Coordinator mode 先由 feature flag 和 `CLAUDE_CODE_COORDINATOR_MODE` 环境变量共同判定; 如果 feature 未开或 env 不为真, `isCoordinatorMode` 返回 false。[E: coordinator/coordinatorMode.ts:36][E: coordinator/coordinatorMode.ts:37][E: coordinator/coordinatorMode.ts:38] `matchSessionMode` 只对恢复会话的 stored mode 与当前 env 做一致性修正: 不匹配时设置或删除 `CLAUDE_CODE_COORDINATOR_MODE` 并返回提示。[E: coordinator/coordinatorMode.ts:49][E: coordinator/coordinatorMode.ts:57][E: coordinator/coordinatorMode.ts:65][E: coordinator/coordinatorMode.ts:68][E: coordinator/coordinatorMode.ts:75] `getCoordinatorUserContext` 才负责为 SIMPLE 模式和其它模式选择不同 worker tool set, 并列出 MCP server 名和 scratchpad 路径。[E: coordinator/coordinatorMode.ts:80][E: coordinator/coordinatorMode.ts:88][E: coordinator/coordinatorMode.ts:99][E: coordinator/coordinatorMode.ts:104]

Backend detection 先确保 tmux 和 iTerm2 backend 已注册, 再按运行环境选择: 已在 tmux 中则直接用 tmux; iTerm2 + Python API 可用时用 iTerm2; iTerm2 中但 Python API 不可用时 fallback 到 tmux; 普通 shell 中如果 tmux 可用也用 tmux; 否则返回 unavailable。[E: utils/swarm/backends/registry.ts:74][E: utils/swarm/backends/registry.ts:159][E: utils/swarm/backends/registry.ts:174][E: utils/swarm/backends/registry.ts:203][E: utils/swarm/backends/registry.ts:234][E: utils/swarm/backends/registry.ts:252] In-process executor 的开关独立于 pane backend: non-interactive 模式直接启用, `in-process` mode 强制启用, `tmux` mode 关闭, `auto` mode 在 tmux/iTerm 环境外启用。[E: utils/swarm/backends/registry.ts:351][E: utils/swarm/backends/registry.ts:361][E: utils/swarm/backends/registry.ts:365][E: utils/swarm/backends/registry.ts:382]

`spawnInProcessTeammate` 创建 agent/task ID、AbortController、identity、teammate context、task state 和 cleanup 函数, 然后调用 `registerTask` 把 task 放进后台任务系统。[E: utils/swarm/spawnInProcess.ts:112][E: utils/swarm/spawnInProcess.ts:122][E: utils/swarm/spawnInProcess.ts:128][E: utils/swarm/spawnInProcess.ts:139][E: utils/swarm/spawnInProcess.ts:157][E: utils/swarm/spawnInProcess.ts:191] 杀掉 in-process teammate 时, runtime 会找到 task、设置状态并 abort 对应 controller。[E: utils/swarm/spawnInProcess.ts:227][E: utils/swarm/spawnInProcess.ts:256]

Remote task 类型集合为 `remote-agent/ultraplan/ultrareview/autofix-pr/background-pr`; completion checker map 以 `RemoteTaskType` 为 key 注册外部完成判定器, 每个 checker 返回完成通知文本或 null 继续轮询。[E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:60][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:77][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:78][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:84] remote metadata 会按 task ID 写入、读取和删除, 用于跨进程或重启后恢复远端 agent 信息。[E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:92][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:92]

## 设计动机与权衡

- Swarm 把“任务状态”与“执行承载”分开: `TaskState` 统一描述后台任务, pane backend/in-process executor 决定运行在哪里。[E: tasks/types.ts:12][E: utils/swarm/backends/types.ts:39][E: utils/swarm/spawnInProcess.ts:104][I]
- Backend detection 偏向复用用户已经所在的终端环境; 只有当当前环境不可用时才 fallback 到另一个 backend, 这降低了 teammate 出现在意外窗口或会话中的概率。[E: utils/swarm/backends/registry.ts:159][E: utils/swarm/backends/registry.ts:174][E: utils/swarm/backends/registry.ts:203][I]
- In-process teammate 牺牲了进程隔离, 换来 non-interactive 和无 pane 环境下也能工作; 源码用独立 AbortController、identity 和 task state 来弥补同进程带来的生命周期耦合。[E: utils/swarm/spawnInProcess.ts:122][E: utils/swarm/spawnInProcess.ts:128][E: utils/swarm/spawnInProcess.ts:157][I]

## Gotchas

- `getTeammateExecutor` 在 in-process 开启时返回 in-process executor, 否则返回 pane executor; 调试 teammate 时要先看 `getResolvedTeammateMode`, 不能只看是否安装 tmux。[E: utils/swarm/backends/registry.ts:396][E: utils/swarm/backends/registry.ts:425]
- `LocalAgentTaskState` 和 `RemoteAgentTaskState` 都是 background task, 但 remote agent 的完成条件不是本地 child process 退出, 而是远端轮询事件、remote task type 和可选 completion checker 共同决定。[E: tasks/LocalAgentTask/LocalAgentTask.tsx:116][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:22][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:60][E: tasks/RemoteAgentTask/RemoteAgentTask.tsx:77][I]
- Team 文件名会经过 `sanitizeName`/`sanitizeAgentName`, 所以用户输入的名字和磁盘上的文件名不一定逐字一致。[E: utils/swarm/teamHelpers.ts:100][E: utils/swarm/teamHelpers.ts:108]

## Sources

- `coordinator/`
- `utils/swarm/`
- `tasks/`
- `Task.ts`

## 相关

- `tool.agent`
- `tool.team-create`
