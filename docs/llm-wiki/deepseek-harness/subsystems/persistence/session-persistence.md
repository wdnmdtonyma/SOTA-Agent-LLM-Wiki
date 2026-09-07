---
id: subsys.persistence.session-persistence
title: session persistence 缝
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence/src/handle.ts
  - packages/session/session-persistence/src/storage-contract.ts
  - packages/session/session-persistence/src/errors.ts
  - packages/session/session-persistence/src/revision.ts
  - packages/session/session-persistence/tests/storage-contract.spec.ts
  - packages/session/session-persistence/tests/live-write-contract.ts
  - packages/session/session-persistence/package.json
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/repair.ts
  - packages/core/agent-loop/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-jsonl/src/storage.ts
  - packages/session/session-format-catalog/src/generated.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - vendor/cordis/src/events.ts
symbols:
  - SessionPersistence
  - SessionHandle
  - SessionAccess
  - SessionFormatUnsupportedError
  - sessionFormatVersionRefusal
  - assertVersion
  - validateStoredEvents
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
updated: d347e70390
---

> `SessionPersistence`（`ctx.sessionPersistence`）是 **host 面** durable session-log 的 **Service Definition**，不是 shipped Cordis 行。调用方用 `create` / `open` 拿到 `SessionHandle`：`append` 尽力写入，`flush` 才是耐久屏障。`coordinator.ts` / `preparations.ts` / `write-behind.ts` 已删除。shipped 盘只有 JSONL。这是 Cordis 组合运行时把 **model-visible ⟺ logged** 落到磁盘的缝。

## 能回答的问题

- `ctx.sessionPersistence` 是 Definition 还是 shipped 行？物理介质谁提供？`dsh web` / `headless` / `sdk` / `sdk-minimal` / `acp` 各继承哪一层？
- `create` / `open('read'|'write')` 各拿到什么 handle？谁持有跨进程 write ownership？
- `session/event` 与 `session/flush` 分别是 emit 还是 parallel？谁必须 `next()`？热路径碰不碰盘？
- `SESSION_FORMAT_VERSION` 现在是多少？v0→v1→v2 在哪条缝上跑？比 2 新的盘呢？
- crash 尾的 `interruptedTurnClosers` 谁合成、谁 `append` 进盘？live 开 turn 上 `open('write')` 会怎样？

## 职责边界

本包拥有：`SessionPersistence` 抽象缝（`ctx.sessionPersistence`）、`SessionHandle` 合同、共享校验（`assertVersion` / `validateStoredEvents` / `assertContiguous` / materialize helpers）、以及稳定错误词表（`SessionFormatUnsupportedError`、`sessionFormatVersionRefusal` 已迁到 `errors.ts`）。

本包**不**拥有：JSONL 盘布局、generation 文件、zstd、kernel lease（[subsys.persistence.jsonl](jsonl.md)）；在 `llm/stream` / `tools/execute` 上先 `sessions.flush` 再 `next()` 的胶水（[subsys.persistence.checkpoint](checkpoint.md)）；内存 `Session.append` / `deriveMessages` / `SurfaceOp`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；format catalog 与 adjacent migrator 的规划器（包 `dsh-session-format` / `dsh-session-format-catalog`，JSONL load 时调用）；非会话 `ctx.storage`；workspace；session-query FTS。`session-persistence-sqlite` **已删除**（[subsys.persistence.sqlite](sqlite.md) 是退役页）。

`dsh-session-persistence` 坐在 **host 面**。agent-preset 面不 remount 这条缝；preset 只把 id 写进 header 或 `agent-preset/selected`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-persistence/src/index.ts` | `SessionPersistence`：`create` / `open` / `flush` / `stat` / `list` |
| `packages/session/session-persistence/src/handle.ts` | `SessionHandle` / `SessionAccess` |
| `packages/session/session-persistence/src/storage-contract.ts` | `assertVersion`、`validateStoredEvents`、`assertContiguous` |
| `packages/session/session-persistence/src/errors.ts` | `sessionFormatVersionRefusal`、`SessionFormatUnsupportedError`、ownership 错误 |
| `packages/session/session-persistence/src/revision.ts` | 不透明 `SessionPersistenceRevision` |
| `packages/session/session-persistence-jsonl/src/storage.ts` | JSONL 的 handle 实现 + `session/event\|flush\|disposed` 路由 |
| `packages/core/agent-loop/src/index.ts` | `create` 拿 write handle；`resume` `open('write')` 后合成 closer |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `id: session-persistence-jsonl` |

已删除、禁止再引用：`coordinator.ts`、`preparations.ts`、`write-behind.ts`。旧 API `load` / `inspect` / `prepare` / `append` / `readFrom` / `locate` 不在 Definition 上。

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionPersistence` | 抽象 `Service`，`super(ctx, 'sessionPersistence')`。不是 Cordis 插件行。 [E: packages/session/session-persistence/src/index.ts:135] |
| `create` | 新建并拿走 write ownership，返回 write handle。id 已存在抛 `SessionAlreadyExistsError`。 [E: packages/session/session-persistence/src/index.ts:146] |
| `open(id, access)` | `read` 不占 ownership，可与别的 write handle / 进程并存；`write` 原子宣称单写者，已有活 owner 抛 `SessionAlreadyOwnedError`。 [E: packages/session/session-persistence/src/index.ts:161] |
| `SessionHandle` | 单会话通道：`read` / `append` / `flush` / `close`。`write` 是读写；`read` 只观察。关闭后操作抛 `SessionHandleClosedError`。 [E: packages/session/session-persistence/src/handle.ts:48] [E: packages/session/session-persistence/src/handle.ts:86] [E: packages/session/session-persistence/src/handle.ts:98] |
| `inheritedEventCount` | handle 上与 header 成对的 fork 前缀长度；`header.isSeeded === false` 时为 `0`。不进可重放 event log。 [E: packages/session/session-persistence/src/handle.ts:58] |
| `SESSION_FORMAT_VERSION` | **2**。新 header 必须等于该值。 [E: packages/core/session/src/types.ts:86] |
| `assertVersion` | 已解码的 **当前** header `version !== 2` → `SessionFormatUnsupportedError`。 [E: packages/session/session-persistence/src/storage-contract.ts:50] |
| `sessionFormatVersionRefusal` | `version > 2` → 「newer harness — upgrade the harness」；否则更旧 → 「this build ships no upgrade path」。这是 **当前格式门** 的文案。JSONL 对磁盘上的 v0/v1 generation 先走 catalog 迁到 v2，不把历史 header 直接喂给这道门。 [E: packages/session/session-persistence/src/errors.ts:133] [E: packages/session/session-persistence/tests/storage-contract.spec.ts:94] [E: packages/session/session-persistence/tests/storage-contract.spec.ts:96] |
| `validateStoredEvents` | 未知 `type` 且无 `ignorable: true` → 拒读；`request/header` 的 legacy `reason: 'fallback'` 同样拒。 [E: packages/session/session-persistence/src/storage-contract.ts:75] [E: packages/session/session-persistence/src/storage-contract.ts:86] |
| `SessionFormatUnsupportedError` | 盘完好但本 build 不能忠实解释。可带 `SessionLocation`（JSONL 的 `{ kind:'jsonl', path }`）方便人找原文。 [E: packages/session/session-persistence/src/errors.ts:111] |
| `SessionOwnershipLostError` | 跨进程 lease 丢失。注释写明 shipped in-process 后端 **尚未** 抛它。 [E: packages/session/session-persistence/src/errors.ts:59] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。**没有 delete。** persistence 把 replace 当普通 batch 落盘。 [E: packages/core/session/src/types.ts:416] [E: packages/core/session/src/types.ts:418] |

`stat` / `list` 返回 `SessionPersistenceSnapshot`（header + 不透明 `revision`，JSONL 另带 `sizeBytes`）。revision 只给派生 cache 比「是否变了」；不参与 open / read / resume。 [E: packages/session/session-persistence/src/index.ts:190]

## 控制流

1. **组合真树：Definition 无行；叠 base 的 profile 继承 jsonl。** `PROFILE_TEMPLATES`：`web`（live）与 `headless` / `sdk` / `acp`（startup）叠 `dsh-base`；`sdk-minimal` **只** `@deepseek-ai/dsh-sdk-minimal`。 [E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:154] `dsh-base` 挂 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113] `sdk-minimal` 自己 insert `id: sessions` 的同一 jsonl 包，`compression: none`。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:164] [E: packages/bundle/sdk-minimal/cordis.patch.yml:168] web-app / headless / sdk / acp **不**重挂 jsonl。

2. **Provider 构造时安装 live 路由，键仍是 `ctx.sessionPersistence`。** JSONL `JsonlSessionPersistence` `super(ctx)` 走 Definition 的 service 键，再 `this.tracker.install(ctx)`。 [E: packages/session/session-persistence-jsonl/src/index.ts:170] [E: packages/session/session-persistence-jsonl/src/index.ts:196] Tracker 听三条 **没有 `next` 的** 事件：`session/event` → 当前 write handle `enqueueLive`；`session/flush` → `drainLive` + `handle.flush`；`session/disposed` → `handle.close`。 [E: packages/session/session-persistence-jsonl/src/storage.ts:500] [E: packages/session/session-persistence-jsonl/src/storage.ts:501] [E: packages/session/session-persistence-jsonl/src/storage.ts:506] [E: packages/session/session-persistence-jsonl/src/storage.ts:514]

3. **热路径：`Session.append` 只改内存，再 emit `session/event`。** `seq` 钉成 `this.log.length`，校验后 `log.push`，**之后**才 fire-and-forget 调 observer。声明 `@mode emit`。 [E: packages/core/session/src/index.ts:73] [E: packages/core/session/src/index.ts:737] JSONL write handle 把事件 `structuredClone` 进最多 200ms 的 routed buffer（`LIVE_WRITE_BATCH_MAX_DELAY_MS`），不是 Definition 包里的 write-behind 模块。 [E: packages/session/session-persistence-jsonl/src/storage.ts:35] [E: packages/session/session-persistence-jsonl/src/storage.ts:241]

4. **`session/flush` 是 parallel，不是 waterfall。** 签名只有 `(session)`，没有 `next`。`SessionStore.flush` 对全部 listener `Promise.allSettled`，再抛第一个 rejection。 [E: packages/core/session/src/index.ts:82] [E: packages/core/session/src/index.ts:1117] [E: packages/core/session/src/index.ts:1121] 把它当成 waterfall、指望「不调用 next 就挡住别人」是错的。

5. **耐久否决发生在别的 waterfall 里，那些 listener 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；不调用就不会 `cbs.shift()`。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] checkpoint `inject = ['llm', 'sessionPersistence', 'sessions', 'tools']`：`llm/stream` 先 `await ctx.sessions.flush(session)` 再 `yield* next()`；顶层 `tools/execute` 同样；`agent/pre-step` flush 后 `return next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] 细节在 [subsys.persistence.checkpoint](checkpoint.md)。

6. **三种 `flush` 不要混。** `SessionStore.flush(session)` 是 checkpoint 走的入口（派发 `session/flush`）。JSONL listener 先 `drainLive()`（把 routed buffer fsync 下去）再 `SessionHandle.flush()`。handle 的 `flush` 在 **已经物化** 时直接 return——单次 `append` / drain 的 `persistBatch` 已经 fsync；它真正做的是给「create 之后还没任何 event」的会话写出 header-only 文件。 [E: packages/session/session-persistence-jsonl/src/storage.ts:169] [E: packages/session/session-persistence-jsonl/src/storage.ts:173] 服务级 `SessionPersistence.flush()` 对每个活 write handle 做同样的 drain+flush。 [E: packages/session/session-persistence/src/index.ts:174] [E: packages/session/session-persistence-jsonl/src/storage.ts:474]

7. **`create` 对本进程立刻可见；跨进程要等物化。** `create` resolve 后，本进程 `stat` / `list` / `open` 看得到，即使 backend 推迟物理文件；别的进程要等第一次 `append` 或显式 `SessionHandle.flush`。从未物化就 crash 的会话等于从不存在。JSONL：`create` 不建文件，但 `list()` 含该 id。 [E: packages/session/session-persistence-jsonl/src/index.ts:219] [E: packages/session/session-persistence-jsonl/tests/jsonl.spec.ts:946]

8. **Agent 创建 / resume 显式拿 handle，不再走 persistence `load`/`prepare`。** `createStoredSession` 调 `persistence.create(session.header, { inheritedEventCount })`。 [E: packages/core/agent-loop/src/index.ts:723] 构造期 seed **不**经 `session/event` 重放，所以 publication 前 `appendUnstoredSuffix` 用 handle 把后缀写进盘。 [E: packages/core/agent-loop/src/index.ts:739] [E: packages/core/agent-loop/src/index.ts:742] `resume`：先 `open(id, 'write')` 占 ownership，再 `handle.read()`，跑 `interruptedTurnClosers`，非空则 `handle.append(closers)`，然后 `sessions.prepare(..., seedSource: 'persistence')`。 [E: packages/core/agent-loop/src/index.ts:867] [E: packages/core/agent-loop/src/index.ts:876] [E: packages/core/agent-loop/src/index.ts:878] 语义 crash-repair 是 **agent 层** 的活；persistence 只交物理上合法的 contiguous 前缀（torn 尾不会返回给 reader）。 [E: packages/session/session-persistence/src/handle.ts:72]

9. **`publish` 顺序仍是 session enter → agent enter → session announce → agent announce。** 宣布之后，JSONL tracker 才按 session id 把 live `session/event` 路由进那把 write handle。 [E: packages/core/agent-loop/src/index.ts:654] [E: packages/core/agent-loop/src/index.ts:658]

10. **format：当前逻辑版本 2；历史盘由 JSONL + catalog 迁。** catalog `currentVersion: 2`，migrations `[sessionFormatV0ToV1, sessionFormatV1ToV2]`。 [E: packages/session/session-format-catalog/src/generated.ts:14] [E: packages/session/session-format-catalog/src/generated.ts:17] JSONL 构造时要求 catalog 与 `SESSION_FORMAT_VERSION` 一致。 [E: packages/session/session-persistence-jsonl/src/index.ts:172] 比 2 新的 generation 在 open 上变成 `SessionFormatUnsupportedError`（upgrade-harness 文案 + raw log 路径）。 [E: packages/session/session-persistence-jsonl/src/index.ts:437] `assertVersion` 对已经是「当前逻辑 header」的记录仍只认 2；测试钉死 `version - 1` 文案是 no upgrade path——那是跳过 catalog 的合同门，不是「JSONL 不迁 v0」。 [E: packages/session/session-persistence/tests/storage-contract.spec.ts:85]

## 设计动机

DSH 把 append-only `SessionEvent` 当唯一真相。把落盘从「coordinator 订阅整店」改成「每会话一把 handle」，是为了单写者 ownership、跨进程 lease、以及 create/resume 的所有权可以跟 agent lifecycle 绑在同一条可逆 effect 上：setup 失败就 `handle.close()`，未物化的 id 可以再 create。

Definition 与 JSONL Provider 拆开，是为了同一套 `SessionHandle` 合同可以换介质。当前 shipped 只有 JSONL；sqlite persistence 包已删除。

未知 type 读时才拒：漏标 `ignorable` 的新事件如果在 live `append` 上 fail-closed，会让正在跑的 turn 无法耐久。跨 version 则相反——当前逻辑 version 错了一律拒；历史 generation 由 catalog 的 adjacent 链升级，缺环或缺 codec 才 `SessionFormatUnsupportedMigrationError`。

## Gotcha

- **不是 shipped 行。** 在 `cordis.patch.yml` 里搜只能搜到 `session-persistence-jsonl`（`sdk-minimal` 行 id 是 `sessions`）。卸掉 jsonl 行，`ctx.sessionPersistence` 就不存在；checkpoint 的 `inject` 会挂起整条胶水。
- **没有 persistence `load` / `inspect`。** 冷读走 `open('read').read()`；resume 走 `open('write')` + closer。sidebar / query 不再靠 persistence 在内存里拼 `interrupted` 尾巴。
- **`session/flush` 没有 `next()`。** 耐久否决靠 checkpoint 在 `llm/stream` / `tools/execute` 上先 flush 再决定要不要 `next()`。 [E: packages/core/session/src/index.ts:82]
- **不要把每个 `append` 当成刷盘。** live 事件最多在 handle 里等 200ms；没过 checkpoint 的尾巴可以还在内存。显式 `handle.append`（resume closer、unstored seed）走另一条链，resolve 时 JSONL 已经 fsync。
- **三种 flush。** `sessions.flush` ≠ `sessionPersistence.flush()` ≠ `handle.flush()`。checkpoint 只调第一种。
- **version 钉在 2，不是 0。** 新 header 必须是 2。JSONL 会把 v0/v1 文件迁成 `session.v2.jsonl[.zstd]` 并留下历史 generation。比 2 新的盘叫人 upgrade the harness。
- **compaction 不删 log。** persistence 原样 append 那条 `surfaceOp: { op: 'replace', start, end }`。 [E: packages/core/session/src/types.ts:418]
- **preset 不得再 publish `sessionPersistence`。** 它是 host 面进程级服务。

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app / headless / sdk / acp | sdk-minimal |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-persistence`（`SessionPersistence` / `SessionHandle`） | `ctx.sessionPersistence`：`create` / `open` / `flush` / `stat` / `list` | **无** `id: session-persistence` 行 | 不声明 Definition | 不声明 Definition |
| Provider | shipped：`@deepseek-ai/dsh-session-persistence-jsonl`。`session-persistence-sqlite` **已删除** | `JsonlSessionPersistence` `provide` 同一键；内部 `JsonlSessionHandle` + kernel lease | `id: session-persistence-jsonl`，`root: dshHomePath('sessions')` [E: packages/bundle/base/cordis.patch.yml:110] | 继承 base，**不**重挂 | `id: sessions` 自挂同一包 [E: packages/bundle/sdk-minimal/cordis.patch.yml:164] |
| Consumer | `dsh-session-checkpoint-policy`；`AgentLoop` create/resume；query / projection-cache / workspace list | checkpoint `inject` 含 `sessionPersistence`；在 waterfall 里 `sessions.flush` 后必须 `next()` | `id: session-checkpoint-policy` | workspace **只** web-app；checkpoint 仍继承 base | 完整 insert 含 jsonl；**无** checkpoint 行 |

换 JSONL 为第三方 backend 只换 Provider：`SessionHandle` 合同与 checkpoint 的 `next()` 不变。Preset **不得**再 publish `sessionPersistence`。

## Sources

- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence/src/handle.ts
- packages/session/session-persistence/src/storage-contract.ts
- packages/session/session-persistence/src/errors.ts
- packages/session/session-persistence/src/revision.ts
- packages/session/session-persistence/tests/storage-contract.spec.ts
- packages/session/session-persistence/tests/live-write-contract.ts
- packages/session/session-persistence/package.json
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/repair.ts
- packages/core/agent-loop/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-persistence-jsonl/src/index.ts
- packages/session/session-persistence-jsonl/src/storage.ts
- packages/session/session-format-catalog/src/generated.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：turn / step 往 log 写哪些 event、`deriveMessages`、checkpoint 两个副作用落点。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer 通例。
- [spine.context-and-compaction](../../spine/context-and-compaction.md)：compaction 只追加 `surfaceOp: replace`，不删 log。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend、generation 文件、lease、catalog load。
- [subsys.persistence.sqlite](sqlite.md)：session-persistence-sqlite 已删除；query / storage sqlite 仍在。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / 顶层 `tools/execute` 上 flush 后再 `next()`。
- [subsys.persistence.projection](projection.md)：`session/event` emit 驱动的 host registry；cache 在 base。
- [subsys.persistence.session-query](session-query.md)：shipped `openAt: never`；不是本缝的 FTS。
- [subsys.persistence.workspace](workspace.md)：只 web-app 的 workspace 实体。
- [subsys.persistence.storage](storage.md)：base 上的非会话 `ctx.storage`。
