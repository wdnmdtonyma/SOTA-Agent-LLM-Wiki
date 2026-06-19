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
updated: 5670360009
---

> 模型与 provider 设置 catalog 覆盖 ConfigToml 中选择模型、provider、context/compaction limits、reasoning/verbosity、model catalog、service tier、OpenAI/ChatGPT endpoint 和 OSS provider 的顶层键。

## 能回答的问题

- 模型选择、review model、provider id 和 custom provider map 分别是哪几个 key？
- model context window、auto compact token limit 和 limit scope 的 schema 字段是什么？
- reasoning effort、summary、verbosity、service tier 和 personality 如何在 ConfigToml 中声明？
- 哪些 endpoint/provider override 属于模型 provider catalog？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 18 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:136][E: codex-rs/config/src/config_toml.rs:139]

`ConfigProfile` repeats the model/provider/reasoning subset that can be scoped to named profiles, while `ConfigToml` is the top-level schema loaded from config.toml.[E: codex-rs/config/src/profile_toml.rs:24][E: codex-rs/config/src/config_toml.rs:136]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `model` | `Option<String>` | none | Optional override of model selection. | [E: codex-rs/config/src/config_toml.rs:140][E: codex-rs/config/src/config_toml.rs:141] |
| `review_model` | `Option<String>` | none | Review model override used by the `/review` feature. | [E: codex-rs/config/src/config_toml.rs:142][E: codex-rs/config/src/config_toml.rs:143] |
| `model_provider` | `Option<String>` | none | Provider to use from the model_providers map. | [E: codex-rs/config/src/config_toml.rs:145][E: codex-rs/config/src/config_toml.rs:146] |
| `model_context_window` | `Option<i64>` | none | Size of the context window for the model, in tokens. | [E: codex-rs/config/src/config_toml.rs:148][E: codex-rs/config/src/config_toml.rs:149] |
| `model_auto_compact_token_limit` | `Option<i64>` | none | Token usage threshold triggering auto-compaction of conversation history. | [E: codex-rs/config/src/config_toml.rs:151][E: codex-rs/config/src/config_toml.rs:152] |
| `model_auto_compact_token_limit_scope` | `Option<AutoCompactTokenLimitScope>` | none | Controls whether the auto-compaction limit applies to the full context or only to tokens after the carried prefix in the current compaction window. | [E: codex-rs/config/src/config_toml.rs:154][E: codex-rs/config/src/config_toml.rs:156] |
| `model_providers` | `HashMap<String, ModelProviderInfo>` | `#[serde(default, deserialize_with = "deserialize_model_providers")]` | User-defined provider entries that extend the built-in list. Built-in IDs cannot be overridden. | [E: codex-rs/config/src/config_toml.rs:270][E: codex-rs/config/src/config_toml.rs:272][E: codex-rs/config/src/config_toml.rs:273] |
| `model_reasoning_effort` | `Option<ReasoningEffort>` | none | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:337] |
| `plan_mode_reasoning_effort` | `Option<ReasoningEffort>` | none | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:338] |
| `model_reasoning_summary` | `Option<ReasoningSummary>` | none | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:339] |
| `model_verbosity` | `Option<Verbosity>` | none | Optional verbosity control for GPT-5 models (Responses API `text.verbosity`). | [E: codex-rs/config/src/config_toml.rs:340][E: codex-rs/config/src/config_toml.rs:341] |
| `model_supports_reasoning_summaries` | `Option<bool>` | none | Override to force-enable reasoning summaries for the configured model. | [E: codex-rs/config/src/config_toml.rs:343][E: codex-rs/config/src/config_toml.rs:344] |
| `model_catalog_json` | `Option<AbsolutePathBuf>` | none | Optional path to a JSON model catalog (applied on startup only). Per-thread `config` overrides are accepted but do not reapply this (no-ops). | [E: codex-rs/config/src/config_toml.rs:346][E: codex-rs/config/src/config_toml.rs:348] |
| `personality` | `Option<Personality>` | none | Optionally specify a personality for the model | [E: codex-rs/config/src/config_toml.rs:350][E: codex-rs/config/src/config_toml.rs:351] |
| `service_tier` | `Option<String>` | none | Optional explicit service tier request id for new turns (for example `default`, `priority`, or `flex`; legacy `fast` also works). | [E: codex-rs/config/src/config_toml.rs:353][E: codex-rs/config/src/config_toml.rs:355] |
| `chatgpt_base_url` | `Option<String>` | none | Base URL for requests to ChatGPT (as opposed to the OpenAI API). | [E: codex-rs/config/src/config_toml.rs:357][E: codex-rs/config/src/config_toml.rs:358] |
| `openai_base_url` | `Option<String>` | none | Base URL override for the built-in `openai` model provider. | [E: codex-rs/config/src/config_toml.rs:363][E: codex-rs/config/src/config_toml.rs:364] |
| `oss_provider` | `Option<String>` | none | Preferred OSS provider for local models, e.g. "lmstudio" or "ollama". | [E: codex-rs/config/src/config_toml.rs:499][E: codex-rs/config/src/config_toml.rs:500] |

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
