---
id: sdk.py-inputs-errors
title: Python inputs/errors
kind: sdk
tier: T1
source: [sdk/python/src/openai_codex/_inputs.py, sdk/python/src/openai_codex/errors.py, sdk/python/src/openai_codex/retry.py, sdk/python/src/openai_codex/client.py, sdk/python/src/openai_codex/_message_router.py]
symbols: [TextInput, ImageInput, LocalImageInput, SkillInput, MentionInput, RunInput, CodexError, JsonRpcError, CodexRpcError, map_jsonrpc_error, is_retryable_error, retry_on_overload, MessageRouter]
related: [sdk.py-overview, sdk.sdk-architecture, rpc.server-requests]
evidence: explicit
status: verified
updated: 5670360009
---

> Python inputs/errors describes the `openai_codex` public input dataclasses, their conversion into app-server v2 `UserInput`-style JSON items, the SDK's typed JSON-RPC exception hierarchy, overload retry helper, and the `MessageRouter` that maps raw responses/errors/notifications from the single stdout reader thread.[E: sdk/python/src/openai_codex/_inputs.py:8][E: sdk/python/src/openai_codex/_inputs.py:45][E: sdk/python/src/openai_codex/errors.py:6][E: sdk/python/src/openai_codex/errors.py:86][E: sdk/python/src/openai_codex/retry.py:12][E: sdk/python/src/openai_codex/_message_router.py:17][E: sdk/python/src/openai_codex/client.py:803]

## 能回答的问题

- Python SDK 当前支持哪些 public input item dataclass？
- string input、single item、list input 如何 normalize 到 wire list？
- JSON-RPC 标准错误码和 overload/retry-limit errors 如何映射？
- `retry_on_overload()` 的 retry/backoff 规则是什么？
- reader thread 如何把 response、server request、notification 分流到 request/turn/login/global/goal routes？

## Input dataclasses

Python SDK defines `TextInput`, `ImageInput`, `LocalImageInput`, `SkillInput`, and `MentionInput`; `InputItem` is that union, `Input` is a single input item or list, and `RunInput` additionally allows a raw string.[E: sdk/python/src/openai_codex/_inputs.py:8][E: sdk/python/src/openai_codex/_inputs.py:12][E: sdk/python/src/openai_codex/_inputs.py:15][E: sdk/python/src/openai_codex/_inputs.py:19][E: sdk/python/src/openai_codex/_inputs.py:22][E: sdk/python/src/openai_codex/_inputs.py:26][E: sdk/python/src/openai_codex/_inputs.py:29][E: sdk/python/src/openai_codex/_inputs.py:33][E: sdk/python/src/openai_codex/_inputs.py:37][E: sdk/python/src/openai_codex/_inputs.py:41][E: sdk/python/src/openai_codex/_inputs.py:45][E: sdk/python/src/openai_codex/_inputs.py:46][E: sdk/python/src/openai_codex/_inputs.py:47]

`_to_wire_item()` maps those five item classes to tagged wire objects with `type: "text" | "image" | "localImage" | "skill" | "mention"`; `_to_wire_input()` wraps a single item or maps a list; `_normalize_run_input()` converts a raw string to `TextInput`.[E: sdk/python/src/openai_codex/_inputs.py:50][E: sdk/python/src/openai_codex/_inputs.py:51][E: sdk/python/src/openai_codex/_inputs.py:52][E: sdk/python/src/openai_codex/_inputs.py:53][E: sdk/python/src/openai_codex/_inputs.py:54][E: sdk/python/src/openai_codex/_inputs.py:55][E: sdk/python/src/openai_codex/_inputs.py:56][E: sdk/python/src/openai_codex/_inputs.py:57][E: sdk/python/src/openai_codex/_inputs.py:58][E: sdk/python/src/openai_codex/_inputs.py:59][E: sdk/python/src/openai_codex/_inputs.py:60][E: sdk/python/src/openai_codex/_inputs.py:64][E: sdk/python/src/openai_codex/_inputs.py:65][E: sdk/python/src/openai_codex/_inputs.py:66][E: sdk/python/src/openai_codex/_inputs.py:67][E: sdk/python/src/openai_codex/_inputs.py:70][E: sdk/python/src/openai_codex/_inputs.py:71][E: sdk/python/src/openai_codex/_inputs.py:72]

Low-level `CodexClient._normalize_input_items()` is the typed helper path used by `turn_start` and `turn_steer`: string becomes one text object, dict becomes a one-element list, and list is returned unchanged.[E: sdk/python/src/openai_codex/client.py:602][E: sdk/python/src/openai_codex/client.py:618][E: sdk/python/src/openai_codex/client.py:648][E: sdk/python/src/openai_codex/client.py:659][E: sdk/python/src/openai_codex/client.py:763][E: sdk/python/src/openai_codex/client.py:767][E: sdk/python/src/openai_codex/client.py:768][E: sdk/python/src/openai_codex/client.py:769][E: sdk/python/src/openai_codex/client.py:770][E: sdk/python/src/openai_codex/client.py:771]

## Error classes

`CodexError` is the SDK base exception; `JsonRpcError` stores raw code/message/data; `TransportClosedError` means the local Codex transport closed; `CodexRpcError` is the typed JSON-RPC base class with parse/invalid request/method not found/invalid params/internal/server busy/retry-limit subclasses.[E: sdk/python/src/openai_codex/errors.py:6][E: sdk/python/src/openai_codex/errors.py:10][E: sdk/python/src/openai_codex/errors.py:13][E: sdk/python/src/openai_codex/errors.py:15][E: sdk/python/src/openai_codex/errors.py:17][E: sdk/python/src/openai_codex/errors.py:20][E: sdk/python/src/openai_codex/errors.py:24][E: sdk/python/src/openai_codex/errors.py:28][E: sdk/python/src/openai_codex/errors.py:32][E: sdk/python/src/openai_codex/errors.py:36][E: sdk/python/src/openai_codex/errors.py:40][E: sdk/python/src/openai_codex/errors.py:44][E: sdk/python/src/openai_codex/errors.py:48][E: sdk/python/src/openai_codex/errors.py:52]

`map_jsonrpc_error()` maps standard JSON-RPC codes `-32700/-32600/-32601/-32602/-32603` to parse/invalid request/method not found/invalid params/internal; server error range `-32099..=-32000` recognizes overload markers and retry-limit text before falling back to `CodexRpcError`.[E: sdk/python/src/openai_codex/errors.py:86][E: sdk/python/src/openai_codex/errors.py:89][E: sdk/python/src/openai_codex/errors.py:91][E: sdk/python/src/openai_codex/errors.py:93][E: sdk/python/src/openai_codex/errors.py:95][E: sdk/python/src/openai_codex/errors.py:97][E: sdk/python/src/openai_codex/errors.py:100][E: sdk/python/src/openai_codex/errors.py:101][E: sdk/python/src/openai_codex/errors.py:102][E: sdk/python/src/openai_codex/errors.py:103][E: sdk/python/src/openai_codex/errors.py:104][E: sdk/python/src/openai_codex/errors.py:105][E: sdk/python/src/openai_codex/errors.py:106][E: sdk/python/src/openai_codex/errors.py:107][E: sdk/python/src/openai_codex/errors.py:109]

`_is_server_overloaded()` searches string, dict, nested dict/list shapes for `server_overloaded`; `is_retryable_error()` treats `ServerBusyError` as retryable and also checks raw `JsonRpcError.data` for that overload marker.[E: sdk/python/src/openai_codex/errors.py:61][E: sdk/python/src/openai_codex/errors.py:65][E: sdk/python/src/openai_codex/errors.py:68][E: sdk/python/src/openai_codex/errors.py:69][E: sdk/python/src/openai_codex/errors.py:72][E: sdk/python/src/openai_codex/errors.py:76][E: sdk/python/src/openai_codex/errors.py:80][E: sdk/python/src/openai_codex/errors.py:81][E: sdk/python/src/openai_codex/errors.py:112][E: sdk/python/src/openai_codex/errors.py:115][E: sdk/python/src/openai_codex/errors.py:118][E: sdk/python/src/openai_codex/errors.py:119]

## Retry helper

`retry_on_overload()` defaults to `max_attempts=3`, `initial_delay_s=0.25`, `max_delay_s=2.0`, and `jitter_ratio=0.2`; it rejects `max_attempts < 1`, reraises once the attempt limit is hit or an error is not retryable, and otherwise sleeps with exponential backoff plus jitter.[E: sdk/python/src/openai_codex/retry.py:12][E: sdk/python/src/openai_codex/retry.py:15][E: sdk/python/src/openai_codex/retry.py:16][E: sdk/python/src/openai_codex/retry.py:17][E: sdk/python/src/openai_codex/retry.py:18][E: sdk/python/src/openai_codex/retry.py:22][E: sdk/python/src/openai_codex/retry.py:27][E: sdk/python/src/openai_codex/retry.py:32][E: sdk/python/src/openai_codex/retry.py:34][E: sdk/python/src/openai_codex/retry.py:37][E: sdk/python/src/openai_codex/retry.py:38][E: sdk/python/src/openai_codex/retry.py:40][E: sdk/python/src/openai_codex/retry.py:41]

`CodexClient.request_with_retry_on_overload()` wraps arbitrary method/params/response_model calls in the same retry helper defaults.[E: sdk/python/src/openai_codex/client.py:671][E: sdk/python/src/openai_codex/client.py:677][E: sdk/python/src/openai_codex/client.py:678][E: sdk/python/src/openai_codex/client.py:679][E: sdk/python/src/openai_codex/client.py:681][E: sdk/python/src/openai_codex/client.py:682][E: sdk/python/src/openai_codex/client.py:683][E: sdk/python/src/openai_codex/client.py:684][E: sdk/python/src/openai_codex/client.py:685]

## Router and server requests

`CodexClient._reader_loop()` is the sole stdout reader: messages with both method and id are server requests and get an approval-handler response, messages with method and no id are coerced and routed as notifications, and all other messages are routed as responses.[E: sdk/python/src/openai_codex/client.py:803][E: sdk/python/src/openai_codex/client.py:807][E: sdk/python/src/openai_codex/client.py:808][E: sdk/python/src/openai_codex/client.py:809][E: sdk/python/src/openai_codex/client.py:810][E: sdk/python/src/openai_codex/client.py:812][E: sdk/python/src/openai_codex/client.py:815][E: sdk/python/src/openai_codex/client.py:819]

The default approval handler accepts `item/commandExecution/requestApproval` and `item/fileChange/requestApproval`, returning an empty object for other server requests.[E: sdk/python/src/openai_codex/client.py:773][E: sdk/python/src/openai_codex/client.py:775][E: sdk/python/src/openai_codex/client.py:776][E: sdk/python/src/openai_codex/client.py:777][E: sdk/python/src/openai_codex/client.py:778][E: sdk/python/src/openai_codex/client.py:779]

`MessageRouter` stores response waiters, login queues, turn queues, goal operation state, and a global notification queue; response errors are converted through `map_jsonrpc_error`, login notifications are routed by login id, turn notifications are queued by turn id with early-event replay, goal notifications can be captured by thread-scoped goal state, and unrouted notifications go global.[E: sdk/python/src/openai_codex/_message_router.py:17][E: sdk/python/src/openai_codex/_message_router.py:26][E: sdk/python/src/openai_codex/_message_router.py:29][E: sdk/python/src/openai_codex/_message_router.py:30][E: sdk/python/src/openai_codex/_message_router.py:32][E: sdk/python/src/openai_codex/_message_router.py:34][E: sdk/python/src/openai_codex/_message_router.py:35][E: sdk/python/src/openai_codex/_message_router.py:37][E: sdk/python/src/openai_codex/_message_router.py:89][E: sdk/python/src/openai_codex/_message_router.py:96][E: sdk/python/src/openai_codex/_message_router.py:151][E: sdk/python/src/openai_codex/_message_router.py:160][E: sdk/python/src/openai_codex/_message_router.py:164][E: sdk/python/src/openai_codex/_message_router.py:176][E: sdk/python/src/openai_codex/_message_router.py:179][E: sdk/python/src/openai_codex/_message_router.py:191][E: sdk/python/src/openai_codex/_message_router.py:193][E: sdk/python/src/openai_codex/_message_router.py:203][E: sdk/python/src/openai_codex/_message_router.py:207]

`fail_all()` wakes all outstanding response/login/turn/goal/global waiters with the same transport exception so SDK calls do not block forever after reader-thread failure.[E: sdk/python/src/openai_codex/_message_router.py:217][E: sdk/python/src/openai_codex/_message_router.py:220][E: sdk/python/src/openai_codex/_message_router.py:221][E: sdk/python/src/openai_codex/_message_router.py:223][E: sdk/python/src/openai_codex/_message_router.py:226][E: sdk/python/src/openai_codex/_message_router.py:228][E: sdk/python/src/openai_codex/_message_router.py:230][E: sdk/python/src/openai_codex/_message_router.py:232][E: sdk/python/src/openai_codex/_message_router.py:234][E: sdk/python/src/openai_codex/_message_router.py:236][E: sdk/python/src/openai_codex/_message_router.py:238][E: sdk/python/src/openai_codex/_message_router.py:240]

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
