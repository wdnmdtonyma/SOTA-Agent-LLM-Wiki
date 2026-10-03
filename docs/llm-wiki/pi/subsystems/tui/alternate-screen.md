---
id: subsys.tui.alternate-screen
title: Alternate-screen Fullscreen Runtime
kind: subsystem
tier: T2
pkg: tui
source:
 - packages/tui/src/tui-alt-screen.ts
 - packages/tui/src/tui.ts
 - packages/tui/src/components/alt-screen-flash.ts
 - packages/tui/src/terminal-image.ts
 - packages/tui/src/terminal.ts
 - packages/tui/src/stdin-buffer.ts
 - packages/tui/src/wheel-scroll.ts
 - packages/tui/test/tui-alt-screen.test.ts
 - packages/tui/test/stdin-buffer.test.ts
 - packages/coding-agent/src/modes/interactive/interactive-mode.ts
 - packages/coding-agent/src/modes/interactive/tui-renderer.ts
 - packages/coding-agent/src/core/settings-manager.ts
symbols:
 - TuiAltScreen
 - TuiAltScreenOptions
 - AltScreenFlashContainer
 - getCopyOnSelect
 - setCopyOnSelect
 - hasActiveSelection
 - copyActiveSelectionToClipboard
 - WheelScrollAccelerator
 - setWheelScrollLines
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
updated: 4c6fb7cfe8
---

> `TuiAltScreen` 是固定 viewport 的 fullscreen renderer，整合 alternate-screen lifecycle、layout、滚动导航、`WheelScrollAccelerator`、鼠标选择、`copyOnSelect`、链接、flash、jump-to-end 与 Kitty placement cache。

## Lifecycle 与 document

renderer 实现 `ViewportTUI`，默认以 implicit `ScrollView(follow:end, primary:true)` 包裹普通 children，也允许调用方通过 `setLayoutRoot()` 提供显式 layout tree。[E: packages/tui/src/tui-alt-screen.ts:202] [E: packages/tui/src/tui-alt-screen.ts:321] [E: packages/tui/src/tui-alt-screen.ts:321]

启动前进入 alternate screen、启用 mouse capture、关闭 autowrap 并隐藏光标；iTerm2 image protocol 在 fullscreen 期间被禁用，因为 placement 无法可靠删除/裁剪。[E: packages/tui/src/tui-alt-screen.ts:340] [E: packages/tui/src/tui-alt-screen.ts:350] [E: packages/tui/src/tui-alt-screen.ts:377]

停止时先 `closeSearch()`、关 mouse、删 Kitty images。`stop({ preserveScreen: true })` 只退出 alternate screen；否则把完整 document 打回 main screen scrollback，再恢复进入前的 image capabilities。[E: packages/tui/src/tui-alt-screen.ts:383] [E: packages/tui/src/tui-alt-screen.ts:400] [E: packages/tui/src/tui-alt-screen.ts:403] [E: packages/tui/src/tui-alt-screen.ts:416]

## 导航、鼠标与选择

`handleViewportInput()` 消费 `tui.altScreen.pageUp`/`pageDown`、默认未绑定的 `halfPage*`/`line*`、previous/next marked message、top/bottom，以及 search 开关。message jump 扫描 OSC 133 `A` marker，不应窄化成只跳用户 prompt。[E: packages/tui/src/tui-alt-screen.ts:672] [E: packages/tui/src/tui-alt-screen.ts:742] [E: packages/tui/src/tui-alt-screen.ts:770] [E: packages/tui/src/tui-alt-screen.ts:498] [E: packages/tui/src/tui-alt-screen.ts:505]

focused overlay（搜索框除外）拿走 wheel 与 viewport 键：`shouldDeferViewportInputToOverlay()` 为真时 wheel/PageUp/PageDown/Home/End 不 `consume`，落入 overlay `handleInput`。[E: packages/tui/src/tui-alt-screen.ts:661] [E: packages/tui/src/tui-alt-screen.ts:710] [E: packages/tui/src/tui-alt-screen.ts:741] 搜索 overlay focused 时该函数为假，transcript 继续滚。[E: packages/tui/src/tui-alt-screen.ts:662] [E: packages/tui/test/tui-alt-screen.test.ts:2030]

wheel 先命中 pointer 下 deepest ScrollView，再把未消费 delta 向外或 primary view chain；`overscroll:"contain"` 可终止传播。[E: packages/tui/src/tui-alt-screen.ts:975] [E: packages/tui/src/tui-alt-screen.ts:1287] [E: packages/tui/src/tui-alt-screen.ts:992] scrollbar 支持 hover、thumb drag；selection 靠近 viewport 边缘时会自动滚动。[E: packages/tui/src/tui-alt-screen.ts:1062] [E: packages/tui/src/tui-alt-screen.ts:1103]

wheel 事件先经 `WheelScrollAccelerator.next()` 换成行数。`TuiAltScreenOptions.wheelScrollLines` 默认 `1`;coding-agent fullscreen 注入 settings `fullscreenWheelScrollLines`(默认 `"auto"`)。`"auto"` 在本机 macOS 且无 SSH 时每事件 1 行(OS 已加速),其它环境按事件间隔加速到最多 6 行。Alt+SGR wheel(button bit 3 = 8)再乘 `ALT_WHEEL_SCROLL_MULTIPLIER = 5`。[E: packages/tui/src/tui-alt-screen.ts:173] [E: packages/tui/src/tui-alt-screen.ts:271] [E: packages/tui/src/tui-alt-screen.ts:699] [E: packages/tui/src/tui-alt-screen.ts:77] [E: packages/tui/src/tui-alt-screen.ts:702] [E: packages/tui/src/wheel-scroll.ts:2] [E: packages/tui/src/wheel-scroll.ts:18] [E: packages/tui/src/wheel-scroll.ts:43] [E: packages/tui/src/wheel-scroll.ts:55] [E: packages/coding-agent/src/modes/interactive/tui-renderer.ts:38] [E: packages/coding-agent/src/core/settings-manager.ts:188]

`scrollToEndIndicator` 在 follow-end 的 primary ScrollView 离开末端时，把可点击 jump-to-end 标签画在 transcript 最后一行；点击走 `handleScrollToEndIndicatorMouseEvent()` → `scrollToBottom()`。没有 follow-end 的 primary view 不显示。[E: packages/tui/src/tui-alt-screen.ts:186] [E: packages/tui/src/tui-alt-screen.ts:1634] [E: packages/tui/src/tui-alt-screen.ts:1029] [E: packages/tui/src/tui-alt-screen.ts:1033] [E: packages/tui/test/tui-alt-screen.test.ts:99] [E: packages/tui/test/tui-alt-screen.test.ts:216]

SGR 按下用 button `0`，松开同时认具体 release（button `0` + `m`）和 generic release（button `3` + `m`）。不少终端拖完只报 `\x1b[<3;x;ym`，不认 generic 就打不开 OSC 8、也完不成选择复制。[E: packages/tui/src/tui-alt-screen.ts:791] [E: packages/tui/src/tui-alt-screen.ts:1316] [E: packages/tui/test/tui-alt-screen.test.ts:1280] [E: packages/tui/test/tui-alt-screen.test.ts:1323]

无 drag 的 click 解析并打开 OSC 8 link。有选区且 `copyOnSelect` 为真时走 `copySelectionToClipboard()`；`copyOnSelect: false` 时松开只保留高亮，不写剪贴板。[E: packages/tui/src/tui-alt-screen.ts:192] [E: packages/tui/src/tui-alt-screen.ts:1356] [E: packages/tui/test/tui-alt-screen.test.ts:1381] 复制路径：若 options 提供 `copySelection(text) => Promise<boolean>`，成功 flash `Copied!`、失败 flash `Copy failed` 且不写 OSC 52；未注入 handler 时写 OSC 52 并 flash `Copied!`（终端若不实现 OSC 52，这一路无法自证失败）。[E: packages/tui/src/tui-alt-screen.ts:198] [E: packages/tui/src/tui-alt-screen.ts:1467] [E: packages/tui/src/tui-alt-screen.ts:1476]

FOCUS_OUT（`\x1b[O`）只取消正在进行的 press。idle 或零宽选区不 `requestRender()`，因此不会为清选区重绘；只有拖出可见选区的 active press 才清选并重绘。已经松开的可见选区跨 focus 变化保留。[E: packages/tui/src/tui-alt-screen.ts:673] [E: packages/tui/src/tui-alt-screen.ts:685]

`PI_TUI_ESC_TIMEOUT` 只作用于 lone ESC。`ProcessTerminal` 把它传给 `StdinBuffer.escapeTimeout`；incomplete CSI/mouse 仍用独立的 sequence timeout（默认 50ms）。正数覆盖默认 10ms（SSH 下 100ms）；`0`/非法值忽略。[E: packages/tui/src/terminal.ts:123] [E: packages/tui/src/terminal.ts:124] [E: packages/tui/src/terminal.ts:216] [E: packages/tui/src/stdin-buffer.ts:23] [E: packages/tui/src/stdin-buffer.ts:388]

双击 word selection 把 `/` 与 `-` 当 joiner，不再把 path / kebab-case 切开；权威细节在 `subsys.tui.alt-screen-search`。[E: packages/tui/src/tui-alt-screen.ts:85] [E: packages/tui/src/tui-alt-screen.ts:1169]

## copyOnSelect 与编程复制

`TuiAltScreenOptions.copyOnSelect` 默认 `true`：鼠标松开后自动走 clipboard 路径。[E: packages/tui/src/tui-alt-screen.ts:192] [E: packages/tui/src/tui-alt-screen.ts:279] 运行时可 `getCopyOnSelect()` / `setCopyOnSelect(enabled)`。[E: packages/tui/src/tui-alt-screen.ts:296] [E: packages/tui/src/tui-alt-screen.ts:300]

`hasActiveSelection()` 看当前是否有非空选区文本；`copyActiveSelectionToClipboard()` 用同一条 `copyTextToClipboard()` 路径复制，无选区返回 `false`。[E: packages/tui/src/tui-alt-screen.ts:305] [E: packages/tui/src/tui-alt-screen.ts:310]

coding-agent 把 settings `fullscreenCopyOnSelect`（默认 `true`）传给 `copyOnSelect`，并注入 `copySelection`（`copyToClipboard`）。[E: packages/coding-agent/src/core/settings-manager.ts:187] [E: packages/coding-agent/src/core/settings-manager.ts:1380] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:617] `fullscreenCopyOnSelect=false` 时禁用自动 copy。`app.message.copy` 带 `preferSelection: true` 时，只有 UI 是 `TuiAltScreen`、`getCopyOnSelect()` 为 false 且 `hasActiveSelection()` 为 true 才 `copyActiveSelectionToClipboard()`；默认 `fullscreenCopyOnSelect`/`copyOnSelect` 为 true 时走 last assistant message。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3067] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6569] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6570] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6571] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6572] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6574]

coding-agent fullscreen 还会注入 `scrollToEndIndicator`（`tui-renderer.ts`），文案带 `tui.altScreen.bottom` shortcut。[I]

## Flash 与图片缓存

内部 `AltScreenFlashContainer` 支持独立 timer 的叠加消息，默认 1000ms，并以 reverse-video 的右上角浮层合成；它没有从 package root 导出。[E: packages/tui/src/components/alt-screen-flash.ts:4] [E: packages/tui/src/components/alt-screen-flash.ts:13] [E: packages/tui/src/components/alt-screen-flash.ts:22] [E: packages/tui/src/tui-alt-screen.ts:1658]

Kitty image cache 以 transmission generation 判断是否可复用 placement，并保留 recently-offscreen images；硬上限为 16 个、32 MiB transmission bytes、64 MiB decoded bytes，超限从最旧的 offscreen entry 驱逐。[E: packages/tui/src/tui-alt-screen.ts:78] [E: packages/tui/src/tui-alt-screen.ts:79] [E: packages/tui/src/tui-alt-screen.ts:80] [E: packages/tui/src/tui-alt-screen.ts:433] [E: packages/tui/src/tui-alt-screen.ts:442]

## Gotchas

- mouse capture 会改变 terminal 原生选择行为。未注入 `copySelection` 时复制仍是 OSC 52 且总是报 `Copied!`；要报失败必须走 host handler 的 `false` 返回值。[E: packages/tui/src/tui-alt-screen.ts:377] [E: packages/tui/src/tui-alt-screen.ts:1467] [E: packages/tui/src/tui-alt-screen.ts:1476]
- `copyOnSelect: false` 只停自动 copy，不取消选区高亮；调用方必须自己触发 `copyActiveSelectionToClipboard()`。[E: packages/tui/src/tui-alt-screen.ts:1356] [E: packages/tui/test/tui-alt-screen.test.ts:1381]
- cache budgets 是 renderer 常量，不是 settings/API。[E: packages/tui/src/tui-alt-screen.ts:78]
- overlay 存在时 scrollbar pointer target 被禁用，避免背景滚动条拦截 modal interaction。[E: packages/tui/src/tui-alt-screen.ts:1038]
- `flash()`、scroll methods 与 selection APIs 属于具体 renderer，不在通用 `TUI` interface 中。[E: packages/tui/src/tui.ts:453]
- `PI_TUI_ESC_TIMEOUT` 不会拉长残缺 SGR/CSI 的等待；只延长单独一个 ESC 被当成 Escape 之前的窗口。[E: packages/tui/src/stdin-buffer.ts:388]
- overlay 内 `SelectList` / `SettingsList` 的 hover 不改 selection；见 `subsys.tui.overlay`。[I]

## Sources

- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/tui.ts`
- `packages/tui/src/components/alt-screen-flash.ts`
- `packages/tui/src/terminal-image.ts`
- `packages/tui/src/terminal.ts`
- `packages/tui/src/stdin-buffer.ts`
- `packages/tui/src/wheel-scroll.ts`
- `packages/tui/test/tui-alt-screen.test.ts`
- `packages/tui/test/stdin-buffer.test.ts`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/src/modes/interactive/tui-renderer.ts`
- `packages/coding-agent/src/core/settings-manager.ts`

## 相关

- `subsys.tui.runtime` — `TUI`/`TuiBase` 生命周期、`TuiStopOptions.preserveScreen` 与渲染调度。
- `subsys.tui.layout` — `ScrollView`、layout frame、scrollbar geometry。
- `subsys.tui.diff-engine` — viewport 行 diff。
- `subsys.tui.overlay` — overlay 栈与焦点；列表 hover 不改 selection。
- `subsys.tui.stdin-buffer` — lone ESC vs CSI/mouse 的 timeout 分流。
- `subsys.tui.alt-screen-search` — transcript 搜索，以及双击 word selection 的 `/`/`-` joiner。
- `ref.tui.keybinding-actions` — `tui.altScreen.*` 默认键 catalog。
