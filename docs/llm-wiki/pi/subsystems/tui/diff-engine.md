---
id: subsys.tui.diff-engine
title: 差分渲染引擎
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui-main-screen.ts
  - packages/tui/src/tui-alt-screen.ts
  - packages/tui/src/tui.ts
symbols:
  - TuiMainScreen.doRender
  - TuiAltScreen.doRender
  - compositeTuiLine
related:
  - subsys.tui.runtime
  - subsys.tui.cursor-positioning
  - subsys.tui.layout
  - subsys.tui.alternate-screen
evidence: explicit
status: verified
updated: 086c32e745
---

> Pi 现在有两套差分算法：main screen 面向可增长的 scrollback document，alternate screen 面向固定大小的 viewport frame。

## 共享前处理

两个 renderer 都在 `TuiBase` 的调度下运行，并复用 overlay 合成、line normalization/reset 和 cursor marker 提取。[E: packages/tui/src/tui.ts:331] [E: packages/tui/src/tui.ts:1099] [E: packages/tui/src/tui.ts:1160] [E: packages/tui/src/tui.ts:1189] 但上一帧状态、full redraw 判定和 terminal write 已不在旧 `tui.ts` 的单一 `TUI.doRender()` 中。[I]

## Main-screen diff

`TuiMainScreen` 保存上一帧 lines、Kitty image IDs、terminal dimensions、logical/hardware cursor rows、历史最大行数与 viewport top。[E: packages/tui/src/tui-main-screen.ts:59] [E: packages/tui/src/tui-main-screen.ts:60] [E: packages/tui/src/tui-main-screen.ts:61] [E: packages/tui/src/tui-main-screen.ts:63] [E: packages/tui/src/tui-main-screen.ts:65] [E: packages/tui/src/tui-main-screen.ts:66]

渲染顺序是 base document、overlay、cursor extraction、line resets；首次渲染可直接输出，width change 与非 Termux 的 height change触发 clear/full redraw。[E: packages/tui/src/tui-main-screen.ts:180] [E: packages/tui/src/tui-main-screen.ts:197] [E: packages/tui/src/tui-main-screen.ts:205] [E: packages/tui/src/tui-main-screen.ts:207] [E: packages/tui/src/tui-main-screen.ts:263] [E: packages/tui/src/tui-main-screen.ts:270] [E: packages/tui/src/tui-main-screen.ts:279]

普通路径逐行寻找首尾变化，只写该区间；变化落在上一 viewport 之上时无法安全就地修改历史内容，退回 full redraw。[E: packages/tui/src/tui-main-screen.ts:295] [E: packages/tui/src/tui-main-screen.ts:302] [E: packages/tui/src/tui-main-screen.ts:316] [E: packages/tui/src/tui-main-screen.ts:382] [E: packages/tui/src/tui-main-screen.ts:384] changed range 触及 Kitty image block 时会扩展到完整保留行范围，并在重画前删除旧 placement。[E: packages/tui/src/tui-main-screen.ts:143] [E: packages/tui/src/tui-main-screen.ts:153] [E: packages/tui/src/tui-main-screen.ts:166] [E: packages/tui/src/tui-main-screen.ts:391]

每个普通 changed line 先清行再写入；若 component 返回的可见宽度超过 terminal width，renderer 会记录 crash log、停止 TUI 并抛错。[E: packages/tui/src/tui-main-screen.ts:420] [E: packages/tui/src/tui-main-screen.ts:446] [E: packages/tui/src/tui-main-screen.ts:447] [E: packages/tui/src/tui-main-screen.ts:463] [E: packages/tui/src/tui-main-screen.ts:473]

## Alternate-screen diff

fullscreen 每帧先由 `renderLayoutFrame()` 生成固定高的 screen，随后合成 overlay、selection 与 flash，再抽取 cursor marker并截断超宽普通行。[E: packages/tui/src/tui-alt-screen.ts:1250] [E: packages/tui/src/tui-alt-screen.ts:1257] [E: packages/tui/src/tui-alt-screen.ts:1259] [E: packages/tui/src/tui-alt-screen.ts:1262] [E: packages/tui/src/tui-alt-screen.ts:1263]

上一帧为空或 terminal 尺寸变化时 full redraw；若 changed row 涉及 image line，则按 image protocol 清 placement/屏幕并重建图片，否则只写内容不同的 screen rows。[E: packages/tui/src/tui-alt-screen.ts:1268] [E: packages/tui/src/tui-alt-screen.ts:1270] [E: packages/tui/src/tui-alt-screen.ts:1281] [E: packages/tui/src/tui-alt-screen.ts:1289] [E: packages/tui/src/tui-alt-screen.ts:1295] [E: packages/tui/src/tui-alt-screen.ts:1296]

不同于 main-screen 的相对 cursor/scrollback 计算，alternate-screen 直接用绝对 `row;col H` 定位每个 changed row，并把整批更新包在 synchronized output 中。[E: packages/tui/src/tui-alt-screen.ts:1281] [E: packages/tui/src/tui-alt-screen.ts:1297] [E: packages/tui/src/tui-alt-screen.ts:1306]

## Gotchas

- “差分引擎在 `tui.ts` 的 `TUI` class 中”已失效；`tui.ts` 只保留共享前处理与调度。[E: packages/tui/src/tui.ts:372]
- main-screen 的超宽行是 hard failure；alternate-screen 会在 frame 边界做 column slice，两者不是同一错误策略。[E: packages/tui/src/tui-main-screen.ts:447] [E: packages/tui/src/tui-alt-screen.ts:1264]
- fullscreen 图片变化可能扩大为 placement 级重画，所以“只改一行就只写一行”对 image frame 不成立。[E: packages/tui/src/tui-alt-screen.ts:1270] [E: packages/tui/src/tui-alt-screen.ts:1274]

## Sources

- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/tui.ts`
