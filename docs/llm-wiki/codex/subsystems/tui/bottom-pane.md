---
id: subsys.tui.bottom-pane
title: Bottom Pane 与 Composer
kind: subsystem
tier: T2
source: [codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/bottom_pane/bottom_pane_view.rs, codex-rs/tui/src/bottom_pane/chat_composer.rs, codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs, codex-rs/tui/src/bottom_pane/chat_composer_history.rs, codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs, codex-rs/tui/src/bottom_pane/paste_burst.rs, codex-rs/tui/src/bottom_pane/pending_input_preview.rs, codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs, codex-rs/tui/src/bottom_pane/app_link_view.rs, codex-rs/tui/src/bottom_pane/approval_overlay.rs, codex-rs/tui/src/bottom_pane/hooks_browser_view.rs, codex-rs/tui/src/bottom_pane/list_selection_view.rs, codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs, codex-rs/tui/src/bottom_pane/request_user_input/mod.rs]
symbols: [BottomPane, BottomPaneView, ChatComposer, InputResult, QueuedInputAction, PasteBurst, ChatComposerHistory, HistorySearchResult, DollarQueryKind]
related: [subsys.tui.chatwidget, subsys.tui.overlays-dialogs, subsys.tui.event-system]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Bottom pane 是聊天屏底部的 owning container：它保留 `ChatComposer`，维护 `BottomPaneView` stack，并把本地输入路由、运行中状态、pending preview 和 approval 提示组织成 footer surface；进程级 quit/interrupt 决策仍归 `ChatWidget`。[E: codex-rs/tui/src/bottom_pane/mod.rs:219][E: codex-rs/tui/src/bottom_pane/mod.rs:222][E: codex-rs/tui/src/bottom_pane/mod.rs:225][E: codex-rs/tui/src/bottom_pane/mod.rs:613]

## 能回答的问题

- `ChatComposer` 和 modal/popup stack 的边界在哪里？
- key、paste、Ctrl-C 进入 bottom pane 后按什么顺序路由？
- `@`/`$` completion 如何在 atomic text elements、shell variables 与相邻 token 之间选目标？
- parent-owned subagent thread 为什么仍可编辑草稿却不能提交 agent-directed input？
- Ctrl+R 如何批量扫描跨 session persistent history？
- running status、pending input preview、pending thread approvals 属于谁维护？
- 旧的 composer 设计文档删除后，当前源码里的 paste burst 事实在哪里？

## 容器状态

`BottomPane` 字段明确把 composer、`view_stack`、delayed approval requests、app event sender、frame requester、thread id、focus/enhanced-key/paste-burst flags、running status、pending input preview、pending thread approvals、context window 信息和 runtime keymap 放在同一层。[E: codex-rs/tui/src/bottom_pane/mod.rs:219][E: codex-rs/tui/src/bottom_pane/mod.rs:222][E: codex-rs/tui/src/bottom_pane/mod.rs:225][E: codex-rs/tui/src/bottom_pane/mod.rs:226][E: codex-rs/tui/src/bottom_pane/mod.rs:229][E: codex-rs/tui/src/bottom_pane/mod.rs:230][E: codex-rs/tui/src/bottom_pane/mod.rs:231][E: codex-rs/tui/src/bottom_pane/mod.rs:233][E: codex-rs/tui/src/bottom_pane/mod.rs:234][E: codex-rs/tui/src/bottom_pane/mod.rs:235][E: codex-rs/tui/src/bottom_pane/mod.rs:236][E: codex-rs/tui/src/bottom_pane/mod.rs:248][E: codex-rs/tui/src/bottom_pane/mod.rs:250][E: codex-rs/tui/src/bottom_pane/mod.rs:251][E: codex-rs/tui/src/bottom_pane/mod.rs:253]

`BottomPane::new` 用 `BottomPaneParams` 创建 composer，把 frame requester、keymap、skills 注入 composer，并初始化空 view stack、pending preview、pending approvals 和状态行。[E: codex-rs/tui/src/bottom_pane/mod.rs:268][E: codex-rs/tui/src/bottom_pane/mod.rs:269][E: codex-rs/tui/src/bottom_pane/mod.rs:279][E: codex-rs/tui/src/bottom_pane/mod.rs:286][E: codex-rs/tui/src/bottom_pane/mod.rs:287][E: codex-rs/tui/src/bottom_pane/mod.rs:288][E: codex-rs/tui/src/bottom_pane/mod.rs:289][E: codex-rs/tui/src/bottom_pane/mod.rs:291][E: codex-rs/tui/src/bottom_pane/mod.rs:292][E: codex-rs/tui/src/bottom_pane/mod.rs:302][E: codex-rs/tui/src/bottom_pane/mod.rs:304][E: codex-rs/tui/src/bottom_pane/mod.rs:305]

## View Stack 与输入路由

active view 是 `view_stack.last()`；push 会 schedule active view frame 并 request redraw，pop 完成时按 completion 处理 child-accept dismissal，再在 stack 变浅时触发 completion hook。[E: codex-rs/tui/src/bottom_pane/mod.rs:526][E: codex-rs/tui/src/bottom_pane/mod.rs:527][E: codex-rs/tui/src/bottom_pane/mod.rs:530][E: codex-rs/tui/src/bottom_pane/mod.rs:531][E: codex-rs/tui/src/bottom_pane/mod.rs:532][E: codex-rs/tui/src/bottom_pane/mod.rs:536][E: codex-rs/tui/src/bottom_pane/mod.rs:539][E: codex-rs/tui/src/bottom_pane/mod.rs:545][E: codex-rs/tui/src/bottom_pane/mod.rs:555][E: codex-rs/tui/src/bottom_pane/mod.rs:560][E: codex-rs/tui/src/bottom_pane/mod.rs:561]

`handle_key_event` 优先把 key 交给 active view；没有 view 时才检查 running-task interrupt、记录 composer activity，再调用 composer 的 key handler。popup 活跃时不会直接触发 task interrupt。[E: codex-rs/tui/src/bottom_pane/mod.rs:613][E: codex-rs/tui/src/bottom_pane/mod.rs:615][E: codex-rs/tui/src/bottom_pane/mod.rs:623][E: codex-rs/tui/src/bottom_pane/mod.rs:635][E: codex-rs/tui/src/bottom_pane/mod.rs:659][E: codex-rs/tui/src/bottom_pane/mod.rs:663][E: codex-rs/tui/src/bottom_pane/mod.rs:663][E: codex-rs/tui/src/bottom_pane/mod.rs:671][E: codex-rs/tui/src/bottom_pane/mod.rs:682][E: codex-rs/tui/src/bottom_pane/mod.rs:684][E: codex-rs/tui/src/bottom_pane/mod.rs:692]

Ctrl-C 也是两层：active view 先消费，之后才是 history-search cancel、空 composer 上报未处理、非空 composer 清空草稿；该函数只返回 `CancellationEvent`，不决定进程退出。[E: codex-rs/tui/src/bottom_pane/mod.rs:705][E: codex-rs/tui/src/bottom_pane/mod.rs:705][E: codex-rs/tui/src/bottom_pane/mod.rs:706][E: codex-rs/tui/src/bottom_pane/mod.rs:707][E: codex-rs/tui/src/bottom_pane/mod.rs:718][E: codex-rs/tui/src/bottom_pane/mod.rs:721][E: codex-rs/tui/src/bottom_pane/mod.rs:725][E: codex-rs/tui/src/bottom_pane/mod.rs:728]

paste 同样先交给 active view；view complete 时会清空 view stack 并触发 active-view completion。[E: codex-rs/tui/src/bottom_pane/mod.rs:732][E: codex-rs/tui/src/bottom_pane/mod.rs:734][E: codex-rs/tui/src/bottom_pane/mod.rs:735][E: codex-rs/tui/src/bottom_pane/mod.rs:736][E: codex-rs/tui/src/bottom_pane/mod.rs:738][E: codex-rs/tui/src/bottom_pane/mod.rs:739]

## Composer 结果与队列

`InputResult` 和 `QueuedInputAction` 由 `chat_composer` 导出到 bottom pane 模块；composer 的 submission path 产生 `Submitted`、`Queued`、command dispatch、bare slash 等结果，`ChatWidget` 再解释这些结果。[E: codex-rs/tui/src/bottom_pane/mod.rs:194][E: codex-rs/tui/src/bottom_pane/mod.rs:196][E: codex-rs/tui/src/bottom_pane/mod.rs:197][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:326][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:326][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:331][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:341][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:404][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:2951][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3012][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3042][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3061][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3070][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3074]

目标 HEAD 新增 `InputResult::ParentOwnedInputBlocked`。`set_parent_owned_thread` 只设置 direct-input block 和 placeholder，并不把 textarea 设为不可编辑；提交普通 prompt、带参数/不安全 slash command 或 shell input 时由 composer 返回 block 结果，bare navigation/local commands 仍可执行。[E: codex-rs/tui/src/bottom_pane/chat_composer.rs:355][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:454][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:469][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:1562][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:1564][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:4853][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:4866]

当前 paste-burst 行为在源码状态机里：它把终端把粘贴拆成 key events 的场景建模成时间窗口，避免 paste 里的 Enter 被误当作普通提交；不要沿用旧版 composer 设计文档作为证据。[E: codex-rs/tui/src/bottom_pane/paste_burst.rs:168][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:169][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:195][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:324][E: codex-rs/tui/src/bottom_pane/paste_burst.rs:218]

## Completion target 与 history search 扩面

新拆出的 `completion_target.rs` 在 cursor 两侧解析 whitespace-delimited `@`/`$` token，把 atomic text element 当硬边界；候选已经绑定成 atomic mention 时不再进入 completion。`DollarQueryKind` 还把 `$HOME`、纯数字 positional parameter、含后缀的歧义 shell parameter 与可补全 skill/plugin query 分开，避免 legacy `$` mention popup 抢走 shell syntax。[E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:273][E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:307][E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:312][E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:327][E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:345][E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:350]

`ChatComposerHistory` 仍把 persistent cross-session entries 和 local in-session entries 合到同一 offset space；目标 HEAD 的 Ctrl+R reverse search 在 probe newest entry 后改用 query-independent batches。batch response 先更新共享 cache，再只为当前 awaited cursor 续跑；旧 log id 被忽略，读取失败最多重试两次，避免把 I/O failure 当成 history exhaustion。[E: codex-rs/tui/src/bottom_pane/chat_composer_history.rs:36][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:15][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:23][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:34][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:42][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:70][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:82][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:92]

## 状态与辅助面板

`set_task_running` 在任务开始时创建/显示 `StatusIndicatorWidget`，设置 interrupt hint，并在任务结束时隐藏 status indicator；queue submission 开关直接同步到 composer。[E: codex-rs/tui/src/bottom_pane/mod.rs:1034][E: codex-rs/tui/src/bottom_pane/mod.rs:1039][E: codex-rs/tui/src/bottom_pane/mod.rs:1041][E: codex-rs/tui/src/bottom_pane/mod.rs:1042][E: codex-rs/tui/src/bottom_pane/mod.rs:1049][E: codex-rs/tui/src/bottom_pane/mod.rs:1050][E: codex-rs/tui/src/bottom_pane/mod.rs:1057][E: codex-rs/tui/src/bottom_pane/mod.rs:1061][E: codex-rs/tui/src/bottom_pane/mod.rs:1062]

`PendingInputPreview` 渲染 pending steers/queued drafts；`PendingThreadApprovals` 记录 inactive threads with pending approvals，并在 render 中给出 `/agent` 切换提示。[E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:23][E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:23][E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:90][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:12][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:12][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:23][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:40][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:60][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:63]

## Gotchas

- `BottomPaneView` trait 是 modal/popup 的统一接口，不是 alternate-screen pager；view 实例包括 app link、approval、hooks browser、list selection、MCP elicitation、request-user-input 等 overlays。[E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:19][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:688][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:565][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:570][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:952][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1507][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1181]
- generic list selection 由 `show_selection_view` 包装 `ListSelectionView::new` 后 push 到 view stack。[E: codex-rs/tui/src/bottom_pane/mod.rs:1108][E: codex-rs/tui/src/bottom_pane/mod.rs:1108][E: codex-rs/tui/src/bottom_pane/mod.rs:1113][E: codex-rs/tui/src/bottom_pane/mod.rs:1118]

## Sources

- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/bottom_pane/bottom_pane_view.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer_history.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs`
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
