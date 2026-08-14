---
id: spine.turn-and-step
title: turn 与 step(可替换 loop)
kind: flow
tier: T0
pkg: core
source:
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/inbox.ts
  - docs/architecture.md
  - docs/agent-lifecycle.md
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/types.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/src/runtime-context.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/repair.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/core/agent-loop/tests/loop.spec.ts
  - packages/core/agent-loop/tests/interception.spec.ts
  - packages/core/agent/tests/agent.spec.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/bundle/headless/src/index.ts
symbols: [Agent, Inbox, ReactLoopAgent]
related: [spine.overview, spine.tool-call-anatomy, spine.session-log, subsys.core.agent-loop, subsys.core.agent-inbox]
evidence: explicit
status: verified
updated: 47f943859b
---

> `spine.turn-and-step` 说明 DSH 如何把一次 inbox 投递变成 **0..n 个 step 的 turn**：合同在 `dsh-agent`（`Agent` / `Inbox` / `agent/*` 事件），默认驱动是可替换的 Cordis 插件 `dsh-agent-loop`（`ReactLoopAgent`）；每一步请求的 `messages` 只从 session log 的 `deriveMessages()` 投影出来。

## 能回答的问题

- turn 和 step 各是什么，一次 `followup` 会开几个 turn、几个 step？
- `followup` / `steer` / `inject` 分别进哪条 inbox 队列，谁会 wake driver？
- loop 为什么说可替换？`Agent` 合同、`AgentFactory` 槽和默认 `ReactLoopAgent` 各在哪？
- 每一步模型请求的 `messages` 从哪来，`agent/request` 能不能改对话内容？
- 内部 `Phase`（`idle` / `maintenance` / `running`）和公开 `AgentStatus` 怎么对应？
- 什么情况下 turn 以 0 个 step 结束（`blocked` / 空 claim / abort）？

```mermaid
flowchart TD
  HostPrompt["Host followup or steer"] --> Send["Agent.send"]
  PluginInject["Plugin inject"] --> Send
  Send --> Inbox["Inbox next-turn / next-step"]
  Inbox --> Wake{"wakeup?"}
  Wake -->|idle wake| PhaseRun["Phase running"]
  Wake -->|inject idle| Park["stay idle, park inbox"]
  Wake -->|live driver| Inbox
  PhaseRun --> Kick["kick while turn"]
  Kick --> TurnStart["session turn/start"]
  TurnStart --> Claim["Inbox.claim"]
  Claim --> Assemble["systemPrompt.assemble"]
  Assemble --> PreStep["agent/pre-step waterfall"]
  PreStep -->|reject| Blocked["turn/end blocked"]
  PreStep -->|empty first claim| Empty["turn/end completed, no step"]
  PreStep -->|enter| StepStart["step/start + user/message"]
  StepStart --> Derive["Session.deriveMessages"]
  Derive --> Request["agent/request then llm.stream"]
  Request --> Chunks["assistant/chunk then assistant/message"]
  Chunks -->|no tool-call| StepEnd["step/end"]
  Chunks -->|tool-call| Tools["executeToolCalls"]
  Tools --> StepEnd
  StepEnd --> Stopping{"turnEnds and next-step empty?"}
  Stopping -->|no| Claim
  Stopping -->|yes| TurnStop["agent/turn-stopping serial"]
  TurnStop -->|listener steers| Claim
  TurnStop -->|still empty| TurnEnd["turn/end"]
  TurnEnd --> Pending{"inbox.hasPending?"}
  Pending -->|yes| Kick
  Pending -->|no| Idle["Phase idle"]
```

## 端到端步骤

1. `Agent` 合同在 `@deepseek-ai/dsh-agent`，不绑定某一种 loop。`AgentRegistry`（`ctx.agents`）只做活体登记、initiator 作用域和工厂委托；真正 `create` / `resume` 必须先有人调用 `setFactory`。没有工厂时 `requireFactory` 抛 `no agent factory registered (load an agent-loop plugin)`。[E: packages/core/agent/src/index.ts:217] [E: packages/core/agent/src/index.ts:392] 测试直接打这条路径。[E: packages/core/agent/tests/agent.spec.ts:380] 这是 **host 面** 的进程级缝：工厂槽全局只有一个，第二个 `setFactory` 抛 `already registered`。[E: packages/core/agent/src/index.ts:374]

2. 默认插件 `@deepseek-ai/dsh-agent-loop` 的 `AgentLoop` 在构造时把自己登记进该槽，并在 `prepare` 里 `new ReactLoopAgent(...)`。[E: packages/core/agent-loop/src/index.ts:350] [E: packages/core/agent-loop/src/index.ts:549] `ReactLoopAgent implements Agent`。[E: packages/core/agent-loop/src/agent.ts:64] `dsh-base` 用 id `agent-loop` 挂上这包，启动配置是空列表 `agents: []`。[E: packages/bundle/base/cordis.patch.yml:436] [E: packages/bundle/base/cordis.patch.yml:437] [E: packages/bundle/base/cordis.patch.yml:439] 会话由 host 在运行时创建（Web `apiproxy`、headless `agents.create`）。换 loop = 换一个实现 `AgentFactory` 的插件占同一槽，并在 bundle / profile patch 里替换该行，而不是改 `dsh-agent` 合同。

3. 每个 `ReactLoopAgent` 持有一份 `Inbox` 和一个 agent-scoped `ctx`：`createScope(loopCtx, this)` 再 `extend({ agent: this })`。[E: packages/core/agent-loop/src/agent.ts:87] [E: packages/core/agent-loop/src/agent.ts:94] [E: packages/core/agent-loop/src/agent.ts:95] **agent-preset 面**（tools / persona / isolate）挂在这份 `Agent.ctx` 上，随会话卸载；**host 面**（webserver / persistence / sandbox / 子代理后端、以及这份 `AgentLoop` 服务本身）是进程级、跨会话共享。`setupAndPublish` 先 `await setup?(agent.ctx)` 再 `publish`：组合完成之前 agent 不会被登记，也就还没有可投递的 live handle。[E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:640]

4. 内部 `Phase` 是三态：`idle` / `maintenance` / `running`。[E: packages/core/agent-loop/src/agent.ts:38] [E: packages/core/agent-loop/src/agent.ts:41] [E: packages/core/agent-loop/src/agent.ts:46] 公开 `AgentStatus` 只有 `'idle' | 'running'`。[E: packages/core/agent/src/runtime-types.ts:50] `maintenance` 对外仍报 `idle`。[E: packages/core/agent-loop/src/agent.ts:100] `runMaintenance` 必须从真 `idle` 同步抢到相位，否则抛 `already has active work`；任务跑完若 `wakeRequested && inbox.hasPending` 才补 wake。[E: packages/core/agent-loop/src/agent.ts:143] [E: packages/core/agent-loop/src/agent.ts:158]

5. 外部投递都走 `ReactLoopAgent.send(message, target, wakeup)`，再落到 `Inbox.splice`。[E: packages/core/agent-loop/src/agent.ts:113] [E: packages/core/agent-loop/src/agent.ts:118] 三条公开入口是固定映射：`followup` → `next-turn` + wake；`steer` → `next-step` + wake；`inject` → `next-step`、不 wake。[E: packages/core/agent-loop/src/agent.ts:122] [E: packages/core/agent-loop/src/agent.ts:123] [E: packages/core/agent-loop/src/agent.ts:126] [E: packages/core/agent-loop/src/agent.ts:127] [E: packages/core/agent-loop/src/agent.ts:130] [E: packages/core/agent-loop/src/agent.ts:131] 若当前活动已 abort 且这次是 waking 投递，`send` 会在 splice 之前把 target 改写成 `next-turn`，避免新意图并进已取消的活动。[E: packages/core/agent-loop/src/agent.ts:116] [E: packages/core/agent-loop/src/agent.ts:117]

6. `Inbox` 维护两条有序列表 `next-turn` / `next-step`，构造时从 `session.events`（跳过 `seedLength` 前缀）重放 `agent/inbox/spliced`。[E: packages/core/agent/src/inbox.ts:26] [E: packages/core/agent/src/inbox.ts:32] [E: packages/core/agent/src/inbox.ts:33] [E: packages/core/agent/src/types.ts:10] `splice` 先 `session.append('agent/inbox/spliced', …)` 再改内存投影，所以 inbox 变更本身是耐久事实，但还不是模型可见历史。[E: packages/core/agent/src/inbox.ts:186] [E: packages/core/agent/src/inbox.ts:187] `hasPending` 是任一条非空。[E: packages/core/agent/src/inbox.ts:54]

7. host 把人话送进这两条队列。Web 工作台经 `apiproxy`：`mode === 'steer'` 调 `agent.steer`，否则 `agent.followup`。[E: packages/host/apiproxy/src/api-proxy.ts:2498] [E: packages/host/apiproxy/src/api-proxy.ts:2499] headless 一次性任务在 `agents.create` 之后 `agent.followup(...)` 再 `whenIdle`。[E: packages/bundle/headless/src/index.ts:122] [E: packages/bundle/headless/src/index.ts:126] 插件侧的文件变更、指令、工具附加上下文走 `inject`：idle 时只留下 `agent/inbox/spliced`，`status` 仍是 `idle`，不开 `turn/start`。[E: packages/core/agent-loop/tests/loop.spec.ts:645] [E: packages/core/agent-loop/tests/loop.spec.ts:646] [E: packages/core/agent-loop/tests/loop.spec.ts:648]

8. `wakeup === true` 且 `phase === idle` 时，`wakeDriver` **不看** inbox 是否还剩消息：同步把相位切到 `running`（`step: 0`），再 `withInitiator(this, () => this.kick())`。[E: packages/core/agent-loop/src/agent.ts:186] [E: packages/core/agent-loop/src/agent.ts:189] [E: packages/core/agent-loop/src/agent.ts:192] 已在跑的 live driver 自己在 step/turn 边界取队列，不会再 latch；只有 `maintenance` 或 abort 后的 wake 才设 `wakeRequested`，并在收敛时要求 `inbox.hasPending` 才重放。[E: packages/core/agent-loop/src/agent.ts:178] [E: packages/core/agent-loop/src/agent.ts:220] idle 上一次 wake 即使消息随后被清掉，也仍会打开 turn 边界。

9. `kick` 是 driver 外壳：`while (await this.turn()) {}`，失败与取消都吞在这层；`finally` 若仍是 `running` 则回到 `idle`。[E: packages/core/agent-loop/src/agent.ts:212] [E: packages/core/agent-loop/src/agent.ts:219] 一次 `kick` 可以连续消耗多条 `next-turn`（多轮 turn），条件是每一轮 `turn()` 结束后 `inbox.hasPending`。[E: packages/core/agent-loop/src/agent.ts:324] [E: packages/core/agent-loop/src/agent.ts:329]

10. `ReactLoopAgent.turn` 先 `session.append('turn/start', { turn })`，再把 `phase.turn` 写成新编号。turn 号来自 `lastTurn + 1`；构造时 `lastTurn` 取 log 里最后一条 `turn/start`，resume 接着编号。[E: packages/core/agent-loop/src/agent.ts:255] [E: packages/core/agent-loop/src/agent.ts:259] [E: packages/core/agent-loop/src/agent.ts:92] [E: packages/core/agent-loop/src/agent.ts:93] 简单一路的耐久边界顺序是 `turn/start → step/start → step/end → turn/end`。[E: packages/core/agent-loop/tests/loop.spec.ts:180] `turn/*` / `step/*` 只活在 `session/event`，没有 `agent/*` 镜像。

11. 每个拟议 step 先 `preStep`。`Inbox.claim(target, turn)` 同步抽走 **全部** `next-step`，若 `target === 'next-turn'` 再额外抽 **一条** `next-turn`；durable splice 是纯删除，并按条发 `agent/inbox/claimed`。[E: packages/core/agent/src/inbox.ts:71] [E: packages/core/agent/src/inbox.ts:72] [E: packages/core/agent/src/inbox.ts:73] [E: packages/core/agent/src/inbox.ts:74] [E: packages/core/agent/src/inbox.ts:76] 一轮 turn 的第一个 claim 用 `target = 'next-turn'`，后续 step 改成 `'next-step'`。[E: packages/core/agent-loop/src/agent.ts:261] [E: packages/core/agent-loop/src/agent.ts:300] 所以：一条 `followup` 独占自己的 turn；idle 时堆在 `next-step` 的 `inject`/`steer` 会和该 turn 的第一条 `next-turn` 一起进第一拍。

12. `preStep` 在 claim 之后立刻 `systemPrompt.assemble(assembleContextFor(this, signal))`（`assembleContextFor` 把 `agent` 与 `scope` 绑在一起），再用 `RuntimeContextProjection.project` 决定要不要追加一条 plugin 源的 runtime-context `UserMessage`，然后把这批东西送进 `agent/pre-step` waterfall。[E: packages/core/agent-loop/src/agent.ts:229] [E: packages/core/agent-loop/src/agent.ts:230] [E: packages/core/agent/src/dispatch.ts:174] [E: packages/core/agent/src/dispatch.ts:175] [E: packages/core/agent-loop/src/agent.ts:233] [E: packages/core/agent-loop/src/agent.ts:234] 默认 `next()` 是 `{ kind: 'enter', messages: claimed 或 claimed+context }`。[E: packages/core/agent-loop/src/agent.ts:236] [E: packages/core/agent-loop/src/agent.ts:238] 监听者可 `reject` 或改写 `messages`。`reject` 让本 turn `turnEnds = { kind: 'blocked' }` 并直接结束，不写 `step/start`，也不把已 claim 的消息写回 inbox 或记成 `user/message`。[E: packages/core/agent-loop/src/agent.ts:267] [E: packages/core/agent-loop/src/agent.ts:268] 测试：`reject` 后模型 0 次调用，log 只有 `turn/start`/`turn/end`，reason 为 `{ kind: 'blocked' }`。[E: packages/core/agent-loop/tests/interception.spec.ts:239] [E: packages/core/agent-loop/tests/interception.spec.ts:254]

13. 第一个拟议 step 若 `enter` 但 `messages.length === 0`（wake 后消息被清、或 waterfall 改写成空），turn 记 `completed` 并 `return false`，花费 0 个 step、0 次模型调用。[E: packages/core/agent-loop/src/agent.ts:274] [E: packages/core/agent-loop/src/agent.ts:275] [E: packages/core/agent-loop/src/agent.ts:276] 后续 step 允许空 `messages`：工具续跑那一拍的 `agent/pre-step` 会看到 `messages: 0`，仍开 step 并打模型。[E: packages/core/agent-loop/tests/interception.spec.ts:103] [E: packages/core/agent-loop/tests/interception.spec.ts:105]

14. 进入 step：`session.append('step/start', { turn, step })`，再对 `decision.messages` 逐条 `session.append('user/message', message, { surfaceOp: 'append' })`。[E: packages/core/agent-loop/src/agent.ts:279] [E: packages/core/agent-loop/src/agent.ts:283] 这是 inbox 内容第一次变成 **模型可见** 的 user 历史。session 用 `step/start` / `step/end` 包住这一拍；`ReactLoopAgent.step` 则是一次模型调用，再视 assistant 内容决定要不要 `executeToolCalls`。[E: packages/core/session/src/types.ts:254] [E: packages/core/session/src/types.ts:256] [E: packages/core/agent-loop/src/agent.ts:332]

15. `ReactLoopAgent.step` 用 `session.deriveMessages()` 当本拍 `messages`，和 `renderPrompt(assembly)` 得到的 system、以及装配好的 tools 一起交给 `buildRequest`。[E: packages/core/agent-loop/src/agent.ts:337] [E: packages/core/agent-loop/src/agent.ts:341] `deriveMessages` 只折叠 `surface.nodes`，对每个 seq 调 `deriveEventMessage`。[E: packages/core/session/src/index.ts:726] [E: packages/core/session/src/index.ts:728] [E: packages/core/session/src/index.ts:739] surface 类型只有 `user/message` / `assistant/message` / `tool/result`。[E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:17] [E: packages/core/session/src/surface.ts:18] `turn/*`、`step/*`、`assistant/chunk`、`agent/inbox/spliced` 都留在 append-only log，但不进请求。

16. `buildRequest` 把 route/config 种子送进 `agent/request` waterfall；监听者只能换 `LlmCallConfig`（provider / model / sampling），**不能**改 `messages`。[E: packages/core/agent-loop/src/agent.ts:438] [E: packages/core/agent-loop/src/agent.ts:440] 冻结请求在 waterfall 之后才把 `boundaryMessages` 填进去。[E: packages/core/agent-loop/src/agent.ts:486] [E: packages/core/agent-loop/src/agent.ts:488] 这是 `model-visible ⟺ logged` 在 loop 里的硬边界：要让模型看见新内容，必须先以 `user/message` / `assistant/message` / `tool/result` 进 log。header 有变就再记一条 `request/header`（`initial` / `resume` / `change`）。[E: packages/core/agent-loop/src/agent.ts:466] [E: packages/core/agent-loop/src/agent.ts:469]

17. 流式调用：`preparedCall?.stream(request) ?? ctx.llm.stream(request)`，每个 chunk `session.append('assistant/chunk', { turn, step, chunk })`，`BlockAssembler` 收束后再 `assistant/message`（`surfaceOp: 'append'`，`sourceEventSeqs` 指向那些 chunk）。[E: packages/core/agent-loop/src/agent.ts:345] [E: packages/core/agent-loop/src/agent.ts:349] [E: packages/core/agent-loop/src/agent.ts:381] [E: packages/core/agent-loop/src/agent.ts:389] 失败走 `agent/request-error` waterfall，默认不 retry；只有监听者返回 `{ kind: 'retry' }` 才在同一步里再打一枪。[E: packages/core/agent-loop/src/agent.ts:355] [E: packages/core/agent-loop/src/agent.ts:367] `finish.kind === 'max-tokens'` 立刻结束本 step，且 **不执行** 工具；该 reason 在后续 step 里是粘性的，后来的 `completed` 不能把它降级。[E: packages/core/agent-loop/src/agent.ts:391] [E: packages/core/agent-loop/src/agent.ts:290]

18. 无 `tool-call` block → 本 step `completed`，turn 准备停。[E: packages/core/agent-loop/src/agent.ts:393] [E: packages/core/agent-loop/src/agent.ts:394] 有 tool-call → `executeToolCalls(...)`；结果 context 通过 `inbox.splice('next-step', …)` 排进下一拍，而不是直接改 `deriveMessages` 缓存。[E: packages/core/agent-loop/src/agent.ts:395] [E: packages/core/agent-loop/src/agent.ts:397] [E: packages/core/agent-loop/src/tool-calls.ts:59] `concluded === true` 把本 step 标成 `completed`，即使这一拍刚跑过工具。[E: packages/core/agent-loop/src/agent.ts:399] 工具 waterfall（`tools/pre-execute` → execute → `tools/post-execute`）、approval、sandbox 不在本页展开，留给 `spine.tool-call-anatomy`。

19. `step/end` 之后：若已经有 `turnEnds` 且 `inbox.nextStep` 空，先 `serial('agent/turn-stopping')`，再读一次 inbox。[E: packages/core/agent-loop/src/agent.ts:295] [E: packages/core/agent-loop/src/agent.ts:296] [E: packages/core/agent-loop/src/agent.ts:299] 监听者在这里 `steer(...)` 就能再开一个 step（测试里的 `/loop` 模式连打 3 步）。[E: packages/core/agent-loop/tests/loop.spec.ts:777] [E: packages/core/agent-loop/tests/loop.spec.ts:785] 数据说了算：有 next-step 就续，没有就出循环。`finally` 必写 `turn/end`，reason 为 `completed` / `max-tokens` / `blocked` / `aborted` / `error`。[E: packages/core/agent-loop/src/agent.ts:319] `interrupted` 由 session repair 在 reload 时补 `turn/end`，不是 `ReactLoopAgent.turn` 写的。[E: packages/core/session/src/repair.ts:131]

20. 同一次 `kick` 若 inbox 里还有下一条 `followup`，`turn()` 换新 `AbortController`、`step = 0` 并 `return true`，不回 `idle`。[E: packages/core/agent-loop/src/agent.ts:325] [E: packages/core/agent-loop/src/agent.ts:328] [E: packages/core/agent-loop/src/agent.ts:329] 队列空才让 `kick` 的 `finally` 把相位收回 `idle`，并 emit `agent/status`。[E: packages/core/agent-loop/src/agent.ts:104] [E: packages/core/agent-loop/src/agent.ts:109] `cancel` 默认 `inbox.clear()` 并 abort 当前活动；`keepInbox: true` 只 abort、不清队列。[E: packages/core/agent-loop/src/agent.ts:135] [E: packages/core/agent-loop/src/agent.ts:136] [E: packages/core/agent/src/runtime-types.ts:40]

## 关键决策点

### 合同与默认驱动分离（loop 可替换）

`dsh-agent` 导出 `Agent` / `Inbox` / `AgentFactory` / `agent/*` 事件；`dsh-agent-loop` 是 base bundle 装上的默认 Provider。消费方（ACP、apiproxy、headless、子代理）只依赖 `ctx.agents`，不 import `ReactLoopAgent`。`AgentLoop.prepare` 固定 `new ReactLoopAgent(...)`。[E: packages/core/agent-loop/src/index.ts:549] 替换方式是另写一个 `AgentFactory` 插件抢 `setFactory` 槽，并 patch 掉 `agent-loop` 那一行。新行为优先挂 `agent/pre-step`、`agent/request`、`agent/request-error`、`agent/turn-stopping`，而不是 fork 一份 loop。

### inbox 三入口，不是三种 transcript 类型

`followup` / `steer` / `inject` 的差别是 **队列 + 是否 wake**，不是三种 session 事件。claim 之后一律变成 `user/message`；`source.kind`（`user` / `plugin`）才区分人话和插件上下文。idle `steer` 会立刻开 turn（测试在 `steer` 返回后就能读到 `status === 'running'` 且已有 `turn/start`）。[E: packages/core/agent-loop/tests/loop.spec.ts:593] [E: packages/core/agent-loop/tests/loop.spec.ts:594] [E: packages/core/agent-loop/tests/loop.spec.ts:595] idle `inject` 只 park。跑着的 live driver：`steer`/`inject` 进下一 step，`followup` 进下一 turn。

### host 面 vs agent-preset 面

| 面 | 谁持有 | 跟 turn/step 的关系 |
|---|---|---|
| host | 进程：`dsh-base` 挂上的 `AgentLoop`、webserver / apiproxy、persistence、sandbox 后端 | 创建/恢复 `Agent`，把人话 `followup`/`steer` 推进 inbox；默认安装是 `dsh web`，不是 TUI |
| agent-preset | 每个 `Agent.ctx`：tools / persona / isolate | 每会话一份 driver；插件 `inject`/`steer`、prompt section、工具 schema 都在这个 scope，随 agent dispose 卸掉 |

不要把 DSH 读成「又一个 coding agent 主循环」。它是 Cordis 组合运行时：profile → bundle → preset 叠出来的树里，loop 只是其中一行可替换插件。

### model-visible ⟺ logged

模型请求里的 `messages` = `deriveMessages()` 对 surface 的投影。`agent/request` 改不了对话内容。runtime-context 快照若变化，loop 自己也是造一条 plugin `UserMessage` 再经 `user/message` 进 log，而不是偷偷塞进 adapter。[E: packages/core/agent-loop/src/runtime-context.ts:68] [E: packages/core/agent-loop/src/agent.ts:238] compaction 若改历史，只能 `surfaceOp: replace`（细节见 `spine.session-log` / `spine.context-and-compaction`）。

### 停止条件是数据，不是监听者顺序

- 无 tool-call → `completed`。
- 有 tool-call 且 `executeToolCalls` 的 `concluded` 为假 → `step()` 返回 `null`，`turnEnds` 仍空，默认再开 step。[E: packages/core/agent-loop/src/agent.ts:399] [E: packages/core/agent-loop/src/tool-calls.ts:157]
- `concluded === true`（某条 `ToolExecutionResult.concludesTurn`）→ 本 step 记 `completed`，但已提交的 next-step（含本步 tool context、竞态 `steer`）仍要先抽干。
- `agent/turn-stopping` 是 serial 检查点：监听者 `steer` 就能续；谁先谁后不改变「inbox 空不空」这个判决。
- `reject` → `blocked`，claim 过的消息就此消失（不回队列、不上 surface）。
- abort → `aborted`；未捕获错误 → `error`（`LlmError` 保留 failure，其余压成 `UNKNOWN`）。[E: packages/core/agent-loop/src/agent.ts:309] [E: packages/core/agent-loop/src/agent.ts:311] [E: packages/core/agent-loop/src/agent.ts:313]

### Phase 对外折叠

调试时不要把 `runMaintenance` 当成第三种公开状态。它从真 `idle` 抢相位、对外仍报 `idle`；占用期间新的 waking 输入只能 latch，等任务 `finally` 再看 `wakeRequested && inbox.hasPending`。[E: packages/core/agent-loop/src/agent.ts:143] [E: packages/core/agent-loop/src/agent.ts:100] [E: packages/core/agent-loop/src/agent.ts:158]

## 指向后续 T1/T2

- `spine.tool-call-anatomy`：`executeToolCalls` → `tools/pre-execute` / execute / `tools/post-execute`，approval 与 sandbox 挂哪一层。
- `spine.session-log`：append-only log、`deriveMessages`、`surfaceOp: append | replace`、checkpoint 两个落点。
- `subsys.core.agent-loop`：`AgentLoop` 工厂、config `agents[]`、create/resume 回滚、并行工具上限。
- `subsys.core.agent-inbox`：`Inbox.splice` / `claim` / 重放、重复 `MessageId` 拒绝、UI 如何从 splices 重建队列。
- `spine.overview`：host / preset / 组合树全仓地图。
- `spine.context-and-compaction`：谁在 `agent/pre-step` 里触发压缩（本页只保留这个挂钩）。

## Sources

- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent/src/index.ts
- packages/core/agent/src/inbox.ts
- docs/architecture.md
- docs/agent-lifecycle.md
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/types.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/src/runtime-context.ts
- packages/core/session/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/types.ts
- packages/core/session/src/repair.ts
- packages/bundle/base/cordis.patch.yml
- packages/core/agent-loop/tests/loop.spec.ts
- packages/core/agent-loop/tests/interception.spec.ts
- packages/core/agent/tests/agent.spec.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/bundle/headless/src/index.ts

## 相关

- [`spine.overview`](overview.md) — 组合运行时全仓地图，host / preset 两面。
- [`spine.tool-call-anatomy`](tool-call-anatomy.md) — 从 assistant `tool-call` 到 `executeToolCalls` 与 tools waterfall。
- [`spine.session-log`](session-log.md) — session log 与 `deriveMessages` 投影。
- [`subsys.core.agent-loop`](../subsystems/core/agent-loop.md) — 默认 `AgentLoop` 驱动的工厂与生命周期。
- [`subsys.core.agent-inbox`](../subsystems/core/agent-inbox.md) — `Inbox` 的 `followup` / `steer` / `inject` 队列语义。
