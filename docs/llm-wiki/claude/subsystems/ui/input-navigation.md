---
id: ui.input-navigation
title: UI Input Navigation 组件族
kind: subsystem
tier: T2
source: [components/App.tsx, components/TagTabs.tsx, components/ConfigurableShortcutHint.tsx, components/FilePathLink.tsx, components/PressEnterToContinue.tsx, components/ValidationErrorsList.tsx, components/GlobalSearchDialog.tsx, components/HistorySearchDialog.tsx, components/QuickOpenDialog.tsx, components/LogSelector.tsx, components/FullscreenLayout.tsx, components/ScrollKeybindingHandler.tsx, components/OffscreenFreeze.tsx, components/SentryErrorBoundary.ts, screens/REPL.tsx, screens/Doctor.tsx, screens/ResumeConversation.tsx]
symbols: [App, TagTabs, ConfigurableShortcutHint, FilePathLink, PressEnterToContinue, ValidationErrorsList, GlobalSearchDialog, parseRipgrepLine, HistorySearchDialog, QuickOpenDialog, LogSelector, FullscreenLayout, useUnseenDivider, computeUnseenDivider, ScrollKeybindingHandler, modalPagerAction, OffscreenFreeze, SentryErrorBoundary, REPL, Doctor, ResumeConversation]
related: [subsys.ui-components, subsys.input-vim, subsys.keybindings, subsys.ink-runtime, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.input-navigation` 是 app shell、搜索/quick-open/history dialogs、session log selector、fullscreen transcript layout、scroll keybindings 与轻量 navigation primitives 的 UI 族。[I]

## 能回答的问题
- 全局搜索、历史搜索、quick open 分别维护哪些 state?
- `LogSelector` 为什么是巨型组件?
- fullscreen transcript 的 unseen divider 和 scroll keybinding 在哪里?
- REPL 如何把 AppState、scroll handler 和 FullscreenLayout 接起来?

## 族干什么
该族收拢终端 UI 的导航骨架: `App` 是组件入口,搜索/quick-open dialog 注册 overlay 并维护 query/results/focus state,`LogSelector` 负责 session resume list,`FullscreenLayout` 和 `ScrollKeybindingHandler` 负责 transcript scroll surface。[E: components/App.tsx:19][E: components/GlobalSearchDialog.tsx:38][E: components/GlobalSearchDialog.tsx:44][E: components/QuickOpenDialog.tsx:28][E: components/QuickOpenDialog.tsx:34][E: components/LogSelector.tsx:143][E: components/FullscreenLayout.tsx:270][E: components/ScrollKeybindingHandler.tsx:359]

## 成员清单
- Small primitives: `TagTabs`、`ConfigurableShortcutHint`、`FilePathLink`、`PressEnterToContinue`、`ValidationErrorsList`。[E: components/TagTabs.tsx:54][E: components/ConfigurableShortcutHint.tsx:33][E: components/FilePathLink.tsx:17][E: components/PressEnterToContinue.tsx:4][E: components/ValidationErrorsList.tsx:62]
- Search dialogs: `GlobalSearchDialog`、`HistorySearchDialog`、`QuickOpenDialog` 都注册 overlay 并维护搜索 state。[E: components/GlobalSearchDialog.tsx:44][E: components/GlobalSearchDialog.tsx:58][E: components/GlobalSearchDialog.tsx:61][E: components/HistorySearchDialog.tsx:32][E: components/HistorySearchDialog.tsx:36][E: components/HistorySearchDialog.tsx:37][E: components/QuickOpenDialog.tsx:34][E: components/QuickOpenDialog.tsx:47][E: components/QuickOpenDialog.tsx:48]
- `GlobalSearchDialog` 额外导出 `parseRipgrepLine` 来解析 ripgrep 输出。[E: components/GlobalSearchDialog.tsx:274][E: components/GlobalSearchDialog.tsx:331]
- Layout/scroll: `FullscreenLayout`、`useUnseenDivider`、`computeUnseenDivider`、`ScrollKeybindingHandler`、`OffscreenFreeze`、`SentryErrorBoundary`。[E: components/FullscreenLayout.tsx:86][E: components/FullscreenLayout.tsx:239][E: components/FullscreenLayout.tsx:270][E: components/ScrollKeybindingHandler.tsx:359][E: components/OffscreenFreeze.tsx:23][E: components/SentryErrorBoundary.ts:11]
- Screens: `REPL` 接主交互屏,`Doctor` 接诊断屏,`ResumeConversation` 接 resume flow 与 `LogSelector`。[E: screens/REPL.tsx:572][E: screens/Doctor.tsx:100][E: screens/ResumeConversation.tsx:67][E: screens/ResumeConversation.tsx:314]

## 巨型组件深挖
`LogSelector` 是 session navigation 的巨型组件:它维护 branch/worktree filter、rename input、expanded groups、focused node/index、view mode、preview log、tag index、agentic search state、deep search state,并用 raw `useInput` 接键盘输入。[E: components/LogSelector.tsx:193][E: components/LogSelector.tsx:194][E: components/LogSelector.tsx:195][E: components/LogSelector.tsx:205][E: components/LogSelector.tsx:214][E: components/LogSelector.tsx:215][E: components/LogSelector.tsx:216][E: components/LogSelector.tsx:217][E: components/LogSelector.tsx:218][E: components/LogSelector.tsx:220][E: components/LogSelector.tsx:230][E: components/LogSelector.tsx:302][E: components/LogSelector.tsx:303][E: components/LogSelector.tsx:1179] 它还直接渲染 `TagTabs`、`SearchBox`、`TextInput` 和 `ConfigurableShortcutHint`,说明它把多个输入 primitive 组合成 resume-session workflow UI。[E: components/LogSelector.tsx:1266][E: components/LogSelector.tsx:1283][E: components/LogSelector.tsx:1357][E: components/LogSelector.tsx:1412]

## 与 hooks/AppState 接线
`REPL` 是该族与 AppState 的最大连接点:它读取 tool permission、MCP、plugins、agent definitions、tasks、team context、pending worker/sandbox request、viewing agent task 等 selector,并取得 `setAppState`。[E: screens/REPL.tsx:618][E: screens/REPL.tsx:620][E: screens/REPL.tsx:621][E: screens/REPL.tsx:622][E: screens/REPL.tsx:631][E: screens/REPL.tsx:632][E: screens/REPL.tsx:633][E: screens/REPL.tsx:634][E: screens/REPL.tsx:639][E: screens/REPL.tsx:640] Fullscreen branch 明确组合 `ScrollKeybindingHandler` 与 `FullscreenLayout`。[E: screens/REPL.tsx:4416][E: screens/REPL.tsx:4429][E: screens/REPL.tsx:4561][E: screens/REPL.tsx:4565]

## Sources
- components/App.tsx
- components/TagTabs.tsx
- components/ConfigurableShortcutHint.tsx
- components/FilePathLink.tsx
- components/PressEnterToContinue.tsx
- components/ValidationErrorsList.tsx
- components/GlobalSearchDialog.tsx
- components/HistorySearchDialog.tsx
- components/QuickOpenDialog.tsx
- components/LogSelector.tsx
- components/FullscreenLayout.tsx
- components/ScrollKeybindingHandler.tsx
- components/OffscreenFreeze.tsx
- components/SentryErrorBoundary.ts
- screens/REPL.tsx
- screens/Doctor.tsx
- screens/ResumeConversation.tsx

## 相关
- `subsys.input-vim` 说明底层 text input state 与 Vim input。
- `subsys.keybindings` 说明 scroll/search/session navigation 的 keybinding registry。

