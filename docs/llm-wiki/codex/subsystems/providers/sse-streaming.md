---
id: subsys.providers.sse-streaming
title: SSE streaming
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/sse/responses.rs, codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/rate_limits.rs, codex-rs/codex-api/src/safety_buffering.rs]
symbols: [spawn_response_stream, process_sse, process_responses_event, ResponsesStreamEvent, ResponseEvent, SafetyBuffering, SafetyBufferingTreatment, treatment_from_headers, try_parse_retry_after]
related: [subsys.providers.responses-api, subsys.providers.retry-errors, subsys.providers.http-client]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> SSE streaming subsystem converts a `ByteStream` parsed as SSE via `eventsource()` into `ResponseEvent` values, pre-emits response headers such as model/rate limits/etag/reasoning flags, then parses each Responses stream event until `response.completed` or an error terminal condition。[E: codex-rs/codex-api/src/sse/responses.rs:34][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:46][E: codex-rs/codex-api/src/sse/responses.rs:51][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:327][E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:492][E: codex-rs/codex-api/src/sse/responses.rs:581][E: codex-rs/codex-api/src/sse/responses.rs:587]

## 能回答的问题

- SSE response headers 怎样变成 model、rate-limit、etag events？
- 哪些 Responses stream event types 会产生 Codex `ResponseEvent`？
- `response.failed` 如何映射 context window、quota、cyber-policy、invalid prompt、server overloaded、retryable？
- stream close、idle timeout、missing completed 怎样报错？
- retry-after delay 从哪里解析？

## 职责边界

`sse/responses.rs` 负责把 `StreamResponse` headers and SSE data 解析为 `ResponseEvent` 或 `ApiError`；request construction、transport retry、core error mapping 不在 `sse/responses.rs` 实现，超出本节点的 cited source set。[E: codex-rs/codex-api/src/sse/responses.rs:34][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:327][E: codex-rs/codex-api/src/sse/responses.rs:492][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/sse/responses.rs`: header pre-events、SSE loop、event parser、retry-delay parser、error classifiers。[E: codex-rs/codex-api/src/sse/responses.rs:34][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:327][E: codex-rs/codex-api/src/sse/responses.rs:492][E: codex-rs/codex-api/src/sse/responses.rs:599][E: codex-rs/codex-api/src/sse/responses.rs:625][E: codex-rs/codex-api/src/sse/responses.rs:629]
- `codex-rs/codex-api/src/common.rs`: `ResponseEvent` and `ResponseStream` normalized types。[E: codex-rs/codex-api/src/common.rs:74][E: codex-rs/codex-api/src/common.rs:345]
- `codex-rs/codex-api/src/rate_limits.rs`: response header parser used by `sse/responses.rs`, plus a separate `codex.rate_limits` event payload parser definition。[E: codex-rs/codex-api/src/sse/responses.rs:6][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/rate_limits.rs:28][E: codex-rs/codex-api/src/rate_limits.rs:134]

## 数据模型

- `ResponsesStreamEvent` deserializes `type` as `kind` and optional headers/metadata/response/item/item_id/call_id/delta/`text`/summary_index/content_index/safety_buffering fields；`text` supports the completed reasoning-summary event。[E: codex-rs/codex-api/src/sse/responses.rs:160][E: codex-rs/codex-api/src/sse/responses.rs:161][E: codex-rs/codex-api/src/sse/responses.rs:163][E: codex-rs/codex-api/src/sse/responses.rs:164][E: codex-rs/codex-api/src/sse/responses.rs:165][E: codex-rs/codex-api/src/sse/responses.rs:166][E: codex-rs/codex-api/src/sse/responses.rs:167][E: codex-rs/codex-api/src/sse/responses.rs:168][E: codex-rs/codex-api/src/sse/responses.rs:169][E: codex-rs/codex-api/src/sse/responses.rs:170][E: codex-rs/codex-api/src/sse/responses.rs:171][E: codex-rs/codex-api/src/sse/responses.rs:172][E: codex-rs/codex-api/src/sse/responses.rs:173][E: codex-rs/codex-api/src/sse/responses.rs:174]
- `ResponseCompletedUsage` converts input/output/total token fields and cached/cache-write/reasoning details into `TokenUsage`；missing `cache_write_tokens` defaults to zero。[E: codex-rs/codex-api/src/sse/responses.rs:123][E: codex-rs/codex-api/src/sse/responses.rs:124][E: codex-rs/codex-api/src/sse/responses.rs:125][E: codex-rs/codex-api/src/sse/responses.rs:126][E: codex-rs/codex-api/src/sse/responses.rs:127][E: codex-rs/codex-api/src/sse/responses.rs:128][E: codex-rs/codex-api/src/sse/responses.rs:131][E: codex-rs/codex-api/src/sse/responses.rs:134][E: codex-rs/codex-api/src/sse/responses.rs:137][E: codex-rs/codex-api/src/sse/responses.rs:148][E: codex-rs/codex-api/src/sse/responses.rs:152]
- `SafetyBuffering` carries wire `retry_model` as `faster_model` plus non-wire `show_buffering_ui`；header treatment supplies a fallback faster model only when the SSE payload omits the key。[E: codex-rs/codex-api/src/common.rs:123][E: codex-rs/codex-api/src/common.rs:127][E: codex-rs/codex-api/src/common.rs:129][E: codex-rs/codex-api/src/common.rs:133][E: codex-rs/codex-api/src/safety_buffering.rs:4][E: codex-rs/codex-api/src/safety_buffering.rs:8][E: codex-rs/codex-api/src/safety_buffering.rs:14][E: codex-rs/codex-api/src/sse/responses.rs:236][E: codex-rs/codex-api/src/sse/responses.rs:241][E: codex-rs/codex-api/src/sse/responses.rs:243][E: codex-rs/codex-api/src/sse/responses.rs:244]
- Error payload includes optional type/code/message/plan_type/resets_at; error classification is code-based for context/quota/usage/cyber-policy/invalid/server-overloaded。[E: codex-rs/codex-api/src/sse/responses.rs:102][E: codex-rs/codex-api/src/sse/responses.rs:105][E: codex-rs/codex-api/src/sse/responses.rs:106][E: codex-rs/codex-api/src/sse/responses.rs:107][E: codex-rs/codex-api/src/sse/responses.rs:108][E: codex-rs/codex-api/src/sse/responses.rs:109][E: codex-rs/codex-api/src/sse/responses.rs:625][E: codex-rs/codex-api/src/sse/responses.rs:629]

## 控制流

1. `spawn_response_stream` parses all rate-limit headers, reads `X-Models-Etag` and `OpenAI-Model`, presence-checks `X-Reasoning-Included`, captures optional upstream request id, reads optional `x-codex-turn-state`, and spawns the SSE task。[E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:41][E: codex-rs/codex-api/src/sse/responses.rs:46][E: codex-rs/codex-api/src/sse/responses.rs:51][E: codex-rs/codex-api/src/sse/responses.rs:55][E: codex-rs/codex-api/src/sse/responses.rs:62][E: codex-rs/codex-api/src/sse/responses.rs:68][E: codex-rs/codex-api/src/sse/responses.rs:71]
2. The spawned task emits ServerModel, RateLimits, ModelsEtag, ServerReasoningIncluded events before calling `process_sse_with_treatment`。[E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:76][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:79][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:83][E: codex-rs/codex-api/src/sse/responses.rs:86]
3. `process_sse_with_treatment` polls the eventsource stream with idle timeout; parse errors in individual SSE data are logged and skipped, while stream errors or idle timeout send `ApiError::Stream` and return。[E: codex-rs/codex-api/src/sse/responses.rs:492][E: codex-rs/codex-api/src/sse/responses.rs:499][E: codex-rs/codex-api/src/sse/responses.rs:505][E: codex-rs/codex-api/src/sse/responses.rs:511][E: codex-rs/codex-api/src/sse/responses.rs:513][E: codex-rs/codex-api/src/sse/responses.rs:523][E: codex-rs/codex-api/src/sse/responses.rs:525][E: codex-rs/codex-api/src/sse/responses.rs:533][E: codex-rs/codex-api/src/sse/responses.rs:536][E: codex-rs/codex-api/src/sse/responses.rs:537]
4. If the stream closes before `response.completed`, `process_sse_with_treatment` emits the saved response error or `stream closed before response.completed`。[E: codex-rs/codex-api/src/sse/responses.rs:516][E: codex-rs/codex-api/src/sse/responses.rs:517][E: codex-rs/codex-api/src/sse/responses.rs:520]
5. `response.output_item.done` and `response.output_item.added` parse `ResponseItem`; text delta、custom tool call input delta、reasoning summary/content deltas、summary part added become matching variants；`response.reasoning_summary_text.done` additionally emits item id、full text、summary index as `ReasoningSummaryDone`。[E: codex-rs/codex-api/src/sse/responses.rs:331][E: codex-rs/codex-api/src/sse/responses.rs:333][E: codex-rs/codex-api/src/sse/responses.rs:339][E: codex-rs/codex-api/src/sse/responses.rs:344][E: codex-rs/codex-api/src/sse/responses.rs:355][E: codex-rs/codex-api/src/sse/responses.rs:363][E: codex-rs/codex-api/src/sse/responses.rs:364][E: codex-rs/codex-api/src/sse/responses.rs:367][E: codex-rs/codex-api/src/common.rs:107]
6. `response.completed` parses response id and usage, emits `ResponseEvent::Completed`, and `process_sse_with_treatment` returns immediately after sending it。[E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:436][E: codex-rs/codex-api/src/sse/responses.rs:438][E: codex-rs/codex-api/src/sse/responses.rs:439][E: codex-rs/codex-api/src/sse/responses.rs:440][E: codex-rs/codex-api/src/sse/responses.rs:581][E: codex-rs/codex-api/src/sse/responses.rs:583][E: codex-rs/codex-api/src/sse/responses.rs:587]
7. `response.failed` starts as `ApiError::Stream`, maps recognized provider error codes into typed `ApiError` including cyber-policy；`invalid_prompt` and `bio_policy` both map `InvalidRequest`，other parseable provider errors map `Retryable`, missing/unparseable payload stays `Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:387][E: codex-rs/codex-api/src/sse/responses.rs:389][E: codex-rs/codex-api/src/sse/responses.rs:393][E: codex-rs/codex-api/src/sse/responses.rs:399][E: codex-rs/codex-api/src/sse/responses.rs:402][E: codex-rs/codex-api/src/sse/responses.rs:407][E: codex-rs/codex-api/src/sse/responses.rs:408][E: codex-rs/codex-api/src/sse/responses.rs:411][E: codex-rs/codex-api/src/sse/responses.rs:416][E: codex-rs/codex-api/src/sse/responses.rs:419]
8. Retry delay parsing only runs when error code is `rate_limit_exceeded`, then extracts “try again in <number> s|ms|seconds” from the message。[E: codex-rs/codex-api/src/sse/responses.rs:599][E: codex-rs/codex-api/src/sse/responses.rs:600][E: codex-rs/codex-api/src/sse/responses.rs:604][E: codex-rs/codex-api/src/sse/responses.rs:605][E: codex-rs/codex-api/src/sse/responses.rs:608][E: codex-rs/codex-api/src/sse/responses.rs:612][E: codex-rs/codex-api/src/sse/responses.rs:615][E: codex-rs/codex-api/src/sse/responses.rs:618]

## 设计动机与权衡

- `response_model()` checks `response.headers` before top-level `headers`, so normal Responses stream metadata wins over websocket metadata event headers。[E: codex-rs/codex-api/src/sse/responses.rs:187][E: codex-rs/codex-api/src/sse/responses.rs:188][E: codex-rs/codex-api/src/sse/responses.rs:194][E: codex-rs/codex-api/src/sse/responses.rs:196][I]
- For safety buffering, a wire `retry_model` key wins even when its value is null；only key absence falls back to `x-codex-safety-buffering-faster-model`, while every parsed SSE buffering item sets `show_buffering_ui = true`。[E: codex-rs/codex-api/src/sse/responses.rs:240][E: codex-rs/codex-api/src/sse/responses.rs:241][E: codex-rs/codex-api/src/sse/responses.rs:242][E: codex-rs/codex-api/src/sse/responses.rs:243][E: codex-rs/codex-api/src/sse/responses.rs:244][E: codex-rs/codex-api/src/sse/responses.rs:245]
- Server model changes are de-duplicated by `last_server_model`, so repeated identical model metadata does not emit duplicate `ServerModel` events。[E: codex-rs/codex-api/src/sse/responses.rs:501][E: codex-rs/codex-api/src/sse/responses.rs:544][E: codex-rs/codex-api/src/sse/responses.rs:545][E: codex-rs/codex-api/src/sse/responses.rs:548][E: codex-rs/codex-api/src/sse/responses.rs:554]
- In the `sse/responses.rs` SSE path, rate-limit updates are pre-emitted from response headers through `parse_all_rate_limits`; `rate_limits.rs` also defines `parse_rate_limit_event` for `codex.rate_limits` payloads, but `sse/responses.rs` imports only `parse_all_rate_limits` from that module。[E: codex-rs/codex-api/src/sse/responses.rs:6][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/rate_limits.rs:134][E: codex-rs/codex-api/src/rate_limits.rs:136][E: codex-rs/codex-api/src/rate_limits.rs:156][I]

## gotcha

- A `response.failed` event does not immediately send the error; `process_sse_with_treatment` stores it as `response_error` and emits it if the stream closes without completed。[E: codex-rs/codex-api/src/sse/responses.rs:500][E: codex-rs/codex-api/src/sse/responses.rs:516][E: codex-rs/codex-api/src/sse/responses.rs:593]
- An SSE JSON parse failure for one event is skipped, not fatal; this can hide malformed intermediate events until missing completed triggers stream close error。[E: codex-rs/codex-api/src/sse/responses.rs:533][E: codex-rs/codex-api/src/sse/responses.rs:536][E: codex-rs/codex-api/src/sse/responses.rs:537]
- `response.incomplete` always becomes stream error with incomplete reason text, not a retryable typed error。[E: codex-rs/codex-api/src/sse/responses.rs:423][E: codex-rs/codex-api/src/sse/responses.rs:424][E: codex-rs/codex-api/src/sse/responses.rs:431][E: codex-rs/codex-api/src/sse/responses.rs:432]

## Sources

- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/rate_limits.rs
- codex-rs/codex-api/src/safety_buffering.rs

## 相关

- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.http-client`
