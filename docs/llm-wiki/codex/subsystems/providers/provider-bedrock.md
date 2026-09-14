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
updated: 3abbf9fe2c
---

> Amazon Bedrock provider 是专用 runtime provider：provider info 携带 AWS auth config，runtime 按 region 生成 Bedrock Mantle 或 Runtime OpenAI-compatible base URL，并在 `auth_source` 里按 command auth、configured AWS profile、Codex-managed Bedrock API key / access keys、`AWS_BEARER_TOKEN_BEDROCK`、env AWS credentials、AWS SDK/SigV4 的顺序选择认证方式。[E: codex-rs/model-provider-info/src/lib.rs:160][E: codex-rs/model-provider/src/provider.rs:324][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:166][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:53][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:93]

## 能回答的问题

- Bedrock provider 的 base URL 为什么由 region 生成？
- `AWS_BEARER_TOKEN_BEDROCK` 和 AWS SDK credentials 谁优先？
- SigV4 签名前为什么移除 legacy `session_id` header？
- Bedrock provider config 允许覆盖哪些字段？
- 哪些 Bedrock Mantle regions 被源码接受？
- Amazon Bedrock Runtime catalog 为什么把 global 模型排在 US cross-region 前面？

## 职责边界

Bedrock provider 处理 Amazon Bedrock Mantle 与 Runtime 两条 OpenAI-compatible Responses endpoint。它不走 generic `ConfiguredModelProvider`；`auth_manager()` 只在 command / managed API key / managed access keys 路径返回 manager，env bearer 与 AWS SDK/SigV4 不暴露它。Provider info validation 也不允许 generic env_key/command auth/requires_openai_auth 与 aws config 同时存在。[E: codex-rs/model-provider/src/provider.rs:324][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:70][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:245][E: codex-rs/model-provider-info/src/lib.rs:246][E: codex-rs/model-provider-info/src/lib.rs:252][E: codex-rs/model-provider-info/src/lib.rs:257]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: Bedrock provider default info、validation、configured AWS override merge。[E: codex-rs/model-provider-info/src/lib.rs:45][E: codex-rs/model-provider-info/src/lib.rs:501][E: codex-rs/model-provider-info/src/lib.rs:246][E: codex-rs/model-provider-info/src/lib.rs:629][E: codex-rs/model-provider-info/src/lib.rs:634]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: `AmazonBedrockModelProvider` trait impl、managed auth gating、runtime base URL/auth resolution。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:70][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:121][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:166][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:172][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:198]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: managed/env bearer-vs-SigV4 auth method、legacy header removal、AuthProvider impl。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:53][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:93][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:281][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:308]
- `codex-rs/aws-auth/src/lib.rs`: AWS auth context、request-to-sign model、retryability classification。[E: codex-rs/aws-auth/src/lib.rs:21][E: codex-rs/aws-auth/src/lib.rs:99][E: codex-rs/aws-auth/src/lib.rs:159][E: codex-rs/aws-auth/src/lib.rs:233]

## 数据模型

- `create_amazon_bedrock_provider` sets name `Amazon Bedrock`，built-in `base_url` 为 `None`，让 runtime 按 region 派生 endpoint；`create_amazon_bedrock_runtime_provider` 复用同一构造再改名为 `Amazon Bedrock Runtime` 并清掉 Mantle client-agent header。[E: codex-rs/model-provider-info/src/lib.rs:501][E: codex-rs/model-provider-info/src/lib.rs:509][E: codex-rs/model-provider-info/src/lib.rs:537][E: codex-rs/model-provider-info/src/lib.rs:541]
- `ModelProviderAwsAuthInfo` 包含 optional profile 和 optional region；env bearer path 的 region fallback 是 configured region、`AWS_REGION`、`AWS_DEFAULT_REGION`。[E: codex-rs/model-provider-info/src/lib.rs:160][E: codex-rs/model-provider-info/src/lib.rs:162][E: codex-rs/model-provider-info/src/lib.rs:164][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:242][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:246]
- `AwsAuthConfig` 包含 profile、region、service；Bedrock Mantle service name 是 `bedrock-mantle`。[E: codex-rs/aws-auth/src/lib.rs:21][E: codex-rs/aws-auth/src/lib.rs:22][E: codex-rs/aws-auth/src/lib.rs:23][E: codex-rs/aws-auth/src/lib.rs:24][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:11]
- `AwsRequestToSign` 包含 method、url、headers、body；`AwsSignedRequest` 返回 signed url 和 headers。[E: codex-rs/aws-auth/src/lib.rs:99][E: codex-rs/aws-auth/src/lib.rs:100][E: codex-rs/aws-auth/src/lib.rs:101][E: codex-rs/aws-auth/src/lib.rs:102][E: codex-rs/aws-auth/src/lib.rs:103][E: codex-rs/aws-auth/src/lib.rs:108][E: codex-rs/aws-auth/src/lib.rs:109][E: codex-rs/aws-auth/src/lib.rs:110]

## 控制流

1. `create_model_provider` 发现 `is_amazon_bedrock()` 后构造 `AmazonBedrockModelProvider`；该 helper 同时匹配 Mantle `Amazon Bedrock` 与 Runtime `Amazon Bedrock Runtime`，二者都不走 `ConfiguredModelProvider`。[E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/provider.rs:324][E: codex-rs/model-provider-info/src/lib.rs:569]
2. `AmazonBedrockModelProvider::api_provider` clone provider info，把 base URL 设置为 `runtime_base_url()`，再调用 `to_api_provider(None)`；`runtime_base_url` 优先返回 configured override，没有 override 才解析 managed/env/AWS auth 所对应的 region。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:166][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:168][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:169][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:172][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:173]
3. `base_url` 只接受 `BEDROCK_MANTLE_SUPPORTED_REGIONS` 中的 region，否则返回 fatal error；URL 形状是 `https://bedrock-mantle.{region}.api.aws/openai/v1`。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:12][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:48][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:50][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:52]
4. `auth_source` 先匹配 command auth 与 configured AWS profile，再匹配 managed Bedrock API key / access keys，然后 `AWS_BEARER_TOKEN_BEDROCK`、env AWS credentials，最后 AWS SDK。`resolve_auth_method` 把该 source 具体化成 bearer 或 SigV4。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:53][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:58][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:72][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:82][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:93]
5. managed/env bearer paths return `BearerAuthProvider`; AWS SDK path returns `BedrockSigV4AuthProvider`。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:196][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:197][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:202][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:203]
6. SigV4 provider 的 `apply_auth` 在 Mantle endpoint 上移除 snake_case legacy headers，prepare body，调用 `AwsAuthContext::sign`，再把 signed url/headers/body 写回 request，并禁用 request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:308][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:310][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:281][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:313][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:315]
7. `AwsAuthContext::load` 通过 AWS SDK config 解析 credentials provider 和 region；`AwsAuthContext::sign` 再取 credentials 并调用 `signing::sign_request`。[E: codex-rs/aws-auth/src/lib.rs:160][E: codex-rs/aws-auth/src/lib.rs:161][E: codex-rs/aws-auth/src/lib.rs:162][E: codex-rs/aws-auth/src/lib.rs:163][E: codex-rs/aws-auth/src/lib.rs:219][E: codex-rs/aws-auth/src/lib.rs:228][E: codex-rs/aws-auth/src/lib.rs:229]
8. `sign_request` 将 headers/body 构造成 AWS SigV4 `SignableRequest`，设置 region/service/time，签名后把 instructions apply 到 HTTP request headers。[E: codex-rs/aws-auth/src/signing.rs:17][E: codex-rs/aws-auth/src/signing.rs:24][E: codex-rs/aws-auth/src/signing.rs:34][E: codex-rs/aws-auth/src/signing.rs:38][E: codex-rs/aws-auth/src/signing.rs:45][E: codex-rs/aws-auth/src/signing.rs:46][E: codex-rs/aws-auth/src/signing.rs:47][E: codex-rs/aws-auth/src/signing.rs:51][E: codex-rs/aws-auth/src/signing.rs:62]
9. `merge_configured_model_providers` 对 Bedrock 可合并 `base_url`、command `auth`、`http_headers` 和整组 AWS profile/region；command-auth path 走 configured provider auth 并可配 base URL，非 command-auth path 才走 Bedrock bearer/SigV4 resolution。[E: codex-rs/model-provider-info/src/lib.rs:629][E: codex-rs/model-provider-info/src/lib.rs:634][E: codex-rs/model-provider-info/src/lib.rs:646][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:58][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:152]

10. Account state no longer exposes an AWS-vs-Codex credential-source enum；`ProviderAccount::AmazonBedrock` 只报告 `uses_codex_managed_credentials` boolean，command auth 与 AWS SDK/env bearer 都是 false。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:323][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:325]

11. `AmazonBedrockModelProvider::new` 按 `is_amazon_bedrock_runtime()` 选择 `BedrockEndpoint::Runtime` 或 `Mantle`。Runtime 默认 base URL 是 `https://bedrock-runtime.{region}.amazonaws.com/openai/v1`，Mantle 仍用 `bedrock-mantle.{region}.api.aws`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:75][E: codex-rs/model-provider/src/amazon_bedrock/runtime.rs:21][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:178]

12. Runtime 默认 catalog 是 `static_runtime_model_catalog()`：只保留 GPT-5.6 Sol/Terra/Luna，再按 `global.`（priority 0）然后 `us.`（priority 1）展开，因此 picker 优先 global models。Mantle 仍用含 GPT-5.5/5.4 的 `static_model_catalog()`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:201][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:9][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:12][E: codex-rs/model-provider/src/amazon_bedrock/runtime_catalog.rs:27][E: codex-rs/model-provider/src/amazon_bedrock/catalog.rs:23]

## 设计动机与权衡

- `session_id`、`thread_id`、`future_identity_header` 被 header-removal helper 移除，`x-client-request-id` 保留；测试直接覆盖这些 header 行为。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:281][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:288][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:575]
- AWS credential provider timeout/provider error 被标记 retryable，配置/签名类错误不 retry；`aws_auth_error_to_auth_error` 把 retryable AWS auth error 映射为 `AuthError::Transient`，否则映射为 `AuthError::Build`。[E: codex-rs/aws-auth/src/lib.rs:233][E: codex-rs/aws-auth/src/lib.rs:247][E: codex-rs/aws-auth/src/lib.rs:253][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:262][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:274][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:277]
- env bearer token path requires a region from config, `AWS_REGION`, or `AWS_DEFAULT_REGION`; managed bearer token auth carries its own region, and AWS SDK auth uses the SDK-resolved context region。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:134][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:142][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:242]

## gotcha

- Codex-managed Bedrock API key / access keys take precedence over env bearer and AWS SDK auth, but lose to command auth and a configured AWS profile; `AWS_BEARER_TOKEN_BEDROCK` takes precedence over AWS SDK credentials only when those earlier sources are absent。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:58][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:72][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:82][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:89]
- `region_from_config` 会 trim region 并丢弃空字符串；空白 region 等价于未配置。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:35][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:38][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:39][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:40]
- Bedrock provider validation 禁止 command auth、env_key、experimental bearer 和 requires_openai_auth；不要按 generic OpenAI-compatible provider 方式配置 Bedrock。[E: codex-rs/model-provider-info/src/lib.rs:225][E: codex-rs/model-provider-info/src/lib.rs:257][E: codex-rs/model-provider-info/src/lib.rs:252][E: codex-rs/model-provider-info/src/lib.rs:255][E: codex-rs/model-provider-info/src/lib.rs:260]

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
