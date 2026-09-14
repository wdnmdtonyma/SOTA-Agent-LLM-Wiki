---
id: sdk.sdk-architecture
title: SDK 架构对照
kind: sdk
tier: T1
source: [sdk/typescript/src/codex.ts, sdk/typescript/src/thread.ts, sdk/typescript/src/exec.ts, sdk/typescript/src/events.ts, sdk/typescript/src/items.ts, sdk/python/src/openai_codex/api.py, sdk/python/src/openai_codex/client.py, sdk/python/src/openai_codex/async_client.py, sdk/python/src/openai_codex/_message_router.py, sdk/python/src/openai_codex/_run.py, sdk/python/src/openai_codex/models.py, sdk/python/src/openai_codex/generated/v2_all.py, sdk/python/scripts/update_sdk_artifacts.py]
symbols: []
related: [sdk.ts-overview, sdk.ts-events-items, sdk.ts-structured-output, sdk.py-overview, sdk.py-inputs-errors, rpc.overview]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Codex SDK currently has two different runtime paths: TypeScript is a typed wrapper over `codex exec --experimental-json` JSONL events, while Python `openai_codex` is a typed JSON-RPC client over `codex app-server --listen stdio://` with a reader-thread message router.[E: sdk/typescript/src/exec.ts:92][E: sdk/typescript/src/exec.ts:196][E: sdk/typescript/src/exec.ts:237][E: sdk/python/src/openai_codex/client.py:242][E: sdk/python/src/openai_codex/client.py:256][E: sdk/python/src/openai_codex/_message_router.py:69]

## 能回答的问题

- TS SDK 和 Python SDK 各自启动哪个 Codex CLI subcommand？
- 哪个 SDK 使用 JSONL event stream，哪个 SDK 使用 app-server JSON-RPC line protocol？
- 两边的 public thread/run API 为什么相似但底层模型不同？
- app-server protocol、generated models 和 Python router 的关系如何体现？

## TypeScript path

TS `Codex` constructs one `CodexExec`; `startThread()` and `resumeThread(id)` only create `Thread` objects, and actual execution happens later when `Thread.runStreamedInternal()` calls `_exec.run()`.[E: sdk/typescript/src/codex.ts:11][E: sdk/typescript/src/codex.ts:15][E: sdk/typescript/src/codex.ts:17][E: sdk/typescript/src/codex.ts:25][E: sdk/typescript/src/codex.ts:26][E: sdk/typescript/src/codex.ts:36][E: sdk/typescript/src/codex.ts:37][E: sdk/typescript/src/thread.ts:70][E: sdk/typescript/src/thread.ts:77]

`CodexExec.run()` starts CLI args with `["exec", "--experimental-json"]`, then structured `config` flatten, then raw `configOverrides` strings, then model/sandbox/cwd/add-dir/output-schema/web-search/approval/resume/images. It writes the prompt to stdin, yields each stdout line, and throws with stderr details on non-zero exit or signal.[E: sdk/typescript/src/exec.ts:92][E: sdk/typescript/src/exec.ts:94][E: sdk/typescript/src/exec.ts:100][E: sdk/typescript/src/exec.ts:113][E: sdk/typescript/src/exec.ts:139][E: sdk/typescript/src/exec.ts:196][E: sdk/typescript/src/exec.ts:237]

TS public stream schema is local to the exec event surface: `ThreadEvent` is the top-level JSONL union, and `ThreadItem` is the union of agent-visible item payloads.[E: sdk/typescript/src/events.ts:76][E: sdk/typescript/src/events.ts:77][E: sdk/typescript/src/events.ts:83][E: sdk/typescript/src/items.ts:120][E: sdk/typescript/src/items.ts:121][E: sdk/typescript/src/items.ts:128]

`Thread.run()` consumes the same event stream as `runStreamed()`: completed agent-message items update `finalResponse`, all completed items are collected, `turn.completed` provides usage, and `turn.failed` raises.[E: sdk/typescript/src/thread.ts:118][E: sdk/typescript/src/thread.ts:119][E: sdk/typescript/src/thread.ts:124][E: sdk/typescript/src/thread.ts:125][E: sdk/typescript/src/thread.ts:126][E: sdk/typescript/src/thread.ts:127][E: sdk/typescript/src/thread.ts:129][E: sdk/typescript/src/thread.ts:130][E: sdk/typescript/src/thread.ts:132][E: sdk/typescript/src/thread.ts:138][E: sdk/typescript/src/thread.ts:140]

## Python path

Python high-level `Codex` constructs `CodexClient`, starts the process, initializes app-server metadata, and exposes account/thread/model helpers; `AsyncCodex` wraps `AsyncCodexClient` and initializes lazily.[E: sdk/python/src/openai_codex/api.py:88][E: sdk/python/src/openai_codex/api.py:88][E: sdk/python/src/openai_codex/api.py:107][E: sdk/python/src/openai_codex/api.py:135][E: sdk/python/src/openai_codex/api.py:299][E: sdk/python/src/openai_codex/api.py:312][E: sdk/python/src/openai_codex/api.py:325]

`CodexClient.start()` defaults to `codex app-server --listen stdio://`, not `codex exec`, then opens stdio pipes and starts a stderr drain thread plus one stdout reader thread.[E: sdk/python/src/openai_codex/client.py:242][E: sdk/python/src/openai_codex/client.py:254][E: sdk/python/src/openai_codex/client.py:256][E: sdk/python/src/openai_codex/client.py:268][E: sdk/python/src/openai_codex/client.py:280][E: sdk/python/src/openai_codex/client.py:281]

Python request path is app-server JSON-RPC line protocol: `_request_raw()` writes a message with id/method/params, waits on a router response queue, and typed `request()` validates the result with a pydantic response model.[E: sdk/python/src/openai_codex/client.py:327][E: sdk/python/src/openai_codex/client.py:363][E: sdk/python/src/openai_codex/client.py:368][E: sdk/python/src/openai_codex/client.py:374][E: sdk/python/src/openai_codex/client.py:377][E: sdk/python/src/openai_codex/client.py:382]

Python typed helpers call app-server v2 methods directly: `thread_start` sends `thread/start`, `thread_resume` sends `thread/resume`, `turn_start` sends `turn/start`, `turn_steer` sends `turn/steer`, and `model_list` sends `model/list`; generated params models are serialized with `model_dump(by_alias=True, exclude_none=True, mode="json")`. The client does not wrap `thread/attachment/*` or `memory/status`.[E: sdk/python/src/openai_codex/client.py:102][E: sdk/python/src/openai_codex/client.py:478][E: sdk/python/src/openai_codex/client.py:491][E: sdk/python/src/openai_codex/client.py:650][E: sdk/python/src/openai_codex/client.py:708][E: sdk/python/src/openai_codex/client.py:724]

`_start_turn` attaches the turn subscription at the `turn/start` request: `pending_turn` buffers events from that write, then `prepare_turn` binds the handle or default consumer. `Thread.turn()` / `AsyncThread.turn()` pass that subscription into the handle instead of subscribing after the fact.[E: sdk/python/src/openai_codex/client.py:677][E: sdk/python/src/openai_codex/client.py:679][E: sdk/python/src/openai_codex/_message_router.py:146][E: sdk/python/src/openai_codex/_message_router.py:159][E: sdk/python/src/openai_codex/api.py:652][E: sdk/python/src/openai_codex/api.py:759]

Python 的 generated schema 还有一层手工 post-processing：`PlanType` 保留当前 known constants，同时以 `_missing_` 接受未来非空 string；这是 app-server runtime 与较旧 Python wheel 的版本偏斜防护。TypeScript SDK 本轮没有对应 source diff，因为它继续消费 exec JSONL schema而非该 generated account enum。[E: sdk/python/scripts/update_sdk_artifacts.py:657][E: sdk/python/scripts/update_sdk_artifacts.py:676][E: sdk/python/src/openai_codex/generated/v2_all.py:3046][E: sdk/python/src/openai_codex/generated/v2_all.py:3066]

`MessageRouter` is the split point for Python transport ordering: the reader thread classifies server requests, notifications, and responses; the router routes errors through `map_jsonrpc_error`, turn-scoped notifications to turn event cursors, login notifications to login queues, goal notifications to goal state, and everything else to the global queue.[E: sdk/python/src/openai_codex/client.py:863][E: sdk/python/src/openai_codex/client.py:868][E: sdk/python/src/openai_codex/client.py:875][E: sdk/python/src/openai_codex/client.py:879][E: sdk/python/src/openai_codex/_message_router.py:258][E: sdk/python/src/openai_codex/_message_router.py:270][E: sdk/python/src/openai_codex/_message_router.py:283][E: sdk/python/src/openai_codex/_message_router.py:314]

## Async and streaming contrast

TS streaming is a CLI stdout JSONL async generator parsed into `ThreadEvent`; Python streaming is a turn-scoped app-server notification cursor attached at `turn/start` and exposed by `TurnHandle.stream()` / `AsyncTurnHandle.stream()` until matching `turn/completed`.[E: sdk/typescript/src/thread.ts:66][E: sdk/typescript/src/thread.ts:70][E: sdk/typescript/src/thread.ts:98][E: sdk/typescript/src/thread.ts:101][E: sdk/typescript/src/exec.ts:237][E: sdk/python/src/openai_codex/api.py:813][E: sdk/python/src/openai_codex/api.py:817][E: sdk/python/src/openai_codex/api.py:820][E: sdk/python/src/openai_codex/api.py:870][E: sdk/python/src/openai_codex/api.py:878]

Python async layer has no independent subprocess protocol; `AsyncCodexClient` owns a sync `CodexClient` and uses `asyncio.to_thread()` for blocking operations. `_start_turn` uses a dedicated executor so a cancelled waiter can still close the attached subscription.[E: sdk/python/src/openai_codex/async_client.py:62][E: sdk/python/src/openai_codex/async_client.py:73][E: sdk/python/src/openai_codex/async_client.py:81][E: sdk/python/src/openai_codex/async_client.py:301][E: sdk/python/src/openai_codex/async_client.py:323]

## Consequences

| 维度 | TypeScript SDK | Python SDK | Evidence |
|---|---|---|---|
| Runtime subcommand | `codex exec --experimental-json` | `codex app-server --listen stdio://` | [E: sdk/typescript/src/exec.ts:92][E: sdk/python/src/openai_codex/client.py:256] |
| Transport | stdout JSONL lines parsed as `ThreadEvent` | line-delimited app-server JSON-RPC with routed queues | [E: sdk/typescript/src/exec.ts:237][E: sdk/typescript/src/thread.ts:101][E: sdk/python/src/openai_codex/_message_router.py:69] |
| Public event model | `events.ts` / `items.ts` exec unions | generated app-server models wrapped in `Notification` / `TurnResult` | [E: sdk/typescript/src/events.ts:76][E: sdk/typescript/src/items.ts:120][E: sdk/python/src/openai_codex/models.py:62][E: sdk/python/src/openai_codex/client.py:810][E: sdk/python/src/openai_codex/_run.py:22] |
| Server requests | TS public path goes through exec, not app-server request handlers | reader thread handles server requests via approval handler | [E: sdk/typescript/src/thread.ts:77][E: sdk/typescript/src/exec.ts:91][E: sdk/python/src/openai_codex/client.py:868][E: sdk/python/src/openai_codex/client.py:886] |
| Structured output | temp schema path is passed to exec `--output-schema` | `Thread.turn()` passes `output_schema` in `TurnStartParams` | [E: sdk/typescript/src/thread.ts:74][E: sdk/typescript/src/thread.ts:88][E: sdk/typescript/src/exec.ts:139][E: sdk/typescript/src/exec.ts:140][E: sdk/python/src/openai_codex/api.py:617][E: sdk/python/src/openai_codex/api.py:644] |
| Turn subscription | N/A (JSONL stdout) | attached at `turn/start` via `pending_turn` / `prepare_turn` | [E: sdk/python/src/openai_codex/client.py:677][E: sdk/python/src/openai_codex/_message_router.py:146][E: sdk/python/src/openai_codex/_message_router.py:159] |

## 设计动机

Both SDKs expose a “Codex -> Thread -> run/stream” shape, but TS optimizes for the lightweight exec JSONL contract while Python keeps the app-server RPC/control surface.[I] Therefore TS `ThreadEvent` / `ThreadItem` and Python app-server `Notification` / generated payloads should not be treated as the same schema even when they both describe turn progress.[I]

## Sources

- `sdk/typescript/src/codex.ts`
- `sdk/typescript/src/thread.ts`
- `sdk/typescript/src/exec.ts`
- `sdk/typescript/src/events.ts`
- `sdk/typescript/src/items.ts`
- `sdk/python/src/openai_codex/api.py`
- `sdk/python/src/openai_codex/client.py`
- `sdk/python/src/openai_codex/async_client.py`
- `sdk/python/src/openai_codex/_message_router.py`
- `sdk/python/src/openai_codex/_run.py`
- `sdk/python/src/openai_codex/models.py`
- `sdk/python/src/openai_codex/generated/v2_all.py`
- `sdk/python/scripts/update_sdk_artifacts.py`

## 相关

- `sdk.ts-overview` -> [TypeScript SDK 总览](ts-overview.md)
- `sdk.py-overview` -> [Python SDK 总览](py-overview.md)
- `rpc.overview` -> [App-Server 协议总览](../app-server/overview.md)
