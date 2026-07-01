---
id: subsys.tui.key-parsing
title: 键盘序列解析(kitty/CSI-u)
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/keys.ts
symbols:
  - parseKey
  - parseKittySequence
  - parseModifyOtherKeysSequence
related:
  - subsys.tui.key-pipeline
  - subsys.tui.keybinding-matching
  - ref.tui.key-codes
evidence: explicit
status: verified
updated: 8c943640
---

> `key-parsing` 是 TUI 把 raw terminal input 转成稳定 `KeyId` 字符串的解析层: 它优先识别 Kitty/CSI-u 和 xterm `modifyOtherKeys`, 再落到 legacy escape/control-byte fallback。

## 能回答的问题

- `parseKey(data)` 如何把 `\x1b[99;5u` 解析成 `ctrl+c`?
- Kitty keyboard protocol 的 `codepoint[:shifted[:base]];modifier[:event]u` 在源码里如何拆字段?
- xterm `modifyOtherKeys` 的 `CSI 27 ; modifiers ; keycode ~` 和 Kitty CSI-u 的差异是什么?
- `parseKey()` 在 Kitty protocol active 时为什么把 `\n` 当作 `shift+enter`?
- non-Latin layout、Dvorak/Colemak remap、keypad functional keys 和 Caps Lock/Num Lock 对 key name 有什么影响?
- `parseKey()` 与 `matchesKey()` 的职责边界在哪里?

## 职责边界

`packages/tui/src/keys.ts` 同时包含 parsing、matching、printable decoding 和 Kitty protocol state; 本节点只权威覆盖 `parseKey()`、`parseKittySequence()`、`parseModifyOtherKeysSequence()` 以及它们直接依赖的 key-name formatting 规则 [E: packages/tui/src/keys.ts:587] [E: packages/tui/src/keys.ts:696] [E: packages/tui/src/keys.ts:1212] [E: packages/tui/src/keys.ts:1251]。

`parseKey(data)` 的输出是 key identifier string; 识别成功时从 `formatParsedKey()` 或 legacy fallback 返回字符串, 未识别时返回 `undefined` [E: packages/tui/src/keys.ts:1254] [E: packages/tui/src/keys.ts:1259] [E: packages/tui/src/keys.ts:1267] [E: packages/tui/src/keys.ts:1325]。它不判断某个 binding 是否命中; binding matching 属于 [subsys.tui.keybinding-matching](keybinding-matching.md), 其入口是同文件里的 `matchesKey(data, keyId)` [E: packages/tui/src/keys.ts:820]。

输入 chunk 的边界、Kitty protocol negotiation、bracketed paste re-wrap 和 modifyOtherKeys fallback enablement 不在本节点内; 这些由 [subsys.tui.key-pipeline](key-pipeline.md) 覆盖, `keys.ts` 只保存一个全局 `_kittyProtocolActive` flag 供解析 legacy ambiguity 时使用 [E: packages/tui/src/keys.ts:25] [E: packages/tui/src/keys.ts:31] [E: packages/tui/src/keys.ts:38] [I]。

## 关键文件

- `packages/tui/src/keys.ts`: 定义 `KeyId`、`Key` helper、modifier bitmask、codepoint table、legacy sequence table、Kitty/CSI-u parser、modifyOtherKeys parser、`parseKey()` 和 printable decoding [E: packages/tui/src/keys.ts:152] [E: packages/tui/src/keys.ts:163] [E: packages/tui/src/keys.ts:292] [E: packages/tui/src/keys.ts:301] [E: packages/tui/src/keys.ts:368] [E: packages/tui/src/keys.ts:587] [E: packages/tui/src/keys.ts:696] [E: packages/tui/src/keys.ts:1251] [E: packages/tui/src/keys.ts:1349]。

## 数据模型

`KeyId` 是 base key 与 modifier-composed key 的 TypeScript union; base key 覆盖 letters、digits、symbol keys 和 special keys, modifiers 使用 `ctrl`、`shift`、`alt`、`super` 这些英文前缀组合成 `ctrl+shift+p` 形式 [E: packages/tui/src/keys.ts:141] [E: packages/tui/src/keys.ts:142] [E: packages/tui/src/keys.ts:144] [E: packages/tui/src/keys.ts:152]。

modifier bitmask 在解析层使用 Kitty/xterm 的 one-indexed modifier value 减一后的结果: `shift=1`、`alt=2`、`ctrl=4`、`super=8`; Caps Lock 和 Num Lock 被 `LOCK_MASK = 64 + 128` 单独剥离, 因此锁定键不会改变最终 modifier name [E: packages/tui/src/keys.ts:292] [E: packages/tui/src/keys.ts:299] [E: packages/tui/src/keys.ts:606] [E: packages/tui/src/keys.ts:701] [E: packages/tui/src/keys.ts:778] [E: packages/tui/src/keys.ts:785]。

`ParsedKittySequence` 保存 `codepoint`、可选 `shiftedKey`、可选 `baseLayoutKey`、normalized `modifier` 和 `eventType`; `baseLayoutKey` 表示 standard PC-101 layout 上的 key, 用来支持 non-Latin layout 的 logical key name fallback [E: packages/tui/src/keys.ts:507] [E: packages/tui/src/keys.ts:508] [E: packages/tui/src/keys.ts:509] [E: packages/tui/src/keys.ts:510] [E: packages/tui/src/keys.ts:511] [E: packages/tui/src/keys.ts:512]。

`ParsedModifyOtherKeysSequence` 只有 `codepoint` 和 normalized `modifier`; 它来自 xterm `CSI 27 ; modifiers ; keycode ~` 形式, 没有 Kitty alternate-key 的 `shiftedKey` / `baseLayoutKey` 字段 [E: packages/tui/src/keys.ts:515] [E: packages/tui/src/keys.ts:516] [E: packages/tui/src/keys.ts:517] [E: packages/tui/src/keys.ts:696] [E: packages/tui/src/keys.ts:697]。

## 控制流

1. `parseKey@packages/tui/src/keys.ts:1251` 先调用 `parseKittySequence(data)`; 如果返回 parsed Kitty event, 立即用 `formatParsedKey(codepoint, modifier, baseLayoutKey)` 产出 key identifier [E: packages/tui/src/keys.ts:1252] [E: packages/tui/src/keys.ts:1254]。
2. `parseKittySequence@packages/tui/src/keys.ts:587` 首先匹配 CSI-u regex, 支持 plain `\x1b[<codepoint>u`、带 modifier 的 `;<mod>u`、带 event type 的 `:<event>u`、以及 Kitty flag 4 alternate keys 的 `codepoint:shifted:base` 形式 [E: packages/tui/src/keys.ts:598] [E: packages/tui/src/keys.ts:600] [E: packages/tui/src/keys.ts:601] [E: packages/tui/src/keys.ts:602] [E: packages/tui/src/keys.ts:603] [E: packages/tui/src/keys.ts:604] [E: packages/tui/src/keys.ts:606]。
3. 同一个 Kitty parser 还识别 modified arrow `\x1b[1;<mod>A/B/C/D`、functional `\x1b[<num>[;<mod>]~`、modified Home/End `\x1b[1;<mod>H/F`; 这些分支把 terminal-specific suffix 映射成内部 negative codepoint 或 named functional codepoint [E: packages/tui/src/keys.ts:610] [E: packages/tui/src/keys.ts:614] [E: packages/tui/src/keys.ts:616] [E: packages/tui/src/keys.ts:620] [E: packages/tui/src/keys.ts:625] [E: packages/tui/src/keys.ts:636] [E: packages/tui/src/keys.ts:641] [E: packages/tui/src/keys.ts:645]。
4. 如果 Kitty parser 没命中, `parseKey()` 调用 `parseModifyOtherKeysSequence(data)`; 该 parser 只接受 `^\x1b\[27;(\d+);(\d+)~$`, 把 modifier value 减一后与 codepoint 一起交给 `formatParsedKey()` [E: packages/tui/src/keys.ts:1257] [E: packages/tui/src/keys.ts:1259] [E: packages/tui/src/keys.ts:697] [E: packages/tui/src/keys.ts:699] [E: packages/tui/src/keys.ts:700] [E: packages/tui/src/keys.ts:701]。
5. `formatParsedKey@packages/tui/src/keys.ts:1212` 先把 Kitty keypad functional codepoint 归一成 logical digits、symbols 或 navigation keys, 再把 Shift-modified uppercase Latin letter identity 归一成 lowercase identity codepoint [E: packages/tui/src/keys.ts:326] [E: packages/tui/src/keys.ts:356] [E: packages/tui/src/keys.ts:360] [E: packages/tui/src/keys.ts:1213] [E: packages/tui/src/keys.ts:1214]。
6. `formatParsedKey()` 只在 codepoint 不是 recognized Latin letter、digit 或 known symbol 时使用 `baseLayoutKey`; recognized Latin letter、digit 或 known symbol 仍以 normalized identity codepoint 为准 [E: packages/tui/src/keys.ts:1221] [E: packages/tui/src/keys.ts:1222] [E: packages/tui/src/keys.ts:1223] [E: packages/tui/src/keys.ts:1224] [E: packages/tui/src/keys.ts:1225]。
7. `formatKeyNameWithModifiers@packages/tui/src/keys.ts:776` 按固定顺序输出 modifier prefix: `shift`、`ctrl`、`alt`、`super`; 如果 modifier 含这四种以外的 effective bits, 返回 `undefined`, 因而 unsupported modifier bits 会让 modern sequence 解析失败 [E: packages/tui/src/keys.ts:780] [E: packages/tui/src/keys.ts:781] [E: packages/tui/src/keys.ts:782] [E: packages/tui/src/keys.ts:783] [E: packages/tui/src/keys.ts:784] [E: packages/tui/src/keys.ts:1248] [E: packages/tui/src/keys.ts:1254] [E: packages/tui/src/keys.ts:1259]。
8. 若两种 modern sequence 都没命中, `parseKey()` 进入 mode-aware legacy fallback: Kitty protocol active 时 `\x1b\r` 和 `\n` 解析成 `shift+enter`; Kitty inactive 时 `\n` 是 `enter`, `\x1b\r` 是 `alt+enter` [E: packages/tui/src/keys.ts:1252] [E: packages/tui/src/keys.ts:1257] [E: packages/tui/src/keys.ts:1266] [E: packages/tui/src/keys.ts:1267] [E: packages/tui/src/keys.ts:1283] [E: packages/tui/src/keys.ts:1289]。
9. Legacy table lookup `LEGACY_SEQUENCE_KEY_IDS[data]` covers named arrows, Home/End, insert/delete/page keys, F keys, shifted/ctrl variants and a few alt movement sequences before the hand-coded single-byte fallback runs [E: packages/tui/src/keys.ts:423] [E: packages/tui/src/keys.ts:427] [E: packages/tui/src/keys.ts:433] [E: packages/tui/src/keys.ts:438] [E: packages/tui/src/keys.ts:440] [E: packages/tui/src/keys.ts:444] [E: packages/tui/src/keys.ts:456] [E: packages/tui/src/keys.ts:477] [E: packages/tui/src/keys.ts:480] [E: packages/tui/src/keys.ts:1270] [E: packages/tui/src/keys.ts:1271]。
10. The final fallback maps raw control bytes and simple printable bytes: `\x1c` -> `ctrl+\`, `\x1d` -> `ctrl+]`, `\x1f` -> `ctrl+-`, `\x00` -> `ctrl+space`, `\x7f` -> `backspace`, one-byte control codes 1..26 -> `ctrl+a`..`ctrl+z`, and ASCII printable bytes to themselves [E: packages/tui/src/keys.ts:1274] [E: packages/tui/src/keys.ts:1275] [E: packages/tui/src/keys.ts:1276] [E: packages/tui/src/keys.ts:1277] [E: packages/tui/src/keys.ts:1284] [E: packages/tui/src/keys.ts:1286] [E: packages/tui/src/keys.ts:1315] [E: packages/tui/src/keys.ts:1318] [E: packages/tui/src/keys.ts:1321]。

## 设计动机与权衡

Modern sequences are attempted before legacy sequences because CSI-u and modifyOtherKeys carry explicit modifier/codepoint data, while legacy bytes like `\x08`, `\n`, and ESC-prefixed two-byte forms are ambiguous across terminals [E: packages/tui/src/keys.ts:1252] [E: packages/tui/src/keys.ts:1257] [E: packages/tui/src/keys.ts:1266] [I]。

Kitty keypad functional codepoints are normalized to logical keys, so numpad digits and operators parse like ordinary digits/operators, and keypad navigation codepoints parse like `left`/`right`/`up`/`down`/`pageUp`/`delete` instead of leaking Kitty private codepoint numbers [E: packages/tui/src/keys.ts:326] [E: packages/tui/src/keys.ts:327] [E: packages/tui/src/keys.ts:337] [E: packages/tui/src/keys.ts:341] [E: packages/tui/src/keys.ts:344] [E: packages/tui/src/keys.ts:353] [E: packages/tui/src/keys.ts:1213] [E: packages/tui/src/keys.ts:1233] [E: packages/tui/src/keys.ts:1237] [E: packages/tui/src/keys.ts:1239] [E: packages/tui/src/keys.ts:1245]。

The base-layout fallback is intentionally conservative: it helps non-Latin layouts recover Latin shortcut names, but avoids treating physical QWERTY position as authoritative when the reported codepoint is already a Latin letter, digit, or known symbol [E: packages/tui/src/keys.ts:1221] [E: packages/tui/src/keys.ts:1225] [I]。

`parseKey()` includes a Windows Terminal heuristic for raw `0x08`: local Windows Terminal without SSH parses `\x08` as `ctrl+backspace`, while other environments parse it as plain `backspace`; explicit Kitty/CSI-u/modifyOtherKeys forms are attempted before this raw-byte fallback [E: packages/tui/src/keys.ts:717] [E: packages/tui/src/keys.ts:1252] [E: packages/tui/src/keys.ts:1257] [E: packages/tui/src/keys.ts:1287]。

## Gotcha

- `parseKittySequence()` and `parseModifyOtherKeysSequence()` are local functions, not exported package API; the index symbols name them because they are load-bearing implementation symbols for this node [E: packages/tui/src/keys.ts:587] [E: packages/tui/src/keys.ts:696] [I]。
- `parseKey()` parses Kitty release/repeat sequences into the same key identifier shape as press sequences; release/repeat status is exposed by `isKeyRelease(data)` / `isKeyRepeat(data)`, which scan the raw sequence for Kitty flag-2 event markers [E: packages/tui/src/keys.ts:527] [E: packages/tui/src/keys.ts:539] [E: packages/tui/src/keys.ts:557] [E: packages/tui/src/keys.ts:565] [E: packages/tui/src/keys.ts:579] [E: packages/tui/src/keys.ts:604] [E: packages/tui/src/keys.ts:1252] [I]。
- Bracketed paste content is explicitly excluded from `isKeyRelease()` / `isKeyRepeat()` substring detection because pasted text can contain strings like `:3F`; this protects event-type classification, not `parseKey()` itself [E: packages/tui/src/keys.ts:527] [E: packages/tui/src/keys.ts:532] [E: packages/tui/src/keys.ts:539] [E: packages/tui/src/keys.ts:557] [E: packages/tui/src/keys.ts:560] [I]。
- `shiftedKey` is parsed from Kitty alternate-key CSI-u, but `formatParsedKey()` currently receives `codepoint` and optional `baseLayoutKey` for key identifiers; shifted printable insertion is handled separately by `decodeKittyPrintable()` [E: packages/tui/src/keys.ts:601] [E: packages/tui/src/keys.ts:1212] [E: packages/tui/src/keys.ts:1254] [E: packages/tui/src/keys.ts:1349] [E: packages/tui/src/keys.ts:1369] [I]。

## 跨包边界

本节点只属于 `pkg: tui`。coding-agent 的 keybindings 配置最终会引用 TUI `KeyId` 字符串和 TUI matching behavior, 但配置加载、迁移、冲突检测属于 coding-agent 节点, 不是 `parseKey()` 的职责 [I]。

## Sources

- `packages/tui/src/keys.ts`

## 相关

- [subsys.tui.key-pipeline](key-pipeline.md): 描述 raw stdin 如何被缓冲、拆成完整序列并启用 Kitty / modifyOtherKeys 模式。
- [subsys.tui.keybinding-matching](keybinding-matching.md): 描述 `matchesKey(data, keyId)` 如何把 raw sequence 与用户或内置 binding 对齐。
- [ref.tui.key-codes](../../reference/key-codes.md): 目录化列出 base/special key、codepoint 与 modifier 语义。
