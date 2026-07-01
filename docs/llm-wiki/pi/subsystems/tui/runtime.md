---
id: subsys.tui.runtime
title: TUI 运行时与渲染循环
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui.ts
  - packages/coding-agent/docs/tui.md
symbols:
  - TUI
  - Container
  - requestRender
  - doRender
related:
  - subsys.tui.diff-engine
  - subsys.tui.component-model
  - surface.modes.interactive
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.tui.runtime` 描述 `pi-tui` 的 runtime: `Container` 把组件树渲染为 lines, `TUI` 继承 `Container` 并接管 terminal input、focus、overlay stack、render scheduling 和 differential terminal writes。

## 能回答的问题

- `TUI` 和 `Container` 在 `pi-tui` 里分别负责什么?
- `requestRender()` 如何把多次 UI 状态变化合并成一次 `doRender()`?
- `doRender()` 什么时候 full render, 什么时候 differential render?
- `TUI` 如何处理 focus、keyboard input、overlay 和 IME cursor marker?
- 自定义 component 为什么必须让每行不超过 `render(width)` 的宽度?
- `surface.modes.interactive` 如何依赖 `subsys.tui.runtime` 提供 interactive terminal surface?

## 职责边界

`Container` 是最小的 composite component:它实现 `Component`, 维护 `children: Component[]`, 并提供 `addChild()`、`removeChild()`、`clear()`、`invalidate()` 和 `render(width)` [E: packages/tui/src/tui.ts:256] [E: packages/tui/src/tui.ts:257] [E: packages/tui/src/tui.ts:259] [E: packages/tui/src/tui.ts:263] [E: packages/tui/src/tui.ts:270] [E: packages/tui/src/tui.ts:274] [E: packages/tui/src/tui.ts:280]。`Container.render(width)` 按 children 顺序调用每个 child 的 `render(width)` 并把 child lines 逐行追加到一个数组, 所以默认 layout 是 vertical concatenation, 不做 grid/absolute layout [E: packages/tui/src/tui.ts:281] [E: packages/tui/src/tui.ts:283] [E: packages/tui/src/tui.ts:285] [E: packages/tui/src/tui.ts:288]。

`TUI` 是 terminal runtime class:它 `extends Container`, 持有 `terminal: Terminal`, 并保存 previous lines、previous terminal dimensions、focus state、input listeners、render timer、cursor state、overlay stack 和 terminal color listeners [E: packages/tui/src/tui.ts:295] [E: packages/tui/src/tui.ts:296] [E: packages/tui/src/tui.ts:297] [E: packages/tui/src/tui.ts:299] [E: packages/tui/src/tui.ts:300] [E: packages/tui/src/tui.ts:301] [E: packages/tui/src/tui.ts:302] [E: packages/tui/src/tui.ts:307] [E: packages/tui/src/tui.ts:310] [E: packages/tui/src/tui.ts:311] [E: packages/tui/src/tui.ts:325] [E: packages/tui/src/tui.ts:320]。因此 `TUI` 的边界不是具体 widget 样式, 而是把 component tree 的 line output 安排到真实 terminal 上 [I]。

`packages/coding-agent/docs/tui.md` 把 component contract 写成公开文档:component 必须实现 `render(width): string[]` 和 `invalidate()`, 可选实现 `handleInput?(data)` 和 `wantsKeyRelease?` [E: packages/coding-agent/docs/tui.md:14] [E: packages/coding-agent/docs/tui.md:15] [E: packages/coding-agent/docs/tui.md:16] [E: packages/coding-agent/docs/tui.md:17] [E: packages/coding-agent/docs/tui.md:18]。公开文档还明确每条 `render(width)` 返回行不得超过 `width`, 这是 runtime 后续宽度校验的输入契约 [E: packages/coding-agent/docs/tui.md:24] [E: packages/coding-agent/docs/tui.md:301]。

## 关键文件

- `packages/tui/src/tui.ts`:定义 `Component`、`Focusable`、`CURSOR_MARKER`、overlay types、`Container` 和 `TUI`, 是本节点的源码事实来源 [E: packages/tui/src/tui.ts:64] [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:171] [E: packages/tui/src/tui.ts:256] [E: packages/tui/src/tui.ts:295]。
- `packages/coding-agent/docs/tui.md`:面向 extension/custom tool 作者说明 component contract、custom UI usage、overlay、line width、performance 和 invalidation 规则 [E: packages/coding-agent/docs/tui.md:5] [E: packages/coding-agent/docs/tui.md:91] [E: packages/coding-agent/docs/tui.md:111] [E: packages/coding-agent/docs/tui.md:297] [E: packages/coding-agent/docs/tui.md:463] [E: packages/coding-agent/docs/tui.md:491]。

## 数据模型

`Component` 的 runtime 输入输出是 line-oriented: `render(width)` 返回字符串数组, `handleInput?(data)` 只在 component 获得 focus 时接收键盘输入, `wantsKeyRelease?` 控制 Kitty key release event 是否传入, `invalidate()` 用于清空缓存或强制重新生成内部显示状态 [E: packages/tui/src/tui.ts:70] [E: packages/tui/src/tui.ts:75] [E: packages/tui/src/tui.ts:81] [E: packages/tui/src/tui.ts:87]。

`Focusable` 是 IME 支持用的 optional interface:focus 改变时 `TUI` 会给 focusable component 写入 `focused`, component 在输出中放置 `CURSOR_MARKER`, `TUI` 再扫描该 marker 并定位 hardware cursor [E: packages/tui/src/tui.ts:104] [E: packages/tui/src/tui.ts:106] [E: packages/tui/src/tui.ts:417] [E: packages/tui/src/tui.ts:418] [E: packages/tui/src/tui.ts:423] [E: packages/tui/src/tui.ts:424] [E: packages/tui/src/tui.ts:120] [E: packages/tui/src/tui.ts:1234] [E: packages/tui/src/tui.ts:1240] [E: packages/tui/src/tui.ts:1246]。公开文档也要求容器里嵌入 `Input` 或 `Editor` 时容器要实现 `Focusable` 并把 focus 状态传给 child, 否则 IME candidate window 会出现在错误位置 [E: packages/coding-agent/docs/tui.md:59] [E: packages/coding-agent/docs/tui.md:72] [E: packages/coding-agent/docs/tui.md:74] [E: packages/coding-agent/docs/tui.md:85]。

Overlay 由 `OverlayStackEntry` 保存 component、options、preFocus、hidden 和 focusOrder; `showOverlay()` 创建 entry、push 进 `overlayStack`, 在可见且 capturing 时把 focus 设到 overlay component, 隐藏 cursor 并请求 render [E: packages/tui/src/tui.ts:233] [E: packages/tui/src/tui.ts:234] [E: packages/tui/src/tui.ts:235] [E: packages/tui/src/tui.ts:236] [E: packages/tui/src/tui.ts:237] [E: packages/tui/src/tui.ts:238] [E: packages/tui/src/tui.ts:493] [E: packages/tui/src/tui.ts:494] [E: packages/tui/src/tui.ts:496] [E: packages/tui/src/tui.ts:497] [E: packages/tui/src/tui.ts:498] [E: packages/tui/src/tui.ts:499] [E: packages/tui/src/tui.ts:501] [E: packages/tui/src/tui.ts:503] [E: packages/tui/src/tui.ts:504] [E: packages/tui/src/tui.ts:506] [E: packages/tui/src/tui.ts:507]。

## 控制流

1. `TUI.start()` 清除 stopped 状态, 调 `terminal.start()` 注册 input callback 和 resize/render callback, 隐藏 cursor, 查询 image cell size, 然后调用 `requestRender()` 发起首帧 [E: packages/tui/src/tui.ts:636] [E: packages/tui/src/tui.ts:637] [E: packages/tui/src/tui.ts:638] [E: packages/tui/src/tui.ts:639] [E: packages/tui/src/tui.ts:641] [E: packages/tui/src/tui.ts:645] [E: packages/tui/src/tui.ts:646]。
2. `requestRender(force = false)` 是 render loop 的 public gate:force 模式清空 previous render state、取消旧 timer、在 `process.nextTick()` 中直接调用 `doRender()`;非 force 模式在已有 pending render 时直接返回, 否则标记 `renderRequested` 并在 next tick 进入 `scheduleRender()` [E: packages/tui/src/tui.ts:712] [E: packages/tui/src/tui.ts:714] [E: packages/tui/src/tui.ts:715] [E: packages/tui/src/tui.ts:716] [E: packages/tui/src/tui.ts:721] [E: packages/tui/src/tui.ts:725] [E: packages/tui/src/tui.ts:726] [E: packages/tui/src/tui.ts:732] [E: packages/tui/src/tui.ts:736] [E: packages/tui/src/tui.ts:737] [E: packages/tui/src/tui.ts:738]。
3. `scheduleRender()` 用 `MIN_RENDER_INTERVAL_MS = 16` 节流普通 render:它根据 `lastRenderAt` 算 delay, timeout 到期后清除 timer、消费 `renderRequested`、刷新 `lastRenderAt` 并调用 `doRender()`;如果 render 期间又有请求, timeout 尾部会再次 schedule [E: packages/tui/src/tui.ts:309] [E: packages/tui/src/tui.ts:745] [E: packages/tui/src/tui.ts:746] [E: packages/tui/src/tui.ts:747] [E: packages/tui/src/tui.ts:748] [E: packages/tui/src/tui.ts:752] [E: packages/tui/src/tui.ts:753] [E: packages/tui/src/tui.ts:754] [E: packages/tui/src/tui.ts:755] [E: packages/tui/src/tui.ts:756]。
4. `doRender()` 读取当前 terminal columns/rows, 计算 width/height 是否变化, 调 `this.render(width)` 生成 base lines, 有 overlays 时先 `compositeOverlays()`, 再提取 `CURSOR_MARKER` 并调用 `applyLineResets()` [E: packages/tui/src/tui.ts:1254] [E: packages/tui/src/tui.ts:1256] [E: packages/tui/src/tui.ts:1257] [E: packages/tui/src/tui.ts:1258] [E: packages/tui/src/tui.ts:1259] [E: packages/tui/src/tui.ts:1271] [E: packages/tui/src/tui.ts:1275] [E: packages/tui/src/tui.ts:1279] [E: packages/tui/src/tui.ts:1281]。
5. `doRender()` 在首帧、width change、非 Termux height change、clear-on-shrink 等场景走 `fullRender()`, `fullRender()` 使用 synchronized output、可选清屏和 scrollback clear, 写完后更新 previous lines、image ids、width、height 和 viewport state [E: packages/tui/src/tui.ts:1284] [E: packages/tui/src/tui.ts:1286] [E: packages/tui/src/tui.ts:1289] [E: packages/tui/src/tui.ts:1309] [E: packages/tui/src/tui.ts:1319] [E: packages/tui/src/tui.ts:1321] [E: packages/tui/src/tui.ts:1322] [E: packages/tui/src/tui.ts:1323] [E: packages/tui/src/tui.ts:1324] [E: packages/tui/src/tui.ts:1336] [E: packages/tui/src/tui.ts:1343] [E: packages/tui/src/tui.ts:1352] [E: packages/tui/src/tui.ts:1361]。
6. 非 full render 路径会逐行比较 `previousLines` 和 `newLines`, 计算 `firstChanged`/`lastChanged`, 处理 append-only 与 Kitty image changed range, 然后只渲染 changed line range [E: packages/tui/src/tui.ts:1368] [E: packages/tui/src/tui.ts:1369] [E: packages/tui/src/tui.ts:1370] [E: packages/tui/src/tui.ts:1372] [E: packages/tui/src/tui.ts:1373] [E: packages/tui/src/tui.ts:1375] [E: packages/tui/src/tui.ts:1377] [E: packages/tui/src/tui.ts:1379] [E: packages/tui/src/tui.ts:1382] [E: packages/tui/src/tui.ts:1385] [E: packages/tui/src/tui.ts:1387] [E: packages/tui/src/tui.ts:1390] [E: packages/tui/src/tui.ts:1492] [E: packages/tui/src/tui.ts:1493]。
7. Differential write 前 runtime 会在 synchronized output buffer 中删除 changed Kitty images、移动 terminal cursor、清除目标行并写新行;写完一次性 `terminal.write(buffer)`, 更新 cursor row、hardware cursor row、max lines、viewport、previous lines、image ids、width 和 height [E: packages/tui/src/tui.ts:1463] [E: packages/tui/src/tui.ts:1464] [E: packages/tui/src/tui.ts:1481] [E: packages/tui/src/tui.ts:1483] [E: packages/tui/src/tui.ts:1485] [E: packages/tui/src/tui.ts:1488] [E: packages/tui/src/tui.ts:1519] [E: packages/tui/src/tui.ts:1548] [E: packages/tui/src/tui.ts:1602] [E: packages/tui/src/tui.ts:1607] [E: packages/tui/src/tui.ts:1608] [E: packages/tui/src/tui.ts:1610] [E: packages/tui/src/tui.ts:1611] [E: packages/tui/src/tui.ts:1616] [E: packages/tui/src/tui.ts:1617] [E: packages/tui/src/tui.ts:1618] [E: packages/tui/src/tui.ts:1619]。

## 输入、焦点与 overlay

`setFocusInternal()` 清除旧 focusable 的 `focused`, 设置 `focusedComponent`, 再给新的 focusable 写入 `focused = true`;这让 component 的 render output 可以根据 focus 状态决定是否发出 `CURSOR_MARKER` [E: packages/tui/src/tui.ts:417] [E: packages/tui/src/tui.ts:418] [E: packages/tui/src/tui.ts:421] [E: packages/tui/src/tui.ts:423] [E: packages/tui/src/tui.ts:424]。

`handleInput(data)` 先消费 OSC 11 background response、terminal color scheme report、registered input listeners 和 cell-size response, 再处理 global debug key, overlay focus restore, 最后才把 input 交给 focused component 的 `handleInput()` [E: packages/tui/src/tui.ts:761] [E: packages/tui/src/tui.ts:762] [E: packages/tui/src/tui.ts:765] [E: packages/tui/src/tui.ts:769] [E: packages/tui/src/tui.ts:787] [E: packages/tui/src/tui.ts:792] [E: packages/tui/src/tui.ts:810] [E: packages/tui/src/tui.ts:827] [E: packages/tui/src/tui.ts:832]。focused component 处理输入后 runtime 立即调用 `requestRender()`, 所以 component 不必在普通 keypress 后自行调度整屏刷新 [E: packages/tui/src/tui.ts:833]。

`handleInput()` 会过滤 key release event, 除非 focused component 把 `wantsKeyRelease` 设为 true;这把 Kitty release protocol 的噪声从默认 component path 中隔离出去 [E: packages/tui/src/tui.ts:829] [E: packages/tui/src/tui.ts:830]。

Overlay composition 是渲染期发生的:runtime 过滤可见 overlay, 按 `focusOrder` 排序, 用 overlay options 解析宽度、高度、row/col, 先渲染 overlay component, 再通过 `compositeLineAt()` 把 overlay line splice 到 base line 上 [E: packages/tui/src/tui.ts:1040] [E: packages/tui/src/tui.ts:1041] [E: packages/tui/src/tui.ts:1047] [E: packages/tui/src/tui.ts:1050] [E: packages/tui/src/tui.ts:1058] [E: packages/tui/src/tui.ts:1084] [E: packages/tui/src/tui.ts:1085]。公开文档把 overlay 暴露为 `ctx.ui.custom(..., { overlay: true })`, 并说明 overlay 不清屏而是在现有内容之上渲染 [E: packages/coding-agent/docs/tui.md:111] [E: packages/coding-agent/docs/tui.md:116]。

## 设计动机与权衡

`requestRender()` 的 coalescing 和 16ms throttle 表明 runtime 倾向把多次 component state mutation 合并到较少 terminal writes, 以降低 flicker 和输出量 [E: packages/tui/src/tui.ts:736] [E: packages/tui/src/tui.ts:746] [I]。

每行尾部追加 full SGR reset 和 OSC 8 reset 是 runtime-level 防御:源码对非 image line 执行 `normalizeTerminalOutput(line) + reset`, 文档也提醒 styles 不跨行继承, 多行 styled text 需要每行重加样式或使用 `wrapTextWithAnsi()` [E: packages/tui/src/tui.ts:1095] [E: packages/tui/src/tui.ts:1099] [E: packages/tui/src/tui.ts:1100] [E: packages/coding-agent/docs/tui.md:29]。

Differential render 路径对过宽普通行有 hard failure:如果非 image line 的 `visibleWidth(line) > width`, runtime 会写 crash log、停止 TUI, 并抛出提示 custom component 使用 `visibleWidth()` 和 `truncateToWidth()` 的 Error [E: packages/tui/src/tui.ts:1520] [E: packages/tui/src/tui.ts:1522] [E: packages/tui/src/tui.ts:1532] [E: packages/tui/src/tui.ts:1536] [E: packages/tui/src/tui.ts:1539] [E: packages/tui/src/tui.ts:1541] [E: packages/tui/src/tui.ts:1546]。这是公开文档把 line width 标为 critical 的一个运行时后果 [E: packages/coding-agent/docs/tui.md:297] [E: packages/coding-agent/docs/tui.md:301] [E: packages/coding-agent/docs/tui.md:302] [E: packages/coding-agent/docs/tui.md:306]。

Theme/cache invalidation 的责任分布是:runtime 会递归调用 components 的 `invalidate()`, 但如果 component 把 theme colors 预先烘进 child content, component 自己必须在 `invalidate()` 中 rebuild content [E: packages/tui/src/tui.ts:630] [E: packages/tui/src/tui.ts:631] [E: packages/tui/src/tui.ts:632] [E: packages/coding-agent/docs/tui.md:493] [E: packages/coding-agent/docs/tui.md:497] [E: packages/coding-agent/docs/tui.md:518] [E: packages/coding-agent/docs/tui.md:572] [E: packages/coding-agent/docs/tui.md:574]。

## Gotcha

- `Container` 只做纵向拼接, 不会自动裁剪 child line 宽度;在 differential render 路径中, 过宽 line 会在 `doRender()` 的 runtime guard 触发 crash path [E: packages/tui/src/tui.ts:280] [E: packages/tui/src/tui.ts:283] [E: packages/tui/src/tui.ts:285] [E: packages/tui/src/tui.ts:1520] [E: packages/tui/src/tui.ts:1546]。
- `requestRender(force)` 不是单纯的立即重绘:force path 会清空 previous state 并把 width/height 设为 `-1`, 这会让下一次 `doRender()` 走 full clear/redraw 逻辑 [E: packages/tui/src/tui.ts:714] [E: packages/tui/src/tui.ts:715] [E: packages/tui/src/tui.ts:716] [E: packages/tui/src/tui.ts:732] [E: packages/tui/src/tui.ts:1343]。
- overlay 的 visible callback 会在当前 terminal columns/rows 上重新判断, input path 也会在 focused overlay 不再可见时重新定向 focus [E: packages/tui/src/tui.ts:610] [E: packages/tui/src/tui.ts:612] [E: packages/tui/src/tui.ts:613] [E: packages/tui/src/tui.ts:799] [E: packages/tui/src/tui.ts:800] [E: packages/tui/src/tui.ts:804] [E: packages/tui/src/tui.ts:806]。

## 跨包边界

[surface.modes.interactive](../../surface/modes/interactive.md) 是 `pi-coding-agent` 的 interactive mode surface;它创建并挂载 `TUI(new ProcessTerminal())`, 而 `subsys.tui.runtime` 只解释 `pi-tui` runtime 本身如何调度 input/render/focus [I]。

[subsys.tui.component-model](component-model.md) 应覆盖 `Component`、built-in components 与 component authoring patterns;本节点只保留 runtime 必需的 `Component` contract、`Container` composite 行为和 invalidation 语义 [I]。

[subsys.tui.diff-engine](diff-engine.md) 应覆盖 terminal diff 算法的细节;本节点只说明 `doRender()` 如何选择 full render 或 changed-line render, 不展开 ANSI segment slicing、Kitty image reserved rows 和 viewport correction 的所有 edge cases [I]。

## Sources

- packages/tui/src/tui.ts
- packages/coding-agent/docs/tui.md

## 相关

- [subsys.tui.diff-engine](diff-engine.md):`doRender()` 内部 differential rendering、viewport 和 Kitty image changed range 的细节。
- [subsys.tui.component-model](component-model.md):`Component` contract、built-in components 和 custom component authoring 约定。
- [surface.modes.interactive](../../surface/modes/interactive.md):`pi-coding-agent` 如何创建 `TUI`、挂载 chat/editor/footer 并把 agent events 渲染到 terminal。
