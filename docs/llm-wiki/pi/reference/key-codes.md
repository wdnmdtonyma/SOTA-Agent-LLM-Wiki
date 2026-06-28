---
id: ref.tui.key-codes
title: 按键代码目录
kind: catalog
tier: T3
pkg: tui
source:
  - packages/tui/src/keys.ts
symbols:
  - BaseKey
  - SpecialKey
  - CODEPOINTS
related:
  - subsys.tui.key-parsing
evidence: explicit
status: verified
updated: 5a073885
---

> `ref.tui.key-codes` 是 pi-tui 的 key identifier 基础目录:覆盖 `BaseKey` 可接受的 letter、digit、symbol、special key 字面量,以及 `CODEPOINTS` 在 Kitty / CSI-u / modifyOtherKeys 匹配中使用的显式码点。

## 能回答的问题

- `BaseKey` 允许哪些 bare key identifier?
- `SpecialKey` 里有哪些别名,例如 `escape` / `esc`、`enter` / `return`?
- `CODEPOINTS` 里哪些 key name 映射到数字 codepoint?
- 哪些可打印 symbol key 可以作为 `ctrl+...`、`alt+...` 等 modifier 组合的 base key?
- `kpEnter` 为什么在 `CODEPOINTS` 里但不在 `SpecialKey` 里?

## Catalog 口径

`BaseKey` 是 `Letter | Digit | SymbolKey | SpecialKey` 的 union,并被 `KeyId = BaseKey | ModifiedKeyId<BaseKey>` 用作无 modifier 与带 modifier key identifier 的基础集合 [E: packages/tui/src/keys.ts:141] [E: packages/tui/src/keys.ts:152]。`ModifiedKeyId` 允许 `ctrl`、`shift`、`alt`、`super` 递归组合在任一 `BaseKey` 前面 [E: packages/tui/src/keys.ts:142] [E: packages/tui/src/keys.ts:144] [E: packages/tui/src/keys.ts:145]。

`SpecialKey` 是源码中显式列出的 named key union,包含 terminal control keys、navigation keys、arrow keys 和 `f1` 到 `f12` [E: packages/tui/src/keys.ts:109] [E: packages/tui/src/keys.ts:139]。`CODEPOINTS` 不是完整 special key 表;它只记录 `escape`、`tab`、`enter`、`space`、`backspace`、`kpEnter` 六个 codepoint,供 Kitty / CSI-u / modifyOtherKeys 匹配和反向格式化使用 [E: packages/tui/src/keys.ts:301] [E: packages/tui/src/keys.ts:308] [E: packages/tui/src/keys.ts:837] [E: packages/tui/src/keys.ts:838] [E: packages/tui/src/keys.ts:1230]。

## BaseKey: letters

| key identifier | BaseKey 分组 | 含义 / English term | 源码证据 |
| --- | --- | --- | --- |
| `a` | `Letter` | lowercase letter `a`; printable key. | [E: packages/tui/src/keys.ts:47] |
| `b` | `Letter` | lowercase letter `b`; printable key. | [E: packages/tui/src/keys.ts:48] |
| `c` | `Letter` | lowercase letter `c`; printable key. | [E: packages/tui/src/keys.ts:49] |
| `d` | `Letter` | lowercase letter `d`; printable key. | [E: packages/tui/src/keys.ts:50] |
| `e` | `Letter` | lowercase letter `e`; printable key. | [E: packages/tui/src/keys.ts:51] |
| `f` | `Letter` | lowercase letter `f`; printable key. | [E: packages/tui/src/keys.ts:52] |
| `g` | `Letter` | lowercase letter `g`; printable key. | [E: packages/tui/src/keys.ts:53] |
| `h` | `Letter` | lowercase letter `h`; printable key. | [E: packages/tui/src/keys.ts:54] |
| `i` | `Letter` | lowercase letter `i`; printable key. | [E: packages/tui/src/keys.ts:55] |
| `j` | `Letter` | lowercase letter `j`; printable key. | [E: packages/tui/src/keys.ts:56] |
| `k` | `Letter` | lowercase letter `k`; printable key. | [E: packages/tui/src/keys.ts:57] |
| `l` | `Letter` | lowercase letter `l`; printable key. | [E: packages/tui/src/keys.ts:58] |
| `m` | `Letter` | lowercase letter `m`; printable key. | [E: packages/tui/src/keys.ts:59] |
| `n` | `Letter` | lowercase letter `n`; printable key. | [E: packages/tui/src/keys.ts:60] |
| `o` | `Letter` | lowercase letter `o`; printable key. | [E: packages/tui/src/keys.ts:61] |
| `p` | `Letter` | lowercase letter `p`; printable key. | [E: packages/tui/src/keys.ts:62] |
| `q` | `Letter` | lowercase letter `q`; printable key. | [E: packages/tui/src/keys.ts:63] |
| `r` | `Letter` | lowercase letter `r`; printable key. | [E: packages/tui/src/keys.ts:64] |
| `s` | `Letter` | lowercase letter `s`; printable key. | [E: packages/tui/src/keys.ts:65] |
| `t` | `Letter` | lowercase letter `t`; printable key. | [E: packages/tui/src/keys.ts:66] |
| `u` | `Letter` | lowercase letter `u`; printable key. | [E: packages/tui/src/keys.ts:67] |
| `v` | `Letter` | lowercase letter `v`; printable key. | [E: packages/tui/src/keys.ts:68] |
| `w` | `Letter` | lowercase letter `w`; printable key. | [E: packages/tui/src/keys.ts:69] |
| `x` | `Letter` | lowercase letter `x`; printable key. | [E: packages/tui/src/keys.ts:70] |
| `y` | `Letter` | lowercase letter `y`; printable key. | [E: packages/tui/src/keys.ts:71] |
| `z` | `Letter` | lowercase letter `z`; printable key. | [E: packages/tui/src/keys.ts:72] |

## BaseKey: digits

| key identifier | BaseKey 分组 | 含义 / English term | 源码证据 |
| --- | --- | --- | --- |
| `0` | `Digit` | digit zero; printable key. | [E: packages/tui/src/keys.ts:74] |
| `1` | `Digit` | digit one; printable key. | [E: packages/tui/src/keys.ts:74] |
| `2` | `Digit` | digit two; printable key. | [E: packages/tui/src/keys.ts:74] |
| `3` | `Digit` | digit three; printable key. | [E: packages/tui/src/keys.ts:74] |
| `4` | `Digit` | digit four; printable key. | [E: packages/tui/src/keys.ts:74] |
| `5` | `Digit` | digit five; printable key. | [E: packages/tui/src/keys.ts:74] |
| `6` | `Digit` | digit six; printable key. | [E: packages/tui/src/keys.ts:74] |
| `7` | `Digit` | digit seven; printable key. | [E: packages/tui/src/keys.ts:74] |
| `8` | `Digit` | digit eight; printable key. | [E: packages/tui/src/keys.ts:74] |
| `9` | `Digit` | digit nine; printable key. | [E: packages/tui/src/keys.ts:74] |

## BaseKey: symbols

| key identifier | BaseKey 分组 | 含义 / English term | 源码证据 |
| --- | --- | --- | --- |
| `` ` `` | `SymbolKey` | backtick / grave accent. | [E: packages/tui/src/keys.ts:77] |
| `-` | `SymbolKey` | hyphen / minus. | [E: packages/tui/src/keys.ts:78] |
| `=` | `SymbolKey` | equals sign. | [E: packages/tui/src/keys.ts:79] |
| `[` | `SymbolKey` | left square bracket. | [E: packages/tui/src/keys.ts:80] |
| `]` | `SymbolKey` | right square bracket. | [E: packages/tui/src/keys.ts:81] |
| `\` | `SymbolKey` | backslash. | [E: packages/tui/src/keys.ts:82] |
| `;` | `SymbolKey` | semicolon. | [E: packages/tui/src/keys.ts:83] |
| `'` | `SymbolKey` | apostrophe / quote. | [E: packages/tui/src/keys.ts:84] |
| `,` | `SymbolKey` | comma. | [E: packages/tui/src/keys.ts:85] |
| `.` | `SymbolKey` | period / dot. | [E: packages/tui/src/keys.ts:86] |
| `/` | `SymbolKey` | slash. | [E: packages/tui/src/keys.ts:87] |
| `!` | `SymbolKey` | exclamation mark. | [E: packages/tui/src/keys.ts:88] |
| `@` | `SymbolKey` | at sign. | [E: packages/tui/src/keys.ts:89] |
| `#` | `SymbolKey` | hash / number sign. | [E: packages/tui/src/keys.ts:90] |
| `$` | `SymbolKey` | dollar sign. | [E: packages/tui/src/keys.ts:91] |
| `%` | `SymbolKey` | percent sign. | [E: packages/tui/src/keys.ts:92] |
| `^` | `SymbolKey` | caret. | [E: packages/tui/src/keys.ts:93] |
| `&` | `SymbolKey` | ampersand. | [E: packages/tui/src/keys.ts:94] |
| `*` | `SymbolKey` | asterisk. | [E: packages/tui/src/keys.ts:95] |
| `(` | `SymbolKey` | left parenthesis. | [E: packages/tui/src/keys.ts:96] |
| `)` | `SymbolKey` | right parenthesis. | [E: packages/tui/src/keys.ts:97] |
| `_` | `SymbolKey` | underscore. | [E: packages/tui/src/keys.ts:98] |
| `+` | `SymbolKey` | plus sign. | [E: packages/tui/src/keys.ts:99] |
| <code>&#124;</code> | `SymbolKey` | pipe / vertical bar. | [E: packages/tui/src/keys.ts:100] |
| `~` | `SymbolKey` | tilde. | [E: packages/tui/src/keys.ts:101] |
| `{` | `SymbolKey` | left brace. | [E: packages/tui/src/keys.ts:102] |
| `}` | `SymbolKey` | right brace. | [E: packages/tui/src/keys.ts:103] |
| `:` | `SymbolKey` | colon. | [E: packages/tui/src/keys.ts:104] |
| `<` | `SymbolKey` | less-than sign. | [E: packages/tui/src/keys.ts:105] |
| `>` | `SymbolKey` | greater-than sign. | [E: packages/tui/src/keys.ts:106] |
| `?` | `SymbolKey` | question mark. | [E: packages/tui/src/keys.ts:107] |

`SYMBOL_KEYS` 运行时 set 重复列出同一批 symbol,用于 `matchesKey()` 和 `formatParsedKey()` 判断 single printable symbol 是否属于已知 key [E: packages/tui/src/keys.ts:258] [E: packages/tui/src/keys.ts:289] [E: packages/tui/src/keys.ts:1149] [E: packages/tui/src/keys.ts:1245]。

## SpecialKey

| key identifier | 类别 / English term | 解析含义 | 源码证据 |
| --- | --- | --- | --- |
| `escape` | control key / Escape | Escape 的规范 special key 名;`matchesKey()` 同时接受 bare ESC、Kitty codepoint 27 和 modifyOtherKeys 27。 | [E: packages/tui/src/keys.ts:110] [E: packages/tui/src/keys.ts:832] [E: packages/tui/src/keys.ts:836] [E: packages/tui/src/keys.ts:837] [E: packages/tui/src/keys.ts:838] |
| `esc` | alias / Escape shorthand | Escape 的别名;`matchesKey()` 与 `escape` 走同一分支。 | [E: packages/tui/src/keys.ts:111] [E: packages/tui/src/keys.ts:833] |
| `enter` | control key / Enter | Enter 的规范 special key 名;plain Enter、numpad Enter、Kitty Enter / kpEnter 和 modifyOtherKeys Enter 都可映射到它。 | [E: packages/tui/src/keys.ts:112] [E: packages/tui/src/keys.ts:878] [E: packages/tui/src/keys.ts:921] [E: packages/tui/src/keys.ts:923] [E: packages/tui/src/keys.ts:924] [E: packages/tui/src/keys.ts:925] [E: packages/tui/src/keys.ts:929] [E: packages/tui/src/keys.ts:931] |
| `return` | alias / Return | Enter 的别名;`matchesKey()` 与 `enter` 走同一分支。 | [E: packages/tui/src/keys.ts:113] [E: packages/tui/src/keys.ts:879] |
| `tab` | control key / Tab | Tab key;`shift+tab` 有独立 legacy 序列,plain tab 可由 `\t` 或 Kitty tab codepoint 匹配。 | [E: packages/tui/src/keys.ts:114] [E: packages/tui/src/keys.ts:862] [E: packages/tui/src/keys.ts:865] [E: packages/tui/src/keys.ts:866] [E: packages/tui/src/keys.ts:871] |
| `space` | printable control-ish key / Space | Space key;plain space 是 `" "`,带 modifier 时依赖 Kitty / modifyOtherKeys 或 legacy alt/ctrl 空格分支。 | [E: packages/tui/src/keys.ts:115] [E: packages/tui/src/keys.ts:841] [E: packages/tui/src/keys.ts:843] [E: packages/tui/src/keys.ts:846] [E: packages/tui/src/keys.ts:852] [E: packages/tui/src/keys.ts:858] [E: packages/tui/src/keys.ts:859] |
| `backspace` | editing key / Backspace | Backspace key;legacy raw `0x08` 对 Windows Terminal 与普通 terminal 有启发式差异。 | [E: packages/tui/src/keys.ts:116] [E: packages/tui/src/keys.ts:934] [E: packages/tui/src/keys.ts:730] [E: packages/tui/src/keys.ts:731] [E: packages/tui/src/keys.ts:733] |
| `delete` | editing key / Delete | Delete key;legacy delete sequence 或 functional codepoint `-10` 可匹配。 | [E: packages/tui/src/keys.ts:117] [E: packages/tui/src/keys.ts:318] [E: packages/tui/src/keys.ts:978] [E: packages/tui/src/keys.ts:981] [E: packages/tui/src/keys.ts:982] |
| `insert` | editing key / Insert | Insert key;legacy insert sequence 或 functional codepoint `-11` 可匹配。 | [E: packages/tui/src/keys.ts:118] [E: packages/tui/src/keys.ts:319] [E: packages/tui/src/keys.ts:966] [E: packages/tui/src/keys.ts:969] [E: packages/tui/src/keys.ts:970] |
| `clear` | terminal keypad key / Clear | Clear key;当前匹配只走 legacy clear sequence 与 legacy modifier sequence。 | [E: packages/tui/src/keys.ts:119] [E: packages/tui/src/keys.ts:990] [E: packages/tui/src/keys.ts:992] [E: packages/tui/src/keys.ts:994] |
| `home` | navigation key / Home | Home key;legacy home sequence 或 functional codepoint `-14` 可匹配。 | [E: packages/tui/src/keys.ts:120] [E: packages/tui/src/keys.ts:322] [E: packages/tui/src/keys.ts:996] [E: packages/tui/src/keys.ts:999] [E: packages/tui/src/keys.ts:1000] |
| `end` | navigation key / End | End key;legacy end sequence 或 functional codepoint `-15` 可匹配。 | [E: packages/tui/src/keys.ts:121] [E: packages/tui/src/keys.ts:323] [E: packages/tui/src/keys.ts:1008] [E: packages/tui/src/keys.ts:1011] [E: packages/tui/src/keys.ts:1012] |
| `pageUp` | navigation key / Page Up | Page Up key;`parseKeyId()` 会 lowercase,所以匹配分支名是 `pageup`。 | [E: packages/tui/src/keys.ts:122] [E: packages/tui/src/keys.ts:791] [E: packages/tui/src/keys.ts:1020] |
| `pageDown` | navigation key / Page Down | Page Down key;`parseKeyId()` lowercase 后匹配 `pagedown` 分支。 | [E: packages/tui/src/keys.ts:123] [E: packages/tui/src/keys.ts:791] [E: packages/tui/src/keys.ts:1032] |
| `up` | arrow key / Up Arrow | Up arrow;legacy arrow sequence 或 arrow codepoint `-1` 可匹配。 | [E: packages/tui/src/keys.ts:124] [E: packages/tui/src/keys.ts:311] [E: packages/tui/src/keys.ts:1044] [E: packages/tui/src/keys.ts:1050] [E: packages/tui/src/keys.ts:1051] |
| `down` | arrow key / Down Arrow | Down arrow;legacy arrow sequence 或 arrow codepoint `-2` 可匹配。 | [E: packages/tui/src/keys.ts:125] [E: packages/tui/src/keys.ts:312] [E: packages/tui/src/keys.ts:1059] [E: packages/tui/src/keys.ts:1065] [E: packages/tui/src/keys.ts:1066] |
| `left` | arrow key / Left Arrow | Left arrow;legacy arrow sequence, selected alt/ctrl legacy forms, or arrow codepoint `-4` 可匹配。 | [E: packages/tui/src/keys.ts:126] [E: packages/tui/src/keys.ts:314] [E: packages/tui/src/keys.ts:1074] [E: packages/tui/src/keys.ts:1077] [E: packages/tui/src/keys.ts:1085] [E: packages/tui/src/keys.ts:1092] [E: packages/tui/src/keys.ts:1093] |
| `right` | arrow key / Right Arrow | Right arrow;legacy arrow sequence, selected alt/ctrl legacy forms, or arrow codepoint `-3` 可匹配。 | [E: packages/tui/src/keys.ts:127] [E: packages/tui/src/keys.ts:313] [E: packages/tui/src/keys.ts:1101] [E: packages/tui/src/keys.ts:1104] [E: packages/tui/src/keys.ts:1112] [E: packages/tui/src/keys.ts:1119] [E: packages/tui/src/keys.ts:1120] |
| `f1` | function key / F1 | Function key F1;当前 `matchesKey()` 对 function keys 只接受无 modifier legacy sequences。 | [E: packages/tui/src/keys.ts:128] [E: packages/tui/src/keys.ts:1128] [E: packages/tui/src/keys.ts:1140] [E: packages/tui/src/keys.ts:1144] |
| `f2` | function key / F2 | Function key F2;当前 function-key 分支要求 modifier 为 0。 | [E: packages/tui/src/keys.ts:129] [E: packages/tui/src/keys.ts:1129] [E: packages/tui/src/keys.ts:1140] [E: packages/tui/src/keys.ts:1144] |
| `f3` | function key / F3 | Function key F3;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:130] [E: packages/tui/src/keys.ts:1130] [E: packages/tui/src/keys.ts:1144] |
| `f4` | function key / F4 | Function key F4;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:131] [E: packages/tui/src/keys.ts:1131] [E: packages/tui/src/keys.ts:1144] |
| `f5` | function key / F5 | Function key F5;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:132] [E: packages/tui/src/keys.ts:1132] [E: packages/tui/src/keys.ts:1144] |
| `f6` | function key / F6 | Function key F6;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:133] [E: packages/tui/src/keys.ts:1133] [E: packages/tui/src/keys.ts:1144] |
| `f7` | function key / F7 | Function key F7;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:134] [E: packages/tui/src/keys.ts:1134] [E: packages/tui/src/keys.ts:1144] |
| `f8` | function key / F8 | Function key F8;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:135] [E: packages/tui/src/keys.ts:1135] [E: packages/tui/src/keys.ts:1144] |
| `f9` | function key / F9 | Function key F9;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:136] [E: packages/tui/src/keys.ts:1136] [E: packages/tui/src/keys.ts:1144] |
| `f10` | function key / F10 | Function key F10;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:137] [E: packages/tui/src/keys.ts:1137] [E: packages/tui/src/keys.ts:1144] |
| `f11` | function key / F11 | Function key F11;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:138] [E: packages/tui/src/keys.ts:1138] [E: packages/tui/src/keys.ts:1144] |
| `f12` | function key / F12 | Function key F12;通过 `LEGACY_KEY_SEQUENCES` 匹配。 | [E: packages/tui/src/keys.ts:139] [E: packages/tui/src/keys.ts:1139] [E: packages/tui/src/keys.ts:1144] |

## CODEPOINTS

| CODEPOINTS key | numeric codepoint | 对应 key identifier | 用途 / English term | 源码证据 |
| --- | ---: | --- | --- | --- |
| `escape` | `27` | `escape` / `esc` | ESC codepoint;用于 bare Escape 的 Kitty / modifyOtherKeys 匹配。 | [E: packages/tui/src/keys.ts:302] [E: packages/tui/src/keys.ts:837] [E: packages/tui/src/keys.ts:838] |
| `tab` | `9` | `tab` | horizontal tab codepoint;用于 Tab 与带 modifier Tab 的 Kitty / modifyOtherKeys 匹配。 | [E: packages/tui/src/keys.ts:303] [E: packages/tui/src/keys.ts:866] [E: packages/tui/src/keys.ts:871] [E: packages/tui/src/keys.ts:874] [E: packages/tui/src/keys.ts:875] |
| `enter` | `13` | `enter` / `return` | carriage return / Enter codepoint;用于 Enter、Shift+Enter、Alt+Enter 等匹配。 | [E: packages/tui/src/keys.ts:304] [E: packages/tui/src/keys.ts:883] [E: packages/tui/src/keys.ts:889] [E: packages/tui/src/keys.ts:903] [E: packages/tui/src/keys.ts:909] [E: packages/tui/src/keys.ts:924] [E: packages/tui/src/keys.ts:929] [E: packages/tui/src/keys.ts:931] |
| `space` | `32` | `space` | space codepoint;用于 plain Space 与带 modifier Space 的 Kitty / modifyOtherKeys 匹配。 | [E: packages/tui/src/keys.ts:305] [E: packages/tui/src/keys.ts:853] [E: packages/tui/src/keys.ts:854] [E: packages/tui/src/keys.ts:858] [E: packages/tui/src/keys.ts:859] |
| `backspace` | `127` | `backspace` | DEL-style Backspace codepoint;用于 Backspace 与 modifier Backspace 的 Kitty / modifyOtherKeys 匹配。 | [E: packages/tui/src/keys.ts:306] [E: packages/tui/src/keys.ts:940] [E: packages/tui/src/keys.ts:941] [E: packages/tui/src/keys.ts:950] [E: packages/tui/src/keys.ts:951] [E: packages/tui/src/keys.ts:957] [E: packages/tui/src/keys.ts:958] [E: packages/tui/src/keys.ts:962] [E: packages/tui/src/keys.ts:963] |
| `kpEnter` | `57414` | formats as `enter` | Kitty protocol numpad Enter codepoint;它在 `CODEPOINTS` 中用于匹配 keypad Enter,但不是 `SpecialKey` 字面量本身 [I]。 | [E: packages/tui/src/keys.ts:307] [E: packages/tui/src/keys.ts:884] [E: packages/tui/src/keys.ts:1230] |

`formatParsedKey()` 把 `CODEPOINTS.enter` 和 `CODEPOINTS.kpEnter` 都格式化成 `enter`,这说明 external key identifier 层不暴露单独的 `kpEnter` 名称 [E: packages/tui/src/keys.ts:1230] [I]。箭头键与 insert/delete/home/end/page keys 使用相邻的 `ARROW_CODEPOINTS` 和 `FUNCTIONAL_CODEPOINTS`,不属于本节点指定的 `CODEPOINTS` 符号覆盖范围 [E: packages/tui/src/keys.ts:310] [E: packages/tui/src/keys.ts:317] [I]。

## Sources

- `packages/tui/src/keys.ts`

## 相关

- `subsys.tui.key-parsing`: 键盘输入解析子系统,应展开 `parseKey`、Kitty keyboard protocol、CSI-u、modifyOtherKeys 与 legacy sequence 如何产生本目录中的 key identifier。
