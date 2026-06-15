---
id: subsys.tui.bottom-pane
title: Bottom pane
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/bottom_pane
  - docs/tui-chat-composer.md
symbols:
  - BottomPane
  - BottomPaneView
  - ChatComposer
  - InputResult
  - PasteBurst
related:
  - subsys.tui.chatwidget
  - subsys.tui.overlays-dialogs
  - subsys.tui.event-system
evidence: explicit
status: verified
updated: 37aadeaa13
---

Bottom pane 是屏幕底部的 input/status/view stack 复合区域；`BottomPane` 同时持有 `ChatComposer`、`view_stack`、`AppEventSender`、`FrameRequester`、status indicator、pending input preview、pending approvals 和 context window 信息 [E: codex-rs/tui/src/bottom_pane/mod.rs:170][E: codex-rs/tui/src/bottom_pane/mod.rs:178][E: codex-rs/tui/src/bottom_pane/mod.rs:181][E: codex-rs/tui/src/bottom_pane/mod.rs:183][E: codex-rs/tui/src/bottom_pane/mod.rs:184][E: codex-rs/tui/src/bottom_pane/mod.rs:194][E: codex-rs/tui/src/bottom_pane/mod.rs:201][E: codex-rs/tui/src/bottom_pane/mod.rs:203][E: codex-rs/tui/src/bottom_pane/mod.rs:204]。

## 能回答的问题

- composer、status indicator、approval overlay、selection view 如何共享 bottom area。
- key event 如何在 active view、Ctrl-C handler、composer 三层之间路由。
- Windows paste burst 为什么有独立 state machine。
- pending input preview、task running indicator、context window 如何渲染在 composer 附近。

## 职责边界

- `BottomPane` 管底部 UI 层，不直接提交 turn；它返回 `InputResult` 给 `ChatWidget`，由 `ChatWidget` 决定提交、排队或执行命令 [E: codex-rs/tui/src/bottom_pane/mod.rs:432][E: codex-rs/tui/src/bottom_pane/mod.rs:502][E: codex-rs/tui/src/chatwidget.rs:5399][E: codex-rs/tui/src/chatwidget.rs:5422][E: codex-rs/tui/src/chatwidget.rs:5438][E: codex-rs/tui/src/chatwidget.rs:5459][E: codex-rs/tui/src/chatwidget.rs:5461][E: codex-rs/tui/src/chatwidget.rs:5465][I]。
- `BottomPaneView` 是 overlay/dialog 协议，定义 key、complete、completion、Ctrl-C、paste、approval/user/MCP request 消费和 dismissed request 等 hook [E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:17][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:21][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:23][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:24][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:29][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:58][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:69][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:100][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:106][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:109][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:115][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:118][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:122]。
- `ChatComposer` 负责文本编辑、slash command、history navigation、file mention、paste burst buffer 和 submission parsing；设计文档把 composer 描述为多个 state machine 的组合 [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:5][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:10][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:21][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:31][E: docs/tui-chat-composer.md:34][E: docs/tui-chat-composer.md:39][I]。
- approval/request user input/MCP elicitation 等 UI 都作为 `BottomPaneView` 进入 `view_stack`，不会替换 composer 本体；`BottomPane` struct 同时保留 `composer` 和 `view_stack` 字段 [E: codex-rs/tui/src/bottom_pane/mod.rs:176][E: codex-rs/tui/src/bottom_pane/mod.rs:178][E: codex-rs/tui/src/bottom_pane/mod.rs:180][E: codex-rs/tui/src/bottom_pane/mod.rs:181][E: codex-rs/tui/src/bottom_pane/mod.rs:982][E: codex-rs/tui/src/bottom_pane/mod.rs:1011][E: codex-rs/tui/src/bottom_pane/mod.rs:1074][E: codex-rs/tui/src/bottom_pane/mod.rs:1090]。

## 关键 crate/文件

- `codex-rs/tui/src/bottom_pane/mod.rs`: BottomPane state、view stack、key routing、render。
- `codex-rs/tui/src/bottom_pane/chat_composer.rs`: editor/composer state machine。
- `codex-rs/tui/src/bottom_pane/bottom_pane_view.rs`: dialog/view trait。
- `codex-rs/tui/src/bottom_pane/paste_burst.rs`: paste burst detector and Enter suppression。
- `docs/tui-chat-composer.md`: design motivation for composer key routing、history、remote images、paste burst。

## 数据模型

- `BottomPaneParams` 传入 app event sender、frame requester、focus/enhanced-key flags、placeholder、paste-burst flag、animation flag 和 skills metadata；`ChatWidget` 构造 `BottomPaneParams` 时把 `config.disable_paste_burst` 和 `config.animations` 映射成 bottom pane 参数 [E: codex-rs/tui/src/bottom_pane/mod.rs:208][E: codex-rs/tui/src/bottom_pane/mod.rs:209][E: codex-rs/tui/src/bottom_pane/mod.rs:210][E: codex-rs/tui/src/bottom_pane/mod.rs:211][E: codex-rs/tui/src/bottom_pane/mod.rs:212][E: codex-rs/tui/src/bottom_pane/mod.rs:213][E: codex-rs/tui/src/bottom_pane/mod.rs:214][E: codex-rs/tui/src/bottom_pane/mod.rs:215][E: codex-rs/tui/src/bottom_pane/mod.rs:216][E: codex-rs/tui/src/chatwidget.rs:5113][E: codex-rs/tui/src/chatwidget.rs:5119][E: codex-rs/tui/src/chatwidget.rs:5120]。
- `CancellationEvent` 只有 `Handled` 与 `NotHandled`，用于告诉 `ChatWidget` active bottom-pane surface 是否本地处理了 cancellation key [E: codex-rs/tui/src/bottom_pane/mod.rs:146][E: codex-rs/tui/src/bottom_pane/mod.rs:152][E: codex-rs/tui/src/bottom_pane/mod.rs:153][E: codex-rs/tui/src/bottom_pane/mod.rs:154]。
- `InputResult` 明确区分 `Submitted`, `Queued`, `Command`, `CommandWithArgs` 和 `None` 等 composer 输出 [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:242][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:244][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:245][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:249][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:258][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:264][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:265]。
- `PasteBurst` 保存 last plain char time、consecutive plain char burst、burst window deadline、buffer、active flag 和 pending first char，用于识别 pasted text 与人工输入 [E: codex-rs/tui/src/bottom_pane/paste_burst.rs:171][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:173][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:174][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:175][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:176][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:177][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:179][I]。

## 控制流

1. `BottomPane::handle_key_event` 先让 active view 处理 key；如果 view 完成，会 pop view 并调用 completion path [E: codex-rs/tui/src/bottom_pane/mod.rs:432][E: codex-rs/tui/src/bottom_pane/mod.rs:445][E: codex-rs/tui/src/bottom_pane/mod.rs:455][E: codex-rs/tui/src/bottom_pane/mod.rs:458][E: codex-rs/tui/src/bottom_pane/mod.rs:466][E: codex-rs/tui/src/bottom_pane/mod.rs:473]。
2. 只有没有 active view 时，`BottomPane` 才进入 `/agent` 快捷入口、Esc interrupt/status 和 composer key event path；如果 `view_stack` 非空，active view 处理后会提前返回 `InputResult::None` 或 completion 结果 [E: codex-rs/tui/src/bottom_pane/mod.rs:432][E: codex-rs/tui/src/bottom_pane/mod.rs:473][E: codex-rs/tui/src/bottom_pane/mod.rs:480][E: codex-rs/tui/src/bottom_pane/mod.rs:484][E: codex-rs/tui/src/bottom_pane/mod.rs:490][E: codex-rs/tui/src/bottom_pane/mod.rs:498][E: codex-rs/tui/src/bottom_pane/mod.rs:502]。
3. Ctrl-C path 优先交给 active view；没有 active view 时，history search 或非空 composer 会被清空，空 composer 返回 NotHandled [E: codex-rs/tui/src/bottom_pane/mod.rs:522][E: codex-rs/tui/src/bottom_pane/mod.rs:523][E: codex-rs/tui/src/bottom_pane/mod.rs:527][E: codex-rs/tui/src/bottom_pane/mod.rs:535][E: codex-rs/tui/src/bottom_pane/mod.rs:538][E: codex-rs/tui/src/bottom_pane/mod.rs:539][E: codex-rs/tui/src/bottom_pane/mod.rs:542]。
4. approval request 到达时，如果 active view 消费不了，就创建 `ApprovalOverlay`、暂停 status timer、push view [E: codex-rs/tui/src/bottom_pane/mod.rs:967][E: codex-rs/tui/src/bottom_pane/mod.rs:968][E: codex-rs/tui/src/bottom_pane/mod.rs:980][E: codex-rs/tui/src/bottom_pane/mod.rs:981][E: codex-rs/tui/src/bottom_pane/mod.rs:982]。
5. request user input、MCP elicitation、tool suggestion 同样走 view creation/push path [E: codex-rs/tui/src/bottom_pane/mod.rs:999][E: codex-rs/tui/src/bottom_pane/mod.rs:1011][E: codex-rs/tui/src/bottom_pane/mod.rs:1074][E: codex-rs/tui/src/bottom_pane/mod.rs:1090]。
6. render path 在有 active view 时直接返回 active view；没有 active view 时才组合 status/footer、pending previews 和 composer [E: codex-rs/tui/src/bottom_pane/mod.rs:1224][E: codex-rs/tui/src/bottom_pane/mod.rs:1226][E: codex-rs/tui/src/bottom_pane/mod.rs:1227][E: codex-rs/tui/src/bottom_pane/mod.rs:1228][E: codex-rs/tui/src/bottom_pane/mod.rs:1251][E: codex-rs/tui/src/bottom_pane/mod.rs:1258][E: codex-rs/tui/src/bottom_pane/mod.rs:1265]。

## 设计动机与权衡

- composer 文档把 Windows terminal paste 问题归因于 pasted characters 以普通 key event 到达，因此 paste burst 通过时间窗口和 Enter suppression 避免大段粘贴被误提交 [E: docs/tui-chat-composer.md:16][E: docs/tui-chat-composer.md:27][E: docs/tui-chat-composer.md:29][E: docs/tui-chat-composer.md:30][E: docs/tui-chat-composer.md:211][E: docs/tui-chat-composer.md:212][E: docs/tui-chat-composer.md:245][E: docs/tui-chat-composer.md:247]。
- view stack 让 transient UI 共享 key/render lifecycle；`push_view` 只 push Boxed view 并 request redraw，说明 transient UI 不需要拥有 app-wide state 是基于 bottom-pane ownership 的设计推断 [E: codex-rs/tui/src/bottom_pane/mod.rs:398][E: codex-rs/tui/src/bottom_pane/mod.rs:399][E: codex-rs/tui/src/bottom_pane/mod.rs:400][I]。
- double-press quit 逻辑被常量禁用，`DOUBLE_PRESS_QUIT_SHORTCUT_ENABLED` 当前为 `false`；这影响 `show_quit_shortcut_hint` 的 early return，但 Ctrl-C 退出/interrupt 的整体决策仍由 `ChatWidget` 拥有 [E: codex-rs/tui/src/bottom_pane/mod.rs:139][E: codex-rs/tui/src/bottom_pane/mod.rs:144][E: codex-rs/tui/src/bottom_pane/mod.rs:711][E: codex-rs/tui/src/bottom_pane/mod.rs:716][E: codex-rs/tui/src/bottom_pane/mod.rs:717]。

## gotcha

- active view 可能优先处理 Esc 或 Ctrl-C；如果 bottom pane 看起来“不提交输入”，先检查 `view_stack` 是否非空 [E: codex-rs/tui/src/bottom_pane/mod.rs:394][E: codex-rs/tui/src/bottom_pane/mod.rs:432][E: codex-rs/tui/src/bottom_pane/mod.rs:435]。
- paste burst flush 由 `BottomPane::flush_paste_burst_if_due` 执行，并由 `ChatWidget::handle_paste_burst_tick` 在 draw cadence 中调用；如果测试只模拟 key event 而不触发该 tick，可能看不到预期文本落入 composer [E: codex-rs/tui/src/bottom_pane/mod.rs:1156][E: codex-rs/tui/src/bottom_pane/mod.rs:1164][E: codex-rs/tui/src/chatwidget.rs:5642][E: codex-rs/tui/src/chatwidget.rs:5643][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:288][I]。
- bare slash 和 paste burst Enter 都有特殊 submission behavior，调试 Enter 提交时不要只看普通 newline 逻辑 [E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2465][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2473][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2557][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2577][E: docs/tui-chat-composer.md:243][E: docs/tui-chat-composer.md:245][E: docs/tui-chat-composer.md:247][E: docs/tui-chat-composer.md:300][E: docs/tui-chat-composer.md:301]。

## Sources

- `codex-rs/tui/src/bottom_pane`
- `docs/tui-chat-composer.md`

## 相关

- `subsys.tui.chatwidget`
- `subsys.tui.overlays-dialogs`
- `subsys.tui.event-system`
