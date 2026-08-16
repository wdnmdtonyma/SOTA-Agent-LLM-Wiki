---
id: subsys.providers.model-catalog
title: Model catalog
kind: subsystem
tier: T2
source: [codex-rs/models-manager/src/manager.rs, codex-rs/models-manager/src/cache.rs, codex-rs/models-manager/src/model_info.rs, codex-rs/models-manager/src/config.rs, codex-rs/models-manager/src/lib.rs, codex-rs/models-manager/models.json, codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/amazon_bedrock/mod.rs, codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs, codex-rs/model-provider/src/models_endpoint.rs, codex-rs/codex-api/src/endpoint/models.rs, codex-rs/core/src/config/mod.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [ModelsManager, ModelsEndpointClient, OpenAiModelsManager, StaticModelsManager, RefreshStrategy, ModelsCacheManager, ModelsCache, ModelsManagerConfig, ModelMessages, ModelTokenBudgetConfig, CollaborationModeMessages, bundled_models_response, model_info_from_slug, with_config_overrides, strip_personality_section, ModelsClient, OpenAiModelsEndpoint]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.responses-api, subsys.providers.auth-layer, subsys.core.token-budget, command.model-mode]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Model catalog subsystem is split between an in-process manager and a provider-owned `/models` endpoint: `OpenAiModelsManager` starts from bundled `models.json`, may refresh/cache remote models, and builds picker-ready `ModelPreset`s; `StaticModelsManager` serves an authoritative catalog supplied by config or by a provider override such as Bedrock.[E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/models-manager/src/manager.rs:81][E: codex-rs/models-manager/src/manager.rs:123][E: codex-rs/models-manager/src/manager.rs:214][E: codex-rs/models-manager/src/manager.rs:223][E: codex-rs/models-manager/src/lib.rs:13][E: codex-rs/models-manager/src/lib.rs:15][E: codex-rs/model-provider/src/provider.rs:328][E: codex-rs/model-provider/src/provider.rs:333][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:177][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:184][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:184]

## 能回答的问题

- bundled `models.json`、`model_catalog_json` 和 provider-specific static catalogs 分别如何进入 `ModelsManager`?
- refresh strategies Online/Offline/OnlineIfUncached 分别做什么?
- `/models` refresh 何时被允许，何时只读 cache?
- models cache 文件路径、TTL、client version 和 ETag 如何工作?
- model picker presets、默认模型和 unknown slug fallback metadata 如何生成?

## 职责边界

`models-manager` owns refresh policy, cache behavior, picker filtering, default selection, and model metadata overrides. Provider/auth/transport details are behind `ModelsEndpointClient`; the concrete OpenAI-compatible implementation lives in `model-provider/src/models_endpoint.rs` and uses `codex-api::ModelsClient` to issue `GET /models`.[E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/model-provider/src/models_endpoint.rs:43][E: codex-rs/model-provider/src/models_endpoint.rs:75][E: codex-rs/model-provider/src/models_endpoint.rs:106][E: codex-rs/codex-api/src/endpoint/models.rs:46]

## 关键 crate/文件

- `codex-rs/models-manager/src/manager.rs`: `ModelsEndpointClient`, `ModelsManager`, refresh strategies, cache application, static/openai manager implementations, model lookup, preset build.[E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/models-manager/src/manager.rs:52][E: codex-rs/models-manager/src/manager.rs:81][E: codex-rs/models-manager/src/manager.rs:214][E: codex-rs/models-manager/src/manager.rs:223][E: codex-rs/models-manager/src/manager.rs:618]
- `codex-rs/model-provider/src/provider.rs`: `ConfiguredModelProvider::models_manager` chooses `StaticModelsManager` when config supplies a catalog and `OpenAiModelsManager` otherwise.[E: codex-rs/model-provider/src/provider.rs:328][E: codex-rs/model-provider/src/provider.rs:333][E: codex-rs/model-provider/src/provider.rs:339][E: codex-rs/model-provider/src/provider.rs:342]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: Bedrock overrides model discovery to always return `StaticModelsManager`；config catalog 优先，否则 Mantle 用 `static_model_catalog`，Runtime 用优先 global 的 `static_runtime_model_catalog`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:225][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:144][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:8]
- `codex-rs/model-provider/src/models_endpoint.rs`: `OpenAiModelsEndpoint` resolves provider auth, builds `ModelsClient`, applies request telemetry, and runs the call under a 5s timeout.[E: codex-rs/model-provider/src/models_endpoint.rs:43][E: codex-rs/model-provider/src/models_endpoint.rs:75][E: codex-rs/model-provider/src/models_endpoint.rs:82][E: codex-rs/model-provider/src/models_endpoint.rs:84][E: codex-rs/model-provider/src/models_endpoint.rs:85][E: codex-rs/model-provider/src/models_endpoint.rs:106][E: codex-rs/model-provider/src/models_endpoint.rs:95]
- `codex-rs/models-manager/src/cache.rs`: on-disk cache load, freshness check, persist, TTL renewal, and serialized cache schema.[E: codex-rs/models-manager/src/cache.rs:25][E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:76][E: codex-rs/models-manager/src/cache.rs:96][E: codex-rs/models-manager/src/cache.rs:165]
- `codex-rs/models-manager/src/model_info.rs`: config overrides and fallback model metadata for unknown slugs.[E: codex-rs/models-manager/src/model_info.rs:25][E: codex-rs/models-manager/src/model_info.rs:125]

## 数据模型

- `ModelsEndpointClient` exposes `has_command_auth`, `uses_codex_backend`, and `list_models(client_version, HttpClientFactory) -> (Vec<ModelInfo>, Option<String>)`; caller-provided factory carries the selected outbound-proxy policy across the refresh boundary。[E: codex-rs/models-manager/src/manager.rs:37]
- `RefreshStrategy` has `Online`, `Offline`, and `OnlineIfUncached`; its display strings are `online`, `offline`, and `online_if_uncached`.[E: codex-rs/models-manager/src/manager.rs:52][E: codex-rs/models-manager/src/manager.rs:52][E: codex-rs/models-manager/src/manager.rs:55][E: codex-rs/models-manager/src/manager.rs:58][E: codex-rs/models-manager/src/manager.rs:60][E: codex-rs/models-manager/src/manager.rs:62][E: codex-rs/models-manager/src/manager.rs:70]
- `OpenAiModelsManager` stores remote models、ETag、optional `ModelsCacheManager`、provider endpoint client 与 optional `AuthManager`；`new` uses `{codex_home}/models_cache.json`，`new_without_cache` 则明确关闭持久 cache。[E: codex-rs/models-manager/src/manager.rs:218]
- `StaticModelsManager` stores a fixed `Vec<ModelInfo>` from a supplied `ModelsResponse` and never refreshes remotely。[E: codex-rs/models-manager/src/manager.rs:228]
- `ModelsCache` stores `fetched_at`, optional `etag`, optional `client_version`, and `models`; `load_fresh` rejects version mismatches and stale TTL.[E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:52][E: codex-rs/models-manager/src/cache.rs:59][E: codex-rs/models-manager/src/cache.rs:165][E: codex-rs/models-manager/src/cache.rs:165][E: codex-rs/models-manager/src/cache.rs:165][E: codex-rs/models-manager/src/cache.rs:170][E: codex-rs/models-manager/src/cache.rs:171]
- `ModelsManagerConfig` carries model context、auto-compact、tool-output limit、base instructions、personality feature flag、optional `Personality` 选择与 optional full model catalog；旧的 reasoning-summary override 已不在这个 config struct。[E: codex-rs/models-manager/src/config.rs:5][E: codex-rs/models-manager/src/config.rs:6][E: codex-rs/models-manager/src/config.rs:7][E: codex-rs/models-manager/src/config.rs:8][E: codex-rs/models-manager/src/config.rs:9][E: codex-rs/models-manager/src/config.rs:10][E: codex-rs/models-manager/src/config.rs:11][E: codex-rs/models-manager/src/config.rs:12]
- `ModelMessages` 除 instruction template 外还可携带 approval、collaboration-mode、auto-review、permission 和 model-owned token-budget messages；token-budget defaults 包含 reminder threshold/template、context-window guidance、fallback prompt 与 buffer。[E: codex-rs/protocol/src/openai_models.rs:505][E: codex-rs/protocol/src/openai_models.rs:506][E: codex-rs/protocol/src/openai_models.rs:510][E: codex-rs/protocol/src/openai_models.rs:514][E: codex-rs/protocol/src/openai_models.rs:517][E: codex-rs/protocol/src/openai_models.rs:526]

## 控制流

1. Core config loads `model_catalog_json` into a `ModelsResponse`, rejects an empty catalog, and passes it through `Config::to_models_manager_config`.[E: codex-rs/core/src/config/mod.rs:1588][E: codex-rs/core/src/config/mod.rs:1596][E: codex-rs/core/src/config/mod.rs:2014][E: codex-rs/core/src/config/mod.rs:2023][E: codex-rs/core/src/config/mod.rs:2037][E: codex-rs/core/src/config/mod.rs:2040]
2. `ConfiguredModelProvider::models_manager` returns `StaticModelsManager` for a supplied config catalog; otherwise it constructs `OpenAiModelsEndpoint` and wraps it in `OpenAiModelsManager`.[E: codex-rs/model-provider/src/provider.rs:328][E: codex-rs/model-provider/src/provider.rs:333][E: codex-rs/model-provider/src/provider.rs:334][E: codex-rs/model-provider/src/provider.rs:339][E: codex-rs/model-provider/src/provider.rs:342]
3. `AmazonBedrockModelProvider::models_manager` bypasses `/models` refresh and returns `StaticModelsManager` for either a config-supplied catalog or `default_model_catalog()`。Runtime catalog 把 `global.` 变体排在 `us.` 前面。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:225][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:144][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:8]
4. `ModelsManager::list_models` calls `raw_model_catalog(refresh_strategy)` and then `build_available_models`; `build_available_models` sorts by priority, converts to presets, filters by auth mode, and marks the default by picker visibility.[E: codex-rs/models-manager/src/manager.rs:88][E: codex-rs/models-manager/src/manager.rs:89][E: codex-rs/models-manager/src/manager.rs:95][E: codex-rs/models-manager/src/manager.rs:123][E: codex-rs/models-manager/src/manager.rs:123][E: codex-rs/models-manager/src/manager.rs:126][E: codex-rs/models-manager/src/manager.rs:127][E: codex-rs/models-manager/src/manager.rs:130][E: codex-rs/models-manager/src/manager.rs:132]
5. `OpenAiModelsManager::raw_model_catalog` 接收 `HttpClientFactory`，attempts refresh、logs refresh failure，then returns current in-memory remote models；同一个 factory 会继续传到 endpoint fetch。[E: codex-rs/models-manager/src/manager.rs:322][E: codex-rs/models-manager/src/manager.rs:323][E: codex-rs/models-manager/src/manager.rs:327][E: codex-rs/models-manager/src/manager.rs:328][E: codex-rs/models-manager/src/manager.rs:394][E: codex-rs/models-manager/src/manager.rs:396][E: codex-rs/models-manager/src/manager.rs:400]
6. Refresh is skipped unless the endpoint currently uses the Codex backend or has command auth; skipped Offline/OnlineIfUncached still try to load cache.[E: codex-rs/models-manager/src/manager.rs:362][E: codex-rs/models-manager/src/manager.rs:362][E: codex-rs/models-manager/src/manager.rs:367][E: codex-rs/models-manager/src/manager.rs:413][E: codex-rs/models-manager/src/manager.rs:414]
7. Offline only loads cache; OnlineIfUncached loads cache first and fetches on miss; Online always fetches once the auth/command guard has allowed refresh.[E: codex-rs/models-manager/src/manager.rs:370][E: codex-rs/models-manager/src/manager.rs:370][E: codex-rs/models-manager/src/manager.rs:375][E: codex-rs/models-manager/src/manager.rs:378][E: codex-rs/models-manager/src/manager.rs:380][E: codex-rs/models-manager/src/manager.rs:326][E: codex-rs/models-manager/src/manager.rs:387]
8. Remote fetch calls the endpoint with whole client version and a cloned `HttpClientFactory`, applies returned models, stores ETag, and only persists when `cache_manager` is present。[E: codex-rs/models-manager/src/manager.rs:394][E: codex-rs/models-manager/src/manager.rs:398][E: codex-rs/models-manager/src/manager.rs:399][E: codex-rs/models-manager/src/manager.rs:400][E: codex-rs/models-manager/src/manager.rs:403][E: codex-rs/models-manager/src/manager.rs:405][E: codex-rs/models-manager/src/manager.rs:407]
9. `OpenAiModelsEndpoint::list_models` resolves provider auth, creates `ModelsClient`, applies telemetry, wraps the call in a 5s timeout, and maps API errors to core errors.[E: codex-rs/model-provider/src/models_endpoint.rs:75][E: codex-rs/model-provider/src/models_endpoint.rs:82][E: codex-rs/model-provider/src/models_endpoint.rs:84][E: codex-rs/model-provider/src/models_endpoint.rs:85][E: codex-rs/model-provider/src/models_endpoint.rs:106][E: codex-rs/model-provider/src/models_endpoint.rs:95][E: codex-rs/model-provider/src/models_endpoint.rs:114][E: codex-rs/model-provider/src/models_endpoint.rs:111]
10. `ModelsClient::list_models` executes `GET models`, appends `client_version` as a query parameter, reads the ETag header, and decodes the body as `ModelsResponse`.[E: codex-rs/codex-api/src/endpoint/models.rs:31][E: codex-rs/codex-api/src/endpoint/models.rs:35][E: codex-rs/codex-api/src/endpoint/models.rs:46][E: codex-rs/codex-api/src/endpoint/models.rs:51][E: codex-rs/codex-api/src/endpoint/models.rs:52][E: codex-rs/codex-api/src/endpoint/models.rs:64][E: codex-rs/codex-api/src/endpoint/models.rs:70][E: codex-rs/codex-api/src/endpoint/models.rs:78]
11. Remote model application uses the remote list as source of truth only when it contains at least one listed model and current auth is ChatGPT; otherwise it starts from bundled models and replaces matching slugs or appends new ones.[E: codex-rs/models-manager/src/manager.rs:423][E: codex-rs/models-manager/src/manager.rs:425][E: codex-rs/models-manager/src/manager.rs:428][E: codex-rs/models-manager/src/manager.rs:428][E: codex-rs/models-manager/src/manager.rs:438][E: codex-rs/models-manager/src/manager.rs:441][E: codex-rs/models-manager/src/manager.rs:446][E: codex-rs/models-manager/src/manager.rs:449]
12. Model metadata lookup tries longest-prefix match, then one-level namespaced suffix match, otherwise `model_info_from_slug`; it preserves the requested slug and then applies config overrides.[E: codex-rs/models-manager/src/manager.rs:581][E: codex-rs/models-manager/src/manager.rs:599][E: codex-rs/models-manager/src/manager.rs:618][E: codex-rs/models-manager/src/manager.rs:625][E: codex-rs/models-manager/src/manager.rs:626][E: codex-rs/models-manager/src/manager.rs:626][E: codex-rs/models-manager/src/manager.rs:629][E: codex-rs/models-manager/src/manager.rs:632][E: codex-rs/models-manager/src/manager.rs:640]

## 设计动机与权衡

- The current design keeps model discovery policy in `models-manager` while letting providers own auth and transport through `ModelsEndpointClient`; this is an inference from the trait boundary and `OpenAiModelsEndpoint` implementation.[E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/models-manager/src/manager.rs:37][E: codex-rs/model-provider/src/models_endpoint.rs:43][E: codex-rs/model-provider/src/models_endpoint.rs:84][I]
- Config-supplied catalogs are authoritative for generic providers because `ConfiguredModelProvider::models_manager` chooses `StaticModelsManager`, whose refresh hook is a no-op; Bedrock is stricter and always returns a static manager, even without config catalog。[E: codex-rs/model-provider/src/provider.rs:333][E: codex-rs/model-provider/src/provider.rs:334][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:177][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:184][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:184][E: codex-rs/models-manager/src/manager.rs:483][E: codex-rs/models-manager/src/manager.rs:478][I]
- `with_config_overrides` clamps context window by `max_context_window` and overrides auto compact/tool-output/base instructions。Custom base instructions or a disabled personality feature只清除 instruction-template/variables，继续保留 approval、collaboration-mode、auto-review、permission 与 token-budget messages；`Personality::None` instead strips the `# Personality` H1 section from base/template instructions。[E: codex-rs/models-manager/src/model_info.rs:25][E: codex-rs/models-manager/src/model_info.rs:52][E: codex-rs/models-manager/src/model_info.rs:74][E: codex-rs/models-manager/src/model_info.rs:90][E: codex-rs/models-manager/src/model_info.rs:110][E: codex-rs/models-manager/src/model_info.rs:113][E: codex-rs/models-manager/src/model_info.rs:115][E: codex-rs/models-manager/src/model_info.rs:118]

## gotcha

- A fresh cache is version-scoped: `client_version_to_whole` strips prerelease suffixes to `major.minor.patch`, and `load_fresh` rejects cache entries whose stored version differs.[E: codex-rs/models-manager/src/lib.rs:19][E: codex-rs/models-manager/src/lib.rs:20][E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:52][E: codex-rs/models-manager/src/cache.rs:55]
- `refresh_if_new_etag` 在 incoming ETag 与当前 non-empty ETag 相同且 cache 已超过半个 TTL 时才重写 `fetched_at`；前半个 TTL 内 renewal 是 no-op，避免每个 response 都写盘。[E: codex-rs/models-manager/src/manager.rs:191][E: codex-rs/models-manager/src/manager.rs:339][E: codex-rs/models-manager/src/manager.rs:376][E: codex-rs/models-manager/src/cache.rs:96][E: codex-rs/models-manager/src/cache.rs:98][E: codex-rs/models-manager/src/cache.rs:103]
- Fallback model metadata marks `used_fallback_model_metadata = true`, sets `supported_in_api = true` and `supports_reasoning_summary_parameter = true`, uses a 272000-token context/max-context window, and defaults truncation to 10000 bytes.[E: codex-rs/models-manager/src/model_info.rs:135][E: codex-rs/models-manager/src/model_info.rs:147][E: codex-rs/models-manager/src/model_info.rs:153][E: codex-rs/models-manager/src/model_info.rs:156][E: codex-rs/models-manager/src/model_info.rs:157][E: codex-rs/models-manager/src/model_info.rs:163]

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
- `codex-rs/protocol/src/openai_models.rs`

## 相关

- `subsys.providers.overview`
- `subsys.providers.provider-openai`
- `subsys.providers.responses-api`
- `subsys.providers.auth-layer`
- `command.model-mode`
