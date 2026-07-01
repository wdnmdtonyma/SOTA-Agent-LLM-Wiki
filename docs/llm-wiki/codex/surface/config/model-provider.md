---
id: config.model-provider
title: 模型与 provider 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/protocol/src/config_types.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [ConfigToml, ConfigProfile, ModelProviderInfo, AutoCompactTokenLimitScope, ReasoningEffort, ReasoningSummary, Verbosity, Personality]
related: [command.model-mode, config.auth-account, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: db887d03e1
---

> 模型与 provider 设置 catalog 覆盖 ConfigToml 中选择模型、provider、context/compaction limits、reasoning/verbosity、model catalog、service tier、OpenAI/ChatGPT endpoint 和 OSS provider 的顶层键。

## 能回答的问题

- 模型选择、review model、provider id 和 custom provider map 分别是哪几个 key？
- model context window、auto compact token limit 和 limit scope 的 schema 字段是什么？
- reasoning effort、summary、verbosity、service tier 和 personality 如何在 ConfigToml 中声明？
- 哪些 endpoint/provider override 属于模型 provider catalog？

## Catalog 边界

当前 `ConfigToml` 有 97 个顶层 `pub` 字段；本节点覆盖其中 18 个字段。[E: codex-rs/config/src/config_toml.rs:154][E: codex-rs/config/src/config_toml.rs:518]

`ConfigProfile` repeats model/provider/reasoning fields that can be scoped to named profiles, while `ConfigToml` is the top-level schema loaded from config.toml.[E: codex-rs/config/src/profile_toml.rs:24][E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:31][E: codex-rs/config/src/profile_toml.rs:35][E: codex-rs/config/src/profile_toml.rs:38][E: codex-rs/config/src/config_toml.rs:154]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `model` | `Option<String>` | none | Model selection override. | [E: codex-rs/config/src/config_toml.rs:156] |
| `review_model` | `Option<String>` | none | Review model override used by `/review`. | [E: codex-rs/config/src/config_toml.rs:158] |
| `model_provider` | `Option<String>` | none | Provider id selected from `model_providers`. | [E: codex-rs/config/src/config_toml.rs:161] |
| `model_context_window` | `Option<i64>` | none | Model context-window size. | [E: codex-rs/config/src/config_toml.rs:164] |
| `model_auto_compact_token_limit` | `Option<i64>` | none | Auto-compaction token threshold. | [E: codex-rs/config/src/config_toml.rs:167] |
| `model_auto_compact_token_limit_scope` | `Option<AutoCompactTokenLimitScope>` | none | Auto-compaction limit scope. | [E: codex-rs/config/src/config_toml.rs:171] |
| `model_providers` | `HashMap<String, ModelProviderInfo>` | `#[serde(default, deserialize_with = "deserialize_model_providers")]` | User-defined provider entries map. | [E: codex-rs/config/src/config_toml.rs:287][E: codex-rs/config/src/config_toml.rs:288] |
| `model_reasoning_effort` | `Option<ReasoningEffort>` | none | Reasoning effort override. | [E: codex-rs/config/src/config_toml.rs:352] |
| `plan_mode_reasoning_effort` | `Option<ReasoningEffort>` | none | Plan-mode reasoning effort override. | [E: codex-rs/config/src/config_toml.rs:353] |
| `model_reasoning_summary` | `Option<ReasoningSummary>` | none | Reasoning summary mode override. | [E: codex-rs/config/src/config_toml.rs:354] |
| `model_verbosity` | `Option<Verbosity>` | none | GPT-5 Responses API text verbosity override. | [E: codex-rs/config/src/config_toml.rs:356] |
| `model_supports_reasoning_summaries` | `Option<bool>` | none | Forced reasoning-summary support override. | [E: codex-rs/config/src/config_toml.rs:359] |
| `model_catalog_json` | `Option<AbsolutePathBuf>` | none | Model catalog JSON path. | [E: codex-rs/config/src/config_toml.rs:363] |
| `personality` | `Option<Personality>` | none | Model personality selector. | [E: codex-rs/config/src/config_toml.rs:366] |
| `service_tier` | `Option<String>` | none | Explicit service tier request id. | [E: codex-rs/config/src/config_toml.rs:370] |
| `chatgpt_base_url` | `Option<String>` | none | ChatGPT request base URL. | [E: codex-rs/config/src/config_toml.rs:373] |
| `openai_base_url` | `Option<String>` | none | Built-in OpenAI provider base URL override. | [E: codex-rs/config/src/config_toml.rs:382] |
| `oss_provider` | `Option<String>` | none | Preferred OSS provider for local models. | [E: codex-rs/config/src/config_toml.rs:518] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/model-provider-info/src/lib.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/protocol/src/openai_models.rs`

## 相关

- `command.model-mode`
- `config.auth-account`
- `config.storage-telemetry-misc`
