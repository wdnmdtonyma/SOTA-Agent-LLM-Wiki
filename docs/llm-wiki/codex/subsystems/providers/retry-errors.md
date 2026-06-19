---
id: subsys.providers.retry-errors
title: Provider retry and errors
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/error.rs, codex-rs/codex-api/src/provider.rs, codex-rs/codex-api/src/api_bridge.rs, codex-rs/codex-api/src/sse/responses.rs, codex-rs/codex-client/src/error.rs, codex-rs/codex-client/src/retry.rs, codex-rs/codex-client/src/transport.rs, codex-rs/model-provider-info/src/lib.rs]
symbols: [ApiError, RetryConfig, Provider, map_api_error, TransportError, RetryPolicy, RetryOn, run_with_retry]
related: [subsys.providers.overview, subsys.providers.http-client, subsys.providers.responses-api, subsys.providers.sse-streaming]
evidence: explicit
status: verified
updated: 5670360009
---

> Retry/error handling spans three layers: provider config becomes `RetryPolicy`, `codex-client` retries transport/HTTP failures, and `codex-api` defines `ApiError` plus maps it into core `CodexErr`。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:25][E: codex-rs/codex-api/src/provider.rs:33][E: codex-rs/codex-client/src/retry.rs:28][E: codex-rs/codex-client/src/retry.rs:32][E: codex-rs/codex-client/src/retry.rs:58][E: codex-rs/codex-client/src/retry.rs:67][E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/api_bridge.rs:18]

## 能回答的问题

- Provider retry config 的 429/5xx/transport flags 如何生效？
- HTTP status、timeout、network、build error 在哪一层区分？
- SSE `response.failed` 如何变成 retryable/context/quota/cyber-policy/invalid/server-overloaded errors？
- `ApiError` 如何映射成 core `CodexErr`？
- 429 usage-limit body 和 headers 如何产生 usage-limit rich error？

## 职责边界

`codex-client` handles transport-level request retry；`codex-api` handles endpoint-specific stream errors and public API error enum；`map_api_error` converts `ApiError` into core `CodexErr`。[E: codex-rs/codex-client/src/retry.rs:49][E: codex-rs/codex-api/src/sse/responses.rs:347][E: codex-rs/codex-api/src/sse/responses.rs:353][E: codex-rs/codex-api/src/sse/responses.rs:369][E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:525][E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/api_bridge.rs:18]

## 关键 crate/文件

- `codex-rs/codex-api/src/provider.rs`: high-level `RetryConfig` and provider endpoint helper methods。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:24][E: codex-rs/codex-api/src/provider.rs:43][E: codex-rs/codex-api/src/provider.rs:53][E: codex-rs/codex-api/src/provider.rs:77][E: codex-rs/codex-api/src/provider.rs:92]
- `codex-rs/codex-client/src/retry.rs`: retry policy decisions, exponential backoff with jitter, retry loop。[E: codex-rs/codex-client/src/retry.rs:9][E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:38][E: codex-rs/codex-client/src/retry.rs:49]
- `codex-rs/codex-api/src/error.rs`: endpoint-level `ApiError` variants。[E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/error.rs:22][E: codex-rs/codex-api/src/error.rs:29][E: codex-rs/codex-api/src/error.rs:31]
- `codex-rs/codex-api/src/api_bridge.rs`: maps `ApiError`/`TransportError` into core `CodexErr`。[E: codex-rs/codex-api/src/api_bridge.rs:18][E: codex-rs/codex-api/src/api_bridge.rs:35][E: codex-rs/codex-api/src/api_bridge.rs:36][E: codex-rs/codex-api/src/api_bridge.rs:37]

## 数据模型

- `RetryConfig` has max_attempts、base_delay、retry_429、retry_5xx、retry_transport and converts to `RetryPolicy` with `RetryOn` booleans。[E: codex-rs/codex-api/src/provider.rs:16][E: codex-rs/codex-api/src/provider.rs:17][E: codex-rs/codex-api/src/provider.rs:18][E: codex-rs/codex-api/src/provider.rs:19][E: codex-rs/codex-api/src/provider.rs:20][E: codex-rs/codex-api/src/provider.rs:21][E: codex-rs/codex-api/src/provider.rs:25][E: codex-rs/codex-api/src/provider.rs:27][E: codex-rs/codex-api/src/provider.rs:28][E: codex-rs/codex-api/src/provider.rs:30][E: codex-rs/codex-api/src/provider.rs:31][E: codex-rs/codex-api/src/provider.rs:32]
- `TransportError` distinguishes HTTP response status/body, retry limit, timeout, network, and build failures。[E: codex-rs/codex-client/src/error.rs:6][E: codex-rs/codex-client/src/error.rs:8][E: codex-rs/codex-client/src/error.rs:9][E: codex-rs/codex-client/src/error.rs:12][E: codex-rs/codex-client/src/error.rs:15][E: codex-rs/codex-client/src/error.rs:17][E: codex-rs/codex-client/src/error.rs:19][E: codex-rs/codex-client/src/error.rs:21]
- `ApiError` includes transport, typed API status, stream, context window, quota, usage-not-included, retryable with delay, rate-limit, invalid request, cyber-policy, and server overloaded variants。[E: codex-rs/codex-api/src/error.rs:8][E: codex-rs/codex-api/src/error.rs:10][E: codex-rs/codex-api/src/error.rs:12][E: codex-rs/codex-api/src/error.rs:14][E: codex-rs/codex-api/src/error.rs:16][E: codex-rs/codex-api/src/error.rs:18][E: codex-rs/codex-api/src/error.rs:20][E: codex-rs/codex-api/src/error.rs:22][E: codex-rs/codex-api/src/error.rs:24][E: codex-rs/codex-api/src/error.rs:27][E: codex-rs/codex-api/src/error.rs:29][E: codex-rs/codex-api/src/error.rs:31][E: codex-rs/codex-api/src/error.rs:33]

## 控制流

1. Provider retry config is converted to `RetryPolicy` by copying max attempts, base delay, and flags into `RetryOn`。[E: codex-rs/codex-api/src/provider.rs:24][E: codex-rs/codex-api/src/provider.rs:26][E: codex-rs/codex-api/src/provider.rs:29][E: codex-rs/codex-api/src/provider.rs:33]
2. `RetryOn::should_retry` stops when `attempt >= max_attempts`; otherwise it retries HTTP 429/5xx based on flags and Timeout/Network based on `retry_transport`。[E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:24][E: codex-rs/codex-client/src/retry.rs:28][E: codex-rs/codex-client/src/retry.rs:29][E: codex-rs/codex-client/src/retry.rs:30][E: codex-rs/codex-client/src/retry.rs:32]
3. `backoff` returns base delay for attempt 0; for positive attempts it uses exponential delay and random jitter in range 0.9 to 1.1, and `run_with_retry` sleeps `backoff(base_delay, attempt + 1)` before retrying。[E: codex-rs/codex-client/src/retry.rs:38][E: codex-rs/codex-client/src/retry.rs:39][E: codex-rs/codex-client/src/retry.rs:40][E: codex-rs/codex-client/src/retry.rs:42][E: codex-rs/codex-client/src/retry.rs:45][E: codex-rs/codex-client/src/retry.rs:67]
4. `ReqwestTransport::map_error` maps reqwest timeout to `TransportError::Timeout` and other reqwest errors to `TransportError::Network`。[E: codex-rs/codex-client/src/transport.rs:76][E: codex-rs/codex-client/src/transport.rs:77][E: codex-rs/codex-client/src/transport.rs:78][E: codex-rs/codex-client/src/transport.rs:80]
5. `ReqwestTransport::execute` turns non-success HTTP into `TransportError::Http` with status/url/headers/body; successful responses return status/headers/body bytes。[E: codex-rs/codex-client/src/transport.rs:97][E: codex-rs/codex-client/src/transport.rs:107][E: codex-rs/codex-client/src/transport.rs:109][E: codex-rs/codex-client/src/transport.rs:110][E: codex-rs/codex-client/src/transport.rs:111][E: codex-rs/codex-client/src/transport.rs:112][E: codex-rs/codex-client/src/transport.rs:113][E: codex-rs/codex-client/src/transport.rs:115][E: codex-rs/codex-client/src/transport.rs:116][E: codex-rs/codex-client/src/transport.rs:117][E: codex-rs/codex-client/src/transport.rs:118][E: codex-rs/codex-client/src/transport.rs:119][E: codex-rs/codex-client/src/transport.rs:120][E: codex-rs/codex-client/src/transport.rs:122][E: codex-rs/codex-client/src/transport.rs:123][E: codex-rs/codex-client/src/transport.rs:124][E: codex-rs/codex-client/src/transport.rs:125][E: codex-rs/codex-client/src/transport.rs:126]
6. SSE `response.failed` classifies recognized provider error codes into typed `ApiError` including context window, quota, usage-not-included, cyber-policy, invalid request, and server overloaded; other parseable failed errors become `ApiError::Retryable`, while missing or unparseable error payloads remain `ApiError::Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:347][E: codex-rs/codex-api/src/sse/responses.rs:349][E: codex-rs/codex-api/src/sse/responses.rs:353][E: codex-rs/codex-api/src/sse/responses.rs:355][E: codex-rs/codex-api/src/sse/responses.rs:357][E: codex-rs/codex-api/src/sse/responses.rs:359][E: codex-rs/codex-api/src/sse/responses.rs:361][E: codex-rs/codex-api/src/sse/responses.rs:362][E: codex-rs/codex-api/src/sse/responses.rs:367][E: codex-rs/codex-api/src/sse/responses.rs:370][E: codex-rs/codex-api/src/sse/responses.rs:372][E: codex-rs/codex-api/src/sse/responses.rs:378]
7. `map_api_error` maps typed `ApiError` variants to core errors: context window, quota, usage-not-included, retryable stream with delay, ordinary stream, server overloaded, invalid request, cyber-policy, and rate-limit stream。[E: codex-rs/codex-api/src/api_bridge.rs:18][E: codex-rs/codex-api/src/api_bridge.rs:20][E: codex-rs/codex-api/src/api_bridge.rs:21][E: codex-rs/codex-api/src/api_bridge.rs:22][E: codex-rs/codex-api/src/api_bridge.rs:23][E: codex-rs/codex-api/src/api_bridge.rs:24][E: codex-rs/codex-api/src/api_bridge.rs:25][E: codex-rs/codex-api/src/api_bridge.rs:35][E: codex-rs/codex-api/src/api_bridge.rs:36][E: codex-rs/codex-api/src/api_bridge.rs:135]
8. HTTP 503 body with error code `server_is_overloaded` or `slow_down` maps to `CodexErr::ServerOverloaded`; HTTP 400 image-data text maps to invalid image request; HTTP 429 usage-limit JSON can map to `UsageLimitReached` or `UsageNotIncluded`。[E: codex-rs/codex-api/src/api_bridge.rs:44][E: codex-rs/codex-api/src/api_bridge.rs:51][E: codex-rs/codex-api/src/api_bridge.rs:54][E: codex-rs/codex-api/src/api_bridge.rs:57][E: codex-rs/codex-api/src/api_bridge.rs:61][E: codex-rs/codex-api/src/api_bridge.rs:67][E: codex-rs/codex-api/src/api_bridge.rs:79][E: codex-rs/codex-api/src/api_bridge.rs:86]

## 设计动机与权衡

- Default provider conversion disables 429 retry but enables 5xx and transport retry, so rate limits normally surface to higher layers instead of being hidden by generic retry。[E: codex-rs/model-provider-info/src/lib.rs:257][E: codex-rs/model-provider-info/src/lib.rs:258][E: codex-rs/model-provider-info/src/lib.rs:259][E: codex-rs/model-provider-info/src/lib.rs:260][E: codex-rs/model-provider-info/src/lib.rs:261][E: codex-rs/model-provider-info/src/lib.rs:262][I]
- Retry is transport-level; stream item transport errors are represented by the bytes stream, while SSE semantic errors are parsed after the stream is established and represented as `ApiError`, not retried by `codex-client::run_with_retry`。[E: codex-rs/codex-client/src/transport.rs:153][E: codex-rs/codex-client/src/transport.rs:154][E: codex-rs/codex-client/src/transport.rs:155][E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:513][E: codex-rs/codex-api/src/sse/responses.rs:525][I]
- `map_api_error` preserves request tracking data for unexpected HTTP status through headers like `cf-ray`, request id, and identity auth errors。[E: codex-rs/codex-api/src/api_bridge.rs:112][E: codex-rs/codex-api/src/api_bridge.rs:116][E: codex-rs/codex-api/src/api_bridge.rs:117][E: codex-rs/codex-api/src/api_bridge.rs:118][E: codex-rs/codex-api/src/api_bridge.rs:120][E: codex-rs/codex-api/src/api_bridge.rs:122][E: codex-rs/codex-api/src/api_bridge.rs:153][E: codex-rs/codex-api/src/api_bridge.rs:154][E: codex-rs/codex-api/src/api_bridge.rs:157][E: codex-rs/codex-api/src/api_bridge.rs:159][E: codex-rs/codex-api/src/api_bridge.rs:162][E: codex-rs/codex-api/src/api_bridge.rs:166][E: codex-rs/codex-api/src/api_bridge.rs:170][E: codex-rs/codex-api/src/api_bridge.rs:181]

## gotcha

- `TransportError::RetryLimit` maps to core retry-limit with status 500 and no request id; HTTP 429 fallback maps to core retry-limit with actual status/request id when usage-limit JSON is not parsed into a richer error。[E: codex-rs/codex-api/src/api_bridge.rs:107][E: codex-rs/codex-api/src/api_bridge.rs:108][E: codex-rs/codex-api/src/api_bridge.rs:109][E: codex-rs/codex-api/src/api_bridge.rs:110][E: codex-rs/codex-api/src/api_bridge.rs:126][E: codex-rs/codex-api/src/api_bridge.rs:127][E: codex-rs/codex-api/src/api_bridge.rs:128][E: codex-rs/codex-api/src/api_bridge.rs:129]
- `ApiError::RateLimit` currently maps to `CodexErr::Stream`, not a distinct core rate-limit error variant。[E: codex-rs/codex-api/src/api_bridge.rs:135]
- `RetryOn::should_retry` uses caller-provided attempt index; max attempts semantics depend on callers such as `run_with_retry` looping `0..=max_attempts`。[E: codex-rs/codex-client/src/retry.rs:23][E: codex-rs/codex-client/src/retry.rs:49][E: codex-rs/codex-client/src/retry.rs:58]

## Sources

- codex-rs/codex-api/src/error.rs
- codex-rs/codex-api/src/provider.rs
- codex-rs/codex-api/src/api_bridge.rs
- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-client/src/error.rs
- codex-rs/codex-client/src/retry.rs
- codex-rs/codex-client/src/transport.rs
- codex-rs/model-provider-info/src/lib.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.http-client`
- `subsys.providers.responses-api`
- `subsys.providers.sse-streaming`
