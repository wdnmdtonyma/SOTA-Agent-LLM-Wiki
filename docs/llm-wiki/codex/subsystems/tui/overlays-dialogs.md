---
id: subsys.tui.overlays-dialogs
title: Overlays 与 Dialogs
kind: subsystem
tier: T2
source: [codex-rs/tui/src/app.rs, codex-rs/tui/src/app_event.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/interaction.rs, codex-rs/tui/src/chatwidget/model_popup_state.rs, codex-rs/tui/src/chatwidget/permission_popups.rs, codex-rs/tui/src/chatwidget/permission_discovery.rs, codex-rs/tui/src/pager_overlay.rs, codex-rs/tui/src/resume_picker.rs, codex-rs/tui/src/resume_picker/page_loading.rs, codex-rs/tui/src/resume_picker_transcript_preview.rs, codex-rs/tui/src/named_session_lookup.rs, codex-rs/tui/src/app/agent_picker.rs, codex-rs/tui/src/app/input.rs, codex-rs/tui/src/app/event_dispatch.rs, codex-rs/tui/src/app/history_pagination.rs, codex-rs/tui/src/bottom_pane/bottom_pane_view.rs, codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/bottom_pane/app_link_view.rs, codex-rs/tui/src/bottom_pane/approval_overlay.rs, codex-rs/tui/src/bottom_pane/custom_prompt_view.rs, codex-rs/tui/src/bottom_pane/experimental_features_view.rs, codex-rs/tui/src/bottom_pane/feedback_note_view.rs, codex-rs/tui/src/bottom_pane/hooks_browser_view.rs, codex-rs/tui/src/bottom_pane/list_selection_view.rs, codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs, codex-rs/tui/src/bottom_pane/memories_settings_view.rs, codex-rs/tui/src/bottom_pane/multi_select_picker.rs, codex-rs/tui/src/bottom_pane/request_user_input/mod.rs, codex-rs/tui/src/bottom_pane/skills_toggle_view.rs, codex-rs/tui/src/bottom_pane/status_line_setup.rs, codex-rs/tui/src/bottom_pane/title_setup.rs, codex-rs/tui/src/permission_discovery.rs]
symbols: [Overlay, TranscriptOverlay, StaticOverlay, PagerView, PickerState, PageLoadMode, ApprovalOverlay, McpServerElicitationOverlay, RequestUserInputOverlay, load_transcript_preview, NamedSessionCandidates]
related: [command.session-thread, command.code-review, subsys.tui.architecture, subsys.tui.bottom-pane, subsys.tui.event-system, subsys.tui.keymap, rpc.thread-methods]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> 当前 TUI 有两类弹层：alternate-screen pager `Overlay` 用于 transcript/diff 等全屏查看；bottom-pane `BottomPaneView` 用于 composer 区域内的 modal/popup。resume/fork picker 是独立 screen loop，带 paginated listing 和 bounded transcript preview。TUI 仍没有 thread-section CRUD UI。[E: codex-rs/tui/src/pager_overlay.rs:58][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:20][E: codex-rs/tui/src/resume_picker.rs:405][E: codex-rs/tui/src/resume_picker.rs:2070]

## 能回答的问题

- transcript/diff pager 和 bottom-pane dialogs 分别由什么类型承载？
- full-screen pager 如何进入 alternate screen，又如何加载更旧 history？
- resume picker 的 transcript preview 读多少行？
- 按名字 resume 时 lookup 如何分页？
- TUI 有没有 thread section grouping / move / ordering controls？
- model picker 打开时异步 catalog refresh 会不会重开 overlay？
- `/permissions` 是否只列本地 preset，还是会拉 remote named profiles？

## Pager Overlay

`Overlay` enum 当前只有 `Transcript` 和 `Static`；constructor 覆盖 transcript、static lines、static renderables；`handle_event`/`is_done` 再按 variant 下发。[E: codex-rs/tui/src/pager_overlay.rs:58][E: codex-rs/tui/src/pager_overlay.rs:59][E: codex-rs/tui/src/pager_overlay.rs:68][E: codex-rs/tui/src/pager_overlay.rs:68][E: codex-rs/tui/src/pager_overlay.rs:76][E: codex-rs/tui/src/pager_overlay.rs:84]

`PagerView` 保存 renderables、scroll offset、title、pager keymap、last content/rendered height 和 pending scroll chunk。[E: codex-rs/tui/src/pager_overlay.rs:158][E: codex-rs/tui/src/pager_overlay.rs:155][E: codex-rs/tui/src/pager_overlay.rs:156][E: codex-rs/tui/src/pager_overlay.rs:158][E: codex-rs/tui/src/pager_overlay.rs:164]

app input handler 在 transcript shortcut 命中时记录 `scrollback_has_older_history`，再打开 transcript overlay。[E: codex-rs/tui/src/app/input.rs:408][E: codex-rs/tui/src/app/input.rs:412]

`DiffResult` 分支也是 alternate-screen static overlay：先 `on_diff_complete`，enter alt screen，把 diff text 转成 lines 或空 diff message，然后 `Overlay::new_static_with_lines(..., "D I F F", pager keymap)`。[E: codex-rs/tui/src/app/event_dispatch.rs:892][E: codex-rs/tui/src/app/event_dispatch.rs:897][E: codex-rs/tui/src/app/event_dispatch.rs:899][E: codex-rs/tui/src/app/event_dispatch.rs:905][E: codex-rs/tui/src/app/event_dispatch.rs:908]

Ctrl+T overlay 需要更旧页时走 `App::request_older_history_page`：它用 `thread/items` 分页，prepend 到 overlay/transcript cells。overlay 顶部继续滚到开头时会把 history state 设为 `LoadingBeginning` 再请求下一页。[E: codex-rs/tui/src/app/history_pagination.rs:18][E: codex-rs/tui/src/app/history_pagination.rs:23][E: codex-rs/tui/src/app/history_pagination.rs:221][E: codex-rs/tui/src/app/history_pagination.rs:229][E: codex-rs/tui/src/app/history_pagination.rs:250]

## Standalone session picker、preview 与 named lookup

resume/fork picker 是独立 screen loop，不属于 `App.overlay` 或 `BottomPane.view_stack`。local workspace 的 resume 和 fork picker 首页都用 `StateDbOnly`，remote workspace 使用 `StoreDefault`。[E: codex-rs/tui/src/resume_picker.rs:461][E: codex-rs/tui/src/resume_picker.rs:464][E: codex-rs/tui/src/resume_picker/page_loading.rs:37][E: codex-rs/tui/src/resume_picker/page_loading.rs:41]

DB-first 只在初始 `StateDbOnly` 页无可用 rows 时 fallback 到 `StoreDefault`；SQLite 一旦返回任何 row，后续分页就以 DB 为权威，后续空页只代表 list end。[E: codex-rs/tui/src/resume_picker.rs:1487][E: codex-rs/tui/src/resume_picker.rs:1489][E: codex-rs/tui/src/resume_picker.rs:1497]

`load_transcript_preview` 最多收集 6 条 transcript 行。Paginated thread 先读 6 条 item，不够再按 `HISTORY_ITEM_PAGE_LIMIT` 继续扫，总扫描上限是 `HISTORY_ITEM_SCAN_LIMIT`。[E: codex-rs/tui/src/resume_picker_transcript_preview.rs:27][E: codex-rs/tui/src/resume_picker_transcript_preview.rs:32][E: codex-rs/tui/src/resume_picker_transcript_preview.rs:101][E: codex-rs/tui/src/resume_picker_transcript_preview.rs:105]

按名字 resume 走 `named_session_lookup::lookup`：对每个 collection/source-kind 发 `thread_list`，limit 100，`section_id` 固定为 `None`。remote workspace 不校验 local rollout path；embedded 与 remote 的 sort key 分别是 `RecencyAt` / `UpdatedAt`。[E: codex-rs/tui/src/named_session_lookup.rs:48][E: codex-rs/tui/src/named_session_lookup.rs:64][E: codex-rs/tui/src/named_session_lookup.rs:74][E: codex-rs/tui/src/named_session_lookup.rs:80][E: codex-rs/tui/src/named_session_lookup.rs:95]

thread sections 在 TUI 仍只是 protocol compatibility，不是新 UI：picker request 明确发 `section_id: None`，`ThreadSortKey::SectionPosition` 在 label/date 上按 Updated 处理，用户切换 sort 时下一步回到 Created。TUI 没有 section grouping、move 或 manual ordering controls。[E: codex-rs/tui/src/resume_picker.rs:1848][E: codex-rs/tui/src/resume_picker.rs:1851][E: codex-rs/tui/src/resume_picker.rs:2070]

agent picker 打开时会在后台从 state DB 按 root ancestor 刷新 `SubAgentThreadSpawn` descendants，每页 100，总上限 1000，并用 request id 丢弃 stale completion。[E: codex-rs/tui/src/app/agent_picker.rs:14][E: codex-rs/tui/src/app/agent_picker.rs:15][E: codex-rs/tui/src/app/agent_picker.rs:18][E: codex-rs/tui/src/app/agent_picker.rs:42][E: codex-rs/tui/src/app/agent_picker.rs:46][E: codex-rs/tui/src/app/agent_picker.rs:54]

## Bottom-Pane Dialogs

`BottomPaneView` trait 是 bottom-pane modal contract：它定义 height/render/key/paste/pre-draw/request hooks、completion、Ctrl-C、paste-burst 和 dismissal behavior。[E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:20]

源码中直接实现 `BottomPaneView` 的 dialog/picker 包括 approval overlay、MCP server elicitation、request-user-input、app link、custom prompt、experimental features、feedback note、hooks browser、list selection、memories settings、multi-select picker、skills toggle、status line setup 和 title setup。[E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:579][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1515][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1188][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:690][E: codex-rs/tui/src/bottom_pane/custom_prompt_view.rs:194][E: codex-rs/tui/src/bottom_pane/experimental_features_view.rs:262][E: codex-rs/tui/src/bottom_pane/feedback_note_view.rs:95][E: codex-rs/tui/src/bottom_pane/hooks_browser_view.rs:597][E: codex-rs/tui/src/bottom_pane/list_selection_view.rs:977][E: codex-rs/tui/src/bottom_pane/memories_settings_view.rs:301][E: codex-rs/tui/src/bottom_pane/multi_select_picker.rs:517][E: codex-rs/tui/src/bottom_pane/skills_toggle_view.rs:235][E: codex-rs/tui/src/bottom_pane/status_line_setup.rs:398][E: codex-rs/tui/src/bottom_pane/title_setup.rs:365]

bottom pane 的 key routing 给 active view 第一优先级；Ctrl-C 也先给 active view 的 `on_ctrl_c`，view complete 后才 pop view 并 request redraw。[E: codex-rs/tui/src/bottom_pane/mod.rs:727][E: codex-rs/tui/src/bottom_pane/mod.rs:849]

## Permission profiles picker

`/permissions` 不再假装只能列本地 builtin presets。explicit named-profile mode、已经打开过 named menu、或当前 active profile id 不以 `:` 开头时，会走 `request_permission_profiles`：先显示 loading `list_selection_view`，再发 `FetchPermissionProfiles`。[E: codex-rs/tui/src/chatwidget/permission_popups.rs:17][E: codex-rs/tui/src/chatwidget/permission_discovery.rs:16][E: codex-rs/tui/src/chatwidget/permission_discovery.rs:31]

`permission_discovery::fetch` 对 remote workspace 会 `PermissionProfileList`（limit 100、最多 10 页）并读 `ConfigRequirements`；embedded 且 session-flags 覆盖了 `permissions` 时才用本地 `PermissionDiscovery::local`。结果经 `PermissionProfilesLoaded` 进 `on_permission_profiles_loaded`。[E: codex-rs/tui/src/permission_discovery.rs:34][E: codex-rs/tui/src/permission_discovery.rs:116][E: codex-rs/tui/src/permission_discovery.rs:151][E: codex-rs/tui/src/app/event_dispatch.rs:1680][E: codex-rs/tui/src/chatwidget/permission_discovery.rs:46]

## Model picker in-place refresh

model 选择走 bottom-pane `list_selection_view`，不是 alternate-screen overlay。`ChatWidget::on_models_loaded` 只接受当前 `model_popup_request_id` 的回复；空 catalog、obsolete request、或与现有 `model_catalog` 完全相同的列表直接丢掉。打开中的 parent picker 由 `refresh_open_model_picker` / `replace_selection_view_if_present` 刷新，不打断 reasoning submenu。[E: codex-rs/tui/src/chatwidget/model_popup_state.rs:22][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:28][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:46][E: codex-rs/tui/src/chatwidget/model_popup_state.rs:69]

## Gotchas

- exit confirmation 设计文档已不存在；当前可证实的退出语义应从 `AppEvent::Exit`、`handle_exit_mode` 和 bottom-pane/ChatWidget Ctrl-C 代码重建。[E: codex-rs/tui/src/app_event.rs:529][E: codex-rs/tui/src/app/event_dispatch.rs:3312]
- alternate-screen overlay 和 bottom-pane modal 不共享同一个 stack；前者存在 `App.overlay`，后者存在 `BottomPane.view_stack`。[E: codex-rs/tui/src/app.rs:574][E: codex-rs/tui/src/bottom_pane/mod.rs:248]
- TUI 没有 thread-section CRUD；`section_id: None` 只是 list API 兼容字段，不要写成已有 section UI。app-server 侧的 section RPC 见 [`rpc.thread-methods`](../../surface/app-server/thread-methods.md)。[E: codex-rs/tui/src/resume_picker.rs:2070][E: codex-rs/tui/src/named_session_lookup.rs:80]

## Sources

- `codex-rs/tui/src/app.rs`
- `codex-rs/tui/src/app_event.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/interaction.rs`
- `codex-rs/tui/src/chatwidget/model_popup_state.rs`
- `codex-rs/tui/src/chatwidget/permission_popups.rs`
- `codex-rs/tui/src/chatwidget/permission_discovery.rs`
- `codex-rs/tui/src/pager_overlay.rs`
- `codex-rs/tui/src/resume_picker.rs`
- `codex-rs/tui/src/resume_picker/page_loading.rs`
- `codex-rs/tui/src/resume_picker_transcript_preview.rs`
- `codex-rs/tui/src/named_session_lookup.rs`
- `codex-rs/tui/src/app/agent_picker.rs`
- `codex-rs/tui/src/app/input.rs`
- `codex-rs/tui/src/app/event_dispatch.rs`
- `codex-rs/tui/src/app/history_pagination.rs`
- `codex-rs/tui/src/bottom_pane/bottom_pane_view.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/bottom_pane/app_link_view.rs`
- `codex-rs/tui/src/bottom_pane/approval_overlay.rs`
- `codex-rs/tui/src/bottom_pane/custom_prompt_view.rs`
- `codex-rs/tui/src/bottom_pane/experimental_features_view.rs`
- `codex-rs/tui/src/bottom_pane/feedback_note_view.rs`
- `codex-rs/tui/src/bottom_pane/hooks_browser_view.rs`
- `codex-rs/tui/src/bottom_pane/list_selection_view.rs`
- `codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs`
- `codex-rs/tui/src/bottom_pane/memories_settings_view.rs`
- `codex-rs/tui/src/bottom_pane/multi_select_picker.rs`
- `codex-rs/tui/src/bottom_pane/request_user_input/mod.rs`
- `codex-rs/tui/src/bottom_pane/skills_toggle_view.rs`
- `codex-rs/tui/src/bottom_pane/status_line_setup.rs`
- `codex-rs/tui/src/bottom_pane/title_setup.rs`
- `codex-rs/tui/src/permission_discovery.rs`

## 相关

- `subsys.tui.bottom-pane`: bottom-pane view stack 和 input routing。
- `subsys.tui.event-system`: overlay entry events 和 exit dispatch。
- `subsys.tui.keymap`: pager/list/approval picker contexts 和 chord hints。
- `rpc.thread-methods`: app-server thread section CRUD catalog；TUI 不实现对应 UI。
