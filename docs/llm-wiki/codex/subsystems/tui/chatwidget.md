---
id: subsys.tui.chatwidget
title: ChatWidget 状态机
kind: subsystem
tier: T2
source: [codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/constructor.rs, codex-rs/tui/src/chatwidget/protocol.rs, codex-rs/tui/src/chatwidget/input_flow.rs, codex-rs/tui/src/chatwidget/input_restore.rs, codex-rs/tui/src/chatwidget/input_submission.rs, codex-rs/tui/src/chatwidget/mcp_startup.rs, codex-rs/tui/src/chatwidget/rendering.rs, codex-rs/tui/src/chatwidget/streaming.rs, codex-rs/tui/src/chatwidget/safety_buffering.rs, codex-rs/tui/src/chatwidget/turn_lifecycle.rs, codex-rs/tui/src/chatwidget/input_queue.rs, codex-rs/tui/src/chatwidget/interaction.rs, codex-rs/tui/src/chatwidget/thread_usage.rs, codex-rs/tui/src/chatwidget/transcript_export.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/chatwidget/model_popup_state.rs, codex-rs/tui/src/chatwidget/backend_banners.rs, codex-rs/tui/src/chatwidget/rate_limits.rs, codex-rs/tui/src/chatwidget/permission_popups.rs, codex-rs/tui/src/chatwidget/permission_discovery.rs, codex-rs/tui/src/history_cell/messages.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/side.rs, codex-rs/tui/src/app/app_server_events.rs, codex-rs/tui/src/app/thread_routing.rs, codex-rs/tui/src/app/safety_buffering.rs]
symbols: [ChatWidget, ChatWidget::new_with_app_event, ChatWidget::handle_server_notification, ChatWidget::set_parent_owned_thread, ChatWidget::restore_startup_draft, SafetyBufferingState, App::retry_safety_buffered_turn, InputQueueState, TurnLifecycleState, ThreadUsageState, ChatWidget::on_models_loaded, ChatWidget::update_backend_banner]
related: [subsys.tui.architecture, subsys.tui.bottom-pane, subsys.tui.keymap, subsys.tui.streaming-pipeline, subsys.tui.rendering-theming, subsys.tui.status-surfaces, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `ChatWidget` 是聊天屏的 per-session UI 状态机：它反映 app-server protocol event stream、维护 transcript/streaming/bottom-pane/status 等状态，并把用户按键转换成 `Op` 或 `AppEvent`；它不运行 agent 本身。[E: codex-rs/tui/src/chatwidget.rs:559][E: codex-rs/tui/src/chatwidget/protocol.rs:4]

## 能回答的问题

- `ChatWidget` 当前拥有哪些状态，哪些逻辑已经拆到子模块？
- app-server notification 进入聊天 UI 后在哪里分发？
- composer submission 如何变成 user message、队列或 command？
- startup draft 怎样在 initialized composer 就绪后恢复？
- thread usage 和 `/export` 由谁发起？
- model picker 如何在不重开 overlay 的情况下刷新 catalog？
- rate-limit backend banner 与 threshold warning 谁优先？
- `/permissions` 何时拉 remote named profiles？

## 状态边界

结构体字段覆盖 `AppEventSender`、`CodexOpTarget`、`BottomPane`、`TranscriptState`、config/session header/account/model/rate-limit 状态、stream controllers、running commands、turn lifecycle、hook cell、thread id、input queue、`chat_keymap`、`permission_popup_request_id` 和 `ThreadUsageState`。[E: codex-rs/tui/src/chatwidget.rs:561][E: codex-rs/tui/src/chatwidget.rs:558][E: codex-rs/tui/src/chatwidget.rs:559][E: codex-rs/tui/src/chatwidget.rs:560][E: codex-rs/tui/src/chatwidget.rs:577][E: codex-rs/tui/src/chatwidget.rs:712][E: codex-rs/tui/src/chatwidget.rs:715][E: codex-rs/tui/src/chatwidget.rs:795]

构造入口 `new_with_app_event` 委托到 `new_with_op_target`；constructor 解包 `ChatWidgetInit`，从 config/model catalog 计算 collaboration mask、header model、service tier 和 keymap，再创建 `BottomPane`、`TranscriptState`、stream/chunking/turn lifecycle 等初始状态。[E: codex-rs/tui/src/chatwidget/constructor.rs:6][E: codex-rs/tui/src/chatwidget/constructor.rs:10][E: codex-rs/tui/src/chatwidget/constructor.rs:14][E: codex-rs/tui/src/chatwidget/constructor.rs:48][E: codex-rs/tui/src/chatwidget/constructor.rs:60][E: codex-rs/tui/src/chatwidget/constructor.rs:68][E: codex-rs/tui/src/chatwidget/constructor.rs:75]

## Protocol Notifications

`handle_server_notification` 是 app-server `ServerNotification` 到 chat state 的分发点；它先拒绝 misrouted child MCP status，再按 notification 类型更新 token/thread state、turn lifecycle、history item、agent/plan/reasoning delta、terminal interaction、command/file output、plan update、hook run 和错误显示。[E: codex-rs/tui/src/chatwidget/protocol.rs:4][E: codex-rs/tui/src/chatwidget/protocol.rs:10][E: codex-rs/tui/src/chatwidget/protocol.rs:34][E: codex-rs/tui/src/chatwidget/protocol.rs:62][E: codex-rs/tui/src/chatwidget/protocol.rs:82][E: codex-rs/tui/src/chatwidget/protocol.rs:85][E: codex-rs/tui/src/chatwidget/protocol.rs:95][E: codex-rs/tui/src/chatwidget/protocol.rs:124]

replay 期间 `thread_usage.replaying_turn_completion` 被置位，避免 resume 回放把历史 turn completion 当成新的 billing refresh 触发点。[E: codex-rs/tui/src/chatwidget/protocol.rs:18][E: codex-rs/tui/src/chatwidget/protocol.rs:19][E: codex-rs/tui/src/chatwidget/thread_usage.rs:80]

## Input Flow 与 Startup Draft

`handle_composer_input_result` 把 bottom pane 返回值解释成三类：提交 user message、排队 queued input、或者分发 slash/shell/inline command。[E: codex-rs/tui/src/chatwidget/input_flow.rs:15][E: codex-rs/tui/src/chatwidget/input_flow.rs:21]

parent-owned subagent thread 会设置 `blocks_direct_input` 并让 bottom pane 进入 parent-owned 状态；composer block result、queued autosend 和 programmatic user-message submission 都在 ChatWidget 边界被拒绝。[E: codex-rs/tui/src/chatwidget/input_flow.rs:10][E: codex-rs/tui/src/chatwidget/input_flow.rs:150]

队列不是无限 drain：`maybe_send_next_queued_input` 在用户 turn pending/running 时返回；plain message 分支一次只弹一个 follow-up，slash/shell 分支可以继续 loop 直到被阻断。[E: codex-rs/tui/src/chatwidget/input_flow.rs:141][E: codex-rs/tui/src/chatwidget/input_flow.rs:153][E: codex-rs/tui/src/chatwidget/input_flow.rs:162][E: codex-rs/tui/src/chatwidget/input_flow.rs:167][E: codex-rs/tui/src/chatwidget/input_flow.rs:211]

`is_user_turn_pending_or_running` 把 pending start、agent turn、review 和普通 task-running 视为阻塞，但 MCP startup 本身不再假装成 user turn。[E: codex-rs/tui/src/chatwidget/input_flow.rs:232][E: codex-rs/tui/src/chatwidget/input_flow.rs:236]

`InputQueueState` 单独保存 queued user messages/history records、rejected steers/history records、pending steers、pending-start flag、interrupt 后重提 steers 的 flag、autosend suppress，以及 rate-limit recovery hold。[E: codex-rs/tui/src/chatwidget/input_queue.rs:22][E: codex-rs/tui/src/chatwidget/input_queue.rs:24][E: codex-rs/tui/src/chatwidget/input_queue.rs:31][E: codex-rs/tui/src/chatwidget/input_queue.rs:40][E: codex-rs/tui/src/chatwidget/input_queue.rs:43][E: codex-rs/tui/src/chatwidget/input_queue.rs:44][E: codex-rs/tui/src/chatwidget/input_queue.rs:46]

startup 草稿由 `restore_startup_draft_when_ready` 接管：active view、expanded questions、pending approval、composer 尚未 enable，或 Windows elevated sandbox setup 未完成时都不移交。[E: codex-rs/tui/src/chatwidget/input_restore.rs:96][E: codex-rs/tui/src/chatwidget/input_restore.rs:100][E: codex-rs/tui/src/chatwidget/input_restore.rs:112]

## Thread usage 与 Transcript export

`ThreadUsageState` 缓存当前 thread 的 backend-estimated cost。status line / terminal title 选了 credits 或 estimated cost 时才会 request；`/status` 通过 `request_thread_usage_for_status` 把 `StatusHistoryHandle` 挂到同一条 refresh 上。turn 结束后按 15s/60s/120s 再结算，临时失败按 5s/15s/60s 重试。[E: codex-rs/tui/src/chatwidget.rs:795][E: codex-rs/tui/src/chatwidget/thread_usage.rs:20][E: codex-rs/tui/src/chatwidget/thread_usage.rs:25][E: codex-rs/tui/src/chatwidget/thread_usage.rs:38][E: codex-rs/tui/src/chatwidget/thread_usage.rs:80][E: codex-rs/tui/src/chatwidget/thread_usage.rs:145][E: codex-rs/tui/src/chatwidget/thread_usage.rs:371]

`/export` 无参数打开 clipboard/file picker；带路径则直接发 `AppEvent::ExportTranscript { File(...) }`。clipboard 路径在 Android 上禁用。[E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:737][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:740][E: codex-rs/tui/src/chatwidget/transcript_export.rs:23][E: codex-rs/tui/src/chatwidget/transcript_export.rs:32]

## Safety buffering retry

`ModelSafetyBufferingUpdatedNotification` 只对当前 running/last turn 生效。如果 server 提供 faster model、原始 submitted turn/prompt/thread 都还在且不是 side conversation，selection view 才暴露 retry；agent message 一旦开始就不再允许 retry。[E: codex-rs/tui/src/chatwidget/safety_buffering.rs:79][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:104][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:115]

app-level retry 会验证当前 active/primary thread，改写原 UserTurn 为 server-selected model + low effort，interrupt 原 turn、read thread、确认它仍是 latest completed fork point，再 fork 到该 turn 之前并提交重构的 inputs。[E: codex-rs/tui/src/app/safety_buffering.rs:24]

## Rendering 与 Streaming

`as_renderable` 把 transcript、active cell/hook cell、token/rate-limit warnings、bottom pane 等拼成当前 frame 的 renderable surface；这说明 ChatWidget 是 UI state aggregator，而不是 terminal backend。[E: codex-rs/tui/src/chatwidget/rendering.rs:122]

agent message deltas 进入 `on_agent_message_delta`；plan deltas 进入 `on_plan_delta`，后者会 lazily 创建 `PlanStreamController`，发送 `StartCommitAnimation` 并立即补一个 catch-up tick。[E: codex-rs/tui/src/chatwidget/streaming.rs:141][E: codex-rs/tui/src/chatwidget/streaming.rs:145]

## Model picker、permissions 与 rate-limit banners

`ChatWidget::on_models_loaded` 只接受当前 `model_popup_request_id` 的回复；空 catalog、obsolete request、或与现有 `model_catalog` 完全相同的列表直接丢掉。接受后重建 catalog 并 `refresh_model_dependent_surfaces`。打开中的 parent picker 由 `refresh_open_model_picker` 用 `replace_selection_view_if_present` 刷新。[E: codex-rs/tui/src/chatwidget/model_popup_state.rs:22][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:28][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:39][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:46][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:69]

`open_permissions_popup` 在 explicit named-profile mode、named menu 已打开、或当前 profile id 不以 `:` 开头时走 `request_permission_profiles`（可列出 remote named profiles）；否则走 legacy builtin presets。[E: codex-rs/tui/src/chatwidget/permission_popups.rs:17][E: codex-rs/tui/src/chatwidget/permission_discovery.rs:16]

`update_backend_banner` 从 account rate-limit 响应解析 banner。threshold warning 仍由 `RateLimitWarningState` 写入 history；90% 切模型 prompt 在已有 applicable backend banner 时不弹。[E: codex-rs/tui/src/chatwidget/backend_banners.rs:307][E: codex-rs/tui/src/chatwidget/rate_limits.rs:24][E: codex-rs/tui/src/chatwidget/rate_limits.rs:418]

## Gotchas

- Quit/interrupt 横跨 bottom pane 和 ChatWidget：bottom pane 决定 local Ctrl-C routing，ChatWidget 决定 interrupt、double-press quit shortcut 和 shutdown-first exit。[E: codex-rs/tui/src/bottom_pane/mod.rs:849][E: codex-rs/tui/src/chatwidget/interaction.rs:547]
- `ChatWidget` 里的 fields 很多，但许多行为入口已经拆到 `chatwidget/*`；更新行号时不要只搜 `chatwidget.rs` 单文件。[E: codex-rs/tui/src/chatwidget/protocol.rs:4]
- safety-buffered retry 不是在原 thread 原地重发：成功路径会 fork 并替换当前 widget thread，原 thread 保持可恢复。[E: codex-rs/tui/src/app/safety_buffering.rs:24]
- thread usage 是 demand-driven；没选 credits/cost item 且没打开 `/status` 时不会发 refresh。[E: codex-rs/tui/src/chatwidget/thread_usage.rs:371][E: codex-rs/tui/src/chatwidget/thread_usage.rs:145]

## Sources

- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/constructor.rs`
- `codex-rs/tui/src/chatwidget/protocol.rs`
- `codex-rs/tui/src/chatwidget/input_flow.rs`
- `codex-rs/tui/src/chatwidget/input_restore.rs`
- `codex-rs/tui/src/chatwidget/input_submission.rs`
- `codex-rs/tui/src/chatwidget/mcp_startup.rs`
- `codex-rs/tui/src/chatwidget/rendering.rs`
- `codex-rs/tui/src/chatwidget/streaming.rs`
- `codex-rs/tui/src/chatwidget/safety_buffering.rs`
- `codex-rs/tui/src/chatwidget/turn_lifecycle.rs`
- `codex-rs/tui/src/chatwidget/input_queue.rs`
- `codex-rs/tui/src/chatwidget/interaction.rs`
- `codex-rs/tui/src/chatwidget/thread_usage.rs`
- `codex-rs/tui/src/chatwidget/transcript_export.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`
- `codex-rs/tui/src/chatwidget/model_popup_state.rs`
- `codex-rs/tui/src/chatwidget/backend_banners.rs`
- `codex-rs/tui/src/chatwidget/rate_limits.rs`
- `codex-rs/tui/src/chatwidget/permission_popups.rs`
- `codex-rs/tui/src/chatwidget/permission_discovery.rs`
- `codex-rs/tui/src/history_cell/messages.rs`
- `codex-rs/tui/src/app/input.rs`
- `codex-rs/tui/src/app/side.rs`
- `codex-rs/tui/src/app/app_server_events.rs`
- `codex-rs/tui/src/app/thread_routing.rs`
- `codex-rs/tui/src/app/safety_buffering.rs`

## 相关

- `subsys.tui.streaming-pipeline`: stream controller、chunking 和 commit tick。
- `subsys.tui.bottom-pane`: composer/view stack 的输入来源。
- `subsys.tui.keymap`: side toggle 等 action 的 configurable single/chord bindings。
- `subsys.tui.rendering-theming`: history cell width 与 terminal rendering。
- `subsys.tui.status-surfaces`: `/status` card 如何嵌入 thread usage。
