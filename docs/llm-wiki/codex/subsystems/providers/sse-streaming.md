---
id: subsys.providers.sse-streaming
title: SSE streaming
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/sse/responses.rs, codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/rate_limits.rs, codex-rs/codex-api/src/safety_buffering.rs, codex-rs/protocol/src/protocol.rs]
symbols: [spawn_response_stream, process_sse, process_responses_event, ResponsesStreamEvent, ResponseEvent, SafetyBuffering, SafetyBufferingTreatment, treatment_from_headers, try_parse_retry_after]
related: [subsys.providers.responses-api, subsys.providers.retry-errors, subsys.providers.http-client, subsys.core.rollout-budget]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> SSE streaming subsystem converts a `ByteStream` parsed as SSE via `eventsource()` into `ResponseEvent` values, pre-emits response headers such as model/rate limits/etag/reasoning flags, then parses each Responses stream event until `response.completed` or an error terminal condition。[E: codex-rs/codex-api/src/sse/responses.rs:36][E: codex-rs/codex-api/src/sse/responses.rs:42][E: codex-rs/codex-api/src/sse/responses.rs:48][E: codex-rs/codex-api/src/sse/responses.rs:53][E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:74][E: codex-rs/codex-api/src/sse/responses.rs:77][E: codex-rs/codex-api/src/sse/responses.rs:80][E: codex-rs/codex-api/src/sse/responses.rs:83][E: codex-rs/codex-api/src/sse/responses.rs:335][E: codex-rs/codex-api/src/sse/responses.rs:451][E: codex-rs/codex-api/src/sse/responses.rs:520][E: codex-rs/codex-api/src/sse/responses.rs:615][E: codex-rs/codex-api/src/sse/responses.rs:621]

## 能回答的问题

- SSE response headers 怎样变成 model、rate-limit、etag events？
- 哪些 Responses stream event types 会产生 Codex `ResponseEvent`？
- `response.failed` 如何映射 context window、quota、cyber-policy、invalid prompt、server overloaded、retryable？
- stream close、idle timeout、missing completed 怎样报错？
- retry-after delay 从哪里解析？

## 职责边界

`sse/responses.rs` 负责把 `StreamResponse` headers and SSE data 解析为 `ResponseEvent` 或 `ApiError`；request construction、transport retry、core error mapping 不在 `sse/responses.rs` 实现，超出本节点的 cited source set。[E: codex-rs/codex-api/src/sse/responses.rs:36][E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:335][E: codex-rs/codex-api/src/sse/responses.rs:520][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/sse/responses.rs`: header pre-events、SSE loop、event parser、retry-delay parser、error classifiers。[E: codex-rs/codex-api/src/sse/responses.rs:36][E: codex-rs/codex-api/src/sse/responses.rs:72][E: codex-rs/codex-api/src/sse/responses.rs:335][E: codex-rs/codex-api/src/sse/responses.rs:520][E: codex-rs/codex-api/src/sse/responses.rs:633][E: codex-rs/codex-api/src/sse/responses.rs:659][E: codex-rs/codex-api/src/sse/responses.rs:664]
- `codex-rs/codex-api/src/common.rs`: `ResponseEvent` and `ResponseStream` normalized types。[E: codex-rs/codex-api/src/common.rs:80][E: codex-rs/codex-api/src/common.rs:394]
- `codex-rs/codex-api/src/rate_limits.rs`: response header parser used by `sse/responses.rs`, plus a separate `codex.rate_limits` event payload parser definition。[E: codex-rs/codex-api/src/sse/responses.rs:6][E: codex-rs/codex-api/src/sse/responses.rs:42][E: codex-rs/codex-api/src/rate_limits.rs:28][E: codex-rs/codex-api/src/rate_limits.rs:135]

## 数据模型

- `ResponsesStreamEvent` deserializes `type` as `kind` and optional headers/metadata/response/item/item_id/call_id/delta/`text`/summary_index/content_index/safety_buffering fields；`text` supports the completed reasoning-summary event。[E: codex-rs/codex-api/src/sse/responses.rs:171][E: codex-rs/codex-api/src/sse/responses.rs:169][E: codex-rs/codex-api/src/sse/responses.rs:171][E: codex-rs/codex-api/src/sse/responses.rs:172][E: codex-rs/codex-api/src/sse/responses.rs:173][E: codex-rs/codex-api/src/sse/responses.rs:174][E: codex-rs/codex-api/src/sse/responses.rs:175][E: codex-rs/codex-api/src/sse/responses.rs:176][E: codex-rs/codex-api/src/sse/responses.rs:177][E: codex-rs/codex-api/src/sse/responses.rs:178][E: codex-rs/codex-api/src/sse/responses.rs:179][E: codex-rs/codex-api/src/sse/responses.rs:180][E: codex-rs/codex-api/src/sse/responses.rs:181][E: codex-rs/codex-api/src/sse/responses.rs:183]
- `ResponseCompletedUsage` converts input/output/total token fields and cached/cache-write/reasoning details into `TokenUsage`；missing `cache_write_tokens` defaults to zero。它还解析 optional `codex_rollout_budget_units` 并原样保存为 JSON number，供 root-tree rollout accounting 优先使用。[E: codex-rs/codex-api/src/sse/responses.rs:128][E: codex-rs/codex-api/src/sse/responses.rs:135][E: codex-rs/codex-api/src/sse/responses.rs:138][E: codex-rs/codex-api/src/sse/responses.rs:141][E: codex-rs/codex-api/src/sse/responses.rs:150][E: codex-rs/codex-api/src/sse/responses.rs:151]
- `SafetyBuffering` carries wire `retry_model` as `faster_model` plus non-wire `show_buffering_ui`；header treatment supplies a fallback faster model only when the SSE payload omits the key。[E: codex-rs/codex-api/src/common.rs:134][E: codex-rs/codex-api/src/common.rs:138][E: codex-rs/codex-api/src/common.rs:140][E: codex-rs/codex-api/src/common.rs:144][E: codex-rs/codex-api/src/safety_buffering.rs:4][E: codex-rs/codex-api/src/safety_buffering.rs:8][E: codex-rs/codex-api/src/safety_buffering.rs:14][E: codex-rs/codex-api/src/sse/responses.rs:242][E: codex-rs/codex-api/src/sse/responses.rs:249][E: codex-rs/codex-api/src/sse/responses.rs:249][E: codex-rs/codex-api/src/sse/responses.rs:252]
- Error payload includes optional type/code/message/plan_type/resets_at; error classification is code-based for context/quota/usage/cyber-policy/invalid/server-overloaded。[E: codex-rs/codex-api/src/sse/responses.rs:106][E: codex-rs/codex-api/src/sse/responses.rs:107][E: codex-rs/codex-api/src/sse/responses.rs:108][E: codex-rs/codex-api/src/sse/responses.rs:109][E: codex-rs/codex-api/src/sse/responses.rs:110][E: codex-rs/codex-api/src/sse/responses.rs:113][E: codex-rs/codex-api/src/sse/responses.rs:659][E: codex-rs/codex-api/src/sse/responses.rs:664]

## 控制流

1. `spawn_response_stream` parses all rate-limit headers, reads `X-Models-Etag` and `OpenAI-Model`, presence-checks `X-Reasoning-Included`, captures optional upstream request id, reads optional `x-codex-turn-state`, and spawns the SSE task。[E: codex-rs/codex-api/src/sse/responses.rs:42][E: codex-rs/codex-api/src/sse/responses.rs:43][E: codex-rs/codex-api/src/sse/responses.rs:48][E: codex-rs/codex-api/src/sse/responses.rs:53][E: codex-rs/codex-api/src/sse/responses.rs:57][E: codex-rs/codex-api/src/sse/responses.rs:64][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:73]
2. The spawned task emits ServerModel, RateLimits, ModelsEtag, ServerReasoningIncluded events before calling `process_sse_with_treatment`。[E: codex-rs/codex-api/src/sse/responses.rs:74][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:77][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:80][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:83][E: codex-rs/codex-api/src/sse/responses.rs:85][E: codex-rs/codex-api/src/sse/responses.rs:88]
3. `process_sse_with_treatment` polls the eventsource stream with idle timeout; parse errors in individual SSE data are logged and skipped, while stream errors or idle timeout send `ApiError::Stream` and return。[E: codex-rs/codex-api/src/sse/responses.rs:520][E: codex-rs/codex-api/src/sse/responses.rs:529][E: codex-rs/codex-api/src/sse/responses.rs:535][E: codex-rs/codex-api/src/sse/responses.rs:541][E: codex-rs/codex-api/src/sse/responses.rs:543][E: codex-rs/codex-api/src/sse/responses.rs:553][E: codex-rs/codex-api/src/sse/responses.rs:555][E: codex-rs/codex-api/src/sse/responses.rs:563][E: codex-rs/codex-api/src/sse/responses.rs:565][E: codex-rs/codex-api/src/sse/responses.rs:565]
4. If the stream closes before `response.completed`, `process_sse_with_treatment` emits the saved response error or `stream closed before response.completed`。[E: codex-rs/codex-api/src/sse/responses.rs:543][E: codex-rs/codex-api/src/sse/responses.rs:543][E: codex-rs/codex-api/src/sse/responses.rs:548]
5. `response.output_item.done` and `response.output_item.added` parse `ResponseItem`; text delta、custom tool call input delta、reasoning summary/content deltas、summary part added become matching variants；`response.reasoning_summary_text.done` additionally emits item id、full text、summary index as `ReasoningSummaryDone`。[E: codex-rs/codex-api/src/sse/responses.rs:336][E: codex-rs/codex-api/src/sse/responses.rs:341][E: codex-rs/codex-api/src/sse/responses.rs:347][E: codex-rs/codex-api/src/sse/responses.rs:348][E: codex-rs/codex-api/src/sse/responses.rs:362][E: codex-rs/codex-api/src/sse/responses.rs:371][E: codex-rs/codex-api/src/sse/responses.rs:372][E: codex-rs/codex-api/src/sse/responses.rs:375][E: codex-rs/codex-api/src/common.rs:117]
6. `response.completed` parses response id and usage, emits `ResponseEvent::Completed`, and `process_sse_with_treatment` returns immediately after sending it。[E: codex-rs/codex-api/src/sse/responses.rs:451][E: codex-rs/codex-api/src/sse/responses.rs:453][E: codex-rs/codex-api/src/sse/responses.rs:455][E: codex-rs/codex-api/src/sse/responses.rs:456][E: codex-rs/codex-api/src/sse/responses.rs:457][E: codex-rs/codex-api/src/sse/responses.rs:615][E: codex-rs/codex-api/src/sse/responses.rs:617][E: codex-rs/codex-api/src/sse/responses.rs:621]
7. `response.failed` starts as `ApiError::Stream`, maps recognized provider error codes into typed `ApiError` including cyber-policy；`invalid_prompt` and `bio_policy` both map `InvalidRequest`，other parseable provider errors map `Retryable`, missing/unparseable payload stays `Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:395][E: codex-rs/codex-api/src/sse/responses.rs:396][E: codex-rs/codex-api/src/sse/responses.rs:401][E: codex-rs/codex-api/src/sse/responses.rs:404][E: codex-rs/codex-api/src/sse/responses.rs:410][E: codex-rs/codex-api/src/sse/responses.rs:419][E: codex-rs/codex-api/src/sse/responses.rs:420][E: codex-rs/codex-api/src/sse/responses.rs:423][E: codex-rs/codex-api/src/sse/responses.rs:428][E: codex-rs/codex-api/src/sse/responses.rs:431]
8. Retry delay parsing only runs when error code is `rate_limit_exceeded`, then extracts “try again in <number> s|ms|seconds” from the message。[E: codex-rs/codex-api/src/sse/responses.rs:633][E: codex-rs/codex-api/src/sse/responses.rs:634][E: codex-rs/codex-api/src/sse/responses.rs:638][E: codex-rs/codex-api/src/sse/responses.rs:638][E: codex-rs/codex-api/src/sse/responses.rs:642][E: codex-rs/codex-api/src/sse/responses.rs:646][E: codex-rs/codex-api/src/sse/responses.rs:648][E: codex-rs/codex-api/src/sse/responses.rs:652]

## 设计动机与权衡

- `response_model()` checks `response.headers` before top-level `headers`, so normal Responses stream metadata wins over websocket metadata event headers。[E: codex-rs/codex-api/src/sse/responses.rs:195][E: codex-rs/codex-api/src/sse/responses.rs:195][E: codex-rs/codex-api/src/sse/responses.rs:204][I]
- For safety buffering, a wire `retry_model` key wins even when its value is null；only key absence falls back to `x-codex-safety-buffering-faster-model`, while every parsed SSE buffering item sets `show_buffering_ui = true`。[E: codex-rs/codex-api/src/sse/responses.rs:248][E: codex-rs/codex-api/src/sse/responses.rs:249][E: codex-rs/codex-api/src/sse/responses.rs:249][E: codex-rs/codex-api/src/sse/responses.rs:249][E: codex-rs/codex-api/src/sse/responses.rs:252][E: codex-rs/codex-api/src/sse/responses.rs:253]
- Server model changes are de-duplicated by `last_server_model`, so repeated identical model metadata does not emit duplicate `ServerModel` events。[E: codex-rs/codex-api/src/sse/responses.rs:531][E: codex-rs/codex-api/src/sse/responses.rs:574][E: codex-rs/codex-api/src/sse/responses.rs:575][E: codex-rs/codex-api/src/sse/responses.rs:577][E: codex-rs/codex-api/src/sse/responses.rs:587]
- In the `sse/responses.rs` SSE path, rate-limit updates are pre-emitted from response headers through `parse_all_rate_limits`; `rate_limits.rs` also defines `parse_rate_limit_event` for `codex.rate_limits` payloads, but `sse/responses.rs` imports only `parse_all_rate_limits` from that module。[E: codex-rs/codex-api/src/sse/responses.rs:6][E: codex-rs/codex-api/src/sse/responses.rs:42][E: codex-rs/codex-api/src/sse/responses.rs:77][E: codex-rs/codex-api/src/rate_limits.rs:135][E: codex-rs/codex-api/src/rate_limits.rs:137][E: codex-rs/codex-api/src/rate_limits.rs:157][I]

## gotcha

- `codex_rollout_budget_units` 是 provider-to-core 私有 accounting 字段：`TokenUsage` 对它同时 `skip_serializing`、跳过 JSON schema 与 TypeScript export；它不是新增的 app-server token-usage notification 字段。[E: codex-rs/protocol/src/protocol.rs:2255][E: codex-rs/protocol/src/protocol.rs:2250][E: codex-rs/protocol/src/protocol.rs:2252][E: codex-rs/protocol/src/protocol.rs:2252]
- A `response.failed` event does not immediately send the error; `process_sse_with_treatment` stores it as `response_error` and emits it if the stream closes without completed。[E: codex-rs/codex-api/src/sse/responses.rs:530][E: codex-rs/codex-api/src/sse/responses.rs:543][E: codex-rs/codex-api/src/sse/responses.rs:627]
- An SSE JSON parse failure for one event is skipped, not fatal; this can hide malformed intermediate events until missing completed triggers stream close error。[E: codex-rs/codex-api/src/sse/responses.rs:563][E: codex-rs/codex-api/src/sse/responses.rs:565][E: codex-rs/codex-api/src/sse/responses.rs:565]
- `response.incomplete` always becomes stream error with incomplete reason text, not a retryable typed error。[E: codex-rs/codex-api/src/sse/responses.rs:435][E: codex-rs/codex-api/src/sse/responses.rs:436][E: codex-rs/codex-api/src/sse/responses.rs:448][E: codex-rs/codex-api/src/sse/responses.rs:449]

## Sources

- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/rate_limits.rs
- codex-rs/codex-api/src/safety_buffering.rs

## 相关

- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.http-client`
