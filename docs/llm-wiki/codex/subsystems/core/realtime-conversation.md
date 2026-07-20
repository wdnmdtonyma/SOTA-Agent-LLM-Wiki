---
id: subsys.core.realtime-conversation
title: Realtime conversation
kind: subsystem
tier: T2
source: [codex-rs/core/src/realtime_conversation.rs, codex-rs/core/src/realtime_conversation/bem.rs, codex-rs/core/src/context/realtime_delegation.rs, codex-rs/core/src/realtime_context.rs, codex-rs/core/src/realtime_prompt.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/protocol.rs]
symbols: [RealtimeConversationManager, ConversationStartParams, ConversationStartTransport, CodexResponseHandoffMode, RealtimeSessionKind, RealtimeHandoffState, RealtimeStreamedItem, RealtimeDelegation, RealtimeDelegationSource, RealtimeOutbound, RealtimeEvent, handle_start, handle_audio, handle_text, handle_speech, handle_close, build_realtime_startup_context, prepare_realtime_backend_prompt]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Realtime conversation is a side-channel beside normal turns: protocol `Op` variants start, feed, close and list voices for realtime streams; `session/handlers.rs` dispatches those variants without spawning a regular task; `RealtimeConversationManager` owns the active realtime state.[E: codex-rs/protocol/src/protocol.rs:538][E: codex-rs/protocol/src/protocol.rs:541][E: codex-rs/protocol/src/protocol.rs:544][E: codex-rs/protocol/src/protocol.rs:547][E: codex-rs/protocol/src/protocol.rs:550][E: codex-rs/protocol/src/protocol.rs:553][E: codex-rs/core/src/session/handlers.rs:730][E: codex-rs/core/src/session/handlers.rs:745][E: codex-rs/core/src/session/handlers.rs:749][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:757][E: codex-rs/core/src/session/handlers.rs:761][E: codex-rs/core/src/realtime_conversation.rs:121]

## 能回答的问题

- Realtime start/audio/text/speech/close/list voices 分别走哪个 handler?
- websocket 与 WebRTC transport 在 start path 中如何分支?
- V1/V2 realtime sessions 的 parser/session kind 如何选择?
- Codex backend output 如何回灌到 realtime conversation?
- startup context 与 backend prompt 如何构造?

## Protocol surface

`ConversationStartParams` carries realtime handoff behavior, model, output modality, startup-context flag, prompt, session id, transport, version and voice overrides for one realtime session；`codex_response_handoff_mode` 可选 `Thinking`、`Commentary` 或 `BemTags`，决定 Codex response 以哪个 channel 回灌。[E: codex-rs/protocol/src/protocol.rs:206][E: codex-rs/protocol/src/protocol.rs:218][E: codex-rs/protocol/src/protocol.rs:224][E: codex-rs/protocol/src/protocol.rs:232][E: codex-rs/protocol/src/protocol.rs:1634][E: codex-rs/protocol/src/protocol.rs:1637]

`ConversationStartTransport` is either `Websocket` or `Webrtc { sdp }`; realtime event payloads cover session updates, transcript deltas, audio output, response lifecycle, conversation items, handoff/noop requests and errors.[E: codex-rs/protocol/src/protocol.rs:236][E: codex-rs/protocol/src/protocol.rs:237][E: codex-rs/protocol/src/protocol.rs:238][E: codex-rs/protocol/src/protocol.rs:405][E: codex-rs/protocol/src/protocol.rs:406][E: codex-rs/protocol/src/protocol.rs:411][E: codex-rs/protocol/src/protocol.rs:415][E: codex-rs/protocol/src/protocol.rs:416][E: codex-rs/protocol/src/protocol.rs:419][E: codex-rs/protocol/src/protocol.rs:423][E: codex-rs/protocol/src/protocol.rs:424][E: codex-rs/protocol/src/protocol.rs:425]

Realtime outputs use dedicated `EventMsg` variants for lifecycle start, streaming payload, close and SDP; list-voices returns `RealtimeConversationListVoicesResponseEvent` containing a `RealtimeVoicesList`.[E: codex-rs/protocol/src/protocol.rs:1297][E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:1648][E: codex-rs/protocol/src/protocol.rs:1649][E: codex-rs/protocol/src/protocol.rs:3787][E: codex-rs/protocol/src/protocol.rs:3788]

## Start path

The dispatch loop routes realtime start/audio/text/speech/close/list-voices ops to realtime handlers and each branch returns `false`, so these ops do not start a normal `RegularTask`.[E: codex-rs/core/src/session/handlers.rs:730][E: codex-rs/core/src/session/handlers.rs:743][E: codex-rs/core/src/session/handlers.rs:745][E: codex-rs/core/src/session/handlers.rs:747][E: codex-rs/core/src/session/handlers.rs:749][E: codex-rs/core/src/session/handlers.rs:751][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:755][E: codex-rs/core/src/session/handlers.rs:757][E: codex-rs/core/src/session/handlers.rs:759][E: codex-rs/core/src/session/handlers.rs:761][E: codex-rs/core/src/session/handlers.rs:763]

`handle_start()` prepares the request before opening transport; preparation chooses provider/auth/config, defaults absent transport to websocket, applies experimental realtime base URL overrides, chooses V1 for WebRTC without an explicit version, validates AVAS WebRTC constraints, builds `RealtimeSessionConfig`, and creates headers with or without an API key depending on transport.[E: codex-rs/core/src/realtime_conversation.rs:1068][E: codex-rs/core/src/realtime_conversation.rs:1123][E: codex-rs/core/src/realtime_conversation.rs:1129][E: codex-rs/core/src/realtime_conversation.rs:1134][E: codex-rs/core/src/realtime_conversation.rs:1136][E: codex-rs/core/src/realtime_conversation.rs:1140][E: codex-rs/core/src/realtime_conversation.rs:1147][E: codex-rs/core/src/realtime_conversation.rs:1149][E: codex-rs/core/src/realtime_conversation.rs:1152][E: codex-rs/core/src/realtime_conversation.rs:1161][E: codex-rs/core/src/realtime_conversation.rs:1167][E: codex-rs/core/src/realtime_conversation.rs:1176]

`build_realtime_session_config()` prepares the backend prompt, optionally appends startup context, chooses the model default, maps websocket version to V1 or RealtimeV2 parser, rejects V1 text output, maps configured session type, validates voice, and uses the thread id as default realtime session id.[E: codex-rs/core/src/realtime_conversation.rs:1224][E: codex-rs/core/src/realtime_conversation.rs:1228][E: codex-rs/core/src/realtime_conversation.rs:1271][E: codex-rs/core/src/realtime_conversation.rs:865][E: codex-rs/core/src/realtime_conversation.rs:1281][E: codex-rs/core/src/realtime_conversation.rs:1283][E: codex-rs/core/src/realtime_conversation.rs:871][E: codex-rs/core/src/realtime_conversation.rs:1289][E: codex-rs/core/src/realtime_conversation.rs:1293][E: codex-rs/core/src/realtime_conversation.rs:1301][E: codex-rs/core/src/realtime_conversation.rs:1305][E: codex-rs/core/src/realtime_conversation.rs:1314]

`RealtimeConversationManager::start()` aborts any previous conversation state before `start_inner()`; `start_inner()` maps parser to V1/V2 session kind, creates bounded audio/text/handoff/event channels, and then either creates a WebRTC realtime call plus sideband task or opens a normal realtime websocket connection.[E: codex-rs/core/src/realtime_conversation.rs:525][E: codex-rs/core/src/realtime_conversation.rs:297][E: codex-rs/core/src/realtime_conversation.rs:533][E: codex-rs/core/src/realtime_conversation.rs:551][E: codex-rs/core/src/realtime_conversation.rs:318][E: codex-rs/core/src/realtime_conversation.rs:556][E: codex-rs/core/src/realtime_conversation.rs:558][E: codex-rs/core/src/realtime_conversation.rs:560][E: codex-rs/core/src/realtime_conversation.rs:562][E: codex-rs/core/src/realtime_conversation.rs:585][E: codex-rs/core/src/realtime_conversation.rs:593][E: codex-rs/core/src/realtime_conversation.rs:610][E: codex-rs/core/src/realtime_conversation.rs:618]

After start, `handle_start_inner()` sends `RealtimeConversationStarted`, optionally sends `RealtimeConversationSdp`, spawns a fanout task over realtime events, routes `HandoffRequested` text into normal realtime text input, forwards each realtime event as `RealtimeConversationRealtime`, and sends the close event after finishing active state.[E: codex-rs/core/src/realtime_conversation.rs:1418][E: codex-rs/core/src/realtime_conversation.rs:1420][E: codex-rs/core/src/realtime_conversation.rs:1434][E: codex-rs/core/src/realtime_conversation.rs:1436][E: codex-rs/core/src/realtime_conversation.rs:1444][E: codex-rs/core/src/realtime_conversation.rs:1465][E: codex-rs/core/src/realtime_conversation.rs:1473][E: codex-rs/core/src/realtime_conversation.rs:1476][E: codex-rs/core/src/realtime_conversation.rs:1495][E: codex-rs/core/src/realtime_conversation.rs:1497]

## Input and handoff path

`audio_in()` writes audio frames into the active queue and drops full-queue frames; `text_in()` requires a running conversation, prefixes user text with the session-kind-aware realtime prefix, and sends it to the text queue.[E: codex-rs/core/src/realtime_conversation.rs:689][E: codex-rs/core/src/realtime_conversation.rs:692][E: codex-rs/core/src/realtime_conversation.rs:701][E: codex-rs/core/src/realtime_conversation.rs:704][E: codex-rs/core/src/realtime_conversation.rs:713][E: codex-rs/core/src/realtime_conversation.rs:722][E: codex-rs/core/src/realtime_conversation.rs:729][E: codex-rs/core/src/realtime_conversation.rs:732]

`handoff_out()` converts Codex output into `RealtimeOutbound`: it no-ops for client-managed handoffs, can create conversation items, append or update an active handoff, or send standalone handoff text. `handoff_complete()` no-ops for V1 and emits either `HandoffCompleteAck` or `CompletedHandoff` for V2 depending on response-as-items mode.[E: codex-rs/core/src/realtime_conversation.rs:753][E: codex-rs/core/src/realtime_conversation.rs:777][E: codex-rs/core/src/realtime_conversation.rs:785][E: codex-rs/core/src/realtime_conversation.rs:791][E: codex-rs/core/src/realtime_conversation.rs:810][E: codex-rs/core/src/realtime_conversation.rs:988][E: codex-rs/core/src/realtime_conversation.rs:989][E: codex-rs/core/src/realtime_conversation.rs:1000][E: codex-rs/core/src/realtime_conversation.rs:1003]

Streaming handoff 不再必须等完整 agent message：`register_handoff_stream_item()` / `stream_handoff_delta()` / `finish_handoff_stream_item()` 按 item 缓冲并节流发送 `HandoffAppend`，超预算时保留 head/tail 并插入 truncation marker。`BemTags` 模式由独立 BEM parser 等到 channel header 完整后再判定 commentary/final phase，无法识别时完整输出路径回退为 final。[E: codex-rs/core/src/realtime_conversation.rs:829][E: codex-rs/core/src/realtime_conversation.rs:883][E: codex-rs/core/src/realtime_conversation.rs:922][E: codex-rs/core/src/realtime_conversation/bem.rs:3][E: codex-rs/core/src/realtime_conversation/bem.rs:27]

`run_realtime_input_task()` multiplexes user text, background-agent handoff output, realtime server events and user audio frames. `handle_handoff_output()` writes V1 handoff append/function output events or V2 conversation items plus `response.create` requests.[E: codex-rs/core/src/realtime_conversation.rs:1745][E: codex-rs/core/src/realtime_conversation.rs:1768][E: codex-rs/core/src/realtime_conversation.rs:1777][E: codex-rs/core/src/realtime_conversation.rs:1789][E: codex-rs/core/src/realtime_conversation.rs:1802][E: codex-rs/core/src/realtime_conversation.rs:1916][E: codex-rs/core/src/realtime_conversation.rs:1419][E: codex-rs/core/src/realtime_conversation.rs:1938][E: codex-rs/core/src/realtime_conversation.rs:1952][E: codex-rs/core/src/realtime_conversation.rs:2024][E: codex-rs/core/src/realtime_conversation.rs:2027][E: codex-rs/core/src/realtime_conversation.rs:2033]

`RealtimeDelegation` typed fragment wraps handoff input and optional active transcript delta in escaped XML before fanout routes it into the normal thread input path。`RealtimeDelegationSource::TranscriptTailFlush` 还会写入 source tag，使 session close 后的剩余 transcript tail 与普通 handoff 可区分。[E: codex-rs/core/src/context/realtime_delegation.rs:4][E: codex-rs/core/src/context/realtime_delegation.rs:10][E: codex-rs/core/src/context/realtime_delegation.rs:31][E: codex-rs/core/src/context/realtime_delegation.rs:44][E: codex-rs/core/src/context/realtime_delegation.rs:48][E: codex-rs/core/src/context/realtime_delegation.rs:54][E: codex-rs/core/src/realtime_conversation.rs:1818]

## Prompt and startup context

`prepare_realtime_backend_prompt()` prefers a non-empty config override, then request prompt, then an empty prompt if the request explicitly supplies `None`, and otherwise renders the bundled backend prompt with the current user first name.[E: codex-rs/core/src/realtime_prompt.rs:9][E: codex-rs/core/src/realtime_prompt.rs:12][E: codex-rs/core/src/realtime_prompt.rs:16][E: codex-rs/core/src/realtime_prompt.rs:17][E: codex-rs/core/src/realtime_prompt.rs:21][E: codex-rs/core/src/realtime_prompt.rs:23]

`build_realtime_startup_context()` builds optional startup context from current thread history, recent work and a bounded workspace map, returns `None` when all are absent, adds an exclusion note, and wraps the result in the startup context XML tags.[E: codex-rs/core/src/realtime_context.rs:65][E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:67][E: codex-rs/core/src/realtime_context.rs:68][E: codex-rs/core/src/realtime_context.rs:69][E: codex-rs/core/src/realtime_context.rs:71][E: codex-rs/core/src/realtime_context.rs:76][E: codex-rs/core/src/realtime_context.rs:108][E: codex-rs/core/src/realtime_context.rs:114][E: codex-rs/core/src/realtime_context.rs:486]

## Gotchas

- Text output modality requires realtime V2; `build_realtime_session_config()` rejects V1 text output.[E: codex-rs/core/src/realtime_conversation.rs:871][E: codex-rs/core/src/realtime_conversation.rs:1287][E: codex-rs/core/src/realtime_conversation.rs:1289]
- AVAS WebRTC starts require realtime V1 and conversational session mode.[E: codex-rs/core/src/realtime_conversation.rs:1205][E: codex-rs/core/src/realtime_conversation.rs:1209][E: codex-rs/core/src/realtime_conversation.rs:1210]

## Sources

- `codex-rs/core/src/realtime_conversation.rs`
- `codex-rs/core/src/realtime_conversation/bem.rs`
- `codex-rs/core/src/context/realtime_delegation.rs`
- `codex-rs/core/src/realtime_context.rs`
- `codex-rs/core/src/realtime_prompt.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [ref.protocol-op](../../reference/protocol-op.md)
- [ref.protocol-event-lifecycle](../../reference/protocol-event-lifecycle.md)
- [subsys.core.session-lifecycle](session-lifecycle.md)
