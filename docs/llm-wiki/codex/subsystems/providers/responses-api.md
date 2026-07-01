---
id: subsys.providers.responses-api
title: Responses API
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/common.rs, codex-rs/codex-api/src/endpoint/responses.rs, codex-rs/codex-api/src/endpoint/session.rs, codex-rs/codex-api/src/requests/responses.rs, codex-rs/responses-api-proxy/src/lib.rs, codex-rs/responses-api-proxy/src/dump.rs, codex-rs/responses-api-proxy/src/read_api_key.rs]
symbols: [ResponsesApiRequest, ResponseEvent, ResponseStream, ResponsesClient, ResponsesOptions, EndpointSession, Compression, run_main, forward_request]
related: [subsys.providers.overview, subsys.providers.http-client, subsys.providers.sse-streaming, subsys.providers.retry-errors, subsys.providers.auth-layer]
evidence: explicit
status: verified
updated: db887d03e1
---

> Responses API subsystem defines Codex 的 canonical streaming request/response shape，并把 `ResponsesApiRequest` 通过 `ResponsesClient` 编码后 POST 到 provider path `responses`，再把 HTTP SSE stream 交给 `spawn_response_stream`。[E: codex-rs/codex-api/src/common.rs:209][E: codex-rs/codex-api/src/common.rs:74][E: codex-rs/codex-api/src/common.rs:333][E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:140][E: codex-rs/codex-api/src/endpoint/responses.rs:144][E: codex-rs/codex-api/src/endpoint/responses.rs:157]

## 能回答的问题

- Codex 发给 Responses API 的 request 字段有哪些？
- `text` controls、verbosity、JSON schema output 如何进入 request？
- conversation/session/source headers 怎样附加？
- request compression 和 `Accept: text/event-stream` 在哪里设置？
- `responses-api-proxy` 为什么只允许 `POST /v1/responses`？

## 职责边界

`codex-api/src/common.rs` 定义 request/event/stream shared types，`endpoint/responses.rs` 负责 HTTP POST 和 SSE stream handoff，`endpoint/session.rs` 负责 provider URL、auth、retry/telemetry wrapper，`responses-api-proxy` 是本地 forwarding/debug service 而不是 normal provider runtime。[E: codex-rs/codex-api/src/common.rs:209][E: codex-rs/codex-api/src/common.rs:74][E: codex-rs/codex-api/src/common.rs:333][E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/session.rs:48][E: codex-rs/codex-api/src/endpoint/session.rs:122][E: codex-rs/responses-api-proxy/src/lib.rs:73][I]

## 关键 crate/文件

- `codex-rs/codex-api/src/common.rs`: Responses request fields、websocket request conversion、ResponseEvent、ResponseStream、text controls。[E: codex-rs/codex-api/src/common.rs:74][E: codex-rs/codex-api/src/common.rs:209][E: codex-rs/codex-api/src/common.rs:232][E: codex-rs/codex-api/src/common.rs:313][E: codex-rs/codex-api/src/common.rs:333]
- `codex-rs/codex-api/src/endpoint/responses.rs`: `ResponsesClient`、headers/body preparation、compression、Accept header、SSE spawning。[E: codex-rs/codex-api/src/endpoint/responses.rs:26][E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:87][E: codex-rs/codex-api/src/endpoint/responses.rs:135][E: codex-rs/codex-api/src/endpoint/responses.rs:148][E: codex-rs/codex-api/src/endpoint/responses.rs:152][E: codex-rs/codex-api/src/endpoint/responses.rs:157]
- `codex-rs/codex-api/src/requests/responses.rs`: request compression enum used by Responses endpoint code。[E: codex-rs/codex-api/src/requests/responses.rs:1][E: codex-rs/codex-api/src/requests/responses.rs:2][E: codex-rs/codex-api/src/requests/responses.rs:4][E: codex-rs/codex-api/src/requests/responses.rs:5]
- `codex-rs/responses-api-proxy/src/lib.rs`: local proxy CLI, upstream forwarding, auth header replacement, optional dump files。[E: codex-rs/responses-api-proxy/src/lib.rs:37][E: codex-rs/responses-api-proxy/src/lib.rs:73][E: codex-rs/responses-api-proxy/src/lib.rs:163]

## 数据模型

- `ResponsesApiRequest` includes model、instructions、input、tools、tool_choice、parallel_tool_calls、reasoning、store、stream、include、service_tier、prompt_cache_key、text、client_metadata。[E: codex-rs/codex-api/src/common.rs:209][E: codex-rs/codex-api/src/common.rs:210][E: codex-rs/codex-api/src/common.rs:212][E: codex-rs/codex-api/src/common.rs:213][E: codex-rs/codex-api/src/common.rs:215][E: codex-rs/codex-api/src/common.rs:216][E: codex-rs/codex-api/src/common.rs:217][E: codex-rs/codex-api/src/common.rs:218][E: codex-rs/codex-api/src/common.rs:219][E: codex-rs/codex-api/src/common.rs:220][E: codex-rs/codex-api/src/common.rs:221][E: codex-rs/codex-api/src/common.rs:223][E: codex-rs/codex-api/src/common.rs:225][E: codex-rs/codex-api/src/common.rs:227][E: codex-rs/codex-api/src/common.rs:229]
- `TextControls` carries optional verbosity and optional JSON schema format; `TextFormat` stores type、strict、schema、name。[E: codex-rs/codex-api/src/common.rs:168][E: codex-rs/codex-api/src/common.rs:170][E: codex-rs/codex-api/src/common.rs:172][E: codex-rs/codex-api/src/common.rs:174][E: codex-rs/codex-api/src/common.rs:176][E: codex-rs/codex-api/src/common.rs:182][E: codex-rs/codex-api/src/common.rs:184][E: codex-rs/codex-api/src/common.rs:186]
- `ResponseEvent` is the normalized streaming event enum for created/completed/output item/text delta/tool call delta/reasoning/rate-limit/model metadata。[E: codex-rs/codex-api/src/common.rs:74][E: codex-rs/codex-api/src/common.rs:75][E: codex-rs/codex-api/src/common.rs:90][E: codex-rs/codex-api/src/common.rs:97][E: codex-rs/codex-api/src/common.rs:98][E: codex-rs/codex-api/src/common.rs:103][E: codex-rs/codex-api/src/common.rs:107][E: codex-rs/codex-api/src/common.rs:111][E: codex-rs/codex-api/src/common.rs:114][E: codex-rs/codex-api/src/common.rs:115]
- `ResponseStream` is a `futures::Stream` over an mpsc receiver of `Result<ResponseEvent, ApiError>` and carries an optional upstream request id。[E: codex-rs/codex-api/src/common.rs:333][E: codex-rs/codex-api/src/common.rs:334][E: codex-rs/codex-api/src/common.rs:336][E: codex-rs/codex-api/src/common.rs:339][E: codex-rs/codex-api/src/common.rs:340][E: codex-rs/codex-api/src/common.rs:343]

## 控制流

1. `create_text_param_for_request` returns `None` only when both verbosity and output_schema are absent; otherwise it builds `TextControls` and wraps output schema as strict/non-strict `json_schema` format named `codex_output_schema`。[E: codex-rs/codex-api/src/common.rs:313][E: codex-rs/codex-api/src/common.rs:318][E: codex-rs/codex-api/src/common.rs:322][E: codex-rs/codex-api/src/common.rs:323][E: codex-rs/codex-api/src/common.rs:324][E: codex-rs/codex-api/src/common.rs:325][E: codex-rs/codex-api/src/common.rs:326][E: codex-rs/codex-api/src/common.rs:328]
2. `ResponsesClient::stream_request` encodes the `ResponsesApiRequest` directly as `EncodedJsonBody`, prepares extra headers, inserts `x-client-request-id` when a thread id exists, adds session headers, and adds `x-openai-subagent` for subagent session sources。[E: codex-rs/codex-api/src/endpoint/responses.rs:70][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:87][E: codex-rs/codex-api/src/endpoint/responses.rs:88][E: codex-rs/codex-api/src/endpoint/responses.rs:89][E: codex-rs/codex-api/src/endpoint/responses.rs:91][E: codex-rs/codex-api/src/endpoint/responses.rs:92][E: codex-rs/codex-api/src/endpoint/responses.rs:93]
3. `ResponsesClient::stream_encoded` maps API compression to request compression, calls `EndpointSession::stream_encoded_json_with(Method::POST, "responses", ...)`, sets `Accept: text/event-stream`, and passes provider stream idle timeout to `spawn_response_stream`。[E: codex-rs/codex-api/src/endpoint/responses.rs:135][E: codex-rs/codex-api/src/endpoint/responses.rs:136][E: codex-rs/codex-api/src/endpoint/responses.rs:143][E: codex-rs/codex-api/src/endpoint/responses.rs:144][E: codex-rs/codex-api/src/endpoint/responses.rs:148][E: codex-rs/codex-api/src/endpoint/responses.rs:150][E: codex-rs/codex-api/src/endpoint/responses.rs:152][E: codex-rs/codex-api/src/endpoint/responses.rs:157][E: codex-rs/codex-api/src/endpoint/responses.rs:159]
4. `EndpointSession::stream_encoded_json_with` builds and prepares a provider request, then applies auth via `auth.apply_auth(req)` and invokes `transport.stream(req)` inside request telemetry/retry wrapper。[E: codex-rs/codex-api/src/endpoint/session.rs:122][E: codex-rs/codex-api/src/endpoint/session.rs:133][E: codex-rs/codex-api/src/endpoint/session.rs:134][E: codex-rs/codex-api/src/endpoint/session.rs:135][E: codex-rs/codex-api/src/endpoint/session.rs:136][E: codex-rs/codex-api/src/endpoint/session.rs:139][E: codex-rs/codex-api/src/endpoint/session.rs:147][E: codex-rs/codex-api/src/endpoint/session.rs:148]
5. `responses-api-proxy::run_main` reads an auth header from stdin, parses upstream URL, binds localhost, optionally writes server info, and forwards each incoming request on a thread。[E: codex-rs/responses-api-proxy/src/lib.rs:73][E: codex-rs/responses-api-proxy/src/lib.rs:74][E: codex-rs/responses-api-proxy/src/lib.rs:76][E: codex-rs/responses-api-proxy/src/lib.rs:96][E: codex-rs/responses-api-proxy/src/lib.rs:97][E: codex-rs/responses-api-proxy/src/lib.rs:98][E: codex-rs/responses-api-proxy/src/lib.rs:117]
6. proxy `forward_request` allows only `POST /v1/responses`; it strips incoming Authorization/Host, inserts the stdin bearer Authorization and upstream Host, forwards to upstream, and relays response headers/body。[E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:202][E: codex-rs/responses-api-proxy/src/lib.rs:217][E: codex-rs/responses-api-proxy/src/lib.rs:219][E: codex-rs/responses-api-proxy/src/lib.rs:221][E: codex-rs/responses-api-proxy/src/lib.rs:223][E: codex-rs/responses-api-proxy/src/lib.rs:236][E: codex-rs/responses-api-proxy/src/lib.rs:258][E: codex-rs/responses-api-proxy/src/lib.rs:265][E: codex-rs/responses-api-proxy/src/lib.rs:273]

## 设计动机与权衡

- HTTP Responses and websocket Responses share request shape through `impl From<&ResponsesApiRequest> for ResponseCreateWsRequest`, so fields like tools、reasoning、text、client_metadata stay aligned across transports。[E: codex-rs/codex-api/src/common.rs:232][E: codex-rs/codex-api/src/common.rs:235][E: codex-rs/codex-api/src/common.rs:239][E: codex-rs/codex-api/src/common.rs:242][E: codex-rs/codex-api/src/common.rs:248][E: codex-rs/codex-api/src/common.rs:250][I]
- proxy reads API key from stdin and stores a static sensitive Authorization header; `read_auth_header_with` zeroizes the stack buffer and locks the leaked header string on Unix when possible。[E: codex-rs/responses-api-proxy/src/read_api_key.rs:72][E: codex-rs/responses-api-proxy/src/read_api_key.rs:83][E: codex-rs/responses-api-proxy/src/read_api_key.rs:155][E: codex-rs/responses-api-proxy/src/read_api_key.rs:156][E: codex-rs/responses-api-proxy/src/read_api_key.rs:158][E: codex-rs/responses-api-proxy/src/read_api_key.rs:159][E: codex-rs/responses-api-proxy/src/lib.rs:217][E: codex-rs/responses-api-proxy/src/lib.rs:218]
- proxy dumps redact Authorization and cookie-like headers, so dump files are meant for request/response debugging without obvious credential leakage。[E: codex-rs/responses-api-proxy/src/dump.rs:16][E: codex-rs/responses-api-proxy/src/dump.rs:160][E: codex-rs/responses-api-proxy/src/dump.rs:186][E: codex-rs/responses-api-proxy/src/dump.rs:187][E: codex-rs/responses-api-proxy/src/dump.rs:188][I]

## gotcha

- `ResponsesClient::stream_request` currently encodes `ResponsesApiRequest` directly and does not perform the older serialized-input item-id mutation before sending the body。[E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:96][I]
- proxy rejects every path except exact `/v1/responses`; query strings or other endpoints receive 403。[E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:173][E: codex-rs/responses-api-proxy/src/lib.rs:176]
- `client_metadata` trace keys for websocket request headers are inserted by `response_create_client_metadata`; `ResponsesClient::stream_request` only serializes the body and adds conversation/subagent headers, so the negative part is an implementation-scope inference。[E: codex-rs/codex-api/src/common.rs:283][E: codex-rs/codex-api/src/common.rs:289][E: codex-rs/codex-api/src/common.rs:295][E: codex-rs/codex-api/src/common.rs:302][E: codex-rs/codex-api/src/endpoint/responses.rs:84][E: codex-rs/codex-api/src/endpoint/responses.rs:87][E: codex-rs/codex-api/src/endpoint/responses.rs:91][E: codex-rs/codex-api/src/endpoint/responses.rs:96][I]

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
