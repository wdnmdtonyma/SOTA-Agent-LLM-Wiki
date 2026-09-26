---
id: surface.tools.subagent
title: subagent
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/tool-subagent/src/list-models.ts
  - packages/subagent/tool-subagent/src/model-selection-settings.ts
  - packages/subagent/tool-subagent/package.json
  - packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-spawn-in-process/package.json
  - packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/continuation-messages.ts
  - packages/subagent/subagent/src/continuation-activation.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/depth.ts
  - packages/subagent/subagent/src/run-settlement.ts
  - packages/subagent/subagent/src/descriptor.ts
  - packages/subagent/subagent/package.json
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/system-prompt/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/jobs/jobs/src/view.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - subagent
  - list_subagent_models
  - name
  - apply
  - inject
  - Config
  - SubagentRuntime
  - startContinuable
  - composeFrom
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
updated: 477b4f4205
---

> 模型可见名 `subagent`（load-time `Config.toolName`，插件默认与 shipped 行都写成这个字面量）；实现包 `@deepseek-ai/dsh-tool-subagent`（Cordis 插件名 `tool-subagent`）。shipped 行绑定 `provider: spawn` + `backgroundMode: continuable`：默认立刻回 durable child id。子代理在**自己的** session 里干活，**不**继承父对话；孩子 compose 走 `agentPresets.composeFrom` 加入父当前 standing revision，不是扫 `presets/*/agent.cordis.yml`。

## 能回答的问题

- 模型目录里的 `subagent` 是哪个包、哪个 `toolName`、绑哪个 `ctx.subagents` provider？`list_subagent_models` 何时出现？
- 默认 Config 与 shipped preset 各自怎样改 `run_in_background` 的广告与执行默认？
- 前台 / one-shot 后台 / continuable 三条返回分别长什么样？有没有 spill？
- `ctx.subagents`、`spawn` provider、`composeFrom`、`ctx.get('jobs')`、`ctx.systemPrompt` 各自给本工具提供什么？
- `minimal` / `standard` / `ptc` / `cordis` 谁装本行？registry / spawn backend 在 host 还是 preset？
- 一次 `execute()` 怎样走到 `startContinuable`，又怎样被 `run_in_background: false` 打回 one-shot `start`？

## Identity

Wire 名是 load-time `config.toolName ?? 'subagent'`。Schemastery `Config` 把 `toolName` 默认成 `'subagent'`；直接 `apply()` 绕过 schema 时同一 fallback 仍生效。[E: packages/subagent/tool-subagent/src/index.ts:108] [E: packages/subagent/tool-subagent/src/index.ts:323] Cordis 插件导出名是 `tool-subagent`，`inject` 是 `['tools', 'subagents', 'systemPrompt', 'sessionProjections']`，实现包是 `@deepseek-ai/dsh-tool-subagent`。[E: packages/subagent/tool-subagent/src/index.ts:44] [E: packages/subagent/tool-subagent/src/index.ts:45] [E: packages/subagent/tool-subagent/package.json:2]

工厂是 `apply(ctx, config, session?)`：校验 `maxDepth` / 非空 `toolFilter`，算出 `backgroundEnabled` / `continuable` / `toolName`，再按 provider 生命周期 `runtimeCtx.tools.register(defineTool({ name: toolName, ... }))`。[E: packages/subagent/tool-subagent/src/index.ts:313] [E: packages/subagent/tool-subagent/src/index.ts:379] [E: packages/subagent/tool-subagent/src/index.ts:380]

没有 `ctx.subagents` 时插件挂起，catalog 里不会出现 `subagent`。同一包可以装多次，每次一个不同 `toolName` 绑一个不同 provider。shipped spawn 行是 `toolName: subagent`；另有一行 `provider: fork` + `toolName: subagent_fork`，那是 [subagent-fork.md](subagent-fork.md)，本页不写 fork 的 execute。[E: packages/bundle/web-app/presets/standard.patch.yml:90] [E: packages/bundle/web-app/presets/standard.patch.yml:94] [E: packages/bundle/web-app/presets/standard.patch.yml:97]

| 模型可见 `name` | 何时登记 | 角色 |
|---|---|---|
| `subagent` | 名为 `config.provider` 的 provider 出现之后 | 本页 shipped 委托工具 |
| `list_subagent_models` | 仅当 `modelSelectionSettings: true` **且** 该 Session 采到打开的 allowlist policy | 发现子 agent 可用 LLM 路由；固定名，不随 `toolName` 改 [E: packages/subagent/tool-subagent/src/list-models.ts:88] [E: packages/subagent/tool-subagent/src/index.ts:362] |

工具注册**镜像 provider 生命周期**：`subagent/provider-added` 且名字等于 `config.provider` 才 `mount`；`subagent/provider-removed` 卸掉 `defineTool`。provider 尚未出现时 catalog 为空，logger 记一条 waiting note。[E: packages/subagent/tool-subagent/src/index.ts:579] [E: packages/subagent/tool-subagent/src/index.ts:582] [E: packages/subagent/tool-subagent/src/index.ts:592]

`backgroundEnabled && continuable` 时再挂 `ctx.systemPrompt.section`，名 `tool:${toolName}`，`order` 取 `getSectionOrder('TOOL_SUBAGENT')`（内建表 `2800`）。provider 未到或当前 scope 看不见该工具时 section 文本是空串。[E: packages/subagent/tool-subagent/src/index.ts:594] [E: packages/subagent/tool-subagent/src/index.ts:600] [E: packages/core/system-prompt/src/index.ts:148]

`Config.persona` 会进 start 请求；in-process 孩子用它 shadow `deployment:persona-prefix`。[E: packages/subagent/tool-subagent/src/index.ts:81] [E: packages/subagent/subagent/src/child-agent.ts:213]

`modelSelectionSettings: true` 要求 Host 上有 `ctx.subagentModelSelection`（`@deepseek-ai/dsh-tool-subagent/model-selection-settings`）；缺服务在 `apply()` 抛。[E: packages/subagent/tool-subagent/src/index.ts:615] [E: packages/subagent/tool-subagent/src/model-selection-settings.ts:15] `dsh-web-app` 插入该 settings 行；插件默认 `enabled: false`。[E: packages/bundle/web-app/cordis.patch.yml:47] [E: packages/bundle/web-app/cordis.patch.yml:48] [E: packages/subagent/tool-subagent/src/model-selection-settings.ts:38] 默认 web 的 `standard` catalog **没有** `list_subagent_models`，也没有 `provider` / `model` / `reasoning_effort` 参数；打开 allowlist 后新 Session 才出现。[E: apps/cli/tests/web-agent-presets.e2e.ts:295] [E: apps/cli/tests/web-agent-presets.e2e.ts:299]

## 用途定位

本工具把一条**自包含**任务交给 `ctx.subagents` 上名为 `config.provider` 的 backend。模型参数始终有展示用 `description`、子代理 user 消息 `prompt`、以及可选调度键 `run_in_background`。`provider` / `model` / `reasoning_effort` 只在该 Session 采到打开的 model-selection policy 时进 schema。**没有** `type` / `outputSchema` 这些模型字段。[E: packages/subagent/tool-subagent/src/index.ts:390] [E: packages/subagent/tool-subagent/src/index.ts:400]

shipped 行是 `provider: spawn`。`SpawnInProcessProvider.inheritsParentContext === false`，所以 description 写：子代理「does not share this conversation's context」，必须给完整独立 prompt。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:50] [E: packages/subagent/tool-subagent/src/index.ts:273]

`backgroundMode: continuable`（shipped 覆盖；插件 schema 默认其实是 `one-shot`）时：模型不传 `run_in_background` 也走后台；`execute` 在孩子 inbox **接受**初始 prompt 后立刻回 durable `subagentId`，**不**等 turn 跑完，也**不**建 `ctx.jobs` Task。[E: packages/subagent/tool-subagent/src/index.ts:303] [E: packages/subagent/tool-subagent/src/index.ts:530] 孩子结束后 continuation manager 给父 agent 塞一条 `source.kind: 'subagent-settled'` notice；后续同一孩子用 [send_message / interrupt_agent / list_agents](subagent-control.md)，不是 `job_output`。[E: packages/subagent/subagent/src/continuation-messages.ts:31] [E: packages/subagent/subagent/src/continuation-activation.ts:871] [E: packages/subagent/tool-subagent/src/index.ts:386]

它**不是** `subagent_fork`（fork 会 seed 父对话已完成 turns）。`report` 工具包已删除，见退役页 [report.md](report.md)。continuable 孩子的初始 prompt 还会被附上 `send_message` 回父指引。[E: packages/subagent/subagent/src/continuation-messages.ts:81]

## 输入 schema

以**插件默认 `Config`** boot 为准：`toolName: 'subagent'`、`enableRunInBackground: true`、`backgroundMode: 'one-shot'`、`modelSelectionSettings: false`；`provider` 必填、无默认；`maxDepth` **没有** schema 默认值。[E: packages/subagent/tool-subagent/src/index.ts:108] [E: packages/subagent/tool-subagent/src/index.ts:110] [E: packages/subagent/tool-subagent/src/index.ts:111] [E: packages/subagent/tool-subagent/src/index.ts:130] 该默认下 parameters 是 `description` + `prompt` + `run_in_background`，one-shot description 含 `job_output`。[E: packages/subagent/tool-subagent/src/index.ts:387] [E: packages/subagent/tool-subagent/src/index.ts:425]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `description` | `string` | 是 | 无 | schema `required: true` | UI 用的 3–5 词任务标签，进入 start 请求的 `label`，不进孩子 prompt。[E: packages/subagent/tool-subagent/src/index.ts:390] [E: packages/subagent/tool-subagent/src/index.ts:516] |
| `prompt` | `string` | 是 | 无 | schema `required: true` | 孩子的完整 user 文本。spawn 路径 wording：孩子不共享本对话，必须自包含。[E: packages/subagent/tool-subagent/src/index.ts:395] [E: packages/subagent/tool-subagent/src/index.ts:273] |
| `run_in_background` | `boolean` | 否 | **不传 = `false`**（one-shot 政策：`request.run_in_background ?? continuable`，此时 `continuable` 为假） | 仅当 `enableRunInBackground !== false` 时广告 | `true` 立刻回 `jobId`，用 `job_output` / `job_kill` 收/停。[E: packages/subagent/tool-subagent/src/index.ts:303] [E: packages/subagent/tool-subagent/src/index.ts:425] |
| `provider` / `model` / `reasoning_effort` | `string` | 否 | 省略则走 Config / 父路由 / provider `agentRouteDefaults` | 仅该 Session 采到打开的 model-selection policy | shipped spawn 行打开 `modelSelectionSettings`；默认 web settings 关，参数不出现。[E: packages/subagent/tool-subagent/src/index.ts:400] [E: packages/bundle/web-app/presets/standard.patch.yml:95] [E: apps/cli/tests/web-agent-presets.e2e.ts:296] |

`defineTool` 先按 ParameterSchemaSpec 做类型 / required 校验。空串 `""` 能过 schema；execute 没有再 trim。[E: packages/core/tools/src/schema.ts:598] [E: packages/core/tools/src/schema.ts:599]

### `list_subagent_models`（条件登记）

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `provider` | `string` | 否 | 省略 = 列允许的 provider | 空串在 execute 拒 | 已注册且在 allowlist 内的 LLM provider id。[E: packages/subagent/tool-subagent/src/list-models.ts:96] |
| `model` | `string` | 否 | 省略 = 列该 provider 广告模型 | 必须同时给 `provider` | 精确模型 id；再列 reasoning efforts。[E: packages/subagent/tool-subagent/src/list-models.ts:100] [E: packages/subagent/tool-subagent/src/list-models.ts:46] |

输出 schema 是 `string`；render 原样回文本。[E: packages/subagent/tool-subagent/src/list-models.ts:106]

**`Config` / shipped preset 改广告：**

- **`backgroundMode: 'continuable'`**（`standard` / `ptc` / `cordis` 的 `tool-subagent` 行显式写出；插件默认**不是**这个值）：`run_in_background` 描述改成「Defaults to true」；工具 description 改成默认后台、立刻回 durable id、提到 `send_message`，**不再**提 `job_output` / `job_kill`。不传该键时 `runInBackground` 为真。[E: packages/bundle/web-app/presets/standard.patch.yml:96] [E: packages/subagent/tool-subagent/src/index.ts:423] provider 没有 `prepareContinuable` 时 mount 直接抛。[E: packages/subagent/tool-subagent/src/index.ts:345]
- **`enableRunInBackground: false`**：properties 只剩 `description` / `prompt`；execute 再拒一次 `run_in_background: true`。
- **`toolName`**：改 wire 名。每个实例必须不同，否则 registry 拒重名。[E: packages/subagent/tool-subagent/src/index.ts:55]
- **`inheritsParentContext`**：来自**已挂上的 provider**，不是 Config。`true` 时 description / `prompt` 说明改成「inherits this conversation」（fork 用）；spawn 恒为 `false`。[E: packages/subagent/tool-subagent/src/index.ts:368] [E: packages/subagent/subagent/src/types.ts:354]
- **`persona` / `toolFilter` / `agentOptions` / `maxDepth`**：只进 start / continuable 请求，**不**进模型 schema。省略 `maxDepth` 时 execute 调 `resolveMaxDepth` 读 Host `SubagentRuntime.config.maxDepth`（默认 `1`）；`'provider-managed'` 则不传 cap。[E: packages/subagent/subagent/src/index.ts:202] [E: packages/subagent/subagent/src/index.ts:244] [E: packages/subagent/tool-subagent/src/index.ts:514]

## 输出 & 截断 / spill

`output.schema` 是 `oneOf` 三支，本工具**没有** spill、**没有**按字节截断孩子文本。[E: packages/subagent/tool-subagent/src/index.ts:429]

| `kind` | 字段 | `output.render` | 何时出现 |
|---|---|---|---|
| `continuable` | `subagentId` | `started subagent ${subagentId}` | `backgroundMode: continuable` 且后台路由 [E: packages/subagent/tool-subagent/src/index.ts:444] [E: packages/subagent/tool-subagent/src/index.ts:464] |
| `background` | `jobId` | `started background subagent job ${jobId}` | one-shot 后台 [E: packages/subagent/tool-subagent/src/index.ts:436] |
| `foreground` | `runId` + `output`（JSON block 数组） | 只拼接 `type: 'text'` 的 `text` | 前台等到 `stopReason: 'completed'` [E: packages/subagent/tool-subagent/src/index.ts:452] |

前台非 `completed` 会 `throw`，registry 收成 `isError`。continuable 后台**没有**这次 tool result 里的孩子答案。结算后父 inbox 收到 settlement 摘要加 closing message（或 `It left no closing message.`）。[E: packages/subagent/subagent/src/continuation-messages.ts:150] [E: packages/subagent/subagent/src/continuation-messages.ts:154]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `SubagentRuntime` / `ctx.subagents` | `start` / `startContinuable`。[E: packages/subagent/subagent/src/index.ts:261] |
| Provider（本页 shipped） | `SpawnInProcessProvider`（`@deepseek-ai/dsh-subagent-spawn-in-process`，插件名 `subagent-spawn-in-process`） | `inject = ['subagents']`；默认 `providerName: 'spawn'`；`inheritsParentContext = false`；`prepareContinuable()` 回 `{}`（无 seed）。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:19] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:22] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:50] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:61] |
| Consumer | `@deepseek-ai/dsh-tool-subagent` | `config.provider` 选 backend；schema wording 读 `inheritsParentContext`；后台 continuable 调 `startContinuable`，否则 `start`。 |
| Preset revision | `ctx.agentPresets.composeFrom` | 孩子创建窗口 bind 到父当前 standing generation，找不到 revision 抛 `Parent preset revision is unavailable`，不去磁盘再发现 YAML。[E: packages/subagent/subagent/src/child-agent.ts:205] [E: packages/preset/agent-preset-registry/src/index.ts:273] [E: packages/preset/agent-preset-registry/src/index.ts:277] |

换掉 `spawn` provider 会带走：孩子是否看到父对话、能否 `continuable`、depth / persona / toolFilter 是否可执行、one-shot 是同进程 `Agent` 还是远程进程。工具代码不选 runner。

其它消费：

- `ctx.tools`：`register` / 按 scope 查 section 是否该渲染。
- `ctx.systemPrompt`：仅 continuable+后台开关打开时挂 `tool:subagent`。
- `ctx.sessionProjections`：始终 `register` 子代理模型选择投影定义；设置采样只在 `modelSelectionSettings: true`。[E: packages/subagent/tool-subagent/src/index.ts:326]
- `ctx.get('jobs')`：仅 **one-shot 后台**。缺服务就失败，不静默改前台。[E: packages/subagent/tool-subagent/src/index.ts:538] `jobs.start({ kind: 'subagent', owner: parent.id, ... })` 的 id 前缀因此是 `subagent-N`。[E: packages/jobs/jobs/src/view.ts:33] [E: packages/subagent/tool-subagent/src/index.ts:545]
- `ctx.get('sessionPersistence')`：`startContinuable` 必有 persistence backend，否则 `PERSISTENCE_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:533]
- `ctx.agents`：spawn one-shot 与 continuation manager 都在孩子创建窗口里 `create`；本工具 `inject` **不含** `agents` / `jobs`。

registry 与 spawn/fork backend 是 **host 面** process singleton（`dsh-base` 挂 `@deepseek-ai/dsh-subagent` + `@deepseek-ai/dsh-subagent-spawn-in-process`）。preset 只再挂模型可见工具行。[E: packages/bundle/base/cordis.patch.yml:348] [E: packages/bundle/base/cordis.patch.yml:351]

声明式 preset：`@deepseek-ai/dsh-agent-preset` 在普通 Cordis YAML 里声明 `id` + `plugins[]`；`@deepseek-ai/dsh-agent-preset-registry` 管 roster / revision / bind。[E: packages/preset/agent-preset/src/index.ts:17] [E: packages/preset/agent-preset-registry/src/index.ts:80] 旧包 `packages/preset/agent-presets` 已删除。

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` waterfall →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。本工具**不**自己挂 pre-execute listener。[E: packages/core/tools/src/index.ts:1506] [E: packages/core/tools/src/index.ts:1605] [E: packages/core/tools/src/index.ts:1783]

对本工具的挂点：

- **timeout（工具定义）：** `defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59]
- **approval：** 普通调用不 `ask`。body 里也没有 `approveEscalation`。
- **sandbox：** 不挂 pre-execute。孩子若再调 `bash` / `write`，走那些工具自己的 body 升权。
- **checkpoint：** host `dsh-session-checkpoint-policy` 对**没有** `parent` 的 top-level 调用在 `tools/execute` 里先 `sessions.flush`。[E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** `isConcurrencySafe: () => true`，前台 / 后台 / continuable 都是 `parallel`。[E: packages/subagent/tool-subagent/src/index.ts:470] [E: packages/core/tools/src/index.ts:1305] `list_subagent_models` 未声明该函数，fail-closed 为 exclusive。
- **PTC：** `ptc` preset 仍装本行，但另挂 `agent-tool-presentation` `mode: ptc`。无 `parent` 的模型直调 `subagent` 在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/core/tools/src/index.ts:1351] [E: packages/core/tools/src/index.ts:1352]

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。四个 shipped preset **只叠在 `dsh-web-app`**（`dsh.bundle.patch` = `cordis.patch.yml` + 四份 preset 文件）。[E: packages/bundle/web-app/package.json:43] [E: packages/bundle/web-app/package.json:48] 装上的三个 preset 都把本行放在 `delegation` 组；该组 `isolate` **只有** `workflowEngine: true`，**不** isolate `subagents`（registry 留在 host，工具用 `ctx.subagents` 解析它）。[E: packages/bundle/web-app/presets/standard.patch.yml:80] [E: packages/bundle/web-app/presets/standard.patch.yml:84]

| preset | 装 `@deepseek-ai/dsh-tool-subagent` 且 `toolName: subagent`？ | `disabled` | isolate / 关键 Config |
|---|---|---|---|
| `minimal` | **否**。整份文件只有 complete persona + 持久 bash/pwsh | — | 无本包行。[E: packages/bundle/web-app/presets/minimal.patch.yml:17] [E: packages/bundle/web-app/presets/minimal.patch.yml:31] e2e assemble 工具名恰好 `['bash']`。[E: apps/cli/tests/web-agent-presets.e2e.ts:321] |
| `standard` | 是，`id: tool-subagent` | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`modelSelectionSettings: true`、`backgroundMode: continuable` [E: packages/bundle/web-app/presets/standard.patch.yml:90] [E: packages/bundle/web-app/presets/standard.patch.yml:94] [E: packages/bundle/web-app/presets/standard.patch.yml:96] |
| `ptc` | 是（呈现再收成 PTC / `run_code`） | 无 | 同 standard 的 spawn Config；另有 `tool-presentation` `mode: ptc`；`workflow-ptc` / `tool-workflow` / `tool-ralph` 均为 `disabled: true` [E: packages/bundle/web-app/presets/ptc.patch.yml:90] [E: packages/bundle/web-app/presets/ptc.patch.yml:96] [E: packages/bundle/web-app/presets/ptc.patch.yml:121] |
| `cordis` | 是 | 无 | 同 standard [E: packages/bundle/web-app/presets/cordis.patch.yml:89] [E: packages/bundle/web-app/presets/cordis.patch.yml:95] |

unix exact `standard` catalog 含 `subagent` / `subagent_fork` / `send_message` / `interrupt_agent` / `list_agents` / `job_*`，默认不含 `list_subagent_models`。[E: apps/cli/tests/web-agent-presets.e2e.ts:264] [E: apps/cli/tests/web-agent-presets.e2e.ts:268]

同组里还有 `toolName: subagent_codex` / `subagent_claude_code` 两行，三个装编排的 preset 都是 `disabled: true`（`maxDepth: provider-managed`）。复制 preset 去掉 `disabled` 才会进 catalog，本页不另开节点。[E: packages/bundle/web-app/presets/standard.patch.yml:103] [E: packages/bundle/web-app/presets/standard.patch.yml:105] [E: packages/bundle/web-app/presets/standard.patch.yml:110]

组合旁注（**不是** preset 成员资格）：`dsh-base` 也 insert 了 host 行 `tool-subagent`（同样 `provider: spawn` / `toolName: subagent` / `backgroundMode: continuable`），并挂 registry + spawn backend。[E: packages/bundle/base/cordis.patch.yml:369] [E: packages/bundle/base/cordis.patch.yml:374] `dsh-web-app` overlay 把 host `tool-subagent` 设 `disabled: true`，改由每个 session 的 preset remount。[E: packages/bundle/web-app/cordis.patch.yml:529] shipped profile 还有 `headless` / `sdk` / `sdk-minimal` / `acp`；其中 web 是把 host 工具行关掉、改走 preset 的那条。非 web 的 base-backed profile 仍吃 host 行。[I] `desktop` 不是第六个 CLI profile。

Web 的 preset roster 默认 id 是 `standard`。[E: packages/bundle/web-app/cordis.patch.yml:562]

## execute() 走读

编号按 shipped `provider: spawn` + `backgroundMode: continuable` + `enableRunInBackground: true`（`standard` / `ptc` / `cordis`）的默认调用。

1. `defineTool` 包装的 `execute` 先 `validate`，再进用户 `execute`。[E: packages/core/tools/src/schema.ts:598]
2. `execute@packages/subagent/tool-subagent/src/index.ts`：没有 `exec.agent` 立刻抛 `subagent tool requires a calling agent`。[E: packages/subagent/tool-subagent/src/index.ts:473] [E: packages/subagent/tool-subagent/src/index.ts:475]
3. 组 start 请求形状：`label = args.description`；`prompt = [{ type: 'text', text: args.prompt }]`；`parent = exec.agent`；解析后的 `agentOptions` / Config 里有的 `persona` / `toolFilter` 才 spread；`resolveMaxDepth(config.maxDepth)` 有数字才放进请求。[E: packages/subagent/tool-subagent/src/index.ts:514]
4. `resolveDelegationRun`：`runInBackground = args.run_in_background ?? continuable`。shipped 下 `continuable === true`，模型省略该键 → 后台。[E: packages/subagent/tool-subagent/src/index.ts:303] [E: packages/subagent/tool-subagent/src/index.ts:525]
5. **默认后台 / continuable：** `ctx.subagents.startContinuable({ provider: config.provider, label, request, signal: exec.signal })`，回 `{ kind: 'continuable', subagentId: started.childId }`。[E: packages/subagent/tool-subagent/src/index.ts:530] [E: packages/subagent/tool-subagent/src/index.ts:536]
6. `SubagentRuntime.startContinuable` 转给 continuation manager。[E: packages/subagent/subagent/src/index.ts:262] `startContinuable@continuation.ts`：要 persistence；缺则 `PERSISTENCE_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:104] [E: packages/subagent/subagent/src/continuation.ts:533]
7. spawn 的 `prepareContinuable` 是 `Promise.resolve({})`，**不** seed 父历史。manager 自己 `materialize` 孩子 Agent、把初始 prompt 送进 inbox；**inbox 接受**后本 tool call 就返回。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:61]
8. 孩子创建窗口：`applyChildComposition` 先 `agentPresets.composeFrom(childCtx, parent.ctx)` **加入父当前 standing revision**，再登记 `subagent:delegation` 上下文句，可选 shadow persona / `tools.restrict`。[E: packages/subagent/subagent/src/child-agent.ts:205] [E: packages/subagent/subagent/src/child-agent.ts:206] `composeFrom` 是 bind 不是 `mount()`：用 `standingMountFor(parent)` 找到父已 retain 的 generation 再 `join`；父没加入任何 preset 时返回 `undefined`。[E: packages/preset/agent-preset-registry/src/index.ts:273] [E: packages/preset/agent-preset-registry/src/index.ts:274] 审批若已组成，孩子 `approvalPolicy` 钉成 `'never'`。[E: packages/subagent/subagent/src/child-agent.ts:254]
9. continuable 物化把 descriptor 写进孩子 log：`session.append('subagent/descriptor', create.descriptor)`（`SUBAGENT_DESCRIPTOR_VERSION = 3`，无 `surfaceOp`）。[E: packages/subagent/subagent/src/continuation-activation.ts:627] [E: packages/subagent/subagent/src/descriptor.ts:48]
10. 孩子跑完：`notifySettlement` 投递 `source.kind: 'subagent-settled'` notice（idle 父走 waking queue）。[E: packages/subagent/subagent/src/continuation-activation.ts:871] [E: packages/subagent/subagent/src/continuation-messages.ts:154]
11. **显式 `run_in_background: false`：** 即使 Config 是 continuable，也走 one-shot `ctx.subagents.start` + `settleForegroundRun`（等 `run.result`，再 `dispose`，**不**留 durable 孩子，也**不**建 job）。[E: packages/subagent/tool-subagent/src/index.ts:563]
12. **插件默认 `backgroundMode: 'one-shot'` 且 `run_in_background: true`：** 不走 `startContinuable`。`ctx.get('jobs')` 缺失则抛；否则 `jobs.start({ kind: 'subagent', owner: parent.id, run })`，`run()` 里才 `ctx.subagents.start`。[E: packages/subagent/tool-subagent/src/index.ts:544] 结算用 `runOutcome` 映到 job `completed` / `killed` / `failed`。[E: packages/subagent/subagent/src/run-settlement.ts:37]
13. `exec.signal` 是 one-shot 的规范取消通道。continuable 准备阶段同一 signal 只管到 inbox 接受；接受之后 manager 自己管 Activation。

## 设计动机·edge

- **同包拆 wire 名，不拆页混写。** `subagent` 与 `subagent_fork` 都是 `@deepseek-ai/dsh-tool-subagent`，靠 `toolName` + `provider` 分开。fork 的历史 seed / `inheritsParentContext: true` 只在 [subagent-fork.md](subagent-fork.md)。
- **子代理 compose 走 registry revision。** `applyChildComposition` 调 `composeFrom`，不是目录 discovery，也不是再 `mount()` 一份新 preset。
- **`backgroundMode: continuable` ≠ 每次调用都建 durable 孩子。** 它只改**后台路由**和默认是否后台。`run_in_background: false` 仍是一次性 `SubagentRun` + `dispose`。
- **continuable 不是 job。** 默认 shipped 路径不碰 `ctx.jobs`；`job_output` 收不到这个孩子。控制面是 [subagent-control.md](subagent-control.md)。
- **spawn 孩子从零开始。** 自己的 session、`parentSession` 血缘、depth = 父 + 1；父 log 里已完成的 turns 不会进孩子。工具 / 审批策略仍经 `composeFrom` + 钉 `never`。
- **深度预算在 runtime，工具保持可见。** Host 默认 cap 1；`maxDepth: 0` 禁止任何委托，但 catalog 里仍有 `subagent`。数值 cap 要求 provider `depthLimit`；spawn 有。
- **产品 provider 行默认关掉。** `subagent_codex` / `subagent_claude_code` 在 shipped preset `disabled: true`。
- **`list_subagent_models` 默认不算装。** spawn 行虽然 `modelSelectionSettings: true`，Host settings 默认 `enabled: false`。
- **`report` 已退役。** 包 `@deepseek-ai/dsh-tool-subagent-report` 已删除；base / preset 都不挂该行。见 [report.md](report.md)。
- **必须有调用方 Agent。** 无 `exec.agent` 不能委托。one-shot 后台 job 的 `owner` 是这个 parent 的 session id。
- **实验性 Agent Teams** 直接 `disabled: true` 全局 `tool-subagent` / `tool-subagent-fork` / control 两行，再装 Team 工具。那套模型名在 `surface.tools` 的 team 节点，不在本页。

## Sources

- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/tool-subagent/src/list-models.ts
- packages/subagent/tool-subagent/src/model-selection-settings.ts
- packages/subagent/tool-subagent/package.json
- packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent-spawn-in-process/package.json
- packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/continuation-messages.ts
- packages/subagent/subagent/src/continuation-activation.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/depth.ts
- packages/subagent/subagent/src/run-settlement.ts
- packages/subagent/subagent/src/descriptor.ts
- packages/subagent/subagent/package.json
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/preset/agent-preset/src/index.ts
- packages/preset/agent-preset-registry/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/system-prompt/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/jobs/jobs/src/view.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：同一包、`toolName: subagent_fork`、`provider: fork`、继承父对话已完成 turns。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：continuable 孩子的后续 turn / 中断 / 列表。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：从本工具 `execute` 再拉起子 session 的端到端走读。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition / Provider，不是本页的模型 schema。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：仅 one-shot `run_in_background` 才走的 Task 收集面。
- [report](report.md)（`surface.tools.report`）：已退役；结算走 `subagent-settled` notice，邻接回父走 `send_message`。
