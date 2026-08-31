---
id: subsys.orchestration.plan
title: plan mode 状态
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/plan/plan-mode/src/index.ts
  - packages/plan/plan-mode/src/types.ts
  - packages/plan/plan-mode/src/invariant.ts
  - packages/plan/plan-mode/src/client.ts
  - packages/plan/plan-mode/package.json
  - packages/plan/plan-mode/tests/plan-mode.spec.ts
  - packages/plan/plan-mode/tests/integration.spec.ts
  - packages/plan/plan-mode/tests/projection.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/preset/agent-presets/src/mount.ts
  - vendor/cordis/src/events.ts
  - vendor/loader/src/config/isolate.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/known-event-types.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/interaction/commands/src/index.ts
symbols:
  - ctx.planMode
  - PlanModeController
  - EXIT_PLAN_MODE
  - planProjectionDefinition
related:
  - spine.overview
  - spine.turn-and-step
  - spine.composition-boot
  - spine.trace-code-mode
  - surface.tools.exit-plan-mode
  - surface.presets.standard
  - surface.presets.minimal
  - surface.presets.code
  - subsys.core.tools
  - subsys.core.agent-tool-presentation
  - subsys.core.code-mode
  - subsys.core.system-prompt
  - subsys.core.agent-loop
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-plan-mode` 把 **plan mode** 做成按 session 投影折叠的协作状态：`PlanModeController` 发布 `ctx.planMode`，用 `plan/mode` 事件（last-wins）记住是否激活，用 `plan:policy` section 把部署文案送进 system prompt，并用始终登记的 wire 名 `exit_plan_mode`（`EXIT_PLAN_MODE`）给人审阅后退出。换模式只改 section 与 log，**不**改 `ctx.tools` catalog。它是 Cordis 组合运行时（`profile → bundle → agent preset`）里的一条可 isolate 服务。

## 能回答的问题

- `ctx.planMode` 是 host 面单例还是 preset isolate 私有实例？`dsh-base` / `dsh-web-app` / shipped preset / `minimal` 各怎么装？
- 进入或离开 plan mode 会不会改 `request/header.tools`？PTC 的 wire 表和 SDK binding 呢？
- `agent/pre-step` 为什么必须先 `await next()`，pending 的 `plan/mode` 何时才 append？
- `/plan`、`exit_plan_mode`、进程内 `pendingIntents`、投影键 `plan` 是不是同一条队列？
- sandbox / approval 读不读 plan 状态？plan 会不会在 `tools/pre-execute` 拦 `write` / `bash`？
- resume / fork / 冷读怎样恢复 committed 状态？没有 live mirror 时 UI 看什么？

## 职责边界

本包拥有：Cordis 服务 `ctx.planMode`（`PlanModeController`）、事件类型 `plan/mode`、投影定义 `planProjectionDefinition`（key `'plan'`）、部署 Config `{ section }`、prompt section `plan:policy`、人命令 `/plan`（仅当 `ctx.commands` 已组合）、以及模型可见工具 `exit_plan_mode` 的登记与 execute 门。[E: packages/plan/plan-mode/src/index.ts:52] [E: packages/plan/plan-mode/src/index.ts:60] [E: packages/plan/plan-mode/src/index.ts:131] [E: packages/plan/plan-mode/src/index.ts:184]

本包**不**拥有：

- `ctx.tools` 注册表、`presentAs` / `wireSchemas`、`tools/pre-execute` 管线 —— [`subsys.core.tools`](../core/tools.md)。
- PTC（旧名 Code Mode）只把 `run_code` 送上 wire、其余能力进 SDK —— [`subsys.core.agent-tool-presentation`](../core/agent-tool-presentation.md) / [`subsys.core.code-mode`](../core/code-mode.md) / [`spine.trace-code-mode`](../../spine/trace-code-mode.md)。本页只钉「plan 开关不改那张表」。权威实现是 `packages/core/tools/src/ptc.ts`。
- `exit_plan_mode` 的 JSON 字段表、heading 细则、审阅卡片 —— [`surface.tools.exit-plan-mode`](../../surface/tools/exit-plan-mode.md)。
- `system-prompt/assemble` waterfall 本身 —— [`subsys.core.system-prompt`](../core/system-prompt.md)。本包只 `section()` 贡献一段。
- `ReactLoopAgent.preStep` / turn 合同 —— [`subsys.core.agent-loop`](../core/agent-loop.md) / [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- sandbox / approval / permission preset。plan 也不在 `tools/pre-execute` 里拦变异工具。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:598] [E: packages/plan/plan-mode/tests/integration.spec.ts:101]
- goal 的 activation（进程本地、不落盘）——那是另一条缝。plan 的 **committed** 状态就是 `plan/mode`；不落盘的是 `pendingIntents` WeakMap。
- Codex / Claude 子代理后端。`dsh-base` 没有 `subagent-codex` / `subagent-claude-code` 行。[E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:43]
- schedule。shipped base / web-app / headless overlay 都不装它。

companion `@deepseek-ai/dsh-plan-mode/invariant` 只校验 `plan/mode.data.active` 为 boolean，**不是** shipped bundle 行。[E: packages/plan/plan-mode/src/invariant.ts:10] [E: packages/plan/plan-mode/src/invariant.ts:23]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/plan/plan-mode/src/index.ts` | `PlanModeController`：服务、waterfall、section、`/plan`、exit 工具、投影定义 |
| `packages/plan/plan-mode/src/types.ts` | `PlanProjection` / `PlanUnitState` 与 `SessionProjectionMap.plan` 的唯一声明处 |
| `packages/plan/plan-mode/src/client.ts` | 客户端命名空间对 `./types` 的纯再导出 |
| `packages/plan/plan-mode/src/invariant.ts` | 可选 companion：只验 `active` 形状 |
| `packages/plan/plan-mode/tests/plan-mode.spec.ts` | catalog 稳定、PTC SDK、无执行门、`set`/`pre-step`、exit 审阅 |
| `packages/plan/plan-mode/tests/integration.spec.ts` | 真 loop：`request/header.tools` 相等；同 step retry 不 flush |
| `packages/plan/plan-mode/tests/projection.spec.ts` | 投影 `pending` 从 `command/run` / `command/done` / `plan/mode` 冷折 |
| `packages/bundle/base/cordis.patch.yml` | **host 面** insert `id: plan-mode` |
| `packages/bundle/web-app/cordis.patch.yml` | 把该行 `disabled: true`，挪到 preset 面 |
| `packages/bundle/headless/cordis.patch.yml` | 不碰 `plan-mode`，host 那一行继续活 |
| `packages/preset/agent-presets/presets/{standard,ptc,cordis}/agent.cordis.yml` | `cordis:group` + `isolate: { planMode: true }` remount |
| `packages/preset/agent-presets/presets/minimal/agent.cordis.yml` | 无 `plan-mode` 行 |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 把 `planMode` publish 进 root 就拒 |
| `vendor/cordis/src/events.ts` | waterfall：不调用 `next()` 不会 `shift` |
| `packages/core/agent-loop/src/agent.ts` | `preStep` 默认 `next` = `{ kind: 'enter', … }` |
| `packages/core/tools/src/index.ts` | `mode === 'ptc'` 时 wire 只留 `run_code` |
| `packages/core/session/src/surface.ts` | `plan/mode` 不是 surface 类型 |

## 数据模型

| 符号 | 形状 | 谁写 | 谁读 |
|---|---|---|---|
| `PlanModeConfig` | 仅 `{ section: string }`，非空；其它 key 在 load 抛错 | bundle / preset 行 `config.section` | `resolveConfig` → `plan:policy` 正文 |
| `SessionEventMap['plan/mode']` | `{ active: boolean }`，log-only，last-wins | `set()` 在无 open turn 时；`onBoundary` 在被接受的 `agent/pre-step` | 投影 `apply`、section 文本、exit execute 门 |
| `pendingIntents` | `WeakMap<Session, { active; narrate }>`，进程本地 | `set()` / `exit_plan_mode` 批准 | `get()`、`plan:policy` 的 pending 覆盖、`onBoundary` |
| `PlanUnitState` | `{ active, wanted, running, activeAtLastHeader }` | 投影 `apply` | `loggedActive` / `hasOpenTurn` 旁的 `planState` |
| `PlanProjection` | `{ active, pending }`；能力缺失 = **没有这个 key** | 投影 `view` | 客户端冷读 |
| `EXIT_PLAN_MODE` | `'exit_plan_mode'` | `ctx.tools.register`（构造时一次） | wire / SDK / execute |
| Cordis 服务名 | `'planMode'` | `super(ctx, 'planMode')` | `ctx.planMode`；preset `isolate.planMode` |

`plan/mode` 列在 `KNOWN_SESSION_EVENT_TYPES`，但 **不是** `deriveMessages()` 的 surface：surface 只有 `user/message` / `assistant/message` / `tool/result`。[E: packages/core/session/src/known-event-types.ts:44] [E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:17] [E: packages/core/session/src/surface.ts:18] 要让模型看见「用户刚切了模式」，控制器另外 `inject` / 改写 pre-step `messages` 一条 plugin `user/message`。

生产路径**没有**名为 `foldPlanMode` 的导出；测试 helper 同名函数只扫 last `plan/mode`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:78] 运行时 committed 值来自投影 `stateOf(session, 'plan').active`。[E: packages/plan/plan-mode/src/index.ts:362] [E: packages/plan/plan-mode/src/index.ts:378]

两条 **pending** 不是同一条队列：

- 运行时 flush 只读 `pendingIntents`。`exit_plan_mode` 批准写 `{ active: false, narrate: false }`，不写 `command/run`。[E: packages/plan/plan-mode/src/index.ts:345]
- 投影 `pending`：`command/run` 且 `name === 'plan'` 记下 `running`；配对 `command/done` 成功且目标不同于当前 `active` 才把 `wanted` 留下；随后的 `plan/mode` 清掉 `wanted`。[E: packages/plan/plan-mode/src/index.ts:137] [E: packages/plan/plan-mode/src/index.ts:142] [E: packages/plan/plan-mode/src/index.ts:148] [E: packages/plan/plan-mode/src/types.ts:23]

`CommandRuntime.execute` 在 handler **之前** append `command/run`。[E: packages/interaction/commands/src/index.ts:342] 所以 UI 冷读能从 log 恢复「有一次尚未 commit 的 `/plan`」；那不等于 `onBoundary` 会在新进程里自动 flush——flush 仍要有 WeakMap 里的 intent。

## 控制流

### 1. 组合：host 装着，web disable，preset isolate remount

1. `dsh-base` 在根 insert 里挂 `id: plan-mode` / `@deepseek-ai/dsh-plan-mode`，并把部署 `section` 写进 `config`。这是 **host 面** 一行；`headless` / `sdk` / `acp` 等叠 base 且 overlay 不 disable 该行的 profile 默认就用这份进程级 `ctx.planMode`。[E: packages/bundle/base/cordis.patch.yml:307] [E: packages/bundle/base/cordis.patch.yml:308] [E: packages/bundle/base/package.json:70]
2. `dsh-web-app` 把同一 `id: plan-mode` 标 `disabled: true`，把模型可见的 plan 从进程根挪走，留给 preset 面 remount。[E: packages/bundle/web-app/cordis.patch.yml:372] [E: packages/bundle/web-app/cordis.patch.yml:373]
3. shipped `standard` / `ptc`（wiki 节点 id `surface.presets.code` 仍是稳定别名）/ `cordis` 各有一组 `id: planning`（`cordis:group`），`isolate: { planMode: true }`，组内再 insert `id: plan-mode`。`minimal` 的 `agent.cordis.yml` 没有这组；Web e2e 里 `minimal` 的 assemble 工具名是 `['bash', 'str_replace_editor']`，没有 `exit_plan_mode`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:104] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:108] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:110] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:111] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:92] [E: apps/cli/tests/web-agent-presets.e2e.ts:290] [E: apps/cli/tests/web-agent-presets.e2e.ts:312]
4. Loader 见 `isolate.planMode === true` 时为该 entry 建 `LocalRealm`，服务实现挂在 realm-private symbol 上，而不是 root 的 `planMode` 槽。[E: vendor/loader/src/config/isolate.ts:81]
5. `mountPreset` 拒绝无 scope 的 context；settle 后跑 `leakedServices`：子树 fiber 提供的实现若 store key 等于 root isolate 槽，整次 mount 抛错并要求 sit behind `isolate` 或挪到 host。[E: packages/preset/agent-presets/src/mount.ts:210] [E: packages/preset/agent-presets/src/mount.ts:382] [E: packages/preset/agent-presets/src/mount.ts:407] [E: packages/preset/agent-presets/src/mount.ts:411]
6. `dsh-headless` 只 insert `code-runtime` / `headless-startup` / `headless-runner`，不 disable `plan-mode`，因此 headless 继续用 base 的 **host 面** 实例。[E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26] [I] overlay 里没有第二条 `plan-mode` 行；断言来自「patch 里不存在该 id」。`dsh --profile sdk|sdk-minimal|acp` 同样不在各自 overlay 里 disable `plan-mode`（`sdk-minimal` 不叠 `dsh-base`，因此只有它自己的完整 insert 里出现了才会有该服务）。

### 2. 构造：登记不看当前 mode

7. `static inject = ['tools', 'systemPrompt', 'sessionProjections']`。缺投影注册表时插件停在 INACTIVE，catalog 里不会出现 `exit_plan_mode`。[E: packages/plan/plan-mode/src/index.ts:171] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:230]
8. 构造立刻 `ctx.tools.register(defineTool({ name: EXIT_PLAN_MODE, … }))`。未激活时也登记；inactive 调用在 execute 里抛 `only available in plan mode`，工具名仍在 schema 表里。[E: packages/plan/plan-mode/src/index.ts:271] [E: packages/plan/plan-mode/src/index.ts:272] [E: packages/plan/plan-mode/src/index.ts:291] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:837]
9. `ctx.systemPrompt.section({ name: 'plan:policy', order: ctx.systemPrompt.getSectionOrder('PLAN_POLICY'), … })`：`PLAN_POLICY` 的数值是 `500`。有 agent 时用 `pendingIntents.active ?? loggedActive` 决定是否吐出 `this.section`，否则空串。[E: packages/plan/plan-mode/src/index.ts:211] [E: packages/plan/plan-mode/src/index.ts:213] [E: packages/core/system-prompt/src/index.ts:126] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:462]
10. `ctx.inject(['commands'], …)` 是可选子 fiber：headless 可以没有命令注册表。投影则是 **必选** inject，`register(planProjectionDefinition)` 在构造里直接跑。[E: packages/plan/plan-mode/src/index.ts:221] [E: packages/plan/plan-mode/src/index.ts:224] [E: packages/plan/plan-mode/tests/projection.spec.ts:30]
11. `resolveConfig` 只接受非空字符串 `section`。缺字段、空白、或出现 `tools` 这类未知键，在 **plugin load** 失败。[E: packages/plan/plan-mode/src/index.ts:101] [E: packages/plan/plan-mode/src/index.ts:105] [E: packages/plan/plan-mode/src/index.ts:109]

### 3. 选择：idle 立刻落盘，open turn 排队

12. 空 log 投影 `init` 为 `active: false`；之后 last `plan/mode` 赢。[E: packages/plan/plan-mode/src/index.ts:135] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:208]
13. `set(agent, active)` 用 `hasOpenTurn`：读 `sessionProjections.stateOf(session, 'turnBoundary').openTurnStartSeq !== null`，而不是 `Agent.status`（post-turn checkpoint 期间 status 仍可能是 `running`）。[E: packages/plan/plan-mode/src/index.ts:366] [E: packages/plan/plan-mode/src/index.ts:369] [E: packages/plan/plan-mode/src/index.ts:417]
14. 无 open turn：`session.append('plan/mode', { active })`，成功后再删 WeakMap；若上一份 `request/header` 告诉模型的是另一种模式，再 `agent.inject` 一条 plugin notice。[E: packages/plan/plan-mode/src/index.ts:427] [E: packages/plan/plan-mode/src/index.ts:430] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:283]
15. 有 open turn：只写 `pendingIntents`，返回 `queued`（或反向选择已排队目标时 `cancelled`）。重复选当前/已排队目标是 `noop`。[E: packages/plan/plan-mode/src/index.ts:418] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:273]
16. `/plan` handler 调同一个 `set()`；非 `off` 且带消息或附件时再 `agent.steer` 一条 user 内容。`/plan off` 在 logged 仍为 active、exit 已排队时重复返回「Leaving…」，只有真正 inactive 才说 already inactive。[E: packages/plan/plan-mode/src/index.ts:235] [E: packages/plan/plan-mode/src/index.ts:246] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:629]

### 4. `agent/pre-step` waterfall：先 `next()`，再 append

17. Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听者必须调用传入的 `next()`，内部才会 `cbs.shift()` 走到下一层。不调用就停在本层。[E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238]
18. 事件合同是 waterfall，payload 带 `agent` / `signal`，`next` 返回 `PreStepDecision`。[E: packages/core/agent/src/runtime-types.ts:238] loop 的 fused dispatcher 把这次 dispatch 绑到该 Agent 的 scope。[E: packages/core/agent/src/dispatch.ts:146] [E: packages/core/agent-loop/src/agent.ts:243]
19. `PlanModeController` **先** `const decision = await next()`，再看 pending。本包没有「故意不 `next` 的 reject 路径」。不调用 `next()` 会吞掉 loop 默认的 `{ kind: 'enter', messages }`。[E: packages/plan/plan-mode/src/index.ts:195] [E: packages/core/agent-loop/src/agent.ts:246]
20. `decision.kind === 'reject'`、`signal.aborted`、或没有 pending：原样返回 `decision`，不 append。[E: packages/plan/plan-mode/src/index.ts:197]
21. 否则 `onBoundary(session)`：目标已等于 logged 则只清 WeakMap；否则 `session.append('plan/mode', { active: target })`，**成功之后**再 `delete`。append 抛错时 `warn` 并留下 pending，step 照样 `enter`。[E: packages/plan/plan-mode/src/index.ts:443] [E: packages/plan/plan-mode/src/index.ts:446] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:450]
22. `narrate === true` 且上一份 header 说的是另一种模式时，把 notice 追加进 `decision.messages`。exit 工具的批准设 `narrate: false`。[E: packages/plan/plan-mode/src/index.ts:205] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:984]
23. 同一步的 `agent/request-error` → `retry` **不会**再跑 `pre-step`。集成测试在 retry 监听里 `set(true)`：两次失败/恢复请求的 `system` 都不含 plan section。[E: packages/plan/plan-mode/tests/integration.spec.ts:162] [E: packages/plan/plan-mode/tests/integration.spec.ts:163] [E: packages/plan/plan-mode/tests/integration.spec.ts:166]

### 5. 换模式不换工具表

24. unit：同一 assemble 在 `plan/mode { active: true }` 前后 `tools` 数组相等；变化的只有 `plan:policy` 文本（空串 ↔ `section`）。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:466] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:467]
25. 真 loop：default 与 plan 两次 `request/header.tools` 都是 `['exit_plan_mode', 'read', 'write']`，并且 `second.tools` 等于 `first.tools`。[E: packages/plan/plan-mode/tests/integration.spec.ts:94] [E: packages/plan/plan-mode/tests/integration.spec.ts:118] [E: packages/plan/plan-mode/tests/integration.spec.ts:135]
26. PTC（registry `mode: 'ptc'`）`wireSchemas` 只把 `run_code` 送上 wire；plan 激活后 assemble 仍是 `['run_code']`，但 `tools:sdk` 仍声明 `exit_plan_mode` binding，且切换前后 SDK 字节相同。没装本包的部署，SDK 里根本没有这个 binding。[E: packages/core/tools/src/index.ts:986] [E: packages/core/tools/src/index.ts:988] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:525] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:554]
27. `mode: 'both'` 时 wire 上同时有 `exit_plan_mode` 与 `run_code`，SDK 仍带 exit binding。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:549]
28. 后挂的 `system-prompt/assemble` 监听者往 `tools` 里塞的名字，plan 不滤掉。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:502]
29. plan 激活时 `write` / `read` / `bash` 的 `tools.execute` 仍成功；集成测试里模型在 plan 下点 `write`，`tool/result` 不是 error。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:604] [E: packages/plan/plan-mode/tests/integration.spec.ts:101] 约束只活在 `plan:policy` 文案。sandbox / approval 是独立轴，不读不写 `plan/mode`。

### 6. 退出：批准只排队，下一拍 accepted pre-step 才翻 logged 状态

30. `exit_plan_mode` execute：无 `exec.agent`、logged 为 inactive、plan 不是以 `#` + 非空白开头、或 `ctx.get('userQuestions')` 缺失，都在 **ask 之前** 失败。审阅走 `userQuestions.ask`，不是 `ctx.approval`。[E: packages/plan/plan-mode/src/index.ts:289] [E: packages/plan/plan-mode/src/index.ts:293]
31. 唯一同意条件：恰好一条 `id === 'plan-review'` 的答案、`selected` 单元素且等于 `Approve`、没有 `custom`。否则当 keep-planning。`ASK_CANCELLED` 改写成「用户把 turn 拿回去说话」；其它错误原样抛。[E: packages/plan/plan-mode/src/index.ts:336] [E: packages/plan/plan-mode/src/index.ts:323]
32. 批准成功只 `pendingIntents.set(..., { active: false, narrate: false })` 并返回 `{ approved: true }`。**当时** logged 仍是 `true`，好让同一 assistant batch 里剩余的 tool-call 还吃 plan 段。[E: packages/plan/plan-mode/src/index.ts:345] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:968]
33. 下一拍被接受的 `agent/pre-step` 才 append `{ active: false }`。此后 assemble 的 `plan:policy` 变空，**工具名表仍与批准前相同**。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:975]
34. 审阅等待期间插件 fiber dispose（HMR）：回来即使人选 Approve，execute 也失败并保持 plan。[E: packages/plan/plan-mode/src/index.ts:331] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:1120]
35. 子 fiber dispose 会卸掉服务、`exit_plan_mode` 登记和 `plan:policy` section；已排队、尚未 append 的 intent 就此消失。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:1177]

## 设计动机

DSH 是 `profile → bundle → agent preset` 叠出来的组合运行时。plan mode 被做成 **log + 投影** 的协作状态，是为了让 resume / fork / 冷读只靠 last `plan/mode` 恢复 committed 值，而不另养一份会和 log 分叉的 live mirror。UI 观察 `session/event` 或投影键 `plan`。

工具表跨模式钉死，是为了 request-cache / `request/header` 形状稳定。PTC 继续只 wire `run_code`；exit 作为 SDK binding 留在生成接口里，而不是突然多出一个直调名。

约束放在 `plan:policy` 而不是 `tools/pre-execute`，是为了让 sandbox / approval 继续做自己的轴。

`isolate: { planMode: true }` 是因为 `PlanModeController` 会 `provide` 服务。Web 把行从 host 挪到 standing preset 之后，两个 session 若把 `planMode` 写进 root realm，第二次 mount 必撞名。goal 留在 host（Gateway Remote 要解析 `goals`）；plan 没有这条 Remote 约束，所以走 per-standing-mount 私有实例。

`pre-step` 先 `next()` 再 append，是为了：被其它监听者 `reject` 的 step 不要偷偷改协作状态；append 失败也不许挡用户这一拍。同 step retry 复用原 assembly，所以 retry 监听里的 `set()` 必须等到下一拍。

## Gotcha

- **catalog 稳定 ≠ 随时能调。** 未激活时 `exit_plan_mode` 仍出现在 schema / SDK 里；execute 按 `loggedActive` 拒绝。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:837]
- **PTC 不能按 wire 名直调 exit。** `mode: 'ptc'` 时直调非 `run_code` 在 registry 层 collapse；测试里的合法路径是 `run_code` 程序 `await tools.exit_plan_mode(...)`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:938] [E: packages/core/tools/src/index.ts:1316]
- **批准当下 logged 不变。** 同一 assistant 回复里排在 exit 后面的 tool-call 仍处于 plan。要等下一 accepted `pre-step`。
- **两套 pending。** `get().pending` 来自 WeakMap；投影 `pending` 来自 `/plan` 的 `command/run`/`command/done`。exit 批准只动前者。进程重启后 WeakMap 空了，投影仍可能显示 pending，直到新的 `plan/mode` 或用户再选一次。[I]
- **`hasOpenTurn` ≠ `status === 'running'`。** 用 `turnBoundary` 投影的 `openTurnStartSeq`。
- **execute 的 heading 比卡片标题更严。** execute 要求 trim 后匹配 `/^#\s+\S/`（ATX h1）；`presentCall` 的 `firstHeading` 接受 `#{1,6}`，所以 `##` 标题能当卡片 title，却过不了 execute。[E: packages/plan/plan-mode/src/index.ts:86] [E: packages/plan/plan-mode/src/index.ts:293]
- **子代理 / owned agent 审阅不可用。** `userQuestions` 在 owner 活着时拒绝；logged 保持 plan，ask 根本不会被调用。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:887]
- **装了 tool 行 ≠ 装了本包。** plan 是「base 真装 / web 卸 / preset remount」；不要把 dormant 故事套到 plan 或 Codex 上。
- **`plan-mode-invariant` 不会随 base 自动出现。** 它只在有人 `plugin` companion 时校验 payload。
- **投影 `stateVersion: 3`。** 还跟踪 `running` 与 `activeAtLastHeader`，不只是 boolean fold。[E: packages/plan/plan-mode/src/index.ts:133]

## Seam 三角

| 角 | 落点 | 包 / ctx 键 / 组合行 |
|---|---|---|
| **Definition** | 服务合同 `ctx.planMode`、事件 `plan/mode`、投影键 `plan` | `@deepseek-ai/dsh-plan-mode`；`super(ctx, 'planMode')`；isolate 名就是 `planMode` |
| **Provider** | 同一 `PlanModeController`（没有第二家 backend 包） | host：`dsh-base` `id: plan-mode`；web：该行 `disabled: true`；`standard`/`ptc`/`cordis`：`id: planning` + `isolate.planMode` 再挂同 id |
| **Consumer** | 同包登记的 `exit_plan_mode`、`plan:policy` section、可选 `/plan`、投影 `plan`；loop 的 `assemble` / `execute` / `agent/pre-step`；客户端读投影或 `session/event` | 不改 `ctx.tools` catalog；`minimal` 不消费本缝。人命令走 `ctx.commands`，不经模型 turn |

Definition 与 Provider 同包，是因为状态机、log 词汇和部署文案绑在一起。Consumer 里唯一的模型可见名是 `exit_plan_mode`；字段表留给 T1。

## Sources

- packages/plan/plan-mode/src/index.ts
- packages/plan/plan-mode/src/types.ts
- packages/plan/plan-mode/src/invariant.ts
- packages/plan/plan-mode/src/client.ts
- packages/plan/plan-mode/package.json
- packages/plan/plan-mode/tests/plan-mode.spec.ts
- packages/plan/plan-mode/tests/integration.spec.ts
- packages/plan/plan-mode/tests/projection.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts
- packages/preset/agent-presets/src/mount.ts
- vendor/cordis/src/events.ts
- vendor/loader/src/config/isolate.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/dispatch.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/known-event-types.ts
- packages/core/tools/src/index.ts
- packages/core/system-prompt/src/index.ts
- packages/interaction/commands/src/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — Cordis 组合运行时全仓地图；host 面 vs agent-preset 面。
- [`spine.turn-and-step`](../../spine/turn-and-step.md) — `agent/pre-step` 在 claim 之后、`step/start` 之前；`reject` 会 `blocked`。
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → preset`；web 把模型可见行 disable 后再 remount。五个 shipped profile：`web` / `headless` / `sdk` / `sdk-minimal` / `acp`。
- [`spine.trace-code-mode`](../../spine/trace-code-mode.md) — PTC `mode: ptc` 只 wire `run_code`；exit 走 SDK 子调度。
- [`surface.tools.exit-plan-mode`](../../surface/tools/exit-plan-mode.md) — 模型可见工具的 schema / 审阅 / heading。
- [`surface.presets.standard`](../../surface/presets/standard.md) — 默认 Web preset；`isolate.planMode` remount。
- [`surface.presets.minimal`](../../surface/presets/minimal.md) — 不装 plan-mode。
- [`surface.presets.code`](../../surface/presets/code.md) — 稳定别名；目录是 `presets/ptc/`。
- [`subsys.core.tools`](../core/tools.md) — `ctx.tools` catalog 与 `wireSchemas`。
- [`subsys.core.agent-tool-presentation`](../core/agent-tool-presentation.md) — preset 行 `presentAs`；plan 不改 mode。
- [`subsys.core.code-mode`](../core/code-mode.md) — PTC `run_code` 权威页（`ptc.ts`）。
- [`subsys.core.system-prompt`](../core/system-prompt.md) — `section()` 与 `system-prompt/assemble`。
- [`subsys.core.agent-loop`](../core/agent-loop.md) — 默认 `ReactLoopAgent` 与 `preStep`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — host insert `id: plan-mode`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — disable 后交给 preset。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — standing mount、`leakedServices`、isolate realm。
