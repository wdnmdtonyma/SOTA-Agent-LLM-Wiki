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
updated: 4d7a5c7c73
---

> turn/review/realtime 方法是 app-server 把用户输入送入已有 thread、追加 steering input、中断 active turn、启动 review，以及操作 experimental thread realtime session 的 client request catalog。

## 能回答的问题

- `turn/start`、`turn/steer`、`turn/interrupt` 的 wire name 和类型是什么？
- review/start 当前属于哪个 client request catalog？
- realtime 方法有哪些 append/start/stop/list voices 变体？
- 哪些 turn/realtime 方法使用 params inspection 或 experimental gate？

## 字段模型

`TurnStartParams`、`TurnStartResponse`、`TurnSteerParams` 和 `TurnInterruptParams` 定义在 `v2/turn.rs`；`ReviewStartParams` 和 `ReviewTarget` 定义在 `v2/review.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:71][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:166][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:175][E: codex-rs/app-server-protocol/src/protocol/v2/turn.rs:209][E: codex-rs/app-server-protocol/src/protocol/v2/review.rs:17][E: codex-rs/app-server-protocol/src/protocol/v2/review.rs:43]

`turn/start` 和 `turn/steer` 在宏调用中使用 `inspect_params: true`；realtime family 在宏调用中全部带 `#[experimental(...)]`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:824][E: codex-rs/app-server-protocol/src/protocol/common.rs:830][E: codex-rs/app-server-protocol/src/protocol/common.rs:839][E: codex-rs/app-server-protocol/src/protocol/common.rs:845][E: codex-rs/app-server-protocol/src/protocol/common.rs:851][E: codex-rs/app-server-protocol/src/protocol/common.rs:857][E: codex-rs/app-server-protocol/src/protocol/common.rs:863][E: codex-rs/app-server-protocol/src/protocol/common.rs:869]

目标 HEAD 没有新增 turn/review/realtime wire method，但 `ThreadRealtimeStartParams` 扩为 V3-aware shape：新增 transcript-tail flush、`CodexResponseHandoffMode` 与 role-bearing `initialItems`；`initialItems` 只支持 realtime V3，最多 128 items 与 8,192 estimated text tokens。[E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:68][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:77][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:89][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:103][E: codex-rs/app-server-protocol/src/protocol/v2/realtime.rs:127]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `TurnStart` | `turn/start` | `v2::TurnStartParams` | `v2::TurnStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:822][E: codex-rs/app-server-protocol/src/protocol/common.rs:823][E: codex-rs/app-server-protocol/src/protocol/common.rs:824][E: codex-rs/app-server-protocol/src/protocol/common.rs:826] |
| `TurnSteer` | `turn/steer` | `v2::TurnSteerParams` | `v2::TurnSteerResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:828][E: codex-rs/app-server-protocol/src/protocol/common.rs:829][E: codex-rs/app-server-protocol/src/protocol/common.rs:830][E: codex-rs/app-server-protocol/src/protocol/common.rs:832] |
| `TurnInterrupt` | `turn/interrupt` | `v2::TurnInterruptParams` | `v2::TurnInterruptResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:834][E: codex-rs/app-server-protocol/src/protocol/common.rs:835][E: codex-rs/app-server-protocol/src/protocol/common.rs:837] |
| `ThreadRealtimeStart` | `thread/realtime/start` | `v2::ThreadRealtimeStartParams` | `v2::ThreadRealtimeStartResponse` | experimental: thread/realtime/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:839][E: codex-rs/app-server-protocol/src/protocol/common.rs:840][E: codex-rs/app-server-protocol/src/protocol/common.rs:841][E: codex-rs/app-server-protocol/src/protocol/common.rs:843] |
| `ThreadRealtimeAppendAudio` | `thread/realtime/appendAudio` | `v2::ThreadRealtimeAppendAudioParams` | `v2::ThreadRealtimeAppendAudioResponse` | experimental: thread/realtime/appendAudio | [E: codex-rs/app-server-protocol/src/protocol/common.rs:845][E: codex-rs/app-server-protocol/src/protocol/common.rs:846][E: codex-rs/app-server-protocol/src/protocol/common.rs:847][E: codex-rs/app-server-protocol/src/protocol/common.rs:849] |
| `ThreadRealtimeAppendText` | `thread/realtime/appendText` | `v2::ThreadRealtimeAppendTextParams` | `v2::ThreadRealtimeAppendTextResponse` | experimental: thread/realtime/appendText | [E: codex-rs/app-server-protocol/src/protocol/common.rs:851][E: codex-rs/app-server-protocol/src/protocol/common.rs:852][E: codex-rs/app-server-protocol/src/protocol/common.rs:853][E: codex-rs/app-server-protocol/src/protocol/common.rs:855] |
| `ThreadRealtimeAppendSpeech` | `thread/realtime/appendSpeech` | `v2::ThreadRealtimeAppendSpeechParams` | `v2::ThreadRealtimeAppendSpeechResponse` | experimental: thread/realtime/appendSpeech | [E: codex-rs/app-server-protocol/src/protocol/common.rs:857][E: codex-rs/app-server-protocol/src/protocol/common.rs:858][E: codex-rs/app-server-protocol/src/protocol/common.rs:859][E: codex-rs/app-server-protocol/src/protocol/common.rs:861] |
| `ThreadRealtimeStop` | `thread/realtime/stop` | `v2::ThreadRealtimeStopParams` | `v2::ThreadRealtimeStopResponse` | experimental: thread/realtime/stop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:863][E: codex-rs/app-server-protocol/src/protocol/common.rs:864][E: codex-rs/app-server-protocol/src/protocol/common.rs:865][E: codex-rs/app-server-protocol/src/protocol/common.rs:867] |
| `ThreadRealtimeListVoices` | `thread/realtime/listVoices` | `v2::ThreadRealtimeListVoicesParams` | `v2::ThreadRealtimeListVoicesResponse` | experimental: thread/realtime/listVoices | [E: codex-rs/app-server-protocol/src/protocol/common.rs:869][E: codex-rs/app-server-protocol/src/protocol/common.rs:870][E: codex-rs/app-server-protocol/src/protocol/common.rs:871][E: codex-rs/app-server-protocol/src/protocol/common.rs:873] |
| `ReviewStart` | `review/start` | `v2::ReviewStartParams` | `v2::ReviewStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:875][E: codex-rs/app-server-protocol/src/protocol/common.rs:876][E: codex-rs/app-server-protocol/src/protocol/common.rs:878] |

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
