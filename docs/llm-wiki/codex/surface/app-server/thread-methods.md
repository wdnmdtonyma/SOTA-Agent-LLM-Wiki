---
id: rpc.thread-methods
title: thread 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs, codex-rs/app-server/src/request_processors/thread_sections.rs, codex-rs/app-server/src/request_processors/thread_processor.rs, codex-rs/app-server/src/request_processors/thread_queue_processor.rs, codex-rs/app-server/src/request_processors/thread_attachments.rs, codex-rs/app-server/src/request_processors/turn_processor.rs, codex-rs/thread-store/src/local/paginated_fork.rs, codex-rs/thread-store/src/local/revert_thread.rs, codex-rs/thread-store/src/local/thread_attachments.rs, codex-rs/thread-store/src/local/thread_history/search.rs]
symbols: [ThreadStartParams, ThreadStartResponse, ThreadResumeParams, ThreadForkParams, ThreadMetadataUpdateParams, ThreadSection, ThreadSectionMoveParams, ThreadSectionListParams, ThreadSectionCreateParams, ThreadSectionUpdateParams, ThreadSectionDeleteParams, ThreadArchiveParams, ThreadDeleteParams, ThreadListParams, ThreadSearchOccurrencesParams, ThreadSearchOccurrence, ThreadReadParams, ThreadTurnsListParams, ThreadItemsListParams, ThreadInjectItemsParams, ThreadQueueAddParams, ThreadRevertParams, ThreadSettingsUpdateParams, ThreadAttachmentAddParams, ThreadAttachmentListParams, ThreadAttachmentRemoveParams]
related: [rpc.overview, rpc.turn-methods, rpc.notifications-thread, rpc.mcp-skills-plugin-methods, subsys.app-server.message-processor, subsys.core.session-lifecycle, subsys.core.thread-store, subsys.core.thread-queue]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> thread 方法是 app-server v2 管理 Codex thread 生命周期、订阅、目标、队列、设置、附件、历史读取和 thread-local 操作的 client request catalog。

## 能回答的问题

- thread/memory client request 当前有哪些 wire method？
- 哪些 thread 方法是 experimental 或按 params 字段检查 experimental gate？
- `thread/queue/*`、`thread/revert`、`thread/settings/update`、`thread/attachment/*` 分别做什么？`thread/rollback` 是否还在？
- thread usage 走哪条 account RPC？
- `memory/reset` 与 `memory/status` 为什么归到 thread catalog？

## 字段模型

`ThreadStartParams` 定义在 v2 thread 模块，`ThreadStartResponse` 同模块返回 thread runtime 侧信息；`ThreadResumeParams` 与 `ThreadListParams` 也在同一文件。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:62][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:181][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:345][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1365]

`thread/increment_elicitation`、`thread/decrement_elicitation`、六个 `thread/queue/*`、`thread/settings/update`、`thread/memoryMode/set`、`memory/status`、`memory/reset`、background terminals、`thread/search`、`thread/searchOccurrences`、七个 `project/*` 与 `thread/timeline/list` 带 experimental 标记。`thread/revert`、`thread/turns/list`、`thread/items/list` 与三个 `thread/attachment/*` 是稳定 wire。没有 `thread/rollback`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:597][E: codex-rs/app-server-protocol/src/protocol/common.rs:632][E: codex-rs/app-server-protocol/src/protocol/common.rs:673][E: codex-rs/app-server-protocol/src/protocol/common.rs:694][E: codex-rs/app-server-protocol/src/protocol/common.rs:707][E: codex-rs/app-server-protocol/src/protocol/common.rs:756][E: codex-rs/app-server-protocol/src/protocol/common.rs:768][E: codex-rs/app-server-protocol/src/protocol/common.rs:852][E: codex-rs/app-server-protocol/src/protocol/common.rs:858][E: codex-rs/app-server-protocol/src/protocol/common.rs:1087]

`thread/searchOccurrences` 在单个 thread 的可见 user message 与 final assistant message 中做 case-insensitive literal substring 搜索；该 request 明确 `serialization: None`，可并发读 persisted paginated history。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1561][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1565][E: codex-rs/thread-store/src/local/thread_history/search.rs:126][E: codex-rs/thread-store/src/local/thread_history/search.rs:144][E: codex-rs/thread-store/src/local/thread_history/search.rs:400][E: codex-rs/thread-store/src/local/thread_history/search.rs:405][E: codex-rs/app-server-protocol/src/protocol/common.rs:835][E: codex-rs/app-server-protocol/src/protocol/common.rs:839]

pinning 已从独立 `isPinned` patch/filter 迁移为通用 section 模型：`Thread` 返回 optional `section` 与 `sectionEnteredAt`，`thread/list.sectionId` 是三态筛选——省略表示全部 section，`null` 表示未分组，字符串表示指定 section。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:228][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:232][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1404]

Paginated `thread/fork` 不再等同于复制一段内存 history：store 先冻结 source lineage，按 `Latest` / `ThroughTurn` / `BeforeTurn` 解析 durable boundary。[E: codex-rs/thread-store/src/local/paginated_fork.rs:23][E: codex-rs/thread-store/src/local/paginated_fork.rs:112][E: codex-rs/thread-store/src/local/paginated_fork.rs:113][E: codex-rs/thread-store/src/local/paginated_fork.rs:136]

三个 `thread/attachment/{add,list,remove}` 是稳定 client RPC。params/response 在 `v2/thread_attachment.rs`；processor 调 `thread-store` local adapter 写 SQLite，`add` 在 `Created`、`remove` 在 `Removed` 之后发 `thread/attachment/updated`。`list` 是分页读，`serialization: None`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:673][E: codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs:26][E: codex-rs/app-server/src/request_processors/thread_attachments.rs:36][E: codex-rs/app-server/src/request_processors/thread_attachments.rs:93][E: codex-rs/thread-store/src/local/thread_attachments.rs:15][E: codex-rs/thread-store/src/local/thread_attachments.rs:35][E: codex-rs/thread-store/src/local/thread_attachments.rs:46]

`memory/status` 与 `memory/reset` 在 `client_request_definitions!` 里相邻，都走 `serialization: global("memory")`，因此本表保留 catalog 行；`MemoryStatusParams` 字段与 readiness 语义的权威行在 `rpc.mcp-skills-plugin-methods`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/common.rs:712]

## Queue / revert / settings

六个 `thread/queue/{add,list,update,delete,reorder,start}` 是 durable per-thread user submission queue 的 experimental RPC。语义与门控见 `subsys.core.thread-queue`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:632]

`thread/rollback` 已从 `client_request_definitions!` 删除，不再是 client RPC；catalog 在 `thread/backgroundTerminals/terminate` 之后直接进入 `thread/revert`。没有单独的 deprecation notice handler。[E: codex-rs/app-server-protocol/src/protocol/common.rs:751][E: codex-rs/app-server-protocol/src/protocol/common.rs:756] `ThreadRollbackParams` / `ThreadRollbackResponse` schema 也不存在。错误枚举 `CodexErrorInfo::ThreadRollbackFailed` 仍在，只为反序列化旧 rollout，不是活 RPC。[I]

`thread/revert` 是 Paginated 磁盘安全路径：processor 先确认 `ThreadHistoryMode::Paginated`，关停并卸下 live thread，store 锁 live writer 后按 `before_turn_id` 写新 immutable rollout，CAS 替换 SQLite path，再内部 reload 同一 thread id。[E: codex-rs/app-server-protocol/src/protocol/common.rs:756][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2111][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2141][E: codex-rs/thread-store/src/local/revert_thread.rs:19][E: codex-rs/thread-store/src/local/revert_thread.rs:126][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2200] `ThreadRevertResponse.thread.turns` 按 `Thread` 约定为空，用 `turns_backwards_cursor` / `items_backwards_cursor` 再拉 history。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1259][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1262][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1267][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:293] 该方法不带 `#[experimental]`。它只替换 persisted history，不回滚 workspace 文件改动。[I]

`thread/settings/update` 是 experimental 且 `inspect_params: true`。processor 把 overrides 编成 `Op::ThreadSettings` 入 submission queue，response 为空；生效快照走 `thread/settings/updated`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:693][E: codex-rs/app-server-protocol/src/protocol/common.rs:696]

`account/usage/read` 不是 thread method，但 `GetAccountTokenUsageParams.thread_id` 存在时改读 backend thread usage，返回 `GetAccountTokenUsageResponse.thread_usage`。字段模型见 `subsys.core.token-budget`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1307]

## 方法 catalog

本轮删除 `thread/rollback`。`thread/attachment/{add,list,remove}` 与 experimental `memory/status` 仍在本表。`turn/settings/update` 不在本表，收在 turn catalog。


| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `ThreadStart` | `thread/start` | `v2::ThreadStartParams` | `v2::ThreadStartResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:559] |
| `ThreadResume` | `thread/resume` | `v2::ThreadResumeParams` | `v2::ThreadResumeResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:565] |
| `ThreadFork` | `thread/fork` | `v2::ThreadForkParams` | `v2::ThreadForkResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:571] |
| `ThreadArchive` | `thread/archive` | `v2::ThreadArchiveParams` | `v2::ThreadArchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:577] |
| `ThreadDelete` | `thread/delete` | `v2::ThreadDeleteParams` | `v2::ThreadDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:582] |
| `ThreadUnsubscribe` | `thread/unsubscribe` | `v2::ThreadUnsubscribeParams` | `v2::ThreadUnsubscribeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:587] |
| `ThreadIncrementElicitation` | `thread/increment_elicitation` | `v2::ThreadIncrementElicitationParams` | `v2::ThreadIncrementElicitationResponse` | experimental: thread/increment_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:597] |
| `ThreadDecrementElicitation` | `thread/decrement_elicitation` | `v2::ThreadDecrementElicitationParams` | `v2::ThreadDecrementElicitationResponse` | experimental: thread/decrement_elicitation | [E: codex-rs/app-server-protocol/src/protocol/common.rs:606] |
| `ThreadSetName` | `thread/name/set` | `v2::ThreadSetNameParams` | `v2::ThreadSetNameResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:611] |
| `ThreadGoalSet` | `thread/goal/set` | `v2::ThreadGoalSetParams` | `v2::ThreadGoalSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:616] |
| `ThreadGoalGet` | `thread/goal/get` | `v2::ThreadGoalGetParams` | `v2::ThreadGoalGetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:621] |
| `ThreadGoalClear` | `thread/goal/clear` | `v2::ThreadGoalClearParams` | `v2::ThreadGoalClearResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:626] |
| `ThreadQueueAdd` | `thread/queue/add` | `v2::ThreadQueueAddParams` | `v2::ThreadQueueAddResponse` | experimental: thread/queue/add | [E: codex-rs/app-server-protocol/src/protocol/common.rs:632] |
| `ThreadQueueList` | `thread/queue/list` | `v2::ThreadQueueListParams` | `v2::ThreadQueueListResponse` | experimental: thread/queue/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:638] |
| `ThreadQueueUpdate` | `thread/queue/update` | `v2::ThreadQueueUpdateParams` | `v2::ThreadQueueUpdateResponse` | experimental: thread/queue/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:644] |
| `ThreadQueueDelete` | `thread/queue/delete` | `v2::ThreadQueueDeleteParams` | `v2::ThreadQueueDeleteResponse` | experimental: thread/queue/delete | [E: codex-rs/app-server-protocol/src/protocol/common.rs:650] |
| `ThreadQueueReorder` | `thread/queue/reorder` | `v2::ThreadQueueReorderParams` | `v2::ThreadQueueReorderResponse` | experimental: thread/queue/reorder | [E: codex-rs/app-server-protocol/src/protocol/common.rs:656] |
| `ThreadQueueStart` | `thread/queue/start` | `v2::ThreadQueueStartParams` | `v2::ThreadQueueStartResponse` | experimental: thread/queue/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:662] |
| `ThreadMetadataUpdate` | `thread/metadata/update` | `v2::ThreadMetadataUpdateParams` | `v2::ThreadMetadataUpdateResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:667] |
| `ThreadAttachmentAdd` | `thread/attachment/add` | `v2::ThreadAttachmentAddParams` | `v2::ThreadAttachmentAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:673] |
| `ThreadAttachmentList` | `thread/attachment/list` | `v2::ThreadAttachmentListParams` | `v2::ThreadAttachmentListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:678] |
| `ThreadAttachmentRemove` | `thread/attachment/remove` | `v2::ThreadAttachmentRemoveParams` | `v2::ThreadAttachmentRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:683] |
| `ThreadSectionMove` | `thread/section/move` | `v2::ThreadSectionMoveParams` | `v2::ThreadSectionMoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:688] |
| `ThreadSettingsUpdate` | `thread/settings/update` | `v2::ThreadSettingsUpdateParams` | `v2::ThreadSettingsUpdateResponse` | experimental: thread/settings/update + inspect_params | [E: codex-rs/app-server-protocol/src/protocol/common.rs:694] |
| `ThreadMemoryModeSet` | `thread/memoryMode/set` | `v2::ThreadMemoryModeSetParams` | `v2::ThreadMemoryModeSetResponse` | experimental: thread/memoryMode/set | [E: codex-rs/app-server-protocol/src/protocol/common.rs:701] |
| `MemoryStatus` | `memory/status` | `v2::MemoryStatusParams` | `v2::MemoryStatusResponse` | experimental: memory/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:707] |
| `MemoryReset` | `memory/reset` | `Option<()>` | `v2::MemoryResetResponse` | experimental: memory/reset | [E: codex-rs/app-server-protocol/src/protocol/common.rs:713] |
| `ThreadUnarchive` | `thread/unarchive` | `v2::ThreadUnarchiveParams` | `v2::ThreadUnarchiveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:718] |
| `ThreadCompactStart` | `thread/compact/start` | `v2::ThreadCompactStartParams` | `v2::ThreadCompactStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:723] |
| `ThreadShellCommand` | `thread/shellCommand` | `v2::ThreadShellCommandParams` | `v2::ThreadShellCommandResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:728] |
| `ThreadApproveGuardianDeniedAction` | `thread/approveGuardianDeniedAction` | `v2::ThreadApproveGuardianDeniedActionParams` | `v2::ThreadApproveGuardianDeniedActionResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:733] |
| `ThreadBackgroundTerminalsClean` | `thread/backgroundTerminals/clean` | `v2::ThreadBackgroundTerminalsCleanParams` | `v2::ThreadBackgroundTerminalsCleanResponse` | experimental: thread/backgroundTerminals/clean | [E: codex-rs/app-server-protocol/src/protocol/common.rs:739] |
| `ThreadBackgroundTerminalsList` | `thread/backgroundTerminals/list` | `v2::ThreadBackgroundTerminalsListParams` | `v2::ThreadBackgroundTerminalsListResponse` | experimental: thread/backgroundTerminals/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:745] |
| `ThreadBackgroundTerminalsTerminate` | `thread/backgroundTerminals/terminate` | `v2::ThreadBackgroundTerminalsTerminateParams` | `v2::ThreadBackgroundTerminalsTerminateResponse` | experimental: thread/backgroundTerminals/terminate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:751] |
| `ThreadRevert` | `thread/revert` | `v2::ThreadRevertParams` | `v2::ThreadRevertResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:756] |
| `ThreadList` | `thread/list` | `v2::ThreadListParams` | `v2::ThreadListResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:761] |
| `ProjectList` | `project/list` | `v2::ProjectListParams` | `v2::ProjectListResponse` | experimental: project/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:768] |
| `ProjectRead` | `project/read` | `v2::ProjectReadParams` | `v2::ProjectReadResponse` | experimental: project/read | [E: codex-rs/app-server-protocol/src/protocol/common.rs:774] |
| `ProjectCreate` | `project/create` | `v2::ProjectCreateParams` | `v2::ProjectCreateResponse` | experimental: project/create | [E: codex-rs/app-server-protocol/src/protocol/common.rs:780] |
| `ProjectImport` | `project/import` | `v2::ProjectImportParams` | `v2::ProjectImportResponse` | experimental: project/import | [E: codex-rs/app-server-protocol/src/protocol/common.rs:786] |
| `ProjectUpdate` | `project/update` | `v2::ProjectUpdateParams` | `v2::ProjectUpdateResponse` | experimental: project/update | [E: codex-rs/app-server-protocol/src/protocol/common.rs:792] |
| `ProjectMove` | `project/move` | `v2::ProjectMoveParams` | `v2::ProjectMoveResponse` | experimental: project/move | [E: codex-rs/app-server-protocol/src/protocol/common.rs:798] |
| `ProjectDelete` | `project/delete` | `v2::ProjectDeleteParams` | `v2::ProjectDeleteResponse` | experimental: project/delete | [E: codex-rs/app-server-protocol/src/protocol/common.rs:804] |
| `ThreadSectionList` | `threadSection/list` | `v2::ThreadSectionListParams` | `v2::ThreadSectionListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:809] |
| `ThreadSectionCreate` | `threadSection/create` | `v2::ThreadSectionCreateParams` | `v2::ThreadSectionCreateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:814] |
| `ThreadSectionUpdate` | `threadSection/update` | `v2::ThreadSectionUpdateParams` | `v2::ThreadSectionUpdateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:819] |
| `ThreadSectionDelete` | `threadSection/delete` | `v2::ThreadSectionDeleteParams` | `v2::ThreadSectionDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:824] |
| `ThreadSearch` | `thread/search` | `v2::ThreadSearchParams` | `v2::ThreadSearchResponse` | experimental: thread/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:830] |
| `ThreadSearchOccurrences` | `thread/searchOccurrences` | `v2::ThreadSearchOccurrencesParams` | `v2::ThreadSearchOccurrencesResponse` | experimental: thread/searchOccurrences | [E: codex-rs/app-server-protocol/src/protocol/common.rs:836] |
| `ThreadLoadedList` | `thread/loaded/list` | `v2::ThreadLoadedListParams` | `v2::ThreadLoadedListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:842] |
| `ThreadRead` | `thread/read` | `v2::ThreadReadParams` | `v2::ThreadReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:847] |
| `ThreadTurnsList` | `thread/turns/list` | `v2::ThreadTurnsListParams` | `v2::ThreadTurnsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:852] |
| `ThreadItemsList` | `thread/items/list` | `v2::ThreadItemsListParams` | `v2::ThreadItemsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:858] |
| `ThreadInjectItems` | `thread/inject_items` | `v2::ThreadInjectItemsParams` | `v2::ThreadInjectItemsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:865] |
| `ThreadTimelineList` | `thread/timeline/list` | `v2::ThreadTimelineListParams` | `v2::ThreadTimelineListResponse` | experimental: thread/timeline/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1087] |

目标 `client_request_definitions` 里 thread/memory/section/project/timeline/attachment 方法共 **55** 个（含 `memory/status`、`memory/reset`、3 个 `thread/attachment/*` 与 7 个 `project/*`，无 `thread/rollback`）。`account/usage/read` 不在本表，但是 thread usage 的读取入口。[E: codex-rs/app-server-protocol/src/protocol/common.rs:559][E: codex-rs/app-server-protocol/src/protocol/common.rs:673][E: codex-rs/app-server-protocol/src/protocol/common.rs:707][E: codex-rs/app-server-protocol/src/protocol/common.rs:756][E: codex-rs/app-server-protocol/src/protocol/common.rs:768][E: codex-rs/app-server-protocol/src/protocol/common.rs:865][E: codex-rs/app-server-protocol/src/protocol/common.rs:1087][E: codex-rs/app-server-protocol/src/protocol/common.rs:1307]

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_attachment.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs`
- `codex-rs/app-server/src/request_processors/thread_sections.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`
- `codex-rs/app-server/src/request_processors/thread_queue_processor.rs`
- `codex-rs/app-server/src/request_processors/thread_attachments.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/thread-store/src/local/paginated_fork.rs`
- `codex-rs/thread-store/src/local/revert_thread.rs`
- `codex-rs/thread-store/src/local/thread_attachments.rs`
- `codex-rs/thread-store/src/local/thread_history/search.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.turn-methods` -> [turn 方法](turn-methods.md)
- `rpc.notifications-thread` -> [server notifications: thread/turn/item](notifications-thread.md)
- `rpc.mcp-skills-plugin-methods` -> [mcp/skills/plugin 方法](mcp-skills-plugin-methods.md)
- `subsys.core.thread-queue` -> [Thread queue](../../subsystems/core/thread-queue.md)
