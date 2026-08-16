---
id: subsys.agent-core.jsonl-storage
title: JSONL v4 会话仓库(JsonlSessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/jsonl.ts
  - packages/agent/src/harness/session/jsonl/repo.ts
  - packages/agent/src/harness/session/jsonl/storage.ts
  - packages/agent/src/harness/session/jsonl/codec.ts
  - packages/agent/src/harness/session/jsonl/errors.ts
  - packages/agent/src/harness/session/jsonl/types.ts
symbols:
  - JsonlSessionRepo
  - JsonlSessionStorage
  - JsonlV4Header
  - JsonlSessionMetadata
  - JsonlDecodeError
  - parseHeader
  - encodeHeader
  - parseMutation
  - encodeMutation
  - publishFileAtomically
related:
  - subsys.agent-core.session-storage
  - subsys.agent-core.tree-navigation
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.jsonl-storage` 描述 `pi-agent-core` 的 durable JSONL v4 实现：公开 `JsonlSessionRepo` 返回 `Session`；每文件由 `JsonlSessionStorage` 维护一份 `SessionState`；首行是 `kind: "header", version: 4`，后续每行一条 mutation，fork / torn-tail 修复经 `renameFile` 原子发布。

## 能回答的问题

- v4 header 有哪些字段，`version` 不是 4 时发生什么？
- cwd-scoped session id 如何映射到目录与文件名？
- create / open / list / delete / fork 各走哪些文件操作？
- 原子 `renameFile` 用在哪些路径，append 为什么不走它？
- malformed header、torn tail、中间坏行分别如何表现？

## 职责边界

`jsonl.ts` 是公开再导出：只露出 `JsonlSessionRepo` 与 JSONL 相关 type，不导出 `JsonlSessionStorage`、codec 或 error helper。[E: packages/agent/src/harness/session/jsonl.ts:1] [E: packages/agent/src/harness/session/jsonl.ts:2]

`JsonlSessionRepo` 实现 `SessionRepo<JsonlSessionMetadata, JsonlSessionCreateOptions, JsonlSessionListOptions>`，负责 cwd 目录、id 校验、create 目的地预约、以及把打开的文件包成 `Session`。[E: packages/agent/src/harness/session/jsonl/repo.ts:109] [E: packages/agent/src/harness/session/jsonl/repo.ts:122] [E: packages/agent/src/harness/session/jsonl/repo.ts:130]

`JsonlSessionStorage` 实现 `SessionStorage<JsonlSessionMetadata>`：load 时把 header + mutation 重放到 `SessionState`；写路径先 `appendFile` 再 `applyMutation`，并用 per-instance `tail` Promise 串行化。[E: packages/agent/src/harness/session/jsonl/storage.ts:48] [E: packages/agent/src/harness/session/jsonl/storage.ts:69] [E: packages/agent/src/harness/session/jsonl/storage.ts:165] [E: packages/agent/src/harness/session/jsonl/storage.ts:258]

`codec.ts` 负责 header/mutation 的 encode/decode；`errors.ts` 把 `FileError` 与 decode 失败转成 `SessionError`。[E: packages/agent/src/harness/session/jsonl/codec.ts:102] [E: packages/agent/src/harness/session/jsonl/codec.ts:220] [E: packages/agent/src/harness/session/jsonl/errors.ts:4] [E: packages/agent/src/harness/session/jsonl/errors.ts:14]

## 关键文件

- `packages/agent/src/harness/session/jsonl/types.ts`：`JsonlV4Header`、`JsonlSessionMetadata`、cwd-scoped create/list options、`JsonlSessionRepoFileSystem`（含 `renameFile`）。[E: packages/agent/src/harness/session/jsonl/types.ts:4] [E: packages/agent/src/harness/session/jsonl/types.ts:47]
- `packages/agent/src/harness/session/jsonl/codec.ts`：`parseHeader` / `encodeHeader` / `parseMutation` / `encodeMutation`。[E: packages/agent/src/harness/session/jsonl/codec.ts:111] [E: packages/agent/src/harness/session/jsonl/codec.ts:229]
- `packages/agent/src/harness/session/jsonl/storage.ts`：`publishFileAtomically`、`JsonlSessionStorage.create/load/fork`、torn-tail 修复。[E: packages/agent/src/harness/session/jsonl/storage.ts:33] [E: packages/agent/src/harness/session/jsonl/storage.ts:59] [E: packages/agent/src/harness/session/jsonl/storage.ts:69]
- `packages/agent/src/harness/session/jsonl/repo.ts`：目录编码、id 校验、`listJsonlSessionMetadata`、create 预约。[E: packages/agent/src/harness/session/jsonl/repo.ts:16] [E: packages/agent/src/harness/session/jsonl/repo.ts:27] [E: packages/agent/src/harness/session/jsonl/repo.ts:65]
- `packages/agent/src/harness/session/jsonl/errors.ts`：`JsonlDecodeError`（`syntax` | `schema`）、`fileResult`、`invalidFile`。[E: packages/agent/src/harness/session/jsonl/errors.ts:5] [E: packages/agent/src/harness/session/jsonl/errors.ts:25]

## 数据模型

### Header（version 4）

`JsonlV4Header` 固定 `kind: "header"`、`version: 4`，并带 `id`、`createdAt`、`cwd`；可选 `parentSessionId`、`legacyParentSessionPath`、`metadata`。[E: packages/agent/src/harness/session/jsonl/types.ts:47] [E: packages/agent/src/harness/session/jsonl/types.ts:49]

`parseHeader()` 要求 JSON object、`kind === "header"`、`version === 4`。`parentSessionId` 与 `legacyParentSessionPath` 不能同时出现；`metadata` 若存在必须是非数组 object。[E: packages/agent/src/harness/session/jsonl/codec.ts:72] [E: packages/agent/src/harness/session/jsonl/codec.ts:73] [E: packages/agent/src/harness/session/jsonl/codec.ts:82] [E: packages/agent/src/harness/session/jsonl/codec.ts:86]

`metadataFromHeader()` 把 header 投影成 `JsonlSessionMetadata`，并**写死** `sourceFormat: 4`。类型上 `sourceFormat` 是 `3 | 4`，但本实现的 encode/load 路径从不写入 `3`。[E: packages/agent/src/harness/session/jsonl/codec.ts:115] [E: packages/agent/src/harness/session/jsonl/codec.ts:122] [E: packages/agent/src/harness/session/jsonl/types.ts:31] [U]

`legacyParentSessionPath` 注释说明：仅当 v3 parent path 无法解析成 session id 时保留。本包 codec 会读写该字段，但 `JsonlSessionRepo.create` / `prepareCreate` 只写 `parentSessionId`，不从 v3 文件转换。[E: packages/agent/src/harness/session/jsonl/types.ts:55] [E: packages/agent/src/harness/session/jsonl/repo.ts:215] [U]

### Mutation 行

`parseMutation()` 读 `kind`：`entry` / `record` / `lane` / `fact`。`seq` 必须是正的 safe integer；未知 kind 或未知 entry/record type 是 schema 错误。[E: packages/agent/src/harness/session/jsonl/codec.ts:205] [E: packages/agent/src/harness/session/jsonl/codec.ts:49] [E: packages/agent/src/harness/session/jsonl/codec.ts:216]

`ENTRY_TYPES` 与 `RECORD_TYPES` 分别对应 v4 `Entry` / `LaneRecord` 的 7 + 9 个 discriminator。`operation_started` 还校验 `intent.kind ∈ {run, compaction, navigation}`。[E: packages/agent/src/harness/session/jsonl/codec.ts:7] [E: packages/agent/src/harness/session/jsonl/codec.ts:16] [E: packages/agent/src/harness/session/jsonl/codec.ts:27] [E: packages/agent/src/harness/session/jsonl/codec.ts:157]

`encodeMutation()` 对 entry 写出 `{ kind: "entry", lane, ...entry }`：`lane` 可缺省。fork 复制出的 entry 行不带 `lane`，因此 replay 时不会推动任何 lane leaf。[E: packages/agent/src/harness/session/jsonl/codec.ts:231] [E: packages/agent/src/harness/session/jsonl/codec.ts:132]

### cwd-scoped 路径

目录名：`--${cwd 去掉一个开头 / 或 \\，再把 / \\ : 换成 -}--`。[E: packages/agent/src/harness/session/jsonl/repo.ts:27] [E: packages/agent/src/harness/session/jsonl/repo.ts:28]

文件名：`${ISO-8601 createdAt 把 : 与 . 换成 -}_${id}.jsonl`。[E: packages/agent/src/harness/session/jsonl/repo.ts:104] [E: packages/agent/src/harness/session/jsonl/repo.ts:106]

session id 必须匹配 `^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$`，否则 `invalid_payload`。同一 id 可以出现在不同 cwd 目录里。[E: packages/agent/src/harness/session/jsonl/repo.ts:16] [E: packages/agent/src/harness/session/jsonl/repo.ts:18] [E: packages/agent/src/harness/session/jsonl/repo.ts:226]

`JsonlSessionMetadata` 在通用 `SessionMetadata` 上增加 `cwd`、`path`、`modifiedAt`、`sourceFormat`、可选 `legacyParentSessionPath` 与 application `metadata`。[E: packages/agent/src/harness/session/jsonl/types.ts:26]

## 控制流

1. `JsonlSessionRepo.create@packages/agent/src/harness/session/jsonl/repo.ts:122` 解析 cwd、校验 id，再 `claimCreateDestination` 防止同进程对同一 `{cwd, id}` 并发 create/fork。[E: packages/agent/src/harness/session/jsonl/repo.ts:123] [E: packages/agent/src/harness/session/jsonl/repo.ts:178]
2. `prepareCreate@packages/agent/src/harness/session/jsonl/repo.ts:190` 用 `_${id}.jsonl` 后缀扫目录判重，组装 `version: 4` header，`createDir({ recursive: true })`，然后 `JsonlSessionStorage.create` 直接 `writeFile` header。[E: packages/agent/src/harness/session/jsonl/repo.ts:198] [E: packages/agent/src/harness/session/jsonl/repo.ts:209] [E: packages/agent/src/harness/session/jsonl/repo.ts:218] [E: packages/agent/src/harness/session/jsonl/storage.ts:64]
3. `JsonlSessionRepo.open@packages/agent/src/harness/session/jsonl/repo.ts:130` 调 `loadJsonlSessionStorage`：文件不存在 → `not_found`；load 后 header id 与传入 metadata.id 不一致 → `invalid_entry`。[E: packages/agent/src/harness/session/jsonl/repo.ts:93] [E: packages/agent/src/harness/session/jsonl/repo.ts:98]
4. `JsonlSessionStorage.load@packages/agent/src/harness/session/jsonl/storage.ts:69` 按物理行解析。缺 header 或非尾部 decode/apply 失败 → `invalidFile`（`SessionError("invalid_entry", ... line N ...)`）。[E: packages/agent/src/harness/session/jsonl/storage.ts:74] [E: packages/agent/src/harness/session/jsonl/storage.ts:93] [E: packages/agent/src/harness/session/jsonl/errors.ts:26]
5. 最后一行且 `JsonlDecodeError.kind === "syntax"` 视为 torn tail：把合法前缀写到 `path.tmp`，再 `renameFile` 覆盖原文件。schema 错误的完整尾行不修复。[E: packages/agent/src/harness/session/jsonl/storage.ts:84] [E: packages/agent/src/harness/session/jsonl/storage.ts:88]
6. 文件不以 `\n` 结尾时，load 成功后 `appendFile("\n")` 补换行；补写失败则 open 失败（`storage`）。[E: packages/agent/src/harness/session/jsonl/storage.ts:104] [E: packages/agent/src/harness/session/jsonl/storage.ts:105]
7. 日常 write（`appendEntry` / `appendRecord` / lane / fact）走 `enqueue` → `appendMutation` → `applyMutation`：先落盘再更新内存。storage 在 `operation_started` 时拒绝同一 lane 的第二个 open operation。[E: packages/agent/src/harness/session/jsonl/storage.ts:165] [E: packages/agent/src/harness/session/jsonl/storage.ts:176] [E: packages/agent/src/harness/session/jsonl/storage.ts:267]
8. `listJsonlSessionMetadata@packages/agent/src/harness/session/jsonl/repo.ts:65` 枚举 cwd 目录（或整个 sessionsRoot 下的目录/symlink），只读每个 `.jsonl` 的第一行；parse 失败或空行 **skip**，不让整个 list 失败。结果按 `modifiedAt` 降序。[E: packages/agent/src/harness/session/jsonl/repo.ts:80] [E: packages/agent/src/harness/session/jsonl/repo.ts:82] [E: packages/agent/src/harness/session/jsonl/repo.ts:86]
9. `fork@packages/agent/src/harness/session/jsonl/repo.ts:142` 默认 `parentSessionId = source.id`，在预约目的地后调用 `sourceStorage.fork`：`createForkMutations` → 在 tmp 上 create+append → `renameFile` 发布 → 再 `load` 目标文件。[E: packages/agent/src/harness/session/jsonl/repo.ts:149] [E: packages/agent/src/harness/session/jsonl/storage.ts:110] [E: packages/agent/src/harness/session/jsonl/storage.ts:112]
10. `delete` 是 `remove(path, { force: true })`，不删 cwd 目录。[E: packages/agent/src/harness/session/jsonl/repo.ts:138]

### 原子 rename

`publishFileAtomically` 先让 callback 把完整内容写到 `${destinationPath}.tmp`，再 `fs.renameFile(tempPath, destinationPath)`。失败时 best-effort `remove(tempPath)`，并保留原始错误。同一 destination 的 publish 必须串行，因为 tmp 路径是确定的。[E: packages/agent/src/harness/session/jsonl/storage.ts:38] [E: packages/agent/src/harness/session/jsonl/storage.ts:41] [E: packages/agent/src/harness/session/jsonl/storage.ts:43]

当前调用点：torn-tail 修复、`JsonlSessionStorage.fork`。普通 append 与首次 `create` 的 header `writeFile` **不**走这条路径。[E: packages/agent/src/harness/session/jsonl/storage.ts:88] [E: packages/agent/src/harness/session/jsonl/storage.ts:112] [E: packages/agent/src/harness/session/jsonl/storage.ts:64]

## 设计动机与权衡

磁盘是 durable truth，`SessionState` 是每次 load 后的进程内投影。append-only mutation 行保留完整历史；lane leaf、name、label、stats、open operations 都由 replay 得到，而不是单独的 sidecar 文件。[E: packages/agent/src/harness/session/jsonl/storage.ts:80] [E: packages/agent/src/harness/session/jsonl/storage.ts:267] [I]

create 用确定性 `{timestamp}_{id}.jsonl` 文件名，所以仅靠 filesystem exists 无法挡住“同一毫秒两个 create 都认为 id 空闲”。`activeCreateDestinations` 用 `${cwd}\0${id}` 做同进程互斥；失败后会释放预约，允许重试。[E: packages/agent/src/harness/session/jsonl/repo.ts:178] [E: packages/agent/src/harness/session/jsonl/repo.ts:186] [I]

## Gotcha

- list 会跳过坏 header；open 同一文件则抛 `invalid_entry`。不要把 list 的“看不见”理解成文件已被删除。[E: packages/agent/src/harness/session/jsonl/repo.ts:80] [E: packages/agent/src/harness/session/jsonl/repo.ts:82]
- torn-tail 只修**最后一行的 syntax** 错误。中间行坏 JSON、或最后一行是完整但 schema/mutation 非法，都原样拒绝且不改文件。[E: packages/agent/src/harness/session/jsonl/storage.ts:84] [E: packages/agent/src/harness/session/jsonl/storage.ts:93]
- 无 `lane` 字段的 entry mutation 会进入 tree，但不会移动任何 lane。fork 写出的 entry 正是这种形态；导入后 `main.leafId` 仍为 `null`，直到后续 lane mutation。[E: packages/agent/src/harness/session/jsonl/codec.ts:132] [E: packages/agent/src/harness/session/jsonl/codec.ts:143]
- `JsonlSessionStorage` 的串行化是**每个 storage 实例**一条 `tail` 链，不是跨进程、也不是 repo 级全局队列。两次 `open` 同一 path 会得到两份独立 state。[E: packages/agent/src/harness/session/jsonl/storage.ts:52] [E: packages/agent/src/harness/session/jsonl/storage.ts:258]
- filesystem 的 `not_found` 被 `fileResult` 映射为 `SessionError("not_found")`，其它 `FileError` 映射为 `"storage"`。[E: packages/agent/src/harness/session/jsonl/errors.ts:16]
- 本节点不是 `pi-coding-agent` 的产品 session 文件实现。coding-agent 测试里仍可见 `type: "session", version: 3` 的旧 header；那条格式由 [ref.coding-agent.session-format](../../reference/session-format.md) 覆盖，不由 `parseHeader()` 接受。[E: packages/agent/src/harness/session/jsonl/codec.ts:73] [I]

## 跨包边界

`JsonlSessionRepoFileSystem` 是 `FileSystem` 的子集，实际 FS 操作由 `@earendil-works/pi-agent-core` 的 `ExecutionEnv`（例如 `NodeExecutionEnv`）注入；本节点不绑定 Node `fs` 模块。[E: packages/agent/src/harness/session/jsonl/types.ts:4] [I]

契约层 lane/entry/record/fact 语义见 [subsys.agent-core.session-storage](session-storage.md)。branch 查询与 context 投影见 [subsys.agent-core.tree-navigation](tree-navigation.md)。

## Sources

- packages/agent/src/harness/session/jsonl.ts
- packages/agent/src/harness/session/jsonl/repo.ts
- packages/agent/src/harness/session/jsonl/storage.ts
- packages/agent/src/harness/session/jsonl/codec.ts
- packages/agent/src/harness/session/jsonl/errors.ts
- packages/agent/src/harness/session/jsonl/types.ts

## 相关

- [subsys.agent-core.session-storage](session-storage.md)：`SessionRepo` / `SessionStorage` / `Session` 三层契约。
- [subsys.agent-core.tree-navigation](tree-navigation.md)：lane view、branch walk、context 构建。
- [ref.coding-agent.session-format](../../reference/session-format.md)：产品级 coding-agent session 文件格式（含历史 v3 header）。
