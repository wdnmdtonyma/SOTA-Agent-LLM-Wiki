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
updated: 305c014dcc
---

> 文本宽度/截断/换行工具是 `pi-tui` 的 terminal text measurement layer:它把 Unicode grapheme、East Asian Width、emoji、tab、ANSI/OSC escape sequence 统一折算成 terminal columns,并提供 ANSI-safe truncation 与 word wrapping。

## 能回答的问题

- `visibleWidth(str)` 为什么不能直接用 `str.length` 替代?
- `truncateToWidth(text, maxWidth, ellipsis, pad)` 如何避免 ANSI style 污染 ellipsis 或后续 terminal 输出?
- `wrapTextWithAnsi(text, width)` 如何在换行后延续 SGR style 与 OSC 8 hyperlink?
- CJK、emoji、regional indicator、Thai/Lao AM vowel、tab 在 TUI 宽度计算里如何处理?
- 这些 utilities 与 `subsys.tui.diff-engine` 的 line width hard guard 是什么关系?

## 职责边界

本节点覆盖 `packages/tui/src/utils.ts` 中三个对外符号:`visibleWidth`、`truncateToWidth`、`wrapTextWithAnsi`。`visibleWidth` 是 terminal column measurement 的基础函数;`truncateToWidth` 接收 `maxWidth`、`ellipsis`、`pad` 并在截断路径走 `finalizeTruncatedResult`;`wrapTextWithAnsi` 是导出函数,按 input line 调用 `wrapSingleLine` 后返回数组 [E: packages/tui/src/utils.ts:239] [E: packages/tui/src/utils.ts:1030] [E: packages/tui/src/utils.ts:1032] [E: packages/tui/src/utils.ts:1033] [E: packages/tui/src/utils.ts:1034] [E: packages/tui/src/utils.ts:1165] [E: packages/tui/src/utils.ts:809] [E: packages/tui/src/utils.ts:823] [E: packages/tui/src/utils.ts:831]。

这个文件还包含支撑符号,包括 shared `Intl.Segmenter`、`graphemeWidth`、ANSI/OSC/APC parser、`AnsiCodeTracker`、`normalizeTerminalOutput`、`sliceByColumn`、`sliceWithWidth` 和 `extractSegments` [E: packages/tui/src/utils.ts:4] [E: packages/tui/src/utils.ts:5] [E: packages/tui/src/utils.ts:173] [E: packages/tui/src/utils.ts:405] [E: packages/tui/src/utils.ts:484] [E: packages/tui/src/utils.ts:378] [E: packages/tui/src/utils.ts:1172] [E: packages/tui/src/utils.ts:1177] [E: packages/tui/src/utils.ts:1232]。本节点只详写 `visibleWidth`/`truncateToWidth`/`wrapTextWithAnsi`; overlay slicing 的合成语义由 [subsys.tui.diff-engine](diff-engine.md) 承接。

## 关键文件

`packages/tui/src/utils.ts` 是本节点的唯一 source of truth。它在顶部创建两个共享 segmenter:`graphemeSegmenter` 用于 grapheme cluster traversal,`wordSegmenter` 用于 word granularity traversal [E: packages/tui/src/utils.ts:4] [E: packages/tui/src/utils.ts:5]。宽度计算还依赖 `get-east-asian-width` 的 `eastAsianWidth(cp)` 结果,并在 `graphemeWidth` 内作为 base visible codepoint 的基础宽度 [E: packages/tui/src/utils.ts:1] [E: packages/tui/src/utils.ts:207]。

## 数据模型

### Grapheme width model

`graphemeWidth(segment)` 是 `visibleWidth` 和 wrapping/truncation 的底层 cell-width oracle。它把 tab 固定计为 3 columns [E: packages/tui/src/utils.ts:174] [E: packages/tui/src/utils.ts:175],把 Default Ignorable、Control、Mark、Surrogate 组成的 cluster 计为 0 [E: packages/tui/src/utils.ts:40] [E: packages/tui/src/utils.ts:184] [E: packages/tui/src/utils.ts:185],把通过 broad prefilter 且匹配 `\p{RGI_Emoji}` 的 emoji 计为 2 [E: packages/tui/src/utils.ts:27] [E: packages/tui/src/utils.ts:48] [E: packages/tui/src/utils.ts:189] [E: packages/tui/src/utils.ts:190]。

Regional indicator singleton 也被保守计为 2 columns:代码在 U+1F1E6..U+1F1FF range 内直接返回 2;源码注释给出的 terminal streaming 动机只作为解释性背景 [E: packages/tui/src/utils.ts:203] [E: packages/tui/src/utils.ts:204] [I]。对于普通可见 codepoint,`graphemeWidth` 先移除 leading non-printing codepoints,取 base codepoint 调用 `eastAsianWidth`,再额外累加 trailing Halfwidth/Fullwidth Forms 和 Thai/Lao AM vowel 组合中的特定 codepoint [E: packages/tui/src/utils.ts:194] [E: packages/tui/src/utils.ts:195] [E: packages/tui/src/utils.ts:207] [E: packages/tui/src/utils.ts:226] [E: packages/tui/src/utils.ts:227]。

### ANSI sequence model

`extractAnsiCode(str, pos)` 只在当前位置是 ESC 时尝试识别 escape sequence [E: packages/tui/src/utils.ts:405] [E: packages/tui/src/utils.ts:406]。它支持 CSI `ESC [` 序列,终止符限定为 `m/G/K/H/J`;支持 OSC `ESC ]` 序列,终止于 BEL 或 ST;支持 APC `ESC _` 序列,同样终止于 BEL 或 ST [E: packages/tui/src/utils.ts:411] [E: packages/tui/src/utils.ts:413] [E: packages/tui/src/utils.ts:414] [E: packages/tui/src/utils.ts:420] [E: packages/tui/src/utils.ts:423] [E: packages/tui/src/utils.ts:424] [E: packages/tui/src/utils.ts:432] [E: packages/tui/src/utils.ts:435] [E: packages/tui/src/utils.ts:436]。这些 escape sequences 不贡献 visible width,但会被 truncate/wrap 逻辑保留或重新发射 [E: packages/tui/src/utils.ts:267] [E: packages/tui/src/utils.ts:269] [E: packages/tui/src/utils.ts:1098] [E: packages/tui/src/utils.ts:894]。

`AnsiCodeTracker` 逐项记录 SGR attributes、foreground/background color 与 active OSC 8 hyperlink [E: packages/tui/src/utils.ts:486] [E: packages/tui/src/utils.ts:494] [E: packages/tui/src/utils.ts:495] [E: packages/tui/src/utils.ts:496]。`process()` 会把 OSC 8 hyperlink open/close 解析成 `activeHyperlink`,并解析 SGR reset、standard colors、256-color、RGB color 和 attribute on/off codes [E: packages/tui/src/utils.ts:498] [E: packages/tui/src/utils.ts:503] [E: packages/tui/src/utils.ts:505] [E: packages/tui/src/utils.ts:518] [E: packages/tui/src/utils.ts:520] [E: packages/tui/src/utils.ts:531] [E: packages/tui/src/utils.ts:546] [E: packages/tui/src/utils.ts:562] [E: packages/tui/src/utils.ts:586] [E: packages/tui/src/utils.ts:589] [E: packages/tui/src/utils.ts:619] [E: packages/tui/src/utils.ts:623]。`getActiveCodes()` 将当前 SGR state 和 active hyperlink 序列化回 line prefix;`getLineEndReset()` 只关闭 underline 和 active OSC 8 hyperlink,不做 full reset,从而让 background color 可以跨 wrapped line 延续到 caller 的 padding 阶段 [E: packages/tui/src/utils.ts:652] [E: packages/tui/src/utils.ts:665] [E: packages/tui/src/utils.ts:667] [E: packages/tui/src/utils.ts:694] [E: packages/tui/src/utils.ts:696] [E: packages/tui/src/utils.ts:699] [E: packages/tui/src/utils.ts:700] [I]。

## 控制流

### `visibleWidth(str)`

1. 空字符串直接返回 0;纯 printable ASCII 走 fast path,返回 `str.length` [E: packages/tui/src/utils.ts:240] [E: packages/tui/src/utils.ts:241] [E: packages/tui/src/utils.ts:245] [E: packages/tui/src/utils.ts:246]。
2. 非 printable-ASCII path 先查 `widthCache`;cache size 上限是 512,写入前如果满了就删除第一个 key [E: packages/tui/src/utils.ts:51] [E: packages/tui/src/utils.ts:52] [E: packages/tui/src/utils.ts:250] [E: packages/tui/src/utils.ts:252] [E: packages/tui/src/utils.ts:285] [E: packages/tui/src/utils.ts:286] [E: packages/tui/src/utils.ts:288] [E: packages/tui/src/utils.ts:291]。
3. 输入中的 tab 在测量前替换成三个空格;ANSI/OSC/APC escape sequences 通过 `extractAnsiCode` 单 pass 跳过 [E: packages/tui/src/utils.ts:256] [E: packages/tui/src/utils.ts:257] [E: packages/tui/src/utils.ts:258] [E: packages/tui/src/utils.ts:260] [E: packages/tui/src/utils.ts:267] [E: packages/tui/src/utils.ts:269]。
4. 清洗后的字符串按 grapheme cluster 遍历,每个 segment 交给 `graphemeWidth`,累加出 terminal visible width [E: packages/tui/src/utils.ts:280] [E: packages/tui/src/utils.ts:281]。

### `truncateToWidth(text, maxWidth, ellipsis, pad)`

1. `maxWidth <= 0` 返回空串;空输入在 `pad=true` 时返回 `maxWidth` 个空格,否则返回空串 [E: packages/tui/src/utils.ts:1036] [E: packages/tui/src/utils.ts:1037] [E: packages/tui/src/utils.ts:1040] [E: packages/tui/src/utils.ts:1041]。
2. 先测量 ellipsis。如果 ellipsis 本身宽度大于等于 `maxWidth`,函数优先保留已经 fit 的原文;否则把 ellipsis 自己裁到 `maxWidth`,再用 `finalizeTruncatedResult` 输出 [E: packages/tui/src/utils.ts:1044] [E: packages/tui/src/utils.ts:1045] [E: packages/tui/src/utils.ts:1046] [E: packages/tui/src/utils.ts:1048] [E: packages/tui/src/utils.ts:1051] [E: packages/tui/src/utils.ts:1055]。
3. 纯 printable ASCII 走 fast path:若已经 fit,可选 padding;若超宽,保留 `maxWidth - ellipsisWidth` 个字符后接 ellipsis [E: packages/tui/src/utils.ts:1058] [E: packages/tui/src/utils.ts:1060] [E: packages/tui/src/utils.ts:1062] [E: packages/tui/src/utils.ts:1063]。
4. Unicode/ANSI 路径维护 `result`、`pendingAnsi`、`visibleSoFar`、`keptWidth`、`keepContiguousPrefix`、`overflowed` 与 `exhaustedInput` [E: packages/tui/src/utils.ts:1066] [E: packages/tui/src/utils.ts:1068] [E: packages/tui/src/utils.ts:1069] [E: packages/tui/src/utils.ts:1070] [E: packages/tui/src/utils.ts:1071] [E: packages/tui/src/utils.ts:1072] [E: packages/tui/src/utils.ts:1073]。`keepContiguousPrefix=false` 后不会跳过一个太宽 grapheme 又继续保留后面的内容,因此 truncate result 是原文的 contiguous prefix 加 ellipsis [E: packages/tui/src/utils.ts:1080] [E: packages/tui/src/utils.ts:1083] [E: packages/tui/src/utils.ts:1084] [E: packages/tui/src/utils.ts:1135] [E: packages/tui/src/utils.ts:1142] [E: packages/tui/src/utils.ts:1143]。
5. ANSI path 把 escape sequence 暂存到 `pendingAnsi`,只有下一个 visible segment 确认会被保留时才写入 result;如果对应 visible segment 已经不再保留,`pendingAnsi` 被清空 [E: packages/tui/src/utils.ts:1096] [E: packages/tui/src/utils.ts:1098] [E: packages/tui/src/utils.ts:1105] [E: packages/tui/src/utils.ts:1107] [E: packages/tui/src/utils.ts:1112] [E: packages/tui/src/utils.ts:1113] [E: packages/tui/src/utils.ts:1136] [E: packages/tui/src/utils.ts:1138] [E: packages/tui/src/utils.ts:1143] [E: packages/tui/src/utils.ts:1144]。
6. `finalizeTruncatedResult` 总是在 kept prefix 后追加 SGR reset;ellipsis 非空时再追加 ellipsis 和另一个 reset,ellipsis 为空时只保留 prefix 后的 reset;`pad=true` 时再按 `maxWidth - visibleWidth` 追加 spaces [E: packages/tui/src/utils.ts:155] [E: packages/tui/src/utils.ts:159] [E: packages/tui/src/utils.ts:160] [E: packages/tui/src/utils.ts:162] [E: packages/tui/src/utils.ts:165]。这个 reset bracketing 是防止被截断文本的 active style 泄漏到 ellipsis 或后续 terminal 内容的防线 [I]。

### `wrapTextWithAnsi(text, width)`

1. 空输入返回 `[""]` [E: packages/tui/src/utils.ts:810] [E: packages/tui/src/utils.ts:811]。
2. 函数先按 literal newline 切分 input line,并用外层 `AnsiCodeTracker` 在这些输入行之间传递 active ANSI state;除第一行外,每个后续 input line 会先 prepend `tracker.getActiveCodes()` 再进入 `wrapSingleLine` [E: packages/tui/src/utils.ts:795] [E: packages/tui/src/utils.ts:818] [E: packages/tui/src/utils.ts:820] [E: packages/tui/src/utils.ts:822] [E: packages/tui/src/utils.ts:823] [E: packages/tui/src/utils.ts:828]。
3. `wrapSingleLine` 对已经 fit 的单行直接返回;否则调用 `splitIntoTokensWithAnsi` 生成 tokens [E: packages/tui/src/utils.ts:839] [E: packages/tui/src/utils.ts:840] [E: packages/tui/src/utils.ts:841] [E: packages/tui/src/utils.ts:846]。tokenizer 把 pending ANSI 附着到下一个 visible character,将 CJK grapheme 单独作为可断点 token,并把普通空格与 word 分成不同 token [E: packages/tui/src/utils.ts:739] [E: packages/tui/src/utils.ts:742] [E: packages/tui/src/utils.ts:752] [E: packages/tui/src/utils.ts:754] [E: packages/tui/src/utils.ts:756] [E: packages/tui/src/utils.ts:758] [E: packages/tui/src/utils.ts:762] [E: packages/tui/src/utils.ts:763] [E: packages/tui/src/utils.ts:769] [E: packages/tui/src/utils.ts:770]。
4. 普通 token path 会用 `visibleWidth(token)` 判断加入当前行是否超宽;超宽时先 `trimEnd`,再追加 `tracker.getLineEndReset()`,然后把非空白 token 放到新行并 prepend active codes [E: packages/tui/src/utils.ts:852] [E: packages/tui/src/utils.ts:879] [E: packages/tui/src/utils.ts:881] [E: packages/tui/src/utils.ts:883] [E: packages/tui/src/utils.ts:884] [E: packages/tui/src/utils.ts:888] [E: packages/tui/src/utils.ts:889] [E: packages/tui/src/utils.ts:891] [E: packages/tui/src/utils.ts:894]。
5. 单个非 whitespace token 若自身宽度超过 `width`,`breakLongWord` 会把 token 拆成 ANSI segment 与 grapheme segment,在 grapheme 边界处换行,并在换行后用 `tracker.getActiveCodes()` 继续当前 style/hyperlink [E: packages/tui/src/utils.ts:856] [E: packages/tui/src/utils.ts:869] [E: packages/tui/src/utils.ts:931] [E: packages/tui/src/utils.ts:942] [E: packages/tui/src/utils.ts:944] [E: packages/tui/src/utils.ts:956] [E: packages/tui/src/utils.ts:957] [E: packages/tui/src/utils.ts:977] [E: packages/tui/src/utils.ts:983] [E: packages/tui/src/utils.ts:984]。
6. 每个 token 处理后用 `updateTrackerFromText(token, tracker)` 更新 ANSI state;最终输出会对每行 `trimEnd`,因为 trailing whitespace 可能让可见宽度超过目标 width [E: packages/tui/src/utils.ts:903] [E: packages/tui/src/utils.ts:706] [E: packages/tui/src/utils.ts:709] [E: packages/tui/src/utils.ts:711] [E: packages/tui/src/utils.ts:912]。

## 设计动机与权衡

`visibleWidth` 对纯 printable ASCII 使用 `str.length` fast path,但对非 printable-ASCII path 使用 512-entry cache;这是典型 hot-path optimization,因为 TUI render 会反复测量同一批 line 或 segment [E: packages/tui/src/utils.ts:245] [E: packages/tui/src/utils.ts:246] [E: packages/tui/src/utils.ts:51] [E: packages/tui/src/utils.ts:285] [I]。

`normalizeTerminalOutput` 只处理 Thai/Lao AM vowel 的 terminal output form,不改变 editor logical content;代码将 `ำ`/`ຳ` 替换成 compatibility decomposition,并且只在命中 regex 时替换 [E: packages/tui/src/utils.ts:375] [E: packages/tui/src/utils.ts:378] [E: packages/tui/src/utils.ts:378] [E: packages/tui/src/utils.ts:382]。这说明该 normalization 是 terminal renderer workaround,不是 `visibleWidth` 的输入规范化要求 [I]。

`wrapTextWithAnsi` 的代码路径只返回 `wrapSingleLine` 产生的 line array,而 background padding 位于单独的 `applyBackgroundToLine` utility [E: packages/tui/src/utils.ts:823] [E: packages/tui/src/utils.ts:831] [E: packages/tui/src/utils.ts:1008] [E: packages/tui/src/utils.ts:1010] [E: packages/tui/src/utils.ts:1012] [E: packages/tui/src/utils.ts:1015] [I]。因此 wrapped line 的长度约束是 `visibleWidth(line) <= width`,而不是每行 string length 或 padded width 等于 `width` [I]。

## Gotcha

- `extractAnsiCode` 不是通用 terminal parser;CSI 终止符只覆盖 `m/G/K/H/J`,OSC/APC 只覆盖 BEL/ST 终止的序列 [E: packages/tui/src/utils.ts:411] [E: packages/tui/src/utils.ts:414] [E: packages/tui/src/utils.ts:420] [E: packages/tui/src/utils.ts:423] [E: packages/tui/src/utils.ts:432] [E: packages/tui/src/utils.ts:435]。新 escape type 若没有被识别,会像普通字符一样参与后续 string traversal [I]。
- `truncateToWidth` 默认 ellipsis 是 `"..."`,但 caller 可以传空字符串;即使 ellipsis 为空,`finalizeTruncatedResult` 仍会在 kept prefix 后追加 SGR reset [E: packages/tui/src/utils.ts:1033] [E: packages/tui/src/utils.ts:159] [E: packages/tui/src/utils.ts:162]。
- tab 在宽度模型里固定为 3 columns,不是 terminal tab stop 的动态宽度 [E: packages/tui/src/utils.ts:174] [E: packages/tui/src/utils.ts:175] [E: packages/tui/src/utils.ts:257] [E: packages/tui/src/utils.ts:258]。
- `wrapTextWithAnsi` 对 whitespace token 的处理会避免新行以 whitespace 开始;换行后如果 token 是 whitespace,新行只保留 active ANSI codes 且 visible width 归零 [E: packages/tui/src/utils.ts:889] [E: packages/tui/src/utils.ts:891] [E: packages/tui/src/utils.ts:892]。
- OSC 8 hyperlink reset 与 reopen 会保留原始 terminator;`formatOsc8Hyperlink` 和 `formatOsc8Close` 都使用 tracker 存储的 `terminator`,不是固定改写成 ST [E: packages/tui/src/utils.ts:458] [E: packages/tui/src/utils.ts:470] [E: packages/tui/src/utils.ts:473] [E: packages/tui/src/utils.ts:474] [E: packages/tui/src/utils.ts:477] [E: packages/tui/src/utils.ts:478]。

## 跨包边界

`utils.ts` 在本节点内只证明 `visibleWidth` 与 `truncateToWidth` 作为可导出文本工具存在 [E: packages/tui/src/utils.ts:239] [E: packages/tui/src/utils.ts:1030]。`subsys.tui.diff-engine` 如何消费这些工具需要在 diff-engine source/node 内核证;本节点不把跨包调用链作为已由 `utils.ts` 直接证明的事实 [I]。

## Sources

- packages/tui/src/utils.ts

## 相关

- [subsys.tui.diff-engine](diff-engine.md) - TUI diff/runtime 的行合成与宽度防线,消费本节点的 `visibleWidth`、`sliceByColumn`、`extractSegments` 等 utility。
