---
id: subsys.tui.architecture
title: TUI 架构
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/app.rs
  - docs/tui-alternate-screen.md
symbols:
  - App
  - App::run
  - App::handle_tui_event
  - TuiEvent
  - Overlay
related:
  - subsys.tui.event-system
  - subsys.tui.chatwidget
  - subsys.tui.bottom-pane
  - subsys.app-server.session-management
evidence: explicit
status: verified
updated: 37aadeaa13
---

TUI 架构是 `App` 作为异步 orchestrator、`ChatWidget` 作为主交互组件、`AppServerSession` 作为会话后端、`TuiEvent` 作为终端输入/绘制节拍的组合系统；`App` 本体保存 app event channel、chat widget、file search、overlay、thread event channels、active thread id 和 pending app-server requests 等跨层状态 [E: codex-rs/tui/src/app.rs:493][E: codex-rs/tui/src/app.rs:494][E: codex-rs/tui/src/app.rs:503][E: codex-rs/tui/src/app.rs:508][E: codex-rs/tui/src/app.rs:548][E: codex-rs/tui/src/app.rs:552][E: codex-rs/tui/src/app.rs:558]；`App::run` 接收 `mut app_server: AppServerSession`，而不是在函数内部创建该 session [E: codex-rs/tui/src/app.rs:638]。

## 能回答的问题

- TUI 启动时如何选择 fresh、resume、fork 三种 thread 路径，并把 `ChatWidget` 绑定到对应 app-server thread。
- 终端事件、内部 UI event、active thread event、app-server event 如何在一个 `tokio::select!` loop 中合流。
- 为什么 alternate screen 默认是 `auto`，以及 Zellij 中为什么默认不进入 alternate screen。
- `App` 和 `ChatWidget` 的分工：`App` 管事件源、线程切换、overlay、shutdown；`ChatWidget` 管输入、消息渲染、streaming 和 bottom pane。

## 职责边界

- `App::run` 负责把外部传入的 app-server session 纳入 startup path、file search 和 event loop；源码中 `App::run` 的第二个参数是 `mut app_server: AppServerSession`，bootstrap 后 fresh thread 调用 `app_server.start_thread(&config)`，resume 调用 `app_server.resume_thread(...)`，fork 调用 `app_server.fork_thread(...)`，file search 初始化使用 app-server client，main loop 也把 `app_server.next_event()` 作为事件源 [E: codex-rs/tui/src/app.rs:638][E: codex-rs/tui/src/app.rs:698][E: codex-rs/tui/src/app.rs:764][E: codex-rs/tui/src/app.rs:795][E: codex-rs/tui/src/app.rs:834][E: codex-rs/tui/src/app.rs:875][E: codex-rs/tui/src/app.rs:1029]。
- `ChatWidget` 在三种入口里都通过 `ChatWidget::new_with_app_event(init)` 构造，因此主 UI 的消息/输入状态被绑定到同一类初始化结构，而不是由 fresh/resume/fork 各写一套 widget 初始化 [E: codex-rs/tui/src/app.rs:792][E: codex-rs/tui/src/app.rs:826][E: codex-rs/tui/src/app.rs:865]。
- `App` 不直接解析 crossterm 原始事件；它消费 `TuiEvent`，并在 `handle_tui_event` 中把 `Key` 转给 `handle_key_event`、把 `Paste` 归一化 CR-to-LF 后交给 `ChatWidget::handle_paste`、把 `Draw` 交给 pre-draw 与 render path [E: codex-rs/tui/src/app.rs:1086][E: codex-rs/tui/src/app.rs:1100][E: codex-rs/tui/src/app.rs:1102][E: codex-rs/tui/src/app.rs:1107][E: codex-rs/tui/src/app.rs:1108][E: codex-rs/tui/src/app.rs:1110][E: codex-rs/tui/src/app.rs:1123][E: codex-rs/tui/src/app.rs:1124]。
- `App` 层定义 baseline commit animation cadence；markdown 分段算法和 controller-level streaming 细节属于 `ChatWidget`/streaming 模块的职责边界 [E: codex-rs/tui/src/app.rs:320][E: codex-rs/tui/src/app.rs:324][I]。
- alternate screen 策略属于 TUI shell，而不是 `App` 的 business state [I]；设计文档规定 `tui.alternate_screen = "auto"` 是默认模式，在 Zellij 里禁用 alternate screen、其他环境启用 alternate screen [E: docs/tui-alternate-screen.md:33][E: docs/tui-alternate-screen.md:35][E: docs/tui-alternate-screen.md:38][E: docs/tui-alternate-screen.md:39]。

## 关键 crate/文件

- `codex-rs/tui/src/app.rs`: `App` 的字段、startup path、main event loop、TUI event handling 和 shutdown。
- `codex-rs/tui/src/chatwidget.rs`: 主交互 widget，承接消息、输入、streaming、bottom pane 和 app-server notifications。
- `codex-rs/tui/src/tui.rs`: terminal raw mode、alternate screen、draw scheduling 与 `TuiEvent` stream。
- `codex-rs/app-server-client/src`: TUI 依赖的 in-process/remote app-server facade；`App::run` 中的 `app_server.next_event()` 是 main loop 的一个事件源 [E: codex-rs/tui/src/app.rs:1029]。
- `docs/tui-alternate-screen.md`: alternate screen 与 Zellij 冲突的设计背景，说明默认 `auto` 的动机。

## 数据模型

- `App` 是 session-level state container。它保存 `session_telemetry`、`app_event_tx`、`chat_widget`、`config`、`file_search`、`transcript_cells`、`overlay`、commit animation flag、remote app-server URL/auth、thread event channel map、side threads、active/primary thread id 和 `pending_app_server_requests` wrapper [E: codex-rs/tui/src/app.rs:492][E: codex-rs/tui/src/app.rs:493][E: codex-rs/tui/src/app.rs:494][E: codex-rs/tui/src/app.rs:496][E: codex-rs/tui/src/app.rs:503][E: codex-rs/tui/src/app.rs:505][E: codex-rs/tui/src/app.rs:508][E: codex-rs/tui/src/app.rs:515][E: codex-rs/tui/src/app.rs:531][E: codex-rs/tui/src/app.rs:532][E: codex-rs/tui/src/app.rs:548][E: codex-rs/tui/src/app.rs:551][E: codex-rs/tui/src/app.rs:552][E: codex-rs/tui/src/app.rs:554][E: codex-rs/tui/src/app.rs:558]。
- `AppExitInfo` 是 TUI 退出结果，包含 `token_usage`、`thread_id`、`thread_name`、`update_action` 和 `exit_reason` [E: codex-rs/tui/src/app.rs:327][E: codex-rs/tui/src/app.rs:328][E: codex-rs/tui/src/app.rs:329][E: codex-rs/tui/src/app.rs:330][E: codex-rs/tui/src/app.rs:331][E: codex-rs/tui/src/app.rs:332]。
- `thread_event_channels`、`active_thread_rx` 和 `active_thread_id` 是 `App` 保存 per-thread event routing state 的字段；这些字段如何把 app-server event stream 分派到当前 thread 是 TUI thread routing 层的行为 [E: codex-rs/tui/src/app.rs:548][E: codex-rs/tui/src/app.rs:552][E: codex-rs/tui/src/app.rs:553][I]。
- `overlay` 是 `App` 中的可选 overlay 入口；`handle_tui_event` 在 `overlay.is_some()` 时先调用 `handle_backtrack_overlay_event(...)`，因此 overlay path 优先于普通 key/paste/draw match [E: codex-rs/tui/src/app.rs:508][E: codex-rs/tui/src/app.rs:1095][E: codex-rs/tui/src/app.rs:1096]。

## 控制流

1. `App::run` 建立 `app_event_rx` 和 `AppEventSender`，并把发送端传给 fresh/resume/fork 的 `ChatWidgetInit` [E: codex-rs/tui/src/app.rs:655][E: codex-rs/tui/src/app.rs:656][E: codex-rs/tui/src/app.rs:771][E: codex-rs/tui/src/app.rs:805][E: codex-rs/tui/src/app.rs:844]。
2. `App::run` 启动或连接 app-server 后，按 `SessionSelection` 路径创建 fresh/resume/fork thread，并为每条路径构造 `ChatWidget` [E: codex-rs/tui/src/app.rs:645][E: codex-rs/tui/src/app.rs:763][E: codex-rs/tui/src/app.rs:792][E: codex-rs/tui/src/app.rs:794][E: codex-rs/tui/src/app.rs:826][E: codex-rs/tui/src/app.rs:828][E: codex-rs/tui/src/app.rs:865]。
3. `App` 构造完成后调用 `enqueue_primary_thread_session(...)` 交付 initial thread session，并创建 `tui.event_stream()` 作为 terminal event source [E: codex-rs/tui/src/app.rs:923][E: codex-rs/tui/src/app.rs:952]。
4. main loop 用 `tokio::select!` 同时处理 `app_event_rx.recv()`、`active_thread_rx.recv()`、`tui_events.next()` 和 `app_server.next_event()` [E: codex-rs/tui/src/app.rs:993][E: codex-rs/tui/src/app.rs:1001][E: codex-rs/tui/src/app.rs:1018][E: codex-rs/tui/src/app.rs:1029]。
5. terminal `Draw` 分支在 render 前检查当前 terminal size、必要时 refresh status line、运行 paste burst tick、`chat_widget.pre_draw_tick()`，再调用 `tui.draw(...)` [E: codex-rs/tui/src/app.rs:1088][E: codex-rs/tui/src/app.rs:1089][E: codex-rs/tui/src/app.rs:1091][E: codex-rs/tui/src/app.rs:1118][E: codex-rs/tui/src/app.rs:1123][E: codex-rs/tui/src/app.rs:1124]。
6. loop 结束后，`App::run` 请求 app-server shutdown，并在退出前清空 terminal 视图 [E: codex-rs/tui/src/app.rs:1052][E: codex-rs/tui/src/app.rs:1055]。

## 设计动机与权衡

- alternate screen 的动机不是单纯“全屏更好看”，而是避免历史 transcript 与 shell scrollback 的冲突；但是 Zellij 对 alternate screen 的行为会隐藏输出，所以设计文档把 `auto` 设为默认并在 Zellij 禁用 alternate screen [E: docs/tui-alternate-screen.md:13][E: docs/tui-alternate-screen.md:19][E: docs/tui-alternate-screen.md:29][E: docs/tui-alternate-screen.md:35][E: docs/tui-alternate-screen.md:38]。
- `tokio::select!` 把 terminal、UI intent、thread notification、app-server protocol event 收到一个 owner loop；这种 owner-loop 形态减少跨组件共享可变状态是基于控制流与 state ownership 的架构推断 [E: codex-rs/tui/src/app.rs:993][E: codex-rs/tui/src/app.rs:1001][E: codex-rs/tui/src/app.rs:1018][E: codex-rs/tui/src/app.rs:1029][I]。
- `App` 在 draw 分支中集中调用 status refresh、paste burst tick 和 pre-draw ticks；动画、paste burst、status surface 被 frame cadence 约束，而不是每个组件自行写 terminal，是基于这些集中调用点得出的架构推断 [E: codex-rs/tui/src/app.rs:1091][E: codex-rs/tui/src/app.rs:1118][E: codex-rs/tui/src/app.rs:1123][E: codex-rs/tui/src/app.rs:1124][I]。

## gotcha

- `--no-alt-screen` 不是简单等价于永久禁用 alternate screen 配置项；设计文档把它定义为 runtime/per-launch override，配置仍有 `auto`、`always`、`never` 三种模式 [E: docs/tui-alternate-screen.md:35][E: docs/tui-alternate-screen.md:42][E: docs/tui-alternate-screen.md:47][E: docs/tui-alternate-screen.md:55][E: docs/tui-alternate-screen.md:61]。
- `Paste` 分支会把 `\r` 归一化为 `\n` 再交给 `ChatWidget`，所以排查 Windows/terminal paste 行尾问题时应该从 `App::handle_tui_event` 与 composer paste burst 两处一起看 [E: codex-rs/tui/src/app.rs:1102][E: codex-rs/tui/src/app.rs:1107][E: codex-rs/tui/src/app.rs:1108][I]。
- overlay 存在时按键不会直接到 `ChatWidget`；`handle_tui_event` 先检查 overlay 并调用 overlay handler [E: codex-rs/tui/src/app.rs:1095][E: codex-rs/tui/src/app.rs:1096]。

## Sources

- `codex-rs/tui/src/app.rs`
- `docs/tui-alternate-screen.md`

## 相关

- `subsys.tui.event-system`
- `subsys.tui.chatwidget`
- `subsys.tui.bottom-pane`
- `subsys.app-server.session-management`
