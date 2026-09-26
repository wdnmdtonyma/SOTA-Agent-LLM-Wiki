---
id: surface.tools.jobs
title: job_list / job_output / job_kill
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/jobs/tool-jobs/src/index.ts
  - packages/jobs/tool-jobs/src/render.ts
  - packages/jobs/tool-jobs/package.json
  - packages/jobs/tool-jobs/tests/tool-jobs.spec.ts
  - packages/jobs/jobs/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/jobs/jobs/src/view.ts
  - packages/jobs/jobs/package.json
  - packages/jobs/jobs-local/src/index.ts
  - packages/jobs/jobs-local/package.json
  - packages/jobs/jobs-local/tests/jobs.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/system-prompt/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/terminal/tool-terminal/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
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
  - surface.presets.code
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: 477b4f4205
---

> 模型可见名 `job_list` / `job_output` / `job_kill`；实现包 `@deepseek-ai/dsh-tool-jobs`（Cordis 插件名 `tool-jobs`）。三个工具只控制已登记的后台 job，不自己 `start()`；加载时给 `ctx.jobs` 挂上 controller，并把未收集的结算经 `jobs.events` 投递给 owning agent。

## 能回答的问题

- catalog 里的 `job_*` 三个名字分别是哪个 `defineTool`？Config 会不会改名？
- `job_output` 的 `wait` / `timeout_ms` 默认多久、封顶多少？超时会不会把 job 杀掉？
- `ctx.jobs` 的 Definition / Provider 是谁？preset 只挂工具时，host 上的 registry 还在吗？
- 没有 `@deepseek-ai/dsh-tool-jobs` 时 producer 为什么会报 `no job controller serves this agent`？
- `minimal` / `standard` / `ptc` / `cordis` 谁装本包？web-app 怎样 `disabled` host 行？
- 结算通知走 `followup` 还是 `inject`？`completionDelivery` 与 `maxConsecutiveWakes` 怎么限流？默认还有 wake 上限 3 吗？

## Identity

实现包 `@deepseek-ai/dsh-tool-jobs`，Cordis 插件导出名 `tool-jobs`。[E: packages/jobs/tool-jobs/package.json:2] [E: packages/jobs/tool-jobs/src/index.ts:30] `inject` 是 `['tools', 'jobs', 'systemPrompt']`：没有 `ctx.jobs` 时插件挂起，三个名字都不会进 catalog。[E: packages/jobs/tool-jobs/src/index.ts:31]

工厂是 `apply(ctx, config)`。裸 `{}` 用 `??` 填 `waitTimeoutMs = 30_000`、`maxWaitTimeoutMs = 600_000`、`completionDelivery = 'wakeup'`；`maxConsecutiveWakes` **没有**默认值（省略 = 无上限）。schemastery `Config` 与这组数字一致。[E: packages/jobs/tool-jobs/src/index.ts:192] [E: packages/jobs/tool-jobs/src/index.ts:193] [E: packages/jobs/tool-jobs/src/index.ts:194] [E: packages/jobs/tool-jobs/src/index.ts:195] [E: packages/jobs/tool-jobs/src/index.ts:60] [E: packages/jobs/tool-jobs/src/index.ts:61] [E: packages/jobs/tool-jobs/src/index.ts:62] [E: packages/jobs/tool-jobs/src/index.ts:63] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:167]

`Config` **不能**改 wire 名。三个名字写死在 `defineTool({ name })` 里：

| 模型可见名 | 注册点 | 角色 |
|---|---|---|
| `job_output` | `defineTool({ name: 'job_output' })` [E: packages/jobs/tool-jobs/src/index.ts:311] | 读输出；可选阻塞等到终端态 |
| `job_list` | `defineTool({ name: 'job_list' })` [E: packages/jobs/tool-jobs/src/index.ts:352] | 列出调用者可见的 running / 已结束 job |
| `job_kill` | `defineTool({ name: 'job_kill' })` [E: packages/jobs/tool-jobs/src/index.ts:372] | 请求取消；立刻返回，真正停下来才变成 `killed` |

`apply()` 另外做三件非 schema 的事：`ctx.jobs.attachController('tool-jobs')`（producer 的准入闸）；`ctx.systemPrompt.section({ name: 'tool:jobs', ... })`；`ctx.jobs.events.subscribe({ owners: 'scope' }, ...)` 投递 completion notice。[E: packages/jobs/tool-jobs/src/index.ts:247] [E: packages/jobs/tool-jobs/src/index.ts:250] [E: packages/jobs/tool-jobs/src/index.ts:271]

测试：加载后 `start()` 成功；卸掉 `toolsFiber` 后再 `start()` 抛 `no job controller serves this agent`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:136] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:138]

## 用途定位

本页是 **model-facing 控制面**，不是 job registry。模型用这三个工具收集、等待、杀掉已经由别的工具 `ctx.jobs.start` 出去的后台工作。典型 producer：`bash` 的后台命令（`kind: 'bash'`）、`subagent` 的 one-shot 后台孩子（`kind: 'subagent'`）、`terminal_send` 的后台发送（`kind: 'pty-send'`）。[E: packages/shell/tool-bash/src/index.ts:276] [E: packages/subagent/tool-subagent/src/index.ts:545] [E: packages/terminal/tool-terminal/src/index.ts:258]

`tool:jobs` section 要求模型：记住自己开出的 id；结算会 in-session 通知，禁止 busy-poll / sleep；交最终答案前用 `job_output` 收齐还相关的 job（只有真正被挡住才 `wait: true`）；不再需要的用 `job_kill`。[E: packages/jobs/tool-jobs/src/index.ts:253]

没有 controller 时 producer 不能登记工作：`LocalJobRegistry.start` 抛 `background jobs unavailable: no job controller serves this agent (load @deepseek-ai/dsh-tool-jobs in its composition)`。[E: packages/jobs/jobs-local/src/index.ts:209]

## 输入 schema

以插件默认 `Config` boot 后的三个 `defineTool.parameters` 为准。`Config` 只改 wait 数字与 completion 投递，**不**增删模型参数、**不**改名。

### `job_output`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `job_id` | `string` | 是 | 无 | schema 允许空串；`execute` 再拒 | producer `start()` 返回的 `<kind>-N`。[E: packages/jobs/tool-jobs/src/index.ts:316] [E: packages/jobs/tool-jobs/src/index.ts:170] |
| `wait` | `boolean` | 否 | 不传 = 非阻塞读 | 只有 `=== true` 才进入 `ctx.jobs.wait` | 等到终端态或超时。超时回 `[status: running]`，job 继续活着。[E: packages/jobs/tool-jobs/src/index.ts:317] [E: packages/jobs/tool-jobs/src/index.ts:339] |
| `timeout_ms` | `number` | 否 | `waitTimeoutMs`（默认 30000） | 仅在 `wait: true` 时有意义；再被 `maxWaitTimeoutMs`（默认 600000）夹住 | `Math.min(timeout_ms ?? waitDefault, waitCap)`。[E: packages/jobs/tool-jobs/src/index.ts:318] [E: packages/jobs/tool-jobs/src/index.ts:344] |

`defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`；等待期限是 `ctx.jobs.wait` 自己的 `deadline(..., TASK_WAIT_TIMEOUT)`，超时是状态，不是 `TOOL_TIMEOUT`。[E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/jobs/jobs-local/src/index.ts:30] [E: packages/jobs/jobs-local/src/index.ts:478]

`waitTimeoutMs > maxWaitTimeoutMs` 在 `apply()` 直接抛，插件装不上。[E: packages/jobs/tool-jobs/src/index.ts:201] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:163]

### `job_list`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| （无） | — | — | — | `parameters: {}` | 没有模型参数。[E: packages/jobs/tool-jobs/src/index.ts:354] |

可见集 = 调用者 session 拥有的 job **加上** unowned job；别人 session 的 label 不会出现。[E: packages/jobs/jobs-local/src/index.ts:308]

### `job_kill`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `job_id` | `string` | 是 | 无 | 同 `job_output`：空串在 `validateJobId` 抛 | 要取消的 id。[E: packages/jobs/tool-jobs/src/index.ts:375] |
| `reason` | `string` | 否 | 不传则 `kill(..., undefined)` | 原样记入 log 并转给 producer `cancel` | 测试：`reason: 'superseded'` → `cancels === ['superseded']`。[E: packages/jobs/tool-jobs/src/index.ts:376] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:564] |

`defineTool` 先按 ParameterSchemaSpec 校验类型 / required；空 `job_id` 过得了 schema，在 `validateJobId` 变成 errored result。[E: packages/core/tools/src/schema.ts:598] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:507]

## 输出 & 截断 / spill

三个工具对外的 job 对象都是 `PublicJobSnapshot`：`id` / `kind` / `label` / `status`（`running` \| `stopping` \| `completed` \| `killed` \| `failed`）/ 可选 `detail` / `startedAt` / 可选 `finishedAt`。`owner`、ring 坐标、`outputLimitBytes` 被 `publicJob` 剥掉。`detail` 取 live `progress`，否则终端 `detail`。[E: packages/jobs/tool-jobs/src/render.ts:12] [E: packages/jobs/tool-jobs/src/render.ts:38] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:534]

| 工具 | `output.schema` | `output.render`（模型看见的文本） |
|---|---|---|
| `job_output` | `{ text, job }` | 有增量用 `text`，否则 `(no new output)`；末行 `statusLine`（`[status: running]` 或 `[status: completed, exit code: 0]`）。[E: packages/jobs/tool-jobs/src/index.ts:330] [E: packages/jobs/tool-jobs/src/render.ts:56] |
| `job_list` | `PublicJobSnapshot[]` | 空列表 `(no background jobs)`；否则每行 `` `${id} [${kind}] ${status} — ${label}` ``。[E: packages/jobs/tool-jobs/src/index.ts:357] [E: packages/jobs/tool-jobs/src/index.ts:360] |
| `job_kill` | `{ outcome, job }`，`outcome` ∈ `cancellation-requested` \| `already-finished` | 活着：`requested cancellation of job ${id}`；已结束：`job ${id} had already finished ${statusLine}`。[E: packages/jobs/tool-jobs/src/index.ts:392] [E: packages/jobs/tool-jobs/src/index.ts:395] |

本包**不写 spill 文件**。截断走 `TextRetainer`：`job_output` / `job_kill` 的 `finalizeContent` 读该 job 的 `outputLimitBytes`（producer 在 `start` 时带上）。canonical `job_output` 渲染被保住时，body 尾部标 `[output truncated]`、status 行尽量留下；policy 改写过的单文本则标 `[result truncated]`。多块 / reasoning 内容不动。[E: packages/jobs/tool-jobs/src/index.ts:225] [E: packages/jobs/tool-jobs/src/index.ts:239] [E: packages/jobs/tool-jobs/src/index.ts:243] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:471]

流式 job（有 pull `output` 源）：每次 `job_output` 只给**模型游标之后**的 ring delta，空 delta 渲染 `(no new output)`。final-output job（无 pull 源，例如 one-shot subagent）：活着时 `text` 为空，结算后第一次读幂等返回 `JobOutcome.result`。[E: packages/jobs/jobs-local/src/index.ts:444] [E: packages/jobs/jobs-local/src/index.ts:447] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:492] `log` channel 的 chunk 不进模型 delta；`stderr` 收成一段 `[stderr]`。[E: packages/jobs/tool-jobs/src/render.ts:76]

`presentCall` 只服务 UI：三张 `card: 'generic'`（`job_output` / `job_list` 的 `kind: 'read'`，`job_kill` 的 `kind: 'execute'`）。模型看到的仍是 `output.render`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:662]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `JobRegistry` / `ctx.jobs` | 抽象 Service，`super(ctx, 'jobs')`。直接加载 `@deepseek-ai/dsh-jobs` 会抛，必须换实现。[E: packages/jobs/jobs/src/index.ts:91] [E: packages/jobs/jobs/src/index.ts:93] |
| Provider（shipped） | `LocalJobRegistry`（`@deepseek-ai/dsh-jobs-local`） | 进程内 Map；id 形如 `` `${kind}-${count}` ``；按 session id 篱笆授权。[E: packages/jobs/jobs-local/package.json:2] [E: packages/jobs/jobs-local/src/index.ts:231] [E: packages/jobs/jobs-local/src/index.ts:406] |
| Consumer（本页） | `@deepseek-ai/dsh-tool-jobs` | `attachController` + `list` / `read` / `wait` / `kill` / `get` + `events.subscribe`。 |
| Consumer（producer） | `tool-bash` / `tool-subagent` / `tool-terminal` | 只 `start()`。`owner` 是 session id，不是 Agent 对象。[E: packages/shell/tool-bash/src/index.ts:278] [E: packages/subagent/tool-subagent/src/index.ts:547] |

换掉 `ctx.jobs` provider 会带走：id 分配、session 篱笆、`maxConcurrentJobsPerOwner`（本地默认 10）、wait 的 `TASK_WAIT_TIMEOUT` 语义、controller / listener 的 scope 分层。三个 `defineTool` 不选存储实现。[E: packages/jobs/jobs-local/src/index.ts:33] [E: packages/jobs/jobs-local/src/index.ts:220]

`JobKindMap` 在 seam 里声明合并：基线是 `bash` 与 `subagent`；`tool-terminal` 并入 `pty-send`。registry 把 kind 当 id 前缀，不解释含义。[E: packages/jobs/jobs/src/view.ts:33] [E: packages/jobs/jobs/src/view.ts:34] [E: packages/terminal/tool-terminal/src/index.ts:21]

授权：`assertAccess` 比较 `job.owner.id` 与 `caller`（session id）。跨 session 读/等/杀抛 `job ${id} belongs to another session`；未知 id 抛 `unknown job ${id}`。unowned job 对任何调用者开放。[E: packages/jobs/jobs-local/src/index.ts:407] [E: packages/jobs/jobs-local/src/index.ts:396] [E: packages/jobs/jobs-local/tests/jobs.spec.ts:697]

controller 与 settlement 订阅按注册方 scope 分层：未 scoped 的 host 挂载服务所有 owner；preset scope 里挂的只服务该组合下的 agent。两个 preset 共用一个 host registry 时，结算只由 owner 所在那一层投递一次。[E: packages/jobs/jobs-local/src/index.ts:378] [E: packages/jobs/tool-jobs/src/index.ts:271]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute` → 定义上的 `finalizeContent`。[E: packages/core/tools/src/index.ts:1506] [E: packages/core/tools/src/index.ts:1605] [E: packages/core/tools/src/index.ts:1783]

对本家族的挂点：

- **本插件自己的 pre-execute：** `{ prepend: true }` 先记下 `job_output` / `job_kill` 目标 job 的 `outputLimitBytes`，供 `finalizeContent` 使用。`job_list` 不进这个 cap。[E: packages/jobs/tool-jobs/src/index.ts:220] [E: packages/jobs/tool-jobs/src/index.ts:162]
- **timeout（工具定义）：** 三个 `defineTool` 都没有 `timeoutMs`，timeout-policy 不包一层。`job_output` 的等待在 `LocalJobRegistry.wait`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **approval：** `inject` 没有 `approval`；没有按 `job_*` 名字特判。普通调用不 `ask`。
- **sandbox：** 不读 `ctx.sandbox` / `ctx.sandboxPolicy`。confine 是 producer（例如 sandboxed `bash`）的事。
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1305]
- **PTC：** `ptc` preset 仍装本包，但 scope 有效 `mode === 'ptc'` 且无 `parent` 的模型直调三个名字都会在进 waterfall 前 collapse，必须从 `run_code` 程序里调。[E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/core/tools/src/index.ts:1351]

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。`standard` / `ptc` / `cordis` 的 `tool-jobs` 行都**没有** `config:`、**没有** `disabled:`、**没有** `isolate:`——registry 必须留在 host，preset 只挂控制面，否则 `tool-bash` 的 `ctx.get('jobs')` 看不见同一实例。wiki 节点 `surface.presets.code` 是 PTC 预设的稳定别名。

| preset | 装 `@deepseek-ai/dsh-tool-jobs`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。yml 是 complete persona（`prefix`）+ `persistent-shell`，没有 filesystem / `tool-jobs` | — | 本包未出现 [E: packages/bundle/web-app/presets/minimal.patch.yml:14] [E: packages/bundle/web-app/presets/minimal.patch.yml:17] | — |
| `standard` | 是 | 无 | 无。顶层 consumer 行 [E: packages/bundle/web-app/presets/standard.patch.yml:32] [E: packages/bundle/web-app/presets/standard.patch.yml:33] | 插件默认（30s / 10min / `wakeup` / 无 wake 上限） |
| `ptc`（wiki id `surface.presets.code`） | 是（呈现改成 PTC `mode: ptc`） | 无 | 无 [E: packages/bundle/web-app/presets/ptc.patch.yml:32] [E: packages/bundle/web-app/presets/ptc.patch.yml:33] | 同默认 |
| `cordis` | 是 | 无 | 无 [E: packages/bundle/web-app/presets/cordis.patch.yml:35] [E: packages/bundle/web-app/presets/cordis.patch.yml:36] | 同默认 |

组合旁注（不是 preset 成员资格）：`dsh-base` insert 了 host `jobs` = `@deepseek-ai/dsh-jobs-local`，以及 host `tool-jobs` = `@deepseek-ai/dsh-tool-jobs`。[E: packages/bundle/base/cordis.patch.yml:88] [E: packages/bundle/base/cordis.patch.yml:89] [E: packages/bundle/base/cordis.patch.yml:274] [E: packages/bundle/base/cordis.patch.yml:275] `dsh-web-app` overlay 把 host `tool-jobs` 设 `disabled: true`，改由每个 session 的 preset remount；`jobs-local` 行不 disable，registry 留在 host。[E: packages/bundle/web-app/cordis.patch.yml:464] shipped profile 里只有 `web` 叠 `dsh-web-app` 并挂这四份 preset；`headless` / `sdk` / `sdk-minimal` / `acp` 不走这套 overlay，host 平面的 `tool-jobs` 行仍可能直接生效（以该 profile 的 bundle patch 为准）。

## execute() 走读

`defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，再进用户 `execute`。[E: packages/core/tools/src/schema.ts:598]

### `job_output`

1. `validateJobId@packages/jobs/tool-jobs/src/index.ts`：空串抛 `invalid job_id`；否则 brand 成 `JobId`。[E: packages/jobs/tool-jobs/src/index.ts:337] [E: packages/jobs/tool-jobs/src/index.ts:171]
2. `wait === true`：`timeout = Math.min(args.timeout_ms ?? waitDefault, waitCap)`，然后 `await ctx.jobs.wait(id, timeout, exec.agent?.id, exec.signal)`。[E: packages/jobs/tool-jobs/src/index.ts:344]
3. `LocalJobRegistry.wait`：未知 / 外 session 立刻抛。`timeoutMs` 必须是正有限数。已终端则直接返回投影。活着则计入 `waitResolvers`，用 `deadline(..., TASK_WAIT_TIMEOUT)` 等到 settle 或超时；超时 **resolve**（不 reject），job 仍 `running`。caller abort 在仍活着时 reject `wait aborted`。[E: packages/jobs/jobs-local/src/index.ts:332] [E: packages/jobs/jobs-local/src/index.ts:471] [E: packages/jobs/jobs-local/src/index.ts:491]
4. 无论 wait 与否，接着 `ctx.jobs.read(id, exec.agent?.id)`：消费 ring 游标；终端第一次读带上 `result`。结算期间若这次 wait 仍挂在 `waitResolvers` 里，settled 事件 `awaited: true`，notice listener 会跳过。[E: packages/jobs/tool-jobs/src/index.ts:346] [E: packages/jobs/jobs-local/src/index.ts:603]
5. `readBody` 把 chunks 收成模型 delta，再拼 optional `result`，返回 `{ text, job: publicJob(snapshot) }`。空 text 由 render 变成 `(no new output)`。[E: packages/jobs/tool-jobs/src/index.ts:183] [E: packages/jobs/tool-jobs/src/index.ts:331]
6. 测试：`wait: true` 等到 `done deal` + `[status: completed]`；`timeout_ms: 600_000` 被 20ms cap 夹住后仍是 `(no new output)\n[status: running]`；`bash-99` 是 isError 且文案含 `unknown job bash-99`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:492] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:502] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:510]

### `job_list`

1. `ctx.jobs.list(exec.agent?.id)`，按登记顺序。[E: packages/jobs/tool-jobs/src/index.ts:365]
2. `jobs.map(publicJob)`。无 agent 的调用者只看见 unowned。[E: packages/jobs/tool-jobs/src/index.ts:366] [E: packages/jobs/jobs/src/index.ts:117]
3. 测试：alice 看见自己的两个 bash + 一个 unowned `subagent-1`；bob 只看见那条 unowned。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:530] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:544]

### `job_kill`

1. `validateJobId(args.job_id)`。[E: packages/jobs/tool-jobs/src/index.ts:400]
2. `ctx.jobs.kill(id, exec.agent?.id, args.reason)`。活着：先 `cancel(reason)`（抛则状态不动），再标 `stopping`，返回 `'requested'`。已终端：返回 `'already-finished'`。[E: packages/jobs/tool-jobs/src/index.ts:402] [E: packages/jobs/jobs-local/src/index.ts:458] [E: packages/jobs/jobs-local/src/index.ts:461]
3. `result === 'requested'` 时把 id 记进 `killedByModel`，settlement notice 不再开 turn。[E: packages/jobs/tool-jobs/src/index.ts:405]
4. 再用 `ctx.jobs.get` 取**非消费** snapshot，不碰模型游标。[E: packages/jobs/tool-jobs/src/index.ts:407]
5. 映射：`result === 'already-finished'` → `outcome: 'already-finished'`，否则 `cancellation-requested`。[E: packages/jobs/tool-jobs/src/index.ts:409]
6. 测试：取消中 status 是 `stopping`、文案 `requested cancellation of job bash-1`；已完成后 `job_output` 仍能读到 `unread tail`。[E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:563] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:648] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:650]

### 结算通知（`jobs.events`，不是某个 `job_*` 的 execute）

1. `LocalJobRegistry.settle` first-wins：已终端则忽略迟到的 producer outcome。先释放 waiter，再发 `settled`（`awaited` 表示这次结算释放了至少一个还活着的 wait）。[E: packages/jobs/jobs-local/src/index.ts:577] [E: packages/jobs/jobs-local/src/index.ts:603]
2. 插件 listener：`killedByModel` 命中、`event.awaited`、`cause === 'teardown'`、或 `job.owner === undefined` 直接 return（模型自己的 kill/wait 已经带了终点，unowned / teardown 没有可读 inbox）。[E: packages/jobs/tool-jobs/src/index.ts:277] [E: packages/jobs/tool-jobs/src/index.ts:278]
3. 否则组一条 `source.kind === 'tool-jobs'` / `form: 'notice'` 的 user message。正文默认 `background job ${id} (${kind}: ${label}) finished ${statusLine}. Read its output with job_output.`，受 `outputLimitBytes` 裁剪，极端预算会只剩 `Done; job_output.` 甚至更短的 tail。[E: packages/jobs/tool-jobs/src/index.ts:290] [E: packages/jobs/tool-jobs/src/index.ts:126] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:891] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:992]
4. `delivery === 'wakeup' && owner.status === 'idle'`：无 `maxConsecutiveWakes` 则每次 `followup`；有预算且 `spent < wakeBudget` 则 `followup` 并 `spent += 1`；否则（busy owner、quiet 模式、预算用尽）`inject`。[E: packages/jobs/tool-jobs/src/index.ts:295] [E: packages/jobs/tool-jobs/src/index.ts:297] [E: packages/jobs/tool-jobs/src/index.ts:307]
5. 只有设了 wake 预算且 `delivery === 'wakeup'` 才登记 inbox listener。`message.source.kind === 'user'` 的 `agent/inbox/claimed` 才 `spentWakes.delete`。插件自己的 notice 不会给预算回血。[E: packages/jobs/tool-jobs/src/index.ts:211] [E: packages/jobs/tool-jobs/src/index.ts:215]
6. teardown `cancelForTeardown` 把 `settleCause = 'teardown'`，listener 因此跳过 notice；`cancel` 抛则 force-fail 记录并打 `work may be orphaned`。[E: packages/jobs/jobs-local/src/index.ts:670] [E: packages/jobs/jobs-local/src/index.ts:679]
7. `maxConsecutiveWakes` 必须是 safe integer；`Infinity` / `2.5` 在 `apply()` 抛。省略该字段表示无上限，quiet 模式也不注册 inbox listener。[E: packages/jobs/tool-jobs/src/index.ts:206] [E: packages/jobs/tool-jobs/src/index.ts:211] [E: packages/jobs/tool-jobs/tests/tool-jobs.spec.ts:168]

## 设计动机·edge

- **控制面与 registry 分平面。** 四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）都不把 `dsh-jobs-local` 装进 isolate realm。`start()` 与 `job_*` 必须看见同一 `ctx.jobs`，否则 catalog 里有控制工具、producer 却说 background unavailable。
- **通知替代轮询。** `tool:jobs` 明确禁止 busy-poll。`wait: true` 是「我被挡住了」的同步点，不是默认收集方式。
- **超时不是杀死。** `job_output` 等到 cap 只返回 `running`，与 `job_kill` 分开。也因此不能复用 `ToolDefinition.timeoutMs`（那会变成 `TOOL_TIMEOUT` isError）。
- **去重改走事件。** 模型自己的 `job_kill`、释放了 waiter 的 `wait`、teardown，都不再另开 notice。没有旧的 per-job `reported` 字段。
- **wake 预算默认关闭。** 省略 `maxConsecutiveWakes` 时每次 idle 结算都 `followup`。设了整数上限后，被 wakeup 的 turn 再 `start()` 一个立刻结束的 job 会再次 wakeup，超过上限降级 inject；人的输入才重置。
- **精确 owner，不是 session 替换。** `spentWakes` 的 key 是 `Agent` 实例。同 session 换 agent 有满预算；旧 owner 的 notice 不会改投到 replacement。[E: packages/jobs/tool-jobs/src/index.ts:200]
- **并发上限在 registry。** 每个精确 owner（以及共享 unowned 桶）默认最多 10 个 `running`+`stopping`。满了由 `start()` 拒绝，文案让模型去 `job_kill`。[E: packages/jobs/jobs-local/src/index.ts:220]
- **id 可预测，篱笆靠授权。** `<kind>-N` 不是秘密。跨 session 读会被拒，不是靠猜不到 id。
- **与 Codex / Claude 后台任务的方言。** 本页没有独立 `await` 工具名，也没有把 PTY 会话当成 job。PTY 会话走 `terminal_*`；一次后台 `terminal_send` 才登记 `pty-send-N`，再用本页三个名字收集。

## Sources

- packages/jobs/tool-jobs/src/index.ts
- packages/jobs/tool-jobs/src/render.ts
- packages/jobs/tool-jobs/package.json
- packages/jobs/tool-jobs/tests/tool-jobs.spec.ts
- packages/jobs/jobs/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/jobs/jobs/src/view.ts
- packages/jobs/jobs/package.json
- packages/jobs/jobs-local/src/index.ts
- packages/jobs/jobs-local/package.json
- packages/jobs/jobs-local/tests/jobs.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/system-prompt/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/shell/tool-bash/src/index.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/terminal/tool-terminal/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：后台 `subagent` 如何 `jobs.start({ kind: 'subagent' })`，再用本页 `job_output` 收结果。
- [jobs 运行时](../../subsystems/orchestration/jobs.md)（`subsys.orchestration.jobs`）：`ctx.jobs` Definition / `LocalJobRegistry` Provider，不是本页的三个模型 schema。
- [bash 一次性执行](bash.md)（`surface.tools.bash`）：后台命令的 `kind: 'bash'` producer。
- [subagent](subagent.md)（`surface.tools.subagent`）：one-shot 后台孩子的 `kind: 'subagent'` producer。
- [terminal_* 六件套](terminal.md)（`surface.tools.terminal`）：后台 `terminal_send` 的 `kind: 'pty-send'` producer。
- [PTC 预设](../../surface/presets/code.md)（`surface.presets.code`）：`presets/ptc.patch.yml`，`mode: ptc` 时直调 `job_*` 会被 collapse 进 `run_code`。
- [PTC 呈现](../../subsystems/core/code-mode.md)（`subsys.core.code-mode`）：权威 `packages/core/tools/src/ptc.ts`。
