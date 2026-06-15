---
id: ui.status-indicators
title: UI Status Indicators 组件族
kind: subsystem
tier: T2
source: [components/ContextVisualization.tsx, components/ContextSuggestions.tsx, components/CostThresholdDialog.tsx, components/DevBar.tsx, components/EffortCallout.tsx, components/EffortIndicator.ts, components/FastIcon.tsx, components/InterruptedByUser.tsx, components/PrBadge.tsx, components/StatusLine.tsx, components/StatusNotices.tsx, components/TokenWarning.tsx, components/ToolUseLoader.tsx]
symbols: [ContextVisualization, ContextSuggestions, CostThresholdDialog, DevBar, EffortCallout, shouldShowEffortCallout, getEffortNotificationText, effortLevelToSymbol, FastIcon, getFastIconString, InterruptedByUser, PrBadge, StatusLine, StatusNotices, TokenWarning, ToolUseLoader]
related: [subsys.ui-components, subsys.cost-usage, subsys.hooks-feature, subsys.session-state, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.status-indicators` 是上下文 token、cost threshold、dev bar、effort、fast mode、PR badge、status line、status notices、token warning 与 loader 的状态提示 UI 族。[I]

## 能回答的问题
- custom status line 怎样从 AppState 和 hooks command 生成?
- effort callout 和 effort indicator 分别负责什么?
- token warning 如何订阅外部 store?
- context visualization 展示哪些 token breakdown?

## 族干什么
该族集中处理“当前会话状态可视化”: `ContextVisualization` 渲染 token/category breakdown,`CostThresholdDialog` 展示花费提示,`StatusLine` 通过 status-line command 生成底部状态文本,`TokenWarning` 订阅 token warning store。[E: components/ContextVisualization.tsx:105][E: components/CostThresholdDialog.tsx:9][E: components/StatusLine.tsx:210][E: components/TokenWarning.tsx:48]

## 成员清单
- `ContextVisualization` 渲染 context/token breakdown。[E: components/ContextVisualization.tsx:105][E: components/ContextVisualization.tsx:193][E: components/ContextVisualization.tsx:225]
- `CostThresholdDialog` 是 spending/cost warning dialog。[E: components/CostThresholdDialog.tsx:9][E: components/CostThresholdDialog.tsx:16]
- `DevBar` 用 `getSlowOperations` 填充 slow ops state,并用 interval 刷新。[E: components/DevBar.tsx:11][E: components/DevBar.tsx:13][E: components/DevBar.tsx:23]
- `EffortCallout` 展示 effort selector,`EffortIndicator.ts` 提供 notification text 与 symbol helper。[E: components/EffortCallout.tsx:20][E: components/EffortCallout.tsx:169][E: components/EffortCallout.tsx:219][E: components/EffortIndicator.ts:18][E: components/EffortIndicator.ts:27]
- `FastIcon` 与 `getFastIconString` 渲染 fast mode marker。[E: components/FastIcon.tsx:12][E: components/FastIcon.tsx:36]
- `InterruptedByUser`、`PrBadge`、`StatusNotices`、`ToolUseLoader` 是短状态输出组件。[E: components/InterruptedByUser.tsx:4][E: components/PrBadge.tsx:11][E: components/StatusNotices.tsx:18][E: components/ToolUseLoader.tsx:11]
- `TokenWarning` 用 `useSyncExternalStore` 订阅 token warning snapshot。[E: components/TokenWarning.tsx:48][E: components/TokenWarning.tsx:87]
- `ContextSuggestions` 渲染 context-reduction 建议列表（severity 图标 + 标题 + 预计节省 token + 详情）；无建议时返回 null。[E: components/ContextSuggestions.tsx:11][E: components/ContextSuggestions.tsx:16][E: components/ContextSuggestions.tsx:44]

## 巨型组件深挖
`StatusLine` 是该族的最大接线点:它根据 settings 判断是否显示,构造 `StatusLineCommandInput`,读取当前 usage,订阅 permission mode、additional working directories 与 `statusLineText`,再执行 `executeStatusLineCommand` 并把结果写回 AppState。[E: components/StatusLine.tsx:34][E: components/StatusLine.tsx:36][E: components/StatusLine.tsx:45][E: components/StatusLine.tsx:144][E: components/StatusLine.tsx:145][E: components/StatusLine.tsx:146][E: components/StatusLine.tsx:147][E: components/StatusLine.tsx:209][E: components/StatusLine.tsx:210][E: components/StatusLine.tsx:212][E: components/StatusLine.tsx:216]

## 与 hooks/AppState 接线
`StatusLine` 直接接 `useAppState` / `useSetAppState` 并调用 hooks subsystem 的 `executeStatusLineCommand`。[E: components/StatusLine.tsx:144][E: components/StatusLine.tsx:147][E: components/StatusLine.tsx:210] 其他成员主要通过 local state/effect、settings、external store 或 props 渲染状态,不直接改 AppState。[E: components/DevBar.tsx:13][E: components/EffortCallout.tsx:45][E: components/TokenWarning.tsx:48]

## Sources
- components/ContextVisualization.tsx
- components/ContextSuggestions.tsx
- components/CostThresholdDialog.tsx
- components/DevBar.tsx
- components/EffortCallout.tsx
- components/EffortIndicator.ts
- components/FastIcon.tsx
- components/InterruptedByUser.tsx
- components/PrBadge.tsx
- components/StatusLine.tsx
- components/StatusNotices.tsx
- components/TokenWarning.tsx
- components/ToolUseLoader.tsx

## 相关
- `subsys.hooks-feature` 说明 status line command 执行路径。
