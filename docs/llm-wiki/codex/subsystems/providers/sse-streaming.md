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
updated: 37aadeaa13
---

> SSE streaming subsystem converts a `ByteStream` parsed as SSE via `eventsource()` into `ResponseEvent` values, pre-emits response headers such as model/rate limits/etag/reasoning flags, then parses each Responses stream event until `response.completed` or an error terminal condition。[E: codex-rs/codex-api/src/sse/responses.rs:57][E: codex-rs/codex-api/src/sse/responses.rs:63][E: codex-rs/codex-api/src/sse/responses.rs:89][E: codex-rs/codex-api/src/sse/responses.rs:92][E: codex-rs/codex-api/src/sse/responses.rs:95][E: codex-rs/codex-api/src/sse/responses.rs:99][E: codex-rs/codex-api/src/sse/responses.rs:102][E: codex-rs/codex-api/src/sse/responses.rs:370][E: codex-rs/codex-api/src/sse/responses.rs:376][E: codex-rs/codex-api/src/sse/responses.rs:431]

## 能回答的问题

- SSE response headers 怎样变成 model、rate-limit、etag events？
- 哪些 Responses stream event types 会产生 Codex `ResponseEvent`？
- `response.failed` 如何映射 context window、quota、invalid prompt、server overloaded、retryable？
- stream close、idle timeout、missing completed 怎样报错？
- retry-after delay 从哪里解析？

## 职责边界

`sse/responses.rs` 负责把 `StreamResponse` headers and SSE data 解析为 `ResponseEvent` 或 `ApiError`；request construction、transport retry、core error mapping 不在 `sse/responses.rs` 实现，超出本节点的 cited source set。[E: codex-rs/codex-api/src/sse/responses.rs:57][E: codex-rs/codex-api/src/sse/responses.rs:238][E: codex-rs/codex-api/src/sse/responses.rs:370][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/sse/responses.rs`: fixture stream helper、header pre-events、SSE loop、event parser、retry-delay parser、error classifiers。[E: codex-rs/codex-api/src/sse/responses.rs:31][E: codex-rs/codex-api/src/sse/responses.rs:57][E: codex-rs/codex-api/src/sse/responses.rs:238][E: codex-rs/codex-api/src/sse/responses.rs:370][E: codex-rs/codex-api/src/sse/responses.rs:449][E: codex-rs/codex-api/src/sse/responses.rs:475][E: codex-rs/codex-api/src/sse/responses.rs:479][E: codex-rs/codex-api/src/sse/responses.rs:483][E: codex-rs/codex-api/src/sse/responses.rs:487][E: codex-rs/codex-api/src/sse/responses.rs:491]
- `codex-rs/codex-api/src/common.rs`: `ResponseEvent` and `ResponseStream` normalized types。[E: codex-rs/codex-api/src/common.rs:67][E: codex-rs/codex-api/src/common.rs:282]
- `codex-rs/codex-api/src/rate_limits.rs`: response header parser used by `sse/responses.rs`, plus a separate `codex.rate_limits` event payload parser definition。[E: codex-rs/codex-api/src/sse/responses.rs:4][E: codex-rs/codex-api/src/sse/responses.rs:63][E: codex-rs/codex-api/src/rate_limits.rs:27][E: codex-rs/codex-api/src/rate_limits.rs:131]

## 数据模型

- `ResponsesStreamEvent` deserializes `type` as `kind` and optional headers/response/item/item_id/call_id/delta/summary_index/content_index fields。[E: codex-rs/codex-api/src/sse/responses.rs:163][E: codex-rs/codex-api/src/sse/responses.rs:165][E: codex-rs/codex-api/src/sse/responses.rs:167][E: codex-rs/codex-api/src/sse/responses.rs:168][E: codex-rs/codex-api/src/sse/responses.rs:169][E: codex-rs/codex-api/src/sse/responses.rs:170][E: codex-rs/codex-api/src/sse/responses.rs:171][E: codex-rs/codex-api/src/sse/responses.rs:172][E: codex-rs/codex-api/src/sse/responses.rs:173][E: codex-rs/codex-api/src/sse/responses.rs:174]
- `ResponseCompletedUsage` converts input/output/total token fields and cached/reasoning details into `TokenUsage`。[E: codex-rs/codex-api/src/sse/responses.rs:126][E: codex-rs/codex-api/src/sse/responses.rs:128][E: codex-rs/codex-api/src/sse/responses.rs:130][E: codex-rs/codex-api/src/sse/responses.rs:132][E: codex-rs/codex-api/src/sse/responses.rs:135][E: codex-rs/codex-api/src/sse/responses.rs:138][E: codex-rs/codex-api/src/sse/responses.rs:143][E: codex-rs/codex-api/src/sse/responses.rs:144][E: codex-rs/codex-api/src/sse/responses.rs:148]
- Error payload includes optional type/code/message/plan_type/resets_at; error classification is code-based for context/quota/usage/invalid/server-overloaded。[E: codex-rs/codex-api/src/sse/responses.rs:108][E: codex-rs/codex-api/src/sse/responses.rs:111][E: codex-rs/codex-api/src/sse/responses.rs:112][E: codex-rs/codex-api/src/sse/responses.rs:113][E: codex-rs/codex-api/src/sse/responses.rs:114][E: codex-rs/codex-api/src/sse/responses.rs:115][E: codex-rs/codex-api/src/sse/responses.rs:475][E: codex-rs/codex-api/src/sse/responses.rs:479][E: codex-rs/codex-api/src/sse/responses.rs:483][E: codex-rs/codex-api/src/sse/responses.rs:487][E: codex-rs/codex-api/src/sse/responses.rs:491]

## 控制流

1. `spawn_response_stream` parses all rate-limit headers, reads `X-Models-Etag` and `OpenAI-Model`, presence-checks `X-Reasoning-Included`, and reads optional `x-codex-turn-state` before spawning the SSE task。[E: codex-rs/codex-api/src/sse/responses.rs:63][E: codex-rs/codex-api/src/sse/responses.rs:64][E: codex-rs/codex-api/src/sse/responses.rs:69][E: codex-rs/codex-api/src/sse/responses.rs:74][E: codex-rs/codex-api/src/sse/responses.rs:77][E: codex-rs/codex-api/src/sse/responses.rs:78]
2. The spawned task emits ServerModel, RateLimits, ModelsEtag, ServerReasoningIncluded events before calling `process_sse`。[E: codex-rs/codex-api/src/sse/responses.rs:87][E: codex-rs/codex-api/src/sse/responses.rs:89][E: codex-rs/codex-api/src/sse/responses.rs:92][E: codex-rs/codex-api/src/sse/responses.rs:95][E: codex-rs/codex-api/src/sse/responses.rs:99][E: codex-rs/codex-api/src/sse/responses.rs:102]
3. `process_sse` polls the eventsource stream with idle timeout; parse errors in individual SSE data are logged and skipped, while stream errors or idle timeout send `ApiError::Stream` and return。[E: codex-rs/codex-api/src/sse/responses.rs:370][E: codex-rs/codex-api/src/sse/responses.rs:382][E: codex-rs/codex-api/src/sse/responses.rs:388][E: codex-rs/codex-api/src/sse/responses.rs:400][E: codex-rs/codex-api/src/sse/responses.rs:410][E: codex-rs/codex-api/src/sse/responses.rs:413]
4. If the stream closes before `response.completed`, `process_sse` emits the saved response error or `stream closed before response.completed`。[E: codex-rs/codex-api/src/sse/responses.rs:393][E: codex-rs/codex-api/src/sse/responses.rs:394][E: codex-rs/codex-api/src/sse/responses.rs:397]
5. `response.output_item.done` and `response.output_item.added` parse `ResponseItem`; text delta, custom tool call input delta, reasoning summary/content deltas, and summary part added become matching `ResponseEvent` variants。[E: codex-rs/codex-api/src/sse/responses.rs:242][E: codex-rs/codex-api/src/sse/responses.rs:245][E: codex-rs/codex-api/src/sse/responses.rs:250][E: codex-rs/codex-api/src/sse/responses.rs:252][E: codex-rs/codex-api/src/sse/responses.rs:255][E: codex-rs/codex-api/src/sse/responses.rs:259][E: codex-rs/codex-api/src/sse/responses.rs:263][E: codex-rs/codex-api/src/sse/responses.rs:266][E: codex-rs/codex-api/src/sse/responses.rs:271][E: codex-rs/codex-api/src/sse/responses.rs:274][E: codex-rs/codex-api/src/sse/responses.rs:279][E: codex-rs/codex-api/src/sse/responses.rs:347][E: codex-rs/codex-api/src/sse/responses.rs:350][E: codex-rs/codex-api/src/sse/responses.rs:355][E: codex-rs/codex-api/src/sse/responses.rs:359]
6. `response.completed` parses response id and usage, emits `ResponseEvent::Completed`, and `process_sse` returns immediately after sending it。[E: codex-rs/codex-api/src/sse/responses.rs:330][E: codex-rs/codex-api/src/sse/responses.rs:334][E: codex-rs/codex-api/src/sse/responses.rs:336][E: codex-rs/codex-api/src/sse/responses.rs:431][E: codex-rs/codex-api/src/sse/responses.rs:433][E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:437][E: codex-rs/codex-api/src/sse/responses.rs:438]
7. `response.failed` starts as `ApiError::Stream`, maps recognized provider error codes into typed `ApiError`, maps other parseable provider errors into `ApiError::Retryable`, and leaves missing/unparseable error payloads as `ApiError::Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:287][E: codex-rs/codex-api/src/sse/responses.rs:289][E: codex-rs/codex-api/src/sse/responses.rs:293][E: codex-rs/codex-api/src/sse/responses.rs:296][E: codex-rs/codex-api/src/sse/responses.rs:298][E: codex-rs/codex-api/src/sse/responses.rs:303][E: codex-rs/codex-api/src/sse/responses.rs:305][E: codex-rs/codex-api/src/sse/responses.rs:307][E: codex-rs/codex-api/src/sse/responses.rs:309][E: codex-rs/codex-api/src/sse/responses.rs:315][E: codex-rs/codex-api/src/sse/responses.rs:317]
8. Retry delay parsing only runs when error code is `rate_limit_exceeded`, then extracts “try again in <number> s|ms|seconds” from the message。[E: codex-rs/codex-api/src/sse/responses.rs:449][E: codex-rs/codex-api/src/sse/responses.rs:450][E: codex-rs/codex-api/src/sse/responses.rs:455][E: codex-rs/codex-api/src/sse/responses.rs:462][E: codex-rs/codex-api/src/sse/responses.rs:465][E: codex-rs/codex-api/src/sse/responses.rs:468][E: codex-rs/codex-api/src/sse/responses.rs:500]

## 设计动机与权衡

- `response_model()` checks `response.headers` before top-level `headers`, so normal Responses stream metadata wins over websocket metadata event headers。[E: codex-rs/codex-api/src/sse/responses.rs:182][E: codex-rs/codex-api/src/sse/responses.rs:189][E: codex-rs/codex-api/src/sse/responses.rs:195][I]
- Server model changes are de-duplicated by `last_server_model`, so repeated identical model metadata does not emit duplicate `ServerModel` events。[E: codex-rs/codex-api/src/sse/responses.rs:378][E: codex-rs/codex-api/src/sse/responses.rs:418][E: codex-rs/codex-api/src/sse/responses.rs:428]
- In the `sse/responses.rs` SSE path, rate-limit updates are pre-emitted from response headers through `parse_all_rate_limits`; `rate_limits.rs` also defines `parse_rate_limit_event` for `codex.rate_limits` payloads, but `sse/responses.rs` imports only `parse_all_rate_limits` from that module。[E: codex-rs/codex-api/src/sse/responses.rs:4][E: codex-rs/codex-api/src/sse/responses.rs:63][E: codex-rs/codex-api/src/sse/responses.rs:91][E: codex-rs/codex-api/src/sse/responses.rs:92][E: codex-rs/codex-api/src/rate_limits.rs:131][I]

## gotcha

- A `response.failed` event does not immediately send the error; `process_sse` stores it as `response_error` and emits it if the stream closes without completed。[E: codex-rs/codex-api/src/sse/responses.rs:377][E: codex-rs/codex-api/src/sse/responses.rs:393][E: codex-rs/codex-api/src/sse/responses.rs:397][E: codex-rs/codex-api/src/sse/responses.rs:442][E: codex-rs/codex-api/src/sse/responses.rs:443]
- An SSE JSON parse failure for one event is skipped, not fatal; this can hide malformed intermediate events until missing completed triggers stream close error。[E: codex-rs/codex-api/src/sse/responses.rs:410][E: codex-rs/codex-api/src/sse/responses.rs:413][E: codex-rs/codex-api/src/sse/responses.rs:414]
- `response.incomplete` always becomes stream error with incomplete reason text, not a retryable typed error。[E: codex-rs/codex-api/src/sse/responses.rs:319][E: codex-rs/codex-api/src/sse/responses.rs:327][E: codex-rs/codex-api/src/sse/responses.rs:328]

## Sources

- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/rate_limits.rs

## 相关

- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.http-client`
