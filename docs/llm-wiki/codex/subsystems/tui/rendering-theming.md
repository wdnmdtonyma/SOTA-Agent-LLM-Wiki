---
id: subsys.tui.rendering-theming
title: Rendering 与 Theming
kind: subsystem
tier: T2
source: [codex-rs/tui/src/render/renderable.rs, codex-rs/tui/src/render/highlight.rs, codex-rs/ansi-escape/src/lib.rs, codex-rs/tui/src/chatwidget/rendering.rs, codex-rs/tui/src/pager_overlay.rs]
symbols: [Renderable, RenderableItem, ColumnRenderable, set_theme_override, adaptive_default_theme_name, ansi_escape_line, ansi_escape]
related: [subsys.tui.chatwidget, subsys.tui.streaming-pipeline, subsys.tui.overlays-dialogs]
evidence: explicit
status: verified
updated: db887d03e1
---

> TUI rendering 以 small `Renderable` trait 为公共拼装接口，以 syntect/two_face 主题解析代码处理 syntax highlight，以 `ansi-escape` crate 把 ANSI output 转成 ratatui text；ChatWidget/pager/bottom pane 再组合这些 renderables。[E: codex-rs/tui/src/render/renderable.rs:14][E: codex-rs/tui/src/render/highlight.rs:48][E: codex-rs/ansi-escape/src/lib.rs:26][E: codex-rs/tui/src/chatwidget/rendering.rs:5][E: codex-rs/tui/src/pager_overlay.rs:120]

## 能回答的问题

- `Renderable` 的最小 contract 是什么？
- composite renderable 如何计算高度、光标位置和 cursor style？
- syntax theme override、custom theme 和 adaptive default 如何解析？
- ANSI output 进入 TUI 前在哪里转成 ratatui text？

## Renderable Contract

`Renderable` 只要求 `render(area, buf)` 和 `desired_height(width)`，默认 cursor position 为 none、cursor style 为 terminal default user shape；这让 history cells、bottom-pane fragments 和 pager content 可以被共同测高/渲染。[E: codex-rs/tui/src/render/renderable.rs:14][E: codex-rs/tui/src/render/renderable.rs:15][E: codex-rs/tui/src/render/renderable.rs:16][E: codex-rs/tui/src/render/renderable.rs:17][E: codex-rs/tui/src/render/renderable.rs:20]

`RenderableItem` 可以包 owned 或 borrowed child，并把 render/height/cursor 方法直接分发给 child；基础 impl 覆盖 `()`、`&str`、`String`、`Span`、`Line`、`Paragraph`、`Option<R>` 和 `Arc<R>`。[E: codex-rs/tui/src/render/renderable.rs:25][E: codex-rs/tui/src/render/renderable.rs:26][E: codex-rs/tui/src/render/renderable.rs:27][E: codex-rs/tui/src/render/renderable.rs:31][E: codex-rs/tui/src/render/renderable.rs:38][E: codex-rs/tui/src/render/renderable.rs:45][E: codex-rs/tui/src/render/renderable.rs:52][E: codex-rs/tui/src/render/renderable.rs:75][E: codex-rs/tui/src/render/renderable.rs:82][E: codex-rs/tui/src/render/renderable.rs:91][E: codex-rs/tui/src/render/renderable.rs:100][E: codex-rs/tui/src/render/renderable.rs:109][E: codex-rs/tui/src/render/renderable.rs:118][E: codex-rs/tui/src/render/renderable.rs:127][E: codex-rs/tui/src/render/renderable.rs:155]

`ColumnRenderable` 顺序渲染 children，逐个用 child desired height 切分 area；它的 total desired height 是 children 高度和，光标位置/样式取第一个有 cursor 的 child。[E: codex-rs/tui/src/render/renderable.rs:170][E: codex-rs/tui/src/render/renderable.rs:175][E: codex-rs/tui/src/render/renderable.rs:178][E: codex-rs/tui/src/render/renderable.rs:181][E: codex-rs/tui/src/render/renderable.rs:187][E: codex-rs/tui/src/render/renderable.rs:190][E: codex-rs/tui/src/render/renderable.rs:194][E: codex-rs/tui/src/render/renderable.rs:198][E: codex-rs/tui/src/render/renderable.rs:204][E: codex-rs/tui/src/render/renderable.rs:213][E: codex-rs/tui/src/render/renderable.rs:218]

## Syntax Theme

highlight module 用 `OnceLock` 保存 syntax set、theme、theme override 和 codex home；`set_theme_override` 应在 final resolved config 后调用，第一次持久化 override/home，后续调用仍会 live update runtime theme 并返回 user-facing warnings。[E: codex-rs/tui/src/render/highlight.rs:48][E: codex-rs/tui/src/render/highlight.rs:49][E: codex-rs/tui/src/render/highlight.rs:50][E: codex-rs/tui/src/render/highlight.rs:51][E: codex-rs/tui/src/render/highlight.rs:70][E: codex-rs/tui/src/render/highlight.rs:72][E: codex-rs/tui/src/render/highlight.rs:73][E: codex-rs/tui/src/render/highlight.rs:76][E: codex-rs/tui/src/render/highlight.rs:79]

custom theme 路径是 `{codex_home}/themes/{name}.tmTheme`，解析顺序是 bundled theme name 先于 custom theme file；adaptive default 根据 terminal background lightness 选择 `catppuccin-latte` 或 `catppuccin-mocha`。[E: codex-rs/tui/src/render/highlight.rs:175][E: codex-rs/tui/src/render/highlight.rs:176][E: codex-rs/tui/src/render/highlight.rs:180][E: codex-rs/tui/src/render/highlight.rs:184][E: codex-rs/tui/src/render/highlight.rs:186][E: codex-rs/tui/src/render/highlight.rs:187][E: codex-rs/tui/src/render/highlight.rs:189][E: codex-rs/tui/src/render/highlight.rs:199][E: codex-rs/tui/src/render/highlight.rs:205][E: codex-rs/tui/src/render/highlight.rs:209][E: codex-rs/tui/src/render/highlight.rs:214]

## ANSI 与 Chat Surface

`ansi_escape_line` 会先把 tab 展开成 spaces，调用 `ansi_escape`，若得到多行则 warning 并只取第一行；`ansi_escape` 使用 `ansi_to_tui::IntoText` 把字符串转成 `Text`，错误路径 log 后 panic。[E: codex-rs/ansi-escape/src/lib.rs:6][E: codex-rs/ansi-escape/src/lib.rs:11][E: codex-rs/ansi-escape/src/lib.rs:23][E: codex-rs/ansi-escape/src/lib.rs:26][E: codex-rs/ansi-escape/src/lib.rs:27][E: codex-rs/ansi-escape/src/lib.rs:29][E: codex-rs/ansi-escape/src/lib.rs:33][E: codex-rs/ansi-escape/src/lib.rs:40][E: codex-rs/ansi-escape/src/lib.rs:43][E: codex-rs/ansi-escape/src/lib.rs:47]

Chat surface 由 `ChatWidget::as_renderable` 组装 transcript、active/hook cells、token/rate-limit/warning rows、bottom pane 等，pager overlay 则用 `PagerView` 渲染一组 renderables 并管理 scroll state。[E: codex-rs/tui/src/chatwidget/rendering.rs:5][E: codex-rs/tui/src/chatwidget/rendering.rs:6][E: codex-rs/tui/src/chatwidget/rendering.rs:17][E: codex-rs/tui/src/chatwidget/rendering.rs:28][E: codex-rs/tui/src/chatwidget/rendering.rs:47][E: codex-rs/tui/src/pager_overlay.rs:120][E: codex-rs/tui/src/pager_overlay.rs:121][E: codex-rs/tui/src/pager_overlay.rs:122]

## Gotchas

- `set_theme_override` 的 `OnceLock` 语义意味着第一次 call 固定 override/home 输入；live preview 可以 update runtime theme，但不能改已经持久化的 OnceLock 值。[E: codex-rs/tui/src/render/highlight.rs:72][E: codex-rs/tui/src/render/highlight.rs:73][E: codex-rs/tui/src/render/highlight.rs:76]
- `ansi_escape_line` 不是多行 renderer；多行 output 应走 `ansi_escape` 或逐行处理。[E: codex-rs/ansi-escape/src/lib.rs:26][E: codex-rs/ansi-escape/src/lib.rs:24][E: codex-rs/ansi-escape/src/lib.rs:33]

## Sources

- `codex-rs/tui/src/render/renderable.rs`
- `codex-rs/tui/src/render/highlight.rs`
- `codex-rs/ansi-escape/src/lib.rs`
- `codex-rs/tui/src/chatwidget/rendering.rs`
- `codex-rs/tui/src/pager_overlay.rs`

## 相关

- `subsys.tui.streaming-pipeline`: streaming controllers 产生 history cells/renderables。
- `subsys.tui.overlays-dialogs`: pager overlay 对 renderables 的使用。
