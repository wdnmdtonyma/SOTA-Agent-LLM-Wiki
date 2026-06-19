---
id: subsys.tui.chatwidget
title: ChatWidget 状态机
kind: subsystem
tier: T2
source: [codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/constructor.rs, codex-rs/tui/src/chatwidget/protocol.rs, codex-rs/tui/src/chatwidget/input_flow.rs, codex-rs/tui/src/chatwidget/input_submission.rs, codex-rs/tui/src/chatwidget/rendering.rs, codex-rs/tui/src/chatwidget/streaming.rs, codex-rs/tui/src/chatwidget/turn_lifecycle.rs, codex-rs/tui/src/chatwidget/input_queue.rs]
symbols: [ChatWidget, ChatWidget::new_with_app_event, ChatWidget::handle_server_notification, InputQueueState, TurnLifecycleState, StreamController, PlanStreamController]
related: [subsys.tui.architecture, subsys.tui.bottom-pane, subsys.tui.streaming-pipeline, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 5670360009
---

> `ChatWidget` 是聊天屏的 per-session UI 状态机：它反映 app-server protocol event stream、维护 transcript/streaming/bottom-pane/status 等状态，并把用户按键转换成 `Op` 或 `AppEvent`；它不运行 agent 本身。[E: codex-rs/tui/src/chatwidget.rs:514][E: codex-rs/tui/src/chatwidget.rs:516][E: codex-rs/tui/src/chatwidget.rs:517][E: codex-rs/tui/src/chatwidget.rs:518][E: codex-rs/tui/src/chatwidget.rs:520]

## 能回答的问题

- `ChatWidget` 当前拥有哪些状态，哪些逻辑已经拆到子模块？
- app-server notification 进入聊天 UI 后在哪里分发？
- composer submission 如何变成 user message、队列或 command？
- live streaming、turn lifecycle 和 rendering surface 的边界在哪里？

## 状态边界

结构体字段覆盖 `AppEventSender`、`CodexOpTarget`、`BottomPane`、`TranscriptState`、config/session header/account/model/rate-limit 状态、stream controllers、running commands、turn lifecycle、hook cell、thread id、input queue、keymap、rollout path 和 cwd。[E: codex-rs/tui/src/chatwidget.rs:526][E: codex-rs/tui/src/chatwidget.rs:527][E: codex-rs/tui/src/chatwidget.rs:528][E: codex-rs/tui/src/chatwidget.rs:529][E: codex-rs/tui/src/chatwidget.rs:530][E: codex-rs/tui/src/chatwidget.rs:531][E: codex-rs/tui/src/chatwidget.rs:545][E: codex-rs/tui/src/chatwidget.rs:551][E: codex-rs/tui/src/chatwidget.rs:568][E: codex-rs/tui/src/chatwidget.rs:570][E: codex-rs/tui/src/chatwidget.rs:572][E: codex-rs/tui/src/chatwidget.rs:577][E: codex-rs/tui/src/chatwidget.rs:585][E: codex-rs/tui/src/chatwidget.rs:625][E: codex-rs/tui/src/chatwidget.rs:635][E: codex-rs/tui/src/chatwidget.rs:660][E: codex-rs/tui/src/chatwidget.rs:663][E: codex-rs/tui/src/chatwidget.rs:684][E: codex-rs/tui/src/chatwidget.rs:686]

构造入口 `new_with_app_event` 委托到 `new_with_op_target`；constructor 解包 `ChatWidgetInit`，从 config/model catalog 计算 collaboration mask、header model、service tier 和 keymap，再创建 `BottomPane`、`TranscriptState`、stream/chunking/turn lifecycle 等初始状态。[E: codex-rs/tui/src/chatwidget/constructor.rs:5][E: codex-rs/tui/src/chatwidget/constructor.rs:6][E: codex-rs/tui/src/chatwidget/constructor.rs:10][E: codex-rs/tui/src/chatwidget/constructor.rs:14][E: codex-rs/tui/src/chatwidget/constructor.rs:48][E: codex-rs/tui/src/chatwidget/constructor.rs:59][E: codex-rs/tui/src/chatwidget/constructor.rs:65][E: codex-rs/tui/src/chatwidget/constructor.rs:68][E: codex-rs/tui/src/chatwidget/constructor.rs:80][E: codex-rs/tui/src/chatwidget/constructor.rs:94][E: codex-rs/tui/src/chatwidget/constructor.rs:98][E: codex-rs/tui/src/chatwidget/constructor.rs:108][E: codex-rs/tui/src/chatwidget/constructor.rs:143][E: codex-rs/tui/src/chatwidget/constructor.rs:155]

## Protocol Notifications

`handle_server_notification` 是 app-server `ServerNotification` 到 chat state 的分发点；它先拒绝 misrouted child MCP status，再按 notification 类型更新 token/thread state、turn lifecycle、history item、agent/plan/reasoning delta、terminal interaction、command/file output、plan update、hook run 和错误显示。[E: codex-rs/tui/src/chatwidget/protocol.rs:4][E: codex-rs/tui/src/chatwidget/protocol.rs:9][E: codex-rs/tui/src/chatwidget/protocol.rs:10][E: codex-rs/tui/src/chatwidget/protocol.rs:13][E: codex-rs/tui/src/chatwidget/protocol.rs:31][E: codex-rs/tui/src/chatwidget/protocol.rs:60][E: codex-rs/tui/src/chatwidget/protocol.rs:67][E: codex-rs/tui/src/chatwidget/protocol.rs:70][E: codex-rs/tui/src/chatwidget/protocol.rs:76][E: codex-rs/tui/src/chatwidget/protocol.rs:79][E: codex-rs/tui/src/chatwidget/protocol.rs:80][E: codex-rs/tui/src/chatwidget/protocol.rs:89][E: codex-rs/tui/src/chatwidget/protocol.rs:92][E: codex-rs/tui/src/chatwidget/protocol.rs:101][E: codex-rs/tui/src/chatwidget/protocol.rs:118][E: codex-rs/tui/src/chatwidget/protocol.rs:124]

turn lifecycle 是单独状态对象：`TurnLifecycleState` 保存 prevent-idle-sleep guard 和 last turn id，提供 start/finish/restore/reset 边界。[E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:9][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:10][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:12][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:29][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:35][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:40][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:48]

## Input Flow

`handle_composer_input_result` 把 bottom pane 返回值解释成三类：提交 user message、排队 queued input、或者分发 slash/shell/inline command；modal 消失后会尝试 drain 队列。[E: codex-rs/tui/src/chatwidget/input_flow.rs:9][E: codex-rs/tui/src/chatwidget/input_flow.rs:15][E: codex-rs/tui/src/chatwidget/input_flow.rs:31][E: codex-rs/tui/src/chatwidget/input_flow.rs:46][E: codex-rs/tui/src/chatwidget/input_flow.rs:55][E: codex-rs/tui/src/chatwidget/input_flow.rs:66]

队列不是无限 drain：`maybe_send_next_queued_input` 在用户 turn pending/running 时返回；plain message 分支一次只弹一个 follow-up，slash/shell 分支可以继续 loop 直到被阻断。[E: codex-rs/tui/src/chatwidget/input_flow.rs:105][E: codex-rs/tui/src/chatwidget/input_flow.rs:106][E: codex-rs/tui/src/chatwidget/input_flow.rs:113][E: codex-rs/tui/src/chatwidget/input_flow.rs:121][E: codex-rs/tui/src/chatwidget/input_flow.rs:123][E: codex-rs/tui/src/chatwidget/input_flow.rs:129][E: codex-rs/tui/src/chatwidget/input_flow.rs:139]

submission 层负责把 composer submission 转成 `UserMessage`，处理 shell prompt escaping、queued shell prompt、history persistence、image/text `UserInput` 和 skill mentions/bindings。[E: codex-rs/tui/src/chatwidget/input_submission.rs:5][E: codex-rs/tui/src/chatwidget/input_submission.rs:24][E: codex-rs/tui/src/chatwidget/input_submission.rs:52][E: codex-rs/tui/src/chatwidget/input_submission.rs:65][E: codex-rs/tui/src/chatwidget/input_submission.rs:98][E: codex-rs/tui/src/chatwidget/input_submission.rs:164][E: codex-rs/tui/src/chatwidget/input_submission.rs:194]

`InputQueueState` 单独保存 queued user messages/history records、rejected steers/history records、pending steers、pending-start flag 和 autosend/interrupt flags；preview builder 从这些队列临时生成 bottom-pane preview rows，cancel/edit state 另在 `ChatWidget.cancel_edit` 的 `CancelEditState`。[E: codex-rs/tui/src/chatwidget/input_queue.rs:22][E: codex-rs/tui/src/chatwidget/input_queue.rs:24][E: codex-rs/tui/src/chatwidget/input_queue.rs:29][E: codex-rs/tui/src/chatwidget/input_queue.rs:31][E: codex-rs/tui/src/chatwidget/input_queue.rs:33][E: codex-rs/tui/src/chatwidget/input_queue.rs:38][E: codex-rs/tui/src/chatwidget/input_queue.rs:40][E: codex-rs/tui/src/chatwidget/input_queue.rs:43][E: codex-rs/tui/src/chatwidget/input_queue.rs:44][E: codex-rs/tui/src/chatwidget/input_queue.rs:62][E: codex-rs/tui/src/chatwidget/input_queue.rs:90][E: codex-rs/tui/src/chatwidget.rs:660][E: codex-rs/tui/src/chatwidget.rs:661][E: codex-rs/tui/src/chatwidget.rs:775]

## Rendering 与 Streaming

`as_renderable` 把 transcript、active cell/hook cell、token/rate-limit warnings、bottom pane 等拼成当前 frame 的 renderable surface；这说明 ChatWidget 是 UI state aggregator，而不是 terminal backend。[E: codex-rs/tui/src/chatwidget/rendering.rs:5][E: codex-rs/tui/src/chatwidget/rendering.rs:6][E: codex-rs/tui/src/chatwidget/rendering.rs:17][E: codex-rs/tui/src/chatwidget/rendering.rs:28][E: codex-rs/tui/src/chatwidget/rendering.rs:36][E: codex-rs/tui/src/chatwidget/rendering.rs:47][E: codex-rs/tui/src/chatwidget/rendering.rs:59]

agent message deltas 进入 `on_agent_message_delta`；plan deltas 进入 `on_plan_delta`，后者会 lazily 创建 `PlanStreamController`，发送 `StartCommitAnimation` 并立即补一个 catch-up tick。[E: codex-rs/tui/src/chatwidget/streaming.rs:111][E: codex-rs/tui/src/chatwidget/streaming.rs:115][E: codex-rs/tui/src/chatwidget/streaming.rs:131][E: codex-rs/tui/src/chatwidget/streaming.rs:137][E: codex-rs/tui/src/chatwidget/streaming.rs:142]

## Gotchas

- Quit/interrupt 横跨 bottom pane 和 ChatWidget：bottom pane 决定 local Ctrl-C routing，ChatWidget 决定 interrupt、double-press quit shortcut 和 shutdown-first exit。[E: codex-rs/tui/src/chatwidget.rs:523][E: codex-rs/tui/src/chatwidget.rs:524][E: codex-rs/tui/src/chatwidget.rs:525]
- `ChatWidget` 里的 fields 很多，但许多行为入口已经拆到 `chatwidget/*`；更新行号时不要只搜 `chatwidget.rs` 单文件。[E: codex-rs/tui/src/chatwidget/constructor.rs:1][E: codex-rs/tui/src/chatwidget/protocol.rs:1][E: codex-rs/tui/src/chatwidget/input_flow.rs:1][E: codex-rs/tui/src/chatwidget/streaming.rs:1]

## Sources

- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/constructor.rs`
- `codex-rs/tui/src/chatwidget/protocol.rs`
- `codex-rs/tui/src/chatwidget/input_flow.rs`
- `codex-rs/tui/src/chatwidget/input_submission.rs`
- `codex-rs/tui/src/chatwidget/rendering.rs`
- `codex-rs/tui/src/chatwidget/streaming.rs`
- `codex-rs/tui/src/chatwidget/turn_lifecycle.rs`
- `codex-rs/tui/src/chatwidget/input_queue.rs`

## 相关

- `subsys.tui.streaming-pipeline`: stream controller、chunking 和 commit tick。
- `subsys.tui.bottom-pane`: composer/view stack 的输入来源。
