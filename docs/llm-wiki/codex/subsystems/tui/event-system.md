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
updated: 3abbf9fe2c
---

> TUI 事件系统有四条主入口：内部 `AppEvent` channel、active thread event channel、terminal `TuiEventStream`、app-server event stream。`App::run` 的 select loop 现在位于 `app/startup.rs`，分别送到 `handle_event`、`handle_active_thread_event`、`handle_tui_event` 和 `handle_app_server_event`。[E: codex-rs/tui/src/app/startup.rs:1061][E: codex-rs/tui/src/app/startup.rs:1069][E: codex-rs/tui/src/app/startup.rs:1098][E: codex-rs/tui/src/app/startup.rs:1129][E: codex-rs/tui/src/app/startup.rs:1139]

## 能回答的问题

- `AppEvent` 当前承载哪些 UI/internal actions？
- `AppEventSender` 如何避免把 channel 泄漏到所有 widget？
- app-server notification/request 和 fatal disconnect 如何进入 UI？
- terminal event broker 为什么存在，pause/resume 的边界在哪里？
- older history page 和 transcript export 走哪条 AppEvent？

## AppEvent Channel

`AppEvent` 是 TUI 内部动作总线，覆盖 thread/agent 操作、paginated history refill、transcript export、message history、session lifecycle、exit/logout、Codex op forwarding、file search、rate-limit refresh、permission profile fetch/select 和更多 UI actions。[E: codex-rs/tui/src/app_event.rs:271][E: codex-rs/tui/src/app_event.rs:276][E: codex-rs/tui/src/app_event.rs:349][E: codex-rs/tui/src/app_event.rs:411][E: codex-rs/tui/src/app_event.rs:426][E: codex-rs/tui/src/app_event.rs:458][E: codex-rs/tui/src/app_event.rs:587][E: codex-rs/tui/src/app_event.rs:1269]

rate-limit refresh 有明确 origin：startup prefetch、`/status` command、`/usage` menu、reset picker、reset-credit consume、inference-limit 后的 `Recovery`，以及 background `Periodic`；`RateLimitsLoaded` 带 origin、hard-stop generation 与结果，旧 generation 的 response 不会覆盖更新后的 hard-stop snapshot。[E: codex-rs/tui/src/app_event.rs:208][E: codex-rs/tui/src/app_event.rs:210][E: codex-rs/tui/src/app_event.rs:213][E: codex-rs/tui/src/app_event.rs:215][E: codex-rs/tui/src/app_event.rs:217][E: codex-rs/tui/src/app_event.rs:219][E: codex-rs/tui/src/app_event.rs:221][E: codex-rs/tui/src/app_event.rs:223][E: codex-rs/tui/src/app/event_dispatch.rs:1458]

`AppEventSender` 只包一层 `UnboundedSender<AppEvent>`；`send` 会记录非 `CodexOp` inbound app event，再发送，失败只 log。它还提供 interrupt/compact/user input answer/approval/MCP elicitation helpers，把 widget 侧调用收敛到 typed helpers。[E: codex-rs/tui/src/app_event_sender.rs:24][E: codex-rs/tui/src/app_event_sender.rs:35][E: codex-rs/tui/src/app_event_sender.rs:38][E: codex-rs/tui/src/app_event_sender.rs:41][E: codex-rs/tui/src/app_event_sender.rs:46][E: codex-rs/tui/src/app_event_sender.rs:50][E: codex-rs/tui/src/app_event_sender.rs:69][E: codex-rs/tui/src/app_event_sender.rs:75][E: codex-rs/tui/src/app_event_sender.rs:87]

## Dispatch Layer

`app/event_dispatch.rs` 的 `App::handle_event` 是 exhaustive `AppEvent` dispatcher；大动作委托到 focused app submodules，central match 保持路由层。command center 的 `NewAgentsOverviewSession` / `NewAgentsOverviewWorktree` 在此接到 `agents_overview_new.rs`。[E: codex-rs/tui/src/app/event_dispatch.rs:27][E: codex-rs/tui/src/app/event_dispatch.rs:32][E: codex-rs/tui/src/app/event_dispatch.rs:2451][E: codex-rs/tui/src/app/event_dispatch.rs:2454]

older transcript 由 `RequestOlderScrollbackHistory` / `OlderThreadHistoryLoaded` 驱动：dispatcher 在 overlay 未打开且 `scrollback_has_older_history` 时发起 `request_older_history_page`，后台结果再进 `handle_older_history_page`。[E: codex-rs/tui/src/app/event_dispatch.rs:273][E: codex-rs/tui/src/app/event_dispatch.rs:275][E: codex-rs/tui/src/app/event_dispatch.rs:281][E: codex-rs/tui/src/app/history_pagination.rs:21]

`/export` 是两条 AppEvent：`OpenTranscriptExportFilePrompt` 打开 filename prompt，`ExportTranscript { destination }` 调用 `App::export_transcript`；clipboard 或 file 失败时把错误写回 chat history。[E: codex-rs/tui/src/app/event_dispatch.rs:300][E: codex-rs/tui/src/app/event_dispatch.rs:303][E: codex-rs/tui/src/app_event.rs:423][E: codex-rs/tui/src/app_event.rs:426]

persistent-history batch path 使用 `LookupMessageHistoryBatch { thread_id, cursor, log_id }`；transcript prompt edit 是显式 `ForkSessionForPromptEdit` route：dispatcher 在选中 user message 之前 fork，替换 widget 后把原 prompt 放回 composer。若该 thread 仍有 pending remote permission selection，则拒绝 fork 并提示等待 permissions。[E: codex-rs/tui/src/app_event.rs:458][E: codex-rs/tui/src/app_event.rs:575][E: codex-rs/tui/src/app/event_dispatch.rs:521][E: codex-rs/tui/src/app/event_dispatch.rs:529][E: codex-rs/tui/src/app/event_dispatch.rs:986]

关键分支包括 `DiffResult` 切到 alternate-screen static overlay、`FetchPermissionProfiles` / `PermissionProfilesLoaded` 交给 discovery/picker、shutdown-first exit 先显示 feedback 再 `handle_exit_mode`。[E: codex-rs/tui/src/app/event_dispatch.rs:1005][E: codex-rs/tui/src/app/event_dispatch.rs:1832][E: codex-rs/tui/src/app/event_dispatch.rs:1843][E: codex-rs/tui/src/app/event_dispatch.rs:3152]

`handle_exit_mode` 的 `ShutdownFirst` / `ShutdownAfterInterrupt` path 记录 pending shutdown thread，给 `shutdown_current_thread` 一个 2 秒 UI escape-hatch timeout；前者返回 `ExitReason::UserRequested`，后者返回 `TurnInterrupted`。immediate path 清 pending id 后直接以 user-requested 退出。[E: codex-rs/tui/src/app/event_dispatch.rs:24][E: codex-rs/tui/src/app/event_dispatch.rs:3177][E: codex-rs/tui/src/app/event_dispatch.rs:3189][E: codex-rs/tui/src/app/event_dispatch.rs:3199][E: codex-rs/tui/src/app/event_dispatch.rs:3205]

## App-Server Events

`handle_app_server_event` 处理 lagged、server notification、server request 和 disconnect；disconnect 会给 chat widget 加错误并发送 `FatalExitRequest`（若 reconnect 未接管）。[E: codex-rs/tui/src/app/app_server_events.rs:60][E: codex-rs/tui/src/app/app_server_events.rs:66][E: codex-rs/tui/src/app/app_server_events.rs:108][E: codex-rs/tui/src/app/app_server_events.rs:98][E: codex-rs/tui/src/app/app_server_events.rs:103][E: codex-rs/tui/src/app/app_server_events.rs:109]

## Terminal Event Stream

`TuiEvent` 有 key、paste、resize、draw、resume、`FocusGained` 和 `FocusLost`；`EventBroker` 维护 subscriber channel 和 paused/running stream state，`pause` drop underlying stream，`resume` 按需重建。[E: codex-rs/tui/src/tui.rs:566][E: codex-rs/tui/src/tui.rs:568][E: codex-rs/tui/src/tui.rs:575][E: codex-rs/tui/src/tui.rs:584][E: codex-rs/tui/src/tui.rs:586][E: codex-rs/tui/src/tui/event_stream.rs:53][E: codex-rs/tui/src/tui.rs:707][E: codex-rs/tui/src/tui.rs:713]

`handle_tui_event` 先为 event 解析 screen size，非 key/paste/`FocusLost` 事件还会让 pending chord 过期并运行 pre-render reflow。physical key 在 overlay/composer 之前经过 `route_key_chord_event`：pending/cancelled 事件在此被吞掉，completed chord 改写成内部 dispatch key，再进入原有 handler。[E: codex-rs/tui/src/app.rs:841][E: codex-rs/tui/src/app.rs:859][E: codex-rs/tui/src/app.rs:862][E: codex-rs/tui/src/app.rs:864][E: codex-rs/tui/src/app.rs:878][E: codex-rs/tui/src/app/input.rs:52]

## Gotchas

- `AppEvent::CodexOp` 是内部转发路径，不代表 app-server notification；真正的 server notifications 先由 `app_server_events.rs` 处理，再进入 `ChatWidget::handle_server_notification`。[E: codex-rs/tui/src/app/app_server_events.rs:87][E: codex-rs/tui/src/chatwidget/protocol.rs:4]
- UI 退出默认应走 `ExitMode::ShutdownFirst`，`Immediate` 是 last-resort escape hatch，注释明确可能丢背景任务、rollout flush 或 child cleanup。[E: codex-rs/tui/src/app_event.rs:587][E: codex-rs/tui/src/app_event.rs:587][E: codex-rs/tui/src/app/event_dispatch.rs:3177]
- history lookup 与 async usage / thread-usage response 都带 request/log identity；接收方会丢弃 stale response，不能把 channel delivery 当作仍与当前 popup/search 对应。[I]
- startup select loop 会在 session header 或 queued protected request 未清空时挡住 terminal input；这不是 event broker pause。[E: codex-rs/tui/src/app/startup.rs:1048][E: codex-rs/tui/src/app/startup.rs:1106]

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
