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
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/settings-manager.ts
symbols:
  - TuiAltScreen
  - TuiAltScreenOptions
  - AltScreenFlashContainer
  - getCopyOnSelect
  - setCopyOnSelect
  - hasActiveSelection
  - copyActiveSelectionToClipboard
related:
  - subsys.tui.runtime
  - subsys.tui.layout
  - subsys.tui.diff-engine
  - subsys.tui.overlay
  - subsys.tui.stdin-buffer
  - subsys.tui.alt-screen-search
  - ref.tui.keybinding-actions
evidence: explicit
status: verified
updated: 853a80d26c
---

> `TuiAltScreen` 是固定 viewport 的 fullscreen renderer，整合 alternate-screen lifecycle、layout、滚动导航、鼠标选择、`copyOnSelect`、链接、flash 与 Kitty placement cache。

## Lifecycle 与 document

renderer 实现 `ViewportTUI`，默认以 implicit `ScrollView(follow:end, primary:true)` 包裹普通 children，也允许调用方通过 `setLayoutRoot()` 提供显式 layout tree。[E: packages/tui/src/tui-alt-screen.ts:169] [E: packages/tui/src/tui-alt-screen.ts:221] [E: packages/tui/src/tui-alt-screen.ts:262]

启动前进入 alternate screen、启用 mouse capture、关闭 autowrap并隐藏光标；iTerm2 image protocol 在 fullscreen 期间被禁用，因为 placement 无法可靠删除/裁剪。[E: packages/tui/src/tui-alt-screen.ts:281] [E: packages/tui/src/tui-alt-screen.ts:291] [E: packages/tui/src/tui-alt-screen.ts:293] [E: packages/tui/src/tui-alt-screen.ts:316]

停止时先 `closeSearch()`、关 mouse、删 Kitty images。`stop({ preserveScreen: true })` 只退出 alternate screen；否则把完整 document 打回 main screen scrollback，再恢复进入前的 image capabilities。[E: packages/tui/src/tui-alt-screen.ts:322] [E: packages/tui/src/tui-alt-screen.ts:338] [E: packages/tui/src/tui-alt-screen.ts:342] [E: packages/tui/src/tui-alt-screen.ts:354]

## 导航、鼠标与选择

`handleViewportInput()` 消费 `tui.altScreen.pageUp`/`pageDown`、默认未绑定的 `halfPage*`/`line*`、previous/next marked message、top/bottom，以及 search 开关。message jump 扫描 OSC 133 `A` marker，不应窄化成只跳用户 prompt。[E: packages/tui/src/tui-alt-screen.ts:566] [E: packages/tui/src/tui-alt-screen.ts:625] [E: packages/tui/src/tui-alt-screen.ts:653] [E: packages/tui/src/tui-alt-screen.ts:436] [E: packages/tui/src/tui-alt-screen.ts:443]

focused overlay（搜索框除外）拿走 wheel 与 viewport 键：`shouldDeferViewportInputToOverlay()` 为真时 wheel/PageUp/PageDown/Home/End 不 `consume`，落入 overlay `handleInput`。[E: packages/tui/src/tui-alt-screen.ts:562] [E: packages/tui/src/tui-alt-screen.ts:590] [E: packages/tui/src/tui-alt-screen.ts:624] 搜索 overlay focused 时该函数为假，transcript 继续滚。[E: packages/tui/src/tui-alt-screen.ts:563] [E: packages/tui/test/tui-alt-screen.test.ts:1433] [E: packages/tui/test/tui-alt-screen.test.ts:1491]

wheel 先命中 pointer 下 deepest ScrollView，再把未消费 delta 向外或 primary view chain；`overscroll:"contain"` 可终止传播。[E: packages/tui/src/tui-alt-screen.ts:699] [E: packages/tui/src/tui-alt-screen.ts:704] [E: packages/tui/src/tui-alt-screen.ts:705] scrollbar 支持 hover、thumb drag；selection 靠近 viewport 边缘时会自动滚动。[E: packages/tui/src/tui-alt-screen.ts:774] [E: packages/tui/src/tui-alt-screen.ts:978]

SGR 按下用 button `0`，松开同时认具体 release（button `0` + `m`）和 generic release（button `3` + `m`）。不少终端拖完只报 `\x1b[<3;x;ym`，不认 generic 就打不开 OSC 8、也完不成选择复制。[E: packages/tui/src/tui-alt-screen.ts:713] [E: packages/tui/src/tui-alt-screen.ts:1006] [E: packages/tui/test/tui-alt-screen.test.ts:902] [E: packages/tui/test/tui-alt-screen.test.ts:945]

无 drag 的 click 解析并打开 OSC 8 link。有选区且 `copyOnSelect` 为真时走 `copySelectionToClipboard()`；`copyOnSelect: false` 时松开只保留高亮，不写剪贴板。[E: packages/tui/src/tui-alt-screen.ts:160] [E: packages/tui/src/tui-alt-screen.ts:1035] [E: packages/tui/test/tui-alt-screen.test.ts:1003] 复制路径：若 options 提供 `copySelection(text) => Promise<boolean>`，成功 flash `Copied!`、失败 flash `Copy failed` 且不写 OSC 52；未注入 handler 时写 OSC 52 并 flash `Copied!`（终端若不实现 OSC 52，这一路无法自证失败）。[E: packages/tui/src/tui-alt-screen.ts:165] [E: packages/tui/src/tui-alt-screen.ts:1146] [E: packages/tui/src/tui-alt-screen.ts:1151] [E: packages/tui/test/tui-alt-screen.test.ts:1064]

FOCUS_OUT（`\x1b[O`）只取消正在进行的 press。idle 或零宽选区不 `requestRender()`，因此不会为清选区重绘；只有拖出可见选区的 active press 才清选并重绘。已经松开的可见选区跨 focus 变化保留。[E: packages/tui/src/tui-alt-screen.ts:567] [E: packages/tui/src/tui-alt-screen.ts:581] [E: packages/tui/test/tui-alt-screen.test.ts:1188] [E: packages/tui/test/tui-alt-screen.test.ts:1261]

`PI_TUI_ESC_TIMEOUT` 只作用于 lone ESC。`ProcessTerminal` 把它传给 `StdinBuffer.escapeTimeout`；incomplete CSI/mouse 仍用独立的 sequence timeout（默认 50ms）。正数覆盖默认 10ms（SSH 下 100ms）；`0`/非法值忽略。[E: packages/tui/src/terminal.ts:112] [E: packages/tui/src/terminal.ts:113] [E: packages/tui/src/terminal.ts:118] [E: packages/tui/src/terminal.ts:205] [E: packages/tui/src/stdin-buffer.ts:23] [E: packages/tui/src/stdin-buffer.ts:388] [E: packages/tui/test/stdin-buffer.test.ts:166]

双击 word selection 把 `/` 与 `-` 当 joiner，不再把 path / kebab-case 切开；权威细节在 `subsys.tui.alt-screen-search`。[E: packages/tui/src/tui-alt-screen.ts:71] [E: packages/tui/src/tui-alt-screen.ts:866]

## copyOnSelect 与编程复制

`TuiAltScreenOptions.copyOnSelect` 默认 `true`：鼠标松开后自动走 clipboard 路径。[E: packages/tui/src/tui-alt-screen.ts:160] [E: packages/tui/src/tui-alt-screen.ts:229] 运行时可 `getCopyOnSelect()` / `setCopyOnSelect(enabled)`。[E: packages/tui/src/tui-alt-screen.ts:242] [E: packages/tui/src/tui-alt-screen.ts:246]

`hasActiveSelection()` 看当前是否有非空选区文本；`copyActiveSelectionToClipboard()` 用同一条 `copyTextToClipboard()` 路径复制，无选区返回 `false`。[E: packages/tui/src/tui-alt-screen.ts:251] [E: packages/tui/src/tui-alt-screen.ts:256] [E: packages/tui/test/tui-alt-screen.test.ts:1043]

coding-agent 把 settings `fullscreenCopyOnSelect`（默认 `true`）传给 `copyOnSelect`，并注入 `copySelection`（`copyToClipboard`）。[E: packages/coding-agent/src/core/settings-manager.ts:145] [E: packages/coding-agent/src/core/settings-manager.ts:1234] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:378] `fullscreenCopyOnSelect=false` 时禁用自动 copy；`app.message.copy`（默认 `Ctrl+X`）带 `preferSelection: true`，此时若 fullscreen 仍有选区则先 `copyActiveSelectionToClipboard()`，否则再回退到 last assistant message。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2909] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6120]

## Flash 与图片缓存

内部 `AltScreenFlashContainer` 支持独立 timer 的叠加消息，默认 1000ms，并以 reverse-video 的右上角浮层合成；它没有从 package root 导出。[E: packages/tui/src/components/alt-screen-flash.ts:4] [E: packages/tui/src/components/alt-screen-flash.ts:13] [E: packages/tui/src/components/alt-screen-flash.ts:22] [E: packages/tui/src/tui-alt-screen.ts:1296] [E: packages/tui/src/tui-alt-screen.ts:1305]

Kitty image cache 以 transmission generation 判断是否可复用 placement，并保留 recently-offscreen images；硬上限为 16 个、32 MiB transmission bytes、64 MiB decoded bytes，超限从最旧的 offscreen entry 驱逐。[E: packages/tui/src/tui-alt-screen.ts:65] [E: packages/tui/src/tui-alt-screen.ts:66] [E: packages/tui/src/tui-alt-screen.ts:67] [E: packages/tui/src/tui-alt-screen.ts:364] [E: packages/tui/src/tui-alt-screen.ts:380] [E: packages/tui/src/tui-alt-screen.ts:397]

## Gotchas

- mouse capture 会改变 terminal 原生选择行为。未注入 `copySelection` 时复制仍是 OSC 52 且总是报 `Copied!`；要报失败必须走 host handler 的 `false` 返回值。[E: packages/tui/src/tui-alt-screen.ts:316] [E: packages/tui/src/tui-alt-screen.ts:1146] [E: packages/tui/src/tui-alt-screen.ts:1151]
- `copyOnSelect: false` 只停自动 copy，不取消选区高亮；调用方必须自己触发 `copyActiveSelectionToClipboard()`。[E: packages/tui/src/tui-alt-screen.ts:1035] [E: packages/tui/test/tui-alt-screen.test.ts:1022]
- cache budgets 是 renderer 常量，不是 settings/API。[E: packages/tui/src/tui-alt-screen.ts:65]
- overlay 存在时 scrollbar pointer target 被禁用，避免背景滚动条拦截 modal interaction。[E: packages/tui/src/tui-alt-screen.ts:743]
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
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/src/core/settings-manager.ts`

## 相关

- `subsys.tui.runtime` — `TUI`/`TuiBase` 生命周期、`TuiStopOptions.preserveScreen` 与渲染调度。
- `subsys.tui.layout` — `ScrollView`、layout frame、scrollbar geometry。
- `subsys.tui.diff-engine` — viewport 行 diff。
- `subsys.tui.overlay` — overlay 栈与焦点。
- `subsys.tui.stdin-buffer` — lone ESC vs CSI/mouse 的 timeout 分流。
- `subsys.tui.alt-screen-search` — transcript 搜索，以及双击 word selection 的 `/`/`-` joiner。
- `ref.tui.keybinding-actions` — `tui.altScreen.*` 默认键 catalog。
