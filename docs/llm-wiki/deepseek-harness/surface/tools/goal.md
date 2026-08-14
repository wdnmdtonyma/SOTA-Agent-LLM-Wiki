---
id: surface.tools.goal
title: create_goal / get_goal / update_goal
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/goal/tool-goal/src/index.ts
  - packages/goal/tool-goal/src/authority.ts
  - packages/goal/tool-goal/src/wrapup.ts
  - packages/goal/tool-goal/tests/tool-goal.spec.ts
  - packages/goal/tool-goal/package.json
  - packages/goal/goal/src/index.ts
  - packages/goal/goal/src/types.ts
  - packages/goal/goal/src/fold.ts
  - packages/goal/goal/src/runtime.ts
  - packages/goal/goal/package.json
  - packages/goal/goal/tests/goal.spec.ts
  - packages/goal/goal-round-driver/src/index.ts
  - packages/goal/goal-round-driver/src/prompt.ts
  - packages/goal/command-goal/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - create_goal
  - get_goal
  - update_goal
  - apply
  - inject
  - requireDirectHuman
  - name
  - Config
  - goalToolExecution
  - completionAuthority
  - renderWrapupContext
  - GoalService
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.jobs
  - surface.tools.todo-write
  - surface.tools.exit-plan-mode
  - subsys.orchestration.goal
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见三件套 `get_goal` / `create_goal` / `update_goal`；实现包 `@deepseek-ai/dsh-tool-goal`（Cordis 插件名 `tool-goal`）。在同一 session 上读写一条 persisted completion goal，状态机在 host 的 `ctx.goals`（`@deepseek-ai/dsh-goal`），本包只做 schema、authority 与 wrap-up。

## 能回答的问题

- 模型目录里的 `create_goal` / `get_goal` / `update_goal` 是哪个包注册的？三个名字各自改什么？
- `update_goal.action` 有哪些枚举？哪些必须 direct human，哪些允许当前 goal-round？
- 工具输出长什么样？有没有截断 / spill？`activation` 会不会落盘？
- `ctx.goals` 与 `ctx.agents` 各自给本工具提供什么？`/goal` 人命令是不是同一条 catalog？
- `minimal` / `standard` / `code` / `cordis` 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-goal`？goal SERVICE 在哪一层？
- 一次 `execute()` 怎样过 `goalToolExecution` → `requireDirectHuman` / `completionAuthority` → `ctx.goals.*`，以及 autonomous `complete`/`blocked` 怎样 `deferContext`？

## Identity

三个 wire 名写死在 `apply()` 的三次 `defineTool({ name })` 里。插件 **Config 不会改名**；`blockedAfterConsecutiveRounds` 只改 prompt 文案和 `blocked` 门槛，不改 catalog 名。[E: packages/goal/tool-goal/src/index.ts:196] [E: packages/goal/tool-goal/src/index.ts:208] [E: packages/goal/tool-goal/src/index.ts:235] [E: packages/goal/tool-goal/src/index.ts:33]

| 模型可见名 | `defineTool` | 动词 |
|---|---|---|
| `get_goal` | `name: 'get_goal'` | 读当前 goal；没有则 `{ goal: null }` |
| `create_goal` | `name: 'create_goal'` | 新建一条 active goal 并 arm |
| `update_goal` | `name: 'update_goal'` | 用 exact `goal_id` + `revision` 做 compare-and-set |

实现包是 `@deepseek-ai/dsh-tool-goal`。Cordis 插件导出名是 `tool-goal`。`inject` 是 `['agents', 'goals', 'tools', 'systemPrompt']`：缺 `ctx.goals` 时插件挂起，catalog 里不会出现这三件套。[E: packages/goal/tool-goal/package.json:2] [E: packages/goal/tool-goal/src/index.ts:22] [E: packages/goal/tool-goal/src/index.ts:23] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:167] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:168]

工厂是 `apply(ctx, config)`：`resolveConfig` 之后登记 system-prompt section `tool:goal`（`order: 114`），再三次 `ctx.tools.register(defineTool(...))`。Loader 直调 `apply(ctx, {})` 时 `blockedAfterConsecutiveRounds` 回退为 `3`。[E: packages/goal/tool-goal/src/index.ts:187] [E: packages/goal/tool-goal/src/index.ts:189] [E: packages/goal/tool-goal/src/index.ts:127] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:194]

测试钉死 boot 后 `ctx.tools.get` 恰好这三个名字；fiber dispose 后工具与 `tool:goal` section 一并撤掉。三个定义都没有 `isConcurrencySafe`，`executionMode` fail-closed 为 `{ kind: 'exclusive' }`。[E: packages/goal/tool-goal/tests/tool-goal.spec.ts:123] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:127] [E: packages/core/tools/src/index.ts:1278]

这三件套**不是**人命令。host 另装 `@deepseek-ai/dsh-command-goal`，`ctx.commands.register({ name: 'goal', ... })` 给 `/goal`，不进 `ctx.tools.schemas()`。[E: packages/goal/command-goal/src/index.ts:163] [E: packages/goal/command-goal/src/index.ts:165]

## 用途定位

本工具让模型把「当前 session 里一条要跨多个 autonomous goal-round 才能做完的目标」写成 durable 状态，并在后续 turn 用 compare-and-set 更新。`create_goal` 描述写明：可以从 direct human 请求里推断 intent，不必用户说出 “create a goal”；trivial 单轮工作不要建；非人类与 subagent authority 会被拒。[E: packages/goal/tool-goal/src/index.ts:48] [E: packages/goal/tool-goal/src/index.ts:49]

同一时刻一个 session 只有一条 current goal。`GoalService.create` 在已有 goal 且 `phase !== 'complete'` 时抛 `GOAL_ALREADY_EXISTS`；已 `complete` 的可以再 create 替换。id 形如 `goal-${randomUUID()}`，首条 revision 为 `1`，phase 为 `active`，activation 为 `armed`。[E: packages/goal/goal/src/index.ts:255] [E: packages/goal/goal/src/index.ts:260] [E: packages/goal/goal/src/index.ts:266]

它**不是** `todo_write` 的任务清单，也**不是** plan-mode 的规划稿。人侧对照入口是 `/goal`（show / create / edit / pause / resume / clear），没有模型侧的 `complete` / `blocked` / `clear` 工具。[E: packages/goal/command-goal/src/index.ts:16] [E: packages/goal/command-goal/src/index.ts:144]

自动续跑不在本包：host `@deepseek-ai/dsh-goal-round-driver` 在 agent `idle`、goal `phase === 'active'` 且 `activation === 'armed'` 时 `followup` 一条 `source.kind === 'goal'` 的 `<goal_round>` 消息。本工具只负责读写状态与在 terminal update 后注入 wrap-up。[E: packages/goal/goal-round-driver/src/index.ts:165] [E: packages/goal/goal-round-driver/src/index.ts:178] [E: packages/goal/goal-round-driver/src/prompt.ts:15]

## 输入 schema

以插件默认 Config（`blockedAfterConsecutiveRounds: 3`）boot 为准。三个名字的参数表不同；`Config` **不**增删字段、**不**改 wire 名。`defineTool` 把 ParameterSchemaSpec 编成隐式 open object（根上不写 `additionalProperties: false`），多出来的键能过 schema，`execute` 只读具名字段。[E: packages/goal/tool-goal/src/index.ts:33] [E: packages/core/tools/src/schema.ts:449] [E: packages/core/tools/src/schema.ts:586]

### `get_goal`

`parameters: {}`。没有模型字段。[E: packages/goal/tool-goal/src/index.ts:198]

### `create_goal`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `objective` | `string` | 是 | 无 | schema 只要求 string；域边界 `trim()` 后非空 | 从 direct human 请求推断出的完成目标。[E: packages/goal/tool-goal/src/index.ts:211] [E: packages/goal/goal/src/index.ts:151] |
| `max_goal_rounds` | `number` | 否 | 省略则走 `GoalService` 的 `defaultMaxGoalRounds`（schema 默认 `256`） | 有值则必须是正 safe integer；`0` **不会**被本工具当 filler 丢掉 | 自动续跑轮次上限。[E: packages/goal/tool-goal/src/index.ts:216] [E: packages/goal/goal/src/index.ts:187] [E: packages/goal/goal/tests/goal.spec.ts:128] |

`create` 把 `args.max_goal_rounds === undefined` 才省略；模型若传 `0` / `1.5`，服务抛 `GOAL_INVALID_MAX_ROUNDS`。空白 `objective` 抛 `GOAL_INVALID_OBJECTIVE`。[E: packages/goal/tool-goal/src/index.ts:227] [E: packages/goal/goal/tests/goal.spec.ts:117] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:422]

### `update_goal`

`action` 枚举是 `['edit', 'pause', 'resume', 'complete', 'blocked']`，五个名字必须按这个集合理解，没有第六个。[E: packages/goal/tool-goal/src/index.ts:41] [E: packages/goal/tool-goal/src/index.ts:246]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `goal_id` | `string` | 是 | 无 | 非空且 `=== trim()` | 必须抄 `get_goal` 返回的 id。[E: packages/goal/tool-goal/src/index.ts:241] [E: packages/goal/tool-goal/src/index.ts:146] |
| `revision` | `number` | 是 | 无 | 正 safe integer（`>= 1`） | 必须抄 `get_goal` 返回的 revision。[E: packages/goal/tool-goal/src/index.ts:242] |
| `action` | `string` | 是 | 无 | `edit` \| `pause` \| `resume` \| `complete` \| `blocked` | 选中的状态动词。[E: packages/goal/tool-goal/src/index.ts:243] |
| `objective` | `string` | 否 | 无 | 仅 `edit` 可用；`''` 视为 filler | 替换目标文本。[E: packages/goal/tool-goal/src/index.ts:249] [E: packages/goal/tool-goal/src/index.ts:136] |
| `max_goal_rounds` | `number` | 否 | 无 | 仅 `edit` 可用；`0` 视为 filler | 替换轮次上限。[E: packages/goal/tool-goal/src/index.ts:250] [E: packages/goal/tool-goal/src/index.ts:141] |
| `blocked_reason` | `string` | `action === 'blocked'` 时 execute 再要求 | 无 | 仅 `blocked` 可用；`undefined` / 空白 / `''` 都不够 | 具体阻塞条件；写入服务时 `code: 'model-reported'`。[E: packages/goal/tool-goal/src/index.ts:251] [E: packages/goal/tool-goal/src/index.ts:295] [E: packages/goal/tool-goal/src/index.ts:310] |

**action 与条件字段：**

| `action` | 允许的额外字段 | 其它非 filler 字段 | 权威 |
|---|---|---|---|
| `edit` | `objective` 与/或 `max_goal_rounds`（至少一项在 filler 过滤后仍在） | `blocked_reason` 有文本 → `GOAL_TOOL_INVALID_UPDATE` | `requireDirectHuman` |
| `pause` | 无 | objective / cap / reason 有实质值 → `GOAL_TOOL_INVALID_UPDATE` | `requireDirectHuman` |
| `resume` | 无 | 同 `pause` | `requireDirectHuman` |
| `complete` | 无 | objective / cap 有实质值，或 `blocked_reason` 有文本 → `GOAL_TOOL_INVALID_UPDATE` | `completionAuthority`（human **或** 当前 goal-round） |
| `blocked` | 必须有 trim 后非空的 `blocked_reason` | objective / cap 有实质值 → `GOAL_TOOL_INVALID_UPDATE` | 同 `complete`；goal-round 还要过 `blockedAfterConsecutiveRounds` |

严格 schema 的模型常会把未用字段填成 `''` / `0`。`hasText` / `hasRoundCap` 把这两种值当空，因此 `edit` + `max_goal_rounds: 0` + `blocked_reason: ''` 仍合法。[E: packages/goal/tool-goal/tests/tool-goal.spec.ts:469] [E: packages/goal/tool-goal/src/index.ts:135]

畸形 ref（空 `goal_id` 或 `revision < 1`）在进 `ctx.goals` 之前抛 `GOAL_TOOL_INVALID_UPDATE`。[E: packages/goal/tool-goal/src/index.ts:148] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:461]

## 输出 & 截断 / spill

三个工具共用 `GOAL_OUTPUT`。canonical value 是 `oneOf`：`{ goal: null }`，或 `{ goal: { id, revision, objective, phase, roundsStarted, maxGoalRounds, blockedReason? }, activation }`。`phase` 枚举 `active` \| `paused` \| `blocked` \| `complete`；`activation` 枚举 `armed` \| `disarmed`。`blockedReason` 只在服务视图带了它时展开，形状是 `{ code, message }`。[E: packages/goal/tool-goal/src/index.ts:72] [E: packages/goal/tool-goal/src/index.ts:93] [E: packages/goal/tool-goal/src/index.ts:157]

`output.render` 把整个 value `JSON.stringify` 成一块 text。没有字节预算、没有 spill 文件、没有截断标记。registry `createSuccessResult` 先按 `output.schema` 校验 value，再调用这个 render；模型看到的 `content[0].text` 与 `result.value` 同构。[E: packages/goal/tool-goal/src/index.ts:178] [E: packages/core/tools/src/index.ts:1796] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:109]

`activation` 是 process-local 观察值，**不**进 `goal` projection。`GoalView` 带 `activation`；`GoalProjection` 与 `applyGoalProjection` 写出的对象只有 `goal` / `roundsStarted` / `createdAt` / `updatedAt`。[E: packages/goal/goal/src/types.ts:82] [E: packages/goal/goal/src/types.ts:91] [E: packages/goal/goal/src/index.ts:107]

没有 current goal 时 `get_goal` 成功返回 `{ goal: null }`（不是 `isError`）。域错误（`GoalError` / `HarnessError`）才变成工具失败；测试覆盖的 code 包括 `GOAL_TOOL_AGENT_REQUIRED`、`GOAL_TOOL_DRIVER_REQUIRED`、`GOAL_TOOL_AUTHORITY_REQUIRED`、`GOAL_TOOL_INVALID_UPDATE`、`GOAL_TOOL_BLOCK_THRESHOLD`、`GOAL_INVALID_OBJECTIVE`。[E: packages/goal/tool-goal/tests/tool-goal.spec.ts:335] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:215] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:566]

`presentCall` 只服务 UI：`card: 'generic'`。`get_goal` 标题 `Read current goal`、`kind: 'read'`；`create_goal` / `update_goal` 是 `kind: 'other'`。replay 参数过不了 schema 时 `presentCall` 回 `undefined`，不抛。[E: packages/goal/tool-goal/tests/tool-goal.spec.ts:140] [E: packages/core/tools/src/schema.ts:600]

autonomous `complete` / `blocked` 会在结果上挂 `additionalContexts`（一条 plugin notice），**不**设 `concludesTurn`。human 权威下的同一 action 不挂 wrap-up。[E: packages/goal/tool-goal/tests/tool-goal.spec.ts:374] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:398]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `ctx.goals` / `GoalService` | `declare module` 把 `goals: GoalService` 挂上 Context；`super(ctx, 'goals')`。[E: packages/goal/goal/src/index.ts:61] [E: packages/goal/goal/src/index.ts:194] |
| Provider（shipped host） | `@deepseek-ai/dsh-goal` | `dsh-base` 行 `id: goal`。session 事件 `goal/change` 做 event-source；cache 按 `Session` WeakMap。[E: packages/bundle/base/cordis.patch.yml:256] [E: packages/goal/goal/src/index.ts:191] |
| Consumer | `@deepseek-ai/dsh-tool-goal` | `get` / `create` / `edit` / `pause` / `resume` / `complete` / `block`。不调用 `clear` / `disarm`。 |
| 邻接 Provider | `@deepseek-ai/dsh-goal-round-driver` | 读 `ctx.goals.get`，在 armed+active 时投 goal-sourced followup；耗尽轮次时自己 `block(..., { code: 'round-limit' })`。[E: packages/goal/goal-round-driver/src/index.ts:19] [E: packages/goal/goal-round-driver/src/index.ts:167] |
| 邻接 Consumer | `@deepseek-ai/dsh-command-goal` | 人命令 `/goal`，同一 `ctx.goals`。[E: packages/goal/command-goal/src/index.ts:12] |

`GoalService.inject = ['agents']`。每个 mutation 先 `assertLive`：`ctx.agents.get(agent.id) === agent`，拒绝「同 id 但不是 registry 里那份 live 对象」。[E: packages/goal/goal/src/index.ts:184] [E: packages/goal/goal/src/index.ts:415]

换掉 `ctx.goals` provider 会带走：默认 `maxGoalRounds`、CAS / phase 转移表、`goal/change` 落盘形状、process-local `activation`、以及 `agent/session-start` 时强制 `disarmed`。工具代码不自己 fold 日志。[E: packages/goal/goal/src/index.ts:198] [E: packages/goal/goal/src/index.ts:240]

其它消费：

- `ctx.agents`：`goalToolExecution` 要求 `exec.agent` 存在、就是 registry 里那份、`status === 'running'`、并且 `ctx.agents.currentInitiator() === agent`。`requireDirectHuman` 还要求 `ctx.agents.roots()` 包含该 agent（owner 为空的 runtime root；resumed fork 可以是 root）。[E: packages/goal/tool-goal/src/authority.ts:55] [E: packages/goal/tool-goal/src/authority.ts:56] [E: packages/goal/tool-goal/src/authority.ts:71] [E: packages/core/agent/src/index.ts:309] [E: packages/core/agent/src/index.ts:613]
- `ctx.tools`：注册与 `execute` 管线。
- `ctx.systemPrompt`：section `tool:goal`。

durable 计数 `roundsStarted` **不是**本工具改的。fold 只在 `user/message` 且 `goalSource` 认定 `source.kind === 'goal'`、id/revision 匹配、`round === roundsStarted + 1` 时推进；普通 human turn 不增加它。[E: packages/goal/goal/src/fold.ts:176] [E: packages/goal/goal/src/fold.ts:321] [E: packages/goal/goal/src/fold.ts:330]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ monotonic guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。本插件**不**自己挂 pre-execute / post-execute listener。[E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744]

对本工具的挂点：

- **timeout：** 三个 `defineTool` 都**没有** `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。body 也没有自己的 deadline。[E: packages/guard/timeout-policy/src/index.ts:59]
- **approval：** 不声明 ask，也不在 body 里 `approveEscalation`。authority 是 session 事件检查，不是 `ctx.approval`。
- **sandbox：** 不碰 `ctx.sandbox` / `ctx.fs`。副作用是 `agent.session.append('goal/change', ...)`。[E: packages/goal/goal/src/index.ts:547]
- **checkpoint：** host `session-checkpoint-policy` 对 top-level（`exec.parent === undefined`）在 `tools/execute` 里先 `ctx.sessions.flush`，再 `next()` 进 body。nested `run_code` 子分发跳过这层。[E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** 未声明 `isConcurrencySafe`，exclusive。[E: packages/goal/tool-goal/tests/tool-goal.spec.ts:127]
- **Code Mode：** `code` preset 仍装本包，但 `mode: code` 时无 `parent` 的模型直调会在进 waterfall 前 `collapses`（`name !== run_code`）。要从 `run_code` 程序里调这三个名字。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`。goal **SERVICE**、`goal-round-driver`、`/goal` 在 host；preset 只决定模型能不能调用这三件套。三份 shipped 装载行都**没有** `disabled`、**没有** `isolate:`、**没有**覆盖 `blockedAfterConsecutiveRounds`（保持插件默认 `3`）。

| preset | 装 `@deepseek-ai/dsh-tool-goal`？ | `disabled` | isolate | Config |
|---|---|---|---|---|
| `minimal` | **否**。文件只有 persona + persistent bash + `str_replace_editor` | — | 本包未出现。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] | — |
| `standard` | 是，顶层 `id: tool-goal` | 无 | 无。consumer 行，好让 `inject: goals` 看见 host 上的 `GoalService`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:97] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:98] | 无 extra |
| `code` | 是（工具行仍在；呈现改成 Code Mode） | 无 | 无。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:104] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:105] | 无 extra；另有 `tool-presentation.mode: code` |
| `cordis` | 是 | 无 | 无。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:85] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:86] | 无 extra |

组合旁注（不是 preset 成员资格）：`dsh-base` insert `id: goal`（`@deepseek-ai/dsh-goal`）、`goal-round-driver`、`command-goal`，并另有一行 host `tool-goal`。[E: packages/bundle/base/cordis.patch.yml:257] [E: packages/bundle/base/cordis.patch.yml:260] [E: packages/bundle/base/cordis.patch.yml:374] `dsh-web-app` overlay 只把 host `tool-goal` 设 `disabled: true`，SERVICE / driver / `/goal` 留在 host，改由每个 session 的 preset remount 模型工具。[E: packages/bundle/web-app/cordis.patch.yml:345] [E: packages/bundle/web-app/cordis.patch.yml:346]

## execute() 走读

共享前缀对三个名字都成立。

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，违规抛 `ToolArgsError`（`INVALID_ARGS`），再进用户 body。[E: packages/core/tools/src/schema.ts:586]
2. `goalToolExecution@packages/goal/tool-goal/src/authority.ts`：没有 `exec.agent` → `GOAL_TOOL_AGENT_REQUIRED`。live 对象对不上、`status !== 'running'`、或 `currentInitiator() !== agent` → `GOAL_TOOL_DRIVER_REQUIRED`。再从 session 尾部往回找：先撞到 `turn/end` 或根本没有 `turn/start` 同样 `GOAL_TOOL_DRIVER_REQUIRED`。[E: packages/goal/tool-goal/src/authority.ts:52] [E: packages/goal/tool-goal/src/authority.ts:57] [E: packages/goal/tool-goal/src/authority.ts:35] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:225]
3. `hasDirectHumanInput`：agent 必须在 `ctx.agents.roots()` 里，且当前 turn 窗口存在 `user/message` 且 `source.kind === 'user'`。plugin / goal-sourced 消息不算 human。live child（`enter` 之后有 owner）即使带着 `kind: 'user'` 也被拒。[E: packages/goal/tool-goal/src/authority.ts:71] [E: packages/goal/tool-goal/src/authority.ts:73] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:230] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:238]

### `get_goal`

4. 不做 human / goal-round 检查。`ctx.goals.get(execution.agent)`，经 `goalValue` 返回。无 current → `{ goal: null }`。[E: packages/goal/tool-goal/src/index.ts:202] [E: packages/goal/goal/src/index.ts:222]

### `create_goal`

5. `requireDirectHuman`。然后 `ctx.goals.create(agent, { objective, maxGoalRounds? })`。成功视图 `activation: 'armed'`，`roundsStarted: 0`。[E: packages/goal/tool-goal/src/index.ts:224] [E: packages/goal/tool-goal/src/index.ts:225] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:208]

### `update_goal`

6. `goalRef(goal_id, revision)` 做成 `GoalRef`。再按 `action` 分支。[E: packages/goal/tool-goal/src/index.ts:259]
7. **`edit`：** `requireDirectHuman`；拒 `blocked_reason` 文本；`ctx.goals.edit`。两边都空（只有 filler）会落到服务的 `GOAL_INVALID_EDIT`。phase 不变，revision + 1，activation 保持 cache 里的值。[E: packages/goal/tool-goal/src/index.ts:265] [E: packages/goal/goal/src/index.ts:281] [E: packages/goal/goal/src/index.ts:289]
8. **`pause` / `resume`：** `requireDirectHuman`；拒任何实质 objective / cap / reason。`pause` → `ctx.goals.pause`（只从 `active`，结果 `paused` + `disarmed`）。`resume` → `ctx.goals.resume`（`active`/`paused`/`blocked`；已 armed 的 active 抛 `GOAL_INVALID_TRANSITION`；`roundsStarted >= maxGoalRounds` 也拒；结果 `active` + `armed`）。[E: packages/goal/tool-goal/src/index.ts:272] [E: packages/goal/goal/src/index.ts:300] [E: packages/goal/goal/src/index.ts:318] [E: packages/goal/goal/src/index.ts:321]
9. **`complete` / `blocked`：** `completionAuthority`。human 输入直接 `{ kind: 'direct-human' }`；否则要求 `ctx.goals.get` 非空，且当前 turn 有一条 `source.kind === 'goal'`、id/revision/round 全等于 current view 的消息，才给 `{ kind: 'goal-round', goal }`。两者都没有 → `GOAL_TOOL_AUTHORITY_REQUIRED`。goal-round **不能** `edit` / `pause` / `resume`。[E: packages/goal/tool-goal/src/authority.ts:102] [E: packages/goal/tool-goal/src/authority.ts:80] [E: packages/goal/tool-goal/src/authority.ts:107] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:544]
10. `blocked` + `kind === 'goal-round'` + `roundsStarted < blockedAfterConsecutiveRounds`（默认 3）→ `GOAL_TOOL_BLOCK_THRESHOLD`。human 权威可以立刻 `blocked`，此时 `roundsStarted` 仍可以是 `0`。[E: packages/goal/tool-goal/src/index.ts:299] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:566] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:607]
11. `complete` → `ctx.goals.complete`（从 `active`/`paused`/`blocked` 到 `complete` + `disarmed`）。`blocked` → `ctx.goals.block`（只从 `active`），reason `{ code: 'model-reported', message: blocked_reason }`。[E: packages/goal/tool-goal/src/index.ts:307] [E: packages/goal/goal/src/index.ts:342] [E: packages/goal/goal/src/index.ts:358]
12. 仅当 `authority.kind === 'goal-round'`：`exec.deferContext(createUserMessage({ source: { kind: 'plugin', plugin: 'tool-goal', form: 'notice', summary } }))`。`complete` 用 `renderWrapupContext(objective)`（`<goal_complete>`）；`blocked` 再传入 reason（`<goal_blocked>`）。两段文案都要求模型直接对用户写收尾，并且不要在这一 run 再调工具。registry 把 deferred 消息拼进 `additionalContexts`。[E: packages/goal/tool-goal/src/index.ts:313] [E: packages/goal/tool-goal/src/wrapup.ts:20] [E: packages/goal/tool-goal/src/wrapup.ts:29] [E: packages/core/tools/src/index.ts:1581]

session resume / fork 后，`agent/session-start` 把 cache `activation` 设成 `disarmed`。active 但仍 disarmed 的 goal 要靠 human `update_goal action resume` 再 arm；测试用中文「继续」打开 human turn 即可。[E: packages/goal/goal/src/index.ts:199] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:408] [E: packages/goal/tool-goal/tests/tool-goal.spec.ts:272]

## 设计动机·edge

- **host 服务 / preset 工具。** 和 `job_list` 一样：registry 按 session key，Gateway Remote 也从 host 解析 `goals`。preset 若把 `tool-goal` 放进 entry-local realm，`inject: ['goals']` 会看不见 host 实例。三个 shipped 装载行因此是顶层 consumer。
- **direct human ≠ 「这段对话像人」。** 检查的是 runtime root + 当前 turn 里 `source.kind === 'user'` 的 `user/message`。goal-round driver 显式带 `source: { kind: 'goal', ... }`，不会误授 create/edit/pause/resume。[E: packages/goal/goal-round-driver/src/index.ts:178]
- **`blocked` 的两道门。** 机械门槛只看 `roundsStarted`（默认至少 3 个已准入 goal-round）。「是不是同一个阻塞条件一直在」由模型写进 `blocked_reason`；工具不比对历史文本。driver 自己的耗尽路径用 `code: 'round-limit'`，与模型的 `model-reported` 分开。[E: packages/goal/goal-round-driver/src/index.ts:168]
- **wrap-up 不是硬停 turn。** autonomous terminal update 不调 `concludeTurn()`。模型还要再对用户说一次话；约束写在 deferred `<goal_complete>` / `<goal_blocked>` 里。
- **CAS 抄错就是 `GOAL_STALE_REVISION`。** `get_goal` 先读，再把返回的 id/revision 原样送进 `update_goal`。并发 human `/goal` 或另一条 tool call 先写成功，后到的调用会 stale。
- **filler 与 create 不对称。** `update_goal` 把 `0` / `''` 当未提供；`create_goal` 把出现了的 `max_goal_rounds: 0` 原样交给服务，直接 `GOAL_INVALID_MAX_ROUNDS`。
- **模型工具没有 `clear`。** 清 tombstone 是 `GoalService.clear` / `/goal clear`。模型把目标做完用 `complete`，做不下去用 `blocked`，改写用 `edit`。
- **Code Mode 仍注册、直调被折叠。** catalog 形状稳定（plan-mode 那套「工具表不随 mode 变」的同一理由），但 `code` preset 下模型必须经 `run_code` 才能碰到这三个名字。
- **和 Codex goal 方言的关系。** 插件注释称三个名字是 Codex-shaped；DSH 的差异在 authority（root + source.kind）、process-local `activation`、以及 `blockedAfterConsecutiveRounds`。不要把「有 `create_goal`」理解成跨 session 的产品 backlog。

## Sources

- packages/goal/tool-goal/src/index.ts
- packages/goal/tool-goal/src/authority.ts
- packages/goal/tool-goal/src/wrapup.ts
- packages/goal/tool-goal/tests/tool-goal.spec.ts
- packages/goal/tool-goal/package.json
- packages/goal/goal/src/index.ts
- packages/goal/goal/src/types.ts
- packages/goal/goal/src/fold.ts
- packages/goal/goal/src/runtime.ts
- packages/goal/goal/package.json
- packages/goal/goal/tests/goal.spec.ts
- packages/goal/goal-round-driver/src/index.ts
- packages/goal/goal-round-driver/src/prompt.ts
- packages/goal/command-goal/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：同样「registry 在 host、preset 只挂模型控制」的编排工具。
- [todo_write](todo-write.md)（`surface.tools.todo-write`）：session 内任务清单，不是 goal 生命周期。
- [exit_plan_mode](exit-plan-mode.md)（`surface.tools.exit-plan-mode`）：plan-mode 退出；规划稿不走 `create_goal`。
- [goal 生命周期](../../subsystems/orchestration/goal.md)（`subsys.orchestration.goal`）：`ctx.goals` fold、round driver、`/goal` 命令的子系统页。
