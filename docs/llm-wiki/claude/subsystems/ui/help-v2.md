---
id: ui.help-v2
title: UI HelpV2 组件族
kind: subsystem
tier: T2
source: [components/HelpV2/HelpV2.tsx, components/HelpV2/Commands.tsx, components/HelpV2/General.tsx]
symbols: [HelpV2, Commands, General]
related: [subsys.ui-components, subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.help-v2` 是 help dialog 的 tabbed shell,把 general help 与 slash command help 放进同一个 modal。[I]

## 能回答的问题
- `HelpV2` 如何关闭 help dialog?
- Commands tab 如何接 tabs header focus?
- General help 和 command help 分别在哪些文件?
- HelpV2 如何适配 modal / terminal size?

## 族干什么
`HelpV2` 是总入口,读取 terminal size、modal nesting state,并用 `useKeybinding("help:dismiss", close, ...)` 关闭 help。[E: components/HelpV2/HelpV2.tsx:20][E: components/HelpV2/HelpV2.tsx:29][E: components/HelpV2/HelpV2.tsx:31][E: components/HelpV2/HelpV2.tsx:52] `Commands` 是命令列表页,调用 `useTabHeaderFocus` 与 tab header 交互。[E: components/HelpV2/Commands.tsx:17][E: components/HelpV2/Commands.tsx:30]

## 成员清单
- `HelpV2` 是 help modal shell。[E: components/HelpV2/HelpV2.tsx:20]
- `Commands` 渲染 command help 列表。[E: components/HelpV2/Commands.tsx:17]
- `General` 渲染 general help 内容。[E: components/HelpV2/General.tsx:5]

## 巨型组件深挖
`HelpV2` 不是巨型组件;它把布局、dismiss keybinding、exit-on-Ctrl-C 和 tabs 内容拆到 `HelpV2.tsx`、`Commands.tsx`、`General.tsx` 三个文件。[E: components/HelpV2/HelpV2.tsx:52][E: components/HelpV2/HelpV2.tsx:53][E: components/HelpV2/Commands.tsx:17][E: components/HelpV2/General.tsx:5]

## 与 hooks/AppState 接线
该族不直接读 `AppState`;它通过 terminal size、modal context、keybinding hooks 与上层 REPL help state 接线。[E: components/HelpV2/HelpV2.tsx:29][E: components/HelpV2/HelpV2.tsx:31][E: components/HelpV2/HelpV2.tsx:52]

## Sources
- components/HelpV2/HelpV2.tsx
- components/HelpV2/Commands.tsx
- components/HelpV2/General.tsx

## 相关
- `subsys.command-system` 说明 command list 的来源。
