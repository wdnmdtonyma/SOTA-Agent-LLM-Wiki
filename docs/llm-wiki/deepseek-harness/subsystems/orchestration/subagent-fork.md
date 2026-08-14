---
id: subsys.orchestration.subagent-fork
title: in-process fork
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts
  - packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/descriptor-seed.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/core/agent/src/index.ts
  - packages/core/session/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - ForkInProcessProvider
  - completedTurnPrefix
related:
  - spine.trace-subagent
  - spine.overview
  - subsys.orchestration.subagent
  - subsys.orchestration.subagent-in-process
  - surface.tools.subagent-fork
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-subagent-fork-in-process` 是 **host 面** in-process **fork** Provider：默认 registry 名 `fork`，`inheritsParentContext = true`。`start` 与 `prepareContinuable` 都把父 session **最后一个已完成 turn** 的 prefix（含最后一条 `turn/end`）种进子 session；进行中的 tool-call turn 不进 seed。空 prefix 省略 `seed`，子 session 与 spawn 一样从零开始。

## 能回答的问题

- 默认 provider 名是什么？谁在哪一层 `registerProvider`？preset 会不会再装一份 backend？
- `inheritsParentContext = true` 继承的是哪一段对话？工具表、sandbox、审批权限跟不跟着走？
- `completedTurnPrefix` 切在哪条事件？父正在飞的 tool-call turn 为什么不能进 seed？
- 父还没有任何 `turn/end` 时，fork 和 spawn 的孩子差在哪？
- host-base 的 `tool-subagent-fork` 是 `backgroundMode: one-shot`，`standard` / `code` / `cordis` 又写成 `continuable`。默认 `dsh web` 吃哪一边？
- one-shot `ForkInProcessProvider.start` 与 continuable `prepareContinuable` 各自贡献什么？谁拥有孩子之后的生命周期？

## 职责边界

本包拥有：**host 面** `ForkInProcessProvider`（默认名 `fork`）、切点函数 `completedTurnPrefix`、以及 `apply` 里对 `ctx.subagents.registerProvider` 的登记。它决定「种哪一段父 log、空前缀是否省略 `seed`」。`inject` 只有 `['subagents']`，故意不 `inject: tools`，避免 apply 时序绑死模型可见工具表。[E: packages/subagent/subagent-fork-in-process/src/index.ts:28] [E: packages/subagent/subagent-fork-in-process/src/index.ts:93]

本页**不**拥有：

- `ctx.subagents` 缝、`registerProvider` 表、`start` / `startContinuable` 的 capability 校验与 continuation manager —— [subsys.orchestration.subagent](subagent.md)
- 共享库 `startInProcessRun`、`applyChildComposition`、深度预算、structured 捕获 —— [subsys.orchestration.subagent-in-process](subagent-in-process.md)（driver **不是** bundle 行；fork 与 spawn 共用）
- 无 seed、`inheritsParentContext = false` 的 spawn backend —— 同一 in-process 页
- 模型可见名 `subagent_fork` 的 schema / `run_in_background` 字段表 —— [surface.tools.subagent-fork](../../surface/tools/subagent-fork.md)
- `ctx.jobs`、workflow 引擎、Codex / Claude 进程外 backend
- 父 / 子 `tools/pre-execute` 管线本身 —— [spine.trace-subagent](../../spine/trace-subagent.md)

`dsh-base` **装了** `id: subagent-fork-in-process`（`providerName: fork`）。preset **不再**插这份 backend，只决定要不要把 Consumer 工具绑到名 `fork`。[E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:303]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent-fork-in-process/src/index.ts` | `name` / `inject` / `Config` / `completedTurnPrefix` / `ForkInProcessProvider` / `apply` |
| `packages/subagent/subagent-in-process-driver/src/index.ts` | 共享 one-shot 驱动 `startInProcessRun`；continuable **不**走这里 |
| `packages/subagent/subagent-spawn-in-process/src/index.ts` | 对照：同进程、无 seed、`inheritsParentContext = false` |
| `packages/subagent/subagent/src/types.ts` | `SubagentProvider.inheritsParentContext`、`ContinuableCreateSpec.seed` |
| `packages/subagent/subagent/src/index.ts` | `registerProvider`、`start`、私有 `prepareContinuable` 转发 |
| `packages/subagent/subagent/src/continuation.ts` | continuable 在创建时调一次 provider `prepareContinuable` |
| `packages/subagent/subagent/src/descriptor-seed.ts` | continuable 把 prefix + `subagent/descriptor` 编成子自己的 seed |
| `packages/subagent/subagent/src/child-agent.ts` | `childSessionMeta.seedLength`、`applyChildComposition`、审批钉 `'never'` |
| `packages/subagent/tool-subagent/src/index.ts` | Consumer：按 `inheritsParentContext` 选文案；`backgroundMode` 决定 `start` 还是 `startContinuable` |
| `packages/bundle/base/cordis.patch.yml` | host 插 backend + host 工具行 `backgroundMode: one-shot` |
| `packages/bundle/web-app/cordis.patch.yml` | disable host `tool-subagent-fork`，backend 留下 |
| `apps/cli/config/agent-presets/{standard,code,cordis}/agent.cordis.yml` | preset 把同一 `id` remount 成 `continuable` |
| `packages/subagent/subagent-fork-in-process/tests/*.spec.ts` | 空前缀、中途 fork、`readResult` 不借父文本、与 spawn 共存 |

## 数据模型

| 符号 / 字段 | 要点 |
|---|---|
| `Config.providerName` | 默认 `'fork'`。这是 `ctx.subagents` 上的 registry 键，不是模型可见 tool 名。[E: packages/subagent/subagent-fork-in-process/src/index.ts:37] |
| `ForkInProcessProvider.name` | 构造参数 = `config.providerName`。 |
| `inheritsParentContext` | 写死 `true`。只描述「孩子看见父已完成 turn 的对话 prefix」。**不**描述工具表、injected services、sandbox、审批权威。[E: packages/subagent/subagent-fork-in-process/src/index.ts:64] [E: packages/subagent/subagent/src/types.ts:295] |
| `capabilities` | `{ outputSchema, depthLimit, toolFilter, persona }` 全 `true`，与 spawn 相同。[E: packages/subagent/subagent-fork-in-process/src/index.ts:62] |
| `completedTurnPrefix(parent)` | `parent.session.events.findLast(e => e.type === 'turn/end')`，再 `slice(0, lastEnd.seq + 1)`。无 `turn/end` → `[]`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:50] [E: packages/subagent/subagent-fork-in-process/src/index.ts:53] |
| `InProcessRunOptions.seed` | fork 有已完成 turn 才传入；省略 ≡ 未播种的新 session。[E: packages/subagent/subagent-in-process-driver/src/index.ts:70] |
| `ContinuableCreateSpec.seed` | 同一份 prefix（或省略）。continuable 路径里这是 provider **唯一**贡献。[E: packages/subagent/subagent/src/types.ts:191] |
| `CreateAgentOptions.seed` | 工厂把 seed 交给 session 创建边界；`seq` 必须等于数组下标，否则当场抛错。[E: packages/core/agent/src/index.ts:109] [E: packages/core/session/src/index.ts:526] |
| `header.seedLength` | `lineageSeedLength > 0` 才写入，等于种进去的父前缀长度。[E: packages/subagent/subagent/src/child-agent.ts:118] |
| host `tool-subagent-fork` | `provider: fork`、`toolName: subagent_fork`、**`backgroundMode: one-shot`**。[E: packages/bundle/base/cordis.patch.yml:329] |
| preset `tool-subagent-fork` | 同一 `id` / 同一包，**`backgroundMode: continuable`**（`standard` / `code` / `cordis`）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198] |

## 控制流

本插件**不是** waterfall 监听器：`apply` 只 `registerProvider`。Waterfall 出现在共享 driver 的 `agent/pre-step`，以及父工具管线（本页不展开字段）。isolate：backend **留在 host**，本包无 `isolate` 行。

1. **host 装 backend。** `dsh-base` insert `id: subagent-fork-in-process`，`config.providerName: fork`。[E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:303] `apply@packages/subagent/subagent-fork-in-process/src/index.ts` 执行 `ctx.subagents.registerProvider(new ForkInProcessProvider(config.providerName))`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:93] `registerProvider@packages/subagent/subagent/src/index.ts` 是 Cordis `ctx.effect()`：重名 `DUPLICATE_PROVIDER`；fiber dispose 只挡住新 `start`，已返回的 run 不撤回。[E: packages/subagent/subagent/src/index.ts:369] [E: packages/subagent/subagent/src/index.ts:374]

2. **host 工具行 vs preset 工具行（必须两边都写）。** 同一份 `dsh-base` 再插 `id: tool-subagent-fork`：`provider: fork`、`toolName: subagent_fork`、`backgroundMode: one-shot`。[E: packages/bundle/base/cordis.patch.yml:324] [E: packages/bundle/base/cordis.patch.yml:327] [E: packages/bundle/base/cordis.patch.yml:329] `dsh-web-app` 把 **这一行** `disabled: true`，registry 与 fork backend **不** disable。[E: packages/bundle/web-app/cordis.patch.yml:383] [E: packages/bundle/web-app/cordis.patch.yml:384] `standard` / `code` / `cordis` 在 `delegation` 组里用同一 `id` remount，把 `backgroundMode` 改成 `continuable`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:193] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:199] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:186] 该组 `isolate` 只有 `workflowEngine: true`，**没有** `subagents`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:177] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] 默认安装路径 `dsh web` 因此吃 preset 的 `continuable`。`dsh --profile headless` 不叠 web overlay，host 那行 `one-shot` 仍启用。[I]

3. **Consumer 跟 provider 生命周期。** `apply@packages/subagent/tool-subagent/src/index.ts` 听 `subagent/provider-added`，`provider.name === config.provider` 才 `ctx.tools.register`。[E: packages/subagent/tool-subagent/src/index.ts:440] `backgroundMode` 缺省按 `'one-shot'` 解析；写成 `continuable` 时若 provider 没有 `prepareContinuable`，**mount 失败**。[E: packages/subagent/tool-subagent/src/index.ts:276] [E: packages/subagent/tool-subagent/src/index.ts:292] fork 实现了该方法。[E: packages/subagent/subagent-fork-in-process/src/index.ts:83] 文案走 `providerWording(true)`：孩子种了已完成 turn，**看不见当前 in-flight turn**。本页不展开 schema。

4. **one-shot `start`。** 父工具前台或 `backgroundMode: one-shot` 的 Job 调 `SubagentRuntime.start('fork', request)`。[E: packages/subagent/subagent/src/index.ts:414] 服务校验 capability、拍 `mode: 'one-shot'` descriptor，再 `provider.start`。`ForkInProcessProvider.start@packages/subagent/subagent-fork-in-process/src/index.ts` 先 `completedTurnPrefix(request.parent)`：有事件才把 `{ seed }` 交给 `startInProcessRun`，否则传 `{}`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:69] [E: packages/subagent/subagent-fork-in-process/src/index.ts:73]

5. **切点：最后一个已完成 turn，不含 in-flight tool-call turn。** `completedTurnPrefix` 在父 `session.events` 上 `findLast(type === 'turn/end')`，然后 `slice(0, lastEnd.seq + 1)`（append 合同下 `seq ===` 数组下标）。[E: packages/subagent/subagent-fork-in-process/src/index.ts:50] [E: packages/subagent/subagent-fork-in-process/src/index.ts:53] 当前未闭合的 tool-call turn 还没有 `turn/end`，不会被切进 seed。测试：父完成一轮后再挂起第二轮，fork 仍能通过 invariant replay，孩子 seed 里只有那一个已完成父 turn。[E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:134] [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:155] 无任何 `turn/end` 时返回 `[]`，`seed.length > 0` 为假，省略 `seed`；孩子 `header.seedLength` 为 `undefined`，行为与 spawn 的空 options 相同。[E: packages/subagent/subagent-fork-in-process/src/index.ts:51] [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:87] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:52]

6. **共享驱动（只服务 one-shot）。** `startInProcessRun@packages/subagent/subagent-in-process-driver/src/index.ts`：`resolveChildDepth`、同步 `captureDelegatedPolicyOverrides`（有 `approval` 则孩子 `approvalPolicy: 'never'`）、`parent.ctx.agents.create`（新 `SessionId`、`childSessionMeta`、有 seed 才传入）。[E: packages/subagent/subagent-in-process-driver/src/index.ts:102] [E: packages/subagent/subagent-in-process-driver/src/index.ts:117] [E: packages/subagent/subagent-in-process-driver/src/index.ts:132] [E: packages/subagent/subagent/src/child-agent.ts:202] `activationBoundary = seed?.length ?? 0`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:113] setup 里 `appendDelegatedPolicyOverrides`（写在 fork seed **之后**，委派策略覆盖父 log 里旧的 sandbox/approval）+ `applyChildComposition`（`composeFrom` 父 preset、登记 `subagent:delegation`、可选 persona / `tools.restrict`）。[E: packages/subagent/subagent-in-process-driver/src/index.ts:121] [E: packages/subagent/subagent/src/child-agent.ts:168] 有 `outputSchema` 再挂 structured runtime。continuable 走 `prepareContinuable` + manager，**不**调用 `startInProcessRun`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:87] [E: packages/subagent/subagent/src/continuation.ts:428]

7. **waterfall：`agent/pre-step` 必须 `next()`。** `attachDescriptorAppend` 挂在孩子 `agent/pre-step`：先 `const decision = await next()`，仅当 `decision.kind === 'enter'` 才 `append('subagent/descriptor', …)`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:81] [E: packages/subagent/subagent-in-process-driver/src/index.ts:82] Cordis `waterfall` 用 `cbs.shift() ?? inner` 推进下一层；监听器不调用 `next()`，后续 listener 与内置 enter 都不会跑。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239] 本 fork 插件自己不挂 waterfall，不存在「故意不 next 的 reject」。

8. **跑完与读结果。** `drivePublishedRun`：`child.followup(createUserMessage({ content: prompt, source: { kind: 'user' } }))`，`await child.whenIdle()`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:177] `readResult` 只扫 `events.slice(boundary)`：子自己没产出 assistant 消息时返回空 `output`，不会把父 prefix 里的旧回答当成子结果。[E: packages/subagent/subagent-in-process-driver/src/index.ts:214] [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:193] holder 必须 `dispose`。

9. **continuable：provider 只贡献 seed。** shipped `standard` / `code` / `cordis` 下，省略 `run_in_background` 会走 `ctx.subagents.startContinuable`（Consumer 把缺省后台等同于 `continuable` 标志）。manager 在创建窗口调 `host.prepareContinuable('fork', { sessionId, parent, signal })`。[E: packages/subagent/subagent/src/continuation.ts:428] `ForkInProcessProvider.prepareContinuable` 再切一次 `completedTurnPrefix`：有则 `{ seed }`，否则 `{}`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:87] [E: packages/subagent/subagent-fork-in-process/src/index.ts:88] 前缀在这一刻拍进子自己的 durable transcript；冷恢复重放这份前缀，不会按父后来的新历史再 fork。`seedDescriptorTurn` 在 prefix 后追加一条 model-hidden `subagent/descriptor`，与 one-shot「先 seed、进 turn 再 append descriptor」不同。[E: packages/subagent/subagent/src/descriptor-seed.ts:28] [E: packages/subagent/subagent/src/descriptor-seed.ts:29] 之后的 create / inbox / 驻留 / 结算由 continuation manager 拥有，**不是** `ForkInProcessProvider.start`。没有 `prepareContinuable` 的 provider 在服务层直接 `UNSUPPORTED_CAPABILITY`。[E: packages/subagent/subagent/src/index.ts:438] [E: packages/subagent/subagent/src/index.ts:442]

10. **与 spawn 共存。** 同一 `ctx.subagents` 可同时挂 `spawn` 与 `fork`。同一父可以先 spawn 一个无前缀孩子、再 fork 一个带前缀孩子；两个 `session.header.id` 不同，都 stamp `parentSession`。[E: packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts:55] [E: packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts:87]

## 设计动机

fork 要解决的是「子代理已经看见本对话，但仍是另一个 session / 另一套 context 窗口」。把整段父 log（含正在飞的 tool-call turn）复制过去会得到不平衡 seed：session 创建要求 seed `seq` 从 0 连续，中途 fork 的测试靠「只切到最后一个 `turn/end`」才过 invariant replay。[E: packages/core/session/src/index.ts:526] [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:155] 切到最后一条 `turn/end` 是为了让 seed 从 seq 0 连续、可重放。

与 spawn 共用 `startInProcessRun`，只在「传不传 `seed`」分叉：深度、preset `composeFrom`、审批钉死 `'never'`、structured runtime 不必写两份。`inheritsParentContext` 是描述字段，给 Consumer 选对文案（`providerWording`），服务按 `capabilities` 校验请求字段，不把这个布尔当 start capability。[E: packages/subagent/subagent/src/types.ts:295] [E: packages/subagent/tool-subagent/src/index.ts:291]

continuable 把 prefix 在创建时拍死，是为了让孩子的 durable log 自包含：resume 重放的是当时那份前缀，而不是父会话「现在」的历史。

host 工具行写成 `one-shot`，与 shipped preset 的 `continuable` 并存——组合层两套值都是真的，产品意图见 Gotcha 的 [U]。

## Gotcha

- **空 prefix ≡ spawn 形 session，不是改名。** 父还没有 `turn/end` 时 fork 省略 `seed`，孩子 `seedLength` 不出现。provider 仍叫 `fork`，`inheritsParentContext` 仍是 `true`，工具描述仍说「已继承已完成 turn」。[E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:87] [E: packages/subagent/subagent-fork-in-process/src/index.ts:64]
- **in-flight tool-call turn 不进 seed。** 模型正在调 `subagent_fork` 的那一轮本身没有 `turn/end`。把这一轮切进去会破坏 seed 合同。
- **`readResult` 从 `seedLength` 之后读。** 子代理若只 `stop`、不发 assistant 消息，结果是空 `output`，不是父 prefix 里的旧文本。[E: packages/subagent/subagent-in-process-driver/src/index.ts:214]
- **host `one-shot` 与 preset `continuable` 同时存在。** `dsh-base` 工具行是 `one-shot`；三个 shipped preset 覆盖成 `continuable`；web overlay disable host 行。headless 没有这层 disable，吃 host 的 `one-shot`。不要只抄一边。[E: packages/bundle/base/cordis.patch.yml:329] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198]
- **源码 TODO 与 shipped preset 打架。** `prepareContinuable` 上方注释仍写「没有 shipped composition 会调用它，因为他们把 fork 绑成 `one-shot`」。`standard` / `code` / `cordis` 的 `agent.cordis.yml` 已经是 `continuable`。哪一份是当前产品意图未核，标 [U]。
- **`inheritsParentContext` 不是权限继承。** 孩子仍 `composeFrom` 父 preset、仍钉 `approvalPolicy: 'never'`、仍可以 `toolFilter` / persona shadow。对话 seed 与权威范围是两件事。[E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/subagent/subagent/src/child-agent.ts:202]
- **named export only。** 测试钉死没有 `default`；loader `unwrapExports` 必须保住 `inject`。[E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:242]
- **backend 不能按会话复制。** `ctx.subagents` 是 host 单例。preset `delegation` 组 isolate 的是 `workflowEngine`，不是 `subagents`。把本包插进 preset 且不 isolate，第二个 session 会在 `leakedServices` 被拒。[I]
- **HMR：卸 fiber 摘掉 provider。** `list()` 从 `['fork']` 变 `[]`；已返回的 run 不撤回。[E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:209]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subagent` 的 `SubagentProvider` / `ctx.subagents`。本包**不** provide 这个键 | host `id: subagent`。`inheritsParentContext`、`start`、可选 `prepareContinuable` 是合同字段，不是 fork 私有 API。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/subagent/subagent/src/types.ts:295] |
| **Provider** | `@deepseek-ai/dsh-subagent-fork-in-process`（插件名 `subagent-fork-in-process`） | **host 面** `id: subagent-fork-in-process`，`providerName: fork`，无 `isolate`。preset 不装 backend。换名 = 改 `Config.providerName` 并同步 Consumer 的 `provider:`。[E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:303] [E: packages/subagent/subagent-fork-in-process/src/index.ts:23] |
| **Consumer** | `@deepseek-ai/dsh-tool-subagent` 的第二实例（`id: tool-subagent-fork`） | host 行：`provider: fork` / `toolName: subagent_fork` / `backgroundMode: one-shot`。web：同一 `id` `disabled: true`。`standard` / `code` / `cordis`：同一 `id` remount 为 `continuable`。`minimal` 无此行。schema 归 T1，本页不写。[E: packages/bundle/base/cordis.patch.yml:329] [E: packages/bundle/web-app/cordis.patch.yml:384] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198] |

换 Provider（改 `providerName` 或卸掉本包）会让 `provider: fork` 的工具在 `provider-added` 对不上而挂不上。Definition（`ctx.subagents`）仍在。把 Provider 从 host 挪到 preset 而不 `isolate`，失败点是 `mountPreset`，不是静默共用。

## Sources

- packages/subagent/subagent-fork-in-process/src/index.ts
- packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts
- packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/descriptor-seed.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/core/agent/src/index.ts
- packages/core/session/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：默认路径走 spawn 前台；`subagent_fork` 在 `completedTurnPrefix` 处分叉。
- [DSH 源码总览](../../spine/overview.md)（`spine.overview`）：host 面 vs agent-preset 面；fork backend 属 host。
- [subagent 缝](subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents`、`registerProvider`、`start` / `startContinuable`。
- [in-process spawn](subagent-in-process.md)（`subsys.orchestration.subagent-in-process`）：同进程无 seed 的 `spawn`，以及共享 `startInProcessRun`。
- [subagent_fork](../../surface/tools/subagent-fork.md)（`surface.tools.subagent-fork`）：模型可见工具实例、schema、三种返回 `kind`。
- [dsh-base bundle](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host 插入 `subagent-fork-in-process` 与 host `tool-subagent-fork` 行。
