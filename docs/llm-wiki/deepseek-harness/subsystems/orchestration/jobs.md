---
id: subsys.orchestration.jobs
title: jobs 运行时
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/jobs/jobs/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/jobs/jobs/src/brand.ts
  - packages/jobs/jobs/package.json
  - packages/jobs/jobs/tests/service.spec.ts
  - packages/jobs/jobs-local/src/index.ts
  - packages/jobs/jobs-local/package.json
  - packages/jobs/jobs-local/tests/jobs.spec.ts
  - packages/jobs/jobs-local/tests/loader-composition.spec.ts
  - packages/jobs/tool-jobs/src/index.ts
  - packages/jobs/tool-jobs/package.json
  - packages/jobs/tool-jobs/tests/tool-jobs.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - packages/shell/tool-bash/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
symbols:
  - ctx.jobs
  - JobRegistry
  - LocalJobRegistry
related:
  - spine.overview
  - spine.capability-seams
  - spine.composition-boot
  - spine.turn-and-step
  - spine.tool-call-anatomy
  - surface.tools.jobs
  - surface.tools.bash
  - surface.tools.subagent
  - subsys.orchestration.subagent
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.composition.agent-presets
  - subsys.core.scope
  - subsys.core.tools
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.jobs`（`JobRegistry`）是 **host 面**后台任务注册表缝：进程内一份 RAM registry，发 `<kind>-N` id、按 owner session 隔离、等结算、取消、completion listener。`@deepseek-ai/dsh-jobs` 只是合同，**不能当 plugin 加载**；shipped Provider 是 `dsh-jobs-local`（base 行 `id: jobs`）。模型面 Consumer 是 `dsh-tool-jobs`（`attachController` + `job_*`），不是又一套 coding-agent 任务队列。

## 能回答的问题

- 为什么组合里写 `name: '@deepseek-ai/dsh-jobs'` 会在 load 期炸掉，真正的行却是 `id: jobs` → `dsh-jobs-local`？
- `ctx.jobs` 是 host 单例还是 per-session isolate 服务？web 为什么留下 registry、只 `disable` `tool-jobs`？
- 没有 `attachController` 时 `start` 为什么拒绝？`bash` / `subagent` 两种 kind 谁当 producer？
- `LocalJobRegistry` 的记录存在哪？reload / 换会话会不会从 jsonl 复活？
- `tools/pre-execute` 这条 waterfall 必须 `next()` 吗？不调用会卡在哪？
- 一个 preset 挂了 `tool-jobs`、另一个没挂，前者的 controller 会不会给后者开闸？

## 职责边界

本页拥有：**host 面** Definition `JobRegistry` / `ctx.jobs`、shipped Provider `LocalJobRegistry`、以及 Consumer 如何 `attachController` 才能让 `start` 放行。记录只活在进程内存；本页不写 session 落盘。

明确**不**拥有：

- 模型看见的 `job_list` / `job_output` / `job_kill` 字段表与渲染 —— [`surface.tools.jobs`](../../surface/tools/jobs.md)。本页只把 `dsh-tool-jobs` 当 Consumer：`inject`、`attachController`、waterfall、`followup` / `inject`。
- `bash` / `pwsh` 的 spawn 世界与 `run_in_background` schema —— [`surface.tools.bash`](../../surface/tools/bash.md)。producer 只把 `ShellProcess` 钩进 `JobStart.run`。
- 子代理 provider / `start` / `startContinuable` —— [`subsys.orchestration.subagent`](./subagent.md)。one-shot 后台才进 jobs；continuable 走 `subagentId`，不经 `ctx.jobs`。
- `tools/pre-execute` → `execute` → `post-execute` 管线本身 —— [`subsys.core.tools`](../core/tools.md)。
- `ScopedLayers` / `createScope` 原语 —— [`subsys.core.scope`](../core/scope.md)。registry 只消费它们做 owner-relative 层。
- `leakedServices` / preset `isolate` 审计实现 —— [`subsys.composition.agent-presets`](../composition/agent-presets.md)。
- session jsonl / sqlite / projection。jobs **不是** persistence 子系统：`store` 是 `Map`，dispose 清空，没有写盘 API。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），`capability seam = Definition / Provider / Consumer`。`ctx.jobs` 坐在 **host 面**（进程级，和 `ctx.llm` / `ctx.subagents` 同层）；agent-preset 面只决定本会话要不要挂 `tool-jobs` 这组收集/停止控件。默认产品路径是 `dsh web`，本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/jobs/jobs/src/index.ts` | Definition：`JobRegistry`、`Context.jobs`；`new.target === JobRegistry` 时抛 |
| `packages/jobs/jobs/src/types.ts` | `JobKindMap`（shipped：`bash` / `subagent`）、`JobStart` / `JobHooks` / `JobSnapshot` |
| `packages/jobs/jobs/src/brand.ts` | `JobId` branded id；客户端可单独 import，不拉 `dsh-agent` |
| `packages/jobs/jobs/tests/service.spec.ts` | 抽象类当 plugin 失败；同 realm 第二份 `jobs` 失败 |
| `packages/jobs/jobs-local/src/index.ts` | Provider：`LocalJobRegistry`，RAM `Map`、controller 层、结算 |
| `packages/jobs/jobs-local/tests/jobs.spec.ts` | 无 controller 拒绝、owner 隔离、concurrency、teardown |
| `packages/jobs/jobs-local/tests/loader-composition.spec.ts` | 真 Loader 行能把 `maxConcurrentJobsPerOwner` 喂进 Provider |
| `packages/jobs/tool-jobs/src/index.ts` | 模型面 Consumer：`attachController('tool-jobs')` + `job_*` + `onJobDone` |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: jobs` → `dsh-jobs-local`；`id: tool-jobs` |
| `packages/bundle/web-app/cordis.patch.yml` | 留下 registry；`id: tool-jobs` `disabled: true` |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | Web 默认 preset 把 `tool-jobs` 挂回会话，**不** `isolate` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `JobRegistry` | `extends Service`；子类构造 `super(ctx, 'jobs')` 占唯一 service 名 `jobs`。抽象方法：`start` / `list` / `get` / `read` / `kill` / `wait` / `onJobDone` / `onJobsChanged` / `attachController`。[E: packages/jobs/jobs/src/index.ts:70] |
| `LocalJobRegistry` | shipped Provider。`store: Map<JobId, TrackedTask>`，对外只发 fresh `JobSnapshot`，从不交出可变记录。[E: packages/jobs/jobs-local/src/index.ts:91] [E: packages/jobs/jobs-local/src/index.ts:102] |
| `JobId` | branded 字符串。registry 发 `<kind>-N`（每 kind 一份计数器）。id 可预测，边界是授权不是保密。[E: packages/jobs/jobs/src/brand.ts:26] [E: packages/jobs/jobs-local/src/index.ts:153] |
| `JobKindMap` | shipped 两格：`bash`、`subagent`。其它包用 declaration merge 加格（`pwsh`、`pty-send`）。运行时 `start` 只拒空字符串。[E: packages/jobs/jobs/src/types.ts:24] [E: packages/jobs/jobs/src/types.ts:25] [E: packages/jobs/jobs-local/src/index.ts:135] |
| `JobStatus` | `running` → 可选 `stopping` → 恰好一个终态 `completed` / `killed` / `failed`。 |
| `JobStart` | `kind` + `label` + 可选 `owner` / `outputLimitBytes` + 同步 `run(): JobHooks`。preflight 失败不调 `run`、不占 id。 |
| `JobHooks` | `cancel(reason?)` 同步；`done: Promise<JobOutcome>` 不得 reject（reject 被收成 `failed`）；可选 `readOutput()` 表示 stream cursor。缺 `readOutput` = 终态才吐 `JobOutcome.output`。 |
| `JobSnapshot` | 只读投影：`id` / `kind` / `label` / `status` / `startedAt` / 可选 `finishedAt` / `detail` / `ownerSession` / `outputLimitBytes` / `reported`。 |
| `reported` | kill / 终态 read / 等到结算 / teardown cancel 置位。`onJobDone` 仍会火，但 notice 路径看到 `true` 就不再 `followup`。 |
| `Config`（Provider） | 仅 `maxConcurrentJobsPerOwner`（默认 10，按 **exact owner** 或共享 unowned 桶计 `running`+`stopping`）。[E: packages/jobs/jobs-local/src/index.ts:28] |
| `Config`（Consumer） | `waitTimeoutMs` / `maxWaitTimeoutMs` / `completionDelivery`（`wakeup`\|`quiet`）/ `maxConsecutiveWakes`。字段表归 T1。 |

本缝**不**声明 `jobs/*` 事件。augmentation 只往 `Context` 加 `jobs: JobRegistry`。[E: packages/jobs/jobs/src/index.ts:31]

## 控制流

1. **Definition 不能当 plugin。** `JobRegistry`@packages/jobs/jobs/src/index.ts 是抽象 `Service`。`abstract` 在运行时会被擦掉，组合行若写 `name: '@deepseek-ai/dsh-jobs'` 会 `new` 出一个没有方法体的 `ctx.jobs`。构造因此 fail-loud：`new.target === JobRegistry` 就抛，要求改加载 `dsh-jobs-local`。[E: packages/jobs/jobs/src/index.ts:67] [E: packages/jobs/jobs/src/index.ts:68] 测试用 `ctx.plugin(JobRegistry)` 钉死这句。[E: packages/jobs/jobs/tests/service.spec.ts:93] [E: packages/jobs/jobs/tests/service.spec.ts:94] 子类才走到 `super(ctx, 'jobs')`，Cordis `Service` 随即 `ctx.reflect.provide('jobs', self, …)`。[E: packages/jobs/jobs/src/index.ts:70] [E: vendor/cordis/src/service.ts:57]

2. **shipped 真树的行是 `id: jobs` → `dsh-jobs-local`。** `dsh-base` 在 host 根 `insert` 里挂 `id: jobs` / `name: '@deepseek-ai/dsh-jobs-local'`，没有 config 块（走默认 10）。[E: packages/bundle/base/cordis.patch.yml:69] [E: packages/bundle/base/cordis.patch.yml:70] manifest 依赖的是 `dsh-jobs-local`，不是 Definition 包本身。[E: packages/bundle/base/package.json:92] Loader 真树测试：yml 里写 `maxConcurrentJobsPerOwner: 1` 后，第二份 `start` 在 `run()` 之前就被拒。[E: packages/jobs/jobs-local/tests/loader-composition.spec.ts:49] [E: packages/jobs/jobs-local/tests/loader-composition.spec.ts:64] 同一 realm 再挂第二个 `JobRegistry` 子类，Cordis 抛 `service "jobs" has been registered`。[E: packages/jobs/jobs/tests/service.spec.ts:88]

3. **记录只在 RAM。** `LocalJobRegistry` 构造把 `store` 建成 `Map`，再 `ctx.effect(() => () => this.disposeAll(), 'jobs teardown')`。[E: packages/jobs/jobs-local/src/index.ts:102] [E: packages/jobs/jobs-local/src/index.ts:128] `disposeAll` 关 listener、cancel 活任务、await 结算，然后 `this.store.clear()`。[E: packages/jobs/jobs-local/src/index.ts:494] 没有 jsonl / sqlite / flush 路径。reload 进程 = 空表。

4. **无 controller，`start` 拒绝，且不调 `run()`。** `start` 第一件事是 `servesOwner(spec.owner)`：全局层（无 scope 的 host 注册）非空 → 服务**每一个** owner；否则只沿 owner 的 `scopeOf(owner.ctx)` 链找 scoped 层。[E: packages/jobs/jobs-local/src/index.ts:132] [E: packages/jobs/jobs-local/src/index.ts:316] [E: packages/jobs/jobs-local/src/index.ts:317] 找不到就抛 `background jobs unavailable: no job controller serves this agent (load @deepseek-ai/dsh-tool-jobs in its composition)`。[E: packages/jobs/jobs-local/src/index.ts:133] 测试：裸 `LocalJobRegistry`、以及「preset A 挂了 controller、preset B 没挂」的 B 侧 / unowned，全部命中这句。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:122] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:142] `spec.run()` 在限额检查之后才调用，controller 拒绝时不会启动 producer。[E: packages/jobs/jobs-local/src/index.ts:150] host 无 scope 的 `attachController` 才服务所有人。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:158]

5. **Consumer 用 `attachController` 开闸，不是 isolate 一份新 registry。** `dsh-tool-jobs` `export const inject = ['tools', 'jobs', 'systemPrompt']`，`apply` 里 `ctx.jobs.attachController('tool-jobs')`。[E: packages/jobs/tool-jobs/src/index.ts:22] [E: packages/jobs/tool-jobs/src/index.ts:260] `attachController` 把一个 `Symbol(name)` 推进**注册方 context 的** `ScopedLayers` 层，fiber dispose 带走。[E: packages/jobs/jobs-local/src/index.ts:299] [E: packages/jobs/jobs-local/src/index.ts:302] 测试：卸掉 `tool-jobs` fiber 后 `start` 再次抛 no controller；同名两次 `attachController` 独立计数，最后一个 disposer / fiber 走光才重新上锁。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:117] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:119] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:988]

6. **host / preset 切开：registry 留下，控件搬走。** `dsh-base` 同时插 `id: tool-jobs` / `name: '@deepseek-ai/dsh-tool-jobs'`（headless 就留在 host 全局层，controller 进 global layer）。[E: packages/bundle/base/cordis.patch.yml:218] [E: packages/bundle/base/cordis.patch.yml:219] `dsh-web-app` **不** disable `id: jobs`，只写 `id: tool-jobs` / `disabled: true`，把 `job_*` 从进程根挪到 preset 面。[E: packages/bundle/web-app/cordis.patch.yml:309] [E: packages/bundle/web-app/cordis.patch.yml:310] `standard` / `code` / `cordis` 再挂回同一行，**没有** `isolate:`——producer（`tool-bash` 等）用 `ctx.get('jobs')` 读 host 那一份，entry-local realm 对兄弟行不可见，会把 `run_in_background` 卡在「catalog 里有 `job_*`、start 却说 unavailable」。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:73] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:74] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:80] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:74] `minimal` 只挂 isolated `dsh-tool-bash-persistent` 与 `dsh-tool-str-replace-editor`，没有 `id: tool-jobs`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] [I]

7. **`isolate` / `leakedServices`：本缝的服务必须留在 host。** `LocalJobRegistry` `provide('jobs')`。若把 Provider 行塞进 preset 且漏 `isolate: { jobs: true }`，`leakedServices` 会把它判进 root realm，`mountPreset` 抛 `row(s) published process-global service(s) [jobs]; a preset service must sit behind an isolate realm or move to the host composition`。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:365] 即便包进 realm，兄弟 producer 行也 `ctx.get` 不到那份私有 `jobs`。正确切法是 host 一份 registry + preset 只挂不 `provide` 的 `tool-jobs`。`ScopedLayers` 不是 Cordis isolate：它只让 controller / listener 按 owner 的 scope 链可见，registry 实例仍是进程单例。

8. **`start` 的其余 preflight 仍是同步、失败零残留。** 过了 controller：空 `kind` / 空 `label` / 非法 `outputLimitBytes` 抛；有 `owner` 则要求 `ctx.agents` 在场且 `agents.get(ownerId) === owner`（换实例复用同一 session id 不能顶替注册）。[E: packages/jobs/jobs-local/src/index.ts:135] [E: packages/jobs/jobs-local/src/index.ts:452] [E: packages/jobs/jobs-local/src/index.ts:455] 当前 owner（或 unowned 桶）的 `running`+`stopping` ≥ 限额则抛，**此时尚未**调用 `spec.run()`。[E: packages/jobs/jobs-local/src/index.ts:144] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:192] 限额默认 10。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:191] 然后才 `const hooks = spec.run()`；`run` 抛则 `store.set` 还没发生，计数器也不动。[E: packages/jobs/jobs-local/src/index.ts:150] 成功则发 id、`store.set`、挂 `hooks.done.then(settle)`，再 `notifyChanged`。[E: packages/jobs/jobs-local/src/index.ts:176] [E: packages/jobs/jobs-local/src/index.ts:188]

9. **两种 shipped kind：`bash` 是 stream，`subagent` 是终态输出。** `dsh-tool-bash` 在 `run_in_background === true` 时 `ctx.get('jobs')`，缺服务就抛；`jobs.start({ kind: 'bash', label: args.command, owner?, run })` 的 `run` 里才 `ctx.shell.start`，并提供 `readOutput`。[E: packages/shell/tool-bash/src/index.ts:354] [E: packages/shell/tool-bash/src/index.ts:366] [E: packages/shell/tool-bash/src/index.ts:367] `dsh-tool-subagent` 仅 one-shot 后台走 jobs：`kind: 'subagent'`，`run` 调 `ctx.subagents.start`，**没有** `readOutput`（中间细节在子 session）。[E: packages/subagent/tool-subagent/src/index.ts:407] [E: packages/subagent/tool-subagent/src/index.ts:410] continuable 走 `startContinuable`，返回 `subagentId`，不进 registry。[E: packages/subagent/tool-subagent/src/index.ts:392] 测试钉死 id 分配：`bash-1` / `bash-2` / `subagent-1` 分计数器。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:266] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:268] `pwsh` / `pty-send` 是 producer 自己 merge 进 `JobKindMap` 的扩展格，不是 Definition 预置。

10. **模型路径上的 waterfall 在 `ctx.tools`，本缝没有 `jobs/*`。** `job_*` 进 body 之前，`ToolRuntime` 调 `this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。[E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1477] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；listener 不调用传入的 `next()` 就不会 `cbs.shift()`，默认 `allow` 到不了，body 不跑。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] `dsh-tool-jobs` 自己 `prepend` 挂在这条 waterfall 上：记下 `outputLimitBytes` 后 **必须** `return next()`。[E: packages/jobs/tool-jobs/src/index.ts:233] [E: packages/jobs/tool-jobs/src/index.ts:236] 这不是 reject 路径；故意不 `next()` 会让整次 `job_output` / `job_kill` 卡死在本层。`tools/execute` / `tools/post-execute` 同一规则，细节在 [`subsys.core.tools`](../core/tools.md)。

11. **访问篱笆是 session id，不是 id 保密。** `assertAccess`：有 owner 的 job，caller 必须 `caller.id === job.owner.id`；unowned 对任何 caller 开放；无 agent 的 caller 读不到 owned job。[E: packages/jobs/jobs-local/src/index.ts:357] [E: packages/jobs/jobs-local/src/index.ts:358] `list(caller)` 只返回 caller-owned ∪ unowned。[E: packages/jobs/jobs-local/src/index.ts:195] 测试：alice 看不见 bob 的 id，却看得见 unowned；跨 session `read` / `kill` / `wait` 抛 `belongs to another session`。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:574] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:591]

12. **结算 first-wins，先改可见集，最后才 `onJobDone`。** `settle` 若已终态直接 return；否则写入 status / detail / output / `finishedAt`。当时还有 waiter 就把 `reported = true`（wait 已经把终态交给模型，notice 不再重复叫）。[E: packages/jobs/jobs-local/src/index.ts:417] [E: packages/jobs/jobs-local/src/index.ts:422] 然后释放 waiter、`notifyChanged`，**最后**才沿 global → owner scope 链跑 `onJobDone`；listener 抛错被 contain，返回的 Promise 只观察不等待。[E: packages/jobs/jobs-local/src/index.ts:428] [E: packages/jobs/jobs-local/src/index.ts:430] 顺序测试钉死 `['changed', 'done']`，因为 reporter 可能同步 `followup` 开 turn，客户端必须已经读到终态行。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:709] `kill` 先 `cancel` 再标 `stopping`+`reported`：`cancel` 抛则状态一字不动。[E: packages/jobs/jobs-local/src/index.ts:223] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:435] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:438]

13. **`onJobDone` 的模型投递在 Consumer，不在 registry。** `dsh-tool-jobs` 注册 listener：`snapshot.reported` 或 `owner === undefined` 直接 return；否则组一条 `source.kind === 'plugin'` / `plugin: 'tool-jobs'` / `form: 'notice'` 的 user message。idle + `wakeup` + 未耗尽 `maxConsecutiveWakes` → `owner.followup`；否则 `owner.inject`（busy 一律 inject，让同批结算只占下一步）。[E: packages/jobs/tool-jobs/src/index.ts:280] [E: packages/jobs/tool-jobs/src/index.ts:296] [E: packages/jobs/tool-jobs/src/index.ts:299] `wakeup` 时还听 `agent/inbox/claimed`：只有 `message.source.kind === 'user'` 才清 wake 预算；plugin notice 自己 claim 不会给自己回血。[E: packages/jobs/tool-jobs/src/index.ts:225] [E: packages/jobs/tool-jobs/src/index.ts:228] 这是普通 `ctx.on`，不是 waterfall，没有 `next()`。

14. **owner dispose / service dispose 都是 teardown cancel。** 第一次为某 live `Agent` `start` 时，`ensureOwnerCleanup` 在 **owner 的** fiber 上挂 `jobs.ownerCleanup()`：scope 卸掉就 `cancelForTeardown(..., 'owner disposed')`、await `settled`、从 `store` 删除并 `notifyChanged`。[E: packages/jobs/jobs-local/src/index.ts:462] [E: packages/jobs/jobs-local/src/index.ts:469] teardown 先把 `reported = true` 再 `cancel`，避免 disposing owner 被 wakeup 花一次模型请求；`cancel` 抛则 force-fail 该记录并 warn orphan，不等 `done`。[E: packages/jobs/jobs-local/src/index.ts:517] [E: packages/jobs/jobs-local/src/index.ts:528] service `disposeAll` 先 `listenersClosed = true`（后到的 settlement 不再通知），reason 是 `jobs service disposed`。[E: packages/jobs/jobs-local/src/index.ts:484] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:880]

15. **host UI 也是 Consumer，读同一份 RAM 表。** `dsh-web-app` 插 `id: ui-jobs`；`api-proxy` 在 mux 上 `jobs.onJobsChanged`，按 owner（或 unowned 时每个 session）推 `session/jobs` 视图。[E: packages/bundle/web-app/cordis.patch.yml:237] [E: packages/host/apiproxy/src/api-proxy.ts:3509] 视图故意丢掉 `ownerSession` / `reported` / `outputLimitBytes`。本页不写客户端字段。

## 设计动机

- **合同与实现拆开。** producer 与 `tool-jobs` import `@deepseek-ai/dsh-jobs` 的类型，不 import `jobs-local`。换世界 = 换 bundle 行的实现类；模型工具名仍由 Consumer 写进 `ctx.tools`。抽象包装成 plugin 会登记一个空壳，所以构造直接炸。
- **controller 是「谁能收尸」的门，不是「谁能 spawn」。** 没有收集/停止面就允许 `start`，等于留下 owner 看不见的活进程。门按 **注册方 scope** 开，所以 preset A 的 `tool-jobs` 不会给 preset B 开闸；host 全局层（headless 那条）才服务所有人。
- **一份 host registry，不要 per-preset isolate。** producer 和 controls 是兄弟行。`ctx.get('jobs')` 必须看见同一实例。owner 已经在记录里，隔离靠 session id + `ScopedLayers`，不靠第二份 `provide('jobs')`。
- **RAM only。** job 是活句柄（cancel 闭包、`readOutput` cursor、`done` Promise），不是 session 事件。把它写进 jsonl 既复活不了进程，也会和 `model-visible ⟺ logged` 抢权威：模型该看见的完成，走 inbox notice / `job_output` 文本，那些已经在 session log 里。
- **结算先可见、后通知。** `onJobDone` 可以同步 `followup`。若 listener 先跑，Web 的 `session/jobs` 还停在 `running`，UI 会在终态 turn 上画出活行。
- **和 peer harness 差在缝，不差在「会不会后台跑命令」。** Codex / Claude 把后台任务焊在各自 tool runtime 里。DSH 把它提成可替换 host 服务：换 Provider 带走所有 `inject: 'jobs'` 的插件；`bash` / `subagent` 工具名可以不变。

## Gotcha

- 组合里写 `name: '@deepseek-ai/dsh-jobs'`：load 期抛 abstract-seam，不会默默落到 `jobs-local`。[E: packages/jobs/jobs/tests/service.spec.ts:94]
- 只装 registry、不装 `tool-jobs`：`start` 永远拒绝。producer 报错文案会点名 `dsh-tool-jobs`。[E: packages/jobs/jobs-local/src/index.ts:133]
- 只在 preset 里 `isolate: { jobs: true }` 包 registry：兄弟 `tool-bash` 的 `ctx.get('jobs')` 是 `undefined`，`run_in_background` 变成「工具在、jobs 不在」。不 isolate 又会撞 `leakedServices`。正解是别搬 Provider。
- `minimal` 在 web 下没有 `tool-jobs`。它的模型 `bash` 是 `dsh-tool-bash-persistent`（`ctx.terminals`），不经本缝。
- `stopping` 仍占 concurrency 桶。`kill` 之后立刻 `start` 替换件会撞限额，要等 producer `done`。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:219]
- `wait` 超时返回 `running` 且 **不** 标 `reported`；等到结算则标 `reported`，`onJobDone` 仍火但 notice 被压。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:466] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:458]
- owner 必须是 `ctx.agents` 里**当前**那一个实例。同 session id 的旧对象再 `start` 会抛，但按 id 做 `list` 仍能看见新 owner 的活 job。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:649]
- `JobKind` 是类型并集。测试里 merge 一个 `workflow` 也能拿到 `workflow-1`；runtime 不查表，只查非空。不要把「类型里有两格」读成「registry 白名单只有两格」。[E: packages/jobs/jobs-local/tests/jobs.spec.ts:269]
- continuable `subagent` 不进 jobs。在 `job_list` 里找 `subagent_fork` / `startContinuable` 的孩子会落空。
- 本缝没有 `jobs/*` waterfall。拦截后台启动只能拦在 producer 的 `tools/pre-execute`（必须 `next()`），或干脆不 `attachController`。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | 包 `@deepseek-ai/dsh-jobs`。`JobRegistry` 构造 `super(ctx, 'jobs')` → `ctx.jobs`。导出 `JobId` / `JobKindMap` / `JobStart`。**不是** composition 行；当 plugin 加载抛错。无 `jobs/*` waterfall、无 plugin Config。 |
| **Provider（host）** | 包 `@deepseek-ai/dsh-jobs-local`。`LocalJobRegistry extends JobRegistry`。base 行 `id: jobs` `name: '@deepseek-ai/dsh-jobs-local'`。web / headless **都不** disable 这一行。Config 只有 `maxConcurrentJobsPerOwner`。RAM `Map`。 |
| **Consumer（模型面 / preset）** | `@deepseek-ai/dsh-tool-jobs`：`inject = ['tools', 'jobs', 'systemPrompt']`，`attachController('tool-jobs')`，注册 `job_output` / `job_list` / `job_kill`。base 先挂；web `disabled: true`；`standard` / `code` / `cordis` 再挂回且不 `isolate`。`minimal` 不挂。字段表在 [`surface.tools.jobs`](../../surface/tools/jobs.md)。 |
| **Consumer（producer）** | `dsh-tool-bash` → `kind: 'bash'`（stream）；`dsh-tool-subagent` one-shot 后台 → `kind: 'subagent'`（终态 output）。`dsh-tool-pwsh` / `dsh-tool-terminal` 用 declaration merge 扩 `pwsh` / `pty-send`。都是 `ctx.get('jobs')`，缺服务就抛，不 `inject: jobs`（避免没装 registry 时整个 tool 挂起）。 |
| **Consumer（host 进程内）** | `api-proxy` `onJobsChanged` 推 `session/jobs`；`dsh-client-ui-jobs` 画 session-header 列表。读同一份 host registry。 |

换 `ctx.jobs` 的实现会带走所有 `inject: 'jobs'` 的插件和所有 `ctx.get('jobs')` 的 producer；模型工具名可以不变。卸掉 `tool-jobs` 不会卸 registry，但会收走 controller，之后 `start` 全拒。

## Sources

- packages/jobs/jobs/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/jobs/jobs/src/brand.ts
- packages/jobs/jobs/package.json
- packages/jobs/jobs/tests/service.spec.ts
- packages/jobs/jobs-local/src/index.ts
- packages/jobs/jobs-local/package.json
- packages/jobs/jobs-local/tests/jobs.spec.ts
- packages/jobs/jobs-local/tests/loader-composition.spec.ts
- packages/jobs/tool-jobs/src/index.ts
- packages/jobs/tool-jobs/package.json
- packages/jobs/tool-jobs/tests/tool-jobs.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- packages/shell/tool-bash/src/index.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/core/tools/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/host/apiproxy/src/api-proxy.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.overview](../../spine/overview.md) — 组合主线与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 总图。
- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → agent preset` 叠层。
- [spine.turn-and-step](../../spine/turn-and-step.md) — `followup` / `inject` 如何进 inbox、开 turn。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute` 必须 `next()`。
- [surface.tools.jobs](../../surface/tools/jobs.md) — 模型可见 `job_*` 字段与渲染。
- [surface.tools.bash](../../surface/tools/bash.md) — `kind: 'bash'` producer。
- [surface.tools.subagent](../../surface/tools/subagent.md) — `kind: 'subagent'` one-shot 后台 producer。
- [subsys.orchestration.subagent](./subagent.md) — `ctx.subagents`；continuable 不经 jobs。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — `id: jobs` / `id: tool-jobs` 进 host 树。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md) — 留下 registry、disable 模型控件。
- [subsys.composition.agent-presets](../composition/agent-presets.md) — `leakedServices` 与 preset remount。
- [subsys.core.scope](../core/scope.md) — `ScopedLayers` / `scopeOf`，registry 用来做 owner-relative 层。
- [subsys.core.tools](../core/tools.md) — `ctx.tools` 与 waterfall。
