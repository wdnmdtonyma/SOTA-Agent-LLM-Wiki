---
id: config.model-provider
title: 模型与 provider 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/core/src/session/token_budget.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/features/src/lib.rs, codex-rs/tui/src/app_server_session.rs]
symbols: [AutoCompactTokenLimitScope, ReasoningEffort, ReasoningSummary, Verbosity, Personality, model_post_turn_compact_threshold_percent]
related: [command.model-mode, config.auth-account, subsys.providers.model-catalog, subsys.core.token-budget, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> 模型与 provider 设置 catalog 覆盖 ConfigToml 中选择模型、provider、context/compaction limits、reasoning/verbosity、model catalog、personality、service tier、OpenAI/ChatGPT endpoint 和 OSS provider 的顶层键。`personality` 仍是 config 键，不是 TUI `/personality` slash。[E: codex-rs/config/src/config_toml.rs:165][E: codex-rs/config/src/config_toml.rs:402]

## 能回答的问题

- 模型选择、review model、provider id 和 custom provider map 分别是哪几个 key？
- model context window、auto compact token limit 和 limit scope 的 schema 字段是什么？
- reasoning effort、summary、verbosity、service tier 和 personality 如何在 ConfigToml 中声明？
- 哪些 endpoint/provider override 属于模型 provider catalog？
- TUI `/personality` 删除后，config `personality` 和 `Feature::Personality` 是否还在？

## Catalog 边界

当前 `ConfigToml` 有 **104** 个顶层 `pub` 字段（从 `model` 到 `oss_provider`）；本节点覆盖其中 **19** 个字段。8 个 surface/config catalog 合计覆盖全部 104 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:165][E: codex-rs/config/src/config_toml.rs:167][E: codex-rs/config/src/config_toml.rs:557]

`ConfigProfile` repeats model/provider/reasoning fields that can be scoped to named profiles, while `ConfigToml` is the top-level schema loaded from config.toml.[E: codex-rs/config/src/profile_toml.rs:24][E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:31][E: codex-rs/config/src/profile_toml.rs:35][E: codex-rs/config/src/profile_toml.rs:38][E: codex-rs/config/src/config_toml.rs:165]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `model` | `Option<String>` | none | Model selection override. | [E: codex-rs/config/src/config_toml.rs:167] |
| `review_model` | `Option<String>` | none | Review model override used by `/review`. | [E: codex-rs/config/src/config_toml.rs:169] |
| `model_provider` | `Option<String>` | none | Provider id selected from `model_providers`. | [E: codex-rs/config/src/config_toml.rs:172] |
| `model_context_window` | `Option<i64>` | none | Model context-window size. | [E: codex-rs/config/src/config_toml.rs:175] |
| `model_auto_compact_token_limit` | `Option<i64>` | none | Auto-compaction token threshold. | [E: codex-rs/config/src/config_toml.rs:178] |
| `model_auto_compact_token_limit_scope` | `Option<AutoCompactTokenLimitScope>` | none | Auto-compaction limit scope. | [E: codex-rs/config/src/config_toml.rs:182] |
| `model_post_turn_compact_threshold_percent` | `Option<u8>` | `#[schemars(range(min = 0, max = 100))]` | 最终回复后按可用 context window 百分比触发 turn-end compaction。omit 或 `0` 关掉；合法值 0–100。既有 auto-compact 阈值仍生效。 | [E: codex-rs/config/src/config_toml.rs:188] |
| `model_providers` | `HashMap<String, ModelProviderInfo>` | `#[serde(default, deserialize_with = "deserialize_model_providers")]` | User-defined provider entries map. | [E: codex-rs/config/src/config_toml.rs:326] |
| `model_reasoning_effort` | `Option<ReasoningEffort>` | none | Reasoning effort override. | [E: codex-rs/config/src/config_toml.rs:391] |
| `plan_mode_reasoning_effort` | `Option<ReasoningEffort>` | none | Plan-mode reasoning effort override. | [E: codex-rs/config/src/config_toml.rs:392] |
| `model_reasoning_summary` | `Option<ReasoningSummary>` | none | Reasoning summary mode override. | [E: codex-rs/config/src/config_toml.rs:393] |
| `model_verbosity` | `Option<Verbosity>` | none | GPT-5 Responses API text verbosity override. | [E: codex-rs/config/src/config_toml.rs:395] |
| `model_catalog_json` | `Option<AbsolutePathBuf>` | none | Model catalog JSON path. | [E: codex-rs/config/src/config_toml.rs:399] |
| `personality` | `Option<Personality>` | none | Config/profile 级 personality。变体是 `None` / `Friendly` / `Pragmatic`。TUI 已无 `/personality` slash；`Feature::Personality` 现为 `Removed` no-op、`default_enabled: false`。`None` 会让 models-manager 剥掉 catalog `# Personality` H1，不是 picker。 | [E: codex-rs/config/src/config_toml.rs:402][E: codex-rs/protocol/src/config_types.rs:332][E: codex-rs/protocol/src/config_types.rs:333][E: codex-rs/protocol/src/config_types.rs:334][E: codex-rs/protocol/src/config_types.rs:335][E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:1753][E: codex-rs/features/src/lib.rs:1755][E: codex-rs/features/src/lib.rs:1756] |
| `service_tier` | `Option<String>` | none | Explicit service tier request id. | [E: codex-rs/config/src/config_toml.rs:406] |
| `chatgpt_base_url` | `Option<String>` | none | ChatGPT request base URL. | [E: codex-rs/config/src/config_toml.rs:409] |
| `openai_base_url` | `Option<String>` | none | Built-in OpenAI provider base URL override. | [E: codex-rs/config/src/config_toml.rs:424] |
| `oss_provider` | `Option<String>` | none | Preferred OSS provider for local models. | [E: codex-rs/config/src/config_toml.rs:557] |
| `responses_api_metadata` | `Option<BTreeMap<String, String>>` | none | Bounded, product-owned metadata attached to every Responses API request. | [E: codex-rs/config/src/config_toml.rs:415] |

`model_supports_reasoning_summaries` has been removed from the target schema; reasoning-summary capability now comes from the selected model metadata, while `model_reasoning_summary` remains the request-mode override。[E: codex-rs/config/src/config_toml.rs:393][I]

`ConfigProfile.personality` 与顶层 `ConfigToml.personality` 同型，可按 named profile 覆盖。[E: codex-rs/config/src/profile_toml.rs:43]

TUI 不再提供 `/personality` 选择器，但 `turn/start` 仍调用 `personality_opt_out_only`：只有 `Personality::None` 会进入 wire，`Friendly`/`Pragmatic` 被滤掉。bundled GPT-5.4/5.5 的 friendly 语气写在 catalog `instructions_template` 里，不是这个 config 键的 picker。[E: codex-rs/tui/src/app_server_session.rs:1791][E: codex-rs/tui/src/app_server_session.rs:1792][E: codex-rs/tui/src/app_server_session.rs:1322][E: codex-rs/config/src/config_toml.rs:402]

## Model-owned token-budget defaults

Remote/static model metadata can attach a `ModelTokenBudgetConfig` under `ModelMessages.token_budget`，包含 reminder threshold/template、context-window guidance、auto-compact fallback prompt 与 buffer。这些不是新的 top-level `ConfigToml` keys，而是选中模型的 defaults。[E: codex-rs/protocol/src/openai_models.rs:725][E: codex-rs/protocol/src/openai_models.rs:730][E: codex-rs/protocol/src/openai_models.rs:731][E: codex-rs/protocol/src/openai_models.rs:732][E: codex-rs/protocol/src/openai_models.rs:733][E: codex-rs/protocol/src/openai_models.rs:734]

Core 只在 `TokenBudget` feature 开启且用户没有任何 explicit token-budget settings 时应用模型 defaults；无效 model defaults 会 warning 后忽略。该逻辑在每次选定 turn model 后重跑，所以 model switch 会切换对应 defaults，显式配置则始终优先。[E: codex-rs/core/src/session/turn_context.rs:949][E: codex-rs/core/src/session/turn_context.rs:950][E: codex-rs/core/src/session/token_budget.rs:61][E: codex-rs/core/src/session/token_budget.rs:81][E: codex-rs/core/src/session/token_budget.rs:98][E: codex-rs/core/src/session/token_budget.rs:110]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/model-provider-info/src/lib.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/core/src/session/token_budget.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tui/src/app_server_session.rs`

## 相关

- `command.model-mode`
- `config.auth-account`
- `config.storage-telemetry-misc`
