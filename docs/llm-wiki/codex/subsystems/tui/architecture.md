---
id: subsys.tui.architecture
title: TUI 架构
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app/startup.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/history_pagination.rs, codex-rs/tui/src/app/resize_reflow.rs, codex-rs/tui/src/startup_orchestration.rs, codex-rs/tui/src/startup_preflight.rs, codex-rs/tui/src/startup_draft.rs, codex-rs/tui/src/bottom_pane/startup.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/tui/screen_size.rs, codex-rs/tui/src/lib.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/bottom_pane/mod.rs]
symbols: [tui::App, App::run, resolve_startup_resume_or_fork_cwd, tui::Tui, StartupDraft, StartupDraftPump, tui.architecture::should_delay_startup_composer_for_first_login]
related: [subsys.tui.event-system, subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.tui.keymap, subsys.tui.rendering-theming, subsys.tui.onboarding, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> 当前 TUI 是 `App` 会话编排层、`ChatWidget` 主聊天状态机、`BottomPane` 输入/弹层容器、`Tui` 终端包装层和 app-server event stream 的组合。进程入口 `run_main` 把慢启动工作交给 `startup_orchestration`，并在 `StartupDraft` 里先画出可编辑、不可提交的 composer；真正的 `App::run` 已从 `app.rs` 迁到 `app/startup.rs`。[E: codex-rs/tui/src/lib.rs:926][E: codex-rs/tui/src/app/startup.rs:55][E: codex-rs/tui/src/startup_draft.rs:82][E: codex-rs/tui/src/chatwidget.rs:546][E: codex-rs/tui/src/bottom_pane/mod.rs:222][E: codex-rs/tui/src/tui.rs:578]

## 能回答的问题

- `run_main` / `App::run` 如何把 CLI、startup draft、`AppServerSession` 和 main loop 接起来？
- 首次登录为什么会延迟 composer，resume/fork 又为什么在 header 下显示 loading？
- terminal events、app events、active thread events、app-server events 在哪里合流？
- `Tui` 和 `App` 的职责边界是什么？
- alternate screen 当前由什么配置真正控制？

## 职责边界

`App` 是 session-level container：它保存 `SessionTelemetry`、`AppEventSender`、`ChatWidget`、config、file search、transcript cells、pager overlay、resolved keymap 与 chord matcher、commit animation state、thread event channels、side threads、active/primary thread id、pending app-server requests，以及 startup 边界标志。[E: codex-rs/tui/src/app.rs:517][E: codex-rs/tui/src/app.rs:519][E: codex-rs/tui/src/app.rs:520][E: codex-rs/tui/src/app.rs:523][E: codex-rs/tui/src/app.rs:533][E: codex-rs/tui/src/app.rs:535][E: codex-rs/tui/src/app.rs:541][E: codex-rs/tui/src/app.rs:549][E: codex-rs/tui/src/app.rs:550][E: codex-rs/tui/src/app.rs:553][E: codex-rs/tui/src/app.rs:587][E: codex-rs/tui/src/app.rs:590][E: codex-rs/tui/src/app.rs:592][E: codex-rs/tui/src/app.rs:594][E: codex-rs/tui/src/app.rs:598][E: codex-rs/tui/src/app.rs:599]

`Tui` 是 terminal wrapper：它持有 `FrameRequester`、draw channel、shared `EventBroker`、terminal backend、pending history、screen-size policy、pet image state、alt-screen/focus state、notification backend、Zellij detection 和 `alt_screen_enabled` flag。[E: codex-rs/tui/src/tui.rs:578][E: codex-rs/tui/src/tui.rs:579][E: codex-rs/tui/src/tui.rs:580][E: codex-rs/tui/src/tui.rs:581][E: codex-rs/tui/src/tui.rs:582][E: codex-rs/tui/src/tui.rs:583][E: codex-rs/tui/src/tui.rs:584][E: codex-rs/tui/src/tui.rs:591][E: codex-rs/tui/src/tui.rs:593][E: codex-rs/tui/src/tui.rs:595][E: codex-rs/tui/src/tui.rs:598][E: codex-rs/tui/src/tui.rs:600]

`TuiEvent` 当前有五类：terminal key、paste payload、resize、scheduled draw 和 suspend 返回后的 resume redraw；raw crossterm event fan-out 被 `TuiEventStream`/`EventBroker` 封装。[E: codex-rs/tui/src/tui.rs:559][E: codex-rs/tui/src/tui.rs:561][E: codex-rs/tui/src/tui.rs:563][E: codex-rs/tui/src/tui.rs:568][E: codex-rs/tui/src/tui.rs:570][E: codex-rs/tui/src/tui.rs:575][E: codex-rs/tui/src/tui/event_stream.rs:51]

## Startup 编排

`run_main` 只转发到 `startup_orchestration::run_main_inner`；用户在 draft composer 上 `Ctrl-C`/`Ctrl-D` 取消时，错误被识别为 `StartupCancelled` 并转成 `ExitReason::UserRequested`。[E: codex-rs/tui/src/lib.rs:932][E: codex-rs/tui/src/lib.rs:940][E: codex-rs/tui/src/lib.rs:945][E: codex-rs/tui/src/startup_draft.rs:71]

`run_main_inner` 在拿到终端前先做轻量校验。随后按 CLI 选择初始 surface：resume/fork picker 走 `SessionPicker`；本地 daemon 可复用、且 `should_delay_startup_composer_for_first_login` 为真时走 `Onboarding`；其余走 `Composer`。[E: codex-rs/tui/src/startup_orchestration.rs:6][E: codex-rs/tui/src/startup_orchestration.rs:151][E: codex-rs/tui/src/startup_orchestration.rs:154][E: codex-rs/tui/src/startup_orchestration.rs:157][E: codex-rs/tui/src/startup_orchestration.rs:166]

`should_delay_startup_composer_for_first_login` 只在“默认文件账户尚未能认证”时隐藏 composer：环境里已有 access token / federation / identity token、系统 config 存在、`codex_home` 下已有 `auth.json`/`config.toml`/`environments.toml`、daemon socket 存在、或 managed configuration 存在，都会立即显示 composer。[E: codex-rs/tui/src/startup_preflight.rs:22][E: codex-rs/tui/src/startup_preflight.rs:28][E: codex-rs/tui/src/startup_preflight.rs:48][E: codex-rs/tui/src/startup_preflight.rs:69]

`StartupDraft` 拥有真实 `BottomPane`/`ChatComposer`，但 `handle_startup_draft_key` 拒绝 submit/queue/history-search、Tab、以及非 safe editor 的 Ctrl/Alt/Super 键；字符编辑、光标移动、删除、yank 仍可走共享 editor keymap。[E: codex-rs/tui/src/startup_draft.rs:82][E: codex-rs/tui/src/startup_draft.rs:389][E: codex-rs/tui/src/startup_draft.rs:394][E: codex-rs/tui/src/startup_draft.rs:418][E: codex-rs/tui/src/bottom_pane/startup.rs:18][E: codex-rs/tui/src/bottom_pane/startup.rs:32]

draft frame 先渲染 session header，再渲染 composer。header 在 config 到达前用 dim/italic `loading` 占位；resume/fork 还会在 header 与 composer 之间插入 `Resuming session…` / `Forking session…`。[E: codex-rs/tui/src/startup_draft.rs:445][E: codex-rs/tui/src/startup_draft.rs:452][E: codex-rs/tui/src/startup_draft.rs:469][E: codex-rs/tui/src/startup_draft.rs:471][E: codex-rs/tui/src/startup_draft.rs:473][E: codex-rs/tui/src/startup_draft.rs:474]

picker 选完后 `update_session_selection` 会把 loading 文案从 New 切到 Resume/Fork，并在 composer surface 上立即重绘。[E: codex-rs/tui/src/startup_draft.rs:180][E: codex-rs/tui/src/startup_draft.rs:186][E: codex-rs/tui/src/startup_draft.rs:188][E: codex-rs/tui/src/startup_draft.rs:194]

startup resume/fork 在真正 attach 前调用 `resolve_startup_resume_or_fork_cwd`：remote workspace 的 `current` 模式必须显式给 `--cd`；remote workspace 本身沿用 app-server config cwd，不弹 local cwd prompt。[E: codex-rs/tui/src/lib.rs:774][E: codex-rs/tui/src/lib.rs:794][E: codex-rs/tui/src/lib.rs:799][E: codex-rs/tui/src/lib.rs:803][E: codex-rs/tui/src/lib.rs:804]

syntax theme 必须在 onboarding/resume/fork 可能触发的最后一次 config reload 之后设置；`run_ratatui_app` 在把 draft 交给 `App::run` 前调用 `set_theme_override`。[E: codex-rs/tui/src/lib.rs:1517][E: codex-rs/tui/src/lib.rs:1522][E: codex-rs/tui/src/lib.rs:1522]

## App::run 与 main loop

`App::run` 的第二个参数仍是 `mut app_server: AppServerSession`，但它现在还接收 `startup_draft: StartupDraftPump`。函数内部建立 `AppEventSender`、应用 notification settings，优先使用传入的 startup bootstrap，否则 `startup_draft.run_until(tui, app_server.bootstrap(&config))`。[E: codex-rs/tui/src/app/startup.rs:55][E: codex-rs/tui/src/app/startup.rs:57][E: codex-rs/tui/src/app/startup.rs:76][E: codex-rs/tui/src/app/startup.rs:101][E: codex-rs/tui/src/app/startup.rs:105][E: codex-rs/tui/src/app/startup.rs:112][E: codex-rs/tui/src/app/startup.rs:115]

fresh/resume/fork 三种入口都构造 `ChatWidgetInit` 并调用 `ChatWidget::new_with_app_event`。fresh path 先异步 `spawn_startup_thread_start`；resume/fork path 在 draft pump 下调用 app-server `resume_thread`/`fork_thread`，再把 started thread 作为 `initial_started_thread` 交给 app。[E: codex-rs/tui/src/app/startup.rs:225][E: codex-rs/tui/src/app/startup.rs:227][E: codex-rs/tui/src/app/startup.rs:270][E: codex-rs/tui/src/app/startup.rs:285][E: codex-rs/tui/src/app/startup.rs:324][E: codex-rs/tui/src/app/startup.rs:335][E: codex-rs/tui/src/app/startup.rs:371]

draft 在首帧前 flush pending events / paste newline，再 `into_draft()` 交给 `ChatWidget::restore_startup_draft_when_ready`。protected request、modal、Windows elevated sandbox setup 未完成时不会交出草稿。[E: codex-rs/tui/src/app/startup.rs:518][E: codex-rs/tui/src/app/startup.rs:533][E: codex-rs/tui/src/app/startup.rs:537][E: codex-rs/tui/src/app/startup.rs:540][E: codex-rs/tui/src/chatwidget/input_restore.rs:97][E: codex-rs/tui/src/chatwidget/input_restore.rs:101]

主循环是一个 `tokio::select!`：app event 进入 `App::handle_event`，active thread channel 进入 `handle_active_thread_event`，terminal event 进入 `handle_tui_event`，app-server event stream 进入 `handle_app_server_event`。startup 期间若 session header / protected request 仍在排队，会暂时挡住 terminal input。退出后统一尝试 `app_server.shutdown()` 并清理 terminal。[E: codex-rs/tui/src/app/startup.rs:610][E: codex-rs/tui/src/app/startup.rs:618][E: codex-rs/tui/src/app/startup.rs:646][E: codex-rs/tui/src/app/startup.rs:654][E: codex-rs/tui/src/app/startup.rs:675][E: codex-rs/tui/src/app/startup.rs:684][E: codex-rs/tui/src/app/startup.rs:722]

## Terminal 与 alternate screen

`Tui::event_stream` 创建 `TuiEventStream`，共享 `EventBroker` 以避免多个 crossterm readers 争抢 stdin；`pause_events`/`resume_events` 通过 drop/recreate underlying event stream 让外部交互程序临时接管终端输入。[E: codex-rs/tui/src/tui.rs:686][E: codex-rs/tui/src/tui.rs:692][E: codex-rs/tui/src/tui.rs:792][E: codex-rs/tui/src/tui/event_stream.rs:51]

当前 alternate-screen 控制是代码事实：CLI 计算 `determine_alt_screen_mode(no_alt_screen, config.tui_alternate_screen)`；`--no-alt-screen` 直接禁用，除此之外只有 `AltScreenMode::Never` 禁用。不要沿用旧文档里“auto 在 Zellij 禁用”的说法。[E: codex-rs/tui/src/lib.rs:1747][E: codex-rs/tui/src/lib.rs:1748][E: codex-rs/tui/src/lib.rs:1752]

`enter_alt_screen` 会在 enabled 时发送 `EnterAlternateScreen` 和 `EnableAlternateScroll`，保存 inline viewport 并把 viewport 扩到 terminal size；`leave_alt_screen` 反向禁用 alternate scroll、离开 alternate screen 并恢复 saved viewport。[E: codex-rs/tui/src/tui.rs:812][E: codex-rs/tui/src/tui.rs:813][E: codex-rs/tui/src/tui.rs:816][E: codex-rs/tui/src/tui.rs:818][E: codex-rs/tui/src/tui.rs:820][E: codex-rs/tui/src/tui.rs:835][E: codex-rs/tui/src/tui.rs:840][E: codex-rs/tui/src/tui.rs:841][E: codex-rs/tui/src/tui.rs:843]

## Screen geometry 与 focus

`ScreenSizePolicy` 避免每次 redraw 都查询 terminal backend：普通 `Draw`/`Key`/`Paste` 优先用 cached or deferred size，`Resize` 直接用 event payload，显式 `Resume` 立即重查 backend；若 scheduled `Draw` 到达已过期的 recheck deadline，也会经 Resume sampling path 查询 backend。[E: codex-rs/tui/src/tui/screen_size.rs:20][E: codex-rs/tui/src/tui/screen_size.rs:22][E: codex-rs/tui/src/tui/screen_size.rs:23][E: codex-rs/tui/src/tui/screen_size.rs:32][E: codex-rs/tui/src/tui/screen_size.rs:38][E: codex-rs/tui/src/tui/screen_size.rs:42][E: codex-rs/tui/src/tui/screen_size.rs:47][E: codex-rs/tui/src/tui/screen_size.rs:48]

`FocusGained` 现在只更新 focus flag 并请求 draw，继续使用 startup-cached palette；它不在 input loop 内重查前景/背景色，避免阻塞并丢失 focus 返回期间已排队的 key。[E: codex-rs/tui/src/tui/event_stream.rs:274][E: codex-rs/tui/src/tui/event_stream.rs:275][E: codex-rs/tui/src/tui/event_stream.rs:278]

## Gotchas

- `App::run` 不再自己“创建 session 后端”，也不再位于 `app.rs`；它接收 `AppServerSession` 与 `StartupDraftPump`，并在 startup path 上 bootstrap/resume/fork/start thread。[E: codex-rs/tui/src/app/startup.rs:55][E: codex-rs/tui/src/app/startup.rs:57][E: codex-rs/tui/src/app/startup.rs:76][E: codex-rs/tui/src/app/startup.rs:115]
- `app.rs` 仍是 type/state hub，但 `App::run`、event dispatch、server events、thread routing、history pagination、transcript export 都已拆到 `app/*`。[E: codex-rs/tui/src/app/startup.rs:55][E: codex-rs/tui/src/app/event_dispatch.rs:19][E: codex-rs/tui/src/app/app_server_events.rs:47][E: codex-rs/tui/src/app/history_pagination.rs:18]
- startup composer 可编辑但不提交；把“输入框已经出现”当成 session 已 attach 是错的。[E: codex-rs/tui/src/startup_draft.rs:82][E: codex-rs/tui/src/startup_draft.rs:394]
- syntax theme 要在 resume/fork/onboarding 可能触发的最后一次 config reload 之后设置；提前设置会拿到错误 cwd 下的 theme config。[E: codex-rs/tui/src/lib.rs:1522][E: codex-rs/tui/src/lib.rs:1522]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app/startup.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/app/history_pagination.rs`
- `codex-rs/tui/src/app/resize_reflow.rs`
- `codex-rs/tui/src/startup_orchestration.rs`
- `codex-rs/tui/src/startup_preflight.rs`
- `codex-rs/tui/src/startup_draft.rs`
- `codex-rs/tui/src/bottom_pane/startup.rs`
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
- `subsys.tui.onboarding`: first-login 时占用 terminal 的独立 screen loop。
