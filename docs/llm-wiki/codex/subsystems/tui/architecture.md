---
id: subsys.tui.architecture
title: TUI 架构
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/resize_reflow.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/tui/screen_size.rs, codex-rs/tui/src/lib.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/bottom_pane/mod.rs]
symbols: [tui::App, App::run, resolve_startup_resume_or_fork_cwd, tui::Tui]
related: [subsys.tui.event-system, subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.tui.keymap, subsys.tui.rendering-theming, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 7750465934
---

> 当前 TUI 是 `App` 会话编排层、`ChatWidget` 主聊天状态机、`BottomPane` 输入/弹层容器、`Tui` 终端包装层和 app-server event stream 的组合；大量逻辑已经从旧版单文件 `app.rs` 拆到 `app/*`、`chatwidget/*`、`bottom_pane/*` 模块。[E: codex-rs/tui/src/app.rs:511][E: codex-rs/tui/src/app.rs:515][E: codex-rs/tui/src/chatwidget.rs:543][E: codex-rs/tui/src/bottom_pane/mod.rs:220][E: codex-rs/tui/src/tui.rs:568][I]

## 能回答的问题

- `App::run` 如何把外部传入的 `AppServerSession`、bootstrap、thread selection 和 main loop 接起来？
- terminal events、app events、active thread events、app-server events 在哪里合流？
- `Tui` 和 `App` 的职责边界是什么？
- alternate screen 当前由什么配置真正控制？

## 职责边界

`App` 是 session-level container：它保存 `SessionTelemetry`、`AppEventSender`、`ChatWidget`、config、file search、transcript cells、pager overlay、resolved keymap 与 chord matcher、commit animation state、thread event channels、side threads、active/primary thread id 和 pending app-server requests。[E: codex-rs/tui/src/app.rs:511][E: codex-rs/tui/src/app.rs:513][E: codex-rs/tui/src/app.rs:514][E: codex-rs/tui/src/app.rs:515][E: codex-rs/tui/src/app.rs:518][E: codex-rs/tui/src/app.rs:528][E: codex-rs/tui/src/app.rs:530][E: codex-rs/tui/src/app.rs:533][E: codex-rs/tui/src/app.rs:540][E: codex-rs/tui/src/app.rs:541][E: codex-rs/tui/src/app.rs:544][E: codex-rs/tui/src/app.rs:578][E: codex-rs/tui/src/app.rs:581][E: codex-rs/tui/src/app.rs:583][E: codex-rs/tui/src/app.rs:585][E: codex-rs/tui/src/app.rs:589]

`Tui` 是 terminal wrapper：它持有 `FrameRequester`、draw channel、shared `EventBroker`、terminal backend、pending history、screen-size policy、pet image state、alt-screen/focus state、notification backend、Zellij detection 和 `alt_screen_enabled` flag。[E: codex-rs/tui/src/tui.rs:568][E: codex-rs/tui/src/tui.rs:569][E: codex-rs/tui/src/tui.rs:570][E: codex-rs/tui/src/tui.rs:571][E: codex-rs/tui/src/tui.rs:572][E: codex-rs/tui/src/tui.rs:573][E: codex-rs/tui/src/tui.rs:574][E: codex-rs/tui/src/tui.rs:575][E: codex-rs/tui/src/tui.rs:577][E: codex-rs/tui/src/tui.rs:581][E: codex-rs/tui/src/tui.rs:583][E: codex-rs/tui/src/tui.rs:585][E: codex-rs/tui/src/tui.rs:588][E: codex-rs/tui/src/tui.rs:590]

`TuiEvent` 当前有五类：terminal key、paste payload、resize、scheduled draw 和 suspend 返回后的 resume redraw；raw crossterm event fan-out 被 `TuiEventStream`/`EventBroker` 封装。[E: codex-rs/tui/src/tui.rs:548][E: codex-rs/tui/src/tui.rs:551][E: codex-rs/tui/src/tui.rs:553][E: codex-rs/tui/src/tui.rs:558][E: codex-rs/tui/src/tui.rs:560][E: codex-rs/tui/src/tui.rs:565][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:153]

## Startup 与 main loop

`App::run` 的第二个参数是 `mut app_server: AppServerSession`；函数内部建立 `AppEventSender`、应用 TUI notification settings，优先使用传入的 startup bootstrap，否则调用 `app_server.bootstrap(&config)`。[E: codex-rs/tui/src/app.rs:772][E: codex-rs/tui/src/app.rs:774][E: codex-rs/tui/src/app.rs:796][E: codex-rs/tui/src/app.rs:797][E: codex-rs/tui/src/app.rs:800][E: codex-rs/tui/src/app.rs:807][E: codex-rs/tui/src/app.rs:809]

fresh/resume/fork 三种入口都构造 `ChatWidgetInit` 并调用 `ChatWidget::new_with_app_event`；fresh path 先异步 `spawn_startup_thread_start`，resume/fork path 则直接调用 app-server `resume_thread`/`fork_thread` 并把 started thread 作为 `initial_started_thread` 交给 app。[E: codex-rs/tui/src/app.rs:903][E: codex-rs/tui/src/app.rs:905][E: codex-rs/tui/src/app.rs:910][E: codex-rs/tui/src/app.rs:937][E: codex-rs/tui/src/app.rs:941][E: codex-rs/tui/src/app.rs:946][E: codex-rs/tui/src/app.rs:977][E: codex-rs/tui/src/app.rs:979][E: codex-rs/tui/src/app.rs:985][E: codex-rs/tui/src/app.rs:1016]

startup resume/fork 现在在真正 attach 前调用 `resolve_startup_resume_or_fork_cwd`，把 `tui.resume_cwd`、显式 `--cd`、session cwd 和 state-db remembered choice 收敛为 fallback cwd，再以它重载最终 config。remote workspace 的 `current` 模式必须显式给 `--cd`；remote workspace 本身则沿用 app-server config cwd，不弹 local cwd prompt。[E: codex-rs/tui/src/lib.rs:782][E: codex-rs/tui/src/lib.rs:791][E: codex-rs/tui/src/lib.rs:802][E: codex-rs/tui/src/lib.rs:803][E: codex-rs/tui/src/lib.rs:811][E: codex-rs/tui/src/lib.rs:815][E: codex-rs/tui/src/lib.rs:1648][E: codex-rs/tui/src/lib.rs:1684]

主循环是一个 `tokio::select!`：app event 进入 `App::handle_event`，active thread channel 进入 `handle_active_thread_event`，terminal event 进入 `handle_tui_event`，app-server event stream 进入 `handle_app_server_event`；退出后统一尝试 `app_server.shutdown()` 并清理 terminal。[E: codex-rs/tui/src/app.rs:1193][E: codex-rs/tui/src/app.rs:1194][E: codex-rs/tui/src/app.rs:1195][E: codex-rs/tui/src/app.rs:1196][E: codex-rs/tui/src/app.rs:1201][E: codex-rs/tui/src/app.rs:1212][E: codex-rs/tui/src/app.rs:1220][E: codex-rs/tui/src/app.rs:1222][E: codex-rs/tui/src/app.rs:1231][E: codex-rs/tui/src/app.rs:1233][E: codex-rs/tui/src/app.rs:1254][E: codex-rs/tui/src/app.rs:1257]

## Terminal 与 alternate screen

`Tui::event_stream` 创建 `TuiEventStream`，共享 `EventBroker` 以避免多个 crossterm readers 争抢 stdin；`pause_events`/`resume_events` 通过 drop/recreate underlying event stream 让外部交互程序临时接管终端输入。[E: codex-rs/tui/src/tui.rs:676][E: codex-rs/tui/src/tui.rs:676][E: codex-rs/tui/src/tui.rs:682][E: codex-rs/tui/src/tui.rs:760][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:51]

当前 alternate-screen 控制是代码事实：CLI 计算 `determine_alt_screen_mode(no_alt_screen, config.tui_alternate_screen)` 后调用 `tui.set_alt_screen_enabled`；`--no-alt-screen` 直接禁用，除此之外只有 `AltScreenMode::Never` 禁用。不要沿用旧文档里“auto 在 Zellij 禁用”的说法。[E: codex-rs/tui/src/lib.rs:1748][E: codex-rs/tui/src/lib.rs:1749][E: codex-rs/tui/src/lib.rs:1891][E: codex-rs/tui/src/lib.rs:1891][E: codex-rs/tui/src/lib.rs:1892][E: codex-rs/tui/src/lib.rs:1896]

`enter_alt_screen` 会在 enabled 时发送 `EnterAlternateScreen` 和 `EnableAlternateScroll`，保存 inline viewport 并把 viewport 扩到 terminal size；`leave_alt_screen` 反向禁用 alternate scroll、离开 alternate screen 并恢复 saved viewport。[E: codex-rs/tui/src/tui.rs:780][E: codex-rs/tui/src/tui.rs:781][E: codex-rs/tui/src/tui.rs:784][E: codex-rs/tui/src/tui.rs:786][E: codex-rs/tui/src/tui.rs:787][E: codex-rs/tui/src/tui.rs:788][E: codex-rs/tui/src/tui.rs:790][E: codex-rs/tui/src/tui.rs:798][E: codex-rs/tui/src/tui.rs:803][E: codex-rs/tui/src/tui.rs:808][E: codex-rs/tui/src/tui.rs:809][E: codex-rs/tui/src/tui.rs:810][E: codex-rs/tui/src/tui.rs:813]

## Screen geometry 与 focus

`ScreenSizePolicy` 避免每次 redraw 都查询 terminal backend：普通 `Draw`/`Key`/`Paste` 优先用 cached or deferred size，`Resize` 直接用 event payload，显式 `Resume` 立即重查 backend；若 scheduled `Draw` 到达已过期的 recheck deadline，也会经 Resume sampling path 查询 backend。resize/reflow 后还会排一次 delayed sample，用于捕捉 terminal 稳定后的最终尺寸。[E: codex-rs/tui/src/tui/screen_size.rs:20][E: codex-rs/tui/src/tui/screen_size.rs:23][E: codex-rs/tui/src/tui/screen_size.rs:25][E: codex-rs/tui/src/tui/screen_size.rs:30][E: codex-rs/tui/src/tui/screen_size.rs:36][E: codex-rs/tui/src/tui/screen_size.rs:42][E: codex-rs/tui/src/tui/screen_size.rs:47][E: codex-rs/tui/src/tui/screen_size.rs:56][E: codex-rs/tui/src/app/resize_reflow.rs:421]

`FocusGained` 现在只更新 focus flag 并请求 draw，继续使用 startup-cached palette；它不在 input loop 内重查前景/背景色，避免阻塞并丢失 focus 返回期间已排队的 key。[E: codex-rs/tui/src/tui/event_stream.rs:274][E: codex-rs/tui/src/tui/event_stream.rs:275][E: codex-rs/tui/src/tui/event_stream.rs:278]

## Gotchas

- `App::run` 不再自己“创建 session 后端”；它接收 `AppServerSession` 并在 startup path 上 bootstrap/resume/fork/start thread。[E: codex-rs/tui/src/app.rs:772][E: codex-rs/tui/src/app.rs:774][E: codex-rs/tui/src/app.rs:809][I]
- `app.rs` 仍是 orchestration hub，但 app event dispatch、server events、thread routing、input handling 等都已拆分到 `app/*` 子模块；行号不要从旧单文件 mental model 迁移。[E: codex-rs/tui/src/app/event_dispatch.rs:18][E: codex-rs/tui/src/app/event_dispatch.rs:24][E: codex-rs/tui/src/app/app_server_events.rs:32]
- syntax theme 要在 resume/fork 可能触发的最后一次 config reload 之后设置；提前设置会拿到错误 cwd 下的 theme config。[E: codex-rs/tui/src/lib.rs:1712]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/app/resize_reflow.rs`
- `codex-rs/tui/src/tui.rs`
- `codex-rs/tui/src/tui/event_stream.rs`
- `codex-rs/tui/src/tui/screen_size.rs`
- `codex-rs/tui/src/lib.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`

## 相关

- `subsys.tui.event-system`: `AppEvent` 与 app-server events 的路由。
- `subsys.tui.chatwidget`: 主聊天 widget 的输入、协议通知和 rendering state。
- `subsys.tui.bottom-pane`: bottom pane/composer/modal stack。
- `subsys.tui.keymap`: raw config 到 chord-aware runtime dispatch。
- `subsys.tui.rendering-theming`: width、hyperlink 与 terminal diff 细节。
