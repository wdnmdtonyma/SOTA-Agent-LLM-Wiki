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
  - packages/subagent/subagent/src/depth.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/run-settlement.ts
  - packages/subagent/subagent/package.json
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/jobs/jobs/src/types.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
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
updated: 47f943859b
---

> 模型可见名 `subagent`（load-time `Config.toolName`，插件默认与 shipped preset 都写成这个字面量）；实现包 `@deepseek-ai/dsh-tool-subagent`（Cordis 插件名 `tool-subagent`）。shipped 行绑定 `provider: spawn` + `backgroundMode: continuable`：默认立刻回 durable child id，子代理在**自己的** session / system prompt 里干活，**不**继承父对话。

## 能回答的问题

- 模型目录里的 `subagent` 是哪个包、哪个 `toolName`、绑哪个 `ctx.subagents` provider？
- 默认 Config 与 shipped preset 各自怎样改 `run_in_background` 的广告与执行默认？
- 前台 / one-shot 后台 / continuable 三条返回分别长什么样？有没有 spill？
- `ctx.subagents`、`spawn` provider、`ctx.get('jobs')`、`ctx.systemPrompt` 各自给本工具提供什么？
- `minimal` / `standard` / `code` / `cordis` 谁装本行？registry / spawn backend 在 host 还是 preset？
- 一次 `execute()` 怎样走到 `startContinuable`，又怎样被 `run_in_background: false` 打回 one-shot `start`？

## Identity

Wire 名是 load-time `config.toolName ?? 'subagent'`。Schemastery `Config` 把 `toolName` 默认成 `'subagent'`；直接 `apply()` 绕过 schema 时同一 fallback 仍生效。[E: packages/subagent/tool-subagent/src/index.ts:83] [E: packages/subagent/tool-subagent/src/index.ts:277] Cordis 插件导出名是 `tool-subagent`，实现包是 `@deepseek-ai/dsh-tool-subagent`。[E: packages/subagent/tool-subagent/src/index.ts:22] [E: packages/subagent/tool-subagent/package.json:2]

工厂是 `apply(ctx, config)`：校验 `maxDepth` / 非空 `toolFilter`，算出 `backgroundEnabled` / `continuable` / `toolName`，再按 provider 生命周期 `ctx.tools.register(defineTool({ name: toolName, ... }))`。[E: packages/subagent/tool-subagent/src/index.ts:267] [E: packages/subagent/tool-subagent/src/index.ts:297] [E: packages/subagent/tool-subagent/src/index.ts:298]

`inject` 是 `['tools', 'subagents', 'systemPrompt']`。没有 `ctx.subagents` 时插件挂起，catalog 里不会出现 `subagent`。[E: packages/subagent/tool-subagent/src/index.ts:23] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:616] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:591]

同一包可以装多次，每次一个不同 `toolName` 绑一个不同 provider。shipped spawn 行是 `toolName: subagent`；另有一行 `provider: fork` + `toolName: subagent_fork`，那是 [subagent-fork.md](subagent-fork.md)，本页不写 fork 的 execute。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:194] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:190] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:196] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:197]

工具注册**镜像 provider 生命周期**：`subagent/provider-added` 且名字等于 `config.provider` 才 `mount`；`subagent/provider-removed` 卸掉 `defineTool`。provider 尚未出现时 catalog 为空，logger 记一条 waiting note。[E: packages/subagent/tool-subagent/src/index.ts:440] [E: packages/subagent/tool-subagent/src/index.ts:448] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:308]

`backgroundEnabled && continuable` 时再挂 `ctx.systemPrompt.section`，名 `tool:${toolName}`，`order: 116.5`。provider 未到或当前 scope 看不见该工具时 section 文本是空串，装配会丢掉它。[E: packages/subagent/tool-subagent/src/index.ts:455] [E: packages/subagent/tool-subagent/src/index.ts:460] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:328]

## 用途定位

本工具把一条**自包含**任务交给 `ctx.subagents` 上名为 `config.provider` 的 backend。模型参数只有展示用 `description`、子代理 user 消息 `prompt`、以及可选调度键 `run_in_background`；**没有** `provider` / `type` / `outputSchema` 这些模型字段。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:99] [E: packages/subagent/tool-subagent/src/index.ts:307]

shipped 行是 `provider: spawn`。`SpawnInProcessProvider.inheritsParentContext === false`，所以 description 写：子代理「does not see this conversation」，必须给完整独立 prompt。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:44] [E: packages/subagent/tool-subagent/src/index.ts:231] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:406]

`backgroundMode: continuable`（shipped 覆盖；插件 schema 默认其实是 `one-shot`）时：模型不传 `run_in_background` 也走后台；`execute` 在孩子 inbox **接受**初始 prompt 后立刻回 durable `subagentId`，**不**等 turn 跑完，也**不**建 `ctx.jobs` Task。[E: packages/subagent/tool-subagent/src/index.ts:263] [E: packages/subagent/tool-subagent/src/index.ts:392] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1049] 孩子结束后 continuation manager 给父 agent 塞一条 `source.kind: 'subagent-settled'` notice；后续同一孩子用 [send_message / interrupt_agent / list_agents](subagent-control.md)，不是 `job_output`。[E: packages/subagent/subagent/src/continuation.ts:1414] [E: packages/subagent/tool-subagent/src/index.ts:304]

它**不是** `subagent_fork`（fork 会 seed 父对话已完成 turns），也**不是** host 给 continuable 孩子装的 `report` 工具。

## 输入 schema

以**插件默认 `Config`** boot 为准：`toolName: 'subagent'`、`enableRunInBackground: true`、`backgroundMode: 'one-shot'`、`maxDepth: 3`；`provider` 必填、无默认。[E: packages/subagent/tool-subagent/src/index.ts:82] [E: packages/subagent/tool-subagent/src/index.ts:84] [E: packages/subagent/tool-subagent/src/index.ts:85] [E: packages/subagent/tool-subagent/src/index.ts:98] 测试钉死该默认下 properties 是 `description` + `prompt` + `run_in_background`，description 含 `job_output`。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:104] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:105]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `description` | `string` | 是 | 无 | schema `required: true` | UI 用的 3–5 词任务标签，进入 start 请求的 `label`，不进孩子 prompt。[E: packages/subagent/tool-subagent/src/index.ts:308] [E: packages/subagent/tool-subagent/src/index.ts:378] |
| `prompt` | `string` | 是 | 无 | schema `required: true` | 孩子的完整 user 文本。spawn 路径 wording：孩子不共享本对话，必须自包含。[E: packages/subagent/tool-subagent/src/index.ts:313] [E: packages/subagent/tool-subagent/src/index.ts:232] |
| `run_in_background` | `boolean` | 否 | **不传 = `false`**（one-shot 政策：`request.run_in_background ?? continuable`，此时 `continuable` 为假） | 仅当 `enableRunInBackground !== false` 时广告 | `true` 立刻回 `jobId`，用 `job_output` / `job_kill` 收/停。[E: packages/subagent/tool-subagent/src/index.ts:263] [E: packages/subagent/tool-subagent/src/index.ts:323] |

`defineTool` 先按 ParameterSchemaSpec 做类型 / required 校验。[E: packages/core/tools/src/schema.ts:586] 空串 `""` 能过 schema；execute 没有再 trim。

**`Config` / shipped preset 改广告：**

- **`backgroundMode: 'continuable'`**（`standard` / `code` / `cordis` 的 `tool-subagent` 行显式写出；插件默认**不是**这个值）：`run_in_background` 描述改成「Defaults to true」；工具 description 改成默认后台、立刻回 durable id、提到 `send_message`，**不再**提 `job_output` / `job_kill`。不传该键时 `runInBackground` 为真。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191] [E: packages/subagent/tool-subagent/src/index.ts:322] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1028] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1033] provider 没有 `prepareContinuable` 时 mount 直接抛。[E: packages/subagent/tool-subagent/src/index.ts:292] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:82]
- **`enableRunInBackground: false`**：properties 只剩 `description` / `prompt`；execute 再拒一次 `run_in_background: true`（schema 省略挡不住 undeclared key）。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:112] [E: packages/subagent/tool-subagent/src/index.ts:255]
- **`toolName`**：改 wire 名。每个实例必须不同，否则 registry 拒重名。[E: packages/subagent/tool-subagent/src/index.ts:36] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:198]
- **`inheritsParentContext`**：来自**已挂上的 provider**，不是 Config。`true` 时 description / `prompt` 说明改成「inherits this conversation」（fork 用）；spawn 恒为 `false`。[E: packages/subagent/tool-subagent/src/index.ts:291] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:414]
- **`persona` / `toolFilter` / `agentOptions` / `maxDepth`**：只进 start / continuable 请求，**不**进模型 schema。loader 默认 `maxDepth: 3` 会 forward；`'provider-managed'` 则省略 cap。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1226] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1274]

## 输出 & 截断 / spill

`output.schema` 是 `oneOf` 三支，本工具**没有** spill、**没有**按字节截断孩子文本。[E: packages/subagent/tool-subagent/src/index.ts:329]

| `kind` | 字段 | `output.render` | 何时出现 |
|---|---|---|---|
| `continuable` | `subagentId` | `started subagent ${subagentId}` | `backgroundMode: continuable` 且后台路由 [E: packages/subagent/tool-subagent/src/index.ts:342] [E: packages/subagent/tool-subagent/src/index.ts:362] |
| `background` | `jobId` | `started background subagent task ${jobId}` | one-shot 后台；测试钉死 `jobId: 'subagent-1'` [E: packages/subagent/tool-subagent/src/index.ts:335] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:828] |
| `foreground` | `runId` + `output`（JSON block 数组） | 只拼接 `type: 'text'` 的 `text` | 前台等到 `stopReason: 'completed'` [E: packages/subagent/tool-subagent/src/index.ts:350] [E: packages/subagent/tool-subagent/src/index.ts:363] |

前台非 `completed`（`aborted` / `error` / `max-tokens` / `refusal` / 未知 stop reason）会 `throw`，registry 收成 `isError`；若孩子留下 text block，错误文案后面跟上 `Partial output before the run ended:`。[E: packages/subagent/tool-subagent/src/index.ts:127] [E: packages/subagent/tool-subagent/src/index.ts:154] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:177] `dispose` 失败不会吞掉独立的 result 失败，两边一起进 `AggregateError`。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:493]

continuable 后台**没有**这次 tool result 里的孩子答案。结算后父 inbox 收到 `Background subagent <id> finished…` 加 closing message（或 `It left no closing message.`）。[E: packages/subagent/subagent/src/continuation.ts:295] [E: packages/subagent/subagent/src/continuation.ts:1410]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `SubagentRuntime` / `ctx.subagents` | `super(ctx, 'subagents')`；`registerProvider` / `getProvider` / `start` / `startContinuable`。[E: packages/subagent/subagent/src/index.ts:184] [E: packages/subagent/subagent/package.json:2] |
| Provider（本页 shipped） | `SpawnInProcessProvider`（`@deepseek-ai/dsh-subagent-spawn-in-process`，插件名 `subagent-spawn-in-process`） | `inject = ['subagents']`；默认 `providerName: 'spawn'`；`inheritsParentContext = false`；`capabilities` 全开；one-shot `start` → `startInProcessRun(request, {})`；`prepareContinuable()` 回 `{}`（无 seed）。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:19] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:31] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:52] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:58] |
| Consumer | `@deepseek-ai/dsh-tool-subagent` | `config.provider` 选 backend；schema wording 读 `inheritsParentContext`；后台 continuable 调 `startContinuable`，否则 `start`。 |

换掉 `spawn` provider 会带走：孩子是否看到父对话、能否 `continuable`、depth / persona / toolFilter 是否可执行、one-shot 是同进程 `Agent` 还是远程进程。工具代码不选 runner。

其它消费：

- `ctx.tools`：`register` / 按 scope 查 section 是否该渲染。
- `ctx.systemPrompt`：仅 continuable+后台开关打开时挂 `tool:subagent`。
- `ctx.get('jobs')`：仅 **one-shot 后台**。缺服务就失败，不静默改前台。[E: packages/subagent/tool-subagent/src/index.ts:400] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:855] `jobs.start({ kind: 'subagent' })` 的 id 前缀因此是 `subagent-N`。[E: packages/jobs/jobs/src/types.ts:25] [E: packages/subagent/tool-subagent/src/index.ts:407]
- `ctx.get('sessionPersistence')`：`startContinuable` 必有 persistence backend，否则 `PERSISTENCE_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:1475]
- `ctx.agents`：spawn one-shot 与 continuation manager 都在孩子创建窗口里 `create`；本工具 `inject` **不含** `agents` / `jobs`。

registry 与 spawn/fork backend 是 **host 面** process singleton（`dsh-base` 挂 `@deepseek-ai/dsh-subagent` + `@deepseek-ai/dsh-subagent-spawn-in-process`）。preset 只再挂模型可见工具行。[E: packages/bundle/base/cordis.patch.yml:293] [E: packages/bundle/base/cordis.patch.yml:296] [E: packages/bundle/base/cordis.patch.yml:298]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] 本工具**不**自己挂 pre-execute listener。

对本工具的挂点：

- **timeout（工具定义）：** `defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59] 孩子自己的 LLM / 循环超时不是本工具 wrapper。
- **approval：** 普通调用不 `ask`。body 里也没有 `approveEscalation`。
- **sandbox：** 不挂 pre-execute。孩子若再调 `bash` / `write`，走那些工具自己的 body 升权，不是 `subagent` 的 schema。
- **checkpoint：** host `dsh-session-checkpoint-policy` 对**没有** `parent` 的 top-level 调用在 `tools/execute` 里先 `sessions.flush`。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **并行：** `isConcurrencySafe: () => true`，前台 / 后台 / continuable 都是 `parallel`。[E: packages/subagent/tool-subagent/src/index.ts:368] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:138]
- **Code Mode：** `code` preset 仍装本行，但 `mode: code` 时无 `parent` 的模型直调 `subagent` 在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`。装上的三个 preset 都把本行放在 `delegation` 组；该组 `isolate` **只有** `workflowEngine: true`，**不** isolate `subagents`（registry 留在 host，工具用 `ctx.subagents` 解析它）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178]

| preset | 装 `@deepseek-ai/dsh-tool-subagent` 且 `toolName: subagent`？ | `disabled` | isolate / 关键 Config |
|---|---|---|---|
| `minimal` | **否**。整份文件只有 persona + persistent bash + `str_replace_editor` | — | 无本包行 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | 是，`id: tool-subagent` | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`backgroundMode: continuable` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:187] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:189] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191] |
| `code` | 是（呈现再收成 Code Mode） | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`backgroundMode: continuable` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:179] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:188] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:190] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:192] |
| `cordis` | 是 | 无 | `delegation` / `isolate.workflowEngine: true`；`provider: spawn`、`toolName: subagent`、`backgroundMode: continuable` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:166] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:175] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:177] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:179] |

同组里还有 `toolName: subagent_codex` / `subagent_claude_code` 两行，三个装编排的 preset 都是 `disabled: true`（`enableRunInBackground: false`、`maxDepth: provider-managed`）。复制 preset 去掉 `disabled` 才会进 catalog，本页不另开节点。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:208] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:217]

组合旁注（**不是** preset 成员资格）：`dsh-base` 也 insert 了 host 行 `tool-subagent`（同样 `provider: spawn` / `toolName: subagent` / `backgroundMode: continuable`），并挂 registry + spawn backend。[E: packages/bundle/base/cordis.patch.yml:314] [E: packages/bundle/base/cordis.patch.yml:317] [E: packages/bundle/base/cordis.patch.yml:318] `dsh-web-app` overlay 把 host `tool-subagent` 设 `disabled: true`，改由每个 session 的 preset remount。[E: packages/bundle/web-app/cordis.patch.yml:380] [E: packages/bundle/web-app/cordis.patch.yml:381] TUI 是否仍直接吃 host 行，本页标 [I]（web overlay 注释这么写，未再核 TUI boot 源）。

## execute() 走读

编号按 shipped `provider: spawn` + `backgroundMode: continuable` + `enableRunInBackground: true`（`standard` / `code` / `cordis`）的默认调用。`符号@文件` 标关键函数。

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，再进用户 `execute`。[E: packages/core/tools/src/schema.ts:586]
2. `execute@packages/subagent/tool-subagent/src/index.ts`：没有 `exec.agent` 立刻抛 `subagent tool requires a calling agent`（非 agent 调用没有委托所有权）。[E: packages/subagent/tool-subagent/src/index.ts:373] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:296]
3. 组 `SubagentStartRequest` 形状：`label = args.description`；`prompt = [{ type: 'text', text: args.prompt }]`；`parent = exec.agent`；Config 里有的 `agentOptions` / `persona` / `toolFilter` 才 spread；数值 `maxDepth` 才放进请求（`'provider-managed'` 不放）。[E: packages/subagent/tool-subagent/src/index.ts:378]
4. `resolveDelegationRun@packages/subagent/tool-subagent/src/index.ts`：`runInBackground = args.run_in_background ?? continuable`。shipped 下 `continuable === true`，模型省略该键 → 后台。[E: packages/subagent/tool-subagent/src/index.ts:263] [E: packages/subagent/tool-subagent/src/index.ts:387]
5. **默认后台 / continuable：** `ctx.subagents.startContinuable({ provider: config.provider, label, request, signal: exec.signal })`，回 `{ kind: 'continuable', subagentId: started.childId }`。[E: packages/subagent/tool-subagent/src/index.ts:392] [E: packages/subagent/tool-subagent/src/index.ts:398]
6. `SubagentRuntime.startContinuable@packages/subagent/subagent/src/index.ts` 转给 continuation manager。[E: packages/subagent/subagent/src/index.ts:212] `startContinuable@packages/subagent/subagent/src/continuation.ts`：要 persistence；`childId = randomUUID()`；`resolveChildDepth(parent, maxDepth)`（默认 cap 3，父 depth 0 → 孩子 1；`maxDepth: 0` 拒任何孩子）；descriptor `mode: 'continuable'` + `provider: spawn`；然后 `prepareContinuable('spawn')`。[E: packages/subagent/subagent/src/continuation.ts:407] [E: packages/subagent/subagent/src/continuation.ts:409] [E: packages/subagent/subagent/src/continuation.ts:416] [E: packages/subagent/subagent/src/child-agent.ts:49]
7. spawn 的 `prepareContinuable` 是 `Promise.resolve({})`，**不** seed 父历史。manager 自己 `materialize` 孩子 Agent、把初始 prompt 送进 inbox；**inbox 接受**后本 tool call 就返回，不等 turn、不等 session 落盘那条 user 消息。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:58] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:245] [E: packages/subagent/subagent/src/continuation.ts:456]
8. 孩子跑完：`notifySettlement` 在释放 parent ownership **之前**投递 notice（idle 父 `followup` 叫醒，busy 父 steer）。[E: packages/subagent/subagent/src/continuation.ts:1372] [E: packages/subagent/subagent/src/continuation.ts:1400]
9. **显式 `run_in_background: false`：** 即使 Config 是 continuable，也走 one-shot `ctx.subagents.start(config.provider, { ...request, signal: exec.signal })` + `settleForegroundRun`（等 `run.result`，再 `dispose`，**不**留 durable 孩子，也**不**建 job）。[E: packages/subagent/tool-subagent/src/index.ts:425] [E: packages/subagent/tool-subagent/src/index.ts:429] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1078]
10. **one-shot `start` 后端：** `SubagentRuntime.start` 校验 capabilities / `maxDepth`，`snapshotSubagentDescriptor({ mode: 'one-shot', provider })`，再 `SpawnInProcessProvider.start` → `startInProcessRun(request, {})`（新鲜 session，`parentSession` 血缘，depth+1）。[E: packages/subagent/subagent/src/index.ts:414] [E: packages/subagent/subagent-in-process-driver/src/index.ts:102] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:103]
11. **插件默认 `backgroundMode: 'one-shot'` 且 `run_in_background: true`：** 不走 `startContinuable`。`ctx.get('jobs')` 缺失则抛；否则 `jobs.start({ kind: 'subagent', owner: parent, run })`，`run()` 里才 `ctx.subagents.start`。preflight 失败则 provider `starts === 0`。[E: packages/subagent/tool-subagent/src/index.ts:406] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1192] 结算用 `settleRun` 映到 job `completed` / `killed` / `failed`。[E: packages/subagent/subagent/src/run-settlement.ts:49]
12. `exec.signal` 是 one-shot 的规范取消通道（出版前拒 start，出版后 cancel 孩子）。continuable 准备阶段同一 signal 只管到 inbox 接受；接受之后 manager 自己管 Activation。[E: packages/subagent/subagent/src/types.ts:118] [E: packages/subagent/subagent/src/continuation.ts:403] 工具 signal 在 dispatch 前已 abort 时，registry 直接 `TOOL_ABORTED_BEFORE_DISPATCH`，body 不跑。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:585]

## 设计动机·edge

- **同包拆 wire 名，不拆页混写。** `subagent` 与 `subagent_fork` 都是 `@deepseek-ai/dsh-tool-subagent`，靠 `toolName` + `provider` 分开。fork 的历史 seed / `inheritsParentContext: true` 只在 [subagent-fork.md](subagent-fork.md)。
- **`backgroundMode: continuable` ≠ 每次调用都建 durable 孩子。** 它只改**后台路由**和默认是否后台。`run_in_background: false` 仍是一次性 `SubagentRun` + `dispose`。
- **continuable 不是 job。** 默认 shipped 路径 `ctx.jobs.list(parent)` 为空；`job_output` 收不到这个孩子。控制面是 [subagent-control.md](subagent-control.md) 的 `send_message` / `interrupt_agent` / `list_agents`。
- **spawn 孩子从零开始。** 自己的 session、`parentSession` 血缘、depth = 父 + 1；父 log 里已完成的 turns 不会进孩子。[E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:140] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:107]
- **深度预算在 runtime，工具保持可见。** 默认 cap 3；`maxDepth: 0` 禁止任何委托，但 catalog 里仍有 `subagent`，第一次 start 才 `SubagentDepthError`。[E: packages/subagent/subagent/src/child-agent.ts:33] [E: packages/subagent/subagent-spawn-in-process/tests/subagent-spawn-in-process.spec.ts:148] 数值 cap 要求 provider `depthLimit`；spawn 有，缺能力则 mount 失败。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:42] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1248]
- **产品 provider 行默认关掉。** `subagent_codex` / `subagent_claude_code` 在 shipped preset `disabled: true`，不要把它们当成默认 catalog 成员。
- **`report` 不在父 catalog。** host `@deepseek-ai/dsh-tool-subagent-report` 往 continuable 孩子的 creation setup 里注册 `report`；四个 shipped preset **都不**再挂那一行。见 [report.md](report.md)。
- **没有 `apply_patch` / Claude Agent / Codex subagent 方言。** 本工具只委托；文件改动仍是孩子自己的 `edit` / `write` / `bash`。
- **HMR / 晚到的 backend。** 工具纤维等 `subagent/provider-added`；纤维先 dispose 再来的 provider 不会 zombie-mount。[E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:384]
- **必须有调用方 Agent。** 无 `exec.agent` 不能委托。one-shot 后台 job 的 `owner` 也是这个 parent。

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
- packages/subagent/subagent/src/depth.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/run-settlement.ts
- packages/subagent/subagent/package.json
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/jobs/jobs/src/types.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：同一包、`toolName: subagent_fork`、`provider: fork`、继承父对话已完成 turns。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：continuable 孩子的后续 turn / 中断 / 列表。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：从本工具 `execute` 再拉起子 session 的端到端走读。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition / Provider，不是本页的模型 schema。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：仅 one-shot `run_in_background` 才走的 Task 收集面。
- [report](report.md)（`surface.tools.report`）：continuable 孩子 catalog 里的回传工具，父 agent 看不见。
