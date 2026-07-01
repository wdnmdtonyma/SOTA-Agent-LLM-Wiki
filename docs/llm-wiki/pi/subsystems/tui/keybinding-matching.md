---
id: subsys.tui.keybinding-matching
title: 键位匹配
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/keys.ts
  - packages/tui/src/keybindings.ts
symbols:
  - matchesKey
  - KeybindingsManager
  - TUI_KEYBINDINGS
related:
  - subsys.tui.key-parsing
  - ref.tui.keybinding-actions
  - subsys.coding-agent.keybindings
evidence: explicit
status: verified
updated: 8c943640
---

> 键位匹配(keybinding matching)把 terminal raw input data 与 typed `KeyId` chord、再与 namespaced action id 连接起来: `matchesKey(data, keyId)` 判断一个具体 key 是否命中, `KeybindingsManager.matches(data, action)` 判断一个动作的 resolved keys 是否任一命中。

## 能回答的问题

- `ctrl+c`、`shift+enter`、`alt+left` 这类 `KeyId` 字符串怎样被解析成 modifier mask 和 base key?
- `matchesKey()` 如何同时兼容 Kitty keyboard protocol、xterm modifyOtherKeys 和 legacy terminal escape/control sequences?
- `KeybindingsManager` 如何把 `TUI_KEYBINDINGS` defaults 与 user bindings 合成 effective bindings?
- TUI 默认 action id 有哪些 namespace, 它们和 raw key matching 的边界在哪里?
- keybinding conflicts 是怎样记录的, 为什么默认键位重复不一定在 TUI manager 里算冲突?
- coding-agent 的 product-level keybindings 如何复用 TUI 层的 matching semantics?

## 职责边界

`packages/tui/src/keys.ts` 负责 key identifier grammar、terminal sequence parsing 和 raw input matching;它导出 `KeyId`、`Key` helper、`matchesKey()`、`parseKey()`、Kitty protocol 状态函数等键盘基础 API [E: packages/tui/src/keys.ts:31] [E: packages/tui/src/keys.ts:38] [E: packages/tui/src/keys.ts:152] [E: packages/tui/src/keys.ts:163] [E: packages/tui/src/keys.ts:820] [E: packages/tui/src/keys.ts:1251]。`packages/tui/src/keybindings.ts` 负责 action registry、默认 TUI action definitions、user binding resolution、conflict reporting 和全局 manager singleton [E: packages/tui/src/keybindings.ts:7] [E: packages/tui/src/keybindings.ts:54] [E: packages/tui/src/keybindings.ts:155] [E: packages/tui/src/keybindings.ts:233]。

本节点讲 "raw data 是否命中某个 key/action";不展开 `parseKey()` 的完整 CSI-u parser 细节, 该细节属于 [subsys.tui.key-parsing](key-parsing.md) [I]。本节点也不逐项解释每个 TUI action 的用户含义, 逐项目录属于 [ref.tui.keybinding-actions](../../reference/keybinding-actions.md) [I]。

## 关键文件

- `packages/tui/src/keys.ts`: 定义 `KeyId`、modifier bit mask、legacy sequence tables、Kitty / modifyOtherKeys matching helpers、`matchesKey()` 和 `parseKey()` [E: packages/tui/src/keys.ts:141] [E: packages/tui/src/keys.ts:292] [E: packages/tui/src/keys.ts:368] [E: packages/tui/src/keys.ts:394] [E: packages/tui/src/keys.ts:408] [E: packages/tui/src/keys.ts:653] [E: packages/tui/src/keys.ts:709] [E: packages/tui/src/keys.ts:820] [E: packages/tui/src/keys.ts:1251]。
- `packages/tui/src/keybindings.ts`: 定义 `Keybindings` interface、`TUI_KEYBINDINGS`、`normalizeKeys()`、`KeybindingsManager` 和 global `getKeybindings()` / `setKeybindings()` [E: packages/tui/src/keybindings.ts:7] [E: packages/tui/src/keybindings.ts:54] [E: packages/tui/src/keybindings.ts:141] [E: packages/tui/src/keybindings.ts:155] [E: packages/tui/src/keybindings.ts:235] [E: packages/tui/src/keybindings.ts:239]。

## 数据模型

`KeyId` 是 base key 或带 modifier prefix 的 template literal union;base key 包括 letter、digit、symbol 和 special key, modifier name 限定为 `ctrl`、`shift`、`alt`、`super` [E: packages/tui/src/keys.ts:46] [E: packages/tui/src/keys.ts:74] [E: packages/tui/src/keys.ts:76] [E: packages/tui/src/keys.ts:109] [E: packages/tui/src/keys.ts:141] [E: packages/tui/src/keys.ts:142] [E: packages/tui/src/keys.ts:144] [E: packages/tui/src/keys.ts:152]。`Key` helper 用常量和函数生成 typed `KeyId`, 例如 `Key.escape`、`Key.ctrl("c")`、`Key.ctrlShift("p")` [E: packages/tui/src/keys.ts:163] [E: packages/tui/src/keys.ts:165] [E: packages/tui/src/keys.ts:230] [E: packages/tui/src/keys.ts:236]。

`matchesKey()` 先用 `parseKeyId()` 把 key id lower-case 并按 `+` 拆分, 最后一段作为 base key, 其余段映射到 boolean modifier flags [E: packages/tui/src/keys.ts:788] [E: packages/tui/src/keys.ts:791] [E: packages/tui/src/keys.ts:792] [E: packages/tui/src/keys.ts:796] [E: packages/tui/src/keys.ts:797] [E: packages/tui/src/keys.ts:798] [E: packages/tui/src/keys.ts:799]。随后 `matchesKey()` 把这些 flags 叠成 bit mask: `shift=1`、`alt=2`、`ctrl=4`、`super=8` [E: packages/tui/src/keys.ts:292] [E: packages/tui/src/keys.ts:825] [E: packages/tui/src/keys.ts:826] [E: packages/tui/src/keys.ts:827] [E: packages/tui/src/keys.ts:828] [E: packages/tui/src/keys.ts:829]。

`Keybindings` 是可 declaration merging 的 global keybinding registry, TUI 基础动作使用 `tui.editor.*`、`tui.input.*`、`tui.select.*` namespace [E: packages/tui/src/keybindings.ts:7] [E: packages/tui/src/keybindings.ts:7] [E: packages/tui/src/keybindings.ts:9] [E: packages/tui/src/keybindings.ts:31] [E: packages/tui/src/keybindings.ts:36]。`KeybindingDefinition.defaultKeys` 支持单个 `KeyId` 或 `KeyId[]`, user config 也支持 action id 到 `KeyId | KeyId[] | undefined` 的映射 [E: packages/tui/src/keybindings.ts:46] [E: packages/tui/src/keybindings.ts:47] [E: packages/tui/src/keybindings.ts:52]。

`TUI_KEYBINDINGS` 是 TUI 层默认 action definitions, 当前源码有 31 个 `tui.*` action, 覆盖 editor navigation/editing、generic input 和 generic selection 三组动作 [E: packages/tui/src/keybindings.ts:54] [E: packages/tui/src/keybindings.ts:55] [E: packages/tui/src/keybindings.ts:118] [E: packages/tui/src/keybindings.ts:122] [I]。该对象用 `as const satisfies KeybindingDefinitions` 约束每项 shape [E: packages/tui/src/keybindings.ts:134]。

## 控制流

1. 调用方通过 `getKeybindings()` 获取全局 manager;如果还没有设置过 global manager, TUI 会用 `new KeybindingsManager(TUI_KEYBINDINGS)` 创建默认 manager [E: packages/tui/src/keybindings.ts:239] [E: packages/tui/src/keybindings.ts:240] [E: packages/tui/src/keybindings.ts:241]。由于 manager 暴露的是 `matches(data, action)` 布尔查询, 具体 UI context 可以自行决定要查询哪些 action [E: packages/tui/src/keybindings.ts:194] [I]。
2. `KeybindingsManager` constructor 保存 definitions 与 user bindings, 然后调用 `rebuild()` 生成 `keysById` 和 `conflicts` [E: packages/tui/src/keybindings.ts:161] [E: packages/tui/src/keybindings.ts:162] [E: packages/tui/src/keybindings.ts:163] [E: packages/tui/src/keybindings.ts:164]。
3. `rebuild()` 先扫描 `userBindings`;未知 action id 会被跳过, 已知 action 的 user keys 会经过 `normalizeKeys()` 去重后进入 `userClaims` [E: packages/tui/src/keybindings.ts:171] [E: packages/tui/src/keybindings.ts:172] [E: packages/tui/src/keybindings.ts:173] [E: packages/tui/src/keybindings.ts:174] [E: packages/tui/src/keybindings.ts:147] [E: packages/tui/src/keybindings.ts:149]。
4. `rebuild()` 只把同一个 user-provided key 被多个 action claim 的情况加入 `conflicts`;默认键位之间的重复不会进入 `userClaims`, 因而不会由这里记录为 conflict [E: packages/tui/src/keybindings.ts:171] [E: packages/tui/src/keybindings.ts:181] [E: packages/tui/src/keybindings.ts:182] [E: packages/tui/src/keybindings.ts:183] [I]。
5. 对每个 definition, `rebuild()` 若没有 user override 就使用 `definition.defaultKeys`, 若有 override 就使用 user keys;最终写入 `keysById` [E: packages/tui/src/keybindings.ts:187] [E: packages/tui/src/keybindings.ts:188] [E: packages/tui/src/keybindings.ts:189] [E: packages/tui/src/keybindings.ts:190]。
6. `KeybindingsManager.matches(data, action)` 取出 action 的 resolved keys, 逐个调用 `matchesKey(data, key)`, 任一 key 命中即返回 true [E: packages/tui/src/keybindings.ts:194] [E: packages/tui/src/keybindings.ts:195] [E: packages/tui/src/keybindings.ts:196] [E: packages/tui/src/keybindings.ts:197] [E: packages/tui/src/keybindings.ts:199]。
7. `matchesKey(data, keyId)` 在 special key switch 中优先处理 escape、space、tab、enter、backspace、functional keys、arrows 和 function keys;这些分支混合 raw bytes、legacy sequence tables、Kitty CSI-u 和 modifyOtherKeys matching helper [E: packages/tui/src/keys.ts:831] [E: packages/tui/src/keys.ts:836] [E: packages/tui/src/keys.ts:838] [E: packages/tui/src/keys.ts:853] [E: packages/tui/src/keys.ts:865] [E: packages/tui/src/keys.ts:883] [E: packages/tui/src/keys.ts:940] [E: packages/tui/src/keys.ts:981] [E: packages/tui/src/keys.ts:1050] [E: packages/tui/src/keys.ts:1128]。
8. 如果 base key 是单个 letter、digit 或 known symbol, `matchesKey()` 用 codepoint 与 raw control-character rules 处理 printable keys;plain key 可直接匹配 raw char, modified key 主要走 Kitty 或 modifyOtherKeys, legacy `alt+letter/digit` 和 `ctrl+alt+key` 仅在 Kitty protocol inactive 时使用 ESC-prefixed forms [E: packages/tui/src/keys.ts:1149] [E: packages/tui/src/keys.ts:1155] [E: packages/tui/src/keys.ts:1162] [E: packages/tui/src/keys.ts:1167] [E: packages/tui/src/keys.ts:1183] [E: packages/tui/src/keys.ts:1192] [E: packages/tui/src/keys.ts:1200]。

## 匹配语义

Kitty matching 由 `matchesKittySequence()` 完成:它先 `parseKittySequence(data)`, 再把 actual modifier 与 expected modifier 去掉 lock mask 后比较;modifier 不同直接失败 [E: packages/tui/src/keys.ts:653] [E: packages/tui/src/keys.ts:654] [E: packages/tui/src/keys.ts:656] [E: packages/tui/src/keys.ts:657] [E: packages/tui/src/keys.ts:660]。codepoint 比较会先 normalize keypad/functional equivalents 和 shifted letter identity, 因而例如带 shift 的大写 letter identity 会回落到小写 codepoint 参与比较 [E: packages/tui/src/keys.ts:326] [E: packages/tui/src/keys.ts:356] [E: packages/tui/src/keys.ts:360] [E: packages/tui/src/keys.ts:662] [E: packages/tui/src/keys.ts:666] [E: packages/tui/src/keys.ts:672]。

Kitty alternate/base layout key 只在 parsed codepoint 不是 Latin letter、known symbol 时作为 fallback;源码注释解释这是为了让非 Latin layout 的 `Ctrl+<physical c>` 能匹配 `ctrl+c`, 同时避免 Dvorak/Colemak/xremap 这类 remapped layout 把已识别的 letter/symbol 错配到物理 QWERTY 位置 [E: packages/tui/src/keys.ts:686] [E: packages/tui/src/keys.ts:686] [E: packages/tui/src/keys.ts:686] [E: packages/tui/src/keys.ts:686] [E: packages/tui/src/keys.ts:688] [E: packages/tui/src/keys.ts:689] [E: packages/tui/src/keys.ts:690] [I]。

xterm modifyOtherKeys matching 使用 `CSI 27 ; modifiers ; keycode ~` 形式, `parseModifyOtherKeysSequence()` 解析出 codepoint 和 `modifier = modValue - 1`, `matchesModifyOtherKeys()` 要求 codepoint 与 modifier 完全相等 [E: packages/tui/src/keys.ts:696] [E: packages/tui/src/keys.ts:697] [E: packages/tui/src/keys.ts:699] [E: packages/tui/src/keys.ts:700] [E: packages/tui/src/keys.ts:701] [E: packages/tui/src/keys.ts:709] [E: packages/tui/src/keys.ts:709] [E: packages/tui/src/keys.ts:712]。printable modifyOtherKeys 会额外通过 `normalizeShiftedLetterIdentityCodepoint()` 比较 shifted letter identity [E: packages/tui/src/keys.ts:766] [E: packages/tui/src/keys.ts:768] [E: packages/tui/src/keys.ts:771]。

Legacy matching 是显式序列表和 raw byte rules 的组合: arrows、home/end、insert/delete、page up/down、function keys 等有 `LEGACY_KEY_SEQUENCES`;shift/ctrl variants 有独立表;ctrl+letter/symbol 使用 `rawCtrlChar()` 的 `code & 0x1f` 规则 [E: packages/tui/src/keys.ts:368] [E: packages/tui/src/keys.ts:394] [E: packages/tui/src/keys.ts:408] [E: packages/tui/src/keys.ts:485] [E: packages/tui/src/keys.ts:487] [E: packages/tui/src/keys.ts:749] [E: packages/tui/src/keys.ts:752] [E: packages/tui/src/keys.ts:753]。

Backspace 有一个 terminal-specific heuristic: raw `0x7f` 只匹配 plain backspace;raw `0x08` 在 Windows Terminal local session 中匹配 `ctrl+backspace`, 在其他环境中匹配 plain backspace [E: packages/tui/src/keys.ts:715] [E: packages/tui/src/keys.ts:717] [E: packages/tui/src/keys.ts:730] [E: packages/tui/src/keys.ts:731] [E: packages/tui/src/keys.ts:732] [E: packages/tui/src/keys.ts:733]。

## 设计动机与权衡

匹配层 deliberately accepts multiple terminal encodings for the same semantic key: `enter` can be raw carriage return, legacy numpad enter, Kitty enter, or Kitty keypad enter;`shift+enter` and `alt+enter` also distinguish Kitty-active custom mappings from legacy ESC-prefixed forms [E: packages/tui/src/keys.ts:880] [E: packages/tui/src/keys.ts:883] [E: packages/tui/src/keys.ts:895] [E: packages/tui/src/keys.ts:900] [E: packages/tui/src/keys.ts:914] [E: packages/tui/src/keys.ts:919] [E: packages/tui/src/keys.ts:921] [E: packages/tui/src/keys.ts:923] [E: packages/tui/src/keys.ts:924] [E: packages/tui/src/keys.ts:925] [I]。这让同一个 `KeyId` 可以跨 terminal protocol 命中, 代价是部分 legacy byte sequence 的语义依赖 `_kittyProtocolActive` 与平台环境 [I]。

`KeybindingsManager` 的 conflict model 聚焦 user overrides, 而不是全局动作语义冲突;manager 只提供 per-action `matches(data, action)` 查询, 不在这里做跨 context dispatch [E: packages/tui/src/keybindings.ts:181] [E: packages/tui/src/keybindings.ts:194] [E: packages/tui/src/keybindings.ts:197] [I]。

## Gotcha

- `parseKeyId()` lower-case 整个 key id, 所以 `pageUp` 在 matching switch 中实际以 `pageup` case 处理;`TUI_KEYBINDINGS` 中使用的 `pageUp` / `pageDown` 仍可命中 [E: packages/tui/src/keys.ts:791] [E: packages/tui/src/keys.ts:1020] [E: packages/tui/src/keys.ts:1032] [E: packages/tui/src/keybindings.ts:89] [E: packages/tui/src/keybindings.ts:90] [E: packages/tui/src/keybindings.ts:124] [E: packages/tui/src/keybindings.ts:125]。
- `getResolvedBindings()` 把一个 action 的 resolved keys 序列化回 config shape: 单键返回 string, 多键返回 array, 零键也返回空 array [E: packages/tui/src/keybindings.ts:223] [E: packages/tui/src/keybindings.ts:225] [E: packages/tui/src/keybindings.ts:226] [E: packages/tui/src/keybindings.ts:227]。
- `setUserBindings()` 会替换整份 user binding object 并 rebuild;它不是增量 patch [E: packages/tui/src/keybindings.ts:214] [E: packages/tui/src/keybindings.ts:215] [E: packages/tui/src/keybindings.ts:216]。
- `matchesKey()` 对 `f1` 到 `f12` 的 modified forms 直接返回 false, 因为 function key switch 中 `modifier !== 0` 时不继续尝试 Kitty modified function-key matching [E: packages/tui/src/keys.ts:1128] [E: packages/tui/src/keys.ts:1140] [E: packages/tui/src/keys.ts:1141] [I]。

## 跨包边界

[subsys.coding-agent.keybindings](../coding-agent/keybindings.md) 是 pi-coding-agent 的 product-level layer;本节点 source 只能证实 TUI 层提供可复用的 `KeybindingsManager`, coding-agent 层如何展开 `TUI_KEYBINDINGS`、添加 `app.*` actions、读取/迁移 `keybindings.json` 需在对应节点 source 中核验 [E: packages/tui/src/keybindings.ts:155] [U]。

[subsys.tui.key-parsing](key-parsing.md) 应覆盖 `parseKey()`、`parseKittySequence()`、`parseModifyOtherKeysSequence()` 怎样把 raw data 转成 key id;本节点只在 matching 需要时描述 parser 输出如何参与比较 [E: packages/tui/src/keys.ts:587] [E: packages/tui/src/keys.ts:696] [E: packages/tui/src/keys.ts:1251] [I]。

[ref.tui.keybinding-actions](../../reference/keybinding-actions.md) 应逐项列出 `TUI_KEYBINDINGS` 的 action id、default keys 和 description;本节点只解释这些 definitions 如何被 manager resolve 与 match [E: packages/tui/src/keybindings.ts:54] [E: packages/tui/src/keybindings.ts:187] [E: packages/tui/src/keybindings.ts:194]。

## Sources

- packages/tui/src/keys.ts
- packages/tui/src/keybindings.ts

## 相关

- [subsys.tui.key-parsing](key-parsing.md): TUI raw keyboard sequence 到 canonical key id 的解析子系统。
- [ref.tui.keybinding-actions](../../reference/keybinding-actions.md): `TUI_KEYBINDINGS` 默认 action catalog。
- [subsys.coding-agent.keybindings](../coding-agent/keybindings.md): coding-agent 层 keybinding 行为的对应节点。
