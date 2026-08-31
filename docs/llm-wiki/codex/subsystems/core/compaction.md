---
id: subsys.core.compaction
title: 历史压缩与 compaction
kind: subsystem
tier: T2
source: [codex-rs/core/src/compact.rs, codex-rs/core/src/compact_token_budget.rs, codex-rs/core/src/compact_remote.rs, codex-rs/core/src/compact_remote_request.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/compact_remote_v2_attempt.rs, codex-rs/core/src/compact_model_fallback.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs]
symbols: [InitialContextInjection, CompactTask, run_compact_task, run_inline_auto_compact_task, run_auto_compact, build_compacted_history, insert_initial_context_before_last_real_user_or_summary]
related: [subsys.core.turn-engine, subsys.core.context-manager, subsys.core.instruction-assembly, subsys.core.session-lifecycle, subsys.core.token-budget, subsys.core.history-notes]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Compaction 是 Codex 在上下文接近或跨越模型限制时安装 replacement history 的机制。当前有四条实现路径：`Feature::TokenBudget` 短路（不走 summarizer）、local summarization stream、remote `/responses/compact` 风格路径，以及 `RemoteCompactionV2` 下的普通 stream + `ResponseItem::CompactionTrigger` 路径；后三条最终都构造 `CompactedItem` 并调用 `Session::replace_compacted_history`。[E: codex-rs/core/src/session/turn.rs:1210][E: codex-rs/core/src/compact.rs:116][E: codex-rs/core/src/session/mod.rs:3640]

## 能回答的问题

- 手动 compact、pre-turn auto compact、model downshift compact 和 mid-turn compact 分别怎么触发？
- `InitialContextInjection::DoNotInject` 和 `BeforeLastUserMessage { world_state, step_context }` 的语义是什么？
- TokenBudget compact 与 local / remote / remote v2 的差异是什么？
- remote compaction 为什么过滤 replacement history，而 v2 为什么只保留部分 message 再追加 compaction item？
- compaction 后 `reference_context_item`、world-state baseline、`CompactedItem` 和 auto-compact window ids 如何更新？

## 职责边界

`compact.rs` 负责 local summarization、summary history 构造、recent user message 截断和 initial context 插入；`compact_token_budget.rs` 在 TokenBudget feature 下跳过模型/server summarization，但仍走 compact hooks 与 `ContextCompaction` lifecycle；`compact_remote.rs` 负责 provider remote compaction request、replacement history 过滤和 tool output 改写；`compact_remote_v2.rs` 负责 `ResponseItem::CompactionTrigger` stream 路径；`tasks/compact.rs` 是手动 compact session task 的路径选择入口；`session/turn.rs` 在 pre-sampling、model change/downshift 和 mid-turn follow-up loop 中触发 auto compact。[E: codex-rs/core/src/compact.rs:245][E: codex-rs/core/src/compact_token_budget.rs:26][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/session/turn.rs:172] 普通 turn sampling 的 tool dispatch 只被 remote compaction 复用为 model-visible specs，不归 compaction 自身负责。[I]

## 关键 crate/文件

- `codex-rs/core/src/compact.rs`: local path、`InitialContextInjection`、summary text 构造、`build_compacted_history`、`insert_initial_context_before_last_real_user_or_summary` 和 stream drain。[E: codex-rs/core/src/compact.rs:73][E: codex-rs/core/src/compact.rs:245][E: codex-rs/core/src/compact.rs:586][E: codex-rs/core/src/compact.rs:644]
- `compact_token_budget.rs`: TokenBudget 手动/auto compact；安装 fresh context window，不调用 summarizer。[E: codex-rs/core/src/compact_token_budget.rs:26]
- `compact_remote.rs` 管 lifecycle、hook、fallback、history install/filter；v1 request/prompt building 在 `compact_remote_request.rs` 的 `RemoteCompactAttempt`。[E: codex-rs/core/src/compact_remote.rs:313]
- `compact_remote_v2.rs` 管 lifecycle/install 与 retained-message filter；v2 history/prompt/trigger/session attempt 抽到 `compact_remote_v2_attempt.rs`。[E: codex-rs/core/src/compact_remote_v2.rs:77]
- `codex-rs/core/src/tasks/compact.rs`: `CompactTask::run` 先看 TokenBudget，再基于 provider remote support 和 `Feature::RemoteCompactionV2` 选择 path。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:41]
- `codex-rs/core/src/session/turn.rs`: auto compact trigger points；pre-turn 在 context updates/user input 记录前运行，mid-turn 在 token limit reached 或 `new_context` 且仍需 follow-up 时运行。[E: codex-rs/core/src/session/turn.rs:172][E: codex-rs/core/src/session/turn.rs:461]

## 数据模型

`InitialContextInjection` 的两个值控制 replacement history 是否包含 fresh initial context。`DoNotInject` 用于 pre-turn/manual compaction：replacement history 不带 initial context，`reference_context_item` 设为 `None`；`BeforeLastUserMessage { world_state, step_context }` 用于 mid-turn compaction：用同一个 world-state baseline 渲染 initial context，再插入到最后一个真实 user message 或 summary/compaction fallback 之前，`reference_context_item` 设为当前 turn context。[E: codex-rs/core/src/compact.rs:73][E: codex-rs/core/src/compact.rs:91][E: codex-rs/core/src/compact.rs:373]

Local `CompactedItem` 保存 `message: summary_text`、`replacement_history` 和新的 window number / first-window / previous-window / current-window ids；remote v1/v2 的 `CompactedItem.message` 是空字符串，但同样保存 replacement history 和 window metadata。[E: codex-rs/core/src/compact.rs:383][E: codex-rs/core/src/compact_remote.rs:300]

`build_compacted_history` 按 token budget 从最近 user messages 反向挑选，必要时截断最老的保留 message，然后把 summary 作为 role=`user` 的 `ResponseItem::Message` 压到末尾。user message 上限是 `COMPACT_USER_MESSAGE_MAX_TOKENS`（20_000）。[E: codex-rs/core/src/compact.rs:62][E: codex-rs/core/src/compact.rs:644]

## 控制流

1. 手动 compact: `session/handlers.rs::compact` 创建默认 turn context，然后 `spawn_task(..., CompactTask)`。[E: codex-rs/core/src/session/handlers.rs:246][E: codex-rs/core/src/session/handlers.rs:251]
2. `CompactTask::run` 先看 `Feature::TokenBudget`；否则选择 remote v2、remote v1 或 local。local path 会把 config 中的 `compact_prompt` 或默认 `SUMMARIZATION_PROMPT` 合成为 `UserInput::Text`。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:41][E: codex-rs/core/src/tasks/compact.rs:66]
3. Pre-turn auto compact: `run_turn` 在 context updates 和新 user input 记录前调用 `run_pre_sampling_compact`；该函数先尝试 previous-model compact，再按 `context_window_token_status` 判断是否以 `DoNotInject` 运行 pre-turn compact。[E: codex-rs/core/src/session/turn.rs:172][E: codex-rs/core/src/session/turn.rs:1033][E: codex-rs/core/src/session/turn.rs:1045]
4. Mid-turn auto compact: sampling 后如果仍需 follow-up 且存在 `new_context` 请求或 token limit reached，turn loop 调用 `run_auto_compact(..., BeforeLastUserMessage { world_state, step_context }, ContextLimit, MidTurn)`，成功后继续 loop。[E: codex-rs/core/src/session/turn.rs:461][E: codex-rs/core/src/session/turn.rs:474]
5. `run_auto_compact` 对 auto paths：TokenBudget 开则短路；否则同样基于 provider remote support 和 `Feature::RemoteCompactionV2` 选择 remote v2、remote v1 或 local。[E: codex-rs/core/src/session/turn.rs:1210][E: codex-rs/core/src/session/turn.rs:1222]

## Local path

Local compaction clone 当前 history，把 synthesized prompt input 记录进去，再用 `Prompt { input: history.for_prompt(...), base_instructions: sess.get_prompt_base_instructions() }` 走普通 streaming completion；若 prompt 超上下文窗口且 item 数大于 1，会删除最早 history item 并重试。[E: codex-rs/core/src/compact.rs:257][E: codex-rs/core/src/compact.rs:282][E: codex-rs/core/src/compact.rs:314]

成功后 local path 从 session history 取最后 assistant message 作为 summary suffix，拼上 `SUMMARY_PREFIX`，收集非 summary user messages，构建 replacement history，必要时插入 initial context，然后 advance auto-compact window number/ids 并安装 replacement history，再 `recompute_token_usage`。[E: codex-rs/core/src/compact.rs:352][E: codex-rs/core/src/compact.rs:379][E: codex-rs/core/src/compact.rs:390]

Local stream drain 会记录 `OutputItemDone` 到 conversation history、更新 server reasoning/rate limit/token usage，并在 `response.completed` 后返回。[E: codex-rs/core/src/compact.rs:735]

## Remote paths

Remote v1 attempt clone history、取 base instructions、先用 `trim_function_call_history_to_fit_context_window` 改写尾部 tool outputs，再构造包含 model-visible tool specs 和 parallel-tool-calls flag 的 prompt，调用 compact endpoint。[E: codex-rs/core/src/compact_remote_request.rs:23]

Remote v1/v2 共用 `process_compacted_history`：如果是 `BeforeLastUserMessage` 才构造 initial context；随后先 `retain(should_keep_compacted_history_item)`，再调用 local 的 insertion helper。[E: codex-rs/core/src/compact_remote.rs:313]

Remote history filter 会丢弃 developer messages、非 real user/hook user messages、reasoning、tool calls、tool outputs、web/image outputs 和 other；保留 assistant messages、agent messages、compaction/context-compaction items，以及能解析成 `TurnItem::UserMessage` 或 `HookPrompt` 的 user messages。[E: codex-rs/core/src/compact_remote.rs:372]

Remote v2 在 prompt input 末尾追加 `ResponseItem::CompactionTrigger`，stream 完成时要求 exactly one `ResponseItem::Compaction`。replacement history 可保留 user/developer/system messages，也保留非 descendant `MESSAGE`、非 `FINAL_ANSWER` 且不超过 10k tokens 的 inter-agent `AgentMessage`；shared filter 后按 64k newest-first retained-message budget 截断，再追加 compaction output。[E: codex-rs/core/src/compact_remote_v2.rs:77][E: codex-rs/core/src/compact_remote_v2.rs:538]

## 设计动机与权衡

`DoNotInject` 与 `BeforeLastUserMessage { world_state, step_context }` 的分叉体现了 prompt-shape 权衡：pre-turn/manual compact 可以让下一轮 regular turn 重新注入 initial context；mid-turn compact 则必须在同一 follow-up loop 继续采样，所以要把基于当前 world-state 的 fresh initial context 插到最后一个 real user 或 non-final inter-agent message 前。[E: codex-rs/core/src/compact.rs:73][E: codex-rs/core/src/session/turn.rs:479][I]

TokenBudget compact 把“压缩”做成 reset：跳过 summarizer，直接装新窗口，但仍复用 compact hooks / `ContextCompaction` 事件，避免 hook 与 analytics 看到另一套生命周期。[E: codex-rs/core/src/compact_token_budget.rs:26][I]

Remote v2 只把 retained prompt messages 和 compaction item 作为 replacement history，是为了让普通 stream 的 compaction output 成为 history 边界，同时避免把 remote path 产生的 stale developer/context wrappers 原样带回。[E: codex-rs/core/src/compact_remote_v2.rs:538][I]

## gotcha

- `CompactedItem.message` 只有 local path 保存 summary text；remote v1/v2 都保存空 message，消费 rollout 时必须看 `replacement_history`。[E: codex-rs/core/src/compact.rs:383][E: codex-rs/core/src/compact_remote.rs:300]
- Pre-turn auto compact 仍在 context updates 和新 user message 记录前运行。[E: codex-rs/core/src/session/turn.rs:172] 当前 pre-turn threshold 未显式计入随后注入的 context diffs 与 user input。[I]
- `insert_initial_context_before_last_real_user_or_summary` 优先插在最后一个真实 user message 或 non-final inter-agent message 前；`FINAL_ANSWER` agent message 不算 boundary。没有 real boundary 时才回退到 summary/compaction item/append。[E: codex-rs/core/src/compact.rs:593]
- `Feature::TokenBudget` 打开时，手动和 auto compact **都不会**再走 remote v2/v1/local summarizer。[E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/session/turn.rs:1210]
- compaction 丢掉的旧窗口细节可由 History notes 扩展回读；那是 backend 私有 store，不是这份 replacement history。

## Sources

- `codex-rs/core/src/compact.rs`
- `codex-rs/core/src/compact_token_budget.rs`
- `codex-rs/core/src/compact_remote.rs`
- `codex-rs/core/src/compact_remote_request.rs`
- `codex-rs/core/src/compact_remote_v2.rs`
- `codex-rs/core/src/compact_remote_v2_attempt.rs`
- `codex-rs/core/src/compact_model_fallback.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`

## 相关

- [Turn 引擎](turn-engine.md) — auto compact 触发点位于 run turn loop。
- [Context manager](context-manager.md) — replacement history 与 `reference_context_item` 的 state 语义。
- [指令/prompt 装配](instruction-assembly.md) — mid-turn compaction 为什么要重新注入 initial context。
- [Session 生命周期](session-lifecycle.md) — `CompactTask` 如何作为 session task 运行。
- [Token budget](token-budget.md) — TokenBudget compact 短路。
- [History notes 扩展](history-notes.md) — compaction 之后如何回读私有 history/notes。
