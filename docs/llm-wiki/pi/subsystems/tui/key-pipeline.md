---
id: subsys.tui.key-pipeline
title: 键盘事件管道
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/terminal.ts, packages/tui/src/stdin-buffer.ts, packages/tui/src/native-modifiers.ts, packages/tui/src/tui.ts]
symbols: [ProcessTerminal, handleInput, forwardInputSequence]
related: [subsys.tui.key-parsing, subsys.tui.stdin-buffer]
evidence: explicit
status: verified
updated: 5a073885
---

> 键盘事件管道把真实终端的 raw stdin 字节流整理成一个个 input sequence，并交给 TUI 的 `handleInput` 做全局过滤、监听器改写、焦点组件分发。

## 能回答的问题

- `ProcessTerminal` 如何从 `process.stdin` 接入键盘输入？
- `StdinBuffer` 为什么要先把 stdin data event 拆成完整 escape sequence？
- Kitty keyboard protocol 协商响应为什么不会直接传给组件？
- Apple Terminal 的 Shift+Enter 在管道里如何被归一化？
- `TUI.handleInput` 在把输入交给 focused component 前会做哪些 gate？

## 职责边界

`ProcessTerminal` 是 OS terminal 到 TUI runtime 的 adapter：`start()` 保存 raw-mode 状态、开启 raw mode、设置 UTF-8 编码、resume stdin、启用 bracketed paste，并注册 resize handler [E: packages/tui/src/terminal.ts:134][E: packages/tui/src/terminal.ts:139][E: packages/tui/src/terminal.ts:141][E: packages/tui/src/terminal.ts:143][E: packages/tui/src/terminal.ts:144][E: packages/tui/src/terminal.ts:147][E: packages/tui/src/terminal.ts:150]。它随后启用 Windows VT input 并发起 Kitty keyboard protocol 查询；查询入口会先建立 `StdinBuffer`，再把 `process.stdin` 的 `"data"` 事件接到 `stdinBuffer.process()` [E: packages/tui/src/terminal.ts:162][E: packages/tui/src/terminal.ts:166][E: packages/tui/src/terminal.ts:221][E: packages/tui/src/terminal.ts:222]。

`StdinBuffer` 的职责是把可能被拆包或合包的 stdin chunk 转成单个可消费序列。它的 `process()` 会追加到内部 buffer、识别 bracketed paste、调用 `extractCompleteSequences()`，并对每个完整序列触发 `"data"` 事件 [E: packages/tui/src/stdin-buffer.ts:287][E: packages/tui/src/stdin-buffer.ts:313][E: packages/tui/src/stdin-buffer.ts:337][E: packages/tui/src/stdin-buffer.ts:371][E: packages/tui/src/stdin-buffer.ts:397]。这层不负责 keybinding 语义；键名解析和匹配属于 [subsys.tui.key-parsing](key-parsing.md) 描述的 `parseKey` / CSI-u 解析链路 [I]。

`TUI.handleInput` 是管道的消费端。`TUI.start()` 把 terminal input callback 绑定为 `(data) => this.handleInput(data)`，因此 `ProcessTerminal.forwardInputSequence()` 传出的 sequence 会进入 `TUI.handleInput` [E: packages/tui/src/tui.ts:635][E: packages/tui/src/tui.ts:638][E: packages/tui/src/terminal.ts:317]。`handleInput` 会先消费终端能力/颜色/尺寸响应，再执行 input listeners、全局 debug shortcut、overlay focus 修正和 focused component 分发 [E: packages/tui/src/tui.ts:761][E: packages/tui/src/tui.ts:762][E: packages/tui/src/tui.ts:769][E: packages/tui/src/tui.ts:787][E: packages/tui/src/tui.ts:792][E: packages/tui/src/tui.ts:827]。

## 关键文件

- `packages/tui/src/terminal.ts`: 定义 `Terminal` interface 与 `ProcessTerminal`；负责 raw stdin、terminal mode、keyboard protocol 协商、`forwardInputSequence()` 和退出清理。
- `packages/tui/src/stdin-buffer.ts`: 定义 `StdinBuffer`；负责 escape sequence 完整性判断、bracketed paste 聚合、timeout flush 和 Kitty printable duplicate 抑制。
- `packages/tui/src/native-modifiers.ts`: 定义 macOS native modifier helper；`forwardInputSequence()` 用它补 Apple Terminal 的 Shift+Enter 缺失信息。
- `packages/tui/src/tui.ts`: 定义 `TUI.handleInput`；负责把 terminal sequence 转成 TUI 组件层输入事件。

## 数据模型

`Terminal.start(onInput, onResize)` 是上层 TUI 与终端 adapter 的关键 contract：上层提供 input callback 和 resize callback，adapter 负责在原始终端事件到来时调用它们 [E: packages/tui/src/terminal.ts:52][E: packages/tui/src/terminal.ts:54]。`ProcessTerminal` 内部保存 `inputHandler`、`resizeHandler`、Kitty/modifyOtherKeys 状态、协商 push flag、协商 buffer/flush timer、`StdinBuffer` 实例和 stdin data listener [E: packages/tui/src/terminal.ts:101][E: packages/tui/src/terminal.ts:102][E: packages/tui/src/terminal.ts:103][E: packages/tui/src/terminal.ts:104][E: packages/tui/src/terminal.ts:105][E: packages/tui/src/terminal.ts:106][E: packages/tui/src/terminal.ts:107][E: packages/tui/src/terminal.ts:108][E: packages/tui/src/terminal.ts:109]。

`StdinBuffer` 的可见事件是 `"data"` 和 `"paste"`：`"data"` 输出单个 sequence，`"paste"` 输出 bracketed paste 的正文 content [E: packages/tui/src/stdin-buffer.ts:265][E: packages/tui/src/stdin-buffer.ts:266][E: packages/tui/src/stdin-buffer.ts:267]。它的内部状态包含普通 buffer、timeout、paste mode、paste buffer 和 `pendingKittyPrintableCodepoint` [E: packages/tui/src/stdin-buffer.ts:275][E: packages/tui/src/stdin-buffer.ts:276][E: packages/tui/src/stdin-buffer.ts:278][E: packages/tui/src/stdin-buffer.ts:279][E: packages/tui/src/stdin-buffer.ts:280]。

## 控制流

1. `TUI.start@packages/tui/src/tui.ts:635` 调用 `terminal.start((data) => this.handleInput(data), () => this.requestRender())`，把键盘输入和 resize 都接入 TUI instance [E: packages/tui/src/tui.ts:635][E: packages/tui/src/tui.ts:637][E: packages/tui/src/tui.ts:638][E: packages/tui/src/tui.ts:639]。
2. `ProcessTerminal.start@packages/tui/src/terminal.ts:134` 进入 raw input mode，开启 bracketed paste，注册 resize，并调用 `queryAndEnableKittyProtocol()` [E: packages/tui/src/terminal.ts:139][E: packages/tui/src/terminal.ts:141][E: packages/tui/src/terminal.ts:147][E: packages/tui/src/terminal.ts:150][E: packages/tui/src/terminal.ts:166]。
3. `queryAndEnableKittyProtocol@packages/tui/src/terminal.ts:220` 调用 `setupStdinBuffer()`，注册 `process.stdin.on("data", this.stdinDataHandler!)`，标记 keyboard protocol 已 push，然后写出 Kitty query sequence [E: packages/tui/src/terminal.ts:221][E: packages/tui/src/terminal.ts:222][E: packages/tui/src/terminal.ts:223][E: packages/tui/src/terminal.ts:225]。
4. `setupStdinBuffer@packages/tui/src/terminal.ts:177` 建立 `new StdinBuffer({ timeout: 10 })`；stdin chunk 会进入 `stdinBuffer.process(data)`，buffer 的 `"data"` 事件再逐个 sequence 执行协议响应识别或 `forwardInputSequence(sequence)` [E: packages/tui/src/terminal.ts:178][E: packages/tui/src/terminal.ts:181][E: packages/tui/src/terminal.ts:182][E: packages/tui/src/terminal.ts:191][E: packages/tui/src/terminal.ts:202][E: packages/tui/src/terminal.ts:203]。
5. `readKeyboardProtocolNegotiationSequence@packages/tui/src/terminal.ts:252` 会把拆开的 Kitty/DA 协商响应暂存在 `keyboardProtocolNegotiationBuffer`；如果只是前缀则返回 `"pending"`，`setupStdinBuffer()` 会安排 150 ms 的 flush timer 等待剩余片段 [E: packages/tui/src/terminal.ts:184][E: packages/tui/src/terminal.ts:257][E: packages/tui/src/terminal.ts:263][E: packages/tui/src/terminal.ts:264][E: packages/tui/src/terminal.ts:271][E: packages/tui/src/terminal.ts:272][E: packages/tui/src/terminal.ts:280][E: packages/tui/src/terminal.ts:295][E: packages/tui/src/terminal.ts:297][E: packages/tui/src/terminal.ts:300]。
6. `handleKeyboardProtocolNegotiationSequence@packages/tui/src/terminal.ts:228` 消费完整协商响应：非零 Kitty flags 会关闭 modifyOtherKeys 并把全局 Kitty protocol active 标记置为 true；零 flags 或 DA fallback 会启用 modifyOtherKeys [E: packages/tui/src/terminal.ts:233][E: packages/tui/src/terminal.ts:234][E: packages/tui/src/terminal.ts:235][E: packages/tui/src/terminal.ts:237][E: packages/tui/src/terminal.ts:238][E: packages/tui/src/terminal.ts:241][E: packages/tui/src/terminal.ts:246][E: packages/tui/src/terminal.ts:247]。
7. `forwardInputSequence@packages/tui/src/terminal.ts:309` 是普通输入进入 TUI 的最后 terminal-side hop：无 `inputHandler` 时直接返回；Apple Terminal 中 `"\r"` 且 native Shift pressed 时会变成 `\x1b[13;2u`，否则保持原 sequence，然后调用 `inputHandler(input)` [E: packages/tui/src/terminal.ts:310][E: packages/tui/src/terminal.ts:311][E: packages/tui/src/terminal.ts:315][E: packages/tui/src/terminal.ts:45][E: packages/tui/src/terminal.ts:46][E: packages/tui/src/terminal.ts:317]。
8. `TUI.handleInput@packages/tui/src/tui.ts:761` 先过滤 OSC 11 background response 和 terminal color scheme report，再让 `inputListeners` 有机会 consume 或改写 data；空字符串会停止传播 [E: packages/tui/src/tui.ts:762][E: packages/tui/src/tui.ts:765][E: packages/tui/src/tui.ts:769][E: packages/tui/src/tui.ts:772][E: packages/tui/src/tui.ts:773][E: packages/tui/src/tui.ts:776][E: packages/tui/src/tui.ts:780]。
9. `TUI.handleInput@packages/tui/src/tui.ts:786` 继续消费 cell-size response 和 global debug key；之后校正 overlay focus，把输入交给 focused component，默认过滤 key release event，最后请求重绘 [E: packages/tui/src/tui.ts:787][E: packages/tui/src/tui.ts:792][E: packages/tui/src/tui.ts:799][E: packages/tui/src/tui.ts:827][E: packages/tui/src/tui.ts:829][E: packages/tui/src/tui.ts:832][E: packages/tui/src/tui.ts:833]。

## 设计动机与权衡

管道把 byte framing 和 semantic key parsing 分开：`StdinBuffer` 在 `isCompleteSequence()` / CSI helper 中做 escape sequence 完整性判断，后续组件或 keybinding 层再解释含义；`TUI.handleInput` 里的全局 debug shortcut 已经是用 `matchesKey` 匹配语义键 [E: packages/tui/src/stdin-buffer.ts:29][E: packages/tui/src/stdin-buffer.ts:84][E: packages/tui/src/tui.ts:792][I]。这个分层降低了 batched input、partial input、paste 和 terminal capability response 互相污染的概率 [I]。

Kitty protocol negotiation 被放在 `StdinBuffer` 之后，而不是直接在 raw stdin 上解析：实际实现先由 buffer 输出 sequence，再用 `readKeyboardProtocolNegotiationSequence()` 累积可能拆分的协商响应 [E: packages/tui/src/terminal.ts:181][E: packages/tui/src/terminal.ts:182][E: packages/tui/src/terminal.ts:255][E: packages/tui/src/terminal.ts:257][E: packages/tui/src/terminal.ts:263]。

bracketed paste 在 terminal 层被拆成 `"paste"` 事件，但又重新包回 `\x1b[200~...\x1b[201~` 交给 `inputHandler`；这等价于让下游继续看到 bracketed paste 格式 [E: packages/tui/src/terminal.ts:195][E: packages/tui/src/terminal.ts:197][I]。

## Gotcha

- `forwardInputSequence()` 不是 key parser；它调用 Apple Terminal Shift+Enter normalization，然后把结果交给 TUI [E: packages/tui/src/terminal.ts:309][E: packages/tui/src/terminal.ts:312][E: packages/tui/src/terminal.ts:45][E: packages/tui/src/terminal.ts:46][E: packages/tui/src/terminal.ts:317]。
- 协议协商响应是输入流的一部分，但被 `handleKeyboardProtocolNegotiationSequence()` 消费后不会传给 focused component [E: packages/tui/src/terminal.ts:187][E: packages/tui/src/terminal.ts:188]。
- `TUI.handleInput` 默认丢弃 key release event，除非 focused component 声明 `wantsKeyRelease` [E: packages/tui/src/tui.ts:829][E: packages/tui/src/tui.ts:830]。
- `drainInput()` 会关闭 Kitty keyboard protocol / modifyOtherKeys 并暂时清空 `inputHandler`；`stop()` 会关闭协议、销毁 `StdinBuffer`、移除 stdin handler 并 pause stdin，避免退出后 late key release 或 buffered input 泄漏到父 shell [E: packages/tui/src/terminal.ts:368][E: packages/tui/src/terminal.ts:374][E: packages/tui/src/terminal.ts:379][E: packages/tui/src/terminal.ts:381][E: packages/tui/src/terminal.ts:382][E: packages/tui/src/terminal.ts:406][E: packages/tui/src/terminal.ts:419][E: packages/tui/src/terminal.ts:424][E: packages/tui/src/terminal.ts:427][E: packages/tui/src/terminal.ts:433][E: packages/tui/src/terminal.ts:446]。

## 跨包边界

这个节点只覆盖 `packages/tui` 内部的 terminal input pipeline。上层 `pi-coding-agent` 的 interactive mode、selectors、editor 等组件会实现或调用 `handleInput(data)`，但它们接收到的已经是 TUI 管道整理后的 sequence [I]。具体 key sequence 到 key id 的转换由 [subsys.tui.key-parsing](key-parsing.md) 覆盖；stdin chunk buffering 的完整算法由 [subsys.tui.stdin-buffer](stdin-buffer.md) 覆盖。

## Sources

- packages/tui/src/terminal.ts
- packages/tui/src/stdin-buffer.ts
- packages/tui/src/native-modifiers.ts
- packages/tui/src/tui.ts

## 相关

- [subsys.tui.key-parsing](key-parsing.md): 解释 `parseKey`、Kitty CSI-u 和 modifyOtherKeys 序列如何变成 key id。
- [subsys.tui.stdin-buffer](stdin-buffer.md): 解释 `StdinBuffer` 如何判定完整 escape sequence、处理 paste 和 timeout flush。
