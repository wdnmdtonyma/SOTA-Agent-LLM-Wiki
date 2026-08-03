---
id: spine.sq-eq-architecture
title: SQ/EQ 双队列架构
kind: flow
tier: T0
source: [codex-rs/protocol/src/protocol.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs]
symbols: [Session::spawn_internal]
related: [spine.overview, spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 7750465934
---

> Codex 的 SQ/EQ 是 thread 的双向消息骨架：`Submission { id, op, client_user_message_id, trace, parent_turn_id }` 进入 submission channel，`Event { id, msg }` 从 event channel 回到 client；本轮新增的 `parent_turn_id` 只表达 Core 内直接发起该 submission 的父 turn，不取代 W3C trace。[E: codex-rs/protocol/src/protocol.rs:176][E: codex-rs/protocol/src/protocol.rs:178][E: codex-rs/protocol/src/protocol.rs:180][E: codex-rs/protocol/src/protocol.rs:182][E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/protocol/src/protocol.rs:186][E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1272][E: codex-rs/protocol/src/protocol.rs:1274]

## 能回答的问题

- Submission Queue 与 Event Queue 分别承载什么 Rust 类型？
- `CodexThread`、`SessionIo`、`Session` 在双队列中各自负责什么？
- `Submission.id`、W3C trace、`parent_turn_id`、`Event.id` 的边界在哪里？
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
    IO->>SQ: Submission { id, op, trace, parent_turn_id }
    SQ->>Loop: rx_sub.recv()
    Loop->>Session: dispatch op
    Session->>EQ: Event { id: turn sub_id, msg }
    EQ-->>IO: next_event()
    IO-->>Thread: Event
```

## 端到端步骤

1. Protocol 层把 SQ entry 定义为 `Submission`，字段包括 correlation id、`Op` payload、client message id、可选 W3C trace carrier，以及 Core 内部的可选直接父 turn id。[E: codex-rs/protocol/src/protocol.rs:176][E: codex-rs/protocol/src/protocol.rs:178][E: codex-rs/protocol/src/protocol.rs:180][E: codex-rs/protocol/src/protocol.rs:182][E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/protocol/src/protocol.rs:186]
2. 当前 regular turn 的 submission payload 是 `Op::UserInput { items, final_output_json_schema, responsesapi_client_metadata, additional_context, thread_settings }`；`Op::ThreadSettings` 和 `Op::InterAgentCommunication` 也走同一条 submission loop。[E: codex-rs/protocol/src/protocol.rs:559][E: codex-rs/protocol/src/protocol.rs:561][E: codex-rs/protocol/src/protocol.rs:577][E: codex-rs/protocol/src/protocol.rs:584]
3. Protocol 层把 EQ entry 定义为 `Event { id, msg }`，`EventMsg` 是 tagged enum，包含 warning、realtime、model routing、verification 等事件族。[E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1272][E: codex-rs/protocol/src/protocol.rs:1274][E: codex-rs/protocol/src/protocol.rs:1288][E: codex-rs/protocol/src/protocol.rs:1294][E: codex-rs/protocol/src/protocol.rs:1300][E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:1306][E: codex-rs/protocol/src/protocol.rs:1309][E: codex-rs/protocol/src/protocol.rs:1312][E: codex-rs/protocol/src/protocol.rs:1315]
4. `CodexThread` 是 public bidirectional conduit，内部组合 `Arc<Session>` 和 `SessionIo`；queue methods 转发给 `io`。[E: codex-rs/core/src/codex_thread.rs:183][E: codex-rs/core/src/codex_thread.rs:208][E: codex-rs/core/src/codex_thread.rs:226][E: codex-rs/core/src/codex_thread.rs:476]
5. `Session::spawn_internal` 创建 bounded submission channel 和 unbounded event channel；capacity 是 512。[E: codex-rs/core/src/session/mod.rs:484][E: codex-rs/core/src/session/mod.rs:514][E: codex-rs/core/src/session/mod.rs:555][E: codex-rs/core/src/session/mod.rs:556]
6. `spawn_internal` 初始化 `Session`，启动 `submission_loop`，返回 `(session, SessionIo)`；io 只持 tx/rx/status/termination endpoints。[E: codex-rs/core/src/session/mod.rs:767][E: codex-rs/core/src/session/mod.rs:772][E: codex-rs/core/src/session/mod.rs:779]
7. `SessionIo::submit_with_trace` 生成 UUID v7 submission id，并接受 trace 与 `parent_turn_id`；`submit_with_id` 在 trace 为空时补当前 span W3C trace，再发送到 `tx_sub`。普通 `SessionIo::submit` 明确把两者都置空，而带 client message id 的 user-input 路径也不会注入 parent turn。[E: codex-rs/core/src/session/mod.rs:785][E: codex-rs/core/src/session/mod.rs:790][E: codex-rs/core/src/session/mod.rs:794][E: codex-rs/core/src/session/mod.rs:796][E: codex-rs/core/src/session/mod.rs:801][E: codex-rs/core/src/session/mod.rs:802][E: codex-rs/core/src/session/mod.rs:816][E: codex-rs/core/src/session/mod.rs:821][E: codex-rs/core/src/session/mod.rs:828][E: codex-rs/core/src/session/mod.rs:830][E: codex-rs/core/src/session/mod.rs:832]
8. `submission_loop` 持续从 `rx_sub.recv().await` 取 `Submission`，为每个 submission 建 dispatch span，再按 `Op` 分派；user input 与 inter-agent communication 都把 `sub.parent_turn_id` 继续交给各自 handler，thread settings 则不消费该字段。[E: codex-rs/core/src/session/handlers.rs:714][E: codex-rs/core/src/session/handlers.rs:721][E: codex-rs/core/src/session/handlers.rs:723][E: codex-rs/core/src/session/handlers.rs:769][E: codex-rs/core/src/session/handlers.rs:775][E: codex-rs/core/src/session/handlers.rs:780][E: codex-rs/core/src/session/handlers.rs:784][E: codex-rs/core/src/session/handlers.rs:789]
9. `Session::send_event` 用 `turn_context.sub_id` 构造 `Event.id`，持久化后 deliver 到 `tx_event`；`SessionIo::next_event` 从 `rx_event.recv()` 读取。[E: codex-rs/core/src/session/mod.rs:1843][E: codex-rs/core/src/session/mod.rs:1847][E: codex-rs/core/src/session/mod.rs:2039][E: codex-rs/core/src/session/mod.rs:2060][E: codex-rs/core/src/session/mod.rs:850]

## 关键决策点

- SQ bounded、EQ unbounded 是源码事实：入口 submissions 受 `SUBMISSION_CHANNEL_CAPACITY` 限制，事件出口不复用该容量常量。[E: codex-rs/core/src/session/mod.rs:484][E: codex-rs/core/src/session/mod.rs:555][E: codex-rs/core/src/session/mod.rs:556]
- `Submission.id` 是进入 SQ 的请求相关 id；regular turn 的 `Event.id` 在 `send_event` 路径上来自 `TurnContext.sub_id`，而 `user_input_or_turn_inner` 用 submission id 创建 turn context，因此普通用户 turn 下二者对齐。[E: codex-rs/core/src/session/handlers.rs:215][E: codex-rs/core/src/session/handlers.rs:769][E: codex-rs/core/src/session/mod.rs:1844]
- W3C trace 是 submission handoff 的 carrier，不是模型请求体字段；dispatch span 会尝试从 `Submission.trace` 设置 parent trace。[E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/core/src/session/handlers.rs:945][E: codex-rs/core/src/session/handlers.rs:946]
- `parent_turn_id` 是 turn provenance，不是 observability trace：user-input handler 仅在新开 turn（不是 steer 到活跃 turn）时把它写入 `turn_metadata_state`。[E: codex-rs/protocol/src/protocol.rs:186][E: codex-rs/core/src/session/handlers.rs:235][E: codex-rs/core/src/session/handlers.rs:239][E: codex-rs/core/src/session/handlers.rs:240][E: codex-rs/core/src/session/handlers.rs:241]
- public `CodexThread` API 主动隔离该内部 provenance：普通 `submit` 走 parent 为空的 `SessionIo::submit`，`submit_with_trace` 强制 parent 为空，调用方传入完整 `Submission` 的 legacy `submit_with_id` 也会先清空 parent；Core 内部显式路径才可经 `SessionIo::submit_with_trace` 传播它。[E: codex-rs/core/src/codex_thread.rs:226][E: codex-rs/core/src/codex_thread.rs:227][E: codex-rs/core/src/codex_thread.rs:274][E: codex-rs/core/src/codex_thread.rs:280][E: codex-rs/core/src/codex_thread.rs:472][E: codex-rs/core/src/codex_thread.rs:473][E: codex-rs/core/src/session/mod.rs:790][E: codex-rs/core/src/session/mod.rs:794]

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
