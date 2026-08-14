---
id: subsys.orchestration.subagent
title: subagent 缝
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/lifecycle.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/descriptor.ts
  - packages/subagent/subagent/src/out-of-process.ts
  - packages/subagent/subagent/src/list-children.ts
  - packages/subagent/subagent/src/error.ts
  - packages/subagent/subagent/src/depth.ts
  - packages/subagent/subagent/src/run-settlement.ts
  - packages/subagent/subagent/package.json
  - packages/subagent/subagent/tests/service.spec.ts
  - packages/subagent/subagent/tests/continuation.spec.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/tool-subagent-control/src/index.ts
  - packages/subagent/tool-subagent-report/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - packages/core/tools/src/index.ts
  - packages/terminal/terminal/src/index.ts
  - packages/workflow/workflow-worker-thread/src/host.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.subagents
  - SubagentRuntime
  - registerProvider
  - start
  - startContinuable
related:
  - spine.overview
  - spine.trace-subagent
  - spine.capability-seams
  - spine.turn-and-step
  - surface.tools.subagent
  - surface.tools.subagent-control
  - surface.tools.subagent-fork
  - subsys.orchestration.subagent-in-process
  - subsys.orchestration.subagent-fork
  - subsys.orchestration.jobs
  - subsys.orchestration.workflow
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.subagents`（`SubagentRuntime`）是 **host 面**委托缝的 Definition：`super(ctx, 'subagents')` 占进程单例服务键，原语是 **按名**登记多家 `SubagentProvider`（`registerProvider`，不是 terminals 的 `registerBackend`），再按名 `start`（one-shot `SubagentRun`）或 `startContinuable`（durable 孩子，要求 provider 有 `prepareContinuable`）。多家 provider 共存；模型可见 `subagent*` 工具、Codex/Claude 包、`ctx.jobs` 都不在本包。

## 能回答的问题

- `ctx.subagents` 由哪个包 `provide`？登记 API 叫 `registerProvider` 还是 `registerBackend`？
- `dsh-base` 实际装了哪些 subagent 行？有没有 `subagent-codex` / `subagent-claude-code`？旧 Note 写「dormant 加载」还成立吗？
- `start` 与 `startContinuable` 各自走哪条 backend 路径？缺 `prepareContinuable` / `ctx.agents` / persistence 会抛什么码？
- 本缝有没有 `subagent/*` waterfall？模型 `subagent` 调用经过哪条必须 `next()` 的链？
- preset 的 `delegation` isolate 会不会复制 `ctx.subagents`？`listChildren` 要不要 live Activation？
- 谁拥有 in-process 孩子的 composition / depth / descriptor？进程外 backend 用本包哪些 helper？

## 职责边界

`@deepseek-ai/dsh-subagent` 拥有：**host 面**服务 `ctx.subagents`（`SubagentRuntime`）、按名 `Map<string, SubagentProvider>`、one-shot `start` 的 capability / descriptor 校验、continuable 的 `SubagentContinuationManager`（身份预留、materialize、inbox 投递、cold resume、settlement notice、child-first drain）、只读 `listChildren` / `listDescendants`、in-process 共用的 `applyChildComposition` / `resolveChildDepth` / `snapshotSubagentDescriptor`、以及进程外 backend 的词汇（`NO_START_CAPABILITIES` / `settleRunResult` / `subprocessRunHandle`）。包名写在 manifest。[E: packages/subagent/subagent/package.json:2] 构造占键 `subagents`。[E: packages/subagent/subagent/src/index.ts:184]

本包**不**拥有：

- 默认 in-process spawn 实现与 `startInProcessRun` 驱动 — [subsys.orchestration.subagent-in-process](subagent-in-process.md)（`subsys.orchestration.subagent-in-process`）。
- fork 的 `completedTurnPrefix` seed — [subsys.orchestration.subagent-fork](subagent-fork.md)（`subsys.orchestration.subagent-fork`）。
- 模型可见 `subagent` / `subagent_fork` 字段表与 `backgroundMode` 广告 — [surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）/ [surface.tools.subagent-fork](../../surface/tools/subagent-fork.md)（`surface.tools.subagent-fork`）。Consumer 包是 `@deepseek-ai/dsh-tool-subagent`。[E: packages/subagent/tool-subagent/src/index.ts:22]
- `send_message` / `interrupt_agent` / `list_agents` — [surface.tools.subagent-control](../../surface/tools/subagent-control.md)（`surface.tools.subagent-control`）。
- `ctx.jobs`、Job id、`job_output` — [subsys.orchestration.jobs](jobs.md)（`subsys.orchestration.jobs`）。本包只导出 one-shot 后台用的 `settleRun`。[E: packages/subagent/subagent/src/run-settlement.ts:49]
- Codex / Claude / ACP / DSH-SDK 后端包。`dsh-base` **没有** `id: subagent-codex` / `id: subagent-claude-code`，也不是「装了但 dormant」：`base.spec.ts` 要求这两行长度为 0，且 `dependencies` 不含对应包。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]
- `Agent` 合同、inbox、turn/step — [spine.turn-and-step](../../spine/turn-and-step.md)（`spine.turn-and-step`）。孩子跑起来之后用同一套 factory。
- `tools/pre-execute` 管线本身。模型路径上的 waterfall 在 `ctx.tools`。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是把子代理焊进某一个 coding agent。默认安装路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。`ctx.subagents` 是进程级 host 单例：provider 名全局唯一，跨会话 `listChildren` / `followup` 也挂在这里，不能按会话复制。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent/src/index.ts` | Definition：`SubagentRuntime`、`Context.subagents`、`registerProvider` / `start` / `startContinuable` |
| `packages/subagent/subagent/src/types.ts` | `SubagentProvider` / `SubagentStartRequest` / `SubagentRun` / `ContinuableCreateSpec` |
| `packages/subagent/subagent/src/continuation.ts` | continuable manager：Activation、cold resume、settlement notice |
| `packages/subagent/subagent/src/lifecycle.ts` | `observeRun` / `createActivationObserver`；`subagent/start`+`end` |
| `packages/subagent/subagent/src/child-agent.ts` | in-process 共用：depth、meta、`applyChildComposition`、delegation policy |
| `packages/subagent/subagent/src/descriptor.ts` | `subagent/descriptor` 快照与 fold；`SUBAGENT_DESCRIPTOR_VERSION` |
| `packages/subagent/subagent/src/out-of-process.ts` | 进程外词汇：`NO_START_CAPABILITIES`、cwd、永不 reject 的 `result` |
| `packages/subagent/subagent/src/list-children.ts` | 只读枚举；不读 Activation / provider |
| `packages/subagent/subagent/src/depth.ts` | `delegationDepthOf` / `assertSubagentMaxDepth` |
| `packages/subagent/subagent/src/run-settlement.ts` | one-shot Job 结算映射（本缝不拥有 `ctx.jobs`） |
| `packages/subagent/subagent/tests/service.spec.ts` | 登记、重名、缺 provider、capability、lifecycle |
| `packages/subagent/subagent/tests/continuation.spec.ts` | 缺 `prepareContinuable`、缺 persistence |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`subagent` + spawn + fork |
| `packages/bundle/base/tests/base.spec.ts` | 钉死 **不**装 Codex/Claude |
| `packages/bundle/web-app/cordis.patch.yml` | 关掉 host 模型 tool 行；registry 留下 |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | preset remount；`isolate` 只有 `workflowEngine` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SubagentRuntime` | `extends Service`；构造 `super(ctx, 'subagents')`。无 plugin `Config`。[E: packages/subagent/subagent/src/index.ts:184] |
| `SubagentProvider` | `name` + `capabilities` + `inheritsParentContext` + `start`；可选 `prepareContinuable?`（方法存在即 continuable 能力）。[E: packages/subagent/subagent/src/types.ts:285] [E: packages/subagent/subagent/src/types.ts:323] |
| `SubagentCapabilities` | one-shot 开工前校验：`outputSchema` / `depthLimit` / `toolFilter` / `persona`。缺能力 → `UNSUPPORTED_CAPABILITY`，不静默忽略。[E: packages/subagent/subagent/src/index.ts:489] |
| `SubagentStartRequest` | 调用方意图：`prompt` + `parent` + `signal`，可选 `label` / `agentOptions` / `outputSchema` / `maxDepth` / `toolFilter` / `persona`。 |
| `ResolvedSubagentStartRequest` | `start` 补上 detached `descriptor` 后再交给 `provider.start`。[E: packages/subagent/subagent/src/index.ts:424] |
| `SubagentRun` | one-shot 句柄：`id` / `localAgent?` / 永不因孩子失败而 reject 的 `result` / `dispose()`。continuable **没有** Run。 |
| `ContinuableCreateSpec` | provider 对 continuable 的**数据**贡献：只有可选 `seed`。没有 handle、没有投递、没有 teardown。 |
| `ContinuableStart` | `{ childId, messageId }`：inbox **接受**初始 prompt 即返回，不等 turn、不等消息落盘。[E: packages/subagent/subagent/src/index.ts:212] |
| `subagent/descriptor` | 写入 `SessionEventMap` 的孩子身份事件。当前 `version: 2`。one-shot 记 `mode`/`provider`/`label?`；continuable 另记 route / persona / toolFilter。[E: packages/subagent/subagent/src/descriptor.ts:37] [E: packages/subagent/subagent/src/descriptor.ts:47] |
| `Activation` | 进程本地驻留：一个 durable Session 最多一份。`running` / `waiting` / `settled` 由 Agent 忙碌度 + `ownedChildren` 推出，不是第二套状态机。 |
| `SubagentListEntry` | `listChildren` 行：`child`（`mode`+`label`+`activity`）或 `diagnostic`。分类权威是 projection fold，不是现场 parse descriptor。 |
| `NO_START_CAPABILITIES` | 进程外广告：四个 start 能力全 `false`。[E: packages/subagent/subagent/src/out-of-process.ts:25] |
| `SubagentError` | `HarnessError` 子类。常见码：`DUPLICATE_PROVIDER` / `NO_PROVIDER` / `UNSUPPORTED_CAPABILITY` / `CONTINUATION_UNAVAILABLE` / `PERSISTENCE_UNAVAILABLE` / `NOT_RESUMABLE` / `UNAUTHORIZED` / `DRAINING`。 |

`inheritsParentContext` **不是** service 校验的 start 能力：它只给模型工具写诚实文案（孩子看不看父对话）。它不描述工具表、sandbox、审批继承。

## 控制流

1. **`dsh-base` 在 host 根插入 Definition + 两家 in-process Provider。** `id: subagent` / `name: '@deepseek-ai/dsh-subagent'`。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:293] 紧接着 `id: subagent-spawn-in-process`，`providerName: spawn`；`id: subagent-fork-in-process`，`providerName: fork`。[E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:298] [E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:303] **没有** `subagent-codex` / `subagent-claude-code` 行；测试把这两行长度钉成 0，并把对应依赖钉成不存在。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:41] 旧 Agent Note / README 写「base dormant 加载 Codex/Claude」**作废**。

2. **`SubagentRuntime`@packages/subagent/subagent/src/index.ts 占 host 键。** 构造 `super(ctx, 'subagents')`，把 `Context.subagents` 指到自己。[E: packages/subagent/subagent/src/index.ts:131] [E: packages/subagent/subagent/src/index.ts:184] `ctx.inject(['agents'], …)` 才 `new SubagentContinuationManager`；卸掉 `agents` 就把 manager 槽清掉。[E: packages/subagent/subagent/src/index.ts:186] [E: packages/subagent/subagent/src/index.ts:194] 另 `inject(['sessionProjections'], …)` 登记 identity / timing projection。没有 `agents` 时 `start()` 仍可走 provider，但 `startContinuable` / `followup` 抛 `CONTINUATION_UNAVAILABLE`。[E: packages/subagent/subagent/src/index.ts:462] 测试直接打这条。[E: packages/subagent/subagent/tests/service.spec.ts:154]

3. **登记 API 是 `registerProvider`，不是 `registerBackend`。** `registerProvider@packages/subagent/subagent/src/index.ts` 用 `ctx.effect` 写入 `providers` Map；重名抛 `DUPLICATE_PROVIDER`。[E: packages/subagent/subagent/src/index.ts:369] [E: packages/subagent/subagent/src/index.ts:374] 卸掉只挡住新 `start`，已返回给 holder 的 run 不撤回。`subagent/provider-added` 监听抛错会 unwind 这次登记，表里不留半成品。[E: packages/subagent/subagent/tests/service.spec.ts:96] [E: packages/subagent/subagent/tests/service.spec.ts:97] terminals 缝的对称 API 叫 `registerBackend`，不要串名。[E: packages/terminal/terminal/src/index.ts:125]

4. **多家 provider 共存，调用方按名挑选。** 这与 bash 缝「同一 realm 只能一份 `ctx.shell`」相反，形状更接近 `LlmRuntime.registerAdapter`。`list()` 按插入顺序回名字。[E: packages/subagent/subagent/src/index.ts:400] spawn 的 `apply` 调 `ctx.subagents.registerProvider(new SpawnInProcessProvider(config.providerName))`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:63] fork 对称登记 `ForkInProcessProvider`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:93]

5. **`start(name, request)` = one-shot。** `expectProvider` 查表，没有就 `NO_PROVIDER`。[E: packages/subagent/subagent/src/index.ts:450] [E: packages/subagent/subagent/src/index.ts:452] 再 `assertCapabilities`、`assertSubagentMaxDepth`、可选 `assertObjectJsonSchema`，然后 `snapshotSubagentDescriptor({ mode: 'one-shot', provider, label? })`。[E: packages/subagent/subagent/src/index.ts:416] [E: packages/subagent/subagent/src/index.ts:419] `await provider.start(resolved)` 兑现后才 `observeRun`：先挂 `result` 的 `subagent/end`，再同步发 `subagent/start`。[E: packages/subagent/subagent/src/index.ts:425] [E: packages/subagent/subagent/src/lifecycle.ts:147] [E: packages/subagent/subagent/src/lifecycle.ts:160] provider `start` 在兑现前 reject：没有 run 可 dispose，也**不**发 lifecycle。测试：`starts === 0` 当 capability 不够。[E: packages/subagent/subagent/tests/service.spec.ts:174]

6. **`startContinuable` 要求三件套：manager + persistence + `prepareContinuable`。** 公开方法把工作交给 `requireContinuations().startContinuable`。[E: packages/subagent/subagent/src/index.ts:212] manager 先 `requirePersistence()`，缺 backend 抛 `PERSISTENCE_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:407] [E: packages/subagent/subagent/src/continuation.ts:1475] 再 `snapshot` continuable descriptor，**第一个 await 之前** `captureDelegatedPolicyOverrides`。[E: packages/subagent/subagent/src/continuation.ts:426] `host.prepareContinuable`：provider 没有该方法就 `UNSUPPORTED_CAPABILITY`，**不**调 `provider.start`、不建孩子。[E: packages/subagent/subagent/src/index.ts:438] [E: packages/subagent/subagent/src/index.ts:442] 测试：`start` spy 0 次，agent 列表仍只有 parent。[E: packages/subagent/subagent/tests/continuation.spec.ts:204] [E: packages/subagent/subagent/tests/continuation.spec.ts:205] inbox 接受初始 prompt 后返回 `{ childId, messageId }`；caller `signal` 只管到这一刻。

7. **continuable 的孩子由 manager 自己 `agents.create` / `resume`，provider 只交 `seed?`。** `materializeTracked@packages/subagent/subagent/src/continuation.ts` 在 unpublished setup 里 `appendDelegatedPolicyOverrides` + `applyChildComposition`，再 `setupRegistry.apply`。[E: packages/subagent/subagent/src/continuation.ts:1001] [E: packages/subagent/subagent/src/continuation.ts:1003] spawn 的 `prepareContinuable` 是 `Promise.resolve({})`（无 seed）。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:58] in-process composition：`composeFrom` 父 preset、挂 `subagent:delegation` context、可选 shadow `deployment:persona`、可选 `tools.restrict`。[E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/subagent/subagent/src/child-agent.ts:170] 审批只要组合了 `approval`，孩子一律钉 `approvalPolicy: 'never'`。[E: packages/subagent/subagent/src/child-agent.ts:202] `resolveChildDepth` = `delegationDepthOf(parent) + 1`，超 cap 抛 `SubagentDepthError`。[E: packages/subagent/subagent/src/child-agent.ts:49] header `delegationDepth` 是单调下限，resume 后的父不能装成 depth 0。[E: packages/subagent/subagent/src/depth.ts:35]

8. **本缝事件是 `emit`，没有 `subagent/*` waterfall。** `Events` 声明 `subagent/provider-added` / `provider-removed` / `start` / `end`。[E: packages/subagent/subagent/src/index.ts:140] lifecycle 走 `ctx.events.dispatch('emit', …)`，逐个 contain 监听：同步 throw 或返回的 rejected promise 只 `logger.warn`，不饿死同伴、不改 run。[E: packages/subagent/subagent/src/lifecycle.ts:112] [E: packages/subagent/subagent/src/lifecycle.ts:115] 模型走到本缝之前仍经过 **`ctx.tools` 的 waterfall**：`ToolRuntime` 调 `this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。[E: packages/core/tools/src/index.ts:1475] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；监听者不调用传入的 `next()` 就不会 `cbs.shift()`，默认 `allow` 到不了，tool body（从而 `ctx.subagents.start*`）不跑。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238]

9. **isolate：registry 留在 host，preset 不复制 `subagents`。** `dsh-web-app` 把 host 面上的 `tool-subagent` / `tool-subagent-fork` / control 行 `disabled: true`，registry 与 spawn/fork backend **留下**。[E: packages/bundle/web-app/cordis.patch.yml:380] [E: packages/bundle/web-app/cordis.patch.yml:381] `standard` 的 `delegation` 组 `isolate` **只有** `workflowEngine: true`，没有 `subagents`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:177] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] 工具用 `inject = ['tools', 'subagents', 'systemPrompt']` 解析 host 单例。[E: packages/subagent/tool-subagent/src/index.ts:23] 把 `subagents` 放进 isolate realm 会让每会话复制一份空 registry，host 已登记的 `spawn`/`fork` 对 preset 工具不可见。

10. **后续控制面走 manager，不走 `provider.start`。** `followup` 按 Activation 驻留投递；缺席则 `coldResume`（`persistence.inspect` + `foldSubagentDescriptor` 自己的 suffix，**不再**调 provider）。[E: packages/subagent/subagent/src/continuation.ts:477] [E: packages/subagent/subagent/src/continuation.ts:905] `interrupt` 在 live Activation 上 `cancel(..., { keepInbox: true })`；缺席（含 one-shot id）是接受的 no-op。[E: packages/subagent/subagent/src/index.ts:255] [E: packages/subagent/subagent/src/continuation.ts:564] `reportFrom` 只认「这个 live continuable 孩子」为本权威，投到 durable 直系父。[E: packages/subagent/subagent/src/index.ts:270] Consumer：`tool-subagent-control` 薄封装 `followup` / `interrupt`；`tool-subagent-report` 用 `registerContinuableSetup` 把 `report` 装进每个 continuable 孩子的 unpublished 窗。[E: packages/subagent/tool-subagent-control/src/index.ts:19] [E: packages/subagent/tool-subagent-report/src/index.ts:140]

11. **发现不依赖 Activation。** `listChildren@packages/subagent/subagent/src/list-children.ts` 合并 live `sessions` 与可选 persistence，用 `subagent` projection 三档梯子取 mode/label。[E: packages/subagent/subagent/src/list-children.ts:134] 缺 `sessionProjections` 或 `sessions` 是配置错误，不是空列表成功。[E: packages/subagent/subagent/src/list-children.ts:193] [E: packages/subagent/subagent/src/list-children.ts:203] 没有 persistence 时只枚举 live（冷孩子本来也不能 resume）。

12. **进程外 backend 复用本包 helper，不改登记表语义。** `NO_START_CAPABILITIES` 让 service 在 `start` 前拒掉 depth/persona/toolFilter/outputSchema。[E: packages/subagent/subagent/src/out-of-process.ts:25] `settleRunResult` 保证发表后的 `result` 不 reject；`subprocessRunHandle` 的 `localAgent` 恒 `undefined`。[E: packages/subagent/subagent/src/out-of-process.ts:201] [E: packages/subagent/subagent/src/out-of-process.ts:205] ACP / SDK / Codex / Claude 各自是独立 Provider 页。workflow worker 的 `agent()` 也是本缝 Consumer：`this.subagents.start(this.provider, …)`。[E: packages/workflow/workflow-worker-thread/src/host.ts:352]

## 设计动机

- **按名多家，而不是独占 executor。** 同一进程要同时挂 `spawn` 与 `fork`（产品上还可能再加 ACP / 外部 CLI）。bash 那种「第二份 `provide('shell')` 直接炸」在这里会逼组合互斥；LLM adapter 那种 `registerAdapter(providers, …)` 才对得上「调用方点名」。
- **`start` 与 `startContinuable` 拆开。** one-shot 把发表后的孩子所有权交给 `SubagentRun`（调用方必须 `dispose`）。continuable 把 residency 收进 manager：provider 只回答「要不要 seed」，看不到 handle / turn / teardown。否则每个 backend 都得重做 inbox、cold resume、父通知。
- **能力不够就拒，不降级。** 进程外孩子执行不了父侧 `maxDepth` / `persona` / `toolFilter` / `outputSchema`。接受后再假装执行会让模型以为限制生效。
- **descriptor 是分类权威。** 枚举与 resume 读 `subagent/descriptor`，不扫父 tool result、不把孩子 prompt 暴露给列表。版本号刻意挡「随手加字段」。
- **组合真树认 base patch + spec，不认仓库里有包。** Codex / Claude 包存在 ≠ 装进 `dsh-base`。preset 里 `disabled: true` 的 tool 行只挡模型目录，**不会**把没 insert 的 backend 变成 dormant 加载。

## Gotcha

- API 名是 `ctx.subagents.registerProvider`。`registerBackend` 属于 `ctx.terminals`。[E: packages/subagent/subagent/src/index.ts:369] [E: packages/terminal/terminal/src/index.ts:125]
- `dsh-base` **不装** `subagent-codex` / `subagent-claude-code`。`base.spec.ts:38-41` 同时钉 patch 行与 manifest 依赖。把 shipped 组合写成「dormant 加载产品后端」是过期叙事。
- preset 打开 `tool-subagent-codex` 但没 mount `@deepseek-ai/dsh-subagent-codex`：工具会等 `subagent/provider-added`，catalog 里仍没有可用 backend。`disabled: true` ≠ 后端已登记。
- `startContinuable` 缺 `ctx.agents` → `CONTINUATION_UNAVAILABLE`；缺 persistence → `PERSISTENCE_UNAVAILABLE`；provider 无 `prepareContinuable` → `UNSUPPORTED_CAPABILITY` 且 `provider.start` 不被调用。[E: packages/subagent/subagent/tests/service.spec.ts:154] [E: packages/subagent/subagent/tests/continuation.spec.ts:204]
- 卸掉 provider 不回收已发表的 one-shot run，也不使已落盘的 continuable Session 消失。cold resume **不**再经过那个 provider。
- `listChildren` 不看 `ctx.agents` / Activation。创建窗口里 descriptor 尚未 append 的 live 孩子会被省略，不是 `diagnostic`。
- continuable **不是** Job。`settleRun` 只给 one-shot 后台的 `jobs.start({ kind: 'subagent' })`。默认 shipped `backgroundMode: continuable` 走 durable `childId` + `send_message`。
- `tool-subagent-report` 必须停在 host：`registerContinuableSetup` 的贡献表不是 scope-aware，每会话再挂一份会让每个孩子重复登记 `report`。
- host-base 的 `tool-subagent-fork` 写 `backgroundMode: one-shot`，`standard`/`code`/`cordis` remount 成 `continuable`。那是 fork 工具行的不一致，不是本缝换了 `fork` provider。细节在 [subsys.orchestration.subagent-fork](subagent-fork.md)。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | 包 `@deepseek-ai/dsh-subagent`。`SubagentRuntime` `super(ctx, 'subagents')` → `ctx.subagents`。base 行 `id: subagent`。登记 API `registerProvider`。无 plugin Config。无 `subagent/*` waterfall（`emit` only）。 |
| **Provider（shipped host）** | `@deepseek-ai/dsh-subagent-spawn-in-process`：base `id: subagent-spawn-in-process`，默认名 `spawn`，`inheritsParentContext = false`，`prepareContinuable() → {}`。`@deepseek-ai/dsh-subagent-fork-in-process`：base `id: subagent-fork-in-process`，默认名 `fork`，`inheritsParentContext = true`。两行 `inject = ['subagents']`。实现细节在 sibling 页。 |
| **Provider（仓库有、base 不装）** | Codex / Claude / ACP / DSH-SDK：各自 `registerProvider`。base patch **没有**对应 id；不是 dormant 行。 |
| **Consumer（模型面 / preset）** | `@deepseek-ai/dsh-tool-subagent`（`inject` `tools`+`subagents`+`systemPrompt`；web 下由 `standard`/`code`/`cordis` 的 `delegation` 组 remount）。`@deepseek-ai/dsh-tool-subagent-control`（`followup`/`interrupt`）。字段表在 `surface.tools.*`，本页不写。 |
| **Consumer（host 进程内）** | `@deepseek-ai/dsh-tool-subagent-report`：`registerContinuableSetup`，必须与 registry 同在 host。`WorkerThreadWorkflowEngine`：`ctx.subagents.start`。one-shot 后台工具再消费 `ctx.jobs`（本缝只给 `settleRun`）。 |
| **isolate / 组合行** | registry + spawn/fork + report setup = **host 面**。web overlay disable 模型 tool 行。preset `delegation.isolate` 只有 `workflowEngine: true`，**不** isolate `subagents`。 |

换掉 `spawn` provider 会带走：孩子是否看见父对话、能否 continuable、depth/persona/toolFilter 是否可执行、one-shot 是同进程 `Agent` 还是远端进程。模型工具名可以不变。

## Sources

- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/lifecycle.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/descriptor.ts
- packages/subagent/subagent/src/out-of-process.ts
- packages/subagent/subagent/src/list-children.ts
- packages/subagent/subagent/src/error.ts
- packages/subagent/subagent/src/depth.ts
- packages/subagent/subagent/src/run-settlement.ts
- packages/subagent/subagent/package.json
- packages/subagent/subagent/tests/service.spec.ts
- packages/subagent/subagent/tests/continuation.spec.ts
- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent-fork-in-process/src/index.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/tool-subagent-control/src/index.ts
- packages/subagent/tool-subagent-report/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- packages/core/tools/src/index.ts
- packages/terminal/terminal/src/index.ts
- packages/workflow/workflow-worker-thread/src/host.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md) — 组合主线与 host / preset 切面。
- [spine.trace-subagent](../../spine/trace-subagent.md) — 前台 `subagent` → `start('spawn')` → 新 session 的闭合走读。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 总图。
- [spine.turn-and-step](../../spine/turn-and-step.md) — 孩子 `followup` / `whenIdle` 用的同一套 loop。
- [surface.tools.subagent](../../surface/tools/subagent.md) — 模型可见 `subagent` 的 schema 与三种 `kind`。
- [surface.tools.subagent-control](../../surface/tools/subagent-control.md) — `send_message` / `interrupt_agent` / `list_agents`。
- [surface.tools.subagent-fork](../../surface/tools/subagent-fork.md) — 同包另一实例，`provider: fork`。
- [subsys.orchestration.subagent-in-process](subagent-in-process.md) — `SpawnInProcessProvider` / `startInProcessRun`。
- [subsys.orchestration.subagent-fork](subagent-fork.md) — `ForkInProcessProvider` 与 host/preset `backgroundMode` 不一致。
- [subsys.orchestration.jobs](jobs.md) — one-shot 后台才走的 `ctx.jobs`。
- [subsys.orchestration.workflow](workflow.md) — worker `agent()` 调 `ctx.subagents.start`。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — `dsh-base` 真树与「不装 Codex/Claude」。
