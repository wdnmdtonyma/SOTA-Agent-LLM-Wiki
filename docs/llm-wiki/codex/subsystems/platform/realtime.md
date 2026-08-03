---
id: subsys.platform.realtime
title: Realtime 传输(WebRTC call + WebSocket sideband)
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/endpoint/realtime_call.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/mod.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs, codex-rs/core/src/realtime_conversation.rs]
symbols: [RealtimeCallClient, RealtimeCallResponse, RealtimeWebsocketClient, RealtimeWebsocketConnection, RealtimeWebsocketWriter, RealtimeWebsocketEvents, RealtimeSessionConfig, RealtimeEventParser, RealtimeWireAdapter, RealtimeOutboundMessage, websocket_url_from_api_url_for_call]
related: [subsys.core.realtime-conversation, rpc.turn-methods, rpc.notifications-system]
evidence: explicit
status: verified
updated: 7750465934
---

> Codex 的 realtime platform control plane 现在集中在 `codex-api`：`RealtimeCallClient` 以 HTTP POST 交换 WebRTC SDP 并从响应取得 `call_id`，[E: codex-rs/codex-api/src/endpoint/realtime_call.rs:29][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:90][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:110][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:117][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:123][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:124] `RealtimeWebsocketClient` 则负责独立 realtime WebSocket 或加入既有 WebRTC call 的 sideband。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:700][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:719][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:725][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:742][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:778][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:783] 旧的本地 `realtime-webrtc` crate 已不再是该节点的实现来源。[I]

## 能回答的问题

- WebRTC SDP、session payload 与 sideband WebSocket 怎样衔接？
- `V1`、`FramelessBidi`、`RealtimeV2` 三种 wire adapter 的差异是什么？
- `RealtimeSessionConfig` 和 outbound message 的当前字段/变体有哪些？
- standalone 与 WebRTC sideband 何时发送 `session.update`？
- Frameless Bidi 如何追加上下文、分块文本并解析 delegation？

## 职责边界

`RealtimeCallClient` 处理 signaling/control-plane HTTP：请求用 `application/sdp` body，`RealtimeCallResponse` 返回远端 SDP 和从 `Location` header 解出的 `call_id`。[E: codex-rs/codex-api/src/endpoint/realtime_call.rs:90][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:110][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:117][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:118][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:123][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:124][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:126] peer connection、麦克风采集和音频播放不由这些 Rust 类型实现。[I]

`RealtimeWebsocketConnection` 组合 `RealtimeWebsocketWriter` 和 `RealtimeWebsocketEvents`，提供 audio frame、conversation item、function output、close 与 `next_event` surface；writer 还持有 wire adapter 与可选 `RealtimeContextAppendChannel`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:207][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:213][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:221][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:237][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:250][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:260][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:264]

## 数据模型与 wire adapter

`RealtimeEventParser` 同时充当 `RealtimeWireAdapter`，当前变体是 `V1`、`FramelessBidi`、`RealtimeV2`；session mode 仍是 `Conversational` 或 `Transcription`，Frameless context channel 可选 `Speakable` 或 `Commentary`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:15][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:16][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:17][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:18][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:21][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:24][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:25][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:26][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:32][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:33][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:34]

`RealtimeSessionConfig` 包含 `instructions`、`initial_items`、optional `delegation_ack_filler`、可选 `model`/`session_id`、adapter、session mode、output modality 和 voice。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:38][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:39][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:40][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:41][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:42][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:47]

`RealtimeOutboundMessage` 除 legacy audio/handoff/response/session/conversation item 外，也覆盖 Frameless 的 `input_audio.append`、`delegation.context.append`、`session.context.append`、`session.close` 和专用 session update payload。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:52][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:53][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:55][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:60][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:62][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:69][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:75][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:77][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:79][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:81][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:83]

## 建联控制流

1. `RealtimeCallClient::create_with_session_and_headers` 校验 config，根据 adapter 选择 `realtime/calls` 或 `live`，并把 SDP 与 session 作为 backend JSON 或 API multipart request 发出。[E: codex-rs/codex-api/src/endpoint/realtime_call.rs:66][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:71][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:129][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:139][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:147][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:168][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:184]
2. standalone `RealtimeWebsocketClient::connect` 从 provider URL 建 realtime URL，并以 `initialize_session=true` 进入统一连接函数。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:719][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:725][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:732]
3. `connect_webrtc_sideband` 用 `call_id` 生成 join URL，按 provider retry policy 退避重试，并以 `initialize_session=false` 复用同一 reader/writer state。sideband base URL 默认固定为 direct OpenAI Realtime API `https://api.openai.com/v1`，不继承 provider base URL；只有显式 `with_webrtc_sideband_base_url` 才覆盖。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:58][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:700][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:709][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:714][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:742][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:752][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:792]
4. sideband URL shaping 随 adapter 不同：Frameless Bidi 把 `call_id` 追加到 path，V1/RealtimeV2 则追加 `call_id` query parameter。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:971][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:985][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:987][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:990][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:991]
5. 统一连接函数合并 provider/extra/default headers、注入可选 `x-session-id`、应用 custom CA TLS；standalone 总会发送初始 session update，sideband 只有非 Frameless adapter 会发送，standalone Frameless 还等待 `session.started`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:817][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:831][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:841][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:860][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:865][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:877][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:899][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:906]

## Frameless Bidi

Frameless session JSON 包含 instructions、output voice、client delegation，并把非空 `initial_items` 按 role 转成 `input_text` 或 `output_text`；只有 caller 提供 `delegation_ack_filler` 时才写 `delegation.ack_filler`，V1/RealtimeV2 adapters 不消费该字段。context append channel 可区分 speakable/commentary stream。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:52][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:57][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:66][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:73][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:74][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:76]

`context_append_chunks` 以 500 bytes 为上限切块，并回退到 UTF-8 character boundary；Frameless parser 识别 session、audio、input/output transcript、turn done、delegation 和 error events，delegation 只有 `type=delegation,target=client` 才转为 `RealtimeEvent::HandoffRequested`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:11][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:109][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:116][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:118][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:15][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:18][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:27][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:73][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:75][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:89]

## Legacy V1 与 Realtime V2

V1 构造 `SessionType::Quicksilver`、24 kHz PCM input、voice output，不注册 tools，并为 websocket URL 返回 `intent=quicksilver`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:51][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:57][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:63][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:71][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:76][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:81]

Realtime V2 conversational mode 配置 near-field noise reduction、input transcription、server VAD、output PCM 以及 `background_agent`/`remain_silent` tools；transcription mode 没有 output、tools 或 tool choice。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:82][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:94][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:97][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:100][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:115][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:145][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:163][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:165]

## Gotcha

- audio wire name 随 adapter 改变：V1/V2 发送 `input_audio_buffer.append`，Frameless 发送 `input_audio.append`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:307][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:308][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:312]
- `normalized_session_mode` 强制 V1 与 Frameless 使用 conversational；只有 Realtime V2 保留调用方的 transcription mode。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs:29][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs:33][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs:37]
- `experimental_realtime_ws_base_url` 会由 core 同时覆盖 standalone websocket provider URL 和 direct sideband base URL；WebRTC call creation 仍由独立 `experimental_realtime_webrtc_call_base_url` 控制。[E: codex-rs/core/src/realtime_conversation.rs:1158][E: codex-rs/core/src/realtime_conversation.rs:1159][E: codex-rs/core/src/realtime_conversation.rs:1162][E: codex-rs/core/src/realtime_conversation.rs:1163]

## Sources

- `codex-rs/codex-api/src/endpoint/realtime_call.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/mod.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs`
- `codex-rs/core/src/realtime_conversation.rs`

## 相关

- [Realtime 对话状态机](../core/realtime-conversation.md)
- [App-server system notifications](../../surface/app-server/notifications-system.md)
