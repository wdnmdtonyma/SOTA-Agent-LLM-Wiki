---
id: subsys.tui.stdin-buffer
title: stdin 序列缓冲
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/stdin-buffer.ts]
symbols: [StdinBuffer, isCompleteSequence]
related: [subsys.tui.key-pipeline]
evidence: explicit
status: verified
updated: 5a073885
---

> `StdinBuffer` 是 TUI stdin byte stream 的 framing layer：它把可能被拆包、合包或处于 bracketed paste 的输入整理成完整 input sequence，再用 EventEmitter 发给上游管道。

## 能回答的问题

- 为什么 raw stdin chunk 不能直接当作 key sequence 使用？
- `isCompleteSequence` 如何判断 ESC、CSI、OSC、DCS、APC、SS3 和 Meta key sequence 是否完整？
- `StdinBuffer.process()` 如何处理 split input、batched input、timeout flush 和 bracketed paste？
- Kitty keyboard protocol 下 `ESC ESC CSI-u` 和 printable duplicate 为什么需要特殊处理？
- `flush()`、`clear()`、`destroy()` 分别会保留或丢弃哪些内部状态？

## 职责边界

`StdinBufferEventMap` 只声明 `"data"` 和 `"paste"` 两个事件，payload 都是 string [E: packages/tui/src/stdin-buffer.ts:265][E: packages/tui/src/stdin-buffer.ts:266][E: packages/tui/src/stdin-buffer.ts:267]；本节点据此只覆盖 input framing，不覆盖 sequence 到 key id、keybinding 或组件动作的解释 [I]。`isCompleteSequence` 是本文件内的 helper function，不是 exported API；index 把它列入 `symbols` 是为了覆盖这段完整性判定逻辑 [E: packages/tui/src/stdin-buffer.ts:29][I]。

`StdinBuffer` 的默认等待窗口是 10 ms：constructor 从 `options.timeout` 读取值，未传入时使用 `10` [E: packages/tui/src/stdin-buffer.ts:282][E: packages/tui/src/stdin-buffer.ts:284]。这个 timeout 的语义是：如果当前 buffer 里还有 incomplete sequence，`process()` 会安排 timer，timer 到期后调用 `flush()` 并把 flush 出来的字符串作为 `"data"` sequence 发出 [E: packages/tui/src/stdin-buffer.ts:378][E: packages/tui/src/stdin-buffer.ts:379][E: packages/tui/src/stdin-buffer.ts:380][E: packages/tui/src/stdin-buffer.ts:383]。

## 关键文件

- `packages/tui/src/stdin-buffer.ts`: 定义 ESC 常量、bracketed paste markers、escape sequence 完整性 helpers、`extractCompleteSequences()`、`StdinBufferOptions`、`StdinBufferEventMap` 和 `StdinBuffer` class。

## 数据模型

`StdinBufferOptions` 目前只有 `timeout?: number`，控制 incomplete sequence 最多等待多久 [E: packages/tui/src/stdin-buffer.ts:257][E: packages/tui/src/stdin-buffer.ts:262]。`StdinBufferEventMap` 暴露两个 string payload 事件：`data` 和 `paste` [E: packages/tui/src/stdin-buffer.ts:265][E: packages/tui/src/stdin-buffer.ts:266][E: packages/tui/src/stdin-buffer.ts:267]；`process()` 会把完整 sequence 和 timeout flush 出来的 sequence 交给 `emitDataSequence()`，后者 emit `"data"` [E: packages/tui/src/stdin-buffer.ts:374][E: packages/tui/src/stdin-buffer.ts:375][E: packages/tui/src/stdin-buffer.ts:382][E: packages/tui/src/stdin-buffer.ts:383][E: packages/tui/src/stdin-buffer.ts:397]。paste start marker 会在进入 paste mode 前被切掉，end marker 之前的内容才会 emit 为 `"paste"` [E: packages/tui/src/stdin-buffer.ts:348][E: packages/tui/src/stdin-buffer.ts:350][E: packages/tui/src/stdin-buffer.ts:355][E: packages/tui/src/stdin-buffer.ts:362]。

`StdinBuffer` 内部有五类状态：普通 `buffer` 累积未完成 sequence，`timeout` 保存 pending timer，`pasteMode` / `pasteBuffer` 收集 bracketed paste，`pendingKittyPrintableCodepoint` 保存待抑制的 Kitty printable codepoint [E: packages/tui/src/stdin-buffer.ts:275][E: packages/tui/src/stdin-buffer.ts:276][E: packages/tui/src/stdin-buffer.ts:278][E: packages/tui/src/stdin-buffer.ts:279][E: packages/tui/src/stdin-buffer.ts:280]；当后续单字符的 codepoint 与该 pending 值相同，`emitDataSequence()` 会清掉 pending 并跳过 emit [E: packages/tui/src/stdin-buffer.ts:390][E: packages/tui/src/stdin-buffer.ts:391][E: packages/tui/src/stdin-buffer.ts:392][E: packages/tui/src/stdin-buffer.ts:393]。

bracketed paste markers 固定为 `\x1b[200~` 和 `\x1b[201~`；`process()` 遇到 start marker 后进入 paste mode，直到 paste buffer 中出现 end marker 才 emit `"paste"` [E: packages/tui/src/stdin-buffer.ts:23][E: packages/tui/src/stdin-buffer.ts:24][E: packages/tui/src/stdin-buffer.ts:337][E: packages/tui/src/stdin-buffer.ts:349][E: packages/tui/src/stdin-buffer.ts:353][E: packages/tui/src/stdin-buffer.ts:362]。

## 完整性判定

`isCompleteSequence(data)` 先把非 ESC 开头的字符串判为 `"not-escape"`，单独一个 ESC 判为 `"incomplete"` [E: packages/tui/src/stdin-buffer.ts:30][E: packages/tui/src/stdin-buffer.ts:31][E: packages/tui/src/stdin-buffer.ts:34][E: packages/tui/src/stdin-buffer.ts:35]。ESC 后缀分支包括 CSI `ESC [`、OSC `ESC ]`、DCS `ESC P`、APC `ESC _`、SS3 `ESC O`、Meta key sequence 和 unknown escape sequence [E: packages/tui/src/stdin-buffer.ts:41][E: packages/tui/src/stdin-buffer.ts:52][E: packages/tui/src/stdin-buffer.ts:57][E: packages/tui/src/stdin-buffer.ts:62][E: packages/tui/src/stdin-buffer.ts:68][E: packages/tui/src/stdin-buffer.ts:73][E: packages/tui/src/stdin-buffer.ts:77]。

CSI sequence 需要 `ESC [` 后至少还有一个字符，并且 payload 最后一个字符码落在 `0x40..0x7e` 才能完成 [E: packages/tui/src/stdin-buffer.ts:90][E: packages/tui/src/stdin-buffer.ts:91][E: packages/tui/src/stdin-buffer.ts:94][E: packages/tui/src/stdin-buffer.ts:99][E: packages/tui/src/stdin-buffer.ts:101]。SGR mouse sequence 是 CSI 的特殊分支：payload 以 `<` 开头时会先按 `<digits;digits;digits[Mm]` 检查，匹配则 complete；不满足该分支的 `<...` payload 会返回 incomplete [E: packages/tui/src/stdin-buffer.ts:104][E: packages/tui/src/stdin-buffer.ts:106][E: packages/tui/src/stdin-buffer.ts:108][E: packages/tui/src/stdin-buffer.ts:119]。

OSC、DCS、APC 都以 ST terminator 为完成条件；OSC 还接受 BEL `\x07` 作为结束 [E: packages/tui/src/stdin-buffer.ts:138][E: packages/tui/src/stdin-buffer.ts:139][E: packages/tui/src/stdin-buffer.ts:156][E: packages/tui/src/stdin-buffer.ts:157][E: packages/tui/src/stdin-buffer.ts:174][E: packages/tui/src/stdin-buffer.ts:175]。old-style mouse sequence `ESC [ M` 固定等待总长度至少 6 个字符，SS3 等待 `ESC O` 后再有一个字符 [E: packages/tui/src/stdin-buffer.ts:43][E: packages/tui/src/stdin-buffer.ts:45][E: packages/tui/src/stdin-buffer.ts:66][E: packages/tui/src/stdin-buffer.ts:68]。

## 控制流

1. `process@packages/tui/src/stdin-buffer.ts:287` 每次输入先取消 pending timeout，保证新 chunk 到来时重新计算完整性窗口 [E: packages/tui/src/stdin-buffer.ts:287][E: packages/tui/src/stdin-buffer.ts:289][E: packages/tui/src/stdin-buffer.ts:290][E: packages/tui/src/stdin-buffer.ts:291]。
2. `process@packages/tui/src/stdin-buffer.ts:287` 接受 string 或 Buffer；单字节 Buffer 且 byte 大于 127 时会转成 `ESC + (byte - 128)`，其它 Buffer 走 `toString()` [E: packages/tui/src/stdin-buffer.ts:287][E: packages/tui/src/stdin-buffer.ts:297][E: packages/tui/src/stdin-buffer.ts:298][E: packages/tui/src/stdin-buffer.ts:300][E: packages/tui/src/stdin-buffer.ts:302]。
3. `process@packages/tui/src/stdin-buffer.ts:308` 对空字符串有一个显式分支：当输入为空且内部 buffer 也为空时，直接 emit 空 sequence [E: packages/tui/src/stdin-buffer.ts:308][E: packages/tui/src/stdin-buffer.ts:309]。
4. `process@packages/tui/src/stdin-buffer.ts:313` 把新字符串追加到普通 buffer；如果已经在 paste mode，则把普通 buffer 转移到 paste buffer，查找 paste end marker，找到后 emit `"paste"` 并递归处理 end marker 后的 remaining input [E: packages/tui/src/stdin-buffer.ts:313][E: packages/tui/src/stdin-buffer.ts:315][E: packages/tui/src/stdin-buffer.ts:316][E: packages/tui/src/stdin-buffer.ts:317][E: packages/tui/src/stdin-buffer.ts:319][E: packages/tui/src/stdin-buffer.ts:328][E: packages/tui/src/stdin-buffer.ts:331]。
5. `process@packages/tui/src/stdin-buffer.ts:337` 在非 paste mode 下搜索 bracketed paste start；start 前的内容先交给 `extractCompleteSequences()` 发出，随后进入 paste mode，paste 结束后的剩余内容继续回到 `process()` [E: packages/tui/src/stdin-buffer.ts:337][E: packages/tui/src/stdin-buffer.ts:340][E: packages/tui/src/stdin-buffer.ts:341][E: packages/tui/src/stdin-buffer.ts:343][E: packages/tui/src/stdin-buffer.ts:349][E: packages/tui/src/stdin-buffer.ts:365]。
6. `extractCompleteSequences@packages/tui/src/stdin-buffer.ts:192` 从 buffer 左到右扫描；ESC 开头时逐步扩展 candidate 并调用 `isCompleteSequence()`，普通字符则按单字符 sequence 发出 [E: packages/tui/src/stdin-buffer.ts:192][E: packages/tui/src/stdin-buffer.ts:196][E: packages/tui/src/stdin-buffer.ts:200][E: packages/tui/src/stdin-buffer.ts:204][E: packages/tui/src/stdin-buffer.ts:205][E: packages/tui/src/stdin-buffer.ts:249]。
7. `extractCompleteSequences@packages/tui/src/stdin-buffer.ts:244` 如果扫描到末尾仍没有完整 sequence，会把剩余字符串作为 `remainder` 返回；`process()` 将这个 remainder 保存回 `this.buffer` [E: packages/tui/src/stdin-buffer.ts:244][E: packages/tui/src/stdin-buffer.ts:245][E: packages/tui/src/stdin-buffer.ts:371][E: packages/tui/src/stdin-buffer.ts:372]。
8. `emitDataSequence@packages/tui/src/stdin-buffer.ts:389` 在真正 emit `"data"` 前做 duplicate 抑制：如果当前单字符 codepoint 等于 `pendingKittyPrintableCodepoint`，就清掉 pending 并跳过 emit；否则用当前 sequence 重新计算 pending 并 emit `"data"` [E: packages/tui/src/stdin-buffer.ts:389][E: packages/tui/src/stdin-buffer.ts:390][E: packages/tui/src/stdin-buffer.ts:391][E: packages/tui/src/stdin-buffer.ts:392][E: packages/tui/src/stdin-buffer.ts:393][E: packages/tui/src/stdin-buffer.ts:396][E: packages/tui/src/stdin-buffer.ts:397]。

## 设计动机与权衡

`extractCompleteSequences()` 里有一个 `ESC ESC` guard：当 candidate 是 `\x1b\x1b` 且后一个字符会开启新的 escape sequence 时，它只 emit 第一个 ESC，然后从第二个 ESC 重新开始解析 [E: packages/tui/src/stdin-buffer.ts:217][E: packages/tui/src/stdin-buffer.ts:218][E: packages/tui/src/stdin-buffer.ts:220][E: packages/tui/src/stdin-buffer.ts:226][E: packages/tui/src/stdin-buffer.ts:227]。源码注释把这个 guard 关联到 WezTerm / Kitty keyboard 场景；这说明 buffer 层不仅按语法切片，也承担少量 terminal-specific framing correction [I]。

`parseUnmodifiedKittyPrintableCodepoint()` 只从匹配 `ESC[digits...u` 正则的 sequence 中解析 codepoint，并且只在 codepoint 大于等于 32 时返回该值；`emitDataSequence()` 用这个返回值更新 pending duplicate-suppression state [E: packages/tui/src/stdin-buffer.ts:184][E: packages/tui/src/stdin-buffer.ts:185][E: packages/tui/src/stdin-buffer.ts:188][E: packages/tui/src/stdin-buffer.ts:189][E: packages/tui/src/stdin-buffer.ts:396]。这是一种窄修复：它避免双输入 printable character，同时不匹配该正则的 CSI-u sequence 不会设置 pending state [I]。

bracketed paste 被单独 emit `"paste"`；paste mode 分支把输入并入 `pasteBuffer`、查找 end marker，并在该分支末尾 return，因此不会在 paste body 内继续拆 key sequence [E: packages/tui/src/stdin-buffer.ts:315][E: packages/tui/src/stdin-buffer.ts:316][E: packages/tui/src/stdin-buffer.ts:319][E: packages/tui/src/stdin-buffer.ts:328][E: packages/tui/src/stdin-buffer.ts:334][I]。

## Gotcha

- `flush()` 返回当前 incomplete buffer 并清空 buffer，但不会自己 emit；timeout callback 会把 `flush()` 的返回值逐条交给 `emitDataSequence()` [E: packages/tui/src/stdin-buffer.ts:400][E: packages/tui/src/stdin-buffer.ts:410][E: packages/tui/src/stdin-buffer.ts:411][E: packages/tui/src/stdin-buffer.ts:382][E: packages/tui/src/stdin-buffer.ts:383]。
- `clear()` 会取消 timeout，并同时清空普通 buffer、paste mode、paste buffer 和 Kitty printable pending state [E: packages/tui/src/stdin-buffer.ts:416][E: packages/tui/src/stdin-buffer.ts:417][E: packages/tui/src/stdin-buffer.ts:421][E: packages/tui/src/stdin-buffer.ts:422][E: packages/tui/src/stdin-buffer.ts:423][E: packages/tui/src/stdin-buffer.ts:424]。
- `destroy()` 只是调用 `clear()`；它没有额外关闭 EventEmitter listener，也不负责从 `process.stdin` 解绑 [E: packages/tui/src/stdin-buffer.ts:431][E: packages/tui/src/stdin-buffer.ts:432]。
- 如果 bracketed paste start marker 出现在当前 buffer 中，start marker 之前内容会先传给 `extractCompleteSequences(beforePaste)`，该分支只遍历 `result.sequences` 并 emit，没有重新保存 `result.remainder` [E: packages/tui/src/stdin-buffer.ts:339][E: packages/tui/src/stdin-buffer.ts:341][E: packages/tui/src/stdin-buffer.ts:342][E: packages/tui/src/stdin-buffer.ts:343][I]。

## 跨包边界

`subsys.tui.stdin-buffer` 只覆盖 `packages/tui/src/stdin-buffer.ts` 的 framing 算法。终端 adapter 如何创建 `StdinBuffer`、消费 `"data"` / `"paste"` 并把 sequence 交给 TUI 的过程，由 [subsys.tui.key-pipeline](key-pipeline.md) 覆盖；该相关节点把 `StdinBuffer` 描述为 raw stdin 到 `TUI.handleInput` 之间的 sequence splitter [I]。

## Sources

- packages/tui/src/stdin-buffer.ts

## 相关

- [subsys.tui.key-pipeline](key-pipeline.md): 解释 `ProcessTerminal` 如何把 `process.stdin` data event 接入 `StdinBuffer`，并把输出 sequence 转发到 `TUI.handleInput`。
