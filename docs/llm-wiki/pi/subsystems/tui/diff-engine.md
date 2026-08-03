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
updated: c1019d9202
---

> Pi 现在有两套差分算法：main screen 面向可增长的 scrollback document，alternate screen 面向固定大小的 viewport frame。

## 共享前处理

两个 renderer 都在 `TuiBase` 的调度下运行，并复用 overlay 合成、line normalization/reset 和 cursor marker 提取。[E: packages/tui/src/tui.ts:325] [E: packages/tui/src/tui.ts:1063] [E: packages/tui/src/tui.ts:1124] [E: packages/tui/src/tui.ts:1153] 但上一帧状态、full redraw 判定和 terminal write 已不在旧 `tui.ts` 的单一 `TUI.doRender()` 中。[I]

## Main-screen diff

`TuiMainScreen` 保存上一帧 lines、Kitty image IDs、terminal dimensions、logical/hardware cursor rows、历史最大行数与 viewport top。[E: packages/tui/src/tui-main-screen.ts:49] [E: packages/tui/src/tui-main-screen.ts:50] [E: packages/tui/src/tui-main-screen.ts:51] [E: packages/tui/src/tui-main-screen.ts:53] [E: packages/tui/src/tui-main-screen.ts:55] [E: packages/tui/src/tui-main-screen.ts:56]

渲染顺序是 base document、overlay、cursor extraction、line resets；首次渲染可直接输出，width change 与非 Termux 的 height change触发 clear/full redraw。[E: packages/tui/src/tui-main-screen.ts:147] [E: packages/tui/src/tui-main-screen.ts:164] [E: packages/tui/src/tui-main-screen.ts:172] [E: packages/tui/src/tui-main-screen.ts:174] [E: packages/tui/src/tui-main-screen.ts:230] [E: packages/tui/src/tui-main-screen.ts:237] [E: packages/tui/src/tui-main-screen.ts:246]

普通路径逐行寻找首尾变化，只写该区间；变化落在上一 viewport 之上时无法安全就地修改历史内容，退回 full redraw。[E: packages/tui/src/tui-main-screen.ts:262] [E: packages/tui/src/tui-main-screen.ts:269] [E: packages/tui/src/tui-main-screen.ts:283] [E: packages/tui/src/tui-main-screen.ts:349] [E: packages/tui/src/tui-main-screen.ts:351] changed range 触及 Kitty image block 时会扩展到完整保留行范围，并在重画前删除旧 placement。[E: packages/tui/src/tui-main-screen.ts:110] [E: packages/tui/src/tui-main-screen.ts:120] [E: packages/tui/src/tui-main-screen.ts:133] [E: packages/tui/src/tui-main-screen.ts:358]

每个普通 changed line 先清行再写入；若 component 返回的可见宽度超过 terminal width，renderer 会记录 crash log、停止 TUI 并抛错。[E: packages/tui/src/tui-main-screen.ts:387] [E: packages/tui/src/tui-main-screen.ts:413] [E: packages/tui/src/tui-main-screen.ts:414] [E: packages/tui/src/tui-main-screen.ts:430] [E: packages/tui/src/tui-main-screen.ts:440]

## Alternate-screen diff

fullscreen 每帧先由 `renderLayoutFrame()` 生成固定高的 screen，随后合成 overlay、selection 与 flash，再抽取 cursor marker并截断超宽普通行。[E: packages/tui/src/tui-alt-screen.ts:823] [E: packages/tui/src/tui-alt-screen.ts:826] [E: packages/tui/src/tui-alt-screen.ts:828] [E: packages/tui/src/tui-alt-screen.ts:831] [E: packages/tui/src/tui-alt-screen.ts:832]

上一帧为空或 terminal 尺寸变化时 full redraw；若 changed row 涉及 image line，则按 image protocol 清 placement/屏幕并重建图片，否则只写内容不同的 screen rows。[E: packages/tui/src/tui-alt-screen.ts:837] [E: packages/tui/src/tui-alt-screen.ts:839] [E: packages/tui/src/tui-alt-screen.ts:850] [E: packages/tui/src/tui-alt-screen.ts:858] [E: packages/tui/src/tui-alt-screen.ts:864] [E: packages/tui/src/tui-alt-screen.ts:865]

不同于 main-screen 的相对 cursor/scrollback 计算，alternate-screen 直接用绝对 `row;col H` 定位每个 changed row，并把整批更新包在 synchronized output 中。[E: packages/tui/src/tui-alt-screen.ts:850] [E: packages/tui/src/tui-alt-screen.ts:866] [E: packages/tui/src/tui-alt-screen.ts:875]

## Gotchas

- “差分引擎在 `tui.ts` 的 `TUI` class 中”已失效；`tui.ts` 只保留共享前处理与调度。[E: packages/tui/src/tui.ts:365]
- main-screen 的超宽行是 hard failure；alternate-screen 会在 frame 边界做 column slice，两者不是同一错误策略。[E: packages/tui/src/tui-main-screen.ts:414] [E: packages/tui/src/tui-alt-screen.ts:833]
- fullscreen 图片变化可能扩大为 placement 级重画，所以“只改一行就只写一行”对 image frame 不成立。[E: packages/tui/src/tui-alt-screen.ts:839] [E: packages/tui/src/tui-alt-screen.ts:843]

## Sources

- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/tui.ts`
