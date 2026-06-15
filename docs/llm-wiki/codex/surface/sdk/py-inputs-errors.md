---
id: sdk.py-inputs-errors
title: Python inputs/errors
kind: sdk
tier: T1
source: [sdk/python/src/codex_app_server/_inputs.py, sdk/python/src/codex_app_server/errors.py, sdk/python/src/codex_app_server/retry.py, sdk/python/src/codex_app_server/client.py]
symbols: [TextInput, ImageInput, LocalImageInput, SkillInput, MentionInput, RunInput, AppServerError, JsonRpcError, map_jsonrpc_error, retry_on_overload]
related: [sdk.py-overview, sdk.sdk-architecture, rpc.server-requests]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Python inputs/errors 节点描述 Python SDK 如何把 public input dataclasses 转成 app-server v2 wire `UserInput` items，以及如何把 raw JSON-RPC errors 映射成 typed exceptions 和 overload retry helper。

## 能回答的问题

- Python SDK 支持哪些 input item dataclass？
- string input、single item、list input 如何 normalize 到 wire list？
- JSON-RPC 标准错误码如何映射成 SDK exception class？
- 哪些 overload/retry-limit 错误会被视为 retryable？

## Input dataclasses

Python SDK 定义 `TextInput`、`ImageInput`、`LocalImageInput`、`SkillInput`、`MentionInput` 五种 dataclass；`InputItem` 是五者 union，`Input` 是单 item 或 item list，`RunInput` 额外允许 raw string。[E: sdk/python/src/codex_app_server/_inputs.py:8][E: sdk/python/src/codex_app_server/_inputs.py:9][E: sdk/python/src/codex_app_server/_inputs.py:13][E: sdk/python/src/codex_app_server/_inputs.py:14][E: sdk/python/src/codex_app_server/_inputs.py:18][E: sdk/python/src/codex_app_server/_inputs.py:19][E: sdk/python/src/codex_app_server/_inputs.py:23][E: sdk/python/src/codex_app_server/_inputs.py:24][E: sdk/python/src/codex_app_server/_inputs.py:29][E: sdk/python/src/codex_app_server/_inputs.py:30][E: sdk/python/src/codex_app_server/_inputs.py:35][E: sdk/python/src/codex_app_server/_inputs.py:36][E: sdk/python/src/codex_app_server/_inputs.py:37]

`_to_wire_item()` 把五种 input 分别映射成 wire `{type:"text"|"image"|"localImage"|"skill"|"mention", ...}`；`_to_wire_input()` 把 single item 包装成 one-element list，或逐项转换 list；`_normalize_run_input()` 把 raw string 转成 `TextInput`。[E: sdk/python/src/codex_app_server/_inputs.py:40][E: sdk/python/src/codex_app_server/_inputs.py:41][E: sdk/python/src/codex_app_server/_inputs.py:42][E: sdk/python/src/codex_app_server/_inputs.py:43][E: sdk/python/src/codex_app_server/_inputs.py:44][E: sdk/python/src/codex_app_server/_inputs.py:45][E: sdk/python/src/codex_app_server/_inputs.py:46][E: sdk/python/src/codex_app_server/_inputs.py:47][E: sdk/python/src/codex_app_server/_inputs.py:48][E: sdk/python/src/codex_app_server/_inputs.py:49][E: sdk/python/src/codex_app_server/_inputs.py:50][E: sdk/python/src/codex_app_server/_inputs.py:54][E: sdk/python/src/codex_app_server/_inputs.py:55][E: sdk/python/src/codex_app_server/_inputs.py:56][E: sdk/python/src/codex_app_server/_inputs.py:57][E: sdk/python/src/codex_app_server/_inputs.py:60][E: sdk/python/src/codex_app_server/_inputs.py:61][E: sdk/python/src/codex_app_server/_inputs.py:62]

`AppServerClient._normalize_input_items()` 是低层 typed helper 的 normalization path：`turn_start` 和 `turn_steer` 调用它；string 会变成 `{"type":"text","text":...}`，dict 会变成 one-element list，list 会原样返回。[E: sdk/python/src/codex_app_server/client.py:356][E: sdk/python/src/codex_app_server/client.py:362][E: sdk/python/src/codex_app_server/client.py:377][E: sdk/python/src/codex_app_server/client.py:384][E: sdk/python/src/codex_app_server/client.py:469][E: sdk/python/src/codex_app_server/client.py:473][E: sdk/python/src/codex_app_server/client.py:474][E: sdk/python/src/codex_app_server/client.py:476][E: sdk/python/src/codex_app_server/client.py:477]

## Error classes

`AppServerError` 是 SDK base exception；`JsonRpcError` 保存 raw code/message/data；`TransportClosedError` 表示 app-server transport 意外关闭；`AppServerRpcError` 是 typed JSON-RPC failure base class，下面有 parse/invalid request/method not found/invalid params/internal/server busy/retry-limit 等具体类。[E: sdk/python/src/codex_app_server/errors.py:6][E: sdk/python/src/codex_app_server/errors.py:10][E: sdk/python/src/codex_app_server/errors.py:15][E: sdk/python/src/codex_app_server/errors.py:16][E: sdk/python/src/codex_app_server/errors.py:17][E: sdk/python/src/codex_app_server/errors.py:20][E: sdk/python/src/codex_app_server/errors.py:21][E: sdk/python/src/codex_app_server/errors.py:24][E: sdk/python/src/codex_app_server/errors.py:25][E: sdk/python/src/codex_app_server/errors.py:28][E: sdk/python/src/codex_app_server/errors.py:32][E: sdk/python/src/codex_app_server/errors.py:36][E: sdk/python/src/codex_app_server/errors.py:40][E: sdk/python/src/codex_app_server/errors.py:44][E: sdk/python/src/codex_app_server/errors.py:48][E: sdk/python/src/codex_app_server/errors.py:52]

`map_jsonrpc_error()` 把标准 JSON-RPC code `-32700/-32600/-32601/-32602/-32603` 映射到 parse/invalid request/method not found/invalid params/internal；server error range `-32099..=-32000` 会进一步识别 overload 和 retry-limit 文案。[E: sdk/python/src/codex_app_server/errors.py:90][E: sdk/python/src/codex_app_server/errors.py:93][E: sdk/python/src/codex_app_server/errors.py:94][E: sdk/python/src/codex_app_server/errors.py:95][E: sdk/python/src/codex_app_server/errors.py:96][E: sdk/python/src/codex_app_server/errors.py:97][E: sdk/python/src/codex_app_server/errors.py:98][E: sdk/python/src/codex_app_server/errors.py:99][E: sdk/python/src/codex_app_server/errors.py:100][E: sdk/python/src/codex_app_server/errors.py:101][E: sdk/python/src/codex_app_server/errors.py:102][E: sdk/python/src/codex_app_server/errors.py:104][E: sdk/python/src/codex_app_server/errors.py:105][E: sdk/python/src/codex_app_server/errors.py:106][E: sdk/python/src/codex_app_server/errors.py:107][E: sdk/python/src/codex_app_server/errors.py:108][E: sdk/python/src/codex_app_server/errors.py:109][E: sdk/python/src/codex_app_server/errors.py:111]

`_is_server_overloaded()` 会在 string、dict 和 nested list/dict 中查找 `server_overloaded`，`is_retryable_error()` 对 `ServerBusyError` 返回 true，也对 data 中含 overload marker 的 `JsonRpcError` 返回 true。[E: sdk/python/src/codex_app_server/errors.py:61][E: sdk/python/src/codex_app_server/errors.py:65][E: sdk/python/src/codex_app_server/errors.py:66][E: sdk/python/src/codex_app_server/errors.py:68][E: sdk/python/src/codex_app_server/errors.py:74][E: sdk/python/src/codex_app_server/errors.py:81][E: sdk/python/src/codex_app_server/errors.py:84][E: sdk/python/src/codex_app_server/errors.py:85][E: sdk/python/src/codex_app_server/errors.py:116][E: sdk/python/src/codex_app_server/errors.py:119][E: sdk/python/src/codex_app_server/errors.py:120][E: sdk/python/src/codex_app_server/errors.py:122][E: sdk/python/src/codex_app_server/errors.py:123]

## Retry helper

`retry_on_overload()` 默认 `max_attempts=3`、`initial_delay_s=0.25`、`max_delay_s=2.0`、`jitter_ratio=0.2`；每次 exception 后先检查 attempt limit，再检查 `is_retryable_error()`，然后按 exponential backoff 加 jitter sleep。[E: sdk/python/src/codex_app_server/retry.py:12][E: sdk/python/src/codex_app_server/retry.py:15][E: sdk/python/src/codex_app_server/retry.py:16][E: sdk/python/src/codex_app_server/retry.py:17][E: sdk/python/src/codex_app_server/retry.py:18][E: sdk/python/src/codex_app_server/retry.py:32][E: sdk/python/src/codex_app_server/retry.py:34][E: sdk/python/src/codex_app_server/retry.py:37][E: sdk/python/src/codex_app_server/retry.py:38][E: sdk/python/src/codex_app_server/retry.py:39][E: sdk/python/src/codex_app_server/retry.py:40][E: sdk/python/src/codex_app_server/retry.py:41]

`AppServerClient.request_with_retry_on_overload()` 用同样默认值把 arbitrary method/params/response model 包装进 `retry_on_overload()`。[E: sdk/python/src/codex_app_server/client.py:396][E: sdk/python/src/codex_app_server/client.py:398][E: sdk/python/src/codex_app_server/client.py:399][E: sdk/python/src/codex_app_server/client.py:401][E: sdk/python/src/codex_app_server/client.py:402][E: sdk/python/src/codex_app_server/client.py:403][E: sdk/python/src/codex_app_server/client.py:404][E: sdk/python/src/codex_app_server/client.py:406][E: sdk/python/src/codex_app_server/client.py:407][E: sdk/python/src/codex_app_server/client.py:410]

## Server request default handler

Python SDK low-level client 会在 `_request_raw()` 和 `next_notification()` 读到 server request 时调用 approval handler 并写回 result；默认 approval handler 对 `item/commandExecution/requestApproval` 和 `item/fileChange/requestApproval` 返回 `{"decision":"accept"}`，其他 server request 返回空 object。[E: sdk/python/src/codex_app_server/client.py:247][E: sdk/python/src/codex_app_server/client.py:248][E: sdk/python/src/codex_app_server/client.py:249][E: sdk/python/src/codex_app_server/client.py:282][E: sdk/python/src/codex_app_server/client.py:283][E: sdk/python/src/codex_app_server/client.py:284][E: sdk/python/src/codex_app_server/client.py:479][E: sdk/python/src/codex_app_server/client.py:480][E: sdk/python/src/codex_app_server/client.py:481][E: sdk/python/src/codex_app_server/client.py:482][E: sdk/python/src/codex_app_server/client.py:483][E: sdk/python/src/codex_app_server/client.py:484][E: sdk/python/src/codex_app_server/client.py:503][E: sdk/python/src/codex_app_server/client.py:508]

## 设计动机

input dataclasses 将 Python public API 与 app-server wire item names 解耦，调用者可以传 Pythonic objects，transport 层统一生成 camelCase/tagged JSON。[I] error mapping 把 raw JSON-RPC codes 转成稳定 exception classes，同时保留 `JsonRpcError.data`，让 higher-level retry helper 可以识别 server overload 而不丢失原始错误细节。[I]

## Sources

- `sdk/python/src/codex_app_server/_inputs.py`
- `sdk/python/src/codex_app_server/errors.py`
- `sdk/python/src/codex_app_server/retry.py`
- `sdk/python/src/codex_app_server/client.py`

## 相关

- `sdk.py-overview` -> [Python SDK 总览](py-overview.md)
- `rpc.server-requests` -> [server->client requests](../app-server/server-requests.md)
