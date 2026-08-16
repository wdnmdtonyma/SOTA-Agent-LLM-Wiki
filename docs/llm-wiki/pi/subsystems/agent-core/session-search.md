---
id: subsys.agent-core.session-search
title: 会话搜索(SessionSearch)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/search/index.ts
  - packages/agent/src/search/scanning.ts
  - packages/agent/src/index.ts
  - packages/agent/docs/search.md
  - packages/session-backends/sqlite-node/src/sqlite/search-backend.ts
  - packages/session-backends/sqlite-node/src/sqlite/index.ts
  - packages/agent/src/harness/session/jsonl/repo.ts
  - packages/agent/test/harness/session/search.test.ts
symbols:
  - SessionSearch
  - SessionSearchOptions
  - SessionSearchHit
  - createScanningSessionSearch
  - scanningEntries
  - ScanningSessionSearchHit
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.session-search` 说明 `pi-agent-core` 当前仍导出的 `SessionSearch` 查询契约、包内默认 scanning 实现，以及 SQLite / 外部索引相对该契约的包边界。旧路径 `packages/agent/src/harness/session/search.ts` 已删除。

## 能回答的问题

- `SessionSearch` 是否还在 `pi-agent-core` 里，签名相对旧 scanning helper 改了什么？
- `createScanningSessionSearch()` 扫描哪些可读面、默认如何投影与匹配？
- 共享契约是否包含 cwd 过滤、score、snippet？
- JSONL / memory 如何作为 scanning source，而不走 `SessionRepo.open()` 写租约？
- SQLite FTS 与 Elasticsearch 这类外部 search service 分别属于哪一层？

## 职责边界

`SessionSearch` 仍是公开查询接口，但已从已删除的 `packages/agent/src/harness/session/search.ts` 迁到 `packages/agent/src/search/`。`packages/agent/src/index.ts` 以 `export *` 再导出整个 search 模块。[E: packages/agent/src/index.ts:141] [E: packages/agent/src/search/index.ts:30]

共享契约只有 `search(text, options?)`，返回 `AsyncIterable<T>`，不再返回 `Promise<SessionSearchHit[]>`。[E: packages/agent/src/search/index.ts:30] [E: packages/agent/src/search/index.ts:31] 基础 hit 只保证 `sessionId` 与 `entryId`。[E: packages/agent/src/search/index.ts:23] [E: packages/agent/src/search/index.ts:25] [E: packages/agent/src/search/index.ts:27]

`SessionSearchOptions` 只有 `entryTypes`、`limit`、`signal`。契约层没有 `cwd`、没有 `score`。[E: packages/agent/src/search/index.ts:14] [E: packages/agent/src/search/index.ts:16] [E: packages/agent/src/search/index.ts:18] [E: packages/agent/src/search/index.ts:20] 旧 scanning 实现把 `text` 放进 options、用 metadata `cwd` 做精确过滤的形状已经不在该模块。

包内只实现 scanning。索引维护、FTS、远程 search service 都不在 `pi-agent-core` 源码里。[E: packages/agent/src/search/index.ts:12] [E: packages/agent/docs/search.md:133]

## 数据模型

`SessionSearchHit` 是可跨 backend 携带的最小身份：`(sessionId, entryId)`。[E: packages/agent/src/search/index.ts:23] [E: packages/agent/src/search/index.ts:25] [E: packages/agent/src/search/index.ts:27] `packages/agent/docs/search.md` 把 snippet、timestamp、score、metadata、offsets 与 ranking 标为具体实现的扩展，不属于共享契约。[E: packages/agent/docs/search.md:32]

`SessionSearchCandidate` 是 scanner 在匹配前构造的内部候选：`entryId`、`seq`、`type`、`timestamp`、投影后的 `text`，以及可选 `fields`。[E: packages/agent/src/search/scanning.ts:4] [E: packages/agent/src/search/scanning.ts:5] [E: packages/agent/src/search/scanning.ts:6] [E: packages/agent/src/search/scanning.ts:7] [E: packages/agent/src/search/scanning.ts:8] [E: packages/agent/src/search/scanning.ts:9] [E: packages/agent/src/search/scanning.ts:10]

`ScanningReadable` 只要求 `SessionStorage` 的 `getMetadata`、`findEntries`、`getLabel`，不要求 create/open/delete/fork。[E: packages/agent/src/search/scanning.ts:13] [E: packages/agent/src/search/scanning.ts:15] source 可以是 `ScanningReadable[]`，也可以是 `ScanningReadableSource` 工厂，按查询产出 readable 流。[E: packages/agent/src/search/scanning.ts:18] [E: packages/agent/src/search/scanning.ts:104] [E: packages/agent/src/search/scanning.ts:108]

`ScanningSessionSearchHit` 在基础 hit 上加 `timestamp` 与 `snippet`，默认 `snippet` 就是 candidate 的投影文本。[E: packages/agent/src/search/scanning.ts:33] [E: packages/agent/src/search/scanning.ts:34] [E: packages/agent/src/search/scanning.ts:35] [E: packages/agent/src/search/scanning.ts:127] [E: packages/agent/src/search/scanning.ts:131]

## Scanning 控制流

1. `createScanningSessionSearch(source, options)` 返回实现 `SessionSearch<THit>` 的对象。[E: packages/agent/src/search/scanning.ts:135] [E: packages/agent/src/search/scanning.ts:142]
2. `search(text, searchOptions)` 先把 text 做 `trim().toLowerCase()`。归一化后为空，或 `limit <= 0`，或 `entryTypes` 是空数组，都直接结束，不 yield。[E: packages/agent/src/search/scanning.ts:149] [E: packages/agent/src/search/scanning.ts:150] [E: packages/agent/src/search/scanning.ts:151]
3. 若提供 `sourceOptions`，用已经归一化的 text 与本次 `SessionSearchOptions` 计算 source 参数，再把数组 source 或函数 source 展开成 readable 流。[E: packages/agent/src/search/scanning.ts:155] [E: packages/agent/src/search/scanning.ts:156] [E: packages/agent/src/search/scanning.ts:108]
4. 每个 readable 先 `getMetadata()`。同一查询里第二次看到相同 `metadata.id` 会抛 `Error("Duplicate sessionId: …")`。[E: packages/agent/src/search/scanning.ts:158] [E: packages/agent/src/search/scanning.ts:159] [E: packages/agent/src/search/scanning.ts:160]
5. `scanReadableEntries()` 用 `findEntries({ order: "oldestFirst", limit: pageSize, cursor: { afterSeq } })` 分页；仅当 `entryTypes` 恰好 1 个时把该 type 下推到 `findEntries`，多个 type 则在内存里再过滤。[E: packages/agent/src/search/scanning.ts:63] [E: packages/agent/src/search/scanning.ts:67] [E: packages/agent/src/search/scanning.ts:71] [E: packages/agent/src/search/scanning.ts:75]
6. 默认 `pageSize` 是 100。每条 entry 调 `getLabel(entry.id)`，再用 `projectText` 生成 candidate.text。[E: packages/agent/src/search/scanning.ts:63] [E: packages/agent/src/search/scanning.ts:76] [E: packages/agent/src/search/scanning.ts:82]
7. 默认投影：无 label 时是 `JSON.stringify(entry)`；有 label 时是 `` `${JSON.stringify(entry)} ${label}` ``，并把 `{ label }` 放进 `fields`。[E: packages/agent/src/search/scanning.ts:53] [E: packages/agent/src/search/scanning.ts:83]
8. 默认匹配是 `candidate.text.toLowerCase().includes(queryText)`。查询方可替换 `match` 与 `createHit`。[E: packages/agent/src/search/scanning.ts:112] [E: packages/agent/src/search/scanning.ts:166] [E: packages/agent/src/search/scanning.ts:167] [E: packages/agent/src/search/scanning.ts:143]
9. 命中后 yield hit，并在达到 `limit` 时立刻 return。循环中会检查 `signal`；abort 时若 `reason` 是 `Error` 则原样抛出，否则抛 `name === "AbortError"` 的 `Error`。[E: packages/agent/src/search/scanning.ts:169] [E: packages/agent/src/search/scanning.ts:171] [E: packages/agent/src/search/scanning.ts:164] [E: packages/agent/src/search/scanning.ts:117] [E: packages/agent/src/search/scanning.ts:118] [E: packages/agent/src/search/scanning.ts:120]

`scanningEntries(readable)` 是同一套分页投影，但不做 query match，供外部索引抓取候选。[E: packages/agent/src/search/scanning.ts:91] [E: packages/agent/src/search/scanning.ts:95]

## JSONL / memory 作为 scanning source

`Session` 与 `SessionStorage` 只要实现 `getMetadata` / `findEntries` / `getLabel`，就可以直接放进 `createScanningSessionSearch([session])`。测试用 `InMemorySessionStorage` 包一层 `Session` 作为 source，并断言 scanning 对象没有 `apply` writer 方法。[E: packages/agent/test/harness/session/search.test.ts:63] [E: packages/agent/test/harness/session/search.test.ts:65]

JSONL 不必再做单独的公开 search adapter。测试用 `listJsonlSessionMetadata()` + `loadJsonlSessionStorage()` 做成 async generator，再交给同一个 scanner；`loadJsonlSessionStorage()` 只 `JsonlSessionStorage.load()`，不调用 `JsonlSessionRepo.open()`。[E: packages/agent/test/harness/session/search.test.ts:51] [E: packages/agent/test/harness/session/search.test.ts:53] [E: packages/agent/test/harness/session/search.test.ts:107] [E: packages/agent/src/harness/session/jsonl/repo.ts:89] [E: packages/agent/src/harness/session/jsonl/repo.ts:96] [E: packages/agent/docs/search.md:104]

`packages/agent/docs/search.md` 写明：scanning source 不得对 harness 已占用的 session 调用可能抢 writer lease 的 `SessionRepo.open()`；JSONL 应走只读 load helper。[E: packages/agent/docs/search.md:104]

cwd 不再是 `SessionSearchOptions` 字段。若 JSONL 要按工作目录收窄，只能由 source 工厂自己读 `JsonlSessionListOptions` 之类的 backend list 参数，这属于应用/JSONL 层，不是共享 search 契约。[E: packages/agent/src/search/index.ts:14] [E: packages/agent/docs/search.md:151] [I]

## 外部 search service

`packages/agent/docs/search.md` 把 Elasticsearch 标成 application-owned glue：core 只提供 query 契约和 JSONL discovery；Elastic writer、`IndexedSessionSearch`、`ElasticSessionSearch` 都是文档里的示例类型，不是 `packages/agent/src` 的导出。[E: packages/agent/docs/search.md:137] [E: packages/agent/docs/search.md:157] [E: packages/agent/src/index.ts:141]

文档示例用 `scanningEntries()` 把 JSONL 投影喂给外部 `apply()`，再在 `search()` 里查远程 index。这证明外部 service 可以实现同一个 `SessionSearch` 接口，但不证明仓库里存在 Elastic 实现。[E: packages/agent/docs/search.md:248] [E: packages/agent/docs/search.md:209] [I]

`docs/harness.md` 另有一份带 `sync()` / `notify()` cursor 的 `SessionSearchService` 设计稿。`packages/agent/src` 没有该符号；当前公开面是 `SessionSearch`，不是那份设计稿。[U]

## SQLite search 边界

SQLite FTS 不在 `pi-agent-core`。`createSqliteSessionSearch` 与 `SqliteSessionSearchHit` 定义在 `@earendil-works/pi-session-backend-sqlite-node` 的 `packages/session-backends/sqlite-node/src/sqlite/search-backend.ts`，并实现同一份 `SessionSearch` 契约。[E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:91] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:98] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:192] [E: packages/session-backends/sqlite-node/src/sqlite/index.ts:7]

`SqliteSessionSearchHit` 扩展 `metadata`、`timestamp`、`score`。scanning hit 没有 `score`。[E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:91] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:94] [E: packages/agent/src/search/scanning.ts:33]

FTS 表与 AFTER INSERT/DELETE/UPDATE OF payload 触发器在第一次非空 search 打开数据库时 `ensureSearchSchema()` 惰性创建；若当时还没有 FTS 但已有 `entries`，会 `rebuild` 一次。[E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:65] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:87] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:127] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:135] `packages/agent/docs/search.md` 补充：触发器生效后，FTS 失败可以回滚同一条 canonical SQLite write。这是 backend 文档合同，不是 agent search 模块的运行时保证。[E: packages/agent/docs/search.md:129] [I]

## 设计动机与权衡

基础 hit 只保留 `(sessionId, entryId)`，是为了让 JSONL scanning、SQLite FTS 和远程 index 共享同一查询面，而把 ranking 与展示字段留给实现。[E: packages/agent/docs/search.md:32] [I]

`AsyncIterable` 允许调用方边收边渲染、在够用时停止迭代，并用 `AbortSignal` 取消；debounce 仍是 UI 职责。[E: packages/agent/docs/search.md:36] [E: packages/agent/src/search/index.ts:20] [I]

Scanning 每次查询重新 list/page canonical entries，没有二级索引状态；代价是全量扫描。SQLite 选择 co-located FTS 触发器换新鲜度，并把失败域留在 backend。[E: packages/agent/src/search/scanning.ts:67] [E: packages/agent/docs/search.md:129] [I]

## Gotcha

- text 匹配默认大小写不敏感，因为 query 先 `toLowerCase()`，candidate 再 `toLowerCase().includes()`。自定义 `match` 可以改掉这点。[E: packages/agent/src/search/scanning.ts:149] [E: packages/agent/src/search/scanning.ts:112]
- 一个 session 中每个匹配 entry 都是一条 hit；scanner 不去重 session。[E: packages/agent/src/search/scanning.ts:169]
- scanning 结果顺序是 source 产出 readable 的顺序，再加 `oldestFirst` entry 顺序；没有按相关度排序。[E: packages/agent/src/search/scanning.ts:68] [E: packages/agent/src/search/scanning.ts:156]
- label 会被拼进默认投影文本，因此搜 label 能命中，即使 message body 不含该词。测试覆盖了这一点。[E: packages/agent/src/search/scanning.ts:53] [E: packages/agent/test/harness/session/search.test.ts:74]
- `docs/search.md` 仍写“follow-up should add a no-op search index sink”。源码里没有 `NOOP_SEARCH_INDEX_SINK`。[E: packages/agent/docs/search.md:276] [U]

## 跨包边界

本节点属于 `pi-agent-core` 的可复用查询面。JSONL 与 memory 只是 `ScanningReadable` source；SQLite 实现属于 `session-backends` 包。`coding-agent` 的 session selector 本地模糊匹配不是这份 `SessionSearch` API。[E: packages/agent/src/index.ts:141] [E: packages/session-backends/sqlite-node/src/sqlite/search-backend.ts:192] [I]

## Sources

- packages/agent/src/search/index.ts
- packages/agent/src/search/scanning.ts
- packages/agent/src/index.ts
- packages/agent/docs/search.md
- packages/session-backends/sqlite-node/src/sqlite/search-backend.ts
- packages/session-backends/sqlite-node/src/sqlite/index.ts
- packages/agent/src/harness/session/jsonl/repo.ts
- packages/agent/test/harness/session/search.test.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`Session` / `SessionStorage` / `SessionRepo` 合同，search 只复用其中的只读能力。
- [subsys.agent-core.jsonl-storage](jsonl-storage.md)：JSONL list/load helper 如何作为 scanning source。
- [subsys.agent-core.memory-storage](memory-storage.md)：进程内 `InMemorySessionStorage` 可直接扫描。
