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
updated: 5670360009
---

> SSE streaming subsystem converts a `ByteStream` parsed as SSE via `eventsource()` into `ResponseEvent` values, pre-emits response headers such as model/rate limits/etag/reasoning flags, then parses each Responses stream event until `response.completed` or an error terminal condition。[E: codex-rs/codex-api/src/sse/responses.rs:31][E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/sse/responses.rs:43][E: codex-rs/codex-api/src/sse/responses.rs:48][E: codex-rs/codex-api/src/sse/responses.rs:65][E: codex-rs/codex-api/src/sse/responses.rs:67][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:76][E: codex-rs/codex-api/src/sse/responses.rs:81][E: codex-rs/codex-api/src/sse/responses.rs:298][E: codex-rs/codex-api/src/sse/responses.rs:393][E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:513][E: codex-rs/codex-api/src/sse/responses.rs:519]

## 能回答的问题

- SSE response headers 怎样变成 model、rate-limit、etag events？
- 哪些 Responses stream event types 会产生 Codex `ResponseEvent`？
- `response.failed` 如何映射 context window、quota、cyber-policy、invalid prompt、server overloaded、retryable？
- stream close、idle timeout、missing completed 怎样报错？
- retry-after delay 从哪里解析？

## 职责边界

`sse/responses.rs` 负责把 `StreamResponse` headers and SSE data 解析为 `ResponseEvent` 或 `ApiError`；request construction、transport retry、core error mapping 不在 `sse/responses.rs` 实现，超出本节点的 cited source set。[E: codex-rs/codex-api/src/sse/responses.rs:31][E: codex-rs/codex-api/src/sse/responses.rs:65][E: codex-rs/codex-api/src/sse/responses.rs:298][E: codex-rs/codex-api/src/sse/responses.rs:434][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/sse/responses.rs`: fixture stream helper、header pre-events、SSE loop、event parser、retry-delay parser、error classifiers。[E: codex-rs/codex-api/src/sse/responses.rs:31][E: codex-rs/codex-api/src/sse/responses.rs:65][E: codex-rs/codex-api/src/sse/responses.rs:298][E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:531][E: codex-rs/codex-api/src/sse/responses.rs:557][E: codex-rs/codex-api/src/sse/responses.rs:561][E: codex-rs/codex-api/src/sse/responses.rs:565][E: codex-rs/codex-api/src/sse/responses.rs:569][E: codex-rs/codex-api/src/sse/responses.rs:573][E: codex-rs/codex-api/src/sse/responses.rs:577]
- `codex-rs/codex-api/src/common.rs`: `ResponseEvent` and `ResponseStream` normalized types。[E: codex-rs/codex-api/src/common.rs:73][E: codex-rs/codex-api/src/common.rs:305]
- `codex-rs/codex-api/src/rate_limits.rs`: response header parser used by `sse/responses.rs`, plus a separate `codex.rate_limits` event payload parser definition。[E: codex-rs/codex-api/src/sse/responses.rs:4][E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/rate_limits.rs:27][E: codex-rs/codex-api/src/rate_limits.rs:133]

## 数据模型

- `ResponsesStreamEvent` deserializes `type` as `kind` and optional headers/metadata/response/item/item_id/call_id/delta/summary_index/content_index fields。[E: codex-rs/codex-api/src/sse/responses.rs:148][E: codex-rs/codex-api/src/sse/responses.rs:149][E: codex-rs/codex-api/src/sse/responses.rs:150][E: codex-rs/codex-api/src/sse/responses.rs:151][E: codex-rs/codex-api/src/sse/responses.rs:152][E: codex-rs/codex-api/src/sse/responses.rs:153][E: codex-rs/codex-api/src/sse/responses.rs:154][E: codex-rs/codex-api/src/sse/responses.rs:155][E: codex-rs/codex-api/src/sse/responses.rs:156][E: codex-rs/codex-api/src/sse/responses.rs:157][E: codex-rs/codex-api/src/sse/responses.rs:158][E: codex-rs/codex-api/src/sse/responses.rs:159]
- `ResponseCompletedUsage` converts input/output/total token fields and cached/reasoning details into `TokenUsage`。[E: codex-rs/codex-api/src/sse/responses.rs:119][E: codex-rs/codex-api/src/sse/responses.rs:120][E: codex-rs/codex-api/src/sse/responses.rs:122][E: codex-rs/codex-api/src/sse/responses.rs:123][E: codex-rs/codex-api/src/sse/responses.rs:125][E: codex-rs/codex-api/src/sse/responses.rs:127][E: codex-rs/codex-api/src/sse/responses.rs:128][E: codex-rs/codex-api/src/sse/responses.rs:130][E: codex-rs/codex-api/src/sse/responses.rs:132][E: codex-rs/codex-api/src/sse/responses.rs:138][E: codex-rs/codex-api/src/sse/responses.rs:143]
- Error payload includes optional type/code/message/plan_type/resets_at; error classification is code-based for context/quota/usage/cyber-policy/invalid/server-overloaded。[E: codex-rs/codex-api/src/sse/responses.rs:92][E: codex-rs/codex-api/src/sse/responses.rs:93][E: codex-rs/codex-api/src/sse/responses.rs:94][E: codex-rs/codex-api/src/sse/responses.rs:95][E: codex-rs/codex-api/src/sse/responses.rs:96][E: codex-rs/codex-api/src/sse/responses.rs:97][E: codex-rs/codex-api/src/sse/responses.rs:557][E: codex-rs/codex-api/src/sse/responses.rs:561][E: codex-rs/codex-api/src/sse/responses.rs:565][E: codex-rs/codex-api/src/sse/responses.rs:569][E: codex-rs/codex-api/src/sse/responses.rs:573][E: codex-rs/codex-api/src/sse/responses.rs:577]

## 控制流

1. `spawn_response_stream` parses all rate-limit headers, reads `X-Models-Etag` and `OpenAI-Model`, presence-checks `X-Reasoning-Included`, and reads optional `x-codex-turn-state` before spawning the SSE task。[E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/sse/responses.rs:40][E: codex-rs/codex-api/src/sse/responses.rs:45][E: codex-rs/codex-api/src/sse/responses.rs:48][E: codex-rs/codex-api/src/sse/responses.rs:57][E: codex-rs/codex-api/src/sse/responses.rs:60][E: codex-rs/codex-api/src/sse/responses.rs:63][E: codex-rs/codex-api/src/sse/responses.rs:65]
2. The spawned task emits ServerModel, RateLimits, ModelsEtag, ServerReasoningIncluded events before calling `process_sse`。[E: codex-rs/codex-api/src/sse/responses.rs:66][E: codex-rs/codex-api/src/sse/responses.rs:67][E: codex-rs/codex-api/src/sse/responses.rs:68][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:71][E: codex-rs/codex-api/src/sse/responses.rs:73][E: codex-rs/codex-api/src/sse/responses.rs:74][E: codex-rs/codex-api/src/sse/responses.rs:76][E: codex-rs/codex-api/src/sse/responses.rs:78][E: codex-rs/codex-api/src/sse/responses.rs:81]
3. `process_sse` polls the eventsource stream with idle timeout; parse errors in individual SSE data are logged and skipped, while stream errors or idle timeout send `ApiError::Stream` and return。[E: codex-rs/codex-api/src/sse/responses.rs:434][E: codex-rs/codex-api/src/sse/responses.rs:444][E: codex-rs/codex-api/src/sse/responses.rs:446][E: codex-rs/codex-api/src/sse/responses.rs:452][E: codex-rs/codex-api/src/sse/responses.rs:464][E: codex-rs/codex-api/src/sse/responses.rs:474][E: codex-rs/codex-api/src/sse/responses.rs:477][E: codex-rs/codex-api/src/sse/responses.rs:478]
4. If the stream closes before `response.completed`, `process_sse` emits the saved response error or `stream closed before response.completed`。[E: codex-rs/codex-api/src/sse/responses.rs:457][E: codex-rs/codex-api/src/sse/responses.rs:458][E: codex-rs/codex-api/src/sse/responses.rs:461]
5. `response.output_item.done` and `response.output_item.added` parse `ResponseItem`; text delta, custom tool call input delta, reasoning summary/content deltas, and summary part added become matching `ResponseEvent` variants。[E: codex-rs/codex-api/src/sse/responses.rs:302][E: codex-rs/codex-api/src/sse/responses.rs:303][E: codex-rs/codex-api/src/sse/responses.rs:304][E: codex-rs/codex-api/src/sse/responses.rs:305][E: codex-rs/codex-api/src/sse/responses.rs:310][E: codex-rs/codex-api/src/sse/responses.rs:312][E: codex-rs/codex-api/src/sse/responses.rs:315][E: codex-rs/codex-api/src/sse/responses.rs:319][E: codex-rs/codex-api/src/sse/responses.rs:326][E: codex-rs/codex-api/src/sse/responses.rs:328][E: codex-rs/codex-api/src/sse/responses.rs:334][E: codex-rs/codex-api/src/sse/responses.rs:336][E: codex-rs/codex-api/src/sse/responses.rs:411][E: codex-rs/codex-api/src/sse/responses.rs:413][E: codex-rs/codex-api/src/sse/responses.rs:414][E: codex-rs/codex-api/src/sse/responses.rs:419][E: codex-rs/codex-api/src/sse/responses.rs:421]
6. `response.completed` parses response id and usage, emits `ResponseEvent::Completed`, and `process_sse` returns immediately after sending it。[E: codex-rs/codex-api/src/sse/responses.rs:393][E: codex-rs/codex-api/src/sse/responses.rs:395][E: codex-rs/codex-api/src/sse/responses.rs:397][E: codex-rs/codex-api/src/sse/responses.rs:398][E: codex-rs/codex-api/src/sse/responses.rs:399][E: codex-rs/codex-api/src/sse/responses.rs:400][E: codex-rs/codex-api/src/sse/responses.rs:513][E: codex-rs/codex-api/src/sse/responses.rs:515][E: codex-rs/codex-api/src/sse/responses.rs:519]
7. `response.failed` starts as `ApiError::Stream`, maps recognized provider error codes into typed `ApiError` including cyber-policy, maps other parseable provider errors into `ApiError::Retryable`, and leaves missing/unparseable error payloads as `ApiError::Stream`。[E: codex-rs/codex-api/src/sse/responses.rs:347][E: codex-rs/codex-api/src/sse/responses.rs:349][E: codex-rs/codex-api/src/sse/responses.rs:353][E: codex-rs/codex-api/src/sse/responses.rs:355][E: codex-rs/codex-api/src/sse/responses.rs:357][E: codex-rs/codex-api/src/sse/responses.rs:359][E: codex-rs/codex-api/src/sse/responses.rs:361][E: codex-rs/codex-api/src/sse/responses.rs:362][E: codex-rs/codex-api/src/sse/responses.rs:367][E: codex-rs/codex-api/src/sse/responses.rs:370][E: codex-rs/codex-api/src/sse/responses.rs:372][E: codex-rs/codex-api/src/sse/responses.rs:378]
8. Retry delay parsing only runs when error code is `rate_limit_exceeded`, then extracts “try again in <number> s|ms|seconds” from the message。[E: codex-rs/codex-api/src/sse/responses.rs:531][E: codex-rs/codex-api/src/sse/responses.rs:532][E: codex-rs/codex-api/src/sse/responses.rs:536][E: codex-rs/codex-api/src/sse/responses.rs:537][E: codex-rs/codex-api/src/sse/responses.rs:538][E: codex-rs/codex-api/src/sse/responses.rs:543][E: codex-rs/codex-api/src/sse/responses.rs:544][E: codex-rs/codex-api/src/sse/responses.rs:547][E: codex-rs/codex-api/src/sse/responses.rs:550]

## 设计动机与权衡

- `response_model()` checks `response.headers` before top-level `headers`, so normal Responses stream metadata wins over websocket metadata event headers。[E: codex-rs/codex-api/src/sse/responses.rs:172][E: codex-rs/codex-api/src/sse/responses.rs:173][E: codex-rs/codex-api/src/sse/responses.rs:174][E: codex-rs/codex-api/src/sse/responses.rs:176][E: codex-rs/codex-api/src/sse/responses.rs:177][E: codex-rs/codex-api/src/sse/responses.rs:179][E: codex-rs/codex-api/src/sse/responses.rs:181][E: codex-rs/codex-api/src/sse/responses.rs:182][E: codex-rs/codex-api/src/sse/responses.rs:184][I]
- Server model changes are de-duplicated by `last_server_model`, so repeated identical model metadata does not emit duplicate `ServerModel` events。[E: codex-rs/codex-api/src/sse/responses.rs:172][E: codex-rs/codex-api/src/sse/responses.rs:173][E: codex-rs/codex-api/src/sse/responses.rs:179][E: codex-rs/codex-api/src/sse/responses.rs:181][E: codex-rs/codex-api/src/sse/responses.rs:184][E: codex-rs/codex-api/src/sse/responses.rs:442][E: codex-rs/codex-api/src/sse/responses.rs:484][E: codex-rs/codex-api/src/sse/responses.rs:485][E: codex-rs/codex-api/src/sse/responses.rs:488][E: codex-rs/codex-api/src/sse/responses.rs:494]
- In the `sse/responses.rs` SSE path, rate-limit updates are pre-emitted from response headers through `parse_all_rate_limits`; `rate_limits.rs` also defines `parse_rate_limit_event` for `codex.rate_limits` payloads, but `sse/responses.rs` imports only `parse_all_rate_limits` from that module。[E: codex-rs/codex-api/src/sse/responses.rs:4][E: codex-rs/codex-api/src/sse/responses.rs:37][E: codex-rs/codex-api/src/sse/responses.rs:70][E: codex-rs/codex-api/src/sse/responses.rs:71][E: codex-rs/codex-api/src/rate_limits.rs:133][E: codex-rs/codex-api/src/rate_limits.rs:134][E: codex-rs/codex-api/src/rate_limits.rs:135][E: codex-rs/codex-api/src/rate_limits.rs:155][E: codex-rs/codex-api/src/rate_limits.rs:164][I]

## gotcha

- A `response.failed` event does not immediately send the error; `process_sse` stores it as `response_error` and emits it if the stream closes without completed。[E: codex-rs/codex-api/src/sse/responses.rs:441][E: codex-rs/codex-api/src/sse/responses.rs:457][E: codex-rs/codex-api/src/sse/responses.rs:461][E: codex-rs/codex-api/src/sse/responses.rs:524][E: codex-rs/codex-api/src/sse/responses.rs:525]
- An SSE JSON parse failure for one event is skipped, not fatal; this can hide malformed intermediate events until missing completed triggers stream close error。[E: codex-rs/codex-api/src/sse/responses.rs:474][E: codex-rs/codex-api/src/sse/responses.rs:477][E: codex-rs/codex-api/src/sse/responses.rs:478]
- `response.incomplete` always becomes stream error with incomplete reason text, not a retryable typed error。[E: codex-rs/codex-api/src/sse/responses.rs:382][E: codex-rs/codex-api/src/sse/responses.rs:383][E: codex-rs/codex-api/src/sse/responses.rs:389][E: codex-rs/codex-api/src/sse/responses.rs:390][E: codex-rs/codex-api/src/sse/responses.rs:391]

## Sources

- codex-rs/codex-api/src/sse/responses.rs
- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/rate_limits.rs

## 相关

- `subsys.providers.responses-api`
- `subsys.providers.retry-errors`
- `subsys.providers.http-client`
