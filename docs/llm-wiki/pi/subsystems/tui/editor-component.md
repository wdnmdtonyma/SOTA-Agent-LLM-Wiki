---
id: subsys.tui.editor-component
title: 多行编辑器组件
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/editor-component.ts, packages/tui/src/components/editor.ts, packages/tui/src/keybindings.ts, packages/tui/test/editor-history-keybindings.test.ts]
symbols: [EditorComponent, Editor, onSubmit]
related: [subsys.tui.editor-mechanics, subsys.tui.autocomplete]
evidence: explicit
status: verified
updated: bbb61e34aa
---

> 多行编辑器组件是 `packages/tui` 里的 terminal text editor 子系统: `EditorComponent` 定义可替换 editor 的最小 contract, `Editor` 是本文件导出的多行实现; raw input、rendered layout、autocomplete、paste marker、history、undo/kill-ring 与 `onSubmit` 回调的连接点在下文逐项展开。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/components/editor.ts:284]

## 能回答的问题

- `EditorComponent` contract 要求自定义 editor 实现哪些 core methods 和 callbacks?
- `Editor` 如何把 terminal key input 变成文本修改、换行或提交?
- configurable `tui.editor.historyPrevious` / `historyNext`(例如 Ctrl+P/N) 和方向键浏览 history 有什么差别?
- `onSubmit` 收到的是普通 editor text 还是 expanded paste content?
- 大段 bracketed paste 为什么在 editor 里显示为 `[paste #n ...]`, 提交时如何恢复?
- autocomplete picker 如何触发、取消、应用 completion?
- editor rendering 如何处理 word wrap、scroll indicator 和 hardware cursor marker?

## 职责边界

`EditorComponent` 是扩展边界: 它继承 `Component`, 要求实现 `getText()`、`setText(text)`、`handleInput(data)`, 并允许宿主通过 `onSubmit` 与 `onChange` 接收用户提交和文本变化。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:17][E: packages/tui/src/editor-component.ts:20][E: packages/tui/src/editor-component.ts:23][E: packages/tui/src/editor-component.ts:30][E: packages/tui/src/editor-component.ts:33]

`Editor` 是导出的多行实现: class `Editor` implements `Component, Focusable`, 内部状态由 `lines`、`cursorLine`、`cursorCol` 组成, 并持有 TUI、theme、padding、scroll、autocomplete、paste、history、kill ring 和 undo stack 等运行时状态。[E: packages/tui/src/components/editor.ts:216][E: packages/tui/src/components/editor.ts:284][E: packages/tui/src/components/editor.ts:285][E: packages/tui/src/components/editor.ts:294][E: packages/tui/src/components/editor.ts:296][E: packages/tui/src/components/editor.ts:304][E: packages/tui/src/components/editor.ts:310][E: packages/tui/src/components/editor.ts:325][E: packages/tui/src/components/editor.ts:333][E: packages/tui/src/components/editor.ts:338][E: packages/tui/src/components/editor.ts:355]

这个节点只描述 editor component 的 public contract 和 `Editor` 的端到端行为; kill-ring、undo、word navigation 的算法细节由 `subsys.tui.editor-mechanics` 承担, autocomplete provider/combiner 的候选生成由 `subsys.tui.autocomplete` 承担。[I]

## 关键文件

- `packages/tui/src/editor-component.ts`: 自定义 editor 的 interface, 包含文本访问、raw input、callbacks、history、insert/expanded text、autocomplete provider 和外观调节 hooks。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:40][E: packages/tui/src/editor-component.ts:47][E: packages/tui/src/editor-component.ts:53][E: packages/tui/src/editor-component.ts:60][E: packages/tui/src/editor-component.ts:67][E: packages/tui/src/editor-component.ts:70][E: packages/tui/src/editor-component.ts:73]
- `packages/tui/src/components/editor.ts`: 导出 `Editor` 实现, 同时导出 `TextChunk`、`wordWrapLine`、`EditorTheme` 和 `EditorOptions` 等 editor-adjacent API。[E: packages/tui/src/components/editor.ts:104][E: packages/tui/src/components/editor.ts:121][E: packages/tui/src/components/editor.ts:235][E: packages/tui/src/components/editor.ts:240][E: packages/tui/src/components/editor.ts:284]

## 数据模型

`EditorState` 是 `Editor` 的核心 mutable model: `lines` 保存 logical lines, `cursorLine` 和 `cursorCol` 保存光标所在 logical position。[E: packages/tui/src/components/editor.ts:216][E: packages/tui/src/components/editor.ts:217][E: packages/tui/src/components/editor.ts:218][E: packages/tui/src/components/editor.ts:219]

`LayoutLine` 是 render-time model: 每个 visual line 记录 `text`, 是否 `hasCursor`, 以及可选 `cursorPos`; `render(width)` 先把 logical text 变成 layout lines, 再按 scroll offset 裁剪输出 string rows。[E: packages/tui/src/components/editor.ts:229][E: packages/tui/src/components/editor.ts:230][E: packages/tui/src/components/editor.ts:231][E: packages/tui/src/components/editor.ts:232][E: packages/tui/src/components/editor.ts:508][E: packages/tui/src/components/editor.ts:521][E: packages/tui/src/components/editor.ts:543]

`TextChunk` 与 `wordWrapLine()` 表示 word-wrap 结果; `wordWrapLine()` 用 grapheme 宽度检测溢出, 在 whitespace/CJK 边界记录 wrap opportunity 并回退到该边界, 否则按当前位置 force-break。[E: packages/tui/src/components/editor.ts:104][E: packages/tui/src/components/editor.ts:121][E: packages/tui/src/components/editor.ts:145][E: packages/tui/src/components/editor.ts:150][E: packages/tui/src/components/editor.ts:154][E: packages/tui/src/components/editor.ts:163][E: packages/tui/src/components/editor.ts:196][E: packages/tui/src/components/editor.ts:203]

paste marker 是 editor 内部的 compact display model: 大 paste 会存入 `pastes: Map<number, string>`, editor 文本只插入 `[paste #n +x lines]` 或 `[paste #n x chars]` marker; `getExpandedText()` 和 submit path 会把 marker 替换回原文。[E: packages/tui/src/components/editor.ts:325][E: packages/tui/src/components/editor.ts:1077][E: packages/tui/src/components/editor.ts:1090][E: packages/tui/src/components/editor.ts:1291][E: packages/tui/src/components/editor.ts:1295][E: packages/tui/src/components/editor.ts:1298][E: packages/tui/src/components/editor.ts:1302][E: packages/tui/src/components/editor.ts:1354]

## 控制流

1. `constructor@packages/tui/src/components/editor.ts:345` 接收 `TUI`、`EditorTheme` 和 `EditorOptions`, 初始化 border color、`paddingX` 和 `autocompleteMaxVisible`; padding 被归一化为非负整数, autocomplete visible count 被 clamp 到 3 到 20。[E: packages/tui/src/components/editor.ts:361][E: packages/tui/src/components/editor.ts:365][E: packages/tui/src/components/editor.ts:366][E: packages/tui/src/components/editor.ts:367][E: packages/tui/src/components/editor.ts:368]
2. `render@packages/tui/src/components/editor.ts:482` 根据 width 算出 padding 后的 content width 和 layout width, 保存 `lastWidth` 供 cursor navigation 使用, 然后布局文本、按 terminal rows 的 30% 计算 visible lines, 并通过 top/bottom scroll indicator 表示隐藏内容。[E: packages/tui/src/components/editor.ts:508][E: packages/tui/src/components/editor.ts:509][E: packages/tui/src/components/editor.ts:511][E: packages/tui/src/components/editor.ts:515][E: packages/tui/src/components/editor.ts:518][E: packages/tui/src/components/editor.ts:524][E: packages/tui/src/components/editor.ts:525][E: packages/tui/src/components/editor.ts:532][E: packages/tui/src/components/editor.ts:587]
3. `render@packages/tui/src/components/editor.ts:482` 在 focused 时输出 `CURSOR_MARKER`, 使上层 TUI 能定位 hardware cursor; 同一 render pass 会把 active autocomplete `SelectList` 追加到 editor 下方。[E: packages/tui/src/components/editor.ts:508][E: packages/tui/src/components/editor.ts:557][E: packages/tui/src/components/editor.ts:570][E: packages/tui/src/components/editor.ts:607][E: packages/tui/src/components/editor.ts:608]
4. `handleInput@packages/tui/src/components/editor.ts:603` 是 raw terminal input dispatcher: 它先处理 jump mode、bracketed paste、copy/undo/autocomplete mode, 再按 keybinding 分发 deletion、kill/yank、dedicated history browse、cursor movement、newline、submit、page scroll、character jump 和 printable insertion。[E: packages/tui/src/components/editor.ts:683][E: packages/tui/src/components/editor.ts:687][E: packages/tui/src/components/editor.ts:708][E: packages/tui/src/components/editor.ts:734][E: packages/tui/src/components/editor.ts:739][E: packages/tui/src/components/editor.ts:745][E: packages/tui/src/components/editor.ts:812][E: packages/tui/src/components/editor.ts:838][E: packages/tui/src/components/editor.ts:848][E: packages/tui/src/components/editor.ts:853][E: packages/tui/src/components/editor.ts:860][E: packages/tui/src/components/editor.ts:878][E: packages/tui/src/components/editor.ts:896][E: packages/tui/src/components/editor.ts:948][E: packages/tui/src/components/editor.ts:958][E: packages/tui/src/components/editor.ts:973]
5. `submitValue@packages/tui/src/components/editor.ts:1272` 是调用 `onSubmit(result)` 的提交函数: 它先取消 autocomplete, expand paste markers, `trim()` 结果, 清空 editor/paste/history browsing/scroll/undo/lastAction, 触发 `onChange("")`, 最后调用 `onSubmit(result)`。[E: packages/tui/src/components/editor.ts:1352][E: packages/tui/src/components/editor.ts:1353][E: packages/tui/src/components/editor.ts:1354][E: packages/tui/src/components/editor.ts:1356][E: packages/tui/src/components/editor.ts:1357][E: packages/tui/src/components/editor.ts:1359][E: packages/tui/src/components/editor.ts:1360][E: packages/tui/src/components/editor.ts:1361][E: packages/tui/src/components/editor.ts:1362][E: packages/tui/src/components/editor.ts:1364][E: packages/tui/src/components/editor.ts:1365]
6. `setText@packages/tui/src/components/editor.ts:1022` 是 programmatic replace path: 它取消 autocomplete、退出 history browsing、normalize line endings/tabs, 如果内容变化则压入 undo snapshot, 然后经 `setTextInternal()` 更新状态并触发 `onChange`。[E: packages/tui/src/components/editor.ts:1102][E: packages/tui/src/components/editor.ts:1103][E: packages/tui/src/components/editor.ts:1105][E: packages/tui/src/components/editor.ts:1106][E: packages/tui/src/components/editor.ts:1108][E: packages/tui/src/components/editor.ts:1109][E: packages/tui/src/components/editor.ts:1113][E: packages/tui/src/components/editor.ts:1135][E: packages/tui/src/components/editor.ts:1136]
7. `insertTextAtCursor@packages/tui/src/components/editor.ts:1041` 是 programmatic insert path: 它把一次插入作为 atomic undo unit, 退出 history browsing, 由 `insertTextAtCursorInternal()` 处理单行或多行 splice, 最后只触发一次 `onChange`。[E: packages/tui/src/components/editor.ts:1121][E: packages/tui/src/components/editor.ts:1123][E: packages/tui/src/components/editor.ts:1124][E: packages/tui/src/components/editor.ts:1126][E: packages/tui/src/components/editor.ts:1127][E: packages/tui/src/components/editor.ts:1144][E: packages/tui/src/components/editor.ts:1155][E: packages/tui/src/components/editor.ts:1161][E: packages/tui/src/components/editor.ts:1182]
8. `requestAutocomplete@packages/tui/src/components/editor.ts:2177` 取消旧请求并生成 start token; 非 explicit tab/force 场景可按 trigger pattern 使用 20ms debounce, 请求执行时串行等待 previous task, 使用 `AbortController` 和 snapshot 校验丢弃 stale result。[E: packages/tui/src/components/editor.ts:2275][E: packages/tui/src/components/editor.ts:2291][E: packages/tui/src/components/editor.ts:2292][E: packages/tui/src/components/editor.ts:2294][E: packages/tui/src/components/editor.ts:2296][E: packages/tui/src/components/editor.ts:2310][E: packages/tui/src/components/editor.ts:2312][E: packages/tui/src/components/editor.ts:2317][E: packages/tui/src/components/editor.ts:2320][E: packages/tui/src/components/editor.ts:2369][E: packages/tui/src/components/editor.ts:2411]

## 设计动机与权衡

`EditorComponent` 把 editor contract 与 extensions 解耦: contract 强制 text access 和 raw input; callbacks、history、cursor insertion、expanded text、autocomplete provider、padding 和 max visible options 都是 optional hooks, 因此 custom editor 可以按能力逐步兼容宿主。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:17][E: packages/tui/src/editor-component.ts:20][E: packages/tui/src/editor-component.ts:23][E: packages/tui/src/editor-component.ts:30][E: packages/tui/src/editor-component.ts:33][E: packages/tui/src/editor-component.ts:40][E: packages/tui/src/editor-component.ts:47][E: packages/tui/src/editor-component.ts:53][E: packages/tui/src/editor-component.ts:60][E: packages/tui/src/editor-component.ts:70][E: packages/tui/src/editor-component.ts:73][I]

`Editor` 把 large paste 压缩成 marker 并保留原始 payload: editor 中移动、删除、word-wrap 会把有效 paste marker 当作 atomic segment, 但提交和 `getExpandedText()` 会恢复完整内容。[E: packages/tui/src/components/editor.ts:46][E: packages/tui/src/components/editor.ts:58][E: packages/tui/src/components/editor.ts:60][E: packages/tui/src/components/editor.ts:84][E: packages/tui/src/components/editor.ts:377][E: packages/tui/src/components/editor.ts:378][E: packages/tui/src/components/editor.ts:1291][E: packages/tui/src/components/editor.ts:1302][E: packages/tui/src/components/editor.ts:1354]

`tui.editor.historyPrevious` / `tui.editor.historyNext` 是独立 prompt-history actions: 默认 `defaultKeys: []`(unbound), 用户可绑到 Ctrl+P/N 等键。命中后直接 `cancelAutocomplete()` + `navigateHistory()`, 不先移动光标。[E: packages/tui/src/keybindings.ts:11][E: packages/tui/src/keybindings.ts:12][E: packages/tui/src/keybindings.ts:74][E: packages/tui/src/keybindings.ts:75][E: packages/tui/src/keybindings.ts:78][E: packages/tui/src/keybindings.ts:79][E: packages/tui/src/components/editor.ts:848][E: packages/tui/src/components/editor.ts:849][E: packages/tui/src/components/editor.ts:850][E: packages/tui/src/components/editor.ts:853][E: packages/tui/src/components/editor.ts:854][E: packages/tui/src/components/editor.ts:855][E: packages/tui/test/editor-history-keybindings.test.ts:17][E: packages/tui/test/editor-history-keybindings.test.ts:18][E: packages/tui/test/editor-history-keybindings.test.ts:28][E: packages/tui/test/editor-history-keybindings.test.ts:29] 方向键 `cursorUp` 只在第一 visual line 且（空 editor 或 `historyIndex>-1` 或 `cursorCol===0`）时 browse history；否则第一 visual line 上跳到行首。`cursorDown` 只在已在 history **且** 最后 visual line 时 browse；空 editor / 光标在末尾不会开始 Down 的 history browse。[E: packages/tui/src/components/editor.ts:913][E: packages/tui/src/components/editor.ts:914][E: packages/tui/src/components/editor.ts:915][E: packages/tui/src/components/editor.ts:918][E: packages/tui/src/components/editor.ts:927][E: packages/tui/src/components/editor.ts:928]

autocomplete 请求带 token、abort 和 snapshot 校验, 说明 UI 只接受仍匹配当前文本与光标位置的 suggestions; stale async result 会被忽略, 避免旧候选覆盖新输入。[E: packages/tui/src/components/editor.ts:2291][E: packages/tui/src/components/editor.ts:2292][E: packages/tui/src/components/editor.ts:2317][E: packages/tui/src/components/editor.ts:2320][E: packages/tui/src/components/editor.ts:2369][E: packages/tui/src/components/editor.ts:2411]

## Gotcha

`onSubmit` 收到的是 `expandPasteMarkers(...).trim()` 后的字符串, 因此首尾空白会在提交边界被去掉, 且 large paste marker 会先恢复成原始 paste content。[E: packages/tui/src/components/editor.ts:1354][E: packages/tui/src/components/editor.ts:1365]

`disableSubmit` 只阻止 submit branch: `handleInput()` 在 submit key 分支直接 return, 而 newline branch 和 printable insertion branch 是独立分支。[E: packages/tui/src/components/editor.ts:359][E: packages/tui/src/components/editor.ts:878][E: packages/tui/src/components/editor.ts:891][E: packages/tui/src/components/editor.ts:896][E: packages/tui/src/components/editor.ts:897][E: packages/tui/src/components/editor.ts:908][E: packages/tui/src/components/editor.ts:973][E: packages/tui/src/components/editor.ts:975]

slash menu 被限制在第一 logical line: `isSlashMenuAllowed()` 只在 `cursorLine === 0` 时返回 true, slash context 和 start-of-message detection 都依赖这个 gate。[E: packages/tui/src/components/editor.ts:2178][E: packages/tui/src/components/editor.ts:2179][E: packages/tui/src/components/editor.ts:2184][E: packages/tui/src/components/editor.ts:2191]

## 跨包边界

本节点属于 `pkg: tui`: `Editor` 依赖同包的 `AutocompleteProvider`、keybindings、key decoding、kill ring、undo stack、word navigation、TUI cursor marker 和 `SelectList`; 源文件没有直接依赖 `agent` 或 `coding-agent` 包。[E: packages/tui/src/components/editor.ts:1][E: packages/tui/src/components/editor.ts:2][E: packages/tui/src/components/editor.ts:3][E: packages/tui/src/components/editor.ts:4][E: packages/tui/src/components/editor.ts:12][E: packages/tui/src/components/editor.ts:13][E: packages/tui/src/components/editor.ts:22][E: packages/tui/src/components/editor.ts:23]

`subsys.tui.editor-mechanics` 是同包邻接节点, 负责解释 `KillRing`、`UndoStack`、`findWordBackward` 和 `findWordForward` 的 mechanics; `Editor` 在 deletion/yank/undo/word movement 中调用这些 primitives。[E: packages/tui/src/components/editor.ts:4][E: packages/tui/src/components/editor.ts:13][E: packages/tui/src/components/editor.ts:22][E: packages/tui/src/components/editor.ts:338][E: packages/tui/src/components/editor.ts:355][E: packages/tui/src/components/editor.ts:1623][E: packages/tui/src/components/editor.ts:1991][E: packages/tui/src/components/editor.ts:2105][E: packages/tui/src/components/editor.ts:2110][E: packages/tui/src/components/editor.ts:1975][E: packages/tui/src/components/editor.ts:2169][I]

`subsys.tui.autocomplete` 是同包邻接节点, 负责 autocomplete provider contract 和候选生成; `Editor` 只消费 provider 的 `getSuggestions()`、`applyCompletion()`、trigger characters 和 optional file-completion gate, 并把候选渲染为 `SelectList`。[E: packages/tui/src/components/editor.ts:1][E: packages/tui/src/components/editor.ts:405][E: packages/tui/src/components/editor.ts:408][E: packages/tui/src/components/editor.ts:761][E: packages/tui/src/components/editor.ts:2228][E: packages/tui/src/components/editor.ts:2280][E: packages/tui/src/components/editor.ts:2362][E: packages/tui/src/components/editor.ts:2385][I]

## Sources

- packages/tui/src/editor-component.ts
- packages/tui/src/components/editor.ts
- packages/tui/src/keybindings.ts
- packages/tui/test/editor-history-keybindings.test.ts

## 相关

- [subsys.tui.editor-mechanics](../../subsystems/tui/editor-mechanics.md): 解释 editor 使用的 kill-ring、undo stack 与 word navigation mechanics。
- [subsys.tui.autocomplete](../../subsystems/tui/autocomplete.md): 解释 autocomplete provider 如何生成 suggestions, 供 `Editor` 渲染和应用 completion。
