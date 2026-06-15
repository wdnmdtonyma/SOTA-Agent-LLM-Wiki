---
id: ui.lsp-recommendation
title: UI LspRecommendation 组件族
kind: subsystem
tier: T2
source: [components/LspRecommendation/]
symbols: [LspRecommendationMenu]
related: [subsys.ui-components, subsys.lsp]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.lsp-recommendation` 是 LSP plugin recommendation 的小型 confirmation UI 组件族。[I]

## 能回答的问题
- LSP recommendation hint 显示哪些选择?
- 自动 dismiss 和 response guard 怎样实现?
- 组件怎样把 extension-triggered recommendation 回传给调用方?

## 族干什么
`LspRecommendationMenu` 的 props 包含 plugin name、description、file extension 和 `onResponse` callback。[E: components/LspRecommendation/LspRecommendationMenu.tsx:6][E: components/LspRecommendation/LspRecommendationMenu.tsx:7][E: components/LspRecommendation/LspRecommendationMenu.tsx:8][E: components/LspRecommendation/LspRecommendationMenu.tsx:9] 组件渲染 `PermissionDialog title="LSP Plugin Recommendation"`,展示 LSP code intelligence 说明、plugin、optional description、triggering extension 和安装问题。[E: components/LspRecommendation/LspRecommendationMenu.tsx:60][E: components/LspRecommendation/LspRecommendationMenu.tsx:64][E: components/LspRecommendation/LspRecommendationMenu.tsx:69][E: components/LspRecommendation/LspRecommendationMenu.tsx:70][E: components/LspRecommendation/LspRecommendationMenu.tsx:72][E: components/LspRecommendation/LspRecommendationMenu.tsx:73][E: components/LspRecommendation/LspRecommendationMenu.tsx:76][E: components/LspRecommendation/LspRecommendationMenu.tsx:77][E: components/LspRecommendation/LspRecommendationMenu.tsx:80]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `LspRecommendationMenu` | `components/LspRecommendation/LspRecommendationMenu.tsx` | LSP plugin recommendation dialog,包含 yes/no/never/disable options 和 `Select`。[E: components/LspRecommendation/LspRecommendationMenu.tsx:60][E: components/LspRecommendation/LspRecommendationMenu.tsx:43][E: components/LspRecommendation/LspRecommendationMenu.tsx:47][E: components/LspRecommendation/LspRecommendationMenu.tsx:50][E: components/LspRecommendation/LspRecommendationMenu.tsx:55][E: components/LspRecommendation/LspRecommendationMenu.tsx:58][E: components/LspRecommendation/LspRecommendationMenu.tsx:83] |

## 巨型组件深挖
本族没有巨型组件;`LspRecommendationMenu` 是单文件薄 UI。[I] `AUTO_DISMISS_MS` 是 30000ms,effect 里用 `setTimeout` 自动回 `no`,并在 cleanup 中清 timer。[E: components/LspRecommendation/LspRecommendationMenu.tsx:11][E: components/LspRecommendation/LspRecommendationMenu.tsx:24][E: components/LspRecommendation/LspRecommendationMenu.tsx:25] `onSelect` 把 yes/no/never/disable 分别映射到 `onResponse` 的同名结果。[E: components/LspRecommendation/LspRecommendationMenu.tsx:29][E: components/LspRecommendation/LspRecommendationMenu.tsx:30][E: components/LspRecommendation/LspRecommendationMenu.tsx:32][E: components/LspRecommendation/LspRecommendationMenu.tsx:33][E: components/LspRecommendation/LspRecommendationMenu.tsx:35][E: components/LspRecommendation/LspRecommendationMenu.tsx:36][E: components/LspRecommendation/LspRecommendationMenu.tsx:38][E: components/LspRecommendation/LspRecommendationMenu.tsx:39]

## 与 hooks/AppState 接线
`LspRecommendationMenu` 通过 props callback 回传结果;没有直接 AppState 接线是代码阅读结论。[E: components/LspRecommendation/LspRecommendationMenu.tsx:9][E: components/LspRecommendation/LspRecommendationMenu.tsx:30][E: components/LspRecommendation/LspRecommendationMenu.tsx:33][E: components/LspRecommendation/LspRecommendationMenu.tsx:36][E: components/LspRecommendation/LspRecommendationMenu.tsx:39][I] 该组件复用 `PermissionDialog` 和 `Select`,所以 LSP recommendation 以 permission-like confirmation 形式出现。[E: components/LspRecommendation/LspRecommendationMenu.tsx:60][E: components/LspRecommendation/LspRecommendationMenu.tsx:83]

## Sources
- components/LspRecommendation/LspRecommendationMenu.tsx

## 相关
- `subsys.lsp` 说明 LSP plugin recommendation 背后的语言服务逻辑。
