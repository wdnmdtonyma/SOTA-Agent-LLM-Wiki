---
id: ui.desktop-upsell
title: UI DesktopUpsell 组件族
kind: subsystem
tier: T2
source: [components/DesktopUpsell/DesktopUpsellStartup.tsx, components/DesktopHandoff.tsx]
symbols: [DesktopUpsellStartup, getDesktopUpsellConfig, shouldShowDesktopUpsellStartup, DesktopHandoff]
related: [subsys.ui-components, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.desktop-upsell` 是 Desktop app upsell 与 handoff 的启动提示 UI 族。[I]

## 能回答的问题
- desktop upsell 默认配置在哪里?
- `shouldShowDesktopUpsellStartup` 用什么入口判断?
- startup upsell 如何进入 handoff?
- handoff 下载 URL 在哪里定义?

## 族干什么
`DesktopUpsellStartup` 提供 `getDesktopUpsellConfig`、`shouldShowDesktopUpsellStartup` 与启动 dialog 入口。[E: components/DesktopUpsell/DesktopUpsellStartup.tsx:19][E: components/DesktopUpsell/DesktopUpsellStartup.tsx:25][E: components/DesktopUpsell/DesktopUpsellStartup.tsx:37] 该组件本地维护 `showHandoff`,并记录 `tengu_desktop_upsell_shown`。[E: components/DesktopUpsell/DesktopUpsellStartup.tsx:42][E: components/DesktopUpsell/DesktopUpsellStartup.tsx:167] `DesktopHandoff` 定义 desktop docs URL 和 download URL helper。[E: components/DesktopHandoff.tsx:12][E: components/DesktopHandoff.tsx:13]

## 成员清单
- `DesktopUpsellStartup` 是启动 upsell dialog。[E: components/DesktopUpsell/DesktopUpsellStartup.tsx:37]
- `DesktopHandoff` 是打开/下载 desktop app 的 handoff 子流程。[E: components/DesktopHandoff.tsx:27]

## 巨型组件深挖
`DesktopUpsellStartup` 的复杂度集中在 gating、状态切换和 analytics;`DesktopHandoff` 的复杂度集中在 checking/prompt-download/flushing/opening/success/error 状态机。[E: components/DesktopUpsell/DesktopUpsellStartup.tsx:25][E: components/DesktopUpsell/DesktopUpsellStartup.tsx:42][E: components/DesktopHandoff.tsx:21][E: components/DesktopHandoff.tsx:32]

## 与 hooks/AppState 接线
该族不直接读 `AppState`;它通过 React state/effect、Ink input、analytics 与 desktop utility 函数接线。[E: components/DesktopUpsell/DesktopUpsellStartup.tsx:3][E: components/DesktopUpsell/DesktopUpsellStartup.tsx:6][E: components/DesktopHandoff.tsx:2][E: components/DesktopHandoff.tsx:5]

## Sources
- components/DesktopUpsell/DesktopUpsellStartup.tsx
- components/DesktopHandoff.tsx

## 相关
- `subsys.telemetry-flags` 说明 upsell analytics 事件。
