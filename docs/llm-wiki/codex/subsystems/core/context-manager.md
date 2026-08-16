---
id: subsys.core.context-manager
title: Context manager
kind: subsystem
tier: T2
source: [codex-rs/core/src/context_manager/mod.rs, codex-rs/core/src/context_manager/history.rs, codex-rs/core/src/context_manager/normalize.rs, codex-rs/core/src/context_manager/updates.rs, codex-rs/utils/audio/src/lib.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core/src/context/world_state/multi_agent_mode.rs, codex-rs/core/src/context/world_state/tools.rs, codex-rs/core/src/session/world_state.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/state/session.rs]
symbols: [ContextManager, ContextManager::record_items, ContextManager::for_prompt, ContextManager::replace_annotated, ContextManager::drop_last_n_user_turns, ContextManager::normalize_history, ContextManager::update_world_state, ToolsState, prepare_response_items, merge_contextual_fragments, Session::record_context_updates_and_set_reference_context_item]
related: [spine.context-and-compaction, subsys.core.turn-engine, subsys.core.instruction-assembly, subsys.core.compaction, subsys.core.memory]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `ContextManager` 是 core session 的 conversation history 与 context-baseline 管理器：它保存 ordered `ResponseItemEnvelope`、history version、token usage info、`reference_context_item` 和 `world_state_baseline`，`record_items` 只收 API-visible history items 并截断 tool output，`for_prompt` 在送模型前 normalize call/output 与 image/audio modality。音频校验已下沉到 `codex-rs/utils/audio`。[E: codex-rs/core/src/context_manager/history.rs:45][E: codex-rs/core/src/context_manager/history.rs:62][E: codex-rs/core/src/context_manager/history.rs:156][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/utils/audio/src/lib.rs:61]

## 能回答的问题

- session history、token info 和 context diff baseline 存在哪里？
- `record_items` 与 `for_prompt` 分别执行哪些过滤、截断和 normalize？
- 缺失 tool output 或 orphan output 如何在 prompt 前修复？
- `reference_context_item` 如何决定 full initial context 与 settings diff？
- rollback/compaction 如何替换 history 并更新 baseline？
- media payload 如何校验、按模型 modality 过滤，以及 image/audio token estimate 为什么不直接按 base64 长度计算？

## 职责边界

`ContextManager` 只管理 history materialization、rewrites、token estimate 和 prompt 前 normalization；model sampling、tool execution、event emission 由 turn/session/tool 子系统负责。[E: codex-rs/core/src/context_manager/history.rs:156][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:292][I]

`SessionState` 把 `ContextManager` 作为 session-scoped `history` 字段；session 通过 `record_conversation_items` 写 history/rollout/raw items，通过 `clone_history().for_prompt(...)` 给 turn engine 取 prompt input。[E: codex-rs/core/src/state/session.rs:32][E: codex-rs/core/src/state/session.rs:66][E: codex-rs/core/src/state/session.rs:115][E: codex-rs/core/src/session/mod.rs:3021][E: codex-rs/core/src/session/mod.rs:3684]

## 关键 crate/文件

- `codex-rs/core/src/context_manager/history.rs`: `ContextManager` fields、record/for_prompt、history replace/drop、token usage/estimate 和 normalize glue。[E: codex-rs/core/src/context_manager/history.rs:45][E: codex-rs/core/src/context_manager/history.rs:156][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:292][E: codex-rs/core/src/context_manager/history.rs:314][E: codex-rs/core/src/context_manager/history.rs:415][E: codex-rs/core/src/context_manager/history.rs:444]
- `codex-rs/core/src/context_manager/normalize.rs`: missing output insertion、orphan output removal、corresponding call/output removal、image/audio stripping。[E: codex-rs/core/src/context_manager/normalize.rs:21][E: codex-rs/core/src/context_manager/normalize.rs:148][E: codex-rs/core/src/context_manager/normalize.rs:219]
- `codex-rs/utils/audio/src/lib.rs`: 校验/规范化 message 与 tool-output audio data URL；无效、超限或不支持的音频转换为明确的 text placeholder；token estimate 优先用解码时长。[E: codex-rs/utils/audio/src/lib.rs:61][E: codex-rs/utils/audio/src/lib.rs:89][E: codex-rs/utils/audio/src/lib.rs:102][E: codex-rs/utils/audio/src/lib.rs:145][E: codex-rs/utils/audio/src/lib.rs:204]
- `codex-rs/core/src/context_manager/updates.rs`: 只提供 developer/user message builder 与按 role 合并 contextual fragments 的 helper；model、personality 与 multi-agent 都已由 typed world state 管理。[E: codex-rs/core/src/context_manager/updates.rs:11][E: codex-rs/core/src/context_manager/updates.rs:15][E: codex-rs/core/src/context_manager/updates.rs:19]
- `codex-rs/core/src/context/world_state/mod.rs`: world-state snapshot、merge patch 和 retained-fragment diff abstraction。[E: codex-rs/core/src/context/world_state/mod.rs:211][E: codex-rs/core/src/context/world_state/mod.rs:241][E: codex-rs/core/src/context/world_state/mod.rs:270]
- `codex-rs/core/src/session/world_state.rs`: 每 step 聚合 realtime、permissions、collaboration、environment、agents/apps/plugins 与 extension-contributed typed sections。[E: codex-rs/core/src/session/world_state.rs:33][E: codex-rs/core/src/session/world_state.rs:77][E: codex-rs/core/src/session/world_state.rs:191][E: codex-rs/core/src/session/world_state.rs:266][E: codex-rs/core/src/session/world_state.rs:286]
- `codex-rs/core/src/session/mod.rs`: runtime baseline path `record_context_updates_and_set_reference_context_item`、history replacement after compaction/new context window。[E: codex-rs/core/src/session/mod.rs:3319][E: codex-rs/core/src/session/mod.rs:3788]

## 数据模型

`ContextManager::new()` starts with empty `items`, `history_version` 0, token info from `TokenUsageInfo::new_or_append(&None, &None, None)`, no `reference_context_item`, and no `world_state_baseline`。[E: codex-rs/core/src/context_manager/history.rs:89][E: codex-rs/core/src/context_manager/history.rs:91][E: codex-rs/core/src/context_manager/history.rs:92][E: codex-rs/core/src/context_manager/history.rs:93][E: codex-rs/core/src/context_manager/history.rs:96][E: codex-rs/core/src/context_manager/history.rs:97]

`reference_context_item` is the optional baseline for turn-context changes: missing baseline makes session build full initial context；已有 baseline 时 world-state 先做 typed diff，若 `TurnContextItem` 变化再追加 extension turn-context contributions。rollback trimming can clear the baseline to force future full reinjection。[E: codex-rs/core/src/context_manager/history.rs:62][E: codex-rs/core/src/session/mod.rs:3798][E: codex-rs/core/src/session/mod.rs:3818][E: codex-rs/core/src/session/mod.rs:3828][E: codex-rs/core/src/context_manager/history.rs:537]

`is_api_message` keeps non-system `Message`, agent messages, calls, outputs, reasoning, web/image calls, `Compaction`, and `ContextCompaction`; it drops `CompactionTrigger` and `Other` from recorded history。[E: codex-rs/core/src/context_manager/history.rs:575][E: codex-rs/core/src/context_manager/history.rs:577][E: codex-rs/core/src/context_manager/history.rs:590][E: codex-rs/core/src/context_manager/history.rs:591][E: codex-rs/core/src/context_manager/history.rs:592][E: codex-rs/core/src/context_manager/history.rs:593]

## Typed World State 新增 sections

`MultiAgentModeState` 的 section id 是 `multi_agent_mode`。它保存每个 step 的 effective multi-agent mode；custom hint 在进入 snapshot 前按 400 tokens 截断。相同 mode 不重发；从 `Proactive` 退回无显式配置时会渲染 `ExplicitRequestOnly`，而已知的其它 `None` transition 不产生 diff。[E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:13][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:17][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:27][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:44][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:75][E: codex-rs/core/src/context/world_state/multi_agent_mode.rs:80]

`ToolsState` 的 section id 是 `tools`，snapshot 是当前 deferred tool namespace 到 description 的有序映射。description 只取首行、trim 后最多 250 chars；首次渲染列全量，后续只列 added/removed namespaces，整个 `<tools>` fragment 最多 4 KiB，超预算项以 omitted count 表示。[E: codex-rs/core/src/context/world_state/tools.rs:11][E: codex-rs/core/src/context/world_state/tools.rs:17][E: codex-rs/core/src/context/world_state/tools.rs:22][E: codex-rs/core/src/context/world_state/tools.rs:33][E: codex-rs/core/src/context/world_state/tools.rs:43][E: codex-rs/core/src/context/world_state/tools.rs:70][E: codex-rs/core/src/context/world_state/tools.rs:77][E: codex-rs/core/src/context/world_state/tools.rs:111][E: codex-rs/core/src/context/world_state/tools.rs:142]

tools section 仅在 `DeferredToolWorldState` feature 开启时加入；extension contributors 的 sections 随后异步聚合，multi-agent section 最后按 effective mode 加入。因此 deferred namespace inventory、extension state 和 multi-agent policy 都进入同一 step snapshot，但由独立 section id 做 merge patch/diff。[E: codex-rs/core/src/session/world_state.rs:251][E: codex-rs/core/src/session/world_state.rs:253][E: codex-rs/core/src/session/world_state.rs:266][E: codex-rs/core/src/session/world_state.rs:283][E: codex-rs/core/src/session/world_state.rs:296]

## 控制流

1. `SessionState::new_with_auto_compact_window_ids` creates `ContextManager::new()` and stores it in `SessionState.history`。[E: codex-rs/core/src/state/session.rs:62][E: codex-rs/core/src/state/session.rs:66][E: codex-rs/core/src/state/session.rs:70]
2. `record_conversation_items` calls `prepare_conversation_items_for_history`，除 media preparation 外还为缺失 id 的 API items 分配 prefixed `ResponseItemId`，再锁 session state、写 history/rollout 并发送 raw items。paginated history 即使 feature gate 不显式开启也要求这些 stable ids。[E: codex-rs/core/src/session/mod.rs:2941][E: codex-rs/core/src/session/mod.rs:2964][E: codex-rs/core/src/session/mod.rs:2969][E: codex-rs/core/src/session/mod.rs:2976][E: codex-rs/core/src/session/mod.rs:3021]
3. `ContextManager::record_items` iterates incoming items, skips non-API messages, processes retained items with the configured truncation policy, and pushes processed envelopes into `items`。[E: codex-rs/core/src/context_manager/history.rs:156][E: codex-rs/core/src/context_manager/history.rs:185][E: codex-rs/core/src/context_manager/history.rs:190][E: codex-rs/core/src/context_manager/history.rs:193]
4. `process_item` truncates `FunctionCallOutput` and `CustomToolCallOutput` payloads using `policy * 1.2`; messages, calls, reasoning, compaction items and other retained API items are cloned unchanged。[E: codex-rs/core/src/context_manager/history.rs:460][E: codex-rs/core/src/context_manager/history.rs:461][E: codex-rs/core/src/context_manager/history.rs:471][E: codex-rs/core/src/context_manager/history.rs:484][E: codex-rs/core/src/context_manager/history.rs:501]
5. `for_prompt` consumes a cloned `ContextManager`, calls `normalize_history(input_modalities)`, and returns its `items` for model input。[E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:212]
6. `normalize_history` calls `ensure_call_outputs_present`, `remove_orphan_outputs`, then strips unsupported image and audio content according to model input modalities。[E: codex-rs/core/src/context_manager/history.rs:444][E: codex-rs/core/src/context_manager/history.rs:448][E: codex-rs/core/src/context_manager/history.rs:451][E: codex-rs/core/src/context_manager/history.rs:454][E: codex-rs/core/src/context_manager/history.rs:457]
7. `ensure_call_outputs_present` inserts synthetic `"aborted"` function/custom outputs for missing `FunctionCall`, `CustomToolCall`, and `LocalShellCall` outputs; missing client `ToolSearchCall` output becomes a completed empty `ToolSearchOutput`。[E: codex-rs/core/src/context_manager/normalize.rs:21][E: codex-rs/core/src/context_manager/normalize.rs:50][E: codex-rs/core/src/context_manager/normalize.rs:59][E: codex-rs/core/src/context_manager/normalize.rs:64][E: codex-rs/core/src/context_manager/normalize.rs:72][E: codex-rs/core/src/context_manager/normalize.rs:82][E: codex-rs/core/src/context_manager/normalize.rs:94][E: codex-rs/core/src/context_manager/normalize.rs:100]
8. `remove_orphan_outputs` retains function outputs only when matching a `FunctionCall` or `LocalShellCall`; custom/tool-search outputs require matching calls except server tool-search output and tool-search output with no call id。[E: codex-rs/core/src/context_manager/normalize.rs:148][E: codex-rs/core/src/context_manager/normalize.rs:154][E: codex-rs/core/src/context_manager/normalize.rs:177][E: codex-rs/core/src/context_manager/normalize.rs:185][E: codex-rs/core/src/context_manager/normalize.rs:193]
9. `remove_first_item` removes the oldest item and then calls `normalize::remove_corresponding_for` so call/output counterparts do not survive alone。[E: codex-rs/core/src/context_manager/history.rs:273][E: codex-rs/core/src/context_manager/history.rs:278][E: codex-rs/core/src/context_manager/history.rs:282]
10. `replace_annotated` swaps the full `items` vector and increments `history_version`；test-only `replace` 只是把它包一层。session-level `replace_compacted_history` additionally replaces `reference_context_item`, persists compacted rollout item, and persists the turn context baseline when present。[E: codex-rs/core/src/context_manager/history.rs:288][E: codex-rs/core/src/context_manager/history.rs:292][E: codex-rs/core/src/context_manager/history.rs:294][E: codex-rs/core/src/session/mod.rs:3319][E: codex-rs/core/src/session/mod.rs:3344][E: codex-rs/core/src/session/mod.rs:3352][E: codex-rs/core/src/session/mod.rs:3360]
11. `record_context_updates_and_set_reference_context_item` chooses full initial context when no baseline exists, otherwise uses `ContextManager::update_world_state` and role-aware fragment merging；只有 `TurnContextItem` 变化时才追加 extension turn-context contributions。它先记录 model-visible items，再持久化 `WorldState`，并为 real user turn 持久化 `TurnContext`、推进 baseline。[E: codex-rs/core/src/session/mod.rs:3788][E: codex-rs/core/src/session/mod.rs:3798][E: codex-rs/core/src/session/mod.rs:3802][E: codex-rs/core/src/session/mod.rs:3818][E: codex-rs/core/src/session/mod.rs:3822][E: codex-rs/core/src/session/mod.rs:3828][E: codex-rs/core/src/session/mod.rs:3839][E: codex-rs/core/src/session/mod.rs:3844][E: codex-rs/core/src/session/mod.rs:3854]
12. `build_turn_context_contribution_items` 把 extension turn-context fragments 分成 developer、separate developer 与 contextual user 三类，再复用 `updates.rs` 的 message builders；它不再有 core-owned model/personality settings builder。[E: codex-rs/core/src/session/mod.rs:3418][E: codex-rs/core/src/session/mod.rs:3440][E: codex-rs/core/src/session/mod.rs:3450][E: codex-rs/core/src/session/mod.rs:3455][E: codex-rs/core/src/session/mod.rs:3462]
13. rollback uses `drop_last_n_user_turns` to select a cut index, then `trim_pre_turn_context_updates`; if a trimmed developer message is a mixed initial-context bundle, the baseline is cleared so the next turn falls back to full reinjection。[E: codex-rs/core/src/context_manager/history.rs:314][E: codex-rs/core/src/context_manager/history.rs:333][E: codex-rs/core/src/context_manager/history.rs:522][E: codex-rs/core/src/context_manager/history.rs:533][E: codex-rs/core/src/context_manager/history.rs:537]

## Token 与 image estimate

在 durable history boundary，session 先对 media 做 copy-on-write preparation：image 与 audio 都只改将进入 in-memory/model history 的副本，不回写 persisted rollout。audio 必须是支持 MIME 的 base64 data URL 且不过大小上限；失败项变为 text placeholder。resume/fork 安装历史时也会重跑 preparation。session 通过 `codex_utils_audio::prepare_response_items` 别名调用该 crate。[E: codex-rs/core/src/session/mod.rs:157][E: codex-rs/core/src/session/mod.rs:1489][E: codex-rs/core/src/session/mod.rs:2941][E: codex-rs/core/src/session/mod.rs:2969][E: codex-rs/utils/audio/src/lib.rs:61][E: codex-rs/utils/audio/src/lib.rs:204]

`get_total_token_usage` starts from last server token usage, adds estimated tokens after the last model-generated item, and adds non-last reasoning tokens only when server reasoning was not already included。[E: codex-rs/core/src/context_manager/history.rs:415][E: codex-rs/core/src/context_manager/history.rs:416][E: codex-rs/core/src/context_manager/history.rs:421][E: codex-rs/core/src/context_manager/history.rs:425][E: codex-rs/core/src/context_manager/history.rs:429]

`estimate_response_item_model_visible_bytes` treats encrypted reasoning/compaction via decoded-length estimates; other items use serialized JSON size adjusted by inline image/audio data-url estimates and encrypted function-output estimates。[E: codex-rs/core/src/context_manager/history.rs:640][E: codex-rs/core/src/context_manager/history.rs:642][E: codex-rs/core/src/context_manager/history.rs:655][E: codex-rs/core/src/context_manager/history.rs:658][E: codex-rs/core/src/context_manager/history.rs:660][E: codex-rs/core/src/context_manager/history.rs:662]

Image estimates only discount `data:image/...;base64,...` URLs; `detail: "original"` attempts base64 decode and image decode to count 32px patches capped at 10,000, otherwise it falls back to the resized-image byte estimate。[E: codex-rs/core/src/context_manager/history.rs:683][E: codex-rs/core/src/context_manager/history.rs:722][E: codex-rs/core/src/context_manager/history.rs:753][E: codex-rs/core/src/context_manager/history.rs:762][E: codex-rs/core/src/context_manager/history.rs:771][E: codex-rs/core/src/context_manager/history.rs:630]

Audio token estimate 在 `utils/audio`：优先用 symphonia 解码时长，按 `10` tokens/second 向上取整；解不出时长才回退 data URL 的 `approx_token_count`。[E: codex-rs/utils/audio/src/lib.rs:31][E: codex-rs/utils/audio/src/lib.rs:145][E: codex-rs/utils/audio/src/lib.rs:149][E: codex-rs/utils/audio/src/lib.rs:151]

## 设计动机与权衡

History normalization happens at prompt materialization time, not every time an item is recorded. This lets the live stream temporarily contain incomplete call/output pairs while still repairing them before the next model request。[E: codex-rs/core/src/context_manager/history.rs:156][E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:444][I]

`reference_context_item` avoids reinjecting full initial context on every regular turn; rollback deliberately clears it when a mixed initial-context bundle is trimmed, favoring full reinjection over diffing against an unreconstructable baseline。[E: codex-rs/core/src/session/mod.rs:3798][E: codex-rs/core/src/session/mod.rs:3828][E: codex-rs/core/src/context_manager/history.rs:533][E: codex-rs/core/src/context_manager/history.rs:537][I]

## gotcha

- `raw_items()` and `for_prompt()` are different surfaces: `raw_items()` returns stored items, while `for_prompt()` consumes a snapshot after normalize。[E: codex-rs/core/src/context_manager/history.rs:200][E: codex-rs/core/src/context_manager/history.rs:217]
- `CompactionTrigger` is not recorded as an API message, while `Compaction` and `ContextCompaction` are。[E: codex-rs/core/src/context_manager/history.rs:590][E: codex-rs/core/src/context_manager/history.rs:591][E: codex-rs/core/src/context_manager/history.rs:592]
- `replace_history` clears the auto-compact prefill through `SessionState::replace_history`; compaction paths also persist compacted rollout state.[E: codex-rs/core/src/state/session.rs:120][E: codex-rs/core/src/state/session.rs:125][E: codex-rs/core/src/state/session.rs:128][E: codex-rs/core/src/session/mod.rs:3352]
- 旧路径 `codex-rs/core/src/audio_preparation.rs` 已删除；生产调用点仍把 `prepare_response_items` 别名为 `prepare_audio_response_items`。[E: codex-rs/core/src/session/mod.rs:157][E: codex-rs/utils/audio/src/lib.rs:61]

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
