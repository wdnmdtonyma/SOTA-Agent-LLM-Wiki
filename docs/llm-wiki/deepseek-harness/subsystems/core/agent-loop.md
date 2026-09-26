---
id: subsys.core.agent-loop
title: 默认 agent-loop 驱动
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/inbox.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/src/runtime-context.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/core/agent-loop/src/constants.ts
  - packages/core/agent-loop/tests/loop.spec.ts
  - packages/core/agent-loop/tests/interception.spec.ts
  - packages/core/agent-loop/tests/tool-calls.spec.ts
  - packages/core/agent-loop/tests/scope-lifecycle.spec.ts
  - packages/core/agent-loop/tests/request-reconstruction.spec.ts
  - packages/core/agent-loop/tests/invariant.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/headless/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/types.ts
  - packages/core/scope/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/llm/llm/src/call-config.ts
  - packages/api/session-controller/src/agent.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.agentLoop
  - AgentLoop
  - ReactLoopAgent
  - ReactLoopInbox
  - executeToolCalls
  - RuntimeContextProjection
  - SystemPromptProjection
related:
  - spine.turn-and-step
  - subsys.core.agent
  - subsys.core.agent-inbox
  - spine.overview
  - spine.session-log
  - spine.tool-call-anatomy
  - spine.composition-boot
  - subsys.core.session
  - subsys.core.system-prompt
  - subsys.core.tools
  - subsys.core.invariants
  - subsys.core.scope
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.composition.agent-presets
  - subsys.persistence.checkpoint
  - subsys.host.apiproxy
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh-agent-loop` 是 **host 面**默认 `AgentFactory`：构造时把自己塞进 `ctx.agents` 的全局工厂槽，登记 `'inbox'` 投影，`prepare` 里 `new ReactLoopAgent`（含本包的 `ReactLoopInbox`），再按 inbox 驱动 turn / step。它是可替换的 Cordis 插件，不是写死的 coding-agent 主循环。`SESSION_FORMAT_VERSION` 现为 **4**。

## 能回答的问题

- 换 loop 要改哪一行组合、占哪一个工厂槽？`dsh-agent` 合同还在不在？
- `dsh-base` 的 `agent-loop` 行为什么是 `agents: []`？Web / headless / sdk / acp 各自谁在运行时 `create`？
- `ReactLoopAgent.turn` / `step` 的编号路径：`turn/start` → claim → assemble → `agent/pre-step` → `step/start` → `agent/request` → `system/message` → `user/message` → `deriveMessages` → stream。waterfall 不调用 `next()` 会怎样？
- 内部 `Phase` `idle` / `maintenance` / `running` 对外怎么折叠？`reject`、`max-tokens`、空 claim 各以什么 reason 收 turn？
- `maxParallelToolCalls` 卡在哪一层？`RuntimeContextProjection` 怎样把动态上下文变成可重建的 `user/message`？
- `model-visible ⟺ logged` 的 companion 挂在哪条 `llm/stream` 上？preset 行若把 `agentLoop` 发进 root realm，`leakedServices` 会不会拒？

## 职责边界

本包拥有默认驱动 **以及** inbox 实现（`ReactLoopInbox` + `inboxProjectionDefinition`）。`dsh-agent`（[`subsys.core.agent`](agent.md)）只提供 `Agent` / `Inbox` **合同** / `ctx.agents` / `agent/*` 事件和**一个** `setFactory` 槽；没有工厂时 `create` / `resume` 抛 `no agent factory registered (load an agent-loop plugin)`。[E: packages/core/agent/src/index.ts:206] [E: packages/core/agent/src/index.ts:377] 第二次 `setFactory` 抛 `an agent factory is already registered`。[E: packages/core/agent/src/index.ts:360] `AgentLoop` 在构造里用可逆 `ctx.effect` 把自己登记进去，卸掉这一行就清空槽。[E: packages/core/agent-loop/src/index.ts:369]

队列语义（`followup` / `steer` / `inject`、`claim`、fork 继承）的权威走读在 [`subsys.core.agent-inbox`](agent-inbox.md)；本页写构造点与 turn/step 怎样消费 inbox。本包**不**拥有：append-only `SessionEventMap` 与 `deriveMessages()`（[`subsys.core.session`](session.md) / [`spine.session-log`](../../spine/session-log.md)）；`ctx.tools` 注册表与 `tools/pre-execute` 管线（[`subsys.core.tools`](tools.md) / [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)）；`systemPrompt.assemble` 的 section 装配（[`subsys.core.system-prompt`](system-prompt.md)）；preset 发现与 `mountPreset`（[`subsys.composition.agent-presets`](../composition/agent-presets.md)）；adapter 前 / top-level tool body 前的 `sessions.flush`（[`subsys.persistence.checkpoint`](../persistence/checkpoint.md)）。端到端 turn 时序的权威走读在 [`spine.turn-and-step`](../../spine/turn-and-step.md)；本页补工厂、`agents[]`、回滚、并行上限、runtime-context / system-prompt 投影。

**host 面 vs agent-preset 面。** host 面是进程级：webserver / persistence / sandbox / subagent **backends** / 注册表。`AgentLoop` 是进程级 Service（`ctx.agentLoop`），坐在 `dsh-base` 的 `id: agent-loop`，同 bundle 还有 `session-persistence-jsonl` / `sandbox` / `subagent-spawn-in-process` / `subagent-fork-in-process` / `ptc-runtime`。[E: packages/core/agent-loop/src/index.ts:355] [E: packages/bundle/base/cordis.patch.yml:510] [E: packages/bundle/base/cordis.patch.yml:130] [E: packages/bundle/base/cordis.patch.yml:225] [E: packages/bundle/base/cordis.patch.yml:351] [E: packages/bundle/base/cordis.patch.yml:356] [E: packages/bundle/base/cordis.patch.yml:389] webserver **不**在 base：它是 `dsh-web-app` 的 `id: webserver` / `@deepseek-ai/dsh-host-webserver`。[E: packages/bundle/web-app/cordis.patch.yml:163] base 的 `id: web` 是 `@deepseek-ai/dsh-web` 搜索服务，不是 HTTP 宿主。[E: packages/bundle/base/cordis.patch.yml:471] 每个 `ReactLoopAgent` 再 `createScope(loopCtx, this)` 铸一份 `Agent.ctx`，preset 的 tools / persona / isolate 挂在这份 scope 上，随 handle `dispose` 卸掉。[E: packages/core/agent-loop/src/agent.ts:130] [E: packages/core/scope/src/index.ts:137] 叠 `dsh-base` 的 shipped profile 是 `web` / `headless` / `sdk` / `acp`；另有 `sdk-minimal` **不**叠 base（其 `bundles` 只有自己），因此没有这条 `id: agent-loop` 行来自 base——它自己的 patch 另插 `agent-loop`。[E: packages/boot/app-boot/src/profile.ts:183] [E: packages/boot/app-boot/src/profile.ts:192] 入口：`dsh web` 是硬编码 `web` alias；其余用 `dsh --profile headless|sdk|sdk-minimal|acp`。本仓没有 shipped TUI。`dsh-base` 当前**不** dormant 加载 Codex / Claude 子代理：`cordis.patch.yml` 里 `subagent-codex` / `subagent-claude-code` 行数为 0，manifest 也不依赖那两个包。[E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:43]

**`agents: []`。** base 行的启动配置是空列表：Web 不在进程级造 Agent，会话由 host HTTP 层（`dsh-api-session-controller`）在请求时 `ctx.agents.create`。[E: packages/bundle/base/cordis.patch.yml:513] [E: packages/bundle/base/tests/base.spec.ts:34] [E: packages/api/session-controller/src/agent.ts:486] `dsh-headless` 同样不靠这一数组：runner 在任务入口自己 `agents.create`，再 `followup` + `whenIdle`。[E: packages/bundle/headless/src/index.ts:346] [E: packages/bundle/headless/src/index.ts:365] 换 loop = 另写一个 `AgentFactory` 插件占同一槽，并在 bundle / profile patch 里替换 `id: agent-loop` 那一行，而不是改 `dsh-agent`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent-loop/src/index.ts` | `AgentLoop` Service / `AgentFactory`：`setFactory`、`prepare`、`create` / `createAgent` / `resume`、config `agents[]`、volatile 并行上限、登记 turnBoundary + inbox 投影 |
| `packages/core/agent-loop/src/agent.ts` | `ReactLoopAgent`：Phase、inbox 三入口、`turn` / `step` / `prepareRequest` / `buildRequest` |
| `packages/core/agent-loop/src/inbox.ts` | `ReactLoopInbox` + `inboxProjectionDefinition`（队列权威在 inbox 页） |
| `packages/core/agent-loop/src/tool-calls.ts` | `executeToolCalls`：exclusive 屏障 + 有界并行池；`tool/call` / `tool/result` |
| `packages/core/agent-loop/src/runtime-context.ts` | `RuntimeContextProjection` / `SystemPromptProjection`：动态上下文与 `system/message` |
| `packages/core/agent-loop/src/invariant.ts` | companion：在 `llm/stream` 上核 `model-visible ⟺ logged`；断言 `options.system === undefined` |
| `packages/core/agent-loop/src/constants.ts` | `DEFAULT_MAX_PARALLEL_TOOL_CALLS = 10` |
| `packages/bundle/base/cordis.patch.yml` | host 组合：`id: agent-loop`，`agents: []`；`id: web` 是 `@deepseek-ai/dsh-web` 搜索 |
| `packages/bundle/web-app/cordis.patch.yml` | host UI 层：`id: webserver` / `@deepseek-ai/dsh-host-webserver` |
| `packages/core/agent-loop/tests/loop.spec.ts` | 边界顺序、inbox 三入口、`max-tokens` 粘性、`agent/request` 换模型 |
| `packages/core/agent-loop/tests/interception.spec.ts` | `agent/pre-step` `next()` / `reject` → `blocked` |
| `packages/core/agent-loop/tests/scope-lifecycle.spec.ts` | setup 失败 / owner unload 回滚、不 publish |
| `packages/core/agent-loop/tests/tool-calls.spec.ts` | `maxParallelToolCalls` 滚动池 |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `ctx.agentLoop` | `AgentLoop` Service 名 | host 面默认工厂；`static inject = ['agents', 'sessions', 'llm', 'tools', 'systemPrompt', 'sessionProjections']` [E: packages/core/agent-loop/src/index.ts:331] |
| `Config.agents` | boot 一次消费 | 插件启动时 create / resume 的声明式条目。`maxParallelToolCalls` 是 **volatile** Config，不是独立 Settings 命名空间。[E: packages/core/agent-loop/src/index.ts:292] [E: packages/core/agent-loop/src/index.ts:297] |
| `Config.maxParallelToolCalls` | volatile number | schema 默认 10；非法值在 load 被拒。调度器读 `.get()`。[E: packages/core/agent-loop/src/index.ts:335] [E: packages/core/agent-loop/src/constants.ts:6] [E: packages/core/agent-loop/src/tool-calls.ts:132] |
| 内部 `Phase` | `idle` / `maintenance` / `running` | driver 私有三态。[E: packages/core/agent-loop/src/agent.ts:42] [E: packages/core/agent-loop/src/agent.ts:44] [E: packages/core/agent-loop/src/agent.ts:50] |
| 公开 `AgentStatus` | `'idle' \| 'running'` | `maintenance` 对外仍报 `idle`。[E: packages/core/agent/src/runtime-types.ts:109] [E: packages/core/agent-loop/src/agent.ts:140] |
| `PreparedStep` | `reject` 或 `enter` + `PromptAssembly` | `preStep` 的内部结果；`reject` 不带 assembly。[E: packages/core/agent-loop/src/agent.ts:54] |
| `PreStepDecision` | `dsh-agent` | waterfall 返回值：`reject` 或 `enter` + `messages`。[E: packages/core/agent/src/runtime-types.ts:112] |
| `RequestErrorAction` | `{ kind: 'retry' } \| undefined` | 默认 `undefined` 表示失败终结，不重试。[E: packages/core/agent/src/runtime-types.ts:122] |
| `InboxTarget` | `'next-turn' \| 'next-step'` | `followup` → next-turn + wake；`steer` → next-step + wake；`inject` → next-step、不 wake。[E: packages/core/agent/src/types.ts:39] [E: packages/core/agent-loop/src/agent.ts:163] |

`sessionId` 与 `resumeSessionId` 互斥；两条声明式条目不得共用同一 exact identity。[E: packages/core/agent-loop/src/index.ts:323] launcher 可在 Loader 挂行之前 `provide('configuredAgentIdentities', …)`，整键替换身份，避免 overlay 改 model 时把 identity 冲掉。[E: packages/core/agent-loop/src/index.ts:266]

## 控制流

### 1. 工厂占槽（host 面）

1. `dsh-base` 插入 `id: agent-loop` / `name: '@deepseek-ai/dsh-agent-loop'`，`config.agents: []`。[E: packages/bundle/base/cordis.patch.yml:510] [E: packages/bundle/base/cordis.patch.yml:511] [E: packages/bundle/base/cordis.patch.yml:513]
2. `AgentLoop` 构造：`super(ctx, 'agentLoop')`，解析并行上限，校验声明式 agents，登记 turnBoundary **和** inbox 投影，再登记两个 effect：`ownership.dispose` 与 `ctx.agents.setFactory(this)`。[E: packages/core/agent-loop/src/index.ts:355] [E: packages/core/agent-loop/src/index.ts:364] [E: packages/core/agent-loop/src/index.ts:365] [E: packages/core/agent-loop/src/index.ts:369]
3. 同一次构造还注册三个 system-prompt 变量：`provider` / `model` / `cwd`，从当前 `Agent.options` 与 `session.header.cwd` 投影。[E: packages/core/agent-loop/src/index.ts:370]
4. `Config.agents` 非空时：无 `resumeSessionId` 走 `create`（可先 `restoreOrCreateConfigured`）；有则 persistence 后 resume。base 的空数组让这一支成为 no-op。[E: packages/core/agent-loop/src/index.ts:374]

### 2. `prepare` → setup → publish，失败整笔回滚

5. `prepare` 在任何资源出现之前把 caller abort、owner fiber unload、factory teardown 熔进一个 `AbortController`。[E: packages/core/agent-loop/src/index.ts:479] [E: packages/core/agent-loop/src/index.ts:507]
6. 熔断装好之后才 `new ReactLoopAgent(loopCtx, id, options, session)`。[E: packages/core/agent-loop/src/index.ts:769] 构造 `createScope(loopCtx, this)`，再 `new ReactLoopInbox(...)`。**不再** `extend({ agent: this })`，也**不再**由 inbox 自己登记投影。[E: packages/core/agent-loop/src/agent.ts:130] [E: packages/core/agent-loop/src/agent.ts:132]
7. `createAgent` / `resume` 走 `setupAndPublish`：`await setup?(prepared.agent.ctx, prepared.agent)`，可选 `setupCommit.commit()`，然后 `publish`。setup / commit / abort 任一失败：`await prepared.dispose()`，两个 registry 都不留下 id。[E: packages/core/agent-loop/src/index.ts:754] [E: packages/core/agent-loop/src/index.ts:775] [E: packages/core/agent-loop/src/index.ts:778] owner 在 setup 中途 unload 抛 `owner disposed during setup`，`session/created` 与 `agent/created` 都不会发出。[E: packages/core/agent-loop/tests/scope-lifecycle.spec.ts:114]
8. `AgentLoop.create` 跳过 `setup`，`publish('startup')`；publish 抛错同样 `dispose`。[E: packages/core/agent-loop/src/index.ts:652] `resume` 缺 `sessionPersistence` 直接抛，不造半拉 Agent。[E: packages/core/agent-loop/src/index.ts:809]
9. Web 的 `AgentPresetRegistry.mount` 发生在工厂 `setup`（失败则整次 create 回滚）。preset 行若把 service publish 进 **root realm**，`leakedServices` 收集那些名字并抛 `Preset services require isolate realms`。[E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:267] `AgentLoop` 本身是 host 根上的 Provider，不该出现在 preset 行里；`createScope` 给的是 agent 注册边界，不是 Cordis `isolate` realm。shipped preset 声明是 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`（旧名 `code` 即 PTC）。

### 3. Waterfall 必须 `next()`

Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，内建行为也不会跑。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] `agentEvents.waterfall` 把这条语义接到 agent-scoped carrier 上。[E: packages/core/agent/src/dispatch.ts:146]

| 事件 | 模式 | 默认 `next()` | 不调用 `next()` |
|---|---|---|---|
| `agent/pre-step` | waterfall | `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }` [E: packages/core/agent-loop/src/agent.ts:278] | 监听者自己返回 `enter` / `reject`；默认 enter 被否决 [E: packages/core/agent/src/runtime-types.ts:320] |
| `system-prompt/assemble` | waterfall | 当前装配对象 [E: packages/core/system-prompt/src/index.ts:625] | 后续 listener 与默认装配都看不到本层之后的变换 |
| `agent/request` | waterfall | 冻结的 `LlmCallConfig` 种子 [E: packages/core/agent-loop/src/agent.ts:559] | 必须自己返回完整 config；**改不了** `messages` [E: packages/core/agent/src/runtime-types.ts:337] |
| `agent/request-error` | waterfall | `undefined`（不重试）[E: packages/core/agent-loop/src/agent.ts:486] | 返回 `{ kind: 'retry' }` 即本步再打一枪 [E: packages/core/agent-loop/src/agent.ts:489] |
| `llm/stream`（invariant） | waterfall，`prepend` | 放行下游 adapter | 检查失败 `fail(...)`；成功也必须 `return next()` 否则 adapter 收不到流 [E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:55] |
| `tools/pre-execute` / `tools/execute` / `tools/post-execute` | waterfall | allow / 跑 body / 接受 result | 否决整条 tools 管线 [E: packages/core/tools/src/index.ts:153] |
| `agent/turn-stopping` | **serial**（不是 waterfall） | 每个 listener 都会跑 | 无 `next`；续不续只看 inbox 是否又出现 next-step [E: packages/core/agent/src/runtime-types.ts:381] [E: vendor/cordis/src/events.ts:204] |

`agent/pre-step` 测试把「默认经由 `next()`」钉死：listener `return next()` 后 log 里的 `user/message` 仍是原文。[E: packages/core/agent-loop/tests/interception.spec.ts:76] [E: packages/core/agent-loop/tests/interception.spec.ts:84] 监听者也可以不调用 `next()`、直接 `{ kind: 'reject' }`。[E: packages/core/agent-loop/tests/interception.spec.ts:255]

### 4. `ReactLoopAgent.turn` / `step`

10. `followup` / `steer` / `inject` 都进 `send` → `Inbox.splice`；仅 waking 入口在 `phase === idle` 时 `wakeDriver`：同步切到 `running`，再 `withInitiator(this, () => this.kick())`。[E: packages/core/agent-loop/src/agent.ts:163] [E: packages/core/agent-loop/src/agent.ts:167] [E: packages/core/agent-loop/src/agent.ts:171] [E: packages/core/agent-loop/src/agent.ts:234] idle `inject` 只留下 `agent/inbox/spliced`，`status` 仍是 `idle`，不开 `turn/start`。[E: packages/core/agent-loop/tests/loop.spec.ts:966] [E: packages/core/agent-loop/tests/loop.spec.ts:967] idle `steer` 立刻 `running` 且已有 `turn/start`。[E: packages/core/agent-loop/tests/loop.spec.ts:915] [E: packages/core/agent-loop/tests/loop.spec.ts:916] 已 abort 的活动上，waking 投递会在 splice 之前把 target 改成 `next-turn`。[E: packages/core/agent-loop/src/agent.ts:157]
11. `kick`：`while (await this.turn()) {}`；`finally` 若仍是 `running` 收回 `idle`。[E: packages/core/agent-loop/src/agent.ts:254]
12. `turn` 先 `session.append('turn/start', { turn })`。[E: packages/core/agent-loop/src/agent.ts:305]
13. 每个拟议 step：`preStep` 里 `Inbox.claim(target, turn)` 抽走**全部** next-step，若 `target === 'next-turn'` 再抽**一条** next-turn。[E: packages/core/agent-loop/src/inbox.ts:109] 首拍 `target = 'next-turn'`，后续改 `'next-step'`。[E: packages/core/agent-loop/src/agent.ts:311] [E: packages/core/agent-loop/src/agent.ts:347]
14. claim 之后立刻 `systemPrompt.assemble(assembleContextFor(this, signal))`（`agent` 与 `scope` 绑在一起，避免漏掉 scoped 贡献），再用 `RuntimeContextProjection.project` 决定要不要追加一条 `kind: 'runtime-context'` 的 `UserMessage`，然后 `agent/pre-step` waterfall。[E: packages/core/agent-loop/src/agent.ts:272] [E: packages/core/agent/src/dispatch.ts:174] [E: packages/core/agent-loop/src/agent.ts:275] [E: packages/core/agent-loop/src/agent.ts:276]
15. `reject` → `turnEnds = { kind: 'blocked' }`，不写 `step/start`，已 claim 的消息不回队列、不上 `user/message`。测试：模型 0 次调用，log 只有 `turn/start` / `turn/end`，reason 为 `{ kind: 'blocked' }`。[E: packages/core/agent-loop/src/agent.ts:317] [E: packages/core/agent-loop/tests/interception.spec.ts:250] [E: packages/core/agent-loop/tests/interception.spec.ts:264] 首拍 `enter` 但 `messages.length === 0`：记 `completed`，0 个 step、0 次模型调用。[E: packages/core/agent-loop/src/agent.ts:324] 后续 step 允许空 `messages`（工具续跑那一拍 `messages: 0` 仍开 step）。[E: packages/core/agent-loop/tests/interception.spec.ts:117]
16. 进入 step：先 `append('step/start')`，再进 `step(decision)`。[E: packages/core/agent-loop/src/agent.ts:329] `step` **先** `prepareRequest`（里面跑 `agent/request`），再 `systemPrompt.project` 写出 `system/message`，然后才对 `decision.messages` 逐条 `append('user/message', …, { surfaceOp: 'append' })`。这是 inbox 内容第一次变成模型可见历史。[E: packages/core/agent-loop/src/agent.ts:391] [E: packages/core/agent-loop/src/agent.ts:400] [E: packages/core/agent-loop/src/agent.ts:403]
17. `buildRequest` 用 `session.deriveMessages()` 当 `boundaryMessages`，与装配好的 tools 一起冻进请求。[E: packages/core/agent-loop/src/agent.ts:654] [E: packages/core/session/src/index.ts:860] `agent/request` 只能换 `LlmCallConfig`；冻结请求在 waterfall **之后**、且 **system/user 已入 log** 之后才填 `messages: boundaryMessages`。[E: packages/core/agent-loop/src/agent.ts:559] [E: packages/core/agent-loop/src/agent.ts:661] 测试用 log 前缀重建一份新 `Session`，`request.messages` 与 `rebuilt.deriveMessages()` 相等。[E: packages/core/agent-loop/tests/request-reconstruction.spec.ts:890]
18. `markAgentLoopRequest(Object.freeze({…}))` 给这份对象打进程内标记；companion 只检查被标记的请求。[E: packages/core/agent-loop/src/agent.ts:661] [E: packages/llm/llm/src/call-config.ts:66] invariant 要求 `options.messages` 的 JSON 等于 `session.deriveMessages()`，否则 `fail('… log-reconstruction desync')`。[E: packages/core/agent-loop/src/invariant.ts:41] [E: packages/core/agent-loop/src/invariant.ts:42] 并且断言 `options.system === undefined`：system prompt 走 surface 上的 `system/message`，不再塞进 `request/header`。[E: packages/core/agent-loop/src/invariant.ts:47] 测试把未入 log 的 extra message 插进数组，命中同一句。[E: packages/core/agent-loop/tests/invariant.spec.ts:71]
19. 流：`preparedCall?.stream(request) ?? ctx.llm.stream(request)`；`AssistantStreamAttempt` 收 chunk，收束后 `assistant/message`（`surfaceOp: 'append'`）。失败结算可写 `assistant/attempt`。[E: packages/core/agent-loop/src/agent.ts:419] [E: packages/core/agent-loop/src/agent.ts:504] `finish.kind === 'max-tokens'` **立刻**返回，不跑 `executeToolCalls`；该 reason 在后续 step 里粘性，后来的 `completed` 不能降级。[E: packages/core/agent-loop/src/agent.ts:513] [E: packages/core/agent-loop/src/agent.ts:337] 测试：截断后 `turn/end` 是 `{ kind: 'max-tokens' }`。[E: packages/core/agent-loop/tests/loop.spec.ts:1291] [E: packages/core/agent-loop/tests/loop.spec.ts:1305]
20. 有 `tool-call` → `executeToolCalls`；结果 context 经 `inbox.splice('next-step', …)` 进下一拍，不直接改 derive 缓存。[E: packages/core/agent-loop/src/agent.ts:517] [E: packages/core/agent-loop/src/agent.ts:519] [E: packages/core/agent-loop/src/tool-calls.ts:60] `concluded === true`（`ToolExecutionResult.concludesTurn`）把本 step 标 `completed`，但已提交的 next-step 仍要抽干。[E: packages/core/agent-loop/src/agent.ts:521]
21. `step/end` 之后：若已有 `turnEnds` 且 `inbox.nextStep` 空，先 `serial('agent/turn-stopping')` 再读一次 inbox。listener `steer` 就能再开 step。[E: packages/core/agent-loop/src/agent.ts:342] [E: packages/core/agent-loop/src/agent.ts:343] `finally` 必写 `turn/end`。[E: packages/core/agent-loop/src/agent.ts:368] 同一次 `kick` 若还有下一条 `followup`，换新 `AbortController`、`step = 0` 并 `return true`，不回 `idle`。[E: packages/core/agent-loop/src/agent.ts:373]

### 5. 并行工具上限

22. `executeToolCalls` 按 `ctx.tools.executionMode` 切组：非 `parallel` 一次一个（exclusive 屏障）；`parallel` 把剩余 calls 送进滚动池。[E: packages/core/agent-loop/src/tool-calls.ts:89] 池宽读 `ctx.agentLoop.config.maxParallelToolCalls.get()`（volatile getter，下一组生效）。[E: packages/core/agent-loop/src/tool-calls.ts:132] `fillPool` 条件是 `inFlight.size < maxParallelToolCalls`。[E: packages/core/agent-loop/src/tool-calls.ts:200]
23. `maxParallelToolCalls: 0` 在插件 load 被 schema 拒。[E: packages/core/agent-loop/tests/tool-calls.spec.ts:275] 省略时等于 `DEFAULT_MAX_PARALLEL_TOOL_CALLS`（10）。[E: packages/core/agent-loop/src/constants.ts:6] [E: packages/core/agent-loop/tests/tool-calls.spec.ts:279]
24. 每个 start 先 `append('tool/call', { callId, name, arguments })`（`arguments` 是模型原文 JSON 字符串），结算再 `append('tool/result', …, { surfaceOp: 'append', sourceEventSeqs: [callSeq] })`。[E: packages/core/agent-loop/src/tool-calls.ts:264] [E: packages/core/agent-loop/src/tool-calls.ts:282] abort 给未 start 的 call 补合成错误结果（`TOOL_ABORTED_BEFORE_DISPATCH`），已 start 的 drain 后再返回。[E: packages/core/agent-loop/src/tool-calls.ts:257] v4 里 `tool/result` 进 `deriveMessages()` 是 first-class `role: 'tool'`。[E: packages/core/session/src/types.ts:89]

### 6. runtime-context 与 system prompt 投影

25. `RuntimeContextProjection` 在构造时从 surface 上可见的、`source.kind === 'runtime-context'` 的 `user/message` 恢复 retained 快照。[E: packages/core/agent-loop/src/runtime-context.ts:19] [E: packages/core/agent-loop/src/runtime-context.ts:123] 之后若 `isReplacementSurfaceEvent` 的 `sourceEventSeqs` 含 retained seq，retained 置 `null`。[E: packages/core/agent-loop/src/runtime-context.ts:139] [E: packages/core/agent-loop/src/runtime-context.ts:141]
26. `project(current, sections)`：文本与 retained 相同则返回 `undefined`（不追加）；不同则 `createUserMessage`，`source.kind === 'runtime-context'`。空当前值写成固定 CLEARED 句（`Current runtime context: none. …`），而不是偷偷塞进 adapter。[E: packages/core/agent-loop/src/runtime-context.ts:20] [E: packages/core/agent-loop/src/runtime-context.ts:152] 默认 `agent/pre-step` 的 `next()` 在 claimed 之后接上这条 message。[E: packages/core/agent-loop/src/agent.ts:280]
27. `SystemPromptProjection.project` 决定本拍要不要写 / 替换 `system/message`。system 文本走这条 surface，**不**再出现在 `request/header` 的 `system` 字段。若 adapter 报告 `systemPromptUpdate: 'in-history'`，后续快照追加而不是改写头节点。[E: packages/core/agent-loop/src/runtime-context.ts:88] [E: packages/core/agent-loop/src/agent.ts:394] [E: packages/core/agent-loop/src/invariant.ts:47]

## 设计动机

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），不是「又一个写死工具表的 coding agent」。loop 可替换：消费方（Web session-controller、headless runner、SDK/ACP 宿主、子代理）只依赖 `ctx.agents`，不 import `ReactLoopAgent`。新行为优先挂 `agent/pre-step` / `agent/request` / `agent/request-error` / `agent/turn-stopping`，而不是 fork 一份 loop。

`agents: []` 把「造哪个 Agent」留给 host 入口。Web 按会话挂 preset（tools / persona / isolate 在 `Agent.ctx`；四个 shipped 名 `minimal` / `standard` / `ptc` / `cordis`）；headless / sdk / acp 叠 base 时无 web roster，工具留在 host 全局层。`sdk-minimal` 不叠 `dsh-base`，自己的 patch 另挂工厂行。

`model-visible ⟺ logged` 是硬边界：`agent/request` 改不了对话；runtime-context 变化也必须变成一条可折叠的 `user/message`；system prompt 必须先成为 `system/message`。compaction 若改历史，只能 `surfaceOp: replace`（没有 delete）。checkpoint 卡在 adapter 看到流之前、以及 top-level tool body 产生副作用之前，细节在 [`subsys.persistence.checkpoint`](../persistence/checkpoint.md)。

停止条件是数据：无 tool-call → `completed`；`concludesTurn` → 本 step 完成但仍抽干 next-step；`agent/turn-stopping` 是 serial 检查点，谁先谁后不改变「inbox 空不空」。

## Gotcha

- **工厂槽全局一个。** 两个 loop 插件同时挂会在第二个 `setFactory` 炸。换驱动必须先 patch 掉 `agent-loop` 行。
- **`maintenance` 看起来像 idle。** `runMaintenance` 必须从真 `idle` 同步抢相位，否则抛 `already has active work`；对外 `status` 仍是 `idle`，waking 输入只能 latch，等 `finally` 再看 `wakeRequested && inbox.hasPending`。[E: packages/core/agent-loop/src/agent.ts:183] [E: packages/core/agent-loop/src/agent.ts:200]
- **`reject` 吃掉已 claim 的那批。** 不回队列、不上 surface。`reject` **之后**才 `inject` / `steer` 的消息仍留在 next-step，下次 wakeup 还能用。
- **`max-tokens` 粘性只在本 turn。** 不执行工具；下一 turn 从干净的 `completed` 重新计。[E: packages/core/agent-loop/tests/loop.spec.ts:1311]
- **`agent/request` 的 seed 是 frozen。** 要换 model 必须 `return { ...await next(), model }`；就地赋值抛 `TypeError`。[E: packages/core/agent-loop/tests/loop.spec.ts:1173] [E: packages/core/agent-loop/tests/loop.spec.ts:1174] 本实例第一次落 `request/header` 时 `reason` 是 `baseline === undefined ? 'initial' : 'resume'`；已经记过锚点、且 header 相对 baseline 变化时才再记 `reason: 'change'`。[E: packages/core/agent-loop/src/agent.ts:605] [E: packages/core/agent-loop/src/agent.ts:612]
- **waterfall 忘了 `next()` = 否决默认。** `agent/request-error` 忘了 `next()` 又没返回 `retry`，失败就是终结。`llm/stream` 上的 invariant 检查通过后若不 `next()`，adapter 永远看不到请求。
- **preset 泄漏 host 服务。** `leakedServices` 比较的是 root isolate 符号。需要每会话私有实例的行必须 `isolate`；`AgentLoop` / `ctx.agents` / `ctx.sessions` 留在 host。
- **声明式 `agents[]` 不是 live Settings。** 改存储里的 `agents` 不会在热路径重造 Agent；并行上限是 volatile getter。
- **base 没有 dormant Codex/Claude 后端。** 不要把「preset 里 `tool-subagent-codex` 行 `disabled: true`」读成「base 已经装了但休眠」。loop 也不负责拉那些 backend。
- **inbox 实现在本包。** 不要再写 `packages/core/agent/src/inbox.ts`。投影由 `AgentLoop` 构造登记。队列权威仍在 inbox 页。
- **没有 `ctx.agent` DX accessor。** 分层用 `scopeOf(ctx)`。
- **runtime-context 的 source 不是 plugin `@deepseek-ai/dsh-system-prompt`。** 现为 `kind: 'runtime-context'`。[E: packages/core/agent-loop/src/runtime-context.ts:19]

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-agent`：`Agent` / `AgentFactory` / `Inbox` 合同 / `agent/*` 事件（含 waterfall / serial 签名） | `ctx.agents`（`dsh-base` 行 `id: agent`）[E: packages/bundle/base/cordis.patch.yml:74] |
| **Provider** | `@deepseek-ai/dsh-agent-loop`：`AgentLoop` 占工厂槽，`ReactLoopAgent` / `ReactLoopInbox` 实现合同；invariant companion 挂 `llm/stream` | `ctx.agentLoop`（`dsh-base` 行 `id: agent-loop`，`agents: []`）[E: packages/bundle/base/cordis.patch.yml:510] |
| **Consumer** | Web `session-controller` / headless runner / SDK·ACP 宿主 / 子代理：只调 `ctx.agents.create`·`followup`/`steer`；preset `setup` 往 `Agent.ctx` 挂 tools / persona；compaction 等挂 `agent/pre-step` | host 入口消费工厂；agent-preset 面消费 `Agent.ctx`，不替换 `ctx.agentLoop` [E: packages/api/session-controller/src/agent.ts:486] |

换 Provider = 换一个 `AgentFactory` 插件 + patch 掉 `agent-loop` 行。Definition 不动，Consumer 不用改 import。

## Sources

- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/inbox.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/src/runtime-context.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-loop/src/invariant.ts
- packages/core/agent-loop/src/constants.ts
- packages/core/agent-loop/tests/loop.spec.ts
- packages/core/agent-loop/tests/interception.spec.ts
- packages/core/agent-loop/tests/tool-calls.spec.ts
- packages/core/agent-loop/tests/scope-lifecycle.spec.ts
- packages/core/agent-loop/tests/request-reconstruction.spec.ts
- packages/core/agent-loop/tests/invariant.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/headless/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/core/agent/src/index.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/types.ts
- packages/core/scope/src/index.ts
- packages/core/system-prompt/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/llm/llm/src/call-config.ts
- packages/api/session-controller/src/agent.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.turn-and-step`](../../spine/turn-and-step.md) — turn / step 端到端时序与 inbox 三入口。
- [`subsys.core.agent`](agent.md) — `Agent` 合同、`ctx.agents`、`setFactory` 槽。
- [`subsys.core.agent-inbox`](agent-inbox.md) — `Inbox.followup` / `steer` / `inject` 队列与 claim；本包实现 `ReactLoopInbox`。
- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图，host / preset 两面。
- [`spine.session-log`](../../spine/session-log.md) — append-only log 与 `deriveMessages()`。
- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `post-execute`。
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → preset` 叠层。
- [`subsys.core.session`](session.md) — `Session` / `SessionStore` / `SurfaceOp`；`SESSION_FORMAT_VERSION = 4`。
- [`subsys.core.system-prompt`](system-prompt.md) — `assemble` waterfall 与 persona section。
- [`subsys.core.tools`](tools.md) — host 面工具注册表与执行管线。
- [`subsys.core.invariants`](invariants.md) — `ctx.invariants` 注册与过滤；loop companion 是其中一个 Consumer。
- [`subsys.core.scope`](scope.md) — `createScope` / `bindScopeParent`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 行表，含 `agent-loop` `agents: []`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — host UI 层：`id: webserver`，不是 base 的 `id: web`。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `mountPreset` / `leakedServices` / isolate。
- [`subsys.persistence.checkpoint`](../persistence/checkpoint.md) — adapter 前与 top-level tool body 前的 flush。
- [`subsys.host.apiproxy`](../host/apiproxy.md) — Host HTTP API（session / settings / workspace controller）；Web 在请求时 `ctx.agents.create`。
