---
id: subsys.providers.provider-openai
title: OpenAI provider
kind: subsystem
tier: T2
source: [codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider/src/bearer_auth_provider.rs]
symbols: [create_openai_provider, OPENAI_PROVIDER_ID]
related: [subsys.providers.overview, subsys.providers.auth-layer, subsys.providers.responses-api, subsys.providers.model-catalog]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> OpenAI built-in provider 的 provider id/name 是 `openai`/`OpenAI`，wire API 是 Responses，默认 base URL 会按 ChatGPT-family auth mode 切到 ChatGPT backend，否则使用 public OpenAI API。[E: codex-rs/model-provider-info/src/lib.rs:35][E: codex-rs/model-provider-info/src/lib.rs:37][E: codex-rs/model-provider-info/src/lib.rs:329][E: codex-rs/model-provider-info/src/lib.rs:331][E: codex-rs/model-provider-info/src/lib.rs:338][E: codex-rs/model-provider-info/src/lib.rs:241][E: codex-rs/model-provider-info/src/lib.rs:245][E: codex-rs/model-provider-info/src/lib.rs:249][E: codex-rs/model-provider-info/src/lib.rs:252]

## 能回答的问题

- OpenAI provider 默认 base URL 怎么选？
- OpenAI provider 为什么 `requires_openai_auth = true`？
- OpenAI-Organization 和 OpenAI-Project header 从哪里来？
- OpenAI provider 与 Azure/custom OpenAI-compatible provider 的边界是什么？
- OpenAI provider 是否支持 websockets？

## 职责边界

本节点只描述 built-in OpenAI provider 的 provider-info/auth 行为；Responses request payload、SSE event parsing 和 HTTP retry 分别由 `subsys.providers.responses-api`、`subsys.providers.sse-streaming`、`subsys.providers.retry-errors` 覆盖。[I]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: OpenAI constants、provider construction、default URL/auth/websocket fields、API provider conversion。[E: codex-rs/model-provider-info/src/lib.rs:35][E: codex-rs/model-provider-info/src/lib.rs:37][E: codex-rs/model-provider-info/src/lib.rs:329][E: codex-rs/model-provider-info/src/lib.rs:361][E: codex-rs/model-provider-info/src/lib.rs:362][E: codex-rs/model-provider-info/src/lib.rs:241]
- `codex-rs/model-provider/src/auth.rs`: OpenAI provider auth 从 env_key、experimental bearer、Codex auth/agent identity 中选择 `SharedAuthProvider`。[E: codex-rs/model-provider-info/src/lib.rs:283][E: codex-rs/model-provider/src/auth.rs:179][E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:193][E: codex-rs/model-provider/src/auth.rs:282]
- `codex-rs/model-provider/src/bearer_auth_provider.rs`: Authorization、ChatGPT account、FedRAMP headers。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43]

## 数据模型

- `create_openai_provider` 创建 `ModelProviderInfo`，name 为 `OpenAI`，base_url 来自参数，wire API 为 Responses。[E: codex-rs/model-provider-info/src/lib.rs:329][E: codex-rs/model-provider-info/src/lib.rs:331][E: codex-rs/model-provider-info/src/lib.rs:332][E: codex-rs/model-provider-info/src/lib.rs:338]
- OpenAI provider static headers 包含 `version`；env headers 映射 `OPENAI_ORGANIZATION` 到 `OpenAI-Organization`，`OPENAI_PROJECT` 到 `OpenAI-Project`。[E: codex-rs/model-provider-info/src/lib.rs:340][E: codex-rs/model-provider-info/src/lib.rs:341][E: codex-rs/model-provider-info/src/lib.rs:345][E: codex-rs/model-provider-info/src/lib.rs:348][E: codex-rs/model-provider-info/src/lib.rs:349][E: codex-rs/model-provider-info/src/lib.rs:351]
- OpenAI provider 设置 `requires_openai_auth = true`、`supports_websockets = true`。[E: codex-rs/model-provider-info/src/lib.rs:361][E: codex-rs/model-provider-info/src/lib.rs:362]
- `BearerAuthProvider` 支持 token、account_id、is_fedramp_account 三个字段，并在 header 中分别表现为 Authorization、ChatGPT-Account-ID、X-OpenAI-Fedramp。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:7][E: codex-rs/model-provider/src/bearer_auth_provider.rs:8][E: codex-rs/model-provider/src/bearer_auth_provider.rs:9][E: codex-rs/model-provider/src/bearer_auth_provider.rs:10][E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:41][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43][E: codex-rs/model-provider/src/bearer_auth_provider.rs:44]

## 控制流

1. built-in registry 把 OpenAI provider 插入 `OPENAI_PROVIDER_ID` key；该 id 是 `openai`。[E: codex-rs/model-provider-info/src/lib.rs:37][E: codex-rs/model-provider-info/src/lib.rs:437][E: codex-rs/model-provider-info/src/lib.rs:445]
2. `to_api_provider` 在 auth mode 是 `Chatgpt`、`ChatgptAuthTokens`、`Headers`、`AgentIdentity` 或 `PersonalAccessToken` 且没有 base_url override 时使用 `https://chatgpt.com/backend-api/codex`。[E: codex-rs/model-provider-info/src/lib.rs:241][E: codex-rs/model-provider-info/src/lib.rs:245][E: codex-rs/model-provider-info/src/lib.rs:246][E: codex-rs/model-provider-info/src/lib.rs:247][E: codex-rs/model-provider-info/src/lib.rs:248][E: codex-rs/model-provider-info/src/lib.rs:249][E: codex-rs/model-provider-info/src/lib.rs:252]
3. `to_api_provider` 在 auth mode 不匹配 ChatGPT-family 且没有 base_url override 时使用 `https://api.openai.com/v1`；如果 provider info 配置了 base_url，则配置值覆盖默认 URL。[E: codex-rs/model-provider-info/src/lib.rs:253][E: codex-rs/model-provider-info/src/lib.rs:254][E: codex-rs/model-provider-info/src/lib.rs:256][E: codex-rs/model-provider-info/src/lib.rs:259]
4. `resolve_provider_auth` 优先使用 provider `env_key` API key，其次 experimental bearer token；否则把 `CodexAuth` 转成对应 auth provider，`AgentIdentity` 走签名 provider，`Headers` 原样扩展预定义 headers，API key/ChatGPT/PAT 走 bearer provider。[E: codex-rs/model-provider/src/auth.rs:179][E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:193][E: codex-rs/model-provider/src/auth.rs:267][E: codex-rs/model-provider/src/auth.rs:270][E: codex-rs/model-provider/src/auth.rs:274][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:284][E: codex-rs/model-provider/src/auth.rs:287][E: codex-rs/model-provider/src/auth.rs:289][E: codex-rs/model-provider/src/auth.rs:292]
5. `BearerAuthProvider::add_auth_headers` 对 token 写 `Authorization: Bearer ...`，对 account id 写 `ChatGPT-Account-ID`，FedRAMP account 写 `X-OpenAI-Fedramp: true`。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:31][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36][E: codex-rs/model-provider/src/bearer_auth_provider.rs:38][E: codex-rs/model-provider/src/bearer_auth_provider.rs:41][E: codex-rs/model-provider/src/bearer_auth_provider.rs:43][E: codex-rs/model-provider/src/bearer_auth_provider.rs:44]

## 设计动机与权衡

- OpenAI provider 的 auth path 支持 public API key、experimental bearer token、static Headers、AgentIdentity 和 ChatGPT/PAT bearer auth；URL 选择依赖 `auth_mode`，auth headers 由 concrete auth provider 决定。[E: codex-rs/model-provider/src/auth.rs:189][E: codex-rs/model-provider/src/auth.rs:267][E: codex-rs/model-provider/src/auth.rs:282][E: codex-rs/model-provider/src/auth.rs:287][E: codex-rs/model-provider-info/src/lib.rs:241][E: codex-rs/model-provider-info/src/lib.rs:247][E: codex-rs/model-provider/src/bearer_auth_provider.rs:31]
- OpenAI provider 设置 `supports_websockets = true`；Amazon Bedrock 和 OSS provider infos 设置 `supports_websockets = false`。[E: codex-rs/model-provider-info/src/lib.rs:362][E: codex-rs/model-provider-info/src/lib.rs:395][E: codex-rs/model-provider-info/src/lib.rs:542]
- OpenAI Organization/Project 走 env header map，而不是 hard-coded auth provider；`to_api_provider` 会调用 `build_header_map` 并把 headers 写入 `ApiProvider`。[E: codex-rs/model-provider-info/src/lib.rs:345][E: codex-rs/model-provider-info/src/lib.rs:348][E: codex-rs/model-provider-info/src/lib.rs:351][E: codex-rs/model-provider-info/src/lib.rs:261][E: codex-rs/model-provider-info/src/lib.rs:274]

## gotcha

- `OpenAI` provider 的 default base URL 不是单个固定 URL；它取决于 `AuthMode::Chatgpt | ChatgptAuthTokens | Headers | AgentIdentity | PersonalAccessToken` 和 base_url override。[E: codex-rs/model-provider-info/src/lib.rs:241][E: codex-rs/model-provider-info/src/lib.rs:245][E: codex-rs/model-provider-info/src/lib.rs:247][E: codex-rs/model-provider-info/src/lib.rs:249][E: codex-rs/model-provider-info/src/lib.rs:256][E: codex-rs/model-provider-info/src/lib.rs:259]
- OpenAI built-in default static header 是 `version`；OSS provider constructor 的 `http_headers` 为 `None`，不会自动继承 OpenAI built-in header。[E: codex-rs/model-provider-info/src/lib.rs:329][E: codex-rs/model-provider-info/src/lib.rs:340][E: codex-rs/model-provider-info/src/lib.rs:535]
- `is_openai()` 只检查 provider name 是否等于 `OpenAI`；name 不同但 base_url 指向 OpenAI-compatible endpoint 的 provider 不会被这个 helper 当作 OpenAI。[E: codex-rs/model-provider-info/src/lib.rs:399][E: codex-rs/model-provider-info/src/lib.rs:400]

## Sources

- codex-rs/model-provider-info/src/lib.rs
- codex-rs/model-provider/src/auth.rs
- codex-rs/model-provider/src/bearer_auth_provider.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.auth-layer`
- `subsys.providers.responses-api`
- `subsys.providers.model-catalog`
