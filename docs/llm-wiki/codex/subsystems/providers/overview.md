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
updated: 9ded177ce7
---

> Provider subsystem 把配置层的 `ModelProviderInfo` 转成 runtime `ModelProvider`，再转成 `codex_api::Provider` 和 `SharedAuthProvider`；wire API 目前只支持 Responses API。[E: codex-rs/model-provider-info/src/lib.rs:56][E: codex-rs/model-provider-info/src/lib.rs:56][E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:161][E: codex-rs/model-provider/src/provider.rs:171]

## 能回答的问题

- built-in providers 有哪些，哪些能被用户配置覆盖？
- `ModelProviderInfo` 和 `codex_api::Provider` 分别表示什么？
- provider auth 是如何从 Codex login、env key、experimental bearer token、command auth 或 AWS SigV4 生成的？
- retry、headers、query params、timeout 如何进入 HTTP request？
- Amazon Bedrock 为什么不是普通 configured provider？

## 职责边界

`model-provider-info` 是静态/配置层 registry，`model-provider` 是 runtime provider trait 和 auth selection，`codex-api` 是 endpoint client 看到的 base URL、headers、query params、retry policy 和 stream idle timeout；本节点不展开 HTTP transport 和 model catalog 的内部实现。[E: codex-rs/model-provider-info/src/lib.rs:85][E: codex-rs/model-provider-info/src/lib.rs:85][E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:46][E: codex-rs/codex-api/src/provider.rs:47][E: codex-rs/codex-api/src/provider.rs:48][E: codex-rs/codex-api/src/provider.rs:49]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: `ModelProviderInfo` schema、built-ins、validation、provider-to-API conversion。[E: codex-rs/model-provider-info/src/lib.rs:85][E: codex-rs/model-provider-info/src/lib.rs:85][E: codex-rs/model-provider-info/src/lib.rs:161][E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:437]
- `codex-rs/model-provider/src/provider.rs`: `ModelProvider` trait、runtime provider creation、Bedrock special-case provider。[E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:232][E: codex-rs/model-provider/src/provider.rs:242]
- `codex-rs/model-provider/src/auth.rs`: non-Bedrock provider auth manager 和 auth provider selection。[E: codex-rs/model-provider/src/auth.rs:166][E: codex-rs/model-provider/src/auth.rs:166][E: codex-rs/model-provider/src/auth.rs:177]
- `codex-rs/codex-api/src/provider.rs`: endpoint-level `Provider` 和 `RetryConfig`。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:43]

## 数据模型

- `ModelProvider` trait 暴露 `info()`、`auth_manager()`、`auth()`，默认 `api_provider()` 调 `info().to_api_provider(auth_mode)`，默认 `api_auth()` 调 `resolve_provider_auth`。[E: codex-rs/model-provider/src/provider.rs:120][E: codex-rs/model-provider/src/provider.rs:122][E: codex-rs/model-provider/src/provider.rs:161][E: codex-rs/model-provider/src/provider.rs:164][E: codex-rs/model-provider/src/provider.rs:175]
- `ModelProviderInfo` 包含 name、base_url、env_key、experimental_bearer_token、auth、aws、wire_api、query_params、headers、retry/timeouts、requires_openai_auth、supports_websockets。[E: codex-rs/model-provider-info/src/lib.rs:85][E: codex-rs/model-provider-info/src/lib.rs:92][E: codex-rs/model-provider-info/src/lib.rs:95][E: codex-rs/model-provider-info/src/lib.rs:96][E: codex-rs/model-provider-info/src/lib.rs:104][E: codex-rs/model-provider-info/src/lib.rs:108][E: codex-rs/model-provider-info/src/lib.rs:108][E: codex-rs/model-provider-info/src/lib.rs:112][E: codex-rs/model-provider-info/src/lib.rs:114][E: codex-rs/model-provider-info/src/lib.rs:117][E: codex-rs/model-provider-info/src/lib.rs:125][E: codex-rs/model-provider-info/src/lib.rs:125][E: codex-rs/model-provider-info/src/lib.rs:125][E: codex-rs/model-provider-info/src/lib.rs:129][E: codex-rs/model-provider-info/src/lib.rs:132][E: codex-rs/model-provider-info/src/lib.rs:140][E: codex-rs/model-provider-info/src/lib.rs:140]
- `WireApi` 只有 `Responses` variant，且 default 是 `Responses`；deserialization 对 legacy `chat` 给出 removed error。[E: codex-rs/model-provider-info/src/lib.rs:56][E: codex-rs/model-provider-info/src/lib.rs:56][E: codex-rs/model-provider-info/src/lib.rs:60][E: codex-rs/model-provider-info/src/lib.rs:72][E: codex-rs/model-provider-info/src/lib.rs:79][E: codex-rs/model-provider-info/src/lib.rs:80]
- `codex_api::Provider` 是 HTTP endpoint 形态，保存 name、base_url、query_params、headers、retry、stream_idle_timeout，并能为 path 拼 URL。[E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:44][E: codex-rs/codex-api/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:46][E: codex-rs/codex-api/src/provider.rs:47][E: codex-rs/codex-api/src/provider.rs:48][E: codex-rs/codex-api/src/provider.rs:49][E: codex-rs/codex-api/src/provider.rs:53][E: codex-rs/codex-api/src/provider.rs:54][E: codex-rs/codex-api/src/provider.rs:59][E: codex-rs/codex-api/src/provider.rs:62][E: codex-rs/codex-api/src/provider.rs:74]

## 控制流

1. `create_model_provider` 如果 `is_amazon_bedrock()`（含 Mantle 与 Runtime 两个 built-in name），则构造 `AmazonBedrockModelProvider`；其他 provider 构造 `ConfiguredModelProvider` 并绑定 `auth_manager_for_provider`。[E: codex-rs/model-provider/src/provider.rs:266][E: codex-rs/model-provider/src/provider.rs:270][E: codex-rs/model-provider-info/src/lib.rs:431]
2. `ConfiguredModelProvider::auth()` 读取 `AuthManager` 的 Codex auth；没有 auth manager 时返回 `None`。[E: codex-rs/model-provider/src/provider.rs:273][E: codex-rs/model-provider/src/provider.rs:278][E: codex-rs/model-provider/src/provider.rs:279][E: codex-rs/model-provider/src/provider.rs:280]
3. `ModelProviderInfo::validate` 禁止 AWS provider 同时配置 websocket、env_key、experimental bearer、command auth 或 requires_openai_auth；command auth 也不能与 env_key/experimental bearer/requires_openai_auth 同时使用。[E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:163][E: codex-rs/model-provider-info/src/lib.rs:167][E: codex-rs/model-provider-info/src/lib.rs:170][E: codex-rs/model-provider-info/src/lib.rs:172][E: codex-rs/model-provider-info/src/lib.rs:175][E: codex-rs/model-provider-info/src/lib.rs:187][E: codex-rs/model-provider-info/src/lib.rs:196][E: codex-rs/model-provider-info/src/lib.rs:200][E: codex-rs/model-provider-info/src/lib.rs:202]
4. `ModelProviderInfo::to_api_provider` 对 `Chatgpt | ChatgptAuthTokens | Headers | AgentIdentity | PersonalAccessToken` auth mode 且无 base_url override 时使用 `https://chatgpt.com/backend-api/codex`，其他默认使用 `https://api.openai.com/v1`，配置 base_url 时使用配置值。[E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:245][E: codex-rs/model-provider-info/src/lib.rs:248][E: codex-rs/model-provider-info/src/lib.rs:250][E: codex-rs/model-provider-info/src/lib.rs:255][E: codex-rs/model-provider-info/src/lib.rs:256][E: codex-rs/model-provider-info/src/lib.rs:259][E: codex-rs/model-provider-info/src/lib.rs:261]
5. `to_api_provider` 构造 retry config，默认 request_max_retries 进入 max_attempts，base_delay 200ms，retry_429 false，retry_5xx true，retry_transport true。[E: codex-rs/model-provider-info/src/lib.rs:265][E: codex-rs/model-provider-info/src/lib.rs:266][E: codex-rs/model-provider-info/src/lib.rs:266][E: codex-rs/model-provider-info/src/lib.rs:268][E: codex-rs/model-provider-info/src/lib.rs:269][E: codex-rs/model-provider-info/src/lib.rs:270]
6. `build_header_map` 先插入静态 HTTP headers，再从 env_http_headers 读取非空环境变量并转成 headers。[E: codex-rs/model-provider-info/src/lib.rs:216][E: codex-rs/model-provider-info/src/lib.rs:221][E: codex-rs/model-provider-info/src/lib.rs:223][E: codex-rs/model-provider-info/src/lib.rs:224][E: codex-rs/model-provider-info/src/lib.rs:228][E: codex-rs/model-provider-info/src/lib.rs:228][E: codex-rs/model-provider-info/src/lib.rs:228][E: codex-rs/model-provider-info/src/lib.rs:236]
7. `built_in_model_providers` 返回 OpenAI、Amazon Bedrock、Amazon Bedrock Runtime、Ollama、LM Studio provider entries；`merge_configured_model_providers` 允许两个 Bedrock id 覆盖 `base_url`、command `auth`、`http_headers` 与整组 AWS profile/region，其他 configured provider 仍只在 key 不存在时插入。[E: codex-rs/model-provider-info/src/lib.rs:452][E: codex-rs/model-provider-info/src/lib.rs:466][E: codex-rs/model-provider-info/src/lib.rs:491][E: codex-rs/model-provider-info/src/lib.rs:496]

8. `ModelProvider` 现在还定义 `models_manager_without_cache`，默认使用 authoritative in-memory catalog，避免 hosted callers 意外写盘；configured OpenAI-compatible provider 会使用 `OpenAiModelsManager::new_without_cache` 保留远端发现而关闭 cache。[E: codex-rs/model-provider/src/provider.rs:207][E: codex-rs/model-provider/src/provider.rs:211][E: codex-rs/model-provider/src/provider.rs:211][E: codex-rs/model-provider/src/provider.rs:352][E: codex-rs/model-provider/src/provider.rs:366]

## 设计动机与权衡

- provider registry 层把 wire API 收敛到 Responses，源码对 `chat` wire API 直接报 "removed" 错误；减少 endpoint branching 是基于 `WireApi` 只有 `Responses` 和 legacy `chat` 直接错误的推断。[E: codex-rs/model-provider-info/src/lib.rs:56][E: codex-rs/model-provider-info/src/lib.rs:60][E: codex-rs/model-provider-info/src/lib.rs:79][E: codex-rs/model-provider-info/src/lib.rs:80][I]
- Bedrock 作为 special-case runtime provider 存在：`create_model_provider` 对 Amazon Bedrock 走 `AmazonBedrockModelProvider`，内建 Bedrock provider 的默认 base URL 是 Mantle endpoint，并携带 AWS auth info。[E: codex-rs/model-provider/src/provider.rs:232][E: codex-rs/model-provider/src/provider.rs:242][E: codex-rs/model-provider/src/provider.rs:242][E: codex-rs/model-provider-info/src/lib.rs:46][E: codex-rs/model-provider-info/src/lib.rs:370][E: codex-rs/model-provider-info/src/lib.rs:374][E: codex-rs/model-provider-info/src/lib.rs:383]
- built-in providers 不被一般 user config 覆盖；`entry(key).or_insert(provider)` 只在 id 不存在时插入，这让 built-ins 的默认 URL/auth 行为稳定。[E: codex-rs/model-provider-info/src/lib.rs:502][E: codex-rs/model-provider-info/src/lib.rs:503][I]

## gotcha

- `api_key()` 只读取 `env_key` 指定的环境变量；变量缺失或为空会带上 `env_key_instructions` 形成 `EnvVarError`。[E: codex-rs/model-provider-info/src/lib.rs:283][E: codex-rs/model-provider-info/src/lib.rs:290][E: codex-rs/model-provider-info/src/lib.rs:290][E: codex-rs/model-provider-info/src/lib.rs:291][E: codex-rs/model-provider-info/src/lib.rs:293][E: codex-rs/model-provider-info/src/lib.rs:295]
- effective retry caps 使用 `min(100)`；配置很大的 retry 数会被截断到 100。[E: codex-rs/model-provider-info/src/lib.rs:32][E: codex-rs/model-provider-info/src/lib.rs:32][E: codex-rs/model-provider-info/src/lib.rs:304][E: codex-rs/model-provider-info/src/lib.rs:304][E: codex-rs/model-provider-info/src/lib.rs:312][E: codex-rs/model-provider-info/src/lib.rs:316]
- `supports_websockets` 是 provider info 字段，但 AWS validation 禁止它与 aws auth 同时为 true。[E: codex-rs/model-provider-info/src/lib.rs:132][E: codex-rs/model-provider-info/src/lib.rs:140][E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:163]
- Generic provider 的默认 memory extraction/consolidation models 已分别是 `gpt-5.6-luna` 与 `gpt-5.6-terra`；provider 可通过 trait methods 覆盖这些 backend-specific ids。[E: codex-rs/model-provider/src/provider.rs:90][E: codex-rs/model-provider/src/provider.rs:90][E: codex-rs/model-provider/src/provider.rs:126]

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
