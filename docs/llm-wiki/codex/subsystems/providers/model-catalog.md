---
id: subsys.providers.model-catalog
title: Model catalog
kind: subsystem
tier: T2
source: [codex-rs/models-manager/src/manager.rs, codex-rs/models-manager/src/cache.rs, codex-rs/models-manager/src/model_info.rs, codex-rs/models-manager/src/config.rs, codex-rs/models-manager/src/lib.rs, codex-rs/models-manager/models.json, codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/amazon_bedrock/mod.rs, codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs, codex-rs/model-provider/src/models_endpoint.rs, codex-rs/codex-api/src/endpoint/models.rs, codex-rs/core/src/config/mod.rs, codex-rs/core/src/thread_manager.rs, codex-rs/features/src/lib.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/config/src/config_toml.rs]
symbols: [ModelsManager, ModelsEndpointClient, OpenAiModelsManager, StaticModelsManager, RefreshStrategy, ModelsCacheManager, ModelsCache, ModelsManagerConfig, ModelMessages, ModelTokenBudgetConfig, CollaborationModeMessages, bundled_models_response, model_info_from_slug, with_config_overrides, strip_personality_section, ModelInfo::get_model_instructions, ModelsClient, OpenAiModelsEndpoint]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.responses-api, subsys.providers.auth-layer, subsys.core.token-budget, command.model-mode, config.model-provider]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Model catalog subsystem is split between an in-process manager and a provider-owned `/models` endpoint: `OpenAiModelsManager` starts from bundled `models.json`, may refresh/cache remote models, and builds picker-ready `ModelPreset`s; `StaticModelsManager` serves an authoritative catalog supplied by config or by a provider override such as Bedrock.[E: codex-rs/models-manager/src/manager.rs:39][E: codex-rs/models-manager/src/manager.rs:79][E: codex-rs/models-manager/src/manager.rs:153][E: codex-rs/models-manager/src/manager.rs:245][E: codex-rs/models-manager/src/manager.rs:255][E: codex-rs/models-manager/src/lib.rs:13][E: codex-rs/models-manager/src/lib.rs:15][E: codex-rs/model-provider/src/provider.rs:444][E: codex-rs/model-provider/src/provider.rs:450][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:352][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:357]

## 能回答的问题

- bundled `models.json`、`model_catalog_json` 和 provider-specific static catalogs 分别如何进入 `ModelsManager`?
- refresh strategies Online/Offline/OnlineIfUncached 分别做什么?
- `/models` refresh 何时被允许，何时只读 cache?
- models cache 文件路径、TTL、client version 和 ETag 如何工作?
- model picker presets、默认模型和 unknown slug fallback metadata 如何生成?

## 职责边界

`models-manager` owns refresh policy, cache behavior, picker filtering, default selection, and model metadata overrides. Provider/auth/transport details are behind `ModelsEndpointClient`; the concrete OpenAI-compatible implementation lives in `model-provider/src/models_endpoint.rs` and uses `codex-api::ModelsClient` to issue `GET /models`.[E: codex-rs/models-manager/src/manager.rs:39][E: codex-rs/model-provider/src/models_endpoint.rs:45][E: codex-rs/model-provider/src/models_endpoint.rs:77][E: codex-rs/codex-api/src/endpoint/models.rs:46]

## 关键 crate/文件

- `codex-rs/models-manager/src/manager.rs`: `ModelsEndpointClient`, `ModelsManager`, refresh strategies, cache application, static/openai manager implementations, model lookup, preset build.[E: codex-rs/models-manager/src/manager.rs:39][E: codex-rs/models-manager/src/manager.rs:79][E: codex-rs/models-manager/src/manager.rs:107][E: codex-rs/models-manager/src/manager.rs:241][E: codex-rs/models-manager/src/manager.rs:245][E: codex-rs/models-manager/src/manager.rs:728]
- `codex-rs/model-provider/src/provider.rs`: `ConfiguredModelProvider::models_manager` chooses `StaticModelsManager` when config supplies a catalog and `OpenAiModelsManager` otherwise.[E: codex-rs/model-provider/src/provider.rs:444][E: codex-rs/model-provider/src/provider.rs:450][E: codex-rs/model-provider/src/provider.rs:459]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: Bedrock overrides model discovery to always return `StaticModelsManager`；config catalog 优先，否则 Mantle 用 `static_model_catalog`，Runtime 用优先 global 的 `static_runtime_model_catalog`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:352][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:201][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:9]
- `codex-rs/model-provider/src/models_endpoint.rs`: `OpenAiModelsEndpoint` resolves provider auth, builds `ModelsClient`, applies request telemetry, and runs the call under a 5s timeout.[E: codex-rs/model-provider/src/models_endpoint.rs:45][E: codex-rs/model-provider/src/models_endpoint.rs:77][E: codex-rs/model-provider/src/models_endpoint.rs:96][E: codex-rs/model-provider/src/models_endpoint.rs:117][E: codex-rs/model-provider/src/models_endpoint.rs:40]
- `codex-rs/models-manager/src/cache.rs`: on-disk cache load, freshness check, persist, TTL renewal, and serialized cache schema.[E: codex-rs/models-manager/src/cache.rs:25][E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:65][E: codex-rs/models-manager/src/cache.rs:157]
- `codex-rs/models-manager/src/model_info.rs`: config overrides and fallback model metadata for unknown slugs.[E: codex-rs/models-manager/src/model_info.rs:19][E: codex-rs/models-manager/src/model_info.rs:113]

## 数据模型

- `ModelsEndpointClient` exposes `identity`, `has_command_auth`, `uses_codex_backend`, optional `supports_api_key_models`，以及 `list_models(client_version, HttpClientFactory)`；caller-provided factory carries the selected outbound-proxy policy across the refresh boundary。[E: codex-rs/models-manager/src/manager.rs:39][E: codex-rs/models-manager/src/manager.rs:44][E: codex-rs/models-manager/src/manager.rs:53]
- `RefreshStrategy` has `Online`, `Offline`, and `OnlineIfUncached`; its display strings are `online`, `offline`, and `online_if_uncached`.[E: codex-rs/models-manager/src/manager.rs:79][E: codex-rs/models-manager/src/manager.rs:89]
- `OpenAiModelsManager` stores remote models、ETag、optional cache、provider endpoint client、`api_key_model_discovery_enabled`（默认 `false`）与 optional `AuthManager`；`new` uses `{codex_home}/models_cache.json`，`new_without_cache` 则明确关闭持久 cache。[E: codex-rs/models-manager/src/manager.rs:245][E: codex-rs/models-manager/src/manager.rs:249][E: codex-rs/models-manager/src/manager.rs:267][E: codex-rs/models-manager/src/manager.rs:313]
- `StaticModelsManager` stores a fixed `Vec<ModelInfo>` from a supplied `ModelsResponse` and never refreshes remotely。[E: codex-rs/models-manager/src/manager.rs:255]
- `ModelsCacheEntry` stores `fetched_at`, optional `etag`, optional `client_version`, optional `identity`, and `models`; file load rejects version mismatches and stale TTL。[E: codex-rs/models-manager/src/cache.rs:65][E: codex-rs/models-manager/src/cache.rs:78][E: codex-rs/models-manager/src/cache.rs:200][E: codex-rs/models-manager/src/cache.rs:209]
- `ModelsManagerConfig` carries model context、auto-compact、tool-output limit、base instructions、`personality_enabled`、optional `Personality` 与 optional full model catalog；旧的 reasoning-summary override 已不在这个 config struct。`personality_enabled` 来自 `Feature::Personality`，不是 TUI `/personality` picker。[E: codex-rs/models-manager/src/config.rs:5][E: codex-rs/models-manager/src/config.rs:9][E: codex-rs/models-manager/src/config.rs:10][E: codex-rs/models-manager/src/config.rs:11][E: codex-rs/core/src/config/mod.rs:1624][E: codex-rs/features/src/lib.rs:346]
- `ModelMessages` 除 instruction template 外还可携带 approval、collaboration-mode、auto-review、permission 和 model-owned token-budget messages；token-budget config 包含 reminder threshold/template、context-window guidance、fallback prompt 与 buffer。[E: codex-rs/protocol/src/openai_models.rs:556][E: codex-rs/protocol/src/openai_models.rs:565][E: codex-rs/protocol/src/openai_models.rs:566][E: codex-rs/protocol/src/openai_models.rs:567][E: codex-rs/protocol/src/openai_models.rs:568][E: codex-rs/protocol/src/openai_models.rs:608]
- `Feature::ApiKeyModelDiscovery`（key `api_key_model_discovery`）是 UnderDevelopment、default-off 的 opt-in。它只打开 OpenAI API key 会话的 remote `/models` discovery；live 开关要新 session，static catalog 忽略该设置。[E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:1229][E: codex-rs/features/src/lib.rs:1232][E: codex-rs/core/src/thread_manager.rs:409][E: codex-rs/models-manager/src/manager.rs:110]

## 控制流

1. Core config loads `model_catalog_json` into a `ModelsResponse`, rejects an empty catalog, and passes it through `Config::to_models_manager_config`.[E: codex-rs/core/src/config/mod.rs:2061][E: codex-rs/core/src/config/mod.rs:2072][E: codex-rs/core/src/config/mod.rs:1613][E: codex-rs/core/src/config/mod.rs:3917]
2. `ConfiguredModelProvider::models_manager` returns `StaticModelsManager` for a supplied config catalog; otherwise it constructs `OpenAiModelsEndpoint` and wraps it in `OpenAiModelsManager`.[E: codex-rs/model-provider/src/provider.rs:444][E: codex-rs/model-provider/src/provider.rs:449][E: codex-rs/model-provider/src/provider.rs:450][E: codex-rs/model-provider/src/provider.rs:455][E: codex-rs/model-provider/src/provider.rs:459]
3. `AmazonBedrockModelProvider::models_manager` bypasses `/models` refresh and returns `StaticModelsManager` for either a config-supplied catalog or `default_model_catalog()`。Runtime catalog 把 `global.` 变体排在 `us.` 前面。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:352][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:201][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:9]
4. `ModelsManager::list_models` calls `raw_model_catalog(refresh_strategy)` and then `build_available_models`; `build_available_models` sorts by priority, converts to presets, filters by auth mode, and marks the default by picker visibility.[E: codex-rs/models-manager/src/manager.rs:115][E: codex-rs/models-manager/src/manager.rs:150][E: codex-rs/models-manager/src/manager.rs:153][E: codex-rs/models-manager/src/manager.rs:154][E: codex-rs/models-manager/src/manager.rs:160][E: codex-rs/models-manager/src/manager.rs:162]
5. `OpenAiModelsManager::raw_model_catalog` 接收 `HttpClientFactory`，attempts refresh、logs refresh failure，then returns current in-memory remote models；同一个 factory 会继续传到 endpoint fetch。[E: codex-rs/models-manager/src/manager.rs:336][E: codex-rs/models-manager/src/manager.rs:458][E: codex-rs/models-manager/src/manager.rs:464]
6. Refresh is skipped unless the endpoint currently uses the Codex backend, has command auth, or this session is an enabled API-key discovery session. `supports_api_key_discovery()` 还要求 endpoint `supports_api_key_models()`、没有 command auth、且当前 auth 是 `AuthMode::ApiKey`。[E: codex-rs/models-manager/src/manager.rs:511][E: codex-rs/models-manager/src/manager.rs:502][E: codex-rs/model-provider/src/models_endpoint.rs:143]
7. 对 API-key discovery session，feature 关闭时 `refresh_available_models` 立刻返回，连 cache load 也不做，继续用 bundled models。[E: codex-rs/models-manager/src/manager.rs:441][E: codex-rs/models-manager/src/manager.rs:313][E: codex-rs/features/src/lib.rs:1232]
8. Offline only loads cache; OnlineIfUncached loads cache first and fetches on miss; Online always fetches once the auth/command/API-key guard has allowed refresh. Skipped Offline/OnlineIfUncached still try to load cache when the API-key gate did not early-return。[E: codex-rs/models-manager/src/manager.rs:446][E: codex-rs/models-manager/src/manager.rs:455][E: codex-rs/models-manager/src/manager.rs:460][E: codex-rs/models-manager/src/manager.rs:466]
9. Remote fetch calls the endpoint with whole client version and a cloned `HttpClientFactory`, applies returned models, stores ETag/identity, and only persists when `cache` is present。[E: codex-rs/models-manager/src/manager.rs:470][E: codex-rs/models-manager/src/manager.rs:493]
10. `OpenAiModelsEndpoint::list_models` resolves provider auth, creates `ModelsClient`, applies telemetry, wraps the call in a 5s timeout, and maps API errors to core errors。[E: codex-rs/model-provider/src/models_endpoint.rs:77][E: codex-rs/model-provider/src/models_endpoint.rs:117][E: codex-rs/model-provider/src/models_endpoint.rs:40][E: codex-rs/model-provider/src/models_endpoint.rs:125]
11. `ModelsClient::list_models` executes `GET models`, appends `client_version` as a query parameter, reads the ETag header, and decodes the body as `ModelsResponse`.[E: codex-rs/codex-api/src/endpoint/models.rs:31][E: codex-rs/codex-api/src/endpoint/models.rs:35][E: codex-rs/codex-api/src/endpoint/models.rs:46][E: codex-rs/codex-api/src/endpoint/models.rs:64][E: codex-rs/codex-api/src/endpoint/models.rs:70]
12. Remote model application uses the remote list as source of truth only when it contains at least one listed model and current auth is ChatGPT **or** this is an API-key discovery session; otherwise it starts from bundled models and replaces matching slugs or appends new ones。[E: codex-rs/models-manager/src/manager.rs:524][E: codex-rs/models-manager/src/manager.rs:528][E: codex-rs/models-manager/src/manager.rs:534]
13. Model metadata lookup tries longest-prefix match, then one-level namespaced suffix match, otherwise `model_info_from_slug`; it preserves the requested slug and then applies config overrides。[E: codex-rs/models-manager/src/manager.rs:728][E: codex-rs/models-manager/src/manager.rs:735][E: codex-rs/models-manager/src/manager.rs:744][E: codex-rs/models-manager/src/manager.rs:746]

## 设计动机与权衡

- The current design keeps model discovery policy in `models-manager` while letting providers own auth and transport through `ModelsEndpointClient`; this is an inference from the trait boundary and `OpenAiModelsEndpoint` implementation.[E: codex-rs/models-manager/src/manager.rs:39][E: codex-rs/model-provider/src/models_endpoint.rs:45][E: codex-rs/model-provider/src/models_endpoint.rs:77][I]
- Config-supplied catalogs are authoritative for generic providers because `ConfiguredModelProvider::models_manager` chooses `StaticModelsManager`, whose refresh hook is a no-op; Bedrock is stricter and always returns a static manager, even without config catalog。[E: codex-rs/model-provider/src/provider.rs:444][E: codex-rs/model-provider/src/provider.rs:450][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:352][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:357][I]
- `with_config_overrides` clamps context window by `max_context_window` and overrides auto compact/tool-output/base instructions。显式 `base_instructions` 会替换 `instructions_template` 并清空 `instructions_variables`，approval / collaboration-mode / auto-review / permission / token-budget messages 仍保留。关闭 `Feature::Personality` **不会**清掉 template；只有 `personality_enabled && personality == Some(Personality::None)` 才调用 `strip_personality_section` 删除 `# Personality` H1。[E: codex-rs/models-manager/src/model_info.rs:19][E: codex-rs/models-manager/src/model_info.rs:46][E: codex-rs/models-manager/src/model_info.rs:62][E: codex-rs/models-manager/src/model_info.rs:63][E: codex-rs/models-manager/src/model_info.rs:76][E: codex-rs/models-manager/src/model_info.rs:76]
- `ModelInfo::get_model_instructions` 仍接收 `Option<Personality>`，但参数被忽略，直接返回 literal `instructions_template`。`None` opt-out 已经在 models-manager 做完。旧 catalog 的 `ModelInstructionsVariables`（`personality_default` / `personality_friendly` / `personality_pragmatic`）只为解码保留，不再做模板插值。[E: codex-rs/protocol/src/openai_models.rs:536][E: codex-rs/protocol/src/openai_models.rs:564][E: codex-rs/protocol/src/openai_models.rs:673][E: codex-rs/protocol/src/openai_models.rs:675][E: codex-rs/protocol/src/openai_models.rs:676][E: codex-rs/protocol/src/openai_models.rs:677]
- bundled `models.json` 里 `gpt-5.5` / `gpt-5.4` 的 `instructions_template` 内嵌 `# Personality` friendly 文本。这是 catalog 指令，不是 TUI `/personality` 选择器；`supports_personality` 对 new presets 已 deprecated 且默认 false。[E: codex-rs/models-manager/models.json:782][E: codex-rs/models-manager/models.json:842][E: codex-rs/models-manager/models.json:893][E: codex-rs/models-manager/models.json:957][E: codex-rs/protocol/src/openai_models.rs:252]

## gotcha

- A fresh cache is version-scoped: `client_version_to_whole` strips prerelease suffixes to `major.minor.patch`, and file load rejects cache entries whose stored version differs.[E: codex-rs/models-manager/src/lib.rs:19][E: codex-rs/models-manager/src/cache.rs:200]
- `refresh_if_new_etag` 只在 identity 与当前 endpoint 一致且 ETag 未变时走 `refresh_ttl`；file cache 在 incoming ETag 与当前 non-empty ETag 相同且 cache 已超过半个 TTL 时才重写 `fetched_at`，前半个 TTL 内 renewal 是 no-op。[E: codex-rs/models-manager/src/manager.rs:408][E: codex-rs/models-manager/src/cache.rs:157][E: codex-rs/models-manager/src/cache.rs:182]
- Fallback model metadata marks `used_fallback_model_metadata = true`, sets `supported_in_api = true` and `supports_reasoning_summary_parameter = true`, uses a 272000-token context/max-context window, and defaults truncation to 10000 bytes。[E: codex-rs/models-manager/src/model_info.rs:113][E: codex-rs/models-manager/src/model_info.rs:123][E: codex-rs/models-manager/src/model_info.rs:135][E: codex-rs/models-manager/src/model_info.rs:141][E: codex-rs/models-manager/src/model_info.rs:143][E: codex-rs/models-manager/src/model_info.rs:150]
- `api_key_model_discovery` 不是默认开。未打开时，OpenAI API key 会话继续用 bundled catalog，不会去拉 `/models`。[E: codex-rs/features/src/lib.rs:1232][E: codex-rs/models-manager/src/manager.rs:441]
- TUI `/personality` 已从 `SlashCommand` 删除，但 `Feature::Personality` 与 `ConfigToml.personality` 仍驱动 catalog override。不要把 “TUI picker 删除” 写成 “personality 子系统整段删除”。[E: codex-rs/features/src/lib.rs:346][E: codex-rs/config/src/config_toml.rs:387]

## Sources

- `codex-rs/models-manager/src/manager.rs`
- `codex-rs/models-manager/src/cache.rs`
- `codex-rs/models-manager/src/model_info.rs`
- `codex-rs/models-manager/src/config.rs`
- `codex-rs/models-manager/src/lib.rs`
- `codex-rs/models-manager/models.json`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`
- `codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs`
- `codex-rs/model-provider/src/models_endpoint.rs`
- `codex-rs/codex-api/src/endpoint/models.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/config/src/config_toml.rs`

## 相关

- `subsys.providers.overview`
- `subsys.providers.provider-openai`
- `subsys.providers.responses-api`
- `subsys.providers.auth-layer`
- `command.model-mode`
- `config.model-provider`
