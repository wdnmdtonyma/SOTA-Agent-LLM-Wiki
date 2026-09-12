---
id: subsys.persistence.jsonl
title: JSONL 后端
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-jsonl/src/storage.ts
  - packages/session/session-persistence-jsonl/src/lease.ts
  - packages/session/session-persistence-jsonl/src/format.ts
  - packages/session/session-persistence-jsonl/src/generation.ts
  - packages/session/session-persistence-jsonl/src/zstd.ts
  - packages/session/session-persistence-jsonl/src/win32.ts
  - packages/session/session-persistence-jsonl/tests/jsonl.spec.ts
  - packages/session/session-persistence-jsonl/tests/zstd.spec.ts
  - packages/session/session-persistence-jsonl/tests/lease.spec.ts
  - packages/session/session-persistence-jsonl/package.json
  - packages/session/session-format-catalog/src/generated.ts
  - packages/session/session-format/src/filename.ts
  - packages/session/session-format/src/chain.ts
  - packages/session/session-format-v0-to-v1/src/migration.ts
  - packages/session/session-format-v1-to-v2/src/migration.ts
  - packages/session/session-format-v2-to-v3/src/migration.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence/src/handle.ts
  - packages/session/session-persistence/src/errors.ts
  - packages/session/session-persistence/src/storage-contract.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/util/home-paths/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
symbols:
  - JsonlSessionPersistence
  - JsonlSessionHandle
  - SessionWriteLease
  - generationLogFilename
  - sessionFormatCatalog
related:
  - spine.session-log
  - subsys.persistence.session-persistence
  - subsys.persistence.sqlite
  - subsys.util.home-paths
  - subsys.core.session
  - subsys.persistence.checkpoint
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-session-persistence-jsonl` 是 **host 面** shipped **唯一** 的 `SessionPersistence` Provider：每个 session 一个目录，里面按 format generation 放不可变 `session.jsonl` / `session.vN.jsonl[.zstd]`，跨进程 write ownership 靠 `session.lock`。`create` / `open` 返回 `SessionHandle`。load 时走 `sessionFormatCatalog` 的 v0→v1→v2→v3 adjacent 链。这不是第二份可就地改写的 chat 数组，也不是已删除的 SQLite session persistence。没有 coordinator。

## 能回答的问题

- shipped 默认 session 盘是 JSONL 还是 SQLite？`web` / `headless` / `sdk` / `sdk-minimal` / `acp` 各自有没有再挂一行？
- 盘上路径怎么拼：`dshHomePath('sessions')`、`projectKey(cwd)` / `_no-cwd`、`encodeSegment(id)`、`session.jsonl` vs `session.v3.jsonl[.zstd]`？
- `session/event` 与 `session/flush` 分别是 emit 还是 parallel？JSONL 自己听不听 waterfall？
- `create` / 第一次 `append` / `handle.flush` 谁碰盘？write lease 何时拿、何时放？
- `SESSION_FORMAT_VERSION = 3` 时，v0/v1/v2 文件怎么变成可读的 v3？比 3 新的盘呢？
- 明文截断末行和 zstd 截断末帧怎么修？POSIX `link()` 和 Win32 `MoveFileExW` 差在哪？

## 职责边界

本包拥有：JSONL 物理编码（明文 / checksummed Zstandard 帧）、generation 文件名与不可变发表（`prepareJsonlMigration` + `publish`）、每会话目录合同、跨进程 `SessionWriteLease`、handle 实现（`JsonlSessionHandle`：200ms live 合批、torn-tail truncate、per-handle 串行链）、首写物化（POSIX `link()+unlink()` 或 Win32 `MoveFileExW(WRITE_THROUGH)`）、后续 `append`+`fsync` 与失败回滚。

本包**不**拥有：`SessionPersistence` / `SessionHandle` 的 Service Definition（[subsys.persistence.session-persistence](session-persistence.md)）；`Session.append` / `deriveMessages` / `SurfaceOp`（[subsys.core.session](../core/session.md)）；在 adapter / top-level tool body **之前**调用 `sessions.flush` 的胶水（[subsys.persistence.checkpoint](checkpoint.md)）；`$DSH_HOME` 解析（[subsys.util.home-paths](../util/home-paths.md)）；adjacent migrator 的语义（`dsh-session-format-v0-to-v1` / `v1-to-v2` / `v2-to-v3`，本包只当 catalog adapter 调用）；已删除的 SQLite session persistence（[subsys.persistence.sqlite](sqlite.md)）。

JSONL 是 **host 面**进程级 provider。agent-preset 面不另造一份盘。Client 半边不持有 `ctx.sessionPersistence`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-persistence-jsonl/src/index.ts` | `JsonlSessionPersistence`：`create` / `open` / `stat` / `list`、catalog 适配、物化 / append / torn truncate |
| `packages/session/session-persistence-jsonl/src/storage.ts` | `JsonlSessionHandle`、`JsonlBackendTracker`、`LIVE_WRITE_BATCH_MAX_DELAY_MS = 200` |
| `packages/session/session-persistence-jsonl/src/lease.ts` | `SessionWriteLease`：POSIX `flock` / Win32 named semaphore |
| `packages/session/session-persistence-jsonl/src/format.ts` | `HeaderLine`、`logPath`、`generationLogFilename`、`refuseForeignFormatVersion`、`SessionLogScanner` |
| `packages/session/session-persistence-jsonl/src/generation.ts` | 把历史 generation 解码并发表成当前不可变文件 |
| `packages/session/session-format-catalog/src/generated.ts` | `sessionFormatCatalog`：`currentVersion: 3` + 三条 adjacent migration |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `id: session-persistence-jsonl` |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 不叠 base：`id: sessions`，`compression: none` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | **3**。当前逻辑 header 与当前 generation 文件都钉这个数。 [E: packages/core/session/src/types.ts:88] |
| `sessionFormatCatalog` | `currentVersion: 3`；codecs v0/v1/v2/v3；migrations `sessionFormatV0ToV1` → `sessionFormatV1ToV2` → `sessionFormatV2ToV3`。 [E: packages/session/session-format-catalog/src/generated.ts:15] [E: packages/session/session-format-v2-to-v3/src/migration.ts:14] adjacent 链要求 `to === from + 1`。 [E: packages/session/session-format/src/chain.ts:30] |
| `generationLogFilename` | v0 文件名是 `session.jsonl`（可加 `.zstd`）；vN（N≥1）是 `session.vN.jsonl`。 [E: packages/session/session-format/src/filename.ts:16] [E: packages/session/session-persistence-jsonl/src/format.ts:57] |
| `logPath` | 当前 generation：`generationLogPath(..., SESSION_FORMAT_VERSION, compression)` → 默认 `session.v3.jsonl.zstd`。 [E: packages/session/session-persistence-jsonl/src/format.ts:297] [E: packages/session/session-persistence-jsonl/src/format.ts:303] |
| `HeaderLine` | 文件第一行：`type: 'session'` + 当前 header 字段（`isSeeded` 必填；`delegationDepth` 缺省写成 `0`）。inherited cut 不在 header 行里，而在最后一条 `session/end-seed { inherited: true }`。 [E: packages/session/session-persistence-jsonl/src/format.ts:82] [E: packages/session/session-persistence-jsonl/src/format.ts:118] |
| `JsonlCompression` | `'zstd'` \| `'none'`。默认 `'zstd'`。 [E: packages/session/session-persistence-jsonl/src/format.ts:34] [E: packages/session/session-persistence-jsonl/src/index.ts:66] |
| `Config` | `root` 必填（构造时 `resolve`，避免后来 `process.cwd()` 把盘拆开）。 [E: packages/session/session-persistence-jsonl/src/index.ts:88] [E: packages/session/session-persistence-jsonl/src/index.ts:270] `compression` 默认 `'zstd'`。合批在 handle 上。 |
| `LIVE_WRITE_BATCH_MAX_DELAY_MS` | `200`。只合批 **routed live** `session/event`，不是 Definition 包里的 write-behind 模块。 [E: packages/session/session-persistence-jsonl/src/storage.ts:36] |
| `LEASE_FILENAME` | `'session.lock'`，放在 session 目录里。 [E: packages/session/session-persistence-jsonl/src/lease.ts:40] |
| `SessionLocation` | 拒读诊断用 `{ kind: 'jsonl', path }`。不是面向消费者的 `locate()` API——读日志走 handle `read`。 [E: packages/session/session-persistence/src/errors.ts:85] [E: packages/session/session-persistence-jsonl/src/index.ts:293] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', startSeq, endSeq }`。**没有 delete。** JSONL 文件不删已提交行。 [E: packages/core/session/src/types.ts:434] [E: packages/core/session/src/types.ts:436] |

盘布局：`<root>/<projectKey(cwd)|_no-cwd>/<encodeSegment(id)>/session[.vN].jsonl[.zstd]`。`cwd === undefined` 用 `_no-cwd`。 [E: packages/session/session-persistence-jsonl/src/format.ts:253] [E: packages/session/session-persistence-jsonl/src/format.ts:266] `projectKey` 把分隔符收成 `-`，有意有损；slug 截到 251 再包成 `--…--`（整段最长 255）。 [E: packages/session/session-persistence-jsonl/src/format.ts:224] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:488] `encodeSegment` 对任意 UTF-16（含 lone surrogate）单射，空串抛错。 [E: packages/session/session-persistence-jsonl/src/format.ts:198]

同一目录里可以同时存在历史 generation（`session.jsonl` / `session.v2.jsonl`）和当前 generation（`session.v3.jsonl`）。resolver 取 **数字最大** 的 canonical 文件名。 [E: packages/session/session-persistence-jsonl/src/index.ts:1369] [E: packages/session/session-persistence-jsonl/src/index.ts:1396]

v3 的 `eventLines` 一行一事；Assistant 流嵌在 `assistant/message` / `assistant/attempt` 的 `stream` 里。 [E: packages/session/session-persistence-jsonl/src/format.ts:312]

## 控制流

1. **组合真树挂 JSONL，不挂 SQLite persistence。** `dsh-base` 插入 `id: session-persistence-jsonl`，`root: !!js dshHomePath('sessions')`。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113] `dshHomePath` 接到 `resolveDshHome()`：非空 `$DSH_HOME` 赢，否则 `join(homedir(), '.dsh')`。 [E: packages/util/home-paths/src/index.ts:98] [E: packages/util/home-paths/src/index.ts:87] [E: packages/util/home-paths/src/index.ts:61] `PROFILE_TEMPLATES`：`web` 与 `headless` / `sdk` / `acp` 先叠 `dsh-base`；`sdk-minimal` 是唯一不叠 base 的 shipped bundle。 [E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:122] `dsh-headless` insert 是 `code-runtime` / `headless-startup` / `headless-runner`；`dsh-web-app` 另插 host 行，两边都**不再**写 jsonl。 [E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/web-app/cordis.patch.yml:75] `dsh-sdk-minimal` 自己挂同一包，`id: sessions`，`compression: none`。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:151] [E: packages/bundle/sdk-minimal/cordis.patch.yml:155]

2. **插件占 `ctx.sessionPersistence`，构造时核对 catalog 版本。** `JsonlSessionPersistence` `name = 'session-persistence-jsonl'`，service 键仍是 `sessionPersistence`。 [E: packages/session/session-persistence-jsonl/src/index.ts:242] catalog `currentVersion` 必须等于 `SESSION_FORMAT_VERSION`。 [E: packages/session/session-persistence-jsonl/src/index.ts:263] 然后 `tracker.install(ctx)`。 [E: packages/session/session-persistence-jsonl/src/index.ts:285] Definition 包本身**不是** shipped Cordis 行。

3. **热路径只入队；耐久屏障是 `session/flush`。** `session/event` emit：tracker 找到该 id 的 write handle 就 `enqueueLive`（`structuredClone`）。 [E: packages/core/session/src/index.ts:72] [E: packages/session/session-persistence-jsonl/src/storage.ts:535] `session/flush` parallel：`drainLive()` 再 `handle.flush()`。 [E: packages/session/session-persistence-jsonl/src/storage.ts:544] JSONL listener **没有** `next()`。无 live writer 时 flush listener 直接 return。

4. **谁在 waterfall 里 `next()`。** 副作用门不在 JSONL 包。checkpoint `inject = ['llm', 'sessionPersistence', 'sessions', 'tools']`：有 live session 时 `await ctx.sessions.flush(session)` **再** `yield* next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36]

5. **`create` 懒物化；lease 也懒。** `create` 校验 header、`toHeaderLine`（seeded 必须带 inherited cut），若本进程 pending 或盘上已有同 id 则 `SessionAlreadyExistsError`。然后 `tracker.registerCreated`，**不**拿 kernel lock——未物化会话没有文件系统足迹。 [E: packages/session/session-persistence-jsonl/src/index.ts:308] [E: packages/session/session-persistence-jsonl/src/index.ts:317] [E: packages/session/session-persistence-jsonl/src/index.ts:325] 测试：`create()` 不建文件，但 `list()` 含该 id。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1290] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1298] 第一次 `persistContiguous` / `persistHeader` 才 `ensureLease` → `SessionWriteLease.acquire`。 [E: packages/session/session-persistence-jsonl/src/storage.ts:322] [E: packages/session/session-persistence-jsonl/src/index.ts:828] 已存在 artifact 的 `open(..., 'write')` 在构造 handle **之前**就拿 lease。 [E: packages/session/session-persistence-jsonl/src/index.ts:370]

6. **lease 是 kernel 锁，不是过期租约。** POSIX：对 `session.lock` 非阻塞 exclusive lock，再核对 locked inode 仍是路径上的那个文件。Win32：named semaphore。争用映射为 `SessionAlreadyOwnedError`。读者从不碰锁。holder `close` 后后继可以 write-open。 [E: packages/session/session-persistence-jsonl/src/lease.ts:70] [E: packages/session/session-persistence-jsonl/src/lease.ts:96] [E: packages/session/session-persistence-jsonl/src/win32.ts:154] [E: packages/session/session-persistence-jsonl/tests/lease.spec.ts:180] [E: packages/session/session-persistence-jsonl/tests/lease.spec.ts:188] 进程死则 kernel 放锁、没有 expiry 去剥夺卡住的活 writer。 [I] `release` 不删除 POSIX lock 文件，好留下稳定 inode。 [E: packages/session/session-persistence-jsonl/src/lease.ts:124]

7. **首笔物化：header+第一批原子发表。** `encodeMaterialization` 在 zstd 下把 header 与 event 写成**两帧**（第一帧必须恰好一行 header）。 [E: packages/session/session-persistence-jsonl/src/index.ts:1207] [E: packages/session/session-persistence-jsonl/src/index.ts:75] POSIX：`mkdir` `0o700` → 写 `0o600` temp → `sync` → `link(tmp, finalPath)` → `syncDirPosix` → `unlink` temp。 [E: packages/session/session-persistence-jsonl/src/index.ts:1137] `link` 遇已存在目标 `EEXIST`，两个进程不能互相 `rename` 覆盖。Win32：`ensureDurableDirectoryWin32` 后 `publishNewFileWin32` = `MoveFileExW(..., MOVEFILE_WRITE_THROUGH)`，无替换、无跨卷 copy。 [E: packages/session/session-persistence-jsonl/src/win32.ts:183] [E: packages/session/session-persistence-jsonl/src/win32.ts:134] [E: packages/session/session-persistence-jsonl/src/win32.ts:39] 空会话要显式 `handle.flush()` 才会写出只有 header 的文件。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1308]

8. **已物化后的 append：写完 `fsync`，失败则截回。** `appendLines` 记下 `before` size，`writeFile`+`sync`；任一步失败就 `truncate(before)` 再 `sync`，避免半行留下重复 seq。 [E: packages/session/session-persistence-jsonl/src/index.ts:1246] [E: packages/session/session-persistence-jsonl/src/index.ts:1260] handle 上 `persistContiguous` 要求 `assertContiguous`，并在第一笔新 append 前先 `truncateTornTail`、再把 zstd 末帧捞回的 `recoveredTail` 写回去。 [E: packages/session/session-persistence-jsonl/src/storage.ts:323] [E: packages/session/session-persistence-jsonl/src/storage.ts:329]

9. **读路径：选 generation → 必要时发表当前文件 → 再解码。** `open`/`read` 经 `findLog` 选最高 version 文件。若 `sourceVersion === 3` 走当前解码；否则 `prepareJsonlMigration` 调 catalog `createRestore`，把 v3 字节 **发表** 到 `session.v3.jsonl[.zstd]`，**不改**源 generation。 [E: packages/session/session-persistence-jsonl/src/index.ts:498] [E: packages/session/session-persistence-jsonl/src/index.ts:606] [E: packages/session/session-persistence-jsonl/src/generation.ts:980] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1028] 比当前新的 generation → `SessionFormatUnsupportedError`（upgrade-harness + raw log 路径）。 [E: packages/session/session-persistence-jsonl/src/index.ts:528] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:549] 当前明文扫描：JSON 解析后先 `refuseForeignFormatVersion`，再 `isHeaderLine`。 [E: packages/session/session-persistence-jsonl/src/format.ts:361] [E: packages/session/session-persistence-jsonl/src/format.ts:363] 非 object 的第一行没有 version，继续当 corrupt。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:581] catalog 拒迁（未知历史 type 等）留下 v0 不动。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1223]

10. **明文 torn vs zstd torn。** 明文：`scanLog` 把无换行的末碎片留在 `committedBytes` 之外，`recoveredTail` 恒为 `[]`。 [E: packages/session/session-persistence-jsonl/src/index.ts:739] [E: packages/session/session-persistence-jsonl/src/format.ts:530] zstd：`scanZstdFrames` 给出完整帧 + 可选 `tornStart`；完整帧里若还有半行 JSONL，直接抛 `complete frame contains a torn JSONL record`（不可修）。 [E: packages/session/session-persistence-jsonl/src/zstd.ts:48] [E: packages/session/session-persistence-jsonl/src/index.ts:931] 末帧不完整则 `decompressZstdPrefix` 尽量取出已有明文，完整记录进 `recoveredTail`，`tornTruncateTo = tornStart`。 [E: packages/session/session-persistence-jsonl/src/zstd.ts:154] [E: packages/session/session-persistence-jsonl/src/index.ts:963] 第一帧必须恰好一行 header。 [E: packages/session/session-persistence-jsonl/src/index.ts:75]

11. **`stat` / `list` 走 catalog `readHeader`，可以跳过外国 format。** listing 遇到 `SessionFormatUnsupportedError` 时 **skip 该 id**，整棵 list 不失败；真正拒绝发生在 `open`。 [E: packages/session/session-persistence-jsonl/src/index.ts:993] [E: packages/session/session-persistence-jsonl/src/index.ts:1040] 形状仍像今天的 header 但 `version === 42` 的行，`open` 拒、`list` 为空。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:553]

12. **发现与编码门。** 同一 id 出现在两个 project → 抛 duplicate。 [E: packages/session/session-persistence-jsonl/src/index.ts:1419] 目录里若存在对面 suffix（`.jsonl` vs `.jsonl.zstd`）→ encoding mismatch，要求换 root 或换 `compression`。 [E: packages/session/session-persistence-jsonl/src/index.ts:1585] [E: packages/session/session-persistence-jsonl/tests/zstd.spec.ts:832] project 根上若还有扁平 `*.jsonl` 文件 → `unsupported flat-file layout`。 [E: packages/session/session-persistence-jsonl/src/index.ts:1593] header 的 `(id, cwd)` 必须指回正在读的那条 path（允许大小写不敏感盘上的 `realpath` 别名）。 [E: packages/session/session-persistence-jsonl/src/index.ts:1436]

## 设计动机

DSH 是 Cordis 组合运行时：`profile → bundle → agent preset`，`model-visible ⟺ logged`。要把这条合同撑到 crash 与跨进程之后，host 必须有一份按 session 可定位的耐久介质，并且在 adapter 花钱、top-level tool 对外产生副作用**之前**把已提交前缀 `flush` 下去。

选「每会话一个目录 + 不可变 generation 文件」：v0/v1/v2 源盘可以原样留下，v3 作为新文件发表，迁移失败不会毁掉可读的历史 generation。Zstandard **按帧**拼接，才能在不重写已提交前缀的前提下追加一批、并从截断末帧里捞回完整 JSONL 记录。第一帧独占 header，list / stat 才只需解一帧。

`link()` 而不是 `rename()`，是为了两个进程同时物化同一 id 时失败可见。`refuseForeignFormatVersion` 放在 `isHeaderLine` 前面，是为了 format bump 之后旧 binary 仍能说出「升级 harness」，而不是把未来字段判成 corrupt。

kernel lease 没有超时：宁可让活着但卡住的 writer 占着锁，也不让后到者往同一文件上撕。未物化会话不占锁、不留空文件。没有 coordinator：每把 write handle 自己持 lease。

## Gotcha

- **SQLite session persistence 已删除。** 默认就是本页的 JSONL。query-sqlite / storage-sqlite 是别的库，见 [subsys.persistence.sqlite](sqlite.md)。 [E: packages/bundle/base/cordis.patch.yml:110]
- **当前文件名带 `v3`。** 不要再假设活日志永远叫 `session.jsonl`，也不要写 `session.v2.jsonl` 当当前 generation。v0 历史文件仍用无版本后缀；当前 writer 写 `session.v3.jsonl[.zstd]`。 [E: packages/session/session-format/src/filename.ts:16]
- **v0/v1/v2 会迁；比 3 新的盘不会。** catalog 是 adjacent 链。缺环、未知历史 type、或 `version > 3` 都拒，源 generation 不变。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1028] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:1223]
- **`list` 会跳过外国 format；`open` 不会。** 缺字段的未来 header 可能被 list 当成「不是 header」或 skip；真正拒绝在 `open`。 [E: packages/session/session-persistence-jsonl/src/index.ts:993]
- **JSONL torn 修复分两步，且只在 write 路径落地。** reader 永不返回 torn 尾。下一次 `persistContiguous` 才 truncate + 重写 recovered 记录。明文没有 recovered 记录可捞。
- **完整 zstd 帧里的半行 JSONL 是 corrupt，不是 torn。** 只有结构不完整的**末帧**才进 `tornStart`。 [E: packages/session/session-persistence-jsonl/src/index.ts:931]
- **同一 root 不能混 `.jsonl` 与 `.jsonl.zstd`。** 换编码换 root，或把 `compression` 改成跟盘上一致。 [E: packages/session/session-persistence-jsonl/src/index.ts:1585]
- **旧扁平布局直接拒。** `<project>/<encodeSegment(id)>.jsonl[.zstd]` 不再被当成会话。 [E: packages/session/session-persistence-jsonl/src/index.ts:1593]
- **`session/flush` 没有 `next()`。** 否决发生在 `llm/stream` / `tools/execute` 那些必须 `next()` 的链上。 [E: packages/core/session/src/index.ts:81]
- **`projectKey` 有损。** `/a/b-c` 与 `/a-b/c` 进同一个 project 目录；id 仍靠 `encodeSegment` 分开。 [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:488]
- **200ms 不是完成时限。** 它是 live 合批窗口；checkpoint 走立刻 `drainLive`。显式 `handle.append` 不进这个窗。
- **compaction 不删 JSONL 行。** 模型历史靠 `surfaceOp: replace` 阴影。 [E: packages/core/session/src/types.ts:436]
- **`sdk-minimal` 的 JSONL 默认明文。** 它不叠 `dsh-base`，自己挂包且 `compression: none`。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:155] [E: packages/boot/app-boot/src/profile.ts:122]
- **没有公开 `locate` / `readRaw`。** 拒读错误里的 `SessionLocation` 只给诊断。读正文用 `handle.read`。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app / headless / sdk / acp | sdk-minimal |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-persistence` 的 `SessionPersistence` / `SessionHandle` | `ctx.sessionPersistence`；`create` / `open` / `flush` / `stat` / `list` | **无**独立 Cordis 行 | 无 | 无 |
| Provider | `@deepseek-ai/dsh-session-persistence-jsonl` 的 `JsonlSessionPersistence` + `JsonlSessionHandle` + `SessionWriteLease` | 同一键；generation 文件 + kernel lock | `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`，默认 `compression: 'zstd'` | **继承** base，不重挂 | `id: sessions`，同包，`compression: none` |
| Consumer | `JsonlBackendTracker`（jsonl 构造时安装）；`session-checkpoint-policy`；`AgentLoop` create/resume；web 上的 workspace / session-query / export | `session/event` **emit** 入队；`session/flush` **parallel** 刷盘。tracker listener **无** `next()`。checkpoint 在 waterfall 里先 `sessions.flush` 再 `next()` | `id: session-checkpoint-policy` 与 `id: session` 同在 base | web 另加只读消费者，不换 backend | 同一 JSONL provider，明文盘；**无** checkpoint 行 |

换 Persistence Provider 只换 `SessionHandle` 的落盘实现。不能换掉 `SessionEvent` / `surfaceOp` 合同。preset 若再 `provide` 一份 `sessionPersistence` 且不 `isolate`，按 host 面服务泄漏处理。已删除的 sqlite persistence 不能 silently 顶替本页。

## Sources

- packages/session/session-persistence-jsonl/src/index.ts
- packages/session/session-persistence-jsonl/src/storage.ts
- packages/session/session-persistence-jsonl/src/lease.ts
- packages/session/session-persistence-jsonl/src/format.ts
- packages/session/session-persistence-jsonl/src/generation.ts
- packages/session/session-persistence-jsonl/src/zstd.ts
- packages/session/session-persistence-jsonl/src/win32.ts
- packages/session/session-persistence-jsonl/tests/jsonl.spec.ts
- packages/session/session-persistence-jsonl/tests/zstd.spec.ts
- packages/session/session-persistence-jsonl/tests/lease.spec.ts
- packages/session/session-persistence-jsonl/package.json
- packages/session/session-format-catalog/src/generated.ts
- packages/session/session-format/src/filename.ts
- packages/session/session-format/src/chain.ts
- packages/session/session-format-v0-to-v1/src/migration.ts
- packages/session/session-format-v1-to-v2/src/migration.ts
- packages/session/session-format-v2-to-v3/src/migration.ts
- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence/src/handle.ts
- packages/session/session-persistence/src/errors.ts
- packages/session/session-persistence/src/storage-contract.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/util/home-paths/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only `SessionEvent`、`deriveMessages`、`surfaceOp` 只有 replace 没有 delete、checkpoint 两个副作用落点。
- [subsys.persistence.session-persistence](session-persistence.md)：`ctx.sessionPersistence` Definition 与 `SessionHandle`。
- [subsys.persistence.sqlite](sqlite.md)：session-persistence-sqlite 已删除；query / storage sqlite 仍在。
- [subsys.util.home-paths](../util/home-paths.md)：`dshHomePath('sessions')` 与 `$DSH_HOME` / `~/.dsh`。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` 与 top-level `tools/execute` 在 `next()` 之前 `sessions.flush`。
