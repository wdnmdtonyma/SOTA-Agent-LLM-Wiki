---
id: subsys.providers.responses-api
title: Responses API
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/endpoint/responses.rs, codex-rs/codex-api/src/endpoint/session.rs, codex-rs/codex-api/src/requests/responses.rs, codex-rs/responses-api-proxy/src/lib.rs, codex-rs/responses-api-proxy/src/dump.rs, codex-rs/responses-api-proxy/src/read_api_key.rs]
symbols: [ResponsesApiRequest, ResponseEvent, ResponseStream, ResponsesClient, ResponsesOptions, EndpointSession, attach_item_ids, run_main, forward_request]
related: [subsys.providers.overview, subsys.providers.http-client, subsys.providers.sse-streaming, subsys.providers.retry-errors, subsys.providers.auth-layer]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Responses API subsystem defines Codex 的 canonical streaming request/response shape，并把 `ResponsesApiRequest` 通过 `ResponsesClient` POST 到 provider path `responses`，再把 HTTP SSE stream 交给 `spawn_response_stream`。[E: codex-rs/codex-api/src/common.rs:160][E: codex-rs/codex-api/src/common.rs:67][E: codex-rs/codex-api/src/common.rs:282][E: codex-rs/codex-api/src/endpoint/responses.rs:69][E: codex-rs/codex-api/src/endpoint/responses.rs:100][E: codex-rs/codex-api/src/endpoint/responses.rs:130][E: codex-rs/codex-api/src/endpoint/responses.rs:131][E: codex-rs/codex-api/src/endpoint/responses.rs:144]

## 能回答的问题

- Codex 发给 Responses API 的 request 字段有哪些？
- `text` controls、verbosity、JSON schema output 如何进入 request？
- conversation/session/source headers 怎样附加？
- Azure Responses endpoint 为什么要 attach item ids？
- `responses-api-proxy` 为什么只允许 `POST /v1/responses`？

## 职责边界

`codex-api/src/common.rs` 定义 request/event/stream shared types，`endpoint/responses.rs` 负责 HTTP POST 和 SSE stream handoff，`endpoint/session.rs` 负责 provider URL、auth、retry/telemetry wrapper，`responses-api-proxy` 是本地 forwarding/debug service 而不是 normal provider runtime。[E: codex-rs/codex-api/src/common.rs:160][E: codex-rs/codex-api/src/common.rs:67][E: codex-rs/codex-api/src/common.rs:282][E: codex-rs/codex-api/src/common.rs:286][E: codex-rs/codex-api/src/endpoint/responses.rs:69][E: codex-rs/codex-api/src/endpoint/session.rs:47][E: codex-rs/codex-api/src/endpoint/session.rs:137][E: codex-rs/responses-api-proxy/src/lib.rs:36][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/common.rs`: Responses request fields、websocket request conversion、ResponseEvent、ResponseStream、text controls。[E: codex-rs/codex-api/src/common.rs:67][E: codex-rs/codex-api/src/common.rs:160][E: codex-rs/codex-api/src/common.rs:182][E: codex-rs/codex-api/src/common.rs:262][E: codex-rs/codex-api/src/common.rs:282]
- `codex-rs/codex-api/src/endpoint/responses.rs`: `ResponsesClient`、headers/body preparation、compression、Accept header、SSE spawning。[E: codex-rs/codex-api/src/endpoint/responses.rs:26][E: codex-rs/codex-api/src/endpoint/responses.rs:69][E: codex-rs/codex-api/src/endpoint/responses.rs:115][E: codex-rs/codex-api/src/endpoint/responses.rs:144]
- `codex-rs/responses-api-proxy/src/lib.rs`: local proxy CLI, upstream forwarding, auth header replacement, optional dump files。[E: codex-rs/responses-api-proxy/src/lib.rs:36][E: codex-rs/responses-api-proxy/src/lib.rs:73][E: codex-rs/responses-api-proxy/src/lib.rs:163]

## 数据模型

- `ResponsesApiRequest` includes model、instructions、input、tools、tool_choice、parallel_tool_calls、reasoning、store、stream、include、service_tier、prompt_cache_key、text、client_metadata。[E: codex-rs/codex-api/src/common.rs:160][E: codex-rs/codex-api/src/common.rs:161][E: codex-rs/codex-api/src/common.rs:163][E: codex-rs/codex-api/src/common.rs:164][E: codex-rs/codex-api/src/common.rs:165][E: codex-rs/codex-api/src/common.rs:166][E: codex-rs/codex-api/src/common.rs:167][E: codex-rs/codex-api/src/common.rs:168][E: codex-rs/codex-api/src/common.rs:169][E: codex-rs/codex-api/src/common.rs:170][E: codex-rs/codex-api/src/common.rs:171][E: codex-rs/codex-api/src/common.rs:173][E: codex-rs/codex-api/src/common.rs:175][E: codex-rs/codex-api/src/common.rs:177][E: codex-rs/codex-api/src/common.rs:179]
- `TextControls` carries optional verbosity and optional JSON schema format; `TextFormat` stores type、strict、schema、name。[E: codex-rs/codex-api/src/common.rs:119][E: codex-rs/codex-api/src/common.rs:121][E: codex-rs/codex-api/src/common.rs:123][E: codex-rs/codex-api/src/common.rs:125][E: codex-rs/codex-api/src/common.rs:127][E: codex-rs/codex-api/src/common.rs:133][E: codex-rs/codex-api/src/common.rs:135][E: codex-rs/codex-api/src/common.rs:137]
- `ResponseEvent` is the normalized streaming event enum for created/completed/output item/text delta/tool call delta/reasoning/rate-limit/model metadata.[E: codex-rs/codex-api/src/common.rs:67][E: codex-rs/codex-api/src/common.rs:68][E: codex-rs/codex-api/src/common.rs:69][E: codex-rs/codex-api/src/common.rs:78][E: codex-rs/codex-api/src/common.rs:82][E: codex-rs/codex-api/src/common.rs:83][E: codex-rs/codex-api/src/common.rs:88][E: codex-rs/codex-api/src/common.rs:92][E: codex-rs/codex-api/src/common.rs:96][E: codex-rs/codex-api/src/common.rs:99][E: codex-rs/codex-api/src/common.rs:100]
- `ResponseStream` is a `futures::Stream` over an mpsc receiver of `Result<ResponseEvent, ApiError>`。[E: codex-rs/codex-api/src/common.rs:282][E: codex-rs/codex-api/src/common.rs:283][E: codex-rs/codex-api/src/common.rs:286][E: codex-rs/codex-api/src/common.rs:290]

## 控制流

1. `create_text_param_for_request` returns `None` only when both verbosity and output_schema are absent; otherwise it builds `TextControls` and wraps output schema as strict/non-strict `json_schema` format named `codex_output_schema`。[E: codex-rs/codex-api/src/common.rs:112][E: codex-rs/codex-api/src/common.rs:267][E: codex-rs/codex-api/src/common.rs:271][E: codex-rs/codex-api/src/common.rs:273][E: codex-rs/codex-api/src/common.rs:274][E: codex-rs/codex-api/src/common.rs:275][E: codex-rs/codex-api/src/common.rs:276][E: codex-rs/codex-api/src/common.rs:277]
2. `ResponsesClient::stream_request` serializes `ResponsesApiRequest` to JSON value; if `request.store` and provider is Azure Responses endpoint, it calls `attach_item_ids` on the input payload。[E: codex-rs/codex-api/src/endpoint/responses.rs:69][E: codex-rs/codex-api/src/endpoint/responses.rs:82][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:85]
3. `stream_request` inserts `x-client-request-id` and conversation headers when conversation id exists, and adds `x-openai-subagent` for subagent session sources。[E: codex-rs/codex-api/src/endpoint/responses.rs:88][E: codex-rs/codex-api/src/endpoint/responses.rs:90][E: codex-rs/codex-api/src/endpoint/responses.rs:92][E: codex-rs/codex-api/src/endpoint/responses.rs:93][E: codex-rs/codex-api/src/endpoint/responses.rs:94]
4. `ResponsesClient::stream` maps API compression to request compression, calls `EndpointSession::stream_with(Method::POST, "responses", ...)`, sets `Accept: text/event-stream`, and passes provider stream idle timeout to `spawn_response_stream`。[E: codex-rs/codex-api/src/endpoint/responses.rs:115][E: codex-rs/codex-api/src/endpoint/responses.rs:122][E: codex-rs/codex-api/src/endpoint/responses.rs:123][E: codex-rs/codex-api/src/endpoint/responses.rs:124][E: codex-rs/codex-api/src/endpoint/responses.rs:130][E: codex-rs/codex-api/src/endpoint/responses.rs:131][E: codex-rs/codex-api/src/endpoint/responses.rs:136][E: codex-rs/codex-api/src/endpoint/responses.rs:144][E: codex-rs/codex-api/src/endpoint/responses.rs:146]
5. `EndpointSession::stream_with` builds a provider request, applies auth via `auth.apply_auth(req)`, then invokes `transport.stream(req)` inside request telemetry/retry wrapper。[E: codex-rs/codex-api/src/endpoint/session.rs:54][E: codex-rs/codex-api/src/endpoint/session.rs:132][E: codex-rs/codex-api/src/endpoint/session.rs:137][E: codex-rs/codex-api/src/endpoint/session.rs:138][E: codex-rs/codex-api/src/endpoint/session.rs:145][E: codex-rs/codex-api/src/endpoint/session.rs:146]
6. `attach_item_ids` only mutates serialized input array entries when original `ResponseItem` variants carry non-empty ids.[E: codex-rs/codex-api/src/requests/responses.rs:11][E: codex-rs/codex-api/src/requests/responses.rs:19][E: codex-rs/codex-api/src/requests/responses.rs:28][E: codex-rs/codex-api/src/requests/responses.rs:32]
7. `responses-api-proxy::run_main` reads an auth header from stdin, parses upstream URL, binds localhost, optionally writes server info, and forwards each incoming request on a thread。[E: codex-rs/responses-api-proxy/src/lib.rs:73][E: codex-rs/responses-api-proxy/src/lib.rs:74][E: codex-rs/responses-api-proxy/src/lib.rs:76][E: codex-rs/responses-api-proxy/src/lib.rs:96][E: codex-rs/responses-api-proxy/src/lib.rs:97][E: codex-rs/responses-api-proxy/src/lib.rs:98][E: codex-rs/responses-api-proxy/src/lib.rs:117][E: codex-rs/responses-api-proxy/src/lib.rs:139]
8. proxy `forward_request` allows only `POST /v1/responses`; it strips incoming Authorization/Host, inserts the stdin bearer Authorization and upstream Host, forwards to upstream, and relays response headers/body.[E: codex-rs/responses-api-proxy/src/lib.rs:170][E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:202][E: codex-rs/responses-api-proxy/src/lib.rs:217][E: codex-rs/responses-api-proxy/src/lib.rs:219][E: codex-rs/responses-api-proxy/src/lib.rs:221][E: codex-rs/responses-api-proxy/src/lib.rs:223][E: codex-rs/responses-api-proxy/src/lib.rs:236][E: codex-rs/responses-api-proxy/src/lib.rs:247][E: codex-rs/responses-api-proxy/src/lib.rs:258][E: codex-rs/responses-api-proxy/src/lib.rs:265][E: codex-rs/responses-api-proxy/src/lib.rs:273]

## 设计动机与权衡

- HTTP Responses and websocket Responses share request shape through `impl From<&ResponsesApiRequest> for ResponseCreateWsRequest`, so fields like tools、reasoning、text、client_metadata stay aligned across transports。[E: codex-rs/codex-api/src/common.rs:182][E: codex-rs/codex-api/src/common.rs:185][E: codex-rs/codex-api/src/common.rs:189][E: codex-rs/codex-api/src/common.rs:192][E: codex-rs/codex-api/src/common.rs:198][E: codex-rs/codex-api/src/common.rs:200][I]
- proxy reads API key from stdin and stores a static sensitive Authorization header; `read_auth_header_with` zeroizes the stack buffer and locks the leaked header string on Unix when possible。[E: codex-rs/responses-api-proxy/src/read_api_key.rs:72][E: codex-rs/responses-api-proxy/src/read_api_key.rs:83][E: codex-rs/responses-api-proxy/src/read_api_key.rs:156][E: codex-rs/responses-api-proxy/src/read_api_key.rs:159][E: codex-rs/responses-api-proxy/src/lib.rs:217][E: codex-rs/responses-api-proxy/src/lib.rs:219]
- proxy dumps redact Authorization and cookie-like headers, so dump files are meant for request/response debugging without obvious credential leakage。[E: codex-rs/responses-api-proxy/src/dump.rs:16][E: codex-rs/responses-api-proxy/src/dump.rs:160][E: codex-rs/responses-api-proxy/src/dump.rs:186][E: codex-rs/responses-api-proxy/src/dump.rs:188]

## gotcha

- `ResponsesApiRequest.store` being true triggers Azure item id attachment only when `provider.is_azure_responses_endpoint()` is true; non-Azure providers receive the serialized request without that mutation。[E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:85]
- proxy rejects every path except exact `/v1/responses`; query strings or other endpoints receive 403。[E: codex-rs/responses-api-proxy/src/lib.rs:170][E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:176]
- `client_metadata` trace keys for websocket request headers are inserted by `response_create_client_metadata`; `ResponsesClient::stream_request` only serializes the body and adds conversation/subagent headers, so the negative part is an implementation-scope inference。[E: codex-rs/codex-api/src/common.rs:232][E: codex-rs/codex-api/src/common.rs:238][E: codex-rs/codex-api/src/common.rs:244][E: codex-rs/codex-api/src/common.rs:251][E: codex-rs/codex-api/src/endpoint/responses.rs:82][E: codex-rs/codex-api/src/endpoint/responses.rs:88][E: codex-rs/codex-api/src/endpoint/responses.rs:92][E: codex-rs/codex-api/src/endpoint/responses.rs:94][I]

## Sources

- codex-rs/codex-api/src/common.rs
- codex-rs/codex-api/src/endpoint/responses.rs
- codex-rs/codex-api/src/endpoint/session.rs
- codex-rs/codex-api/src/requests/responses.rs
- codex-rs/responses-api-proxy/src/lib.rs
- codex-rs/responses-api-proxy/src/dump.rs
- codex-rs/responses-api-proxy/src/read_api_key.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.http-client`
- `subsys.providers.sse-streaming`
- `subsys.providers.retry-errors`
- `subsys.providers.auth-layer`
