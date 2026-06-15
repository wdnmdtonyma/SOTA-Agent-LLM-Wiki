---
id: sdk.py-overview
title: Python SDK 总览
kind: sdk
tier: T1
source: [sdk/python/src/codex_app_server/api.py, sdk/python/src/codex_app_server/client.py, sdk/python/src/codex_app_server/async_client.py, sdk/python/src/codex_app_server/_run.py, sdk/python/src/codex_app_server/__init__.py]
symbols: [Codex, AsyncCodex, Thread, AsyncThread, TurnHandle, AsyncTurnHandle, AppServerClient, AsyncAppServerClient, RunResult]
related: [sdk.py-inputs-errors, sdk.sdk-architecture, rpc.overview, rpc.thread-methods, rpc.turn-methods]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Python SDK 是 app-server v2 的 typed client：`Codex`/`AsyncCodex` 启动 `codex app-server --listen stdio://`，发送 typed JSON-RPC requests，消费 typed notifications，并把 thread/turn 操作封装成同步与异步两套 public API。

## 能回答的问题

- Python SDK 如何启动 app-server 并 initialize？
- `Codex`、`Thread`、`TurnHandle` 的同步 API 分工是什么？
- `AsyncCodex`/`AsyncThread`/`AsyncTurnHandle` 如何复用同步 client？
- `RunResult` 如何从 notifications 中收集 final response、items 和 usage？
- Python package 从 `__init__.py` 暴露哪些核心类型？

## Client lifecycle

`Codex` constructor 创建 `AppServerClient`，调用 `start()` 后调用 `initialize()`，再校验 initialize metadata；如果初始化失败，会 close client 后 re-raise。[E: sdk/python/src/codex_app_server/api.py:73][E: sdk/python/src/codex_app_server/api.py:75][E: sdk/python/src/codex_app_server/api.py:76][E: sdk/python/src/codex_app_server/api.py:78][E: sdk/python/src/codex_app_server/api.py:79]

`AppServerClient.start()` 默认解析 Codex binary，然后构造 `[codex_bin, --config..., app-server, --listen, stdio://]`，并用 `subprocess.Popen` 打开 stdin/stdout/stderr text pipes。[E: sdk/python/src/codex_app_server/client.py:161][E: sdk/python/src/codex_app_server/client.py:168][E: sdk/python/src/codex_app_server/client.py:170][E: sdk/python/src/codex_app_server/client.py:172][E: sdk/python/src/codex_app_server/client.py:178][E: sdk/python/src/codex_app_server/client.py:180][E: sdk/python/src/codex_app_server/client.py:181][E: sdk/python/src/codex_app_server/client.py:182][E: sdk/python/src/codex_app_server/client.py:183]

`initialize()` 发送 `initialize` request，params 中包含 clientInfo 和 experimentalApi capability；收到 response 后发送 `initialized` notification。[E: sdk/python/src/codex_app_server/client.py:210][E: sdk/python/src/codex_app_server/client.py:212][E: sdk/python/src/codex_app_server/client.py:214][E: sdk/python/src/codex_app_server/client.py:220][E: sdk/python/src/codex_app_server/client.py:225]

## Public sync surface

`Codex` 的 generated flat methods 中，`thread_start`、`thread_list`、`thread_resume`、`thread_fork` 会构造 generated params model 后调用 `AppServerClient` typed helper；`thread_archive`、`thread_unarchive` 和 `models()` 则直接调用 client helper。[E: sdk/python/src/codex_app_server/api.py:155][E: sdk/python/src/codex_app_server/api.py:171][E: sdk/python/src/codex_app_server/api.py:187][E: sdk/python/src/codex_app_server/api.py:198][E: sdk/python/src/codex_app_server/api.py:216][E: sdk/python/src/codex_app_server/api.py:230][E: sdk/python/src/codex_app_server/api.py:249][E: sdk/python/src/codex_app_server/api.py:263][E: sdk/python/src/codex_app_server/api.py:266][E: sdk/python/src/codex_app_server/api.py:267][E: sdk/python/src/codex_app_server/api.py:269][E: sdk/python/src/codex_app_server/api.py:270][E: sdk/python/src/codex_app_server/api.py:274][E: sdk/python/src/codex_app_server/api.py:275]

`Thread` 持有 `_client` 和 `id`；`Thread.turn()` 把 public input 转成 wire input，构造 `TurnStartParams`，调用 client 的 `turn_start()` helper 并返回 `TurnHandle`；`Thread.run()` 在此基础上收集 notifications 返回 `RunResult`。[E: sdk/python/src/codex_app_server/api.py:481][E: sdk/python/src/codex_app_server/api.py:482][E: sdk/python/src/codex_app_server/api.py:519][E: sdk/python/src/codex_app_server/api.py:534][E: sdk/python/src/codex_app_server/api.py:535][E: sdk/python/src/codex_app_server/api.py:549][E: sdk/python/src/codex_app_server/api.py:550][E: sdk/python/src/codex_app_server/api.py:484][E: sdk/python/src/codex_app_server/api.py:514][E: sdk/python/src/codex_app_server/client.py:364]

`TurnHandle` 暴露 `steer()`、`interrupt()`、`stream()`、`run()`；`stream()` 读取 notifications，直到匹配 `turn/completed` 且 payload turn id 等于当前 handle id。[E: sdk/python/src/codex_app_server/api.py:658][E: sdk/python/src/codex_app_server/api.py:663][E: sdk/python/src/codex_app_server/api.py:666][E: sdk/python/src/codex_app_server/api.py:669][E: sdk/python/src/codex_app_server/api.py:674][E: sdk/python/src/codex_app_server/api.py:677][E: sdk/python/src/codex_app_server/api.py:678][E: sdk/python/src/codex_app_server/api.py:679][E: sdk/python/src/codex_app_server/api.py:681][E: sdk/python/src/codex_app_server/api.py:685]

## Async surface

`AsyncCodex` 包装 `AsyncAppServerClient`，lazy initialize 发生在 context entry 或第一次 awaited API use；`_ensure_initialized()` 使用 async lock，启动 client、initialize、校验 metadata。[E: sdk/python/src/codex_app_server/api.py:278][E: sdk/python/src/codex_app_server/api.py:287][E: sdk/python/src/codex_app_server/api.py:292][E: sdk/python/src/codex_app_server/api.py:293][E: sdk/python/src/codex_app_server/api.py:299][E: sdk/python/src/codex_app_server/api.py:302][E: sdk/python/src/codex_app_server/api.py:306][E: sdk/python/src/codex_app_server/api.py:307][E: sdk/python/src/codex_app_server/api.py:308][E: sdk/python/src/codex_app_server/api.py:349][E: sdk/python/src/codex_app_server/api.py:382][E: sdk/python/src/codex_app_server/api.py:412][E: sdk/python/src/codex_app_server/api.py:446][E: sdk/python/src/codex_app_server/api.py:465][E: sdk/python/src/codex_app_server/api.py:469][E: sdk/python/src/codex_app_server/api.py:475]

`AsyncAppServerClient` 是同步 `AppServerClient` 的 async wrapper，用 `asyncio.Lock` 保护单 stdio transport，并通过 `asyncio.to_thread()` 调用同步函数。[E: sdk/python/src/codex_app_server/async_client.py:39][E: sdk/python/src/codex_app_server/async_client.py:43][E: sdk/python/src/codex_app_server/async_client.py:45][E: sdk/python/src/codex_app_server/async_client.py:61][E: sdk/python/src/codex_app_server/async_client.py:62]

## Run result collection

`RunResult` 包含 optional `final_response`、completed item list 和 optional token usage；collector 在 stream 中收集 matching `ItemCompletedNotification`、`ThreadTokenUsageUpdatedNotification` 和 `TurnCompletedNotification`，未收到 turn completed 时抛错，turn failed 时抛对应错误。[E: sdk/python/src/codex_app_server/_run.py:21][E: sdk/python/src/codex_app_server/_run.py:22][E: sdk/python/src/codex_app_server/_run.py:23][E: sdk/python/src/codex_app_server/_run.py:24][E: sdk/python/src/codex_app_server/_run.py:59][E: sdk/python/src/codex_app_server/_run.py:66][E: sdk/python/src/codex_app_server/_run.py:67][E: sdk/python/src/codex_app_server/_run.py:69][E: sdk/python/src/codex_app_server/_run.py:70][E: sdk/python/src/codex_app_server/_run.py:72][E: sdk/python/src/codex_app_server/_run.py:73][E: sdk/python/src/codex_app_server/_run.py:75][E: sdk/python/src/codex_app_server/_run.py:76][E: sdk/python/src/codex_app_server/_run.py:78]

final assistant response extraction scans completed items in reverse，优先返回 `MessagePhase.final_answer` 的 agent message text；如果 phase 为空，则返回最后一个 unknown-phase agent message text。[E: sdk/python/src/codex_app_server/_run.py:36][E: sdk/python/src/codex_app_server/_run.py:39][E: sdk/python/src/codex_app_server/_run.py:40][E: sdk/python/src/codex_app_server/_run.py:43][E: sdk/python/src/codex_app_server/_run.py:44][E: sdk/python/src/codex_app_server/_run.py:45][E: sdk/python/src/codex_app_server/_run.py:46][E: sdk/python/src/codex_app_server/_run.py:48]

## Exports

`__init__.py` 暴露 sync/async client、config、Codex/Thread/TurnHandle、input types、RunResult、generated v2 model aliases、retry helper 和 error classes；package version 是 `0.2.0`。[E: sdk/python/src/codex_app_server/__init__.py:58][E: sdk/python/src/codex_app_server/__init__.py:62][E: sdk/python/src/codex_app_server/__init__.py:63][E: sdk/python/src/codex_app_server/__init__.py:64][E: sdk/python/src/codex_app_server/__init__.py:65][E: sdk/python/src/codex_app_server/__init__.py:66][E: sdk/python/src/codex_app_server/__init__.py:67][E: sdk/python/src/codex_app_server/__init__.py:68][E: sdk/python/src/codex_app_server/__init__.py:69][E: sdk/python/src/codex_app_server/__init__.py:70][E: sdk/python/src/codex_app_server/__init__.py:72][E: sdk/python/src/codex_app_server/__init__.py:73][E: sdk/python/src/codex_app_server/__init__.py:79][E: sdk/python/src/codex_app_server/__init__.py:80][E: sdk/python/src/codex_app_server/__init__.py:99][E: sdk/python/src/codex_app_server/__init__.py:100][E: sdk/python/src/codex_app_server/__init__.py:101][E: sdk/python/src/codex_app_server/__init__.py:111]

## 设计动机

Python SDK 选择直接绑定 app-server v2，而不是复用 `codex exec` JSONL events；这样它能暴露 thread lifecycle、typed generated models、server requests、notifications 和 sync/async app-server helpers。[I] Async layer 通过 thread offloading 包装 sync stdio client，说明当前实现优先复用一套 JSON-RPC transport code，而不是维护独立 async subprocess protocol。[I]

## Sources

- `sdk/python/src/codex_app_server/api.py`
- `sdk/python/src/codex_app_server/client.py`
- `sdk/python/src/codex_app_server/async_client.py`
- `sdk/python/src/codex_app_server/_run.py`
- `sdk/python/src/codex_app_server/__init__.py`

## 相关

- `sdk.py-inputs-errors` -> [Python inputs/errors](py-inputs-errors.md)
- `sdk.sdk-architecture` -> [SDK 架构对照](sdk-architecture.md)
