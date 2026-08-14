---
id: surface.tools.jobs
title: job_list / job_output / job_kill
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/jobs/tool-jobs/src/index.ts
  - packages/jobs/tool-jobs/package.json
  - packages/jobs/tool-jobs/tests/tool-jobs.spec.ts
  - packages/jobs/jobs/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/jobs/jobs/package.json
  - packages/jobs/jobs-local/src/index.ts
  - packages/jobs/jobs-local/package.json
  - packages/jobs/jobs-local/tests/jobs.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/terminal/tool-terminal/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - job_list
  - job_output
  - job_kill
  - apply
  - inject
  - Config
  - CompletionDelivery
  - name
  - statusLine
  - publicJob
  - JobRegistry
  - LocalJobRegistry
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - spine.trace-subagent
  - subsys.orchestration.jobs
  - surface.tools.bash
  - surface.tools.subagent
  - surface.tools.terminal
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名 `job_list` / `job_output` / `job_kill`；实现包 `@deepseek-ai/dsh-tool-jobs`（Cordis 插件名 `tool-jobs`）。三个工具只控制已登记的后台 job，不自己 `start()`；加载时给 `ctx.jobs` 挂上 controller，并把未汇报的结算投递给 owning agent。

## 能回答的问题

- catalog 里的 `job_*` 三个名字分别是哪个 `defineTool`？Config 会不会改名？
- `job_output` 的 `wait` / `timeout_ms` 默认多久、封顶多少？超时会不会把 job 杀掉？
- `ctx.jobs` 的 Definition / Provider 是谁？preset 只挂工具时，host 上的 registry 还在吗？
- 没有 `@deepseek-ai/dsh-tool-jobs` 时 producer 为什么会报 `no job controller serves this agent`？
- `minimal` / `standard` / `code` / `cordis` 谁装本包？web-app 怎样 `disabled` host 行？
- 结算通知走 `followup` 还是 `inject`？`completionDelivery` 与 `maxConsecutiveWakes` 怎么限流？

## Identity

实现包 `@deepseek-ai/dsh-tool-jobs`，Cordis 插件导出名 `tool-jobs`。[E: packages/jobs/tool-jobs/package.json:2] [E: packages/jobs/tool-jobs/src/index.ts:21] `inject` 是 `['tools', 'jobs', 'systemPrompt']`：没有 `ctx.jobs` 时插件挂起，三个名字都不会进 catalog。[E: packages/jobs/tool-jobs/src/index.ts:22]

工厂是 `apply(ctx, config)`。裸 `{}` 用 `??` 填 `waitTimeoutMs = 30_000`、`maxWaitTimeoutMs = 600_000`、`completionDelivery = 'wakeup'`、`maxConsecutiveWakes = 3`；schemastery `Config` 的 default 与这组数字一致。[E: packages/jobs/tool-jobs/src/index.ts:205] [E: packages/jobs/tool-jobs/src/index.ts:206] [E: packages/jobs/tool-jobs/src/index.ts:207] [E: packages/jobs/tool-jobs/src/index.ts:208] [E: packages/jobs/tool-jobs/src/index.ts:209] [E: packages/jobs/tool-jobs/src/index.ts:49] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:132]

`Config` **不能**改 wire 名。三个名字写死在 `defineTool({ name })` 里：

| 模型可见名 | 注册点 | 角色 |
|---|---|---|
| `job_output` | `defineTool({ name: 'job_output' })` [E: packages/jobs/tool-jobs/src/index.ts:303] | 读输出；可选阻塞等到终端态 |
| `job_list` | `defineTool({ name: 'job_list' })` [E: packages/jobs/tool-jobs/src/index.ts:343] | 列出调用者可见的 running / 已结束 job |
| `job_kill` | `defineTool({ name: 'job_kill' })` [E: packages/jobs/tool-jobs/src/index.ts:363] | 请求取消；立刻返回，真正停下来才变成 `killed` |

`apply()` 另外做三件非 schema 的事：`ctx.jobs.attachController('tool-jobs')`（producer 的准入闸）；`ctx.systemPrompt.section({ name: 'tool:jobs', order: 106, ... })`；`ctx.jobs.onJobDone(...)` 投递 completion notice。[E: packages/jobs/tool-jobs/src/index.ts:260] [E: packages/jobs/tool-jobs/src/index.ts:264] [E: packages/jobs/tool-jobs/src/index.ts:279]

测试：加载后 `start()` 成功；卸掉 `toolsFiber` 后再 `start()` 抛 `no job controller serves this agent`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:117] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:119]

## 用途定位

本页是 **model-facing 控制面**，不是 job registry。模型用这三个工具收集、等待、杀掉已经由别的工具 `ctx.jobs.start` 出去的后台工作。典型 producer：`bash` 的 `run_in_background`（`kind: 'bash'`）、`subagent` 的 one-shot 后台孩子（`kind: 'subagent'`）、`terminal_send` 的后台发送（`kind: 'pty-send'`）。[E: packages/shell/tool-bash/src/index.ts:365] [E: packages/shell/tool-bash/src/index.ts:366] [E: packages/subagent/tool-subagent/src/index.ts:406] [E: packages/subagent/tool-subagent/src/index.ts:407] [E: packages/terminal/tool-terminal/src/index.ts:255] [E: packages/terminal/tool-terminal/src/index.ts:256]

`tool:jobs` section 要求模型：记住自己开出的 id；结算会 in-session 通知，禁止 busy-poll / sleep；交最终答案前用 `job_output` 收齐还相关的 job（只有真正被挡住才 `wait: true`）；不再需要的用 `job_kill`。[E: packages/jobs/tool-jobs/src/index.ts:266]

没有 controller 时 producer 不能登记工作：`LocalJobRegistry.start` 抛 `background jobs unavailable: no job controller serves this agent (load @deepseek-ai/dsh-tool-jobs in its composition)`。[E: packages/jobs/jobs-local/src/index.ts:133]

## 输入 schema

以插件默认 `Config` boot 后的三个 `defineTool.parameters` 为准。`Config` 只改 wait 数字与 completion 投递，**不**增删模型参数、**不**改名。

### `job_output`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `job_id` | `string` | 是 | 无 | schema 允许空串；`execute` 再拒 | producer `start()` 返回的 `<kind>-N`。[E: packages/jobs/tool-jobs/src/index.ts:310] [E: packages/jobs/tool-jobs/src/index.ts:193] |
| `wait` | `boolean` | 否 | 不传 = 非阻塞读 | 只有 `=== true` 才进入 `ctx.jobs.wait` | 等到终端态或超时。超时回 `[status: running]`，job 继续活着。[E: packages/jobs/tool-jobs/src/index.ts:311] [E: packages/jobs/tool-jobs/src/index.ts:332] |
| `timeout_ms` | `number` | 否 | `waitTimeoutMs`（默认 30000） | 仅在 `wait: true` 时有意义；再被 `maxWaitTimeoutMs`（默认 600000）夹住 | `Math.min(timeout_ms ?? waitDefault, waitCap)`。[E: packages/jobs/tool-jobs/src/index.ts:312] [E: packages/jobs/tool-jobs/src/index.ts:333] |

`defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`；等待期限是 `ctx.jobs.wait` 自己的 `deadline(..., TASK_WAIT_TIMEOUT)`，超时是状态，不是 `TOOL_TIMEOUT`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/jobs/jobs-local/src/index.ts:250]

`waitTimeoutMs > maxWaitTimeoutMs` 在 `apply()` 直接抛，插件装不上。[E: packages/jobs/tool-jobs/src/index.ts:216] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:128]

### `job_list`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| （无） | — | — | — | `parameters: {}` | 没有模型参数。[E: packages/jobs/tool-jobs/src/index.ts:345] |

可见集 = 调用者 session 拥有的 job **加上** unowned job；别人 session 的 label 不会出现。[E: packages/jobs/jobs-local/src/index.ts:195]

### `job_kill`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `job_id` | `string` | 是 | 无 | 同 `job_output`：空串在 `validateJobId` 抛 | 要取消的 id。[E: packages/jobs/tool-jobs/src/index.ts:366] |
| `reason` | `string` | 否 | 不传则 `cancel(undefined)` | 原样记入 log 并转给 producer `cancel` | 测试：`reason: 'superseded'` → `cancels === ['superseded']`。[E: packages/jobs/tool-jobs/src/index.ts:367] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:401] |

`defineTool` 先按 ParameterSchemaSpec 校验类型 / required；空 `job_id` 过得了 schema，在 `validateJobId` 变成 errored result。[E: packages/core/tools/src/schema.ts:586] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:344]

## 输出 & 截断 / spill

三个工具对外的 job 对象都是 `PublicJobSnapshot`：`id` / `kind` / `label` / `status`（`running` \| `stopping` \| `completed` \| `killed` \| `failed`）/ 可选 `detail` / `startedAt` / 可选 `finishedAt`。`ownerSession`、`reported`、`outputLimitBytes` 被 `publicJob` 剥掉。[E: packages/jobs/tool-jobs/src/index.ts:86] [E: packages/jobs/tool-jobs/src/index.ts:77] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:193]

| 工具 | `output.schema` | `output.render`（模型看见的文本） |
|---|---|---|
| `job_output` | `{ text, job }` | 有增量用 `text`，否则 `(no new output)`；末行 `statusLine`（`[status: running]` 或 `[status: completed, exit code: 0]`）。[E: packages/jobs/tool-jobs/src/index.ts:320] [E: packages/jobs/tool-jobs/src/index.ts:325] [E: packages/jobs/tool-jobs/src/index.ts:103] |
| `job_list` | `PublicJobSnapshot[]` | 空列表 `(no background jobs)`；否则每行 `` `${id} [${kind}] ${status} — ${label}` ``。[E: packages/jobs/tool-jobs/src/index.ts:347] [E: packages/jobs/tool-jobs/src/index.ts:350] |
| `job_kill` | `{ outcome, job }`，`outcome` ∈ `cancellation-requested` \| `already-finished` | 活着：`requested cancellation of job ${id}`；已结束：`job ${id} had already finished ${statusLine}`。[E: packages/jobs/tool-jobs/src/index.ts:375] [E: packages/jobs/tool-jobs/src/index.ts:385] |

本包**不写 spill 文件**。截断走 `TextRetainer`：`job_output` / `job_kill` 的 `finalizeContent` 读该 job 的 `outputLimitBytes`（producer 在 `start` 时带上）。canonical `job_output` 渲染被保住时，body 尾部标 `[output truncated]`、status 行尽量留下；policy 改写过的单文本则标 `[result truncated]`。多块 / reasoning 内容不动。[E: packages/jobs/tool-jobs/src/index.ts:185] [E: packages/jobs/tool-jobs/src/index.ts:242] [E: packages/jobs/tool-jobs/src/index.ts:252] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:218] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:249]

流式 job（有 `readOutput`）：每次 `job_output` 只给**上一读之后**的 delta，空 delta 渲染 `(no new output)`。final-output job（无 `readOutput`）：活着时 `text` 为空，结算后幂等返回 `JobOutcome.output`。[E: packages/jobs/jobs-local/src/index.ts:208] [E: packages/jobs/jobs-local/src/index.ts:210] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:203]

`presentCall` 只服务 UI：三张 `card: 'generic'`（`job_output` / `job_list` 的 `kind: 'read'`，`job_kill` 的 `kind: 'execute'`）。模型看到的仍是 `output.render`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:499]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `JobRegistry` / `ctx.jobs` | 抽象 Service，`super(ctx, 'jobs')`。直接加载 `@deepseek-ai/dsh-jobs` 会抛，必须换实现。[E: packages/jobs/jobs/src/index.ts:31] [E: packages/jobs/jobs/src/index.ts:70] [E: packages/jobs/jobs/src/index.ts:68] |
| Provider（shipped） | `LocalJobRegistry`（`@deepseek-ai/dsh-jobs-local`） | 进程内 Map；id 形如 `` `${kind}-${count}` ``；按 session 篱笆授权。[E: packages/jobs/jobs-local/package.json:2] [E: packages/jobs/jobs-local/src/index.ts:91] [E: packages/jobs/jobs-local/src/index.ts:153] |
| Consumer（本页） | `@deepseek-ai/dsh-tool-jobs` | `attachController` + `list` / `read` / `wait` / `kill` / `get` + `onJobDone`。 |
| Consumer（producer） | `tool-bash` / `tool-subagent` / `tool-terminal` | 只 `start()`。缺 `ctx.jobs` 时 bash / subagent 自己抛 `load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs`。[E: packages/shell/tool-bash/src/index.ts:356] [E: packages/subagent/tool-subagent/src/index.ts:402] |

换掉 `ctx.jobs` provider 会带走：id 分配、session 篱笆、`maxConcurrentJobsPerOwner`（本地默认 10）、wait 的 `TASK_WAIT_TIMEOUT` 语义、controller / listener 的 scope 分层。三个 `defineTool` 不选存储实现。[E: packages/jobs/jobs-local/src/index.ts:28] [E: packages/jobs/jobs-local/src/index.ts:144]

`JobKindMap` 在 seam 里声明合并：基线是 `bash` 与 `subagent`；`tool-terminal` 并入 `pty-send`。registry 把 kind 当 id 前缀，不解释含义。[E: packages/jobs/jobs/src/types.ts:23] [E: packages/jobs/jobs/src/types.ts:24] [E: packages/jobs/jobs/src/types.ts:25] [E: packages/terminal/tool-terminal/src/index.ts:20]

授权：`assertAccess` 比较 `job.owner.id` 与 `caller.id`。跨 session 读/等/杀抛 `job ${id} belongs to another session`；未知 id 抛 `unknown job ${id}`。unowned job 对任何调用者开放。[E: packages/jobs/jobs-local/src/index.ts:357] [E: packages/jobs/jobs-local/src/index.ts:347] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:574] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:381]

controller 与 `onJobDone` 按注册方 scope 分层：未 scoped 的 host 挂载服务所有 owner；preset scope 里挂的只服务该组合下的 agent。两个 preset 共用一个 host registry 时，结算只由 owner 所在那一层投递一次。[E: packages/jobs/jobs-local/src/index.ts:315] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:549]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute` → 定义上的 `finalizeContent`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] [E: packages/core/tools/src/index.ts:1652]

对本家族的挂点：

- **本插件自己的 pre-execute：** `{ prepend: true }` 先记下 `job_output` / `job_kill` 目标 job 的 `outputLimitBytes`，供 `finalizeContent` 使用。`job_list` 不进这个 cap。[E: packages/jobs/tool-jobs/src/index.ts:233] [E: packages/jobs/tool-jobs/src/index.ts:186]
- **timeout（工具定义）：** 三个 `defineTool` 都没有 `timeoutMs`，timeout-policy 不包一层。`job_output` 的等待在 `LocalJobRegistry.wait`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **approval：** `inject` 没有 `approval`；`packages/interaction` 里也没有按 `job_*` 名字特判。普通调用不 `ask`。
- **sandbox：** 不读 `ctx.sandbox` / `ctx.sandboxPolicy`。confine 是 producer（例如 sandboxed `bash`）的事。
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1278]
- **Code Mode：** `code` preset 仍装本包，但 `mode: code` 时无 `parent` 的模型直调三个名字都会在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`。`standard` / `code` / `cordis` 的 `tool-jobs` 行都**没有** `config:`、**没有** `disabled:`、**没有** `isolate:`——registry 必须留在 host，preset 只挂控制面，否则 `tool-bash` 的 `ctx.get('jobs')` 看不见同一实例。

| preset | 装 `@deepseek-ai/dsh-tool-jobs`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。yml 只有 `persona`、`persistent-shell`、`filesystem` 三组 | — | 本包未出现 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:48] | — |
| `standard` | 是 | 无 | 无。顶层 consumer 行 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:73] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:74] | 插件默认（30s / 10min / `wakeup` / 3） |
| `code` | 是（呈现改成 Code Mode） | 无 | 无 [E: apps/cli/config/agent-presets/code/agent.cordis.yml:80] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:81] | 同默认 |
| `cordis` | 是 | 无 | 无 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:74] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:75] | 同默认 |

组合旁注（不是 preset 成员资格）：`dsh-base` insert 了 host `jobs` = `@deepseek-ai/dsh-jobs-local`，以及 host `tool-jobs` = `@deepseek-ai/dsh-tool-jobs`。[E: packages/bundle/base/cordis.patch.yml:69] [E: packages/bundle/base/cordis.patch.yml:70] [E: packages/bundle/base/cordis.patch.yml:218] [E: packages/bundle/base/cordis.patch.yml:219] `dsh-web-app` overlay 把 host `tool-jobs` 设 `disabled: true`，改由每个 session 的 preset remount；`jobs-local` 行不 disable，registry 留在 host。[E: packages/bundle/web-app/cordis.patch.yml:309] [E: packages/bundle/web-app/cordis.patch.yml:310] TUI 是否仍直接吃 host `tool-jobs` 行，本页标 [I]（web overlay 的分工注释这么写，未再核 TUI boot 源）。

## execute() 走读

`defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，再进用户 `execute`。[E: packages/core/tools/src/schema.ts:586]

### `job_output`

1. `validateJobId@packages/jobs/tool-jobs/src/index.ts`：空串抛 `invalid job_id`；否则 brand 成 `JobId`。[E: packages/jobs/tool-jobs/src/index.ts:331] [E: packages/jobs/tool-jobs/src/index.ts:197]
2. `wait === true`：`timeout = Math.min(args.timeout_ms ?? waitDefault, waitCap)`，然后 `await ctx.jobs.wait(id, timeout, exec.agent, exec.signal)`。[E: packages/jobs/tool-jobs/src/index.ts:333] [E: packages/jobs/tool-jobs/src/index.ts:334]
3. `LocalJobRegistry.wait`：未知 / 外 session 立刻抛。`timeoutMs` 必须是正有限数。已终端则标 `reported` 并返回。活着则计入 `waiters`，用 `deadline(..., TASK_WAIT_TIMEOUT)` 等到 settle 或超时；超时 **resolve**（不 reject），job 仍 `running`。caller abort 在仍活着时 reject `wait aborted`。[E: packages/jobs/jobs-local/src/index.ts:234] [E: packages/jobs/jobs-local/src/index.ts:263] [E: packages/jobs/jobs-local/src/index.ts:277]
4. 无论 wait 与否，接着 `ctx.jobs.read(id, exec.agent)`：流式走 `readOutput()`（消费游标）；final-output 活着给 `''`、结算后给 `output`。终端读会标 `reported`。[E: packages/jobs/tool-jobs/src/index.ts:336] [E: packages/jobs/jobs-local/src/index.ts:211]
5. 返回 `{ text, job: publicJob(snapshot) }`。空 text 由 render 变成 `(no new output)`。[E: packages/jobs/tool-jobs/src/index.ts:337]
6. 测试：`wait: true` 等到 `done deal` + `[status: completed]`；`timeout_ms: 600_000` 被 20ms cap 夹住后仍是 `(no new output)\n[status: running]`；`bash-99` 是 isError 且文案含 `unknown job bash-99`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:329] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:339] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:347]

### `job_list`

1. `ctx.jobs.list(exec.agent)`，按登记顺序。[E: packages/jobs/tool-jobs/src/index.ts:356]
2. `jobs.map(publicJob)`。无 agent 的调用者只看见 unowned。[E: packages/jobs/tool-jobs/src/index.ts:357] [E: packages/jobs/jobs/src/index.ts:90]
3. 测试：alice 看见自己的两个 bash + 一个 unowned `subagent-1`；bob 只看见那条 unowned。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:367] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:381]

### `job_kill`

1. `validateJobId(args.job_id)`。[E: packages/jobs/tool-jobs/src/index.ts:391]
2. `ctx.jobs.kill(id, exec.agent, args.reason)`。活着：先 `cancel(reason)`（抛则状态不动），再标 `stopping` + `reported`，返回 `'requested'`。已终端：只标 `reported`，返回 `'already-finished'`。[E: packages/jobs/tool-jobs/src/index.ts:392] [E: packages/jobs/jobs-local/src/index.ts:223] [E: packages/jobs/jobs-local/src/index.ts:225]
3. 再用 `ctx.jobs.get` 取**非消费** snapshot，不碰 `readOutput` 游标。[E: packages/jobs/tool-jobs/src/index.ts:394]
4. 映射：`result === 'already-finished'` → `outcome: 'already-finished'`，否则 `cancellation-requested`。[E: packages/jobs/tool-jobs/src/index.ts:396]
5. 测试：取消中 status 是 `stopping`、文案 `requested cancellation of job bash-1`；已完成后 `job_output` 仍能读到 `unread tail`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:396] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:400] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:487]

### 结算通知（`onJobDone`，不是某个 `job_*` 的 execute）

1. `LocalJobRegistry.settle` first-wins：已终端则忽略迟到的 producer outcome。有活着的 waiter 时先标 `reported`，再通知 listener。[E: packages/jobs/jobs-local/src/index.ts:417] [E: packages/jobs/jobs-local/src/index.ts:422]
2. 插件 listener：`snapshot.reported || owner === undefined` 直接 return（unowned、已 kill/wait/read 过终端、teardown 已认领，都不再开 turn）。[E: packages/jobs/tool-jobs/src/index.ts:280]
3. 否则组一条 `source.kind === 'plugin'` / `plugin: 'tool-jobs'` / `form: 'notice'` 的 user message。正文默认 `background job ${id} (${kind}: ${label}) finished ${statusLine}. Read its output with job_output.`，受 `outputLimitBytes` 裁剪，极端预算会只剩 `Done; job_output.` 甚至 `_output.`。[E: packages/jobs/tool-jobs/src/index.ts:288] [E: packages/jobs/tool-jobs/src/index.ts:150] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:698] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:799]
4. `delivery === 'wakeup' && owner.status === 'idle' && spent < wakeBudget` → `owner.followup` 并 `spent += 1`；否则 `owner.inject`（busy owner、quiet 模式、预算用尽都走这条）。[E: packages/jobs/tool-jobs/src/index.ts:294] [E: packages/jobs/tool-jobs/src/index.ts:296] [E: packages/jobs/tool-jobs/src/index.ts:299]
5. 只有 `message.source.kind === 'user'` 的 `agent/inbox/claimed` 才 `spentWakes.delete`。插件自己的 notice 不会给预算回血。[E: packages/jobs/tool-jobs/src/index.ts:228] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:680]
6. teardown `cancelForTeardown` 在 producer 跑之前就把 `reported = true`，避免对正在销毁的 owner 再花一次模型请求；`cancel` 抛则 force-fail 记录并打 `work may be orphaned`。[E: packages/jobs/jobs-local/src/index.ts:517] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:635] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:661]
7. `maxConsecutiveWakes` 必须是 safe integer；`Infinity` / `2.5` 在 `apply()` 抛。quiet 模式不注册 inbox listener，因为预算不会被花。[E: packages/jobs/tool-jobs/src/index.ts:221] [E: packages/jobs/tool-jobs/src/index.ts:224] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:155]

## 设计动机·edge

- **控制面与 registry 分平面。** 四个 shipped preset 都不把 `dsh-jobs-local` 装进 isolate realm。`start()` 与 `job_*` 必须看见同一 `ctx.jobs`，否则 catalog 里有控制工具、producer 却说 background unavailable。
- **通知替代轮询。** `tool:jobs` 明确禁止 busy-poll。`wait: true` 是「我被挡住了」的同步点，不是默认收集方式。
- **超时不是杀死。** `job_output` 等到 cap 只返回 `running`，与 `job_kill` 分开。也因此不能复用 `ToolDefinition.timeoutMs`（那会变成 `TOOL_TIMEOUT` isError）。
- **`reported` 去重。** kill、终端 wait、终端 read、teardown 都会认领报告，避免模型既在 tool result 里看见终点、又被 followup 再喊一次。
- **wake 预算防自激。** 被 wakeup 的 turn 再 `start()` 一个立刻结束的 job，会再次 wakeup。默认 3 次后降级 inject；人的输入才重置。
- **精确 owner，不是 session 替换。** `spentWakes` 的 key 是 `Agent` 实例。同 session 换 agent 有满预算；旧 owner 的 notice 不会改投到 replacement。[E: packages/jobs/tool-jobs/src/index.ts:214] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:855]
- **并发上限在 registry。** 每个精确 owner（以及共享 unowned 桶）默认最多 10 个 `running`+`stopping`。满了由 `start()` 拒绝，文案让模型去 `job_kill`。[E: packages/jobs/jobs-local/src/index.ts:146]
- **id 可预测，篱笆靠授权。** `<kind>-N` 不是秘密。跨 session 读会被拒，不是靠猜不到 id。
- **与 Codex / Claude 后台任务的方言。** 本页没有独立 `await` 工具名，也没有把 PTY 会话当成 job。PTY 会话走 `terminal_*`；一次后台 `terminal_send` 才登记 `pty-send-N`，再用本页三个名字收集。

## Sources

- packages/jobs/tool-jobs/src/index.ts
- packages/jobs/tool-jobs/package.json
- packages/jobs/tool-jobs/tests/tool-jobs.spec.ts
- packages/jobs/jobs/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/jobs/jobs/package.json
- packages/jobs/jobs-local/src/index.ts
- packages/jobs/jobs-local/package.json
- packages/jobs/jobs-local/tests/jobs.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/shell/tool-bash/src/index.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/terminal/tool-terminal/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：后台 `subagent` 如何 `jobs.start({ kind: 'subagent' })`，再用本页 `job_output` 收结果。
- [jobs 运行时](../../subsystems/orchestration/jobs.md)（`subsys.orchestration.jobs`）：`ctx.jobs` Definition / `LocalJobRegistry` Provider，不是本页的三个模型 schema。
- [bash 一次性执行](bash.md)（`surface.tools.bash`）：`run_in_background` 的 `kind: 'bash'` producer。
- [subagent](subagent.md)（`surface.tools.subagent`）：one-shot 后台孩子的 `kind: 'subagent'` producer。
- [terminal_* 六件套](terminal.md)（`surface.tools.terminal`）：后台 `terminal_send` 的 `kind: 'pty-send'` producer。
