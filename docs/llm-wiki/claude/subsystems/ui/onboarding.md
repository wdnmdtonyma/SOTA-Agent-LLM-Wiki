---
id: ui.onboarding
title: UI Onboarding 组件族
kind: subsystem
tier: T2
source: [components/Onboarding.tsx, components/ClaudeInChromeOnboarding.tsx, components/IdeOnboardingDialog.tsx, components/IdeAutoConnectDialog.tsx, components/LanguagePicker.tsx, components/ThemePicker.tsx, components/AutoModeOptInDialog.tsx]
symbols: [Onboarding, SkippableStep, ClaudeInChromeOnboarding, IdeOnboardingDialog, IdeAutoConnectDialog, IdeDisableAutoConnectDialog, LanguagePicker, ThemePicker, AutoModeOptInDialog]
related: [subsys.ui-components, subsys.config-settings, subsys.keybindings, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.onboarding` 是首次启动、IDE 引导、Chrome extension 引导、language/theme picker 与 auto mode opt-in 的 UI 族。[I]

## 能回答的问题
- onboarding 主流程有哪些 step state?
- theme picker 如何写入 AppState?
- IDE onboarding 与 auto-connect 对话框由哪些 helper 控制?
- Chrome onboarding 如何监听用户输入?

## 族干什么
`Onboarding` 是首次启动流程入口,维护 `currentStepIndex`、`skipOAuth` 和 `oauthEnabled` state,并把 theme step 渲染为 `ThemePicker`。[E: components/Onboarding.tsx:30][E: components/Onboarding.tsx:33][E: components/Onboarding.tsx:34][E: components/Onboarding.tsx:35][E: components/Onboarding.tsx:62] OAuth step 被包在 `SkippableStep` 中,`SkippableStep` 也是该文件导出的子组件。[E: components/Onboarding.tsx:136][E: components/Onboarding.tsx:214]

## 成员清单
- `Onboarding` 和 `SkippableStep` 负责首次启动 step flow。[E: components/Onboarding.tsx:30][E: components/Onboarding.tsx:214]
- `ClaudeInChromeOnboarding` 检查 extension installed state,并用 `useInput` 接键盘输入。[E: components/ClaudeInChromeOnboarding.tsx:14][E: components/ClaudeInChromeOnboarding.tsx:19][E: components/ClaudeInChromeOnboarding.tsx:35][E: components/ClaudeInChromeOnboarding.tsx:48]
- `IdeOnboardingDialog` 与 `IdeAutoConnectDialog` 负责 IDE 初始引导和 auto-connect 开关提示。[E: components/IdeOnboardingDialog.tsx:14][E: components/IdeOnboardingDialog.tsx:149][E: components/IdeAutoConnectDialog.tsx:11][E: components/IdeAutoConnectDialog.tsx:73][E: components/IdeAutoConnectDialog.tsx:80][E: components/IdeAutoConnectDialog.tsx:150]
- `LanguagePicker` 维护语言文本和 cursor offset state。[E: components/LanguagePicker.tsx:12][E: components/LanguagePicker.tsx:19][E: components/LanguagePicker.tsx:20]
- `ThemePicker` 读取 `syntaxHighlightingDisabled`,并通过 `useSetAppState` 写回 settings。[E: components/ThemePicker.tsx:30][E: components/ThemePicker.tsx:73][E: components/ThemePicker.tsx:74][E: components/ThemePicker.tsx:85]
- `AutoModeOptInDialog` 展示 `AUTO_MODE_DESCRIPTION` 并渲染 security docs link。[E: components/AutoModeOptInDialog.tsx:10][E: components/AutoModeOptInDialog.tsx:17][E: components/AutoModeOptInDialog.tsx:73]

## 巨型组件深挖
`Onboarding` 用两个 `useKeybindings` 调用处理流程快捷键,并用 `useEffect` 驱动进入流程后的副作用。[E: components/Onboarding.tsx:37][E: components/Onboarding.tsx:192][E: components/Onboarding.tsx:198] `ThemePicker` 是该族与全局设置最紧的子件:它注册 `ThemePicker` keybinding context,显示 syntax toggle shortcut,再用 `setAppState(prev => ...)` 写入设置。[E: components/ThemePicker.tsx:75][E: components/ThemePicker.tsx:76][E: components/ThemePicker.tsx:85]

## 与 hooks/AppState 接线
`Onboarding` 本体主要用 local React state/effect/keybindings 组织 step flow。[E: components/Onboarding.tsx:33][E: components/Onboarding.tsx:37][E: components/Onboarding.tsx:192] `ThemePicker` 直接接 `useAppState` 与 `useSetAppState`,把 theme/syntax 选择写回全局 `settings`。[E: components/ThemePicker.tsx:73][E: components/ThemePicker.tsx:74][E: components/ThemePicker.tsx:85] IDE onboarding helpers 通过 config 状态决定是否显示,不是直接读 `AppState`。[E: components/IdeOnboardingDialog.tsx:149][E: components/IdeAutoConnectDialog.tsx:73][E: components/IdeAutoConnectDialog.tsx:150]

## Sources
- components/Onboarding.tsx
- components/ClaudeInChromeOnboarding.tsx
- components/IdeOnboardingDialog.tsx
- components/IdeAutoConnectDialog.tsx
- components/LanguagePicker.tsx
- components/ThemePicker.tsx
- components/AutoModeOptInDialog.tsx

## 相关
- `subsys.config-settings` 说明 onboarding seen flags 与 settings 写入背景。

