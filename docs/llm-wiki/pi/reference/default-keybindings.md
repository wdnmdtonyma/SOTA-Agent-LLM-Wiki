---
id: ref.coding-agent.default-keybindings
title: 默认键位目录(79)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/keybindings.ts
  - packages/coding-agent/docs/keybindings.md
  - packages/tui/src/keybindings.ts
symbols:
  - KEYBINDINGS
  - TUI_KEYBINDINGS
  - AppKeybindings
evidence: explicit
status: verified
updated: c1019d9202
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

`packages/coding-agent/src/core/keybindings.ts` 从 `@earendil-works/pi-tui` 导入 `TUI_KEYBINDINGS`,并导出 `KEYBINDINGS` [E: packages/coding-agent/src/core/keybindings.ts:6] [E: packages/coding-agent/src/core/keybindings.ts:64]。`KEYBINDINGS` 先展开 `TUI_KEYBINDINGS`,再追加 `app.*` actions,所以本 catalog 同时列出 TUI defaults 与 coding-agent app defaults [E: packages/coding-agent/src/core/keybindings.ts:65] [E: packages/coding-agent/src/core/keybindings.ts:66] [E: packages/coding-agent/src/core/keybindings.ts:207]。

`TUI_KEYBINDINGS` 当前包含 37 个 `tui.*` 实例，覆盖 editor、generic input、selection 和 6 个 alternate-screen viewport actions [E: packages/tui/src/keybindings.ts:61] [E: packages/tui/src/keybindings.ts:141] [E: packages/tui/src/keybindings.ts:158] [E: packages/tui/src/keybindings.ts:159]。`AppKeybindings` 仍声明 42 个 `app.*` action id，并通过 module augmentation 合并进 pi-tui 的 `Keybindings` interface [E: packages/coding-agent/src/core/keybindings.ts:13] [E: packages/coding-agent/src/core/keybindings.ts:26] [E: packages/coding-agent/src/core/keybindings.ts:55] [E: packages/coding-agent/src/core/keybindings.ts:60]。因此默认键位实例总数为 79 [I]。

当前源码没有导出旧 catalog 名 `DEFAULT_APP_KEYBINDINGS` 或 `DEFAULT_EDITOR_KEYBINDINGS`;index 与节点已统一到可核默认目录符号 `KEYBINDINGS`、`TUI_KEYBINDINGS` 和 `AppKeybindings` [E: packages/coding-agent/src/core/keybindings.ts:64] [E: packages/tui/src/keybindings.ts:61] [E: packages/coding-agent/src/core/keybindings.ts:13]。

## TUI editor defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.editor.cursorUp` | `up` | Move cursor up. | [E: packages/tui/src/keybindings.ts:62] |
| `tui.editor.cursorDown` | `down` | Move cursor down. | [E: packages/tui/src/keybindings.ts:63] |
| `tui.editor.cursorLeft` | `left`, `ctrl+b` | Move cursor left. | [E: packages/tui/src/keybindings.ts:64] [E: packages/tui/src/keybindings.ts:65] [E: packages/tui/src/keybindings.ts:66] |
| `tui.editor.cursorRight` | `right`, `ctrl+f` | Move cursor right. | [E: packages/tui/src/keybindings.ts:68] [E: packages/tui/src/keybindings.ts:69] [E: packages/tui/src/keybindings.ts:70] |
| `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | Move cursor word left. | [E: packages/tui/src/keybindings.ts:72] [E: packages/tui/src/keybindings.ts:73] [E: packages/tui/src/keybindings.ts:74] |
| `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | Move cursor word right. | [E: packages/tui/src/keybindings.ts:76] [E: packages/tui/src/keybindings.ts:77] [E: packages/tui/src/keybindings.ts:78] |
| `tui.editor.cursorLineStart` | `home`, `ctrl+a` | Move to line start. | [E: packages/tui/src/keybindings.ts:80] [E: packages/tui/src/keybindings.ts:81] [E: packages/tui/src/keybindings.ts:82] |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+e` | Move to line end. | [E: packages/tui/src/keybindings.ts:84] [E: packages/tui/src/keybindings.ts:85] [E: packages/tui/src/keybindings.ts:86] |
| `tui.editor.jumpForward` | `ctrl+]` | Jump forward to character. | [E: packages/tui/src/keybindings.ts:88] [E: packages/tui/src/keybindings.ts:89] [E: packages/tui/src/keybindings.ts:90] |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | Jump backward to character. | [E: packages/tui/src/keybindings.ts:92] [E: packages/tui/src/keybindings.ts:93] [E: packages/tui/src/keybindings.ts:94] |
| `tui.editor.pageUp` | `pageUp` | Page up. | [E: packages/tui/src/keybindings.ts:96] |
| `tui.editor.pageDown` | `pageDown` | Page down. | [E: packages/tui/src/keybindings.ts:97] |
| `tui.editor.deleteCharBackward` | `backspace` | Delete character backward. | [E: packages/tui/src/keybindings.ts:98] [E: packages/tui/src/keybindings.ts:99] [E: packages/tui/src/keybindings.ts:100] |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | Delete character forward. | [E: packages/tui/src/keybindings.ts:102] [E: packages/tui/src/keybindings.ts:103] [E: packages/tui/src/keybindings.ts:104] |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | Delete word backward. | [E: packages/tui/src/keybindings.ts:106] [E: packages/tui/src/keybindings.ts:107] [E: packages/tui/src/keybindings.ts:108] |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | Delete word forward. | [E: packages/tui/src/keybindings.ts:110] [E: packages/tui/src/keybindings.ts:111] [E: packages/tui/src/keybindings.ts:112] |
| `tui.editor.deleteToLineStart` | `ctrl+u` | Delete to line start. | [E: packages/tui/src/keybindings.ts:114] [E: packages/tui/src/keybindings.ts:115] [E: packages/tui/src/keybindings.ts:116] |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | Delete to line end. | [E: packages/tui/src/keybindings.ts:118] [E: packages/tui/src/keybindings.ts:119] [E: packages/tui/src/keybindings.ts:120] |
| `tui.editor.yank` | `ctrl+y` | Yank. | [E: packages/tui/src/keybindings.ts:122] |
| `tui.editor.yankPop` | `alt+y` | Yank pop. | [E: packages/tui/src/keybindings.ts:123] |
| `tui.editor.undo` | `ctrl+-` | Undo. | [E: packages/tui/src/keybindings.ts:124] |

## TUI input and selection defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.input.newLine` | `shift+enter`, `ctrl+j` | Insert newline. | [E: packages/tui/src/keybindings.ts:125] |
| `tui.input.submit` | `enter` | Submit input. | [E: packages/tui/src/keybindings.ts:126] |
| `tui.input.tab` | `tab` | Tab / autocomplete. | [E: packages/tui/src/keybindings.ts:127] |
| `tui.input.copy` | `ctrl+c` | Copy selection. | [E: packages/tui/src/keybindings.ts:128] |
| `tui.select.up` | `up` | Move selection up. | [E: packages/tui/src/keybindings.ts:129] |
| `tui.select.down` | `down` | Move selection down. | [E: packages/tui/src/keybindings.ts:130] |
| `tui.select.pageUp` | `pageUp` | Selection page up. | [E: packages/tui/src/keybindings.ts:131] |
| `tui.select.pageDown` | `pageDown` | Selection page down. | [E: packages/tui/src/keybindings.ts:132] [E: packages/tui/src/keybindings.ts:133] [E: packages/tui/src/keybindings.ts:134] |
| `tui.select.confirm` | `enter` | Confirm selection. | [E: packages/tui/src/keybindings.ts:136] |
| `tui.select.cancel` | `escape`, `ctrl+c` | Cancel selection. | [E: packages/tui/src/keybindings.ts:137] [E: packages/tui/src/keybindings.ts:138] [E: packages/tui/src/keybindings.ts:139] |

## TUI alternate-screen viewport defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.altScreen.pageUp` | `pageUp` | Scroll fullscreen viewport up one page. | [E: packages/tui/src/keybindings.ts:141] [E: packages/tui/src/keybindings.ts:142] |
| `tui.altScreen.pageDown` | `pageDown` | Scroll fullscreen viewport down one page. | [E: packages/tui/src/keybindings.ts:145] [E: packages/tui/src/keybindings.ts:146] |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up` | Jump to previous semantic message marker. | [E: packages/tui/src/keybindings.ts:149] [E: packages/tui/src/keybindings.ts:150] |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down` | Jump to next semantic message marker. | [E: packages/tui/src/keybindings.ts:153] [E: packages/tui/src/keybindings.ts:154] |
| `tui.altScreen.top` | `home` | Scroll fullscreen viewport to top. | [E: packages/tui/src/keybindings.ts:157] |
| `tui.altScreen.bottom` | `end` | Scroll fullscreen viewport to bottom. | [E: packages/tui/src/keybindings.ts:158] |

这些默认键与 editor/select 的 `pageUp/pageDown/home/end` 有重叠；在 fullscreen 中 alt-screen listener 先于 focused component 匹配并消费对应 action，冲突结果由当前 renderer context 决定。[I]

## Coding-agent app defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `app.interrupt` | `escape` | Cancel or abort. | [E: packages/coding-agent/src/core/keybindings.ts:66] |
| `app.clear` | `ctrl+c` | Clear editor. | [E: packages/coding-agent/src/core/keybindings.ts:67] |
| `app.exit` | `ctrl+d` | Exit when editor is empty. | [E: packages/coding-agent/src/core/keybindings.ts:68] |
| `app.suspend` | non-Windows: `ctrl+z`; Windows: none | Suspend to background; default branches on `process.platform === "win32"`. | [E: packages/coding-agent/src/core/keybindings.ts:69] [E: packages/coding-agent/src/core/keybindings.ts:70] [E: packages/coding-agent/src/core/keybindings.ts:71] |
| `app.thinking.cycle` | `shift+tab` | Cycle thinking level. | [E: packages/coding-agent/src/core/keybindings.ts:73] [E: packages/coding-agent/src/core/keybindings.ts:74] [E: packages/coding-agent/src/core/keybindings.ts:75] |
| `app.model.cycleForward` | `ctrl+p` | Cycle to next model. | [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:78] [E: packages/coding-agent/src/core/keybindings.ts:79] |
| `app.model.cycleBackward` | `shift+ctrl+p` | Cycle to previous model. | [E: packages/coding-agent/src/core/keybindings.ts:81] [E: packages/coding-agent/src/core/keybindings.ts:82] [E: packages/coding-agent/src/core/keybindings.ts:83] |
| `app.model.select` | `ctrl+l` | Open model selector. | [E: packages/coding-agent/src/core/keybindings.ts:85] |
| `app.tools.expand` | `ctrl+o` | Toggle tool output. | [E: packages/coding-agent/src/core/keybindings.ts:86] |
| `app.thinking.toggle` | `ctrl+t` | Toggle thinking blocks. | [E: packages/coding-agent/src/core/keybindings.ts:87] [E: packages/coding-agent/src/core/keybindings.ts:88] [E: packages/coding-agent/src/core/keybindings.ts:89] |
| `app.session.toggleNamedFilter` | `ctrl+n` | Toggle named session filter. | [E: packages/coding-agent/src/core/keybindings.ts:91] [E: packages/coding-agent/src/core/keybindings.ts:92] [E: packages/coding-agent/src/core/keybindings.ts:93] |
| `app.editor.external` | `ctrl+g` | Open external editor. | [E: packages/coding-agent/src/core/keybindings.ts:95] [E: packages/coding-agent/src/core/keybindings.ts:96] [E: packages/coding-agent/src/core/keybindings.ts:97] |
| `app.message.copy` | `ctrl+x` | Copy the selected message to the clipboard. | [E: packages/coding-agent/src/core/keybindings.ts:99] [E: packages/coding-agent/src/core/keybindings.ts:100] [E: packages/coding-agent/src/core/keybindings.ts:101] |
| `app.message.followUp` | `alt+enter` | Queue follow-up message. | [E: packages/coding-agent/src/core/keybindings.ts:103] [E: packages/coding-agent/src/core/keybindings.ts:104] [E: packages/coding-agent/src/core/keybindings.ts:105] |
| `app.message.dequeue` | `alt+up` | Restore queued messages. | [E: packages/coding-agent/src/core/keybindings.ts:107] [E: packages/coding-agent/src/core/keybindings.ts:108] [E: packages/coding-agent/src/core/keybindings.ts:109] |
| `app.clipboard.pasteImage` | non-Windows: `ctrl+v`; Windows: `alt+v` | Paste image from clipboard; default branches on `process.platform === "win32"`. | [E: packages/coding-agent/src/core/keybindings.ts:111] [E: packages/coding-agent/src/core/keybindings.ts:112] [E: packages/coding-agent/src/core/keybindings.ts:108] |
| `app.session.new` | none | Start a new session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:115] |
| `app.session.tree` | none | Open session tree; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:116] |
| `app.session.fork` | none | Fork current session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:117] |
| `app.session.resume` | none | Resume a session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:118] |
| `app.tree.foldOrUp` | `ctrl+left`, `alt+left` | Fold tree branch or move up. | [E: packages/coding-agent/src/core/keybindings.ts:119] [E: packages/coding-agent/src/core/keybindings.ts:115] [E: packages/coding-agent/src/core/keybindings.ts:121] |
| `app.tree.unfoldOrDown` | `ctrl+right`, `alt+right` | Unfold tree branch or move down. | [E: packages/coding-agent/src/core/keybindings.ts:123] [E: packages/coding-agent/src/core/keybindings.ts:119] [E: packages/coding-agent/src/core/keybindings.ts:125] |
| `app.tree.editLabel` | `shift+l` | Edit tree label. | [E: packages/coding-agent/src/core/keybindings.ts:127] [E: packages/coding-agent/src/core/keybindings.ts:128] [E: packages/coding-agent/src/core/keybindings.ts:129] |
| `app.tree.toggleLabelTimestamp` | `shift+t` | Toggle tree label timestamps. | [E: packages/coding-agent/src/core/keybindings.ts:131] [E: packages/coding-agent/src/core/keybindings.ts:132] [E: packages/coding-agent/src/core/keybindings.ts:133] |
| `app.session.togglePath` | `ctrl+p` | Toggle session path display. | [E: packages/coding-agent/src/core/keybindings.ts:135] [E: packages/coding-agent/src/core/keybindings.ts:136] [E: packages/coding-agent/src/core/keybindings.ts:137] |
| `app.session.toggleSort` | `ctrl+s` | Toggle session sort mode. | [E: packages/coding-agent/src/core/keybindings.ts:139] [E: packages/coding-agent/src/core/keybindings.ts:140] [E: packages/coding-agent/src/core/keybindings.ts:141] |
| `app.session.rename` | `ctrl+r` | Rename session. | [E: packages/coding-agent/src/core/keybindings.ts:143] [E: packages/coding-agent/src/core/keybindings.ts:144] [E: packages/coding-agent/src/core/keybindings.ts:145] |
| `app.session.delete` | `ctrl+d` | Delete session. | [E: packages/coding-agent/src/core/keybindings.ts:147] [E: packages/coding-agent/src/core/keybindings.ts:148] [E: packages/coding-agent/src/core/keybindings.ts:149] |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | Delete session when query is empty. | [E: packages/coding-agent/src/core/keybindings.ts:151] [E: packages/coding-agent/src/core/keybindings.ts:152] [E: packages/coding-agent/src/core/keybindings.ts:153] |
| `app.models.save` | `ctrl+s` | Save model selection. | [E: packages/coding-agent/src/core/keybindings.ts:155] [E: packages/coding-agent/src/core/keybindings.ts:156] [E: packages/coding-agent/src/core/keybindings.ts:157] |
| `app.models.enableAll` | `ctrl+a` | Enable all models. | [E: packages/coding-agent/src/core/keybindings.ts:159] [E: packages/coding-agent/src/core/keybindings.ts:160] [E: packages/coding-agent/src/core/keybindings.ts:161] |
| `app.models.clearAll` | `ctrl+x` | Clear all models. | [E: packages/coding-agent/src/core/keybindings.ts:163] [E: packages/coding-agent/src/core/keybindings.ts:164] [E: packages/coding-agent/src/core/keybindings.ts:165] |
| `app.models.toggleProvider` | `ctrl+p` | Toggle all models for provider. | [E: packages/coding-agent/src/core/keybindings.ts:167] [E: packages/coding-agent/src/core/keybindings.ts:168] [E: packages/coding-agent/src/core/keybindings.ts:169] |
| `app.models.reorderUp` | `alt+up` | Move model up in order. | [E: packages/coding-agent/src/core/keybindings.ts:171] [E: packages/coding-agent/src/core/keybindings.ts:172] [E: packages/coding-agent/src/core/keybindings.ts:173] |
| `app.models.reorderDown` | `alt+down` | Move model down in order. | [E: packages/coding-agent/src/core/keybindings.ts:175] [E: packages/coding-agent/src/core/keybindings.ts:176] [E: packages/coding-agent/src/core/keybindings.ts:177] |
| `app.tree.filter.default` | `ctrl+d` | Tree filter: default view. | [E: packages/coding-agent/src/core/keybindings.ts:179] [E: packages/coding-agent/src/core/keybindings.ts:180] [E: packages/coding-agent/src/core/keybindings.ts:181] |
| `app.tree.filter.noTools` | `ctrl+t` | Tree filter: hide tool results. | [E: packages/coding-agent/src/core/keybindings.ts:183] [E: packages/coding-agent/src/core/keybindings.ts:184] [E: packages/coding-agent/src/core/keybindings.ts:185] |
| `app.tree.filter.userOnly` | `ctrl+u` | Tree filter: user messages only. | [E: packages/coding-agent/src/core/keybindings.ts:187] [E: packages/coding-agent/src/core/keybindings.ts:188] [E: packages/coding-agent/src/core/keybindings.ts:189] |
| `app.tree.filter.labeledOnly` | `ctrl+l` | Tree filter: labeled entries only. | [E: packages/coding-agent/src/core/keybindings.ts:191] [E: packages/coding-agent/src/core/keybindings.ts:192] [E: packages/coding-agent/src/core/keybindings.ts:193] |
| `app.tree.filter.all` | `ctrl+a` | Tree filter: show all entries. | [E: packages/coding-agent/src/core/keybindings.ts:195] [E: packages/coding-agent/src/core/keybindings.ts:196] [E: packages/coding-agent/src/core/keybindings.ts:197] |
| `app.tree.filter.cycleForward` | `ctrl+o` | Tree filter: cycle forward. | [E: packages/coding-agent/src/core/keybindings.ts:199] [E: packages/coding-agent/src/core/keybindings.ts:200] [E: packages/coding-agent/src/core/keybindings.ts:201] |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | Tree filter: cycle backward. | [E: packages/coding-agent/src/core/keybindings.ts:203] [E: packages/coding-agent/src/core/keybindings.ts:204] [E: packages/coding-agent/src/core/keybindings.ts:205] |

## 配置与覆盖边界

`keybindings.json` 使用同一批 namespaced action ids;用户文档说明每个 action 可绑定一个或多个 keys,旧的 pre-namespaced ids 会在启动时迁移,编辑配置后运行 `/reload` 可应用变更 [E: packages/coding-agent/docs/keybindings.md:3] [E: packages/coding-agent/docs/keybindings.md:5] [E: packages/coding-agent/docs/keybindings.md:7] [E: packages/coding-agent/docs/keybindings.md:9]。本节点只列默认 catalog;用户配置语法、迁移和 reload 路径由 [surface.config.keybindings](../surface/config/keybindings.md) 与 [subsys.coding-agent.keybindings](../subsystems/coding-agent/keybindings.md) 详述 [I]。

多个 action 可以共享同一个默认 key chord,例如 `ctrl+p` 同时出现在 model cycling、session path display 和 scoped models provider toggling;是否冲突取决于当前 UI context 和 TUI manager 的匹配/dispatch 语义,不是本默认目录直接判定 [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:78] [E: packages/coding-agent/src/core/keybindings.ts:135] [E: packages/coding-agent/src/core/keybindings.ts:136] [E: packages/coding-agent/src/core/keybindings.ts:167] [E: packages/coding-agent/src/core/keybindings.ts:168] [I]。

## Sources

- `packages/coding-agent/src/core/keybindings.ts`
- `packages/coding-agent/docs/keybindings.md`
- `packages/tui/src/keybindings.ts`

## 相关

- [surface.config.keybindings](../surface/config/keybindings.md): 用户可见的 `keybindings.json` 配置入口、key format、reload 和迁移语义。
- [subsys.coding-agent.keybindings](../subsystems/coding-agent/keybindings.md): `KEYBINDINGS` 组装、配置读取、legacy migration 和 coding-agent `KeybindingsManager` subclass。
