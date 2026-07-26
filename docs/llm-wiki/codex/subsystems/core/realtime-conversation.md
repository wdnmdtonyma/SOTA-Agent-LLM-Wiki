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
updated: 61a44880a8
---

> Realtime conversation is a side-channel beside normal turns: protocol `Op` variants start, feed, close and list voices for realtime streams; `session/handlers.rs` dispatches those variants without spawning a regular task; `RealtimeConversationManager` owns the active realtime state.[E: codex-rs/protocol/src/protocol.rs:532][E: codex-rs/protocol/src/protocol.rs:535][E: codex-rs/protocol/src/protocol.rs:538][E: codex-rs/protocol/src/protocol.rs:541][E: codex-rs/protocol/src/protocol.rs:544][E: codex-rs/protocol/src/protocol.rs:547][E: codex-rs/core/src/session/handlers.rs:712][E: codex-rs/core/src/session/handlers.rs:727][E: codex-rs/core/src/session/handlers.rs:731][E: codex-rs/core/src/session/handlers.rs:735][E: codex-rs/core/src/session/handlers.rs:739][E: codex-rs/core/src/session/handlers.rs:743][E: codex-rs/core/src/realtime_conversation.rs:123]

## 能回答的问题

- Realtime start/audio/text/speech/close/list voices 分别走哪个 handler?
- websocket 与 WebRTC transport 在 start path 中如何分支?
- V1/V2 realtime sessions 的 parser/session kind 如何选择?
- Codex backend output 如何回灌到 realtime conversation?
- startup context 与 backend prompt 如何构造?

## Protocol surface

`ConversationStartParams` carries realtime handoff behavior, model, output modality, startup-context flag, prompt, session id, transport, version and voice overrides for one realtime session；`codex_response_handoff_mode` 可选 `Thinking`、`Commentary` 或 `BemTags`，决定 Codex response 以哪个 channel 回灌。[E: codex-rs/protocol/src/protocol.rs:198][E: codex-rs/protocol/src/protocol.rs:210][E: codex-rs/protocol/src/protocol.rs:218][E: codex-rs/protocol/src/protocol.rs:226][E: codex-rs/protocol/src/protocol.rs:1628][E: codex-rs/protocol/src/protocol.rs:1631]

`ConversationStartTransport` is either `Websocket` or `Webrtc { sdp }`; realtime event payloads cover session updates, transcript deltas, audio output, response lifecycle, conversation items, handoff/noop requests and errors.[E: codex-rs/protocol/src/protocol.rs:230][E: codex-rs/protocol/src/protocol.rs:231][E: codex-rs/protocol/src/protocol.rs:232][E: codex-rs/protocol/src/protocol.rs:399][E: codex-rs/protocol/src/protocol.rs:400][E: codex-rs/protocol/src/protocol.rs:405][E: codex-rs/protocol/src/protocol.rs:409][E: codex-rs/protocol/src/protocol.rs:410][E: codex-rs/protocol/src/protocol.rs:413][E: codex-rs/protocol/src/protocol.rs:417][E: codex-rs/protocol/src/protocol.rs:418][E: codex-rs/protocol/src/protocol.rs:419]

Realtime outputs use dedicated `EventMsg` variants for lifecycle start, streaming payload, close and SDP; list-voices returns `RealtimeConversationListVoicesResponseEvent` containing a `RealtimeVoicesList`.[E: codex-rs/protocol/src/protocol.rs:1291][E: codex-rs/protocol/src/protocol.rs:1294][E: codex-rs/protocol/src/protocol.rs:1297][E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1642][E: codex-rs/protocol/src/protocol.rs:1643][E: codex-rs/protocol/src/protocol.rs:3790][E: codex-rs/protocol/src/protocol.rs:3791]

## Start path

The dispatch loop routes realtime start/audio/text/speech/close/list-voices ops to realtime handlers and each branch returns `false`, so these ops do not start a normal `RegularTask`.[E: codex-rs/core/src/session/handlers.rs:712][E: codex-rs/core/src/session/handlers.rs:725][E: codex-rs/core/src/session/handlers.rs:727][E: codex-rs/core/src/session/handlers.rs:729][E: codex-rs/core/src/session/handlers.rs:731][E: codex-rs/core/src/session/handlers.rs:733][E: codex-rs/core/src/session/handlers.rs:735][E: codex-rs/core/src/session/handlers.rs:737][E: codex-rs/core/src/session/handlers.rs:739][E: codex-rs/core/src/session/handlers.rs:741][E: codex-rs/core/src/session/handlers.rs:743][E: codex-rs/core/src/session/handlers.rs:745]

`handle_start()` prepares the request before opening transport; preparation chooses provider/auth/config, defaults absent transport to websocket, applies experimental realtime base URL overrides, chooses V1 for WebRTC without an explicit version, validates AVAS WebRTC constraints, builds `RealtimeSessionConfig`, and creates headers with or without an API key depending on transport.[E: codex-rs/core/src/realtime_conversation.rs:1061][E: codex-rs/core/src/realtime_conversation.rs:1117][E: codex-rs/core/src/realtime_conversation.rs:1123][E: codex-rs/core/src/realtime_conversation.rs:1128][E: codex-rs/core/src/realtime_conversation.rs:1130][E: codex-rs/core/src/realtime_conversation.rs:1134][E: codex-rs/core/src/realtime_conversation.rs:1141][E: codex-rs/core/src/realtime_conversation.rs:1143][E: codex-rs/core/src/realtime_conversation.rs:1146][E: codex-rs/core/src/realtime_conversation.rs:1155][E: codex-rs/core/src/realtime_conversation.rs:1161][E: codex-rs/core/src/realtime_conversation.rs:1170]

`build_realtime_session_config()` prepares the backend prompt, optionally appends startup context, chooses the model default, maps websocket version to V1 or RealtimeV2 parser, rejects V1 text output, maps configured session type, validates voice, and uses the thread id as default realtime session id.[E: codex-rs/core/src/realtime_conversation.rs:1224][E: codex-rs/core/src/realtime_conversation.rs:1228][E: codex-rs/core/src/realtime_conversation.rs:1271][E: codex-rs/core/src/realtime_conversation.rs:858][E: codex-rs/core/src/realtime_conversation.rs:1281][E: codex-rs/core/src/realtime_conversation.rs:1283][E: codex-rs/core/src/realtime_conversation.rs:864][E: codex-rs/core/src/realtime_conversation.rs:1289][E: codex-rs/core/src/realtime_conversation.rs:1293][E: codex-rs/core/src/realtime_conversation.rs:1301][E: codex-rs/core/src/realtime_conversation.rs:1305][E: codex-rs/core/src/realtime_conversation.rs:1314]

`RealtimeConversationManager::start()` aborts any previous conversation state before `start_inner()`; `start_inner()` maps parser to V1/V2 session kind, creates bounded audio/text/handoff/event channels, and then either creates a WebRTC realtime call plus sideband task or opens a normal realtime websocket connection.[E: codex-rs/core/src/realtime_conversation.rs:507][E: codex-rs/core/src/realtime_conversation.rs:300][E: codex-rs/core/src/realtime_conversation.rs:515][E: codex-rs/core/src/realtime_conversation.rs:534][E: codex-rs/core/src/realtime_conversation.rs:321][E: codex-rs/core/src/realtime_conversation.rs:539][E: codex-rs/core/src/realtime_conversation.rs:541][E: codex-rs/core/src/realtime_conversation.rs:543][E: codex-rs/core/src/realtime_conversation.rs:545][E: codex-rs/core/src/realtime_conversation.rs:573][E: codex-rs/core/src/realtime_conversation.rs:581][E: codex-rs/core/src/realtime_conversation.rs:598][E: codex-rs/core/src/realtime_conversation.rs:606]

After start, `handle_start_inner()` sends `RealtimeConversationStarted`, optionally sends `RealtimeConversationSdp`, spawns a fanout task over realtime events, routes `HandoffRequested` text into normal realtime text input, forwards each realtime event as `RealtimeConversationRealtime`, and sends the close event after finishing active state.[E: codex-rs/core/src/realtime_conversation.rs:1420][E: codex-rs/core/src/realtime_conversation.rs:1422][E: codex-rs/core/src/realtime_conversation.rs:1436][E: codex-rs/core/src/realtime_conversation.rs:1438][E: codex-rs/core/src/realtime_conversation.rs:1446][E: codex-rs/core/src/realtime_conversation.rs:1467][E: codex-rs/core/src/realtime_conversation.rs:1475][E: codex-rs/core/src/realtime_conversation.rs:1478][E: codex-rs/core/src/realtime_conversation.rs:1497][E: codex-rs/core/src/realtime_conversation.rs:1499]

## Input and handoff path

`audio_in()` writes audio frames into the active queue and drops full-queue frames; `text_in()` requires a running conversation, prefixes user text with the session-kind-aware realtime prefix, and sends it to the text queue.[E: codex-rs/core/src/realtime_conversation.rs:677][E: codex-rs/core/src/realtime_conversation.rs:680][E: codex-rs/core/src/realtime_conversation.rs:689][E: codex-rs/core/src/realtime_conversation.rs:692][E: codex-rs/core/src/realtime_conversation.rs:701][E: codex-rs/core/src/realtime_conversation.rs:710][E: codex-rs/core/src/realtime_conversation.rs:717][E: codex-rs/core/src/realtime_conversation.rs:720]

`handoff_out()` converts Codex output into `RealtimeOutbound`: it no-ops for client-managed handoffs, can create conversation items, append or update an active handoff, or send standalone handoff text. `handoff_complete()` no-ops for V1 and emits either `HandoffCompleteAck` or `CompletedHandoff` for V2 depending on response-as-items mode.[E: codex-rs/core/src/realtime_conversation.rs:741][E: codex-rs/core/src/realtime_conversation.rs:768][E: codex-rs/core/src/realtime_conversation.rs:776][E: codex-rs/core/src/realtime_conversation.rs:782][E: codex-rs/core/src/realtime_conversation.rs:801][E: codex-rs/core/src/realtime_conversation.rs:981][E: codex-rs/core/src/realtime_conversation.rs:982][E: codex-rs/core/src/realtime_conversation.rs:993][E: codex-rs/core/src/realtime_conversation.rs:996]

Streaming handoff 不再必须等完整 agent message：`register_handoff_stream_item()` / `stream_handoff_delta()` / `finish_handoff_stream_item()` 按 item 缓冲并节流发送 `HandoffAppend`，超预算时保留 head/tail 并插入 truncation marker。`BemTags` 模式由独立 BEM parser 等到 channel header 完整后再判定 commentary/final phase，无法识别时完整输出路径回退为 final。[E: codex-rs/core/src/realtime_conversation.rs:820][E: codex-rs/core/src/realtime_conversation.rs:876][E: codex-rs/core/src/realtime_conversation.rs:915][E: codex-rs/core/src/realtime_conversation/bem.rs:3][E: codex-rs/core/src/realtime_conversation/bem.rs:49]

`run_realtime_input_task()` multiplexes user text, background-agent handoff output, realtime server events and user audio frames. `handle_handoff_output()` writes V1 handoff append/function output events or V2 conversation items plus `response.create` requests.[E: codex-rs/core/src/realtime_conversation.rs:1747][E: codex-rs/core/src/realtime_conversation.rs:1770][E: codex-rs/core/src/realtime_conversation.rs:1779][E: codex-rs/core/src/realtime_conversation.rs:1791][E: codex-rs/core/src/realtime_conversation.rs:1804][E: codex-rs/core/src/realtime_conversation.rs:1918][E: codex-rs/core/src/realtime_conversation.rs:1421][E: codex-rs/core/src/realtime_conversation.rs:1940][E: codex-rs/core/src/realtime_conversation.rs:1954][E: codex-rs/core/src/realtime_conversation.rs:2026][E: codex-rs/core/src/realtime_conversation.rs:2029][E: codex-rs/core/src/realtime_conversation.rs:2035]

`RealtimeDelegation` typed fragment wraps handoff input and optional active transcript delta in escaped XML before fanout routes it into the normal thread input path。`RealtimeDelegationSource::TranscriptTailFlush` 还会写入 source tag，使 session close 后的剩余 transcript tail 与普通 handoff 可区分。[E: codex-rs/core/src/context/realtime_delegation.rs:4][E: codex-rs/core/src/context/realtime_delegation.rs:10][E: codex-rs/core/src/context/realtime_delegation.rs:31][E: codex-rs/core/src/context/realtime_delegation.rs:44][E: codex-rs/core/src/context/realtime_delegation.rs:48][E: codex-rs/core/src/context/realtime_delegation.rs:54][E: codex-rs/core/src/realtime_conversation.rs:1820]

## Prompt and startup context

`prepare_realtime_backend_prompt()` prefers a non-empty config override, then request prompt, then an empty prompt if the request explicitly supplies `None`, and otherwise renders the bundled backend prompt with the current user first name.[E: codex-rs/core/src/realtime_prompt.rs:9][E: codex-rs/core/src/realtime_prompt.rs:12][E: codex-rs/core/src/realtime_prompt.rs:16][E: codex-rs/core/src/realtime_prompt.rs:17][E: codex-rs/core/src/realtime_prompt.rs:21][E: codex-rs/core/src/realtime_prompt.rs:23]

`build_realtime_startup_context()` builds optional startup context from current thread history, recent work and a bounded workspace map, returns `None` when all are absent, adds an exclusion note, and wraps the result in the startup context XML tags.[E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:69][E: codex-rs/core/src/realtime_context.rs:70][E: codex-rs/core/src/realtime_context.rs:71][E: codex-rs/core/src/realtime_context.rs:73][E: codex-rs/core/src/realtime_context.rs:78][E: codex-rs/core/src/realtime_context.rs:110][E: codex-rs/core/src/realtime_context.rs:116][E: codex-rs/core/src/realtime_context.rs:489]

## Gotchas

- Text output modality requires realtime V2; `build_realtime_session_config()` rejects V1 text output.[E: codex-rs/core/src/realtime_conversation.rs:864][E: codex-rs/core/src/realtime_conversation.rs:1287][E: codex-rs/core/src/realtime_conversation.rs:1289]
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
