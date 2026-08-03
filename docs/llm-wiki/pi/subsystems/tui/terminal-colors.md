---
id: subsys.tui.terminal-colors
title: 终端背景色/配色检测
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/terminal-colors.ts
  - packages/tui/test/terminal-colors.test.ts
symbols:
  - parseOsc11BackgroundColor
  - parseTerminalColorSchemeReport
  - TerminalColorScheme
related:
  - subsys.coding-agent.theme-controller
evidence: explicit
status: verified
updated: 305c014dcc
---

> `subsys.tui.terminal-colors` 描述 pi-tui 的 terminal color protocol parser: 它把 terminal 返回的 OSC 11 background color response 和 CSI color-scheme report 解析成 `RgbColor` 或 `TerminalColorScheme`。

## 能回答的问题

- `parseOsc11BackgroundColor` 接受哪些 terminal background color response 格式?
- OSC 11 的 `rgb:` / `rgba:` channel 怎样归一化到 0-255 RGB?
- `#RRGGBB` 与 `#RRRRGGGGBBBB` 在 parser 里有什么差异?
- `TerminalColorScheme` 的 `"dark"` / `"light"` 从哪种 terminal report 得到?
- `pi-tui` 和 `pi-coding-agent` 在 terminal theme detection 上怎样分工?

## 职责边界

`terminal-colors.ts` 是一个纯解析模块: 它定义 `RgbColor`、`TerminalColorScheme`、OSC 11 response recognizer、OSC 11 background parser 和 terminal color-scheme report parser, 不直接负责向 terminal 写 query sequence 或决定应用哪个 UI theme [E: packages/tui/src/terminal-colors.ts:1] [E: packages/tui/src/terminal-colors.ts:7] [E: packages/tui/src/terminal-colors.ts:31] [E: packages/tui/src/terminal-colors.ts:35] [E: packages/tui/src/terminal-colors.ts:67] [I]。

`RgbColor` 是 `{ r, g, b }` 三个 number channel; `TerminalColorScheme` 只允许 `"dark"` 或 `"light"` 两个 string literal [E: packages/tui/src/terminal-colors.ts:1] [E: packages/tui/src/terminal-colors.ts:2] [E: packages/tui/src/terminal-colors.ts:3] [E: packages/tui/src/terminal-colors.ts:4] [E: packages/tui/src/terminal-colors.ts:7]。

## 关键文件

- `packages/tui/src/terminal-colors.ts`: terminal color response 的全部解析逻辑, 包括 hex channel normalization、OSC 11 response pattern、CSI `?997` report pattern、`isOsc11BackgroundColorResponse`、`parseOsc11BackgroundColor` 和 `parseTerminalColorSchemeReport` [E: packages/tui/src/terminal-colors.ts:17] [E: packages/tui/src/terminal-colors.ts:28] [E: packages/tui/src/terminal-colors.ts:29] [E: packages/tui/src/terminal-colors.ts:31] [E: packages/tui/src/terminal-colors.ts:35] [E: packages/tui/src/terminal-colors.ts:67]。

## 数据模型

`hexToRgb(hex)` 只读取 6 个 hex digit 的前三个 byte: 它先去掉可选 `#`, 再用 `slice(0, 2)`、`slice(2, 4)`、`slice(4, 6)` 分别 `parseInt(..., 16)` 得到 `r`、`g`、`b` [E: packages/tui/src/terminal-colors.ts:9] [E: packages/tui/src/terminal-colors.ts:10] [E: packages/tui/src/terminal-colors.ts:11] [E: packages/tui/src/terminal-colors.ts:12] [E: packages/tui/src/terminal-colors.ts:13] [E: packages/tui/src/terminal-colors.ts:14]。

`parseOscHexChannel(channel)` 接受长度可变的 hex channel, 拒绝非 hex 字符, 用 `16 ** channel.length - 1` 作为该 channel 的最大值, 再把实际值按比例四舍五入到 0-255 [E: packages/tui/src/terminal-colors.ts:17] [E: packages/tui/src/terminal-colors.ts:18] [E: packages/tui/src/terminal-colors.ts:19] [E: packages/tui/src/terminal-colors.ts:21] [E: packages/tui/src/terminal-colors.ts:25]。

`OSC11_BACKGROUND_COLOR_RESPONSE_PATTERN` 只匹配完整字符串形式的 `ESC ] 11 ; <payload> BEL` 或 `ESC ] 11 ; <payload> ESC \`, 并把 `<payload>` 捕获为不含 BEL 与 ESC 的内容 [E: packages/tui/src/terminal-colors.ts:28]。

`COLOR_SCHEME_REPORT_PATTERN` 匹配一个或多个首尾连续拼接的完整 `ESC [ ? 997 ; 1 n` / `ESC [ ? 997 ; 2 n` reports；anchored outer pattern 仍拒绝前缀、后缀或 batch 中夹入其他 bytes，重复 capture 的最终值是 batch 末条 report 的 `"1"` 或 `"2"`。[E: packages/tui/src/terminal-colors.ts:29] [E: packages/tui/test/terminal-colors.test.ts:118] [E: packages/tui/test/terminal-colors.test.ts:119] [E: packages/tui/test/terminal-colors.test.ts:120] [E: packages/tui/test/terminal-colors.test.ts:122]

## 控制流

1. `isOsc11BackgroundColorResponse(data)` 只执行 `OSC11_BACKGROUND_COLOR_RESPONSE_PATTERN.test(data)`, 因此它是 parser 前的 boolean recognizer, 不产生 RGB value [E: packages/tui/src/terminal-colors.ts:31] [E: packages/tui/src/terminal-colors.ts:32]。
2. `parseOsc11BackgroundColor(data)` 先用同一个 OSC 11 pattern 做完整匹配;没有 match 时返回 `undefined` [E: packages/tui/src/terminal-colors.ts:35] [E: packages/tui/src/terminal-colors.ts:36] [E: packages/tui/src/terminal-colors.ts:37] [E: packages/tui/src/terminal-colors.ts:38]。
3. OSC 11 payload 会先 `trim()`;如果 payload 以 `#` 开头, parser 进入 hash-hex branch [E: packages/tui/src/terminal-colors.ts:41] [E: packages/tui/src/terminal-colors.ts:42]。
4. Hash-hex branch 对 6 digit hex 使用 `hexToRgb(value)`, 对 12 digit hex 拆成三个 4 digit channel 并通过 `parseOscHexChannel` 归一化;其他 hash payload 返回 `undefined` [E: packages/tui/src/terminal-colors.ts:43] [E: packages/tui/src/terminal-colors.ts:44] [E: packages/tui/src/terminal-colors.ts:45] [E: packages/tui/src/terminal-colors.ts:47] [E: packages/tui/src/terminal-colors.ts:48] [E: packages/tui/src/terminal-colors.ts:49] [E: packages/tui/src/terminal-colors.ts:50] [E: packages/tui/src/terminal-colors.ts:51] [E: packages/tui/src/terminal-colors.ts:21] [E: packages/tui/src/terminal-colors.ts:25] [E: packages/tui/src/terminal-colors.ts:53]。
5. 非 hash payload 会去掉开头的 `rgb:` 或 `rgba:` prefix, 再按 `/` 切成 red、green、blue 三个 channel;缺任一 channel 就返回 `undefined` [E: packages/tui/src/terminal-colors.ts:56] [E: packages/tui/src/terminal-colors.ts:57] [E: packages/tui/src/terminal-colors.ts:58] [E: packages/tui/src/terminal-colors.ts:59]。
6. Slash-separated branch 的三个 channel 都走 `parseOscHexChannel`;只有 `r`、`g`、`b` 全部解析成功时才返回 `{ r, g, b }`, 否则返回 `undefined` [E: packages/tui/src/terminal-colors.ts:57] [E: packages/tui/src/terminal-colors.ts:61] [E: packages/tui/src/terminal-colors.ts:62] [E: packages/tui/src/terminal-colors.ts:63] [E: packages/tui/src/terminal-colors.ts:64]。
7. `parseTerminalColorSchemeReport(data)` 匹配单条或 batched CSI `?997` reports；不匹配返回 `undefined`，匹配后按末条 report 的 captured `"2"` 返回 `"light"`，末条为 `"1"` 返回 `"dark"`。测试分别用 `2,1,1` 与 `1,2,2` batch 证明 last-report-wins。[E: packages/tui/src/terminal-colors.ts:67] [E: packages/tui/src/terminal-colors.ts:68] [E: packages/tui/src/terminal-colors.ts:69] [E: packages/tui/src/terminal-colors.ts:70] [E: packages/tui/src/terminal-colors.ts:72] [E: packages/tui/test/terminal-colors.test.ts:118] [E: packages/tui/test/terminal-colors.test.ts:119]

## 设计动机与权衡

OSC 11 parser 对输入采用 anchored regex, 所以带前缀/后缀的 terminal output fragment 不会被误当成有效 response;这让调用方可以把完整 response 与普通 terminal data 分开处理 [E: packages/tui/src/terminal-colors.ts:28] [E: packages/tui/src/terminal-colors.ts:36] [I]。

CSI color-scheme parser 同样保留整串 anchored 边界，并允许调用方传入多条连续拼接的完整 scheme reports；以最后一条为准能把 batch 折叠成单个当前 scheme，而不是把合法合包误判成普通输入。[E: packages/tui/src/terminal-colors.ts:29] [E: packages/tui/src/terminal-colors.ts:68] [E: packages/tui/src/terminal-colors.ts:72] [E: packages/tui/test/terminal-colors.test.ts:118] [E: packages/tui/test/terminal-colors.test.ts:119] [I]

Hash-hex branch 只接受 6 或 12 digit, 而 slash-separated branch 的每个 channel 接受任意正长度 hex string;这反映出两类 terminal response format 的容错策略不同 [E: packages/tui/src/terminal-colors.ts:44] [E: packages/tui/src/terminal-colors.ts:47] [E: packages/tui/src/terminal-colors.ts:57] [E: packages/tui/src/terminal-colors.ts:18] [E: packages/tui/src/terminal-colors.ts:61] [I]。

`parseOscHexChannel` 用 channel 长度计算最大值, 所以 `rgb:0/0/0`、`rgb:00/00/00`、`rgb:0000/0000/0000` 都会映射到同一个 8-bit RGB space;这是 terminal protocol 的高位宽 channel 到 UI color model 的 normalization [E: packages/tui/src/terminal-colors.ts:21] [E: packages/tui/src/terminal-colors.ts:25] [I]。

## Gotcha

- `value.replace(/^rgba?:/i, "")` 只移除开头的 `rgb:` 或 `rgba:`;没有该 prefix 的 slash-separated payload 也会继续按 `red/green/blue` 解析 [E: packages/tui/src/terminal-colors.ts:56] [E: packages/tui/src/terminal-colors.ts:57] [I]。
- `parseOscHexChannel` 的 regex 要求 channel 至少一个 hex digit, 所以 empty channel 会返回 `undefined` [E: packages/tui/src/terminal-colors.ts:18] [E: packages/tui/src/terminal-colors.ts:19] [I]。
- `parseTerminalColorSchemeReport` 的 `"dark"` default 只发生在 regex 已保证最后一条 capture 为 `"1"` 或 `"2"` 之后；单条或 batch 中出现 `?997;3n` 都不会匹配。[E: packages/tui/src/terminal-colors.ts:29] [E: packages/tui/src/terminal-colors.ts:72] [E: packages/tui/test/terminal-colors.test.ts:120]
- 默认 `ProcessTerminal` 会经 `StdinBuffer` 把一个 raw chunk 中的完整 CSI sequences 分别 emit；所以 parser 的 batch 分支主要覆盖其他 `Terminal` adapter 或直接把合并字符串交给 parser/consumer 的调用路径，不能据此推断默认 stdin path 只回调一次。[E: packages/tui/src/stdin-buffer.ts:192] [E: packages/tui/src/stdin-buffer.ts:207] [E: packages/tui/src/stdin-buffer.ts:231] [E: packages/tui/src/terminal.ts:181] [E: packages/tui/src/terminal.ts:191] [I]

## 跨包边界

[subsys.coding-agent.theme-controller](../coding-agent/theme-controller.md): coding-agent 的 theme controller 使用 terminal background 或 terminal color-scheme 检测结果选择 `dark` / `light` theme;本节点只覆盖 pi-tui 层把 terminal protocol bytes 解析为 `RgbColor` 或 `TerminalColorScheme` 的部分 [I]。

## Sources

- packages/tui/src/terminal-colors.ts
- packages/tui/test/terminal-colors.test.ts

## 相关

- [subsys.coding-agent.theme-controller](../coding-agent/theme-controller.md): pi-coding-agent 的主题状态机, 负责根据 terminal 检测结果、settings 和 auto-sync 决定 active theme。
