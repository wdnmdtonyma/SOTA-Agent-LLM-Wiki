---
id: subsys.providers.auth-layer
title: Provider auth layer
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/auth.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider/src/bearer_auth_provider.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs]
symbols: [AuthProvider, SharedAuthProvider, AuthError, auth_header_telemetry, auth_manager_for_provider, resolve_provider_auth, auth_provider_from_auth, auth_provider_from_auth_manager, BearerAuthProvider, AgentIdentityAuthProvider, HeaderAuthProvider, AuthManagerAuthProvider, BedrockMantleSigV4AuthProvider]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.provider-bedrock, subsys.providers.http-client, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Provider auth layer turns provider/login state into request mutation: generic providers usually attach header-only auth, AgentIdentity uses a signed authorization header, and Amazon Bedrock can sign the prepared request with AWS SigV4。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/model-provider/src/auth.rs:85][E: codex-rs/model-provider/src/auth.rs:88][E: codex-rs/model-provider/src/auth.rs:100][E: codex-rs/model-provider/src/auth.rs:179][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:137][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:152][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:155]

## 能回答的问题

- `AuthProvider` 是同步加 headers 还是异步改 request？
- Provider API key、experimental bearer token、CodexAuth token 的优先级是什么？
- ChatGPT account id 和 FedRAMP headers 从哪里来？
- command auth provider 如何影响 `AuthManager`？
- Bedrock SigV4 auth 为什么要 prepare body 后再签名？

## 职责边界

`codex-api::AuthProvider` is the endpoint auth abstraction; `model-provider` selects the concrete implementation from provider config and login state; endpoint request construction and transport execution are outside this node's cited source set。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:55][E: codex-rs/model-provider/src/auth.rs:179][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/auth.rs`: AuthProvider trait, AuthError mapping, telemetry helper。[E: codex-rs/codex-api/src/auth.rs:10][E: codex-rs/codex-api/src/auth.rs:17][E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:77][E: codex-rs/codex-api/src/auth.rs:82]
- `codex-rs/model-provider/src/auth.rs`: auth manager selection, provider auth resolution, AgentIdentity/static-header/current-manager auth providers, and CodexAuth-to-provider conversion。[E: codex-rs/model-provider/src/auth.rs:81][E: codex-rs/model-provider/src/auth.rs:85][E: codex-rs/model-provider/src/auth.rs:113][E: codex-rs/model-provider/src/auth.rs:124][E: codex-rs/model-provider/src/auth.rs:169][E: codex-rs/model-provider/src/auth.rs:179][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:305]
- `codex-rs/model-provider/src/bearer_auth_provider.rs`: bearer/account/FedRAMP header injection。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:7][E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: Bedrock managed/env bearer token shortcut and SigV4 auth provider。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:27][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:128]

## 数据模型

- `AuthError` has Build and Transient variants and converts Build to `TransportError::Build`, Transient to `TransportError::Network`。[E: codex-rs/codex-api/src/auth.rs:10][E: codex-rs/codex-api/src/auth.rs:12][E: codex-rs/codex-api/src/auth.rs:14][E: codex-rs/codex-api/src/auth.rs:17][E: codex-rs/codex-api/src/auth.rs:19][E: codex-rs/codex-api/src/auth.rs:20][E: codex-rs/codex-api/src/auth.rs:21]
- `AuthProvider` requires `add_auth_headers(&mut HeaderMap)` and provides async `apply_auth(Request)` default implementation that mutates headers and returns request。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:35][E: codex-rs/codex-api/src/auth.rs:55][E: codex-rs/codex-api/src/auth.rs:57][E: codex-rs/codex-api/src/auth.rs:58][E: codex-rs/codex-api/src/auth.rs:59]
- `BearerAuthProvider` stores token、account_id、is_fedramp_account and adds Authorization/ChatGPT-Account-ID/X-OpenAI-Fedramp headers when those values are present。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:7][E: codex-rs/model-provider/src/bearer_auth_provider.rs:8][E: codex-rs/model-provider/src/bearer_auth_provider.rs:9][E: codex-rs/model-provider/src/bearer_auth_provider.rs:10][E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:41][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43][E: codex-rs/model-provider/src/bearer_auth_provider.rs:44]
- `AgentIdentityAuthProvider` builds an authorization header from the agent identity record and also attaches ChatGPT account/FedRAMP headers when available.[E: codex-rs/model-provider/src/auth.rs:81][E: codex-rs/model-provider/src/auth.rs:85][E: codex-rs/model-provider/src/auth.rs:88][E: codex-rs/model-provider/src/auth.rs:100][E: codex-rs/model-provider/src/auth.rs:103][E: codex-rs/model-provider/src/auth.rs:107]
- `HeaderAuthProvider` copies a predefined `AuthHeaders` map verbatim；`AuthManagerAuthProvider` instead reads the current managed auth snapshot on every request, follows token refresh only while account id、ChatGPT user id、workspace membership still match the startup identity anchor。[E: codex-rs/model-provider/src/auth.rs:113][E: codex-rs/model-provider/src/auth.rs:118][E: codex-rs/model-provider/src/auth.rs:120][E: codex-rs/model-provider/src/auth.rs:124][E: codex-rs/model-provider/src/auth.rs:131][E: codex-rs/model-provider/src/auth.rs:133][E: codex-rs/model-provider/src/auth.rs:143][E: codex-rs/model-provider/src/auth.rs:149]
- `AuthHeaderTelemetry` records whether Authorization is attached and which header name was found; telemetry checks only the Authorization header。[E: codex-rs/codex-api/src/auth.rs:77][E: codex-rs/codex-api/src/auth.rs:78][E: codex-rs/codex-api/src/auth.rs:79][E: codex-rs/codex-api/src/auth.rs:82][E: codex-rs/codex-api/src/auth.rs:84][E: codex-rs/codex-api/src/auth.rs:86][E: codex-rs/codex-api/src/auth.rs:88][E: codex-rs/codex-api/src/auth.rs:89][E: codex-rs/codex-api/src/auth.rs:90]

## 控制流

1. `auth_manager_for_provider` returns external-bearer-only auth manager when provider config has `auth`, otherwise returns the base auth manager.[E: codex-rs/model-provider/src/auth.rs:169][E: codex-rs/model-provider/src/auth.rs:169][E: codex-rs/model-provider/src/auth.rs:173][E: codex-rs/model-provider/src/auth.rs:174][E: codex-rs/model-provider/src/auth.rs:175]
2. `resolve_provider_auth` rejects Bedrock API key auth for non-Bedrock providers, then chooses provider `env_key` API key, experimental bearer token, CodexAuth-derived provider, or unauthenticated provider.[E: codex-rs/model-provider/src/auth.rs:179][E: codex-rs/model-provider/src/auth.rs:183][E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:193][E: codex-rs/model-provider/src/auth.rs:195][E: codex-rs/model-provider/src/auth.rs:267][E: codex-rs/model-provider/src/auth.rs:270][E: codex-rs/model-provider/src/auth.rs:274]
3. `auth_provider_from_auth` maps AgentIdentity to its signed provider、Headers to `HeaderAuthProvider`, and maps API key、ChatGPT token variants、PersonalAccessToken to `BearerAuthProvider`。[E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:284][E: codex-rs/model-provider/src/auth.rs:287][E: codex-rs/model-provider/src/auth.rs:289][E: codex-rs/model-provider/src/auth.rs:292]
4. `auth_provider_from_auth_manager` wraps a manager plus expected identity；requests can see refreshed credentials for that identity, but an account/user/workspace switch yields no auth headers until account-scoped state is rebuilt。[E: codex-rs/model-provider/src/auth.rs:124][E: codex-rs/model-provider/src/auth.rs:131][E: codex-rs/model-provider/src/auth.rs:147][E: codex-rs/model-provider/src/auth.rs:305][E: codex-rs/model-provider/src/auth.rs:309]
5. Bedrock `resolve_provider_auth` resolves auth method in order: managed Bedrock API key, env bearer token, then AWS SDK context; bearer methods yield `BearerAuthProvider`, AWS SDK yields `BedrockMantleSigV4AuthProvider`。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:33][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:44][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:49][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:60][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:61][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:67]
6. Bedrock SigV4 `apply_auth` removes legacy snake_case headers, prepares body for send, signs method/url/headers/body, replaces URL/headers/body with signed values, and disables request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:111][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:116][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:137][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:139][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:140][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:143][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:152][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:153][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:154][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:155]

## 设计动机与权衡

- `add_auth_headers` exists for simple header-only auth and telemetry, while `apply_auth` allows request-body-aware auth such as SigV4; Bedrock overrides `apply_auth` and leaves `add_auth_headers` empty。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:35][E: codex-rs/codex-api/src/auth.rs:55][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:160][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:161][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:163][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:164][I]
- Bedrock removes snake_case legacy OpenAI compatibility headers before signing; the test asserts `session_id`、`thread_id`、`future_identity_header` are removed while `x-client-request-id` remains。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:116][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:118][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:139][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:284][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:286][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:287][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:288][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:293]

## gotcha

- The provider `api_key()?` branch wins over CodexAuth token; API key branch creates a bearer provider with no account id while the CodexAuth bearer branch uses `auth.get_account_id()`。[E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:267][E: codex-rs/model-provider/src/auth.rs:270][E: codex-rs/model-provider/src/auth.rs:292][E: codex-rs/model-provider/src/auth.rs:294]
- Headers auth is not converted to `Authorization: Bearer ...`; its already-parsed map is extended into the request as-is。[E: codex-rs/model-provider/src/auth.rs:113][E: codex-rs/model-provider/src/auth.rs:118][E: codex-rs/model-provider/src/auth.rs:120][E: codex-rs/model-provider/src/auth.rs:287]
- `auth_header_telemetry` uses the auth provider to add headers into a temporary map and reports only Authorization presence/name; it does not report account id or FedRAMP headers。[E: codex-rs/codex-api/src/auth.rs:82][E: codex-rs/codex-api/src/auth.rs:83][E: codex-rs/codex-api/src/auth.rs:84][E: codex-rs/codex-api/src/auth.rs:86][E: codex-rs/codex-api/src/auth.rs:88][E: codex-rs/codex-api/src/auth.rs:89][E: codex-rs/codex-api/src/auth.rs:90]
- `AuthError::Transient` becomes `TransportError::Network`; retry behavior after this mapping is outside this node's cited source set。[E: codex-rs/codex-api/src/auth.rs:21][I]

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
