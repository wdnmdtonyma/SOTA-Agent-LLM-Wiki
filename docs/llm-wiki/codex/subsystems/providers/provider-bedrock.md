---
id: subsys.providers.provider-bedrock
title: Amazon Bedrock provider
kind: subsystem
tier: T2
source: [codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/amazon_bedrock/mod.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs, codex-rs/model-provider/src/amazon_bedrock/mantle.rs, codex-rs/aws-auth/src/lib.rs, codex-rs/aws-auth/src/config.rs, codex-rs/aws-auth/src/signing.rs]
symbols: [AmazonBedrockModelProvider, create_amazon_bedrock_provider, resolve_provider_auth, resolve_region, base_url, AwsAuthContext, AwsAuthConfig, sign_request]
related: [subsys.providers.overview, subsys.providers.auth-layer, subsys.providers.retry-errors, config.model-provider]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Amazon Bedrock provider 是专用 runtime provider：provider info 携带 AWS auth config，runtime 按 region 生成 Bedrock Mantle OpenAI-compatible base URL，并在 auth 层选择 `AWS_BEARER_TOKEN_BEDROCK` bearer 或 AWS SDK/SigV4 签名。[E: codex-rs/model-provider-info/src/lib.rs:97][E: codex-rs/model-provider-info/src/lib.rs:133][E: codex-rs/model-provider-info/src/lib.rs:140][E: codex-rs/model-provider/src/provider.rs:59][E: codex-rs/model-provider/src/provider.rs:65][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:41][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:31][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:40][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:123]

## 能回答的问题

- Bedrock provider 的 base URL 为什么由 region 生成？
- `AWS_BEARER_TOKEN_BEDROCK` 和 AWS SDK credentials 谁优先？
- SigV4 签名前为什么移除 legacy `session_id` header？
- Bedrock provider config 允许覆盖哪些字段？
- 哪些 Bedrock Mantle regions 被源码接受？

## 职责边界

Bedrock provider 只处理 Amazon Bedrock Mantle OpenAI-compatible Responses endpoint。它不使用 OpenAI `AuthManager`，也不允许 generic env_key/command auth/requires_openai_auth 与 aws config 同时存在。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:19][E: codex-rs/model-provider-info/src/lib.rs:364][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:36][E: codex-rs/model-provider-info/src/lib.rs:154][E: codex-rs/model-provider-info/src/lib.rs:160][E: codex-rs/model-provider-info/src/lib.rs:163][E: codex-rs/model-provider-info/src/lib.rs:168]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: Bedrock provider default info、validation、configured AWS override merge。[E: codex-rs/model-provider-info/src/lib.rs:37][E: codex-rs/model-provider-info/src/lib.rs:352][E: codex-rs/model-provider-info/src/lib.rs:145][E: codex-rs/model-provider-info/src/lib.rs:429]
- `codex-rs/model-provider/src/amazon_bedrock/mod.rs`: `AmazonBedrockModelProvider` trait impl、runtime base URL/auth resolution。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:19][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:21][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:41][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:47][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:48]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: bearer-vs-SigV4 auth method、legacy header removal、AuthProvider impl。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:22][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:30][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:94][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:113]
- `codex-rs/aws-auth/src/lib.rs`: AWS auth context、request-to-sign model、retryability classification。[E: codex-rs/aws-auth/src/lib.rs:13][E: codex-rs/aws-auth/src/lib.rs:21][E: codex-rs/aws-auth/src/lib.rs:79][E: codex-rs/aws-auth/src/lib.rs:114]

## 数据模型

- `create_amazon_bedrock_provider` sets name `Amazon Bedrock`, default base URL `https://bedrock-mantle.us-east-1.api.aws/v1`, `aws` default profile/region None, wire API Responses, `requires_openai_auth = false`, `supports_websockets = false`；runtime helper `base_url(region)` 才按 region 生成 Mantle URL。[E: codex-rs/model-provider-info/src/lib.rs:37][E: codex-rs/model-provider-info/src/lib.rs:39][E: codex-rs/model-provider-info/src/lib.rs:354][E: codex-rs/model-provider-info/src/lib.rs:355][E: codex-rs/model-provider-info/src/lib.rs:360][E: codex-rs/model-provider-info/src/lib.rs:361][E: codex-rs/model-provider-info/src/lib.rs:362][E: codex-rs/model-provider-info/src/lib.rs:364][E: codex-rs/model-provider-info/src/lib.rs:372][E: codex-rs/model-provider-info/src/lib.rs:373][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:38][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:40]
- `ModelProviderAwsAuthInfo` 包含 optional profile 和 optional region。[E: codex-rs/model-provider-info/src/lib.rs:133][E: codex-rs/model-provider-info/src/lib.rs:137][E: codex-rs/model-provider-info/src/lib.rs:140]
- `AwsAuthConfig` 包含 profile、region、service；Bedrock Mantle service name 是 `bedrock-mantle`。[E: codex-rs/aws-auth/src/lib.rs:15][E: codex-rs/aws-auth/src/lib.rs:16][E: codex-rs/aws-auth/src/lib.rs:17][E: codex-rs/aws-auth/src/lib.rs:18][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:6]
- `AwsRequestToSign` 包含 method、url、headers、body；`AwsSignedRequest` 返回 signed url 和 headers。[E: codex-rs/aws-auth/src/lib.rs:23][E: codex-rs/aws-auth/src/lib.rs:24][E: codex-rs/aws-auth/src/lib.rs:25][E: codex-rs/aws-auth/src/lib.rs:26][E: codex-rs/aws-auth/src/lib.rs:27][E: codex-rs/aws-auth/src/lib.rs:32][E: codex-rs/aws-auth/src/lib.rs:33][E: codex-rs/aws-auth/src/lib.rs:34]

## 控制流

1. `create_model_provider` 发现 provider 是 Bedrock 后，取 `provider_info.aws` 并构造 `AmazonBedrockModelProvider`；Bedrock 不走 `ConfiguredModelProvider`。[E: codex-rs/model-provider/src/provider.rs:58][E: codex-rs/model-provider/src/provider.rs:59][E: codex-rs/model-provider/src/provider.rs:65][E: codex-rs/model-provider/src/provider.rs:66][E: codex-rs/model-provider/src/provider.rs:69][E: codex-rs/model-provider/src/provider.rs:72]
2. `AmazonBedrockModelProvider::api_provider` 调用 `resolve_region`，clone provider info，把 base_url 设置为 `base_url(&region)`，再调用 `to_api_provider(None)`。[E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:40][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:41][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:42][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/mod.rs:44]
3. `base_url` 只接受 `BEDROCK_MANTLE_SUPPORTED_REGIONS` 中的 region，否则返回 fatal error。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:7][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:38][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:39][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:42]
4. `resolve_auth_method` 先读取非空 `AWS_BEARER_TOKEN_BEDROCK`，非空则要求 configured region；没有 bearer token 时加载 AWS SDK auth context。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:31][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:65][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:69][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:72][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:79][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:36][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:40]
5. bearer token path 返回 `BearerAuthProvider`；AWS SDK path 返回 `BedrockMantleSigV4AuthProvider`。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:46][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:47][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:53]
6. SigV4 provider 的 `apply_auth` 移除 legacy `session_id` header，prepare body，调用 `AwsAuthContext::sign`，再把 signed url/headers/body 写回 request，并禁用 request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:117][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:119][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:120][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:123][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:132][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:133][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:134][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:135]
7. `AwsAuthContext::load` 通过 AWS SDK config 解析 credentials provider 和 region；`AwsAuthContext::sign` 再取 credentials 并调用 `signing::sign_request`。[E: codex-rs/aws-auth/src/lib.rs:80][E: codex-rs/aws-auth/src/lib.rs:81][E: codex-rs/aws-auth/src/lib.rs:82][E: codex-rs/aws-auth/src/lib.rs:83][E: codex-rs/aws-auth/src/lib.rs:100][E: codex-rs/aws-auth/src/lib.rs:109][E: codex-rs/aws-auth/src/lib.rs:110]
8. `sign_request` 将 headers/body 构造成 AWS SigV4 `SignableRequest`，设置 region/service/time，签名后把 instructions apply 到 HTTP request headers。[E: codex-rs/aws-auth/src/signing.rs:17][E: codex-rs/aws-auth/src/signing.rs:24][E: codex-rs/aws-auth/src/signing.rs:34][E: codex-rs/aws-auth/src/signing.rs:38][E: codex-rs/aws-auth/src/signing.rs:45][E: codex-rs/aws-auth/src/signing.rs:46][E: codex-rs/aws-auth/src/signing.rs:47][E: codex-rs/aws-auth/src/signing.rs:51][E: codex-rs/aws-auth/src/signing.rs:62]
9. `merge_configured_model_providers` 对 Bedrock 只合并 configured `aws.profile` 和 `aws.region`；这意味着 Bedrock built-in base URL/auth shape 仍由源码固定。[E: codex-rs/model-provider-info/src/lib.rs:439][E: codex-rs/model-provider-info/src/lib.rs:441][E: codex-rs/model-provider-info/src/lib.rs:444][E: codex-rs/model-provider-info/src/lib.rs:452][E: codex-rs/model-provider-info/src/lib.rs:456][I]

## 设计动机与权衡

- `session_id` 被移除是因为 Mantle front door 不保留该 legacy OpenAI header，签它会让 richer Codex agent request fail；这个说明写在 auth helper 附近并由测试覆盖。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:95][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:96][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:97][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:201][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:203]
- AWS credential provider timeout/provider error 被标记 retryable，配置/签名类错误不 retry；`aws_auth_error_to_auth_error` 把 retryable AWS auth error 映射为 `AuthError::Transient`，否则映射为 `AuthError::Build`。[E: codex-rs/aws-auth/src/lib.rs:114][E: codex-rs/aws-auth/src/lib.rs:118][E: codex-rs/aws-auth/src/lib.rs:123][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:86][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:90]
- bearer token path 需要 configured region；源码在缺 region 时返回 fatal error，无法从 bearer token path 获取 AWS SDK region 是基于 `EnvBearerToken { token, region }` 数据形状的推断。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:58][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:60][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:72][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:79][I]

## gotcha

- `AWS_BEARER_TOKEN_BEDROCK` 只要非空就优先于 AWS SDK credentials；这会绕过 SigV4 provider path。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:31][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:65][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:69]
- `region_from_config` 会 trim region 并丢弃空字符串；空白 region 等价于未配置。[E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:30][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/mantle.rs:34]
- Bedrock provider validation 禁止 command auth、env_key、experimental bearer 和 requires_openai_auth；不要按 generic OpenAI-compatible provider 方式配置 Bedrock。[E: codex-rs/model-provider-info/src/lib.rs:154][E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:160][E: codex-rs/model-provider-info/src/lib.rs:163][E: codex-rs/model-provider-info/src/lib.rs:168]

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
