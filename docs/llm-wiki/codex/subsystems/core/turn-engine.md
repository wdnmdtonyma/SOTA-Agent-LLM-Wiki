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
updated: 7750465934
---

> Turn 引擎是 regular task 内部的 model-turn 状态机：`RegularTask::run` 先发 `TurnStarted`，再循环调用 `run_turn`；`run_turn` 做 pre-sampling compaction、captured step context、skill/plugin 注入、prompt history materialization、sampling request 和 follow-up 判断；真正的 stream/tool 处理在 `run_sampling_request`/`try_run_sampling_request` 中完成。[E: codex-rs/core/src/tasks/regular.rs:49][E: codex-rs/core/src/tasks/regular.rs:76][E: codex-rs/core/src/session/turn.rs:149][E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:217][E: codex-rs/core/src/session/turn.rs:371][E: codex-rs/core/src/session/turn.rs:383][E: codex-rs/core/src/session/turn.rs:1308][E: codex-rs/core/src/session/turn.rs:2157]

## 能回答的问题

- 一次 regular turn 从 `TurnStarted` 到 `run_turn` 结束经过哪些核心阶段？
- prompt 中的 history、tools、parallel tool flag 与 output schema 从哪里来？
- model stream 里的 assistant item、tool call、token usage 和 follow-up 如何回写 session？
- pre-turn 与 mid-turn auto compaction 的触发点在哪里？
- tool call 为什么可以并行或串行执行？

## 职责边界

`RegularTask::run` 是 turn engine 的外层 task：它把 startup prewarm 解析成可选 `ModelClientSession`，调用 `run_turn`，如果 active turn 没有 pending input 就返回 `last_agent_message`，否则清空下一轮显式 input 后继续循环。[E: codex-rs/core/src/tasks/regular.rs:63][E: codex-rs/core/src/tasks/regular.rs:73][E: codex-rs/core/src/tasks/regular.rs:76][E: codex-rs/core/src/tasks/regular.rs:85][E: codex-rs/core/src/tasks/regular.rs:88]

`run_turn` 负责一次 regular turn 内部的 sampling/follow-up loop；`Session::spawn`、submission dispatch、task 启动/取消属于 `subsys.core.session-lifecycle`，具体 tool spec 和 handler 分派属于 `subsys.core.tool-router`。[E: codex-rs/core/src/session/turn.rs:268][E: codex-rs/core/src/tasks/mod.rs:275][E: codex-rs/core/src/session/handlers.rs:714][I]

## 关键 crate/文件

- `codex-rs/core/src/session/turn.rs`: `run_turn`、pre/mid compaction、prompt 构造、tool router 构造、Responses stream loop 和 in-flight tool drain。[E: codex-rs/core/src/session/turn.rs:149][E: codex-rs/core/src/session/turn.rs:983][E: codex-rs/core/src/session/turn.rs:1280][E: codex-rs/core/src/session/turn.rs:1465][E: codex-rs/core/src/session/turn.rs:2108][E: codex-rs/core/src/session/turn.rs:2157]
- `codex-rs/core/src/tasks/regular.rs`: regular task 的 `TurnStarted` 发射和 `run_turn` 循环。[E: codex-rs/core/src/tasks/regular.rs:49][E: codex-rs/core/src/tasks/regular.rs:75]
- `codex-rs/core/src/tools/parallel.rs`: `ToolCallRuntime` 从 `StepContext.tool_router` 读取本次 request 已 finalize 的 router，在 runtime readiness 后加 parallel policy 锁，再 dispatch。[E: codex-rs/core/src/tools/parallel.rs:41][E: codex-rs/core/src/tools/parallel.rs:112][E: codex-rs/core/src/tools/parallel.rs:147][E: codex-rs/core/src/tools/parallel.rs:164]

## 数据模型

`build_prompt` 只把 `router.model_visible_specs()` 放进 `Prompt.tools`，并从 `turn_context.model_info.supports_parallel_tool_calls` 设置 `parallel_tool_calls`；输出 schema 来自 `TurnContext`，strict flag 对 guardian reviewer source 关闭。[E: codex-rs/core/src/session/turn.rs:1280][E: codex-rs/core/src/session/turn.rs:1286][E: codex-rs/core/src/session/turn.rs:1288][E: codex-rs/core/src/session/turn.rs:1289][E: codex-rs/core/src/session/turn.rs:1291][E: codex-rs/core/src/session/turn.rs:1292]

`try_run_sampling_request` 的 stream-local state 包括 `in_flight: FuturesOrdered<...ResponseInputItem>`、`needs_follow_up`、`last_agent_message`、active turn item、tool argument diff consumer、turn diff/token emit flags 和 plan-mode parsers。[E: codex-rs/core/src/session/turn.rs:2201][E: codex-rs/core/src/session/turn.rs:2203][E: codex-rs/core/src/session/turn.rs:2204][E: codex-rs/core/src/session/turn.rs:2205][E: codex-rs/core/src/session/turn.rs:2206][E: codex-rs/core/src/session/turn.rs:2210][E: codex-rs/core/src/session/turn.rs:2211][E: codex-rs/core/src/session/turn.rs:2216][E: codex-rs/core/src/session/turn.rs:2217]

## 控制流

1. `run_turn` 创建或复用 `ModelClientSession`，先跑 `run_pre_sampling_compact`；失败时发 turn error lifecycle 并返回 `None`。[E: codex-rs/core/src/session/turn.rs:156][E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:175]
2. pre-sampling 后，`run_turn` 捕获第一份 `StepContext`，记录 context update/reference context baseline，构建 skill/plugin 注入，运行 session-start hooks 和 user-prompt hooks，然后把 injection items 写入 conversation history。[E: codex-rs/core/src/session/turn.rs:166][E: codex-rs/core/src/session/turn.rs:197][E: codex-rs/core/src/session/turn.rs:212][E: codex-rs/core/src/session/turn.rs:217][E: codex-rs/core/src/session/turn.rs:229][E: codex-rs/core/src/session/turn.rs:233][E: codex-rs/core/src/session/turn.rs:245]
3. 主 loop 在允许时 drain pending input，确保 context、advertised tools 和 tool calls 共享同一个 request view，然后 clone session history 并调用 `for_prompt` 生成 model input。[E: codex-rs/core/src/session/turn.rs:268][E: codex-rs/core/src/session/turn.rs:272][E: codex-rs/core/src/session/turn.rs:294][E: codex-rs/core/src/session/turn.rs:331][E: codex-rs/core/src/session/turn.rs:333]
4. `run_sampling_request` 直接 clone `step_context.tool_router`，读取 base instructions、创建不另存 router 的 `ToolCallRuntime`，并启动 code-mode turn worker。router 已在捕获该 request 的 `StepContext` 时完成 finalize。[E: codex-rs/core/src/session/turn.rs:1308][E: codex-rs/core/src/session/turn.rs:1318][E: codex-rs/core/src/session/turn.rs:1319][E: codex-rs/core/src/session/turn.rs:1323][E: codex-rs/core/src/session/step_context.rs:22]
5. `run_sampling_request` retry loop 优先使用传入 input，重试时重新 clone history for prompt，再调用 `try_run_sampling_request`；context-window 和 usage-limit error 被特殊处理，其余 retryable error 走 stream retry helper。[E: codex-rs/core/src/session/turn.rs:1333][E: codex-rs/core/src/session/turn.rs:1339][E: codex-rs/core/src/session/turn.rs:1342][E: codex-rs/core/src/session/turn.rs:1359][E: codex-rs/core/src/session/turn.rs:1321][E: codex-rs/core/src/session/turn.rs:1324][E: codex-rs/core/src/session/turn.rs:1399]
6. `try_run_sampling_request` 打开 model stream；`OutputItemDone` 完成当前 diff consumer，调用 `handle_output_item_done`，把产生的 `tool_future` 推入 `in_flight`，并 OR 合并 `needs_follow_up`。[E: codex-rs/core/src/session/turn.rs:2187][E: codex-rs/core/src/session/turn.rs:2285][E: codex-rs/core/src/session/turn.rs:2355][E: codex-rs/core/src/session/turn.rs:2363][E: codex-rs/core/src/session/turn.rs:2369]
7. `Completed` 事件 flush assistant text，并把 response id/token usage 发成 `RawResponseCompleted`；随后记录 usage、设置 turn diff/token 标志。若 `end_turn == Some(false)`，仍把 `needs_follow_up` 置 true。[E: codex-rs/core/src/session/turn.rs:2511][E: codex-rs/core/src/session/turn.rs:2526][E: codex-rs/core/src/session/turn.rs:2535][E: codex-rs/core/src/session/turn.rs:2541][E: codex-rs/core/src/session/turn.rs:2549]
8. tool futures 由 `drain_in_flight` 逐个转成 `ResponseItem`，写入 conversation history，并在外部上下文污染 memory mode 时标记污染。[E: codex-rs/core/src/session/turn.rs:2108][E: codex-rs/core/src/session/turn.rs:2113][E: codex-rs/core/src/session/turn.rs:2116][E: codex-rs/core/src/session/turn.rs:2117][E: codex-rs/core/src/session/turn.rs:2119]
9. `run_turn` 收到 sampling result 后把 model follow-up 与 pending input 合并；若 token limit reached 且需要 follow-up，就用 `BeforeLastUserMessage` 触发 mid-turn auto compact 并继续 loop。[E: codex-rs/core/src/session/turn.rs:357][E: codex-rs/core/src/session/turn.rs:371][E: codex-rs/core/src/session/turn.rs:383][E: codex-rs/core/src/session/turn.rs:422][E: codex-rs/core/src/session/turn.rs:423][E: codex-rs/core/src/session/turn.rs:431][E: codex-rs/core/src/session/turn.rs:395][E: codex-rs/core/src/session/turn.rs:440][E: codex-rs/core/src/session/turn.rs:441][E: codex-rs/core/src/session/turn.rs:457]
10. 如果不需要 follow-up，`run_turn` 记录 `last_agent_message` 并执行 stop hooks；stop hook 若 block，可把 hook continuation 写回 history，再继续 turn。[E: codex-rs/core/src/session/turn.rs:460][E: codex-rs/core/src/session/turn.rs:461][E: codex-rs/core/src/session/turn.rs:462][E: codex-rs/core/src/session/turn.rs:469][E: codex-rs/core/src/session/turn.rs:466]

## 自动 compaction

`run_pre_sampling_compact` 先尝试 previous-model inline compact，再根据 `context_window_token_status` 判断 token limit；触发时捕获 pre-turn `StepContext`，并用 `InitialContextInjection::DoNotInject`、`CompactionReason::ContextLimit` 和 `CompactionPhase::PreTurn`。[E: codex-rs/core/src/session/turn.rs:983][E: codex-rs/core/src/session/turn.rs:950][E: codex-rs/core/src/session/turn.rs:991][E: codex-rs/core/src/session/turn.rs:995][E: codex-rs/core/src/session/turn.rs:958][E: codex-rs/core/src/session/turn.rs:1005][E: codex-rs/core/src/session/turn.rs:1006][E: codex-rs/core/src/session/turn.rs:1007]

previous-model compact 有两条 pre-turn 路径：compaction compatibility hash 改变时用 `CompHashChanged`；切到不同且更小 context-window 的新模型时，如果 active tokens 已越过新模型 auto-compact/window threshold，就用 `ModelDownshift`。[E: codex-rs/core/src/session/turn.rs:1060][E: codex-rs/core/src/session/turn.rs:1071][E: codex-rs/core/src/session/turn.rs:1088][E: codex-rs/core/src/session/turn.rs:1102][E: codex-rs/core/src/session/turn.rs:1107][E: codex-rs/core/src/session/turn.rs:1111][E: codex-rs/core/src/session/turn.rs:1112][E: codex-rs/core/src/session/turn.rs:1114][E: codex-rs/core/src/session/turn.rs:1116][E: codex-rs/core/src/session/turn.rs:1117][E: codex-rs/core/src/session/turn.rs:1118][E: codex-rs/core/src/session/turn.rs:1136]

## 设计动机与权衡

turn engine 把 context update、tool construction、sampling retry、stream parsing、tool future drain 和 follow-up loop 收束在 `session/turn.rs`，便于沿一次 turn 追踪状态，但也让该文件成为多个子系统的 glue 层。[E: codex-rs/core/src/session/turn.rs:176][E: codex-rs/core/src/session/turn.rs:2157][I]

tool runtime 用一个 `RwLock<()>` 区分 parallel-supported 与 non-parallel-supported tool：支持并行的 tool 取 read lock，不支持并行的 tool 取 write lock，再调用 router dispatch。[E: codex-rs/core/src/tools/parallel.rs:46][E: codex-rs/core/src/tools/parallel.rs:100][E: codex-rs/core/src/tools/parallel.rs:153][E: codex-rs/core/src/tools/parallel.rs:156][E: codex-rs/core/src/tools/parallel.rs:164]

Direct tool call 的 timing 把等待 parallel gate 的 dispatch latency 与拿锁后的 handler latency 分开；code-mode nested call 被刻意排除，避免一次用户可见调用产生重叠计时事件。[E: codex-rs/core/src/tools/parallel.rs:304]

## gotcha

- `run_turn` 返回 `Option<String>`，不是完整 response item；regular task 把它当作完成时可上报的 final agent message。[E: codex-rs/core/src/session/turn.rs:149][E: codex-rs/core/src/tasks/regular.rs:85]
- `Prompt.tools` 是模型可见 tools，不等于 router 内部可 dispatch 的完整工具集合。[E: codex-rs/core/src/session/turn.rs:1288][I]
- follow-up 不只由 tool call 决定；model result 和 pending input 都参与判断，token limit 只在需要 follow-up 时触发 mid-turn compaction。[E: codex-rs/core/src/session/turn.rs:383][E: codex-rs/core/src/session/turn.rs:372]

## Sources

- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tools/parallel.rs`

## 相关

- [一次 turn 端到端](../../spine/turn-end-to-end.md) — T0 图解入口。
- [Session 生命周期](session-lifecycle.md) — `RegularTask` 如何被创建、取消和完成。
- [Tool router 与并行执行](tool-router.md) — tool future 如何执行。
- [Compaction](compaction.md) — pre-turn/mid-turn replacement history 规则。
