---
id: subsys.orchestration.schedule
title: schedule 提醒
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/schedule/schedule/src/index.ts
  - packages/schedule/schedule/src/storage.ts
  - packages/schedule/schedule/src/domain.ts
  - packages/schedule/schedule/src/runtime.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/schedule/schedule/src/types.ts
  - packages/schedule/schedule/src/invariant.ts
  - packages/schedule/schedule/package.json
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/core/agent-loop/src/agent.ts
  - packages/core/tools/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.schedule
  - ScheduleService
  - ScheduleRuntime
  - registerScheduleTools
  - scheduleDomain
related:
  - spine.overview
  - spine.turn-and-step
  - surface.tools.schedule
  - subsys.core.agent-inbox
  - subsys.core.session
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh-schedule` 是 **host 面**提醒缝：`ScheduleService` `super(ctx, 'schedule')` 占 `ctx.schedule`，任务存在 `storageDomain` 的 `scheduleDomain` 表，到期用 framed `followup` 投进原 Session。`dsh-web-app` **insert 了** `id: schedule` 与 `id: ui-schedule`，但两行都 `disabled: true`。四个 shipped preset **没有** schedule 行。`dsh-base` / headless / sdk / acp 也不装。

## 能回答的问题

- 有没有 `ctx.schedule`？谁 `provide`？任务存在 session log 还是 storage domain？
- shipped web 组合有没有这一行？默认 `disabled` 吗？preset 会不会 remount？
- 到期为什么走 `Agent.followup` 而不是 `steer` / `inject` / 再开一条 tool call？
- `deliveryMode` 现在是什么？`after` / `at` / `every` 之外还有哪些 kind？
- 模型可见工具现在有几条？谁装到 root Agent scope？
- 历史 `schedule/change` 事件还管不管 live 任务？

## 职责边界

`@deepseek-ai/dsh-schedule` 拥有：`ScheduleService`（`TypertRemoteService`，键 `'schedule'`）、`ScheduleRuntime` 进程内 timer、`registerScheduleTools` 把四条工具写进 **root Agent scope**、以及 `scheduleDomain` 任务表。构造 `super(ctx, 'schedule')`。[E: packages/schedule/schedule/src/index.ts:121] `static inject = ['agents', 'sessions', 'tools', 'storageDomain', 'sessionController', 'sessionPersistence']`。[E: packages/schedule/schedule/src/index.ts:101]

本包**不**拥有：

- 模型可见 `schedule_create` / `schedule_list` / `schedule_delete` / `schedule_update` 字段表 — [surface.tools.schedule](../../surface/tools/schedule.md)（`surface.tools.schedule`）。
- inbox / `followup` 队列 — [subsys.core.agent-inbox](../core/agent-inbox.md)。本包只调用 `agent.followup`。[E: packages/schedule/schedule/src/runtime.ts:123]
- jsonl / sqlite 实现。任务走 `ctx.storageDomain.open(scheduleDomain)`。[E: packages/schedule/schedule/src/index.ts:126] [E: packages/schedule/schedule/src/storage.ts:2]
- shipped 默认产品 catalog。`dsh-base` 没有 `id: schedule`。[E: packages/bundle/base/cordis.patch.yml:524] `dsh-web-app` insert `id: schedule` **且** `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:125] [E: packages/bundle/web-app/cordis.patch.yml:127] `ui-schedule` 同样 disabled。[E: packages/bundle/web-app/cordis.patch.yml:370] [E: packages/bundle/web-app/cordis.patch.yml:372] 四个 shipped preset 没有 schedule 行。[E: packages/bundle/web-app/presets/standard.patch.yml:142] `headless` / `sdk` / `acp` overlay 不 insert 本包。[E: packages/bundle/headless/cordis.patch.yml:25] [E: packages/bundle/sdk-app/cordis.patch.yml:13] [E: packages/bundle/acp-app/cordis.patch.yml:13]

**host 面 vs agent-preset 面。** 服务与任务表坐在 **host**。工具挂在后续 `agent/created` 的 **root** Agent scope 上，不进全局 `ctx.tools`。[E: packages/schedule/schedule/src/index.ts:178] [E: packages/schedule/schedule/src/index.ts:170] 不是 preset isolate remount。五个 shipped CLI profile 默认模型看不到 `schedule_*`，除非把 web 那行 `disabled` 去掉或另 overlay。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/schedule/schedule/src/index.ts` | `ScheduleService`：`ctx.schedule`、打开 `scheduleDomain`、给未来 root 挂工具 |
| `packages/schedule/schedule/src/storage.ts` | Host-wide 任务表 schema |
| `packages/schedule/schedule/src/runtime.ts` | 进程内 timer；到期 `sessionController.resolveAgent` + framed `followup` |
| `packages/schedule/schedule/src/domain.ts` | v1 decode、`foldScheduleEvents`、三种 selector 的 record、untrusted framing |
| `packages/schedule/schedule/src/tools.ts` | 四条 agent-scoped 工具 |
| `packages/schedule/schedule/src/types.ts` | `ScheduleRecord` kinds |
| `packages/schedule/schedule/src/invariant.ts` | companion |
| `packages/bundle/web-app/cordis.patch.yml` | host insert `id: schedule` `disabled: true` |

## 数据模型

live 任务在 **Host storage domain**，不是 session 后缀 fold。协议版本仍是 `1`。[E: packages/schedule/schedule/src/domain.ts:34] 历史 `schedule/change` 仍可 fold 阅读，但 `session/created` 只警告、不把 legacy 事件变成 live 任务。[E: packages/schedule/schedule/src/index.ts:188]

| 符号 | 形状 | 含义 |
|---|---|---|
| `ScheduleRecord.kind` | `'after'` / `'at'` / `'every'` / `'daily'` / `'weekly'` / `'cron'` | 六种规则。[E: packages/schedule/schedule/src/types.ts:21] [E: packages/schedule/schedule/src/types.ts:67] [E: packages/schedule/schedule/src/types.ts:105] |
| `MIN_EVERY_INTERVAL_SECONDS` | `60` | 固定频率下限。[E: packages/schedule/schedule/src/domain.ts:37] |
| `ScheduleView.deliveryMode` | 常量 `'host'` | 管理 view 写死这一档。[E: packages/schedule/schedule/src/domain.ts:1854] |
| `source` | `{ kind: 'schedule' }` | runtime 投进 inbox 的 `UserMessage` 归因 [E: packages/schedule/schedule/src/runtime.ts:120] |

`every` / `daily` / `weekly` / `cron` 不枚举漏掉的 occurrence：runtime 一次算出最新到期和下一个锚点。[E: packages/schedule/schedule/src/runtime.ts:109]

## 控制流

1. **组合真树：web 有 disabled 行，preset 不 remount。** `dsh-web-app` insert `id: schedule` / `name: '@deepseek-ai/dsh-schedule'` 且 `disabled: true`，旁边 `time-context` 也 disabled。[E: packages/bundle/web-app/cordis.patch.yml:125] [E: packages/bundle/web-app/cordis.patch.yml:127] [E: packages/bundle/web-app/cordis.patch.yml:121] `dsh-base` 没有这一行。[E: packages/bundle/base/cordis.patch.yml:524] 四个 shipped preset 没有 `id: schedule`。[E: packages/bundle/web-app/presets/standard.patch.yml:142] 要启用：把 web 行的 `disabled` 去掉，或在 profile user patch 写同一 `id`。

2. **`ScheduleService` 占 `ctx.schedule`。** 构造 `super(ctx, 'schedule')`，打开 `scheduleDomain`，再 `new ScheduleRuntime`。[E: packages/schedule/schedule/src/index.ts:121] [E: packages/schedule/schedule/src/index.ts:126] [E: packages/schedule/schedule/src/index.ts:156] `agent/created` 是 emit，不是 waterfall。

3. **只给 root 装四条工具。** `attach` 在 `stopping`、已经挂过、或 `!ctx.agents.roots().includes(agent)` 时直接 return。[E: packages/schedule/schedule/src/index.ts:170] `registerScheduleTools` 登记 `schedule_create` / `schedule_list` / `schedule_delete` / `schedule_update`。[E: packages/schedule/schedule/src/tools.ts:417] [E: packages/schedule/schedule/src/tools.ts:452] [E: packages/schedule/schedule/src/tools.ts:470] [E: packages/schedule/schedule/src/tools.ts:493] 有 runtime owner 的孩子不装。

4. **管理面写 storage domain，不自己投递。** 工具经 `ctx.schedule` 改任务表；到期由 `ScheduleRuntime` 投递。字段表不在本页。

5. **`ScheduleRuntime.requestDrive` 在 `withoutInitiator` 里跑。** 定时器不得继承碰巧触发它的 tool-call initiator。[E: packages/schedule/schedule/src/runtime.ts:51] 已有 `running` 只把 `requested = true`。[E: packages/schedule/schedule/src/runtime.ts:44]

6. **还没到期：臂一段 Node timer。** delay 夹在 `MAX_TIMER_DELAY_MS`（`2_147_483_647`）以内。[E: packages/schedule/schedule/src/runtime.ts:17] 每次 timeout 只 `requestDrive()`，不相信 timer 本身等于到期。

7. **到期：`sessionController.resolveAgent` 后 framed `followup`，再 `sessions.flush`。** 文案走 `renderReminderFraming` / `renderRecurringReminderBatchFraming`；`source: { kind: 'schedule' }`。[E: packages/schedule/schedule/src/runtime.ts:101] [E: packages/schedule/schedule/src/runtime.ts:118] [E: packages/schedule/schedule/src/runtime.ts:123] [E: packages/schedule/schedule/src/runtime.ts:124] **不用** `steer` / `inject`。flush 失败本轮不 commit。

8. **`followup` 之后的 turn 仍必须走过 `agent/pre-step` waterfall。** 默认驱动把 `followup` 映射成 `send(input, 'next-turn', true)`：独占下一轮 turn，并在 idle 时 `wakeDriver`。[E: packages/core/agent-loop/src/agent.ts:163] claim 已经发生之后，`ReactLoopAgent.preStep` 调 `this.dispatch.waterfall('agent/pre-step', …, () => ({ kind: 'enter', messages }))`。[E: packages/core/agent-loop/src/agent.ts:276] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层（含默认 `enter`）；不调用就停在本层，下游与内置 enter 都被 veto。[E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:237] 监听者可以 `reject`：本 turn `blocked`，已 claim 的 framing **不会**写成 `user/message`，也不会退回 inbox。Schedule **自己不**挂这条 waterfall；它只负责把 framed 文本送进 inbox。

9. **管理工具进 body 之前另有一条必须 `next()` 的 waterfall。** `ToolRuntime` 调 `this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。[E: packages/core/tools/src/index.ts:1505] 本包不注册 `tools/pre-execute` listener。别的插件若不 `next()`，`schedule_*` body 不会跑。默认 innermost 是 `allow`。到期投递**不**走这条 tool 管线。

10. **isolate。** 服务留在 host。preset 没有 `isolate: { schedule: true }`。若把 `ScheduleService` 塞进 preset 且漏 isolate，`leakedServices` 拒站。[E: packages/preset/agent-preset-registry/src/mount.ts:267]

## 设计动机

- **现在有 `ctx.schedule`。** 任务表是 Host-wide；投递仍回到原 Session。工具只挂 root Agent，避免子代理目录里出现提醒管理面。
- **只给 root 装工具。** 给子代理目录突然多出 `schedule_*` 会和委托孩子抢管理面。`agent/created` 过滤器把工具钉在 `roots()`。
- **投递是 framed `followup`，不是第二条 tool call，也不是 `steer`。** 到期要开一轮新 turn 把提醒呈现给用户；`steer` 会挤进正在跑的 step，`inject` 在 idle 上甚至不 wake。framing 把 `prompt` JSON-escape 进固定模板，挡住「提醒正文里伪造 `occurrence_at:` / 新指令」的注入。
- **`every` / `daily` / `weekly` / `cron` 跳过漏掉的 occurrence。** 会话冷了再打开只呈现最新一次，不把 backlog 灌进 inbox。
- **`deliveryMode` 恒 `'host'`。** 任务活在 storage domain；投递仍要原 Session live。进程退出停 timer，不删任务。
- **投递后 `sessions.flush`。** 提醒进 inbox 之后必须有 persistence listener 点头，否则本轮失败。[E: packages/schedule/schedule/src/runtime.ts:124]

## Gotcha

- **有 `ctx.schedule`。** 服务键存在；web 行默认 `disabled`，所以默认 catalog 仍看不到 `schedule_*`。
- **web 有行 ≠ 启用。** `dsh-web-app` insert 了 `schedule` / `ui-schedule` / `time-context`，三行都 disabled。preset 不 remount。`headless` / `sdk` / `acp` 没有这一行。
- **有 runtime owner 的孩子不装。** `roots()` 不含带 owner 的孩子。[E: packages/schedule/schedule/src/index.ts:170]
- **`deliveryMode` 没有第二档。** `scheduleView` 写死 `'host'`。[E: packages/schedule/schedule/src/domain.ts:1854]
- **任务不在 session jsonl。** live 表是 `scheduleDomain`。session 上的历史 `schedule/change` 只作警告，不复活任务。
- **flush 失败不 commit 任务状态。** inbox 里可能已经有 framed 消息；runtime 不把任务标成已投。
- **`every_seconds < 60` 被拒。** 下限是 `MIN_EVERY_INTERVAL_SECONDS`。[E: packages/schedule/schedule/src/domain.ts:37]
- **fork 孩子不自动继承父任务。** live 任务绑的是原 Session id；子会话要提醒，必须自己再 `schedule_create`。
- **本包不挂 `agent/pre-step`。** 若其它插件（例如 goal-round-driver）在那条 waterfall 上 `reject` 且不 `next()`，framed followup 会被 claim 后丢掉，不会变成 `user/message`。那是 inbox / loop 的 veto，不是 Schedule 又投一次的理由。
- **Web 图里的 `ui-schedule` 默认 disabled。** 与 host `schedule` 行一起关掉；UI 包不是模型工具、也不投递。[E: packages/bundle/web-app/cordis.patch.yml:370]

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `ScheduleService` `super(ctx, 'schedule')` → `ctx.schedule`。[E: packages/schedule/schedule/src/index.ts:121] |
| **Provider** | 同包：`scheduleDomain` 任务表 + `ScheduleRuntime` timer。投递后 `sessions.flush`。 |
| **Consumer（同包）** | `registerScheduleTools` 写四条 `schedule_*`；runtime `followup`。 |
| **Consumer（下游）** | `Inbox` / `ReactLoopAgent`：`source.kind === 'schedule'` 的 framed 消息。 |
| **bundle / preset 行** | **host**：`dsh-web-app` `id: schedule` `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:125] preset **无行**。`dsh-base` 无行。 |
| **isolate** | 无。preset 不 remount。`leakedServices` 扫 provided service；本服务若进 preset 且不 isolate 会被拒。[E: packages/preset/agent-preset-registry/src/mount.ts:267] |

换掉 storage / persistence Provider 会带走：任务表是否真落盘、进程重启后能否找回 overdue。不会带走：四条 wire 名、`MIN_EVERY_INTERVAL_SECONDS`、host 投递、untrusted framing。

## Sources

- packages/schedule/schedule/src/index.ts
- packages/schedule/schedule/src/storage.ts
- packages/schedule/schedule/src/domain.ts
- packages/schedule/schedule/src/runtime.ts
- packages/schedule/schedule/src/tools.ts
- packages/schedule/schedule/src/types.ts
- packages/schedule/schedule/src/invariant.ts
- packages/schedule/schedule/package.json
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- packages/core/agent-loop/src/agent.ts
- packages/core/tools/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md) — Cordis 组合主线：`profile → bundle → agent preset`，host 面 vs preset 面。
- [spine.turn-and-step](../../spine/turn-and-step.md) — `followup` 如何变成 turn / `agent/pre-step` waterfall。
- [surface.tools.schedule](../../surface/tools/schedule.md) — `schedule_create` / `list` / `delete` / `update` 的 schema（T1）。
- [subsys.core.agent-inbox](../core/agent-inbox.md) — `followup` / `steer` / `inject` 两条队列与 claim。
- [subsys.core.session](../core/session.md) — append-only log、`sessions.flush`。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — shipped `dsh-base` 真树（不含本包）。
