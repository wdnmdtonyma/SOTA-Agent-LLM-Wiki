---
id: subsys.providers.provider-openai
title: OpenAI provider
kind: subsystem
tier: T2
source: [codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider/src/bearer_auth_provider.rs]
symbols: [create_openai_provider, OPENAI_PROVIDER_ID, OPENAI_PROVIDER_NAME, ModelProviderInfo, bearer_auth_provider_from_auth, BearerAuthProvider]
related: [subsys.providers.overview, subsys.providers.auth-layer, subsys.providers.responses-api, subsys.providers.model-catalog]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> OpenAI built-in provider 的 provider id/name 是 `openai`/`OpenAI`，wire API 是 Responses，默认 base URL 会按 ChatGPT-family auth mode 切到 ChatGPT backend，否则使用 public OpenAI API。[E: codex-rs/model-provider-info/src/lib.rs:36][E: codex-rs/model-provider-info/src/lib.rs:315][E: codex-rs/model-provider-info/src/lib.rs:322][E: codex-rs/model-provider-info/src/lib.rs:232][E: codex-rs/model-provider-info/src/lib.rs:234][E: codex-rs/model-provider-info/src/lib.rs:236][E: codex-rs/model-provider-info/src/lib.rs:238]

## 能回答的问题

- OpenAI provider 默认 base URL 怎么选？
- OpenAI provider 为什么 `requires_openai_auth = true`？
- OpenAI-Organization 和 OpenAI-Project header 从哪里来？
- OpenAI provider 与 Azure/custom OpenAI-compatible provider 的边界是什么？
- OpenAI provider 是否支持 websockets？

## 职责边界

本节点只描述 built-in OpenAI provider 的 provider-info/auth 行为；Responses request payload、SSE event parsing 和 HTTP retry 分别由 `subsys.providers.responses-api`、`subsys.providers.sse-streaming`、`subsys.providers.retry-errors` 覆盖。[I]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: OpenAI constants、provider construction、default URL/auth/websocket fields、API provider conversion。[E: codex-rs/model-provider-info/src/lib.rs:36][E: codex-rs/model-provider-info/src/lib.rs:313][E: codex-rs/model-provider-info/src/lib.rs:345][E: codex-rs/model-provider-info/src/lib.rs:346][E: codex-rs/model-provider-info/src/lib.rs:231]
- `codex-rs/model-provider/src/auth.rs`: OpenAI provider auth 从 env_key、experimental bearer、Codex auth 中选择 bearer auth provider。[E: codex-rs/model-provider-info/src/lib.rs:267][E: codex-rs/model-provider/src/auth.rs:27][E: codex-rs/model-provider/src/auth.rs:35][E: codex-rs/model-provider/src/auth.rs:43]
- `codex-rs/model-provider/src/bearer_auth_provider.rs`: Authorization、ChatGPT account、FedRAMP headers。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:25][E: codex-rs/model-provider/src/bearer_auth_provider.rs:30][E: codex-rs/model-provider/src/bearer_auth_provider.rs:35]

## 数据模型

- `create_openai_provider` 创建 `ModelProviderInfo`，name 为 `OpenAI`，base_url 来自参数，wire API 为 Responses。[E: codex-rs/model-provider-info/src/lib.rs:313][E: codex-rs/model-provider-info/src/lib.rs:315][E: codex-rs/model-provider-info/src/lib.rs:316][E: codex-rs/model-provider-info/src/lib.rs:322]
- OpenAI provider static headers 包含 `version`；env headers 映射 `OPENAI_ORGANIZATION` 到 `OpenAI-Organization`，`OPENAI_PROJECT` 到 `OpenAI-Project`。[E: codex-rs/model-provider-info/src/lib.rs:324][E: codex-rs/model-provider-info/src/lib.rs:325][E: codex-rs/model-provider-info/src/lib.rs:329][E: codex-rs/model-provider-info/src/lib.rs:332][E: codex-rs/model-provider-info/src/lib.rs:333][E: codex-rs/model-provider-info/src/lib.rs:335]
- OpenAI provider 设置 `requires_openai_auth = true`、`supports_websockets = true`。[E: codex-rs/model-provider-info/src/lib.rs:345][E: codex-rs/model-provider-info/src/lib.rs:346]
- `BearerAuthProvider` 支持 token、account_id、is_fedramp_account 三个字段，并在 header 中分别表现为 Authorization、ChatGPT-Account-ID、X-OpenAI-Fedramp。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:8][E: codex-rs/model-provider/src/bearer_auth_provider.rs:9][E: codex-rs/model-provider/src/bearer_auth_provider.rs:10][E: codex-rs/model-provider/src/bearer_auth_provider.rs:25][E: codex-rs/model-provider/src/bearer_auth_provider.rs:28][E: codex-rs/model-provider/src/bearer_auth_provider.rs:30][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:35][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36]

## 控制流

1. built-in registry 把 OpenAI provider 插入 `OPENAI_PROVIDER_ID` key；该 id 是 `openai`。[E: codex-rs/model-provider-info/src/lib.rs:36][E: codex-rs/model-provider-info/src/lib.rs:413]
2. `to_api_provider` 在 auth mode 是 `Chatgpt`、`ChatgptAuthTokens` 或 `AgentIdentity` 且没有 base_url override 时使用 `https://chatgpt.com/backend-api/codex`。[E: codex-rs/model-provider-info/src/lib.rs:231][E: codex-rs/model-provider-info/src/lib.rs:234][E: codex-rs/model-provider-info/src/lib.rs:236][E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:243]
3. `to_api_provider` 在 auth mode 不匹配 `Chatgpt | ChatgptAuthTokens | AgentIdentity` 且没有 base_url override 时使用 `https://api.openai.com/v1`。[E: codex-rs/model-provider-info/src/lib.rs:232][E: codex-rs/model-provider-info/src/lib.rs:234][E: codex-rs/model-provider-info/src/lib.rs:238][E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:243]
4. 如果 provider info 配置了 base_url，`to_api_provider` 使用配置 base_url，覆盖默认 URL。[E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:241][E: codex-rs/model-provider-info/src/lib.rs:243]
5. `bearer_auth_provider_from_auth` 对 env_key 优先读取 provider API key，其次 experimental bearer token，然后使用 Codex auth token/account/fedramp 信息。[E: codex-rs/model-provider/src/auth.rs:27][E: codex-rs/model-provider/src/auth.rs:35][E: codex-rs/model-provider/src/auth.rs:43][E: codex-rs/model-provider/src/auth.rs:47][E: codex-rs/model-provider/src/auth.rs:48]
6. `BearerAuthProvider::add_auth_headers` 对 token 写 `Authorization: Bearer ...`，对 account id 写 `ChatGPT-Account-ID`，FedRAMP account 写 `X-OpenAI-Fedramp: true`。[E: codex-rs/model-provider/src/bearer_auth_provider.rs:25][E: codex-rs/model-provider/src/bearer_auth_provider.rs:28][E: codex-rs/model-provider/src/bearer_auth_provider.rs:30][E: codex-rs/model-provider/src/bearer_auth_provider.rs:33][E: codex-rs/model-provider/src/bearer_auth_provider.rs:35][E: codex-rs/model-provider/src/bearer_auth_provider.rs:36]

## 设计动机与权衡

- OpenAI provider 的 auth path 支持 public API key、experimental bearer token 和 ChatGPT auth token；URL 选择依赖 `auth_mode`，auth headers 由 `BearerAuthProvider` 字段决定。[E: codex-rs/model-provider/src/auth.rs:27][E: codex-rs/model-provider/src/auth.rs:35][E: codex-rs/model-provider/src/auth.rs:43][E: codex-rs/model-provider-info/src/lib.rs:232][E: codex-rs/model-provider-info/src/lib.rs:238][E: codex-rs/model-provider/src/bearer_auth_provider.rs:25]
- OpenAI provider 设置 `supports_websockets = true`；Amazon Bedrock 和 OSS provider infos 设置 `supports_websockets = false`。[E: codex-rs/model-provider-info/src/lib.rs:346][E: codex-rs/model-provider-info/src/lib.rs:373][E: codex-rs/model-provider-info/src/lib.rs:504]
- OpenAI Organization/Project 走 env header map，而不是 hard-coded auth provider；`to_api_provider` 会调用 `build_header_map` 并把 headers 写入 `ApiProvider`。[E: codex-rs/model-provider-info/src/lib.rs:329][E: codex-rs/model-provider-info/src/lib.rs:335][E: codex-rs/model-provider-info/src/lib.rs:245][E: codex-rs/model-provider-info/src/lib.rs:258]

## gotcha

- `OpenAI` provider 的 default base URL 不是单个固定 URL；它取决于 `AuthMode::Chatgpt | ChatgptAuthTokens | AgentIdentity` 和 base_url override。[E: codex-rs/model-provider-info/src/lib.rs:232][E: codex-rs/model-provider-info/src/lib.rs:234][E: codex-rs/model-provider-info/src/lib.rs:236][E: codex-rs/model-provider-info/src/lib.rs:238][E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:243]
- OpenAI built-in default static header 是 `version`；OSS provider constructor 的 `http_headers` 为 `None`，不会自动继承 OpenAI built-in header。[E: codex-rs/model-provider-info/src/lib.rs:324][E: codex-rs/model-provider-info/src/lib.rs:325][E: codex-rs/model-provider-info/src/lib.rs:497]
- `is_openai()` 只检查 provider name 是否等于 `OpenAI`；name 不同但 base_url 指向 OpenAI-compatible endpoint 的 provider 不会被这个 helper 当作 OpenAI。[E: codex-rs/model-provider-info/src/lib.rs:378]

## Sources

- codex-rs/model-provider-info/src/lib.rs
- codex-rs/model-provider/src/auth.rs
- codex-rs/model-provider/src/bearer_auth_provider.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.auth-layer`
- `subsys.providers.responses-api`
- `subsys.providers.model-catalog`
