---
id: subsys.tui.status-surfaces
title: Status surfaces
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/status
symbols:
  - StatusHistoryCell
  - StatusRateLimitData
  - StatusRateLimitState
  - StatusContextWindowData
  - StatusTokenUsageData
related:
  - subsys.tui.chatwidget
  - subsys.tui.bottom-pane
  - subsys.tui.rendering-theming
evidence: explicit
status: verified
updated: 37aadeaa13
---

Status surfaces 是 TUI 中呈现 account、model/provider、workdir、permissions、thread/session、token usage、context window、rate limits 和 agent summary 的状态视图集合；`status/card.rs` 中的 `StatusHistoryCell` 保存 derived permissions string、agents summary、account/thread/session、token usage 和 rate-limit state，并通过 `HistoryCell::display_lines` 实现 history cell 渲染 [E: codex-rs/tui/src/status/card.rs:94][E: codex-rs/tui/src/status/card.rs:99][E: codex-rs/tui/src/status/card.rs:100][E: codex-rs/tui/src/status/card.rs:103][E: codex-rs/tui/src/status/card.rs:104][E: codex-rs/tui/src/status/card.rs:105][E: codex-rs/tui/src/status/card.rs:107][E: codex-rs/tui/src/status/card.rs:108][E: codex-rs/tui/src/status/card.rs:550][E: codex-rs/tui/src/status/card.rs:696]。

## 能回答的问题

- `/status` 或 status history cell 从哪些 config/runtime 数据构造。
- token usage、context window、rate limit 的展示规则是什么。
- rate limit stale、available、unavailable、missing 如何区分。
- account plan/API key/ChatGPT account 如何被格式化。

## 职责边界

- `codex-rs/tui/src/status` 负责 status history card 与辅助格式化；`new_status_output_with_rate_limits_handle` 构造 `/status` command cell、`StatusHistoryCell` 和可更新 rate-limit state 的 handle [E: codex-rs/tui/src/status/card.rs:186][E: codex-rs/tui/src/status/card.rs:203][E: codex-rs/tui/src/status/card.rs:204][E: codex-rs/tui/src/status/card.rs:223][E: codex-rs/tui/src/status/card.rs:224]。
- `StatusHistoryCell` 是 history cell；它的 `display_lines` 生成 OpenAI Codex title、labels、field rows、token/context/rate-limit rows 并加 border [E: codex-rs/tui/src/status/card.rs:550][E: codex-rs/tui/src/status/card.rs:553][E: codex-rs/tui/src/status/card.rs:578][E: codex-rs/tui/src/status/card.rs:596][E: codex-rs/tui/src/status/card.rs:619][E: codex-rs/tui/src/status/card.rs:621][E: codex-rs/tui/src/status/card.rs:650][E: codex-rs/tui/src/status/card.rs:680][E: codex-rs/tui/src/status/card.rs:683][E: codex-rs/tui/src/status/card.rs:687][E: codex-rs/tui/src/status/card.rs:696]。
- rate limit snapshot 转显示数据由 `status/rate_limits.rs` 处理，history card 只消费 `StatusRateLimitData` 并渲染 lines [E: codex-rs/tui/src/status/rate_limits.rs:160][E: codex-rs/tui/src/status/card.rs:394][E: codex-rs/tui/src/status/card.rs:400]。

## 关键 crate/文件

- `codex-rs/tui/src/status/card.rs`: status history cell 的数据结构、构造和渲染。
- `codex-rs/tui/src/status/helpers.rs`: model display、agent summary、account plan、token/directory formatting。
- `codex-rs/tui/src/status/rate_limits.rs`: rate limit snapshot 到 display rows 的转换。
- `codex-rs/tui/src/status/account.rs`: account display enum。

## 数据模型

- `StatusAccountDisplay` 区分 ChatGPT email/plan 与 API key 模式 [E: codex-rs/tui/src/status/account.rs:2][E: codex-rs/tui/src/status/account.rs:3][E: codex-rs/tui/src/status/account.rs:4][E: codex-rs/tui/src/status/account.rs:5][E: codex-rs/tui/src/status/account.rs:7]。
- `StatusContextWindowData` 保存 `percent_remaining`、`tokens_in_context` 和 `window`；`StatusTokenUsageData` 保存 `total`、`input`、`output` 和 nested `context_window` [E: codex-rs/tui/src/status/card.rs:48][E: codex-rs/tui/src/status/card.rs:49][E: codex-rs/tui/src/status/card.rs:50][E: codex-rs/tui/src/status/card.rs:51][E: codex-rs/tui/src/status/card.rs:55][E: codex-rs/tui/src/status/card.rs:56][E: codex-rs/tui/src/status/card.rs:57][E: codex-rs/tui/src/status/card.rs:58][E: codex-rs/tui/src/status/card.rs:59]。
- `StatusRateLimitState` 是 plain struct，保存 `rate_limits: StatusRateLimitData` 和 `refreshing_rate_limits: bool`；`StatusHistoryHandle` 与 `StatusHistoryCell` 用 `Arc<RwLock<StatusRateLimitState>>` 包住该 state [E: codex-rs/tui/src/status/card.rs:62][E: codex-rs/tui/src/status/card.rs:64][E: codex-rs/tui/src/status/card.rs:65][E: codex-rs/tui/src/status/card.rs:69][E: codex-rs/tui/src/status/card.rs:70][E: codex-rs/tui/src/status/card.rs:108]。
- `StatusRateLimitData` 有 `Available`、`Stale`、`Unavailable`、`Missing` 四种状态 [E: codex-rs/tui/src/status/rate_limits.rs:48][E: codex-rs/tui/src/status/rate_limits.rs:50][E: codex-rs/tui/src/status/rate_limits.rs:52][E: codex-rs/tui/src/status/rate_limits.rs:54][E: codex-rs/tui/src/status/rate_limits.rs:56]。

## 控制流

1. `new_status_output_with_rate_limits_handle` 创建 `StatusHistoryCell`，同时返回可后续更新 rate limit state 的 `StatusHistoryHandle` [E: codex-rs/tui/src/status/card.rs:186][E: codex-rs/tui/src/status/card.rs:204][E: codex-rs/tui/src/status/card.rs:223][E: codex-rs/tui/src/status/card.rs:224]。
2. `StatusHistoryCell::new` 从 config 读取 workdir、model、provider、approval、sandbox，再派生 reasoning、permissions、account、session、fork、token/context/rate 信息 [E: codex-rs/tui/src/status/card.rs:247][E: codex-rs/tui/src/status/card.rs:248][E: codex-rs/tui/src/status/card.rs:249][E: codex-rs/tui/src/status/card.rs:250][E: codex-rs/tui/src/status/card.rs:251][E: codex-rs/tui/src/status/card.rs:258][E: codex-rs/tui/src/status/card.rs:260][E: codex-rs/tui/src/status/card.rs:274][E: codex-rs/tui/src/status/card.rs:280][E: codex-rs/tui/src/status/card.rs:294][E: codex-rs/tui/src/status/card.rs:296][E: codex-rs/tui/src/status/card.rs:306][E: codex-rs/tui/src/status/card.rs:309][E: codex-rs/tui/src/status/card.rs:310][E: codex-rs/tui/src/status/card.rs:311][E: codex-rs/tui/src/status/card.rs:317][E: codex-rs/tui/src/status/card.rs:323][E: codex-rs/tui/src/status/card.rs:329]。
3. `finish_rate_limit_refresh` 根据传入 rate-limit snapshots 和当前时间重新 compose rate limit data，并把 `refreshing_rate_limits` 设为 false [E: codex-rs/tui/src/status/card.rs:74][E: codex-rs/tui/src/status/card.rs:76][E: codex-rs/tui/src/status/card.rs:77][E: codex-rs/tui/src/status/card.rs:80][E: codex-rs/tui/src/status/card.rs:82][E: codex-rs/tui/src/status/card.rs:89][E: codex-rs/tui/src/status/card.rs:90]。
4. `display_lines` 渲染 title、labels、agent summary、usage link note、model/provider/dir/permissions/session/fork、token usage、context window 和 rate limits [E: codex-rs/tui/src/status/card.rs:550][E: codex-rs/tui/src/status/card.rs:553][E: codex-rs/tui/src/status/card.rs:614][E: codex-rs/tui/src/status/card.rs:624][E: codex-rs/tui/src/status/card.rs:650][E: codex-rs/tui/src/status/card.rs:651][E: codex-rs/tui/src/status/card.rs:655][E: codex-rs/tui/src/status/card.rs:656][E: codex-rs/tui/src/status/card.rs:668][E: codex-rs/tui/src/status/card.rs:675][E: codex-rs/tui/src/status/card.rs:679][E: codex-rs/tui/src/status/card.rs:680][E: codex-rs/tui/src/status/card.rs:683][E: codex-rs/tui/src/status/card.rs:687]。
5. `compose_rate_limit_data_many` 遇到 empty snapshots 返回 `Missing`，captured_at 超过 15 分钟标记 stale，rows 为空返回 `Unavailable`，否则返回 `Stale(rows)` 或 `Available(rows)` [E: codex-rs/tui/src/status/rate_limits.rs:174][E: codex-rs/tui/src/status/rate_limits.rs:175][E: codex-rs/tui/src/status/rate_limits.rs:182][E: codex-rs/tui/src/status/rate_limits.rs:183][E: codex-rs/tui/src/status/rate_limits.rs:273][E: codex-rs/tui/src/status/rate_limits.rs:274][E: codex-rs/tui/src/status/rate_limits.rs:276][E: codex-rs/tui/src/status/rate_limits.rs:278]。

## 设计动机与权衡

- status card 对 ChatGPT auth 隐藏 token usage，因为 `display_lines` 在 account 是 `ChatGpt` 时跳过 token usage lines [E: codex-rs/tui/src/status/card.rs:678][E: codex-rs/tui/src/status/card.rs:679][E: codex-rs/tui/src/status/card.rs:680]。
- base URL 展示会 sanitize username、password、query、fragment 并去掉 trailing slash；“避免 status surface 泄漏敏感连接细节”是从这些清理步骤得出的安全推断 [E: codex-rs/tui/src/status/card.rs:720][E: codex-rs/tui/src/status/card.rs:729][E: codex-rs/tui/src/status/card.rs:730][E: codex-rs/tui/src/status/card.rs:731][E: codex-rs/tui/src/status/card.rs:732][E: codex-rs/tui/src/status/card.rs:733][I]。
- rate limit stale threshold 是 15 分钟，说明旧 snapshot 不被当成实时数据展示 [E: codex-rs/tui/src/status/rate_limits.rs:60][E: codex-rs/tui/src/status/rate_limits.rs:182][E: codex-rs/tui/src/status/rate_limits.rs:183][I]。

## gotcha

- `StatusRateLimitData::Missing` 和 `Unavailable` 语义不同：前者是没有 snapshot，后者是 snapshots 存在但没有可展示 rows [E: codex-rs/tui/src/status/rate_limits.rs:54][E: codex-rs/tui/src/status/rate_limits.rs:56][E: codex-rs/tui/src/status/rate_limits.rs:166][E: codex-rs/tui/src/status/rate_limits.rs:175][E: codex-rs/tui/src/status/rate_limits.rs:273][E: codex-rs/tui/src/status/rate_limits.rs:274]。
- `compose_agents_summary` 会把 agent paths 做压缩展示；如果 Agents 信息看起来丢失，先检查传入 paths 是否为空是基于 `<none>` empty-path fallback 的排查推断 [E: codex-rs/tui/src/status/helpers.rs:36][E: codex-rs/tui/src/status/helpers.rs:61][E: codex-rs/tui/src/status/helpers.rs:62][E: codex-rs/tui/src/status/helpers.rs:63][E: codex-rs/tui/src/status/helpers.rs:64][E: codex-rs/tui/src/status/helpers.rs:66][E: codex-rs/tui/src/status/helpers.rs:75][E: codex-rs/tui/src/status/helpers.rs:76][I]。
- `StatusHistoryHandle` 只更新 rate limit state；其他 status card 字段是创建 cell 时的 snapshot [E: codex-rs/tui/src/status/card.rs:69][E: codex-rs/tui/src/status/card.rs:70][E: codex-rs/tui/src/status/card.rs:89][E: codex-rs/tui/src/status/card.rs:90][I]。

## Sources

- `codex-rs/tui/src/status`

## 相关

- `subsys.tui.chatwidget`
- `subsys.tui.bottom-pane`
- `subsys.tui.rendering-theming`
