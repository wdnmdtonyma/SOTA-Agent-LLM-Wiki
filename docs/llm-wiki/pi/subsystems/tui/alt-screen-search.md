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
updated: 853a80d26c
---

> Fullscreen transcript 搜索是 `TuiAltScreen` 在 primary `ScrollView` 已渲染文本上做的增量查找：`Ctrl+Shift+F` 打开 overlay，边输入边高亮，`Enter`/`Ctrl+G` 下一处、`Shift+Enter` 上一处；手动滚动不会把视口弹回当前 match。

## 能回答的问题

- `Ctrl+Shift+F` 打开的是什么 overlay，query 存在哪？
- 跨行、跨空白的 query 怎样匹配已渲染 transcript？
- 当前 match 与其它 match 默认怎么高亮？
- `Enter`/`Ctrl+G` 与 `Shift+Enter`/`Ctrl+Shift+G` 如何绕圈选中下一处/上一处？
- 用户滚轮或 PageUp 之后，为什么视口不会跳回当前 match？
- 双击 word selection 为什么不再在 `/` 与 `-` 上切开 path / kebab-case(#8676)?

## 职责边界

`packages/tui/src/alt-screen-search.ts` 提供纯函数匹配和搜索框组件：`findAltScreenSearchMatches(lines, query)`、`getAltScreenSearchMatchKey()`、`AltScreenSearchComponent`。[E: packages/tui/src/alt-screen-search.ts:71] [E: packages/tui/src/alt-screen-search.ts:99] [E: packages/tui/src/alt-screen-search.ts:105] 打开/关闭 overlay、消费 keybinding、刷新 match、滚动揭示、把高亮画进 viewport 都在 `TuiAltScreen`。[E: packages/tui/src/tui-alt-screen.ts:450] [E: packages/tui/src/tui-alt-screen.ts:499] [E: packages/tui/src/tui-alt-screen.ts:1176] `TUI_KEYBINDINGS` 只登记默认键，不实现搜索。[E: packages/tui/src/keybindings.ts:192]

双击 word selection 实现在 `TuiAltScreen.getWordSelection()`,不属于 `alt-screen-search.ts`;本节点仍记录 `#8676` / `#7746` 的 joiner 规则,因为选区与搜索同属 fullscreen renderer。[E: packages/tui/src/tui-alt-screen.ts:860]

本节点不覆盖 editor 内查找，也不覆盖 coding-agent 主题怎样染 `searchMatchStyle`。[I]

## 关键文件

- `packages/tui/src/alt-screen-search.ts`: corpus 归一化、regex 匹配、搜索框 UI。
- `packages/tui/src/tui-alt-screen.ts`: `ActiveSearch`、`openSearch`/`refreshSearch`/`applySearchHighlights`、viewport key 路由。
- `packages/tui/src/keybindings.ts`: `tui.altScreen.search*` 默认键。
- `packages/tui/test/tui-alt-screen.test.ts`: 跨行匹配、增量高亮、滚动 retain、关闭后还焦点。

## 数据模型

`AltScreenSearchMatch.segments` 是一组 `{ row, startCol, endCol }`，同一 match 可跨行。[E: packages/tui/src/alt-screen-search.ts:19] [E: packages/tui/src/alt-screen-search.ts:13] `getAltScreenSearchMatchKey()` 用首尾 segment 拼 `row:start:row:end`，供后续 refresh 认回同一处。[E: packages/tui/src/alt-screen-search.ts:99]

`ActiveSearch` 持有 component、overlay handle、`query`、`matches`、`selectedIndex`/`selectedKey`、`anchorRow`、`selectionMode`。[E: packages/tui/src/tui-alt-screen.ts:129] `SearchSelectionMode` 为 `"query" | "retain" | "next" | "previous"`。[E: packages/tui/src/tui-alt-screen.ts:127]

`TuiAltScreenOptions.searchMatchStyle` 默认 underline，`searchCurrentMatchStyle` 默认 bold+reverse。[E: packages/tui/src/tui-alt-screen.ts:152] [E: packages/tui/src/tui-alt-screen.ts:225]

`AltScreenSearchComponent` 内嵌 `Input`，标题行 reverse-video：`Find transcript` 加 `N/M` 或 `No matches`。[E: packages/tui/src/alt-screen-search.ts:105] [E: packages/tui/src/alt-screen-search.ts:141]

## 控制流

1. `handleViewportInput@packages/tui/src/tui-alt-screen.ts:566` 命中 `tui.altScreen.search`（默认 `ctrl+shift+f`）时调用 `openSearch()`。[E: packages/tui/src/tui-alt-screen.ts:606] [E: packages/tui/src/keybindings.ts:192]
2. `openSearch@packages/tui/src/tui-alt-screen.ts:450` 已有搜索则 `overlay.focus()`；否则新建 `AltScreenSearchComponent`，`showOverlay(..., { anchor: "top-right", width: "40%", minWidth: 24, margin: 1 })`。[E: packages/tui/src/tui-alt-screen.ts:451] [E: packages/tui/src/tui-alt-screen.ts:465]
3. 输入变化走 `updateSearchQuery()`：记下当前 match 行或 `scrollTop` 作 `anchorRow`，设 `selectionMode = "query"`，请求重绘。[E: packages/tui/src/tui-alt-screen.ts:481] [E: packages/tui/src/alt-screen-search.ts:130]
4. `doRender()` 在 layout 后调用 `refreshSearch()`。query 非空时 `findAltScreenSearchMatches(lines, query)` 扫 primary scroll content。[E: packages/tui/src/tui-alt-screen.ts:1316] [E: packages/tui/src/tui-alt-screen.ts:515]
5. `selectionMode === "query"` 选 `anchorRow` 及之后第一处，否则从 0 开始；`"next"`/`"previous"` 按 `selectedKey` 或 index 绕圈；然后强制回到 `"retain"`。[E: packages/tui/src/tui-alt-screen.ts:521] [E: packages/tui/src/tui-alt-screen.ts:539]
6. 仅当本帧 `selectionMode !== "retain"` 才把当前 match 滚进视口（目标约在 viewport 上方 1/3），并 `disableFollow`。[E: packages/tui/src/tui-alt-screen.ts:514] [E: packages/tui/src/tui-alt-screen.ts:550] [E: packages/tui/src/tui-alt-screen.ts:553]
7. `applySearchHighlights()` 把可见 segment 按当前/非当前 style 画到 screen；image line 跳过。[E: packages/tui/src/tui-alt-screen.ts:1176] [E: packages/tui/src/tui-alt-screen.ts:1210]

## 匹配语义

`buildSearchCorpus()` 先 `stripTerminalSequences`，再按 grapheme 扫。空白不进 corpus，只在相邻非空白之间插一个普通空格，因此跨行、跨多空格的 query 能命中。[E: packages/tui/src/alt-screen-search.ts:40] [E: packages/tui/src/alt-screen-search.ts:45] [E: packages/tui/src/alt-screen-search.ts:50] query 自身也 `/\s+/` 压成单空格并 trim；空 query 返回 `[]`。[E: packages/tui/src/alt-screen-search.ts:63] [E: packages/tui/src/alt-screen-search.ts:73]

匹配是 escape 后的 `RegExp(..., "giu")`，大小写不敏感、按字面量而不是 regex 语法。[E: packages/tui/src/alt-screen-search.ts:67] [E: packages/tui/src/alt-screen-search.ts:76] 测试：`["alpha QUICK", "brown fox"]` + `"quick brown"` 得到跨行两段。[E: packages/tui/test/tui-alt-screen.test.ts:407]

## 键位

| action | 默认键 | 行为 |
|---|---|---|
| `tui.altScreen.search` | `ctrl+shift+f` | 打开或重新 focus 搜索框 | [E: packages/tui/src/keybindings.ts:192] |
| `tui.altScreen.searchNext` | `enter`, `ctrl+g` | 下一处 | [E: packages/tui/src/keybindings.ts:196] |
| `tui.altScreen.searchPrevious` | `shift+enter`, `ctrl+shift+g` | 上一处 | [E: packages/tui/src/keybindings.ts:200] |
| `tui.altScreen.searchClose` | `escape` | 关 overlay | [E: packages/tui/src/keybindings.ts:204] |

这四个键只在搜索 overlay 自己 focused 时拦截 next/previous/close；`search` 全局可开。[E: packages/tui/src/tui-alt-screen.ts:610] key release 被忽略。[E: packages/tui/src/tui-alt-screen.ts:605] [E: packages/tui/src/tui-alt-screen.ts:612]

`navigateSearch(1|-1)` 只改 `selectionMode` 并 `requestRender()`，真正换 index 在下一帧 `refreshSearch()`。[E: packages/tui/src/tui-alt-screen.ts:492]

关闭走 `closeSearch()`：清 `activeSearch`、`overlay.hide()`。测试确认 Escape 后 editor 重新收到后续输入。[E: packages/tui/src/tui-alt-screen.ts:473] [E: packages/tui/test/tui-alt-screen.test.ts:497]

## Word selection(`/` 与 `-` 不再切开)

双击 word selection 实现在 `TuiAltScreen.getWordSelection()`,不属于 `alt-screen-search.ts` 的 query matcher,但与 fullscreen 鼠标选区同一 renderer [E: packages/tui/src/tui-alt-screen.ts:860]。

`Intl.Segmenter` 会把 `extensions/starline/...` 或 `earendil-works` 切成多个 word-like segment。`TERMINAL_WORD_SELECTION_JOINERS = new Set(["/", "-"])` 把这两个单字符标成 joiner;`selectable = isWordLike || joiner` [E: packages/tui/src/tui-alt-screen.ts:71] [E: packages/tui/src/tui-alt-screen.ts:866] [E: packages/tui/src/tui-alt-screen.ts:867]。`canJoin(left, right)` 要求两侧都 selectable 且至少一侧是 joiner,再向左右扩张,因此 path 与 kebab-case 整段被选中 [E: packages/tui/src/tui-alt-screen.ts:875] [E: packages/tui/src/tui-alt-screen.ts:881]。

测试双击 `starline` 或 `works` 时,clipboard 收到整行 `extensions/starline/fixed-editor/compositor.ts` / `earendil-works/pi-tui`,而不是切开的 token [E: packages/tui/test/tui-alt-screen.test.ts:1103] [E: packages/tui/test/tui-alt-screen.test.ts:1127]。这是 TUI `#7746`;coding-agent changelog 记作 inherited `#8676` [I]。

regular mode 仍把双击交给 terminal emulator;fullscreen 自己拥有 mouse selection,所以用 joiner 对齐常见 terminal 行为 [E: packages/tui/src/tui-alt-screen.ts:71]。

## 增量高亮与滚动 retain

query 每次变化都重跑匹配并重绘，所以高亮是增量的：输入 `needle` 立刻同时标出当前（默认 `\x1b[1;7m`）和其它（默认 `\x1b[4m`）命中。[E: packages/tui/src/tui-alt-screen.ts:225] [E: packages/tui/test/tui-alt-screen.test.ts:428] [E: packages/tui/test/tui-alt-screen.test.ts:479]

`refreshSearch()` 在 `"retain"` 下返回 `false`，不改 `scrollTop`。用户滚轮/PageUp 只触发普通 render，下一帧仍是 `"retain"`，视口停在用户滚到的位置。[E: packages/tui/src/tui-alt-screen.ts:514] [E: packages/tui/src/tui-alt-screen.ts:541] 测试：先搜到第二处，再 wheel 到 `scrollTop === 0`，搜索框仍在且不弹回。[E: packages/tui/test/tui-alt-screen.test.ts:482]

搜索 overlay focused 时，`shouldDeferViewportInputToOverlay()` 为假，因此 PageUp/wheel 继续滚 transcript，不会被搜索框吃掉。[E: packages/tui/src/tui-alt-screen.ts:562] [E: packages/tui/test/tui-alt-screen.test.ts:1491]

## 设计动机与权衡

- 搜的是 strip 过 ANSI 的已渲染行，不是 markdown source，所以用户看见的字符就是 query 空间。[E: packages/tui/src/alt-screen-search.ts:40] [I]
- 空白归一化让跨行短语可搜，但也意味着 query 里的多空格/换行没有字面意义。[E: packages/tui/src/alt-screen-search.ts:50] [E: packages/tui/src/alt-screen-search.ts:63]
- `"retain"` 把“换 query / next / previous”和“用户自己滚动”分开，避免 follow-output 或每帧 refresh 把视口拽回当前 match。[E: packages/tui/src/tui-alt-screen.ts:514] [E: packages/tui/src/tui-alt-screen.ts:553]

## Gotchas

- 空 query 或 trim 后为空：match 清空，不揭示、不高亮。[E: packages/tui/src/tui-alt-screen.ts:505]
- 搜索框 `handleInput` 把所有未单独拦截的键交给内嵌 `Input`；因此 next/previous/close 必须在 `TuiAltScreen` 里先 consume，否则 `enter` 会进 query。[E: packages/tui/src/alt-screen-search.ts:130] [E: packages/tui/src/tui-alt-screen.ts:611]
- `halfPage*` / `line*` 默认 `defaultKeys: []`，与搜索无关；未绑定就不会在搜索期间生效。[E: packages/tui/src/keybindings.ts:168] [E: packages/tui/src/keybindings.ts:176]
- `stop()` 会 `closeSearch()`，renderer 退出时搜索状态不保留。[E: packages/tui/src/tui-alt-screen.ts:322]

## 跨包边界

匹配与 overlay 都在 `pi-tui`。coding-agent 可通过 `TuiAltScreenOptions.searchMatchStyle` 注入主题，不改变 action id 或 retain 语义。[E: packages/tui/src/tui-alt-screen.ts:152] [I]

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
