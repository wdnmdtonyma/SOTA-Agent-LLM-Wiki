---
id: subsys.core.context-manager
title: Context manager
kind: subsystem
tier: T2
source: [codex-rs/core/src/context_manager/mod.rs, codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/normalize.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/audio_preparation.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/session.rs]
symbols: [ContextManager, ContextManager::record_items, ContextManager::for_prompt, ContextManager::replace, ContextManager::drop_last_n_user_turns, ContextManager::normalize_history, ContextManager::update_world_state, prepare_audio_response_items, build_settings_update_items, Session::record_context_updates_and_set_reference_context_item]
related: [spine.context-and-compaction, subsys.core.turn-engine, subsys.core.instruction-assembly, subsys.core.compaction, subsys.core.memory]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `ContextManager` 是 core session 的 conversation history 与 context-baseline 管理器：它保存 ordered `ResponseItem`、history version、token usage info、`reference_context_item` 和 `world_state_baseline`，`record_items` 只收 API-visible history items 并截断 tool output，`for_prompt` 在送模型前 normalize call/output 与 image/audio modality。[E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/context_manager/history.rs:121]

## 能回答的问题

- session history、token info 和 context diff baseline 存在哪里？
- `record_items` 与 `for_prompt` 分别执行哪些过滤、截断和 normalize？
- 缺失 tool output 或 orphan output 如何在 prompt 前修复？
- `reference_context_item` 如何决定 full initial context 与 settings diff？
- rollback/compaction 如何替换 history 并更新 baseline？
- media payload 如何校验、按模型 modality 过滤，以及 image token estimate 为什么不直接按 base64 长度计算？

## 职责边界

`ContextManager` 只管理 history materialization、rewrites、token estimate 和 prompt 前 normalization；model sampling、tool execution、event emission 由 turn/session/tool 子系统负责。[E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:140][E: codex-rs/core/src/context_manager/history.rs:199][E: codex-rs/core/src/context_manager/history.rs:280][I]

`SessionState` 把 `ContextManager` 作为 session-scoped `history` 字段；session 通过 `record_conversation_items` 写 history/rollout/raw items，通过 `clone_history().for_prompt(...)` 给 turn engine 取 prompt input。[E: codex-rs/core/src/state/session.rs:26][E: codex-rs/core/src/state/session.rs:28][E: codex-rs/core/src/state/session.rs:82][E: codex-rs/core/src/session/mod.rs:2820][E: codex-rs/core/src/session/mod.rs:2827][E: codex-rs/core/src/session/mod.rs:2835][E: codex-rs/core/src/session/mod.rs:3455][E: codex-rs/core/src/session/turn.rs:1158]

## 关键 crate/文件

- `codex-rs/core/src/context_manager/history.rs`: `ContextManager` fields、record/for_prompt、history replace/drop、token usage/estimate 和 normalize glue。[E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:140][E: codex-rs/core/src/context_manager/history.rs:199][E: codex-rs/core/src/context_manager/history.rs:255][E: codex-rs/core/src/context_manager/history.rs:327][E: codex-rs/core/src/context_manager/history.rs:358]
- `codex-rs/core/src/context_manager/normalize.rs`: missing output insertion、orphan output removal、corresponding call/output removal、image stripping。[E: codex-rs/core/src/context_manager/normalize.rs:20][E: codex-rs/core/src/context_manager/normalize.rs:147][E: codex-rs/core/src/context_manager/normalize.rs:222][E: codex-rs/core/src/context_manager/normalize.rs:320]
- `codex-rs/core/src/audio_preparation.rs`: 校验/规范化 message 与 tool-output audio data URL；无效、超限或不支持的音频转换为明确的 text placeholder。[E: codex-rs/core/src/audio_preparation.rs:41][E: codex-rs/core/src/audio_preparation.rs:69][E: codex-rs/core/src/audio_preparation.rs:82][E: codex-rs/core/src/audio_preparation.rs:124]
- `codex-rs/core/src/context_manager/updates.rs`: model-switch、multi-agent mode、personality 三类 non-world-state settings diff，并提供 fragment merge/message helpers。[E: codex-rs/core/src/context_manager/updates.rs:14][E: codex-rs/core/src/context_manager/updates.rs:35][E: codex-rs/core/src/context_manager/updates.rs:70][E: codex-rs/core/src/context_manager/updates.rs:95][E: codex-rs/core/src/context_manager/updates.rs:134]
- `codex-rs/core/src/context/world_state/mod.rs`: world-state snapshot、merge patch 和 retained-fragment diff abstraction。[E: codex-rs/core/src/context/world_state/mod.rs:248][E: codex-rs/core/src/context/world_state/mod.rs:192][E: codex-rs/core/src/context/world_state/mod.rs:212]
- `codex-rs/core/src/session/world_state.rs`: 每 step 聚合 realtime、permissions、collaboration、environment、agents/apps/plugins 与 extension-contributed typed sections。[E: codex-rs/core/src/session/world_state.rs:17][E: codex-rs/core/src/session/world_state.rs:36][E: codex-rs/core/src/session/world_state.rs:44][E: codex-rs/core/src/session/world_state.rs:70][E: codex-rs/core/src/session/world_state.rs:114]
- `codex-rs/core/src/session/mod.rs`: runtime baseline path `record_context_updates_and_set_reference_context_item`、history replacement after compaction/new context window。[E: codex-rs/core/src/session/mod.rs:3021][E: codex-rs/core/src/session/mod.rs:3482][E: codex-rs/core/src/session/mod.rs:3534]

## 数据模型

`ContextManager::new()` starts with empty `items`, `history_version` 0, token info from `TokenUsageInfo::new_or_append(&None, &None, None)`, no `reference_context_item`, and no `world_state_baseline`。[E: codex-rs/core/src/context_manager/history.rs:59][E: codex-rs/core/src/context_manager/history.rs:61][E: codex-rs/core/src/context_manager/history.rs:62][E: codex-rs/core/src/context_manager/history.rs:63][E: codex-rs/core/src/context_manager/history.rs:64][E: codex-rs/core/src/context_manager/history.rs:67][E: codex-rs/core/src/context_manager/history.rs:68]

`reference_context_item` is the optional baseline field for regular model-turn context diffs: missing baseline makes session build full initial context, otherwise it builds settings update items; rollback trimming can clear the baseline to force future full reinjection。[E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/session/mod.rs:3545][E: codex-rs/core/src/session/mod.rs:3550][E: codex-rs/core/src/session/mod.rs:3570][E: codex-rs/core/src/context_manager/history.rs:449]

`is_api_message` keeps non-system `Message`, agent messages, calls, outputs, reasoning, web/image calls, `Compaction`, and `ContextCompaction`; it drops `CompactionTrigger` and `Other` from recorded history。[E: codex-rs/core/src/context_manager/history.rs:487][E: codex-rs/core/src/context_manager/history.rs:489][E: codex-rs/core/src/context_manager/history.rs:490][E: codex-rs/core/src/context_manager/history.rs:502][E: codex-rs/core/src/context_manager/history.rs:503][E: codex-rs/core/src/context_manager/history.rs:504][E: codex-rs/core/src/context_manager/history.rs:505]

## 控制流

1. `SessionState::new` creates `ContextManager::new()` and stores it in `SessionState.history`。[E: codex-rs/core/src/state/session.rs:51][E: codex-rs/core/src/state/session.rs:62][E: codex-rs/core/src/state/session.rs:65]
2. `record_conversation_items` calls `prepare_conversation_items_for_history`，除 media preparation 外还为缺失 id 的 API items 分配 prefixed `ResponseItemId`，再锁 session state、写 history/rollout 并发送 raw items。paginated history 即使 feature gate 不显式开启也要求这些 stable ids。[E: codex-rs/core/src/session/mod.rs:2764][E: codex-rs/core/src/session/mod.rs:2774][E: codex-rs/core/src/session/mod.rs:2780][E: codex-rs/core/src/session/mod.rs:2801][E: codex-rs/core/src/session/mod.rs:2820][E: codex-rs/core/src/session/mod.rs:2835]
3. `ContextManager::record_items` iterates incoming items, skips non-API messages, processes retained items with the configured truncation policy, and pushes processed items into `items`。[E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:126][E: codex-rs/core/src/context_manager/history.rs:128][E: codex-rs/core/src/context_manager/history.rs:132][E: codex-rs/core/src/context_manager/history.rs:133]
4. `process_item` truncates `FunctionCallOutput` and `CustomToolCallOutput` payloads using `policy * 1.2`; messages, calls, reasoning, compaction items and other retained API items are cloned unchanged。[E: codex-rs/core/src/context_manager/history.rs:372][E: codex-rs/core/src/context_manager/history.rs:373][E: codex-rs/core/src/context_manager/history.rs:375][E: codex-rs/core/src/context_manager/history.rs:383][E: codex-rs/core/src/context_manager/history.rs:386][E: codex-rs/core/src/context_manager/history.rs:396][E: codex-rs/core/src/context_manager/history.rs:399][E: codex-rs/core/src/context_manager/history.rs:413]
5. `for_prompt` consumes a cloned `ContextManager`, calls `normalize_history(input_modalities)`, and returns its `items` for model input。[E: codex-rs/core/src/context_manager/history.rs:140][E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:142]
6. `normalize_history` calls `ensure_call_outputs_present`, `remove_orphan_outputs`, then strips unsupported image and audio content according to model input modalities。[E: codex-rs/core/src/context_manager/history.rs:360][E: codex-rs/core/src/context_manager/history.rs:366][E: codex-rs/core/src/context_manager/history.rs:369]
7. `ensure_call_outputs_present` inserts synthetic `"aborted"` function/custom outputs for missing `FunctionCall`, `CustomToolCall`, and `LocalShellCall` outputs; missing client `ToolSearchCall` output becomes a completed empty `ToolSearchOutput`。[E: codex-rs/core/src/context_manager/normalize.rs:20][E: codex-rs/core/src/context_manager/normalize.rs:49][E: codex-rs/core/src/context_manager/normalize.rs:55][E: codex-rs/core/src/context_manager/normalize.rs:58][E: codex-rs/core/src/context_manager/normalize.rs:63][E: codex-rs/core/src/context_manager/normalize.rs:71][E: codex-rs/core/src/context_manager/normalize.rs:74][E: codex-rs/core/src/context_manager/normalize.rs:81][E: codex-rs/core/src/context_manager/normalize.rs:89][E: codex-rs/core/src/context_manager/normalize.rs:99][E: codex-rs/core/src/context_manager/normalize.rs:109]
8. `remove_orphan_outputs` retains function outputs only when matching a `FunctionCall` or `LocalShellCall`; custom/tool-search outputs require matching calls except server tool-search output and tool-search output with no call id。[E: codex-rs/core/src/context_manager/normalize.rs:147][E: codex-rs/core/src/context_manager/normalize.rs:148][E: codex-rs/core/src/context_manager/normalize.rs:167][E: codex-rs/core/src/context_manager/normalize.rs:186][E: codex-rs/core/src/context_manager/normalize.rs:187][E: codex-rs/core/src/context_manager/normalize.rs:189][E: codex-rs/core/src/context_manager/normalize.rs:197][E: codex-rs/core/src/context_manager/normalize.rs:206][E: codex-rs/core/src/context_manager/normalize.rs:217]
9. `remove_first_item` removes the oldest item and then calls `normalize::remove_corresponding_for` so call/output counterparts do not survive alone。[E: codex-rs/core/src/context_manager/history.rs:186][E: codex-rs/core/src/context_manager/history.rs:190][E: codex-rs/core/src/context_manager/history.rs:194]
10. `replace` swaps the full `items` vector and increments `history_version`; session-level `replace_compacted_history` additionally replaces `reference_context_item`, persists compacted rollout item, and persists the turn context baseline when present。[E: codex-rs/core/src/context_manager/history.rs:199][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:201][E: codex-rs/core/src/session/mod.rs:3021][E: codex-rs/core/src/session/mod.rs:3041][E: codex-rs/core/src/session/mod.rs:3050][E: codex-rs/core/src/session/mod.rs:3057]
11. `record_context_updates_and_set_reference_context_item` chooses full initial context when no baseline exists, otherwise steady-state settings diff items plus world-state diff items; it persists `RolloutItem::WorldState` when the world-state snapshot changed, persists `RolloutItem::TurnContext` for real user turns, and advances the in-memory settings baseline even when no model-visible context items were emitted。[E: codex-rs/core/src/session/mod.rs:3534][E: codex-rs/core/src/session/mod.rs:3545][E: codex-rs/core/src/session/mod.rs:3548][E: codex-rs/core/src/session/mod.rs:3570][E: codex-rs/core/src/session/mod.rs:3575][E: codex-rs/core/src/session/mod.rs:3581][E: codex-rs/core/src/session/mod.rs:3600][E: codex-rs/core/src/session/mod.rs:3610][E: codex-rs/core/src/session/mod.rs:3615][E: codex-rs/core/src/session/mod.rs:3616]
12. `build_settings_update_items` may emit one developer message for model switch、multi-agent mode、personality；typed world-state sections (including permissions/collaboration/realtime/environment) are diffed separately through `ContextManager::update_world_state` and merged by role。[E: codex-rs/core/src/context_manager/updates.rs:134][E: codex-rs/core/src/context_manager/updates.rs:144][E: codex-rs/core/src/context_manager/updates.rs:155][E: codex-rs/core/src/session/mod.rs:3575][E: codex-rs/core/src/session/mod.rs:3577]
13. rollback uses `drop_last_n_user_turns` to select a cut index, then `trim_pre_turn_context_updates`; if a trimmed developer message is a mixed initial-context bundle, the baseline is cleared so the next turn falls back to full reinjection。[E: codex-rs/core/src/context_manager/history.rs:255][E: codex-rs/core/src/context_manager/history.rs:274][E: codex-rs/core/src/context_manager/history.rs:277][E: codex-rs/core/src/context_manager/history.rs:434][E: codex-rs/core/src/context_manager/history.rs:440][E: codex-rs/core/src/context_manager/history.rs:445][E: codex-rs/core/src/context_manager/history.rs:449]

## Token 与 image estimate

在 durable history boundary，session 先对 media 做 copy-on-write preparation：image 与 audio 都只改将进入 in-memory/model history 的副本，不回写 persisted rollout。audio 必须是支持 MIME 的 base64 data URL 且不过大小上限；失败项变为 text placeholder。resume/fork 安装历史时也会重跑 preparation。[E: codex-rs/core/src/session/mod.rs:1367][E: codex-rs/core/src/session/mod.rs:2764][E: codex-rs/core/src/session/mod.rs:2768][E: codex-rs/core/src/audio_preparation.rs:124][E: codex-rs/core/src/audio_preparation.rs:151]

`get_total_token_usage` starts from last server token usage, adds estimated tokens after the last model-generated item, and adds non-last reasoning tokens only when server reasoning was not already included。[E: codex-rs/core/src/context_manager/history.rs:327][E: codex-rs/core/src/context_manager/history.rs:328][E: codex-rs/core/src/context_manager/history.rs:333][E: codex-rs/core/src/context_manager/history.rs:338][E: codex-rs/core/src/context_manager/history.rs:341]

`estimate_response_item_model_visible_bytes` treats encrypted reasoning/compaction via decoded-length estimates; other items use serialized JSON size adjusted by inline image data-url estimates and encrypted function-output estimates。[E: codex-rs/core/src/context_manager/history.rs:548][E: codex-rs/core/src/context_manager/history.rs:550][E: codex-rs/core/src/context_manager/history.rs:554][E: codex-rs/core/src/context_manager/history.rs:558][E: codex-rs/core/src/context_manager/history.rs:563][E: codex-rs/core/src/context_manager/history.rs:566][E: codex-rs/core/src/context_manager/history.rs:568][E: codex-rs/core/src/context_manager/history.rs:573][E: codex-rs/core/src/context_manager/history.rs:576]

Image estimates only discount `data:image/...;base64,...` URLs; `detail: "original"` attempts base64 decode and image decode to count 32px patches capped at 10,000, otherwise it falls back to the resized-image byte estimate。[E: codex-rs/core/src/context_manager/history.rs:587][E: codex-rs/core/src/context_manager/history.rs:604][E: codex-rs/core/src/context_manager/history.rs:610][E: codex-rs/core/src/context_manager/history.rs:616][E: codex-rs/core/src/context_manager/history.rs:626][E: codex-rs/core/src/context_manager/history.rs:633][E: codex-rs/core/src/context_manager/history.rs:642][E: codex-rs/core/src/context_manager/history.rs:647][E: codex-rs/core/src/context_manager/history.rs:666]

## 设计动机与权衡

History normalization happens at prompt materialization time, not every time an item is recorded. This lets the live stream temporarily contain incomplete call/output pairs while still repairing them before the next model request。[E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:140][E: codex-rs/core/src/context_manager/history.rs:358][I]

`reference_context_item` avoids reinjecting full initial context on every regular turn; rollback deliberately clears it when a mixed initial-context bundle is trimmed, favoring full reinjection over diffing against an unreconstructable baseline。[E: codex-rs/core/src/session/mod.rs:3545][E: codex-rs/core/src/session/mod.rs:3570][E: codex-rs/core/src/context_manager/history.rs:445][E: codex-rs/core/src/context_manager/history.rs:449][I]

## gotcha

- `raw_items()` and `for_prompt()` are different surfaces: `raw_items()` returns stored items, while `for_prompt()` consumes a snapshot after normalize。[E: codex-rs/core/src/context_manager/history.rs:140][E: codex-rs/core/src/context_manager/history.rs:146]
- `CompactionTrigger` is not recorded as an API message, while `Compaction` and `ContextCompaction` are。[E: codex-rs/core/src/context_manager/history.rs:502][E: codex-rs/core/src/context_manager/history.rs:503][E: codex-rs/core/src/context_manager/history.rs:504]
- `replace_history` clears the auto-compact prefill through `SessionState::replace_history`; compaction paths also persist compacted rollout state.[E: codex-rs/core/src/state/session.rs:114][E: codex-rs/core/src/state/session.rs:119][E: codex-rs/core/src/state/session.rs:122][E: codex-rs/core/src/session/mod.rs:3050]

## Sources

- `codex-rs/core/src/context_manager/mod.rs`
- `codex-rs/core/src/context_manager/history.rs`
- `codex-rs/core/src/context_manager/normalize.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/audio_preparation.rs`
- `codex-rs/core/src/context/world_state/mod.rs`
- `codex-rs/core/src/session/world_state.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/state/session.rs`

## 相关

- [Context and compaction](../../spine/context-and-compaction.md) — T0 history/compaction 图解。
- [指令/prompt 装配](instruction-assembly.md) — initial context 和 settings diff 的 fragment 来源。
- [Compaction](compaction.md) — replacement history 如何更新 `ContextManager`。
