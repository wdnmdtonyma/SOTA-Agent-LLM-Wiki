---
id: subsys.tui.terminal-colors
title: 终端背景色/配色检测
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/terminal-colors.ts
  - packages/tui/src/colors.ts
  - packages/tui/src/oklab.ts
  - packages/tui/src/tui.ts
  - packages/tui/test/terminal-colors.test.ts
symbols:
  - parseOscColorResponse
  - parseTerminalColorSchemeReport
  - TerminalColors
  - queryTerminalColors
  - okhslColor
related:
 - subsys.coding-agent.theme-controller
evidence: explicit
status: verified
updated: 6f7551516b
---

> `subsys.tui.terminal-colors` 描述 pi-tui 的 terminal color protocol: OSC 10/11/4 解析成 `RgbColor`、CSI color-scheme report、以及 `TUI.queryTerminalColors` 带 100ms 级 timeout 与 late reply。

## 能回答的问题

- `parseOscColorResponse` 接受哪些 OSC 10 / 11 / 4 格式?
- OSC `rgb:` / `rgba:` channel 怎样归一化到 0-255 RGB?
- `#RRGGBB` 与 `#RRRRGGGGBBBB` 在 parser 里有什么差异?
- `TerminalColorScheme` 的 `"dark"` / `"light"` 从哪种 terminal report 得到?
- `queryTerminalColors` 何时 resolve, `onLateReply` 何时再被调用?
- `colors.ts` / `oklab.ts` 如何给 system theme 提供 OKHSL?
- `pi-tui` 和 `pi-coding-agent` 在 terminal theme detection 上怎样分工?

## 职责边界

`terminal-colors.ts` 解析 OSC 颜色 reply 与 CSI scheme, 定义 `RgbColor`、`TerminalColorScheme`、`TerminalColors` [E: packages/tui/src/terminal-colors.ts:1] [E: packages/tui/src/terminal-colors.ts:7] [E: packages/tui/src/terminal-colors.ts:10] [E: packages/tui/src/terminal-colors.ts:48]。向终端写 query 的是 `TUI.queryTerminalColors` [E: packages/tui/src/tui.ts:1470]。`colors.ts` 提供 `indexedColor` / `rgbColor` / `oklchColor` / `okhslColor`; `oklab.ts` 是 Ottosson OKHSL/Oklab 端口 [E: packages/tui/src/colors.ts:62] [E: packages/tui/src/colors.ts:107] [E: packages/tui/src/oklab.ts:187]。

## 关键文件

- `packages/tui/src/terminal-colors.ts`: `TerminalColors`、`parseOscColorResponse`、`parseTerminalColorSchemeReport` [E: packages/tui/src/terminal-colors.ts:10] [E: packages/tui/src/terminal-colors.ts:48] [E: packages/tui/src/terminal-colors.ts:85]。
- `packages/tui/src/tui.ts`: `queryTerminalColors({ timeoutMs, onLateReply })` [E: packages/tui/src/tui.ts:1470]。
- `packages/tui/src/colors.ts` / `packages/tui/src/oklab.ts`: OKHSL 颜色值 [E: packages/tui/src/colors.ts:107] [E: packages/tui/src/oklab.ts:29]。

## 数据模型

`TerminalColors` 含 optional `foreground`(OSC 10)、`background`(OSC 11)、`palette`(OSC 4, 仅全部 16 色到齐时设置) [E: packages/tui/src/terminal-colors.ts:10] [E: packages/tui/src/terminal-colors.ts:16]。`TerminalColorScheme` 只允许 `"dark"` | `"light"` [E: packages/tui/src/terminal-colors.ts:7]。

`hexToRgb` 读 6 hex digit。`parseOscHexChannel` 用 `16 ** length - 1` 归一到 0-255 [E: packages/tui/src/terminal-colors.ts:19] [E: packages/tui/src/terminal-colors.ts:31]。

`OSC_COLOR_RESPONSE_PATTERN` 匹配 `ESC] 10|11|4;<index> ; <payload> BEL|ST` [E: packages/tui/src/terminal-colors.ts:41]。`COLOR_SCHEME_REPORT_PATTERN` 匹配连续 `ESC [ ? 997 ; 1|2 n`, 末条 capture 决定 light/dark [E: packages/tui/src/terminal-colors.ts:42]。

## 控制流

1. `parseOscColorResponse` 无 match 返回 `undefined`; match 后 `target` 为 `"foreground"` / `"background"` / palette index, `rgb` 可能仍 undefined [E: packages/tui/src/terminal-colors.ts:48] [E: packages/tui/src/terminal-colors.ts:53]。
2. Hash-hex: 6 digit `hexToRgb`, 12 digit 三个 4-digit channel; 其它 hash 失败 [E: packages/tui/src/terminal-colors.ts:60] [E: packages/tui/src/terminal-colors.ts:65]。
3. 非 hash: 去掉 `rgb:`/`rgba:`, `/` 切三 channel, 全成功才返回 RGB [E: packages/tui/src/terminal-colors.ts:74] [E: packages/tui/src/terminal-colors.ts:79]。
4. `parseTerminalColorSchemeReport`: 末条 `"2"` → `"light"`, `"1"` → `"dark"` [E: packages/tui/src/terminal-colors.ts:85] [E: packages/tui/src/terminal-colors.ts:90]。
5. `queryTerminalColors` 写 `TERMINAL_COLOR_QUERY`(OSC 10/11/4 + DA1)。timeout 时 `deliver` 换成 `onLateReply` 并 resolve 当前已收到颜色; 之后到达的 reply 仍回调 `onLateReply` [E: packages/tui/src/tui.ts:1485] [E: packages/tui/src/tui.ts:1486] [E: packages/tui/src/tui.ts:1490]。palette 只有 16 槽全满才放进结果 [E: packages/tui/src/tui.ts:1157]。coding-agent 的 `requestTerminalColors` 把 timeout 定为 100ms [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:25] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:34]。

## 设计动机与权衡

OSC parser 用 anchored regex, 避免 fragment 误匹配 [E: packages/tui/src/terminal-colors.ts:41]。OKHSL saturation 相对 sRGB gamut (`OkhslChannels` / `okhslColor` 经 `okhslToRgb`), system theme 在任意 hue 上仍 in-gamut [E: packages/tui/src/colors.ts:38] [E: packages/tui/src/colors.ts:107]。

## Gotcha

- 已删除独立的 `parseOsc11BackgroundColor` / `isOsc11BackgroundColorResponse`; 统一走 `parseOscColorResponse` [I]。
- timeout 后 late reply 仍应用, 慢链路不会永远停在灰度/索引色 [E: packages/tui/src/tui.ts:1486] [E: packages/coding-agent/src/modes/interactive/theme/theme-controller.ts:25]。
- 默认 stdin 路径可能把 CSI 拆成多次 emit; batch scheme 主要覆盖其它 adapter [I]。

## 跨包边界

[subsys.coding-agent.theme-controller](../coding-agent/theme-controller.md): `requestTerminalColors` 消费本节点的 `queryTerminalColors`; system theme 用 `okhslColor` 上色。本节点不决定 active theme 名。

## Sources

- packages/tui/src/terminal-colors.ts
- packages/tui/src/colors.ts
- packages/tui/src/oklab.ts
- packages/tui/src/tui.ts
- packages/tui/test/terminal-colors.test.ts

## 相关

- [subsys.coding-agent.theme-controller](../coding-agent/theme-controller.md): 主题状态机, 用 terminal 检测结果与 `system` 生成主题。
