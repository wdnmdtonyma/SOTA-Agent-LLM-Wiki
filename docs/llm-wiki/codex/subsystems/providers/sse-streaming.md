---
id: subsys.providers.sse-streaming
title: SSE streaming
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/sse/responses.rs, codex-rs/codex-api/src/sse/responses_error.rs, codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/rate_limits.rs, codex-rs/codex-api/src/safety_buffering.rs, codex-rs/protocol/src/protocol.rs]
symbols: [spawn_response_stream, process_sse, process_sse_with_treatment, process_responses_event, ResponsesStreamEvent, ResponseEvent, SafetyBuffering, SafetyBufferingTreatment, treatment_from_headers, parse_failed_response, try_parse_retry_delay]
related: [subsys.providers.responses-api, subsys.providers.retry-errors, subsys.providers.http-client, subsys.core.rollout-budget]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> SSE streaming subsystem converts a `ByteStream` parsed as SSE via `eventsource()` into `ResponseEvent` values, pre-emits response headers such as model/rate limits/etag/reasoning flags, then parses each Responses stream event until `response.completed` or an error terminal condition。[E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/sse/responses.rs:43][E: codex-rs/codex-api/src/sse/responses.rs:49][E: codex-rs/codex-api/src/sse/responses.rs:54][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:84][E: codex-rs/codex-api/src/sse/responses.rs:89][E: codex-rs/codex-api/src/sse/responses.rs:418][E: codex-rs/codex-api/src/sse/responses.rs:443][E: codex-rs/codex-api/src/sse/responses.rs:521][E: codex-rs/codex-api/src/sse/responses.rs:627][E: codex-rs/codex-api/src/sse/responses.rs:632]

## 能回答的问题

- SSE response headers 怎样变成 model、rate-limit、etag events？
- 哪些 Responses stream event types 会产生 Codex `ResponseEvent`？
- `response.failed` 如何映射 context window、quota、cyber-policy、invalid prompt、server overloaded、retryable？
- stream close、idle timeout、missing completed 怎样报错？
- retry-after delay 从哪里解析？

## 职责边界

`sse/responses.rs` 负责把 `StreamResponse` headers and SSE data 解析为 `ResponseEvent` 或 `ApiError`；failed-event 分类在 `sse/responses_error.rs`。request construction、transport retry、core error mapping 不在这些文件实现。[E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:413][E: codex-rs/codex-api/src/sse/responses.rs:521][E: codex-rs/codex-api/src/sse/responses_error.rs:25][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/sse/responses.rs`: header pre-events、SSE loop、event parser。[E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:326][E: codex-rs/codex-api/src/sse/responses.rs:521]
- `codex-rs/codex-api/src/sse/responses_error.rs`: `parse_failed_response` classifiers and `try_parse_retry_delay`.[E: codex-rs/codex-api/src/sse/responses_error.rs:25][E: codex-rs/codex-api/src/sse/responses_error.rs:41][E: codex-rs/codex-api/src/sse/responses_error.rs:82][E: codex-rs/codex-api/src/sse/responses_error.rs:96]
- `codex-rs/codex-api/src/common.rs`: `ResponseEvent` and `ResponseStream` normalized types。[E: codex-rs/codex-api/src/common.rs:81][E: codex-rs/codex-api/src/common.rs:413]
- `codex-rs/codex-api/src/rate_limits.rs`: response header parser used by `sse/responses.rs`, plus a separate `codex.rate_limits` event payload parser definition。[E: codex-rs/codex-api/src/sse/responses.rs:8][E: codex-rs/codex-api/src/sse/responses.rs:43][E: codex-rs/codex-api/src/rate_limits.rs:28][E: codex-rs/codex-api/src/rate_limits.rs:135]

## 数据模型

- `ResponsesStreamEvent` deserializes `type` as `kind` and optional headers/metadata/response/item/item_id/call_id/delta/`text`/summary_index/content_index/safety_buffering fields；`text` supports the completed reasoning-summary event。[E: codex-rs/codex-api/src/sse/responses.rs:161][E: codex-rs/codex-api/src/sse/responses.rs:159][E: codex-rs/codex-api/src/sse/responses.rs:161][E: codex-rs/codex-api/src/sse/responses.rs:162][E: codex-rs/codex-api/src/sse/responses.rs:163][E: codex-rs/codex-api/src/sse/responses.rs:164][E: codex-rs/codex-api/src/sse/responses.rs:166][E: codex-rs/codex-api/src/sse/responses.rs:167][E: codex-rs/codex-api/src/sse/responses.rs:168][E: codex-rs/codex-api/src/sse/responses.rs:169][E: codex-rs/codex-api/src/sse/responses.rs:170][E: codex-rs/codex-api/src/sse/responses.rs:171][E: codex-rs/codex-api/src/sse/responses.rs:172][E: codex-rs/codex-api/src/sse/responses.rs:174]
- `ResponseCompletedUsage` converts input/output/total token fields and cached/cache-write/reasoning details into `TokenUsage`；missing `cache_write_tokens` defaults to zero。它还解析 optional `codex_rollout_budget_units` 并原样保存为 JSON number，供 root-tree rollout accounting 优先使用。[E: codex-rs/codex-api/src/sse/responses.rs:118][E: codex-rs/codex-api/src/sse/responses.rs:125][E: codex-rs/codex-api/src/sse/responses.rs:128][E: codex-rs/codex-api/src/sse/responses.rs:131][E: codex-rs/codex-api/src/sse/responses.rs:140][E: codex-rs/codex-api/src/sse/responses.rs:141]
- `SafetyBuffering` carries wire `retry_model` as `faster_model` plus non-wire `show_buffering_ui`；header treatment supplies a fallback faster model only when the SSE payload omits the key。[E: codex-rs/codex-api/src/common.rs:135][E: codex-rs/codex-api/src/common.rs:139][E: codex-rs/codex-api/src/common.rs:141][E: codex-rs/codex-api/src/common.rs:145][E: codex-rs/codex-api/src/safety_buffering.rs:4][E: codex-rs/codex-api/src/safety_buffering.rs:8][E: codex-rs/codex-api/src/safety_buffering.rs:14][E: codex-rs/codex-api/src/sse/responses.rs:233][E: codex-rs/codex-api/src/sse/responses.rs:240][E: codex-rs/codex-api/src/sse/responses.rs:240][E: codex-rs/codex-api/src/sse/responses.rs:243]
- Error payload includes optional type/code/message/plan_type/resets_at/misalignment; classification is code-based for context/quota/usage/cyber-policy/bio-policy/invalid-prompt/server-overloaded/rate-limit。[E: codex-rs/codex-api/src/sse/responses_error.rs:15][E: codex-rs/codex-api/src/sse/responses_error.rs:16][E: codex-rs/codex-api/src/sse/responses_error.rs:17][E: codex-rs/codex-api/src/sse/responses_error.rs:18][E: codex-rs/codex-api/src/sse/responses_error.rs:19][E: codex-rs/codex-api/src/sse/responses_error.rs:22][E: codex-rs/codex-api/src/sse/responses_error.rs:41][E: codex-rs/codex-api/src/sse/responses_error.rs:53][E: codex-rs/codex-api/src/sse/responses_error.rs:76]

## 控制流

1. `spawn_response_stream` parses all rate-limit headers, reads `X-Models-Etag` and `OpenAI-Model`, presence-checks `X-Reasoning-Included`, captures optional upstream request id, reads optional `x-codex-turn-state`, and spawns the SSE task。[E: codex-rs/codex-api/src/sse/responses.rs:43][E: codex-rs/codex-api/src/sse/responses.rs:44][E: codex-rs/codex-api/src/sse/responses.rs:49][E: codex-rs/codex-api/src/sse/responses.rs:54][E: codex-rs/codex-api/src/sse/responses.rs:58][E: codex-rs/codex-api/src/sse/responses.rs:65][E: codex-rs/codex-api/src/sse/responses.rs:71][E: codex-rs/codex-api/src/sse/responses.rs:74]
2. The spawned task emits ServerModel, RateLimits, ModelsEtag, ServerReasoningIncluded events before calling `process_sse_with_treatment`。[E: codex-rs/codex-api/src/sse/responses.rs:75][E: codex-rs/codex-api/src/sse/responses.rs:76][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:79][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:82][E: codex-rs/codex-api/src/sse/responses.rs:84][E: codex-rs/codex-api/src/sse/responses.rs:86][E: codex-rs/codex-api/src/sse/responses.rs:89]
3. `process_sse_with_treatment` polls the eventsource stream with idle timeout; parse errors in individual SSE data are logged and skipped, while stream errors or idle timeout send `ApiError::Stream` and return。[E: codex-rs/codex-api/src/sse/responses.rs:521][E: codex-rs/codex-api/src/sse/responses.rs:528][E: codex-rs/codex-api/src/sse/responses.rs:537][E: codex-rs/codex-api/src/sse/responses.rs:550][E: codex-rs/codex-api/src/sse/responses.rs:562][E: codex-rs/codex-api/src/sse/responses.rs:572][E: codex-rs/codex-api/src/sse/responses.rs:574][E: codex-rs/codex-api/src/sse/responses.rs:582]
4. If the stream closes before `response.completed`, `process_sse_with_treatment` emits the saved response error or `stream closed before response.completed`。[E: codex-rs/codex-api/src/sse/responses.rs:555][E: codex-rs/codex-api/src/sse/responses.rs:556][E: codex-rs/codex-api/src/sse/responses.rs:559]
5. `response.output_item.done` and `response.output_item.added` parse `ResponseItem`; text delta、custom tool call input delta、reasoning summary/content deltas、summary part added become matching variants；`response.reasoning_summary_text.done` additionally emits item id、full text、summary index as `ReasoningSummaryDone`。[E: codex-rs/codex-api/src/sse/responses.rs:327][E: codex-rs/codex-api/src/sse/responses.rs:332][E: codex-rs/codex-api/src/sse/responses.rs:338][E: codex-rs/codex-api/src/sse/responses.rs:339][E: codex-rs/codex-api/src/sse/responses.rs:358][E: codex-rs/codex-api/src/sse/responses.rs:367][E: codex-rs/codex-api/src/sse/responses.rs:368][E: codex-rs/codex-api/src/sse/responses.rs:371][E: codex-rs/codex-api/src/common.rs:118]
6. `response.completed` and `response.incomplete` with reason `interrupted` parse response id/usage and emit `ResponseEvent::Completed`; `process_sse_with_treatment` returns immediately after sending Completed。[E: codex-rs/codex-api/src/sse/responses.rs:418][E: codex-rs/codex-api/src/sse/responses.rs:428][E: codex-rs/codex-api/src/sse/responses.rs:443][E: codex-rs/codex-api/src/sse/responses.rs:627][E: codex-rs/codex-api/src/sse/responses.rs:628][E: codex-rs/codex-api/src/sse/responses.rs:632]
7. `response.failed` calls `parse_failed_response`: `bio_policy` → `ApiError::BioPolicy`, `invalid_prompt` → `ApiError::InvalidPrompt`, `rate_limit_exceeded`/`slow_down` → `RateLimitExceeded`, other parseable codes map typed/Retryable, missing payload stays `Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:413][E: codex-rs/codex-api/src/sse/responses.rs:414][E: codex-rs/codex-api/src/sse/responses_error.rs:25][E: codex-rs/codex-api/src/sse/responses_error.rs:38][E: codex-rs/codex-api/src/sse/responses_error.rs:53][E: codex-rs/codex-api/src/sse/responses_error.rs:60][E: codex-rs/codex-api/src/sse/responses_error.rs:76][E: codex-rs/codex-api/src/sse/responses_error.rs:82][E: codex-rs/codex-api/src/sse/responses_error.rs:89]
8. Retry delay parsing runs for `rate_limit_exceeded` and `slow_down`, then extracts “try again in <number> s|ms|seconds” from the message。[E: codex-rs/codex-api/src/sse/responses_error.rs:82][E: codex-rs/codex-api/src/sse/responses_error.rs:83][E: codex-rs/codex-api/src/sse/responses_error.rs:96][E: codex-rs/codex-api/src/sse/responses_error.rs:108][E: codex-rs/codex-api/src/sse/responses_error.rs:110]

## 设计动机与权衡

- `response_model()` checks `response.headers` before top-level `headers`, so normal Responses stream metadata wins over websocket metadata event headers。[E: codex-rs/codex-api/src/sse/responses.rs:186][E: codex-rs/codex-api/src/sse/responses.rs:186][E: codex-rs/codex-api/src/sse/responses.rs:195][I]
- For safety buffering, a wire `retry_model` key wins even when its value is null；only key absence falls back to `x-codex-safety-buffering-faster-model`, while every parsed SSE buffering item sets `show_buffering_ui = true`。[E: codex-rs/codex-api/src/sse/responses.rs:239][E: codex-rs/codex-api/src/sse/responses.rs:240][E: codex-rs/codex-api/src/sse/responses.rs:240][E: codex-rs/codex-api/src/sse/responses.rs:240][E: codex-rs/codex-api/src/sse/responses.rs:243][E: codex-rs/codex-api/src/sse/responses.rs:244]
- Server model changes are de-duplicated by `last_server_model`, so repeated identical model metadata does not emit duplicate `ServerModel` events。[E: codex-rs/codex-api/src/sse/responses.rs:530][E: codex-rs/codex-api/src/sse/responses.rs:589][E: codex-rs/codex-api/src/sse/responses.rs:590][E: codex-rs/codex-api/src/sse/responses.rs:593][E: codex-rs/codex-api/src/sse/responses.rs:599]
- In the `sse/responses.rs` SSE path, rate-limit updates are pre-emitted from response headers through `parse_all_rate_limits`; `rate_limits.rs` also defines `parse_rate_limit_event` for `codex.rate_limits` payloads, but `sse/responses.rs` imports only `parse_all_rate_limits` from that module。[E: codex-rs/codex-api/src/sse/responses.rs:8][E: codex-rs/codex-api/src/sse/responses.rs:43][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/rate_limits.rs:135][E: codex-rs/codex-api/src/rate_limits.rs:137][E: codex-rs/codex-api/src/rate_limits.rs:157][I]

## gotcha

- `codex_rollout_budget_units` 是 provider-to-core 私有 accounting 字段：`TokenUsage` 对它同时 `skip_serializing`、跳过 JSON schema 与 TypeScript export；它不是新增的 app-server token-usage notification 字段。[E: codex-rs/protocol/src/protocol.rs:2259][E: codex-rs/protocol/src/protocol.rs:2254][E: codex-rs/protocol/src/protocol.rs:2256][E: codex-rs/protocol/src/protocol.rs:2256]
- A `response.failed` event does not immediately send the error (except `FlexUnavailable`); `process_sse_with_treatment` stores it as `response_error` and emits it if the stream closes without completed。[E: codex-rs/codex-api/src/sse/responses.rs:529][E: codex-rs/codex-api/src/sse/responses.rs:637][E: codex-rs/codex-api/src/sse/responses.rs:643]
- An SSE JSON parse failure for one event is skipped, not fatal; this can hide malformed intermediate events until missing completed triggers stream close error。[E: codex-rs/codex-api/src/sse/responses.rs:572][E: codex-rs/codex-api/src/sse/responses.rs:574][E: codex-rs/codex-api/src/sse/responses.rs:582]
- `response.incomplete` with reason other than `interrupted` becomes `ApiError::Stream`; reason `interrupted` is treated as Completed with `end_turn: Some(false)`.[E: codex-rs/codex-api/src/sse/responses.rs:418][E: codex-rs/codex-api/src/sse/responses.rs:419][E: codex-rs/codex-api/src/sse/responses.rs:428][E: codex-rs/codex-api/src/sse/responses.rs:430][E: codex-rs/codex-api/src/sse/responses.rs:447]

## Sources

- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/sse/responses_error.rs
- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/rate_limits.rs
- codex-rs/codex-api/src/safety_buffering.rs

## 相关

- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.http-client`
