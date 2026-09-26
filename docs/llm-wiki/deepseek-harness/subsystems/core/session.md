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
  - packages/core/session/src/fork.ts
  - packages/core/session/src/preparation.ts
  - packages/core/session/tests/session.spec.ts
  - packages/core/session/tests/surface.spec.ts
  - packages/core/session/tests/fork.spec.ts
  - packages/core/session/tests/repair.spec.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/core/agent-loop/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/preset/agent-preset-registry/src/session.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - Session
  - SessionStore
  - SessionEventMap
  - deriveMessages
  - SurfaceOp
  - SESSION_FORMAT_VERSION
related:
  - spine.session-log
  - spine.overview
  - spine.turn-and-step
  - subsys.persistence.checkpoint
  - subsys.persistence.session-format
  - subsys.core.agent-loop
  - ref.session-events
evidence: explicit
status: verified
updated: 477b4f4205
---

> `Session` 是一条 `seq = log.length` 的 append-only `SessionEvent` 日志，外加增量折叠模型历史的 `SurfaceManager`；`SessionStore` 以 `ctx.sessions` 挂在 **host 面**。模型下一轮看见的 `messages` 只能是 `deriveMessages()` 对 `surface.nodes` 的投影。`SESSION_FORMAT_VERSION` 现为 **4**。`system/message` 是 surface 第 0 号节点；`EpochHeader` **没有** `system` 字段（v4 仍拒绝 `request/header.system`）。`tool/result` 的模型消息是 first-class `role: 'tool'`，不是 user 消息里的 `tool-result` wrapper。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的 **model-visible ⟺ logged** 合同，不是一份可就地 splice 的 chat 数组。

## 能回答的问题

- `Session` 和 `SessionStore`（`ctx.sessions`）各拥有什么？`prepare` / `enter` / `announce` 为什么必须折进**一个** effect，`SessionStore.create()` 又是哪条捷径？`AgentLoop.create()` 与 `createAgent` / `setupAndPublish` 差在哪？
- 五类 surface（`system/message` / `developer/message` / `user/message` / `assistant/message` / `tool/result`）怎样进模型历史？`SurfaceOp` 有没有 delete？`assistant/attempt` 进不进 `deriveMessages()`？
- `deriveMessages()` 为什么只走 `surface.nodes`？`tool/result` 的 `role` 是什么？`SessionHeader` 为什么深冻、为什么不进 event log？`seedLength` 还在吗？
- seed / fork / `interruptedTurnClosers` 各拒绝或补什么？`SESSION_FORMAT_VERSION` 现在是 4。v0→v1→v2→v3→v4 在哪一层跑？同步读 `eventAt` / `snapshotEvents` / `ownEvents` 还能当生产路径吗？
- `session/flush` 是 waterfall 还是 parallel？preset 行若把 `sessions` publish 进 root realm，`leakedServices` 会怎样？

## 职责边界

本包拥有：单条 `Session` 的 append 合同、`SurfaceManager` 折叠、`SessionHeader` 校验与深冻、进程级 `SessionStore` 生命周期（`prepare` / `enter` / `announce` / `flush` / `fork`）、seed 与 `session/end-seed`、crash 尾的 `interruptedTurnClosers`、fork 开 turn 的 `openTurnClosers` / `buildForkSeed`，以及 `foldRequestHeader` 对 `request/header` 的纯折叠。

本包**不**拥有：JSONL generation / lease / catalog 迁盘（[subsys.persistence.jsonl](../persistence/jsonl.md)、[subsys.persistence.session-persistence](../persistence/session-persistence.md)、[subsys.persistence.session-format](../persistence/session-format.md)）；turn / step / inbox 何时 `append`（[spine.turn-and-step](../../spine/turn-and-step.md)、[spine.session-log](../../spine/session-log.md)）；默认 loop 工厂与 `ReactLoopAgent`（[subsys.core.agent-loop](agent-loop.md)）；compaction 何时发出 `replace`（`subsys.context.compaction`）；插件 merge 进 `SessionEventMap` 的完整词表（[ref.session-events](../../reference/session-events.md)）。v3→v4 的 `liftToolResult` 属于 format migrator，不在本包。

`dsh-session` 是 **host 面**服务。agent-preset 面只把 preset id 写进 header 或 `agent-preset/selected`，不另造一份 store。shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；`dsh web` 只是 `web` 的硬编码别名，不是唯一宿主入口。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/session/src/index.ts` | `Session` / `SessionStore`；`append`；`prepare` / `enter` / `announce` / `flush` / `fork` |
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 4`、`SessionHeader`（`isSeeded`）、`SessionEventMap`、`SurfaceOp`、`EpochHeader.system?: never` |
| `packages/core/session/src/surface.ts` | `SurfaceManager`、`foldSurface`、`deriveEventMessage`；浏览器可进的 `/surface` 子路径 |
| `packages/core/session/src/request-header.ts` | `canonicalHeader` / `headerEquals` / `foldRequestHeader` |
| `packages/core/session/src/repair.ts` | `openTurnClosers` / `interruptedTurnClosers`；`TOOL_NOT_STARTED` / `TOOL_OUTCOME_UNKNOWN`；合成 `role: 'tool'` |
| `packages/core/session/src/fork.ts` | `buildForkSeed`：拷前缀 + inherited marker + `openTurnClosers(..., { kind: 'forked' })` |
| `packages/core/session/src/preparation.ts` | `SessionPreparation`：未 publish 的 Session 所有权袋 |
| `packages/core/session/src/known-event-types.ts` | 本仓已声明的 `SessionEventMap` type 集合 |
| `packages/core/agent-loop/src/index.ts` | factory 把 session + persistence handle 折进同一条 lifecycle |
| `packages/core/agent-loop/src/invariant.ts` | `llm/stream` 上 **model-visible ⟺ logged** |
| `packages/bundle/base/cordis.patch.yml` | host 组合行 `id: session` |
| `packages/preset/agent-preset-registry/src/session.ts` | `agentPresetProjectionDefinition` |
| `packages/preset/agent-preset-registry/src/mount.ts` | `leakedServices` |
| `packages/session/session-checkpoint-policy/src/index.ts` | 在 waterfall 里 `flush` 后再 `next()` |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | 现为 **4**。新 header 必须等于该值。磁盘上的 v0/v1/v2/v3 generation 由 JSONL + format catalog 迁到 4；比 4 新的盘仍拒。本包的 `validateSessionHeader` 只认当前值。 [E: packages/core/session/src/types.ts:89] [E: packages/core/session/src/index.ts:105] |
| `SessionHeader` | 创建事实：`version` / `id` / `createdAt` / **`isSeeded`**，可选 `cwd` / `parentSession` / `origin:'subagent'` / `delegationDepth` / `agentPreset`。**不进** event log。出现 `seedLength` 字段直接拒。新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 4）。 [E: packages/core/session/src/index.ts:102] [E: packages/core/session/src/index.ts:105] |
| `inheritedEventCount` | fork 前缀长度，与 header 成对存在 Session / handle 上，不进可重放 log。`mode === 'snapshot'` 且 `isSeeded` 时，构造期 seed 必须恰好等于这个 cut，或 cut 处已有 tagged `session/end-seed`；`fromRestore` 的 seed 可以比 cut 长。 [E: packages/core/session/src/index.ts:467] [E: packages/core/session/src/index.ts:607] |
| `SessionEventMap` | merge-extensible 的 append-only 词汇表。核心键含 `turn/*`、`step/*`、五类 surface（含 **`system/message`** 与 **`developer/message`**）、**`assistant/attempt`**、`tool/call`、`request/header`、`request/context`、`session/end-seed`。插件再 merge（例如 `agent-preset/selected`）。 [E: packages/core/session/src/types.ts:281] [E: packages/core/session/src/types.ts:330] |
| `SurfaceEventType` | `system/message` / `developer/message` / `user/message` / `assistant/message` / `tool/result`。只有它们可以带 `surfaceOp` / `sourceEventSeqs`。`assistant/message` **禁止** `sourceEventSeqs`（流嵌在 `data.stream`）。 [E: packages/core/session/src/types.ts:439] [E: packages/core/session/src/surface.ts:50] |
| `SurfaceOp` | `'append'`，或 `{ op: 'replace', startSeq, endSeq }`（闭区间）。**没有 delete。** [E: packages/core/session/src/types.ts:462] [E: packages/core/session/src/types.ts:464] |
| `EpochHeader` | `request/header` 的折叠结果：`config` + 可选 `adapterDefaults` / `tools`。`system?: never`；system prompt 是 surface 上的 `system/message`。带 `header.system` 的 `request/header` 会抛。 [E: packages/core/session/src/types.ts:240] [E: packages/core/session/src/types.ts:250] [E: packages/core/session/src/surface.ts:210] |
| `'tool/result'` | `data.message` 是 `ToolResultMessage`：live 路径与 repair 都写 `role: 'tool'` + `toolCallId` + `source: { kind: 'tool', callId }`。v3 盘上的 user-role wrapper 由 format migrator `liftToolResult` 抬上来，不在本包。 [E: packages/core/session/src/types.ts:375] [E: packages/core/session/src/repair.ts:131] |
| `SessionForkError.code` | `SESSION_NOT_FOUND` / `SESSION_NOT_LIVE` / `SESSION_ALREADY_EXISTS` / `INVALID_BOUNDARY`。**没有** `OPEN_TURN`：开 turn 的 fork 用合成 closer 闭合，不拒切。 [E: packages/core/session/src/index.ts:904] [E: packages/core/session/src/fork.ts:29] |
| `ignorable` | 信封可选 `ignorable: true`。缺省表示 required：读者不认识 `type` 时必须拒读。 [E: packages/core/session/src/types.ts:511] |

`KNOWN_SESSION_EVENT_TYPES` 是本仓声明过的 type 集合（由 catalog 脚本生成，仍是可加载 `.ts`）。下游插件 type 不在这个 Set 里。集合含 `system/message` 与 `developer/message`。 [E: packages/core/session/src/known-event-types.ts:22] [E: packages/core/session/src/known-event-types.ts:37] [E: packages/core/session/src/known-event-types.ts:63]

同步读 `eventAt` / `snapshotEvents` / `ownEvents` 标 `@deprecated`：已有调用可暂留，**禁止新增生产调用**。 [E: packages/core/session/src/index.ts:635] [E: packages/core/session/src/index.ts:649] [E: packages/core/session/src/index.ts:666]

## 控制流

1. **host 面挂 store。** `dsh-base` 用组合行 `id: session` / `name: '@deepseek-ai/dsh-session'` 把 `SessionStore` 插进叠了 base 的 profile 的第一层（`sdk-minimal` 不叠 `dsh-base`，它自己的 complete insert 仍要带 session 行才有 `ctx.sessions`）。`SessionStore` 构造时 `super(ctx, 'sessions')`。这是进程级服务，不是 preset isolate 里的私有实例。 [E: packages/bundle/base/cordis.patch.yml:40] [E: packages/core/session/src/index.ts:953]

2. **`prepare` 只造对象，不入店。** `SessionStore.prepare` 校验 id 未占用，把 `meta` 折成 `SessionHeader`（补 `version` / `id` / `createdAt` / `isSeeded`），再 `Session.create`。`eventState: 'detached' | 'shared-frozen'` 走 `Session.fromRestore`：调用方交出独占所有权，就地校验并冻结。此时 `ctx.sessions.get(id)` 仍是 `undefined`。 [E: packages/core/session/src/index.ts:1018] [E: packages/core/session/src/index.ts:1032] [E: packages/core/session/src/index.ts:1049]

3. **`enter` 装 publication hooks，不发 `session/created`。** `enter` 用 `scopeTarget(session, scopeOf(this.ctx))` 钉 carrier，写入 `store` 与 module-private `attachments`，返回 detach。再 `enter` 同一 id 或同一对象抛 `already exists` / `already attached to a store`。 [E: packages/core/session/src/index.ts:1085] [E: packages/core/session/src/index.ts:1090] [E: packages/core/session/src/index.ts:1091]

4. **`announce` 才发 `session/created`。** 同步 throw 否决这次 publication，已经 yield 的 detach 会配对 `session/disposed`。返回的 Promise reject 只打 log，不能事后否决。重复或重入 `announce` 抛 `already announced`。 [E: packages/core/session/src/index.ts:1140] [E: packages/core/session/src/index.ts:1143]

5. **`SessionStore.create()` 是「立刻 enter+announce」捷径。** `SessionStore.create` = `prepare` + 调用方 fiber 上**一个** `ctx.effect`：先 `yield this.enter(session)`，再 `this.announce(session)`。 [E: packages/core/session/src/index.ts:986] [E: packages/core/session/src/index.ts:993] [E: packages/core/session/src/index.ts:994]

6. **factory 禁止走 `SessionStore.create` 捷径。** `dsh-agent-loop` 用 `SessionPreparation` 包住 `sessions.prepare(...)`。`publish` 的顺序是 `sessions.enter` → `agents.enter` → `sessions.announce` → `agents.announce`。 [E: packages/core/session/src/preparation.ts:20] [E: packages/core/agent-loop/src/index.ts:653] [E: packages/core/agent-loop/src/index.ts:618] [E: packages/core/agent-loop/src/index.ts:622]

7. **isolate / `leakedServices`。** `SessionStore` 坐在 host 根 realm，preset **不得**再 publish 一份 `sessions`。`mountPreset` 在 subtree settle 后跑 `leakedServices`：非空则抛 `Preset services require isolate realms: …`。 [E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:265] [E: packages/preset/agent-preset-registry/src/mount.ts:267]

8. **`append`：先校验再提交。** `seq` 钉成当前 `this.log.length`。`data` 与 surface 元数据各走一遍 `snapshotJsonValue`。`SurfaceManager.validateNext` 必须先过；再 `log.push`。push **之后**才 fire-and-forget `session/event`。`entry.appending` 为真时再 `append` 抛 `session append cannot reenter while another append is being published`。热路径不碰磁盘。 [E: packages/core/session/src/index.ts:741] [E: packages/core/session/src/index.ts:746] [E: packages/core/session/src/index.ts:761]

9. **surface 折叠。** `SURFACE_EVENT_TYPES` 有五个：`system/message` / `developer/message` / `user/message` / `assistant/message` / `tool/result`。 [E: packages/core/session/src/surface.ts:50] `append` 把 seq 推进 `nodes` 尾；`replace` 用 `nodes.splice(startIdx, endIdx - startIdx + 1, plan.seq)` 换闭区间。splice **不**从 `this.log` 删旧事件。`isReplaceOp` 要求对象恰好三个键且 `op === 'replace'`，键名是 `startSeq` / `endSeq`。surface node 0 若是 `system/message`，只能被恰好覆盖该节点的 `system/message` 改写。 [E: packages/core/session/src/surface.ts:296] [E: packages/core/session/src/surface.ts:576] [E: packages/core/session/src/surface.ts:509]

10. **`deriveMessages()` 只走 `surface.nodes`。** `contentGeneration` 变化时整表重建。对每个 seq 调 `deriveEventMessage`：`user/message` 返回 `event.data`；`system/message` / `developer/message` / `assistant/message` 在 `content.length === 0` 时返回 `null`，否则返回 `event.data.message`；`tool/result` 返回 `event.data.message`（`role: 'tool'`）；`assistant/attempt` / 边界 / `tool/call` / `request/header` 一律 `null`。 [E: packages/core/session/src/index.ts:860] [E: packages/core/session/src/surface.ts:138] [E: packages/core/session/src/surface.ts:144] [E: packages/core/session/src/surface.ts:150] 测试：空 content 的 assistant 在 surface 上，但不进投影。 [E: packages/core/session/tests/surface.spec.ts:741]

11. **header 折叠是 log-only。** `Session.requestHeader()` 增量调用 `foldRequestHeader`：只看 `request/header`，取最后一份 `canonicalHeader`。`reason` 为 `initial` / `resume` / `change` / `series`。折叠结果**不含** `system`。 [E: packages/core/session/src/request-header.ts:63] [E: packages/core/session/src/index.ts:788]

12. **`session/flush` 不是 waterfall。** 事件签名只有 `(session)`，没有 `next`。`SessionStore.flush` 对全部 listener 做 `Promise.allSettled`，再抛第一个 rejection；返回值是「是否至少有一个 listener」。 [E: packages/core/session/src/index.ts:86] [E: packages/core/session/src/index.ts:1194] [E: packages/core/session/src/index.ts:1198]

13. **相关 waterfall 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`。checkpoint 挂在 `llm/stream` / `tools/execute` / `agent/pre-step` 上：先 `await ctx.sessions.flush(...)` 再 `next()`。省略 `next()` = adapter / tool body / 下一步决策都不跑。 [E: vendor/cordis/src/events.ts:235] [E: vendor/cordis/src/events.ts:238] [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36]

14. **loop invariant 也挂在 `llm/stream`。** companion 在 `ctx.on('llm/stream', …, { global: true, prepend: true })` 上注册：非 loop 请求直接 `next()`；loop 请求必须 frozen、带 live `sessionId`、log 里已有 `step/start` 与 `request/header`，且 `JSON.stringify(options.messages) === JSON.stringify(session.deriveMessages())`。`options.system` **必须是 `undefined`**——system prompt 走 surface node 0，不走 adapter `system` 字段。检查通过后 **必须** `return next()`。 [E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:41] [E: packages/core/agent-loop/src/invariant.ts:47] [E: packages/core/agent-loop/src/invariant.ts:55]

15. **seed 与 `session/end-seed`。** 构造期按 `seq === index` 连续重放，每条走与 live `append` 相同的 `validateNext`。缺 `surfaceOp` 的 surface 事件在 seed 就被拒。 [E: packages/core/session/src/index.ts:583] [E: packages/core/session/tests/session.spec.ts:687] `firstLiveSeq` 在 seed 重放之后、可选 marker 之前赋值：`this.firstLiveSeq = this.log.length`。它是**本进程构造 seed 的长度**（无 seed 则为 0），不是构造函数跑完后的 `log.length`。未带 marker 的 seed 会再 `append` 一条普通 `session/end-seed`；fresh seeded child 则 append `{ inherited: true }`。 [E: packages/core/session/src/index.ts:590] [E: packages/core/session/src/index.ts:619] [E: packages/core/session/tests/session.spec.ts:157] 已经带 marker 的冷会话再打开不增长 log。`header.isSeeded` + `inheritedEventCount` 是耐久的 fork 血统；resume 全量 seed 时 `firstLiveSeq` 不必等于 inherited cut。

16. **`fork` 切闭合前缀，开 turn 用合成 closer。** `SessionStore.fork` 解析 live 源，按 inclusive `boundary`（省略则取最后一条）切片，再 `buildForkSeed`：拷前缀、钉 inherited `session/end-seed`、对开着的 turn 追加 `openTurnClosers(..., { kind: 'forked' })`，然后 `create` 子会话并写 `parentSession` / `isSeeded: true` / `inheritedEventCount`（只计拷贝的源事件，不含 closer）。子 id 已占用则 `SESSION_ALREADY_EXISTS`，且在解析源、校验 boundary **之前**就拒绝。非法 boundary 是 `INVALID_BOUNDARY`。 [E: packages/core/session/src/index.ts:1255] [E: packages/core/session/src/index.ts:1256] [E: packages/core/session/src/fork.ts:21] [E: packages/core/session/tests/fork.spec.ts:284]

17. **repair 只补尾巴。** `interruptedTurnClosers` 委托 `openTurnClosers(..., { kind: 'interrupted' })`：平衡或空 log 返回 `[]`。开着的 turn 先为未配对 call 补 `tool/result`（`role: 'tool'`；有 `tool/call` seq → `TOOL_OUTCOME_UNKNOWN`，仅有 assistant tool-call 块 → `TOOL_NOT_STARTED`），再补 `step/end`（若 step 仍开），最后 `turn/end { kind: 'interrupted' }`。产品 resume 由 `AgentLoop` 把 closer `handle.append` 回盘。 [E: packages/core/session/src/repair.ts:175] [E: packages/core/session/src/repair.ts:131] [E: packages/core/session/src/repair.ts:18]

18. **preset id 跟 header 与投影走。** 创建时 `meta.agentPreset` 写入深冻 header。空白会话后来换 preset 必须再 `append('agent-preset/selected')`。`agentPresetProjectionDefinition` 的 `init` 取 `header.agentPreset ?? null`，`apply` 遇到 `agent-preset/selected` 就换成事件里的 id。header 字段本身不能改。 [E: packages/core/session/src/index.ts:1058] [E: packages/preset/agent-preset-registry/src/session.ts:38] [E: packages/preset/agent-preset-registry/src/session.ts:39] [E: packages/core/session/tests/session.spec.ts:1138]

Turn / step 往 log 写哪些 event、checkpoint 两个副作用落点的完整时序，见 [spine.session-log](../../spine/session-log.md) 与 [spine.turn-and-step](../../spine/turn-and-step.md)。本页不重写那条脊柱。v0→v4 迁盘见 [subsys.persistence.session-format](../persistence/session-format.md)。

## 设计动机

DSH 是组合运行时，不是「内存 messages + 事后再写盘」的 coding agent。把 log 当成唯一真相，`deriveMessages()` 当成投影，才能让换 loop、换 persistence、换 compaction 都无法偷偷改模型看见的历史。`dsh-agent-loop` 把这条不变量钉在 `llm/stream` 上：请求进 adapter 之前必须能从当时 log 前缀重建，且 `options.system` 为空——渲染后的 system prompt 已经是 surface 上的 `system/message`。

`prepare` / `enter` / `announce` 拆开，是为了和 loop 卸店排成一条可逆 effect。`SessionStore.create()` 给测试和「不要和 driver 共生」的调用方一条立刻 enter+announce 的捷径。

`SurfaceOp` 只有 append 与 replace：人读 UI 继续看见当初 append 的原文（`isAppendSurfaceEvent`），模型下次请求只看见替换后的 `nodes`。没有 delete，所以 compaction / prune 是 shadow，不是抹除。v3 起用 `startSeq` / `endSeq` 命名区间，避免与半开区间的 `start`/`end` 混淆。

header 放在 log 外面，因为它是存储身份（cwd、血统、创建时 preset），不是可重放的对话状态。v2 起用 `isSeeded` + 旁路 `inheritedEventCount` 代替已删除的 `seedLength` 字段。创建后深冻，避免「内存里改了 preset / cwd、resume 却对不上」。

v2 把 Assistant 流嵌进 `assistant/message` / `assistant/attempt`。v3 把 system prompt 从 `request/header` 拆到 `system/message`。v4 把 `tool/result` 从 user 消息里的单一 `tool-result` wrapper 抬成 first-class `role: 'tool'`，并继续拒绝 `header.system`。磁盘 generational 升级在 JSONL + catalog，不在本包。

`/surface` 子路径刻意不碰 `node:`，好让浏览器半边只消费投影，不拥有 store。

## Gotcha

- **没有 delete。** 想拿掉一段模型历史，只能 `surfaceOp: { op: 'replace', startSeq, endSeq }`。`this.log` 永远变长。
- **缺 marker 的 seed 会被拒。** 编译器挡住 live `append` 漏 `surfaceOp`；raw seed 必须在运行时同样失败。 [E: packages/core/session/tests/session.spec.ts:687]
- **空 content 的 `assistant/message` / `system/message` / `developer/message` 在 surface 上，但不进 `deriveMessages()`。** assistant 只给 max-tokens 步挂 usage；空 system 记录「没有 system prompt」。 [E: packages/core/session/tests/surface.spec.ts:741]
- **`assistant/attempt` 不是 surface。** 失败 / 重试 / 取消的流停在 log-only 事件里，不进模型历史。
- **`session/flush` 没有 `next()`。** 耐久否决发生在 **别的** waterfall（`llm/stream` / `tools/execute`）里。
- **waterfall 漏 `next()` 等于停整条链。** [E: vendor/cordis/src/events.ts:238]
- **fork 可以切在开 turn 里。** 不再抛 `OPEN_TURN`；`buildForkSeed` 在 inherited cut 之后写合成 `tool/result`（`role: 'tool'`）与 `turn/end { kind: 'forked' }`。`inheritedEventCount` 不计这些 closer。 [E: packages/core/session/tests/fork.spec.ts:284] [E: packages/core/session/src/fork.ts:29]
- **header 深冻。** `Object.isFrozen(session.header)` 为真；`Reflect.set(session.header, 'cwd', …)` 失败。换 preset 写事件，不要改 header。 [E: packages/core/session/tests/session.spec.ts:1138] [E: packages/core/session/tests/session.spec.ts:1139]
- **`firstLiveSeq` ≠ 构造后 `log.length`，也 ≠ `inheritedEventCount`。** `firstLiveSeq` 是本进程构造 seed 的长度，赋在可选 `session/end-seed` 之前。 [E: packages/core/session/src/index.ts:590] [E: packages/core/session/tests/session.spec.ts:157]
- **version 钉在 `4`。** 新 header 必须是 4。磁盘历史 generation 的迁移在 JSONL + catalog，不在本包。加普通事件 type 靠 `ignorable`，不靠版本号。写了新 header 形状或新 `SurfaceOp` 变体才该 bump。
- **`seedLength` 已退役。** header 上出现该字段会抛 `invalid field "seedLength"`。 [E: packages/core/session/src/index.ts:102]
- **同步读 API 已弃用。** `eventAt` / `snapshotEvents` / `ownEvents` 标 `@deprecated`；wiki 与新代码不要把它们写成推荐路径。 [E: packages/core/session/src/index.ts:635]
- **`request/header` 不得带 `system`。** 用 `system/message`。v4 读写都拒绝。 [E: packages/core/session/src/surface.ts:210]
- **preset 泄漏 `sessions`。** 把 `@deepseek-ai/dsh-session` 再挂进 preset 且不 `isolate`，`leakedServices` 会点名 process-global service 并拒绝 mount。 [E: packages/preset/agent-preset-registry/src/mount.ts:267]
- **live `tool/result` 已经是 `role: 'tool'`。** 不要把 v3 wrapper 形状写进当前 Session 合同；那只出现在历史盘上，由 `dsh-session-format-v3-to-v4` 的 `liftToolResult` 转换。

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session`（`types.ts` + `/surface`） | `SessionEventMap` / `SurfaceOp` / `Session.append` / `deriveMessages` | 无 preset 行；类型与 surface 子路径可进浏览器 |
| Provider | `SessionStore` | `ctx.sessions` | `dsh-base` 的 `id: session`。JSONL 是后续 persistence Provider：`create`/`open` 拿 `SessionHandle`，订阅 `session/event`、实现 `session/flush` |
| Consumer | `dsh-agent-loop`、`dsh-session-checkpoint-policy`、compaction / pruner、`dsh-agent-preset-registry` | 写 log、读 `deriveMessages`、在 waterfall 里 `flush` 后 `next()`、读 `header.agentPreset` / `agentPreset` 投影 | loop / checkpoint 是 host 行；preset 只记录 id，不 remount store |

换 persistence backend 只换 `SessionHandle` 的落盘实现。换 loop 不能绕开 surface 合同，否则 invariant 在 `llm/stream` 上 fail。preset 需要私有 Provider 时必须 `isolate`；`sessions` 不是那种私有服务。

## Sources

- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/known-event-types.ts
- packages/core/session/src/request-header.ts
- packages/core/session/src/repair.ts
- packages/core/session/src/fork.ts
- packages/core/session/src/preparation.ts
- packages/core/session/tests/session.spec.ts
- packages/core/session/tests/surface.spec.ts
- packages/core/session/tests/fork.spec.ts
- packages/core/session/tests/repair.spec.ts
- packages/core/agent-loop/src/invariant.ts
- packages/core/agent-loop/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/preset/agent-preset-registry/src/session.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/session/session-checkpoint-policy/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：turn / step 往 log 写哪些 event、`deriveMessages`、checkpoint 两个副作用落点。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`。
- [spine.turn-and-step](../../spine/turn-and-step.md)：谁在何时 `append`。
- [subsys.persistence.checkpoint](../persistence/checkpoint.md)：waterfall 里 flush 后再 `next()`。
- [subsys.persistence.session-format](../persistence/session-format.md)：`SESSION_FORMAT_VERSION = 4` 与 v0→v4 adjacent 迁盘、`liftToolResult`。
- [subsys.core.agent-loop](agent-loop.md)：factory / `ReactLoopAgent`。
- [ref.session-events](../../reference/session-events.md)：完整 `SessionEventMap` 词表。
