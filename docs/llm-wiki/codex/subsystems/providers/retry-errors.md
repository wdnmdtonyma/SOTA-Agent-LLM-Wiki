---
id: subsys.providers.retry-errors
title: Provider retry and errors
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/error.rs, codex-rs/codex-api/src/provider.rs, codex-rs/codex-api/src/api_bridge.rs, codex-rs/codex-api/src/sse/responses.rs, codex-rs/http-client/src/error.rs, codex-rs/codex-client/src/retry.rs, codex-rs/http-client/src/transport.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/protocol/src/error.rs, codex-rs/core/src/responses_retry.rs, codex-rs/features/src/lib.rs]
symbols: [ApiError, RetryConfig, Provider, map_api_error, HttpError, TransportError, RetryPolicy, RetryOn, run_with_retry, ConnectionFailedError, ResponseStreamFailed, handle_retryable_response_stream_error, UnboundedConnectionRetries]
related: [subsys.providers.overview, subsys.providers.http-client, subsys.providers.responses-api, subsys.providers.sse-streaming]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Retry/error handling spans three layers: provider config becomes `RetryPolicy`, `http-client` defines transport errors while `codex-client` retries those transport/HTTP failures, and `codex-api` defines `ApiError` plus maps it into core `CodexErr`。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:25][E: codex-rs/http-client/src/error.rs:8][E: codex-rs/codex-client/src/retry.rs:1][E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:47][E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/api_bridge.rs:18]

## 能回答的问题

- Provider retry config 的 429/5xx/transport flags 如何生效？
- HTTP status、timeout、network、build error 在哪一层区分？
- SSE `response.failed` 如何变成 retryable/context/quota/cyber-policy/invalid/server-overloaded errors？
- `ApiError` 如何映射成 core `CodexErr`？
- 429 usage-limit body 和 headers 如何产生 usage-limit rich error？
- `unbounded_connection_retries` 何时绕过普通 max_retries？

## 职责边界

`http-client` owns `TransportError` and transport execution；`codex-client` owns transport-level request retry；`codex-api` handles endpoint-specific stream errors and public API error enum；`map_api_error` converts `ApiError` into core `CodexErr`。[E: codex-rs/http-client/src/error.rs:8][E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/codex-client/src/retry.rs:47][E: codex-rs/codex-api/src/sse/responses.rs:390][E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/api_bridge.rs:18]

## 关键 crate/文件

- `codex-rs/codex-api/src/provider.rs`: high-level `RetryConfig` and provider endpoint helper methods。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:24][E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:53][E: codex-rs/codex-api/src/provider.rs:88]
- `codex-rs/codex-client/src/retry.rs`: retry policy decisions, exponential backoff with jitter, retry loop。[E: codex-rs/codex-client/src/retry.rs:8][E: codex-rs/codex-client/src/retry.rs:15][E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:34][E: codex-rs/codex-client/src/retry.rs:47]
- `codex-rs/http-client/src/error.rs` 与 `transport.rs`: shared transport error taxonomy 与 reqwest execute/stream mapping；retry crate 通过 `codex_http_client` 导入 `Request`/`TransportError`。[E: codex-rs/http-client/src/error.rs:8][E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/codex-client/src/retry.rs:1][E: codex-rs/codex-client/src/retry.rs:2]
- `codex-rs/codex-api/src/error.rs`: endpoint-level `ApiError` variants。[E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/error.rs:21][E: codex-rs/codex-api/src/error.rs:28][E: codex-rs/codex-api/src/error.rs:30][E: codex-rs/codex-api/src/error.rs:32]
- `codex-rs/codex-api/src/api_bridge.rs`: maps `ApiError`/`TransportError` into core `CodexErr`。[E: codex-rs/codex-api/src/api_bridge.rs:18][E: codex-rs/codex-api/src/api_bridge.rs:49][E: codex-rs/codex-api/src/api_bridge.rs:59][E: codex-rs/codex-api/src/api_bridge.rs:92]

## 数据模型

- `RetryConfig` has max_attempts、base_delay、retry_429、retry_5xx、retry_transport and converts to `RetryPolicy` with `RetryOn` booleans。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:17][E: codex-rs/codex-api/src/provider.rs:18][E: codex-rs/codex-api/src/provider.rs:19][E: codex-rs/codex-api/src/provider.rs:20][E: codex-rs/codex-api/src/provider.rs:21][E: codex-rs/codex-api/src/provider.rs:25][E: codex-rs/codex-api/src/provider.rs:27][E: codex-rs/codex-api/src/provider.rs:29][E: codex-rs/codex-api/src/provider.rs:30][E: codex-rs/codex-api/src/provider.rs:31][E: codex-rs/codex-api/src/provider.rs:32]
- `TransportError` distinguishes HTTP response status/body, retry limit, timeout, network, and build failures。[E: codex-rs/http-client/src/error.rs:8][E: codex-rs/http-client/src/error.rs:10][E: codex-rs/http-client/src/error.rs:11][E: codex-rs/http-client/src/error.rs:14][E: codex-rs/http-client/src/error.rs:17][E: codex-rs/http-client/src/error.rs:17][E: codex-rs/http-client/src/error.rs:21][E: codex-rs/http-client/src/error.rs:23]
- `ApiError` includes transport, typed API status, stream, context window, quota, usage-not-included, retryable with delay, rate-limit, invalid request, cyber-policy, and server overloaded variants。[E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/error.rs:10][E: codex-rs/codex-api/src/error.rs:12][E: codex-rs/codex-api/src/error.rs:14][E: codex-rs/codex-api/src/error.rs:16][E: codex-rs/codex-api/src/error.rs:18][E: codex-rs/codex-api/src/error.rs:20][E: codex-rs/codex-api/src/error.rs:22][E: codex-rs/codex-api/src/error.rs:27][E: codex-rs/codex-api/src/error.rs:29][E: codex-rs/codex-api/src/error.rs:31][E: codex-rs/codex-api/src/error.rs:33]
- Core protocol 的 `ConnectionFailedError` 与 `ResponseStreamFailed` 现在都持有 shared `codex_http_client::HttpError`；HTTP status lookup 直接从该 source 读取，使普通连接失败与 response-stream failure 共用同一 transport error carrier。[E: codex-rs/protocol/src/error.rs:18][E: codex-rs/protocol/src/error.rs:460][E: codex-rs/protocol/src/error.rs:464][E: codex-rs/protocol/src/error.rs:472][E: codex-rs/protocol/src/error.rs:474][E: codex-rs/protocol/src/error.rs:483][E: codex-rs/protocol/src/error.rs:484]

## 控制流

1. Provider retry config is converted to `RetryPolicy` by copying max attempts, base delay, and flags into `RetryOn`。[E: codex-rs/codex-api/src/provider.rs:24][E: codex-rs/codex-api/src/provider.rs:26][E: codex-rs/codex-api/src/provider.rs:29]
2. `RetryOn::should_retry` stops when `attempt >= max_attempts`; otherwise it retries HTTP 429/5xx based on flags and Timeout/Network based on `retry_transport`。[E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:24][E: codex-rs/codex-client/src/retry.rs:28][E: codex-rs/codex-client/src/retry.rs:29][E: codex-rs/codex-client/src/retry.rs:29][E: codex-rs/codex-client/src/retry.rs:32]
3. `backoff` returns base delay for attempt 0; for positive attempts it uses exponential delay and random jitter in range 0.9 to 1.1, and `run_with_retry` sleeps `backoff(base_delay, attempt + 1)` before retrying。[E: codex-rs/codex-client/src/retry.rs:34][E: codex-rs/codex-client/src/retry.rs:39][E: codex-rs/codex-client/src/retry.rs:41][E: codex-rs/codex-client/src/retry.rs:45][E: codex-rs/codex-client/src/retry.rs:65]
4. `ReqwestTransport::map_error` maps reqwest timeout to `TransportError::Timeout` and other reqwest errors to `TransportError::Network`。[E: codex-rs/http-client/src/transport.rs:80][E: codex-rs/http-client/src/transport.rs:81][E: codex-rs/http-client/src/transport.rs:82][E: codex-rs/http-client/src/transport.rs:84]
5. `ReqwestTransport::execute` turns non-success HTTP into `TransportError::Http` with status/url/headers/body; successful responses return status/headers/body bytes。[E: codex-rs/http-client/src/transport.rs:109][E: codex-rs/http-client/src/transport.rs:115][E: codex-rs/http-client/src/transport.rs:121][E: codex-rs/http-client/src/transport.rs:123][E: codex-rs/http-client/src/transport.rs:124][E: codex-rs/http-client/src/transport.rs:125][E: codex-rs/http-client/src/transport.rs:126][E: codex-rs/http-client/src/transport.rs:127][E: codex-rs/http-client/src/transport.rs:129][E: codex-rs/http-client/src/transport.rs:133]
6. SSE `response.failed` classifies recognized provider error codes into typed `ApiError` including context window, quota, usage-not-included, cyber-policy, invalid request, and server overloaded; other parseable failed errors become `ApiError::Retryable`, while missing or unparseable error payloads remain `ApiError::Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:390][E: codex-rs/codex-api/src/sse/responses.rs:391][E: codex-rs/codex-api/src/sse/responses.rs:396][E: codex-rs/codex-api/src/sse/responses.rs:398][E: codex-rs/codex-api/src/sse/responses.rs:399][E: codex-rs/codex-api/src/sse/responses.rs:399][E: codex-rs/codex-api/src/sse/responses.rs:411][E: codex-rs/codex-api/src/sse/responses.rs:414][E: codex-rs/codex-api/src/sse/responses.rs:416][E: codex-rs/codex-api/src/sse/responses.rs:422]
7. `map_api_error` maps typed `ApiError` variants to core errors: context window, quota, usage-not-included, retryable stream with delay, ordinary stream, server overloaded, invalid request, cyber-policy, and rate-limit stream。[E: codex-rs/codex-api/src/api_bridge.rs:18][E: codex-rs/codex-api/src/api_bridge.rs:21][E: codex-rs/codex-api/src/api_bridge.rs:22][E: codex-rs/codex-api/src/api_bridge.rs:23][E: codex-rs/codex-api/src/api_bridge.rs:23][E: codex-rs/codex-api/src/api_bridge.rs:29][E: codex-rs/codex-api/src/api_bridge.rs:32][E: codex-rs/codex-api/src/api_bridge.rs:44][E: codex-rs/codex-api/src/api_bridge.rs:47][E: codex-rs/codex-api/src/api_bridge.rs:152]
8. HTTP 503 body with error code `server_is_overloaded` or `slow_down` maps to `CodexErr::ServerOverloaded`; HTTP 400 image-data text maps to invalid image request; HTTP 429 usage-limit JSON can map to `UsageLimitReached` or `UsageNotIncluded`。[E: codex-rs/codex-api/src/api_bridge.rs:59][E: codex-rs/codex-api/src/api_bridge.rs:66][E: codex-rs/codex-api/src/api_bridge.rs:69][E: codex-rs/codex-api/src/api_bridge.rs:72][E: codex-rs/codex-api/src/api_bridge.rs:86][E: codex-rs/codex-api/src/api_bridge.rs:92][E: codex-rs/codex-api/src/api_bridge.rs:96][E: codex-rs/codex-api/src/api_bridge.rs:114][E: codex-rs/codex-api/src/api_bridge.rs:122]

## 设计动机与权衡

- Default provider conversion disables 429 retry but enables 5xx and transport retry, so rate limits normally surface to higher layers instead of being hidden by generic retry。[E: codex-rs/model-provider-info/src/lib.rs:265][E: codex-rs/model-provider-info/src/lib.rs:266][E: codex-rs/model-provider-info/src/lib.rs:266][E: codex-rs/model-provider-info/src/lib.rs:268][E: codex-rs/model-provider-info/src/lib.rs:269][E: codex-rs/model-provider-info/src/lib.rs:270][I]
- Retry is transport-level; stream item transport errors are represented by the bytes stream, while SSE semantic errors are parsed after the stream is established and represented as `ApiError`, not retried by `codex-client::run_with_retry`。[E: codex-rs/http-client/src/transport.rs:153][E: codex-rs/http-client/src/transport.rs:153][E: codex-rs/http-client/src/transport.rs:156][E: codex-rs/codex-api/src/sse/responses.rs:493][E: codex-rs/codex-api/src/sse/responses.rs:584][E: codex-rs/codex-api/src/sse/responses.rs:596][I]
- `map_api_error` preserves request tracking data for unexpected HTTP status through headers like `cf-ray`, request id, and identity auth errors。[E: codex-rs/codex-api/src/api_bridge.rs:136][E: codex-rs/codex-api/src/api_bridge.rs:137][E: codex-rs/codex-api/src/api_bridge.rs:138][E: codex-rs/codex-api/src/api_bridge.rs:142][E: codex-rs/codex-api/src/api_bridge.rs:157][E: codex-rs/codex-api/src/api_bridge.rs:158][E: codex-rs/codex-api/src/api_bridge.rs:161][E: codex-rs/codex-api/src/api_bridge.rs:201]

## gotcha

- `TransportError::RetryLimit` maps to core retry-limit with status 500 and no request id; HTTP 429 fallback maps to core retry-limit with actual status/request id when usage-limit JSON is not parsed into a richer error。[E: codex-rs/codex-api/src/api_bridge.rs:126][E: codex-rs/codex-api/src/api_bridge.rs:121][E: codex-rs/codex-api/src/api_bridge.rs:128][E: codex-rs/codex-api/src/api_bridge.rs:152][E: codex-rs/codex-api/src/api_bridge.rs:146][E: codex-rs/codex-api/src/api_bridge.rs:142]
- `ApiError::RateLimit` currently maps to `CodexErr::Stream`, not a distinct core rate-limit error variant。[E: codex-rs/codex-api/src/api_bridge.rs:152]
- `RetryOn::should_retry` uses caller-provided attempt index; max attempts semantics depend on callers such as `run_with_retry` looping `0..=max_attempts`。[E: codex-rs/codex-client/src/retry.rs:22][E: codex-rs/codex-client/src/retry.rs:80]
- `Feature::UnboundedConnectionRetries`（key `unbounded_connection_retries`，Stable，默认开）让 sampling 路径的 `ConnectionFailed` 走独立 connection-retry 循环：5s 起步、倍增到 60s 上限，不消耗普通 `max_retries`。该路径排除 internal session source 与 Amazon Bedrock；耗尽普通 retries 后仍可 `try_switch_fallback_transport` 永久切到 HTTPS。[E: codex-rs/features/src/lib.rs:1072][E: codex-rs/core/src/responses_retry.rs:61][E: codex-rs/core/src/responses_retry.rs:17][E: codex-rs/core/src/responses_retry.rs:85][E: codex-rs/core/src/client.rs:1910]

## Sources

- codex-rs/codex-api/src/error.rs
- codex-rs/codex-api/src/provider.rs
- codex-rs/codex-api/src/api_bridge.rs
- codex-rs/codex-api/src/sse/responses.rs
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
