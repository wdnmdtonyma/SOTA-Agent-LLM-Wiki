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
updated: 5a073885
---

> 多行编辑器组件是 `packages/tui` 里的 terminal text editor 子系统: `EditorComponent` 定义可替换 editor 的最小 contract, `Editor` 是本文件导出的多行实现; raw input、rendered layout、autocomplete、paste marker、history、undo/kill-ring 与 `onSubmit` 回调的连接点在下文逐项展开。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/components/editor.ts:252]

## 能回答的问题

- `EditorComponent` contract 要求自定义 editor 实现哪些 core methods 和 callbacks?
- `Editor` 如何把 terminal key input 变成文本修改、换行或提交?
- `onSubmit` 收到的是普通 editor text 还是 expanded paste content?
- 大段 bracketed paste 为什么在 editor 里显示为 `[paste #n ...]`, 提交时如何恢复?
- autocomplete picker 如何触发、取消、应用 completion?
- editor rendering 如何处理 word wrap、scroll indicator 和 hardware cursor marker?

## 职责边界

`EditorComponent` 是扩展边界: 它继承 `Component`, 要求实现 `getText()`、`setText(text)`、`handleInput(data)`, 并允许宿主通过 `onSubmit` 与 `onChange` 接收用户提交和文本变化。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:17][E: packages/tui/src/editor-component.ts:20][E: packages/tui/src/editor-component.ts:23][E: packages/tui/src/editor-component.ts:30][E: packages/tui/src/editor-component.ts:33]

`Editor` 是导出的多行实现: class `Editor` implements `Component, Focusable`, 内部状态由 `lines`、`cursorLine`、`cursorCol` 组成, 并持有 TUI、theme、padding、scroll、autocomplete、paste、history、kill ring 和 undo stack 等运行时状态。[E: packages/tui/src/components/editor.ts:209][E: packages/tui/src/components/editor.ts:252][E: packages/tui/src/components/editor.ts:253][E: packages/tui/src/components/editor.ts:262][E: packages/tui/src/components/editor.ts:264][E: packages/tui/src/components/editor.ts:270][E: packages/tui/src/components/editor.ts:276][E: packages/tui/src/components/editor.ts:291][E: packages/tui/src/components/editor.ts:299][E: packages/tui/src/components/editor.ts:304][E: packages/tui/src/components/editor.ts:321]

这个节点只描述 editor component 的 public contract 和 `Editor` 的端到端行为; kill-ring、undo、word navigation 的算法细节由 `subsys.tui.editor-mechanics` 承担, autocomplete provider/combiner 的候选生成由 `subsys.tui.autocomplete` 承担。[I]

## 关键文件

- `packages/tui/src/editor-component.ts`: 自定义 editor 的 interface, 包含文本访问、raw input、callbacks、history、insert/expanded text、autocomplete provider 和外观调节 hooks。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:40][E: packages/tui/src/editor-component.ts:47][E: packages/tui/src/editor-component.ts:53][E: packages/tui/src/editor-component.ts:60][E: packages/tui/src/editor-component.ts:67][E: packages/tui/src/editor-component.ts:70][E: packages/tui/src/editor-component.ts:73]
- `packages/tui/src/components/editor.ts`: 导出 `Editor` 实现, 同时导出 `TextChunk`、`wordWrapLine`、`EditorTheme` 和 `EditorOptions` 等 editor-adjacent API。[E: packages/tui/src/components/editor.ts:97][E: packages/tui/src/components/editor.ts:114][E: packages/tui/src/components/editor.ts:221][E: packages/tui/src/components/editor.ts:226][E: packages/tui/src/components/editor.ts:252]

## 数据模型

`EditorState` 是 `Editor` 的核心 mutable model: `lines` 保存 logical lines, `cursorLine` 和 `cursorCol` 保存光标所在 logical position。[E: packages/tui/src/components/editor.ts:209][E: packages/tui/src/components/editor.ts:210][E: packages/tui/src/components/editor.ts:211][E: packages/tui/src/components/editor.ts:212]

`LayoutLine` 是 render-time model: 每个 visual line 记录 `text`, 是否 `hasCursor`, 以及可选 `cursorPos`; `render(width)` 先把 logical text 变成 layout lines, 再按 scroll offset 裁剪输出 string rows。[E: packages/tui/src/components/editor.ts:215][E: packages/tui/src/components/editor.ts:216][E: packages/tui/src/components/editor.ts:217][E: packages/tui/src/components/editor.ts:218][E: packages/tui/src/components/editor.ts:464][E: packages/tui/src/components/editor.ts:479][E: packages/tui/src/components/editor.ts:501]

`TextChunk` 与 `wordWrapLine()` 表示 word-wrap 结果; `wordWrapLine()` 用 grapheme 宽度检测溢出, 在 whitespace/CJK 边界记录 wrap opportunity 并回退到该边界, 否则按当前位置 force-break。[E: packages/tui/src/components/editor.ts:97][E: packages/tui/src/components/editor.ts:114][E: packages/tui/src/components/editor.ts:138][E: packages/tui/src/components/editor.ts:143][E: packages/tui/src/components/editor.ts:147][E: packages/tui/src/components/editor.ts:156][E: packages/tui/src/components/editor.ts:189][E: packages/tui/src/components/editor.ts:196]

paste marker 是 editor 内部的 compact display model: 大 paste 会存入 `pastes: Map<number, string>`, editor 文本只插入 `[paste #n +x lines]` 或 `[paste #n x chars]` marker; `getExpandedText()` 和 submit path 会把 marker 替换回原文。[E: packages/tui/src/components/editor.ts:291][E: packages/tui/src/components/editor.ts:973][E: packages/tui/src/components/editor.ts:986][E: packages/tui/src/components/editor.ts:1185][E: packages/tui/src/components/editor.ts:1189][E: packages/tui/src/components/editor.ts:1192][E: packages/tui/src/components/editor.ts:1196][E: packages/tui/src/components/editor.ts:1248]

## 控制流

1. `constructor@packages/tui/src/components/editor.ts:327` 接收 `TUI`、`EditorTheme` 和 `EditorOptions`, 初始化 border color、`paddingX` 和 `autocompleteMaxVisible`; padding 被归一化为非负整数, autocomplete visible count 被 clamp 到 3 到 20。[E: packages/tui/src/components/editor.ts:327][E: packages/tui/src/components/editor.ts:331][E: packages/tui/src/components/editor.ts:332][E: packages/tui/src/components/editor.ts:333][E: packages/tui/src/components/editor.ts:334]
2. `render@packages/tui/src/components/editor.ts:464` 根据 width 算出 padding 后的 content width 和 layout width, 保存 `lastWidth` 供 cursor navigation 使用, 然后布局文本、按 terminal rows 的 30% 计算 visible lines, 并通过 top/bottom scroll indicator 表示隐藏内容。[E: packages/tui/src/components/editor.ts:464][E: packages/tui/src/components/editor.ts:465][E: packages/tui/src/components/editor.ts:467][E: packages/tui/src/components/editor.ts:471][E: packages/tui/src/components/editor.ts:474][E: packages/tui/src/components/editor.ts:482][E: packages/tui/src/components/editor.ts:483][E: packages/tui/src/components/editor.ts:508][E: packages/tui/src/components/editor.ts:570]
3. `render@packages/tui/src/components/editor.ts:464` 在 focused 时输出 `CURSOR_MARKER`, 使上层 TUI 能定位 hardware cursor; 同一 render pass 会把 active autocomplete `SelectList` 追加到 editor 下方。[E: packages/tui/src/components/editor.ts:464][E: packages/tui/src/components/editor.ts:524][E: packages/tui/src/components/editor.ts:537][E: packages/tui/src/components/editor.ts:579][E: packages/tui/src/components/editor.ts:580]
4. `handleInput@packages/tui/src/components/editor.ts:591` 是 raw terminal input dispatcher: 它先处理 jump mode、bracketed paste、copy/undo/autocomplete mode, 再按 keybinding 分发 deletion、kill/yank、cursor movement、newline、submit、page scroll、character jump 和 printable insertion。[E: packages/tui/src/components/editor.ts:591][E: packages/tui/src/components/editor.ts:595][E: packages/tui/src/components/editor.ts:616][E: packages/tui/src/components/editor.ts:642][E: packages/tui/src/components/editor.ts:647][E: packages/tui/src/components/editor.ts:653][E: packages/tui/src/components/editor.ts:720][E: packages/tui/src/components/editor.ts:746][E: packages/tui/src/components/editor.ts:756][E: packages/tui/src/components/editor.ts:774][E: packages/tui/src/components/editor.ts:792][E: packages/tui/src/components/editor.ts:844][E: packages/tui/src/components/editor.ts:854][E: packages/tui/src/components/editor.ts:869]
5. `submitValue@packages/tui/src/components/editor.ts:1246` 是调用 `onSubmit(result)` 的提交函数: 它先取消 autocomplete, expand paste markers, `trim()` 结果, 清空 editor/paste/history browsing/scroll/undo/lastAction, 触发 `onChange("")`, 最后调用 `onSubmit(result)`。[E: packages/tui/src/components/editor.ts:1246][E: packages/tui/src/components/editor.ts:1247][E: packages/tui/src/components/editor.ts:1248][E: packages/tui/src/components/editor.ts:1250][E: packages/tui/src/components/editor.ts:1251][E: packages/tui/src/components/editor.ts:1253][E: packages/tui/src/components/editor.ts:1254][E: packages/tui/src/components/editor.ts:1255][E: packages/tui/src/components/editor.ts:1256][E: packages/tui/src/components/editor.ts:1258][E: packages/tui/src/components/editor.ts:1259]
6. `setText@packages/tui/src/components/editor.ts:998` 是 programmatic replace path: 它取消 autocomplete、退出 history browsing、normalize line endings/tabs, 如果内容变化则压入 undo snapshot, 然后经 `setTextInternal()` 更新状态并触发 `onChange`。[E: packages/tui/src/components/editor.ts:998][E: packages/tui/src/components/editor.ts:999][E: packages/tui/src/components/editor.ts:1001][E: packages/tui/src/components/editor.ts:1002][E: packages/tui/src/components/editor.ts:1004][E: packages/tui/src/components/editor.ts:1005][E: packages/tui/src/components/editor.ts:1007][E: packages/tui/src/components/editor.ts:1029][E: packages/tui/src/components/editor.ts:1030]
7. `insertTextAtCursor@packages/tui/src/components/editor.ts:1015` 是 programmatic insert path: 它把一次插入作为 atomic undo unit, 退出 history browsing, 由 `insertTextAtCursorInternal()` 处理单行或多行 splice, 最后只触发一次 `onChange`。[E: packages/tui/src/components/editor.ts:1015][E: packages/tui/src/components/editor.ts:1017][E: packages/tui/src/components/editor.ts:1018][E: packages/tui/src/components/editor.ts:1020][E: packages/tui/src/components/editor.ts:1021][E: packages/tui/src/components/editor.ts:1038][E: packages/tui/src/components/editor.ts:1049][E: packages/tui/src/components/editor.ts:1055][E: packages/tui/src/components/editor.ts:1076]
8. `requestAutocomplete@packages/tui/src/components/editor.ts:2121` 取消旧请求并生成 start token; 非 explicit tab/force 场景可按 trigger pattern 使用 20ms debounce, 请求执行时串行等待 previous task, 使用 `AbortController` 和 snapshot 校验丢弃 stale result。[E: packages/tui/src/components/editor.ts:2121][E: packages/tui/src/components/editor.ts:2137][E: packages/tui/src/components/editor.ts:2138][E: packages/tui/src/components/editor.ts:2140][E: packages/tui/src/components/editor.ts:2142][E: packages/tui/src/components/editor.ts:2156][E: packages/tui/src/components/editor.ts:2158][E: packages/tui/src/components/editor.ts:2163][E: packages/tui/src/components/editor.ts:2166][E: packages/tui/src/components/editor.ts:2215][E: packages/tui/src/components/editor.ts:2257]

## 设计动机与权衡

`EditorComponent` 把 editor contract 与 extensions 解耦: contract 强制 text access 和 raw input; callbacks、history、cursor insertion、expanded text、autocomplete provider、padding 和 max visible options 都是 optional hooks, 因此 custom editor 可以按能力逐步兼容宿主。[E: packages/tui/src/editor-component.ts:11][E: packages/tui/src/editor-component.ts:17][E: packages/tui/src/editor-component.ts:20][E: packages/tui/src/editor-component.ts:23][E: packages/tui/src/editor-component.ts:30][E: packages/tui/src/editor-component.ts:33][E: packages/tui/src/editor-component.ts:40][E: packages/tui/src/editor-component.ts:47][E: packages/tui/src/editor-component.ts:53][E: packages/tui/src/editor-component.ts:60][E: packages/tui/src/editor-component.ts:70][E: packages/tui/src/editor-component.ts:73][I]

`Editor` 把 large paste 压缩成 marker 并保留原始 payload: editor 中移动、删除、word-wrap 会把有效 paste marker 当作 atomic segment, 但提交和 `getExpandedText()` 会恢复完整内容。[E: packages/tui/src/components/editor.ts:39][E: packages/tui/src/components/editor.ts:51][E: packages/tui/src/components/editor.ts:53][E: packages/tui/src/components/editor.ts:77][E: packages/tui/src/components/editor.ts:343][E: packages/tui/src/components/editor.ts:344][E: packages/tui/src/components/editor.ts:1185][E: packages/tui/src/components/editor.ts:1196][E: packages/tui/src/components/editor.ts:1248]

autocomplete 请求带 token、abort 和 snapshot 校验, 说明 UI 只接受仍匹配当前文本与光标位置的 suggestions; stale async result 会被忽略, 避免旧候选覆盖新输入。[E: packages/tui/src/components/editor.ts:2137][E: packages/tui/src/components/editor.ts:2138][E: packages/tui/src/components/editor.ts:2163][E: packages/tui/src/components/editor.ts:2166][E: packages/tui/src/components/editor.ts:2215][E: packages/tui/src/components/editor.ts:2257]

## Gotcha

`onSubmit` 收到的是 `expandPasteMarkers(...).trim()` 后的字符串, 因此首尾空白会在提交边界被去掉, 且 large paste marker 会先恢复成原始 paste content。[E: packages/tui/src/components/editor.ts:1248][E: packages/tui/src/components/editor.ts:1259]

`disableSubmit` 只阻止 submit branch: `handleInput()` 在 submit key 分支直接 return, 而 newline branch 和 printable insertion branch 是独立分支。[E: packages/tui/src/components/editor.ts:325][E: packages/tui/src/components/editor.ts:774][E: packages/tui/src/components/editor.ts:787][E: packages/tui/src/components/editor.ts:792][E: packages/tui/src/components/editor.ts:793][E: packages/tui/src/components/editor.ts:804][E: packages/tui/src/components/editor.ts:869][E: packages/tui/src/components/editor.ts:871]

slash menu 被限制在第一 logical line: `isSlashMenuAllowed()` 只在 `cursorLine === 0` 时返回 true, slash context 和 start-of-message detection 都依赖这个 gate。[E: packages/tui/src/components/editor.ts:2042][E: packages/tui/src/components/editor.ts:2043][E: packages/tui/src/components/editor.ts:2048][E: packages/tui/src/components/editor.ts:2055]

## 跨包边界

本节点属于 `pkg: tui`: `Editor` 依赖同包的 `AutocompleteProvider`、keybindings、key decoding、kill ring、undo stack、word navigation、TUI cursor marker 和 `SelectList`; 源文件没有直接依赖 `agent` 或 `coding-agent` 包。[E: packages/tui/src/components/editor.ts:1][E: packages/tui/src/components/editor.ts:2][E: packages/tui/src/components/editor.ts:3][E: packages/tui/src/components/editor.ts:4][E: packages/tui/src/components/editor.ts:5][E: packages/tui/src/components/editor.ts:6][E: packages/tui/src/components/editor.ts:15][E: packages/tui/src/components/editor.ts:16]

`subsys.tui.editor-mechanics` 是同包邻接节点, 负责解释 `KillRing`、`UndoStack`、`findWordBackward` 和 `findWordForward` 的 mechanics; `Editor` 在 deletion/yank/undo/word movement 中调用这些 primitives。[E: packages/tui/src/components/editor.ts:4][E: packages/tui/src/components/editor.ts:6][E: packages/tui/src/components/editor.ts:15][E: packages/tui/src/components/editor.ts:304][E: packages/tui/src/components/editor.ts:321][E: packages/tui/src/components/editor.ts:1489][E: packages/tui/src/components/editor.ts:1857][E: packages/tui/src/components/editor.ts:1971][E: packages/tui/src/components/editor.ts:1976][E: packages/tui/src/components/editor.ts:1841][E: packages/tui/src/components/editor.ts:2033][I]

`subsys.tui.autocomplete` 是同包邻接节点, 负责 autocomplete provider contract 和候选生成; `Editor` 只消费 provider 的 `getSuggestions()`、`applyCompletion()`、trigger characters 和 optional file-completion gate, 并把候选渲染为 `SelectList`。[E: packages/tui/src/components/editor.ts:1][E: packages/tui/src/components/editor.ts:371][E: packages/tui/src/components/editor.ts:374][E: packages/tui/src/components/editor.ts:669][E: packages/tui/src/components/editor.ts:2092][E: packages/tui/src/components/editor.ts:2126][E: packages/tui/src/components/editor.ts:2208][E: packages/tui/src/components/editor.ts:2231][I]

## Sources

- packages/tui/src/editor-component.ts
- packages/tui/src/components/editor.ts

## 相关

- [subsys.tui.editor-mechanics](../../subsystems/tui/editor-mechanics.md): 解释 editor 使用的 kill-ring、undo stack 与 word navigation mechanics。
- [subsys.tui.autocomplete](../../subsystems/tui/autocomplete.md): 解释 autocomplete provider 如何生成 suggestions, 供 `Editor` 渲染和应用 completion。
