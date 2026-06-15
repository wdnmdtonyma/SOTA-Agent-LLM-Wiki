---
id: sdk.sdk-architecture
title: SDK 架构对照
kind: sdk
tier: T1
source: [sdk/typescript/src/codex.ts, sdk/typescript/src/thread.ts, sdk/typescript/src/exec.ts, sdk/typescript/src/events.ts, sdk/typescript/src/items.ts, sdk/python/src/codex_app_server/api.py, sdk/python/src/codex_app_server/client.py, sdk/python/src/codex_app_server/async_client.py]
symbols: [Codex, CodexExec, AppServerClient, AsyncAppServerClient, Thread, TurnHandle]
related: [sdk.ts-overview, sdk.ts-events-items, sdk.ts-structured-output, sdk.py-overview, sdk.py-inputs-errors, rpc.overview]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex SDK 当前有两条不同架构线：TypeScript SDK 是 `codex exec --experimental-json` 的 typed event wrapper，Python SDK 是 `codex app-server --listen stdio://` 的 typed JSON-RPC client。[E: sdk/typescript/src/exec.ts:73][E: sdk/typescript/src/exec.ts:207][E: sdk/python/src/codex_app_server/client.py:172][E: sdk/python/src/codex_app_server/client.py:242][E: sdk/python/src/codex_app_server/client.py:517]

## 能回答的问题

- TS SDK 和 Python SDK 各自启动哪个 Codex CLI subcommand？
- 哪个 SDK 使用 JSONL event stream，哪个 SDK 使用 app-server JSON-RPC line protocol？
- 两边的 public thread/run API 为什么相似但底层模型不同？
- app-server protocol 与 SDK generated model 的关系如何体现？

## TypeScript path

TS `Codex` 只创建 `CodexExec`，`startThread()`/`resumeThread()` 只返回 `Thread` 对象；真正执行发生在 `Thread.runStreamedInternal()` 调用 `_exec.run()` 时。[E: sdk/typescript/src/codex.ts:15][E: sdk/typescript/src/codex.ts:17][E: sdk/typescript/src/codex.ts:25][E: sdk/typescript/src/codex.ts:26][E: sdk/typescript/src/codex.ts:36][E: sdk/typescript/src/codex.ts:37][E: sdk/typescript/src/thread.ts:77]

`CodexExec.run()` 用 `["exec", "--experimental-json"]` 作为 CLI args 起点，spawn child process，向 stdin 写 prompt，并逐行 yield stdout JSONL string；TS `Thread` 再把每行 JSON.parse 成 `ThreadEvent`。[E: sdk/typescript/src/exec.ts:72][E: sdk/typescript/src/exec.ts:73][E: sdk/typescript/src/exec.ts:164][E: sdk/typescript/src/exec.ts:176][E: sdk/typescript/src/exec.ts:205][E: sdk/typescript/src/exec.ts:207][E: sdk/typescript/src/thread.ts:99][E: sdk/typescript/src/thread.ts:100]

TS binary resolution 通过 platform/arch 选择 `@openai/codex-*` optional package 下的 vendor binary；如果用户传 `codexPathOverride`，constructor 直接使用 override。[E: sdk/typescript/src/exec.ts:46][E: sdk/typescript/src/exec.ts:51][E: sdk/typescript/src/exec.ts:63][E: sdk/typescript/src/exec.ts:67][E: sdk/typescript/src/exec.ts:317][E: sdk/typescript/src/exec.ts:318][E: sdk/typescript/src/exec.ts:367][E: sdk/typescript/src/exec.ts:374][E: sdk/typescript/src/exec.ts:376][E: sdk/typescript/src/exec.ts:384][E: sdk/typescript/src/exec.ts:385][E: sdk/typescript/src/exec.ts:386][E: sdk/typescript/src/exec.ts:388]

## Python path

Python `Codex` constructor 创建 `AppServerClient`、启动进程并 initialize；`AppServerClient.start()` 默认启动 `codex app-server --listen stdio://`，而不是 `codex exec`。[E: sdk/python/src/codex_app_server/api.py:73][E: sdk/python/src/codex_app_server/api.py:75][E: sdk/python/src/codex_app_server/api.py:76][E: sdk/python/src/codex_app_server/client.py:168][E: sdk/python/src/codex_app_server/client.py:172][E: sdk/python/src/codex_app_server/client.py:178]

Python request path 是 JSON-RPC line protocol：`_request_raw()` 写 `{"id","method","params"}`，循环读取 messages；如果读到 server request 会调用 handler 并写 `{"id","result"}`，如果读到 notification 会排入 pending notifications，最终匹配 request id 后返回 result。[E: sdk/python/src/codex_app_server/client.py:240][E: sdk/python/src/codex_app_server/client.py:242][E: sdk/python/src/codex_app_server/client.py:244][E: sdk/python/src/codex_app_server/client.py:245][E: sdk/python/src/codex_app_server/client.py:247][E: sdk/python/src/codex_app_server/client.py:248][E: sdk/python/src/codex_app_server/client.py:249][E: sdk/python/src/codex_app_server/client.py:252][E: sdk/python/src/codex_app_server/client.py:253][E: sdk/python/src/codex_app_server/client.py:254][E: sdk/python/src/codex_app_server/client.py:258][E: sdk/python/src/codex_app_server/client.py:271]

Python typed helpers call app-server v2 methods directly，例如 `thread_start` 发送 `thread/start`，`turn_start` 发送 `turn/start`，`model_list` 发送 `model/list`；params model 用 pydantic `model_dump(by_alias=True, exclude_none=True, mode="json")` 转成 wire dict。[E: sdk/python/src/codex_app_server/client.py:53][E: sdk/python/src/codex_app_server/client.py:68][E: sdk/python/src/codex_app_server/client.py:69][E: sdk/python/src/codex_app_server/client.py:70][E: sdk/python/src/codex_app_server/client.py:304][E: sdk/python/src/codex_app_server/client.py:305][E: sdk/python/src/codex_app_server/client.py:364][E: sdk/python/src/codex_app_server/client.py:390][E: sdk/python/src/codex_app_server/client.py:391]

## Async and streaming contrast

TS stream 是 CLI stdout JSONL 的 async generator；Python stream 是 app-server notification queue 的 iterator，`TurnHandle.stream()` 直到 `turn/completed` notification 后停止。[E: sdk/typescript/src/thread.ts:20][E: sdk/typescript/src/thread.ts:97][E: sdk/typescript/src/exec.ts:205][E: sdk/typescript/src/exec.ts:207][E: sdk/typescript/src/thread.ts:107][E: sdk/python/src/codex_app_server/client.py:276][E: sdk/python/src/codex_app_server/client.py:278][E: sdk/python/src/codex_app_server/api.py:669][E: sdk/python/src/codex_app_server/api.py:674][E: sdk/python/src/codex_app_server/api.py:677][E: sdk/python/src/codex_app_server/api.py:680]

Python async layer 没有独立 transport；`AsyncAppServerClient` 包装同步 client，用 async lock 和 `asyncio.to_thread()` 执行 sync calls，保护单 stdio transport 不被多个线程同时读取。[E: sdk/python/src/codex_app_server/async_client.py:39][E: sdk/python/src/codex_app_server/async_client.py:43][E: sdk/python/src/codex_app_server/async_client.py:45][E: sdk/python/src/codex_app_server/async_client.py:61][E: sdk/python/src/codex_app_server/async_client.py:62]

## Consequences

| 维度 | TypeScript SDK | Python SDK | Evidence |
|---|---|---|---|
| Runtime subcommand | `codex exec --experimental-json` | `codex app-server --listen stdio://` | [E: sdk/typescript/src/exec.ts:73][E: sdk/python/src/codex_app_server/client.py:172] |
| Transport | stdout JSONL lines parsed as `ThreadEvent` | line-delimited JSON-RPC request/response/notification | [E: sdk/typescript/src/exec.ts:205][E: sdk/typescript/src/exec.ts:207][E: sdk/typescript/src/thread.ts:100][E: sdk/python/src/codex_app_server/client.py:242][E: sdk/python/src/codex_app_server/client.py:517][E: sdk/python/src/codex_app_server/client.py:531] |
| Public event model | `events.ts`/`items.ts` exec event union | generated app-server v2 notifications and models | [E: sdk/typescript/src/events.ts:71][E: sdk/typescript/src/events.ts:72][E: sdk/typescript/src/events.ts:80][E: sdk/typescript/src/items.ts:118][E: sdk/typescript/src/items.ts:119][E: sdk/typescript/src/items.ts:127][E: sdk/python/src/codex_app_server/api.py:9][E: sdk/python/src/codex_app_server/client.py:16] |
| Server requests | TypeScript SDK public path goes through `CodexExec`/`Thread` exec flow, not through app-server client helpers | `_handle_server_request()` approval handler path | [E: sdk/typescript/src/codex.ts:17][E: sdk/typescript/src/thread.ts:77][E: sdk/typescript/src/exec.ts:73][E: sdk/python/src/codex_app_server/client.py:247][E: sdk/python/src/codex_app_server/client.py:248][E: sdk/python/src/codex_app_server/client.py:508][E: sdk/python/src/codex_app_server/client.py:510] |
| Structured output | schema path returned by `createOutputSchemaFile()` is passed to the exec CLI `--output-schema` flag | `Thread.turn()` accepts `output_schema` in `TurnStartParams` | [E: sdk/typescript/src/thread.ts:74][E: sdk/typescript/src/thread.ts:87][E: sdk/typescript/src/exec.ts:110][E: sdk/typescript/src/exec.ts:111][E: sdk/python/src/codex_app_server/api.py:528][E: sdk/python/src/codex_app_server/api.py:543] |

## 设计动机

两个 SDK 都提供“Codex -> Thread -> run/stream”形状，但 TS SDK 优先复用 exec mode 的简单 JSONL contract，Python SDK 优先复用 app-server protocol 的完整 typed RPC/control surface。[I] 因此检索源码时不能把 TS `ThreadEvent` 和 Python app-server `Notification` / generated notification payloads 当成同一 schema：它们都描述 turn 进展，但来源文件、字段命名和可见能力范围不同。[I]

## Sources

- `sdk/typescript/src/codex.ts`
- `sdk/typescript/src/thread.ts`
- `sdk/typescript/src/exec.ts`
- `sdk/typescript/src/events.ts`
- `sdk/typescript/src/items.ts`
- `sdk/python/src/codex_app_server/api.py`
- `sdk/python/src/codex_app_server/client.py`
- `sdk/python/src/codex_app_server/async_client.py`

## 相关

- `sdk.ts-overview` -> [TypeScript SDK 总览](ts-overview.md)
- `sdk.py-overview` -> [Python SDK 总览](py-overview.md)
- `rpc.overview` -> [App-Server 协议总览](../app-server/overview.md)
