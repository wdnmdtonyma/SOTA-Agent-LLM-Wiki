---
id: surface.tools.workflow
title: workflow
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/workflow/tool-workflow/src/index.ts
  - packages/workflow/tool-workflow/src/types.ts
  - packages/workflow/tool-workflow/package.json
  - packages/workflow/tool-workflow/tests/tool-workflow.spec.ts
  - packages/workflow/workflow/src/index.ts
  - packages/workflow/workflow/src/types.ts
  - packages/workflow/workflow/src/runtime-types.ts
  - packages/workflow/workflow/package.json
  - packages/workflow/workflow/tests/workflow.spec.ts
  - packages/workflow/workflow-worker-thread/src/index.ts
  - packages/workflow/workflow-worker-thread/src/meta.ts
  - packages/workflow/workflow-worker-thread/src/runtime.ts
  - packages/workflow/workflow-worker-thread/src/host.ts
  - packages/workflow/workflow-worker-thread/src/types.ts
  - packages/workflow/workflow-worker-thread/package.json
  - packages/workflow/workflow-worker-thread/tests/meta.spec.ts
  - packages/workflow/workflow-worker-thread/tests/workflow-worker-thread.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/json-schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - workflow
  - apply
  - inject
  - Config
  - name
  - WorkflowEngine
  - WorkflowError
  - WorkerThreadWorkflowEngine
  - validateMeta
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - surface.tools.subagent-control
  - subsys.orchestration.workflow
  - spine.trace-subagent
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名默认 `workflow`（load-time `Config.toolName`）；实现包 `@deepseek-ai/dsh-tool-workflow`（Cordis 插件名 `tool-workflow`）。模型交一份纯 JavaScript 编排脚本 + JSON `meta`，工具经 `ctx.workflowEngine.start` 前台跑完全程，把脚本的 JSON 返回值交回。

## 能回答的问题

- 模型目录里的 `workflow` 是哪个包？`toolName` 默认是什么、谁能改名？
- 参数 `script` 与 `meta` 分别是什么？能不能在脚本里写 `export const meta`？
- `agent` / `pipeline` / `parallel` / `phase` / `log` / `args` 是工具参数还是脚本 hook？误用何时杀整脚本、何时变 `null`？
- `ctx.workflowEngine` 的 Definition / Provider / Consumer 各是谁？换引擎会带走解析、cap、取消吗？
- `minimal` / `standard` / `code` / `cordis` 谁装本包？`isolate.workflowEngine` 挂在哪一行？
- `execute()` 怎样等 `run.result`、怎样把 `exec.signal` 桥到 `run.cancel`、非 `completed` 是否 `isError`？

## Identity

Wire 名是 load-time `Config.toolName`，schemastery 默认 `'workflow'`；`apply` 用解析后的 `toolName` 做 `defineTool({ name: toolName, ... })`。[E: packages/workflow/tool-workflow/src/index.ts:41] [E: packages/workflow/tool-workflow/src/index.ts:218] Cordis 插件导出名是 `tool-workflow`，实现包是 `@deepseek-ai/dsh-tool-workflow`。[E: packages/workflow/tool-workflow/src/index.ts:29] [E: packages/workflow/tool-workflow/package.json:2] 工厂是 `apply(ctx, config)`：断言 Config 已填默认，建 session recorder，登记 prompt section，再 `ctx.tools.register(...)`。[E: packages/workflow/tool-workflow/src/index.ts:205] [E: packages/workflow/tool-workflow/src/index.ts:217]

`inject` 是 `['tools', 'workflowEngine', 'systemPrompt']`。没有 `ctx.workflowEngine` 时本插件不会 apply，catalog 里不会出现 `workflow`。[E: packages/workflow/tool-workflow/src/index.ts:30] 测试把 `toolName: 'orchestrate'` 配进去后，catalog 只有 `orchestrate`、没有 `workflow`；fiber dispose 后两者都消失。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:373] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:375] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:383]

四个 shipped preset **都不**改 `toolName` / `maxResultChars`，因此产品里模型看见的名字就是 `workflow`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:226] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:227]

`apply()` 还往 `ctx.systemPrompt` 登记 section `tool:${toolName}`（`order: 115`）：只有用户明确要求 workflow 或大规模多代理编排时才用本工具；一两路委派走普通 `subagent`。[E: packages/workflow/tool-workflow/src/index.ts:213] [E: packages/workflow/tool-workflow/src/index.ts:214]

本页只覆盖 wire 名 `workflow`。同 `delegation` 组里另有 `@deepseek-ai/dsh-tool-ralph` 行，那是另一件 model-visible 工具，参数与 execute 不在本页。

## 用途定位

本工具让模型用**一份脚本**扇出大量独立子代理（多文件审计、迁移、多角度调研、对抗复核），而不是一回合调一次 `subagent`。描述写明：身份走参数 `meta`（JSON，不是代码）；`script` 只是纯 JS 函数体（允许 top-level await，**禁止** `export const meta`），以 `return <json-value>` 结束，返回值必须 JSON 可序列化。[E: packages/workflow/tool-workflow/src/index.ts:138] [E: packages/workflow/tool-workflow/src/index.ts:140] [E: packages/workflow/tool-workflow/src/index.ts:224]

跑完才返回：描述最后一句写 foreground；`execute` `await run.result`，没有 `run_in_background` 字段。[E: packages/workflow/tool-workflow/src/index.ts:150] [E: packages/workflow/tool-workflow/src/index.ts:304] 脚本里没有 fs / 网络 / timer / Node API——干活的是 `agent()` 拉起的子代理，脚本只编排。[E: packages/workflow/tool-workflow/src/index.ts:150]

脚本体 hook（**不是**工具 schema 字段；由 worker 引擎注入 vm）：

| hook | 语义 | 失败纪律 |
|---|---|---|
| `agent(prompt, opts?)` | 跑完一个子代理。无 `opts.schema` 得到孩子最终文本；有 object-rooted JSON Schema 则得到校验后的对象。孩子自己失败 → `null`（脚本用 `.filter(Boolean)`）。允许的 opts：`label` / `phase` / `schema` / `provider` / `model`。`effort` / `isolation` / `agentType` 以及其它键一律响亮拒绝。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:39] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:41] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:371] | 坏参数、未知 option、不受支持的 schema、撞 cap → fatal，杀整脚本 |
| `pipeline(items, ...stages)` | 每条 item 独立过各 stage，**stage 之间无 barrier**。stage 签名 `(prev, item, index)`。普通 throw 把该 item 变成 `null` 并跳过剩余 stage。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:428] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:454] | fatal `WorkflowError` 仍杀整脚本 |
| `parallel(thunks)` | 并发跑零参函数并等全部（barrier）。throwing thunk → `null`。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:401] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:422] | fatal 同样穿透 |
| `phase(title)` | 打开进度 phase；后续未写 `opts.phase` 的 `agent()` 继承它。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:470] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:265] | 空 title → `INVALID_ARGUMENT` |
| `log(message)` | 旁白给观察者。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:480] | 非 string → `INVALID_ARGUMENT` |
| `args` | 工具参数 `args` 原样进脚本全局。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:107] | — |

`WorkflowError` 默认 `fatal: true`；`parallel` / `pipeline` 用 `instanceof WorkflowError && error.fatal` 决定是杀脚本还是把 item 收成 `null`。脚本 realm 伪造不了这个 instanceof。[E: packages/workflow/workflow/src/index.ts:137] [E: packages/workflow/workflow/src/index.ts:146] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:421]

## 输入 schema

以插件默认 `Config`（`toolName: 'workflow'`，`maxResultChars: 50_000`）boot 为准。模型参数只有 `script` + `meta`（必填）和可选 `args`；`toolName` / `maxResultChars` 是插件 Config，不进工具 schema。[E: packages/workflow/tool-workflow/src/index.ts:41] [E: packages/workflow/tool-workflow/src/index.ts:42] [E: packages/workflow/tool-workflow/src/index.ts:221]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `script` | `string` | 是 | 无 | schema 层只要求 string | 纯 JS 函数体。描述禁止 `export const meta`；引擎 `assertBodyParses` 再拒一次。[E: packages/workflow/tool-workflow/src/index.ts:221] [E: packages/workflow/workflow-worker-thread/src/index.ts:66] |
| `meta` | `object` | 是 | 无 | schema 写 `additionalProperties: true` | 工作流身份，**JSON 不是代码**。[E: packages/workflow/tool-workflow/src/index.ts:227] [E: packages/workflow/tool-workflow/src/index.ts:228] |
| `meta.name` | `string` | 是 | 无 | schema 不查空串；引擎要求非空 | 描述写 short kebab-case；`validateMeta` 只强制非空 string。[E: packages/workflow/tool-workflow/src/index.ts:232] [E: packages/workflow/workflow-worker-thread/src/meta.ts:23] |
| `meta.description` | `string` | 是 | 无 | 引擎要求非空 string | 一句话做什么。[E: packages/workflow/tool-workflow/src/index.ts:233] [E: packages/workflow/workflow-worker-thread/src/meta.ts:24] |
| `meta.whenToUse` | `string` | 否 | 无 | 有值则必须是 string | 何时用。[E: packages/workflow/tool-workflow/src/index.ts:234] [E: packages/workflow/workflow-worker-thread/src/meta.ts:25] |
| `meta.phases` | `array` | 否 | 无 | 元素是 object | `phase()` 按 **title 精确字符串** 对齐的声明。phase 只做进度分组，不改变执行结构。[E: packages/workflow/tool-workflow/src/index.ts:242] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:475] |
| `meta.phases[].title` | `string` | 该元素内必填 | 无 | 引擎要求非空 | [E: packages/workflow/tool-workflow/src/index.ts:242] [E: packages/workflow/workflow-worker-thread/src/meta.ts:40] |
| `meta.phases[].detail` | `string` | 否 | 无 | | 一行说明。[E: packages/workflow/tool-workflow/src/index.ts:243] |
| `meta.phases[].provider` | `string` | 否 | 无 | 信息性 | `WorkflowPhase` 标 informational；真正覆盖走 `agent(..., { provider })`。[E: packages/workflow/workflow/src/types.ts:34] |
| `meta.phases[].model` | `string` | 否 | 无 | 信息性 | 同上。[E: packages/workflow/workflow/src/types.ts:36] |
| `args` | `object` | 否 | 不传则脚本看不到该全局字段 | `additionalProperties: true` | 脚本全局 `args`。描述建议裸 list 包成字段，例如 `{"files": [...]}`。[E: packages/workflow/tool-workflow/src/index.ts:251] [E: packages/workflow/tool-workflow/src/index.ts:254] |

`defineTool` 先走 `validateJsonSchemaValue`；缺 `script` 得到 `INVALID_ARGS`。[E: packages/core/tools/src/schema.ts:586] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:337] 缺 `exec.agent` 时 schema 已过，body 再抛「requires a calling agent」，`engine.requests.length === 0`。[E: packages/workflow/tool-workflow/src/index.ts:278] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:329]

**两层校验（schema 松、引擎紧）：** 工具 schema 的 `meta.additionalProperties: true` 会放过未知键；shipped `WorkerThreadWorkflowEngine.start` 立刻 `validateMeta`，未知字段（如 `meta.color`）抛 `META_INVALID`，同步 throw 被 registry 收成 `isError`。[E: packages/workflow/workflow-worker-thread/src/index.ts:144] [E: packages/workflow/workflow-worker-thread/src/meta.ts:21] [E: packages/workflow/workflow-worker-thread/tests/meta.spec.ts:59] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:321] `name: ''` 同样过 schema、栽在引擎「meta.name must be a non-empty string」。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:319]

**Config 改广告：** 改 `toolName` 只改注册名和 section 名，不改 `script` / `meta` / `args` 形状。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:374] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:379] `maxResultChars` 只切 `output.render`，不改 `output.schema`。[E: packages/workflow/tool-workflow/src/index.ts:269]

工具 **不** 把 `subagentProvider` / `maxTotalAgents` 放进模型参数。`WorkflowStartRequest` 有这两项，但 `execute` 只转发 `script` / `meta` / 可选 `args` / `parent` / `signal`。[E: packages/workflow/workflow/src/runtime-types.ts:27] [E: packages/workflow/tool-workflow/src/index.ts:284]

## 输出 & 截断 / spill

`output.schema` 是封闭 object：`runId`（string）+ `agentsStarted`（integer）+ `result`（`type: 'json'`）。[E: packages/workflow/tool-workflow/src/index.ts:258] [E: packages/workflow/tool-workflow/src/index.ts:264] 成功时 `execute` 返回这三键；`result` 是引擎 `WorkflowResult.value`（脚本没 `return` 则为 `null`）。[E: packages/workflow/tool-workflow/src/index.ts:311] [E: packages/workflow/workflow/src/types.ts:74]

`output.render` 调 `renderResult(meta.name, agentsStarted, value, maxResultChars)`：先 `JSON.stringify(value, null, 2)`，超长则 `slice(0, maxChars)` 再追加 `… [truncated: N more characters]`。默认天花板 50000 字符。这是内存字符串裁切，**不**写 spill 文件。[E: packages/workflow/tool-workflow/src/index.ts:198] [E: packages/workflow/tool-workflow/src/index.ts:200] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:364] 成功文案形如 `workflow "audit" completed (7 agents).` + `Return value:` + JSON；测试钉死 `findings` 出现在渲染里，且 `engine.disposed === 1`。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:122] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:124]

非 `completed` 的 `stopReason` **不会**把部分 `value` 交给模型。`stopReasonError` 把 `cancelled` / `error` 收成 throw，registry 做成 `isError`。[E: packages/workflow/tool-workflow/src/index.ts:184] [E: packages/workflow/tool-workflow/src/index.ts:305] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:277] 取消文案 `workflow run was cancelled`（可带 reason）；失败文案 `workflow run failed:`，缺 `error` 时 fallback `unknown error`。[E: packages/workflow/tool-workflow/src/index.ts:185] [E: packages/workflow/tool-workflow/src/index.ts:187] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:302]

`presentCall`：`card: 'generic'`，`title: workflow: ${meta.name}`，`rawInput` 是整份 `script`。[E: packages/workflow/tool-workflow/src/index.ts:167] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:392] `presentResult` 只回 `{ card: 'generic' }`。缺 `meta` 的畸形 logged args 在 present 路径软校验失败，返回 `undefined`，不在 replay 时抛。[E: packages/workflow/tool-workflow/src/index.ts:176] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:402]

顶层调用（`exec.parent === undefined`）往父 `Session` 追加四类 log-only 事件：`tool-workflow/run-start`、`tool-workflow/agent-start`、`tool-workflow/agent-end`、`tool-workflow/run-end`。[E: packages/workflow/tool-workflow/src/types.ts:47] [E: packages/workflow/tool-workflow/src/types.ts:52] [E: packages/workflow/tool-workflow/src/types.ts:57] [E: packages/workflow/tool-workflow/src/types.ts:62] `run-end` 等 `run.dispose()` 静默之后才写。append 失败只 `logger.warn` 并停记，不改工具成败。[E: packages/workflow/tool-workflow/src/index.ts:322] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:148] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:168] 带 `parent` token 的嵌套 transport **不**记这些事件。[E: packages/workflow/tool-workflow/src/index.ts:291] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:210]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `WorkflowEngine` / `ctx.workflowEngine` | `super(ctx, 'workflowEngine')`；抽象 `start(request): WorkflowRun`。`WorkflowRun.result` 按合同永不 reject。[E: packages/workflow/workflow/src/index.ts:159] [E: packages/workflow/workflow/src/index.ts:168] [E: packages/workflow/workflow/src/runtime-types.ts:44] |
| Provider（shipped） | `WorkerThreadWorkflowEngine`（包 `@deepseek-ai/dsh-workflow-worker-thread`） | `static inject = ['subagents']`。`start`：`validateMeta` → `assertBodyParses` → 解析 provider / cap → 开 worker，把 `agent()` 桥回 `ctx.subagents.start`。[E: packages/workflow/workflow-worker-thread/src/index.ts:113] [E: packages/workflow/workflow-worker-thread/src/index.ts:144] [E: packages/workflow/workflow-worker-thread/src/host.ts:352] |
| Consumer | `@deepseek-ai/dsh-tool-workflow` | 只调 `ctx.workflowEngine.start`，再等 `result` / `dispose` / `cancel`。不自己 parse 脚本、不加 cap。 |

换掉 `ctx.workflowEngine` provider 会带走：`META_INVALID` / `SCRIPT_PARSE` 的同步检查、`export const meta` 诊断、`maxConcurrentAgents` / `maxTotalAgents` / `maxItemsPerCall` / `syncTimeoutMs` / `disposeGraceMs`、子代理默认 provider、worker 隔离与强制终止。工具代码不选 runner。

其它消费：

- `ctx.tools`：注册与 `ctx.tools.execute` 管线。
- `ctx.systemPrompt`：section `tool:${toolName}`。
- `ctx.subagents`：引擎侧，不是工具 `inject`。默认 provider 名 `'spawn'`；preset / host 行都写 `provider: spawn`。[E: packages/workflow/workflow-worker-thread/src/index.ts:116] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:224]
- 引擎生命周期事件 `workflow/start|phase|log|agent-start|agent-end|end` 由 `emitWorkflowEvent` 发出；listener 抛错被吃掉，不影响 run。[E: packages/workflow/workflow/src/index.ts:175] [E: packages/workflow/workflow/tests/workflow.spec.ts:72]

`isolate.workflowEngine: true` 让引擎落在 preset 组的 entry-local realm：mount 后 `leakedServices` 若看见根 realm 里的 preset 服务会直接抛，要求「sit behind an `isolate` realm」。[E: packages/preset/agent-presets/src/mount.ts:365] 这与 host 上的 `ctx.subagents` 单例相反：registry 仍在 host，引擎按 agent 一份。

shipped 引擎数字（不是模型 schema）：`maxConcurrentAgents: 0` 解析成 `min(16, max(1, availableParallelism() - 2))`；`maxTotalAgents` 默认 1000；`maxItemsPerCall` 默认 4096；`syncTimeoutMs` / `disposeGraceMs` 默认 5000。[E: packages/workflow/workflow-worker-thread/src/index.ts:117] [E: packages/workflow/workflow-worker-thread/src/index.ts:118] [E: packages/workflow/workflow-worker-thread/src/index.ts:152]

worker 引擎把脚本放进可逃逸的 `vm` + 新线程：测试夹具 `ESCAPE` 就是 `globalThis.constructor.constructor('return process')()`，用来让 worker 故意碰到 `process`。[E: packages/workflow/workflow-worker-thread/tests/workflow-worker-thread.spec.ts:35] 这是 containment（挡住 host 事件循环、允许强制杀线程），不是安全沙箱。[I]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] 本工具**不**自己挂 `tools/pre-execute` listener。

对本工具的挂点：

- **timeout（工具定义）：** `defineTool` **没有** `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] 引擎自己的时钟是 worker 里初始同步片的 `syncTimeoutMs`，以及取消后的 `disposeGraceMs` 强制结算。[E: packages/workflow/workflow-worker-thread/src/index.ts:120] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:168]
- **approval：** body 不 `ask`。没有升权字段。只有别的 pre-execute listener 返回 `ask` 才会进 `serviceAsk`。
- **sandbox：** 不挂。脚本不碰 `ctx.fs` / `ctx.shell`；孩子各自走自己的工具与沙箱。
- **checkpoint：** host `session-checkpoint-policy` 对**顶层**（有 `exec.agent` 且无 `exec.parent`）在 `tools/execute` 里先 `sessions.flush`，再进 body。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1278]
- **Code Mode：** `code` preset 仍装本包，但 `mode: code` 时无 `parent` 的模型直调 `workflow` 在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]
- **已 abort 的 signal：** registry 在 dispatch 前交出 `TOOL_ABORTED_BEFORE_DISPATCH`，`engine.start` 不会被叫到。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:348] [E: packages/core/tools/src/index.ts:1542]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`。四个 shipped 文件里，本包行都**没有** `disabled`，也**没有**改 `toolName` / `maxResultChars`。`standard` / `code` / `cordis` 把本包和 `@deepseek-ai/dsh-workflow-worker-thread` 放在同一 `delegation` 组，组上 `isolate.workflowEngine: true`。

| preset | 装 `@deepseek-ai/dsh-tool-workflow`？ | `disabled` | isolate / 关键 Config |
|---|---|---|---|
| `minimal` | **否**。整份 yml 只有 persona + persistent bash + `str_replace_editor`，无 `dsh-tool-workflow` / `dsh-workflow-worker-thread` | — | 本包未出现。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | 是 | 无 | `delegation` 组 `isolate.workflowEngine: true`；旁边 `workflow-worker-thread` 的 `provider: spawn`；`tool-workflow` 无 extra config。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:222] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:227] |
| `code` | 是（工具行仍在；呈现改成 Code Mode） | 无 | 同 standard 的 isolate + worker 行。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:179] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:223] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:228] |
| `cordis` | 是 | 无 | 同 standard。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:166] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:210] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:215] |

组合旁注（不是 preset 成员资格）：`dsh-base` 也 insert 了 host 行 `workflow-worker-thread`（`provider: spawn`）和 `tool-workflow`。[E: packages/bundle/base/cordis.patch.yml:336] [E: packages/bundle/base/cordis.patch.yml:341] `dsh-web-app` overlay 把这两行设 `disabled: true`，改由每个 session 的 preset 在 isolate realm 再挂。[E: packages/bundle/web-app/cordis.patch.yml:393] [E: packages/bundle/web-app/cordis.patch.yml:396] TUI 是否仍直接吃 host 行，本页标 [I]（web overlay 的模式与其它 preset 工具一致，未再核 TUI boot 源）。

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`；违例抛 `ToolArgsError`（`INVALID_ARGS`）。[E: packages/core/tools/src/schema.ts:586] [E: packages/core/tools/src/schema.ts:587]
2. `execute@packages/workflow/tool-workflow/src/index.ts` 读 `exec.agent`。缺 parent 直接抛，不调用引擎——非 agent 调用没有可归属孩子的 Agent。[E: packages/workflow/tool-workflow/src/index.ts:273] [E: packages/workflow/tool-workflow/src/index.ts:278]
3. `ctx.workflowEngine.start({ script, meta, args?, parent, signal: exec.signal })`。`META_INVALID` / `SCRIPT_PARSE` 在 `start` 内同步抛出，变成 `isError`（模型能看见 violation 列表）。[E: packages/workflow/tool-workflow/src/index.ts:284] [E: packages/workflow/workflow-worker-thread/src/index.ts:145]
4. shipped 引擎：`validateMeta` 归一化拷贝（不 alias 调用方对象）→ 若 body 匹配 `/^\s*export\s+const\s+meta\b/` 则 `SCRIPT_PARSE`（「meta rides the `meta` request field」）→ 否则用与 worker 相同的 `(async () => { body })()` 包装做一次 `vm.Script` 解析。[E: packages/workflow/workflow-worker-thread/src/meta.ts:81] [E: packages/workflow/workflow-worker-thread/src/index.ts:54] [E: packages/workflow/workflow-worker-thread/src/index.ts:70] 然后 `resolveSubagentProvider`（默认 `spawn`，空串 / 未注册名失败）和 `resolveMaxTotalAgents`。[E: packages/workflow/workflow-worker-thread/src/index.ts:146]
5. `recordsRun = exec.parent === undefined`。仅顶层 `recorder.start(parent.session, run)`，写下 `tool-workflow/run-start`（`runId` + `meta.name`）。[E: packages/workflow/tool-workflow/src/index.ts:291] [E: packages/workflow/tool-workflow/src/index.ts:120]
6. 本地 abort 桥：`exec.signal` 一旦 abort 就 `run.cancel('parent step aborted')`。`signal` 也传进引擎；这层桥保证实现若忽略 signal，工具合同仍在。[E: packages/workflow/tool-workflow/src/index.ts:299] [E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:313] 真实 worker 上，脚本 `await new Promise(() => {})` 停住时 abort 仍能释放工具调用。[E: packages/workflow/tool-workflow/tests/tool-workflow.spec.ts:436]
7. `result = await run.result`。`stopReason !== 'completed'` → `throw new Error(stopReasonError(...))`，不返回部分 `value`。[E: packages/workflow/tool-workflow/src/index.ts:304] [E: packages/workflow/tool-workflow/src/index.ts:309]
8. 成功返回 `{ runId: run.id, agentsStarted, result: result.value }`。[E: packages/workflow/tool-workflow/src/index.ts:312]
9. `finally`：摘掉 abort listener；`await run.dispose()`（保持 member listener 直到静默，引擎可能在收尾时补 `cancelled` member end）；顶层再 `recorder.finish` / `recorder.abandon`。[E: packages/workflow/tool-workflow/src/index.ts:321] [E: packages/workflow/tool-workflow/src/index.ts:325] [E: packages/workflow/tool-workflow/src/index.ts:328]
10. 脚本里每次 `agent()`：撞 `maxTotalAgents` → `AGENT_CAP`；拿到并发槽后 `children.startAgent`；host `subagents.start(this.provider, { prompt, parent, signal, outputSchema?, agentOptions? })`。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:257] [E: packages/workflow/workflow-worker-thread/src/host.ts:352] 孩子 `stopReason === 'completed'` 才回文本或 `structured`；孩子自己失败回 `null`；run 已取消则抛 `CANCELLED`。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:317] [E: packages/workflow/workflow-worker-thread/src/runtime.ts:338] `opts.schema` 走 `assertObjectJsonSchema`（必须 object 根；subset = `type` / `properties` / `required` / `additionalProperties` / `items` / `enum` / `const` / `oneOf` + 注解；`pattern` / `format` / 数值上下界等关键字被拒）。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:383] [E: packages/core/tools/src/json-schema.ts:267] [E: packages/core/tools/src/json-schema.ts:402]

## 设计动机·edge

- **`meta` 是参数，不是源码。** `WorkflowMeta` 字段是 `name` / `description` / `whenToUse` / `phases`。[E: packages/workflow/workflow/src/types.ts:48] 工具把这块当 JSON 参数收，引擎 `validateMeta` 后再跑 body。残留 `export const meta` 得到专门 `SCRIPT_PARSE`（「meta rides the `meta` request field」），不是裸 SyntaxError。[E: packages/workflow/workflow-worker-thread/src/index.ts:66] 字段词汇对齐 Claude Code 动态 workflow 的 meta 块。[I]
- **kebab-case 是描述政策，不是引擎门。** `validateMeta` 接受任意非空 `name` 字符串。[I]
- **schema 层 `additionalProperties: true` 不等于引擎接受未知键。** 未知 `meta.*` / `meta.phases[].*` 在 `start()` 同步失败。测试禁止「先接受再忽略」。[E: packages/workflow/workflow-worker-thread/tests/meta.spec.ts:58]
- **没有后台 collection。** 模块注释写 background collection remains deferred；模型不能把 workflow 收成 `jobId`。要并行扇出，写在脚本的 `parallel` / `pipeline` 里。
- **fatal vs `null`。** 拼错 option、不受支持的 schema、cap、基础设施 `AGENT_START` / `AGENT_RESULT` 杀整脚本。孩子业务失败才是 per-item `null`。不要把「某个 agent 没干成」理解成工具 `isError`——那只发生在脚本本身没 `completed`。
- **`effort` / `isolation` / `agentType` 被点名拒绝。** `UNSUPPORTED_OPTION`，文案写 deferred and not supported。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:371]
- **phases 不调度。** `phase(title)` 只写 `currentPhase` 并通知 observer；真正的扇出结构来自脚本自己的 `pipeline` / `parallel` / 顺序 `await`。[E: packages/workflow/workflow-worker-thread/src/runtime.ts:475] `WorkflowPhase` 只有 title / detail / provider / model，没有 stage 或依赖边。[E: packages/workflow/workflow/src/types.ts:28]
- **worker 不是安全边界。** 同一 `ESCAPE` 夹具证明脚本能摸到 `process`。不要把 workflow 脚本当成 sandbox。[E: packages/workflow/workflow-worker-thread/tests/workflow-worker-thread.spec.ts:35]
- **嵌套 dispatch 不记 session 事件。** Code Mode / 其它 transport 带 `parent` token 时，避免把内层 run 再投影成顶层 Chat 节点。
- **同组还有 `tool-ralph`。** shipped preset 在 `tool-workflow` 旁边挂 `@deepseek-ai/dsh-tool-ralph`。那是另一页的 wire 名与 schema，不要把 ralph 的参数填进 `workflow`。

## Sources

- packages/workflow/tool-workflow/src/index.ts
- packages/workflow/tool-workflow/src/types.ts
- packages/workflow/tool-workflow/package.json
- packages/workflow/tool-workflow/tests/tool-workflow.spec.ts
- packages/workflow/workflow/src/index.ts
- packages/workflow/workflow/src/types.ts
- packages/workflow/workflow/src/runtime-types.ts
- packages/workflow/workflow/package.json
- packages/workflow/workflow/tests/workflow.spec.ts
- packages/workflow/workflow-worker-thread/src/index.ts
- packages/workflow/workflow-worker-thread/src/meta.ts
- packages/workflow/workflow-worker-thread/src/runtime.ts
- packages/workflow/workflow-worker-thread/src/host.ts
- packages/workflow/workflow-worker-thread/src/types.ts
- packages/workflow/workflow-worker-thread/package.json
- packages/workflow/workflow-worker-thread/tests/meta.spec.ts
- packages/workflow/workflow-worker-thread/tests/workflow-worker-thread.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/json-schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent](subagent.md)（`surface.tools.subagent`）：单次 spawn 委派；一两路孩子走它，大规模扇出走 `workflow` 脚本里的 `agent()`。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：fork provider 的另一 wire 名。workflow 引擎默认 `provider: spawn`，不是 fork。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：对已发布孩子的控制面；workflow 跑完才返回，不靠这三件套收脚本结果。
- [workflow 引擎](../../subsystems/orchestration/workflow.md)（`subsys.orchestration.workflow`）：`ctx.workflowEngine` Definition / worker-thread Provider，不是本页的模型 schema。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：`agent()` 落到 `ctx.subagents.start` 之后的子代理生命周期。
