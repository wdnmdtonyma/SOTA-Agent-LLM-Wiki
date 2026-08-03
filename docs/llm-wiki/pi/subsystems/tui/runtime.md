---
id: subsys.tui.runtime
title: TUI 运行时与渲染循环
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
  - packages/tui/src/tui-main-screen.ts
  - packages/tui/src/tui-alt-screen.ts
  - packages/tui/src/index.ts
symbols:
  - TUI
  - TuiBase
  - TuiMainScreen
  - TuiAltScreen
  - TuiMode
related:
  - subsys.tui.diff-engine
  - subsys.tui.component-model
  - subsys.tui.layout
  - subsys.tui.alternate-screen
  - surface.modes.interactive
evidence: explicit
status: verified
updated: 305c014dcc
---

> `pi-tui` 的 runtime 已从单一可构造 `TUI` class 拆成共享契约、共享基类和两个具体 renderer：regular main screen 与 fullscreen alternate screen。

## 运行时边界

`TUI` 现在是 interface，声明 `mode`、component tree、terminal lifecycle、focus、overlay、render request、input listener 与 terminal query 能力；它不是可构造的 runtime value。[E: packages/tui/src/tui.ts:286] package root 也以 type-only 形式导出 `TUI`，并分别导出 `TuiAltScreen` 和 `TuiMainScreen`。[E: packages/tui/src/index.ts:123] [E: packages/tui/src/index.ts:129] [E: packages/tui/src/index.ts:130]

`TuiBase extends Container implements TUI` 是共享实现：它持有 terminal、focus、input listeners、overlay stack 与 render scheduler，并把实际 `doRender()` 留给子类。[E: packages/tui/src/tui.ts:325] [E: packages/tui/src/tui.ts:327] [E: packages/tui/src/tui.ts:333] [E: packages/tui/src/tui.ts:349] [E: packages/tui/src/tui.ts:365]

具体 renderer 的职责不同：

- `TuiMainScreen` 的 mode 是 `regular`，把完整 line document 写入主屏和 scrollback。[E: packages/tui/src/tui-main-screen.ts:47] [E: packages/tui/src/tui-main-screen.ts:48]
- `TuiAltScreen` 的 mode 是 `fullscreen`，实现固定大小 viewport、layout root 与独立的 screen state。[E: packages/tui/src/tui-alt-screen.ts:97] [E: packages/tui/src/tui-alt-screen.ts:98] [E: packages/tui/src/tui-alt-screen.ts:156]

因此旧的 `new TUI(...)` 调用不再成立；调用方必须选择具体 renderer。这是实际的 TypeScript/runtime API 兼容边界，即使上游 changelog 没有把它单列为 breaking change。[I]

## 生命周期与调度

`start()` 先执行 renderer hook，再启动 terminal input/resize callbacks、隐藏光标、查询 image cell size 并请求首帧；`stop()` 对称执行 stop hooks、恢复光标并停止 terminal。[E: packages/tui/src/tui.ts:680] [E: packages/tui/src/tui.ts:682] [E: packages/tui/src/tui.ts:683] [E: packages/tui/src/tui.ts:692] [E: packages/tui/src/tui.ts:734] [E: packages/tui/src/tui.ts:743]

普通 `requestRender()` 会合并同一批请求，并通过 16ms 最小间隔进入 renderer 的 `doRender()`；force 模式先调用 `resetRenderState()`，再在 next tick 直接渲染。[E: packages/tui/src/tui.ts:336] [E: packages/tui/src/tui.ts:749] [E: packages/tui/src/tui.ts:751] [E: packages/tui/src/tui.ts:767] [E: packages/tui/src/tui.ts:772] [E: packages/tui/src/tui.ts:785]

输入先经过 terminal query consumers 与按注册顺序运行的 input listeners；listener 可以消费或改写 data，之后才处理 debug key、overlay focus restore 和 focused component。[E: packages/tui/src/tui.ts:792] [E: packages/tui/src/tui.ts:800] [E: packages/tui/src/tui.ts:803] [E: packages/tui/src/tui.ts:804] [E: packages/tui/src/tui.ts:823] 全屏 renderer 正是通过该 listener 层截获滚动、导航与鼠标事件。[E: packages/tui/src/tui-alt-screen.ts:145] [E: packages/tui/src/tui-alt-screen.ts:335]

## Renderer 差异

main-screen renderer 渲染 `Container` 的无界 line document，overlay 合成后再做 scrollback-aware diff。[E: packages/tui/src/tui-main-screen.ts:147] [E: packages/tui/src/tui-main-screen.ts:164] [E: packages/tui/src/tui-main-screen.ts:172]

alternate-screen renderer 每帧用 terminal 宽高运行 layout engine，得到固定高度 screen，再依次合成 overlay、selection 与 flash。[E: packages/tui/src/tui-alt-screen.ts:819] [E: packages/tui/src/tui-alt-screen.ts:823] [E: packages/tui/src/tui-alt-screen.ts:826] [E: packages/tui/src/tui-alt-screen.ts:828] [E: packages/tui/src/tui-alt-screen.ts:829]

`ViewportTUI` 只把 `setLayoutRoot()` 加到通用 `TUI` 契约上，并可通过 `isViewportTUI()` 做运行时探测；滚动、flash 等仍是具体 `TuiAltScreen` 能力，不属于通用 interface。[E: packages/tui/src/tui.ts:316] [E: packages/tui/src/tui.ts:318] [E: packages/tui/src/tui.ts:321]

## Gotchas

- renderer 不是可热切换状态；上层设置变更需要重新创建 runtime。[I]
- regular renderer 的 document 可以长于 terminal；fullscreen renderer 的最终 frame 始终受 viewport 高度约束。[E: packages/tui/src/tui-alt-screen.ts:827]
- 全屏 layout 协议不改变普通 `Component.render(width)` 契约；同一个 layout component 在 direct render 与 viewport layout 中可能有不同的裁剪/尺寸语义。[E: packages/tui/src/tui.ts:29] [E: packages/tui/src/layout.ts:345]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/index.ts`
