---
id: subsys.core.compaction
title: 历史压缩与 compaction
kind: subsystem
tier: T2
source: [codex-rs/core/src/compact.rs, codex-rs/core/src/compact_remote.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs]
symbols: [InitialContextInjection, CompactTask, run_compact_task, run_inline_auto_compact_task, run_remote_compact_task, run_inline_remote_auto_compact_task, run_remote_compaction_request_v2, build_compacted_history, insert_initial_context_before_last_real_user_or_summary, process_compacted_history]
related: [subsys.core.turn-engine, subsys.core.context-manager, subsys.core.instruction-assembly, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 5670360009
---

> Compaction 是 Codex 在上下文接近或跨越模型限制时安装 replacement history 的机制。当前有三条实现路径：local summarization stream、remote `/responses/compact` 风格路径，以及 `RemoteCompactionV2` 下的普通 stream + `ResponseItem::CompactionTrigger` 路径；三条路径最终都构造 `CompactedItem` 并调用 `Session::replace_compacted_history`。[E: codex-rs/core/src/compact.rs:69][E: codex-rs/core/src/compact.rs:304][E: codex-rs/core/src/compact.rs:319][E: codex-rs/core/src/compact.rs:324][E: codex-rs/core/src/compact_remote.rs:240][E: codex-rs/core/src/compact_remote.rs:274][E: codex-rs/core/src/compact_remote.rs:286][E: codex-rs/core/src/compact_remote_v2.rs:233][E: codex-rs/core/src/compact_remote_v2.rs:307][E: codex-rs/core/src/compact_remote_v2.rs:316]

## 能回答的问题

- 手动 compact、pre-turn auto compact、model downshift compact 和 mid-turn compact 分别怎么触发？
- `InitialContextInjection::DoNotInject` 和 `BeforeLastUserMessage` 的语义是什么？
- local compaction、remote compaction 和 remote compaction v2 的 prompt/history 处理差异是什么？
- remote compaction 为什么过滤 replacement history，而 v2 为什么只保留部分 message 再追加 compaction item？
- compaction 后 `reference_context_item`、`CompactedItem` 和 auto-compact window id 如何更新？

## 职责边界

`compact.rs` 负责 local summarization、summary history 构造、recent user message 截断和 initial context 插入；`compact_remote.rs` 负责 provider remote compaction request、replacement history 过滤和 tool output 改写；`compact_remote_v2.rs` 负责 `ResponseItem::CompactionTrigger` stream 路径；`tasks/compact.rs` 是手动 compact session task 的路径选择入口；`session/turn.rs` 在 pre-sampling、model change/downshift 和 mid-turn follow-up loop 中触发 auto compact。[E: codex-rs/core/src/compact.rs:202][E: codex-rs/core/src/compact_remote.rs:169][E: codex-rs/core/src/compact_remote_v2.rs:179][E: codex-rs/core/src/tasks/compact.rs:24][E: codex-rs/core/src/session/turn.rs:154][E: codex-rs/core/src/session/turn.rs:305][E: codex-rs/core/src/session/turn.rs:833] 普通 turn sampling 的 tool dispatch 只被 remote compaction 复用为 model-visible specs，不归 compaction 自身负责。[I]

## 关键 crate/文件

- `codex-rs/core/src/compact.rs`: local path、`InitialContextInjection`、summary text 构造、`build_compacted_history`、`insert_initial_context_before_last_real_user_or_summary` 和 stream drain。[E: codex-rs/core/src/compact.rs:50][E: codex-rs/core/src/compact.rs:64][E: codex-rs/core/src/compact.rs:202][E: codex-rs/core/src/compact.rs:301][E: codex-rs/core/src/compact.rs:493][E: codex-rs/core/src/compact.rs:540][E: codex-rs/core/src/compact.rs:612]
- `codex-rs/core/src/compact_remote.rs`: remote v1 path；它把 current history 转 prompt，构建 tool router specs，调用 `model_client.compact_conversation_history`，再过滤 provider 返回的 history。[E: codex-rs/core/src/compact_remote.rs:189][E: codex-rs/core/src/compact_remote.rs:219][E: codex-rs/core/src/compact_remote.rs:220][E: codex-rs/core/src/compact_remote.rs:226][E: codex-rs/core/src/compact_remote.rs:240][E: codex-rs/core/src/compact_remote.rs:295]
- `codex-rs/core/src/compact_remote_v2.rs`: remote v2 path；它往 prompt input 追加 `ResponseItem::CompactionTrigger`，普通 stream 中必须产出且只产出一个 `ResponseItem::Compaction`，再把 retained prompt messages 与 compaction output 组成 replacement history。[E: codex-rs/core/src/compact_remote_v2.rs:227][E: codex-rs/core/src/compact_remote_v2.rs:233][E: codex-rs/core/src/compact_remote_v2.rs:380][E: codex-rs/core/src/compact_remote_v2.rs:390][E: codex-rs/core/src/compact_remote_v2.rs:415][E: codex-rs/core/src/compact_remote_v2.rs:430]
- `codex-rs/core/src/tasks/compact.rs`: `CompactTask::run` 基于 provider 是否支持 remote compaction 和 `Feature::RemoteCompactionV2` 选择 `remote_v2`、`remote` 或 `local` telemetry/path。[E: codex-rs/core/src/tasks/compact.rs:31][E: codex-rs/core/src/tasks/compact.rs:32][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:43][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:68]
- `codex-rs/core/src/session/turn.rs`: auto compact trigger points；pre-turn 在 context updates/user input 记录前运行，mid-turn 在 token limit reached 且仍需 follow-up 时运行。[E: codex-rs/core/src/session/turn.rs:150][E: codex-rs/core/src/session/turn.rs:154][E: codex-rs/core/src/session/turn.rs:162][E: codex-rs/core/src/session/turn.rs:305][E: codex-rs/core/src/session/turn.rs:310][E: codex-rs/core/src/session/turn.rs:312]

## 数据模型

`InitialContextInjection` 的两个值控制 replacement history 是否包含 fresh initial context。`DoNotInject` 用于 pre-turn/manual compaction：replacement history 不带 initial context，`reference_context_item` 设为 `None`；`BeforeLastUserMessage` 用于 mid-turn compaction：先重建 initial context，再插入到最后一个真实 user message 或 summary/compaction fallback 之前，`reference_context_item` 设为当前 turn context。[E: codex-rs/core/src/compact.rs:54][E: codex-rs/core/src/compact.rs:64][E: codex-rs/core/src/compact.rs:65][E: codex-rs/core/src/compact.rs:66][E: codex-rs/core/src/compact.rs:307][E: codex-rs/core/src/compact.rs:311][E: codex-rs/core/src/compact.rs:315][E: codex-rs/core/src/compact.rs:316][E: codex-rs/core/src/compact.rs:317]

Local `CompactedItem` 保存 `message: summary_text`、`replacement_history` 和新的 window id；remote v1/v2 的 `CompactedItem.message` 是空字符串，但同样保存 replacement history 和 window id。[E: codex-rs/core/src/compact.rs:319][E: codex-rs/core/src/compact.rs:320][E: codex-rs/core/src/compact.rs:321][E: codex-rs/core/src/compact.rs:322][E: codex-rs/core/src/compact_remote.rs:274][E: codex-rs/core/src/compact_remote.rs:275][E: codex-rs/core/src/compact_remote_v2.rs:307][E: codex-rs/core/src/compact_remote_v2.rs:308]

`build_compacted_history` 按 token budget 从最近 user messages 反向挑选，必要时截断最老的保留 message，然后把 summary 作为 role=`user` 的 `ResponseItem::Message` 压到末尾。[E: codex-rs/core/src/compact.rs:540][E: codex-rs/core/src/compact.rs:559][E: codex-rs/core/src/compact.rs:562][E: codex-rs/core/src/compact.rs:571][E: codex-rs/core/src/compact.rs:580][E: codex-rs/core/src/compact.rs:583][E: codex-rs/core/src/compact.rs:601]

## 控制流

1. 手动 compact: `session/handlers.rs::compact` 创建默认 turn context，然后 `spawn_task(..., CompactTask)`。[E: codex-rs/core/src/session/handlers.rs:444][E: codex-rs/core/src/session/handlers.rs:445][E: codex-rs/core/src/session/handlers.rs:447]
2. `CompactTask::run` 选择 remote v2、remote v1 或 local；local path 会把 config 中的 `compact_prompt` 或默认 `SUMMARIZATION_PROMPT` 合成为 `UserInput::Text`。[E: codex-rs/core/src/tasks/compact.rs:31][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:43][E: codex-rs/core/src/tasks/compact.rs:50][E: codex-rs/core/src/tasks/compact.rs:58][E: codex-rs/core/src/tasks/compact.rs:63]
3. Pre-turn auto compact: `run_turn` 在 context updates 和新 user input 记录前调用 `run_pre_sampling_compact`；该函数先尝试 previous-model compact，再按 `auto_compact_token_status` 判断是否以 `DoNotInject` 运行 pre-turn compact。[E: codex-rs/core/src/session/turn.rs:150][E: codex-rs/core/src/session/turn.rs:154][E: codex-rs/core/src/session/turn.rs:162][E: codex-rs/core/src/session/turn.rs:799][E: codex-rs/core/src/session/turn.rs:804][E: codex-rs/core/src/session/turn.rs:805][E: codex-rs/core/src/session/turn.rs:807][E: codex-rs/core/src/session/turn.rs:812]
4. Model-change/downshift compact: previous model compaction 在 compaction compatibility hash 改变时触发；否则只有 active context tokens 超过新模型限制、模型 slug 变化、旧窗口大于新窗口时才以 `ModelDownshift` 触发。[E: codex-rs/core/src/session/turn.rs:823][E: codex-rs/core/src/session/turn.rs:841][E: codex-rs/core/src/session/turn.rs:851][E: codex-rs/core/src/session/turn.rs:870][E: codex-rs/core/src/session/turn.rs:885][E: codex-rs/core/src/session/turn.rs:886][E: codex-rs/core/src/session/turn.rs:893][E: codex-rs/core/src/session/turn.rs:894]
5. Mid-turn auto compact: sampling 后如果 `token_limit_reached && needs_follow_up`，turn loop 调用 `run_auto_compact(..., BeforeLastUserMessage, ContextLimit, MidTurn)`，成功后继续 loop。[E: codex-rs/core/src/session/turn.rs:270][E: codex-rs/core/src/session/turn.rs:279][E: codex-rs/core/src/session/turn.rs:282][E: codex-rs/core/src/session/turn.rs:305][E: codex-rs/core/src/session/turn.rs:306][E: codex-rs/core/src/session/turn.rs:310][E: codex-rs/core/src/session/turn.rs:312][E: codex-rs/core/src/session/turn.rs:321]
6. `run_auto_compact` 对 auto paths 同样基于 provider remote support 和 `Feature::RemoteCompactionV2` 选择 remote v2、remote v1 或 local。[E: codex-rs/core/src/session/turn.rs:907][E: codex-rs/core/src/session/turn.rs:915][E: codex-rs/core/src/session/turn.rs:919][E: codex-rs/core/src/session/turn.rs:926][E: codex-rs/core/src/session/turn.rs:942][E: codex-rs/core/src/session/turn.rs:957]

## Local path

Local compaction clone 当前 history，把 synthesized prompt input 记录进去，再用 `Prompt { input: history.for_prompt(...), base_instructions: sess.get_base_instructions() }` 走普通 streaming completion；若 prompt 超上下文窗口且 item 数大于 1，会删除最早 history item 并重试。[E: codex-rs/core/src/compact.rs:212][E: codex-rs/core/src/compact.rs:214][E: codex-rs/core/src/compact.rs:215][E: codex-rs/core/src/compact.rs:239][E: codex-rs/core/src/compact.rs:240][E: codex-rs/core/src/compact.rs:241][E: codex-rs/core/src/compact.rs:260][E: codex-rs/core/src/compact.rs:266]

成功后 local path 从 session history 取最后 assistant message 作为 summary suffix，拼上 `SUMMARY_PREFIX`，收集非 summary user messages，构建 replacement history，必要时插入 initial context，然后 advance auto-compact window id 并安装 replacement history。[E: codex-rs/core/src/compact.rs:298][E: codex-rs/core/src/compact.rs:300][E: codex-rs/core/src/compact.rs:301][E: codex-rs/core/src/compact.rs:302][E: codex-rs/core/src/compact.rs:304][E: codex-rs/core/src/compact.rs:305][E: codex-rs/core/src/compact.rs:311][E: codex-rs/core/src/compact.rs:324]

Local stream drain 会记录 `OutputItemDone` 到 conversation history、更新 server reasoning/rate limit/token usage，并在 `response.completed` 后返回。[E: codex-rs/core/src/compact.rs:612][E: codex-rs/core/src/compact.rs:619][E: codex-rs/core/src/compact.rs:642][E: codex-rs/core/src/compact.rs:643][E: codex-rs/core/src/compact.rs:646][E: codex-rs/core/src/compact.rs:649][E: codex-rs/core/src/compact.rs:652][E: codex-rs/core/src/compact.rs:655]

## Remote paths

Remote v1 path clone history、取 base instructions、先用 `trim_function_call_history_to_fit_context_window` 改写尾部 tool outputs 到可容纳上下文，再构造包含 model-visible tool specs 和 parallel-tool-calls flag 的 prompt，调用 `model_client.compact_conversation_history`。[E: codex-rs/core/src/compact_remote.rs:189][E: codex-rs/core/src/compact_remote.rs:190][E: codex-rs/core/src/compact_remote.rs:191][E: codex-rs/core/src/compact_remote.rs:219][E: codex-rs/core/src/compact_remote.rs:220][E: codex-rs/core/src/compact_remote.rs:226][E: codex-rs/core/src/compact_remote.rs:228][E: codex-rs/core/src/compact_remote.rs:240]

Remote v1/v2 共用 `process_compacted_history`：如果是 `BeforeLastUserMessage` 才构造 initial context；随后先 `retain(should_keep_compacted_history_item)`，再调用 local 的 insertion helper。[E: codex-rs/core/src/compact_remote.rs:295][E: codex-rs/core/src/compact_remote.rs:304][E: codex-rs/core/src/compact_remote.rs:308][E: codex-rs/core/src/compact_remote.rs:313][E: codex-rs/core/src/compact_remote.rs:314]

Remote history filter 会丢弃 developer messages、非 real user/hook user messages、reasoning、tool calls、tool outputs、web/image outputs 和 other；保留 assistant messages、agent messages、compaction/context-compaction items，以及能解析成 `TurnItem::UserMessage` 或 `HookPrompt` 的 user messages。[E: codex-rs/core/src/compact_remote.rs:333][E: codex-rs/core/src/compact_remote.rs:335][E: codex-rs/core/src/compact_remote.rs:336][E: codex-rs/core/src/compact_remote.rs:337][E: codex-rs/core/src/compact_remote.rs:342][E: codex-rs/core/src/compact_remote.rs:344][E: codex-rs/core/src/compact_remote.rs:345][E: codex-rs/core/src/compact_remote.rs:347]

Remote v2 在 prompt input 末尾追加 `ResponseItem::CompactionTrigger`，stream 完成时要求 exactly one `ResponseItem::Compaction`，再保留 prompt input 中 user/developer/system messages，经 shared filter 和 64k retained-message token budget 截断后追加 compaction output。[E: codex-rs/core/src/compact_remote_v2.rs:233][E: codex-rs/core/src/compact_remote_v2.rs:238][E: codex-rs/core/src/compact_remote_v2.rs:390][E: codex-rs/core/src/compact_remote_v2.rs:415][E: codex-rs/core/src/compact_remote_v2.rs:430][E: codex-rs/core/src/compact_remote_v2.rs:434][E: codex-rs/core/src/compact_remote_v2.rs:436][E: codex-rs/core/src/compact_remote_v2.rs:441][E: codex-rs/core/src/compact_remote_v2.rs:446]

## 设计动机与权衡

`DoNotInject` 与 `BeforeLastUserMessage` 的分叉体现了 prompt-shape 权衡：pre-turn/manual compact 可以让下一轮 regular turn 重新注入 initial context；mid-turn compact 则必须在同一 follow-up loop 继续采样，所以要把 fresh initial context 插回 replacement history。[E: codex-rs/core/src/compact.rs:56][E: codex-rs/core/src/compact.rs:60][E: codex-rs/core/src/compact.rs:311][E: codex-rs/core/src/session/turn.rs:310][I]

Remote v2 只把 retained prompt messages 和 compaction item 作为 replacement history，是为了让普通 stream 的 compaction output 成为 history 边界，同时避免把 remote path 产生的 stale developer/context wrappers 原样带回。[E: codex-rs/core/src/compact_remote_v2.rs:430][E: codex-rs/core/src/compact_remote_v2.rs:434][E: codex-rs/core/src/compact_remote_v2.rs:446][E: codex-rs/core/src/compact_remote.rs:322][I]

## gotcha

- `CompactedItem.message` 只有 local path 保存 summary text；remote v1/v2 都保存空 message，消费 rollout 时必须看 `replacement_history`。[E: codex-rs/core/src/compact.rs:320][E: codex-rs/core/src/compact_remote.rs:275][E: codex-rs/core/src/compact_remote_v2.rs:308]
- Pre-turn auto compact 仍在 context updates 和新 user message 记录前运行；源码 TODO 明确还没有估算 pending incoming items。[E: codex-rs/core/src/session/turn.rs:150]
- `insert_initial_context_before_last_real_user_or_summary` 优先插在最后一个真实 user message 前；如果没有真实 user message，才回退到 summary/compaction item/append。[E: codex-rs/core/src/compact.rs:493][E: codex-rs/core/src/compact.rs:497][E: codex-rs/core/src/compact.rs:523][E: codex-rs/core/src/compact.rs:531]
- Remote v2 stream 如果没有 `response.completed` 或 compaction output 数量不是 1，会返回错误；这和 remote v1 直接接收 `compact_conversation_history` replacement history 不同。[E: codex-rs/core/src/compact_remote_v2.rs:408][E: codex-rs/core/src/compact_remote_v2.rs:415]

## Sources

- `codex-rs/core/src/compact.rs`
- `codex-rs/core/src/compact_remote.rs`
- `codex-rs/core/src/compact_remote_v2.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`

## 相关

- [Turn 引擎](turn-engine.md) — auto compact 触发点位于 run turn loop。
- [Context manager](context-manager.md) — replacement history 与 `reference_context_item` 的 state 语义。
- [指令/prompt 装配](instruction-assembly.md) — mid-turn compaction 为什么要重新注入 initial context。
- [Session 生命周期](session-lifecycle.md) — `CompactTask` 如何作为 session task 运行。
