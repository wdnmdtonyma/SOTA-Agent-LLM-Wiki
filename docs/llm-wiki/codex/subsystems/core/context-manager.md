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
updated: 37aadeaa13
---

> `ContextManager` 是 Codex core 的 conversation history 管理器：它保存 `ResponseItem` 序列、history version、token usage info 和当前 `reference_context_item`，并在 `for_prompt` 进入 prompt 前维护 tool call/output 与 image modality 不变量。[E: codex-rs/core/src/context_manager/history.rs:36][E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:39][E: codex-rs/core/src/context_manager/history.rs:50][E: codex-rs/core/src/context_manager/history.rs:120][E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:366][E: codex-rs/core/src/context_manager/history.rs:369][E: codex-rs/core/src/context_manager/history.rs:372]

## 能回答的问题

- `ContextManager` 在 session state 中保存哪些 history/baseline/token 状态？
- `record_items` 与 `for_prompt` 分别何时过滤、normalize、strip images？
- function call output 丢失或 orphan output 出现时怎样修复 history？
- `reference_context_item` 如何支撑初始 context 与 steady-state settings diff？
- rollback/compaction 为什么会清理 context update baseline？
- token estimate 为什么会对 image data URL 做特殊估算？

## 职责边界

`ContextManager` 的源码职责集中在 history 存储、history normalization、token accounting、rollback/replace 和 prompt materialization；model sampling 与工具执行属于 turn/tool 子系统边界。[E: codex-rs/core/src/context_manager/history.rs:99][E: codex-rs/core/src/context_manager/history.rs:120][E: codex-rs/core/src/context_manager/history.rs:138][E: codex-rs/core/src/context_manager/history.rs:186][E: codex-rs/core/src/context_manager/history.rs:240][I] session 通过 `SessionState.history: ContextManager` 持有它，并由 `Session::record_context_updates_and_set_reference_context_item` 更新 runtime context baseline。[E: codex-rs/core/src/state/session.rs:22][E: codex-rs/core/src/session/mod.rs:2612]

## 关键 crate/文件

- `codex-rs/core/src/context_manager/history.rs`: `ContextManager` 主体，包含 record/for_prompt/replace/drop/token estimate/normalize/trim pre-turn context。[E: codex-rs/core/src/context_manager/history.rs:34][E: codex-rs/core/src/context_manager/history.rs:99][E: codex-rs/core/src/context_manager/history.rs:120][E: codex-rs/core/src/context_manager/history.rs:138][E: codex-rs/core/src/context_manager/history.rs:186][E: codex-rs/core/src/context_manager/history.rs:240][E: codex-rs/core/src/context_manager/history.rs:366][E: codex-rs/core/src/context_manager/history.rs:428]
- `codex-rs/core/src/context_manager/normalize.rs`: 插入 missing outputs、删除 orphan outputs、移除 call/output 对、按 modality 删除图片内容。[E: codex-rs/core/src/context_manager/normalize.rs:14][E: codex-rs/core/src/context_manager/normalize.rs:122][E: codex-rs/core/src/context_manager/normalize.rs:197][E: codex-rs/core/src/context_manager/normalize.rs:295]
- `codex-rs/core/src/context_manager/updates.rs`: 环境、权限、collaboration mode、realtime、personality、model switch 等 steady-state update item 的 builder。[E: codex-rs/core/src/context_manager/updates.rs:21][E: codex-rs/core/src/context_manager/updates.rs:42][E: codex-rs/core/src/context_manager/updates.rs:72][E: codex-rs/core/src/context_manager/updates.rs:89][E: codex-rs/core/src/context_manager/updates.rs:126][E: codex-rs/core/src/context_manager/updates.rs:161]
- `codex-rs/core/src/session/mod.rs`: initial context injection 与 `reference_context_item` baseline 的 runtime 更新路径。[E: codex-rs/core/src/session/mod.rs:2374][E: codex-rs/core/src/session/mod.rs:2612]

## 数据模型

`ContextManager` 的 fields 是 `items: Vec<ResponseItem>`、`history_version: u64`、`token_info: Option<TokenUsageInfo>` 和 `reference_context_item: Option<TurnContextItem>`。[E: codex-rs/core/src/context_manager/history.rs:36][E: codex-rs/core/src/context_manager/history.rs:38][E: codex-rs/core/src/context_manager/history.rs:39][E: codex-rs/core/src/context_manager/history.rs:50] `ContextManager::new()` 初始 `items` 为空、`history_version` 为 0，`token_info` 由 `TokenUsageInfo::new_or_append(&None, &None, None)` 计算，`reference_context_item` 为 None。[E: codex-rs/core/src/context_manager/history.rs:64][E: codex-rs/core/src/context_manager/history.rs:65][E: codex-rs/core/src/context_manager/history.rs:66][E: codex-rs/core/src/context_manager/history.rs:67][E: codex-rs/core/src/context_manager/history.rs:69]

`reference_context_item` 是 `TurnContextItem` baseline，用于判定下一个 real user turn 是注入 full initial context 还是只注入 settings diff。[E: codex-rs/core/src/session/mod.rs:2616][E: codex-rs/core/src/session/mod.rs:2620][E: codex-rs/core/src/session/mod.rs:2622][E: codex-rs/core/src/session/mod.rs:2625]

## 控制流

1. `SessionState::new` 创建 `ContextManager::new()` 并把它放入 `SessionState.history`。[E: codex-rs/core/src/state/session.rs:41][E: codex-rs/core/src/state/session.rs:42][E: codex-rs/core/src/state/session.rs:45]
2. `ContextManager::record_items` 只记录 API message 或 `GhostSnapshot`，并对记录项调用 `process_item` 后 push 到 `items`。[E: codex-rs/core/src/context_manager/history.rs:106][E: codex-rs/core/src/context_manager/history.rs:107][E: codex-rs/core/src/context_manager/history.rs:108][E: codex-rs/core/src/context_manager/history.rs:111][E: codex-rs/core/src/context_manager/history.rs:112]
3. `process_item` 会对 `FunctionCallOutput` 和 `CustomToolCallOutput` 的 output payload 使用 serialization budget 做 truncation，其他 message/call/reasoning/compaction/ghost 等 item 保持 clone。[E: codex-rs/core/src/context_manager/history.rs:378][E: codex-rs/core/src/context_manager/history.rs:381][E: codex-rs/core/src/context_manager/history.rs:387][E: codex-rs/core/src/context_manager/history.rs:394][E: codex-rs/core/src/context_manager/history.rs:396][E: codex-rs/core/src/context_manager/history.rs:407]
4. `for_prompt` 消费传入的 `ContextManager` 值，调用 `normalize_history`，删除 `GhostSnapshot` 后返回 prompt items。[E: codex-rs/core/src/context_manager/history.rs:120][E: codex-rs/core/src/context_manager/history.rs:121][E: codex-rs/core/src/context_manager/history.rs:123][E: codex-rs/core/src/context_manager/history.rs:124]
5. `normalize_history` 依次调用 `ensure_call_outputs_present`、`remove_orphan_outputs`、`strip_images_when_unsupported`，确保 call/output 成对并按 model modality 去除图片。[E: codex-rs/core/src/context_manager/history.rs:364][E: codex-rs/core/src/context_manager/history.rs:366][E: codex-rs/core/src/context_manager/history.rs:369][E: codex-rs/core/src/context_manager/history.rs:372]
6. `ensure_call_outputs_present` 会为缺失 output 的 `FunctionCall` 插入 `"aborted"` function output，为缺失 output 的 client `ToolSearchCall` 插入 completed empty tools output，为缺失 output 的 `CustomToolCall` 插入 `"aborted"` custom output，并为缺失 output 的 `LocalShellCall` 插入 `"aborted"` function output。[E: codex-rs/core/src/context_manager/normalize.rs:22][E: codex-rs/core/src/context_manager/normalize.rs:34][E: codex-rs/core/src/context_manager/normalize.rs:36][E: codex-rs/core/src/context_manager/normalize.rs:41][E: codex-rs/core/src/context_manager/normalize.rs:57][E: codex-rs/core/src/context_manager/normalize.rs:59][E: codex-rs/core/src/context_manager/normalize.rs:60][E: codex-rs/core/src/context_manager/normalize.rs:61][E: codex-rs/core/src/context_manager/normalize.rs:66][E: codex-rs/core/src/context_manager/normalize.rs:80][E: codex-rs/core/src/context_manager/normalize.rs:83][E: codex-rs/core/src/context_manager/normalize.rs:89][E: codex-rs/core/src/context_manager/normalize.rs:104][E: codex-rs/core/src/context_manager/normalize.rs:106]
7. `remove_orphan_outputs` 删除没有 matching call 的 function/custom/tool_search output；function output 可匹配 `FunctionCall` 或 `LocalShellCall`，server tool search output 和没有 call_id 的 tool search output 会保留。[E: codex-rs/core/src/context_manager/normalize.rs:142][E: codex-rs/core/src/context_manager/normalize.rs:161][E: codex-rs/core/src/context_manager/normalize.rs:164][E: codex-rs/core/src/context_manager/normalize.rs:170][E: codex-rs/core/src/context_manager/normalize.rs:179][E: codex-rs/core/src/context_manager/normalize.rs:181][E: codex-rs/core/src/context_manager/normalize.rs:186][E: codex-rs/core/src/context_manager/normalize.rs:190][E: codex-rs/core/src/context_manager/normalize.rs:192]
8. `remove_first_item` / `remove_last_item` 使用 `normalize::remove_corresponding_for` 维护 call/output 对，不是简单删除一个 vector element。[E: codex-rs/core/src/context_manager/history.rs:163][E: codex-rs/core/src/context_manager/history.rs:171][E: codex-rs/core/src/context_manager/history.rs:175][E: codex-rs/core/src/context_manager/history.rs:177]
9. `replace` 用新 items 替换 history，并增加 `history_version`。[E: codex-rs/core/src/context_manager/history.rs:186][E: codex-rs/core/src/context_manager/history.rs:187]
10. `record_context_updates_and_set_reference_context_item` 如果没有 `reference_context_item` 就调用 `build_initial_context`，否则调用 `build_settings_update_items`；无论是否写入 visible context items，它都会 persist `RolloutItem::TurnContext` 并更新 in-memory baseline。[E: codex-rs/core/src/session/mod.rs:2620][E: codex-rs/core/src/session/mod.rs:2622][E: codex-rs/core/src/session/mod.rs:2625][E: codex-rs/core/src/session/mod.rs:2635][E: codex-rs/core/src/session/mod.rs:2641]
11. `drop_last_n_user_turns` 在 rollback 时调用 `trim_pre_turn_context_updates` 删除紧贴 rollback 边界的 contextual developer/user messages。[E: codex-rs/core/src/context_manager/history.rs:259][E: codex-rs/core/src/context_manager/history.rs:260][E: codex-rs/core/src/context_manager/history.rs:428]
12. `trim_pre_turn_context_updates` 如果删除的是 mixed `build_initial_context` developer bundle，还会把 `reference_context_item` 置 None，强制下一次 real turn full reinjection。[E: codex-rs/core/src/context_manager/history.rs:439][E: codex-rs/core/src/context_manager/history.rs:443]

## Token 与 image estimate

`estimate_response_item_model_visible_bytes` 对 `GhostSnapshot` 返回 0，对 encrypted reasoning/compaction 使用 reasoning length estimate，对其他 item 先 JSON serialize，再按 image payload adjustment 修正 inline image data URL 成本。[E: codex-rs/core/src/context_manager/history.rs:531][E: codex-rs/core/src/context_manager/history.rs:533][E: codex-rs/core/src/context_manager/history.rs:540][E: codex-rs/core/src/context_manager/history.rs:542][E: codex-rs/core/src/context_manager/history.rs:545]

原始 detail image estimate 会尝试 base64 decode 和 image decode，再按 32px patch 估算尺寸成本；非 base64、base64 decode 失败或 image decode 失败时返回 None，调用方会 fallback 到 resized-image byte estimate。[E: codex-rs/core/src/context_manager/history.rs:600][E: codex-rs/core/src/context_manager/history.rs:603][E: codex-rs/core/src/context_manager/history.rs:607][E: codex-rs/core/src/context_manager/history.rs:610][E: codex-rs/core/src/context_manager/history.rs:614][E: codex-rs/core/src/context_manager/history.rs:619][E: codex-rs/core/src/context_manager/history.rs:624][E: codex-rs/core/src/context_manager/history.rs:642]

## 设计动机与权衡

`reference_context_item` 让 Codex 初始 prompt context 不必每个 real turn 全量重复；steady-state 只追加 settings diff，降低 token overhead。[E: codex-rs/core/src/session/mod.rs:2620][E: codex-rs/core/src/session/mod.rs:2625][I]

prompt 前 normalize 而不是 record 时强制 normalize，可以把 streaming/tool execution 中的临时不完整 call/output 状态留在 history，直到进入下一次 prompt 时再修复为 model-acceptable 形态。[E: codex-rs/core/src/context_manager/history.rs:120][E: codex-rs/core/src/context_manager/history.rs:121][I]

rollback 遇到 mixed initial context bundle 时清空 baseline，说明系统宁愿重新注入 full context，也不愿用一个已被裁掉部分内容的 stale baseline 继续 diff。[E: codex-rs/core/src/context_manager/history.rs:439][E: codex-rs/core/src/context_manager/history.rs:443][I]

## gotcha

- `raw_items()` 与 `for_prompt()` 不同；`for_prompt()` 会 normalize 并去掉 `GhostSnapshot`。[E: codex-rs/core/src/context_manager/history.rs:120][E: codex-rs/core/src/context_manager/history.rs:123][E: codex-rs/core/src/context_manager/history.rs:128]
- `ResponseItem::Other` 和 system role message 不是 API message，`GhostSnapshot` 也会被 `for_prompt` 去掉。[E: codex-rs/core/src/context_manager/history.rs:483][E: codex-rs/core/src/context_manager/history.rs:496][E: codex-rs/core/src/context_manager/history.rs:123]
- `replace_history` 会同时替换 items 与 reference context baseline；compaction 调用 `replace_compacted_history` 后还会 advance window generation。[E: codex-rs/core/src/state/session.rs:92][E: codex-rs/core/src/state/session.rs:97][E: codex-rs/core/src/state/session.rs:99][E: codex-rs/core/src/session/mod.rs:2326][E: codex-rs/core/src/session/mod.rs:2335]

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
