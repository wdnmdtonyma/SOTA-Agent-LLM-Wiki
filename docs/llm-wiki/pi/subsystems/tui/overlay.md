---
id: subsys.tui.overlay
title: Overlay 栈、布局与焦点恢复
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
  - packages/tui/src/tui-main-screen.ts
  - packages/tui/src/tui-alt-screen.ts
  - packages/tui/src/components/select-list.ts
  - packages/tui/src/components/settings-list.ts
symbols:
  - OverlayOptions
  - OverlayHandle
  - TuiBase.showOverlay
  - TuiBase.compositeOverlays
related:
  - subsys.tui.runtime
  - subsys.tui.diff-engine
  - subsys.tui.alternate-screen
evidence: explicit
status: verified
updated: 71dca871bc
---

> Overlay 是 `TuiBase` 的 renderer-neutral 能力：共享栈管理位置、可见性和焦点恢复，main-screen 与 alternate-screen 在各自 frame diff 前调用同一合成器。

## 栈与句柄

`showOverlay()` 记录 component、options、先前焦点、hidden 状态和单调递增的 `focusOrder`；可见且非 `nonCapturing` 的 overlay 会取得焦点。[E: packages/tui/src/tui.ts:865] [E: packages/tui/src/tui.ts:866] [E: packages/tui/src/tui.ts:689] [E: packages/tui/src/tui.ts:691] [E: packages/tui/src/tui.ts:695]

返回的 handle 区分删除 entry 的 `hide()` 与保留 entry 的 `setHidden()`，并支持 bring-to-front 的 `focus()`、显式恢复目标的 `unfocus()` 及状态查询。[E: packages/tui/src/tui.ts:703] [E: packages/tui/src/tui.ts:718] [E: packages/tui/src/tui.ts:270]

topmost capturing overlay 按 `focusOrder` 选择，而不是数组位置；`nonCapturing` entry 仍被渲染，但不会成为 fallback focus target。[E: packages/tui/src/tui.ts:862] [E: packages/tui/src/tui.ts:865] [E: packages/tui/src/tui.ts:866]

## 布局与合成

overlay width/maxHeight 先按 terminal 尺寸和 margin 解析，支持 absolute/percentage row/col、anchor 与 offsets，最终 clamp 在可用边界内。[E: packages/tui/src/tui.ts:1144] [E: packages/tui/src/tui.ts:1153] [E: packages/tui/src/tui.ts:215]

`compositeOverlays()` 过滤 visible entries、按 `focusOrder` 升序渲染，先确定宽度再以真实渲染高度重新定位，并把短 base document pad 到至少一个 viewport 高度。[E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1292] [E: packages/tui/src/tui.ts:1293] [E: packages/tui/src/tui.ts:1299] [E: packages/tui/src/tui.ts:1327]

overlay line 在按列合成前会被防御性截断；底层 `compositeTuiLine()` 遇到 image line 会保留 base image，普通文本则按 terminal columns 拼接并限制总宽。[E: packages/tui/src/tui.ts:1343] [E: packages/tui/src/tui.ts:387] [E: packages/tui/src/tui.ts:394] [E: packages/tui/src/tui.ts:415]

## 与两种 renderer 的关系

main-screen 在生成完整 document 后合成 overlays，再提取 cursor marker 和做 scrollback diff。[E: packages/tui/src/tui-main-screen.ts:264] [E: packages/tui/src/tui-main-screen.ts:268] [E: packages/tui/src/tui-main-screen.ts:272]

alternate-screen 在 layout frame、search highlight 与 jump-to-end 之后合成 overlays，再叠加 selection 与 flash；overlay 不属于 layout tree，也不跟随 ScrollView 的 clip/scrollTop。[E: packages/tui/src/tui-alt-screen.ts:1662] [E: packages/tui/src/tui-alt-screen.ts:1664] [E: packages/tui/src/tui-alt-screen.ts:1666] [I]

## 列表 hover 不改 selection

overlay 里常见的 `SelectList` / `SettingsList` 在 left-button `press`/`click` 以及 `wheel` 时改 `selectedIndex`。[E: packages/tui/src/components/select-list.ts:111] [E: packages/tui/src/components/select-list.ts:114] [E: packages/tui/src/components/settings-list.ts:195] [E: packages/tui/src/components/settings-list.ts:198] hover（以及非左键、非 wheel）直接 return，因为可见窗口以当前 selection 为中心，hover 改选会让列表自己 recenter，随后 click 打到另一项。[E: packages/tui/src/components/select-list.ts:119] [E: packages/tui/src/components/settings-list.ts:202]

## Gotchas

- `hideOverlay()` 删除数组最后一个 entry，不按 visual `focusOrder` 查找；bring-to-front 后的视觉顶层不一定等于数组尾。[E: packages/tui/src/tui.ts:785] [E: packages/tui/src/tui.ts:786] [E: packages/tui/src/tui.ts:790]
- `visible()` 使用当前 terminal columns/rows 动态判断；input path 会重新验证 focused overlay，必要时迁移焦点。[E: packages/tui/src/tui.ts:853] [E: packages/tui/src/tui.ts:856] [E: packages/tui/src/tui.ts:801]
- fullscreen 的 selection/flash 在 overlay 之后合成，不能假设 overlay 永远是最终视觉层。[E: packages/tui/src/tui-alt-screen.ts:1664] [E: packages/tui/src/tui-alt-screen.ts:1666] [E: packages/tui/src/tui-alt-screen.ts:1667]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/components/select-list.ts`
- `packages/tui/src/components/settings-list.ts`
