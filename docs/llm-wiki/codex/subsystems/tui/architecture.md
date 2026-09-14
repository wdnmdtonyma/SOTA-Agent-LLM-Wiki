---
id: subsys.tui.architecture
title: TUI 架构
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app/startup.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/history_pagination.rs, codex-rs/tui/src/app/resize_reflow.rs, codex-rs/tui/src/app/agents_overview_new.rs, codex-rs/tui/src/startup_orchestration.rs, codex-rs/tui/src/startup_preflight.rs, codex-rs/tui/src/startup_draft.rs, codex-rs/tui/src/bottom_pane/startup.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/tui/screen_size.rs, codex-rs/tui/src/lib.rs, codex-rs/tui/src/onboarding/directory_trust.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/input_restore.rs, codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/permission_discovery.rs, codex-rs/tui/src/app_event.rs]
symbols: [tui::App, App::run, resolve_startup_resume_or_fork_cwd, tui::Tui, StartupDraft, StartupDraftPump, tui.architecture::should_delay_startup_composer_for_first_login]
related: [subsys.tui.event-system, subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.tui.keymap, subsys.tui.rendering-theming, subsys.tui.onboarding, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> 当前 TUI 是 `App` 会话编排层、`ChatWidget` 主聊天状态机、`BottomPane` 输入/弹层容器、`Tui` 终端包装层和 app-server event stream 的组合。进程入口 `run_main` 把慢启动工作交给 `startup_orchestration`，并在 `StartupDraft` 里先画出可编辑、不可提交的 composer；真正的 `App::run` 已从 `app.rs` 迁到 `app/startup.rs`。[E: codex-rs/tui/src/lib.rs:1010][E: codex-rs/tui/src/app/startup.rs:136][E: codex-rs/tui/src/startup_draft.rs:82][E: codex-rs/tui/src/chatwidget.rs:568][E: codex-rs/tui/src/bottom_pane/mod.rs:247][E: codex-rs/tui/src/tui.rs:589]

## 能回答的问题

- `run_main` / `App::run` 如何把 CLI、startup draft、`AppServerSession` 和 main loop 接起来？
- 首次登录为什么会延迟 composer，resume/fork 又为什么在 header 下显示 loading？
- 创建或 resume TUI task 时 folder consent 插在 startup 的哪一步？
- terminal events、app events、active thread events、app-server events 在哪里合流？
- `Tui` 和 `App` 的职责边界是什么？
- alternate screen 当前由什么配置真正控制？
- TUI 怎样选择 remote named permission profiles？

## 职责边界

`App` 是 session-level container：它保存 `ModelCatalog`、`SessionTelemetry`、`AppEventSender`、`ChatWidget`、config、file search、transcript cells、pager overlay、resolved keymap 与 chord matcher、commit animation state、thread event channels、side threads、`agents_overview` command center、active/primary thread id、pending app-server requests，以及 startup 边界标志。权限侧还持有 `runtime_permission_profile_override` 和 `pending_server_profiles`（remote named 选择在确认前挂在 thread 上）。[E: codex-rs/tui/src/app.rs:545][E: codex-rs/tui/src/app.rs:547][E: codex-rs/tui/src/app.rs:549][E: codex-rs/tui/src/app.rs:564][E: codex-rs/tui/src/app.rs:566][E: codex-rs/tui/src/app.rs:585][E: codex-rs/tui/src/app.rs:633]

`Tui` 是 terminal wrapper：它持有 `FrameRequester`、draw channel、shared `EventBroker`、terminal backend、pending history、screen-size policy、ambient/picker pet image state、alt-screen/focus state、notification backend、`ScrollbackStrategy` 和 `alt_screen_enabled` flag。[E: codex-rs/tui/src/tui.rs:589][E: codex-rs/tui/src/tui.rs:592][E: codex-rs/tui/src/tui.rs:595][E: codex-rs/tui/src/tui.rs:608][E: codex-rs/tui/src/tui.rs:610]

`TuiEvent` 当前有七类：terminal key、paste payload、resize、scheduled draw、suspend 返回后的 resume redraw，以及 `FocusGained` / `FocusLost`；raw crossterm event fan-out 被 `TuiEventStream`/`EventBroker` 封装。[E: codex-rs/tui/src/tui.rs:566][E: codex-rs/tui/src/tui.rs:568][E: codex-rs/tui/src/tui.rs:575][E: codex-rs/tui/src/tui.rs:584][E: codex-rs/tui/src/tui.rs:586][E: codex-rs/tui/src/tui/event_stream.rs:53]

## Startup 编排

`run_main` 只转发到 `startup_orchestration::run_main_inner`；用户在 draft composer 上 `Ctrl-C`/`Ctrl-D` 取消时，错误被识别为 `StartupCancelled` 并转成 `ExitReason::UserRequested`。[E: codex-rs/tui/src/lib.rs:1016][E: codex-rs/tui/src/lib.rs:1026][E: codex-rs/tui/src/startup_draft.rs:417]

`run_main_inner` 在拿到终端前先做轻量校验。随后按 CLI 选择初始 surface：resume/fork/`agents_overview` picker 走 `SessionPicker`；没有 OSS/remote endpoint、本地 daemon 可复用或 search-only override、无 packaged defaults、且 `should_delay_startup_composer_for_first_login` 为真时走 `Onboarding`；其余走 `Composer`。[E: codex-rs/tui/src/startup_orchestration.rs:10][E: codex-rs/tui/src/startup_orchestration.rs:170][E: codex-rs/tui/src/startup_orchestration.rs:184][E: codex-rs/tui/src/startup_orchestration.rs:184]

`should_delay_startup_composer_for_first_login` 只在“默认文件账户尚未能认证”时隐藏 composer：环境里已有 access token / federation / identity token、系统 config 存在、`codex_home` 下已有 `auth.json`/`config.toml`/`environments.toml`、daemon socket 存在、或 managed configuration 存在，都会立即显示 composer。[E: codex-rs/tui/src/startup_preflight.rs:22][E: codex-rs/tui/src/startup_preflight.rs:28][E: codex-rs/tui/src/startup_preflight.rs:48][E: codex-rs/tui/src/startup_preflight.rs:69]

`StartupDraft` 拥有真实 `BottomPane`/`ChatComposer`，但 `handle_startup_draft_key` 拒绝 submit/queue/history-search、Tab、以及非 safe editor 的 Ctrl/Alt/Super 键；字符编辑、光标移动、删除、yank 仍可走共享 editor keymap。[E: codex-rs/tui/src/startup_draft.rs:82][E: codex-rs/tui/src/startup_draft.rs:397][E: codex-rs/tui/src/startup_draft.rs:402][E: codex-rs/tui/src/bottom_pane/startup.rs:21]

draft frame 先渲染 session header，再渲染 composer。header 在 config 到达前用 dim/italic `loading` 占位；resume/fork 还会在 header 与 composer 之间插入 `Resuming session…` / `Forking session…`。[E: codex-rs/tui/src/startup_draft.rs:453][E: codex-rs/tui/src/startup_draft.rs:456][E: codex-rs/tui/src/startup_draft.rs:481][E: codex-rs/tui/src/startup_draft.rs:482]

picker 选完后 `update_session_selection` 会把 loading 文案从 New 切到 Resume/Fork，并在 composer surface 上立即重绘。[E: codex-rs/tui/src/startup_draft.rs:181][E: codex-rs/tui/src/startup_draft.rs:190][E: codex-rs/tui/src/startup_draft.rs:197]

startup resume/fork 在真正 attach 前调用 `resolve_startup_resume_or_fork_cwd`：remote workspace 的 `current` 模式必须显式给 `--cd`；remote workspace 本身沿用 app-server config cwd，不弹 local cwd prompt。[E: codex-rs/tui/src/lib.rs:847][E: codex-rs/tui/src/lib.rs:869][E: codex-rs/tui/src/lib.rs:873][E: codex-rs/tui/src/lib.rs:877][E: codex-rs/tui/src/lib.rs:878]

destination 解析之后、创建或 resume task 之前，`run_main` 调用 `check_directory_trust`；这是 TUI folder-consent 门，不是单独 crate。[E: codex-rs/tui/src/lib.rs:1560][E: codex-rs/tui/src/lib.rs:1719][E: codex-rs/tui/src/onboarding/directory_trust.rs:33]

syntax theme 必须在 onboarding/resume/fork 可能触发的最后一次 config reload 之后设置；`run_ratatui_app` 在把 draft 交给 `App::run` 前调用 `set_theme_override`。[E: codex-rs/tui/src/lib.rs:1803]

## App::run 与 main loop

`App::run` 的第二个参数仍是 `mut app_server: AppServerSession`，但它现在还接收 `startup_draft: StartupDraftPump`。[E: codex-rs/tui/src/app/startup.rs:136][E: codex-rs/tui/src/app/startup.rs:138][E: codex-rs/tui/src/app/startup.rs:157]

fresh/resume/fork 三种入口都构造 `ChatWidgetInit` 并调用 `ChatWidget::new_with_app_event`。[E: codex-rs/tui/src/app/startup.rs:440][E: codex-rs/tui/src/app/startup.rs:559][E: codex-rs/tui/src/app/startup.rs:664]

draft 在首帧前 flush pending events / paste newline，再交给 `ChatWidget::restore_startup_draft_when_ready`。protected request、modal、Windows elevated sandbox setup 未完成时不会交出草稿。[E: codex-rs/tui/src/app/startup.rs:895][E: codex-rs/tui/src/app/startup.rs:919][E: codex-rs/tui/src/chatwidget/input_restore.rs:105][E: codex-rs/tui/src/chatwidget/input_restore.rs:122]

command center（agents overview）可在不打断其它 agent 的情况下开新 session 或 managed worktree：`AppEvent::NewAgentsOverviewSession` / `NewAgentsOverviewWorktree` 分别调用 `new_agents_overview_session` 与 `new_agents_overview_worktree`；后者要求 `Feature::Worktrees`。[E: codex-rs/tui/src/app/event_dispatch.rs:2451][E: codex-rs/tui/src/app/agents_overview_new.rs:36][E: codex-rs/tui/src/app/agents_overview_new.rs:163][E: codex-rs/tui/src/app/agents_overview_new.rs:175] composer 不再有 Astra sparkle 动画模块（`chat_composer/sparkle.rs` 已删）。[I]

主循环是一个 `select!`：app event 进入 `App::handle_event`，active thread channel 进入 `handle_active_thread_event`，terminal event 进入 `handle_tui_event`，app-server event stream 进入 `handle_app_server_event`。startup 期间若 session header / protected request 仍在排队，会暂时挡住 terminal input。退出后统一尝试 `app_server.shutdown()` 并清理 terminal。[E: codex-rs/tui/src/app/startup.rs:1061][E: codex-rs/tui/src/app/startup.rs:1069][E: codex-rs/tui/src/app/startup.rs:1098][E: codex-rs/tui/src/app/startup.rs:1129][E: codex-rs/tui/src/app/startup.rs:1142]

## Named permission profiles

`permission_discovery::fetch` 按 `ThreadParamsMode` 决定 catalog：remote workspace 走 `permissionProfile/list`（可分页）而不是只读本地 builtin presets；`PermissionProfileSelection` 由 TUI 在 guardrail 完成后应用，discovery 本身不 apply。[E: codex-rs/tui/src/permission_discovery.rs:84][E: codex-rs/tui/src/permission_discovery.rs:116][E: codex-rs/tui/src/permission_discovery.rs:152][E: codex-rs/tui/src/app_event.rs:1547][E: codex-rs/tui/src/app.rs:564]

## Terminal 与 alternate screen

`Tui::event_stream` 创建 `TuiEventStream`，共享 `EventBroker` 以避免多个 crossterm readers 争抢 stdin；`pause_events`/`resume_events` 通过 drop/recreate underlying event stream 让外部交互程序临时接管终端输入。[E: codex-rs/tui/src/tui.rs:824][E: codex-rs/tui/src/tui.rs:707][E: codex-rs/tui/src/tui.rs:713]

当前 alternate-screen 控制是代码事实：CLI 计算 `determine_alt_screen_mode(no_alt_screen, local_settings.tui.alternate_screen)`；`--no-alt-screen` 直接禁用，除此之外只有 `AltScreenMode::Never` 禁用。不要沿用旧文档里“auto 在 Zellij 禁用”的说法。[E: codex-rs/tui/src/lib.rs:1987][E: codex-rs/tui/src/lib.rs:1988][E: codex-rs/tui/src/lib.rs:1992]

`enter_alt_screen` 会在 enabled 时发送 `EnterAlternateScreen` 和 `EnableAlternateScroll`，保存 inline viewport 并把 viewport 扩到 terminal size；`leave_alt_screen` 反向禁用 alternate scroll、离开 alternate screen 并恢复 saved viewport。[E: codex-rs/tui/src/tui.rs:844][E: codex-rs/tui/src/tui.rs:848][E: codex-rs/tui/src/tui.rs:851][E: codex-rs/tui/src/tui.rs:853][E: codex-rs/tui/src/tui.rs:868][E: codex-rs/tui/src/tui.rs:873][E: codex-rs/tui/src/tui.rs:874]

## Screen geometry 与 focus

`ScreenSizePolicy` 避免每次 redraw 都查询 terminal backend：`Draw`/`FocusGained` 用 deferred or cached size，`Key`/`Paste`/`FocusLost` 只用 cached size，`Resize` 直接用 event payload，显式 `Resume` 立即重查 backend；若 scheduled `Draw`/`FocusGained` 到达已过期的 recheck deadline，也会经 Resume sampling path 查询 backend。[E: codex-rs/tui/src/tui/screen_size.rs:14][E: codex-rs/tui/src/tui/screen_size.rs:22][E: codex-rs/tui/src/tui/screen_size.rs:25][E: codex-rs/tui/src/tui/screen_size.rs:38][E: codex-rs/tui/src/tui/screen_size.rs:47][E: codex-rs/tui/src/tui/screen_size.rs:50]

`FocusGained` 现在只更新 focus flag 并请求 draw，继续使用 startup-cached palette；它不在 input loop 内重查前景/背景色，避免阻塞并丢失 focus 返回期间已排队的 key。[E: codex-rs/tui/src/tui/event_stream.rs:294][E: codex-rs/tui/src/tui/event_stream.rs:295][E: codex-rs/tui/src/tui/event_stream.rs:298]

## Gotchas

- `App::run` 不再自己“创建 session 后端”，也不再位于 `app.rs`；它接收 `AppServerSession` 与 `StartupDraftPump`，并在 startup path 上 bootstrap/resume/fork/start thread。[E: codex-rs/tui/src/app/startup.rs:136][E: codex-rs/tui/src/app/startup.rs:138][E: codex-rs/tui/src/app/startup.rs:157]
- `app.rs` 仍是 type/state hub，但 `App::run`、event dispatch、server events、thread routing、history pagination、transcript export 都已拆到 `app/*`。[E: codex-rs/tui/src/app/startup.rs:136][E: codex-rs/tui/src/app/event_dispatch.rs:27][E: codex-rs/tui/src/app/app_server_events.rs:60][E: codex-rs/tui/src/app/history_pagination.rs:21]
- startup composer 可编辑但不提交；把“输入框已经出现”当成 session 已 attach 是错的。[E: codex-rs/tui/src/startup_draft.rs:82][E: codex-rs/tui/src/startup_draft.rs:402]
- folder consent 发生在 picker/cwd 解析之后；destination 变了就要再问，不是 first-login 一次性门。[E: codex-rs/tui/src/lib.rs:1719][E: codex-rs/tui/src/onboarding/directory_trust.rs:33]
- syntax theme 要在 resume/fork/onboarding 可能触发的最后一次 config reload 之后设置；提前设置会拿到错误 cwd 下的 theme config。[E: codex-rs/tui/src/lib.rs:1803]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app/startup.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/app/history_pagination.rs`
- `codex-rs/tui/src/app/resize_reflow.rs`
- `codex-rs/tui/src/app/agents_overview_new.rs`
- `codex-rs/tui/src/startup_orchestration.rs`
- `codex-rs/tui/src/startup_preflight.rs`
- `codex-rs/tui/src/startup_draft.rs`
- `codex-rs/tui/src/bottom_pane/startup.rs`
- `codex-rs/tui/src/tui.rs`
- `codex-rs/tui/src/tui/event_stream.rs`
- `codex-rs/tui/src/tui/screen_size.rs`
- `codex-rs/tui/src/lib.rs`
- `codex-rs/tui/src/onboarding/directory_trust.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/input_restore.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/permission_discovery.rs`
- `codex-rs/tui/src/app_event.rs`

## 相关

- `subsys.tui.event-system`: `AppEvent` 与 app-server events 的路由。
- `subsys.tui.chatwidget`: 主聊天 widget 的输入、协议通知和 rendering state。
- `subsys.tui.bottom-pane`: bottom pane/composer/modal stack。
- `subsys.tui.keymap`: raw config 到 chord-aware runtime dispatch。
- `subsys.tui.rendering-theming`: width、hyperlink 与 terminal diff 细节。
- `subsys.tui.onboarding`: first-login screen loop，以及 create/resume 前的 folder consent。
