---
id: subsys.agent-core.memory-storage
title: 内存会话存储
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/memory-storage.ts
  - packages/agent/src/harness/session/memory-repo.ts
symbols:
  - InMemorySessionStorage
  - InMemorySessionRepo
related:
  - subsys.agent-core.session-storage
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.agent-core.memory-storage` 描述 agent-core 的 in-process session storage/repo: `InMemorySessionStorage` 用 entry array、id map、label map 和 leaf pointer 保存一棵会话树, `InMemorySessionRepo` 用 session id 到 live `Session` object 的 map 管理多个内存会话。[E: packages/agent/src/harness/session/memory-storage.ts:40][E: packages/agent/src/harness/session/memory-storage.ts:44][E: packages/agent/src/harness/session/memory-storage.ts:45][E: packages/agent/src/harness/session/memory-storage.ts:46][E: packages/agent/src/harness/session/memory-storage.ts:47][E: packages/agent/src/harness/session/memory-repo.ts:5][E: packages/agent/src/harness/session/memory-repo.ts:6]

## 能回答的问题

- `InMemorySessionStorage` 内部保存哪些 map state?
- `appendEntry()`、`setLeafId()`、`getPathToRoot()` 如何改变或读取 current leaf?
- label entry 如何影响 `getLabel()`?
- `InMemorySessionRepo` 的 `create/open/list/delete/fork` 分别做什么?
- 用内存 storage/repo 写测试时,哪些行为不能当成持久化重开语义?

## 职责边界

`InMemorySessionStorage<TMetadata>` 是 `SessionStorage<TMetadata>` 的内存实现,负责一个 session 的 metadata、tree entries、id lookup、label lookup 和 current leaf。[E: packages/agent/src/harness/session/memory-storage.ts:40][E: packages/agent/src/harness/session/memory-storage.ts:41][E: packages/agent/src/harness/session/memory-storage.ts:43][E: packages/agent/src/harness/session/memory-storage.ts:44][E: packages/agent/src/harness/session/memory-storage.ts:45][E: packages/agent/src/harness/session/memory-storage.ts:46][E: packages/agent/src/harness/session/memory-storage.ts:47]

`InMemorySessionRepo` 是 `SessionRepo<SessionMetadata, { id?: string }, void>` 的内存实现,负责按 session metadata id 保存和查找 live `Session` object,不读写文件、目录或 JSONL header。[E: packages/agent/src/harness/session/memory-repo.ts:1][E: packages/agent/src/harness/session/memory-repo.ts:5][E: packages/agent/src/harness/session/memory-repo.ts:6][I]

## 关键文件

- `packages/agent/src/harness/session/memory-storage.ts`: 定义 `InMemorySessionStorage`,以及 label cache、entry id generation、leaf pointer reconstruction、append/read/find/path/list operations。[E: packages/agent/src/harness/session/memory-storage.ts:10][E: packages/agent/src/harness/session/memory-storage.ts:20][E: packages/agent/src/harness/session/memory-storage.ts:28][E: packages/agent/src/harness/session/memory-storage.ts:36][E: packages/agent/src/harness/session/memory-storage.ts:40]
- `packages/agent/src/harness/session/memory-repo.ts`: 定义 `InMemorySessionRepo`,用 `Map<string, Session<SessionMetadata>>` 实现 create/open/list/delete/fork。[E: packages/agent/src/harness/session/memory-repo.ts:5][E: packages/agent/src/harness/session/memory-repo.ts:6][E: packages/agent/src/harness/session/memory-repo.ts:8][E: packages/agent/src/harness/session/memory-repo.ts:19][E: packages/agent/src/harness/session/memory-repo.ts:27][E: packages/agent/src/harness/session/memory-repo.ts:31][E: packages/agent/src/harness/session/memory-repo.ts:35]

## Map state

`entries` 是 append order 的 `SessionTreeEntry[]`; constructor 只浅拷贝传入 array, `getEntries()` 返回当前 array 的浅拷贝。[E: packages/agent/src/harness/session/memory-storage.ts:44][E: packages/agent/src/harness/session/memory-storage.ts:50][E: packages/agent/src/harness/session/memory-storage.ts:128][E: packages/agent/src/harness/session/memory-storage.ts:129]

`byId` 是 `Map<string, SessionTreeEntry>`, constructor 从 `entries.map((entry) => [entry.id, entry])` 初始化, `appendEntry()` 和 `setLeafId()` 会把新 entry 写入该 map。[E: packages/agent/src/harness/session/memory-storage.ts:45][E: packages/agent/src/harness/session/memory-storage.ts:51][E: packages/agent/src/harness/session/memory-storage.ts:84][E: packages/agent/src/harness/session/memory-storage.ts:94]

`labelsById` 是 `Map<string, string>`, constructor 通过 `buildLabelsById(entries)` 重建; `updateLabelCache()` 只处理 `type: "label"` 的 entry, trim 后非空 label 写入 `targetId`,空 label 删除 `targetId`。[E: packages/agent/src/harness/session/memory-storage.ts:10][E: packages/agent/src/harness/session/memory-storage.ts:11][E: packages/agent/src/harness/session/memory-storage.ts:12][E: packages/agent/src/harness/session/memory-storage.ts:14][E: packages/agent/src/harness/session/memory-storage.ts:16][E: packages/agent/src/harness/session/memory-storage.ts:20][E: packages/agent/src/harness/session/memory-storage.ts:52]

`leafId` 是 current leaf pointer; constructor 从初始 entries 顺序扫描并把每个 entry 投影为新的 leaf,其中普通 entry 投影为自己的 `id`, `leaf` entry 投影为 `targetId`。[E: packages/agent/src/harness/session/memory-storage.ts:36][E: packages/agent/src/harness/session/memory-storage.ts:37][E: packages/agent/src/harness/session/memory-storage.ts:47][E: packages/agent/src/harness/session/memory-storage.ts:53][E: packages/agent/src/harness/session/memory-storage.ts:54]

constructor 会在重建后的 `leafId` 非空但 `byId` 找不到时抛 `SessionError("invalid_session", ...)`;默认 metadata 是 `{ id: uuidv7(), createdAt: new Date().toISOString() }`。[E: packages/agent/src/harness/session/memory-storage.ts:55][E: packages/agent/src/harness/session/memory-storage.ts:56][E: packages/agent/src/harness/session/memory-storage.ts:58]

## Storage operations

`getMetadata()` 返回 constructor 保存的 `metadata` object;这个 object 在 storage 生命周期内作为 readonly field 持有,方法本身不 clone。[E: packages/agent/src/harness/session/memory-storage.ts:43][E: packages/agent/src/harness/session/memory-storage.ts:61][E: packages/agent/src/harness/session/memory-storage.ts:62][I]

`getLeafId()` 先确认非空 `leafId` 仍能在 `byId` 中找到,否则抛 `SessionError("invalid_session", ...)`,再返回当前 `leafId`。[E: packages/agent/src/harness/session/memory-storage.ts:65][E: packages/agent/src/harness/session/memory-storage.ts:66][E: packages/agent/src/harness/session/memory-storage.ts:67][E: packages/agent/src/harness/session/memory-storage.ts:69]

`setLeafId(leafId)` 不是只改一个字段:非空目标必须已存在于 `byId`,然后它追加一个 `LeafEntry` 到 `entries`,把该 leaf entry 写入 `byId`,最后把 current `leafId` 设置为传入 target。[E: packages/agent/src/harness/session/memory-storage.ts:72][E: packages/agent/src/harness/session/memory-storage.ts:73][E: packages/agent/src/harness/session/memory-storage.ts:74][E: packages/agent/src/harness/session/memory-storage.ts:76][E: packages/agent/src/harness/session/memory-storage.ts:83][E: packages/agent/src/harness/session/memory-storage.ts:84][E: packages/agent/src/harness/session/memory-storage.ts:85]

`setLeafId()` 生成的 `LeafEntry.parentId` 是调用前的 current leaf, `targetId` 是新的 leaf target 或 `null`;这让 tree navigation 本身也进入 append-only entry stream。[E: packages/agent/src/harness/session/memory-storage.ts:76][E: packages/agent/src/harness/session/memory-storage.ts:79][E: packages/agent/src/harness/session/memory-storage.ts:81][I]

`createEntryId()` 调用 `generateEntryId(byId)`:它最多尝试 100 次 `uuidv7().slice(0, 8)` 且避开已存在 id,之后回退到完整 `uuidv7()`。[E: packages/agent/src/harness/session/memory-storage.ts:28][E: packages/agent/src/harness/session/memory-storage.ts:29][E: packages/agent/src/harness/session/memory-storage.ts:30][E: packages/agent/src/harness/session/memory-storage.ts:31][E: packages/agent/src/harness/session/memory-storage.ts:33][E: packages/agent/src/harness/session/memory-storage.ts:88][E: packages/agent/src/harness/session/memory-storage.ts:89]

`appendEntry(entry)` 按传入 entry 原样追加到 `entries`,写入 `byId`,更新 label cache,并用 `leafIdAfterEntry(entry)` 重算 current leaf;普通 entry 会成为 leaf,`leaf` entry 会把 leaf 移到 `targetId`。[E: packages/agent/src/harness/session/memory-storage.ts:92][E: packages/agent/src/harness/session/memory-storage.ts:93][E: packages/agent/src/harness/session/memory-storage.ts:94][E: packages/agent/src/harness/session/memory-storage.ts:95][E: packages/agent/src/harness/session/memory-storage.ts:96][E: packages/agent/src/harness/session/memory-storage.ts:36][E: packages/agent/src/harness/session/memory-storage.ts:37]

`getEntry(id)` 是 `byId.get(id)`,未命中时返回 `undefined`; `findEntries(type)` 过滤 `entries` array 并把结果 narrowing 为对应 entry type。[E: packages/agent/src/harness/session/memory-storage.ts:99][E: packages/agent/src/harness/session/memory-storage.ts:100][E: packages/agent/src/harness/session/memory-storage.ts:103][E: packages/agent/src/harness/session/memory-storage.ts:106]

`getLabel(id)` 只读 `labelsById.get(id)`,所以它反映的是 constructor 重建和后续 `appendEntry()` 维护出的 label cache,不是每次现扫 entries。[E: packages/agent/src/harness/session/memory-storage.ts:109][E: packages/agent/src/harness/session/memory-storage.ts:110][E: packages/agent/src/harness/session/memory-storage.ts:52][E: packages/agent/src/harness/session/memory-storage.ts:95]

`getPathToRoot(leafId)` 对 `null` 返回空数组;非空时从 `byId.get(leafId)` 开始沿 `parentId` 向 root 回溯,每一步 `unshift(current)` 让返回值保持 root-to-leaf 顺序。[E: packages/agent/src/harness/session/memory-storage.ts:113][E: packages/agent/src/harness/session/memory-storage.ts:114][E: packages/agent/src/harness/session/memory-storage.ts:116][E: packages/agent/src/harness/session/memory-storage.ts:118][E: packages/agent/src/harness/session/memory-storage.ts:119][E: packages/agent/src/harness/session/memory-storage.ts:120][E: packages/agent/src/harness/session/memory-storage.ts:125]

`getPathToRoot()` 对起点缺失抛 `SessionError("not_found", ...)`,对中途 parent 缺失抛 `SessionError("invalid_session", ...)`,因此它同时承担 branch path 读取和树完整性校验。[E: packages/agent/src/harness/session/memory-storage.ts:116][E: packages/agent/src/harness/session/memory-storage.ts:117][E: packages/agent/src/harness/session/memory-storage.ts:121][E: packages/agent/src/harness/session/memory-storage.ts:122][I]

## Repo operations

`InMemorySessionRepo.create(options)` 生成 metadata id 和 timestamp,用该 metadata 创建 `InMemorySessionStorage`,经 `toSession(storage)` 包成 `Session`,再把 session 存到 `sessions` map 的 metadata id 下。[E: packages/agent/src/harness/session/memory-repo.ts:8][E: packages/agent/src/harness/session/memory-repo.ts:9][E: packages/agent/src/harness/session/memory-repo.ts:10][E: packages/agent/src/harness/session/memory-repo.ts:11][E: packages/agent/src/harness/session/memory-repo.ts:13][E: packages/agent/src/harness/session/memory-repo.ts:14][E: packages/agent/src/harness/session/memory-repo.ts:15]

`open(metadata)` 只用 `metadata.id` 查 `sessions`;未命中时抛 `SessionError("not_found", "Session not found: ...")`,命中时返回 map 中保存的同一个 `Session` object。[E: packages/agent/src/harness/session/memory-repo.ts:19][E: packages/agent/src/harness/session/memory-repo.ts:20][E: packages/agent/src/harness/session/memory-repo.ts:21][E: packages/agent/src/harness/session/memory-repo.ts:22][E: packages/agent/src/harness/session/memory-repo.ts:24]

`list()` 对 `sessions.values()` 中的每个 live session 调用 `getMetadata()`,返回 metadata array;它不按磁盘目录扫描,也不重新构造 storage。[E: packages/agent/src/harness/session/memory-repo.ts:27][E: packages/agent/src/harness/session/memory-repo.ts:28][I]

`delete(metadata)` 调用 `this.sessions.delete(metadata.id)`;源码没有对 missing id 抛错或返回删除结果。[E: packages/agent/src/harness/session/memory-repo.ts:31][E: packages/agent/src/harness/session/memory-repo.ts:32]

`fork(sourceMetadata, options)` 先 `open(sourceMetadata)`,再用 `getEntriesToFork(source.getStorage(), options)` 取 fork entries,生成新 metadata,用 `new InMemorySessionStorage({ metadata, entries: forkedEntries })` 建新 storage,最后把新 session 存入 `sessions` map。[E: packages/agent/src/harness/session/memory-repo.ts:35][E: packages/agent/src/harness/session/memory-repo.ts:39][E: packages/agent/src/harness/session/memory-repo.ts:40][E: packages/agent/src/harness/session/memory-repo.ts:41][E: packages/agent/src/harness/session/memory-repo.ts:45][E: packages/agent/src/harness/session/memory-repo.ts:46][E: packages/agent/src/harness/session/memory-repo.ts:47]

## Testing and in-memory gotcha

- `InMemorySessionRepo.open()` returns the live session object stored in its map, so tests using this repo do not exercise reopen-from-disk reconstruction; use JSONL storage/repo when the behavior under test is reload persistence rather than Session API behavior.[E: packages/agent/src/harness/session/memory-repo.ts:6][E: packages/agent/src/harness/session/memory-repo.ts:20][E: packages/agent/src/harness/session/memory-repo.ts:24][I]
- `InMemorySessionStorage` shallow-copies the initial `entries` array but stores entry objects by reference in both `entries` and `byId`; tests should treat entries as immutable after append if they want behavior comparable to an append-only log.[E: packages/agent/src/harness/session/memory-storage.ts:50][E: packages/agent/src/harness/session/memory-storage.ts:51][E: packages/agent/src/harness/session/memory-storage.ts:93][E: packages/agent/src/harness/session/memory-storage.ts:94][I]
- `getEntries()` protects the internal array shape with `[...this.entries]`, but it does not deep-clone individual entries.[E: packages/agent/src/harness/session/memory-storage.ts:128][E: packages/agent/src/harness/session/memory-storage.ts:129][I]
- `setLeafId(null)` is allowed and still appends a `leaf` entry with `targetId: null`; tests that assert entry counts must account for navigation entries, not only message/state entries.[E: packages/agent/src/harness/session/memory-storage.ts:72][E: packages/agent/src/harness/session/memory-storage.ts:76][E: packages/agent/src/harness/session/memory-storage.ts:81][E: packages/agent/src/harness/session/memory-storage.ts:83]
- The repo-level storage is process-local memory: `sessions` is an instance field initialized to a new `Map`, and no code in this implementation serializes sessions to external storage.[E: packages/agent/src/harness/session/memory-repo.ts:6][E: packages/agent/src/harness/session/memory-repo.ts:13][E: packages/agent/src/harness/session/memory-repo.ts:45][I]

## 跨包边界

[subsys.agent-core.session-storage](session-storage.md) 应覆盖 `SessionStorage`/`SessionRepo` interface contract 和 shared repo utilities;本节点只覆盖 `InMemorySessionStorage` 与 `InMemorySessionRepo` 这两个内存实现的 state maps、read/write/list/fork behavior。[E: packages/agent/src/harness/session/memory-storage.ts:40][E: packages/agent/src/harness/session/memory-repo.ts:5][I]

## Sources

- packages/agent/src/harness/session/memory-storage.ts
- packages/agent/src/harness/session/memory-repo.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md) - `SessionStorage`/`SessionRepo` contract 与 shared repo utility 边界。
