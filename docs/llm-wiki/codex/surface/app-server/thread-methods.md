---
id: rpc.thread-methods
title: thread 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs]
symbols: [ThreadStartParams, ThreadStartResponse, ThreadResumeParams, ThreadForkParams, ThreadArchiveParams, ThreadDeleteParams, ThreadListParams, ThreadSearchOccurrencesParams, ThreadSearchOccurrence, ThreadSearchOccurrencesResponse, ThreadReadParams, ThreadTurnsListParams, ThreadItemsListParams, ThreadInjectItemsParams, MemoryResetResponse]
related: [rpc.overview, rpc.turn-methods, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> thread 方法是 app-server v2 管理 Codex thread 生命周期、订阅、目标、设置、历史读取和 thread-local 操作的 client request catalog。

## 能回答的问题

- thread/memory client request 当前有哪些 wire method？
- 哪些 thread 方法是 experimental 或按 params 字段检查 experimental gate？
- thread lifecycle、goal、metadata、background terminals、history/read/items 方法分别用哪些 params/response 类型？
- `memory/reset` 为什么归到 thread catalog？

## 字段模型

`ThreadStartParams` 定义在 v2 thread 模块，`ThreadStartResponse` 同模块返回 thread runtime 侧信息；`ThreadResumeParams`、`ThreadListParams`、`ThreadReadParams` 和 turns/items 分页 params 也都在 `thread.rs` 中维护。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:56][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:170][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:324][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1096][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1353][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1384][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1418]

`thread/increment_elicitation`、`thread/decrement_elicitation`、`thread/settings/update`、`thread/memoryMode/set`、background terminals、`thread/search`、`thread/searchOccurrences`、turns list 和 thread items list 在宏调用中带 experimental 标记或字段检查。[E: codex-rs/app-server-protocol/src/protocol/common.rs:515][E: codex-rs/app-server-protocol/src/protocol/common.rs:525][E: codex-rs/app-server-protocol/src/protocol/common.rs:559][E: codex-rs/app-server-protocol/src/protocol/common.rs:566][E: codex-rs/app-server-protocol/src/protocol/common.rs:598][E: codex-rs/app-server-protocol/src/protocol/common.rs:627][E: codex-rs/app-server-protocol/src/protocol/common.rs:633][E: codex-rs/app-server-protocol/src/protocol/common.rs:650][E: codex-rs/app-server-protocol/src/protocol/common.rs:657]

`thread/searchOccurrences` 在单个 thread 的可见 user message 与 final assistant message 中做 case-insensitive literal substring 搜索；分页结果给出 snippet、UTF-16 match range、turn/item ids 与可直接交给 `thread/turns/list` 的 inclusive turn cursor。该 request 明确 `serialization: None`，可并发读 persisted paginated history。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1252][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1256][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1258][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1280][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1284][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1289][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1291][E: codex-rs/app-server-protocol/src/protocol/common.rs:634][E: codex-rs/app-server-protocol/src/protocol/common.rs:636][E: codex-rs/app-server-protocol/src/protocol/common.rs:637]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `ThreadStart` | `thread/start` | `v2::ThreadStartParams` | `v2::ThreadStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:482][E: codex-rs/app-server-protocol/src/protocol/common.rs:483][E: codex-rs/app-server-protocol/src/protocol/common.rs:484][E: codex-rs/app-server-protocol/src/protocol/common.rs:486] |
| `ThreadResume` | `thread/resume` | `v2::ThreadResumeParams` | `v2::ThreadResumeResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:488][E: codex-rs/app-server-protocol/src/protocol/common.rs:489][E: codex-rs/app-server-protocol/src/protocol/common.rs:484][E: codex-rs/app-server-protocol/src/protocol/common.rs:492] |
| `ThreadFork` | `thread/fork` | `v2::ThreadForkParams` | `v2::ThreadForkResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:494][E: codex-rs/app-server-protocol/src/protocol/common.rs:495][E: codex-rs/app-server-protocol/src/protocol/common.rs:490][E: codex-rs/app-server-protocol/src/protocol/common.rs:498] |
| `ThreadArchive` | `thread/archive` | `v2::ThreadArchiveParams` | `v2::ThreadArchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:500][E: codex-rs/app-server-protocol/src/protocol/common.rs:501][E: codex-rs/app-server-protocol/src/protocol/common.rs:503] |
| `ThreadDelete` | `thread/delete` | `v2::ThreadDeleteParams` | `v2::ThreadDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:505][E: codex-rs/app-server-protocol/src/protocol/common.rs:506][E: codex-rs/app-server-protocol/src/protocol/common.rs:508] |
| `ThreadUnsubscribe` | `thread/unsubscribe` | `v2::ThreadUnsubscribeParams` | `v2::ThreadUnsubscribeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:510][E: codex-rs/app-server-protocol/src/protocol/common.rs:511][E: codex-rs/app-server-protocol/src/protocol/common.rs:513] |
| `ThreadIncrementElicitation` | `thread/increment_elicitation` | `v2::ThreadIncrementElicitationParams` | `v2::ThreadIncrementElicitationResponse` | experimental: thread/increment_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:515][E: codex-rs/app-server-protocol/src/protocol/common.rs:520][E: codex-rs/app-server-protocol/src/protocol/common.rs:521][E: codex-rs/app-server-protocol/src/protocol/common.rs:523] |
| `ThreadDecrementElicitation` | `thread/decrement_elicitation` | `v2::ThreadDecrementElicitationParams` | `v2::ThreadDecrementElicitationResponse` | experimental: thread/decrement_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:525][E: codex-rs/app-server-protocol/src/protocol/common.rs:529][E: codex-rs/app-server-protocol/src/protocol/common.rs:530][E: codex-rs/app-server-protocol/src/protocol/common.rs:532] |
| `ThreadSetName` | `thread/name/set` | `v2::ThreadSetNameParams` | `v2::ThreadSetNameResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:534][E: codex-rs/app-server-protocol/src/protocol/common.rs:535][E: codex-rs/app-server-protocol/src/protocol/common.rs:537] |
| `ThreadGoalSet` | `thread/goal/set` | `v2::ThreadGoalSetParams` | `v2::ThreadGoalSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:539][E: codex-rs/app-server-protocol/src/protocol/common.rs:540][E: codex-rs/app-server-protocol/src/protocol/common.rs:542] |
| `ThreadGoalGet` | `thread/goal/get` | `v2::ThreadGoalGetParams` | `v2::ThreadGoalGetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:544][E: codex-rs/app-server-protocol/src/protocol/common.rs:545][E: codex-rs/app-server-protocol/src/protocol/common.rs:547] |
| `ThreadGoalClear` | `thread/goal/clear` | `v2::ThreadGoalClearParams` | `v2::ThreadGoalClearResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:549][E: codex-rs/app-server-protocol/src/protocol/common.rs:550][E: codex-rs/app-server-protocol/src/protocol/common.rs:552] |
| `ThreadMetadataUpdate` | `thread/metadata/update` | `v2::ThreadMetadataUpdateParams` | `v2::ThreadMetadataUpdateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:554][E: codex-rs/app-server-protocol/src/protocol/common.rs:555][E: codex-rs/app-server-protocol/src/protocol/common.rs:557] |
| `ThreadSettingsUpdate` | `thread/settings/update` | `v2::ThreadSettingsUpdateParams` | `v2::ThreadSettingsUpdateResponse` | experimental: thread/settings/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:559][E: codex-rs/app-server-protocol/src/protocol/common.rs:560][E: codex-rs/app-server-protocol/src/protocol/common.rs:561][E: codex-rs/app-server-protocol/src/protocol/common.rs:562][E: codex-rs/app-server-protocol/src/protocol/common.rs:564] |
| `ThreadMemoryModeSet` | `thread/memoryMode/set` | `v2::ThreadMemoryModeSetParams` | `v2::ThreadMemoryModeSetResponse` | experimental: thread/memoryMode/set | [E: codex-rs/app-server-protocol/src/protocol/common.rs:566][E: codex-rs/app-server-protocol/src/protocol/common.rs:567][E: codex-rs/app-server-protocol/src/protocol/common.rs:568][E: codex-rs/app-server-protocol/src/protocol/common.rs:570] |
| `MemoryReset` | `memory/reset` | `Option<()>` | `v2::MemoryResetResponse` | experimental: memory/reset | [E: codex-rs/app-server-protocol/src/protocol/common.rs:572][E: codex-rs/app-server-protocol/src/protocol/common.rs:573][E: codex-rs/app-server-protocol/src/protocol/common.rs:574][E: codex-rs/app-server-protocol/src/protocol/common.rs:576] |
| `ThreadUnarchive` | `thread/unarchive` | `v2::ThreadUnarchiveParams` | `v2::ThreadUnarchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:578][E: codex-rs/app-server-protocol/src/protocol/common.rs:579][E: codex-rs/app-server-protocol/src/protocol/common.rs:581] |
| `ThreadCompactStart` | `thread/compact/start` | `v2::ThreadCompactStartParams` | `v2::ThreadCompactStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:583][E: codex-rs/app-server-protocol/src/protocol/common.rs:584][E: codex-rs/app-server-protocol/src/protocol/common.rs:586] |
| `ThreadShellCommand` | `thread/shellCommand` | `v2::ThreadShellCommandParams` | `v2::ThreadShellCommandResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:588][E: codex-rs/app-server-protocol/src/protocol/common.rs:589][E: codex-rs/app-server-protocol/src/protocol/common.rs:591] |
| `ThreadApproveGuardianDeniedAction` | `thread/approveGuardianDeniedAction` | `v2::ThreadApproveGuardianDeniedActionParams` | `v2::ThreadApproveGuardianDeniedActionResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:593][E: codex-rs/app-server-protocol/src/protocol/common.rs:594][E: codex-rs/app-server-protocol/src/protocol/common.rs:596] |
| `ThreadBackgroundTerminalsClean` | `thread/backgroundTerminals/clean` | `v2::ThreadBackgroundTerminalsCleanParams` | `v2::ThreadBackgroundTerminalsCleanResponse` | experimental: thread/backgroundTerminals/clean | [E: codex-rs/app-server-protocol/src/protocol/common.rs:598][E: codex-rs/app-server-protocol/src/protocol/common.rs:599][E: codex-rs/app-server-protocol/src/protocol/common.rs:600][E: codex-rs/app-server-protocol/src/protocol/common.rs:602] |
| `ThreadBackgroundTerminalsList` | `thread/backgroundTerminals/list` | `v2::ThreadBackgroundTerminalsListParams` | `v2::ThreadBackgroundTerminalsListResponse` | experimental: thread/backgroundTerminals/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:604][E: codex-rs/app-server-protocol/src/protocol/common.rs:605][E: codex-rs/app-server-protocol/src/protocol/common.rs:606][E: codex-rs/app-server-protocol/src/protocol/common.rs:608] |
| `ThreadBackgroundTerminalsTerminate` | `thread/backgroundTerminals/terminate` | `v2::ThreadBackgroundTerminalsTerminateParams` | `v2::ThreadBackgroundTerminalsTerminateResponse` | experimental: thread/backgroundTerminals/terminate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:610][E: codex-rs/app-server-protocol/src/protocol/common.rs:611][E: codex-rs/app-server-protocol/src/protocol/common.rs:612][E: codex-rs/app-server-protocol/src/protocol/common.rs:614] |
| `ThreadRollback` | `thread/rollback` | `v2::ThreadRollbackParams` | `v2::ThreadRollbackResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:616][E: codex-rs/app-server-protocol/src/protocol/common.rs:617][E: codex-rs/app-server-protocol/src/protocol/common.rs:619] |
| `ThreadList` | `thread/list` | `v2::ThreadListParams` | `v2::ThreadListResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:621][E: codex-rs/app-server-protocol/src/protocol/common.rs:622][E: codex-rs/app-server-protocol/src/protocol/common.rs:623][E: codex-rs/app-server-protocol/src/protocol/common.rs:625] |
| `ThreadSearch` | `thread/search` | `v2::ThreadSearchParams` | `v2::ThreadSearchResponse` | experimental: thread/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:627][E: codex-rs/app-server-protocol/src/protocol/common.rs:628][E: codex-rs/app-server-protocol/src/protocol/common.rs:629][E: codex-rs/app-server-protocol/src/protocol/common.rs:631] |
| `ThreadSearchOccurrences` | `thread/searchOccurrences` | `v2::ThreadSearchOccurrencesParams` | `v2::ThreadSearchOccurrencesResponse` | experimental: thread/searchOccurrences | [E: codex-rs/app-server-protocol/src/protocol/common.rs:633][E: codex-rs/app-server-protocol/src/protocol/common.rs:634][E: codex-rs/app-server-protocol/src/protocol/common.rs:635][E: codex-rs/app-server-protocol/src/protocol/common.rs:638] |
| `ThreadLoadedList` | `thread/loaded/list` | `v2::ThreadLoadedListParams` | `v2::ThreadLoadedListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:640][E: codex-rs/app-server-protocol/src/protocol/common.rs:641][E: codex-rs/app-server-protocol/src/protocol/common.rs:643] |
| `ThreadRead` | `thread/read` | `v2::ThreadReadParams` | `v2::ThreadReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:645][E: codex-rs/app-server-protocol/src/protocol/common.rs:646][E: codex-rs/app-server-protocol/src/protocol/common.rs:648] |
| `ThreadTurnsList` | `thread/turns/list` | `v2::ThreadTurnsListParams` | `v2::ThreadTurnsListResponse` | experimental: thread/turns/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:650][E: codex-rs/app-server-protocol/src/protocol/common.rs:651][E: codex-rs/app-server-protocol/src/protocol/common.rs:652][E: codex-rs/app-server-protocol/src/protocol/common.rs:655] |
| `ThreadItemsList` | `thread/items/list` | `v2::ThreadItemsListParams` | `v2::ThreadItemsListResponse` | experimental: thread/items/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:657][E: codex-rs/app-server-protocol/src/protocol/common.rs:658][E: codex-rs/app-server-protocol/src/protocol/common.rs:659][E: codex-rs/app-server-protocol/src/protocol/common.rs:662] |
| `ThreadInjectItems` | `thread/inject_items` | `v2::ThreadInjectItemsParams` | `v2::ThreadInjectItemsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:665][E: codex-rs/app-server-protocol/src/protocol/common.rs:666][E: codex-rs/app-server-protocol/src/protocol/common.rs:668] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
