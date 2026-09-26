---
id: surface.tools.workflow
title: workflow
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/workflow/tool-workflow/src/index.ts
  - packages/workflow/tool-workflow/src/types.ts
  - packages/workflow/tool-workflow/src/record.ts
  - packages/workflow/tool-workflow/package.json
  - packages/workflow/tool-workflow/tests/tool-workflow.spec.ts
  - packages/workflow/workflow/src/index.ts
  - packages/workflow/workflow/src/types.ts
  - packages/workflow/workflow/src/runtime-types.ts
  - packages/workflow/workflow/package.json
  - packages/workflow/workflow/tests/workflow.spec.ts
  - packages/workflow/workflow-ptc/src/index.ts
  - packages/workflow/workflow-ptc/src/meta.ts
  - packages/workflow/workflow-ptc/src/runtime.ts
  - packages/workflow/workflow-ptc/src/host.ts
  - packages/workflow/workflow-ptc/package.json
  - packages/workflow/workflow-ptc/tests/meta.spec.ts
  - packages/workflow/workflow-ptc/tests/egress.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/json-schema.ts
  - packages/core/system-prompt/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/invariant.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - workflow
  - apply
  - inject
  - Config
  - name
  - WorkflowEngine
  - WorkflowError
  - PtcWorkflowEngine
  - validateMeta
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - surface.tools.subagent-control
  - subsys.orchestration.workflow
  - spine.trace-subagent
  - surface.presets.code
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: 477b4f4205
---

> 模型可见名默认 `workflow`（load-time `Config.toolName`）；实现包 `@deepseek-ai/dsh-tool-workflow`（Cordis 插件名 `tool-workflow`）。模型交一份纯 JavaScript 编排脚本 + JSON `meta`，工具经 `ctx.workflowEngine.start` 跑。默认前台等 `run.result`；`run_in_background: true` 则登记为 `ctx.jobs` 作业立刻回 `jobId`。shipped 引擎是 `packages/workflow/workflow-ptc` 的 `PtcWorkflowEngine`，不是已删除的 `workflow-worker-thread`。

## 能回答的问题

- 模型目录里的 `workflow` 是哪个包？`toolName` 默认是什么、谁能改名？
- 参数 `script` 与 `meta` 分别是什么？能不能在脚本里写 `export const meta`？`run_in_background` 何时出现？
- `agent` / `pipeline` / `parallel` / `phase` / `log` / `args` 是工具参数还是脚本 hook？误用何时杀整脚本、何时变 `null`？
- `ctx.workflowEngine` 的 Definition / Provider / Consumer 各是谁？换引擎会带走解析、cap、取消吗？
- `minimal` / `standard` / `ptc` / `cordis` 谁装本包？`ptc` 是否 `disabled`？`isolate.workflowEngine` 挂在哪一行？
- `execute()` 怎样等 `run.result`、怎样把 `exec.signal` 桥到 `run.cancel`、非 `completed` 是否 `isError`？

## Identity

Wire 名是 load-time `Config.toolName`，schemastery 默认 `'workflow'`；`apply` 用解析后的 `toolName` 做 `defineTool({ name: toolName, ... })`。[E: packages/workflow/tool-workflow/src/index.ts:60] [E: packages/workflow/tool-workflow/src/index.ts:329] Cordis 插件导出名是 `tool-workflow`，实现包是 `@deepseek-ai/dsh-tool-workflow`。[E: packages/workflow/tool-workflow/src/index.ts:40] [E: packages/workflow/tool-workflow/package.json:2] 工厂是 `apply(ctx, config)`：断言 Config 已填默认，建 session recorder 与 background job mirror，登记 prompt section，再 `ctx.tools.register(...)`。[E: packages/workflow/tool-workflow/src/index.ts:315] [E: packages/workflow/tool-workflow/src/index.ts:328]

`inject` 是 `['tools', 'workflowEngine', 'systemPrompt']`。没有 `ctx.workflowEngine` 时本插件不会 apply，catalog 里不会出现 `workflow`。[E: packages/workflow/tool-workflow/src/index.ts:41] 测试把 `toolName: 'orchestrate'` 配进去后，catalog 只有 `orchestrate`、没有 `workflow`；fiber dispose 后两者都消失。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:397] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:398] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:410]

四个 shipped web preset **都不**改 `toolName` / `maxResultChars` / `enableRunInBackground`，因此产品里模型看见的名字就是 `workflow`，且默认广告 `run_in_background`。[E: packages/bundle/web-app/presets/standard.patch.yml:123] [E: packages/workflow/tool-workflow/src/index.ts:62]

`apply()` 还往 `ctx.systemPrompt` 登记 section `tool:${toolName}`，order 走 `getSectionOrder('TOOL_WORKFLOW')`（catalog 默认 `2600`）：只有用户明确要求 workflow 或大规模多代理编排时才用本工具；一两路委派走普通 `subagent`。[E: packages/workflow/tool-workflow/src/index.ts:324] [E: packages/workflow/tool-workflow/src/index.ts:325] [E: packages/core/system-prompt/src/index.ts:146]

本页只覆盖 wire 名 `workflow`。同 `delegation` 组里另有 `@deepseek-ai/dsh-tool-ralph` 行，那是另一件 model-visible 工具，参数与 execute 不在本页；出厂 patch 里 ralph **一律** `disabled: true`。[E: packages/bundle/web-app/presets/standard.patch.yml:125]

## 用途定位

本工具让模型用**一份脚本**扇出大量独立子代理（多文件审计、迁移、多角度调研、对抗复核），而不是一回合调一次 `subagent`。描述写明：身份走参数 `meta`（JSON，不是代码）；`script` 只是纯 JS 函数体（允许 top-level await，**禁止** `export const meta`），以 `return <json-value>` 结束，返回值必须 JSON 可序列化。[E: packages/workflow/tool-workflow/src/index.ts:158] [E: packages/workflow/tool-workflow/src/index.ts:335]

默认前台：`execute` `await run.result`。`run_in_background: true` 时 `jobs.start({ kind: 'workflow', ... })` 立刻回 `{ kind: 'background', jobId, runId }`，返回值随 job 完成通知到达；模型用 `job_output` / `job_kill`。[E: packages/workflow/tool-workflow/src/index.ts:368] [E: packages/workflow/tool-workflow/src/index.ts:414] 脚本描述仍写没有 fs / 网络 / timer / Node API——干活的是 `agent()` 拉起的子代理，脚本只编排。[E: packages/workflow/tool-workflow/src/index.ts:166]

脚本体 hook（**不是**工具 schema 字段；由 PTC 引擎注入 vm）：

| hook | 语义 | 失败纪律 |
|---|---|---|
| `agent(prompt, opts?)` | 跑完一个子代理。无 `opts.schema` 得到孩子最终文本；有 object-rooted JSON Schema 则得到校验后的对象。孩子自己失败 → `null`（脚本用 `.filter(Boolean)`）。允许的 opts：`label` / `phase` / `schema` / `provider` / `model`。`effort` / `isolation` / `agentType` 以及其它键一律响亮拒绝。[E: packages/workflow/workflow-ptc/src/runtime.ts:33] [E: packages/workflow/workflow-ptc/src/runtime.ts:35] [E: packages/workflow/workflow-ptc/src/runtime.ts:255] | 坏参数、未知 option、不受支持的 schema、撞 cap → fatal，杀整脚本 |
| `pipeline(items, ...stages)` | 每条 item 独立过各 stage，**stage 之间无 barrier**。stage 签名 `(prev, item, index)`。普通 throw 把该 item 变成 `null` 并跳过剩余 stage。[E: packages/workflow/workflow-ptc/src/runtime.ts:311] [E: packages/workflow/workflow-ptc/src/runtime.ts:336] | fatal `WorkflowError` 仍杀整脚本 |
| `parallel(thunks)` | 并发跑零参函数并等全部（barrier）。throwing thunk → `null`。[E: packages/workflow/workflow-ptc/src/runtime.ts:285] [E: packages/workflow/workflow-ptc/src/runtime.ts:304] | fatal 同样穿透 |
| `phase(title)` | 打开进度 phase；后续未写 `opts.phase` 的 `agent()` 继承它。[E: packages/workflow/workflow-ptc/src/runtime.ts:352] [E: packages/workflow/workflow-ptc/src/runtime.ts:177] | 空 title → `INVALID_ARGUMENT` |
| `log(message)` | 旁白给观察者。[E: packages/workflow/workflow-ptc/src/runtime.ts:361] | 非 string → `INVALID_ARGUMENT` |
| `args` | 工具参数 `args` 原样进脚本全局。[E: packages/workflow/workflow-ptc/src/runtime.ts:92] | — |

`WorkflowError` 默认 `fatal: true`；`parallel` / `pipeline` 用 `instanceof WorkflowError && error.fatal`（`isFatalWorkflowError`）决定是杀脚本还是把 item 收成 `null`。脚本 realm 伪造不了这个 instanceof。[E: packages/workflow/workflow/src/index.ts:137] [E: packages/workflow/workflow/src/index.ts:146] [E: packages/workflow/workflow-ptc/src/runtime.ts:304]

## 输入 schema

以插件默认 `Config`（`toolName: 'workflow'`，`maxResultChars: 50_000`，`enableRunInBackground: true`）boot 为准。模型参数有 `script` + `meta`（必填）、可选 `args`、以及默认打开的 `run_in_background`；`toolName` / `maxResultChars` / `enableRunInBackground` 是插件 Config，不进工具 schema（后一项只决定 schema 里有没有那个字段）。[E: packages/workflow/tool-workflow/src/index.ts:59] [E: packages/workflow/tool-workflow/src/index.ts:368]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `script` | `string` | 是 | 无 | schema 层只要求 string | 纯 JS 函数体。描述禁止 `export const meta`；引擎 `assertBodyParses` 再拒一次。[E: packages/workflow/tool-workflow/src/index.ts:332] [E: packages/workflow/workflow-ptc/src/index.ts:54] |
| `meta` | `object` | 是 | 无 | schema 写 `additionalProperties: true` | 工作流身份，**JSON 不是代码**。[E: packages/workflow/tool-workflow/src/index.ts:338] [E: packages/workflow/tool-workflow/src/index.ts:340] |
| `meta.name` | `string` | 是 | 无 | schema 不查空串；引擎要求非空 | 描述写 short kebab-case；`validateMeta` 只强制非空 string。[E: packages/workflow/tool-workflow/src/index.ts:344] [E: packages/workflow/workflow-ptc/src/meta.ts:23] |
| `meta.description` | `string` | 是 | 无 | 引擎要求非空 string | 一句话做什么。[E: packages/workflow/tool-workflow/src/index.ts:345] [E: packages/workflow/workflow-ptc/src/meta.ts:24] |
| `meta.whenToUse` | `string` | 否 | 无 | 有值则必须是 string | 何时用。[E: packages/workflow/tool-workflow/src/index.ts:346] [E: packages/workflow/workflow-ptc/src/meta.ts:25] |
| `meta.phases` | `array` | 否 | 无 | 元素是 object | `phase()` 按 **title 精确字符串** 对齐的声明。phase 只做进度分组，不改变执行结构。[E: packages/workflow/tool-workflow/src/index.ts:347] [E: packages/workflow/workflow-ptc/src/runtime.ts:352] |
| `meta.phases[].title` | `string` | 该元素内必填 | 无 | 引擎要求非空 | [E: packages/workflow/tool-workflow/src/index.ts:354] [E: packages/workflow/workflow-ptc/src/meta.ts:40] |
| `meta.phases[].detail` | `string` | 否 | 无 | | 一行说明。[E: packages/workflow/tool-workflow/src/index.ts:355] |
| `meta.phases[].provider` | `string` | 否 | 无 | 信息性 | `WorkflowPhase` 标 informational；真正覆盖走 `agent(..., { provider })`。[E: packages/workflow/workflow/src/types.ts:34] |
| `meta.phases[].model` | `string` | 否 | 无 | 信息性 | 同上。[E: packages/workflow/workflow/src/types.ts:36] |
| `args` | `object` | 否 | 不传则脚本看不到该全局字段 | `additionalProperties: true` | 脚本全局 `args`。描述建议裸 list 包成字段，例如 `{"files": [...]}`。[E: packages/workflow/tool-workflow/src/index.ts:363] [E: packages/workflow/tool-workflow/src/index.ts:366] |
| `run_in_background` | `boolean` | 否 | 省略 = 前台 | 仅当 `enableRunInBackground === true` 才进 schema | `true` 立刻回 job id。Config 关掉后 schema 不含此字段，body 再收到 `true` 会抛 `run_in_background is disabled`。[E: packages/workflow/tool-workflow/src/index.ts:368] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:601] |

`defineTool` 先走 `validateJsonSchemaValue`；缺 `script` 得到 `INVALID_ARGS`。[E: packages/core/tools/src/schema.ts:599] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:360] 缺 `exec.agent` 时 schema 已过，body 再抛「requires a calling agent」，`engine.requests.length === 0`。[E: packages/workflow/tool-workflow/src/index.ts:412] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:353]

**两层校验（schema 松、引擎紧）：** 工具 schema 的 `meta.additionalProperties: true` 会放过未知键；shipped `PtcWorkflowEngine.start` 立刻 `validateMeta`，未知字段（如 `meta.color`）抛 `META_INVALID`，同步 throw 被 registry 收成 `isError`。[E: packages/workflow/workflow-ptc/src/index.ts:134] [E: packages/workflow/workflow-ptc/src/meta.ts:21] [E: packages/workflow/workflow-ptc/tests/meta.spec.ts:59] `name: ''` 同样过 schema、栽在引擎「meta.name must be a non-empty string」。[E: packages/workflow/workflow-ptc/src/meta.ts:23] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:345]

**Config 改广告：** 改 `toolName` 只改注册名和 section 名，不改 `script` / `meta` / `args` 形状。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:397] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:403] `maxResultChars` 只切 `output.render`，不改 `output.schema`。[E: packages/workflow/tool-workflow/src/index.ts:403] `enableRunInBackground: false` 从 schema 拿掉 `run_in_background`。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:601]

工具 **不** 把 `subagentProvider` / `maxTotalAgents` 放进模型参数。`WorkflowStartRequest` 有这两项，但前台 `execute` 只转发 `script` / `meta` / 可选 `args` / `parent` / `signal`。[E: packages/workflow/workflow/src/runtime-types.ts:27] [E: packages/workflow/tool-workflow/src/index.ts:433]

## 输出 & 截断 / spill

`output.schema` 是 `oneOf` 两个封闭 object：

- 后台：`kind: 'background'` + `jobId` + `runId`
- 前台：`kind: 'foreground'` + `runId` + `agentsStarted` + `result`（`type: 'json'`）

[E: packages/workflow/tool-workflow/src/index.ts:377] [E: packages/workflow/tool-workflow/src/index.ts:391] 成功前台 `execute` 返回这四键；`result` 是引擎 `WorkflowResult.value`（脚本没 `return` 则为 `null`）。[E: packages/workflow/tool-workflow/src/index.ts:459] [E: packages/workflow/workflow/src/types.ts:74]

`output.render`：后台文案 `workflow "…" started in the background as job …`；前台调 `renderResult`，先 `JSON.stringify(value, null, 2)`，超长则 `slice(0, maxChars)` 再追加 `… [truncated: N more characters]`。默认天花板 50000 字符。这是内存字符串裁切，**不**写 spill 文件。[E: packages/workflow/tool-workflow/src/index.ts:239] [E: packages/workflow/tool-workflow/src/index.ts:401] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:387] 成功文案形如 `workflow "audit" completed (7 agents).` + `Return value:` + JSON；测试钉死 `findings` 出现在渲染里，且 `engine.disposed === 1`。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:145] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:147]

非 `completed` 的 `stopReason` **不会**把部分 `value` 交给模型。`stopReasonError` 把 `cancelled` / `error` 收成 throw，registry 做成 `isError`。[E: packages/workflow/tool-workflow/src/index.ts:197] [E: packages/workflow/tool-workflow/src/index.ts:454] 取消文案 `workflow run was cancelled`（可带 reason）；失败文案 `workflow run failed:`，缺 `error` 时 fallback `unknown error`。[E: packages/workflow/tool-workflow/src/index.ts:202] [E: packages/workflow/tool-workflow/src/index.ts:204] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:325]

`presentCall`：`card: 'generic'`，`title: workflow: ${meta.name}`，`rawInput` 是整份 `script`。[E: packages/workflow/tool-workflow/src/index.ts:181] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:418] `presentResult` 只回 `{ card: 'generic' }`。缺 `meta` 的畸形 logged args 在 present 路径软校验失败，返回 `undefined`，不在 replay 时抛。[E: packages/workflow/tool-workflow/src/index.ts:193] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:429]

顶层调用（`exec.parent === undefined`）往父 `Session` 追加四类 log-only 事件：`tool-workflow/run-start`、`tool-workflow/agent-start`、`tool-workflow/agent-end`、`tool-workflow/run-end`。[E: packages/workflow/tool-workflow/src/types.ts:47] [E: packages/workflow/tool-workflow/src/types.ts:52] [E: packages/workflow/tool-workflow/src/types.ts:57] [E: packages/workflow/tool-workflow/src/types.ts:62] `run-end` 等 `run.dispose()` 静默之后才写。append 失败只 `logger.warn` 并停记，不改工具成败。[E: packages/workflow/tool-workflow/src/index.ts:110] [E: packages/workflow/tool-workflow/src/index.ts:470] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:170] 带 `parent` token 的嵌套 transport **不**记这些事件。[E: packages/workflow/tool-workflow/src/index.ts:440] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:224]

后台 run 另把 `workflow/phase|log|agent-*` 镜像进 job 输出环（`createWorkflowRecordMirror`）；那是 job 进度，不是 session 事件。[E: packages/workflow/tool-workflow/src/record.ts:37]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `WorkflowEngine` / `ctx.workflowEngine` | `super(ctx, 'workflowEngine')`；抽象 `start(request): WorkflowRun`。`WorkflowRun.result` 按合同永不 reject。[E: packages/workflow/workflow/src/index.ts:159] [E: packages/workflow/workflow/src/index.ts:168] [E: packages/workflow/workflow/src/runtime-types.ts:44] |
| Provider（shipped） | `PtcWorkflowEngine`（包 `@deepseek-ai/dsh-workflow-ptc`） | `static inject = ['subagents', 'ptcRuntime', 'sandboxPolicy']`。构造时要求 `ctx.ptcRuntime.language === 'typescript'`。`start`：`validateMeta` → `assertBodyParses` → 解析 provider / cap → `PtcWorkflowRun`，把 `agent()` 桥回 `ctx.subagents.start`。[E: packages/workflow/workflow-ptc/src/index.ts:103] [E: packages/workflow/workflow-ptc/src/index.ts:117] [E: packages/workflow/workflow-ptc/src/index.ts:133] [E: packages/workflow/workflow-ptc/src/host.ts:200] |
| Consumer | `@deepseek-ai/dsh-tool-workflow` | 只调 `ctx.workflowEngine.start`，再等 `result` / `dispose` / `cancel`（或交给 jobs）。不自己 parse 脚本、不加 cap。 |

换掉 `ctx.workflowEngine` provider 会带走：`META_INVALID` / `SCRIPT_PARSE` 的同步检查、`export const meta` 诊断、`maxConcurrentAgents` / `maxTotalAgents` / `maxItemsPerCall` / `syncTimeoutMs`、子代理默认 provider、PTC 进程隔离与 sandbox policy。工具代码不选 runner。旧包 `packages/workflow/workflow-worker-thread` 已删除。

其它消费：

- `ctx.tools`：注册与 `ctx.tools.execute` 管线。
- `ctx.systemPrompt`：section `tool:${toolName}`。
- `ctx.jobs`：**不是** `inject`。后台路径 `ctx.get('jobs')`；缺 registry 抛 `background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs`。[E: packages/workflow/tool-workflow/src/index.ts:271]
- `ctx.subagents`：引擎侧，不是工具 `inject`。默认 provider 名 `'spawn'`；preset / host 行都写 `provider: spawn`。[E: packages/workflow/workflow-ptc/src/index.ts:106] [E: packages/bundle/web-app/presets/standard.patch.yml:122]
- 引擎生命周期事件 `workflow/start|phase|log|agent-start|agent-end|end` 由 `emitWorkflowEvent` 发出；listener 抛错被吃掉，不影响 run。[E: packages/workflow/workflow/src/index.ts:175] [E: packages/workflow/workflow/tests/workflow.spec.ts:92]

`isolate.workflowEngine: true` 让引擎落在 preset 组的 entry-local realm：mount 后 `leakedServices` 若看见根 realm 里的 preset 服务会直接抛，要求 isolate realm。[E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:267] 根 isolate 符号匹配才算 leak。[E: packages/preset/agent-preset-registry/src/mount.ts:97] 这与 host 上的 `ctx.subagents` 单例相反：registry 仍在 host，引擎按 agent 一份。

shipped 引擎数字（不是模型 schema）：`maxConcurrentAgents: 0` 解析成 `min(16, max(1, availableParallelism() - 2))`；`maxTotalAgents` 默认 1000；`maxItemsPerCall` 默认 4096；`syncTimeoutMs` 默认 5000。没有旧 worker-thread 的 `disposeGraceMs` 配置键。[E: packages/workflow/workflow-ptc/src/index.ts:107] [E: packages/workflow/workflow-ptc/src/index.ts:108] [E: packages/workflow/workflow-ptc/src/index.ts:141]

PTC 引擎把脚本放进 confined Node 进程里的 `vm`：测试仍用 `globalThis.constructor.constructor('return process')()` 摸到 `process`，但 `egress` 钉死 guest `process.env` 是 `{}`。[E: packages/workflow/workflow-ptc/tests/egress.spec.ts:28] [E: packages/workflow/workflow-ptc/tests/egress.spec.ts:35] 这是 containment + session file policy，不是安全沙箱。[I]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1506] [E: packages/core/tools/src/index.ts:1605] [E: packages/core/tools/src/index.ts:1783] 本工具**不**自己挂 `tools/pre-execute` listener。

对本工具的挂点：

- **timeout（工具定义）：** `defineTool` **没有** `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] 引擎自己的时钟是 guest 里初始同步片的 `syncTimeoutMs`。[E: packages/workflow/workflow-ptc/src/index.ts:110] [E: packages/workflow/workflow-ptc/src/runtime.ts:107]
- **approval：** body 不 `ask`。没有升权字段。只有别的 pre-execute listener 返回 `ask` 才会进 `serviceAsk`。
- **sandbox：** 工具 body 不挂。脚本在 PTC 进程里跑，引擎 `sandboxPolicy.resolve({ session: parent.session })` 约束 guest 的文件世界；孩子各自走自己的工具与沙箱。[E: packages/workflow/workflow-ptc/src/index.ts:166]
- **checkpoint：** host `session-checkpoint-policy` 对**顶层**（有 `exec.agent` 且无 `exec.parent`）在 `tools/execute` 里先 `sessions.flush`，再进 body。[E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1305]
- **PTC：** `ptc` preset **不装启用的本包**（`tool-workflow` `disabled: true`）。即便 overlay 打开，`mode: ptc` 时无 `parent` 的模型直调 `workflow` 在进 waterfall 前 collapse，必须从 `run_code` 程序里调。[E: packages/bundle/web-app/presets/ptc.patch.yml:124] [E: packages/core/tools/src/index.ts:1352] [E: packages/core/tools/src/index.ts:1471]
- **已 abort 的 signal：** registry 在 dispatch 前交出 `TOOL_ABORTED_BEFORE_DISPATCH`（code `ABORTED_BEFORE_DISPATCH`），`engine.start` 不会被叫到。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:371] [E: packages/core/tools/src/index.ts:1500]

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。四个 shipped id 是 `minimal` / `standard` / `ptc` / `cordis`（旧名 `code` 就是 PTC；wiki id `surface.presets.code` 仍是该 preset 的稳定别名）。`standard` / `cordis` 把本包和 `@deepseek-ai/dsh-workflow-ptc` 放在同一 `delegation` 组，组上 `isolate.workflowEngine: true`。`ptc` 同组但 **engine + 本包 + ralph 全 disabled**。

| preset | 装 `@deepseek-ai/dsh-tool-workflow`？ | `disabled` | isolate / 关键 Config |
|---|---|---|---|
| `minimal` | **否**。yml 是 complete persona（`prefix`）+ persistent bash/pwsh，无 `dsh-tool-workflow` / `dsh-workflow-ptc` | — | 本包未出现。[E: packages/bundle/web-app/presets/minimal.patch.yml:15] [E: packages/bundle/web-app/presets/minimal.patch.yml:17] |
| `standard` | 是 | 无 | `delegation` 组 `isolate.workflowEngine: true`；旁边 `workflow-ptc` 的 `provider: spawn`；`tool-workflow` 无 extra config。e2e catalog 含 `workflow`。[E: packages/bundle/web-app/presets/standard.patch.yml:84] [E: packages/bundle/web-app/presets/standard.patch.yml:119] [E: packages/bundle/web-app/presets/standard.patch.yml:123] [E: apps/cli/tests/web-agent-presets.e2e.ts:269] |
| `ptc` | 行在 `delegation` 组 | **`disabled: true`**（`workflow-ptc` 同样 `disabled: true`；不是「留给 ralph」——ralph 也 disabled） | 同组 isolate。[E: packages/bundle/web-app/presets/ptc.patch.yml:119] [E: packages/bundle/web-app/presets/ptc.patch.yml:124] [E: packages/bundle/web-app/presets/ptc.patch.yml:127] |
| `cordis` | 是 | 无 | 同 standard。[E: packages/bundle/web-app/presets/cordis.patch.yml:118] [E: packages/bundle/web-app/presets/cordis.patch.yml:122] |

组合旁注（不是 preset 成员资格）：`dsh-base` 也 insert 了 host 行 `workflow-ptc`（`provider: spawn`）和 `tool-workflow`。[E: packages/bundle/base/cordis.patch.yml:392] [E: packages/bundle/base/cordis.patch.yml:397] `dsh-web-app` overlay 把这两行设 `disabled: true`，改由每个 session 的 preset 在 isolate realm 再挂。[E: packages/bundle/web-app/cordis.patch.yml:534] [E: packages/bundle/web-app/cordis.patch.yml:537] shipped profile 里只有 `web` 叠 web-app 并挂这四份 preset；`headless` / `sdk` / `acp` 叠 base（不 disable 这两行），`sdk-minimal` 不叠 base。[I]

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`；违例抛 `ToolArgsError`（`INVALID_ARGS`）。[E: packages/core/tools/src/schema.ts:598] [E: packages/core/tools/src/schema.ts:599]
2. `execute@packages/workflow/tool-workflow/src/index.ts` 读 `exec.agent`。缺 `exec.agent` 直接抛，不调用引擎——非 agent 调用没有可归属孩子的 Agent。[E: packages/workflow/tool-workflow/src/index.ts:407] [E: packages/workflow/tool-workflow/src/index.ts:412]
3. `args.run_in_background === true`：Config 关掉则抛；否则 `startBackgroundRun`。`jobs.start` 的 starter 里同步 `workflowEngine.start`（无 tool-step signal——run 属于 job）；`META_INVALID` / `SCRIPT_PARSE` 仍同步冒出成工具 `isError`，registry 不登记 job。[E: packages/workflow/tool-workflow/src/index.ts:414] [E: packages/workflow/tool-workflow/src/index.ts:282]
4. 前台：`ctx.workflowEngine.start({ script, meta, args?, parent, signal: exec.signal })`。`META_INVALID` / `SCRIPT_PARSE` 在 `start` 内同步抛出，变成 `isError`（模型能看见 violation 列表）。[E: packages/workflow/tool-workflow/src/index.ts:433] [E: packages/workflow/workflow-ptc/src/index.ts:134]
5. shipped 引擎：`validateMeta` 归一化拷贝（不 alias 调用方对象）→ 若 body 匹配 `/^\s*export\s+const\s+meta\b/` 则 `SCRIPT_PARSE`（「meta rides the `meta` request field」）→ 否则用与 guest 相同的 `(async () => { body })()` 包装做一次 `vm.Script` 解析。[E: packages/workflow/workflow-ptc/src/meta.ts:81] [E: packages/workflow/workflow-ptc/src/index.ts:48] [E: packages/workflow/workflow-ptc/src/index.ts:60] 然后 `resolveSubagentProvider`（默认 `spawn`，空串 / 未注册名失败）和 `resolveMaxTotalAgents`。[E: packages/workflow/workflow-ptc/src/index.ts:136]
6. `recordsRun = exec.parent === undefined`。仅顶层 `recorder.start(parent.session, run)`，写下 `tool-workflow/run-start`（`runId` + `meta.name`）。[E: packages/workflow/tool-workflow/src/index.ts:440] [E: packages/workflow/tool-workflow/src/index.ts:140]
7. 本地 abort 桥：`exec.signal` 一旦 abort 就 `run.cancel('parent step aborted')`。`signal` 也传进引擎；这层桥保证实现若忽略 signal，工具合同仍在。[E: packages/workflow/tool-workflow/src/index.ts:447] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:336]
8. `result = await run.result`。`stopReason !== 'completed'` → `throw new Error(stopReasonError(...))`，不返回部分 `value`。[E: packages/workflow/tool-workflow/src/index.ts:452] [E: packages/workflow/tool-workflow/src/index.ts:457]
9. 成功返回 `{ kind: 'foreground', runId: run.id, agentsStarted, result: result.value }`。[E: packages/workflow/tool-workflow/src/index.ts:459]
10. `finally`：摘掉 abort listener；`await run.dispose()`（保持 member listener 直到静默，引擎可能在收尾时补 `cancelled` member end）；顶层再 `recorder.finish` / `recorder.abandon`。[E: packages/workflow/tool-workflow/src/index.ts:466] [E: packages/workflow/tool-workflow/src/index.ts:470] [E: packages/workflow/tool-workflow/src/index.ts:477]
11. 脚本里每次 `agent()`：撞 `maxTotalAgents` → `AGENT_CAP`；拿到并发槽后 `children.startAgent`；host `subagents.start(this.provider, { prompt, parent, signal, outputSchema?, agentOptions? })`。[E: packages/workflow/workflow-ptc/src/runtime.ts:168] [E: packages/workflow/workflow-ptc/src/host.ts:200] 孩子 `stopReason === 'completed'` 才回文本或 `structured`；孩子自己失败回 `null`。[E: packages/workflow/workflow-ptc/src/runtime.ts:207] `opts.schema` 走 `assertObjectJsonSchema`（必须 object 根；subset = `type` / `oneOf` / `properties` / `required` / `additionalProperties` / `items` / `enum` / `const` + 注解；`pattern` / `format` / 数值上下界等关键字被拒）。[E: packages/workflow/workflow-ptc/src/runtime.ts:267] [E: packages/core/tools/src/json-schema.ts:267] [E: packages/core/tools/src/json-schema.ts:397]

## 设计动机·edge

- **`meta` 是参数，不是源码。** `WorkflowMeta` 字段是 `name` / `description` / `whenToUse` / `phases`。[E: packages/workflow/workflow/src/types.ts:46] 工具把这块当 JSON 参数收，引擎 `validateMeta` 后再跑 body。残留 `export const meta` 得到专门 `SCRIPT_PARSE`（「meta rides the `meta` request field」），不是裸 SyntaxError。[E: packages/workflow/workflow-ptc/src/index.ts:55] 字段词汇对齐 Claude Code 动态 workflow 的 meta 块。[I]
- **kebab-case 是描述政策，不是引擎门。** `validateMeta` 接受任意非空 `name` 字符串。[I]
- **schema 层 `additionalProperties: true` 不等于引擎接受未知键。** 未知 `meta.*` / `meta.phases[].*` 在 `start()` 同步失败。测试禁止「先接受再忽略」。[E: packages/workflow/workflow-ptc/tests/meta.spec.ts:58]
- **后台是可选的。** 默认 Config 打开 `run_in_background`；关掉则 schema 不含该字段。要并行扇出，仍可写在脚本的 `parallel` / `pipeline` 里。
- **fatal vs `null`。** 拼错 option、不受支持的 schema、cap、基础设施 `AGENT_START` / `AGENT_RESULT` 杀整脚本。孩子业务失败才是 per-item `null`。不要把「某个 agent 没干成」理解成工具 `isError`——那只发生在脚本本身没 `completed`。
- **`effort` / `isolation` / `agentType` 被点名拒绝。** `UNSUPPORTED_OPTION`，文案写 deferred and not supported。[E: packages/workflow/workflow-ptc/src/runtime.ts:255]
- **phases 不调度。** `phase(title)` 只写 `currentPhase` 并通知 observer；真正的扇出结构来自脚本自己的 `pipeline` / `parallel` / 顺序 `await`。[E: packages/workflow/workflow-ptc/src/runtime.ts:352] `WorkflowPhase` 只有 title / detail / provider / model，没有 stage 或依赖边。[E: packages/workflow/workflow/src/types.ts:28]
- **PTC 进程不是安全边界。** guest 仍能摸到 `process`；测试只保证 env 为空。不要把 workflow 脚本当成 sandbox。[E: packages/workflow/workflow-ptc/tests/egress.spec.ts:35]
- **嵌套 dispatch 不记 session 事件。** PTC `run_code` / 其它 transport 带 `parent` token 时，避免把内层 run 再投影成顶层 Chat 节点。
- **同组还有 `tool-ralph`，出厂全关。** shipped preset 在 `tool-workflow` 旁边挂 `@deepseek-ai/dsh-tool-ralph` 且 `disabled: true`。不要把 ralph 的参数填进 `workflow`。

## Sources

- packages/workflow/tool-workflow/src/index.ts
- packages/workflow/tool-workflow/src/types.ts
- packages/workflow/tool-workflow/src/record.ts
- packages/workflow/tool-workflow/package.json
- packages/workflow/tool-workflow/tests/tool-workflow.spec.ts
- packages/workflow/workflow/src/index.ts
- packages/workflow/workflow/src/types.ts
- packages/workflow/workflow/src/runtime-types.ts
- packages/workflow/workflow/package.json
- packages/workflow/workflow/tests/workflow.spec.ts
- packages/workflow/workflow-ptc/src/index.ts
- packages/workflow/workflow-ptc/src/meta.ts
- packages/workflow/workflow-ptc/src/runtime.ts
- packages/workflow/workflow-ptc/src/host.ts
- packages/workflow/workflow-ptc/package.json
- packages/workflow/workflow-ptc/tests/meta.spec.ts
- packages/workflow/workflow-ptc/tests/egress.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/json-schema.ts
- packages/core/system-prompt/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/preset/agent-preset-registry/src/invariant.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent](subagent.md)（`surface.tools.subagent`）：单次 spawn 委派；一两路孩子走它，大规模扇出走 `workflow` 脚本里的 `agent()`。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：fork provider 的另一 wire 名。workflow 引擎默认 `provider: spawn`，不是 fork。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：对已发布孩子的控制面；前台 workflow 跑完才返回，不靠这三件套收脚本结果。
- [workflow 引擎](../../subsystems/orchestration/workflow.md)（`subsys.orchestration.workflow`）：`ctx.workflowEngine` Definition / workflow-ptc Provider，不是本页的模型 schema。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：`agent()` 落到 `ctx.subagents.start` 之后的子代理生命周期。
- [PTC preset](../presets/code.md)（`surface.presets.code`）：目录 `presets/ptc.patch.yml`，稳定别名仍叫 `code`。
- [PTC / run_code](../../subsystems/core/code-mode.md)（`subsys.core.code-mode`）：权威源 `packages/core/tools/src/ptc.ts`；`ptc` 模式下直调 `workflow` 被 collapse。
