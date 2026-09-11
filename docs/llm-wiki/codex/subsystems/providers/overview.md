---
id: subsys.providers.overview
title: Provider overview
kind: subsystem
tier: T2
source: [codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/codex-api/src/provider.rs]
symbols: [ModelProvider, create_model_provider, ConfiguredModelProvider, ModelProviderInfo, WireApi]
related: [subsys.providers.provider-openai, subsys.providers.provider-bedrock, subsys.providers.provider-oss, subsys.providers.auth-layer, subsys.providers.http-client, subsys.providers.responses-api, subsys.providers.model-catalog, config.model-provider]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Provider subsystem 把配置层的 `ModelProviderInfo` 转成 runtime `ModelProvider`，再转成 `codex_api::Provider` 和 `SharedAuthProvider`；wire API 目前只支持 Responses API。[E: codex-rs/model-provider-info/src/lib.rs:68][E: codex-rs/model-provider-info/src/lib.rs:71][E: codex-rs/model-provider/src/provider.rs:148][E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/provider.rs:245]

## 能回答的问题

- built-in providers 有哪些，哪些能被用户配置覆盖？
- `ModelProviderInfo` 和 `codex_api::Provider` 分别表示什么？
- provider auth 是如何从 Codex login、env key、experimental bearer token、command auth 或 AWS SigV4 生成的？
- retry、headers、query params、timeout 如何进入 HTTP request？
- Amazon Bedrock 为什么不是普通 configured provider？

## 职责边界

`model-provider-info` 是静态/配置层 registry，`model-provider` 是 runtime provider trait 和 auth selection，`codex-api` 是 endpoint client 看到的 base URL、headers、query params、retry policy 和 stream idle timeout；本节点不展开 HTTP transport 和 model catalog 的内部实现。[E: codex-rs/model-provider-info/src/lib.rs:100][E: codex-rs/model-provider/src/provider.rs:148][E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:46][E: codex-rs/codex-api/src/provider.rs:47][E: codex-rs/codex-api/src/provider.rs:48][E: codex-rs/codex-api/src/provider.rs:49]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: `ModelProviderInfo` schema、built-ins、validation、provider-to-API conversion。[E: codex-rs/model-provider-info/src/lib.rs:100][E: codex-rs/model-provider-info/src/lib.rs:246][E: codex-rs/model-provider-info/src/lib.rs:370][E: codex-rs/model-provider-info/src/lib.rs:590]
- `codex-rs/model-provider/src/provider.rs`: `ModelProvider` trait、runtime provider creation、Bedrock special-case provider。[E: codex-rs/model-provider/src/provider.rs:148][E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/provider.rs:324]
- `codex-rs/model-provider/src/auth.rs`: non-Bedrock provider auth manager 和 auth provider selection。[E: codex-rs/model-provider/src/auth.rs:187][E: codex-rs/model-provider/src/auth.rs:197]
- `codex-rs/codex-api/src/provider.rs`: endpoint-level `Provider` 和 `RetryConfig`。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:43]

## 数据模型

- `ModelProvider` trait 暴露 `info()`、`auth_manager()`、`auth()`，默认 `api_provider()` 调 `info().to_api_provider(auth_mode)`，默认 `api_auth()` 调 `resolve_provider_auth`。[E: codex-rs/model-provider/src/provider.rs:148][E: codex-rs/model-provider/src/provider.rs:150][E: codex-rs/model-provider/src/provider.rs:189][E: codex-rs/model-provider/src/provider.rs:215][E: codex-rs/model-provider/src/provider.rs:226][E: codex-rs/model-provider/src/provider.rs:245]
- `ModelProviderInfo` 包含 name、base_url、env_key、experimental_bearer_token、auth、aws、wire_api、query_params、headers、retry/timeouts、requires_openai_auth、supports_websockets。[E: codex-rs/model-provider-info/src/lib.rs:100][E: codex-rs/model-provider-info/src/lib.rs:103][E: codex-rs/model-provider-info/src/lib.rs:105][E: codex-rs/model-provider-info/src/lib.rs:107][E: codex-rs/model-provider-info/src/lib.rs:115][E: codex-rs/model-provider-info/src/lib.rs:117][E: codex-rs/model-provider-info/src/lib.rs:119][E: codex-rs/model-provider-info/src/lib.rs:122][E: codex-rs/model-provider-info/src/lib.rs:124][E: codex-rs/model-provider-info/src/lib.rs:127][E: codex-rs/model-provider-info/src/lib.rs:132][E: codex-rs/model-provider-info/src/lib.rs:148][E: codex-rs/model-provider-info/src/lib.rs:151]
- `WireApi` 只有 `Responses` variant，且 default 是 `Responses`；deserialization 对 legacy `chat` 给出 removed error。[E: codex-rs/model-provider-info/src/lib.rs:68][E: codex-rs/model-provider-info/src/lib.rs:71][E: codex-rs/model-provider-info/src/lib.rs:61][E: codex-rs/model-provider-info/src/lib.rs:91]
- `codex_api::Provider` 是 HTTP endpoint 形态，保存 name、base_url、query_params、headers、retry、stream_idle_timeout，并能为 path 拼 URL。[E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:44][E: codex-rs/codex-api/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:46][E: codex-rs/codex-api/src/provider.rs:47][E: codex-rs/codex-api/src/provider.rs:48][E: codex-rs/codex-api/src/provider.rs:49][E: codex-rs/codex-api/src/provider.rs:53][E: codex-rs/codex-api/src/provider.rs:54][E: codex-rs/codex-api/src/provider.rs:59][E: codex-rs/codex-api/src/provider.rs:62][E: codex-rs/codex-api/src/provider.rs:74]

## 控制流

1. `create_model_provider` 如果 `is_amazon_bedrock()`（含 Mantle 与 Runtime 两个 built-in name），则构造 `AmazonBedrockModelProvider`；其他 provider 构造 `ConfiguredModelProvider` 并绑定 `auth_manager_for_provider`。[E: codex-rs/model-provider/src/provider.rs:320][E: codex-rs/model-provider/src/provider.rs:324][E: codex-rs/model-provider-info/src/lib.rs:569]
2. `ConfiguredModelProvider::auth()` 读取 `AuthManager` 的 Codex auth；没有 auth manager 时返回 `None`。[E: codex-rs/model-provider/src/provider.rs:392][E: codex-rs/model-provider/src/provider.rs:394][E: codex-rs/model-provider/src/provider.rs:396]
3. `ModelProviderInfo::validate` 禁止 AWS provider 同时配置 websocket、env_key、experimental bearer、command auth 或 requires_openai_auth；command auth 也不能与 env_key/experimental bearer/requires_openai_auth 同时使用。[E: codex-rs/model-provider-info/src/lib.rs:225][E: codex-rs/model-provider-info/src/lib.rs:225][E: codex-rs/model-provider-info/src/lib.rs:248][E: codex-rs/model-provider-info/src/lib.rs:252][E: codex-rs/model-provider-info/src/lib.rs:255][E: codex-rs/model-provider-info/src/lib.rs:257][E: codex-rs/model-provider-info/src/lib.rs:260][E: codex-rs/model-provider-info/src/lib.rs:272][E: codex-rs/model-provider-info/src/lib.rs:316][E: codex-rs/model-provider-info/src/lib.rs:320][E: codex-rs/model-provider-info/src/lib.rs:322]
4. `ModelProviderInfo::to_api_provider` 对 `Chatgpt | ChatgptAuthTokens | Headers | AgentIdentity | PersonalAccessToken` auth mode 且无 base_url override 时使用 `https://chatgpt.com/backend-api/codex`，其他默认使用 `https://api.openai.com/v1`，配置 base_url 时使用配置值。[E: codex-rs/model-provider-info/src/lib.rs:370][E: codex-rs/model-provider-info/src/lib.rs:374][E: codex-rs/model-provider-info/src/lib.rs:381][E: codex-rs/model-provider-info/src/lib.rs:383][E: codex-rs/model-provider-info/src/lib.rs:385][E: codex-rs/model-provider-info/src/lib.rs:388]
5. `to_api_provider` 构造 retry config，默认 request_max_retries 进入 max_attempts，base_delay 200ms，retry_429 false，retry_5xx true，retry_transport true。[E: codex-rs/model-provider-info/src/lib.rs:391][E: codex-rs/model-provider-info/src/lib.rs:392][E: codex-rs/model-provider-info/src/lib.rs:393][E: codex-rs/model-provider-info/src/lib.rs:394][E: codex-rs/model-provider-info/src/lib.rs:395][E: codex-rs/model-provider-info/src/lib.rs:396]
6. `build_header_map` 先插入静态 HTTP headers，再从 env_http_headers 读取非空环境变量并转成 headers。[E: codex-rs/model-provider-info/src/lib.rs:341][E: codex-rs/model-provider-info/src/lib.rs:356][E: codex-rs/model-provider-info/src/lib.rs:362]
7. `built_in_model_providers` 返回 OpenAI、Amazon Bedrock、Amazon Bedrock Runtime、Ollama、LM Studio provider entries；`merge_configured_model_providers` 允许两个 Bedrock id 覆盖 `base_url`、command `auth`、`http_headers` 与整组 AWS profile/region，其他 configured provider 仍只在 key 不存在时插入。[E: codex-rs/model-provider-info/src/lib.rs:590][E: codex-rs/model-provider-info/src/lib.rs:604][E: codex-rs/model-provider-info/src/lib.rs:629][E: codex-rs/model-provider-info/src/lib.rs:634][E: codex-rs/model-provider-info/src/lib.rs:659]

8. `ModelProvider` 现在还定义 `models_manager_without_cache`，默认使用 authoritative in-memory catalog，避免 hosted callers 意外写盘；configured OpenAI-compatible provider 会使用 `OpenAiModelsManager::new_without_cache` 保留远端发现而关闭 cache。[E: codex-rs/model-provider/src/provider.rs:280][E: codex-rs/model-provider/src/provider.rs:287][E: codex-rs/model-provider/src/provider.rs:468][E: codex-rs/model-provider/src/provider.rs:482]

## 设计动机与权衡

- provider registry 层把 wire API 收敛到 Responses，源码对 `chat` wire API 直接报 "removed" 错误；减少 endpoint branching 是基于 `WireApi` 只有 `Responses` 和 legacy `chat` 直接错误的推断。[E: codex-rs/model-provider-info/src/lib.rs:68][E: codex-rs/model-provider-info/src/lib.rs:61][E: codex-rs/model-provider-info/src/lib.rs:91][I]
- Bedrock 作为 special-case runtime provider 存在：`create_model_provider` 对 Amazon Bedrock 走 `AmazonBedrockModelProvider`，内建 Bedrock provider 的默认 base URL 是 Mantle endpoint，并携带 AWS auth info。[E: codex-rs/model-provider/src/provider.rs:324][E: codex-rs/model-provider-info/src/lib.rs:57][E: codex-rs/model-provider-info/src/lib.rs:501][E: codex-rs/model-provider-info/src/lib.rs:509]
- built-in providers 不被一般 user config 覆盖；`entry(key).or_insert(provider)` 只在 id 不存在时插入，这让 built-ins 的默认 URL/auth 行为稳定。[E: codex-rs/model-provider-info/src/lib.rs:658][E: codex-rs/model-provider-info/src/lib.rs:659][I]

## gotcha

- `api_key()` 只读取 `env_key` 指定的环境变量；变量缺失或为空会带上 `env_key_instructions` 形成 `EnvVarError`。[E: codex-rs/model-provider-info/src/lib.rs:417][E: codex-rs/model-provider-info/src/lib.rs:420][E: codex-rs/model-provider-info/src/lib.rs:424]
- effective retry caps 使用 `min(100)`；配置很大的 retry 数会被截断到 100。[E: codex-rs/model-provider-info/src/lib.rs:38][E: codex-rs/model-provider-info/src/lib.rs:436][E: codex-rs/model-provider-info/src/lib.rs:439][E: codex-rs/model-provider-info/src/lib.rs:443][E: codex-rs/model-provider-info/src/lib.rs:446]
- `supports_websockets` 是 provider info 字段，但 AWS validation 禁止它与 aws auth 同时为 true。[E: codex-rs/model-provider-info/src/lib.rs:151][E: codex-rs/model-provider-info/src/lib.rs:246][E: codex-rs/model-provider-info/src/lib.rs:248]
- Generic provider 的默认 memory extraction/consolidation models 已分别是 `gpt-5.6-luna` 与 `gpt-5.6-terra`；provider 可通过 trait methods 覆盖这些 backend-specific ids。[E: codex-rs/model-provider/src/provider.rs:137][E: codex-rs/model-provider/src/provider.rs:141][E: codex-rs/model-provider/src/provider.rs:167][E: codex-rs/model-provider/src/provider.rs:174]

## Sources

- codex-rs/model-provider/src/provider.rs
- codex-rs/model-provider/src/auth.rs
- codex-rs/model-provider-info/src/lib.rs
- codex-rs/codex-api/src/provider.rs

## 相关

- `subsys.providers.provider-openai`
- `subsys.providers.provider-bedrock`
- `subsys.providers.provider-oss`
- `subsys.providers.auth-layer`
- `subsys.providers.http-client`
- `subsys.providers.responses-api`
- `subsys.providers.model-catalog`
- `config.model-provider`
