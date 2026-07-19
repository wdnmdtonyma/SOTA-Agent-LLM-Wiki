---
id: subsys.tui.event-system
title: TUI Event System
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/app_event_sender.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/thread_routing.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/chatwidget/protocol.rs]
symbols: [AppEvent, HistoryLookupResponse, RateLimitRefreshOrigin, AppEventSender, App::handle_event, App::handle_app_server_event, EventBroker, TuiEventStream, TuiEvent]
related: [subsys.tui.architecture, subsys.tui.chatwidget, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> TUI 事件系统有四条主入口：内部 `AppEvent` channel、active thread event channel、terminal `TuiEventStream`、app-server event stream；`App::run` 的 select loop 把它们分别送到 `handle_event`、`handle_active_thread_event`、`handle_tui_event` 和 `handle_app_server_event`。[E: codex-rs/tui/src/app.rs:1185][E: codex-rs/tui/src/app.rs:1187][E: codex-rs/tui/src/app.rs:1193][E: codex-rs/tui/src/app.rs:1212][E: codex-rs/tui/src/app.rs:1223]

## 能回答的问题

- `AppEvent` 当前承载哪些 UI/internal actions？
- `AppEventSender` 如何避免把 channel 泄漏到所有 widget？
- app-server notification/request 和 fatal disconnect 如何进入 UI？
- terminal event broker 为什么存在，pause/resume 的边界在哪里？

## AppEvent Channel

`AppEvent` 是 TUI 内部动作总线，覆盖 thread/agent 操作、message history、session lifecycle、exit/logout、Codex op forwarding、file search、rate-limit refresh 和更多 UI actions。[E: codex-rs/tui/src/app_event.rs:179][E: codex-rs/tui/src/app_event.rs:181][E: codex-rs/tui/src/app_event.rs:186][E: codex-rs/tui/src/app_event.rs:192][E: codex-rs/tui/src/app_event.rs:213][E: codex-rs/tui/src/app_event.rs:239][E: codex-rs/tui/src/app_event.rs:248][E: codex-rs/tui/src/app_event.rs:294][E: codex-rs/tui/src/app_event.rs:297][E: codex-rs/tui/src/app_event.rs:305][E: codex-rs/tui/src/app_event.rs:316][E: codex-rs/tui/src/app_event.rs:327]

rate-limit refresh 有明确 origin：startup prefetch、`/status` command、`/usage` menu、reset picker 和 reset-credit consume；`RateLimitsLoaded` 带 origin、hard-stop generation 与结果，旧 generation 的 response 不会覆盖更新后的 hard-stop snapshot。[E: codex-rs/tui/src/app_event.rs:150][E: codex-rs/tui/src/app_event.rs:156][E: codex-rs/tui/src/app_event.rs:161][E: codex-rs/tui/src/app_event.rs:166][E: codex-rs/tui/src/app_event.rs:359][E: codex-rs/tui/src/app/event_dispatch.rs:871][E: codex-rs/tui/src/app/event_dispatch.rs:878][E: codex-rs/tui/src/app/event_dispatch.rs:925]

`AppEventSender` 只包一层 `UnboundedSender<AppEvent>`；`send` 会记录非 `CodexOp` inbound app event，再发送，失败只 log。它还提供 interrupt/compact/user input answer/approval/MCP elicitation helpers，把 widget 侧调用收敛到 typed helpers。[E: codex-rs/tui/src/app_event_sender.rs:23][E: codex-rs/tui/src/app_event_sender.rs:34][E: codex-rs/tui/src/app_event_sender.rs:37][E: codex-rs/tui/src/app_event_sender.rs:40][E: codex-rs/tui/src/app_event_sender.rs:45][E: codex-rs/tui/src/app_event_sender.rs:49][E: codex-rs/tui/src/app_event_sender.rs:68][E: codex-rs/tui/src/app_event_sender.rs:74][E: codex-rs/tui/src/app_event_sender.rs:86][E: codex-rs/tui/src/app_event_sender.rs:98][E: codex-rs/tui/src/app_event_sender.rs:110]

## Dispatch Layer

`app/event_dispatch.rs` 明确定位为 exhaustive `AppEvent` dispatcher；大动作委托到 focused app submodules，central match 保持路由层。[E: codex-rs/tui/src/app/event_dispatch.rs:1][E: codex-rs/tui/src/app/event_dispatch.rs:3][E: codex-rs/tui/src/app/event_dispatch.rs:4][E: codex-rs/tui/src/app/event_dispatch.rs:17][E: codex-rs/tui/src/app/event_dispatch.rs:24]

persistent-history batch path 使用 `LookupMessageHistoryBatch { thread_id, cursor, log_id }`，结果以 `HistoryLookupResponse::{Batch,BatchError}` 路由回原 thread channel；single-entry lookup 仍走同一 response enum 的 `Entry` variant。[E: codex-rs/tui/src/app_event.rs:67][E: codex-rs/tui/src/app_event.rs:100][E: codex-rs/tui/src/app_event.rs:231][E: codex-rs/tui/src/app/event_dispatch.rs:459][E: codex-rs/tui/src/app/event_dispatch.rs:467][E: codex-rs/tui/src/app/event_dispatch.rs:482]

transcript prompt edit 是显式 `ForkSessionForPromptEdit` route：dispatcher 读取完整 thread，在选中 user message 之前 fork（若它是首条则 start fresh），替换 widget 后把原 prompt 放回 composer；失败时也恢复 prompt。[E: codex-rs/tui/src/app_event.rs:281][E: codex-rs/tui/src/app/event_dispatch.rs:233][E: codex-rs/tui/src/app/event_dispatch.rs:249][E: codex-rs/tui/src/app/event_dispatch.rs:258][E: codex-rs/tui/src/app/event_dispatch.rs:269][E: codex-rs/tui/src/app/event_dispatch.rs:280][E: codex-rs/tui/src/app/event_dispatch.rs:293]

usage reset 由 picker/confirmation/consume/result AppEvents 串行驱动：confirmation 生成 idempotency key，consume 的 `Reset`/`AlreadyRedeemed` 结果触发一次 rate-limit refresh，再更新剩余 credits。[E: codex-rs/tui/src/app_event.rs:369][E: codex-rs/tui/src/app_event.rs:372][E: codex-rs/tui/src/app_event.rs:382][E: codex-rs/tui/src/app_event.rs:388][E: codex-rs/tui/src/app/event_dispatch.rs:981][E: codex-rs/tui/src/app/event_dispatch.rs:1005][E: codex-rs/tui/src/app/event_dispatch.rs:1021][E: codex-rs/tui/src/app/event_dispatch.rs:1037]

关键分支包括 commit tick 到 `chat_widget.on_commit_tick`、shutdown-first exit 先显示 feedback 再 `handle_exit_mode`、fatal exit 直接返回 fatal reason、`CodexOp` 先 `prepare_local_op_submission` 再 submit active thread、`SubmitThreadOp` 按 thread id submit，`DiffResult` 切到 alternate-screen static overlay。[E: codex-rs/tui/src/app/event_dispatch.rs:390][E: codex-rs/tui/src/app/event_dispatch.rs:393][E: codex-rs/tui/src/app/event_dispatch.rs:395][E: codex-rs/tui/src/app/event_dispatch.rs:397][E: codex-rs/tui/src/app/event_dispatch.rs:412][E: codex-rs/tui/src/app/event_dispatch.rs:415][E: codex-rs/tui/src/app/event_dispatch.rs:425][E: codex-rs/tui/src/app/event_dispatch.rs:426][E: codex-rs/tui/src/app/event_dispatch.rs:479][E: codex-rs/tui/src/app/event_dispatch.rs:486][E: codex-rs/tui/src/app/event_dispatch.rs:490][E: codex-rs/tui/src/app/event_dispatch.rs:496]

`handle_exit_mode` 的 shutdown-first path 记录 pending shutdown thread，给 `shutdown_current_thread` 一个 2 秒 UI escape-hatch timeout，然后返回 user-requested exit；immediate path 清 pending id 后直接退出。[E: codex-rs/tui/src/app/event_dispatch.rs:2451][E: codex-rs/tui/src/app/event_dispatch.rs:2457][E: codex-rs/tui/src/app/event_dispatch.rs:2460][E: codex-rs/tui/src/app/event_dispatch.rs:2468][E: codex-rs/tui/src/app/event_dispatch.rs:2470][E: codex-rs/tui/src/app/event_dispatch.rs:2475][E: codex-rs/tui/src/app/event_dispatch.rs:2478][E: codex-rs/tui/src/app/event_dispatch.rs:2479][E: codex-rs/tui/src/app/event_dispatch.rs:2481]

## App-Server Events

`handle_app_server_event` 处理 lagged、server notification、server request 和 disconnect；disconnect 会给 chat widget 加错误并发送 `FatalExitRequest`。[E: codex-rs/tui/src/app/app_server_events.rs:32][E: codex-rs/tui/src/app/app_server_events.rs:37][E: codex-rs/tui/src/app/app_server_events.rs:38][E: codex-rs/tui/src/app/app_server_events.rs:46][E: codex-rs/tui/src/app/app_server_events.rs:50][E: codex-rs/tui/src/app/app_server_events.rs:54][E: codex-rs/tui/src/app/app_server_events.rs:56][E: codex-rs/tui/src/app/app_server_events.rs:57]

server notification 先处理 app-level effects：resolved server request 会 dismiss pending request，MCP status 更新刷新 expected servers，account rate limits/account updated 有专门分支更新 ChatWidget；其他 notification 再进入聊天协议处理。[E: codex-rs/tui/src/app/app_server_events.rs:62][E: codex-rs/tui/src/app/app_server_events.rs:68][E: codex-rs/tui/src/app/app_server_events.rs:69][E: codex-rs/tui/src/app/app_server_events.rs:73][E: codex-rs/tui/src/app/app_server_events.rs:76][E: codex-rs/tui/src/app/app_server_events.rs:79][E: codex-rs/tui/src/app/app_server_events.rs:93][E: codex-rs/tui/src/app/app_server_events.rs:97][E: codex-rs/tui/src/app/app_server_events.rs:107]

server request routing 把 MCP elicitation 中可交互的 app link、form 和 approval 变成 thread interactive request，再通过 `push_thread_interactive_request` 送进对应 thread 的 interactive request surface；`OpenAiForm`/`Url` fallback 会直接 decline，不进入 UI request surface。[E: codex-rs/tui/src/app/thread_routing.rs:270][E: codex-rs/tui/src/app/thread_routing.rs:277][E: codex-rs/tui/src/app/thread_routing.rs:288][E: codex-rs/tui/src/app/thread_routing.rs:291][E: codex-rs/tui/src/app/thread_routing.rs:300][E: codex-rs/tui/src/app/thread_routing.rs:304][E: codex-rs/tui/src/app/thread_routing.rs:308][E: codex-rs/tui/src/app/thread_routing.rs:312][E: codex-rs/tui/src/app/thread_routing.rs:341][E: codex-rs/tui/src/app/thread_routing.rs:348][E: codex-rs/tui/src/app/thread_routing.rs:352]

## Terminal Event Stream

`TuiEvent` 只有 key、paste、resize、draw；`EventBroker` 维护 subscriber channel 和 paused/running stream state，`pause` drop underlying stream，`resume` 按需重建，`TuiEventStream::poll_next` 用 round-robin 方式轮询多个来源以避免单一 stream 饿死其他事件。[E: codex-rs/tui/src/tui.rs:525][E: codex-rs/tui/src/tui.rs:528][E: codex-rs/tui/src/tui.rs:535][E: codex-rs/tui/src/tui.rs:537][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:57][E: codex-rs/tui/src/tui/event_stream.rs:90][E: codex-rs/tui/src/tui/event_stream.rs:101][E: codex-rs/tui/src/tui/event_stream.rs:274][E: codex-rs/tui/src/tui/event_stream.rs:299]

## Gotchas

- `AppEvent::CodexOp` 是内部转发路径，不代表 app-server notification；真正的 server notifications 先由 `app_server_events.rs` 处理，再进入 `ChatWidget::handle_server_notification`。[E: codex-rs/tui/src/app_event.rs:292][E: codex-rs/tui/src/app/app_server_events.rs:46][E: codex-rs/tui/src/chatwidget/protocol.rs:4]
- UI 退出默认应走 `ExitMode::ShutdownFirst`，`Immediate` 是 last-resort escape hatch，注释明确可能丢背景任务、rollout flush 或 child cleanup。[E: codex-rs/tui/src/app_event.rs:270][E: codex-rs/tui/src/app_event.rs:272][E: codex-rs/tui/src/app_event.rs:273][E: codex-rs/tui/src/app_event.rs:1136][E: codex-rs/tui/src/app_event.rs:1137][E: codex-rs/tui/src/app_event.rs:1140][E: codex-rs/tui/src/app_event.rs:1142][E: codex-rs/tui/src/app_event.rs:1147]
- history lookup 与 async usage response 都带 request/log identity；接收方会丢弃 stale response，不能把 channel delivery 当作仍与当前 popup/search 对应。[E: codex-rs/tui/src/app_event.rs:67][E: codex-rs/tui/src/app_event.rs:359]

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
