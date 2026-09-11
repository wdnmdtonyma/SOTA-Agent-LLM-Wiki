---
id: ref.coding-agent.default-keybindings
title: 默认键位目录(90)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/keybindings.ts
  - packages/coding-agent/docs/keybindings.md
  - packages/tui/src/keybindings.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts
  - packages/coding-agent/src/modes/interactive/components/thinking-selector.ts
symbols:
  - KEYBINDINGS
  - TUI_KEYBINDINGS
  - AppKeybindings
  - useWindowsKeybindings
evidence: explicit
status: verified
updated: bbb61e34aa
related:
  - surface.config.keybindings
  - subsys.coding-agent.keybindings
---

> `ref.coding-agent.default-keybindings` 是 pi coding-agent 默认 keybinding 的逐实例 catalog:以 `KEYBINDINGS = { ...TUI_KEYBINDINGS, app.* }` 为 ground truth,覆盖 TUI 基础动作和 coding-agent 产品动作。

## 能回答的问题

- pi 默认内置了哪些 namespaced keybinding action id?
- 每个 action id 默认绑定哪些 key chord?
- 哪些默认键位来自 pi-tui,哪些由 pi-coding-agent 追加?
- 哪些默认键位按平台变化或默认不绑定任何 key?
- 旧 catalog 名 `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 在当前源码中由什么取代?

## Catalog 口径

`packages/coding-agent/src/core/keybindings.ts` 从 `@earendil-works/pi-tui` 导入 `TUI_KEYBINDINGS`,并导出 `KEYBINDINGS` [E: packages/coding-agent/src/core/keybindings.ts:6] [E: packages/coding-agent/src/core/keybindings.ts:75]。`KEYBINDINGS` 先展开 `TUI_KEYBINDINGS`,再覆盖若干 TUI 默认键,然后追加 `app.*` actions [E: packages/coding-agent/src/core/keybindings.ts:76] [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:93] [E: packages/coding-agent/src/core/keybindings.ts:238]。

`useWindowsKeybindings()` 在 `win32` 或 `linux` 且存在 `WSL_DISTRO_NAME` / `WSL_INTEROP` 时为真;module 级 `windowsKeybindings` 用它决定 Windows/WSL 避让默认 [E: packages/coding-agent/src/core/keybindings.ts:62] [E: packages/coding-agent/src/core/keybindings.ts:66] [E: packages/coding-agent/src/core/keybindings.ts:73]。`app.suspend` 仍只看 `process.platform === "win32"`,WSL 保留 `ctrl+z` [E: packages/coding-agent/src/core/keybindings.ts:97]。

`TUI_KEYBINDINGS` 当前包含 47 个 `tui.*` 实例，覆盖 editor(含 history)、generic input、selection 和 14 个 alternate-screen viewport/search actions [E: packages/tui/src/keybindings.ts:71] [E: packages/tui/src/keybindings.ts:74] [E: packages/tui/src/keybindings.ts:168] [E: packages/tui/src/keybindings.ts:192] [E: packages/tui/src/keybindings.ts:209]。`AppKeybindings` 声明 43 个 `app.*` action id（含 `app.thinking.save`），并通过 module augmentation 合并进 pi-tui 的 `Keybindings` interface [E: packages/coding-agent/src/core/keybindings.ts:14] [E: packages/coding-agent/src/core/keybindings.ts:20] [E: packages/coding-agent/src/core/keybindings.ts:57] [E: packages/coding-agent/src/core/keybindings.ts:69]。因此默认键位实例总数为 90（47 tui + 43 app）[I]。

当前源码没有导出旧 catalog 名 `DEFAULT_APP_KEYBINDINGS` 或 `DEFAULT_EDITOR_KEYBINDINGS`;index 与节点已统一到可核默认目录符号 `KEYBINDINGS`、`TUI_KEYBINDINGS` 和 `AppKeybindings` [E: packages/coding-agent/src/core/keybindings.ts:75] [E: packages/tui/src/keybindings.ts:71] [E: packages/coding-agent/src/core/keybindings.ts:14]。

## TUI editor defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.editor.cursorUp` | `up` | Move cursor up. | [E: packages/tui/src/keybindings.ts:72] |
| `tui.editor.cursorDown` | `down` | Move cursor down. | [E: packages/tui/src/keybindings.ts:73] |
| `tui.editor.historyPrevious` | none | Select previous prompt history entry; default key array is empty。 | [E: packages/tui/src/keybindings.ts:74] [E: packages/tui/src/keybindings.ts:76] |
| `tui.editor.historyNext` | none | Select next prompt history entry; default key array is empty。 | [E: packages/tui/src/keybindings.ts:78] [E: packages/tui/src/keybindings.ts:80] |
| `tui.editor.cursorLeft` | `left`, `ctrl+b` | Move cursor left. | [E: packages/tui/src/keybindings.ts:82] [E: packages/tui/src/keybindings.ts:83] [E: packages/tui/src/keybindings.ts:84] |
| `tui.editor.cursorRight` | `right`, `ctrl+f` | Move cursor right. | [E: packages/tui/src/keybindings.ts:86] [E: packages/tui/src/keybindings.ts:87] [E: packages/tui/src/keybindings.ts:88] |
| `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | Move cursor word left. | [E: packages/tui/src/keybindings.ts:90] [E: packages/tui/src/keybindings.ts:91] [E: packages/tui/src/keybindings.ts:92] |
| `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | Move cursor word right. | [E: packages/tui/src/keybindings.ts:94] [E: packages/tui/src/keybindings.ts:95] [E: packages/tui/src/keybindings.ts:96] |
| `tui.editor.cursorLineStart` | `home`, `ctrl+home`, `ctrl+a` | Move to line start. | [E: packages/tui/src/keybindings.ts:98] [E: packages/tui/src/keybindings.ts:99] [E: packages/tui/src/keybindings.ts:100] |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+end`, `ctrl+e` | Move to line end. | [E: packages/tui/src/keybindings.ts:102] [E: packages/tui/src/keybindings.ts:103] [E: packages/tui/src/keybindings.ts:104] |
| `tui.editor.jumpForward` | `ctrl+]` | Jump forward to character. | [E: packages/tui/src/keybindings.ts:106] [E: packages/tui/src/keybindings.ts:107] [E: packages/tui/src/keybindings.ts:108] |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | Jump backward to character. | [E: packages/tui/src/keybindings.ts:110] [E: packages/tui/src/keybindings.ts:111] [E: packages/tui/src/keybindings.ts:112] |
| `tui.editor.pageUp` | `pageUp`, `ctrl+pageUp` | Page up. | [E: packages/tui/src/keybindings.ts:114] |
| `tui.editor.pageDown` | `pageDown`, `ctrl+pageDown` | Page down. | [E: packages/tui/src/keybindings.ts:115] |
| `tui.editor.deleteCharBackward` | `backspace` | Delete character backward. | [E: packages/tui/src/keybindings.ts:116] [E: packages/tui/src/keybindings.ts:117] [E: packages/tui/src/keybindings.ts:118] |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | Delete character forward. | [E: packages/tui/src/keybindings.ts:120] [E: packages/tui/src/keybindings.ts:121] [E: packages/tui/src/keybindings.ts:122] |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | Delete word backward. | [E: packages/tui/src/keybindings.ts:124] [E: packages/tui/src/keybindings.ts:125] [E: packages/tui/src/keybindings.ts:126] |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | Delete word forward. | [E: packages/tui/src/keybindings.ts:128] [E: packages/tui/src/keybindings.ts:129] [E: packages/tui/src/keybindings.ts:130] |
| `tui.editor.deleteToLineStart` | `ctrl+u` | Delete to line start. | [E: packages/tui/src/keybindings.ts:132] [E: packages/tui/src/keybindings.ts:133] [E: packages/tui/src/keybindings.ts:134] |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | Delete to line end. | [E: packages/tui/src/keybindings.ts:136] [E: packages/tui/src/keybindings.ts:137] [E: packages/tui/src/keybindings.ts:138] |
| `tui.editor.yank` | `ctrl+y` | Yank. | [E: packages/tui/src/keybindings.ts:140] |
| `tui.editor.yankPop` | `alt+y` | Yank pop. | [E: packages/tui/src/keybindings.ts:141] |
| `tui.editor.undo` | TUI 包默认 `ctrl+-`;coding-agent `KEYBINDINGS` 覆盖为 win32=`ctrl+z`、WSL=`alt+z`、其它=`ctrl+-` | Undo. | TUI [E: packages/tui/src/keybindings.ts:142]; override [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:79]; docs [E: packages/coding-agent/docs/keybindings.md:73] |

## TUI input and selection defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.input.newLine` | `shift+enter`, `ctrl+j` | Insert newline. | [E: packages/tui/src/keybindings.ts:143] |
| `tui.input.submit` | `enter` | Submit input. | [E: packages/tui/src/keybindings.ts:144] |
| `tui.input.tab` | `tab` | Tab / autocomplete. | [E: packages/tui/src/keybindings.ts:145] |
| `tui.input.copy` | `ctrl+c` | Copy selection. | [E: packages/tui/src/keybindings.ts:146] |
| `tui.select.up` | `up` | Move selection up. | [E: packages/tui/src/keybindings.ts:147] |
| `tui.select.down` | `down` | Move selection down. | [E: packages/tui/src/keybindings.ts:148] |
| `tui.select.pageUp` | `pageUp` | Selection page up. | [E: packages/tui/src/keybindings.ts:149] |
| `tui.select.pageDown` | `pageDown` | Selection page down. | [E: packages/tui/src/keybindings.ts:150] [E: packages/tui/src/keybindings.ts:151] [E: packages/tui/src/keybindings.ts:152] |
| `tui.select.confirm` | `enter` | Confirm selection. | [E: packages/tui/src/keybindings.ts:154] |
| `tui.select.cancel` | `escape`, `ctrl+c` | Cancel selection. | [E: packages/tui/src/keybindings.ts:155] [E: packages/tui/src/keybindings.ts:156] [E: packages/tui/src/keybindings.ts:157] |

## TUI alternate-screen viewport defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.altScreen.pageUp` | `pageUp` | Scroll viewport up one page. | [E: packages/tui/src/keybindings.ts:160] [E: packages/tui/src/keybindings.ts:162] |
| `tui.altScreen.pageDown` | `pageDown` | Scroll viewport down one page. | [E: packages/tui/src/keybindings.ts:164] [E: packages/tui/src/keybindings.ts:166] |
| `tui.altScreen.halfPageUp` | none | Scroll viewport up half a page; default key array is empty。 | [E: packages/tui/src/keybindings.ts:168] [E: packages/tui/src/keybindings.ts:170] |
| `tui.altScreen.halfPageDown` | none | Scroll viewport down half a page; default key array is empty。 | [E: packages/tui/src/keybindings.ts:172] [E: packages/tui/src/keybindings.ts:174] |
| `tui.altScreen.lineUp` | none | Scroll viewport up one line; default key array is empty。 | [E: packages/tui/src/keybindings.ts:176] [E: packages/tui/src/keybindings.ts:178] |
| `tui.altScreen.lineDown` | none | Scroll viewport down one line; default key array is empty。 | [E: packages/tui/src/keybindings.ts:180] [E: packages/tui/src/keybindings.ts:182] |
| `tui.altScreen.previousPrompt` | TUI 包默认 `ctrl+shift+up`+`ctrl+up`;Windows/WSL 覆盖为仅 `ctrl+up` | Jump to previous semantic prompt. | TUI [E: packages/tui/src/keybindings.ts:184] [E: packages/tui/src/keybindings.ts:185]; override [E: packages/coding-agent/src/core/keybindings.ts:81] [E: packages/coding-agent/src/core/keybindings.ts:83]; docs [E: packages/coding-agent/docs/keybindings.md:112] |
| `tui.altScreen.nextPrompt` | TUI 包默认 `ctrl+shift+down`+`ctrl+down`;Windows/WSL 覆盖为仅 `ctrl+down` | Jump to next semantic prompt. | TUI [E: packages/tui/src/keybindings.ts:188] [E: packages/tui/src/keybindings.ts:189]; override [E: packages/coding-agent/src/core/keybindings.ts:85] [E: packages/coding-agent/src/core/keybindings.ts:87]; docs [E: packages/coding-agent/docs/keybindings.md:113] |
| `tui.altScreen.search` | TUI 包默认 `ctrl+shift+f`;Windows/WSL 覆盖为 `ctrl+f` | Search the primary scroll view. | TUI [E: packages/tui/src/keybindings.ts:192] [E: packages/tui/src/keybindings.ts:193]; override [E: packages/coding-agent/src/core/keybindings.ts:89] [E: packages/coding-agent/src/core/keybindings.ts:91]; docs [E: packages/coding-agent/docs/keybindings.md:114] |
| `tui.altScreen.searchNext` | `enter`, `ctrl+g` | Select the next search match. | [E: packages/tui/src/keybindings.ts:196] [E: packages/tui/src/keybindings.ts:198] |
| `tui.altScreen.searchPrevious` | `shift+enter`, `ctrl+shift+g` | Select the previous search match. | [E: packages/tui/src/keybindings.ts:200] [E: packages/tui/src/keybindings.ts:202] |
| `tui.altScreen.searchClose` | `escape` | Close transcript search. | [E: packages/tui/src/keybindings.ts:204] [E: packages/tui/src/keybindings.ts:206] |
| `tui.altScreen.top` | `home` | Scroll viewport to top. | [E: packages/tui/src/keybindings.ts:208] |
| `tui.altScreen.bottom` | `end` | Scroll viewport to bottom. | [E: packages/tui/src/keybindings.ts:209] |

这些默认键与 editor/select 的 `pageUp/pageDown/home/end` 有重叠；在 fullscreen 中 alt-screen listener 先于 focused component 匹配并消费对应 action，冲突结果由当前 renderer context 决定。[I]

## Coding-agent app defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `app.interrupt` | `escape` | Cancel or abort. | [E: packages/coding-agent/src/core/keybindings.ts:93] |
| `app.clear` | `ctrl+c` | Clear editor. | [E: packages/coding-agent/src/core/keybindings.ts:94] |
| `app.exit` | `ctrl+d` | Exit when editor is empty. | [E: packages/coding-agent/src/core/keybindings.ts:95] |
| `app.suspend` | non-Windows: `ctrl+z`; Windows: none | Suspend to background; default branches on `process.platform === "win32"`. | [E: packages/coding-agent/src/core/keybindings.ts:96] [E: packages/coding-agent/src/core/keybindings.ts:97] [E: packages/coding-agent/src/core/keybindings.ts:98] |
| `app.thinking.cycle` | `shift+tab` | Cycle thinking level. | [E: packages/coding-agent/src/core/keybindings.ts:100] [E: packages/coding-agent/src/core/keybindings.ts:101] [E: packages/coding-agent/src/core/keybindings.ts:102] |
| `app.thinking.save` | `ctrl+s` | Save thinking level. `/thinking` picker 用 `kb.matches(keyData, "app.thinking.save")` persist 当前选择。 | [E: packages/coding-agent/src/core/keybindings.ts:20] [E: packages/coding-agent/src/core/keybindings.ts:104] [E: packages/coding-agent/src/core/keybindings.ts:105] [E: packages/coding-agent/src/core/keybindings.ts:106]; consumer [E: packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:97] [E: packages/coding-agent/src/modes/interactive/components/thinking-selector.ts:131]; docs [E: packages/coding-agent/docs/keybindings.md:156] |
| `app.model.cycleForward` | `ctrl+p` | Cycle to next model. | [E: packages/coding-agent/src/core/keybindings.ts:108] [E: packages/coding-agent/src/core/keybindings.ts:109] [E: packages/coding-agent/src/core/keybindings.ts:110] |
| `app.model.cycleBackward` | Windows/WSL: `alt+p`;其它: `shift+ctrl+p` | Cycle to previous model. | [E: packages/coding-agent/src/core/keybindings.ts:112] [E: packages/coding-agent/src/core/keybindings.ts:113] [E: packages/coding-agent/docs/keybindings.md:153] |
| `app.model.select` | `ctrl+l` | Open model selector. | [E: packages/coding-agent/src/core/keybindings.ts:116] |
| `app.tools.expand` | `ctrl+o` | Toggle tool output. | [E: packages/coding-agent/src/core/keybindings.ts:117] |
| `app.thinking.toggle` | `ctrl+t` | Toggle thinking blocks. | [E: packages/coding-agent/src/core/keybindings.ts:118] [E: packages/coding-agent/src/core/keybindings.ts:119] [E: packages/coding-agent/src/core/keybindings.ts:120] |
| `app.session.toggleNamedFilter` | `ctrl+n` | Toggle named session filter. | [E: packages/coding-agent/src/core/keybindings.ts:122] [E: packages/coding-agent/src/core/keybindings.ts:123] [E: packages/coding-agent/src/core/keybindings.ts:124] |
| `app.editor.external` | `ctrl+g` | Open external editor. | [E: packages/coding-agent/src/core/keybindings.ts:126] [E: packages/coding-agent/src/core/keybindings.ts:127] [E: packages/coding-agent/src/core/keybindings.ts:128] |
| `app.message.copy` | `ctrl+x` | `/tree` 复制选中 message;否则复制最后一条 assistant text。fullscreen 且 `fullscreenCopyOnSelect` 关闭时,`preferSelection` 先复制当前 selection。 | [E: packages/coding-agent/src/core/keybindings.ts:130] [E: packages/coding-agent/src/core/keybindings.ts:131]; copy path [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2895] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6166] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6171]; docs [E: packages/coding-agent/docs/keybindings.md:164] |
| `app.message.followUp` | Windows/WSL: `ctrl+q`;其它: `alt+enter` | Queue follow-up message. | [E: packages/coding-agent/src/core/keybindings.ts:134] [E: packages/coding-agent/src/core/keybindings.ts:135] [E: packages/coding-agent/docs/keybindings.md:165] |
| `app.message.dequeue` | Windows/WSL: `alt+q`;其它: `alt+up` | Restore queued messages. | [E: packages/coding-agent/src/core/keybindings.ts:138] [E: packages/coding-agent/src/core/keybindings.ts:139] [E: packages/coding-agent/docs/keybindings.md:166] |
| `app.clipboard.pasteImage` | Windows/WSL: `alt+v`;其它: `ctrl+v` | Paste image from clipboard (text fallback);现用 `useWindowsKeybindings()`,不再只看 `win32`。 | [E: packages/coding-agent/src/core/keybindings.ts:142] [E: packages/coding-agent/src/core/keybindings.ts:143] [E: packages/coding-agent/docs/keybindings.md:130] |
| `app.session.new` | none | Start a new session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:146] |
| `app.session.tree` | none | Open session tree; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:147] |
| `app.session.fork` | none | Fork current session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:148] |
| `app.session.resume` | none | Resume a session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:149] |
| `app.tree.foldOrUp` | darwin: `alt+left`, `ctrl+left`; else `ctrl+left`, `alt+left` | Fold tree branch or move up. | [E: packages/coding-agent/src/core/keybindings.ts:150] [E: packages/coding-agent/src/core/keybindings.ts:151] [E: packages/coding-agent/src/core/keybindings.ts:152] |
| `app.tree.unfoldOrDown` | darwin: `alt+right`, `ctrl+right`; else `ctrl+right`, `alt+right` | Unfold tree branch or move down. | [E: packages/coding-agent/src/core/keybindings.ts:154] [E: packages/coding-agent/src/core/keybindings.ts:155] [E: packages/coding-agent/src/core/keybindings.ts:156] |
| `app.tree.editLabel` | `shift+l` | Edit tree label. | [E: packages/coding-agent/src/core/keybindings.ts:158] [E: packages/coding-agent/src/core/keybindings.ts:159] [E: packages/coding-agent/src/core/keybindings.ts:160] |
| `app.tree.toggleLabelTimestamp` | `shift+t` | Toggle tree label timestamps. | [E: packages/coding-agent/src/core/keybindings.ts:162] [E: packages/coding-agent/src/core/keybindings.ts:163] [E: packages/coding-agent/src/core/keybindings.ts:164] |
| `app.session.togglePath` | `ctrl+p` | Toggle session path display. | [E: packages/coding-agent/src/core/keybindings.ts:166] [E: packages/coding-agent/src/core/keybindings.ts:167] [E: packages/coding-agent/src/core/keybindings.ts:168] |
| `app.session.toggleSort` | `ctrl+s` | Toggle session sort mode. | [E: packages/coding-agent/src/core/keybindings.ts:170] [E: packages/coding-agent/src/core/keybindings.ts:171] [E: packages/coding-agent/src/core/keybindings.ts:172] |
| `app.session.rename` | `ctrl+r` | Rename session. | [E: packages/coding-agent/src/core/keybindings.ts:174] [E: packages/coding-agent/src/core/keybindings.ts:175] [E: packages/coding-agent/src/core/keybindings.ts:176] |
| `app.session.delete` | `ctrl+d` | Delete session. | [E: packages/coding-agent/src/core/keybindings.ts:178] [E: packages/coding-agent/src/core/keybindings.ts:179] [E: packages/coding-agent/src/core/keybindings.ts:180] |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | Delete session when query is empty. | [E: packages/coding-agent/src/core/keybindings.ts:182] [E: packages/coding-agent/src/core/keybindings.ts:183] [E: packages/coding-agent/src/core/keybindings.ts:184] |
| `app.models.save` | `ctrl+s` | `/model` picker 把当前选择写入启动默认。`/thinking` persist 走 `app.thinking.save`，不是这个 action id。 | [E: packages/coding-agent/src/core/keybindings.ts:186] [E: packages/coding-agent/src/core/keybindings.ts:188]; models picker [E: packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts:369]; docs [E: packages/coding-agent/docs/keybindings.md:154] |
| `app.models.enableAll` | `ctrl+a` | Enable all models. | [E: packages/coding-agent/src/core/keybindings.ts:190] [E: packages/coding-agent/src/core/keybindings.ts:191] [E: packages/coding-agent/src/core/keybindings.ts:192] |
| `app.models.clearAll` | `ctrl+x` | Clear all models. | [E: packages/coding-agent/src/core/keybindings.ts:194] [E: packages/coding-agent/src/core/keybindings.ts:195] [E: packages/coding-agent/src/core/keybindings.ts:196] |
| `app.models.toggleProvider` | `ctrl+p` | Toggle all models for provider. | [E: packages/coding-agent/src/core/keybindings.ts:198] [E: packages/coding-agent/src/core/keybindings.ts:199] [E: packages/coding-agent/src/core/keybindings.ts:200] |
| `app.models.reorderUp` | `alt+up` | Move model up in order. | [E: packages/coding-agent/src/core/keybindings.ts:202] [E: packages/coding-agent/src/core/keybindings.ts:203] [E: packages/coding-agent/src/core/keybindings.ts:204] |
| `app.models.reorderDown` | `alt+down` | Move model down in order. | [E: packages/coding-agent/src/core/keybindings.ts:206] [E: packages/coding-agent/src/core/keybindings.ts:207] [E: packages/coding-agent/src/core/keybindings.ts:208] |
| `app.tree.filter.default` | `ctrl+d` | Tree filter: default view. | [E: packages/coding-agent/src/core/keybindings.ts:210] [E: packages/coding-agent/src/core/keybindings.ts:211] [E: packages/coding-agent/src/core/keybindings.ts:212] |
| `app.tree.filter.noTools` | `ctrl+t` | Tree filter: hide tool results. | [E: packages/coding-agent/src/core/keybindings.ts:214] [E: packages/coding-agent/src/core/keybindings.ts:215] [E: packages/coding-agent/src/core/keybindings.ts:216] |
| `app.tree.filter.userOnly` | `ctrl+u` | Tree filter: user messages only. | [E: packages/coding-agent/src/core/keybindings.ts:218] [E: packages/coding-agent/src/core/keybindings.ts:219] [E: packages/coding-agent/src/core/keybindings.ts:220] |
| `app.tree.filter.labeledOnly` | `ctrl+l` | Tree filter: labeled entries only. | [E: packages/coding-agent/src/core/keybindings.ts:222] [E: packages/coding-agent/src/core/keybindings.ts:223] [E: packages/coding-agent/src/core/keybindings.ts:224] |
| `app.tree.filter.all` | `ctrl+a` | Tree filter: show all entries. | [E: packages/coding-agent/src/core/keybindings.ts:226] [E: packages/coding-agent/src/core/keybindings.ts:227] [E: packages/coding-agent/src/core/keybindings.ts:228] |
| `app.tree.filter.cycleForward` | `ctrl+o` | Tree filter: cycle forward. | [E: packages/coding-agent/src/core/keybindings.ts:230] [E: packages/coding-agent/src/core/keybindings.ts:231] [E: packages/coding-agent/src/core/keybindings.ts:232] |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | Tree filter: cycle backward. | [E: packages/coding-agent/src/core/keybindings.ts:234] [E: packages/coding-agent/src/core/keybindings.ts:235] [E: packages/coding-agent/src/core/keybindings.ts:236] |

## 配置与覆盖边界

`keybindings.json` 使用同一批 namespaced action ids;用户文档说明每个 action 可绑定一个或多个 keys,旧的 pre-namespaced ids 会在启动时迁移,编辑配置后运行 `/reload` 可应用变更 [E: packages/coding-agent/docs/keybindings.md:3] [E: packages/coding-agent/docs/keybindings.md:5] [E: packages/coding-agent/docs/keybindings.md:7] [E: packages/coding-agent/docs/keybindings.md:9]。本节点只列默认 catalog;用户配置语法、迁移和 reload 路径由 [surface.config.keybindings](../surface/config/keybindings.md) 与 [subsys.coding-agent.keybindings](../subsystems/coding-agent/keybindings.md) 详述 [I]。

多个 action 可以共享同一个默认 key chord,例如 `ctrl+p` 同时出现在 model cycling、session path display 和 scoped models provider toggling;是否冲突取决于当前 UI context 和 TUI manager 的匹配/dispatch 语义,不是本默认目录直接判定 [E: packages/coding-agent/src/core/keybindings.ts:108] [E: packages/coding-agent/src/core/keybindings.ts:109] [E: packages/coding-agent/src/core/keybindings.ts:166] [E: packages/coding-agent/src/core/keybindings.ts:167] [E: packages/coding-agent/src/core/keybindings.ts:198] [E: packages/coding-agent/src/core/keybindings.ts:199] [I]。

## Sources

- `packages/coding-agent/src/core/keybindings.ts`
- `packages/coding-agent/docs/keybindings.md`
- `packages/tui/src/keybindings.ts`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts`
- `packages/coding-agent/src/modes/interactive/components/thinking-selector.ts`

## 相关

- [surface.config.keybindings](../surface/config/keybindings.md): 用户可见的 `keybindings.json` 配置入口、key format、reload 和迁移语义。
- [subsys.coding-agent.keybindings](../subsystems/coding-agent/keybindings.md): `KEYBINDINGS` 组装、配置读取、legacy migration 和 coding-agent `KeybindingsManager` subclass。
