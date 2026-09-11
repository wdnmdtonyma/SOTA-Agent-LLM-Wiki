---
id: subsys.tui.status-surfaces
title: Status Surfaces
kind: subsystem
tier: T2
source: [codex-rs/tui/src/status/card.rs, codex-rs/tui/src/status/rate_limits.rs, codex-rs/tui/src/status/helpers.rs, codex-rs/tui/src/status/thread_usage.rs, codex-rs/tui/src/chatwidget/status_surfaces.rs, codex-rs/tui/src/chatwidget/thread_usage.rs, codex-rs/tui/src/chatwidget/usage.rs, codex-rs/tui/src/chatwidget/reset_credits.rs, codex-rs/tui/src/chatwidget/goal_menu.rs, codex-rs/tui/src/goal_display.rs, codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/chatwidget.rs, codex-rs/tui/src/chatwidget/rate_limits.rs, codex-rs/tui/src/chatwidget/backend_banners.rs, codex-rs/protocol/src/account.rs]
symbols: [StatusHistoryCell, StatusHistoryHandle, StatusRateLimitData, RateLimitSnapshotDisplay, StatusThreadUsage, plan_type_display_name, goal_status_label, ChatWidget::status_surface_selections, ChatWidget::open_usage_menu, ResetCreditOption, reset_credit_options, BottomPane::set_task_running, RateLimitWarningState, BackendBannerState]
related: [subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Status surfaces 包括 `/status` history card、running-task inline status、status line/terminal title selections、rate-limit display shaping 和 demand-driven thread usage。这些状态横跨 `status/*`、`chatwidget/status_surfaces.rs`、`chatwidget/thread_usage.rs`、`BottomPane` 和 `ChatWidget`。[E: codex-rs/tui/src/status/card.rs:226][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:107][E: codex-rs/tui/src/chatwidget/thread_usage.rs:38][E: codex-rs/tui/src/bottom_pane/mod.rs:1207][E: codex-rs/tui/src/chatwidget.rs:811]

## 能回答的问题

- `/status` card 保存哪些 display state？
- thread usage 如何异步写回同一张 `/status` card？
- rate-limit snapshot 如何被转换成 display-friendly rows？
- threshold warning 与 backend `rate_limit_upsell` banner 怎样分层？
- status line 和 terminal title 的 invalid items 如何 warning？
- running-task status indicator 属于 bottom pane 还是 ChatWidget？

## Status Card

`StatusHistoryHandle` 同时暴露 rate-limit refresh 和 thread usage：`finish_rate_limit_refresh` 按条数选择 single/many compose path；`set_thread_usage` 把 backend `ThreadUsage` 写进共享 `StatusThreadUsage`。[E: codex-rs/tui/src/status/card.rs:80][E: codex-rs/tui/src/status/card.rs:145][E: codex-rs/tui/src/status/card.rs:100][E: codex-rs/tui/src/status/card.rs:120]

`StatusHistoryCell` 保存 model details、directory、permissions、agent summary、collaboration mode、provider、remote connection、account、thread/session/fork data、token usage、rate-limit state 和 thread usage。[E: codex-rs/tui/src/status/card.rs:129][E: codex-rs/tui/src/status/card.rs:130][E: codex-rs/tui/src/status/card.rs:133][E: codex-rs/tui/src/status/card.rs:137]

`new_status_output_with_rate_limits_handle` 构造一个 `/status` command cell 和 `StatusHistoryCell`，并返回 `CompositeHistoryCell` 与 handle；调用者可在异步 rate-limit / thread-usage refresh 完成后更新同一个 card。[E: codex-rs/tui/src/status/card.rs:226]

## Thread usage

`StatusThreadUsage` 是可共享的 estimate 容器。`/status` 打开时 `ChatWidget::request_thread_usage_for_status` 把 handle 挂上去；estimate 到达后 card 渲染 `Thread usage` 行（credits / 可选 USD）以及 Models / Reasoning / Speed / billed tokens 分组。[E: codex-rs/tui/src/status/thread_usage.rs:37][E: codex-rs/tui/src/status/thread_usage.rs:48][E: codex-rs/tui/src/status/thread_usage.rs:71][E: codex-rs/tui/src/status/thread_usage.rs:100][E: codex-rs/tui/src/chatwidget/thread_usage.rs:145]

status line / terminal title 只有选了 `ThreadCredits` 或 `EstimatedThreadCost` 才会主动 request。异步到达前可以 `reserve_thread_usage_label_width`，避免后续 rows 把已有 card 挤偏；它不会画 loading placeholder。[E: codex-rs/tui/src/chatwidget/thread_usage.rs:371][E: codex-rs/tui/src/status/thread_usage.rs:43][E: codex-rs/tui/src/status/thread_usage.rs:60]

turn 结束后 ChatWidget 按 15s/60s/120s 再结算；临时失败按 5s/15s/60s 重试。resume replay 的 turn completion 不会启动 settlement。[E: codex-rs/tui/src/chatwidget/thread_usage.rs:20][E: codex-rs/tui/src/chatwidget/thread_usage.rs:25][E: codex-rs/tui/src/chatwidget/thread_usage.rs:80]

## User-Facing Labels

plan label 不是 protocol variant 的直接 title-case：`EnterpriseCbpAutomation` 显示为 `Enterprise (Automation)`，`SelfServeBusinessProLite` 显示为 `Business Premium`，team-like variants 显示为 `Business`，business-like variants 显示为 `Enterprise`，`ProLite` 显示为 `Pro Lite`。[E: codex-rs/tui/src/status/helpers.rs:99][E: codex-rs/tui/src/status/helpers.rs:100][E: codex-rs/tui/src/status/helpers.rs:102][E: codex-rs/tui/src/status/helpers.rs:104][E: codex-rs/tui/src/status/helpers.rs:106][E: codex-rs/tui/src/status/helpers.rs:108]

goal protocol status 仍是 `Blocked`，但两处 TUI label 都显式显示为 `stalled`：history/status display 使用 `ThreadGoalStatus`，goal menu 使用 `AppThreadGoalStatus`。[E: codex-rs/tui/src/goal_display.rs:33][E: codex-rs/tui/src/goal_display.rs:37][E: codex-rs/tui/src/chatwidget/goal_menu.rs:122][E: codex-rs/tui/src/chatwidget/goal_menu.rs:126]

## Rate-Limit Display

display model 包括 `StatusRateLimitRow`、`StatusRateLimitValue::{Window, Text}`、`StatusRateLimitData::{Available, Stale, Unavailable, Missing}`，stale threshold 是 15 分钟。[E: codex-rs/tui/src/status/rate_limits.rs:28][E: codex-rs/tui/src/status/rate_limits.rs:37][E: codex-rs/tui/src/status/rate_limits.rs:53][E: codex-rs/tui/src/status/rate_limits.rs:65]

`RateLimitWarningState` 在 primary/secondary 用量跨过 **50/75/90/95%** 时各发一条 “Heads up … Run /status” history warning；任一窗口到 100% 则不再发这些 threshold warning。90% 以上还可弹出切到 Luna (`NUDGE_MODEL_SLUG`) 的 switch prompt（view id `rate-limit-switch-prompt`），但 **已有 applicable backend banner 时不弹**。[E: codex-rs/tui/src/chatwidget/rate_limits.rs:16][E: codex-rs/tui/src/chatwidget/rate_limits.rs:19][E: codex-rs/tui/src/chatwidget/rate_limits.rs:24][E: codex-rs/tui/src/chatwidget/rate_limits.rs:41][E: codex-rs/tui/src/chatwidget/rate_limits.rs:418]

`update_backend_banner` 从 `GetAccountRateLimitsResponse` 解析 banner。`has_applicable_backend_banner` 在 presented 且未 dismiss 时挡住切模型 prompt。[E: codex-rs/tui/src/chatwidget/backend_banners.rs:311][E: codex-rs/tui/src/chatwidget/backend_banners.rs:507]

## Usage Limit Resets

usage menu 总是提供 usage 查看入口；只有 ChatGPT account 且可用 reset 数量大于零时才启用兑换。[E: codex-rs/tui/src/chatwidget/usage.rs:17][E: codex-rs/tui/src/chatwidget/usage.rs:33]

## Status Line 与 Terminal Title

`CachedProjectRootName` 用 cwd 缓存 project-root display name，避免 terminal-title refresh 重复向上查找同一 root。[E: codex-rs/tui/src/chatwidget/status_surfaces.rs:101]

`status_surface_selections` 同时收集 status-line items/invalids 和 terminal-title items/invalids；invalid warnings 只在 thread id 已存在、invalid list 非空、对应 atomic flag 首次 compare_exchange 成功时发出一次。[E: codex-rs/tui/src/chatwidget/status_surfaces.rs:107][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:119][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:120]

## Running Status

running-task inline status 属于 bottom pane：`set_task_running` 更新 composer task state，首次 running 时创建 `StatusIndicatorWidget`、显示 interrupt hint、同步 inline message，结束时 hide status indicator。[E: codex-rs/tui/src/bottom_pane/mod.rs:1207][E: codex-rs/tui/src/bottom_pane/mod.rs:1210][E: codex-rs/tui/src/bottom_pane/mod.rs:1216][E: codex-rs/tui/src/bottom_pane/mod.rs:1223]

## Gotchas

- `/status` card 的 rate-limit / thread-usage refresh 是 handle 更新 shared state，不是重新插入一张卡。[E: codex-rs/tui/src/status/card.rs:100][E: codex-rs/tui/src/status/card.rs:120]
- invalid status-line/title warnings 有 once-only guard；测试或排障时重复配置错误可能不会重复弹 warning。[E: codex-rs/tui/src/chatwidget/status_surfaces.rs:119]
- thread usage 是 demand-driven；没选 credits/cost 且没打开 `/status` 时不会发 refresh。[E: codex-rs/tui/src/chatwidget/thread_usage.rs:371][E: codex-rs/tui/src/chatwidget/thread_usage.rs:145]

## Sources

- `codex-rs/tui/src/status/card.rs`
- `codex-rs/tui/src/status/rate_limits.rs`
- `codex-rs/tui/src/status/helpers.rs`
- `codex-rs/tui/src/status/thread_usage.rs`
- `codex-rs/tui/src/chatwidget/status_surfaces.rs`
- `codex-rs/tui/src/chatwidget/thread_usage.rs`
- `codex-rs/tui/src/chatwidget/usage.rs`
- `codex-rs/tui/src/chatwidget/reset_credits.rs`
- `codex-rs/tui/src/chatwidget/goal_menu.rs`
- `codex-rs/tui/src/goal_display.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/chatwidget.rs`
- `codex-rs/tui/src/chatwidget/rate_limits.rs`
- `codex-rs/tui/src/chatwidget/backend_banners.rs`
- `codex-rs/protocol/src/account.rs`

## 相关

- `subsys.tui.chatwidget`: status state 所属的主 UI 状态机。
- `subsys.tui.bottom-pane`: running status indicator 的 footer 位置。
