---
id: subsys.core.context-manager
title: Context manager
kind: subsystem
tier: T2
source: [codex-rs/core/src/context_manager/mod.rs, codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/normalize.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/session.rs]
symbols: [ContextManager, ContextManager::record_items, ContextManager::for_prompt, ContextManager::replace, ContextManager::drop_last_n_user_turns, ContextManager::normalize_history, build_settings_update_items, Session::record_context_updates_and_set_reference_context_item]
related: [spine.context-and-compaction, subsys.core.turn-engine, subsys.core.instruction-assembly, subsys.core.compaction, subsys.core.memory]
evidence: explicit
status: verified
updated: 5670360009
---

> `ContextManager` 是 core session 的 conversation history 与 context-baseline 管理器：它保存 ordered `ResponseItem`、history version、token usage info 和 `reference_context_item`，`record_items` 只收 API-visible history items 并截断 tool output，`for_prompt` 在送模型前 normalize call/output 与 image modality。[E: codex-rs/core/src/context_manager/history.rs:34][E: codex-rs/core/src/context_manager/history.rs:36][E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:39][E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/context_manager/history.rs:91][E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:327]

## 能回答的问题

- session history、token info 和 context diff baseline 存在哪里？
- `record_items` 与 `for_prompt` 分别执行哪些过滤、截断和 normalize？
- 缺失 tool output 或 orphan output 如何在 prompt 前修复？
- `reference_context_item` 如何决定 full initial context 与 settings diff？
- rollback/compaction 如何替换 history 并更新 baseline？
- image payload token estimate 为什么不直接按 base64 长度计算？

## 职责边界

`ContextManager` 只管理 history materialization、rewrites、token estimate 和 prompt 前 normalization；model sampling、tool execution、event emission 由 turn/session/tool 子系统负责。[E: codex-rs/core/src/context_manager/history.rs:91][E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:169][E: codex-rs/core/src/context_manager/history.rs:249][I]

`SessionState` 把 `ContextManager` 作为 session-scoped `history` 字段；session 通过 `record_conversation_items` 写 history/rollout/raw items，通过 `clone_history().for_prompt(...)` 给 turn engine 取 prompt input。[E: codex-rs/core/src/state/session.rs:24][E: codex-rs/core/src/state/session.rs:26][E: codex-rs/core/src/state/session.rs:67][E: codex-rs/core/src/session/mod.rs:2670][E: codex-rs/core/src/session/mod.rs:2677][E: codex-rs/core/src/session/mod.rs:2684][E: codex-rs/core/src/session/mod.rs:3132][E: codex-rs/core/src/session/turn.rs:223]

## 关键 crate/文件

- `codex-rs/core/src/context_manager/history.rs`: `ContextManager` fields、record/for_prompt、history replace/drop、token usage/estimate 和 normalize glue。[E: codex-rs/core/src/context_manager/history.rs:34][E: codex-rs/core/src/context_manager/history.rs:91][E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:169][E: codex-rs/core/src/context_manager/history.rs:224][E: codex-rs/core/src/context_manager/history.rs:296][E: codex-rs/core/src/context_manager/history.rs:327]
- `codex-rs/core/src/context_manager/normalize.rs`: missing output insertion、orphan output removal、corresponding call/output removal、image stripping。[E: codex-rs/core/src/context_manager/normalize.rs:14][E: codex-rs/core/src/context_manager/normalize.rs:124][E: codex-rs/core/src/context_manager/normalize.rs:199][E: codex-rs/core/src/context_manager/normalize.rs:297]
- `codex-rs/core/src/context_manager/updates.rs`: environment、permissions、collaboration mode、realtime、personality、model-switch settings diff builders。[E: codex-rs/core/src/context_manager/updates.rs:21][E: codex-rs/core/src/context_manager/updates.rs:42][E: codex-rs/core/src/context_manager/updates.rs:77][E: codex-rs/core/src/context_manager/updates.rs:98][E: codex-rs/core/src/context_manager/updates.rs:135][E: codex-rs/core/src/context_manager/updates.rs:170][E: codex-rs/core/src/context_manager/updates.rs:214]
- `codex-rs/core/src/session/mod.rs`: runtime baseline path `record_context_updates_and_set_reference_context_item`、history replacement after compaction/new context window。[E: codex-rs/core/src/session/mod.rs:2781][E: codex-rs/core/src/session/mod.rs:3154][E: codex-rs/core/src/session/mod.rs:3206]

## 数据模型

`ContextManager::new()` starts with empty `items`, `history_version` 0, token info from `TokenUsageInfo::new_or_append(&None, &None, None)`, and no `reference_context_item`。[E: codex-rs/core/src/context_manager/history.rs:53][E: codex-rs/core/src/context_manager/history.rs:55][E: codex-rs/core/src/context_manager/history.rs:56][E: codex-rs/core/src/context_manager/history.rs:57][E: codex-rs/core/src/context_manager/history.rs:58][E: codex-rs/core/src/context_manager/history.rs:61]

`reference_context_item` is the optional baseline field for regular model-turn context diffs: missing baseline makes session build full initial context, otherwise it builds settings update items; rollback trimming can clear the baseline to force future full reinjection。[E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/session/mod.rs:3214][E: codex-rs/core/src/session/mod.rs:3216][E: codex-rs/core/src/session/mod.rs:3219][E: codex-rs/core/src/context_manager/history.rs:414]

`is_api_message` keeps non-system `Message`, agent messages, calls, outputs, reasoning, web/image calls, `Compaction`, and `ContextCompaction`; it drops `CompactionTrigger` and `Other` from recorded history。[E: codex-rs/core/src/context_manager/history.rs:452][E: codex-rs/core/src/context_manager/history.rs:454][E: codex-rs/core/src/context_manager/history.rs:455][E: codex-rs/core/src/context_manager/history.rs:466][E: codex-rs/core/src/context_manager/history.rs:467][E: codex-rs/core/src/context_manager/history.rs:468][E: codex-rs/core/src/context_manager/history.rs:469]

## 控制流

1. `SessionState::new` creates `ContextManager::new()` and stores it in `SessionState.history`。[E: codex-rs/core/src/state/session.rs:47][E: codex-rs/core/src/state/session.rs:48][E: codex-rs/core/src/state/session.rs:51]
2. `record_conversation_items` calls `prepare_conversation_items_for_history`, locks session state, delegates to `state.record_items`, persists rollout response items, then sends raw response items to observers。[E: codex-rs/core/src/session/mod.rs:2670][E: codex-rs/core/src/session/mod.rs:2675][E: codex-rs/core/src/session/mod.rs:2677][E: codex-rs/core/src/session/mod.rs:2679][E: codex-rs/core/src/session/mod.rs:2684][E: codex-rs/core/src/session/mod.rs:2685]
3. `ContextManager::record_items` iterates incoming items, skips non-API messages, processes retained items with the configured truncation policy, and pushes processed items into `items`。[E: codex-rs/core/src/context_manager/history.rs:91][E: codex-rs/core/src/context_manager/history.rs:96][E: codex-rs/core/src/context_manager/history.rs:98][E: codex-rs/core/src/context_manager/history.rs:102][E: codex-rs/core/src/context_manager/history.rs:103]
4. `process_item` truncates `FunctionCallOutput` and `CustomToolCallOutput` payloads using `policy * 1.2`; messages, calls, reasoning, compaction items and other retained API items are cloned unchanged。[E: codex-rs/core/src/context_manager/history.rs:338][E: codex-rs/core/src/context_manager/history.rs:339][E: codex-rs/core/src/context_manager/history.rs:341][E: codex-rs/core/src/context_manager/history.rs:349][E: codex-rs/core/src/context_manager/history.rs:352][E: codex-rs/core/src/context_manager/history.rs:362][E: codex-rs/core/src/context_manager/history.rs:365][E: codex-rs/core/src/context_manager/history.rs:378]
5. `for_prompt` consumes a cloned `ContextManager`, calls `normalize_history(input_modalities)`, and returns its `items` for model input。[E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:112][E: codex-rs/core/src/context_manager/history.rs:113]
6. `normalize_history` calls `ensure_call_outputs_present`, `remove_orphan_outputs`, then `strip_images_when_unsupported`。[E: codex-rs/core/src/context_manager/history.rs:327][E: codex-rs/core/src/context_manager/history.rs:329][E: codex-rs/core/src/context_manager/history.rs:332][E: codex-rs/core/src/context_manager/history.rs:335]
7. `ensure_call_outputs_present` inserts synthetic `"aborted"` function/custom outputs for missing `FunctionCall`, `CustomToolCall`, and `LocalShellCall` outputs; missing client `ToolSearchCall` output becomes a completed empty `ToolSearchOutput`。[E: codex-rs/core/src/context_manager/normalize.rs:14][E: codex-rs/core/src/context_manager/normalize.rs:43][E: codex-rs/core/src/context_manager/normalize.rs:49][E: codex-rs/core/src/context_manager/normalize.rs:52][E: codex-rs/core/src/context_manager/normalize.rs:57][E: codex-rs/core/src/context_manager/normalize.rs:64][E: codex-rs/core/src/context_manager/normalize.rs:67][E: codex-rs/core/src/context_manager/normalize.rs:74][E: codex-rs/core/src/context_manager/normalize.rs:82][E: codex-rs/core/src/context_manager/normalize.rs:92][E: codex-rs/core/src/context_manager/normalize.rs:101]
8. `remove_orphan_outputs` retains function outputs only when matching a `FunctionCall` or `LocalShellCall`; custom/tool-search outputs require matching calls except server tool-search output and tool-search output with no call id。[E: codex-rs/core/src/context_manager/normalize.rs:124][E: codex-rs/core/src/context_manager/normalize.rs:125][E: codex-rs/core/src/context_manager/normalize.rs:144][E: codex-rs/core/src/context_manager/normalize.rs:163][E: codex-rs/core/src/context_manager/normalize.rs:164][E: codex-rs/core/src/context_manager/normalize.rs:166][E: codex-rs/core/src/context_manager/normalize.rs:174][E: codex-rs/core/src/context_manager/normalize.rs:183][E: codex-rs/core/src/context_manager/normalize.rs:194]
9. `remove_first_item` removes the oldest item and then calls `normalize::remove_corresponding_for` so call/output counterparts do not survive alone。[E: codex-rs/core/src/context_manager/history.rs:157][E: codex-rs/core/src/context_manager/history.rs:161][E: codex-rs/core/src/context_manager/history.rs:165]
10. `replace` swaps the full `items` vector and increments `history_version`; session-level `replace_compacted_history` additionally replaces `reference_context_item`, persists compacted rollout item, and persists the turn context baseline when present。[E: codex-rs/core/src/context_manager/history.rs:169][E: codex-rs/core/src/context_manager/history.rs:170][E: codex-rs/core/src/context_manager/history.rs:171][E: codex-rs/core/src/session/mod.rs:2781][E: codex-rs/core/src/session/mod.rs:2788][E: codex-rs/core/src/session/mod.rs:2792][E: codex-rs/core/src/session/mod.rs:2794]
11. `record_context_updates_and_set_reference_context_item` chooses full initial context when no baseline exists, otherwise steady-state settings diff items; it persists `RolloutItem::TurnContext` every real user turn and advances the in-memory baseline even when no model-visible context items were emitted。[E: codex-rs/core/src/session/mod.rs:3206][E: codex-rs/core/src/session/mod.rs:3214][E: codex-rs/core/src/session/mod.rs:3215][E: codex-rs/core/src/session/mod.rs:3219][E: codex-rs/core/src/session/mod.rs:3223][E: codex-rs/core/src/session/mod.rs:3229][E: codex-rs/core/src/session/mod.rs:3234][E: codex-rs/core/src/session/mod.rs:3235]
12. `build_settings_update_items` may emit a developer update for model instructions, permissions, collaboration mode, realtime and personality diffs, plus a contextual user message for environment diffs。[E: codex-rs/core/src/context_manager/updates.rs:214][E: codex-rs/core/src/context_manager/updates.rs:226][E: codex-rs/core/src/context_manager/updates.rs:227][E: codex-rs/core/src/context_manager/updates.rs:230][E: codex-rs/core/src/context_manager/updates.rs:231][E: codex-rs/core/src/context_manager/updates.rs:232][E: codex-rs/core/src/context_manager/updates.rs:233][E: codex-rs/core/src/context_manager/updates.rs:234][E: codex-rs/core/src/context_manager/updates.rs:241][E: codex-rs/core/src/context_manager/updates.rs:244]
13. rollback uses `drop_last_n_user_turns` to select a cut index, then `trim_pre_turn_context_updates`; if a trimmed developer message is a mixed initial-context bundle, the baseline is cleared so the next turn falls back to full reinjection。[E: codex-rs/core/src/context_manager/history.rs:224][E: codex-rs/core/src/context_manager/history.rs:243][E: codex-rs/core/src/context_manager/history.rs:246][E: codex-rs/core/src/context_manager/history.rs:399][E: codex-rs/core/src/context_manager/history.rs:405][E: codex-rs/core/src/context_manager/history.rs:410][E: codex-rs/core/src/context_manager/history.rs:414]

## Token 与 image estimate

`get_total_token_usage` starts from last server token usage, adds estimated tokens after the last model-generated item, and adds non-last reasoning tokens only when server reasoning was not already included。[E: codex-rs/core/src/context_manager/history.rs:296][E: codex-rs/core/src/context_manager/history.rs:297][E: codex-rs/core/src/context_manager/history.rs:302][E: codex-rs/core/src/context_manager/history.rs:307][E: codex-rs/core/src/context_manager/history.rs:310]

`estimate_response_item_model_visible_bytes` treats encrypted reasoning/compaction via decoded-length estimates; other items use serialized JSON size adjusted by inline image data-url estimates and encrypted function-output estimates。[E: codex-rs/core/src/context_manager/history.rs:512][E: codex-rs/core/src/context_manager/history.rs:514][E: codex-rs/core/src/context_manager/history.rs:518][E: codex-rs/core/src/context_manager/history.rs:522][E: codex-rs/core/src/context_manager/history.rs:527][E: codex-rs/core/src/context_manager/history.rs:530][E: codex-rs/core/src/context_manager/history.rs:532][E: codex-rs/core/src/context_manager/history.rs:537][E: codex-rs/core/src/context_manager/history.rs:540]

Image estimates only discount `data:image/...;base64,...` URLs; `detail: "original"` attempts base64 decode and image decode to count 32px patches capped at 10,000, otherwise it falls back to the resized-image byte estimate。[E: codex-rs/core/src/context_manager/history.rs:551][E: codex-rs/core/src/context_manager/history.rs:568][E: codex-rs/core/src/context_manager/history.rs:574][E: codex-rs/core/src/context_manager/history.rs:580][E: codex-rs/core/src/context_manager/history.rs:590][E: codex-rs/core/src/context_manager/history.rs:597][E: codex-rs/core/src/context_manager/history.rs:606][E: codex-rs/core/src/context_manager/history.rs:611][E: codex-rs/core/src/context_manager/history.rs:630]

## 设计动机与权衡

History normalization happens at prompt materialization time, not every time an item is recorded. This lets the live stream temporarily contain incomplete call/output pairs while still repairing them before the next model request。[E: codex-rs/core/src/context_manager/history.rs:91][E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:327][I]

`reference_context_item` avoids reinjecting full initial context on every regular turn; rollback deliberately clears it when a mixed initial-context bundle is trimmed, favoring full reinjection over diffing against an unreconstructable baseline。[E: codex-rs/core/src/session/mod.rs:3214][E: codex-rs/core/src/session/mod.rs:3219][E: codex-rs/core/src/context_manager/history.rs:410][E: codex-rs/core/src/context_manager/history.rs:414][I]

## gotcha

- `raw_items()` and `for_prompt()` are different surfaces: `raw_items()` returns stored items, while `for_prompt()` consumes a snapshot after normalize。[E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:117]
- `CompactionTrigger` is not recorded as an API message, while `Compaction` and `ContextCompaction` are。[E: codex-rs/core/src/context_manager/history.rs:466][E: codex-rs/core/src/context_manager/history.rs:467][E: codex-rs/core/src/context_manager/history.rs:468]
- `replace_history` clears the auto-compact prefill through `SessionState::replace_history`; compaction paths also persist compacted rollout state.[E: codex-rs/core/src/state/session.rs:99][E: codex-rs/core/src/state/session.rs:104][E: codex-rs/core/src/state/session.rs:107][E: codex-rs/core/src/session/mod.rs:2792]

## Sources

- `codex-rs/core/src/context_manager/mod.rs`
- `codex-rs/core/src/context_manager/history.rs`
- `codex-rs/core/src/context_manager/normalize.rs`
- `codex-rs/core/src/context_manager/updates.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/state/session.rs`

## 相关

- [Context and compaction](../../spine/context-and-compaction.md) — T0 history/compaction 图解。
- [指令/prompt 装配](instruction-assembly.md) — initial context 和 settings diff 的 fragment 来源。
- [Compaction](compaction.md) — replacement history 如何更新 `ContextManager`。
