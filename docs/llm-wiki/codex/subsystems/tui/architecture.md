---
id: subsys.tui.architecture
title: TUI 架构
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/lib.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/bottom_pane/mod.rs]
symbols: [App, App::run, App::handle_event, Tui, TuiEvent, TuiEventStream, ChatWidget, BottomPane]
related: [subsys.tui.event-system, subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 5670360009
---

> 当前 TUI 是 `App` 会话编排层、`ChatWidget` 主聊天状态机、`BottomPane` 输入/弹层容器、`Tui` 终端包装层和 app-server event stream 的组合；大量逻辑已经从旧版单文件 `app.rs` 拆到 `app/*`、`chatwidget/*`、`bottom_pane/*` 模块。[E: codex-rs/tui/src/app.rs:503][E: codex-rs/tui/src/app.rs:507][E: codex-rs/tui/src/chatwidget.rs:514][E: codex-rs/tui/src/bottom_pane/mod.rs:206][E: codex-rs/tui/src/tui.rs:525][I]

## 能回答的问题

- `App::run` 如何把外部传入的 `AppServerSession`、bootstrap、thread selection 和 main loop 接起来？
- terminal events、app events、active thread events、app-server events 在哪里合流？
- `Tui` 和 `App` 的职责边界是什么？
- alternate screen 当前由什么配置真正控制？

## 职责边界

`App` 是 session-level container：它保存 `SessionTelemetry`、`AppEventSender`、`ChatWidget`、config、file search、transcript cells、pager overlay、keymap、commit animation state、thread event channels、side threads、active/primary thread id 和 pending app-server requests。[E: codex-rs/tui/src/app.rs:503][E: codex-rs/tui/src/app.rs:505][E: codex-rs/tui/src/app.rs:506][E: codex-rs/tui/src/app.rs:507][E: codex-rs/tui/src/app.rs:510][E: codex-rs/tui/src/app.rs:519][E: codex-rs/tui/src/app.rs:521][E: codex-rs/tui/src/app.rs:524][E: codex-rs/tui/src/app.rs:531][E: codex-rs/tui/src/app.rs:534][E: codex-rs/tui/src/app.rs:568][E: codex-rs/tui/src/app.rs:572][E: codex-rs/tui/src/app.rs:574][E: codex-rs/tui/src/app.rs:578]

`Tui` 是 terminal wrapper：它持有 `FrameRequester`、draw channel、shared `EventBroker`、terminal backend、alt-screen state、focus state、notification backend 和 `alt_screen_enabled` flag。[E: codex-rs/tui/src/tui.rs:525][E: codex-rs/tui/src/tui.rs:526][E: codex-rs/tui/src/tui.rs:527][E: codex-rs/tui/src/tui.rs:528][E: codex-rs/tui/src/tui.rs:529][E: codex-rs/tui/src/tui.rs:533][E: codex-rs/tui/src/tui.rs:537][E: codex-rs/tui/src/tui.rs:539][E: codex-rs/tui/src/tui.rs:541][E: codex-rs/tui/src/tui.rs:546]

`TuiEvent` 当前只有四类：terminal key、paste payload、resize 和 scheduled draw；raw crossterm event fan-out 被 `TuiEventStream`/`EventBroker` 封装。[E: codex-rs/tui/src/tui.rs:510][E: codex-rs/tui/src/tui.rs:511][E: codex-rs/tui/src/tui.rs:513][E: codex-rs/tui/src/tui.rs:515][E: codex-rs/tui/src/tui.rs:520][E: codex-rs/tui/src/tui.rs:522][E: codex-rs/tui/src/tui/event_stream.rs:47][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:132][E: codex-rs/tui/src/tui/event_stream.rs:139]

## Startup 与 main loop

`App::run` 的第二个参数是 `mut app_server: AppServerSession`；函数内部建立 `AppEventSender`、应用 TUI notification settings，优先使用传入的 startup bootstrap，否则调用 `app_server.bootstrap(&config)`。[E: codex-rs/tui/src/app.rs:759][E: codex-rs/tui/src/app.rs:761][E: codex-rs/tui/src/app.rs:782][E: codex-rs/tui/src/app.rs:783][E: codex-rs/tui/src/app.rs:786][E: codex-rs/tui/src/app.rs:793][E: codex-rs/tui/src/app.rs:795]

fresh/resume/fork 三种入口都构造 `ChatWidgetInit` 并调用 `ChatWidget::new_with_app_event`；fresh path 先异步 `spawn_startup_thread_start`，resume/fork path 则直接调用 app-server `resume_thread`/`fork_thread` 并把 started thread 作为 `initial_started_thread` 交给 app。[E: codex-rs/tui/src/app.rs:878][E: codex-rs/tui/src/app.rs:879][E: codex-rs/tui/src/app.rs:880][E: codex-rs/tui/src/app.rs:912][E: codex-rs/tui/src/app.rs:917][E: codex-rs/tui/src/app.rs:918][E: codex-rs/tui/src/app.rs:948][E: codex-rs/tui/src/app.rs:956][E: codex-rs/tui/src/app.rs:957][E: codex-rs/tui/src/app.rs:987]

主循环是一个 `tokio::select!`：app event 进入 `App::handle_event`，active thread channel 进入 `handle_active_thread_event`，terminal event 进入 `handle_tui_event`，app-server event stream 进入 `handle_app_server_event`；退出后统一尝试 `app_server.shutdown()` 并清理 terminal。[E: codex-rs/tui/src/app.rs:1157][E: codex-rs/tui/src/app.rs:1158][E: codex-rs/tui/src/app.rs:1159][E: codex-rs/tui/src/app.rs:1160][E: codex-rs/tui/src/app.rs:1165][E: codex-rs/tui/src/app.rs:1176][E: codex-rs/tui/src/app.rs:1184][E: codex-rs/tui/src/app.rs:1186][E: codex-rs/tui/src/app.rs:1195][E: codex-rs/tui/src/app.rs:1197][E: codex-rs/tui/src/app.rs:1218][E: codex-rs/tui/src/app.rs:1221]

## Terminal 与 alternate screen

`Tui::event_stream` 创建 `TuiEventStream`，共享 `EventBroker` 以避免多个 crossterm readers 争抢 stdin；`pause_events`/`resume_events` 通过 drop/recreate underlying event stream 让外部交互程序临时接管终端输入。[E: codex-rs/tui/src/tui.rs:630][E: codex-rs/tui/src/tui.rs:631][E: codex-rs/tui/src/tui.rs:637][E: codex-rs/tui/src/tui.rs:714][E: codex-rs/tui/src/tui/event_stream.rs:10][E: codex-rs/tui/src/tui/event_stream.rs:11][E: codex-rs/tui/src/tui/event_stream.rs:51]

当前 alternate-screen 控制是代码事实：CLI 计算 `determine_alt_screen_mode(no_alt_screen, config.tui_alternate_screen)` 后调用 `tui.set_alt_screen_enabled`；`--no-alt-screen` 直接禁用，除此之外只有 `AltScreenMode::Never` 禁用。不要沿用旧文档里“auto 在 Zellij 禁用”的说法。[E: codex-rs/tui/src/lib.rs:1707][E: codex-rs/tui/src/lib.rs:1708][E: codex-rs/tui/src/lib.rs:1842][E: codex-rs/tui/src/lib.rs:1849][E: codex-rs/tui/src/lib.rs:1850][E: codex-rs/tui/src/lib.rs:1854]

`enter_alt_screen` 会在 enabled 时发送 `EnterAlternateScreen` 和 `EnableAlternateScroll`，保存 inline viewport 并把 viewport 扩到 terminal size；`leave_alt_screen` 反向禁用 alternate scroll、离开 alternate screen 并恢复 saved viewport。[E: codex-rs/tui/src/tui.rs:732][E: codex-rs/tui/src/tui.rs:734][E: codex-rs/tui/src/tui.rs:735][E: codex-rs/tui/src/tui.rs:738][E: codex-rs/tui/src/tui.rs:740][E: codex-rs/tui/src/tui.rs:742][E: codex-rs/tui/src/tui.rs:751][E: codex-rs/tui/src/tui.rs:756][E: codex-rs/tui/src/tui.rs:760][E: codex-rs/tui/src/tui.rs:762][E: codex-rs/tui/src/tui.rs:763][E: codex-rs/tui/src/tui.rs:766]

## Gotchas

- `App::run` 不再自己“创建 session 后端”；它接收 `AppServerSession` 并在 startup path 上 bootstrap/resume/fork/start thread。[E: codex-rs/tui/src/app.rs:759][E: codex-rs/tui/src/app.rs:761][E: codex-rs/tui/src/app.rs:795]
- `app.rs` 仍是 orchestration hub，但 app event dispatch、server events、thread routing、input handling 等都已拆分到 `app/*` 子模块；行号不要从旧单文件 mental model 迁移。[E: codex-rs/tui/src/app/event_dispatch.rs:1][E: codex-rs/tui/src/app/event_dispatch.rs:3][E: codex-rs/tui/src/app/app_server_events.rs:1]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/tui.rs`
- `codex-rs/tui/src/tui/event_stream.rs`
- `codex-rs/tui/src/lib.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`

## 相关

- `subsys.tui.event-system`: `AppEvent` 与 app-server events 的路由。
- `subsys.tui.chatwidget`: 主聊天 widget 的输入、协议通知和 rendering state。
- `subsys.tui.bottom-pane`: bottom pane/composer/modal stack。
