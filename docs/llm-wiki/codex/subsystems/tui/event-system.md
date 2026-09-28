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
updated: 1cc7e23612
---

> TUI 事件系统有四条主入口：内部 `AppEvent` channel、active thread event channel、terminal `TuiEventStream`、app-server event stream。`App::run` 的 select loop 现在位于 `app/startup.rs`，分别送到 `handle_event`、`handle_active_thread_event`、`handle_tui_event` 和 `handle_app_server_event`。[E: codex-rs/tui/src/app/startup.rs:1109][E: codex-rs/tui/src/app/startup.rs:1117][E: codex-rs/tui/src/app/startup.rs:1146][E: codex-rs/tui/src/app/startup.rs:1177][E: codex-rs/tui/src/app/startup.rs:1187]

## 能回答的问题

- `AppEvent` 当前承载哪些 UI/internal actions？
- `AppEventSender` 如何避免把 channel 泄漏到所有 widget？
- app-server notification/request 和 fatal disconnect 如何进入 UI？
- terminal event broker 为什么存在，pause/resume 的边界在哪里？
- older history page 和 transcript export 走哪条 AppEvent？

## AppEvent Channel

`AppEvent` 是 TUI 内部动作总线，覆盖 thread/agent 操作、paginated history refill、transcript export、message history、session lifecycle、exit/logout、Codex op forwarding、file search、rate-limit refresh、permission profile fetch/select 和更多 UI actions。[E: codex-rs/tui/src/app_event.rs:279][E: codex-rs/tui/src/app_event.rs:287][E: codex-rs/tui/src/app_event.rs:360][E: codex-rs/tui/src/app_event.rs:422][E: codex-rs/tui/src/app_event.rs:447][E: codex-rs/tui/src/app_event.rs:479][E: codex-rs/tui/src/app_event.rs:614][E: codex-rs/tui/src/app_event.rs:1329]

rate-limit refresh 有明确 origin：startup prefetch、`/status` command、`/usage` menu、reset picker、reset-credit consume、inference-limit 后的 `Recovery`，以及 background `Periodic`；`RateLimitsLoaded` 带 origin、hard-stop generation 与结果，旧 generation 的 response 不会覆盖更新后的 hard-stop snapshot。[E: codex-rs/tui/src/app_event.rs:216][E: codex-rs/tui/src/app_event.rs:218][E: codex-rs/tui/src/app_event.rs:221][E: codex-rs/tui/src/app_event.rs:223][E: codex-rs/tui/src/app_event.rs:225][E: codex-rs/tui/src/app_event.rs:227][E: codex-rs/tui/src/app_event.rs:229][E: codex-rs/tui/src/app_event.rs:231][E: codex-rs/tui/src/app/event_dispatch.rs:1646]

`AppEventSender` 包 `UnboundedSender<AppEvent>` 和 `voice_only` flag；`send` 在 `voice_only` 时会丢掉绝大多数 UI/typed 事件（仅放行 realtime/voice/sync-git/rate-limit 子集），再记录非 `CodexOp` inbound app event 并发送，失败只 log。它还提供 interrupt/compact/user input answer/approval/MCP elicitation helpers，把 widget 侧调用收敛到 typed helpers。[E: codex-rs/tui/src/app_event_sender.rs:27][E: codex-rs/tui/src/app_event_sender.rs:29][E: codex-rs/tui/src/app_event_sender.rs:42][E: codex-rs/tui/src/app_event_sender.rs:45][E: codex-rs/tui/src/app_event_sender.rs:61][E: codex-rs/tui/src/app_event_sender.rs:65][E: codex-rs/tui/src/app_event_sender.rs:68][E: codex-rs/tui/src/app_event_sender.rs:73][E: codex-rs/tui/src/app_event_sender.rs:77][E: codex-rs/tui/src/app_event_sender.rs:96][E: codex-rs/tui/src/app_event_sender.rs:102][E: codex-rs/tui/src/app_event_sender.rs:114]

## Dispatch Layer

`app/event_dispatch.rs` 的 `App::handle_event` 是 exhaustive `AppEvent` dispatcher；大动作委托到 focused app submodules，central match 保持路由层。command center 的 `NewAgentsOverviewSession` / `NewAgentsOverviewWorktree` 在此接到 `agents_overview_new.rs`；`OpenDaemonMenu` / `OpenWarnings` 分别开 daemon menu 与 retained-warnings viewer。[E: codex-rs/tui/src/app/event_dispatch.rs:27][E: codex-rs/tui/src/app/event_dispatch.rs:124][E: codex-rs/tui/src/app/event_dispatch.rs:348][E: codex-rs/tui/src/app/event_dispatch.rs:2601][E: codex-rs/tui/src/app/event_dispatch.rs:2621]

older transcript 由 `RequestOlderScrollbackHistory` / `OlderThreadHistoryLoaded` 驱动：dispatcher 在 overlay 未打开且 `scrollback_has_older_history` 时发起 `request_older_history_page`，后台结果再进 `handle_older_history_page`。[E: codex-rs/tui/src/app/event_dispatch.rs:320][E: codex-rs/tui/src/app/event_dispatch.rs:322][E: codex-rs/tui/src/app/event_dispatch.rs:328][E: codex-rs/tui/src/app/history_pagination.rs:23]

`/export` 是两条 AppEvent：`OpenTranscriptExportFilePrompt` 打开 filename prompt，`ExportTranscript { destination }` 调用 `App::export_transcript`；clipboard 或 file 失败时把错误写回 chat history。[E: codex-rs/tui/src/app/event_dispatch.rs:367][E: codex-rs/tui/src/app/event_dispatch.rs:370][E: codex-rs/tui/src/app_event.rs:434][E: codex-rs/tui/src/app_event.rs:447]

persistent-history batch path 使用 `LookupMessageHistoryBatch { thread_id, cursor, log_id }`；transcript prompt edit 是显式 `RevertSessionForPromptEdit`：dispatcher 在当前 thread 上 `revert_thread`，再把原 prompt 放回 composer。若该 thread 仍有 pending remote permission selection，则拒绝 revert 并提示等待 permissions。[E: codex-rs/tui/src/app_event.rs:479][E: codex-rs/tui/src/app_event.rs:598][E: codex-rs/tui/src/app/event_dispatch.rs:617][E: codex-rs/tui/src/app/event_dispatch.rs:635][E: codex-rs/tui/src/app/event_dispatch.rs:714]

关键分支包括 `DiffResult` 切到 alternate-screen static overlay、`FetchPermissionProfiles` / `PermissionProfilesLoaded` 交给 discovery/picker、shutdown-first exit 先显示 feedback 再 `handle_exit_mode`。[E: codex-rs/tui/src/app/event_dispatch.rs:1196][E: codex-rs/tui/src/app/event_dispatch.rs:2033][E: codex-rs/tui/src/app/event_dispatch.rs:2044][E: codex-rs/tui/src/app/event_dispatch.rs:3351]

`handle_exit_mode` 的 `ShutdownFirst` / `ShutdownAfterInterrupt` path 记录 pending shutdown thread，给 `shutdown_current_thread` 一个 2 秒 UI escape-hatch timeout；前者返回 `ExitReason::UserRequested`，后者返回 `TurnInterrupted`。immediate path 清 pending id 后直接以 user-requested 退出。[E: codex-rs/tui/src/app/event_dispatch.rs:3351][E: codex-rs/tui/src/app/event_dispatch.rs:3376][E: codex-rs/tui/src/app/event_dispatch.rs:3390][E: codex-rs/tui/src/app/event_dispatch.rs:3400][E: codex-rs/tui/src/app/event_dispatch.rs:3406]

## App-Server Events

`handle_app_server_event` 处理 lagged、server notification、server request 和 disconnect；disconnect 会给 chat widget 加错误并发送 `FatalExitRequest`（若 reconnect 未接管）。[E: codex-rs/tui/src/app/app_server_events.rs:63][E: codex-rs/tui/src/app/app_server_events.rs:69][E: codex-rs/tui/src/app/app_server_events.rs:111][E: codex-rs/tui/src/app/app_server_events.rs:101][E: codex-rs/tui/src/app/app_server_events.rs:106][E: codex-rs/tui/src/app/app_server_events.rs:112]

## Terminal Event Stream

`TuiEvent` 有 key、paste、`Mouse`、resize、draw、resume、`FocusGained` 和 `FocusLost`；`EventBroker` 维护 subscriber channel 和 paused/running stream state，`pause` drop underlying stream，`resume` 按需重建。[E: codex-rs/tui/src/tui.rs:610][E: codex-rs/tui/src/tui.rs:612][E: codex-rs/tui/src/tui.rs:614][E: codex-rs/tui/src/tui.rs:619][E: codex-rs/tui/src/tui.rs:621][E: codex-rs/tui/src/tui.rs:626][E: codex-rs/tui/src/tui.rs:628][E: codex-rs/tui/src/tui.rs:630]

`handle_tui_event` 先为 event 解析 screen size；非 key/`Mouse`/paste/`FocusLost` 事件还会让 pending chord 过期并运行 pre-render reflow。physical key 在 overlay/composer 之前经过 `route_key_chord_event`：pending/cancelled 事件在此被吞掉，completed chord 改写成内部 dispatch key，再进入原有 handler。[E: codex-rs/tui/src/app.rs:832][E: codex-rs/tui/src/app.rs:882][E: codex-rs/tui/src/app.rs:885][E: codex-rs/tui/src/app.rs:917][E: codex-rs/tui/src/app/input.rs:51]

## Gotchas

- `AppEvent::CodexOp` 是内部转发路径，不代表 app-server notification；真正的 server notifications 先由 `app_server_events.rs` 处理，再进入 `ChatWidget::handle_server_notification`。[E: codex-rs/tui/src/app/app_server_events.rs:90][E: codex-rs/tui/src/chatwidget/protocol.rs:4]
- UI 退出默认应走 `ExitMode::ShutdownFirst`，`Immediate` 是 last-resort escape hatch，注释明确可能丢背景任务、rollout flush 或 child cleanup。[E: codex-rs/tui/src/app_event.rs:614][E: codex-rs/tui/src/app_event.rs:614][E: codex-rs/tui/src/app/event_dispatch.rs:3376]
- history lookup 与 async usage / thread-usage response 都带 request/log identity；接收方会丢弃 stale response，不能把 channel delivery 当作仍与当前 popup/search 对应。[I]
- startup select loop 会在 session header 或 queued protected request 未清空时挡住 terminal input；这不是 event broker pause。[E: codex-rs/tui/src/app/startup.rs:1096][E: codex-rs/tui/src/app/startup.rs:1154]

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
