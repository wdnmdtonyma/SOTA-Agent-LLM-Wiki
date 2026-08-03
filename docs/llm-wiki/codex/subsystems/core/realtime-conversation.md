---
id: subsys.core.realtime-conversation
title: Realtime conversation
kind: subsystem
tier: T2
source: [codex-rs/core/src/realtime_conversation.rs, codex-rs/core/src/realtime_conversation/bem.rs, codex-rs/core/src/context/realtime_delegation.rs, codex-rs/core/src/context/realtime_start_with_instructions.rs, codex-rs/core/src/context/realtime_end_instructions.rs, codex-rs/core/src/context/world_state/realtime.rs, codex-rs/core/src/realtime_context.rs, codex-rs/core/src/realtime_prompt.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/protocol.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs]
symbols: [RealtimeConversationManager, RealtimeModeInstructions, ConversationStartParams, ConversationStartTransport, CodexResponseHandoffMode, RealtimeSessionKind, RealtimeHandoffState, RealtimeStreamedItem, RealtimeDelegation, RealtimeDelegationSource, RealtimeStartWithInstructions, RealtimeEndInstructions, RealtimeState, RealtimeOutbound, RealtimeEvent, handle_start, handle_audio, handle_text, handle_speech, handle_close, build_realtime_startup_context, prepare_realtime_backend_prompt]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.platform.realtime, subsys.core.session-lifecycle, rpc.turn-methods]
evidence: explicit
status: verified
updated: 7750465934
---

> Realtime conversation is a side-channel beside normal turns: protocol `Op` variants start, feed, close and list voices for realtime streams; `session/handlers.rs` dispatches those variants without spawning a regular task; `RealtimeConversationManager` owns the active realtime state.[E: codex-rs/protocol/src/protocol.rs:541][E: codex-rs/protocol/src/protocol.rs:544][E: codex-rs/protocol/src/protocol.rs:547][E: codex-rs/protocol/src/protocol.rs:550][E: codex-rs/protocol/src/protocol.rs:553][E: codex-rs/protocol/src/protocol.rs:556][E: codex-rs/core/src/session/handlers.rs:734][E: codex-rs/core/src/session/handlers.rs:749][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:757][E: codex-rs/core/src/session/handlers.rs:761][E: codex-rs/core/src/session/handlers.rs:765][E: codex-rs/core/src/realtime_conversation.rs:124]

## 能回答的问题

- Realtime start/audio/text/speech/close/list voices 分别走哪个 handler?
- websocket 与 WebRTC transport 在 start path 中如何分支?
- V1/V2 realtime sessions 的 parser/session kind 如何选择?
- Codex backend output 如何回灌到 realtime conversation?
- startup context 与 backend prompt 如何构造?

## Protocol surface

`ConversationStartParams` carries realtime handoff behavior、optional Frameless delegation ack filler、model/output modality/startup context、initial items、request-level start/end developer instructions、prompt/session id/transport/version/voice overrides；`codex_response_handoff_mode` 可选 `Thinking`、`Commentary` 或 `BemTags`，决定 Codex response 以哪个 channel 回灌。[E: codex-rs/protocol/src/protocol.rs:200][E: codex-rs/protocol/src/protocol.rs:205][E: codex-rs/protocol/src/protocol.rs:215][E: codex-rs/protocol/src/protocol.rs:223][E: codex-rs/protocol/src/protocol.rs:225][E: codex-rs/protocol/src/protocol.rs:227][E: codex-rs/protocol/src/protocol.rs:229][E: codex-rs/protocol/src/protocol.rs:235]

`ConversationStartTransport` is either `Websocket` or `Webrtc { sdp }`; realtime event payloads cover session updates, transcript deltas, audio output, response lifecycle, conversation items, handoff/noop requests and errors.[E: codex-rs/protocol/src/protocol.rs:239][E: codex-rs/protocol/src/protocol.rs:240][E: codex-rs/protocol/src/protocol.rs:241][E: codex-rs/protocol/src/protocol.rs:408][E: codex-rs/protocol/src/protocol.rs:409][E: codex-rs/protocol/src/protocol.rs:414][E: codex-rs/protocol/src/protocol.rs:418][E: codex-rs/protocol/src/protocol.rs:419][E: codex-rs/protocol/src/protocol.rs:422][E: codex-rs/protocol/src/protocol.rs:426][E: codex-rs/protocol/src/protocol.rs:427][E: codex-rs/protocol/src/protocol.rs:428]

Realtime outputs use dedicated `EventMsg` variants for lifecycle start, streaming payload, close and SDP; list-voices returns `RealtimeConversationListVoicesResponseEvent` containing a `RealtimeVoicesList`.[E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:1309][E: codex-rs/protocol/src/protocol.rs:1651][E: codex-rs/protocol/src/protocol.rs:1652][E: codex-rs/protocol/src/protocol.rs:3813][E: codex-rs/protocol/src/protocol.rs:3814]

## Start path

The dispatch loop routes realtime start/audio/text/speech/close/list-voices ops to realtime handlers and each branch returns `false`, so these ops do not start a normal `RegularTask`.[E: codex-rs/core/src/session/handlers.rs:734][E: codex-rs/core/src/session/handlers.rs:747][E: codex-rs/core/src/session/handlers.rs:749][E: codex-rs/core/src/session/handlers.rs:751][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:755][E: codex-rs/core/src/session/handlers.rs:757][E: codex-rs/core/src/session/handlers.rs:759][E: codex-rs/core/src/session/handlers.rs:761][E: codex-rs/core/src/session/handlers.rs:763][E: codex-rs/core/src/session/handlers.rs:765][E: codex-rs/core/src/session/handlers.rs:767]

`handle_start()` prepares the request before opening transport; preparation chooses provider/auth/config, defaults absent transport to websocket, applies experimental realtime base URL overrides, chooses V1 for WebRTC without an explicit version, validates AVAS WebRTC constraints, builds `RealtimeSessionConfig`, and creates headers with or without an API key depending on transport.[E: codex-rs/core/src/realtime_conversation.rs:1086][E: codex-rs/core/src/realtime_conversation.rs:1145][E: codex-rs/core/src/realtime_conversation.rs:1151][E: codex-rs/core/src/realtime_conversation.rs:1156][E: codex-rs/core/src/realtime_conversation.rs:1130][E: codex-rs/core/src/realtime_conversation.rs:1163][E: codex-rs/core/src/realtime_conversation.rs:1170][E: codex-rs/core/src/realtime_conversation.rs:1172][E: codex-rs/core/src/realtime_conversation.rs:1175][E: codex-rs/core/src/realtime_conversation.rs:1184][E: codex-rs/core/src/realtime_conversation.rs:1190][E: codex-rs/core/src/realtime_conversation.rs:1199]

`build_realtime_session_config()` prepares the backend prompt, optionally appends startup context, chooses the model default, maps websocket version to V1 or RealtimeV2 parser, rejects V1 text output, maps configured session type, validates voice, and uses the thread id as default realtime session id.[E: codex-rs/core/src/realtime_conversation.rs:1275][E: codex-rs/core/src/realtime_conversation.rs:1279][E: codex-rs/core/src/realtime_conversation.rs:1322][E: codex-rs/core/src/realtime_conversation.rs:883][E: codex-rs/core/src/realtime_conversation.rs:1332][E: codex-rs/core/src/realtime_conversation.rs:1334][E: codex-rs/core/src/realtime_conversation.rs:889][E: codex-rs/core/src/realtime_conversation.rs:1340][E: codex-rs/core/src/realtime_conversation.rs:1344][E: codex-rs/core/src/realtime_conversation.rs:1352][E: codex-rs/core/src/realtime_conversation.rs:1356][E: codex-rs/core/src/realtime_conversation.rs:1366]

request-level `realtime_start_instructions` 与 `realtime_end_instructions` 分别有 8,192 estimated-token 上限，任何一段超限都会在建联前返回 invalid request。Manager 在 start 成功后保存这组 `RealtimeModeInstructions`，为普通 Codex turn 的 world-state transition 提供同一份 start/end text。[E: codex-rs/core/src/realtime_conversation.rs:95][E: codex-rs/core/src/realtime_conversation.rs:124][E: codex-rs/core/src/realtime_conversation.rs:126][E: codex-rs/core/src/realtime_conversation.rs:130][E: codex-rs/core/src/realtime_conversation.rs:499][E: codex-rs/core/src/realtime_conversation.rs:500][E: codex-rs/core/src/realtime_conversation.rs:520][E: codex-rs/core/src/realtime_conversation.rs:1249][E: codex-rs/core/src/realtime_conversation.rs:1265][E: codex-rs/core/src/realtime_conversation.rs:1269]

`RealtimeConversationManager::start()` aborts any previous conversation state before `start_inner()`; `start_inner()` maps parser to V1/V2 session kind, creates bounded audio/text/handoff/event channels, and then either creates a WebRTC realtime call plus sideband task or opens a normal realtime websocket connection.[E: codex-rs/core/src/realtime_conversation.rs:525][E: codex-rs/core/src/realtime_conversation.rs:308][E: codex-rs/core/src/realtime_conversation.rs:515][E: codex-rs/core/src/realtime_conversation.rs:555][E: codex-rs/core/src/realtime_conversation.rs:329][E: codex-rs/core/src/realtime_conversation.rs:560][E: codex-rs/core/src/realtime_conversation.rs:562][E: codex-rs/core/src/realtime_conversation.rs:564][E: codex-rs/core/src/realtime_conversation.rs:566][E: codex-rs/core/src/realtime_conversation.rs:598][E: codex-rs/core/src/realtime_conversation.rs:606][E: codex-rs/core/src/realtime_conversation.rs:623][E: codex-rs/core/src/realtime_conversation.rs:631]

After start, `handle_start_inner()` sends `RealtimeConversationStarted`, optionally sends `RealtimeConversationSdp`, spawns a fanout task over realtime events, routes `HandoffRequested` text into normal realtime text input, forwards each realtime event as `RealtimeConversationRealtime`, and sends the close event after finishing active state.[E: codex-rs/core/src/realtime_conversation.rs:1480][E: codex-rs/core/src/realtime_conversation.rs:1482][E: codex-rs/core/src/realtime_conversation.rs:1496][E: codex-rs/core/src/realtime_conversation.rs:1498][E: codex-rs/core/src/realtime_conversation.rs:1506][E: codex-rs/core/src/realtime_conversation.rs:1527][E: codex-rs/core/src/realtime_conversation.rs:1535][E: codex-rs/core/src/realtime_conversation.rs:1538][E: codex-rs/core/src/realtime_conversation.rs:1557][E: codex-rs/core/src/realtime_conversation.rs:1559]

## Input and handoff path

`audio_in()` writes audio frames into the active queue and drops full-queue frames; `text_in()` requires a running conversation, prefixes user text with the session-kind-aware realtime prefix, and sends it to the text queue.[E: codex-rs/core/src/realtime_conversation.rs:702][E: codex-rs/core/src/realtime_conversation.rs:705][E: codex-rs/core/src/realtime_conversation.rs:714][E: codex-rs/core/src/realtime_conversation.rs:717][E: codex-rs/core/src/realtime_conversation.rs:726][E: codex-rs/core/src/realtime_conversation.rs:735][E: codex-rs/core/src/realtime_conversation.rs:742][E: codex-rs/core/src/realtime_conversation.rs:745]

`handoff_out()` converts Codex output into `RealtimeOutbound`: it no-ops for client-managed handoffs, can create conversation items, append or update an active handoff, or send standalone handoff text. `handoff_complete()` no-ops for V1 and emits either `HandoffCompleteAck` or `CompletedHandoff` for V2 depending on response-as-items mode.[E: codex-rs/core/src/realtime_conversation.rs:766][E: codex-rs/core/src/realtime_conversation.rs:793][E: codex-rs/core/src/realtime_conversation.rs:801][E: codex-rs/core/src/realtime_conversation.rs:807][E: codex-rs/core/src/realtime_conversation.rs:826][E: codex-rs/core/src/realtime_conversation.rs:1006][E: codex-rs/core/src/realtime_conversation.rs:1007][E: codex-rs/core/src/realtime_conversation.rs:1018][E: codex-rs/core/src/realtime_conversation.rs:1021]

Streaming handoff 不再必须等完整 agent message：`register_handoff_stream_item()` / `stream_handoff_delta()` / `finish_handoff_stream_item()` 按 item 缓冲并节流发送 `HandoffAppend`，超预算时保留 head/tail 并插入 truncation marker。`BemTags` 模式由独立 BEM parser 等到 channel header 完整后再判定 commentary/final phase，无法识别时完整输出路径回退为 final。[E: codex-rs/core/src/realtime_conversation.rs:845][E: codex-rs/core/src/realtime_conversation.rs:901][E: codex-rs/core/src/realtime_conversation.rs:940][E: codex-rs/core/src/realtime_conversation/bem.rs:3][E: codex-rs/core/src/realtime_conversation/bem.rs:49]

`run_realtime_input_task()` multiplexes user text, background-agent handoff output, realtime server events and user audio frames. `handle_handoff_output()` writes V1 handoff append/function output events or V2 conversation items plus `response.create` requests.[E: codex-rs/core/src/realtime_conversation.rs:1807][E: codex-rs/core/src/realtime_conversation.rs:1830][E: codex-rs/core/src/realtime_conversation.rs:1839][E: codex-rs/core/src/realtime_conversation.rs:1851][E: codex-rs/core/src/realtime_conversation.rs:1864][E: codex-rs/core/src/realtime_conversation.rs:1978][E: codex-rs/core/src/realtime_conversation.rs:1481][E: codex-rs/core/src/realtime_conversation.rs:2000][E: codex-rs/core/src/realtime_conversation.rs:2014][E: codex-rs/core/src/realtime_conversation.rs:2086][E: codex-rs/core/src/realtime_conversation.rs:2089][E: codex-rs/core/src/realtime_conversation.rs:2095]

`RealtimeDelegation` typed fragment wraps handoff input and optional active transcript delta in escaped XML before fanout routes it into the normal thread input path。`RealtimeDelegationSource::TranscriptTailFlush` 还会写入 source tag，使 session close 后的剩余 transcript tail 与普通 handoff 可区分。[E: codex-rs/core/src/context/realtime_delegation.rs:4][E: codex-rs/core/src/context/realtime_delegation.rs:10][E: codex-rs/core/src/context/realtime_delegation.rs:31][E: codex-rs/core/src/context/realtime_delegation.rs:44][E: codex-rs/core/src/context/realtime_delegation.rs:48][E: codex-rs/core/src/context/realtime_delegation.rs:54][E: codex-rs/core/src/realtime_conversation.rs:1880]

## Prompt and startup context

`prepare_realtime_backend_prompt()` prefers a non-empty config override, then request prompt, then an empty prompt if the request explicitly supplies `None`, and otherwise renders the bundled backend prompt with the current user first name.[E: codex-rs/core/src/realtime_prompt.rs:9][E: codex-rs/core/src/realtime_prompt.rs:12][E: codex-rs/core/src/realtime_prompt.rs:16][E: codex-rs/core/src/realtime_prompt.rs:17][E: codex-rs/core/src/realtime_prompt.rs:21][E: codex-rs/core/src/realtime_prompt.rs:23]

`build_realtime_startup_context()` builds optional startup context from current thread history, recent work and a bounded workspace map, returns `None` when all are absent, adds an exclusion note, and wraps the result in the startup context XML tags.[E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:69][E: codex-rs/core/src/realtime_context.rs:70][E: codex-rs/core/src/realtime_context.rs:71][E: codex-rs/core/src/realtime_context.rs:73][E: codex-rs/core/src/realtime_context.rs:78][E: codex-rs/core/src/realtime_context.rs:110][E: codex-rs/core/src/realtime_context.rs:116][E: codex-rs/core/src/realtime_context.rs:489]

这组 start/end instructions 也进入 typed realtime world state：inactive→active 时渲染带 custom text 的 developer fragment，active→inactive 时渲染 custom end fragment；未提供 custom text 时仍使用内置 start/end instructions。相同 active state 不重复发 diff。[E: codex-rs/core/src/context/world_state/realtime.rs:23][E: codex-rs/core/src/context/world_state/realtime.rs:36][E: codex-rs/core/src/context/world_state/realtime.rs:43][E: codex-rs/core/src/context/world_state/realtime.rs:45][E: codex-rs/core/src/context/world_state/realtime.rs:46][E: codex-rs/core/src/context/world_state/realtime.rs:52][E: codex-rs/core/src/context/realtime_start_with_instructions.rs:18][E: codex-rs/core/src/context/realtime_end_instructions.rs:23]

## Gotchas

- Text output modality requires realtime V2; `build_realtime_session_config()` rejects V1 text output.[E: codex-rs/core/src/realtime_conversation.rs:889][E: codex-rs/core/src/realtime_conversation.rs:1338][E: codex-rs/core/src/realtime_conversation.rs:1340]
- AVAS WebRTC starts require realtime V1 and conversational session mode.[E: codex-rs/core/src/realtime_conversation.rs:1237][E: codex-rs/core/src/realtime_conversation.rs:1241][E: codex-rs/core/src/realtime_conversation.rs:1242]
- `delegation_ack_filler` 被 core 传进 session config，但只有 Frameless Bidi session JSON 将它写到 wire；不能描述成所有 realtime versions 的通用 field。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:41][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:73][E: codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs:74]

## Sources

- `codex-rs/core/src/realtime_conversation.rs`
- `codex-rs/core/src/realtime_conversation/bem.rs`
- `codex-rs/core/src/context/realtime_delegation.rs`
- `codex-rs/core/src/context/realtime_start_with_instructions.rs`
- `codex-rs/core/src/context/realtime_end_instructions.rs`
- `codex-rs/core/src/context/world_state/realtime.rs`
- `codex-rs/core/src/realtime_context.rs`
- `codex-rs/core/src/realtime_prompt.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs`
- `codex-rs/codex-api/src/endpoint/realtime_websocket/methods_frameless_bidi.rs`

## 相关

- [ref.protocol-op](../../reference/protocol-op.md)
- [ref.protocol-event-lifecycle](../../reference/protocol-event-lifecycle.md)
- [subsys.core.session-lifecycle](session-lifecycle.md)
