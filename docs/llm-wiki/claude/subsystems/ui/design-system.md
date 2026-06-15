---
id: ui.design-system
title: UI Design System 组件族
kind: subsystem
tier: T2
source: [components/design-system/Dialog.tsx, components/design-system/FuzzyPicker.tsx, components/design-system/ListItem.tsx, components/design-system/Tabs.tsx, components/design-system/ThemeProvider.tsx, components/design-system/ThemedText.tsx, components/design-system/ThemedBox.tsx, components/design-system/StatusIcon.tsx, components/design-system/ProgressBar.tsx, components/design-system/Divider.tsx, components/design-system/Byline.tsx, components/design-system/Pane.tsx, components/design-system/LoadingState.tsx, components/design-system/Ratchet.tsx, components/design-system/color.ts]
symbols: [Dialog, FuzzyPicker, ListItem, Tabs, Tab, ThemeProvider, useTheme, ThemedText, StatusIcon, ProgressBar, Divider, Byline, Pane]
related: [subsys.ui-components, subsys.ink-runtime]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.design-system` 是 Ink UI 的 reusable primitives: dialog、tabs、theme context、picker、list item、status icon、divider、pane 等。[I]

## 能回答的问题
- design-system 里哪些组件负责 modal/dialog?
- theme provider 暴露哪些 hook?
- tabs 怎样接 keyboard shortcuts?
- ThemedText/ThemedBox 怎样取主题?

## 族干什么
`Dialog` 是基础 dialog primitive,接 `useKeybinding("confirm:no", onCancel, ...)`。[E: components/design-system/Dialog.tsx:30][E: components/design-system/Dialog.tsx:57] `FuzzyPicker` 组合 `useSearchInput`、terminal size、focused index,用于搜索式 picker。[E: components/design-system/FuzzyPicker.tsx:68][E: components/design-system/FuzzyPicker.tsx:94][E: components/design-system/FuzzyPicker.tsx:95][E: components/design-system/FuzzyPicker.tsx:116] `ThemeProvider` 建立 `ThemeContext`,并导出 `useTheme`、`useThemeSetting`、`usePreviewTheme`。[E: components/design-system/ThemeProvider.tsx:21][E: components/design-system/ThemeProvider.tsx:43][E: components/design-system/ThemeProvider.tsx:122][E: components/design-system/ThemeProvider.tsx:144][E: components/design-system/ThemeProvider.tsx:147]

## 成员清单
- Dialog/layout primitives: `Dialog`、`Pane`、`Divider`、`Byline`。[E: components/design-system/Dialog.tsx:30][E: components/design-system/Pane.tsx:33][E: components/design-system/Divider.tsx:66][E: components/design-system/Byline.tsx:37]
- List/navigation primitives: `FuzzyPicker`、`ListItem`、`Tabs`、`Tab`。[E: components/design-system/FuzzyPicker.tsx:68][E: components/design-system/ListItem.tsx:104][E: components/design-system/Tabs.tsx:66][E: components/design-system/Tabs.tsx:261]
- Visual/status primitives: `LoadingState`、`ProgressBar`、`StatusIcon`、`Ratchet`。[E: components/design-system/LoadingState.tsx:48][E: components/design-system/ProgressBar.tsx:27][E: components/design-system/StatusIcon.tsx:72][E: components/design-system/Ratchet.tsx:10]
- Theme primitives: `ThemeProvider`、`ThemedText`、`ThemedBox`、`color`。[E: components/design-system/ThemeProvider.tsx:43][E: components/design-system/ThemedText.tsx:80][E: components/design-system/ThemedBox.tsx:56][E: components/design-system/ThemedBox.tsx:155][E: components/design-system/color.ts:9]

## 巨型组件深挖
`Tabs` 创建 `TabsContext`,根据 terminal size 和 modal scroll ref 管理 header focus,并注册左右切换 keybindings。[E: components/design-system/Tabs.tsx:56][E: components/design-system/Tabs.tsx:87][E: components/design-system/Tabs.tsx:94][E: components/design-system/Tabs.tsx:147][E: components/design-system/Tabs.tsx:182] `ThemeProvider` 同时持有 theme setting、preview theme、system theme,是 design-system color resolution 的根。[E: components/design-system/ThemeProvider.tsx:48][E: components/design-system/ThemeProvider.tsx:49][E: components/design-system/ThemeProvider.tsx:53]

## 与 hooks/AppState 接线
该族不直接读 `AppState`;它主要通过 React context、keybinding hooks、terminal size hooks 和 Ink viewport hooks 向上层组件提供 primitive 能力。[E: components/design-system/ThemeProvider.tsx:21][E: components/design-system/ThemeProvider.tsx:122][E: components/design-system/ThemeProvider.tsx:127][E: components/design-system/Tabs.tsx:147][E: components/design-system/Tabs.tsx:182][E: components/design-system/Divider.tsx:79][E: components/design-system/Ratchet.tsx:17]

## Sources
- components/design-system/Dialog.tsx
- components/design-system/FuzzyPicker.tsx
- components/design-system/ListItem.tsx
- components/design-system/Tabs.tsx
- components/design-system/ThemeProvider.tsx
- components/design-system/ThemedText.tsx
- components/design-system/ThemedBox.tsx
- components/design-system/StatusIcon.tsx
- components/design-system/ProgressBar.tsx
- components/design-system/Divider.tsx
- components/design-system/Byline.tsx
- components/design-system/Pane.tsx
- components/design-system/LoadingState.tsx
- components/design-system/Ratchet.tsx
- components/design-system/color.ts

## 相关
- `subsys.ink-runtime` 说明这些 primitives 的渲染宿主。
