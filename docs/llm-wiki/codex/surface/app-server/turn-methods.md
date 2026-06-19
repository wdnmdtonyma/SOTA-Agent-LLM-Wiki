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
updated: 5670360009
---

> turn/review/realtime 方法是 app-server 把用户输入送入已有 thread、追加 steering input、中断 active turn、启动 review，以及操作 experimental thread realtime session 的 client request catalog。

## 能回答的问题

- `turn/start`、`turn/steer`、`turn/interrupt` 的 wire name 和类型是什么？
- review/start 当前属于哪个 client request catalog？
- realtime 方法有哪些 append/start/stop/list voices 变体？
- 哪些 turn/realtime 方法使用 params inspection 或 experimental gate？

## 字段模型

`TurnStartParams`、`TurnStartResponse`、`TurnSteerParams` 和 `TurnInterruptParams` 定义在 `v2/turn.rs`；`ReviewStartParams` 和 `ReviewTarget` 定义在 `v2/review.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:67][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:157][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:166][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:200][E: codex-rs/app-server-protocol/src/protocol/v2/review.rs:17][E: codex-rs/app-server-protocol/src/protocol/v2/review.rs:43]

`turn/start` 和 `turn/steer` 在宏调用中使用 `inspect_params: true`；realtime family 在宏调用中全部带 `#[experimental(...)]`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:801][E: codex-rs/app-server-protocol/src/protocol/common.rs:807][E: codex-rs/app-server-protocol/src/protocol/common.rs:816][E: codex-rs/app-server-protocol/src/protocol/common.rs:822][E: codex-rs/app-server-protocol/src/protocol/common.rs:828][E: codex-rs/app-server-protocol/src/protocol/common.rs:834][E: codex-rs/app-server-protocol/src/protocol/common.rs:840][E: codex-rs/app-server-protocol/src/protocol/common.rs:846]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `TurnStart` | `turn/start` | `v2::TurnStartParams` | `v2::TurnStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:799][E: codex-rs/app-server-protocol/src/protocol/common.rs:800][E: codex-rs/app-server-protocol/src/protocol/common.rs:801][E: codex-rs/app-server-protocol/src/protocol/common.rs:803] |
| `TurnSteer` | `turn/steer` | `v2::TurnSteerParams` | `v2::TurnSteerResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:805][E: codex-rs/app-server-protocol/src/protocol/common.rs:806][E: codex-rs/app-server-protocol/src/protocol/common.rs:807][E: codex-rs/app-server-protocol/src/protocol/common.rs:809] |
| `TurnInterrupt` | `turn/interrupt` | `v2::TurnInterruptParams` | `v2::TurnInterruptResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:811][E: codex-rs/app-server-protocol/src/protocol/common.rs:812][E: codex-rs/app-server-protocol/src/protocol/common.rs:814] |
| `ThreadRealtimeStart` | `thread/realtime/start` | `v2::ThreadRealtimeStartParams` | `v2::ThreadRealtimeStartResponse` | experimental: thread/realtime/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:816][E: codex-rs/app-server-protocol/src/protocol/common.rs:817][E: codex-rs/app-server-protocol/src/protocol/common.rs:818][E: codex-rs/app-server-protocol/src/protocol/common.rs:820] |
| `ThreadRealtimeAppendAudio` | `thread/realtime/appendAudio` | `v2::ThreadRealtimeAppendAudioParams` | `v2::ThreadRealtimeAppendAudioResponse` | experimental: thread/realtime/appendAudio | [E: codex-rs/app-server-protocol/src/protocol/common.rs:822][E: codex-rs/app-server-protocol/src/protocol/common.rs:823][E: codex-rs/app-server-protocol/src/protocol/common.rs:824][E: codex-rs/app-server-protocol/src/protocol/common.rs:826] |
| `ThreadRealtimeAppendText` | `thread/realtime/appendText` | `v2::ThreadRealtimeAppendTextParams` | `v2::ThreadRealtimeAppendTextResponse` | experimental: thread/realtime/appendText | [E: codex-rs/app-server-protocol/src/protocol/common.rs:828][E: codex-rs/app-server-protocol/src/protocol/common.rs:829][E: codex-rs/app-server-protocol/src/protocol/common.rs:830][E: codex-rs/app-server-protocol/src/protocol/common.rs:832] |
| `ThreadRealtimeAppendSpeech` | `thread/realtime/appendSpeech` | `v2::ThreadRealtimeAppendSpeechParams` | `v2::ThreadRealtimeAppendSpeechResponse` | experimental: thread/realtime/appendSpeech | [E: codex-rs/app-server-protocol/src/protocol/common.rs:834][E: codex-rs/app-server-protocol/src/protocol/common.rs:835][E: codex-rs/app-server-protocol/src/protocol/common.rs:836][E: codex-rs/app-server-protocol/src/protocol/common.rs:838] |
| `ThreadRealtimeStop` | `thread/realtime/stop` | `v2::ThreadRealtimeStopParams` | `v2::ThreadRealtimeStopResponse` | experimental: thread/realtime/stop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:840][E: codex-rs/app-server-protocol/src/protocol/common.rs:841][E: codex-rs/app-server-protocol/src/protocol/common.rs:842][E: codex-rs/app-server-protocol/src/protocol/common.rs:844] |
| `ThreadRealtimeListVoices` | `thread/realtime/listVoices` | `v2::ThreadRealtimeListVoicesParams` | `v2::ThreadRealtimeListVoicesResponse` | experimental: thread/realtime/listVoices | [E: codex-rs/app-server-protocol/src/protocol/common.rs:846][E: codex-rs/app-server-protocol/src/protocol/common.rs:847][E: codex-rs/app-server-protocol/src/protocol/common.rs:848][E: codex-rs/app-server-protocol/src/protocol/common.rs:850] |
| `ReviewStart` | `review/start` | `v2::ReviewStartParams` | `v2::ReviewStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:852][E: codex-rs/app-server-protocol/src/protocol/common.rs:853][E: codex-rs/app-server-protocol/src/protocol/common.rs:855] |

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
