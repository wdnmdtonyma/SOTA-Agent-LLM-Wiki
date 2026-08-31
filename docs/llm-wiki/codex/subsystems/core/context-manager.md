---
id: subsys.core.context-manager
title: Context manager
kind: subsystem
tier: T2
source: [codex-rs/core/src/context_manager/mod.rs, codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/normalize.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/utils/audio/src/lib.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/multi_agent_mode.rs, codex-rs/core/src/context/world_state/tools.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/session.rs]
symbols: [ContextManager, ContextManager::record_items, ContextManager::for_prompt, ContextManager::replace_annotated, ContextManager::replace_compacted, ContextManager::normalize_history, ContextManager::update_world_state, user_message_revision]
related: [spine.context-and-compaction, subsys.core.turn-engine, subsys.core.instruction-assembly, subsys.core.compaction, subsys.core.memory, subsys.core.history-notes]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `ContextManager` 是 core session 的 conversation history 与 context-baseline 管理器：它保存 ordered `ResponseItemEnvelope`（`Arc` 共享直到突变）、`history_version`、独立的 `user_message_revision`、token usage info、`reference_context_item` 和 `world_state_baseline`。`record_items` 只收 API-visible history items 并截断 tool output；`for_prompt` 在送模型前 normalize call/output 与 image/audio modality。音频校验已下沉到 `codex-rs/utils/audio`。[E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/context_manager/history.rs:178][E: codex-rs/core/src/context_manager/history.rs:235][E: codex-rs/utils/audio/src/lib.rs:145]

## 能回答的问题

- session history、token info 和 context diff baseline 存在哪里？
- `record_items` 与 `for_prompt` 分别执行哪些过滤、截断和 normalize？
- `user_message_revision` 何时递增？compaction 会不会改它？
- 缺失 tool output 或 orphan output 如何在 prompt 前修复？
- `reference_context_item` 如何决定 full initial context 与 settings diff？
- rollback/compaction 如何替换 history 并更新 baseline？

## 职责边界

`ContextManager` 只管理 history materialization、rewrites、token estimate 和 prompt 前 normalization；model sampling、tool execution、event emission 由 turn/session/tool 子系统负责。[E: codex-rs/core/src/context_manager/history.rs:178][E: codex-rs/core/src/context_manager/history.rs:235][I]

`SessionState` 把 `ContextManager` 作为 session-scoped `history` 字段；session 通过 `record_conversation_items` 写 history/rollout/raw items，通过 `clone_history().for_prompt(...)` 给 turn engine 取 prompt input。[E: codex-rs/core/src/state/session.rs:67][E: codex-rs/core/src/session/mod.rs:3241]

## 关键 crate/文件

- `codex-rs/core/src/context_manager/history.rs`: `ContextManager` fields、record/for_prompt、`replace_annotated` / `replace_compacted`、token usage/estimate 和 normalize glue。[E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/context_manager/history.rs:178][E: codex-rs/core/src/context_manager/history.rs:329]
- `codex-rs/core/src/context_manager/normalize.rs`: missing output insertion、orphan output removal、corresponding call/output removal、image/audio stripping。[E: codex-rs/core/src/context_manager/normalize.rs:21]
- `codex-rs/utils/audio/src/lib.rs`: 校验/规范化 message 与 tool-output audio data URL；token estimate 优先用解码时长。[E: codex-rs/utils/audio/src/lib.rs:145]
- `codex-rs/core/src/context_manager/updates.rs`: 只提供 developer/user message builder 与按 role 合并 contextual fragments 的 helper。[E: codex-rs/core/src/context_manager/updates.rs:12]
- `codex-rs/core/src/session/world_state.rs`: 每 step 聚合 realtime、permissions、collaboration、environment、agents/apps/plugins 与 extension-contributed typed sections。[E: codex-rs/core/src/session/world_state.rs:195]
- `codex-rs/core/src/session/mod.rs`: runtime baseline path `record_context_updates_and_set_reference_context_item`、history replacement after compaction。[E: codex-rs/core/src/session/mod.rs:3640][E: codex-rs/core/src/session/mod.rs:4137]

## 数据模型

`ContextManager::new()` 以空 `items`、`history_version` 0、`user_message_revision` 0、token info from `TokenUsageInfo::new_or_append`、无 `reference_context_item`、无 `world_state_baseline` 起步。[E: codex-rs/core/src/context_manager/history.rs:108]

`reference_context_item` 是 turn-context 变化的 optional baseline：缺失 baseline 时 session build full initial context；已有 baseline 时 world-state 先做 typed diff，若 `TurnContextItem` 变化再追加 extension turn-context contributions。rollback trimming 可以清空 baseline 以强制下次 full reinjection。[E: codex-rs/core/src/context_manager/history.rs:66][E: codex-rs/core/src/session/mod.rs:4148][E: codex-rs/core/src/context_manager/history.rs:539]

`is_api_message` 保留非 system `Message`、`AdditionalTools`、agent messages、calls、outputs、reasoning、web/image calls、`Compaction` 和 `ContextCompaction`；丢弃 `CompactionTrigger` 和 `Other`。[E: codex-rs/core/src/context_manager/history.rs:558]

`user_message_revision` 独立于 compaction 的 history generation：记录用户授权消息、以及 `replace_annotated`（reset/用户改写）时递增；`replace_compacted` 只 bump `history_version` 并清空 world-state baseline。[E: codex-rs/core/src/context_manager/history.rs:226][E: codex-rs/core/src/context_manager/history.rs:329][E: codex-rs/core/src/context_manager/history.rs:335]

## Typed World State 新增 sections

`MultiAgentModeState` 的 section id 是 `multi_agent_mode`。它保存每个 step 的 effective multi-agent mode；custom hint 在进入 snapshot 前按 400 tokens 截断。相同 mode 不重发；从 `Proactive` 退回无显式配置时会渲染 `ExplicitRequestOnly`，而已知的其它 `None` transition 不产生 diff。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:13][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:76]

`ToolsState` 的 section id 是 `tools`，snapshot 是当前 deferred tool namespace 到 description 的有序映射。description 只取首行、trim 后最多 250 chars；整个 `<tools>` fragment 最多 4 KiB。[E: codex-rs/core/src/context/world_state/tools.rs:12][E: codex-rs/core/src/context/world_state/tools.rs:13]

tools section 仅在 `DeferredToolWorldState` feature 开启时加入；extension contributors 的 sections 随后异步聚合，multi-agent section 最后按 effective mode 加入，并可 `with_usage_hint`。[E: codex-rs/core/src/session/world_state.rs:275][E: codex-rs/core/src/session/world_state.rs:313]

## 控制流

1. `SessionState::new_with_auto_compact_window_ids` 创建 `ContextManager::new()` 并存进 `SessionState.history`。[E: codex-rs/core/src/state/session.rs:67]
2. `record_conversation_items` 调用 `prepare_conversation_items_for_history`，除 media preparation 外还为缺失 id 的 API items 分配 prefixed `ResponseItemId`，再锁 session state、写 history/rollout 并发送 raw items。[E: codex-rs/core/src/session/mod.rs:3241]
3. `ContextManager::record_items` 迭代 incoming items，跳过非 API messages，按 truncation policy 处理保留项，push 进 `items`。[E: codex-rs/core/src/context_manager/history.rs:178]
4. `record_items_with_metadata` 截断 `FunctionCallOutput` / `CustomToolCallOutput`：metadata override 优先，否则 `policy * 1.2`。[E: codex-rs/core/src/context_manager/history.rs:222]
5. `for_prompt` 消费 cloned `ContextManager`，调用 `for_prompt_annotated` → `normalize_history`，再剥掉 envelope。[E: codex-rs/core/src/context_manager/history.rs:235]
6. `normalize_history` 调用 `ensure_call_outputs_present`、`remove_orphan_outputs`，再按模型 modality 剥离 image/audio。[E: codex-rs/core/src/context_manager/history.rs:491]
7. `ensure_call_outputs_present` 为缺失的 `FunctionCall` / `CustomToolCall` / `LocalShellCall` 插入 synthetic `"aborted"` output；缺失 client `ToolSearchCall` output 变成 completed empty `ToolSearchOutput`。[E: codex-rs/core/src/context_manager/normalize.rs:21]
8. `remove_first_item` 删除最老 item，再调用 `normalize::remove_corresponding_for`，并清空 `world_state_baseline`。[E: codex-rs/core/src/context_manager/history.rs:310]
9. `replace_annotated` 递增 `user_message_revision` 再 `replace_compacted`。session-level `replace_compacted_history` 额外替换 `reference_context_item`，持久化 compacted rollout item，并在有 baseline 时持久化 turn context。[E: codex-rs/core/src/context_manager/history.rs:329][E: codex-rs/core/src/session/mod.rs:3640]
10. `record_context_updates_and_set_reference_context_item` 在无 baseline 时选 full initial context，否则用 `ContextManager::update_world_state` 和 role-aware fragment merging；只有 `TurnContextItem` 变化时才追加 extension turn-context contributions。[E: codex-rs/core/src/session/mod.rs:4137]
11. rollback 用 `drop_last_n_user_turns` 选 cut index，再 `trim_pre_turn_context_updates`；若被裁掉的 developer message 是 mixed initial-context bundle，baseline 被清空。[E: codex-rs/core/src/context_manager/history.rs:524]

## Token 与 image estimate

在 durable history boundary，session 先对 media 做 copy-on-write preparation：image 与 audio 都只改将进入 in-memory/model history 的副本，不回写 persisted rollout。session 通过 `codex_utils_audio::prepare_response_items` 别名调用该 crate。[E: codex-rs/core/src/session/mod.rs:169][E: codex-rs/core/src/session/mod.rs:3161]

`estimate_audio_token_count` 优先用解码时长，按 `10` tokens/second 向上取整；解不出时长才回退 data URL 的 `approx_token_count`。[E: codex-rs/utils/audio/src/lib.rs:31][E: codex-rs/utils/audio/src/lib.rs:145]

## 设计动机与权衡

History normalization 发生在 prompt materialization 时，而不是每次 record。这让 live stream 可以暂时包含不完整的 call/output pair，同时在下一次模型请求前修好它们。[E: codex-rs/core/src/context_manager/history.rs:178][E: codex-rs/core/src/context_manager/history.rs:235][I]

`user_message_revision` 把“用户授权边界”和“compaction 换代”拆开：compaction 可以换 history 而不假装用户发了新消息。[E: codex-rs/core/src/context_manager/history.rs:335][I]

`reference_context_item` 避免每个 regular turn 都 reinject full initial context；rollback 在裁掉 mixed initial-context bundle 时故意清空它，宁可 full reinjection 也不对不可重建的 baseline 做 diff。[E: codex-rs/core/src/session/mod.rs:4148][E: codex-rs/core/src/context_manager/history.rs:539][I]

## gotcha

- `raw_items()` 与 `for_prompt()` 是不同表面：`raw_items()` 返回存储项，`for_prompt()` 消费 snapshot 并 normalize。[E: codex-rs/core/src/context_manager/history.rs:235][E: codex-rs/core/src/context_manager/history.rs:252]
- `CompactionTrigger` 不记为 API message，而 `Compaction`、`ContextCompaction` 和 `AdditionalTools` 会记。[E: codex-rs/core/src/context_manager/history.rs:561]
- compaction 走 `replace_compacted`，不递增 `user_message_revision`；用户改写/reset 走 `replace_annotated`。[E: codex-rs/core/src/context_manager/history.rs:329]
- 这不是 History notes 扩展的 backend history/notes store；后者是 private model-only 回读面。

## Sources

- `codex-rs/core/src/context_manager/mod.rs`
- `codex-rs/core/src/context_manager/history.rs`
- `codex-rs/core/src/context_manager/normalize.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/utils/audio/src/lib.rs`
- `codex-rs/core/src/context/world_state/mod.rs`
- `codex-rs/core/src/context/world_state/multi_agent_mode.rs`
- `codex-rs/core/src/context/world_state/tools.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/state/session.rs`

## 相关

- [Context and compaction](../../spine/context-and-compaction.md) — T0 history/compaction 图解。
- [指令/prompt 装配](instruction-assembly.md) — initial context 和 settings diff 的 fragment 来源。
- [Compaction](compaction.md) — replacement history 如何更新 `ContextManager`。
- [长期 Memory](memory.md) — `memory_summary.md` 长期记忆，不是 in-memory history。
- [History notes 扩展](history-notes.md) — backend 私有 history/notes 回读。
