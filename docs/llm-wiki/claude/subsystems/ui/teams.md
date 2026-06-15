---
id: ui.teams
title: UI Teams 组件族
kind: subsystem
tier: T2
source: [components/teams/TeamsDialog.tsx, components/teams/TeamStatus.tsx, components/TeammateViewHeader.tsx]
symbols: [TeamsDialog, TeamStatus, TeammateViewHeader]
related: [subsys.ui-components, subsys.swarm, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.teams` 是 team / teammate 管理的终端 dialog 与 footer 状态家族,面向 swarm team lead 查看、切换、隐藏、终止 teammate。[I]

## 能回答的问题
- `TeamsDialog` 能对 teammate 做哪些操作?
- team footer 从哪里取得 teammate 数?
- teammate transcript header 怎样找到当前 viewed teammate?
- team UI 怎样接到 permission mode 和 AppState?

## 族干什么
`TeamsDialog` 注册 `teams-dialog` overlay,用 `initialTeams` 初始化当前 team,并每秒刷新 teammate status。[E: components/teams/TeamsDialog.tsx:53][E: components/teams/TeamsDialog.tsx:59][E: components/teams/TeamsDialog.tsx:78][E: components/teams/TeamsDialog.tsx:79] `TeamsDialog` 读取 `toolPermissionContext.isBypassPermissionsModeAvailable`,用于循环 teammate permission mode。[E: components/teams/TeamsDialog.tsx:86][E: components/teams/TeamsDialog.tsx:99][E: components/teams/TeamsDialog.tsx:103] `TeamStatus` 从 `AppState.teamContext` 派生非 `team-lead` teammate 数,没有 teammate 时返回 null。[E: components/teams/TeamStatus.tsx:20][E: components/teams/TeamStatus.tsx:23][E: components/teams/TeamStatus.tsx:30]

## 成员清单
- `TeamsDialog` 是 team 管理 modal,入口在 `components/teams/TeamsDialog.tsx`。[E: components/teams/TeamsDialog.tsx:48]
- `TeamStatus` 是 footer 状态组件,显示 teammate count 和 Enter hint。[E: components/teams/TeamStatus.tsx:14][E: components/teams/TeamStatus.tsx:35][E: components/teams/TeamStatus.tsx:43][E: components/teams/TeamStatus.tsx:57]
- `TeammateViewHeader` 是查看 teammate transcript 时的 header,通过 selector 找当前 teammate task。[E: components/TeammateViewHeader.tsx:14][E: components/TeammateViewHeader.tsx:80]

## 巨型组件深挖
`TeamsDialog` 在一个 dialog 内处理 teammate list/detail 两层状态,Enter 进入详情或切换到 tmux pane,k/s/h/H/p 分别覆盖 kill、shutdown、hide/show、hide/show all、prune idle teammates。[E: components/teams/TeamsDialog.tsx:37][E: components/teams/TeamsDialog.tsx:40][E: components/teams/TeamsDialog.tsx:135][E: components/teams/TeamsDialog.tsx:137][E: components/teams/TeamsDialog.tsx:144][E: components/teams/TeamsDialog.tsx:151][E: components/teams/TeamsDialog.tsx:153][E: components/teams/TeamsDialog.tsx:166][E: components/teams/TeamsDialog.tsx:169][E: components/teams/TeamsDialog.tsx:178][E: components/teams/TeamsDialog.tsx:182][E: components/teams/TeamsDialog.tsx:194][E: components/teams/TeamsDialog.tsx:199][E: components/teams/TeamsDialog.tsx:208][E: components/teams/TeamsDialog.tsx:211]

## 与 hooks/AppState 接线
`TeamsDialog` 用 `useSetAppState` 支持 kill teammate 后更新 state,并通过 `useAppState` 读取 bypass-permission 可用性。[E: components/teams/TeamsDialog.tsx:56][E: components/teams/TeamsDialog.tsx:86] `TeammateViewHeader` 用 `useAppState` 读取 `getViewedTeammateTask(s)`,再用 teammate color 和 prompt 渲染 header。[E: components/TeammateViewHeader.tsx:16][E: components/TeammateViewHeader.tsx:22][E: components/TeammateViewHeader.tsx:62]

## Sources
- components/teams/TeamsDialog.tsx
- components/teams/TeamStatus.tsx
- components/TeammateViewHeader.tsx

## 相关
- `subsys.swarm` 说明 team、teammate、backend 与 mailbox。
- `subsys.session-state` 说明 `teamContext` 与 viewed teammate selector。
