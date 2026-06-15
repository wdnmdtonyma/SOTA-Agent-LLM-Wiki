---
id: subsys.tui.overlays-dialogs
title: Overlays 与 dialogs
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/pager_overlay.rs
  - codex-rs/tui/src/bottom_pane
  - docs/exit-confirmation-prompt-design.md
symbols:
  - Overlay
  - PagerView
  - TranscriptOverlay
  - ApprovalOverlay
  - RequestUserInputOverlay
related:
  - subsys.tui.bottom-pane
  - subsys.tui.chatwidget
  - subsys.tui.event-system
evidence: explicit
status: verified
updated: 37aadeaa13
---

TUI overlays/dialogs 分成两类：全屏 transcript/static pager overlay 由 `Overlay` enum 管理，bottom pane dialogs 由 `BottomPaneView` view stack 管理；`Overlay` 当前有 `Transcript` 和 `Static` 两个变体 [E: codex-rs/tui/src/pager_overlay.rs:48][E: codex-rs/tui/src/pager_overlay.rs:49][E: codex-rs/tui/src/pager_overlay.rs:50][E: codex-rs/tui/src/bottom_pane/mod.rs:180][E: codex-rs/tui/src/bottom_pane/mod.rs:181][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:17]。

## 能回答的问题

- transcript pager 如何 live tail、scroll、insert/replace cells。
- bottom pane dialog 如何接收 approval、request user input、MCP elicitation、tool suggestion。
- server request resolve notification 为什么需要按 thread listener 顺序发送。
- exit confirmation 设计如何处理 Ctrl-C、Ctrl-D、slash command 和 `/new`。

## 职责边界

- `Overlay` 负责 full-screen pager 类覆盖层；它有自己的 `handle_event` 与 `is_done` 分发，和 `BottomPane` 的 `view_stack` 是两套 UI 容器 [E: codex-rs/tui/src/pager_overlay.rs:69][E: codex-rs/tui/src/pager_overlay.rs:76][E: codex-rs/tui/src/bottom_pane/mod.rs:180][E: codex-rs/tui/src/bottom_pane/mod.rs:181][I]。
- bottom pane dialogs 统一实现 `BottomPaneView` hook；bottom pane 在 active view key routing、completion pop、request consumption 和 dismiss path 中管理这些 view，approval overlay、user input overlay、MCP elicitation overlay 和 app link view 都属于这个模型 [E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:17][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:21][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:24][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:29][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:91][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:100][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:109][E: codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:118][E: codex-rs/tui/src/bottom_pane/mod.rs:432][E: codex-rs/tui/src/bottom_pane/mod.rs:473][E: codex-rs/tui/src/bottom_pane/mod.rs:965][E: codex-rs/tui/src/bottom_pane/mod.rs:1025][E: codex-rs/tui/src/bottom_pane/mod.rs:1093][E: codex-rs/tui/src/bottom_pane/mod.rs:1120][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:458][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1010][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1510][E: codex-rs/tui/src/bottom_pane/app_link_view.rs:393]。
- exit confirmation 设计文档定义的是 event model、shutdown completion boundary 和 edge-case invariants；具体实现分散在 bottom pane/chat widget exit handling 是从设计文档和模块分工得出的实现定位 [E: docs/exit-confirmation-prompt-design.md:17][E: docs/exit-confirmation-prompt-design.md:27][E: docs/exit-confirmation-prompt-design.md:66][E: docs/exit-confirmation-prompt-design.md:73][I]。

## 关键 crate/文件

- `codex-rs/tui/src/pager_overlay.rs`: transcript/static pager overlay。
- `codex-rs/tui/src/bottom_pane/approval_overlay.rs`: exec/permissions/apply patch/MCP elicitation approval。
- `codex-rs/tui/src/bottom_pane/request_user_input/mod.rs`: multi-question user input overlay。
- `codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs`: MCP form/message-only/tool suggestion overlay。
- `codex-rs/tui/src/bottom_pane/app_link_view.rs`: app link and tool suggestion install/enable view。
- `docs/exit-confirmation-prompt-design.md`: exit prompt behavior model。

## 数据模型

- `PagerView` 保存 renderables、scroll、title、cached heights 和 pending scroll chunk，用于计算 content height、render header/content/bottom bar [E: codex-rs/tui/src/pager_overlay.rs:136][E: codex-rs/tui/src/pager_overlay.rs:137][E: codex-rs/tui/src/pager_overlay.rs:138][E: codex-rs/tui/src/pager_overlay.rs:139][E: codex-rs/tui/src/pager_overlay.rs:140][E: codex-rs/tui/src/pager_overlay.rs:142][E: codex-rs/tui/src/pager_overlay.rs:157][E: codex-rs/tui/src/pager_overlay.rs:166][E: codex-rs/tui/src/pager_overlay.rs:180][E: codex-rs/tui/src/pager_overlay.rs:182]。
- `TranscriptOverlay` 保存 pager view、committed cells、highlight cell 和 live tail key，支持 transcript 更新时在原本位于底部的情况下滚到底部，否则保留用户滚动位置 [E: codex-rs/tui/src/pager_overlay.rs:423][E: codex-rs/tui/src/pager_overlay.rs:428][E: codex-rs/tui/src/pager_overlay.rs:430][E: codex-rs/tui/src/pager_overlay.rs:431][E: codex-rs/tui/src/pager_overlay.rs:433][E: codex-rs/tui/src/pager_overlay.rs:520][E: codex-rs/tui/src/pager_overlay.rs:544][E: codex-rs/tui/src/pager_overlay.rs:545][E: codex-rs/tui/src/pager_overlay.rs:597][E: codex-rs/tui/src/pager_overlay.rs:612][E: codex-rs/tui/src/pager_overlay.rs:613][I]。
- `ApprovalRequest` 统一表示 exec approval、permissions request、apply patch approval 和 MCP elicitation approval [E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:53][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:63][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:70][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:78]。
- `RequestUserInputOverlay` 保存 request/questions、focus、current question index、answer state、composer 和 pending composer draft；option selection 与 free-form notes 同屏工作是从字段组合得出的 UI 行为推断 [E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:125][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:130][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:132][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:133][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:134][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:136][I]。
- MCP elicitation parser 支持 object schema 中的 string/boolean/enum 字段；number 和 multiselect 等不支持时返回 None [E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:555][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:588][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:599][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:625][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:657][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:660][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:661]。

## 控制流

1. `Overlay::handle_event` 根据 `Transcript` 或 `Static` 调用对应 overlay handler；`Overlay::is_done` 同理委派 [E: codex-rs/tui/src/pager_overlay.rs:69][E: codex-rs/tui/src/pager_overlay.rs:71][E: codex-rs/tui/src/pager_overlay.rs:72][E: codex-rs/tui/src/pager_overlay.rs:76][E: codex-rs/tui/src/pager_overlay.rs:78][E: codex-rs/tui/src/pager_overlay.rs:79]。
2. `PagerView` 的 key handler 支持 Up/Down/PageUp/PageDown/Home/End 等滚动键，处理后 schedule frame [E: codex-rs/tui/src/pager_overlay.rs:263][E: codex-rs/tui/src/pager_overlay.rs:264][E: codex-rs/tui/src/pager_overlay.rs:266][E: codex-rs/tui/src/pager_overlay.rs:269][E: codex-rs/tui/src/pager_overlay.rs:276][E: codex-rs/tui/src/pager_overlay.rs:290][E: codex-rs/tui/src/pager_overlay.rs:293][E: codex-rs/tui/src/pager_overlay.rs:300]。
3. transcript overlay 插入 cell 时会 render new cell、保留/重挂 live tail，并在原本位于底部时滚到底部；replace cells 会替换 cell 列表并重新渲染 [E: codex-rs/tui/src/pager_overlay.rs:520][E: codex-rs/tui/src/pager_overlay.rs:523][E: codex-rs/tui/src/pager_overlay.rs:524][E: codex-rs/tui/src/pager_overlay.rs:544][E: codex-rs/tui/src/pager_overlay.rs:545][E: codex-rs/tui/src/pager_overlay.rs:554][E: codex-rs/tui/src/pager_overlay.rs:556][E: codex-rs/tui/src/pager_overlay.rs:563][E: codex-rs/tui/src/pager_overlay.rs:565][E: codex-rs/tui/src/pager_overlay.rs:597][E: codex-rs/tui/src/pager_overlay.rs:612][E: codex-rs/tui/src/pager_overlay.rs:613]。
4. approval overlay 根据当前 request 构造 options，选中后分发 exec/permissions/patch/elicitation decision，并 advance queue [E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:194][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:263][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:304][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:321][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:366][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:378][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:401]。
5. request user input overlay submit 时构造 `HashMap` answers，调用 `user_input_answer`，并插入 `RequestUserInputResultCell` [E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:730][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:754][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:759][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:761][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:768]。
6. MCP elicitation submit 时会校验 required fields，approval action 转成 `ElicitationAction`，form content 转成 JSON object [E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1161][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1167][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1170][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1183][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1198][E: codex-rs/tui/src/bottom_pane/mcp_server_elicitation.rs:1210]。

## 设计动机与权衡

- transcript overlay 将 live transcript 与 scrollback 分离，`LiveTailKey` 和 `sync_live_tail` 的 `follow_bottom` 逻辑只在 overlay 已经位于底部时把 scroll offset 设到 bottom，因此“用户停在历史位置时不被新消息强制拉到底部”是从该条件判断得出的行为推断 [E: codex-rs/tui/src/pager_overlay.rs:441][E: codex-rs/tui/src/pager_overlay.rs:581][E: codex-rs/tui/src/pager_overlay.rs:597][E: codex-rs/tui/src/pager_overlay.rs:612][E: codex-rs/tui/src/pager_overlay.rs:613][I]。
- approval overlay 把多种 approval request 聚合到同一个 queue；“避免多个 bottom pane views 竞争同一块底部区域”是从 queue + single active bottom-pane view model 得出的设计推断 [E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:139][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:164][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:165][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:401][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:402][I]。
- exit confirmation 设计规定 Ctrl-C 优先给 active modal/view，cancellable work 时提交 interrupt，`ShutdownComplete` 是 cleanup finished 的边界；这些规则的目的包括避免 running turn/approval 状态被突然丢弃 [E: docs/exit-confirmation-prompt-design.md:34][E: docs/exit-confirmation-prompt-design.md:36][E: docs/exit-confirmation-prompt-design.md:44][E: docs/exit-confirmation-prompt-design.md:66][E: docs/exit-confirmation-prompt-design.md:70][E: docs/exit-confirmation-prompt-design.md:75][I]。

## gotcha

- `ApprovalOverlay::advance_queue` 使用 `queue.pop()`，enqueue 使用 `queue.push(req)`；调试 approval 顺序时需要确认 Vec push/pop 的同端 LIFO 语义 [E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:139][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:164][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:165][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:401][E: codex-rs/tui/src/bottom_pane/approval_overlay.rs:402]。
- request user input overlay 的 Esc 不只是关闭；当 unanswered confirmation 已经打开时 Esc 先进入 confirmation handler，普通选项+notes 状态下 Esc 会清空 notes 并回到 options，未回答确认本身由 submit/next flow 打开而不是由 Esc 打开 [E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:716][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:793][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1020][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1021][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1025][E: codex-rs/tui/src/bottom_pane/request_user_input/mod.rs:1027]。
- websocket/server request resolved 通知需要在 thread listener 上排队发送，`ResolveServerRequest` command 注释强调这样做是为了和 request 本身保持顺序 [E: codex-rs/app-server/src/thread_state.rs:40][E: codex-rs/app-server/src/thread_state.rs:41]。

## Sources

- `codex-rs/tui/src/pager_overlay.rs`
- `codex-rs/tui/src/bottom_pane`
- `docs/exit-confirmation-prompt-design.md`

## 相关

- `subsys.tui.bottom-pane`
- `subsys.tui.chatwidget`
- `subsys.tui.event-system`
