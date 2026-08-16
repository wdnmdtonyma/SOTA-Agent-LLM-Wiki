---
id: spine.sq-eq-architecture
title: SQ/EQ 双队列架构
kind: flow
tier: T0
source: [codex-rs/protocol/src/protocol.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/turn_input.rs]
symbols: [Session::spawn_internal]
related: [spine.overview, spine.turn-end-to-end, subsys.core.session-lifecycle, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Codex 的 SQ/EQ 是 thread 的双向消息骨架：`Submission { id, op, trace, parent_turn_id, root_turn_id }` 进入 submission channel，`Event { id, msg }` 从 event channel 回到 client。`parent_turn_id` 只表达 Core 内直接发起该 submission 的父 turn，`root_turn_id` 表达因果根 turn，二者都不取代 W3C trace。[E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/protocol/src/protocol.rs:190][E: codex-rs/protocol/src/protocol.rs:194][E: codex-rs/protocol/src/protocol.rs:196][E: codex-rs/protocol/src/protocol.rs:1267]

## 能回答的问题

- Submission Queue 与 Event Queue 分别承载什么 Rust 类型？
- `CodexThread`、`SessionIo`、`Session` 在双队列中各自负责什么？
- `Submission.id`、W3C trace、`parent_turn_id`、`root_turn_id`、`Event.id` 的边界在哪里？
- 当前 regular turn 入口为什么是 `Op::TurnInput`，而不是旧的 `Op::UserInput`？
- `ThreadSettings` / `ThreadRollback` / `ApproveGuardianDeniedAction` 如何与 EQ 事件对应？

```mermaid
sequenceDiagram
    participant Client
    participant Thread as CodexThread
    participant IO as SessionIo
    participant SQ as tx_sub/rx_sub
    participant Loop as submission_loop
    participant Session
    participant EQ as tx_event/rx_event
    Client->>Thread: start_or_steer_turn / submit(Op)
    Thread->>IO: submit_turn_input / submit
    IO->>SQ: Submission { id, op, trace, parent_turn_id, root_turn_id }
    SQ->>Loop: rx_sub.recv()
    Loop->>Session: dispatch op
    Session->>EQ: Event { id: turn sub_id, msg }
    EQ-->>IO: next_event()
    IO-->>Thread: Event
```

## 端到端步骤

1. Protocol 层把 SQ entry 定义为 `Submission`，字段包括 correlation id、`Op` payload、可选 W3C trace carrier、Core 内部的可选直接父 turn id，以及可选因果根 turn id。[E: codex-rs/protocol/src/protocol.rs:184][E: codex-rs/protocol/src/protocol.rs:186][E: codex-rs/protocol/src/protocol.rs:190][E: codex-rs/protocol/src/protocol.rs:194][E: codex-rs/protocol/src/protocol.rs:196]
2. `Op` 当前有 27 个变体。regular turn 的 submission payload 是 `Op::TurnInput { request, mode, reply }`；`request` 装箱 `TurnInputRequest`，`mode` 选择 start-or-steer / start-if-idle / steer，`reply` 是 oneshot 路由决策。独立 mutation 还有 `Op::ThreadSettings`、`Op::ThreadRollback`、`Op::ApproveGuardianDeniedAction`，`Op::InterAgentCommunication` 也走同一条 submission loop。[E: codex-rs/protocol/src/protocol.rs:541][E: codex-rs/protocol/src/protocol.rs:569][E: codex-rs/protocol/src/protocol.rs:585][E: codex-rs/protocol/src/protocol.rs:592][E: codex-rs/protocol/src/protocol.rs:676][E: codex-rs/protocol/src/protocol.rs:682]
3. Protocol 层把 EQ entry 定义为 `Event { id, msg }`，`EventMsg` 是 tagged enum（81 个变体），包含 warning、realtime、model routing、verification，以及本轮新增的 `ThreadRolledBack`、`ThreadSettingsApplied`、`ThreadQueueChanged`。[E: codex-rs/protocol/src/protocol.rs:1267][E: codex-rs/protocol/src/protocol.rs:1285][E: codex-rs/protocol/src/protocol.rs:1324][E: codex-rs/protocol/src/protocol.rs:1333][E: codex-rs/protocol/src/protocol.rs:1372]
4. `CodexThread` 是 public bidirectional conduit，内部组合 `Arc<Session>` 和 `SessionIo`；queue methods 转发给 `io`。公开 turn API 是 `start_or_steer_turn` / `start_turn_if_idle` / `steer_turn`，不再把 user items 直接塞进 `Op`。[E: codex-rs/core/src/codex_thread.rs:192][E: codex-rs/core/src/codex_thread.rs:211][E: codex-rs/core/src/codex_thread.rs:283][E: codex-rs/core/src/codex_thread.rs:486]
5. `Session::spawn_internal` 创建 bounded submission channel 和 unbounded event channel；capacity 是 512。[E: codex-rs/core/src/session/mod.rs:456][E: codex-rs/core/src/session/mod.rs:527][E: codex-rs/core/src/session/mod.rs:528]
6. `spawn_internal` 初始化 `Session`，启动 `submission_loop`，返回 `(session, SessionIo)`；io 只持 tx/rx/status/termination endpoints。[E: codex-rs/core/src/session/mod.rs:776][E: codex-rs/core/src/session/mod.rs:781][E: codex-rs/core/src/session/mod.rs:788]
7. `SessionIo::submit_with_trace` 生成 UUID v7 submission id，并接受 trace、`parent_turn_id`、`root_turn_id`；`submit_with_id` 在 trace 为空时补当前 span W3C trace，再发送到 `tx_sub`。普通 `SessionIo::submit` 明确把三者都置空。`submit_turn_input` 另外走 oneshot reply，parent/root 置空，因为 turn provenance 现在在 `TurnStartOptions` 里。[E: codex-rs/core/src/session/mod.rs:794][E: codex-rs/core/src/session/mod.rs:801][E: codex-rs/core/src/session/mod.rs:821][E: codex-rs/core/src/session/mod.rs:836][E: codex-rs/core/src/session/mod.rs:852]
8. `submission_loop` 持续从 `rx_sub.recv().await` 取 `Submission`，为每个 submission 建 dispatch span，再按 `Op` 分派。`Op::TurnInput` 调用 `turn_input::handle` 并回写 reply；`Op::ThreadSettings` 走 `thread_settings::update`；`Op::ThreadRollback` 走 `thread_rollback`；`Op::ApproveGuardianDeniedAction` 注入 developer 批准消息；inter-agent communication 继续把 `sub.parent_turn_id` / `sub.root_turn_id` 交给 handler。[E: codex-rs/core/src/session/handlers.rs:515][E: codex-rs/core/src/session/handlers.rs:522][E: codex-rs/core/src/session/handlers.rs:570][E: codex-rs/core/src/session/handlers.rs:588][E: codex-rs/core/src/session/handlers.rs:592][E: codex-rs/core/src/session/handlers.rs:639][E: codex-rs/core/src/session/handlers.rs:667]
9. `Session::send_event` 用 `turn_context.sub_id` 构造 `Event.id`，持久化后 deliver 到 `tx_event`；`SessionIo::next_event` 从 `rx_event.recv()` 读取。[E: codex-rs/core/src/session/mod.rs:1892][E: codex-rs/core/src/session/mod.rs:1912][E: codex-rs/core/src/session/mod.rs:2109][E: codex-rs/core/src/session/mod.rs:891]

## 关键决策点

- SQ bounded、EQ unbounded 是源码事实：入口 submissions 受 `SUBMISSION_CHANNEL_CAPACITY` 限制，事件出口不复用该容量常量。[E: codex-rs/core/src/session/mod.rs:456][E: codex-rs/core/src/session/mod.rs:527][E: codex-rs/core/src/session/mod.rs:528]
- `Submission.id` 是进入 SQ 的请求相关 id；regular turn 的 `Event.id` 在 `send_event` 路径上来自 `TurnContext.sub_id`。`PreparedTurnInputSettings::apply_started` 用 submission id 创建 turn context，因此普通用户 turn 下二者对齐。[E: codex-rs/core/src/session/turn_input.rs:111][E: codex-rs/core/src/session/mod.rs:1913]
- W3C trace 是 submission handoff 的 carrier，不是模型请求体字段；dispatch span 会尝试从 `Submission.trace` 设置 parent trace。[E: codex-rs/protocol/src/protocol.rs:190][E: codex-rs/core/src/session/handlers.rs:735][E: codex-rs/core/src/session/handlers.rs:754]
- `parent_turn_id` / `root_turn_id` 是 turn provenance，不是 observability trace。start 路径把 `TurnStartOptions` 写入 `turn_metadata_state`；user-input 作为根 turn 时还会把 submission id 设成 root。[E: codex-rs/core/src/session/turn_input.rs:102][E: codex-rs/core/src/session/turn_input.rs:116][E: codex-rs/core/src/session/turn_input.rs:121][E: codex-rs/core/src/session/turn_input.rs:221]
- public `CodexThread` API 主动隔离内部 provenance：普通 `submit` 走 parent/root 为空的 `SessionIo::submit`，`submit_with_trace` 强制两者为空；Core 内部显式路径才可经 `SessionIo::submit_with_trace` 传播它们。[E: codex-rs/core/src/codex_thread.rs:211][E: codex-rs/core/src/codex_thread.rs:266][E: codex-rs/core/src/session/mod.rs:794][E: codex-rs/core/src/session/mod.rs:801]
- `ThreadSettingsApplied`、`ThreadRolledBack`、`ThreadQueueChanged` 是 EQ 侧对应的客户端通知；settings/rollback 由 SQ Op 触发，queue 变更来自 `ext/queue` 的 durable per-thread 队列，不是 submission payload 本身。[E: codex-rs/protocol/src/protocol.rs:1324][E: codex-rs/protocol/src/protocol.rs:1333][E: codex-rs/protocol/src/protocol.rs:1372][I]

## 深挖入口

- `spine.turn-end-to-end` 展开 `Op::TurnInput` 如何变成 `RegularTask` 和 model streaming。
- `spine.tool-call-anatomy` 展开 model output item 如何变成 tool future。
- `ref.protocol-op` 和 `ref.protocol-event-lifecycle` 全量列出 Op/EventMsg 变体。

## Sources

- codex-rs/protocol/src/protocol.rs
- codex-rs/core/src/codex_thread.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/core/src/session/handlers.rs
- codex-rs/core/src/session/turn_input.rs

## 相关

- [Codex 源码总览](overview.md)
- [一次 turn 端到端](turn-end-to-end.md)
- [core session lifecycle](../subsystems/core/session-lifecycle.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
