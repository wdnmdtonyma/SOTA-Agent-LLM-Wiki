---
id: subsys.orchestration.subagent-in-process
title: in-process spawn
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-spawn-in-process/package.json
  - packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts
  - packages/subagent/subagent-spawn-in-process/tests/spawn-in-process.e2e.ts
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/subagent/subagent-in-process-driver/src/structured.ts
  - packages/subagent/subagent-in-process-driver/package.json
  - packages/subagent/subagent-in-process-driver/tests/subagent-in-process-driver.spec.ts
  - packages/subagent/subagent-in-process-driver/tests/inheritance.spec.ts
  - packages/subagent/subagent-in-process-driver/tests/preset-inheritance.spec.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/depth.ts
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/src/index.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - vendor/cordis/src/events.ts
symbols:
  - SpawnInProcessProvider
  - startInProcessRun
  - providerName
related:
  - spine.trace-subagent
  - subsys.orchestration.subagent
  - surface.tools.subagent
  - subsys.orchestration.subagent-fork
  - spine.overview
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-subagent-spawn-in-process` 是 **host 面** in-process spawn Provider：默认 registry 名 `spawn`，在同一进程里 `ctx.agents.create` 一枚**新 session** 的 child `Agent`。`inheritsParentContext = false`，孩子**不**继承父对话。共享库 `@deepseek-ai/dsh-subagent-in-process-driver` 导出 `startInProcessRun`，只跑 one-shot；**不是** bundle 行。

## 能回答的问题

- 默认 `providerName` 是什么？`inheritsParentContext` 是 `true` 还是 `false`？`prepareContinuable()` 返回什么？
- `dsh-subagent-in-process-driver` 是组合行还是库？one-shot 与 continuable 各走谁？
- spawn 子 session 为什么看不到父对话？`applyChildComposition` 又给孩子哪些 preset / 工具 / 审批钉死？
- 为什么 `inject` 只有 `['subagents']`，故意不 `inject: tools`？
- host 面谁注册 `spawn`？preset / isolate 会不会再复制一份 backend？`dsh web` 关掉的是工具还是 provider？

## 职责边界

本页权威覆盖两段代码：**Provider 插件** `@deepseek-ai/dsh-subagent-spawn-in-process`（`SpawnInProcessProvider`）和 **one-shot 库** `@deepseek-ai/dsh-subagent-in-process-driver`（`startInProcessRun`）。插件 `apply` 只做一件事：`ctx.subagents.registerProvider(new SpawnInProcessProvider(config.providerName))`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:63] Config 唯一字段 `providerName`，schema 默认 `'spawn'`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:31]

`start()` 只跑 one-shot：把已校验的 `ResolvedSubagentStartRequest` 交给 `startInProcessRun(request, {})`，空 options 表示**无 seed**。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:52] `prepareContinuable()` 固定 `Promise.resolve({})`，不贡献 seed；continuable 的 `agents.create` / 投递 / 驻留 / 结算由 `ctx.subagents` 的 continuation manager 拥有，**不是** `SpawnInProcessProvider.start`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:58] [E: packages/subagent/subagent/src/continuation.ts:428]

driver 是 TypeScript 库，`package.json` 写明供 spawn / fork backend 使用；`dsh-base` 的 `cordis.patch.yml` **没有** `id: subagent-in-process-driver` 行，`dsh-base` 的 dependencies 只列 `dsh-subagent-spawn-in-process` / `dsh-subagent-fork-in-process`，不列 driver。[E: packages/subagent/subagent-in-process-driver/package.json:3] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] spawn 包以 peerDependency 引用 driver。[E: packages/subagent/subagent-spawn-in-process/package.json:37]

明确**不**拥有：

- `ctx.subagents` Definition、`registerProvider` 表、`start` / `startContinuable` 门控、descriptor / Activation 状态机：[subsys.orchestration.subagent](subagent.md)（`subsys.orchestration.subagent`）。
- 模型可见 wire 名 `subagent` 的 schema / `backgroundMode` / 三种 output `kind`：[surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）。本页不写 T1 字段表。
- 带父对话 seed 的 in-process fork：`inheritsParentContext = true`，`completedTurnPrefix` 切最后一个 `turn/end`。[subsys.orchestration.subagent-fork](subagent-fork.md)（`subsys.orchestration.subagent-fork`）。[E: packages/subagent/subagent-fork-in-process/src/index.ts:64]
- `ctx.jobs`、Codex / Claude / ACP / SDK 进程外 backend。
- 默认 `AgentFactory` / inbox / `deriveMessages()`。孩子只是 `parent.ctx.agents.create` 再走同一套 loop。

**host 面 vs agent-preset 面。** `id: subagent` + `id: subagent-spawn-in-process` 是进程单例：provider 名全局唯一，跨会话 `start` 都查同一张表。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:298] `dsh-web-app` **不** disable 这两行；它 disable 的是 host 上的模型可见 Consumer（`id: tool-subagent`）。[E: packages/bundle/web-app/cordis.patch.yml:380] shipped `standard` 在 isolate 组 `delegation` 里再挂 `@deepseek-ai/dsh-tool-subagent`，`provider: spawn`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:189] 该组 `isolate: { workflowEngine: true }` 只 isolate `workflowEngine`，**不** isolate、也不 remount `spawn` provider。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] `minimal` 没有 `tool-subagent` 行。默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent-spawn-in-process/src/index.ts` | `SpawnInProcessProvider`：`name` / `inject` / `Config.providerName` / `start` / `prepareContinuable` / `apply` |
| `packages/subagent/subagent-in-process-driver/src/index.ts` | 库函数 `startInProcessRun`：depth、新 session、policy seed、`applyChildComposition`、one-shot 驱动与 `dispose` |
| `packages/subagent/subagent-in-process-driver/src/structured.ts` | 孩子 scope 上的 `structured_output` 捕获运行时 |
| `packages/subagent/subagent/src/child-agent.ts` | spawn / fork / continuation 共用的 `resolveChildDepth` / `childSessionMeta` / `applyChildComposition` / 审批钉死 |
| `packages/subagent/subagent/src/types.ts` | `SubagentProvider` / `ContinuableCreateSpec` / `SubagentRun` 合同 |
| `packages/bundle/base/cordis.patch.yml` | host 行：`id: subagent-spawn-in-process`，`providerName: spawn` |
| `packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts` | 新 session、不继承父对话、`prepareContinuable` 无 seed、`inject` 形状、HMR |
| `packages/subagent/subagent-in-process-driver/tests/preset-inheritance.spec.ts` | `composeFrom` 后孩子看见父 preset 工具 |
| `packages/subagent/subagent-in-process-driver/tests/inheritance.spec.ts` | 孩子 log 先写 `sandbox/mode` + `approval/policy: never` |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `Config.providerName` | spawn 插件 Config | registry 名。schema 默认 `'spawn'`。`dsh-base` 显式写成 `spawn`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:31] [E: packages/bundle/base/cordis.patch.yml:298] |
| `SpawnInProcessProvider.name` | 构造参数 | 等于 `config.providerName`，交给 `registerProvider`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:46] |
| `inheritsParentContext` | `false`（写死） | 孩子**不**吃父对话前缀。字段本身只是 boolean；工具 / sandbox / 权限另走 `applyChildComposition`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:44] [E: packages/subagent/subagent/src/types.ts:295] [I] |
| `capabilities` | 四旗全 `true` | `outputSchema` / `depthLimit` / `toolFilter` / `persona`。服务在 `start` 前按请求字段校验，缺能力抛 `UNSUPPORTED_CAPABILITY`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:42] |
| `prepareContinuable` | 返回 `{}` | `ContinuableCreateSpec.seed` 缺省 = 无父历史。方法存在即 continuable 能力。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:58] [E: packages/subagent/subagent/src/types.ts:191] [E: packages/subagent/subagent/src/types.ts:323] |
| `InProcessRunOptions.seed` | driver 可选 | fork 传入已完成 turn 前缀；spawn 传 `{}`，`activationBoundary = 0`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:70] [E: packages/subagent/subagent-in-process-driver/src/index.ts:113] |
| `SubagentRun` | one-shot 句柄 | `id` = 孩子 `SessionId`；`localAgent` 指向同进程 child；`result` + `dispose`。无 `steer` / `resume`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:191] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:233] |
| `DelegatedPolicyOverrides` | 创建窗口 | 只抄父 session **显式** sandbox override；只要组合了 `approval`，孩子 `approvalPolicy` 钉 `'never'`。[E: packages/subagent/subagent/src/child-agent.ts:201] [E: packages/subagent/subagent/src/child-agent.ts:202] 测试：孩子 log 前两条是 `sandbox/mode` + `approval/policy`，`source: 'delegation'`。[E: packages/subagent/subagent-in-process-driver/tests/inheritance.spec.ts:104] [E: packages/subagent/subagent-in-process-driver/tests/inheritance.spec.ts:105] |
| `STRUCTURED_OUTPUT_TOOL` | `'structured_output'` | 仅当请求带 `outputSchema` 时挂在**孩子** scope。[E: packages/subagent/subagent-in-process-driver/src/structured.ts:19] |

`inheritsParentContext` 只给 `dsh-tool-subagent` 选文案：`false` 时 description 写孩子 `does not see this conversation`。[E: packages/subagent/tool-subagent/src/index.ts:231] [E: packages/subagent/tool-subagent/src/index.ts:291]

## 控制流

### 1. Host 注册 `spawn`（进程单例）

1. `dsh-base` insert `id: subagent`（`@deepseek-ai/dsh-subagent`），再 insert `id: subagent-spawn-in-process`，`config.providerName: spawn`。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:298]

2. `apply@packages/subagent/subagent-spawn-in-process/src/index.ts` 调 `ctx.subagents.registerProvider`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:63] `registerProvider@packages/subagent/subagent/src/index.ts` 把实现放进 `Map<string, SubagentProvider>`；重名抛 `DUPLICATE_PROVIDER`。注册是 Cordis `ctx.effect()`：fiber dispose 只挡住新 `start`，已返回给 holder 的 run 不撤回。[E: packages/subagent/subagent/src/index.ts:372] [E: packages/subagent/subagent/src/index.ts:374]

3. `inject = ['subagents']`。**故意不** `inject: tools`：孩子 factory 的 setup 窗口已经能拿到 `ctx.tools`；在 provider 上再 inject `tools` 会改变本插件的 apply 时序，并牵动委托工具在模型可见表里的位置。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:22] 测试钉死 named export 形状、无 `default`（否则 loader `unwrapExports` 会丢掉 `inject`）。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:372] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:374]

4. `dsh-web-app` 关掉 host `id: tool-subagent`（`disabled: true`），**留下** registry 与 spawn backend。[E: packages/bundle/web-app/cordis.patch.yml:381] `standard` 在 `delegation` 组 remount 同一 Consumer，`provider: spawn`、`toolName: subagent`、`backgroundMode: continuable`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:189] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191] isolate 不复制 `spawn`。

### 2. One-shot：`start` → `startInProcessRun` → 新 session

5. `SubagentRuntime.start` 查表、校验 capability、拍 one-shot descriptor，再 `await provider.start(resolved)`。[E: packages/subagent/subagent/src/index.ts:414] [E: packages/subagent/subagent/src/index.ts:425] `SpawnInProcessProvider.start` 不读父 log，直接 `startInProcessRun(request, {})`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:52]

6. `startInProcessRun@packages/subagent/subagent-in-process-driver/src/index.ts`：`assertSubagentMaxDepth`；已 abort 则抛 `subagent request was aborted before child publication`，不 publish。[E: packages/subagent/subagent-in-process-driver/src/index.ts:106] [E: packages/subagent/subagent-in-process-driver/src/index.ts:107] `resolveChildDepth(parent, request.maxDepth)` = `delegationDepthOf(parent) + 1`，超 cap 抛 `SubagentDepthError`。[E: packages/subagent/subagent/src/child-agent.ts:49] [E: packages/subagent/subagent/src/child-agent.ts:54] `delegationDepthOf` 取 header `delegationDepth` 与 runtime `subagentDepth` 的较大值。[E: packages/subagent/subagent/src/depth.ts:35] `maxDepth: 0` 禁止任何孩子（父 depth 0 → 孩子会是 1）。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:147] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:148]

7. `SessionId(randomUUID())` 作为 child id。[E: packages/subagent/subagent-in-process-driver/src/index.ts:111] spawn 无 seed，`activationBoundary = 0`，`childSessionMeta` 不写 `seedLength`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:113] [E: packages/subagent/subagent/src/child-agent.ts:118] 第一个 await 之前同步 `captureDelegatedPolicyOverrides(parent)`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:117]

8. `parent.ctx.agents.create`：`AgentRegistry.create` 转到已注册 factory（默认 `AgentLoop.createAgent`）。[E: packages/subagent/subagent-in-process-driver/src/index.ts:132] [E: packages/core/agent/src/index.ts:405] [E: packages/core/agent-loop/src/index.ts:606] `meta` 继承 cwd、记下 live `composedPreset`、`parentSession`、`origin: 'subagent'`、`delegationDepth`。[E: packages/subagent/subagent/src/child-agent.ts:112] [E: packages/subagent/subagent/src/child-agent.ts:115] 测试：孩子 `session.header.id` 不是父 id，且 `parentSession` 指向父。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:102] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:103]

9. 创建窗口 `setup`：`appendDelegatedPolicyOverrides` 往孩子 log 写 `source: 'delegation'` 的 `sandbox/mode` / `approval/policy`；`applyChildComposition` 先 `agentPresets.composeFrom(childCtx, parent.ctx)`，再注册 `subagent:delegation` 上下文句，可选 shadow `deployment:persona`，可选 `tools.restrict`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:121] [E: packages/subagent/subagent-in-process-driver/src/index.ts:122] [E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/subagent/subagent/src/child-agent.ts:170] [E: packages/subagent/subagent/src/child-agent.ts:174] `composeFrom` 是 `bindScopeParent`，不是 `mount()`；父没加入任何 preset 时返回 `undefined`。[E: packages/preset/agent-presets/src/index.ts:322] [E: packages/preset/agent-presets/src/index.ts:323] 带 preset 的部署里，孩子请求的 tool 名表等于父 preset（再叠加 restrict）。[E: packages/subagent/subagent-in-process-driver/tests/preset-inheritance.spec.ts:77] 有 `outputSchema` 时 `attachStructuredRuntime` 只登记在孩子 scope。[E: packages/subagent/subagent-in-process-driver/src/index.ts:127]

10. `attachDescriptorAppend` 挂在孩子 `agent/pre-step` **waterfall**：先 `const decision = await next()`，仅当尚未 append 且 `decision.kind === 'enter'` 才 `agent.session.append('subagent/descriptor', descriptor)`，再 `return decision`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:82] [E: packages/subagent/subagent-in-process-driver/src/index.ts:85] `agent/pre-step` 的合同就是带 `next` 的 waterfall。[E: packages/core/agent/src/runtime-types.ts:231] Cordis `waterfall` 用 `cbs.shift()` 把控制交给下一层 listener，最后落到 loop 内建 `{ kind: 'enter', messages }`；不调用 `next()` 会否决后续层与内建 enter。[E: vendor/cordis/src/events.ts:238] [E: packages/core/agent-loop/src/agent.ts:234] descriptor 无 `surfaceOp`，不进模型历史。

### 3. 驱动一回合并回收

11. `drivePublishedRun` 在 `request.signal` 上听 abort（转 `child.cancel({ kind: 'parent' })`），然后 `child.followup(createUserMessage({ content: prompt, source: { kind: 'user' } }))`，`await child.whenIdle()`。[E: packages/subagent/subagent-in-process-driver/src/index.ts:177] [E: packages/subagent/subagent-in-process-driver/src/index.ts:178] `ReactLoopAgent.followup` 是 `send(..., 'next-turn', true)`。[E: packages/core/agent-loop/src/agent.ts:122] 孩子用**自己的** session log 做 `deriveMessages()`。父先跑完一轮再 spawn：孩子第一条 `user/message` 是自己的 prompt，不是父历史。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:107] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:119]

12. `whenIdle` 之后 `readResult` 从 `events.slice(boundary)` 取 `finalAssistantOutput`，并把 turn-end 映射到 `completed` / `aborted` / `error` / `max-tokens` / `refusal`（`blocked` → `refusal`）。[E: packages/subagent/subagent-in-process-driver/src/index.ts:214] [E: packages/subagent/subagent-in-process-driver/src/index.ts:221] [E: packages/subagent/subagent-in-process-driver/src/index.ts:59] [E: packages/subagent/subagent-in-process-driver/src/index.ts:222] 请求了 structured 却没捕获成功、且 `stopReason === 'completed'` 时改成 `error`（或 cancel 时 `aborted`）。[E: packages/subagent/subagent-in-process-driver/src/index.ts:230]

13. `dispose` 再等 `handle.dispose()` 与 `result`；disposal 失败才从 `dispose()` 抛出，run 故障走 `result` 通道。[E: packages/subagent/subagent-in-process-driver/src/index.ts:198] 测试：`dispose` 之后 `ctx.agents.get(run.id)` 为 `undefined`。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:131] 父 session 只追加这次 `tool/call` + `tool/result`；孩子中间 step 留在孩子自己的 log。with-key e2e 按父 log 里 `type === 'tool/call' && data.name === 'subagent'` 计数。[E: packages/subagent/subagent-spawn-in-process/tests/spawn-in-process.e2e.ts:42]

### 4. Continuable：spawn 只贡献空 spec

14. shipped `subagent` 的 `backgroundMode: continuable` 让省略 `run_in_background` 走 `ctx.subagents.startContinuable`，不进 `SpawnInProcessProvider.start`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191] manager 先 `host.prepareContinuable`；spawn 返回 `{}`，`lineageSeedLength = prepared.seed?.length ?? 0`，随后 manager 自己 `materialize` + 投递初始 prompt。[E: packages/subagent/subagent/src/continuation.ts:428] [E: packages/subagent/subagent/src/continuation.ts:436] 测试：`typeof provider.prepareContinuable === 'function'`，且 `spec.seed` 为 `undefined`。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:239] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:245]

## 设计动机

- **最便宜的委托运输。** 孩子与父共享同一进程、同一 `ctx.agents` factory、同一套 tool / sandbox / LLM 缝，只换一份新 session。模块注释把这条路径定位成 reuse agent factory 的 quiescent teardown，而不是另起 subprocess。
- **对话隔离，不是工具隔离。** `inheritsParentContext = false` 只切断父 log 前缀：孩子必须拿到独立、自包含的 prompt。cwd、preset 绑定、`composeFrom`、显式 sandbox override、审批钉死仍穿过 `applyChildComposition`。文案层把这件事告诉模型（`does not see this conversation`）。
- **driver 抽成库。** spawn 与 fork 的差异只在 seed；depth、policy、composition、structured、one-shot 驱动必须只有一份。driver 因此不能变成第三条 bundle 行，否则组合树会假装它是可替换 Provider。
- **continuable 与 one-shot 分家。** `prepareContinuable` 只允许返回数据 `{ seed? }`，禁止携带 `Agent` / handle / dispose。spawn 无 seed 可贡献，所以返回 `{}`。方法存在本身就是能力检查。
- **apply 时序不绑死 tool 表。** 不 `inject: tools`，避免 provider 的 load 顺序改写模型可见工具清单；structured 捕获工具在孩子 setup 窗口按需登记。
- **委托孩子不能向人要权。** 组合了 `approval` 时一律钉 `'never'`，与父自己的 ask/never 无关。孩子只能在委托当时固定的 sandbox 范围内行动。

## Gotcha

- **driver 不是 bundle 行。** 在 `cordis.patch.yml` 里找不到 `subagent-in-process-driver` 不等于没装：它是 spawn / fork 的 peer 库。不要写成「base 漏装 driver」。
- **`start()` 与 `startContinuable()` 不是同一条 backend 路径。** 前台 / one-shot Job 走 `provider.start` → `startInProcessRun` → 必须 `dispose`。Continuable 走 `prepareContinuable`（spawn 贡献 `{}`）+ manager 自己的 `agents.create`；fulfillment 只表示 inbox 接受了 prompt。
- **`inheritsParentContext` 不可当权限开关。** 孩子仍 `composeFrom` 父 preset，仍继承 cwd / provider / model，仍钉 `approvalPolicy: 'never'`。空 fork prefix 在 fork 侧会省略 seed，效果上退化为 spawn；那是 fork 的分支，不是 spawn 去读父 log。
- **isolate 不复制 `spawn`。** `delegation` 组 isolate 的是 `workflowEngine`。`ctx.subagents` 必须是进程单例：跨会话查询与 provider 名唯一性都挂在 host。
- **HMR 卸 provider ≠ 撤回已返回的 run。** fiber dispose 之后 `getProvider('spawn')` 为 `undefined`，但 `ctx.agents.get(run.id)` 仍在，直到 holder `dispose`。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:340] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:341]
- **回收的是 live `AgentHandle`，不是「删掉 session 文件」。** `dispose` 从 `ctx.agents` 注销孩子。持久化后端另页。
- **未知 `toolFilter` 名 fail-loud。** `deny: ['no_such_tool']` 让 spawn 拒绝，且不留下孤儿 child。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:439] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:440]
- **正在 dispose 的父不能 spawn。** 抛 `inactive context`，无 `session/created` / `agent/created`。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:461]
- **无 default export。** loader 若走 `exports.default ?? exports` 会丢掉 `inject`。测试钉死 `unwrapExports` 仍看见 `inject: ['subagents']`。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:372]
- **one-shot 无 `steer` / `resume`。** 续写是 continuation manager 的事。
- **`structured_output` 是孩子私有工具。** settle / dispose 后全局 `ctx.tools.get('structured_output')` 为 `undefined`。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:314]

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subagent` 的 `SubagentProvider` / `SubagentRuntime` | `ctx.subagents`。host `id: subagent`。`registerProvider`（不是 terminals 的 `registerBackend`）。 |
| **Provider** | 本页：`SpawnInProcessProvider` | host `id: subagent-spawn-in-process`，`config.providerName: spawn`。preset **不**挂此包。 |
| **Library（非三角顶点）** | `@deepseek-ai/dsh-subagent-in-process-driver` 的 `startInProcessRun` | **没有** bundle / preset 行。spawn 与 fork 都 import 它。 |
| **Consumer** | `@deepseek-ai/dsh-tool-subagent` | host `id: tool-subagent`（`provider: spawn`，`toolName: subagent`）。`dsh-web-app` `disabled: true` 后由 `standard` / `code` / `cordis` 的 `delegation` 组 remount。`minimal` 无此行。工具在 `subagent/provider-added` 且 `provider.name === config.provider` 时才 `ctx.tools.register`。 |

换掉 `id: subagent-spawn-in-process` 会带走同进程、新 session、无父对话这条运输；`ctx.subagents` 缝与模型可见 `subagent` 工具仍在，只是名为 `spawn` 的 provider 消失，工具会随 `subagent/provider-removed` 摘掉。

## Sources

- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent-spawn-in-process/package.json
- packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts
- packages/subagent/subagent-spawn-in-process/tests/spawn-in-process.e2e.ts
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/subagent/subagent-in-process-driver/src/structured.ts
- packages/subagent/subagent-in-process-driver/package.json
- packages/subagent/subagent-in-process-driver/tests/subagent-in-process-driver.spec.ts
- packages/subagent/subagent-in-process-driver/tests/inheritance.spec.ts
- packages/subagent/subagent-in-process-driver/tests/preset-inheritance.spec.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/depth.ts
- packages/subagent/subagent-fork-in-process/src/index.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- packages/preset/agent-presets/src/index.ts
- packages/core/agent/src/index.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-loop/src/agent.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.trace-subagent`](../../spine/trace-subagent.md) — 默认 `standard` 下前台 `subagent` → `spawn` → 新 session 的端到端走读。
- [`subsys.orchestration.subagent`](subagent.md) — `ctx.subagents` 缝、`registerProvider`、`start` / `startContinuable`、continuation manager。
- [`surface.tools.subagent`](../../surface/tools/subagent.md) — 模型可见 `subagent`：`toolName`、`backgroundMode`、三种返回 `kind`。
- [`subsys.orchestration.subagent-fork`](subagent-fork.md) — 同一 driver、带父对话 seed 的 `fork` provider。
- [`spine.overview`](../../spine/overview.md) — host / preset / client 分层总览。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 插入 `subagent` + spawn / fork 行、不装 Codex / Claude。
