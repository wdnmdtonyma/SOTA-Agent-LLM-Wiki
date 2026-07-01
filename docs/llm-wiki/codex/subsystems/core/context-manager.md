---
id: subsys.core.context-manager
title: Context manager
kind: subsystem
tier: T2
source: [codex-rs/core/src/context_manager/mod.rs, codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/normalize.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/session.rs]
symbols: [ContextManager, ContextManager::record_items, ContextManager::for_prompt, ContextManager::replace, ContextManager::drop_last_n_user_turns, ContextManager::normalize_history, ContextManager::update_world_state, build_settings_update_items, Session::record_context_updates_and_set_reference_context_item]
related: [spine.context-and-compaction, subsys.core.turn-engine, subsys.core.instruction-assembly, subsys.core.compaction, subsys.core.memory]
evidence: explicit
status: verified
updated: db887d03e1
---

> `ContextManager` 是 core session 的 conversation history 与 context-baseline 管理器：它保存 ordered `ResponseItem`、history version、token usage info、`reference_context_item` 和 `world_state_baseline`，`record_items` 只收 API-visible history items 并截断 tool output，`for_prompt` 在送模型前 normalize call/output 与 image modality。[E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:40][E: codex-rs/core/src/context_manager/history.rs:42][E: codex-rs/core/src/context_manager/history.rs:43][E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/context_manager/history.rs:56][E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:359]

## 能回答的问题

- session history、token info 和 context diff baseline 存在哪里？
- `record_items` 与 `for_prompt` 分别执行哪些过滤、截断和 normalize？
- 缺失 tool output 或 orphan output 如何在 prompt 前修复？
- `reference_context_item` 如何决定 full initial context 与 settings diff？
- rollback/compaction 如何替换 history 并更新 baseline？
- image payload token estimate 为什么不直接按 base64 长度计算？

## 职责边界

`ContextManager` 只管理 history materialization、rewrites、token estimate 和 prompt 前 normalization；model sampling、tool execution、event emission 由 turn/session/tool 子系统负责。[E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:281][I]

`SessionState` 把 `ContextManager` 作为 session-scoped `history` 字段；session 通过 `record_conversation_items` 写 history/rollout/raw items，通过 `clone_history().for_prompt(...)` 给 turn engine 取 prompt input。[E: codex-rs/core/src/state/session.rs:26][E: codex-rs/core/src/state/session.rs:28][E: codex-rs/core/src/state/session.rs:82][E: codex-rs/core/src/session/mod.rs:2775][E: codex-rs/core/src/session/mod.rs:2782][E: codex-rs/core/src/session/mod.rs:2790][E: codex-rs/core/src/session/mod.rs:3473][E: codex-rs/core/src/session/turn.rs:1107]

## 关键 crate/文件

- `codex-rs/core/src/context_manager/history.rs`: `ContextManager` fields、record/for_prompt、history replace/drop、token usage/estimate 和 normalize glue。[E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:256][E: codex-rs/core/src/context_manager/history.rs:328][E: codex-rs/core/src/context_manager/history.rs:359]
- `codex-rs/core/src/context_manager/normalize.rs`: missing output insertion、orphan output removal、corresponding call/output removal、image stripping。[E: codex-rs/core/src/context_manager/normalize.rs:17][E: codex-rs/core/src/context_manager/normalize.rs:144][E: codex-rs/core/src/context_manager/normalize.rs:219][E: codex-rs/core/src/context_manager/normalize.rs:317]
- `codex-rs/core/src/context_manager/updates.rs`: permissions、collaboration mode、multi-agent mode、realtime、personality、model-switch settings diff builders。[E: codex-rs/core/src/context_manager/updates.rs:21][E: codex-rs/core/src/context_manager/updates.rs:56][E: codex-rs/core/src/context_manager/updates.rs:77][E: codex-rs/core/src/context_manager/updates.rs:99][E: codex-rs/core/src/context_manager/updates.rs:136][E: codex-rs/core/src/context_manager/updates.rs:171][E: codex-rs/core/src/context_manager/updates.rs:235]
- `codex-rs/core/src/context/world_state/mod.rs`: world-state snapshot、merge patch 和 retained-fragment diff abstraction。[E: codex-rs/core/src/context/world_state/mod.rs:192][E: codex-rs/core/src/context/world_state/mod.rs:201][E: codex-rs/core/src/context/world_state/mod.rs:210][E: codex-rs/core/src/context/world_state/mod.rs:176][E: codex-rs/core/src/context/world_state/mod.rs:186]
- `codex-rs/core/src/session/mod.rs`: runtime baseline path `record_context_updates_and_set_reference_context_item`、history replacement after compaction/new context window。[E: codex-rs/core/src/session/mod.rs:2975][E: codex-rs/core/src/session/mod.rs:3500][E: codex-rs/core/src/session/mod.rs:3552]

## 数据模型

`ContextManager::new()` starts with empty `items`, `history_version` 0, token info from `TokenUsageInfo::new_or_append(&None, &None, None)`, no `reference_context_item`, and no `world_state_baseline`。[E: codex-rs/core/src/context_manager/history.rs:59][E: codex-rs/core/src/context_manager/history.rs:61][E: codex-rs/core/src/context_manager/history.rs:62][E: codex-rs/core/src/context_manager/history.rs:63][E: codex-rs/core/src/context_manager/history.rs:64][E: codex-rs/core/src/context_manager/history.rs:67][E: codex-rs/core/src/context_manager/history.rs:68]

`reference_context_item` is the optional baseline field for regular model-turn context diffs: missing baseline makes session build full initial context, otherwise it builds settings update items; rollback trimming can clear the baseline to force future full reinjection。[E: codex-rs/core/src/context_manager/history.rs:54][E: codex-rs/core/src/session/mod.rs:3563][E: codex-rs/core/src/session/mod.rs:3568][E: codex-rs/core/src/session/mod.rs:3588][E: codex-rs/core/src/context_manager/history.rs:447]

`is_api_message` keeps non-system `Message`, agent messages, calls, outputs, reasoning, web/image calls, `Compaction`, and `ContextCompaction`; it drops `CompactionTrigger` and `Other` from recorded history。[E: codex-rs/core/src/context_manager/history.rs:485][E: codex-rs/core/src/context_manager/history.rs:487][E: codex-rs/core/src/context_manager/history.rs:488][E: codex-rs/core/src/context_manager/history.rs:500][E: codex-rs/core/src/context_manager/history.rs:501][E: codex-rs/core/src/context_manager/history.rs:502][E: codex-rs/core/src/context_manager/history.rs:503]

## 控制流

1. `SessionState::new` creates `ContextManager::new()` and stores it in `SessionState.history`。[E: codex-rs/core/src/state/session.rs:51][E: codex-rs/core/src/state/session.rs:62][E: codex-rs/core/src/state/session.rs:65]
2. `record_conversation_items` calls `prepare_conversation_items_for_history`, locks session state, delegates to `state.record_items`, persists rollout response items, then sends raw response items to observers。[E: codex-rs/core/src/session/mod.rs:2775][E: codex-rs/core/src/session/mod.rs:2780][E: codex-rs/core/src/session/mod.rs:2782][E: codex-rs/core/src/session/mod.rs:2785][E: codex-rs/core/src/session/mod.rs:2790][E: codex-rs/core/src/session/mod.rs:2791]
3. `ContextManager::record_items` iterates incoming items, skips non-API messages, processes retained items with the configured truncation policy, and pushes processed items into `items`。[E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:126][E: codex-rs/core/src/context_manager/history.rs:128][E: codex-rs/core/src/context_manager/history.rs:132][E: codex-rs/core/src/context_manager/history.rs:133]
4. `process_item` truncates `FunctionCallOutput` and `CustomToolCallOutput` payloads using `policy * 1.2`; messages, calls, reasoning, compaction items and other retained API items are cloned unchanged。[E: codex-rs/core/src/context_manager/history.rs:370][E: codex-rs/core/src/context_manager/history.rs:371][E: codex-rs/core/src/context_manager/history.rs:373][E: codex-rs/core/src/context_manager/history.rs:381][E: codex-rs/core/src/context_manager/history.rs:384][E: codex-rs/core/src/context_manager/history.rs:394][E: codex-rs/core/src/context_manager/history.rs:397][E: codex-rs/core/src/context_manager/history.rs:411]
5. `for_prompt` consumes a cloned `ContextManager`, calls `normalize_history(input_modalities)`, and returns its `items` for model input。[E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:142][E: codex-rs/core/src/context_manager/history.rs:143]
6. `normalize_history` calls `ensure_call_outputs_present`, `remove_orphan_outputs`, then `strip_images_when_unsupported`。[E: codex-rs/core/src/context_manager/history.rs:359][E: codex-rs/core/src/context_manager/history.rs:361][E: codex-rs/core/src/context_manager/history.rs:364][E: codex-rs/core/src/context_manager/history.rs:367]
7. `ensure_call_outputs_present` inserts synthetic `"aborted"` function/custom outputs for missing `FunctionCall`, `CustomToolCall`, and `LocalShellCall` outputs; missing client `ToolSearchCall` output becomes a completed empty `ToolSearchOutput`。[E: codex-rs/core/src/context_manager/normalize.rs:17][E: codex-rs/core/src/context_manager/normalize.rs:46][E: codex-rs/core/src/context_manager/normalize.rs:52][E: codex-rs/core/src/context_manager/normalize.rs:55][E: codex-rs/core/src/context_manager/normalize.rs:60][E: codex-rs/core/src/context_manager/normalize.rs:68][E: codex-rs/core/src/context_manager/normalize.rs:71][E: codex-rs/core/src/context_manager/normalize.rs:78][E: codex-rs/core/src/context_manager/normalize.rs:86][E: codex-rs/core/src/context_manager/normalize.rs:96][E: codex-rs/core/src/context_manager/normalize.rs:106]
8. `remove_orphan_outputs` retains function outputs only when matching a `FunctionCall` or `LocalShellCall`; custom/tool-search outputs require matching calls except server tool-search output and tool-search output with no call id。[E: codex-rs/core/src/context_manager/normalize.rs:144][E: codex-rs/core/src/context_manager/normalize.rs:145][E: codex-rs/core/src/context_manager/normalize.rs:164][E: codex-rs/core/src/context_manager/normalize.rs:183][E: codex-rs/core/src/context_manager/normalize.rs:184][E: codex-rs/core/src/context_manager/normalize.rs:186][E: codex-rs/core/src/context_manager/normalize.rs:194][E: codex-rs/core/src/context_manager/normalize.rs:203][E: codex-rs/core/src/context_manager/normalize.rs:214]
9. `remove_first_item` removes the oldest item and then calls `normalize::remove_corresponding_for` so call/output counterparts do not survive alone。[E: codex-rs/core/src/context_manager/history.rs:187][E: codex-rs/core/src/context_manager/history.rs:191][E: codex-rs/core/src/context_manager/history.rs:195]
10. `replace` swaps the full `items` vector and increments `history_version`; session-level `replace_compacted_history` additionally replaces `reference_context_item`, persists compacted rollout item, and persists the turn context baseline when present。[E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:201][E: codex-rs/core/src/context_manager/history.rs:202][E: codex-rs/core/src/session/mod.rs:2975][E: codex-rs/core/src/session/mod.rs:2995][E: codex-rs/core/src/session/mod.rs:3004][E: codex-rs/core/src/session/mod.rs:3011]
11. `record_context_updates_and_set_reference_context_item` chooses full initial context when no baseline exists, otherwise steady-state settings diff items plus world-state diff items; it persists `RolloutItem::WorldState` when the world-state snapshot changed, persists `RolloutItem::TurnContext` for real user turns, and advances the in-memory settings baseline even when no model-visible context items were emitted。[E: codex-rs/core/src/session/mod.rs:3552][E: codex-rs/core/src/session/mod.rs:3563][E: codex-rs/core/src/session/mod.rs:3566][E: codex-rs/core/src/session/mod.rs:3588][E: codex-rs/core/src/session/mod.rs:3593][E: codex-rs/core/src/session/mod.rs:3599][E: codex-rs/core/src/session/mod.rs:3618][E: codex-rs/core/src/session/mod.rs:3628][E: codex-rs/core/src/session/mod.rs:3633][E: codex-rs/core/src/session/mod.rs:3634]
12. `build_settings_update_items` may emit a developer update for model instructions, permissions, collaboration mode, multi-agent mode, realtime and personality diffs; world-state/environment diffs are merged separately through `ContextManager::update_world_state`。[E: codex-rs/core/src/context_manager/updates.rs:235][E: codex-rs/core/src/context_manager/updates.rs:246][E: codex-rs/core/src/context_manager/updates.rs:249][E: codex-rs/core/src/context_manager/updates.rs:250][E: codex-rs/core/src/context_manager/updates.rs:251][E: codex-rs/core/src/context_manager/updates.rs:252][E: codex-rs/core/src/context_manager/updates.rs:253][E: codex-rs/core/src/context_manager/updates.rs:254][E: codex-rs/core/src/context_manager/updates.rs:260][E: codex-rs/core/src/session/mod.rs:3593][E: codex-rs/core/src/session/mod.rs:3595]
13. rollback uses `drop_last_n_user_turns` to select a cut index, then `trim_pre_turn_context_updates`; if a trimmed developer message is a mixed initial-context bundle, the baseline is cleared so the next turn falls back to full reinjection。[E: codex-rs/core/src/context_manager/history.rs:256][E: codex-rs/core/src/context_manager/history.rs:275][E: codex-rs/core/src/context_manager/history.rs:278][E: codex-rs/core/src/context_manager/history.rs:432][E: codex-rs/core/src/context_manager/history.rs:438][E: codex-rs/core/src/context_manager/history.rs:443][E: codex-rs/core/src/context_manager/history.rs:447]

## Token 与 image estimate

`get_total_token_usage` starts from last server token usage, adds estimated tokens after the last model-generated item, and adds non-last reasoning tokens only when server reasoning was not already included。[E: codex-rs/core/src/context_manager/history.rs:328][E: codex-rs/core/src/context_manager/history.rs:329][E: codex-rs/core/src/context_manager/history.rs:334][E: codex-rs/core/src/context_manager/history.rs:339][E: codex-rs/core/src/context_manager/history.rs:342]

`estimate_response_item_model_visible_bytes` treats encrypted reasoning/compaction via decoded-length estimates; other items use serialized JSON size adjusted by inline image data-url estimates and encrypted function-output estimates。[E: codex-rs/core/src/context_manager/history.rs:546][E: codex-rs/core/src/context_manager/history.rs:548][E: codex-rs/core/src/context_manager/history.rs:552][E: codex-rs/core/src/context_manager/history.rs:556][E: codex-rs/core/src/context_manager/history.rs:561][E: codex-rs/core/src/context_manager/history.rs:564][E: codex-rs/core/src/context_manager/history.rs:566][E: codex-rs/core/src/context_manager/history.rs:571][E: codex-rs/core/src/context_manager/history.rs:574]

Image estimates only discount `data:image/...;base64,...` URLs; `detail: "original"` attempts base64 decode and image decode to count 32px patches capped at 10,000, otherwise it falls back to the resized-image byte estimate。[E: codex-rs/core/src/context_manager/history.rs:585][E: codex-rs/core/src/context_manager/history.rs:602][E: codex-rs/core/src/context_manager/history.rs:608][E: codex-rs/core/src/context_manager/history.rs:614][E: codex-rs/core/src/context_manager/history.rs:624][E: codex-rs/core/src/context_manager/history.rs:631][E: codex-rs/core/src/context_manager/history.rs:640][E: codex-rs/core/src/context_manager/history.rs:645][E: codex-rs/core/src/context_manager/history.rs:664]

## 设计动机与权衡

History normalization happens at prompt materialization time, not every time an item is recorded. This lets the live stream temporarily contain incomplete call/output pairs while still repairing them before the next model request。[E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:359][I]

`reference_context_item` avoids reinjecting full initial context on every regular turn; rollback deliberately clears it when a mixed initial-context bundle is trimmed, favoring full reinjection over diffing against an unreconstructable baseline。[E: codex-rs/core/src/session/mod.rs:3563][E: codex-rs/core/src/session/mod.rs:3588][E: codex-rs/core/src/context_manager/history.rs:443][E: codex-rs/core/src/context_manager/history.rs:447][I]

## gotcha

- `raw_items()` and `for_prompt()` are different surfaces: `raw_items()` returns stored items, while `for_prompt()` consumes a snapshot after normalize。[E: codex-rs/core/src/context_manager/history.rs:141][E: codex-rs/core/src/context_manager/history.rs:147]
- `CompactionTrigger` is not recorded as an API message, while `Compaction` and `ContextCompaction` are。[E: codex-rs/core/src/context_manager/history.rs:500][E: codex-rs/core/src/context_manager/history.rs:501][E: codex-rs/core/src/context_manager/history.rs:502]
- `replace_history` clears the auto-compact prefill through `SessionState::replace_history`; compaction paths also persist compacted rollout state.[E: codex-rs/core/src/state/session.rs:114][E: codex-rs/core/src/state/session.rs:119][E: codex-rs/core/src/state/session.rs:122][E: codex-rs/core/src/session/mod.rs:3004]

## Sources

- `codex-rs/core/src/context_manager/mod.rs`
- `codex-rs/core/src/context_manager/history.rs`
- `codex-rs/core/src/context_manager/normalize.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/context/world_state/mod.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/state/session.rs`

## 相关

- [Context and compaction](../../spine/context-and-compaction.md) — T0 history/compaction 图解。
- [指令/prompt 装配](instruction-assembly.md) — initial context 和 settings diff 的 fragment 来源。
- [Compaction](compaction.md) — replacement history 如何更新 `ContextManager`。
