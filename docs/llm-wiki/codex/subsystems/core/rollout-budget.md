---
id: subsys.core.rollout-budget
title: Rollout budget
kind: subsystem
tier: T2
source: [codex-rs/core/src/rollout_budget.rs, codex-rs/core/src/session/rollout_budget.rs, codex-rs/core/src/agent/control.rs, codex-rs/core/src/agent/control/spawn.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/compact.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/codex-api/src/sse/responses.rs, codex-rs/protocol/src/protocol.rs]
symbols: [RolloutBudget, RolloutBudgetReminder, RolloutBudgetConfig, AgentControl::rollout_budget, Session::record_rollout_budget_usage, maybe_record_reminder]
related: [subsys.config-auth.features-system, subsys.providers.sse-streaming, subsys.core.token-budget, subsys.core.context-manager, spine.trace-subagent]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Rollout budget 是一个 root thread 与其全部 subagents 共享的 inference accounting 上限。`record_usage` 优先消费 `TokenUsage.codex_rollout_budget_units`；没有该字段时用 `output_tokens * sampling_weight + non_cached_input * prefill_weight`。它不是 context-window token budget，也不是 `rollout/compress` RPC。[E: codex-rs/core/src/rollout_budget.rs:20][E: codex-rs/core/src/rollout_budget.rs:48][E: codex-rs/core/src/rollout_budget.rs:52][E: codex-rs/core/src/rollout_budget.rs:62]

## 能回答的问题

- budget 为什么能覆盖 root agent 与所有 subagents？
- provider units 与本地 weighted-token fallback 谁优先？
- reminder 如何按 thread/window 去重？
- budget exhaustion 在普通 sampling 与 compaction 中如何终止？
- `rollout_budget` 与 `token_budget` 为什么是两个不同 feature？

## Config 与 feature gate

`RolloutBudget` 是 under-development、default-off feature。Structured TOML 包含 `limit_tokens`、`reminder_at_remaining_tokens`、`sampling_token_weight` 与 `prefill_token_weight`。[E: codex-rs/features/src/lib.rs:1705][E: codex-rs/features/src/lib.rs:1707][E: codex-rs/features/src/lib.rs:1708][E: codex-rs/features/src/feature_configs.rs:369][E: codex-rs/features/src/feature_configs.rs:374][E: codex-rs/features/src/feature_configs.rs:377]

Feature 开启时 `limit_tokens` 和 reminder thresholds 必填；limit 必须为正，threshold 必须为正且小于 limit，weights 必须 finite/non-negative，默认都为 1.0。校验失败会阻断 config resolve，而不是静默回退。[E: codex-rs/core/src/config/mod.rs:2889][E: codex-rs/core/src/config/mod.rs:2902][E: codex-rs/core/src/config/mod.rs:2915][E: codex-rs/core/src/config/mod.rs:2902][E: codex-rs/core/src/config/mod.rs:2924][E: codex-rs/core/src/config/mod.rs:2918][E: codex-rs/core/src/config/mod.rs:2941]

## Accounting data source

Responses SSE 将 optional `codex_rollout_budget_units` 解析进 `TokenUsage`。这个字段明确跳过 serialization、JSON schema 和 TypeScript export，所以只服务 provider-to-core accounting，不扩展 public token-usage wire schema。[E: codex-rs/codex-api/src/sse/responses.rs:118][E: codex-rs/codex-api/src/sse/responses.rs:125][E: codex-rs/codex-api/src/sse/responses.rs:141][E: codex-rs/protocol/src/protocol.rs:2256][E: codex-rs/protocol/src/protocol.rs:2257][E: codex-rs/protocol/src/protocol.rs:2258][E: codex-rs/protocol/src/protocol.rs:2259]

`record_usage` 有 provider units 时先将 JSON number 转为 `f64`；NaN/Infinity/negative 都是 fatal error。没有 units 时使用 `max(output_tokens, 0) * sampling_weight + non_cached_input * prefill_weight`，随后累加到 shared `weighted_tokens_used`。[E: codex-rs/core/src/rollout_budget.rs:48][E: codex-rs/core/src/rollout_budget.rs:52][E: codex-rs/core/src/rollout_budget.rs:54][E: codex-rs/core/src/rollout_budget.rs:55][E: codex-rs/core/src/rollout_budget.rs:61][E: codex-rs/core/src/rollout_budget.rs:62][E: codex-rs/core/src/rollout_budget.rs:65][E: codex-rs/core/src/rollout_budget.rs:66]

## Root-tree sharing 与执行时机

`AgentControl` 在一个 root session tree 中只创建一次并共享给所有 subagents；它持有同一个 `Arc<RolloutBudget>`。Root thread 由 effective config 初始化 budget，普通无 config handle 则不另建独立 budget。[E: codex-rs/core/src/agent/control.rs:124][E: codex-rs/core/src/agent/control.rs:137][E: codex-rs/core/src/agent/control.rs:166][E: codex-rs/core/src/thread_manager.rs:1489][E: codex-rs/core/src/thread_manager.rs:1584][E: codex-rs/core/src/agent/control/spawn.rs:595][E: codex-rs/core/src/thread_manager.rs:1045]

普通 response token usage 在更新 session token info 后记 budget；remote compaction 的 sampling usage 也记入同一 budget。达到上限时 `record_rollout_budget_usage` 返回 `SessionBudgetExceeded`，compaction 对该错误直接 emit/return，不进入 context-window retry trimming。[E: codex-rs/core/src/session/mod.rs:4828][E: codex-rs/core/src/session/rollout_budget.rs:34][E: codex-rs/core/src/compact_remote_v2.rs:298][E: codex-rs/core/src/compact.rs:308]

## Reminder delivery

Remaining units 会和配置 thresholds 比较；delivery state 按 `ThreadId` 保存 `(window_id, reminder_index)`。新 window 首次调用即使尚未跨 threshold 也会产生 index-0 reminder；同一 window 每跨过一个更高 index 还会再次注入，只有相同/更低 index 才去重。空 threshold 数组也保留这次初始 reminder。只有 fragment 成功写入 history 后才 mark delivered，取消发生在写入前会在下一次重试。[E: codex-rs/core/src/rollout_budget.rs:28][E: codex-rs/core/src/rollout_budget.rs:31][E: codex-rs/core/src/rollout_budget.rs:69][E: codex-rs/core/src/rollout_budget.rs:78][E: codex-rs/core/src/rollout_budget.rs:80][E: codex-rs/core/src/rollout_budget.rs:83][E: codex-rs/core/src/rollout_budget.rs:84][E: codex-rs/core/src/rollout_budget.rs:85][E: codex-rs/core/src/rollout_budget.rs:89][E: codex-rs/core/src/rollout_budget.rs:95][E: codex-rs/core/src/rollout_budget.rs:105][E: codex-rs/core/src/session/rollout_budget.rs:7][E: codex-rs/core/src/session/rollout_budget.rs:19][E: codex-rs/core/src/session/rollout_budget.rs:22][E: codex-rs/core/src/session/rollout_budget.rs:27]

Turn loop 在每次 sampling 前读取 current window id 并尝试注入 reminder。`RolloutBudget` 没有 rearm/rollback API：delivery 只按 `(ThreadId, window_id, reminder_index)` 去重，`weighted_tokens_used` 单调累加。`Op::ThreadRollback` 已删除，不要把 reminder 绑定到 live rollback handler。[E: codex-rs/core/src/session/turn.rs:451][E: codex-rs/core/src/session/turn.rs:452][E: codex-rs/core/src/rollout_budget.rs:69][E: codex-rs/core/src/rollout_budget.rs:84][E: codex-rs/core/src/rollout_budget.rs:95][E: codex-rs/core/src/rollout_budget.rs:65]

## Gotchas

- Provider units 一旦存在就完全取代 local weights，而不是与 input/output tokens 相加。[E: codex-rs/core/src/rollout_budget.rs:52][E: codex-rs/core/src/rollout_budget.rs:61]
- `weighted_tokens_used` 只有 `record_usage` 累加，没有退还/回滚路径。[E: codex-rs/core/src/rollout_budget.rs:65]
- 该 feature 的 scope 是 root agent tree；per-model context rollover、guidance 与 fallback prompt 由 `subsys.core.token-budget` 负责。[I]

## Sources

- `codex-rs/core/src/rollout_budget.rs`
- `codex-rs/core/src/session/rollout_budget.rs`
- `codex-rs/core/src/agent/control.rs`
- `codex-rs/core/src/agent/control/spawn.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/mod.rs`
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
