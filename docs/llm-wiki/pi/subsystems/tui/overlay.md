---
id: subsys.tui.overlay
title: 浮窗系统与合成
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/tui.ts]
symbols: [showOverlay, OverlayHandle, compositeOverlays]
related: [subsys.tui.runtime, subsys.tui.diff-engine]
evidence: explicit
status: verified
updated: 5a073885
---

> TUI overlay 是 `TUI` 内部的 floating layer stack: 调用方用 `showOverlay()` 挂载一个 `Component`，TUI 负责 focus capture、临时隐藏、布局定位，并在 differential rendering 前把 overlay lines 合成到底层内容上。

## 能回答的问题

- `showOverlay()` 创建 overlay 时会保存哪些状态，什么时候夺取 keyboard focus？
- `OverlayHandle` 的 `hide()`、`setHidden()`、`focus()`、`unfocus()` 分别改变什么？
- `nonCapturing` overlay 和普通 capturing overlay 在 focus restore 上有什么区别？
- `compositeOverlays()` 如何按层级、尺寸和 viewport 把浮窗叠到底层 lines 上？
- overlay 为什么会影响 shrink clearing 与 differential rendering 的时机？

## 职责边界

overlay 系统只处理 terminal UI 内的浮层生命周期、focus policy、布局计算和 line compositing；它不定义具体弹窗内容，overlay 内容仍是普通 `Component.render(width): string[]` 输出。[E: packages/tui/src/tui.ts:70] `showOverlay()` 接受任意 `Component` 和可选 `OverlayOptions`，返回 `OverlayHandle` 给调用方控制该浮层。[E: packages/tui/src/tui.ts:493]

这个子系统位于 `packages/tui/src/tui.ts` 的 `TUI` class 内部：`overlayStack` 是 overlay entry 数组字段，`focusOrderCounter` 在创建、重新显示或手动 focus overlay 时递增写入 `focusOrder`，`overlayFocusRestore` 记录 overlay focus restore 状态。[E: packages/tui/src/tui.ts:295][E: packages/tui/src/tui.ts:324][E: packages/tui/src/tui.ts:325][E: packages/tui/src/tui.ts:326][E: packages/tui/src/tui.ts:499][E: packages/tui/src/tui.ts:540][E: packages/tui/src/tui.ts:549]

## 关键文件

- `packages/tui/src/tui.ts`: 定义 `OverlayOptions`、`OverlayHandle`、`OverlayStackEntry`，并在 `TUI` 内实现 `showOverlay()`、`hideOverlay()`、`resolveOverlayLayout()`、`compositeOverlays()` 和 `compositeLineAt()`。[E: packages/tui/src/tui.ts:171][E: packages/tui/src/tui.ts:218][E: packages/tui/src/tui.ts:233][E: packages/tui/src/tui.ts:493][E: packages/tui/src/tui.ts:589][E: packages/tui/src/tui.ts:897][E: packages/tui/src/tui.ts:1032][E: packages/tui/src/tui.ts:1176]

## 数据模型

### OverlayOptions

`OverlayOptions` 同时描述 sizing、positioning 和 visibility/focus policy: `width`、`minWidth`、`maxHeight` 控制宽高；`anchor`、`offsetX`、`offsetY`、`row`、`col`、`margin` 控制位置；`visible(termWidth, termHeight)` 是判断可见性时调用的 predicate；`nonCapturing` 表示显示时不捕获 keyboard focus。[E: packages/tui/src/tui.ts:171][E: packages/tui/src/tui.ts:174][E: packages/tui/src/tui.ts:176][E: packages/tui/src/tui.ts:178][E: packages/tui/src/tui.ts:182][E: packages/tui/src/tui.ts:184][E: packages/tui/src/tui.ts:186][E: packages/tui/src/tui.ts:190][E: packages/tui/src/tui.ts:192][E: packages/tui/src/tui.ts:196][E: packages/tui/src/tui.ts:204][E: packages/tui/src/tui.ts:206][E: packages/tui/src/tui.ts:613][E: packages/tui/src/tui.ts:503]

`SizeValue` 是 absolute number 或百分比字符串，例如 `"50%"`；百分比会按 reference size 取 `Math.floor(referenceSize * percent / 100)`。[E: packages/tui/src/tui.ts:149][E: packages/tui/src/tui.ts:158]

### OverlayStackEntry

`OverlayStackEntry` 是 runtime stack item，保存 `component`、可选 `options`、打开 overlay 前的 `preFocus`、临时隐藏位 `hidden` 和 `focusOrder`。[E: packages/tui/src/tui.ts:233][E: packages/tui/src/tui.ts:234][E: packages/tui/src/tui.ts:235][E: packages/tui/src/tui.ts:236][E: packages/tui/src/tui.ts:237][E: packages/tui/src/tui.ts:238] `preFocus` 是 focus restore 的关键字段：overlay 被移除或隐藏且当前焦点正是它时，TUI 会尝试转到 topmost visible capturing overlay，否则回到该 entry 的 `preFocus`。[E: packages/tui/src/tui.ts:518][E: packages/tui/src/tui.ts:519][E: packages/tui/src/tui.ts:520][E: packages/tui/src/tui.ts:533][E: packages/tui/src/tui.ts:534][E: packages/tui/src/tui.ts:535]

### OverlayHandle

`OverlayHandle` 是 `showOverlay()` 返回的控制面: `hide()` 永久移除，`setHidden()` 临时隐藏或恢复显示，`isHidden()` 查询隐藏位，`focus()` 重新聚焦并 bring to visual front，`unfocus()` 释放 focus，`isFocused()` 查询当前 focus 是否在该 overlay。[E: packages/tui/src/tui.ts:218][E: packages/tui/src/tui.ts:220][E: packages/tui/src/tui.ts:222][E: packages/tui/src/tui.ts:224][E: packages/tui/src/tui.ts:226][E: packages/tui/src/tui.ts:228][E: packages/tui/src/tui.ts:230]

## 控制流

1. `showOverlay(component, options)` 创建 `OverlayStackEntry`，把当前 `focusedComponent` 存为 `preFocus`，把 `hidden` 初始化为 `false`，并用递增的 `focusOrderCounter` 写入 `focusOrder`。[E: packages/tui/src/tui.ts:493][E: packages/tui/src/tui.ts:494][E: packages/tui/src/tui.ts:497][E: packages/tui/src/tui.ts:498][E: packages/tui/src/tui.ts:499]
2. `showOverlay()` 将 entry push 到 `overlayStack`；如果 overlay 不是 `nonCapturing` 且当前可见，就调用 `setFocus(component)` 捕获 keyboard focus。[E: packages/tui/src/tui.ts:501][E: packages/tui/src/tui.ts:503][E: packages/tui/src/tui.ts:504]
3. `showOverlay()` 随后隐藏 terminal cursor 并请求下一次 render；`hide()`、`setHidden()`、`focus()`、`unfocus()` 的状态变更路径也会请求 render，这是 overlay 生命周期和 render scheduler 的直接连接点。[E: packages/tui/src/tui.ts:506][E: packages/tui/src/tui.ts:507][E: packages/tui/src/tui.ts:523][E: packages/tui/src/tui.ts:544][E: packages/tui/src/tui.ts:551][E: packages/tui/src/tui.ts:573][E: packages/tui/src/tui.ts:582]
4. `hide()` 会从 `overlayStack` 删除当前 entry，清理或重定向 focus restore 状态；若当前 focus 在该 overlay 上，就转到 topmost visible capturing overlay 或 `preFocus`。[E: packages/tui/src/tui.ts:511][E: packages/tui/src/tui.ts:514][E: packages/tui/src/tui.ts:515][E: packages/tui/src/tui.ts:516][E: packages/tui/src/tui.ts:518][E: packages/tui/src/tui.ts:520]
5. `setHidden(true)` 只改 `entry.hidden`，不从 stack 删除；如果被隐藏的是当前 focused overlay，就走同样的 fallback focus 逻辑。[E: packages/tui/src/tui.ts:526][E: packages/tui/src/tui.ts:528][E: packages/tui/src/tui.ts:531][E: packages/tui/src/tui.ts:533][E: packages/tui/src/tui.ts:535]
6. `setHidden(false)` 对 capturing 且可见的 overlay 递增 `focusOrder` 并恢复 focus；`compositeOverlays()` 后续按 `focusOrder` 升序渲染，所以重新显示会把该 overlay 带到 visual front。[E: packages/tui/src/tui.ts:539][E: packages/tui/src/tui.ts:540][E: packages/tui/src/tui.ts:541][E: packages/tui/src/tui.ts:1032][E: packages/tui/src/tui.ts:1041][E: packages/tui/src/tui.ts:1077][E: packages/tui/src/tui.ts:1085]
7. `focus()` 要求 entry 仍在 stack 且可见，然后递增 `focusOrder`、调用 `setFocus(component)` 并 request render。[E: packages/tui/src/tui.ts:547][E: packages/tui/src/tui.ts:548][E: packages/tui/src/tui.ts:549][E: packages/tui/src/tui.ts:550][E: packages/tui/src/tui.ts:551]
8. `unfocus()` 只有在 overlay 当前 focused 或已有该 entry 的 pending restore 时继续；blocked restore 且传入显式 target 时会把 resume 改成 `focus-target` 并返回，否则清理该 entry 的 restore 状态，再在当前 focused 或有 options 时把 focus 转到显式 target、其它 topmost capturing overlay 或 `preFocus`。[E: packages/tui/src/tui.ts:553][E: packages/tui/src/tui.ts:554][E: packages/tui/src/tui.ts:556][E: packages/tui/src/tui.ts:557][E: packages/tui/src/tui.ts:563][E: packages/tui/src/tui.ts:568][E: packages/tui/src/tui.ts:574][E: packages/tui/src/tui.ts:576][E: packages/tui/src/tui.ts:578][E: packages/tui/src/tui.ts:579][E: packages/tui/src/tui.ts:580]

## Focus restore 与 nonCapturing

`isOverlayVisible()` 首先检查 `entry.hidden`，再调用 `options.visible(this.terminal.columns, this.terminal.rows)`，没有 predicate 时默认可见。[E: packages/tui/src/tui.ts:610][E: packages/tui/src/tui.ts:611][E: packages/tui/src/tui.ts:612][E: packages/tui/src/tui.ts:613][E: packages/tui/src/tui.ts:615] `getTopmostVisibleOverlay()` 只考虑 visible 且不是 `nonCapturing` 的 overlay，并按最高 `focusOrder` 选择目标；因此 `nonCapturing` overlay 可以被渲染在 stack 中，但不会成为 fallback focus target。[E: packages/tui/src/tui.ts:619][E: packages/tui/src/tui.ts:621][E: packages/tui/src/tui.ts:622][E: packages/tui/src/tui.ts:623]

当普通 `setFocus()` 要离开一个 focused overlay 且新焦点不是该 overlay 的 preFocus ancestry 时，TUI 会把 overlay focus restore 标成 `blocked`，并记住阻塞它的 component；后续输入处理发现 focus 不在 overlay 上时，会根据 restore state 把 focus 拉回 overlay 或转到显式 resume target。[E: packages/tui/src/tui.ts:396][E: packages/tui/src/tui.ts:400][E: packages/tui/src/tui.ts:402][E: packages/tui/src/tui.ts:405][E: packages/tui/src/tui.ts:406][E: packages/tui/src/tui.ts:810][E: packages/tui/src/tui.ts:812][E: packages/tui/src/tui.ts:813][E: packages/tui/src/tui.ts:817][E: packages/tui/src/tui.ts:820]

当 terminal resize 或 `visible()` predicate 让当前 focused overlay 变为不可见，`handleInput()` 会把 focus 迁到 topmost visible capturing overlay；如果没有这样的 overlay，则用 `setFocusInternal(..., overlayFocusRestore: "preserve")` 回到该 overlay 的 `preFocus`。[E: packages/tui/src/tui.ts:799][E: packages/tui/src/tui.ts:799][E: packages/tui/src/tui.ts:799][E: packages/tui/src/tui.ts:800][E: packages/tui/src/tui.ts:802][E: packages/tui/src/tui.ts:804][E: packages/tui/src/tui.ts:806]

## Layout 与 Compositing

`resolveOverlayLayout()` 将 options 归一化为 `{ width, row, col, maxHeight }`，先把 margin clamp 到非负，再从 terminal width/height 扣出 available width/height。[E: packages/tui/src/tui.ts:897][E: packages/tui/src/tui.ts:910][E: packages/tui/src/tui.ts:911][E: packages/tui/src/tui.ts:912][E: packages/tui/src/tui.ts:913][E: packages/tui/src/tui.ts:916][E: packages/tui/src/tui.ts:917] 默认宽度是 `Math.min(80, availWidth)`，随后应用 `minWidth` 并 clamp 到 available width；`maxHeight` 如果存在也 clamp 到 available height。[E: packages/tui/src/tui.ts:920][E: packages/tui/src/tui.ts:922][E: packages/tui/src/tui.ts:926][E: packages/tui/src/tui.ts:929][E: packages/tui/src/tui.ts:932]

positioning 支持 absolute row/col、百分比 row/col 和 anchor。百分比 row/col 不是直接取 terminal 百分比坐标，而是在 `availHeight - effectiveHeight` 或 `availWidth - width` 的可移动范围内取比例，因此 `"100%"` 表示贴近 bottom/right 且保持 overlay 不越界。[E: packages/tui/src/tui.ts:942][E: packages/tui/src/tui.ts:956][E: packages/tui/src/tui.ts:960][E: packages/tui/src/tui.ts:964][E: packages/tui/src/tui.ts:978][E: packages/tui/src/tui.ts:982][E: packages/tui/src/tui.ts:947][E: packages/tui/src/tui.ts:949][E: packages/tui/src/tui.ts:969][E: packages/tui/src/tui.ts:971] 最终 row/col 会加上 `offsetY`/`offsetX`，再 clamp 到 terminal bounds 和 margins 内。[E: packages/tui/src/tui.ts:987][E: packages/tui/src/tui.ts:988][E: packages/tui/src/tui.ts:991][E: packages/tui/src/tui.ts:992]

`compositeOverlays()` 在 stack 非空时复制 base lines，筛出 visible entries，并按 `focusOrder` 升序排序；后渲染的 overlay 会覆盖先渲染的 overlay，因此更高 `focusOrder` 在视觉上更靠前。[E: packages/tui/src/tui.ts:1032][E: packages/tui/src/tui.ts:1033][E: packages/tui/src/tui.ts:1034][E: packages/tui/src/tui.ts:1040][E: packages/tui/src/tui.ts:1041][I] 每个 overlay 先用 height `0` 解析 width/maxHeight，再以该 width 调用 `component.render(width)`，必要时截断到 `maxHeight`，最后用真实 overlay height 再解析 row/col。[E: packages/tui/src/tui.ts:1047][E: packages/tui/src/tui.ts:1050][E: packages/tui/src/tui.ts:1053][E: packages/tui/src/tui.ts:1054][E: packages/tui/src/tui.ts:1058]

合成前，TUI 把 result padding 到 `Math.max(result.length, termHeight, minLinesNeeded)`，然后用 `viewportStart = Math.max(0, workingHeight - termHeight)` 让 overlay row/col 以可见 viewport 为基准定位。[E: packages/tui/src/tui.ts:1067][E: packages/tui/src/tui.ts:1070][E: packages/tui/src/tui.ts:1074][E: packages/tui/src/tui.ts:1079] 每条 overlay line 会先按声明 width 防御性截断，再交给 `compositeLineAt()` splice 到 base line 指定 column。[E: packages/tui/src/tui.ts:1083][E: packages/tui/src/tui.ts:1084][E: packages/tui/src/tui.ts:1085]

`compositeLineAt()` 对 image line 直接返回 base line，避免覆盖 Kitty image 行；普通文本则通过 `extractSegments()`、`sliceWithWidth()` 和 padding 拼出 before/overlay/after 三段，最后如果 `visibleWidth(result) > totalWidth` 就严格截断到 terminal width。[E: packages/tui/src/tui.ts:1183][E: packages/tui/src/tui.ts:1187][E: packages/tui/src/tui.ts:1190][E: packages/tui/src/tui.ts:1193][E: packages/tui/src/tui.ts:1194][E: packages/tui/src/tui.ts:1198][E: packages/tui/src/tui.ts:1202][E: packages/tui/src/tui.ts:1203][E: packages/tui/src/tui.ts:1206][E: packages/tui/src/tui.ts:1209][E: packages/tui/src/tui.ts:1218][E: packages/tui/src/tui.ts:1219][E: packages/tui/src/tui.ts:1223]

## 与 runtime 和 diff engine 的关系

`subsys.tui.runtime` 描述 `TUI` 作为 root `Container`、input dispatcher 和 render scheduler 的运行时外壳；overlay 依附这个 runtime 的 `focusedComponent`、`handleInput()` 和 `requestRender()`，但 overlay 内容本身仍遵守普通 `Component` contract。[E: packages/tui/src/tui.ts:295][E: packages/tui/src/tui.ts:301][E: packages/tui/src/tui.ts:712][E: packages/tui/src/tui.ts:761][E: packages/tui/src/tui.ts:827][E: packages/tui/src/tui.ts:70]

`subsys.tui.diff-engine` 描述 terminal differential rendering。overlay 合成发生在 `doRender()` 里所有 child components 产出 `newLines` 之后、cursor marker 提取和 line reset/diff compare 之前；因此 diff engine 看到的是已经包含 overlay 的最终 frame。[E: packages/tui/src/tui.ts:1271][E: packages/tui/src/tui.ts:1274][E: packages/tui/src/tui.ts:1275][E: packages/tui/src/tui.ts:1279][E: packages/tui/src/tui.ts:1281][E: packages/tui/src/tui.ts:1368][E: packages/tui/src/tui.ts:1375] 内容 shrink clearing 在有 overlay 时不会触发，因为 overlay 需要 padding 保持 screen-relative placement。[E: packages/tui/src/tui.ts:1361][E: packages/tui/src/tui.ts:1361]

## 设计动机与权衡

- overlay stack 用 `focusOrder` 而不是数组顺序决定 visual-frontmost capturing overlay；`focus()` 和重新显示都会递增 `focusOrder`，这允许旧 overlay 被 bring to front，而不必重排 stack entry。[E: packages/tui/src/tui.ts:623][E: packages/tui/src/tui.ts:1041][E: packages/tui/src/tui.ts:549][E: packages/tui/src/tui.ts:540][I]
- `visible()` predicate 每次通过当前 terminal `columns`/`rows` 判断，可表达响应式 overlay；代价是 focus routing 必须在 input path 再检查 focused overlay 是否仍可见。[E: packages/tui/src/tui.ts:613][E: packages/tui/src/tui.ts:799][I]
- `compositeOverlays()` 先算 width 再 render，再用真实 height 重算 position；这避免 component render 依赖 width 时提前需要 height，但意味着 position 计算可能调用两次。[E: packages/tui/src/tui.ts:1047][E: packages/tui/src/tui.ts:1050][E: packages/tui/src/tui.ts:1058][I]

## Gotchas

- `setHidden(true)` 不是 `hide()`：前者保留 entry 和 handle，后者从 stack 删除 entry，删除后 `focus()` 会因为 entry 不在 stack 中直接 return。[E: packages/tui/src/tui.ts:516][E: packages/tui/src/tui.ts:528][E: packages/tui/src/tui.ts:548]
- `hideOverlay()` 只 pop `overlayStack` 数组末尾，不按 `focusOrder` 找 visual top；如果调用方混用 `focus()` bring-to-front 和 `hideOverlay()`，需要意识到 stack top 与 visual top 可能不同。[E: packages/tui/src/tui.ts:590][E: packages/tui/src/tui.ts:594][E: packages/tui/src/tui.ts:549][I]
- `nonCapturing` overlay 仍会参与 `compositeOverlays()`，但不会通过 `showOverlay()` 或 `getTopmostVisibleOverlay()` 捕获/恢复 keyboard focus。[E: packages/tui/src/tui.ts:503][E: packages/tui/src/tui.ts:622][E: packages/tui/src/tui.ts:1040]

## Sources

- `packages/tui/src/tui.ts`

## 相关

- [subsys.tui.runtime](runtime.md): `TUI` root container、input dispatch、focus state 与 render scheduling。
- [subsys.tui.diff-engine](diff-engine.md): overlay 合成后进入的 terminal diff rendering 与 cursor/image 处理。
