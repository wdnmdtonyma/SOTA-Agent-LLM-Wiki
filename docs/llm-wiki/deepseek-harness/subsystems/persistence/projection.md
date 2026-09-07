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
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-persistence/src/handle.ts
  - packages/session/session-persistence/src/storage-contract.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-title/src/index.ts
  - packages/session/session-stats/src/index.ts
  - packages/session/session-stats/src/projection.ts
  - packages/session/session-turn-outline/src/index.ts
  - packages/session/session-turn-outline/src/projection.ts
  - packages/api/session-controller/src/index.ts
  - packages/api/session-controller/src/list.ts
  - packages/api/session-controller/src/control.ts
  - packages/api/session-controller/src/model-selection-projection.ts
  - packages/experimental/agent-team/src/projection.ts
symbols:
  - SessionProjectionRegistry
  - ProjectionDefinition
  - SessionProjectionMap
  - SessionProjectionStateMap
  - SessionProjectionCache
  - turnOutlineProjectionDefinition
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
updated: d347e70390
---

> `ctx.sessionProjections` 是 **host 面** registry：每个 `ProjectionDefinition` unit 用同步的 `init` / `apply` 以及可选 `wire.view` 把已提交的 `SessionEvent` 折成 `SessionProjectionMap` 整值；`session/event` 是 emit（签名没有 `next`），registry 自己推进 cell，调用方不必 `next()`。`SessionProjectionCache`（`ctx.sessionProjectionCache`）挂在 **`dsh-base`** 上，是 domain `session_projcache` version **7** 的 fold shortcut，**不是**权威。web-app 另挂 `session-turn-outline`（`key: 'turnOutline'`），不要另建 wiki 节点。这是 Cordis 组合运行时的 capability seam（Definition / Provider / Consumer），不是又一份可就地改写的 chat 数组。

## 能回答的问题

- `ctx.sessionProjections` 和 `ctx.sessionProjectionCache` 各拥有什么？谁是权威，谁只是 shortcut？
- `ProjectionDefinition` 的 unit 合同是什么？为什么必须全同步、为什么 log 事件必须带完整后状态而不是 bare delta？host-only unit 与 wire unit 怎么分？
- `session/event` 是 emit、parallel 还是 waterfall？谁必须 `next()`？cache 的 `write()` 为什么先 `sessions.flush` 再 `put`？
- `dsh-base` / web-app / headless / `sdk-minimal` 各挂哪一行？`writeEveryEvents: 200` / `writeIntervalMs: 5000` 出现在哪一层？`session-turn-outline` 在哪一层？
- listing 为什么走 `cachedSnapshot` 而不是 `open`/`read` 整本 log？session-controller 的 live 切与 cold 切有何不同？

## 职责边界

本包拥有：host 面 `SessionProjectionRegistry`（`ctx.sessionProjections`）对已提交事件的 eager drive、unit 注册（含同 key 的 `refs` 计数）、watermark cell、`snapshot` / `cachedSnapshot` / `checkpoint` / `restore` / `hydrate` / `viewCheckpoint` / `restoreFloor` / `stateOf`、change feed；以及 **`dsh-base` 挂载**的 `SessionProjectionCache`（`ctx.sessionProjectionCache`）write-behind、identity 校验、listing `cachedSnapshot`、`coldSnapshot`（调用方自己交完整 log）、`hydratePrepared`。

本包**不**拥有：append-only log 与 `deriveMessages()` 合同（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；JSONL `SessionHandle` 写窗与 `session/flush` 入队（[subsys.persistence.session-persistence](session-persistence.md)）；shipped 默认盘布局（[subsys.persistence.jsonl](jsonl.md)）；adapter / top-level tool 之前的 fail-closed `flush`（[subsys.persistence.checkpoint](checkpoint.md)）；`session/title` 如何写出、LLM title provider（[subsys.persistence.title](title.md)）；`sessionStats` 计 `step/end` 的字段语义（[subsys.persistence.telemetry](telemetry.md)）；`ctx.storage` / domain 介质（[subsys.persistence.storage](storage.md)）；FTS / `openAt`（[subsys.persistence.session-query](session-query.md)）；workspace 实体（[subsys.persistence.workspace](workspace.md)）；listing / control stream 的 wire 帧（[subsys.host.apiproxy](../host/apiproxy.md)，现为三个 `packages/api/*-controller`）。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `2`）。JSONL catalog 有 adjacent v0→v1→v2；比 2 新仍拒。 [E: packages/core/session/src/types.ts:86] [E: packages/session/session-persistence/src/storage-contract.ts:50]
- session persistence SQLite 包已删除。这跟 session event `version`、跟 `session_projcache` domain version 7 都正交。
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。cache 的 `write()` 也会 `flush`，但那是「cache 行不得领先 log」的屏障。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete。projection unit 折的是整本 `SessionEvent` log（含 replace 那条新事件），不是 `deriveMessages()` 的 surface 节点表。 [E: packages/core/session/src/types.ts:416] [E: packages/core/session/src/types.ts:418]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web 继承这一行。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113]
- shipped `session-query-sqlite` 写出 `openAt: never`（base 挂载；web-app 用同一键重述）。 [E: packages/bundle/base/cordis.patch.yml:129] [E: packages/bundle/base/cordis.patch.yml:133] [E: packages/bundle/web-app/cordis.patch.yml:26] [E: packages/bundle/web-app/cordis.patch.yml:29]
- `workspace` **只 web-app**（insert `id: workspace`）。headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/web-app/cordis.patch.yml:61] [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26]
- `session-stats` **只 web-app**。 [E: packages/bundle/web-app/cordis.patch.yml:72]
- `session-turn-outline` **只 web-app**（`key: 'turnOutline'`，`stateVersion: 2`）。 [E: packages/bundle/web-app/cordis.patch.yml:77] [E: packages/session/session-turn-outline/src/projection.ts:86] [E: packages/session/session-turn-outline/src/projection.ts:87]
- experimental Agent Teams 的 host-only unit 是 `key: 'agentTeam'`，`stateVersion: 3`。 [E: packages/experimental/agent-team/src/projection.ts:308] [E: packages/experimental/agent-team/src/projection.ts:309]

registry 与 cache 都是 **host 面**进程级服务。agent-preset 面可以 `inject(['sessionProjections'])` 再 `register`（同一 tool 包按会话挂多次），但不得另造一份 store。shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；`dsh web` 不是唯一宿主入口，也可用 `dsh --profile sdk|sdk-minimal|acp|headless`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-projection/src/types.ts` | `SessionProjectionMap`（wire）与 `SessionProjectionStateMap`（host 折状态）declaration merge |
| `packages/session/session-projection/src/index.ts` | `ProjectionDefinition`、`SessionProjectionRegistry`、`drive` / `snapshot` / `restore` / `hydrate` |
| `packages/session/session-projection/tests/registry.spec.ts` | eager drive、`Object.is` 门、`refs`、`restoreFloor` / 缩 log、host-only 不进 wire |
| `packages/session/session-projection-cache/src/index.ts` | `SessionProjectionCache`：write-behind + listing / cold / hydrate |
| `packages/session/session-projection-cache/src/spec.ts` | domain `session_projcache` version 4、`per-record` layout |
| `packages/session/session-projection-cache/tests/cache.spec.ts` | `turn/end` / create / detach / 阈值 / fail-soft / identity |
| `packages/bundle/base/cordis.patch.yml` | `session-projection` + `storage*` + `session-projection-cache`（`200` / `5000`）+ JSONL |
| `packages/bundle/web-app/cordis.patch.yml` | `workspace` + `session-stats` + `session-turn-outline` + `session-controller`；**不**重挂 cache |
| `packages/session/session-turn-outline/src/projection.ts` | web-app unit `key: 'turnOutline'` |
| `packages/bundle/headless/cordis.patch.yml` | 继承 base 的 registry **与 cache**；不挂 `session-stats` / workspace |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 完整 insert 含 `session-projection`；**没有** cache / storage 行 |
| `packages/core/session/src/index.ts` | `session/event` emit、`session/flush` parallel、`Session.seq` |
| `packages/session/session-title/src/index.ts` | unit `key: 'title'`（hard inject registry） |
| `packages/session/session-stats/src/index.ts` | web-app 消费者 unit `sessionStats` |
| `packages/api/session-controller/src/list.ts` | live `sessionProjections.cachedSnapshot` vs 冷 `sessionProjectionCache.cachedSnapshot` |
| `packages/api/session-controller/src/control.ts` | `onChanged` → control frame `type: 'projection'` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionProjectionMap` | 空 interface，域包 declaration merge 各自的 **client / wire** key。值是 wire-JSON 整值。 [E: packages/session/session-projection/src/types.ts:17] |
| `SessionProjectionStateMap` | host 折状态表；client-visible key 同时出现在两张表，host-only 只出现在这里。 [E: packages/session/session-projection/src/types.ts:24] |
| `ProjectionDefinition<K, S>` | `{ key, stateSchema, init, apply, wire?, stateVersion }`。三函数必须同步；`state` 必须是 plain JSON（cache 前置条件）。不感兴趣的事件必须 `return` 同一份 state 引用。有 `wire` 才进 snapshot / change feed。 [E: packages/session/session-projection/src/index.ts:38] [E: packages/session/session-projection/src/index.ts:49] [E: packages/session/session-projection/src/index.ts:62] |
| `ProjectionSnapshot` | `{ asOfSeq, values }`。`asOfSeq = session.seq - 1`（空 log 为 `-1`）。每个 wire value 离 registry 前过 `viewSchema.parse`。 [E: packages/session/session-projection/src/index.ts:102] [E: packages/session/session-projection/src/index.ts:338] |
| `ProjectionCheckpointRow` | `{ ver, seq, val }`。`ver` 是 unit 的 `stateVersion`；`seq` 是最后折进 `val` 的事件；行不是权威。 [E: packages/session/session-projection/src/index.ts:116] |
| `CheckpointIdentity` / `CheckpointRecord` | identity = `{ createdAt, cwd? }`；record = `{ identity, rows }`。session id 只命名槽位，不命名生命周期。 [E: packages/session/session-projection-cache/src/spec.ts:49] [E: packages/session/session-projection-cache/src/spec.ts:54] |
| `projectionCacheDomainSpec` | `name: 'session_projcache'`，`version: 7`，`layout: 'per-record'`，单表 `sessions`。 [E: packages/session/session-projection-cache/src/spec.ts:98] [E: packages/session/session-projection-cache/src/spec.ts:99] [E: packages/session/session-projection-cache/src/spec.ts:100] [E: packages/session/session-projection-cache/src/spec.ts:103] |
| `SessionProjectionCache.Config` | `writeEveryEvents` / `writeIntervalMs` 是组合显式写出的节流；**create** / `turn/end` / dispose 是强制写点。 [E: packages/session/session-projection-cache/src/index.ts:70] [E: packages/session/session-projection-cache/src/index.ts:72] [E: packages/session/session-projection-cache/src/index.ts:93] |
| `turnOutline` | web-app unit：`turn/start` 开条目，人类 prompt / assistant draft / `turn/end` 提交 response。 [E: packages/session/session-turn-outline/src/projection.ts:85] [E: packages/session/session-turn-outline/src/index.ts:27] |

整值事件规则：带状态的 log 事件必须携带**完整后状态**，unit 的 `apply` 用整份 data 替换（或保持原引用），不要做 bare delta patch。registry 测试里 `test/mark` 的 `data` 就是完整 `marks` 数组。 [E: packages/session/session-projection/src/index.ts:20] [E: packages/session/session-projection/tests/registry.spec.ts:47]

## 控制流

1. **host 面挂 registry。** `dsh-base` 插入 `id: session-projection` / `name: '@deepseek-ai/dsh-session-projection'`。`SessionProjectionRegistry` 构造时 `super(ctx, 'sessionProjections')`，空 log 的 `session/created` 会预填 `init` cell。这是进程级服务。headless 继承这一行。`sdk-minimal` 自己 insert 同一 registry 行，但不叠 `dsh-base`。 [E: packages/bundle/base/cordis.patch.yml:138] [E: packages/bundle/base/cordis.patch.yml:139] [E: packages/session/session-projection/src/index.ts:208] [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/sdk-minimal/cordis.patch.yml:38]

2. **域包注册 unit，注册是 fiber effect。** `register(definition)` 要求 `stateVersion` 为非负安全整数。同 key 第一次写入 `Map` 并 `refs = 1`；再注册只 `refs += 1`，但 `stateVersion` 不同则抛、拒绝共享 cell。最后一个 disposer 把 key 整行删掉。preset 按会话挂同一 tool 包时，N 次 `register` 共用一个 unit。 [E: packages/session/session-projection/src/index.ts:270] [E: packages/session/session-projection/src/index.ts:277] [E: packages/session/session-projection/src/index.ts:279] [E: packages/session/session-projection/tests/registry.spec.ts:140] [E: packages/session/session-projection/tests/registry.spec.ts:152]

3. **消费者 unit 点名（细节留给对应页）。** `dsh-session-title` 硬 `inject = ['sessions', 'sessionProjections']`，`register(titleProjectionDefinition)`，`key: 'title'`。`dsh-session-stats` 硬 `inject = ['sessionProjections']`，只出现在 web-app。`dsh-session-turn-outline` 同样硬 inject registry，只 web-app，`key: 'turnOutline'`。`SessionController` 硬 inject `sessionProjections`，构造时 `installModelSelectionProjection`（`key: 'modelSelection'`），`ApiSessionList` 注册 `sessionListMetadata` 与可选 `imageLimits`。`todo_write` / plan / goal / subagent / token-meter 同样是 unit 消费者，本页不展开字段。 [E: packages/session/session-title/src/index.ts:296] [E: packages/session/session-title/src/index.ts:263] [E: packages/session/session-stats/src/index.ts:20] [E: packages/session/session-stats/src/index.ts:28] [E: packages/session/session-turn-outline/src/index.ts:20] [E: packages/session/session-turn-outline/src/index.ts:28] [E: packages/bundle/web-app/cordis.patch.yml:77] [E: packages/api/session-controller/src/index.ts:90] [E: packages/api/session-controller/src/list.ts:90] [E: packages/bundle/web-app/cordis.patch.yml:91]

4. **`Session.append` 先提交再 emit。** `session/event` 声明为 `(session, event) => void`，**没有** `next` 参数，模式是 emit。observer 抛错 / reject 只打 log，不能回滚已提交事件。热路径不碰盘。 [E: packages/core/session/src/index.ts:73]

5. **cell 同步折每一个 unit。** 没有 cell 则从 `init` 补历史，再 `apply`。`!Object.is(next, cell.state)`——这里的局部变量 `next` 是下一份 state，**不是** waterfall 的 `next()`。引用没变则零 change-feed 工作；变了且该 unit 有 `wire` 才 `viewSchema.parse(view(…))` 并同步调用每个 `onChanged` listener。host-only unit 更新 `stateOf`，不通知 listener。 [E: packages/session/session-projection/src/index.ts:645] [E: packages/session/session-projection/tests/registry.spec.ts:112] [E: packages/session/session-projection/tests/registry.spec.ts:126]

6. **同步读切。** `snapshot(session)` 对每个有 `wire` 的 key 走 watermark cache（缺 cell 则折整本 in-memory log）。registry 另有 `cachedSnapshot(session)`：只读已 materialize 的 cell，可能落后 live Session，是 hint。`checkpoint(session)` 交出 `{ ver, seq, val }`，`val` 是 `structuredClone`。 [E: packages/session/session-projection/src/index.ts:338] [E: packages/session/session-projection/src/index.ts:344] [E: packages/session/session-projection/tests/registry.spec.ts:238]

7. **cache 在 `dsh-base`。** base 先挂 `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`（`backend: json`），再挂 `id: session-projection-cache`，`writeEveryEvents: 200`，`writeIntervalMs: 5000`。`SessionProjectionCache.inject = ['storageDomain', 'sessionProjections', 'sessions']`（**不再** inject `sessionPersistence`）。web-app / headless 继承这一行。`sdk-minimal` **没有** cache。 [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:151] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/base/cordis.patch.yml:165] [E: packages/bundle/base/cordis.patch.yml:166] [E: packages/session/session-projection-cache/src/index.ts:93]

8. **write-behind 也听 `session/event`（仍然是 emit，无 `next()`）。** `turn/end` 立刻 `flushSoft`（强制点）。其它事件累加 `pending`：到 `writeEveryEvents` 就写；否则第一次变脏时 `setTimeout(writeIntervalMs)`。`session/created` 是第一强制点（fork seed 必须能冷列出）。`session/disposed` 是 live→cold 强制点。插件 unload 清掉所有 timer。 [E: packages/session/session-projection-cache/src/index.ts:305] [E: packages/session/session-projection-cache/src/index.ts:307] [E: packages/session/session-projection-cache/src/index.ts:313] [E: packages/session/session-projection-cache/tests/cache.spec.ts:154]

9. **`write()`：先 checkpoint，若仍 live 则 `sessions.flush`，再 `put`。** `checkpoint(session)` 先冻结当前 cell 切。`SessionStore.flush` 是 **parallel**（签名没有 `next`，`Promise.allSettled` 等全部 listener）。然后整 record 替换进 `session_projcache`。crash 可以让 cache 落后 log，不能让 cache 领先 log。detach 时 store 里已经没有该 session，这步跳过 flush。 [E: packages/session/session-projection-cache/src/index.ts:247] [E: packages/session/session-projection-cache/src/index.ts:256] [E: packages/core/session/src/index.ts:82] [E: packages/core/session/src/index.ts:1121]

10. **写失败 fail-soft。** `flushSoft` catch 之后 `logger.warn`，不把异常送回 `session/event` 路径。下一次强制点自愈。非 JSON 的 unit state 在 **直接** `write()` 上会 loud 抛，但 event 路径包在 `flushSoft` 里。 [E: packages/session/session-projection-cache/src/index.ts:359] [E: packages/session/session-projection-cache/tests/cache.spec.ts:220]

11. **cold / restore ladder。** cache 的 `coldSnapshot` **不再**调用 persistence `read`：调用方交完整 log。`restoreFloor` 对可用行（`ver` 匹配）算 `need = max(row.seq + 1, 0)`，缺行或 `ver` 不匹配把 need 拉到 `0`，再 `return max(min(need) - 1, 0)`。这个 `-1` 作用在 need 上。无 unit 时 `restoreFloor` 为 `undefined`。`hydrate` / `hydratePrepared` 把折好的 cell 装回 prepared Session。 [E: packages/session/session-projection/src/index.ts:425] [E: packages/session/session-projection/src/index.ts:434] [E: packages/session/session-projection-cache/src/index.ts:277] [E: packages/session/session-projection/tests/registry.spec.ts:252]

12. **listing 零 log 读。** `ApiSessionList.projectionsFor`：attached → `sessionProjections.cachedSnapshot(session)`（不 fold 历史）；detached 非 seeded → `sessionProjectionCache.cachedSnapshot(header, SessionLogOffset(0))`，否则可退 `cachedPredecessorTitle`。cache 先 identity 对账，再 `viewCheckpoint`。listing 降级为无 projection 列，不炸整表。 [E: packages/api/session-controller/src/list.ts:268] [E: packages/api/session-controller/src/list.ts:274] [E: packages/api/session-controller/src/list.ts:279] [E: packages/session/session-projection-cache/src/index.ts:127]

13. **change feed 到 control stream。** `SessionControlController` 在构造里 `sessionProjections.onChanged`，把 `(session, key, value, seq)` 打成 `type: 'projection'` 的 Host-wide control frame。registry 不持有 wire 词表。 [E: packages/api/session-controller/src/control.ts:27] [E: packages/api/session-controller/src/control.ts:29]

14. **邻接 waterfall 必须 `next()`。** `llm/stream` / `tools/execute` / `agent/pre-step` 是 waterfall：checkpoint policy 先 `flush` 再 `yield* next()` / `return next()`；省略 `next()` = adapter / tool body / 下一步决策都不跑。`session/event` 与 `session/flush` **不是** waterfall，registry 与 cache 的 listener 没有、也不该调用 `next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/session/session-checkpoint-policy/src/index.ts:74] [E: packages/session/session-checkpoint-policy/src/index.ts:81]

## 设计动机

DSH 把「模型下一轮看见的 messages」钉在 `deriveMessages()` 上（**model-visible ⟺ logged**），把「UI / listing / 统计要的派生整值」钉在另一条同步 fold 上。两条都只读同一条 append-only log。peer harness 常见的「内存里改 title/stats，事后再写盘」在这里是 seam 违规：派生状态必须能从已提交事件重放，cache 最多是 watermark shortcut。

capability 三角刻意切开：域包只交纯函数 unit，不知道 mux 或 json 文件；registry 不知道 `title` 字符串怎么渲染；cache 不知道 unit 语义，只认 `{ver, seq, val}`。换 loop 不必改 projection；换 persistence backend 只换调用方交给 `coldSnapshot` / `restore` 的 events；卸掉一个域插件，key 从 snapshot 消失，client 读成 capability absence。

全同步是一致性切：一次 `snapshot` 里每个 key 与 `asOfSeq` 停在同一 log 位置。异步 unit 会撕开这刀，所以 `viewSchema.parse` 会把 Promise 当非法 view 拒掉。 [E: packages/session/session-projection/tests/registry.spec.ts:408]

cache 永不权威、写路径 fail-soft：丢掉一次写只让下次 cold 多折一段 tail。`sessions.flush` 插在 checkpoint 与 `put` 之间，是为了让「cache 行声称折到 seq N」蕴含「log 已经耐久到 N」。这跟 checkpoint 卡副作用是两件事。cache 不再 inject persistence：冷读的 log 由 carrier 提供，避免 shortcut 层再绕进另一条盘合同。

## Gotcha

- **`session/event` 没有 `next()`。** 把它当 waterfall、指望「不调用 next 就挡住 persistence」是错的。append 已经提交。
- **cell `apply` 里的 `next` 是下一份 state。** 与 Cordis waterfall 传入的 `next()` 同名不同物。`Object.is` 相同引用 = 该 unit 本事件静默。 [E: packages/session/session-projection/src/index.ts:645]
- **同 key 跨 `stateVersion` 不能共享。** 运行时比得出来的不兼容只有这一条；函数体无法比较。 [E: packages/session/session-projection/src/index.ts:279]
- **cache 现在是 base 默认，不是「只 web」。** `dsh-base` 挂 `session-projection-cache`；headless / sdk / acp（叠 base）都有。`sdk-minimal` 只有 registry，没有 cache。`session-stats` 与 `session-turn-outline` 仍只 web-app。
- **registry `cachedSnapshot(session)` ≠ cache `cachedSnapshot(header)`。** 前者读 live cell hint；后者读 durable domain 行。session-controller listing 对 attached 走前者。
- **`coldSnapshot` 不再 `readFrom`。** 调用方必须自己提供完整 log。
- **cache 不是权威。** 丢行、`ver` 不匹配、identity 对不上、缩 log，一律当 stale shortcut。域 version **7** 与 event `version` 2 不是同一个旋钮。
- **写失败不回压 append。** `flushSoft` 吞错。直接调用 `write()` 才可能因非 JSON state loud 失败。 [E: packages/session/session-projection-cache/tests/cache.spec.ts:233]
- **`restoreFloor` 返回最低可用 watermark 本身。** `-1` 作用在 `need = row.seq + 1` 上（`Math.max(min(need) - 1, 0)`），不是从 watermark 再减 1。 [E: packages/session/session-projection/src/index.ts:434]
- **session id 复用会换生命周期。** `createdAt` / `cwd` 对不上的 record 整份丢弃。 [E: packages/session/session-projection-cache/tests/cache.spec.ts:313]
- **projection ≠ `deriveMessages()`。** compaction 的 `replace` 不删 log；unit 会看见 replace 事件本身。
- **host-only unit 不进 snapshot / onChanged。** `stateOf` 与 checkpoint 仍包含它们。 [E: packages/session/session-projection/tests/registry.spec.ts:126]
- **waterfall 漏 `next()` 停整条链。** 那是 checkpoint / invariant 的合同，不是 registry 的。

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app | headless | sdk-minimal |
|---|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-projection`（`types.ts` + `ProjectionDefinition`） | `SessionProjectionMap` / `SessionProjectionStateMap`；unit = `{ key, stateSchema, init, apply, wire?, stateVersion }` | 类型可进任何组合 | 同 | 同 | 同 |
| Provider（live fold） | `SessionProjectionRegistry` | `ctx.sessionProjections`；听 `session/event` emit，无 `next()` | 行 `id: session-projection` | 继承 | 继承 | 自己 insert 该行 |
| Provider（durable shortcut） | `SessionProjectionCache` | `ctx.sessionProjectionCache`；`inject` `storageDomain` + registry + `sessions` | 行 `id: session-projection-cache`，`200` / `5000`；同层 `storage*` | 继承 | 继承 | **无** |
| Consumer（unit） | `dsh-session-title`、`dsh-session-stats`、`dsh-session-turn-outline`、session-controller、`tool-todo` / plan / goal / subagent / token-meter / opt-in `agentTeam` | `register(...)` | `title` 硬依赖 registry；token-meter / subagent 等随 base | 加上 `session-stats`、`turnOutline`、controller 的 `sessionListMetadata` / `imageLimits` / `modelSelection` | `title` 仍在 base；无 `sessionStats` / `turnOutline` | 有 registry；无 cache / stats / HTTP listing |
| Consumer（carrier） | `@deepseek-ai/dsh-api-session-controller` | live `cachedSnapshot(session)`；冷 `cache.cachedSnapshot(header)`；`onChanged` → `type: 'projection'` | 无 HTTP 宿主 | web 行 `id: session-controller` | 无 | 无 |

换 persistence backend 只换交给 `restore` / `coldSnapshot` 的 events 与 `session/flush` 的落盘。换 loop 不能绕开 log 合同。preset 需要私有 Provider 时必须 `isolate`；`sessionProjections` 不是那种私有服务。shipped log 介质是 base 行 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）。同层 `session-query-sqlite` 写 `openAt: never`。`workspace` 只出现在 web-app insert。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113] [E: packages/bundle/base/cordis.patch.yml:133] [E: packages/bundle/web-app/cordis.patch.yml:61]

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
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-persistence/src/handle.ts
- packages/session/session-persistence/src/storage-contract.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-title/src/index.ts
- packages/session/session-stats/src/index.ts
- packages/session/session-stats/src/projection.ts
- packages/session/session-turn-outline/src/index.ts
- packages/session/session-turn-outline/src/projection.ts
- packages/api/session-controller/src/index.ts
- packages/api/session-controller/src/list.ts
- packages/api/session-controller/src/control.ts
- packages/api/session-controller/src/model-selection-projection.ts
- packages/experimental/agent-team/src/projection.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages()`、`surfaceOp` replace、checkpoint 两个副作用落点。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；host 面 vs agent-preset 面。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/event` emit、`session/flush` parallel、`SESSION_FORMAT_VERSION`。
- [subsys.persistence.session-persistence](session-persistence.md)：`session/event` 入队、`session/flush` 耐久屏障、`readFrom`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend；base 行 `root: dshHomePath('sessions')`。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / top-level `tools/execute` 上先 `flush` 再 `next()`。
- [subsys.persistence.title](title.md)：log-only `session/title` 与 projection key `'title'`。
- [subsys.persistence.telemetry](telemetry.md)：`sessionStats` unit 计 `step/end`。web-app 另有 `turnOutline`（本页已点名，不另建节点）。
- [subsys.persistence.storage](storage.md)：base 上的 `ctx.storage` + domain；`session_projcache` 落在 `$DSH_HOME/storages/`。
- [subsys.persistence.session-query](session-query.md)：shipped `openAt: never`；search 默认关。
- [subsys.persistence.workspace](workspace.md)：只 web-app 的 workspace 实体。
- [subsys.host.apiproxy](../host/apiproxy.md)：Host HTTP API（session / settings / workspace controller）；listing 投影列与 control `projection` 帧。
