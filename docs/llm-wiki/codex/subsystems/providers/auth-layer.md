---
id: subsys.providers.auth-layer
title: Provider auth layer
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/auth.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider/src/bearer_auth_provider.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs]
symbols: [AuthProvider, SharedAuthProvider, AuthError, auth_header_telemetry, auth_manager_for_provider, bearer_auth_provider_from_auth, BearerAuthProvider, BedrockMantleSigV4AuthProvider]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.provider-bedrock, subsys.providers.http-client, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Provider auth layer turns provider/login state into request mutation: generic providers usually attach bearer-style headers, while Amazon Bedrock can sign the prepared request with AWS SigV4。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/model-provider/src/auth.rs:27][E: codex-rs/model-provider/src/auth.rs:35][E: codex-rs/model-provider/src/auth.rs:43][E: codex-rs/model-provider/src/bearer_auth_provider.rs:25][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:120][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:123][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:124][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:125][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:126][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:127]

## 能回答的问题

- `AuthProvider` 是同步加 headers 还是异步改 request？
- Provider API key、experimental bearer token、CodexAuth token 的优先级是什么？
- ChatGPT account id 和 FedRAMP headers 从哪里来？
- command auth provider 如何影响 `AuthManager`？
- Bedrock SigV4 auth 为什么要 prepare body 后再签名？

## 职责边界

`codex-api::AuthProvider` is the endpoint auth abstraction; `model-provider` selects the concrete implementation from provider config and login state; endpoint request construction and transport execution are outside this node's cited source set。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/model-provider/src/auth.rs:63][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:46][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:53][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/auth.rs`: AuthProvider trait, AuthError mapping, telemetry helper。[E: codex-rs/codex-api/src/auth.rs:9][E: codex-rs/codex-api/src/auth.rs:16][E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:64]
- `codex-rs/model-provider/src/auth.rs`: auth manager selection and provider auth resolution。[E: codex-rs/model-provider/src/auth.rs:13][E: codex-rs/model-provider/src/auth.rs:18][E: codex-rs/model-provider/src/auth.rs:19][E: codex-rs/model-provider/src/auth.rs:23][E: codex-rs/model-provider/src/auth.rs:63]
- `codex-rs/model-provider/src/bearer_auth_provider.rs`: bearer/account/FedRAMP header injection。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:5][E: codex-rs/model-provider/src/bearer_auth_provider.rs:24]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: Bedrock bearer token shortcut and SigV4 auth provider。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:22][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:113]

## 数据模型

- `AuthError` has Build and Transient variants and converts Build to `TransportError::Build`, Transient to `TransportError::Network`。[E: codex-rs/codex-api/src/auth.rs:9][E: codex-rs/codex-api/src/auth.rs:11][E: codex-rs/codex-api/src/auth.rs:13][E: codex-rs/codex-api/src/auth.rs:16][E: codex-rs/codex-api/src/auth.rs:19][E: codex-rs/codex-api/src/auth.rs:20]
- `AuthProvider` requires `add_auth_headers(&mut HeaderMap)` and provides async `apply_auth(Request)` default implementation that mutates headers and returns request。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:35][E: codex-rs/codex-api/src/auth.rs:48][E: codex-rs/codex-api/src/auth.rs:50][E: codex-rs/codex-api/src/auth.rs:51]
- `BearerAuthProvider` stores token、account_id、is_fedramp_account and adds Authorization/ChatGPT-Account-ID/X-OpenAI-Fedramp headers when those values are present。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:8][E: codex-rs/model-provider/src/bearer_auth_provider.rs:9][E: codex-rs/model-provider/src/bearer_auth_provider.rs:10][E: codex-rs/model-provider/src/bearer_auth_provider.rs:25][E: codex-rs/model-provider/src/bearer_auth_provider.rs:28][E: codex-rs/model-provider/src/bearer_auth_provider.rs:30][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:35][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36]
- `AuthHeaderTelemetry` records whether Authorization is attached and which header name was found; telemetry checks only the Authorization header。[E: codex-rs/codex-api/src/auth.rs:59][E: codex-rs/codex-api/src/auth.rs:60][E: codex-rs/codex-api/src/auth.rs:61][E: codex-rs/codex-api/src/auth.rs:64][E: codex-rs/codex-api/src/auth.rs:68][E: codex-rs/codex-api/src/auth.rs:69]

## 控制流

1. `auth_manager_for_provider` returns external-bearer-only auth manager when provider config has `auth`, otherwise returns the base auth manager.[E: codex-rs/model-provider/src/auth.rs:13][E: codex-rs/model-provider/src/auth.rs:17][E: codex-rs/model-provider/src/auth.rs:18][E: codex-rs/model-provider/src/auth.rs:19]
2. `bearer_auth_provider_from_auth` chooses the value returned by `provider.api_key()?` first, then experimental bearer token, then CodexAuth token/account/FedRAMP info, else no token。[E: codex-rs/model-provider/src/auth.rs:27][E: codex-rs/model-provider/src/auth.rs:28][E: codex-rs/model-provider/src/auth.rs:30][E: codex-rs/model-provider/src/auth.rs:35][E: codex-rs/model-provider/src/auth.rs:43][E: codex-rs/model-provider/src/auth.rs:47][E: codex-rs/model-provider/src/auth.rs:48][E: codex-rs/model-provider/src/auth.rs:51][E: codex-rs/model-provider/src/auth.rs:54]
3. `resolve_provider_auth` wraps the selected bearer auth in `Arc<dyn AuthProvider>`。[E: codex-rs/model-provider/src/auth.rs:59][E: codex-rs/model-provider/src/auth.rs:63]
4. Bedrock `resolve_provider_auth` first resolves auth method: non-empty `AWS_BEARER_TOKEN_BEDROCK` yields bearer auth, otherwise AWS SDK context yields SigV4 provider。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:31][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:36][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:40][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:46][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:47][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:52][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:53][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:65][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:69]
5. Bedrock SigV4 `apply_auth` removes legacy `session_id`, prepares body for send, signs method/url/headers/body, replaces URL/headers/body with signed values, and disables request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:23][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:95][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:98][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:117][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:119][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:120][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:123][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:124][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:125][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:126][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:127][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:133][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:134][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:135]

## 设计动机与权衡

- `add_auth_headers` exists for simple header-only auth and telemetry, while `apply_auth` allows request-body-aware auth such as SigV4; Bedrock overrides `apply_auth` and leaves `add_auth_headers` empty。[E: codex-rs/codex-api/src/auth.rs:27][E: codex-rs/codex-api/src/auth.rs:34][E: codex-rs/codex-api/src/auth.rs:42][E: codex-rs/codex-api/src/auth.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:115][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:117][I]
- Bedrock removes `session_id` before signing because Mantle front door does not preserve that legacy OpenAI header for SigV4 verification。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:95][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:96][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:97][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:98][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:119][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:123]

## gotcha

- The `provider.api_key()?` branch wins over CodexAuth token; API key branch sets `account_id: None` while the CodexAuth branch uses `auth.get_account_id()`。[E: codex-rs/model-provider/src/auth.rs:27][E: codex-rs/model-provider/src/auth.rs:28][E: codex-rs/model-provider/src/auth.rs:30][E: codex-rs/model-provider/src/auth.rs:43][E: codex-rs/model-provider/src/auth.rs:47]
- `auth_header_telemetry` uses the auth provider to add headers into a temporary map and reports only Authorization presence/name; it does not report account id or FedRAMP headers。[E: codex-rs/codex-api/src/auth.rs:64][E: codex-rs/codex-api/src/auth.rs:65][E: codex-rs/codex-api/src/auth.rs:66][E: codex-rs/codex-api/src/auth.rs:68][E: codex-rs/codex-api/src/auth.rs:69][E: codex-rs/codex-api/src/auth.rs:72]
- `AuthError::Transient` becomes `TransportError::Network`; retry behavior after this mapping is outside this node's cited source set。[E: codex-rs/codex-api/src/auth.rs:20][I]

## Sources

- codex-rs/codex-api/src/auth.rs
- codex-rs/model-provider/src/auth.rs
- codex-rs/model-provider/src/bearer_auth_provider.rs
- codex-rs/model-provider/src/amazon_bedrock/auth.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.provider-openai`
- `subsys.providers.provider-bedrock`
- `subsys.providers.http-client`
- `subsys.config-auth.auth-flows`
