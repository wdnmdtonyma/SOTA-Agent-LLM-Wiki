---
id: surface.tools.agent-team
title: Agent Teams 模型可见工具族
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/experimental/tool-agent-team/src/index.ts
  - packages/experimental/tool-agent-team/package.json
  - packages/experimental/tool-agent-team/tests/tool-team.spec.ts
  - packages/experimental/agent-team/src/index.ts
  - packages/experimental/agent-team/package.json
  - packages/experimental/agent-team-profile/cordis.patch.yml
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/system-prompt/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
symbols:
  - name
  - inject
  - Config
  - apply
  - spawn_teammate
  - send_message
  - list_agents
  - wait_agent
  - interrupt_agent
  - team_task_create
  - team_task_list
  - team_task_get
  - team_task_update
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - surface.tools.subagent-control
  - subsys.orchestration.agent-team
  - subsys.orchestration.subagent
evidence: explicit
status: verified
updated: 477b4f4205
---

> opt-in experimental 家族：插件 `tool-agent-team`（包 `@deepseek-ai/dsh-experimental-tool-agent-team`）在**每个 Team 成员的 `agent.ctx`** 上注册九个 model-visible 名，全部转发 `ctx.agentTeams`。不是 shipped `minimal` / `standard` / `ptc` / `cordis` 的默认 catalog；也不是全局 `dsh-tool-subagent-control` 那套同名 control。

## 能回答的问题

- Agent Teams 九个 wire 名各自干什么、schema 字段是什么、默认 Config 会不会改名？
- 工具挂在 root `ctx.tools` 还是成员 `agent.ctx`？无 `exec.agent` 时为什么是 unknown tool？
- `send_message` / `list_agents` / `interrupt_agent` 与 [subagent-control.md](subagent-control.md) 同名如何避免撞车？
- `wait_agent` 何时立刻 `noProgress`、何时把非法 `timeout_ms` 交给服务校验？
- 四个 shipped preset 装不装本包？`agent-team-profile` 怎样 `disabled` 全局 continuable control？

## Identity

实现包 `@deepseek-ai/dsh-experimental-tool-agent-team`；Cordis 插件名 `tool-agent-team`；`inject` 为 `['agents', 'agentTeams', 'tools', 'systemPrompt']`。[E: packages/experimental/tool-agent-team/package.json:2] [E: packages/experimental/tool-agent-team/src/index.ts:14] [E: packages/experimental/tool-agent-team/src/index.ts:14]

无 `default` export；测试钉死 `name` / `inject`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:716] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:717] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:718]

`Config`（Loader + `apply` 第二参）：`freshProvider` 默认 `'spawn'`，`forkProvider` 默认 `'fork'`。只影响 `spawn_teammate` 选 continuable provider，**不改 wire 名**。[E: packages/experimental/tool-agent-team/src/index.ts:25] [E: packages/experimental/tool-agent-team/src/index.ts:26] [E: packages/experimental/tool-agent-team/src/index.ts:27] [E: packages/experimental/tool-agent-team/src/index.ts:410] [E: packages/experimental/tool-agent-team/src/index.ts:412] [E: packages/experimental/tool-agent-team/src/index.ts:412]

`apply` 对 `ctx.agents.list()` 与后续 `agent/created` 调用 `maybeInstall`：仅当 `ctx.agentTeams.tryMembership(agent)` 有值才 `install`；`agent/disposed` 卸 scoped 注册；fiber `effect` 清全部。[E: packages/experimental/tool-agent-team/src/index.ts:409] [E: packages/experimental/tool-agent-team/src/index.ts:416] [E: packages/experimental/tool-agent-team/src/index.ts:419] [E: packages/experimental/tool-agent-team/src/index.ts:420] [E: packages/experimental/tool-agent-team/src/index.ts:421]

`install` 用 `agent.ctx`（`scoped`）注册 prompt section 与全部工具，**不是** root registry。[E: packages/experimental/tool-agent-team/src/index.ts:164] [E: packages/experimental/tool-agent-team/src/index.ts:165]

测试枚举的九个 wire 名（排序后与 `TOOL_NAMES` 一致）：[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:33]

| wire `name` | 角色 | 工厂 |
|---|---|---|
| `spawn_teammate` | Lead 拉起一名 durable teammate | `defineTool({ name: 'spawn_teammate', ... })` [E: packages/experimental/tool-agent-team/src/index.ts:176] |
| `send_message` | 投 durable 消息：running 在最近 step 边界收下，inactive 会 start/resume | `name: 'send_message'` [E: packages/experimental/tool-agent-team/src/index.ts:216] |
| `list_agents` | 列 Lead + 全体 teammate | `name: 'list_agents'` [E: packages/experimental/tool-agent-team/src/index.ts:233] |
| `wait_agent` | 等下一次 Team 域变化 | `name: 'wait_agent'` [E: packages/experimental/tool-agent-team/src/index.ts:243] |
| `interrupt_agent` | Lead 打断一名 teammate 当前轮 | `name: 'interrupt_agent'` [E: packages/experimental/tool-agent-team/src/index.ts:278] |
| `team_task_create` | 共享任务板上建未认领 pending | `name: 'team_task_create'` [E: packages/experimental/tool-agent-team/src/index.ts:290] |
| `team_task_list` | 过滤 + cursor 分页列出任务 | `name: 'team_task_list'` [E: packages/experimental/tool-agent-team/src/index.ts:314] |
| `team_task_get` | 读单任务最新视图 | `name: 'team_task_get'` [E: packages/experimental/tool-agent-team/src/index.ts:346] |
| `team_task_update` | CAS 状态机 | `name: 'team_task_update'` [E: packages/experimental/tool-agent-team/src/index.ts:361] |

durable / 授权关系归 Team **服务**。

`send_message` / `list_agents` / `interrupt_agent` **名字**与 [subagent-control.md](subagent-control.md) 重叠。Team 版本只在 member scope 可见；测试：装 Team 时 schema 含 `target`、不含 `subagent_id`；卸 Team fiber 后全局 control 仍是 `subagent_id`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:629] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:634] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:634] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:378]

无 calling Agent 时 root 上没有这些名字：`list_agents` → `unknown tool "list_agents"`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:714] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:715] `callingAgent` 仍是 scoped execute 的硬门。[E: packages/experimental/tool-agent-team/src/index.ts:159]

同 scope 撞名会回滚已装 section/工具：测试先占 `spawn_teammate`，再 `plugin(toolTeam)` 抛 `already registered`，prompt 不含 `Your Team role is lead`。[E: packages/experimental/tool-agent-team/src/index.ts:402] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:650] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:655]

## 用途定位

系统段 `team:policy`（order `TEAM_POLICY` = 600）注入共享协作政策，并追加 `Your Team role is …; your Team name is …; Team id is …`。[E: packages/experimental/tool-agent-team/src/index.ts:169] [E: packages/experimental/tool-agent-team/src/index.ts:171] [E: packages/experimental/tool-agent-team/src/index.ts:169] [E: packages/core/system-prompt/src/index.ts:129] 测试钉政策含「用户明确要求才建队友」、`FS_STALE_VERSION`、`noProgress`、Lead/teammate 角色句。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:223] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:229] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:244]

| 工具 | 模型该用它做什么 | 明确不做什么 |
|---|---|---|
| `spawn_teammate` | 仅 Lead：按 unique kebab-case 名建 continuable 队友 | teammate 调会失败（文案含 `only the Team Lead`）[E: packages/experimental/tool-agent-team/src/index.ts:177] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:251] |
| `send_message` | 给另一成员投 durable 信息；running 在最近 step 边界收下，inactive 会 start/resume | 不是 subagent-control 的 `subagent_id` 通道；**没有**独立的 `followup_task` [E: packages/experimental/tool-agent-team/src/index.ts:217] |
| `list_agents` | 列 Lead + durable teammate 的 runtime 状态 | 不是 subagent `listChildren`；无 `scope` 参数 [E: packages/experimental/tool-agent-team/src/index.ts:233] [E: packages/experimental/tool-agent-team/src/index.ts:235] |
| `wait_agent` | 等本调用**开始之后**的状态/邮箱/任务变化 | **从不**唤醒 inactive；无活跃 peer 立刻 `noProgress` [E: packages/experimental/tool-agent-team/src/index.ts:244] |
| `interrupt_agent` | 仅 Lead：打断一名 teammate 当前轮，保留 inbox | 不能对 Lead 自己；参数是 **target** 不是 session id [E: packages/experimental/tool-agent-team/src/index.ts:278] [E: packages/experimental/tool-agent-team/src/index.ts:281] |
| `team_task_*` | 共享任务板：建 / 列 / 读 / CAS | `ready` 不会自动启动 owner（政策句）[E: packages/experimental/tool-agent-team/src/index.ts:31] |

创建队友走 `ctx.agentTeams.spawnTeammate`，底层仍是 continuable `ctx.subagents`（provider 名由 Config 选）。服务合同权威在 [subsys.orchestration.agent-team](../../subsystems/orchestration/agent-team.md)。Team profile 把 `tool-subagent` / `tool-subagent-fork` **整行 disabled**，不进本页九名。[E: packages/experimental/agent-team-profile/cordis.patch.yml:10] [E: packages/experimental/agent-team-profile/cordis.patch.yml:13]

## 输入 schema

无 Config 改广告。`defineTool` 先 `validateJsonSchemaValue`。[E: packages/core/tools/src/schema.ts:579]

### `spawn_teammate`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `name` | `string` | 是 | 无 | kebab-case unique | teammate 名 [E: packages/experimental/tool-agent-team/src/index.ts:179] |
| `description` | `string` | 是 | 无 | | 职责短描述 [E: packages/experimental/tool-agent-team/src/index.ts:180] |
| `prompt` | `string` | 是 | 无 | | 初始任务全文，execute 收成单 text 块 [E: packages/experimental/tool-agent-team/src/index.ts:181] [E: packages/experimental/tool-agent-team/src/index.ts:193] |
| `context` | `string` | 否 | `'fresh'` | enum `fresh` \| `fork` | `fork` 用 `forkProvider`，否则 `freshProvider` [E: packages/experimental/tool-agent-team/src/index.ts:182] [E: packages/experimental/tool-agent-team/src/index.ts:191] [E: packages/experimental/tool-agent-team/src/index.ts:208] |

### `send_message`

没有 `followup_task`。`send_message` 自己既投递又按目标状态决定是否开一轮。[E: packages/experimental/tool-agent-team/src/index.ts:217]

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `target` | `string` | 是 | 成员名或 `lead` [E: packages/experimental/tool-agent-team/src/index.ts:219] |
| `message` | `string` | 是 | 自包含文本 [E: packages/experimental/tool-agent-team/src/index.ts:220] |

### `list_agents`

`parameters: {}`。[E: packages/experimental/tool-agent-team/src/index.ts:235]

### `wait_agent`

| 字段 | 类型 | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `timeout_ms` | `integer` | 否 | `30_000` | 合法窗口 10000–3600000；非法值**不**走 no-progress 捷径，交给 `waitForChange` 抛错 [E: packages/experimental/tool-agent-team/src/index.ts:246] [E: packages/experimental/tool-agent-team/src/index.ts:254] [E: packages/experimental/tool-agent-team/src/index.ts:257] |

### `interrupt_agent`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `target` | `string` | 是 | **Teammate target** [E: packages/experimental/tool-agent-team/src/index.ts:281] |

### `team_task_create`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `subject` | `string` | 是 | 标题 [E: packages/experimental/tool-agent-team/src/index.ts:299] |
| `description` | `string` | 是 | 细节与验收 [E: packages/experimental/tool-agent-team/src/index.ts:291] |
| `blocked_by` | `string[]` | 否 | 先完成的 task id；map `TeamTaskId` [E: packages/experimental/tool-agent-team/src/index.ts:291] [E: packages/experimental/tool-agent-team/src/index.ts:314] |
| `write_scopes` | `string[]` | 否 | 建议写前缀，非锁 [E: packages/experimental/tool-agent-team/src/index.ts:292] |

### `team_task_list`

| 字段 | 类型 | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `status` | `string` | 否 | 不过滤 | enum `pending` \| `in_progress` \| `completed`（无 `deleted`）[E: packages/experimental/tool-agent-team/src/index.ts:324] |
| `owner` | `string` | 否 | 不过滤 | 成员名；字面量 `unowned` 表示无 owner [E: packages/experimental/tool-agent-team/src/index.ts:329] [E: packages/experimental/tool-agent-team/src/index.ts:339] |
| `ready` | `boolean` | 否 | 不过滤 | [E: packages/experimental/tool-agent-team/src/index.ts:330] |
| `cursor` | `integer` | 否 | `0` | 非负 safe integer，否则抛错 [E: packages/experimental/tool-agent-team/src/index.ts:331] [E: packages/experimental/tool-agent-team/src/index.ts:334] |
| `limit` | `integer` | 否 | `50` | 1–100 [E: packages/experimental/tool-agent-team/src/index.ts:332] [E: packages/experimental/tool-agent-team/src/index.ts:334] |

测试：`cursor: -1` / `limit: 101` → `isError`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:565] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:566]

### `team_task_get`

| 字段 | 类型 | 必填 |
|---|---|---|
| `task_id` | `string` | 是 [E: packages/experimental/tool-agent-team/src/index.ts:355] |

### `team_task_update`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_id` | `string` | 是 | [E: packages/experimental/tool-agent-team/src/index.ts:372] |
| `expected_revision` | `integer` | 是 | CAS 前置 [E: packages/experimental/tool-agent-team/src/index.ts:372] |
| `action` | `string` | 是 | enum `claim` \| `release` \| `edit` \| `set_dependencies` \| `complete` \| `reopen` \| `reassign` \| `delete` [E: packages/experimental/tool-agent-team/src/index.ts:373] |
| `subject` / `description` / `write_scopes` | | 否 | `edit` 用 [E: packages/experimental/tool-agent-team/src/index.ts:368] |
| `blocked_by` | `string[]` | 否 | `set_dependencies` [E: packages/experimental/tool-agent-team/src/index.ts:381] |
| `owner` | `string` | 否 | Lead-only `reassign`；省略则 unassign [E: packages/experimental/tool-agent-team/src/index.ts:383] |

过期 revision：`stale team task`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:512]

## 输出 & 截断 / spill

全部 `jsonOutput`：`render` = `JSON.stringify(value)`，无缩进、无 spill、无 `presentCall`。[E: packages/experimental/tool-agent-team/src/index.ts:151] [E: packages/experimental/tool-agent-team/src/index.ts:152] 测试钉 roster 文本等于 `JSON.stringify(JSON.parse(...))`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:481]

| 工具 | `output.schema` 要点 | 成功 `value` |
|---|---|---|
| `spawn_teammate` | `{ member: MEMBER_VIEW }` | `{ member }` [E: packages/experimental/tool-agent-team/src/index.ts:86] |
| `send_message` | `messageId` + `status` ∈ `{accepted, queued}` | [E: packages/experimental/tool-agent-team/src/index.ts:96] |
| `list_agents` | `MEMBER_VIEW` 数组 | Lead + teammates [E: packages/experimental/tool-agent-team/src/index.ts:94] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:474] |
| `wait_agent` | `timedOut`；可选 `noProgress.reason = no-active-peer` | 无活跃 peer 时 `timedOut: false` + 固定 message [E: packages/experimental/tool-agent-team/src/index.ts:106] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:434] |
| `interrupt_agent` | `previousStatus` ∈ `{running, inactive}`（无 `idle`） | [E: packages/experimental/tool-agent-team/src/index.ts:126] |
| `team_task_create` / `get` / `update` | `TASK_VIEW` | [E: packages/experimental/tool-agent-team/src/index.ts:69] |
| `team_task_list` | `{ tasks, nextCursor? }` | 有下一页才带 `nextCursor` [E: packages/experimental/tool-agent-team/src/index.ts:130] [E: packages/experimental/tool-agent-team/src/index.ts:347] |

`MEMBER_VIEW`：`id`/`name`/`role`(`lead`\|`teammate`)/`status`(`running`\|`idle`\|`inactive`\|`provisioning`\|`failed`)/`diagnostics` 必填；Lead 伪行可省 teammate-only 字段。[E: packages/experimental/tool-agent-team/src/index.ts:47] [E: packages/experimental/tool-agent-team/src/index.ts:73]

抛错由 registry 收成 `isError` + `Error: ${message}`。[E: packages/core/tools/src/index.ts:1865] [E: packages/core/tools/src/index.ts:1915]

## 背后的 seam

| 角色 | 实体 | 本家族怎么用 |
|---|---|---|
| Definition | `ctx.agentTeams` / `TeamService`（`super(ctx, 'agentTeams')`） | 所有 execute 只把 `callingAgent(exec.agent)` 交给服务方法 [E: packages/experimental/agent-team/src/index.ts:78] [E: packages/experimental/agent-team/src/index.ts:37] |
| Provider | `dsh-experimental-agent-team` 内部 roster / mailbox / task board / activity；spawn 再进 `ctx.subagents` | 工具包不实现 DAG、邮箱、限额。服务默认 `maxMembers: 16`；opt-in profile 覆盖成 `8`。限额在服务 Config，不在工具 Config [E: packages/experimental/agent-team/src/index.ts:41] [E: packages/experimental/agent-team/src/index.ts:60] [E: packages/experimental/agent-team-profile/cordis.patch.yml:20] |
| Consumer | `tool-agent-team` scoped `defineTool` + `systemPrompt.section` | 换掉 Team 服务会让 `inject: agentTeams` 挂起；换 spawn/fork **provider 名**只改 `Config.freshProvider` / `forkProvider` [E: packages/experimental/tool-agent-team/src/index.ts:14] [E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:725] |

`TeamService.static inject` 还要 `agents` / `sessions` / `sessionPersistence` / `sessionProjections` / `subagents`。[E: packages/experimental/agent-team/src/index.ts:57]

服务方法映射（细节归子系统节点，此处只钉 adapter）：

- `spawnTeammate` [E: packages/experimental/tool-agent-team/src/index.ts:190]
- `sendMessage`（不再传 `delivery`；服务按目标状态决定收下还是开一轮）[E: packages/experimental/tool-agent-team/src/index.ts:224]
- `listMembers` [E: packages/experimental/tool-agent-team/src/index.ts:238]
- `waitForChange` [E: packages/experimental/tool-agent-team/src/index.ts:273]
- `interrupt` [E: packages/experimental/tool-agent-team/src/index.ts:285]
- `createTask` / `listTasks` / `getTask` / `updateTask` [E: packages/experimental/tool-agent-team/src/index.ts:302] [E: packages/experimental/tool-agent-team/src/index.ts:337] [E: packages/experimental/tool-agent-team/src/index.ts:349] [E: packages/experimental/tool-agent-team/src/index.ts:376]

## 执行管线

`ctx.tools.execute`：`tools/pre-execute` → 可选 `serviceAsk` → `tools/execute` waterfall（叶子 `execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1507] [E: packages/core/tools/src/index.ts:1607] [E: packages/core/tools/src/index.ts:1582] [E: packages/core/tools/src/index.ts:1784] 本插件**不**自己挂 pre/post listener。

- **timeout：** 九个 `defineTool` 都没有 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] `wait_agent` 的等待窗口是参数，不是这个 wrapper。
- **approval / sandbox：** 不 `ask`、不 confine。
- **checkpoint：** host `session-checkpoint-policy` 在有 `exec.agent` 且无 `exec.parent` 时 `flush`。[E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** 未声明 `isConcurrencySafe` → exclusive。[E: packages/core/tools/src/index.ts:1305]
- **PTC：** 本包不进四个 shipped preset。若某 session `mode: ptc` 且模型直调这些原生名，`collapses` 仍会挡（`name !== run_code`）。[E: packages/core/tools/src/index.ts:1352]
- **信号：** `spawn_teammate` / `sendMessage` / `waitForChange` 传 `exec.signal`。`list_agents` / `interrupt` / 任务读写不把 signal 交给服务。[E: packages/experimental/tool-agent-team/src/index.ts:196] [E: packages/experimental/tool-agent-team/src/index.ts:218] [E: packages/experimental/tool-agent-team/src/index.ts:266]
- **注册层：** `ctx.tools.register` 走 layer `effect`。[E: packages/core/tools/src/index.ts:1048]

## Preset 装配

四个 shipped preset patch `packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml` **都不**引用 `@deepseek-ai/dsh-experimental-tool-agent-team`。产品默认 catalog 没有这九个名。

opt-in 层 `@deepseek-ai/dsh-experimental-agent-team-profile` 的 `cordis.patch.yml`：

1. `disabled: true` 全局 `tool-subagent-control` / `tool-subagent-list-agents`（`report` 包已删除，profile 不再 disable 那一行），避免与 Team 的 `send_message` / `list_agents` / `interrupt_agent` 撞名。[E: packages/experimental/agent-team-profile/cordis.patch.yml:4] [E: packages/experimental/agent-team-profile/cordis.patch.yml:7]
2. `disabled: true` 全局 `tool-subagent` / `tool-subagent-fork`（不再改成 one-shot 后留下）。[E: packages/experimental/agent-team-profile/cordis.patch.yml:10] [E: packages/experimental/agent-team-profile/cordis.patch.yml:13]
3. insert `agent-team` 服务 + `tool-agent-team`（`freshProvider: spawn` / `forkProvider: fork`）以及 `ui-agent-team`。[E: packages/experimental/agent-team-profile/cordis.patch.yml:17] [E: packages/experimental/agent-team-profile/cordis.patch.yml:26] [E: packages/experimental/agent-team-profile/cordis.patch.yml:29] [E: packages/experimental/agent-team-profile/cordis.patch.yml:32]

注释写明必须在 `dsh-base` 之后 overlay；可执行行从 disable 全局 control 开始。[E: packages/experimental/agent-team-profile/cordis.patch.yml:4]

## execute() 走读

公共：缺 `exec.agent` 时 `callingAgent` 抛 `${toolName} requires a calling Agent`（仅当工具已在该 scope 解析到）。[E: packages/experimental/tool-agent-team/src/index.ts:159]

### `spawn_teammate`

1. `context = args.context ?? 'fresh'`。[E: packages/experimental/tool-agent-team/src/index.ts:191]
2. `ctx.agentTeams.spawnTeammate(agent, { name, description, prompt: [system-reminder 文本块, 用户 prompt 文本块], context, provider, signal })`。[E: packages/experimental/tool-agent-team/src/index.ts:192]
3. 自定义 provider 测试：`freshProvider: 'team-fresh'` 后 roster 第二行 `provider: 'team-fresh'`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:455]

### `send_message`

`sendMessage(..., { target, content: [text], signal })`，没有 `delivery` 字段。[E: packages/experimental/tool-agent-team/src/index.ts:224]

### `list_agents`

同步 `listMembers`，包成 `Promise.resolve`。[E: packages/experimental/tool-agent-team/src/index.ts:238]

### `wait_agent`

1. `timeoutMs = args.timeout_ms ?? 30_000`。[E: packages/experimental/tool-agent-team/src/index.ts:254]
2. 非 safe integer 或越界 → **仍** `waitForChange`（让服务抛权威错误）。[E: packages/experimental/tool-agent-team/src/index.ts:257]
3. 合法窗口内：同步读 `listMembers`，排除 caller，看 status ∈ `{running, provisioning}`。[E: packages/experimental/tool-agent-team/src/index.ts:39] [E: packages/experimental/tool-agent-team/src/index.ts:262]
4. 无活跃 peer → 立刻 `{ timedOut: false, noProgress: { reason: 'no-active-peer', message: NO_ACTIVE_PEER_MESSAGE } }`，不进入 wait。[E: packages/experimental/tool-agent-team/src/index.ts:265] [E: packages/experimental/tool-agent-team/src/index.ts:40]
5. 有活跃 peer → `waitForChange`。abort 测试：`Error: wait_agent aborted: { kind: 'user' }`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:459]

### `interrupt_agent`

`ctx.agentTeams.interrupt(caller, args.target)`。[E: packages/experimental/tool-agent-team/src/index.ts:285]

### 任务四件套

- create：可选 `blocked_by` / `write_scopes` 才展开进 request。[E: packages/experimental/tool-agent-team/src/index.ts:302]
- list：内存 filter → slice；未完列表才设 `nextCursor`。[E: packages/experimental/tool-agent-team/src/index.ts:337] [E: packages/experimental/tool-agent-team/src/index.ts:334]
- get：`TeamTaskId(args.task_id)`。[E: packages/experimental/tool-agent-team/src/index.ts:362]
- update：同样展开可选字段。[E: packages/experimental/tool-agent-team/src/index.ts:376]

冷恢复：teammate Agent 再 publish 时 `maybeInstall` 会重挂九名 + 政策段。测试 `reinstalls Team scope before a cold-resumed teammate request`。[E: packages/experimental/tool-agent-team/tests/tool-team.spec.ts:699] [E: packages/experimental/tool-agent-team/src/index.ts:420]

## 设计动机·edge

- **opt-in experimental。** 不进四个 shipped preset；要 `dsh-experimental-agent-team-profile`（或等价 overlay）才出现。
- **scope 注册。** 只给 `tryMembership` 成功的 Agent 装工具，避免污染非 Team 子代理与 host catalog。
- **同名覆盖而非改 schema 旋钮。** Team `send_message` 用 `target`；legacy 用 `subagent_id`。profile 先 disable 全局 control，再装本插件。
- **没有 quiet/wakeup 两支工具。** 单一 `send_message`：running 在最近 step 边界收下，inactive 会 start/resume。成功投递已 durable，`queued` 也不要重发。[E: packages/experimental/tool-agent-team/src/index.ts:31] [E: packages/experimental/tool-agent-team/src/index.ts:217]
- **wait 不唤醒。** 模型侧捷径避免对全员 idle 的队伍空转一小时；非法 timeout 仍走服务校验，避免捷径绕过权威范围。
- **写范围是建议。** 政策：共享同一工作目录；`write_scopes` 不是锁；`FS_STALE_VERSION` 要 rebase；bash/formatter 不在 FS version guard 内。
- **不是 jobs / 不是 subagent-control。** `job_*` 管 bash 后台；global `send_message` 管 continuable 子代理 id。本页对象是 Team 成员名与共享任务板。
- **Lead-only 动作**（`spawn_teammate`、`interrupt_agent`、部分 task `reassign`）由服务授权，工具只转发。

## Sources

- packages/experimental/tool-agent-team/src/index.ts
- packages/experimental/tool-agent-team/package.json
- packages/experimental/tool-agent-team/tests/tool-team.spec.ts
- packages/experimental/agent-team/src/index.ts
- packages/experimental/agent-team/package.json
- packages/experimental/agent-team-profile/cordis.patch.yml
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/system-prompt/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：pre-execute / execute / post-execute、timeout wrapper、PTC collapse、exclusive。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()`；本族仅 opt-in profile 才会进全局名录讨论。
- [subagent](subagent.md)（`surface.tools.subagent`）：`provider: spawn` 创建面；Team `freshProvider` 默认仍走它。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：`forkProvider` 默认。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：全局 continuable 控制三件套；与本页同名但 schema/seam 不同。
- [Agent Teams 运行时](../../subsystems/orchestration/agent-team.md)（`subsys.orchestration.agent-team`）：`TeamService`、roster / mailbox / task board、限额与授权。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：teammate 实际驻留的 continuable 子代理运行时。
