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
  - packages/durable/src/ids.ts
  - packages/durable/src/entries.ts
  - packages/durable/src/session/session.ts
  - packages/durable/src/session/transaction.ts
  - packages/durable/src/session/forks.ts
  - packages/durable/src/session/observation.ts
  - packages/durable/src/env/index.ts
  - packages/durable/src/env/node.ts
  - packages/durable/src/storage/memory.ts
  - packages/durable/src/testing/storage-conformance.ts
  - packages/durable/test/storage-runtime-boundary.test.ts
  - packages/coding-agent/src/core/session-manager.ts
symbols:
  - createSession
  - Session
  - SessionImpl
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
  - ExecutionEnv
  - NodeExecutionEnv
related:
  - subsys.durable.harness
  - subsys.durable.storage
  - spine.layered-architecture
  - spine.overview
  - spine.session-state-model
  - ref.package-index
  - subsys.chord.runtime
  - subsys.chord.delta
  - subsys.coding-agent.session-manager
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `@earendil-works/pi-durable` 的 Session kernel 是 runtime-neutral 的 durable conversation / task / document runtime：根入口导出 `createSession()`、`MemoryStorage`、`defineDoc()` / `defineDocFamily()` document tokens、`ROOT_CONVERSATION_ID`。它依赖 Chord `Context` / `Draft` / `track()` 与 `pi-ai` 的 `Message`。**不是** `pi-coding-agent` `SessionManager` JSONL 的替代。Harness / tasks / tools 在 [subsys.durable.harness](harness.md)。

## 能回答的问题

- `createSession(storage)` 返回什么，`Session.commit()` 怎样串行化 mutation line？
- document token（`defineDoc` / `defineDocFamily`）如何把 scope / family / rewindable 编进类型？
- `ROOT_CONVERSATION_ID` 为什么是 branded `1`，谁负责写入这条 conversation？
- `Id` / `Seq` 与 `idFromNumber` / `seqFromNumber` 只在哪些边界出现？
- `createConversation` 与 `forkConversation` 如何拆开，`ConversationOwnership` 怎样冻结 task 归属？
- Chord `Context` 在 `commit` / `snapshot` / Storage settlement 里分别管什么？
- `./env` 与 `./env/node` 提供什么？根 barrel 会不会拉进 Node `fs`？
- 为什么不能把本包当成 coding-agent session JSONL？

## 职责边界

npm 名是 `@earendil-works/pi-durable`，版本 `1.0.1`，description 是 “Durable conversation, task, and document runtime for Pi”。[E: packages/durable/package.json:2] [E: packages/durable/package.json:3] [E: packages/durable/package.json:4] README 把整包标为 **Experimental**。[E: packages/durable/README.md:3]

根 export `.` 指向 `src/index.ts`：`defineDoc` / `defineDocFamily`、`createSession`、`MemoryStorage`、`ROOT_CONVERSATION_ID`，以及 `ReadAfterWrite` / `StorageRejected`。[E: packages/durable/package.json:8] [E: packages/durable/src/index.ts:1] [E: packages/durable/src/index.ts:11] [E: packages/durable/src/index.ts:98] [E: packages/durable/src/index.ts:99] [E: packages/durable/src/index.ts:181] 根图故意不含 JSONL / SQLite / `env`：`index.ts` 的 value import 图不得进入 `src/env/` 或 `src/storage/jsonl/` / `src/storage/sqlite/`。[E: packages/durable/test/storage-runtime-boundary.test.ts:26] [E: packages/durable/test/storage-runtime-boundary.test.ts:28] [E: packages/durable/test/storage-runtime-boundary.test.ts:29] [E: packages/durable/test/storage-runtime-boundary.test.ts:30]

运行依赖是 `@earendil-works/chord`、`@earendil-works/pi-ai`、`diff`、`typebox`。[E: packages/durable/package.json:102] [E: packages/durable/package.json:103] [E: packages/durable/package.json:104] `pi-coding-agent` 的 `dependencies` 列出 `pi-agent-core` / `pi-ai`，**没有** `pi-durable`。[E: packages/coding-agent/package.json:51] [E: packages/coding-agent/package.json:52]

本节点覆盖 Session kernel（`createSession` / `SessionImpl`）、document tokens、record types、errors、`./env`。Harness / registry / 内置 tasks 在 [subsys.durable.harness](harness.md)。Memory / JSONL / SQLite backends 在 [subsys.durable.storage](storage.md)。

现行 `packages/durable/src/session/` 只有 `session.ts`、`transaction.ts`、`forks.ts`、`observation.ts`。**没有** `session/publications.ts`。[I]

## 关键文件

- `packages/durable/src/index.ts`：runtime-neutral 根 barrel。[E: packages/durable/src/index.ts:98]
- `packages/durable/src/types.ts`：`ROOT_CONVERSATION_ID`、`Session` / `Tx` / `Storage`、document tokens、conversation / entry / task / submission / document records。[E: packages/durable/src/types.ts:39] [E: packages/durable/src/types.ts:744] [E: packages/durable/src/types.ts:899] [E: packages/durable/src/types.ts:993]
- `packages/durable/src/documents.ts`：`defineDoc()` / `defineDocFamily()`、`resolveAddress()`、`materializeDocument()`。[E: packages/durable/src/documents.ts:54] [E: packages/durable/src/documents.ts:75] [E: packages/durable/src/documents.ts:109] [E: packages/durable/src/documents.ts:193]
- `packages/durable/src/errors.ts`：`ReadAfterWrite`、`StorageRejected`、`ConversationBusy`。[E: packages/durable/src/errors.ts:4] [E: packages/durable/src/errors.ts:12] [E: packages/durable/src/errors.ts:20]
- `packages/durable/src/ids.ts`：`idFromNumber()` / `seqFromNumber()` 在信任边界打 brand。[E: packages/durable/src/ids.ts:4] [E: packages/durable/src/ids.ts:9]
- `packages/durable/src/entries.ts`：`defineEntry()` 与内置 `pi.user` / `pi.assistant` / `pi.system` / `pi.tool-result` / `pi.reset` / `pi.compaction`。[E: packages/durable/src/entries.ts:6] [E: packages/durable/src/entries.ts:15]
- `packages/durable/src/session/session.ts`：`createSession()` → `SessionImpl`。[E: packages/durable/src/session/session.ts:49] [E: packages/durable/src/session/session.ts:59]
- `packages/durable/src/session/transaction.ts`：`Transaction` 实现 `Tx`；table read 必须发生在第一次 table write 之前。[E: packages/durable/src/session/transaction.ts:192] [E: packages/durable/src/session/transaction.ts:922]
- `packages/durable/src/session/forks.ts`：`prepareForkDocumentCopies()`。[E: packages/durable/src/session/forks.ts:26]
- `packages/durable/src/session/observation.ts`：`CommittedStateSource` / `CommittedWatch`，把 committed document 接到 Chord replicated state。[E: packages/durable/src/session/observation.ts:24] [E: packages/durable/src/session/observation.ts:155]
- `packages/durable/src/env/index.ts` / `env/node.ts`：portable `ExecutionEnv` 与 `NodeExecutionEnv`。[E: packages/durable/src/env/index.ts:174] [E: packages/durable/src/env/node.ts:437]

## 数据模型

### `Id` / `Seq`（erased brands）

`Id<Kind, Type = unknown>` 是 `number` 与 unique `idBrand` 的交叉；`Kind` 区分 record 族，`Type` 给 `TaskId<Result>` 挂结果类型。[E: packages/durable/src/types.ts:8] [E: packages/durable/src/types.ts:11] 别名：`ConversationId`、`EntryId`、`TaskId<R>`、`SubmissionId`、`DocumentId`。[E: packages/durable/src/types.ts:18] [E: packages/durable/src/types.ts:19] [E: packages/durable/src/types.ts:20] [E: packages/durable/src/types.ts:21] [E: packages/durable/src/types.ts:22]

`Seq` 是另一套 unique `seqBrand`：一次原子 Storage commit 的严格递增序号，允许 gap。[E: packages/durable/src/types.ts:24] [E: packages/durable/src/types.ts:27]

`idFromNumber<I extends Id<string>>(value)` / `seqFromNumber(value)` 是 `value as I` / `value as Seq` 的单点铸造，注释要求只在 trusted allocation 或 decoding 边界使用。[E: packages/durable/src/ids.ts:4] [E: packages/durable/src/ids.ts:5] [E: packages/durable/src/ids.ts:9] [E: packages/durable/src/ids.ts:10] Session 侧例子：`snapshotAsOf` 把 overload 里的 entry 数字铸成 `EntryId`。[E: packages/durable/src/session/session.ts:150] Storage 侧 `mintId` 返回 `idFromNumber<I>(this.nextId++)`；commit 用 `seqFromNumber`。[E: packages/durable/src/storage/memory.ts:400] [E: packages/durable/src/storage/memory.ts:244] [E: packages/durable/src/storage/sqlite/storage.ts:221] [E: packages/durable/src/storage/sqlite/storage.ts:204]

### `ROOT_CONVERSATION_ID`

根 conversation 的保留 ID 是常量 `1`。[E: packages/durable/src/types.ts:39] `MemoryStorage` 的 `nextId` 从 `2` 起；SQLite 初始 metadata 也是 `next_id = '2'`。[E: packages/durable/src/storage/memory.ts:241] conformance 第一条断言 `mintId()` 返回 `2`，再由调用方 `commit` 一条 `{ id: ROOT_CONVERSATION_ID }` 的 conversation write。[E: packages/durable/src/testing/storage-conformance.ts:28] [E: packages/durable/src/testing/storage-conformance.ts:95] [E: packages/durable/src/testing/storage-conformance.ts:96]

`createSession()` **不会**自动插入这条 root conversation。[E: packages/durable/src/session/session.ts:49] `Tx.createConversation()` 走 `storage.mintId()`，因此新 conversation 从 `2` 起编号。[E: packages/durable/src/session/transaction.ts:280] [E: packages/durable/src/session/transaction.ts:305] 保留 ID `1` 的内部路径是 `Transaction.createRootConversation()`，由 Harness `root()` 调用，不是公开 `Tx` 方法。[E: packages/durable/src/session/transaction.ts:285] [E: packages/durable/src/session/transaction.ts:286]

### Document tokens

`defineDoc()` / `defineDocFamily()` 校验 `version` 为正整数后返回 `{ definition }` token，调用方把 token 显式传给 `Tx.doc()` / `Session.snapshot()`。[E: packages/durable/src/documents.ts:54] [E: packages/durable/src/documents.ts:95] [E: packages/durable/src/documents.ts:96] [E: packages/durable/src/types.ts:93]

| token 族 | scope | 额外语义 |
|---|---|---|
| `SessionDocToken` / `SessionDocFamilyToken` | `"session"` | 无 history / fork |
| `ConversationDocToken` / family | `"conversation"` | `history: "latest"` 或 `"rewindable"` |
| `RewindableConversationDocToken` / family | `"conversation"` | `history: "rewindable"`，才允许 `snapshotAsOf()` |
| `TaskDocToken` / `TaskDocFamilyToken` | `"task"` | 无 history / fork |

`LatestConversationSemantics` 是 `history: "latest"` + `fork: "current" | "initial"`；`RewindableConversationSemantics` 是 `history: "rewindable"` + `fork: "asOf" | "current" | "initial"`。[E: packages/durable/src/types.ts:42] [E: packages/durable/src/types.ts:49] family 定义带 `family: true`，`initial(seed)` 只在成员缺失时运行。[E: packages/durable/src/types.ts:84] [E: packages/durable/src/types.ts:87] [E: packages/durable/src/session/transaction.ts:607]

`resolveAddress()` 按 scope 从 overload 参数里取出 owner id 与可选 family key，再生成稳定 `addressId`。[E: packages/durable/src/documents.ts:109] [E: packages/durable/src/documents.ts:137]

### Records 与 `Tx` / `Session` / `Storage`

`ConversationRecord` 描述 transcript scope 的 identity、fork parent、owner task。[E: packages/durable/src/types.ts:286] `EntryRecord` 把 model-facing `Message[]` 与 application `data` 分开，并可带 `head` / `edits`（`ContextEdit` omit 或 replace）。[E: packages/durable/src/types.ts:317] [E: packages/durable/src/types.ts:301] `Message` 来自 `@earendil-works/pi-ai`。[E: packages/durable/src/types.ts:3]

`Tx` 是一次 `commit` callback 的事务面：table 读写、`createConversation` / `forkConversation` / `appendEntry` / `createTask`、`doc` / `retireDoc`。[E: packages/durable/src/types.ts:744] `Session` 对外是 `commit`、`close`、`subscribeCommits` / `subscribeClose`、`snapshot` / `snapshotAsOf`、`documentState`，并扩展 `DocumentObserver`（`watchDoc`）。[E: packages/durable/src/types.ts:899] [E: packages/durable/src/types.ts:938] [E: packages/durable/src/types.ts:867] [E: packages/durable/src/types.ts:868] `Storage` 是原子持久化边界：`commit(writes, context)` 返回 `Seq`，外加 mint / lookup / scan / close；Storage 信任 Session 提供语义正确的 records，Session 负责串行化 commits。[E: packages/durable/src/types.ts:993] [E: packages/durable/src/types.ts:997]

`CommitPublication` 是一次成功 commit 的 `{ seq, changes }`；listeners 在 adoption 之后同步收到，必须不 throw、不阻塞、不调 Session API。[E: packages/durable/src/types.ts:735] [E: packages/durable/src/types.ts:905] [E: packages/durable/src/session/session.ts:465]

### Typed entries

`defineEntry(kind)` 返回带 `is()` guard 的 `Entry` token。[E: packages/durable/src/entries.ts:6] 根 barrel 再导出 `UserEntry`（`pi.user`）、`AssistantEntry`、`SystemEntry`、`ToolResultEntry`、`ResetEntry`、`CompactionEntry`。[E: packages/durable/src/entries.ts:15] [E: packages/durable/src/index.ts:3] 谁写入这些 kind 属于 [subsys.durable.harness](harness.md)。

## 控制流

1. `createSession(storage)` 构造 `SessionImpl`，注入一份 `Storage`。[E: packages/durable/src/session/session.ts:49] [E: packages/durable/src/session/session.ts:69] `SessionImpl` 本身不从根 barrel 导出，公开工厂只有 `createSession`。[E: packages/durable/src/index.ts:98]
2. `commit(change, context)` 先 `#assertUsable()`，再 `#enqueue()` 到单一 `#tail` mutation line；同一时刻只有一个 commit 在跑。[E: packages/durable/src/session/session.ts:85] [E: packages/durable/src/session/session.ts:94] [E: packages/durable/src/session/session.ts:530]
3. `#runCommit()` 在持有 mutation line 时：`context.abortSignal?.throwIfAborted()`，然后 `new Transaction(host, context, scope)` 执行 `change(tx)`。[E: packages/durable/src/session/session.ts:410] [E: packages/durable/src/session/session.ts:411]
4. `Tx.doc(token, …)` 用 token 的 `definition` 调 `resolveAddress()`，冷加载或创建 tracked `Draft`（Chord `track()`）。[E: packages/durable/src/session/transaction.ts:509] [E: packages/durable/src/session/transaction.ts:513] [E: packages/durable/src/session/session.ts:523]
5. callback 成功则 `tx.settleSuccess()` 得到 `StorageWrite[]`；空 batch 直接 `discard()` 返回。[E: packages/durable/src/session/session.ts:419] [E: packages/durable/src/session/session.ts:420]
6. 非空 batch 用 `withoutAbortSignal(context)` 调 `storage.commit()`：一旦 admitted，caller cancellation 不再打断 Storage settlement。[E: packages/durable/src/session/session.ts:427]
7. `StorageRejected` 表示 batch 在任何 durable effect 之前被拒，Session 可继续；其它 Storage 错误或 `tx.adopt(seq)` 失败会 `#poison`，之后必须 reopen。[E: packages/durable/src/errors.ts:12] [E: packages/durable/src/session/session.ts:431] [E: packages/durable/src/session/session.ts:436] [E: packages/durable/src/session/session.ts:544]
8. 成功后 `#publish()` 把 table writes 与 document changes 合成 `CommitPublication`，**同步**通知 `subscribeCommits` listeners（不是 `queueMicrotask`）；只有 committed state 可观察。[E: packages/durable/src/session/session.ts:442] [E: packages/durable/src/session/session.ts:465] [E: packages/durable/src/session/session.ts:384]
9. `snapshot(token, …, context)` 解析 address，命中 `#documents` cache 或 enqueue 一次 `#loadDocument()`；`snapshotAsOf()` 只接受 conversation document，并按 cutoff entry 的 `commitSeq` 读历史。[E: packages/durable/src/session/session.ts:162] [E: packages/durable/src/session/session.ts:316] [E: packages/durable/src/session/session.ts:320]
10. `close(context)` 用 `withoutAbortSignal` 清 tracker cache 并 `storage.close()`。[E: packages/durable/src/session/session.ts:350] [E: packages/durable/src/session/session.ts:352]

`Tx.forkConversation(parent, at)` 会调 `prepareForkDocumentCopies()`，按 parent 可见 entry 与 fork policy 生成 definition-free `document.copy` writes。[E: packages/durable/src/session/transaction.ts:289] [E: packages/durable/src/session/transaction.ts:322] [E: packages/durable/src/session/forks.ts:26]

`SessionImpl.conversationCreated()` 默认 no-op；Harness 覆盖它来种 `pi.*` documents。[E: packages/durable/src/session/session.ts:374]

## `./env`

subpath `./env` 是 portable filesystem + shell capability，**不**在根 barrel。[E: packages/durable/package.json:15] [E: packages/durable/test/storage-runtime-boundary.test.ts:28] portable `env/index.ts` 不得 import `env/node.ts`。[E: packages/durable/test/storage-runtime-boundary.test.ts:38] [E: packages/durable/test/storage-runtime-boundary.test.ts:40]

`ExecutionEnv` 等于 `FileSystem` + `Shell`。[E: packages/durable/src/env/index.ts:174] 操作返回 `Result<T, FileError | ExecutionError>`，不 throw 预期失败。[E: packages/durable/src/env/index.ts:4] [E: packages/durable/src/env/index.ts:96] `FileSystem.id` 标识文件命名空间：每个本地 Node 环境共用一个 id。[E: packages/durable/src/env/index.ts:101]

`NodeExecutionEnv` 实现该接口，`id = "node:local"`，走 subpath `./env/node`。[E: packages/durable/src/env/node.ts:437] [E: packages/durable/src/env/node.ts:439] [E: packages/durable/package.json:21] JSONL Node adapter 用它当 `FileSystem`；Harness 的 `CodingTools` 经 `HarnessOptions.env` 拿到同一接口，细节在 [subsys.durable.harness](harness.md)。

## 设计动机与权衡

根入口保持 runtime-neutral：浏览器 / 非 Node 环境可以只用 `createSession` + `MemoryStorage` + document tokens，不必拉 Node `fs` / `node:sqlite`。[E: packages/durable/test/storage-runtime-boundary.test.ts:26] JSONL / SQLite 走显式 subpath，见 [subsys.durable.storage](storage.md)。

Document 值用 Chord `track()` / `Draft` / `Op` 做 checkpoint 与 delta，而不是另做一套 JSON diff。[E: packages/durable/src/session/session.ts:3] [E: packages/durable/src/session/session.ts:523] [E: packages/durable/src/types.ts:2] `commit` / `snapshot` / `close` / `documentState` 带 Chord `Context`；`subscribeClose` 没有 `Context` 参数，`subscribeCommits` 的 listener 才收到 `Context`。[E: packages/durable/src/types.ts:1] [E: packages/durable/src/types.ts:901] [E: packages/durable/src/types.ts:903] [E: packages/durable/src/types.ts:909] [E: packages/durable/src/types.ts:940] [E: packages/durable/src/types.ts:905] [E: packages/durable/src/types.ts:907]

`EntryRecord.model` 直接用 `pi-ai` `Message`，所以 durable 在根 `build` 里排在 `ai` 之后、`agent` 之前。[E: packages/durable/src/types.ts:3] [E: package.json:15]

`observation.ts` 把 committed document 接到 Chord `ReplicatedStateSource`：retirement 发 `[["r", null]]`。[E: packages/durable/src/session/observation.ts:18] [E: packages/durable/src/session/observation.ts:24]

Erased `Id`/`Seq` 让 TypeScript 区分 conversation / entry / task / document 数字空间，运行时仍是 `number`，铸造集中在 `ids.ts` 与 Storage decode。[E: packages/durable/src/ids.ts:4] [E: packages/durable/src/types.ts:11]

## gotcha

- **不要**把 `@earendil-works/pi-durable` 写成 coding-agent 产品会话文件格式。`pi-coding-agent` 默认仍用 `SessionManager`（`CURRENT_SESSION_VERSION = 3`）JSONL。[E: packages/coding-agent/src/core/session-manager.ts:41]
- **不要**再 cite `packages/agent/src/harness/**` 或已删除的 `packages/session-backends/**`。可复用 harness 在 [subsys.durable.harness](harness.md)。
- `packages/durable/docs/pico*` 是设计手稿，本节点不当 `[E]`。[I]
- `createSession()` 不播种 `ROOT_CONVERSATION_ID`。要有 ID `1` 的 root conversation，必须显式 `Storage.commit` 一条 conversation write，或走 Harness `root()`。[E: packages/durable/src/session/session.ts:49] [E: packages/durable/src/testing/storage-conformance.ts:28]
- table read 发生在第一次 table write 之后会抛 `ReadAfterWrite`。[E: packages/durable/src/errors.ts:4] [E: packages/durable/src/session/transaction.ts:922]
- `snapshotAsOf()` 在非 conversation scope 上抛 `TypeError`。[E: packages/durable/src/session/session.ts:320] [E: packages/durable/src/session/session.ts:321]
- poison 之后所有操作拒绝，错误信息要求 reopen。[E: packages/durable/src/session/session.ts:545]
- `ConversationBusy` 定义在 `errors.ts`，但是 submission 准入错误；语义在 [subsys.durable.harness](harness.md)。[E: packages/durable/src/errors.ts:20]

## 跨包边界

- **依赖** [subsys.chord.runtime](../chord/runtime.md) 的 `Context`（`@earendil-works/chord`）与 [subsys.chord.delta](../chord/delta.md) 的 `track()` / `Draft` / `Op`。`commit` / `snapshot` / `close` / 每个 `Storage` 方法都带 `Context`；document tracker 是 Chord delta tracker。[E: packages/durable/src/session/session.ts:1] [E: packages/durable/src/session/session.ts:3]
- **依赖** `pi-ai` 仅因 `EntryRecord.model` / `ContextEdit.messages` 使用 `Message`。[E: packages/durable/src/types.ts:3] [E: packages/durable/src/types.ts:312]
- **被依赖**：`pi-coding-agent` published `dependencies` 不含 `pi-durable`；CLI 主路径仍是 `AgentSession` + `SessionManager`。[E: packages/coding-agent/package.json:51]
- **相邻**：Harness 在 [subsys.durable.harness](harness.md)（`HarnessImpl` 继承 `SessionImpl`）。持久化适配器在 [subsys.durable.storage](storage.md)。分层位置见 [spine.layered-architecture](../../spine/layered-architecture.md)。

## Sources

- package.json
- packages/durable/package.json
- packages/durable/README.md
- packages/durable/src/index.ts
- packages/durable/src/ids.ts
- packages/durable/src/types.ts
- packages/durable/src/documents.ts
- packages/durable/src/errors.ts
- packages/durable/src/ids.ts
- packages/durable/src/entries.ts
- packages/durable/src/session/session.ts
- packages/durable/src/session/transaction.ts
- packages/durable/src/session/forks.ts
- packages/durable/src/session/observation.ts
- packages/durable/src/env/index.ts
- packages/durable/src/env/node.ts
- packages/durable/src/storage/memory.ts
- packages/durable/src/testing/storage-conformance.ts
- packages/durable/test/storage-runtime-boundary.test.ts
- packages/coding-agent/src/core/session-manager.ts

## 相关

- [subsys.durable.harness](harness.md) - `Harness` / tasks / tools / compaction；本节点不展开。
- [subsys.durable.storage](storage.md) - Memory / JSONL / SQLite backends 与 Node 子路径。
- [spine.layered-architecture](../../spine/layered-architecture.md) - durable 在分层中的位置；1.0 可复用 harness 在 `pi-durable`。
- [spine.overview](../../spine/overview.md) - monorepo 主路径；durable 不在 CLI 默认装配里。
- [spine.session-state-model](../../spine/session-state-model.md) - coding-agent `SessionManager` 产品会话。
- [subsys.chord.runtime](../chord/runtime.md) - Chord `Context`。
- [subsys.chord.delta](../chord/delta.md) - `track()` / `Draft` / `Op`。
- [subsys.coding-agent.session-manager](../coding-agent/session-manager.md) - 产品 JSONL `SessionManager` v3。
- [ref.package-index](../../reference/package-index.md) - workspace / publish 清单。
