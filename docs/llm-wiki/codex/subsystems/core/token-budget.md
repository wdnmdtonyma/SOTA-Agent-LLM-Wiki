---
id: subsys.core.token-budget
title: Token budget
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/token_budget.rs, codex-rs/core/src/session/context_window.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/state/auto_compact_window.rs, codex-rs/core/src/state/session.rs, codex-rs/core/src/context/world_state/context_window_guidance.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs, codex-rs/app-server/src/request_processors/account_processor.rs, codex-rs/backend-client/src/client/thread_usage.rs, codex-rs/tui/src/chatwidget/thread_usage.rs]
symbols: [TokenBudgetConfig, apply_model_defaults, has_explicit_settings, ContextWindowGuidanceState, maybe_record, ThreadUsage, token-budget::GetAccountTokenUsageParams]
related: [subsys.config-auth.features-system, config.model-provider, subsys.providers.model-catalog, subsys.core.rollout-budget, subsys.core.context-manager, subsys.core.compaction, rpc.thread-methods]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Token budget 管理当前模型 context window 临近 rollover 时的 guidance、reminder 和 auto-compact fallback。它按每个 turn 选中的 model/config 生效；它不是 root agent tree 的累计 inference quota。[E: codex-rs/core/src/session/token_budget.rs:23][E: codex-rs/core/src/session/token_budget.rs:58][E: codex-rs/core/src/session/turn_context.rs:513][E: codex-rs/core/src/session/context_window.rs:57]

## 能回答的问题

- user config 与 model catalog defaults 谁优先？
- model switch 为什么会切换 token-budget defaults？
- reminder 与 fallback prompt 分别在何时注入？
- fallback buffer 如何改变 auto-compaction threshold？
- context-window guidance 为什么不会每 step 重复发给模型？
- `account/usage/read` 怎样读取单 thread 的估算用量？

## Config 与 model defaults

`TokenBudget` 是 under-development、default-off feature。Structured config 包含 reminder threshold/template、guidance message、auto-compact fallback prompt 与 fallback buffer。[E: codex-rs/features/src/lib.rs:1376][E: codex-rs/features/src/lib.rs:1378][E: codex-rs/features/src/lib.rs:1379][E: codex-rs/features/src/feature_configs.rs:264][E: codex-rs/features/src/feature_configs.rs:270][E: codex-rs/features/src/feature_configs.rs:275][E: codex-rs/features/src/feature_configs.rs:279][E: codex-rs/features/src/feature_configs.rs:283][E: codex-rs/features/src/feature_configs.rs:287]

Model catalog 可在 `ModelMessages.token_budget` 携带同一组 model-owned defaults。[E: codex-rs/protocol/src/openai_models.rs:506][E: codex-rs/protocol/src/openai_models.rs:513][E: codex-rs/protocol/src/openai_models.rs:514][E: codex-rs/protocol/src/openai_models.rs:517][E: codex-rs/protocol/src/openai_models.rs:517][E: codex-rs/protocol/src/openai_models.rs:526]

`apply_model_defaults` 只有在 feature enabled 且用户没有任何 explicit settings 时才复制并校验 model defaults；explicit settings 包括 effective TOML table 中除 `enabled` 外的任意 key，或已解析 config 不等于默认值。无效 model defaults warning 后忽略。[E: codex-rs/core/src/session/token_budget.rs:9][E: codex-rs/core/src/session/token_budget.rs:13][E: codex-rs/core/src/session/token_budget.rs:16][E: codex-rs/core/src/session/token_budget.rs:17][E: codex-rs/core/src/session/token_budget.rs:23][E: codex-rs/core/src/session/token_budget.rs:24][E: codex-rs/core/src/session/token_budget.rs:28][E: codex-rs/core/src/session/token_budget.rs:46][E: codex-rs/core/src/session/token_budget.rs:55]

Turn context 在选定 `model_info` 后再应用 defaults，因此每次 model switch 都重新解析当前模型的 metadata；user explicit config 则保持优先，不被新模型覆盖。[E: codex-rs/core/src/session/turn_context.rs:500][E: codex-rs/core/src/session/turn_context.rs:513][E: codex-rs/core/src/session/turn_context.rs:518]

## Reminder 与 fallback

sampling 完成后，turn loop 取得 base/unbuffered remaining tokens。若低于 reminder threshold，session 通过 auto-compact-window claim state 保证一个 context window 只注入一次 reminder fragment，并用 `{n_remaining}` 渲染当前剩余 token；window advance 会重置该 claim。[E: codex-rs/core/src/session/turn.rs:418][E: codex-rs/core/src/session/turn.rs:421][E: codex-rs/core/src/session/token_budget.rs:58][E: codex-rs/core/src/session/token_budget.rs:67][E: codex-rs/core/src/session/token_budget.rs:75][E: codex-rs/core/src/session/token_budget.rs:79][E: codex-rs/core/src/session/token_budget.rs:83][E: codex-rs/core/src/session/token_budget.rs:85][E: codex-rs/core/src/state/auto_compact_window.rs:77][E: codex-rs/core/src/state/auto_compact_window.rs:82][E: codex-rs/core/src/state/auto_compact_window.rs:87][E: codex-rs/core/src/state/auto_compact_window.rs:88][E: codex-rs/core/src/state/session.rs:160][E: codex-rs/core/src/state/session.rs:163]

Fallback buffer 只有配置了 fallback prompt 才预留，并加到 auto-compaction scope limit；模型 full context window 仍是不可越过的 hard cap。base remaining 保持按未加 buffer 的 threshold 计算，便于 reminder/fallback 判断。[E: codex-rs/core/src/config/mod.rs:1193][E: codex-rs/core/src/config/mod.rs:1194][E: codex-rs/core/src/session/context_window.rs:54][E: codex-rs/core/src/session/context_window.rs:57][E: codex-rs/core/src/session/context_window.rs:66][E: codex-rs/core/src/session/context_window.rs:71][E: codex-rs/core/src/session/context_window.rs:75]

只有没有立即 rollover、也尚未撞到 hard/buffered limit，且 base remaining 正好为 0 时，fallback prompt 才可能通过 per-window one-shot claim 写入 history；window advance 会重置该 claim。它为 compaction threshold 后的 note-taking 留出一次 developer-message sampling 机会。[E: codex-rs/core/src/session/turn.rs:418][E: codex-rs/core/src/session/turn.rs:420][E: codex-rs/core/src/session/token_budget.rs:94][E: codex-rs/core/src/session/token_budget.rs:97][E: codex-rs/core/src/session/token_budget.rs:101][E: codex-rs/core/src/session/token_budget.rs:109][E: codex-rs/core/src/session/token_budget.rs:111][E: codex-rs/core/src/state/auto_compact_window.rs:77][E: codex-rs/core/src/state/auto_compact_window.rs:83][E: codex-rs/core/src/state/auto_compact_window.rs:91][E: codex-rs/core/src/state/auto_compact_window.rs:92][E: codex-rs/core/src/state/session.rs:166][E: codex-rs/core/src/state/session.rs:167]

## World-state guidance

Feature enabled、模型有 context window 且 guidance 非空时，session 将 `ContextWindowGuidanceState` 加入 typed world state。[E: codex-rs/core/src/session/world_state.rs:88][E: codex-rs/core/src/session/world_state.rs:89][E: codex-rs/core/src/session/world_state.rs:90][E: codex-rs/core/src/session/world_state.rs:94][E: codex-rs/core/src/session/world_state.rs:97]

该 section id 是 `context_window_guidance`，以 developer-role contextual fragment 输出；和 previous snapshot 完全相同时 `render_diff` 返回 `None`，只在首次出现或 guidance 内容改变时重新注入。[E: codex-rs/core/src/context/world_state/context_window_guidance.rs:20][E: codex-rs/core/src/context/world_state/context_window_guidance.rs:21][E: codex-rs/core/src/context/world_state/context_window_guidance.rs:28][E: codex-rs/core/src/context/world_state/context_window_guidance.rs:40][E: codex-rs/core/src/context/world_state/context_window_guidance.rs:44][E: codex-rs/core/src/context/world_state/context_window_guidance.rs:48]

## Thread usage 读取面

`account/usage/read` 带 `thread_id` 时不读 account-wide profile，而是 60s timeout 调 backend `get_thread_usage`。403/404 返回 `thread_usage: None` 而不是失败；其它错误才是 internal error。此时 `summary` 与 `daily_usage_buckets` 为空。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1152][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:392][E: codex-rs/app-server/src/request_processors/account_processor.rs:16][E: codex-rs/app-server/src/request_processors/account_processor.rs:1168][E: codex-rs/app-server/src/request_processors/account_processor.rs:1200][E: codex-rs/app-server/src/request_processors/account_processor.rs:1211]

`ThreadUsage` 含 `estimated_usage_credits_micros`、optional USD micros，以及按 model/effort/speed 分组的 token 分解。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs:9][E: codex-rs/backend-client/src/client/thread_usage.rs:29]

Backend 路径：Codex API 用 `/api/codex/usage/thread_usage/query`，ChatGPT API 用 `/wham/usage/thread_usage/query`。请求体是单个 `thread_ids`；响应必须包含所请求 thread，否则 client 报错。[E: codex-rs/backend-client/src/client/thread_usage.rs:74][E: codex-rs/backend-client/src/client/thread_usage.rs:55][E: codex-rs/backend-client/src/client/thread_usage.rs:65]

TUI `ThreadUsageState` 在 turn 结束后按 15/60/120s 再拉 settlement，失败按 5/15/60s 有限重试；`Disabled` 会停后续请求。[E: codex-rs/tui/src/chatwidget/thread_usage.rs:20][E: codex-rs/tui/src/chatwidget/thread_usage.rs:25][E: codex-rs/tui/src/chatwidget/thread_usage.rs:80][E: codex-rs/tui/src/chatwidget/thread_usage.rs:198]

这是 account/billing 估算，不是 `TokenBudget` feature 的 context-window reminder。[I]

## Gotchas

- 在 `[features.token_budget]` 里只写 `enabled` 不算 explicit settings，所以 model defaults 仍可应用；任何其它 key 都会阻止 model override。[E: codex-rs/core/src/session/token_budget.rs:13][E: codex-rs/core/src/session/token_budget.rs:16]
- fallback buffer 不增加模型 hard context window，只延后 auto-compaction scope threshold。[E: codex-rs/core/src/session/context_window.rs:54][E: codex-rs/core/src/session/context_window.rs:71][E: codex-rs/core/src/session/context_window.rs:75]
- Token budget 是 per-model/per-window guidance 与 rollover behavior；累计 root/subagent inference accounting 由 `subsys.core.rollout-budget` 负责。[I]

## Sources

- `codex-rs/core/src/session/token_budget.rs`
- `codex-rs/core/src/session/context_window.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/core/src/state/auto_compact_window.rs`
- `codex-rs/core/src/state/session.rs`
- `codex-rs/core/src/context/world_state/context_window_guidance.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs`
- `codex-rs/app-server/src/request_processors/account_processor.rs`
- `codex-rs/backend-client/src/client/thread_usage.rs`
- `codex-rs/tui/src/chatwidget/thread_usage.rs`

## 相关

- [Rollout budget](rollout-budget.md)
- [Model catalog](../providers/model-catalog.md)
- [Feature 系统](../config-auth/features-system.md)
- [thread 方法](../../surface/app-server/thread-methods.md)
