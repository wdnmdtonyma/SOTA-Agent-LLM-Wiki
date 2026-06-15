---
id: rpc.turn-methods
title: turn 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2.rs]
symbols: [TurnStartParams, TurnStartResponse, TurnSteerParams, TurnSteerResponse, TurnInterruptParams, TurnInterruptResponse, ReviewStartParams, ThreadRealtimeStartParams]
related: [rpc.overview, rpc.thread-methods, rpc.notifications-thread, rpc.notifications-system, subsys.core.turn-engine, subsys.core.review-mode, subsys.core.realtime-conversation]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> turn 方法是 app-server v2 把用户输入送入现有 thread、追加 steering input、中断 active turn、启动 review，以及操作 experimental thread realtime session 的 client request catalog。

## 能回答的问题

- `turn/start`、`turn/steer`、`turn/interrupt` 的 wire name 和类型是什么？
- `turn/start` 支持哪些 per-turn overrides？
- `turn/steer` 如何避免 steering 到错误 active turn？
- `review/start` 的 target 类型有哪些？
- thread realtime 的 start/append/stop/list voices 方法有哪些？

## Turn 输入与 override

`TurnStartParams` 必带 `thread_id` 和 `input: Vec<UserInput>`，并可覆盖 cwd、approval policy、approvals reviewer、sandbox policy、model、service tier、reasoning effort、summary、personality 和 final response `output_schema`。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:4768][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4769][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4770][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4781][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4785][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4789][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4792][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4795][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4804][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4807][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4810][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4813][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4817]

`TurnSteerParams` 同样带 `thread_id` 和 `input`，并要求 `expected_turn_id` 与当前 active turn 匹配；源码注释把 `expected_turn_id` 称为 required active turn id precondition。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:4908][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4909][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4910][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4915][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4916][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4917]

## 方法 catalog

| Variant | Wire method | Params type | Response type | 说明 | Evidence |
|---|---|---|---|---|---|
| `TurnStart` | `turn/start` | `v2::TurnStartParams` | `v2::TurnStartResponse` | 在已有 thread 上启动一个 turn；`output_schema` 是 params 字段，`inspect_params` 对 responsesapi client metadata、environments、nested approval policy、collaboration 等 experimental 字段做 gating。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:428][E: codex-rs/app-server-protocol/src/protocol/common.rs:429][E: codex-rs/app-server-protocol/src/protocol/common.rs:431][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4784][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4788][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4817][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4824][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4826] |
| `TurnSteer` | `turn/steer` | `v2::TurnSteerParams` | `v2::TurnSteerResponse` | 向 active turn 追加 input；response 返回 `turn_id`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:433][E: codex-rs/app-server-protocol/src/protocol/common.rs:434][E: codex-rs/app-server-protocol/src/protocol/common.rs:436][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4910][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4924] |
| `TurnInterrupt` | `turn/interrupt` | `v2::TurnInterruptParams` | `v2::TurnInterruptResponse` | 中断指定 thread/turn；params 是 `thread_id` 和 `turn_id`。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:438][E: codex-rs/app-server-protocol/src/protocol/common.rs:439][E: codex-rs/app-server-protocol/src/protocol/common.rs:440][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4931][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4932] |
| `ReviewStart` | `review/start` | `v2::ReviewStartParams` | `v2::ReviewStartResponse` | 启动 review task；target 可为 uncommitted changes、base branch、commit 或 custom instructions。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:467][E: codex-rs/app-server-protocol/src/protocol/common.rs:468][E: codex-rs/app-server-protocol/src/protocol/common.rs:469][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4860][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4865][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4870][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4879] |
| `ThreadRealtimeStart` | `thread/realtime/start` | `v2::ThreadRealtimeStartParams` | `v2::ThreadRealtimeStartResponse` | Experimental；启动 thread-scoped realtime session，transport 可为 websocket 或 WebRTC SDP offer。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:442][E: codex-rs/app-server-protocol/src/protocol/common.rs:443][E: codex-rs/app-server-protocol/src/protocol/common.rs:444][E: codex-rs/app-server-protocol/src/protocol/common.rs:445][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4567][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4593][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4594][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4597] |
| `ThreadRealtimeAppendAudio` | `thread/realtime/appendAudio` | `v2::ThreadRealtimeAppendAudioParams` | `v2::ThreadRealtimeAppendAudioResponse` | Experimental；给 realtime session 追加 audio chunk。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:447][E: codex-rs/app-server-protocol/src/protocol/common.rs:448][E: codex-rs/app-server-protocol/src/protocol/common.rs:449][E: codex-rs/app-server-protocol/src/protocol/common.rs:450][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4611][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4613] |
| `ThreadRealtimeAppendText` | `thread/realtime/appendText` | `v2::ThreadRealtimeAppendTextParams` | `v2::ThreadRealtimeAppendTextResponse` | Experimental；给 realtime session 追加 text input。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:452][E: codex-rs/app-server-protocol/src/protocol/common.rs:453][E: codex-rs/app-server-protocol/src/protocol/common.rs:454][E: codex-rs/app-server-protocol/src/protocol/common.rs:455][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4626][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4628] |
| `ThreadRealtimeStop` | `thread/realtime/stop` | `v2::ThreadRealtimeStopParams` | `v2::ThreadRealtimeStopResponse` | Experimental；停止 thread realtime session。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:457][E: codex-rs/app-server-protocol/src/protocol/common.rs:458][E: codex-rs/app-server-protocol/src/protocol/common.rs:459][E: codex-rs/app-server-protocol/src/protocol/common.rs:460][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4641][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4642] |
| `ThreadRealtimeListVoices` | `thread/realtime/listVoices` | `v2::ThreadRealtimeListVoicesParams` | `v2::ThreadRealtimeListVoicesResponse` | Experimental；列 supported realtime voices。 | [E: codex-rs/app-server-protocol/src/protocol/common.rs:462][E: codex-rs/app-server-protocol/src/protocol/common.rs:463][E: codex-rs/app-server-protocol/src/protocol/common.rs:464][E: codex-rs/app-server-protocol/src/protocol/common.rs:465][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4661][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4662] |

## 设计动机

`turn/start` 的 overrides 使用“对当前 turn 和后续 turns 生效”的字段注释，例如 cwd、approval policy、sandbox policy、model、service tier、reasoning effort、summary 和 personality 都按这种语义写在 params struct 内。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:4779][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4782][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4790][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4793][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4796][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4805][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4808][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4811] `review/start` 支持 inline 或 detached delivery，detached review 会把 review 跑在新 review thread 并通过 `review_thread_id` 返回目标 thread。[E: codex-rs/app-server-protocol/src/protocol/v2.rs:369][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4837][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4840][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4851][E: codex-rs/app-server-protocol/src/protocol/v2.rs:4852]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
