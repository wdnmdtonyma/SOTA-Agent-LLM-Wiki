---
id: subsys.tui.event-system
title: 事件系统
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/app_event.rs
symbols:
  - AppEvent
  - AppEventSender
  - RateLimitRefreshOrigin
  - App::handle_event
  - TuiEvent
related:
  - subsys.tui.architecture
  - subsys.tui.chatwidget
  - subsys.tui.bottom-pane
  - subsys.app-server.message-processor
evidence: explicit
status: verified
updated: 37aadeaa13
---

TUI 事件系统以 `AppEvent` enum 作为 app-layer message bus，承载 `CodexOp`、thread-targeted op、session controls、history/commit-animation ticks、rate-limit refresh、settings mutations 和 realtime device/WebRTC events 等内部事件 [E: codex-rs/tui/src/app_event.rs:3][E: codex-rs/tui/src/app_event.rs:118][E: codex-rs/tui/src/app_event.rs:130][E: codex-rs/tui/src/app_event.rs:170][E: codex-rs/tui/src/app_event.rs:186][E: codex-rs/tui/src/app_event.rs:357][E: codex-rs/tui/src/app_event.rs:370][E: codex-rs/tui/src/app_event.rs:373][E: codex-rs/tui/src/app_event.rs:401][E: codex-rs/tui/src/app_event.rs:423]。

## 能回答的问题

- 哪些事件是 UI 内部事件，哪些事件会落到 app-server/core。
- 为什么 `AppEvent::Exit` 是显式变体，而不是从 channel close 推导退出。
- `AppEventSender` 为什么存在，以及它和 raw `UnboundedSender<AppEvent>` 的差别。
- approval、request user input、MCP elicitation、tool suggestion 这些 client-side 响应如何回到 thread。

## 职责边界

- `AppEvent` 表示 TUI 内部 action；源码注释明确把它描述为 “internal message bus” 且包含 app-layer actions，因此 `AppEvent` 不直接等价于 app-server protocol 是从职责边界得出的推断 [E: codex-rs/tui/src/app_event.rs:3][E: codex-rs/tui/src/app_event.rs:4][I]。
- `CodexOp(Op)` 是把 core `Op` 包进 TUI event 的桥接点；其他 UI-only action 如 `OpenAgentPicker`、`ClearUi`、`Exit` 不需要直接构造 core op [E: codex-rs/tui/src/app_event.rs:107][E: codex-rs/tui/src/app_event.rs:134][E: codex-rs/tui/src/app_event.rs:159][E: codex-rs/tui/src/app_event.rs:170][I]。
- `SubmitThreadOp` 把 `ThreadId` 和 `Op` 放在同一个事件里；approval/permission/patch/elicitation 这类 helper 会发送该事件，因此适合需要回写特定 thread 的 helper 是从字段与 helper 参数得出的推断 [E: codex-rs/tui/src/app_event.rs:118][E: codex-rs/tui/src/app_event.rs:119][E: codex-rs/tui/src/app_event.rs:120][E: codex-rs/tui/src/app_event_sender.rs:79][E: codex-rs/tui/src/app_event_sender.rs:82][E: codex-rs/tui/src/app_event_sender.rs:92][E: codex-rs/tui/src/app_event_sender.rs:95][E: codex-rs/tui/src/app_event_sender.rs:99][E: codex-rs/tui/src/app_event_sender.rs:102][E: codex-rs/tui/src/app_event_sender.rs:114][E: codex-rs/tui/src/app_event_sender.rs:117][I]。
- terminal input 不是 `AppEvent`；terminal input 先成为 `TuiEvent`，再由 `App::handle_tui_event` 进入 key/paste/draw 处理链 [E: codex-rs/tui/src/app.rs:1018][E: codex-rs/tui/src/app.rs:1086][E: codex-rs/tui/src/app.rs:1100][E: codex-rs/tui/src/app.rs:1102][E: codex-rs/tui/src/app.rs:1110][I]。

## 关键 crate/文件

- `codex-rs/tui/src/app_event.rs`: `AppEvent` 事件定义和 `RateLimitRefreshOrigin`。
- `codex-rs/tui/src/app_event_sender.rs`: typed helper，封装 send、logging、approval response helper 和 user input answer helper。
- `codex-rs/tui/src/app/event_dispatch.rs`: `App::handle_event` 的 exhaustive dispatcher。
- `codex-rs/tui/src/tui/event_stream.rs`: terminal event broker，把 crossterm event 和 draw subscription 映射成 `TuiEvent`。

## 数据模型

- `RateLimitRefreshOrigin` 当前只有 `StartupPrefetch` 与 `StatusCommand { request_id }` 两个来源；注释说明 startup prefetch 只更新 cached snapshots，而 status command 必须 finish 对应 status card refresh [E: codex-rs/tui/src/app_event.rs:90][E: codex-rs/tui/src/app_event.rs:92][E: codex-rs/tui/src/app_event.rs:95][E: codex-rs/tui/src/app_event.rs:97][E: codex-rs/tui/src/app_event.rs:100]。
- session/thread 类事件包括 `NewSession`、`ClearUiAndSubmitUserMessage`、`OpenResumePicker`、`ForkCurrentSession`、`SubmitThreadOp` 和 `ThreadHistoryEntryResponse` [E: codex-rs/tui/src/app_event.rs:130][E: codex-rs/tui/src/app_event.rs:140][E: codex-rs/tui/src/app_event.rs:145][E: codex-rs/tui/src/app_event.rs:151][E: codex-rs/tui/src/app_event.rs:118][E: codex-rs/tui/src/app_event.rs:124]。
- streaming/history 类事件包括 `InsertHistoryCell`、`ApplyThreadRollback`、`StartCommitAnimation`、`StopCommitAnimation` 和 `CommitTick` [E: codex-rs/tui/src/app_event.rs:357][E: codex-rs/tui/src/app_event.rs:364][E: codex-rs/tui/src/app_event.rs:368][E: codex-rs/tui/src/app_event.rs:369][E: codex-rs/tui/src/app_event.rs:370]。
- settings 类事件例如包括 `UpdateReasoningEffort`、`UpdateModel`、`UpdateCollaborationMode`、`UpdatePersonality`、`PersistModelSelection`、`PersistPersonalitySelection` 和 `PersistServiceTierSelection` [E: codex-rs/tui/src/app_event.rs:373][E: codex-rs/tui/src/app_event.rs:376][E: codex-rs/tui/src/app_event.rs:379][E: codex-rs/tui/src/app_event.rs:382][E: codex-rs/tui/src/app_event.rs:385][E: codex-rs/tui/src/app_event.rs:391][E: codex-rs/tui/src/app_event.rs:396]。
- realtime 类事件当前围绕 audio device selection 和 TUI-owned WebRTC session：`OpenRealtimeAudioDeviceSelection`、`PersistRealtimeAudioDeviceSelection`、`RestartRealtimeAudioDevice`、`RealtimeWebrtcOfferCreated`、`RealtimeWebrtcEvent` 和 `RealtimeWebrtcLocalAudioLevel` [E: codex-rs/tui/src/app_event.rs:401][E: codex-rs/tui/src/app_event.rs:407][E: codex-rs/tui/src/app_event.rs:413][E: codex-rs/tui/src/app_event.rs:418][E: codex-rs/tui/src/app_event.rs:423][E: codex-rs/tui/src/app_event.rs:426]。

## 控制流

1. producer 侧通过 `AppEventSender::send` 把 `AppEvent` 放入 unbounded channel；该 wrapper 对非 `CodexOp` 事件记录 inbound log 并在 send 失败时记录错误 [E: codex-rs/tui/src/app_event_sender.rs:27][E: codex-rs/tui/src/app_event_sender.rs:29][E: codex-rs/tui/src/app_event_sender.rs:32][E: codex-rs/tui/src/app_event_sender.rs:33][E: codex-rs/tui/src/app_event_sender.rs:35][E: codex-rs/tui/src/app_event_sender.rs:36]。
2. `App::run` main loop 在 `app_event_rx.recv()` 分支收到事件，然后调用 `app.handle_event(tui, &mut app_server, event).await` [E: codex-rs/tui/src/app.rs:993][E: codex-rs/tui/src/app.rs:994]。
3. `App::handle_event` 对 `AppEvent` 做 exhaustive match；例如 `ClearUi` 会调用 `clear_terminal_ui(...)` 和 `reset_app_ui_state_after_clear()`，后者清 `overlay`、`transcript_cells`、`deferred_history_lines` 和 backtrack state [E: codex-rs/tui/src/app/event_dispatch.rs:9][E: codex-rs/tui/src/app/event_dispatch.rs:15][E: codex-rs/tui/src/app/event_dispatch.rs:23][E: codex-rs/tui/src/app/event_dispatch.rs:24][E: codex-rs/tui/src/app/event_dispatch.rs:25][E: codex-rs/tui/src/app/history_ui.rs:86][E: codex-rs/tui/src/app/history_ui.rs:87][E: codex-rs/tui/src/app/history_ui.rs:88][E: codex-rs/tui/src/app/history_ui.rs:90][E: codex-rs/tui/src/app/history_ui.rs:91]。
4. approval helper 通过 `SubmitThreadOp` 回写特定 thread，比如 `exec_approval` 构造 `AppEvent::SubmitThreadOp { thread_id, op }` [E: codex-rs/tui/src/app_event_sender.rs:79][E: codex-rs/tui/src/app_event_sender.rs:80][E: codex-rs/tui/src/app_event_sender.rs:82]。
5. `CodexOp(op)` 在 dispatcher 中调用 `submit_active_thread_op(app_server, op.into())`；从 TUI intent 进入 active thread app-server/core path 是从 helper 名称和 `app_server` 参数得出的推断 [E: codex-rs/tui/src/app/event_dispatch.rs:250][E: codex-rs/tui/src/app/event_dispatch.rs:251][I]。
6. commit animation 事件在 dispatcher 中以 atomic flag 防重入，后台线程按 `COMMIT_ANIMATION_TICK` 睡眠并发送 `CommitTick`，`CommitTick` 再调用 `chat_widget.on_commit_tick()` [E: codex-rs/tui/src/app/event_dispatch.rs:210][E: codex-rs/tui/src/app/event_dispatch.rs:211][E: codex-rs/tui/src/app/event_dispatch.rs:213][E: codex-rs/tui/src/app/event_dispatch.rs:220][E: codex-rs/tui/src/app/event_dispatch.rs:221][E: codex-rs/tui/src/app/event_dispatch.rs:230]。

## 设计动机与权衡

- `AppEvent` 把 UI intent 与 terminal event 拆开，使 UI action 可以来自 keybinding、background task、overlay、dialog 或 app-server notification，而不必伪装成 keyboard input [I]。
- approval/permission/patch/elicitation response helper 被建模为 `SubmitThreadOp`，因为这些 helper 需要带上目标 `ThreadId` 是从 helper signatures 与 `SubmitThreadOp` 字段得出的推断；`user_input_answer` 走 `CodexOp(AppCommand::user_input_answer(...).into_core())`，不走 `SubmitThreadOp` [E: codex-rs/tui/src/app_event.rs:118][E: codex-rs/tui/src/app_event.rs:119][E: codex-rs/tui/src/app_event_sender.rs:73][E: codex-rs/tui/src/app_event_sender.rs:75][E: codex-rs/tui/src/app_event_sender.rs:79][E: codex-rs/tui/src/app_event_sender.rs:82][E: codex-rs/tui/src/app_event_sender.rs:86][E: codex-rs/tui/src/app_event_sender.rs:95][E: codex-rs/tui/src/app_event_sender.rs:98][E: codex-rs/tui/src/app_event_sender.rs:102][E: codex-rs/tui/src/app_event_sender.rs:105][E: codex-rs/tui/src/app_event_sender.rs:117][I]。
- `AppEventSender` 把常见 op 封装成 helper；“降低 overlay/bottom pane 直接拼 `Op` 的重复”是从 dedicated helper 分布得出的设计推断，源码中 exec approval、patch approval、permissions response、elicitation resolve 都有 dedicated helper [E: codex-rs/tui/src/app_event_sender.rs:79][E: codex-rs/tui/src/app_event_sender.rs:86][E: codex-rs/tui/src/app_event_sender.rs:98][E: codex-rs/tui/src/app_event_sender.rs:105][I]。

## gotcha

- `Exit` 是 `AppEvent::Exit(ExitMode)`，源码注释强调退出应显式 request；“不能靠 channel close 表达退出语义”是从显式 `Exit` 变体和注释措辞得出的事件模型推断 [E: codex-rs/tui/src/app_event.rs:8][E: codex-rs/tui/src/app_event.rs:159][I]。
- `AppEventSender::send` 对 `CodexOp` 跳过 inbound logging，这会影响调试日志中看到的事件分布 [E: codex-rs/tui/src/app_event_sender.rs:32][E: codex-rs/tui/src/app_event_sender.rs:33][I]。
- `ThreadHistoryEntryResponse` 是 deliver synthetic history lookup response to a specific thread channel，`InsertHistoryCell` 由 dispatcher 直接 push 到 transcript 并插入 rendered history lines；排查历史重复时需要区分 thread-channel lookup response 与直接 history-cell insertion [E: codex-rs/tui/src/app_event.rs:124][E: codex-rs/tui/src/app_event.rs:357][E: codex-rs/tui/src/app/event_dispatch.rs:179][E: codex-rs/tui/src/app/event_dispatch.rs:185][E: codex-rs/tui/src/app/event_dispatch.rs:201][I]。

## Sources

- `codex-rs/tui/src/app_event.rs`

## 相关

- `subsys.tui.architecture`
- `subsys.tui.chatwidget`
- `subsys.tui.bottom-pane`
- `subsys.app-server.message-processor`
