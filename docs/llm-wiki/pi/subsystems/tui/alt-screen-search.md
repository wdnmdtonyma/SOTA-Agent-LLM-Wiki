---
id: subsys.tui.alt-screen-search
title: Fullscreen transcript 搜索
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/alt-screen-search.ts
  - packages/tui/src/tui-alt-screen.ts
  - packages/tui/src/keybindings.ts
  - packages/tui/test/tui-alt-screen.test.ts
symbols:
  - findAltScreenSearchMatches
  - getAltScreenSearchMatchKey
  - AltScreenSearchIndex
  - AltScreenSearchComponent
  - AltScreenSearchMatch
  - getWordSelection
  - TERMINAL_WORD_SELECTION_JOINERS
related:
  - subsys.tui.alternate-screen
  - subsys.tui.overlay
  - ref.tui.keybinding-actions
  - subsys.tui.keybinding-matching
evidence: explicit
status: verified
updated: bbb61e34aa
---

> Fullscreen transcript 搜索是 `TuiAltScreen` 在 primary `ScrollView` 已渲染文本上做的增量查找：`Ctrl+Shift+F` 打开 overlay，边输入边高亮，`Enter`/`Ctrl+G` 下一处、`Shift+Enter` 上一处；手动滚动不会把视口弹回当前 match。

## 能回答的问题

- `Ctrl+Shift+F` 打开的是什么 overlay，query 存在哪？
- 跨行、跨空白的 query 怎样匹配已渲染 transcript？
- 当前 match 与其它 match 默认怎么高亮？
- `Enter`/`Ctrl+G` 与 `Shift+Enter`/`Ctrl+Shift+G` 如何绕圈选中下一处/上一处？
- 用户滚轮或 PageUp 之后，为什么视口不会跳回当前 match？
- 大 transcript 上搜索如何避免每帧重建 corpus？
- 双击 word selection 为什么不再在 `/` 与 `-` 上切开 path / kebab-case(#8676)?

## 职责边界

`packages/tui/src/alt-screen-search.ts` 提供纯函数匹配、可缓存的 `AltScreenSearchIndex` 和搜索框组件：`findAltScreenSearchMatches(lines, query)`、`getAltScreenSearchMatchKey()`、`AltScreenSearchComponent`。[E: packages/tui/src/alt-screen-search.ts:156] [E: packages/tui/src/alt-screen-search.ts:186] [E: packages/tui/src/alt-screen-search.ts:191] [E: packages/tui/src/alt-screen-search.ts:197] 打开/关闭 overlay、消费 keybinding、刷新 match、滚动揭示、把高亮画进 viewport 都在 `TuiAltScreen`。[E: packages/tui/src/tui-alt-screen.ts:496] [E: packages/tui/src/tui-alt-screen.ts:571] [E: packages/tui/src/tui-alt-screen.ts:1484] `TUI_KEYBINDINGS` 只登记默认键，不实现搜索。[E: packages/tui/src/keybindings.ts:192]

双击 word selection 实现在 `TuiAltScreen.getWordSelection()`,不属于 `alt-screen-search.ts`;本节点仍记录 `#8676` / `#7746` 的 joiner 规则,因为选区与搜索同属 fullscreen renderer。[E: packages/tui/src/tui-alt-screen.ts:1156]

本节点不覆盖 editor 内查找，也不覆盖 coding-agent 主题怎样染 `searchMatchStyle`。[I]

## 关键文件

- `packages/tui/src/alt-screen-search.ts`: corpus 归一化、ASCII run 索引、`AltScreenSearchIndex` 缓存、搜索框 UI。
- `packages/tui/src/tui-alt-screen.ts`: `ActiveSearch`、`toggleSearch`/`refreshSearch`/`applySearchHighlights`、viewport key 路由。
- `packages/tui/src/keybindings.ts`: `tui.altScreen.search*` 默认键。
- `packages/tui/test/tui-alt-screen.test.ts`: 跨行匹配、增量高亮、滚动 retain、关闭后还焦点。

## 数据模型

`AltScreenSearchMatch.segments` 是一组 `{ row, startCol, endCol }`，同一 match 可跨行。[E: packages/tui/src/alt-screen-search.ts:28] [E: packages/tui/src/alt-screen-search.ts:22] `getAltScreenSearchMatchKey()` 用首尾 segment 拼 `row:start:row:end`，供后续 refresh 认回同一处。[E: packages/tui/src/alt-screen-search.ts:191]

`ActiveSearch` 持有 component、`AltScreenSearchIndex`、overlay handle、`query`、`matches`、`selectedIndex`/`selectedKey`、`anchorRow`、`selectionMode`。[E: packages/tui/src/tui-alt-screen.ts:147] `SearchSelectionMode` 为 `"query" | "retain" | "next" | "previous"`。[E: packages/tui/src/tui-alt-screen.ts:145]

`TuiAltScreenOptions.searchMatchStyle` 默认 underline，`searchCurrentMatchStyle` 默认 bold+reverse。[E: packages/tui/src/tui-alt-screen.ts:171] [E: packages/tui/src/tui-alt-screen.ts:266]

`AltScreenSearchComponent` 内嵌 `Input`，带边框和 placeholder `Find in transcript`；结果计数是 muted `N/M` 或 `No matches`，底边有可 hover 的 prev/next 按钮。[E: packages/tui/src/alt-screen-search.ts:197] [E: packages/tui/src/alt-screen-search.ts:200] [E: packages/tui/src/alt-screen-search.ts:279]

## 控制流

1. `handleViewportInput@packages/tui/src/tui-alt-screen.ts:656` 命中 `tui.altScreen.search`（默认 `ctrl+shift+f`）时调用 `toggleSearch()`。[E: packages/tui/src/tui-alt-screen.ts:705] [E: packages/tui/src/keybindings.ts:192]
2. `toggleSearch@packages/tui/src/tui-alt-screen.ts:496` 已有搜索则关闭；否则新建 `AltScreenSearchComponent` + `AltScreenSearchIndex`，`showOverlay(..., { anchor: "top-right", width: "40%", minWidth: 32, margin: 1 })`。[E: packages/tui/src/tui-alt-screen.ts:497] [E: packages/tui/src/tui-alt-screen.ts:507] [E: packages/tui/src/tui-alt-screen.ts:587]
3. 输入变化走 `updateSearchQuery()`：记下当前 match 行或 `scrollTop` 作 `anchorRow`，设 `selectionMode = "query"`，请求重绘。[E: packages/tui/src/tui-alt-screen.ts:531] [E: packages/tui/src/alt-screen-search.ts:253]
4. `doRender()` 在 layout 后调用 `refreshSearch()`。query 非空时 `search.index.search(lines, query)` 扫 primary scroll content；lines 与 query 都没变则 `changed === false`。[E: packages/tui/src/tui-alt-screen.ts:1658] [E: packages/tui/src/tui-alt-screen.ts:587] [E: packages/tui/src/alt-screen-search.ts:162]
5. `selectionMode === "query"` 选 `anchorRow` 及之后第一处，否则从 0 开始；`"next"`/`"previous"` 按 `selectedKey` 或 index 绕圈；然后强制回到 `"retain"`。[E: packages/tui/src/tui-alt-screen.ts:599] [E: packages/tui/src/tui-alt-screen.ts:622]
6. 仅当本帧 `selectionMode !== "retain"` 才把当前 match 滚进视口（目标约在 viewport 上方 1/3），并 `disableFollow`。[E: packages/tui/src/tui-alt-screen.ts:586] [E: packages/tui/src/tui-alt-screen.ts:624] [E: packages/tui/src/tui-alt-screen.ts:636]
7. `applySearchHighlights()` 只把**可见** segment 按当前/非当前 style 画到 screen；image line 跳过。[E: packages/tui/src/tui-alt-screen.ts:1484] [E: packages/tui/src/tui-alt-screen.ts:1502]

## 匹配语义与缓存

`buildSearchCorpus()` 先 `stripTerminalSequences`。纯 ASCII 行按非空格 run 整段入索引，避免每格分配 grapheme mapping；非 ASCII 行再按 grapheme 扫。空白不进 corpus，只在相邻非空白之间插一个普通空格，因此跨行、跨多空格的 query 能命中。[E: packages/tui/src/alt-screen-search.ts:34] [E: packages/tui/src/alt-screen-search.ts:53] [E: packages/tui/src/alt-screen-search.ts:80] query 自身也 `/\s+/` 压成单空格并 trim；空 query 返回 `[]`。[E: packages/tui/src/alt-screen-search.ts:108] [E: packages/tui/src/alt-screen-search.ts:117]

匹配是 escape 后的 `RegExp(..., "giu")`，大小写不敏感、按字面量而不是 regex 语法。[E: packages/tui/src/alt-screen-search.ts:118] [E: packages/tui/src/alt-screen-search.ts:112] 测试：`["alpha QUICK", "brown fox"]` + `"quick brown"` 得到跨行两段。[E: packages/tui/test/tui-alt-screen.test.ts:526]

`AltScreenSearchIndex.search()` 在 source lines 未变时复用 corpus；query 也未变时复用 matches 并返回 `changed: false`。`refreshSearch()` 在 `!changed && retain` 时直接返回，不重选、不揭示。[E: packages/tui/src/alt-screen-search.ts:156] [E: packages/tui/src/alt-screen-search.ts:171] [E: packages/tui/src/alt-screen-search.ts:178] [E: packages/tui/src/tui-alt-screen.ts:590]

## 键位

| action | 默认键 | 行为 |
|---|---|---|
| `tui.altScreen.search` | `ctrl+shift+f` | 打开或关闭搜索框 | [E: packages/tui/src/keybindings.ts:192] |
| `tui.altScreen.searchNext` | `enter`, `ctrl+g` | 下一处 | [E: packages/tui/src/keybindings.ts:196] |
| `tui.altScreen.searchPrevious` | `shift+enter`, `ctrl+shift+g` | 上一处 | [E: packages/tui/src/keybindings.ts:200] |
| `tui.altScreen.searchClose` | `escape` | 关 overlay | [E: packages/tui/src/keybindings.ts:204] |

这四个键只在搜索 overlay 自己 focused 时拦截 next/previous/close；`search` 全局可开/关。[E: packages/tui/src/tui-alt-screen.ts:705] [E: packages/tui/src/tui-alt-screen.ts:709] key release 被忽略。[E: packages/tui/src/tui-alt-screen.ts:704] [E: packages/tui/src/tui-alt-screen.ts:706]

`navigateSearch(1|-1)` 只改 `selectionMode` 并 `requestRender()`，真正换 index 在下一帧 `refreshSearch()`。[E: packages/tui/src/tui-alt-screen.ts:542]

关闭走 `closeSearch()`：清 `activeSearch`、`overlay.hide()`。测试确认 Escape 后 editor 重新收到后续输入。[E: packages/tui/src/tui-alt-screen.ts:523] [E: packages/tui/test/tui-alt-screen.test.ts:707]

## Word selection(`/` 与 `-` 不再切开)

双击 word selection 实现在 `TuiAltScreen.getWordSelection()`,不属于 `alt-screen-search.ts` 的 query matcher,但与 fullscreen 鼠标选区同一 renderer [E: packages/tui/src/tui-alt-screen.ts:1156]。

`Intl.Segmenter` 会把 `extensions/starline/...` 或 `earendil-works` 切成多个 word-like segment。`TERMINAL_WORD_SELECTION_JOINERS = new Set(["/", "-"])` 把这两个单字符标成 joiner;`selectable = isWordLike || joiner` [E: packages/tui/src/tui-alt-screen.ts:82] [E: packages/tui/src/tui-alt-screen.ts:1162]。`canJoin(left, right)` 要求两侧都 selectable 且至少一侧是 joiner,再向左右扩张,因此 path 与 kebab-case 整段被选中 [E: packages/tui/src/tui-alt-screen.ts:1171] [E: packages/tui/src/tui-alt-screen.ts:1174]。

测试双击 `starline` 或 `works` 时,clipboard 收到整行 `extensions/starline/fixed-editor/compositor.ts` / `earendil-works/pi-tui`,而不是切开的 token [E: packages/tui/test/tui-alt-screen.test.ts:1370] [E: packages/tui/test/tui-alt-screen.test.ts:1372]。这是 TUI `#7746`;coding-agent changelog 记作 inherited `#8676` [I]。

regular mode 仍把双击交给 terminal emulator;fullscreen 自己拥有 mouse selection,所以用 joiner 对齐常见 terminal 行为 [E: packages/tui/src/tui-alt-screen.ts:82]。

## 增量高亮与滚动 retain

query 每次变化都重跑匹配并重绘，所以高亮是增量的：输入 `needle` 立刻同时标出当前（默认 `\x1b[1;7m`）和其它（默认 `\x1b[4m`）命中。[E: packages/tui/src/tui-alt-screen.ts:266] [E: packages/tui/test/tui-alt-screen.test.ts:684]

`refreshSearch()` 在 `"retain"` 下不改 `scrollTop`（`shouldRevealSelection` 为假）。用户滚轮/PageUp 只触发普通 render，下一帧仍是 `"retain"`，视口停在用户滚到的位置。[E: packages/tui/src/tui-alt-screen.ts:586] [E: packages/tui/src/tui-alt-screen.ts:624]

搜索 overlay focused 时，`shouldDeferViewportInputToOverlay()` 为假，因此 PageUp/wheel 继续滚 transcript，不会被搜索框吃掉。[E: packages/tui/src/tui-alt-screen.ts:646] [E: packages/tui/test/tui-alt-screen.test.ts:1889]

## 设计动机与权衡

- 搜的是 strip 过 ANSI 的已渲染行，不是 markdown source，所以用户看见的字符就是 query 空间。[E: packages/tui/src/alt-screen-search.ts:48] [I]
- 空白归一化让跨行短语可搜，但也意味着 query 里的多空格/换行没有字面意义。[E: packages/tui/src/alt-screen-search.ts:108]
- `"retain"` 把“换 query / next / previous”和“用户自己滚动”分开，避免 follow-output 或每帧 refresh 把视口拽回当前 match。[E: packages/tui/src/tui-alt-screen.ts:586] [E: packages/tui/src/tui-alt-screen.ts:636]
- corpus/match cache 与可见区 highlight 把大 transcript 的每帧成本从“全量重建+全量染色”收成“lines 未变则跳过”。[E: packages/tui/src/alt-screen-search.ts:156] [E: packages/tui/src/tui-alt-screen.ts:1502] [I]

## Gotchas

- 空 query 或 trim 后为空：match 清空，不揭示、不高亮。[E: packages/tui/src/tui-alt-screen.ts:577]
- 搜索框 `handleInput` 把所有未单独拦截的键交给内嵌 `Input`；因此 next/previous/close 必须在 `TuiAltScreen` 里先 consume，否则 `enter` 会进 query。[E: packages/tui/src/alt-screen-search.ts:249] [E: packages/tui/src/tui-alt-screen.ts:709]
- `halfPage*` / `line*` 默认 `defaultKeys: []`，与搜索无关；未绑定就不会在搜索期间生效。[E: packages/tui/src/keybindings.ts:168] [E: packages/tui/src/keybindings.ts:176]
- `stop()` 会 `closeSearch()`，renderer 退出时搜索状态不保留。[E: packages/tui/src/tui-alt-screen.ts:367]
- shortcut 再次按下是 toggle（关闭），不是只 focus 已有 overlay。[E: packages/tui/src/tui-alt-screen.ts:497]

## 跨包边界

匹配与 overlay 都在 `pi-tui`。coding-agent 可通过 `TuiAltScreenOptions.searchMatchStyle` 注入主题，不改变 action id 或 retain 语义。[E: packages/tui/src/tui-alt-screen.ts:171] [I]

## Sources

- `packages/tui/src/alt-screen-search.ts`
- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/keybindings.ts`
- `packages/tui/test/tui-alt-screen.test.ts`

## 相关

- `subsys.tui.alternate-screen` — fullscreen viewport、鼠标选择、overlay 与 wheel 路由。
- `subsys.tui.overlay` — `showOverlay()` 焦点、anchor、hide。
- `ref.tui.keybinding-actions` — `tui.altScreen.search*` 在 `TUI_KEYBINDINGS` 中的默认键。
- `subsys.tui.keybinding-matching` — `KeybindingsManager.matches()` 如何把输入对上 action。
