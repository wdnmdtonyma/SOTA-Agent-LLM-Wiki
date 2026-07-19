---
id: subsys.providers.http-client
title: Provider HTTP client
kind: subsystem
tier: T2
source: [codex-rs/http-client/src/default_client.rs, codex-rs/http-client/src/request.rs, codex-rs/http-client/src/transport.rs, codex-rs/codex-client/src/retry.rs, codex-rs/backend-client/src/client.rs, codex-rs/backend-client/src/types.rs, codex-rs/codex-backend-openapi-models/src/lib.rs]
symbols: [HttpClient, RequestBuilder, Request, RequestBody, EncodedJsonBody, RequestCompression, ReqwestTransport, RetryPolicy, run_with_retry, Client, PathStyle]
related: [subsys.providers.overview, subsys.providers.responses-api, subsys.providers.retry-errors, subsys.providers.auth-layer]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Provider HTTP client 层现在分成三块：`http-client` 拥有通用 HTTP transport、body preparation/compression 与 reqwest adapter，`codex-client` 保留 retry/SSE/telemetry，`backend-client` 则是 ChatGPT/Codex backend API 的 typed client；generated OpenAPI models 与 hand-written backend payload types 继续并存。[E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/http-client/src/request.rs:76][E: codex-rs/codex-client/src/retry.rs:8][E: codex-rs/backend-client/src/client.rs:124][E: codex-rs/codex-backend-openapi-models/src/lib.rs:6][E: codex-rs/backend-client/src/types.rs:190]

## 能回答的问题

- Responses endpoint 使用的 generic transport 如何构造 request、stream、retry？
- JSON request body 何时 zstd 压缩，raw body 为什么不能压缩？
- backend-client 怎样归一化 ChatGPT base URL 和路径风格？
- transport error 如何区分 HTTP status、timeout、network、build？
- generated OpenAPI models 与 hand-written backend types 如何分工？

## 职责边界

`http-client` 不知道 provider auth 或 Responses semantics；它只执行调用方准备的 `Request`。`codex-client` 在这条边界上增加重试等 Codex API 通用机制。`backend-client` 面向 ChatGPT backend task/rate-limit/config APIs，不是通用 LLM provider endpoint。[E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/http-client/src/transport.rs:30][E: codex-rs/codex-client/src/retry.rs:49][E: codex-rs/backend-client/src/client.rs:283][E: codex-rs/backend-client/src/client.rs:318][E: codex-rs/backend-client/src/client.rs:354]

## 关键 crate/文件

- `codex-rs/http-client/src/default_client.rs`: `HttpClient` reqwest wrapper、`RequestBuilder`、trace header injection，以及可关闭 URL/response-header diagnostics 的认证端点专用构造路径。[E: codex-rs/http-client/src/default_client.rs:17][E: codex-rs/http-client/src/default_client.rs:30][E: codex-rs/http-client/src/default_client.rs:34][E: codex-rs/http-client/src/default_client.rs:77][E: codex-rs/http-client/src/default_client.rs:147][E: codex-rs/http-client/src/default_client.rs:195]
- `codex-rs/http-client/src/request.rs`: request/response structs、JSON/raw body、可复用的 `EncodedJsonBody`、zstd compression 与 one-time preparation。[E: codex-rs/http-client/src/request.rs:15][E: codex-rs/http-client/src/request.rs:23][E: codex-rs/http-client/src/request.rs:42][E: codex-rs/http-client/src/request.rs:49][E: codex-rs/http-client/src/request.rs:77][E: codex-rs/http-client/src/request.rs:118][E: codex-rs/http-client/src/request.rs:156]
- `codex-rs/http-client/src/transport.rs`: `HttpTransport` trait 和 reqwest execute/stream implementation。[E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/http-client/src/transport.rs:30][E: codex-rs/http-client/src/transport.rs:97][E: codex-rs/http-client/src/transport.rs:129]
- `codex-rs/backend-client/src/client.rs`: ChatGPT/Codex backend API client、auth headers、path styles。[E: codex-rs/backend-client/src/client.rs:106][E: codex-rs/backend-client/src/client.rs:118][E: codex-rs/backend-client/src/client.rs:124][E: codex-rs/backend-client/src/client.rs:127][E: codex-rs/backend-client/src/client.rs:212][E: codex-rs/backend-client/src/client.rs:219][E: codex-rs/backend-client/src/client.rs:226]

## 数据模型

- `HttpClient` wraps `reqwest::Client` 并记录 request-logging mode；`RequestBuilder` 保存 reqwest builder、method、url 与 logging mode，并通过 methods 委托设置 headers、bearer、timeout、json、body。[E: codex-rs/http-client/src/default_client.rs:17][E: codex-rs/http-client/src/default_client.rs:18][E: codex-rs/http-client/src/default_client.rs:19][E: codex-rs/http-client/src/default_client.rs:77][E: codex-rs/http-client/src/default_client.rs:78][E: codex-rs/http-client/src/default_client.rs:79][E: codex-rs/http-client/src/default_client.rs:80][E: codex-rs/http-client/src/default_client.rs:81][E: codex-rs/http-client/src/default_client.rs:108][E: codex-rs/http-client/src/default_client.rs:122][E: codex-rs/http-client/src/default_client.rs:129][E: codex-rs/http-client/src/default_client.rs:133][E: codex-rs/http-client/src/default_client.rs:140]
- `Request` 保存 method、url、headers、optional body、compression、timeout；`RequestBody` 分 JSON、encoded JSON 和 raw bytes，`EncodedJsonBody` 让 clone 共享序列化/压缩后的 reference-counted bytes。[E: codex-rs/http-client/src/request.rs:9][E: codex-rs/http-client/src/request.rs:15][E: codex-rs/http-client/src/request.rs:49][E: codex-rs/http-client/src/request.rs:50][E: codex-rs/http-client/src/request.rs:51][E: codex-rs/http-client/src/request.rs:52][E: codex-rs/http-client/src/request.rs:77][E: codex-rs/http-client/src/request.rs:78][E: codex-rs/http-client/src/request.rs:83]
- `RetryPolicy` 使用 max_attempts、base_delay 和 `RetryOn` 三个布尔开关控制 HTTP 429、5xx、transport retry。[E: codex-rs/codex-client/src/retry.rs:9][E: codex-rs/codex-client/src/retry.rs:10][E: codex-rs/codex-client/src/retry.rs:11][E: codex-rs/codex-client/src/retry.rs:17][E: codex-rs/codex-client/src/retry.rs:18][E: codex-rs/codex-client/src/retry.rs:19][E: codex-rs/codex-client/src/retry.rs:28][E: codex-rs/codex-client/src/retry.rs:29][E: codex-rs/codex-client/src/retry.rs:30][E: codex-rs/codex-client/src/retry.rs:32]
- `backend_client::Client` 保存 base_url、reqwest client、`SharedAuthProvider`、user agent、account id、FedRAMP flag 和 path style；auth headers 由 shared provider 在 request header 构造时注入。[E: codex-rs/backend-client/src/client.rs:124][E: codex-rs/backend-client/src/client.rs:125][E: codex-rs/backend-client/src/client.rs:126][E: codex-rs/backend-client/src/client.rs:127][E: codex-rs/backend-client/src/client.rs:128][E: codex-rs/backend-client/src/client.rs:129][E: codex-rs/backend-client/src/client.rs:130][E: codex-rs/backend-client/src/client.rs:131][E: codex-rs/backend-client/src/client.rs:219]

## 控制流

1. `RequestBuilder::send` 在发送前注入 OpenTelemetry trace headers；只有 `RequestLogging::Enabled` 才记录包含 URL/response headers 的 success/failure diagnostics，认证端点可以通过 `new_without_request_logging` 关闭这些日志。[E: codex-rs/http-client/src/default_client.rs:30][E: codex-rs/http-client/src/default_client.rs:34][E: codex-rs/http-client/src/default_client.rs:147][E: codex-rs/http-client/src/default_client.rs:148][E: codex-rs/http-client/src/default_client.rs:152][E: codex-rs/http-client/src/default_client.rs:166]
2. `Request::into_prepared` 把最终 headers/body 固化回 request；clone 因此复用完全相同的 bytes，retry 不会重复 JSON serialization/compression，request-signing auth 也能看到 transport 真正发送的最终 body。[E: codex-rs/http-client/src/request.rs:113][E: codex-rs/http-client/src/request.rs:115][E: codex-rs/http-client/src/request.rs:116][E: codex-rs/http-client/src/request.rs:117][E: codex-rs/http-client/src/request.rs:118][E: codex-rs/http-client/src/request.rs:136][E: codex-rs/http-client/src/request.rs:147]
3. `Request::prepare_body_for_send` 拒绝 raw body compression；JSON body 先序列化，zstd compression 会写 `content-encoding: zstd`，没有 content-type 时补 `application/json`；如果调用方已经设置 `content-encoding`，再请求压缩会报冲突。[E: codex-rs/http-client/src/request.rs:156][E: codex-rs/http-client/src/request.rs:159][E: codex-rs/http-client/src/request.rs:160][E: codex-rs/http-client/src/request.rs:168][E: codex-rs/http-client/src/request.rs:192][E: codex-rs/http-client/src/request.rs:193][E: codex-rs/http-client/src/request.rs:195][E: codex-rs/http-client/src/request.rs:205][E: codex-rs/http-client/src/request.rs:213][E: codex-rs/http-client/src/request.rs:227]
4. `ReqwestTransport::execute` 构造 reqwest request，读取 status/headers/body，非 success 返回 `TransportError::Http` 并携带 url、status、headers、body。[E: codex-rs/http-client/src/transport.rs:97][E: codex-rs/http-client/src/transport.rs:108][E: codex-rs/http-client/src/transport.rs:113][E: codex-rs/http-client/src/transport.rs:115][E: codex-rs/http-client/src/transport.rs:120]
5. `ReqwestTransport::stream` 成功时返回 status、headers 和 bytes stream，stream item error 会映射为 `TransportError`。[E: codex-rs/http-client/src/transport.rs:17][E: codex-rs/http-client/src/transport.rs:129][E: codex-rs/http-client/src/transport.rs:140][E: codex-rs/http-client/src/transport.rs:153][E: codex-rs/http-client/src/transport.rs:155][E: codex-rs/http-client/src/transport.rs:160]
6. `RetryOn::should_retry` 在 attempt 达到 max_attempts 后停止；429、5xx、Timeout/Network 由对应 flags 决定是否 retry。[E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:28][E: codex-rs/codex-client/src/retry.rs:30][E: codex-rs/codex-client/src/retry.rs:32]
7. `run_with_retry` 逐 attempt 调用 operation，遇到 retryable error 按 exponential backoff 和 jitter sleep，然后重试。[E: codex-rs/codex-client/src/retry.rs:38][E: codex-rs/codex-client/src/retry.rs:42][E: codex-rs/codex-client/src/retry.rs:45][E: codex-rs/codex-client/src/retry.rs:49][E: codex-rs/codex-client/src/retry.rs:59][E: codex-rs/codex-client/src/retry.rs:63][E: codex-rs/codex-client/src/retry.rs:67]
8. `backend-client::Client::new` 把 `chatgpt.com`/`chat.openai.com` 归一化到 `/backend-api`，并 trim trailing slash。[E: codex-rs/backend-client/src/client.rs:151][E: codex-rs/backend-client/src/client.rs:152][E: codex-rs/backend-client/src/client.rs:155][E: codex-rs/backend-client/src/client.rs:158][E: codex-rs/backend-client/src/client.rs:160][E: codex-rs/backend-client/src/client.rs:162]
9. backend headers 会写 user-agent，调用 `auth_provider.add_auth_headers` 注入 provider auth headers，并按 client state 写 ChatGPT-Account-Id 与 X-OpenAI-Fedramp。[E: codex-rs/backend-client/src/client.rs:212][E: codex-rs/backend-client/src/client.rs:214][E: codex-rs/backend-client/src/client.rs:219][E: codex-rs/backend-client/src/client.rs:220][E: codex-rs/backend-client/src/client.rs:226]
10. backend `PathStyle` 决定 Codex API path 是 `/api/codex/...`，ChatGPT API path 是 `/wham/...`。[E: codex-rs/backend-client/src/client.rs:106][E: codex-rs/backend-client/src/client.rs:106][E: codex-rs/backend-client/src/client.rs:108][E: codex-rs/backend-client/src/client.rs:108][E: codex-rs/backend-client/src/client.rs:110][E: codex-rs/backend-client/src/client.rs:110][E: codex-rs/backend-client/src/client.rs:114][E: codex-rs/backend-client/src/client.rs:116][E: codex-rs/backend-client/src/client.rs:118]

## 设计动机与权衡

- `http-client` 把 `HttpTransport` trait 抽出来，`execute` 和 `stream` 都挂在 trait boundary 上；替换 transport 的测试/runtime 用法是基于这个 trait 形状的推断。[E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/http-client/src/transport.rs:26][E: codex-rs/http-client/src/transport.rs:30][I]
- backend types 有 hand-written `CodeTaskDetailsResponse`，generated OpenAPI models 通过 `codex_backend_openapi_models::models` 和 `pub mod models` 暴露；这解释了 generated models 与手写 types 并存。[E: codex-rs/backend-client/src/types.rs:190][E: codex-rs/backend-client/src/types.rs:1][E: codex-rs/codex-backend-openapi-models/src/lib.rs:6]
- `backend-client` 直接保存 `reqwest::Client` 和 `SharedAuthProvider`，而 generic provider transport 通过 `codex_http_client::HttpTransport` 暴露 execute/stream；两条 HTTP client path 的抽象层级不同。[E: codex-rs/backend-client/src/client.rs:126][E: codex-rs/backend-client/src/client.rs:127][E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/http-client/src/transport.rs:26][E: codex-rs/http-client/src/transport.rs:30][I]

## gotcha

- `RequestCompression::Zstd` 只支持 JSON/encoded JSON body；如果调用者传 raw body 又要求压缩，会在 prepare 阶段返回 error。[E: codex-rs/http-client/src/request.rs:49][E: codex-rs/http-client/src/request.rs:50][E: codex-rs/http-client/src/request.rs:51][E: codex-rs/http-client/src/request.rs:52][E: codex-rs/http-client/src/request.rs:159][E: codex-rs/http-client/src/request.rs:160][E: codex-rs/http-client/src/request.rs:161]
- `into_prepared` 会把 compression 重置为 `None`；prepared `EncodedJsonBody` 再进入 prepare path 时直接复用 bytes，避免 double compression。[E: codex-rs/http-client/src/request.rs:139][E: codex-rs/http-client/src/request.rs:142][E: codex-rs/http-client/src/request.rs:147][E: codex-rs/http-client/src/request.rs:185][E: codex-rs/http-client/src/request.rs:188]
- transport retry 不会自动 retry 任意 stream item error；`ReqwestTransport::stream` 建立 stream 后的 bytes stream item error 仍是 `TransportError`。[E: codex-rs/http-client/src/transport.rs:17][E: codex-rs/http-client/src/transport.rs:153][E: codex-rs/http-client/src/transport.rs:155][I]
- backend `RequestError::is_unauthorized` 只对 unexpected status 401 返回 true，network/parse 等错误不是 unauthorized。[E: codex-rs/backend-client/src/client.rs:47][E: codex-rs/backend-client/src/client.rs:48][E: codex-rs/backend-client/src/client.rs:50][E: codex-rs/backend-client/src/client.rs:51][E: codex-rs/backend-client/src/client.rs:55][E: codex-rs/backend-client/src/client.rs:56]

## Sources

- codex-rs/http-client/src/default_client.rs
- codex-rs/http-client/src/request.rs
- codex-rs/http-client/src/transport.rs
- codex-rs/codex-client/src/retry.rs
- codex-rs/backend-client/src/client.rs
- codex-rs/backend-client/src/types.rs
- codex-rs/codex-backend-openapi-models/src/lib.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.auth-layer`
