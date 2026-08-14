---
id: subsys.core.session
title: SessionEvent 日志
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/known-event-types.ts
  - packages/core/session/src/request-header.ts
  - packages/core/session/src/repair.ts
  - packages/core/session/src/preparation.ts
  - packages/core/session/tests/session.spec.ts
  - packages/core/session/tests/surface.spec.ts
  - packages/core/session/tests/fork.spec.ts
  - packages/core/session/tests/scoped.spec.ts
  - packages/core/session/tests/repair.spec.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/core/agent-loop/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - Session
  - SessionStore
  - SessionEventMap
  - deriveMessages
  - SurfaceOp
related:
  - spine.session-log
  - spine.overview
  - spine.turn-and-step
  - subsys.persistence.checkpoint
  - subsys.core.agent-loop
  - ref.session-events
evidence: explicit
status: verified
updated: 47f943859b
---

> `Session` 是一条 `seq = log.length` 的 append-only `SessionEvent` 日志，外加增量折叠模型历史的 `SurfaceManager`；`SessionStore` 以 `ctx.sessions` 挂在 **host 面**。模型下一轮看见的 `messages` 只能是 `deriveMessages()` 对 `surface.nodes` 的投影。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的 **model-visible ⟺ logged** 合同，不是一份可就地 splice 的 chat 数组。

## 能回答的问题

- `Session` 和 `SessionStore`（`ctx.sessions`）各拥有什么？`prepare` / `enter` / `announce` 为什么必须折进**一个** effect，`SessionStore.create()` 又是哪条捷径？`AgentLoop.create()` 与 `createAgent` / `setupAndPublish` 差在哪？
- 三类 surface（`user/message` / `assistant/message` / `tool/result`）怎样进模型历史？`SurfaceOp` 有没有 delete？
- `deriveMessages()` 为什么只走 `surface.nodes`？`SessionHeader` 为什么深冻、为什么不进 event log？
- seed / fork / `interruptedTurnClosers` 各拒绝或补什么？`SESSION_FORMAT_VERSION` 现在是多少？
- `session/flush` 是 waterfall 还是 parallel？preset 行若把 `sessions` publish 进 root realm，`leakedServices` 会怎样？

## 职责边界

本包拥有：单条 `Session` 的 append 合同、`SurfaceManager` 折叠、`SessionHeader` 校验与深冻、进程级 `SessionStore` 生命周期（`prepare` / `enter` / `announce` / `flush` / `fork`）、seed 与 `session/end-seed`、crash 尾的 `interruptedTurnClosers`、以及 `foldRequestHeader` 对 `request/header` 的纯折叠。

本包**不**拥有：JSONL / SQLite 写窗与 crash reload 编排（[subsys.persistence.checkpoint](../persistence/checkpoint.md)）；turn / step / inbox 何时 `append`（[spine.turn-and-step](../../spine/turn-and-step.md)、[spine.session-log](../../spine/session-log.md)）；默认 loop 工厂与 `ReactLoopAgent`（[subsys.core.agent-loop](agent-loop.md)）；compaction 何时发出 `replace`（`subsys.context.compaction`）；插件 merge 进 `SessionEventMap` 的完整词表（[ref.session-events](../../reference/session-events.md)）。

`dsh-session` 是 **host 面**服务。agent-preset 面只把 preset id 写进 header 或 `agent-preset/selected`，不另造一份 store。本仓默认产品路径是本地 Web GUI（`dsh web`），没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/session/src/index.ts` | `Session` / `SessionStore`；`append`；`prepare` / `enter` / `announce` / `flush` / `fork` |
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION`、`SessionHeader`、`SessionEventMap`、`SurfaceOp` |
| `packages/core/session/src/surface.ts` | `SurfaceManager`、`foldSurface`、`deriveEventMessage`；浏览器可进的 `/surface` 子路径 |
| `packages/core/session/src/request-header.ts` | `canonicalHeader` / `headerEquals` / `foldRequestHeader` |
| `packages/core/session/src/repair.ts` | `interruptedTurnClosers`；`TOOL_NOT_STARTED` / `TOOL_OUTCOME_UNKNOWN` |
| `packages/core/session/src/preparation.ts` | `SessionPreparation`：未 publish 的 Session 所有权袋 |
| `packages/core/session/src/known-event-types.ts` | 本仓已声明的 `SessionEventMap` type 集合 |
| `packages/core/session/tests/session.spec.ts` | seed 缺 marker、header 深冻、`prepare`+`enter`+`announce` |
| `packages/core/session/tests/surface.spec.ts` | `replace` 阴影、空 content assistant 不进投影 |
| `packages/core/session/tests/fork.spec.ts` | `OPEN_TURN` / `SESSION_ALREADY_EXISTS` |
| `packages/core/session/tests/scoped.spec.ts` | `scopeTarget` 过滤；`session/flush` parallel |
| `packages/core/session/tests/repair.spec.ts` | 平衡 log 不补；开 turn 补 `interrupted` |
| `packages/core/agent-loop/src/index.ts` | factory 把 session 折进同一条 lifecycle |
| `packages/core/agent-loop/src/invariant.ts` | `llm/stream` 上 **model-visible ⟺ logged** |
| `packages/bundle/base/cordis.patch.yml` | host 组合行 `id: session` |
| `packages/preset/agent-presets/src/session.ts` | `resolveSessionPreset`（header vs `agent-preset/selected`） |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 不得把 process-global service 泄漏进 root |
| `packages/session/session-checkpoint-policy/src/index.ts` | 在 waterfall 里 `flush` 后再 `next()` |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | 现为 `0`。新 header 必须等于该值；不兼容 log 在 load 时被拒，没有自动 migration。 [E: packages/core/session/src/types.ts:56] |
| `SessionHeader` | 创建事实：`version` / `id` / `createdAt`，可选 `cwd` / `parentSession` / `seedLength` / `origin:'subagent'` / `delegationDepth` / `agentPreset`。**不进** event log。`validateSessionHeader` 以 `deepFreeze` 交回。 [E: packages/core/session/src/index.ts:135] |
| `SessionEventMap` | merge-extensible 的 append-only 词汇表。核心键含 `turn/*`、`step/*`、三类 surface、`assistant/chunk`、`tool/call`、`request/header`、`request/context`、`todo/write`、`session/end-seed`。插件再 merge（例如 `agent-preset/selected`）。 [E: packages/core/session/src/types.ts:236] |
| `SurfaceEventType` | 只有 `user/message` / `assistant/message` / `tool/result`。只有它们可以带 `surfaceOp` / `sourceEventSeqs`。 [E: packages/core/session/src/types.ts:344] [E: packages/core/session/src/types.ts:345] [E: packages/core/session/src/types.ts:346] |
| `SurfaceOp` | `'append'`，或 `{ op: 'replace', start, end }`（闭区间）。**没有 delete。** [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] |
| `EpochHeader` | `request/header` 的折叠结果：`config` + 可选 `system` / `tools` / `adapterDefaults`。空 system / 空 tools 在 `canonicalHeader` 里变成缺省字段。 |
| `SessionForkError.code` | `SESSION_NOT_FOUND` / `SESSION_NOT_LIVE` / `SESSION_ALREADY_EXISTS` / `INVALID_BOUNDARY` / `OPEN_TURN`。 |
| `ignorable` | 信封可选 `ignorable: true`。缺省表示 required：读者不认识 `type` 时必须拒读，不能 silently 丢掉。 [E: packages/core/session/src/types.ts:422] |

`KNOWN_SESSION_EVENT_TYPES` 是本仓声明过的 type 集合（由 catalog 脚本生成，仍是可加载 `.ts`）。下游插件 type 不在这个 Set 里。 [E: packages/core/session/src/known-event-types.ts:19]

## 控制流

1. **host 面挂 store。** `dsh-base` 用组合行 `id: session` / `name: '@deepseek-ai/dsh-session'` 把 `SessionStore` 插进每个 profile 的第一层。`SessionStore` 构造时 `super(ctx, 'sessions')`，键是 `ctx.sessions`。这是进程级服务，不是 preset isolate 里的私有实例。 [E: packages/bundle/base/cordis.patch.yml:27] [E: packages/bundle/base/cordis.patch.yml:28] [E: packages/core/session/src/index.ts:797]

2. **`prepare` 只造对象，不入店。** `SessionStore.prepare` 校验 id 未占用，把 `meta` 折成 `SessionHeader`（补 `version` / `id` / `createdAt`），再 `Session.create`。`seedSource: 'persistence'` 走 `Session.fromRestore`：调用方交出独占所有权，就地校验并冻结。此时 `ctx.sessions.get(id)` 仍是 `undefined`。 [E: packages/core/session/src/index.ts:872] [E: packages/core/session/src/index.ts:888] [E: packages/core/session/tests/session.spec.ts:1157]

3. **`enter` 装 publication hooks，不发 `session/created`。** `enter` 用 `scopeTarget(session, scopeOf(this.ctx))` 钉 carrier，写入 `store` 与 module-private `attachments`，返回 detach。再 `enter` 同一 id 或同一对象抛 `already exists` / `already attached to a store`。 [E: packages/core/session/src/index.ts:915] [E: packages/core/session/src/index.ts:918] [E: packages/core/session/src/index.ts:919]

4. **`announce` 才发 `session/created`。** 同步 throw 否决这次 publication，已经 yield 的 detach 会配对 `session/disposed`。返回的 Promise reject 只打 log，不能事后否决。重复或重入 `announce` 抛 `already announced`。 [E: packages/core/session/src/index.ts:968] [E: packages/core/session/src/index.ts:976] [E: packages/core/session/tests/session.spec.ts:1162]

5. **`SessionStore.create()` 是「立刻 enter+announce」捷径。** `SessionStore.create` = `prepare` + 调用方 fiber 上**一个** `ctx.effect`：先 `yield this.enter(session)`，再 `this.announce(session)`。`session/created` 抛错时 generator effect 卸掉已 yield 的 detach，store 不泄漏。测试：listener 抛 `boom created listener` 后同 id 可以再 `create`。 [E: packages/core/session/src/index.ts:831] [E: packages/core/session/src/index.ts:836] [E: packages/core/session/src/index.ts:837] [E: packages/core/session/src/index.ts:838] [E: packages/core/session/tests/session.spec.ts:1371]

6. **factory 禁止走 `SessionStore.create` 捷径。** `dsh-agent-loop` 用 `SessionPreparation` 包住 `sessions.prepare(...)`，再 `this.prepare` 造未入店的 `ReactLoopAgent`。`AgentLoop.create()` 没有 `setup` hook：`SessionPreparation` + `prepare` 之后立刻 `publish('startup')`。`createAgent` / `resume` 才走 `setupAndPublish`：`await setup?(prepared.agent.ctx)` 成功（可选 `commit()`）之后才 `publish`。`publish` 的顺序是 `sessions.enter` → `agents.enter` → `sessions.announce` → `agents.announce`，不是 session 先 enter+announce 再 agent。owner fiber 上的 `ctx.effect` 在 unload 时先 `whenIdle` 再 `detachSession`，避免 sibling effect 抢先拆 publication hooks、把收尾事件变成静默丢失。 [E: packages/core/agent-loop/src/index.ts:590] [E: packages/core/agent-loop/src/index.ts:593] [E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:640] [E: packages/core/agent-loop/src/index.ts:558] [E: packages/core/agent-loop/src/index.ts:559] [E: packages/core/agent-loop/src/index.ts:560] [E: packages/core/agent-loop/src/index.ts:562] [E: packages/core/agent-loop/src/index.ts:508] [E: packages/core/agent-loop/src/index.ts:514] [E: packages/core/agent-loop/src/index.ts:524] [E: packages/core/session/src/preparation.ts:39]

7. **isolate / `leakedServices`。** `SessionStore` 坐在 host 根 realm，preset **不得**再 publish 一份 `sessions`。`mountPreset` 在 subtree settle 后跑 `leakedServices(agentCtx, fiber)`：实现落在 root isolate 符号上就收集服务名；非空则抛，要求该行 `isolate: { …: true }` 或把服务搬回 host。session 事件的 `scopeTarget` 是 scope 过滤：经某个 agent context `enter` 的会话，只发给该 scope 与 global 的 listener，隔壁 scope 听不到。这不是 isolate realm。 [E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365] [E: packages/core/session/tests/scoped.spec.ts:42]

8. **`append`：先校验再提交。** `seq` 钉成当前 `this.log.length`。`data` 与 surface 元数据各走一遍 `snapshotJsonValue`（非 JSON 在入口失败）。`SurfaceManager.validateNext` 必须先过；再 `log.push`。push **之后**才 fire-and-forget `session/event`：observer 失败不能回滚已提交事件。`entry.appending` 为真时再 `append` 抛 `session append cannot reenter while another append is being published`。热路径不碰磁盘。 [E: packages/core/session/src/index.ts:629] [E: packages/core/session/src/index.ts:634] [E: packages/core/session/src/index.ts:643] [E: packages/core/session/src/index.ts:625]

9. **surface 折叠。** `SURFACE_EVENT_TYPES` 只有 `user/message` / `assistant/message` / `tool/result`。`append` 把 seq 推进 `nodes` 尾；`replace` 用 `nodes.splice(startIdx, endIdx - startIdx + 1, plan.seq)` 换闭区间，并 `replaceGeneration += 1`。splice **不**从 `this.log` 删旧事件。`isReplaceOp` 要求对象恰好三个键且 `op === 'replace'`。`tool/result` 的 replace 只能改 `content`，其它字段必须结构相等。 [E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:175] [E: packages/core/session/src/surface.ts:369] [E: packages/core/session/src/surface.ts:370] [E: packages/core/session/src/surface.ts:315]

10. **`deriveMessages()` 只走 `surface.nodes`。** `replaceGeneration` 变化时整表重建。对每个 seq 调 `deriveEventMessage`：`user/message` 返回 `event.data`；`assistant/message` 在 `content.length === 0` 时返回 `null`（只挂 usage 的 max-tokens 壳）；`tool/result` 返回 `event.data.message`；chunk / 边界 / `tool/call` / `request/header` 一律 `null`。返回数组是新快照，里面的 `Message` 与 log 共享且深冻。测试：`replace` 之后投影只剩替换节点。 [E: packages/core/session/src/index.ts:726] [E: packages/core/session/src/index.ts:739] [E: packages/core/session/src/surface.ts:97] [E: packages/core/session/src/surface.ts:103] [E: packages/core/session/src/surface.ts:107] [E: packages/core/session/tests/surface.spec.ts:758]

11. **header 折叠是 log-only。** `Session.requestHeader()` 增量调用 `foldRequestHeader`：只看 `request/header`，取最后一份 `canonicalHeader`。`reason` 为 `initial` / `resume` / `change`；legacy `request/header-delta` 与 `reason: 'fallback'` 在 append / seed 入口被拒。 [E: packages/core/session/src/request-header.ts:68] [E: packages/core/session/src/index.ts:364]

12. **`session/flush` 不是 waterfall。** 事件签名只有 `(session)`，没有 `next`。`SessionStore.flush` 解析 live entry 的 carrier，对全部 listener 做 `Promise.allSettled`，再抛第一个 rejection；返回值是「是否至少有一个 listener」。一个 listener 失败不会阻止其它 listener 跑完。 [E: packages/core/session/src/index.ts:85] [E: packages/core/session/src/index.ts:1022] [E: packages/core/session/src/index.ts:1026] [E: packages/core/session/src/index.ts:1037]

13. **相关 waterfall 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：listener 不调用传入的 `next()` 就不会 `shift` 到下一层，内建行为也被 veto。`dsh-session-checkpoint-policy` 挂在三条 waterfall 上：`llm/stream` 先 `await ctx.sessions.flush(session)` 再 `yield* next()`（无 `sessionId` 或 id 已脱离 store 则直接 `next()`）；`tools/execute` 在 `exec.agent === undefined || exec.parent !== undefined` 时直接 `next()`（无 agent 的调用、以及带 `parent` 的嵌套子调用都不 flush）；只有带着 agent 且 `parent === undefined` 的顶层调用才 `await ctx.sessions.flush(exec.agent.session)` 再 `next()`；`agent/pre-step` 同样 flush 后 `return next()`。省略 `next()` = adapter / tool body / 下一步决策都不跑。 [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:242] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:65] [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81]

14. **loop invariant 也挂在 `llm/stream`。** companion 在 `ctx.on('llm/stream', …, { global: true, prepend: true })` 上注册：非 loop 请求直接 `next()`；loop 请求必须 frozen、带 live `sessionId`、log 里已有 `step/start` 与 `request/header`，且 `JSON.stringify(options.messages) === JSON.stringify(session.deriveMessages())`，model / system / tools 与折叠 header 一致。检查通过后 **必须** `return next()`，否则 adapter 永远等不到流。这是 **model-visible ⟺ logged** 的运行时门，不是 session 包内部函数。 [E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:54] [E: packages/core/agent-loop/src/invariant.ts:40] [E: packages/core/agent-loop/src/invariant.ts:53]

15. **seed 与 `session/end-seed`。** 构造期按 `seq === index` 连续重放，每条走与 live `append` 相同的 `validateNext`。缺 `surfaceOp` 的 surface 事件在 seed 就被拒（避免 resume「加载成功」却从 `deriveMessages()` 丢历史）。`firstLiveSeq` 在 seed 重放之后、可选 marker 之前赋值：`this.firstLiveSeq = this.log.length`。它是**本进程构造 seed 的长度**（无 seed 则为 0），不是构造函数跑完后的 `log.length`。若 seed 末条不是 `session/end-seed`，构造函数自己 `append` 一条；replay 钉死此时 `firstLiveSeq === original.seq` 而 `seq === original.seq + 1`。已经带 marker 的冷会话再打开不增长 log，marker 的 seq 可以小于当前 `firstLiveSeq`。`header.seedLength` 是耐久的 fork 血统边界，resume 全量 seed 时与 `firstLiveSeq` 不必相等。 [E: packages/core/session/src/index.ts:525] [E: packages/core/session/src/index.ts:539] [E: packages/core/session/src/index.ts:545] [E: packages/core/session/src/index.ts:546] [E: packages/core/session/tests/session.spec.ts:547] [E: packages/core/session/tests/session.spec.ts:139] [E: packages/core/session/tests/session.spec.ts:140]

16. **`fork` 只切闭合前缀。** `SessionStore.fork` 解析 live 源，按 inclusive `boundary`（省略则取最后一条）切片，再 `create` 子会话并写 `parentSession` / `seedLength`。前缀里最后一条 `turn/start|turn/end` 若是 `turn/start`，抛 `SessionForkError` / `OPEN_TURN`。子 id 已占用则 `SESSION_ALREADY_EXISTS`，且在解析源、校验 boundary **之前**就拒绝。 [E: packages/core/session/src/index.ts:1081] [E: packages/core/session/src/index.ts:1082] [E: packages/core/session/src/index.ts:1130] [E: packages/core/session/tests/fork.spec.ts:296]

17. **repair 只补尾巴。** `interruptedTurnClosers` 扫描已提交前缀：平衡或空 log 返回 `[]`。开着的 turn 先为未配对 call 补 `tool/result`（有 `tool/call` seq → `TOOL_OUTCOME_UNKNOWN`，仅有 assistant tool-call 块 → `TOOL_NOT_STARTED`），再补 `step/end`（若 step 仍开），最后 `turn/end { kind: 'interrupted' }`。时间戳复用最后一条真事件。这条合成器是 `interrupted` 的写出点；live `ReactLoopAgent.turn` 的收尾 reason 不走这里。 [E: packages/core/session/src/repair.ts:80] [E: packages/core/session/src/repair.ts:118] [E: packages/core/session/src/repair.ts:131] [E: packages/core/session/tests/repair.spec.ts:37]

18. **preset id 跟 header 走。** 创建时 `meta.agentPreset` 写入深冻 header。空白会话后来换 preset 必须再 `append('agent-preset/selected')`；`resolveSessionPreset` 从后往前找该事件，找不到才回退 `header.agentPreset`。header 字段本身不能改。 [E: packages/core/session/src/index.ts:886] [E: packages/preset/agent-presets/src/session.ts:51] [E: packages/preset/agent-presets/src/session.ts:53] [E: packages/core/session/tests/session.spec.ts:999]

Turn / step 往 log 写哪些 event、checkpoint 两个副作用落点的完整时序，见 [spine.session-log](../../spine/session-log.md) 与 [spine.turn-and-step](../../spine/turn-and-step.md)。本页不重写那条脊柱。

## 设计动机

DSH 是组合运行时，不是「内存 messages + 事后再写盘」的 coding agent。把 log 当成唯一真相，`deriveMessages()` 当成投影，才能让换 loop、换 persistence、换 compaction 都无法偷偷改模型看见的历史。`dsh-agent-loop` 把这条不变量钉在 `llm/stream` 上：请求进 adapter 之前必须能从当时 log 前缀重建。

`prepare` / `enter` / `announce` 拆开，是为了和 loop 卸店排成一条可逆 effect。`SessionStore.create()` 给测试和「不要和 driver 共生」的调用方一条立刻 enter+announce 的捷径。`AgentLoop.create()` 仍走 `SessionPreparation` + `prepare` + 立刻 `publish`，没有 `setup`；`createAgent` / `resume` 才在 `setupAndPublish` 里 setup 成功后再 `publish`。

`SurfaceOp` 只有 append 与 replace：人读 UI 继续看见当初 append 的原文（`isAppendSurfaceEvent`），模型下次请求只看见替换后的 `nodes`。没有 delete，所以 compaction / prune 是 shadow，不是抹除。

header 放在 log 外面，因为它是存储身份（cwd、血统、创建时 preset），不是可重放的对话状态。创建后深冻，避免「内存里改了 preset / cwd、resume 却对不上」。

`/surface` 子路径刻意不碰 `node:`，好让浏览器半边只消费投影，不拥有 store。

## Gotcha

- **没有 delete。** 想拿掉一段模型历史，只能 `surfaceOp: { op: 'replace', start, end }`。`this.log` 永远变长。
- **缺 marker 的 seed 会被拒。** 编译器挡住 live `append` 漏 `surfaceOp`；raw seed 必须在运行时同样失败，否则 resume 表面成功、`deriveMessages()` 丢历史。 [E: packages/core/session/tests/session.spec.ts:547]
- **空 content 的 `assistant/message` 在 surface 上，但不进 `deriveMessages()`。** 它只给 max-tokens 步挂 usage。 [E: packages/core/session/tests/surface.spec.ts:827]
- **`session/flush` 没有 `next()`。** 把它当成 waterfall、指望「不调用 next 就挡住别人」是错的。耐久否决发生在 **别的** waterfall（`llm/stream` / `tools/execute`）里：那些 listener 先 `flush` 再决定要不要 `next()`。
- **waterfall 漏 `next()` 等于停整条链。** `Events.waterfall` 靠 `cbs.shift()` 前进。checkpoint 或 invariant 若检查完不 `return next()`，adapter 不会被调用。 [E: vendor/cordis/src/events.ts:238]
- **`SessionStore.create()` 和 factory 长路径不要混用。** 两个 `enter` 竞态时，后到的 stale `prepare` 结果会被拒，避免 detach 卸错那条 live 会话。 [E: packages/core/session/tests/session.spec.ts:1144]
- **fork 不能切在开 turn 里。** 尾是 `turn/start` 而没有配对 `turn/end` → `OPEN_TURN`。要切更早的已闭合边界，显式传那个 `boundary`。 [E: packages/core/session/tests/fork.spec.ts:296]
- **header 深冻。** `Object.isFrozen(session.header)` 为真；`Reflect.set(session.header, 'cwd', …)` 失败。换 preset 写事件，不要改 header。 [E: packages/core/session/tests/session.spec.ts:999] [E: packages/core/session/tests/session.spec.ts:1000]
- **`firstLiveSeq` ≠ 构造后 `log.length`，也 ≠ `header.seedLength`。** `firstLiveSeq` 是本进程构造 seed 的长度，赋在可选 `session/end-seed` 之前；未带 marker 的 seed 会再 append 一条，所以 `firstLiveSeq` 仍是 seed 长，`seq` 多 1。`header.seedLength` 是耐久 fork 血统。读存储历史时找**最后一条** `session/end-seed`，它不一定停在当前 `firstLiveSeq`（已带 marker 的冷会话再打开不重标）。 [E: packages/core/session/src/index.ts:539] [E: packages/core/session/tests/session.spec.ts:139] [E: packages/core/session/tests/session.spec.ts:140] [E: packages/core/session/tests/session.spec.ts:154]
- **version 钉在 `0`。** 没有 migration。写了新 header 形状或新 `SurfaceOp` 变体才该 bump；加普通事件 type 靠 `ignorable`，不靠版本号。
- **preset 泄漏 `sessions`。** 把 `@deepseek-ai/dsh-session` 再挂进 preset 且不 `isolate`，`leakedServices` 会点名 process-global service 并拒绝 mount。session 留在 host。 [E: packages/preset/agent-presets/src/mount.ts:365]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session`（`types.ts` + `/surface`） | `SessionEventMap` / `SurfaceOp` / `Session.append` / `deriveMessages` | 无 preset 行；类型与 surface 子路径可进浏览器 |
| Provider | `SessionStore` | `ctx.sessions` | `dsh-base` 的 `id: session`。JSONL 与 checkpoint 是后续 persistence Provider，订阅 `session/event`、实现 `session/flush` |
| Consumer | `dsh-agent-loop`、`dsh-session-checkpoint-policy`、compaction / pruner、`dsh-agent-presets` | 写 log、读 `deriveMessages`、在 waterfall 里 `flush` 后 `next()`、读 `header.agentPreset` | loop / checkpoint 是 host 行；preset 只记录 id，不 remount store |

换 persistence backend 只换 `session/event` + `session/flush` 的落盘实现。换 loop 不能绕开 surface 合同，否则 invariant 在 `llm/stream` 上 fail。preset 需要私有 Provider 时必须 `isolate`；`sessions` 不是那种私有服务。

## Sources

- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/known-event-types.ts
- packages/core/session/src/request-header.ts
- packages/core/session/src/repair.ts
- packages/core/session/src/preparation.ts
- packages/core/session/tests/session.spec.ts
- packages/core/session/tests/surface.spec.ts
- packages/core/session/tests/fork.spec.ts
- packages/core/session/tests/scoped.spec.ts
- packages/core/session/tests/repair.spec.ts
- packages/core/agent-loop/src/invariant.ts
- packages/core/agent-loop/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/preset/agent-presets/src/session.ts
- packages/preset/agent-presets/src/mount.ts
- packages/session/session-checkpoint-policy/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：turn / step 往 log 写哪些 event、`deriveMessages` 投影、checkpoint 两个副作用落点。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset` 总览；host 面 vs agent-preset 面。
- [spine.turn-and-step](../../spine/turn-and-step.md)：inbox `followup` / `steer` / `inject` 何时变成 `user/message`。
- [subsys.persistence.checkpoint](../persistence/checkpoint.md)：`session/flush` 之后的 JSONL 写窗与 crash reload。
- [subsys.core.agent-loop](agent-loop.md)：默认 factory 如何 `prepare` session 并在 `llm/stream` 上钉不变量。
- [ref.session-events](../../reference/session-events.md)：merge 进 `SessionEventMap` 的完整事件表。
