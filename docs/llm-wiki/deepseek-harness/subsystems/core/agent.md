---
id: subsys.core.agent
title: Agent 合同与注册表
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/types.ts
  - packages/core/agent/src/inbox.ts
  - packages/core/agent/package.json
  - packages/core/agent/tests/agent.spec.ts
  - packages/core/agent/tests/agent-initiator.spec.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/headless/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - vendor/cordis/src/events.ts
symbols:
  - Agent
  - AgentRegistry
  - ctx.agents
  - setFactory
  - withInitiator
related:
  - spine.turn-and-step
  - subsys.core.agent-loop
  - subsys.core.agent-inbox
  - spine.overview
  - spine.session-log
  - subsys.composition.agent-presets
  - subsys.core.scope
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-agent` 是 **Agent 合同** 与进程级注册表：它导出 `Agent` / `AgentFactory` / `agent/*` 事件，并把 `AgentRegistry` 挂成 `ctx.agents`。它**不**实现 turn/step loop。默认 Provider 是 `dsh-base` 里那一行 `@deepseek-ai/dsh-agent-loop`；换 loop = 换插件占同一个 `setFactory` 槽，不是改这份合同。

## 能回答的问题

- `dsh-agent` 和 `dsh-agent-loop` 谁是合同、谁是默认驱动？`ctx.agents` 与 `ctx.agentLoop` 差在哪一层？
- `setFactory` 为什么进程里只能登记一次？没工厂时 `create` / `resume` 抛哪句？
- `setup` 在 `publish` 前组合什么？preset 行漏 `isolate` 时 `leakedServices` 怎样拒掉整次 create？
- `agent/pre-step` / `agent/request` / `agent/request-error` 为什么必须调用传入的 `next()`？不调用会停在哪一层？
- `withInitiator` 是授权还是进程内因果归因？公开 `AgentStatus` 为什么没有 `maintenance`？
- Web `apiproxy` 和 headless runner 各自怎样当 `ctx.agents.create` 的 Consumer？

## 职责边界

本包拥有：**host 面**的活体登记（`ctx.agents`）、全局唯一的 `AgentFactory` 槽、进程内 initiator 作用域、`agent/*` 事件词表、以及把 subject 与 `dsh-scope` carrier 焊死的 `agentEvents`。`Agent` 是 live handle：`id` 与 `Session.id` 同一条身份，inbox / `send` / `followup` / `steer` / `inject` / `cancel` / `whenIdle` / `runMaintenance` 写在合同上。

本包**不**拥有：

- turn/step 驱动、内部 `Phase`、`agents: []` 启动列表 — [`subsys.core.agent-loop`](./agent-loop.md)
- `followup` → `next-turn`、`steer`/`inject` → `next-step` 的队列与 `claim` 语义 — [`subsys.core.agent-inbox`](./agent-inbox.md)
- append-only log 与 `deriveMessages()` — [`subsys.core.session`](./session.md) / [`spine.session-log`](../../spine/session-log.md)
- `createScope` / `bindScopeParent` 原语 — [`subsys.core.scope`](./scope.md)
- standing preset、`leakedServices` 实现 — [`subsys.composition.agent-presets`](../composition/agent-presets.md)（本页只写它如何挂进 `setup`）
- 默认模型选择 — [`subsys.core.agent-default-model`](./agent-default-model.md)

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个写死主循环的 coding agent」。`dsh-agent` 是 host 面缝；每会话的 tools / persona / isolate 在 factory `setup` 里 join 到 `Agent.ctx`，随 handle 卸载。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent/package.json` | 包名 `@deepseek-ai/dsh-agent` |
| `packages/core/agent/src/index.ts` | `AgentRegistry`：`ctx.agents`、`setFactory`、`create`/`resume` 委托、`enter`/`announce`/`register`、initiator ALS |
| `packages/core/agent/src/runtime-types.ts` | `Agent` / `AgentStatus` / `AgentOptions`；`agent/*` 事件（emit / waterfall / serial） |
| `packages/core/agent/src/types.ts` | `InboxTarget`；往 `SessionEventMap` 扩 `agent/inbox/spliced` |
| `packages/core/agent/src/dispatch.ts` | `agentEvents` / `assembleContextFor`：payload.`agent` 由 dispatcher 注入 |
| `packages/core/agent/src/inbox.ts` | `Inbox` 投影类（队列权威在 inbox 页） |
| `packages/core/agent/tests/agent.spec.ts` | 工厂槽、enter/announce、created 同步否决 |
| `packages/core/agent/tests/agent-initiator.spec.ts` | `withInitiator` / `requireInitiator` / dispose drain |
| `packages/core/agent-loop/src/index.ts` | 默认 `AgentFactory`：`setFactory(this)`、`setupAndPublish` |
| `packages/core/agent-loop/src/agent.ts` | `ReactLoopAgent implements Agent`；waterfall 的 innermost `next` |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: agent` 与 `id: agent-loop`（`agents: []`） |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices` / `mountPreset` 拒 root-realm 泄漏 |
| `vendor/cordis/src/events.ts` | waterfall：不调用 `next()` 就不会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AgentStatus` | 公开只有 `'idle' \| 'running'`。disposal 从注册表摘掉，不是第三态。 |
| `Agent` | live handle：`id` / `options` / `session` / `inbox` / `status` / `ctx` + 投递与取消方法。 |
| `AgentOptions` | `provider` / `model` / `maxTokens`。persona 不在这里，走 system-prompt section。 |
| `AgentFactory` | `createAgent(ownerCtx, options)` / `resume(ownerCtx, options)`。消费方只打 `ctx.agents`。 |
| `AgentHandle` | `{ agent, dispose }`。`dispose` 是所有权能力；`get(id)` 只回裸 `Agent`。 |
| `CreateAgentOptions` | 调用方给 `sessionId`；可选 `meta`（含 `agentPreset`）、`seed`、`agentOptions`、`signal`、`setup`。 |
| `AgentSetup` | `(agentCtx) => void \| AgentSetupCommit \| Promise<…>`。只组合，不 drive。 |
| `InboxTarget` | `'next-turn' \| 'next-step'`。durable 事件是 `agent/inbox/spliced`。 |
| `PreStepDecision` | `{ kind: 'reject' }` 或 `{ kind: 'enter'; messages }`。 |
| `RequestErrorAction` | `{ kind: 'retry' }` 或 `undefined`（默认终结这次失败）。 |
| `SessionStartSource` | `'startup' \| 'resume' \| 'clear' \| 'compact'`。 |

`agent/*` 按 Cordis 模式分三档：`agent/created` / `agent/disposed` / `agent/status` / inbox 三通知 / `agent/session-start` / `agent/error` 是 **emit**；`agent/pre-step` / `agent/request` / `agent/request-error` 是 **waterfall**；`agent/turn-stopping` 是 **serial**。

## 控制流

1. **host 面先挂合同。** `dsh-base` 一条根 insert 放下 `id: agent` / `name: '@deepseek-ai/dsh-agent'`，`AgentRegistry` 以服务名 `'agents'` 进根 `Context`。`ctx.agents` 是进程级 store，不是 per-session 插件。`dsh-base` **没有** `subagent-codex` / `subagent-claude-code` 行，也不是「装了但 dormant」：那两个 id 的 filter 长度为 0，manifest 也不声明对应依赖。 [E: packages/bundle/base/cordis.patch.yml:58] [E: packages/bundle/base/cordis.patch.yml:59] [E: packages/core/agent/src/index.ts:38] [E: packages/core/agent/src/index.ts:267] [E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40]

2. **默认 Provider 占工厂槽，启动列表为空。** 同一份 base patch 再挂 `id: agent-loop`，`config.agents: []`：Web 不在进程级造 Agent。`AgentLoop` `implements AgentFactory`，构造时把 `setFactory(this)` 收进可逆 `ctx.effect`。换 loop = 另写一个 `AgentFactory` 插件抢同一槽，并在 bundle / profile patch 里替换 `agent-loop` 行。 [E: packages/bundle/base/cordis.patch.yml:436] [E: packages/bundle/base/cordis.patch.yml:439] [E: packages/core/agent-loop/src/index.ts:296] [E: packages/core/agent-loop/src/index.ts:350]

3. **工厂槽全局一个。** `setFactory` 发现 `this.factory !== undefined` 就抛 `an agent factory is already registered`；effect disposer 把槽清回 `undefined`（HMR / 卸插件）。`create` / `resume` 先 `requireFactory()`：空槽抛 `no agent factory registered (load an agent-loop plugin)`。测试直接打这两条路径。 [E: packages/core/agent/src/index.ts:374] [E: packages/core/agent/src/index.ts:217] [E: packages/core/agent/src/index.ts:392] [E: packages/core/agent/tests/agent.spec.ts:380] [E: packages/core/agent/tests/agent.spec.ts:399] [E: packages/core/agent/tests/agent.spec.ts:403]

4. **`create` / `resume` 只委托，不造 loop。** `AgentRegistry.create` 把访问上下文当成 `ownerCtx`，`getTraceable` 后再 `Reflect.apply(target.createAgent, receiver, [ownerCtx, options])`。`resume` 同样委托。测试钉死 `ownerCtx.fiber` 等于调用方插件 fiber，不是工厂登记时的 fiber。 [E: packages/core/agent/src/index.ts:405] [E: packages/core/agent/src/index.ts:412] [E: packages/core/agent/src/index.ts:414] [E: packages/core/agent/tests/agent.spec.ts:390]

5. **Consumer 在运行时创建会话。** Web `apiproxy` 的 `composeAgent` 先 `presets.resolve`，把 id 放进返回值 `agentPreset`，真正的 `AgentPresets.mount` 放进 `setup`；随后 `agents.create` 把该 id 写入 `meta.agentPreset`。headless **不挂** `agent-presets`：`agents.create` 的 `setup` 只装 model selection，模型可见工具留在 host 全局层，然后 `followup`。默认产品路径是 `dsh web`，不是 TUI。 [E: packages/host/apiproxy/src/api-proxy.ts:1240] [E: packages/host/apiproxy/src/api-proxy.ts:1245] [E: packages/host/apiproxy/src/api-proxy.ts:1670] [E: packages/host/apiproxy/src/api-proxy.ts:1675] [E: packages/bundle/headless/src/index.ts:111] [E: packages/bundle/headless/src/index.ts:122]

6. **`setup` 在 publish 前组合 scoped 世界。** `CreateAgentOptions.setup` 是可选回调。`AgentLoop.setupAndPublish`：`prepare` 里 `new ReactLoopAgent`（`createScope(loopCtx, this)` 再 `extend({ agent: this })`）→ `await setup?(prepared.agent.ctx)` → 可选 `commit()` → `publish`。`setup` 抛错 / `commit` 抛错 / owner 在中途 dispose：走 `prepared.dispose()`，**两个 id 都不宣布**。工厂自己在 `setup` 期间不 `followup`；drive 是出版之后的事，运行时并不拦 callback 乱调 handle [I]。 [E: packages/core/agent/src/index.ts:132] [E: packages/core/agent-loop/src/agent.ts:94] [E: packages/core/agent-loop/src/agent.ts:95] [E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:639] [E: packages/core/agent-loop/src/index.ts:640] [E: packages/core/agent-loop/src/index.ts:642]

7. **isolate / `leakedServices`：preset 不得把 service publish 进 root realm。** `AgentPresets.mount` 从 factory `setup` 调用：`ensureStanding` 用 `ScopeKey = { agentPreset }` 做 `createScope`，再 `mountPreset`；然后 `bindScopeParent` 把这个 Agent 接到那份 standing 注册。`mountPreset` 在 `scopeOf(agentCtx) === undefined` 时拒绝（否则注册打到每个 Agent）；settle 后跑 `leakedServices`：实现的 store key 若等于 **root** `Context.isolate[name]`，该名算泄漏，整次 mount 抛出要求 `isolate` realm 或搬到 host 的错误。需要私有实例的 preset 行必须带 `isolate: { …: true }`。只 `ctx.tools.register`、不往 root realm `provide` 的行不会出现在 `leakedServices` 名单里 [I]。失败发生在 `setup` 里，因此整次 `create` 回滚。 [E: packages/preset/agent-presets/src/index.ts:275] [E: packages/preset/agent-presets/src/index.ts:286] [E: packages/preset/agent-presets/src/index.ts:514] [E: packages/preset/agent-presets/src/index.ts:515] [E: packages/preset/agent-presets/src/index.ts:524] [E: packages/preset/agent-presets/src/mount.ts:334] [E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:365]

8. **`enter` 然后 `announce`，失败成对回滚。** `publish`：`sessions.enter` → `agents.enter(agent, ownerCtx.agent)` → `sessions.announce` → `agents.announce` → `agent/session-start`。`enter` 要求 `agent.id === session.id`，同 id 已在 store 则抛 `agent "<id>" is already registered`。`announce` 先把 `announcing`/`announced` 钉死再同步派发 `agent/created`：**同步 throw 否决出版**（`register` 的 effect 会 detach）；返回的 Promise reject 只 `logger.warn`，不否决。announce 期间有人调 detach，等到 dispatch 走完再摘。未 announce 就 detach **不**发 `agent/disposed`（从未对外 created）。 [E: packages/core/agent-loop/src/index.ts:559] [E: packages/core/agent/src/index.ts:476] [E: packages/core/agent/src/index.ts:482] [E: packages/core/agent/src/index.ts:523] [E: packages/core/agent/src/index.ts:559] [E: packages/core/agent/src/index.ts:560] [E: packages/core/agent/tests/agent.spec.ts:229] [E: packages/core/agent/tests/agent.spec.ts:231]

9. **initiator 是进程内因果归因，不是授权。** 活体 driver 用 `withInitiator(this, () => this.kick())` 把当前 `Agent` 推进 `AsyncLocalStorage`。`currentInitiator()` 空则 `undefined`；`requireInitiator()` 抛 `no initiating agent is active`。`withoutInitiator` 清掉继承，避免共享 timer / 队列泵误标成「第一个碰到它的 Agent」。presence 不证明 live，也不做 ACL；跨进程 / 落盘 / 线上身份仍要显式字段。服务 dispose 时新边界抛 `agent initiator scope is disposed`，并 drain 已返回的 Promise。 [E: packages/core/agent-loop/src/agent.ts:192] [E: packages/core/agent/src/index.ts:341] [E: packages/core/agent/src/index.ts:218] [E: packages/core/agent/tests/agent-initiator.spec.ts:41] [E: packages/core/agent/src/index.ts:219]

10. **公开状态只有 `idle` \| `running`。** `ReactLoopAgent` 内部还有 `maintenance`，但 getter 把它折成 `idle`。`runMaintenance` 必须从真 `idle` 同步抢相位，否则抛 `already has active work`。inbox 三入口写在 `Agent` 上，由默认驱动映射到两条队列；队列、`claim`、idle `inject` 只 park 的细节在 [`subsys.core.agent-inbox`](./agent-inbox.md)。turn 时序在 [`spine.turn-and-step`](../../spine/turn-and-step.md)。 [E: packages/core/agent/src/runtime-types.ts:50] [E: packages/core/agent-loop/src/agent.ts:100] [E: packages/core/agent-loop/src/agent.ts:143]

11. **waterfall 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，内建默认行为也不跑。`agentEvents.waterfall` 只是把 fused payload + carrier 转给 `ctx.waterfall`。三处合同：

    | 事件 | innermost `next`（默认驱动给出） | 不调用 `next()` |
    |---|---|---|
    | `agent/pre-step` | `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }` | 链停在该 listener；它必须自己返回 `PreStepDecision`。`reject` 让 turn `blocked`，已 claim 消息不回队列、不上 `user/message` |
    | `agent/request` | 冻结的 `LlmCallConfig` 种子 | 监听器直接返回替换 config。返回类型只有 config，**改不了**随后写入请求的 `messages` |
    | `agent/request-error` | `undefined`（失败终结） | 返回 `{ kind: 'retry' }` 即本层认领恢复；调用 `next()` 才把所有权交给下一层 |

    `agent/request` 之后 loop 才把 `boundaryMessages`（`session.deriveMessages()`）填进冻结请求——这是 **model-visible ⟺ logged** 在合同侧的硬边：要让模型看见新内容，必须先以 `user/message` / `assistant/message` / `tool/result` 进 log。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: packages/core/agent/src/dispatch.ts:146] [E: packages/core/agent/src/runtime-types.ts:231] [E: packages/core/agent-loop/src/agent.ts:234] [E: packages/core/agent-loop/src/agent.ts:237] [E: packages/core/agent/src/runtime-types.ts:244] [E: packages/core/agent-loop/src/agent.ts:438] [E: packages/core/agent-loop/src/agent.ts:488] [E: packages/core/agent/src/runtime-types.ts:260] [E: packages/core/agent-loop/src/agent.ts:364]

12. **fused dispatch 不让 payload 偷换 subject。** `agentEvents` 展开 payload 后再写入 `agent`，调用方自带的 `agent` 字段赢不了 carrier。`assembleContextFor` 同时写下 `agent` 与 `scope: agent`，避免 prompt/tool 装配 silently 丢掉 agent-scoped 贡献。emit 自己遍历 callback 并吞同步 throw / Promise reject，通知不能否决生命周期。 [E: packages/core/agent/src/dispatch.ts:118] [E: packages/core/agent/src/dispatch.ts:175] [E: packages/core/agent/tests/agent.spec.ts:348]

## 设计动机

- **合同与驱动分离。** ACP、`apiproxy`、headless、子代理后端只依赖 `ctx.agents`，不 import `ReactLoopAgent`。新行为优先挂 `agent/pre-step` / `agent/request` / `agent/request-error` / `agent/turn-stopping`，而不是 fork 一份 loop。
- **单槽工厂。** 一个进程一种 loop，避免两套 driver 抢同一批 session id。槽本身是 `ctx.effect`，卸插件可逆。
- **先组合后出版。** `setup` 失败时观察者从未见过半成品 `Agent`。preset 的 isolate 门也卡在这一拍，泄漏进 root realm 的服务不会先登记再补救。
- **host 面 vs agent-preset 面。** 注册表、工厂、sandbox / persistence / subagent **backends** 留在进程；tools / persona / isolate 挂在 `Agent.ctx`。Web 把模型可见工具从 base 挪到 preset；headless 不挂 roster，工具留在 host。
- **initiator 只回答「这条异步链是谁叫醒的」。** 父建子时 `setup` 里 `currentInitiator()` 是父、`agentCtx.agent` 是子。把它当成授权会在 worker / 持久化 / 线上边界静默错归属。
- **公开两态。** UI 与 RPC 不需要看见 `maintenance`；内部相位留给 loop。

## Gotcha

- 第二次 `setFactory` 的原文是 `an agent factory is already registered`，不是光秃秃的 `already registered`。空槽原文是 `no agent factory registered (load an agent-loop plugin)`。 [E: packages/core/agent/src/index.ts:374] [E: packages/core/agent/src/index.ts:217]
- `agent/created`：**同步** throw 否决并配对 `agent/disposed`；**异步** reject 只打 warn，handle 已经出版。 [E: packages/core/agent/tests/agent.spec.ts:229] [E: packages/core/agent/tests/agent.spec.ts:252]
- `ctx.agent` 是 DX accessor（根上默认 `undefined`，`Agent.ctx` 用 own property 盖住）。分层选注册表请用 `scopeOf()`，不要读这个字段当 scope resolver。 [E: packages/core/agent/src/index.ts:48] [E: packages/core/agent/src/index.ts:288]
- `register()` 是「已经造好的 Agent 立刻 enter+announce」。异步 factory 必须拆成 `enter` → 把 detach 嵌进 teardown → `announce`，否则 setup 失败会先对外 created。 [E: packages/core/agent/src/index.ts:450]
- `Agent.id` 必须等于 `session.id`；`enter` 在碰撞边界检查，过不了 store 保持空。 [E: packages/core/agent/src/index.ts:476] [E: packages/core/agent/tests/agent.spec.ts:196]
- inbox 变更先 `session.append('agent/inbox/spliced')` 再改内存，耐久但**还不是**模型可见历史。claim 之后 loop 才写 `user/message`。 [E: packages/core/agent/src/inbox.ts:186]
- `dsh-base` 不 dormant 加载 Codex/Claude 子代理后端。preset 里对应 tool 行若存在且 `disabled: true`，那是 preset 成员资格问题，不是本包工厂槽的事。 [E: packages/bundle/base/tests/base.spec.ts:40]
- 不要把 `AgentStatus` 的两态和 loop 内部 `Phase` 三态画等号；`maintenance` 对外仍是 `idle`。 [E: packages/core/agent-loop/src/agent.ts:100]

## Seam 三角

| 角色 | 落点 | `ctx` 键 / 符号 | bundle / preset 行 |
|---|---|---|---|
| **Definition** | `@deepseek-ai/dsh-agent`：`Agent`、`AgentFactory`、`AgentRegistry`、`agent/*` 词表、`InboxTarget` | `ctx.agents`；`Agent.ctx` / `ctx.agent`（DX） | `dsh-base` `id: agent` `name: '@deepseek-ai/dsh-agent'` |
| **Provider** | `@deepseek-ai/dsh-agent-loop`：`AgentLoop.setFactory(this)`；`ReactLoopAgent implements Agent` | `ctx.agentLoop`；工厂槽（非独立 ctx 键） | `dsh-base` `id: agent-loop` `config.agents: []`。替换 = patch 掉该行并另挂一个 `AgentFactory` |
| **Consumer** | Web `apiproxy` / headless runner / ACP / 子代理 spawn；扩展点监听者；`AgentPresets.mount` 只活在 `setup` | `ctx.agents.create` / `resume` / `get`；`Agent.followup` 等 | `dsh-web-app` 的 `agent-presets`（`default: standard`）在 `setup` 里 join；headless **无**该行。preset 私有服务必须 `isolate: { …: true }`，否则 `leakedServices` 拒 mount |

换一条缝的 Provider（例如换 loop 插件、把 preset 服务从 isolate 挪到 host）会带走它的 Consumer，但 **Definition**（`dsh-agent` 合同）保持不变。

## Sources

- packages/core/agent/src/index.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/types.ts
- packages/core/agent/src/inbox.ts
- packages/core/agent/package.json
- packages/core/agent/tests/agent.spec.ts
- packages/core/agent/tests/agent-initiator.spec.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-loop/src/agent.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/headless/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.turn-and-step`](../../spine/turn-and-step.md) — followup 如何变成 0..n 个 step；本页只到合同与工厂槽。
- [`subsys.core.agent-loop`](./agent-loop.md) — 默认 `AgentLoop` / `ReactLoopAgent`、`agents: []`、并行工具上限。
- [`subsys.core.agent-inbox`](./agent-inbox.md) — `followup` / `steer` / `inject` 两条队列与 `claim`。
- [`spine.overview`](../../spine/overview.md) — host / preset 两面与组合树地图。
- [`spine.session-log`](../../spine/session-log.md) — `deriveMessages` 与 model-visible ⟺ logged。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — standing mount、`leakedServices`、`bindScopeParent`。
- [`subsys.core.scope`](./scope.md) — `createScope` / `bindScopeParent` / `scopeTarget`。
