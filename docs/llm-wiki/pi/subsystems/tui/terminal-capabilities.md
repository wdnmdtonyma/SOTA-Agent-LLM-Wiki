---
id: subsys.tui.terminal-capabilities
title: 终端能力检测(kitty 协议)
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/terminal.ts]
symbols: [queryAndEnableKittyProtocol, setKittyProtocolActive]
related: [subsys.tui.key-parsing, subsys.tui.terminal-image, subsys.tui.native-modifiers]
evidence: explicit
status: verified
updated: 71dca871bc
---

> `terminal-capabilities` 是 `ProcessTerminal` 在 TUI 启动和退出时协商 keyboard protocol 的能力层: 优先启用 Kitty keyboard protocol, 未收到 Kitty 支持信号时降级到 xterm `modifyOtherKeys`, 并把 active state 同步给 key parsing。

## 能回答的问题

- TUI 启动时如何探测 Kitty keyboard protocol?
- `queryAndEnableKittyProtocol()` 为什么同时发送 Kitty query 和 Device Attributes query?
- 什么时候会启用 `modifyOtherKeys` fallback?
- `setKittyProtocolActive(true/false)` 在终端生命周期中何时被调用?
- 退出或 drain input 时如何关闭 Kitty protocol, 避免 key release escape sequence 泄漏到 parent shell?
- hyperlink / image / truecolor 覆盖是本节点还是 `terminal-image`?

## 职责边界

本节点覆盖 `packages/tui/src/terminal.ts` 里的 terminal capability negotiation: raw mode 之后安装 stdin buffer、发送 Kitty keyboard protocol query、解析 negotiation response、维护 `_kittyProtocolActive` / `_modifyOtherKeysActive` state、退出时关闭 protocol。`subsys.tui.key-parsing` 覆盖 raw key sequence 如何被解析成 `KeyId`; 本节点只说明解析层所依赖的 protocol active state 如何建立和清理。

OSC 8 hyperlink、inline image protocol、truecolor **不是**本文件的 negotiation。它们由 `packages/tui/src/terminal-image.ts` 的 `detectCapabilities()` / `setCapabilityOverrides()` 与 env `PI_HYPERLINKS`、`PI_IMAGE_PROTOCOL`、`PI_TRUE_COLOR` 覆盖;权威节点是 [subsys.tui.terminal-image](terminal-image.md)。`ProcessTerminal.enableWindowsVTInput()` 用同一套 `getNativeModuleCandidates()` 加载 Win32 helper,路径解析见 [subsys.tui.native-modifiers](native-modifiers.md) [E: packages/tui/src/terminal.ts:376] [E: packages/tui/src/terminal.ts:385]。

`Terminal` interface 把 `kittyProtocolActive` 暴露成只读 terminal capability, `ProcessTerminal` 用私有 `_kittyProtocolActive` 保存实际状态并通过 getter 返回 [E: packages/tui/src/terminal.ts:94] [E: packages/tui/src/terminal.ts:141] [E: packages/tui/src/terminal.ts:164]。`ProcessTerminal` 还跟踪 `_modifyOtherKeysActive`; fallback 启用路径会检查该状态、写入 `modifyOtherKeys` enable sequence, 再标记 active [E: packages/tui/src/terminal.ts:142] [E: packages/tui/src/terminal.ts:358] [E: packages/tui/src/terminal.ts:359] [E: packages/tui/src/terminal.ts:360]。

## 关键文件

- `packages/tui/src/terminal.ts`: 定义 `Terminal` / `ProcessTerminal`, 启动 raw terminal, 查询 Kitty keyboard protocol, 处理 negotiation response, 启用或禁用 `modifyOtherKeys`, 并在 `drainInput()` / `stop()` 里恢复 terminal state。

## 数据模型

`KeyboardProtocolNegotiationSequence` 只有两类输入: `{ type: "kitty-flags"; flags: number }` 表示 Kitty flag response, `{ type: "device-attributes" }` 表示 DA sentinel response [E: packages/tui/src/terminal.ts:16] [E: packages/tui/src/terminal.ts:17] [E: packages/tui/src/terminal.ts:18]。`parseKeyboardProtocolNegotiationSequence()` 把 `ESC[?<digits>u` 解析为 Kitty flags, 把 `ESC[?<digits-or-semicolons>c` 解析为 Device Attributes, 其他 sequence 返回 `undefined` [E: packages/tui/src/terminal.ts:23] [E: packages/tui/src/terminal.ts:25] [E: packages/tui/src/terminal.ts:27] [E: packages/tui/src/terminal.ts:28] [E: packages/tui/src/terminal.ts:30]。

Kitty query 常量由三段组成: 先请求 desired flags `7`, 再查询当前 flags, 最后发送 Device Attributes query 作为 non-Kitty terminal 的 sentinel [E: packages/tui/src/terminal.ts:12] [E: packages/tui/src/terminal.ts:14]。常量 `7` 的 flags 语义在本节点中只作为 modified-key 与 release/repeat 支持的解读 [I]。

## 控制流

1. `start@packages/tui/src/terminal.ts:161` 保存 input / resize handler, 开启 raw mode, 设置 stdin encoding 并 resume stdin [E: packages/tui/src/terminal.ts:173] [E: packages/tui/src/terminal.ts:174] [E: packages/tui/src/terminal.ts:177] [E: packages/tui/src/terminal.ts:179] [E: packages/tui/src/terminal.ts:181] [E: packages/tui/src/terminal.ts:182]。
2. `start()` 先启用 bracketed paste mode、注册 resize handler、刷新 terminal dimensions, 再调用 Windows VT input helper, 最后调用 `queryAndEnableKittyProtocol()` [E: packages/tui/src/terminal.ts:185] [E: packages/tui/src/terminal.ts:188] [E: packages/tui/src/terminal.ts:49] [E: packages/tui/src/terminal.ts:198] [E: packages/tui/src/terminal.ts:202]。
3. `queryAndEnableKittyProtocol@packages/tui/src/terminal.ts:247` 创建 `StdinBuffer`, 把 stdin data 接入 buffer, 标记 `keyboardProtocolPushed = true`, 清空 negotiation buffer, 然后向 stdout 写入 `KITTY_KEYBOARD_PROTOCOL_QUERY` [E: packages/tui/src/terminal.ts:257] [E: packages/tui/src/terminal.ts:258] [E: packages/tui/src/terminal.ts:259] [E: packages/tui/src/terminal.ts:260] [E: packages/tui/src/terminal.ts:261]。
4. `setupStdinBuffer@packages/tui/src/terminal.ts:204` 创建 `StdinBuffer`, 并让 stdin data 先进入 buffer; 每个 buffer 输出的 sequence 先经过 `readKeyboardProtocolNegotiationSequence()`, pending 时等待后续片段, recognized negotiation sequence 被 `handleKeyboardProtocolNegotiationSequence()` 消费, 其余 sequence 才转发到 normal input handler [E: packages/tui/src/terminal.ts:213] [E: packages/tui/src/terminal.ts:214] [E: packages/tui/src/terminal.ts:217] [E: packages/tui/src/terminal.ts:218] [E: packages/tui/src/terminal.ts:220] [E: packages/tui/src/terminal.ts:223] [E: packages/tui/src/terminal.ts:227] [E: packages/tui/src/terminal.ts:238] [E: packages/tui/src/terminal.ts:239]。
5. `readKeyboardProtocolNegotiationSequence@packages/tui/src/terminal.ts:279` 支持 response 被拆包: 已有 buffer 时先拼接再 parse, 仍是 prefix 就继续 pending, 拼不成 negotiation sequence 就把旧 buffer 当普通 input 转发 [E: packages/tui/src/terminal.ts:291] [E: packages/tui/src/terminal.ts:292] [E: packages/tui/src/terminal.ts:293] [E: packages/tui/src/terminal.ts:298] [E: packages/tui/src/terminal.ts:299] [E: packages/tui/src/terminal.ts:302]。pending flush timer 为 150ms, 到时仍未补齐就把 buffer 转回 input [E: packages/tui/src/terminal.ts:13] [E: packages/tui/src/terminal.ts:331] [E: packages/tui/src/terminal.ts:333] [E: packages/tui/src/terminal.ts:335]。
6. `handleKeyboardProtocolNegotiationSequence@packages/tui/src/terminal.ts:255` 收到 non-zero Kitty flags 时关闭 `modifyOtherKeys`, 设置 `_kittyProtocolActive = true`, 并调用 `setKittyProtocolActive(true)` [E: packages/tui/src/terminal.ts:269] [E: packages/tui/src/terminal.ts:270] [E: packages/tui/src/terminal.ts:271] [E: packages/tui/src/terminal.ts:273] [E: packages/tui/src/terminal.ts:274]。
7. 如果 Kitty flags 为 `0`, 或先收到 Device Attributes 且 Kitty 还未 active, `ProcessTerminal` 调用 `enableModifyOtherKeys()` fallback [E: packages/tui/src/terminal.ts:276] [E: packages/tui/src/terminal.ts:277] [E: packages/tui/src/terminal.ts:282] [E: packages/tui/src/terminal.ts:283]。`enableModifyOtherKeys()` 在 Kitty 已 active 或 fallback 已 active 时直接返回, 否则写入 `ESC[>4;2m` 并标记 `_modifyOtherKeysActive = true` [E: packages/tui/src/terminal.ts:358] [E: packages/tui/src/terminal.ts:359] [E: packages/tui/src/terminal.ts:360]。
8. `drainInput@packages/tui/src/terminal.ts:390` 和 `stop@packages/tui/src/terminal.ts:428` 都会在需要时写入 `ESC[<u` 关闭 Kitty keyboard protocol, 清掉 `_kittyProtocolActive`, 并调用 `setKittyProtocolActive(false)` [E: packages/tui/src/terminal.ts:385] [E: packages/tui/src/terminal.ts:390] [E: packages/tui/src/terminal.ts:392] [E: packages/tui/src/terminal.ts:393] [E: packages/tui/src/terminal.ts:430] [E: packages/tui/src/terminal.ts:435] [E: packages/tui/src/terminal.ts:437] [E: packages/tui/src/terminal.ts:438]。

## 设计动机与权衡

Kitty negotiation 使用 "request desired flags + query flags + DA sentinel" 的 progressive enhancement pattern: query 常量发送 desired flags、当前 flags query 和 DA query;收到 DA 且 Kitty 还未 active 时会启用 `modifyOtherKeys` fallback [E: packages/tui/src/terminal.ts:14] [E: packages/tui/src/terminal.ts:261] [E: packages/tui/src/terminal.ts:282] [E: packages/tui/src/terminal.ts:283] [I]。

把 negotiation response 放在 `StdinBuffer` 之后处理, 是为了兼容 response 被拆成多个 input event 的情况;源码在 buffer handler 中专门处理 pending prefix, 并用 150ms timeout 防止不完整 prefix 永久截留用户输入 [E: packages/tui/src/terminal.ts:217] [E: packages/tui/src/terminal.ts:220] [E: packages/tui/src/terminal.ts:307] [E: packages/tui/src/terminal.ts:308] [E: packages/tui/src/terminal.ts:309] [E: packages/tui/src/terminal.ts:331] [E: packages/tui/src/terminal.ts:336] [I]。

`drainInput()` 先写入 Kitty protocol disable sequence 再等待 stdin 空闲;该函数还临时移除 input handler, 用 data listener 更新 `lastDataTime`, idle 达标或超过 max duration 后恢复 handler [E: packages/tui/src/terminal.ts:385] [E: packages/tui/src/terminal.ts:390] [E: packages/tui/src/terminal.ts:397] [E: packages/tui/src/terminal.ts:398] [E: packages/tui/src/terminal.ts:401] [E: packages/tui/src/terminal.ts:402] [E: packages/tui/src/terminal.ts:405] [E: packages/tui/src/terminal.ts:412] [E: packages/tui/src/terminal.ts:413] [E: packages/tui/src/terminal.ts:417] [E: packages/tui/src/terminal.ts:418]。

## Gotcha

- `queryAndEnableKittyProtocol()` 是 `ProcessTerminal` 的 private method, 不是 package export;索引把它列为 symbol, 是因为它是 capability negotiation 的负载点 [E: packages/tui/src/terminal.ts:256] [I]。
- `setKittyProtocolActive` 在 `terminal.ts` 中是 import 后调用的同步点, 定义位于 key parsing 相关模块;本节点按用户给定 source 只引用 `terminal.ts` 中的调用位置, 不把定义文件纳入 Sources [E: packages/tui/src/terminal.ts:3] [E: packages/tui/src/terminal.ts:274] [E: packages/tui/src/terminal.ts:393] [E: packages/tui/src/terminal.ts:438] [U]。
- fallback `modifyOtherKeys` 与 Kitty protocol 互斥:启用 fallback 前会检查 `_kittyProtocolActive`, 收到 non-zero Kitty flags 时也会调用 `disableModifyOtherKeys()` [E: packages/tui/src/terminal.ts:271] [E: packages/tui/src/terminal.ts:358]。
- `stop()` 在关闭 protocol 后还销毁 `StdinBuffer`、移除 stdin/resize handler、pause stdin、恢复 raw mode;因此 terminal capability cleanup 是 terminal lifecycle cleanup 的一部分, 不是 key parsing 层单独完成的 [E: packages/tui/src/terminal.ts:443] [E: packages/tui/src/terminal.ts:444] [E: packages/tui/src/terminal.ts:450] [E: packages/tui/src/terminal.ts:455] [E: packages/tui/src/terminal.ts:462] [E: packages/tui/src/terminal.ts:466] [I]。

## 跨包边界

本节点属于 `pkg: tui`, 不跨到 `agent` 或 `coding-agent` runtime。它对 `subsys.tui.key-parsing` 的依赖是同包内状态传递: terminal negotiation 决定 Kitty protocol 是否 active, key parsing 再用该状态解释 ambiguous legacy sequences 和 modern CSI-u / `modifyOtherKeys` sequence [I]。

## Sources

- packages/tui/src/terminal.ts

## 相关

- [subsys.tui.key-parsing](key-parsing.md): 解释 `KeyId`、Kitty CSI-u、xterm `modifyOtherKeys` 和 legacy sequence 如何被解析与匹配。
- [subsys.tui.terminal-image](terminal-image.md): hyperlink / image / truecolor 检测与 `setCapabilityOverrides()` / `PI_*` env 覆盖。
- [subsys.tui.native-modifiers](native-modifiers.md): `getNativeModuleCandidates()` 解析 Darwin/Win32 `.node`,供 `enableWindowsVTInput()` 复用。
