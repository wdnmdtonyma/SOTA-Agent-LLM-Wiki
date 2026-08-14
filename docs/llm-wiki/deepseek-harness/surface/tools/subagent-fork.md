---
id: surface.tools.subagent-fork
title: subagent_fork
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/tool-subagent/package.json
  - packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/subagent-fork-in-process/package.json
  - packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts
  - packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/descriptor-seed.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - subagent_fork
  - apply
  - Config
  - inject
  - name
  - startInProcessRun
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.subagent
  - surface.tools.subagent-control
  - surface.tools.jobs
  - surface.tools.report
  - spine.trace-subagent
  - subsys.orchestration.subagent
  - subsys.orchestration.subagent-fork
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名 `subagent_fork`；实现包 `@deepseek-ai/dsh-tool-subagent`（Cordis 插件名 `tool-subagent`，preset 行 `id: tool-subagent-fork`）。`provider: fork` 走 host 上的 `@deepseek-ai/dsh-subagent-fork-in-process`，把父 session 已完成 turn 的前缀种进子 agent。

## 能回答的问题

- `subagent_fork` 和 `subagent` 是不是同一个包？为什么要装两次？
- 模型参数只有 `description` / `prompt` / `run_in_background` 吗？`provider` 会不会出现在 schema 里？
- shipped preset 的 `backgroundMode: continuable` 和 host `dsh-base` 的 `one-shot` 哪个才是产品默认？
- fork 子代理到底继承什么：对话历史、persona、工具、审批策略？
- 前台 / one-shot 后台 job / continuable 三条 execute 路径分别回什么？有没有 spill？
- `minimal` / `standard` / `code` / `cordis` 谁装这行？`isolate` 封的是不是 `subagents`？

## Identity

| 模型可见 `name` | 谁写上去 | 绑到哪个 `ctx.subagents` provider |
|---|---|---|
| `subagent_fork` | `Config.toolName`（本页 shipped 行显式写出） | `fork`（`Config.provider`） |

实现包是 `@deepseek-ai/dsh-tool-subagent`。 [E: packages/subagent/tool-subagent/package.json:2] Cordis 插件导出名是 `tool-subagent`，`inject` 是 `['tools', 'subagents', 'systemPrompt']`。 [E: packages/subagent/tool-subagent/src/index.ts:22] [E: packages/subagent/tool-subagent/src/index.ts:23] 工厂是 `apply(ctx, config)`：算出 `toolName` / `continuable` / `backgroundEnabled`，等名为 `config.provider` 的 provider 出现后 `ctx.tools.register(defineTool({ name: toolName, ... }))`。 [E: packages/subagent/tool-subagent/src/index.ts:267] [E: packages/subagent/tool-subagent/src/index.ts:277] [E: packages/subagent/tool-subagent/src/index.ts:297] [E: packages/subagent/tool-subagent/src/index.ts:298]

插件 schema 里 `toolName` 默认是 `'subagent'`，`provider` 必填、没有默认。 [E: packages/subagent/tool-subagent/src/index.ts:82] [E: packages/subagent/tool-subagent/src/index.ts:83] 本页的 wire 名不是这个默认值。`standard` / `code` / `cordis` 各有一行 `id: tool-subagent-fork`，同一包再 load 一次，把 `provider` 写成 `fork`、`toolName` 写成 `subagent_fork`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:193] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:196] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:197]

`fork` provider 本身不是这个工具包。`@deepseek-ai/dsh-subagent-fork-in-process`（插件名 `subagent-fork-in-process`）`inject` 只有 `['subagents']`，`apply` 里 `ctx.subagents.registerProvider(new ForkInProcessProvider(config.providerName))`，`providerName` 默认 `'fork'`。 [E: packages/subagent/subagent-fork-in-process/package.json:2] [E: packages/subagent/subagent-fork-in-process/src/index.ts:23] [E: packages/subagent/subagent-fork-in-process/src/index.ts:28] [E: packages/subagent/subagent-fork-in-process/src/index.ts:37] [E: packages/subagent/subagent-fork-in-process/src/index.ts:93] host `dsh-base` 装这一行，preset **不**再装 backend。 [E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:301]

同包还有 shipped 的 `toolName: subagent` + `provider: spawn` 行，那是 [subagent.md](subagent.md)，不在本页展开 execute。测试钉死：两个 `toolName` 可以共存，各自打到各自的 provider。 [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:184] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:198]

`backgroundMode: continuable` 且 `enableRunInBackground` 为真时，`apply()` 还往 `ctx.systemPrompt` 登记 section `tool:${toolName}`（`order: 116.5`）。provider 未出现、或当前 scope 看不见该工具时，section 文本是空串。 [E: packages/subagent/tool-subagent/src/index.ts:26] [E: packages/subagent/tool-subagent/src/index.ts:455] [E: packages/subagent/tool-subagent/src/index.ts:459] [E: packages/subagent/tool-subagent/src/index.ts:462]

## 用途定位

`subagent_fork` 把当前任务交给一个**已经看见本对话已完成 turn** 的子 agent。`ForkInProcessProvider.inheritsParentContext` 是 `true`（seam 字段是 `SubagentProvider.inheritsParentContext`），工具描述因此走 inherit 文案：子代理种了到目前为止全部已完成 turn，**看不见当前还在飞的这一轮**；适合 follow-up、review、续写，父模型只拿回结果、不拿中间步骤。 [E: packages/subagent/subagent/src/types.ts:295] [E: packages/subagent/subagent-fork-in-process/src/index.ts:64] [E: packages/subagent/tool-subagent/src/index.ts:212] [E: packages/subagent/tool-subagent/src/index.ts:215] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:414]

对照：`provider: spawn` 的 `subagent` 把 `inheritsParentContext` 设成 `false`，子 session 不带父日志。 [E: packages/subagent/subagent-spawn-in-process/src/index.ts:44] [E: packages/subagent/subagent-spawn-in-process/src/index.ts:52] 两个 backend 可以同时挂在同一个 `ctx.subagents` 上。 [E: packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts:55]

`providerWording` 只吃一个 boolean，在 inherit / fresh 两套**对话**文案之间选择；工具、服务、scope、authority 不在这个函数的输入里。 [E: packages/subagent/tool-subagent/src/index.ts:211] persona / `toolFilter` 是工具 `Config` 的可选项，要显式配置才会进 start request。 [E: packages/subagent/tool-subagent/src/index.ts:382] [E: packages/subagent/tool-subagent/src/index.ts:383]

## 输入 schema

模型参数由 `defineTool.parameters` 广告。`provider` / `toolName` / `backgroundMode` / `persona` / `toolFilter` / `maxDepth` **不是**模型字段；测试断言默认实例的 properties 只有 `description`、`prompt`、`run_in_background`。 [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:104] `defineTool` 先按 ParameterSchemaSpec 做类型 / required 校验。 [E: packages/core/tools/src/schema.ts:586]

插件 **默认 Config**（`toolName` 默认 `subagent`，`enableRunInBackground` 默认 `true`，`backgroundMode` 默认 `one-shot`）boot、且 provider 的 `inheritsParentContext === true`（fork 就是这样）时：

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `description` | `string` | 是 | 无 | 广告文案：3–5 词 | 展示用短标签，进 `request.label`，不进子模型 prompt。 [E: packages/subagent/tool-subagent/src/index.ts:308] [E: packages/subagent/tool-subagent/src/index.ts:378] |
| `prompt` | `string` | 是 | 无 | inherit 文案：子代理已看见 completed turns，只写新的 | 包成一个 `text` ContentBlock 交给子代理。 [E: packages/subagent/tool-subagent/src/index.ts:313] [E: packages/subagent/tool-subagent/src/index.ts:379] |
| `run_in_background` | `boolean` | 否 | **不传 = `false`**（one-shot） | 仅当 `enableRunInBackground` 为真时广告 | one-shot 文案：默认前台；`true` 回 job id，用 `job_output` / `job_kill`。 [E: packages/subagent/tool-subagent/src/index.ts:85] [E: packages/subagent/tool-subagent/src/index.ts:263] [E: packages/subagent/tool-subagent/src/index.ts:323] |

`prompt` 的 inherit 描述来自 `providerWording(true)`：`It already sees this conversation's completed turns`。 [E: packages/subagent/tool-subagent/src/index.ts:221] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:417]

**Config 改广告 / 改默认调度：**

| Config | 对模型 schema 的影响 |
|---|---|
| `toolName` | 改注册名。默认 `'subagent'`；本页 shipped 行写成 `subagent_fork`。 [E: packages/subagent/tool-subagent/src/index.ts:83] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:197] |
| `enableRunInBackground: false` | properties 只剩 `description` + `prompt`；execute 再拒一次 `run_in_background: true`。 [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:112] [E: packages/subagent/tool-subagent/src/index.ts:255] |
| `backgroundMode: continuable` | `run_in_background` 不传时默认 **`true`**；描述改成「默认后台、立刻回 durable id、结算后 runtime 发 notice、`send_message` 开后续 turn」。 [E: packages/subagent/tool-subagent/src/index.ts:263] [E: packages/subagent/tool-subagent/src/index.ts:304] [E: packages/subagent/tool-subagent/src/index.ts:322] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1028] |
| `backgroundMode: continuable` 但 provider 没有 `prepareContinuable` | **mount 失败**，工具不会注册。fork 实现了该方法。 [E: packages/subagent/tool-subagent/src/index.ts:292] [E: packages/subagent/subagent-fork-in-process/src/index.ts:83] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:71] |

四个 shipped preset 里，`standard` / `code` / `cordis` 的 fork 行都是 `backgroundMode: continuable`（**不要**把 host `one-shot` 抄进这张产品表）。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:199] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:186] 该配置下模型实际看见的是 continuable 那一列：省略 `run_in_background` 即后台。

**插件 Config（不是模型参数）** 还会改子代理怎么被组成：

| Config 键 | 默认 | 作用 |
|---|---|---|
| `provider` | 无（必填） | `ctx.subagents.start` / `startContinuable` 的名字。本页是 `fork`。 [E: packages/subagent/tool-subagent/src/index.ts:82] |
| `agentOptions` | 省略则不进 request | 覆盖子 agent 的 provider / model / maxTokens。 [E: packages/subagent/tool-subagent/src/index.ts:381] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:256] |
| `persona` | 省略 | 要求 provider `persona` 能力；in-process 在子 scope 登记 `deployment:persona`，shadow 部署 persona。 [E: packages/subagent/subagent-fork-in-process/src/index.ts:62] [E: packages/subagent/subagent/src/child-agent.ts:172] |
| `toolFilter.allow` / `deny` | 省略整个对象 | 要求 `toolFilter` 能力；空对象（两个键都没有）在 `apply()` 就抛。 [E: packages/subagent/tool-subagent/src/index.ts:272] |
| `maxDepth` | `3` | 数字 cap 转进 start request；`'provider-managed'` 则不传 `maxDepth`。fork 有 `depthLimit`。 [E: packages/subagent/tool-subagent/src/index.ts:98] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1226] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1274] |

## 输出 & 截断 / spill

`output.schema` 是 `oneOf` 三个 object，都 `additionalProperties: false`： [E: packages/subagent/tool-subagent/src/index.ts:329]

| `kind` | 字段 | 何时出现 |
|---|---|---|
| `continuable` | `subagentId` | `backgroundMode: continuable` 且调度到后台。 [E: packages/subagent/tool-subagent/src/index.ts:398] |
| `background` | `jobId` | one-shot 且调度到后台；`jobs.start({ kind: 'subagent' })`，id 前缀因此是 `subagent-N`。 [E: packages/subagent/tool-subagent/src/index.ts:407] [E: packages/jobs/jobs/src/types.ts:25] |
| `foreground` | `runId` + `output` | 等到 `SubagentRun.result`；`output` 是子代理选中的 ContentBlock JSON。 [E: packages/subagent/tool-subagent/src/index.ts:181] |

`output.render`：`background` → `started background subagent task ${jobId}`；`continuable` → `started subagent ${subagentId}`；`foreground` → 只拼接 `type: 'text'` 的块。 [E: packages/subagent/tool-subagent/src/index.ts:359] [E: packages/subagent/tool-subagent/src/index.ts:102] 测试钉死 continuable ack 形如 `started subagent <id>`，且 **不** 建 Task。 [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1045] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1049]

本工具**没有**自己的 byte cap / spill 路径。前台成功把子代理最终文本原样交给父模型；中间 tool 步骤不回传。非 `completed` 的 `stopReason` 走 `isError`，但 `withPartialText` 会把子代理已写出的 text 附在错误后面。 [E: packages/subagent/tool-subagent/src/index.ts:123] [E: packages/subagent/tool-subagent/src/index.ts:149] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:174]

one-shot 读结果时，`readResult` 只扫 seed **之后** 的子自有事件：子代理自己没产出 assistant 消息时，返回空 `output`，不会把父日志里的旧回答当成子结果。 [E: packages/subagent/subagent-in-process-driver/src/index.ts:214] [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:193]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `ctx.subagents` / `SubagentRuntime` | `super(ctx, 'subagents')`。`start` 发 one-shot run；`startContinuable` 建 durable 子会话。 [E: packages/subagent/subagent/src/index.ts:184] [E: packages/subagent/subagent/src/index.ts:414] [E: packages/subagent/subagent/src/index.ts:212] |
| Provider（本页） | `ForkInProcessProvider`（名默认 `fork`） | `inheritsParentContext = true`；`start` / `prepareContinuable` 都切 `completedTurnPrefix`。能力：`outputSchema` / `depthLimit` / `toolFilter` / `persona`。 [E: packages/subagent/subagent-fork-in-process/src/index.ts:62] [E: packages/subagent/subagent-fork-in-process/src/index.ts:69] [E: packages/subagent/subagent-fork-in-process/src/index.ts:87] |
| Provider（对照） | `SpawnInProcessProvider`（名默认 `spawn`） | 不 seed；`inheritsParentContext = false`。 [E: packages/subagent/subagent-spawn-in-process/src/index.ts:44] |
| Consumer | `@deepseek-ai/dsh-tool-subagent` 的 `subagent_fork` 实例 | `config.provider` 选人；不自己 `agents.create`。 |

换掉 `fork` provider 会带走：seed 怎么切、有没有 `prepareContinuable`、`inheritsParentContext` 文案、能力集合。工具代码只认 registry 名字。

其它消费：

- `ctx.tools`：注册与 `get(toolName, scope)`（continuable section 用它判断当前 agent 能不能看见工具）。 [E: packages/subagent/tool-subagent/src/index.ts:462]
- `ctx.systemPrompt`：continuable 实例的 `tool:subagent_fork` section。 [E: packages/subagent/tool-subagent/src/index.ts:459]
- `ctx.get('jobs')`：只在 **one-shot 后台** 取。缺服务就失败，不静默改前台。 [E: packages/subagent/tool-subagent/src/index.ts:400] shipped preset 的 fork 行是 continuable，默认路径**不**碰 jobs。
- `ctx.agents` / session persistence：continuable 由 `SubagentContinuationManager` 物化；`prepareContinuable` 返回的 seed 经 `seedDescriptorTurn` 再追加一条 `subagent/descriptor`。 [E: packages/subagent/subagent/src/continuation.ts:428] [E: packages/subagent/subagent/src/descriptor-seed.ts:29]
- 子创建窗口：`applyChildComposition` 先 `composeFrom` 父 preset，再写 `subagent:delegation` context；可选 persona / `tools.restrict`。 [E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/subagent/subagent/src/child-agent.ts:170]
- 审批：`captureDelegatedPolicyOverrides` 在有 `ctx.approval` 时把子 session 的 `approval/policy` 钉成 `'never'`。 [E: packages/subagent/subagent/src/child-agent.ts:202]

`subagents` registry 和 spawn/fork backend 在 **host**（`dsh-base`）：`id: subagent` 装 `@deepseek-ai/dsh-subagent`，旁边是 spawn / fork in-process backend。preset 只贡献 model-facing 工具行。 [E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:293] [E: packages/bundle/base/cordis.patch.yml:300]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。 [E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] 本工具**不**自己挂 pre-execute listener，也**不**在 body 里 `ask`。

对本工具的挂点：

- **timeout：** `defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读 `ctx.tools.get(...).timeoutMs`，`undefined` 就原样 `next()`。 [E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] 取消靠 `exec.signal` 传进 `start` / `startContinuable`。 [E: packages/subagent/tool-subagent/src/index.ts:396]
- **approval：** 父调用不走 `ask`。子代理若组成了 approval 服务，delegation 把子政策钉成 `never`。 [E: packages/subagent/subagent/src/child-agent.ts:202]
- **sandbox：** 本工具不 confine。子代理通过 `applyChildComposition` 加入父 preset，并可能带上父 session 的 sandbox override（`source: 'delegation'`）。 [E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/subagent/subagent/src/child-agent.ts:220]
- **并行：** `isConcurrencySafe: () => true`，`executionMode` 是 `parallel`。 [E: packages/subagent/tool-subagent/src/index.ts:368] [E: packages/core/tools/src/index.ts:1281] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:138]
- **Code Mode：** `code` preset 仍装本行，但另挂 `tool-presentation` `mode: code`。无 `parent` 的模型直调 `subagent_fork` 在进 waterfall 前 `collapses`（名字不是 `run_code`），必须从 `run_code` 程序里调。 [E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]
- **lifecycle：** 工具注册镜像 `subagent/provider-added` / `provider-removed`。provider 未到时 catalog 里没有 `subagent_fork`，只打一条 info。 [E: packages/subagent/tool-subagent/src/index.ts:440] [E: packages/subagent/tool-subagent/src/index.ts:453]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。host `dsh-base` / `dsh-web-app` 行写在表后对照，**不是** preset 格子。

| preset | 装 `id: tool-subagent-fork`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。yml 无 `@deepseek-ai/dsh-tool-subagent`。该 preset 只挂 persona + persistent bash + `str_replace_editor` | — | 本包未出现 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] | — |
| `standard` | 是 | 无 | 行在 `delegation` group；group 只 `isolate.workflowEngine: true`，**不** isolate `subagents` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] | `provider: fork`、`toolName: subagent_fork`、`backgroundMode: continuable` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:196] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198] |
| `code` | 是 | 无 | 同 standard [E: apps/cli/config/agent-presets/code/agent.cordis.yml:175] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:179] | 同 standard [E: apps/cli/config/agent-presets/code/agent.cordis.yml:197] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:199] |
| `cordis` | 是 | 无 | 同 standard [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:162] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:166] | 同 standard [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:184] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:186] |

组合旁注（不是 preset 成员资格）：

- `dsh-base` 装 `@deepseek-ai/dsh-subagent-fork-in-process`（`providerName: fork`），以及一行 `tool-subagent-fork`：`provider: fork`、`toolName: subagent_fork`、**`backgroundMode: one-shot`**。 [E: packages/bundle/base/cordis.patch.yml:303] [E: packages/bundle/base/cordis.patch.yml:327] [E: packages/bundle/base/cordis.patch.yml:329] 这是 host 默认，**不要**当成 shipped preset 行为。
- `dsh-web-app` overlay 把 host `tool-subagent-fork` 设 `disabled: true`，改由每个 session 的 preset remount（preset 行是 `continuable`）。 [E: packages/bundle/web-app/cordis.patch.yml:383] [E: packages/bundle/web-app/cordis.patch.yml:384]
- fork backend **不被** web-app disable；registry 留在 host。
- 四个 shipped preset **都不**再挂 `@deepseek-ai/dsh-tool-subagent-report`。continuable 子代理上的 `report` 来自 host-plane setup，见 [report.md](report.md)。

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validate` 广告过的参数，再进用户 `execute`。 [E: packages/core/tools/src/schema.ts:586]
2. `execute@packages/subagent/tool-subagent/src/index.ts` 读 `exec.agent`。没有 calling agent 直接抛 `subagent tool requires a calling agent`。 [E: packages/subagent/tool-subagent/src/index.ts:370] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:296]
3. 组 `request`：`label = args.description`，`prompt = [{ type: 'text', text: args.prompt }]`，`parent`，再按 Config 可选带上 `agentOptions` / `persona` / `toolFilter` / 数字 `maxDepth`。 [E: packages/subagent/tool-subagent/src/index.ts:377]
4. `resolveDelegationRun@packages/subagent/tool-subagent/src/index.ts`：`enableRunInBackground === false` 时若模型仍传 `run_in_background: true` 则抛；否则 `runInBackground = args.run_in_background ?? continuable`。 [E: packages/subagent/tool-subagent/src/index.ts:263] [E: packages/subagent/tool-subagent/src/index.ts:387]
5. **continuable 后台**（shipped fork 默认）：`ctx.subagents.startContinuable({ provider: config.provider, label, request, signal: exec.signal })`。service 把调用交给 continuation manager；`submit` 在 `followup` 入 inbox 后立刻 `return accepted`，**不** `whenIdle`。工具返回 `{ kind: 'continuable', subagentId }`。 [E: packages/subagent/tool-subagent/src/index.ts:392] [E: packages/subagent/subagent/src/index.ts:212] [E: packages/subagent/subagent/src/continuation.ts:1141] [E: packages/subagent/subagent/src/continuation.ts:1146]
6. continuable 物化：manager 调 `provider.prepareContinuable`。fork 在这一刻切一次 `completedTurnPrefix`；有 completed turn 就带 `seed`，否则 `{}`。 [E: packages/subagent/subagent/src/continuation.ts:428] [E: packages/subagent/subagent-fork-in-process/src/index.ts:87] [E: packages/subagent/subagent-fork-in-process/src/index.ts:88] 前缀写进子自己的 durable transcript，冷恢复重放这份前缀，不会按父后来的新历史再 fork 一次。测试钉死：无 completed turn 时 `seed` 为 `undefined`；有则最后一项是 `turn/end` 且 seq 连续。 [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:224] [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:237]
7. **one-shot 后台**（host 默认 fork 行；shipped preset 不是这条）：要 `ctx.jobs`；`jobs.start({ kind: 'subagent', owner: parent, run })` 立刻回 `{ kind: 'background', jobId }`。`run()` 里才 `ctx.subagents.start`。缺 jobs 失败；job preflight 失败则 `starts === 0`。 [E: packages/subagent/tool-subagent/src/index.ts:406] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:855] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1192]
8. **前台**（continuable 且显式 `run_in_background: false`，或 one-shot 默认）：`ctx.subagents.start(config.provider, { ...request, signal })`，再 `settleForegroundRun`：等 `run.result`，然后 `run.dispose()`。失败 stopReason 变 `Error`；dispose 失败与结果失败合成 `AggregateError`。 [E: packages/subagent/tool-subagent/src/index.ts:425] [E: packages/subagent/tool-subagent/src/index.ts:167] [E: packages/subagent/tool-subagent/tests/tool-subagent.spec.ts:1078]
9. **fork `start`（one-shot）**：`completedTurnPrefix(parent)` = 父 `session.events` 切到**最后一条** `turn/end`（含）。没有 `turn/end` 则 `[]`，`startInProcessRun` 不传 `seed`，子 session 当 fresh。 [E: packages/subagent/subagent-fork-in-process/src/index.ts:50] [E: packages/subagent/subagent-fork-in-process/src/index.ts:73] [E: packages/subagent/subagent-in-process-driver/src/index.ts:135] 父正在飞的未完成 turn 不进 seed；测试在 hanging 第二轮 fork 仍能通过 invariant replay。 [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:155]
10. 共享驱动 `startInProcessRun@packages/subagent/subagent-in-process-driver/src/index.ts`：算 `childDepth`、`childSessionMeta`（`parentSession`、`delegationDepth`、有前缀时 `seedLength`）、`applyChildComposition`、可选 structured runtime，然后 `parent.ctx.agents.create`。 [E: packages/subagent/subagent-in-process-driver/src/index.ts:132] [E: packages/subagent/subagent/src/child-agent.ts:112] 子 header 的 `seedLength` 等于种进去的父前缀长度。 [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:130]

## 设计动机·edge

- **同一包装两次。** 模型目录里的 `subagent` 与 `subagent_fork` 都是 `@deepseek-ai/dsh-tool-subagent`。差别是 `toolName` + `provider`，不是两套 execute 实现。spawn 细节在 [subagent.md](subagent.md)。
- **对话 seed ≠ persona。** fork 继承的是父日志的 completed-turn 前缀。`Config.persona` 另走 `deployment:persona` section。shipped fork 行**没有**写 `persona`，子代理沿用它 join 的父 preset / 部署 persona。 [E: packages/subagent/subagent/src/child-agent.ts:172]
- **空前缀就是 spawn 形。** 父还没有任何 `turn/end` 时 fork 省略 seed，`seedLength` 不出现。 [E: packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts:87]
- **当前 in-flight turn 不可 replay。** seed 停在最后一个 `turn/end`。把未闭合的 `turn/start` 种进去会在子 session 创建时炸掉 invariant。
- **host `one-shot` vs preset `continuable`。** 插件 schema 与 `dsh-base` host 行默认 `one-shot`；三个 shipped preset 覆盖成 `continuable`。fork 源码里的 TODO 仍写「没有 shipped composition 会走 `prepareContinuable`」。文件现状互相打架，产品意图标 [U]（见 `_staging/uncertainty-c1-subagent-fork.md`）。本页 Preset 表只认四个 `agent.cordis.yml`。
- **continuable 默认后台。** shipped 实例省略 `run_in_background` 就立刻回 `subagentId`。父要阻塞等结果必须显式 `false`。后续 turn 走 [subagent-control.md](subagent-control.md) 的 `send_message`，不是再调一次 `subagent_fork`。
- **`subagent_codex` / `subagent_claude_code`。** 同包另两行，shipped preset `disabled: true`。它们不是 fork，细节留在 [subagent.md](subagent.md) 的 edge。
- **深度。** 默认 cap `3`；`0` 禁止再委托。数字 cap 要求 provider `depthLimit`，否则 mount 失败。fork 有该能力。 [E: packages/subagent/tool-subagent/src/index.ts:285]
- **需要 owning agent。** agentless / 无 `exec.agent` 的调用过不了门。Code Mode 下模型直调还会先被 collapse。

## Sources

- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/tool-subagent/package.json
- packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
- packages/subagent/subagent-fork-in-process/src/index.ts
- packages/subagent/subagent-fork-in-process/package.json
- packages/subagent/subagent-fork-in-process/tests/subagent-fork-in-process.spec.ts
- packages/subagent/subagent-fork-in-process/tests/multi-subagent.spec.ts
- packages/subagent/subagent-spawn-in-process/src/index.ts
- packages/subagent/subagent-in-process-driver/src/index.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/descriptor-seed.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent](subagent.md)（`surface.tools.subagent`）：同包、`toolName: subagent`、`provider: spawn`、fresh 子会话。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：continuable 子代理的后续 turn 与列举。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：one-shot 后台 `kind: 'subagent'` 的收集与杀死。
- [report](report.md)（`surface.tools.report`）：continuable in-process 子代理上的回报工具，preset 不挂。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：从工具调用走到 child Agent 的端到端走读。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition，不是本页的模型 schema。
- [in-process fork](../../subsystems/orchestration/subagent-fork.md)（`subsys.orchestration.subagent-fork`）：`ForkInProcessProvider` 子系统页。
