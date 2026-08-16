---
id: subsys.tui.cursor-positioning
title: 硬件光标/IME 定位
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
  - packages/tui/src/tui-main-screen.ts
  - packages/tui/src/tui-alt-screen.ts
  - packages/tui/src/layout.ts
symbols:
  - CURSOR_MARKER
  - extractCursorPosition
  - positionHardwareCursor
related:
  - subsys.tui.diff-engine
  - subsys.tui.layout
  - subsys.tui.alternate-screen
evidence: explicit
status: verified
updated: 086c32e745
---

> 两种 renderer 共用 `CURSOR_MARKER` 提取协议，但 main-screen 用 scrollback-relative movement，alternate-screen 在固定 viewport 中写绝对光标坐标。

## Marker 协议

`Focusable` 只包含 `focused` flag；runtime 切换焦点时先清旧组件，再设置新组件，让组件决定是否在 render output 插入 `CURSOR_MARKER`。[E: packages/tui/src/tui.ts:63] [E: packages/tui/src/tui.ts:79] [E: packages/tui/src/tui.ts:469] [E: packages/tui/src/tui.ts:475]

共享 `extractCursorPosition()` 只从当前可见的底部 `height` 行向上扫描，使用 marker 前文本的 `visibleWidth()` 计算 column，原地删除 marker并返回 `{row,col}`。[E: packages/tui/src/tui.ts:1189] [E: packages/tui/src/tui.ts:1191] [E: packages/tui/src/tui.ts:1192] [E: packages/tui/src/tui.ts:1198] [E: packages/tui/src/tui.ts:1201] [E: packages/tui/src/tui.ts:1203]

## Main-screen 定位

main-screen 在 overlay 合成后、line reset与 diff 前提取 marker。[E: packages/tui/src/tui-main-screen.ts:205] [E: packages/tui/src/tui-main-screen.ts:207] 它同时维护内容末尾的 `cursorRow` 与 terminal 实际位置 `hardwareCursorRow`，因为 IME 定位会让两者分离。[E: packages/tui/src/tui-main-screen.ts:63] [E: packages/tui/src/tui-main-screen.ts:64]

`positionHardwareCursor()` 没有 marker 时隐藏 cursor；有 marker 时从当前 hardware row 做相对上下移动，再用 1-indexed absolute column 定位，最后按 runtime setting show/hide cursor。[E: packages/tui/src/tui-main-screen.ts:554] [E: packages/tui/src/tui-main-screen.ts:555] [E: packages/tui/src/tui-main-screen.ts:565] [E: packages/tui/src/tui-main-screen.ts:573] [E: packages/tui/src/tui-main-screen.ts:580]

即使文本行没有变化，main-screen 仍调用该定位函数，所以只有 marker 移动也能更新 IME 光标。[E: packages/tui/src/tui-main-screen.ts:324] [E: packages/tui/src/tui-main-screen.ts:325]

## Fullscreen 定位

layout engine 在普通 component 高于分配高度时寻找 marker，并通过 `lineOffset` 把 marker 所在行移入 box 的可见区域。[E: packages/tui/src/layout.ts:109] [E: packages/tui/src/layout.ts:115] [E: packages/tui/src/layout.ts:120]

alternate-screen 在 overlay/selection/flash 合成后提取 marker，并在同一个 synchronized frame buffer 中写绝对 `row;col H`；column 会 clamp 到 viewport width。[E: packages/tui/src/tui-alt-screen.ts:1257] [E: packages/tui/src/tui-alt-screen.ts:1262] [E: packages/tui/src/tui-alt-screen.ts:1281] [E: packages/tui/src/tui-alt-screen.ts:1300] [E: packages/tui/src/tui-alt-screen.ts:1301]

## Gotchas

- 提取函数会原地删除 marker；进入 diff 的 lines 不再含 marker。[E: packages/tui/src/tui.ts:1201]
- 多个 marker 同时存在时，扫描顺序选择可见区域中最靠下的行；同一行使用第一个 marker。[E: packages/tui/src/tui.ts:1192] [E: packages/tui/src/tui.ts:1194]
- main-screen 的 target column只做非负 clamp，fullscreen 额外 clamp 到 viewport width；两种 renderer 的边界行为不同。[E: packages/tui/src/tui-main-screen.ts:562] [E: packages/tui/src/tui-alt-screen.ts:1301]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/layout.ts`
