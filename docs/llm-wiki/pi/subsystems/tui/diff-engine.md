---
id: subsys.tui.diff-engine
title: 差分渲染引擎
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/tui.ts, packages/tui/src/terminal.ts]
symbols: [doRender, compositeLineAt, normalizeTerminalOutput]
related: [subsys.tui.runtime, subsys.tui.cursor-positioning]
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.tui.diff-engine` 描述 `pi-tui` 怎样把 component render output 转成 terminal buffer，并只重画变化区间。

## 能回答的问题

- `TUI.requestRender()` 怎样合并频繁 render 请求并节流到 `doRender()`？
- `doRender()` 什么时候走 full render，什么时候走 differential render？
- `previousLines`、`previousViewportTop`、`hardwareCursorRow` 在 diff 中各自保存什么状态？
- overlay 为什么要在 diff compare 前合成到 base lines？
- `compositeLineAt()` 怎样按 terminal column 拼接 overlay line，并避免宽字符或 ANSI sequence 造成溢出？
- `normalizeTerminalOutput` 在本节点里承担什么角色，它的定义归属有什么疑点？

## 职责边界

差分渲染引擎位于 `packages/tui/src/tui.ts` 的 `TUI` 类内部；`TUI` 继承 `Container`，持有一个 `Terminal`，并维护上一帧 lines、上一帧 viewport、terminal 宽高、logical cursor 和 hardware cursor 等 render 状态。[E: packages/tui/src/tui.ts:295][E: packages/tui/src/tui.ts:296][E: packages/tui/src/tui.ts:297][E: packages/tui/src/tui.ts:299][E: packages/tui/src/tui.ts:300][E: packages/tui/src/tui.ts:310][E: packages/tui/src/tui.ts:311][E: packages/tui/src/tui.ts:315]

`Terminal` 是 diff engine 的输出边界：`doRender()` 的 full/diff 写入点都通过 `Terminal.write(data)` 写入合成后的 escape-sequence buffer。[E: packages/tui/src/terminal.ts:52][E: packages/tui/src/terminal.ts:68][E: packages/tui/src/tui.ts:1309][E: packages/tui/src/tui.ts:1602] 真实 `ProcessTerminal.write()` 再把数据写到 stdout，并在 `PI_TUI_WRITE_LOG` 配置存在时追加写日志。[E: packages/tui/src/terminal.ts:454][E: packages/tui/src/terminal.ts:455][E: packages/tui/src/terminal.ts:456][E: packages/tui/src/terminal.ts:458]

本节点覆盖 `normalizeTerminalOutput` 在 diff pipeline 中的调用位置：`tui.ts` 从 `./utils.ts` 导入该函数，`applyLineResets()` 对非 image line 调用它，然后追加统一 reset sequence。[E: packages/tui/src/tui.ts:19][E: packages/tui/src/tui.ts:1095][E: packages/tui/src/tui.ts:1100] 但 `normalizeTerminalOutput` 的定义文件没有列入本节点 `source`，所以本节点只把它作为 diff 前规范化步骤解释，而不把 `utils.ts` 的实现当作本页 source ground truth。[U]

## 关键文件

- `packages/tui/src/tui.ts`: `TUI.requestRender()`、`scheduleRender()`、`doRender()`、`compositeOverlays()`、`compositeLineAt()` 和 line reset / Kitty image cleanup 都在此文件内。[E: packages/tui/src/tui.ts:712][E: packages/tui/src/tui.ts:741][E: packages/tui/src/tui.ts:1032][E: packages/tui/src/tui.ts:1176][E: packages/tui/src/tui.ts:1254]
- `packages/tui/src/terminal.ts`: `Terminal` interface 暴露 dimensions、write、cursor movement、clear operation 和 cursor visibility；diff engine 依赖这些原语而不是直接管理 terminal process lifecycle。[E: packages/tui/src/terminal.ts:68][E: packages/tui/src/terminal.ts:71][E: packages/tui/src/terminal.ts:72][E: packages/tui/src/terminal.ts:78][E: packages/tui/src/terminal.ts:81][E: packages/tui/src/terminal.ts:82][E: packages/tui/src/terminal.ts:85][E: packages/tui/src/terminal.ts:86][E: packages/tui/src/terminal.ts:87]

## 数据模型

`previousLines` 是上一帧已经写入 terminal 的 logical line array；`doRender()` 会把新一帧 `newLines` 和它逐行比较，full/diff 写入成功后用 `newLines` 覆盖 `previousLines`。[E: packages/tui/src/tui.ts:297][E: packages/tui/src/tui.ts:1370][E: packages/tui/src/tui.ts:1372][E: packages/tui/src/tui.ts:1373][E: packages/tui/src/tui.ts:1375][E: packages/tui/src/tui.ts:1321][E: packages/tui/src/tui.ts:1616]

`previousWidth` 与 `previousHeight` 保存上一帧 terminal dimensions；`doRender()` 用它们判断 width/height 是否变化，并在 full/diff 写入路径收尾写回当前 dimensions。[E: packages/tui/src/tui.ts:299][E: packages/tui/src/tui.ts:300][E: packages/tui/src/tui.ts:1256][E: packages/tui/src/tui.ts:1257][E: packages/tui/src/tui.ts:1258][E: packages/tui/src/tui.ts:1259][E: packages/tui/src/tui.ts:1323][E: packages/tui/src/tui.ts:1324][E: packages/tui/src/tui.ts:1618][E: packages/tui/src/tui.ts:1619]

`previousViewportTop` 表示上一帧 logical buffer 映射到 terminal viewport 的顶部行；height change 时，`doRender()` 用上一帧 buffer length 重新估算 viewport top，普通 diff 时也会在滚动后更新它。[E: packages/tui/src/tui.ts:315][E: packages/tui/src/tui.ts:1260][E: packages/tui/src/tui.ts:1261][E: packages/tui/src/tui.ts:1475][E: packages/tui/src/tui.ts:1476][E: packages/tui/src/tui.ts:1611]

`cursorRow` 是内容末尾的 logical cursor row，`hardwareCursorRow` 是 terminal 上实际光标所在行；`computeLineDiff()` 用 `hardwareCursorRow` 与 viewport top 计算相对移动，避免把 IME cursor positioning 后的实际位置误当成 logical content end。[E: packages/tui/src/tui.ts:310][E: packages/tui/src/tui.ts:311][E: packages/tui/src/tui.ts:1263][E: packages/tui/src/tui.ts:1264][E: packages/tui/src/tui.ts:1265][E: packages/tui/src/tui.ts:1266][E: packages/tui/src/tui.ts:1267][I]

`previousKittyImageIds` 是上一帧 Kitty image id 集合；full clear 会删除整批旧 image，局部 diff 会删除 changed range 内的旧 image，full/diff 写入成功后重新收集当前帧 image id。[E: packages/tui/src/tui.ts:298][E: packages/tui/src/tui.ts:1288][E: packages/tui/src/tui.ts:1464][E: packages/tui/src/tui.ts:1322][E: packages/tui/src/tui.ts:1617]

## 控制流

1. `requestRender(force=false)` 先把 `renderRequested` 置位；非 force 路径用 `process.nextTick()` 进入 `scheduleRender()`，多次同步请求会被 `renderRequested` 合并。[E: packages/tui/src/tui.ts:712][E: packages/tui/src/tui.ts:736][E: packages/tui/src/tui.ts:737][E: packages/tui/src/tui.ts:738]
2. force render 会清空 `previousLines`，把 `previousWidth` 和 `previousHeight` 置为 `-1` 来触发 full clear，并在 next tick 直接调用 `doRender()`。[E: packages/tui/src/tui.ts:713][E: packages/tui/src/tui.ts:714][E: packages/tui/src/tui.ts:715][E: packages/tui/src/tui.ts:716][E: packages/tui/src/tui.ts:726][E: packages/tui/src/tui.ts:732]
3. `scheduleRender()` 用 `MIN_RENDER_INTERVAL_MS = 16` 和 `lastRenderAt` 算出 delay，再在 timer callback 中清除 `renderRequested`、更新时间戳并调用 `doRender()`。[E: packages/tui/src/tui.ts:309][E: packages/tui/src/tui.ts:745][E: packages/tui/src/tui.ts:746][E: packages/tui/src/tui.ts:747][E: packages/tui/src/tui.ts:752][E: packages/tui/src/tui.ts:753][E: packages/tui/src/tui.ts:754]
4. `doRender()` 读取 terminal columns/rows，渲染所有 components 得到 `newLines`，如果 overlay stack 非空就在 diff compare 前调用 `compositeOverlays()` 合成 overlay。[E: packages/tui/src/tui.ts:1254][E: packages/tui/src/tui.ts:1256][E: packages/tui/src/tui.ts:1257][E: packages/tui/src/tui.ts:1271][E: packages/tui/src/tui.ts:1274][E: packages/tui/src/tui.ts:1275]
5. `doRender()` 在 apply reset 前先抽取 `CURSOR_MARKER`，再调用 `applyLineResets()`；这样 marker 不会被 reset/normalization 逻辑干扰。[E: packages/tui/src/tui.ts:1279][E: packages/tui/src/tui.ts:1279][E: packages/tui/src/tui.ts:1281][I]
6. `fullRender(clear)` 用 synchronized output 包住整帧；`clear=true` 时先删除旧 Kitty images，再发送 clear screen、home、clear scrollback 的 escape sequence，然后逐行写入新内容并更新 previous state。[E: packages/tui/src/tui.ts:1284][E: packages/tui/src/tui.ts:1286][E: packages/tui/src/tui.ts:1288][E: packages/tui/src/tui.ts:1289][E: packages/tui/src/tui.ts:1291][E: packages/tui/src/tui.ts:1308][E: packages/tui/src/tui.ts:1309][E: packages/tui/src/tui.ts:1321][E: packages/tui/src/tui.ts:1322][E: packages/tui/src/tui.ts:1323][E: packages/tui/src/tui.ts:1324]
7. 首帧在没有 width/height change 时直接 `fullRender(false)`；width change 一律 `fullRender(true)`，非 Termux 的 height change 也 `fullRender(true)`。[E: packages/tui/src/tui.ts:1336][E: packages/tui/src/tui.ts:1338][E: packages/tui/src/tui.ts:1343][E: packages/tui/src/tui.ts:1345][E: packages/tui/src/tui.ts:1352][E: packages/tui/src/tui.ts:1354]
8. 普通 diff 逐行找 `firstChanged` 和 `lastChanged`，若 append-only 增长但没有逐行差异，则把 `firstChanged` 设为旧长度、`lastChanged` 设为新末行。[E: packages/tui/src/tui.ts:1368][E: packages/tui/src/tui.ts:1370][E: packages/tui/src/tui.ts:1375][E: packages/tui/src/tui.ts:1376][E: packages/tui/src/tui.ts:1379][E: packages/tui/src/tui.ts:1382][E: packages/tui/src/tui.ts:1384][E: packages/tui/src/tui.ts:1385][E: packages/tui/src/tui.ts:1387]
9. 如果 changed range 触及 Kitty image block，`expandChangedRangeForKittyImages()` 会扩大重画区间；实际写 buffer 前，`deleteChangedKittyImages()` 会删除旧 changed range 中的 Kitty images。[E: packages/tui/src/tui.ts:1147][E: packages/tui/src/tui.ts:1148][E: packages/tui/src/tui.ts:1149][E: packages/tui/src/tui.ts:1150][E: packages/tui/src/tui.ts:1151][E: packages/tui/src/tui.ts:1390][E: packages/tui/src/tui.ts:1391][E: packages/tui/src/tui.ts:1392][E: packages/tui/src/tui.ts:1464]
10. 没有文本变化时，`doRender()` 仍会调用 `positionHardwareCursor()`，更新 viewport height，然后返回；这让硬件光标移动不必重写文本内容。[E: packages/tui/src/tui.ts:1397][E: packages/tui/src/tui.ts:1397][E: packages/tui/src/tui.ts:1398][E: packages/tui/src/tui.ts:1399][E: packages/tui/src/tui.ts:1400][E: packages/tui/src/tui.ts:1401][I]
11. 当所有变化都落在被删除的尾部行时，`doRender()` 构造只清空多余行的 buffer；如果清理会越出可处理范围，则退回 full render。[E: packages/tui/src/tui.ts:1405][E: packages/tui/src/tui.ts:1405][E: packages/tui/src/tui.ts:1421][E: packages/tui/src/tui.ts:1422][E: packages/tui/src/tui.ts:1424][E: packages/tui/src/tui.ts:1431][E: packages/tui/src/tui.ts:1432][E: packages/tui/src/tui.ts:1440]
12. 如果 `firstChanged` 位于上一帧 viewport 之上，差分引擎不能安全触达那部分历史内容，因此退回 `fullRender(true)`。[E: packages/tui/src/tui.ts:1455][E: packages/tui/src/tui.ts:1455][E: packages/tui/src/tui.ts:1457]
13. 正常 differential render 从 changed range 开始构造 synchronized buffer，移动到目标行，只写 `firstChanged..renderEnd`；普通文本行先 clear current line 再写新 line，Kitty image 行走专门的预清理/写入分支。[E: packages/tui/src/tui.ts:1463][E: packages/tui/src/tui.ts:1463][E: packages/tui/src/tui.ts:1481][E: packages/tui/src/tui.ts:1481][E: packages/tui/src/tui.ts:1492][E: packages/tui/src/tui.ts:1492][E: packages/tui/src/tui.ts:1493][E: packages/tui/src/tui.ts:1508][E: packages/tui/src/tui.ts:1513][E: packages/tui/src/tui.ts:1519][E: packages/tui/src/tui.ts:1548]
14. 写入前如果非 image line 的 `visibleWidth(line)` 大于 terminal width，`doRender()` 写 crash log、停止 TUI 并抛错；这是防止 component 输出换行破坏 terminal state 的硬防线。[E: packages/tui/src/tui.ts:1520][E: packages/tui/src/tui.ts:1522][E: packages/tui/src/tui.ts:1532][E: packages/tui/src/tui.ts:1533][E: packages/tui/src/tui.ts:1536][E: packages/tui/src/tui.ts:1546][I]
15. differential buffer 写入后，`doRender()` 更新 cursor/viewport/previous state，并再次调用 `positionHardwareCursor()` 对齐 IME candidate window 需要的硬件光标位置。[E: packages/tui/src/tui.ts:1602][E: packages/tui/src/tui.ts:1602][E: packages/tui/src/tui.ts:1607][E: packages/tui/src/tui.ts:1608][E: packages/tui/src/tui.ts:1610][E: packages/tui/src/tui.ts:1611][E: packages/tui/src/tui.ts:1614][E: packages/tui/src/tui.ts:1616]

## overlay 合成与 compositeLineAt

`compositeOverlays()` 只在 overlay stack 非空时参与 render；它筛出 visible overlay，按 `focusOrder` 从低到高排序，让更晚 focus 的 overlay 后合成到同一 result line 上。[E: packages/tui/src/tui.ts:1032][E: packages/tui/src/tui.ts:1033][E: packages/tui/src/tui.ts:1040][E: packages/tui/src/tui.ts:1041][E: packages/tui/src/tui.ts:1077][I]

每个 overlay 先用 resolved width render，再按 `maxHeight` 截断，最后用实际 overlay height 重新求 row/col；这样 width/maxHeight 与最终位置都来自同一套 layout resolver。[E: packages/tui/src/tui.ts:1047][E: packages/tui/src/tui.ts:1050][E: packages/tui/src/tui.ts:1053][E: packages/tui/src/tui.ts:1054][E: packages/tui/src/tui.ts:1058][E: packages/tui/src/tui.ts:1060]

overlay 合成前，working height 取 base result length、terminal height、overlay 所需末行三者最大值；这让 overlay 可以按屏幕相对位置放置，即使 base content 比 terminal viewport 短。[E: packages/tui/src/tui.ts:1061][E: packages/tui/src/tui.ts:1067][E: packages/tui/src/tui.ts:1070][E: packages/tui/src/tui.ts:1071][E: packages/tui/src/tui.ts:1074][I]

`compositeLineAt(baseLine, overlayLine, startCol, overlayWidth, totalWidth)` 遇到 image line 直接返回 base line，不把文本 overlay splice 进 Kitty image sequence。[E: packages/tui/src/tui.ts:1176][E: packages/tui/src/tui.ts:1183]

`compositeLineAt()` 用 `extractSegments()` 一次从 base line 中提取 before/after，再用 `sliceWithWidth()` 按 column 严格截取 overlay text；随后它补齐 before、overlay、after 的空格，并在拼接点插入 `SEGMENT_RESET` 分隔拼接段。[E: packages/tui/src/tui.ts:1186][E: packages/tui/src/tui.ts:1187][E: packages/tui/src/tui.ts:1190][E: packages/tui/src/tui.ts:1190][E: packages/tui/src/tui.ts:1193][E: packages/tui/src/tui.ts:1194][E: packages/tui/src/tui.ts:1198][E: packages/tui/src/tui.ts:1201][E: packages/tui/src/tui.ts:1202][E: packages/tui/src/tui.ts:1205][E: packages/tui/src/tui.ts:1208]

`compositeLineAt()` 的最后防线是用 `visibleWidth(result)` 检查合成后宽度；宽度不超过 terminal width 时返回结果，否则用 `sliceByColumn(result, 0, totalWidth, true)` 严格截断。[E: packages/tui/src/tui.ts:1218][E: packages/tui/src/tui.ts:1219][E: packages/tui/src/tui.ts:1220][E: packages/tui/src/tui.ts:1223]

## 设计动机与权衡

render 请求被 next tick 合并，并以 16ms 最小间隔节流；这偏向降低频繁 spinner、input echo 或 streaming update 的 terminal 写入压力，而不是每个状态变化立即同步刷屏。[E: packages/tui/src/tui.ts:306][E: packages/tui/src/tui.ts:309][E: packages/tui/src/tui.ts:736][E: packages/tui/src/tui.ts:747][I]

width change 直接 full clear，因为同一 logical line 在不同 terminal width 下可能改变 wrapping；height change 在非 Termux 环境也 full clear，但 Termux 被特判跳过 full redraw，以避免软键盘显示/隐藏时把历史内容反复 replay。[E: packages/tui/src/tui.ts:1343][E: packages/tui/src/tui.ts:1343][E: packages/tui/src/tui.ts:1345][E: packages/tui/src/tui.ts:1352][E: packages/tui/src/tui.ts:1352][E: packages/tui/src/tui.ts:1354][I]

`clearOnShrink` 默认来自 `PI_CLEAR_ON_SHRINK === "1"`，只有开启且没有 overlay 时才因内容缩短触发 full clear；这把“清掉空行”做成可选行为，减少慢 terminal 上的 full redraw。[E: packages/tui/src/tui.ts:313][E: packages/tui/src/tui.ts:1361][E: packages/tui/src/tui.ts:1363][I]

差分路径只写 changed range，而不是从第一处变化写到末尾；代码注释给出的动机是减少单行变化例如 spinner animation 时的 flicker。[E: packages/tui/src/tui.ts:1492][E: packages/tui/src/tui.ts:1492][E: packages/tui/src/tui.ts:1493]

所有 full/diff buffer 都用 synchronized output `\x1b[?2026h` / `\x1b[?2026l` 包裹，意图是让 terminal 尽量把一批更新作为一个画面提交。[E: packages/tui/src/tui.ts:1286][E: packages/tui/src/tui.ts:1308][E: packages/tui/src/tui.ts:1463][E: packages/tui/src/tui.ts:1570][I]

## Gotcha

`normalizeTerminalOutput` 在 `tui.ts` 中是 diff 前 line normalization 的调用点，但其实现不在本节点 source 列表中；如果后续把 `normalizeTerminalOutput` 作为独立权威符号覆盖，index 的 source 可能需要加入 `packages/tui/src/utils.ts` 或把该 symbol 移到覆盖 `utils.ts` 的节点。[U]

差分渲染只能可靠修改上一帧可见 viewport 内的内容；`firstChanged < prevViewportTop` 会退回 full render，因此把长历史内容中不可见区域当作可局部修补是不成立的。[E: packages/tui/src/tui.ts:1455][E: packages/tui/src/tui.ts:1455][E: packages/tui/src/tui.ts:1457]

overlay 会在 diff compare 前合成进 `newLines`，所以 overlay 的显示/隐藏、focus order、尺寸变化都会表现为普通 line diff；这简化了输出路径，但也意味着 overlay padding 会影响 working height 和 viewport 计算。[E: packages/tui/src/tui.ts:1274][E: packages/tui/src/tui.ts:1275][E: packages/tui/src/tui.ts:1067][I]

## 跨包边界

`subsys.tui.runtime` 应解释 `TUI`/`Container`/`Component` 的运行时生命周期；本节点只解释 render scheduling、line diff、terminal buffer 和 overlay compositing，不覆盖 input focus、component ownership 或 app-level session orchestration。[E: packages/tui/src/tui.ts:64][E: packages/tui/src/tui.ts:256][E: packages/tui/src/tui.ts:295][I]

`subsys.tui.cursor-positioning` 应解释 `CURSOR_MARKER`、`extractCursorPosition()` 和 `positionHardwareCursor()` 的硬件光标协议；本节点只说明 diff engine 在 render 前抽取 cursor marker、在写入后调用 cursor positioning。[E: packages/tui/src/tui.ts:120][E: packages/tui/src/tui.ts:1234][E: packages/tui/src/tui.ts:1279][E: packages/tui/src/tui.ts:1614][E: packages/tui/src/tui.ts:1627]

## Sources

- packages/tui/src/tui.ts
- packages/tui/src/terminal.ts

## 相关

- `subsys.tui.runtime`: TUI runtime、component tree、focus/input 生命周期的 sibling 节点。
- `subsys.tui.cursor-positioning`: hardware cursor、IME candidate window positioning 与 `CURSOR_MARKER` 的 sibling 节点。
