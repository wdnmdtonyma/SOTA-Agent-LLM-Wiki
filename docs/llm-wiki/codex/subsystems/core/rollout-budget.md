---
id: subsys.core.rollout-budget
title: Rollout budget
kind: subsystem
tier: T2
source: [codex-rs/core/src/rollout_budget.rs, codex-rs/core/src/session/rollout_budget.rs, codex-rs/core/src/agent/control.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/compact.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/codex-api/src/sse/responses.rs, codex-rs/protocol/src/protocol.rs]
symbols: [RolloutBudget, RolloutBudgetReminder, RolloutBudgetConfig, AgentControl::rollout_budget, Session::record_rollout_budget_usage, maybe_record_reminder]
related: [subsys.config-auth.features-system, subsys.providers.sse-streaming, subsys.core.token-budget, subsys.core.context-manager, spine.trace-subagent]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Rollout budget 是一个 root thread 与其全部 subagents 共享的 inference accounting 上限。它优先消费 provider 在 `response.completed` 中返回的 budget units；没有该字段时，才按 sampling/prefill token weights 本地估算。它不是单个模型 context window 的剩余 token 计数。[E: codex-rs/core/src/rollout_budget.rs:18][E: codex-rs/core/src/rollout_budget.rs:22][E: codex-rs/core/src/rollout_budget.rs:46][E: codex-rs/core/src/rollout_budget.rs:50][E: codex-rs/core/src/rollout_budget.rs:59]

## 能回答的问题

- budget 为什么能覆盖 root agent 与所有 subagents？
- provider units 与本地 weighted-token fallback 谁优先？
- reminder 如何按 thread/window 去重？
- budget exhaustion 在普通 sampling 与 compaction 中如何终止？
- `rollout_budget` 与 `token_budget` 为什么是两个不同 feature？

## Config 与 feature gate

`RolloutBudget` 是 under-development、default-off feature。Structured TOML 包含 `limit_tokens`、`reminder_at_remaining_tokens`、`sampling_token_weight` 与 `prefill_token_weight`。[E: codex-rs/features/src/lib.rs:1382][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/features/src/lib.rs:1385][E: codex-rs/features/src/feature_configs.rs:298][E: codex-rs/features/src/feature_configs.rs:303][E: codex-rs/features/src/feature_configs.rs:306]

Feature 开启时 `limit_tokens` 和 reminder thresholds 必填；limit 必须为正，threshold 必须为正且小于 limit，weights 必须 finite/non-negative，默认都为 1.0。校验失败会阻断 config resolve，而不是静默回退。[E: codex-rs/core/src/config/mod.rs:2796][E: codex-rs/core/src/config/mod.rs:2799][E: codex-rs/core/src/config/mod.rs:2803][E: codex-rs/core/src/config/mod.rs:2815][E: codex-rs/core/src/config/mod.rs:2819][E: codex-rs/core/src/config/mod.rs:2825][E: codex-rs/core/src/config/mod.rs:2833][E: codex-rs/core/src/config/mod.rs:2840][E: codex-rs/core/src/config/mod.rs:2848]

## Accounting data source

Responses SSE 将 optional `codex_rollout_budget_units` 解析进 `TokenUsage`。这个字段明确跳过 serialization、JSON schema 和 TypeScript export，所以只服务 provider-to-core accounting，不扩展 public token-usage wire schema。[E: codex-rs/codex-api/src/sse/responses.rs:123][E: codex-rs/codex-api/src/sse/responses.rs:130][E: codex-rs/codex-api/src/sse/responses.rs:146][E: codex-rs/protocol/src/protocol.rs:2080][E: codex-rs/protocol/src/protocol.rs:2081][E: codex-rs/protocol/src/protocol.rs:2083][E: codex-rs/protocol/src/protocol.rs:2083]

`record_usage` 有 provider units 时先将 JSON number 转为 `f64`；NaN/Infinity/negative 都是 fatal error。没有 units 时使用 `max(output_tokens, 0) * sampling_weight + non_cached_input * prefill_weight`，随后累加到 shared `weighted_tokens_used`。[E: codex-rs/core/src/rollout_budget.rs:46][E: codex-rs/core/src/rollout_budget.rs:50][E: codex-rs/core/src/rollout_budget.rs:52][E: codex-rs/core/src/rollout_budget.rs:53][E: codex-rs/core/src/rollout_budget.rs:59][E: codex-rs/core/src/rollout_budget.rs:60][E: codex-rs/core/src/rollout_budget.rs:63][E: codex-rs/core/src/rollout_budget.rs:64]

## Root-tree sharing 与执行时机

`AgentControl` 在一个 root session tree 中只创建一次并共享给所有 subagents；它持有同一个 `Arc<RolloutBudget>`。Root thread 由 effective config 初始化 budget，普通无 config handle 则不另建独立 budget。[E: codex-rs/core/src/agent/control.rs:96][E: codex-rs/core/src/agent/control.rs:105][E: codex-rs/core/src/agent/control.rs:109][E: codex-rs/core/src/thread_manager.rs:1229][E: codex-rs/core/src/thread_manager.rs:1233][E: codex-rs/core/src/thread_manager.rs:1234]

普通 response token usage 在更新 session token info 后记 budget；remote compaction 的 sampling usage 也记入同一 budget。达到上限时 `record_rollout_budget_usage` 返回 `SessionBudgetExceeded`，compaction 对该错误直接 emit/return，不进入 context-window retry trimming。[E: codex-rs/core/src/session/mod.rs:3770][E: codex-rs/core/src/session/mod.rs:3788][E: codex-rs/core/src/session/rollout_budget.rs:25][E: codex-rs/core/src/session/rollout_budget.rs:33][E: codex-rs/core/src/compact_remote_v2.rs:282][E: codex-rs/core/src/compact.rs:304][E: codex-rs/core/src/compact.rs:307]

## Reminder delivery

Remaining units 会和配置 thresholds 比较；delivery state 按 `ThreadId` 保存 `(window_id, reminder_index)`。新 window 首次调用即使尚未跨 threshold 也会产生 index-0 reminder；同一 window 每跨过一个更高 index 还会再次注入，只有相同/更低 index 才去重。空 threshold 数组也保留这次初始 reminder。只有 fragment 成功写入 history 后才 mark delivered，取消发生在写入前会在下一次重试。[E: codex-rs/core/src/rollout_budget.rs:26][E: codex-rs/core/src/rollout_budget.rs:29][E: codex-rs/core/src/rollout_budget.rs:67][E: codex-rs/core/src/rollout_budget.rs:76][E: codex-rs/core/src/rollout_budget.rs:78][E: codex-rs/core/src/rollout_budget.rs:81][E: codex-rs/core/src/rollout_budget.rs:82][E: codex-rs/core/src/rollout_budget.rs:83][E: codex-rs/core/src/rollout_budget.rs:87][E: codex-rs/core/src/rollout_budget.rs:93][E: codex-rs/core/src/rollout_budget.rs:103][E: codex-rs/core/src/session/rollout_budget.rs:8][E: codex-rs/core/src/session/rollout_budget.rs:17][E: codex-rs/core/src/session/rollout_budget.rs:20][E: codex-rs/core/src/session/rollout_budget.rs:22]

Turn loop 在每次 sampling 前读取 current window id 并尝试注入 reminder；thread rollback 会 rearm 当前 thread 的 delivery，让恢复后的 prompt 重述当前 remainder，但不会退还已经累计的 shared usage。[E: codex-rs/core/src/session/turn.rs:285][E: codex-rs/core/src/session/turn.rs:286][E: codex-rs/core/src/session/handlers.rs:539][E: codex-rs/core/src/session/handlers.rs:542][E: codex-rs/core/src/rollout_budget.rs:113][E: codex-rs/core/src/rollout_budget.rs:117]

## Gotchas

- Provider units 一旦存在就完全取代 local weights，而不是与 input/output tokens 相加。[E: codex-rs/core/src/rollout_budget.rs:50][E: codex-rs/core/src/rollout_budget.rs:59]
- Rollback 只 rearm reminder；`weighted_tokens_used` 没有回滚路径。[E: codex-rs/core/src/rollout_budget.rs:113][E: codex-rs/core/src/rollout_budget.rs:117]
- 该 feature 的 scope 是 root agent tree；per-model context rollover、guidance 与 fallback prompt 由 `subsys.core.token-budget` 负责。[I]

## Sources

- `codex-rs/core/src/rollout_budget.rs`
- `codex-rs/core/src/session/rollout_budget.rs`
- `codex-rs/core/src/agent/control.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/compact.rs`
- `codex-rs/core/src/compact_remote_v2.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/codex-api/src/sse/responses.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [SSE streaming](../providers/sse-streaming.md)
- [Token budget](token-budget.md)
- [Feature 系统](../config-auth/features-system.md)
