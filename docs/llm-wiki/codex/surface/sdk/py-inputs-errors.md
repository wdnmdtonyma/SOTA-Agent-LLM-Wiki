---
id: sdk.py-inputs-errors
title: Python inputs/errors
kind: sdk
tier: T1
source: [sdk/python/src/openai_codex/_inputs.py, sdk/python/src/openai_codex/errors.py, sdk/python/src/openai_codex/retry.py, sdk/python/src/openai_codex/client.py, sdk/python/src/openai_codex/_message_router.py]
symbols: [TextInput, ImageInput, LocalImageInput, SkillInput, MentionInput, ExternalMessage, RunInput, CodexError, JsonRpcError, CodexRpcError, map_jsonrpc_error, is_retryable_error, retry_on_overload, MessageRouter]
related: [sdk.py-overview, sdk.sdk-architecture, rpc.server-requests]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Python inputs/errors describes the `openai_codex` public input dataclasses (including run-level `ExternalMessage`), their conversion into app-server v2 `UserInput`-style JSON items, the SDK's typed JSON-RPC exception hierarchy, overload retry helper, and the `MessageRouter` that maps raw responses/errors/notifications from the single stdout reader thread.[E: sdk/python/src/openai_codex/_inputs.py:10][E: sdk/python/src/openai_codex/_inputs.py:48][E: sdk/python/src/openai_codex/_inputs.py:67][E: sdk/python/src/openai_codex/errors.py:6][E: sdk/python/src/openai_codex/errors.py:86][E: sdk/python/src/openai_codex/retry.py:12][E: sdk/python/src/openai_codex/_message_router.py:69][E: sdk/python/src/openai_codex/client.py:863]

## 能回答的问题

- Python SDK 当前支持哪些 public input item dataclass？
- `ExternalMessage` 与 `RunInput` 如何进入 turn wire payload？
- string input、single item、list input 如何 normalize 到 wire list？
- JSON-RPC 标准错误码和 overload/retry-limit errors 如何映射？
- `retry_on_overload()` 的 retry/backoff 规则是什么？
- reader thread 如何把 response、server request、notification 分流到 request/turn/login/global/goal routes？

## Input dataclasses

Python SDK defines `TextInput`, `ImageInput`, `LocalImageInput`, `SkillInput`, and `MentionInput` as `InputItem`; `Input` is a single item or list. `ExternalMessage` is a public run-level input for untrusted tool/agent content. `RunInput` is `Input | str | ExternalMessage`.[E: sdk/python/src/openai_codex/_inputs.py:10][E: sdk/python/src/openai_codex/_inputs.py:17][E: sdk/python/src/openai_codex/_inputs.py:24][E: sdk/python/src/openai_codex/_inputs.py:31][E: sdk/python/src/openai_codex/_inputs.py:39][E: sdk/python/src/openai_codex/_inputs.py:48][E: sdk/python/src/openai_codex/_inputs.py:65][E: sdk/python/src/openai_codex/_inputs.py:66][E: sdk/python/src/openai_codex/_inputs.py:67]

`_to_wire_item()` maps those five item classes to tagged wire objects with `type: "text" | "image" | "localImage" | "skill" | "mention"`; `_to_wire_input()` wraps a single item or maps a list; `_normalize_run_input()` converts a raw string to `TextInput`. `_to_wire_turn_input()` is the `RunInput` entry: `ExternalMessage` becomes an empty item list plus `TurnToolOutput`, otherwise it normalizes to the five-item wire list.[E: sdk/python/src/openai_codex/_inputs.py:70][E: sdk/python/src/openai_codex/_inputs.py:72][E: sdk/python/src/openai_codex/_inputs.py:74][E: sdk/python/src/openai_codex/_inputs.py:76][E: sdk/python/src/openai_codex/_inputs.py:78][E: sdk/python/src/openai_codex/_inputs.py:80][E: sdk/python/src/openai_codex/_inputs.py:84][E: sdk/python/src/openai_codex/_inputs.py:90][E: sdk/python/src/openai_codex/_inputs.py:96][E: sdk/python/src/openai_codex/_inputs.py:97][E: sdk/python/src/openai_codex/_inputs.py:100][E: sdk/python/src/openai_codex/_inputs.py:103]

Low-level `CodexClient._normalize_input_items()` is the typed helper path used by `turn_start` and `turn_steer`: string becomes one text object, dict becomes a one-element list, and list is returned unchanged.[E: sdk/python/src/openai_codex/client.py:650][E: sdk/python/src/openai_codex/client.py:675][E: sdk/python/src/openai_codex/client.py:708][E: sdk/python/src/openai_codex/client.py:719][E: sdk/python/src/openai_codex/client.py:823][E: sdk/python/src/openai_codex/client.py:827][E: sdk/python/src/openai_codex/client.py:828][E: sdk/python/src/openai_codex/client.py:829][E: sdk/python/src/openai_codex/client.py:830][E: sdk/python/src/openai_codex/client.py:831]

## Error classes

`CodexError` is the SDK base exception; `JsonRpcError` stores raw code/message/data; `TransportClosedError` means the local Codex transport closed; `CodexRpcError` is the typed JSON-RPC base class with parse/invalid request/method not found/invalid params/internal/server busy/retry-limit subclasses.[E: sdk/python/src/openai_codex/errors.py:6][E: sdk/python/src/openai_codex/errors.py:10][E: sdk/python/src/openai_codex/errors.py:13][E: sdk/python/src/openai_codex/errors.py:15][E: sdk/python/src/openai_codex/errors.py:17][E: sdk/python/src/openai_codex/errors.py:20][E: sdk/python/src/openai_codex/errors.py:24][E: sdk/python/src/openai_codex/errors.py:28][E: sdk/python/src/openai_codex/errors.py:32][E: sdk/python/src/openai_codex/errors.py:36][E: sdk/python/src/openai_codex/errors.py:40][E: sdk/python/src/openai_codex/errors.py:44][E: sdk/python/src/openai_codex/errors.py:48][E: sdk/python/src/openai_codex/errors.py:52]

`map_jsonrpc_error()` maps standard JSON-RPC codes `-32700/-32600/-32601/-32602/-32603` to parse/invalid request/method not found/invalid params/internal; server error range `-32099..=-32000` recognizes overload markers and retry-limit text before falling back to `CodexRpcError`.[E: sdk/python/src/openai_codex/errors.py:86][E: sdk/python/src/openai_codex/errors.py:89][E: sdk/python/src/openai_codex/errors.py:91][E: sdk/python/src/openai_codex/errors.py:93][E: sdk/python/src/openai_codex/errors.py:95][E: sdk/python/src/openai_codex/errors.py:97][E: sdk/python/src/openai_codex/errors.py:100][E: sdk/python/src/openai_codex/errors.py:101][E: sdk/python/src/openai_codex/errors.py:102][E: sdk/python/src/openai_codex/errors.py:103][E: sdk/python/src/openai_codex/errors.py:104][E: sdk/python/src/openai_codex/errors.py:105][E: sdk/python/src/openai_codex/errors.py:106][E: sdk/python/src/openai_codex/errors.py:107][E: sdk/python/src/openai_codex/errors.py:109]

`_is_server_overloaded()` searches string, dict, nested dict/list shapes for `server_overloaded`; `is_retryable_error()` treats `ServerBusyError` as retryable and also checks raw `JsonRpcError.data` for that overload marker.[E: sdk/python/src/openai_codex/errors.py:61][E: sdk/python/src/openai_codex/errors.py:65][E: sdk/python/src/openai_codex/errors.py:68][E: sdk/python/src/openai_codex/errors.py:69][E: sdk/python/src/openai_codex/errors.py:72][E: sdk/python/src/openai_codex/errors.py:76][E: sdk/python/src/openai_codex/errors.py:80][E: sdk/python/src/openai_codex/errors.py:81][E: sdk/python/src/openai_codex/errors.py:112][E: sdk/python/src/openai_codex/errors.py:115][E: sdk/python/src/openai_codex/errors.py:118][E: sdk/python/src/openai_codex/errors.py:119]

## Retry helper

`retry_on_overload()` defaults to `max_attempts=3`, `initial_delay_s=0.25`, `max_delay_s=2.0`, and `jitter_ratio=0.2`; it rejects `max_attempts < 1`, reraises once the attempt limit is hit or an error is not retryable, and otherwise sleeps with exponential backoff plus jitter.[E: sdk/python/src/openai_codex/retry.py:12][E: sdk/python/src/openai_codex/retry.py:15][E: sdk/python/src/openai_codex/retry.py:16][E: sdk/python/src/openai_codex/retry.py:17][E: sdk/python/src/openai_codex/retry.py:18][E: sdk/python/src/openai_codex/retry.py:22][E: sdk/python/src/openai_codex/retry.py:27][E: sdk/python/src/openai_codex/retry.py:32][E: sdk/python/src/openai_codex/retry.py:34][E: sdk/python/src/openai_codex/retry.py:37][E: sdk/python/src/openai_codex/retry.py:38][E: sdk/python/src/openai_codex/retry.py:40][E: sdk/python/src/openai_codex/retry.py:41]

`CodexClient.request_with_retry_on_overload()` wraps arbitrary method/params/response_model calls in the same retry helper defaults.[E: sdk/python/src/openai_codex/client.py:731][E: sdk/python/src/openai_codex/client.py:737][E: sdk/python/src/openai_codex/client.py:738][E: sdk/python/src/openai_codex/client.py:739][E: sdk/python/src/openai_codex/client.py:741][E: sdk/python/src/openai_codex/client.py:742][E: sdk/python/src/openai_codex/client.py:743][E: sdk/python/src/openai_codex/client.py:744][E: sdk/python/src/openai_codex/client.py:745]

## Router and server requests

`CodexClient._reader_loop()` is the sole stdout reader: messages with both method and id are server requests and get an approval-handler response, messages with method and no id are coerced and routed as notifications, and all other messages are routed as responses.[E: sdk/python/src/openai_codex/client.py:863][E: sdk/python/src/openai_codex/client.py:867][E: sdk/python/src/openai_codex/client.py:868][E: sdk/python/src/openai_codex/client.py:869][E: sdk/python/src/openai_codex/client.py:870][E: sdk/python/src/openai_codex/client.py:872][E: sdk/python/src/openai_codex/client.py:875][E: sdk/python/src/openai_codex/client.py:879]

The default approval handler accepts `item/commandExecution/requestApproval` and `item/fileChange/requestApproval`, returning an empty object for other server requests.[E: sdk/python/src/openai_codex/client.py:833][E: sdk/python/src/openai_codex/client.py:835][E: sdk/python/src/openai_codex/client.py:836][E: sdk/python/src/openai_codex/client.py:837][E: sdk/python/src/openai_codex/client.py:838][E: sdk/python/src/openai_codex/client.py:839]

`MessageRouter` stores response waiters, login queues, turn queues, goal operation state, and a global notification queue; response errors are converted through `map_jsonrpc_error`, login notifications are routed by login id, turn notifications are queued by turn id with early-event replay, goal notifications can be captured by thread-scoped goal state, and unrouted notifications go global.[E: sdk/python/src/openai_codex/_message_router.py:69][E: sdk/python/src/openai_codex/_message_router.py:78][E: sdk/python/src/openai_codex/_message_router.py:82][E: sdk/python/src/openai_codex/_message_router.py:83][E: sdk/python/src/openai_codex/_message_router.py:32][E: sdk/python/src/openai_codex/_message_router.py:89][E: sdk/python/src/openai_codex/_message_router.py:90][E: sdk/python/src/openai_codex/_message_router.py:92][E: sdk/python/src/openai_codex/_message_router.py:208][E: sdk/python/src/openai_codex/_message_router.py:258][E: sdk/python/src/openai_codex/_message_router.py:267][E: sdk/python/src/openai_codex/_message_router.py:271][E: sdk/python/src/openai_codex/_message_router.py:283][E: sdk/python/src/openai_codex/_message_router.py:286][E: sdk/python/src/openai_codex/_message_router.py:298][E: sdk/python/src/openai_codex/_message_router.py:300][E: sdk/python/src/openai_codex/_message_router.py:310][E: sdk/python/src/openai_codex/_message_router.py:301]

`fail_all()` wakes all outstanding response/login/turn/goal/global waiters with the same transport exception so SDK calls do not block forever after reader-thread failure.[E: sdk/python/src/openai_codex/_message_router.py:324][E: sdk/python/src/openai_codex/_message_router.py:327][E: sdk/python/src/openai_codex/_message_router.py:328][E: sdk/python/src/openai_codex/_message_router.py:330][E: sdk/python/src/openai_codex/_message_router.py:226][E: sdk/python/src/openai_codex/_message_router.py:341][E: sdk/python/src/openai_codex/_message_router.py:345][E: sdk/python/src/openai_codex/_message_router.py:347][E: sdk/python/src/openai_codex/_message_router.py:236][E: sdk/python/src/openai_codex/_message_router.py:349][E: sdk/python/src/openai_codex/_message_router.py:351]

## 设计动机

The SDK separates public Pythonic input objects from app-server wire item names, letting high-level APIs accept dataclasses while the low-level client can still pass raw dict/list/string inputs for generated helper calls.[I] Error mapping keeps raw JSON-RPC details while giving callers stable exception classes and a small overload retry predicate.[I] A single reader thread plus `MessageRouter` avoids multiple SDK methods racing to read the same stdio stream.[I]

## Sources

- `sdk/python/src/openai_codex/_inputs.py`
- `sdk/python/src/openai_codex/errors.py`
- `sdk/python/src/openai_codex/retry.py`
- `sdk/python/src/openai_codex/client.py`
- `sdk/python/src/openai_codex/_message_router.py`

## 相关

- `sdk.py-overview` -> [Python SDK 总览](py-overview.md)
- `rpc.server-requests` -> [server->client requests](../app-server/server-requests.md)
