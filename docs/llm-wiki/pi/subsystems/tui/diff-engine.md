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
  - BoundedTerminalWriter
related:
  - subsys.tui.runtime
  - subsys.tui.cursor-positioning
  - subsys.tui.layout
  - subsys.tui.alternate-screen
evidence: explicit
status: verified
updated: 853a80d26c
---

> Pi 现在有两套差分算法：main screen 面向可增长的 scrollback document，alternate screen 面向固定大小的 viewport frame。

## 共享前处理

两个 renderer 都在 `TuiBase` 的调度下运行，并复用 overlay 合成、line normalization/reset 和 cursor marker 提取。[E: packages/tui/src/tui.ts:331] [E: packages/tui/src/tui.ts:1099] [E: packages/tui/src/tui.ts:1160] [E: packages/tui/src/tui.ts:1189] 但上一帧状态、full redraw 判定和 terminal write 已不在旧 `tui.ts` 的单一 `TUI.doRender()` 中。[I]

## Main-screen diff

`TuiMainScreen` 保存上一帧 lines、Kitty image IDs、terminal dimensions、logical/hardware cursor rows、历史最大行数与 viewport top。[E: packages/tui/src/tui-main-screen.ts:125] [E: packages/tui/src/tui-main-screen.ts:126] [E: packages/tui/src/tui-main-screen.ts:127] [E: packages/tui/src/tui-main-screen.ts:129] [E: packages/tui/src/tui-main-screen.ts:131] [E: packages/tui/src/tui-main-screen.ts:132]

渲染顺序是 base document、overlay、cursor extraction、line resets；首次渲染可直接输出，width change 与非 Termux 的 height change触发 clear/full redraw。[E: packages/tui/src/tui-main-screen.ts:246] [E: packages/tui/src/tui-main-screen.ts:263] [E: packages/tui/src/tui-main-screen.ts:271] [E: packages/tui/src/tui-main-screen.ts:273] [E: packages/tui/src/tui-main-screen.ts:330] [E: packages/tui/src/tui-main-screen.ts:337] [E: packages/tui/src/tui-main-screen.ts:346]

普通路径逐行寻找首尾变化，只写该区间；变化落在上一 viewport 之上时无法安全就地修改历史内容，退回 full redraw。[E: packages/tui/src/tui-main-screen.ts:362] [E: packages/tui/src/tui-main-screen.ts:369] [E: packages/tui/src/tui-main-screen.ts:383] [E: packages/tui/src/tui-main-screen.ts:450] [E: packages/tui/src/tui-main-screen.ts:452] changed range 触及 Kitty image block 时会扩展到完整保留行范围，并在重画前删除旧 placement。[E: packages/tui/src/tui-main-screen.ts:209] [E: packages/tui/src/tui-main-screen.ts:219] [E: packages/tui/src/tui-main-screen.ts:232] [E: packages/tui/src/tui-main-screen.ts:460]

每个普通 changed line 先清行再写入；若 component 返回的可见宽度超过 terminal width，renderer 会记录 crash log、停止 TUI 并抛错。[E: packages/tui/src/tui-main-screen.ts:489] [E: packages/tui/src/tui-main-screen.ts:515] [E: packages/tui/src/tui-main-screen.ts:516] [E: packages/tui/src/tui-main-screen.ts:532] [E: packages/tui/src/tui-main-screen.ts:542]

## V8 字符串上限与 chunked write(#8028)

image-heavy full render 曾把整帧拼成一个 string,触发 V8 字符串长度上限。`BoundedTerminalWriter` 把 stdout 写成最多 `MAX_RENDER_WRITE_CHARS = 1024 * 1024`(1 MiB)的 chunk,避免单次 `terminal.write` 形成超大 string [E: packages/tui/src/tui-main-screen.ts:8] [E: packages/tui/src/tui-main-screen.ts:17]。

`append()` 填满当前 chunk 就 `flush()`;超大输入按容量切开,若切点落在 UTF-16 surrogate pair 中间则 `end--`,保证每次 write 仍是合法 UTF-16 [E: packages/tui/src/tui-main-screen.ts:30] [E: packages/tui/src/tui-main-screen.ts:40] [E: packages/tui/src/tui-main-screen.ts:47]。调用方自己 append synchronized-output begin/end;`flush()` 写出余量(含 end sequence) [E: packages/tui/src/tui-main-screen.ts:63]。

`fullRender()` 与增量路径都 `new BoundedTerminalWriter((data) => this.terminal.write(data))`,不再 `buffer +=` 整帧 [E: packages/tui/src/tui-main-screen.ts:278] [E: packages/tui/src/tui-main-screen.ts:458] [E: packages/tui/src/tui-main-screen.ts:401]。debug dump 只记录 `[N chars written in bounded chunks]`,不再把整 buffer 序列化进日志 [E: packages/tui/src/tui-main-screen.ts:592]。

`BoundedTerminalWriter` 是 `tui-main-screen.ts` 的 file-private class,不是 package export [E: packages/tui/src/tui-main-screen.ts:17]。alternate-screen 仍用单次 `this.terminal.write(buffer)`,viewport 高度有界,不走这套 chunking [E: packages/tui/src/tui-alt-screen.ts:1371]。

## Alternate-screen diff

fullscreen 每帧先由 `renderLayoutFrame()` 生成固定高的 screen，随后合成 overlay、selection 与 flash，再抽取 cursor marker并截断超宽普通行。[E: packages/tui/src/tui-alt-screen.ts:1314] [E: packages/tui/src/tui-alt-screen.ts:1321] [E: packages/tui/src/tui-alt-screen.ts:1323] [E: packages/tui/src/tui-alt-screen.ts:1326] [E: packages/tui/src/tui-alt-screen.ts:1327]

上一帧为空或 terminal 尺寸变化时 full redraw；若 changed row 涉及 image line，则按 image protocol 清 placement/屏幕并重建图片，否则只写内容不同的 screen rows。[E: packages/tui/src/tui-alt-screen.ts:1332] [E: packages/tui/src/tui-alt-screen.ts:1334] [E: packages/tui/src/tui-alt-screen.ts:1345] [E: packages/tui/src/tui-alt-screen.ts:1353] [E: packages/tui/src/tui-alt-screen.ts:1359] [E: packages/tui/src/tui-alt-screen.ts:1360]

不同于 main-screen 的相对 cursor/scrollback 计算，alternate-screen 直接用绝对 `row;col H` 定位每个 changed row，并把整批更新包在 synchronized output 中。[E: packages/tui/src/tui-alt-screen.ts:1345] [E: packages/tui/src/tui-alt-screen.ts:1361] [E: packages/tui/src/tui-alt-screen.ts:1370]

## Gotchas

- “差分引擎在 `tui.ts` 的 `TUI` class 中”已失效；`tui.ts` 只保留共享前处理与调度。[E: packages/tui/src/tui.ts:372]
- main-screen 的超宽行是 hard failure；alternate-screen 会在 frame 边界做 column slice，两者不是同一错误策略。[E: packages/tui/src/tui-main-screen.ts:516] [E: packages/tui/src/tui-alt-screen.ts:1328]
- fullscreen 图片变化可能扩大为 placement 级重画，所以“只改一行就只写一行”对 image frame 不成立。[E: packages/tui/src/tui-alt-screen.ts:1334] [E: packages/tui/src/tui-alt-screen.ts:1338]
- main-screen chunking 按 UTF-16 字符数而不是字节数切 1 MiB;Kitty payload 本身仍由 `encodeKitty()` 按 4096 字符分块,那是另一层。[E: packages/tui/src/tui-main-screen.ts:8] [I]

## Sources

- `packages/tui/src/tui-main-screen.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/tui.ts`
