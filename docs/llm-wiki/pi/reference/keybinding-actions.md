---
id: ref.tui.keybinding-actions
title: TUI keybinding actions catalog (47)
kind: catalog
tier: T3
pkg: tui
source: [packages/tui/src/keybindings.ts]
symbols: [TUI_KEYBINDINGS, Keybindings]
related: [subsys.tui.keybinding-matching]
evidence: explicit
status: verified
updated: 086c32e745
---

> `TUI_KEYBINDINGS` 是 TUI 包的全局 keybinding action registry:它把每个 `tui.*` action id 映射到默认按键(default keys)和英文描述(description)。

## 能回答的问题

- TUI editor/input/select/altScreen 各有哪些 keybinding action?
- 某个 TUI action 的 default binding 是什么?
- 哪些 action 默认未绑定（`defaultKeys: []`）?
- `Keybindings` 接口声明了哪些可绑定的 action id?
- TUI 默认键位里哪些 action 共享同一个 key?
- `TUI_KEYBINDINGS` 与 `KeybindingDefinitions` 的关系是什么?

## Catalog 语义

源码注释把全局 keybinding registry 描述为可被 downstream packages 通过 declaration merging 扩展 [E: packages/tui/src/keybindings.ts:7]；对应的 `Keybindings` 导出接口从这里开始声明 [E: packages/tui/src/keybindings.ts:7]。`Keybinding` 类型等于 `keyof Keybindings`,所以表中的 action id 也是 TUI 内部类型系统认可的 keybinding name [E: packages/tui/src/keybindings.ts:61]。`KeybindingDefinitions` 是 `Record<string, KeybindingDefinition>` [E: packages/tui/src/keybindings.ts:68],其中单个 definition 包含 `defaultKeys` 和可选 `description` [E: packages/tui/src/keybindings.ts:64] [E: packages/tui/src/keybindings.ts:65]；`TUI_KEYBINDINGS` 是满足 `KeybindingDefinitions` 的 const map。[E: packages/tui/src/keybindings.ts:71]

当前源码的 `TUI_KEYBINDINGS` 枚举 47 个 action：23 个 editor（含 prompt history）、4 个 generic input、6 个 generic selection、14 个 alternate-screen viewport/search actions。`Keybindings` interface 逐项声明同一组 id。[E: packages/tui/src/keybindings.ts:9] [E: packages/tui/src/keybindings.ts:58] [E: packages/tui/src/keybindings.ts:71] [I]

未加修饰的 `pageUp`/`pageDown`/`home`/`end` 同时出现在 editor 与 `tui.altScreen.*`；editor 另挂 `ctrl+pageUp`/`ctrl+home` 等变体，供 fullscreen 占用裸键之后使用。[E: packages/tui/src/keybindings.ts:114] [E: packages/tui/src/keybindings.ts:160] [E: packages/tui/src/keybindings.ts:208]

## TUI_KEYBINDINGS 全量表

| 分组 | action | default binding(s) | description | 说明 | 源 |
|---|---|---|---|---|---|
| editor navigation | `tui.editor.cursorUp` | `up` | Move cursor up | 光标上移一行。 | [E: packages/tui/src/keybindings.ts:72] |
| editor navigation | `tui.editor.cursorDown` | `down` | Move cursor down | 光标下移一行。 | [E: packages/tui/src/keybindings.ts:73] |
| editor history | `tui.editor.historyPrevious` | _(unbound)_ | Select previous prompt history entry | 默认 `defaultKeys: []`；由用户或 coding-agent 再绑。 | [E: packages/tui/src/keybindings.ts:74] [E: packages/tui/src/keybindings.ts:75] |
| editor history | `tui.editor.historyNext` | _(unbound)_ | Select next prompt history entry | 默认 `defaultKeys: []`。 | [E: packages/tui/src/keybindings.ts:78] [E: packages/tui/src/keybindings.ts:79] |
| editor navigation | `tui.editor.cursorLeft` | `left`, `ctrl+b` | Move cursor left | 光标左移一个字符；`ctrl+b` 是 alternate binding。 | [E: packages/tui/src/keybindings.ts:82] [E: packages/tui/src/keybindings.ts:83] |
| editor navigation | `tui.editor.cursorRight` | `right`, `ctrl+f` | Move cursor right | 光标右移一个字符；`ctrl+f` 是 alternate binding。 | [E: packages/tui/src/keybindings.ts:86] [E: packages/tui/src/keybindings.ts:87] |
| editor navigation | `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | Move cursor word left | 按词向左移动光标；同一 action 有三个 default keys。 | [E: packages/tui/src/keybindings.ts:90] [E: packages/tui/src/keybindings.ts:91] |
| editor navigation | `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | Move cursor word right | 按词向右移动光标；同一 action 有三个 default keys。 | [E: packages/tui/src/keybindings.ts:94] [E: packages/tui/src/keybindings.ts:95] |
| editor navigation | `tui.editor.cursorLineStart` | `home`, `ctrl+home`, `ctrl+a` | Move to line start | 行首；`ctrl+home` 让 fullscreen 占用裸 `home` 后 editor 仍有修饰变体。 | [E: packages/tui/src/keybindings.ts:98] [E: packages/tui/src/keybindings.ts:99] |
| editor navigation | `tui.editor.cursorLineEnd` | `end`, `ctrl+end`, `ctrl+e` | Move to line end | 行尾；`ctrl+end` 同上。 | [E: packages/tui/src/keybindings.ts:102] [E: packages/tui/src/keybindings.ts:103] |
| editor navigation | `tui.editor.jumpForward` | `ctrl+]` | Jump forward to character | 向前跳转到字符；具体匹配流程在 `subsys.tui.keybinding-matching` 说明。 | [E: packages/tui/src/keybindings.ts:106] [E: packages/tui/src/keybindings.ts:107] |
| editor navigation | `tui.editor.jumpBackward` | `ctrl+alt+]` | Jump backward to character | 向后跳转到字符。 | [E: packages/tui/src/keybindings.ts:110] [E: packages/tui/src/keybindings.ts:111] |
| editor navigation | `tui.editor.pageUp` | `pageUp`, `ctrl+pageUp` | Page up | 编辑器向上翻页；`ctrl+pageUp` 是 fullscreen 下仍可达的变体。 | [E: packages/tui/src/keybindings.ts:114] |
| editor navigation | `tui.editor.pageDown` | `pageDown`, `ctrl+pageDown` | Page down | 编辑器向下翻页。 | [E: packages/tui/src/keybindings.ts:115] |
| editor editing | `tui.editor.deleteCharBackward` | `backspace` | Delete character backward | 删除光标前一个字符。 | [E: packages/tui/src/keybindings.ts:116] [E: packages/tui/src/keybindings.ts:117] |
| editor editing | `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | Delete character forward | 删除光标后一个字符；`ctrl+d` 是 alternate binding。 | [E: packages/tui/src/keybindings.ts:120] [E: packages/tui/src/keybindings.ts:121] |
| editor editing | `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | Delete word backward | 删除光标前一个词。 | [E: packages/tui/src/keybindings.ts:124] [E: packages/tui/src/keybindings.ts:125] |
| editor editing | `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | Delete word forward | 删除光标后一个词。 | [E: packages/tui/src/keybindings.ts:128] [E: packages/tui/src/keybindings.ts:129] |
| editor editing | `tui.editor.deleteToLineStart` | `ctrl+u` | Delete to line start | 删除从光标到行首的内容。 | [E: packages/tui/src/keybindings.ts:132] [E: packages/tui/src/keybindings.ts:133] |
| editor editing | `tui.editor.deleteToLineEnd` | `ctrl+k` | Delete to line end | 删除从光标到行尾的内容。 | [E: packages/tui/src/keybindings.ts:136] [E: packages/tui/src/keybindings.ts:137] |
| editor editing | `tui.editor.yank` | `ctrl+y` | Yank | 执行 yank,即取回最近删除/剪切的文本语义 [I]。 | [E: packages/tui/src/keybindings.ts:140] |
| editor editing | `tui.editor.yankPop` | `alt+y` | Yank pop | 在 yank 历史中切换或弹出下一项的编辑动作语义 [I]。 | [E: packages/tui/src/keybindings.ts:141] |
| editor editing | `tui.editor.undo` | `ctrl+-` | Undo | 撤销上一项编辑操作。 | [E: packages/tui/src/keybindings.ts:142] |
| input | `tui.input.newLine` | `shift+enter`, `ctrl+j` | Insert newline | 在通用 input 中插入换行。 | [E: packages/tui/src/keybindings.ts:143] |
| input | `tui.input.submit` | `enter` | Submit input | 提交通用 input。 | [E: packages/tui/src/keybindings.ts:144] |
| input | `tui.input.tab` | `tab` | Tab / autocomplete | Tab 或 autocomplete 入口；源码描述把两种含义放在同一 action。 | [E: packages/tui/src/keybindings.ts:145] |
| input | `tui.input.copy` | `ctrl+c` | Copy selection | 复制当前 selection。 | [E: packages/tui/src/keybindings.ts:146] |
| select | `tui.select.up` | `up` | Move selection up | selection 列表上移。 | [E: packages/tui/src/keybindings.ts:147] |
| select | `tui.select.down` | `down` | Move selection down | selection 列表下移。 | [E: packages/tui/src/keybindings.ts:148] |
| select | `tui.select.pageUp` | `pageUp` | Selection page up | selection 列表向上翻页。 | [E: packages/tui/src/keybindings.ts:149] |
| select | `tui.select.pageDown` | `pageDown` | Selection page down | selection 列表向下翻页。 | [E: packages/tui/src/keybindings.ts:150] [E: packages/tui/src/keybindings.ts:151] |
| select | `tui.select.confirm` | `enter` | Confirm selection | 确认当前 selection。 | [E: packages/tui/src/keybindings.ts:154] |
| select | `tui.select.cancel` | `escape`, `ctrl+c` | Cancel selection | 取消当前 selection；`ctrl+c` 也是 `tui.input.copy` 的默认键,是否冲突取决于调用场景和 active action set [I]。 | [E: packages/tui/src/keybindings.ts:155] [E: packages/tui/src/keybindings.ts:156] |
| alternate screen | `tui.altScreen.pageUp` | `pageUp` | Scroll viewport up one page | 全屏主 viewport 向上滚动一页。 | [E: packages/tui/src/keybindings.ts:160] [E: packages/tui/src/keybindings.ts:161] |
| alternate screen | `tui.altScreen.pageDown` | `pageDown` | Scroll viewport down one page | 全屏主 viewport 向下滚动一页。 | [E: packages/tui/src/keybindings.ts:164] [E: packages/tui/src/keybindings.ts:165] |
| alternate screen | `tui.altScreen.halfPageUp` | _(unbound)_ | Scroll viewport up half a page | 默认未绑定；用户配置后生效。 | [E: packages/tui/src/keybindings.ts:168] [E: packages/tui/src/keybindings.ts:169] |
| alternate screen | `tui.altScreen.halfPageDown` | _(unbound)_ | Scroll viewport down half a page | 默认未绑定。 | [E: packages/tui/src/keybindings.ts:172] [E: packages/tui/src/keybindings.ts:173] |
| alternate screen | `tui.altScreen.lineUp` | _(unbound)_ | Scroll viewport up one line | 默认未绑定的单行上滚。 | [E: packages/tui/src/keybindings.ts:176] [E: packages/tui/src/keybindings.ts:177] |
| alternate screen | `tui.altScreen.lineDown` | _(unbound)_ | Scroll viewport down one line | 默认未绑定的单行下滚。 | [E: packages/tui/src/keybindings.ts:180] [E: packages/tui/src/keybindings.ts:181] |
| alternate screen | `tui.altScreen.previousPrompt` | `ctrl+shift+up` | Jump to previous semantic prompt | 跳到前一个 OSC 133 标记的 message boundary。 | [E: packages/tui/src/keybindings.ts:184] [E: packages/tui/src/keybindings.ts:185] |
| alternate screen | `tui.altScreen.nextPrompt` | `ctrl+shift+down` | Jump to next semantic prompt | 跳到后一个 OSC 133 标记的 message boundary。 | [E: packages/tui/src/keybindings.ts:188] [E: packages/tui/src/keybindings.ts:189] |
| alternate screen search | `tui.altScreen.search` | `ctrl+shift+f` | Search the primary scroll view | 打开 fullscreen transcript 搜索。 | [E: packages/tui/src/keybindings.ts:192] [E: packages/tui/src/keybindings.ts:193] |
| alternate screen search | `tui.altScreen.searchNext` | `enter`, `ctrl+g` | Select the next search match | 搜索框 focused 时下一处。 | [E: packages/tui/src/keybindings.ts:196] [E: packages/tui/src/keybindings.ts:197] |
| alternate screen search | `tui.altScreen.searchPrevious` | `shift+enter`, `ctrl+shift+g` | Select the previous search match | 搜索框 focused 时上一处。 | [E: packages/tui/src/keybindings.ts:200] [E: packages/tui/src/keybindings.ts:201] |
| alternate screen search | `tui.altScreen.searchClose` | `escape` | Close transcript search | 关闭搜索 overlay。 | [E: packages/tui/src/keybindings.ts:204] [E: packages/tui/src/keybindings.ts:205] |
| alternate screen | `tui.altScreen.top` | `home` | Scroll viewport to top | 滚到主 viewport 顶部。 | [E: packages/tui/src/keybindings.ts:208] |
| alternate screen | `tui.altScreen.bottom` | `end` | Scroll viewport to bottom | 滚到主 viewport 底部。 | [E: packages/tui/src/keybindings.ts:209] |

## 与匹配子系统的关系

`TUI_KEYBINDINGS` 只定义 action 到 default keys 的 catalog；实际匹配由 `KeybindingsManager.matches(data, keybinding)` 读取 resolved keys [E: packages/tui/src/keybindings.ts:270],遍历每个 key [E: packages/tui/src/keybindings.ts:272],并调用 `matchesKey(data, key)` 完成 [E: packages/tui/src/keybindings.ts:273]。用户配置可以覆盖默认键:`userKeys` 来自 `userBindings[id]` [E: packages/tui/src/keybindings.ts:264],当它是 `undefined` 时使用 definition default keys,否则使用用户给定 keys [E: packages/tui/src/keybindings.ts:265]。空数组覆盖会禁用该 action。[E: packages/tui/src/keybindings.ts:265] [E: packages/tui/src/keybindings.ts:218] `subsys.tui.keybinding-matching` 是相关节点,负责解释 key normalization、conflict detection 和 byte/input data 到 key id 的匹配路径。

## Sources

- packages/tui/src/keybindings.ts

## 相关

- `subsys.tui.keybinding-matching` - TUI keybinding matching 子系统,解释 default keys、user bindings、conflicts 和 `matchesKey` 如何一起决定某个 input 是否命中 action。
