---
id: spine.context-and-compaction
title: Context 与 compaction
kind: flow
tier: T0
source: [codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/compact.rs, codex-rs/core/src/compact_remote.rs, codex-rs/core/src/compact_remote_request.rs, codex-rs/core/src/compact_remote_v2.rs, codex-rs/core/src/compact_remote_v2_attempt.rs]
symbols: [WorldStateSnapshot, run_pre_sampling_compact, run_auto_compact, RemoteCompactAttempt, RemoteCompactV2Attempt]
related: [spine.turn-end-to-end, spine.sq-eq-architecture, subsys.core.session-lifecycle, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Context system 用 `ContextManager` 保存 model-visible history、token info、settings diff baseline 和 world-state baseline；compaction 在 pre-turn 或 mid-turn 把历史替换成 compacted history，并把 replacement 通过 rollout 持久化。[E: codex-rs/core/src/context_manager/history.rs:43][E: codex-rs/core/src/context_manager/history.rs:46][E: codex-rs/core/src/context_manager/history.rs:57][E: codex-rs/core/src/context_manager/history.rs:59][E: codex-rs/core/src/session/mod.rs:3188][E: codex-rs/core/src/session/mod.rs:3219]

## 能回答的问题

- `ContextManager` 保存哪些 state？
- history 发送模型前如何 normalize 和按 modality 过滤？
- `reference_context_item` 如何驱动 full context 与 settings diff？
- local compaction 与 remote compaction 的边界是什么？
- compaction 后 rollout、token usage、pending session start 如何更新？

```mermaid
flowchart TD
    ITEMS["record_conversation_items"] --> CM["ContextManager.items"]
    TURN["TurnContext"] --> BASE["reference_context_item"]
    BASE --> DIFF["full initial context or settings diff"]
    CM --> PROMPT["for_prompt(input_modalities)"]
    PROMPT --> MODEL["model / compact endpoint"]
    MODEL --> LOCAL["run_inline_auto_compact_task"]
    MODEL --> REMOTE["run_inline_remote_auto_compact_task"]
    LOCAL --> REPLACE["replace_compacted_history"]
    REMOTE --> REPLACE
    REPLACE --> ROLLOUT["RolloutItem::Compacted / TurnContext"]
```

## 端到端步骤

1. `ContextManager` 的核心 state 是 ordered `items`、`history_version`、`token_info`、`reference_context_item` 和 `world_state_baseline`；`new` 初始化空 history、`history_version = 0` 和空 baseline。[E: codex-rs/core/src/context_manager/history.rs:43][E: codex-rs/core/src/context_manager/history.rs:43][E: codex-rs/core/src/context_manager/history.rs:45][E: codex-rs/core/src/context_manager/history.rs:46][E: codex-rs/core/src/context_manager/history.rs:57][E: codex-rs/core/src/context_manager/history.rs:59][E: codex-rs/core/src/context_manager/history.rs:63][E: codex-rs/core/src/context_manager/history.rs:71]
2. `record_items` 只记录 API-message items；每个保留项经过 `process_item` 后追加到 history。[E: codex-rs/core/src/context_manager/history.rs:124][E: codex-rs/core/src/context_manager/history.rs:131][E: codex-rs/core/src/context_manager/history.rs:135][E: codex-rs/core/src/context_manager/history.rs:132]
3. `for_prompt` 是发送模型前的边界：它调用 `normalize_history(input_modalities)`，并在模型不支持 image input 时剥离 message/tool output 中的 images。[E: codex-rs/core/src/context_manager/history.rs:143][E: codex-rs/core/src/context_manager/history.rs:144]
4. regular turn 开头，`run_turn` 调 `record_context_updates_and_set_reference_context_item`；该函数在 baseline 为空时 build full initial context 和 full world state，否则 build settings update items 与 world-state diffs。[E: codex-rs/core/src/session/turn.rs:198][E: codex-rs/core/src/session/mod.rs:3694][E: codex-rs/core/src/session/mod.rs:3705][E: codex-rs/core/src/session/mod.rs:3708][E: codex-rs/core/src/session/mod.rs:3725][E: codex-rs/core/src/session/mod.rs:3731]
5. `build_settings_update_items` 现在只负责 model switch、multi-agent mode 与 personality；permissions、collaboration、realtime、environment 等 typed sections 由 `build_world_state_for_step` 构造，并通过 `ContextManager::update_world_state` 做 snapshot/diff。[E: codex-rs/core/src/context_manager/updates.rs:111][E: codex-rs/core/src/context_manager/updates.rs:121][E: codex-rs/core/src/context_manager/updates.rs:125][E: codex-rs/core/src/session/world_state.rs:19][E: codex-rs/core/src/session/world_state.rs:38][E: codex-rs/core/src/session/mod.rs:3728]
6. `record_context_updates_and_set_reference_context_item` 按需持久化 `RolloutItem::WorldState` 和 `RolloutItem::TurnContext`，并更新 in-memory settings baseline。[E: codex-rs/core/src/session/mod.rs:3756][E: codex-rs/core/src/session/mod.rs:3766][E: codex-rs/core/src/session/mod.rs:3772]
7. `run_pre_sampling_compact` 在 sampling 前检查 token status；token limit reached 时以 `InitialContextInjection::DoNotInject` 运行 pre-turn auto compact。[E: codex-rs/core/src/session/turn.rs:846][E: codex-rs/core/src/session/turn.rs:856][E: codex-rs/core/src/session/turn.rs:858][E: codex-rs/core/src/session/turn.rs:865][E: codex-rs/core/src/session/turn.rs:868]
8. sampling 后若 token limit reached 且仍需 follow-up，`run_turn` 以 `InitialContextInjection::BeforeLastUserMessage` 和 `CompactionPhase::MidTurn` 运行 auto compact。[E: codex-rs/core/src/session/turn.rs:337][E: codex-rs/core/src/session/turn.rs:396][E: codex-rs/core/src/session/turn.rs:406]
9. `run_auto_compact` 根据 provider 和 feature 选择 remote v2、remote 或 local compaction implementation。[E: codex-rs/core/src/session/turn.rs:1012][E: codex-rs/core/src/session/turn.rs:1035][E: codex-rs/core/src/session/turn.rs:1046][E: codex-rs/core/src/session/turn.rs:1063][E: codex-rs/core/src/session/turn.rs:1079]
10. local auto compact 构造 compact prompt，调用 `run_compact_task_inner`；manual compact 会先发送 `TurnStarted` 再进入同一 inner path。[E: codex-rs/core/src/compact.rs:111][E: codex-rs/core/src/compact.rs:118][E: codex-rs/core/src/compact.rs:112][E: codex-rs/core/src/compact.rs:143][E: codex-rs/core/src/compact.rs:148]
11. local compaction inner 克隆 history，把 compact prompt 记录进临时 history，然后用新的 `ModelClientSession` streaming 生成 summary；context window exceeded 时移除最老 history item 后重试。[E: codex-rs/core/src/compact.rs:240][E: codex-rs/core/src/compact.rs:252][E: codex-rs/core/src/compact.rs:253][E: codex-rs/core/src/compact.rs:260][E: codex-rs/core/src/compact.rs:285][E: codex-rs/core/src/compact.rs:315]
12. local compaction 用 summary 和 user messages 构造 replacement history；mid-turn 模式会把 initial context 插到最后一个真实 user message 或 summary 前，并保存当前 turn snapshot 作为新的 baseline。[E: codex-rs/core/src/compact.rs:347][E: codex-rs/core/src/compact.rs:353][E: codex-rs/core/src/compact.rs:332][E: codex-rs/core/src/compact.rs:336][E: codex-rs/core/src/compact.rs:367]
13. remote v1 request preparation 已抽到 `compact_remote_request.rs`：先截短 oversize tool outputs，再用 `history.for_prompt`、`built_tools` 和 model-visible specs 构造 Compact endpoint prompt；remote v2 attempt 同样构造 prompt，但额外 append `CompactionTrigger` 并走普通 Responses stream。[E: codex-rs/core/src/compact_remote_request.rs:23][E: codex-rs/core/src/compact_remote_request.rs:34][E: codex-rs/core/src/compact_remote_request.rs:61][E: codex-rs/core/src/compact_remote_request.rs:63][E: codex-rs/core/src/compact_remote_request.rs:77][E: codex-rs/core/src/compact_remote_v2_attempt.rs:68][E: codex-rs/core/src/compact_remote_v2_attempt.rs:71]
14. `replace_compacted_history` 替换 in-memory history，持久化 `RolloutItem::Compacted`，可选持久化 `RolloutItem::WorldState` 和 `RolloutItem::TurnContext`，并 queue `SessionStartSource::Compact`。[E: codex-rs/core/src/session/mod.rs:3188][E: codex-rs/core/src/session/mod.rs:3211][E: codex-rs/core/src/session/mod.rs:3219][E: codex-rs/core/src/session/mod.rs:3223][E: codex-rs/core/src/session/mod.rs:3227][E: codex-rs/core/src/session/mod.rs:3232]
15. compaction 完成后 local/remote path 都调用 `recompute_token_usage`；普通 token usage 则由 `record_token_usage_info` 从 provider usage 更新 state。[E: codex-rs/core/src/compact.rs:384][E: codex-rs/core/src/compact_remote.rs:303][E: codex-rs/core/src/session/mod.rs:3788][E: codex-rs/core/src/session/mod.rs:3797]

## 关键决策点

- `reference_context_item` 是 context diff baseline；baseline 为空意味着下一次 regular turn 要 full reinject context。[E: codex-rs/core/src/session/mod.rs:3705]
- pre-turn compaction 不注入 initial context，mid-turn compaction 会在 replacement history 内重新插入 initial context 并保存 baseline。[E: codex-rs/core/src/session/turn.rs:865][E: codex-rs/core/src/compact.rs:367]
- 两条 remote compact 都把当前 model-visible tool specs 放入 prompt；local summary stream 不显式加入 tool specs。[E: codex-rs/core/src/compact_remote_request.rs:62][E: codex-rs/core/src/compact_remote_request.rs:65][E: codex-rs/core/src/compact_remote_v2_attempt.rs:70][E: codex-rs/core/src/compact_remote_v2_attempt.rs:74][E: codex-rs/core/src/compact.rs:252][I]

## 深挖入口

- `spine.turn-end-to-end` 说明 context update 与 sampling 的顺序。
- `subsys.core.session-lifecycle` 展开 rollout replay、resume、rollback 与 history version。
- `ref.protocol-event-lifecycle` 列出 context compaction 和 token usage events。

## Sources

- codex-rs/core/src/context_manager/history.rs
- codex-rs/core/src/context_manager/updates.rs
- codex-rs/core/src/context/world_state/mod.rs
- codex-rs/core/src/session/world_state.rs
- codex-rs/core/src/session/mod.rs
- codex-rs/core/src/session/turn.rs
- codex-rs/core/src/compact.rs
- codex-rs/core/src/compact_remote.rs
- codex-rs/core/src/compact_remote_request.rs
- codex-rs/core/src/compact_remote_v2.rs
- codex-rs/core/src/compact_remote_v2_attempt.rs

## 相关

- [一次 turn 端到端](turn-end-to-end.md)
- [SQ/EQ 双队列架构](sq-eq-architecture.md)
- [core session lifecycle](../subsystems/core/session-lifecycle.md)
- 索引 id：`ref.protocol-event-lifecycle`
