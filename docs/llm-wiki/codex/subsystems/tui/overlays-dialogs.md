---
id: subsys.tui.overlays-dialogs
title: Overlays 与 Dialogs
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/interaction.rs, codex-rs/tui/src/pager_overlay.rs, codex-rs/tui/src/resume_picker.rs, codex-rs/tui/src/resume_picker/page_loading.rs, codex-rs/tui/src/app/agent_picker.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/bottom_pane/bottom_pane_view.rs, codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/bottom_pane/app_link_view.rs, codex-rs/tui/src/bottom_pane/approval_overlay.rs, codex-rs/tui/src/bottom_pane/custom_prompt_view.rs, codex-rs/tui/src/bottom_pane/experimental_features_view.rs, codex-rs/tui/src/bottom_pane/feedback_view.rs, codex-rs/tui/src/bottom_pane/hooks_browser_view.rs, codex-rs/tui/src/bottom_pane/list_selection_view.rs, codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs, codex-rs/tui/src/bottom_pane/memories_settings_view.rs, codex-rs/tui/src/bottom_pane/multi_select_picker.rs, codex-rs/tui/src/bottom_pane/request_user_input/mod.rs, codex-rs/tui/src/bottom_pane/skills_toggle_view.rs, codex-rs/tui/src/bottom_pane/status_line_setup.rs, codex-rs/tui/src/bottom_pane/title_setup.rs]
symbols: [Overlay, TranscriptOverlay, StaticOverlay, PagerView, PickerState, PageLoadMode, ApprovalOverlay, McpServerElicitationOverlay, RequestUserInputOverlay]
related: [command.session-thread, subsys.tui.architecture, subsys.tui.bottom-pane, subsys.tui.event-system, subsys.tui.keymap]
evidence: explicit
status: verified
updated: 7750465934
---

> 当前 TUI 有两类”弹层”：alternate-screen pager `Overlay` 用于 transcript/diff 等全屏查看；bottom-pane `BottomPaneView` 用于 composer 区域内的 modal/popup。不要再引用已删除的 exit-confirmation 设计文档。[E: codex-rs/tui/src/pager_overlay.rs:53][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:20][E: codex-rs/tui/src/bottom_pane/mod.rs:226]

## 能回答的问题

- transcript/diff pager 和 bottom-pane dialogs 分别由什么类型承载？
- full-screen pager 如何进入 alternate screen？
- bottom-pane modal 的 key/paste/Ctrl-C 生命周期在哪里？
- 哪些具体 dialog 实现了 `BottomPaneView`？

## Pager Overlay

`pager_overlay.rs` 模块文档说明它实现 pager-style overlays，包括 `Ctrl+T` transcript overlay；transcript live tail 使用 active-cell key 缓存，避免每帧重建 expensive wrapped lines。[I]

`Overlay` enum 当前只有 `Transcript` 和 `Static`；constructor 覆盖 transcript、static lines、static renderables；`handle_event`/`is_done` 再按 variant 下发。[E: codex-rs/tui/src/pager_overlay.rs:53][E: codex-rs/tui/src/pager_overlay.rs:54][E: codex-rs/tui/src/pager_overlay.rs:55][E: codex-rs/tui/src/pager_overlay.rs:58][E: codex-rs/tui/src/pager_overlay.rs:59][E: codex-rs/tui/src/pager_overlay.rs:63][E: codex-rs/tui/src/pager_overlay.rs:71][E: codex-rs/tui/src/pager_overlay.rs:79][E: codex-rs/tui/src/pager_overlay.rs:86]

`PagerView` 保存 renderables、scroll offset、title、pager keymap、last content/rendered height 和 pending scroll chunk；这解释了 pager overlay 是 full-screen scrollable surface，而不是 bottom-pane stack。[E: codex-rs/tui/src/pager_overlay.rs:149][E: codex-rs/tui/src/pager_overlay.rs:150][E: codex-rs/tui/src/pager_overlay.rs:151][E: codex-rs/tui/src/pager_overlay.rs:152][E: codex-rs/tui/src/pager_overlay.rs:153][E: codex-rs/tui/src/pager_overlay.rs:154][E: codex-rs/tui/src/pager_overlay.rs:157]

## 进入路径

app input handler 在 transcript shortcut 命中时调用 `tui.enter_alt_screen()`，再把 `self.overlay` 设成 `Overlay::new_transcript(self.transcript_cells.clone(), self.keymap.pager.clone())` 并 schedule frame。[E: codex-rs/tui/src/app/input.rs:256][E: codex-rs/tui/src/app/input.rs:258][E: codex-rs/tui/src/app/input.rs:259][E: codex-rs/tui/src/app/input.rs:260][E: codex-rs/tui/src/app/input.rs:261][E: codex-rs/tui/src/app/input.rs:263]

`DiffResult` 分支也是 alternate-screen static overlay：先 `on_diff_complete`，enter alt screen，把 diff text 转成 lines 或空 diff message，然后 `Overlay::new_static_with_lines(..., "D I F F", pager keymap)`。[E: codex-rs/tui/src/app/event_dispatch.rs:524][E: codex-rs/tui/src/app/event_dispatch.rs:526][E: codex-rs/tui/src/app/event_dispatch.rs:528][E: codex-rs/tui/src/app/event_dispatch.rs:529][E: codex-rs/tui/src/app/event_dispatch.rs:532][E: codex-rs/tui/src/app/event_dispatch.rs:534][E: codex-rs/tui/src/app/event_dispatch.rs:536][E: codex-rs/tui/src/app/event_dispatch.rs:537]

## Standalone session 与 agent pickers

resume/fork picker 是独立 screen loop，不属于 `App.overlay` 或 `BottomPane.view_stack`。local workspace 的 resume 和 fork picker 首页都用 `StateDbOnly`，remote workspace 使用 `StoreDefault`。[E: codex-rs/tui/src/resume_picker.rs:384][E: codex-rs/tui/src/resume_picker.rs:387][E: codex-rs/tui/src/resume_picker.rs:406][E: codex-rs/tui/src/resume_picker.rs:436][E: codex-rs/tui/src/resume_picker.rs:439][E: codex-rs/tui/src/resume_picker.rs:458]

DB-first 只在初始 `StateDbOnly` 页无可用 rows 时 fallback 到 `StoreDefault`；SQLite 一旦返回任何 row，后续分页就以 DB 为权威，后续空页只代表 list end。[E: codex-rs/tui/src/resume_picker.rs:1346][E: codex-rs/tui/src/resume_picker.rs:1356][E: codex-rs/tui/src/resume_picker.rs:1359][E: codex-rs/tui/src/resume_picker.rs:1362][E: codex-rs/tui/src/resume_picker.rs:1369][E: codex-rs/tui/src/resume_picker.rs:1380]

thread sections 在本轮对 TUI 只是 protocol compatibility，不是新 UI：picker request 明确发 `section_id: None`，`ThreadSortKey::SectionPosition` 在 label/date 上按 Updated 处理，用户切换 sort 时下一步回到 Created。因此不应写成 TUI 已有 section grouping、move 或 manual ordering controls。[E: codex-rs/tui/src/resume_picker.rs:649][E: codex-rs/tui/src/resume_picker.rs:652][E: codex-rs/tui/src/resume_picker.rs:1687][E: codex-rs/tui/src/resume_picker.rs:1690][E: codex-rs/tui/src/resume_picker.rs:1898]

agent picker 打开时会在后台从 state DB 按 root ancestor 刷新 `SubAgentThreadSpawn` descendants，每页 100，总上限 1000，并用 request id 丢弃 stale completion。[E: codex-rs/tui/src/app/agent_picker.rs:13][E: codex-rs/tui/src/app/agent_picker.rs:14][E: codex-rs/tui/src/app/agent_picker.rs:15][E: codex-rs/tui/src/app/agent_picker.rs:18][E: codex-rs/tui/src/app/agent_picker.rs:33][E: codex-rs/tui/src/app/agent_picker.rs:45][E: codex-rs/tui/src/app/agent_picker.rs:49][E: codex-rs/tui/src/app/agent_picker.rs:52][E: codex-rs/tui/src/app/agent_picker.rs:79][E: codex-rs/tui/src/app/agent_picker.rs:93]

## Bottom-Pane Dialogs

`BottomPaneView` trait 是 bottom-pane modal contract：它定义 height/render/key/paste/pre-draw/request hooks、completion、Ctrl-C、paste-burst 和 dismissal behavior。[E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:20][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:23][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:32][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:37][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:46][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:55][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:91][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:113]

源码中直接实现 `BottomPaneView` 的 dialog/picker 包括 approval overlay、MCP server elicitation、request-user-input、app link、custom prompt、experimental features、feedback note、hooks browser、list selection、memories settings、multi-select picker、skills toggle、status line setup 和 title setup。[E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:565][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1515][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1188][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:690][E: codex-rs/tui/src/bottom_pane/custom_prompt_view.rs:128][E: codex-rs/tui/src/bottom_pane/experimental_features_view.rs:167][E: codex-rs/tui/src/bottom_pane/feedback_view.rs:93][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:574][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:952][E: codex-rs/tui/src/bottom_pane/memories_settings_view.rs:301][E: codex-rs/tui/src/bottom_pane/multi_select_picker.rs:517][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:235][E: codex-rs/tui/src/bottom_pane/status_line_setup.rs:373][E: codex-rs/tui/src/bottom_pane/title_setup.rs:347]

hooks browser 现在把 `SessionEnd` 作为独立 event row，并说明它在 session 结束前运行。skills toggle 的 display row 保留完整 skill 名，不再提前截断；宽度处理交给通用 list renderer。searchable list 为空时，empty message 也会与 search input 对齐。[E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:746][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:754][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:762][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:770][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:139][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:148][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:149][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:1292][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:1293]

bottom pane 的 key routing 给 active view 第一优先级；Ctrl-C 也先给 active view 的 `on_ctrl_c`，view complete 后才 pop view 并 request redraw。[E: codex-rs/tui/src/bottom_pane/mod.rs:617][E: codex-rs/tui/src/bottom_pane/mod.rs:619][E: codex-rs/tui/src/bottom_pane/mod.rs:639][E: codex-rs/tui/src/bottom_pane/mod.rs:656][E: codex-rs/tui/src/bottom_pane/mod.rs:718][E: codex-rs/tui/src/bottom_pane/mod.rs:719][E: codex-rs/tui/src/bottom_pane/mod.rs:723][E: codex-rs/tui/src/bottom_pane/mod.rs:725]

## Gotchas

- exit confirmation 设计文档已不存在；当前可证实的退出语义应从 `AppEvent::Exit`、`handle_exit_mode` 和 bottom-pane/ChatWidget Ctrl-C 代码重建。[E: codex-rs/tui/src/app_event.rs:315][E: codex-rs/tui/src/app/event_dispatch.rs:415][E: codex-rs/tui/src/app/event_dispatch.rs:2506][E: codex-rs/tui/src/chatwidget/interaction.rs:386][E: codex-rs/tui/src/chatwidget/interaction.rs:431]
- alternate-screen overlay 和 bottom-pane modal 不共享同一个 stack；前者存在 `App.overlay`，后者存在 `BottomPane.view_stack`。[E: codex-rs/tui/src/app.rs:533][E: codex-rs/tui/src/bottom_pane/mod.rs:226]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/interaction.rs`
- `codex-rs/tui/src/pager_overlay.rs`
- `codex-rs/tui/src/resume_picker.rs`
- `codex-rs/tui/src/resume_picker/page_loading.rs`
- `codex-rs/tui/src/app/agent_picker.rs`
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
- `subsys.tui.keymap`: pager/list/approval picker contexts 和 chord hints。
