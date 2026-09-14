---
id: subsys.agent-core.jsonl-storage
title: JSONL v4 会话仓库(JsonlSessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/jsonl/index.ts
  - packages/agent/src/harness/session/jsonl/repo.ts
  - packages/agent/src/harness/session/jsonl/storage.ts
  - packages/agent/src/harness/session/jsonl/codec.ts
  - packages/agent/src/harness/session/jsonl/types.ts
  - packages/agent/src/harness/session/jsonl/legacy-v3.ts
  - packages/agent/src/harness/session/jsonl/fork.ts
  - packages/agent/src/harness/session/jsonl/io.ts
  - packages/agent/src/harness/session/fork-policy.ts
  - packages/agent/src/harness/types.ts
symbols:
  - JsonlSessionRepo
  - JsonlStorage
  - JsonlStorageHeader
  - JsonlSessionMetadata
  - JsonlForkInput
  - runJsonlFork
  - parseJsonlSessionHeader
  - parseJsonlTransaction
  - publishJsonl
  - publishFileAtomically
  - LegacyV3Source
  - JSONL_FORMAT_VERSION
  - JSONL_STORAGE_VERSION
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 71dca871bc
---

> `subsys.agent-core.jsonl-storage` 描述 `pi-agent-core` 的 durable JSONL 实现：公开 `JsonlSessionRepo` 返回 `StorageBackedSession`；每文件由 `JsonlStorage` 维护一份 `InMemoryStorageState`；首行是 `kind: "header", v: 4`，后续每行一条 commit 事务。fork 是两趟流式：`resolveForkInput` → `runJsonlFork` → `JsonlStorage.open`。解析与原子发布在 `jsonl/io.ts`。

## 能回答的问题

- header 有哪些字段，`v` 不是 4 或 `storageVersion` 不是 1 时发生什么？
- cwd-scoped session id 如何映射到目录与文件名？
- create / open / list / delete / fork 各走哪些文件操作？
- `JsonlForkInput` 的 `open` / `closed` / `legacy-v3` 分别何时出现，打开的 v3 为什么不能 fork？
- 原子 `renameFile` / `publishJsonl` 用在哪些路径，日常 append 为什么不走它？
- malformed header、torn tail、v3-legacy 分别如何表现？

## 职责边界

`jsonl/index.ts` 是公开再导出：露出 `JsonlSessionRepo`、`JsonlStorage` 与 JSONL 相关 type。[E: packages/agent/src/harness/session/jsonl/index.ts:1] [E: packages/agent/src/harness/session/jsonl/index.ts:2]

`JsonlSessionRepo` 实现 `SessionRepo<JsonlSessionMetadata, JsonlSessionCreateOptions, JsonlSessionListOptions>`，负责 cwd 目录、create 预约、以及把打开的文件包成 `StorageBackedSession`。[E: packages/agent/src/harness/session/jsonl/repo.ts:46] [E: packages/agent/src/harness/session/jsonl/repo.ts:63] [E: packages/agent/src/harness/session/jsonl/repo.ts:333]

`JsonlStorage` 实现 `Storage`：load 时把 header + 事务行重放到 `InMemoryStorageState`；写路径先 `appendFile` 再 `applyValidated`，并用 per-instance `commitQueue` 串行化。[E: packages/agent/src/harness/session/jsonl/storage.ts:40] [E: packages/agent/src/harness/session/jsonl/storage.ts:128] [E: packages/agent/src/harness/session/jsonl/storage.ts:138]

`codec.ts` 只解析 header（v4 或 v3-legacy）。事务行由 `io.ts` 的 `parseJsonlTransaction` 解码；原子发布由 `publishJsonl` / `publishFileAtomically` 完成。旧的 `jsonl/errors.ts` / `JsonlDecodeError` 已删除；失败是普通 `Error`，常以 `FileError` 为 `cause`。[E: packages/agent/src/harness/session/jsonl/codec.ts:53] [E: packages/agent/src/harness/session/jsonl/io.ts:66] [E: packages/agent/src/harness/session/jsonl/io.ts:15]

`runJsonlFork` 不打开 destination `Session`：它只原子写出 format-4 文件。repo 随后 `JsonlStorage.open` 再 `publishOpenSession`。[E: packages/agent/src/harness/session/jsonl/fork.ts:295] [E: packages/agent/src/harness/session/jsonl/repo.ts:186]

## 关键文件

- `packages/agent/src/harness/session/jsonl/types.ts`：`JsonlStorageHeader`、`JSONL_FORMAT_VERSION = 4`、`JSONL_STORAGE_VERSION = 1`、cwd-scoped create/list options。[E: packages/agent/src/harness/session/jsonl/types.ts:4] [E: packages/agent/src/harness/session/jsonl/types.ts:7]
- `packages/agent/src/harness/session/jsonl/codec.ts`：`parseJsonlSessionHeader` / `isJsonlStorageHeader` / `isLegacyV3SessionHeader`。[E: packages/agent/src/harness/session/jsonl/codec.ts:34] [E: packages/agent/src/harness/session/jsonl/codec.ts:53]
- `packages/agent/src/harness/session/jsonl/io.ts`：`fileValue`、`readJsonlHeader`、`parseJsonlTransaction`、`serializeJsonlTransaction`、`publishFileAtomically`、`publishJsonl`。[E: packages/agent/src/harness/session/jsonl/io.ts:66] [E: packages/agent/src/harness/session/jsonl/io.ts:107]
- `packages/agent/src/harness/session/jsonl/storage.ts`：`JsonlStorage.create/open`、torn-tail 修复、v3 升级、日常 append。[E: packages/agent/src/harness/session/jsonl/storage.ts:59] [E: packages/agent/src/harness/session/jsonl/storage.ts:74] [E: packages/agent/src/harness/session/jsonl/storage.ts:154]
- `packages/agent/src/harness/session/jsonl/fork.ts`：`JsonlForkInput`、`runJsonlFork`（index + stream）。[E: packages/agent/src/harness/session/jsonl/fork.ts:208] [E: packages/agent/src/harness/session/jsonl/fork.ts:295]
- `packages/agent/src/harness/session/fork-policy.ts`：JSONL 与 memory 共用的 `selectBranchFork` / `projectForkCurrentStateWrite`。[E: packages/agent/src/harness/session/fork-policy.ts:8] [E: packages/agent/src/harness/session/fork-policy.ts:40]
- `packages/agent/src/harness/session/jsonl/repo.ts`：目录编码、list、create 预约、`openSessions` 互斥、`resolveForkInput`。[E: packages/agent/src/harness/session/jsonl/repo.ts:36] [E: packages/agent/src/harness/session/jsonl/repo.ts:299]
- `packages/agent/src/harness/session/jsonl/legacy-v3.ts`：`LegacyV3Source.read` 把 `type: "session", version: 3` 投影成可重复的 v4 writes。[E: packages/agent/src/harness/session/jsonl/legacy-v3.ts:528] [E: packages/agent/src/harness/session/jsonl/legacy-v3.ts:563]
- `packages/agent/src/harness/types.ts`：`TextLine` / `TextLineReader` / `FileSystem.openTextLineReader`，fork 与 open 用 `terminated` 丢掉 torn 末行。[E: packages/agent/src/harness/types.ts:260] [E: packages/agent/src/harness/types.ts:286]

## 数据模型

### Header（format 4 / storageVersion 1）

`JsonlStorageHeader` 固定 `kind: "header"`、`v: 4`，并带 `id`、`storageVersion`、`createdAt`、`cwd`；可选 `parentSessionId`、`legacyParentSessionPath`、`nextSeq`。[E: packages/agent/src/harness/session/jsonl/types.ts:7] [E: packages/agent/src/harness/session/jsonl/types.ts:8]

`isJsonlStorageHeader()` 要求 `v === 4`、`storageVersion >= 1` 的 safe integer、`createdAt >= 0`。`parseJsonlSessionHeader()` 先认 v4，再认 `type: "session", version: 3` 的 legacy；其它返回 `err`。[E: packages/agent/src/harness/session/jsonl/codec.ts:38] [E: packages/agent/src/harness/session/jsonl/codec.ts:60] [E: packages/agent/src/harness/session/jsonl/codec.ts:62]

`open` 在 header 已是 v4 时还要求 `storageVersion === JSONL_STORAGE_VERSION`（当前 1），否则抛 unsupported storage version。[E: packages/agent/src/harness/session/jsonl/storage.ts:95] [E: packages/agent/src/harness/session/jsonl/repo.ts:370]

### 事务行

`parseJsonlTransaction()` 把一行 JSON 解成 `CommittedWrite[]`：根值是数组则逐条，否则当作单条 write。每条必须有 `kind ∈ {entry, usage, value, list}` 与 `seq >= 1`。[E: packages/agent/src/harness/session/jsonl/io.ts:66] [E: packages/agent/src/harness/session/jsonl/io.ts:47] [E: packages/agent/src/harness/session/jsonl/io.ts:46]

`serializeJsonlTransaction()`：一条 write 写成对象，多条写成数组。[E: packages/agent/src/harness/session/jsonl/io.ts:76]

### `JsonlForkInput`

三种 kind，由 `JsonlSessionRepo.resolveForkInput` 选择：[E: packages/agent/src/harness/session/jsonl/fork.ts:208] [E: packages/agent/src/harness/session/jsonl/repo.ts:299]

| kind | 何时 | 源怎么读 |
| --- | --- | --- |
| `open` | 源已在 `openSessions` 且不是 legacy v3 | 带 `nextSeq = storage.captureForkNextSeq()`，两趟都在该 seq 边界停下 [E: packages/agent/src/harness/session/jsonl/repo.ts:310] [E: packages/agent/src/harness/session/jsonl/storage.ts:249] |
| `closed` | 源未打开，且 header 不是 v3-legacy | 扫到 EOF 或 torn 末行；`nextSeq = max(header.nextSeq ?? 1, highestCompleteSeq + 1)` [E: packages/agent/src/harness/session/jsonl/repo.ts:320] [E: packages/agent/src/harness/session/jsonl/fork.ts:252] |
| `legacy-v3` | 源未打开，且第一行是 v3 session header | `LegacyV3Source.read`；index 用 `entryStructures()` + `values`，copy 用 `writes()` [E: packages/agent/src/harness/session/jsonl/repo.ts:313] [E: packages/agent/src/harness/session/jsonl/fork.ts:233] |

已打开的 v3 **拒绝** fork，要求先 commit 非空事务升级到 format 4。[E: packages/agent/src/harness/session/jsonl/repo.ts:305]

不存在 `createFromForkSnapshot` / `captureForkSource`。生产 JSONL fork 不走 `createForkSnapshot` 数组快照。[I]

### cwd-scoped 路径

目录名：`--${cwd 去掉一个开头 / 或 \\，再把 / \\ : 换成 -}--`。[E: packages/agent/src/harness/session/jsonl/repo.ts:37]

文件名：`${ISO-8601 createdAt 把 : 与 . 换成 -}_${encodeURIComponent(id)}.jsonl`。[E: packages/agent/src/harness/session/jsonl/repo.ts:42]

同一 `{cwd, id}` 用 `${cwd}\0${id}` 作 `openSessions` / `pendingCreates` 键。目录编码有损（`/a/b` 与 `/a-b` 会撞名），因此 list 再按 header `cwd` 精确过滤。[E: packages/agent/src/harness/session/jsonl/repo.ts:349] [E: packages/agent/src/harness/session/jsonl/repo.ts:239]

`JsonlSessionMetadata` 在通用 `SessionMetadata` 上增加必填 `cwd` / `path` / `modifiedAt`。[E: packages/agent/src/harness/session/jsonl/types.ts:26]

## 控制流

1. `JsonlSessionRepo.create@packages/agent/src/harness/session/jsonl/repo.ts:63` 解析绝对 cwd，预约 `{cwd, id}`，组装 `v: 4` header，再 `JsonlStorage.create` 经 `publishJsonl` 原子写出 header（可带 initial writes）。[E: packages/agent/src/harness/session/jsonl/repo.ts:74] [E: packages/agent/src/harness/session/jsonl/storage.ts:67]
2. `open@packages/agent/src/harness/session/jsonl/repo.ts:95`：同一 key 已打开 → `Session is already open`；文件不存在 → `Session file does not exist`；header id/cwd 不匹配 → identity error；`storageVersion` 不对 → unsupported。[E: packages/agent/src/harness/session/jsonl/repo.ts:98] [E: packages/agent/src/harness/session/jsonl/repo.ts:356] [E: packages/agent/src/harness/session/jsonl/repo.ts:368]
3. `JsonlStorage.open@packages/agent/src/harness/session/jsonl/storage.ts:74` 先 `openTextLineReader` + `readJsonlHeader`。缺 header 或 header 非法抛 `Invalid JSONL storage …`；v4 再整文件 `readTextFile`，中间行 decode/apply 失败带 `line N`。[E: packages/agent/src/harness/session/jsonl/io.ts:27] [E: packages/agent/src/harness/session/jsonl/storage.ts:104]
4. 文件不以 `\n` 结尾视为 torn：把完整行重写成 `${lines.join("\n")}\n` 再 `publishFileAtomically` 覆盖。没有“只修最后一行 syntax”的旧路径。[E: packages/agent/src/harness/session/jsonl/storage.ts:30] [E: packages/agent/src/harness/session/jsonl/storage.ts:108]
5. 日常 `commit` 走 `commitQueue` → `applyCommit`：先 `appendFile` 事务行，再 `applyValidated`。空 writes 不落盘。[E: packages/agent/src/harness/session/jsonl/storage.ts:128] [E: packages/agent/src/harness/session/jsonl/storage.ts:143]
6. 打开 v3-legacy 时 `openLegacyV3` 把记录投影进内存，**不立刻改文件**。第一次非空 `commit` 才 `upgradeLegacyV3ToV4`：插入一条 `details.source = "v3-import"` 的 usage adjustment，再 `publishJsonl` 写出 v4 文件。[E: packages/agent/src/harness/session/jsonl/storage.ts:116] [E: packages/agent/src/harness/session/jsonl/storage.ts:139] [E: packages/agent/src/harness/session/jsonl/storage.ts:166]
7. `list@packages/agent/src/harness/session/jsonl/repo.ts:109` 枚举 cwd 目录（或整个 sessionsRoot 下的目录），只读每个 `.jsonl` 的第一行；parse 失败或空行 skip。结果按 `createdAt` 降序，再比 id / cwd。[E: packages/agent/src/harness/session/jsonl/repo.ts:249] [E: packages/agent/src/harness/session/jsonl/repo.ts:125]
8. `fork@packages/agent/src/harness/session/jsonl/repo.ts:146`：`resolveForkInput` 得到 `JsonlForkInput`，`runJsonlFork` 两趟（index 选 ancestry / 当前 scalar·list，再 stream 投影），`parentSessionId = source.id`，然后 `JsonlStorage.open`。[E: packages/agent/src/harness/session/jsonl/repo.ts:165] [E: packages/agent/src/harness/session/jsonl/repo.ts:176] [E: packages/agent/src/harness/session/jsonl/fork.ts:305]
9. `delete` 在会话未打开时 `remove(path)`；文件不存在抛错。不删 cwd 目录。[E: packages/agent/src/harness/session/jsonl/repo.ts:131] [E: packages/agent/src/harness/session/jsonl/repo.ts:140]
10. `close()` 只把 repo 标成 closed，随后 `Promise.resolve()`，**不**关闭已打开的 session handles（ownership 未定）。[E: packages/agent/src/harness/session/jsonl/repo.ts:198] [E: packages/agent/src/harness/session/jsonl/repo.ts:202] [U]

### `runJsonlFork` 两趟

第一趟 `indexForkInput` 只留 parent 链接、当前 scalar seq、list 存活起点、lane 清单，不带 entry payload。[E: packages/agent/src/harness/session/jsonl/fork.ts:227] [E: packages/agent/src/harness/session/jsonl/fork.ts:84]

`selectJsonlFork`：`scope: "tree"` 复制全部 entry；`scope: "branch"` 走共用的 `selectBranchFork`，并要求源 branch 同时有 `pi.lane.config` 与 `pi.lane.state`。[E: packages/agent/src/harness/session/jsonl/fork.ts:170] [E: packages/agent/src/harness/session/jsonl/fork.ts:177]

第二趟 `streamForkWrites` 再打开源文件（v3 则 `LegacyV3Source.writes`），`projectJsonlForkWrite` 丢掉 usage、非当前 scalar、已 delete 的 list 前缀，再经 `projectForkCurrentStateWrite` 处理 reserved namespace。[E: packages/agent/src/harness/session/jsonl/fork.ts:260] [E: packages/agent/src/harness/session/jsonl/fork.ts:185]

读事务时只接受 `terminated: true` 的完整行；事务不得跨过 `stopBeforeSeq`（否则 throw）。[E: packages/agent/src/harness/session/jsonl/fork.ts:64] [E: packages/agent/src/harness/session/jsonl/fork.ts:50]

destination header 写入源侧算出的 `nextSeq`，投影 write 保留原 seq；源文件两趟之间不得被替换或改写是调用约定，之后的 append 被 seq 边界或 legacy record count 排除。[E: packages/agent/src/harness/session/jsonl/fork.ts:318] [I]

v3 branch-scope 若带 `entryId`，先 `translateForkEntryId` 再 select。[E: packages/agent/src/harness/session/jsonl/fork.ts:307] [E: packages/agent/src/harness/session/jsonl/legacy-v3.ts:596]

### 原子 rename

`publishFileAtomically` 先把内容写到 `${destinationPath}.tmp`，再 `renameFile`。失败时 best-effort `remove(tempPath)`，并保留原始错误。[E: packages/agent/src/harness/session/jsonl/io.ts:87] [E: packages/agent/src/harness/session/jsonl/io.ts:101]

`publishJsonl` 在同一条路径上先写 header 行，再按事务 append。[E: packages/agent/src/harness/session/jsonl/io.ts:114]

当前调用点：`JsonlStorage.create`、torn-tail 修复（直接 `publishFileAtomically`）、`runJsonlFork`、v3→v4 升级。日常 append **不**走这条路径。[E: packages/agent/src/harness/session/jsonl/storage.ts:67] [E: packages/agent/src/harness/session/jsonl/storage.ts:109] [E: packages/agent/src/harness/session/jsonl/fork.ts:315] [E: packages/agent/src/harness/session/jsonl/storage.ts:175]

## 设计动机与权衡

磁盘是 durable truth，`InMemoryStorageState` 是每次 load 后的进程内投影。append-only 事务行保留完整 write 历史；branch tip、lane 配置、stats 都由 replay 得到。[E: packages/agent/src/harness/session/jsonl/storage.ts:46] [E: packages/agent/src/harness/session/jsonl/storage.ts:123] [I]

fork 改成两趟流式，是为了不把整个源文件物化成 snapshot 数组：index 只留选择所需的结构，copy 再投影。与 memory backend **共享** `selectBranchFork` / `projectForkCurrentStateWrite`，**不共享** IO。[E: packages/agent/src/harness/session/jsonl/fork.ts:9] [I]

`openSessions` + `pendingCreates` 挡住同进程对同一 `{cwd, id}` 的二次 create/open；失败后释放预约。这不是跨进程文件锁。[E: packages/agent/src/harness/session/jsonl/repo.ts:68] [E: packages/agent/src/harness/session/jsonl/repo.ts:98] [I]

## Gotcha

- list 会跳过坏 header；open 同一文件则抛。不要把 list 的“看不见”理解成文件已被删除。[E: packages/agent/src/harness/session/jsonl/repo.ts:249] [E: packages/agent/src/harness/session/jsonl/repo.ts:251]
- torn-tail 只修“最后没有换行”的物理截断。中间行坏 JSON 或 schema 非法，原样拒绝且不改文件。[E: packages/agent/src/harness/session/jsonl/storage.ts:102] [E: packages/agent/src/harness/session/jsonl/storage.ts:108]
- fork 读源时把 `terminated === false` 的末行当成 EOF 丢掉，与 `JsonlStorage.open` 的 torn-tail rewrite 不是同一条路径。[E: packages/agent/src/harness/session/jsonl/fork.ts:64] [E: packages/agent/src/harness/types.ts:256]
- 已打开的 legacy v3 不能 fork；未打开的 v3 文件可以，经 `LegacyV3Source`。[E: packages/agent/src/harness/session/jsonl/repo.ts:305] [E: packages/agent/src/harness/session/jsonl/repo.ts:313]
- `JsonlStorage` 的串行化是**每个 storage 实例**一条 `commitQueue`，不是跨进程、也不是 repo 级全局队列。两次 `open` 同一 path 会被 repo 拒绝，但绕过 repo 直接 `JsonlStorage.open` 仍会得到两份独立 state。[E: packages/agent/src/harness/session/jsonl/storage.ts:47] [E: packages/agent/src/harness/session/jsonl/repo.ts:98]
- filesystem 失败经 `fileValue` 变成 `Error(`${action}: ${message}`, { cause: FileError })`，不再映射 `SessionError("not_found" | "storage")`。[E: packages/agent/src/harness/session/jsonl/io.ts:16]
- 本节点不是 `pi-coding-agent` 的产品 session 文件实现。产品格式仍是 `type: "session", version: 3`；harness 可以只读投影它，但产品 `SessionManager` 不会走 `JsonlSessionRepo`。[E: packages/agent/src/harness/session/jsonl/codec.ts:21] [I]

## 跨包边界

`JsonlSessionRepo` / `JsonlStorage` 通过注入的 `FileSystem` 做 IO；本节点不绑定 Node `fs` 模块。行读取走 `FileSystem.openTextLineReader`。[E: packages/agent/src/harness/session/jsonl/types.ts:42] [E: packages/agent/src/harness/types.ts:286] [I]

契约层 commit/value/branch 语义与 fork 复制规则见 [subsys.agent-core.session-storage](session-storage.md)。branch 查询与 context 投影见 [subsys.agent-core.tree-navigation](tree-navigation.md)。

## Sources

- packages/agent/src/harness/session/jsonl/index.ts
- packages/agent/src/harness/session/jsonl/repo.ts
- packages/agent/src/harness/session/jsonl/storage.ts
- packages/agent/src/harness/session/jsonl/codec.ts
- packages/agent/src/harness/session/jsonl/types.ts
- packages/agent/src/harness/session/jsonl/legacy-v3.ts
- packages/agent/src/harness/session/jsonl/fork.ts
- packages/agent/src/harness/session/jsonl/io.ts
- packages/agent/src/harness/session/fork-policy.ts
- packages/agent/src/harness/types.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`SessionRepo` / `Storage` / `Session` 三层契约与 fork 复制/排除规则。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：`Branch`、`scanBranch`、context 构建。
- [ref.coding-agent.session-format](../../reference/session-format.md)：产品级 coding-agent session 文件格式（含历史 v3 header）。
