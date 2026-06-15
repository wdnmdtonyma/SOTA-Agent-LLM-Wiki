---
id: subsys.providers.overview
title: Provider overview
kind: subsystem
tier: T2
source: [codex-rs/model-provider/src/provider.rs, codex-rs/model-provider/src/auth.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/codex-api/src/provider.rs]
symbols: [ModelProvider, create_model_provider, ConfiguredModelProvider, ModelProviderInfo, WireApi, Provider, RetryConfig]
related: [subsys.providers.provider-openai, subsys.providers.provider-bedrock, subsys.providers.provider-oss, subsys.providers.auth-layer, subsys.providers.http-client, subsys.providers.responses-api, subsys.providers.model-catalog, config.model-provider]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Provider subsystem 把配置层的 `ModelProviderInfo` 转成 runtime `ModelProvider`，再转成 `codex_api::Provider` 和 `SharedAuthProvider`；wire API 目前只支持 Responses API。[E: codex-rs/model-provider/src/provider.rs:15][E: codex-rs/model-provider-info/src/lib.rs:44][E: codex-rs/model-provider/src/provider.rs:36][E: codex-rs/model-provider/src/provider.rs:43]

## 能回答的问题

- built-in providers 有哪些，哪些能被用户配置覆盖？
- `ModelProviderInfo` 和 `codex_api::Provider` 分别表示什么？
- provider auth 是如何从 Codex login、env key、experimental bearer token、command auth 或 AWS SigV4 生成的？
- retry、headers、query params、timeout 如何进入 HTTP request？
- Amazon Bedrock 为什么不是普通 configured provider？

## 职责边界

`model-provider-info` 是静态/配置层 registry，`model-provider` 是 runtime provider trait 和 auth selection，`codex-api` 是 endpoint client 看到的 base URL、headers、query params、retry policy 和 stream idle timeout；本节点不展开 HTTP transport 和 model catalog 的内部实现。[E: codex-rs/model-provider-info/src/lib.rs:80][E: codex-rs/model-provider/src/provider.rs:21][E: codex-rs/model-provider/src/provider.rs:31][E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:46][E: codex-rs/codex-api/src/provider.rs:47][E: codex-rs/codex-api/src/provider.rs:48][E: codex-rs/codex-api/src/provider.rs:49]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: `ModelProviderInfo` schema、built-ins、validation、provider-to-API conversion。[E: codex-rs/model-provider-info/src/lib.rs:76][E: codex-rs/model-provider-info/src/lib.rs:144][E: codex-rs/model-provider-info/src/lib.rs:231][E: codex-rs/model-provider-info/src/lib.rs:400]
- `codex-rs/model-provider/src/provider.rs`: `ModelProvider` trait、runtime provider creation、Bedrock special-case provider。[E: codex-rs/model-provider/src/provider.rs:21][E: codex-rs/model-provider/src/provider.rs:54][E: codex-rs/model-provider/src/provider.rs:58][E: codex-rs/model-provider/src/provider.rs:66]
- `codex-rs/model-provider/src/auth.rs`: non-Bedrock provider auth manager 和 bearer auth provider selection。[E: codex-rs/model-provider/src/auth.rs:10][E: codex-rs/model-provider/src/auth.rs:24][E: codex-rs/model-provider/src/auth.rs:59]
- `codex-rs/codex-api/src/provider.rs`: endpoint-level `Provider` 和 `RetryConfig`。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:43]

## 数据模型

- `ModelProvider` trait 暴露 `info()`、`auth_manager()`、`auth()`，默认 `api_provider()` 调 `info().to_api_provider(auth_mode)`，默认 `api_auth()` 调 `resolve_provider_auth`。[E: codex-rs/model-provider/src/provider.rs:21][E: codex-rs/model-provider/src/provider.rs:23][E: codex-rs/model-provider/src/provider.rs:31][E: codex-rs/model-provider/src/provider.rs:34][E: codex-rs/model-provider/src/provider.rs:37][E: codex-rs/model-provider/src/provider.rs:40][E: codex-rs/model-provider/src/provider.rs:44][E: codex-rs/model-provider/src/provider.rs:46]
- `ModelProviderInfo` 包含 name、base_url、env_key、experimental_bearer_token、auth、aws、wire_api、query_params、headers、retry/timeouts、requires_openai_auth、supports_websockets。[E: codex-rs/model-provider-info/src/lib.rs:80][E: codex-rs/model-provider-info/src/lib.rs:82][E: codex-rs/model-provider-info/src/lib.rs:84][E: codex-rs/model-provider-info/src/lib.rs:86][E: codex-rs/model-provider-info/src/lib.rs:94][E: codex-rs/model-provider-info/src/lib.rs:96][E: codex-rs/model-provider-info/src/lib.rs:98][E: codex-rs/model-provider-info/src/lib.rs:101][E: codex-rs/model-provider-info/src/lib.rs:103][E: codex-rs/model-provider-info/src/lib.rs:106][E: codex-rs/model-provider-info/src/lib.rs:111][E: codex-rs/model-provider-info/src/lib.rs:113][E: codex-rs/model-provider-info/src/lib.rs:115][E: codex-rs/model-provider-info/src/lib.rs:118][E: codex-rs/model-provider-info/src/lib.rs:121][E: codex-rs/model-provider-info/src/lib.rs:127][E: codex-rs/model-provider-info/src/lib.rs:130]
- `WireApi` 只有 `Responses` variant，且 default 是 `Responses`；deserialization 对 legacy `chat` 给出 removed error。[E: codex-rs/model-provider-info/src/lib.rs:47][E: codex-rs/model-provider-info/src/lib.rs:49][E: codex-rs/model-provider-info/src/lib.rs:50][E: codex-rs/model-provider-info/src/lib.rs:68][E: codex-rs/model-provider-info/src/lib.rs:69][E: codex-rs/model-provider-info/src/lib.rs:70]
- `codex_api::Provider` 是 HTTP endpoint 形态，保存 name、base_url、query_params、headers、retry、stream_idle_timeout，并能为 path 拼 URL。[E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:44][E: codex-rs/codex-api/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:46][E: codex-rs/codex-api/src/provider.rs:47][E: codex-rs/codex-api/src/provider.rs:48][E: codex-rs/codex-api/src/provider.rs:49][E: codex-rs/codex-api/src/provider.rs:53][E: codex-rs/codex-api/src/provider.rs:54][E: codex-rs/codex-api/src/provider.rs:59][E: codex-rs/codex-api/src/provider.rs:62][E: codex-rs/codex-api/src/provider.rs:74]

## 控制流

1. `create_model_provider` 如果 provider info 是 Amazon Bedrock，则读取 `provider_info.aws`，缺失时使用 profile/region 均为 `None` 的默认 AWS auth info，并构造 `AmazonBedrockModelProvider`；其他 provider 构造 `ConfiguredModelProvider` 并绑定 `auth_manager_for_provider`。[E: codex-rs/model-provider/src/provider.rs:58][E: codex-rs/model-provider/src/provider.rs:59][E: codex-rs/model-provider/src/provider.rs:62][E: codex-rs/model-provider/src/provider.rs:63][E: codex-rs/model-provider/src/provider.rs:64][E: codex-rs/model-provider/src/provider.rs:66][E: codex-rs/model-provider/src/provider.rs:72][E: codex-rs/model-provider/src/provider.rs:73]
2. `ConfiguredModelProvider::auth()` 读取 `AuthManager` 的 Codex auth；没有 auth manager 时返回 `None`。[E: codex-rs/model-provider/src/provider.rs:96][E: codex-rs/model-provider/src/provider.rs:97][E: codex-rs/model-provider/src/provider.rs:98][E: codex-rs/model-provider/src/provider.rs:99]
3. `ModelProviderInfo::validate` 禁止 AWS provider 同时配置 websocket、env_key、experimental bearer、command auth 或 requires_openai_auth；command auth 也不能与 env_key/experimental bearer/requires_openai_auth 同时使用。[E: codex-rs/model-provider-info/src/lib.rs:145][E: codex-rs/model-provider-info/src/lib.rs:146][E: codex-rs/model-provider-info/src/lib.rs:150][E: codex-rs/model-provider-info/src/lib.rs:153][E: codex-rs/model-provider-info/src/lib.rs:154][E: codex-rs/model-provider-info/src/lib.rs:157][E: codex-rs/model-provider-info/src/lib.rs:160][E: codex-rs/model-provider-info/src/lib.rs:163][E: codex-rs/model-provider-info/src/lib.rs:168][E: codex-rs/model-provider-info/src/lib.rs:175][E: codex-rs/model-provider-info/src/lib.rs:179][E: codex-rs/model-provider-info/src/lib.rs:183][E: codex-rs/model-provider-info/src/lib.rs:184][E: codex-rs/model-provider-info/src/lib.rs:187][E: codex-rs/model-provider-info/src/lib.rs:190][E: codex-rs/model-provider-info/src/lib.rs:197]
4. `ModelProviderInfo::to_api_provider` 对 ChatGPT auth mode 且无 base_url override 时使用 `https://chatgpt.com/backend-api/codex`，其他默认使用 `https://api.openai.com/v1`，配置 base_url 时使用配置值。[E: codex-rs/model-provider-info/src/lib.rs:231][E: codex-rs/model-provider-info/src/lib.rs:234][E: codex-rs/model-provider-info/src/lib.rs:236][E: codex-rs/model-provider-info/src/lib.rs:238][E: codex-rs/model-provider-info/src/lib.rs:240][E: codex-rs/model-provider-info/src/lib.rs:243]
5. `to_api_provider` 构造 retry config，默认 request_max_retries 进入 max_attempts，base_delay 200ms，retry_429 false，retry_5xx true，retry_transport true。[E: codex-rs/model-provider-info/src/lib.rs:246][E: codex-rs/model-provider-info/src/lib.rs:247][E: codex-rs/model-provider-info/src/lib.rs:248][E: codex-rs/model-provider-info/src/lib.rs:249][E: codex-rs/model-provider-info/src/lib.rs:250][E: codex-rs/model-provider-info/src/lib.rs:251]
6. `build_header_map` 先插入静态 HTTP headers，再从 env_http_headers 读取非空环境变量并转成 headers。[E: codex-rs/model-provider-info/src/lib.rs:204][E: codex-rs/model-provider-info/src/lib.rs:208][E: codex-rs/model-provider-info/src/lib.rs:216][E: codex-rs/model-provider-info/src/lib.rs:218][E: codex-rs/model-provider-info/src/lib.rs:219][E: codex-rs/model-provider-info/src/lib.rs:220][E: codex-rs/model-provider-info/src/lib.rs:221]
7. `built_in_model_providers` 返回 OpenAI、Amazon Bedrock、Ollama、LM Studio provider entries；`merge_configured_model_providers` 只允许 Amazon Bedrock 通过 configured provider 覆盖 aws profile/region，其他 configured provider 仅在 key 不存在时插入。[E: codex-rs/model-provider-info/src/lib.rs:400][E: codex-rs/model-provider-info/src/lib.rs:412][E: codex-rs/model-provider-info/src/lib.rs:413][E: codex-rs/model-provider-info/src/lib.rs:415][E: codex-rs/model-provider-info/src/lib.rs:439][E: codex-rs/model-provider-info/src/lib.rs:448][E: codex-rs/model-provider-info/src/lib.rs:452][E: codex-rs/model-provider-info/src/lib.rs:456][E: codex-rs/model-provider-info/src/lib.rs:460]

## 设计动机与权衡

- provider registry 层把 wire API 收敛到 Responses，源码对 `chat` wire API 直接报 "removed" 错误；减少 endpoint branching 是基于 `WireApi` 只有 `Responses` 和 legacy `chat` 直接错误的推断。[E: codex-rs/model-provider-info/src/lib.rs:47][E: codex-rs/model-provider-info/src/lib.rs:69][E: codex-rs/model-provider-info/src/lib.rs:70][I]
- Bedrock 作为 special-case runtime provider 存在：`create_model_provider` 对 Amazon Bedrock 走 `AmazonBedrockModelProvider`，内建 Bedrock provider 的默认 base URL 是 Mantle endpoint，并携带 AWS auth info。[E: codex-rs/model-provider/src/provider.rs:58][E: codex-rs/model-provider/src/provider.rs:66][E: codex-rs/model-provider-info/src/lib.rs:39][E: codex-rs/model-provider-info/src/lib.rs:355][E: codex-rs/model-provider-info/src/lib.rs:360]
- built-in providers 不被一般 user config 覆盖；`entry(key).or_insert(provider)` 只在 id 不存在时插入，这让 built-ins 的默认 URL/auth 行为稳定。[E: codex-rs/model-provider-info/src/lib.rs:459][E: codex-rs/model-provider-info/src/lib.rs:460][I]

## gotcha

- `api_key()` 只读取 `env_key` 指定的环境变量；变量缺失或为空会带上 `env_key_instructions` 形成 `EnvVarError`。[E: codex-rs/model-provider-info/src/lib.rs:267][E: codex-rs/model-provider-info/src/lib.rs:270][E: codex-rs/model-provider-info/src/lib.rs:272][E: codex-rs/model-provider-info/src/lib.rs:274][E: codex-rs/model-provider-info/src/lib.rs:276]
- effective retry caps 使用 `min(100)`；配置很大的 retry 数会被截断到 100。[E: codex-rs/model-provider-info/src/lib.rs:31][E: codex-rs/model-provider-info/src/lib.rs:33][E: codex-rs/model-provider-info/src/lib.rs:287][E: codex-rs/model-provider-info/src/lib.rs:289][E: codex-rs/model-provider-info/src/lib.rs:294][E: codex-rs/model-provider-info/src/lib.rs:296]
- `supports_websockets` 是 provider info 字段，但 AWS validation 禁止它与 aws auth 同时为 true。[E: codex-rs/model-provider-info/src/lib.rs:128][E: codex-rs/model-provider-info/src/lib.rs:130][E: codex-rs/model-provider-info/src/lib.rs:145][E: codex-rs/model-provider-info/src/lib.rs:146][E: codex-rs/model-provider-info/src/lib.rs:150]

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
