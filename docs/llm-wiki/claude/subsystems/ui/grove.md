---
id: ui.grove
title: UI Grove 组件族
kind: subsystem
tier: T2
source: [components/grove/Grove.tsx]
symbols: [GroveDialog, PrivacySettingsDialog, GroveDecision]
related: [subsys.ui-components, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.grove` 是 Grove policy / privacy opt-in 的 dialog 组件族,负责政策展示、提交、退出和 privacy settings UI。[I]

## 能回答的问题
- `GroveDialog` 返回哪些 decision?
- Grove policy viewed/submitted/dismissed/escaped 事件在哪里记录?
- `PrivacySettingsDialog` 怎样编辑 grove enabled?
- Grove UI 用哪些 Ink input hooks?

## 族干什么
`GroveDecision` 明确可返回 `accept_opt_in`、`accept_opt_out`、`defer`、`escape`、`skip_rendering`。[E: components/grove/Grove.tsx:10] `GroveDialog` 读取 Grove config 与 should-show state,并在展示、提交、dismiss、escape 路径记录 analytics。[E: components/grove/Grove.tsx:144][E: components/grove/Grove.tsx:151][E: components/grove/Grove.tsx:152][E: components/grove/Grove.tsx:168][E: components/grove/Grove.tsx:199][E: components/grove/Grove.tsx:216][E: components/grove/Grove.tsx:223]

## 成员清单
- `GroveDialog` 是 policy dialog 入口。[E: components/grove/Grove.tsx:144]
- `PrivacySettingsDialog` 是 privacy setting dialog,读取 `settings.grove_enabled` 初始化本地 state。[E: components/grove/Grove.tsx:357][E: components/grove/Grove.tsx:364]
- `GracePeriodContentBody` 与 `PostGracePeriodContentBody` 是 Grove policy content body。[E: components/grove/Grove.tsx:27][E: components/grove/Grove.tsx:91]

## 巨型组件深挖
`Grove.tsx` 一个文件内包含 policy 展示、决策提交、privacy setting 修改和 analytics,因此是本族唯一巨型组件文件。[I] `PrivacySettingsDialog` 使用 `useInput` 接受键盘选择,并在 viewed 路径记录 `tengu_grove_privacy_settings_viewed`。[E: components/grove/Grove.tsx:388][E: components/grove/Grove.tsx:461]

## 与 hooks/AppState 接线
该族没有直接读 `AppState`;它用 React `useState`、`useEffect`、Ink `useInput` 和 analytics service 接线。[E: components/grove/Grove.tsx:2][E: components/grove/Grove.tsx:3][E: components/grove/Grove.tsx:4][E: components/grove/Grove.tsx:185]

## Sources
- components/grove/Grove.tsx

## 相关
- `subsys.telemetry-flags` 说明 analytics 与 feature-flag 背景。
