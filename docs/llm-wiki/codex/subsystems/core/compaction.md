---
id: subsys.core.compaction
title: 历史压缩与 compaction
kind: subsystem
tier: T2
source: [codex-rs/core/src/compact.rs, codex-rs/core/src/compact_remote.rs, codex-rs/core/src/tasks/compact.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs]
symbols: [InitialContextInjection, CompactTask, run_compact_task, run_inline_auto_compact_task, run_remote_compact_task, run_inline_remote_auto_compact_task, build_compacted_history, insert_initial_context_before_last_real_user_or_summary, Session::replace_compacted_history]
related: [subsys.core.turn-engine, subsys.core.context-manager, subsys.core.instruction-assembly, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Compaction 是 Codex 在上下文接近模型限制时替换 thread history 的机制：本地路径构造“近期 user messages + compaction summary + 可选 initial context”，remote 路径接收 provider-returned replacement history 后过滤并可选插入 initial context；两条路径最终都调用 `Session::replace_compacted_history`。[E: codex-rs/core/src/compact.rs:258][E: codex-rs/core/src/compact.rs:264][E: codex-rs/core/src/compact.rs:282][E: codex-rs/core/src/compact.rs:522][E: codex-rs/core/src/compact_remote.rs:165][E: codex-rs/core/src/compact_remote.rs:204][E: codex-rs/core/src/compact_remote.rs:231][E: codex-rs/core/src/session/mod.rs:2320][E: codex-rs/core/src/session/mod.rs:2326]

## 能回答的问题

- 手动 `/compact`、pre-turn auto compact、mid-turn auto compact 分别怎么触发？
- `InitialContextInjection::DoNotInject` 和 `BeforeLastUserMessage` 的边界是什么？
- 本地 compaction 与 remote compaction 的 prompt / tools / history 处理差异是什么？
- compaction 后 `reference_context_item`、`CompactedItem` 和 rollout persistence 如何更新？
- 为什么 remote compaction 会过滤 tool calls，而本地 compaction 会重新构造 user summary history？
- compaction 与 turn engine 的 token limit / model downshift 检测如何衔接？

## 职责边界

`compact.rs` 负责本地 summarization、summary text 构造、user message 截断和 initial context 插入；`compact_remote.rs` 负责调用 provider 的 `compact_conversation_history` 并清洗远端返回的 replacement history；`tasks/compact.rs` 是手动 compact 的 session task 入口；`session/turn.rs` 在 pre-sampling 和 mid-turn follow-up loop 中触发 auto compact。[E: codex-rs/core/src/compact.rs:151][E: codex-rs/core/src/compact_remote.rs:112][E: codex-rs/core/src/tasks/compact.rs:22][E: codex-rs/core/src/session/turn.rs:709][E: codex-rs/core/src/session/turn.rs:787] Compaction 不负责普通 turn sampling 的 tool dispatch；它只生成或接收 replacement history，然后交给 `Session::replace_compacted_history` 原子替换历史。[E: codex-rs/core/src/session/mod.rs:2320][I]

## 关键 crate/文件

- `codex-rs/core/src/compact.rs`: 本地 compaction 主实现，包含 `SUMMARIZATION_PROMPT`、`SUMMARY_PREFIX`、`InitialContextInjection`、`run_compact_task_inner_impl`、`build_compacted_history` 和 `drain_to_completed`。[E: codex-rs/core/src/compact.rs:42][E: codex-rs/core/src/compact.rs:43][E: codex-rs/core/src/compact.rs:56][E: codex-rs/core/src/compact.rs:151][E: codex-rs/core/src/compact.rs:465][E: codex-rs/core/src/compact.rs:533]
- `codex-rs/core/src/compact_remote.rs`: remote compaction 主实现，构造带 tools 的 `Prompt`，调用 `model_client.compact_conversation_history`，再保留允许进入 history 的 item 类型。[E: codex-rs/core/src/compact_remote.rs:152][E: codex-rs/core/src/compact_remote.rs:165][E: codex-rs/core/src/compact_remote.rs:250]
- `codex-rs/core/src/tasks/compact.rs`: `CompactTask::run` 根据 provider capability 选择 remote 或 local，并分别打 `codex.task.compact` telemetry type。[E: codex-rs/core/src/tasks/compact.rs:30][E: codex-rs/core/src/tasks/compact.rs:34][E: codex-rs/core/src/tasks/compact.rs:41]
- `codex-rs/core/src/session/turn.rs`: `run_turn` 在采样前调用 `run_pre_sampling_compact`，采样后如果 token limit reached 且还需要 follow-up，则以 `BeforeLastUserMessage` 跑 mid-turn auto compact。[E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:494]
- `codex-rs/core/src/session/mod.rs`: `replace_compacted_history` 同时更新 in-memory history、持久化 `RolloutItem::Compacted`、可选持久化 `RolloutItem::TurnContext`，并 advance model-client window generation。[E: codex-rs/core/src/session/mod.rs:2326][E: codex-rs/core/src/session/mod.rs:2329][E: codex-rs/core/src/session/mod.rs:2331][E: codex-rs/core/src/session/mod.rs:2335]

## 数据模型

`InitialContextInjection` 有两个值：`BeforeLastUserMessage` 表示 replacement history 必须在最后一个真实 user message 或 summary 附近重新注入 initial context；`DoNotInject` 表示 replacement history 不带 initial context，`reference_context_item` 被清空，下一轮 regular turn 再完整注入 initial context。[E: codex-rs/core/src/compact.rs:48][E: codex-rs/core/src/compact.rs:49][E: codex-rs/core/src/compact.rs:52][E: codex-rs/core/src/compact.rs:54][E: codex-rs/core/src/compact.rs:56][E: codex-rs/core/src/compact.rs:57][E: codex-rs/core/src/compact.rs:58][E: codex-rs/core/src/compact.rs:437][E: codex-rs/core/src/compact.rs:439][E: codex-rs/core/src/compact.rs:448][E: codex-rs/core/src/compact.rs:449][E: codex-rs/core/src/compact.rs:450][E: codex-rs/core/src/compact.rs:274][E: codex-rs/core/src/compact.rs:275][E: codex-rs/core/src/compact.rs:276][E: codex-rs/core/src/session/mod.rs:2620][E: codex-rs/core/src/session/mod.rs:2622]

本地 compaction 的 summary 由 `SUMMARY_PREFIX` 加上 compaction turn 中最后一条 assistant message 组成，之后 `build_compacted_history` 只保留最多 `COMPACT_USER_MESSAGE_MAX_TOKENS` 的近期 user messages，并把 summary 作为 role=`user` 的 `ResponseItem::Message` 压到 history 末尾。[E: codex-rs/core/src/compact.rs:43][E: codex-rs/core/src/compact.rs:44][E: codex-rs/core/src/compact.rs:254][E: codex-rs/core/src/compact.rs:255][E: codex-rs/core/src/compact.rs:487][E: codex-rs/core/src/compact.rs:522]

Remote compaction 的 replacement history 来自 `model_client.compact_conversation_history`；`process_compacted_history` 会先按 `should_keep_compacted_history_item` 过滤，并且只有 `InitialContextInjection::BeforeLastUserMessage` 时才构造非空 initial context 后调用 `insert_initial_context_before_last_real_user_or_summary`。[E: codex-rs/core/src/compact_remote.rs:165][E: codex-rs/core/src/compact_remote.rs:185][E: codex-rs/core/src/compact_remote.rs:222][E: codex-rs/core/src/compact_remote.rs:224][E: codex-rs/core/src/compact_remote.rs:226][E: codex-rs/core/src/compact_remote.rs:228][E: codex-rs/core/src/compact_remote.rs:231][E: codex-rs/core/src/compact_remote.rs:232]

`CompactedItem` 在本地路径保存 `message: summary_text` 和 `replacement_history: Some(new_history.clone())`；remote 路径保存空 message 但同样保存 replacement history。[E: codex-rs/core/src/compact.rs:278][E: codex-rs/core/src/compact.rs:280][E: codex-rs/core/src/compact_remote.rs:200][E: codex-rs/core/src/compact_remote.rs:202]

## 控制流

1. 手动 compact: `session/handlers.rs::compact` 创建默认 turn context，把 `turn_context.compact_prompt()` 包装成 synthesized `UserInput::Text`，然后 `spawn_task(..., CompactTask)`。[E: codex-rs/core/src/session/handlers.rs:603][E: codex-rs/core/src/session/handlers.rs:609][E: codex-rs/core/src/session/handlers.rs:613]
2. `CompactTask::run` 调用 `should_use_remote_compact_task(ctx.provider.info())`；provider 支持 remote compaction 时调用 `compact_remote::run_remote_compact_task`，否则调用 `compact::run_compact_task`。[E: codex-rs/core/src/tasks/compact.rs:30][E: codex-rs/core/src/tasks/compact.rs:36][E: codex-rs/core/src/tasks/compact.rs:43]
3. Pre-turn auto compact: `run_turn` 在 context updates 和 user input 进入本轮 sampling 之前调用 `run_pre_sampling_compact`；该函数先尝试 model downshift compaction，再比较 total usage 与 `auto_compact_token_limit`。[E: codex-rs/core/src/session/turn.rs:151][E: codex-rs/core/src/session/turn.rs:155][E: codex-rs/core/src/session/turn.rs:168][E: codex-rs/core/src/session/turn.rs:714][E: codex-rs/core/src/session/turn.rs:721][E: codex-rs/core/src/session/turn.rs:726]
4. Model downshift compact: `maybe_run_previous_model_inline_compact` 只有在 total tokens 超过新模型 auto compact limit、模型 slug 变化、旧 context window 大于新 context window 时才用 previous model turn context  compact。[E: codex-rs/core/src/session/turn.rs:770][E: codex-rs/core/src/session/turn.rs:771][E: codex-rs/core/src/session/turn.rs:772][E: codex-rs/core/src/session/turn.rs:774]
5. Mid-turn auto compact: 一次 model sampling 完成后，如果 `total_usage_tokens >= auto_compact_limit` 且 `needs_follow_up` 为 true，turn loop 调用 `run_auto_compact(..., InitialContextInjection::BeforeLastUserMessage, ContextLimit, MidTurn)`，随后 reset websocket session 并继续 loop。[E: codex-rs/core/src/session/turn.rs:470][E: codex-rs/core/src/session/turn.rs:471][E: codex-rs/core/src/session/turn.rs:472][E: codex-rs/core/src/session/turn.rs:490][E: codex-rs/core/src/session/turn.rs:491][E: codex-rs/core/src/session/turn.rs:494][E: codex-rs/core/src/session/turn.rs:495][E: codex-rs/core/src/session/turn.rs:496][E: codex-rs/core/src/session/turn.rs:503][E: codex-rs/core/src/session/turn.rs:505]
6. 本地 compact sampling: `run_compact_task_inner_impl` 先 emit `ContextCompaction` started item，把 synthesized input 记录到 cloned history，然后用 `Prompt { input: history.for_prompt(...), base_instructions: sess.get_base_instructions() }` 采样 compaction response。[E: codex-rs/core/src/compact.rs:157][E: codex-rs/core/src/compact.rs:162][E: codex-rs/core/src/compact.rs:163][E: codex-rs/core/src/compact.rs:166][E: codex-rs/core/src/compact.rs:183][E: codex-rs/core/src/compact.rs:185][E: codex-rs/core/src/compact.rs:190][E: codex-rs/core/src/compact.rs:195]
7. 本地 compact retry/trim: 如果 compaction prompt 超 context window，且 prompt item 数大于 1，`history.remove_first_item()` 丢弃最早 history item 并重试；普通 stream error 按 provider `stream_max_retries` backoff 重试。[E: codex-rs/core/src/compact.rs:215][E: codex-rs/core/src/compact.rs:221][E: codex-rs/core/src/compact.rs:232][E: codex-rs/core/src/compact.rs:241]
8. 本地 replacement: 成功后读取原 session history，抽取最后 assistant summary、收集 user messages、构造 compacted history，必要时插入 initial context，保留 `GhostSnapshot`，再调用 `replace_compacted_history`。[E: codex-rs/core/src/compact.rs:252][E: codex-rs/core/src/compact.rs:254][E: codex-rs/core/src/compact.rs:256][E: codex-rs/core/src/compact.rs:258][E: codex-rs/core/src/compact.rs:264][E: codex-rs/core/src/compact.rs:268][E: codex-rs/core/src/compact.rs:282]
9. Remote compact preparation: `run_remote_compact_task_inner_impl` clone history、取 base instructions、调用 `trim_function_call_history_to_fit_context_window` 删除尾部 Codex-generated items 直到估算 tokens 不超过 context window，然后保留 ghost snapshots。[E: codex-rs/core/src/compact_remote.rs:120][E: codex-rs/core/src/compact_remote.rs:121][E: codex-rs/core/src/compact_remote.rs:122][E: codex-rs/core/src/compact_remote.rs:328][E: codex-rs/core/src/compact_remote.rs:329][E: codex-rs/core/src/compact_remote.rs:335][E: codex-rs/core/src/compact_remote.rs:338][E: codex-rs/core/src/compact_remote.rs:341][E: codex-rs/core/src/compact_remote.rs:135]
10. Remote compact request: remote path 用 `built_tools` 构建 tool router，并把 `tool_router.model_visible_specs()`、`parallel_tool_calls`、base instructions、personality 放进 `Prompt`，然后调用 `compact_conversation_history`。[E: codex-rs/core/src/compact_remote.rs:143][E: codex-rs/core/src/compact_remote.rs:154][E: codex-rs/core/src/compact_remote.rs:155][E: codex-rs/core/src/compact_remote.rs:156][E: codex-rs/core/src/compact_remote.rs:157][E: codex-rs/core/src/compact_remote.rs:165]
11. Remote history filter: remote output 删除 developer messages、非 user/assistant 普通 messages、reasoning、tool calls、tool outputs、web/image/ghost/other；只保留 assistant messages、compaction items、以及可解析成 `UserMessage` 或 `HookPrompt` 的 user messages。[E: codex-rs/core/src/compact_remote.rs:252][E: codex-rs/core/src/compact_remote.rs:253][E: codex-rs/core/src/compact_remote.rs:254][E: codex-rs/core/src/compact_remote.rs:256][E: codex-rs/core/src/compact_remote.rs:259][E: codex-rs/core/src/compact_remote.rs:260][E: codex-rs/core/src/compact_remote.rs:261][E: codex-rs/core/src/compact_remote.rs:262][E: codex-rs/core/src/compact_remote.rs:263][E: codex-rs/core/src/compact_remote.rs:264][E: codex-rs/core/src/compact_remote.rs:265][E: codex-rs/core/src/compact_remote.rs:266][E: codex-rs/core/src/compact_remote.rs:268][E: codex-rs/core/src/compact_remote.rs:269][E: codex-rs/core/src/compact_remote.rs:270][E: codex-rs/core/src/compact_remote.rs:271][E: codex-rs/core/src/compact_remote.rs:272][E: codex-rs/core/src/compact_remote.rs:273]
12. 持久化: `replace_compacted_history` 替换 session state，持久化 compacted rollout item，必要时持久化 `TurnContext`，并 advance model client window generation，避免后续请求沿用旧窗口状态。[E: codex-rs/core/src/session/mod.rs:2326][E: codex-rs/core/src/session/mod.rs:2329][E: codex-rs/core/src/session/mod.rs:2331][E: codex-rs/core/src/session/mod.rs:2335]

## 设计动机与权衡

`InitialContextInjection` 的分叉体现了一个 prompt-shape 权衡：pre-turn/manual compact 可以清空 `reference_context_item` 并让下一轮 turn 正常重注入 initial context；mid-turn compact 必须把 initial context 插回 replacement history，使 compaction item 仍保持在模型训练期望的末尾附近。[E: codex-rs/core/src/compact.rs:48][E: codex-rs/core/src/compact.rs:52][E: codex-rs/core/src/compact_remote.rs:219][E: codex-rs/core/src/compact_remote.rs:221][I]

本地 compact 使用普通 streaming completion，因此能复用 `drain_to_completed` 记录 `OutputItemDone`、server reasoning、rate limit 和 token usage；remote compact 使用 provider API 的专门 `compact_conversation_history`，所以它需要额外过滤 provider 返回的 history item。[E: codex-rs/core/src/compact.rs:560][E: codex-rs/core/src/compact.rs:564][E: codex-rs/core/src/compact.rs:567][E: codex-rs/core/src/compact.rs:570][E: codex-rs/core/src/compact_remote.rs:165][E: codex-rs/core/src/compact_remote.rs:231][I]

保留 `GhostSnapshot` 是为了让 `/undo` 在 compaction 后仍可用；源码在本地和 remote 两条路径都显式收集并 extend ghost snapshots。[E: codex-rs/core/src/compact_remote.rs:134][E: codex-rs/core/src/compact_remote.rs:193][E: codex-rs/core/src/compact_remote.rs:194][E: codex-rs/core/src/compact.rs:268][E: codex-rs/core/src/compact.rs:273][I]

## gotcha

- Remote compaction 的 `compacted_item.message` 是空字符串；不要把 rollout 中的 remote compact `CompactedItem.message` 当作 summary text。[E: codex-rs/core/src/compact_remote.rs:200][E: codex-rs/core/src/compact_remote.rs:201]
- Pre-turn auto compact 的 TODO 说明它当前发生在 context updates 和新 user message 记录之前，尚未预估 pending incoming items。[E: codex-rs/core/src/session/turn.rs:151][E: codex-rs/core/src/session/turn.rs:153]
- `insert_initial_context_before_last_real_user_or_summary` 优先插在最后一个非 summary user message 前；如果没有真实 user message，才退回 summary 或 compaction item 位置。[E: codex-rs/core/src/compact.rs:438][E: codex-rs/core/src/compact.rs:448][E: codex-rs/core/src/compact.rs:450]
- `build_compacted_history` 会把 summary 编码成 role=`user` message，这意味着“最后的 user message”不一定来自用户原始输入。[E: codex-rs/core/src/compact.rs:522][E: codex-rs/core/src/compact.rs:524]

## Sources

- `codex-rs/core/src/compact.rs`
- `codex-rs/core/src/compact_remote.rs`
- `codex-rs/core/src/tasks/compact.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`

## 相关

- [Turn 引擎](turn-engine.md) — auto compact 触发点位于 run turn loop。
- [Context manager](context-manager.md) — replacement history 与 `reference_context_item` 的 state 语义。
- [指令/prompt 装配](instruction-assembly.md) — mid-turn compaction 为什么要重新注入 initial context。
- [Session 生命周期](session-lifecycle.md) — `CompactTask` 如何作为 session task 运行。
