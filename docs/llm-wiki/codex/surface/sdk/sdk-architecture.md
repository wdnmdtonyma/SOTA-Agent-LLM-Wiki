---
id: sdk.sdk-architecture
title: SDK 架构对照
kind: sdk
tier: T1
source: [sdk/typescript/src/codex.ts, sdk/typescript/src/thread.ts, sdk/typescript/src/exec.ts, sdk/typescript/src/events.ts, sdk/typescript/src/items.ts, sdk/python/src/openai_codex/api.py, sdk/python/src/openai_codex/client.py, sdk/python/src/openai_codex/async_client.py, sdk/python/src/openai_codex/_message_router.py, sdk/python/src/openai_codex/_run.py, sdk/python/src/openai_codex/models.py]
symbols: [Codex, CodexExec, CodexClient, AsyncCodexClient, MessageRouter, Thread, TurnHandle, ThreadEvent, ThreadItem, TurnResult]
related: [sdk.ts-overview, sdk.ts-events-items, sdk.ts-structured-output, sdk.py-overview, sdk.py-inputs-errors, rpc.overview]
evidence: explicit
status: verified
updated: db887d03e1
---

> Codex SDK currently has two different runtime paths: TypeScript is a typed wrapper over `codex exec --experimental-json` JSONL events, while Python `openai_codex` is a typed JSON-RPC client over `codex app-server --listen stdio://` with a reader-thread message router.[E: sdk/typescript/src/exec.ts:86][E: sdk/typescript/src/exec.ts:87][E: sdk/typescript/src/exec.ts:181][E: sdk/typescript/src/exec.ts:222][E: sdk/python/src/openai_codex/client.py:238][E: sdk/python/src/openai_codex/client.py:252][E: sdk/python/src/openai_codex/client.py:323][E: sdk/python/src/openai_codex/client.py:803][E: sdk/python/src/openai_codex/_message_router.py:17]

## 能回答的问题

- TS SDK 和 Python SDK 各自启动哪个 Codex CLI subcommand？
- 哪个 SDK 使用 JSONL event stream，哪个 SDK 使用 app-server JSON-RPC line protocol？
- 两边的 public thread/run API 为什么相似但底层模型不同？
- app-server protocol、generated models 和 Python router 的关系如何体现？

## TypeScript path

TS `Codex` constructs one `CodexExec`; `startThread()` and `resumeThread(id)` only create `Thread` objects, and actual execution happens later when `Thread.runStreamedInternal()` calls `_exec.run()`.[E: sdk/typescript/src/codex.ts:11][E: sdk/typescript/src/codex.ts:15][E: sdk/typescript/src/codex.ts:17][E: sdk/typescript/src/codex.ts:25][E: sdk/typescript/src/codex.ts:26][E: sdk/typescript/src/codex.ts:36][E: sdk/typescript/src/codex.ts:37][E: sdk/typescript/src/thread.ts:70][E: sdk/typescript/src/thread.ts:77]

`CodexExec.run()` starts CLI args with `["exec", "--experimental-json"]`, appends options such as config/model/sandbox/cwd/add-dir/output-schema/web-search/approval/resume/images, writes the prompt to stdin, yields each stdout line, and throws with stderr details on non-zero exit or signal.[E: sdk/typescript/src/exec.ts:86][E: sdk/typescript/src/exec.ts:87][E: sdk/typescript/src/exec.ts:89][E: sdk/typescript/src/exec.ts:102][E: sdk/typescript/src/exec.ts:106][E: sdk/typescript/src/exec.ts:110][E: sdk/typescript/src/exec.ts:114][E: sdk/typescript/src/exec.ts:124][E: sdk/typescript/src/exec.ts:139][E: sdk/typescript/src/exec.ts:147][E: sdk/typescript/src/exec.ts:151][E: sdk/typescript/src/exec.ts:155][E: sdk/typescript/src/exec.ts:181][E: sdk/typescript/src/exec.ts:193][E: sdk/typescript/src/exec.ts:222][E: sdk/typescript/src/exec.ts:224][E: sdk/typescript/src/exec.ts:229][E: sdk/typescript/src/exec.ts:232]

TS public stream schema is local to the exec event surface: `ThreadEvent` is the top-level JSONL union, and `ThreadItem` is the union of agent-visible item payloads.[E: sdk/typescript/src/events.ts:73][E: sdk/typescript/src/events.ts:74][E: sdk/typescript/src/events.ts:75][E: sdk/typescript/src/events.ts:81][E: sdk/typescript/src/items.ts:119][E: sdk/typescript/src/items.ts:120][E: sdk/typescript/src/items.ts:121][E: sdk/typescript/src/items.ts:128]

`Thread.run()` consumes the same event stream as `runStreamed()`: completed agent-message items update `finalResponse`, all completed items are collected, `turn.completed` provides usage, and `turn.failed` raises.[E: sdk/typescript/src/thread.ts:115][E: sdk/typescript/src/thread.ts:116][E: sdk/typescript/src/thread.ts:121][E: sdk/typescript/src/thread.ts:122][E: sdk/typescript/src/thread.ts:123][E: sdk/typescript/src/thread.ts:124][E: sdk/typescript/src/thread.ts:126][E: sdk/typescript/src/thread.ts:127][E: sdk/typescript/src/thread.ts:129][E: sdk/typescript/src/thread.ts:135][E: sdk/typescript/src/thread.ts:137]

## Python path

Python high-level `Codex` constructs `CodexClient`, starts the process, initializes app-server metadata, and exposes account/thread/model helpers; `AsyncCodex` wraps `AsyncCodexClient` and initializes lazily.[E: sdk/python/src/openai_codex/api.py:75][E: sdk/python/src/openai_codex/api.py:82][E: sdk/python/src/openai_codex/api.py:85][E: sdk/python/src/openai_codex/api.py:86][E: sdk/python/src/openai_codex/api.py:104][E: sdk/python/src/openai_codex/api.py:132][E: sdk/python/src/openai_codex/api.py:282][E: sdk/python/src/openai_codex/api.py:287][E: sdk/python/src/openai_codex/api.py:295][E: sdk/python/src/openai_codex/api.py:308]

`CodexClient.start()` defaults to `codex app-server --listen stdio://`, not `codex exec`, then opens stdio pipes and starts a stderr drain thread plus one stdout reader thread.[E: sdk/python/src/openai_codex/client.py:238][E: sdk/python/src/openai_codex/client.py:246][E: sdk/python/src/openai_codex/client.py:249][E: sdk/python/src/openai_codex/client.py:250][E: sdk/python/src/openai_codex/client.py:252][E: sdk/python/src/openai_codex/client.py:259][E: sdk/python/src/openai_codex/client.py:260][E: sdk/python/src/openai_codex/client.py:271][E: sdk/python/src/openai_codex/client.py:272]

Python request path is app-server JSON-RPC line protocol: `_request_raw()` writes a message with id/method/params, waits on a router response queue, and typed `request()` validates the result with a pydantic response model.[E: sdk/python/src/openai_codex/client.py:311][E: sdk/python/src/openai_codex/client.py:318][E: sdk/python/src/openai_codex/client.py:321][E: sdk/python/src/openai_codex/client.py:323][E: sdk/python/src/openai_codex/client.py:325][E: sdk/python/src/openai_codex/client.py:326][E: sdk/python/src/openai_codex/client.py:329][E: sdk/python/src/openai_codex/client.py:331][E: sdk/python/src/openai_codex/client.py:332][E: sdk/python/src/openai_codex/client.py:337][E: sdk/python/src/openai_codex/client.py:340]

Python typed helpers call app-server v2 methods directly: `thread_start` sends `thread/start`, `thread_resume` sends `thread/resume`, `turn_start` sends `turn/start`, `turn_steer` sends `turn/steer`, and `model_list` sends `model/list`; generated params models are serialized with `model_dump(by_alias=True, exclude_none=True, mode="json")`.[E: sdk/python/src/openai_codex/client.py:82][E: sdk/python/src/openai_codex/client.py:98][E: sdk/python/src/openai_codex/client.py:99][E: sdk/python/src/openai_codex/client.py:100][E: sdk/python/src/openai_codex/client.py:101][E: sdk/python/src/openai_codex/client.py:430][E: sdk/python/src/openai_codex/client.py:434][E: sdk/python/src/openai_codex/client.py:437][E: sdk/python/src/openai_codex/client.py:443][E: sdk/python/src/openai_codex/client.py:602][E: sdk/python/src/openai_codex/client.py:620][E: sdk/python/src/openai_codex/client.py:648][E: sdk/python/src/openai_codex/client.py:655][E: sdk/python/src/openai_codex/client.py:664][E: sdk/python/src/openai_codex/client.py:666]

`MessageRouter` is the split point for Python transport ordering: the reader thread classifies server requests, notifications, and responses; the router routes errors through `map_jsonrpc_error`, turn-scoped notifications to turn queues, login notifications to login queues, goal notifications to goal state, and everything else to the global queue.[E: sdk/python/src/openai_codex/client.py:803][E: sdk/python/src/openai_codex/client.py:808][E: sdk/python/src/openai_codex/client.py:812][E: sdk/python/src/openai_codex/client.py:815][E: sdk/python/src/openai_codex/client.py:819][E: sdk/python/src/openai_codex/_message_router.py:151][E: sdk/python/src/openai_codex/_message_router.py:160][E: sdk/python/src/openai_codex/_message_router.py:164][E: sdk/python/src/openai_codex/_message_router.py:176][E: sdk/python/src/openai_codex/_message_router.py:179][E: sdk/python/src/openai_codex/_message_router.py:191][E: sdk/python/src/openai_codex/_message_router.py:193][E: sdk/python/src/openai_codex/_message_router.py:203][E: sdk/python/src/openai_codex/_message_router.py:207]

## Async and streaming contrast

TS streaming is a CLI stdout JSONL async generator parsed into `ThreadEvent`; Python streaming is a turn-scoped app-server notification queue exposed by `TurnHandle.stream()` / `AsyncTurnHandle.stream()` until matching `turn/completed`.[E: sdk/typescript/src/thread.ts:66][E: sdk/typescript/src/thread.ts:70][E: sdk/typescript/src/thread.ts:97][E: sdk/typescript/src/thread.ts:100][E: sdk/typescript/src/exec.ts:222][E: sdk/typescript/src/exec.ts:224][E: sdk/python/src/openai_codex/api.py:737][E: sdk/python/src/openai_codex/api.py:739][E: sdk/python/src/openai_codex/api.py:742][E: sdk/python/src/openai_codex/api.py:745][E: sdk/python/src/openai_codex/api.py:751][E: sdk/python/src/openai_codex/api.py:784][E: sdk/python/src/openai_codex/api.py:790][E: sdk/python/src/openai_codex/api.py:793][E: sdk/python/src/openai_codex/api.py:799]

Python async layer has no independent subprocess protocol; `AsyncCodexClient` owns a sync `CodexClient` and uses `asyncio.to_thread()` for blocking operations.[E: sdk/python/src/openai_codex/async_client.py:52][E: sdk/python/src/openai_codex/async_client.py:55][E: sdk/python/src/openai_codex/async_client.py:57][E: sdk/python/src/openai_codex/async_client.py:68][E: sdk/python/src/openai_codex/async_client.py:75][E: sdk/python/src/openai_codex/async_client.py:76]

## Consequences

| 维度 | TypeScript SDK | Python SDK | Evidence |
|---|---|---|---|
| Runtime subcommand | `codex exec --experimental-json` | `codex app-server --listen stdio://` | [E: sdk/typescript/src/exec.ts:87][E: sdk/python/src/openai_codex/client.py:252] |
| Transport | stdout JSONL lines parsed as `ThreadEvent` | line-delimited app-server JSON-RPC with routed queues | [E: sdk/typescript/src/exec.ts:222][E: sdk/typescript/src/thread.ts:100][E: sdk/python/src/openai_codex/client.py:323][E: sdk/python/src/openai_codex/_message_router.py:17] |
| Public event model | `events.ts` / `items.ts` exec unions | generated app-server models wrapped in `Notification` / `TurnResult` | [E: sdk/typescript/src/events.ts:74][E: sdk/typescript/src/items.ts:120][E: sdk/python/src/openai_codex/models.py:52][E: sdk/python/src/openai_codex/models.py:88][E: sdk/python/src/openai_codex/models.py:89][E: sdk/python/src/openai_codex/models.py:90][E: sdk/python/src/openai_codex/client.py:750][E: sdk/python/src/openai_codex/client.py:753][E: sdk/python/src/openai_codex/client.py:758][E: sdk/python/src/openai_codex/client.py:761][E: sdk/python/src/openai_codex/_run.py:21] |
| Server requests | TS public path goes through exec, not app-server request handlers | reader thread handles server requests via approval handler | [E: sdk/typescript/src/thread.ts:77][E: sdk/typescript/src/exec.ts:87][E: sdk/python/src/openai_codex/client.py:808][E: sdk/python/src/openai_codex/client.py:809][E: sdk/python/src/openai_codex/client.py:826] |
| Structured output | temp schema path is passed to exec `--output-schema` | `Thread.turn()` passes `output_schema` in `TurnStartParams` | [E: sdk/typescript/src/thread.ts:74][E: sdk/typescript/src/thread.ts:87][E: sdk/typescript/src/exec.ts:124][E: sdk/typescript/src/exec.ts:125][E: sdk/python/src/openai_codex/api.py:582][E: sdk/python/src/openai_codex/api.py:599] |

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

## 相关

- `sdk.ts-overview` -> [TypeScript SDK 总览](ts-overview.md)
- `sdk.py-overview` -> [Python SDK 总览](py-overview.md)
- `rpc.overview` -> [App-Server 协议总览](../app-server/overview.md)
