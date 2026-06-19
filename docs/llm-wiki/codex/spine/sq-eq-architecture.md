---
id: spine.sq-eq-architecture
title: SQ/EQ 双队列架构
kind: flow
tier: T0
source: [codex-rs/protocol/src/protocol.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs]
symbols: [Submission, Op, Event, EventMsg, CodexThread, Codex::spawn_internal, submission_loop]
related: [spine.overview, spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 5670360009
---

> Codex 的 SQ/EQ 是 thread 的双向消息骨架：`Submission { id, op, client_user_message_id, trace }` 进入 submission channel，`Event { id, msg }` 从 event channel 回到 client。[E: codex-rs/protocol/src/protocol.rs:148][E: codex-rs/protocol/src/protocol.rs:150][E: codex-rs/protocol/src/protocol.rs:1203][E: codex-rs/protocol/src/protocol.rs:1205]

## 能回答的问题

- Submission Queue 与 Event Queue 分别承载什么 Rust 类型？
- `CodexThread`、`Codex`、`Session` 在双队列中各自负责什么？
- `Submission.id`、W3C trace、`Event.id` 的边界在哪里？
- 当前 regular turn 入口为什么是 `Op::UserInput`？

```mermaid
sequenceDiagram
    participant Client
    participant Thread as CodexThread
    participant Codex
    participant SQ as tx_sub/rx_sub
    participant Loop as submission_loop
    participant Session
    participant EQ as tx_event/rx_event
    Client->>Thread: submit(Op)
    Thread->>Codex: submit(op)
    Codex->>SQ: Submission
    SQ->>Loop: rx_sub.recv()
    Loop->>Session: dispatch op
    Session->>EQ: Event { id: turn sub_id, msg }
    EQ-->>Codex: next_event()
    Codex-->>Thread: Event
```

## 端到端步骤

1. Protocol 层把 SQ entry 定义为 `Submission`，字段包括 correlation id、`Op` payload、client message id 和可选 W3C trace carrier。[E: codex-rs/protocol/src/protocol.rs:150][E: codex-rs/protocol/src/protocol.rs:152][E: codex-rs/protocol/src/protocol.rs:154][E: codex-rs/protocol/src/protocol.rs:156][E: codex-rs/protocol/src/protocol.rs:158]
2. 当前 regular turn 的 submission payload 是 `Op::UserInput { items, final_output_json_schema, responsesapi_client_metadata, additional_context, thread_settings }`；`Op::ThreadSettings` 和 `Op::InterAgentCommunication` 也走同一条 submission loop。[E: codex-rs/protocol/src/protocol.rs:534][E: codex-rs/protocol/src/protocol.rs:536][E: codex-rs/protocol/src/protocol.rs:552][E: codex-rs/protocol/src/protocol.rs:559]
3. Protocol 层把 EQ entry 定义为 `Event { id, msg }`，`EventMsg` 是 tagged enum，包含 warning、realtime、model routing、verification 等事件族。[E: codex-rs/protocol/src/protocol.rs:1205][E: codex-rs/protocol/src/protocol.rs:1207][E: codex-rs/protocol/src/protocol.rs:1209][E: codex-rs/protocol/src/protocol.rs:1218]
4. `CodexThread` 是 thread 的 bidirectional conduit；`submit`、`submit_with_trace` 和 `next_event` 都只是转发到底层 `Codex` handle。[E: codex-rs/core/src/codex_thread.rs:173][E: codex-rs/core/src/codex_thread.rs:189][E: codex-rs/core/src/codex_thread.rs:241][E: codex-rs/core/src/codex_thread.rs:400]
5. `Codex::spawn_internal` 创建 bounded submission channel 和 unbounded event channel；当前 submission channel capacity 常量是 512。[E: codex-rs/core/src/session/mod.rs:459][E: codex-rs/core/src/session/mod.rs:522][E: codex-rs/core/src/session/mod.rs:523]
6. `spawn_internal` 初始化 `Session`，再用 `tokio::spawn` 启动 `submission_loop(session_for_loop, config, rx_sub)`；返回的 `Codex` 持有 `tx_sub`、`rx_event`、`agent_status`、`session` 和 session-loop termination handle。[E: codex-rs/core/src/session/mod.rs:642][E: codex-rs/core/src/session/mod.rs:676][E: codex-rs/core/src/session/mod.rs:678][E: codex-rs/core/src/session/mod.rs:682]
7. `Codex::submit_with_trace` 生成 UUID v7 submission id；`submit_with_id` 在 trace 为空时补当前 span 的 W3C trace，然后把 submission 发送到 `tx_sub`。[E: codex-rs/core/src/session/mod.rs:698][E: codex-rs/core/src/session/mod.rs:703][E: codex-rs/core/src/session/mod.rs:734][E: codex-rs/core/src/session/mod.rs:735][E: codex-rs/core/src/session/mod.rs:738]
8. `submission_loop` 持续从 `rx_sub.recv().await` 取 `Submission`，为每个 submission 建 dispatch span，再按 `Op` 分派到 user input、thread settings、inter-agent communication 等 handler。[E: codex-rs/core/src/session/handlers.rs:698][E: codex-rs/core/src/session/handlers.rs:705][E: codex-rs/core/src/session/handlers.rs:707][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/handlers.rs:758][E: codex-rs/core/src/session/handlers.rs:762]
9. `Session::send_event` 用 `turn_context.sub_id` 构造 `Event.id`，`send_event_raw` 先持久化 rollout event，再经 `deliver_event_raw` 发到 `tx_event`；`Codex::next_event` 从 `rx_event.recv()` 读取。[E: codex-rs/core/src/session/mod.rs:1679][E: codex-rs/core/src/session/mod.rs:1683][E: codex-rs/core/src/session/mod.rs:1833][E: codex-rs/core/src/session/mod.rs:1835][E: codex-rs/core/src/session/mod.rs:1848][E: codex-rs/core/src/session/mod.rs:767]

## 关键决策点

- SQ bounded、EQ unbounded 是源码事实：入口 submissions 受 `SUBMISSION_CHANNEL_CAPACITY` 限制，事件出口不复用该容量常量。[E: codex-rs/core/src/session/mod.rs:460][E: codex-rs/core/src/session/mod.rs:522][E: codex-rs/core/src/session/mod.rs:523]
- `Submission.id` 是进入 SQ 的请求相关 id；regular turn 的 `Event.id` 在 `send_event` 路径上来自 `TurnContext.sub_id`，而 `user_input_or_turn_inner` 用 submission id 创建 turn context，因此普通用户 turn 下二者对齐。[E: codex-rs/core/src/session/handlers.rs:207][E: codex-rs/core/src/session/handlers.rs:753][E: codex-rs/core/src/session/mod.rs:1680]
- W3C trace 是 submission handoff 的 carrier，不是模型请求体字段；dispatch span 会尝试从 `Submission.trace` 设置 parent trace。[E: codex-rs/protocol/src/protocol.rs:158][E: codex-rs/core/src/session/handlers.rs:912][E: codex-rs/core/src/session/handlers.rs:913]

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
