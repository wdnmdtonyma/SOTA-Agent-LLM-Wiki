---
id: subsys.persistence.jsonl
title: JSONL 后端
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-jsonl/src/format.ts
  - packages/session/session-persistence-jsonl/src/zstd.ts
  - packages/session/session-persistence-jsonl/src/win32.ts
  - packages/session/session-persistence-jsonl/tests/jsonl.spec.ts
  - packages/session/session-persistence-jsonl/tests/zstd.spec.ts
  - packages/session/session-persistence-jsonl/tests/win32.spec.ts
  - packages/session/session-persistence-jsonl/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence/src/coordinator.ts
  - packages/session/session-persistence/src/write-behind.ts
  - packages/session/session-persistence/src/preparations.ts
  - packages/session/session-persistence/tests/coordinator-contract.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
symbols:
  - JsonlSessionPersistence
  - refuseForeignFormatVersion
  - HeaderLine
related:
  - spine.session-log
  - subsys.persistence.session-persistence
  - subsys.persistence.sqlite
  - subsys.util.home-paths
  - subsys.core.session
  - subsys.persistence.checkpoint
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-session-persistence-jsonl` 是 **host 面** shipped 默认的 `PersistenceBackend`：每个 session 一份 append-only `session.jsonl[.zstd]`，由 `PersistenceCoordinator` 订阅 `session/event`（emit 入队）与 `session/flush`（parallel 耐久屏障）。它实现 `ctx.sessionPersistence`，不是又一份可就地改写的 chat 数组，也不是仓库里那个未 bundled 的 SQLite persistence。

## 能回答的问题

- shipped 默认 session 盘是 JSONL 还是 SQLite？`dsh web` / headless 各自有没有再挂一行？
- 盘上路径怎么拼：`dshHomePath('sessions')`、`projectKey(cwd)` / `_no-cwd`、`encodeSegment(id)`、`.jsonl` vs `.jsonl.zstd`？
- `session/event` 与 `session/flush` 分别是 emit 还是 parallel？谁必须 `next()`？JSONL 自己听不听 waterfall？
- `locate` / `create` / 第一次 `append` 谁碰盘？`supportsRawArtifacts` 为什么是 `true`？
- 读 header 时为什么必须先 `refuseForeignFormatVersion` 再 `isHeaderLine`？`SESSION_FORMAT_VERSION = 0` 有没有跨 version migration？
- 明文截断末行和 zstd 截断末帧怎么修？`commitRepair` 是不是单事务？POSIX `link()` 和 Win32 `MoveFileExW` 差在哪？

## 职责边界

本包拥有：JSONL 物理编码（明文 / checksummed Zstandard 帧）、每会话一份 artifact 的路径合同（`logPath` / `locate` / `readRaw`）、首写物化（POSIX `link()+unlink()` 或 Win32 `MoveFileExW(WRITE_THROUGH)`）、后续 `append`+`fsync` 与失败回滚、torn-tail 的 `JsonlTornMarker`（`truncateTo` + `recoveredEvents`）、根上禁止混用两种 suffix、拒绝旧版扁平 `*.jsonl` 文件。

本包**不**拥有：`ctx.sessionPersistence` 的 Service Definition 与 write-behind / inspect-vs-load 编排（[subsys.persistence.session-persistence](session-persistence.md) 的 `SessionPersistence` + `PersistenceCoordinator`）；`Session.append` / `deriveMessages` / `SurfaceOp`（[subsys.core.session](../core/session.md)）；在 adapter / top-level tool body **之前**调用 `sessions.flush` 的胶水（[subsys.persistence.checkpoint](checkpoint.md)）；`$DSH_HOME` 解析（[subsys.util.home-paths](../util/home-paths.md)）；仓库里未 bundled 的 SQLite persistence（[subsys.persistence.sqlite](sqlite.md)）。

JSONL 是 **host 面**进程级 provider。agent-preset 面只把 `agentPreset` 写进 `SessionHeader` / `agent-preset/selected`，不另造一份盘。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。Client 半边不持有 `ctx.sessionPersistence`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-persistence-jsonl/src/index.ts` | `JsonlSessionPersistence`：`locate` / `loadStored` / `appendBatch` / `commitRepair` / `readRaw` |
| `packages/session/session-persistence-jsonl/src/format.ts` | `HeaderLine`、`logPath`、`encodeSegment`、`refuseForeignFormatVersion`、`SessionLogScanner` |
| `packages/session/session-persistence-jsonl/src/zstd.ts` | `scanZstdFrames` / `compressZstdFrame` / torn-prefix 解码 |
| `packages/session/session-persistence-jsonl/src/win32.ts` | `publishNewFileWin32` / `ensureDurableDirectoryWin32` |
| `packages/session/session-persistence/src/index.ts` | Definition：`SessionPersistence` 占住 `ctx.sessionPersistence` |
| `packages/session/session-persistence/src/coordinator.ts` | `PersistenceCoordinator`：`session/created\|event\|flush\|disposed`、`assertVersion` |
| `packages/session/session-persistence/src/write-behind.ts` | 默认 200ms 合批；`flush()` 取消等待并排空 |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `id: session-persistence-jsonl` |
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 0`、`SurfaceOp`（无 delete） |
| `packages/core/session/src/index.ts` | `session/event` emit、`session/flush` parallel |
| `packages/util/home-paths/src/index.ts` | `dshHomePath('sessions')` |
| `packages/session/session-checkpoint-policy/src/index.ts` | 在 waterfall 里 `flush` 后再 `next()` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | 现为 `0`。新 header 必须等于该值。跨 version **没有**自动 migration：更新的盘叫人升级 harness，更旧的盘「本 build 无升级路径」。 [E: packages/core/session/src/types.ts:56] [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80] v0 内部仍有若干同版本事件形状迁移（coordinator 读路径上的 `migrateLegacyTurnStartEvent` 等），不是 format bump。 [E: packages/session/session-persistence/src/coordinator.ts:372] [E: packages/session/session-persistence/src/coordinator.ts:382] |
| `HeaderLine` | 文件第一行：`type: 'session'` + `SessionHeader` 字段（`delegationDepth` 缺省写成 `0`）。它不进 `SessionEvent` log。 [E: packages/session/session-persistence-jsonl/src/format.ts:33] [E: packages/session/session-persistence-jsonl/src/format.ts:53] [E: packages/session/session-persistence-jsonl/src/format.ts:61] |
| `JsonlCompression` | `'zstd'` \| `'none'`。默认 `'zstd'` → 文件名 `session.jsonl.zstd`；`'none'` → `session.jsonl`。 [E: packages/session/session-persistence-jsonl/src/index.ts:38] [E: packages/session/session-persistence-jsonl/src/format.ts:25] |
| `Config` | `root` 必填 [E: packages/session/session-persistence-jsonl/src/index.ts:127]（构造时 `resolve`，避免后来 `process.cwd()` 把盘拆开 [E: packages/session/session-persistence-jsonl/src/index.ts:151]）。`packChunks` 默认 `true` [E: packages/session/session-persistence-jsonl/src/index.ts:37]；`compression` 默认 `'zstd'` [E: packages/session/session-persistence-jsonl/src/index.ts:38]；`preparedSessionCacheSize` 默认 5（`DEFAULT_PREPARED_SESSION_CACHE_SIZE`）[E: packages/session/session-persistence/src/coordinator.ts:27]；`writeBatchMaxDelayMs` 默认 200（`DEFAULT_WRITE_BATCH_MAX_DELAY_MS`）[E: packages/session/session-persistence/src/coordinator.ts:30]。 |
| `SessionLocation` | `locate` 返回 `{ kind: 'jsonl', path }`，绝对路径，**不**创建文件。 [E: packages/session/session-persistence-jsonl/src/index.ts:173] |
| `JsonlTornMarker` | `{ truncateTo, recoveredEvents }`。coordinator 当不透明 token 交回 `commitRepair`。 [E: packages/session/session-persistence-jsonl/src/index.ts:86] |
| `supportsRawArtifacts` | JSONL 为 `true`。 [E: packages/session/session-persistence-jsonl/src/index.ts:122] `readRaw` 解出逻辑名恒为 `session.jsonl` 的原文（保留 packed 行）。 [E: packages/session/session-persistence-jsonl/src/index.ts:281] 明文 `readRaw` 返回整文件（含可能的无换行末碎片）； [E: packages/session/session-persistence-jsonl/src/index.ts:273] zstd `readRaw` 只拼 `scanZstdFrames` 给出的完整帧明文，torn 末帧不进 `content`。 [E: packages/session/session-persistence-jsonl/src/index.ts:261] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。**没有 delete。** compaction 只再 append 一条 replace；JSONL 文件不删已提交行。 [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] |

盘布局：`<root>/<projectKey(cwd)|_no-cwd>/<encodeSegment(id)>/session.jsonl[.zstd]`。`cwd === undefined` 用 `_no-cwd`。 [E: packages/session/session-persistence-jsonl/src/format.ts:177] `logPath` 拼 `session` + suffix。 [E: packages/session/session-persistence-jsonl/src/format.ts:207] `projectKey` 把分隔符收成 `-`，有意有损；slug 截到 251 再包成 `--…--`（整段最长 255）。 [E: packages/session/session-persistence-jsonl/src/format.ts:154] [E: packages/session/session-persistence-jsonl/src/format.ts:166] `encodeSegment` 对任意 UTF-16（含 lone surrogate）单射，空串抛错。 [E: packages/session/session-persistence-jsonl/src/format.ts:122]

`SCHEMA_VERSION = 15` 属于未 bundled 的 SQLite persistence 表布局，跟 `HeaderLine.version` / `SESSION_FORMAT_VERSION` 正交。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20]

## 控制流

1. **组合真树挂 JSONL，不挂 SQLite persistence。** `dsh-base` 插入 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: !!js dshHomePath('sessions')`。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:99] [E: packages/bundle/base/cordis.patch.yml:101] `dshHomePath` 把段接到 `resolveDshHome()`：非空 `$DSH_HOME` 赢，否则 `defaultDshHome()` = `join(homedir(), '.dsh')`。 [E: packages/util/home-paths/src/index.ts:98] [E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:89] [E: packages/util/home-paths/src/index.ts:62] `PROFILE_TEMPLATES` 的 `web` / `headless` 都先叠 base：`dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`；`dsh-web-app` 另插 `storage` / `workspace` / `session-projection-cache` 等 host 行，两边都**不再**写 `session-persistence-jsonl`。[I] 仓库有 `@deepseek-ai/dsh-session-persistence-sqlite`，任何 shipped bundle 都没有它的行。[I] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] [E: packages/bundle/web-app/cordis.patch.yml:51]

2. **插件占 `ctx.sessionPersistence`，再构造 coordinator。** `SessionPersistence` 构造函数 `super(ctx, 'sessionPersistence')`。`JsonlSessionPersistence` `static inject = ['sessions']`，`name` 覆盖成 `session-persistence-jsonl` 但不改 service 键。构造里 `new PersistenceCoordinator(this.ctx, this, { preparedSessionCacheSize, writeBatchMaxDelayMs })`，coordinator 立刻 `installWritePath()`。Definition 包本身**不是** shipped Cordis 行。 [E: packages/session/session-persistence/src/index.ts:86] [E: packages/session/session-persistence-jsonl/src/index.ts:124] [E: packages/session/session-persistence-jsonl/src/index.ts:160] [E: packages/session/session-persistence/src/coordinator.ts:624]

3. **热路径只入队；耐久屏障是 `session/flush`。** `session/event` 是 emit：listener 没有 `next`，`initFor` 之后 `live.writes.enqueue(event)`（`structuredClone` 进 write-behind）。`session/flush` 是 parallel：`SessionStore.flush` `Promise.allSettled` 全部 listener，**不是** waterfall。coordinator 的 listener 是 `session => this.flush(session)`。`session/created` emit → `initFor`（构造期 seed 不会再发 `session/event`，所以 `onCreated` 自己 `appendCore` 种子）。`session/disposed` emit → `retire` 再 flush。JSONL / coordinator **没有**任何必须调用的 `next()`。 [E: packages/core/session/src/index.ts:76] [E: packages/core/session/src/index.ts:85] [E: packages/session/session-persistence/src/coordinator.ts:1125] [E: packages/session/session-persistence/src/coordinator.ts:1129] [E: packages/session/session-persistence/src/write-behind.ts:47] [E: packages/core/session/src/index.ts:1026] [E: packages/session/session-persistence/src/coordinator.ts:1292]

4. **谁在 waterfall 里 `next()`。** 副作用门不在 JSONL 包。`session-checkpoint-policy` `inject = ['llm', 'sessionPersistence', 'sessions', 'tools']`：`llm/stream` 有 live session 时 `await ctx.sessions.flush(session)` **再** `yield* next()`；`tools/execute` 仅 `exec.agent` 存在且 `exec.parent === undefined` 才 flush，再 `return next()`；`agent/pre-step` flush 后 `return next()`（耐久刷盘，不是副作用门）。省略 `next()` = adapter / tool body / 下一步都不跑。`session/flush` 本身不能靠「不调用 next」否决别人。 [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81]

5. **`create` 懒物化；`locate` 不算 I/O。** `createCore` 只把 `{ meta, cursor: 0, materialized: false }` 放进内存；盘上已有同 id 则拒。`locate` 用 `logPath` 算出绝对目标，create 之后、首笔 append 之前 `list()` 仍看不到该 id。测试钉死：`create()` 不建文件。 [E: packages/session/session-persistence/src/coordinator.ts:654] [E: packages/session/session-persistence/src/coordinator.ts:657] [E: packages/session/session-persistence-jsonl/src/index.ts:173] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:281] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:282]

6. **首笔 `appendBatch` 原子物化 header+第一批。** `isMaterialized === false` 走 `materialize`：`encodeMaterialization` 在 zstd 下把 header 与 event 写成**两帧**（第一帧必须恰好一行 header）。POSIX：`mkdir` `0o700` → 写 `0o600` temp → `sync` → `link(tmp, finalPath)` → `syncDirPosix` → `unlink` temp。`link` 遇已存在目标 `EEXIST`，两个进程不能互相 `rename` 覆盖。Win32：`ensureDurableDirectoryWin32` 后 `publishNewFileWin32` = `MoveFileExW(..., MOVEFILE_WRITE_THROUGH)`，无替换、无跨卷 copy。 [E: packages/session/session-persistence-jsonl/src/index.ts:623] [E: packages/session/session-persistence-jsonl/src/index.ts:625] [E: packages/session/session-persistence-jsonl/src/index.ts:49] [E: packages/session/session-persistence-jsonl/src/index.ts:549] [E: packages/session/session-persistence-jsonl/src/win32.ts:30] [E: packages/session/session-persistence-jsonl/src/win32.ts:118] [E: packages/session/session-persistence-jsonl/tests/zstd.spec.ts:349]

7. **已物化后的 append：写完 `fsync`，失败则截回。** `appendLines` 记下 `before` size，`writeFile`+`sync`；任一步失败就 `truncate(before)` 再 `sync`，避免半行留下重复 seq。这不是 compaction，只回滚本批。 [E: packages/session/session-persistence-jsonl/src/index.ts:663] [E: packages/session/session-persistence-jsonl/src/index.ts:684]

8. **读路径：先拒外国 version，再认 header。** `SessionLogScanner` / `scanLog` 经 `parseHeaderRecord`：JSON 解析后先 `refuseForeignFormatVersion(parsed)`，再 `isHeaderLine`。`version` 是 number 且 `!== SESSION_FORMAT_VERSION` 时抛 `SessionFormatUnsupportedError`（文案走 `sessionFormatVersionRefusal`），并在 JSONL 侧附上 `(raw log: <path>)`。未来格式不必满足今天的 `createdAt` / `delegationDepth` 形状，用户必须看见「升级 harness」，不能看见「corrupt session log」。非 object 的第一行没有 version，继续当 corrupt。coordinator 的 `assertVersion` 是第二道门。测试：`version: 42` 且缺 `createdAt` → `SessionFormatUnsupportedError`；`version: -1` 的形状合法 header → `older than the supported v0` / `no upgrade path`。 [E: packages/session/session-persistence-jsonl/src/format.ts:243] [E: packages/session/session-persistence-jsonl/src/format.ts:259] [E: packages/session/session-persistence-jsonl/src/format.ts:260] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:203] [E: packages/session/session-persistence/tests/coordinator-contract.ts:1353]

9. **`inspect` 不落修复；`load` / `prepare` 才 `commitRepair`。** `inspect` 只 `preparations.inspect` → `prepareCore`：内存里跑 `interruptedTurnClosers`，**不**调 `commitPrepared`。`load` / `prepare` 经 `reserve` → `commitPrepared`：`tornMarker` 或 `closers.length > 0` 时 `backend.commitRepair`，然后因 revision 变了返回 `undefined` 再读一轮。JSONL `commitRepair` 分两步、各自 fsync，**不是**单事务：先 `repair(tornMarker.truncateTo)`（`truncate`+`fsync`，只丢掉 torn 尾），再把内存里的 `recoveredEvents` 与 `closers` 拼进 `appendLines`。`repair()` 不回写。明文 `readPrefix` 的 `recoveredEvents` 恒为 `[]`；zstd 末帧捞出的完整记录只活在这次 `load` 的内存 marker。truncate 已落盘、rewrite 尚未写出时 crash，下次 `load` **不会**从已截掉的尾再解 `recoveredEvents`。coordinator 仍可能对「截完后仍开着的 turn」再合成 closers。live adopt（HMR）只 truncate torn，`closers = []`，不把开着的 turn 合成 `interrupted`。 [E: packages/session/session-persistence/src/coordinator.ts:794] [E: packages/session/session-persistence/src/preparations.ts:53] [E: packages/session/session-persistence/src/coordinator.ts:944] [E: packages/session/session-persistence/src/coordinator.ts:945] [E: packages/session/session-persistence-jsonl/src/index.ts:441] [E: packages/session/session-persistence-jsonl/src/index.ts:442] [E: packages/session/session-persistence-jsonl/src/index.ts:443] [E: packages/session/session-persistence-jsonl/src/index.ts:694] [E: packages/session/session-persistence/src/coordinator.ts:1314]

10. **明文 torn vs zstd torn。** 明文：`scanLog` 把无换行的末碎片留在 `committedBytes` 之外，`readPrefix` 设 `tornMarker: { truncateTo: committedBytes, recoveredEvents: [] }`。zstd：`scanZstdFrames` 给出完整帧 + 可选 `tornStart`；完整帧里若还有半行 JSONL，直接抛 `complete frame contains a torn JSONL record`（不可修）。末帧不完整则 `decompressZstdPrefix`（`ZSTD_e_flush`）尽量取出已有明文，完整记录进 `recoveredEvents`，`truncateTo = tornStart`。第一帧必须恰好一行 header。默认写出 `.jsonl.zstd`，`locate` 仍是 `{ kind: 'jsonl', path }`。 [E: packages/session/session-persistence-jsonl/src/index.ts:328] [E: packages/session/session-persistence-jsonl/src/index.ts:383] [E: packages/session/session-persistence-jsonl/src/index.ts:408] [E: packages/session/session-persistence-jsonl/src/index.ts:409] [E: packages/session/session-persistence-jsonl/src/zstd.ts:22] [E: packages/session/session-persistence-jsonl/src/zstd.ts:154] [E: packages/session/session-persistence-jsonl/tests/zstd.spec.ts:346]

11. **读 packed 行与写开关无关；未知 type 只在读时拒。** 写侧 `eventLines`：`packChunks` 为 true 走 `packChunkRuns`，false 则一行一事。读侧 `SessionLogScanner.consumeEventLine` 对每一完整行无条件调用 `decodeStorageRecord`，函数体不读 `packChunks`，所以旧的 unpacked 文件仍能被默认 writer 接着 append。`appendCore` 只拦已退役的 v0 形状（`request/header-delta`、`mode/set`、`reason: 'fallback'`）；未知 `type` 除非 `ignorable`，在 `assertEventsSupported`（load / prepare / readFrom）拒，append 不拒。JSONL 没有 `loadStoredFrom`：`readFrom` 走整本 `loadStored` 再 `slice(fromSeq)`。 [E: packages/session/session-persistence-jsonl/src/format.ts:222] [E: packages/session/session-persistence-jsonl/src/format.ts:351] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1107] [E: packages/session/session-persistence/src/coordinator.ts:691] [E: packages/session/session-persistence/src/coordinator.ts:1063] [E: packages/session/session-persistence/src/coordinator.ts:869]

12. **发现与编码门。** `findLog` / `list` 扫每个 project 目录下的 session 目录。同一 id 出现在两个 project → 抛 duplicate。目录里若存在对面 suffix（`.jsonl` vs `.jsonl.zstd`）→ encoding mismatch，要求换 root 或换 `compression`。project 根上若还有 `*.jsonl` / `*.jsonl.zstd` 扁平文件 → `unsupported flat-file layout`。header 的 `(id, cwd)` 必须指回正在读的那条 path（允许大小写不敏感盘上的 `realpath` 别名）。 [E: packages/session/session-persistence-jsonl/src/index.ts:791] [E: packages/session/session-persistence-jsonl/src/index.ts:916] [E: packages/session/session-persistence-jsonl/src/index.ts:924]

## 设计动机

DSH 是 Cordis 组合运行时：`profile → bundle → agent preset`，`model-visible ⟺ logged`。模型下一轮看见的 `messages` 只能从 append-only log 的 `surfaceOp` 折叠出来。要把这条合同撑到 crash 之后，host 必须有一份按 session 可定位的耐久介质，并且在 adapter 花钱、top-level tool 对外产生副作用**之前**把已提交前缀 `flush` 下去。Peer harness 常见的「内存 messages + 事后整包写盘」在这里是不变量违规。

选「每会话一个 JSONL 文件」而不是默认 SQLite，是为了 `locate` / `readRaw` / 人能打开的原文：packed 行、键序、换行都按写时字节保留。Zstandard **按帧**拼接，才能在不重写已提交前缀的前提下追加一批、并从截断末帧里捞回完整 JSONL 记录。第一帧独占 header，list 才只需解一帧。

`link()` 而不是 `rename()`，是为了两个进程同时物化同一 id 时失败可见。`refuseForeignFormatVersion` 放在 `isHeaderLine` 前面，是为了 format bump 之后旧 binary 仍能说出「升级 harness」，而不是把未来字段判成 corrupt。

`create` 懒到第一笔 append：建了又弃的会话不留空文件。`encodeSegment` 把未校验的 `SessionId` 收成单段，避免 `../` 逃出 root。

## Gotcha

- **SQLite persistence 不是默认，也不在 shipped bundle。** 默认是本页的 JSONL。`SCHEMA_VERSION = 15` 是另一份未挂行后端的表布局，不要跟 `SESSION_FORMAT_VERSION` 或 session-query 的 schema 8 混。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/session/session-persistence-sqlite/src/schema.ts:20]
- **没有跨 version migration。** `version === 0` 才能读。更新 → 升级 harness；更旧 → 本 build 无升级路径。 [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80] coordinator 仍会改写若干 **v0 内部** 旧事件形状：`migrateLegacyTurnStartEvent` 丢掉 `turn/start.trigger`，只留 `{ turn }`。那不是 v0→v1。 [E: packages/session/session-persistence/src/coordinator.ts:375] [E: packages/session/session-persistence/src/coordinator.ts:382]
- **`list` / `readRaw` 走 `parseHeaderMeta`，不调用 `refuseForeignFormatVersion`。** 缺 `createdAt` 的未来 header 会被 `list` 当成「不是 header」跳过；形状仍像今天的 `HeaderLine` 但 `version !== 0` 的行会进 list，真正拒绝发生在 `load` / `scanLog`。 [E: packages/session/session-persistence-jsonl/src/format.ts:411]
- **JSONL repair 不是单事务，torn 尾截掉就不会再从盘上捞回。** `commitRepair` 先 `repair(truncateTo)`（只 `truncate`+`fsync`，丢掉 torn 尾），再 `appendLines(recoveredEvents + closers)`。明文 `readPrefix` 的 `recoveredEvents` 恒为 `[]`；zstd 末帧里的完整记录只在这次 `load` 的内存 marker。truncate 与 rewrite 之间 crash，下次 `load` 看见的是已截短的前缀，**不会**重建被丢掉的 `recoveredEvents`。coordinator 仍可能对截完后仍开着的 turn 再合成 closers。 [E: packages/session/session-persistence-jsonl/src/index.ts:441] [E: packages/session/session-persistence-jsonl/src/index.ts:443] [E: packages/session/session-persistence-jsonl/src/index.ts:328] [E: packages/session/session-persistence-jsonl/src/index.ts:694]
- **完整 zstd 帧里的半行 JSONL 是 corrupt，不是 torn。** 只有结构不完整的**末帧**才进 `tornStart`。 [E: packages/session/session-persistence-jsonl/src/index.ts:383]
- **同一 root 不能混 `.jsonl` 与 `.jsonl.zstd`。** 换编码换 root，或把 `compression` 改成跟盘上一致。 [E: packages/session/session-persistence-jsonl/src/index.ts:916]
- **旧扁平布局直接拒。** `<project>/<encodeSegment(id)>.jsonl[.zstd]` 不再被当成会话。 [E: packages/session/session-persistence-jsonl/src/index.ts:924]
- **`session/flush` 没有 `next()`。** 把它当 waterfall、指望不调用 next 就挡住别人，是错的。否决发生在 `llm/stream` / `tools/execute` 那些必须 `next()` 的链上。 [E: packages/core/session/src/index.ts:85]
- **`packChunks` 只影响新写入。** 写侧开关是 `eventLines` 的 `packChunks ? packChunkRuns : events`。读侧每行都走 `decodeStorageRecord`，关掉开关也不会把已有 `text-chunks` 行读坏。 [E: packages/session/session-persistence-jsonl/src/format.ts:222] [E: packages/session/session-persistence-jsonl/src/format.ts:351]
- **`projectKey` 有损。** `/a/b-c` 与 `/a-b/c` 进同一个 project 目录；id 仍靠 `encodeSegment` 分开。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1216]
- **write-behind 的 200ms 不是完成时限。** 它是合批窗口；checkpoint 走的是立刻 `flush()`：取消等待定时器并排空同一 barrier。 [E: packages/session/session-persistence/src/coordinator.ts:30] [E: packages/session/session-persistence/src/write-behind.ts:65]
- **compaction 不删 JSONL 行。** 模型历史靠 `surfaceOp: { op: 'replace', start, end }` 阴影；文件只在 crash-tail truncate / 失败 append 回滚时变短。 [E: packages/core/session/src/types.ts:374]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-persistence` 的 `SessionPersistence` / `PersistenceBackend` / `SessionLocation` | `ctx.sessionPersistence`；`locate` / `create` / `append` / `load` / `inspect` / `prepare` | **无**独立 Cordis 行 | 无 | 无 |
| Provider | `@deepseek-ai/dsh-session-persistence-jsonl` 的 `JsonlSessionPersistence` | 同一 `ctx.sessionPersistence`；`supportsRawArtifacts = true`；`locate → { kind:'jsonl', path }` | `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`，默认 `compression: 'zstd'`、`packChunks: true` | **继承** base，不重挂 | **继承** base，不重挂 |
| Consumer | 同进程 `PersistenceCoordinator`（jsonl 构造时安装）；`session-checkpoint-policy`；`SessionStore.flush` 的调用方；web 上的 workspace / session-query / export | `session/event` **emit** 入队；`session/flush` **parallel** 刷盘。coordinator listener **无** `next()`。checkpoint 在 `llm/stream` / `tools/execute` / `agent/pre-step` **waterfall** 里先 flush 再 `next()` | `id: session-checkpoint-policy` 与 `id: session` 同在 base | 另加只读消费者（`workspace`、`session-log-download`、projection cache），不换 backend | `headless-runner` 经同一 `ctx.sessions` + JSONL |

换 Persistence Provider（例如未 shipped 的 SQLite）只换 `session/event` + `session/flush` 的落盘实现与 `locate`/`readRaw` 能力；不能换掉 `SessionEvent` / `surfaceOp` 合同。preset 若再 `provide` 一份 `sessionPersistence` 且不 `isolate`，按 host 面服务泄漏处理。SQLite 的 `locate` 返回 `undefined`、`supportsRawArtifacts = false`，不能 silently 顶替本页的 raw artifact 假设。

## Sources

- packages/session/session-persistence-jsonl/src/index.ts
- packages/session/session-persistence-jsonl/src/format.ts
- packages/session/session-persistence-jsonl/src/zstd.ts
- packages/session/session-persistence-jsonl/src/win32.ts
- packages/session/session-persistence-jsonl/tests/jsonl.spec.ts
- packages/session/session-persistence-jsonl/tests/zstd.spec.ts
- packages/session/session-persistence-jsonl/tests/win32.spec.ts
- packages/session/session-persistence-jsonl/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence/src/coordinator.ts
- packages/session/session-persistence/src/write-behind.ts
- packages/session/session-persistence/src/preparations.ts
- packages/session/session-persistence/tests/coordinator-contract.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-persistence-sqlite/src/schema.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only `SessionEvent`、`deriveMessages`、`surfaceOp` 只有 replace 没有 delete、checkpoint 两个副作用落点。
- [subsys.persistence.session-persistence](session-persistence.md)：`ctx.sessionPersistence` Definition、`PersistenceCoordinator` 的 write-behind / prepared cache / inspect 与 load 分界。
- [subsys.persistence.sqlite](sqlite.md)：仓库有、bundle 没有的另一 Provider；`SCHEMA_VERSION = 15` 与本页 `HeaderLine.version` 正交。
- [subsys.util.home-paths](../util/home-paths.md)：`dshHomePath('sessions')` 与 `$DSH_HOME` / `~/.dsh`。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` 与 top-level `tools/execute` 在 `next()` 之前 `sessions.flush`。
