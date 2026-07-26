---
id: subsys.tui.chatwidget
title: ChatWidget 状态机
kind: subsystem
tier: T2
source: [codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/constructor.rs, codex-rs/tui/src/chatwidget/protocol.rs, codex-rs/tui/src/chatwidget/input_flow.rs, codex-rs/tui/src/chatwidget/input_submission.rs, codex-rs/tui/src/chatwidget/rendering.rs, codex-rs/tui/src/chatwidget/streaming.rs, codex-rs/tui/src/chatwidget/safety_buffering.rs, codex-rs/tui/src/chatwidget/turn_lifecycle.rs, codex-rs/tui/src/chatwidget/input_queue.rs, codex-rs/tui/src/chatwidget/interaction.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/side.rs, codex-rs/tui/src/app/safety_buffering.rs]
symbols: [ChatWidget, ChatWidget::new_with_app_event, ChatWidget::handle_server_notification, ChatWidget::set_parent_owned_thread, SafetyBufferingState, App::retry_safety_buffered_turn, InputQueueState, TurnLifecycleState]
related: [subsys.tui.architecture, subsys.tui.bottom-pane, subsys.tui.streaming-pipeline, subsys.app-server.session-management]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `ChatWidget` 是聊天屏的 per-session UI 状态机：它反映 app-server protocol event stream、维护 transcript/streaming/bottom-pane/status 等状态，并把用户按键转换成 `Op` 或 `AppEvent`；它不运行 agent 本身。[I]

## 能回答的问题

- `ChatWidget` 当前拥有哪些状态，哪些逻辑已经拆到子模块？
- app-server notification 进入聊天 UI 后在哪里分发？
- composer submission 如何变成 user message、队列或 command？
- live streaming、turn lifecycle 和 rendering surface 的边界在哪里？

## 状态边界

结构体字段覆盖 `AppEventSender`、`CodexOpTarget`、`BottomPane`、`TranscriptState`、config/session header/account/model/rate-limit 状态、stream controllers、running commands、turn lifecycle、hook cell、thread id、input queue、keymap、rollout path 和 cwd。[E: codex-rs/tui/src/chatwidget.rs:533][E: codex-rs/tui/src/chatwidget.rs:534][E: codex-rs/tui/src/chatwidget.rs:535][E: codex-rs/tui/src/chatwidget.rs:536][E: codex-rs/tui/src/chatwidget.rs:537][E: codex-rs/tui/src/chatwidget.rs:538][E: codex-rs/tui/src/chatwidget.rs:552][E: codex-rs/tui/src/chatwidget.rs:558][E: codex-rs/tui/src/chatwidget.rs:579][E: codex-rs/tui/src/chatwidget.rs:581][E: codex-rs/tui/src/chatwidget.rs:583][E: codex-rs/tui/src/chatwidget.rs:588][E: codex-rs/tui/src/chatwidget.rs:596][E: codex-rs/tui/src/chatwidget.rs:639][E: codex-rs/tui/src/chatwidget.rs:649][E: codex-rs/tui/src/chatwidget.rs:675][E: codex-rs/tui/src/chatwidget.rs:678][E: codex-rs/tui/src/chatwidget.rs:699][E: codex-rs/tui/src/chatwidget.rs:701]

构造入口 `new_with_app_event` 委托到 `new_with_op_target`；constructor 解包 `ChatWidgetInit`，从 config/model catalog 计算 collaboration mask、header model、service tier 和 keymap，再创建 `BottomPane`、`TranscriptState`、stream/chunking/turn lifecycle 等初始状态。[E: codex-rs/tui/src/chatwidget/constructor.rs:5][E: codex-rs/tui/src/chatwidget/constructor.rs:6][E: codex-rs/tui/src/chatwidget/constructor.rs:10][E: codex-rs/tui/src/chatwidget/constructor.rs:14][E: codex-rs/tui/src/chatwidget/constructor.rs:48][E: codex-rs/tui/src/chatwidget/constructor.rs:65][E: codex-rs/tui/src/chatwidget/constructor.rs:68][E: codex-rs/tui/src/chatwidget/constructor.rs:80][E: codex-rs/tui/src/chatwidget/constructor.rs:94][E: codex-rs/tui/src/chatwidget/constructor.rs:98][E: codex-rs/tui/src/chatwidget/constructor.rs:108][E: codex-rs/tui/src/chatwidget/constructor.rs:147][E: codex-rs/tui/src/chatwidget/constructor.rs:159]

## Protocol Notifications

`handle_server_notification` 是 app-server `ServerNotification` 到 chat state 的分发点；它先拒绝 misrouted child MCP status，再按 notification 类型更新 token/thread state、turn lifecycle、history item、agent/plan/reasoning delta、terminal interaction、command/file output、plan update、hook run 和错误显示。[E: codex-rs/tui/src/chatwidget/protocol.rs:4][E: codex-rs/tui/src/chatwidget/protocol.rs:10][E: codex-rs/tui/src/chatwidget/protocol.rs:13][E: codex-rs/tui/src/chatwidget/protocol.rs:31][E: codex-rs/tui/src/chatwidget/protocol.rs:60][E: codex-rs/tui/src/chatwidget/protocol.rs:67][E: codex-rs/tui/src/chatwidget/protocol.rs:70][E: codex-rs/tui/src/chatwidget/protocol.rs:76][E: codex-rs/tui/src/chatwidget/protocol.rs:79][E: codex-rs/tui/src/chatwidget/protocol.rs:80][E: codex-rs/tui/src/chatwidget/protocol.rs:89][E: codex-rs/tui/src/chatwidget/protocol.rs:92][E: codex-rs/tui/src/chatwidget/protocol.rs:101][E: codex-rs/tui/src/chatwidget/protocol.rs:118][E: codex-rs/tui/src/chatwidget/protocol.rs:124]

turn lifecycle 是单独状态对象：`TurnLifecycleState` 保存 prevent-idle-sleep guard 和 last turn id，提供 start/finish/restore/reset 边界。[E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:9][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:10][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:12][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:29][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:35][E: codex-rs/tui/src/chatwidget/turn_lifecycle.rs:48]

## Input Flow

`handle_composer_input_result` 把 bottom pane 返回值解释成三类：提交 user message、排队 queued input、或者分发 slash/shell/inline command；modal 消失后会尝试 drain 队列。[E: codex-rs/tui/src/chatwidget/input_flow.rs:9][E: codex-rs/tui/src/chatwidget/input_flow.rs:20][E: codex-rs/tui/src/chatwidget/input_flow.rs:37][E: codex-rs/tui/src/chatwidget/input_flow.rs:53][E: codex-rs/tui/src/chatwidget/input_flow.rs:62][E: codex-rs/tui/src/chatwidget/input_flow.rs:76]

parent-owned subagent thread 会设置 `blocks_direct_input` 并让 bottom pane 进入 parent-owned 状态；composer submit、programmatic UserTurn/Review/Compact 和 queued autosend 都被拒绝，统一显示“controlled by its parent”，但 thread event/replay 仍可继续渲染。[E: codex-rs/tui/src/chatwidget/input_flow.rs:9][E: codex-rs/tui/src/chatwidget/input_flow.rs:71][E: codex-rs/tui/src/chatwidget/input_flow.rs:199]

队列不是无限 drain：`maybe_send_next_queued_input` 在用户 turn pending/running 时返回；plain message 分支一次只弹一个 follow-up，slash/shell 分支可以继续 loop 直到被阻断。[E: codex-rs/tui/src/chatwidget/input_flow.rs:132][E: codex-rs/tui/src/chatwidget/input_flow.rs:139][E: codex-rs/tui/src/chatwidget/input_flow.rs:143][E: codex-rs/tui/src/chatwidget/input_flow.rs:151][E: codex-rs/tui/src/chatwidget/input_flow.rs:153][E: codex-rs/tui/src/chatwidget/input_flow.rs:159][E: codex-rs/tui/src/chatwidget/input_flow.rs:166]

submission 层负责把 composer submission 转成 `UserMessage`，处理 shell prompt escaping、queued shell prompt、history persistence、image/text `UserInput` 和 skill mentions/bindings。[E: codex-rs/tui/src/chatwidget/input_submission.rs:5][E: codex-rs/tui/src/chatwidget/input_submission.rs:24][E: codex-rs/tui/src/chatwidget/input_submission.rs:52][E: codex-rs/tui/src/chatwidget/input_submission.rs:65][E: codex-rs/tui/src/chatwidget/input_submission.rs:98][E: codex-rs/tui/src/chatwidget/input_submission.rs:164][E: codex-rs/tui/src/chatwidget/input_submission.rs:194]

`InputQueueState` 单独保存 queued user messages/history records、rejected steers/history records、pending steers、pending-start flag 和 autosend/interrupt flags；preview builder 从这些队列生成 bottom-pane preview。旧 `CancelEditState` 已删除，最近提交 prompt 由 `safety_buffering_prompt` 保留，供 safety retry 的失败恢复/分支重放使用。[E: codex-rs/tui/src/chatwidget/input_queue.rs:22][E: codex-rs/tui/src/chatwidget/input_queue.rs:29][E: codex-rs/tui/src/chatwidget/input_queue.rs:38][E: codex-rs/tui/src/chatwidget/input_queue.rs:62][E: codex-rs/tui/src/chatwidget.rs:670][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:66]

side conversation 不再只是一次性 modal 状态：`App` 保存 side-thread 到 parent-thread 的映射，按 keymap（默认 `Ctrl-/`，也兼容 `Ctrl-7` 键位事件）在两个已存在的 thread 之间重新选择；切回不会关闭另一侧，关闭仍由单独的 discard 路径负责。[E: codex-rs/tui/src/app/side.rs:204][E: codex-rs/tui/src/app/side.rs:205][E: codex-rs/tui/src/app/input.rs:145][E: codex-rs/tui/src/app/input.rs:151][E: codex-rs/tui/src/app/side.rs:384][E: codex-rs/tui/src/app/side.rs:395][E: codex-rs/tui/src/app/side.rs:403][E: codex-rs/tui/src/app/side.rs:407]

## Safety buffering retry

`ModelSafetyBufferingUpdatedNotification` 只对当前 running/last turn 生效；等待期间 status 显示 safety detail。如果 server 提供 faster model、原始 submitted turn/prompt/thread 都还在且不是 side conversation，selection view 才暴露 retry；agent message 一旦开始就不再允许 retry。[E: codex-rs/tui/src/chatwidget/safety_buffering.rs:82][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:93][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:114][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:127][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:140][E: codex-rs/tui/src/chatwidget/safety_buffering.rs:176]

app-level retry 会验证当前 active/primary thread，改写原 UserTurn 为 server-selected model + low effort，interrupt 原 turn、read thread、确认它仍是 latest completed fork point，再 fork 到该 turn 之前并提交重构的 inputs；任一 read/fork/attach/submit 失败都恢复 captured input state 和 prompt 到 composer。[E: codex-rs/tui/src/app/safety_buffering.rs:28][E: codex-rs/tui/src/app/safety_buffering.rs:42][E: codex-rs/tui/src/app/safety_buffering.rs:61][E: codex-rs/tui/src/app/safety_buffering.rs:86][E: codex-rs/tui/src/app/safety_buffering.rs:97][E: codex-rs/tui/src/app/safety_buffering.rs:132][E: codex-rs/tui/src/app/safety_buffering.rs:183]

## Rendering 与 Streaming

`as_renderable` 把 transcript、active cell/hook cell、token/rate-limit warnings、bottom pane 等拼成当前 frame 的 renderable surface；这说明 ChatWidget 是 UI state aggregator，而不是 terminal backend。[E: codex-rs/tui/src/chatwidget/rendering.rs:5][E: codex-rs/tui/src/chatwidget/rendering.rs:6][E: codex-rs/tui/src/chatwidget/rendering.rs:17][E: codex-rs/tui/src/chatwidget/rendering.rs:28][E: codex-rs/tui/src/chatwidget/rendering.rs:57]

agent message deltas 进入 `on_agent_message_delta`；plan deltas 进入 `on_plan_delta`，后者会 lazily 创建 `PlanStreamController`，发送 `StartCommitAnimation` 并立即补一个 catch-up tick。[E: codex-rs/tui/src/chatwidget/streaming.rs:141][E: codex-rs/tui/src/chatwidget/streaming.rs:145][E: codex-rs/tui/src/chatwidget/streaming.rs:158][E: codex-rs/tui/src/chatwidget/streaming.rs:164]

## Gotchas

- Quit/interrupt 横跨 bottom pane 和 ChatWidget：bottom pane 决定 local Ctrl-C routing，ChatWidget 决定 interrupt、double-press quit shortcut 和 shutdown-first exit。[E: codex-rs/tui/src/bottom_pane/mod.rs:705][E: codex-rs/tui/src/chatwidget/interaction.rs:364][E: codex-rs/tui/src/chatwidget/interaction.rs:406][E: codex-rs/tui/src/chatwidget/interaction.rs:409][E: codex-rs/tui/src/chatwidget/interaction.rs:464][E: codex-rs/tui/src/chatwidget.rs:1334][E: codex-rs/tui/src/chatwidget.rs:1336]
- `ChatWidget` 里的 fields 很多，但许多行为入口已经拆到 `chatwidget/*`；更新行号时不要只搜 `chatwidget.rs` 单文件。[E: codex-rs/tui/src/chatwidget/protocol.rs:1]
- safety-buffered retry 不是在原 thread 原地重发：成功路径会 fork 并替换当前 widget thread，原 thread 保持可恢复。[E: codex-rs/tui/src/app/safety_buffering.rs:132]

## Sources

- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/constructor.rs`
- `codex-rs/tui/src/chatwidget/protocol.rs`
- `codex-rs/tui/src/chatwidget/input_flow.rs`
- `codex-rs/tui/src/chatwidget/input_submission.rs`
- `codex-rs/tui/src/chatwidget/rendering.rs`
- `codex-rs/tui/src/chatwidget/streaming.rs`
- `codex-rs/tui/src/chatwidget/safety_buffering.rs`
- `codex-rs/tui/src/chatwidget/turn_lifecycle.rs`
- `codex-rs/tui/src/chatwidget/input_queue.rs`
- `codex-rs/tui/src/chatwidget/interaction.rs`
- `codex-rs/tui/src/app/input.rs`
- `codex-rs/tui/src/app/side.rs`
- `codex-rs/tui/src/app/safety_buffering.rs`

## 相关

- `subsys.tui.streaming-pipeline`: stream controller、chunking 和 commit tick。
- `subsys.tui.bottom-pane`: composer/view stack 的输入来源。
