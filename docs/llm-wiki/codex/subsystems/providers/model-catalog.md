---
id: subsys.providers.model-catalog
title: Model catalog
kind: subsystem
tier: T2
source: [codex-rs/models-manager/src/manager.rs, codex-rs/models-manager/src/cache.rs, codex-rs/models-manager/src/model_info.rs, codex-rs/models-manager/src/config.rs, codex-rs/models-manager/src/lib.rs, codex-rs/models-manager/models.json]
symbols: [ModelsManager, RefreshStrategy, ModelsCacheManager, ModelsCache, ModelsManagerConfig, bundled_models_response, model_info_from_slug, with_config_overrides]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.responses-api, subsys.providers.auth-layer, command.model-mode]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Model catalog subsystem starts from bundled `models.json` or a caller-provided catalog, optionally refreshes `/models`, caches fresh responses in `models_cache.json`, then derives picker-ready `ModelPreset` and per-model `ModelInfo` with config overrides。[E: codex-rs/models-manager/src/lib.rs:16][E: codex-rs/models-manager/src/lib.rs:18][E: codex-rs/models-manager/src/manager.rs:44][E: codex-rs/models-manager/src/manager.rs:47][E: codex-rs/models-manager/src/manager.rs:222][E: codex-rs/models-manager/src/manager.rs:227][E: codex-rs/models-manager/src/manager.rs:248][E: codex-rs/models-manager/src/manager.rs:253][E: codex-rs/models-manager/src/manager.rs:480][E: codex-rs/models-manager/src/manager.rs:481][E: codex-rs/models-manager/src/manager.rs:535][E: codex-rs/models-manager/src/manager.rs:548][E: codex-rs/models-manager/src/model_info.rs:23][E: codex-rs/models-manager/src/model_info.rs:62]

## 能回答的问题

- bundled `models.json` 何时使用，custom catalog 何时阻止 refresh？
- refresh strategies Online/Offline/OnlineIfUncached 分别做什么？
- models cache 文件路径、TTL、client version check 是什么？
- 默认模型如何选择？
- unknown model slug 的 fallback metadata 是什么？

## 职责边界

`models-manager` 管理 model discovery/cache/presets/model info overrides，不发送 normal Responses turns；remote fetch uses `codex-api::ModelsClient` through the provider/auth/transport stack。[E: codex-rs/models-manager/src/manager.rs:248][E: codex-rs/models-manager/src/manager.rs:253][E: codex-rs/models-manager/src/manager.rs:453][E: codex-rs/models-manager/src/manager.rs:456][E: codex-rs/models-manager/src/manager.rs:466][E: codex-rs/models-manager/src/manager.rs:472][E: codex-rs/models-manager/src/manager.rs:510][E: codex-rs/models-manager/src/manager.rs:548][E: codex-rs/models-manager/src/model_info.rs:23][E: codex-rs/models-manager/src/model_info.rs:62][I]

## 关键 crate/文件

- `codex-rs/models-manager/src/manager.rs`: manager state, refresh strategies, remote fetch, cache load/apply, model lookup, preset build。[E: codex-rs/models-manager/src/manager.rs:140][E: codex-rs/models-manager/src/manager.rs:176][E: codex-rs/models-manager/src/manager.rs:325][E: codex-rs/models-manager/src/manager.rs:384][E: codex-rs/models-manager/src/manager.rs:403][E: codex-rs/models-manager/src/manager.rs:446][E: codex-rs/models-manager/src/manager.rs:510][E: codex-rs/models-manager/src/manager.rs:535][E: codex-rs/models-manager/src/manager.rs:548]
- `codex-rs/models-manager/src/cache.rs`: on-disk cache load/freshness/persist/renew schema。[E: codex-rs/models-manager/src/cache.rs:14][E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:77][E: codex-rs/models-manager/src/cache.rs:83][E: codex-rs/models-manager/src/cache.rs:94][E: codex-rs/models-manager/src/cache.rs:101][E: codex-rs/models-manager/src/cache.rs:160][E: codex-rs/models-manager/src/cache.rs:181]
- `codex-rs/models-manager/src/model_info.rs`: fallback model metadata and config overrides。[E: codex-rs/models-manager/src/model_info.rs:23][E: codex-rs/models-manager/src/model_info.rs:65]
- `codex-rs/models-manager/models.json`: bundled model list; current file has a top-level `models` array and entries such as `gpt-5.4` with `visibility: list` and `supported_in_api: true`。[E: codex-rs/models-manager/models.json:2][E: codex-rs/models-manager/models.json:24][E: codex-rs/models-manager/models.json:47][E: codex-rs/models-manager/models.json:49]

## 数据模型

- `RefreshStrategy` has Online, Offline, OnlineIfUncached; Display strings are `online`, `offline`, `online_if_uncached`。[E: codex-rs/models-manager/src/manager.rs:140][E: codex-rs/models-manager/src/manager.rs:144][E: codex-rs/models-manager/src/manager.rs:146][E: codex-rs/models-manager/src/manager.rs:148][E: codex-rs/models-manager/src/manager.rs:154][E: codex-rs/models-manager/src/manager.rs:155][E: codex-rs/models-manager/src/manager.rs:156][E: codex-rs/models-manager/src/manager.rs:161][E: codex-rs/models-manager/src/manager.rs:163]
- `CatalogMode` is Default for bundled/cache/network refresh and Custom for caller-provided authoritative catalog that refresh should not mutate。[E: codex-rs/models-manager/src/manager.rs:167][E: codex-rs/models-manager/src/manager.rs:170][E: codex-rs/models-manager/src/manager.rs:172]
- `ModelsManager` stores remote_models, catalog_mode, collaboration modes config, etag, cache manager, and provider。[E: codex-rs/models-manager/src/manager.rs:176][E: codex-rs/models-manager/src/manager.rs:179][E: codex-rs/models-manager/src/manager.rs:180][E: codex-rs/models-manager/src/manager.rs:181][E: codex-rs/models-manager/src/manager.rs:182][E: codex-rs/models-manager/src/manager.rs:183][E: codex-rs/models-manager/src/manager.rs:184]
- `ModelsCache` stores fetched_at, optional etag, optional client_version, and models list; cache freshness is TTL-based。[E: codex-rs/models-manager/src/cache.rs:160][E: codex-rs/models-manager/src/cache.rs:163][E: codex-rs/models-manager/src/cache.rs:165][E: codex-rs/models-manager/src/cache.rs:167][E: codex-rs/models-manager/src/cache.rs:168][E: codex-rs/models-manager/src/cache.rs:172][E: codex-rs/models-manager/src/cache.rs:181]
- `ModelsManagerConfig` carries model_context_window, auto_compact limit, tool output token limit, base instructions, personality flag, reasoning summaries override, and optional model catalog。[E: codex-rs/models-manager/src/config.rs:3][E: codex-rs/models-manager/src/config.rs:5][E: codex-rs/models-manager/src/config.rs:6][E: codex-rs/models-manager/src/config.rs:7][E: codex-rs/models-manager/src/config.rs:8][E: codex-rs/models-manager/src/config.rs:9][E: codex-rs/models-manager/src/config.rs:10][E: codex-rs/models-manager/src/config.rs:11]

## 控制流

1. `ModelsManager::new` uses OpenAI provider info by default; `new_with_provider` creates a runtime model provider, sets cache path to `{codex_home}/models_cache.json`, chooses custom/default catalog mode, and seeds remote_models from provided catalog or bundled file。[E: codex-rs/models-manager/src/manager.rs:193][E: codex-rs/models-manager/src/manager.rs:204][E: codex-rs/models-manager/src/manager.rs:212][E: codex-rs/models-manager/src/manager.rs:219][E: codex-rs/models-manager/src/manager.rs:220][E: codex-rs/models-manager/src/manager.rs:222][E: codex-rs/models-manager/src/manager.rs:227][E: codex-rs/models-manager/src/manager.rs:229]
2. `bundled_models_response` loads `models.json` with `include_str!`, and `models.json` currently begins with a top-level `models` array。[E: codex-rs/models-manager/src/lib.rs:15][E: codex-rs/models-manager/src/lib.rs:18][E: codex-rs/models-manager/models.json:1][E: codex-rs/models-manager/models.json:2]
3. `list_models` refreshes according to strategy, reads remote_models, and calls `build_available_models`; `raw_model_catalog` returns raw models after the same refresh attempt。[E: codex-rs/models-manager/src/manager.rs:248][E: codex-rs/models-manager/src/manager.rs:249][E: codex-rs/models-manager/src/manager.rs:253][E: codex-rs/models-manager/src/manager.rs:257][E: codex-rs/models-manager/src/manager.rs:258][E: codex-rs/models-manager/src/manager.rs:261][E: codex-rs/models-manager/src/manager.rs:263]
4. `get_default_model` returns provided model immediately; without a provided model it refreshes, builds available presets, picks the default preset, then first preset, then empty string。[E: codex-rs/models-manager/src/manager.rs:301][E: codex-rs/models-manager/src/manager.rs:306][E: codex-rs/models-manager/src/manager.rs:307][E: codex-rs/models-manager/src/manager.rs:309][E: codex-rs/models-manager/src/manager.rs:313][E: codex-rs/models-manager/src/manager.rs:316][E: codex-rs/models-manager/src/manager.rs:317][E: codex-rs/models-manager/src/manager.rs:319]
5. `refresh_available_models` exits early for Custom catalog mode; it also avoids network refresh when auth mode is not ChatGPT and provider has no command auth, except it may load cache for Offline/OnlineIfUncached。[E: codex-rs/models-manager/src/manager.rs:403][E: codex-rs/models-manager/src/manager.rs:406][E: codex-rs/models-manager/src/manager.rs:407][E: codex-rs/models-manager/src/manager.rs:410][E: codex-rs/models-manager/src/manager.rs:414][E: codex-rs/models-manager/src/manager.rs:415][E: codex-rs/models-manager/src/manager.rs:419]
6. Offline loads cache only; OnlineIfUncached uses cache if available and otherwise fetches remote; Online fetches remote after the Custom/auth guard has allowed network refresh。[E: codex-rs/models-manager/src/manager.rs:403][E: codex-rs/models-manager/src/manager.rs:421][E: codex-rs/models-manager/src/manager.rs:424][E: codex-rs/models-manager/src/manager.rs:427][E: codex-rs/models-manager/src/manager.rs:430][E: codex-rs/models-manager/src/manager.rs:432][E: codex-rs/models-manager/src/manager.rs:434][E: codex-rs/models-manager/src/manager.rs:437][E: codex-rs/models-manager/src/manager.rs:439][E: codex-rs/models-manager/src/manager.rs:441]
7. `fetch_and_update_models` resolves provider auth/provider info, builds `ModelsClient`, calls `client.list_models` with a 5s timeout, applies remote models, stores etag, and persists cache with client version。[E: codex-rs/models-manager/src/manager.rs:46][E: codex-rs/models-manager/src/manager.rs:446][E: codex-rs/models-manager/src/manager.rs:453][E: codex-rs/models-manager/src/manager.rs:455][E: codex-rs/models-manager/src/manager.rs:456][E: codex-rs/models-manager/src/manager.rs:466][E: codex-rs/models-manager/src/manager.rs:469][E: codex-rs/models-manager/src/manager.rs:472][E: codex-rs/models-manager/src/manager.rs:478][E: codex-rs/models-manager/src/manager.rs:479][E: codex-rs/models-manager/src/manager.rs:481]
8. `ModelsCacheManager::load_fresh` rejects cache on client_version mismatch or stale TTL; `persist_cache` writes fetched_at/etag/client_version/models to disk。[E: codex-rs/models-manager/src/cache.rs:31][E: codex-rs/models-manager/src/cache.rs:50][E: codex-rs/models-manager/src/cache.rs:57][E: codex-rs/models-manager/src/cache.rs:59][E: codex-rs/models-manager/src/cache.rs:66][E: codex-rs/models-manager/src/cache.rs:77][E: codex-rs/models-manager/src/cache.rs:83][E: codex-rs/models-manager/src/cache.rs:88][E: codex-rs/models-manager/src/cache.rs:116][E: codex-rs/models-manager/src/cache.rs:122]
9. `construct_model_info_from_candidates` uses longest-prefix match, then one-level namespaced suffix match, otherwise fallback model metadata, then applies config overrides。[E: codex-rs/models-manager/src/manager.rs:366][E: codex-rs/models-manager/src/manager.rs:373][E: codex-rs/models-manager/src/manager.rs:374][E: codex-rs/models-manager/src/manager.rs:382][E: codex-rs/models-manager/src/manager.rs:384]
10. `build_available_models` sorts remote models by priority, converts to presets, filters by auth mode, marks default by picker visibility, and returns presets。[E: codex-rs/models-manager/src/manager.rs:535][E: codex-rs/models-manager/src/manager.rs:536][E: codex-rs/models-manager/src/manager.rs:538][E: codex-rs/models-manager/src/manager.rs:543][E: codex-rs/models-manager/src/manager.rs:544][E: codex-rs/models-manager/src/manager.rs:546][E: codex-rs/models-manager/src/manager.rs:548]

## 设计动机与权衡

- The manager preserves bundled catalog entries while applying remote models by replacing matching slugs or pushing new models, rather than replacing the entire bundled list with remote data。[E: codex-rs/models-manager/src/manager.rs:491][E: codex-rs/models-manager/src/manager.rs:492][E: codex-rs/models-manager/src/manager.rs:496][E: codex-rs/models-manager/src/manager.rs:498][E: codex-rs/models-manager/src/manager.rs:500]
- `with_config_overrides` clamps context window by `max_context_window`, overrides auto compact/token truncation/base instructions, clears model messages when base instructions are supplied or personality is disabled, and only enables reasoning summaries when config explicitly says `Some(true)`。[E: codex-rs/models-manager/src/model_info.rs:23][E: codex-rs/models-manager/src/model_info.rs:24][E: codex-rs/models-manager/src/model_info.rs:27][E: codex-rs/models-manager/src/model_info.rs:29][E: codex-rs/models-manager/src/model_info.rs:34][E: codex-rs/models-manager/src/model_info.rs:38][E: codex-rs/models-manager/src/model_info.rs:41][E: codex-rs/models-manager/src/model_info.rs:52][E: codex-rs/models-manager/src/model_info.rs:55][E: codex-rs/models-manager/src/model_info.rs:57][E: codex-rs/models-manager/src/model_info.rs:58][E: codex-rs/models-manager/src/model_info.rs:60]
- Fallback model metadata marks `used_fallback_model_metadata = true`, sets `supported_in_api = true`, context window 272000, and default base instructions from bundled prompt。[E: codex-rs/models-manager/src/model_info.rs:16][E: codex-rs/models-manager/src/model_info.rs:65][E: codex-rs/models-manager/src/model_info.rs:76][E: codex-rs/models-manager/src/model_info.rs:81][E: codex-rs/models-manager/src/model_info.rs:92][E: codex-rs/models-manager/src/model_info.rs:98]

## gotcha

- A custom catalog disables background `/models` refresh for the manager lifetime; `refresh_available_models` returns early in Custom mode。[E: codex-rs/models-manager/src/manager.rs:222][E: codex-rs/models-manager/src/manager.rs:406][E: codex-rs/models-manager/src/manager.rs:407]
- OnlineIfUncached can still avoid network if a fresh cache exists; Online fetches remote only after Custom catalog and auth/command-auth guards have passed。[E: codex-rs/models-manager/src/manager.rs:403][E: codex-rs/models-manager/src/manager.rs:421][E: codex-rs/models-manager/src/manager.rs:430][E: codex-rs/models-manager/src/manager.rs:432][E: codex-rs/models-manager/src/manager.rs:434][E: codex-rs/models-manager/src/manager.rs:439][E: codex-rs/models-manager/src/manager.rs:441]
- `get_model_info` lookup uses prefix matching and a one-level namespaced suffix fallback, so an input model slug can inherit metadata from a shorter known slug while preserving the requested slug in returned `ModelInfo`。[E: codex-rs/models-manager/src/manager.rs:325][E: codex-rs/models-manager/src/manager.rs:327][E: codex-rs/models-manager/src/manager.rs:330][E: codex-rs/models-manager/src/manager.rs:333][E: codex-rs/models-manager/src/manager.rs:352][E: codex-rs/models-manager/src/manager.rs:363][E: codex-rs/models-manager/src/manager.rs:376][E: codex-rs/models-manager/src/manager.rs:377]

## Sources

- codex-rs/models-manager/src/manager.rs
- codex-rs/models-manager/src/cache.rs
- codex-rs/models-manager/src/model_info.rs
- codex-rs/models-manager/src/config.rs
- codex-rs/models-manager/src/lib.rs
- codex-rs/models-manager/models.json

## 相关

- `subsys.providers.overview`
- `subsys.providers.provider-openai`
- `subsys.providers.responses-api`
- `subsys.providers.auth-layer`
- `command.model-mode`
