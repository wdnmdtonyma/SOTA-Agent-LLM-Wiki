---
id: subsys.providers.retry-errors
title: Provider retry and errors
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/error.rs, codex-rs/codex-client/src/provider.rs, codex-rs/codex-api/src/provider.rs, codex-rs/codex-api/src/api_bridge.rs, codex-rs/codex-api/src/sse/responses.rs, codex-rs/codex-api/src/sse/responses_error.rs, codex-rs/http-client/src/error.rs, codex-rs/codex-client/src/retry.rs, codex-rs/http-client/src/transport.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/protocol/src/error.rs, codex-rs/core/src/responses_retry.rs, codex-rs/features/src/lib.rs]
symbols: [ApiError, RetryConfig, Provider, map_api_error, HttpError, TransportError, RetryPolicy, RetryOn, run_with_retry, ConnectionFailedError, ResponseStreamFailed, handle_retryable_response_stream_error, UnboundedConnectionRetries]
related: [subsys.providers.overview, subsys.providers.http-client, subsys.providers.responses-api, subsys.providers.sse-streaming]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Retry/error handling spans three layers: provider config becomes `RetryPolicy`, `http-client` defines transport errors while `codex-client` retries those transport/HTTP failures, and `codex-api` defines `ApiError` plus maps it into core `CodexErr`。[E: codex-rs/codex-client/src/provider.rs:18][E: codex-rs/codex-client/src/provider.rs:27][E: codex-rs/http-client/src/error.rs:10][E: codex-rs/codex-client/src/retry.rs:9][E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:85][E: codex-rs/codex-api/src/error.rs:10][E: codex-rs/codex-api/src/api_bridge.rs:22]

## 能回答的问题

- Provider retry config 的 429/5xx/transport flags 如何生效？
- HTTP status、timeout、network、build error 在哪一层区分？
- SSE `response.failed` 如何变成 retryable/context/quota/cyber-policy/invalid/server-overloaded errors？
- `ApiError` 如何映射成 core `CodexErr`？
- 429 usage-limit body 和 headers 如何产生 usage-limit rich error？
- `unbounded_connection_retries` 何时绕过普通 max_retries？

## 职责边界

`http-client` owns `TransportError` and transport execution；`codex-client` owns transport-level request retry；`codex-api` handles endpoint-specific stream errors and public API error enum；`map_api_error` converts `ApiError` into core `CodexErr`。[E: codex-rs/http-client/src/error.rs:10][E: codex-rs/codex-client/src/retry.rs:85][E: codex-rs/codex-api/src/error.rs:10][E: codex-rs/codex-api/src/api_bridge.rs:22]

## 关键 crate/文件

- `codex-rs/codex-client/src/provider.rs`: high-level `RetryConfig`/`Provider`；`codex-api` 只 re-export 这两个类型。[E: codex-rs/codex-client/src/provider.rs:18][E: codex-rs/codex-client/src/provider.rs:27][E: codex-rs/codex-client/src/provider.rs:45][E: codex-rs/codex-api/src/provider.rs:1][E: codex-rs/codex-api/src/provider.rs:2]
- `codex-rs/codex-client/src/retry.rs`: retry policy decisions, exponential backoff with jitter, retry loop。[E: codex-rs/codex-client/src/retry.rs:9][E: codex-rs/codex-client/src/retry.rs:16][E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:43][E: codex-rs/codex-client/src/retry.rs:85]
- `codex-rs/http-client/src/error.rs` 与 `transport.rs`: shared transport error taxonomy 与 reqwest execute/stream mapping；retry crate 通过 `codex_http_client` 导入 `Request`/`TransportError`。[E: codex-rs/http-client/src/error.rs:10][E: codex-rs/http-client/src/transport.rs:36][E: codex-rs/codex-client/src/retry.rs:1][E: codex-rs/codex-client/src/retry.rs:3]
- `codex-rs/codex-api/src/error.rs`: endpoint-level `ApiError` variants。[E: codex-rs/codex-api/src/error.rs:10][E: codex-rs/codex-api/src/error.rs:24][E: codex-rs/codex-api/src/error.rs:36][E: codex-rs/codex-api/src/error.rs:40][E: codex-rs/codex-api/src/error.rs:44]
- `codex-rs/codex-api/src/api_bridge.rs`: maps `ApiError`/`TransportError` into core `CodexErr`。[E: codex-rs/codex-api/src/api_bridge.rs:20][E: codex-rs/codex-api/src/api_bridge.rs:79][E: codex-rs/codex-api/src/api_bridge.rs:94][E: codex-rs/codex-api/src/api_bridge.rs:135]

## 数据模型

- `RetryConfig` has max_attempts、base_delay、retry_429、retry_5xx、retry_transport and converts to `RetryPolicy` with `RetryOn` booleans。[E: codex-rs/codex-client/src/provider.rs:18][E: codex-rs/codex-client/src/provider.rs:19][E: codex-rs/codex-client/src/provider.rs:20][E: codex-rs/codex-client/src/provider.rs:21][E: codex-rs/codex-client/src/provider.rs:22][E: codex-rs/codex-client/src/provider.rs:23][E: codex-rs/codex-client/src/provider.rs:27][E: codex-rs/codex-client/src/provider.rs:31]
- `TransportError` 区分 Policy、HTTP status/body、RetryLimit、Timeout、Connection、Network、Build、ResponseTooLarge。[E: codex-rs/http-client/src/error.rs:10][E: codex-rs/http-client/src/error.rs:12][E: codex-rs/http-client/src/error.rs:14][E: codex-rs/http-client/src/error.rs:22][E: codex-rs/http-client/src/error.rs:24][E: codex-rs/http-client/src/error.rs:26][E: codex-rs/http-client/src/error.rs:28][E: codex-rs/http-client/src/error.rs:30][E: codex-rs/http-client/src/error.rs:32]
- `ApiError` includes transport, typed API status, stream, context window, quota, usage-not-included, retryable with delay, rate-limit, invalid request, cyber-policy, and server overloaded variants。[E: codex-rs/codex-api/src/error.rs:10][E: codex-rs/codex-api/src/error.rs:12][E: codex-rs/codex-api/src/error.rs:14][E: codex-rs/codex-api/src/error.rs:16][E: codex-rs/codex-api/src/error.rs:18][E: codex-rs/codex-api/src/error.rs:20][E: codex-rs/codex-api/src/error.rs:22][E: codex-rs/codex-api/src/error.rs:24][E: codex-rs/codex-api/src/error.rs:34][E: codex-rs/codex-api/src/error.rs:36][E: codex-rs/codex-api/src/error.rs:40][E: codex-rs/codex-api/src/error.rs:44]
- Core protocol 的 `ConnectionFailedError` 与 `ResponseStreamFailed` 现在都持有 shared `codex_http_client::HttpError`；HTTP status lookup 直接从该 source 读取，使普通连接失败与 response-stream failure 共用同一 transport error carrier。[E: codex-rs/protocol/src/error.rs:20][E: codex-rs/protocol/src/error.rs:517][E: codex-rs/protocol/src/error.rs:522][E: codex-rs/protocol/src/error.rs:523][E: codex-rs/protocol/src/error.rs:531][E: codex-rs/protocol/src/error.rs:532][E: codex-rs/protocol/src/error.rs:542][E: codex-rs/protocol/src/error.rs:543]

## 控制流

1. Provider retry config is converted to `RetryPolicy` by copying max attempts, base delay, and flags into `RetryOn`。[E: codex-rs/codex-client/src/provider.rs:27][E: codex-rs/codex-client/src/provider.rs:29][E: codex-rs/codex-client/src/provider.rs:31]
2. `RetryOn::should_retry` stops when `attempt >= max_attempts`; otherwise it retries HTTP 429/5xx based on flags and Timeout/Connection/Network based on `retry_transport`；Policy、Build、RetryLimit、ResponseTooLarge 不重试。[E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:24][E: codex-rs/codex-client/src/retry.rs:29][E: codex-rs/codex-client/src/retry.rs:32][E: codex-rs/codex-client/src/retry.rs:34][E: codex-rs/codex-client/src/retry.rs:38]
3. `backoff` returns base delay for attempt 0; for positive attempts it uses exponential delay and random jitter in range 0.9 to 1.1。[E: codex-rs/codex-client/src/retry.rs:43][E: codex-rs/codex-client/src/retry.rs:44][E: codex-rs/codex-client/src/retry.rs:50][E: codex-rs/codex-client/src/retry.rs:85]
4. `ReqwestTransport::map_error` maps `HttpError::Policy` to `TransportError::Policy`, `is_connect()` to `Connection`, timeout to `Timeout`, and remaining reqwest errors to `Network`。[E: codex-rs/http-client/src/transport.rs:120][E: codex-rs/http-client/src/transport.rs:122][E: codex-rs/http-client/src/transport.rs:123][E: codex-rs/http-client/src/transport.rs:124][E: codex-rs/http-client/src/transport.rs:125][E: codex-rs/http-client/src/transport.rs:126][E: codex-rs/http-client/src/transport.rs:127][E: codex-rs/http-client/src/transport.rs:129]
5. `ReqwestTransport::execute` sends the request then turns non-success HTTP into `TransportError::Http` with status/url/headers/body; successful responses return status/headers/body bytes。[E: codex-rs/http-client/src/transport.rs:175][E: codex-rs/http-client/src/transport.rs:188][E: codex-rs/http-client/src/transport.rs:200][E: codex-rs/http-client/src/transport.rs:205][E: codex-rs/http-client/src/transport.rs:208]
6. SSE `"response.failed"` calls `parse_failed_response`; that classifier maps flex-unavailable payloads first, then recognized codes into typed `ApiError` (context window, quota, usage-not-included, cyber-policy, bio-policy, misalignment-policy-violation, invalid prompt, server overloaded, `rate_limit_exceeded`/`slow_down` → `ApiError::RateLimitExceeded`); other parseable failed errors become `ApiError::Retryable`, while missing or unparseable error payloads remain `ApiError::Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:413][E: codex-rs/codex-api/src/sse/responses.rs:414][E: codex-rs/codex-api/src/sse/responses.rs:415][E: codex-rs/codex-api/src/sse/responses_error.rs:25][E: codex-rs/codex-api/src/sse/responses_error.rs:29][E: codex-rs/codex-api/src/sse/responses_error.rs:38][E: codex-rs/codex-api/src/sse/responses_error.rs:42][E: codex-rs/codex-api/src/sse/responses_error.rs:48][E: codex-rs/codex-api/src/sse/responses_error.rs:49][E: codex-rs/codex-api/src/sse/responses_error.rs:50][E: codex-rs/codex-api/src/sse/responses_error.rs:53][E: codex-rs/codex-api/src/sse/responses_error.rs:62][E: codex-rs/codex-api/src/sse/responses_error.rs:76][E: codex-rs/codex-api/src/sse/responses_error.rs:81][E: codex-rs/codex-api/src/sse/responses_error.rs:82][E: codex-rs/codex-api/src/sse/responses_error.rs:84][E: codex-rs/codex-api/src/sse/responses_error.rs:89]
7. `map_api_error` maps typed `ApiError` variants to core errors: context window, quota, usage-not-included, retryable stream with delay, ordinary stream, server overloaded, invalid request, cyber-policy, and SSE `ApiError::RateLimitExceeded` to core `RateLimitExceeded`。[E: codex-rs/codex-api/src/api_bridge.rs:20][E: codex-rs/codex-api/src/api_bridge.rs:50][E: codex-rs/codex-api/src/api_bridge.rs:51][E: codex-rs/codex-api/src/api_bridge.rs:52][E: codex-rs/codex-api/src/api_bridge.rs:45][E: codex-rs/codex-api/src/api_bridge.rs:55][E: codex-rs/codex-api/src/api_bridge.rs:56][E: codex-rs/codex-api/src/api_bridge.rs:58][E: codex-rs/codex-api/src/api_bridge.rs:71][E: codex-rs/codex-api/src/api_bridge.rs:74]
8. HTTP 503 body with error code `server_is_overloaded` or `slow_down` maps to `CodexErr::ServerOverloaded`; HTTP 400 image-data text maps to invalid image request; HTTP 429 usage-limit JSON can map to `UsageLimitReached` or `UsageNotIncluded`。[E: codex-rs/codex-api/src/api_bridge.rs:94][E: codex-rs/codex-api/src/api_bridge.rs:78][E: codex-rs/codex-api/src/api_bridge.rs:81][E: codex-rs/codex-api/src/api_bridge.rs:85][E: codex-rs/codex-api/src/api_bridge.rs:128][E: codex-rs/codex-api/src/api_bridge.rs:135][E: codex-rs/codex-api/src/api_bridge.rs:141][E: codex-rs/codex-api/src/api_bridge.rs:175][E: codex-rs/codex-api/src/api_bridge.rs:188]

## 设计动机与权衡

- Default provider conversion disables 429 retry but enables 5xx and transport retry, so rate limits normally surface to higher layers instead of being hidden by generic retry。[E: codex-rs/model-provider-info/src/lib.rs:446][E: codex-rs/model-provider-info/src/lib.rs:449][E: codex-rs/model-provider-info/src/lib.rs:450][E: codex-rs/model-provider-info/src/lib.rs:451][E: codex-rs/model-provider-info/src/lib.rs:451]
- Retry is transport-level; stream item transport errors are represented by the bytes stream, while SSE semantic errors are parsed after the stream is established and represented as `ApiError`, not retried by `codex-client::run_with_retry`。[E: codex-rs/http-client/src/transport.rs:250][E: codex-rs/http-client/src/transport.rs:250][E: codex-rs/http-client/src/transport.rs:156][E: codex-rs/codex-api/src/sse/responses.rs:473][E: codex-rs/codex-api/src/sse/responses.rs:574][E: codex-rs/codex-api/src/sse/responses.rs:586][I]
- `map_api_error` preserves request tracking data for unexpected HTTP status through headers like `cf-ray`, request id, and identity auth errors。[E: codex-rs/codex-api/src/api_bridge.rs:202][E: codex-rs/codex-api/src/api_bridge.rs:203][E: codex-rs/codex-api/src/api_bridge.rs:204][E: codex-rs/codex-api/src/api_bridge.rs:214][E: codex-rs/codex-api/src/api_bridge.rs:242][E: codex-rs/codex-api/src/api_bridge.rs:243][E: codex-rs/codex-api/src/api_bridge.rs:246][E: codex-rs/codex-api/src/api_bridge.rs:294]

## gotcha

- `TransportError::RetryLimit` maps to core retry-limit with status 500 and no request id; HTTP 429 fallback maps to core retry-limit with actual status/request id when usage-limit JSON is not parsed into a richer error。[E: codex-rs/codex-api/src/api_bridge.rs:192][E: codex-rs/codex-api/src/api_bridge.rs:187][E: codex-rs/codex-api/src/api_bridge.rs:194][E: codex-rs/codex-api/src/api_bridge.rs:235][E: codex-rs/codex-api/src/api_bridge.rs:237][E: codex-rs/codex-api/src/api_bridge.rs:239][E: codex-rs/codex-api/src/api_bridge.rs:255]
- Leftover `ApiError::RateLimit(String)` still maps to `CodexErr::Stream`; it is not the SSE `rate_limit_exceeded`/`slow_down` path, which uses `ApiError::RateLimitExceeded` → core `RateLimitExceeded`。[E: codex-rs/codex-api/src/api_bridge.rs:269][E: codex-rs/codex-api/src/api_bridge.rs:55][E: codex-rs/codex-api/src/sse/responses_error.rs:82]
- `RetryOn::should_retry` uses caller-provided attempt index; max attempts semantics depend on callers such as `run_with_retry`。[E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:85]
- `Feature::UnboundedConnectionRetries`（key `unbounded_connection_retries`，Stable，默认开）让 sampling 路径的 `ConnectionFailed` 走独立 connection-retry 循环：5s 起步、倍增到 60s 上限，不消耗普通 `max_retries`。该路径排除 internal session source 与 Amazon Bedrock；耗尽普通 retries 后仍可 `try_switch_fallback_transport` 永久切到 HTTPS。[E: codex-rs/features/src/lib.rs:1293][E: codex-rs/features/src/lib.rs:1294][E: codex-rs/features/src/lib.rs:1296][E: codex-rs/core/src/responses_retry.rs:74]

## Sources

- codex-rs/codex-api/src/error.rs
- codex-rs/codex-client/src/provider.rs
- codex-rs/codex-api/src/provider.rs
- codex-rs/codex-api/src/api_bridge.rs
- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/sse/responses_error.rs
- codex-rs/http-client/src/error.rs
- codex-rs/codex-client/src/retry.rs
- codex-rs/http-client/src/transport.rs
- codex-rs/model-provider-info/src/lib.rs
- codex-rs/protocol/src/error.rs
- codex-rs/core/src/responses_retry.rs
- codex-rs/features/src/lib.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.http-client`
- `subsys.providers.responses-api`
- `subsys.providers.sse-streaming`
