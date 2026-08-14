---
id: subsys.orchestration.schedule
title: schedule 提醒
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/schedule/schedule/src/index.ts
  - packages/schedule/schedule/src/persistence.ts
  - packages/schedule/schedule/src/domain.ts
  - packages/schedule/schedule/src/runtime.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/schedule/schedule/src/types.ts
  - packages/schedule/schedule/src/transaction.ts
  - packages/schedule/schedule/src/invariant.ts
  - packages/schedule/schedule/package.json
  - packages/schedule/schedule/tests/plugin.spec.ts
  - packages/schedule/schedule/tests/runtime.spec.ts
  - packages/schedule/schedule/tests/jsonl-restart.spec.ts
  - examples/web-schedule/cordis.yml
  - apps/cli/package.json
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/agent/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/session/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - vendor/cordis/src/events.ts
symbols:
  - ScheduleRuntime
  - schedule/change
  - apply
  - foldScheduleEvents
  - flushSchedulePersistence
  - registerScheduleTools
related:
  - spine.overview
  - spine.turn-and-step
  - surface.tools.schedule
  - subsys.core.agent-inbox
  - subsys.core.session
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-schedule` 是 **opt-in 的 function plugin**：没有 `ctx.schedule`，也没有独立 backend。它挂在加载之后才 `announce` 的 **root** `Agent` 上，用 session-local `schedule/change` 日志 + 进程内 timer + 带 untrusted framing 的 `followup` 做提醒。工具与 runtime 同包。它不在 shipped `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset 里。

## 能回答的问题

- 有没有 `ctx.schedule`？`apply` 观察谁、只给哪种 agent 装 runtime？
- shipped bundle / preset 装了这条能力吗？产品路径怎么 overlay？
- 到期为什么走 `Agent.followup` 而不是 `steer` / `inject` / 再开一条 tool call？
- `schedule/change` 的 `create` / `delete` / `dispatch` 怎么 fold？fork 的 `seedLength` 会不会把父提醒带进子会话？
- `deliveryMode` 为什么恒 `'session-local'`？进程关掉或 session 变冷之后记录还在吗？
- `persistence.ts` 做的是哪一层屏障？它是不是又一个 jsonl / sqlite 后端？

## 职责边界

`@deepseek-ai/dsh-schedule` 拥有：function-plugin 入口 `name` / `inject` / `apply`、每 root 一份 `ScheduleRuntime`、三条 agent-scoped 工具（`registerScheduleTools`）、严格 decode / fold（`foldScheduleEvents`）、以及对共享 `ctx.sessions.flush` 的薄封装 `flushSchedulePersistence`。包名写在 manifest。[E: packages/schedule/schedule/package.json:2] 插件名是字面量 `'schedule'`。[E: packages/schedule/schedule/src/index.ts:33] `inject` 是 `['agents', 'sessions', 'tools', 'sessionPersistence']`：四个 host 缝缺一，Loader 让插件保持 pending。[E: packages/schedule/schedule/src/index.ts:35] 测试钉死 **没有** `default` export（免得丢掉 `inject`）。[E: packages/schedule/schedule/tests/plugin.spec.ts:32]

本包**不**拥有：

- 进程级服务键。`apply(ctx)` 只 `ctx.effect` + `ctx.on`，从不 `ctx.provide('schedule', …)`，因此 **没有** `ctx.schedule`。[E: packages/schedule/schedule/src/index.ts:40]
- 模型可见 `schedule_create` / `schedule_list` / `schedule_delete` 的字段表与 `presentCall` 卡片 — [surface.tools.schedule](../../surface/tools/schedule.md)（`surface.tools.schedule`）。本页只写它们作为 Consumer 怎样 append / 唤醒 runtime。
- inbox 两条队列、`followup` → `next-turn` 的 splice / claim — [subsys.core.agent-inbox](../core/agent-inbox.md)（`subsys.core.agent-inbox`）。本包只调用 `agent.followup`。
- `Session` 本身、`deriveMessages()`、jsonl / sqlite 落盘实现 — [subsys.core.session](../core/session.md)（`subsys.core.session`）。`persistence.ts` 只要求 `ctx.sessions.flush` 返回 `true`。[E: packages/schedule/schedule/src/persistence.ts:26]
- shipped host 树。`dsh-base` insert 末条是 `id: llm-deepseek`，没有 `id: schedule`。[E: packages/bundle/base/cordis.patch.yml:450] `dsh-web-app` 末条 insert 是 `id: agent-presets`。[E: packages/bundle/web-app/cordis.patch.yml:421] `dsh-headless` 末条 insert 是 `id: headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:31]
- OS / 邮件 / SMS / 浏览器通知。到期只给**同一** live root 排队下一轮 turn。

**host 面 vs agent-preset 面。** 产品路径把本包当作 **host overlay**（`--patch` / profile `cordis.patch.yml`），不是 preset `isolate` remount。runtime 观察 `ctx.agents` 上**未来**发布的 root；三条工具写进该 root 的 `agent.ctx`（每会话 catalog），不进全局 `ctx.tools`。shipped preset 没有 `id: schedule` 行，因此也没有 `isolate: { schedule: true }`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/schedule/schedule/src/index.ts` | function plugin：`agent/created` 只给未来 root 挂 `ScheduleRuntime` + 工具 |
| `packages/schedule/schedule/src/runtime.ts` | 进程内 timer / idle 准入 / framing `followup` / `dispatch` append |
| `packages/schedule/schedule/src/domain.ts` | v1 decode、`foldScheduleEvents`、三种 selector 的 record、untrusted framing |
| `packages/schedule/schedule/src/tools.ts` | 同包 Consumer：`schedule_create` / `list` / `delete` 写 `schedule/change` |
| `packages/schedule/schedule/src/types.ts` | `ScheduleChange` 与 `SessionEventMap['schedule/change']` |
| `packages/schedule/schedule/src/persistence.ts` | `flushSchedulePersistence`：共享 `sessions.flush` 屏障 |
| `packages/schedule/schedule/src/transaction.ts` | 按 `Agent` 串行化 tool body 与 `driveOnce` |
| `packages/schedule/schedule/src/invariant.ts` | companion：replay / pre-append 再 fold，不注册第四个 tool |
| `examples/web-schedule/cordis.yml` | 仓库里唯一 shipped overlay：host `insert` `id: schedule` |

## 数据模型

提醒状态是 **session 后缀上的 fold**，不是一张独立表。协议版本写死为 `1`。[E: packages/schedule/schedule/src/domain.ts:21] 事件键是 `schedule/change`。[E: packages/schedule/schedule/src/types.ts:219]

| 符号 | 形状 | 含义 |
|---|---|---|
| `ScheduleChange.operation` | `'create'` / `'delete'` / `'dispatch'` | 唯一允许的 v1 突变。create 带完整 `schedule`；delete 只带 `id`；one-shot dispatch 只带 `id`，`every` dispatch 还必须带 `acceptedAt` |
| `ScheduleRecord.kind` | `'after'` / `'at'` / `'every'` | 三种规则。`every` 的 `scheduledAt` 是「下一次尚未接受的锚点」 |
| `MIN_EVERY_INTERVAL_SECONDS` | `300` | 固定频率下限；更短是 `frequency_too_high` [E: packages/schedule/schedule/src/domain.ts:24] |
| `ScheduleView.deliveryMode` | 常量 `'session-local'` | 管理 view 写死这一档；没有跨会话 / OS 投递 [E: packages/schedule/schedule/src/domain.ts:770] |
| `source` | `{ kind: 'plugin', plugin: 'schedule' }` | runtime 投进 inbox 的 `UserMessage` 归因 [E: packages/schedule/schedule/src/runtime.ts:273] |

`foldScheduleEvents(events, seedLength)` 只扫 `events.slice(seedLength)`。[E: packages/schedule/schedule/src/domain.ts:584] fork / seed 把父日志拷进子 session 时，子 **不得** 把父 `schedule/change` 当成自己的 active 集。id 永不复用：删掉的 `schedule-1` 仍占 `seenIds`。

`every` 不枚举漏掉的 occurrence：`resolveEveryOccurrence` 一次算出「最新到期」和「下一个锚点」。一次 idle 决策里，所有已到期的 `every` 合成一条 `[SCHEDULE REMINDER BATCH]`；已到期的 one-shot 永远先于该 batch。[E: packages/schedule/schedule/src/runtime.ts:47]

## 控制流

1. **组合真树：opt-in overlay，不是 shipped 行。** `@deepseek-ai/dsh` launcher 把包放进自己的 `dependencies`，所以 `--patch` 解析得到 `@deepseek-ai/dsh-schedule`；这不等于默认装进会话。[E: apps/cli/package.json:68] 仓库里的 overlay 是 `examples/web-schedule/cordis.yml`：host 面 `insert` `id: schedule` / `name: '@deepseek-ai/dsh-schedule'`。[E: examples/web-schedule/cordis.yml:8] [E: examples/web-schedule/cordis.yml:9] 同一文件还 insert `time-context`；Schedule **不** inject、也不读那个 clock service。`dsh-base` / `dsh-web-app` / `dsh-headless` 的 patch 末条分别是 `llm-deepseek` / `agent-presets` / `headless-runner`，没有本行。[E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/headless/cordis.patch.yml:31] 四个 shipped preset 同样没有 `id: schedule`：`minimal` 末条是 `str-replace-editor`，`standard` 末条是 `tool-web`，`code` 增量末条是 `tool-presentation` `mode: code`，`cordis` 末条是 `tool-skill`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261]

2. **`apply@packages/schedule/schedule/src/index.ts` 是 function plugin，不占服务键。** 加载时 `ctx.effect` 登记 `ctx.on('agent/created', …)`。[E: packages/schedule/schedule/src/index.ts:45] `AgentRegistry.announce` 用 `dispatch('emit', …)` 广播这条事件，**不是** waterfall：listener 没有 `next` 可调，也谈不上「不 `next()` 就 veto」。返回的 rejected promise 只 `logger.warn`。[E: packages/core/agent/src/index.ts:561] [E: packages/core/agent/src/index.ts:563]

3. **只给「未来的 root」装。** listener 在 `stopping`、已经挂过、或 `!ctx.agents.roots().includes(agent)` 时直接 return。[E: packages/schedule/schedule/src/index.ts:46] `roots()` 只收 `entry.owner === undefined` 的活体：这是**运行时创建者**关系，不是 session 谱系。[E: packages/core/agent/src/index.ts:615] 通过父 Agent 的 scoped context `create` 出来的孩子带 owner，因此不进 `roots()`，三条工具也是 `undefined`。[E: packages/schedule/schedule/tests/plugin.spec.ts:66] [E: packages/schedule/schedule/tests/plugin.spec.ts:67] 一次没有 owning agent 的 `resume`（包括 resume 一条 fork 出来的 session）`owner` 仍是 `undefined`，会进 `roots()`，插件加载之后会给它装 runtime。[I] 插件加载**之前**已经 `create` 的 root 拿不到工具。测试：先有的 root / 全局 `ctx.tools.get('schedule_create')` 是 `undefined`，只有后发布的 root 上三条名字齐。[E: packages/schedule/schedule/tests/plugin.spec.ts:43] [E: packages/schedule/schedule/tests/plugin.spec.ts:47] [E: packages/schedule/schedule/tests/plugin.spec.ts:50]

4. **每 root 一份 runtime + 同包工具，生命周期挂在 `agent.ctx.effect`。** `registerScheduleTools(ctx, agent.ctx, agent, () => runtime.requestDrive())` 把三条名字写进 **agent scope**，成功 create / 真 delete / list 的 preflight 之后会 `requestDrive`。[E: packages/schedule/schedule/src/index.ts:49] `runtime.start()` 立刻跑第一次 preflight。[E: packages/schedule/schedule/src/index.ts:55] `agent/status === 'idle'` **并且** 该 session 已经有至少一条 `schedule/change` 时才再 drive；空会话的 idle 不会为了本包去 `flush`。[E: packages/schedule/schedule/src/index.ts:51] 卸掉插件或 dispose agent：停 status 监听、卸工具、`runtime.dispose()`（清 timer、解开 `whenIdle` race）。

5. **管理面（模型 tool）只改 log，不自己投递。** body 经 `runScheduleTransaction(agent, …)` 按 owner 串行化。[E: packages/schedule/schedule/src/transaction.ts:13] 认主失败（`exec.agent !== agent`）立刻 `internal_error`，不 flush。过了形状门之后：`flushSchedulePersistence` → fold → `session.append('schedule/change', { version: 1, operation: 'create'|'delete', … })` → 再 flush。`list` 只有第一道屏障。成功才 `notifyDurableChange()`。字段表不在本页。

6. **`flushSchedulePersistence` 是共享 checkpoint，不是 persistence 子系统。** 它调用 `ctx.sessions.flush(session)`：至少一名 `session/flush` listener 成功 settle 才返回；`false`（零 listener）或 listener reject 都包成 `SchedulePersistenceError`。[E: packages/schedule/schedule/src/persistence.ts:26] store 的 `flush` 自己收集 callback 再 `Promise.allSettled`，**不是** Cordis waterfall，也没有 `next()` 可拒。[E: packages/core/session/src/index.ts:1026] 工具把该错误映射成 `persistence_uncertain`；runtime 只 `logger.warn` 然后本轮返回。本页不写 jsonl / sqlite 文件格式。

7. **`ScheduleRuntime.requestDrive@packages/schedule/schedule/src/runtime.ts` 在 `withoutInitiator` 里跑。** 定时器 / pump 不得继承「碰巧触发它的那个 tool call」的 initiator。[E: packages/schedule/schedule/src/runtime.ts:110] 触发合并：已有 `run` 只把 `requested = true`；`stopping` / `faulted` 直接忽略。`driveOnce` 先清 timer，再 preflight flush，再 `foldScheduleEvents(session.events, header.seedLength ?? 0)`，再用 `Date.now()` 做 `dueDecision`。[E: packages/schedule/schedule/src/runtime.ts:235]

8. **还没到期：臂一段 Node timer，醒来必须重读墙钟。** `wait` 分支 `arm(target, now)`，delay 被夹在 `MAX_TIMER_DELAY_MS`（`2_147_483_647`）以内；超长目标分段等。每次 timeout 只 `requestDrive()`，不相信 timer 本身等于到期。墙钟回拨不会提前 fire；向前跳过则当成 overdue、one-shot 只投一次。

9. **到期：必须真正 idle 才准入。** `agent.runMaintenance` 只接受 `phase.kind === 'idle'`，否则同步抛 `already has active work`。[E: packages/core/agent-loop/src/agent.ts:142] [E: packages/core/agent-loop/src/agent.ts:143] 成功路径是 `maintenance = this.agent.runMaintenance(...)`。[E: packages/schedule/schedule/src/runtime.ts:256] 同步失败走 `catch`：若 agent 仍 live 则 `waitForIdle()`，本轮 return。[E: packages/schedule/schedule/src/runtime.ts:309] `waitForIdle` 用 `Promise.race([this.agent.whenIdle(), this.stop.promise])` 等公开 idle 边界或 dispose，**不** `arm` 重试 timer、**不** `steer` 进正在跑的 turn。[E: packages/schedule/schedule/src/runtime.ts:187] [E: packages/schedule/schedule/src/runtime.ts:189] 抢到 maintenance 之后再 fold、再取样 `Date.now()`：维护窗口里若记录被删或墙钟回拨，取消投递并按新目标重新 arm。

10. **投递顺序写死：framed `followup`，然后才 append `dispatch`。** one-shot 用 `renderReminderFraming`（`[SCHEDULE REMINDER]` + JSON-escaped `reminder_prompt_json`）；`every` batch 用 `renderEveryReminderBatchFraming`。两段文案都命令模型把 prompt 当 **untrusted** 提醒内容，而不是新的 user instructions。[E: packages/schedule/schedule/src/domain.ts:782] `createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: 'schedule' } })` 之后 `this.agent.followup(message)`。[E: packages/schedule/schedule/src/runtime.ts:275] **不用** `steer` / `inject`。`followup` 失败：不写 `dispatch`，释放 maintenance。one-shot 再 `append({ operation: 'dispatch', id })`；`every` 对 batch 里每条写带同一 `acceptedAt` 的 dispatch，fold 把 `scheduledAt` 推到下一锚点（或删掉已耗尽的规则）。[E: packages/schedule/schedule/src/runtime.ts:284] append 失败：`faulted = true`，即使 inbox 里已经有那条 followup，也不会再投一次。测试把这一拍钉成 `flush → maintenance → followup → dispatch → release → flush`，`source.plugin === 'schedule'`。[E: packages/schedule/schedule/tests/runtime.spec.ts:248] [E: packages/schedule/schedule/tests/runtime.spec.ts:259]

11. **`followup` 之后的 turn 仍必须走过 `agent/pre-step` waterfall。** 默认驱动把 `followup` 映射成 `send(input, 'next-turn', true)`：独占下一轮 turn，并在 idle 时 `wakeDriver`。[E: packages/core/agent-loop/src/agent.ts:123] claim 已经发生之后，`ReactLoopAgent.preStep` 调 `this.dispatch.waterfall('agent/pre-step', …, () => ({ kind: 'enter', messages }))`。[E: packages/core/agent-loop/src/agent.ts:234] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层（含默认 `enter`）；不调用就停在本层，下游与内置 enter 都被 veto。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] 监听者可以 `reject`：本 turn `blocked`，已 claim 的 framing **不会**写成 `user/message`，也不会退回 inbox。Schedule **自己不**挂这条 waterfall；它只负责把 framed 文本送进 inbox。

12. **管理工具进 body 之前另有一条必须 `next()` 的 waterfall。** `ToolRuntime` 调 `this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。[E: packages/core/tools/src/index.ts:1476] 本包不注册 `tools/pre-execute` listener。别的插件若不 `next()`，`schedule_*` body（从而 append / 第二道 flush）不会跑。默认 innermost 是 `allow`。到期投递**不**走这条 tool 管线。

13. **isolate / `leakedServices`：本包不提供可泄漏的服务。** `leakedServices` 扫的是 mount fiber 写进 root isolate 符号表的 **provided service 名**。[E: packages/preset/agent-presets/src/mount.ts:189] `apply` 从不 `provide`，preset 也没有 `isolate: { schedule: true }` 行，因此 standing mount 不会因为本包报泄漏。工具已经写在 `agent.ctx`，不是 process-global `ctx.tools`。把本包塞进某条 preset isolate、指望每会话复制一份「schedule 服务」——产品里没有这个服务可复制。

14. **resume 同一 session 会补投 overdue，且只一次。** 冷日志里已有 `create`、尚未 `dispatch` 的记录，新进程 `agents.resume` 后再挂本插件，runtime 的第一次 drive 会走步骤 7–10。生产路径测试：JSONL 重启后 overdue `after` 只产生 **一条** `dispatch`、模型只被叫一次；再 resume 一次不再请求。[E: packages/schedule/schedule/tests/jsonl-restart.spec.ts:113] [E: packages/schedule/schedule/tests/jsonl-restart.spec.ts:114] [E: packages/schedule/schedule/tests/jsonl-restart.spec.ts:129] 冷读历史（只 `sessions` inspect、不 `resume` 出 live root）不会臂 timer。

## 设计动机

- **没有 `ctx.schedule`。** 提醒所有权是「某一条 session 的 root Agent」，不是进程单例表。做成 service 会诱使跨会话查询、fork 继承、或 host UI 当 registry 用。function plugin + `agent/created` 过滤器把生命周期钉在 live root 上。
- **只观察加载之后的 root。** 给已经在跑的会话突然多出三条工具，会在模型中途改 catalog，也和 `model-visible ⟺ logged` 的 preset 快照打架。opt-in overlay 的语义是：打开这条组合之后**新发布**的对话才有提醒。
- **投递是 framed `followup`，不是第二条 tool call，也不是 `steer`。** 到期要开一轮新 turn 把提醒呈现给用户；`steer` 会挤进正在跑的 step，`inject` 在 idle 上甚至不 wake。framing 把 `prompt` JSON-escape 进固定模板，挡住「提醒正文里伪造 `occurrence_at:` / 新指令」的注入。
- **`every` 跳过漏掉的 occurrence、多条合成一批。** 会话冷了 40 分钟再打开，300s 规则只呈现最新一次，不把 8 条 backlog 灌进 inbox。
- **`deliveryMode` 恒 session-local。** v1 明确拒绝「进程死了仍推 OS 通知」。记录可以过期成 `overdue`，但投递必须等这条 session 再次 live。
- **屏障复用 `sessions.flush`。** Schedule 不实现存储。create / 真 delete / dispatch 在「至少一名 persistence listener 点头」之前不对模型或 timer 承诺成功。换 jsonl / sqlite 是 persistence 缝的事，本页不改。

## Gotcha

- **没有 `ctx.schedule`。** 查服务表会落空。组合行的 `id` 是 `schedule`，运行时句柄是每 root 一份私有 `ScheduleRuntime`。
- **包在 CLI 依赖里 ≠ 装进产品 catalog。** launcher 能 `import` 该包；`dsh-base` / web / headless / `minimal`/`standard`/`code`/`cordis` 都没有这一行。默认 `dsh web` 的模型看不到 `schedule_*`。
- **已经活着的 root 不会补注册。** overlay 必须在 `agents.create` / `resume` **之前** load。测试先 `create` 再 `plugin(schedule)`：旧 root 的 `schedule_create` 仍是 `undefined`。[E: packages/schedule/schedule/tests/plugin.spec.ts:43]
- **有 runtime owner 的孩子不装。** 即使父 root 已有 runtime，`root.agent.ctx.agents.create` 出来的孩子带 owner，`roots()` 不含它，`schedule_create` 也是 `undefined`。[E: packages/schedule/schedule/tests/plugin.spec.ts:66] [E: packages/schedule/schedule/tests/plugin.spec.ts:67] `roots()` **不**按 fork 谱系排除：没有 owning agent 的 `resume`（包括 resume 一条 fork session）仍是 root。[I]
- **`deliveryMode` 没有第二档。** `scheduleView` 写死 `'session-local'`。进程退出只停内存 timer，不删 `create` 记录；下次 resume 同一 session 才可能 overdue 补投。
- **`persistence.ts` 不是存储后端。** 零 `session/flush` listener 时 `flush` 返回 `false`，create/list/delete 变成 `persistence_uncertain`，runtime 本轮放弃。不要把它读成「本包改写了 jsonl」。
- **`followup` 成功但 `dispatch` append 失败会永久 `faulted`。** inbox 里可能已经有那条 framed 消息；runtime 拒绝再投，避免用户看到两条相同提醒而 log 里没有 dispatch。
- **idle 监听有门闩。** 没有 `schedule/change` 的会话回到 idle，本包不 `requestDrive`，也就不 `flush` 无关 session。
- **`every_seconds < 300` 是 `frequency_too_high`，不是 `invalid_rule`。** 下限在 domain 常量，插件没有 Config 可改。
- **fork 不继承父提醒。** fold 从 `header.seedLength` 起算。子会话要提醒，必须自己再 `schedule_create`。
- **本包不挂 `agent/pre-step`。** 若其它插件（例如 goal-round-driver）在那条 waterfall 上 `reject` 且不 `next()`，framed followup 会被 claim 后丢掉，不会变成 `user/message`。那是 inbox / loop 的 veto，不是 Schedule 又投一次的理由。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | 本包扩 `SessionEventMap['schedule/change']` 为 v1 `ScheduleChange`，并导出 function-plugin `name: 'schedule'` / `inject`。[E: packages/schedule/schedule/src/types.ts:219] [E: packages/schedule/schedule/src/index.ts:33] **没有** `ctx.schedule` Definition，也没有 plugin `Config`。 |
| **Provider** | 不是独立 reminder backend。耐久确认是 **host** 已有的 `ctx.sessions.flush` listener（由 `sessionPersistence` 那一行提供）；本包只要求「至少一名 listener 成功」。进程内 timer 是 `ScheduleRuntime` 的 disposable 投影，换机器即丢。 |
| **Consumer（同包）** | `registerScheduleTools` 写 `create`/`delete`；`ScheduleRuntime` 写 `dispatch` 并 `followup`。Companion `./invariant` 在 `internal/dispatch` 上再 fold 一次候选事件。 |
| **Consumer（下游）** | `Inbox` / `ReactLoopAgent`：把 `source.plugin === 'schedule'` 的消息当成普通 `followup`。模型只通过三条 `schedule_*` 名字看见管理面。 |
| **bundle / preset 行** | shipped **无行**。唯一仓库 overlay：`examples/web-schedule/cordis.yml` 的 host `insert` `id: schedule`。[E: examples/web-schedule/cordis.yml:8] 用户 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 或 `dsh web --patch` 可以写同一行。[I] |
| **isolate** | 无。preset 不 remount。`leakedServices` 扫的是 provided service；本包不 `provide`。[E: packages/preset/agent-presets/src/mount.ts:189] |

换掉 persistence Provider 会带走：flush 是否真落盘、进程重启后 `agents.resume` 能否找回 overdue。不会带走：三条 wire 名、`MIN_EVERY_INTERVAL_SECONDS`、session-local 投递、untrusted framing、`schedule/change` 的严格 decode。

## Sources

- packages/schedule/schedule/src/index.ts
- packages/schedule/schedule/src/persistence.ts
- packages/schedule/schedule/src/domain.ts
- packages/schedule/schedule/src/runtime.ts
- packages/schedule/schedule/src/tools.ts
- packages/schedule/schedule/src/types.ts
- packages/schedule/schedule/src/transaction.ts
- packages/schedule/schedule/src/invariant.ts
- packages/schedule/schedule/package.json
- packages/schedule/schedule/tests/plugin.spec.ts
- packages/schedule/schedule/tests/runtime.spec.ts
- packages/schedule/schedule/tests/jsonl-restart.spec.ts
- examples/web-schedule/cordis.yml
- apps/cli/package.json
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/agent/src/index.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/session/src/index.ts
- packages/core/tools/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md) — Cordis 组合主线：`profile → bundle → agent preset`，host 面 vs preset 面。
- [spine.turn-and-step](../../spine/turn-and-step.md) — `followup` 如何变成 turn / `agent/pre-step` waterfall。
- [surface.tools.schedule](../../surface/tools/schedule.md) — `schedule_create` / `list` / `delete` 的 schema 与错误码（T1）。
- [subsys.core.agent-inbox](../core/agent-inbox.md) — `followup` / `steer` / `inject` 两条队列与 claim。
- [subsys.core.session](../core/session.md) — append-only log、`sessions.flush`、`seedLength`。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — shipped `dsh-base` 真树（不含本包）。
