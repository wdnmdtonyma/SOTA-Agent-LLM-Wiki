---
id: subsys.tui.layout
title: Viewport 布局与 ScrollView
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/layout-node.ts
  - packages/tui/src/layout.ts
  - packages/tui/src/components/stack.ts
  - packages/tui/src/components/h-stack.ts
  - packages/tui/src/components/v-stack.ts
  - packages/tui/src/components/scroll-view.ts
symbols:
  - LayoutNode
  - renderLayoutFrame
  - HStack
  - VStack
  - ScrollView
related:
  - subsys.tui.component-model
  - subsys.tui.runtime
  - subsys.tui.alternate-screen
  - subsys.tui.diff-engine
evidence: explicit
status: verified
updated: a8ee03b815
---

> 新 viewport layout engine 把 line-oriented components 组织为固定尺寸的 stack/scroll 几何树，并负责 clip、scrollbar、图片裁剪与 pointer hit testing。

## 布局协议

内部 `LayoutNode` union 包含 `vstack`、`hstack` 与 `scroll`；stack entry 可声明 basis、grow、shrink、min/max 和 viewport-dependent visibility。[E: packages/tui/src/layout-node.ts:10] [E: packages/tui/src/layout-node.ts:17] [E: packages/tui/src/layout-node.ts:20] [E: packages/tui/src/layout-node.ts:36] [E: packages/tui/src/layout-node.ts:42]

`Stack` 同步维护 children 与 layout entries；尺寸分配先用 basis 或 intrinsic size，再在 min/max 约束下按 grow 或 `shrink * currentSize` 分摊空间。[E: packages/tui/src/components/stack.ts:32] [E: packages/tui/src/components/stack.ts:48] [E: packages/tui/src/components/stack.ts:113] [E: packages/tui/src/components/stack.ts:119] [E: packages/tui/src/components/stack.ts:135]

`VStack` 纵向排列，`HStack` 横向分配宽度并支持 cross-axis `stretch/start/center/end`。[E: packages/tui/src/components/v-stack.ts:3] [E: packages/tui/src/components/h-stack.ts:5] [E: packages/tui/src/layout.ts:164] [E: packages/tui/src/layout.ts:216]

## ScrollView

`ScrollView` 只支持 vertical axis，并公开 follow-end、primary、overscroll chain/contain 与 hidden/auto/always scrollbar。[E: packages/tui/src/components/scroll-view.ts:4] [E: packages/tui/src/components/scroll-view.ts:6] [E: packages/tui/src/components/scroll-view.ts:8] [E: packages/tui/src/components/scroll-view.ts:9] [E: packages/tui/src/components/scroll-view.ts:10] [E: packages/tui/src/components/scroll-view.ts:11]

`scrollBy()` 返回未消费的 delta，供 nested ScrollView 继续向外 chain；follow-end 会在内容增长时更新到新的 bottom，手动离开底部后停止追随。[E: packages/tui/src/components/scroll-view.ts:124] [E: packages/tui/src/components/scroll-view.ts:137] [E: packages/tui/src/components/scroll-view.ts:163] [E: packages/tui/src/components/scroll-view.ts:168]

`always` scrollbar在宽度大于 1 时永久保留最右列；`auto` 只在滚动/hover activity 后暂时显示，并覆盖内容列而不永久占宽。[E: packages/tui/src/components/scroll-view.ts:65] [E: packages/tui/src/components/scroll-view.ts:80] [E: packages/tui/src/components/scroll-view.ts:84]

## Frame 构建与绘制

`renderLayoutFrame()` 每帧创建 render cache和 `LayoutBox` tree，把 root 限制在 terminal width/height，然后 paint 到固定高度 lines。[E: packages/tui/src/layout.ts:345] [E: packages/tui/src/layout.ts:353] [E: packages/tui/src/layout.ts:359] [E: packages/tui/src/layout.ts:365] [E: packages/tui/src/layout.ts:366]

paint 只遍历 clip 内的 rows；Kitty image 在 box bottom 或滚动 viewport top 被裁切时重建 placement，最后再绘制 scrollbar thumb。[E: packages/tui/src/layout.ts:304] [E: packages/tui/src/layout.ts:307] [E: packages/tui/src/layout.ts:313] [E: packages/tui/src/layout.ts:325] [E: packages/tui/src/layout.ts:342]

scrollbar thumb 最少 2 行（track 不足时跟随 track），位置按 content/viewport 比例计算；`getScrollViewsAt()` 返回命中点的 ScrollViews，按 deepest-first 排序。[E: packages/tui/src/layout.ts:266] [E: packages/tui/src/layout.ts:272] [E: packages/tui/src/layout.ts:279] [E: packages/tui/src/layout.ts:392] [E: packages/tui/src/layout.ts:400]

## Gotchas

- `LAYOUT_NODE`、`LayoutNode` 和 `renderLayoutFrame()` 没有从 package root 导出；公开 authoring surface 是 `HStack/VStack/ScrollView`，不是自定义 layout node。[E: packages/tui/src/index.ts:16] [E: packages/tui/src/index.ts:21] [E: packages/tui/src/index.ts:33]
- 多个 explicit `primary:true` 没有唯一性校验；遍历时后遇到的 primary 会覆盖前者。[E: packages/tui/src/layout.ts:147]
- `align` 目前只在 HStack 的 cross-axis 分支消费；不要把它描述成 VStack 的水平对齐能力。[E: packages/tui/src/layout.ts:216]

## Sources

- `packages/tui/src/layout-node.ts`
- `packages/tui/src/layout.ts`
- `packages/tui/src/components/stack.ts`
- `packages/tui/src/components/h-stack.ts`
- `packages/tui/src/components/v-stack.ts`
- `packages/tui/src/components/scroll-view.ts`
