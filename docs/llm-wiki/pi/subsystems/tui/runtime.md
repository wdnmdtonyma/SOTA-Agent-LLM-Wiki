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
  - TuiStopOptions
related:
  - subsys.tui.diff-engine
  - subsys.tui.component-model
  - subsys.tui.layout
  - subsys.tui.alternate-screen
  - surface.modes.interactive
evidence: explicit
status: verified
updated: 853a80d26c
---

> `pi-tui` 的 runtime 已从单一可构造 `TUI` class 拆成共享契约、共享基类和两个具体 renderer：regular main screen 与 fullscreen alternate screen。

## 运行时边界

`TUI` 现在是 interface，声明 `mode`、component tree、terminal lifecycle、focus、overlay、render request、input listener 与 terminal query 能力；它不是可构造的 runtime value。[E: packages/tui/src/tui.ts:291] `mode` 是 readonly `TuiMode`（`"regular" | "fullscreen"`），接口没有 `setMode()`。[E: packages/tui/src/tui.ts:284] [E: packages/tui/src/tui.ts:292] package root 以 type-only 形式导出 `TUI`，并分别导出 `TuiAltScreen` 和 `TuiMainScreen`。[E: packages/tui/src/index.ts:131] [E: packages/tui/src/index.ts:138] [E: packages/tui/src/index.ts:139]

`TuiBase extends Container implements TUI` 是共享实现：它持有 terminal、focus、input listeners、overlay stack 与 render scheduler，并把实际 `doRender()` 留给子类。[E: packages/tui/src/tui.ts:331] [E: packages/tui/src/tui.ts:333] [E: packages/tui/src/tui.ts:339] [E: packages/tui/src/tui.ts:356] [E: packages/tui/src/tui.ts:372]

具体 renderer 的职责不同：

- `TuiMainScreen` 的 mode 是 `regular`，把完整 line document 写入主屏和 scrollback。[E: packages/tui/src/tui-main-screen.ts:123] [E: packages/tui/src/tui-main-screen.ts:124]
- `TuiAltScreen` 的 mode 是 `fullscreen`，实现固定大小 viewport、layout root 与独立的 screen state。[E: packages/tui/src/tui-alt-screen.ts:169] [E: packages/tui/src/tui-alt-screen.ts:170] [E: packages/tui/src/tui-alt-screen.ts:262]

因此旧的 `new TUI(...)` 调用不再成立；调用方必须选择具体 renderer。运行时改 mode 也不是改字段：上层 `stop({ preserveScreen: true })` 再构造另一个 renderer 接管同一 `Terminal`。[E: packages/tui/src/tui.ts:288] [E: packages/tui/src/tui.ts:309] [I]

## 生命周期与调度

`start()` 先执行 renderer hook，再启动 terminal input/resize callbacks、隐藏光标、查询 image cell size 并请求首帧；`stop(options?)` 对称执行 stop hooks、恢复光标并停止 terminal，然后跑 `afterTerminalStop(options)`。[E: packages/tui/src/tui.ts:698] [E: packages/tui/src/tui.ts:700] [E: packages/tui/src/tui.ts:701] [E: packages/tui/src/tui.ts:710] [E: packages/tui/src/tui.ts:752] [E: packages/tui/src/tui.ts:761]

`TuiStopOptions.preserveScreen` 表示把当前输出留给下一个接管同一 terminal 的 TUI。[E: packages/tui/src/tui.ts:286] [E: packages/tui/src/tui.ts:288] `TuiAltScreen` 在该标志下只退出 alternate screen，不把 document 打回 main scrollback；`TuiMainScreen` 提供 `captureRenderState()` / `restoreRenderState()` 以便 handoff 后继续 diff。[E: packages/tui/src/tui-alt-screen.ts:338] [E: packages/tui/src/tui-main-screen.ts:134] [E: packages/tui/src/tui-main-screen.ts:146] coding-agent `InteractiveMode` 切 regular/fullscreen 走这条 stop+recreate 路径，而不是原地改 `mode`。[I]

普通 `requestRender()` 会合并同一批请求，并通过 16ms 最小间隔进入 renderer 的 `doRender()`；force 模式先调用 `resetRenderState()`，再在 next tick 直接渲染。[E: packages/tui/src/tui.ts:343] [E: packages/tui/src/tui.ts:772] [E: packages/tui/src/tui.ts:774] [E: packages/tui/src/tui.ts:778] [E: packages/tui/src/tui.ts:806] [E: packages/tui/src/tui.ts:819]

输入先经过 terminal query consumers 与按注册顺序运行的 input listeners；listener 可以消费或改写 data，之后才处理 debug key、overlay focus restore 和 focused component。[E: packages/tui/src/tui.ts:827] [E: packages/tui/src/tui.ts:834] [E: packages/tui/src/tui.ts:837] [E: packages/tui/src/tui.ts:838] [E: packages/tui/src/tui.ts:857] 全屏 renderer 正是通过该 listener 层截获滚动、导航、搜索与鼠标事件。[E: packages/tui/src/tui-alt-screen.ts:231] [E: packages/tui/src/tui-alt-screen.ts:566]

## Renderer 差异

main-screen renderer 渲染 `Container` 的无界 line document，overlay 合成后再做 scrollback-aware diff；写出时用 `BoundedTerminalWriter` 按 1 MiB chunk flush，避免 V8 字符串上限(#8028)。权威细节在 `subsys.tui.diff-engine`。[E: packages/tui/src/tui-main-screen.ts:246] [E: packages/tui/src/tui-main-screen.ts:263] [E: packages/tui/src/tui-main-screen.ts:271] [E: packages/tui/src/tui-main-screen.ts:8]

alternate-screen renderer 每帧用 terminal 宽高运行 layout engine，得到固定高度 screen，再依次合成 search highlight、overlay、selection 与 flash。[E: packages/tui/src/tui-alt-screen.ts:1310] [E: packages/tui/src/tui-alt-screen.ts:1320] [E: packages/tui/src/tui-alt-screen.ts:1321] [E: packages/tui/src/tui-alt-screen.ts:1323] [E: packages/tui/src/tui-alt-screen.ts:1324]

`ViewportTUI` 只把 `setLayoutRoot()` 加到通用 `TUI` 契约上，并可通过 `isViewportTUI()` 做运行时探测；滚动、flash 等仍是具体 `TuiAltScreen` 能力，不属于通用 interface。[E: packages/tui/src/tui.ts:322] [E: packages/tui/src/tui.ts:324] [E: packages/tui/src/tui.ts:327]

## Gotchas

- `TUI.mode` 不能原地改写；fullscreen ↔ regular 需要 `stop({ preserveScreen })` 后换一个 renderer 实例。overlay 仍挂在旧实例上时，上层通常拒绝切换。[E: packages/tui/src/tui.ts:292] [E: packages/tui/src/tui.ts:288] [I]
- regular renderer 的 document 可以长于 terminal；fullscreen renderer 的最终 frame 始终受 viewport 高度约束。[E: packages/tui/src/tui-alt-screen.ts:1322]
- 全屏 layout 协议不改变普通 `Component.render(width)` 契约；同一个 layout component 在 direct render 与 viewport layout 中可能有不同的裁剪/尺寸语义。[E: packages/tui/src/tui.ts:29] [E: packages/tui/src/layout.ts:353]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/index.ts`

## 相关

- `subsys.tui.diff-engine` — main-screen scrollback-aware line diff 与 `BoundedTerminalWriter` chunking。
- `subsys.tui.component-model` — `Component` / `Container` 树。
- `subsys.tui.layout` — fullscreen `setLayoutRoot()` 与 `ScrollView`。
- `subsys.tui.alternate-screen` — `TuiAltScreen` viewport、鼠标与 preserveScreen 退出。
- `surface.modes.interactive` — coding-agent 如何构造并在运行时替换 renderer。
