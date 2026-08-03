---
id: rpc.turn-methods
title: turn/review/realtime 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/turn.rs, codex-rs/app-server-protocol/src/protocol/v2/review.rs, codex-rs/app-server-protocol/src/protocol/v2/realtime.rs]
symbols: [TurnStartParams, TurnStartResponse, TurnSteerParams, TurnInterruptParams, ReviewStartParams, ThreadRealtimeStartParams, ThreadRealtimeAppendSpeechParams]
related: [rpc.overview, rpc.thread-methods, rpc.notifications-thread, rpc.notifications-system, subsys.core.turn-engine, subsys.core.review-mode, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 7750465934
---

> turn/review/realtime 方法是 app-server 把用户输入送入已有 thread、追加 steering input、中断 active turn、启动 review，以及操作 experimental thread realtime session 的 client request catalog。

## 能回答的问题

- `turn/start`、`turn/steer`、`turn/interrupt` 的 wire name 和类型是什么？
- review/start 当前属于哪个 client request catalog？
- realtime 方法有哪些 append/start/stop/list voices 变体？
- 哪些 turn/realtime 方法使用 params inspection 或 experimental gate？

## 字段模型

`TurnStartParams`、`TurnStartResponse`、`TurnSteerParams` 和 `TurnInterruptParams` 定义在 `v2/turn.rs`；`ReviewStartParams` 和 `ReviewTarget` 定义在 `v2/review.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:71][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:166][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:175][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:209][E: codex-rs/app-server-protocol/src/protocol/v2/review.rs:17][E: codex-rs/app-server-protocol/src/protocol/v2/review.rs:43]

`turn/start` 和 `turn/steer` 在宏调用中使用 `inspect_params: true`；realtime family 在宏调用中全部带 `#[experimental(...)]`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:857][E: codex-rs/app-server-protocol/src/protocol/common.rs:863][E: codex-rs/app-server-protocol/src/protocol/common.rs:872][E: codex-rs/app-server-protocol/src/protocol/common.rs:878][E: codex-rs/app-server-protocol/src/protocol/common.rs:884][E: codex-rs/app-server-protocol/src/protocol/common.rs:890][E: codex-rs/app-server-protocol/src/protocol/common.rs:896][E: codex-rs/app-server-protocol/src/protocol/common.rs:902]

目标 HEAD 没有新增 turn/review/realtime wire method，但 `ThreadRealtimeStartParams` 继续扩展 V3-aware shape：`delegationAckFiller` 控制 delegation acknowledgement filler，`realtimeStartInstructions`/`realtimeEndInstructions` 分别给 session start/end 的 backing Codex model 注入 developer instructions；已有 transcript-tail、handoff channel 和 role-bearing `initialItems` knobs 仍保留。[E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:69][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:78][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:94][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:112][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:118]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `TurnStart` | `turn/start` | `v2::TurnStartParams` | `v2::TurnStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:855][E: codex-rs/app-server-protocol/src/protocol/common.rs:856][E: codex-rs/app-server-protocol/src/protocol/common.rs:857][E: codex-rs/app-server-protocol/src/protocol/common.rs:859] |
| `TurnSteer` | `turn/steer` | `v2::TurnSteerParams` | `v2::TurnSteerResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:861][E: codex-rs/app-server-protocol/src/protocol/common.rs:862][E: codex-rs/app-server-protocol/src/protocol/common.rs:863][E: codex-rs/app-server-protocol/src/protocol/common.rs:865] |
| `TurnInterrupt` | `turn/interrupt` | `v2::TurnInterruptParams` | `v2::TurnInterruptResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:867][E: codex-rs/app-server-protocol/src/protocol/common.rs:868][E: codex-rs/app-server-protocol/src/protocol/common.rs:870] |
| `ThreadRealtimeStart` | `thread/realtime/start` | `v2::ThreadRealtimeStartParams` | `v2::ThreadRealtimeStartResponse` | experimental: thread/realtime/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:872][E: codex-rs/app-server-protocol/src/protocol/common.rs:873][E: codex-rs/app-server-protocol/src/protocol/common.rs:874][E: codex-rs/app-server-protocol/src/protocol/common.rs:876] |
| `ThreadRealtimeAppendAudio` | `thread/realtime/appendAudio` | `v2::ThreadRealtimeAppendAudioParams` | `v2::ThreadRealtimeAppendAudioResponse` | experimental: thread/realtime/appendAudio | [E: codex-rs/app-server-protocol/src/protocol/common.rs:878][E: codex-rs/app-server-protocol/src/protocol/common.rs:879][E: codex-rs/app-server-protocol/src/protocol/common.rs:880][E: codex-rs/app-server-protocol/src/protocol/common.rs:882] |
| `ThreadRealtimeAppendText` | `thread/realtime/appendText` | `v2::ThreadRealtimeAppendTextParams` | `v2::ThreadRealtimeAppendTextResponse` | experimental: thread/realtime/appendText | [E: codex-rs/app-server-protocol/src/protocol/common.rs:884][E: codex-rs/app-server-protocol/src/protocol/common.rs:885][E: codex-rs/app-server-protocol/src/protocol/common.rs:886][E: codex-rs/app-server-protocol/src/protocol/common.rs:888] |
| `ThreadRealtimeAppendSpeech` | `thread/realtime/appendSpeech` | `v2::ThreadRealtimeAppendSpeechParams` | `v2::ThreadRealtimeAppendSpeechResponse` | experimental: thread/realtime/appendSpeech | [E: codex-rs/app-server-protocol/src/protocol/common.rs:890][E: codex-rs/app-server-protocol/src/protocol/common.rs:891][E: codex-rs/app-server-protocol/src/protocol/common.rs:892][E: codex-rs/app-server-protocol/src/protocol/common.rs:894] |
| `ThreadRealtimeStop` | `thread/realtime/stop` | `v2::ThreadRealtimeStopParams` | `v2::ThreadRealtimeStopResponse` | experimental: thread/realtime/stop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:896][E: codex-rs/app-server-protocol/src/protocol/common.rs:897][E: codex-rs/app-server-protocol/src/protocol/common.rs:898][E: codex-rs/app-server-protocol/src/protocol/common.rs:900] |
| `ThreadRealtimeListVoices` | `thread/realtime/listVoices` | `v2::ThreadRealtimeListVoicesParams` | `v2::ThreadRealtimeListVoicesResponse` | experimental: thread/realtime/listVoices | [E: codex-rs/app-server-protocol/src/protocol/common.rs:902][E: codex-rs/app-server-protocol/src/protocol/common.rs:903][E: codex-rs/app-server-protocol/src/protocol/common.rs:904][E: codex-rs/app-server-protocol/src/protocol/common.rs:906] |
| `ReviewStart` | `review/start` | `v2::ReviewStartParams` | `v2::ReviewStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:908][E: codex-rs/app-server-protocol/src/protocol/common.rs:909][E: codex-rs/app-server-protocol/src/protocol/common.rs:911] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/turn.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/review.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/realtime.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
