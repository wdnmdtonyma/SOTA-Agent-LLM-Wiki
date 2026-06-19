---
id: subsys.providers.model-catalog
title: Model catalog
kind: subsystem
tier: T2
source: [codex-rs/models-manager/src/manager.rs, codex-rs/models-manager/src/cache.rs, codex-rs/models-manager/src/model_info.rs, codex-rs/models-manager/src/config.rs, codex-rs/models-manager/src/lib.rs, codex-rs/models-manager/models.json, codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/amazon_bedrock/mod.rs, codex-rs/model-provider/src/models_endpoint.rs, codex-rs/codex-api/src/endpoint/models.rs, codex-rs/core/src/config/mod.rs]
symbols: [ModelsManager, ModelsEndpointClient, OpenAiModelsManager, StaticModelsManager, RefreshStrategy, ModelsCacheManager, ModelsCache, ModelsManagerConfig, bundled_models_response, model_info_from_slug, with_config_overrides, ModelsClient, OpenAiModelsEndpoint, AmazonBedrockModelProvider]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.responses-api, subsys.providers.auth-layer, command.model-mode]
evidence: explicit
status: verified
updated: 5670360009
---

> Model catalog subsystem is split between an in-process manager and a provider-owned `/models` endpoint: `OpenAiModelsManager` starts from bundled `models.json`, may refresh/cache remote models, and builds picker-ready `ModelPreset`s; `StaticModelsManager` serves an authoritative catalog supplied by config or by a provider override such as Bedrock.[E: codex-rs/models-manager/src/manager.rs:33][E: codex-rs/models-manager/src/manager.rs:79][E: codex-rs/models-manager/src/manager.rs:117][E: codex-rs/models-manager/src/manager.rs:198][E: codex-rs/models-manager/src/manager.rs:208][E: codex-rs/models-manager/src/lib.rs:13][E: codex-rs/models-manager/src/lib.rs:15][E: codex-rs/model-provider/src/provider.rs:283][E: codex-rs/model-provider/src/provider.rs:288][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:157][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:162][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:164]

## 能回答的问题

- bundled `models.json`、`model_catalog_json` 和 provider-specific static catalogs 分别如何进入 `ModelsManager`?
- refresh strategies Online/Offline/OnlineIfUncached 分别做什么?
- `/models` refresh 何时被允许，何时只读 cache?
- models cache 文件路径、TTL、client version 和 ETag 如何工作?
- model picker presets、默认模型和 unknown slug fallback metadata 如何生成?

## 职责边界

`models-manager` owns refresh policy, cache behavior, picker filtering, default selection, and model metadata overrides. Provider/auth/transport details are behind `ModelsEndpointClient`; the concrete OpenAI-compatible implementation lives in `model-provider/src/models_endpoint.rs` and uses `codex-api::ModelsClient` to issue `GET /models`.[E: codex-rs/models-manager/src/manager.rs:33][E: codex-rs/models-manager/src/manager.rs:30][E: codex-rs/models-manager/src/manager.rs:31][E: codex-rs/models-manager/src/manager.rs:32][E: codex-rs/model-provider/src/models_endpoint.rs:36][E: codex-rs/model-provider/src/models_endpoint.rs:66][E: codex-rs/model-provider/src/models_endpoint.rs:84][E: codex-rs/codex-api/src/endpoint/models.rs:40]

## 关键 crate/文件

- `codex-rs/models-manager/src/manager.rs`: `ModelsEndpointClient`, `ModelsManager`, refresh strategies, cache application, static/openai manager implementations, model lookup, preset build.[E: codex-rs/models-manager/src/manager.rs:33][E: codex-rs/models-manager/src/manager.rs:51][E: codex-rs/models-manager/src/manager.rs:79][E: codex-rs/models-manager/src/manager.rs:198][E: codex-rs/models-manager/src/manager.rs:208][E: codex-rs/models-manager/src/manager.rs:299][E: codex-rs/models-manager/src/manager.rs:493]
- `codex-rs/model-provider/src/provider.rs`: `ConfiguredModelProvider::models_manager` chooses `StaticModelsManager` when config supplies a catalog and `OpenAiModelsManager` otherwise.[E: codex-rs/model-provider/src/provider.rs:283][E: codex-rs/model-provider/src/provider.rs:288][E: codex-rs/model-provider/src/provider.rs:294][E: codex-rs/model-provider/src/provider.rs:298]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: Bedrock overrides model discovery to always return `StaticModelsManager`, using a config catalog when supplied or its built-in static catalog otherwise.[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:157][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:160][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:162][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:164]
- `codex-rs/model-provider/src/models_endpoint.rs`: `OpenAiModelsEndpoint` resolves provider auth, builds `ModelsClient`, applies request telemetry, and runs the call under a 5s timeout.[E: codex-rs/model-provider/src/models_endpoint.rs:36][E: codex-rs/model-provider/src/models_endpoint.rs:66][E: codex-rs/model-provider/src/models_endpoint.rs:72][E: codex-rs/model-provider/src/models_endpoint.rs:74][E: codex-rs/model-provider/src/models_endpoint.rs:75][E: codex-rs/model-provider/src/models_endpoint.rs:84][E: codex-rs/model-provider/src/models_endpoint.rs:87]
- `codex-rs/models-manager/src/cache.rs`: on-disk cache load, freshness check, persist, TTL renewal, and serialized cache schema.[E: codex-rs/models-manager/src/cache.rs:16][E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:77][E: codex-rs/models-manager/src/cache.rs:95][E: codex-rs/models-manager/src/cache.rs:162]
- `codex-rs/models-manager/src/model_info.rs`: config overrides and fallback model metadata for unknown slugs.[E: codex-rs/models-manager/src/model_info.rs:23][E: codex-rs/models-manager/src/model_info.rs:66]

## 数据模型

- `ModelsEndpointClient` exposes `has_command_auth`, `uses_codex_backend`, and `list_models(client_version) -> (Vec<ModelInfo>, Option<String>)`; this is the manager's refresh boundary.[E: codex-rs/models-manager/src/manager.rs:33][E: codex-rs/models-manager/src/manager.rs:35][E: codex-rs/models-manager/src/manager.rs:38][E: codex-rs/models-manager/src/manager.rs:40][E: codex-rs/models-manager/src/manager.rs:41][E: codex-rs/models-manager/src/manager.rs:44]
- `RefreshStrategy` has `Online`, `Offline`, and `OnlineIfUncached`; its display strings are `online`, `offline`, and `online_if_uncached`.[E: codex-rs/models-manager/src/manager.rs:49][E: codex-rs/models-manager/src/manager.rs:51][E: codex-rs/models-manager/src/manager.rs:53][E: codex-rs/models-manager/src/manager.rs:55][E: codex-rs/models-manager/src/manager.rs:57][E: codex-rs/models-manager/src/manager.rs:60][E: codex-rs/models-manager/src/manager.rs:70]
- `OpenAiModelsManager` stores remote models, ETag, a `ModelsCacheManager`, a provider endpoint client, and an optional `AuthManager`; its constructor uses `{codex_home}/models_cache.json` and seeds remote models from the bundled file.[E: codex-rs/models-manager/src/manager.rs:196][E: codex-rs/models-manager/src/manager.rs:198][E: codex-rs/models-manager/src/manager.rs:199][E: codex-rs/models-manager/src/manager.rs:200][E: codex-rs/models-manager/src/manager.rs:201][E: codex-rs/models-manager/src/manager.rs:202][E: codex-rs/models-manager/src/manager.rs:203][E: codex-rs/models-manager/src/manager.rs:220][E: codex-rs/models-manager/src/manager.rs:222]
- `StaticModelsManager` stores a fixed `Vec<ModelInfo>` from a supplied `ModelsResponse` and never refreshes remotely.[E: codex-rs/models-manager/src/manager.rs:206][E: codex-rs/models-manager/src/manager.rs:208][E: codex-rs/models-manager/src/manager.rs:209][E: codex-rs/models-manager/src/manager.rs:235][E: codex-rs/models-manager/src/manager.rs:237][E: codex-rs/models-manager/src/manager.rs:438]
- `ModelsCache` stores `fetched_at`, optional `etag`, optional `client_version`, and `models`; `load_fresh` rejects version mismatches and stale TTL.[E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:50][E: codex-rs/models-manager/src/cache.rs:59][E: codex-rs/models-manager/src/cache.rs:162][E: codex-rs/models-manager/src/cache.rs:163][E: codex-rs/models-manager/src/cache.rs:165][E: codex-rs/models-manager/src/cache.rs:167][E: codex-rs/models-manager/src/cache.rs:168]
- `ModelsManagerConfig` carries model context, auto-compact, tool-output limit, base instructions, personality flag, reasoning summaries override, and optional full model catalog.[E: codex-rs/models-manager/src/config.rs:4][E: codex-rs/models-manager/src/config.rs:5][E: codex-rs/models-manager/src/config.rs:6][E: codex-rs/models-manager/src/config.rs:7][E: codex-rs/models-manager/src/config.rs:8][E: codex-rs/models-manager/src/config.rs:9][E: codex-rs/models-manager/src/config.rs:10][E: codex-rs/models-manager/src/config.rs:11]

## 控制流

1. Core config loads `model_catalog_json` into a `ModelsResponse`, rejects an empty catalog, and passes it through `Config::to_models_manager_config`.[E: codex-rs/core/src/config/mod.rs:1402][E: codex-rs/core/src/config/mod.rs:1410][E: codex-rs/core/src/config/mod.rs:1777][E: codex-rs/core/src/config/mod.rs:1788][E: codex-rs/core/src/config/mod.rs:1800][E: codex-rs/core/src/config/mod.rs:1803]
2. `ConfiguredModelProvider::models_manager` returns `StaticModelsManager` for a supplied config catalog; otherwise it constructs `OpenAiModelsEndpoint` and wraps it in `OpenAiModelsManager`.[E: codex-rs/model-provider/src/provider.rs:283][E: codex-rs/model-provider/src/provider.rs:288][E: codex-rs/model-provider/src/provider.rs:289][E: codex-rs/model-provider/src/provider.rs:294][E: codex-rs/model-provider/src/provider.rs:298]
3. `AmazonBedrockModelProvider::models_manager` bypasses `/models` refresh and returns `StaticModelsManager` for either a config-supplied catalog or the Bedrock built-in static catalog。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:157][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:160][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:162][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:164]
4. `ModelsManager::list_models` calls `raw_model_catalog(refresh_strategy)` and then `build_available_models`; `build_available_models` sorts by priority, converts to presets, filters by auth mode, and marks the default by picker visibility.[E: codex-rs/models-manager/src/manager.rs:83][E: codex-rs/models-manager/src/manager.rs:89][E: codex-rs/models-manager/src/manager.rs:90][E: codex-rs/models-manager/src/manager.rs:117][E: codex-rs/models-manager/src/manager.rs:118][E: codex-rs/models-manager/src/manager.rs:120][E: codex-rs/models-manager/src/manager.rs:121][E: codex-rs/models-manager/src/manager.rs:124][E: codex-rs/models-manager/src/manager.rs:126]
5. `OpenAiModelsManager::raw_model_catalog` attempts refresh, logs refresh failure, and returns the current in-memory remote models.[E: codex-rs/models-manager/src/manager.rs:276][E: codex-rs/models-manager/src/manager.rs:277][E: codex-rs/models-manager/src/manager.rs:278][E: codex-rs/models-manager/src/manager.rs:280][E: codex-rs/models-manager/src/manager.rs:281]
6. Refresh is skipped unless the endpoint currently uses the Codex backend or has command auth; skipped Offline/OnlineIfUncached still try to load cache.[E: codex-rs/models-manager/src/manager.rs:299][E: codex-rs/models-manager/src/manager.rs:300][E: codex-rs/models-manager/src/manager.rs:301][E: codex-rs/models-manager/src/manager.rs:305][E: codex-rs/models-manager/src/manager.rs:343][E: codex-rs/models-manager/src/manager.rs:344]
7. Offline only loads cache; OnlineIfUncached loads cache first and fetches on miss; Online always fetches once the auth/command guard has allowed refresh.[E: codex-rs/models-manager/src/manager.rs:310][E: codex-rs/models-manager/src/manager.rs:311][E: codex-rs/models-manager/src/manager.rs:313][E: codex-rs/models-manager/src/manager.rs:316][E: codex-rs/models-manager/src/manager.rs:318][E: codex-rs/models-manager/src/manager.rs:323][E: codex-rs/models-manager/src/manager.rs:325][E: codex-rs/models-manager/src/manager.rs:327]
8. Remote fetch calls the endpoint with the whole client version, applies returned models, stores the ETag, and persists the cache.[E: codex-rs/models-manager/src/manager.rs:332][E: codex-rs/models-manager/src/manager.rs:333][E: codex-rs/models-manager/src/manager.rs:334][E: codex-rs/models-manager/src/manager.rs:335][E: codex-rs/models-manager/src/manager.rs:336][E: codex-rs/models-manager/src/manager.rs:337][E: codex-rs/models-manager/src/manager.rs:338]
9. `OpenAiModelsEndpoint::list_models` resolves provider auth, creates `ModelsClient`, applies telemetry, wraps the call in a 5s timeout, and maps API errors to core errors.[E: codex-rs/model-provider/src/models_endpoint.rs:66][E: codex-rs/model-provider/src/models_endpoint.rs:72][E: codex-rs/model-provider/src/models_endpoint.rs:74][E: codex-rs/model-provider/src/models_endpoint.rs:75][E: codex-rs/model-provider/src/models_endpoint.rs:84][E: codex-rs/model-provider/src/models_endpoint.rs:87][E: codex-rs/model-provider/src/models_endpoint.rs:92][E: codex-rs/model-provider/src/models_endpoint.rs:93]
10. `ModelsClient::list_models` executes `GET models`, appends `client_version` as a query parameter, reads the ETag header, and decodes the body as `ModelsResponse`.[E: codex-rs/codex-api/src/endpoint/models.rs:31][E: codex-rs/codex-api/src/endpoint/models.rs:35][E: codex-rs/codex-api/src/endpoint/models.rs:40][E: codex-rs/codex-api/src/endpoint/models.rs:45][E: codex-rs/codex-api/src/endpoint/models.rs:52][E: codex-rs/codex-api/src/endpoint/models.rs:58][E: codex-rs/codex-api/src/endpoint/models.rs:64][E: codex-rs/codex-api/src/endpoint/models.rs:72]
11. Remote model application uses the remote list as source of truth only when it contains at least one listed model and current auth is ChatGPT; otherwise it starts from bundled models and replaces matching slugs or appends new ones.[E: codex-rs/models-manager/src/manager.rs:352][E: codex-rs/models-manager/src/manager.rs:355][E: codex-rs/models-manager/src/manager.rs:358][E: codex-rs/models-manager/src/manager.rs:359][E: codex-rs/models-manager/src/manager.rs:365][E: codex-rs/models-manager/src/manager.rs:369][E: codex-rs/models-manager/src/manager.rs:371][E: codex-rs/models-manager/src/manager.rs:375][E: codex-rs/models-manager/src/manager.rs:377]
12. Model metadata lookup tries longest-prefix match, then one-level namespaced suffix match, otherwise `model_info_from_slug`; it preserves the requested slug and then applies config overrides.[E: codex-rs/models-manager/src/manager.rs:456][E: codex-rs/models-manager/src/manager.rs:474][E: codex-rs/models-manager/src/manager.rs:493][E: codex-rs/models-manager/src/manager.rs:500][E: codex-rs/models-manager/src/manager.rs:501][E: codex-rs/models-manager/src/manager.rs:502][E: codex-rs/models-manager/src/manager.rs:504][E: codex-rs/models-manager/src/manager.rs:509][E: codex-rs/models-manager/src/manager.rs:511]

## 设计动机与权衡

- The current design keeps model discovery policy in `models-manager` while letting providers own auth and transport through `ModelsEndpointClient`; this is an inference from the trait boundary and `OpenAiModelsEndpoint` implementation.[E: codex-rs/models-manager/src/manager.rs:28][E: codex-rs/models-manager/src/manager.rs:33][E: codex-rs/model-provider/src/models_endpoint.rs:36][E: codex-rs/model-provider/src/models_endpoint.rs:74][I]
- Config-supplied catalogs are authoritative for generic providers because `ConfiguredModelProvider::models_manager` chooses `StaticModelsManager`, whose refresh hook is a no-op; Bedrock is stricter and always returns a static manager, even without config catalog。[E: codex-rs/model-provider/src/provider.rs:288][E: codex-rs/model-provider/src/provider.rs:289][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:157][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:162][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:164][E: codex-rs/models-manager/src/manager.rs:410][E: codex-rs/models-manager/src/manager.rs:438][I]
- `with_config_overrides` clamps context window by `max_context_window`, overrides auto compact/tool-output/base instructions, clears model messages when custom base instructions are supplied or personality is disabled, and only enables reasoning summaries on explicit `Some(true)`.[E: codex-rs/models-manager/src/model_info.rs:23][E: codex-rs/models-manager/src/model_info.rs:24][E: codex-rs/models-manager/src/model_info.rs:29][E: codex-rs/models-manager/src/model_info.rs:33][E: codex-rs/models-manager/src/model_info.rs:38][E: codex-rs/models-manager/src/model_info.rs:41][E: codex-rs/models-manager/src/model_info.rs:55][E: codex-rs/models-manager/src/model_info.rs:58]

## gotcha

- A fresh cache is version-scoped: `client_version_to_whole` strips prerelease suffixes to `major.minor.patch`, and `load_fresh` rejects cache entries whose stored version differs.[E: codex-rs/models-manager/src/lib.rs:19][E: codex-rs/models-manager/src/lib.rs:20][E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:50][E: codex-rs/models-manager/src/cache.rs:57]
- `refresh_if_new_etag` renews cache TTL without fetching when the incoming ETag matches the current non-empty ETag.[E: codex-rs/models-manager/src/manager.rs:188][E: codex-rs/models-manager/src/manager.rs:285][E: codex-rs/models-manager/src/manager.rs:287][E: codex-rs/models-manager/src/manager.rs:288][E: codex-rs/models-manager/src/manager.rs:291]
- Fallback model metadata marks `used_fallback_model_metadata = true`, sets `supported_in_api = true`, uses a 272000-token context/max-context window, and defaults truncation to 10000 bytes.[E: codex-rs/models-manager/src/model_info.rs:66][E: codex-rs/models-manager/src/model_info.rs:76][E: codex-rs/models-manager/src/model_info.rs:91][E: codex-rs/models-manager/src/model_info.rs:94][E: codex-rs/models-manager/src/model_info.rs:95][E: codex-rs/models-manager/src/model_info.rs:101]

## Sources

- `codex-rs/models-manager/src/manager.rs`
- `codex-rs/models-manager/src/cache.rs`
- `codex-rs/models-manager/src/model_info.rs`
- `codex-rs/models-manager/src/config.rs`
- `codex-rs/models-manager/src/lib.rs`
- `codex-rs/models-manager/models.json`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`
- `codex-rs/model-provider/src/models_endpoint.rs`
- `codex-rs/codex-api/src/endpoint/models.rs`
- `codex-rs/core/src/config/mod.rs`

## 相关

- `subsys.providers.overview`
- `subsys.providers.provider-openai`
- `subsys.providers.responses-api`
- `subsys.providers.auth-layer`
- `command.model-mode`
