---
id: subsys.core.thread-queue
title: Thread queue
kind: subsystem
tier: T2
source: [codex-rs/ext/queue/src/lib.rs, codex-rs/ext/queue/src/service.rs, codex-rs/thread-store/src/queue_store.rs, codex-rs/app-server/src/request_processors/thread_queue_processor.rs, codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/state/src/model/queued_item.rs, codex-rs/state/src/runtime/queued_items.rs, codex-rs/state/queue_migrations/0001_queued_items.sql, codex-rs/state/src/lib.rs, codex-rs/state/src/sqlite.rs, codex-rs/state/src/runtime.rs, codex-rs/state/src/runtime/threads.rs, codex-rs/app-server/src/message_processor.rs, codex-rs/app-server/src/extensions.rs, codex-rs/protocol/src/protocol.rs]
symbols: [QueuedItemService, QueueStore, LocalQueueStore, SqliteQueueStore, QueuedUserSubmissionRecord, QueuedItem, ThreadQueueRequestProcessor, queue::ThreadQueueChangedEvent]
related: [rpc.thread-methods, rpc.notifications-thread, subsys.core.thread-store, subsys.core.state-db, subsys.core.session-lifecycle]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Thread queue 是 per-thread、有序、durable 的用户提交队列。app-server 用 6 个 experimental RPC 读写它；`QueuedItemService` 在 thread idle 时把队首 `TurnInput::UserInput` 交给 Core `start_turn_if_idle`，并用 `EventMsg::ThreadQueueChanged` 通知客户端。[E: codex-rs/ext/queue/src/lib.rs:3][E: codex-rs/ext/queue/src/service.rs:36][E: codex-rs/ext/queue/src/service.rs:203]

## 能回答的问题

- thread queue 的 6 个 client RPC 各自改什么、返回什么？
- 队列存在哪个 SQLite 文件、上限是多少？
- idle dispatch 何时启动下一条 queued submission？
- 哪些 thread 不能 enqueue / start？
- `thread/queue/changed` 在什么时候发出？

## 职责边界

`codex-rs/ext/queue` 只注册 `ThreadLifecycleContributor`，并在 idle 时消费 `QueueStore`。[E: codex-rs/ext/queue/src/lib.rs:14][E: codex-rs/ext/queue/src/service.rs:361]

`QueueStore` 是 storage-neutral 接口：`enqueue` / `list_page` / `update` / `delete` / `reorder`。[E: codex-rs/thread-store/src/queue_store.rs:14][E: codex-rs/thread-store/src/queue_store.rs:15][E: codex-rs/thread-store/src/queue_store.rs:21][E: codex-rs/thread-store/src/queue_store.rs:28][E: codex-rs/thread-store/src/queue_store.rs:35][E: codex-rs/thread-store/src/queue_store.rs:41]

`LocalQueueStore` 把这些调用转到 `StateRuntime::thread_queue()` 的 `SqliteQueueStore`。[E: codex-rs/thread-store/src/queue_store.rs:55][E: codex-rs/state/src/runtime.rs:284]

Durable 行存在独立 `queue_1.sqlite` 的 `queued_items` 表，不进 JSONL rollout。[E: codex-rs/state/src/sqlite.rs:32][E: codex-rs/state/queue_migrations/0001_queued_items.sql:1]

App-server 只有在 `ThreadStoreConfig::Local` 且有 state DB 时才构造 `QueuedItemService`；InMemory thread store 没有 queue。[E: codex-rs/app-server/src/message_processor.rs:260][E: codex-rs/app-server/src/message_processor.rs:263][E: codex-rs/app-server/src/message_processor.rs:279]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/ext/queue/src/service.rs` | enqueue/list/update/delete/reorder/start，idle dispatch，`ThreadQueueChanged`。[E: codex-rs/ext/queue/src/service.rs:100][E: codex-rs/ext/queue/src/service.rs:312] |
| `codex-rs/thread-store/src/queue_store.rs` | `QueueStore` trait 与 `LocalQueueStore`。[E: codex-rs/thread-store/src/queue_store.rs:14][E: codex-rs/thread-store/src/queue_store.rs:46] |
| `codex-rs/state/src/runtime/queued_items.rs` | SQLite CRUD、容量门与 atomic reorder。[E: codex-rs/state/src/runtime/queued_items.rs:21][E: codex-rs/state/src/runtime/queued_items.rs:108] |
| `codex-rs/app-server/src/request_processors/thread_queue_processor.rs` | 6 个 RPC 的校验、分页、start-if-idle。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:72][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:181] |

## 数据模型

| 实体 | 字段 | 说明 |
|---|---|---|
| `QueuedUserSubmissionRecord` | `id`, `thread_id`, `payload` | SQLite 行；payload 是 `TurnInput` JSON。[E: codex-rs/state/src/model/queued_item.rs:8][E: codex-rs/state/src/model/queued_item.rs:9][E: codex-rs/state/src/model/queued_item.rs:11] |
| `QueuedItem` | `id`, `input` | service 层反序列化后的用户消息。[E: codex-rs/ext/queue/src/service.rs:37] |
| `QueuedSubmission` | `id`, `input`, `client_user_message_id` | app-server wire 对象。[E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:864][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:866][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:867] |
| `queued_items` | `id`, `thread_id`, `payload_json`, `queue_order`, timestamps | `queue_order` 在 `(thread_id, queue_order)` 上 unique。[E: codex-rs/state/queue_migrations/0001_queued_items.sql:1][E: codex-rs/state/queue_migrations/0001_queued_items.sql:10] |

`MAX_QUEUE_ITEMS` 是 100。超过时 `INSERT ... WHERE COUNT(*) < 100` 不返回行，`LocalQueueStore` 把它映射成 `InvalidRequest`。[E: codex-rs/state/src/lib.rs:90][E: codex-rs/state/src/runtime/queued_items.rs:36][E: codex-rs/thread-store/src/queue_store.rs:84]

`enqueue` 只接受非空 `TurnInput::UserInput`；文本字符数不能超过 `MAX_USER_INPUT_TEXT_CHARS`；缺 `client_id` 时生成 UUIDv7；`LocalImage` / `LocalAudio` 会先 snapshot。[E: codex-rs/ext/queue/src/service.rs:321][E: codex-rs/ext/queue/src/service.rs:324][E: codex-rs/ext/queue/src/service.rs:334][E: codex-rs/ext/queue/src/service.rs:337][E: codex-rs/ext/queue/src/service.rs:348]

## Queue RPC catalog

六个方法都标 `experimental`，serialization key 是 `thread_id`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:577][E: codex-rs/app-server-protocol/src/protocol/common.rs:580]

| Variant | Wire method | Params | Response | 行为 |
|---|---|---|---|---|
| `ThreadQueueAdd` | `thread/queue/add` | `thread_id`, `input`, `client_user_message_id` | `queued_submission` | enqueue 后若 thread 已加载且非 `Interrupted`，emit idle lifecycle 尝试 dispatch。[E: codex-rs/app-server-protocol/src/protocol/common.rs:578][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:80][E: codex-rs/ext/queue/src/service.rs:113] |
| `ThreadQueueList` | `thread/queue/list` | `thread_id`, optional `cursor`/`limit` | `data`, `next_cursor` | cursor 是 offset 字符串；默认 limit 25，clamp 到 `[1, 100]`；多取 1 条判断下一页。[E: codex-rs/app-server-protocol/src/protocol/common.rs:584][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:100][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:108][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:111] |
| `ThreadQueueUpdate` | `thread/queue/update` | `thread_id`, `queued_submission_id`, `input` | `queued_submission` | 保留原 `client_id`；找不到该 id 返回 invalid request。[E: codex-rs/app-server-protocol/src/protocol/common.rs:590][E: codex-rs/ext/queue/src/service.rs:143][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:146] |
| `ThreadQueueDelete` | `thread/queue/delete` | `thread_id`, `queued_submission_id` | `deleted: bool` | 未找到也成功返回 `false`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:596][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:166] |
| `ThreadQueueReorder` | `thread/queue/reorder` | `thread_id`, `queued_submission_ids` | `{}` | `item_ids` 必须是当前队列的完整排列，否则 `InvalidRequest`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:602][E: codex-rs/state/src/runtime/queued_items.rs:121][E: codex-rs/thread-store/src/queue_store.rs:41] |
| `ThreadQueueStart` | `thread/queue/start` | `thread_id`, optional `queued_submission_id` | `turn` | thread 必须已加载；省略 id 取队首；只有 `Started` 才从队列删除该项。[E: codex-rs/app-server-protocol/src/protocol/common.rs:608][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:189][E: codex-rs/ext/queue/src/service.rs:215][E: codex-rs/ext/queue/src/service.rs:229] |

`thread/queue/start` 在 `NotIdle` / `PendingTriggerTurn` 时返回 “thread already has an active or pending turn”。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:202][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:205]

没有 queue service 时六个 RPC 都返回 “user message queue is unavailable”。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:234]

## 控制流

1. `MessageProcessor` 用 `LocalQueueStore` 和 `Weak<ThreadManager>` 建 `QueuedItemService`，再 `codex_queue_extension::install` 成 lifecycle contributor。[E: codex-rs/app-server/src/message_processor.rs:280][E: codex-rs/app-server/src/extensions.rs:75]
2. `add`/`update` 先校验 image URL，再要求 thread 存在：已加载则拒绝 ephemeral；未加载则 `read_thread(include_archived=true)`，archived 拒绝。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:76][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:247][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:268]
3. loaded multi-agent v2 subagent、unloaded `SessionSource::SubAgent(ThreadSpawn)` 不能 add/update/start。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:284][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:288]
4. 每个 mutating 操作持 per-thread `dispatch_lock`，写完后 `emit_changed`：`EventMsg::ThreadQueueChanged { thread_id }`。[E: codex-rs/ext/queue/src/service.rs:108][E: codex-rs/ext/queue/src/service.rs:312][E: codex-rs/protocol/src/protocol.rs:3848]
5. `on_thread_idle` 在 `Interrupted` 时直接返回；否则 `dispatch_if_idle` 读队首，非法/非 user payload 丢弃后继续，成功 `Started` 后删除该项并停止。[E: codex-rs/ext/queue/src/service.rs:367][E: codex-rs/ext/queue/src/service.rs:258][E: codex-rs/ext/queue/src/service.rs:273]
6. 删除整个 thread 时 `StateRuntime` 调 `delete_thread_queue`。[E: codex-rs/state/src/runtime/threads.rs:1104][E: codex-rs/state/src/runtime/queued_items.rs:147]

## 设计动机与权衡

队列与 rollout 分离，是为了让用户在 turn 进行中排队后续提交，而不把未开始的消息写进 replay history。[I]

`start` 与 idle dispatch 都用 `start_turn_if_idle`，避免在 active/pending turn 上再开一条 RegularTask。[E: codex-rs/ext/queue/src/service.rs:227][E: codex-rs/ext/queue/src/service.rs:270]

Reorder 要求完整排列，避免只移动子集时留下空洞 `queue_order`。[E: codex-rs/state/src/runtime/queued_items.rs:121]

## Gotcha

- `thread/queue/start` 不能对未 resume 的 thread 调用；list/add 可以对未加载但未归档的 persisted thread 工作。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:189][E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:253]
- Idle dispatch 不会因为 Core 拒绝而删除该项（除非 payload 非法）；`start` 也只有 `Started` 才 delete。[E: codex-rs/ext/queue/src/service.rs:277][E: codex-rs/ext/queue/src/service.rs:229]
- `ThreadQueueChanged` 只带 `thread_id`，客户端必须再 `thread/queue/list`。[E: codex-rs/protocol/src/protocol.rs:3848][E: codex-rs/app-server-protocol/src/protocol/v2/thread.rs:1882]
- ephemeral thread 明确不支持 queued submissions。[E: codex-rs/app-server/src/request_processors/thread_queue_processor.rs:249]

## Sources

- `codex-rs/ext/queue/src/lib.rs`
- `codex-rs/ext/queue/src/service.rs`
- `codex-rs/thread-store/src/queue_store.rs`
- `codex-rs/app-server/src/request_processors/thread_queue_processor.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/state/src/model/queued_item.rs`
- `codex-rs/state/src/runtime/queued_items.rs`
- `codex-rs/state/queue_migrations/0001_queued_items.sql`
- `codex-rs/state/src/lib.rs`
- `codex-rs/state/src/sqlite.rs`
- `codex-rs/state/src/runtime.rs`
- `codex-rs/state/src/runtime/threads.rs`
- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [thread 方法](../../surface/app-server/thread-methods.md)
- [server notifications: thread/turn/item](../../surface/app-server/notifications-thread.md)
- [Thread store](thread-store.md)
- [State DB](state-db.md)
- [Session 生命周期](session-lifecycle.md)
