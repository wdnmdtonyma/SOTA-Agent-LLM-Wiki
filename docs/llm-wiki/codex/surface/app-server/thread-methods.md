---
id: rpc.thread-methods
title: thread 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs, codex-rs/app-server/src/request_processors/thread_sections.rs, codex-rs/app-server/src/request_processors/thread_processor.rs, codex-rs/app-server/src/request_processors/thread_queue_processor.rs, codex-rs/app-server/src/request_processors/turn_processor.rs, codex-rs/thread-store/src/local/paginated_fork.rs]
symbols: [ThreadStartParams, ThreadStartResponse, ThreadResumeParams, ThreadForkParams, ThreadMetadataUpdateParams, ThreadSection, ThreadSectionMoveParams, ThreadSectionListParams, ThreadSectionCreateParams, ThreadSectionUpdateParams, ThreadSectionDeleteParams, ThreadArchiveParams, ThreadDeleteParams, ThreadListParams, ThreadSearchOccurrencesParams, ThreadSearchOccurrence, ThreadReadParams, ThreadTurnsListParams, ThreadItemsListParams, ThreadInjectItemsParams, ThreadQueueAddParams, ThreadRevertParams, ThreadRollbackParams, ThreadSettingsUpdateParams]
related: [rpc.overview, rpc.turn-methods, rpc.notifications-thread, subsys.app-server.message-processor, subsys.core.session-lifecycle, subsys.core.thread-store, subsys.core.thread-queue]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> thread 方法是 app-server v2 管理 Codex thread 生命周期、订阅、目标、队列、设置、历史读取和 thread-local 操作的 client request catalog。

## 能回答的问题

- thread/memory client request 当前有哪些 wire method？
- 哪些 thread 方法是 experimental 或按 params 字段检查 experimental gate？
- `thread/queue/*`、`thread/revert`、`thread/rollback`、`thread/settings/update` 分别做什么？
- thread usage 走哪条 account RPC？
- `memory/reset` 为什么归到 thread catalog？

## 字段模型

`ThreadStartParams` 定义在 v2 thread 模块，`ThreadStartResponse` 同模块返回 thread runtime 侧信息；`ThreadResumeParams` 与 `ThreadListParams` 也在同一文件。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:58][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:173][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:335][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1347]

`thread/increment_elicitation`、`thread/decrement_elicitation`、`thread/increment_elicitation`、`thread/decrement_elicitation`、六个 `thread/queue/*`、`thread/settings/update`、`thread/memoryMode/set`、background terminals、`thread/search`、`thread/searchOccurrences`、七个 `project/*` 与 `thread/timeline/list` 带 experimental 标记。`thread/revert`、`thread/turns/list`、`thread/items/list` 在 target 上已是稳定 wire。[E: codex-rs/app-server-protocol/src/protocol/common.rs:547][E: codex-rs/app-server-protocol/src/protocol/common.rs:586][E: codex-rs/app-server-protocol/src/protocol/common.rs:633][E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/common.rs:1020]

`thread/searchOccurrences` 在单个 thread 的可见 user message 与 final assistant message 中做 case-insensitive literal substring 搜索；该 request 明确 `serialization: None`，可并发读 persisted paginated history。[E: codex-rs/app-server-protocol/src/protocol/common.rs:774][E: codex-rs/app-server-protocol/src/protocol/common.rs:778]

pinning 已从独立 `isPinned` patch/filter 迁移为通用 section 模型：`Thread` 返回 optional `section` 与 `sectionEnteredAt`，`thread/list.sectionId` 是三态筛选——省略表示全部 section，`null` 表示未分组，字符串表示指定 section。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:215][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:219][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1376][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1383]

Paginated `thread/fork` 不再等同于复制一段内存 history：store 先冻结 source lineage，按 Latest/ThroughTurn/BeforeTurn 解析 durable boundary。[E: codex-rs/thread-store/src/local/paginated_fork.rs:15][E: codex-rs/thread-store/src/local/paginated_fork.rs:83]

## Queue / revert / rollback / settings

六个 `thread/queue/{add,list,update,delete,reorder,start}` 是 durable per-thread user submission queue 的 experimental RPC。语义与门控见 `subsys.core.thread-queue`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:586]

`thread/rollback` 仍是稳定 wire，但对非 `codex-tui` 客户端发送 deprecation notice：`thread/rollback is deprecated and will be removed soon`。它只服务 Legacy history：`num_turns >= 1`，提交 `Op::ThreadRollback`，Paginated thread 直接拒绝。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:25][E: codex-rs/app-server/src/request_processors/thread_processor.rs:784][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2113][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2122][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1207]

`thread/revert` 是 Paginated 替代：关停 live writer，按 `before_turn_id` 写新 immutable rollout，CAS 替换 SQLite path，再内部 reload 同一 thread id。response 的 `turns` 恒为空，用 `turns_backwards_cursor` / `items_backwards_cursor` 再拉 history。它不回滚磁盘文件改动。target 上该方法不再带 `#[experimental]`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:695]

`thread/settings/update` 是 experimental 且 `inspect_params: true`。processor 把 overrides 编成 `Op::ThreadSettings` 入 submission queue，response 为空；生效快照走 `thread/settings/updated`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:633][E: codex-rs/app-server-protocol/src/protocol/common.rs:636]

`account/usage/read` 不是 thread method，但 `GetAccountTokenUsageParams.thread_id` 存在时改读 backend thread usage，返回 `GetAccountTokenUsageResponse.thread_usage`。字段模型见 `subsys.core.token-budget`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1241]

## 方法 catalog

本轮新增 7 个 experimental `project/{list,read,create,import,update,move,delete}`，以及 experimental `thread/timeline/list`。`turn/settings/update` 不在本表，收在 turn catalog。


| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `ThreadStart` | `thread/start` | `v2::ThreadStartParams` | `v2::ThreadStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:514] |
| `ThreadResume` | `thread/resume` | `v2::ThreadResumeParams` | `v2::ThreadResumeResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:520] |
| `ThreadFork` | `thread/fork` | `v2::ThreadForkParams` | `v2::ThreadForkResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:526] |
| `ThreadArchive` | `thread/archive` | `v2::ThreadArchiveParams` | `v2::ThreadArchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:532] |
| `ThreadDelete` | `thread/delete` | `v2::ThreadDeleteParams` | `v2::ThreadDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:537] |
| `ThreadUnsubscribe` | `thread/unsubscribe` | `v2::ThreadUnsubscribeParams` | `v2::ThreadUnsubscribeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:542] |
| `ThreadIncrementElicitation` | `thread/increment_elicitation` | `v2::ThreadIncrementElicitationParams` | `v2::ThreadIncrementElicitationResponse` | experimental: thread/increment_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:552] |
| `ThreadDecrementElicitation` | `thread/decrement_elicitation` | `v2::ThreadDecrementElicitationParams` | `v2::ThreadDecrementElicitationResponse` | experimental: thread/decrement_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:561] |
| `ThreadSetName` | `thread/name/set` | `v2::ThreadSetNameParams` | `v2::ThreadSetNameResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:566] |
| `ThreadGoalSet` | `thread/goal/set` | `v2::ThreadGoalSetParams` | `v2::ThreadGoalSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:571] |
| `ThreadGoalGet` | `thread/goal/get` | `v2::ThreadGoalGetParams` | `v2::ThreadGoalGetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:576] |
| `ThreadGoalClear` | `thread/goal/clear` | `v2::ThreadGoalClearParams` | `v2::ThreadGoalClearResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:581] |
| `ThreadQueueAdd` | `thread/queue/add` | `v2::ThreadQueueAddParams` | `v2::ThreadQueueAddResponse` | experimental: thread/queue/add | [E: codex-rs/app-server-protocol/src/protocol/common.rs:587] |
| `ThreadQueueList` | `thread/queue/list` | `v2::ThreadQueueListParams` | `v2::ThreadQueueListResponse` | experimental: thread/queue/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:593] |
| `ThreadQueueUpdate` | `thread/queue/update` | `v2::ThreadQueueUpdateParams` | `v2::ThreadQueueUpdateResponse` | experimental: thread/queue/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:599] |
| `ThreadQueueDelete` | `thread/queue/delete` | `v2::ThreadQueueDeleteParams` | `v2::ThreadQueueDeleteResponse` | experimental: thread/queue/delete | [E: codex-rs/app-server-protocol/src/protocol/common.rs:605] |
| `ThreadQueueReorder` | `thread/queue/reorder` | `v2::ThreadQueueReorderParams` | `v2::ThreadQueueReorderResponse` | experimental: thread/queue/reorder | [E: codex-rs/app-server-protocol/src/protocol/common.rs:611] |
| `ThreadQueueStart` | `thread/queue/start` | `v2::ThreadQueueStartParams` | `v2::ThreadQueueStartResponse` | experimental: thread/queue/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:617] |
| `ThreadMetadataUpdate` | `thread/metadata/update` | `v2::ThreadMetadataUpdateParams` | `v2::ThreadMetadataUpdateResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:622] |
| `ThreadSectionMove` | `thread/section/move` | `v2::ThreadSectionMoveParams` | `v2::ThreadSectionMoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:628] |
| `ThreadSettingsUpdate` | `thread/settings/update` | `v2::ThreadSettingsUpdateParams` | `v2::ThreadSettingsUpdateResponse` | experimental: thread/settings/update + inspect_params | [E: codex-rs/app-server-protocol/src/protocol/common.rs:634] |
| `ThreadMemoryModeSet` | `thread/memoryMode/set` | `v2::ThreadMemoryModeSetParams` | `v2::ThreadMemoryModeSetResponse` | experimental: thread/memoryMode/set | [E: codex-rs/app-server-protocol/src/protocol/common.rs:641] |
| `MemoryReset` | `memory/reset` | `Option<()>` | `v2::MemoryResetResponse` | experimental: memory/reset | [E: codex-rs/app-server-protocol/src/protocol/common.rs:647] |
| `ThreadUnarchive` | `thread/unarchive` | `v2::ThreadUnarchiveParams` | `v2::ThreadUnarchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:652] |
| `ThreadCompactStart` | `thread/compact/start` | `v2::ThreadCompactStartParams` | `v2::ThreadCompactStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:657] |
| `ThreadShellCommand` | `thread/shellCommand` | `v2::ThreadShellCommandParams` | `v2::ThreadShellCommandResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:662] |
| `ThreadApproveGuardianDeniedAction` | `thread/approveGuardianDeniedAction` | `v2::ThreadApproveGuardianDeniedActionParams` | `v2::ThreadApproveGuardianDeniedActionResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:667] |
| `ThreadBackgroundTerminalsClean` | `thread/backgroundTerminals/clean` | `v2::ThreadBackgroundTerminalsCleanParams` | `v2::ThreadBackgroundTerminalsCleanResponse` | experimental: thread/backgroundTerminals/clean | [E: codex-rs/app-server-protocol/src/protocol/common.rs:673] |
| `ThreadBackgroundTerminalsList` | `thread/backgroundTerminals/list` | `v2::ThreadBackgroundTerminalsListParams` | `v2::ThreadBackgroundTerminalsListResponse` | experimental: thread/backgroundTerminals/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:679] |
| `ThreadBackgroundTerminalsTerminate` | `thread/backgroundTerminals/terminate` | `v2::ThreadBackgroundTerminalsTerminateParams` | `v2::ThreadBackgroundTerminalsTerminateResponse` | experimental: thread/backgroundTerminals/terminate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:685] |
| `ThreadRollback` | `thread/rollback` | `v2::ThreadRollbackParams` | `v2::ThreadRollbackResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:690] |
| `ThreadRevert` | `thread/revert` | `v2::ThreadRevertParams` | `v2::ThreadRevertResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:695] |
| `ThreadList` | `thread/list` | `v2::ThreadListParams` | `v2::ThreadListResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:700] |
| `ProjectList` | `project/list` | `v2::ProjectListParams` | `v2::ProjectListResponse` | experimental: project/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:707] |
| `ProjectRead` | `project/read` | `v2::ProjectReadParams` | `v2::ProjectReadResponse` | experimental: project/read | [E: codex-rs/app-server-protocol/src/protocol/common.rs:713] |
| `ProjectCreate` | `project/create` | `v2::ProjectCreateParams` | `v2::ProjectCreateResponse` | experimental: project/create | [E: codex-rs/app-server-protocol/src/protocol/common.rs:719] |
| `ProjectImport` | `project/import` | `v2::ProjectImportParams` | `v2::ProjectImportResponse` | experimental: project/import | [E: codex-rs/app-server-protocol/src/protocol/common.rs:725] |
| `ProjectUpdate` | `project/update` | `v2::ProjectUpdateParams` | `v2::ProjectUpdateResponse` | experimental: project/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:731] |
| `ProjectMove` | `project/move` | `v2::ProjectMoveParams` | `v2::ProjectMoveResponse` | experimental: project/move | [E: codex-rs/app-server-protocol/src/protocol/common.rs:737] |
| `ProjectDelete` | `project/delete` | `v2::ProjectDeleteParams` | `v2::ProjectDeleteResponse` | experimental: project/delete | [E: codex-rs/app-server-protocol/src/protocol/common.rs:743] |
| `ThreadSectionList` | `threadSection/list` | `v2::ThreadSectionListParams` | `v2::ThreadSectionListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:748] |
| `ThreadSectionCreate` | `threadSection/create` | `v2::ThreadSectionCreateParams` | `v2::ThreadSectionCreateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:753] |
| `ThreadSectionUpdate` | `threadSection/update` | `v2::ThreadSectionUpdateParams` | `v2::ThreadSectionUpdateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:758] |
| `ThreadSectionDelete` | `threadSection/delete` | `v2::ThreadSectionDeleteParams` | `v2::ThreadSectionDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:763] |
| `ThreadSearch` | `thread/search` | `v2::ThreadSearchParams` | `v2::ThreadSearchResponse` | experimental: thread/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:769] |
| `ThreadSearchOccurrences` | `thread/searchOccurrences` | `v2::ThreadSearchOccurrencesParams` | `v2::ThreadSearchOccurrencesResponse` | experimental: thread/searchOccurrences | [E: codex-rs/app-server-protocol/src/protocol/common.rs:775] |
| `ThreadLoadedList` | `thread/loaded/list` | `v2::ThreadLoadedListParams` | `v2::ThreadLoadedListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:781] |
| `ThreadRead` | `thread/read` | `v2::ThreadReadParams` | `v2::ThreadReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:786] |
| `ThreadTurnsList` | `thread/turns/list` | `v2::ThreadTurnsListParams` | `v2::ThreadTurnsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:791] |
| `ThreadItemsList` | `thread/items/list` | `v2::ThreadItemsListParams` | `v2::ThreadItemsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:797] |
| `ThreadInjectItems` | `thread/inject_items` | `v2::ThreadInjectItemsParams` | `v2::ThreadInjectItemsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:804] |
| `ThreadTimelineList` | `thread/timeline/list` | `v2::ThreadTimelineListParams` | `v2::ThreadTimelineListResponse` | experimental: thread/timeline/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1021] |

目标 `client_request_definitions` 里 thread/memory/section/project/timeline 方法共 52 个（含 `memory/reset` 与 7 个 `project/*`）。`account/usage/read` 不在本表，但是 thread usage 的读取入口。[E: codex-rs/app-server-protocol/src/protocol/common.rs:514][E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/common.rs:804][E: codex-rs/app-server-protocol/src/protocol/common.rs:1021][E: codex-rs/app-server-protocol/src/protocol/common.rs:1241]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs`
- `codex-rs/app-server/src/request_processors/thread_sections.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/thread_queue_processor.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/thread-store/src/local/paginated_fork.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `subsys.core.thread-queue` -> [Thread queue](../../subsystems/core/thread-queue.md)
