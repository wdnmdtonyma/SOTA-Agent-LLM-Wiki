---
id: spine.turn-end-to-end
title: 一次 turn 端到端
kind: flow
tier: T0
source: [codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/context_manager/history.rs]
symbols: [Op::UserTurn, user_input_or_turn_inner, Session::new_turn_with_sub_id, Session::spawn_task, RegularTask::run, run_turn, run_sampling_request, try_run_sampling_request, handle_output_item_done]
related: [spine.overview, spine.sq-eq-architecture, spine.tool-call-anatomy, spine.context-and-compaction, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 一次 regular turn 是 `Op::UserTurn` 进入 SQ 后，由 `submission_loop` 创建 `TurnContext`、`RegularTask`、`run_turn`、模型 stream 和工具 future，最终通过 `TurnComplete` 收束的循环。[I]

## 能回答的问题

- `Op::UserTurn` 的字段怎样变成 turn-scoped runtime 设置？
- `TurnStarted`、模型请求、tool call、follow-up sampling、`TurnComplete` 的真实顺序是什么？
- context updates、skills、plugins、MCP tools 在模型 sampling 前在哪里注入？
- 为什么 tool call 会让模型再 sampling 一轮？
- pending user input 和 token-limit auto compact 怎样影响 turn loop？

```mermaid
sequenceDiagram
    participant Client as Client
    participant SQ as Submission Queue
    participant Loop as submission_loop
    participant Session as Session
    participant Task as RegularTask
    participant Turn as run_turn
    participant Model as ModelClientSession
    participant Tool as ToolCallRuntime
    participant EQ as Event Queue
    Client->>SQ: Submission { id, op: UserTurn }
    SQ->>Loop: rx_sub.recv()
    Loop->>Session: new_turn_with_sub_id(id, settings)
    Session->>Task: spawn_task(RegularTask)
    Task->>EQ: TurnStarted
    Task->>Turn: run_turn(input)
    Turn->>Turn: compact check + context/plugin/skill/MCP prep
    Turn->>Model: stream(Prompt, tools, settings)
    Model-->>Turn: ResponseEvent stream
    Turn->>Tool: handle tool calls as futures
    Tool-->>Turn: ResponseInputItem output
    Turn->>Turn: record output, needs_follow_up=true
    Turn->>Model: next sampling request if needed
    Task->>EQ: TurnComplete
```

该 sequence diagram 是后续编号步骤的视觉索引；具体控制流事实以编号步骤中的源码证据为准。[I]

## 端到端步骤

1. Protocol 的 `Op::UserTurn` 是 regular turn 的丰富入口，字段覆盖 items、cwd、approval policy、sandbox policy、model、reasoning effort/summary、service tier、output schema、collaboration mode、personality 和 environment selections。[E: codex-rs/protocol/src/protocol.rs:447][E: codex-rs/protocol/src/protocol.rs:449][E: codex-rs/protocol/src/protocol.rs:453][E: codex-rs/protocol/src/protocol.rs:456][E: codex-rs/protocol/src/protocol.rs:464][E: codex-rs/protocol/src/protocol.rs:468][E: codex-rs/protocol/src/protocol.rs:472][E: codex-rs/protocol/src/protocol.rs:479][E: codex-rs/protocol/src/protocol.rs:487][E: codex-rs/protocol/src/protocol.rs:490][E: codex-rs/protocol/src/protocol.rs:495][E: codex-rs/protocol/src/protocol.rs:499][E: codex-rs/protocol/src/protocol.rs:503]
2. `submission_loop` 从 `rx_sub.recv().await` 获取 `Submission`，并在 `Op::UserInput | Op::UserTurn` 分支调用 `user_input_or_turn`。[E: codex-rs/core/src/session/handlers.rs:1006][E: codex-rs/core/src/session/handlers.rs:1012][E: codex-rs/core/src/session/handlers.rs:1098][E: codex-rs/core/src/session/handlers.rs:1099]
3. `user_input_or_turn_inner` 将 `Op::UserTurn` 解构成 `items`、`SessionSettingsUpdate`、`responsesapi_client_metadata` slot 和 `environments`；UserTurn path 的 metadata slot 是 `None`；`cwd`、approval policy、sandbox policy、reasoning summary、service tier、final output schema、personality 写入 `SessionSettingsUpdate`，model 和 reasoning effort 写入 fallback `CollaborationMode` settings，`environments` 保持为 `new_turn_with_sub_id` 的单独参数。[E: codex-rs/core/src/session/handlers.rs:128][E: codex-rs/core/src/session/handlers.rs:144][E: codex-rs/core/src/session/handlers.rs:148][E: codex-rs/core/src/session/handlers.rs:149][E: codex-rs/core/src/session/handlers.rs:156][E: codex-rs/core/src/session/handlers.rs:157][E: codex-rs/core/src/session/handlers.rs:158][E: codex-rs/core/src/session/handlers.rs:160][E: codex-rs/core/src/session/handlers.rs:163][E: codex-rs/core/src/session/handlers.rs:164][E: codex-rs/core/src/session/handlers.rs:165][E: codex-rs/core/src/session/handlers.rs:166][E: codex-rs/core/src/session/handlers.rs:170][E: codex-rs/core/src/session/handlers.rs:171][E: codex-rs/core/src/session/handlers.rs:192]
4. `user_input_or_turn_inner` 调用 `Session::new_turn_with_sub_id(sub_id.clone(), ...)` 创建 `TurnContext`，`TurnContext` 构造体随后把该 `sub_id` 保存为 turn id。[E: codex-rs/core/src/session/handlers.rs:192][E: codex-rs/core/src/session/turn_context.rs:428][E: codex-rs/core/src/session/turn_context.rs:429]
5. 当没有 active turn 时，`user_input_or_turn_inner` 调用 `Session::spawn_task(..., RegularTask::new())`；`Session::spawn_task` 会先 abort 当前任务，再进入 `start_task`。[E: codex-rs/core/src/session/handlers.rs:212][E: codex-rs/core/src/session/handlers.rs:222][E: codex-rs/core/src/tasks/mod.rs:242][E: codex-rs/core/src/tasks/mod.rs:248][E: codex-rs/core/src/tasks/mod.rs:250]
6. `start_task` 记录 active turn、启动 Tokio task，并在 task 结束后调用 `on_task_finished`；`on_task_finished` 在正常收束处发送 `EventMsg::TurnComplete`。[E: codex-rs/core/src/tasks/mod.rs:275][E: codex-rs/core/src/tasks/mod.rs:291][E: codex-rs/core/src/tasks/mod.rs:308][E: codex-rs/core/src/tasks/mod.rs:334][E: codex-rs/core/src/tasks/mod.rs:354][E: codex-rs/core/src/tasks/mod.rs:559]
7. `RegularTask::run` 在 turn task 起始发送 `EventMsg::TurnStarted`，随后调用 `run_turn(session.clone(), turn_context.clone(), input, ...)`。[E: codex-rs/core/src/tasks/regular.rs:47][E: codex-rs/core/src/tasks/regular.rs:68]
8. `run_turn` 对空输入和无 pending input 直接返回；非空 turn 先执行 `run_pre_sampling_compact`，如果压缩发生还会 reset prewarmed websocket session。[E: codex-rs/core/src/session/turn.rs:145][E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:162][E: codex-rs/core/src/session/turn.rs:163]
9. 模型请求前，`run_turn` 调用 `record_context_updates_and_set_reference_context_item`，再加载 plugins、收集 plugin mentions，并在 apps enabled 或 plugin mention 存在时读取 MCP tool inventory。[E: codex-rs/core/src/session/turn.rs:168][E: codex-rs/core/src/session/turn.rs:171][E: codex-rs/core/src/session/turn.rs:174][E: codex-rs/core/src/session/turn.rs:175][E: codex-rs/core/src/session/turn.rs:178][E: codex-rs/core/src/session/turn.rs:179][E: codex-rs/core/src/session/turn.rs:180][E: codex-rs/core/src/session/turn.rs:189]
10. `run_turn` 把用户输入转成 `ResponseInputItem`，运行 user-prompt-submit hooks，然后通过 `record_user_prompt_and_emit_turn_item` 记录用户 prompt 并发 turn item 事件。[E: codex-rs/core/src/session/turn.rs:306][E: codex-rs/core/src/session/turn.rs:308][E: codex-rs/core/src/session/turn.rs:323]
11. 每次 sampling 前，`run_turn` 用 `sess.clone_history().await.for_prompt(...)` 构造模型输入；这一步会走 `ContextManager::for_prompt` 的 normalization 和 modality 过滤。[E: codex-rs/core/src/session/turn.rs:435][E: codex-rs/core/src/session/turn.rs:437][E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:123][E: codex-rs/core/src/context_manager/history.rs:372]
12. `run_sampling_request` 先调用 `built_tools` 生成 `ToolRouter`，再用 `ToolCallRuntime::new(router, session, turn_context, turn_diff_tracker)` 创建工具 runtime。[E: codex-rs/core/src/session/turn.rs:1028][E: codex-rs/core/src/session/turn.rs:1040]
13. `run_sampling_request` 通过 `build_prompt(prompt_input, router.as_ref(), turn_context.as_ref(), base_instructions.clone())` 把 history、tool specs、turn settings 和 base instructions 合成 prompt。[E: codex-rs/core/src/session/turn.rs:965][E: codex-rs/core/src/session/turn.rs:966][E: codex-rs/core/src/session/turn.rs:967][E: codex-rs/core/src/session/turn.rs:968][E: codex-rs/core/src/session/turn.rs:969][E: codex-rs/core/src/session/turn.rs:970][E: codex-rs/core/src/session/turn.rs:971][E: codex-rs/core/src/session/turn.rs:1067][E: codex-rs/core/src/session/turn.rs:1069]
14. `try_run_sampling_request` 调用 `client_session.stream(prompt, &turn_context.model_info, ...)` 发起 provider streaming，并创建 `FuturesOrdered` 保存 in-flight tool futures。[E: codex-rs/core/src/session/turn.rs:1880][E: codex-rs/core/src/session/turn.rs:1893]
15. 当 stream 产出 `ResponseEvent::OutputItemDone(item)`，`try_run_sampling_request` 构造 `HandleOutputCtx` 并调用 `handle_output_item_done`。[E: codex-rs/core/src/session/turn.rs:1944][E: codex-rs/core/src/session/turn.rs:1978][E: codex-rs/core/src/session/turn.rs:2005]
16. `handle_output_item_done` 调用 `ToolRouter::build_tool_call`；如果 model item 是工具调用，它立即记录完成的 response item，把 `ToolCallRuntime::handle_tool_call` future 放到结果里，并设置 `needs_follow_up = true`。[E: codex-rs/core/src/stream_events_utils.rs:228][E: codex-rs/core/src/stream_events_utils.rs:243][E: codex-rs/core/src/stream_events_utils.rs:248][E: codex-rs/core/src/stream_events_utils.rs:249][E: codex-rs/core/src/stream_events_utils.rs:250][E: codex-rs/core/src/stream_events_utils.rs:253]
17. `try_run_sampling_request` 把 tool future 推入 `in_flight`，并将 `needs_follow_up` 与 output result 合并；模型 stream 完成后再 `drain_in_flight`，把每个工具输出写回 history。[E: codex-rs/core/src/session/turn.rs:2013][E: codex-rs/core/src/session/turn.rs:2018][E: codex-rs/core/src/session/turn.rs:2240][E: codex-rs/core/src/session/turn.rs:1836]
18. `ResponseEvent::Completed` 分支更新 token usage，并从 stream loop 里 `break Ok(SamplingRequestResult { needs_follow_up, last_agent_message })`；stream loop 结束后还会 flush、drain in-flight tools、可选发送 turn diff，最后返回 `outcome`。[E: codex-rs/core/src/session/turn.rs:2114][E: codex-rs/core/src/session/turn.rs:2125][E: codex-rs/core/src/session/turn.rs:2129][E: codex-rs/core/src/session/turn.rs:2232][E: codex-rs/core/src/session/turn.rs:2240][E: codex-rs/core/src/session/turn.rs:2246][E: codex-rs/core/src/session/turn.rs:2252][E: codex-rs/core/src/session/turn.rs:2257]
19. 如果 token usage 达到 auto compact limit 且仍需 follow-up，`run_turn` 调用 `run_auto_compact(..., CompactionPhase::MidTurn)`，reset websocket session，并继续 loop。[E: codex-rs/core/src/session/turn.rs:471][E: codex-rs/core/src/session/turn.rs:472][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:491][E: codex-rs/core/src/session/turn.rs:496][E: codex-rs/core/src/session/turn.rs:503][E: codex-rs/core/src/session/turn.rs:505]
20. `RegularTask::run` 在一次 `run_turn` 返回后，如果 `session.has_pending_input().await` 为 true，会继续循环以空 input 启动下一次 sampling；没有 pending input 时 task 退出，`on_task_finished` 发送 `TurnComplete`。[E: codex-rs/core/src/tasks/regular.rs:77][E: codex-rs/core/src/tasks/regular.rs:78][E: codex-rs/core/src/tasks/regular.rs:80][E: codex-rs/core/src/tasks/mod.rs:559]

## 关键设计点

- `TurnContext` 是 turn-scoped runtime snapshot：`Op::UserTurn` 的动态字段先被 `SessionSettingsUpdate` 和 `new_turn_with_sub_id` 固化，再被 sampling code 读取；“避免散落”是对该分层的归纳。[E: codex-rs/core/src/session/handlers.rs:156][E: codex-rs/core/src/session/handlers.rs:191][I]
- 工具调用不是同步阻塞 stream 的普通函数返回；stream loop 收集 tool futures，stream 完成后统一 drain，然后用 tool outputs 触发 follow-up sampling。[E: codex-rs/core/src/session/turn.rs:1893][E: codex-rs/core/src/session/turn.rs:2012][E: codex-rs/core/src/session/turn.rs:2240]
- context、skill、plugin、MCP tool exposure 都发生在 prompt build 之前；这让模型看到的是已经按当前 turn 设置整理过的 history 和 tools。[E: codex-rs/core/src/session/turn.rs:168][E: codex-rs/core/src/session/turn.rs:171][E: codex-rs/core/src/session/turn.rs:180][E: codex-rs/core/src/session/turn.rs:1028][E: codex-rs/core/src/session/turn.rs:1066][E: codex-rs/core/src/session/turn.rs:1174][E: codex-rs/core/src/session/turn.rs:1288][I]
- `TurnComplete` 是 task-level 事件，不是 provider `response.completed` 的直接映射；provider completed 只结束一次 sampling request。[E: codex-rs/core/src/session/turn.rs:2114][E: codex-rs/core/src/tasks/mod.rs:559]

## 深挖入口

- `spine.tool-call-anatomy` 拆解 `handle_output_item_done` 之后的 router、runtime、registry、handler。
- `spine.context-and-compaction` 拆解 `clone_history().for_prompt`、settings diff、manual compact、auto compact。
- `spine.sq-eq-architecture` 拆解 `Submission.id`、`Event.id`、SQ bounded 和 EQ unbounded。

## Sources

- codex-rs/protocol/src/protocol.rs
- codex-rs/core/src/session/handlers.rs
- codex-rs/core/src/session/turn_context.rs
- codex-rs/core/src/tasks/mod.rs
- codex-rs/core/src/tasks/regular.rs
- codex-rs/core/src/session/turn.rs
- codex-rs/core/src/stream_events_utils.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/core/src/context_manager/history.rs

## 相关

- [Codex 源码总览](overview.md)
- [SQ/EQ 双队列架构](sq-eq-architecture.md)
- [工具调用解剖](tool-call-anatomy.md)
- [Context 与 compaction](context-and-compaction.md)
- 索引 id：`ref.protocol-op`
