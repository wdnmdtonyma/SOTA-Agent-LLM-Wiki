---
id: subsys.durable.runtime
title: Durable Session / document tokens / createSession
kind: subsystem
tier: T2
pkg: durable
source:
  - package.json
  - packages/durable/package.json
  - packages/durable/README.md
  - packages/durable/src/index.ts
  - packages/durable/src/ids.ts
  - packages/durable/src/types.ts
  - packages/durable/src/documents.ts
  - packages/durable/src/errors.ts
  - packages/durable/src/session/session.ts
  - packages/durable/src/session/transaction.ts
  - packages/durable/src/session/forks.ts
  - packages/durable/src/session/publications.ts
  - packages/durable/src/storage/memory.ts
  - packages/durable/src/testing/storage-conformance.ts
  - packages/durable/test/storage-runtime-boundary.test.ts
symbols:
  - createSession
  - Session
  - SessionKernel
  - Tx
  - Storage
  - defineDoc
  - defineDocFamily
  - ROOT_CONVERSATION_ID
  - Id
  - Seq
  - idFromNumber
  - seqFromNumber
  - ConversationOwnership
  - DocToken
  - DocFamilyToken
  - MemoryStorage
  - ReadAfterWrite
  - StorageRejected
related:
  - subsys.durable.storage
  - spine.layered-architecture
  - spine.overview
  - spine.session-state-model
  - ref.package-index
  - subsys.chord.runtime
  - subsys.chord.delta
  - subsys.agent-core.session-storage
  - subsys.coding-agent.session-manager
  - subsys.session-backends.sqlite-node
evidence: explicit
status: verified
updated: 6f7551516b
---

> `@earendil-works/pi-durable` 是 runtime-neutral 的 durable conversation / task / document runtime：根入口导出 `createSession()`、`MemoryStorage`、`defineDoc()` / `defineDocFamily()` document tokens、`ROOT_CONVERSATION_ID`。ID 是 erased brand 的 `Id<Kind>` / `Seq`。它依赖 Chord `Context` / `Draft` / `track()` 与 `pi-ai` 的 `Message`，**不是** `pi-coding-agent` `SessionManager` JSONL 的替代，也不是 `pi-agent-core` v4 `SessionRepo`。

## 能回答的问题

- `createSession(storage)` 返回什么，`Session.commit()` 怎样串行化 mutation line？
- document token（`defineDoc` / `defineDocFamily`）如何把 scope / family / rewindable 编进类型？
- `ROOT_CONVERSATION_ID` 为什么是 branded `1`，谁负责写入这条 conversation？
- `Id` / `Seq` 与 `idFromNumber` / `seqFromNumber` 只在哪些边界出现？
- `createConversation` 与 `forkConversation` 如何拆开，`ConversationOwnership` 怎样冻结 task 归属？
- Chord `Context` 在 `commit` / `snapshot` / Storage settlement 里分别管什么？
- 为什么不能把本包当成 coding-agent session JSONL 或 `pi-session-backend-sqlite-node` 的替换？

## 职责边界

npm 名是 `@earendil-works/pi-durable`，版本 `0.87.1`，description 是 “Durable conversation, task, and document runtime for Pi”。[E: packages/durable/package.json:2] [E: packages/durable/package.json:3] [E: packages/durable/package.json:4]

根 export `.` 指向 `src/index.ts`：`defineDoc` / `defineDocFamily`、`createSession`、`MemoryStorage`、`ROOT_CONVERSATION_ID`，以及 `ReadAfterWrite` / `StorageRejected`。[E: packages/durable/package.json:8] [E: packages/durable/src/index.ts:1] [E: packages/durable/src/index.ts:3] [E: packages/durable/src/index.ts:4] [E: packages/durable/src/index.ts:62] 类型再导出含 `Id`、`Seq`、`ConversationId`、`ConversationOwnership`。[E: packages/durable/src/index.ts:10] [E: packages/durable/src/index.ts:11] [E: packages/durable/src/index.ts:32] [E: packages/durable/src/index.ts:39] 根图故意不含 JSONL / SQLite / `env`：`index.ts` 的 import 图不得进入 `src/env/` 或 `src/storage/jsonl/` / `src/storage/sqlite/`。[E: packages/durable/test/storage-runtime-boundary.test.ts:25] [E: packages/durable/test/storage-runtime-boundary.test.ts:27] [E: packages/durable/test/storage-runtime-boundary.test.ts:28] [E: packages/durable/test/storage-runtime-boundary.test.ts:29]

运行依赖只有 `@earendil-works/chord` 与 `@earendil-works/pi-ai`。[E: packages/durable/package.json:87] [E: packages/durable/package.json:88] `pi-agent-core` 与 `pi-coding-agent` 的 `dependencies` **没有** `pi-durable`；本包也不实现 coding-agent `SessionManager` 或 agent-core `SessionRepo`。[I]

本节点覆盖 Session kernel、typed IDs、document tokens、record types、ownership 与 Chord `Context` 的交接。Memory / JSONL / SQLite backends 在 [subsys.durable.storage](storage.md)。`packages/durable/docs/pico*` 是设计手稿，不当 shipped 运行时。

## 关键文件

- `packages/durable/src/index.ts`：runtime-neutral 根 barrel。[E: packages/durable/src/index.ts:3]
- `packages/durable/src/ids.ts`：`idFromNumber` / `seqFromNumber` 只在 trusted allocation / decode 边界把 `number` 铸成 brand。[E: packages/durable/src/ids.ts:4] [E: packages/durable/src/ids.ts:9]
- `packages/durable/src/types.ts`：`Id` / `Seq`、`ROOT_CONVERSATION_ID`、`ConversationOwnership`、`Session` / `Tx` / `Storage`、document tokens、conversation / entry / task records。[E: packages/durable/src/types.ts:11] [E: packages/durable/src/types.ts:27] [E: packages/durable/src/types.ts:30] [E: packages/durable/src/types.ts:151] [E: packages/durable/src/types.ts:535] [E: packages/durable/src/types.ts:607] [E: packages/durable/src/types.ts:665]
- `packages/durable/src/documents.ts`：`defineDoc()` / `defineDocFamily()`、`resolveAddress()`、`materializeDocument()`。[E: packages/durable/src/documents.ts:53] [E: packages/durable/src/documents.ts:74] [E: packages/durable/src/documents.ts:108] [E: packages/durable/src/documents.ts:192]
- `packages/durable/src/session/session.ts`：`createSession()` → `SessionKernel`。[E: packages/durable/src/session/session.ts:37] [E: packages/durable/src/session/session.ts:47]
- `packages/durable/src/session/transaction.ts`：`Transaction` 实现 `Tx`；`createConversation` 与 `forkConversation` 拆开；table read 必须发生在第一次 table write 之前。[E: packages/durable/src/session/transaction.ts:150] [E: packages/durable/src/session/transaction.ts:205] [E: packages/durable/src/session/transaction.ts:209] [E: packages/durable/src/session/transaction.ts:836]
- `packages/durable/src/errors.ts`：`ReadAfterWrite`、`StorageRejected`。[E: packages/durable/src/errors.ts:2] [E: packages/durable/src/errors.ts:10]

## 数据模型

### `Id` / `Seq`（erased brands）

`Id<Kind, Type = unknown>` 是 `number` 与 unique `idBrand` 的交叉；`Kind` 区分 record 族，`Type` 给 `TaskId<Result>` 挂结果类型。[E: packages/durable/src/types.ts:8] [E: packages/durable/src/types.ts:11] 别名：`ConversationId`、`EntryId`、`TaskId<R>`、`SubmissionId`、`DocumentId`。[E: packages/durable/src/types.ts:18] [E: packages/durable/src/types.ts:19] [E: packages/durable/src/types.ts:20] [E: packages/durable/src/types.ts:21] [E: packages/durable/src/types.ts:22]

`Seq` 是另一套 unique `seqBrand`：一次原子 Storage commit 的严格递增序号，允许 gap。[E: packages/durable/src/types.ts:24] [E: packages/durable/src/types.ts:27]

`idFromNumber<I extends Id<string>>(value)` / `seqFromNumber(value)` 是 `value as I` / `value as Seq` 的单点铸造，注释要求只在 trusted allocation 或 decoding 边界使用。[E: packages/durable/src/ids.ts:4] [E: packages/durable/src/ids.ts:5] [E: packages/durable/src/ids.ts:9] [E: packages/durable/src/ids.ts:10] Session 侧例子：`snapshotAsOf` 把 overload 里的 entry 数字铸成 `EntryId`。[E: packages/durable/src/session/session.ts:150] Storage 侧 `mintId` 返回 `idFromNumber<I>(this.nextId++)`；commit 用 `seqFromNumber`。[E: packages/durable/src/storage/memory.ts:400] [E: packages/durable/src/storage/memory.ts:244] [E: packages/durable/src/storage/sqlite/storage.ts:221] [E: packages/durable/src/storage/sqlite/storage.ts:204]

### `ROOT_CONVERSATION_ID`

根 conversation 的保留 ID 是常量 `1 as ConversationId`。[E: packages/durable/src/types.ts:30] `MemoryStorage` 的 `nextId` 从 `2` 起；SQLite 初始 metadata 也是 `next_id = '2'`。[E: packages/durable/src/storage/memory.ts:235] [E: packages/durable/src/storage/sqlite/migrations.ts:15] conformance 第一条断言 `mintId()` 返回 `2`，再由调用方 `commit` 一条 `{ id: ROOT_CONVERSATION_ID }` 的 conversation write。[E: packages/durable/src/testing/storage-conformance.ts:26] [E: packages/durable/src/testing/storage-conformance.ts:94] [E: packages/durable/src/testing/storage-conformance.ts:95]

`createSession()` **不会**自动插入这条 root conversation。`Tx.createConversation()` 走 `storage.mintId()`，因此新 conversation 从 `2` 起编号。[E: packages/durable/src/session/session.ts:37] [E: packages/durable/src/session/transaction.ts:224]

### `ConversationOwnership` 与 create / fork 拆分

`ConversationOwnership` 是 `{ kind: "ownerless" } | { kind: "task"; taskId: TaskId }`。[E: packages/durable/src/types.ts:151] `Tx.createConversation({ ownership })` 与 `Tx.forkConversation(parent, at, { ownership })` 是两个方法，都必须显式传 ownership。[E: packages/durable/src/types.ts:552] [E: packages/durable/src/types.ts:554] [E: packages/durable/src/session/transaction.ts:205] [E: packages/durable/src/session/transaction.ts:209]

`#stageConversation`：`kind: "task"` 时读 owner task，把 `owner = { conversationId: task.conversationId, taskId }` 写进 `ConversationRecord`；`ownerless` 不写 `owner`。[E: packages/durable/src/session/transaction.ts:223] [E: packages/durable/src/session/transaction.ts:231] [E: packages/durable/src/session/transaction.ts:233] 只有 fork（`parent` 非空）才调 `prepareForkDocumentCopies()`。[E: packages/durable/src/session/transaction.ts:238] [E: packages/durable/src/session/forks.ts:26]

`ConversationRecord.owner` 是 attribution / subtree abort / idle waits 的 creator edge。[E: packages/durable/src/types.ts:162]

### 任务 conversation 归属创建后不可变

`Tx.createTask` 必须带 `options.conversationId`，写入 `TaskRecord.conversationId`。[E: packages/durable/src/session/transaction.ts:285] [E: packages/durable/src/session/transaction.ts:295] `Tx.setTask` 若 candidate 已有 `conversationId` 且与新值不同，抛 `Task ${id} cannot change conversations`。[E: packages/durable/src/session/transaction.ts:319] [E: packages/durable/src/session/transaction.ts:320] settle 前 `#validateConversationOwners` 也会拒绝 owner task 换 conversation。[E: packages/durable/src/session/transaction.ts:764] [E: packages/durable/src/session/transaction.ts:765]

### Document tokens

`defineDoc()` / `defineDocFamily()` 校验 `version` 为正整数后返回 `{ definition }` token，调用方把 token 显式传给 `Tx.doc()` / `Session.snapshot()`。[E: packages/durable/src/documents.ts:53] [E: packages/durable/src/documents.ts:54] [E: packages/durable/src/documents.ts:55] [E: packages/durable/src/documents.ts:95] [E: packages/durable/src/types.ts:77]

| token 族 | scope | 额外语义 |
|---|---|---|
| `SessionDocToken` / `SessionDocFamilyToken` | `"session"` | 无 history / fork |
| `ConversationDocToken` / family | `"conversation"` | `history: "latest"` 或 `"rewindable"` |
| `RewindableConversationDocToken` / family | `"conversation"` | `history: "rewindable"`，才允许 `snapshotAsOf()` |
| `TaskDocToken` / `TaskDocFamilyToken` | `"task"` | 无 history / fork |

`LatestConversationSemantics` 是 `history: "latest"` + `fork: "current" | "initial"`；`RewindableConversationSemantics` 是 `history: "rewindable"` + `fork: "asOf" | "current" | "initial"`。[E: packages/durable/src/types.ts:33] [E: packages/durable/src/types.ts:40] family 定义带 `family: true`，`initial(seed)` 只在成员缺失时运行。[E: packages/durable/src/types.ts:70] [E: packages/durable/src/session/transaction.ts:447]

`resolveAddress()` 按 scope 从 overload 参数里取出 owner id 与可选 family key，再生成稳定 `addressId`。[E: packages/durable/src/documents.ts:108] [E: packages/durable/src/documents.ts:132] [E: packages/durable/src/documents.ts:136]

### Records 与 `Tx` / `Session` / `Storage`

`ConversationRecord` 描述 transcript scope 的 identity、fork parent、owner task。[E: packages/durable/src/types.ts:154] `EntryRecord` 把 model-facing `Message[]` 与 application `data` 分开，并可带 `head` / `edits`（`ContextEdit` omit 或 replace）。[E: packages/durable/src/types.ts:185] [E: packages/durable/src/types.ts:191] [E: packages/durable/src/types.ts:197] `Message` 来自 `@earendil-works/pi-ai`。[E: packages/durable/src/types.ts:3]

`Tx` 是一次 `commit` callback 的事务面：table 读写、`createConversation` / `forkConversation` / `appendEntry` / `createTask`、`doc` / `retireDoc`。[E: packages/durable/src/types.ts:535] `Session` 对外只有 `commit`、`close`、`snapshot`、`snapshotAsOf`。[E: packages/durable/src/types.ts:607] `Storage` 是原子持久化边界：`commit(writes, context)` 返回 `Seq`，外加 `mintId<I extends Id<string>>()` / lookup / scan / close；Storage 信任 Session 提供语义正确的 records，Session 负责串行化 commits。[E: packages/durable/src/types.ts:665] [E: packages/durable/src/types.ts:669] [E: packages/durable/src/types.ts:672]

## 控制流

1. `createSession(storage)` 构造 `SessionKernel`，注入一份 `Storage`。[E: packages/durable/src/session/session.ts:37] [E: packages/durable/src/session/session.ts:56] `SessionKernel` 本身不从根 barrel 导出，公开工厂只有 `createSession`。[E: packages/durable/src/index.ts:3]
2. `commit(change, context)` 先 `#assertUsable()`，再 `#enqueue()` 到单一 `#tail` mutation line；同一时刻只有一个 commit 在跑。[E: packages/durable/src/session/session.ts:71] [E: packages/durable/src/session/session.ts:77] [E: packages/durable/src/session/session.ts:284]
3. `#runCommit()` 在持有 mutation line 时：`context.abortSignal?.throwIfAborted()`，然后 `new Transaction(host, context)` 执行 `change(tx)`。[E: packages/durable/src/session/session.ts:200] [E: packages/durable/src/session/session.ts:201] [E: packages/durable/src/session/session.ts:204]
4. `Tx.doc(token, …)` 用 token 的 `definition` 调 `resolveAddress()`，冷加载或创建 tracked `Draft`（Chord `track()`）。`retireDoc` 同样 `resolveAddress(definition, args)`。[E: packages/durable/src/session/transaction.ts:353] [E: packages/durable/src/session/transaction.ts:398] [E: packages/durable/src/session/session.ts:278]
5. callback 成功则 `tx.settleSuccess()` 得到 `StorageWrite[]`；空 batch 直接 `discard()` 返回。[E: packages/durable/src/session/session.ts:209] [E: packages/durable/src/session/session.ts:210]
6. 非空 batch 用 `withoutAbortSignal(context)` 调 `storage.commit()`：一旦 admitted，caller cancellation 不再打断 Storage settlement。[E: packages/durable/src/session/session.ts:217]
7. `StorageRejected` 表示 batch 在任何 durable effect 之前被拒，Session 可继续；其它 Storage 错误或 `tx.adopt(seq)` 失败会 `#poison`，之后必须 reopen。[E: packages/durable/src/errors.ts:10] [E: packages/durable/src/session/session.ts:221] [E: packages/durable/src/session/session.ts:229]
8. 成功后 `#publish()` 把 table writes 与 document changes 合成 `CommitPublication`，`queueMicrotask` 通知 `subscribeCommits` listeners；只有 committed state 可观察。[E: packages/durable/src/session/session.ts:232] [E: packages/durable/src/session/session.ts:256]
9. `snapshot(token, …, context)` 解析 address，命中 `#documents` cache 或 enqueue 一次 `#load()`；`snapshotAsOf()` 只接受 conversation document，并按 cutoff entry 的 `commitSeq` 读历史。[E: packages/durable/src/session/session.ts:108] [E: packages/durable/src/session/session.ts:142] [E: packages/durable/src/session/session.ts:143]
10. `close(context)` 用 `withoutAbortSignal` 清 tracker cache 并 `storage.close()`。[E: packages/durable/src/session/session.ts:174] [E: packages/durable/src/session/session.ts:177]

`Tx.forkConversation(parent, at, { ownership })` 经 `#stageConversation` 调 `prepareForkDocumentCopies()`，按 parent 可见 entry 与 fork policy 生成 definition-free `document.copy` writes。[E: packages/durable/src/session/transaction.ts:209] [E: packages/durable/src/session/transaction.ts:241] [E: packages/durable/src/session/forks.ts:26]

## 设计动机与权衡

根入口保持 runtime-neutral：浏览器 / 非 Node 环境可以只用 `createSession` + `MemoryStorage` + document tokens，不必拉 Node `fs` / `node:sqlite`。[E: packages/durable/README.md:11] [E: packages/durable/test/storage-runtime-boundary.test.ts:25] JSONL / SQLite 走显式 subpath，见 [subsys.durable.storage](storage.md)。

Document 值用 Chord `track()` / `Draft` / `Op` 做 checkpoint 与 delta，而不是另做一套 JSON diff。[E: packages/durable/src/session/session.ts:3] [E: packages/durable/src/session/session.ts:278] [E: packages/durable/src/types.ts:2] Session 方法全部带 Chord `Context`，把 cancellation 与 Chord 其余 runtime 对齐。[E: packages/durable/src/types.ts:1] [E: packages/durable/src/types.ts:609]

`EntryRecord.model` 直接用 `pi-ai` `Message`，所以 durable 在根 `build` 里排在 `ai` 之后。[E: packages/durable/src/types.ts:3] [E: package.json:16]

Erased `Id`/`Seq` 让 TypeScript 区分 conversation / entry / task / document 数字空间，运行时仍是 `number`，铸造集中在 `ids.ts` 与 Storage decode。[E: packages/durable/src/ids.ts:4] [E: packages/durable/src/types.ts:11]

## gotcha

- **不要**把 `@earendil-works/pi-durable` 写成 coding-agent 产品会话文件格式。`pi-coding-agent` 默认仍用 `SessionManager`（`CURRENT_SESSION_VERSION = 3`）JSONL。[E: packages/coding-agent/src/core/session-manager.ts:41]
- **不要**把它写成 `pi-agent-core` v4 `Session` / `SessionRepo` 的替代。`AgentHarness.create` 仍绑定 agent-core 自己的 `Session`；可选 SQLite backend 仍是 `@earendil-works/pi-session-backend-sqlite-node`。[E: packages/agent/src/harness/agent-harness.ts:519] [E: packages/session-backends/sqlite-node/package.json:2]
- `pi-agent-core` 的 `./experimental/pico3` 是另一条 experimental export，**不是**本包根 API。`packages/durable/docs/pico*` 是设计手稿，本节点不当 `[E]`。[I]
- `createSession()` 不播种 `ROOT_CONVERSATION_ID`。要有 ID `1` 的 root conversation，必须显式 `Storage.commit` 一条 conversation write。[E: packages/durable/src/session/session.ts:37] [E: packages/durable/src/testing/storage-conformance.ts:26]
- `createConversation` 与 `forkConversation` 都要 `ownership`；不要假设默认 ownerless。[E: packages/durable/src/session/transaction.ts:205]
- 任务创建后不能改 `conversationId`。[E: packages/durable/src/session/transaction.ts:320]
- table read 发生在第一次 table write 之后会抛 `ReadAfterWrite`。[E: packages/durable/src/errors.ts:2] [E: packages/durable/src/session/transaction.ts:836]
- `snapshotAsOf()` 在非 conversation scope 上抛 `TypeError`。[E: packages/durable/src/session/session.ts:142] [E: packages/durable/src/session/session.ts:143]
- poison 之后所有操作拒绝，错误信息要求 reopen。[E: packages/durable/src/session/session.ts:300]

## 跨包边界

- **依赖** [subsys.chord.runtime](../chord/runtime.md) 的 `Context`（`@earendil-works/chord`）与 [subsys.chord.delta](../chord/delta.md) 的 `track()` / `Draft` / `Op`。每个 Session 方法、以及除 `mintId` 外的每个 `Storage` 方法都带 Chord `Context`；`Storage.mintId()` 无 `Context`。document tracker 是 Chord delta tracker。[E: packages/durable/src/session/session.ts:1] [E: packages/durable/src/session/session.ts:3] [E: packages/durable/src/types.ts:669] [E: packages/durable/src/types.ts:672] [E: packages/durable/src/types.ts:675]
- **依赖** `pi-ai` 仅因 `EntryRecord.model` / `ContextEdit.messages` 使用 `Message`。[E: packages/durable/src/types.ts:3] [E: packages/durable/src/types.ts:180]
- **被依赖**：当前 `pi-agent-core` / `pi-coding-agent` 源码不 import 本包。CLI 主路径仍是 `AgentSession` + `SessionManager`。[I]
- **相邻**：持久化适配器见 [subsys.durable.storage](storage.md)。分层位置见 [spine.layered-architecture](../../spine/layered-architecture.md)。

## Sources

- package.json
- packages/durable/package.json
- packages/durable/README.md
- packages/durable/src/index.ts
- packages/durable/src/ids.ts
- packages/durable/src/types.ts
- packages/durable/src/documents.ts
- packages/durable/src/errors.ts
- packages/durable/src/session/session.ts
- packages/durable/src/session/transaction.ts
- packages/durable/src/session/forks.ts
- packages/durable/src/session/publications.ts
- packages/durable/src/storage/memory.ts
- packages/durable/src/testing/storage-conformance.ts
- packages/durable/test/storage-runtime-boundary.test.ts

## 相关

- [subsys.durable.storage](storage.md) - Memory / JSONL / SQLite backends 与 Node 子路径。
- [spine.layered-architecture](../../spine/layered-architecture.md) - durable 在 11 包分层中的位置。
- [spine.overview](../../spine/overview.md) - monorepo 主路径；durable 不在 CLI 默认装配里。
- [spine.session-state-model](../../spine/session-state-model.md) - agent-core v4 Session 与 coding-agent SessionManager。
- [subsys.chord.runtime](../chord/runtime.md) - Chord `Context`。
- [subsys.chord.delta](../chord/delta.md) - `track()` / `Draft` / `Op`。
- [subsys.agent-core.session-storage](../agent-core/session-storage.md) - 另一套 v4 `Session` / `Storage` / `SessionRepo`。
- [subsys.coding-agent.session-manager](../coding-agent/session-manager.md) - 产品 JSONL `SessionManager` v3。
- [subsys.session-backends.sqlite-node](../session-backends/sqlite-node.md) - agent-core `SessionRepo` 的 Node SQLite 实现。
- [ref.package-index](../../reference/package-index.md) - workspace / publish 清单。
