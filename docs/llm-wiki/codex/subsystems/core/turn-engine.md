---
id: subsys.core.turn-engine
title: Turn 引擎
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/step_context.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tools/parallel.rs]
symbols: [run_turn, run_sampling_request, try_run_sampling_request, built_tools, build_prompt, drain_in_flight, RegularTask, ToolCallTimingGuard, TurnContext]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, subsys.core.context-manager, subsys.core.tool-router, subsys.core.compaction]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Turn 引擎是 regular task 内部的 model-turn 状态机：`RegularTask::run` 先发 `TurnStarted`，再循环调用 `run_turn`；`run_turn` 做 pre-sampling compaction、captured step context、skill/plugin 注入、prompt history materialization、sampling request 和 follow-up 判断；真正的 stream/tool 处理在 `run_sampling_request`/`try_run_sampling_request` 中完成。[E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/regular.rs:76][E: codex-rs/core/src/session/turn.rs:163][E: codex-rs/core/src/session/turn.rs:183][E: codex-rs/core/src/session/turn.rs:308][E: codex-rs/core/src/session/turn.rs:522][E: codex-rs/core/src/session/turn.rs:1538][E: codex-rs/core/src/session/turn.rs:2409]

## 能回答的问题

- 一次 regular turn 从 `TurnStarted` 到 `run_turn` 结束经过哪些核心阶段？
- prompt 中的 history、tools、parallel tool flag 与 output schema 从哪里来？
- model stream 里的 assistant item、tool call、token usage 和 follow-up 如何回写 session？
- pre-turn 与 mid-turn auto compaction 的触发点在哪里？
- tool call 为什么可以并行或串行执行？

## 职责边界

`RegularTask::run` 是 turn engine 的外层 task：它把 startup prewarm 解析成可选 `ModelClientSession`，调用 `run_turn`，如果 active turn 没有 pending input 就返回 `last_agent_message`，否则清空下一轮显式 input 后继续循环。[E: codex-rs/core/src/tasks/regular.rs:56][E: codex-rs/core/src/tasks/regular.rs:70][E: codex-rs/core/src/tasks/regular.rs:76][E: codex-rs/core/src/tasks/regular.rs:77][E: codex-rs/core/src/tasks/regular.rs:92][E: codex-rs/core/src/tasks/regular.rs:95]

`run_turn` 负责一次 regular turn 内部的 sampling/follow-up loop；`Session::spawn`、submission dispatch、task 启动/取消属于 `subsys.core.session-lifecycle`，具体 tool spec 和 handler 分派属于 `subsys.core.tool-router`。[E: codex-rs/core/src/session/turn.rs:163][E: codex-rs/core/src/session/turn.rs:423][E: codex-rs/core/src/tasks/mod.rs:270][E: codex-rs/core/src/session/handlers.rs:538][I]

## 关键 crate/文件

- `codex-rs/core/src/session/turn.rs`: `run_turn`、pre/mid compaction、prompt 构造、Responses stream loop 和 in-flight tool drain。[E: codex-rs/core/src/session/turn.rs:163][E: codex-rs/core/src/session/turn.rs:1231][E: codex-rs/core/src/session/turn.rs:1509][E: codex-rs/core/src/session/turn.rs:2356][E: codex-rs/core/src/session/turn.rs:2409]
- `codex-rs/core/src/tasks/regular.rs`: regular task 的 `TurnStarted` 发射和 `run_turn` 循环。[E: codex-rs/core/src/tasks/regular.rs:51][E: codex-rs/core/src/tasks/regular.rs:76]
- `codex-rs/core/src/tools/parallel.rs`: `ToolCallRuntime` 从 `StepContext.tool_router` 读取本次 request 已 finalize 的 router，在 runtime readiness 后加 parallel policy 锁，再 dispatch。[E: codex-rs/core/src/tools/parallel.rs:43][E: codex-rs/core/src/tools/parallel.rs:106][E: codex-rs/core/src/tools/parallel.rs:151][E: codex-rs/core/src/tools/parallel.rs:165]

## 数据模型

`build_prompt` 只把 `step_context.tool_router.model_visible_specs()` 放进 `Prompt.tools`，并把 `parallel_tool_calls` 硬编码为 `true`；输出 schema 来自 `TurnContext`，strict flag 对 guardian reviewer source 关闭。[E: codex-rs/core/src/session/turn.rs:1509][E: codex-rs/core/src/session/turn.rs:1517][E: codex-rs/core/src/session/turn.rs:1518][E: codex-rs/core/src/session/turn.rs:1520][E: codex-rs/core/src/session/turn.rs:1521]

`try_run_sampling_request` 的 stream-local state 包括 `in_flight`、`needs_follow_up`、`last_agent_message`、active turn item、tool argument diff consumer、turn diff/token emit flags 和 plan-mode parsers。[E: codex-rs/core/src/session/turn.rs:2458][E: codex-rs/core/src/session/turn.rs:2459][E: codex-rs/core/src/session/turn.rs:2460][E: codex-rs/core/src/session/turn.rs:2461][E: codex-rs/core/src/session/turn.rs:2480]

## 控制流

1. `run_turn` 创建或复用 `ModelClientSession`，先跑 `run_pre_sampling_compact`；失败时发 turn error lifecycle 并返回 `None`。[E: codex-rs/core/src/session/turn.rs:177][E: codex-rs/core/src/session/turn.rs:183][E: codex-rs/core/src/session/turn.rs:207]
2. pre-sampling 后，`run_turn` 捕获第一份 `StepContext`，记录 context update/reference context baseline，构建 skill/plugin 注入，运行 session-start hooks 和 user-prompt hooks，然后把 injection items 写入 conversation history。[E: codex-rs/core/src/session/turn.rs:258][E: codex-rs/core/src/session/turn.rs:283][E: codex-rs/core/src/session/turn.rs:308][E: codex-rs/core/src/session/turn.rs:320][E: codex-rs/core/src/session/turn.rs:291][E: codex-rs/core/src/session/turn.rs:395]
3. 主 loop 在允许时 drain pending input，确保 context、advertised tools 和 tool calls 共享同一个 request view，然后调用 `run_sampling_request`。[E: codex-rs/core/src/session/turn.rs:423][E: codex-rs/core/src/session/turn.rs:427][E: codex-rs/core/src/session/turn.rs:457][E: codex-rs/core/src/session/turn.rs:522]
4. `run_sampling_request` 读取 `get_prompt_base_instructions`、创建不另存 router 的 `ToolCallRuntime`，并启动 code-mode turn worker。router 已在捕获该 request 的 `StepContext` 时完成 finalize。[E: codex-rs/core/src/session/turn.rs:1538][E: codex-rs/core/src/session/turn.rs:1549][E: codex-rs/core/src/session/turn.rs:1551][E: codex-rs/core/src/session/turn.rs:1556][E: codex-rs/core/src/session/step_context.rs:34]
5. `run_sampling_request` retry loop 优先使用传入 input，重试时重新 clone history for prompt（按 `step_context.settings.model_info.input_modalities`），再调用 `try_run_sampling_request`。[E: codex-rs/core/src/session/turn.rs:1566][E: codex-rs/core/src/session/turn.rs:1571][E: codex-rs/core/src/session/turn.rs:1576][E: codex-rs/core/src/session/turn.rs:1582][E: codex-rs/core/src/session/turn.rs:1596]
6. `try_run_sampling_request` 打开 model stream；`OutputItemDone` 完成当前 diff consumer，调用 `handle_output_item_done`，把产生的 `tool_future` 推入 `in_flight`，并 OR 合并 `needs_follow_up`。[E: codex-rs/core/src/session/turn.rs:2440][E: codex-rs/core/src/session/turn.rs:2538][E: codex-rs/core/src/session/turn.rs:2556][E: codex-rs/core/src/session/turn.rs:2628][E: codex-rs/core/src/session/turn.rs:2636][E: codex-rs/core/src/session/turn.rs:2641]
7. `Completed` 事件 flush assistant text，并把 response id/token usage 发成 `RawResponseCompleted`。若 `end_turn == Some(false)`，仍把 `needs_follow_up` 置 true。[E: codex-rs/core/src/session/turn.rs:2783][E: codex-rs/core/src/session/turn.rs:2799][E: codex-rs/core/src/session/turn.rs:2755][E: codex-rs/core/src/session/turn.rs:2825]
8. tool futures 由 `drain_in_flight` 逐个写入 conversation history，并在外部上下文污染 memory mode 时标记污染。[E: codex-rs/core/src/session/turn.rs:2356][E: codex-rs/core/src/session/turn.rs:2365][E: codex-rs/core/src/session/turn.rs:2230]
9. `run_turn` 收到 sampling result 后把 model follow-up 与 pending input 合并；若 token limit reached 且需要 follow-up，就用 `BeforeLastUserMessage` 触发 mid-turn auto compact 并继续 loop。[E: codex-rs/core/src/session/turn.rs:565][E: codex-rs/core/src/session/turn.rs:600][E: codex-rs/core/src/session/turn.rs:612][E: codex-rs/core/src/session/turn.rs:618]
10. 如果不需要 follow-up，`run_turn` 记录 `last_agent_message` 并执行 stop hooks；stop hook 若 block，可把 hook continuation 写回 history，再继续 turn。[E: codex-rs/core/src/session/turn.rs:642][E: codex-rs/core/src/session/turn.rs:644]

## 自动 compaction

`run_pre_sampling_compact` 先尝试 previous-model inline compact，再根据 `context_window_token_status` 判断 token limit；触发时捕获 pre-turn `StepContext`，并用 `InitialContextInjection::DoNotInject`、`CompactionReason::ContextLimit` 和 `CompactionPhase::PreTurn`。[E: codex-rs/core/src/session/turn.rs:1231][E: codex-rs/core/src/session/turn.rs:1237][E: codex-rs/core/src/session/turn.rs:1243][E: codex-rs/core/src/session/turn.rs:1253][E: codex-rs/core/src/session/turn.rs:1254][E: codex-rs/core/src/session/turn.rs:1255]

previous-model compact 有两条 pre-turn 路径：compaction compatibility hash 改变时用 `CompHashChanged`；切到不同且更小 context-window 的新模型时，如果 active tokens 已越过新模型 auto-compact/window threshold，就用 `ModelDownshift`。[E: codex-rs/core/src/session/turn.rs:1299][E: codex-rs/core/src/session/turn.rs:1336][E: codex-rs/core/src/session/turn.rs:1384]

## 设计动机与权衡

turn engine 把 context update、tool construction、sampling retry、stream parsing、tool future drain 和 follow-up loop 收束在 `session/turn.rs`，便于沿一次 turn 追踪状态，但也让该文件成为多个子系统的 glue 层。[E: codex-rs/core/src/session/turn.rs:163][E: codex-rs/core/src/session/turn.rs:2409][I]

tool runtime 用一个 `RwLock<()>` 区分 parallel-supported 与 non-parallel-supported tool：支持并行的 tool 取 read lock，不支持并行的 tool 取 write lock，再调用 router dispatch。[E: codex-rs/core/src/tools/parallel.rs:48][E: codex-rs/core/src/tools/parallel.rs:103][E: codex-rs/core/src/tools/parallel.rs:154][E: codex-rs/core/src/tools/parallel.rs:160][E: codex-rs/core/src/tools/parallel.rs:165]

Direct tool call 的 timing 把等待 parallel gate 的 dispatch latency 与拿锁后的 handler latency 分开；code-mode nested call 被刻意排除，避免一次用户可见调用产生重叠计时事件。[E: codex-rs/core/src/tools/parallel.rs:314]

## gotcha

- `run_turn` 返回 `Option<String>`，不是完整 response item；regular task 把它当作完成时可上报的 final agent message。[E: codex-rs/core/src/session/turn.rs:163][E: codex-rs/core/src/tasks/regular.rs:86]
- `Prompt.tools` 是模型可见 tools，不等于 router 内部可 dispatch 的完整工具集合。[E: codex-rs/core/src/session/turn.rs:1517][I]
- follow-up 不只由 tool call 决定；model result 和 pending input 都参与判断，token limit 只在需要 follow-up 时触发 mid-turn compaction。[E: codex-rs/core/src/session/turn.rs:565][E: codex-rs/core/src/session/turn.rs:600]

## Sources

- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/step_context.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tools/parallel.rs`

## 相关

- [一次 turn 端到端](../../spine/turn-end-to-end.md) — T0 图解入口。
- [Session 生命周期](session-lifecycle.md) — `RegularTask` 如何被创建、取消和完成。
- [Tool router 与并行执行](tool-router.md) — tool future 如何执行。
- [Compaction](compaction.md) — pre-turn/mid-turn replacement history 规则。
