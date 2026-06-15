---
id: ui.claude-code-hint
title: UI ClaudeCodeHint 组件族
kind: subsystem
tier: T2
source: [components/ClaudeCodeHint/]
symbols: [PluginHintMenu]
related: [subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.claude-code-hint` 是 plugin recommendation hint 的小型 confirmation UI 组件族。[I]

## 能回答的问题
- plugin recommendation hint 显示哪些选项?
- 自动 dismiss 多久触发?
- hint 结果怎样回传调用方?

## 族干什么
`PluginHintMenu` 的 props 包含 plugin name、description、marketplace name、source command 和 `onResponse` callback。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:6][E: components/ClaudeCodeHint/PluginHintMenu.tsx:7][E: components/ClaudeCodeHint/PluginHintMenu.tsx:8][E: components/ClaudeCodeHint/PluginHintMenu.tsx:9][E: components/ClaudeCodeHint/PluginHintMenu.tsx:10] 组件渲染 `PermissionDialog title="Plugin Recommendation"`,展示 source command、plugin、marketplace、optional description 和安装问题。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:50][E: components/ClaudeCodeHint/PluginHintMenu.tsx:54][E: components/ClaudeCodeHint/PluginHintMenu.tsx:59][E: components/ClaudeCodeHint/PluginHintMenu.tsx:60][E: components/ClaudeCodeHint/PluginHintMenu.tsx:63][E: components/ClaudeCodeHint/PluginHintMenu.tsx:64][E: components/ClaudeCodeHint/PluginHintMenu.tsx:66][E: components/ClaudeCodeHint/PluginHintMenu.tsx:67][E: components/ClaudeCodeHint/PluginHintMenu.tsx:70]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `PluginHintMenu` | `components/ClaudeCodeHint/PluginHintMenu.tsx` | plugin recommendation dialog,包含 yes/no/disable options 和 `Select`。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:50][E: components/ClaudeCodeHint/PluginHintMenu.tsx:38][E: components/ClaudeCodeHint/PluginHintMenu.tsx:42][E: components/ClaudeCodeHint/PluginHintMenu.tsx:45][E: components/ClaudeCodeHint/PluginHintMenu.tsx:48][E: components/ClaudeCodeHint/PluginHintMenu.tsx:73] |

## 巨型组件深挖
本族没有巨型组件;`PluginHintMenu` 是单文件薄 UI。[I] `AUTO_DISMISS_MS` 是 30000ms,effect 里用 `setTimeout` 自动回 `no`,并在 cleanup 中清 timer。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:12][E: components/ClaudeCodeHint/PluginHintMenu.tsx:23][E: components/ClaudeCodeHint/PluginHintMenu.tsx:24] `onSelect` 把 `yes`、`disable` 和默认分支分别映射到 `onResponse('yes')`、`onResponse('disable')` 和 `onResponse('no')`。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:28][E: components/ClaudeCodeHint/PluginHintMenu.tsx:29][E: components/ClaudeCodeHint/PluginHintMenu.tsx:31][E: components/ClaudeCodeHint/PluginHintMenu.tsx:32][E: components/ClaudeCodeHint/PluginHintMenu.tsx:34][E: components/ClaudeCodeHint/PluginHintMenu.tsx:35]

## 与 hooks/AppState 接线
`PluginHintMenu` 通过 props callback 回传结果;没有直接 AppState 接线是代码阅读结论。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:10][E: components/ClaudeCodeHint/PluginHintMenu.tsx:29][E: components/ClaudeCodeHint/PluginHintMenu.tsx:32][E: components/ClaudeCodeHint/PluginHintMenu.tsx:35][I] 该族复用 `PermissionDialog` 和 `Select` 形成 permission-like confirmation。[E: components/ClaudeCodeHint/PluginHintMenu.tsx:50][E: components/ClaudeCodeHint/PluginHintMenu.tsx:73]

## Sources
- components/ClaudeCodeHint/PluginHintMenu.tsx

## 相关
- `subsys.ui-components` 说明 `PermissionDialog`/`Select` 的基础交互模式。
