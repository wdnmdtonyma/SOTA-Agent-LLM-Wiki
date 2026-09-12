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
  - packages/subagent/tool-subagent/tests/model-selection.spec.ts
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
  - packages/subagent/subagent/src/continuation-messages.ts
  - packages/subagent/subagent/src/continuation-activation.ts
  - packages/subagent/subagent/src/descriptor.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/system-prompt/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
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
updated: c291e7961a
---

> 模型可见名 `subagent_fork`；实现包 `@deepseek-ai/dsh-tool-subagent`（Cordis 插件名 `tool-subagent`，preset 行 `id: tool-subagent-fork`）。`provider: fork` 走 host 上的 `@deepseek-ai/dsh-subagent-fork-in-process`，把父 session 已完成 turn 的前缀种进子 agent。

## 能回答的问题

- `subagent_fork` 和 `subagent` 是不是同一个包？为什么要装两次？
- 模型参数只有 `description` / `prompt` / `run_in_background` 吗？`provider` 会不会出现在 schema 里？
- shipped preset 的 `backgroundMode: continuable` 和 host `dsh-base` 的 `one-shot` 哪个才是产品默认？
- fork 子代理到底继承什么：对话历史、persona、工具、审批策略？
- 前台 / one-shot 后台 job / continuable 三条 execute 路径分别回什么？有没有 spill？
- `minimal` / `standard` / `ptc` / `cordis` 谁装这行？`isolate` 封的是不是 `subagents`？

## Identity

| 模型可见 `name` | 谁写上去 | 绑到哪个 `ctx.subagents` provider |
|---|---|---|
| `subagent_fork` | `Config.toolName`（本页 shipped 行显式写出） | `fork`（`Config.provider`） |

实现包是 `@deepseek-ai/dsh-tool-subagent`。[E: packages/subagent/tool-subagent/package.json:2] Cordis 插件导出名是 `tool-subagent`，`inject` 是 `['tools', 'subagents', 'systemPrompt', 'sessionProjections']`。[E: packages/subagent/tool-subagent/src/index.ts:44] [E: packages/subagent/tool-subagent/src/index.ts:45] 工厂是 `apply(ctx, config)`：算出 `toolName` / `continuable` / `backgroundEnabled`，等名为 `config.provider` 的 provider 出现后 `runtimeCtx.tools.register(defineTool({ name: toolName, ... }))`。[E: packages/subagent/tool-subagent/src/index.ts:313] [E: packages/subagent/tool-subagent/src/index.ts:323] [E: packages/subagent/tool-subagent/src/index.ts:379]

插件 schema 里 `toolName` 默认是 `'subagent'`，`provider` 必填、没有默认。[E: packages/subagent/tool-subagent/src/index.ts:106] [E: packages/subagent/tool-subagent/src/index.ts:107] 本页的 wire 名不是这个默认值。`standard` / `ptc` / `cordis` 各有一行 `id: tool-subagent-fork`，同一包再 load 一次，把 `provider` 写成 `fork`、`toolName` 写成 `subagent_fork`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:193] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:196] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:197]

`fork` provider 本身不是这个工具包。`@deepseek-ai/dsh-subagent-fork-in-process`（插件名 `subagent-fork-in-process`）`inject` 只有 `['subagents']`，`apply` 里 `ctx.subagents.registerProvider(new ForkInProcessProvider(config.providerName))`，`providerName` 默认 `'fork'`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:23] [E: packages/subagent/subagent-fork-in-process/src/index.ts:28] [E: packages/subagent/subagent-fork-in-process/src/index.ts:94] host `dsh-base` 装这一行，preset **不**再装 backend。[E: packages/bundle/base/cordis.patch.yml:336] [E: packages/bundle/base/cordis.patch.yml:339]

同包还有 shipped 的 `toolName: subagent` + `provider: spawn` 行，那是 [subagent.md](subagent.md)，不在本页展开 execute。测试钉死：两个 `toolName` 可以共存，各自打到各自的 provider。

`backgroundMode: continuable` 且 `enableRunInBackground` 为真时，`install()` 还往 `ctx.systemPrompt` 登记 section `tool:${toolName}`（`order: getSectionOrder('TOOL_SUBAGENT')`）。provider 未出现、或当前 scope 看不见该工具时，section 文本是空串。[E: packages/subagent/tool-subagent/src/index.ts:594] [E: packages/subagent/tool-subagent/src/index.ts:598] [E: packages/core/system-prompt/src/index.ts:145]

## 用途定位

`subagent_fork` 把当前任务交给一个**已经看见本对话已完成 turn** 的子 agent。`ForkInProcessProvider.inheritsParentContext` 是 `true`（seam 字段是 `SubagentProvider.inheritsParentContext`），工具描述因此走 inherit 文案：子代理种了到目前为止全部已完成 turn，**看不见当前还在飞的这一轮**；适合 follow-up、review、续写，父模型只拿回结果、不拿中间步骤。[E: packages/subagent/subagent/src/types.ts:354] [E: packages/subagent/subagent-fork-in-process/src/index.ts:72] [E: packages/subagent/tool-subagent/src/index.ts:252] [E: packages/subagent/tool-subagent/src/index.ts:255]

对照：`provider: spawn` 的 `subagent` 把 `inheritsParentContext` 设成 `false`，子 session 不带父日志。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:50] 两个 backend 可以同时挂在同一个 `ctx.subagents` 上。

`providerWording` 只吃一个 boolean，在 inherit / fresh 两套**对话**文案之间选择；工具、服务、scope、authority 不在这个函数的输入里。[E: packages/subagent/tool-subagent/src/index.ts:251] persona / `toolFilter` 是工具 `Config` 的可选项，要显式配置才会进 start request。[E: packages/subagent/tool-subagent/src/index.ts:520] [E: packages/subagent/tool-subagent/src/index.ts:521]

shipped fork 行**不**开 `modelSelectionSettings`（注释写明保持与父相同的 provider/model 以便 KV Cache）。因此模型 schema **没有** `provider` / `model` / `reasoning_effort` 字段。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:189]

## 输入 schema

模型参数由 `defineTool.parameters` 广告。`Config.provider` / `toolName` / `backgroundMode` / `persona` / `toolFilter` / `maxDepth` **不是**模型字段。未开 model selection 时 properties 只有 `description`、`prompt`、`run_in_background`。

插件 **默认 Config**（`toolName` 默认 `subagent`，`enableRunInBackground` 默认 `true`，`backgroundMode` 默认 `one-shot`）boot、且 provider 的 `inheritsParentContext === true`（fork 就是这样）时：

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `description` | `string` | 是 | 无 | 广告文案：3–5 词 | 展示用短标签，进 `request.label`，不进子模型 prompt。[E: packages/subagent/tool-subagent/src/index.ts:390] [E: packages/subagent/tool-subagent/src/index.ts:516] |
| `prompt` | `string` | 是 | 无 | inherit 文案：子代理已看见 completed turns，只写新的 | 包成一个 `text` ContentBlock 交给子代理。[E: packages/subagent/tool-subagent/src/index.ts:395] [E: packages/subagent/tool-subagent/src/index.ts:517] |
| `run_in_background` | `boolean` | 否 | **不传 = `false`**（one-shot） | 仅当 `enableRunInBackground` 为真时广告 | one-shot 文案：默认前台；`true` 回 job id，用 `job_output` / `job_kill`。[E: packages/subagent/tool-subagent/src/index.ts:110] [E: packages/subagent/tool-subagent/src/index.ts:303] [E: packages/subagent/tool-subagent/src/index.ts:425] |

`prompt` 的 inherit 描述来自 `providerWording(true)`：`It already sees this conversation's completed turns`。[E: packages/subagent/tool-subagent/src/index.ts:261]

**Config 改广告 / 改默认调度：**

| Config | 对模型 schema 的影响 |
|---|---|
| `toolName` | 改注册名。默认 `'subagent'`；本页 shipped 行写成 `subagent_fork`。[E: packages/subagent/tool-subagent/src/index.ts:107] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:197] |
| `enableRunInBackground: false` | properties 只剩 `description` + `prompt`；execute 再拒一次 `run_in_background: true`。 |
| `backgroundMode: continuable` | `run_in_background` 不传时默认 **`true`**；描述改成「默认后台、立刻回 durable id、结算后 runtime 发 notice、`send_message` 开后续 turn」。[E: packages/subagent/tool-subagent/src/index.ts:303] [E: packages/subagent/tool-subagent/src/index.ts:386] [E: packages/subagent/tool-subagent/src/index.ts:423] |
| `backgroundMode: continuable` 但 provider 没有 `prepareContinuable` | **mount 失败**，工具不会注册。fork 实现了该方法。[E: packages/subagent/tool-subagent/src/index.ts:345] [E: packages/subagent/subagent-fork-in-process/src/index.ts:85] |
| `modelSelectionSettings: true` | 广告 `provider` / `model` / `reasoning_effort`；fork shipped 行**不开**此项。[E: packages/subagent/tool-subagent/src/index.ts:400] |

四个 shipped preset 里，`standard` / `ptc` / `cordis` 的 fork 行都是 `backgroundMode: continuable`（**不要**把 host `one-shot` 抄进这张产品表）。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:198] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:205] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:186] 该配置下模型实际看见的是 continuable 那一列：省略 `run_in_background` 即后台。

**插件 Config（不是模型参数）** 还会改子代理怎么被组成：

| Config 键 | 默认 | 作用 |
|---|---|---|
| `provider` | 无（必填） | `ctx.subagents.start` / `startContinuable` 的名字。本页是 `fork`。[E: packages/subagent/tool-subagent/src/index.ts:106] |
| `agentOptions` | 省略则不进 request | 覆盖子 agent 的 provider / model / maxTokens。[E: packages/subagent/tool-subagent/src/index.ts:519] |
| `persona` | 省略 | 要求 provider `persona` 能力；in-process 在子 scope 登记 `deployment:persona-prefix`，shadow 部署 persona。[E: packages/subagent/tool-subagent/src/index.ts:76] [E: packages/subagent/subagent/src/child-agent.ts:212] |
| `toolFilter.allow` / `deny` | 省略整个对象 | 要求 `toolFilter` 能力；空对象（两个键都没有）在 `apply()` 就抛。[E: packages/subagent/tool-subagent/src/index.ts:318] |
| `maxDepth` | `3` | 数字 cap 转进 start request；`'provider-managed'` 则不传 `maxDepth`。fork 有 `depthLimit`。 |

## 输出 & 截断 / spill

`output.schema` 是 `oneOf` 三个 object，都 `additionalProperties: false`：[E: packages/subagent/tool-subagent/src/index.ts:429]

| `kind` | 字段 | 何时出现 |
|---|---|---|
| `continuable` | `subagentId` | `backgroundMode: continuable` 且调度到后台。[E: packages/subagent/tool-subagent/src/index.ts:536] |
| `background` | `jobId` | one-shot 且调度到后台；`jobs.start({ kind: 'subagent' })`，id 前缀因此是 `subagent-N`。[E: packages/subagent/tool-subagent/src/index.ts:544] [E: packages/jobs/jobs/src/types.ts:25] |
| `foreground` | `runId` + `output` | 等到 `SubagentRun.result`；`output` 是子代理选中的 ContentBlock JSON。 |

`output.render`：`background` → `started background subagent job ${jobId}`；`continuable` → `started subagent ${subagentId}`；`foreground` → 只拼接 `type: 'text'` 的块。[E: packages/subagent/tool-subagent/src/index.ts:461] 测试钉死 continuable ack 形如 `started subagent <id>`，且 **不** 建 Job。

本工具**没有**自己的 byte cap / spill 路径。前台成功把子代理最终文本原样交给父模型；中间 tool 步骤不回传。结算 notice 无 closing 时文案是 `It left no closing message.`。[E: packages/subagent/subagent/src/continuation-messages.ts:144]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `ctx.subagents` / `SubagentRuntime` | `start` 发 one-shot run；`startContinuable` 建 durable 子会话。[E: packages/subagent/subagent/src/index.ts:228] |
| Provider（本页） | `ForkInProcessProvider`（名默认 `fork`） | `inheritsParentContext = true`；`start` / `prepareContinuable` 都切 `completedTurnPrefix`。能力：`outputSchema` / `depthLimit` / `toolFilter` / `persona`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:72] [E: packages/subagent/subagent-fork-in-process/src/index.ts:85] |
| Provider（对照） | `SpawnInProcessProvider`（名默认 `spawn`） | 不 seed；`inheritsParentContext = false`。[E: packages/subagent/subagent-spawn-in-process/src/index.ts:50] |
| Consumer | `@deepseek-ai/dsh-tool-subagent` 的 `subagent_fork` 实例 | `config.provider` 选人；不自己 `agents.create`。 |

换掉 `fork` provider 会带走：seed 怎么切、有没有 `prepareContinuable`、`inheritsParentContext` 文案、能力集合。工具代码只认 registry 名字。

其它消费：

- `ctx.tools`：注册与 `get(toolName, scope)`（continuable section 用它判断当前 agent 能不能看见工具）。[E: packages/subagent/tool-subagent/src/index.ts:601]
- `ctx.systemPrompt`：continuable 实例的 `tool:subagent_fork` section。[E: packages/subagent/tool-subagent/src/index.ts:598]
- `ctx.get('jobs')`：只在 **one-shot 后台** 取。缺服务就失败，不静默改前台。[E: packages/subagent/tool-subagent/src/index.ts:538] shipped preset 的 fork 行是 continuable，默认路径**不**碰 jobs。
- `ctx.agents` / session persistence：continuable 由 continuation manager 物化；创建窗口 `session.append('subagent/descriptor', create.descriptor)`（`descriptor.ts`，`SUBAGENT_DESCRIPTOR_VERSION = 3`，无 `surfaceOp`）。[E: packages/subagent/subagent/src/continuation-activation.ts:583] [E: packages/subagent/subagent/src/descriptor.ts:48]
- 子创建窗口：`applyChildComposition` 先 `composeFrom` 父 preset，再写 `subagent:delegation` context；可选 persona / `tools.restrict`。[E: packages/subagent/subagent/src/child-agent.ts:199] [E: packages/subagent/subagent/src/child-agent.ts:205]
- 审批：`captureDelegatedPolicyOverrides` 在有 `ctx.approval` 时把子 session 的 `approvalPolicy` 钉成 `'never'`。[E: packages/subagent/subagent/src/child-agent.ts:245]

`subagents` registry 和 spawn/fork backend 在 **host**（`dsh-base`）：`id: subagent` 装 `@deepseek-ai/dsh-subagent`，旁边是 spawn / fork in-process backend。preset 只贡献 model-facing 工具行。[E: packages/bundle/base/cordis.patch.yml:328] [E: packages/bundle/base/cordis.patch.yml:336]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。本工具**不**自己挂 pre-execute listener，也**不**在 body 里 `ask`。

对本工具的挂点：

- **timeout：** `defineTool` **没有**设 `timeoutMs`。取消靠 `exec.signal` 传进 `start` / `startContinuable`。[E: packages/subagent/tool-subagent/src/index.ts:534]
- **approval：** 父调用不走 `ask`。子代理若组成了 approval 服务，delegation 把子政策钉成 `never`。[E: packages/subagent/subagent/src/child-agent.ts:245]
- **sandbox：** 本工具不 confine。子代理通过 `applyChildComposition` 加入父 preset；`captureDelegatedPolicyOverrides` 只带走父 session 上显式的 sandbox override。[E: packages/subagent/subagent/src/child-agent.ts:199] [E: packages/subagent/subagent/src/child-agent.ts:244]
- **并行：** `isConcurrencySafe: () => true`，`executionMode` 是 `parallel`。[E: packages/subagent/tool-subagent/src/index.ts:470]
- **PTC：** `ptc` preset 仍装本行，但另挂 `tool-presentation` `mode: ptc`。无 `parent` 的模型直调 `subagent_fork` 在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:272] [E: packages/core/tools/src/index.ts:1371]
- **lifecycle：** 工具注册镜像 `subagent/provider-added` / `provider-removed`。provider 未到时 catalog 里没有 `subagent_fork`，只打一条 info。[E: packages/subagent/tool-subagent/src/index.ts:579] [E: packages/subagent/tool-subagent/src/index.ts:592]

## Preset 装配

成员资格只认 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml`。host `dsh-base` / `dsh-web-app` 行写在表后对照，**不是** preset 格子。web profile 叠 `dsh-base` + `dsh-web-app`；headless / sdk / acp 仍跑 host-plane 工具行。`desktop` 不是第六个 CLI profile。

| preset | 装 `id: tool-subagent-fork`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。yml 无 `@deepseek-ai/dsh-tool-subagent`。该 preset 只挂 complete persona + 持久 bash/pwsh | — | 本包未出现 [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:9] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21] | — |
| `standard` | 是 | 无 | 行在 `delegation` group；group 只 `isolate.workflowEngine: true`，**不** isolate `subagents` [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:169] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:173] | `provider: fork`、`toolName: subagent_fork`、`backgroundMode: continuable` [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:196] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:198] |
| `ptc` | 是 | 无 | 同 standard（`delegation` / `workflowEngine`） [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:176] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:180] | 同 standard [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:203] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:205] |
| `cordis` | 是 | 无 | 同 standard [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:158] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:161] | 同 standard [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:184] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:186] |

组合旁注（不是 preset 成员资格）：

- `dsh-base` 装 `@deepseek-ai/dsh-subagent-fork-in-process`（`providerName: fork`），以及一行 `tool-subagent-fork`：`provider: fork`、`toolName: subagent_fork`、**`backgroundMode: one-shot`**。[E: packages/bundle/base/cordis.patch.yml:336] [E: packages/bundle/base/cordis.patch.yml:362] [E: packages/bundle/base/cordis.patch.yml:367] 这是 host 默认，**不要**当成 shipped preset 行为。headless / sdk / sdk-minimal / acp 不 disable 这行，因此那些 profile 的 fork 工具是 **one-shot**。
- `dsh-web-app` overlay 把 host `tool-subagent-fork` 设 `disabled: true`，改由每个 session 的 preset remount（preset 行是 `continuable`）。[E: packages/bundle/web-app/cordis.patch.yml:452]
- fork backend **不被** web-app disable；registry 留在 host。
- 四个 shipped preset **都不**挂已删除的 `@deepseek-ai/dsh-tool-subagent-report`。见退役页 [report.md](report.md)。

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validate` 广告过的参数，再进用户 `execute`。
2. `execute` 读 `exec.agent`。没有 calling agent 直接抛 `subagent tool requires a calling agent`。[E: packages/subagent/tool-subagent/src/index.ts:473]
3. 组 `request`：`label = args.description`，`prompt = [{ type: 'text', text: args.prompt }]`，`parent`，再按 Config 可选带上 `agentOptions` / `persona` / `toolFilter` / 数字 `maxDepth`。[E: packages/subagent/tool-subagent/src/index.ts:515]
4. `resolveDelegationRun`：`enableRunInBackground === false` 时若模型仍传 `run_in_background: true` 则抛；否则 `runInBackground = args.run_in_background ?? continuable`。[E: packages/subagent/tool-subagent/src/index.ts:303] [E: packages/subagent/tool-subagent/src/index.ts:525]
5. **continuable 后台**（web shipped fork 默认）：`ctx.subagents.startContinuable({ provider: config.provider, label, request, signal: exec.signal })`。manager 在 admission 完成后立刻返回，**不** `whenIdle`。工具返回 `{ kind: 'continuable', subagentId }`。[E: packages/subagent/tool-subagent/src/index.ts:530] [E: packages/subagent/subagent/src/index.ts:228] [E: packages/subagent/subagent/src/continuation.ts:102]
6. continuable 物化：manager 调 `provider.prepareContinuable`。fork 在这一刻切一次 `completedTurnPrefix`；有 completed turn 就带 `seed`，否则 `{}`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:85] [E: packages/subagent/subagent-fork-in-process/src/index.ts:90] 前缀写进子自己的 durable transcript，冷恢复重放这份前缀，不会按父后来的新历史再 fork 一次。
7. **one-shot 后台**（host `dsh-base` fork 行；shipped preset 不是这条）：要 `ctx.jobs`；`jobs.start({ kind: 'subagent', owner: parent, run })` 立刻回 `{ kind: 'background', jobId }`。`run()` 里才 `ctx.subagents.start`。缺 jobs 失败。[E: packages/subagent/tool-subagent/src/index.ts:544]
8. **前台**（continuable 且显式 `run_in_background: false`，或 one-shot 默认）：`ctx.subagents.start(config.provider, { ...request, signal })`，再 `settleForegroundRun`：等 `run.result`，然后 `run.dispose()`。[E: packages/subagent/tool-subagent/src/index.ts:563]
9. **fork `start`（one-shot）**：`completedTurnPrefix(parent)` = 父 `session.snapshotEvents()` 切到**最后一条** `turn/end`（含）。没有 `turn/end` 则 `[]`，`startInProcessRun` 不传 `seed`，子 session 当 fresh。[E: packages/subagent/subagent-fork-in-process/src/index.ts:48] [E: packages/subagent/subagent-fork-in-process/src/index.ts:76] 父正在飞的未完成 turn 不进 seed。
10. 共享驱动 `startInProcessRun`：算 `childDepth`、`childSessionMeta`、`applyChildComposition`、可选 structured runtime，然后 `parent.ctx.agents.create`。[E: packages/subagent/subagent/src/child-agent.ts:199]

## 设计动机·edge

- **同一包装两次。** 模型目录里的 `subagent` 与 `subagent_fork` 都是 `@deepseek-ai/dsh-tool-subagent`。差别是 `toolName` + `provider`，不是两套 execute 实现。spawn 细节在 [subagent.md](subagent.md)。
- **对话 seed ≠ persona。** fork 继承的是父日志的 completed-turn 前缀。`Config.persona` 另走 `deployment:persona-prefix` section。shipped fork 行**没有**写 `persona`，子代理沿用它 join 的父 preset / 部署 persona。[E: packages/subagent/subagent/src/child-agent.ts:212]
- **空前缀就是 spawn 形。** 父还没有任何 `turn/end` 时 fork 省略 seed。
- **当前 in-flight turn 不可 replay。** seed 停在最后一个 `turn/end`。
- **host `one-shot` vs preset `continuable`。** 插件 schema 与 `dsh-base` host 行默认 `one-shot`。web 三个 shipped preset 覆盖成 `continuable`。[E: packages/bundle/base/cordis.patch.yml:367] [E: packages/subagent/subagent-fork-in-process/src/index.ts:85] 本页 Preset 表只认四个 `agent.cordis.yml`。
- **continuable 默认后台。** web shipped 实例省略 `run_in_background` 就立刻回 `subagentId`。后续 turn 走 [subagent-control.md](subagent-control.md) 的 `send_message`，不是再调一次 `subagent_fork`。
- **`subagent_codex` / `subagent_claude_code`。** 同包另两行，shipped preset `disabled: true`。它们不是 fork。
- **需要 owning agent。** agentless / 无 `exec.agent` 的调用过不了门。PTC 下模型直调还会先被 collapse。

## Sources

- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/tool-subagent/package.json
- packages/subagent/tool-subagent/tests/tool-subagent.spec.ts
- packages/subagent/tool-subagent/tests/model-selection.spec.ts
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
- packages/subagent/subagent/src/continuation-messages.ts
- packages/subagent/subagent/src/continuation-activation.ts
- packages/subagent/subagent/src/descriptor.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/system-prompt/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent](subagent.md)（`surface.tools.subagent`）：同包、`toolName: subagent`、`provider: spawn`、fresh 子会话。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：continuable 子代理的后续 turn 与列举。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：one-shot 后台 `kind: 'subagent'` 的收集与杀死。
- [report](report.md)（`surface.tools.report`）：已退役；孩子结果走 settlement notice。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：从工具调用走到 child Agent 的端到端走读。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition，不是本页的模型 schema。
- [in-process fork](../../subsystems/orchestration/subagent-fork.md)（`subsys.orchestration.subagent-fork`）：`ForkInProcessProvider` 子系统页。
