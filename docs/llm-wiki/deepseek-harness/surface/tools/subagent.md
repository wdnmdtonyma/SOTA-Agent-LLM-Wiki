---
id: surface.tools.subagent
title: subagent
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/tool-subagent/package.json
  - packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-spawn-in-process/package.json
  - packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/run-settlement.ts
  - packages/subagent/subagent/package.json
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/system-prompt/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
symbols:
  - subagent
  - name
  - apply
  - inject
  - Config
  - SubagentRuntime
  - startContinuable
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.subagent-fork
  - surface.tools.subagent-control
  - spine.trace-subagent
  - subsys.orchestration.subagent
  - surface.tools.jobs
  - surface.tools.report
evidence: explicit
status: verified
updated: d347e70390
---

> 模型可见名 `subagent`（load-time `Config.toolName`，插件默认与 shipped preset 都写成这个字面量）；实现包 `@deepseek-ai/dsh-tool-subagent`（Cordis 插件名 `tool-subagent`）。shipped 行绑定 `provider: spawn` + `backgroundMode: continuable`：默认立刻回 durable child id，子代理在**自己的** session / system prompt 里干活，**不**继承父对话。

## 能回答的问题

- 模型目录里的 `subagent` 是哪个包、哪个 `toolName`、绑哪个 `ctx.subagents` provider？
- 默认 Config 与 shipped preset 各自怎样改 `run_in_background` 的广告与执行默认？
- 前台 / one-shot 后台 / continuable 三条返回分别长什么样？有没有 spill？
- `ctx.subagents`、`spawn` provider、`ctx.get('jobs')`、`ctx.systemPrompt` 各自给本工具提供什么？
- `minimal` / `standard` / `ptc` / `cordis` 谁装本行？registry / spawn backend 在 host 还是 preset？
- 一次 `execute()` 怎样走到 `startContinuable`，又怎样被 `run_in_background: false` 打回 one-shot `start`？

## Identity

Wire 名是 load-time `config.toolName ?? 'subagent'`。Schemastery `Config` 把 `toolName` 默认成 `'subagent'`；直接 `apply()` 绕过 schema 时同一 fallback 仍生效。[E: packages/subagent/tool-subagent/src/index.ts:106] [E: packages/subagent/tool-subagent/src/index.ts:318] Cordis 插件导出名是 `tool-subagent`，实现包是 `@deepseek-ai/dsh-tool-subagent`。[E: packages/subagent/tool-subagent/src/index.ts:43] [E: packages/subagent/tool-subagent/package.json:2]

工厂是 `apply(ctx, config)`：校验 `maxDepth` / 非空 `toolFilter`，算出 `backgroundEnabled` / `continuable` / `toolName`，再按 provider 生命周期 `ctx.tools.register(defineTool({ name: toolName, ... }))`。[E: packages/subagent/tool-subagent/src/index.ts:306] [E: packages/subagent/tool-subagent/src/index.ts:373] [E: packages/subagent/tool-subagent/src/index.ts:374]

`inject` 是 `['tools', 'subagents', 'systemPrompt', 'sessionProjections']`。没有 `ctx.subagents` 时插件挂起，catalog 里不会出现 `subagent`。[E: packages/subagent/tool-subagent/src/index.ts:43] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:661] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:637]

同一包可以装多次，每次一个不同 `toolName` 绑一个不同 provider。shipped spawn 行是 `toolName: subagent`；另有一行 `provider: fork` + `toolName: subagent_fork`，那是 [subagent-fork.md](subagent-fork.md)，本页不写 fork 的 execute。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:193] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:186] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:190] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:199]

工具注册**镜像 provider 生命周期**：`subagent/provider-added` 且名字等于 `config.provider` 才 `mount`；`subagent/provider-removed` 卸掉 `defineTool`。provider 尚未出现时 catalog 为空，logger 记一条 waiting note。[E: packages/subagent/tool-subagent/src/index.ts:573] [E: packages/subagent/tool-subagent/src/index.ts:576] [E: packages/subagent/tool-subagent/src/index.ts:587]

`backgroundEnabled && continuable` 时再挂 `ctx.systemPrompt.section`，名 `tool:${toolName}`，`order` 取 `getSectionOrder('TOOL_SUBAGENT')`（内建表 `2800`）。provider 未到或当前 scope 看不见该工具时 section 文本是空串，装配会丢掉它。[E: packages/subagent/tool-subagent/src/index.ts:587] [E: packages/subagent/tool-subagent/src/index.ts:594] [E: packages/core/system-prompt/src/index.ts:147]

## 用途定位

本工具把一条**自包含**任务交给 `ctx.subagents` 上名为 `config.provider` 的 backend。模型参数始终有展示用 `description`、子代理 user 消息 `prompt`、以及可选调度键 `run_in_background`。`provider` / `model` / `reasoning_effort` 只在 `modelSelectionSettings: true` 时进 schema（shipped `standard` / `ptc` / `cordis` 的 spawn 行打开了这项）；**没有** `type` / `outputSchema` 这些模型字段。[E: packages/subagent/tool-subagent/src/index.ts:384] [E: packages/subagent/tool-subagent/src/index.ts:394] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:191]

shipped 行是 `provider: spawn`。`SpawnInProcessProvider.inheritsParentContext === false`，所以 description 写：子代理「does not see this conversation」，必须给完整独立 prompt。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:50] [E: packages/subagent/tool-subagent/src/index.ts:271] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:447]

`backgroundMode: continuable`（shipped 覆盖；插件 schema 默认其实是 `one-shot`）时：模型不传 `run_in_background` 也走后台；`execute` 在孩子 inbox **接受**初始 prompt 后立刻回 durable `subagentId`，**不**等 turn 跑完，也**不**建 `ctx.jobs` Task。[E: packages/subagent/tool-subagent/src/index.ts:302] [E: packages/subagent/tool-subagent/src/index.ts:524] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1213] 孩子结束后 continuation manager 给父 agent 塞一条 `source.kind: 'subagent-settled'` notice；后续同一孩子用 [send_message / interrupt_agent / list_agents](subagent-control.md)，不是 `job_output`。[E: packages/subagent/subagent/src/continuation.ts:1645] [E: packages/subagent/tool-subagent/src/index.ts:379]

它**不是** `subagent_fork`（fork 会 seed 父对话已完成 turns）。`report` 工具包已删除，见退役页 [report.md](report.md)。

## 输入 schema

以**插件默认 `Config`** boot 为准：`toolName: 'subagent'`、`enableRunInBackground: true`、`backgroundMode: 'one-shot'`、`maxDepth: 3`、`modelSelectionSettings: false`；`provider` 必填、无默认。[E: packages/subagent/tool-subagent/src/index.ts:106] [E: packages/subagent/tool-subagent/src/index.ts:108] [E: packages/subagent/tool-subagent/src/index.ts:111] [E: packages/subagent/tool-subagent/src/index.ts:128] 该默认下 parameters 是 `description` + `prompt` + `run_in_background`，one-shot description 含 `job_output`。[E: packages/subagent/tool-subagent/src/index.ts:381] [E: packages/subagent/tool-subagent/src/index.ts:414]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `description` | `string` | 是 | 无 | schema `required: true` | UI 用的 3–5 词任务标签，进入 start 请求的 `label`，不进孩子 prompt。[E: packages/subagent/tool-subagent/src/index.ts:384] [E: packages/subagent/tool-subagent/src/index.ts:510] |
| `prompt` | `string` | 是 | 无 | schema `required: true` | 孩子的完整 user 文本。spawn 路径 wording：孩子不共享本对话，必须自包含。[E: packages/subagent/tool-subagent/src/index.ts:389] [E: packages/subagent/tool-subagent/src/index.ts:273] |
| `run_in_background` | `boolean` | 否 | **不传 = `false`**（one-shot 政策：`request.run_in_background ?? continuable`，此时 `continuable` 为假） | 仅当 `enableRunInBackground !== false` 时广告 | `true` 立刻回 `jobId`，用 `job_output` / `job_kill` 收/停。[E: packages/subagent/tool-subagent/src/index.ts:302] [E: packages/subagent/tool-subagent/src/index.ts:420] |
| `provider` / `model` / `reasoning_effort` | `string` | 否 | 省略则走 Config / 父路由 / provider `agentRouteDefaults` | 仅 `modelSelectionSettings: true` | shipped spawn 行打开；省略三者用孩子默认；`provider` 与 `model` 须成对。[E: packages/subagent/tool-subagent/src/index.ts:394] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:191] |

`defineTool` 先按 ParameterSchemaSpec 做类型 / required 校验。[E: packages/core/tools/src/schema.ts:588] 空串 `""` 能过 schema；execute 没有再 trim。

**`Config` / shipped preset 改广告：**

- **`backgroundMode: 'continuable'`**（`standard` / `ptc` / `cordis` 的 `tool-subagent` 行显式写出；插件默认**不是**这个值）：`run_in_background` 描述改成「Defaults to true」；工具 description 改成默认后台、立刻回 durable id、提到 `send_message`，**不再**提 `job_output` / `job_kill`。不传该键时 `runInBackground` 为真。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:192] [E: packages/subagent/tool-subagent/src/index.ts:418] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1218] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1224] provider 没有 `prepareContinuable` 时 mount 直接抛。[E: packages/subagent/tool-subagent/src/index.ts:339] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:52]
- **`enableRunInBackground: false`**：properties 只剩 `description` / `prompt`；execute 再拒一次 `run_in_background: true`（schema 省略挡不住 undeclared key）。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:92] [E: packages/subagent/tool-subagent/src/index.ts:296]
- **`toolName`**：改 wire 名。每个实例必须不同，否则 registry 拒重名。[E: packages/subagent/tool-subagent/src/index.ts:54] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:193]
- **`inheritsParentContext`**：来自**已挂上的 provider**，不是 Config。`true` 时 description / `prompt` 说明改成「inherits this conversation」（fork 用）；spawn 恒为 `false`。[E: packages/subagent/tool-subagent/src/index.ts:362] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:458]
- **`persona` / `toolFilter` / `agentOptions` / `maxDepth`**：只进 start / continuable 请求，**不**进模型 schema。loader 默认 `maxDepth: 3` 会 forward；`'provider-managed'` 则省略 cap。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1413] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1466]

## 输出 & 截断 / spill

`output.schema` 是 `oneOf` 三支，本工具**没有** spill、**没有**按字节截断孩子文本。[E: packages/subagent/tool-subagent/src/index.ts:423]

| `kind` | 字段 | `output.render` | 何时出现 |
|---|---|---|---|
| `continuable` | `subagentId` | `started subagent ${subagentId}` | `backgroundMode: continuable` 且后台路由 [E: packages/subagent/tool-subagent/src/index.ts:438] [E: packages/subagent/tool-subagent/src/index.ts:458] |
| `background` | `jobId` | `started background subagent job ${jobId}` | one-shot 后台；测试钉死 `jobId: 'subagent-1'` [E: packages/subagent/tool-subagent/src/index.ts:430] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:863] |
| `foreground` | `runId` + `output`（JSON block 数组） | 只拼接 `type: 'text'` 的 `text` | 前台等到 `stopReason: 'completed'` [E: packages/subagent/tool-subagent/src/index.ts:446] [E: packages/subagent/tool-subagent/src/index.ts:458] |

前台非 `completed`（`aborted` / `error` / `max-tokens` / `refusal` / 未知 stop reason）会 `throw`，registry 收成 `isError`；若孩子留下 text block，错误文案后面跟上 `Partial output before the run ended:`。[E: packages/subagent/tool-subagent/src/index.ts:156] [E: packages/subagent/tool-subagent/src/index.ts:193] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:166] `dispose` 失败不会吞掉独立的 result 失败，两边一起进 `AggregateError`。[E: packages/subagent/tool-subagent/src/index.ts:228] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:538]

continuable 后台**没有**这次 tool result 里的孩子答案。结算后父 inbox 收到 settlement 摘要加 closing message（或 `It left no closing message.`）。[E: packages/subagent/subagent/src/continuation.ts:1636] [E: packages/subagent/subagent/src/continuation.ts:1641]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `SubagentRuntime` / `ctx.subagents` | `super(ctx, 'subagents')`；`registerProvider` / `getProvider` / `start` / `startContinuable`。[E: packages/subagent/subagent/src/index.ts:201] [E: packages/subagent/subagent/package.json:2] |
| Provider（本页 shipped） | `SpawnInProcessProvider`（`@deepseek-ai/dsh-subagent-spawn-in-process`，插件名 `subagent-spawn-in-process`） | `inject = ['subagents']`；默认 `providerName: 'spawn'`；`inheritsParentContext = false`；`capabilities` 全开；one-shot `start` → `startInProcessRun(request, {})`；`prepareContinuable()` 回 `{}`（无 seed）。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:19] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:31] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:54] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:61] |
| Consumer | `@deepseek-ai/dsh-tool-subagent` | `config.provider` 选 backend；schema wording 读 `inheritsParentContext`；后台 continuable 调 `startContinuable`，否则 `start`。 |

换掉 `spawn` provider 会带走：孩子是否看到父对话、能否 `continuable`、depth / persona / toolFilter 是否可执行、one-shot 是同进程 `Agent` 还是远程进程。工具代码不选 runner。

其它消费：

- `ctx.tools`：`register` / 按 scope 查 section 是否该渲染。
- `ctx.systemPrompt`：仅 continuable+后台开关打开时挂 `tool:subagent`。
- `ctx.sessionProjections`：始终 `register` 子代理模型选择投影定义；设置采样只在 `modelSelectionSettings: true`。[E: packages/subagent/tool-subagent/src/index.ts:321]
- `ctx.get('jobs')`：仅 **one-shot 后台**。缺服务就失败，不静默改前台。[E: packages/subagent/tool-subagent/src/index.ts:532] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:930] `jobs.start({ kind: 'subagent' })` 的 id 前缀因此是 `subagent-N`。[E: packages/jobs/jobs/src/types.ts:25] [E: packages/subagent/tool-subagent/src/index.ts:538]
- `ctx.get('sessionPersistence')`：`startContinuable` 必有 persistence backend，否则 `PERSISTENCE_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:1706]
- `ctx.agents`：spawn one-shot 与 continuation manager 都在孩子创建窗口里 `create`；本工具 `inject` **不含** `agents` / `jobs`。

registry 与 spawn/fork backend 是 **host 面** process singleton（`dsh-base` 挂 `@deepseek-ai/dsh-subagent` + `@deepseek-ai/dsh-subagent-spawn-in-process`）。preset 只再挂模型可见工具行。[E: packages/bundle/base/cordis.patch.yml:334] [E: packages/bundle/base/cordis.patch.yml:337] [E: packages/bundle/base/cordis.patch.yml:340]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1333] [E: packages/core/tools/src/index.ts:1467] [E: packages/core/tools/src/index.ts:1565] [E: packages/core/tools/src/index.ts:1735] 本工具**不**自己挂 pre-execute listener。

对本工具的挂点：

- **timeout（工具定义）：** `defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59] 孩子自己的 LLM / 循环超时不是本工具 wrapper。
- **approval：** 普通调用不 `ask`。body 里也没有 `approveEscalation`。
- **sandbox：** 不挂 pre-execute。孩子若再调 `bash` / `write`，走那些工具自己的 body 升权，不是 `subagent` 的 schema。
- **checkpoint：** host `dsh-session-checkpoint-policy` 对**没有** `parent` 的 top-level 调用在 `tools/execute` 里先 `sessions.flush`。[E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** `isConcurrencySafe: () => true`，前台 / 后台 / continuable 都是 `parallel`。[E: packages/subagent/tool-subagent/src/index.ts:463] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:124]
- **PTC：** `ptc` preset 仍装本行，但 `mode: ptc` 时无 `parent` 的模型直调 `subagent` 在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:271] [E: packages/core/tools/src/index.ts:1372]

## Preset 装配

成员资格只认 `packages/preset/agent-presets/presets/*/agent.cordis.yml`。装上的三个 preset 都把本行放在 `delegation` 组；该组 `isolate` **只有** `workflowEngine: true`，**不** isolate `subagents`（registry 留在 host，工具用 `ctx.subagents` 解析它）。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:174] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:178]

| preset | 装 `@deepseek-ai/dsh-tool-subagent` 且 `toolName: subagent`？ | `disabled` | isolate / 关键 Config |
|---|---|---|---|
| `minimal` | **否**。整份文件只有 persona + persistent bash/pwsh + `str_replace_editor` | — | 无本包行 [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:9] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:86] |
| `standard` | 是，`id: tool-subagent` | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`modelSelectionSettings: true`、`backgroundMode: continuable` [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:186] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:190] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:192] |
| `ptc` | 是（呈现再收成 PTC / `run_code`） | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`modelSelectionSettings: true`、`backgroundMode: continuable`；另有 `tool-presentation` `mode: ptc` [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:187] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:191] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:193] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:271] |
| `cordis` | 是 | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`modelSelectionSettings: true`、`backgroundMode: continuable` [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:174] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:178] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:180] |

同组里还有 `toolName: subagent_codex` / `subagent_claude_code` 两行，三个装编排的 preset 都是 `disabled: true`（`maxDepth: provider-managed`）。复制 preset 去掉 `disabled` 才会进 catalog，本页不另开节点。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:209] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:212] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:214]

组合旁注（**不是** preset 成员资格）：`dsh-base` 也 insert 了 host 行 `tool-subagent`（同样 `provider: spawn` / `toolName: subagent` / `backgroundMode: continuable`），并挂 registry + spawn backend。[E: packages/bundle/base/cordis.patch.yml:355] [E: packages/bundle/base/cordis.patch.yml:358] [E: packages/bundle/base/cordis.patch.yml:360] `dsh-web-app` overlay 把 host `tool-subagent` 设 `disabled: true`，改由每个 session 的 preset remount。[E: packages/bundle/web-app/cordis.patch.yml:404] [E: packages/bundle/web-app/cordis.patch.yml:405] shipped profile 还有 `headless` / `sdk` / `sdk-minimal` / `acp`；其中 web 是把 host 工具行关掉、改走 preset 的那条。非 web 的 base-backed profile 仍吃 host 行。[I]

## execute() 走读

编号按 shipped `provider: spawn` + `backgroundMode: continuable` + `enableRunInBackground: true`（`standard` / `ptc` / `cordis`）的默认调用。`符号@文件` 标关键函数。

1. `defineTool` 包装的 `execute` 先 `validate`，再进用户 `execute`。[E: packages/core/tools/src/schema.ts:588]
2. `execute@packages/subagent/tool-subagent/src/index.ts`：没有 `exec.agent` 立刻抛 `subagent tool requires a calling agent`（非 agent 调用没有委托所有权）。[E: packages/subagent/tool-subagent/src/index.ts:468] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:334]
3. 组 start 请求形状：`label = args.description`；`prompt = [{ type: 'text', text: args.prompt }]`；`parent = exec.agent`；解析后的 `agentOptions` / Config 里有的 `persona` / `toolFilter` 才 spread；数值 `maxDepth` 才放进请求（`'provider-managed'` 不放）。[E: packages/subagent/tool-subagent/src/index.ts:509]
4. `resolveDelegationRun@packages/subagent/tool-subagent/src/index.ts`：`runInBackground = args.run_in_background ?? continuable`。shipped 下 `continuable === true`，模型省略该键 → 后台。[E: packages/subagent/tool-subagent/src/index.ts:302] [E: packages/subagent/tool-subagent/src/index.ts:519]
5. **默认后台 / continuable：** `ctx.subagents.startContinuable({ provider: config.provider, label, request, signal: exec.signal })`，回 `{ kind: 'continuable', subagentId: started.childId }`。[E: packages/subagent/tool-subagent/src/index.ts:523] [E: packages/subagent/tool-subagent/src/index.ts:529]
6. `SubagentRuntime.startContinuable@packages/subagent/subagent/src/index.ts` 转给 continuation manager。[E: packages/subagent/subagent/src/index.ts:229] `startContinuable@packages/subagent/subagent/src/continuation.ts`：要 persistence；`childId = randomUUID()`；`resolveChildDepth(parent, maxDepth)`（默认 cap 3，父 depth 0 → 孩子 1；`maxDepth: 0` 拒任何孩子）；descriptor `mode: 'continuable'` + `provider: spawn`；然后 `prepareContinuable('spawn')`。[E: packages/subagent/subagent/src/continuation.ts:442] [E: packages/subagent/subagent/src/continuation.ts:444] [E: packages/subagent/subagent/src/continuation.ts:446] [E: packages/subagent/subagent/src/child-agent.ts:49]
7. spawn 的 `prepareContinuable` 是 `Promise.resolve({})`，**不** seed 父历史。manager 自己 `materialize` 孩子 Agent、把初始 prompt 送进 inbox；**inbox 接受**后本 tool call 就返回，不等 turn、不等 session 落盘那条 user 消息。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:61] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:247] [E: packages/subagent/subagent/src/continuation.ts:438]
8. 孩子跑完：`notifySettlement` 在父仍拥有 Activation 时投递 notice（idle 父 `followup` 叫醒）。[E: packages/subagent/subagent/src/continuation.ts:1631] [E: packages/subagent/subagent/src/continuation.ts:1671]
9. **显式 `run_in_background: false`：** 即使 Config 是 continuable，也走 one-shot `ctx.subagents.start(config.provider, { ...request, signal: exec.signal })` + `settleForegroundRun`（等 `run.result`，再 `dispose`，**不**留 durable 孩子，也**不**建 job）。[E: packages/subagent/tool-subagent/src/index.ts:557] [E: packages/subagent/tool-subagent/src/index.ts:560] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1265]
10. **one-shot `start` 后端：** `SubagentRuntime.start` 校验 capabilities / `maxDepth`，`snapshotSubagentDescriptor({ mode: 'one-shot', provider })`，再 `SpawnInProcessProvider.start` → `startInProcessRun(request, {})`（新鲜 session，`parentSession` 血缘，depth+1）。[E: packages/subagent/subagent/src/index.ts:554] [E: packages/subagent/subagent-in-process-driver/src/index.ts:104] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:99]
11. **插件默认 `backgroundMode: 'one-shot'` 且 `run_in_background: true`：** 不走 `startContinuable`。`ctx.get('jobs')` 缺失则抛；否则 `jobs.start({ kind: 'subagent', owner: parent, run })`，`run()` 里才 `ctx.subagents.start`。[E: packages/subagent/tool-subagent/src/index.ts:538] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:863] 结算用 `runOutcome` 映到 job `completed` / `killed` / `failed`。[E: packages/subagent/subagent/src/run-settlement.ts:37]
12. `exec.signal` 是 one-shot 的规范取消通道（出版前拒 start，出版后 cancel 孩子）。continuable 准备阶段同一 signal 只管到 inbox 接受；接受之后 manager 自己管 Activation。[E: packages/subagent/subagent/src/types.ts:119] [E: packages/subagent/subagent/src/continuation.ts:412] 工具 signal 在 dispatch 前已 abort 时，registry 直接 `TOOL_ABORTED_BEFORE_DISPATCH`，body 不跑。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:632]

## 设计动机·edge

- **同包拆 wire 名，不拆页混写。** `subagent` 与 `subagent_fork` 都是 `@deepseek-ai/dsh-tool-subagent`，靠 `toolName` + `provider` 分开。fork 的历史 seed / `inheritsParentContext: true` 只在 [subagent-fork.md](subagent-fork.md)。
- **`backgroundMode: continuable` ≠ 每次调用都建 durable 孩子。** 它只改**后台路由**和默认是否后台。`run_in_background: false` 仍是一次性 `SubagentRun` + `dispose`。
- **continuable 不是 job。** 默认 shipped 路径 `ctx.jobs.list(parent)` 为空；`job_output` 收不到这个孩子。控制面是 [subagent-control.md](subagent-control.md) 的 `send_message` / `interrupt_agent` / `list_agents`。
- **spawn 孩子从零开始。** 自己的 session、`parentSession` 血缘、depth = 父 + 1；父 log 里已完成的 turns 不会进孩子。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:136] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:105]
- **深度预算在 runtime，工具保持可见。** 默认 cap 3；`maxDepth: 0` 禁止任何委托，但 catalog 里仍有 `subagent`，第一次 start 才 `SubagentDepthError`。[E: packages/subagent/subagent/src/child-agent.ts:32] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:146] 数值 cap 要求 provider `depthLimit`；spawn 有，缺能力则 mount 失败。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:45] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1428]
- **产品 provider 行默认关掉。** `subagent_codex` / `subagent_claude_code` 在 shipped preset `disabled: true`，不要把它们当成默认 catalog 成员。
- **`report` 已退役。** 包 `@deepseek-ai/dsh-tool-subagent-report` 已删除；base / preset 都不挂该行。见 [report.md](report.md)。
- **没有 `apply_patch` / Claude Agent / Codex subagent 方言。** 本工具只委托；文件改动仍是孩子自己的 `edit` / `write` / `bash`。
- **HMR / 晚到的 backend。** 工具纤维等 `subagent/provider-added`；纤维先 dispose 再来的 provider 不会 zombie-mount。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:423]
- **必须有调用方 Agent。** 无 `exec.agent` 不能委托。one-shot 后台 job 的 `owner` 也是这个 parent。
- **实验性 Agent Teams** 叠在 continuable 子代理上；opt-in profile 会关掉全局 `tool-subagent-control` / `list-agents`（名冲突），并把 host spawn/fork 工具改成 one-shot。那套模型名在 `surface.tools` 的 team 节点，不在本页。

## Sources

- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/tool-subagent/package.json
- packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent-spawn-in-process/package.json
- packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/run-settlement.ts
- packages/subagent/subagent/package.json
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/system-prompt/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：同一包、`toolName: subagent_fork`、`provider: fork`、继承父对话已完成 turns。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：continuable 孩子的后续 turn / 中断 / 列表。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：从本工具 `execute` 再拉起子 session 的端到端走读。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition / Provider，不是本页的模型 schema。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：仅 one-shot `run_in_background` 才走的 Task 收集面。
- [report](report.md)（`surface.tools.report`）：已退役；结算走 `subagent-settled` notice。
