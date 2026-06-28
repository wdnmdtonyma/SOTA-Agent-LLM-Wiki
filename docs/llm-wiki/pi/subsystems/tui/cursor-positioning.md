---
id: subsys.tui.cursor-positioning
title: 硬件光标/IME 定位
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
symbols:
  - extractCursorPosition
  - positionHardwareCursor
  - CURSOR_MARKER
related:
  - subsys.tui.diff-engine
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.tui.cursor-positioning` 描述 TUI 如何让可聚焦组件在 render output 里放入 `CURSOR_MARKER`,再由 `extractCursorPosition` 计算可见列并剥离 marker,最后由 `positionHardwareCursor` 移动 terminal hardware cursor 以服务 IME candidate window 定位。

## 能回答的问题

- `CURSOR_MARKER` 是什么,为什么它不应该留在差分比较后的渲染行里?
- `extractCursorPosition(lines, height)` 从哪些行里找 marker,找到后如何计算 `{ row, col }`?
- TUI 如何在 focus 切换时通知组件是否应该发出 cursor marker?
- `positionHardwareCursor(cursorPos, totalLines)` 什么时候隐藏 cursor,什么时候移动到绝对 column?
- cursor positioning 与 `subsys.tui.diff-engine` 的职责边界在哪里?

## 职责边界

本节点覆盖 `packages/tui/src/tui.ts` 内的硬件光标定位协议: `Focusable.focused` 是组件是否应发出 cursor marker 的 focus flag,`CURSOR_MARKER` 是 render output 中的内嵌标记,`extractCursorPosition` 负责从当前渲染行里找出并删除这个标记,`positionHardwareCursor` 负责向 terminal 写入 cursor movement escape sequence [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:106] [E: packages/tui/src/tui.ts:106] [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:1239] [E: packages/tui/src/tui.ts:1246] [E: packages/tui/src/tui.ts:1641] [E: packages/tui/src/tui.ts:1643] [E: packages/tui/src/tui.ts:1646] [E: packages/tui/src/tui.ts:1649]。

本节点不覆盖输入框或编辑器组件如何把 `CURSOR_MARKER` 拼进自己的 render output;该组件侧行为不在本节点的 declared source 范围内 [I]。

## 关键文件

- `packages/tui/src/tui.ts`: 定义 `Focusable`、`isFocusable`、`CURSOR_MARKER`、`TUI.setFocusInternal`、`TUI.extractCursorPosition`、`TUI.doRender` 中的 cursor extraction 调用,以及 `TUI.positionHardwareCursor` [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:110] [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:370] [E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1627]。

## 数据模型

`Focusable` 是一个只有 `focused: boolean` 的 interface;`isFocusable(component)` 通过 `"focused" in component` 判断组件是否支持该协议,因此协议是 structural typing,不需要继承专用 base class [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:106] [E: packages/tui/src/tui.ts:110] [E: packages/tui/src/tui.ts:111] [I]。

`CURSOR_MARKER` 的字面值是 `"\x1b_pi:c\x07"`:它以 ESC `_` 开始并以 BEL 结束,组件在 cursor position 发出该标记,TUI 会查找并剥离它 [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:120]。

`TUI` 分别维护 `cursorRow` 与 `hardwareCursorRow`:前者表示逻辑 cursor row 在渲染内容末尾,后者表示 terminal 实际 cursor row,源码注释说明两者可能因 IME positioning 不同 [E: packages/tui/src/tui.ts:310] [E: packages/tui/src/tui.ts:311]。

`showHardwareCursor` 默认由环境变量 `PI_HARDWARE_CURSOR === "1"` 决定,构造函数参数 `showHardwareCursor` 可以覆盖这个默认值;`setShowHardwareCursor(false)` 会立即隐藏 terminal cursor 并请求重渲染 [E: packages/tui/src/tui.ts:312] [E: packages/tui/src/tui.ts:328] [E: packages/tui/src/tui.ts:331] [E: packages/tui/src/tui.ts:332] [E: packages/tui/src/tui.ts:344] [E: packages/tui/src/tui.ts:348] [E: packages/tui/src/tui.ts:350]。

## 控制流

1. `TUI.setFocus@packages/tui/src/tui.ts:366` 调用 `setFocusInternal`;`setFocusInternal` 在 focus 更新时先把旧 `Focusable` 的 `focused` 置为 `false`,再记录 `focusedComponent = nextFocus`,最后把新 `Focusable` 的 `focused` 置为 `true` [E: packages/tui/src/tui.ts:367] [E: packages/tui/src/tui.ts:417] [E: packages/tui/src/tui.ts:418] [E: packages/tui/src/tui.ts:421] [E: packages/tui/src/tui.ts:423] [E: packages/tui/src/tui.ts:424]。
2. `TUI.doRender@packages/tui/src/tui.ts:1254` 先用当前 terminal width 调用 `this.render(width)` 取得 base lines;有 overlay 时,先把 overlay composite 进同一组 `newLines` [E: packages/tui/src/tui.ts:1254] [E: packages/tui/src/tui.ts:1256] [E: packages/tui/src/tui.ts:1271] [E: packages/tui/src/tui.ts:1274] [E: packages/tui/src/tui.ts:1275]。
3. `doRender` 在 `applyLineResets` 和差分比较之前调用 `extractCursorPosition(newLines, height)`,所以 marker 被剥离后的 `newLines` 才进入 line reset、full render 或 differential render path [E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1281] [E: packages/tui/src/tui.ts:1284] [E: packages/tui/src/tui.ts:1368] [E: packages/tui/src/tui.ts:1375] [I]。
4. `extractCursorPosition@packages/tui/src/tui.ts:1234` 只扫描底部 `height` 行:它用 `Math.max(0, lines.length - height)` 计算 viewport top,然后从最后一行向上扫描到 viewport top [E: packages/tui/src/tui.ts:1234] [E: packages/tui/src/tui.ts:1236] [E: packages/tui/src/tui.ts:1237]。
5. 每一行用 `line.indexOf(CURSOR_MARKER)` 找 marker;找到后,函数把 marker 之前的 substring 交给 `visibleWidth` 得到 visual column,随后用 slice 拼接删除 marker,并返回 `{ row, col }` [E: packages/tui/src/tui.ts:1239] [E: packages/tui/src/tui.ts:1242] [E: packages/tui/src/tui.ts:1243] [E: packages/tui/src/tui.ts:1246] [E: packages/tui/src/tui.ts:1248]。
6. full render path 在写完整 buffer 后把 `cursorRow` 和 `hardwareCursorRow` 重置到内容末行,再调用 `positionHardwareCursor(cursorPos, newLines.length)` [E: packages/tui/src/tui.ts:1309] [E: packages/tui/src/tui.ts:1310] [E: packages/tui/src/tui.ts:1311] [E: packages/tui/src/tui.ts:1320]。
7. differential render path 在写入 changed-line buffer 后用 `finalCursorRow` 更新 `hardwareCursorRow`,再调用 `positionHardwareCursor(cursorPos, newLines.length)`;没有内容变化时也会直接调用 `positionHardwareCursor`,因此只有 cursor marker 移动也能更新 hardware cursor [E: packages/tui/src/tui.ts:1397] [E: packages/tui/src/tui.ts:1398] [E: packages/tui/src/tui.ts:1602] [E: packages/tui/src/tui.ts:1607] [E: packages/tui/src/tui.ts:1608] [E: packages/tui/src/tui.ts:1614]。
8. `positionHardwareCursor@packages/tui/src/tui.ts:1627` 在 `cursorPos` 缺失或 `totalLines <= 0` 时隐藏 terminal cursor 并返回;否则 clamp row、clamp column,按 `targetRow - this.hardwareCursorRow` 写 `CSI n B` 或 `CSI n A`,再写 `CSI {targetCol + 1} G` 移到 1-indexed absolute column [E: packages/tui/src/tui.ts:1627] [E: packages/tui/src/tui.ts:1628] [E: packages/tui/src/tui.ts:1629] [E: packages/tui/src/tui.ts:1634] [E: packages/tui/src/tui.ts:1635] [E: packages/tui/src/tui.ts:1638] [E: packages/tui/src/tui.ts:1641] [E: packages/tui/src/tui.ts:1643] [E: packages/tui/src/tui.ts:1646]。
9. `positionHardwareCursor` 写完 movement buffer 后把 `hardwareCursorRow` 更新为 target row;最终是否显示 hardware cursor 由 `showHardwareCursor` 决定,开启时调用 `terminal.showCursor()`,关闭时调用 `terminal.hideCursor()` [E: packages/tui/src/tui.ts:1649] [E: packages/tui/src/tui.ts:1652] [E: packages/tui/src/tui.ts:1653] [E: packages/tui/src/tui.ts:1654] [E: packages/tui/src/tui.ts:1656]。

## 设计动机与权衡

cursor marker extraction 放在 overlay composite 之后,意味着 overlay 渲染结果与 base content 共用同一个 cursor positioning pass;最终进入 visible viewport 的 marker 会驱动 `positionHardwareCursor` [E: packages/tui/src/tui.ts:1274] [E: packages/tui/src/tui.ts:1275] [E: packages/tui/src/tui.ts:1279] [I]。

`extractCursorPosition` 从底部向上扫描,同一行用 `indexOf` 取第一个 marker;如果多个 marker 同时出现在可见 viewport,代码会选择视觉上更靠下的行,若同一行有多个 marker则选择该行最早出现的 marker [E: packages/tui/src/tui.ts:1237] [E: packages/tui/src/tui.ts:1239] [I]。

`showHardwareCursor` 只控制最终 show/hide,不阻止 `positionHardwareCursor` 计算并写入 movement sequence;因此即使硬件光标被隐藏,terminal 的 actual cursor position 仍会被移动到 marker 位置 [E: packages/tui/src/tui.ts:1646] [E: packages/tui/src/tui.ts:1649] [E: packages/tui/src/tui.ts:1652] [E: packages/tui/src/tui.ts:1653] [E: packages/tui/src/tui.ts:1656] [I]。

## Gotcha

- `extractCursorPosition` 会原地修改传入的 `lines` 数组;调用方如果还想保留带 marker 的 render output,必须在调用前复制数组 [E: packages/tui/src/tui.ts:1246] [I]。
- 只有底部 `height` 行会被扫描。落在当前 visible viewport 之外的 marker 不会被 `extractCursorPosition` 返回或剥离;若调用方希望 marker 被本函数处理,它必须落在这段 viewport 内 [E: packages/tui/src/tui.ts:1236] [E: packages/tui/src/tui.ts:1237] [I]。
- `positionHardwareCursor(null, totalLines)` 不保留上一帧的 hardware cursor visibility,而是直接 `hideCursor()`;没有 marker 的 render pass 会让 terminal cursor 隐藏 [E: packages/tui/src/tui.ts:1628] [E: packages/tui/src/tui.ts:1629]。
- `targetCol` 只做下限 clamp,没有按 terminal width clamp;`positionHardwareCursor` 自身不会处理超宽 column [E: packages/tui/src/tui.ts:1635] [I]。

## 跨包边界

`subsys.tui.diff-engine` 覆盖 `doRender` 中 line comparison、full redraw、changed-line buffer、Kitty image range expansion、`compositeLineAt` 等差分渲染细节;本节点只覆盖 diff 前的 marker extraction 与 render 写入后的 hardware cursor movement [E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1284] [E: packages/tui/src/tui.ts:1368] [E: packages/tui/src/tui.ts:1375] [E: packages/tui/src/tui.ts:1390] [E: packages/tui/src/tui.ts:1463] [E: packages/tui/src/tui.ts:1614] [E: packages/tui/src/tui.ts:1176] [I]。

## Sources

- packages/tui/src/tui.ts

## 相关

- [subsys.tui.diff-engine](diff-engine.md): `doRender` 的差分比较、全量重绘、changed-line buffer 与终端写入策略;cursor positioning 在这些写入前后插入自己的 marker extraction 和 cursor movement。
