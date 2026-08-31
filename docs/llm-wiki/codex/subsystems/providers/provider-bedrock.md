---
id: subsys.providers.provider-bedrock
title: Amazon Bedrock provider
kind: subsystem
tier: T2
source: [codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/amazon_bedrock/mod.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs, codex-rs/model-provider/src/amazon_bedrock/mantle.rs, codex-rs/model-provider/src/amazon_bedrock/runtime.rs, codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs, codex-rs/model-provider/src/amazon_bedrock/catalog.rs, codex-rs/aws-auth/src/lib.rs, codex-rs/aws-auth/src/config.rs, codex-rs/aws-auth/src/signing.rs]
symbols: [AmazonBedrockModelProvider, create_amazon_bedrock_provider, create_amazon_bedrock_runtime_provider, BedrockEndpoint, static_runtime_model_catalog, resolve_auth_method, runtime_base_url, base_url, AwsAuthContext, AwsAuthConfig, sign_request]
related: [subsys.providers.overview, subsys.providers.auth-layer, subsys.providers.retry-errors, config.model-provider]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Amazon Bedrock provider 是专用 runtime provider：provider info 携带 AWS auth config，runtime 按 region 生成 Bedrock Mantle OpenAI-compatible base URL，并在 auth 层按 Codex-managed Bedrock API key、`AWS_BEARER_TOKEN_BEDROCK`、AWS SDK/SigV4 的顺序选择认证方式。[E: codex-rs/model-provider-info/src/lib.rs:49][E: codex-rs/model-provider-info/src/lib.rs:111][E: codex-rs/model-provider-info/src/lib.rs:150][E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:114][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:100][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:100]

## 能回答的问题

- Bedrock provider 的 base URL 为什么由 region 生成？
- `AWS_BEARER_TOKEN_BEDROCK` 和 AWS SDK credentials 谁优先？
- SigV4 签名前为什么移除 legacy `session_id` header？
- Bedrock provider config 允许覆盖哪些字段？
- 哪些 Bedrock Mantle regions 被源码接受？
- Amazon Bedrock Runtime catalog 为什么把 global 模型排在 US cross-region 前面？

## 职责边界

Bedrock provider 只处理 Amazon Bedrock Mantle OpenAI-compatible Responses endpoint。它不走 generic `ConfiguredModelProvider`，只在 Codex-managed Bedrock API key 存在时暴露 `AuthManager`；否则认证由 env bearer 或 AWS SDK/SigV4 路径负责。Provider info validation 也不允许 generic env_key/command auth/requires_openai_auth 与 aws config 同时存在。[E: codex-rs/model-provider/src/provider.rs:286][E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:67][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:75][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:83][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:182][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:182][E: codex-rs/model-provider-info/src/lib.rs:192][E: codex-rs/model-provider-info/src/lib.rs:199][E: codex-rs/model-provider-info/src/lib.rs:204][E: codex-rs/model-provider-info/src/lib.rs:207]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: Bedrock provider default info、validation、configured AWS override merge。[E: codex-rs/model-provider-info/src/lib.rs:42][E: codex-rs/model-provider-info/src/lib.rs:419][E: codex-rs/model-provider-info/src/lib.rs:192][E: codex-rs/model-provider-info/src/lib.rs:529][E: codex-rs/model-provider-info/src/lib.rs:535][E: codex-rs/model-provider-info/src/lib.rs:540][E: codex-rs/model-provider-info/src/lib.rs:542]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: `AmazonBedrockModelProvider` trait impl、managed auth gating、runtime base URL/auth resolution。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:45][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:45][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:67][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:75][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:83][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:114][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:182][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:182]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: managed/env bearer-vs-SigV4 auth method、legacy header removal、AuthProvider impl。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:227][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:240]
- `codex-rs/aws-auth/src/lib.rs`: AWS auth context、request-to-sign model、retryability classification。[E: codex-rs/aws-auth/src/lib.rs:20][E: codex-rs/aws-auth/src/lib.rs:49][E: codex-rs/aws-auth/src/lib.rs:109][E: codex-rs/aws-auth/src/lib.rs:173]

## 数据模型

- `create_amazon_bedrock_provider` sets name `Amazon Bedrock`，built-in `base_url` 为 `None`，让 runtime 按 region 派生 endpoint；`create_amazon_bedrock_runtime_provider` 复用同一构造再改名为 `Amazon Bedrock Runtime` 并清掉 Mantle client-agent header。[E: codex-rs/model-provider-info/src/lib.rs:423][E: codex-rs/model-provider-info/src/lib.rs:431][E: codex-rs/model-provider-info/src/lib.rs:458][E: codex-rs/model-provider-info/src/lib.rs:462]
- `ModelProviderAwsAuthInfo` 包含 optional profile 和 optional region；env bearer path 的 region fallback 是 configured region、`AWS_REGION`、`AWS_DEFAULT_REGION`。[E: codex-rs/model-provider-info/src/lib.rs:150][E: codex-rs/model-provider-info/src/lib.rs:154][E: codex-rs/model-provider-info/src/lib.rs:156][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:186][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:201][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:202][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:202]
- `AwsAuthConfig` 包含 profile、region、service；Bedrock Mantle service name 是 `bedrock-mantle`。[E: codex-rs/aws-auth/src/lib.rs:20][E: codex-rs/aws-auth/src/lib.rs:21][E: codex-rs/aws-auth/src/lib.rs:22][E: codex-rs/aws-auth/src/lib.rs:23][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:11]
- `AwsRequestToSign` 包含 method、url、headers、body；`AwsSignedRequest` 返回 signed url 和 headers。[E: codex-rs/aws-auth/src/lib.rs:49][E: codex-rs/aws-auth/src/lib.rs:50][E: codex-rs/aws-auth/src/lib.rs:51][E: codex-rs/aws-auth/src/lib.rs:52][E: codex-rs/aws-auth/src/lib.rs:53][E: codex-rs/aws-auth/src/lib.rs:58][E: codex-rs/aws-auth/src/lib.rs:59][E: codex-rs/aws-auth/src/lib.rs:60]

## 控制流

1. `create_model_provider` 发现 `is_amazon_bedrock()` 后构造 `AmazonBedrockModelProvider`；该 helper 同时匹配 Mantle `Amazon Bedrock` 与 Runtime `Amazon Bedrock Runtime`，二者都不走 `ConfiguredModelProvider`。[E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/provider.rs:324][E: codex-rs/model-provider-info/src/lib.rs:490]
2. `AmazonBedrockModelProvider::api_provider` clone provider info，把 base URL 设置为 `runtime_base_url()`，再调用 `to_api_provider(None)`；`runtime_base_url` 优先返回 configured override，没有 override 才解析 managed/env/AWS auth 所对应的 region。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:114][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:115][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:116][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:120][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:120][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:135][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:137]
3. `base_url` 只接受 `BEDROCK_MANTLE_SUPPORTED_REGIONS` 中的 region，否则返回 fatal error；URL 形状是 `https://bedrock-mantle.{region}.api.aws/openai/v1`。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:12][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:50][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:52]
4. `resolve_auth_method` 先使用 managed `BedrockApiKeyAuth`，其次读取非空 `AWS_BEARER_TOKEN_BEDROCK` 并解析 region，最后加载 AWS SDK auth context。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:89][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:100][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:100]
5. managed/env bearer paths return `BearerAuthProvider`; AWS SDK path returns `BedrockMantleSigV4AuthProvider`。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:59][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:59][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:169]
6. SigV4 provider 的 `apply_auth` 移除 snake_case legacy headers，prepare body，调用 `AwsAuthContext::sign`，再把 signed url/headers/body 写回 request，并禁用 request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:227][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:253][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:254][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:255][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:266][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:267][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:268][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:268]
7. `AwsAuthContext::load` 通过 AWS SDK config 解析 credentials provider 和 region；`AwsAuthContext::sign` 再取 credentials 并调用 `signing::sign_request`。[E: codex-rs/aws-auth/src/lib.rs:110][E: codex-rs/aws-auth/src/lib.rs:111][E: codex-rs/aws-auth/src/lib.rs:112][E: codex-rs/aws-auth/src/lib.rs:113][E: codex-rs/aws-auth/src/lib.rs:159][E: codex-rs/aws-auth/src/lib.rs:168][E: codex-rs/aws-auth/src/lib.rs:169]
8. `sign_request` 将 headers/body 构造成 AWS SigV4 `SignableRequest`，设置 region/service/time，签名后把 instructions apply 到 HTTP request headers。[E: codex-rs/aws-auth/src/signing.rs:17][E: codex-rs/aws-auth/src/signing.rs:24][E: codex-rs/aws-auth/src/signing.rs:34][E: codex-rs/aws-auth/src/signing.rs:38][E: codex-rs/aws-auth/src/signing.rs:45][E: codex-rs/aws-auth/src/signing.rs:46][E: codex-rs/aws-auth/src/signing.rs:47][E: codex-rs/aws-auth/src/signing.rs:51][E: codex-rs/aws-auth/src/signing.rs:62]
9. `merge_configured_model_providers` 对 Bedrock 可合并 `base_url`、command `auth`、`http_headers` 和整组 AWS profile/region；command-auth path 走 configured provider auth 并可配 base URL，非 command-auth path 才走 Bedrock bearer/SigV4 resolution。[E: codex-rs/model-provider-info/src/lib.rs:536][E: codex-rs/model-provider-info/src/lib.rs:537][E: codex-rs/model-provider-info/src/lib.rs:542][E: codex-rs/model-provider-info/src/lib.rs:542][E: codex-rs/model-provider-info/src/lib.rs:550][E: codex-rs/model-provider-info/src/lib.rs:550][E: codex-rs/model-provider-info/src/lib.rs:554][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:97][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:98][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:142]

10. Account state no longer exposes an AWS-vs-Codex credential-source enum；`ProviderAccount::AmazonBedrock` 只报告 `uses_codex_managed_credentials` boolean，command auth 与 AWS SDK/env bearer 都是 false。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:283][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:285]

11. `AmazonBedrockModelProvider::new` 按 `is_amazon_bedrock_runtime()` 选择 `BedrockEndpoint::Runtime` 或 `Mantle`。Runtime 默认 base URL 是 `https://bedrock-runtime.{region}.amazonaws.com/openai/v1`，Mantle 仍用 `bedrock-mantle.{region}.api.aws`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:72][E: codex-rs/model-provider/src/amazon_bedrock/runtime.rs:21][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:162]

12. Runtime 默认 catalog 是 `static_runtime_model_catalog()`：只保留 GPT-5.6 Sol/Terra/Luna，再按 `global.`（priority 0）然后 `us.`（priority 1）展开，因此 picker 优先 global models。Mantle 仍用含 GPT-5.5/5.4 的 `static_model_catalog()`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:185][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:8][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:11][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:25][E: codex-rs/model-provider/src/amazon_bedrock/catalog.rs:21]

## 设计动机与权衡

- `session_id`、`thread_id`、`future_identity_header` 被 header-removal helper 移除，`x-client-request-id` 保留；测试直接覆盖这些 header 行为。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:227][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:232][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:233][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:498][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:502][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:503][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:504][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:509]
- AWS credential provider timeout/provider error 被标记 retryable，配置/签名类错误不 retry；`aws_auth_error_to_auth_error` 把 retryable AWS auth error 映射为 `AuthError::Transient`，否则映射为 `AuthError::Build`。[E: codex-rs/aws-auth/src/lib.rs:173][E: codex-rs/aws-auth/src/lib.rs:177][E: codex-rs/aws-auth/src/lib.rs:183][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:217][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:218][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:221]
- env bearer token path requires a region from config, `AWS_REGION`, or `AWS_DEFAULT_REGION`; managed bearer token auth carries its own region, and AWS SDK auth uses the SDK-resolved context region。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:201][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:202][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:202][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:71][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:74]

## gotcha

- Codex-managed Bedrock API key auth takes precedence over env bearer and AWS SDK auth; `AWS_BEARER_TOKEN_BEDROCK` takes precedence over AWS SDK credentials only when no managed auth is present。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:100]
- `region_from_config` 会 trim region 并丢弃空字符串；空白 region 等价于未配置。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:35][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:38][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:39][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:40]
- Bedrock provider validation 禁止 command auth、env_key、experimental bearer 和 requires_openai_auth；不要按 generic OpenAI-compatible provider 方式配置 Bedrock。[E: codex-rs/model-provider-info/src/lib.rs:192][E: codex-rs/model-provider-info/src/lib.rs:204][E: codex-rs/model-provider-info/src/lib.rs:199][E: codex-rs/model-provider-info/src/lib.rs:202][E: codex-rs/model-provider-info/src/lib.rs:207]

## Sources

- codex-rs/model-provider-info/src/lib.rs
- codex-rs/model-provider/src/provider.rs
- codex-rs/model-provider/src/amazon_bedrock/mod.rs
- codex-rs/model-provider/src/amazon_bedrock/auth.rs
- codex-rs/model-provider/src/amazon_bedrock/mantle.rs
- codex-rs/model-provider/src/amazon_bedrock/runtime.rs
- codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs
- codex-rs/model-provider/src/amazon_bedrock/catalog.rs
- codex-rs/aws-auth/src/lib.rs
- codex-rs/aws-auth/src/config.rs
- codex-rs/aws-auth/src/signing.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.auth-layer`
- `subsys.providers.retry-errors`
- `config.model-provider`
