---
id: spine.sq-eq-architecture
title: SQ/EQ 双队列架构
kind: flow
tier: T0
source: [codex-rs/protocol/src/protocol.rs, codex-rs/core/src/codex_thread.rs, codex-rs/core/src/codex_delegate.rs, codex-rs/core/src/client.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/handlers.rs]
symbols: [Submission, Op, Event, EventMsg, CodexThread::submit, Codex::spawn_internal, submission_loop, ModelClientSession::stream, run_codex_thread_interactive]
related: [spine.overview, spine.turn-end-to-end, ref.protocol-op, ref.protocol-event-lifecycle, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> SQ/EQ 是 Codex thread 的双向消息骨架：client 通过 Submission Queue 投递 `Op`，core 通过 Event Queue 回传 `EventMsg`。[I]

## 能回答的问题

- Submission Queue 和 Event Queue 在 Codex 里分别是什么？
- `Submission.id`、`Event.id` 和 turn id 如何关联？
- `CodexThread`、`Codex`、`Session` 在双队列里各自做什么？
- 为什么 subagent approval 不直接暴露给子 agent consumer？
- Model streaming 和 SQ/EQ 的边界在哪里？

```mermaid
sequenceDiagram
    participant Client as Client or UI
    participant Thread as CodexThread
    participant Codex as Codex handle
    participant SQ as tx_sub/rx_sub
    participant Loop as submission_loop
    participant Task as SessionTask
    participant Model as ModelClientSession
    participant EQ as tx_event/rx_event
    Client->>Thread: submit(Op)
    Thread->>Codex: submit(op)
    Codex->>Codex: submit_with_trace(op, None)
    Codex->>SQ: Submission { id, op, trace }
    SQ->>Loop: rx_sub.recv()
    Loop->>Task: dispatch Op
    Task->>Model: stream(Prompt, turn settings)
    Model-->>Task: ResponseEvent stream
    Task->>EQ: Event { id: turn_id, msg }
    EQ-->>Codex: next_event()
    Codex-->>Thread: Event
    Thread-->>Client: next_event()
```

该 sequence diagram 是后续编号步骤的视觉索引；具体事实以编号步骤中的源码证据为准。[I]

## 端到端步骤

1. Protocol 定义 `Submission` 为 SQ entry，字段是 `id`、`op`、可选 `trace`；`id` 用来把请求和事件关联，`trace` 用于 W3C trace carrier。[E: codex-rs/protocol/src/protocol.rs:123][E: codex-rs/protocol/src/protocol.rs:126][E: codex-rs/protocol/src/protocol.rs:129][E: codex-rs/protocol/src/protocol.rs:132]
2. Protocol 定义 `Op` 为 submission operation，使用 `#[serde(tag = "type", rename_all = "snake_case")]`，因此 wire 层的 op 是 tagged enum。[E: codex-rs/protocol/src/protocol.rs:398][E: codex-rs/protocol/src/protocol.rs:400][E: codex-rs/protocol/src/protocol.rs:403]
3. `Op::UserInput` 是 legacy 用户输入，`Op::UserTurn` 是带完整 turn context 的入口；`UserTurn` 包含 `cwd`、approval policy、sandbox policy、model、reasoning effort、service tier、final JSON schema、collaboration mode、personality、environment selections。[E: codex-rs/protocol/src/protocol.rs:427][E: codex-rs/protocol/src/protocol.rs:445][E: codex-rs/protocol/src/protocol.rs:453][E: codex-rs/protocol/src/protocol.rs:456][E: codex-rs/protocol/src/protocol.rs:464][E: codex-rs/protocol/src/protocol.rs:468][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:487][E: codex-rs/protocol/src/protocol.rs:490][E: codex-rs/protocol/src/protocol.rs:495][E: codex-rs/protocol/src/protocol.rs:499][E: codex-rs/protocol/src/protocol.rs:503]
4. Protocol 定义 `Event` 为 EQ entry，字段是 `id` 和 `msg`；`EventMsg` 使用 serde tagged enum，并包含 `TurnStarted`、`TurnComplete`、MCP tool、exec、approval、patch、plan 等事件变体。[E: codex-rs/protocol/src/protocol.rs:1417][E: codex-rs/protocol/src/protocol.rs:1419][E: codex-rs/protocol/src/protocol.rs:1420][E: codex-rs/protocol/src/protocol.rs:1423][E: codex-rs/protocol/src/protocol.rs:1429][E: codex-rs/protocol/src/protocol.rs:1461][E: codex-rs/protocol/src/protocol.rs:1466][E: codex-rs/protocol/src/protocol.rs:1510][E: codex-rs/protocol/src/protocol.rs:1522][E: codex-rs/protocol/src/protocol.rs:1536][E: codex-rs/protocol/src/protocol.rs:1567][E: codex-rs/protocol/src/protocol.rs:1594]
5. `CodexThread` 是 thread 的 bidirectional conduit；`submit` 代理到 `Codex::submit`，`next_event` 代理到 `Codex::next_event`。[E: codex-rs/core/src/codex_thread.rs:61][E: codex-rs/core/src/codex_thread.rs:78][E: codex-rs/core/src/codex_thread.rs:135]
6. `Codex::spawn_internal` 创建 bounded SQ 和 unbounded EQ；bounded SQ 容量来自 `SUBMISSION_CHANNEL_CAPACITY = 512`。[E: codex-rs/core/src/session/mod.rs:406][E: codex-rs/core/src/session/mod.rs:458][E: codex-rs/core/src/session/mod.rs:459]
7. `Codex::spawn_internal` 用 `Session::new` 初始化 session state，再启动 `submission_loop(session_for_loop, config, rx_sub)`；返回的 `Codex` 持有 `tx_sub`、`rx_event`、`agent_status`、`session` 和 loop termination handle。[E: codex-rs/core/src/session/mod.rs:633][E: codex-rs/core/src/session/mod.rs:661][E: codex-rs/core/src/session/mod.rs:665][E: codex-rs/core/src/session/mod.rs:666][E: codex-rs/core/src/session/mod.rs:667][E: codex-rs/core/src/session/mod.rs:668][E: codex-rs/core/src/session/mod.rs:669][E: codex-rs/core/src/session/mod.rs:670]
8. `Codex::submit_with_trace` 生成 UUID v7 submission id；`Codex::submit_with_id` 如果 `Submission.trace` 为空，会把当前 span 的 W3C trace 填进去，然后发送到 SQ。[E: codex-rs/core/src/session/mod.rs:678][E: codex-rs/core/src/session/mod.rs:686][E: codex-rs/core/src/session/mod.rs:687][E: codex-rs/core/src/session/mod.rs:700][E: codex-rs/core/src/session/mod.rs:703]
9. `submission_loop` 持续 `rx_sub.recv().await`，为每个 `Submission` 建 dispatch span，然后 match `sub.op.clone()` 调用对应 handler；loop 在 handler 返回 `should_exit` 时 break。[E: codex-rs/core/src/session/handlers.rs:1012][E: codex-rs/core/src/session/handlers.rs:1014][E: codex-rs/core/src/session/handlers.rs:1016][E: codex-rs/core/src/session/handlers.rs:1207][E: codex-rs/core/src/session/handlers.rs:1208]
10. `Session::send_event` 使用当前 `TurnContext.sub_id` 作为 `Event.id`，再调用 `send_event_raw`；`send_event_raw` 先把事件持久化成 `RolloutItem::EventMsg`，再调用 `deliver_event_raw` 发送到 EQ。[E: codex-rs/core/src/session/mod.rs:1395][E: codex-rs/core/src/session/mod.rs:1398][E: codex-rs/core/src/session/mod.rs:1401][E: codex-rs/core/src/session/mod.rs:1512][E: codex-rs/core/src/session/mod.rs:1514]
11. `deliver_event_raw` 会从事件中提取 agent status 并更新 watch channel，然后把事件发送到 `tx_event`；`Codex::next_event` 从 `rx_event.recv()` 读取事件。[E: codex-rs/core/src/session/mod.rs:1519][E: codex-rs/core/src/session/mod.rs:1520][E: codex-rs/core/src/session/mod.rs:1522][E: codex-rs/core/src/session/mod.rs:733][E: codex-rs/core/src/session/mod.rs:734]
12. Model streaming 不直接属于 SQ/EQ；`ModelClient` 是 session-scoped，`ModelClient::new_session` 创建 turn-scoped streaming session，`ModelClientSession::stream` 在 Responses wire API 下优先尝试 WebSocket stream，fallback 时切到 HTTP Responses API stream。[E: codex-rs/core/src/client.rs:288][E: codex-rs/core/src/client.rs:328][E: codex-rs/core/src/client.rs:1451][E: codex-rs/core/src/client.rs:1453][E: codex-rs/core/src/client.rs:1454][E: codex-rs/core/src/client.rs:1457][E: codex-rs/core/src/client.rs:1470][E: codex-rs/core/src/client.rs:1471][E: codex-rs/core/src/client.rs:1472][E: codex-rs/core/src/client.rs:1477]
13. Subagent interactive path 额外创建内部 op channel：`run_codex_thread_interactive` 为 sub-agent 创建 `tx_sub/rx_sub` 和 `tx_ops/rx_ops`，并把子 agent exec/apply_patch approval events 转交父 session 处理，而不是向 consumer 暴露这些 approval events。[E: codex-rs/core/src/codex_delegate.rs:58][E: codex-rs/core/src/codex_delegate.rs:74][E: codex-rs/core/src/codex_delegate.rs:75][E: codex-rs/core/src/codex_delegate.rs:280][E: codex-rs/core/src/codex_delegate.rs:295][E: codex-rs/core/src/codex_delegate.rs:488][E: codex-rs/core/src/codex_delegate.rs:597]

## 关键决策点

- SQ 是 bounded，EQ 是 unbounded；这意味着入口 submissions 受到容量限制，而事件出口不使用同一个容量常量。[E: codex-rs/core/src/session/mod.rs:406][E: codex-rs/core/src/session/mod.rs:458][E: codex-rs/core/src/session/mod.rs:459]
- `Event.id` 在 `send_event` 路径上来自 turn sub-id，而不是原始 `Submission.id` 的任意转发；用户 turn path 把 `sub.id.clone()` 传入 `user_input_or_turn`，再用 `new_turn_with_sub_id(sub_id.clone(), ...)` 创建 turn context，因此普通 turn 下这两个 id 对齐。[E: codex-rs/core/src/session/handlers.rs:1099][E: codex-rs/core/src/session/handlers.rs:192][E: codex-rs/core/src/session/mod.rs:1398]
- SQ/EQ 架构把 “外部请求协议” 与 “模型 provider streaming” 解耦；模型 streaming 只在 turn task 内部发生，最终被转成 history items 和 `EventMsg`。[I]
- Subagent delegation 过滤 approval events 的设计让父 session 保持审批权；源码中 exec approval 和 apply_patch approval 都由 `codex_delegate` 调用父 session handler 后再向子 Codex submit approval response。[E: codex-rs/core/src/codex_delegate.rs:280][E: codex-rs/core/src/codex_delegate.rs:295][E: codex-rs/core/src/codex_delegate.rs:488][E: codex-rs/core/src/codex_delegate.rs:509][E: codex-rs/core/src/codex_delegate.rs:597][E: codex-rs/core/src/codex_delegate.rs:610]

## 深挖入口

- `spine.turn-end-to-end` 解释 `Op::UserTurn` 进入 RegularTask 后如何构建 prompt、调用模型和 drain tool futures。
- `spine.tool-call-anatomy` 解释 model output item 怎样变成 `ToolCall`，以及并行工具怎样被调度。
- `ref.protocol-op` 和 `ref.protocol-event-lifecycle` 应全量列出 Op/Event 变体和 wire 名。

## Sources

- codex-rs/protocol/src/protocol.rs
- codex-rs/core/src/codex_thread.rs
- codex-rs/core/src/codex_delegate.rs
- codex-rs/core/src/client.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/core/src/session/handlers.rs

## 相关

- [Codex 源码总览](overview.md)
- [一次 turn 端到端](turn-end-to-end.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
- 索引 id：`subsys.core.session-lifecycle`
