---
id: subsys.agent-core.jsonl-storage
title: JSONL 会话存储
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/session/jsonl-storage.ts
  - packages/agent/src/harness/session/jsonl-repo.ts
symbols:
  - JsonlSessionStorage
  - JsonlSessionRepo
  - SessionHeader
related:
  - subsys.agent-core.session-storage
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.jsonl-storage` 描述 `pi-agent` harness 的 durable JSONL session backend: `JsonlSessionStorage` 管一个 append-only session 文件,`JsonlSessionRepo` 管按 cwd 分目录的 session 文件集合。

## 能回答的问题

- JSONL session 文件第一行的 `SessionHeader` 必须有哪些字段?
- `JsonlSessionStorage.open()` 如何读取 header、entry 和当前 leaf?
- `appendEntry()`、`setLeafId()` 写入磁盘后如何更新内存索引?
- `JsonlSessionRepo.create()`、`list()`、`open()`、`delete()`、`fork()` 分别做什么?
- JSONL storage/repo 哪些错误会被抛出,哪些坏文件会被 list 跳过?

## 职责边界

`JsonlSessionStorage` 是单文件 backend: 它只需要 `readTextFile`、`readTextLines`、`writeFile`、`appendFile` 四个 filesystem 能力,并实现 `SessionStorage<JsonlSessionMetadata>`。[E: packages/agent/src/harness/session/jsonl-storage.ts:6] [E: packages/agent/src/harness/session/jsonl-storage.ts:161] 它维护 `metadata`、`entries`、`byId`、`labelsById`、`currentLeafId`,所以单个已打开 session 的读写和 tree 导航都在 storage 内完成。[E: packages/agent/src/harness/session/jsonl-storage.ts:164] [E: packages/agent/src/harness/session/jsonl-storage.ts:165] [E: packages/agent/src/harness/session/jsonl-storage.ts:166] [E: packages/agent/src/harness/session/jsonl-storage.ts:167] [E: packages/agent/src/harness/session/jsonl-storage.ts:168]

`JsonlSessionRepo` 是多文件 repo backend: 它额外需要 `cwd`、`absolutePath`、`joinPath`、`listDir`、`exists`、`createDir`、`remove` 等 filesystem 能力,并实现 `JsonlSessionRepoApi`。[E: packages/agent/src/harness/session/jsonl-repo.ts:19] [E: packages/agent/src/harness/session/jsonl-repo.ts:38] repo 不直接解释 entry tree;创建、打开和 fork 时都把单文件读写交给 `JsonlSessionStorage`。[E: packages/agent/src/harness/session/jsonl-repo.ts:84] [E: packages/agent/src/harness/session/jsonl-repo.ts:98] [E: packages/agent/src/harness/session/jsonl-repo.ts:146]

## File Format

JSONL 文件的 header 必须是 `SessionHeader`:完整 open path 会把过滤空白行后的第一行当作 header;repo list path 只读物理第一行,所以空文件或第一行空白会被当作 missing header。header 的 shape 是 `{ type: "session", version: 3, id, timestamp, cwd, parentSession? }`,其中 `type` 固定为 `"session"`,`version` 固定为 `3`,`id`、`timestamp`、`cwd` 是非空 string,`parentSession` 如果存在也必须是 string。[E: packages/agent/src/harness/session/jsonl-storage.ts:8] [E: packages/agent/src/harness/session/jsonl-storage.ts:9] [E: packages/agent/src/harness/session/jsonl-storage.ts:10] [E: packages/agent/src/harness/session/jsonl-storage.ts:11] [E: packages/agent/src/harness/session/jsonl-storage.ts:12] [E: packages/agent/src/harness/session/jsonl-storage.ts:13] [E: packages/agent/src/harness/session/jsonl-storage.ts:14] [E: packages/agent/src/harness/session/jsonl-storage.ts:127] [E: packages/agent/src/harness/session/jsonl-storage.ts:128] [E: packages/agent/src/harness/session/jsonl-storage.ts:131] [E: packages/agent/src/harness/session/jsonl-storage.ts:132] [E: packages/agent/src/harness/session/jsonl-storage.ts:133] [E: packages/agent/src/harness/session/jsonl-storage.ts:145] [E: packages/agent/src/harness/session/jsonl-storage.ts:150] [E: packages/agent/src/harness/session/jsonl-storage.ts:67] [E: packages/agent/src/harness/session/jsonl-storage.ts:68] [E: packages/agent/src/harness/session/jsonl-storage.ts:69] [E: packages/agent/src/harness/session/jsonl-storage.ts:70] [E: packages/agent/src/harness/session/jsonl-storage.ts:73] [E: packages/agent/src/harness/session/jsonl-storage.ts:74]

Header 之后的每条非空行是 `SessionTreeEntry`。entry parser 要求 JSON object、string `type`、非空 string `id`、`parentId` 为 null 或 string、非空 string `timestamp`;如果 entry 是 `leaf`,`targetId` 必须是 null 或 string。[E: packages/agent/src/harness/session/jsonl-storage.ts:87] [E: packages/agent/src/harness/session/jsonl-storage.ts:90] [E: packages/agent/src/harness/session/jsonl-storage.ts:94] [E: packages/agent/src/harness/session/jsonl-storage.ts:95] [E: packages/agent/src/harness/session/jsonl-storage.ts:96] [E: packages/agent/src/harness/session/jsonl-storage.ts:97] [E: packages/agent/src/harness/session/jsonl-storage.ts:100] [E: packages/agent/src/harness/session/jsonl-storage.ts:103] [E: packages/agent/src/harness/session/jsonl-storage.ts:106]

`parentSession` 在 storage metadata 中改名为 `parentSessionPath`;header 的 `id`、`timestamp`、`cwd`、file path 分别映射为 `JsonlSessionMetadata.id`、`createdAt`、`cwd`、`path`。[E: packages/agent/src/harness/session/jsonl-storage.ts:113] [E: packages/agent/src/harness/session/jsonl-storage.ts:115] [E: packages/agent/src/harness/session/jsonl-storage.ts:116] [E: packages/agent/src/harness/session/jsonl-storage.ts:117] [E: packages/agent/src/harness/session/jsonl-storage.ts:118] [E: packages/agent/src/harness/session/jsonl-storage.ts:119]

## Header Read Path

`loadJsonlSessionMetadata()` 是 list-friendly header reader: 它只调用 `readTextLines(filePath, { maxLines: 1 })`,解析第一行并返回 metadata;如果第一行为空或不存在,抛 `invalid_session` 的 missing header 错误。[E: packages/agent/src/harness/session/jsonl-storage.ts:123] [E: packages/agent/src/harness/session/jsonl-storage.ts:127] [E: packages/agent/src/harness/session/jsonl-storage.ts:128] [E: packages/agent/src/harness/session/jsonl-storage.ts:131] [E: packages/agent/src/harness/session/jsonl-storage.ts:132] [E: packages/agent/src/harness/session/jsonl-storage.ts:133]

`JsonlSessionStorage.open()` 走完整文件读取: `loadJsonlStorage()` 用 `readTextFile()` 读取整个文件,按 `"\n"` split 后过滤空白行,要求至少有一行 header,再从第 2 行开始逐行 parse entry。[E: packages/agent/src/harness/session/jsonl-storage.ts:136] [E: packages/agent/src/harness/session/jsonl-storage.ts:144] [E: packages/agent/src/harness/session/jsonl-storage.ts:145] [E: packages/agent/src/harness/session/jsonl-storage.ts:146] [E: packages/agent/src/harness/session/jsonl-storage.ts:150] [E: packages/agent/src/harness/session/jsonl-storage.ts:153] [E: packages/agent/src/harness/session/jsonl-storage.ts:154] [E: packages/agent/src/harness/session/jsonl-storage.ts:186] [E: packages/agent/src/harness/session/jsonl-storage.ts:187]

打开时的当前 leaf 不是 header 字段,而是顺序重放每个 entry 后得到的 `leafId`:普通 entry 让 leaf 变成 entry 自己的 id,`leaf` entry 让 leaf 变成 `targetId`。[E: packages/agent/src/harness/session/jsonl-storage.ts:109] [E: packages/agent/src/harness/session/jsonl-storage.ts:110] [E: packages/agent/src/harness/session/jsonl-storage.ts:152] [E: packages/agent/src/harness/session/jsonl-storage.ts:156] [E: packages/agent/src/harness/session/jsonl-storage.ts:158]

## Write Path

`JsonlSessionStorage.create()` 写入唯一一行 header: `type: "session"`、`version: 3`、`id: options.sessionId`、当前 ISO timestamp、`cwd: options.cwd`、可选 `parentSession: options.parentSessionPath`,然后返回 entries 为空、leaf 为 null 的 storage。[E: packages/agent/src/harness/session/jsonl-storage.ts:191] [E: packages/agent/src/harness/session/jsonl-storage.ts:200] [E: packages/agent/src/harness/session/jsonl-storage.ts:201] [E: packages/agent/src/harness/session/jsonl-storage.ts:202] [E: packages/agent/src/harness/session/jsonl-storage.ts:203] [E: packages/agent/src/harness/session/jsonl-storage.ts:204] [E: packages/agent/src/harness/session/jsonl-storage.ts:205] [E: packages/agent/src/harness/session/jsonl-storage.ts:206] [E: packages/agent/src/harness/session/jsonl-storage.ts:209] [E: packages/agent/src/harness/session/jsonl-storage.ts:212]

`appendEntry(entry)` 只 append 一行 `JSON.stringify(entry) + "\n"`,随后更新内存数组、id 索引、label cache,并用 `leafIdAfterEntry(entry)` 更新当前 leaf。[E: packages/agent/src/harness/session/jsonl-storage.ts:250] [E: packages/agent/src/harness/session/jsonl-storage.ts:252] [E: packages/agent/src/harness/session/jsonl-storage.ts:255] [E: packages/agent/src/harness/session/jsonl-storage.ts:256] [E: packages/agent/src/harness/session/jsonl-storage.ts:257] [E: packages/agent/src/harness/session/jsonl-storage.ts:258]

`setLeafId(leafId)` 不是改写 header 或旧 entry;它先校验目标 entry 存在,再 append 一个新的 `LeafEntry`。这个 leaf entry 的 `parentId` 是调用前的 `currentLeafId`,`targetId` 是传入的 leaf,写入成功后 storage 把 `currentLeafId` 直接设为目标 leaf。[E: packages/agent/src/harness/session/jsonl-storage.ts:226] [E: packages/agent/src/harness/session/jsonl-storage.ts:227] [E: packages/agent/src/harness/session/jsonl-storage.ts:230] [E: packages/agent/src/harness/session/jsonl-storage.ts:231] [E: packages/agent/src/harness/session/jsonl-storage.ts:232] [E: packages/agent/src/harness/session/jsonl-storage.ts:233] [E: packages/agent/src/harness/session/jsonl-storage.ts:235] [E: packages/agent/src/harness/session/jsonl-storage.ts:238] [E: packages/agent/src/harness/session/jsonl-storage.ts:241] [E: packages/agent/src/harness/session/jsonl-storage.ts:242] [E: packages/agent/src/harness/session/jsonl-storage.ts:243]

## Read Operations

`getMetadata()` 返回构造时从 header 计算出的 metadata,`getLeafId()` 返回 `currentLeafId`;如果 `currentLeafId` 非 null 但 `byId` 没有该 entry,`getLeafId()` 抛 `invalid_session`。[E: packages/agent/src/harness/session/jsonl-storage.ts:215] [E: packages/agent/src/harness/session/jsonl-storage.ts:216] [E: packages/agent/src/harness/session/jsonl-storage.ts:219] [E: packages/agent/src/harness/session/jsonl-storage.ts:220] [E: packages/agent/src/harness/session/jsonl-storage.ts:221] [E: packages/agent/src/harness/session/jsonl-storage.ts:223]

`getEntry(id)` 查 `byId`,`findEntries(type)` 从内存 entries 过滤指定 `type`,`getLabel(id)` 查 `labelsById`,`getEntries()` 返回 entries 的浅拷贝。[E: packages/agent/src/harness/session/jsonl-storage.ts:261] [E: packages/agent/src/harness/session/jsonl-storage.ts:262] [E: packages/agent/src/harness/session/jsonl-storage.ts:265] [E: packages/agent/src/harness/session/jsonl-storage.ts:268] [E: packages/agent/src/harness/session/jsonl-storage.ts:271] [E: packages/agent/src/harness/session/jsonl-storage.ts:272] [E: packages/agent/src/harness/session/jsonl-storage.ts:290] [E: packages/agent/src/harness/session/jsonl-storage.ts:291]

`getPathToRoot(leafId)` 从传入的 entry id 查起,沿 `parentId` 往上找,每次把 current unshift 到 path;如果传入 null 返回空数组,如果起点不存在抛 `not_found`,如果中途 parent 缺失抛 `invalid_session`。[E: packages/agent/src/harness/session/jsonl-storage.ts:275] [E: packages/agent/src/harness/session/jsonl-storage.ts:276] [E: packages/agent/src/harness/session/jsonl-storage.ts:278] [E: packages/agent/src/harness/session/jsonl-storage.ts:279] [E: packages/agent/src/harness/session/jsonl-storage.ts:280] [E: packages/agent/src/harness/session/jsonl-storage.ts:281] [E: packages/agent/src/harness/session/jsonl-storage.ts:282] [E: packages/agent/src/harness/session/jsonl-storage.ts:283] [E: packages/agent/src/harness/session/jsonl-storage.ts:284] [E: packages/agent/src/harness/session/jsonl-storage.ts:287]

## Repo Operations

`JsonlSessionRepo` 把传入的 sessions root 懒解析为绝对路径并缓存;每个 cwd 被编码为 `--${cwd with one leading slash/backslash removed, then slash/backslash/colon replaced by "-"}--` 形式的目录名。[E: packages/agent/src/harness/session/jsonl-repo.ts:34] [E: packages/agent/src/harness/session/jsonl-repo.ts:35] [E: packages/agent/src/harness/session/jsonl-repo.ts:48] [E: packages/agent/src/harness/session/jsonl-repo.ts:50] [E: packages/agent/src/harness/session/jsonl-repo.ts:55] [E: packages/agent/src/harness/session/jsonl-repo.ts:58] [E: packages/agent/src/harness/session/jsonl-repo.ts:60]

`create(options)` 生成或使用 session id,生成 timestamp,创建 cwd 对应目录,文件名是 `${timestamp.replace(/[:.]/g, "-")}_${sessionId}.jsonl`,然后调用 `JsonlSessionStorage.create()` 并用 `toSession(storage)` 包装返回。[E: packages/agent/src/harness/session/jsonl-repo.ts:75] [E: packages/agent/src/harness/session/jsonl-repo.ts:76] [E: packages/agent/src/harness/session/jsonl-repo.ts:77] [E: packages/agent/src/harness/session/jsonl-repo.ts:78] [E: packages/agent/src/harness/session/jsonl-repo.ts:80] [E: packages/agent/src/harness/session/jsonl-repo.ts:65] [E: packages/agent/src/harness/session/jsonl-repo.ts:69] [E: packages/agent/src/harness/session/jsonl-repo.ts:83] [E: packages/agent/src/harness/session/jsonl-repo.ts:84] [E: packages/agent/src/harness/session/jsonl-repo.ts:89]

`open(metadata)` 先检查 `metadata.path` 是否存在,不存在时抛 `SessionError("not_found", "Session not found: ...")`;存在时打开 JSONL storage 并包装成 `Session`。[E: packages/agent/src/harness/session/jsonl-repo.ts:92] [E: packages/agent/src/harness/session/jsonl-repo.ts:94] [E: packages/agent/src/harness/session/jsonl-repo.ts:96] [E: packages/agent/src/harness/session/jsonl-repo.ts:98] [E: packages/agent/src/harness/session/jsonl-repo.ts:99]

`list(options)` 在指定 cwd 时只扫描该 cwd 的 session 目录,否则扫描 sessions root 下所有目录;它只读取 `.jsonl` 非目录文件的 header metadata,并按 `createdAt` 新到旧排序。[E: packages/agent/src/harness/session/jsonl-repo.ts:102] [E: packages/agent/src/harness/session/jsonl-repo.ts:103] [E: packages/agent/src/harness/session/jsonl-repo.ts:109] [E: packages/agent/src/harness/session/jsonl-repo.ts:112] [E: packages/agent/src/harness/session/jsonl-repo.ts:115] [E: packages/agent/src/harness/session/jsonl-repo.ts:122]

`delete(metadata)` 用 filesystem `remove(metadata.path, { force: true })` 删除 session 文件。[E: packages/agent/src/harness/session/jsonl-repo.ts:126] [E: packages/agent/src/harness/session/jsonl-repo.ts:128]

`fork(sourceMetadata, options)` 先 `open()` 源 session,再用 `getEntriesToFork(source.getStorage(), options)` 选出要复制的 entry;新 storage 的 `parentSessionPath` 默认写源 `metadata.path`,随后逐条 `appendEntry()` 写入 forked entries。[E: packages/agent/src/harness/session/jsonl-repo.ts:133] [E: packages/agent/src/harness/session/jsonl-repo.ts:137] [E: packages/agent/src/harness/session/jsonl-repo.ts:138] [E: packages/agent/src/harness/session/jsonl-repo.ts:146] [E: packages/agent/src/harness/session/jsonl-repo.ts:152] [E: packages/agent/src/harness/session/jsonl-repo.ts:155] [E: packages/agent/src/harness/session/jsonl-repo.ts:156] [E: packages/agent/src/harness/session/jsonl-repo.ts:158]

## Gotcha

JSONL 文件没有原地更新路径: 改 leaf 和追加任意 `SessionTreeEntry` 都是 append 新行;当前 leaf 是重放 entry 序列得到的派生状态。[E: packages/agent/src/harness/session/jsonl-storage.ts:109] [E: packages/agent/src/harness/session/jsonl-storage.ts:156] [E: packages/agent/src/harness/session/jsonl-storage.ts:238] [E: packages/agent/src/harness/session/jsonl-storage.ts:250] [E: packages/agent/src/harness/session/jsonl-storage.ts:252] 因此 `leaf` entry 是独立 entry type,header 里也没有 active leaf 字段。[E: packages/agent/src/harness/session/jsonl-storage.ts:8] [E: packages/agent/src/harness/session/jsonl-storage.ts:9] [E: packages/agent/src/harness/session/jsonl-storage.ts:14] [E: packages/agent/src/harness/session/jsonl-storage.ts:230]

`list()` 会吞掉 `invalid_session` header 错误并继续扫描,但其他错误会重新抛出;完整打开 session 时 entry 解析错误会抛 `invalid_entry`。[E: packages/agent/src/harness/session/jsonl-repo.ts:114] [E: packages/agent/src/harness/session/jsonl-repo.ts:115] [E: packages/agent/src/harness/session/jsonl-repo.ts:116] [E: packages/agent/src/harness/session/jsonl-repo.ts:118] [E: packages/agent/src/harness/session/jsonl-storage.ts:51] [E: packages/agent/src/harness/session/jsonl-storage.ts:92]

`createEntryId()` 默认只取 `uuidv7().slice(0, 8)`,最多尝试 100 次规避当前 `byId` 碰撞,之后才返回完整 uuidv7;entry id 生成不是由 repo 文件名保证的。[E: packages/agent/src/harness/session/jsonl-storage.ts:35] [E: packages/agent/src/harness/session/jsonl-storage.ts:36] [E: packages/agent/src/harness/session/jsonl-storage.ts:37] [E: packages/agent/src/harness/session/jsonl-storage.ts:38] [E: packages/agent/src/harness/session/jsonl-storage.ts:40] [E: packages/agent/src/harness/session/jsonl-storage.ts:246] [E: packages/agent/src/harness/session/jsonl-storage.ts:247]

`encodeCwd()` 是简单字符替换,不是 URL encoding 或 hash;路径分隔符和冒号都会折成 `-`,所以目录名适合人眼识别,但不能无损反解原始 cwd。[E: packages/agent/src/harness/session/jsonl-repo.ts:34] [E: packages/agent/src/harness/session/jsonl-repo.ts:35]

## 跨包边界

`subsys.agent-core.session-storage` 应覆盖通用 `SessionStorage` / `SessionRepo` interface 契约;本节点只覆盖 JSONL backend 对这些契约的持久化实现。[E: packages/agent/src/harness/session/jsonl-storage.ts:161] [E: packages/agent/src/harness/session/jsonl-repo.ts:38]

`ref.coding-agent.session-format` 应覆盖 `coding-agent` 产品层的 session 文件格式说明;本节点只覆盖 `agent` harness 内 `jsonl-storage.ts` 与 `jsonl-repo.ts` 的实现事实。[E: packages/agent/src/harness/session/jsonl-storage.ts:1] [E: packages/agent/src/harness/session/jsonl-repo.ts:1]

## Sources

- packages/agent/src/harness/session/jsonl-storage.ts
- packages/agent/src/harness/session/jsonl-repo.ts

## 相关

- `subsys.agent-core.session-storage`: 通用 session storage/repo 契约,JSONL storage/repo 是其中一个 durable backend。
- `ref.coding-agent.session-format`: 产品层 session 文件格式引用,需要和 agent harness 的 JSONL backend 区分责任边界。
