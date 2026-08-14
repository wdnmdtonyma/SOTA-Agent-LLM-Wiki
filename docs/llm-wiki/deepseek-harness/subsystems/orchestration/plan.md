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
  - packages/plan/plan-mode/package.json
  - packages/plan/plan-mode/tests/plan-mode.spec.ts
  - packages/plan/plan-mode/tests/integration.spec.ts
  - packages/plan/plan-mode/tests/projection.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
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
related:
  - spine.overview
  - spine.turn-and-step
  - spine.composition-boot
  - spine.trace-code-mode
  - surface.tools.exit-plan-mode
  - surface.presets.standard
  - surface.presets.minimal
  - subsys.core.tools
  - subsys.core.agent-tool-presentation
  - subsys.core.system-prompt
  - subsys.core.agent-loop
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-plan-mode` 把 **plan mode** 做成一份按 session log 折叠的协作状态：`PlanModeController` 发布 `ctx.planMode`，用 `plan/mode` 事件（last-wins）记住是否激活，用 `plan:policy` section 把部署文案送进 system prompt，并用始终登记的 wire 名 `exit_plan_mode`（`EXIT_PLAN_MODE`）给人审阅后退出。换模式只改 section 与 log，**不**改 `ctx.tools` catalog。它是 Cordis 组合运行时（`profile → bundle → agent preset`）里的一条可 isolate 服务，不是又一个 coding-agent 内置开关。

## 能回答的问题

- `ctx.planMode` 是 host 面单例还是 preset isolate 私有实例？`dsh-base` / `dsh-web-app` / shipped preset / `minimal` 各怎么装？
- 进入或离开 plan mode 会不会改 `request/header.tools`？Code Mode 的 wire 表和 SDK binding 呢？
- `agent/pre-step` 为什么必须先 `await next()`，pending 的 `plan/mode` 何时才 append？
- `/plan`、`exit_plan_mode`、进程内 `pendingIntents`、投影键 `plan` 是不是同一条队列？
- sandbox / approval 读不读 plan 状态？plan 会不会在 `tools/pre-execute` 拦 `write` / `bash`？
- resume / fork / 冷读怎样恢复 committed 状态？没有 live mirror 时 UI 看什么？

## 职责边界

本包拥有：Cordis 服务 `ctx.planMode`（`PlanModeController`）、事件类型 `plan/mode`、折叠函数 `foldPlanMode`、部署 Config `{ section }`、prompt section `plan:policy`、人命令 `/plan`（仅当 `ctx.commands` 已组合）、投影单元 `plan`（仅当 `ctx.sessionProjections` 已组合）、以及模型可见工具 `exit_plan_mode` 的登记与 execute 门。[E: packages/plan/plan-mode/src/index.ts:59] [E: packages/plan/plan-mode/src/index.ts:67] [E: packages/plan/plan-mode/src/index.ts:184] [E: packages/plan/plan-mode/src/index.ts:198]

本包**不**拥有：

- `ctx.tools` 注册表、`presentAs` / `wireSchemas`、`tools/pre-execute` 管线 —— [`subsys.core.tools`](../core/tools.md)。
- Code Mode 只把 `run_code` 送上 wire、其余能力进 SDK —— [`subsys.core.agent-tool-presentation`](../core/agent-tool-presentation.md) / [`spine.trace-code-mode`](../../spine/trace-code-mode.md)。本页只钉「plan 开关不改那张表」。
- `exit_plan_mode` 的 JSON 字段表、heading 细则、审阅卡片 —— [`surface.tools.exit-plan-mode`](../../surface/tools/exit-plan-mode.md)。
- `system-prompt/assemble` waterfall 本身 —— [`subsys.core.system-prompt`](../core/system-prompt.md)。本包只 `section()` 贡献一段。
- `ReactLoopAgent.preStep` / turn 合同 —— [`subsys.core.agent-loop`](../core/agent-loop.md) / [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- sandbox / approval / permission preset。它们的 TypeScript 源不出现 `planMode` / `foldPlanMode` / `plan/mode`；plan 也不在 `tools/pre-execute` 里拦变异工具。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:545] [E: packages/plan/plan-mode/tests/integration.spec.ts:92]
- goal 的 activation（进程本地、不落盘）——那是另一条缝。plan 的 **committed** 状态就是 `plan/mode` 事件；不落盘的是 `pendingIntents` WeakMap。
- Codex / Claude 子代理后端。`dsh-base` 没有 `subagent-codex` / `subagent-claude-code` 行，也不是「装了但 dormant」。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39]
- schedule。shipped base / web-app / headless / 任一 shipped preset 都不装它。

companion `@deepseek-ai/dsh-plan-mode/invariant` 只校验 `plan/mode.data.active` 为 boolean，**不是** shipped bundle 行。[E: packages/plan/plan-mode/src/invariant.ts:10] [E: packages/plan/plan-mode/src/invariant.ts:23]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/plan/plan-mode/src/index.ts` | `PlanModeController`：服务、waterfall、section、`/plan`、exit 工具、`foldPlanMode` |
| `packages/plan/plan-mode/src/types.ts` | `PlanProjection` 与 `SessionProjectionMap.plan` 的唯一声明处 |
| `packages/plan/plan-mode/src/invariant.ts` | 可选 companion：只验 `active` 形状 |
| `packages/plan/plan-mode/tests/plan-mode.spec.ts` | catalog 稳定、Code Mode SDK、无执行门、`set`/`pre-step`、exit 审阅 |
| `packages/plan/plan-mode/tests/integration.spec.ts` | 真 loop：`request/header.tools` deep-equal；同 step retry 不 flush |
| `packages/plan/plan-mode/tests/projection.spec.ts` | 投影 `pending` 只从 `command/run` + `plan/mode` 冷折 |
| `packages/bundle/base/cordis.patch.yml` | **host 面** insert `id: plan-mode` |
| `packages/bundle/web-app/cordis.patch.yml` | 把该行 `disabled: true`，挪到 preset 面 |
| `packages/bundle/headless/cordis.patch.yml` | 不碰 `plan-mode`，host 那一行继续活 |
| `apps/cli/config/agent-presets/{standard,code,cordis}/agent.cordis.yml` | `cordis:group` + `isolate: { planMode: true }` remount |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | 无 `plan-mode` 行 |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 把 `planMode` publish 进 root 就拒 |
| `vendor/cordis/src/events.ts` | waterfall：不调用 `next()` 不会 `shift` |
| `packages/core/agent-loop/src/agent.ts` | `preStep` 默认 `next` = `{ kind: 'enter', … }` |
| `packages/core/tools/src/index.ts` | `mode === 'code'` 时 wire 只留 `run_code` |
| `packages/core/session/src/surface.ts` | `plan/mode` 不是 surface 类型 |

## 数据模型

| 符号 | 形状 | 谁写 | 谁读 |
|---|---|---|---|
| `PlanModeConfig` | 仅 `{ section: string }`，非空；其它 key 在 load 抛错 | bundle / preset 行 `config.section` | `resolveConfig` → `plan:policy` 正文 |
| `SessionEventMap['plan/mode']` | `{ active: boolean }`，log-only，last-wins | `set()` 在无 open turn 时；`onBoundary` 在被接受的 `agent/pre-step` | `foldPlanMode`、section 文本、exit execute 门、投影 `apply` |
| `pendingIntents` | `WeakMap<Session, { active; narrate }>`，进程本地 | `set()` / `exit_plan_mode` 批准 | `get()`、`plan:policy` 的 pending 覆盖、`onBoundary` |
| `PlanProjection` | `{ active, pending }`；能力缺失 = **没有这个 key** | 投影 `view` | 客户端冷读 |
| `EXIT_PLAN_MODE` | `'exit_plan_mode'` | `ctx.tools.register`（构造时一次） | wire / SDK / execute |
| Cordis 服务名 | `'planMode'` | `super(ctx, 'planMode')` | `ctx.planMode`；preset `isolate.planMode` |

`plan/mode` 列在 `KNOWN_SESSION_EVENT_TYPES`，但 **不是** `deriveMessages()` 的 surface：surface 只有 `user/message` / `assistant/message` / `tool/result`。[E: packages/core/session/src/known-event-types.ts:19] [E: packages/core/session/src/known-event-types.ts:40] [E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:17] [E: packages/core/session/src/surface.ts:18] 要让模型看见「用户刚切了模式」，控制器另外 `inject` / 改写 pre-step `messages` 一条 plugin `user/message`。这就是本缝上的 `model-visible ⟺ logged`。

两条 **pending** 不是同一条队列：

- 运行时 flush 只读 `pendingIntents`。`exit_plan_mode` 批准写 `{ active: false, narrate: false }`，不写 `command/run`。[E: packages/plan/plan-mode/src/index.ts:379]
- 投影 `pending` 只看已落盘的 `/plan`：`command/run` 且 `name === 'plan'` 记下 `wanted`，随后的 `plan/mode` 清掉它。[E: packages/plan/plan-mode/src/index.ts:250] [E: packages/plan/plan-mode/src/index.ts:255] [E: packages/plan/plan-mode/src/types.ts:18]

`CommandRuntime.execute` 在 handler **之前** append `command/run`。[E: packages/interaction/commands/src/index.ts:308] 所以 UI 冷读能从 log 恢复「有一次尚未 commit 的 `/plan`」；那不等于 `onBoundary` 会在新进程里自动 flush——flush 仍要有 WeakMap 里的 intent。

## 控制流

### 1. 组合：host 装着，web disable，preset isolate remount

1. `dsh-base` 在根 insert 里挂 `id: plan-mode` / `@deepseek-ai/dsh-plan-mode`，并把部署 `section` 写进 `config`。这是 **host 面** 一行；headless 默认就用这份进程级 `ctx.planMode`。[E: packages/bundle/base/cordis.patch.yml:265] [E: packages/bundle/base/cordis.patch.yml:266] [E: packages/bundle/base/package.json:68]
2. `dsh-web-app` 把同一 `id: plan-mode` 标 `disabled: true`，把模型可见的 plan 从进程根挪走，留给 preset 面 remount。[E: packages/bundle/web-app/cordis.patch.yml:348] [E: packages/bundle/web-app/cordis.patch.yml:349]
3. shipped `standard` / `code` / `cordis` 各有一组 `id: planning`（`cordis:group`），`isolate: { planMode: true }`，组内再 insert `id: plan-mode`。`minimal` 的 `agent.cordis.yml` 没有这组；Web e2e 里 `minimal` 的 tool 名表是 `['bash', 'str_replace_editor']`，没有 `exit_plan_mode`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:104] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:110] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:115] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:96] [E: apps/cli/tests/web-agent-presets.e2e.ts:207] [E: apps/cli/tests/web-agent-presets.e2e.ts:227]
4. Loader 见 `isolate.planMode === true` 时为该 entry 建 `LocalRealm`，服务实现挂在 realm-private symbol 上，而不是 root 的 `planMode` 槽。[E: vendor/loader/src/config/isolate.ts:81]
5. `mountPreset` settle 后跑 `leakedServices`：子树 fiber 提供的实现，若 store key 等于 `ctx.root[Context.isolate][name]`，就算泄漏进 root realm，整次 mount 抛错并要求「sit behind an `isolate` realm or move to the host composition」。`PlanModeController` 是 `Service`，preset 面不 isolate 就会撞这扇门。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365]
6. `dsh-headless` 只 insert `code-runtime` / `headless-startup` / `headless-runner`，不 disable `plan-mode`，因此 headless 继续用 base 的 **host 面** 实例。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] [I] headless 没有第二条 `plan-mode` 行可引用；断言来自「patch 里不存在该 id」。

### 2. 构造：登记不看当前 mode

7. `static inject = ['tools', 'systemPrompt']`。缺这两条 seam，插件停在 INACTIVE，catalog 里不会出现 `exit_plan_mode`。[E: packages/plan/plan-mode/src/index.ts:185]
8. 构造立刻 `ctx.tools.register(defineTool({ name: EXIT_PLAN_MODE, … }))`。未激活时也登记；inactive 调用在 execute 里抛 `only available in plan mode`，工具名仍在 schema 表里。[E: packages/plan/plan-mode/src/index.ts:305] [E: packages/plan/plan-mode/src/index.ts:306] [E: packages/plan/plan-mode/src/index.ts:324] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:711]
9. `ctx.systemPrompt.section({ name: 'plan:policy', order: 50, text })`：有 agent 时用 `pendingIntents.active ?? foldPlanMode(events)` 决定是否吐出 `this.section`，否则空串。无 agent 的 assemble 也得到空 section，但工具仍在。[E: packages/plan/plan-mode/src/index.ts:226] [E: packages/plan/plan-mode/src/index.ts:231] [E: packages/core/system-prompt/src/index.ts:381] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:419]
10. `ctx.inject(['commands'], …)` / `ctx.inject(['sessionProjections'], …)` 是可选子 fiber：headless 可以没有命令注册表，投影缺席时客户端只是看不到 `plan` 这个 key。[E: packages/plan/plan-mode/src/index.ts:244] [E: packages/plan/plan-mode/src/index.ts:269] [E: packages/plan/plan-mode/tests/projection.spec.ts:113]
11. `resolveConfig` 只接受非空字符串 `section`。缺字段、空白、或出现 `tools` 这类未知键，在 **plugin load** 失败，不会 silently 忽略。[E: packages/plan/plan-mode/src/index.ts:109] [E: packages/plan/plan-mode/src/index.ts:112] [E: packages/plan/plan-mode/src/index.ts:116]

### 3. 选择：idle 立刻落盘，open turn 排队

12. `foldPlanMode(events, end?)` 空前缀为 `false`，之后 last `plan/mode` 赢。[E: packages/plan/plan-mode/src/index.ts:129] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:181]
13. `set(agent, active)` 用 `hasOpenTurn`（最后是 `turn/start` 还是 `turn/end`）而不是 `Agent.status`：post-turn checkpoint 期间 status 仍可能是 `running`，但已经不会再跑 in-turn `pre-step`。[E: packages/plan/plan-mode/src/index.ts:161] [E: packages/plan/plan-mode/src/index.ts:430]
14. 无 open turn：`session.append('plan/mode', { active })`，成功后再删 WeakMap；若上一份 `request/header` 告诉模型的是另一种模式，再 `agent.inject` 一条 plugin notice。[E: packages/plan/plan-mode/src/index.ts:440] [E: packages/plan/plan-mode/src/index.ts:443] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:229]
15. 有 open turn：只写 `pendingIntents`，返回 `queued`（或反向选择已排队目标时 `cancelled`）。重复选当前/已排队目标是 `noop`。[E: packages/plan/plan-mode/src/index.ts:431] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:211]
16. `/plan` handler 调同一个 `set()`；非 `off` 且带消息时再 `agent.steer` 一条 user 文本。`/plan off` 在 fold 仍为 active、exit 已排队时重复返回「Leaving…」，只有真正 inactive 才说 already inactive。[E: packages/plan/plan-mode/src/index.ts:277] [E: packages/plan/plan-mode/src/index.ts:294] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:625]

### 4. `agent/pre-step` waterfall：先 `next()`，再 append

17. Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听者必须调用传入的 `next()`，内部才会 `cbs.shift()` 走到下一层（含 loop 默认行为）。不调用就停在本层。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239]
18. 事件合同是 waterfall，payload 带 `agent` / `signal`，`next` 返回 `PreStepDecision`。[E: packages/core/agent/src/runtime-types.ts:231] loop 的 fused dispatcher 把这次 dispatch 绑到该 Agent 的 scope。[E: packages/core/agent/src/dispatch.ts:146] [E: packages/core/agent-loop/src/agent.ts:234]
19. `PlanModeController` **先** `const decision = await next()`，再看 pending。本包没有「故意不 `next` 的 reject 路径」（对比 goal-round-driver 可以不 `next` 地 `reject`）。不调用 `next()` 会吞掉 loop 默认的 `{ kind: 'enter', messages }`，step 永远进不去。[E: packages/plan/plan-mode/src/index.ts:209]
20. `decision.kind === 'reject'`、`signal.aborted`、或没有 pending：原样返回 `decision`，不 append。[E: packages/plan/plan-mode/src/index.ts:211]
21. 否则 `onBoundary(session)`：目标已等于 fold 则只清 WeakMap；否则 `session.append('plan/mode', { active: target })`，**成功之后**再 `delete`。append 抛错时 `warn` 并留下 pending，step 照样 `enter`——policy 不许挡这一拍。[E: packages/plan/plan-mode/src/index.ts:456] [E: packages/plan/plan-mode/src/index.ts:459] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:375]
22. `narrate === true` 且上一份 header 说的是另一种模式时，把 notice 追加进 `decision.messages`（随后 loop 写成 `user/message`）。exit 工具的批准设 `narrate: false`：工具结果自己叙述，不再插 notice。[E: packages/plan/plan-mode/src/index.ts:219] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:858]
23. 同一步的 `agent/request-error` → `retry` **不会**再跑 `pre-step`。集成测试在 retry 监听里 `set(true)`：两次失败/恢复请求的 `system` 都不含 plan section，`plan/mode` 要等下一 turn 的 `pre-step` 才落到 `step/end` 与下一 `step/start` 之间。[E: packages/plan/plan-mode/tests/integration.spec.ts:154] [E: packages/plan/plan-mode/tests/integration.spec.ts:156] [E: packages/plan/plan-mode/tests/integration.spec.ts:172]

### 5. 换模式不换工具表

24. unit：同一 assemble 在 `plan/mode { active: true }` 前后 `tools` 数组 deep-equal；变化的只有 `plan:policy` 文本（空串 ↔ `section`）。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:406] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:411]
25. 真 loop：default 与 plan 两次 `request/header.tools` 都是 `['exit_plan_mode', 'read', 'write']`，并且 `second.tools` deep-equal `first.tools`。[E: packages/plan/plan-mode/tests/integration.spec.ts:85] [E: packages/plan/plan-mode/tests/integration.spec.ts:109] [E: packages/plan/plan-mode/tests/integration.spec.ts:126]
26. Code Mode（registry `mode: 'code'`）`wireSchemas` 只把 `run_code` 送上 wire；plan 激活后 assemble 仍是 `['run_code']`，但 `tools:sdk` 仍声明 `exit_plan_mode` binding，且切换前后 SDK 字节相同。没装本包的部署，SDK 里根本没有这个 binding。[E: packages/core/tools/src/index.ts:994] [E: packages/core/tools/src/index.ts:996] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:468] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:513] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:523]
27. `mode: 'both'` 时 wire 上同时有 `exit_plan_mode` 与 `run_code`，SDK 仍带 exit binding。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:491]
28. 后挂的 `system-prompt/assemble` 监听者往 `tools` 里塞的名字，plan 不滤掉。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:446]
29. plan 激活时 `write` / `read` / `bash` 的 `tools.execute` 仍成功；集成测试里模型在 plan 下点 `write`，`tool/result` 不是 error，fold 仍为 plan。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:545] [E: packages/plan/plan-mode/tests/integration.spec.ts:92] 约束只活在 `plan:policy` 文案。sandbox / approval 是独立轴，不读不写 `plan/mode`。

### 6. 退出：批准只排队，下一拍 accepted pre-step 才翻 fold

30. `exit_plan_mode` execute：无 `exec.agent`、fold 为 inactive、plan 不是以 `#` + 非空白开头、或 `ctx.get('userQuestions')` 缺失，都在 **ask 之前** 失败。审阅走 `userQuestions.ask`，不是 `ctx.approval`。[E: packages/plan/plan-mode/src/index.ts:323] [E: packages/plan/plan-mode/src/index.ts:330]
31. 唯一同意条件：恰好一条 `id === 'plan-review'` 的答案、`selected` 单元素且等于 `Approve`、没有 `custom`。否则当 keep-planning（可附 feedback）。`ASK_CANCELLED` 改写成「用户把 turn 拿回去说话」；其它错误原样抛。[E: packages/plan/plan-mode/src/index.ts:370] [E: packages/plan/plan-mode/src/index.ts:357]
32. 批准成功只 `pendingIntents.set(..., { active: false, narrate: false })` 并返回 `{ approved: true }`。**当时** `foldPlanMode` 仍是 `true`，好让同一 assistant batch 里剩余的 tool-call 还吃 plan 段。[E: packages/plan/plan-mode/src/index.ts:379] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:774]
33. 下一拍被接受的 `agent/pre-step` 才 append `{ active: false }`。此后 assemble 的 `plan:policy` 变空，**工具名表仍与批准前相同**。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:848]
34. 审阅等待期间插件 fiber dispose（HMR）：回来即使人选 Approve，execute 也失败并保持 plan，避免「成功了却再也 flush 不了」。[E: packages/plan/plan-mode/src/index.ts:365] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:991]
35. 子 fiber dispose 会卸掉服务、`exit_plan_mode` 登记和 `plan:policy` section；已排队、尚未 append 的 intent 就此消失。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:1047]

## 设计动机

DSH 是 `profile → bundle → agent preset` 叠出来的组合运行时，不是「进程写死一份工具清单的 coding agent」。plan mode 被做成 **log-only 协作状态**，是为了让 resume / fork / 冷读只靠 last `plan/mode` 恢复 committed 值，而不另养一份会和 log 分叉的 live mirror。UI 观察 `session/event` 或投影键 `plan`。

工具表跨模式钉死，是为了 request-cache / `request/header` 形状稳定：同一会话切 plan 不应变成另一次「工具集变了」的 cache miss。Code Mode 继续只 wire `run_code`；exit 作为 SDK binding 留在生成接口里，而不是突然多出一个直调名。

约束放在 `plan:policy` 而不是 `tools/pre-execute`，是为了让 sandbox / approval 继续做自己的轴。plan 文案可以禁止「动手」，但执行缝并不读取这份状态——部署若要硬拦变异，应配 sandbox / approval，而不是指望 plan 当门卫。

`isolate: { planMode: true }` 是因为 `PlanModeController` 会 `provide` 服务。Web 把行从 host 挪到 standing preset 之后，两个 session 若把 `planMode` 写进 root realm，第二次 mount 必撞名；`leakedServices` 在第一次就会拒。goal 留在 host（Gateway Remote 要解析 `goals`）；plan 没有这条 Remote 约束，所以走 per-standing-mount 私有实例。

`pre-step` 先 `next()` 再 append，是为了：被其它监听者 `reject` 的 step 不要偷偷改协作状态；append 失败也不许挡用户这一拍。同 step retry 复用原 assembly，所以 retry 监听里的 `set()` 必须等到下一拍。

## Gotcha

- **catalog 稳定 ≠ 随时能调。** 未激活时 `exit_plan_mode` 仍出现在 schema / SDK 里；execute 按 `foldPlanMode` 拒绝。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:711]
- **Code Mode 不能按 wire 名直调 exit。** `mode: 'code'` 时直调非 `run_code` 在 registry 层失败；测试里的合法路径是 `run_code` 程序 `await tools.exit_plan_mode(...)`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:468] [E: packages/core/tools/src/index.ts:1325]
- **批准当下 fold 不变。** 同一 assistant 回复里排在 exit 后面的 tool-call 仍处于 plan。要等下一 accepted `pre-step`。
- **两套 pending。** `get().pending` 来自 WeakMap；投影 `pending` 来自 `/plan` 的 `command/run`。exit 批准只动前者。进程重启后 WeakMap 空了，投影仍可能显示 pending，直到新的 `plan/mode` 或用户再选一次。[I]
- **`hasOpenTurn` ≠ `status === 'running'`。** 用 turn 开闭判断能不能立刻 append。
- **execute 的 heading 比卡片标题更严。** execute 要求 trim 后匹配 `/^#\s+\S/`（ATX h1）；`presentCall` 的 `firstHeading` 接受 `#{1,6}`，所以 `##` 标题能当卡片 title，却过不了 execute。[E: packages/plan/plan-mode/src/index.ts:93] [E: packages/plan/plan-mode/src/index.ts:327]
- **子代理 / owned agent 审阅不可用。** `userQuestions` 在 owner 活着时拒绝；fold 保持 plan，ask 根本不会被调用。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:761]
- **装了 tool 行 ≠ 装了本包。** 对照：`standard` 里 `tool-subagent-codex` 可以 `disabled: true`，但 base **根本没有** Codex/Claude 后端行。plan 则是「base 真装 / web 卸 / preset remount」；不要把旧 Note 的 dormant 故事套到 plan 或 Codex 上。
- **`plan-mode-invariant` 不会随 base 自动出现。** 它只在有人 `plugin` companion 时校验 payload。

## Seam 三角

| 角 | 落点 | 包 / ctx 键 / 组合行 |
|---|---|---|
| **Definition** | 服务合同 `ctx.planMode`、事件 `plan/mode`、投影键 `plan` | `@deepseek-ai/dsh-plan-mode`；`super(ctx, 'planMode')`；isolate 名就是 `planMode` |
| **Provider** | 同一 `PlanModeController`（没有第二家 backend 包，不像 `llm` 的 adapter 或 `subagents` 的 `registerProvider`） | host：`dsh-base` `id: plan-mode`；web：该行 `disabled: true`；`standard`/`code`/`cordis`：`id: planning` + `isolate.planMode` 再挂同 id |
| **Consumer** | 同包登记的 `exit_plan_mode`、`plan:policy` section、可选 `/plan`、可选投影 `plan`；loop 的 `assemble` / `execute` / `agent/pre-step`；客户端读投影或 `session/event` | 不改 `ctx.tools` catalog；`minimal` 不消费本缝。人命令走 `ctx.commands`，不经模型 turn |

Definition 与 Provider 同包，是因为状态机、log 词汇和部署文案绑在一起，没有可替换的「另一家 plan 后端」。Consumer 里唯一的模型可见名是 `exit_plan_mode`；字段表留给 T1。

## Sources

- packages/plan/plan-mode/src/index.ts
- packages/plan/plan-mode/src/types.ts
- packages/plan/plan-mode/src/invariant.ts
- packages/plan/plan-mode/package.json
- packages/plan/plan-mode/tests/plan-mode.spec.ts
- packages/plan/plan-mode/tests/integration.spec.ts
- packages/plan/plan-mode/tests/projection.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
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
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → preset`；web 把模型可见行 disable 后再 remount。
- [`spine.trace-code-mode`](../../spine/trace-code-mode.md) — `mode: code` 只 wire `run_code`；exit 走 SDK 子调度。
- [`surface.tools.exit-plan-mode`](../../surface/tools/exit-plan-mode.md) — 模型可见工具的 schema / 审阅 / heading。
- [`surface.presets.standard`](../../surface/presets/standard.md) — 默认 Web preset；`isolate.planMode` remount。
- [`surface.presets.minimal`](../../surface/presets/minimal.md) — 不装 plan-mode。
- [`subsys.core.tools`](../core/tools.md) — `ctx.tools` catalog 与 `wireSchemas`。
- [`subsys.core.agent-tool-presentation`](../core/agent-tool-presentation.md) — preset 行 `presentAs`；plan 不改 mode。
- [`subsys.core.system-prompt`](../core/system-prompt.md) — `section()` 与 `system-prompt/assemble`。
- [`subsys.core.agent-loop`](../core/agent-loop.md) — 默认 `ReactLoopAgent` 与 `preStep`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — host insert `id: plan-mode`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — disable 后交给 preset。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — standing mount、`leakedServices`、isolate realm。
