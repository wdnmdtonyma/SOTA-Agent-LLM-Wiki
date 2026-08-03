---
id: subsys.tui.component-model
title: Component 渲染模型
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
  - packages/tui/src/index.ts
  - packages/tui/src/layout-node.ts
  - packages/tui/src/components/stack.ts
symbols:
  - Component
  - Focusable
  - Container
  - LayoutComponent
related:
  - subsys.tui.runtime
  - subsys.tui.layout
  - ref.tui.component-types
evidence: explicit
status: verified
updated: c1019d9202
---

> Component 仍以 `render(width): string[]` 为最小契约；本轮新增的 stack/scroll layout 是 fullscreen renderer 可识别的增量协议，不取代 line-oriented component model。

## 基础契约

`Component` 必须实现 `render(width)` 与 `invalidate()`，可以选择实现 `handleInput()` 和 `wantsKeyRelease`。[E: packages/tui/src/tui.ts:23] [E: packages/tui/src/tui.ts:29] [E: packages/tui/src/tui.ts:34] [E: packages/tui/src/tui.ts:40] [E: packages/tui/src/tui.ts:46]

`Focusable` 是 structural interface；focus 切换时 runtime 写入组件的 `focused` flag，使 Input/Editor 决定是否输出 `CURSOR_MARKER`。[E: packages/tui/src/tui.ts:63] [E: packages/tui/src/tui.ts:69] [E: packages/tui/src/tui.ts:458] [E: packages/tui/src/tui.ts:464]

`Container` 维护 children，普通 `render(width)` 仍按 child 顺序纵向拼接所有 lines。[E: packages/tui/src/tui.ts:211] [E: packages/tui/src/tui.ts:214] [E: packages/tui/src/tui.ts:235] [E: packages/tui/src/tui.ts:238] [E: packages/tui/src/tui.ts:243] 因此 `Container` 本身不是 flex/grid layout engine。[I]

## Layout-capable components

新内部协议以 `LAYOUT_NODE` symbol 让 component 暴露 `vstack`、`hstack` 或 `scroll` node；`getLayoutNode()` 在 viewport layout 时做运行时探测。[E: packages/tui/src/layout-node.ts:3] [E: packages/tui/src/layout-node.ts:20] [E: packages/tui/src/layout-node.ts:36] [E: packages/tui/src/layout-node.ts:42] [E: packages/tui/src/layout-node.ts:48]

package root 新公开三个 concrete components：`HStack`、`ScrollView`、`VStack`，并导出相应 options/types。[E: packages/tui/src/index.ts:16] [E: packages/tui/src/index.ts:21] [E: packages/tui/src/index.ts:33] 抽象 `Stack` 与 `LAYOUT_NODE` 协议本身没有从 package root 导出，不能把它们写成稳定的用户 import surface。[E: packages/tui/src/components/stack.ts:32] [I]

`StackEntryOptions` 支持 `basis/grow/shrink/minSize/maxSize/visible`，stack 自己同步维护 component children 与 layout entries。[E: packages/tui/src/components/stack.ts:4] [E: packages/tui/src/components/stack.ts:13] [E: packages/tui/src/components/stack.ts:48] [E: packages/tui/src/components/stack.ts:61]

## 两种 render 语义

普通 renderer 或嵌套普通 component 直接调用 `render(width)`：`VStack` 纵向连接，`HStack` 在给定宽度内横向合成，`ScrollView` 返回 child 的完整 document，并不在这里按 viewport 裁剪。[E: packages/tui/src/components/v-stack.ts:10] [E: packages/tui/src/components/h-stack.ts:12] [E: packages/tui/src/components/scroll-view.ts:186]

fullscreen renderer 则读取 layout node，执行 basis/grow/shrink、clip、scroll offset、scrollbar 和固定高度 paint。[E: packages/tui/src/layout.ts:100] [E: packages/tui/src/layout.ts:164] [E: packages/tui/src/layout.ts:194] [E: packages/tui/src/layout.ts:304] [E: packages/tui/src/layout.ts:345]

## Gotchas

- 依赖 viewport height 的 `visible()` predicate 在 direct render fallback 中拿到的不是实际 terminal height；需要固定 viewport 语义时应通过 `TuiAltScreen.setLayoutRoot()` 渲染。[E: packages/tui/src/components/v-stack.ts:11] [E: packages/tui/src/tui-alt-screen.ts:156]
- `ScrollView` 强制只有一个 child；构造后 `addChild/removeChild/clear` 都会抛错。[E: packages/tui/src/components/scroll-view.ts:174] [E: packages/tui/src/components/scroll-view.ts:178] [E: packages/tui/src/components/scroll-view.ts:182]
- 公开 concrete component catalog 从 12 增至 15；内部 `Stack` 与 `AltScreenFlashContainer` 不应计入该口径。[I]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/index.ts`
- `packages/tui/src/layout-node.ts`
- `packages/tui/src/components/stack.ts`
