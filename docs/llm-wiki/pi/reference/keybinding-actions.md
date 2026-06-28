---
id: ref.tui.keybinding-actions
title: TUI keybinding actions catalog
kind: catalog
tier: T3
pkg: tui
source: [packages/tui/src/keybindings.ts]
symbols: [TUI_KEYBINDINGS, Keybindings]
related: [subsys.tui.keybinding-matching]
evidence: explicit
status: verified
updated: 5a073885
---

> `TUI_KEYBINDINGS` 是 TUI 包的全局 keybinding action registry:它把每个 `tui.*` action id 映射到默认按键(default keys)和英文描述(description)。

## 能回答的问题

- TUI editor/input/select 各有哪些 keybinding action?
- 某个 TUI action 的 default binding 是什么?
- `Keybindings` 接口声明了哪些可绑定的 action id?
- TUI 默认键位里哪些 action 共享同一个 key?
- `TUI_KEYBINDINGS` 与 `KeybindingDefinitions` 的关系是什么?

## Catalog 语义

源码注释把全局 keybinding registry 描述为可被 downstream packages 通过 declaration merging 扩展 [E: packages/tui/src/keybindings.ts:7]；对应的 `Keybindings` 导出接口从这里开始声明 [E: packages/tui/src/keybindings.ts:7]。`Keybinding` 类型等于 `keyof Keybindings`,所以表中的 action id 也是 TUI 内部类型系统认可的 keybinding name [E: packages/tui/src/keybindings.ts:44]。`KeybindingDefinitions` 是 `Record<string, KeybindingDefinition>` [E: packages/tui/src/keybindings.ts:51],其中单个 definition 包含 `defaultKeys` 和可选 `description` [E: packages/tui/src/keybindings.ts:47] [E: packages/tui/src/keybindings.ts:48]；`TUI_KEYBINDINGS` 用 `as const satisfies KeybindingDefinitions` 约束为 keybinding definition map [E: packages/tui/src/keybindings.ts:134]。

当前源码的 `TUI_KEYBINDINGS` 枚举 31 个 action:21 个 editor action、4 个 generic input action、6 个 generic selection action [I]。

## TUI_KEYBINDINGS 全量表

| 分组 | action | default binding(s) | description | 说明 | 源 |
|---|---|---|---|---|---|
| editor navigation | `tui.editor.cursorUp` | `up` | Move cursor up | 光标上移一行。 | [E: packages/tui/src/keybindings.ts:55] |
| editor navigation | `tui.editor.cursorDown` | `down` | Move cursor down | 光标下移一行。 | [E: packages/tui/src/keybindings.ts:56] |
| editor navigation | `tui.editor.cursorLeft` | `left`, `ctrl+b` | Move cursor left | 光标左移一个字符；`ctrl+b` 是 alternate binding。 | [E: packages/tui/src/keybindings.ts:57] [E: packages/tui/src/keybindings.ts:58] [E: packages/tui/src/keybindings.ts:59] |
| editor navigation | `tui.editor.cursorRight` | `right`, `ctrl+f` | Move cursor right | 光标右移一个字符；`ctrl+f` 是 alternate binding。 | [E: packages/tui/src/keybindings.ts:61] [E: packages/tui/src/keybindings.ts:62] [E: packages/tui/src/keybindings.ts:63] |
| editor navigation | `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | Move cursor word left | 按词向左移动光标；同一 action 有三个 default keys。 | [E: packages/tui/src/keybindings.ts:65] [E: packages/tui/src/keybindings.ts:66] [E: packages/tui/src/keybindings.ts:67] |
| editor navigation | `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | Move cursor word right | 按词向右移动光标；同一 action 有三个 default keys。 | [E: packages/tui/src/keybindings.ts:69] [E: packages/tui/src/keybindings.ts:70] [E: packages/tui/src/keybindings.ts:71] |
| editor navigation | `tui.editor.cursorLineStart` | `home`, `ctrl+a` | Move to line start | 移动到当前行起点。 | [E: packages/tui/src/keybindings.ts:73] [E: packages/tui/src/keybindings.ts:74] [E: packages/tui/src/keybindings.ts:75] |
| editor navigation | `tui.editor.cursorLineEnd` | `end`, `ctrl+e` | Move to line end | 移动到当前行终点。 | [E: packages/tui/src/keybindings.ts:77] [E: packages/tui/src/keybindings.ts:78] [E: packages/tui/src/keybindings.ts:79] |
| editor navigation | `tui.editor.jumpForward` | `ctrl+]` | Jump forward to character | 向前跳转到字符；具体匹配流程在 `subsys.tui.keybinding-matching` 说明。 | [E: packages/tui/src/keybindings.ts:81] [E: packages/tui/src/keybindings.ts:82] [E: packages/tui/src/keybindings.ts:83] |
| editor navigation | `tui.editor.jumpBackward` | `ctrl+alt+]` | Jump backward to character | 向后跳转到字符；具体匹配流程在 `subsys.tui.keybinding-matching` 说明。 | [E: packages/tui/src/keybindings.ts:85] [E: packages/tui/src/keybindings.ts:86] [E: packages/tui/src/keybindings.ts:87] |
| editor navigation | `tui.editor.pageUp` | `pageUp` | Page up | 编辑器向上翻页。 | [E: packages/tui/src/keybindings.ts:89] |
| editor navigation | `tui.editor.pageDown` | `pageDown` | Page down | 编辑器向下翻页。 | [E: packages/tui/src/keybindings.ts:90] |
| editor editing | `tui.editor.deleteCharBackward` | `backspace` | Delete character backward | 删除光标前一个字符。 | [E: packages/tui/src/keybindings.ts:91] [E: packages/tui/src/keybindings.ts:92] [E: packages/tui/src/keybindings.ts:93] |
| editor editing | `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | Delete character forward | 删除光标后一个字符；`ctrl+d` 是 alternate binding。 | [E: packages/tui/src/keybindings.ts:95] [E: packages/tui/src/keybindings.ts:96] [E: packages/tui/src/keybindings.ts:97] |
| editor editing | `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | Delete word backward | 删除光标前一个词。 | [E: packages/tui/src/keybindings.ts:99] [E: packages/tui/src/keybindings.ts:100] [E: packages/tui/src/keybindings.ts:101] |
| editor editing | `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | Delete word forward | 删除光标后一个词。 | [E: packages/tui/src/keybindings.ts:103] [E: packages/tui/src/keybindings.ts:104] [E: packages/tui/src/keybindings.ts:105] |
| editor editing | `tui.editor.deleteToLineStart` | `ctrl+u` | Delete to line start | 删除从光标到行首的内容。 | [E: packages/tui/src/keybindings.ts:107] [E: packages/tui/src/keybindings.ts:108] [E: packages/tui/src/keybindings.ts:109] |
| editor editing | `tui.editor.deleteToLineEnd` | `ctrl+k` | Delete to line end | 删除从光标到行尾的内容。 | [E: packages/tui/src/keybindings.ts:111] [E: packages/tui/src/keybindings.ts:112] [E: packages/tui/src/keybindings.ts:113] |
| editor editing | `tui.editor.yank` | `ctrl+y` | Yank | 执行 yank,即取回最近删除/剪切的文本语义 [I]。 | [E: packages/tui/src/keybindings.ts:115] |
| editor editing | `tui.editor.yankPop` | `alt+y` | Yank pop | 在 yank 历史中切换或弹出下一项的编辑动作语义 [I]。 | [E: packages/tui/src/keybindings.ts:116] |
| editor editing | `tui.editor.undo` | `ctrl+-` | Undo | 撤销上一项编辑操作。 | [E: packages/tui/src/keybindings.ts:117] |
| input | `tui.input.newLine` | `shift+enter`, `ctrl+j` | Insert newline | 在通用 input 中插入换行。 | [E: packages/tui/src/keybindings.ts:118] |
| input | `tui.input.submit` | `enter` | Submit input | 提交通用 input。 | [E: packages/tui/src/keybindings.ts:119] |
| input | `tui.input.tab` | `tab` | Tab / autocomplete | Tab 或 autocomplete 入口；源码描述把两种含义放在同一 action。 | [E: packages/tui/src/keybindings.ts:120] |
| input | `tui.input.copy` | `ctrl+c` | Copy selection | 复制当前 selection。 | [E: packages/tui/src/keybindings.ts:121] |
| select | `tui.select.up` | `up` | Move selection up | selection 列表上移。 | [E: packages/tui/src/keybindings.ts:122] |
| select | `tui.select.down` | `down` | Move selection down | selection 列表下移。 | [E: packages/tui/src/keybindings.ts:123] |
| select | `tui.select.pageUp` | `pageUp` | Selection page up | selection 列表向上翻页。 | [E: packages/tui/src/keybindings.ts:124] |
| select | `tui.select.pageDown` | `pageDown` | Selection page down | selection 列表向下翻页。 | [E: packages/tui/src/keybindings.ts:125] [E: packages/tui/src/keybindings.ts:126] [E: packages/tui/src/keybindings.ts:127] |
| select | `tui.select.confirm` | `enter` | Confirm selection | 确认当前 selection。 | [E: packages/tui/src/keybindings.ts:129] |
| select | `tui.select.cancel` | `escape`, `ctrl+c` | Cancel selection | 取消当前 selection；`ctrl+c` 也是 `tui.input.copy` 的默认键,是否冲突取决于调用场景和 active action set [I]。 | [E: packages/tui/src/keybindings.ts:130] [E: packages/tui/src/keybindings.ts:131] [E: packages/tui/src/keybindings.ts:132] |

## 与匹配子系统的关系

`TUI_KEYBINDINGS` 只定义 action 到 default keys 的 catalog；实际匹配由 `KeybindingsManager.matches(data, keybinding)` 读取 resolved keys [E: packages/tui/src/keybindings.ts:195],遍历每个 key [E: packages/tui/src/keybindings.ts:196],并调用 `matchesKey(data, key)` 完成 [E: packages/tui/src/keybindings.ts:197]。用户配置可以覆盖默认键:`userKeys` 来自 `userBindings[id]` [E: packages/tui/src/keybindings.ts:188],当它是 `undefined` 时使用 definition default keys,否则使用用户给定 keys [E: packages/tui/src/keybindings.ts:189]。`subsys.tui.keybinding-matching` 是相关节点,负责解释 key normalization、conflict detection 和 byte/input data 到 key id 的匹配路径。

## Sources

- packages/tui/src/keybindings.ts

## 相关

- `subsys.tui.keybinding-matching` - TUI keybinding matching 子系统,解释 default keys、user bindings、conflicts 和 `matchesKey` 如何一起决定某个 input 是否命中 action。
