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
symbols:
  - JsonlSessionRepo
  - JsonlStorage
  - JsonlStorageHeader
  - JsonlSessionMetadata
  - parseJsonlSessionHeader
  - JSONL_FORMAT_VERSION
  - JSONL_STORAGE_VERSION
  - publishFileAtomically
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 9767ba275f
---

> `subsys.agent-core.jsonl-storage` 描述 `pi-agent-core` 的 durable JSONL 实现：公开 `JsonlSessionRepo` 返回 `StorageBackedSession`；每文件由 `JsonlStorage` 维护一份 `InMemoryStorageState`；首行是 `kind: "header", v: 4`，后续每行一条 `commit` 事务（单条 write 或 write 数组），fork / torn-tail / v3 升级经 `renameFile` 原子发布。

## 能回答的问题

- header 有哪些字段，`v` 不是 4 或 `storageVersion` 不是 1 时发生什么？
- cwd-scoped session id 如何映射到目录与文件名？
- create / open / list / delete / fork 各走哪些文件操作？
- 原子 `renameFile` 用在哪些路径，日常 append 为什么不走它？
- malformed header、torn tail、v3-legacy 分别如何表现？

## 职责边界

`jsonl/index.ts` 是公开再导出：露出 `JsonlSessionRepo`、`JsonlStorage` 与 JSONL 相关 type。[E: packages/agent/src/harness/session/jsonl/index.ts:1] [E: packages/agent/src/harness/session/jsonl/index.ts:2]

`JsonlSessionRepo` 实现 `SessionRepo<JsonlSessionMetadata, JsonlSessionCreateOptions, JsonlSessionListOptions>`，负责 cwd 目录、create 预约、以及把打开的文件包成 `StorageBackedSession`。[E: packages/agent/src/harness/session/jsonl/repo.ts:50] [E: packages/agent/src/harness/session/jsonl/repo.ts:67] [E: packages/agent/src/harness/session/jsonl/repo.ts:318]

`JsonlStorage` 实现 `Storage`：load 时把 header + 事务行重放到 `InMemoryStorageState`；写路径先 `appendFile` 再 `applyValidated`，并用 per-instance `commitQueue` 串行化。[E: packages/agent/src/harness/session/jsonl/storage.ts:125] [E: packages/agent/src/harness/session/jsonl/storage.ts:239] [E: packages/agent/src/harness/session/jsonl/storage.ts:253]

`codec.ts` 只解析 header（v4 或 v3-legacy）。事务行由 `storage.ts` 的 `parseTransaction` 解码。旧的 `jsonl/errors.ts` / `JsonlDecodeError` 已删除；失败是普通 `Error`，常以 `FileError` 为 `cause`。[E: packages/agent/src/harness/session/jsonl/codec.ts:53] [E: packages/agent/src/harness/session/jsonl/storage.ts:159] [E: packages/agent/src/harness/session/jsonl/storage.ts:34]

## 关键文件

- `packages/agent/src/harness/session/jsonl/types.ts`：`JsonlStorageHeader`、`JSONL_FORMAT_VERSION = 4`、`JSONL_STORAGE_VERSION = 1`、cwd-scoped create/list options。[E: packages/agent/src/harness/session/jsonl/types.ts:7] [E: packages/agent/src/harness/session/jsonl/types.ts:7]
- `packages/agent/src/harness/session/jsonl/codec.ts`：`parseJsonlSessionHeader` / `isJsonlStorageHeader` / `isLegacyV3SessionHeader`。[E: packages/agent/src/harness/session/jsonl/codec.ts:34] [E: packages/agent/src/harness/session/jsonl/codec.ts:53]
- `packages/agent/src/harness/session/jsonl/storage.ts`：`publishFileAtomically`、`JsonlStorage.create/open`、torn-tail 修复、v3 升级。[E: packages/agent/src/harness/session/jsonl/storage.ts:94] [E: packages/agent/src/harness/session/jsonl/storage.ts:144] [E: packages/agent/src/harness/session/jsonl/storage.ts:179]
- `packages/agent/src/harness/session/jsonl/repo.ts`：目录编码、list、create 预约、`openSessions` 互斥。[E: packages/agent/src/harness/session/jsonl/repo.ts:40] [E: packages/agent/src/harness/session/jsonl/repo.ts:221]
- `packages/agent/src/harness/session/jsonl/legacy-v3.ts`：把 `type: "session", version: 3` 投影成 v4 writes / header。[E: packages/agent/src/harness/session/jsonl/legacy-v3.ts:1]

## 数据模型

### Header（format 4 / storageVersion 1）

`JsonlStorageHeader` 固定 `kind: "header"`、`v: 4`，并带 `id`、`storageVersion`、`createdAt`、`cwd`；可选 `parentSessionId`、`legacyParentSessionPath`、`nextSeq`。[E: packages/agent/src/harness/session/jsonl/types.ts:7] [E: packages/agent/src/harness/session/jsonl/types.ts:8]

`isJsonlStorageHeader()` 要求 `v === 4`、`storageVersion >= 1` 的 safe integer、`createdAt >= 0`。`parseJsonlSessionHeader()` 先认 v4，再认 `type: "session", version: 3` 的 legacy；其它返回 `err`。[E: packages/agent/src/harness/session/jsonl/codec.ts:38] [E: packages/agent/src/harness/session/jsonl/codec.ts:60] [E: packages/agent/src/harness/session/jsonl/codec.ts:62]

`open` 在 header 已是 v4 时还要求 `storageVersion === JSONL_STORAGE_VERSION`（当前 1），否则抛 unsupported storage version。[E: packages/agent/src/harness/session/jsonl/storage.ts:197] [E: packages/agent/src/harness/session/jsonl/repo.ts:349]

### 事务行

`parseTransaction()` 把一行 JSON 解成 `CommittedWrite[]`：根值是数组则逐条，否则当作单条 write。每条必须有 `kind ∈ {entry, usage, value, list}` 与 `seq >= 1`。[E: packages/agent/src/harness/session/jsonl/storage.ts:159] [E: packages/agent/src/harness/session/jsonl/storage.ts:47] [E: packages/agent/src/harness/session/jsonl/storage.ts:50]

`serializeTransaction()`：一条 write 写成对象，多条写成数组。[E: packages/agent/src/harness/session/jsonl/storage.ts:79]

### cwd-scoped 路径

目录名：`--${cwd 去掉一个开头 / 或 \\，再把 / \\ : 换成 -}--`。[E: packages/agent/src/harness/session/jsonl/repo.ts:41]

文件名：`${ISO-8601 createdAt 把 : 与 . 换成 -}_${encodeURIComponent(id)}.jsonl`。[E: packages/agent/src/harness/session/jsonl/repo.ts:45]

同一 `{cwd, id}` 用 `${cwd}\0${id}` 作 `openSessions` / `pendingCreates` 键。目录编码有损（`/a/b` 与 `/a-b` 会撞名），因此 list 再按 header `cwd` 精确过滤。[E: packages/agent/src/harness/session/jsonl/repo.ts:327] [E: packages/agent/src/harness/session/jsonl/repo.ts:240]

`JsonlSessionMetadata` 在通用 `SessionMetadata` 上增加必填 `cwd` / `path` / `modifiedAt`。[E: packages/agent/src/harness/session/jsonl/types.ts:26]

## 控制流

1. `JsonlSessionRepo.create@packages/agent/src/harness/session/jsonl/repo.ts:67` 解析绝对 cwd，预约 `{cwd, id}`，组装 `v: 4` header，再 `JsonlStorage.create` 原子写出 header（可带 initial writes）。[E: packages/agent/src/harness/session/jsonl/repo.ts:78] [E: packages/agent/src/harness/session/jsonl/storage.ts:153]
2. `open@packages/agent/src/harness/session/jsonl/repo.ts:99`：同一 key 已打开 → `Session is already open`；文件不存在 → `Session file does not exist`；header id/cwd 不匹配 → identity error；`storageVersion` 不对 → unsupported。[E: packages/agent/src/harness/session/jsonl/repo.ts:102] [E: packages/agent/src/harness/session/jsonl/repo.ts:335] [E: packages/agent/src/harness/session/jsonl/repo.ts:346]
3. `JsonlStorage.open@packages/agent/src/harness/session/jsonl/storage.ts:179` 按完整行 replay。缺 header 或 header 非法抛 `Invalid JSONL storage …`；中间行 decode/apply 失败带 `line N`。[E: packages/agent/src/harness/session/jsonl/storage.ts:186] [E: packages/agent/src/harness/session/jsonl/storage.ts:206]
4. 文件不以 `\n` 结尾视为 torn：把完整行重写成 `${lines.join("\n")}\n` 再 `renameFile` 覆盖。没有“只修最后一行 syntax”的旧路径。[E: packages/agent/src/harness/session/jsonl/storage.ts:87] [E: packages/agent/src/harness/session/jsonl/storage.ts:210]
5. 日常 `commit` 走 `commitQueue` → `applyCommit`：先 `appendFile` 事务行，再 `applyValidated`。空 writes 不落盘。[E: packages/agent/src/harness/session/jsonl/storage.ts:253] [E: packages/agent/src/harness/session/jsonl/storage.ts:256]
6. 打开 v3-legacy 时 `openLegacyV3` 把记录投影进内存，**不立刻改文件**。第一次非空 `commit` 才 `upgradeLegacyV3ToV4`：插入一条 `details.source = "v3-import"` 的 usage adjustment，再原子写出 v4 文件。[E: packages/agent/src/harness/session/jsonl/storage.ts:192] [E: packages/agent/src/harness/session/jsonl/storage.ts:250] [E: packages/agent/src/harness/session/jsonl/storage.ts:277]
7. `list@packages/agent/src/harness/session/jsonl/repo.ts:113` 枚举 cwd 目录（或整个 sessionsRoot 下的目录），只读每个 `.jsonl` 的第一行；parse 失败或空行 skip。结果按 `createdAt` 降序，再比 id / cwd。[E: packages/agent/src/harness/session/jsonl/repo.ts:250] [E: packages/agent/src/harness/session/jsonl/repo.ts:129]
8. `fork@packages/agent/src/harness/session/jsonl/repo.ts:150` 从已打开 storage 或只读 load 取 snapshot，`createForkSnapshot` 后 `JsonlStorage.createFromForkSnapshot` 原子发布，`parentSessionId = source.id`。[E: packages/agent/src/harness/session/jsonl/repo.ts:172] [E: packages/agent/src/harness/session/jsonl/storage.ts:159]
9. `delete` 在会话未打开时 `remove(path)`；文件不存在抛错。不删 cwd 目录。[E: packages/agent/src/harness/session/jsonl/repo.ts:135] [E: packages/agent/src/harness/session/jsonl/repo.ts:142]
10. `close()` 只把 repo 标成 closed，随后 `Promise.resolve()`，**不**关闭已打开的 session handles（ownership 未定）。[E: packages/agent/src/harness/session/jsonl/repo.ts:201] [E: packages/agent/src/harness/session/jsonl/repo.ts:203] [U]

### 原子 rename

`publishFileAtomically` 先把完整内容写到 `${destinationPath}.tmp`，再 `renameFile`。失败时 best-effort `remove(tempPath)`，并保留原始错误。[E: packages/agent/src/harness/session/jsonl/storage.ts:100] [E: packages/agent/src/harness/session/jsonl/storage.ts:107]

当前调用点：`JsonlStorage.create`、torn-tail 修复、`createFromForkSnapshot`、v3→v4 升级。日常 append **不**走这条路径。[E: packages/agent/src/harness/session/jsonl/storage.ts:153] [E: packages/agent/src/harness/session/jsonl/storage.ts:210] [E: packages/agent/src/harness/session/jsonl/storage.ts:256]

## 设计动机与权衡

磁盘是 durable truth，`InMemoryStorageState` 是每次 load 后的进程内投影。append-only 事务行保留完整 write 历史；branch tip、lane 配置、stats 都由 replay 得到。[E: packages/agent/src/harness/session/jsonl/storage.ts:131] [E: packages/agent/src/harness/session/jsonl/storage.ts:234] [I]

`openSessions` + `pendingCreates` 挡住同进程对同一 `{cwd, id}` 的二次 create/open；失败后释放预约。这不是跨进程文件锁。[E: packages/agent/src/harness/session/jsonl/repo.ts:72] [E: packages/agent/src/harness/session/jsonl/repo.ts:102] [I]

## Gotcha

- list 会跳过坏 header；open 同一文件则抛。不要把 list 的“看不见”理解成文件已被删除。[E: packages/agent/src/harness/session/jsonl/repo.ts:250] [E: packages/agent/src/harness/session/jsonl/repo.ts:252]
- torn-tail 只修“最后没有换行”的物理截断。中间行坏 JSON 或 schema 非法，原样拒绝且不改文件。[E: packages/agent/src/harness/session/jsonl/storage.ts:205] [E: packages/agent/src/harness/session/jsonl/storage.ts:210]
- `JsonlStorage` 的串行化是**每个 storage 实例**一条 `commitQueue`，不是跨进程、也不是 repo 级全局队列。两次 `open` 同一 path 会被 repo 拒绝，但绕过 repo 直接 `JsonlStorage.open` 仍会得到两份独立 state。[E: packages/agent/src/harness/session/jsonl/storage.ts:132] [E: packages/agent/src/harness/session/jsonl/repo.ts:102]
- filesystem 失败经 `fileValue` 变成 `Error(`${action}: ${message}`, { cause: FileError })`，不再映射 `SessionError("not_found" | "storage")`。[E: packages/agent/src/harness/session/jsonl/repo.ts:20]
- 本节点不是 `pi-coding-agent` 的产品 session 文件实现。产品格式仍是 `type: "session", version: 3`；harness 可以只读投影它，但产品 `SessionManager` 不会走 `JsonlSessionRepo`。[E: packages/agent/src/harness/session/jsonl/codec.ts:21] [I]

## 跨包边界

`JsonlSessionRepo` / `JsonlStorage` 通过注入的 `FileSystem` 做 IO；本节点不绑定 Node `fs` 模块。[E: packages/agent/src/harness/session/jsonl/types.ts:42] [I]

契约层 commit/value/branch 语义见 [subsys.agent-core.session-storage](session-storage.md)。branch 查询与 context 投影见 [subsys.agent-core.tree-navigation](tree-navigation.md)。

## Sources

- packages/agent/src/harness/session/jsonl/index.ts
- packages/agent/src/harness/session/jsonl/repo.ts
- packages/agent/src/harness/session/jsonl/storage.ts
- packages/agent/src/harness/session/jsonl/codec.ts
- packages/agent/src/harness/session/jsonl/types.ts
- packages/agent/src/harness/session/jsonl/legacy-v3.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`SessionRepo` / `Storage` / `Session` 三层契约。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：`Branch`、`scanBranch`、context 构建。
- [ref.coding-agent.session-format](../../reference/session-format.md)：产品级 coding-agent session 文件格式（含历史 v3 header）。
