---
id: subsys.core.compaction
title: 历史压缩与 compaction
kind: subsystem
tier: T2
source: [codex-rs/core/src/compact.rs, codex-rs/core/src/compact_token_budget.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/compact_remote_v2_attempt.rs, codex-rs/core/src/compact_remote_history.rs, codex-rs/core/src/compact_model_fallback.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/lib.rs, codex-rs/features/src/lib.rs]
symbols: [InitialContextInjection, CompactTask, run_compact_task, run_inline_auto_compact_task, run_auto_compact, run_remote_compact_task, run_inline_remote_auto_compact_task, build_compacted_history, insert_initial_context_before_last_real_user_or_summary, HistoryItemGroup, trim_function_call_history_to_fit_context_window]
related: [subsys.core.turn-engine, subsys.core.context-manager, subsys.core.instruction-assembly, subsys.core.session-lifecycle, subsys.core.token-budget, subsys.core.history-notes]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Compaction 是 Codex 在上下文接近或跨越模型限制时安装 replacement history 的机制。当前有三条实现路径：`Feature::TokenBudget` 短路（不走 summarizer）、local summarization stream，以及 provider `RemoteCompactionSupport::V2` 下的普通 Responses stream + `ResponseItem::CompactionTrigger`。`core/src/lib.rs` 只 `mod compact_remote_history` + `mod compact_remote_v2`；本地 compact 仍在 `compact.rs`。remote v1 文件（`compact_remote.rs` / `compact_remote_request.rs`）已删除。三条路径最终都调用 `Session::replace_compacted_history`。[E: codex-rs/core/src/lib.rs:32][E: codex-rs/core/src/lib.rs:33][E: codex-rs/core/src/session/turn.rs:1408][E: codex-rs/core/src/compact.rs:235][E: codex-rs/core/src/session/mod.rs:3929]

## 能回答的问题

- 手动 compact、pre-turn auto compact、model downshift compact 和 mid-turn compact 分别怎么触发？
- `InitialContextInjection::DoNotInject` 和 `BeforeLastUserMessage { world_state, step_context }` 的语义是什么？
- TokenBudget compact 与 local / remote v2 的差异是什么？
- remote v2 为什么只保留部分 message 再追加 compaction item？history trim / group 在哪个文件？
- compaction 后 `reference_context_item`、world-state baseline、`CompactedItem` 和 auto-compact window ids 如何更新？

## 职责边界

`compact.rs` 负责 local summarization、summary history 构造、recent user message 截断和 initial context 插入；`compact_token_budget.rs` 在 TokenBudget feature 下跳过模型/server summarization，但仍走 compact hooks 与 `ContextCompaction` lifecycle；`compact_remote_v2.rs` 负责 remote v2 lifecycle、install 与 retained-message filter；`compact_remote_v2_attempt.rs` 负责 trim、prompt、`CompactionTrigger` 与 stream attempt；`compact_remote_history.rs` 负责 `HistoryItemGroup` 与 `trim_function_call_history_to_fit_context_window`；`tasks/compact.rs` 是手动 compact session task 的路径选择入口；`session/turn.rs` 在 pre-sampling、model change/downshift 和 mid-turn follow-up loop 中触发 auto compact。[E: codex-rs/core/src/compact.rs:235][E: codex-rs/core/src/compact_token_budget.rs:25][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/session/turn.rs:183][E: codex-rs/core/src/compact_remote_history.rs:20][E: codex-rs/core/src/compact_remote_history.rs:68] 普通 turn sampling 的 tool dispatch 只被 remote v2 复用为 model-visible specs，不归 compaction 自身负责。[I]

路径选择不再看 `Feature::RemoteCompactionV2`（该 flag 已是 `Stage::Removed`），也不再有 remote v1。手动与 auto 都是：TokenBudget 开则短路；否则 `RemoteCompactionSupport::V2` 走 `compact_remote_v2::run_remote_compact_task` / `run_inline_remote_auto_compact_task`，`Unsupported` 走 local。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/session/turn.rs:1408][E: codex-rs/core/src/session/turn.rs:1420][E: codex-rs/features/src/lib.rs:1761]

## 关键 crate/文件

- `codex-rs/core/src/compact.rs`: local path、`InitialContextInjection`、summary text 构造、`build_compacted_history`、`insert_initial_context_before_last_real_user_or_summary` 和 stream drain。[E: codex-rs/core/src/compact.rs:71][E: codex-rs/core/src/compact.rs:235][E: codex-rs/core/src/compact.rs:606][E: codex-rs/core/src/compact.rs:664]
- `compact_token_budget.rs`: TokenBudget 手动/auto compact；安装 fresh context window，不调用 summarizer。[E: codex-rs/core/src/compact_token_budget.rs:73]
- `compact_remote_v2.rs`: remote v2 lifecycle、`build_v2_compacted_history`、64k retained-message budget、空 `CompactedItem.message`。[E: codex-rs/core/src/compact_remote_v2.rs:79][E: codex-rs/core/src/compact_remote_v2.rs:105][E: codex-rs/core/src/compact_remote_v2.rs:73][E: codex-rs/core/src/compact_remote_v2.rs:343]
- `compact_remote_v2_attempt.rs`: clone history、`trim_function_call_history_to_fit_context_window`、`for_prompt_annotated`、append `CompactionTrigger`、带 tool specs 的普通 stream。[E: codex-rs/core/src/compact_remote_v2_attempt.rs:30][E: codex-rs/core/src/compact_remote_v2_attempt.rs:42][E: codex-rs/core/src/compact_remote_v2_attempt.rs:78]
- `compact_remote_history.rs`: `HistoryItemGroup`（source + optional attached image-resize notice）与从尾部改写 oversized tool outputs。[E: codex-rs/core/src/compact_remote_history.rs:20][E: codex-rs/core/src/compact_remote_history.rs:68]
- `codex-rs/core/src/tasks/compact.rs`: `CompactTask::run` 先看 TokenBudget，再按 provider `remote_compaction` 选 v2 或 local。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:41]
- `codex-rs/core/src/session/turn.rs`: auto compact trigger points；pre-turn 在 context updates/user input 记录前运行，mid-turn 在 token limit reached 或 `new_context` 且仍需 follow-up 时运行。[E: codex-rs/core/src/session/turn.rs:183][E: codex-rs/core/src/session/turn.rs:612]

## 数据模型

`InitialContextInjection` 的两个值控制 replacement history 是否包含 fresh initial context。`DoNotInject` 用于 pre-turn/manual compaction：replacement history 不带 initial context，`reference_context_item` 设为 `None`；`BeforeLastUserMessage { world_state, step_context }` 用于 mid-turn compaction：用同一个 world-state baseline 渲染 initial context，再插入到最后一个真实 user message 或 summary/compaction fallback 之前，`reference_context_item` 设为当前 turn context。[E: codex-rs/core/src/compact.rs:71][E: codex-rs/core/src/compact.rs:91][E: codex-rs/core/src/compact.rs:375]

Local `CompactedItem` 保存 `message: summary_text`、`replacement_history` 和新的 window number / first-window / previous-window / current-window ids；remote v2 的 `CompactedItem.message` 是空字符串，但同样保存 replacement history 和 window metadata。[E: codex-rs/core/src/compact.rs:386][E: codex-rs/core/src/compact_remote_v2.rs:343]

`build_compacted_history` 按 token budget 从最近 user messages 反向挑选，必要时截断最老的保留 message，然后把 summary 作为 role=`user` 的 `ResponseItem::Message` 压到末尾。user message 上限是 `COMPACT_USER_MESSAGE_MAX_TOKENS`（20_000）。[E: codex-rs/core/src/compact.rs:60][E: codex-rs/core/src/compact.rs:664]

## 控制流

1. 手动 compact: `session/handlers.rs::compact` 创建默认 turn context，然后 `spawn_task(..., CompactTask)`。[E: codex-rs/core/src/session/handlers.rs:243][E: codex-rs/core/src/session/handlers.rs:248]
2. `CompactTask::run` 先看 `Feature::TokenBudget`；否则 `RemoteCompactionSupport::V2` 调 `compact_remote_v2::run_remote_compact_task`，`Unsupported` 把 config 中的 `compact_prompt` 或默认 `SUMMARIZATION_PROMPT` 合成 `UserInput::Text` 走 local。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:56]
3. Pre-turn auto compact: `run_turn` 在 context updates 和新 user input 记录前调用 `run_pre_sampling_compact`；该函数先尝试 previous-model compact，再按 `context_window_token_status` 判断是否以 `DoNotInject` 运行 pre-turn compact。[E: codex-rs/core/src/session/turn.rs:183][E: codex-rs/core/src/session/turn.rs:1231][E: codex-rs/core/src/session/turn.rs:1243]
4. Mid-turn auto compact: sampling 后如果仍需 follow-up 且存在 `new_context` 请求或 token limit reached，turn loop 调用 `run_auto_compact(..., BeforeLastUserMessage { world_state, step_context }, ContextLimit, MidTurn)`，成功后继续 loop。[E: codex-rs/core/src/session/turn.rs:600][E: codex-rs/core/src/session/turn.rs:612]
5. `run_auto_compact` 对 auto paths：TokenBudget 开则短路；否则同样基于 `RemoteCompactionSupport::V2` / `Unsupported` 选择 remote v2 或 local。[E: codex-rs/core/src/session/turn.rs:1408][E: codex-rs/core/src/session/turn.rs:1420]

## Local path

Local compaction clone 当前 history，把 synthesized prompt input 记录进去，再用 `Prompt { input: history.for_prompt(...), base_instructions: sess.get_prompt_base_instructions() }` 走普通 streaming completion；若 prompt 超上下文窗口且 item 数大于 1，会删除最早 history item 并重试。[E: codex-rs/core/src/compact.rs:235][E: codex-rs/core/src/compact.rs:247][E: codex-rs/core/src/compact.rs:267][E: codex-rs/core/src/compact.rs:274][E: codex-rs/core/src/compact.rs:307]

成功后 local path 从 session history 取最后 assistant message 作为 summary suffix，拼上 `SUMMARY_PREFIX`，收集非 summary user messages，构建 replacement history，必要时插入 initial context，然后 advance auto-compact window number/ids 并安装 replacement history，再 `recompute_token_usage`。[E: codex-rs/core/src/compact.rs:352][E: codex-rs/core/src/compact.rs:386][E: codex-rs/core/src/compact.rs:394]

Local stream drain 会记录 `OutputItemDone` 到 conversation history、更新 server reasoning/rate limit/token usage，并在 `response.completed` 后返回。[E: codex-rs/core/src/compact.rs:756][E: codex-rs/core/src/compact.rs:789]

## Remote v2 path

Remote v2 attempt clone history、取 base instructions、先用 `compact_remote_history::trim_function_call_history_to_fit_context_window` 按 `HistoryItemGroup` 从尾部改写 oversized tool outputs，再 `for_prompt_annotated`，在 input 末尾追加 `ResponseItem::CompactionTrigger`，构造包含 model-visible tool specs 和 `parallel_tool_calls: true` 的 prompt，走普通 Responses stream。[E: codex-rs/core/src/compact_remote_v2_attempt.rs:39][E: codex-rs/core/src/compact_remote_v2_attempt.rs:42][E: codex-rs/core/src/compact_remote_v2_attempt.rs:78][E: codex-rs/core/src/compact_remote_history.rs:68]

Stream 完成时要求 exactly one `ResponseItem::Compaction`。[E: codex-rs/core/src/compact_remote_v2.rs:467]

`build_v2_compacted_history` 只保留 user messages（能解析成 `TurnItem::UserMessage` 或 `HookPrompt`）、可选 client-authored developer messages，以及非 descendant `MESSAGE`、非 `FINAL_ANSWER` 且不超过 10k tokens 的 inter-agent `AgentMessage`；按 `RETAINED_MESSAGE_TOKEN_BUDGET`（64_000）newest-first 截断，再追加 compaction output。[E: codex-rs/core/src/compact_remote_v2.rs:483][E: codex-rs/core/src/compact_remote_v2.rs:534][E: codex-rs/core/src/compact_remote_v2.rs:73]

install 时若是 `BeforeLastUserMessage` 才构造 initial context，再调用 local 的 `insert_initial_context_before_last_real_user_or_summary`；`CompactedItem.message` 写空字符串。[E: codex-rs/core/src/compact_remote_v2.rs:317][E: codex-rs/core/src/compact_remote_v2.rs:342]

## 设计动机与权衡

`DoNotInject` 与 `BeforeLastUserMessage { world_state, step_context }` 的分叉体现了 prompt-shape 权衡：pre-turn/manual compact 可以让下一轮 regular turn 重新注入 initial context；mid-turn compact 则必须在同一 follow-up loop 继续采样，所以要把基于当前 world-state 的 fresh initial context 插到最后一个 real user 或 non-final inter-agent message 前。[E: codex-rs/core/src/compact.rs:71][E: codex-rs/core/src/session/turn.rs:618][I]

TokenBudget compact 把“压缩”做成 reset：跳过 summarizer，直接装新窗口，但仍复用 compact hooks / `ContextCompaction` 事件，避免 hook 与 analytics 看到另一套生命周期。[E: codex-rs/core/src/compact_token_budget.rs:73][I]

Remote v2 只把 retained prompt messages 和 compaction item 作为 replacement history，是为了让普通 stream 的 compaction output 成为 history 边界，同时避免把 remote path 产生的 stale developer/context wrappers 原样带回。[E: codex-rs/core/src/compact_remote_v2.rs:483][E: codex-rs/core/src/compact_remote_v2.rs:508][I]

## gotcha

- `CompactedItem.message` 只有 local path 保存 summary text；remote v2 保存空 message，消费 rollout 时必须看 `replacement_history`。[E: codex-rs/core/src/compact.rs:386][E: codex-rs/core/src/compact_remote_v2.rs:343]
- Pre-turn auto compact 仍在 context updates 和新 user message 记录前运行。[E: codex-rs/core/src/session/turn.rs:183] 当前 pre-turn threshold 未显式计入随后注入的 context diffs 与 user input。[I]
- `insert_initial_context_before_last_real_user_or_summary` 优先插在最后一个真实 user message 或 non-final inter-agent message 前；`FINAL_ANSWER` agent message 不算 boundary。没有 real boundary 时才回退到 summary/compaction item/append。[E: codex-rs/core/src/compact.rs:606]
- `Feature::TokenBudget` 打开时，手动和 auto compact **都不会**再走 remote v2 / local summarizer。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/session/turn.rs:1408]
- compaction 丢掉的旧窗口细节可由 History notes 扩展回读；那是 backend 私有 store，不是这份 replacement history。

## Sources

- `codex-rs/core/src/compact.rs`
- `codex-rs/core/src/compact_token_budget.rs`
- `codex-rs/core/src/compact_remote_v2.rs`
- `codex-rs/core/src/compact_remote_v2_attempt.rs`
- `codex-rs/core/src/compact_remote_history.rs`
- `codex-rs/core/src/compact_model_fallback.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/lib.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [Turn 引擎](turn-engine.md) — auto compact 触发点位于 run turn loop。
- [Context manager](context-manager.md) — replacement history 与 `reference_context_item` 的 state 语义。
- [指令/prompt 装配](instruction-assembly.md) — mid-turn compaction 为什么要重新注入 initial context。
- [Session 生命周期](session-lifecycle.md) — `CompactTask` 如何作为 session task 运行。
- [Token budget](token-budget.md) — TokenBudget compact 短路。
- [History notes 扩展](history-notes.md) — compaction 之后如何回读私有 history/notes。
