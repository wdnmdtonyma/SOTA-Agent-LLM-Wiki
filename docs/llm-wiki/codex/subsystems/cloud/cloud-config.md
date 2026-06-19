---
id: subsys.cloud.cloud-config
title: Cloud config
kind: subsystem
tier: T2
source: [codex-rs/cloud-config/src/lib.rs, codex-rs/cloud-config/src/backend.rs, codex-rs/cloud-config/src/service.rs, codex-rs/cloud-config/src/cache.rs, codex-rs/cloud-config/src/bundle_loader.rs, codex-rs/cloud-config/src/validation.rs, codex-rs/cloud-config/src/metrics.rs, codex-rs/config/src/cloud_config_bundle.rs, codex-rs/config/src/cloud_config_layers.rs, codex-rs/config/src/loader/mod.rs]
symbols: [cloud_config_bundle_loader, cloud_config_bundle_loader_for_storage, CloudConfigBundleService, BundleClient, BackendBundleClient, CloudConfigBundleCache, CloudConfigBundle, CloudConfigBundleLayers, CloudConfigFragment, CloudRequirementsFragment, CloudConfigBundleLoader]
related: [subsys.config-auth.config-loading, subsys.config-auth.auth-flows, subsys.cloud.cloud-tasks]
evidence: explicit
status: verified
updated: 5670360009
---

> `cloud-config` 是当前 enterprise cloud-delivered config bundle 的 transport/cache/refresh 层：它从 backend 拉取 config + requirements fragments，验证后写入签名 cache，并把共享 loader 交给 `codex-config` 插入 config layer stack。[E: codex-rs/cloud-config/src/lib.rs:1][E: codex-rs/cloud-config/src/lib.rs:3][E: codex-rs/cloud-config/src/lib.rs:13][E: codex-rs/cloud-config/src/lib.rs:14][E: codex-rs/cloud-config/src/backend.rs:90][E: codex-rs/cloud-config/src/service.rs:300][E: codex-rs/cloud-config/src/cache.rs:1][E: codex-rs/config/src/loader/mod.rs:140][E: codex-rs/config/src/loader/mod.rs:239]

## 能回答的问题

- cloud config bundle 的 backend response 如何变成 config/requirements fragments？
- fetch 什么时候跳过、重试、做 auth recovery 或 fail closed？
- cache 文件如何绑定 auth identity、TTL 和 HMAC signature？
- loader 如何启动 startup fetch 与 background refresh？
- bundle 如何在 `codex-config` 中变成 config/requirements layer？

## 职责边界

`cloud-config` crate 负责 transport、cache、refresh 和 validation；TOML fragments 如何转成 `ConfigLayerEntry` / `RequirementsLayerEntry` 在 `codex-config` 中实现。[E: codex-rs/cloud-config/src/lib.rs:1][E: codex-rs/cloud-config/src/lib.rs:3][E: codex-rs/cloud-config/src/lib.rs:4][E: codex-rs/config/src/cloud_config_bundle.rs:64][E: codex-rs/config/src/cloud_config_bundle.rs:69][E: codex-rs/config/src/cloud_config_layers.rs:1] 旧独立 requirements crate 已不在当前 source tree；requirements fragments 现在是 `CloudConfigBundle.requirements_toml.enterprise_managed` 的一部分。[E: codex-rs/config/src/cloud_config_bundle.rs:25][E: codex-rs/config/src/cloud_config_bundle.rs:27][E: codex-rs/config/src/cloud_config_bundle.rs:53][E: codex-rs/config/src/cloud_config_bundle.rs:54][I]

## Backend bundle shape

`BundleClient::get_bundle` 抽象一次 backend fetch；`BackendBundleClient` 用 `BackendClient::from_auth` 构造 client，然后调用 `get_config_bundle()`。[E: codex-rs/cloud-config/src/backend.rs:40][E: codex-rs/cloud-config/src/backend.rs:41][E: codex-rs/cloud-config/src/backend.rs:43][E: codex-rs/cloud-config/src/backend.rs:47][E: codex-rs/cloud-config/src/backend.rs:57][E: codex-rs/cloud-config/src/backend.rs:59][E: codex-rs/cloud-config/src/backend.rs:68][E: codex-rs/cloud-config/src/backend.rs:69]

`bundle_from_response` 从 response 的 `config_toml.enterprise_managed` 与 `requirements_toml.enterprise_managed` 提取 delivered fragments，并映射为 `CloudConfigBundle` 的 config/requirements buckets。[E: codex-rs/cloud-config/src/backend.rs:90][E: codex-rs/cloud-config/src/backend.rs:91][E: codex-rs/cloud-config/src/backend.rs:95][E: codex-rs/cloud-config/src/backend.rs:100][E: codex-rs/cloud-config/src/backend.rs:104][E: codex-rs/cloud-config/src/backend.rs:110][E: codex-rs/cloud-config/src/backend.rs:111][E: codex-rs/cloud-config/src/backend.rs:114][E: codex-rs/cloud-config/src/backend.rs:120][E: codex-rs/cloud-config/src/backend.rs:128]

## Eligibility / fetch lifecycle

`cloud_config_eligible_auth` 要求 auth 有 plan type、`uses_codex_backend()` 为 true，并且 plan 是 business-like、Enterprise 或 Edu；没有 auth 或不 eligible 时 startup load 返回 `None`。[E: codex-rs/cloud-config/src/service.rs:47][E: codex-rs/cloud-config/src/service.rs:48][E: codex-rs/cloud-config/src/service.rs:51][E: codex-rs/cloud-config/src/service.rs:52][E: codex-rs/cloud-config/src/service.rs:53][E: codex-rs/cloud-config/src/service.rs:174][E: codex-rs/cloud-config/src/service.rs:177]

startup load 先按当前 auth identity 查 cache，命中有效 bundle 就返回；miss 后进入 remote fetch + retry。[E: codex-rs/cloud-config/src/service.rs:181][E: codex-rs/cloud-config/src/service.rs:183][E: codex-rs/cloud-config/src/service.rs:184][E: codex-rs/cloud-config/src/service.rs:188][E: codex-rs/cloud-config/src/service.rs:192] remote fetch 最多 5 次；retryable failure 会记录 attempt metric 并按 backoff retry，unauthorized 会尝试 `UnauthorizedRecovery` 后重试当前或下一次 attempt。[E: codex-rs/cloud-config/src/service.rs:34][E: codex-rs/cloud-config/src/service.rs:236][E: codex-rs/cloud-config/src/service.rs:243][E: codex-rs/cloud-config/src/service.rs:250][E: codex-rs/cloud-config/src/service.rs:253][E: codex-rs/cloud-config/src/service.rs:365][E: codex-rs/cloud-config/src/service.rs:381][E: codex-rs/cloud-config/src/service.rs:401][E: codex-rs/cloud-config/src/service.rs:433]

成功 fetch 后，service 先 `validate_bundle`，再按 auth identity 保存 cache，并返回 empty bundle as `None`。[E: codex-rs/cloud-config/src/service.rs:300][E: codex-rs/cloud-config/src/service.rs:307][E: codex-rs/cloud-config/src/service.rs:308][E: codex-rs/cloud-config/src/service.rs:320][E: codex-rs/cloud-config/src/service.rs:323][E: codex-rs/cloud-config/src/service.rs:332][E: codex-rs/cloud-config/src/service.rs:340][E: codex-rs/cloud-config/src/service.rs:56][E: codex-rs/cloud-config/src/service.rs:57]

## Cache 与 metrics

cache 文件名是 `cloud-config-bundle-cache.json`，TTL 是 1 小时；读取 cache 要求提供完整 chatgpt_user_id/account_id、文件可读可 parse、signature 有效、version 支持、identity match 且未过期。[E: codex-rs/cloud-config/src/cache.rs:23][E: codex-rs/cloud-config/src/cache.rs:24][E: codex-rs/cloud-config/src/cache.rs:25][E: codex-rs/cloud-config/src/cache.rs:49][E: codex-rs/cloud-config/src/cache.rs:54][E: codex-rs/cloud-config/src/cache.rs:58][E: codex-rs/cloud-config/src/cache.rs:68][E: codex-rs/cloud-config/src/cache.rs:82][E: codex-rs/cloud-config/src/cache.rs:85][E: codex-rs/cloud-config/src/cache.rs:98][E: codex-rs/cloud-config/src/cache.rs:102]

cache save 写入 version、cached_at、expires_at、chatgpt_user_id、account_id 和 bundle，并用 HMAC-SHA256 signature 包住 signed payload。[E: codex-rs/cloud-config/src/cache.rs:128][E: codex-rs/cloud-config/src/cache.rs:134][E: codex-rs/cloud-config/src/cache.rs:141][E: codex-rs/cloud-config/src/cache.rs:143][E: codex-rs/cloud-config/src/cache.rs:144][E: codex-rs/cloud-config/src/cache.rs:145][E: codex-rs/cloud-config/src/cache.rs:146][E: codex-rs/cloud-config/src/cache.rs:147][E: codex-rs/cloud-config/src/cache.rs:151][E: codex-rs/cloud-config/src/cache.rs:152][E: codex-rs/cloud-config/src/cache.rs:220][E: codex-rs/cloud-config/src/cache.rs:227]

metrics 覆盖 fetch attempt、fetch final 和 load，并用 `bundle_shape_tag` 区分 none/empty/enterprise_config/enterprise_requirements。[E: codex-rs/cloud-config/src/metrics.rs:3][E: codex-rs/cloud-config/src/metrics.rs:4][E: codex-rs/cloud-config/src/metrics.rs:5][E: codex-rs/cloud-config/src/metrics.rs:7][E: codex-rs/cloud-config/src/metrics.rs:26][E: codex-rs/cloud-config/src/metrics.rs:49][E: codex-rs/cloud-config/src/metrics.rs:60][E: codex-rs/cloud-config/src/metrics.rs:66][E: codex-rs/cloud-config/src/metrics.rs:69][E: codex-rs/cloud-config/src/metrics.rs:73][E: codex-rs/cloud-config/src/metrics.rs:77]

## Loader 与 background refresh

`cloud_config_bundle_loader` 构造 `CloudConfigBundleService`，spawn startup fetch task，同时 spawn background refresh task；新的 refresh task 会替换并 abort 旧 task，返回的 `CloudConfigBundleLoader` await startup task 结果。[E: codex-rs/cloud-config/src/bundle_loader.rs:21][E: codex-rs/cloud-config/src/bundle_loader.rs:26][E: codex-rs/cloud-config/src/bundle_loader.rs:33][E: codex-rs/cloud-config/src/bundle_loader.rs:35][E: codex-rs/cloud-config/src/bundle_loader.rs:40][E: codex-rs/cloud-config/src/bundle_loader.rs:41][E: codex-rs/cloud-config/src/bundle_loader.rs:43][E: codex-rs/cloud-config/src/bundle_loader.rs:51] `cloud_config_bundle_loader_for_storage` 先用 storage/auth 参数创建 shared `AuthManager`，再委托 loader。[E: codex-rs/cloud-config/src/bundle_loader.rs:55][E: codex-rs/cloud-config/src/bundle_loader.rs:62][E: codex-rs/cloud-config/src/bundle_loader.rs:65][E: codex-rs/cloud-config/src/bundle_loader.rs:66][E: codex-rs/cloud-config/src/bundle_loader.rs:67][E: codex-rs/cloud-config/src/bundle_loader.rs:70]

background refresh 每 15 分钟执行一次；没有 auth 或不 eligible 时停止 loop，timeout/error 只记录并保留 existing cache。[E: codex-rs/cloud-config/src/service.rs:35][E: codex-rs/cloud-config/src/service.rs:457][E: codex-rs/cloud-config/src/service.rs:459][E: codex-rs/cloud-config/src/service.rs:460][E: codex-rs/cloud-config/src/service.rs:462][E: codex-rs/cloud-config/src/service.rs:464][E: codex-rs/cloud-config/src/service.rs:473][E: codex-rs/cloud-config/src/service.rs:474][E: codex-rs/cloud-config/src/service.rs:477][E: codex-rs/cloud-config/src/service.rs:481][E: codex-rs/cloud-config/src/service.rs:492]

## Config integration

`CloudConfigBundle` 包含 `config_toml` 与 `requirements_toml` 两个 buckets；`CloudConfigBundleLayers::from_bundle` 把它们转换为 enterprise-managed config layers 和 requirements layers。[E: codex-rs/config/src/cloud_config_bundle.rs:25][E: codex-rs/config/src/cloud_config_bundle.rs:26][E: codex-rs/config/src/cloud_config_bundle.rs:27][E: codex-rs/config/src/cloud_config_bundle.rs:69][E: codex-rs/config/src/cloud_config_bundle.rs:71][E: codex-rs/config/src/cloud_config_bundle.rs:73][E: codex-rs/config/src/cloud_config_bundle.rs:77][E: codex-rs/config/src/cloud_config_bundle.rs:98][E: codex-rs/config/src/cloud_config_bundle.rs:109][E: codex-rs/config/src/cloud_config_bundle.rs:115]

config fragments 被解析为 TOML、解析相对路径，并以 `ConfigLayerSource::EnterpriseManaged` 变成 `ConfigLayerEntry`；因为 backend fragments 是高优先级到低优先级，返回前会 reverse 成 config stack 顺序。[E: codex-rs/config/src/cloud_config_layers.rs:21][E: codex-rs/config/src/cloud_config_layers.rs:23][E: codex-rs/config/src/cloud_config_layers.rs:68][E: codex-rs/config/src/cloud_config_layers.rs:82][E: codex-rs/config/src/cloud_config_layers.rs:91][E: codex-rs/config/src/cloud_config_layers.rs:99][E: codex-rs/config/src/cloud_config_layers.rs:106][E: codex-rs/config/src/cloud_config_layers.rs:107][E: codex-rs/config/src/cloud_config_layers.rs:117][E: codex-rs/config/src/cloud_config_layers.rs:119]

`load_config_layers_state` 在未忽略 managed requirements 时 await cloud bundle loader，把 enterprise-managed requirements 保存到 requirements layers，把 enterprise-managed config layers 插入 system layer 之后、user/profile/project/runtime layers 之前。[E: codex-rs/config/src/loader/mod.rs:94][E: codex-rs/config/src/loader/mod.rs:99][E: codex-rs/config/src/loader/mod.rs:100][E: codex-rs/config/src/loader/mod.rs:140][E: codex-rs/config/src/loader/mod.rs:141][E: codex-rs/config/src/loader/mod.rs:148][E: codex-rs/config/src/loader/mod.rs:152][E: codex-rs/config/src/loader/mod.rs:153][E: codex-rs/config/src/loader/mod.rs:238][E: codex-rs/config/src/loader/mod.rs:239]

## Gotchas

- Cloud bundle load failure is fail-closed for config loading: `cloud_config_bundle.get().await.map_err(io::Error::other)?` propagates loader errors.[E: codex-rs/config/src/loader/mod.rs:141]
- Strict config mode validates cloud config fragments against ignored/unknown TOML fields before accepting them.[E: codex-rs/config/src/cloud_config_layers.rs:96][E: codex-rs/config/src/cloud_config_layers.rs:123][E: codex-rs/config/src/cloud_config_layers.rs:130][E: codex-rs/config/src/cloud_config_layers.rs:134]
- cache identity mismatch or expiration is treated as cache miss, not as a usable stale policy source.[E: codex-rs/cloud-config/src/cache.rs:98][E: codex-rs/cloud-config/src/cache.rs:102]

## Sources

- `codex-rs/cloud-config/src/lib.rs`
- `codex-rs/cloud-config/src/backend.rs`
- `codex-rs/cloud-config/src/service.rs`
- `codex-rs/cloud-config/src/cache.rs`
- `codex-rs/cloud-config/src/bundle_loader.rs`
- `codex-rs/cloud-config/src/validation.rs`
- `codex-rs/cloud-config/src/metrics.rs`
- `codex-rs/config/src/cloud_config_bundle.rs`
- `codex-rs/config/src/cloud_config_layers.rs`
- `codex-rs/config/src/loader/mod.rs`

## 相关

- `subsys.config-auth.config-loading`: config layer stack 与 requirements composition。
- `subsys.config-auth.auth-flows`: cloud bundle fetch 依赖 ChatGPT/Codex backend auth。
- `subsys.cloud.cloud-tasks`: Cloud task CLI/TUI 也依赖 ChatGPT backend account context。
