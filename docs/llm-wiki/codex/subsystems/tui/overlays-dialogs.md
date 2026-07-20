---
id: subsys.tui.overlays-dialogs
title: Overlays 与 Dialogs
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/interaction.rs, codex-rs/tui/src/pager_overlay.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/bottom_pane/bottom_pane_view.rs, codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/bottom_pane/app_link_view.rs, codex-rs/tui/src/bottom_pane/approval_overlay.rs, codex-rs/tui/src/bottom_pane/custom_prompt_view.rs, codex-rs/tui/src/bottom_pane/experimental_features_view.rs, codex-rs/tui/src/bottom_pane/feedback_view.rs, codex-rs/tui/src/bottom_pane/hooks_browser_view.rs, codex-rs/tui/src/bottom_pane/list_selection_view.rs, codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs, codex-rs/tui/src/bottom_pane/memories_settings_view.rs, codex-rs/tui/src/bottom_pane/multi_select_picker.rs, codex-rs/tui/src/bottom_pane/request_user_input/mod.rs, codex-rs/tui/src/bottom_pane/skills_toggle_view.rs, codex-rs/tui/src/bottom_pane/status_line_setup.rs, codex-rs/tui/src/bottom_pane/title_setup.rs]
symbols: [Overlay, TranscriptOverlay, StaticOverlay, PagerView, ApprovalOverlay, McpServerElicitationOverlay, RequestUserInputOverlay]
related: [subsys.tui.architecture, subsys.tui.bottom-pane, subsys.tui.event-system]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> 当前 TUI 有两类”弹层”：alternate-screen pager `Overlay` 用于 transcript/diff 等全屏查看；bottom-pane `BottomPaneView` 用于 composer 区域内的 modal/popup。不要再引用已删除的 exit-confirmation 设计文档。[E: codex-rs/tui/src/pager_overlay.rs:53][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:19][E: codex-rs/tui/src/bottom_pane/mod.rs:219]

## 能回答的问题

- transcript/diff pager 和 bottom-pane dialogs 分别由什么类型承载？
- full-screen pager 如何进入 alternate screen？
- bottom-pane modal 的 key/paste/Ctrl-C 生命周期在哪里？
- 哪些具体 dialog 实现了 `BottomPaneView`？

## Pager Overlay

`pager_overlay.rs` 模块文档说明它实现 pager-style overlays，包括 `Ctrl+T` transcript overlay；transcript live tail 使用 active-cell key 缓存，避免每帧重建 expensive wrapped lines。[I]

`Overlay` enum 当前只有 `Transcript` 和 `Static`；constructor 覆盖 transcript、static lines、static renderables；`handle_event`/`is_done` 再按 variant 下发。[E: codex-rs/tui/src/pager_overlay.rs:53][E: codex-rs/tui/src/pager_overlay.rs:54][E: codex-rs/tui/src/pager_overlay.rs:55][E: codex-rs/tui/src/pager_overlay.rs:58][E: codex-rs/tui/src/pager_overlay.rs:59][E: codex-rs/tui/src/pager_overlay.rs:63][E: codex-rs/tui/src/pager_overlay.rs:71][E: codex-rs/tui/src/pager_overlay.rs:79][E: codex-rs/tui/src/pager_overlay.rs:86]

`PagerView` 保存 renderables、scroll offset、title、pager keymap、last content/rendered height 和 pending scroll chunk；这解释了 pager overlay 是 full-screen scrollable surface，而不是 bottom-pane stack。[E: codex-rs/tui/src/pager_overlay.rs:120][E: codex-rs/tui/src/pager_overlay.rs:121][E: codex-rs/tui/src/pager_overlay.rs:122][E: codex-rs/tui/src/pager_overlay.rs:123][E: codex-rs/tui/src/pager_overlay.rs:124][E: codex-rs/tui/src/pager_overlay.rs:125][E: codex-rs/tui/src/pager_overlay.rs:128]

## 进入路径

app input handler 在 transcript shortcut 命中时调用 `tui.enter_alt_screen()`，再把 `self.overlay` 设成 `Overlay::new_transcript(self.transcript_cells.clone(), self.keymap.pager.clone())` 并 schedule frame。[E: codex-rs/tui/src/app/input.rs:167][E: codex-rs/tui/src/app/input.rs:169][E: codex-rs/tui/src/app/input.rs:170][E: codex-rs/tui/src/app/input.rs:171][E: codex-rs/tui/src/app/input.rs:172][E: codex-rs/tui/src/app/input.rs:174]

`DiffResult` 分支也是 alternate-screen static overlay：先 `on_diff_complete`，enter alt screen，把 diff text 转成 lines 或空 diff message，然后 `Overlay::new_static_with_lines(..., "D I F F", pager keymap)`。[E: codex-rs/tui/src/app/event_dispatch.rs:486][E: codex-rs/tui/src/app/event_dispatch.rs:488][E: codex-rs/tui/src/app/event_dispatch.rs:490][E: codex-rs/tui/src/app/event_dispatch.rs:491][E: codex-rs/tui/src/app/event_dispatch.rs:494][E: codex-rs/tui/src/app/event_dispatch.rs:496][E: codex-rs/tui/src/app/event_dispatch.rs:498][E: codex-rs/tui/src/app/event_dispatch.rs:499]

## Bottom-Pane Dialogs

`BottomPaneView` trait 是 bottom-pane modal contract：它定义 height/render/key/paste/pre-draw/request hooks、completion、Ctrl-C、paste-burst 和 dismissal behavior。[E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:19][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:22][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:26][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:31][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:40][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:49][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:85][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:107]

源码中直接实现 `BottomPaneView` 的 dialog/picker 包括 approval overlay、MCP server elicitation、request-user-input、app link、custom prompt、experimental features、feedback note、hooks browser、list selection、memories settings、multi-select picker、skills toggle、status line setup 和 title setup。[E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:565][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1508][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1181][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:688][E: codex-rs/tui/src/bottom_pane/custom_prompt_view.rs:128][E: codex-rs/tui/src/bottom_pane/experimental_features_view.rs:166][E: codex-rs/tui/src/bottom_pane/feedback_view.rs:93][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:562][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:936][E: codex-rs/tui/src/bottom_pane/memories_settings_view.rs:300][E: codex-rs/tui/src/bottom_pane/multi_select_picker.rs:517][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:234][E: codex-rs/tui/src/bottom_pane/status_line_setup.rs:373][E: codex-rs/tui/src/bottom_pane/title_setup.rs:347]

hooks browser 现在把 `SessionEnd` 作为独立 event row，并说明它在 session 结束前运行。skills toggle 的 display row 保留完整 skill 名，不再提前截断；宽度处理交给通用 list renderer。searchable list 为空时，empty message 也会与 search input 对齐。[E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:730][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:738][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:746][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:754][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:138][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:147][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:148][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:1270][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:1271]

bottom pane 的 key routing 给 active view 第一优先级；Ctrl-C 也先给 active view 的 `on_ctrl_c`，view complete 后才 pop view 并 request redraw。[E: codex-rs/tui/src/bottom_pane/mod.rs:584][E: codex-rs/tui/src/bottom_pane/mod.rs:586][E: codex-rs/tui/src/bottom_pane/mod.rs:606][E: codex-rs/tui/src/bottom_pane/mod.rs:623][E: codex-rs/tui/src/bottom_pane/mod.rs:676][E: codex-rs/tui/src/bottom_pane/mod.rs:677][E: codex-rs/tui/src/bottom_pane/mod.rs:681][E: codex-rs/tui/src/bottom_pane/mod.rs:683]

## Gotchas

- exit confirmation 设计文档已不存在；当前可证实的退出语义应从 `AppEvent::Exit`、`handle_exit_mode` 和 bottom-pane/ChatWidget Ctrl-C 代码重建。[E: codex-rs/tui/src/app_event.rs:294][E: codex-rs/tui/src/app/event_dispatch.rs:393][E: codex-rs/tui/src/app/event_dispatch.rs:2451][E: codex-rs/tui/src/chatwidget/interaction.rs:364][E: codex-rs/tui/src/chatwidget/interaction.rs:409]
- alternate-screen overlay 和 bottom-pane modal 不共享同一个 stack；前者存在 `App.overlay`，后者存在 `BottomPane.view_stack`。[E: codex-rs/tui/src/app.rs:529][E: codex-rs/tui/src/bottom_pane/mod.rs:219]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/interaction.rs`
- `codex-rs/tui/src/pager_overlay.rs`
- `codex-rs/tui/src/app/input.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/bottom_pane/bottom_pane_view.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/bottom_pane/app_link_view.rs`
- `codex-rs/tui/src/bottom_pane/approval_overlay.rs`
- `codex-rs/tui/src/bottom_pane/custom_prompt_view.rs`
- `codex-rs/tui/src/bottom_pane/experimental_features_view.rs`
- `codex-rs/tui/src/bottom_pane/feedback_view.rs`
- `codex-rs/tui/src/bottom_pane/hooks_browser_view.rs`
- `codex-rs/tui/src/bottom_pane/list_selection_view.rs`
- `codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs`
- `codex-rs/tui/src/bottom_pane/memories_settings_view.rs`
- `codex-rs/tui/src/bottom_pane/multi_select_picker.rs`
- `codex-rs/tui/src/bottom_pane/request_user_input/mod.rs`
- `codex-rs/tui/src/bottom_pane/skills_toggle_view.rs`
- `codex-rs/tui/src/bottom_pane/status_line_setup.rs`
- `codex-rs/tui/src/bottom_pane/title_setup.rs`

## 相关

- `subsys.tui.bottom-pane`: bottom-pane view stack 和 input routing。
- `subsys.tui.event-system`: overlay entry events 和 exit dispatch。
