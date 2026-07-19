---
id: subsys.tui.architecture
title: TUI 架构
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/lib.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/bottom_pane/mod.rs]
symbols: [App, App::run, App::handle_event, resolve_startup_resume_or_fork_cwd, Tui, TuiEvent, TuiEventStream, ChatWidget, BottomPane]
related: [subsys.tui.event-system, subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> 当前 TUI 是 `App` 会话编排层、`ChatWidget` 主聊天状态机、`BottomPane` 输入/弹层容器、`Tui` 终端包装层和 app-server event stream 的组合；大量逻辑已经从旧版单文件 `app.rs` 拆到 `app/*`、`chatwidget/*`、`bottom_pane/*` 模块。[E: codex-rs/tui/src/app.rs:507][E: codex-rs/tui/src/app.rs:511][E: codex-rs/tui/src/chatwidget.rs:534][E: codex-rs/tui/src/bottom_pane/mod.rs:213][E: codex-rs/tui/src/tui.rs:542][I]

## 能回答的问题

- `App::run` 如何把外部传入的 `AppServerSession`、bootstrap、thread selection 和 main loop 接起来？
- terminal events、app events、active thread events、app-server events 在哪里合流？
- `Tui` 和 `App` 的职责边界是什么？
- alternate screen 当前由什么配置真正控制？

## 职责边界

`App` 是 session-level container：它保存 `SessionTelemetry`、`AppEventSender`、`ChatWidget`、config、file search、transcript cells、pager overlay、keymap、commit animation state、thread event channels、side threads、active/primary thread id 和 pending app-server requests。[E: codex-rs/tui/src/app.rs:507][E: codex-rs/tui/src/app.rs:509][E: codex-rs/tui/src/app.rs:510][E: codex-rs/tui/src/app.rs:511][E: codex-rs/tui/src/app.rs:514][E: codex-rs/tui/src/app.rs:524][E: codex-rs/tui/src/app.rs:526][E: codex-rs/tui/src/app.rs:529][E: codex-rs/tui/src/app.rs:536][E: codex-rs/tui/src/app.rs:539][E: codex-rs/tui/src/app.rs:573][E: codex-rs/tui/src/app.rs:576][E: codex-rs/tui/src/app.rs:577][E: codex-rs/tui/src/app.rs:579][E: codex-rs/tui/src/app.rs:583]

`Tui` 是 terminal wrapper：它持有 `FrameRequester`、draw channel、shared `EventBroker`、terminal backend、alt-screen state、focus state、notification backend、Zellij detection 和 `alt_screen_enabled` flag。[E: codex-rs/tui/src/tui.rs:542][E: codex-rs/tui/src/tui.rs:543][E: codex-rs/tui/src/tui.rs:544][E: codex-rs/tui/src/tui.rs:545][E: codex-rs/tui/src/tui.rs:546][E: codex-rs/tui/src/tui.rs:550][E: codex-rs/tui/src/tui.rs:554][E: codex-rs/tui/src/tui.rs:556][E: codex-rs/tui/src/tui.rs:558][E: codex-rs/tui/src/tui.rs:561][E: codex-rs/tui/src/tui.rs:563]

`TuiEvent` 当前只有四类：terminal key、paste payload、resize 和 scheduled draw；raw crossterm event fan-out 被 `TuiEventStream`/`EventBroker` 封装。[E: codex-rs/tui/src/tui.rs:527][E: codex-rs/tui/src/tui.rs:530][E: codex-rs/tui/src/tui.rs:532][E: codex-rs/tui/src/tui.rs:537][E: codex-rs/tui/src/tui.rs:539][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:139][E: codex-rs/tui/src/tui/event_stream.rs:139]

## Startup 与 main loop

`App::run` 的第二个参数是 `mut app_server: AppServerSession`；函数内部建立 `AppEventSender`、应用 TUI notification settings，优先使用传入的 startup bootstrap，否则调用 `app_server.bootstrap(&config)`。[E: codex-rs/tui/src/app.rs:766][E: codex-rs/tui/src/app.rs:768][E: codex-rs/tui/src/app.rs:790][E: codex-rs/tui/src/app.rs:791][E: codex-rs/tui/src/app.rs:794][E: codex-rs/tui/src/app.rs:801][E: codex-rs/tui/src/app.rs:803]

fresh/resume/fork 三种入口都构造 `ChatWidgetInit` 并调用 `ChatWidget::new_with_app_event`；fresh path 先异步 `spawn_startup_thread_start`，resume/fork path 则直接调用 app-server `resume_thread`/`fork_thread` 并把 started thread 作为 `initial_started_thread` 交给 app。[E: codex-rs/tui/src/app.rs:897][E: codex-rs/tui/src/app.rs:899][E: codex-rs/tui/src/app.rs:904][E: codex-rs/tui/src/app.rs:931][E: codex-rs/tui/src/app.rs:935][E: codex-rs/tui/src/app.rs:940][E: codex-rs/tui/src/app.rs:971][E: codex-rs/tui/src/app.rs:973][E: codex-rs/tui/src/app.rs:979][E: codex-rs/tui/src/app.rs:1010]

startup resume/fork 现在在真正 attach 前调用 `resolve_startup_resume_or_fork_cwd`，把 `tui.resume_cwd`、显式 `--cd`、session cwd 和 state-db remembered choice 收敛为 fallback cwd，再以它重载最终 config。remote workspace 的 `current` 模式必须显式给 `--cd`；remote workspace 本身则沿用 app-server config cwd，不弹 local cwd prompt。[E: codex-rs/tui/src/lib.rs:786][E: codex-rs/tui/src/lib.rs:795][E: codex-rs/tui/src/lib.rs:806][E: codex-rs/tui/src/lib.rs:807][E: codex-rs/tui/src/lib.rs:815][E: codex-rs/tui/src/lib.rs:819][E: codex-rs/tui/src/lib.rs:1625][E: codex-rs/tui/src/lib.rs:1661]

主循环是一个 `tokio::select!`：app event 进入 `App::handle_event`，active thread channel 进入 `handle_active_thread_event`，terminal event 进入 `handle_tui_event`，app-server event stream 进入 `handle_app_server_event`；退出后统一尝试 `app_server.shutdown()` 并清理 terminal。[E: codex-rs/tui/src/app.rs:1185][E: codex-rs/tui/src/app.rs:1186][E: codex-rs/tui/src/app.rs:1187][E: codex-rs/tui/src/app.rs:1188][E: codex-rs/tui/src/app.rs:1193][E: codex-rs/tui/src/app.rs:1204][E: codex-rs/tui/src/app.rs:1212][E: codex-rs/tui/src/app.rs:1214][E: codex-rs/tui/src/app.rs:1223][E: codex-rs/tui/src/app.rs:1225][E: codex-rs/tui/src/app.rs:1246][E: codex-rs/tui/src/app.rs:1249]

## Terminal 与 alternate screen

`Tui::event_stream` 创建 `TuiEventStream`，共享 `EventBroker` 以避免多个 crossterm readers 争抢 stdin；`pause_events`/`resume_events` 通过 drop/recreate underlying event stream 让外部交互程序临时接管终端输入。[E: codex-rs/tui/src/tui.rs:648][E: codex-rs/tui/src/tui.rs:648][E: codex-rs/tui/src/tui.rs:654][E: codex-rs/tui/src/tui.rs:731][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:95][E: codex-rs/tui/src/tui/event_stream.rs:51]

当前 alternate-screen 控制是代码事实：CLI 计算 `determine_alt_screen_mode(no_alt_screen, config.tui_alternate_screen)` 后调用 `tui.set_alt_screen_enabled`；`--no-alt-screen` 直接禁用，除此之外只有 `AltScreenMode::Never` 禁用。不要沿用旧文档里“auto 在 Zellij 禁用”的说法。[E: codex-rs/tui/src/lib.rs:1725][E: codex-rs/tui/src/lib.rs:1726][E: codex-rs/tui/src/lib.rs:1868][E: codex-rs/tui/src/lib.rs:1868][E: codex-rs/tui/src/lib.rs:1869][E: codex-rs/tui/src/lib.rs:1873]

`enter_alt_screen` 会在 enabled 时发送 `EnterAlternateScreen` 和 `EnableAlternateScroll`，保存 inline viewport 并把 viewport 扩到 terminal size；`leave_alt_screen` 反向禁用 alternate scroll、离开 alternate screen 并恢复 saved viewport。[E: codex-rs/tui/src/tui.rs:751][E: codex-rs/tui/src/tui.rs:752][E: codex-rs/tui/src/tui.rs:755][E: codex-rs/tui/src/tui.rs:757][E: codex-rs/tui/src/tui.rs:758][E: codex-rs/tui/src/tui.rs:759][E: codex-rs/tui/src/tui.rs:760][E: codex-rs/tui/src/tui.rs:768][E: codex-rs/tui/src/tui.rs:773][E: codex-rs/tui/src/tui.rs:778][E: codex-rs/tui/src/tui.rs:779][E: codex-rs/tui/src/tui.rs:780][E: codex-rs/tui/src/tui.rs:783]

## Gotchas

- `App::run` 不再自己“创建 session 后端”；它接收 `AppServerSession` 并在 startup path 上 bootstrap/resume/fork/start thread。[E: codex-rs/tui/src/app.rs:766][E: codex-rs/tui/src/app.rs:768][E: codex-rs/tui/src/app.rs:803][I]
- `app.rs` 仍是 orchestration hub，但 app event dispatch、server events、thread routing、input handling 等都已拆分到 `app/*` 子模块；行号不要从旧单文件 mental model 迁移。[E: codex-rs/tui/src/app/event_dispatch.rs:18][E: codex-rs/tui/src/app/event_dispatch.rs:24][E: codex-rs/tui/src/app/app_server_events.rs:32]
- syntax theme 要在 resume/fork 可能触发的最后一次 config reload 之后设置；提前设置会拿到错误 cwd 下的 theme config。[E: codex-rs/tui/src/lib.rs:1686][E: codex-rs/tui/src/lib.rs:1689]

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
