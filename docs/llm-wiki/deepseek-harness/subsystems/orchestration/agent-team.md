---
id: subsys.orchestration.agent-team
title: experimental Agent Teams 缝
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/experimental/agent-team/src/index.ts
  - packages/experimental/agent-team/src/types.ts
  - packages/experimental/agent-team/src/roster.ts
  - packages/experimental/agent-team/src/mailbox.ts
  - packages/experimental/agent-team/src/task-board.ts
  - packages/experimental/agent-team/src/task-graph.ts
  - packages/experimental/agent-team/src/journal.ts
  - packages/experimental/agent-team/src/projection.ts
  - packages/experimental/agent-team/src/lifecycle.ts
  - packages/experimental/agent-team/src/activity.ts
  - packages/experimental/agent-team/src/error.ts
  - packages/experimental/agent-team/package.json
  - packages/experimental/agent-team/tests/team.spec.ts
  - packages/experimental/tool-agent-team/src/index.ts
  - packages/experimental/tool-agent-team/package.json
  - packages/experimental/agent-team-profile/cordis.patch.yml
  - packages/experimental/agent-team-profile/package.json
  - packages/experimental/agent-team-profile/src/index.ts
  - packages/experimental/agent-team-profile/tests/profile.spec.ts
symbols:
  - ctx.agentTeams
  - TeamService
  - TeamRoster
  - TeamMailbox
  - TeamTaskBoard
  - TeamJournal
  - TeamError
  - teamProjectionDefinition
related:
  - spine.capability-seams
  - spine.trace-subagent
  - subsys.orchestration.subagent
  - surface.tools.agent-team
  - surface.tools.subagent-control
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - ref.ctx-keys
  - ref.session-events
evidence: explicit
status: verified
updated: c291e7961a
---

> `ctx.agentTeams`（`TeamService`）是 **opt-in experimental** 的 implicit-root 协作缝：每个 live 顶层 Session 即一个 Team（`TeamId` = Lead Session id），durable roster / mailbox / shared task DAG 全部写在 **Lead Session log**，成员孩子通过 [subsys.orchestration.subagent](subagent.md)（`subsys.orchestration.subagent`）的 `startContinuable` 拉起。不在 `dsh-base`；要叠 `@deepseek-ai/dsh-experimental-agent-team-profile` 的 patch。

## 能回答的问题

- `ctx.agentTeams` 由哪个包 `provide`？默认 shipped bundle 装不装？
- Team 身份怎么从 live `Agent` 推出？非 roster 的 continuable 孩子会不会被当成 Lead？
- spawn teammate 怎么落到 `ctx.subagents.startContinuable`？`fresh` / `fork` 分别选哪个 provider 名？
- mailbox 先落盘再投递；`send_message` quiet 与 `followup_task` wakeup 差在哪？
- 共享任务 CAS / 依赖环 / write-scope 是不是锁？
- experimental profile 为什么 disable `tool-subagent-control` / `list-agents` / `report`？

## 职责边界

`@deepseek-ai/dsh-experimental-agent-team` 拥有：host 键 `ctx.agentTeams`、`TeamService` façade、Lead-log journal、`agentTeam` projection、roster 生命周期、durable mailbox、task board、`TeamError`、Remote 读/写（`view` / `createTask` / `updateTask`）。包名在 manifest。[E: packages/experimental/agent-team/package.json:2] 构造占键 `agentTeams`。[E: packages/experimental/agent-team/src/index.ts:81]

本包**不**拥有：

- continuable 孩子的 provider / depth / descriptor / inbox 实现 — [subsys.orchestration.subagent](subagent.md)。本缝只调用 `startContinuable` / `drainContinuableChildren`。[E: packages/experimental/agent-team/src/roster.ts:281]
- 模型可见工具字段表 — [surface.tools.agent-team](../../surface/tools/agent-team.md)（`surface.tools.agent-team`）。Consumer 包 `@deepseek-ai/dsh-experimental-tool-agent-team`。[E: packages/experimental/tool-agent-team/package.json:2]
- 全局 continuable 控制工具 `send_message` / `interrupt_agent` / `list_agents` 的 **subagent-control 实现** — [surface.tools.subagent-control](../../surface/tools/subagent-control.md)。Teams profile **关掉**那三行再由 Team 工具同名重挂。[E: packages/experimental/agent-team-profile/cordis.patch.yml:5]
- `ctx.jobs`、workflow、goal、plan。
- 四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）默认不 insert 本缝。`packages/bundle/**` 里没有 `agent-team` 行。

DSH 宿主入口仍是 `dsh web` 以及 `dsh --profile headless|sdk|sdk-minimal|acp`。Agent Teams 是叠加在 **dsh-base 之后** 的 private profile bundle，不是第五个 shipped preset。[E: packages/experimental/agent-team-profile/package.json:2] [E: packages/experimental/agent-team-profile/package.json:5]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/experimental/agent-team/src/index.ts` | Definition：`TeamService`、`Context.agentTeams`、inject、Remote |
| `packages/experimental/agent-team/src/types.ts` | `TeamId` / snapshots / Config / SessionEventMap `team/*` |
| `packages/experimental/agent-team/src/roster.ts` | implicit Lead、spawn、interrupt、drain |
| `packages/experimental/agent-team/src/mailbox.ts` | enqueue → dispatch → `team/message/delivered` |
| `packages/experimental/agent-team/src/task-board.ts` | DAG + CAS mutations |
| `packages/experimental/agent-team/src/journal.ts` | per-Lead serial `transact` + `appendAndFlush` |
| `packages/experimental/agent-team/src/projection.ts` | key `agentTeam`，`stateVersion: 2` |
| `packages/experimental/agent-team-profile/cordis.patch.yml` | opt-in 组合：disable 全局 control、insert 两包 |
| `packages/experimental/tool-agent-team/src/index.ts` | 按 Agent scope 安装 Team 工具 + `team:policy` section |

## 数据模型

| 符号 | 要点 |
|---|---|
| `TeamService` | `extends TypertRemoteService`；`static inject = ['agents','sessions','sessionPersistence','sessionProjections','subagents']`。[E: packages/experimental/agent-team/src/index.ts:60] |
| `Config` | `maxMembers` 默认 8、`maxTasks` 256、`maxPendingMessagesPerMember` 64、`maxMessageBytes` 65536、`disposalTimeoutMs` 5000。[E: packages/experimental/agent-team/src/index.ts:44] [E: packages/experimental/agent-team/src/index.ts:62] |
| `TeamId` | 根 Session id 的 brand；没有单独的 Team 资源表。[E: packages/experimental/agent-team/src/types.ts:15] |
| `TeamMembership` | `{ root, id, role: lead\|teammate, name }`。Lead 伪行 `name: 'lead'`。[E: packages/experimental/agent-team/src/roster.ts:29] |
| `TeamMemberPhase` | durable：`provisioning` / `active` / `failed`。[E: packages/experimental/agent-team/src/types.ts:44] |
| `TeamMemberView.status` | runtime：另加 `running` / `idle` / `inactive`。[E: packages/experimental/agent-team/src/types.ts:62] |
| `TeamTaskSnapshot` | 整值；每次 mutation `revision++`。[E: packages/experimental/agent-team/src/types.ts:74] |
| `TeamTaskAction` | `claim` / `release` / `edit` / `set_dependencies` / `complete` / `reopen` / `reassign` / `delete`。[E: packages/experimental/agent-team/src/types.ts:182] |
| `writeScopes` | 顾问前缀重叠检测，**不是** FS lock。[E: packages/experimental/agent-team/src/task-board.ts:21] |
| Session events | 只落 Lead：`team/member`、`team/task`、`team/message/queued`、`team/message/delivered`。[E: packages/experimental/agent-team/src/types.ts:223] |
| `TeamMessageSource` | 目标 Session 上 `user/message` 的 `source.kind: 'team-message'`，用于去重。[E: packages/experimental/agent-team/src/types.ts:117] |
| `teamProjectionDefinition` | `key: 'agentTeam'`，`stateVersion: 2`。[E: packages/experimental/agent-team/src/projection.ts:309] |
| `TeamError` | `HarnessError` 子类。[E: packages/experimental/agent-team/src/error.ts:7] |

## 控制流

1. **默认树没有本缝。** `dsh-base` / shipped preset **不** insert `id: agent-team`。要开 Teams，叠 private bundle `@deepseek-ai/dsh-experimental-agent-team-profile`（`dsh.bundle.patch` → `./cordis.patch.yml`）。[E: packages/experimental/agent-team-profile/package.json:36] 测试钉 `private: true` 且无 `publishConfig`。[E: packages/experimental/agent-team-profile/tests/profile.spec.ts:19]

2. **profile patch 先腾出同名工具。** disable `tool-subagent-control` / `tool-subagent-list-agents`。[E: packages/experimental/agent-team-profile/cordis.patch.yml:5] [E: packages/experimental/agent-team-profile/cordis.patch.yml:8] 不再 disable 已删除的 `tool-subagent-report`。把 host 上 `tool-subagent` / `tool-subagent-fork` 钉成 `backgroundMode: one-shot`（保留模型 `subagent` / `subagent_fork`，避免与 Teams 的 durable 孩子抢 continuable 控制面）。[E: packages/experimental/agent-team-profile/cordis.patch.yml:15] [E: packages/experimental/agent-team-profile/cordis.patch.yml:21] 然后 insert `id: agent-team`（服务）与 `id: tool-agent-team`（`freshProvider: spawn`，`forkProvider: fork`）。[E: packages/experimental/agent-team-profile/cordis.patch.yml:25] [E: packages/experimental/agent-team-profile/cordis.patch.yml:33]

3. **`TeamService` 占键并挂副作用。** `super(ctx, 'agentTeams')`。[E: packages/experimental/agent-team/src/index.ts:81] 组装 `TeamActivity` / `TeamRuntimeLifecycle` / `TeamJournal` / `TeamRoster` / `TeamMailbox` / `TeamTaskBoard`。[E: packages/experimental/agent-team/src/index.ts:96] 监听 `session/event`（mailbox ack）、`agent/session-start`（recovery）、`agent/status`（waiter 唤醒）。[E: packages/experimental/agent-team/src/index.ts:110] `ctx.effect` 在 root 登记 `teamProjectionDefinition`，卸载时 `disposeRuntime`。[E: packages/experimental/agent-team/src/index.ts:117]

4. **implicit root：任意 live Agent 默认是自己的 Lead，除非它是 roster 里的 continuable 孩子。** `tryMembership`：有 `parentSession` 且父 live，则在父 journal 里找 `agent.id`；`active`/`provisioning` → teammate。[E: packages/experimental/agent-team/src/roster.ts:99] 带 subagent descriptor 的非 roster 直系孩子 **不是** teammate，也 **不是** 新 Team（避免普通 `subagent`/`fork` 被当成 Lead）。[E: packages/experimental/agent-team/src/roster.ts:106] 无 parent 但带 descriptor 同样拒绝当根。[E: packages/experimental/agent-team/src/roster.ts:114] 否则 `{ role: 'lead', name: 'lead' }`。[E: packages/experimental/agent-team/src/roster.ts:114]

5. **`spawnTeammate` 只允许 Lead。** `TEAM_LEAD_REQUIRED`。[E: packages/experimental/agent-team/src/roster.ts:251] 名字 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。先 `transact` 写 `team/member` `phase: provisioning`（重名 `TEAM_MEMBER_NAME_TAKEN`，超额 `TEAM_MEMBER_LIMIT`）。[E: packages/experimental/agent-team/src/roster.ts:277] 再 `ctx.subagents.startContinuable({ childId, provider, label, request: { prompt, parent: root } })`。[E: packages/experimental/agent-team/src/roster.ts:281] **不**把 `context: fresh|fork` 传给 subagent 缝：fresh/fork 只决定工具选 `freshProvider` 还是 `forkProvider`。[E: packages/experimental/tool-agent-team/src/index.ts:195] inbox 接受初始 prompt 并 flush 后才把 durable phase 改 `active`；失败记 `failed` 并 `drainContinuableChildren`。[E: packages/experimental/agent-team/src/roster.ts:292] [E: packages/experimental/agent-team/src/roster.ts:300]

6. **mailbox：先 Lead-log enqueue，再尝试投到目标 Session。** `send` 走 `TeamMailbox.send`。[E: packages/experimental/agent-team/src/index.ts:163] 禁止自发 (`TEAM_SELF_MESSAGE`)，pending 超额 `TEAM_MAILBOX_FULL`，字节超额 `TEAM_MESSAGE_TOO_LARGE`。[E: packages/experimental/agent-team/src/mailbox.ts:121] 先 `appendAndFlush` `team/message/queued`。[E: packages/experimental/agent-team/src/mailbox.ts:141] 立即 dispatch 成功 → `accepted`，否则 `queued`（已经 durable，工具文案禁止重发）。[E: packages/experimental/agent-team/src/mailbox.ts:150] 目标 `user/message` 带 `source.kind === 'team-message'` 时观察者写 `team/message/delivered`。[E: packages/experimental/agent-team/src/mailbox.ts:69] `delivery: 'quiet'` 不唤醒 idle 成员；`'wakeup'` 才跟 turn。工具层：`send_message` → quiet，`followup_task` → wakeup。[E: packages/experimental/tool-agent-team/src/index.ts:222]

7. **task board 是 Lead-log 上的 CAS DAG。** `create` 生成 `task-${nextTaskNumber}`，`status: pending`，无 owner。[E: packages/experimental/agent-team/src/task-board.ts:56] 图违规：缺 blocker `TEAM_TASK_NOT_FOUND`、重复 `TEAM_INVALID_ARGUMENT`、环 `TEAM_TASK_DEPENDENCY_CYCLE`。[E: packages/experimental/agent-team/src/task-board.ts:25] `update` 要求 `expectedRevision`；不匹配 `TEAM_TASK_STALE_REVISION`（Remote 映射 `team-task-conflict`）。[E: packages/experimental/agent-team/src/index.ts:281] `claim` 需要 ready；`reassign` 仅 Lead。[E: packages/experimental/agent-team/src/task-board.ts:137] [E: packages/experimental/agent-team/src/task-board.ts:177] `writeScopes` 只产生 `writeScopeWarnings`，不挡 FS。

8. **`waitForChange` 不唤醒任何人。** 服务层 timeout 必须 ∈ [10000, 3600000]。[E: packages/experimental/agent-team/src/index.ts:213] [E: packages/experimental/agent-team/src/activity.ts:23] 工具 `wait_agent` 在合法 timeout 下若没有其他 `running`/`provisioning` 成员，**同步**返回 `noProgress.reason: 'no-active-peer'`，不进 waiter。[E: packages/experimental/tool-agent-team/src/index.ts:259] 唤醒源：journal commit、`agent/status`。

9. **模型工具只装在 **确切** Team member 的 Agent scope。** `tool-agent-team.apply` 对 `ctx.agents.list()` + 后续 `agent/created` 调 `tryMembership`；非成员不装。[E: packages/experimental/tool-agent-team/src/index.ts:405] `systemPrompt.section` 名 `team:policy`。[E: packages/experimental/tool-agent-team/src/index.ts:165] `agent/disposed` 卸工具。[E: packages/experimental/tool-agent-team/src/index.ts:410]

10. **recovery / 卸载。** `agent/session-start` microtask：`roster.recoverFor` 再 `mailbox.recoverFor`。[E: packages/experimental/agent-team/src/index.ts:301] dispose：关 lifecycle + waiters，settle in-flight spawn/dispatch，再 `stopTeammates` drain 所有 live 孩子。[E: packages/experimental/agent-team/src/index.ts:306]

## 模型可见工具名（Consumer 包；字段权威在 `surface.tools.agent-team`）

| name | 谁可调 | 服务方法 |
|---|---|---|
| `spawn_teammate` | Lead | `spawnTeammate` |
| `send_message` | 成员 | `sendMessage` (`quiet`) |
| `followup_task` | 成员 | `sendMessage` (`wakeup`) |
| `list_agents` | 成员 | `listMembers` |
| `wait_agent` | 成员 | `waitForChange`（可短路 noProgress） |
| `interrupt_agent` | Lead | `interrupt` |
| `team_task_create` | 成员 | `createTask` |
| `team_task_list` | 成员 | `listTasks` + 工具侧 filter/page |
| `team_task_get` | 成员 | `getTask` |
| `team_task_update` | 成员（部分 action 需 owner/Lead） | `updateTask` |

注册点：`packages/experimental/tool-agent-team/src/index.ts` 的 `defineTool({ name: ... })`（`spawn_teammate` [E: packages/experimental/tool-agent-team/src/index.ts:174] 到 `team_task_update` [E: packages/experimental/tool-agent-team/src/index.ts:357]）。同名 `list_agents` / `send_message` / `interrupt_agent` 与 subagent-control **互斥**，靠 profile disable 全局行。

## 设计动机

- **叠 continuable，不另做孩子运行时。** 身份、inbox、cold resume、depth 已在 `ctx.subagents`。Teams 只加「Lead 日志上的共享世界」：roster 名、peer mailbox、task DAG。
- **Team 不是显式资源。** 每个顶层 Session 自动是 Lead；省掉 create_team 工具，也避免第二份 id 空间。
- **先 journal 再副作用。** spawn 先 `provisioning` 行、消息先 `queued`、任务整值 CAS。进程崩溃后 recovery 重投 mailbox，不靠内存队列当真相。
- **工具同名必须腾位。** 模型已经认识 `list_agents` / `send_message`。Teams 语义不同（roster 名 vs continuable childId），不能两套并存。

## Gotcha

- **不在 `dsh-base`。** 仓库有三个 experimental 包 ≠ 产品默认开。要 patch 叠在 base 之后。[E: packages/experimental/agent-team-profile/cordis.patch.yml:1]
- `startContinuable` 的 `childId` 由 Teams 预生成 UUID，再写入 roster，不是等 subagent 分配。[E: packages/experimental/agent-team/src/roster.ts:258]
- `context: fork` 只换 `fork` provider；seed/completed-prefix 行为属于 fork provider 页，不在本包。[E: packages/experimental/tool-agent-team/src/index.ts:27]
- 带 subagent descriptor 的普通孩子不会变成 teammate，也不会变成新 Lead。[E: packages/experimental/agent-team/src/roster.ts:106]
- `wait_agent` 永不唤醒；没有 running/provisioning peer 时工具层直接 `noProgress`。[E: packages/experimental/tool-agent-team/src/index.ts:237]
- `writeScopes` 警告 ≠ 锁。POLICY 要求模型自己拆写范围并用 `FS_STALE_VERSION` 重试。[E: packages/experimental/tool-agent-team/src/index.ts:31]
- Remote `createTask`/`updateTask` 把 `TeamError` 收成 `{ ok: false }`；`TEAM_TASK_STALE_REVISION` 单独码 `team-task-conflict`。[E: packages/experimental/agent-team/src/index.ts:273]
- profile 包 `src/index.ts` **没有运行时 API**（`export {}`）。[E: packages/experimental/agent-team-profile/src/index.ts:8]
- 四个 shipped preset 目录仍是 `minimal` / `standard` / `ptc` / `cordis`；Teams 不是其中之一。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `@deepseek-ai/dsh-experimental-agent-team`。`TeamService` `super(ctx, 'agentTeams')`。plugin `Config` 五个 limit。无 `agentTeams/*` waterfall。 |
| **Provider** | **无第二实现。** 孩子 transport 复用 `ctx.subagents` 已登记的 `spawn` / `fork`（以及将来按名选的其它 continuable provider）。卸掉 `agentTeams` = roster/mailbox/board 全没。 |
| **Consumer（模型）** | `@deepseek-ai/dsh-experimental-tool-agent-team`：`inject = ['agents','agentTeams','tools','systemPrompt']`。[E: packages/experimental/tool-agent-team/src/index.ts:14] 字段表在 `surface.tools.agent-team`。 |
| **Consumer（组合）** | `@deepseek-ai/dsh-experimental-agent-team-profile` 的 `cordis.patch.yml`：disable 全局 control/report，insert 服务+工具。 |
| **isolate** | 服务必须与 `subagents` / persistence / projections **同在 host 面**。按会话 isolate `agentTeams` 会得到空 journal 且看不见 continuable 孩子。 |

换掉 `spawn`/`fork` provider 会带走：孩子是否看见 Lead 对话、能否 continuable、是否同进程。Team 工具名与 Lead-log 事件形状不变。

## Sources

- packages/experimental/agent-team/src/index.ts
- packages/experimental/agent-team/src/types.ts
- packages/experimental/agent-team/src/roster.ts
- packages/experimental/agent-team/src/mailbox.ts
- packages/experimental/agent-team/src/task-board.ts
- packages/experimental/agent-team/src/task-graph.ts
- packages/experimental/agent-team/src/journal.ts
- packages/experimental/agent-team/src/projection.ts
- packages/experimental/agent-team/src/lifecycle.ts
- packages/experimental/agent-team/src/activity.ts
- packages/experimental/agent-team/src/error.ts
- packages/experimental/agent-team/package.json
- packages/experimental/agent-team/tests/team.spec.ts
- packages/experimental/tool-agent-team/src/index.ts
- packages/experimental/tool-agent-team/package.json
- packages/experimental/agent-team-profile/cordis.patch.yml
- packages/experimental/agent-team-profile/package.json
- packages/experimental/agent-team-profile/src/index.ts
- packages/experimental/agent-team-profile/tests/profile.spec.ts

## 相关

- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）— `ctx.agentTeams` 在缝表里。
- [spine.trace-subagent](../../spine/trace-subagent.md)（`spine.trace-subagent`）— continuable 孩子走读。
- [subsys.orchestration.subagent](subagent.md)（`subsys.orchestration.subagent`）— `startContinuable` 权威。
- [surface.tools.agent-team](../../surface/tools/agent-team.md)（`surface.tools.agent-team`）— 模型工具字段。
- [surface.tools.subagent-control](../../surface/tools/subagent-control.md)（`surface.tools.subagent-control`）— 被 profile disable 的同名全局工具。
- [surface.tools.subagent](../../surface/tools/subagent.md) / [surface.tools.subagent-fork](../../surface/tools/subagent-fork.md) — Teams profile 把它们钉 one-shot。
- [ref.ctx-keys](../../reference/ctx-keys.md)（`ref.ctx-keys`）/ [ref.session-events](../../reference/session-events.md)（`ref.session-events`）— 键与 `team/*` 事件。
