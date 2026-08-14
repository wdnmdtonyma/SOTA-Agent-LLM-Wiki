---
id: subsys.persistence.session-persistence
title: session persistence 缝
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence/src/coordinator.ts
  - packages/session/session-persistence/src/revision.ts
  - packages/session/session-persistence/src/preparations.ts
  - packages/session/session-persistence/src/write-behind.ts
  - packages/session/session-persistence/tests/persistence.spec.ts
  - packages/session/session-persistence/tests/write-behind.spec.ts
  - packages/session/session-persistence/tests/preparations.spec.ts
  - packages/session/session-persistence/tests/coordinator-contract.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/repair.ts
  - packages/core/session/tests/scoped.spec.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/settings/settings/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - SessionPersistence
  - PersistenceCoordinator
  - PersistenceBackend
  - SessionFormatUnsupportedError
  - sessionFormatVersionRefusal
related:
  - spine.session-log
  - spine.overview
  - spine.capability-seams
  - spine.context-and-compaction
  - subsys.core.session
  - subsys.persistence.jsonl
  - subsys.persistence.sqlite
  - subsys.persistence.checkpoint
  - subsys.persistence.projection
  - subsys.persistence.session-query
  - subsys.persistence.workspace
  - subsys.persistence.storage
evidence: explicit
status: verified
updated: 47f943859b
---

> `SessionPersistence`（`ctx.sessionPersistence`）是 **host 面** durable session-log 的 **Service Definition**，不是 shipped Cordis 行。第一方 backend 把介质操作交给 `PersistenceCoordinator`：`session/event` 只入队冻结事件，`session/flush`（**parallel**，没有 `next()`）才是耐久屏障。这是 Cordis 组合运行时（`profile → bundle → agent preset`）把 **model-visible ⟺ logged** 落到磁盘的缝，不是另一套「内存 messages + 事后写盘」的 coding-agent 存储。

## 能回答的问题

- `ctx.sessionPersistence` 是 Definition 还是 shipped 行？物理 JSONL / SQLite 介质谁提供？`dsh web` / headless 各继承哪一层？
- `session/event` 与 `session/flush` 分别是 emit 还是 parallel？谁必须 `next()`？热路径碰不碰盘？
- write-behind 默认窗口是多少？prepared cache 默认容量是多少？`inspect` 会不会 `commitRepair`？
- `SESSION_FORMAT_VERSION` 现在是多少？跨 version 有没有 migration？未知 `type` 在 append 时拒还是在读时拒？
- crash 尾的 `interruptedTurnClosers` 谁合成、谁写进盘？live 开 turn 上 `load` 会怎样？

## 职责边界

本包拥有：`SessionPersistence` 抽象缝（`ctx.sessionPersistence`）、`PersistenceCoordinator` 对第一方 backend 的编排（create / append / load / inspect / prepare / readFrom、write-behind、prepared LRU、crash-tail 合成与 `commitRepair` 时序）、以及 `session/created|event|flush|disposed` 上的写路径监听。

本包**不**拥有：JSONL 盘布局与 zstd / 原子改名（[subsys.persistence.jsonl](jsonl.md)）；SQLite 三表与 `SCHEMA_VERSION = 15` 拒盘（[subsys.persistence.sqlite](sqlite.md)）；在 `llm/stream` / `tools/execute` 上先 `flush` 再 `next()` 的胶水（[subsys.persistence.checkpoint](checkpoint.md)）；内存 `Session.append` 合同、`deriveMessages()`、`SurfaceOp`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；compaction 何时发出 `replace`（[spine.context-and-compaction](../../spine/context-and-compaction.md)）；非会话 `ctx.storage`（**只 web-app** 的 `storage` + `storage-json` + `storage-domain`；[subsys.persistence.storage](storage.md)）；workspace 实体（**只 web-app**；[subsys.persistence.workspace](workspace.md)）；session-query / FTS（shipped `session-query-sqlite` 挂在 base，`openAt: never`；[subsys.persistence.session-query](session-query.md)）；settings 分层、`.credentials.yaml`。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。跨 version **没有**自动 migration：`version > SESSION_FORMAT_VERSION` 的盘文案是 upgrade the harness；更旧的盘「this build ships no upgrade path」。 [E: packages/core/session/src/types.ts:56] [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80] [E: packages/session/session-persistence/src/coordinator.ts:1047]
- SQLite **session 盘** `SCHEMA_VERSION = 15`：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。该 backend **不**在任何 shipped bundle。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] [E: packages/session/session-persistence-sqlite/src/schema.ts:109]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:80]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，`SurfaceOp` 另有 `'append'`，**没有** delete。 [E: packages/core/session/src/types.ts:372] [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`SettingsScope.get` 读的是 `resolve` 的结果。 [E: packages/settings/settings/src/index.ts:458] [E: packages/settings/settings/src/index.ts:705]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。secret 值在 `$DSH_HOME/.credentials.yaml`。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52]
- shipped `session-query-sqlite`：`path: ':memory:'`、`openAt: never`。base 挂这一行，headless 继承；默认**没有**打开 FTS。 [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:120] [E: packages/bundle/base/cordis.patch.yml:121]
- `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache` **只 web-app**。headless / base **没有**这些行。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

`dsh-session-persistence` 坐在 **host 面**。agent-preset 面不 remount 这条缝；preset 只决定这一会话的 tools / persona / isolate，并把 preset id 写进 header 或 `agent-preset/selected`。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-persistence/src/index.ts` | `SessionPersistence` 抽象类；`ctx.sessionPersistence`；`locate` / `create` / `append` / `load` / `inspect` / `prepare` / `readFrom` |
| `packages/session/session-persistence/src/coordinator.ts` | `PersistenceCoordinator`、`PersistenceBackend`、`sessionFormatVersionRefusal`、`SessionFormatUnsupportedError` |
| `packages/session/session-persistence/src/write-behind.ts` | 每条 live session 的固定窗口 batch + `flush` 屏障 |
| `packages/session/session-persistence/src/preparations.ts` | 冷读共享、`inspect` 不占坑、`reserve` 独占、ready LRU |
| `packages/session/session-persistence/src/revision.ts` | 不透明 `SessionPersistenceRevision` |
| `packages/core/session/src/index.ts` | `session/event` emit、`session/flush` parallel、`SessionStore.flush` |
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION`、`ignorable`、`SurfaceOp` |
| `packages/core/session/src/repair.ts` | `interruptedTurnClosers` |
| `packages/session/session-checkpoint-policy/src/index.ts` | 在 waterfall 里 `flush` 后再 `next()` |
| `packages/session/session-persistence-jsonl/src/index.ts` | shipped Provider：构造 `PersistenceCoordinator` 并 `provide` |
| `packages/bundle/base/cordis.patch.yml` | host 组合行 `id: session-persistence-jsonl`；同层 `session-query-sqlite` `openAt: never` |
| `packages/bundle/web-app/cordis.patch.yml` | `storage*` / `workspace` / projection-cache **只** web-app；不换 session 盘 |
| `packages/boot/app-boot/src/profile.ts` | `web` / `headless` 都叠在 `dsh-base` 上 |
| `packages/session/session-persistence/tests/persistence.spec.ts` | inspect 不 commit；prepare 才 `commitRepair` |
| `packages/session/session-persistence/tests/write-behind.spec.ts` | 200 ms 窗口、并发 `flush` 合成一条 barrier |
| `packages/session/session-persistence/tests/preparations.spec.ts` | inspect 共享 in-flight；reserve 独占 |
| `packages/session/session-persistence/tests/coordinator-contract.ts` | 跨 backend：version 拒读、未知 type、live → flush → reload |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionPersistence` | 抽象 `Service`，构造 `super(ctx, 'sessionPersistence')`。不是 Cordis 插件行。 [E: packages/session/session-persistence/src/index.ts:86] |
| `PersistenceBackend` | coordinator 调用的介质原语：`loadStored` [E: packages/session/session-persistence/src/coordinator.ts:144] / `readStoredRevision` [E: packages/session/session-persistence/src/coordinator.ts:152] / `appendBatch` [E: packages/session/session-persistence/src/coordinator.ts:184] / `commitRepair` [E: packages/session/session-persistence/src/coordinator.ts:193] / `list` [E: packages/session/session-persistence/src/coordinator.ts:199]，可选 `loadStoredFrom` [E: packages/session/session-persistence/src/coordinator.ts:176] / `locate` [E: packages/session/session-persistence/src/coordinator.ts:207] / `close` [E: packages/session/session-persistence/src/coordinator.ts:214]。 |
| `PersistenceCoordinator` | 第一方 backend 共用的缓冲、per-id 串行链、adoption、repair、dispose。第三方可以不经过它、直接实现缝。 [E: packages/session/session-persistence/src/coordinator.ts:588] |
| `DEFAULT_WRITE_BATCH_MAX_DELAY_MS` | `200`。空队列接到第一笔 live 事件后开一个固定窗口，不是「每个 append 一刷」。 [E: packages/session/session-persistence/src/coordinator.ts:30] |
| `DEFAULT_PREPARED_SESSION_CACHE_SIZE` | `5`。只留 **ready** 的 unpublished 源；`committing` / `reserved` 不参与 LRU 驱逐。 [E: packages/session/session-persistence/src/coordinator.ts:27] [E: packages/session/session-persistence/src/preparations.ts:294] |
| `SESSION_FORMAT_VERSION` | `0`。新 header 必须等于该值。跨 version **没有**自动 migration。 [E: packages/core/session/src/types.ts:56] [E: packages/core/session/src/index.ts:101] |
| `sessionFormatVersionRefusal` | `version > SESSION_FORMAT_VERSION`（现为 `0`）→ 「newer harness — upgrade the harness」；否则更旧 → 「this build ships no upgrade path」。 [E: packages/session/session-persistence/src/coordinator.ts:78] [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80] |
| `SessionFormatUnsupportedError` | 盘完好但本 build 不能忠实解释（错 version，或未知且非 `ignorable` 的 type）。不是 `SessionPersistenceCorruptionError`。 [E: packages/session/session-persistence/src/coordinator.ts:55] |
| `ignorable` | 信封可选 `ignorable: true`。缺省 = required：读者不认识 `type` 必须拒读。 [E: packages/core/session/src/types.ts:422] |
| `StoredPrefix` | `meta` + 连续事件前缀 + `revision` + 可选不透明 `tornMarker`。coordinator 只看 marker 是否存在，类型归 backend。 |
| `SessionInspection` | 深冻的 `{ meta, events }`。`inspect` 可以带着开 turn 或内存合成 closer；`load` 要求冷盘已平衡，或 live 已闭合。 |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。**没有 delete。** compaction 只追加 replace 事件，persistence 当普通 batch 落盘。 [E: packages/core/session/src/types.ts:372] [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] |

`SCHEMA_VERSION = 15` 是 **SQLite 表布局**版本（[subsys.persistence.sqlite](sqlite.md)）：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。与 session event 的 `version`、session-query schema 8、storage-sqlite schema 1 **正交**。本缝的 format 门只看 header `version === 0`。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] [E: packages/session/session-persistence-sqlite/src/schema.ts:109]

## 控制流

1. **组合真树：Definition 无行，Provider 在 base。** `web` 模板是 `dsh-base` + `dsh-web-app`，`headless` 是 `dsh-base` + `dsh-headless`。`dsh-base` 挂 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`。同层还挂 `session-query-sqlite`（`path: ':memory:'`、`openAt: never`）。web-app / headless **不**重挂 jsonl / checkpoint / settings / credentials；它们继承这条 host 行。web-app **另** insert `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`（**只 web-app**），不换 session 盘。`session-persistence-sqlite` 仓库有、任何 shipped bundle 都没有。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:99] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

2. **Provider 构造 coordinator，键是 `ctx.sessionPersistence`。** `JsonlSessionPersistence` `inject = ['sessions']`，`super(ctx)` 走 `SessionPersistence` 的 `super(ctx, 'sessionPersistence')`，再 `new PersistenceCoordinator(this.ctx, this, { preparedSessionCacheSize, writeBatchMaxDelayMs })`。Config 默认就是 coordinator 那两个常量。SQLite 后端用同一编排，只是 `appendBatch` / `loadStored` 换介质。 [E: packages/session/session-persistence-jsonl/src/index.ts:124] [E: packages/session/session-persistence-jsonl/src/index.ts:160] [E: packages/session/session-persistence/src/index.ts:86]

3. **Coordinator 安装写路径 effect + 四个 listener。** 构造末尾 `installWritePath()`。先 `ctx.effect` 注册 dispose：对全部 live session `flush`，排空 per-id chain，再 `backend.close?.()`。然后四个 **emit / parallel** 监听（都没有 `next`）：`session/created` → `initFor`；`session/event` → `enqueue`；`session/flush` → `this.flush(session)`；`session/disposed` → `retire`。HMR 不重放 `session/created`，所以对 `ctx.sessions.list()` 已有会话再 `initFor` 一次。 [E: packages/session/session-persistence/src/coordinator.ts:624] [E: packages/session/session-persistence/src/coordinator.ts:1118] [E: packages/session/session-persistence/src/coordinator.ts:1123] [E: packages/session/session-persistence/src/coordinator.ts:1125] [E: packages/session/session-persistence/src/coordinator.ts:1129] [E: packages/session/session-persistence/src/coordinator.ts:1132] [E: packages/session/session-persistence/src/coordinator.ts:1136]

4. **热路径：`Session.append` 只改内存，再 emit `session/event`。** `seq` 钉成 `this.log.length`，校验后 `log.push`，**之后**才 fire-and-forget 调 `session/event` observer。事件声明 `@mode emit`：observer 失败不能回滚已提交事件，也没有 `next()` 可挡。Coordinator 在 listener 里 `structuredClone` 进自己的队列，与 live `Session` 脱钩。 [E: packages/core/session/src/index.ts:76] [E: packages/core/session/src/index.ts:643] [E: packages/core/session/src/index.ts:646] [E: packages/session/session-persistence/src/write-behind.ts:47]

5. **write-behind：固定 200 ms 窗口，失败留队列。** 空队列接到第一笔后 `setTimeout(..., maxDelayMs)`；窗口内继续入队合成一批。`flush()` 若已有 barrier 则加入同一 promise；否则 `cancelTimer()` 再开 barrier，排到 `pending` 空。后台写失败：事件按原序塞回队列、`automaticPaused`，`reportBackgroundFailure` 打 warn，**不**把 producer 的 `append` 打成失败。测试：20 条每隔 10 ms 入队，仍合成 **一个** 200 ms batch。 [E: packages/session/session-persistence/src/write-behind.ts:82] [E: packages/session/session-persistence/src/write-behind.ts:64] [E: packages/session/session-persistence/src/write-behind.ts:65] [E: packages/session/session-persistence/src/write-behind.ts:149] [E: packages/session/session-persistence/src/write-behind.ts:150] [E: packages/session/session-persistence/tests/write-behind.spec.ts:45]

6. **`session/flush` 是 parallel，不是 waterfall。** `SessionEventMap` 标 `@mode parallel`，签名只有 `(session)`，没有 `next`。`SessionStore.flush` 是正式入口：对全部 listener `Promise.allSettled`，再抛第一个 rejection；一个 listener 失败不阻止别人跑完。测试对 listener 完成顺序做 set 比较，而不是依赖先后。把它当成 waterfall、指望「不调用 next 就挡住别人」是错的。 [E: packages/core/session/src/index.ts:85] [E: packages/core/session/src/index.ts:1026] [E: packages/core/session/src/index.ts:1037] [E: packages/core/session/tests/scoped.spec.ts:118]

7. **耐久否决发生在别的 waterfall 里，那些 listener 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数 `args.pop()` 当 innermost `next`；不调用传入的 `next()` 就不会 `cbs.shift()` 到下一层。`dsh-session-checkpoint-policy` `inject = ['llm', 'sessionPersistence', 'sessions', 'tools']`：`llm/stream` 先 `await ctx.sessions.flush(session)` 再 `yield* next()`（无 `sessionId` / 已脱离 store 则直接 `next()`）；`tools/execute` 仅 `exec.agent` 存在且 `exec.parent === undefined` 才 flush，否则直接 `next()`；`agent/pre-step` flush 后再 `return next()`。省略 `next()` = adapter / tool body / 下一步决策都不跑。细节在 [subsys.persistence.checkpoint](checkpoint.md)。 [E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:238] [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81]

8. **`create` 纯懒：第一笔 `appendBatch` 才物化。** `createCore` 只在内存记 `{ cursor: 0, materialized: false }`。`appendCore` 校验连续 seq 后 `backend.appendBatch(meta, events, isMaterialized)`。JSONL 在 `!isMaterialized` 时走 `materialize(meta, events)`（header 与第一批事件同一次交给介质），已物化则 `appendLines`。成功后 coordinator `materialized = true` 并推进 cursor，再 `preparations.invalidate(id)`。 [E: packages/session/session-persistence/src/coordinator.ts:657] [E: packages/session/session-persistence/src/coordinator.ts:704] [E: packages/session/session-persistence/src/coordinator.ts:707] [E: packages/session/session-persistence-jsonl/src/index.ts:424] [E: packages/session/session-persistence-jsonl/src/index.ts:427]

9. **`session/created`（emit）把 live Session 绑到 state。** `onCreated` 四条：已跟踪且 seed/cwd 匹配 → 认领 ownerless 状态，只 persist seed 后缀（构造期 seed **不**发 `session/event`）；已跟踪且是别人的 live owner → 未物化且无缓冲则回收 id，否则 id collision；未跟踪但盘上有同 id 前缀 → `adoptLivePrefix`（只 truncate torn tail，**不**对开 turn 写 closer，live Session 仍是权威）；全新 → `createCore` + 一次 seed `appendCore`。 [E: packages/session/session-persistence/src/coordinator.ts:1236] [E: packages/session/session-persistence/src/coordinator.ts:1261] [E: packages/session/session-persistence/src/coordinator.ts:1314]

10. **`inspect` 不 commit recovery；`load` / `prepare` 才 `commitRepair`。** `prepareCore` 读 `loadStored`，`assertVersion`，在内存里跑 `interruptedTurnClosers`，用合成后的 seed `sessions.prepare(..., seedSource: 'persistence')`。`SessionPreparations.inspect` 用 `entryFor` 共享这条冷源（同 id in-flight 共用一次 `load`）。`reserve` 把 `entry.phase` 设成 `committing`，调用 `commitPrepared`：revision 仍当前且存在 `tornMarker` 或非空 `closers` 时才 `backend.commitRepair`；修完 revision 变了，返回 `undefined` 让外层重读已提交图。测试：`inspect` 的**内存** events 是 `['turn/start','turn/end']`；**盘上**仍只有 `['turn/start']`、`repairAttempts === 0`；第一次 `prepare` 才把盘写成 `['turn/start','turn/end']`；第二次 `prepare` 复用同一 `Session`，不再修。 [E: packages/session/session-persistence/src/coordinator.ts:903] [E: packages/session/session-persistence/src/preparations.ts:58] [E: packages/session/session-persistence/src/preparations.ts:93] [E: packages/session/session-persistence/src/coordinator.ts:945] [E: packages/session/session-persistence/tests/persistence.spec.ts:985] [E: packages/session/session-persistence/tests/persistence.spec.ts:986] [E: packages/session/session-persistence/tests/persistence.spec.ts:987] [E: packages/session/session-persistence/tests/persistence.spec.ts:991] [E: packages/session/session-persistence/tests/persistence.spec.ts:995]

11. **live 开 turn：`inspect` 借快照，`load` 拒绝。** `inspectLive` 直接 `Object.freeze({ meta: session.header, events: session.events })`，不 flush、不补 closer。`loadLiveSnapshot` 先 `flush`，若 `interruptedTurnClosers(events).length > 0` 抛 `cannot load … while its live turn is open`。冷盘 `load` 才会把合成 closer 提交下去。 [E: packages/session/session-persistence/src/coordinator.ts:989] [E: packages/session/session-persistence/src/coordinator.ts:982] [E: packages/session/session-persistence/tests/persistence.spec.ts:954] [E: packages/session/session-persistence/tests/persistence.spec.ts:955] [E: packages/core/session/src/repair.ts:27]

12. **读时拒 version / 未知 type；append 不拒未知 type。** `assertVersion` 要求 `meta.version === SESSION_FORMAT_VERSION`，否则 `SessionFormatUnsupportedError` + `sessionFormatVersionRefusal`。`assertEventsSupported` 在 **NORMALIZED** 事件上跑：`type` 不在 `KNOWN_SESSION_EVENT_TYPES` 且没有 `ignorable: true` → 拒读。`appendCore` 只跑 `assertSupportedEvents`（拦 v0 内部已退役的 `request/header-delta` / `mode/set` / `request/header reason:'fallback'`），**故意**不跑未知 type 门——避免 live 会话写路径中途卡死。契约测试：新 version 的 `load` 抛 `SessionFormatUnsupportedError`；无 `ignorable` 的 `future/event` 在 `load` 同样抛该错；带 `ignorable: true` 的同 type `load` 成功。v0 **内部**仍有同版本形状迁移（`steering/message` → `user/message`、旧 turn envelope、缺 message id），那不是跨 version 兼容承诺。 [E: packages/session/session-persistence/src/coordinator.ts:1047] [E: packages/session/session-persistence/src/coordinator.ts:1063] [E: packages/session/session-persistence/src/coordinator.ts:691] [E: packages/session/session-persistence/tests/coordinator-contract.ts:1336] [E: packages/session/session-persistence/tests/coordinator-contract.ts:1371] [E: packages/session/session-persistence/tests/coordinator-contract.ts:1381]

13. **同一 id 的读写串在一条 chain 上。** `serialize` 把同 id 操作接到 `this.chains` 上的前一个 Promise；本 op 的 rejection 不毒化下一 waiter。公开方法禁止互相调用（会死锁），只调 `*Core`。`readFrom` 走同一条链，但 **非突变**：不 truncate、不写 closer；有 `loadStoredFrom` 的 backend（SQLite）只读后缀，否则 `loadStored` 整本再 `slice`。 [E: packages/session/session-persistence/src/coordinator.ts:1015] [E: packages/session/session-persistence/src/coordinator.ts:838] [E: packages/session/session-persistence/src/coordinator.ts:847] [E: packages/session/session-persistence/src/coordinator.ts:869]

14. **dispose / retire 是最后一次屏障。** `session/disposed`（emit）触发 `retire`：`flush` 再在 chain 上拆掉该 Session 的 live/state。进程卸插件时 effect 对所有 live `flush`；drain 失败收成 `AggregateError`，`close` 失败不能盖住它。 [E: packages/session/session-persistence/src/coordinator.ts:1155] [E: packages/session/session-persistence/src/coordinator.ts:1095]

## 设计动机

DSH 是组合运行时，不是「先改内存 messages、回头再 serialize」的 agent。把 log 当唯一真相，才能让换 loop、换 persistence、换 compaction 都无法偷偷改模型下一轮看见的历史。本缝把那份 log **异步**送到介质：热路径保持 `append` 的同步合同，checkpoint 在 adapter 花 token、顶层 tool 产生副作用之前把屏障拉起来。

Definition 与 Provider 拆开，是为了同一套 coordinator 可以挂 JSONL（shipped 默认）或 SQLite（仓库有、bundle 没有），也可以让第三方完全绕过 coordinator。web-app 与 headless 继承 base 的 jsonl 行，而不是各自再声明一份 store——persistence 是进程级 host 能力。

`inspect` 与 `load`/`prepare` 分开，是为了 sidebar / query / feedback 能看开 turn 或未提交的合成 closer，而不把 crash-repair 写进别人还在跑的盘。`commitRepair` 允许「先 truncate 再 append closer」两步 fsync：文件 backend 做不到单事务，coordinator 用 revision 重读收口。

未知 type 读时才拒：漏标 `ignorable` 的新事件如果在 live `append` 上 fail-closed，会让正在跑的 turn 无法耐久，比「下次打开时大声拒绝」更糟。跨 version 则相反——错 version 一律拒，避免旧 runtime 静默读错新 log。

## Gotcha

- **不是 shipped 行。** 在 `cordis.patch.yml` 里搜 `session-persistence` 只能搜到 `session-persistence-jsonl`。卸掉 jsonl 行，`ctx.sessionPersistence` 就不存在；checkpoint 的 `inject` 会挂起整条胶水。
- **`session/flush` 没有 `next()`。** 耐久否决靠 checkpoint 在 `llm/stream` / `tools/execute` 上先 `flush` 再决定要不要 `next()`。 [E: packages/core/session/src/index.ts:85]
- **不要把每个 `append` 当成刷盘。** 默认最多等 200 ms；硬崩溃窗口里，没过 checkpoint 的尾巴可以还在内存。 [E: packages/session/session-persistence/src/coordinator.ts:30]
- **`inspect` 看见的 closer 可能还没上盘。** 冷盘 `inspect` 的内存 events 已是 `['turn/start','turn/end']`；盘上仍只有 `['turn/start']`。只读 UI 用 `inspect`；resume / 对外承诺平衡 log 用 `load` 或 `prepare`。 [E: packages/session/session-persistence/tests/persistence.spec.ts:985] [E: packages/session/session-persistence/tests/persistence.spec.ts:986]
- **version 钉在 `0`，没有跨 version migration。** 更新的盘叫人 upgrade the harness；更旧的盘「this build ships no upgrade path」。v0 内部的 legacy 形状迁移不是兼容承诺。 [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80]
- **append 不拒未知 `type`。** 下一次 `load`/`inspect`/`readFrom` 才 `SessionFormatUnsupportedError`。给插件事件写 `ignorable: true`，否则别人的 harness 打不开。 [E: packages/session/session-persistence/tests/coordinator-contract.ts:1371]
- **live 开 turn 不能 `load`。** 用 live `Session`，或等 `turn/end`。`inspect` 可以看开着的尾巴。 [E: packages/session/session-persistence/tests/persistence.spec.ts:954] [E: packages/session/session-persistence/tests/persistence.spec.ts:955]
- **HMR / 热重载 adopt 不关开 turn。** `adoptLivePrefix` 只 truncate torn 物理尾，`closers = []`。冷 `load` 才会补 `TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED` + `turn/end { kind: 'interrupted' }`。 [E: packages/session/session-persistence/src/coordinator.ts:1314]
- **SQLite `SCHEMA_VERSION = 15` 不是这条缝的 version。** `user_version` 非 0 且不等于 15 → 拒开，原地不迁。session header 仍走 `SESSION_FORMAT_VERSION === 0`。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108]
- **compaction 不删 log。** persistence 会原样 append 那条 `surfaceOp: { op: 'replace', start, end }`；`Session.append` 只做 `this.log.push`，log 只增。 [E: packages/core/session/src/types.ts:374] [E: packages/core/session/src/index.ts:643]
- **prepared cache 默认 5，且只驱逐 ready。** `reserve` 出去的源不会被 LRU 挤掉；`capacity = 1` 时两个 reserved 仍都在。 [E: packages/session/session-persistence/tests/preparations.spec.ts:120]
- **settings / credentials 不是本缝。** 组合里的 `CredentialRef` 与 `.credentials.yaml` 里的 secret 值，以及 settings 的 schema defaults → composition `base` → 用户文档，分别在对应 persistence 页。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/settings/settings/src/index.ts:705]
- **shipped session-query 默认 `openAt: never`。** base 挂 `session-query-sqlite`；不是本缝开了 FTS。 [E: packages/bundle/base/cordis.patch.yml:121]
- **storage / workspace / projection-cache 只 web-app。** headless 继承 jsonl + checkpoint，不挂这三组行。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-persistence`（`SessionPersistence`） | `ctx.sessionPersistence`：`create` / `append` / `load` / `inspect` / `prepare` / `readFrom` / `list` | **无** `id: session-persistence` 行 | 不声明 Definition | 不声明 Definition |
| Provider | shipped：`@deepseek-ai/dsh-session-persistence-jsonl`；仓库另有未 shipped 的 `session-persistence-sqlite` | `JsonlSessionPersistence` `provide` 同一键；内部 `PersistenceCoordinator` 订 `session/*` | `id: session-persistence-jsonl`，`root: dshHomePath('sessions')` [E: packages/bundle/base/cordis.patch.yml:98] | 继承 base，**不**重挂 | 继承 base，**不**重挂 |
| Consumer | `dsh-session-checkpoint-policy`；`SessionStore.flush` 的调用方（loop / resume / workspace `list` / query / projection-cache） | checkpoint `inject` 含 `sessionPersistence`；在 waterfall 里 `flush` 后必须 `next()` | `id: session-checkpoint-policy` 是 host 行；`session-query-sqlite` `openAt: never` [E: packages/bundle/base/cordis.patch.yml:121] | projection-cache / workspace / storage **只** web-app，读本缝；checkpoint 仍继承 base [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] | 无 cache / workspace / storage；jsonl + checkpoint + `openAt: never` 仍在 |

换 JSONL 为 SQLite（或第三方 backend）只换 Provider：`session/event` + `session/flush` 的落盘实现变了，`Session.append` / `deriveMessages()` / checkpoint 的 `next()` 合同不变。Preset **不得**再 publish `sessionPersistence`；它是 host 面进程级服务。

## Sources

- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence/src/coordinator.ts
- packages/session/session-persistence/src/revision.ts
- packages/session/session-persistence/src/preparations.ts
- packages/session/session-persistence/src/write-behind.ts
- packages/session/session-persistence/tests/persistence.spec.ts
- packages/session/session-persistence/tests/write-behind.spec.ts
- packages/session/session-persistence/tests/preparations.spec.ts
- packages/session/session-persistence/tests/coordinator-contract.ts
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/repair.ts
- packages/core/session/tests/scoped.spec.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-persistence-jsonl/src/index.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/settings/settings/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：turn / step 往 log 写哪些 event、`deriveMessages`、checkpoint 两个副作用落点。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer 通例。
- [spine.context-and-compaction](../../spine/context-and-compaction.md)：compaction 只追加 `surfaceOp: replace`，不删 log。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend、盘布局、zstd、POSIX `link()+unlink()`。
- [subsys.persistence.sqlite](sqlite.md)：未 shipped 的 SQLite backend、`SCHEMA_VERSION = 15` 拒盘。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / 顶层 `tools/execute` 上 flush 后再 `next()`。
- [subsys.persistence.projection](projection.md)：`session/event` emit 驱动的 host registry；cache 只 web-app。
- [subsys.persistence.session-query](session-query.md)：shipped `openAt: never`；不是本缝的 FTS。
- [subsys.persistence.workspace](workspace.md)：只 web-app 的 workspace 实体。
- [subsys.persistence.storage](storage.md)：只 web-app 的非会话 `ctx.storage`。
