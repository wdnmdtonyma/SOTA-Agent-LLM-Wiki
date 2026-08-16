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
updated: 086c32e745
---

> Overlay 是 `TuiBase` 的 renderer-neutral 能力：共享栈管理位置、可见性和焦点恢复，main-screen 与 alternate-screen 在各自 frame diff 前调用同一合成器。

## 栈与句柄

`showOverlay()` 记录 component、options、先前焦点、hidden 状态和单调递增的 `focusOrder`；可见且非 `nonCapturing` 的 overlay 会取得焦点。[E: packages/tui/src/tui.ts:549] [E: packages/tui/src/tui.ts:550] [E: packages/tui/src/tui.ts:553] [E: packages/tui/src/tui.ts:555] [E: packages/tui/src/tui.ts:559]

返回的 handle 区分删除 entry 的 `hide()` 与保留 entry 的 `setHidden()`，并支持 bring-to-front 的 `focus()`、显式恢复目标的 `unfocus()` 及状态查询。[E: packages/tui/src/tui.ts:567] [E: packages/tui/src/tui.ts:582] [E: packages/tui/src/tui.ts:603] [E: packages/tui/src/tui.ts:609] [E: packages/tui/src/tui.ts:640]

topmost capturing overlay 按 `focusOrder` 选择，而不是数组位置；`nonCapturing` entry 仍被渲染，但不会成为 fallback focus target。[E: packages/tui/src/tui.ts:682] [E: packages/tui/src/tui.ts:685] [E: packages/tui/src/tui.ts:686]

## 布局与合成

overlay width/maxHeight 先按 terminal 尺寸和 margin 解析，支持 absolute/percentage row/col、anchor 与 offsets，最终 clamp 在可用边界内。[E: packages/tui/src/tui.ts:964] [E: packages/tui/src/tui.ts:983] [E: packages/tui/src/tui.ts:987] [E: packages/tui/src/tui.ts:1009] [E: packages/tui/src/tui.ts:1054] [E: packages/tui/src/tui.ts:1058]

`compositeOverlays()` 过滤 visible entries、按 `focusOrder` 升序渲染，先确定宽度再以真实渲染高度重新定位，并把短 base document pad 到至少一个 viewport 高度。[E: packages/tui/src/tui.ts:1099] [E: packages/tui/src/tui.ts:1107] [E: packages/tui/src/tui.ts:1114] [E: packages/tui/src/tui.ts:1125] [E: packages/tui/src/tui.ts:1134]

overlay line 在按列合成前会被防御性截断；底层 `compositeTuiLine()` 遇到 image line 会保留 base image，普通文本则按 terminal columns 拼接并限制总宽。[E: packages/tui/src/tui.ts:1150] [E: packages/tui/src/tui.ts:1152] [E: packages/tui/src/tui.ts:253] [E: packages/tui/src/tui.ts:260] [E: packages/tui/src/tui.ts:278]

## 与两种 renderer 的关系

main-screen 在生成完整 document 后合成 overlays，再提取 cursor marker和做 scrollback diff。[E: packages/tui/src/tui-main-screen.ts:197] [E: packages/tui/src/tui-main-screen.ts:205] [E: packages/tui/src/tui-main-screen.ts:207]

alternate-screen 在 layout frame 后合成 overlays，再叠加 selection 与 flash；overlay 不属于 layout tree，也不跟随 ScrollView 的 clip/scrollTop。[E: packages/tui/src/tui-alt-screen.ts:1250] [E: packages/tui/src/tui-alt-screen.ts:1257] [E: packages/tui/src/tui-alt-screen.ts:1259] [I]

## Gotchas

- `hideOverlay()` 删除数组最后一个 entry，不按 visual `focusOrder` 查找；bring-to-front 后的视觉顶层不一定等于数组尾。[E: packages/tui/src/tui.ts:645] [E: packages/tui/src/tui.ts:646] [E: packages/tui/src/tui.ts:650]
- `visible()` 使用当前 terminal columns/rows 动态判断；input path 会重新验证 focused overlay，必要时迁移焦点。[E: packages/tui/src/tui.ts:673] [E: packages/tui/src/tui.ts:676] [E: packages/tui/src/tui.ts:864]
- fullscreen 的 selection/flash 在 overlay 之后合成，不能假设 overlay 永远是最终视觉层。[E: packages/tui/src/tui-alt-screen.ts:1257] [E: packages/tui/src/tui-alt-screen.ts:1259] [E: packages/tui/src/tui-alt-screen.ts:1260]

## Sources

- `packages/tui/src/tui.ts`
- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
