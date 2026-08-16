---
id: subsys.providers.auth-layer
title: Provider auth layer
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/auth.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider/src/bearer_auth_provider.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs, codex-rs/workload-identity/src/lib.rs, codex-rs/workload-identity/src/exchange.rs, codex-rs/login/src/auth/workload_identity.rs, codex-rs/login/src/auth/manager.rs]
symbols: [AuthProvider, SharedAuthProvider, AuthError, auth_header_telemetry, auth_manager_for_provider, resolve_provider_auth, auth_provider_from_auth, auth_provider_from_auth_manager, BearerAuthProvider, AgentIdentityAuthProvider, HeaderAuthProvider, AuthManagerAuthProvider, BedrockMantleSigV4AuthProvider, WorkloadIdentityConfig, WorkloadIdentityExchange, WorkloadIdentityExternalAuth]
related: [subsys.providers.overview, subsys.providers.provider-openai, subsys.providers.provider-bedrock, subsys.providers.http-client, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Provider auth layer turns provider/login state into request mutation: generic providers usually attach header-only auth, AgentIdentity uses a signed authorization header, and Amazon Bedrock can sign the prepared request with AWS SigV4。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/model-provider/src/auth.rs:84][E: codex-rs/model-provider/src/auth.rs:88][E: codex-rs/model-provider/src/auth.rs:100][E: codex-rs/model-provider/src/auth.rs:177][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:137][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:152][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:154]

## 能回答的问题

- `AuthProvider` 是同步加 headers 还是异步改 request？
- Provider API key、experimental bearer token、CodexAuth token 的优先级是什么？
- ChatGPT account id 和 FedRAMP headers 从哪里来？
- command auth provider 如何影响 `AuthManager`？
- Bedrock SigV4 auth 为什么要 prepare body 后再签名？
- workload identity 怎样从 assertion file 换成 ChatGPT token？

## 职责边界

`codex-api::AuthProvider` is the endpoint auth abstraction; `model-provider` selects the concrete implementation from provider config and login state; endpoint request construction and transport execution are outside this node's cited source set。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:64][E: codex-rs/model-provider/src/auth.rs:177][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/auth.rs`: AuthProvider trait, AuthError mapping, telemetry helper。[E: codex-rs/codex-api/src/auth.rs:10][E: codex-rs/codex-api/src/auth.rs:17][E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:77][E: codex-rs/codex-api/src/auth.rs:82]
- `codex-rs/model-provider/src/auth.rs`: auth manager selection, provider auth resolution, AgentIdentity/static-header/current-manager auth providers, and CodexAuth-to-provider conversion。[E: codex-rs/model-provider/src/auth.rs:78][E: codex-rs/model-provider/src/auth.rs:84][E: codex-rs/model-provider/src/auth.rs:110][E: codex-rs/model-provider/src/auth.rs:122][E: codex-rs/model-provider/src/auth.rs:166][E: codex-rs/model-provider/src/auth.rs:177][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:305]
- `codex-rs/model-provider/src/bearer_auth_provider.rs`: bearer/account/FedRAMP header injection。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:7][E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43]
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`: Bedrock managed/env bearer token shortcut and SigV4 auth provider。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:27][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:126]

## 数据模型

- `AuthError` has Build and Transient variants and converts Build to `TransportError::Build`, Transient to `TransportError::Network`。[E: codex-rs/codex-api/src/auth.rs:10][E: codex-rs/codex-api/src/auth.rs:12][E: codex-rs/codex-api/src/auth.rs:14][E: codex-rs/codex-api/src/auth.rs:17][E: codex-rs/codex-api/src/auth.rs:19][E: codex-rs/codex-api/src/auth.rs:20][E: codex-rs/codex-api/src/auth.rs:21]
- `AuthProvider` requires `add_auth_headers(&mut HeaderMap)` and provides async `apply_auth(Request)` default implementation that first `resolve_auth_headers()` then extends the request。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:35][E: codex-rs/codex-api/src/auth.rs:64][E: codex-rs/codex-api/src/auth.rs:67]
- `BearerAuthProvider` stores token、account_id、is_fedramp_account and adds Authorization/ChatGPT-Account-ID/X-OpenAI-Fedramp headers when those values are present。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:7][E: codex-rs/model-provider/src/bearer_auth_provider.rs:8][E: codex-rs/model-provider/src/bearer_auth_provider.rs:9][E: codex-rs/model-provider/src/bearer_auth_provider.rs:10][E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:41][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43][E: codex-rs/model-provider/src/bearer_auth_provider.rs:44]
- `AgentIdentityAuthProvider` builds an authorization header from the agent identity record and also attaches ChatGPT account/FedRAMP headers when available.[E: codex-rs/model-provider/src/auth.rs:78][E: codex-rs/model-provider/src/auth.rs:84][E: codex-rs/model-provider/src/auth.rs:88][E: codex-rs/model-provider/src/auth.rs:100][E: codex-rs/model-provider/src/auth.rs:102][E: codex-rs/model-provider/src/auth.rs:106]
- `HeaderAuthProvider` copies a predefined `AuthHeaders` map verbatim；`AuthManagerAuthProvider` instead reads the current managed auth snapshot on every request, follows token refresh only while account id、ChatGPT user id、workspace membership still match the startup identity anchor。[E: codex-rs/model-provider/src/auth.rs:110][E: codex-rs/model-provider/src/auth.rs:117][E: codex-rs/model-provider/src/auth.rs:120][E: codex-rs/model-provider/src/auth.rs:122][E: codex-rs/model-provider/src/auth.rs:130][E: codex-rs/model-provider/src/auth.rs:133][E: codex-rs/model-provider/src/auth.rs:143][E: codex-rs/model-provider/src/auth.rs:149]
- `AuthHeaderTelemetry` records whether Authorization is attached and which header name was found; telemetry checks only the Authorization header。[E: codex-rs/codex-api/src/auth.rs:77][E: codex-rs/codex-api/src/auth.rs:77][E: codex-rs/codex-api/src/auth.rs:80][E: codex-rs/codex-api/src/auth.rs:82][E: codex-rs/codex-api/src/auth.rs:84][E: codex-rs/codex-api/src/auth.rs:85][E: codex-rs/codex-api/src/auth.rs:88][E: codex-rs/codex-api/src/auth.rs:89][E: codex-rs/codex-api/src/auth.rs:90]

## 控制流

1. `auth_manager_for_provider` returns external-bearer-only auth manager when provider config has `auth`, otherwise returns the base auth manager.[E: codex-rs/model-provider/src/auth.rs:166][E: codex-rs/model-provider/src/auth.rs:166][E: codex-rs/model-provider/src/auth.rs:173][E: codex-rs/model-provider/src/auth.rs:174][E: codex-rs/model-provider/src/auth.rs:174]
2. `resolve_provider_auth` rejects Bedrock API key auth for non-Bedrock providers, then chooses provider `env_key` API key, experimental bearer token, CodexAuth-derived provider, or unauthenticated provider.[E: codex-rs/model-provider/src/auth.rs:177][E: codex-rs/model-provider/src/auth.rs:181][E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:193][E: codex-rs/model-provider/src/auth.rs:193][E: codex-rs/model-provider/src/auth.rs:267][E: codex-rs/model-provider/src/auth.rs:270][E: codex-rs/model-provider/src/auth.rs:271]
3. `auth_provider_from_auth` maps AgentIdentity to its signed provider、Headers to `HeaderAuthProvider`, and maps API key、ChatGPT token variants、PersonalAccessToken to `BearerAuthProvider`。[E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:287][E: codex-rs/model-provider/src/auth.rs:289][E: codex-rs/model-provider/src/auth.rs:292]
4. `auth_provider_from_auth_manager` wraps a manager plus expected identity；requests can see refreshed credentials for that identity, but an account/user/workspace switch yields no auth headers until account-scoped state is rebuilt。[E: codex-rs/model-provider/src/auth.rs:122][E: codex-rs/model-provider/src/auth.rs:130][E: codex-rs/model-provider/src/auth.rs:144][E: codex-rs/model-provider/src/auth.rs:305][E: codex-rs/model-provider/src/auth.rs:309]
5. Bedrock `resolve_provider_auth` resolves auth method in order: managed Bedrock API key, env bearer token, then AWS SDK context; bearer methods yield `BearerAuthProvider`, AWS SDK yields `BedrockMantleSigV4AuthProvider`。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:49][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:56][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:59][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:59][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:67]
6. Bedrock SigV4 `apply_auth` removes legacy snake_case headers, prepares body for send, signs method/url/headers/body, replaces URL/headers/body with signed values, and disables request compression。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:111][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:113][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:137][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:139][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:140][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:141][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:152][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:153][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:154][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:154]

7. Workload identity 不是独立 provider auth 实现，而是 `AuthManager` 的 process-scoped external ChatGPT auth。`shared_from_auth_config` 调用 `WorkloadIdentityExternalAuth::from_process_config`；任一 `OPENAI_FEDERATION_RULE_ID` / `OPENAI_IDENTITY_TOKEN_FILE` marker 选中后，缺另一项或 login policy 不允许 ChatGPT 会失败而不是回退其它凭证。[E: codex-rs/login/src/auth/manager.rs:2667][E: codex-rs/login/src/auth/manager.rs:2671][E: codex-rs/login/src/auth/workload_identity.rs:127][E: codex-rs/login/src/auth/workload_identity.rs:137][E: codex-rs/login/src/auth/workload_identity.rs:261]

8. `codex-rs/workload-identity` crate 用 JWT bearer grant 把 assertion file 换成短期 access token：assertion 必须是绝对路径且 ≤16 KiB；token URL 只接受 HTTPS 或 loopback HTTP；exchange 单飞缓存，refresh 提前 120s 或 lifetime/2。成功 token 被 `WorkloadIdentityExternalAuth` 校验成 `CodexAuth::from_external_chatgpt_tokens`，随后 generic `resolve_provider_auth` 仍走 ChatGPT bearer path。[E: codex-rs/workload-identity/src/lib.rs:19][E: codex-rs/workload-identity/src/lib.rs:29][E: codex-rs/workload-identity/src/exchange.rs:20][E: codex-rs/workload-identity/src/exchange.rs:224][E: codex-rs/login/src/auth/workload_identity.rs:422]

## 设计动机与权衡

- `add_auth_headers` exists for simple header-only auth and telemetry, while `apply_auth` allows request-body-aware auth such as SigV4; Bedrock overrides `apply_auth` and leaves `add_auth_headers` empty。[E: codex-rs/codex-api/src/auth.rs:30][E: codex-rs/codex-api/src/auth.rs:35][E: codex-rs/codex-api/src/auth.rs:64][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:160][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:160][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:163][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:164][I]
- Bedrock removes snake_case legacy OpenAI compatibility headers before signing; the test asserts `session_id`、`thread_id`、`future_identity_header` are removed while `x-client-request-id` remains。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:113][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:118][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:139][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:282][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:286][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:287][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:288][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:293]

## gotcha

- The provider `api_key()?` branch wins over CodexAuth token; API key branch creates a bearer provider with no account id while the CodexAuth bearer branch uses `auth.get_account_id()`。[E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:267][E: codex-rs/model-provider/src/auth.rs:270][E: codex-rs/model-provider/src/auth.rs:292][E: codex-rs/model-provider/src/auth.rs:293]
- Headers auth is not converted to `Authorization: Bearer ...`; its already-parsed map is extended into the request as-is。[E: codex-rs/model-provider/src/auth.rs:110][E: codex-rs/model-provider/src/auth.rs:117][E: codex-rs/model-provider/src/auth.rs:120][E: codex-rs/model-provider/src/auth.rs:287]
- `auth_header_telemetry` uses the auth provider to add headers into a temporary map and reports only Authorization presence/name; it does not report account id or FedRAMP headers。[E: codex-rs/codex-api/src/auth.rs:82][E: codex-rs/codex-api/src/auth.rs:83][E: codex-rs/codex-api/src/auth.rs:84][E: codex-rs/codex-api/src/auth.rs:85][E: codex-rs/codex-api/src/auth.rs:88][E: codex-rs/codex-api/src/auth.rs:89][E: codex-rs/codex-api/src/auth.rs:90]
- `AuthError::Transient` becomes `TransportError::Network`; retry behavior after this mapping is outside this node's cited source set。[E: codex-rs/codex-api/src/auth.rs:21][I]

## Sources

- codex-rs/codex-api/src/auth.rs
- codex-rs/model-provider/src/auth.rs
- codex-rs/model-provider/src/bearer_auth_provider.rs
- codex-rs/model-provider/src/amazon_bedrock/auth.rs
- codex-rs/workload-identity/src/lib.rs
- codex-rs/workload-identity/src/exchange.rs
- codex-rs/login/src/auth/workload_identity.rs
- codex-rs/login/src/auth/manager.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.provider-openai`
- `subsys.providers.provider-bedrock`
- `subsys.providers.http-client`
- `subsys.config-auth.auth-flows`：login policy 与 workload identity process-session 入口。
