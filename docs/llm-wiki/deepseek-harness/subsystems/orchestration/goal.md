---
id: subsys.orchestration.goal
title: goal 生命周期
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/goal/goal/src/index.ts
  - packages/goal/goal/src/types.ts
  - packages/goal/goal/src/fold.ts
  - packages/goal/goal/src/domain.ts
  - packages/goal/goal/src/runtime.ts
  - packages/goal/goal/tests/goal.spec.ts
  - packages/goal/goal/tests/goal.e2e.ts
  - packages/goal/goal-round-driver/src/index.ts
  - packages/goal/goal-round-driver/src/prompt.ts
  - packages/goal/goal-round-driver/tests/goal-round-driver.spec.ts
  - packages/goal/command-goal/src/index.ts
  - packages/goal/command-goal/tests/command-goal.spec.ts
  - packages/goal/tool-goal/src/authority.ts
  - packages/goal/tool-goal/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - vendor/cordis/src/events.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/tests/interception.spec.ts
  - packages/core/session/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
symbols:
  - ctx.goals
  - GoalService
  - GoalActivation
related:
  - spine.overview
  - spine.turn-and-step
  - surface.tools.goal
  - subsys.core.agent-inbox
  - spine.session-log
  - subsys.core.agent-loop
  - subsys.core.session
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.goals`（`GoalService`）是 **host 面**同一 session 上最多一条 completion objective 的 event-sourced 生命周期：耐久事实是整份 `goal/change` 快照；自动续跑资格是进程本地 `GoalActivation`，故意不落盘。`goal-round-driver` 只在 `phase === 'active'` 且 `activation === 'armed'` 时用 `source.kind === 'goal'` 的 `followup` 续跑。这是 Cordis 组合运行时里的一条 host 缝，不是跨 session 的 backlog，也不是又一个 coding-agent 主循环。

## 能回答的问题

- `GoalActivation` 为什么不进 `foldGoal` / `GoalProjection` / jsonl？reload、`SessionStore.fork`、`agent/session-start`、driver 热加载之后谁把它写成 `disarmed`？
- host 面的 `id: goal` / `goal-round-driver` / `command-goal` 和 agent-preset 面的 `id: tool-goal` 各装在哪一层？为什么 shipped 树**没有** `isolate: { goals: true }`？
- active + armed 时 `goal-round-driver` 怎样 `followup`？`source.kind === 'goal'` 的消息何时才把 `roundsStarted` 加一？
- `agent/pre-step` waterfall 何时必须 `next()`，何时故意不调用、直接 `{ kind: 'reject' }`？
- 人命令 `/goal` 和模型三件套 `create_goal` / `get_goal` / `update_goal` 分别消费哪条缝？谁有权 `create` / `resume`？

## 职责边界

`@deepseek-ai/dsh-goal` 拥有 `ctx.goals`：`GoalService` 的 compare-and-set 动词、`GoalCache` 里的进程本地 activation、严格 replay（`foldGoal` / `applyGoalEvent`）和 last-wins 投影（`applyGoalProjection`）。`@deepseek-ai/dsh-goal-round-driver` 拥有 idle 时的同 session 续跑与 `agent/pre-step` 准入篱笆。`@deepseek-ai/dsh-command-goal` 拥有人命令 `/goal`。三者都坐在 **host 面**（进程级、跨会话一份 `GoalService`，cache 按 `Session` 分键）。

本页**不**拥有：

- 模型可见三件套的 schema / `execute` 字段表 — 交给 [`surface.tools.goal`](../../surface/tools/goal.md)。本页只把 `tool-goal` 当 Consumer 门（`inject` + authority）。
- `Inbox.followup` / `steer` / `inject` 的队列与 `claim` — 交给 [`subsys.core.agent-inbox`](../core/agent-inbox.md)。
- `ReactLoopAgent.turn` / `step`、`agent/request` — 交给 [`subsys.core.agent-loop`](../core/agent-loop.md) 与 [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- append-only log 与 `deriveMessages()` — 交给 [`subsys.core.session`](../core/session.md) / [`spine.session-log`](../../spine/session-log.md)。`sessions.flush` 在本页只作为 driver 的耐久屏障，不改 persistence 后端。
- jobs / plan mode / schedule / workflow / Ralph / 子代理 spawn。goal 是**同一 session** 上的续跑，不 `ctx.subagents.start`。

**host 面 vs agent-preset 面。** host 留下 `GoalService`、`goal-round-driver`、`/goal` 和 Gateway 用来解析的 `ctx.goals`。agent-preset 面只决定这个 Agent 能不能看见 `tool-goal`。默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/goal/goal/src/index.ts` | `GoalService`：`ctx.goals`、cache / sync / commit、`disarm`、projection 注册 |
| `packages/goal/goal/src/types.ts` | `GoalActivation`、`GoalView`、`GoalProjection`（后者故意没有 activation） |
| `packages/goal/goal/src/fold.ts` | `foldGoal` / `applyGoalEvent`：严格 replay；round 只在 admitted `user/message` 上递增 |
| `packages/goal/goal/src/domain.ts` | `GoalChangeMeta`、`GoalMessageSource`、`SessionEventMap['goal/change']`、`goal/changed` |
| `packages/goal/goal/src/runtime.ts` | `GOAL_CHANGE_VERSION = 1`、`GoalError`、`GoalId()` |
| `packages/goal/goal-round-driver/src/index.ts` | idle `followup`、checkpoint、`agent/pre-step` 可 `reject` 而不 `next()` |
| `packages/goal/goal-round-driver/src/prompt.ts` | `renderGoalRoundPrompt`：写入 session 的 `<goal_round>` 文本 |
| `packages/goal/command-goal/src/index.ts` | `/goal`：`ctx.commands.register({ name: 'goal' })` |
| `packages/goal/tool-goal/src/authority.ts` | Consumer 门：`requireDirectHuman` / `completionAuthority` |
| `packages/goal/tool-goal/src/index.ts` | Consumer 插件：`inject` + 三个 `defineTool`（字段表不在本页） |
| `packages/bundle/base/cordis.patch.yml` | host insert：`goal` + `goal-round-driver` + `command-goal` + `tool-goal` |
| `packages/bundle/web-app/cordis.patch.yml` | 只 `disabled: true` 掉 `tool-goal`；服务留在 host |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | preset 顶层 remount `tool-goal`，无 `isolate` |

## 数据模型

| 符号 | 活在哪 | 要点 |
|---|---|---|
| `GoalPhase` | 耐久快照 | `active` / `paused` / `blocked` / `complete` |
| `GoalActivation` | 仅 `GoalView` / `GoalCache` | `'armed' \| 'disarmed'`；**从不**进 fold / projection / `goal/change` payload |
| `GoalSnapshot` | `goal/change` 的 `goal` 字段 | `id` + `revision` + `objective` + `phase` + `maxGoalRounds`；`blockedReason` 仅 `blocked` |
| `GoalRef` | CAS 栅栏 | `{ id, revision }`；错一格就是 `GOAL_STALE_REVISION` |
| `GoalChangeMeta` | `SessionEventMap['goal/change']` | 整份快照，或 `clear` tombstone；`version` 写死 `1` |
| `GoalView` | `get()` / 变异返回值 | 快照 + `roundsStarted` + 时间戳 + **当前进程**的 `activation` |
| `GoalProjection` / `FoldedGoal` | 投影 / 纯 fold | 与 `GoalView` 同形但**没有** `activation` |
| `GoalCache` | `WeakMap<Session, …>` | `state` + `activation` + `observedSeq` + `pendingActivation` |
| `GoalMessageSource` | admitted 续跑 | `{ kind: 'goal', goalId, revision, round }`；`round > 0` |
| `Config` | `GoalService` | 只有 `defaultMaxGoalRounds`（默认 `256`） |

`GoalOperation` 是 `create | edit | pause | resume | complete | block | clear`。`disarm()` **不是** operation，不写 revision。

## 控制流

1. **host 组合先落下 Definition。** `dsh-base` 根 `insert` 同时挂 `id: goal`（`@deepseek-ai/dsh-goal`）、`id: goal-round-driver`、`id: command-goal`，以及一层 host `id: tool-goal`。`GoalService@packages/goal/goal/src/index.ts` 是 class plugin：`static inject = ['agents']`，构造里 `super(ctx, 'goals')` 发布 `ctx.goals`。`dsh-headless` **不** disable 这四行，工具留在 host 全局层。 [E: packages/bundle/base/cordis.patch.yml:256] [E: packages/bundle/base/cordis.patch.yml:259] [E: packages/bundle/base/cordis.patch.yml:262] [E: packages/bundle/base/cordis.patch.yml:374] [E: packages/goal/goal/src/index.ts:184] [E: packages/goal/goal/src/index.ts:194]

2. **web 把模型工具挪到 preset 面，服务留在 host。** `dsh-web-app` 只把 `id: tool-goal` 标 `disabled: true`；`goal` / `goal-round-driver` / `command-goal` 没有对应 disable 行。shipped `standard` / `code` / `cordis` 在 preset 顶层 remount `id: tool-goal`，**没有** `isolate` 块。`minimal` 不装这行。preset 的 isolate 给的是 `planMode` / `compaction` / `workflowEngine`，不是 `goals`。 [E: packages/bundle/web-app/cordis.patch.yml:345] [E: packages/bundle/web-app/cordis.patch.yml:346] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:97] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:104] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:85] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108]

3. **无 isolate 是 Gateway Remote 约束，不是漏写。** `tool-goal` `inject = ['agents', 'goals', 'tools', 'systemPrompt']`，自己不 `provide` `goals`。若 preset 把 `GoalService` 发进 root realm，`leakedServices@packages/preset/agent-presets/src/mount.ts` 会拒（`a preset service must sit behind an isolate realm or move to the host composition`）。若反过来把 `tool-goal` 放进 `isolate: { goals: true }`，host 那份 `ctx.goals` 会被挡住。Gateway HTTP 的 `goalServiceFor` 先 `presets.serviceFor(agent, 'goals')`，找不到再 `ctx.get('goals')`；shipped 树没有 preset realm，落到 host 单例。 [E: packages/goal/tool-goal/src/index.ts:23] [E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:365] [E: packages/preset/agent-presets/src/index.ts:433] [E: packages/host/apiproxy/src/api-proxy.ts:1798]

4. **服务启动：session-start 一律 disarmed；投影可选。** 构造挂 `agent/session-start`：`this.cache(agent.session).activation = 'disarmed'`。`sessionProjections` 存在时才 `register({ key: 'goal', apply: applyGoalProjection, init: () => null })`。`applyGoalProjection` 从 `goal/change` 取出 `goal` / `roundsStarted` / `createdAt` / `updatedAt`，**不**写 `activation`。`foldGoal` 的返回值同样没有该字段。headless e2e 对落盘 jsonl 断言 `JSON.stringify(context)` 不含 `'activation'`。 [E: packages/goal/goal/src/index.ts:198] [E: packages/goal/goal/src/index.ts:199] [E: packages/goal/goal/src/index.ts:108] [E: packages/goal/goal/src/fold.ts:339] [E: packages/goal/goal/src/types.ts:91] [E: packages/goal/goal/tests/goal.e2e.ts:69]

5. **第一次碰 session：fold 种子，activation 固定 disarmed。** `cache@GoalService` 用 `emptyGoalFoldState()` 扫一遍 `session.events`，新 cache 的 `activation: 'disarmed'`、`pendingActivation: undefined`。reload 种子、`SessionStore.fork` 的 child 都走这条，测试钉死 `activation: 'disarmed'`（durable `phase` / `roundsStarted` 仍在）。 [E: packages/goal/goal/src/index.ts:428] [E: packages/goal/goal/tests/goal.spec.ts:164] [E: packages/goal/goal/tests/goal.spec.ts:184]

6. **变异：pendingActivation 跨过同步 append。** `create` 在非 `complete` 的 current 上抛 `GOAL_ALREADY_EXISTS`；否则新 `id: goal-${uuid}`、`revision: 1`、`phase: 'active'`，`commitSnapshot(..., 'armed')`。`commit` 先记 `pendingActivation = { seq: agent.session.seq, activation }`，再 `session.append('goal/change', change)`，`sync` 后清 pending。`sync` 遇到 `goal/change`：仅当 `event.seq` 等于这次 pending 才采纳 intended activation，否则写成 `'disarmed'`。`goal/change` 不是 surface：create 之后 `deriveMessages()` 仍是 `[]`。 [E: packages/goal/goal/src/index.ts:255] [E: packages/goal/goal/src/index.ts:266] [E: packages/goal/goal/src/index.ts:544] [E: packages/goal/goal/src/index.ts:546] [E: packages/goal/goal/src/index.ts:441] [E: packages/goal/goal/tests/goal.spec.ts:110]

7. **`disarm()` 不落盘。** 它只改 cache 的 `activation = 'disarmed'`，不 append、不 bump revision、不 emit `goal/changed`。测试：调用前后 `session.events.length` 不变；之后必须显式 `resume` 才重新 `'armed'` 并写一条 `resume` 快照。`pause` / `complete` / `block` / `clear` 在同一条 `goal/change` 里把 activation 意向设成 `'disarmed'`。`edit` 保留 cache 里当时的 activation。 [E: packages/goal/goal/src/index.ts:240] [E: packages/goal/goal/tests/goal.spec.ts:211] [E: packages/goal/goal/src/index.ts:289] [E: packages/goal/goal/src/index.ts:300]

8. **driver 热加载也不继承 armed。** `apply@goal-round-driver` 是 named-export function plugin（`name = 'goal-round-driver'`，`inject = ['agents', 'goals', 'sessions']`）。`ctx.effect` 装完监听后，对 `ctx.agents.list()` 逐个 `disarm`。测试：先 `create`（armed）再 `plugin(goalSession)`，立刻变成 `disarmed`、0 次模型请求，直到 `resume`。 [E: packages/goal/goal-round-driver/src/index.ts:18] [E: packages/goal/goal-round-driver/src/index.ts:19] [E: packages/goal/goal-round-driver/src/index.ts:418] [E: packages/goal/goal-round-driver/src/index.ts:420] [E: packages/goal/goal-round-driver/tests/goal-round-driver.spec.ts:225]

9. **idle + active + armed 才 `followup`。** `goal/changed` 把 `needsCheckpoint = true` 并 `requestDrive`。`agent/status === 'idle'` 同样 `requestDrive`（若当时有 queued/claimed/cancelled 的 attempt，先 `pause`）。`drive` 要求 `readyToDrive`：fiber `ACTIVE`、非 stopping、exact live agent、`status === 'idle'`、没有 competing `next-turn`。待落盘时先 `await ctx.sessions.flush(agent.session)`；flush 失败则 `disarm` 并 return。然后仅当 `phase === 'active' && activation === 'armed'` 且 `roundsStarted < maxGoalRounds`，才 `renderGoalRoundPrompt` + `createUserMessage({ source: { kind: 'goal', goalId, revision, round } })` + `agent.followup(message)`。`followup@ReactLoopAgent` = `send(input, 'next-turn', true)`。用尽 cap 走 `block(..., { code: 'round-limit' })`，不是再排一条 prompt。 [E: packages/goal/goal-round-driver/src/index.ts:165] [E: packages/goal/goal-round-driver/src/index.ts:178] [E: packages/goal/goal-round-driver/src/index.ts:192] [E: packages/goal/goal-round-driver/src/index.ts:167] [E: packages/core/agent-loop/src/agent.ts:123] [E: packages/core/session/src/index.ts:1022]

10. **`agent/pre-step` 是 waterfall；本页有一条故意不 `next()` 的 reject。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `shift` 到下一层；不调用就停在本层，内置行为也不跑。driver 监听：消息里没有 `kind === 'goal' && round > 0` 则 `return next()`。有则跑 `validReservation`（claimed、未 stale、id/revision 对得上、仍是 active+armed、`round === roundsStarted + 1`）。失败路径 **不** 调用 `next()`，直接 `return { kind: 'reject' }`，并把别人的 claimed 上下文 `prepend` 回 `next-step`。成功路径才 `await next()`；下游若 `reject` 且 goal 仍 active+armed，再 `block(..., { code: 'prompt-rejected' })`。下游 `enter` 后复检 reservation，失败同样改写成 `reject`（不消耗 round）。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: packages/goal/goal-round-driver/src/index.ts:349] [E: packages/goal/goal-round-driver/src/index.ts:352] [E: packages/goal/goal-round-driver/src/index.ts:370] [E: packages/goal/goal-round-driver/src/index.ts:374] [E: packages/goal/goal-round-driver/src/index.ts:388]

11. **loop 把 `reject` 收成 0 step 的 `blocked` turn。** `ReactLoopAgent.preStep` 的默认 `next` 是 `{ kind: 'enter', messages }`。收到 `reject` → `turnEnds = { kind: 'blocked' }`，不写 `step/start`，也不把已 claim 的消息写成 `user/message`。拦截测试：模型 0 次调用，log 只有 `turn/start` / `turn/end`。driver 自己的 `prompt-rejected` 测试：`roundsStarted === 0`。 [E: packages/core/agent-loop/src/agent.ts:236] [E: packages/core/agent-loop/src/agent.ts:267] [E: packages/core/agent-loop/tests/interception.spec.ts:239] [E: packages/goal/goal-round-driver/tests/goal-round-driver.spec.ts:257]

12. **只有 admitted `user/message` 才增加 `roundsStarted`。** `applyGoalEvent` 在 `type === 'user/message'` 且 `source.kind === 'goal'` 时校验：current 必须 `active`、id/revision 对齐、`source.round === roundsStarted + 1` 且不超过 cap，然后 `state.roundsStarted = source.round`。这是 `model-visible ⟺ logged` 在本缝上的落点：续跑文本先经 `followup` 进 inbox，claim + `enter` 之后才变成 surface `user/message`，模型请求里的 `messages` 仍只来自 `deriveMessages()`。 [E: packages/goal/goal/src/fold.ts:321] [E: packages/goal/goal/src/fold.ts:330] [E: packages/core/agent-loop/src/agent.ts:283]

13. **人命令与模型工具都只调 `ctx.goals`。** `command-goal.apply` 注册 `name: 'goal'`，`inject = ['commands', 'goals']`，测试钉死没有 default export（Loader `default` 会丢掉 `inject`）。`/goal <objective>` → `create`；`edit` / `pause` / `resume` / `clear` 走同名动词。`tool-goal` 的 `create_goal` / `edit` / `pause` / `resume` 先 `requireDirectHuman`（runtime root + 当前 turn 存在 `source.kind === 'user'` 的 `user/message`）。`complete` / `blocked` 走 `completionAuthority`：human **或** 当前 admitted goal-round。字段表见 [`surface.tools.goal`](../../surface/tools/goal.md)。 [E: packages/goal/command-goal/src/index.ts:12] [E: packages/goal/command-goal/src/index.ts:164] [E: packages/goal/command-goal/tests/command-goal.spec.ts:92] [E: packages/goal/tool-goal/src/authority.ts:90] [E: packages/goal/tool-goal/src/authority.ts:102]

14. **其它 fence。** `agent/error`、`turn/end` 的 `max-tokens`、非本 attempt 的 `aborted`：`disarm`。cancel 打在 queued/claimed/admitted attempt 上：idle 时 `pause`（保留 durable phase=`paused`）。另一条 `next-turn` 插到已 queued 的 round 后面：该 attempt `stale = true`，pre-step 会 reject。driver 用 `ctx.agents.withoutInitiator` 跑调度，避免续跑把自己当成 initiator。

## 设计动机

- **activation 与 phase 切开。** `phase` 是「这条 objective 现在算不算活着」的耐久事实，必须能从 log 重建。`GoalActivation` 是「**这个进程**现在可不可以自动 `followup`」。reload / fork / driver 替换 / HMR 换 fiber 之后，保留 objective 但停止自动动手，直到人（`/goal resume` 或 human turn 上的 `update_goal action resume`）再授权。
- **整份快照，last-wins 投影。** 每条非 clear 的 `goal/change` 携带完整 post-state。浏览器 / history tail 读 `goal` projection，不读进程本地 cache。Gateway 变异 API 也只 ack 新 `GoalRef`，完整值走投影帧。
- **同 session，不 spawn。** driver 不 `ctx.subagents.start`，不 fork 前缀另开一条 Ralph 循环。一条 `followup` 占用自己的 turn（inbox `next-turn` 语义），人话插队会让当前 reservation stale。
- **host 单例。** cache 按 `Session` 分键，一份 `GoalService` 伺候所有会话。Gateway Remote 的 receiver 从 host 描述符解析 `goals`；把服务放进 preset isolate 会让浏览器 RPC 找不到。
- **`model-visible ⟺ logged`。** `goal/change` 本身不上 surface。模型看见 objective，靠 `get_goal` 工具结果，或 driver 写入并被 loop 收成 `user/message` 的 `<goal_round>`。`agent/request` 改不了这段对话。

## Gotcha

- **activation 永不进 log。** 在 jsonl / `foldGoal` / `GoalProjection` 里找 `armed` 一定找不到。e2e 对整条 `goal/change` 事件做字符串扫描。
- **`disarm` 不是 mutation。** 生命周期卸载、flush 失败、`max-tokens`、driver 热加载都只碰 cache。UI 若只订阅 `goal/changed` 会看不到这次变化。
- **`create` 不会自己开 round。** 它只 append `goal/change` 并 arm。真正的第一拍是 driver 在随后的 idle 上 `followup`。没有 driver 的组合（例如某些 e2e fixture）可以只留下一条 create 快照。
- **已经 armed 的 active 拒绝再 `resume`。** 这是 `GOAL_INVALID_TRANSITION`，不是 no-op。session-start 之后的 disarmed active 才是 `resume` 的合法输入之一。
- **非 complete 不能被另一条 `create` 替换。** 先 `clear` 或先 `complete`。`complete` 之后的新 id 必须全局没见过（`seenGoalIds`）。
- **`edit` 不改 phase，也不改 activation。** 人在 armed 续跑中改 objective，下一拍 reservation 会因为 revision 变了而 stale，driver 再按新 revision 排。
- **competing `next-turn` 会作废已 queued 的 round。** 人话「插到后面」仍算竞争；pre-step 拒绝这条 goal 消息，round 号不消耗。
- **`command-goal` / `goal-round-driver` 必须 named export。** 测试钉死 `'default' in commandGoal === false`。class 的 `GoalService` 才走 default export。
- **模型工具没有 `clear`。** tombstone 是 `GoalService.clear` / `/goal clear`。模型走 `complete` 或 `blocked`。
- **`apiproxy` 的注释仍写「preset 可能 isolate `goals`」。** 查找顺序兼容自定义 isolate，但 shipped `dsh-web-app` + `standard`/`code`/`cordis` **没有**把 `goals` 放进 realm。写节点时以 bundle / preset 行 + `leakedServices` 为准。

## Seam 三角

| 角 | 包 / 符号 | `ctx` 键 | bundle / preset 行 |
|---|---|---|---|
| **Definition** | `@deepseek-ai/dsh-goal`：`Context.goals`、`GoalService` 合同、`SessionEventMap['goal/change']`、`GoalActivation` | `ctx.goals` | `dsh-base` `id: goal`。无 plugin 级多 adapter 表。 |
| **Provider** | 同一包的 `GoalService`（`TypertRemoteService`，`@Remote` 给 Gateway）。**不是**第二家 backend 包 | 同一 `ctx.goals` | 仍是 `id: goal`。web **不** disable。无 `isolate`。 |
| **Consumer** | `dsh-goal-round-driver`（idle `followup`）；`dsh-command-goal`（`/goal`）；`dsh-tool-goal`（`create_goal` / `get_goal` / `update_goal`）；`apiproxy.goals.*` | driver：`agents` + `goals` + `sessions`；command：`commands` + `goals`；tool：再加 `tools` + `systemPrompt` | base 另有 `id: goal-round-driver`、`id: command-goal`、host `id: tool-goal`。web 只 disable `tool-goal`。`standard`/`code`/`cordis` 顶层 remount `id: tool-goal`。`minimal` 不装。 |

换掉 `id: goal` 这一行，三家 Consumer 和 Gateway Remote 一起失去 `ctx.goals`。只卸 `tool-goal`，人命令与自动续跑仍在。

## Sources

- packages/goal/goal/src/index.ts
- packages/goal/goal/src/types.ts
- packages/goal/goal/src/fold.ts
- packages/goal/goal/src/domain.ts
- packages/goal/goal/src/runtime.ts
- packages/goal/goal/tests/goal.spec.ts
- packages/goal/goal/tests/goal.e2e.ts
- packages/goal/goal-round-driver/src/index.ts
- packages/goal/goal-round-driver/src/prompt.ts
- packages/goal/goal-round-driver/tests/goal-round-driver.spec.ts
- packages/goal/command-goal/src/index.ts
- packages/goal/command-goal/tests/command-goal.spec.ts
- packages/goal/tool-goal/src/authority.ts
- packages/goal/tool-goal/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- vendor/cordis/src/events.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/tests/interception.spec.ts
- packages/core/session/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — Cordis 组合运行时全仓地图：`profile → bundle → agent preset`，host / preset 两面。
- [`spine.turn-and-step`](../../spine/turn-and-step.md) — `followup` 如何变成 turn / step；`agent/pre-step` `reject` 收成 `blocked`。
- [`surface.tools.goal`](../../surface/tools/goal.md) — `create_goal` / `get_goal` / `update_goal` 的 schema、authority 与 wrap-up。
- [`subsys.core.agent-inbox`](../core/agent-inbox.md) — `followup` → `next-turn` + wake；`claim` 之后才写 `user/message`。
- [`spine.session-log`](../../spine/session-log.md) — append-only log 与 `deriveMessages()`；`goal/change` 不上 surface。
- [`subsys.core.agent-loop`](../core/agent-loop.md) — 默认 `ReactLoopAgent`：waterfall 默认 `enter`，`reject` 不写 step。
- [`subsys.core.session`](../core/session.md) — `Session.append` / `sessions.flush` 合同。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 把 `goal` 缝插在 host 面。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web 只 disable 模型工具、留下 host `goals`。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `leakedServices` 与 `isolate` realm；`tool-goal` 为何坐在 preset 顶层。
