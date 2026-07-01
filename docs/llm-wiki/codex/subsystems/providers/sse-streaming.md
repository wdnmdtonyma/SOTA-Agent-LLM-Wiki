---
id: subsys.providers.sse-streaming
title: SSE streaming
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/sse/responses.rs, codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/rate_limits.rs]
symbols: [spawn_response_stream, process_sse, process_responses_event, ResponsesStreamEvent, ResponseEvent, try_parse_retry_after]
related: [subsys.providers.responses-api, subsys.providers.retry-errors, subsys.providers.http-client]
evidence: explicit
status: verified
updated: db887d03e1
---

> SSE streaming subsystem converts a `ByteStream` parsed as SSE via `eventsource()` into `ResponseEvent` values, pre-emits response headers such as model/rate limits/etag/reasoning flags, then parses each Responses stream event until `response.completed` or an error terminal condition。[E: codex-rs/codex-api/src/sse/responses.rs:34][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:46][E: codex-rs/codex-api/src/sse/responses.rs:51][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:315][E: codex-rs/codex-api/src/sse/responses.rs:410][E: codex-rs/codex-api/src/sse/responses.rs:468][E: codex-rs/codex-api/src/sse/responses.rs:559][E: codex-rs/codex-api/src/sse/responses.rs:565]

## 能回答的问题

- SSE response headers 怎样变成 model、rate-limit、etag events？
- 哪些 Responses stream event types 会产生 Codex `ResponseEvent`？
- `response.failed` 如何映射 context window、quota、cyber-policy、invalid prompt、server overloaded、retryable？
- stream close、idle timeout、missing completed 怎样报错？
- retry-after delay 从哪里解析？

## 职责边界

`sse/responses.rs` 负责把 `StreamResponse` headers and SSE data 解析为 `ResponseEvent` 或 `ApiError`；request construction、transport retry、core error mapping 不在 `sse/responses.rs` 实现，超出本节点的 cited source set。[E: codex-rs/codex-api/src/sse/responses.rs:34][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:315][E: codex-rs/codex-api/src/sse/responses.rs:468][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/sse/responses.rs`: header pre-events、SSE loop、event parser、retry-delay parser、error classifiers。[E: codex-rs/codex-api/src/sse/responses.rs:34][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:315][E: codex-rs/codex-api/src/sse/responses.rs:468][E: codex-rs/codex-api/src/sse/responses.rs:577][E: codex-rs/codex-api/src/sse/responses.rs:603][E: codex-rs/codex-api/src/sse/responses.rs:607]
- `codex-rs/codex-api/src/common.rs`: `ResponseEvent` and `ResponseStream` normalized types。[E: codex-rs/codex-api/src/common.rs:74][E: codex-rs/codex-api/src/common.rs:333]
- `codex-rs/codex-api/src/rate_limits.rs`: response header parser used by `sse/responses.rs`, plus a separate `codex.rate_limits` event payload parser definition。[E: codex-rs/codex-api/src/sse/responses.rs:6][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/rate_limits.rs:28][E: codex-rs/codex-api/src/rate_limits.rs:133]

## 数据模型

- `ResponsesStreamEvent` deserializes `type` as `kind` and optional headers/metadata/response/item/item_id/call_id/delta/summary_index/content_index/safety_buffering fields。[E: codex-rs/codex-api/src/sse/responses.rs:159][E: codex-rs/codex-api/src/sse/responses.rs:160][E: codex-rs/codex-api/src/sse/responses.rs:162][E: codex-rs/codex-api/src/sse/responses.rs:163][E: codex-rs/codex-api/src/sse/responses.rs:164][E: codex-rs/codex-api/src/sse/responses.rs:165][E: codex-rs/codex-api/src/sse/responses.rs:166][E: codex-rs/codex-api/src/sse/responses.rs:167][E: codex-rs/codex-api/src/sse/responses.rs:168][E: codex-rs/codex-api/src/sse/responses.rs:169][E: codex-rs/codex-api/src/sse/responses.rs:170][E: codex-rs/codex-api/src/sse/responses.rs:171][E: codex-rs/codex-api/src/sse/responses.rs:172]
- `ResponseCompletedUsage` converts input/output/total token fields and cached/reasoning details into `TokenUsage`。[E: codex-rs/codex-api/src/sse/responses.rs:123][E: codex-rs/codex-api/src/sse/responses.rs:124][E: codex-rs/codex-api/src/sse/responses.rs:125][E: codex-rs/codex-api/src/sse/responses.rs:126][E: codex-rs/codex-api/src/sse/responses.rs:127][E: codex-rs/codex-api/src/sse/responses.rs:128][E: codex-rs/codex-api/src/sse/responses.rs:131][E: codex-rs/codex-api/src/sse/responses.rs:133][E: codex-rs/codex-api/src/sse/responses.rs:139][E: codex-rs/codex-api/src/sse/responses.rs:144]
- Error payload includes optional type/code/message/plan_type/resets_at; error classification is code-based for context/quota/usage/cyber-policy/invalid/server-overloaded。[E: codex-rs/codex-api/src/sse/responses.rs:102][E: codex-rs/codex-api/src/sse/responses.rs:105][E: codex-rs/codex-api/src/sse/responses.rs:106][E: codex-rs/codex-api/src/sse/responses.rs:107][E: codex-rs/codex-api/src/sse/responses.rs:108][E: codex-rs/codex-api/src/sse/responses.rs:109][E: codex-rs/codex-api/src/sse/responses.rs:603][E: codex-rs/codex-api/src/sse/responses.rs:607]

## 控制流

1. `spawn_response_stream` parses all rate-limit headers, reads `X-Models-Etag` and `OpenAI-Model`, presence-checks `X-Reasoning-Included`, captures optional upstream request id, reads optional `x-codex-turn-state`, and spawns the SSE task。[E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:41][E: codex-rs/codex-api/src/sse/responses.rs:46][E: codex-rs/codex-api/src/sse/responses.rs:51][E: codex-rs/codex-api/src/sse/responses.rs:55][E: codex-rs/codex-api/src/sse/responses.rs:62][E: codex-rs/codex-api/src/sse/responses.rs:68][E: codex-rs/codex-api/src/sse/responses.rs:71]
2. The spawned task emits ServerModel, RateLimits, ModelsEtag, ServerReasoningIncluded events before calling `process_sse_with_treatment`。[E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:76][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:79][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:83][E: codex-rs/codex-api/src/sse/responses.rs:86]
3. `process_sse_with_treatment` polls the eventsource stream with idle timeout; parse errors in individual SSE data are logged and skipped, while stream errors or idle timeout send `ApiError::Stream` and return。[E: codex-rs/codex-api/src/sse/responses.rs:468][E: codex-rs/codex-api/src/sse/responses.rs:475][E: codex-rs/codex-api/src/sse/responses.rs:481][E: codex-rs/codex-api/src/sse/responses.rs:487][E: codex-rs/codex-api/src/sse/responses.rs:489][E: codex-rs/codex-api/src/sse/responses.rs:499][E: codex-rs/codex-api/src/sse/responses.rs:501][E: codex-rs/codex-api/src/sse/responses.rs:509][E: codex-rs/codex-api/src/sse/responses.rs:512][E: codex-rs/codex-api/src/sse/responses.rs:513]
4. If the stream closes before `response.completed`, `process_sse_with_treatment` emits the saved response error or `stream closed before response.completed`。[E: codex-rs/codex-api/src/sse/responses.rs:492][E: codex-rs/codex-api/src/sse/responses.rs:493][E: codex-rs/codex-api/src/sse/responses.rs:496]
5. `response.output_item.done` and `response.output_item.added` parse `ResponseItem`; text delta, custom tool call input delta, reasoning summary/content deltas, and summary part added become matching `ResponseEvent` variants。[E: codex-rs/codex-api/src/sse/responses.rs:319][E: codex-rs/codex-api/src/sse/responses.rs:321][E: codex-rs/codex-api/src/sse/responses.rs:322][E: codex-rs/codex-api/src/sse/responses.rs:327][E: codex-rs/codex-api/src/sse/responses.rs:329][E: codex-rs/codex-api/src/sse/responses.rs:332][E: codex-rs/codex-api/src/sse/responses.rs:336][E: codex-rs/codex-api/src/sse/responses.rs:343][E: codex-rs/codex-api/src/sse/responses.rs:345][E: codex-rs/codex-api/src/sse/responses.rs:351][E: codex-rs/codex-api/src/sse/responses.rs:428][E: codex-rs/codex-api/src/sse/responses.rs:431][E: codex-rs/codex-api/src/sse/responses.rs:436][E: codex-rs/codex-api/src/sse/responses.rs:438]
6. `response.completed` parses response id and usage, emits `ResponseEvent::Completed`, and `process_sse_with_treatment` returns immediately after sending it。[E: codex-rs/codex-api/src/sse/responses.rs:410][E: codex-rs/codex-api/src/sse/responses.rs:412][E: codex-rs/codex-api/src/sse/responses.rs:414][E: codex-rs/codex-api/src/sse/responses.rs:415][E: codex-rs/codex-api/src/sse/responses.rs:416][E: codex-rs/codex-api/src/sse/responses.rs:559][E: codex-rs/codex-api/src/sse/responses.rs:561][E: codex-rs/codex-api/src/sse/responses.rs:565]
7. `response.failed` starts as `ApiError::Stream`, maps recognized provider error codes into typed `ApiError` including cyber-policy, maps other parseable provider errors into `ApiError::Retryable`, and leaves missing/unparseable error payloads as `ApiError::Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:364][E: codex-rs/codex-api/src/sse/responses.rs:366][E: codex-rs/codex-api/src/sse/responses.rs:370][E: codex-rs/codex-api/src/sse/responses.rs:372][E: codex-rs/codex-api/src/sse/responses.rs:374][E: codex-rs/codex-api/src/sse/responses.rs:376][E: codex-rs/codex-api/src/sse/responses.rs:379][E: codex-rs/codex-api/src/sse/responses.rs:384][E: codex-rs/codex-api/src/sse/responses.rs:387][E: codex-rs/codex-api/src/sse/responses.rs:389][E: codex-rs/codex-api/src/sse/responses.rs:395]
8. Retry delay parsing only runs when error code is `rate_limit_exceeded`, then extracts “try again in <number> s|ms|seconds” from the message。[E: codex-rs/codex-api/src/sse/responses.rs:577][E: codex-rs/codex-api/src/sse/responses.rs:578][E: codex-rs/codex-api/src/sse/responses.rs:582][E: codex-rs/codex-api/src/sse/responses.rs:583][E: codex-rs/codex-api/src/sse/responses.rs:586][E: codex-rs/codex-api/src/sse/responses.rs:590][E: codex-rs/codex-api/src/sse/responses.rs:593][E: codex-rs/codex-api/src/sse/responses.rs:596]

## 设计动机与权衡

- `response_model()` checks `response.headers` before top-level `headers`, so normal Responses stream metadata wins over websocket metadata event headers。[E: codex-rs/codex-api/src/sse/responses.rs:185][E: codex-rs/codex-api/src/sse/responses.rs:186][E: codex-rs/codex-api/src/sse/responses.rs:192][E: codex-rs/codex-api/src/sse/responses.rs:194][I]
- Server model changes are de-duplicated by `last_server_model`, so repeated identical model metadata does not emit duplicate `ServerModel` events。[E: codex-rs/codex-api/src/sse/responses.rs:477][E: codex-rs/codex-api/src/sse/responses.rs:522][E: codex-rs/codex-api/src/sse/responses.rs:523][E: codex-rs/codex-api/src/sse/responses.rs:526][E: codex-rs/codex-api/src/sse/responses.rs:532]
- In the `sse/responses.rs` SSE path, rate-limit updates are pre-emitted from response headers through `parse_all_rate_limits`; `rate_limits.rs` also defines `parse_rate_limit_event` for `codex.rate_limits` payloads, but `sse/responses.rs` imports only `parse_all_rate_limits` from that module。[E: codex-rs/codex-api/src/sse/responses.rs:6][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/rate_limits.rs:133][E: codex-rs/codex-api/src/rate_limits.rs:135][E: codex-rs/codex-api/src/rate_limits.rs:155][I]

## gotcha

- A `response.failed` event does not immediately send the error; `process_sse_with_treatment` stores it as `response_error` and emits it if the stream closes without completed。[E: codex-rs/codex-api/src/sse/responses.rs:476][E: codex-rs/codex-api/src/sse/responses.rs:492][E: codex-rs/codex-api/src/sse/responses.rs:571]
- An SSE JSON parse failure for one event is skipped, not fatal; this can hide malformed intermediate events until missing completed triggers stream close error。[E: codex-rs/codex-api/src/sse/responses.rs:509][E: codex-rs/codex-api/src/sse/responses.rs:512][E: codex-rs/codex-api/src/sse/responses.rs:513]
- `response.incomplete` always becomes stream error with incomplete reason text, not a retryable typed error。[E: codex-rs/codex-api/src/sse/responses.rs:399][E: codex-rs/codex-api/src/sse/responses.rs:400][E: codex-rs/codex-api/src/sse/responses.rs:407][E: codex-rs/codex-api/src/sse/responses.rs:408]

## Sources

- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/rate_limits.rs

## 相关

- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.http-client`
