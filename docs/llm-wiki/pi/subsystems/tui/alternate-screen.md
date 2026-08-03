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
symbols:
  - TuiAltScreen
  - TuiAltScreenOptions
  - AltScreenFlashContainer
related:
  - subsys.tui.runtime
  - subsys.tui.layout
  - subsys.tui.diff-engine
  - subsys.tui.overlay
evidence: explicit
status: verified
updated: c1019d9202
---

> `TuiAltScreen` 是固定 viewport 的 fullscreen renderer，整合 alternate-screen lifecycle、layout、滚动导航、鼠标选择、链接、flash 与 Kitty placement cache。

## Lifecycle 与 document

renderer 实现 `ViewportTUI`，默认以 implicit `ScrollView(follow:end, primary:true)` 包裹普通 children，也允许调用方通过 `setLayoutRoot()` 提供显式 layout tree。[E: packages/tui/src/tui-alt-screen.ts:97] [E: packages/tui/src/tui-alt-screen.ts:134] [E: packages/tui/src/tui-alt-screen.ts:140] [E: packages/tui/src/tui-alt-screen.ts:156]

启动前进入 alternate screen、启用 mouse capture、关闭 autowrap并隐藏光标；iTerm2 image protocol 在 fullscreen 期间被禁用，因为 placement 无法可靠删除/裁剪。[E: packages/tui/src/tui-alt-screen.ts:180] [E: packages/tui/src/tui-alt-screen.ts:190] [E: packages/tui/src/tui-alt-screen.ts:201] [E: packages/tui/src/tui-alt-screen.ts:202]

停止时清理 image placement、退出 alternate screen，并把完整 document 渲染回 main screen scrollback，随后恢复进入前的 image capabilities。[E: packages/tui/src/tui-alt-screen.ts:206] [E: packages/tui/src/tui-alt-screen.ts:219] [E: packages/tui/src/tui-alt-screen.ts:224] [E: packages/tui/src/tui-alt-screen.ts:234]

## 导航、鼠标与选择

fullscreen listener 消费 page up/down、previous/next marked message、top/bottom 六个动作；message jump 通过扫描 OSC 133 `A` marker 实现，不应窄化描述为只跳用户 prompt。[E: packages/tui/src/tui-alt-screen.ts:316] [E: packages/tui/src/tui-alt-screen.ts:326] [E: packages/tui/src/tui-alt-screen.ts:367] [E: packages/tui/src/tui-alt-screen.ts:395]

wheel 先命中 pointer 下 deepest ScrollView，再把未消费 delta向外或 primary view chain；`overscroll:"contain"` 可终止传播。[E: packages/tui/src/tui-alt-screen.ts:427] [E: packages/tui/src/tui-alt-screen.ts:432] [E: packages/tui/src/tui-alt-screen.ts:433] scrollbar 支持 hover、track click 与 thumb drag，selection 靠近 viewport 边缘时会自动滚动。[E: packages/tui/src/tui-alt-screen.ts:452] [E: packages/tui/src/tui-alt-screen.ts:521] [E: packages/tui/src/tui-alt-screen.ts:528] [E: packages/tui/src/tui-alt-screen.ts:610]

无 drag 的 click 可以解析并打开 OSC 8 link；selection 通过 OSC 52 写 clipboard，再显示 `Copied!` flash。[E: packages/tui/src/tui-alt-screen.ts:614] [E: packages/tui/src/tui-alt-screen.ts:670] [E: packages/tui/src/tui-alt-screen.ts:709] [E: packages/tui/src/tui-alt-screen.ts:731]

## Flash 与图片缓存

内部 `AltScreenFlashContainer` 支持独立 timer 的叠加消息，默认 1000ms，并以 reverse-video 的右上角浮层合成；它没有从 package root 导出。[E: packages/tui/src/components/alt-screen-flash.ts:4] [E: packages/tui/src/components/alt-screen-flash.ts:13] [E: packages/tui/src/components/alt-screen-flash.ts:22] [E: packages/tui/src/tui-alt-screen.ts:805] [E: packages/tui/src/tui-alt-screen.ts:814]

Kitty image cache 以 transmission generation 判断是否可复用 placement，并保留 recently-offscreen images；硬上限为 16 个、32 MiB transmission bytes、64 MiB decoded bytes，超限从最旧的 offscreen entry 驱逐。[E: packages/tui/src/tui-alt-screen.ts:48] [E: packages/tui/src/tui-alt-screen.ts:49] [E: packages/tui/src/tui-alt-screen.ts:50] [E: packages/tui/src/tui-alt-screen.ts:244] [E: packages/tui/src/tui-alt-screen.ts:260] [E: packages/tui/src/tui-alt-screen.ts:284]

## Gotchas

- mouse capture 会改变 terminal 原生选择行为；复制依赖 terminal 对 OSC 52 的支持。[E: packages/tui/src/tui-alt-screen.ts:201] [E: packages/tui/src/tui-alt-screen.ts:731]
- cache budgets 是 renderer 常量，不是 settings/API。[E: packages/tui/src/tui-alt-screen.ts:48]
- overlay 存在时 scrollbar pointer target 被禁用，避免背景滚动条拦截 modal interaction。[E: packages/tui/src/tui-alt-screen.ts:452]
- `flash()`、scroll methods 与 selection APIs 属于具体 renderer，不在通用 `TUI` interface 中。[E: packages/tui/src/tui.ts:286]

## Sources

- `packages/tui/src/tui-alt-screen.ts`
- `packages/tui/src/components/alt-screen-flash.ts`
- `packages/tui/src/terminal-image.ts`
