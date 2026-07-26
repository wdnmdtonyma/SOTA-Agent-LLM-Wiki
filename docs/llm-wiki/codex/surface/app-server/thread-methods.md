---
id: rpc.thread-methods
title: thread 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs, codex-rs/thread-store/src/local/paginated_fork.rs]
symbols: [ThreadStartParams, ThreadStartResponse, ThreadResumeParams, ThreadForkParams, ThreadMetadataUpdateParams, ThreadArchiveParams, ThreadDeleteParams, ThreadListParams, ThreadSearchOccurrencesParams, ThreadSearchOccurrence, ThreadReadParams, ThreadTurnsListParams, ThreadItemsListParams, ThreadInjectItemsParams]
related: [rpc.overview, rpc.turn-methods, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.session-lifecycle, subsys.core.thread-store]
evidence: explicit
status: verified
updated: 61a44880a8
---

> thread 方法是 app-server v2 管理 Codex thread 生命周期、订阅、目标、设置、历史读取和 thread-local 操作的 client request catalog。

## 能回答的问题

- thread/memory client request 当前有哪些 wire method？
- 哪些 thread 方法是 experimental 或按 params 字段检查 experimental gate？
- thread lifecycle、goal、metadata、background terminals、history/read/items 方法分别用哪些 params/response 类型？
- `memory/reset` 为什么归到 thread catalog？

## 字段模型

`ThreadStartParams` 定义在 v2 thread 模块，`ThreadStartResponse` 同模块返回 thread runtime 侧信息；`ThreadResumeParams`、`ThreadListParams`、`ThreadReadParams` 和 turns/items 分页 params 也都在 `thread.rs` 中维护。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:56][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:170][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:324][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1099][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1359][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1390][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1424]

`thread/increment_elicitation`、`thread/decrement_elicitation`、`thread/settings/update`、`thread/memoryMode/set`、background terminals、`thread/search`、`thread/searchOccurrences`、turns list 和 thread items list 在宏调用中带 experimental 标记或字段检查。[E: codex-rs/app-server-protocol/src/protocol/common.rs:524][E: codex-rs/app-server-protocol/src/protocol/common.rs:534][E: codex-rs/app-server-protocol/src/protocol/common.rs:568][E: codex-rs/app-server-protocol/src/protocol/common.rs:575][E: codex-rs/app-server-protocol/src/protocol/common.rs:607][E: codex-rs/app-server-protocol/src/protocol/common.rs:636][E: codex-rs/app-server-protocol/src/protocol/common.rs:642][E: codex-rs/app-server-protocol/src/protocol/common.rs:659][E: codex-rs/app-server-protocol/src/protocol/common.rs:666]

`thread/searchOccurrences` 在单个 thread 的可见 user message 与 final assistant message 中做 case-insensitive literal substring 搜索；分页结果给出 snippet、UTF-16 match range、turn/item ids 与可直接交给 `thread/turns/list` 的 inclusive turn cursor。该 request 明确 `serialization: None`，可并发读 persisted paginated history。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1262][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1290][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1295][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1297][E: codex-rs/app-server-protocol/src/protocol/common.rs:643][E: codex-rs/app-server-protocol/src/protocol/common.rs:646]

`thread/metadata/update` 新增 optional `isPinned` literal patch；`thread/list` 可用 optional `isPinned` filter，所有 `Thread` responses 也返回 defaulted `isPinned`。该值由 ThreadStore/SQLite 持久化，不是仅对当前 app-server connection 生效。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:861][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:870][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1125][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1126][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:170][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:188]

Paginated `thread/fork` 不再等同于复制一段内存 history：store 先冻结 source lineage，按 Latest/ThroughTurn/BeforeTurn 解析 durable boundary，并把 reference-backed history position 与 model context 交给 child。该 prepare path 使用进程内 lifecycle/read lease 与 writer mutex；跨进程 writer-lock conflict 属于 paginated create/resume，不应归因到 fork preparation。[E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:23][E: codex-rs/thread-store/src/local/paginated_fork.rs:40][E: codex-rs/thread-store/src/local/paginated_fork.rs:68][E: codex-rs/thread-store/src/local/paginated_fork.rs:81][E: codex-rs/thread-store/src/local/paginated_fork.rs:155][I]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `ThreadStart` | `thread/start` | `v2::ThreadStartParams` | `v2::ThreadStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:491][E: codex-rs/app-server-protocol/src/protocol/common.rs:492][E: codex-rs/app-server-protocol/src/protocol/common.rs:493][E: codex-rs/app-server-protocol/src/protocol/common.rs:495] |
| `ThreadResume` | `thread/resume` | `v2::ThreadResumeParams` | `v2::ThreadResumeResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:497][E: codex-rs/app-server-protocol/src/protocol/common.rs:498][E: codex-rs/app-server-protocol/src/protocol/common.rs:493][E: codex-rs/app-server-protocol/src/protocol/common.rs:501] |
| `ThreadFork` | `thread/fork` | `v2::ThreadForkParams` | `v2::ThreadForkResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:503][E: codex-rs/app-server-protocol/src/protocol/common.rs:504][E: codex-rs/app-server-protocol/src/protocol/common.rs:499][E: codex-rs/app-server-protocol/src/protocol/common.rs:507] |
| `ThreadArchive` | `thread/archive` | `v2::ThreadArchiveParams` | `v2::ThreadArchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:509][E: codex-rs/app-server-protocol/src/protocol/common.rs:510][E: codex-rs/app-server-protocol/src/protocol/common.rs:512] |
| `ThreadDelete` | `thread/delete` | `v2::ThreadDeleteParams` | `v2::ThreadDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:514][E: codex-rs/app-server-protocol/src/protocol/common.rs:515][E: codex-rs/app-server-protocol/src/protocol/common.rs:517] |
| `ThreadUnsubscribe` | `thread/unsubscribe` | `v2::ThreadUnsubscribeParams` | `v2::ThreadUnsubscribeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:519][E: codex-rs/app-server-protocol/src/protocol/common.rs:520][E: codex-rs/app-server-protocol/src/protocol/common.rs:522] |
| `ThreadIncrementElicitation` | `thread/increment_elicitation` | `v2::ThreadIncrementElicitationParams` | `v2::ThreadIncrementElicitationResponse` | experimental: thread/increment_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:524][E: codex-rs/app-server-protocol/src/protocol/common.rs:529][E: codex-rs/app-server-protocol/src/protocol/common.rs:530][E: codex-rs/app-server-protocol/src/protocol/common.rs:532] |
| `ThreadDecrementElicitation` | `thread/decrement_elicitation` | `v2::ThreadDecrementElicitationParams` | `v2::ThreadDecrementElicitationResponse` | experimental: thread/decrement_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:534][E: codex-rs/app-server-protocol/src/protocol/common.rs:538][E: codex-rs/app-server-protocol/src/protocol/common.rs:539][E: codex-rs/app-server-protocol/src/protocol/common.rs:541] |
| `ThreadSetName` | `thread/name/set` | `v2::ThreadSetNameParams` | `v2::ThreadSetNameResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:543][E: codex-rs/app-server-protocol/src/protocol/common.rs:544][E: codex-rs/app-server-protocol/src/protocol/common.rs:546] |
| `ThreadGoalSet` | `thread/goal/set` | `v2::ThreadGoalSetParams` | `v2::ThreadGoalSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:548][E: codex-rs/app-server-protocol/src/protocol/common.rs:549][E: codex-rs/app-server-protocol/src/protocol/common.rs:551] |
| `ThreadGoalGet` | `thread/goal/get` | `v2::ThreadGoalGetParams` | `v2::ThreadGoalGetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:553][E: codex-rs/app-server-protocol/src/protocol/common.rs:554][E: codex-rs/app-server-protocol/src/protocol/common.rs:556] |
| `ThreadGoalClear` | `thread/goal/clear` | `v2::ThreadGoalClearParams` | `v2::ThreadGoalClearResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:558][E: codex-rs/app-server-protocol/src/protocol/common.rs:559][E: codex-rs/app-server-protocol/src/protocol/common.rs:561] |
| `ThreadMetadataUpdate` | `thread/metadata/update` | `v2::ThreadMetadataUpdateParams` | `v2::ThreadMetadataUpdateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:563][E: codex-rs/app-server-protocol/src/protocol/common.rs:564][E: codex-rs/app-server-protocol/src/protocol/common.rs:566] |
| `ThreadSettingsUpdate` | `thread/settings/update` | `v2::ThreadSettingsUpdateParams` | `v2::ThreadSettingsUpdateResponse` | experimental: thread/settings/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:568][E: codex-rs/app-server-protocol/src/protocol/common.rs:569][E: codex-rs/app-server-protocol/src/protocol/common.rs:570][E: codex-rs/app-server-protocol/src/protocol/common.rs:571][E: codex-rs/app-server-protocol/src/protocol/common.rs:573] |
| `ThreadMemoryModeSet` | `thread/memoryMode/set` | `v2::ThreadMemoryModeSetParams` | `v2::ThreadMemoryModeSetResponse` | experimental: thread/memoryMode/set | [E: codex-rs/app-server-protocol/src/protocol/common.rs:575][E: codex-rs/app-server-protocol/src/protocol/common.rs:576][E: codex-rs/app-server-protocol/src/protocol/common.rs:577][E: codex-rs/app-server-protocol/src/protocol/common.rs:579] |
| `MemoryReset` | `memory/reset` | `Option<()>` | `v2::MemoryResetResponse` | experimental: memory/reset | [E: codex-rs/app-server-protocol/src/protocol/common.rs:581][E: codex-rs/app-server-protocol/src/protocol/common.rs:582][E: codex-rs/app-server-protocol/src/protocol/common.rs:583][E: codex-rs/app-server-protocol/src/protocol/common.rs:585] |
| `ThreadUnarchive` | `thread/unarchive` | `v2::ThreadUnarchiveParams` | `v2::ThreadUnarchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:587][E: codex-rs/app-server-protocol/src/protocol/common.rs:588][E: codex-rs/app-server-protocol/src/protocol/common.rs:590] |
| `ThreadCompactStart` | `thread/compact/start` | `v2::ThreadCompactStartParams` | `v2::ThreadCompactStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:592][E: codex-rs/app-server-protocol/src/protocol/common.rs:593][E: codex-rs/app-server-protocol/src/protocol/common.rs:595] |
| `ThreadShellCommand` | `thread/shellCommand` | `v2::ThreadShellCommandParams` | `v2::ThreadShellCommandResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:597][E: codex-rs/app-server-protocol/src/protocol/common.rs:598][E: codex-rs/app-server-protocol/src/protocol/common.rs:600] |
| `ThreadApproveGuardianDeniedAction` | `thread/approveGuardianDeniedAction` | `v2::ThreadApproveGuardianDeniedActionParams` | `v2::ThreadApproveGuardianDeniedActionResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:602][E: codex-rs/app-server-protocol/src/protocol/common.rs:603][E: codex-rs/app-server-protocol/src/protocol/common.rs:605] |
| `ThreadBackgroundTerminalsClean` | `thread/backgroundTerminals/clean` | `v2::ThreadBackgroundTerminalsCleanParams` | `v2::ThreadBackgroundTerminalsCleanResponse` | experimental: thread/backgroundTerminals/clean | [E: codex-rs/app-server-protocol/src/protocol/common.rs:607][E: codex-rs/app-server-protocol/src/protocol/common.rs:608][E: codex-rs/app-server-protocol/src/protocol/common.rs:609][E: codex-rs/app-server-protocol/src/protocol/common.rs:611] |
| `ThreadBackgroundTerminalsList` | `thread/backgroundTerminals/list` | `v2::ThreadBackgroundTerminalsListParams` | `v2::ThreadBackgroundTerminalsListResponse` | experimental: thread/backgroundTerminals/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:613][E: codex-rs/app-server-protocol/src/protocol/common.rs:614][E: codex-rs/app-server-protocol/src/protocol/common.rs:615][E: codex-rs/app-server-protocol/src/protocol/common.rs:617] |
| `ThreadBackgroundTerminalsTerminate` | `thread/backgroundTerminals/terminate` | `v2::ThreadBackgroundTerminalsTerminateParams` | `v2::ThreadBackgroundTerminalsTerminateResponse` | experimental: thread/backgroundTerminals/terminate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:619][E: codex-rs/app-server-protocol/src/protocol/common.rs:620][E: codex-rs/app-server-protocol/src/protocol/common.rs:621][E: codex-rs/app-server-protocol/src/protocol/common.rs:623] |
| `ThreadRollback` | `thread/rollback` | `v2::ThreadRollbackParams` | `v2::ThreadRollbackResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:625][E: codex-rs/app-server-protocol/src/protocol/common.rs:626][E: codex-rs/app-server-protocol/src/protocol/common.rs:628] |
| `ThreadList` | `thread/list` | `v2::ThreadListParams` | `v2::ThreadListResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:630][E: codex-rs/app-server-protocol/src/protocol/common.rs:631][E: codex-rs/app-server-protocol/src/protocol/common.rs:632][E: codex-rs/app-server-protocol/src/protocol/common.rs:634] |
| `ThreadSearch` | `thread/search` | `v2::ThreadSearchParams` | `v2::ThreadSearchResponse` | experimental: thread/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:636][E: codex-rs/app-server-protocol/src/protocol/common.rs:637][E: codex-rs/app-server-protocol/src/protocol/common.rs:638][E: codex-rs/app-server-protocol/src/protocol/common.rs:640] |
| `ThreadSearchOccurrences` | `thread/searchOccurrences` | `v2::ThreadSearchOccurrencesParams` | `v2::ThreadSearchOccurrencesResponse` | experimental: thread/searchOccurrences | [E: codex-rs/app-server-protocol/src/protocol/common.rs:642][E: codex-rs/app-server-protocol/src/protocol/common.rs:643][E: codex-rs/app-server-protocol/src/protocol/common.rs:644][E: codex-rs/app-server-protocol/src/protocol/common.rs:647] |
| `ThreadLoadedList` | `thread/loaded/list` | `v2::ThreadLoadedListParams` | `v2::ThreadLoadedListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:649][E: codex-rs/app-server-protocol/src/protocol/common.rs:650][E: codex-rs/app-server-protocol/src/protocol/common.rs:652] |
| `ThreadRead` | `thread/read` | `v2::ThreadReadParams` | `v2::ThreadReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:654][E: codex-rs/app-server-protocol/src/protocol/common.rs:655][E: codex-rs/app-server-protocol/src/protocol/common.rs:657] |
| `ThreadTurnsList` | `thread/turns/list` | `v2::ThreadTurnsListParams` | `v2::ThreadTurnsListResponse` | experimental: thread/turns/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:659][E: codex-rs/app-server-protocol/src/protocol/common.rs:660][E: codex-rs/app-server-protocol/src/protocol/common.rs:661][E: codex-rs/app-server-protocol/src/protocol/common.rs:664] |
| `ThreadItemsList` | `thread/items/list` | `v2::ThreadItemsListParams` | `v2::ThreadItemsListResponse` | experimental: thread/items/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:666][E: codex-rs/app-server-protocol/src/protocol/common.rs:667][E: codex-rs/app-server-protocol/src/protocol/common.rs:668][E: codex-rs/app-server-protocol/src/protocol/common.rs:671] |
| `ThreadInjectItems` | `thread/inject_items` | `v2::ThreadInjectItemsParams` | `v2::ThreadInjectItemsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:674][E: codex-rs/app-server-protocol/src/protocol/common.rs:675][E: codex-rs/app-server-protocol/src/protocol/common.rs:677] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs`
- `codex-rs/thread-store/src/local/paginated_fork.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
