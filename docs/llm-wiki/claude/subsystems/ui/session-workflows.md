---
id: ui.session-workflows
title: UI Session Workflows 组件族
kind: subsystem
tier: T2
source: [components/IdleReturnDialog.tsx, components/ThinkingToggle.tsx, components/ExitFlow.tsx, components/ExportDialog.tsx, components/Feedback.tsx, components/Stats.tsx, components/WorkflowMultiselectDialog.tsx, components/WorktreeExitDialog.tsx, components/SessionPreview.tsx, components/SessionBackgroundHint.tsx]
symbols: [IdleReturnDialog, ThinkingToggle, ExitFlow, ExportDialog, Feedback, redactSensitiveInfo, createGitHubIssueUrl, Stats, WorkflowMultiselectDialog, WorktreeExitDialog, SessionPreview, SessionBackgroundHint]
related: [subsys.ui-components, subsys.session-state, subsys.cost-usage, subsys.swarm, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.session-workflows` 是 exit/export/feedback/stats/workflow install/worktree exit/session preview/background hint/thinking toggle 等会话级 workflow UI 族。[I]

## 能回答的问题
- worktree exit 为什么通过 `ExitFlow` 分流?
- feedback bug report 如何 redact sensitive info?
- stats dialog 怎样切换 date range / tab?
- session background hint 怎样调用 `backgroundAll`?

## 族干什么
该族覆盖不属于单一消息、输入或设置页面的会话操作: `ExitFlow` 在 worktree 场景渲染 `WorktreeExitDialog`,`ExportDialog` 管理导出文件名输入,`Feedback` 管理 bug report flow,`Stats` 聚合并展示 usage stats。[E: components/ExitFlow.tsx:15][E: components/ExitFlow.tsx:37][E: components/ExportDialog.tsx:25][E: components/ExportDialog.tsx:30][E: components/Feedback.tsx:161][E: components/Feedback.tsx:225][E: components/Feedback.tsx:230][E: components/Stats.tsx:64][E: components/Stats.tsx:128][E: components/Stats.tsx:152]

## 成员清单
- `IdleReturnDialog` 是 idle return confirmation dialog。[E: components/IdleReturnDialog.tsx:13][E: components/IdleReturnDialog.tsx:94]
- `ThinkingToggle` 维护 mid-conversation confirmation state,用 `confirm:no` 与 `confirm:yes` keybindings 确认或取消。[E: components/ThinkingToggle.tsx:18][E: components/ThinkingToggle.tsx:27][E: components/ThinkingToggle.tsx:68][E: components/ThinkingToggle.tsx:94]
- `ExitFlow` 与 `WorktreeExitDialog` 负责 worktree session exit,后者维护 status、changes、commitCount、resultMessage。[E: components/ExitFlow.tsx:37][E: components/WorktreeExitDialog.tsx:29][E: components/WorktreeExitDialog.tsx:33][E: components/WorktreeExitDialog.tsx:34][E: components/WorktreeExitDialog.tsx:35][E: components/WorktreeExitDialog.tsx:36]
- `ExportDialog` 维护 export option、filename、cursor offset 和 filename input visibility。[E: components/ExportDialog.tsx:30][E: components/ExportDialog.tsx:31][E: components/ExportDialog.tsx:32][E: components/ExportDialog.tsx:33]
- `Feedback` 导出 `redactSensitiveInfo` 与 `createGitHubIssueUrl`,并在 UI 内维护 step、description、feedbackId、error、envInfo、title。[E: components/Feedback.tsx:71][E: components/Feedback.tsx:393][E: components/Feedback.tsx:161][E: components/Feedback.tsx:163][E: components/Feedback.tsx:164][E: components/Feedback.tsx:165][E: components/Feedback.tsx:166][E: components/Feedback.tsx:173]
- `Stats` 用 `aggregateClaudeCodeStatsForRange` 创建 all-time promise,在 content 中维护 dateRange、cache、loading、activeTab、copyStatus。[E: components/Stats.tsx:64][E: components/Stats.tsx:128][E: components/Stats.tsx:136][E: components/Stats.tsx:137][E: components/Stats.tsx:138][E: components/Stats.tsx:139]
- `WorkflowMultiselectDialog` 和 `SessionPreview` 分别处理 workflow 多选与 session preview select。[E: components/WorkflowMultiselectDialog.tsx:37][E: components/WorkflowMultiselectDialog.tsx:43][E: components/WorkflowMultiselectDialog.tsx:96][E: components/SessionPreview.tsx:20][E: components/SessionPreview.tsx:27][E: components/SessionPreview.tsx:78]
- `SessionBackgroundHint` 通过 AppState store 和 setter 调用 `backgroundAll`,并读取 `hasForegroundTasks` selector。[E: components/SessionBackgroundHint.tsx:27][E: components/SessionBackgroundHint.tsx:33][E: components/SessionBackgroundHint.tsx:34][E: components/SessionBackgroundHint.tsx:45][E: components/SessionBackgroundHint.tsx:64]

## 巨型组件深挖
`Feedback` 是该族最复杂的 workflow UI:它在 effect 中重置 feedback id,提交时并行调用 `submitFeedback` 和 `generateTitle`,成功后记录 analytics 并保存 feedback id,失败时写 error,还用 raw `useInput` 处理按键路径。[E: components/Feedback.tsx:175][E: components/Feedback.tsx:192][E: components/Feedback.tsx:225][E: components/Feedback.tsx:229][E: components/Feedback.tsx:230][E: components/Feedback.tsx:243][E: components/Feedback.tsx:278] 它生成 GitHub issue URL 前会 sanitize title、description 和 errors。[E: components/Feedback.tsx:397][E: components/Feedback.tsx:398][E: components/Feedback.tsx:505][E: components/Feedback.tsx:509]

## 与 hooks/AppState 接线
多数成员通过 props 和 local state 完成 workflow,`SessionBackgroundHint` 是直接读写 AppState 的例外,它使用 `useSetAppState`、`useAppStateStore` 和 `useAppState(hasForegroundTasks)`。[E: components/SessionBackgroundHint.tsx:33][E: components/SessionBackgroundHint.tsx:34][E: components/SessionBackgroundHint.tsx:64] `Stats` 与 `Feedback` 不直接写 AppState,它们通过 utility/analytics/API helper 与父级回调完成业务闭环。[E: components/Stats.tsx:152][E: components/Feedback.tsx:261][E: components/Feedback.tsx:267]

## Sources
- components/IdleReturnDialog.tsx
- components/ThinkingToggle.tsx
- components/ExitFlow.tsx
- components/ExportDialog.tsx
- components/Feedback.tsx
- components/Stats.tsx
- components/WorkflowMultiselectDialog.tsx
- components/WorktreeExitDialog.tsx
- components/SessionPreview.tsx
- components/SessionBackgroundHint.tsx

## 相关
- `subsys.session-state` 说明 session resume/background/exit 的状态背景。
- `subsys.cost-usage` 说明 `Stats` 使用的 usage 聚合背景。
