---
id: ui.teleport
title: UI Teleport 组件族
kind: subsystem
tier: T2
source: [components/TeleportResumeWrapper.tsx, components/ResumeTask.tsx, components/TeleportProgress.tsx, components/TeleportError.tsx, components/TeleportRepoMismatchDialog.tsx, components/TeleportStash.tsx]
symbols: [TeleportResumeWrapper, ResumeTask, TeleportProgress, runTeleportProgress, TeleportError, getTeleportErrors, TeleportRepoMismatchDialog, TeleportStash]
related: [subsys.ui-components, subsys.session-state, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.teleport` 是 teleport resume 的 session 选择、进度展示、本地错误处理、repo mismatch 与 stash 确认 UI 族。[I]

## 能回答的问题
- teleport resume wrapper 接哪个 hook?
- 进度组件有哪些 step 状态?
- 本地错误怎样区分 login 与 git stash?
- repo mismatch / stash 对话框在哪里维护 state?

## 族干什么
`TeleportResumeWrapper` 调用 `useTeleportResume(source)` 取得 `resumeSession`、`isResuming`、`error`、`selectedSession`,并在 wrapper 内记录 teleport started / cancelled analytics。[E: components/TeleportResumeWrapper.tsx:34][E: components/TeleportResumeWrapper.tsx:35][E: components/TeleportResumeWrapper.tsx:36][E: components/TeleportResumeWrapper.tsx:37][E: components/TeleportResumeWrapper.tsx:38][E: components/TeleportResumeWrapper.tsx:43][E: components/TeleportResumeWrapper.tsx:82] wrapper 在 resuming 时显示 `Spinner`,在错误且没有外部 `onError` 时显示本地错误 UI,否则渲染 `ResumeTask` 供用户选择 session。[E: components/TeleportResumeWrapper.tsx:104][E: components/TeleportResumeWrapper.tsx:122][E: components/TeleportResumeWrapper.tsx:157]

## 成员清单
- `TeleportResumeWrapper` 是 resume flow wrapper,接 `useTeleportResume` 与 `useKeybinding("app:interrupt")`。[E: components/TeleportResumeWrapper.tsx:23][E: components/TeleportResumeWrapper.tsx:34][E: components/TeleportResumeWrapper.tsx:35][E: components/TeleportResumeWrapper.tsx:36][E: components/TeleportResumeWrapper.tsx:37][E: components/TeleportResumeWrapper.tsx:38][E: components/TeleportResumeWrapper.tsx:103]
- `ResumeTask` 维护可恢复 code session 列表、当前 repo、loading、load error、focused index,并接 `confirm:no` 和 raw input。[E: components/ResumeTask.tsx:25][E: components/ResumeTask.tsx:33][E: components/ResumeTask.tsx:34][E: components/ResumeTask.tsx:35][E: components/ResumeTask.tsx:36][E: components/ResumeTask.tsx:41][E: components/ResumeTask.tsx:87][E: components/ResumeTask.tsx:90]
- `TeleportProgress` 渲染 progress step,`runTeleportProgress` 调用 teleport resume、checkout branch、process messages。[E: components/TeleportProgress.tsx:30][E: components/TeleportProgress.tsx:129][E: components/TeleportProgress.tsx:134][E: components/TeleportProgress.tsx:136]
- `TeleportError` 读取本地 teleport errors,把 `needsLogin` 与 `needsGitStash` 映射到不同 UI 分支。[E: components/TeleportError.tsx:21][E: components/TeleportError.tsx:33][E: components/TeleportError.tsx:40][E: components/TeleportError.tsx:43][E: components/TeleportError.tsx:120]
- `TeleportStash` 维护 git file status、loading、stashing、error 四组 state。[E: components/TeleportStash.tsx:14][E: components/TeleportStash.tsx:18][E: components/TeleportStash.tsx:20][E: components/TeleportStash.tsx:21][E: components/TeleportStash.tsx:22]
- `TeleportRepoMismatchDialog` 维护可选路径、错误消息和 validating state。[E: components/TeleportRepoMismatchDialog.tsx:15][E: components/TeleportRepoMismatchDialog.tsx:23][E: components/TeleportRepoMismatchDialog.tsx:24][E: components/TeleportRepoMismatchDialog.tsx:25]

## 巨型组件深挖
`runTeleportProgress` 用一个内部 `TeleportProgressWrapper` 持有 `TeleportProgressStep` state,先执行 `teleportResumeCodeSession(sessionId, setStep)`,再把 step 设置为 `checking_out`,然后 checkout teleported branch 并处理 resume messages。[E: components/TeleportProgress.tsx:121][E: components/TeleportProgress.tsx:122][E: components/TeleportProgress.tsx:129][E: components/TeleportProgress.tsx:130][E: components/TeleportProgress.tsx:134][E: components/TeleportProgress.tsx:136]

## 与 hooks/AppState 接线
该族不直接读 `AppState`;它通过 `useTeleportResume` hook、local React state、`useEffect` 和 keybinding 接入交互流程。[E: components/TeleportResumeWrapper.tsx:38][E: components/TeleportResumeWrapper.tsx:55][E: components/TeleportResumeWrapper.tsx:103][E: components/TeleportStash.tsx:25] `TeleportError` 在 login 分支嵌入 `ConsoleOAuthFlow`,说明 authentication UI 是通过组件组合接入的。[E: components/TeleportError.tsx:138]

## Sources
- components/TeleportResumeWrapper.tsx
- components/ResumeTask.tsx
- components/TeleportProgress.tsx
- components/TeleportError.tsx
- components/TeleportRepoMismatchDialog.tsx
- components/TeleportStash.tsx

## 相关
- `subsys.session-state` 说明 resume session 与 transcript 状态背景。
