---
id: tui.keybindings
title: TUI Keybindings 与 mode stack
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/keymap.tsx, packages/tui/src/config/keybind.ts]
symbols: [registerOpencodeKeymap, createOpencodeModeStack, TuiKeybind.Definitions, TuiKeybind.CommandMap]
related: [ref.keybinds, tui.dialog-kit, tui.prompt]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> TUI keybinding 层把 opencode command ids 映射到 `@opentui/keymap`：默认 leader 是 `ctrl+x`，mode stack 用 keymap data field 控制 layer 可见性，完整绑定细表在 `ref.keybinds`。

## 能回答的问题

- Keybinding config schema 接受哪些写法？
- leader token、mode stack、managed textarea layer 怎么接入 OpenTUI keymap？
- `Definitions` 与 `CommandMap` 为什么分开？
- 为什么 dialog/autocomplete/prompt 要 push 临时 mode？
- 终端 suspend disabled 时为什么会改写 `ctrl+z`？

## Config schema

`BindingValueSchema` 接受 `false`、`"none"`、单个 binding item 或 binding item array；binding item 可以是 string、KeyStroke object，或带 `key/event/preventDefault/fallthrough` 的 binding object。[E: packages/tui/src/config/keybind.ts:8] [E: packages/tui/src/config/keybind.ts:19] [E: packages/tui/src/config/keybind.ts:20] [E: packages/tui/src/config/keybind.ts:21] [E: packages/tui/src/config/keybind.ts:22] [E: packages/tui/src/config/keybind.ts:27] [E: packages/tui/src/config/keybind.ts:29] [E: packages/tui/src/config/keybind.ts:30] [E: packages/tui/src/config/keybind.ts:31] [E: packages/tui/src/config/keybind.ts:32] `LeaderDefault` 是 `ctrl+x`。[E: packages/tui/src/config/keybind.ts:41]

`Definitions` 是 config-facing key 名和默认 binding/description 的表；当前源码从 `leader` 开始，覆盖 app、diff、editor/theme/sidebar/session、model/provider/agent、message scrolling、prompt/input/history、dialog/autocomplete/permission、terminal、tips/plugin/which-key 等分组。[E: packages/tui/src/config/keybind.ts:45] [E: packages/tui/src/config/keybind.ts:237] `CommandMap` 把这些 config-facing snake_case keys 映射到 runtime command ids，例如 `command_list -> command.palette.show`、`session_compact -> session.compact`、`input_submit -> input.submit`。[E: packages/tui/src/config/keybind.ts:253] [E: packages/tui/src/config/keybind.ts:263] [E: packages/tui/src/config/keybind.ts:300] [E: packages/tui/src/config/keybind.ts:360]

`parse()` 会拒绝 unknown key，然后对每个 Definition 使用 override 或 default 进行 Schema decode。[E: packages/tui/src/config/keybind.ts:443] [E: packages/tui/src/config/keybind.ts:445] [E: packages/tui/src/config/keybind.ts:447] [E: packages/tui/src/config/keybind.ts:449]

## Runtime registration

`registerOpencodeKeymap(keymap, renderer, config)` 是 app root 调用的全局 keymap installer。[E: packages/tui/src/keymap.tsx:214] [I] 它创建 opencode mode stack，注册 comma bindings、key aliases、base layout fallback、timed leader、escape clears pending sequence、backspace pops pending sequence，并为 focused managed textarea 注册 input commands。[E: packages/tui/src/keymap.tsx:215] [E: packages/tui/src/keymap.tsx:216] [E: packages/tui/src/keymap.tsx:217] [E: packages/tui/src/keymap.tsx:218] [E: packages/tui/src/keymap.tsx:221] [E: packages/tui/src/keymap.tsx:227] [E: packages/tui/src/keymap.tsx:228] [E: packages/tui/src/keymap.tsx:229]

key aliases 把 `enter` 转 `return`、`esc` 转 `escape`、`pgdown` 转 `pagedown`、`pgup` 转 `pageup`；format helpers 再把 output display 中的 `pageup/pagedown/delete/meta` 显示成 `pgup/pgdn/del/alt` 等更短标签。[E: packages/tui/src/keymap.tsx:113] [E: packages/tui/src/keymap.tsx:114] [E: packages/tui/src/keymap.tsx:115] [E: packages/tui/src/keymap.tsx:116] [E: packages/tui/src/keymap.tsx:196] [E: packages/tui/src/keymap.tsx:197] [E: packages/tui/src/keymap.tsx:198] [E: packages/tui/src/keymap.tsx:201]

`inputCommands` 是 managed textarea layer 的 allowlist，包含 movement、selection、delete、undo/redo、word movement、select all、submit 等 input command ids。[E: packages/tui/src/keymap.tsx:136] [E: packages/tui/src/keymap.tsx:173] managed layer 只在 `renderer.currentFocusedEditor` 是 `TextareaRenderable` 且不是 `InputRenderable` 时启用。[E: packages/tui/src/keymap.tsx:175] [E: packages/tui/src/keymap.tsx:177] [E: packages/tui/src/keymap.tsx:229] [E: packages/tui/src/keymap.tsx:231]

## Mode stack

`createOpencodeModeStack()` 在 keymap data 上设置 `opencode.mode = "base"`，并注册 custom layer field `mode(value, ctx)`，要求 ctx data 中的 mode 等于 layer 声明值。[E: packages/tui/src/keymap.tsx:53] [E: packages/tui/src/keymap.tsx:54] [E: packages/tui/src/keymap.tsx:56] [E: packages/tui/src/keymap.tsx:58] `push(mode)` 会压入带 Symbol id 的 stack item，返回 disposer；disposer 只移除自己的 entry，然后把当前 mode 更新为 stack top 或 base。[E: packages/tui/src/keymap.tsx:66] [E: packages/tui/src/keymap.tsx:73] [E: packages/tui/src/keymap.tsx:75] [E: packages/tui/src/keymap.tsx:77] [E: packages/tui/src/keymap.tsx:83] [E: packages/tui/src/keymap.tsx:84] [E: packages/tui/src/keymap.tsx:85]

Autocomplete popup 显示时 push `autocomplete` mode；Dialog stack 非空时 push `modal` mode；这使 base prompt/session bindings 不会抢走 popup/modal 的快捷键。[E: packages/tui/src/component/prompt/autocomplete.tsx:106] [E: packages/tui/src/component/prompt/autocomplete.tsx:108] [E: packages/tui/src/ui/dialog.tsx:78] [E: packages/tui/src/ui/dialog.tsx:80] [I]

## Config resolve

TUI config `Info` 包含 `keybinds?: TuiKeybind.KeybindOverrides`、`leader_timeout?: LeaderTimeout`、`mouse?: boolean` 等字段。[E: packages/tui/src/config/index.tsx:53] [E: packages/tui/src/config/index.tsx:56] [E: packages/tui/src/config/index.tsx:59] [E: packages/tui/src/config/index.tsx:65] `resolve(input, options)` 会先复制 keybind overrides；如果 host 禁用 terminal suspend，就把 `terminal_suspend` 设 `"none"`，并在用户未覆盖 `input_undo` 时把 `ctrl+z` 加进 input undo binding。[E: packages/tui/src/config/index.tsx:89] [E: packages/tui/src/config/index.tsx:90] [E: packages/tui/src/config/index.tsx:91] [E: packages/tui/src/config/index.tsx:92] [E: packages/tui/src/config/index.tsx:93] [E: packages/tui/src/config/index.tsx:94]

最终 resolved config 用 `createBindingLookup(toBindingConfig(parse(keybinds)), { commandMap, bindingDefaults })`，并填充 `leader_timeout` 默认 2000、`mouse` 默认 true。[E: packages/tui/src/config/index.tsx:110] [E: packages/tui/src/config/index.tsx:111] [E: packages/tui/src/config/index.tsx:112] [E: packages/tui/src/config/index.tsx:114] [E: packages/tui/src/config/index.tsx:115]

## Slash commands 与 command palette

`useCommandSlashes()` 从 keymap 中读取 reachable 且 namespace 为 `palette` 的 command entries，过滤 hidden 和 command palette 本身；有 `slashName` 的 command 会映射成 `/name` entry，aliases 映射成 `/alias`，onSelect dispatch 原 command。[E: packages/tui/src/keymap.tsx:260] [E: packages/tui/src/keymap.tsx:264] [E: packages/tui/src/keymap.tsx:265] [E: packages/tui/src/keymap.tsx:266] [E: packages/tui/src/keymap.tsx:49] [E: packages/tui/src/keymap.tsx:50] [E: packages/tui/src/keymap.tsx:276] [E: packages/tui/src/keymap.tsx:283] [E: packages/tui/src/keymap.tsx:284] [E: packages/tui/src/keymap.tsx:286]

Session screen 和 Prompt 都把自己的 commands 注册到 namespace `palette`；slash autocomplete 调 `useCommandSlashes()`，因此可以混合全局/session/prompt commands。[E: packages/tui/src/routes/session/index.tsx:1087] [E: packages/tui/src/routes/session/index.tsx:1096] [E: packages/tui/src/routes/session/index.tsx:1097] [E: packages/tui/src/component/prompt/index.tsx:552] [E: packages/tui/src/component/prompt/index.tsx:557] [E: packages/tui/src/component/prompt/index.tsx:558] [E: packages/tui/src/component/prompt/autocomplete.tsx:437] [I]

## 设计动机与权衡

用 `Definitions` 表示用户配置面、用 `CommandMap` 表示 runtime command ids，使 config key 可以稳定为 snake_case，同时内部 command namespace 可保持 dot notation。[E: packages/tui/src/config/keybind.ts:45] [E: packages/tui/src/config/keybind.ts:253] [I] mode stack 选择 stack/disposer 模型，是为了让 autocomplete、modal、plugin mode 等临时 layer 可嵌套并按 cleanup 顺序恢复 base mode。[E: packages/tui/src/keymap.tsx:62] [E: packages/tui/src/keymap.tsx:80] [I]

## Gotcha

- 用户提示里提到约 230 binds；当前源码 `Definitions` 从 line 45 到 237，实际 key 名数量应以 `Object.keys(Definitions)` 为准，完整细表归档在 `ref.keybinds`。[E: packages/tui/src/config/keybind.ts:45] [E: packages/tui/src/config/keybind.ts:237] [I]
- `@opentui/keymap` 的 binding parser、sequence resolver 和 layer internals 是 external dependency，不在 opencode repo；本页只核 opencode 注册哪些 addons 和如何使用 API。[E: packages/tui/src/keymap.tsx:9] [E: packages/tui/src/keymap.tsx:10] [U]

## Sources

- `packages/tui/src/keymap.tsx`
- `packages/tui/src/config/keybind.ts`
- `packages/tui/src/config/index.tsx`
- `packages/tui/src/component/prompt/autocomplete.tsx`
- `packages/tui/src/ui/dialog.tsx`
- `packages/tui/src/routes/session/index.tsx`
- `packages/tui/src/component/prompt/index.tsx`

## 相关

- `ref.keybinds`：完整 keybind default/description/command id 表。
- `tui.dialog-kit`：modal mode 与 dialog select bindings。
- `tui.prompt`：prompt/input/autocomplete bindings。
