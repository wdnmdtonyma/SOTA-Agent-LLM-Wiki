---
id: subsys.tui.bottom-pane
title: Bottom Pane 与 Composer
kind: subsystem
tier: T2
source: [codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/bottom_pane/bottom_pane_view.rs, codex-rs/tui/src/bottom_pane/chat_composer.rs, codex-rs/tui/src/bottom_pane/paste_burst.rs, codex-rs/tui/src/bottom_pane/pending_input_preview.rs, codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs, codex-rs/tui/src/bottom_pane/app_link_view.rs, codex-rs/tui/src/bottom_pane/approval_overlay.rs, codex-rs/tui/src/bottom_pane/hooks_browser_view.rs, codex-rs/tui/src/bottom_pane/list_selection_view.rs, codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs, codex-rs/tui/src/bottom_pane/request_user_input/mod.rs]
symbols: [BottomPane, BottomPaneView, ChatComposer, InputResult, QueuedInputAction, PasteBurst]
related: [subsys.tui.chatwidget, subsys.tui.overlays-dialogs, subsys.tui.event-system]
evidence: explicit
status: verified
updated: 5670360009
---

> Bottom pane 是聊天屏底部的 owning container：它保留 `ChatComposer`，维护 `BottomPaneView` stack，并把本地输入路由、运行中状态、pending preview 和 approval 提示组织成 footer surface；进程级 quit/interrupt 决策仍归 `ChatWidget`。[E: codex-rs/tui/src/bottom_pane/mod.rs:201][E: codex-rs/tui/src/bottom_pane/mod.rs:203][E: codex-rs/tui/src/bottom_pane/mod.rs:204][E: codex-rs/tui/src/bottom_pane/mod.rs:205]

## 能回答的问题

- `ChatComposer` 和 modal/popup stack 的边界在哪里？
- key、paste、Ctrl-C 进入 bottom pane 后按什么顺序路由？
- running status、pending input preview、pending thread approvals 属于谁维护？
- 旧的 composer 设计文档删除后，当前源码里的 paste burst 事实在哪里？

## 容器状态

`BottomPane` 字段明确把 composer、`view_stack`、app event sender、frame requester、thread id、focus/enhanced-key/paste-burst flags、running status、pending input preview、pending thread approvals、context window 信息和 runtime keymap 放在同一层。[E: codex-rs/tui/src/bottom_pane/mod.rs:206][E: codex-rs/tui/src/bottom_pane/mod.rs:209][E: codex-rs/tui/src/bottom_pane/mod.rs:212][E: codex-rs/tui/src/bottom_pane/mod.rs:216][E: codex-rs/tui/src/bottom_pane/mod.rs:217][E: codex-rs/tui/src/bottom_pane/mod.rs:218][E: codex-rs/tui/src/bottom_pane/mod.rs:220][E: codex-rs/tui/src/bottom_pane/mod.rs:221][E: codex-rs/tui/src/bottom_pane/mod.rs:222][E: codex-rs/tui/src/bottom_pane/mod.rs:223][E: codex-rs/tui/src/bottom_pane/mod.rs:228][E: codex-rs/tui/src/bottom_pane/mod.rs:235][E: codex-rs/tui/src/bottom_pane/mod.rs:237][E: codex-rs/tui/src/bottom_pane/mod.rs:238][E: codex-rs/tui/src/bottom_pane/mod.rs:240]

`BottomPane::new` 用 `BottomPaneParams` 创建 composer，把 frame requester、keymap、skills 注入 composer，并初始化空 view stack、pending preview、pending approvals 和状态行。[E: codex-rs/tui/src/bottom_pane/mod.rs:254][E: codex-rs/tui/src/bottom_pane/mod.rs:255][E: codex-rs/tui/src/bottom_pane/mod.rs:266][E: codex-rs/tui/src/bottom_pane/mod.rs:273][E: codex-rs/tui/src/bottom_pane/mod.rs:274][E: codex-rs/tui/src/bottom_pane/mod.rs:275][E: codex-rs/tui/src/bottom_pane/mod.rs:276][E: codex-rs/tui/src/bottom_pane/mod.rs:278][E: codex-rs/tui/src/bottom_pane/mod.rs:279][E: codex-rs/tui/src/bottom_pane/mod.rs:291][E: codex-rs/tui/src/bottom_pane/mod.rs:292]

## View Stack 与输入路由

active view 是 `view_stack.last()`；push 会 schedule active view frame 并 request redraw，pop 完成时按 completion 处理 child-accept dismissal，再在 stack 变浅时触发 completion hook。[E: codex-rs/tui/src/bottom_pane/mod.rs:485][E: codex-rs/tui/src/bottom_pane/mod.rs:486][E: codex-rs/tui/src/bottom_pane/mod.rs:489][E: codex-rs/tui/src/bottom_pane/mod.rs:490][E: codex-rs/tui/src/bottom_pane/mod.rs:491][E: codex-rs/tui/src/bottom_pane/mod.rs:495][E: codex-rs/tui/src/bottom_pane/mod.rs:498][E: codex-rs/tui/src/bottom_pane/mod.rs:502][E: codex-rs/tui/src/bottom_pane/mod.rs:514]

`handle_key_event` 优先把 key 交给 active view；没有 view 时才检查 running-task interrupt、记录 composer activity，再调用 composer 的 key handler。popup 活跃时不会直接触发 task interrupt。[E: codex-rs/tui/src/bottom_pane/mod.rs:571][E: codex-rs/tui/src/bottom_pane/mod.rs:574][E: codex-rs/tui/src/bottom_pane/mod.rs:582][E: codex-rs/tui/src/bottom_pane/mod.rs:594][E: codex-rs/tui/src/bottom_pane/mod.rs:617][E: codex-rs/tui/src/bottom_pane/mod.rs:626][E: codex-rs/tui/src/bottom_pane/mod.rs:629][E: codex-rs/tui/src/bottom_pane/mod.rs:632][E: codex-rs/tui/src/bottom_pane/mod.rs:652]

Ctrl-C 也是两层：active view 先消费，之后才是 history-search cancel、空 composer 上报未处理、非空 composer 清空草稿；该函数只返回 `CancellationEvent`，不决定进程退出。[E: codex-rs/tui/src/bottom_pane/mod.rs:666][E: codex-rs/tui/src/bottom_pane/mod.rs:668][E: codex-rs/tui/src/bottom_pane/mod.rs:673][E: codex-rs/tui/src/bottom_pane/mod.rs:675][E: codex-rs/tui/src/bottom_pane/mod.rs:676][E: codex-rs/tui/src/bottom_pane/mod.rs:688][E: codex-rs/tui/src/bottom_pane/mod.rs:691][E: codex-rs/tui/src/bottom_pane/mod.rs:694]

paste 同样先交给 active view；view complete 时会清空 view stack 并触发 active-view completion。[E: codex-rs/tui/src/bottom_pane/mod.rs:702][E: codex-rs/tui/src/bottom_pane/mod.rs:704][E: codex-rs/tui/src/bottom_pane/mod.rs:705][E: codex-rs/tui/src/bottom_pane/mod.rs:706][E: codex-rs/tui/src/bottom_pane/mod.rs:708][E: codex-rs/tui/src/bottom_pane/mod.rs:709]

## Composer 结果与队列

`InputResult` 和 `QueuedInputAction` 由 `chat_composer` 导出到 bottom pane 模块；composer 的 submission path 产生 `Submitted`、`Queued`、command dispatch、bare slash 等结果，`ChatWidget` 再解释这些结果。[E: codex-rs/tui/src/bottom_pane/mod.rs:185][E: codex-rs/tui/src/bottom_pane/mod.rs:186][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:274][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:302][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2738][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2762][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2811][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2859]

当前 paste-burst 说明在源码模块文档里：它把终端把粘贴拆成 key events 的场景建模成时间窗口，避免 paste 里的 Enter 被误当作普通提交；不要沿用旧版 composer 设计文档作为证据。[E: codex-rs/tui/src/bottom_pane/paste_burst.rs:1][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:3][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:6][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:11]

## 状态与辅助面板

`set_task_running` 在任务开始时创建/显示 `StatusIndicatorWidget`，设置 interrupt hint，并在任务结束时隐藏 status indicator；queue submission 开关直接同步到 composer。[E: codex-rs/tui/src/bottom_pane/mod.rs:1001][E: codex-rs/tui/src/bottom_pane/mod.rs:1003][E: codex-rs/tui/src/bottom_pane/mod.rs:1006][E: codex-rs/tui/src/bottom_pane/mod.rs:1008][E: codex-rs/tui/src/bottom_pane/mod.rs:1016][E: codex-rs/tui/src/bottom_pane/mod.rs:1024][E: codex-rs/tui/src/bottom_pane/mod.rs:1028][E: codex-rs/tui/src/bottom_pane/mod.rs:1029]

`PendingInputPreview` 渲染 pending steers/queued drafts；`PendingThreadApprovals` 记录 inactive threads with pending approvals，并在 render 中给出 `/agent` 切换提示。[E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:13][E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:29][E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:90][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:12][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:23][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:40][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:69]

## Gotchas

- `BottomPaneView` trait 是 modal/popup 的统一接口，不是 alternate-screen pager；view 实例包括 app link、approval、hooks browser、list selection、MCP elicitation、request-user-input 等 overlays。[E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:19][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:688][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:570][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:562][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:916][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1508][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1181]
- generic list selection 由 `show_selection_view` 包装 `ListSelectionView::new` 后 push 到 view stack。[E: codex-rs/tui/src/bottom_pane/mod.rs:1075][E: codex-rs/tui/src/bottom_pane/mod.rs:1079][E: codex-rs/tui/src/bottom_pane/mod.rs:1080][E: codex-rs/tui/src/bottom_pane/mod.rs:1085]

## Sources

- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/bottom_pane/bottom_pane_view.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer.rs`
- `codex-rs/tui/src/bottom_pane/paste_burst.rs`
- `codex-rs/tui/src/bottom_pane/pending_input_preview.rs`
- `codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs`
- `codex-rs/tui/src/bottom_pane/app_link_view.rs`
- `codex-rs/tui/src/bottom_pane/approval_overlay.rs`
- `codex-rs/tui/src/bottom_pane/hooks_browser_view.rs`
- `codex-rs/tui/src/bottom_pane/list_selection_view.rs`
- `codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs`
- `codex-rs/tui/src/bottom_pane/request_user_input/mod.rs`

## 相关

- `subsys.tui.chatwidget`: 解释 `InputResult` 后如何提交/排队 user input。
- `subsys.tui.overlays-dialogs`: alternate-screen pager 与 bottom-pane modal 的区别。
