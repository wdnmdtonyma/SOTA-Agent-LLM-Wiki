---
id: spine.context-and-compaction
title: Context 与 compaction
kind: flow
tier: T0
source: [codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/compact.rs, codex-rs/core/src/compact_token_budget.rs, codex-rs/core/src/compact_remote.rs, codex-rs/core/src/compact_remote_request.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/compact_remote_v2_attempt.rs, codex-rs/utils/audio/src/lib.rs]
symbols: [run_pre_sampling_compact, replace_compacted_history]
related: [spine.turn-end-to-end, spine.sq-eq-architecture, subsys.core.session-lifecycle, subsys.core.compaction, subsys.core.context-manager, subsys.core.history-notes, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Context system 用 `ContextManager` 保存 model-visible history、`history_version`、独立的 `user_message_revision`、token info、settings diff baseline 和 world-state baseline；compaction 在 pre-turn 或 mid-turn 把历史替换成 compacted history，并把 replacement 通过 rollout 持久化。`Feature::TokenBudget` 打开时 auto compact 走 token-budget 短路，不再走 remote/local summarizer。[E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/session/turn.rs:1210][E: codex-rs/core/src/session/mod.rs:3640]

## 能回答的问题

- `ContextManager` 保存哪些 state？`user_message_revision` 和 `history_version` 有何不同？
- history 发送模型前如何 normalize 和按 modality 过滤？
- `reference_context_item` 如何驱动 full context 与 settings diff？
- local / remote / TokenBudget compaction 的边界是什么？
- compaction 后 rollout、token usage、pending session start 如何更新？

```mermaid
flowchart TD
    ITEMS["record_conversation_items"] --> CM["ContextManager.items"]
    TURN["TurnContext"] --> BASE["reference_context_item"]
    BASE --> DIFF["full initial context or settings diff"]
    CM --> PROMPT["for_prompt(input_modalities)"]
    PROMPT --> MODEL["model / compact endpoint"]
    MODEL --> TB["compact_token_budget"]
    MODEL --> LOCAL["run_inline_auto_compact_task"]
    MODEL --> REMOTE["remote v1 / v2"]
    TB --> REPLACE["replace_compacted_history"]
    LOCAL --> REPLACE
    REMOTE --> REPLACE
    REPLACE --> ROLLOUT["RolloutItem::Compacted / TurnContext"]
```

## 端到端步骤

1. `ContextManager` 的核心 state 是 `Arc<Vec<ResponseItemEnvelope>>` 的 `items`、`history_version`、**`user_message_revision`**、`token_info`、`reference_context_item` 和 `world_state_baseline`。`new()` 把两个 revision 都置 0，baseline 为空。[E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/context_manager/history.rs:52][E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/context_manager/history.rs:108]
2. `record_items` 只记录 API-message items；实际写入走 `record_items_with_metadata`。truncation 可用 metadata 的 `fallback_token_limit_override`，否则 `policy * 1.2`。用户授权消息会递增 `user_message_revision`。[E: codex-rs/core/src/context_manager/history.rs:178][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:222][E: codex-rs/core/src/context_manager/history.rs:226]
3. `for_prompt` 是发送模型前的边界：它调用 `for_prompt_annotated` → `normalize_history(input_modalities)`。normalize 补齐 call/output 配对，并在模型不支持时剥离 image 与 audio。audio token 估计走 `codex_utils_audio::estimate_audio_token_count`。[E: codex-rs/core/src/context_manager/history.rs:235][E: codex-rs/core/src/context_manager/history.rs:243][E: codex-rs/core/src/context_manager/history.rs:491][E: codex-rs/core/src/context_manager/history.rs:32]
4. regular turn 开头，`run_turn` 先跑 `run_pre_sampling_compact`（在 context updates / user input **之前**），再调 `record_context_updates_and_set_reference_context_item`。baseline 为空时 build full initial context；否则由 `ContextManager::update_world_state` 生成 diff，并在 `TurnContextItem` 变化时追加 extension contributions。[E: codex-rs/core/src/session/turn.rs:172][E: codex-rs/core/src/session/mod.rs:4137][E: codex-rs/core/src/session/mod.rs:4148][E: codex-rs/core/src/session/mod.rs:4177]
5. model instructions、personality、context-window guidance、permissions、collaboration、realtime、environment、extension state 与 multi-agent policy 都由 `build_world_state_for_step` 组装成 typed sections。V2 usage hint 优先读 model catalog 的 `model_messages.multi_agent`，再回落到 bundled/config 文本。[E: codex-rs/core/src/session/world_state.rs:195][E: codex-rs/core/src/session/world_state.rs:316]
6. `record_context_updates_and_set_reference_context_item` 按需持久化 `RolloutItem::WorldState` 和 `RolloutItem::TurnContext`，并更新 in-memory settings baseline。[E: codex-rs/core/src/session/mod.rs:4193][E: codex-rs/core/src/session/mod.rs:4203]
7. `run_pre_sampling_compact` 在 sampling 前检查 token status；token limit reached 时以 `InitialContextInjection::DoNotInject` 运行 pre-turn auto compact。[E: codex-rs/core/src/session/turn.rs:1033][E: codex-rs/core/src/session/turn.rs:1045]
8. sampling 后若仍需 follow-up 且存在 `new_context` 请求或 token limit reached，`run_turn` 以 `InitialContextInjection::BeforeLastUserMessage { world_state, step_context }` 跑 mid-turn compact。[E: codex-rs/core/src/session/turn.rs:461][E: codex-rs/core/src/session/turn.rs:479]
9. `run_auto_compact` 先看 `Feature::TokenBudget`：开则调用 `compact_token_budget::run_inline_auto_compact_task` 并立刻返回。否则按 provider remote support + `Feature::RemoteCompactionV2` 选 remote v2、remote v1 或 local。[E: codex-rs/core/src/session/turn.rs:1210][E: codex-rs/core/src/session/turn.rs:1222][E: codex-rs/core/src/session/turn.rs:1262]
10. local auto compact 构造 compact prompt，调用 `run_compact_task_inner`；inner 克隆 history，把 compact prompt 记进临时 history，再用普通 stream 生成 summary；context window exceeded 时移除最老 item 后重试。[E: codex-rs/core/src/compact.rs:116][E: codex-rs/core/src/compact.rs:245][E: codex-rs/core/src/compact.rs:257][E: codex-rs/core/src/compact.rs:314]
11. local compaction 用 summary 和 user messages 构造 replacement history；mid-turn 会把 initial context 插到最后一个真实 user / non-final agent message 前，并保存当前 turn snapshot 作为新 baseline。[E: codex-rs/core/src/compact.rs:352][E: codex-rs/core/src/compact.rs:367][E: codex-rs/core/src/compact.rs:373]
12. remote v1 request 在 `compact_remote_request.rs`：先截短 oversize tool outputs，再用 `history.for_prompt`、`built_tools` 和 model-visible specs 构造 Compact endpoint prompt。remote v2 attempt 额外 append `CompactionTrigger`，走普通 Responses stream。[E: codex-rs/core/src/compact_remote_request.rs:23]
13. `replace_compacted_history` 先补缺失 item id，再替换 in-memory history（`HistoryReplacement::Compaction`，不递增 `user_message_revision`），持久化 `RolloutItem::Compacted`，可选持久化 `WorldState` / `TurnContext`，并 queue `SessionStartSource::Compact`。[E: codex-rs/core/src/session/mod.rs:3640][E: codex-rs/core/src/session/mod.rs:3669][E: codex-rs/core/src/session/mod.rs:3696][E: codex-rs/core/src/context_manager/history.rs:335]
14. compaction 完成后 local path 调用 `recompute_token_usage`。[E: codex-rs/core/src/compact.rs:390]

## 关键决策点

- `reference_context_item` 是 context diff baseline；baseline 为空意味着下一次 regular turn 要 full reinject context。[E: codex-rs/core/src/session/mod.rs:4148]
- pre-turn compaction 不注入 initial context；mid-turn compaction 的 injection 现在是结构体 `{ world_state, step_context }`，不再是单独的 `Arc<WorldState>`。[E: codex-rs/core/src/compact.rs:73][E: codex-rs/core/src/session/turn.rs:479]
- `replace_annotated` 会递增 `user_message_revision` 再调用 `replace_compacted`；compaction 只走 `replace_compacted`，不改用户修订号。[E: codex-rs/core/src/context_manager/history.rs:329][E: codex-rs/core/src/context_manager/history.rs:335]
- `is_api_message` 现含 `AdditionalTools`；`CompactionTrigger` 与 `Other` 仍不记入 history。[E: codex-rs/core/src/context_manager/history.rs:561][E: codex-rs/core/src/context_manager/history.rs:575]
- TokenBudget compact 跳过模型/server summarization，但仍走 compact hooks 与 `ContextCompaction` lifecycle。[E: codex-rs/core/src/compact_token_budget.rs:26]
- audio 处理在 `utils/audio`；`ContextManager` 通过 `codex_utils_audio::estimate_audio_token_count` 消费它。[E: codex-rs/core/src/context_manager/history.rs:32][E: codex-rs/utils/audio/src/lib.rs:145]
- compaction 截断后的旧窗口细节，可由 History notes 扩展经 backend `history`/`notes` 回读；那是另一份 private store，不是 `ContextManager.items`。

## 深挖入口

- `spine.turn-end-to-end` 说明 context update 与 sampling 的顺序。
- `subsys.core.session-lifecycle` 展开 rollout replay、resume、rollback 与 history version。
- `subsys.core.compaction` 展开三条 compact 实现与 TokenBudget 短路。
- `subsys.core.history-notes` 说明 compaction 之后如何回读私有 history/notes。
- `ref.protocol-event-lifecycle` 列出 context compaction 和 token usage events。

## Sources

- codex-rs/core/src/context_manager/history.rs
- codex-rs/core/src/context_manager/updates.rs
- codex-rs/core/src/context/world_state/mod.rs
- codex-rs/core/src/session/world_state.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/core/src/session/turn.rs
- codex-rs/core/src/compact.rs
- codex-rs/core/src/compact_token_budget.rs
- codex-rs/core/src/compact_remote.rs
- codex-rs/core/src/compact_remote_request.rs
- codex-rs/core/src/compact_remote_v2.rs
- codex-rs/core/src/compact_remote_v2_attempt.rs
- codex-rs/utils/audio/src/lib.rs

## 相关

- [一次 turn 端到端](turn-end-to-end.md)
- [SQ/EQ 双队列架构](sq-eq-architecture.md)
- [core session lifecycle](../subsystems/core/session-lifecycle.md)
- [历史压缩与 compaction](../subsystems/core/compaction.md)
- [Context manager](../subsystems/core/context-manager.md)
- [History notes 扩展](../subsystems/core/history-notes.md)
- 索引 id：`ref.protocol-event-lifecycle`
