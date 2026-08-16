---
id: subsys.providers.responses-api
title: Responses API
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/endpoint/responses.rs, codex-rs/codex-api/src/endpoint/session.rs, codex-rs/codex-api/src/requests/responses.rs, codex-rs/core/src/client.rs, codex-rs/responses-api-proxy/src/lib.rs, codex-rs/responses-api-proxy/src/dump.rs, codex-rs/responses-api-proxy/src/read_api_key.rs]
symbols: [ResponsesApiRequest, ResponseStream, StreamOptions, ReasoningSummaryDelivery, ResponsesClient, ResponsesOptions, EndpointSession, Compression, ModelClient::build_responses_request, responses_api_proxy::run_main, forward_request]
related: [subsys.providers.overview, subsys.providers.http-client, subsys.providers.sse-streaming, subsys.providers.retry-errors, subsys.providers.auth-layer]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Responses API subsystem defines Codex 的 canonical streaming request/response shape，并把 `ResponsesApiRequest` 通过 `ResponsesClient` 编码后 POST 到 provider path `responses`，再把 HTTP SSE stream 交给 `spawn_response_stream`。[E: codex-rs/codex-api/src/common.rs:252][E: codex-rs/codex-api/src/common.rs:76][E: codex-rs/codex-api/src/common.rs:381][E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:140][E: codex-rs/codex-api/src/endpoint/responses.rs:144][E: codex-rs/codex-api/src/endpoint/responses.rs:157]

## 能回答的问题

- Codex 发给 Responses API 的 request 字段有哪些？
- `text` controls、verbosity、JSON schema output 如何进入 request？
- conversation/session/source headers 怎样附加？
- request compression 和 `Accept: text/event-stream` 在哪里设置？
- `responses-api-proxy` 为什么只允许 `POST /v1/responses`？
- delegated/session HTTP fallback 怎样永久关掉 WebSocket？

## 职责边界

`codex-api/src/common.rs` 定义 request/event/stream shared types，`endpoint/responses.rs` 负责 HTTP POST 和 SSE stream handoff，`endpoint/session.rs` 负责 provider URL、auth、retry/telemetry wrapper，`responses-api-proxy` 是本地 forwarding/debug service 而不是 normal provider runtime。[E: codex-rs/codex-api/src/common.rs:252][E: codex-rs/codex-api/src/common.rs:76][E: codex-rs/codex-api/src/common.rs:381][E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/session.rs:48][E: codex-rs/codex-api/src/endpoint/session.rs:122][E: codex-rs/responses-api-proxy/src/lib.rs:73][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/common.rs`: Responses request fields、websocket request conversion、ResponseEvent、ResponseStream、text controls。[E: codex-rs/codex-api/src/common.rs:76][E: codex-rs/codex-api/src/common.rs:252][E: codex-rs/codex-api/src/common.rs:277][E: codex-rs/codex-api/src/common.rs:361][E: codex-rs/codex-api/src/common.rs:381]
- `codex-rs/codex-api/src/endpoint/responses.rs`: `ResponsesClient`、headers/body preparation、compression、Accept header、SSE spawning。[E: codex-rs/codex-api/src/endpoint/responses.rs:26][E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:87][E: codex-rs/codex-api/src/endpoint/responses.rs:135][E: codex-rs/codex-api/src/endpoint/responses.rs:148][E: codex-rs/codex-api/src/endpoint/responses.rs:152][E: codex-rs/codex-api/src/endpoint/responses.rs:157]
- `codex-rs/codex-api/src/requests/responses.rs`: request compression enum used by Responses endpoint code。[E: codex-rs/codex-api/src/requests/responses.rs:1][E: codex-rs/codex-api/src/requests/responses.rs:2][E: codex-rs/codex-api/src/requests/responses.rs:4][E: codex-rs/codex-api/src/requests/responses.rs:5]
- `codex-rs/responses-api-proxy/src/lib.rs`: local proxy CLI, upstream forwarding, auth header replacement, optional dump files。[E: codex-rs/responses-api-proxy/src/lib.rs:37][E: codex-rs/responses-api-proxy/src/lib.rs:73][E: codex-rs/responses-api-proxy/src/lib.rs:163]

## 数据模型

- `ResponsesApiRequest` includes model、instructions、input、tools、tool_choice、parallel_tool_calls、reasoning、store、stream、optional `stream_options`、include、service_tier、prompt_cache_key、text、client_metadata。[E: codex-rs/codex-api/src/common.rs:252][E: codex-rs/codex-api/src/common.rs:253][E: codex-rs/codex-api/src/common.rs:255][E: codex-rs/codex-api/src/common.rs:256][E: codex-rs/codex-api/src/common.rs:222][E: codex-rs/codex-api/src/common.rs:259][E: codex-rs/codex-api/src/common.rs:260][E: codex-rs/codex-api/src/common.rs:261][E: codex-rs/codex-api/src/common.rs:262][E: codex-rs/codex-api/src/common.rs:263][E: codex-rs/codex-api/src/common.rs:265][E: codex-rs/codex-api/src/common.rs:266][E: codex-rs/codex-api/src/common.rs:268][E: codex-rs/codex-api/src/common.rs:270][E: codex-rs/codex-api/src/common.rs:272][E: codex-rs/codex-api/src/common.rs:274]
- `StreamOptions` currently carries `reasoning_summary_delivery = sequential_cutoff`；HTTP request 转 websocket request 时该字段也被 clone，因此两种 transport 共享 reasoning-summary delivery contract。[E: codex-rs/codex-api/src/common.rs:158][E: codex-rs/codex-api/src/common.rs:160][E: codex-rs/codex-api/src/common.rs:161][E: codex-rs/codex-api/src/common.rs:164][E: codex-rs/codex-api/src/common.rs:166][E: codex-rs/codex-api/src/common.rs:264][E: codex-rs/codex-api/src/common.rs:265][E: codex-rs/codex-api/src/common.rs:277][E: codex-rs/codex-api/src/common.rs:254]
- `TextControls` carries optional verbosity and optional JSON schema format; `TextFormat` stores type、strict、schema、name。[E: codex-rs/codex-api/src/common.rs:177][E: codex-rs/codex-api/src/common.rs:179][E: codex-rs/codex-api/src/common.rs:181][E: codex-rs/codex-api/src/common.rs:183][E: codex-rs/codex-api/src/common.rs:185][E: codex-rs/codex-api/src/common.rs:191][E: codex-rs/codex-api/src/common.rs:193][E: codex-rs/codex-api/src/common.rs:195]
- `ResponseEvent` is the normalized streaming event enum for created/completed/output item/text delta/tool call delta/reasoning/rate-limit/model metadata。[E: codex-rs/codex-api/src/common.rs:76][E: codex-rs/codex-api/src/common.rs:77][E: codex-rs/codex-api/src/common.rs:92][E: codex-rs/codex-api/src/common.rs:99][E: codex-rs/codex-api/src/common.rs:100][E: codex-rs/codex-api/src/common.rs:105][E: codex-rs/codex-api/src/common.rs:114][E: codex-rs/codex-api/src/common.rs:118][E: codex-rs/codex-api/src/common.rs:121][E: codex-rs/codex-api/src/common.rs:122]
- `ResponseStream` is a `futures::Stream` over an mpsc receiver of `Result<ResponseEvent, ApiError>` and carries an optional upstream request id。[E: codex-rs/codex-api/src/common.rs:381][E: codex-rs/codex-api/src/common.rs:382][E: codex-rs/codex-api/src/common.rs:384][E: codex-rs/codex-api/src/common.rs:387][E: codex-rs/codex-api/src/common.rs:388][E: codex-rs/codex-api/src/common.rs:391]

## 控制流

1. `create_text_param_for_request` returns `None` only when both verbosity and output_schema are absent; otherwise it builds `TextControls` and wraps output schema as strict/non-strict `json_schema` format named `codex_output_schema`。[E: codex-rs/codex-api/src/common.rs:361][E: codex-rs/codex-api/src/common.rs:366][E: codex-rs/codex-api/src/common.rs:370][E: codex-rs/codex-api/src/common.rs:371][E: codex-rs/codex-api/src/common.rs:372][E: codex-rs/codex-api/src/common.rs:373][E: codex-rs/codex-api/src/common.rs:374][E: codex-rs/codex-api/src/common.rs:376]
2. `ResponsesClient::stream_request` encodes the `ResponsesApiRequest` directly as `EncodedJsonBody`, prepares extra headers, inserts `x-client-request-id` when a thread id exists, adds session headers, and adds `x-openai-subagent` for subagent session sources。[E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:87][E: codex-rs/codex-api/src/endpoint/responses.rs:88][E: codex-rs/codex-api/src/endpoint/responses.rs:89][E: codex-rs/codex-api/src/endpoint/responses.rs:91][E: codex-rs/codex-api/src/endpoint/responses.rs:92][E: codex-rs/codex-api/src/endpoint/responses.rs:93]
3. `ResponsesClient::stream_encoded` maps API compression to request compression, calls `EndpointSession::stream_encoded_json_with(Method::POST, "responses", ...)`, sets `Accept: text/event-stream`, and passes provider stream idle timeout to `spawn_response_stream`。[E: codex-rs/codex-api/src/endpoint/responses.rs:135][E: codex-rs/codex-api/src/endpoint/responses.rs:136][E: codex-rs/codex-api/src/endpoint/responses.rs:143][E: codex-rs/codex-api/src/endpoint/responses.rs:144][E: codex-rs/codex-api/src/endpoint/responses.rs:148][E: codex-rs/codex-api/src/endpoint/responses.rs:150][E: codex-rs/codex-api/src/endpoint/responses.rs:152][E: codex-rs/codex-api/src/endpoint/responses.rs:157][E: codex-rs/codex-api/src/endpoint/responses.rs:159]
4. `EndpointSession::stream_encoded_json_with` builds and prepares a provider request, then applies auth via `auth.apply_auth(req)` and invokes `transport.stream(req)` inside request telemetry/retry wrapper。[E: codex-rs/codex-api/src/endpoint/session.rs:122][E: codex-rs/codex-api/src/endpoint/session.rs:133][E: codex-rs/codex-api/src/endpoint/session.rs:134][E: codex-rs/codex-api/src/endpoint/session.rs:135][E: codex-rs/codex-api/src/endpoint/session.rs:136][E: codex-rs/codex-api/src/endpoint/session.rs:139][E: codex-rs/codex-api/src/endpoint/session.rs:147][E: codex-rs/codex-api/src/endpoint/session.rs:148]
5. Core 在生成 non-OpenAI provider 的 Responses input 时，除清理 internal chat-message passthrough metadata 外，还移除 `FunctionCall.encrypted_function_args`；OpenAI provider 保留这两类内部延续字段。[E: codex-rs/core/src/client.rs:847][E: codex-rs/core/src/client.rs:848][E: codex-rs/core/src/client.rs:849][E: codex-rs/core/src/client.rs:851][E: codex-rs/core/src/client.rs:852][E: codex-rs/core/src/client.rs:853]
6. `responses-api-proxy::run_main` reads an auth header from stdin, parses upstream URL, binds localhost, optionally writes server info, and forwards each incoming request on a thread。[E: codex-rs/responses-api-proxy/src/lib.rs:73][E: codex-rs/responses-api-proxy/src/lib.rs:74][E: codex-rs/responses-api-proxy/src/lib.rs:76][E: codex-rs/responses-api-proxy/src/lib.rs:96][E: codex-rs/responses-api-proxy/src/lib.rs:97][E: codex-rs/responses-api-proxy/src/lib.rs:98][E: codex-rs/responses-api-proxy/src/lib.rs:117]
7. proxy `forward_request` allows only `POST /v1/responses`; it strips incoming Authorization/Host, inserts the stdin bearer Authorization and upstream Host, forwards to upstream, and relays response headers/body。[E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:202][E: codex-rs/responses-api-proxy/src/lib.rs:217][E: codex-rs/responses-api-proxy/src/lib.rs:219][E: codex-rs/responses-api-proxy/src/lib.rs:221][E: codex-rs/responses-api-proxy/src/lib.rs:223][E: codex-rs/responses-api-proxy/src/lib.rs:236][E: codex-rs/responses-api-proxy/src/lib.rs:258][E: codex-rs/responses-api-proxy/src/lib.rs:265][E: codex-rs/responses-api-proxy/src/lib.rs:273]
8. delegated/session HTTP fallback 仍保留：`ModelClient::force_http_fallback` 在 WebSocket 已启用时把 `disable_websockets` 设为 true、清掉 cached websocket session，并记 `codex.transport.fallback_to_http`。后续 `responses_websocket_enabled()` 看到该 flag 后只走 HTTP Responses。Guardian/delegated child 可继承 parent 的 HTTP fallback，避免子会话重新尝试已失败的 WebSocket。[E: codex-rs/core/src/client.rs:523][E: codex-rs/core/src/client.rs:530][E: codex-rs/core/src/client.rs:954][E: codex-rs/core/src/client.rs:1910]

## 设计动机与权衡

- HTTP Responses and websocket Responses share request shape through `impl From<&ResponsesApiRequest> for ResponseCreateWsRequest`, so fields like tools、reasoning、stream_options、text、client_metadata stay aligned across transports。[E: codex-rs/codex-api/src/common.rs:277][E: codex-rs/codex-api/src/common.rs:244][E: codex-rs/codex-api/src/common.rs:247][E: codex-rs/codex-api/src/common.rs:251][E: codex-rs/codex-api/src/common.rs:254][E: codex-rs/codex-api/src/common.rs:258][E: codex-rs/codex-api/src/common.rs:296][I]
- proxy reads API key from stdin and stores a static sensitive Authorization header; `read_auth_header_with` zeroizes the stack buffer and locks the leaked header string on Unix when possible。[E: codex-rs/responses-api-proxy/src/read_api_key.rs:72][E: codex-rs/responses-api-proxy/src/read_api_key.rs:83][E: codex-rs/responses-api-proxy/src/read_api_key.rs:155][E: codex-rs/responses-api-proxy/src/read_api_key.rs:156][E: codex-rs/responses-api-proxy/src/read_api_key.rs:158][E: codex-rs/responses-api-proxy/src/read_api_key.rs:159][E: codex-rs/responses-api-proxy/src/lib.rs:217][E: codex-rs/responses-api-proxy/src/lib.rs:218]
- proxy dumps redact Authorization and cookie-like headers, so dump files are meant for request/response debugging without obvious credential leakage。[E: codex-rs/responses-api-proxy/src/dump.rs:16][E: codex-rs/responses-api-proxy/src/dump.rs:160][E: codex-rs/responses-api-proxy/src/dump.rs:186][E: codex-rs/responses-api-proxy/src/dump.rs:187][E: codex-rs/responses-api-proxy/src/dump.rs:188][I]

## gotcha

- `ResponsesClient::stream_request` currently encodes `ResponsesApiRequest` directly and does not perform the older serialized-input item-id mutation before sending the body。[E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:96][I]
- proxy rejects every path except exact `/v1/responses`; query strings or other endpoints receive 403。[E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:176]
- `client_metadata` trace keys for websocket request headers are inserted by `response_create_client_metadata`; `ResponsesClient::stream_request` only serializes the body and adds conversation/subagent headers, so the negative part is an implementation-scope inference。[E: codex-rs/codex-api/src/common.rs:331][E: codex-rs/codex-api/src/common.rs:337][E: codex-rs/codex-api/src/common.rs:343][E: codex-rs/codex-api/src/common.rs:350][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:87][E: codex-rs/codex-api/src/endpoint/responses.rs:91][E: codex-rs/codex-api/src/endpoint/responses.rs:96][I]

## Sources

- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/endpoint/responses.rs
- codex-rs/codex-api/src/endpoint/session.rs
- codex-rs/codex-api/src/requests/responses.rs
- codex-rs/core/src/client.rs
- codex-rs/responses-api-proxy/src/lib.rs
- codex-rs/responses-api-proxy/src/dump.rs
- codex-rs/responses-api-proxy/src/read_api_key.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.http-client`
- `subsys.providers.sse-streaming`
- `subsys.providers.retry-errors`
- `subsys.providers.auth-layer`
