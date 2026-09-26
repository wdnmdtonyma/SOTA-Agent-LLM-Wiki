---
id: subsys.core.agent-inbox
title: inbox(followup/steer/inject)
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent-loop/src/inbox.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/tests/inbox.spec.ts
  - packages/core/agent-loop/tests/loop.spec.ts
  - packages/core/agent-loop/tests/interception.spec.ts
  - packages/core/agent/src/types.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/consumed-work.ts
  - packages/core/agent/tests/consumed-work.spec.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/session/session-projection/src/index.ts
  - vendor/cordis/src/events.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/api/session-controller/src/commands.ts
  - packages/bundle/headless/src/index.ts
  - packages/client/ui-chat/src/client/conversation-nodes/inbox.ts
  - packages/client/ui-chat/src/client/conversation-nodes/message.ts
  - packages/webhook/webhook/src/session.ts
symbols:
  - ReactLoopInbox
  - inboxProjectionDefinition
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
updated: 477b4f4205
---

> `ReactLoopInbox` 是默认驱动拥有的**耐久 inbox 投影**：两条有序待处理队列（`next-turn` / `next-step`）的权威状态在 session-projection 键 `'inbox'` 上，不在私有 `Record` 里。`followup` / `steer` / `inject` 只改队列与是否 wake，不写模型历史；`claim` 抽走批次之后，loop 才把进入的 `UserMessage` 写成带 `surfaceOp: 'append'` 的 `user/message`。实现在 `packages/core/agent-loop/src/inbox.ts`，**不**在已删除的 `packages/core/agent/src/inbox.ts`。投影登记在 `AgentLoop` 构造里，inbox 实例自己不 `register`。

## 能回答的问题

- `followup` / `steer` / `inject` 分别进哪条队列？谁会把 `idle` 的 driver 叫醒？
- `ReactLoopInbox.mutate` 为什么先 `session.append('agent/inbox/spliced')`？投影何时更新？`session/event` 观察者看见的是 splice 前还是 splice 后？
- `claim(target, turn)` 一次拿走什么？它为什么不在公开 `Inbox` 合同上？
- inbox 变更为什么不是模型可见历史？claim 之后怎样才变成 `user/message`？
- fork 出的子 session 会不会继承父当时还没 claim 的 pending？非法 splice 重放抛哪句？
- idle 上一次 `inject` 为什么只 park？idle 上的 `steer` / `followup` 为什么立刻开 turn？

## 职责边界

`@deepseek-ai/dsh-agent` 拥有合同：`Inbox` 接口、`InboxTarget` / `InboxState` / `InboxWireState`、以及 `SessionEventMap['agent/inbox/spliced']`。包入口不再导出一份 inbox 实现类。 [E: packages/core/agent/src/runtime-types.ts:48] [E: packages/core/agent/src/types.ts:39] [E: packages/core/agent/src/types.ts:96]

默认驱动 `@deepseek-ai/dsh-agent-loop` 拥有实现：`inboxProjectionDefinition`（fold 键 `'inbox'`）与 `ReactLoopInbox implements Inbox`。`AgentLoop` 构造立刻 `sessionProjections.register(inboxProjectionDefinition)`；`ReactLoopAgent` 再 `new ReactLoopInbox(this.ctx.sessionProjections, session, this.dispatch)`，并把合同三入口映射成「队列 + wakeup」。inbox 实例**不**自己登记投影——测试钉死「reads the shared projection without owning its registration」。 [E: packages/core/agent-loop/src/inbox.ts:27] [E: packages/core/agent-loop/src/inbox.ts:74] [E: packages/core/agent-loop/src/index.ts:365] [E: packages/core/agent-loop/src/agent.ts:132] [E: packages/core/agent-loop/src/agent.ts:163] [E: packages/core/agent-loop/tests/inbox.spec.ts:83]

本页**不**拥有：

- `ctx.agents` 工厂槽、`setFactory`、initiator 归因：交给 [`subsys.core.agent`](agent.md)。
- `ReactLoopAgent.turn` / `step`、`agent/request`、工具并行上限：交给 [`subsys.core.agent-loop`](agent-loop.md) 与 [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- `deriveMessages()`、`SurfaceOp`、compaction `replace`：交给 [`spine.session-log`](../../spine/session-log.md) / [`subsys.core.session`](session.md)。
- `ctx.*` 服务的 isolate / `leakedServices` 审计：`Inbox` 不是 published service；preset 行泄漏进 root realm 的门在 [`subsys.composition.agent-presets`](../composition/agent-presets.md)。

**host 面**创建 / 恢复 `Agent`，再把人话推进 inbox（Session Controller `prompt` 的 `followup`/`steer`、headless / webhook 的 `followup`）。**agent-preset 面**挂在这份 `Agent.ctx` 上。inbox 本身是 handle 上的字段，不是进程级 `ctx.inbox`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent-loop/src/inbox.ts` | `ReactLoopInbox` + `inboxProjectionDefinition`：投影 fold、`splice` / `claim` / 去重 |
| `packages/core/agent-loop/src/index.ts` | `AgentLoop` 构造登记 `'inbox'` 投影 |
| `packages/core/agent/src/types.ts` | `InboxTarget` / `InboxState`；把 `agent/inbox/spliced` 合进 `SessionEventMap` |
| `packages/core/agent/src/runtime-types.ts` | 公开 `Inbox` 合同（无 `claim` / `hasPending`）；`Agent.followup` / `steer` / `inject` / `send`；`agent/inbox/*` 实时事件 |
| `packages/core/agent/src/dispatch.ts` | `agentEvents`：把 `agent/*` 绑到该 Agent 的 `scopeTarget` |
| `packages/core/agent/src/consumed-work.ts` | `foldConsumedWork`：`canceled && inserted.length === 0` 才是 unrun drop |
| `packages/core/agent-loop/src/agent.ts` | `ReactLoopAgent`：构造 `ReactLoopInbox`、三入口映射、`preStep` 里 `claim`、claim 后写 `user/message` |
| `packages/core/agent-loop/src/tool-calls.ts` | 工具 `additionalContexts` 经 `acceptContext` 再 `splice('next-step', …)` |
| `packages/core/agent-loop/tests/inbox.spec.ts` | 投影登记、非法重放、fork 继承、观察者看见提交后投影 |
| `packages/api/session-controller/src/commands.ts` | host 人话入口：`prompt` 的 `steer`/`followup`；`updateQueue` 走 `inbox.replace` / `inbox.remove` |
| `packages/client/ui-chat/src/client/conversation-nodes/inbox.ts` | 浏览器登记 `inbox-next-step` 与 `inbox-next-turn` |

## 数据模型

权威状态是 projection 键 `'inbox'`：`InboxState = { 'next-turn': UserMessage[]; 'next-step': UserMessage[] }`。`inboxProjectionDefinition.init` 给出两条空数组；`apply` 只认 `agent/inbox/spliced`。 [E: packages/core/agent-loop/src/inbox.ts:28] [E: packages/core/agent-loop/src/inbox.ts:30] [E: packages/core/agent/src/types.ts:42]

| 符号 | 形状 | 含义 |
|---|---|---|
| `InboxTarget` | `'next-turn' \| 'next-step'` | 两条有序 pending 列表的名字 [E: packages/core/agent/src/types.ts:39] |
| `agent/inbox/spliced` | `{ target, start, removedCount?, inserted, outcome? }` | 一次归一化突变。投影在 `Session.append()` **返回前**应用；live 通知在 commit 之后。 [E: packages/core/agent/src/types.ts:96] [E: packages/session/session-projection/src/index.ts:220] |
| `UserMessage.id` | `MessageId` | pending 期内跨**两条**队列都必须唯一；重复抛 `message "<id>" is already pending` [E: packages/core/agent-loop/src/inbox.ts:47] [E: packages/core/agent-loop/src/inbox.ts:223] |
| `hasPending` | 任一条非空 | `ReactLoopInbox` 私有读取；公开 `Inbox` 合同没有这个 getter [E: packages/core/agent-loop/src/inbox.ts:92] |
| `claim` | loop 内部 | 同样只在 `ReactLoopInbox` 上；公开合同只有 `clear` / `append` / `prepend` / `replace` / `remove` / `splice` [E: packages/core/agent-loop/src/inbox.ts:109] [E: packages/core/agent/src/runtime-types.ts:48] |

`outcome: 'canceled'` 只在 `discardRemoved && actualDeleteCount > 0` 时写入（`replace` / `remove` / `clear` 的 `splice` 路径 `discardRemoved === true`；`claim` 的 `mutate(..., false)` 不带）。 [E: packages/core/agent-loop/src/inbox.ts:226] [E: packages/core/agent-loop/src/inbox.ts:110]

三入口是**队列 + 是否 wake**，不是三种 transcript 类型：

| 入口 | `send(message, target, wakeup)` | idle 时 | running 时 |
|---|---|---|---|
| `followup` | `'next-turn'`, `true` [E: packages/core/agent-loop/src/agent.ts:163] | 立刻 `wakeDriver`，独占自己的 turn | 下一条 `next-turn`，当前 turn 结束后 `kick` 再开一轮 |
| `steer` | `'next-step'`, `true` [E: packages/core/agent-loop/src/agent.ts:167] | 立刻开 turn（`steer` 返回后 `status === 'running'` 且已有 `turn/start`） [E: packages/core/agent-loop/tests/loop.spec.ts:914] [E: packages/core/agent-loop/tests/loop.spec.ts:915] [E: packages/core/agent-loop/tests/loop.spec.ts:916] | 下一拍 `claim('next-step')` 一起抽走 |
| `inject` | `'next-step'`, `false` [E: packages/core/agent-loop/src/agent.ts:171] | 只留下 `agent/inbox/spliced`，`status` 仍是 `idle`，0 次模型调用 [E: packages/core/agent-loop/tests/loop.spec.ts:966] [E: packages/core/agent-loop/tests/loop.spec.ts:967] [E: packages/core/agent-loop/tests/loop.spec.ts:969] | 下一拍 `next-step`；赶不上已经 `claim` 过的那一拍 |

`source.kind`（`user` / `plugin` / `webhook` 等）才区分人话和插件上下文。claim 之后一律变成 `user/message`。`agent/inbox/spliced` **不是** `SurfaceEventType`：表面是 `system/message` / `developer/message` / `user/message` / `assistant/message` / `tool/result`。v4 里 `tool/result` 进模型是 `role: 'tool'`。 [E: packages/core/session/src/types.ts:439] [E: packages/core/session/src/types.ts:440] [E: packages/core/session/src/types.ts:444] [E: packages/core/session/src/types.ts:89]

实时通知（Cordis `emit`，不进 session log）是逐条的：`agent/inbox/inserted`、`agent/inbox/claimed`、`agent/inbox/discarded`。`ReactLoopInbox` 经构造时传入的 `agentEvents` 发出。 [E: packages/core/agent/src/runtime-types.ts:288] [E: packages/core/agent/src/runtime-types.ts:299] [E: packages/core/agent/src/runtime-types.ts:307] [E: packages/core/agent-loop/src/inbox.ts:112] [E: packages/core/agent-loop/src/inbox.ts:240]

## 控制流

1. **构造 / 投影登记。** `AgentLoop` 构造登记 `inboxProjectionDefinition`。`ReactLoopInbox` 读面走 `projections.stateOf(session, 'inbox')`，不扫描 `session.events` / `ownEvents()`；投影未登记则抛 `cannot read inbox state`。同一 registry 上再构造一份 inbox 复用同一 fold，两条 `nextTurn` 读到同一批 pending。 [E: packages/core/agent-loop/src/index.ts:365] [E: packages/core/agent-loop/src/inbox.ts:187] [E: packages/core/agent-loop/tests/inbox.spec.ts:83] [E: packages/core/agent-loop/tests/inbox.spec.ts:99] 非法坐标或重放期撞 `MessageId` 包成 `invalid persisted inbox splice at session seq N`。 [E: packages/core/agent-loop/src/inbox.ts:54] [E: packages/core/agent-loop/tests/inbox.spec.ts:114]

2. **fork 继承父 pending。** 子 session 的投影会 fold 继承前缀里的 `agent/inbox/spliced`，因此子 inbox **会**看见父当时还没 claim 的消息；子再 `append` 只加在自己后面。测试钉 `child.inheritedEventCount` 等于父当时事件数，且 `childInbox.nextTurn` 等于父那条 pending。 [E: packages/core/agent-loop/tests/inbox.spec.ts:157] [E: packages/core/agent-loop/tests/inbox.spec.ts:158] 这不是旧的 `header.seedLength` 跳过合同。

3. **host / 插件投递。** 合同三入口都进 `ReactLoopAgent.send`，再 `inbox.splice`。 [E: packages/core/agent-loop/src/agent.ts:154] [E: packages/core/agent-loop/src/agent.ts:159] 这不是唯一写队列的路：工具 `additionalContexts` 经 `acceptContext` 直接 `this.inbox.splice('next-step', this.inbox.nextStep.length, 0, [context])`，不经过 `send`。 [E: packages/core/agent-loop/src/agent.ts:519] host `updateQueue` 的 edit 走 `inbox.replace`；remove / 把 queued 提升为 steer 走 `inbox.remove`（后者再 `agent.steer`）。 [E: packages/api/session-controller/src/commands.ts:482] Web 工作台新人话：`mode === 'steer'` 调 `agent.steer`，否则 `agent.followup`。 [E: packages/api/session-controller/src/commands.ts:364] [E: packages/api/session-controller/src/commands.ts:365] headless 一次性任务在 `agents.create` 之后 `agent.followup(...)`。 [E: packages/bundle/headless/src/index.ts:365] webhook runtime 同样 `handle.agent.followup`。 [E: packages/webhook/webhook/src/session.ts:153]

4. **splice 先写 log，投影在 append 返回前更新。** `mutate` 先算坐标与去重，再 `session.append('agent/inbox/spliced', splice)`，然后才 `discarded` / `inserted` emit。 [E: packages/core/agent-loop/src/inbox.ts:235] [E: packages/core/agent-loop/src/inbox.ts:236] [E: packages/core/agent-loop/src/inbox.ts:239] 同步 `session/event` 观察者读 `stateOf(..., 'inbox')` 得到的是 **已经 splice 后** 的投影，不是旧列表。测试：observer 里读到的 `next-turn` 已含刚 append 的消息。 [E: packages/core/agent-loop/tests/inbox.spec.ts:169] `actualDeleteCount === 0 && inserted.length === 0` 直接返回，不写 log。 [E: packages/core/agent-loop/src/inbox.ts:217]

5. **wakeup。** `wakeup === true` 且 `phase === idle` 时，`wakeDriver` **不看** inbox 是否还剩消息：同步把相位切到 `running`，再 `withInitiator(this, () => this.kick())`。 [E: packages/core/agent-loop/src/agent.ts:214] [E: packages/core/agent-loop/src/agent.ts:234] 已在跑的 live driver 自己在 step/turn 边界取队列，不 latch。非 idle 时只有 `phase.kind === 'maintenance'` 或 `wakeAfterAbort`（且 abort reason 不是 `disposed`）才 latch `wakeRequested`。 [E: packages/core/agent-loop/src/agent.ts:220] maintenance 重放只在 `runMaintenance` 的 `finally`：回到 idle 后若 `maintenance.wakeRequested && this.inbox.hasPending` 再 `wakeDriver()`。 [E: packages/core/agent-loop/src/agent.ts:200] abort 后的重放在 `kick` 的 `finally`：同一对条件。 [E: packages/core/agent-loop/src/agent.ts:262] 若当前活动已 abort 且这次是 waking 投递，`send` 在 splice **之前**把 target 改写成 `next-turn`。 [E: packages/core/agent-loop/src/agent.ts:157] [E: packages/core/agent-loop/src/agent.ts:158]

6. **turn 打开后 claim。** `ReactLoopAgent.turn` 先 `session.append('turn/start')`，第一拍 `target = 'next-turn'`，后续 step 改成 `'next-step'`。 [E: packages/core/agent-loop/src/agent.ts:305] [E: packages/core/agent-loop/src/agent.ts:311] [E: packages/core/agent-loop/src/agent.ts:347] `ReactLoopInbox.claim` 同步抽走 **全部** `next-step`；若 `target === 'next-turn'` 再额外抽 **一条** `next-turn`。耐久 splice 是纯删除（`inserted: []`，`discardRemoved === false`），再按条发 `agent/inbox/claimed`。 [E: packages/core/agent-loop/src/inbox.ts:110] [E: packages/core/agent-loop/src/inbox.ts:111] [E: packages/core/agent-loop/src/inbox.ts:112] 返回顺序是 next-step 在前、那条 next-turn 在后。所以：一条 `followup` 独占自己的 turn；idle 时堆在 `next-step` 的 `inject`/`steer` 会和该 turn 的第一条 `next-turn` 一起进第一拍。

7. **waterfall：`agent/pre-step` 必须 `next()`。** claim **已经**发生。loop 把 claimed 批次送进 `agent/pre-step` waterfall；默认 `next()` 返回 `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }`。 [E: packages/core/agent-loop/src/agent.ts:271] [E: packages/core/agent-loop/src/agent.ts:276] [E: packages/core/agent-loop/src/agent.ts:278] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `shift` 到下一层；不调用就停在本层。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] `reject` 让本 turn `turnEnds = { kind: 'blocked' }`：不写 `step/start`，也不把已 claim 的消息写回 inbox 或记成 `user/message`。 [E: packages/core/agent-loop/src/agent.ts:317] [E: packages/core/agent-loop/src/agent.ts:318] 测试：`reject` 后模型 0 次调用，log 没有 `user/message` / `step/start`，reason 为 `{ kind: 'blocked' }`。 [E: packages/core/agent-loop/tests/interception.spec.ts:250] [E: packages/core/agent-loop/tests/interception.spec.ts:264] [E: packages/core/agent-loop/tests/interception.spec.ts:268] [E: packages/core/agent-loop/tests/interception.spec.ts:269] 第一拍 `enter` 但 `messages.length === 0` 记 `completed`，0 个 step。 [E: packages/core/agent-loop/src/agent.ts:324] [E: packages/core/agent-loop/src/agent.ts:325]

8. **claim → 模型可见。** `enter` 之后才 `session.append('step/start')`，再在 `step` 里对 `decision.messages` 逐条 `session.append('user/message', message, { surfaceOp: 'append' })`（同一拍还会先 commit `system/message`）。 [E: packages/core/agent-loop/src/agent.ts:329] [E: packages/core/agent-loop/src/agent.ts:403] 这是 inbox 内容第一次变成 **模型可见** 的 user 历史。`deriveMessages()` 只折叠 surface；`agent/inbox/spliced` 留在 append-only log，不进请求。

9. **工具上下文回到 next-step。** `executeToolCalls` 的 `acceptContext` 在 `ReactLoopAgent` 里是 `this.inbox.splice('next-step', this.inbox.nextStep.length, 0, [context])`。 [E: packages/core/agent-loop/src/agent.ts:519] 插件在 tool body 里 `inject` 同样进 `next-step`。

10. **turn 停不停看数据。** 已有 `turnEnds` 且 `inbox.nextStep` 空时，先 `serial('agent/turn-stopping')`，再读一次 inbox。 [E: packages/core/agent-loop/src/agent.ts:342] [E: packages/core/agent-loop/src/agent.ts:343] 监听者在这里 `steer(...)` 就能再开一个 step。`agent/turn-stopping` 是 **serial**，不是 waterfall。同一次 `kick` 若还有下一条 `next-turn`，`turn()` 换新 `AbortController` 并 `return true`，不回 `idle`。 [E: packages/core/agent-loop/src/agent.ts:373] [E: packages/core/agent-loop/src/agent.ts:378]

11. **isolate / leakedServices。** `Inbox` 不是 `ctx` 上的 published service。`mountPreset` 在 standing 子树 settle 之后跑 `leakedServices`：谁把实现写进 **root realm** 的 symbol，名字就被点出来，整次 mount 失败。 [E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:267] inbox 的隔离是另一条轴：`agentEvents` 用 `scopeTarget` 做 thisArg，`agent/inbox/*` 与 `agent/pre-step` 都按 Agent scope 过滤。 [E: packages/core/agent/src/dispatch.ts:95] [E: packages/core/agent/src/dispatch.ts:146]

12. **取消。** `cancel` 默认 `inbox.clear()`：先清 `next-step` 再清 `next-turn`，两条都带 `outcome: 'canceled'`，并 `discarded`。 [E: packages/core/agent-loop/src/inbox.ts:98] [E: packages/core/agent-loop/src/inbox.ts:99] [E: packages/core/agent-loop/src/agent.ts:175] [E: packages/core/agent-loop/src/agent.ts:176] `keepInbox: true` 只 abort 当前活动、不写 canceled splice。 [E: packages/core/agent/src/runtime-types.ts:44] `foldConsumedWork` 先要求 spliced 带 `removedCount`；`droppedUnrun` 只在 `outcome === 'canceled'` **且** `inserted.length === 0` 时置位。 [E: packages/core/agent/src/consumed-work.ts:85] [E: packages/core/agent/src/consumed-work.ts:88] `replace` 同样 `discardRemoved === true`，耐久事件也会带 `outcome: 'canceled'`，但 `inserted` 非空，不算 unrun drop。

13. **UI 从 splices 重建 steering / queued。** 浏览器登记 `nextStepInboxDefinition` 与 `nextTurnInboxDefinition`：match `agent/inbox/spliced` 且 `target` 对应，`publication: 'none'`。非 `canceled` 的删除把 id 记进 `currentClaimed`，`input-message` 用它把随后的 `user/message` 标成 steering。 [E: packages/client/ui-chat/src/client/conversation-nodes/inbox.ts:115] [E: packages/client/ui-chat/src/client/conversation-nodes/inbox.ts:119] [E: packages/client/ui-chat/src/client/conversation-nodes/inbox.ts:126] [E: packages/client/ui-chat/src/client/conversation-nodes/inbox.ts:131] [E: packages/client/ui-chat/src/client/conversation-nodes/inbox.ts:134]

## 设计动机

DSH 把「还没进模型的意图」和「已经进 `deriveMessages()` 的历史」切开。inbox 变更必须先成为 `agent/inbox/spliced`，由标准 projection fold 重建 pending；claim 之后才允许 `user/message`。这就是 **model-visible ⟺ logged** 在入口侧的形状。

实现从 `dsh-agent` 挪到 `dsh-agent-loop`，是因为 fold 与 driver 同寿命：没有 agent-loop 就没有 turn 事件，读者把缺席的 `'inbox'` 键当成「没有 pending」，不是坏盘。公开合同仍停在 `dsh-agent`，Web / headless / webhook / SDK 只打 `Agent.followup` / `steer` / `inject`，不 import `ReactLoopInbox`。

三条入口而不是三种 event type，是为了让 **wake** 和 **边界** 正交。`MessageId` 跨队列唯一，是为了让 `replace` / `remove` / `updateQueue` 用一个 id 寻址。

fork 现在 **继承** 父 pending：子 session 的投影 fold 继承前缀。不要再写「`seedLength` 跳过父队列」。

## Gotcha

- **claim 不可逆，且不在公开合同上。** `claim` 是 loop 的 step-boundary 操作。`reject` 丢掉已 claim 的批次：不回队列、不上 surface。claim **之后**再 `inject`/`steer` 的消息仍 pending。
- **重复 `MessageId` 在 mutate / fold 都被拒。** `append` 一条已经在另一条队列里的消息抛 `message "<id>" is already pending`。 [E: packages/core/agent-loop/tests/inbox.spec.ts:250] `replace` 换成别人正在 pending 的 id 同样抛。 [E: packages/core/agent-loop/tests/inbox.spec.ts:226]
- **idle wake 不看队列是否为空。** idle 上一次 `followup`/`steer` 即使消息随后被 `remove`，仍会打开 `turn/start`；第一拍空 claim 以 `completed`、0 个 step 结束。maintenance / abort 后的 latch 相反：都要求 `wakeRequested && inbox.hasPending`。 [E: packages/core/agent-loop/src/agent.ts:200] [E: packages/core/agent-loop/src/agent.ts:262]
- **`canceled` ≠ unrun drop。** `replace` 写下 `outcome: 'canceled'` 但 `inserted` 非空；`foldConsumedWork` 不把它算成 `droppedUnrun`。 [E: packages/core/agent/src/consumed-work.ts:88]
- **splice 观察者看见新投影。** 在 `session/event` 里读 `stateOf(session, 'inbox')` 得到的是 **已经 splice** 的状态。同一轮 `append` 尚未结束时再 `send` 会撞上 `session append cannot reenter while another append is being published`。 [E: packages/core/session/src/index.ts:742]
- **`clear` 的空操作不写 log。** 已经空的 inbox 再 `clear()` 不会追加 spliced。 [E: packages/core/agent-loop/src/inbox.ts:217]
- **waterfall 不 `next()` = 换掉整条链。** `agent/pre-step` 监听器若直接 `return { kind: 'reject' }`，默认 enter 不会跑。
- **`Inbox` 不会被 `leakedServices` 扫到。** 它不是 root realm 里的 service 名。
- **不要再写 `packages/core/agent/src/inbox.ts`。** 投影登记在 `AgentLoop`，实现类在 `agent-loop/src/inbox.ts`。

## Seam 三角

| 角色 | 落点 | ctx / 组合 |
|---|---|---|
| Definition | `@deepseek-ai/dsh-agent`：`Inbox` 接口、`InboxTarget`、`Agent.followup`/`steer`/`inject`/`send`；`SessionEventMap['agent/inbox/spliced']`；`agent/inbox/*` 与 `agent/pre-step` | **不是** `ctx.inbox`。合同在 `dsh-agent`；session 词汇合进 `dsh-session` |
| Provider | `ReactLoopInbox` + `inboxProjectionDefinition`（`dsh-agent-loop`）；`AgentLoop` 登记投影；`ReactLoopAgent` 映射三入口并调用 `claim`；`dsh-base` 的 `agent-loop` 行以 `setFactory` 占全局工厂槽 | host 面：工厂与 loop 插件是进程级。每个 Agent 一份投影，跟 session 同寿命 |
| Consumer | Session Controller（人话 `followup`/`steer`、`updateQueue` → `replace`/`remove`/`steer`）；headless runner `followup`；webhook `followup`；preset 世界里的插件 `inject`/`steer`；client `ui-chat` fold next-step / next-turn spliced；`foldConsumedWork` | agent-preset 面的 listener 挂在 `Agent.ctx`。inbox 投递走 handle，不走 isolate realm |

## Sources

- packages/core/agent-loop/src/inbox.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/tests/inbox.spec.ts
- packages/core/agent-loop/tests/loop.spec.ts
- packages/core/agent-loop/tests/interception.spec.ts
- packages/core/agent/src/types.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/consumed-work.ts
- packages/core/agent/tests/consumed-work.spec.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/session/session-projection/src/index.ts
- vendor/cordis/src/events.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/api/session-controller/src/commands.ts
- packages/bundle/headless/src/index.ts
- packages/client/ui-chat/src/client/conversation-nodes/inbox.ts
- packages/client/ui-chat/src/client/conversation-nodes/message.ts
- packages/webhook/webhook/src/session.ts

## 相关

- [`spine.turn-and-step`](../../spine/turn-and-step.md) — 从 inbox 投递到 `turn` / `step` / `agent/request` 的端到端驱动。
- [`subsys.core.agent`](agent.md) — `Agent` 合同、`ctx.agents` 注册表与工厂槽；inbox **实现**不在该包。
- [`subsys.core.agent-loop`](agent-loop.md) — 默认 `ReactLoopAgent` 工厂、`Phase`、回滚与 `agents: []`；本页的 `ReactLoopInbox` 由它构造，投影由它登记。
- [`spine.session-log`](../../spine/session-log.md) — `deriveMessages()` 只投影 surface；`agent/inbox/spliced` 是 log-only。
- [`spine.overview`](../../spine/overview.md) — host 面 / agent-preset 面与 `profile → bundle → preset` 全仓地图。
- [`subsys.core.session`](session.md) — append-only log、`SurfaceOp`、`deriveMessages()`；`SESSION_FORMAT_VERSION = 4`。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `mountPreset` / `leakedServices` / isolate 审计。
