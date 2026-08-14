---
id: subsys.core.agent-loop
title: 默认 agent-loop 驱动
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent-loop/src/agent.ts
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
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/inbox.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/types.ts
  - packages/core/scope/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/session/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/llm/llm/src/call-config.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.agentLoop
  - AgentLoop
  - ReactLoopAgent
  - executeToolCalls
  - RuntimeContextProjection
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
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-agent-loop` 是 **host 面**默认 `AgentFactory`：构造时把自己塞进 `ctx.agents` 的全局工厂槽，`prepare` 里 `new ReactLoopAgent`，再按 inbox 驱动 turn / step。它是可替换的 Cordis 插件，不是写死的 coding-agent 主循环。

## 能回答的问题

- 换 loop 要改哪一行组合、占哪一个工厂槽？`dsh-agent` 合同还在不在？
- `dsh-base` 的 `agent-loop` 行为什么是 `agents: []`？Web / headless 各自谁在运行时 `create`？
- `ReactLoopAgent.turn` / `step` 的编号路径：claim → assemble → `agent/pre-step` → `deriveMessages` → `agent/request` → stream → tools → `agent/turn-stopping`，waterfall 不调用 `next()` 会怎样？
- 内部 `Phase` `idle` / `maintenance` / `running` 对外怎么折叠？`reject`、`max-tokens`、空 claim 各以什么 reason 收 turn？
- `maxParallelToolCalls` 卡在哪一层？`RuntimeContextProjection` 怎样把动态上下文变成可重建的 `user/message`？
- `model-visible ⟺ logged` 的 companion 挂在哪条 `llm/stream` 上？preset 行若把 `agentLoop` 发进 root realm，`leakedServices` 会不会拒？

## 职责边界

本包拥有默认驱动，不拥有合同。`dsh-agent`（[`subsys.core.agent`](agent.md)）只提供 `Agent` / `Inbox` / `ctx.agents` / `agent/*` 事件和**一个** `setFactory` 槽；没有工厂时 `create` / `resume` 抛 `no agent factory registered (load an agent-loop plugin)`。[E: packages/core/agent/src/index.ts:217] [E: packages/core/agent/src/index.ts:392] 第二次 `setFactory` 抛 `an agent factory is already registered`。[E: packages/core/agent/src/index.ts:374] `AgentLoop` 在构造里用可逆 `ctx.effect` 把自己登记进去，卸掉这一行就清空槽。[E: packages/core/agent-loop/src/index.ts:350]

本包**不**拥有：inbox 两条队列的 splice / claim 语义（[`subsys.core.agent-inbox`](agent-inbox.md)）；append-only `SessionEventMap` 与 `deriveMessages()`（[`subsys.core.session`](session.md) / [`spine.session-log`](../../spine/session-log.md)）；`ctx.tools` 注册表与 `tools/pre-execute` 管线（[`subsys.core.tools`](tools.md) / [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)）；`systemPrompt.assemble` 的 section 装配（[`subsys.core.system-prompt`](system-prompt.md)）；preset 发现与 `mountPreset`（[`subsys.composition.agent-presets`](../composition/agent-presets.md)）；adapter 前 / top-level tool body 前的 `sessions.flush`（[`subsys.persistence.checkpoint`](../persistence/checkpoint.md)）。端到端 turn 时序的权威走读在 [`spine.turn-and-step`](../../spine/turn-and-step.md)；本页补工厂、`agents[]`、回滚、并行上限、runtime-context 投影。

**host 面 vs agent-preset 面。** host 面是进程级：webserver / persistence / sandbox / subagent **backends** / 注册表。`AgentLoop` 是进程级 Service（`ctx.agentLoop`），坐在 `dsh-base` 的 `id: agent-loop`，同 bundle 还有 `session-persistence-jsonl` / `sandbox` / `subagent-spawn-in-process` / `subagent-fork-in-process`。[E: packages/core/agent-loop/src/index.ts:320] [E: packages/bundle/base/cordis.patch.yml:436] [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] webserver **不**在 base：它是 `dsh-web-app` 的 `id: webserver` / `@deepseek-ai/dsh-host-webserver`。[E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:116] base 的 `id: web` 是 `@deepseek-ai/dsh-web` 搜索服务，不是 HTTP 宿主。[E: packages/bundle/base/cordis.patch.yml:404] [E: packages/bundle/base/cordis.patch.yml:405] 每个 `ReactLoopAgent` 再 `createScope(loopCtx, this)` 铸一份 `Agent.ctx`，preset 的 tools / persona / isolate 挂在这份 scope 上，随 handle `dispose` 卸掉。[E: packages/core/agent-loop/src/agent.ts:94] [E: packages/core/scope/src/index.ts:137] 默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。`dsh-base` 当前**不** dormant 加载 Codex / Claude 子代理：`cordis.patch.yml` 里 `subagent-codex` / `subagent-claude-code` 行数为 0，manifest 也不依赖那两个包。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:40]

**`agents: []`。** base 行的启动配置是空列表：Web 不在进程级造 Agent，会话由 host 在请求时 `ctx.agents.create`。[E: packages/bundle/base/cordis.patch.yml:439] [E: packages/bundle/base/tests/base.spec.ts:34] `dsh-headless` 同样不靠这一数组：runner 在任务入口自己 `agents.create`，再 `followup` + `whenIdle`。[E: packages/bundle/headless/src/index.ts:111] [E: packages/bundle/headless/src/index.ts:122] 换 loop = 另写一个 `AgentFactory` 插件占同一槽，并在 bundle / profile patch 里替换 `id: agent-loop` 那一行，而不是改 `dsh-agent`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent-loop/src/index.ts` | `AgentLoop` Service / `AgentFactory`：`setFactory`、`prepare`、`create` / `createAgent` / `resume`、config `agents[]`、settings 并行上限 |
| `packages/core/agent-loop/src/agent.ts` | `ReactLoopAgent`：Phase、inbox 三入口、`turn` / `step` / `buildRequest` |
| `packages/core/agent-loop/src/tool-calls.ts` | `executeToolCalls`：exclusive 屏障 + 有界并行池；`tool/call` / `tool/result` |
| `packages/core/agent-loop/src/runtime-context.ts` | `RuntimeContextProjection`：把变化的 runtime-context 投影成 plugin `UserMessage` |
| `packages/core/agent-loop/src/invariant.ts` | companion：在 `llm/stream` 上核 `model-visible ⟺ logged` |
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
| `ctx.agentLoop` | `AgentLoop` Service 名 | host 面默认工厂；`static inject = ['agents', 'sessions', 'llm', 'tools', 'systemPrompt']` [E: packages/core/agent-loop/src/index.ts:297] |
| `Config.agents` | boot 一次消费 | 插件启动时 create / resume 的声明式条目。`AgentLoopSettings` 只有 `maxParallelToolCalls`；`agents` 不进 Settings。[E: packages/core/agent-loop/src/index.ts:244] [E: packages/core/agent-loop/src/index.ts:262] |
| `AgentLoopSettings.maxParallelToolCalls` | Settings 命名空间 `agent-loop` | 用户可改的并行上限。命名空间键是 `settingsNamespace('agent-loop')`；schema 默认 10；非法值在 `validate` 被拒，调度器保持上一档好值。[E: packages/core/agent-loop/src/index.ts:237] [E: packages/core/agent-loop/src/index.ts:251] [E: packages/core/agent-loop/src/index.ts:339] [E: packages/core/agent-loop/src/constants.ts:6] |
| 内部 `Phase` | `idle` / `maintenance` / `running` | driver 私有三态。[E: packages/core/agent-loop/src/agent.ts:38] [E: packages/core/agent-loop/src/agent.ts:41] [E: packages/core/agent-loop/src/agent.ts:46] |
| 公开 `AgentStatus` | `'idle' \| 'running'` | `maintenance` 对外仍报 `idle`。[E: packages/core/agent/src/runtime-types.ts:50] [E: packages/core/agent-loop/src/agent.ts:100] |
| `PreparedStep` | `reject` 或 `enter` + `PromptAssembly` | `preStep` 的内部结果；`reject` 不带 assembly。[E: packages/core/agent-loop/src/agent.ts:50] |
| `PreStepDecision` | `dsh-agent` | waterfall 返回值：`reject` 或 `enter` + `messages`。[E: packages/core/agent/src/runtime-types.ts:53] |
| `RequestErrorAction` | `{ kind: 'retry' } \| undefined` | 默认 `undefined` 表示失败终结，不重试。[E: packages/core/agent/src/runtime-types.ts:58] |
| `InboxTarget` | `'next-turn' \| 'next-step'` | `followup` → next-turn + wake；`steer` → next-step + wake；`inject` → next-step、不 wake。[E: packages/core/agent/src/types.ts:10] [E: packages/core/agent-loop/src/agent.ts:122] |

`sessionId` 与 `resumeSessionId` 互斥；两条声明式条目不得共用同一 exact identity。[E: packages/core/agent-loop/src/index.ts:283] launcher 可在 Loader 挂行之前 `provide('configuredAgentIdentities', …)`，整键替换身份，避免 overlay 改 model 时把 identity 冲掉。[E: packages/core/agent-loop/src/index.ts:211]

## 控制流

### 1. 工厂占槽（host 面）

1. `dsh-base` 插入 `id: agent-loop` / `name: '@deepseek-ai/dsh-agent-loop'`，`config.agents: []`。[E: packages/bundle/base/cordis.patch.yml:436] [E: packages/bundle/base/cordis.patch.yml:437] [E: packages/bundle/base/cordis.patch.yml:439]
2. `AgentLoop` 构造：`super(ctx, 'agentLoop')`，解析并行上限，装 Settings section，校验声明式 agents，再登记两个 effect：`ownership.dispose` 与 `ctx.agents.setFactory(this)`。[E: packages/core/agent-loop/src/index.ts:320] [E: packages/core/agent-loop/src/index.ts:349] [E: packages/core/agent-loop/src/index.ts:350]
3. 同一次构造还注册三个 system-prompt 变量：`provider` / `model` / `cwd`，从当前 `Agent.options` 与 `session.header.cwd` 投影。[E: packages/core/agent-loop/src/index.ts:351]
4. `Config.agents` 非空时：无 `resumeSessionId` 走 `create`（可先 `restoreOrCreateConfigured`）；有则 `inject(['sessionPersistence'], …)` 后 `resumeWith`。base 的空数组让这一支成为 no-op。[E: packages/core/agent-loop/src/index.ts:355]

### 2. `prepare` → setup → publish，失败整笔回滚

5. `prepare@packages/core/agent-loop/src/index.ts` 在任何资源出现之前把 caller abort、owner fiber unload、factory teardown 熔进一个 `AbortController`，并把 memoized `dispose` 登记到 `FactoryOwnership` 与 owner `ctx.effect`。[E: packages/core/agent-loop/src/index.ts:479] [E: packages/core/agent-loop/src/index.ts:521]
6. 熔断装好之后才 `new ReactLoopAgent(loopCtx, id, options, session)`。[E: packages/core/agent-loop/src/index.ts:549] 构造先 `new Inbox(session, …)`（`Inbox` 从 `session.events.slice(header.seedLength ?? 0)` 重放 `agent/inbox/spliced`），再 `createScope` + `extend({ agent: this })`。[E: packages/core/agent-loop/src/agent.ts:87] [E: packages/core/agent/src/inbox.ts:32] [E: packages/core/agent-loop/src/agent.ts:94] [E: packages/core/agent-loop/src/agent.ts:95]
7. `createAgent` / `resume` 走 `setupAndPublish`：`await setup?(prepared.agent.ctx)`，可选 `setupCommit.commit()`，然后 `publish`（`sessions.enter` → `agents.enter` → `announce` → `agent/session-start`）。setup / commit / abort 任一失败：`await prepared.dispose()`，两个 registry 都不留下 id。[E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:640] [E: packages/core/agent-loop/src/index.ts:642] owner 在 setup 中途 unload 抛 `owner disposed during setup`，`session/created` 与 `agent/created` 都不会发出。[E: packages/core/agent-loop/tests/scope-lifecycle.spec.ts:390] [E: packages/core/agent-loop/tests/scope-lifecycle.spec.ts:391]
8. 同步捷径 `AgentLoop.create` 跳过 `setup`，`publish('startup')`；publish 抛错同样 `dispose`。[E: packages/core/agent-loop/src/index.ts:593] `resume` 缺 `sessionPersistence` 直接抛，不造半拉 Agent。[E: packages/core/agent-loop/src/index.ts:656]
9. Web 的 `AgentPresets.mount` 发生在工厂 `setup`（失败则整次 create 回滚）。preset 行若把 service publish 进 **root realm**，`leakedServices@packages/preset/agent-presets/src/mount.ts` 收集那些名字并抛：必须 `isolate: { …: true }` 或把服务搬到 host。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365] `AgentLoop` 本身是 host 根上的 Provider，不该出现在 preset 行里；`createScope` 给的是 agent 注册边界，不是 Cordis `isolate` realm。

### 3. Waterfall 必须 `next()`

Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，内建行为也不会跑。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] `agentEvents.waterfall` 把这条语义接到 agent-scoped carrier 上。[E: packages/core/agent/src/dispatch.ts:143]

| 事件 | 模式 | 默认 `next()` | 不调用 `next()` |
|---|---|---|---|
| `agent/pre-step` | waterfall | `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }` [E: packages/core/agent-loop/src/agent.ts:236] | 监听者自己返回 `enter` / `reject`；默认 enter 被否决 [E: packages/core/agent/src/runtime-types.ts:231] |
| `system-prompt/assemble` | waterfall | 当前装配对象 [E: packages/core/system-prompt/src/index.ts:532] | 后续 listener 与默认装配都看不到本层之后的变换 |
| `agent/request` | waterfall | 冻结的 `LlmCallConfig` 种子 [E: packages/core/agent-loop/src/agent.ts:438] | 必须自己返回完整 config；**改不了** `messages` [E: packages/core/agent/src/runtime-types.ts:244] |
| `agent/request-error` | waterfall | `undefined`（不重试）[E: packages/core/agent-loop/src/agent.ts:364] | 返回 `{ kind: 'retry' }` 即本步再打一枪 [E: packages/core/agent-loop/src/agent.ts:367] |
| `llm/stream`（invariant） | waterfall，`prepend` | 放行下游 adapter | 检查失败 `fail(...)`；成功也必须 `return next()` 否则 adapter 收不到流 [E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:53] |
| `tools/pre-execute` / `tools/execute` / `tools/post-execute` | waterfall | allow / 跑 body / 接受 result | 否决整条 tools 管线 [E: packages/core/tools/src/index.ts:152] |
| `agent/turn-stopping` | **serial**（不是 waterfall） | 每个 listener 都会跑 | 无 `next`；续不续只看 inbox 是否又出现 next-step [E: packages/core/agent/src/runtime-types.ts:278] [E: vendor/cordis/src/events.ts:204] |

`agent/pre-step` 测试把「默认经由 `next()`」钉死：listener `return next()` 后 log 里的 `user/message` 仍是原文。[E: packages/core/agent-loop/tests/interception.spec.ts:70] 监听者也可以不调用 `next()`、直接 `{ kind: 'reject' }`。[E: packages/core/agent-loop/tests/interception.spec.ts:239]

### 4. `ReactLoopAgent.turn` / `step`

10. `followup` / `steer` / `inject` 都进 `send` → `Inbox.splice`；仅 waking 入口在 `phase === idle` 时 `wakeDriver`：同步切到 `running`，再 `withInitiator(this, () => this.kick())`。[E: packages/core/agent-loop/src/agent.ts:122] [E: packages/core/agent-loop/src/agent.ts:126] [E: packages/core/agent-loop/src/agent.ts:130] [E: packages/core/agent-loop/src/agent.ts:186] idle `inject` 只留下 `agent/inbox/spliced`，`status` 仍是 `idle`，不开 `turn/start`。[E: packages/core/agent-loop/tests/loop.spec.ts:645] [E: packages/core/agent-loop/tests/loop.spec.ts:648] 已 abort 的活动上，waking 投递会在 splice 之前把 target 改成 `next-turn`。[E: packages/core/agent-loop/src/agent.ts:116]
11. `kick`：`while (await this.turn()) {}`；`finally` 若仍是 `running` 收回 `idle`。[E: packages/core/agent-loop/src/agent.ts:212]
12. `turn` 先 `session.append('turn/start', { turn })`。简单一路的耐久边界是 `turn/start → step/start → step/end → turn/end`。[E: packages/core/agent-loop/src/agent.ts:255] [E: packages/core/agent-loop/tests/loop.spec.ts:180]
13. 每个拟议 step：`Inbox.claim(target, turn)` 抽走**全部** next-step，若 `target === 'next-turn'` 再抽**一条** next-turn。[E: packages/core/agent/src/inbox.ts:71] 首拍 `target = 'next-turn'`，后续改 `'next-step'`。[E: packages/core/agent-loop/src/agent.ts:261] [E: packages/core/agent-loop/src/agent.ts:300]
14. claim 之后立刻 `systemPrompt.assemble(assembleContextFor(this, signal))`（`agent` 与 `scope` 绑在一起，避免漏掉 scoped 贡献），再用 `RuntimeContextProjection.project` 决定要不要追加一条 plugin 源的 runtime-context `UserMessage`，然后 `agent/pre-step` waterfall。[E: packages/core/agent-loop/src/agent.ts:229] [E: packages/core/agent/src/dispatch.ts:174] [E: packages/core/agent-loop/src/agent.ts:233] [E: packages/core/agent-loop/src/agent.ts:234]
15. `reject` → `turnEnds = { kind: 'blocked' }`，不写 `step/start`，已 claim 的消息不回队列、不上 `user/message`。测试：模型 0 次调用，log 只有 `turn/start` / `turn/end`，reason 为 `{ kind: 'blocked' }`。[E: packages/core/agent-loop/src/agent.ts:267] [E: packages/core/agent-loop/tests/interception.spec.ts:248] [E: packages/core/agent-loop/tests/interception.spec.ts:254] 首拍 `enter` 但 `messages.length === 0`：记 `completed`，0 个 step、0 次模型调用。[E: packages/core/agent-loop/src/agent.ts:274] 后续 step 允许空 `messages`（工具续跑那一拍 `messages: 0` 仍开 step）。[E: packages/core/agent-loop/tests/interception.spec.ts:103]
16. 进入 step：`append('step/start')`，再对 `decision.messages` 逐条 `append('user/message', …, { surfaceOp: 'append' })`。这是 inbox 内容第一次变成模型可见历史。[E: packages/core/agent-loop/src/agent.ts:279] [E: packages/core/agent-loop/src/agent.ts:283]
17. `step` 用 `session.deriveMessages()` 当 `boundaryMessages`，与 `renderPrompt(assembly)`、装配好的 tools 一起交给 `buildRequest`。[E: packages/core/agent-loop/src/agent.ts:337] [E: packages/core/agent-loop/src/agent.ts:341] [E: packages/core/session/src/index.ts:726] `agent/request` 只能换 `LlmCallConfig`；冻结请求在 waterfall **之后**才填 `messages: boundaryMessages`。[E: packages/core/agent-loop/src/agent.ts:486] [E: packages/core/agent-loop/src/agent.ts:488] 测试用 log 前缀重建一份新 `Session`，`request.messages` 与 `rebuilt.deriveMessages()` byte-equal。[E: packages/core/agent-loop/tests/request-reconstruction.spec.ts:600]
18. `markAgentLoopRequest(deepFreeze({…}))` 给这份对象打进程内标记；companion 只检查被标记的请求。[E: packages/core/agent-loop/src/agent.ts:486] [E: packages/llm/llm/src/call-config.ts:66] invariant 要求 `options.messages` 的 JSON 等于 `session.deriveMessages()`，否则 `fail('… log-reconstruction desync')`。[E: packages/core/agent-loop/src/invariant.ts:39] [E: packages/core/agent-loop/src/invariant.ts:41] 测试把未入 log 的 extra message 插进数组，命中同一句。[E: packages/core/agent-loop/tests/invariant.spec.ts:64]
19. 流：`preparedCall?.stream(request) ?? ctx.llm.stream(request)`；每个 chunk 先 `assistant/chunk`（log-only），收束后 `assistant/message`（`surfaceOp: 'append'`）。[E: packages/core/agent-loop/src/agent.ts:345] [E: packages/core/agent-loop/src/agent.ts:349] [E: packages/core/agent-loop/src/agent.ts:381] `finish.kind === 'max-tokens'` **立刻**返回，不跑 `executeToolCalls`；该 reason 在后续 step 里粘性，后来的 `completed` 不能降级。[E: packages/core/agent-loop/src/agent.ts:391] [E: packages/core/agent-loop/src/agent.ts:290] 测试：截断的 tool-call 不 dispatch，`executions === 0`；跨 step 续跑后 `turn/end` 仍是 `{ kind: 'max-tokens' }`。[E: packages/core/agent-loop/tests/loop.spec.ts:1082] [E: packages/core/agent-loop/tests/loop.spec.ts:1033]
20. 有 `tool-call` → `executeToolCalls`；结果 context 经 `inbox.splice('next-step', …)` 进下一拍，不直接改 derive 缓存。[E: packages/core/agent-loop/src/agent.ts:395] [E: packages/core/agent-loop/src/agent.ts:397] [E: packages/core/agent-loop/src/tool-calls.ts:59] `concluded === true`（`ToolExecutionResult.concludesTurn`）把本 step 标 `completed`，但已提交的 next-step 仍要抽干。[E: packages/core/agent-loop/src/agent.ts:399]
21. `step/end` 之后：若已有 `turnEnds` 且 `inbox.nextStep` 空，先 `serial('agent/turn-stopping')` 再读一次 inbox。listener `steer` 就能再开 step。[E: packages/core/agent-loop/src/agent.ts:295] [E: packages/core/agent-loop/src/agent.ts:296] `finally` 必写 `turn/end`。[E: packages/core/agent-loop/src/agent.ts:319] 同一次 `kick` 若还有下一条 `followup`，换新 `AbortController`、`step = 0` 并 `return true`，不回 `idle`。[E: packages/core/agent-loop/src/agent.ts:325]

### 5. 并行工具上限

22. `executeToolCalls` 按 `ctx.tools.executionMode` 切组：非 `parallel` 一次一个（exclusive 屏障）；`parallel` 把剩余 calls 送进滚动池。[E: packages/core/agent-loop/src/tool-calls.ts:88] 池宽读 `ctx.agentLoop.config.maxParallelToolCalls`（Settings getter，下一组生效）。[E: packages/core/agent-loop/src/tool-calls.ts:131] `fillPool` 条件是 `inFlight.size < maxParallelToolCalls`。[E: packages/core/agent-loop/src/tool-calls.ts:199]
23. 直接 `new AgentLoop(..., { maxParallelToolCalls: 0 })` 抛 `maxParallelToolCalls must be a positive integer`。[E: packages/core/agent-loop/tests/tool-calls.spec.ts:271] 省略时等于 `DEFAULT_MAX_PARALLEL_TOOL_CALLS`（10）。[E: packages/core/agent-loop/src/constants.ts:6] [E: packages/core/agent-loop/tests/tool-calls.spec.ts:286] `1` 完全串行：第二个 call 在第一个 settle 之前不得 start。[E: packages/core/agent-loop/tests/tool-calls.spec.ts:322]
24. 每个 start 先 `append('tool/call', { callId, name, arguments })`（`arguments` 是模型原文 JSON 字符串），结算再 `append('tool/result', …, { surfaceOp: 'append', sourceEventSeqs: [callSeq] })`。[E: packages/core/agent-loop/src/tool-calls.ts:263] [E: packages/core/agent-loop/src/tool-calls.ts:281] abort 给未 start 的 call 补合成错误结果（`TOOL_ABORTED_BEFORE_DISPATCH`），已 start 的 drain 后再返回。[E: packages/core/agent-loop/src/tool-calls.ts:240] [E: packages/core/agent-loop/src/tool-calls.ts:256]

### 6. runtime-context 投影

25. `RuntimeContextProjection` 在构造时从 surface 上可见的、`source.plugin === '@deepseek-ai/dsh-system-prompt'` 的 `user/message` 恢复 retained 快照。[E: packages/core/agent-loop/src/runtime-context.ts:12] [E: packages/core/agent-loop/src/runtime-context.ts:40] 之后若 `isReplacementSurfaceEvent` 的 `sourceEventSeqs` 含 retained seq，retained 置 `null`。[E: packages/core/agent-loop/src/runtime-context.ts:51] [E: packages/core/agent-loop/src/runtime-context.ts:53]
26. `project(current, sections)`：文本与 retained 相同则返回 `undefined`（不追加）；不同则 `createUserMessage`，`source.kind === 'plugin'`。空当前值写成固定 CLEARED 句，而不是偷偷塞进 adapter。[E: packages/core/agent-loop/src/runtime-context.ts:64] [E: packages/core/agent-loop/src/runtime-context.ts:68] 默认 `agent/pre-step` 的 `next()` 在 claimed 之后接上这条 message。[E: packages/core/agent-loop/src/agent.ts:238]

## 设计动机

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），不是「又一个写死工具表的 coding agent」。loop 可替换：消费方（Web `apiproxy`、headless runner、子代理）只依赖 `ctx.agents`，不 import `ReactLoopAgent`。新行为优先挂 `agent/pre-step` / `agent/request` / `agent/request-error` / `agent/turn-stopping`，而不是 fork 一份 loop。

`agents: []` 把「造哪个 Agent」留给 host 入口。Web 按会话挂 preset（tools / persona / isolate 在 `Agent.ctx`）；headless 无 roster，工具留在 host 全局层，一次任务一个进程。两种产品路径共用同一条默认工厂。

`model-visible ⟺ logged` 是硬边界：`agent/request` 改不了对话；runtime-context 变化也必须变成一条可折叠的 `user/message`。compaction 若改历史，只能 `surfaceOp: replace`（没有 delete）。checkpoint 卡在 adapter 看到流之前、以及 top-level tool body 产生副作用之前，细节在 [`subsys.persistence.checkpoint`](../persistence/checkpoint.md)。

停止条件是数据：无 tool-call → `completed`；`concludesTurn` → 本 step 完成但仍抽干 next-step；`agent/turn-stopping` 是 serial 检查点，谁先谁后不改变「inbox 空不空」。

## Gotcha

- **工厂槽全局一个。** 两个 loop 插件同时挂会在第二个 `setFactory` 炸。换驱动必须先 patch 掉 `agent-loop` 行。
- **`maintenance` 看起来像 idle。** `runMaintenance` 必须从真 `idle` 同步抢相位，否则抛 `already has active work`；对外 `status` 仍是 `idle`，waking 输入只能 latch，等 `finally` 再看 `wakeRequested && inbox.hasPending`。[E: packages/core/agent-loop/src/agent.ts:143] [E: packages/core/agent-loop/src/agent.ts:158]
- **`reject` 吃掉已 claim 的那批。** 不回队列、不上 surface。`reject` **之后**才 `inject` / `steer` 的消息仍留在 next-step，下次 wakeup 还能用。[E: packages/core/agent-loop/tests/interception.spec.ts:340]
- **`max-tokens` 粘性只在本 turn。** 不执行工具；下一 turn 从干净的 `completed` 重新计。[E: packages/core/agent-loop/tests/loop.spec.ts:1051]
- **`agent/request` 的 seed 是 frozen。** 要换 model 必须 `return { ...await next(), model }`；就地赋值抛 `TypeError`。[E: packages/core/agent-loop/tests/loop.spec.ts:853] [E: packages/core/agent-loop/tests/loop.spec.ts:854] 本实例第一次落 `request/header` 时 `reason` 是 `baseline === undefined ? 'initial' : 'resume'`；已经记过锚点、且 header 相对 baseline 变化时才再记 `reason: 'change'`。[E: packages/core/agent-loop/src/agent.ts:465] [E: packages/core/agent-loop/src/agent.ts:466] [E: packages/core/agent-loop/src/agent.ts:469] 换模型测试是第一次 `send`：它断言 header 记下了新 model，不断言 `reason`。[E: packages/core/agent-loop/tests/loop.spec.ts:858] [E: packages/core/agent-loop/tests/loop.spec.ts:864]
- **waterfall 忘了 `next()` = 否决默认。** `agent/request-error` 忘了 `next()` 又没返回 `retry`，失败就是终结。`llm/stream` 上的 invariant 检查通过后若不 `next()`，adapter 永远看不到请求。
- **preset 泄漏 host 服务。** `leakedServices` 比较的是 root isolate 符号。需要每会话私有实例的行必须 `isolate`；`AgentLoop` / `ctx.agents` / `ctx.sessions` 留在 host。
- **声明式 `agents[]` 不是 Settings。** 改存储里的 `agents` 不会在热路径重造 Agent；并行上限才会 live 读。
- **base 没有 dormant Codex/Claude 后端。** 不要把「preset 里 `tool-subagent-codex` 行 `disabled: true`」读成「base 已经装了但休眠」。loop 也不负责拉那些 backend。

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-agent`：`Agent` / `AgentFactory` / `Inbox` / `agent/*` 事件（含 waterfall / serial 签名） | `ctx.agents`（`dsh-base` 行 `id: agent`）[E: packages/bundle/base/cordis.patch.yml:58] |
| **Provider** | `@deepseek-ai/dsh-agent-loop`：`AgentLoop` 占工厂槽，`ReactLoopAgent` 实现合同；invariant companion 挂 `llm/stream` | `ctx.agentLoop`（`dsh-base` 行 `id: agent-loop`，`agents: []`）[E: packages/bundle/base/cordis.patch.yml:436] |
| **Consumer** | Web `apiproxy` / headless runner / 子代理：只调 `ctx.agents.create`·`followup`/`steer`；preset `setup` 往 `Agent.ctx` 挂 tools / persona；compaction 等挂 `agent/pre-step` | host 入口消费工厂；agent-preset 面消费 `Agent.ctx`，不替换 `ctx.agentLoop` |

换 Provider = 换一个 `AgentFactory` 插件 + patch 掉 `agent-loop` 行。Definition 不动，Consumer 不用改 import。

## Sources

- packages/core/agent-loop/src/agent.ts
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
- packages/core/agent/src/index.ts
- packages/core/agent/src/inbox.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/types.ts
- packages/core/scope/src/index.ts
- packages/core/system-prompt/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/session/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/llm/llm/src/call-config.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.turn-and-step`](../../spine/turn-and-step.md) — turn / step 端到端时序与 inbox 三入口。
- [`subsys.core.agent`](agent.md) — `Agent` 合同、`ctx.agents`、`setFactory` 槽。
- [`subsys.core.agent-inbox`](agent-inbox.md) — `Inbox.followup` / `steer` / `inject` 队列与 claim。
- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图，host / preset 两面。
- [`spine.session-log`](../../spine/session-log.md) — append-only log 与 `deriveMessages()`。
- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `post-execute`。
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → preset` 叠层。
- [`subsys.core.session`](session.md) — `Session` / `SessionStore` / `SurfaceOp`。
- [`subsys.core.system-prompt`](system-prompt.md) — `assemble` waterfall 与 persona section。
- [`subsys.core.tools`](tools.md) — host 面工具注册表与执行管线。
- [`subsys.core.invariants`](invariants.md) — `ctx.invariants` 注册与过滤；loop companion 是其中一个 Consumer。
- [`subsys.core.scope`](scope.md) — `createScope` / `bindScopeParent`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 行表，含 `agent-loop` `agents: []`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — host UI 层：`id: webserver`，不是 base 的 `id: web`。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `mountPreset` / `leakedServices` / isolate。
- [`subsys.persistence.checkpoint`](../persistence/checkpoint.md) — adapter 前与 top-level tool body 前的 flush。
