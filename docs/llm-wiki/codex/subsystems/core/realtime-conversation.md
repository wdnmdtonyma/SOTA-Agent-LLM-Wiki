---
id: subsys.core.realtime-conversation
title: Realtime conversation
kind: subsystem
tier: T2
source: [codex-rs/core/src/realtime_conversation.rs, codex-rs/core/src/realtime_conversation/bem.rs, codex-rs/core/src/context/realtime_delegation.rs, codex-rs/core/src/context/realtime_start_with_instructions.rs, codex-rs/core/src/context/realtime_end_instructions.rs, codex-rs/core/src/context/world_state/realtime.rs, codex-rs/core/src/realtime_context.rs, codex-rs/core/src/realtime_prompt.rs, codex-rs/core/src/session/handlers.rs, codex-rs/protocol/src/protocol.rs, codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs, codex-rs/realtime-webrtc/src/lib.rs, codex-rs/realtime-webrtc/src/client.rs, codex-rs/voice-host/src/main.rs]
symbols: [RealtimeConversationManager, RealtimeModeInstructions, ConversationStartParams, ConversationStartTransport, CodexResponseHandoffMode, RealtimeSessionKind, RealtimeHandoffState, RealtimeDelegation]
related: [ref.protocol-op, ref.protocol-event-lifecycle, subsys.platform.realtime, subsys.core.session-lifecycle, rpc.turn-methods]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Realtime conversation is a side-channel beside normal turns: protocol `Op` variants start, feed, close and list voices; `session/handlers.rs` dispatches those variants without spawning a regular task; `RealtimeConversationManager` owns the active realtime state. Native WebRTC media lives in `codex-realtime-webrtc` plus the `codex-voice-host` helper, not in the protocol manager.[E: codex-rs/protocol/src/protocol.rs:610][E: codex-rs/protocol/src/protocol.rs:613][E: codex-rs/protocol/src/protocol.rs:616][E: codex-rs/protocol/src/protocol.rs:619][E: codex-rs/protocol/src/protocol.rs:622][E: codex-rs/protocol/src/protocol.rs:625][E: codex-rs/core/src/session/handlers.rs:435][E: codex-rs/core/src/session/handlers.rs:449][E: codex-rs/core/src/realtime_conversation.rs:165][E: codex-rs/realtime-webrtc/src/lib.rs:10][E: codex-rs/voice-host/src/main.rs:48]

## 能回答的问题

- Realtime start/audio/text/speech/close/list voices 分别走哪个 handler?
- websocket 与 WebRTC transport 在 start path 中如何分支?
- `realtime-webrtc` 与 `voice-host` crates 承担什么?
- Codex backend output 如何回灌到 realtime conversation?
- startup context 与 backend prompt 如何构造?

## Protocol surface

`ConversationStartParams` carries realtime handoff behavior、optional Frameless delegation ack filler、model/output modality/startup context、initial items、request-level start/end developer instructions、prompt/session id/transport/version/voice overrides。[E: codex-rs/protocol/src/protocol.rs:220][E: codex-rs/protocol/src/protocol.rs:223][E: codex-rs/protocol/src/protocol.rs:233][E: codex-rs/protocol/src/protocol.rs:245][E: codex-rs/protocol/src/protocol.rs:250]

`ConversationStartTransport` is `Websocket`、`Webrtc { sdp }` or `ExistingCall { call_id, ... }`。[E: codex-rs/protocol/src/protocol.rs:257][E: codex-rs/protocol/src/protocol.rs:258][E: codex-rs/protocol/src/protocol.rs:262]

Realtime outputs use dedicated `EventMsg` variants for lifecycle start, streaming payload, close, SDP and list-voices。[E: codex-rs/protocol/src/protocol.rs:1375][E: codex-rs/protocol/src/protocol.rs:1378][E: codex-rs/protocol/src/protocol.rs:1381][E: codex-rs/protocol/src/protocol.rs:1384][E: codex-rs/protocol/src/protocol.rs:1523]

## Start path

The dispatch loop routes realtime start/audio/text/speech/close/list-voices ops to realtime handlers and each branch returns `false`, so these ops do not start a normal `RegularTask`.[E: codex-rs/core/src/session/handlers.rs:435][E: codex-rs/core/src/session/handlers.rs:449][E: codex-rs/core/src/session/handlers.rs:451][E: codex-rs/core/src/session/handlers.rs:455][E: codex-rs/core/src/session/handlers.rs:459][E: codex-rs/core/src/session/handlers.rs:463][E: codex-rs/core/src/session/handlers.rs:467]

`prepare_realtime_start()` defaults absent transport to websocket and applies experimental realtime WS / WebRTC call base URL overrides。[E: codex-rs/core/src/realtime_conversation.rs:1242][E: codex-rs/core/src/realtime_conversation.rs:1247][E: codex-rs/core/src/realtime_conversation.rs:1260]

request-level `realtime_start_instructions` 与 `realtime_end_instructions` 分别有 8,192 estimated-token 上限。[E: codex-rs/core/src/realtime_conversation.rs:104][E: codex-rs/core/src/realtime_conversation.rs:1389][E: codex-rs/core/src/realtime_conversation.rs:1403] Manager 在 start 成功后保存 `RealtimeModeInstructions`。[E: codex-rs/core/src/realtime_conversation.rs:167][E: codex-rs/core/src/realtime_conversation.rs:597]

`RealtimeConversationManager::start()` aborts previous state before `start_inner()`; `start_inner()` maps parser to V1/V2 session kind, creates bounded channels, then either creates a WebRTC realtime call plus sideband task or opens a websocket。[E: codex-rs/core/src/realtime_conversation.rs:582][E: codex-rs/core/src/realtime_conversation.rs:600][E: codex-rs/core/src/realtime_conversation.rs:618][E: codex-rs/core/src/realtime_conversation.rs:665]

After start, `handle_start_inner()` sends `RealtimeConversationStarted` then fans out events。[E: codex-rs/core/src/realtime_conversation.rs:1616]

## Native WebRTC crates

`codex-realtime-webrtc` exports `VoiceHost` and `RealtimeWebrtcSession` for talking to the packaged helper.[E: codex-rs/realtime-webrtc/src/lib.rs:10][E: codex-rs/realtime-webrtc/src/lib.rs:21] `VoiceHost::connect` spawns `codex-voice-host` from the package `codex-resources/voice/bin` tree.[E: codex-rs/realtime-webrtc/src/client.rs:155][E: codex-rs/realtime-webrtc/src/client.rs:158]

`codex-voice-host` is the same-build helper: `main` hardens the process, answers `--build-commit`, and otherwise runs capture/playback/transport.[E: codex-rs/voice-host/src/main.rs:48][E: codex-rs/voice-host/src/main.rs:52] Core conversation manager still uses HTTP SDP + sideband websocket in `codex-api`; these crates own local media, not protocol `Op` dispatch.[I]

## Input and handoff path

`audio_in()` writes audio frames and drops full-queue frames; `text_in()` requires a running conversation and prefixes user text.[E: codex-rs/core/src/realtime_conversation.rs:791][E: codex-rs/core/src/realtime_conversation.rs:803][E: codex-rs/core/src/realtime_conversation.rs:815][E: codex-rs/core/src/realtime_conversation.rs:829]

`handoff_out()` no-ops for client-managed handoffs.[E: codex-rs/core/src/realtime_conversation.rs:840][E: codex-rs/core/src/realtime_conversation.rs:855] BemTags 模式由 `bem.rs` 按 channel prefix 判定 commentary/final。[E: codex-rs/core/src/realtime_conversation/bem.rs:5]

`RealtimeDelegation` wraps handoff input (and optional transcript delta) in XML; `TranscriptTailFlush` writes a source tag。[E: codex-rs/core/src/context/realtime_delegation.rs:8][E: codex-rs/core/src/context/realtime_delegation.rs:47][E: codex-rs/core/src/context/realtime_delegation.rs:55]

## Prompt and startup context

`prepare_realtime_backend_prompt()` prefers a non-empty config override, then request prompt, then empty if the request supplies `None`, else the bundled prompt.[E: codex-rs/core/src/realtime_prompt.rs:5][E: codex-rs/core/src/realtime_prompt.rs:9][E: codex-rs/core/src/realtime_prompt.rs:16]

`build_realtime_startup_context()` returns `None` when thread/recent-work/workspace sections are all absent.[E: codex-rs/core/src/realtime_context.rs:73]

inactive→active 渲染 custom start fragment；active→inactive 渲染 custom end fragment；相同 active state 不重复发 diff。[E: codex-rs/core/src/context/world_state/realtime.rs:36][E: codex-rs/core/src/context/world_state/realtime.rs:45][E: codex-rs/core/src/context/realtime_start_with_instructions.rs:19][E: codex-rs/core/src/context/realtime_end_instructions.rs:24]

## Gotchas

- Text output modality requires realtime V2.[E: codex-rs/core/src/realtime_conversation.rs:1471]
- AVAS WebRTC starts require v1 or v3 (not V2) and conversational mode.[E: codex-rs/core/src/realtime_conversation.rs:1375][E: codex-rs/core/src/realtime_conversation.rs:1375]
- `delegation_ack_filler` 只有 Frameless session JSON 写到 wire。[E: codex-rs/codex-api/src/endpoint/realtime_websocket/protocol.rs:41]
- 不要把 `realtime-webrtc` / `voice-host` 写成独立 wiki 节点。[I]

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
- `codex-rs/realtime-webrtc/src/lib.rs`
- `codex-rs/realtime-webrtc/src/client.rs`
- `codex-rs/voice-host/src/main.rs`

## 相关

- [ref.protocol-op](../../reference/protocol-op.md)
- [ref.protocol-event-lifecycle](../../reference/protocol-event-lifecycle.md)
- [subsys.core.session-lifecycle](session-lifecycle.md)
- [subsys.platform.realtime](../platform/realtime.md)
