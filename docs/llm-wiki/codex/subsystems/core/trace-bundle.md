---
id: subsys.core.trace-bundle
title: Trace bundle reducer
kind: subsystem
tier: T2
source: [codex-rs/rollout-trace/src/lib.rs, codex-rs/rollout-trace/src/bundle.rs, codex-rs/rollout-trace/src/raw_event.rs, codex-rs/rollout-trace/src/model/mod.rs, codex-rs/rollout-trace/src/reducer/mod.rs, codex-rs/rollout-trace/src/reducer/thread.rs, codex-rs/rollout-trace/src/reducer/conversation.rs, codex-rs/rollout-trace/src/reducer/inference.rs, codex-rs/rollout-trace/src/reducer/tool.rs, codex-rs/rollout-trace/src/reducer/code_cell.rs, codex-rs/rollout-trace/src/reducer/compaction.rs]
symbols: [TraceWriter, RawTraceEvent, RawTraceEventPayload, RawTraceEventContext, RolloutTrace, replay_bundle, TraceReducer, reduce_inference_request, reduce_inference_response, start_inference_call, start_tool_call, start_or_queue_code_cell, reduce_compaction_installed_event]
related: [subsys.core.rollout-persistence, ref.protocol-op, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 5670360009
---

> `codex-rollout-trace` owns Codex trace-bundle schema, writer API, and deterministic replay. Hot-path Codex code depends on the small writer API, while reducer/viewer projections stay outside `codex-core`.[E: codex-rs/rollout-trace/src/lib.rs:1][E: codex-rs/rollout-trace/src/lib.rs:3][E: codex-rs/rollout-trace/src/lib.rs:58][E: codex-rs/rollout-trace/src/lib.rs:78]

## 能回答的问题

- trace bundle 的固定文件名和 manifest 字段是什么？
- raw event envelope 与 payload enum 覆盖哪些生命周期？
- `replay_bundle` 如何把 `trace.jsonl` replay 成 `RolloutTrace`？
- reducer 如何分离 model-visible conversation 和 runtime/debug objects？
- 哪些事件只保留 raw breadcrumb 或必须等待 later payload 才能 materialize？

## 职责边界

- `bundle.rs` fixes the local layout names: `manifest.json`, `trace.jsonl`, `payloads`, and reduced cache `state.json`.[E: codex-rs/rollout-trace/src/bundle.rs:8][E: codex-rs/rollout-trace/src/bundle.rs:9][E: codex-rs/rollout-trace/src/bundle.rs:10][E: codex-rs/rollout-trace/src/bundle.rs:12]
- `raw_event.rs` is append-only event schema: every event has schema version, seq, wall time, rollout id, optional thread/turn context, and typed payload.[E: codex-rs/rollout-trace/src/raw_event.rs:33][E: codex-rs/rollout-trace/src/raw_event.rs:34][E: codex-rs/rollout-trace/src/raw_event.rs:36][E: codex-rs/rollout-trace/src/raw_event.rs:39][E: codex-rs/rollout-trace/src/raw_event.rs:40][E: codex-rs/rollout-trace/src/raw_event.rs:41][E: codex-rs/rollout-trace/src/raw_event.rs:42]
- `model/mod.rs` is the reduced graph schema and intentionally separates model-visible conversation from runtime/debug objects.[E: codex-rs/rollout-trace/src/model/mod.rs:1][E: codex-rs/rollout-trace/src/model/mod.rs:3][E: codex-rs/rollout-trace/src/model/mod.rs:56]
- `reducer/mod.rs` replays stored raw events; it does not rerun a Codex turn or tool.[E: codex-rs/rollout-trace/src/reducer/mod.rs:1][E: codex-rs/rollout-trace/src/reducer/mod.rs:44][E: codex-rs/rollout-trace/src/reducer/mod.rs:71]

## 关键文件

| 文件 | 角色 |
|---|---|
| `codex-rs/rollout-trace/src/lib.rs` | Public writer/reducer/model API exports.[E: codex-rs/rollout-trace/src/lib.rs:24][E: codex-rs/rollout-trace/src/lib.rs:40][E: codex-rs/rollout-trace/src/lib.rs:58][E: codex-rs/rollout-trace/src/lib.rs:78] |
| `codex-rs/rollout-trace/src/bundle.rs` | Manifest and fixed local bundle layout.[E: codex-rs/rollout-trace/src/bundle.rs:1][E: codex-rs/rollout-trace/src/bundle.rs:18][E: codex-rs/rollout-trace/src/bundle.rs:31] |
| `codex-rs/rollout-trace/src/raw_event.rs` | Raw event envelope, requester namespace, payload variant set.[E: codex-rs/rollout-trace/src/raw_event.rs:23][E: codex-rs/rollout-trace/src/raw_event.rs:47][E: codex-rs/rollout-trace/src/raw_event.rs:58][E: codex-rs/rollout-trace/src/raw_event.rs:69] |
| `codex-rs/rollout-trace/src/model/mod.rs` | Reduced graph and shared identity namespaces.[E: codex-rs/rollout-trace/src/model/mod.rs:22][E: codex-rs/rollout-trace/src/model/mod.rs:56] |
| `codex-rs/rollout-trace/src/reducer/*` | Deterministic replay dispatcher and domain reducers for thread, inference, conversation, tools, code cells, and compaction.[E: codex-rs/rollout-trace/src/reducer/mod.rs:25][E: codex-rs/rollout-trace/src/reducer/thread.rs:1][E: codex-rs/rollout-trace/src/reducer/conversation.rs:1][E: codex-rs/rollout-trace/src/reducer/inference.rs:1][E: codex-rs/rollout-trace/src/reducer/tool.rs:43][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:1][E: codex-rs/rollout-trace/src/reducer/compaction.rs:1] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `TraceBundleManifest` | schema version, trace id, rollout id, root thread id, started time, raw log, payload dir | Manifest initializes root reduced trace identity.[E: codex-rs/rollout-trace/src/bundle.rs:18][E: codex-rs/rollout-trace/src/bundle.rs:19][E: codex-rs/rollout-trace/src/bundle.rs:20][E: codex-rs/rollout-trace/src/bundle.rs:21][E: codex-rs/rollout-trace/src/bundle.rs:25][E: codex-rs/rollout-trace/src/bundle.rs:26][E: codex-rs/rollout-trace/src/bundle.rs:27][E: codex-rs/rollout-trace/src/bundle.rs:28] |
| `RawTraceEventPayload` | rollout/thread/turn/inference/tool/code-cell/compaction/agent/protocol/other variants | Typed input event set for replay.[E: codex-rs/rollout-trace/src/raw_event.rs:69][E: codex-rs/rollout-trace/src/raw_event.rs:70][E: codex-rs/rollout-trace/src/raw_event.rs:77][E: codex-rs/rollout-trace/src/raw_event.rs:87][E: codex-rs/rollout-trace/src/raw_event.rs:95][E: codex-rs/rollout-trace/src/raw_event.rs:130][E: codex-rs/rollout-trace/src/raw_event.rs:163][E: codex-rs/rollout-trace/src/raw_event.rs:183][E: codex-rs/rollout-trace/src/raw_event.rs:209][E: codex-rs/rollout-trace/src/raw_event.rs:220][E: codex-rs/rollout-trace/src/raw_event.rs:225] |
| `RolloutTrace` | trace identity, threads, turns, conversation, inference calls, code cells, tools, terminal objects, compactions, interaction edges, raw payload refs | Reduced graph for one rollout.[E: codex-rs/rollout-trace/src/model/mod.rs:56][E: codex-rs/rollout-trace/src/model/mod.rs:63][E: codex-rs/rollout-trace/src/model/mod.rs:71][E: codex-rs/rollout-trace/src/model/mod.rs:73][E: codex-rs/rollout-trace/src/model/mod.rs:74][E: codex-rs/rollout-trace/src/model/mod.rs:76][E: codex-rs/rollout-trace/src/model/mod.rs:77][E: codex-rs/rollout-trace/src/model/mod.rs:83][E: codex-rs/rollout-trace/src/model/mod.rs:87][E: codex-rs/rollout-trace/src/model/mod.rs:89] |
| `TraceReducer` state | ordinals, conversation snapshots, pending compaction replacement, runtime code-cell map, pending code-cell and agent queues | Internal bridge between raw order and semantic graph invariants.[E: codex-rs/rollout-trace/src/reducer/mod.rs:88][E: codex-rs/rollout-trace/src/reducer/mod.rs:91][E: codex-rs/rollout-trace/src/reducer/mod.rs:99][E: codex-rs/rollout-trace/src/reducer/mod.rs:106][E: codex-rs/rollout-trace/src/reducer/mod.rs:113][E: codex-rs/rollout-trace/src/reducer/mod.rs:121][E: codex-rs/rollout-trace/src/reducer/mod.rs:135] |

## 控制流：bundle replay

1. `replay_bundle` reads `manifest.json`, initializes `RolloutTrace::new`, and stores bundle path plus reducer working state.[E: codex-rs/rollout-trace/src/reducer/mod.rs:44][E: codex-rs/rollout-trace/src/reducer/mod.rs:46][E: codex-rs/rollout-trace/src/reducer/mod.rs:49][E: codex-rs/rollout-trace/src/reducer/mod.rs:57]
2. It opens `trace.jsonl`, skips empty lines, parses each line as `RawTraceEvent`, applies events in file order, then resolves pending spawn-edge fallbacks.[E: codex-rs/rollout-trace/src/reducer/mod.rs:68][E: codex-rs/rollout-trace/src/reducer/mod.rs:71][E: codex-rs/rollout-trace/src/reducer/mod.rs:73][E: codex-rs/rollout-trace/src/reducer/mod.rs:76][E: codex-rs/rollout-trace/src/reducer/mod.rs:78][E: codex-rs/rollout-trace/src/reducer/mod.rs:83]
3. Every event first inserts its raw payload refs into `rollout.raw_payloads`, keeping raw evidence independent of semantic reduction arms.[E: codex-rs/rollout-trace/src/reducer/mod.rs:149][E: codex-rs/rollout-trace/src/reducer/mod.rs:153][E: codex-rs/rollout-trace/src/reducer/mod.rs:482]
4. `ProtocolEventObserved` is retained only as raw breadcrumb; `Other` currently bails because it has no reducer implementation.[E: codex-rs/rollout-trace/src/reducer/mod.rs:234][E: codex-rs/rollout-trace/src/reducer/mod.rs:235][E: codex-rs/rollout-trace/src/reducer/mod.rs:474]

## 控制流：domain reducers

1. Thread start rejects duplicate thread ids, optionally parses metadata payload, and treats v2 SessionSource metadata as authoritative for spawned-agent identity.[E: codex-rs/rollout-trace/src/reducer/thread.rs:30][E: codex-rs/rollout-trace/src/reducer/thread.rs:38][E: codex-rs/rollout-trace/src/reducer/thread.rs:42][E: codex-rs/rollout-trace/src/reducer/thread.rs:49]
2. Codex turn end validates event thread ownership, marks the turn terminal, and terminates running code cells/inference calls for that turn.[E: codex-rs/rollout-trace/src/reducer/thread.rs:159][E: codex-rs/rollout-trace/src/reducer/thread.rs:167][E: codex-rs/rollout-trace/src/reducer/thread.rs:178][E: codex-rs/rollout-trace/src/reducer/thread.rs:184][E: codex-rs/rollout-trace/src/reducer/thread.rs:190]
3. Inference start validates duplicate id and turn/thread ownership, reduces request payload into conversation items, then inserts the `InferenceCall`.[E: codex-rs/rollout-trace/src/reducer/inference.rs:36][E: codex-rs/rollout-trace/src/reducer/inference.rs:42][E: codex-rs/rollout-trace/src/reducer/inference.rs:57][E: codex-rs/rollout-trace/src/reducer/inference.rs:70][E: codex-rs/rollout-trace/src/reducer/inference.rs:80]
4. Conversation request reduction reads `input`, normalizes model items, handles `previous_response_id` incremental requests, and reconciles snapshot vs append-only modes.[E: codex-rs/rollout-trace/src/reducer/conversation.rs:34][E: codex-rs/rollout-trace/src/reducer/conversation.rs:42][E: codex-rs/rollout-trace/src/reducer/conversation.rs:56][E: codex-rs/rollout-trace/src/reducer/conversation.rs:58][E: codex-rs/rollout-trace/src/reducer/conversation.rs:69][E: codex-rs/rollout-trace/src/reducer/conversation.rs:92]
5. Response reduction treats model output as conversation immediately and appends produced items to the thread snapshot.[E: codex-rs/rollout-trace/src/reducer/conversation.rs:132][E: codex-rs/rollout-trace/src/reducer/conversation.rs:155][E: codex-rs/rollout-trace/src/reducer/conversation.rs:156][E: codex-rs/rollout-trace/src/reducer/conversation.rs:176][E: codex-rs/rollout-trace/src/reducer/conversation.rs:177]
6. Tool start validates duplicate ids, resolves thread/turn and requester, links model-visible call/output items, and may create a terminal operation from invocation payload.[E: codex-rs/rollout-trace/src/reducer/tool.rs:48][E: codex-rs/rollout-trace/src/reducer/tool.rs:56][E: codex-rs/rollout-trace/src/reducer/tool.rs:65][E: codex-rs/rollout-trace/src/reducer/tool.rs:68][E: codex-rs/rollout-trace/src/reducer/tool.rs:70][E: codex-rs/rollout-trace/src/reducer/tool.rs:99][E: codex-rs/rollout-trace/src/reducer/tool.rs:128]
7. Code-cell starts can arrive before their source `custom_tool_call`; `start_or_queue_code_cell` queues starts until the model-visible source item exists, then lifecycle events can replay against the materialized cell.[E: codex-rs/rollout-trace/src/reducer/code_cell.rs:8][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:12][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:88][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:99][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:131][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:208][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:235][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:397]
8. Compaction request completion records remote call evidence only; installed compaction is the semantic boundary that creates checkpoint/replacement history.[E: codex-rs/rollout-trace/src/reducer/compaction.rs:82][E: codex-rs/rollout-trace/src/reducer/compaction.rs:113][E: codex-rs/rollout-trace/src/reducer/compaction.rs:117][E: codex-rs/rollout-trace/src/reducer/compaction.rs:155][E: codex-rs/rollout-trace/src/reducer/compaction.rs:157]

## Gotcha

- Reduced trace consumers should not expect every protocol event to have a semantic node; `ProtocolEventObserved` only keeps raw payload evidence.[E: codex-rs/rollout-trace/src/reducer/mod.rs:234][E: codex-rs/rollout-trace/src/reducer/mod.rs:235]
- Replay is intentionally strict: duplicate ids, unknown turns, conversation mismatches, and unimplemented `Other` payloads surface as errors rather than placeholder graph nodes.[E: codex-rs/rollout-trace/src/reducer/thread.rs:38][E: codex-rs/rollout-trace/src/reducer/inference.rs:57][E: codex-rs/rollout-trace/src/reducer/conversation.rs:230][E: codex-rs/rollout-trace/src/reducer/mod.rs:474]
- Runtime code-cell/tool events can precede the model payload that proves their source; pending queues preserve raw timing while requiring eventual source-item ownership.[E: codex-rs/rollout-trace/src/reducer/mod.rs:121][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:52][E: codex-rs/rollout-trace/src/reducer/code_cell.rs:64]

## Sources

- `codex-rs/rollout-trace/src/lib.rs`
- `codex-rs/rollout-trace/src/bundle.rs`
- `codex-rs/rollout-trace/src/raw_event.rs`
- `codex-rs/rollout-trace/src/model/mod.rs`
- `codex-rs/rollout-trace/src/reducer/mod.rs`
- `codex-rs/rollout-trace/src/reducer/thread.rs`
- `codex-rs/rollout-trace/src/reducer/conversation.rs`
- `codex-rs/rollout-trace/src/reducer/inference.rs`
- `codex-rs/rollout-trace/src/reducer/tool.rs`
- `codex-rs/rollout-trace/src/reducer/code_cell.rs`
- `codex-rs/rollout-trace/src/reducer/compaction.rs`

## 相关

- [Rollout persistence](rollout-persistence.md)
- 索引 id：`ref.protocol-op`
- 索引 id：`ref.protocol-event-lifecycle`
