---
id: subsys.providers.provider-bedrock
title: Amazon Bedrock provider
kind: subsystem
tier: T2
source: [codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/amazon_bedrock/mod.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs, codex-rs/model-provider/src/amazon_bedrock/mantle.rs, codex-rs/aws-auth/src/lib.rs, codex-rs/aws-auth/src/config.rs, codex-rs/aws-auth/src/signing.rs]
symbols: [AmazonBedrockModelProvider, create_amazon_bedrock_provider, resolve_auth_method, runtime_base_url, base_url, AwsAuthContext, AwsAuthConfig, sign_request]
related: [subsys.providers.overview, subsys.providers.auth-layer, subsys.providers.retry-errors, config.model-provider]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Amazon Bedrock provider 是专用 runtime provider：provider info 携带 AWS auth config，runtime 按 region 生成 Bedrock Mantle OpenAI-compatible base URL，并在 auth 层按 Codex-managed Bedrock API key、`AWS_BEARER_TOKEN_BEDROCK`、AWS SDK/SigV4 的顺序选择认证方式。[E: codex-rs/model-provider-info/src/lib.rs:46][E: codex-rs/model-provider-info/src/lib.rs:108][E: codex-rs/model-provider-info/src/lib.rs:149][E: codex-rs/model-provider/src/provider.rs:236][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:92][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:84][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:49]

## 能回答的问题

- Bedrock provider 的 base URL 为什么由 region 生成？
- `AWS_BEARER_TOKEN_BEDROCK` 和 AWS SDK credentials 谁优先？
- SigV4 签名前为什么移除 legacy `session_id` header？
- Bedrock provider config 允许覆盖哪些字段？
- 哪些 Bedrock Mantle regions 被源码接受？

## 职责边界

Bedrock provider 只处理 Amazon Bedrock Mantle OpenAI-compatible Responses endpoint。它不走 generic `ConfiguredModelProvider`，只在 Codex-managed Bedrock API key 存在时暴露 `AuthManager`；否则认证由 env bearer 或 AWS SDK/SigV4 路径负责。Provider info validation 也不允许 generic env_key/command auth/requires_openai_auth 与 aws config 同时存在。[E: codex-rs/model-provider/src/provider.rs:232][E: codex-rs/model-provider/src/provider.rs:236][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:66][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:71][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:77][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:143][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:143][E: codex-rs/model-provider-info/src/lib.rs:158][E: codex-rs/model-provider-info/src/lib.rs:167][E: codex-rs/model-provider-info/src/lib.rs:173][E: codex-rs/model-provider-info/src/lib.rs:176]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: Bedrock provider default info、validation、configured AWS override merge。[E: codex-rs/model-provider-info/src/lib.rs:39][E: codex-rs/model-provider-info/src/lib.rs:370][E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:471][E: codex-rs/model-provider-info/src/lib.rs:476][E: codex-rs/model-provider-info/src/lib.rs:481][E: codex-rs/model-provider-info/src/lib.rs:485]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: `AmazonBedrockModelProvider` trait impl、managed auth gating、runtime base URL/auth resolution。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:40][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:40][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:66][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:71][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:77][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:92][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:108][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:143][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:143]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: managed/env bearer-vs-SigV4 auth method、legacy header removal、AuthProvider impl。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:27][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:116][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:128]
- `codex-rs/aws-auth/src/lib.rs`: AWS auth context、request-to-sign model、retryability classification。[E: codex-rs/aws-auth/src/lib.rs:15][E: codex-rs/aws-auth/src/lib.rs:23][E: codex-rs/aws-auth/src/lib.rs:79][E: codex-rs/aws-auth/src/lib.rs:114]

## 数据模型

- `create_amazon_bedrock_provider` sets name `Amazon Bedrock`，但 built-in `base_url` 现在为 `None`，让 runtime 按 region 派生 Mantle endpoint；configured non-empty base URL 因而是明确 endpoint override。默认 AWS profile/region 为 None，wire API 是 Responses，`requires_openai_auth = false`、`supports_websockets = false`。[E: codex-rs/model-provider-info/src/lib.rs:370][E: codex-rs/model-provider-info/src/lib.rs:373][E: codex-rs/model-provider-info/src/lib.rs:374][E: codex-rs/model-provider-info/src/lib.rs:378][E: codex-rs/model-provider-info/src/lib.rs:383][E: codex-rs/model-provider-info/src/lib.rs:387][E: codex-rs/model-provider-info/src/lib.rs:398][E: codex-rs/model-provider-info/src/lib.rs:399]
- `ModelProviderAwsAuthInfo` 包含 optional profile 和 optional region；env bearer path 的 region fallback 是 configured region、`AWS_REGION`、`AWS_DEFAULT_REGION`。[E: codex-rs/model-provider-info/src/lib.rs:149][E: codex-rs/model-provider-info/src/lib.rs:151][E: codex-rs/model-provider-info/src/lib.rs:153][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:83][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:87][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:89]
- `AwsAuthConfig` 包含 profile、region、service；Bedrock Mantle service name 是 `bedrock-mantle`。[E: codex-rs/aws-auth/src/lib.rs:15][E: codex-rs/aws-auth/src/lib.rs:16][E: codex-rs/aws-auth/src/lib.rs:17][E: codex-rs/aws-auth/src/lib.rs:18][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:10]
- `AwsRequestToSign` 包含 method、url、headers、body；`AwsSignedRequest` 返回 signed url 和 headers。[E: codex-rs/aws-auth/src/lib.rs:23][E: codex-rs/aws-auth/src/lib.rs:24][E: codex-rs/aws-auth/src/lib.rs:25][E: codex-rs/aws-auth/src/lib.rs:26][E: codex-rs/aws-auth/src/lib.rs:27][E: codex-rs/aws-auth/src/lib.rs:32][E: codex-rs/aws-auth/src/lib.rs:33][E: codex-rs/aws-auth/src/lib.rs:34]

## 控制流

1. `create_model_provider` 发现 provider 是 Bedrock 后构造 `AmazonBedrockModelProvider`；Bedrock 不走 `ConfiguredModelProvider`。[E: codex-rs/model-provider/src/provider.rs:232][E: codex-rs/model-provider/src/provider.rs:236][E: codex-rs/model-provider/src/provider.rs:237][E: codex-rs/model-provider/src/provider.rs:239]
2. `AmazonBedrockModelProvider::api_provider` clone provider info，把 base URL 设置为 `runtime_base_url()`，再调用 `to_api_provider(None)`；`runtime_base_url` 优先返回 configured override，没有 override 才解析 managed/env/AWS auth 所对应的 region。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:92][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:93][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:98][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:99][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:102][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:104]
3. `base_url` 只接受 `BEDROCK_MANTLE_SUPPORTED_REGIONS` 中的 region，否则返回 fatal error；URL 形状是 `https://bedrock-mantle.{region}.api.aws/openai/v1`。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:11][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:47][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:49][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:51]
4. `resolve_auth_method` 先使用 managed `BedrockApiKeyAuth`，其次读取非空 `AWS_BEARER_TOKEN_BEDROCK` 并解析 region，最后加载 AWS SDK auth context。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:38][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:45][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:49][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:50]
5. managed/env bearer paths return `BearerAuthProvider`; AWS SDK path returns `BedrockMantleSigV4AuthProvider`。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:60][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:61][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:67]
6. SigV4 provider 的 `apply_auth` 移除 snake_case legacy headers，prepare body，调用 `AwsAuthContext::sign`，再把 signed url/headers/body 写回 request，并禁用 request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:116][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:139][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:140][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:152][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:153][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:154][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:155]
7. `AwsAuthContext::load` 通过 AWS SDK config 解析 credentials provider 和 region；`AwsAuthContext::sign` 再取 credentials 并调用 `signing::sign_request`。[E: codex-rs/aws-auth/src/lib.rs:80][E: codex-rs/aws-auth/src/lib.rs:81][E: codex-rs/aws-auth/src/lib.rs:82][E: codex-rs/aws-auth/src/lib.rs:83][E: codex-rs/aws-auth/src/lib.rs:100][E: codex-rs/aws-auth/src/lib.rs:109][E: codex-rs/aws-auth/src/lib.rs:110]
8. `sign_request` 将 headers/body 构造成 AWS SigV4 `SignableRequest`，设置 region/service/time，签名后把 instructions apply 到 HTTP request headers。[E: codex-rs/aws-auth/src/signing.rs:17][E: codex-rs/aws-auth/src/signing.rs:24][E: codex-rs/aws-auth/src/signing.rs:34][E: codex-rs/aws-auth/src/signing.rs:38][E: codex-rs/aws-auth/src/signing.rs:45][E: codex-rs/aws-auth/src/signing.rs:46][E: codex-rs/aws-auth/src/signing.rs:47][E: codex-rs/aws-auth/src/signing.rs:51][E: codex-rs/aws-auth/src/signing.rs:62]
9. `merge_configured_model_providers` 对 Bedrock 可合并 `base_url`、command `auth`、`http_headers` 和整组 AWS profile/region；command-auth path 走 configured provider auth 并可配 base URL，非 command-auth path 才走 Bedrock bearer/SigV4 resolution。[E: codex-rs/model-provider-info/src/lib.rs:477][E: codex-rs/model-provider-info/src/lib.rs:480][E: codex-rs/model-provider-info/src/lib.rs:483][E: codex-rs/model-provider-info/src/lib.rs:485][E: codex-rs/model-provider-info/src/lib.rs:489][E: codex-rs/model-provider-info/src/lib.rs:491][E: codex-rs/model-provider-info/src/lib.rs:495][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:81][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:82][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:108][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:111]

10. Account state no longer exposes an AWS-vs-Codex credential-source enum；`ProviderAccount::AmazonBedrock` 只报告 `uses_codex_managed_credentials` boolean，command auth 与 AWS SDK/env bearer 都是 false。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:155][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:157][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:158][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:160]

## 设计动机与权衡

- `session_id`、`thread_id`、`future_identity_header` 被 header-removal helper 移除，`x-client-request-id` 保留；测试直接覆盖这些 header 行为。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:116][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:118][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:121][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:284][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:286][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:287][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:288][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:293]
- AWS credential provider timeout/provider error 被标记 retryable，配置/签名类错误不 retry；`aws_auth_error_to_auth_error` 把 retryable AWS auth error 映射为 `AuthError::Transient`，否则映射为 `AuthError::Build`。[E: codex-rs/aws-auth/src/lib.rs:114][E: codex-rs/aws-auth/src/lib.rs:118][E: codex-rs/aws-auth/src/lib.rs:123][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:103][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:104][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:107]
- env bearer token path requires a region from config, `AWS_REGION`, or `AWS_DEFAULT_REGION`; managed bearer token auth carries its own region, and AWS SDK auth uses the SDK-resolved context region。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:87][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:89][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:69][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:72]

## gotcha

- Codex-managed Bedrock API key auth takes precedence over env bearer and AWS SDK auth; `AWS_BEARER_TOKEN_BEDROCK` takes precedence over AWS SDK credentials only when no managed auth is present。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:49]
- `region_from_config` 会 trim region 并丢弃空字符串；空白 region 等价于未配置。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:34][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:38][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:39]
- Bedrock provider validation 禁止 command auth、env_key、experimental bearer 和 requires_openai_auth；不要按 generic OpenAI-compatible provider 方式配置 Bedrock。[E: codex-rs/model-provider-info/src/lib.rs:158][E: codex-rs/model-provider-info/src/lib.rs:173][E: codex-rs/model-provider-info/src/lib.rs:167][E: codex-rs/model-provider-info/src/lib.rs:170][E: codex-rs/model-provider-info/src/lib.rs:176]

## Sources

- codex-rs/model-provider-info/src/lib.rs
- codex-rs/model-provider/src/provider.rs
- codex-rs/model-provider/src/amazon_bedrock/mod.rs
- codex-rs/model-provider/src/amazon_bedrock/auth.rs
- codex-rs/model-provider/src/amazon_bedrock/mantle.rs
- codex-rs/aws-auth/src/lib.rs
- codex-rs/aws-auth/src/config.rs
- codex-rs/aws-auth/src/signing.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.auth-layer`
- `subsys.providers.retry-errors`
- `config.model-provider`
