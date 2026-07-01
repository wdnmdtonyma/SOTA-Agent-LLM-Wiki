---
id: subsys.core.realtime-conversation
title: Realtime conversation
kind: subsystem
tier: T2
source: [codex-rs/core/src/realtime_conversation.rs, codex-rs/core/src/realtime_context.rs, codex-rs/core/src/realtime_prompt.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/protocol.rs]
symbols: [RealtimeConversationManager, ConversationStartParams, ConversationStartTransport, RealtimeSessionKind, RealtimeHandoffState, RealtimeOutbound, RealtimeEvent, handle_start, handle_audio, handle_text, handle_speech, handle_close, build_realtime_startup_context, prepare_realtime_backend_prompt]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: db887d03e1
---

> Realtime conversation is a side-channel beside normal turns: protocol `Op` variants start, feed, close and list voices for realtime streams; `session/handlers.rs` dispatches those variants without spawning a regular task; `RealtimeConversationManager` owns the active realtime state.[E: codex-rs/protocol/src/protocol.rs:525][E: codex-rs/protocol/src/protocol.rs:528][E: codex-rs/protocol/src/protocol.rs:531][E: codex-rs/protocol/src/protocol.rs:534][E: codex-rs/protocol/src/protocol.rs:537][E: codex-rs/protocol/src/protocol.rs:540][E: codex-rs/core/src/session/handlers.rs:722][E: codex-rs/core/src/session/handlers.rs:737][E: codex-rs/core/src/session/handlers.rs:741][E: codex-rs/core/src/session/handlers.rs:745][E: codex-rs/core/src/session/handlers.rs:749][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/realtime_conversation.rs:96]

## 能回答的问题

- Realtime start/audio/text/speech/close/list voices 分别走哪个 handler?
- websocket 与 WebRTC transport 在 start path 中如何分支?
- V1/V2 realtime sessions 的 parser/session kind 如何选择?
- Codex backend output 如何回灌到 realtime conversation?
- startup context 与 backend prompt 如何构造?

## Protocol surface

`ConversationStartParams` carries realtime handoff behavior, model, output modality, startup-context flag, prompt, session id, transport, version and voice overrides for one realtime session.[E: codex-rs/protocol/src/protocol.rs:193][E: codex-rs/protocol/src/protocol.rs:195][E: codex-rs/protocol/src/protocol.rs:197][E: codex-rs/protocol/src/protocol.rs:205][E: codex-rs/protocol/src/protocol.rs:207][E: codex-rs/protocol/src/protocol.rs:209][E: codex-rs/protocol/src/protocol.rs:210][E: codex-rs/protocol/src/protocol.rs:211][E: codex-rs/protocol/src/protocol.rs:212][E: codex-rs/protocol/src/protocol.rs:214][E: codex-rs/protocol/src/protocol.rs:215]

`ConversationStartTransport` is either `Websocket` or `Webrtc { sdp }`; realtime event payloads cover session updates, transcript deltas, audio output, response lifecycle, conversation items, handoff/noop requests and errors.[E: codex-rs/protocol/src/protocol.rs:219][E: codex-rs/protocol/src/protocol.rs:220][E: codex-rs/protocol/src/protocol.rs:221][E: codex-rs/protocol/src/protocol.rs:388][E: codex-rs/protocol/src/protocol.rs:389][E: codex-rs/protocol/src/protocol.rs:394][E: codex-rs/protocol/src/protocol.rs:398][E: codex-rs/protocol/src/protocol.rs:399][E: codex-rs/protocol/src/protocol.rs:402][E: codex-rs/protocol/src/protocol.rs:406][E: codex-rs/protocol/src/protocol.rs:407][E: codex-rs/protocol/src/protocol.rs:408]

Realtime outputs use dedicated `EventMsg` variants for lifecycle start, streaming payload, close and SDP; list-voices returns `RealtimeConversationListVoicesResponseEvent` containing a `RealtimeVoicesList`.[E: codex-rs/protocol/src/protocol.rs:1279][E: codex-rs/protocol/src/protocol.rs:1282][E: codex-rs/protocol/src/protocol.rs:1285][E: codex-rs/protocol/src/protocol.rs:1288][E: codex-rs/protocol/src/protocol.rs:1611][E: codex-rs/protocol/src/protocol.rs:1612][E: codex-rs/protocol/src/protocol.rs:3739][E: codex-rs/protocol/src/protocol.rs:3740]

## Start path

The dispatch loop routes realtime start/audio/text/speech/close/list-voices ops to realtime handlers and each branch returns `false`, so these ops do not start a normal `RegularTask`.[E: codex-rs/core/src/session/handlers.rs:722][E: codex-rs/core/src/session/handlers.rs:735][E: codex-rs/core/src/session/handlers.rs:737][E: codex-rs/core/src/session/handlers.rs:739][E: codex-rs/core/src/session/handlers.rs:741][E: codex-rs/core/src/session/handlers.rs:743][E: codex-rs/core/src/session/handlers.rs:745][E: codex-rs/core/src/session/handlers.rs:747][E: codex-rs/core/src/session/handlers.rs:749][E: codex-rs/core/src/session/handlers.rs:751][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:755]

`handle_start()` prepares the request before opening transport; preparation chooses provider/auth/config, defaults absent transport to websocket, applies experimental realtime base URL overrides, chooses V1 for WebRTC without an explicit version, validates AVAS WebRTC constraints, builds `RealtimeSessionConfig`, and creates headers with or without an API key depending on transport.[E: codex-rs/core/src/realtime_conversation.rs:685][E: codex-rs/core/src/realtime_conversation.rs:739][E: codex-rs/core/src/realtime_conversation.rs:745][E: codex-rs/core/src/realtime_conversation.rs:750][E: codex-rs/core/src/realtime_conversation.rs:752][E: codex-rs/core/src/realtime_conversation.rs:756][E: codex-rs/core/src/realtime_conversation.rs:763][E: codex-rs/core/src/realtime_conversation.rs:765][E: codex-rs/core/src/realtime_conversation.rs:768][E: codex-rs/core/src/realtime_conversation.rs:777][E: codex-rs/core/src/realtime_conversation.rs:782][E: codex-rs/core/src/realtime_conversation.rs:791]

`build_realtime_session_config()` prepares the backend prompt, optionally appends startup context, chooses the model default, maps websocket version to V1 or RealtimeV2 parser, rejects V1 text output, maps configured session type, validates voice, and uses the thread id as default realtime session id.[E: codex-rs/core/src/realtime_conversation.rs:838][E: codex-rs/core/src/realtime_conversation.rs:842][E: codex-rs/core/src/realtime_conversation.rs:860][E: codex-rs/core/src/realtime_conversation.rs:865][E: codex-rs/core/src/realtime_conversation.rs:867][E: codex-rs/core/src/realtime_conversation.rs:869][E: codex-rs/core/src/realtime_conversation.rs:871][E: codex-rs/core/src/realtime_conversation.rs:874][E: codex-rs/core/src/realtime_conversation.rs:878][E: codex-rs/core/src/realtime_conversation.rs:886][E: codex-rs/core/src/realtime_conversation.rs:890][E: codex-rs/core/src/realtime_conversation.rs:898]

`RealtimeConversationManager::start()` aborts any previous conversation state before `start_inner()`; `start_inner()` maps parser to V1/V2 session kind, creates bounded audio/text/handoff/event channels, and then either creates a WebRTC realtime call plus sideband task or opens a normal realtime websocket connection.[E: codex-rs/core/src/realtime_conversation.rs:292][E: codex-rs/core/src/realtime_conversation.rs:297][E: codex-rs/core/src/realtime_conversation.rs:300][E: codex-rs/core/src/realtime_conversation.rs:317][E: codex-rs/core/src/realtime_conversation.rs:318][E: codex-rs/core/src/realtime_conversation.rs:322][E: codex-rs/core/src/realtime_conversation.rs:324][E: codex-rs/core/src/realtime_conversation.rs:326][E: codex-rs/core/src/realtime_conversation.rs:328][E: codex-rs/core/src/realtime_conversation.rs:348][E: codex-rs/core/src/realtime_conversation.rs:356][E: codex-rs/core/src/realtime_conversation.rs:370][E: codex-rs/core/src/realtime_conversation.rs:378]

After start, `handle_start_inner()` sends `RealtimeConversationStarted`, optionally sends `RealtimeConversationSdp`, spawns a fanout task over realtime events, routes `HandoffRequested` text into normal realtime text input, forwards each realtime event as `RealtimeConversationRealtime`, and sends the close event after finishing active state.[E: codex-rs/core/src/realtime_conversation.rs:999][E: codex-rs/core/src/realtime_conversation.rs:1001][E: codex-rs/core/src/realtime_conversation.rs:1014][E: codex-rs/core/src/realtime_conversation.rs:1016][E: codex-rs/core/src/realtime_conversation.rs:1024][E: codex-rs/core/src/realtime_conversation.rs:1047][E: codex-rs/core/src/realtime_conversation.rs:1055][E: codex-rs/core/src/realtime_conversation.rs:1061][E: codex-rs/core/src/realtime_conversation.rs:1077][E: codex-rs/core/src/realtime_conversation.rs:1079]

## Input and handoff path

`audio_in()` writes audio frames into the active queue and drops full-queue frames; `text_in()` requires a running conversation, prefixes user text with the session-kind-aware realtime prefix, and sends it to the text queue.[E: codex-rs/core/src/realtime_conversation.rs:444][E: codex-rs/core/src/realtime_conversation.rs:447][E: codex-rs/core/src/realtime_conversation.rs:456][E: codex-rs/core/src/realtime_conversation.rs:459][E: codex-rs/core/src/realtime_conversation.rs:468][E: codex-rs/core/src/realtime_conversation.rs:477][E: codex-rs/core/src/realtime_conversation.rs:484][E: codex-rs/core/src/realtime_conversation.rs:487]

`handoff_out()` converts Codex output into `RealtimeOutbound`: it no-ops for client-managed handoffs, can create conversation items, append or update an active handoff, or send standalone handoff text. `handoff_complete()` no-ops for V1 and emits either `HandoffCompleteAck` or `CompletedHandoff` for V2 depending on response-as-items mode.[E: codex-rs/core/src/realtime_conversation.rs:508][E: codex-rs/core/src/realtime_conversation.rs:521][E: codex-rs/core/src/realtime_conversation.rs:530][E: codex-rs/core/src/realtime_conversation.rs:538][E: codex-rs/core/src/realtime_conversation.rs:555][E: codex-rs/core/src/realtime_conversation.rs:609][E: codex-rs/core/src/realtime_conversation.rs:610][E: codex-rs/core/src/realtime_conversation.rs:621][E: codex-rs/core/src/realtime_conversation.rs:624]

`run_realtime_input_task()` multiplexes user text, background-agent handoff output, realtime server events and user audio frames. `handle_handoff_output()` writes V1 handoff append/function output events or V2 conversation items plus `response.create` requests.[E: codex-rs/core/src/realtime_conversation.rs:1319][E: codex-rs/core/src/realtime_conversation.rs:1338][E: codex-rs/core/src/realtime_conversation.rs:1347][E: codex-rs/core/src/realtime_conversation.rs:1359][E: codex-rs/core/src/realtime_conversation.rs:1372][E: codex-rs/core/src/realtime_conversation.rs:1415][E: codex-rs/core/src/realtime_conversation.rs:1419][E: codex-rs/core/src/realtime_conversation.rs:1425][E: codex-rs/core/src/realtime_conversation.rs:1435][E: codex-rs/core/src/realtime_conversation.rs:1440][E: codex-rs/core/src/realtime_conversation.rs:1443][E: codex-rs/core/src/realtime_conversation.rs:1449]

`realtime_delegation_from_handoff()` wraps handoff input and optional active transcript delta in XML before the fanout path routes it into the normal thread input path.[E: codex-rs/core/src/realtime_conversation.rs:1121][E: codex-rs/core/src/realtime_conversation.rs:1122][E: codex-rs/core/src/realtime_conversation.rs:1123][E: codex-rs/core/src/realtime_conversation.rs:1131][E: codex-rs/core/src/realtime_conversation.rs:1134][E: codex-rs/core/src/realtime_conversation.rs:1138]

## Prompt and startup context

`prepare_realtime_backend_prompt()` prefers a non-empty config override, then request prompt, then an empty prompt if the request explicitly supplies `None`, and otherwise renders the bundled backend prompt with the current user first name.[E: codex-rs/core/src/realtime_prompt.rs:9][E: codex-rs/core/src/realtime_prompt.rs:12][E: codex-rs/core/src/realtime_prompt.rs:16][E: codex-rs/core/src/realtime_prompt.rs:17][E: codex-rs/core/src/realtime_prompt.rs:21][E: codex-rs/core/src/realtime_prompt.rs:23]

`build_realtime_startup_context()` builds optional startup context from current thread history, recent work and a bounded workspace map, returns `None` when all are absent, adds an exclusion note, and wraps the result in the startup context XML tags.[E: codex-rs/core/src/realtime_context.rs:65][E: codex-rs/core/src/realtime_context.rs:66][E: codex-rs/core/src/realtime_context.rs:67][E: codex-rs/core/src/realtime_context.rs:68][E: codex-rs/core/src/realtime_context.rs:69][E: codex-rs/core/src/realtime_context.rs:71][E: codex-rs/core/src/realtime_context.rs:76][E: codex-rs/core/src/realtime_context.rs:108][E: codex-rs/core/src/realtime_context.rs:114][E: codex-rs/core/src/realtime_context.rs:486]

## Gotchas

- Text output modality requires realtime V2; `build_realtime_session_config()` rejects V1 text output.[E: codex-rs/core/src/realtime_conversation.rs:871][E: codex-rs/core/src/realtime_conversation.rs:872][E: codex-rs/core/src/realtime_conversation.rs:874]
- AVAS WebRTC starts require realtime V1 and conversational session mode.[E: codex-rs/core/src/realtime_conversation.rs:818][E: codex-rs/core/src/realtime_conversation.rs:819][E: codex-rs/core/src/realtime_conversation.rs:823][E: codex-rs/core/src/realtime_conversation.rs:824]

## Sources

- `codex-rs/core/src/realtime_conversation.rs`
- `codex-rs/core/src/realtime_context.rs`
- `codex-rs/core/src/realtime_prompt.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [ref.protocol-op](../../reference/protocol-op.md)
- [ref.protocol-event-lifecycle](../../reference/protocol-event-lifecycle.md)
- [subsys.core.session-lifecycle](session-lifecycle.md)
