---
id: subsys.cloud.cloud-requirements
title: Cloud requirements
kind: subsystem
tier: T2
source: [codex-rs/cloud-requirements/src/lib.rs]
symbols: [CloudRequirementsService, RequirementsFetcher, cloud_requirements_loader, cloud_requirements_loader_for_storage, parse_cloud_requirements]
related: [subsys.config-auth.auth-flows, subsys.config-auth.config-loading, subsys.cloud.cloud-tasks]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Cloud requirements 子系统在 ChatGPT Business/Enterprise auth 下从 backend 拉取 managed requirements TOML，使用 HMAC 签名缓存到本地，并在配置加载时提供 `CloudRequirementsLoader` / `ConfigRequirementsToml`。[E: codex-rs/cloud-requirements/src/lib.rs:327][E: codex-rs/cloud-requirements/src/lib.rs:334][E: codex-rs/cloud-requirements/src/lib.rs:335][E: codex-rs/cloud-requirements/src/lib.rs:140][E: codex-rs/cloud-requirements/src/lib.rs:690]

## 能回答的问题

- cloud requirements 什么时候会跳过 fetch？
- cache 的 freshness、TTL、签名和身份绑定规则是什么？
- unauthorized 或 retryable backend error 怎样处理？
- background refresh 怎样避免阻塞配置加载？
- requirements contents 怎样解析为空或 TOML requirements？

## 职责边界

cloud-requirements 节点覆盖 managed requirements 的远端获取、缓存、签名、身份绑定和 loader integration。它不覆盖普通 config layer 合并；`subsys.config-auth.config-loading` 解释 requirements TOML 如何与 config layer stack 组合。

## 常量与数据模型

cloud requirements fetch timeout 是 15 秒，最大 retry attempts 是 5，background refresh interval 是 5 分钟，cache TTL 是 30 分钟。[E: codex-rs/cloud-requirements/src/lib.rs:45][E: codex-rs/cloud-requirements/src/lib.rs:46][E: codex-rs/cloud-requirements/src/lib.rs:48][E: codex-rs/cloud-requirements/src/lib.rs:49] cache 文件名、metric names 和 HMAC key material 也在 constants 区集中定义。[E: codex-rs/cloud-requirements/src/lib.rs:47][E: codex-rs/cloud-requirements/src/lib.rs:50][E: codex-rs/cloud-requirements/src/lib.rs:51][E: codex-rs/cloud-requirements/src/lib.rs:52][E: codex-rs/cloud-requirements/src/lib.rs:56][E: codex-rs/cloud-requirements/src/lib.rs:59]

cache file 包含 `signed_payload` 和 `signature`；signed payload 包含 `cached_at`、`expires_at`、`chatgpt_user_id`、`account_id` 和 `contents`，payload 解析后得到 requirements TOML。[E: codex-rs/cloud-requirements/src/lib.rs:118][E: codex-rs/cloud-requirements/src/lib.rs:120][E: codex-rs/cloud-requirements/src/lib.rs:121][E: codex-rs/cloud-requirements/src/lib.rs:125][E: codex-rs/cloud-requirements/src/lib.rs:130][E: codex-rs/cloud-requirements/src/lib.rs:133] `sign_cache_payload` 与 `verify_cache_signature` 用 HMAC 保护 cache payload，防止本地 cache 被静默篡改后继续使用。[E: codex-rs/cloud-requirements/src/lib.rs:140][E: codex-rs/cloud-requirements/src/lib.rs:160][E: codex-rs/cloud-requirements/src/lib.rs:166][E: codex-rs/cloud-requirements/src/lib.rs:168]

## Fetch gating 与 cache

`CloudRequirementsService::fetch` 在没有 auth、没有 plan、非 ChatGPT auth、非 business/enterprise 条件下直接跳过 fetch。[E: codex-rs/cloud-requirements/src/lib.rs:327][E: codex-rs/cloud-requirements/src/lib.rs:328][E: codex-rs/cloud-requirements/src/lib.rs:338] 成功读取有效 cache 时，service 直接返回 cached requirements；后台 refresh loop 由 loader 创建时启动，并按 refresh interval 周期运行。[E: codex-rs/cloud-requirements/src/lib.rs:341][E: codex-rs/cloud-requirements/src/lib.rs:350][E: codex-rs/cloud-requirements/src/lib.rs:531][E: codex-rs/cloud-requirements/src/lib.rs:533][E: codex-rs/cloud-requirements/src/lib.rs:704]

`load_cache` 要求 cache 中的 chatgpt_user_id/account_id 与当前 auth identity 匹配，且 cache 未过期，并通过 HMAC signature 校验。[E: codex-rs/cloud-requirements/src/lib.rs:574][E: codex-rs/cloud-requirements/src/lib.rs:607][E: codex-rs/cloud-requirements/src/lib.rs:618][E: codex-rs/cloud-requirements/src/lib.rs:622][E: codex-rs/cloud-requirements/src/lib.rs:626] `save_cache` 会写入签名 payload，并记录 `cached_at`/`expires_at` timestamps。[E: codex-rs/cloud-requirements/src/lib.rs:648][E: codex-rs/cloud-requirements/src/lib.rs:661][E: codex-rs/cloud-requirements/src/lib.rs:663][E: codex-rs/cloud-requirements/src/lib.rs:671][E: codex-rs/cloud-requirements/src/lib.rs:687]

## Fetcher 与 retry

`RequirementsFetcher` trait 抽象 fetch 行为；backend fetcher 构造 HTTP client，并把 unauthorized、retryable、missing contents 等情况映射成 service 可处理结果。[E: codex-rs/cloud-requirements/src/lib.rs:185][E: codex-rs/cloud-requirements/src/lib.rs:190][E: codex-rs/cloud-requirements/src/lib.rs:206][E: codex-rs/cloud-requirements/src/lib.rs:212][E: codex-rs/cloud-requirements/src/lib.rs:227][E: codex-rs/cloud-requirements/src/lib.rs:241] `fetch_with_timeout` 给 fetch future 套超时并记录 metric。[E: codex-rs/cloud-requirements/src/lib.rs:271][E: codex-rs/cloud-requirements/src/lib.rs:325]

retry loop 处理 success、retry、unauthorized recovery、parse/save cache 和 terminal error。[E: codex-rs/cloud-requirements/src/lib.rs:360][E: codex-rs/cloud-requirements/src/lib.rs:369][E: codex-rs/cloud-requirements/src/lib.rs:529] background refresh loop 周期性执行 `refresh_cache`；loader 用 spawned task 运行该 loop，并在创建新 refresh task 时取消旧 task。[E: codex-rs/cloud-requirements/src/lib.rs:531][E: codex-rs/cloud-requirements/src/lib.rs:533][E: codex-rs/cloud-requirements/src/lib.rs:547][E: codex-rs/cloud-requirements/src/lib.rs:703][E: codex-rs/cloud-requirements/src/lib.rs:710]

## Loader integration

`cloud_requirements_loader` 创建 service 后立即 spawn startup fetch task 与 background refresh task；新 refresh task 会替换并 abort 旧 refresh task，返回的 loader await startup fetch task。[E: codex-rs/cloud-requirements/src/lib.rs:690][E: codex-rs/cloud-requirements/src/lib.rs:695][E: codex-rs/cloud-requirements/src/lib.rs:702][E: codex-rs/cloud-requirements/src/lib.rs:704][E: codex-rs/cloud-requirements/src/lib.rs:709][E: codex-rs/cloud-requirements/src/lib.rs:712] `cloud_requirements_loader_for_storage` 用 shared `AuthManager` 构造 loader，连接 auth subsystem 与 config loader。[E: codex-rs/cloud-requirements/src/lib.rs:724][E: codex-rs/cloud-requirements/src/lib.rs:730][E: codex-rs/cloud-requirements/src/lib.rs:737]

`parse_cloud_requirements` 会把空 contents 或空 requirements 解析成 `None`，非空则返回 parsed requirements。[E: codex-rs/cloud-requirements/src/lib.rs:739][E: codex-rs/cloud-requirements/src/lib.rs:742][E: codex-rs/cloud-requirements/src/lib.rs:747][E: codex-rs/cloud-requirements/src/lib.rs:750]

## 设计动机与权衡

cloud requirements 同时使用 auth gating、identity-bound cache 和 HMAC signature，是为了让远端 managed policy 可以在短时间离线复用，但不能跨 auth identity 复用，也不能在本地被无声篡改。[I] 该设计由 `fetch` skip conditions、`load_cache` identity checks 和 `verify_cache_signature` 共同体现。[E: codex-rs/cloud-requirements/src/lib.rs:327][E: codex-rs/cloud-requirements/src/lib.rs:574][E: codex-rs/cloud-requirements/src/lib.rs:618][E: codex-rs/cloud-requirements/src/lib.rs:160]

有效 cache 存在时，startup fetch 会短路返回 cached requirements；background refresh 负责后续周期性更新 cache；无有效 cache 时仍会等待 startup fetch 或 timeout。[I] 该结论由 cache return、refresh interval、`refresh_cache_in_background` 和 loader 中的 `tokio::spawn` 支撑。[E: codex-rs/cloud-requirements/src/lib.rs:341][E: codex-rs/cloud-requirements/src/lib.rs:350][E: codex-rs/cloud-requirements/src/lib.rs:48][E: codex-rs/cloud-requirements/src/lib.rs:531][E: codex-rs/cloud-requirements/src/lib.rs:704]

## Gotchas

- 非 ChatGPT auth 或没有 business/enterprise plan 时不会 fetch；API key 用户不会得到 cloud requirements。[E: codex-rs/cloud-requirements/src/lib.rs:327][E: codex-rs/cloud-requirements/src/lib.rs:338]
- cache 过期或 identity mismatch 会被拒绝，即使文件内容 TOML 看起来有效。[E: codex-rs/cloud-requirements/src/lib.rs:618][E: codex-rs/cloud-requirements/src/lib.rs:622]
- empty requirements contents 不是错误，会被解析为 `None`。[E: codex-rs/cloud-requirements/src/lib.rs:742]

## Sources

- `codex-rs/cloud-requirements/src/lib.rs`

## 相关

- `subsys.config-auth.auth-flows`: cloud requirements fetch 依赖 ChatGPT auth identity。
- `subsys.config-auth.config-loading`: cloud requirements loader 参与 config requirements 合并。
- `subsys.cloud.cloud-tasks`: cloud features 共同依赖 ChatGPT backend/account context。
