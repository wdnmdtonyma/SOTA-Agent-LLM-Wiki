---
id: subsys.tui.bottom-pane
title: Bottom Pane 与 Composer
kind: subsystem
tier: T2
source: [codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/bottom_pane/startup.rs, codex-rs/tui/src/bottom_pane/bottom_pane_view.rs, codex-rs/tui/src/bottom_pane/chat_composer.rs, codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs, codex-rs/tui/src/bottom_pane/chat_composer_history.rs, codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs, codex-rs/tui/src/bottom_pane/paste_burst.rs, codex-rs/tui/src/bottom_pane/textarea.rs, codex-rs/tui/src/bottom_pane/pending_input_preview.rs, codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs, codex-rs/tui/src/bottom_pane/app_link_view.rs, codex-rs/tui/src/bottom_pane/approval_overlay.rs, codex-rs/tui/src/bottom_pane/hooks_browser_view.rs, codex-rs/tui/src/bottom_pane/list_selection_view.rs, codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs, codex-rs/tui/src/bottom_pane/request_user_input/mod.rs, codex-rs/tui/src/external_editor.rs]
symbols: [BottomPane, BottomPaneView, ChatComposer, InputResult, QueuedInputAction, PasteBurst, ChatComposerHistory, HistorySearchResult, DollarQueryKind]
related: [subsys.tui.chatwidget, subsys.tui.overlays-dialogs, subsys.tui.event-system, subsys.tui.keymap, subsys.tui.onboarding]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Bottom pane 是聊天屏底部的 owning container：它保留 `ChatComposer`，维护 `BottomPaneView` stack，并把本地输入路由、运行中状态、pending preview 和 approval 提示组织成 footer surface。startup 阶段同一套 composer 只接受 safe editor keys；进程级 quit/interrupt 决策仍归 `ChatWidget`。[E: codex-rs/tui/src/bottom_pane/mod.rs:222][E: codex-rs/tui/src/bottom_pane/mod.rs:225][E: codex-rs/tui/src/bottom_pane/mod.rs:628][E: codex-rs/tui/src/bottom_pane/startup.rs:16]

## 能回答的问题

- `ChatComposer` 和 modal/popup stack 的边界在哪里？
- key、paste、Ctrl-C 进入 bottom pane 后按什么顺序路由？
- startup composer 为什么可编辑却不能提交？
- editor keymap 如何在 composer、textarea、notes overlay 之间共享？
- `@`/`$` completion 如何在 atomic text elements、shell variables 与相邻 token 之间选目标？
- Ctrl+R 如何批量扫描跨 session persistent history？
- request_user_input 的 Other 选项为什么会打开 notes？
- shortcut-modified 输入为什么不能进入 paste burst？

## 容器状态

`BottomPane` 字段明确把 composer、`view_stack`、delayed approval requests、app event sender、frame requester、thread id、focus/enhanced-key/paste-burst flags、running status、pending input preview、pending thread approvals、context window 信息和 runtime keymap 放在同一层。[E: codex-rs/tui/src/bottom_pane/mod.rs:222][E: codex-rs/tui/src/bottom_pane/mod.rs:225][E: codex-rs/tui/src/bottom_pane/mod.rs:228][E: codex-rs/tui/src/bottom_pane/mod.rs:232][E: codex-rs/tui/src/bottom_pane/mod.rs:236][E: codex-rs/tui/src/bottom_pane/mod.rs:244][E: codex-rs/tui/src/bottom_pane/mod.rs:251][E: codex-rs/tui/src/bottom_pane/mod.rs:253][E: codex-rs/tui/src/bottom_pane/mod.rs:256]

`BottomPane::new` 用 `BottomPaneParams` 创建 composer，把 frame requester、keymap、skills 注入 composer，并初始化空 view stack、pending preview、pending approvals 和状态行。[E: codex-rs/tui/src/bottom_pane/mod.rs:271][E: codex-rs/tui/src/bottom_pane/mod.rs:276][E: codex-rs/tui/src/bottom_pane/mod.rs:290][E: codex-rs/tui/src/bottom_pane/mod.rs:299][E: codex-rs/tui/src/bottom_pane/mod.rs:300]

`set_keymap_bindings` 用同一份 `RuntimeKeymap` 更新 pane、composer、pending-input preview 和 running status 的 interrupt hint，避免 overlays 与 composer 漂移。[E: codex-rs/tui/src/bottom_pane/mod.rs:410][E: codex-rs/tui/src/bottom_pane/mod.rs:410][E: codex-rs/tui/src/bottom_pane/mod.rs:412]

## Startup composer

`bottom_pane/startup.rs` 给 provisional composer 提供受保护 handoff：`is_startup_composer_action` 识别 submit/queue/history-search/toggle-shortcuts；`is_safe_startup_editor_key` 只放行 insert-newline 与光标/删除/yank 等 editor bindings。[E: codex-rs/tui/src/bottom_pane/startup.rs:7][E: codex-rs/tui/src/bottom_pane/startup.rs:18][E: codex-rs/tui/src/bottom_pane/startup.rs:32]

handoff 时 `composer_draft_snapshot` 带上 approval-idle timestamp，`restore_startup_composer_state` 恢复 startup-local history，`flush_composer_paste_burst` 在 owner 切换前先落地缓冲文本。[E: codex-rs/tui/src/bottom_pane/startup.rs:70][E: codex-rs/tui/src/bottom_pane/startup.rs:83][E: codex-rs/tui/src/bottom_pane/startup.rs:106]

## View Stack 与输入路由

active view 是 `view_stack.last()`。`handle_key_event` 优先把 key 交给 active view；没有 view 时才检查 running-task interrupt、记录 composer activity，再调用 composer 的 key handler。popup 活跃时不会直接触发 task interrupt。[E: codex-rs/tui/src/bottom_pane/mod.rs:628][E: codex-rs/tui/src/bottom_pane/mod.rs:630][E: codex-rs/tui/src/bottom_pane/mod.rs:650][E: codex-rs/tui/src/bottom_pane/mod.rs:678][E: codex-rs/tui/src/bottom_pane/mod.rs:697]

Ctrl-C 也是两层：active view 先消费，之后才是 history-search cancel、空 composer 上报未处理、非空 composer 清空草稿；该函数只返回 `CancellationEvent`，不决定进程退出。[E: codex-rs/tui/src/bottom_pane/mod.rs:729][E: codex-rs/tui/src/bottom_pane/mod.rs:730][E: codex-rs/tui/src/bottom_pane/mod.rs:742][E: codex-rs/tui/src/bottom_pane/mod.rs:745]

paste 同样先交给 active view。[E: codex-rs/tui/src/bottom_pane/mod.rs:756][E: codex-rs/tui/src/bottom_pane/mod.rs:758]

### Request-user-input

`RequestUserInputOverlay` 对 `is_blocking=true` 的 request 完全禁用 auto-resolution；非 blocking request 使用 TUI 固定的 60 秒 hidden grace 加 60 秒 visible countdown，不再由 deprecated `autoResolutionMs` 决定。[E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:69][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:70][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:291][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:291]

用户一旦与非 blocking overlay 交互，`snooze_auto_resolution` 会将本 request 的 auto-resolution 关闭。[E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:282][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:283]

`is_other` 选项被选中时，Tab / list Accept / Enter 不提交，而是切到 notes focus 并 `ensure_selected_for_notes`。测试 `tab_and_enter_open_notes_for_other_option` 固定了这个行为。[E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:62][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1366][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1375][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:3246]

notes/freeform 复用同一个 `ChatComposer`，构造时调用 `composer.set_keymap_bindings(&keymap)`，因此 notes 与主 composer 共享 editor/submit bindings。[E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:165][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:219]

## Composer、editor keymap 与 paste burst

`ChatComposer::set_keymap_bindings` 同时更新 submit/queue/history-search 和 embedded textarea 的 editor bindings，避免 live remap 只改提交键却留下旧光标键。[E: codex-rs/tui/src/bottom_pane/chat_composer.rs:866][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:866][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:874][E: codex-rs/tui/src/bottom_pane/textarea.rs:186]

`TextArea::set_keymap_bindings` 只换 keymap cache，不改 Vim mode、cursor 或 kill buffer。[E: codex-rs/tui/src/bottom_pane/textarea.rs:185][E: codex-rs/tui/src/bottom_pane/textarea.rs:186]

当前 paste-burst 行为在源码状态机里：它把终端把粘贴拆成 key events 的场景建模成时间窗口，避免 paste 里的 Enter 被误当作普通提交。composer 只把 plain/Shift/Windows AltGr 的 text-producing char 送进 burst detector；Ctrl/Alt/Super/Hyper/Meta 会先 flush，再当 shortcut 处理。[E: codex-rs/tui/src/bottom_pane/paste_burst.rs:168][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3556][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3565][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:3570][E: codex-rs/tui/src/bottom_pane/chat_composer.rs:11913]

`InputResult` 和 `QueuedInputAction` 由 `chat_composer` 导出到 bottom pane 模块。`set_parent_owned_thread` 只设置 direct-input block 和 placeholder，并不把 textarea 设为不可编辑。[E: codex-rs/tui/src/bottom_pane/mod.rs:199][E: codex-rs/tui/src/bottom_pane/mod.rs:200]

`completion_target.rs` 在 cursor 两侧解析 whitespace-delimited `@`/`$` token，把 atomic text element 当硬边界；`DollarQueryKind` 还把 `$HOME`、纯数字 positional parameter 与可补全 skill/plugin query 分开。[E: codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs:273]

`ChatComposerHistory` 仍把 persistent cross-session entries 和 local in-session entries 合到同一 offset space；Ctrl+R reverse search 在 probe newest entry 后改用 query-independent batches。[E: codex-rs/tui/src/bottom_pane/chat_composer_history.rs:40][E: codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs:15]

## External editor 隔离

外部编辑器 buffer 写在候选 `codex_home` 下的 `editor/` 目录；若该目录或其 parent 对 sandbox policy 可写，路径被拒绝并继续尝试下一个 candidate（默认 `~/.codex`，以及 Unix 上的 project `.codex`）。成功路径还拒绝含 symlink 的目录。[E: codex-rs/tui/src/external_editor.rs:60][E: codex-rs/tui/src/external_editor.rs:119][E: codex-rs/tui/src/external_editor.rs:129][E: codex-rs/tui/src/external_editor.rs:145][E: codex-rs/tui/src/external_editor.rs:157][E: codex-rs/tui/src/external_editor.rs:184][E: codex-rs/tui/src/external_editor.rs:195]

## 状态与辅助面板

`set_task_running` 在任务开始时创建/显示 `StatusIndicatorWidget`，设置 interrupt hint，并在任务结束时隐藏 status indicator；queue submission 开关直接同步到 composer。[E: codex-rs/tui/src/bottom_pane/mod.rs:1054][E: codex-rs/tui/src/bottom_pane/mod.rs:1057][E: codex-rs/tui/src/bottom_pane/mod.rs:1061][E: codex-rs/tui/src/bottom_pane/mod.rs:1080][E: codex-rs/tui/src/bottom_pane/mod.rs:1084]

`PendingInputPreview` 渲染 pending steers/queued drafts；`PendingThreadApprovals` 记录 inactive threads with pending approvals。[E: codex-rs/tui/src/bottom_pane/pending_input_preview.rs:23][E: codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs:12]

## Gotchas

- `BottomPaneView` trait 是 modal/popup 的统一接口，不是 alternate-screen pager；view 实例包括 app link、approval、hooks browser、list selection、MCP elicitation、request-user-input 等 overlays。[E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:20][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:690][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:565][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:597][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:952][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1515][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1188]
- Thai 组合标记在 textarea 的 `delete_backward` 里被单独剥一层，而不是按整个 grapheme 删除。[E: codex-rs/tui/src/bottom_pane/textarea.rs:1005][E: codex-rs/tui/src/bottom_pane/textarea.rs:1016]

## Sources

- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/bottom_pane/startup.rs`
- `codex-rs/tui/src/bottom_pane/bottom_pane_view.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer/completion_target.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer_history.rs`
- `codex-rs/tui/src/bottom_pane/chat_composer_history/search_batch.rs`
- `codex-rs/tui/src/bottom_pane/paste_burst.rs`
- `codex-rs/tui/src/bottom_pane/textarea.rs`
- `codex-rs/tui/src/bottom_pane/pending_input_preview.rs`
- `codex-rs/tui/src/bottom_pane/pending_thread_approvals.rs`
- `codex-rs/tui/src/bottom_pane/app_link_view.rs`
- `codex-rs/tui/src/bottom_pane/approval_overlay.rs`
- `codex-rs/tui/src/bottom_pane/hooks_browser_view.rs`
- `codex-rs/tui/src/bottom_pane/list_selection_view.rs`
- `codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs`
- `codex-rs/tui/src/bottom_pane/request_user_input/mod.rs`
- `codex-rs/tui/src/external_editor.rs`

## 相关

- `subsys.tui.chatwidget`: 解释 `InputResult` 后如何提交/排队 user input。
- `subsys.tui.overlays-dialogs`: alternate-screen pager 与 bottom-pane modal 的区别。
- `subsys.tui.keymap`: composer/list/approval contexts 的 resolved bindings 与 chord capture。
