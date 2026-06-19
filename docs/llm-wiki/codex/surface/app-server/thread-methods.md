---
id: rpc.thread-methods
title: thread 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs]
symbols: [ThreadStartParams, ThreadStartResponse, ThreadResumeParams, ThreadForkParams, ThreadArchiveParams, ThreadDeleteParams, ThreadListParams, ThreadReadParams, ThreadTurnsListParams, ThreadInjectItemsParams, MemoryResetResponse]
related: [rpc.overview, rpc.turn-methods, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 5670360009
---

> thread 方法是 app-server v2 管理 Codex thread 生命周期、订阅、目标、设置、历史读取和 thread-local 操作的 client request catalog。

## 能回答的问题

- thread/memory client request 当前有哪些 wire method？
- 哪些 thread 方法是 experimental 或按 params 字段检查 experimental gate？
- thread lifecycle、goal、metadata、background terminals、history/read 方法分别用哪些 params/response 类型？
- `memory/reset` 为什么归到 thread catalog？

## 字段模型

`ThreadStartParams` 定义在 v2 thread 模块，`ThreadStartResponse` 同模块返回 thread runtime 侧信息；`ThreadResumeParams`、`ThreadListParams`、`ThreadReadParams` 和 turns/items 分页 params 也都在 `thread.rs` 中维护。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:52][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:153][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:288][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:987][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1187][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1218][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1252]

`thread/increment_elicitation`、`thread/decrement_elicitation`、`thread/settings/update`、`thread/memoryMode/set`、background terminals、`thread/search`、turns list 和 turns items list 在宏调用中带 experimental 标记或字段检查。[E: codex-rs/app-server-protocol/src/protocol/common.rs:509][E: codex-rs/app-server-protocol/src/protocol/common.rs:519][E: codex-rs/app-server-protocol/src/protocol/common.rs:553][E: codex-rs/app-server-protocol/src/protocol/common.rs:560][E: codex-rs/app-server-protocol/src/protocol/common.rs:592][E: codex-rs/app-server-protocol/src/protocol/common.rs:621][E: codex-rs/app-server-protocol/src/protocol/common.rs:637][E: codex-rs/app-server-protocol/src/protocol/common.rs:644]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `ThreadStart` | `thread/start` | `v2::ThreadStartParams` | `v2::ThreadStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:476][E: codex-rs/app-server-protocol/src/protocol/common.rs:477][E: codex-rs/app-server-protocol/src/protocol/common.rs:478][E: codex-rs/app-server-protocol/src/protocol/common.rs:480] |
| `ThreadResume` | `thread/resume` | `v2::ThreadResumeParams` | `v2::ThreadResumeResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:482][E: codex-rs/app-server-protocol/src/protocol/common.rs:483][E: codex-rs/app-server-protocol/src/protocol/common.rs:484][E: codex-rs/app-server-protocol/src/protocol/common.rs:486] |
| `ThreadFork` | `thread/fork` | `v2::ThreadForkParams` | `v2::ThreadForkResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:488][E: codex-rs/app-server-protocol/src/protocol/common.rs:489][E: codex-rs/app-server-protocol/src/protocol/common.rs:490][E: codex-rs/app-server-protocol/src/protocol/common.rs:492] |
| `ThreadArchive` | `thread/archive` | `v2::ThreadArchiveParams` | `v2::ThreadArchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:494][E: codex-rs/app-server-protocol/src/protocol/common.rs:495][E: codex-rs/app-server-protocol/src/protocol/common.rs:497] |
| `ThreadDelete` | `thread/delete` | `v2::ThreadDeleteParams` | `v2::ThreadDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:499][E: codex-rs/app-server-protocol/src/protocol/common.rs:500][E: codex-rs/app-server-protocol/src/protocol/common.rs:502] |
| `ThreadUnsubscribe` | `thread/unsubscribe` | `v2::ThreadUnsubscribeParams` | `v2::ThreadUnsubscribeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:504][E: codex-rs/app-server-protocol/src/protocol/common.rs:505][E: codex-rs/app-server-protocol/src/protocol/common.rs:507] |
| `ThreadIncrementElicitation` | `thread/increment_elicitation` | `v2::ThreadIncrementElicitationParams` | `v2::ThreadIncrementElicitationResponse` | experimental: thread/increment_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:509][E: codex-rs/app-server-protocol/src/protocol/common.rs:514][E: codex-rs/app-server-protocol/src/protocol/common.rs:515][E: codex-rs/app-server-protocol/src/protocol/common.rs:517] |
| `ThreadDecrementElicitation` | `thread/decrement_elicitation` | `v2::ThreadDecrementElicitationParams` | `v2::ThreadDecrementElicitationResponse` | experimental: thread/decrement_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:519][E: codex-rs/app-server-protocol/src/protocol/common.rs:523][E: codex-rs/app-server-protocol/src/protocol/common.rs:524][E: codex-rs/app-server-protocol/src/protocol/common.rs:526] |
| `ThreadSetName` | `thread/name/set` | `v2::ThreadSetNameParams` | `v2::ThreadSetNameResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:528][E: codex-rs/app-server-protocol/src/protocol/common.rs:529][E: codex-rs/app-server-protocol/src/protocol/common.rs:531] |
| `ThreadGoalSet` | `thread/goal/set` | `v2::ThreadGoalSetParams` | `v2::ThreadGoalSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:533][E: codex-rs/app-server-protocol/src/protocol/common.rs:534][E: codex-rs/app-server-protocol/src/protocol/common.rs:536] |
| `ThreadGoalGet` | `thread/goal/get` | `v2::ThreadGoalGetParams` | `v2::ThreadGoalGetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:538][E: codex-rs/app-server-protocol/src/protocol/common.rs:539][E: codex-rs/app-server-protocol/src/protocol/common.rs:541] |
| `ThreadGoalClear` | `thread/goal/clear` | `v2::ThreadGoalClearParams` | `v2::ThreadGoalClearResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:543][E: codex-rs/app-server-protocol/src/protocol/common.rs:544][E: codex-rs/app-server-protocol/src/protocol/common.rs:546] |
| `ThreadMetadataUpdate` | `thread/metadata/update` | `v2::ThreadMetadataUpdateParams` | `v2::ThreadMetadataUpdateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:548][E: codex-rs/app-server-protocol/src/protocol/common.rs:549][E: codex-rs/app-server-protocol/src/protocol/common.rs:551] |
| `ThreadSettingsUpdate` | `thread/settings/update` | `v2::ThreadSettingsUpdateParams` | `v2::ThreadSettingsUpdateResponse` | experimental: thread/settings/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:553][E: codex-rs/app-server-protocol/src/protocol/common.rs:554][E: codex-rs/app-server-protocol/src/protocol/common.rs:555][E: codex-rs/app-server-protocol/src/protocol/common.rs:556][E: codex-rs/app-server-protocol/src/protocol/common.rs:558] |
| `ThreadMemoryModeSet` | `thread/memoryMode/set` | `v2::ThreadMemoryModeSetParams` | `v2::ThreadMemoryModeSetResponse` | experimental: thread/memoryMode/set | [E: codex-rs/app-server-protocol/src/protocol/common.rs:560][E: codex-rs/app-server-protocol/src/protocol/common.rs:561][E: codex-rs/app-server-protocol/src/protocol/common.rs:562][E: codex-rs/app-server-protocol/src/protocol/common.rs:564] |
| `MemoryReset` | `memory/reset` | `Option<()>` | `v2::MemoryResetResponse` | experimental: memory/reset | [E: codex-rs/app-server-protocol/src/protocol/common.rs:566][E: codex-rs/app-server-protocol/src/protocol/common.rs:567][E: codex-rs/app-server-protocol/src/protocol/common.rs:568][E: codex-rs/app-server-protocol/src/protocol/common.rs:570] |
| `ThreadUnarchive` | `thread/unarchive` | `v2::ThreadUnarchiveParams` | `v2::ThreadUnarchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:572][E: codex-rs/app-server-protocol/src/protocol/common.rs:573][E: codex-rs/app-server-protocol/src/protocol/common.rs:575] |
| `ThreadCompactStart` | `thread/compact/start` | `v2::ThreadCompactStartParams` | `v2::ThreadCompactStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:577][E: codex-rs/app-server-protocol/src/protocol/common.rs:578][E: codex-rs/app-server-protocol/src/protocol/common.rs:580] |
| `ThreadShellCommand` | `thread/shellCommand` | `v2::ThreadShellCommandParams` | `v2::ThreadShellCommandResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:582][E: codex-rs/app-server-protocol/src/protocol/common.rs:583][E: codex-rs/app-server-protocol/src/protocol/common.rs:585] |
| `ThreadApproveGuardianDeniedAction` | `thread/approveGuardianDeniedAction` | `v2::ThreadApproveGuardianDeniedActionParams` | `v2::ThreadApproveGuardianDeniedActionResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:587][E: codex-rs/app-server-protocol/src/protocol/common.rs:588][E: codex-rs/app-server-protocol/src/protocol/common.rs:590] |
| `ThreadBackgroundTerminalsClean` | `thread/backgroundTerminals/clean` | `v2::ThreadBackgroundTerminalsCleanParams` | `v2::ThreadBackgroundTerminalsCleanResponse` | experimental: thread/backgroundTerminals/clean | [E: codex-rs/app-server-protocol/src/protocol/common.rs:592][E: codex-rs/app-server-protocol/src/protocol/common.rs:593][E: codex-rs/app-server-protocol/src/protocol/common.rs:594][E: codex-rs/app-server-protocol/src/protocol/common.rs:596] |
| `ThreadBackgroundTerminalsList` | `thread/backgroundTerminals/list` | `v2::ThreadBackgroundTerminalsListParams` | `v2::ThreadBackgroundTerminalsListResponse` | experimental: thread/backgroundTerminals/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:598][E: codex-rs/app-server-protocol/src/protocol/common.rs:599][E: codex-rs/app-server-protocol/src/protocol/common.rs:600][E: codex-rs/app-server-protocol/src/protocol/common.rs:602] |
| `ThreadBackgroundTerminalsTerminate` | `thread/backgroundTerminals/terminate` | `v2::ThreadBackgroundTerminalsTerminateParams` | `v2::ThreadBackgroundTerminalsTerminateResponse` | experimental: thread/backgroundTerminals/terminate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:604][E: codex-rs/app-server-protocol/src/protocol/common.rs:605][E: codex-rs/app-server-protocol/src/protocol/common.rs:606][E: codex-rs/app-server-protocol/src/protocol/common.rs:608] |
| `ThreadRollback` | `thread/rollback` | `v2::ThreadRollbackParams` | `v2::ThreadRollbackResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:610][E: codex-rs/app-server-protocol/src/protocol/common.rs:611][E: codex-rs/app-server-protocol/src/protocol/common.rs:613] |
| `ThreadList` | `thread/list` | `v2::ThreadListParams` | `v2::ThreadListResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:615][E: codex-rs/app-server-protocol/src/protocol/common.rs:616][E: codex-rs/app-server-protocol/src/protocol/common.rs:617][E: codex-rs/app-server-protocol/src/protocol/common.rs:619] |
| `ThreadSearch` | `thread/search` | `v2::ThreadSearchParams` | `v2::ThreadSearchResponse` | experimental: thread/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:621][E: codex-rs/app-server-protocol/src/protocol/common.rs:622][E: codex-rs/app-server-protocol/src/protocol/common.rs:623][E: codex-rs/app-server-protocol/src/protocol/common.rs:625] |
| `ThreadLoadedList` | `thread/loaded/list` | `v2::ThreadLoadedListParams` | `v2::ThreadLoadedListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:627][E: codex-rs/app-server-protocol/src/protocol/common.rs:628][E: codex-rs/app-server-protocol/src/protocol/common.rs:630] |
| `ThreadRead` | `thread/read` | `v2::ThreadReadParams` | `v2::ThreadReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:632][E: codex-rs/app-server-protocol/src/protocol/common.rs:633][E: codex-rs/app-server-protocol/src/protocol/common.rs:635] |
| `ThreadTurnsList` | `thread/turns/list` | `v2::ThreadTurnsListParams` | `v2::ThreadTurnsListResponse` | experimental: thread/turns/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:637][E: codex-rs/app-server-protocol/src/protocol/common.rs:638][E: codex-rs/app-server-protocol/src/protocol/common.rs:639][E: codex-rs/app-server-protocol/src/protocol/common.rs:642] |
| `ThreadTurnsItemsList` | `thread/turns/items/list` | `v2::ThreadTurnsItemsListParams` | `v2::ThreadTurnsItemsListResponse` | experimental: thread/turns/items/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:644][E: codex-rs/app-server-protocol/src/protocol/common.rs:645][E: codex-rs/app-server-protocol/src/protocol/common.rs:646][E: codex-rs/app-server-protocol/src/protocol/common.rs:649] |
| `ThreadInjectItems` | `thread/inject_items` | `v2::ThreadInjectItemsParams` | `v2::ThreadInjectItemsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:652][E: codex-rs/app-server-protocol/src/protocol/common.rs:653][E: codex-rs/app-server-protocol/src/protocol/common.rs:655] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
