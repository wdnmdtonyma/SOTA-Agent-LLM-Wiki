---
id: subsys.tui.editor-component
title: 多行编辑器组件
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/editor-component.ts, packages/tui/src/components/editor.ts]
symbols: [EditorComponent, Editor, onSubmit]
related: [subsys.tui.editor-mechanics, subsys.tui.autocomplete]
evidence: explicit
status: verified
updated: c1019d9202
---

> 多行编辑器组件是 `packages/tui` 里的 terminal text editor 子系统: `EditorComponent` 定义可替换 editor 的最小 contract, `Editor` 是本文件导出的多行实现; raw input、rendered layout、autocomplete、paste marker、history、undo/kill-ring 与 `onSubmit` 回调的连接点在下文逐项展开。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/components/editor.ts:270]

## 能回答的问题

- `EditorComponent` contract 要求自定义 editor 实现哪些 core methods 和 callbacks?
- `Editor` 如何把 terminal key input 变成文本修改、换行或提交?
- `onSubmit` 收到的是普通 editor text 还是 expanded paste content?
- 大段 bracketed paste 为什么在 editor 里显示为 `[paste #n ...]`, 提交时如何恢复?
- autocomplete picker 如何触发、取消、应用 completion?
- editor rendering 如何处理 word wrap、scroll indicator 和 hardware cursor marker?

## 职责边界

`EditorComponent` 是扩展边界: 它继承 `Component`, 要求实现 `getText()`、`setText(text)`、`handleInput(data)`, 并允许宿主通过 `onSubmit` 与 `onChange` 接收用户提交和文本变化。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:17][E: packages/tui/src/editor-component.ts:20][E: packages/tui/src/editor-component.ts:23][E: packages/tui/src/editor-component.ts:30][E: packages/tui/src/editor-component.ts:33]

`Editor` 是导出的多行实现: class `Editor` implements `Component, Focusable`, 内部状态由 `lines`、`cursorLine`、`cursorCol` 组成, 并持有 TUI、theme、padding、scroll、autocomplete、paste、history、kill ring 和 undo stack 等运行时状态。[E: packages/tui/src/components/editor.ts:209][E: packages/tui/src/components/editor.ts:270][E: packages/tui/src/components/editor.ts:271][E: packages/tui/src/components/editor.ts:280][E: packages/tui/src/components/editor.ts:282][E: packages/tui/src/components/editor.ts:288][E: packages/tui/src/components/editor.ts:294][E: packages/tui/src/components/editor.ts:309][E: packages/tui/src/components/editor.ts:317][E: packages/tui/src/components/editor.ts:322][E: packages/tui/src/components/editor.ts:339]

这个节点只描述 editor component 的 public contract 和 `Editor` 的端到端行为; kill-ring、undo、word navigation 的算法细节由 `subsys.tui.editor-mechanics` 承担, autocomplete provider/combiner 的候选生成由 `subsys.tui.autocomplete` 承担。[I]

## 关键文件

- `packages/tui/src/editor-component.ts`: 自定义 editor 的 interface, 包含文本访问、raw input、callbacks、history、insert/expanded text、autocomplete provider 和外观调节 hooks。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:40][E: packages/tui/src/editor-component.ts:47][E: packages/tui/src/editor-component.ts:53][E: packages/tui/src/editor-component.ts:60][E: packages/tui/src/editor-component.ts:67][E: packages/tui/src/editor-component.ts:70][E: packages/tui/src/editor-component.ts:73]
- `packages/tui/src/components/editor.ts`: 导出 `Editor` 实现, 同时导出 `TextChunk`、`wordWrapLine`、`EditorTheme` 和 `EditorOptions` 等 editor-adjacent API。[E: packages/tui/src/components/editor.ts:97][E: packages/tui/src/components/editor.ts:114][E: packages/tui/src/components/editor.ts:228][E: packages/tui/src/components/editor.ts:233][E: packages/tui/src/components/editor.ts:270]

## 数据模型

`EditorState` 是 `Editor` 的核心 mutable model: `lines` 保存 logical lines, `cursorLine` 和 `cursorCol` 保存光标所在 logical position。[E: packages/tui/src/components/editor.ts:209][E: packages/tui/src/components/editor.ts:210][E: packages/tui/src/components/editor.ts:211][E: packages/tui/src/components/editor.ts:212]

`LayoutLine` 是 render-time model: 每个 visual line 记录 `text`, 是否 `hasCursor`, 以及可选 `cursorPos`; `render(width)` 先把 logical text 变成 layout lines, 再按 scroll offset 裁剪输出 string rows。[E: packages/tui/src/components/editor.ts:222][E: packages/tui/src/components/editor.ts:223][E: packages/tui/src/components/editor.ts:224][E: packages/tui/src/components/editor.ts:225][E: packages/tui/src/components/editor.ts:482][E: packages/tui/src/components/editor.ts:497][E: packages/tui/src/components/editor.ts:519]

`TextChunk` 与 `wordWrapLine()` 表示 word-wrap 结果; `wordWrapLine()` 用 grapheme 宽度检测溢出, 在 whitespace/CJK 边界记录 wrap opportunity 并回退到该边界, 否则按当前位置 force-break。[E: packages/tui/src/components/editor.ts:97][E: packages/tui/src/components/editor.ts:114][E: packages/tui/src/components/editor.ts:138][E: packages/tui/src/components/editor.ts:143][E: packages/tui/src/components/editor.ts:147][E: packages/tui/src/components/editor.ts:156][E: packages/tui/src/components/editor.ts:189][E: packages/tui/src/components/editor.ts:196]

paste marker 是 editor 内部的 compact display model: 大 paste 会存入 `pastes: Map<number, string>`, editor 文本只插入 `[paste #n +x lines]` 或 `[paste #n x chars]` marker; `getExpandedText()` 和 submit path 会把 marker 替换回原文。[E: packages/tui/src/components/editor.ts:309][E: packages/tui/src/components/editor.ts:985][E: packages/tui/src/components/editor.ts:998][E: packages/tui/src/components/editor.ts:1199][E: packages/tui/src/components/editor.ts:1203][E: packages/tui/src/components/editor.ts:1206][E: packages/tui/src/components/editor.ts:1210][E: packages/tui/src/components/editor.ts:1262]

## 控制流

1. `constructor@packages/tui/src/components/editor.ts:327` 接收 `TUI`、`EditorTheme` 和 `EditorOptions`, 初始化 border color、`paddingX` 和 `autocompleteMaxVisible`; padding 被归一化为非负整数, autocomplete visible count 被 clamp 到 3 到 20。[E: packages/tui/src/components/editor.ts:345][E: packages/tui/src/components/editor.ts:349][E: packages/tui/src/components/editor.ts:350][E: packages/tui/src/components/editor.ts:351][E: packages/tui/src/components/editor.ts:352]
2. `render@packages/tui/src/components/editor.ts:464` 根据 width 算出 padding 后的 content width 和 layout width, 保存 `lastWidth` 供 cursor navigation 使用, 然后布局文本、按 terminal rows 的 30% 计算 visible lines, 并通过 top/bottom scroll indicator 表示隐藏内容。[E: packages/tui/src/components/editor.ts:482][E: packages/tui/src/components/editor.ts:483][E: packages/tui/src/components/editor.ts:485][E: packages/tui/src/components/editor.ts:489][E: packages/tui/src/components/editor.ts:492][E: packages/tui/src/components/editor.ts:500][E: packages/tui/src/components/editor.ts:501][E: packages/tui/src/components/editor.ts:526][E: packages/tui/src/components/editor.ts:583]
3. `render@packages/tui/src/components/editor.ts:464` 在 focused 时输出 `CURSOR_MARKER`, 使上层 TUI 能定位 hardware cursor; 同一 render pass 会把 active autocomplete `SelectList` 追加到 editor 下方。[E: packages/tui/src/components/editor.ts:482][E: packages/tui/src/components/editor.ts:537][E: packages/tui/src/components/editor.ts:550][E: packages/tui/src/components/editor.ts:591][E: packages/tui/src/components/editor.ts:592]
4. `handleInput@packages/tui/src/components/editor.ts:591` 是 raw terminal input dispatcher: 它先处理 jump mode、bracketed paste、copy/undo/autocomplete mode, 再按 keybinding 分发 deletion、kill/yank、cursor movement、newline、submit、page scroll、character jump 和 printable insertion。[E: packages/tui/src/components/editor.ts:603][E: packages/tui/src/components/editor.ts:607][E: packages/tui/src/components/editor.ts:628][E: packages/tui/src/components/editor.ts:654][E: packages/tui/src/components/editor.ts:659][E: packages/tui/src/components/editor.ts:665][E: packages/tui/src/components/editor.ts:732][E: packages/tui/src/components/editor.ts:758][E: packages/tui/src/components/editor.ts:768][E: packages/tui/src/components/editor.ts:786][E: packages/tui/src/components/editor.ts:804][E: packages/tui/src/components/editor.ts:856][E: packages/tui/src/components/editor.ts:866][E: packages/tui/src/components/editor.ts:881]
5. `submitValue@packages/tui/src/components/editor.ts:1246` 是调用 `onSubmit(result)` 的提交函数: 它先取消 autocomplete, expand paste markers, `trim()` 结果, 清空 editor/paste/history browsing/scroll/undo/lastAction, 触发 `onChange("")`, 最后调用 `onSubmit(result)`。[E: packages/tui/src/components/editor.ts:1260][E: packages/tui/src/components/editor.ts:1261][E: packages/tui/src/components/editor.ts:1262][E: packages/tui/src/components/editor.ts:1264][E: packages/tui/src/components/editor.ts:1265][E: packages/tui/src/components/editor.ts:1267][E: packages/tui/src/components/editor.ts:1268][E: packages/tui/src/components/editor.ts:1269][E: packages/tui/src/components/editor.ts:1270][E: packages/tui/src/components/editor.ts:1272][E: packages/tui/src/components/editor.ts:1273]
6. `setText@packages/tui/src/components/editor.ts:998` 是 programmatic replace path: 它取消 autocomplete、退出 history browsing、normalize line endings/tabs, 如果内容变化则压入 undo snapshot, 然后经 `setTextInternal()` 更新状态并触发 `onChange`。[E: packages/tui/src/components/editor.ts:1010][E: packages/tui/src/components/editor.ts:1011][E: packages/tui/src/components/editor.ts:1013][E: packages/tui/src/components/editor.ts:1014][E: packages/tui/src/components/editor.ts:1016][E: packages/tui/src/components/editor.ts:1017][E: packages/tui/src/components/editor.ts:1021][E: packages/tui/src/components/editor.ts:1043][E: packages/tui/src/components/editor.ts:1044]
7. `insertTextAtCursor@packages/tui/src/components/editor.ts:1015` 是 programmatic insert path: 它把一次插入作为 atomic undo unit, 退出 history browsing, 由 `insertTextAtCursorInternal()` 处理单行或多行 splice, 最后只触发一次 `onChange`。[E: packages/tui/src/components/editor.ts:1029][E: packages/tui/src/components/editor.ts:1031][E: packages/tui/src/components/editor.ts:1032][E: packages/tui/src/components/editor.ts:1034][E: packages/tui/src/components/editor.ts:1035][E: packages/tui/src/components/editor.ts:1052][E: packages/tui/src/components/editor.ts:1063][E: packages/tui/src/components/editor.ts:1069][E: packages/tui/src/components/editor.ts:1090]
8. `requestAutocomplete@packages/tui/src/components/editor.ts:2121` 取消旧请求并生成 start token; 非 explicit tab/force 场景可按 trigger pattern 使用 20ms debounce, 请求执行时串行等待 previous task, 使用 `AbortController` 和 snapshot 校验丢弃 stale result。[E: packages/tui/src/components/editor.ts:2165][E: packages/tui/src/components/editor.ts:2181][E: packages/tui/src/components/editor.ts:2182][E: packages/tui/src/components/editor.ts:2184][E: packages/tui/src/components/editor.ts:2186][E: packages/tui/src/components/editor.ts:2200][E: packages/tui/src/components/editor.ts:2202][E: packages/tui/src/components/editor.ts:2207][E: packages/tui/src/components/editor.ts:2210][E: packages/tui/src/components/editor.ts:2259][E: packages/tui/src/components/editor.ts:2301]

## 设计动机与权衡

`EditorComponent` 把 editor contract 与 extensions 解耦: contract 强制 text access 和 raw input; callbacks、history、cursor insertion、expanded text、autocomplete provider、padding 和 max visible options 都是 optional hooks, 因此 custom editor 可以按能力逐步兼容宿主。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:17][E: packages/tui/src/editor-component.ts:20][E: packages/tui/src/editor-component.ts:23][E: packages/tui/src/editor-component.ts:30][E: packages/tui/src/editor-component.ts:33][E: packages/tui/src/editor-component.ts:40][E: packages/tui/src/editor-component.ts:47][E: packages/tui/src/editor-component.ts:53][E: packages/tui/src/editor-component.ts:60][E: packages/tui/src/editor-component.ts:70][E: packages/tui/src/editor-component.ts:73][I]

`Editor` 把 large paste 压缩成 marker 并保留原始 payload: editor 中移动、删除、word-wrap 会把有效 paste marker 当作 atomic segment, 但提交和 `getExpandedText()` 会恢复完整内容。[E: packages/tui/src/components/editor.ts:39][E: packages/tui/src/components/editor.ts:51][E: packages/tui/src/components/editor.ts:53][E: packages/tui/src/components/editor.ts:77][E: packages/tui/src/components/editor.ts:361][E: packages/tui/src/components/editor.ts:362][E: packages/tui/src/components/editor.ts:1199][E: packages/tui/src/components/editor.ts:1210][E: packages/tui/src/components/editor.ts:1262]

autocomplete 请求带 token、abort 和 snapshot 校验, 说明 UI 只接受仍匹配当前文本与光标位置的 suggestions; stale async result 会被忽略, 避免旧候选覆盖新输入。[E: packages/tui/src/components/editor.ts:2181][E: packages/tui/src/components/editor.ts:2182][E: packages/tui/src/components/editor.ts:2207][E: packages/tui/src/components/editor.ts:2210][E: packages/tui/src/components/editor.ts:2259][E: packages/tui/src/components/editor.ts:2301]

## Gotcha

`onSubmit` 收到的是 `expandPasteMarkers(...).trim()` 后的字符串, 因此首尾空白会在提交边界被去掉, 且 large paste marker 会先恢复成原始 paste content。[E: packages/tui/src/components/editor.ts:1262][E: packages/tui/src/components/editor.ts:1273]

`disableSubmit` 只阻止 submit branch: `handleInput()` 在 submit key 分支直接 return, 而 newline branch 和 printable insertion branch 是独立分支。[E: packages/tui/src/components/editor.ts:343][E: packages/tui/src/components/editor.ts:786][E: packages/tui/src/components/editor.ts:799][E: packages/tui/src/components/editor.ts:804][E: packages/tui/src/components/editor.ts:805][E: packages/tui/src/components/editor.ts:816][E: packages/tui/src/components/editor.ts:881][E: packages/tui/src/components/editor.ts:883]

slash menu 被限制在第一 logical line: `isSlashMenuAllowed()` 只在 `cursorLine === 0` 时返回 true, slash context 和 start-of-message detection 都依赖这个 gate。[E: packages/tui/src/components/editor.ts:2086][E: packages/tui/src/components/editor.ts:2087][E: packages/tui/src/components/editor.ts:2092][E: packages/tui/src/components/editor.ts:2099]

## 跨包边界

本节点属于 `pkg: tui`: `Editor` 依赖同包的 `AutocompleteProvider`、keybindings、key decoding、kill ring、undo stack、word navigation、TUI cursor marker 和 `SelectList`; 源文件没有直接依赖 `agent` 或 `coding-agent` 包。[E: packages/tui/src/components/editor.ts:1][E: packages/tui/src/components/editor.ts:2][E: packages/tui/src/components/editor.ts:3][E: packages/tui/src/components/editor.ts:4][E: packages/tui/src/components/editor.ts:5][E: packages/tui/src/components/editor.ts:6][E: packages/tui/src/components/editor.ts:15][E: packages/tui/src/components/editor.ts:16]

`subsys.tui.editor-mechanics` 是同包邻接节点, 负责解释 `KillRing`、`UndoStack`、`findWordBackward` 和 `findWordForward` 的 mechanics; `Editor` 在 deletion/yank/undo/word movement 中调用这些 primitives。[E: packages/tui/src/components/editor.ts:4][E: packages/tui/src/components/editor.ts:6][E: packages/tui/src/components/editor.ts:15][E: packages/tui/src/components/editor.ts:322][E: packages/tui/src/components/editor.ts:339][E: packages/tui/src/components/editor.ts:1531][E: packages/tui/src/components/editor.ts:1899][E: packages/tui/src/components/editor.ts:2013][E: packages/tui/src/components/editor.ts:2018][E: packages/tui/src/components/editor.ts:1883][E: packages/tui/src/components/editor.ts:2077][I]

`subsys.tui.autocomplete` 是同包邻接节点, 负责 autocomplete provider contract 和候选生成; `Editor` 只消费 provider 的 `getSuggestions()`、`applyCompletion()`、trigger characters 和 optional file-completion gate, 并把候选渲染为 `SelectList`。[E: packages/tui/src/components/editor.ts:1][E: packages/tui/src/components/editor.ts:389][E: packages/tui/src/components/editor.ts:392][E: packages/tui/src/components/editor.ts:681][E: packages/tui/src/components/editor.ts:2136][E: packages/tui/src/components/editor.ts:2170][E: packages/tui/src/components/editor.ts:2252][E: packages/tui/src/components/editor.ts:2275][I]

## Sources

- packages/tui/src/editor-component.ts
- packages/tui/src/components/editor.ts

## 相关

- [subsys.tui.editor-mechanics](../../subsystems/tui/editor-mechanics.md): 解释 editor 使用的 kill-ring、undo stack 与 word navigation mechanics。
- [subsys.tui.autocomplete](../../subsystems/tui/autocomplete.md): 解释 autocomplete provider 如何生成 suggestions, 供 `Editor` 渲染和应用 completion。
