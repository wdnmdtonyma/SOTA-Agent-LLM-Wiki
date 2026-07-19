---
id: subsys.platform.realtime
title: Realtime 传输(WebRTC call + WebSocket sideband)
kind: subsystem
tier: T2
source: [codex-rs/codex-api/src/endpoint/realtime_call.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/mod.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs]
symbols: [RealtimeCallClient, RealtimeCallResponse, RealtimeWebsocketClient, RealtimeWebsocketConnection, RealtimeWebsocketWriter, RealtimeWebsocketEvents, RealtimeSessionConfig, RealtimeEventParser, RealtimeWireAdapter, RealtimeOutboundMessage]
related: [subsys.core.realtime-conversation, rpc.notifications-system]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Codex 的 realtime platform control plane 现在集中在 `codex-api`：`RealtimeCallClient` 以 HTTP POST 交换 WebRTC SDP 并从响应取得 `call_id`，[E: codex-rs/codex-api/src/endpoint/realtime_call.rs:29][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:90][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:110][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:117][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:123][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:124] `RealtimeWebsocketClient` 则负责独立 realtime WebSocket 或加入既有 WebRTC call 的 sideband。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:697][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:706][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:712][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:729][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:778][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:783] 旧的本地 `realtime-webrtc` crate 已不再是该节点的实现来源。[I]

## 能回答的问题

- WebRTC SDP、session payload 与 sideband WebSocket 怎样衔接？
- `V1`、`FramelessBidi`、`RealtimeV2` 三种 wire adapter 的差异是什么？
- `RealtimeSessionConfig` 和 outbound message 的当前字段/变体有哪些？
- standalone 与 WebRTC sideband 何时发送 `session.update`？
- Frameless Bidi 如何追加上下文、分块文本并解析 delegation？

## 职责边界

`RealtimeCallClient` 处理 signaling/control-plane HTTP：请求用 `application/sdp` body，`RealtimeCallResponse` 返回远端 SDP 和从 `Location` header 解出的 `call_id`。[E: codex-rs/codex-api/src/endpoint/realtime_call.rs:90][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:110][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:117][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:118][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:123][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:124][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:126] peer connection、麦克风采集和音频播放不由这些 Rust 类型实现。[I]

`RealtimeWebsocketConnection` 组合 `RealtimeWebsocketWriter` 和 `RealtimeWebsocketEvents`，提供 audio frame、conversation item、function output、close 与 `next_event` surface；writer 还持有 wire adapter 与可选 `RealtimeContextAppendChannel`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:206][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:212][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:220][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:236][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:249][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:259][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:263]

## 数据模型与 wire adapter

`RealtimeEventParser` 同时充当 `RealtimeWireAdapter`，当前变体是 `V1`、`FramelessBidi`、`RealtimeV2`；session mode 仍是 `Conversational` 或 `Transcription`，Frameless context channel 可选 `Speakable` 或 `Commentary`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:15][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:16][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:17][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:18][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:21][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:24][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:25][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:26][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:32][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:33][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:34]

`RealtimeSessionConfig` 包含 `instructions`、新增的 `initial_items`、可选 `model`/`session_id`、adapter、session mode、output modality 和 voice。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:38][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:39][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:40][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:41][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:42][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:43][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:44][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:45][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:46]

`RealtimeOutboundMessage` 除 legacy audio/handoff/response/session/conversation item 外，也覆盖 Frameless 的 `input_audio.append`、`delegation.context.append`、`session.context.append`、`session.close` 和专用 session update payload。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:51][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:52][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:54][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:59][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:61][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:68][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:74][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:76][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:78][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:80][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:82]

## 建联控制流

1. `RealtimeCallClient::create_with_session_and_headers` 校验 config，根据 adapter 选择 `realtime/calls` 或 `live`，并把 SDP 与 session 作为 backend JSON 或 API multipart request 发出。[E: codex-rs/codex-api/src/endpoint/realtime_call.rs:66][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:71][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:129][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:139][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:147][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:168][E: codex-rs/codex-api/src/endpoint/realtime_call.rs:184]
2. standalone `RealtimeWebsocketClient::connect` 从 provider URL 建 realtime URL，并以 `initialize_session=true` 进入统一连接函数。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:706][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:712][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:719][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:724]
3. `connect_webrtc_sideband` 用 `call_id` 生成 join URL，按 provider retry policy 退避重试，并以 `initialize_session=false` 复用同一 reader/writer state。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:729][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:739][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:748][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:751][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:778][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:785][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:790]
4. 统一连接函数合并 provider/extra/default headers、注入可选 `x-session-id`、应用 custom CA TLS；standalone 总会发送初始 session update，sideband 只有非 Frameless adapter 会发送，standalone Frameless 还等待 `session.started`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:795][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:809][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:819][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:838][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:843][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:854][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:876][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:883]

## Frameless Bidi

Frameless session JSON 包含 instructions、output voice、client delegation，并把非空 `initial_items` 按 role 转成 `input_text` 或 `output_text`；context append channel 可区分 speakable/commentary stream。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:45][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:51][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:58][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:65][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:70][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:76]

`context_append_chunks` 以 500 bytes 为上限切块，并回退到 UTF-8 character boundary；Frameless parser 识别 session、audio、input/output transcript、turn done、delegation 和 error events，delegation 只有 `type=delegation,target=client` 才转为 `RealtimeEvent::HandoffRequested`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:11][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:98][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:105][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:107][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:15][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:18][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:27][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:73][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:75][E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol_frameless_bidi.rs:89]

## Legacy V1 与 Realtime V2

V1 构造 `SessionType::Quicksilver`、24 kHz PCM input、voice output，不注册 tools，并为 websocket URL 返回 `intent=quicksilver`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:51][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:57][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:63][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:71][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:76][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v1.rs:81]

Realtime V2 conversational mode 配置 near-field noise reduction、input transcription、server VAD、output PCM 以及 `background_agent`/`remain_silent` tools；transcription mode 没有 output、tools 或 tool choice。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:82][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:94][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:97][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:100][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:115][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:145][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:163][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_v2.rs:165]

## Gotcha

- audio wire name 随 adapter 改变：V1/V2 发送 `input_audio_buffer.append`，Frameless 发送 `input_audio.append`。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:306][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:307][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods.rs:311]
- `normalized_session_mode` 强制 V1 与 Frameless 使用 conversational；只有 Realtime V2 保留调用方的 transcription mode。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs:29][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs:33][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_common.rs:37]

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

## 相关

- [Realtime 对话状态机](../core/realtime-conversation.md)
- [App-server system notifications](../../surface/app-server/notifications-system.md)
