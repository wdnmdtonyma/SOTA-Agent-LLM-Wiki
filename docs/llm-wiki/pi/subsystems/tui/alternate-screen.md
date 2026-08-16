---
id: subsys.tui.alternate-screen
title: Alternate-screen Fullscreen Runtime
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/tui-alt-screen.ts
  - packages/tui/src/components/alt-screen-flash.ts
  - packages/tui/src/terminal-image.ts
  - packages/tui/src/terminal.ts
  - packages/tui/src/stdin-buffer.ts
  - packages/tui/test/tui-alt-screen.test.ts
  - packages/tui/test/stdin-buffer.test.ts
symbols:
  - TuiAltScreen
  - TuiAltScreenOptions
  - AltScreenFlashContainer
related:
  - subsys.tui.runtime
  - subsys.tui.layout
  - subsys.tui.diff-engine
  - subsys.tui.overlay
  - subsys.tui.stdin-buffer
  - ref.tui.keybinding-actions
evidence: explicit
status: verified
updated: 086c32e745
---

> `TuiAltScreen` 是固定 viewport 的 fullscreen renderer，整合 alternate-screen lifecycle、layout、滚动导航、鼠标选择、链接、flash 与 Kitty placement cache。

## Lifecycle 与 document

renderer 实现 `ViewportTUI`，默认以 implicit `ScrollView(follow:end, primary:true)` 包裹普通 children，也允许调用方通过 `setLayoutRoot()` 提供显式 layout tree。[E: packages/tui/src/tui-alt-screen.ts:164] [E: packages/tui/src/tui-alt-screen.ts:209] [E: packages/tui/src/tui-alt-screen.ts:215] [E: packages/tui/src/tui-alt-screen.ts:235]

启动前进入 alternate screen、启用 mouse capture、关闭 autowrap并隐藏光标；iTerm2 image protocol 在 fullscreen 期间被禁用，因为 placement 无法可靠删除/裁剪。[E: packages/tui/src/tui-alt-screen.ts:254] [E: packages/tui/src/tui-alt-screen.ts:264] [E: packages/tui/src/tui-alt-screen.ts:266] [E: packages/tui/src/tui-alt-screen.ts:289]

停止时先 `closeSearch()`、关 mouse、删 Kitty images。`stop({ preserveScreen: true })` 只退出 alternate screen；否则把完整 document 打回 main screen scrollback，再恢复进入前的 image capabilities。[E: packages/tui/src/tui-alt-screen.ts:295] [E: packages/tui/src/tui-alt-screen.ts:311] [E: packages/tui/src/tui-alt-screen.ts:315] [E: packages/tui/src/tui-alt-screen.ts:327]

## 导航、鼠标与选择

`handleViewportInput()` 消费 `tui.altScreen.pageUp`/`pageDown`、默认未绑定的 `halfPage*`/`line*`、previous/next marked message、top/bottom，以及 search 开关。message jump 扫描 OSC 133 `A` marker，不应窄化成只跳用户 prompt。[E: packages/tui/src/tui-alt-screen.ts:539] [E: packages/tui/src/tui-alt-screen.ts:598] [E: packages/tui/src/tui-alt-screen.ts:610] [E: packages/tui/src/tui-alt-screen.ts:409] [E: packages/tui/src/tui-alt-screen.ts:416]

focused overlay（搜索框除外）拿走 wheel 与 viewport 键：`shouldDeferViewportInputToOverlay()` 为真时 wheel/PageUp/PageDown/Home/End 不 `consume`，落入 overlay `handleInput`。[E: packages/tui/src/tui-alt-screen.ts:535] [E: packages/tui/src/tui-alt-screen.ts:563] [E: packages/tui/src/tui-alt-screen.ts:597] 搜索 overlay focused 时该函数为假，transcript 继续滚。[E: packages/tui/src/tui-alt-screen.ts:536] [E: packages/tui/test/tui-alt-screen.test.ts:1334] [E: packages/tui/test/tui-alt-screen.test.ts:1392]

wheel 先命中 pointer 下 deepest ScrollView，再把未消费 delta 向外或 primary view chain；`overscroll:"contain"` 可终止传播。[E: packages/tui/src/tui-alt-screen.ts:672] [E: packages/tui/src/tui-alt-screen.ts:677] [E: packages/tui/src/tui-alt-screen.ts:678] scrollbar 支持 hover、thumb drag；selection 靠近 viewport 边缘时会自动滚动。[E: packages/tui/src/tui-alt-screen.ts:741] [E: packages/tui/src/tui-alt-screen.ts:924]

SGR 按下用 button `0`，松开同时认具体 release（button `0` + `m`）和 generic release（button `3` + `m`）。不少终端拖完只报 `\x1b[<3;x;ym`，不认 generic 就打不开 OSC 8、也完不成选择复制。[E: packages/tui/src/tui-alt-screen.ts:686] [E: packages/tui/src/tui-alt-screen.ts:952] [E: packages/tui/test/tui-alt-screen.test.ts:893] [E: packages/tui/test/tui-alt-screen.test.ts:936]

无 drag 的 click 解析并打开 OSC 8 link。有选区时 `copySelectionToClipboard()`：若 options 提供 `copySelection(text) => Promise<boolean>`，成功 flash `Copied!`、失败 flash `Copy failed` 且不写 OSC 52；未注入 handler 时写 OSC 52 并 flash `Copied!`（终端若不实现 OSC 52，这一路无法自证失败）。[E: packages/tui/src/tui-alt-screen.ts:160] [E: packages/tui/src/tui-alt-screen.ts:981] [E: packages/tui/src/tui-alt-screen.ts:1083] [E: packages/tui/src/tui-alt-screen.ts:1088] [E: packages/tui/test/tui-alt-screen.test.ts:994]

FOCUS_OUT（`\x1b[O`）只取消正在进行的 press。idle 或零宽选区不 `requestRender()`，因此不会为清选区重绘；只有拖出可见选区的 active press 才清选并重绘。已经松开的可见选区跨 focus 变化保留。[E: packages/tui/src/tui-alt-screen.ts:540] [E: packages/tui/src/tui-alt-screen.ts:554] [E: packages/tui/test/tui-alt-screen.test.ts:1089] [E: packages/tui/test/tui-alt-screen.test.ts:1162]

`PI_TUI_ESC_TIMEOUT` 只作用于 lone ESC。`ProcessTerminal` 把它传给 `StdinBuffer.escapeTimeout`；incomplete CSI/mouse 仍用独立的 sequence timeout（默认 50ms）。正数覆盖默认 10ms（SSH 下 100ms）；`0`/非法值忽略。[E: packages/tui/src/terminal.ts:112] [E: packages/tui/src/terminal.ts:113] [E: packages/tui/src/terminal.ts:118] [E: packages/tui/src/terminal.ts:205] [E: packages/tui/src/stdin-buffer.ts:23] [E: packages/tui/src/stdin-buffer.ts:388] [E: packages/tui/test/stdin-buffer.test.ts:166]

## Flash 与图片缓存

内部 `AltScreenFlashContainer` 支持独立 timer 的叠加消息，默认 1000ms，并以 reverse-video 的右上角浮层合成；它没有从 package root 导出。[E: packages/tui/src/components/alt-screen-flash.ts:4] [E: packages/tui/src/components/alt-screen-flash.ts:13] [E: packages/tui/src/components/alt-screen-flash.ts:22] [E: packages/tui/src/tui-alt-screen.ts:1232] [E: packages/tui/src/tui-alt-screen.ts:1241]

Kitty image cache 以 transmission generation 判断是否可复用 placement，并保留 recently-offscreen images；硬上限为 16 个、32 MiB transmission bytes、64 MiB decoded bytes，超限从最旧的 offscreen entry 驱逐。[E: packages/tui/src/tui-alt-screen.ts:65] [E: packages/tui/src/tui-alt-screen.ts:66] [E: packages/tui/src/tui-alt-screen.ts:67] [E: packages/tui/src/tui-alt-screen.ts:337] [E: packages/tui/src/tui-alt-screen.ts:353] [E: packages/tui/src/tui-alt-screen.ts:377]

## Gotchas

- mouse capture 会改变 terminal 原生选择行为。未注入 `copySelection` 时复制仍是 OSC 52 且总是报 `Copied!`；要报失败必须走 host handler 的 `false` 返回值。[E: packages/tui/src/tui-alt-screen.ts:289] [E: packages/tui/src/tui-alt-screen.ts:1083] [E: packages/tui/src/tui-alt-screen.ts:1088]
- cache budgets 是 renderer 常量，不是 settings/API。[E: packages/tui/src/tui-alt-screen.ts:65]
- overlay 存在时 scrollbar pointer target 被禁用，避免背景滚动条拦截 modal interaction。[E: packages/tui/src/tui-alt-screen.ts:710]
- `flash()`、scroll methods 与 selection APIs 属于具体 renderer，不在通用 `TUI` interface 中。[E: packages/tui/src/tui.ts:291]
- `PI_TUI_ESC_TIMEOUT` 不会拉长残缺 SGR/CSI 的等待；只延长单独一个 ESC 被当成 Escape 之前的窗口。[E: packages/tui/src/stdin-buffer.ts:388]

## Sources

- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/components/alt-screen-flash.ts`
- `packages/tui/src/terminal-image.ts`
- `packages/tui/src/terminal.ts`
- `packages/tui/src/stdin-buffer.ts`
- `packages/tui/test/tui-alt-screen.test.ts`
- `packages/tui/test/stdin-buffer.test.ts`

## 相关

- `subsys.tui.runtime` — `TUI`/`TuiBase` 生命周期、`TuiStopOptions.preserveScreen` 与渲染调度。
- `subsys.tui.layout` — `ScrollView`、layout frame、scrollbar geometry。
- `subsys.tui.diff-engine` — viewport 行 diff。
- `subsys.tui.overlay` — overlay 栈与焦点。
- `subsys.tui.stdin-buffer` — lone ESC vs CSI/mouse 的 timeout 分流。
- `ref.tui.keybinding-actions` — `tui.altScreen.*` 默认键 catalog。
