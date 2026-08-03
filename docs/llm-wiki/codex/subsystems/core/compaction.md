---
id: subsys.core.compaction
title: 历史压缩与 compaction
kind: subsystem
tier: T2
source: [codex-rs/core/src/compact.rs, codex-rs/core/src/compact_remote.rs, codex-rs/core/src/compact_remote_request.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/compact_remote_v2_attempt.rs, codex-rs/core/src/compact_model_fallback.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs]
symbols: [InitialContextInjection, CompactTask, run_compact_task, run_inline_auto_compact_task, run_remote_compact_task, run_inline_remote_auto_compact_task, run_remote_compaction_request_v2, build_compacted_history, insert_initial_context_before_last_real_user_or_summary, process_compacted_history]
related: [subsys.core.turn-engine, subsys.core.context-manager, subsys.core.instruction-assembly, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 7750465934
---

> Compaction 是 Codex 在上下文接近或跨越模型限制时安装 replacement history 的机制。当前有三条实现路径：local summarization stream、remote `/responses/compact` 风格路径，以及 `RemoteCompactionV2` 下的普通 stream + `ResponseItem::CompactionTrigger` 路径；三条路径最终都构造 `CompactedItem` 并调用 `Session::replace_compacted_history`。[E: codex-rs/core/src/compact.rs:108][E: codex-rs/core/src/compact.rs:354][E: codex-rs/core/src/compact.rs:354][E: codex-rs/core/src/compact.rs:374][E: codex-rs/core/src/compact_remote.rs:252][E: codex-rs/core/src/compact_remote.rs:278][E: codex-rs/core/src/compact_remote.rs:284][E: codex-rs/core/src/compact_remote_v2.rs:248][E: codex-rs/core/src/compact_remote_v2.rs:303][E: codex-rs/core/src/compact_remote_v2.rs:309]

## 能回答的问题

- 手动 compact、pre-turn auto compact、model downshift compact 和 mid-turn compact 分别怎么触发？
- `InitialContextInjection::DoNotInject` 和 `BeforeLastUserMessage` 的语义是什么？
- local compaction、remote compaction 和 remote compaction v2 的 prompt/history 处理差异是什么？
- remote compaction 为什么过滤 replacement history，而 v2 为什么只保留部分 message 再追加 compaction item？
- compaction 后 `reference_context_item`、world-state baseline、`CompactedItem` 和 auto-compact window ids 如何更新？

## 职责边界

`compact.rs` 负责 local summarization、summary history 构造、recent user message 截断和 initial context 插入；`compact_remote.rs` 负责 provider remote compaction request、replacement history 过滤和 tool output 改写；`compact_remote_v2.rs` 负责 `ResponseItem::CompactionTrigger` stream 路径；`tasks/compact.rs` 是手动 compact session task 的路径选择入口；`session/turn.rs` 在 pre-sampling、model change/downshift 和 mid-turn follow-up loop 中触发 auto compact。[E: codex-rs/core/src/compact.rs:241][E: codex-rs/core/src/compact_remote.rs:189][E: codex-rs/core/src/compact_remote_v2.rs:204][E: codex-rs/core/src/tasks/compact.rs:27][E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:371][E: codex-rs/core/src/session/turn.rs:1051] 普通 turn sampling 的 tool dispatch 只被 remote compaction 复用为 model-visible specs，不归 compaction 自身负责。[I]

## 关键 crate/文件

- `codex-rs/core/src/compact.rs`: local path、`InitialContextInjection`、summary text 构造、`build_compacted_history`、`insert_initial_context_before_last_real_user_or_summary` 和 stream drain。[E: codex-rs/core/src/compact.rs:55][E: codex-rs/core/src/compact.rs:68][E: codex-rs/core/src/compact.rs:241][E: codex-rs/core/src/compact.rs:351][E: codex-rs/core/src/compact.rs:565][E: codex-rs/core/src/compact.rs:622][E: codex-rs/core/src/compact.rs:698]
- `compact_remote.rs` 管 lifecycle、hook、fallback、history install/filter；v1 request/prompt building 已抽到 `compact_remote_request.rs` 的 `RemoteCompactAttempt`。[E: codex-rs/core/src/compact_remote.rs:50][E: codex-rs/core/src/compact_remote.rs:112][E: codex-rs/core/src/compact_remote.rs:189][E: codex-rs/core/src/compact_remote_request.rs:18][E: codex-rs/core/src/compact_remote_request.rs:23]
- `compact_remote_v2.rs` 管 lifecycle/install 与 stream parser；v2 history/prompt/trigger/session attempt 抽到 `compact_remote_v2_attempt.rs`，并在成功 response 后发 `RawResponseCompleted` usage event。[E: codex-rs/core/src/compact_remote_v2.rs:51][E: codex-rs/core/src/compact_remote_v2.rs:204][E: codex-rs/core/src/compact_remote_v2_attempt.rs:21][E: codex-rs/core/src/compact_remote_v2_attempt.rs:68][E: codex-rs/core/src/compact_remote_v2_attempt.rs:118]
- `codex-rs/core/src/tasks/compact.rs`: `CompactTask::run` 基于 provider 是否支持 remote compaction 和 `Feature::RemoteCompactionV2` 选择 `remote_v2`、`remote` 或 `local` telemetry/path。[E: codex-rs/core/src/tasks/compact.rs:34][E: codex-rs/core/src/tasks/compact.rs:32][E: codex-rs/core/src/tasks/compact.rs:44][E: codex-rs/core/src/tasks/compact.rs:51][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:66][E: codex-rs/core/src/tasks/compact.rs:76]
- `codex-rs/core/src/session/turn.rs`: auto compact trigger points；pre-turn 在 context updates/user input 记录前运行，mid-turn 在 token limit reached 且仍需 follow-up 时运行。[E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:212][E: codex-rs/core/src/session/turn.rs:371][E: codex-rs/core/src/session/turn.rs:1005][E: codex-rs/core/src/session/turn.rs:441]

## 数据模型

`InitialContextInjection` 的两个值控制 replacement history 是否包含 fresh initial context。`DoNotInject` 用于 pre-turn/manual compaction：replacement history 不带 initial context，`reference_context_item` 设为 `None`；`BeforeLastUserMessage(Arc<WorldState>)` 用于 mid-turn compaction：用同一个 world-state baseline 渲染 initial context，再插入到最后一个真实 user message 或 summary/compaction fallback 之前，`reference_context_item` 设为当前 turn context。[E: codex-rs/core/src/compact.rs:68][E: codex-rs/core/src/compact.rs:68][E: codex-rs/core/src/compact.rs:73][E: codex-rs/core/src/compact.rs:86][E: codex-rs/core/src/compact.rs:80][E: codex-rs/core/src/compact.rs:81][E: codex-rs/core/src/compact.rs:102][E: codex-rs/core/src/compact.rs:362][E: codex-rs/core/src/compact.rs:368][E: codex-rs/core/src/compact.rs:369][E: codex-rs/core/src/compact.rs:350]

Local `CompactedItem` 保存 `message: summary_text`、`replacement_history` 和新的 window number / first-window / previous-window / current-window ids；remote v1/v2 的 `CompactedItem.message` 是空字符串，但同样保存 replacement history 和 window metadata。[E: codex-rs/core/src/compact.rs:354][E: codex-rs/core/src/compact.rs:355][E: codex-rs/core/src/compact.rs:355][E: codex-rs/core/src/compact.rs:358][E: codex-rs/core/src/compact.rs:358][E: codex-rs/core/src/compact.rs:358][E: codex-rs/core/src/compact.rs:360][E: codex-rs/core/src/compact_remote.rs:278][E: codex-rs/core/src/compact_remote.rs:289][E: codex-rs/core/src/compact_remote.rs:278][E: codex-rs/core/src/compact_remote_v2.rs:303][E: codex-rs/core/src/compact_remote_v2.rs:314][E: codex-rs/core/src/compact_remote_v2.rs:306]

`build_compacted_history` 按 token budget 从最近 user messages 反向挑选，必要时截断最老的保留 message，然后把 summary 作为 role=`user` 的 `ResponseItem::Message` 压到末尾。[E: codex-rs/core/src/compact.rs:622][E: codex-rs/core/src/compact.rs:641][E: codex-rs/core/src/compact.rs:644][E: codex-rs/core/src/compact.rs:653][E: codex-rs/core/src/compact.rs:664][E: codex-rs/core/src/compact.rs:667][E: codex-rs/core/src/compact.rs:687]

## 控制流

1. 手动 compact: `session/handlers.rs::compact` 创建默认 turn context，然后 `spawn_task(..., CompactTask)`。[E: codex-rs/core/src/session/handlers.rs:455][E: codex-rs/core/src/session/handlers.rs:456][E: codex-rs/core/src/session/handlers.rs:458]
2. `CompactTask::run` 选择 remote v2、remote v1 或 local；local path 会把 config 中的 `compact_prompt` 或默认 `SUMMARIZATION_PROMPT` 合成为 `UserInput::Text`。[E: codex-rs/core/src/tasks/compact.rs:34][E: codex-rs/core/src/tasks/compact.rs:44][E: codex-rs/core/src/tasks/compact.rs:51][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:66][E: codex-rs/core/src/tasks/compact.rs:71]
3. Pre-turn auto compact: `run_turn` 在 context updates 和新 user input 记录前调用 `run_pre_sampling_compact`；该函数先尝试 previous-model compact，再按 `context_window_token_status` 判断是否以 `DoNotInject` 运行 pre-turn compact。[E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:212][E: codex-rs/core/src/session/turn.rs:983][E: codex-rs/core/src/session/turn.rs:950][E: codex-rs/core/src/session/turn.rs:991][E: codex-rs/core/src/session/turn.rs:995][E: codex-rs/core/src/session/turn.rs:1005]
4. Model-change/downshift compact: previous model compaction 在 compaction compatibility hash 改变时触发；否则只有 active context tokens 超过新模型限制、模型 slug 变化、旧窗口大于新窗口时才以 `ModelDownshift` 触发。[E: codex-rs/core/src/session/turn.rs:1016][E: codex-rs/core/src/session/turn.rs:1060][E: codex-rs/core/src/session/turn.rs:1071][E: codex-rs/core/src/session/turn.rs:1101][E: codex-rs/core/src/session/turn.rs:1116][E: codex-rs/core/src/session/turn.rs:1117][E: codex-rs/core/src/session/turn.rs:1135][E: codex-rs/core/src/session/turn.rs:1136]
5. Mid-turn auto compact: sampling 后如果仍需 follow-up 且存在 `new_context` 请求或 token limit reached，turn loop 调用 `run_auto_compact(..., BeforeLastUserMessage(Arc::clone(&world_state)), ContextLimit, MidTurn)`，成功后继续 loop。[E: codex-rs/core/src/session/turn.rs:383][E: codex-rs/core/src/session/turn.rs:384][E: codex-rs/core/src/session/turn.rs:422][E: codex-rs/core/src/session/turn.rs:423][E: codex-rs/core/src/session/turn.rs:431][E: codex-rs/core/src/session/turn.rs:395][E: codex-rs/core/src/session/turn.rs:440][E: codex-rs/core/src/session/turn.rs:441][E: codex-rs/core/src/session/turn.rs:456]
6. `run_auto_compact` 对 auto paths 同样基于 provider remote support 和 `Feature::RemoteCompactionV2` 选择 remote v2、remote v1 或 local。[E: codex-rs/core/src/session/turn.rs:1149][E: codex-rs/core/src/session/turn.rs:1172][E: codex-rs/core/src/session/turn.rs:1176][E: codex-rs/core/src/session/turn.rs:1183][E: codex-rs/core/src/session/turn.rs:1200][E: codex-rs/core/src/session/turn.rs:1216]

## Local path

Local compaction clone 当前 history，把 synthesized prompt input 记录进去，再用 `Prompt { input: history.for_prompt(...), base_instructions: sess.get_base_instructions() }` 走普通 streaming completion；若 prompt 超上下文窗口且 item 数大于 1，会删除最早 history item 并重试。[E: codex-rs/core/src/compact.rs:251][E: codex-rs/core/src/compact.rs:253][E: codex-rs/core/src/compact.rs:254][E: codex-rs/core/src/compact.rs:278][E: codex-rs/core/src/compact.rs:279][E: codex-rs/core/src/compact.rs:280][E: codex-rs/core/src/compact.rs:286][E: codex-rs/core/src/compact.rs:316]

成功后 local path 从 session history 取最后 assistant message 作为 summary suffix，拼上 `SUMMARY_PREFIX`，收集非 summary user messages，构建 replacement history，必要时插入 initial context，然后 advance auto-compact window number/ids 并安装 replacement history。[E: codex-rs/core/src/compact.rs:348][E: codex-rs/core/src/compact.rs:350][E: codex-rs/core/src/compact.rs:351][E: codex-rs/core/src/compact.rs:352][E: codex-rs/core/src/compact.rs:354][E: codex-rs/core/src/compact.rs:360][E: codex-rs/core/src/compact.rs:362][E: codex-rs/core/src/compact.rs:374]

Local stream drain 会记录 `OutputItemDone` 到 conversation history、更新 server reasoning/rate limit/token usage，并在 `response.completed` 后返回。[E: codex-rs/core/src/compact.rs:698][E: codex-rs/core/src/compact.rs:705][E: codex-rs/core/src/compact.rs:727][E: codex-rs/core/src/compact.rs:728][E: codex-rs/core/src/compact.rs:731][E: codex-rs/core/src/compact.rs:734][E: codex-rs/core/src/compact.rs:752]

## Remote paths

Remote v1 attempt clone history、取 base instructions、先用 `trim_function_call_history_to_fit_context_window` 改写尾部 tool outputs，再构造包含 model-visible tool specs 和 parallel-tool-calls flag 的 prompt，调用 compact endpoint。[E: codex-rs/core/src/compact_remote_request.rs:23][E: codex-rs/core/src/compact_remote_request.rs:32][E: codex-rs/core/src/compact_remote_request.rs:34][E: codex-rs/core/src/compact_remote_request.rs:61][E: codex-rs/core/src/compact_remote_request.rs:63][E: codex-rs/core/src/compact_remote_request.rs:77]

Remote v1/v2 共用 `process_compacted_history`：如果是 `BeforeLastUserMessage` 才构造 initial context；随后先 `retain(should_keep_compacted_history_item)`，再调用 local 的 insertion helper。[E: codex-rs/core/src/compact_remote.rs:302][E: codex-rs/core/src/compact_remote.rs:310][E: codex-rs/core/src/compact_remote.rs:311][E: codex-rs/core/src/compact_remote.rs:313][E: codex-rs/core/src/compact_remote.rs:311]

Remote history filter 会丢弃 developer messages、非 real user/hook user messages、reasoning、tool calls、tool outputs、web/image outputs 和 other；保留 assistant messages、agent messages、compaction/context-compaction items，以及能解析成 `TurnItem::UserMessage` 或 `HookPrompt` 的 user messages。[E: codex-rs/core/src/compact_remote.rs:336][E: codex-rs/core/src/compact_remote.rs:338][E: codex-rs/core/src/compact_remote.rs:339][E: codex-rs/core/src/compact_remote.rs:340][E: codex-rs/core/src/compact_remote.rs:345][E: codex-rs/core/src/compact_remote.rs:347][E: codex-rs/core/src/compact_remote.rs:348][E: codex-rs/core/src/compact_remote.rs:351]

Remote v2 在 prompt input 末尾追加 `ResponseItem::CompactionTrigger`，stream 完成时要求 exactly one `ResponseItem::Compaction`。replacement history 可保留 user/developer/system messages，也保留非 `FINAL_ANSWER` 且不超过 10k tokens 的 inter-agent `AgentMessage`；shared filter 后按 64k newest-first retained-message budget 截断，最多截断一个跨界 item，再追加 compaction output。[E: codex-rs/core/src/compact_remote_v2.rs:248][E: codex-rs/core/src/compact_remote_v2.rs:250][E: codex-rs/core/src/compact_remote_v2.rs:423][E: codex-rs/core/src/compact_remote_v2.rs:442][E: codex-rs/core/src/compact_remote_v2.rs:446][E: codex-rs/core/src/compact_remote_v2.rs:458][E: codex-rs/core/src/compact_remote_v2.rs:462][E: codex-rs/core/src/compact_remote_v2.rs:469][E: codex-rs/core/src/compact_remote_v2.rs:470][E: codex-rs/core/src/compact_remote_v2.rs:477][E: codex-rs/core/src/compact_remote_v2.rs:491][E: codex-rs/core/src/compact_remote_v2.rs:497][E: codex-rs/core/src/compact_remote_v2.rs:506]

## 设计动机与权衡

`DoNotInject` 与 `BeforeLastUserMessage(Arc<WorldState>)` 的分叉体现了 prompt-shape 权衡：pre-turn/manual compact 可以让下一轮 regular turn 重新注入 initial context；mid-turn compact 则必须在同一 follow-up loop 继续采样，所以要把基于当前 world-state 的 fresh initial context 插到最后一个 real user 或 non-final inter-agent message 前。[E: codex-rs/core/src/compact.rs:80][E: codex-rs/core/src/compact.rs:81][E: codex-rs/core/src/compact.rs:572][E: codex-rs/core/src/compact.rs:576][E: codex-rs/core/src/compact.rs:579][E: codex-rs/core/src/session/turn.rs:395][I]

Remote v2 只把 retained prompt messages 和 compaction item 作为 replacement history，是为了让普通 stream 的 compaction output 成为 history 边界，同时避免把 remote path 产生的 stale developer/context wrappers 原样带回。[E: codex-rs/core/src/compact_remote_v2.rs:442][E: codex-rs/core/src/compact_remote_v2.rs:446][E: codex-rs/core/src/compact_remote_v2.rs:458][I]

## gotcha

- `CompactedItem.message` 只有 local path 保存 summary text；remote v1/v2 都保存空 message，消费 rollout 时必须看 `replacement_history`。[E: codex-rs/core/src/compact.rs:355][E: codex-rs/core/src/compact_remote.rs:289][E: codex-rs/core/src/compact_remote_v2.rs:314]
- Pre-turn auto compact 仍在 context updates 和新 user message 记录前运行。[E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:212][E: codex-rs/core/src/session/turn.rs:233] 当前 pre-turn threshold 未显式计入随后注入的 context diffs 与 user input。[I]
- `insert_initial_context_before_last_real_user_or_summary` 优先插在最后一个真实 user message或 non-final inter-agent message 前；`FINAL_ANSWER` agent message 不算 boundary。没有 real boundary 时才回退到 summary/compaction item/append。[E: codex-rs/core/src/compact.rs:565][E: codex-rs/core/src/compact.rs:572][E: codex-rs/core/src/compact.rs:576][E: codex-rs/core/src/compact.rs:579][E: codex-rs/core/src/compact.rs:605][E: codex-rs/core/src/compact.rs:613]
- Remote v2 stream 如果没有 `response.completed` 或 compaction output 数量不是 1，会返回错误；这和 remote v1 直接接收 `compact_conversation_history` replacement history 不同。[E: codex-rs/core/src/compact_remote_v2.rs:417][E: codex-rs/core/src/compact_remote_v2.rs:423]

## Sources

- `codex-rs/core/src/compact.rs`
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
