---
id: ui.passes
title: UI Passes 组件族
kind: subsystem
tier: T2
source: [components/Passes/Passes.tsx]
symbols: [Passes]
related: [subsys.ui-components, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.passes` 是 guest passes/referral dialog UI,负责加载 pass status、复制 referral link、记录 analytics。[I]

## 能回答的问题
- `Passes` 维护哪些本地状态?
- guest pass link copy 事件在哪里记录?
- Passes dialog 如何处理 cancel/input?
- Passes 与 LogoV2 guest passes upsell 有什么边界?

## 族干什么
`Passes` 入口在 `components/Passes/Passes.tsx`,本地 state 包含 loading、passStatuses、isAvailable、referralLink、referrerReward。[E: components/Passes/Passes.tsx:25][E: components/Passes/Passes.tsx:28][E: components/Passes/Passes.tsx:29][E: components/Passes/Passes.tsx:30][E: components/Passes/Passes.tsx:31][E: components/Passes/Passes.tsx:32] 复制 referral link 时记录 `tengu_guest_passes_link_copied`。[E: components/Passes/Passes.tsx:48]

## 成员清单
- `Passes` 是唯一组件入口。[E: components/Passes/Passes.tsx:25]
- `PassStatus` 描述 pass 状态数据结构。[E: components/Passes/Passes.tsx:16]

## 巨型组件深挖
`Passes` 在一个文件中处理 loading 数据、cancel keybinding、raw input、analytics 和 link UI。[E: components/Passes/Passes.tsx:57][E: components/Passes/Passes.tsx:36][E: components/Passes/Passes.tsx:41][E: components/Passes/Passes.tsx:44][E: components/Passes/Passes.tsx:48][E: components/Passes/Passes.tsx:163][E: components/Passes/Passes.tsx:170]

## 与 hooks/AppState 接线
该族不直接读取 `AppState`;它通过 React state/effect、Ink `useInput`、keybinding hooks、analytics service 接到运行时。[E: components/Passes/Passes.tsx:28][E: components/Passes/Passes.tsx:29][E: components/Passes/Passes.tsx:30][E: components/Passes/Passes.tsx:31][E: components/Passes/Passes.tsx:32][E: components/Passes/Passes.tsx:33][E: components/Passes/Passes.tsx:41][E: components/Passes/Passes.tsx:44][E: components/Passes/Passes.tsx:48][E: components/Passes/Passes.tsx:53]

## Sources
- components/Passes/Passes.tsx

## 相关
- `subsys.telemetry-flags` 说明 analytics 事件背景。
