---
id: subsys.core.trace-bundle
title: Trace bundle reducer
kind: subsystem
tier: T2
source: [codex-rs/rollout-trace/src/reducer/mod.rs, codex-rs/rollout-trace/src/reducer/thread.rs, codex-rs/rollout-trace/src/reducer/conversation.rs, codex-rs/rollout-trace/src/reducer/inference.rs, codex-rs/rollout-trace/src/reducer/tool.rs, codex-rs/rollout-trace/src/reducer/tool/terminal.rs, codex-rs/rollout-trace/src/reducer/tool/agents.rs, codex-rs/rollout-trace/src/reducer/code_cell.rs, codex-rs/rollout-trace/src/reducer/compaction.rs, codex-rs/rollout-trace/src/reducer/conversation/normalize.rs, codex-rs/rollout-trace/src/bundle.rs, codex-rs/rollout-trace/src/raw_event.rs, codex-rs/rollout-trace/src/model/mod.rs, codex-rs/rollout-trace/src/lib.rs]
symbols: [replay_bundle, TraceReducer, RawTraceEvent, RawTraceEventPayload, RolloutTrace, reduce_inference_request, reconcile_conversation_items, start_tool_call, start_or_queue_code_cell, reduce_compaction_installed_event]
related: [subsys.core.rollout-persistence, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Trace bundle reducer 是 `codex-rollout-trace` 把 append-only `trace.jsonl` raw events 和 payload files 确定性 replay 成 `RolloutTrace` graph 的状态机；它保留 raw payload refs，但只把语义对象写入 reduced graph。[E: codex-rs/rollout-trace/src/reducer/mod.rs:1][E: codex-rs/rollout-trace/src/reducer/mod.rs:43][E: codex-rs/rollout-trace/src/model/mod.rs:52]

## 能回答的问题

- trace bundle 的目录和 manifest 文件名是什么？
- raw event envelope 与 `RawTraceEventPayload` 有哪些生命周期事件？
- reducer 如何处理 thread/turn/inference/conversation/tool/code-cell/terminal/compaction/agent edge？
- 为什么 conversation item 要按 snapshot/append-only reconcile？
- reducer 遇到 duplicate/unknown/mismatch 时为什么直接 fail？

## 职责边界

- `codex-rs/rollout-trace` crate 拥有 trace schema、writer API 和 semantic replay；hot-path core 只依赖小 writer API，reducer/viewer projection 留在 core 外。[E: codex-rs/rollout-trace/src/lib.rs:1][E: codex-rs/rollout-trace/src/lib.rs:3]
- reducer 读取 `manifest.json` 和 `trace.jsonl`，按 raw event 顺序 apply；它不重新执行 Codex turn 或工具。[E: codex-rs/rollout-trace/src/reducer/mod.rs:44][E: codex-rs/rollout-trace/src/reducer/mod.rs:68][E: codex-rs/rollout-trace/src/reducer/mod.rs:71]
- raw payload bodies 大多不嵌入 graph；`TraceReducer::insert_raw_payload` 把 payload ref 存进 `rollout.raw_payloads`，typed reducer 需要字段时再读 payload JSON。[E: codex-rs/rollout-trace/src/reducer/mod.rs:149][E: codex-rs/rollout-trace/src/reducer/mod.rs:153][E: codex-rs/rollout-trace/src/reducer/mod.rs:499]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout-trace/src/bundle.rs` | bundle layout constants 和 manifest schema。[E: codex-rs/rollout-trace/src/bundle.rs:8][E: codex-rs/rollout-trace/src/bundle.rs:16] |
| `codex-rs/rollout-trace/src/raw_event.rs` | raw event envelope、context、requester、payload enum。[E: codex-rs/rollout-trace/src/raw_event.rs:27][E: codex-rs/rollout-trace/src/raw_event.rs:65] |
| `codex-rs/rollout-trace/src/model/mod.rs` | reduced graph `RolloutTrace` 和 identity namespaces。[E: codex-rs/rollout-trace/src/model/mod.rs:21][E: codex-rs/rollout-trace/src/model/mod.rs:52] |
| `codex-rs/rollout-trace/src/reducer/mod.rs` | `replay_bundle`、`TraceReducer` state、central dispatcher。[E: codex-rs/rollout-trace/src/reducer/mod.rs:44][E: codex-rs/rollout-trace/src/reducer/mod.rs:88][E: codex-rs/rollout-trace/src/reducer/mod.rs:149] |
| `codex-rs/rollout-trace/src/reducer/conversation.rs` | model-visible conversation snapshot normalization/reconciliation。[E: codex-rs/rollout-trace/src/reducer/conversation.rs:27][E: codex-rs/rollout-trace/src/reducer/conversation.rs:192] |
| `codex-rs/rollout-trace/src/reducer/tool/*` | generic tool, terminal, multi-agent edge reduction。[E: codex-rs/rollout-trace/src/reducer/tool.rs:47][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:31][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:60] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| bundle files | `manifest.json`、`trace.jsonl`、`payloads`、`state.json` | constants 固定 raw/reduced bundle 文件名和 payload dir。[E: codex-rs/rollout-trace/src/bundle.rs:8][E: codex-rs/rollout-trace/src/bundle.rs:9][E: codex-rs/rollout-trace/src/bundle.rs:10][E: codex-rs/rollout-trace/src/bundle.rs:12] |
| `TraceBundleManifest` | schema_version、trace_id、rollout_id、root_thread_id、started_at_unix_ms、raw_event_log、payloads_dir | manifest 给 reducer 初始化 root identity 和 started time。[E: codex-rs/rollout-trace/src/bundle.rs:16][E: codex-rs/rollout-trace/src/bundle.rs:19][E: codex-rs/rollout-trace/src/bundle.rs:20][E: codex-rs/rollout-trace/src/bundle.rs:21][E: codex-rs/rollout-trace/src/bundle.rs:25][E: codex-rs/rollout-trace/src/bundle.rs:26][E: codex-rs/rollout-trace/src/bundle.rs:27][E: codex-rs/rollout-trace/src/bundle.rs:28] |
| `RawTraceEvent` | schema_version、seq、wall_time_unix_ms、rollout_id、thread_id、codex_turn_id、payload | envelope 提供全局顺序、时间和可选 thread/turn context。[E: codex-rs/rollout-trace/src/raw_event.rs:27][E: codex-rs/rollout-trace/src/raw_event.rs:33][E: codex-rs/rollout-trace/src/raw_event.rs:39] |
| `RawTraceEventPayload` | rollout/thread/turn/inference/tool/code-cell/compaction/agent/protocol/other variants | raw payload enum 是 replay 的输入事件全集。[E: codex-rs/rollout-trace/src/raw_event.rs:65][E: codex-rs/rollout-trace/src/raw_event.rs:69][E: codex-rs/rollout-trace/src/raw_event.rs:76][E: codex-rs/rollout-trace/src/raw_event.rs:86][E: codex-rs/rollout-trace/src/raw_event.rs:94][E: codex-rs/rollout-trace/src/raw_event.rs:113][E: codex-rs/rollout-trace/src/raw_event.rs:141][E: codex-rs/rollout-trace/src/raw_event.rs:161][E: codex-rs/rollout-trace/src/raw_event.rs:186][E: codex-rs/rollout-trace/src/raw_event.rs:198][E: codex-rs/rollout-trace/src/raw_event.rs:203] |
| `RolloutTrace` | trace identity、threads、codex_turns、conversation_items、inference_calls、code_cells、tool_calls、terminal_sessions/operations、compactions、compaction_requests、interaction_edges、raw_payloads | reduced graph 明确区分 model-visible conversation 与 runtime/debug objects。[E: codex-rs/rollout-trace/src/model/mod.rs:52][E: codex-rs/rollout-trace/src/model/mod.rs:61][E: codex-rs/rollout-trace/src/model/mod.rs:63][E: codex-rs/rollout-trace/src/model/mod.rs:69][E: codex-rs/rollout-trace/src/model/mod.rs:70][E: codex-rs/rollout-trace/src/model/mod.rs:71][E: codex-rs/rollout-trace/src/model/mod.rs:72][E: codex-rs/rollout-trace/src/model/mod.rs:74][E: codex-rs/rollout-trace/src/model/mod.rs:75][E: codex-rs/rollout-trace/src/model/mod.rs:77][E: codex-rs/rollout-trace/src/model/mod.rs:79][E: codex-rs/rollout-trace/src/model/mod.rs:81][E: codex-rs/rollout-trace/src/model/mod.rs:83][E: codex-rs/rollout-trace/src/model/mod.rs:85][E: codex-rs/rollout-trace/src/model/mod.rs:87] |
| `TraceReducer` state | next ordinals、thread snapshots、pending compaction replacements、runtime code cell map、pending starts/lifecycle、pending agent edges | reducer 内部状态桥接 raw event order 与 semantic graph invariants。[E: codex-rs/rollout-trace/src/reducer/mod.rs:88][E: codex-rs/rollout-trace/src/reducer/mod.rs:91][E: codex-rs/rollout-trace/src/reducer/mod.rs:92][E: codex-rs/rollout-trace/src/reducer/mod.rs:99][E: codex-rs/rollout-trace/src/reducer/mod.rs:106][E: codex-rs/rollout-trace/src/reducer/mod.rs:113][E: codex-rs/rollout-trace/src/reducer/mod.rs:121][E: codex-rs/rollout-trace/src/reducer/mod.rs:128][E: codex-rs/rollout-trace/src/reducer/mod.rs:135] |

## 控制流：bundle replay

1. `replay_bundle` 读取 manifest，初始化 `RolloutTrace::new`，设置 schema version、trace id、rollout id、root thread id、`started_at_unix_ms`。[E: codex-rs/rollout-trace/src/reducer/mod.rs:44][E: codex-rs/rollout-trace/src/reducer/mod.rs:46][E: codex-rs/rollout-trace/src/reducer/mod.rs:50][E: codex-rs/rollout-trace/src/reducer/mod.rs:51][E: codex-rs/rollout-trace/src/reducer/mod.rs:52][E: codex-rs/rollout-trace/src/reducer/mod.rs:53][E: codex-rs/rollout-trace/src/reducer/mod.rs:54][E: codex-rs/rollout-trace/src/reducer/mod.rs:55]
2. reducer 初始化 conversation/terminal ordinals、thread snapshot map、compaction replacement map、code-cell runtime id map 和 pending queues。[E: codex-rs/rollout-trace/src/reducer/mod.rs:58][E: codex-rs/rollout-trace/src/reducer/mod.rs:60][E: codex-rs/rollout-trace/src/reducer/mod.rs:62][E: codex-rs/rollout-trace/src/reducer/mod.rs:65]
3. replay 逐行读取 `trace.jsonl`，空行跳过，JSON parse 成 `RawTraceEvent` 后调用 `apply_event`。[E: codex-rs/rollout-trace/src/reducer/mod.rs:68][E: codex-rs/rollout-trace/src/reducer/mod.rs:71][E: codex-rs/rollout-trace/src/reducer/mod.rs:73][E: codex-rs/rollout-trace/src/reducer/mod.rs:76][E: codex-rs/rollout-trace/src/reducer/mod.rs:78]
4. 全部事件 replay 后，reducer 调用 `resolve_pending_spawn_edge_fallbacks`，用于子线程在 task message reduced 前失败的 spawn delivery fallback。[E: codex-rs/rollout-trace/src/reducer/mod.rs:80][E: codex-rs/rollout-trace/src/reducer/mod.rs:83]
5. `apply_event` 先插入 raw payload refs，再按 payload variant 分发；`ProtocolEventObserved` 只保留 raw breadcrumb，不创建 semantic object；`Other` 没有 reducer implementation 时直接 `bail!`。[E: codex-rs/rollout-trace/src/reducer/mod.rs:149][E: codex-rs/rollout-trace/src/reducer/mod.rs:157][E: codex-rs/rollout-trace/src/reducer/mod.rs:257][E: codex-rs/rollout-trace/src/reducer/mod.rs:491]

## 控制流：thread、turn、inference、conversation

1. `start_thread` 拒绝 duplicate thread；v2 SessionSource metadata 是 child identity 的 authoritative source，优先用 metadata 中的 nested agent path 构造 spawn origin。[E: codex-rs/rollout-trace/src/reducer/thread.rs:30][E: codex-rs/rollout-trace/src/reducer/thread.rs:38][E: codex-rs/rollout-trace/src/reducer/thread.rs:49][E: codex-rs/rollout-trace/src/reducer/thread.rs:67]
2. `end_thread` 只标记该 thread terminal，不把 child shutdown 当成整个 rollout completion。[E: codex-rs/rollout-trace/src/reducer/thread.rs:106][E: codex-rs/rollout-trace/src/reducer/thread.rs:114][E: codex-rs/rollout-trace/src/reducer/thread.rs:117]
3. `start_codex_turn` 要求 thread 已存在并插入 running turn；`end_codex_turn` 校验 event thread id 与 turn owner 一致，并终止该 turn 下仍 running 的 code cells。[E: codex-rs/rollout-trace/src/reducer/thread.rs:126][E: codex-rs/rollout-trace/src/reducer/thread.rs:138][E: codex-rs/rollout-trace/src/reducer/thread.rs:158][E: codex-rs/rollout-trace/src/reducer/thread.rs:167][E: codex-rs/rollout-trace/src/reducer/thread.rs:184]
4. `start_inference_call` 拒绝 duplicate inference，校验 referenced codex turn 存在且 thread 匹配，然后先 reduce request payload，再插入 `InferenceCall`。[E: codex-rs/rollout-trace/src/reducer/inference.rs:35][E: codex-rs/rollout-trace/src/reducer/inference.rs:41][E: codex-rs/rollout-trace/src/reducer/inference.rs:56][E: codex-rs/rollout-trace/src/reducer/inference.rs:61][E: codex-rs/rollout-trace/src/reducer/inference.rs:69][E: codex-rs/rollout-trace/src/reducer/inference.rs:79]
5. inference completion 可带 response payload；有 response payload 时先 reduce response，再更新 execution、response id、raw response payload id 和 response item ids。[E: codex-rs/rollout-trace/src/reducer/inference.rs:106][E: codex-rs/rollout-trace/src/reducer/inference.rs:124][E: codex-rs/rollout-trace/src/reducer/inference.rs:133][E: codex-rs/rollout-trace/src/reducer/inference.rs:136][E: codex-rs/rollout-trace/src/reducer/inference.rs:138]
6. request reduction 读取 payload `input` 数组并 normalize；有 `previous_response_id` 的 incremental request 会从前一个 inference 的 request+response item ids 重建 prefix，再 append delta。[E: codex-rs/rollout-trace/src/reducer/conversation.rs:33][E: codex-rs/rollout-trace/src/reducer/conversation.rs:41][E: codex-rs/rollout-trace/src/reducer/conversation.rs:55][E: codex-rs/rollout-trace/src/reducer/conversation.rs:68][E: codex-rs/rollout-trace/src/reducer/conversation.rs:73]
7. full snapshot mode 会按相同内容在 snapshot 中复用 item id；append-only mode 如果 occupied position 内容不匹配会 `bail!`。[E: codex-rs/rollout-trace/src/reducer/conversation.rs:192][E: codex-rs/rollout-trace/src/reducer/conversation.rs:213][E: codex-rs/rollout-trace/src/reducer/conversation.rs:216][E: codex-rs/rollout-trace/src/reducer/conversation.rs:230]
8. response output 是模型产生的 conversation，因此 response reduction 立即 append 到 thread snapshot，并将 producer 设为对应 inference call。[E: codex-rs/rollout-trace/src/reducer/conversation.rs:130][E: codex-rs/rollout-trace/src/reducer/conversation.rs:154][E: codex-rs/rollout-trace/src/reducer/conversation.rs:155][E: codex-rs/rollout-trace/src/reducer/conversation.rs:167][E: codex-rs/rollout-trace/src/reducer/conversation.rs:175]
9. normalizer 支持 message/reasoning/function_call/function_call_output/custom_tool_call/custom_tool_call_output/tool search/web/image/local shell/tool search output/MCP output/compaction item 类型，未知 model item type 直接 `bail!`。[E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:49][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:60][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:72][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:82][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:92][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:102][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:114][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:124][E: codex-rs/rollout-trace/src/reducer/conversation/normalize.rs:131]

## 控制流：tools、terminal、code cell、compaction、agent edges

1. `start_tool_call` 拒绝 duplicate tool call 和 duplicate model-visible call id，解析 thread/turn，寻找已经 reduced 的 model-visible call/output items，插入 generic `ToolCall`。[E: codex-rs/rollout-trace/src/reducer/tool.rs:47][E: codex-rs/rollout-trace/src/reducer/tool.rs:56][E: codex-rs/rollout-trace/src/reducer/tool.rs:59][E: codex-rs/rollout-trace/src/reducer/tool.rs:64][E: codex-rs/rollout-trace/src/reducer/tool.rs:69][E: codex-rs/rollout-trace/src/reducer/tool.rs:72][E: codex-rs/rollout-trace/src/reducer/tool.rs:82][E: codex-rs/rollout-trace/src/reducer/tool.rs:85][E: codex-rs/rollout-trace/src/reducer/tool.rs:127]
2. tool start 可从 invocation payload 创建 terminal operation，尤其 `write_stdin` 没有 richer runtime begin event 时需要 dispatch payload 提供 session join key。[E: codex-rs/rollout-trace/src/reducer/tool.rs:98][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:32][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:45]
3. runtime begin/end payload 会 enrich generic tool，并为 exec/write_stdin 创建或结束 terminal operation；terminal session 由 terminal id 聚合，session shutdown 边界目前没有 raw event。[E: codex-rs/rollout-trace/src/reducer/tool.rs:219][E: codex-rs/rollout-trace/src/reducer/tool.rs:278][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:74][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:152][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:220][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:233][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:241][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:245][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:252]
4. model-visible tool item 可能在 tool runtime 前后出现；`attach_model_visible_tool_item` 在 transcript reduction 时补双向链接。[E: codex-rs/rollout-trace/src/reducer/tool.rs:319][E: codex-rs/rollout-trace/src/reducer/tool.rs:334][E: codex-rs/rollout-trace/src/reducer/tool.rs:341]
5. code cell start 可能早于包含 `custom_tool_call` 的 inference completion payload；`start_or_queue_code_cell` 会把 start 暂存，直到 source conversation item 出现。[E: codex-rs/rollout-trace/src/reducer/code_cell.rs:8][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:12][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:88][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:94]
6. queued code cell 的 initial response/end lifecycle events 会一起排队，source item materialize 后 replay，保持每个 reduced `CodeCell` 都能指向 source item。[E: codex-rs/rollout-trace/src/reducer/code_cell.rs:60][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:235][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:300]
7. compaction request start/complete 只记录 remote call attempt；只有 `CompactionInstalled` 才安装 checkpoint、创建 compaction marker 和 replacement history。[E: codex-rs/rollout-trace/src/reducer/compaction.rs:20][E: codex-rs/rollout-trace/src/reducer/compaction.rs:78][E: codex-rs/rollout-trace/src/reducer/compaction.rs:113][E: codex-rs/rollout-trace/src/reducer/conversation.rs:314]
8. installed compaction 会把 replacement item ids 放进 `pending_compaction_replacement_item_ids`，让下一次 full request 以 replacement history 作为 baseline。[E: codex-rs/rollout-trace/src/reducer/compaction.rs:155][E: codex-rs/rollout-trace/src/reducer/conversation.rs:58]
9. multi-agent edge begin/end 从 runtime payload 解析 assign/send/close/spawn；recipient-side mailbox item 尚未 reduced 时，edge 保持 pending，后续 conversation item 出现再 resolve。[E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:22][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:61][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:74][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:126][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:372][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:389][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:393][E: codex-rs/rollout-trace/src/reducer/tool/agents.rs:397]

## 设计动机与权衡

- reduced model 把 conversation、tool calls、terminal operations、code cells、compactions、interaction edges 分成不同 map，说明 trace viewer 需要同时展示 model-visible transcript 和 runtime object graph。[E: codex-rs/rollout-trace/src/model/mod.rs:71][E: codex-rs/rollout-trace/src/model/mod.rs:75][E: codex-rs/rollout-trace/src/model/mod.rs:77][E: codex-rs/rollout-trace/src/model/mod.rs:81][I]
- reducer 对 duplicate/unknown/mismatch 使用 `bail!`，表明 replay 更偏向揭露 instrumentation 或 causality bug，而不是生成带 placeholder 的弱图。[E: codex-rs/rollout-trace/src/reducer/thread.rs:38][E: codex-rs/rollout-trace/src/reducer/inference.rs:56][E: codex-rs/rollout-trace/src/reducer/conversation.rs:230][I]
- pending queues 是为了适配真实 trace 的异步顺序：runtime tool/code cell/agent delivery 可能早于模型 payload 或 recipient transcript 出现，但最终 graph 仍要求精确 source/target ownership。[E: codex-rs/rollout-trace/src/reducer/mod.rs:117][E: codex-rs/rollout-trace/src/reducer/mod.rs:129][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:49][I]

## Gotcha

- `ProtocolEventObserved` 只保留 payload refs，不会生成 semantic nodes；不要从 reduced graph 中寻找所有 protocol event。[E: codex-rs/rollout-trace/src/reducer/mod.rs:257][E: codex-rs/rollout-trace/src/reducer/mod.rs:260]
- compaction request completion 不代表 conversation history 已改写；只有 install event 才是 semantic boundary。[E: codex-rs/rollout-trace/src/reducer/compaction.rs:78][E: codex-rs/rollout-trace/src/reducer/compaction.rs:113]
- terminal result 和 model-visible tool output 是分开的：terminal operation 记录 runtime 看到的结果，model observation 记录后续 inference payload 证明模型看到的 call/output item ids。[E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:299][E: codex-rs/rollout-trace/src/reducer/tool/terminal.rs:310]

## Sources

- `codex-rs/rollout-trace/src/reducer/mod.rs`
- `codex-rs/rollout-trace/src/reducer/thread.rs`
- `codex-rs/rollout-trace/src/reducer/conversation.rs`
- `codex-rs/rollout-trace/src/reducer/inference.rs`
- `codex-rs/rollout-trace/src/reducer/tool.rs`
- `codex-rs/rollout-trace/src/reducer/tool/terminal.rs`
- `codex-rs/rollout-trace/src/reducer/tool/agents.rs`
- `codex-rs/rollout-trace/src/reducer/code_cell.rs`
- `codex-rs/rollout-trace/src/reducer/compaction.rs`
- `codex-rs/rollout-trace/src/reducer/conversation/normalize.rs`
- `codex-rs/rollout-trace/src/bundle.rs`
- `codex-rs/rollout-trace/src/raw_event.rs`
- `codex-rs/rollout-trace/src/model/mod.rs`
- `codex-rs/rollout-trace/src/lib.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
