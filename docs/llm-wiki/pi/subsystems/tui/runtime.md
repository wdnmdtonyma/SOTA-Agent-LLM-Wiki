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
  - packages/tui/src/layout.ts
symbols:
  - TUI
  - TuiBase
  - TuiMainScreen
  - TuiAltScreen
  - TuiMode
  - TuiStopOptions
related:
  - subsys.tui.diff-engine
  - subsys.tui.component-model
  - subsys.tui.layout
  - subsys.tui.alternate-screen
  - surface.modes.interactive
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `pi-tui` 的 runtime 已从单一可构造 `TUI` class 拆成共享契约、共享基类和两个具体 renderer：regular main screen 与 fullscreen alternate screen。

## 运行时边界

`TUI` 现在是 interface，声明 `mode`、component tree、terminal lifecycle、focus、overlay、render request、input listener 与 terminal query 能力；它不是可构造的 runtime value。[E: packages/tui/src/tui.ts:453] `mode` 是 readonly `TuiMode`（`"regular" | "fullscreen"`），接口没有 `setMode()`。[E: packages/tui/src/tui.ts:446] [E: packages/tui/src/tui.ts:454] package root 以 type-only 形式导出 `TUI`，并分别导出 `TuiAltScreen` 和 `TuiMainScreen`。[E: packages/tui/src/index.ts:170] [E: packages/tui/src/index.ts:181] [E: packages/tui/src/index.ts:182]

`TuiBase extends Container implements TUI` 是共享实现：它持有 terminal、focus、input listeners、overlay stack 与 render scheduler，并把实际 `doRender()` 留给子类。[E: packages/tui/src/tui.ts:495] [E: packages/tui/src/tui.ts:497] [E: packages/tui/src/tui.ts:499] [E: packages/tui/src/tui.ts:524] [E: packages/tui/src/tui.ts:541]

构造函数只接受 `Terminal`、可选 `showHardwareCursor` 和可选 `logDirectory`。`clearOnShrink` 默认 `false`，由 `setClearOnShrink()` 改；pi-tui **不再**读取 coding-agent 环境变量默认（旧 `PI_CLEAR_ON_SHRINK` / hardware-cursor env 不在本包生效）。[E: packages/tui/src/tui.ts:509] [E: packages/tui/src/tui.ts:532] [E: packages/tui/src/tui.ts:579]

具体 renderer 的职责不同：

- `TuiMainScreen` 的 mode 是 `regular`，把完整 line document 写入主屏和 scrollback。[E: packages/tui/src/tui-main-screen.ts:125] [E: packages/tui/src/tui-main-screen.ts:125]
- `TuiAltScreen` 的 mode 是 `fullscreen`，实现固定大小 viewport、layout root 与独立的 screen state。[E: packages/tui/src/tui-alt-screen.ts:202] [E: packages/tui/src/tui-alt-screen.ts:203] [E: packages/tui/src/tui-alt-screen.ts:321]

因此旧的 `new TUI(...)` 调用不再成立；调用方必须选择具体 renderer。运行时改 mode 也不是改字段：上层 `stop({ preserveScreen: true })` 再构造另一个 renderer 接管同一 `Terminal`。[E: packages/tui/src/tui.ts:450] [E: packages/tui/src/tui.ts:471] [I]

## 生命周期与调度

`start()` 先执行 renderer hook，再启动 terminal input/resize callbacks、隐藏光标、查询 image cell size 并请求首帧；`stop(options?)` 先把 `stopped` 置 true，再对称执行 stop hooks、`terminal.showCursor()` 并停止 terminal，然后跑 `afterTerminalStop(options)`。[E: packages/tui/src/tui.ts:916] [E: packages/tui/src/tui.ts:918] [E: packages/tui/src/tui.ts:919] [E: packages/tui/src/tui.ts:970] [E: packages/tui/src/tui.ts:977] [E: packages/tui/src/tui.ts:978]

关 overlay 与 `setShowHardwareCursor(false)` 都经 `hideTerminalCursor()`：`stopped` 之后不再 `terminal.hideCursor()`，避免 shutdown 时扩展关掉 overlay 把 shell 光标重新藏起来。[E: packages/tui/src/tui.ts:834] [E: packages/tui/src/tui.ts:565] [E: packages/tui/src/tui.ts:747] [E: packages/tui/src/tui.ts:829]

`TuiStopOptions.preserveScreen` 表示把当前输出留给下一个接管同一 terminal 的 TUI。[E: packages/tui/src/tui.ts:448] [E: packages/tui/src/tui.ts:450] `TuiAltScreen` 在该标志下只退出 alternate screen，不把 document 打回 main scrollback；`TuiMainScreen` 提供 `captureRenderState()` / `restoreRenderState()` 以便 handoff 后继续 diff。[E: packages/tui/src/tui-alt-screen.ts:400] [E: packages/tui/src/tui-main-screen.ts:135] [E: packages/tui/src/tui-main-screen.ts:147] coding-agent `InteractiveMode` 切 regular/fullscreen 走这条 stop+recreate 路径，而不是原地改 `mode`。[I]

普通 `requestRender()` 会合并同一批请求，并通过 16ms 最小间隔进入 renderer 的 `doRender()`；force 模式先调用 `resetRenderState()`，再在 next tick 直接渲染。[E: packages/tui/src/tui.ts:507] [E: packages/tui/src/tui.ts:990] [E: packages/tui/src/tui.ts:991] [E: packages/tui/src/tui.ts:996] [E: packages/tui/src/tui.ts:1029]

输入先经过 terminal query consumers 与按注册顺序运行的 input listeners；listener 可以消费或改写 data，之后才处理 debug key、overlay focus restore 和 focused component。[E: packages/tui/src/tui.ts:1044] [E: packages/tui/src/tui.ts:1075] 全屏 renderer 正是通过该 listener 层截获滚动、导航、搜索与鼠标事件。[E: packages/tui/src/tui-alt-screen.ts:281] [E: packages/tui/src/tui-alt-screen.ts:672]

`logDirectory` 未提供时，redraw 日志关闭，crash dump 落到 OS temp。debug 开关是 `PI_TUI_DEBUG_REDRAW`，不是旧的 `PI_DEBUG_REDRAW`。权威细节在 `subsys.tui.diff-engine`。[E: packages/tui/src/tui.ts:520] [E: packages/tui/src/tui-main-screen.ts:321] [E: packages/tui/src/tui-main-screen.ts:519]

## Renderer 差异

main-screen renderer 渲染 `Container` 的无界 line document，overlay 合成后再做 scrollback-aware diff；写出时用 `BoundedTerminalWriter` 按 1 MiB chunk flush，避免 V8 字符串上限(#8028)。权威细节在 `subsys.tui.diff-engine`。[E: packages/tui/src/tui-main-screen.ts:247] [E: packages/tui/src/tui-main-screen.ts:267] [E: packages/tui/src/tui-main-screen.ts:279] [E: packages/tui/src/tui-main-screen.ts:9]

alternate-screen renderer 每帧用 terminal 宽高运行 layout engine，得到固定高度 screen，再依次合成 search highlight、jump-to-end、overlay、selection 与 flash。[E: packages/tui/src/tui-alt-screen.ts:1672] [E: packages/tui/src/tui-alt-screen.ts:1677] [E: packages/tui/src/tui-alt-screen.ts:1682] [E: packages/tui/src/tui-alt-screen.ts:1683] [E: packages/tui/src/tui-alt-screen.ts:1684]

`ViewportTUI` 只把 `setLayoutRoot()` 加到通用 `TUI` 契约上，并可通过 `isViewportTUI()` 做运行时探测；滚动、flash 等仍是具体 `TuiAltScreen` 能力，不属于通用 interface。[E: packages/tui/src/tui.ts:486] [E: packages/tui/src/tui.ts:488] [E: packages/tui/src/tui.ts:491]

## Gotchas

- `TUI.mode` 不能原地改写；fullscreen ↔ regular 需要 `stop({ preserveScreen })` 后换一个 renderer 实例。overlay 仍挂在旧实例上时，上层通常拒绝切换。[E: packages/tui/src/tui.ts:454] [E: packages/tui/src/tui.ts:450] [I]
- regular renderer 的 document 可以长于 terminal；fullscreen renderer 的最终 frame 始终受 viewport 高度约束。[E: packages/tui/src/tui-alt-screen.ts:1685]
- 全屏 layout 协议不改变普通 `Component.render(width)` 契约；同一个 layout component 在 direct render 与 viewport layout 中可能有不同的裁剪/尺寸语义。[E: packages/tui/src/tui.ts:123] [E: packages/tui/src/layout.ts:118]
- 调用方必须自己把 `showHardwareCursor` / `logDirectory` / `setClearOnShrink()` 传进 renderer；pi-tui 不再从 coding-agent env 偷默认值。[E: packages/tui/src/tui.ts:532] [E: packages/tui/src/tui.ts:579]
- `stop()` 之后 overlay `hide()` / `hideOverlay()` 仍会走空栈分支，但 `hideTerminalCursor()` 是 no-op，光标保持 `stop()` 刚恢复的可见状态。[E: packages/tui/src/tui.ts:834] [E: packages/tui/src/tui.ts:977]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/index.ts`
- `packages/tui/src/layout.ts`

## 相关

- `subsys.tui.diff-engine` — main-screen scrollback-aware line diff 与 `BoundedTerminalWriter` chunking。
- `subsys.tui.component-model` — `Component` / `Container` 树。
- `subsys.tui.layout` — fullscreen `setLayoutRoot()` 与 `ScrollView`。
- `subsys.tui.alternate-screen` — `TuiAltScreen` viewport、鼠标与 preserveScreen 退出。
- `surface.modes.interactive` — coding-agent 如何构造并在运行时替换 renderer。
