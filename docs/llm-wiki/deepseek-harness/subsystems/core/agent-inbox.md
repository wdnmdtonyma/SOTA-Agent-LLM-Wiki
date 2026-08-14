---
id: subsys.core.agent-inbox
title: inbox(followup/steer/inject)
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent/src/inbox.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/types.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/consumed-work.ts
  - packages/core/agent/tests/agent.spec.ts
  - packages/core/agent/tests/consumed-work.spec.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/tests/loop.spec.ts
  - packages/core/agent-loop/tests/interception.spec.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - vendor/cordis/src/events.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/bundle/headless/src/index.ts
  - packages/client/ui-conversation/src/client/conversation-nodes/inbox.ts
  - packages/client/runtime/src/client/sessions/steering-history.ts
symbols:
  - Inbox
  - followup
  - steer
  - inject
  - InboxTarget
related:
  - spine.turn-and-step
  - subsys.core.agent
  - subsys.core.agent-loop
  - spine.session-log
  - spine.overview
  - subsys.core.session
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `Inbox` 是每个 `Agent` 上两条有序待处理队列（`next-turn` / `next-step`）的**耐久投影**：`followup` / `steer` / `inject` 只改队列与是否 wake，不写模型历史；`claim` 抽走批次之后，loop 才把进入的 `UserMessage` 写成带 `surfaceOp: 'append'` 的 `user/message`。它是 Cordis 组合运行时里「人话 / 插件上下文进入 turn」的控制面，不是又一份 chat 数组。

## 能回答的问题

- `followup` / `steer` / `inject` 分别进哪条队列？谁会把 `idle` 的 driver 叫醒？
- `Inbox.splice` 为什么必须先 `session.append('agent/inbox/spliced')` 再改内存？同步 `session/event` 观察者看见的是 splice 前还是 splice 后？
- `Inbox.claim(target, turn)` 一次拿走什么？第一拍 `next-turn` 和后续 `next-step` 差在哪？
- inbox 变更为什么不是模型可见历史？claim 之后怎样才变成 `user/message`？
- resume / fork 时为什么要跳过 `header.seedLength` 前缀再重放 `agent/inbox/spliced`？重复 `MessageId` 会被怎样拒绝？
- idle 上一次 `inject` 为什么只 park？idle 上的 `steer` / `followup` 为什么立刻开 turn？

## 职责边界

`@deepseek-ai/dsh-agent` 拥有 `Inbox` 类、`InboxTarget`、以及 `SessionEventMap['agent/inbox/spliced']` 这条耐久词汇。包入口把 `inbox.ts` 再导出。 [E: packages/core/agent/src/index.ts:20] 合同方法 `Agent.followup` / `Agent.steer` / `Agent.inject` / `Agent.send` 写在 `runtime-types.ts`；默认驱动 `ReactLoopAgent` 把三入口映射成「队列 + wakeup」。 [E: packages/core/agent-loop/src/agent.ts:123] [E: packages/core/agent-loop/src/agent.ts:127] [E: packages/core/agent-loop/src/agent.ts:131]

本页**不**拥有：

- `ctx.agents` 工厂槽、`setFactory`、initiator 归因：交给 [`subsys.core.agent`](agent.md)。
- `ReactLoopAgent.turn` / `step`、`agent/request`、工具并行上限：交给 [`subsys.core.agent-loop`](agent-loop.md) 与 [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- `deriveMessages()`、`SurfaceOp`、compaction `replace`：交给 [`spine.session-log`](../../spine/session-log.md) / [`subsys.core.session`](session.md)。
- `ctx.*` 服务的 isolate / `leakedServices` 审计：`Inbox` 不是 published service；preset 行泄漏进 root realm 的门在 [`subsys.composition.agent-presets`](../composition/agent-presets.md)。

**host 面**创建 / 恢复 `Agent`，再把人话推进 inbox（Web `apiproxy` 的 `followup`/`steer`，headless 的一次性 `followup`）。**agent-preset 面**挂在这份 `Agent.ctx` 上：插件 `inject` / `steer`、tools / persona / isolate 随会话卸载。inbox 本身是 handle 上的字段，不是进程级 `ctx.inbox`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent/src/inbox.ts` | `Inbox`：两条队列、`splice` / `claim` / 重放、`MessageId` 去重 |
| `packages/core/agent/src/types.ts` | `InboxTarget`；把 `agent/inbox/spliced` 合进 `SessionEventMap` |
| `packages/core/agent/src/runtime-types.ts` | `Agent.inbox` 与 `followup` / `steer` / `inject` / `send` 合同；`agent/inbox/*` 实时事件 |
| `packages/core/agent/src/dispatch.ts` | `agentEvents`：把 `agent/*` waterfall / emit 绑到该 Agent 的 `scopeTarget` |
| `packages/core/agent/src/consumed-work.ts` | `foldConsumedWork`：`canceled && inserted.length === 0` 才是 unrun drop；有 `removedCount` 但非 canceled 才是 claim |
| `packages/core/agent-loop/src/agent.ts` | `ReactLoopAgent`：构造 `Inbox`、三入口映射、`preStep` 里 `claim`、claim 后写 `user/message` |
| `packages/core/agent-loop/src/tool-calls.ts` | 工具 `additionalContexts` 经 `acceptContext` 再 `splice('next-step', …)` |
| `packages/host/apiproxy/src/api-proxy.ts` | host 人话入口；`session/queue` 从 live 列表 + 当前 spliced 重建；`updateQueue` 走 `inbox.replace` / `inbox.remove` |
| `packages/client/ui-conversation/src/client/conversation-nodes/inbox.ts` | 浏览器半边按 spliced 折叠 `pending` / `claimed` |

## 数据模型

`Inbox` 私有状态是 `Record<InboxTarget, UserMessage[]>`，两条键一开始就是空数组。 [E: packages/core/agent/src/inbox.ts:26]

| 符号 | 形状 | 含义 |
|---|---|---|
| `InboxTarget` | `'next-turn' \| 'next-step'` | 两条有序 pending 列表的名字 [E: packages/core/agent/src/types.ts:10] |
| `agent/inbox/spliced` | `{ target, start, removedCount?, inserted, outcome? }` | 一次归一化突变；`outcome: 'canceled'` 只在 `discardRemoved && actualDeleteCount > 0` 时写入（`replace` / `remove` / `clear` 都会带；`claim` 的 `discardRemoved === false` 不带） [E: packages/core/agent/src/types.ts:19] [E: packages/core/agent/src/inbox.ts:177] |
| `UserMessage.id` | `MessageId` | pending 期内跨**两条**队列都必须唯一；重复抛 `message "<id>" is already pending` [E: packages/core/agent/src/inbox.ts:216] |
| `hasPending` | 任一条非空 | kick / 收敛重放 wake 用它判断还有没有活 [E: packages/core/agent/src/inbox.ts:54] |

三入口是**队列 + 是否 wake**，不是三种 transcript 类型：

| 入口 | `send(message, target, wakeup)` | idle 时 | running 时 |
|---|---|---|---|
| `followup` | `'next-turn'`, `true` [E: packages/core/agent-loop/src/agent.ts:123] | 立刻 `wakeDriver`，独占自己的 turn | 下一条 `next-turn`，当前 turn 结束后 `kick` 再开一轮 |
| `steer` | `'next-step'`, `true` [E: packages/core/agent-loop/src/agent.ts:127] | 立刻开 turn（测试在 `steer` 返回后就能读到 `status === 'running'` 且已有 `turn/start`） [E: packages/core/agent-loop/tests/loop.spec.ts:593] [E: packages/core/agent-loop/tests/loop.spec.ts:594] [E: packages/core/agent-loop/tests/loop.spec.ts:595] | 下一拍 `claim('next-step')` 一起抽走 |
| `inject` | `'next-step'`, `false` [E: packages/core/agent-loop/src/agent.ts:131] | 只留下 `agent/inbox/spliced`，`status` 仍是 `idle`，0 次模型调用 [E: packages/core/agent-loop/tests/loop.spec.ts:645] [E: packages/core/agent-loop/tests/loop.spec.ts:646] [E: packages/core/agent-loop/tests/loop.spec.ts:648] | 下一拍 `next-step`；赶不上已经 `claim` 过的那一拍 |

`source.kind`（`user` / `plugin`）才区分人话和插件上下文。claim 之后一律变成 `user/message`。`agent/inbox/spliced` **不是** `SurfaceEventType`：表面只有 `user/message` / `assistant/message` / `tool/result`。 [E: packages/core/session/src/types.ts:343] [E: packages/core/session/src/types.ts:344]

实时通知（Cordis `emit`，不进 session log）是逐条的：`agent/inbox/inserted`、`agent/inbox/claimed`、`agent/inbox/discarded`。`ReactLoopAgent` 构造时把它们接到 `agentEvents`。 [E: packages/core/agent-loop/src/agent.ts:87] [E: packages/core/agent-loop/src/agent.ts:88]

## 控制流

1. **构造 / 重放。** `ReactLoopAgent` 对每个 session 铸一份 `Inbox`。构造函数从 `session.events.slice(session.header.seedLength ?? 0)` 扫描，只把 `agent/inbox/spliced` 交给 `apply`。 [E: packages/core/agent/src/inbox.ts:32] [E: packages/core/agent/src/inbox.ts:33] fork / seed 把父日志前缀拷进子 session，并在 header 记下 `seedLength`；子 inbox **不得**把父队列重放成自己的 pending。非法坐标或重放期撞 `MessageId` 包成 `invalid persisted inbox splice at session seq N`。 [E: packages/core/agent/src/inbox.ts:37] [E: packages/core/agent/tests/agent.spec.ts:51]

2. **host / 插件投递。** 合同三入口 `followup` / `steer` / `inject` 都进 `ReactLoopAgent.send`，再 `Inbox.splice` 追加一条。 [E: packages/core/agent-loop/src/agent.ts:123] [E: packages/core/agent-loop/src/agent.ts:127] [E: packages/core/agent-loop/src/agent.ts:131] [E: packages/core/agent-loop/src/agent.ts:118] 这不是唯一写队列的路：工具 `additionalContexts` 经 `acceptContext` 直接 `this.inbox.splice('next-step', this.inbox.nextStep.length, 0, [context])`，不经过 `send`。 [E: packages/core/agent-loop/src/agent.ts:397] [E: packages/core/agent-loop/src/tool-calls.ts:156] host `updateQueue` 的 edit 走 `inbox.replace`；remove / 把 queued 提升为 steer 走 `inbox.remove`（后者再 `agent.steer`）。 [E: packages/host/apiproxy/src/api-proxy.ts:2610] [E: packages/host/apiproxy/src/api-proxy.ts:2612] [E: packages/host/apiproxy/src/api-proxy.ts:2613] Web 工作台新人话：`mode === 'steer'` 调 `agent.steer`，否则 `agent.followup`。 [E: packages/host/apiproxy/src/api-proxy.ts:2498] [E: packages/host/apiproxy/src/api-proxy.ts:2499] headless 一次性任务在 `agents.create` 之后 `agent.followup(...)`。 [E: packages/bundle/headless/src/index.ts:122] 文件变更、指令、插件上下文走 `inject`。

3. **splice 先写 log。** `mutate` 先 `validate`，再 `session.append('agent/inbox/spliced', splice)`，**然后**才 `inbox.splice(...)` 改内存投影。 [E: packages/core/agent/src/inbox.ts:185] [E: packages/core/agent/src/inbox.ts:186] [E: packages/core/agent/src/inbox.ts:187] 同步 `session/event` 观察者因此看见 **pre-splice** 列表，要用事件里的 `start` / `removedCount` / `inserted` 自己还原被删的消息。`append` 对 `data` 做 lossless JSON 快照：非 JSON（例如 `source` 上的 `bigint`）在入口被拒。 [E: packages/core/session/src/index.ts:614] [E: packages/core/session/src/index.ts:616] host `apiproxy` 在同一条 `session/event` 里用 `toSpliced` 把当前 spliced **叠回** live 列表，再广播权威 `session/queue`。 [E: packages/host/apiproxy/src/api-proxy.ts:1334] [E: packages/host/apiproxy/src/api-proxy.ts:1351] [E: packages/host/apiproxy/src/api-proxy.ts:1354]

4. **wakeup。** `wakeup === true` 且 `phase === idle` 时，`wakeDriver` **不看** inbox 是否还剩消息：同步把相位切到 `running`，再 `withInitiator(this, () => this.kick())`。 [E: packages/core/agent-loop/src/agent.ts:185] [E: packages/core/agent-loop/src/agent.ts:186] [E: packages/core/agent-loop/src/agent.ts:192] 已在跑的 live driver 自己在 step/turn 边界取队列，不 latch。非 idle 时只有 `phase.kind === 'maintenance'` 或 `wakeAfterAbort`（且 abort reason 不是 `disposed`）才 latch `wakeRequested`。 [E: packages/core/agent-loop/src/agent.ts:178] maintenance 重放只在 `runMaintenance` 的 `finally`：回到 idle 后若 `maintenance.wakeRequested && this.inbox.hasPending` 再 `wakeDriver()`。 [E: packages/core/agent-loop/src/agent.ts:158] abort 后的重放在 `kick` 的 `finally`：running 相位收回 idle 后再看同一对 `wakeRequested && inbox.hasPending`。 [E: packages/core/agent-loop/src/agent.ts:220] 若当前活动已 abort 且这次是 waking 投递，`send` 在 splice **之前**把 target 改写成 `next-turn`，避免新意图并进已取消的活动。 [E: packages/core/agent-loop/src/agent.ts:116] [E: packages/core/agent-loop/src/agent.ts:117]

5. **turn 打开后 claim。** `ReactLoopAgent.turn` 先 `session.append('turn/start')`，第一拍 `target = 'next-turn'`，后续 step 改成 `'next-step'`。 [E: packages/core/agent-loop/src/agent.ts:255] [E: packages/core/agent-loop/src/agent.ts:261] [E: packages/core/agent-loop/src/agent.ts:300] `Inbox.claim` 同步抽走 **全部** `next-step`；若 `target === 'next-turn'` 再额外抽 **一条** `next-turn`。耐久 splice 是纯删除（`inserted: []`，`discardRemoved === false`，因此没有 `outcome: 'canceled'`），再按条发 `agent/inbox/claimed`。 [E: packages/core/agent/src/inbox.ts:72] [E: packages/core/agent/src/inbox.ts:73] [E: packages/core/agent/src/inbox.ts:74] [E: packages/core/agent/src/inbox.ts:76] 返回顺序是 next-step 在前、那条 next-turn 在后。所以：一条 `followup` 独占自己的 turn；idle 时堆在 `next-step` 的 `inject`/`steer` 会和该 turn 的第一条 `next-turn` 一起进第一拍。

6. **waterfall：`agent/pre-step` 必须 `next()`。** claim **已经**发生。loop 把 claimed 批次送进 `agent/pre-step` waterfall；默认 `next()` 返回 `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }`。 [E: packages/core/agent-loop/src/agent.ts:234] [E: packages/core/agent-loop/src/agent.ts:236] [E: packages/core/agent-loop/src/agent.ts:238] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `shift` 到下一层（含默认 enter）；不调用就停在本层，下游 listener 与内置行为都被 veto。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] 监听者可以 `reject`，或改写 `messages`。`reject` 让本 turn `turnEnds = { kind: 'blocked' }`：不写 `step/start`，也不把已 claim 的消息写回 inbox 或记成 `user/message`。 [E: packages/core/agent-loop/src/agent.ts:267] [E: packages/core/agent-loop/src/agent.ts:268] 测试：`reject` 后模型 0 次调用，log 没有 `user/message` / `step/start`，reason 为 `{ kind: 'blocked' }`。 [E: packages/core/agent-loop/tests/interception.spec.ts:239] [E: packages/core/agent-loop/tests/interception.spec.ts:252] [E: packages/core/agent-loop/tests/interception.spec.ts:253] [E: packages/core/agent-loop/tests/interception.spec.ts:254] 第一拍 `enter` 但 `messages.length === 0`（idle wake 后消息被清、或 waterfall 改写成空）记 `completed`，0 个 step。 [E: packages/core/agent-loop/src/agent.ts:274] [E: packages/core/agent-loop/src/agent.ts:275]

7. **claim → 模型可见。** `enter` 之后才 `session.append('step/start')`，再对 `decision.messages` 逐条 `session.append('user/message', message, { surfaceOp: 'append' })`。 [E: packages/core/agent-loop/src/agent.ts:279] [E: packages/core/agent-loop/src/agent.ts:283] 这是 inbox 内容第一次变成 **模型可见** 的 user 历史。`deriveMessages()` 只折叠 surface；`agent/inbox/spliced` 留在 append-only log，不进请求。简单一路的耐久顺序是 `agent/inbox/spliced` 先于 `turn/start`。 [E: packages/core/agent-loop/tests/loop.spec.ts:184]

8. **工具上下文回到 next-step。** `executeToolCalls` 的 `acceptContext` 在 `ReactLoopAgent` 里是 `this.inbox.splice('next-step', this.inbox.nextStep.length, 0, [context])`。 [E: packages/core/agent-loop/src/agent.ts:397] 插件在 tool body 里 `inject` 同样进 `next-step`；这些 `user/message` 排在本拍 `tool/result` **之后**，避免拆开 assistant tool-call 与 tool-result。 [E: packages/core/agent-loop/tests/loop.spec.ts:712] [E: packages/core/agent-loop/tests/loop.spec.ts:721]

9. **turn 停不停看数据。** 已有 `turnEnds` 且 `inbox.nextStep` 空时，先 `serial('agent/turn-stopping')`，再读一次 inbox。 [E: packages/core/agent-loop/src/agent.ts:295] [E: packages/core/agent-loop/src/agent.ts:296] 监听者在这里 `steer(...)` 就能再开一个 step（`/loop` 测试连打 3 步）。 [E: packages/core/agent-loop/tests/loop.spec.ts:777] [E: packages/core/agent-loop/tests/loop.spec.ts:779] [E: packages/core/agent-loop/tests/loop.spec.ts:785] `agent/turn-stopping` 是 **serial**，不是 waterfall：listener 顺序改不了「inbox 空不空」这个判决。同一次 `kick` 若还有下一条 `next-turn`，`turn()` 换新 `AbortController` 并 `return true`，不回 `idle`。

10. **isolate / leakedServices。** `Inbox` 不是 `ctx` 上的 published service，preset 行也没有 `isolate: { inbox: true }`。`mountPreset` 在 standing 子树 settle 之后跑 `leakedServices(agentCtx, fiber)`：谁把实现写进 **root realm** 的 symbol，名字就被点出来，整次 mount 失败。 [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:364] [E: packages/preset/agent-presets/src/mount.ts:365] 需要私有实例的 preset 服务必须 `isolate: { …: true }`，或把服务搬到 host 组合。inbox 的隔离是另一条轴：`agentEvents` 用 `scopeTarget(agent, agent)` 做 thisArg，`agent/inbox/*` 与 `agent/pre-step` 都按 Agent scope 过滤，别的会话听不见。 [E: packages/core/agent/src/dispatch.ts:95] [E: packages/core/agent/src/dispatch.ts:146] 在 `Agent.ctx` 上 `inject` / `steer` 的插件坐在这份 scoped 世界里；它们不能靠「往 root `provide` 一个 inbox 服务」跨会话投递。

11. **取消。** `cancel` 默认 `inbox.clear()`：先清 `next-step` 再清 `next-turn`，两条都带 `outcome: 'canceled'`，并 `discarded`。 [E: packages/core/agent/src/inbox.ts:58] [E: packages/core/agent/src/inbox.ts:59] [E: packages/core/agent/src/inbox.ts:60] [E: packages/core/agent-loop/src/agent.ts:135] [E: packages/core/agent-loop/src/agent.ts:136] `keepInbox: true` 只 abort 当前活动、不写 canceled splice。`foldConsumedWork` 先要求 spliced 带 `removedCount`；`droppedUnrun` 只在 `outcome === 'canceled'` **且** `inserted.length === 0` 时置位（`clear` / `remove` 这种纯删除）。 [E: packages/core/agent/src/consumed-work.ts:84] [E: packages/core/agent/src/consumed-work.ts:87] `replace` 同样 `discardRemoved === true`，耐久事件也会带 `outcome: 'canceled'`，但 `inserted` 非空，工作只是换了身份继续 pending，不算 unrun drop。 [E: packages/core/agent/src/inbox.ts:112] [E: packages/core/agent/src/inbox.ts:177] [E: packages/core/agent/tests/consumed-work.spec.ts:146] 有 `removedCount` 但 `outcome` 不是 `canceled`、且当前有 open turn，才记成 turn 内的 claim。 [E: packages/core/agent/src/consumed-work.ts:89]

12. **UI 从 splices 重建。** 浏览器 `nextTurnInboxDefinition` / `nextStepInboxDefinition` 只 match `agent/inbox/spliced`，按同一套 `start` / `removedCount` / `inserted` 叠 `pending`；`next-step` 上非 `canceled` 的删除把 id 记进 `claimed`，用来把随后的 `user/message` 标成 steering。 [E: packages/client/ui-conversation/src/client/conversation-nodes/inbox.ts:33] [E: packages/client/ui-conversation/src/client/conversation-nodes/inbox.ts:43] [E: packages/client/ui-conversation/src/client/conversation-nodes/inbox.ts:49] host `session/queue` 把 `next-turn` 标 `queued`，把 `next-step` 里 `source.kind === 'user'` 标 `steering`、其余标 `context`（领取前不当人话气泡）。 [E: packages/host/apiproxy/src/api-proxy.ts:1338] [E: packages/host/apiproxy/src/api-proxy.ts:1344]

## 设计动机

DSH 把「还没进模型的意图」和「已经进 `deriveMessages()` 的历史」切开。Peer harness 常见做法是直接往内存 `messages` 里 push 一条 user，再事后写盘；这里 inbox 变更必须先成为 `agent/inbox/spliced`，claim 之后才允许 `user/message`。这就是 **model-visible ⟺ logged** 在入口侧的形状：模型下一拍看见的每一条 user，都能从当时 log 前缀重建；还停在队列里的 followup / steer / inject 对 adapter 不可见。

三条入口而不是三种 event type，是为了让 **wake** 和 **边界** 正交：同一条 `UserMessage` 既可以排队等下一 turn，也可以插进正在跑的 turn 的下一 step，也可以只 park 等别人叫醒。Web 工作台和 headless runner 都只依赖 `Agent` 合同，不 import `Inbox` 实现。换 loop = 换一个占 `setFactory` 槽的插件；新 loop 仍应消费同一份 `Inbox` 投影，而不是另造一套内存队列。

`seedLength` 跳过是 fork 合同：子 session 继承父 transcript，但不继承父当时还没 claim 的 inbox。`MessageId` 跨队列唯一，是为了让 `replace` / `remove` / `session.updateQueue` 用一个 id 寻址，不必先问「在哪条列表」。

## Gotcha

- **claim 不可逆。** `claim` 是 loop 的 step-boundary 操作，不是插件扩展点。`reject` 丢掉已 claim 的批次：不回队列、不上 surface。claim **之后**再 `inject`/`steer` 的消息仍 pending，等下一拍或下一次 wake。
- **重复 `MessageId` 在 validate 就被拒。** `append` 一条已经在另一条队列里的消息抛 `message "<id>" is already pending`。 [E: packages/core/agent/tests/agent.spec.ts:112] `replace` 换成别人正在 pending 的 id 同样抛。 [E: packages/core/agent/tests/agent.spec.ts:93]
- **idle wake 不看队列是否为空。** idle 上一次 `followup`/`steer` 即使消息随后被 `remove`，仍会打开 `turn/start`；第一拍空 claim 以 `completed`、0 个 step 结束。maintenance `finally` 与 abort 后的 `kick` `finally` 相反：都要求 `wakeRequested && inbox.hasPending`，队列空则吞掉 latch。 [E: packages/core/agent-loop/src/agent.ts:158] [E: packages/core/agent-loop/src/agent.ts:220]
- **`canceled` ≠ unrun drop。** `replace` 写下 `outcome: 'canceled'` 但 `inserted` 非空；`foldConsumedWork` 不把它算成 `droppedUnrun`。 [E: packages/core/agent/src/consumed-work.ts:87] [E: packages/core/agent/tests/consumed-work.spec.ts:146]
- **splice 观察者看见旧列表。** 在 `session/event` 里读 `agent.inbox.nextTurn` 得到的是 **还没 splice** 的投影。host 必须用事件坐标自己叠。同一轮 `append` 尚未结束时再 `send` 会撞上 `session append cannot reenter while another append is being published`，嵌套投递被吞掉，外层那条才进 turn。 [E: packages/core/session/src/index.ts:625] [E: packages/core/agent-loop/tests/loop.spec.ts:1272]
- **`clear` 的空操作不写 log。** `mutate` 在 `actualDeleteCount === 0 && inserted.length === 0` 时直接返回；已经空的 inbox 再 `clear()` 不会追加 spliced。 [E: packages/core/agent/src/inbox.ts:176] [E: packages/core/agent/tests/agent.spec.ts:141]
- **waterfall 不 `next()` = 换掉整条链。** `agent/pre-step` 监听器若直接 `return { kind: 'reject' }`，默认 enter 不会跑。要包装下游批次必须 `const decision = await next()`。
- **`Inbox` 不会被 `leakedServices` 扫到。** 它不是 root realm 里的 service 名。preset 泄漏审计管的是 `ctx.tools` / 其它 published 键；别把「inbox 跨会话」误写成 isolate 配置问题。

## Seam 三角

| 角色 | 落点 | ctx / 组合 |
|---|---|---|
| Definition | `@deepseek-ai/dsh-agent`：`Inbox`、`InboxTarget`、`Agent.followup`/`steer`/`inject`/`send`；`SessionEventMap['agent/inbox/spliced']`；`agent/inbox/*` 与 `agent/pre-step` 事件 | **不是** `ctx.inbox`。合同在 `dsh-agent`；session 词汇合进 `dsh-session` |
| Provider | 默认 `ReactLoopAgent`（`dsh-agent-loop`）构造 `Inbox` 并映射三入口；`dsh-base` 的 `agent-loop` 行以 `setFactory` 占全局工厂槽 | host 面：工厂与 loop 插件是进程级。每个 Agent 一份 inbox 投影，跟 session 同寿命 |
| Consumer | host `apiproxy`（人话 `followup`/`steer`、`session/queue`、`updateQueue` → `replace`/`remove`/`steer`）；headless runner `followup`；preset 世界里的插件 `inject`/`steer`；client conversation / `SteeringHistory` 重放 spliced；`foldConsumedWork` | agent-preset 面的 listener 挂在 `Agent.ctx`。preset 服务若 publish 进 root，`leakedServices` 拒绝；inbox 投递走 handle，不走 isolate realm |

## Sources

- packages/core/agent/src/inbox.ts
- packages/core/agent/src/index.ts
- packages/core/agent/src/types.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/consumed-work.ts
- packages/core/agent/tests/agent.spec.ts
- packages/core/agent/tests/consumed-work.spec.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/tests/loop.spec.ts
- packages/core/agent-loop/tests/interception.spec.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- vendor/cordis/src/events.ts
- packages/preset/agent-presets/src/mount.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/bundle/headless/src/index.ts
- packages/client/ui-conversation/src/client/conversation-nodes/inbox.ts
- packages/client/runtime/src/client/sessions/steering-history.ts

## 相关

- [`spine.turn-and-step`](../../spine/turn-and-step.md) — 从 inbox 投递到 `turn` / `step` / `agent/request` 的端到端驱动。
- [`subsys.core.agent`](agent.md) — `Agent` 合同、`ctx.agents` 注册表与工厂槽；inbox 三入口的映射在本页。
- [`subsys.core.agent-loop`](agent-loop.md) — 默认 `ReactLoopAgent` 工厂、`Phase`、回滚与 `agents: []`。
- [`spine.session-log`](../../spine/session-log.md) — `deriveMessages()` 只投影 surface；`agent/inbox/spliced` 是 log-only。
- [`spine.overview`](../../spine/overview.md) — host 面 / agent-preset 面与 `profile → bundle → preset` 全仓地图。
- [`subsys.core.session`](session.md) — append-only log、`SurfaceOp`、`deriveMessages()`。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `mountPreset` / `leakedServices` / isolate 审计。
