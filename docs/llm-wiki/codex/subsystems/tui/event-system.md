---
id: subsys.tui.event-system
title: TUI Event System
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/app_event_sender.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/thread_routing.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/chatwidget/protocol.rs]
symbols: [AppEvent, AppEventSender, App::handle_event, App::handle_app_server_event, EventBroker, TuiEventStream, TuiEvent]
related: [subsys.tui.architecture, subsys.tui.chatwidget, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 5670360009
---

> TUI 事件系统有四条主入口：内部 `AppEvent` channel、active thread event channel、terminal `TuiEventStream`、app-server event stream；`App::run` 的 select loop 把它们分别送到 `handle_event`、`handle_active_thread_event`、`handle_tui_event` 和 `handle_app_server_event`。[E: codex-rs/tui/src/app.rs:1157][E: codex-rs/tui/src/app.rs:1159][E: codex-rs/tui/src/app.rs:1165][E: codex-rs/tui/src/app.rs:1184][E: codex-rs/tui/src/app.rs:1195]

## 能回答的问题

- `AppEvent` 当前承载哪些 UI/internal actions？
- `AppEventSender` 如何避免把 channel 泄漏到所有 widget？
- app-server notification/request 和 fatal disconnect 如何进入 UI？
- terminal event broker 为什么存在，pause/resume 的边界在哪里？

## AppEvent Channel

`AppEvent` 是 TUI 内部动作总线，覆盖 thread/agent 操作、message history、session lifecycle、exit/logout、Codex op forwarding、file search、rate-limit refresh 和更多 UI actions。[E: codex-rs/tui/src/app_event.rs:143][E: codex-rs/tui/src/app_event.rs:145][E: codex-rs/tui/src/app_event.rs:150][E: codex-rs/tui/src/app_event.rs:156][E: codex-rs/tui/src/app_event.rs:168][E: codex-rs/tui/src/app_event.rs:187][E: codex-rs/tui/src/app_event.rs:196][E: codex-rs/tui/src/app_event.rs:235][E: codex-rs/tui/src/app_event.rs:238][E: codex-rs/tui/src/app_event.rs:246][E: codex-rs/tui/src/app_event.rs:260][E: codex-rs/tui/src/app_event.rs:271]

rate-limit refresh 有明确 origin：startup prefetch、`/status` command 和 reset-credit consume；`RateLimitsLoaded` 带回 origin 与结果，供 UI 对应更新。[E: codex-rs/tui/src/app_event.rs:124][E: codex-rs/tui/src/app_event.rs:126][E: codex-rs/tui/src/app_event.rs:129][E: codex-rs/tui/src/app_event.rs:131][E: codex-rs/tui/src/app_event.rs:303][E: codex-rs/tui/src/app_event.rs:304][E: codex-rs/tui/src/app_event.rs:306]

`AppEventSender` 只包一层 `UnboundedSender<AppEvent>`；`send` 会记录非 `CodexOp` inbound app event，再发送，失败只 log。它还提供 interrupt/compact/user input answer/approval/MCP elicitation helpers，把 widget 侧调用收敛到 typed helpers。[E: codex-rs/tui/src/app_event_sender.rs:23][E: codex-rs/tui/src/app_event_sender.rs:34][E: codex-rs/tui/src/app_event_sender.rs:37][E: codex-rs/tui/src/app_event_sender.rs:40][E: codex-rs/tui/src/app_event_sender.rs:45][E: codex-rs/tui/src/app_event_sender.rs:55][E: codex-rs/tui/src/app_event_sender.rs:74][E: codex-rs/tui/src/app_event_sender.rs:80][E: codex-rs/tui/src/app_event_sender.rs:92][E: codex-rs/tui/src/app_event_sender.rs:104][E: codex-rs/tui/src/app_event_sender.rs:116]

## Dispatch Layer

`app/event_dispatch.rs` 明确定位为 exhaustive `AppEvent` dispatcher；大动作委托到 focused app submodules，central match 保持路由层。[E: codex-rs/tui/src/app/event_dispatch.rs:1][E: codex-rs/tui/src/app/event_dispatch.rs:3][E: codex-rs/tui/src/app/event_dispatch.rs:4][E: codex-rs/tui/src/app/event_dispatch.rs:15][E: codex-rs/tui/src/app/event_dispatch.rs:22]

关键分支包括 commit tick 到 `chat_widget.on_commit_tick`、shutdown-first exit 先显示 feedback 再 `handle_exit_mode`、fatal exit 直接返回 fatal reason、`CodexOp` 先 `prepare_local_op_submission` 再 submit active thread、`SubmitThreadOp` 按 thread id submit，`DiffResult` 切到 alternate-screen static overlay。[E: codex-rs/tui/src/app/event_dispatch.rs:311][E: codex-rs/tui/src/app/event_dispatch.rs:314][E: codex-rs/tui/src/app/event_dispatch.rs:316][E: codex-rs/tui/src/app/event_dispatch.rs:318][E: codex-rs/tui/src/app/event_dispatch.rs:333][E: codex-rs/tui/src/app/event_dispatch.rs:336][E: codex-rs/tui/src/app/event_dispatch.rs:337][E: codex-rs/tui/src/app/event_dispatch.rs:338][E: codex-rs/tui/src/app/event_dispatch.rs:366][E: codex-rs/tui/src/app/event_dispatch.rs:373][E: codex-rs/tui/src/app/event_dispatch.rs:377][E: codex-rs/tui/src/app/event_dispatch.rs:383]

`handle_exit_mode` 的 shutdown-first path 记录 pending shutdown thread，给 `shutdown_current_thread` 一个 2 秒 UI escape-hatch timeout，然后返回 user-requested exit；immediate path 清 pending id 后直接退出。[E: codex-rs/tui/src/app/event_dispatch.rs:2234][E: codex-rs/tui/src/app/event_dispatch.rs:2240][E: codex-rs/tui/src/app/event_dispatch.rs:2243][E: codex-rs/tui/src/app/event_dispatch.rs:2251][E: codex-rs/tui/src/app/event_dispatch.rs:2253][E: codex-rs/tui/src/app/event_dispatch.rs:2258][E: codex-rs/tui/src/app/event_dispatch.rs:2261][E: codex-rs/tui/src/app/event_dispatch.rs:2262][E: codex-rs/tui/src/app/event_dispatch.rs:2264]

## App-Server Events

`handle_app_server_event` 处理 lagged、server notification、server request 和 disconnect；disconnect 会给 chat widget 加错误并发送 `FatalExitRequest`。[E: codex-rs/tui/src/app/app_server_events.rs:30][E: codex-rs/tui/src/app/app_server_events.rs:35][E: codex-rs/tui/src/app/app_server_events.rs:36][E: codex-rs/tui/src/app/app_server_events.rs:44][E: codex-rs/tui/src/app/app_server_events.rs:48][E: codex-rs/tui/src/app/app_server_events.rs:52][E: codex-rs/tui/src/app/app_server_events.rs:54][E: codex-rs/tui/src/app/app_server_events.rs:55]

server notification 先处理 app-level effects：resolved server request 会 dismiss pending request，MCP status 更新刷新 expected servers，account rate limits/account updated 有专门分支更新 ChatWidget；其他 notification 再进入聊天协议处理。[E: codex-rs/tui/src/app/app_server_events.rs:60][E: codex-rs/tui/src/app/app_server_events.rs:66][E: codex-rs/tui/src/app/app_server_events.rs:67][E: codex-rs/tui/src/app/app_server_events.rs:71][E: codex-rs/tui/src/app/app_server_events.rs:74][E: codex-rs/tui/src/app/app_server_events.rs:77][E: codex-rs/tui/src/app/app_server_events.rs:78][E: codex-rs/tui/src/app/app_server_events.rs:82][E: codex-rs/tui/src/app/app_server_events.rs:92]

server request routing 把 MCP elicitation 变成 app link/form/approval/decline URL 等 UI request，再通过 `push_thread_interactive_request` 送进对应 thread 的 interactive request surface。[E: codex-rs/tui/src/app/thread_routing.rs:265][E: codex-rs/tui/src/app/thread_routing.rs:271][E: codex-rs/tui/src/app/thread_routing.rs:283][E: codex-rs/tui/src/app/thread_routing.rs:300][E: codex-rs/tui/src/app/thread_routing.rs:333][E: codex-rs/tui/src/app/thread_routing.rs:340][E: codex-rs/tui/src/app/thread_routing.rs:345]

## Terminal Event Stream

`TuiEvent` 只有 key、paste、resize、draw；`EventBroker` 维护 subscriber channel 和 paused/running stream state，`pause` drop underlying stream，`resume` 按需重建，`TuiEventStream::poll_next` 用 round-robin 方式轮询多个来源以避免单一 stream 饿死其他事件。[E: codex-rs/tui/src/tui.rs:510][E: codex-rs/tui/src/tui.rs:511][E: codex-rs/tui/src/tui.rs:513][E: codex-rs/tui/src/tui.rs:520][E: codex-rs/tui/src/tui.rs:522][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:57][E: codex-rs/tui/src/tui/event_stream.rs:90][E: codex-rs/tui/src/tui/event_stream.rs:101][E: codex-rs/tui/src/tui/event_stream.rs:274][E: codex-rs/tui/src/tui/event_stream.rs:299]

## Gotchas

- `AppEvent::CodexOp` 是内部转发路径，不代表 app-server notification；真正的 server notifications 先由 `app_server_events.rs` 处理，再进入 `ChatWidget::handle_server_notification`。[E: codex-rs/tui/src/app_event.rs:244][E: codex-rs/tui/src/app/app_server_events.rs:44][E: codex-rs/tui/src/chatwidget/protocol.rs:4]
- UI 退出默认应走 `ExitMode::ShutdownFirst`，`Immediate` 是 last-resort escape hatch，注释明确可能丢背景任务、rollout flush 或 child cleanup。[E: codex-rs/tui/src/app_event.rs:229][E: codex-rs/tui/src/app_event.rs:231][E: codex-rs/tui/src/app_event.rs:232][E: codex-rs/tui/src/app_event.rs:233]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/app_event_sender.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/app/thread_routing.rs`
- `codex-rs/tui/src/tui.rs`
- `codex-rs/tui/src/tui/event_stream.rs`
- `codex-rs/tui/src/chatwidget/protocol.rs`

## 相关

- `subsys.tui.chatwidget`: notification 到聊天 UI 状态的细分处理。
- `subsys.app-server.session-management`: app-server session/event stream 的另一侧。
