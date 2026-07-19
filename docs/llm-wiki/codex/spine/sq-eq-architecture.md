---
id: spine.sq-eq-architecture
title: SQ/EQ 双队列架构
kind: flow
tier: T0
source: [codex-rs/protocol/src/protocol.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs]
symbols: [Submission, Op, Event, EventMsg, CodexThread, SessionIo, Session::spawn_internal, submission_loop]
related: [spine.overview, spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Codex 的 SQ/EQ 是 thread 的双向消息骨架：`Submission { id, op, client_user_message_id, trace }` 进入 submission channel，`Event { id, msg }` 从 event channel 回到 client。[E: codex-rs/protocol/src/protocol.rs:174][E: codex-rs/protocol/src/protocol.rs:176][E: codex-rs/protocol/src/protocol.rs:178][E: codex-rs/protocol/src/protocol.rs:180][E: codex-rs/protocol/src/protocol.rs:182][E: codex-rs/protocol/src/protocol.rs:1267][E: codex-rs/protocol/src/protocol.rs:1269][E: codex-rs/protocol/src/protocol.rs:1271]

## 能回答的问题

- Submission Queue 与 Event Queue 分别承载什么 Rust 类型？
- `CodexThread`、`SessionIo`、`Session` 在双队列中各自负责什么？
- `Submission.id`、W3C trace、`Event.id` 的边界在哪里？
- 当前 regular turn 入口为什么是 `Op::UserInput`？

```mermaid
sequenceDiagram
    participant Client
    participant Thread as CodexThread
    participant IO as SessionIo
    participant SQ as tx_sub/rx_sub
    participant Loop as submission_loop
    participant Session
    participant EQ as tx_event/rx_event
    Client->>Thread: submit(Op)
    Thread->>IO: submit(op)
    IO->>SQ: Submission
    SQ->>Loop: rx_sub.recv()
    Loop->>Session: dispatch op
    Session->>EQ: Event { id: turn sub_id, msg }
    EQ-->>IO: next_event()
    IO-->>Thread: Event
```

## 端到端步骤

1. Protocol 层把 SQ entry 定义为 `Submission`，字段包括 correlation id、`Op` payload、client message id 和可选 W3C trace carrier。[E: codex-rs/protocol/src/protocol.rs:174][E: codex-rs/protocol/src/protocol.rs:176][E: codex-rs/protocol/src/protocol.rs:178][E: codex-rs/protocol/src/protocol.rs:180][E: codex-rs/protocol/src/protocol.rs:182]
2. 当前 regular turn 的 submission payload 是 `Op::UserInput { items, final_output_json_schema, responsesapi_client_metadata, additional_context, thread_settings }`；`Op::ThreadSettings` 和 `Op::InterAgentCommunication` 也走同一条 submission loop。[E: codex-rs/protocol/src/protocol.rs:556][E: codex-rs/protocol/src/protocol.rs:558][E: codex-rs/protocol/src/protocol.rs:574][E: codex-rs/protocol/src/protocol.rs:581]
3. Protocol 层把 EQ entry 定义为 `Event { id, msg }`，`EventMsg` 是 tagged enum，包含 warning、realtime、model routing、verification 等事件族。[E: codex-rs/protocol/src/protocol.rs:1267][E: codex-rs/protocol/src/protocol.rs:1269][E: codex-rs/protocol/src/protocol.rs:1271][E: codex-rs/protocol/src/protocol.rs:1285][E: codex-rs/protocol/src/protocol.rs:1291][E: codex-rs/protocol/src/protocol.rs:1297][E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:1309][E: codex-rs/protocol/src/protocol.rs:1312]
4. `CodexThread` 是 public bidirectional conduit，内部组合 `Arc<Session>` 和 `SessionIo`；queue methods 转发给 `io`。[E: codex-rs/core/src/codex_thread.rs:162][E: codex-rs/core/src/codex_thread.rs:187][E: codex-rs/core/src/codex_thread.rs:205][E: codex-rs/core/src/codex_thread.rs:414]
5. `Session::spawn_internal` 创建 bounded submission channel 和 unbounded event channel；capacity 是 512。[E: codex-rs/core/src/session/mod.rs:465][E: codex-rs/core/src/session/mod.rs:495][E: codex-rs/core/src/session/mod.rs:533][E: codex-rs/core/src/session/mod.rs:534]
6. `spawn_internal` 初始化 `Session`，启动 `submission_loop`，返回 `(session, SessionIo)`；io 只持 tx/rx/status/termination endpoints。[E: codex-rs/core/src/session/mod.rs:721][E: codex-rs/core/src/session/mod.rs:726][E: codex-rs/core/src/session/mod.rs:733]
7. `SessionIo::submit_with_trace` 生成 UUID v7 submission id；`submit_with_id` 在 trace 为空时补当前 span W3C trace，再发送到 `tx_sub`。[E: codex-rs/core/src/session/mod.rs:743][E: codex-rs/core/src/session/mod.rs:748][E: codex-rs/core/src/session/mod.rs:778][E: codex-rs/core/src/session/mod.rs:782]
8. `submission_loop` 持续从 `rx_sub.recv().await` 取 `Submission`，为每个 submission 建 dispatch span，再按 `Op` 分派到 user input、thread settings、inter-agent communication 等 handler。[E: codex-rs/core/src/session/handlers.rs:710][E: codex-rs/core/src/session/handlers.rs:717][E: codex-rs/core/src/session/handlers.rs:719][E: codex-rs/core/src/session/handlers.rs:765][E: codex-rs/core/src/session/handlers.rs:770][E: codex-rs/core/src/session/handlers.rs:774]
9. `Session::send_event` 用 `turn_context.sub_id` 构造 `Event.id`，持久化后 deliver 到 `tx_event`；`SessionIo::next_event` 从 `rx_event.recv()` 读取。[E: codex-rs/core/src/session/mod.rs:1749][E: codex-rs/core/src/session/mod.rs:1753][E: codex-rs/core/src/session/mod.rs:1940][E: codex-rs/core/src/session/mod.rs:1961][E: codex-rs/core/src/session/mod.rs:800]

## 关键决策点

- SQ bounded、EQ unbounded 是源码事实：入口 submissions 受 `SUBMISSION_CHANNEL_CAPACITY` 限制，事件出口不复用该容量常量。[E: codex-rs/core/src/session/mod.rs:465][E: codex-rs/core/src/session/mod.rs:533][E: codex-rs/core/src/session/mod.rs:534]
- `Submission.id` 是进入 SQ 的请求相关 id；regular turn 的 `Event.id` 在 `send_event` 路径上来自 `TurnContext.sub_id`，而 `user_input_or_turn_inner` 用 submission id 创建 turn context，因此普通用户 turn 下二者对齐。[E: codex-rs/core/src/session/handlers.rs:216][E: codex-rs/core/src/session/handlers.rs:765][E: codex-rs/core/src/session/mod.rs:1750]
- W3C trace 是 submission handoff 的 carrier，不是模型请求体字段；dispatch span 会尝试从 `Submission.trace` 设置 parent trace。[E: codex-rs/protocol/src/protocol.rs:182][E: codex-rs/core/src/session/handlers.rs:929][E: codex-rs/core/src/session/handlers.rs:930]

## 深挖入口

- `spine.turn-end-to-end` 展开 `Op::UserInput` 如何变成 `RegularTask` 和 model streaming。
- `spine.tool-call-anatomy` 展开 model output item 如何变成 tool future。
- `ref.protocol-op` 和 `ref.protocol-event-lifecycle` 全量列出 Op/EventMsg 变体。

## Sources

- codex-rs/protocol/src/protocol.rs
- codex-rs/core/src/codex_thread.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/core/src/session/handlers.rs

## 相关

- [Codex 源码总览](overview.md)
- [一次 turn 端到端](turn-end-to-end.md)
- [core session lifecycle](../subsystems/core/session-lifecycle.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
