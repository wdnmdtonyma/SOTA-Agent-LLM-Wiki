---
id: subsys.tui.status-surfaces
title: Status Surfaces
kind: subsystem
tier: T2
source: [codex-rs/tui/src/status/card.rs, codex-rs/tui/src/status/rate_limits.rs, codex-rs/tui/src/chatwidget/status_surfaces.rs, codex-rs/tui/src/bottom_pane/mod.rs, codex-rs/tui/src/chatwidget.rs]
symbols: [StatusHistoryCell, StatusHistoryHandle, StatusRateLimitData, RateLimitSnapshotDisplay, ChatWidget::status_surface_selections, BottomPane::set_task_running]
related: [subsys.tui.chatwidget, subsys.tui.bottom-pane, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: db887d03e1
---

> Status surfaces 包括 `/status` history card、running-task inline status、status line/terminal title selections 和 rate-limit display shaping；这些状态横跨 `status/*`、`chatwidget/status_surfaces.rs`、`BottomPane` 和 `ChatWidget`。[E: codex-rs/tui/src/status/card.rs:201][E: codex-rs/tui/src/status/rate_limits.rs:1][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:87][E: codex-rs/tui/src/bottom_pane/mod.rs:992][E: codex-rs/tui/src/chatwidget.rs:626]

## 能回答的问题

- `/status` card 保存哪些 display state？
- rate-limit snapshot 如何被转换成 display-friendly rows？
- status line 和 terminal title 的 invalid items 如何 warning？
- running-task status indicator 属于 bottom pane 还是 ChatWidget？

## Status Card

`StatusHistoryHandle` 只暴露 rate-limit refresh completion：根据返回条数选择 single/many compose path，写入 shared rate-limit state 并清 refreshing flag。[E: codex-rs/tui/src/status/card.rs:80][E: codex-rs/tui/src/status/card.rs:85][E: codex-rs/tui/src/status/card.rs:90][E: codex-rs/tui/src/status/card.rs:93][E: codex-rs/tui/src/status/card.rs:96][E: codex-rs/tui/src/status/card.rs:100][E: codex-rs/tui/src/status/card.rs:101]

`StatusHistoryCell` 保存 model details、directory、permissions、agent summary、collaboration mode、provider、remote connection、account、thread/session/fork data、token usage 和 rate-limit state。[E: codex-rs/tui/src/status/card.rs:106][E: codex-rs/tui/src/status/card.rs:107][E: codex-rs/tui/src/status/card.rs:108][E: codex-rs/tui/src/status/card.rs:109][E: codex-rs/tui/src/status/card.rs:110][E: codex-rs/tui/src/status/card.rs:111][E: codex-rs/tui/src/status/card.rs:112][E: codex-rs/tui/src/status/card.rs:113][E: codex-rs/tui/src/status/card.rs:114][E: codex-rs/tui/src/status/card.rs:116][E: codex-rs/tui/src/status/card.rs:117][E: codex-rs/tui/src/status/card.rs:118][E: codex-rs/tui/src/status/card.rs:119][E: codex-rs/tui/src/status/card.rs:120][E: codex-rs/tui/src/status/card.rs:121]

`new_status_output_with_rate_limits_handle` 构造一个 `/status` command cell 和 `StatusHistoryCell`，并返回 `CompositeHistoryCell` 与 handle；调用者可在异步 rate-limit refresh 完成后更新同一个 card。[E: codex-rs/tui/src/status/card.rs:200][E: codex-rs/tui/src/status/card.rs:201][E: codex-rs/tui/src/status/card.rs:211][E: codex-rs/tui/src/status/card.rs:218][E: codex-rs/tui/src/status/card.rs:220][E: codex-rs/tui/src/status/card.rs:221][E: codex-rs/tui/src/status/card.rs:238]

permissions label 会把 built-in profile、sandbox、approval policy 和 workspace root suffix 压成用户可读短标签；auto-review reviewer 在 `OnRequest` 下显示为 `Approve for me`。[E: codex-rs/tui/src/status/card.rs:579][E: codex-rs/tui/src/status/card.rs:584][E: codex-rs/tui/src/status/card.rs:619][E: codex-rs/tui/src/status/card.rs:627][E: codex-rs/tui/src/status/card.rs:629][E: codex-rs/tui/src/status/card.rs:637][E: codex-rs/tui/src/status/card.rs:652][E: codex-rs/tui/src/status/card.rs:668][E: codex-rs/tui/src/status/card.rs:677][E: codex-rs/tui/src/status/card.rs:693][E: codex-rs/tui/src/status/card.rs:698][E: codex-rs/tui/src/status/card.rs:700]

## Rate-Limit Display

`status/rate_limits.rs` 将 protocol `RateLimitSnapshot` 映射为 TUI display rows；模块 contract 明确要求 time-sensitive values 以 caller-provided capture timestamp 解释，确保 stale/reset labels 在同一次 draw 内一致。[E: codex-rs/tui/src/status/rate_limits.rs:1][E: codex-rs/tui/src/status/rate_limits.rs:3][E: codex-rs/tui/src/status/rate_limits.rs:6]

display model 包括 `StatusRateLimitRow`、`StatusRateLimitValue::{Window, Text}`、`StatusRateLimitData::{Available, Stale, Unavailable, Missing}`，stale threshold 是 15 分钟。[E: codex-rs/tui/src/status/rate_limits.rs:28][E: codex-rs/tui/src/status/rate_limits.rs:35][E: codex-rs/tui/src/status/rate_limits.rs:39][E: codex-rs/tui/src/status/rate_limits.rs:48][E: codex-rs/tui/src/status/rate_limits.rs:51][E: codex-rs/tui/src/status/rate_limits.rs:55][E: codex-rs/tui/src/status/rate_limits.rs:57][E: codex-rs/tui/src/status/rate_limits.rs:59][E: codex-rs/tui/src/status/rate_limits.rs:61][E: codex-rs/tui/src/status/rate_limits.rs:65]

`RateLimitSnapshotDisplay` 保存 canonical limit name、capture time、primary/secondary windows、credits 和 individual monthly spend control limit；conversion 从 snapshot fields 映射并把 core credits/spend-control 类型转成 display 类型。[E: codex-rs/tui/src/status/rate_limits.rs:95][E: codex-rs/tui/src/status/rate_limits.rs:96][E: codex-rs/tui/src/status/rate_limits.rs:99][E: codex-rs/tui/src/status/rate_limits.rs:101][E: codex-rs/tui/src/status/rate_limits.rs:103][E: codex-rs/tui/src/status/rate_limits.rs:105][E: codex-rs/tui/src/status/rate_limits.rs:107][E: codex-rs/tui/src/status/rate_limits.rs:144][E: codex-rs/tui/src/status/rate_limits.rs:149][E: codex-rs/tui/src/status/rate_limits.rs:152][E: codex-rs/tui/src/status/rate_limits.rs:160][E: codex-rs/tui/src/status/rate_limits.rs:161][E: codex-rs/tui/src/status/rate_limits.rs:168][E: codex-rs/tui/src/status/rate_limits.rs:178]

## Status Line 与 Terminal Title

`CachedProjectRootName` 用 cwd 缓存 project-root display name，注释说明 terminal-title refresh 很频繁，避免重复向上查找同一 root。[E: codex-rs/tui/src/chatwidget/status_surfaces.rs:76][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:78][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:82][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:83][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:84]

`status_surface_selections` 同时收集 status-line items/invalids 和 terminal-title items/invalids；invalid warnings 只在 thread id 已存在、invalid list 非空、对应 atomic flag 首次 compare_exchange 成功时发出一次。[E: codex-rs/tui/src/chatwidget/status_surfaces.rs:87][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:89][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:90][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:92][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:100][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:101][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:102][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:104][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:113][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:117][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:121][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:125][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:134][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:138]

## Running Status

running-task inline status 属于 bottom pane：`set_task_running` 更新 composer task state，首次 running 时创建 `StatusIndicatorWidget`、显示 interrupt hint、同步 inline message，结束时 hide status indicator。[E: codex-rs/tui/src/bottom_pane/mod.rs:992][E: codex-rs/tui/src/bottom_pane/mod.rs:994][E: codex-rs/tui/src/bottom_pane/mod.rs:995][E: codex-rs/tui/src/bottom_pane/mod.rs:999][E: codex-rs/tui/src/bottom_pane/mod.rs:1000][E: codex-rs/tui/src/bottom_pane/mod.rs:1007][E: codex-rs/tui/src/bottom_pane/mod.rs:1010][E: codex-rs/tui/src/bottom_pane/mod.rs:1014]

## Gotchas

- `/status` card 的 rate-limit refresh 是 handle 更新 shared state，不是重新插入一张卡。[E: codex-rs/tui/src/status/card.rs:80][E: codex-rs/tui/src/status/card.rs:85][E: codex-rs/tui/src/status/card.rs:100]
- invalid status-line/title warnings 有 once-only guard；测试或排障时重复配置错误可能不会重复弹 warning。[E: codex-rs/tui/src/chatwidget/status_surfaces.rs:104][E: codex-rs/tui/src/chatwidget/status_surfaces.rs:125]

## Sources

- `codex-rs/tui/src/status/card.rs`
- `codex-rs/tui/src/status/rate_limits.rs`
- `codex-rs/tui/src/chatwidget/status_surfaces.rs`
- `codex-rs/tui/src/bottom_pane/mod.rs`
- `codex-rs/tui/src/chatwidget.rs`

## 相关

- `subsys.tui.chatwidget`: status state 所属的主 UI 状态机。
- `subsys.tui.bottom-pane`: running status indicator 的 footer 位置。
