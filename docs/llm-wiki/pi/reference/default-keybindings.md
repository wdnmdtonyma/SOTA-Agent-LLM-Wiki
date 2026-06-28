---
id: ref.coding-agent.default-keybindings
title: 默认键位目录(72)
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
updated: 5a073885
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
- index 里的 `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 是否还是当前源码符号?

## Catalog 口径

`packages/coding-agent/src/core/keybindings.ts` 从 `@earendil-works/pi-tui` 导入 `TUI_KEYBINDINGS`,并导出 `KEYBINDINGS` [E: packages/coding-agent/src/core/keybindings.ts:6] [E: packages/coding-agent/src/core/keybindings.ts:63]。`KEYBINDINGS` 先展开 `TUI_KEYBINDINGS`,再追加 `app.*` actions,所以本 catalog 同时列出 TUI defaults 与 coding-agent app defaults [E: packages/coding-agent/src/core/keybindings.ts:64] [E: packages/coding-agent/src/core/keybindings.ts:65] [E: packages/coding-agent/src/core/keybindings.ts:202]。

`TUI_KEYBINDINGS` 当前包含 31 个 `tui.*` 实例,覆盖 editor、generic input 和 selection actions [E: packages/tui/src/keybindings.ts:54] [E: packages/tui/src/keybindings.ts:134]。`AppKeybindings` 当前声明 41 个 `app.*` action id,并通过 module augmentation 合并进 pi-tui 的 `Keybindings` interface [E: packages/coding-agent/src/core/keybindings.ts:13] [E: packages/coding-agent/src/core/keybindings.ts:54] [E: packages/coding-agent/src/core/keybindings.ts:59]。因此当前默认键位实例数是 72,而 `index.json` 的 `group.keybindings.instance_count` 仍写 55 [U]。

当前源码没有导出 `DEFAULT_APP_KEYBINDINGS` 或 `DEFAULT_EDITOR_KEYBINDINGS`;当前可核默认目录符号是 `KEYBINDINGS`、`TUI_KEYBINDINGS` 和 `AppKeybindings` [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/tui/src/keybindings.ts:54] [E: packages/coding-agent/src/core/keybindings.ts:13] [U]。

## TUI editor defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.editor.cursorUp` | `up` | Move cursor up. | [E: packages/tui/src/keybindings.ts:55] |
| `tui.editor.cursorDown` | `down` | Move cursor down. | [E: packages/tui/src/keybindings.ts:56] |
| `tui.editor.cursorLeft` | `left`, `ctrl+b` | Move cursor left. | [E: packages/tui/src/keybindings.ts:57] [E: packages/tui/src/keybindings.ts:58] [E: packages/tui/src/keybindings.ts:59] |
| `tui.editor.cursorRight` | `right`, `ctrl+f` | Move cursor right. | [E: packages/tui/src/keybindings.ts:61] [E: packages/tui/src/keybindings.ts:62] [E: packages/tui/src/keybindings.ts:63] |
| `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | Move cursor word left. | [E: packages/tui/src/keybindings.ts:65] [E: packages/tui/src/keybindings.ts:66] [E: packages/tui/src/keybindings.ts:67] |
| `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | Move cursor word right. | [E: packages/tui/src/keybindings.ts:69] [E: packages/tui/src/keybindings.ts:70] [E: packages/tui/src/keybindings.ts:71] |
| `tui.editor.cursorLineStart` | `home`, `ctrl+a` | Move to line start. | [E: packages/tui/src/keybindings.ts:73] [E: packages/tui/src/keybindings.ts:74] [E: packages/tui/src/keybindings.ts:75] |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+e` | Move to line end. | [E: packages/tui/src/keybindings.ts:77] [E: packages/tui/src/keybindings.ts:78] [E: packages/tui/src/keybindings.ts:79] |
| `tui.editor.jumpForward` | `ctrl+]` | Jump forward to character. | [E: packages/tui/src/keybindings.ts:81] [E: packages/tui/src/keybindings.ts:82] [E: packages/tui/src/keybindings.ts:83] |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | Jump backward to character. | [E: packages/tui/src/keybindings.ts:85] [E: packages/tui/src/keybindings.ts:86] [E: packages/tui/src/keybindings.ts:87] |
| `tui.editor.pageUp` | `pageUp` | Page up. | [E: packages/tui/src/keybindings.ts:89] |
| `tui.editor.pageDown` | `pageDown` | Page down. | [E: packages/tui/src/keybindings.ts:90] |
| `tui.editor.deleteCharBackward` | `backspace` | Delete character backward. | [E: packages/tui/src/keybindings.ts:91] [E: packages/tui/src/keybindings.ts:92] [E: packages/tui/src/keybindings.ts:93] |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | Delete character forward. | [E: packages/tui/src/keybindings.ts:95] [E: packages/tui/src/keybindings.ts:96] [E: packages/tui/src/keybindings.ts:97] |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | Delete word backward. | [E: packages/tui/src/keybindings.ts:99] [E: packages/tui/src/keybindings.ts:100] [E: packages/tui/src/keybindings.ts:101] |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | Delete word forward. | [E: packages/tui/src/keybindings.ts:103] [E: packages/tui/src/keybindings.ts:104] [E: packages/tui/src/keybindings.ts:105] |
| `tui.editor.deleteToLineStart` | `ctrl+u` | Delete to line start. | [E: packages/tui/src/keybindings.ts:107] [E: packages/tui/src/keybindings.ts:108] [E: packages/tui/src/keybindings.ts:109] |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | Delete to line end. | [E: packages/tui/src/keybindings.ts:111] [E: packages/tui/src/keybindings.ts:112] [E: packages/tui/src/keybindings.ts:113] |
| `tui.editor.yank` | `ctrl+y` | Yank. | [E: packages/tui/src/keybindings.ts:115] |
| `tui.editor.yankPop` | `alt+y` | Yank pop. | [E: packages/tui/src/keybindings.ts:116] |
| `tui.editor.undo` | `ctrl+-` | Undo. | [E: packages/tui/src/keybindings.ts:117] |

## TUI input and selection defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `tui.input.newLine` | `shift+enter`, `ctrl+j` | Insert newline. | [E: packages/tui/src/keybindings.ts:118] |
| `tui.input.submit` | `enter` | Submit input. | [E: packages/tui/src/keybindings.ts:119] |
| `tui.input.tab` | `tab` | Tab / autocomplete. | [E: packages/tui/src/keybindings.ts:120] |
| `tui.input.copy` | `ctrl+c` | Copy selection. | [E: packages/tui/src/keybindings.ts:121] |
| `tui.select.up` | `up` | Move selection up. | [E: packages/tui/src/keybindings.ts:122] |
| `tui.select.down` | `down` | Move selection down. | [E: packages/tui/src/keybindings.ts:123] |
| `tui.select.pageUp` | `pageUp` | Selection page up. | [E: packages/tui/src/keybindings.ts:124] |
| `tui.select.pageDown` | `pageDown` | Selection page down. | [E: packages/tui/src/keybindings.ts:125] [E: packages/tui/src/keybindings.ts:126] [E: packages/tui/src/keybindings.ts:127] |
| `tui.select.confirm` | `enter` | Confirm selection. | [E: packages/tui/src/keybindings.ts:129] |
| `tui.select.cancel` | `escape`, `ctrl+c` | Cancel selection. | [E: packages/tui/src/keybindings.ts:130] [E: packages/tui/src/keybindings.ts:131] [E: packages/tui/src/keybindings.ts:132] |

## Coding-agent app defaults

| action id | default keys | 含义 / why | 源码证据 |
| --- | --- | --- | --- |
| `app.interrupt` | `escape` | Cancel or abort. | [E: packages/coding-agent/src/core/keybindings.ts:65] |
| `app.clear` | `ctrl+c` | Clear editor. | [E: packages/coding-agent/src/core/keybindings.ts:66] |
| `app.exit` | `ctrl+d` | Exit when editor is empty. | [E: packages/coding-agent/src/core/keybindings.ts:67] |
| `app.suspend` | non-Windows: `ctrl+z`; Windows: none | Suspend to background; default branches on `process.platform === "win32"`. | [E: packages/coding-agent/src/core/keybindings.ts:68] [E: packages/coding-agent/src/core/keybindings.ts:69] [E: packages/coding-agent/src/core/keybindings.ts:70] |
| `app.thinking.cycle` | `shift+tab` | Cycle thinking level. | [E: packages/coding-agent/src/core/keybindings.ts:72] [E: packages/coding-agent/src/core/keybindings.ts:73] [E: packages/coding-agent/src/core/keybindings.ts:74] |
| `app.model.cycleForward` | `ctrl+p` | Cycle to next model. | [E: packages/coding-agent/src/core/keybindings.ts:76] [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:78] |
| `app.model.cycleBackward` | `shift+ctrl+p` | Cycle to previous model. | [E: packages/coding-agent/src/core/keybindings.ts:80] [E: packages/coding-agent/src/core/keybindings.ts:81] [E: packages/coding-agent/src/core/keybindings.ts:82] |
| `app.model.select` | `ctrl+l` | Open model selector. | [E: packages/coding-agent/src/core/keybindings.ts:84] |
| `app.tools.expand` | `ctrl+o` | Toggle tool output. | [E: packages/coding-agent/src/core/keybindings.ts:85] |
| `app.thinking.toggle` | `ctrl+t` | Toggle thinking blocks. | [E: packages/coding-agent/src/core/keybindings.ts:86] [E: packages/coding-agent/src/core/keybindings.ts:87] [E: packages/coding-agent/src/core/keybindings.ts:88] |
| `app.session.toggleNamedFilter` | `ctrl+n` | Toggle named session filter. | [E: packages/coding-agent/src/core/keybindings.ts:90] [E: packages/coding-agent/src/core/keybindings.ts:91] [E: packages/coding-agent/src/core/keybindings.ts:92] |
| `app.editor.external` | `ctrl+g` | Open external editor. | [E: packages/coding-agent/src/core/keybindings.ts:94] [E: packages/coding-agent/src/core/keybindings.ts:95] [E: packages/coding-agent/src/core/keybindings.ts:96] |
| `app.message.followUp` | `alt+enter` | Queue follow-up message. | [E: packages/coding-agent/src/core/keybindings.ts:98] [E: packages/coding-agent/src/core/keybindings.ts:99] [E: packages/coding-agent/src/core/keybindings.ts:100] |
| `app.message.dequeue` | `alt+up` | Restore queued messages. | [E: packages/coding-agent/src/core/keybindings.ts:102] [E: packages/coding-agent/src/core/keybindings.ts:103] [E: packages/coding-agent/src/core/keybindings.ts:104] |
| `app.clipboard.pasteImage` | non-Windows: `ctrl+v`; Windows: `alt+v` | Paste image from clipboard; default branches on `process.platform === "win32"`. | [E: packages/coding-agent/src/core/keybindings.ts:106] [E: packages/coding-agent/src/core/keybindings.ts:107] [E: packages/coding-agent/src/core/keybindings.ts:108] |
| `app.session.new` | none | Start a new session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:110] |
| `app.session.tree` | none | Open session tree; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:111] |
| `app.session.fork` | none | Fork current session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:112] |
| `app.session.resume` | none | Resume a session; represented as an empty default key array. | [E: packages/coding-agent/src/core/keybindings.ts:113] |
| `app.tree.foldOrUp` | `ctrl+left`, `alt+left` | Fold tree branch or move up. | [E: packages/coding-agent/src/core/keybindings.ts:114] [E: packages/coding-agent/src/core/keybindings.ts:115] [E: packages/coding-agent/src/core/keybindings.ts:116] |
| `app.tree.unfoldOrDown` | `ctrl+right`, `alt+right` | Unfold tree branch or move down. | [E: packages/coding-agent/src/core/keybindings.ts:118] [E: packages/coding-agent/src/core/keybindings.ts:119] [E: packages/coding-agent/src/core/keybindings.ts:120] |
| `app.tree.editLabel` | `shift+l` | Edit tree label. | [E: packages/coding-agent/src/core/keybindings.ts:122] [E: packages/coding-agent/src/core/keybindings.ts:123] [E: packages/coding-agent/src/core/keybindings.ts:124] |
| `app.tree.toggleLabelTimestamp` | `shift+t` | Toggle tree label timestamps. | [E: packages/coding-agent/src/core/keybindings.ts:126] [E: packages/coding-agent/src/core/keybindings.ts:127] [E: packages/coding-agent/src/core/keybindings.ts:128] |
| `app.session.togglePath` | `ctrl+p` | Toggle session path display. | [E: packages/coding-agent/src/core/keybindings.ts:130] [E: packages/coding-agent/src/core/keybindings.ts:131] [E: packages/coding-agent/src/core/keybindings.ts:132] |
| `app.session.toggleSort` | `ctrl+s` | Toggle session sort mode. | [E: packages/coding-agent/src/core/keybindings.ts:134] [E: packages/coding-agent/src/core/keybindings.ts:135] [E: packages/coding-agent/src/core/keybindings.ts:136] |
| `app.session.rename` | `ctrl+r` | Rename session. | [E: packages/coding-agent/src/core/keybindings.ts:138] [E: packages/coding-agent/src/core/keybindings.ts:139] [E: packages/coding-agent/src/core/keybindings.ts:140] |
| `app.session.delete` | `ctrl+d` | Delete session. | [E: packages/coding-agent/src/core/keybindings.ts:142] [E: packages/coding-agent/src/core/keybindings.ts:143] [E: packages/coding-agent/src/core/keybindings.ts:144] |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | Delete session when query is empty. | [E: packages/coding-agent/src/core/keybindings.ts:146] [E: packages/coding-agent/src/core/keybindings.ts:147] [E: packages/coding-agent/src/core/keybindings.ts:148] |
| `app.models.save` | `ctrl+s` | Save model selection. | [E: packages/coding-agent/src/core/keybindings.ts:150] [E: packages/coding-agent/src/core/keybindings.ts:151] [E: packages/coding-agent/src/core/keybindings.ts:152] |
| `app.models.enableAll` | `ctrl+a` | Enable all models. | [E: packages/coding-agent/src/core/keybindings.ts:154] [E: packages/coding-agent/src/core/keybindings.ts:155] [E: packages/coding-agent/src/core/keybindings.ts:156] |
| `app.models.clearAll` | `ctrl+x` | Clear all models. | [E: packages/coding-agent/src/core/keybindings.ts:158] [E: packages/coding-agent/src/core/keybindings.ts:159] [E: packages/coding-agent/src/core/keybindings.ts:160] |
| `app.models.toggleProvider` | `ctrl+p` | Toggle all models for provider. | [E: packages/coding-agent/src/core/keybindings.ts:162] [E: packages/coding-agent/src/core/keybindings.ts:163] [E: packages/coding-agent/src/core/keybindings.ts:164] |
| `app.models.reorderUp` | `alt+up` | Move model up in order. | [E: packages/coding-agent/src/core/keybindings.ts:166] [E: packages/coding-agent/src/core/keybindings.ts:167] [E: packages/coding-agent/src/core/keybindings.ts:168] |
| `app.models.reorderDown` | `alt+down` | Move model down in order. | [E: packages/coding-agent/src/core/keybindings.ts:170] [E: packages/coding-agent/src/core/keybindings.ts:171] [E: packages/coding-agent/src/core/keybindings.ts:172] |
| `app.tree.filter.default` | `ctrl+d` | Tree filter: default view. | [E: packages/coding-agent/src/core/keybindings.ts:174] [E: packages/coding-agent/src/core/keybindings.ts:175] [E: packages/coding-agent/src/core/keybindings.ts:176] |
| `app.tree.filter.noTools` | `ctrl+t` | Tree filter: hide tool results. | [E: packages/coding-agent/src/core/keybindings.ts:178] [E: packages/coding-agent/src/core/keybindings.ts:179] [E: packages/coding-agent/src/core/keybindings.ts:180] |
| `app.tree.filter.userOnly` | `ctrl+u` | Tree filter: user messages only. | [E: packages/coding-agent/src/core/keybindings.ts:182] [E: packages/coding-agent/src/core/keybindings.ts:183] [E: packages/coding-agent/src/core/keybindings.ts:184] |
| `app.tree.filter.labeledOnly` | `ctrl+l` | Tree filter: labeled entries only. | [E: packages/coding-agent/src/core/keybindings.ts:186] [E: packages/coding-agent/src/core/keybindings.ts:187] [E: packages/coding-agent/src/core/keybindings.ts:188] |
| `app.tree.filter.all` | `ctrl+a` | Tree filter: show all entries. | [E: packages/coding-agent/src/core/keybindings.ts:190] [E: packages/coding-agent/src/core/keybindings.ts:191] [E: packages/coding-agent/src/core/keybindings.ts:192] |
| `app.tree.filter.cycleForward` | `ctrl+o` | Tree filter: cycle forward. | [E: packages/coding-agent/src/core/keybindings.ts:194] [E: packages/coding-agent/src/core/keybindings.ts:195] [E: packages/coding-agent/src/core/keybindings.ts:196] |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | Tree filter: cycle backward. | [E: packages/coding-agent/src/core/keybindings.ts:198] [E: packages/coding-agent/src/core/keybindings.ts:199] [E: packages/coding-agent/src/core/keybindings.ts:200] |

## 配置与覆盖边界

`keybindings.json` 使用同一批 namespaced action ids;用户文档说明每个 action 可绑定一个或多个 keys,旧的 pre-namespaced ids 会在启动时迁移,编辑配置后运行 `/reload` 可应用变更 [E: packages/coding-agent/docs/keybindings.md:3] [E: packages/coding-agent/docs/keybindings.md:5] [E: packages/coding-agent/docs/keybindings.md:7] [E: packages/coding-agent/docs/keybindings.md:9]。本节点只列默认 catalog;用户配置语法、迁移和 reload 路径由 [surface.config.keybindings](../surface/config/keybindings.md) 与 [subsys.coding-agent.keybindings](../subsystems/coding-agent/keybindings.md) 详述 [I]。

多个 action 可以共享同一个默认 key chord,例如 `ctrl+p` 同时出现在 model cycling、session path display 和 scoped models provider toggling;是否冲突取决于当前 UI context 和 TUI manager 的匹配/dispatch 语义,不是本默认目录直接判定 [E: packages/coding-agent/src/core/keybindings.ts:76] [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:130] [E: packages/coding-agent/src/core/keybindings.ts:131] [E: packages/coding-agent/src/core/keybindings.ts:162] [E: packages/coding-agent/src/core/keybindings.ts:163] [I]。

## Sources

- `packages/coding-agent/src/core/keybindings.ts`
- `packages/coding-agent/docs/keybindings.md`
- `packages/tui/src/keybindings.ts`

## 相关

- [surface.config.keybindings](../surface/config/keybindings.md): 用户可见的 `keybindings.json` 配置入口、key format、reload 和迁移语义。
- [subsys.coding-agent.keybindings](../subsystems/coding-agent/keybindings.md): `KEYBINDINGS` 组装、配置读取、legacy migration 和 coding-agent `KeybindingsManager` subclass。
