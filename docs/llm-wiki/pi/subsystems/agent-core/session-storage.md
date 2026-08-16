---
id: subsys.agent-core.session-storage
title: v4 会话契约(Session/SessionStorage/SessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/state.ts
  - packages/agent/src/harness/session/index.ts
  - packages/agent/src/index.ts
symbols:
  - Session
  - SessionStorage
  - SessionRepo
  - SessionTree
  - SessionState
  - LaneRecord
  - LogItem
  - ForkOptions
  - SessionError
related:
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
  - subsys.agent-core.session-tree
  - subsys.agent-core.tree-navigation
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.session-storage` 描述 v4 harness session 三层契约：`SessionRepo` 管会话集合与打开/fork，`SessionStorage` 是单会话持久化原语（lane / entry / record / fact / log），`Session` 实现 `SessionTree` 并把 storage-assigned 的 `seq` / `parentId` / `timestamp` 暴露给调用方。

## 能回答的问题

- `SessionRepo`、`SessionStorage`、`Session`、`SessionTree` 各自拥有哪一段生命周期？
- lane、entry、record、fact 四种 mutation 如何共享同一个 `seq`？
- `ProvisionedEntry` / `NewRecord` 与 storage-assigned 字段的边界是什么？
- fork 的 `scope: "branch"` 与 `scope: "tree"` 各复制什么？
- 公开包导出从哪里露出这些符号？

## 职责边界

`SessionRepo<TMetadata, TCreateOptions, TListOptions>` 只负责会话集合：`create` / `open` / `list` / `delete` / `fork`。`create` / `open` / `fork` 返回 `Session<TMetadata>`，`list` 只读 metadata，不打开会话、不获取 writer claim。[E: packages/agent/src/harness/session/types.ts:361] [E: packages/agent/src/harness/session/types.ts:366] [E: packages/agent/src/harness/session/types.ts:368] [E: packages/agent/src/harness/session/types.ts:370] [E: packages/agent/src/harness/session/types.ts:371] [E: packages/agent/src/harness/session/types.ts:372]

`SessionStorage<TMetadata>` 是**一个已打开会话**的 backend contract：lane 指针、append entry/record、按 query 读 entry/record、`findOpenOperations`、全局 fact（name/label）、stats、以及跨 mutation 的 `getLog()`。[E: packages/agent/src/harness/session/types.ts:290] [E: packages/agent/src/harness/session/types.ts:294] [E: packages/agent/src/harness/session/types.ts:299] [E: packages/agent/src/harness/session/types.ts:300] [E: packages/agent/src/harness/session/types.ts:317] [E: packages/agent/src/harness/session/types.ts:318] [E: packages/agent/src/harness/session/types.ts:321]

`SessionTree` 是面向调用方的单 lane 视图：默认从该 view 的 leaf 向 root 走 branch query，公开 `appendMessage` / `appendCustomEntry`，并把 name/label 标成 “set, not append”。[E: packages/agent/src/harness/session/types.ts:328] [E: packages/agent/src/harness/session/types.ts:335] [E: packages/agent/src/harness/session/types.ts:341] [E: packages/agent/src/harness/session/types.ts:345] [E: packages/agent/src/harness/session/types.ts:350] [E: packages/agent/src/harness/session/types.ts:351]

`Session` 实现 `SessionTree`，持有一个 `SessionStorage` 和一个 `IdGenerator`（默认 `uuidv7()`）。它把 `"main"` 当作自身，其它 lane 通过 `view(lane)` 返回只实现 `SessionTree` 的 facade。[E: packages/agent/src/harness/session/session.ts:102] [E: packages/agent/src/harness/session/session.ts:106] [E: packages/agent/src/harness/session/session.ts:108] [E: packages/agent/src/harness/session/session.ts:115] [E: packages/agent/src/harness/session/session.ts:116]

`SessionState` 是内存与 JSONL backend 共用的 mutation 引擎：强制 `seq` 连续、id 不重复、entry 接到 lane leaf、并投影 lanes / open operations / stats / log。它不是 `session/index.ts` 的公开导出。[E: packages/agent/src/harness/session/state.ts:50] [E: packages/agent/src/harness/session/state.ts:97] [E: packages/agent/src/harness/session/state.ts:104] [E: packages/agent/src/harness/session/index.ts:1]

`packages/agent/src/index.ts` 通过 `export * from "./harness/session/index.ts"` 再导出 session 公共面：`Session`、`SessionRepo`、`SessionStorage`、全部 `types.ts` 符号、`InMemorySessionRepo`、`JsonlSessionRepo`、以及 `context.ts` 的 context builder。[E: packages/agent/src/index.ts:80] [E: packages/agent/src/harness/session/index.ts:10] [E: packages/agent/src/harness/session/index.ts:11] [E: packages/agent/src/harness/session/index.ts:12] [E: packages/agent/src/harness/session/index.ts:13]

## 关键文件

- `packages/agent/src/harness/session/types.ts`：v4 契约与 `Entry` / `LaneRecord` / `SessionError` 类型。[E: packages/agent/src/harness/session/types.ts:67] [E: packages/agent/src/harness/session/types.ts:203] [E: packages/agent/src/harness/session/types.ts:290]
- `packages/agent/src/harness/session/session.ts`：`Session` facade、`view()`、JSON 可序列化校验、query 参数校验。[E: packages/agent/src/harness/session/session.ts:42] [E: packages/agent/src/harness/session/session.ts:102]
- `packages/agent/src/harness/session/state.ts`：`SessionMutation` 与 `SessionState.applyMutation()`。[E: packages/agent/src/harness/session/state.ts:17] [E: packages/agent/src/harness/session/state.ts:97]
- `packages/agent/src/harness/session/index.ts`：包内再导出面；不导出 `SessionState` / `JsonlSessionStorage` / codec。[E: packages/agent/src/harness/session/index.ts:1]

## 数据模型

### 共享序号与 storage-assigned 字段

`EntryBase` 的 `seq` 是跨 entry/record/lane/fact 的共享序号；`parentId` 由 storage 写成“当前 lane leaf”；`timestamp` 是 Unix 毫秒。三者都是 read-side / storage-assigned，调用方提交 `ProvisionedEntry` 时必须省略它们。[E: packages/agent/src/harness/session/types.ts:17] [E: packages/agent/src/harness/session/types.ts:18] [E: packages/agent/src/harness/session/types.ts:19] [E: packages/agent/src/harness/session/types.ts:76]

`RecordBase` 同样有 `id` / `seq` / `lane` / `timestamp`。`NewRecord` 省略 `seq` 与 `timestamp`，但调用方必须自带 `id` 与 `lane`。[E: packages/agent/src/harness/session/types.ts:80] [E: packages/agent/src/harness/session/types.ts:213]

`SessionState` 从 `sequence = 0` 起步，下一次 mutation 必须是 `sequence + 1`；空会话默认只有 `main` lane，leaf 为 `null`。[E: packages/agent/src/harness/session/state.ts:51] [E: packages/agent/src/harness/session/state.ts:58] [E: packages/agent/src/harness/session/state.ts:69] [E: packages/agent/src/harness/session/state.ts:104]

### Lane

`LanePointer` 是 `{ lane, leafId }`。`SessionStorage` 用 `createLane(lane, at)` 新建、`moveLane(lane, to)` 改写 leaf，两者都是独立 mutation，不追加 tree entry。[E: packages/agent/src/harness/session/types.ts:273] [E: packages/agent/src/harness/session/types.ts:295] [E: packages/agent/src/harness/session/types.ts:296] [E: packages/agent/src/harness/session/state.ts:151]

append entry 时，storage 把 `parentId` 设成该 lane 当前 leaf，并把 lane leaf 推进到新 entry id。record 引用已有 lane，但不移动 leaf。[E: packages/agent/src/harness/session/state.ts:112] [E: packages/agent/src/harness/session/state.ts:121] [E: packages/agent/src/harness/session/state.ts:127]

### Entry 与 Record

`Entry` 是 7 元 union：`message` / `model_change` / `thinking_level_change` / `active_tools_change` / `compaction` / `branch_summary` / `custom`。字段级 catalog 在 [ref.agent.session-entry-types](../../reference/session-entry-types.md)。[E: packages/agent/src/harness/session/types.ts:67]

`LaneRecord` 是 9 元 union：`operation_started` / `abort_requested` / `operation_finished` / `step_attempt` / `tool_started` / `queue_enqueued` / `queue_cancelled` / `write_deferred` / `usage`。它们是 lane 上的操作日志，不是 tree 节点。[E: packages/agent/src/harness/session/types.ts:203]

`operation_started.intent` 有三种 kind：`run`（带 `originalPrompt` / `initialMessages`）、`compaction`、`navigation`。[E: packages/agent/src/harness/session/types.ts:90] [E: packages/agent/src/harness/session/types.ts:100] [E: packages/agent/src/harness/session/types.ts:106]

`findOpenOperations(lane, { limit })` 返回尚未配对 `operation_finished` 的 `operation_started`，newest first。契约注释规定 recovery 用 `limit: 2`：0 = idle，1 = suspended，2 = 至少两个 open（视为 corruption）。[E: packages/agent/src/harness/session/types.ts:317] [E: packages/agent/src/harness/session/state.ts:132] [E: packages/agent/src/harness/session/state.ts:139] [E: packages/agent/src/harness/session/state.ts:229]

### Fact 与 Log

name 与 label 是全局 fact，latest wins，不按 branch 作用域。`setName` / `setLabel` 各写一条 `seq` mutation；label 的 `undefined` 会从 map 删除。[E: packages/agent/src/harness/session/types.ts:335] [E: packages/agent/src/harness/session/state.ts:159] [E: packages/agent/src/harness/session/state.ts:168]

`LogItem` 把四种 mutation 展平为同一条时间线：`entry` / `record` / `lane` / `fact`（`name` 或 `label`）。`getLog({ afterSeq, limit })` 按 seq 升序切片。[E: packages/agent/src/harness/session/types.ts:278] [E: packages/agent/src/harness/session/types.ts:318] [E: packages/agent/src/harness/session/state.ts:236]

### Metadata、Stats、Fork

通用 `SessionMetadata` 只有 `id`、`createdAt`、可选 `parentSessionId`。[E: packages/agent/src/harness/session/types.ts:259]

`SessionStats` 含 `messageCount`、`cachedTokens`、`uncachedTokens`、`totalTokens`、`costTotal`。`messageCount` 在 message entry 上 +1；token/cost 只从 `usage` record 累加，不读 `AgentMessage.usage`。[E: packages/agent/src/harness/session/types.ts:265] [E: packages/agent/src/harness/session/state.ts:123] [E: packages/agent/src/harness/session/state.ts:143]

`ForkOptions` 是 `{ scope?: "branch"; entryId?; position?: "before" | "at" } | { scope: "tree" }`。[E: packages/agent/src/harness/session/types.ts:359]

`SessionState.createForkMutations()`：

- `scope === "tree"`：按 oldestFirst 复制全部 entry，并复制全部 lane 指针。[E: packages/agent/src/harness/session/state.ts:263]
- 默认 branch：`entryId` 缺省取 `main` leaf；目标必须是 `message` entry，否则 `invalid_fork_target`。未给 `entryId` 时默认 `position: "at"`，给了 `entryId` 时默认 `"before"`。[E: packages/agent/src/harness/session/state.ts:267] [E: packages/agent/src/harness/session/state.ts:271] [E: packages/agent/src/harness/session/state.ts:274]
- 复制后的 entry 保留原 id，但 `seq` 从 1 重排；随后写 lane fact；name 与“被复制 entry 上的 label”一并复制。record 不进入 fork。[E: packages/agent/src/harness/session/state.ts:283] [E: packages/agent/src/harness/session/state.ts:286] [E: packages/agent/src/harness/session/state.ts:289]

### 错误

`SessionErrorCode` 为 `not_found` / `already_exists` / `invalid_entry` / `invalid_payload` / `invalid_lane` / `invalid_query` / `invalid_fork_target` / `storage`。`SessionError` 把 code 放在 `readonly code`。[E: packages/agent/src/harness/session/types.ts:375] [E: packages/agent/src/harness/session/types.ts:385] [E: packages/agent/src/harness/session/types.ts:391]

## 控制流

1. `Session.commitEntry@packages/agent/src/harness/session/session.ts:286` 先 `assertJsonSerializable(entry)`，再 `storage.appendEntry(entry, lane)`。[E: packages/agent/src/harness/session/session.ts:287] [E: packages/agent/src/harness/session/session.ts:288]
2. `Session.commitRecord@packages/agent/src/harness/session/session.ts:291` 同样先校验 JSON，再 `storage.appendRecord(record)`。[E: packages/agent/src/harness/session/session.ts:294] [E: packages/agent/src/harness/session/session.ts:295]
3. `Session.appendMessage@packages/agent/src/harness/session/session.ts:178` / `appendCustomEntry` 用 `idGenerator.next()` 补 id，再委托对应 lane（默认 `"main"`）。[E: packages/agent/src/harness/session/session.ts:179] [E: packages/agent/src/harness/session/session.ts:272] [E: packages/agent/src/harness/session/session.ts:277]
4. `SessionState.applyMutation@packages/agent/src/harness/session/state.ts:97` 校验连续 `seq`，再按 kind 更新 entries/records/lanes/facts 与 log。[E: packages/agent/src/harness/session/state.ts:104] [E: packages/agent/src/harness/session/state.ts:106]
5. `Session.queryRecords@packages/agent/src/harness/session/session.ts:256` 拒绝非正 `limit`、负 `afterSeq`，并要求 `operationKind` 必须搭配 `type: "operation_started"`。[E: packages/agent/src/harness/session/session.ts:257] [E: packages/agent/src/harness/session/session.ts:259]
6. `Session.getLeafIdForLane@packages/agent/src/harness/session/session.ts:227` 在 lanes 列表中查找；缺失 lane 抛 `invalid_lane`。[E: packages/agent/src/harness/session/session.ts:228] [E: packages/agent/src/harness/session/session.ts:229]
7. `Session.view@packages/agent/src/harness/session/session.ts:115`：`lane === "main"` 返回 `this`（因此仍能调用 `appendEntry` / `appendRecord`）；其它 lane 只暴露 `SessionTree` 方法，branch/append 绑到该 lane。[E: packages/agent/src/harness/session/session.ts:116] [E: packages/agent/src/harness/session/session.ts:127] [E: packages/agent/src/harness/session/session.ts:129]

## 设计动机与权衡

collection lifetime（`SessionRepo`）与单会话 persistence（`SessionStorage`）分开，使 JSONL / 内存 backend 可以共享同一套 `Session` 与 `SessionState` 语义，同时让 list 不必打开会话。[E: packages/agent/src/harness/session/types.ts:361] [E: packages/agent/src/harness/session/types.ts:290] [I]

tree write 用 entry，操作恢复用 record，导航用 lane mutation，会话名/书签用 fact。四者共享 `seq`，所以 `getLog()` 能给出一条可重放时间线，而不把 `operation_started` 伪装成 tree node。[E: packages/agent/src/harness/session/types.ts:278] [E: packages/agent/src/harness/session/state.ts:122] [I]

`parentId` / `seq` / `timestamp` 由 storage 赋值，避免调用方与 backend 对 leaf 的看法不一致；`Session` 在写入前只做 JSON 可序列化与 query 形状校验。[E: packages/agent/src/harness/session/types.ts:17] [E: packages/agent/src/harness/session/session.ts:287] [I]

## Gotcha

- `findEntries()` 是会话范围内、按 `seq` 的查询；`findEntriesOnBranch()` 才沿 `parentId` 走向 root。storage 层的 branch API **强制** `start`；缺省 start 是 `Session` / `view` 的糖。[E: packages/agent/src/harness/session/types.ts:306] [E: packages/agent/src/harness/session/types.ts:341] [E: packages/agent/src/harness/session/types.ts:345] [E: packages/agent/src/harness/session/session.ts:250]
- `view(lane).findEntries()` 仍走会话级 `queryEntries()`，不会按 lane 过滤；只有 `findEntriesOnBranch` / `appendMessage` / `appendCustomEntry` / `getLeafId` 绑定 lane。[E: packages/agent/src/harness/session/session.ts:125] [E: packages/agent/src/harness/session/session.ts:127] [E: packages/agent/src/harness/session/session.ts:233]
- 同一 id 不能同时用于 entry 与 record；`usedIds` 是跨 kind 的集合。[E: packages/agent/src/harness/session/state.ts:108] [E: packages/agent/src/harness/session/state.ts:128]
- 同一 lane 已有 open operation 时再 `operation_started`，内存与 JSONL backend 都抛 `SessionError("storage", ...)`。[I]
- `SessionRepo.open` 的注释写 “acquires any backend writer claim”，但本节点覆盖的内存/JSONL 实现都没有跨进程文件锁；并发打开同一 JSONL 文件会得到两份独立 `SessionState`。[E: packages/agent/src/harness/session/types.ts:368] [U]
- 旧公开符号 `SessionRepository`、`ArraySessionIndex`、`KeyedOperationQueue` 以及 `repository.ts` / `array-session-index.ts` / `keyed-operation-queue.ts` 已删除，当前契约以本文件列出的 v4 符号为准。[E: packages/agent/src/harness/session/index.ts:1]

## 跨包边界

本节点属于可复用的 `pi-agent-core` harness。JSONL 文件布局与原子 rename 由 [subsys.agent-core.jsonl-storage](jsonl-storage.md) 权威覆盖；进程内 Map 由 [subsys.agent-core.memory-storage](memory-storage.md) 覆盖。`pi-coding-agent` 的产品级 `SessionManager` 与磁盘格式不在本契约内，对照 [ref.coding-agent.session-format](../../reference/session-format.md)。[I]

`packages/agent/docs/harness.md` 还描述 registers / `storageVersion` / `commit(tx)` 等设计面；这些符号**不**出现在当前 `types.ts` 的 `Session` / `SessionRepo` / `SessionMetadata` 上，本节点不以该文档为 ground truth。[E: packages/agent/src/harness/session/types.ts:259] [E: packages/agent/src/harness/session/types.ts:328] [U]

## Sources

- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/state.ts
- packages/agent/src/harness/session/index.ts
- packages/agent/src/index.ts

## 相关

- [subsys.agent-core.jsonl-storage](jsonl-storage.md)：`JsonlSessionRepo`、v4 header、原子 `renameFile`、cwd-scoped id。
- [subsys.agent-core.memory-storage](memory-storage.md)：`InMemorySessionRepo` / `InMemorySessionStorage`。
- [subsys.agent-core.session-tree](session-tree.md)：`Entry` union 与 `seq` / `parentId` / `timestamp`。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：lane view、branch walk、`buildSessionContext()`。
