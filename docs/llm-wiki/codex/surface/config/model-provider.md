---
id: config.model-provider
title: 模型与 provider 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/core/src/session/token_budget.rs, codex-rs/core/src/session/turn_context.rs]
symbols: [AutoCompactTokenLimitScope, ReasoningEffort, ReasoningSummary, Verbosity, Personality]
related: [command.model-mode, config.auth-account, subsys.providers.model-catalog, subsys.core.token-budget, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 7750465934
---

> 模型与 provider 设置 catalog 覆盖 ConfigToml 中选择模型、provider、context/compaction limits、reasoning/verbosity、model catalog、service tier、OpenAI/ChatGPT endpoint 和 OSS provider 的顶层键。

## 能回答的问题

- 模型选择、review model、provider id 和 custom provider map 分别是哪几个 key？
- model context window、auto compact token limit 和 limit scope 的 schema 字段是什么？
- reasoning effort、summary、verbosity、service tier 和 personality 如何在 ConfigToml 中声明？
- 哪些 endpoint/provider override 属于模型 provider catalog？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 17 个字段。[E: codex-rs/config/src/config_toml.rs:150][E: codex-rs/config/src/config_toml.rs:510]

`ConfigProfile` repeats model/provider/reasoning fields that can be scoped to named profiles, while `ConfigToml` is the top-level schema loaded from config.toml.[E: codex-rs/config/src/profile_toml.rs:24][E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:31][E: codex-rs/config/src/profile_toml.rs:35][E: codex-rs/config/src/profile_toml.rs:38][E: codex-rs/config/src/config_toml.rs:150]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `model` | `Option<String>` | none | Model selection override. | [E: codex-rs/config/src/config_toml.rs:152] |
| `review_model` | `Option<String>` | none | Review model override used by `/review`. | [E: codex-rs/config/src/config_toml.rs:154] |
| `model_provider` | `Option<String>` | none | Provider id selected from `model_providers`. | [E: codex-rs/config/src/config_toml.rs:157] |
| `model_context_window` | `Option<i64>` | none | Model context-window size. | [E: codex-rs/config/src/config_toml.rs:160] |
| `model_auto_compact_token_limit` | `Option<i64>` | none | Auto-compaction token threshold. | [E: codex-rs/config/src/config_toml.rs:163] |
| `model_auto_compact_token_limit_scope` | `Option<AutoCompactTokenLimitScope>` | none | Auto-compaction limit scope. | [E: codex-rs/config/src/config_toml.rs:167] |
| `model_providers` | `HashMap<String, ModelProviderInfo>` | `#[serde(default, deserialize_with = "deserialize_model_providers")]` | User-defined provider entries map. | [E: codex-rs/config/src/config_toml.rs:282][E: codex-rs/config/src/config_toml.rs:283] |
| `model_reasoning_effort` | `Option<ReasoningEffort>` | none | Reasoning effort override. | [E: codex-rs/config/src/config_toml.rs:347] |
| `plan_mode_reasoning_effort` | `Option<ReasoningEffort>` | none | Plan-mode reasoning effort override. | [E: codex-rs/config/src/config_toml.rs:348] |
| `model_reasoning_summary` | `Option<ReasoningSummary>` | none | Reasoning summary mode override. | [E: codex-rs/config/src/config_toml.rs:349] |
| `model_verbosity` | `Option<Verbosity>` | none | GPT-5 Responses API text verbosity override. | [E: codex-rs/config/src/config_toml.rs:351] |
| `model_catalog_json` | `Option<AbsolutePathBuf>` | none | Model catalog JSON path. | [E: codex-rs/config/src/config_toml.rs:355] |
| `personality` | `Option<Personality>` | none | Model personality selector. | [E: codex-rs/config/src/config_toml.rs:358] |
| `service_tier` | `Option<String>` | none | Explicit service tier request id. | [E: codex-rs/config/src/config_toml.rs:362] |
| `chatgpt_base_url` | `Option<String>` | none | ChatGPT request base URL. | [E: codex-rs/config/src/config_toml.rs:365] |
| `openai_base_url` | `Option<String>` | none | Built-in OpenAI provider base URL override. | [E: codex-rs/config/src/config_toml.rs:374] |
| `oss_provider` | `Option<String>` | none | Preferred OSS provider for local models. | [E: codex-rs/config/src/config_toml.rs:510] |

`model_supports_reasoning_summaries` has been removed from the target schema; reasoning-summary capability now comes from the selected model metadata, while `model_reasoning_summary` remains the request-mode override。[E: codex-rs/config/src/config_toml.rs:349][E: codex-rs/config/src/config_toml.rs:351][I]

## Model-owned token-budget defaults

Remote/static model metadata can attach a `ModelTokenBudgetConfig` under `ModelMessages.token_budget`，包含 reminder threshold/template、context-window guidance、auto-compact fallback prompt 与 buffer。这些不是新的 top-level `ConfigToml` keys，而是选中模型的 defaults。[E: codex-rs/protocol/src/openai_models.rs:506][E: codex-rs/protocol/src/openai_models.rs:513][E: codex-rs/protocol/src/openai_models.rs:514][E: codex-rs/protocol/src/openai_models.rs:519][E: codex-rs/protocol/src/openai_models.rs:520][E: codex-rs/protocol/src/openai_models.rs:524]

Core 只在 `TokenBudget` feature 开启且用户没有任何 explicit token-budget settings 时应用模型 defaults；无效 model defaults 会 warning 后忽略。该逻辑在每次选定 turn model 后重跑，所以 model switch 会切换对应 defaults，显式配置则始终优先。[E: codex-rs/core/src/session/token_budget.rs:9][E: codex-rs/core/src/session/token_budget.rs:23][E: codex-rs/core/src/session/token_budget.rs:24][E: codex-rs/core/src/session/token_budget.rs:28][E: codex-rs/core/src/session/token_budget.rs:46][E: codex-rs/core/src/session/token_budget.rs:55][E: codex-rs/core/src/session/turn_context.rs:517][E: codex-rs/core/src/session/turn_context.rs:518]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/model-provider-info/src/lib.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/core/src/session/token_budget.rs`
- `codex-rs/core/src/session/turn_context.rs`

## 相关

- `command.model-mode`
- `config.auth-account`
- `config.storage-telemetry-misc`
