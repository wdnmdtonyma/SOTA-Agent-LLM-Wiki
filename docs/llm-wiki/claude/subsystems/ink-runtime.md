---
id: subsys.ink-runtime
path: subsystems/ink-runtime.md
title: Ink 运行时
kind: subsystem
tier: T2
source: [ink/, ink.ts]
symbols: [Ink, render, createRoot, createRenderer, createReconciler]
related: [subsys.ui-components]
status: verified
evidence: explicit
updated: 2026-06-14
---

> Ink 运行时是 Claude Code 的 terminal React renderer: `ink.ts` 从本地 `./ink/root.js` 接入 runtime, `ink/ink.tsx` 用 `react-reconciler` 驱动 DOM、Yoga layout、terminal output、selection、mouse 和 alternate screen。[E: ink.ts:8][E: ink/ink.tsx:6][E: ink/ink.tsx:7][E: ink/ink.tsx:77][E: ink/ink.tsx:78][E: ink/ink.tsx:86][E: ink/ink.tsx:88][E: ink/ink.tsx:123][E: ink/ink.tsx:145][E: ink/ink.tsx:150][E: ink/ink.tsx:153]

## 能回答的问题

- `ink/` 是不是直接调用 npm `ink`, 还是 vendored/fork-like runtime?
- terminal UI 如何从 React tree 变成 ANSI frame?
- alternate screen、selection、mouse tracking 和 scroll viewport 在哪里接入?
- Claude Code 对 Ink 的主要定制点是什么?

## 职责边界

`ink.ts` 是 public facade: 它把传入 React node 包进 Claude Code 的 `ThemeProvider`, 再委托本地 `./ink/root.js` 的 `render` 或 `createRoot`。[E: ink.ts:15][E: ink.ts:22][E: ink.ts:26][E: ink.ts:29] 这个 facade 还重导出 themed `Box`/`Text`、theme hooks、base Ink components、events 和 terminal hooks。[E: ink.ts:35][E: ink.ts:37][E: ink.ts:38][E: ink.ts:44][E: ink.ts:73]

本仓 `ink/` 不是一个薄薄的 npm `ink` import; 它本地实现 reconciler host config、DOM tree、Yoga layout、frame renderer 和 terminal side effects。[E: ink/reconciler.ts:224][E: ink/dom.ts:110][E: ink/layout/yoga.ts:83][E: ink/renderer.ts:31][E: ink/ink.tsx:586] 因此应把它判断为 vendored/fork-like Ink runtime, 但本批 source 没有给出 upstream npm Ink 的版本、commit 或 patch queue, 无法证明精确 fork baseline。[I][U]

## 关键文件

- `ink.ts`: 统一注入 `ThemeProvider`, 并把 Claude Code 使用的本地 Ink API 汇总导出。[E: ink.ts:15][E: ink.ts:33]
- `ink/ink.tsx`: `Ink` class 持有 terminal IO、root node、focus manager、renderer、resize handlers、selection、cursor 和 alternate-screen 状态。[E: ink/ink.tsx:77][E: ink/ink.tsx:78][E: ink/ink.tsx:86][E: ink/ink.tsx:87][E: ink/ink.tsx:88][E: ink/ink.tsx:123][E: ink/ink.tsx:150][E: ink/ink.tsx:171][E: ink/ink.tsx:225]
- `ink/reconciler.ts`: 定义 React reconciler host config, 在 commit 后计算 layout 并调度 renderer 刷新。[E: ink/reconciler.ts:224][E: ink/reconciler.ts:278][E: ink/reconciler.ts:304]
- `ink/dom.ts`: 定义 `ink-root`、`ink-box`、`ink-text` 等 terminal DOM element, 并为可布局 node 创建 Yoga node。[E: ink/dom.ts:19][E: ink/dom.ts:121]
- `ink/renderer.ts`: 把 DOM tree 渲染成 `Output`, 根据 normal screen 或 alternate screen 决定 frame 高度、cursor 和 previous-frame diff。[E: ink/renderer.ts:31][E: ink/renderer.ts:97][E: ink/renderer.ts:132]
- `ink/components/AlternateScreen.tsx` 和 `ink/components/ScrollBox.tsx`: 分别封装 full-screen terminal mode 与 scroll viewport imperative API。[E: ink/components/AlternateScreen.tsx:50][E: ink/components/ScrollBox.tsx:10]

## 数据模型

terminal DOM 的 element 名称是固定枚举, 包括 root、box、text、virtual text、link、progress 和 raw ANSI。[E: ink/dom.ts:19] 每个 `DOMElement` 存储 dirty flag、event handlers、scrollTop、pending scroll delta、focus manager 和 debug owner chain 等运行时字段。[E: ink/dom.ts:31][E: ink/dom.ts:45][E: ink/dom.ts:51][E: ink/dom.ts:57][E: ink/dom.ts:62][E: ink/dom.ts:85][E: ink/dom.ts:90] 文本与 raw ANSI node 会设置 measure function, 让 Yoga 在 terminal cell 宽度上计算布局。[E: ink/dom.ts:125][E: ink/dom.ts:127]

layout backend 是本地 native Yoga wrapper: `YogaLayoutNode` 实现通用 `LayoutNode`, `calculateLayout(width, undefined, Direction.LTR)` 以 terminal columns 为宽度约束。[E: ink/layout/yoga.ts:54][E: ink/layout/yoga.ts:83] React container 使用 `ConcurrentRoot`, devtools 里仍标识 `rendererPackageName: 'ink'`。[E: ink/ink.tsx:262][E: ink/ink.tsx:276]

## 控制流

1. 调用方通过 `render(node, options)` 或 `createRoot(options)` 进入 facade, facade 为 node 包上 theme。[E: ink.ts:18][E: ink.ts:25]
2. `Ink` constructor 绑定 stdout/stdin/stderr、terminal 尺寸、`LogUpdate`、root DOM、focus manager 和 renderer; 它还为 root Yoga node 设置宽度并立即计算 layout。[E: ink/ink.tsx:180][E: ink/ink.tsx:233][E: ink/ink.tsx:234][E: ink/ink.tsx:236][E: ink/ink.tsx:248][E: ink/ink.tsx:249]
3. React reconciler commit 后调用 `resetAfterCommit`, 通过 root callbacks 进入 layout 与 render 输出链路。[E: ink/reconciler.ts:247][E: ink/reconciler.ts:278][E: ink/reconciler.ts:304]
4. renderer 生成 frame; alternate screen active 时 frame 高度被 clamp 到 terminal rows, normal screen 则可复用 previous screen 做 diff。[E: ink/renderer.ts:97][E: ink/renderer.ts:132]
5. `Ink.onRender()` 在 selection/search/highlight 或 layout shift 时强制 full damage, 最终调用 `this.log.render(prevFrame, frame, this.altScreenActive, SYNC_OUTPUT_SUPPORTED)` 写出 terminal frame。[E: ink/ink.tsx:559][E: ink/ink.tsx:586]

## 设计动机与权衡

Claude Code 的定制集中在 terminal app 能力, 不是通用 React host: alternate screen 会写入 enter-alt-screen、clear-screen、home 和 mouse tracking escape sequence, cleanup 时清 selection 并退出 alternate screen。[E: ink/components/AlternateScreen.tsx:50][E: ink/components/AlternateScreen.tsx:54][E: ink/components/AlternateScreen.tsx:55] `ScrollBox` 提供 `scrollTo`、`scrollToElement`、`scrollBy`、`subscribe` 和 clamp bounds, 使大 transcript 可以在 React 外部被键盘/鼠标高频驱动。[E: ink/components/ScrollBox.tsx:119][E: ink/components/ScrollBox.tsx:130][E: ink/components/ScrollBox.tsx:141][E: ink/components/ScrollBox.tsx:189][E: ink/components/ScrollBox.tsx:193][I]

event system 支持 capture/bubble listener accumulation 和 discrete/continuous/default priority, 让 terminal mouse、keyboard 和 synthetic events 能沿 DOM parent chain 分发。[E: ink/events/dispatcher.ts:46][E: ink/events/dispatcher.ts:122][E: ink/events/dispatcher.ts:161] hit testing 会按 cached rect 反向遍历 children, click 时聚焦最近的 `tabIndex` ancestor 并沿 parent chain bubble `onClick`。[E: ink/hit-test.ts:23][E: ink/hit-test.ts:34][E: ink/hit-test.ts:63][E: ink/hit-test.ts:64][E: ink/hit-test.ts:72][E: ink/hit-test.ts:86]

## Gotcha

- 不要把 `ink/` 当作外部依赖升级点; 本地 runtime 已经承担 selection、search highlight、alternate screen、mouse tracking 和 scroll viewport 等 Claude Code 专用行为。[E: ink/ink.tsx:536][E: ink/ink.tsx:559][E: ink/components/AlternateScreen.tsx:50][E: ink/components/ScrollBox.tsx:226][I]
- full-screen UI 依赖 `AlternateScreen` 的 side effect 启用 terminal alternate buffer 和 mouse tracking; 普通 `Box` 与这个 side effect 没有同一层级的关系。[E: ink/components/AlternateScreen.tsx:50][I]
- fork baseline 未在本批 source 中出现; 需要后续用 package metadata 或 upstream diff 证明 npm Ink 的具体来源。[U]

## Sources

- `ink/`
- `ink.ts`
- `ink/ink.tsx`
- `ink/reconciler.ts`
- `ink/dom.ts`
- `ink/layout/yoga.ts`
- `ink/renderer.ts`
- `ink/components/AlternateScreen.tsx`
- `ink/components/ScrollBox.tsx`
- `ink/events/dispatcher.ts`
- `ink/hit-test.ts`

## 相关

- [UI 组件族](ui-components.md)
