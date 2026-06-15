---
id: ui.hooks
title: UI Hooks 配置组件族
kind: subsystem
tier: T2
source: [components/hooks/HooksConfigMenu.tsx, components/hooks/PromptDialog.tsx, components/hooks/SelectEventMode.tsx, components/hooks/SelectHookMode.tsx, components/hooks/SelectMatcherMode.tsx, components/hooks/ViewHookMode.tsx]
symbols: [HooksConfigMenu, PromptDialog, SelectEventMode, SelectHookMode, SelectMatcherMode, ViewHookMode]
related: [subsys.ui-components, subsys.hooks-feature, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.hooks` 是 `components/hooks/` 下的 hooks configuration UI,用于浏览、选择 event、选择 matcher、查看 hook 和输入 prompt。[I]

## 能回答的问题
- `HooksConfigMenu` 如何接 settings change?
- hooks UI 从 AppState 读取什么?
- 选择 event/matcher/view hook 分别在哪些组件?
- prompt dialog 如何处理中断?

## 族干什么
`HooksConfigMenu` 是总入口,持有 `modeState`、policy disabled/restricted state,订阅 settings change,并读取 `AppState.mcp` 与 store。[E: components/hooks/HooksConfigMenu.tsx:51][E: components/hooks/HooksConfigMenu.tsx:66][E: components/hooks/HooksConfigMenu.tsx:67][E: components/hooks/HooksConfigMenu.tsx:68][E: components/hooks/HooksConfigMenu.tsx:83][E: components/hooks/HooksConfigMenu.tsx:87][E: components/hooks/HooksConfigMenu.tsx:88]

## 成员清单
- `HooksConfigMenu` 是 hooks config menu 入口。[E: components/hooks/HooksConfigMenu.tsx:51]
- `PromptDialog` 是 prompt input dialog,用 `app:interrupt` keybinding 调 abort。[E: components/hooks/PromptDialog.tsx:15][E: components/hooks/PromptDialog.tsx:33]
- `SelectEventMode`、`SelectHookMode`、`SelectMatcherMode` 是 event/hook/matcher 选择子模式。[E: components/hooks/SelectEventMode.tsx:27][E: components/hooks/SelectHookMode.tsx:24][E: components/hooks/SelectMatcherMode.tsx:28]
- `ViewHookMode` 是 hook detail view,并包含 config content field label/value helpers。[E: components/hooks/ViewHookMode.tsx:17][E: components/hooks/ViewHookMode.tsx:170][E: components/hooks/ViewHookMode.tsx:187]

## 巨型组件深挖
`HooksConfigMenu` 在一个组件里协调 modeState、policy 状态、settings change、MCP server 信息、AppState store、多个 cancel keybindings,因此是本族主控制器。[E: components/hooks/HooksConfigMenu.tsx:66][E: components/hooks/HooksConfigMenu.tsx:83][E: components/hooks/HooksConfigMenu.tsx:87][E: components/hooks/HooksConfigMenu.tsx:155][E: components/hooks/HooksConfigMenu.tsx:179][E: components/hooks/HooksConfigMenu.tsx:214][E: components/hooks/HooksConfigMenu.tsx:247]

## 与 hooks/AppState 接线
`HooksConfigMenu` 显式导入 `useAppState`、`useAppStateStore`、`useSettingsChange`、`useKeybinding`,这让 hooks UI 可以同时响应 settings 文件变化、MCP 状态和 overlay navigation。[E: components/hooks/HooksConfigMenu.tsx:17][E: components/hooks/HooksConfigMenu.tsx:19][E: components/hooks/HooksConfigMenu.tsx:21]

## Sources
- components/hooks/HooksConfigMenu.tsx
- components/hooks/PromptDialog.tsx
- components/hooks/SelectEventMode.tsx
- components/hooks/SelectHookMode.tsx
- components/hooks/SelectMatcherMode.tsx
- components/hooks/ViewHookMode.tsx

## 相关
- `subsys.hooks-feature` 说明 hook event 与 hook execution 契约。
