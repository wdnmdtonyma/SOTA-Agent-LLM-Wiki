---
id: subsys.tui.latex
title: TUI LaTeX Unicode 渲染
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/latex.ts
  - packages/tui/test/latex.test.ts
  - packages/tui/src/components/markdown.ts
symbols:
  - renderLatex
  - RenderLatexOptions
  - LatexParser
related:
  - subsys.tui.text-utilities
  - ref.tui.component-types
evidence: explicit
status: verified
updated: 086c32e745
---

> `renderLatex()` 把一段基础 LaTeX math 编成终端可用的 Unicode 文本；不支持或畸形的输入返回 `undefined`，Markdown 渲染器再回退到原文。

## 能回答的问题

- `renderLatex()` 支持哪些命令族、环境和运算符？
- display mode 怎样把分数和 operator limits 竖排，嵌套分数为什么仍走线性 `/`？
- 跨行 `{...}` argument 与 `\\` + 换行的 control space 如何被吃掉？
- 未知命令或不成对的 group 失败时，Markdown 会显示什么？
- `$` / `$$` / `\(` / `\[` 在 markdown tokenizer 里怎样切 inline / block math？

## 职责边界

`packages/tui/src/latex.ts` 只负责把 math source 编成纯文本：符号替换、上下标、分数/根号/矩阵排版、display stacking。[E: packages/tui/src/latex.ts:1353] [E: packages/tui/src/latex.ts:1362] `packages/tui/src/components/markdown.ts` 负责识别 `$…$`、`$$…$$`、`\(`…`\)`、`\[`…`\]`，再调用 `renderLatex()`；本节点不覆盖其它 markdown 元素。[E: packages/tui/src/components/markdown.ts:52] [E: packages/tui/src/components/markdown.ts:101] [E: packages/tui/src/components/markdown.ts:228]

`LatexParser` 是文件内 parser，不是 package export；对外 API 只有 `renderLatex` 与 `RenderLatexOptions`。[E: packages/tui/src/latex.ts:797] [E: packages/tui/src/latex.ts:1353] [E: packages/tui/src/latex.ts:1362]

## 关键文件

- `packages/tui/src/latex.ts`: 符号表、`LatexParser`、layout node、`renderLatex()`。
- `packages/tui/test/latex.test.ts`: 会话公式、矩阵/分数/运算符、control space、失败返回 `undefined`。
- `packages/tui/src/components/markdown.ts`: tokenizer 与 `renderLatex ?? raw` 回退。

## 数据模型

`RenderLatexOptions.display` 默认 `false`。`display: true` 时，顶层 `\frac`/`\dfrac` 和带 limits 的运算符改成多行 Unicode layout。[E: packages/tui/src/latex.ts:1353] [E: packages/tui/src/latex.ts:1355] [E: packages/tui/src/latex.ts:1364]

内部 `LayoutNode` 三种：`fraction`（分子/分母）、`operator`（符号 + 可选上下限）、`matrix`（已对齐的行）。[E: packages/tui/src/latex.ts:645] [E: packages/tui/src/latex.ts:651] [E: packages/tui/src/latex.ts:658] parser 在线性文本里插入 private-use marker，最后由 `renderLayout()` 把 marker 展开成多行。[E: packages/tui/src/latex.ts:672] [E: packages/tui/src/latex.ts:709]

Markdown 侧 `LatexToken` 有 `type: "latex" | "latexBlock"`、`text`、可选 `pending`。[E: packages/tui/src/components/markdown.ts:26] [E: packages/tui/src/components/markdown.ts:27] [E: packages/tui/src/components/markdown.ts:29] `MarkdownOptions.renderLatex` 默认视为开启，显式 `false` 时只输出原文。[E: packages/tui/src/components/markdown.ts:228] [E: packages/tui/src/components/markdown.ts:508]

## 支持的命令

parser 认命令名或单字符 escape。未命中任何分支就把 `supported` 置假。[E: packages/tui/src/latex.ts:914] [E: packages/tui/src/latex.ts:1084] [E: packages/tui/src/latex.ts:1085]

| 族 | 代表 | 行为 | 源 |
|---|---|---|---|
| 符号表 `SYMBOLS` | 希腊字母、`pm`/`times`/`cdot`、集合/关系、箭头、`sum`/`int`/`infty`、括号命令 | 查表换成 Unicode；`cdot`/`times` 与 `RELATION_COMMANDS` 两侧加空格 | [E: packages/tui/src/latex.ts:3] [E: packages/tui/src/latex.ts:984] [E: packages/tui/src/latex.ts:989] |
| 具名算子 | `sin`/`cos`/`log`/`lim`/`det` 等 `NAMED_OPERATORS` | 输出算子名，并用 private-use marker 在字母/数字旁补空格 | [E: packages/tui/src/latex.ts:224] [E: packages/tui/src/latex.ts:991] [E: packages/tui/src/latex.ts:632] |
| 极限算子 | `lim`/`max`/`min`/`sup`/`inf`/`argmax` 等 | inline 用 `[lower]`；display 可竖排 | [E: packages/tui/src/latex.ts:258] [E: packages/tui/src/latex.ts:980] [E: packages/tui/src/latex.ts:1136] |
| display 极限符号 | `sum`/`prod`/`int`/`bigcup` 等 | display 且未 `\nolimits` 时竖排上下限 | [E: packages/tui/src/latex.ts:273] [E: packages/tui/src/latex.ts:986] |
| `\not` | `\not\subseteq`、`\not\in` | 查 `NEGATED_SYMBOLS`；否则给首字符叠 U+0338 | [E: packages/tui/src/latex.ts:967] [E: packages/tui/src/latex.ts:375] [E: packages/tui/src/latex.ts:978] |
| `\mathbb` | `\mathbb{C}` | `C/H/N/P/Q/R/Z` 换成黑板体 | [E: packages/tui/src/latex.ts:1043] [E: packages/tui/src/latex.ts:408] |
| 分数 | `\frac`/`\dfrac`/`\tfrac` | 线性 `num/den`，必要时加括号；display 且非 `\tfrac` 时画横线 | [E: packages/tui/src/latex.ts:1003] [E: packages/tui/src/latex.ts:614] [E: packages/tui/src/latex.ts:1004] |
| 根号 | `\sqrt`、`\sqrt[n]` | 2/3/4 用 `√/∛/∜`，其它 `ⁿ√` | [E: packages/tui/src/latex.ts:1018] [E: packages/tui/src/latex.ts:622] |
| 二项式 | `\binom`/`\dbinom`/`\tbinom` | `(n choose k)` | [E: packages/tui/src/latex.ts:1035] |
| 盒子 | `\boxed`/`\fbox` | `[content]` | [E: packages/tui/src/latex.ts:1032] |
| 重音 | `\hat`/`\vec`/`\overline` 等 | 单字符叠 combining mark，多字符保留 `cmd(value)` | [E: packages/tui/src/latex.ts:566] [E: packages/tui/src/latex.ts:1038] [E: packages/tui/src/latex.ts:1041] |
| wrapper | `\text`/`\mathrm`/`\mathbf`/`\mbox` 等 `PLAIN_WRAPPERS` | 丢掉字体命令，留下内容 | [E: packages/tui/src/latex.ts:534] [E: packages/tui/src/latex.ts:1072] |
| 间距 | `\,`/`\;`/`\quad`/`\ ` 与 `\!` | 正间距变空格；负间距裁掉前导空白 | [E: packages/tui/src/latex.ts:496] [E: packages/tui/src/latex.ts:510] [E: packages/tui/src/latex.ts:944] [E: packages/tui/src/latex.ts:947] |
| 忽略/尺寸 | `\displaystyle`/`\limits`/`\big`/`\left`/`\right` | 不输出；`\left.` 会吃掉 invisible delimiter | [E: packages/tui/src/latex.ts:512] [E: packages/tui/src/latex.ts:520] [E: packages/tui/src/latex.ts:994] [E: packages/tui/src/latex.ts:997] |
| 算子构造 | `\operatorname*`、`\bmod`/`\pmod`、`\overset`/`\underset` | 具名算子、mod 文本、上下叠标 | [E: packages/tui/src/latex.ts:1047] [E: packages/tui/src/latex.ts:1055] [E: packages/tui/src/latex.ts:1058] [E: packages/tui/src/latex.ts:1062] [E: packages/tui/src/latex.ts:1067] |
| 字面 escape | `\{` `\}` `\$` `\%` `\#` `\_` `\&` `\|` | 对应字符；`\|` 是 `‖` | [E: packages/tui/src/latex.ts:954] [E: packages/tui/src/latex.ts:964] |

上下标走 `^`/`_`：能映射的字符用 Unicode super/subscript，否则 `_x` / `^(…)`。[E: packages/tui/src/latex.ts:852] [E: packages/tui/src/latex.ts:599] [E: packages/tui/src/latex.ts:418] [E: packages/tui/src/latex.ts:461]

## 矩阵、分数、运算符

矩阵环境：`array`/`matrix`/`smallmatrix`/`pmatrix`/`bmatrix`/`Bmatrix`/`vmatrix`/`Vmatrix`。列用 `&` 分隔，行用 `\\`（可带 `[4pt]` 可选间距）。[E: packages/tui/src/latex.ts:1287] [E: packages/tui/src/latex.ts:1221] [E: packages/tui/src/latex.ts:1298] 单元格按列宽 pad，中间插 `│`；`pmatrix` 等再包 `⎛⎞⎜⎟⎝⎠` 一类括号。[E: packages/tui/src/latex.ts:1309] [E: packages/tui/src/latex.ts:1318] [E: packages/tui/test/latex.test.ts:359] 多于一行的矩阵变成 layout node，以便和旁边的分数/求和对齐。[E: packages/tui/src/latex.ts:1336] [E: packages/tui/src/latex.ts:1339]

对齐环境：`aligned`/`align`/`align*`/`alignedat`/`alignat`/`alignat*`/`gather`/`gathered`/`multline`/`multline*`/`split` 把每行编成一行文本。[E: packages/tui/src/latex.ts:1243] `cases`/`cases*` 用 `⎧⎨⎩`，条件前自动加 `if`（已有 if/when/for/otherwise 则不再加）。[E: packages/tui/src/latex.ts:1272] [E: packages/tui/src/latex.ts:1280] `equation`/`equation*`/`displaymath` 只渲染 body。[E: packages/tui/src/latex.ts:1239]

display 分数画 `─` 横线并把分子分母居中；嵌套分数把 `stackFractions` 关掉，内层保持 `a/b`。[E: packages/tui/src/latex.ts:734] [E: packages/tui/src/latex.ts:1146] [E: packages/tui/src/latex.ts:1004] 测试锁定：`\frac{1}{2}` 在 display 是两行，`\tfrac{1}{2}` 与 `e^{\frac{1}{2}}` 仍是线性。[E: packages/tui/test/latex.test.ts:450] [E: packages/tui/test/latex.test.ts:481] [E: packages/tui/test/latex.test.ts:483]

display 极限：`\sum_{i=0}^n` 变成三行 `n / ∑ / i=0`；`\int\nolimits` 仍用下标，`\int\limits` 强制竖排。[E: packages/tui/src/latex.ts:1099] [E: packages/tui/test/latex.test.ts:430] [E: packages/tui/test/latex.test.ts:439]

## 跨行 argument 与 control space

必选参数在读 `{` 或下一个 command/字符之前，会跳过任意空白（含换行）。因此 `\frac{1}\n{2}` 合法。[E: packages/tui/src/latex.ts:1154] [E: packages/tui/src/latex.ts:1162] [E: packages/tui/test/latex.test.ts:458]

`\` 后面紧跟 `\n` 或 `\r\n` 被当成 control space，输出一个空格，而不是未知命令。`\\` 本身才是换行。[E: packages/tui/src/latex.ts:923] [E: packages/tui/src/latex.ts:928] [E: packages/tui/src/latex.ts:941] 测试：`boxed` 列表里行末 `\` 会把下一行接上；`a\\\r\nb` 变成 `a b`。[E: packages/tui/test/latex.test.ts:418] [E: packages/tui/test/latex.test.ts:427]

普通空白序列压成单个空格；`~` 也是空格；序列里的 `&` 被丢掉（对齐环境另做单元格切分）。[E: packages/tui/src/latex.ts:907] [E: packages/tui/src/latex.ts:880] [E: packages/tui/src/latex.ts:875]

## 失败回退到原文

`LatexParser.render()` 在 `supported === false` 或输入没吃完时返回 `undefined`。[E: packages/tui/src/latex.ts:811] [E: packages/tui/src/latex.ts:813] 触发包括：未知命令、多余 `}`、未闭合 group、`\begin` 没有匹配 `\end`、悬挂的 `\`。[E: packages/tui/src/latex.ts:828] [E: packages/tui/src/latex.ts:901] [E: packages/tui/src/latex.ts:1084] [E: packages/tui/src/latex.ts:1232] [E: packages/tui/src/latex.ts:916] 测试：`\unknown{y}`、`\frac{1}{x`、`x}`、未闭合 `matrix`、末尾 `x\\` 都返回 `undefined`。[E: packages/tui/test/latex.test.ts:486] [E: packages/tui/test/latex.test.ts:490]

Markdown 只在 token 非 `pending` 且 `renderLatex !== false` 时调用 `renderLatex()`。失败用 `??` 回到原文：inline 用 `latexToken.raw`（含 `$`/`\(` 定界符），block 用 `raw.trim()`。[E: packages/tui/src/components/markdown.ts:508] [E: packages/tui/src/components/markdown.ts:509] [E: packages/tui/src/components/markdown.ts:648] [E: packages/tui/src/components/markdown.ts:649] streaming 未闭合的 math 标 `pending: true`，直接输出 raw，避免半截公式闪烁。[E: packages/tui/src/components/markdown.ts:84] [E: packages/tui/src/components/markdown.ts:114] [E: packages/tui/src/components/markdown.ts:508]

inline `$` 会拒绝尾随空白、后接数字、全大写标识符后接标识符、以及内部 backtick，以免把货币或代码切成 math。[E: packages/tui/src/components/markdown.ts:72]

## 控制流

1. `renderLatex@packages/tui/src/latex.ts:1362` 建空 `layoutNodes`，用 `options.display === true` 构造 `LatexParser`。[E: packages/tui/src/latex.ts:1363] [E: packages/tui/src/latex.ts:1364]
2. `parseSequence@packages/tui/src/latex.ts:819` 从左到右吃 `{…}`、`\command`、`^`/`_`、空白、关系符。
3. 分数/极限/多行矩阵往 `layoutNodes` 推 node，并在输出里写 `\u{f0000}index\u{f0001}`。[E: packages/tui/src/latex.ts:1008] [E: packages/tui/src/latex.ts:1132] [E: packages/tui/src/latex.ts:1339]
4. 解析失败返回 `undefined`；无 layout node 时只做空白归一化；否则 `renderLayout()` 按 baseline 拼接多行。[E: packages/tui/src/latex.ts:1365] [E: packages/tui/src/latex.ts:1368] [E: packages/tui/src/latex.ts:1371]
5. Markdown `latex` / `latexBlock` case 调用 `renderLatex`，失败或 pending 则输出原文。[E: packages/tui/src/components/markdown.ts:505] [E: packages/tui/src/components/markdown.ts:645]

## 设计动机与权衡

- 这是终端近似排版，不是 TeX：字体命令被剥掉，复杂重音在多字符上保留命令名，未知宏直接失败而不是半渲染。[E: packages/tui/src/latex.ts:1072] [E: packages/tui/src/latex.ts:1041] [E: packages/tui/src/latex.ts:1084] [I]
- display stacking 只作用于顶层分数和极限，嵌套保持线性，避免终端里出现无法对齐的多层横线。[E: packages/tui/src/latex.ts:1004] [E: packages/tui/src/latex.ts:1146] [E: packages/tui/test/latex.test.ts:461]

## Gotchas

- `renderLatex()` 失败返回 `undefined`，不会抛错；调用方必须自己决定是否回退。[E: packages/tui/src/latex.ts:1362] [E: packages/tui/src/latex.ts:1365]
- 未知命令在 parser 里会先拼 `\\cmd`，但 `supported=false` 使整个表达式作废，这段拼串不会泄漏到成功输出。[E: packages/tui/src/latex.ts:1084] [E: packages/tui/src/latex.ts:813]
- inline latex tokenizer 拒绝内部换行；多行公式必须走 `$$` / `\[` block。[E: packages/tui/src/components/markdown.ts:93]
- `\left`/`\right`/`\big` 不改变括号尺寸，只是被吃掉。[E: packages/tui/src/latex.ts:994] [E: packages/tui/src/latex.ts:997]

## 跨包边界

本节点停在 `pi-tui`。coding-agent 的 assistant markdown 只是把文本交给 `Markdown`；主题色、是否关 `renderLatex` 属于调用方，不在 `latex.ts` 内。[I]

## Sources

- `packages/tui/src/latex.ts`
- `packages/tui/test/latex.test.ts`
- `packages/tui/src/components/markdown.ts`

## 相关

- `subsys.tui.text-utilities` — `visibleWidth()` 给矩阵列宽和 layout pad 用。
- `ref.tui.component-types` — `Markdown` 组件类型与 options 总表。
