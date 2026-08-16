---
id: subsys.tui.event-system
title: TUI Event System
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/app_event_sender.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/thread_routing.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/startup.rs, codex-rs/tui/src/app/history_pagination.rs, codex-rs/tui/src/tui.rs, codex-rs/tui/src/tui/event_stream.rs, codex-rs/tui/src/chatwidget/protocol.rs]
symbols: [AppEvent, HistoryLookupResponse, RateLimitRefreshOrigin, TranscriptExportDestination, AppEventSender, App::handle_event, App::handle_app_server_event, EventBroker, TuiEventStream, TuiEvent]
related: [subsys.tui.architecture, subsys.tui.chatwidget, subsys.tui.keymap, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> TUI 事件系统有四条主入口：内部 `AppEvent` channel、active thread event channel、terminal `TuiEventStream`、app-server event stream。`App::run` 的 select loop 现在位于 `app/startup.rs`，分别送到 `handle_event`、`handle_active_thread_event`、`handle_tui_event` 和 `handle_app_server_event`。[E: codex-rs/tui/src/app/startup.rs:610][E: codex-rs/tui/src/app/startup.rs:618][E: codex-rs/tui/src/app/startup.rs:646][E: codex-rs/tui/src/app/startup.rs:675][E: codex-rs/tui/src/app/startup.rs:686]

## 能回答的问题

- `AppEvent` 当前承载哪些 UI/internal actions？
- `AppEventSender` 如何避免把 channel 泄漏到所有 widget？
- app-server notification/request 和 fatal disconnect 如何进入 UI？
- terminal event broker 为什么存在，pause/resume 的边界在哪里？
- older history page 和 transcript export 走哪条 AppEvent？

## AppEvent Channel

`AppEvent` 是 TUI 内部动作总线，覆盖 thread/agent 操作、paginated history refill、transcript export、message history、session lifecycle、exit/logout、Codex op forwarding、file search、rate-limit refresh 和更多 UI actions。[E: codex-rs/tui/src/app_event.rs:197][E: codex-rs/tui/src/app_event.rs:199][E: codex-rs/tui/src/app_event.rs:216][E: codex-rs/tui/src/app_event.rs:237][E: codex-rs/tui/src/app_event.rs:242][E: codex-rs/tui/src/app_event.rs:249][E: codex-rs/tui/src/app_event.rs:252][E: codex-rs/tui/src/app_event.rs:276][E: codex-rs/tui/src/app_event.rs:288][E: codex-rs/tui/src/app_event.rs:344]

rate-limit refresh 有明确 origin：startup prefetch、`/status` command、`/usage` menu、reset picker 和 reset-credit consume；`RateLimitsLoaded` 带 origin、hard-stop generation 与结果，旧 generation 的 response 不会覆盖更新后的 hard-stop snapshot。[E: codex-rs/tui/src/app_event.rs:161][E: codex-rs/tui/src/app_event.rs:163][E: codex-rs/tui/src/app_event.rs:166][E: codex-rs/tui/src/app_event.rs:168][E: codex-rs/tui/src/app_event.rs:170][E: codex-rs/tui/src/app_event.rs:172][E: codex-rs/tui/src/app/event_dispatch.rs:1091][E: codex-rs/tui/src/app/event_dispatch.rs:1093][E: codex-rs/tui/src/app/event_dispatch.rs:1098]

`AppEventSender` 只包一层 `UnboundedSender<AppEvent>`；`send` 会记录非 `CodexOp` inbound app event，再发送，失败只 log。它还提供 interrupt/compact/user input answer/approval/MCP elicitation helpers，把 widget 侧调用收敛到 typed helpers。[E: codex-rs/tui/src/app_event_sender.rs:23][E: codex-rs/tui/src/app_event_sender.rs:34][E: codex-rs/tui/src/app_event_sender.rs:37][E: codex-rs/tui/src/app_event_sender.rs:40][E: codex-rs/tui/src/app_event_sender.rs:45][E: codex-rs/tui/src/app_event_sender.rs:49][E: codex-rs/tui/src/app_event_sender.rs:68][E: codex-rs/tui/src/app_event_sender.rs:74][E: codex-rs/tui/src/app_event_sender.rs:86]

## Dispatch Layer

`app/event_dispatch.rs` 明确定位为 exhaustive `AppEvent` dispatcher；大动作委托到 focused app submodules，central match 保持路由层。[E: codex-rs/tui/src/app/event_dispatch.rs:19][E: codex-rs/tui/src/app/event_dispatch.rs:25]

older transcript 由 `RequestOlderScrollbackHistory` / `OlderThreadHistoryLoaded` 驱动：dispatcher 在 overlay 未打开且 `scrollback_has_older_history` 时发起 `request_older_history_page`，后台结果再进 `handle_older_history_page`。[E: codex-rs/tui/src/app/event_dispatch.rs:37][E: codex-rs/tui/src/app/event_dispatch.rs:42][E: codex-rs/tui/src/app/event_dispatch.rs:45][E: codex-rs/tui/src/app/event_dispatch.rs:51][E: codex-rs/tui/src/app/history_pagination.rs:18]

`/export` 是两条 AppEvent：`OpenTranscriptExportFilePrompt` 打开 filename prompt，`ExportTranscript { destination }` 调用 `App::export_transcript`；clipboard 或 file 失败时把错误写回 chat history。[E: codex-rs/tui/src/app/event_dispatch.rs:64][E: codex-rs/tui/src/app/event_dispatch.rs:65][E: codex-rs/tui/src/app/event_dispatch.rs:67][E: codex-rs/tui/src/app/event_dispatch.rs:68][E: codex-rs/tui/src/app_event.rs:190][E: codex-rs/tui/src/app_event.rs:252]

persistent-history batch path 使用 `LookupMessageHistoryBatch { thread_id, cursor, log_id }`；transcript prompt edit 是显式 `ForkSessionForPromptEdit` route：dispatcher 在选中 user message 之前 fork，替换 widget 后把原 prompt 放回 composer。[E: codex-rs/tui/src/app_event.rs:276][E: codex-rs/tui/src/app_event.rs:332][E: codex-rs/tui/src/app/event_dispatch.rs:415][E: codex-rs/tui/src/app/event_dispatch.rs:427]

关键分支包括 `DiffResult` 切到 alternate-screen static overlay、`StartupThreadStarted` 交给 startup attach、shutdown-first exit 先显示 feedback 再 `handle_exit_mode`。[E: codex-rs/tui/src/app/event_dispatch.rs:33][E: codex-rs/tui/src/app/event_dispatch.rs:695][E: codex-rs/tui/src/app/event_dispatch.rs:699][E: codex-rs/tui/src/app/event_dispatch.rs:705][E: codex-rs/tui/src/app/event_dispatch.rs:2725]

`handle_exit_mode` 的 shutdown-first path 记录 pending shutdown thread，给 `shutdown_current_thread` 一个 2 秒 UI escape-hatch timeout，然后返回 user-requested exit；immediate path 清 pending id 后直接退出。[E: codex-rs/tui/src/app/event_dispatch.rs:16][E: codex-rs/tui/src/app/event_dispatch.rs:2731][E: codex-rs/tui/src/app/event_dispatch.rs:2734][E: codex-rs/tui/src/app/event_dispatch.rs:2742][E: codex-rs/tui/src/app/event_dispatch.rs:2753][E: codex-rs/tui/src/app/event_dispatch.rs:2755][E: codex-rs/tui/src/app/event_dispatch.rs:2757]

## App-Server Events

`handle_app_server_event` 处理 lagged、server notification、server request 和 disconnect；disconnect 会给 chat widget 加错误并发送 `FatalExitRequest`。[E: codex-rs/tui/src/app/app_server_events.rs:47][E: codex-rs/tui/src/app/app_server_events.rs:53][E: codex-rs/tui/src/app/app_server_events.rs:61][E: codex-rs/tui/src/app/app_server_events.rs:65][E: codex-rs/tui/src/app/app_server_events.rs:69][E: codex-rs/tui/src/app/app_server_events.rs:71][E: codex-rs/tui/src/app/app_server_events.rs:72]

## Terminal Event Stream

`TuiEvent` 有 key、paste、resize、draw 和 resume；`EventBroker` 维护 subscriber channel 和 paused/running stream state，`pause` drop underlying stream，`resume` 按需重建。[E: codex-rs/tui/src/tui.rs:559][E: codex-rs/tui/src/tui.rs:561][E: codex-rs/tui/src/tui.rs:570][E: codex-rs/tui/src/tui.rs:575][E: codex-rs/tui/src/tui/event_stream.rs:51][E: codex-rs/tui/src/tui/event_stream.rs:58][E: codex-rs/tui/src/tui.rs:686][E: codex-rs/tui/src/tui.rs:692]

`handle_tui_event` 先为 event 解析 screen size，非 key/paste 事件还会让 pending chord 过期并运行 pre-render reflow。physical key 在 overlay/composer 之前经过 `route_key_chord_event`：pending/cancelled 事件在此被吞掉，completed chord 改写成内部 dispatch key，再进入原有 handler。[E: codex-rs/tui/src/app.rs:752][E: codex-rs/tui/src/app.rs:758][E: codex-rs/tui/src/app.rs:760][E: codex-rs/tui/src/app.rs:764][E: codex-rs/tui/src/app/input.rs:10][E: codex-rs/tui/src/app/input.rs:29][E: codex-rs/tui/src/app/input.rs:44][E: codex-rs/tui/src/app/input.rs:48]

## Gotchas

- `AppEvent::CodexOp` 是内部转发路径，不代表 app-server notification；真正的 server notifications 先由 `app_server_events.rs` 处理，再进入 `ChatWidget::handle_server_notification`。[E: codex-rs/tui/src/app/app_server_events.rs:61][E: codex-rs/tui/src/chatwidget/protocol.rs:4]
- UI 退出默认应走 `ExitMode::ShutdownFirst`，`Immediate` 是 last-resort escape hatch，注释明确可能丢背景任务、rollout flush 或 child cleanup。[E: codex-rs/tui/src/app_event.rs:344][E: codex-rs/tui/src/app_event.rs:344][E: codex-rs/tui/src/app/event_dispatch.rs:2731]
- history lookup 与 async usage / thread-usage response 都带 request/log identity；接收方会丢弃 stale response，不能把 channel delivery 当作仍与当前 popup/search 对应。[I]
- startup select loop 会在 session header 或 queued protected request 未清空时挡住 terminal input；这不是 event broker pause。[E: codex-rs/tui/src/app/startup.rs:605][E: codex-rs/tui/src/app/startup.rs:654]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/app_event_sender.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/app/thread_routing.rs`
- `codex-rs/tui/src/app/input.rs`
- `codex-rs/tui/src/app/startup.rs`
- `codex-rs/tui/src/app/history_pagination.rs`
- `codex-rs/tui/src/tui.rs`
- `codex-rs/tui/src/tui/event_stream.rs`
- `codex-rs/tui/src/chatwidget/protocol.rs`

## 相关

- `subsys.tui.chatwidget`: notification 到聊天 UI 状态的细分处理。
- `subsys.tui.keymap`: context-aware chord matcher 与 internal dispatch token。
- `subsys.app-server.session-management`: app-server session/event stream 的另一侧。
