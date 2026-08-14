---
id: subsys.persistence.projection
title: session projection
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-projection/src/index.ts
  - packages/session/session-projection/src/types.ts
  - packages/session/session-projection/tests/registry.spec.ts
  - packages/session/session-projection-cache/src/index.ts
  - packages/session/session-projection-cache/src/spec.ts
  - packages/session/session-projection-cache/tests/cache.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-persistence/src/coordinator.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-title/src/index.ts
  - packages/session/session-stats/src/index.ts
  - packages/session/session-stats/src/projection.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/settings/settings/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
symbols:
  - SessionProjectionRegistry
  - ProjectionDefinition
  - SessionProjectionMap
  - SessionProjectionCache
related:
  - spine.session-log
  - spine.capability-seams
  - subsys.core.session
  - subsys.persistence.session-persistence
  - subsys.persistence.jsonl
  - subsys.persistence.checkpoint
  - subsys.persistence.title
  - subsys.persistence.telemetry
  - subsys.persistence.storage
  - subsys.persistence.session-query
  - subsys.persistence.workspace
  - subsys.host.apiproxy
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.sessionProjections` 是 **host 面** registry：每个 `ProjectionDefinition` unit 用同步的 `init` / `apply` / `view` 把已提交的 `SessionEvent` 折成 `SessionProjectionMap` 整值；`session/event` 是 emit（签名没有 `next`），registry 自己 `drive`，调用方不必 `next()`。`SessionProjectionCache`（`ctx.sessionProjectionCache`）只挂在 `dsh-web-app`，是 domain `session_projcache` version 3 上的 fold shortcut，**不是**权威。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的 capability seam（Definition / Provider / Consumer），不是又一份可就地改写的 chat 数组。

## 能回答的问题

- `ctx.sessionProjections` 和 `ctx.sessionProjectionCache` 各拥有什么？谁是权威，谁只是 shortcut？
- `ProjectionDefinition` 的 unit 合同是什么？为什么必须全同步、为什么 log 事件必须带完整后状态而不是 bare delta？
- `session/event` 是 emit、parallel 还是 waterfall？谁必须 `next()`？cache 的 `write()` 为什么先 `sessions.flush` 再 `put`？
- base / web-app / headless 各挂哪一行？`writeEveryEvents: 200` / `writeIntervalMs: 5000` 出现在哪一层？
- `title` / `sessionStats` 怎样以消费者 unit 挂上？cold listing 为什么走 `cachedSnapshot` 而不是 `load` 整本 log？

## 职责边界

本包拥有：host 面 `SessionProjectionRegistry`（`ctx.sessionProjections`）对已提交事件的 eager drive、unit 注册（含同 key 的 `refs` 计数）、watermark cell、`snapshot` / `checkpoint` / `restore` / `viewCheckpoint` / `restoreFloor`、change feed；以及 **只 web-app** 的 `SessionProjectionCache`（`ctx.sessionProjectionCache`）write-behind、cold-read ladder、identity 校验。

本包**不**拥有：append-only log 与 `deriveMessages()` 合同（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；JSONL / SQLite 写窗与 `session/flush` 入队（[subsys.persistence.session-persistence](session-persistence.md)）；shipped 默认盘布局（[subsys.persistence.jsonl](jsonl.md)）；adapter / top-level tool 之前的 fail-closed `flush`（[subsys.persistence.checkpoint](checkpoint.md)）；`session/title` 如何写出、LLM title provider（[subsys.persistence.title](title.md)）；`sessionStats` 计 `step/end` 的字段语义（[subsys.persistence.telemetry](telemetry.md)）；`ctx.storage` / domain 介质（[subsys.persistence.storage](storage.md)）；FTS / `openAt`（[subsys.persistence.session-query](session-query.md)）；workspace 实体（[subsys.persistence.workspace](workspace.md)）；listing / mux 的 wire 帧（[subsys.host.apiproxy](../host/apiproxy.md)）。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。跨 version **没有**自动 migration：更新的盘叫人升级 harness，更旧的盘「本 build 无升级路径」。cache 的 `coldSnapshot` 走 `sessionPersistence.readFrom`，会撞上这条门。 [E: packages/core/session/src/types.ts:56] [E: packages/session/session-persistence/src/coordinator.ts:1047] [E: packages/session/session-persistence/src/coordinator.ts:1048]
- SQLite **session 盘** `SCHEMA_VERSION = 15`：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。这跟 session event `version`、跟 `session_projcache` domain version 3、跟 session-query schema 8 都正交。该 backend **不**在任何 shipped bundle。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] [E: packages/session/session-persistence-sqlite/src/schema.ts:109]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。cache 的 `write()` 也会 `flush`，但那是「cache 行不得领先 log」的屏障，不是那两道副作用门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete。projection unit 折的是整本 `SessionEvent` log（含 replace 那条新事件），不是 `deriveMessages()` 的 surface 节点表。 [E: packages/core/session/src/types.ts:372] [E: packages/core/session/src/types.ts:374]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`SettingsScope.get` 读的是 `resolve` 的结果。 [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/src/index.ts:458] [E: packages/settings/settings/src/index.ts:705]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`CREDENTIALS_FILENAME` 只是 basename `.credentials.yaml`；默认路径是 `join(resolveDshHome(config.dshHome), CREDENTIALS_FILENAME)`。`parseCredentialsDocument` 写入 map 的是非空 secret 字符串，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:81] [E: packages/credentials/credentials-local/src/index.ts:183]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web 继承这一行，自己不重挂。cache 的 `readFrom` / `sessions.flush` 默认落这条盘。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101]
- shipped `session-query-sqlite` 写出 `openAt: never`（base 挂载；web-app 用同一键重述）。search 默认关，不 import/open sqlite。 [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]
- `workspace` **只 web-app**（insert `id: workspace`），与 `storage*` / `session-projection-cache` / `session-stats` 同层。headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

registry 与 cache 都是 **host 面**进程级服务。agent-preset 面可以 `inject(['sessionProjections'])` 再 `register`（同一 tool 包按会话挂多次），但不得另造一份 store。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-projection/src/types.ts` | `SessionProjectionMap`：整条链共用的 merge 表（host / wire / client） |
| `packages/session/session-projection/src/index.ts` | `ProjectionDefinition`、`SessionProjectionRegistry`、`drive` / `snapshot` / `restore` |
| `packages/session/session-projection/tests/registry.spec.ts` | eager drive、`Object.is` 门、`refs`、`restoreFloor` / 缩 log |
| `packages/session/session-projection-cache/src/index.ts` | `SessionProjectionCache`：write-behind + cold ladder |
| `packages/session/session-projection-cache/src/spec.ts` | domain `session_projcache` version 3 与 record schema |
| `packages/session/session-projection-cache/tests/cache.spec.ts` | `turn/end` / detach / 阈值 / fail-soft / identity |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: session-projection`；同层 `session-persistence-jsonl` `root: dshHomePath('sessions')`；`session-query-sqlite` `openAt: never` |
| `packages/bundle/web-app/cordis.patch.yml` | 只 web：`storage*` + `workspace` + `session-projection-cache` + `session-stats` |
| `packages/bundle/headless/cordis.patch.yml` | 继承 base 的 registry；**不**重挂 cache / workspace / session-stats |
| `packages/core/session/src/index.ts` | `session/event` emit、`session/flush` parallel、`Session.seq` |
| `packages/session/session-title/src/index.ts` | 可选 unit `key: 'title'` |
| `packages/session/session-stats/src/index.ts` | web-app 消费者 unit `sessionStats` |
| `packages/host/apiproxy/src/api-proxy.ts` | live `snapshot` vs 冷 `cachedSnapshot`；`onChanged` → mux |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionProjectionMap` | 空 interface，域包 declaration merge 各自的 key。值是 wire-JSON 整值。 [E: packages/session/session-projection/src/types.ts:17] |
| `ProjectionDefinition<K, S>` | `{ key, schema, init, apply, view, stateVersion }`。三函数必须同步；`state` 必须是 plain JSON（cache 前置条件）。不感兴趣的事件必须 `return` 同一份 state 引用。 [E: packages/session/session-projection/src/index.ts:42] [E: packages/session/session-projection/src/index.ts:51] [E: packages/session/session-projection/src/index.ts:60] |
| `ProjectionSnapshot` | `{ asOfSeq, values }`。`asOfSeq = session.seq - 1`（空 log 为 `-1`）。每个 value 离 registry 前过 `schema.parse`。 [E: packages/session/session-projection/src/index.ts:254] |
| `ProjectionCheckpointRow` | `{ ver, seq, val }`。`ver` 是 unit 的 `stateVersion`；`seq` 是最后折进 `val` 的事件；行不是权威。 [E: packages/session/session-projection/src/index.ts:108] |
| `CheckpointIdentity` / `CheckpointRecord` | identity = `{ createdAt, cwd? }`；record = `{ identity, rows }`。session id 只命名槽位，不命名生命周期。 [E: packages/session/session-projection-cache/src/spec.ts:39] [E: packages/session/session-projection-cache/src/spec.ts:53] |
| `projectionCacheDomainSpec` | `name: 'session_projcache'`，`version: 3`，单表 `sessions`。 [E: packages/session/session-projection-cache/src/spec.ts:67] [E: packages/session/session-projection-cache/src/spec.ts:68] |
| `SessionProjectionCache.Config` | `writeEveryEvents` / `writeIntervalMs` 是组合显式写出的节流；`turn/end` 与 dispose 是强制写点，不是可关开关。 [E: packages/session/session-projection-cache/src/index.ts:44] [E: packages/session/session-projection-cache/src/index.ts:46] |

整值事件规则：带状态的 log 事件必须携带**完整后状态**，unit 的 `apply` 用整份 data 替换（或保持原引用），不要做 bare delta patch。registry 测试里 `test/mark` 的 `data` 就是完整 `marks` 数组。 [E: packages/session/session-projection/tests/registry.spec.ts:37]

## 控制流

1. **host 面挂 registry。** `dsh-base` 插入 `id: session-projection` / `name: '@deepseek-ai/dsh-session-projection'`。`SessionProjectionRegistry` 构造时 `super(ctx, 'sessionProjections')`，再 `ctx.on('session/event', …)` 把每条已提交事件交给 `drive`。这是进程级服务，不是 preset isolate 里的私有实例。headless 继承这一行，自己的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/base/cordis.patch.yml:126] [E: packages/bundle/base/cordis.patch.yml:127] [E: packages/session/session-projection/src/index.ts:180] [E: packages/session/session-projection/src/index.ts:181] [E: packages/session/session-projection/src/index.ts:182] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **域包注册 unit，注册是 fiber effect。** `register(definition)` 要求 `stateVersion` 为非负安全整数。同 key 第一次写入 `Map` 并 `refs = 1`；再注册只 `refs += 1`，但 `stateVersion` 不同则抛、拒绝共享 cell。最后一个 disposer 把 key 整行删掉（含 WeakMap cells）。preset 按会话挂同一 tool 包时，N 次 `register` 共用一个 unit——第一个会话结束不得拆掉别人的 key。 [E: packages/session/session-projection/src/index.ts:195] [E: packages/session/session-projection/src/index.ts:208] [E: packages/session/session-projection/src/index.ts:211] [E: packages/session/session-projection/tests/registry.spec.ts:137] [E: packages/session/session-projection/tests/registry.spec.ts:155]

3. **消费者 unit 点名（细节留给对应页）。** `dsh-session-title` 用 `ctx.inject(['sessionProjections'], …)` 可选挂 `key: 'title'`（`string | null`，last-wins `session/title`）；没有 registry 的组合（刻意不挂这行）不受影响。`dsh-session-stats` 硬 `inject = ['sessionProjections']`，`apply` 里 `register(sessionStatsProjectionDefinition)`；该行只出现在 web-app。`dsh-host-apiproxy` 另外注册 `sessionListMetadata` / `imageLimits`。`todo_write` / plan / goal / subagent / token-meter 同样是 unit 消费者，本页不展开字段。 [E: packages/session/session-title/src/index.ts:308] [E: packages/session/session-title/src/index.ts:310] [E: packages/session/session-stats/src/index.ts:20] [E: packages/session/session-stats/src/index.ts:28] [E: packages/session/session-stats/src/projection.ts:90] [E: packages/bundle/web-app/cordis.patch.yml:84]

4. **`Session.append` 先提交再 emit。** 构造 event 时 `seq: this.log.length`，`validateNext` 通过后 `log.push`，然后 `invokeContainedSessionObservers(…, 'session/event', …)`。`session/event` 声明为 `(session, event) => void`，**没有** `next` 参数，模式是 emit。observer 抛错 / reject 只打 log，不能回滚已提交事件，也不能挡住后续 listener。热路径不碰盘。 [E: packages/core/session/src/index.ts:76] [E: packages/core/session/src/index.ts:629] [E: packages/core/session/src/index.ts:643] [E: packages/core/session/src/index.ts:646] [E: packages/core/session/src/index.ts:396]

5. **`drive` 同步折每一个 unit。** 没有 cell 则先用 `session.events.slice(0, event.seq)` 从 `init` 补历史，再 `apply`。`changed = !Object.is(next, cell.state)`——这里的局部变量 `next` 是下一份 state，**不是** waterfall 的 `next()`。引用没变则零 change-feed 工作；变了才 `schema.parse(view(…))` 并同步调用每个 `onChanged` listener。测试：`turn/start` 对 marks unit 静默，对 count unit 通知。 [E: packages/session/session-projection/src/index.ts:414] [E: packages/session/session-projection/src/index.ts:415] [E: packages/session/session-projection/src/index.ts:418] [E: packages/session/session-projection/tests/registry.spec.ts:100] [E: packages/session/session-projection/tests/registry.spec.ts:124]

6. **同步读切。** `snapshot(session)` 对每个已注册 key 走 watermark cache（缺 cell 则折整本 in-memory log），`asOfSeq` 用 `session.seq - 1`（`get seq()` 的函数体是 `return this.log.length`）。`checkpoint(session)` 交出 `{ ver, seq, val }`，`val` 是 `structuredClone`，调用方改 clone 不能污染 cell。 [E: packages/core/session/src/index.ts:566] [E: packages/session/session-projection/src/index.ts:254] [E: packages/session/session-projection/src/index.ts:278] [E: packages/session/session-projection/tests/registry.spec.ts:222]

7. **cache 只 web-app。** `dsh-web-app` 先挂 `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`（`backend: json`），再挂 `id: workspace` 与 `id: session-projection-cache`，`writeEveryEvents: 200`，`writeIntervalMs: 5000`。`SessionProjectionCache.inject = ['storageDomain', 'sessionProjections', 'sessionPersistence', 'sessions']`。headless **没有** cache / workspace / `session-stats`。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/web-app/cordis.patch.yml:79] [E: packages/bundle/web-app/cordis.patch.yml:80] [E: packages/session/session-projection-cache/src/index.ts:72]

8. **write-behind 也听 `session/event`（仍然是 emit，无 `next()`）。** `turn/end` 立刻 `flushSoft`（强制点）。其它事件累加 `pending`：到 `writeEveryEvents` 就写；否则第一次变脏时 `setTimeout(writeIntervalMs)`。`session/disposed` 是第二强制点（live→cold），写完 `markClean` 并丢掉 dirty 行。插件 unload 清掉所有 timer。 [E: packages/session/session-projection-cache/src/index.ts:205] [E: packages/session/session-projection-cache/src/index.ts:206] [E: packages/session/session-projection-cache/src/index.ts:226] [E: packages/session/session-projection-cache/tests/cache.spec.ts:129] [E: packages/session/session-projection-cache/tests/cache.spec.ts:155]

9. **`write()`：先 snapshot，若仍 live 则 `sessions.flush`，再 `put`。** `checkpoint(session)` 先冻结当前 cell 切。`SessionStore.flush` 是 **parallel**（签名没有 `next`，`Promise.allSettled` 等全部 listener），把这条切里的事件耐久到 JSONL。然后整 record 替换进 `session_projcache`。crash 可以让 cache 落后 log（下次 cold 多折一段），不能让 cache 领先 log（折出盘上不存在的事件）。detach 时 store 里已经没有该 session，这步跳过 flush，交给 persistence 自己的 retirement drain。 [E: packages/session/session-projection-cache/src/index.ts:141] [E: packages/session/session-projection-cache/src/index.ts:150] [E: packages/session/session-projection-cache/src/index.ts:151] [E: packages/core/session/src/index.ts:85] [E: packages/core/session/src/index.ts:1026]

10. **写失败 fail-soft。** `flushSoft` / `putSoft` catch 之后 `logger.warn`，不把异常送回 `session/event` 路径。下一次强制点或 cold write-back 自愈。测试：介质拒写一次后 listing 仍空，下一次 `turn/end` 写出当前切。非 JSON 的 unit state 在 **直接** `write()` 上会 loud 抛（`snapshotJsonValue` 失败），但 event 路径包在 `flushSoft` 里。 [E: packages/session/session-projection-cache/src/index.ts:248] [E: packages/session/session-projection-cache/src/index.ts:250] [E: packages/session/session-projection-cache/tests/cache.spec.ts:212]

11. **cold-read ladder。** `coldSnapshot(id)`：读 table → `restoreFloor(cached)` → `persistence.readFrom(id, floor)` → 用 stored header 做 identity 证人 → `restore`。`restoreFloor` 对可用行（`ver` 匹配）算 `need = max(row.seq + 1, 0)`，缺行或 `ver` 不匹配把 need 拉到 `0`，再 `return max(min(need) - 1, 0)`。这个 `-1` 作用在 need 上，返回值是最低可用 watermark **本身**，不是 watermark-1。registry 测：count 行 `seq: 5` → `restoreFloor === 5`；缩 log 测：行 `seq: 9` → `floor === 9`（锚在 watermark 上，好让 tail 证明这条事件还在盘上）。空 tail 交给 `restore(rows, [], floor)` 才因行声称超出 supplied end 而抛 re-read；那条 expect 不证明 floor 公式。行不可用且 `baseSeq > 0` 时 `restore` 抛，cache 再 `readFrom(id, 0)` 从 `init` 重折。写回走 `putSoft`。无 unit 时 `restoreFloor` 为 `undefined`，仍 probe `readFrom(id, 0)` 以保持 not-found 合同。 [E: packages/session/session-projection/src/index.ts:305] [E: packages/session/session-projection/src/index.ts:309] [E: packages/session/session-projection/src/index.ts:367] [E: packages/session/session-projection-cache/src/index.ts:169] [E: packages/session/session-projection-cache/src/index.ts:179] [E: packages/session/session-projection-cache/src/index.ts:186] [E: packages/session/session-projection-cache/src/index.ts:193] [E: packages/session/session-persistence/src/coordinator.ts:832] [E: packages/session/session-projection/tests/registry.spec.ts:240] [E: packages/session/session-projection/tests/registry.spec.ts:334] [E: packages/session/session-projection/tests/registry.spec.ts:340] [E: packages/session/session-projection-cache/tests/cache.spec.ts:285]

12. **listing 零 log 读。** `listProjectionsFor`：attached → `sessionProjections.snapshot(session)`；detached → `sessionProjectionCache.cachedSnapshot(meta)`。`cachedSnapshot` 先 `identityMatches(createdAt, cwd)`，再 `viewCheckpoint`（只交出 `ver` 匹配的 key），`asOfSeq` 取已服务行的最低 watermark。cwd 对上则交 cached 值；cwd 换成别的路径 → `undefined`；header 不带 cwd → `undefined`；全部 `ver` 不匹配同样 `undefined`。listing 降级为无 projection 列，不炸整表。 [E: packages/host/apiproxy/src/api-proxy.ts:860] [E: packages/host/apiproxy/src/api-proxy.ts:861] [E: packages/session/session-projection-cache/src/index.ts:121] [E: packages/session/session-projection-cache/src/index.ts:122] [E: packages/session/session-projection-cache/src/index.ts:297] [E: packages/session/session-projection-cache/tests/cache.spec.ts:322] [E: packages/session/session-projection-cache/tests/cache.spec.ts:330] [E: packages/session/session-projection-cache/tests/cache.spec.ts:331] [E: packages/session/session-projection-cache/tests/cache.spec.ts:332]

13. **change feed 到 mux。** apiproxy 在 `inject(['sessionProjections'])` 里 `onChanged`，把 `(session, key, value, seq)` 打成 `type: 'session/projection'` 的 mux 帧。registry 不持有 wire 词表。 [E: packages/host/apiproxy/src/api-proxy.ts:1284] [E: packages/host/apiproxy/src/api-proxy.ts:1285]

14. **邻接 waterfall 必须 `next()`。** `llm/stream` / `tools/execute` / `agent/pre-step` 是 waterfall：checkpoint policy 先 `flush` 再 `yield* next()` / `return next()`；省略 `next()` = adapter / tool body / 下一步决策都不跑。`session/event` 与 `session/flush` **不是** waterfall，registry 与 cache 的 listener 没有、也不该调用 `next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/session/session-checkpoint-policy/src/index.ts:74] [E: packages/session/session-checkpoint-policy/src/index.ts:81]

## 设计动机

DSH 把「模型下一轮看见的 messages」钉在 `deriveMessages()` 上（**model-visible ⟺ logged**），把「UI / listing / 统计要的派生整值」钉在另一条同步 fold 上。两条都只读同一条 append-only log。peer harness 常见的「内存里改 title/stats，事后再写盘」在这里是 seam 违规：派生状态必须能从已提交事件重放，cache 最多是 watermark shortcut。

capability 三角刻意切开：域包只交纯函数 unit，不知道 mux 或 json 文件；registry 不知道 `title` 字符串怎么渲染；cache 不知道 unit 语义，只认 `{ver, seq, val}`。换 loop 不必改 projection；换 persistence backend 只换 `readFrom` 的介质；卸掉一个域插件，key 从 snapshot 消失，client 读成 capability absence。

全同步是一致性切：一次 `snapshot` 里每个 key 与 `asOfSeq` 停在同一 log 位置。异步 unit 会撕开这刀，所以 `schema.parse` 会把 Promise 当非法 view 拒掉。 [E: packages/session/session-projection/tests/registry.spec.ts:363]

cache 永不权威、写路径 fail-soft：丢掉一次写只让下次 cold 多折一段 tail。`sessions.flush` 插在 snapshot 与 `put` 之间，是为了让「cache 行声称折到 seq N」蕴含「log 已经耐久到 N」。这跟 checkpoint 卡副作用是两件事。

## Gotcha

- **`session/event` 没有 `next()`。** 把它当 waterfall、指望「不调用 next 就挡住 persistence」是错的。append 已经提交。
- **`drive` 里的 `next` 是下一份 state。** 与 Cordis waterfall 传入的 `next()` 同名不同物。`Object.is` 相同引用 = 该 unit 本事件静默。 [E: packages/session/session-projection/src/index.ts:415]
- **同 key 跨 `stateVersion` 不能共享。** 运行时比得出来的不兼容只有这一条；函数体无法比较。 [E: packages/session/session-projection/src/index.ts:208]
- **cache 不是默认、不是 headless。** shipped 默认安装是 `dsh web`；headless 继承 registry，没有 `sessionProjectionCache`，也没有 `session-stats`。
- **cache 不是权威。** 丢行、`ver` 不匹配、identity 对不上、缩 log，一律当 stale shortcut，从 log 重折。域 version 3 与 SQLite session 盘 15、event `version` 0 不是同一个旋钮。
- **写失败不回压 append。** `flushSoft` 吞错。直接调用 `write()` 才可能因非 JSON state loud 失败。 [E: packages/session/session-projection-cache/tests/cache.spec.ts:185]
- **`restoreFloor` 返回最低可用 watermark 本身。** `-1` 作用在 `need = row.seq + 1` 上（`Math.max(min(need) - 1, 0)`），不是从 watermark 再减 1。count 行 `seq: 5` → floor=5；缩 log 测把 floor 钉在 watermark 9。空 tail 只证明 `restore(rows, [], 9)` 抛 re-read，不能单独推出 floor 公式。 [E: packages/session/session-projection/src/index.ts:305] [E: packages/session/session-projection/src/index.ts:309] [E: packages/session/session-projection/tests/registry.spec.ts:240] [E: packages/session/session-projection/tests/registry.spec.ts:334] [E: packages/session/session-projection/tests/registry.spec.ts:340]
- **session id 复用会换生命周期。** `createdAt` / `cwd` 对不上的 record 整份丢弃。测试：同 id、`createdAt: 999` 的 phantom marks 不会赢过真实 log。 [E: packages/session/session-projection-cache/tests/cache.spec.ts:310]
- **projection ≠ `deriveMessages()`。** compaction 的 `replace` 不删 log；unit 会看见 replace 事件本身。人读 transcript 继续走 `isAppendSurfaceEvent`。
- **waterfall 漏 `next()` 停整条链。** 那是 checkpoint / invariant 的合同，不是 registry 的。

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-projection`（`types.ts` + `ProjectionDefinition`） | `SessionProjectionMap`；unit = `{ key, schema, init, apply, view, stateVersion }` | 类型可进任何组合 | 同 | 同 |
| Provider（live fold） | `SessionProjectionRegistry` | `ctx.sessionProjections`；听 `session/event` emit，无 `next()` | 行 `id: session-projection` | 继承 | 继承 |
| Provider（durable shortcut） | `SessionProjectionCache` | `ctx.sessionProjectionCache`；`inject` `storageDomain` + registry + persistence + `sessions` | **无** | 行 `id: session-projection-cache`，`200` / `5000`；依赖同层 `storage` + `storage-json` + `storage-domain` | **无** |
| Consumer（unit） | `dsh-session-title`、`dsh-session-stats`、apiproxy、`tool-todo` / plan / goal / subagent / token-meter | `register(...)`；可选者用 `ctx.inject(['sessionProjections'], …)` | `title` 可选；token-meter / subagent 等随 base | 加上 `session-stats`、apiproxy 的 `sessionListMetadata` / `imageLimits` | `title` 仍可选；无 `sessionStats`、无 cache |
| Consumer（carrier） | `dsh-host-apiproxy` | live `snapshot`；冷 `cachedSnapshot` / `coldSnapshot`；`onChanged` → `session/projection` | 无 HTTP 宿主 | web 行 `id: api-gateway` | 无 |

换 persistence backend 只换 `readFrom` 与 `session/flush` 的落盘。换 loop 不能绕开 log 合同。preset 需要私有 Provider 时必须 `isolate`；`sessionProjections` 不是那种私有服务。shipped log 介质是 base 行 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）。同层 `session-query-sqlite` 写 `openAt: never`。`workspace` 只出现在 web-app insert。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:73]

## Sources

- packages/session/session-projection/src/index.ts
- packages/session/session-projection/src/types.ts
- packages/session/session-projection/tests/registry.spec.ts
- packages/session/session-projection-cache/src/index.ts
- packages/session/session-projection-cache/src/spec.ts
- packages/session/session-projection-cache/tests/cache.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-persistence/src/coordinator.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-title/src/index.ts
- packages/session/session-stats/src/index.ts
- packages/session/session-stats/src/projection.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/settings/settings/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/credentials/credentials-local/src/index.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages()`、`surfaceOp` replace、checkpoint 两个副作用落点。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；host 面 vs agent-preset 面。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel、`SESSION_FORMAT_VERSION`。
- [subsys.persistence.session-persistence](session-persistence.md)：`session/event` 入队、`session/flush` 耐久屏障、`readFrom`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend；base 行 `root: dshHomePath('sessions')`。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / top-level `tools/execute` 上先 `flush` 再 `next()`。
- [subsys.persistence.title](title.md)：log-only `session/title` 与可选 projection key `'title'`。
- [subsys.persistence.telemetry](telemetry.md)：`sessionStats` unit 计 `step/end`；otel backend 默认 DISABLED。
- [subsys.persistence.storage](storage.md)：只 web-app 的 `ctx.storage` + domain；`session_projcache` 落在 `$DSH_HOME/storages/`。
- [subsys.persistence.session-query](session-query.md)：shipped `openAt: never`；search 默认关。
- [subsys.persistence.workspace](workspace.md)：只 web-app 的 workspace 实体，与 cache 同层 insert。
- [subsys.host.apiproxy](../host/apiproxy.md)：listing 投影列与 `session/projection` mux 帧。
