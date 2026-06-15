---
id: subsys.core.turn-engine
title: Turn 引擎
kind: subsystem
tier: T2
source: [codex-rs/core/src/session/turn.rs, codex-rs/core/src/tasks/regular.rs, codex-rs/core/src/tools/parallel.rs]
symbols: [run_turn, run_sampling_request, try_run_sampling_request, built_tools, build_prompt, drain_in_flight, RegularTask]
related: [spine.turn-end-to-end, subsys.core.session-lifecycle, subsys.core.context-manager, subsys.core.tool-router, subsys.core.compaction]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Turn 引擎是 `run_turn`、`run_sampling_request` 与 `try_run_sampling_request` 协作驱动的一次 regular agent 回合状态机：它记录上下文、构造 prompt/tools、发起 Responses sampling、流式处理 assistant/tool output、收集 tool future，并在需要 follow-up 时继续下一次 sampling。[E: codex-rs/core/src/session/turn.rs:137][E: codex-rs/core/src/session/turn.rs:168][E: codex-rs/core/src/session/turn.rs:379][E: codex-rs/core/src/session/turn.rs:449][E: codex-rs/core/src/session/turn.rs:1028][E: codex-rs/core/src/session/turn.rs:1066][E: codex-rs/core/src/session/turn.rs:1880][E: codex-rs/core/src/session/turn.rs:1944][E: codex-rs/core/src/session/turn.rs:2013][E: codex-rs/core/src/session/turn.rs:625]

## 能回答的问题

- `run_turn` 在真正 sampling 前会做哪些上下文、skill、plugin、MCP 准备？
- turn 主循环什么时候继续 follow-up，什么时候结束？
- tool calls 如何进入 `in_flight`，又如何写回 history？
- 自动 compaction 在 pre-turn 与 mid-turn 的触发点分别在哪里？
- `Prompt` 的 tools、parallel_tool_calls、instructions 来自哪里？
- streaming event loop 如何处理 `OutputItemDone`、`Completed`、delta 与错误？

## 职责边界

`run_turn` 的边界是一次 regular agent turn 内的 model sampling 与 follow-up；session 创建、op 分发和 task 调度属于 `subsys.core.session-lifecycle`，具体工具 handler 属于 `subsys.core.tool-router` 和各工具 runtime。[E: codex-rs/core/src/tasks/regular.rs:68][E: codex-rs/core/src/session/turn.rs:660][I]

`RegularTask::run` 会发送 `TurnStarted`，然后反复调用 `run_turn`；每轮 `run_turn` 之后，只要 session 没有 pending input，regular task 就返回本轮的 `last_agent_message`，否则把下一轮 input 置空后继续 loop。[E: codex-rs/core/src/tasks/regular.rs:47][E: codex-rs/core/src/tasks/regular.rs:53][E: codex-rs/core/src/tasks/regular.rs:67][E: codex-rs/core/src/tasks/regular.rs:68][E: codex-rs/core/src/tasks/regular.rs:77][E: codex-rs/core/src/tasks/regular.rs:78][E: codex-rs/core/src/tasks/regular.rs:80] 这说明 `run_turn` 不是整个 session lifecycle，而是 task 内部的 turn engine。[I]

## 关键 crate/文件

- `codex-rs/core/src/session/turn.rs`: turn context updates、pre/mid compaction、tool building、prompt building、sampling retry、stream event processing、tool future drain 都集中在这里。[E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:168][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:943][E: codex-rs/core/src/session/turn.rs:1016][E: codex-rs/core/src/session/turn.rs:1058][E: codex-rs/core/src/session/turn.rs:1861][E: codex-rs/core/src/session/turn.rs:2240]
- `codex-rs/core/src/tasks/regular.rs`: regular task 对 `run_turn` 的外层循环与 `TurnStarted` 发射位置。[E: codex-rs/core/src/tasks/regular.rs:53][E: codex-rs/core/src/tasks/regular.rs:67][E: codex-rs/core/src/tasks/regular.rs:68]
- `codex-rs/core/src/tools/parallel.rs`: `ToolCallRuntime` 让 sampling loop 产生的 tool future 能按 parallel policy 执行；parallel-supported tool 取 read lock，非 parallel-supported tool 取 write lock。[E: codex-rs/core/src/tools/parallel.rs:36][E: codex-rs/core/src/tools/parallel.rs:89][E: codex-rs/core/src/tools/parallel.rs:107][E: codex-rs/core/src/tools/parallel.rs:116][E: codex-rs/core/src/tools/parallel.rs:119]

## 数据模型

`Prompt` 在 `build_prompt` 中组装，字段包括 `input`、`tools`、`parallel_tool_calls`、`base_instructions`、`personality`、`output_schema` 和 `output_schema_strict`；其中 `parallel_tool_calls` 直接来自 `turn_context.model_info.supports_parallel_tool_calls`。[E: codex-rs/core/src/session/turn.rs:965][E: codex-rs/core/src/session/turn.rs:966][E: codex-rs/core/src/session/turn.rs:967][E: codex-rs/core/src/session/turn.rs:968][E: codex-rs/core/src/session/turn.rs:969][E: codex-rs/core/src/session/turn.rs:970][E: codex-rs/core/src/session/turn.rs:971][E: codex-rs/core/src/session/turn.rs:972]

streaming loop 中的 `in_flight` 是 `FuturesOrdered<BoxFuture<'static, CodexResult<ResponseInputItem>>>`，`OutputItemDone` 产生的 tool future 会先 push 进去，随后 `drain_in_flight` 把每个 tool future 的 `ResponseInputItem` 转成 `ResponseItem` 并记录进 conversation history。[E: codex-rs/core/src/session/turn.rs:1893][E: codex-rs/core/src/session/turn.rs:2012][E: codex-rs/core/src/session/turn.rs:2013][E: codex-rs/core/src/session/turn.rs:2240][E: codex-rs/core/src/session/turn.rs:1832][E: codex-rs/core/src/session/turn.rs:1835][E: codex-rs/core/src/session/turn.rs:1836]

## 控制流

1. `run_turn` 入口如果 input 为空且 session 没有 pending input，直接返回 None。[E: codex-rs/core/src/session/turn.rs:137][E: codex-rs/core/src/session/turn.rs:144][E: codex-rs/core/src/session/turn.rs:145]
2. `run_turn` 在 sampling 前调用 `run_pre_sampling_compact`，如果发生 compaction，会 reset prewarmed websocket client session，避免沿用 compaction 前的会话状态。[E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:162][E: codex-rs/core/src/session/turn.rs:163]
3. `run_turn` 调用 `record_context_updates_and_set_reference_context_item`；该方法的 history 注入与 baseline 更新语义由 context-manager 节点覆盖。[E: codex-rs/core/src/session/turn.rs:168][I]
4. `run_turn` 收集 plugin mentions、按条件加载 MCP tools/connectors，并构建 skill injections 与 plugin injections；skill items 会作为 contextual user fragments 写入本 turn history。[E: codex-rs/core/src/session/turn.rs:178][E: codex-rs/core/src/session/turn.rs:179][E: codex-rs/core/src/session/turn.rs:180][E: codex-rs/core/src/session/turn.rs:200][E: codex-rs/core/src/session/turn.rs:250][E: codex-rs/core/src/session/turn.rs:267][E: codex-rs/core/src/session/turn.rs:272][E: codex-rs/core/src/session/turn.rs:348][E: codex-rs/core/src/session/turn.rs:349]
5. `run_turn` 运行 user prompt submit hooks，然后通过 `record_user_prompt_and_emit_turn_item` 记录用户输入并发出 turn item。[E: codex-rs/core/src/session/turn.rs:308][E: codex-rs/core/src/session/turn.rs:323]
6. turn 主循环从 `loop` 开始，每轮会 drain pending input、clone history for prompt、收集本轮 user messages，然后调用 `run_sampling_request`。[E: codex-rs/core/src/session/turn.rs:379][E: codex-rs/core/src/session/turn.rs:387][E: codex-rs/core/src/session/turn.rs:388][E: codex-rs/core/src/session/turn.rs:435][E: codex-rs/core/src/session/turn.rs:437][E: codex-rs/core/src/session/turn.rs:440][E: codex-rs/core/src/session/turn.rs:449]
7. `run_sampling_request` 先通过 `built_tools` 创建 `ToolRouter`，再构建 `ToolCallRuntime`；随后通过 `code_mode_service.start_turn_worker` 尝试启动 code-mode turn worker。[E: codex-rs/core/src/session/turn.rs:1028][E: codex-rs/core/src/session/turn.rs:1040][E: codex-rs/core/src/session/turn.rs:1046][E: codex-rs/core/src/session/turn.rs:1049]
8. `run_sampling_request` 的 retry loop 构建 prompt、调用 `try_run_sampling_request`，并在 websocket stream retry 超出 provider budget 后尝试回退到 HTTPS transport。[E: codex-rs/core/src/session/turn.rs:1058][E: codex-rs/core/src/session/turn.rs:1066][E: codex-rs/core/src/session/turn.rs:1072][E: codex-rs/core/src/session/turn.rs:1107][E: codex-rs/core/src/session/turn.rs:1108][E: codex-rs/core/src/session/turn.rs:1109][E: codex-rs/core/src/session/turn.rs:1117]
9. `try_run_sampling_request` 启动 model stream，维护 `in_flight`、`needs_follow_up`、active output item 与 diff consumer 状态。[E: codex-rs/core/src/session/turn.rs:1880][E: codex-rs/core/src/session/turn.rs:1893][E: codex-rs/core/src/session/turn.rs:1895][E: codex-rs/core/src/session/turn.rs:1897][E: codex-rs/core/src/session/turn.rs:1898][E: codex-rs/core/src/session/turn.rs:1900]
10. streaming loop 遇到 `OutputItemDone` 时调用 `handle_output_item_done`；如果输出项产生 tool future，就把 future push 到 `in_flight`，并把 `needs_follow_up` 与该结果 OR 起来。[E: codex-rs/core/src/session/turn.rs:1944][E: codex-rs/core/src/session/turn.rs:2004][E: codex-rs/core/src/session/turn.rs:2005][E: codex-rs/core/src/session/turn.rs:2012][E: codex-rs/core/src/session/turn.rs:2013][E: codex-rs/core/src/session/turn.rs:2018]
11. streaming loop 遇到 `Completed` 时刷新 token usage，标记需要 emit turn diff，然后返回 `SamplingRequestResult`。[E: codex-rs/core/src/session/turn.rs:1302][E: codex-rs/core/src/session/turn.rs:2125][E: codex-rs/core/src/session/turn.rs:2127][E: codex-rs/core/src/session/turn.rs:2129]
12. stream 结束后，`try_run_sampling_request` 会 flush parser 并 `drain_in_flight`；如果有 turn diff 要发，会发送 `EventMsg::TurnDiff`。[E: codex-rs/core/src/session/turn.rs:2232][E: codex-rs/core/src/session/turn.rs:2240][E: codex-rs/core/src/session/turn.rs:2246][E: codex-rs/core/src/session/turn.rs:2252][E: codex-rs/core/src/session/turn.rs:2253]
13. `run_turn` 拿到 sampling result 后，根据 `needs_follow_up` 与 token usage 判断是否要 mid-turn auto compact；如果不需要 follow-up，就运行 stop hooks/after-agent hooks 并结束 turn。[E: codex-rs/core/src/session/turn.rs:463][E: codex-rs/core/src/session/turn.rs:470][E: codex-rs/core/src/session/turn.rs:472][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:508][E: codex-rs/core/src/session/turn.rs:538][E: codex-rs/core/src/session/turn.rs:565][E: codex-rs/core/src/session/turn.rs:572][E: codex-rs/core/src/session/turn.rs:623]

## 自动 compaction 触发

`run_pre_sampling_compact` 会先尝试 previous-model inline compact，再按 total tokens 与 auto compact limit 判断是否触发 pre-turn auto compact；触发时使用 `InitialContextInjection::DoNotInject`、reason `ContextLimit` 和 phase `PreTurn`。[E: codex-rs/core/src/session/turn.rs:709][E: codex-rs/core/src/session/turn.rs:714][E: codex-rs/core/src/session/turn.rs:720][E: codex-rs/core/src/session/turn.rs:726][E: codex-rs/core/src/session/turn.rs:727][E: codex-rs/core/src/session/turn.rs:730][E: codex-rs/core/src/session/turn.rs:731][E: codex-rs/core/src/session/turn.rs:732]

previous-model downshift compaction 会比较 previous turn settings、旧 context window、新 context window、model slug 与新 auto compact limit，如果条件满足就以 reason `ModelDownshift` 和 phase `PreTurn` 调用 `run_auto_compact`。[E: codex-rs/core/src/session/turn.rs:751][E: codex-rs/core/src/session/turn.rs:760][E: codex-rs/core/src/session/turn.rs:763][E: codex-rs/core/src/session/turn.rs:766][E: codex-rs/core/src/session/turn.rs:770][E: codex-rs/core/src/session/turn.rs:771][E: codex-rs/core/src/session/turn.rs:772][E: codex-rs/core/src/session/turn.rs:774][E: codex-rs/core/src/session/turn.rs:778][E: codex-rs/core/src/session/turn.rs:779]

mid-turn compaction 只在 token limit reached 且需要 follow-up 时触发；它调用 `run_auto_compact`，然后继续 loop 让工具结果或压缩后的 history 进入下一次 sampling。[E: codex-rs/core/src/session/turn.rs:470][E: codex-rs/core/src/session/turn.rs:472][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:491][E: codex-rs/core/src/session/turn.rs:494][E: codex-rs/core/src/session/turn.rs:496][E: codex-rs/core/src/session/turn.rs:505][I]

## 设计动机与权衡

`run_turn` 把 context update、tool construction、sampling、tool execution 和 follow-up loop 放在同一个函数族中，换来的是一个 turn 的控制流可在 `session/turn.rs` 内顺序追踪；代价是该文件同时承载大量跨子系统 glue code。[E: codex-rs/core/src/session/turn.rs:168][E: codex-rs/core/src/session/turn.rs:1028][E: codex-rs/core/src/session/turn.rs:1861][I]

tool futures 用 `FuturesOrdered` drain 回 history，确保 model-emitted tool call 与 tool output 进入后续 prompt；这条链路是 Responses function-call loop 的核心不变量。[E: codex-rs/core/src/session/turn.rs:1893][E: codex-rs/core/src/session/turn.rs:1835][E: codex-rs/core/src/session/turn.rs:1836][I]

pre-turn compaction 的 `DoNotInject` 与 mid-turn compaction 的 `BeforeLastUserMessage` 注入选择不同；replacement history 的实际构造规则由 compaction 子系统覆盖。[E: codex-rs/core/src/session/turn.rs:730][E: codex-rs/core/src/session/turn.rs:494][I]

## gotcha

- `run_turn` 返回 `Option<String>`，不是 response item；regular task 把这个值作为 last agent message 的候选结果继续向 session lifecycle 传递。[E: codex-rs/core/src/session/turn.rs:143][E: codex-rs/core/src/tasks/regular.rs:68][E: codex-rs/core/src/tasks/regular.rs:77][E: codex-rs/core/src/tasks/regular.rs:78]
- `needs_follow_up` 不只由 tool call 决定；sampling result、pending input 和 token limit 都会影响下一轮 loop 是否继续。[E: codex-rs/core/src/session/turn.rs:463][E: codex-rs/core/src/session/turn.rs:465][E: codex-rs/core/src/session/turn.rs:469][E: codex-rs/core/src/session/turn.rs:470][E: codex-rs/core/src/session/turn.rs:472][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:505][E: codex-rs/core/src/session/turn.rs:625]
- `build_prompt` 会过滤 deferred dynamic tools；因此 `ToolRouter` 的完整 registry 与 `Prompt.tools` 对模型可见面并不必然一一相同。[E: codex-rs/core/src/session/turn.rs:949][E: codex-rs/core/src/session/turn.rs:955][E: codex-rs/core/src/session/turn.rs:956][E: codex-rs/core/src/session/turn.rs:961][E: codex-rs/core/src/session/turn.rs:965][I]

## Sources

- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/tasks/regular.rs`
- `codex-rs/core/src/tools/parallel.rs`

## 相关

- [一次 turn 端到端](../../spine/turn-end-to-end.md) — T0 图解入口。
- [Session 生命周期](session-lifecycle.md) — `RegularTask` 如何被创建、取消和完成。
- [Tool router 与并行执行](tool-router.md) — tool future 如何执行。
- [Compaction](compaction.md) — pre-turn/mid-turn replacement history 规则。
