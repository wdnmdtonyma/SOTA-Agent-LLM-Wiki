---
id: subsys.tui.text-utilities
title: 文本宽度/截断/换行工具
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/utils.ts]
symbols: [visibleWidth, truncateToWidth, wrapTextWithAnsi]
related: [subsys.tui.diff-engine]
evidence: explicit
status: verified
updated: 5a073885
---

> 文本宽度/截断/换行工具是 `pi-tui` 的 terminal text measurement layer:它把 Unicode grapheme、East Asian Width、emoji、tab、ANSI/OSC escape sequence 统一折算成 terminal columns,并提供 ANSI-safe truncation 与 word wrapping。

## 能回答的问题

- `visibleWidth(str)` 为什么不能直接用 `str.length` 替代?
- `truncateToWidth(text, maxWidth, ellipsis, pad)` 如何避免 ANSI style 污染 ellipsis 或后续 terminal 输出?
- `wrapTextWithAnsi(text, width)` 如何在换行后延续 SGR style 与 OSC 8 hyperlink?
- CJK、emoji、regional indicator、Thai/Lao AM vowel、tab 在 TUI 宽度计算里如何处理?
- 这些 utilities 与 `subsys.tui.diff-engine` 的 line width hard guard 是什么关系?

## 职责边界

本节点覆盖 `packages/tui/src/utils.ts` 中三个对外符号:`visibleWidth`、`truncateToWidth`、`wrapTextWithAnsi`。`visibleWidth` 是 terminal column measurement 的基础函数;`truncateToWidth` 接收 `maxWidth`、`ellipsis`、`pad` 并在截断路径走 `finalizeTruncatedResult`;`wrapTextWithAnsi` 是导出函数,按 input line 调用 `wrapSingleLine` 后返回数组 [E: packages/tui/src/utils.ts:216] [E: packages/tui/src/utils.ts:915] [E: packages/tui/src/utils.ts:917] [E: packages/tui/src/utils.ts:918] [E: packages/tui/src/utils.ts:919] [E: packages/tui/src/utils.ts:1050] [E: packages/tui/src/utils.ts:694] [E: packages/tui/src/utils.ts:708] [E: packages/tui/src/utils.ts:716]。

这个文件还包含支撑符号,包括 shared `Intl.Segmenter`、`graphemeWidth`、ANSI/OSC/APC parser、`AnsiCodeTracker`、`normalizeTerminalOutput`、`sliceByColumn`、`sliceWithWidth` 和 `extractSegments` [E: packages/tui/src/utils.ts:4] [E: packages/tui/src/utils.ts:5] [E: packages/tui/src/utils.ts:167] [E: packages/tui/src/utils.ts:290] [E: packages/tui/src/utils.ts:369] [E: packages/tui/src/utils.ts:282] [E: packages/tui/src/utils.ts:1057] [E: packages/tui/src/utils.ts:1062] [E: packages/tui/src/utils.ts:1117]。本节点只详写 `visibleWidth`/`truncateToWidth`/`wrapTextWithAnsi`; overlay slicing 的合成语义由 [subsys.tui.diff-engine](diff-engine.md) 承接。

## 关键文件

`packages/tui/src/utils.ts` 是本节点的唯一 source of truth。它在顶部创建两个共享 segmenter:`graphemeSegmenter` 用于 grapheme cluster traversal,`wordSegmenter` 用于 word granularity traversal [E: packages/tui/src/utils.ts:4] [E: packages/tui/src/utils.ts:5]。宽度计算还依赖 `get-east-asian-width` 的 `eastAsianWidth(cp)` 结果,并在 `graphemeWidth` 内作为 base visible codepoint 的基础宽度 [E: packages/tui/src/utils.ts:1] [E: packages/tui/src/utils.ts:196]。

## 数据模型

### Grapheme width model

`graphemeWidth(segment)` 是 `visibleWidth` 和 wrapping/truncation 的底层 cell-width oracle。它把 tab 固定计为 3 columns [E: packages/tui/src/utils.ts:168] [E: packages/tui/src/utils.ts:169],把 Default Ignorable、Control、Mark、Surrogate 组成的 cluster 计为 0 [E: packages/tui/src/utils.ts:40] [E: packages/tui/src/utils.ts:173] [E: packages/tui/src/utils.ts:174],把通过 broad prefilter 且匹配 `\p{RGI_Emoji}` 的 emoji 计为 2 [E: packages/tui/src/utils.ts:27] [E: packages/tui/src/utils.ts:42] [E: packages/tui/src/utils.ts:178] [E: packages/tui/src/utils.ts:179]。

Regional indicator singleton 也被保守计为 2 columns:代码在 U+1F1E6..U+1F1FF range 内直接返回 2;源码注释给出的 terminal streaming 动机只作为解释性背景 [E: packages/tui/src/utils.ts:192] [E: packages/tui/src/utils.ts:193] [I]。对于普通可见 codepoint,`graphemeWidth` 先移除 leading non-printing codepoints,取 base codepoint 调用 `eastAsianWidth`,再额外累加 trailing Halfwidth/Fullwidth Forms 和 Thai/Lao AM vowel 组合中的特定 codepoint [E: packages/tui/src/utils.ts:183] [E: packages/tui/src/utils.ts:184] [E: packages/tui/src/utils.ts:196] [E: packages/tui/src/utils.ts:199] [E: packages/tui/src/utils.ts:202] [E: packages/tui/src/utils.ts:204] [E: packages/tui/src/utils.ts:205]。

### ANSI sequence model

`extractAnsiCode(str, pos)` 只在当前位置是 ESC 时尝试识别 escape sequence [E: packages/tui/src/utils.ts:290] [E: packages/tui/src/utils.ts:291]。它支持 CSI `ESC [` 序列,终止符限定为 `m/G/K/H/J`;支持 OSC `ESC ]` 序列,终止于 BEL 或 ST;支持 APC `ESC _` 序列,同样终止于 BEL 或 ST [E: packages/tui/src/utils.ts:296] [E: packages/tui/src/utils.ts:298] [E: packages/tui/src/utils.ts:299] [E: packages/tui/src/utils.ts:305] [E: packages/tui/src/utils.ts:308] [E: packages/tui/src/utils.ts:309] [E: packages/tui/src/utils.ts:317] [E: packages/tui/src/utils.ts:320] [E: packages/tui/src/utils.ts:321]。这些 escape sequences 不贡献 visible width,但会被 truncate/wrap 逻辑保留或重新发射 [E: packages/tui/src/utils.ts:244] [E: packages/tui/src/utils.ts:246] [E: packages/tui/src/utils.ts:983] [E: packages/tui/src/utils.ts:779]。

`AnsiCodeTracker` 逐项记录 SGR attributes、foreground/background color 与 active OSC 8 hyperlink [E: packages/tui/src/utils.ts:371] [E: packages/tui/src/utils.ts:379] [E: packages/tui/src/utils.ts:380] [E: packages/tui/src/utils.ts:381]。`process()` 会把 OSC 8 hyperlink open/close 解析成 `activeHyperlink`,并解析 SGR reset、standard colors、256-color、RGB color 和 attribute on/off codes [E: packages/tui/src/utils.ts:383] [E: packages/tui/src/utils.ts:388] [E: packages/tui/src/utils.ts:390] [E: packages/tui/src/utils.ts:403] [E: packages/tui/src/utils.ts:405] [E: packages/tui/src/utils.ts:416] [E: packages/tui/src/utils.ts:431] [E: packages/tui/src/utils.ts:447] [E: packages/tui/src/utils.ts:471] [E: packages/tui/src/utils.ts:474] [E: packages/tui/src/utils.ts:504] [E: packages/tui/src/utils.ts:508]。`getActiveCodes()` 将当前 SGR state 和 active hyperlink 序列化回 line prefix;`getLineEndReset()` 只关闭 underline 和 active OSC 8 hyperlink,不做 full reset,从而让 background color 可以跨 wrapped line 延续到 caller 的 padding 阶段 [E: packages/tui/src/utils.ts:537] [E: packages/tui/src/utils.ts:550] [E: packages/tui/src/utils.ts:552] [E: packages/tui/src/utils.ts:579] [E: packages/tui/src/utils.ts:581] [E: packages/tui/src/utils.ts:584] [E: packages/tui/src/utils.ts:585] [I]。

## 控制流

### `visibleWidth(str)`

1. 空字符串直接返回 0;纯 printable ASCII 走 fast path,返回 `str.length` [E: packages/tui/src/utils.ts:217] [E: packages/tui/src/utils.ts:218] [E: packages/tui/src/utils.ts:222] [E: packages/tui/src/utils.ts:223]。
2. 非 printable-ASCII path 先查 `widthCache`;cache size 上限是 512,写入前如果满了就删除第一个 key [E: packages/tui/src/utils.ts:45] [E: packages/tui/src/utils.ts:46] [E: packages/tui/src/utils.ts:227] [E: packages/tui/src/utils.ts:229] [E: packages/tui/src/utils.ts:262] [E: packages/tui/src/utils.ts:263] [E: packages/tui/src/utils.ts:265] [E: packages/tui/src/utils.ts:268]。
3. 输入中的 tab 在测量前替换成三个空格;ANSI/OSC/APC escape sequences 通过 `extractAnsiCode` 单 pass 跳过 [E: packages/tui/src/utils.ts:233] [E: packages/tui/src/utils.ts:234] [E: packages/tui/src/utils.ts:235] [E: packages/tui/src/utils.ts:237] [E: packages/tui/src/utils.ts:244] [E: packages/tui/src/utils.ts:246]。
4. 清洗后的字符串按 grapheme cluster 遍历,每个 segment 交给 `graphemeWidth`,累加出 terminal visible width [E: packages/tui/src/utils.ts:257] [E: packages/tui/src/utils.ts:258]。

### `truncateToWidth(text, maxWidth, ellipsis, pad)`

1. `maxWidth <= 0` 返回空串;空输入在 `pad=true` 时返回 `maxWidth` 个空格,否则返回空串 [E: packages/tui/src/utils.ts:921] [E: packages/tui/src/utils.ts:922] [E: packages/tui/src/utils.ts:925] [E: packages/tui/src/utils.ts:926]。
2. 先测量 ellipsis。如果 ellipsis 本身宽度大于等于 `maxWidth`,函数优先保留已经 fit 的原文;否则把 ellipsis 自己裁到 `maxWidth`,再用 `finalizeTruncatedResult` 输出 [E: packages/tui/src/utils.ts:929] [E: packages/tui/src/utils.ts:930] [E: packages/tui/src/utils.ts:931] [E: packages/tui/src/utils.ts:933] [E: packages/tui/src/utils.ts:936] [E: packages/tui/src/utils.ts:940]。
3. 纯 printable ASCII 走 fast path:若已经 fit,可选 padding;若超宽,保留 `maxWidth - ellipsisWidth` 个字符后接 ellipsis [E: packages/tui/src/utils.ts:943] [E: packages/tui/src/utils.ts:945] [E: packages/tui/src/utils.ts:947] [E: packages/tui/src/utils.ts:948]。
4. Unicode/ANSI 路径维护 `result`、`pendingAnsi`、`visibleSoFar`、`keptWidth`、`keepContiguousPrefix`、`overflowed` 与 `exhaustedInput` [E: packages/tui/src/utils.ts:951] [E: packages/tui/src/utils.ts:953] [E: packages/tui/src/utils.ts:954] [E: packages/tui/src/utils.ts:955] [E: packages/tui/src/utils.ts:956] [E: packages/tui/src/utils.ts:957] [E: packages/tui/src/utils.ts:958]。`keepContiguousPrefix=false` 后不会跳过一个太宽 grapheme 又继续保留后面的内容,因此 truncate result 是原文的 contiguous prefix 加 ellipsis [E: packages/tui/src/utils.ts:965] [E: packages/tui/src/utils.ts:968] [E: packages/tui/src/utils.ts:969] [E: packages/tui/src/utils.ts:1020] [E: packages/tui/src/utils.ts:1027] [E: packages/tui/src/utils.ts:1028]。
5. ANSI path 把 escape sequence 暂存到 `pendingAnsi`,只有下一个 visible segment 确认会被保留时才写入 result;如果对应 visible segment 已经不再保留,`pendingAnsi` 被清空 [E: packages/tui/src/utils.ts:981] [E: packages/tui/src/utils.ts:983] [E: packages/tui/src/utils.ts:990] [E: packages/tui/src/utils.ts:992] [E: packages/tui/src/utils.ts:997] [E: packages/tui/src/utils.ts:998] [E: packages/tui/src/utils.ts:1021] [E: packages/tui/src/utils.ts:1023] [E: packages/tui/src/utils.ts:1028] [E: packages/tui/src/utils.ts:1029]。
6. `finalizeTruncatedResult` 总是在 kept prefix 后追加 SGR reset;ellipsis 非空时再追加 ellipsis 和另一个 reset,ellipsis 为空时只保留 prefix 后的 reset;`pad=true` 时再按 `maxWidth - visibleWidth` 追加 spaces [E: packages/tui/src/utils.ts:149] [E: packages/tui/src/utils.ts:153] [E: packages/tui/src/utils.ts:154] [E: packages/tui/src/utils.ts:156] [E: packages/tui/src/utils.ts:159]。这个 reset bracketing 是防止被截断文本的 active style 泄漏到 ellipsis 或后续 terminal 内容的防线 [I]。

### `wrapTextWithAnsi(text, width)`

1. 空输入返回 `[""]` [E: packages/tui/src/utils.ts:695] [E: packages/tui/src/utils.ts:696]。
2. 函数先按 literal newline 切分 input line,并用外层 `AnsiCodeTracker` 在这些输入行之间传递 active ANSI state;除第一行外,每个后续 input line 会先 prepend `tracker.getActiveCodes()` 再进入 `wrapSingleLine` [E: packages/tui/src/utils.ts:701] [E: packages/tui/src/utils.ts:703] [E: packages/tui/src/utils.ts:705] [E: packages/tui/src/utils.ts:707] [E: packages/tui/src/utils.ts:708] [E: packages/tui/src/utils.ts:713]。
3. `wrapSingleLine` 对已经 fit 的单行直接返回;否则调用 `splitIntoTokensWithAnsi` 生成 tokens [E: packages/tui/src/utils.ts:724] [E: packages/tui/src/utils.ts:725] [E: packages/tui/src/utils.ts:726] [E: packages/tui/src/utils.ts:731]。tokenizer 把 pending ANSI 附着到下一个 visible character,将 CJK grapheme 单独作为可断点 token,并把普通空格与 word 分成不同 token [E: packages/tui/src/utils.ts:624] [E: packages/tui/src/utils.ts:627] [E: packages/tui/src/utils.ts:637] [E: packages/tui/src/utils.ts:639] [E: packages/tui/src/utils.ts:641] [E: packages/tui/src/utils.ts:643] [E: packages/tui/src/utils.ts:647] [E: packages/tui/src/utils.ts:648] [E: packages/tui/src/utils.ts:654] [E: packages/tui/src/utils.ts:655]。
4. 普通 token path 会用 `visibleWidth(token)` 判断加入当前行是否超宽;超宽时先 `trimEnd`,再追加 `tracker.getLineEndReset()`,然后把非空白 token 放到新行并 prepend active codes [E: packages/tui/src/utils.ts:737] [E: packages/tui/src/utils.ts:764] [E: packages/tui/src/utils.ts:766] [E: packages/tui/src/utils.ts:768] [E: packages/tui/src/utils.ts:769] [E: packages/tui/src/utils.ts:773] [E: packages/tui/src/utils.ts:774] [E: packages/tui/src/utils.ts:776] [E: packages/tui/src/utils.ts:779]。
5. 单个非 whitespace token 若自身宽度超过 `width`,`breakLongWord` 会把 token 拆成 ANSI segment 与 grapheme segment,在 grapheme 边界处换行,并在换行后用 `tracker.getActiveCodes()` 继续当前 style/hyperlink [E: packages/tui/src/utils.ts:741] [E: packages/tui/src/utils.ts:754] [E: packages/tui/src/utils.ts:816] [E: packages/tui/src/utils.ts:827] [E: packages/tui/src/utils.ts:829] [E: packages/tui/src/utils.ts:841] [E: packages/tui/src/utils.ts:842] [E: packages/tui/src/utils.ts:862] [E: packages/tui/src/utils.ts:868] [E: packages/tui/src/utils.ts:869]。
6. 每个 token 处理后用 `updateTrackerFromText(token, tracker)` 更新 ANSI state;最终输出会对每行 `trimEnd`,因为 trailing whitespace 可能让可见宽度超过目标 width [E: packages/tui/src/utils.ts:788] [E: packages/tui/src/utils.ts:591] [E: packages/tui/src/utils.ts:594] [E: packages/tui/src/utils.ts:596] [E: packages/tui/src/utils.ts:797]。

## 设计动机与权衡

`visibleWidth` 对纯 printable ASCII 使用 `str.length` fast path,但对非 printable-ASCII path 使用 512-entry cache;这是典型 hot-path optimization,因为 TUI render 会反复测量同一批 line 或 segment [E: packages/tui/src/utils.ts:222] [E: packages/tui/src/utils.ts:223] [E: packages/tui/src/utils.ts:45] [E: packages/tui/src/utils.ts:262] [I]。

`normalizeTerminalOutput` 只处理 Thai/Lao AM vowel 的 terminal output form,不改变 editor logical content;代码将 `ำ`/`ຳ` 替换成 compatibility decomposition,并且只在命中 regex 时替换 [E: packages/tui/src/utils.ts:279] [E: packages/tui/src/utils.ts:282] [E: packages/tui/src/utils.ts:283] [E: packages/tui/src/utils.ts:284]。这说明该 normalization 是 terminal renderer workaround,不是 `visibleWidth` 的输入规范化要求 [I]。

`wrapTextWithAnsi` 的代码路径只返回 `wrapSingleLine` 产生的 line array,而 background padding 位于单独的 `applyBackgroundToLine` utility [E: packages/tui/src/utils.ts:708] [E: packages/tui/src/utils.ts:716] [E: packages/tui/src/utils.ts:893] [E: packages/tui/src/utils.ts:895] [E: packages/tui/src/utils.ts:897] [E: packages/tui/src/utils.ts:900] [I]。因此 wrapped line 的长度约束是 `visibleWidth(line) <= width`,而不是每行 string length 或 padded width 等于 `width` [I]。

## Gotcha

- `extractAnsiCode` 不是通用 terminal parser;CSI 终止符只覆盖 `m/G/K/H/J`,OSC/APC 只覆盖 BEL/ST 终止的序列 [E: packages/tui/src/utils.ts:296] [E: packages/tui/src/utils.ts:299] [E: packages/tui/src/utils.ts:305] [E: packages/tui/src/utils.ts:308] [E: packages/tui/src/utils.ts:317] [E: packages/tui/src/utils.ts:320]。新 escape type 若没有被识别,会像普通字符一样参与后续 string traversal [I]。
- `truncateToWidth` 默认 ellipsis 是 `"..."`,但 caller 可以传空字符串;即使 ellipsis 为空,`finalizeTruncatedResult` 仍会在 kept prefix 后追加 SGR reset [E: packages/tui/src/utils.ts:918] [E: packages/tui/src/utils.ts:153] [E: packages/tui/src/utils.ts:156]。
- tab 在宽度模型里固定为 3 columns,不是 terminal tab stop 的动态宽度 [E: packages/tui/src/utils.ts:168] [E: packages/tui/src/utils.ts:169] [E: packages/tui/src/utils.ts:234] [E: packages/tui/src/utils.ts:235]。
- `wrapTextWithAnsi` 对 whitespace token 的处理会避免新行以 whitespace 开始;换行后如果 token 是 whitespace,新行只保留 active ANSI codes 且 visible width 归零 [E: packages/tui/src/utils.ts:774] [E: packages/tui/src/utils.ts:776] [E: packages/tui/src/utils.ts:777]。
- OSC 8 hyperlink reset 与 reopen 会保留原始 terminator;`formatOsc8Hyperlink` 和 `formatOsc8Close` 都使用 tracker 存储的 `terminator`,不是固定改写成 ST [E: packages/tui/src/utils.ts:343] [E: packages/tui/src/utils.ts:355] [E: packages/tui/src/utils.ts:358] [E: packages/tui/src/utils.ts:359] [E: packages/tui/src/utils.ts:362] [E: packages/tui/src/utils.ts:363]。

## 跨包边界

`utils.ts` 在本节点内只证明 `visibleWidth` 与 `truncateToWidth` 作为可导出文本工具存在 [E: packages/tui/src/utils.ts:216] [E: packages/tui/src/utils.ts:915]。`subsys.tui.diff-engine` 如何消费这些工具需要在 diff-engine source/node 内核证;本节点不把跨包调用链作为已由 `utils.ts` 直接证明的事实 [I]。

## Sources

- packages/tui/src/utils.ts

## 相关

- [subsys.tui.diff-engine](diff-engine.md) - TUI diff/runtime 的行合成与宽度防线,消费本节点的 `visibleWidth`、`sliceByColumn`、`extractSegments` 等 utility。
