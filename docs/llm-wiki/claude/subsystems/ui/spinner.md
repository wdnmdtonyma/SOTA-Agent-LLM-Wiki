---
id: ui.spinner
title: UI Spinner 组件族
kind: subsystem
tier: T2
source: [components/Spinner.tsx, components/Spinner/SpinnerAnimationRow.tsx, components/Spinner/SpinnerGlyph.tsx, components/Spinner/TeammateSpinnerTree.tsx, components/Spinner/TeammateSpinnerLine.tsx, components/Spinner/useShimmerAnimation.ts, components/Spinner/useStalledAnimation.ts, components/Spinner/utils.ts]
symbols: [SpinnerWithVerb, Spinner, BriefIdleStatus, SpinnerAnimationRow, SpinnerGlyph, TeammateSpinnerTree, TeammateSpinnerLine, useShimmerAnimation, useStalledAnimation]
related: [subsys.ui-components, subsys.session-state, subsys.swarm]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.spinner` 是 Claude Code loading/streaming 状态、brief idle 状态、teammate tree 状态的动画组件族。[I]

## 能回答的问题
- `SpinnerWithVerb` 为什么读取 tasks、settings 和 AppState?
- 50ms animation frame 在哪个子组件里?
- teammate spinner tree 从哪里取任务?
- reduced motion 怎样影响 spinner 动画?

## 族干什么
`SpinnerWithVerb` 入口读取 `isBriefOnly` 和 `viewingAgentTaskId`,在 Kairos brief 条件满足时走 brief-only 分支。[E: components/Spinner.tsx:62][E: components/Spinner.tsx:63][E: components/Spinner.tsx:68][E: components/Spinner.tsx:77] 主 spinner 读取 settings、tasks、viewing agent、expanded view、selected IP agent index、view selection mode 和 terminal size,说明 spinner 同时受用户设置、任务状态与终端尺寸控制。[E: components/Spinner.tsx:97][E: components/Spinner.tsx:106][E: components/Spinner.tsx:107][E: components/Spinner.tsx:108][E: components/Spinner.tsx:111][E: components/Spinner.tsx:112][E: components/Spinner.tsx:120]

## 成员清单
- 顶层 `SpinnerWithVerb` 与 `Spinner` 都在 `components/Spinner.tsx`。[E: components/Spinner.tsx:62][E: components/Spinner.tsx:507]
- `SpinnerAnimationRow` owns 50ms `useAnimationFrame`,并接 `useStalledAnimation`。[E: components/Spinner/SpinnerAnimationRow.tsx:81][E: components/Spinner/SpinnerAnimationRow.tsx:103][E: components/Spinner/SpinnerAnimationRow.tsx:130]
- `SpinnerGlyph` 渲染 glyph 帧。[E: components/Spinner/SpinnerGlyph.tsx:49][E: components/Spinner/SpinnerGlyph.tsx:71]
- `TeammateSpinnerTree` 从 `AppState.tasks` 与 viewing agent state 派生 teammate tree。[E: components/Spinner/TeammateSpinnerTree.tsx:21][E: components/Spinner/TeammateSpinnerTree.tsx:31][E: components/Spinner/TeammateSpinnerTree.tsx:32]
- `TeammateSpinnerLine` 根据 terminal size 渲染 teammate 单行。[E: components/Spinner/TeammateSpinnerLine.tsx:72][E: components/Spinner/TeammateSpinnerLine.tsx:87]
- `useShimmerAnimation`、`useStalledAnimation`、`utils.ts` 提供 shimmer、stall、RGB/hue 工具。[E: components/Spinner/useShimmerAnimation.ts:6][E: components/Spinner/useStalledAnimation.ts:6][E: components/Spinner/utils.ts:14][E: components/Spinner/utils.ts:19][E: components/Spinner/utils.ts:20][E: components/Spinner/utils.ts:21][E: components/Spinner/utils.ts:22][E: components/Spinner/utils.ts:27][E: components/Spinner/utils.ts:32][E: components/Spinner/utils.ts:70]

## 巨型组件深挖
`SpinnerWithVerb` 把高频动画下沉到 `SpinnerAnimationRow`:该子组件是导出入口,内部调用 `useAnimationFrame` 产生动画时间,再调用 `useStalledAnimation` 派生 stall 状态。[E: components/Spinner/SpinnerAnimationRow.tsx:81][E: components/Spinner/SpinnerAnimationRow.tsx:103][E: components/Spinner/SpinnerAnimationRow.tsx:130]

## 与 hooks/AppState 接线
该族显式接 `useAppState`、`useTasksV2`、`useSettings`、`useTerminalSize`、`useAnimationFrame`。[E: components/Spinner.tsx:97][E: components/Spinner.tsx:106][E: components/Spinner.tsx:107][E: components/Spinner.tsx:108][E: components/Spinner.tsx:111][E: components/Spinner.tsx:112][E: components/Spinner.tsx:120][E: components/Spinner.tsx:121][E: components/Spinner.tsx:511] `Spinner` 本体用 `useSettings` 判断 reduced motion,再把 `useAnimationFrame` 的 interval 置为 null 或 120ms。[E: components/Spinner.tsx:509][E: components/Spinner.tsx:511]

## Sources
- components/Spinner.tsx
- components/Spinner/SpinnerAnimationRow.tsx
- components/Spinner/SpinnerGlyph.tsx
- components/Spinner/TeammateSpinnerTree.tsx
- components/Spinner/TeammateSpinnerLine.tsx
- components/Spinner/useShimmerAnimation.ts
- components/Spinner/useStalledAnimation.ts
- components/Spinner/utils.ts

## 相关
- `subsys.ui-components` 说明 UI 组件总体入口。
- `subsys.swarm` 说明 teammate tree 背后的 task 模型。
