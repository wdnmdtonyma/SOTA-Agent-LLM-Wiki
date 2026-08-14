---
id: surface.tools.ralph
title: ralph
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/workflow/tool-ralph/src/index.ts
  - packages/workflow/tool-ralph/package.json
  - packages/workflow/tool-ralph/tests/tool-ralph.spec.ts
  - packages/workflow/tool-ralph/tests/integration.spec.ts
  - packages/workflow/workflow/src/index.ts
  - packages/workflow/workflow/src/runtime-types.ts
  - packages/workflow/workflow/src/types.ts
  - packages/workflow/workflow-worker-thread/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/out-of-process.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/subagent-codex/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - name
  - inject
  - apply
  - Config
  - ralph
  - RALPH_SCRIPT
  - RALPH_META
  - requireFreshProvider
  - resolveMaxRounds
  - resolveConfig
  - readRunResult
  - renderResult
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.workflow
  - subsys.orchestration.workflow
  - surface.presets.standard
evidence: explicit
status: verified
updated: 47f943859b
---

> `ralph` 是 `@deepseek-ai/dsh-tool-ralph` 向模型注册的前台 fresh-agent 循环：wire 名 `ralph`；模型只提交不可变 `objective` 与可选 `maxRounds`。实现包用编译期固定的 `RALPH_SCRIPT` 调用 `ctx.workflowEngine.start`，每一轮拉起一个不继承父会话、且必须支持 `outputSchema` 的子 agent。

## 能回答的问题

- `ralph` 的 wire `name`、Cordis 插件名、`inject` 和 `defineTool` 注册点在哪？
- 模型可见字段只有 `objective` / `maxRounds` 吗？插件默认天花板 256 和 shipped `maxRounds: 64` 谁说了算？
- 终态 `complete` / `blocked` / `budget-limited` / `round-failed` 分别是成功还是 `isError`？正文会不会 spill？
- `ralph` 消费哪些 `ctx.*` seam？为什么 `fork` / `codex` 不能当 Ralph 路由？
- 四个 shipped preset 谁装 `tool-ralph`？它为什么落在 `delegation` 的 `isolate.workflowEngine` 组里？
- `execute()` 怎样把固定脚本交给 `workflowEngine.start`，父 step abort 如何取消 run？

## Identity

模型看见的工具名是字面量 `'ralph'`，由 `apply` 交给 `ctx.tools.register(defineTool({ name: 'ralph', … }))`。[E: packages/workflow/tool-ralph/src/index.ts:413][E: packages/workflow/tool-ralph/src/index.ts:412]

实现包是 `@deepseek-ai/dsh-tool-ralph`。Cordis 插件名 `export const name = 'tool-ralph'`，`inject = ['tools', 'workflowEngine', 'subagents', 'systemPrompt']`：缺任一服务时插件保持 pending，catalog 里不会出现 `ralph`。[E: packages/workflow/tool-ralph/package.json:2][E: packages/workflow/tool-ralph/src/index.ts:19][E: packages/workflow/tool-ralph/src/index.ts:20][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:398][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:399]

`apply(ctx, config)` 先 `resolveConfig`（即使调用方绕过 Loader、不走 schemastery 默认值，也会补 `spawn` / `256` / `16384` / `16384`），再挂 `systemPrompt` section `tool:ralph`（`order: 116`），最后 `register`。[E: packages/workflow/tool-ralph/src/index.ts:405][E: packages/workflow/tool-ralph/src/index.ts:406][E: packages/workflow/tool-ralph/src/index.ts:407][E: packages/workflow/tool-ralph/src/index.ts:409]

section 文本要求：只有**直接人类**明确点名 Ralph / fresh-agent 迭代时才用本工具；每轮新开无 conversation seed 的 child，共享工作区当 durable memory；完成与 blocker 是 worker 自报，不是独立评审；普通同会话长任务走 goal 工具，有界委托 / fan-out 走普通 subagent 或 `workflow`。[E: packages/workflow/tool-ralph/src/index.ts:410][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:380]

`defineTool({ name: 'ralph', … })` **没有** `timeoutMs`，也 **没有** `isConcurrencySafe`。registry 把未声明并发分类器的调用标成 `exclusive`；timeout-policy 读到 `undefined` 就原样 `next()`。[E: packages/core/tools/src/index.ts:1278][E: packages/guard/timeout-policy/src/index.ts:59]

fiber `dispose` 后 `ctx.tools.get('ralph')` 与 `tool:ralph` section 一起消失。[E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:392][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:393]

## 用途定位

`ralph` 跑的是**部署拥有的固定编排**，不是模型可改写的 workflow 脚本。模型只提供数据：一条 trim 后的不可变目标，外加可选轮次帽。循环、provider 路由、round report schema、handoff 校验都写在包内常量 `RALPH_SCRIPT` / `RALPH_META` 里。[E: packages/workflow/tool-ralph/src/index.ts:90][E: packages/workflow/tool-ralph/src/index.ts:80]

每一轮 `agent()` 拉起一个**全新** child：没有父会话 transcript，也没有上一轮 child 的 session。跨轮只传递一份有界 JSON report（`status` / `summary` / `evidence` / `nextSteps` / `blocker`）。共享工作区（父 agent 的 `session.header.cwd`）才是长期记忆。[E: packages/workflow/tool-ralph/src/index.ts:156][E: packages/workflow/tool-ralph/tests/integration.spec.ts:99][E: packages/workflow/tool-ralph/tests/integration.spec.ts:100][E: packages/workflow/tool-ralph/tests/integration.spec.ts:101]

调用是 **foreground**：`execute` `await run.result`，直到 worker 报 `complete` / `blocked`、撞上轮次帽 `budget-limited`，或 child / 引擎失败。这不是后台 job，也不是 continuable subagent。

工具 description 同样把使用面收窄到「人类明确要求 Ralph」，并把普通长跑划给 goal 工具。[E: packages/workflow/tool-ralph/src/index.ts:179]

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object：`objective` 进入 JSON Schema `required`；`maxRounds` 可选。schema **不填默认值**；省略时的轮次帽发生在 `resolveMaxRounds`。[E: packages/workflow/tool-ralph/src/index.ts:415][E: packages/core/tools/src/schema.ts:451][E: packages/workflow/tool-ralph/src/index.ts:208]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `objective` | `string` | 是 | 无 | schema 只要 string；`execute` 再 `trim()`，空串抛错 | 写进每一轮 child prompt 的不可变目标。[E: packages/workflow/tool-ralph/src/index.ts:416][E: packages/workflow/tool-ralph/src/index.ts:442] |
| `maxRounds` | `number` | 否 | 部署天花板 `resolved.maxRounds` | 必须是 `Number.isSafeInteger` 且 `≥ 1`，且 **≤** 天花板；超过天花板在 body 里抛 `TypeError` | 本调用最多开几轮 fresh child。schema 描述写成「Optional positive safe-integer round cap, bounded by the deployment ceiling。」[E: packages/workflow/tool-ralph/src/index.ts:421][E: packages/workflow/tool-ralph/src/index.ts:209][E: packages/workflow/tool-ralph/src/index.ts:214] |

缺 `objective`、非 JSON 安全数字（`NaN`）、`maxRounds: 0` / `1.5` / 超过天花板，都在 `start` 之前失败；单测里此时 `engine.requests` 仍为空。[E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:301][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:303][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:308]

`objective` 两侧空白会被 trim 掉再交给脚本：`'  Finish the migration.  '` 变成 `'Finish the migration.'`。[E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:147][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:151]

模型**看不见**、也改不了：`script`、`subagentProvider`、`maxHandoffChars`、`maxResultChars`、round report JSON Schema、`RALPH_META`。那些是 Config / 包常量。

**Config 改天花板与路由，不改字段名。** schemastery 默认如下；`resolveConfig` 在 Loader 未规范化时重复同一组默认，并拒绝空白 provider / 非正安全整数。[E: packages/workflow/tool-ralph/src/index.ts:35][E: packages/workflow/tool-ralph/src/index.ts:187]

| Config 键 | 插件默认 | 作用 |
|---|---|---|
| `subagentProvider` | `'spawn'` | 每一轮 `agent()` 走的 `ctx.subagents` 路由名；必须 fresh + `outputSchema`。[E: packages/workflow/tool-ralph/src/index.ts:36] |
| `maxRounds` | `256` | 部署天花板，也是模型省略 `maxRounds` 时的实际轮次。[E: packages/workflow/tool-ralph/src/index.ts:37] |
| `maxHandoffChars` | `16384` | 单份 structured report 的 `JSON.stringify` 字符帽；写入脚本 `args`，host `readReport` 再防一层。[E: packages/workflow/tool-ralph/src/index.ts:38][E: packages/workflow/tool-ralph/src/index.ts:450] |
| `maxResultChars` | `16384` | 父模型看见的终态正文（含信封与截断标记）字符帽。[E: packages/workflow/tool-ralph/src/index.ts:39] |

直接 `apply` 非法 Config（`' '` provider、`maxRounds: 0`、非整 `maxHandoffChars`）在碰到 `inject` 服务之前就抛 `TypeError`。[E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:327]

shipped `standard` / `code` / `cordis` 把 `subagentProvider` 写成 `spawn`（与插件默认相同），把 `maxRounds` **改成 64**（覆盖插件默认 256）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:232][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:233]

## 输出 & 截断 / spill

`execute` 成功返回的规范值是封闭 object：`runId`（`WorkflowRun.id`）、`agentsStarted`（引擎结算的 `agent()` 次数）、`result`（解码后的终态）。`output.schema` 用 `RALPH_OUTPUT_PROPERTIES` 钉死这三键，`additionalProperties: false`。[E: packages/workflow/tool-ralph/src/index.ts:379][E: packages/workflow/tool-ralph/src/index.ts:430][E: packages/workflow/tool-ralph/src/index.ts:467]

`result.status` 只有三种会作为**成功** tool result 回去：

| `result.status` | 含义 | 模型看见的 `render` 开头 |
|---|---|---|
| `complete` | 某轮 worker 交了合法 completion report | `Ralph worker reported completion after N round(s).` [E: packages/workflow/tool-ralph/src/index.ts:366] |
| `blocked` | 某轮 worker 交了合法 blocked report | `Ralph worker reported a blocker after N round(s).` [E: packages/workflow/tool-ralph/src/index.ts:369] |
| `budget-limited` | 用尽 `maxRounds`，最后一份仍是 `continue` | `Ralph reached its N round(s) limit; the worker reported work remaining.` [E: packages/workflow/tool-ralph/src/index.ts:372] |

三种成功正文后面都跟 `Final report:` + `JSON.stringify(report, null, 2)`。文案故意写成 **worker reported**，不把自报当成独立验收。[E: packages/workflow/tool-ralph/src/index.ts:366]

以下路径是 `isError`，**不会**走成功 `renderResult`：

- `result.status === 'round-failed'`：脚本在 `agent()` 拿到 `null` 后返回；host 抛 `renderRoundFailure` 文本（`Ralph round K child failed before producing a structured report.` + 上一份合法 `continue` handoff，或「No previous handoff was available.」）。[E: packages/workflow/tool-ralph/src/index.ts:465][E: packages/workflow/tool-ralph/src/index.ts:387]
- `WorkflowResult.stopReason !== 'completed'`：`cancelled` → `Ralph workflow was cancelled…`；`error` → `Ralph workflow failed: …`。缝上的闭合联合是 `'completed' | 'cancelled' | 'error'`。[E: packages/workflow/workflow/src/types.ts:63][E: packages/workflow/workflow/src/types.ts:76][E: packages/workflow/tool-ralph/src/index.ts:336][E: packages/workflow/tool-ralph/src/index.ts:341]
- 终态 JSON 对不上 `readRunResult` 的封闭形状（缺键、多键、status/report 不一致、handoff 超帽）→ 抛 `Ralph workflow returned …`。[E: packages/workflow/tool-ralph/src/index.ts:283][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:333]

`boundResult` 按 `maxResultChars` 切父可见正文；超长时尾部换成 `\n… [truncated]`（常量 `TRUNCATION_NOTICE`）。若帽子短于标记本身，只保留标记前缀（单测 `maxResultChars: 5` 得到 `'\n… [t'`）。[E: packages/workflow/tool-ralph/src/index.ts:351][E: packages/workflow/tool-ralph/src/index.ts:354][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:218]

`ralph` **没有**自己的 spill 路径：不读 `ctx.spillStore`，也不把 report 卸到磁盘。截断只发生在 `boundResult`。compaction 层的 `tool-result-pruner` 可能事后改写过长 `tool/result`，那不是本工具的输出合同。

UI：`presentCall` 是 `{ card: 'generic', title: 'ralph', rawInput: args.objective }`；`presentResult` 恒 `{ card: 'generic' }`。`defineTool` 对 replay 参数做软校验，缺 `objective` 的旧日志回放返回 `undefined`，UI 回退通用卡片。[E: packages/workflow/tool-ralph/src/index.ts:394][E: packages/workflow/tool-ralph/src/index.ts:401][E: packages/core/tools/src/schema.ts:600][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:384]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `WorkflowEngine.start(WorkflowStartRequest): WorkflowRun`（`script` / `meta` / `args` / `subagentProvider` / `maxTotalAgents` / 必填 `parent` / `signal`）；`SubagentProvider` 的 `capabilities.outputSchema` 与 `inheritsParentContext`。[E: packages/workflow/workflow/src/index.ts:168][E: packages/workflow/workflow/src/runtime-types.ts:19][E: packages/workflow/workflow/src/runtime-types.ts:31] |
| Provider | 默认引擎 `@deepseek-ai/dsh-workflow-worker-thread`（`WorkerThreadWorkflowEngine`，服务名 `workflowEngine`）。默认 child 路由 `@deepseek-ai/dsh-subagent-spawn-in-process` 登记名 `spawn`：`outputSchema: true`，`inheritsParentContext = false`。[E: packages/workflow/workflow-worker-thread/src/index.ts:143][E: packages/subagent/subagent-spawn-in-process/src/index.ts:42][E: packages/subagent/subagent-spawn-in-process/src/index.ts:44] |
| Consumer | `@deepseek-ai/dsh-tool-ralph`：`requireFreshProvider` 后把**固定** `RALPH_SCRIPT` 交给 `ctx.workflowEngine.start`。同组的 `tool-workflow` 是另一条 Consumer，模型在那边才提交脚本。[E: packages/workflow/tool-ralph/src/index.ts:447] |

`requireFreshProvider(ctx, name)` 经 `ctx.subagents.getProvider` 取路由，三道门：未注册、`!capabilities.outputSchema`、`inheritsParentContext`。任一道失败都在 `start` 之前抛错。[E: packages/workflow/tool-ralph/src/index.ts:220][E: packages/workflow/tool-ralph/src/index.ts:222][E: packages/workflow/tool-ralph/src/index.ts:225][E: packages/workflow/tool-ralph/src/index.ts:228][E: packages/subagent/subagent/src/index.ts:392]

因此 shipped 里两条常见「别的委托路由」都不能当 Ralph provider：

- `fork`（`@deepseek-ai/dsh-subagent-fork-in-process`）有 `outputSchema`，但 `inheritsParentContext = true`（seed 父会话已完成 turn 前缀）→ 文案 `inherits parent context; Ralph requires a fresh provider`。[E: packages/subagent/subagent-fork-in-process/src/index.ts:64][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:323]
- `codex` / `claude-code` / 进程外 SDK 使用 `NO_START_CAPABILITIES`（`outputSchema: false`）→ `does not support structured output`。[E: packages/subagent/subagent/src/out-of-process.ts:26][E: packages/subagent/subagent-codex/src/index.ts:49]

换 `ctx.workflowEngine` provider 会带走：脚本隔离（worker-thread vs 别的后端）、`workflow/*` 事件实现、`maxTotalAgents` 引擎天花板、取消 / `dispose` 宽限。换 `ctx.subagents` 的 `spawn` 实现会带走：child 如何建 session、cwd / lineage / depth 怎么盖、structured output 怎么捕获。**不会**带走：`RALPH_SCRIPT` 的轮次语义、report 形状、host 侧 `readRunResult` 二次校验。

`ralph` 不消费 `ctx.fs` / `ctx.shell` / `ctx.approval` / `ctx.sandboxPolicy`。子 agent 自己的工具仍走完整 `tools/pre-execute → execute → post-execute`；那是 child 的调用，不是本工具 body 再包一层 sandbox。

## 执行管线

模型发出 `ralph` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1475]

对本工具的挂点：

- **`tools/pre-execute`**：`ralph` 自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **并发**：未声明 `isConcurrencySafe`，`executionMode` 直接 `exclusive`，不会与其它 exclusive 调用重叠。[E: packages/core/tools/src/index.ts:1278]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`；flush 后若已 abort，返回 `ABORTED_BEFORE_DISPATCH`，body 不跑。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`；本工具未声明，包装器直接 `next()`。一轮 Ralph 可以跑很久，取消靠父 `exec.signal`，不靠工具级 deadline。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]
- **body**：`defineTool` 先 `validateArgs`（缺 `objective` → `INVALID_ARGS`），再进 `apply` 里的 `execute`。`exec.signal` abort 时 `run.cancel('parent step aborted')`。[E: packages/core/tools/src/schema.ts:586][E: packages/workflow/tool-ralph/src/index.ts:456]
- **`tools/post-execute`**：本工具不注册 listener，默认 `accept`。规范值由 registry 冻结后 `render`。[E: packages/core/tools/src/index.ts:1745][E: packages/core/tools/src/index.ts:1800]
- **sandbox / approval**：不挂。文件副作用发生在 child 自己的 `write` / `edit` / `bash` 上。

Code Mode（shipped `code` preset 的 `tool-presentation` `mode: code`）下，模型不能直呼 `ralph`：非嵌套且 `mode === 'code'` 时，除 `run_code` 外的名字在 `createExecution` 里 collapse，返回指引改走 `run_code` 程序，**不进** `tools/pre-execute`。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:996] SDK 子分发带 `parent`（`nested === true`），不 collapse，`await tools.ralph({ objective })` 仍走完整管线；checkpoint 在 `exec.parent !== undefined` 时直接 `next()`。

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。

| preset | 装 `@deepseek-ai/dsh-tool-ralph`？ | `disabled` | isolate | shipped Config |
|---|---|---|---|---|
| `minimal` | **否** | — | 无 `delegation` 组 | yml 只有 `persona` + `persistent-shell` + `filesystem`；最后一行工具是 `str-replace-editor`，没有 `id: tool-ralph`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | **是** | 无 | `delegation` 组 `isolate.workflowEngine: true` | `subagentProvider: spawn`，`maxRounds: 64`（覆盖插件默认 256）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:229][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:233] |
| `code` | **是** | 无 | 同 `delegation` / `workflowEngine` | 与 `standard` 同键同值。Code Mode 只换呈现（模型直调只剩 `run_code`），本行仍注册。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:175][E: apps/cli/config/agent-presets/code/agent.cordis.yml:179][E: apps/cli/config/agent-presets/code/agent.cordis.yml:230][E: apps/cli/config/agent-presets/code/agent.cordis.yml:234] |
| `cordis` | **是** | 无 | 同 `delegation` / `workflowEngine` | 与 `standard` 同键同值。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:162][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:166][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:217][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:221] |

`tool-ralph` 的 `inject` 含 `workflowEngine`。preset 把引擎行 `workflow-worker-thread` 和本工具放进**同一个** `isolate.workflowEngine` 组，避免消费者落到 host 上一个本 preset 并未填充的 registry。组内还有 `tool-workflow`、`tool-subagent*`；`subagents` **registry** 本身在 host，本行只消费它。

host `dsh-base` 也有一行 `tool-ralph`（同样 `spawn` + `maxRounds: 64`）。`dsh-web-app` 把 host 行 `disabled: true`，改由每会话 preset remount——所以 web 上 `minimal` 会话看不到 `ralph`。[E: packages/bundle/base/cordis.patch.yml:378][E: packages/bundle/base/cordis.patch.yml:382][E: packages/bundle/web-app/cordis.patch.yml:398][E: packages/bundle/web-app/cordis.patch.yml:399]

## execute() 走读

符号：`apply` / `requireFreshProvider` / `RALPH_SCRIPT` @ `packages/workflow/tool-ralph/src/index.ts`；`WorkflowEngine.start` @ `packages/workflow/workflow/src/index.ts`；`WorkerThreadWorkflowEngine.start` @ `packages/workflow/workflow-worker-thread/src/index.ts`。

1. **调用方必须是 agent。** `exec.agent === undefined` 抛 `Ralph tool requires a calling agent`。无 agent 的直接 `ctx.tools.execute` 不能开 run（`WorkflowStartRequest.parent` 必填）。[E: packages/workflow/tool-ralph/src/index.ts:440][E: packages/workflow/workflow/src/runtime-types.ts:31][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:301]

2. **规范化目标与轮次。** `objective = args.objective.trim()`；空串抛错。`resolveMaxRounds(args.maxRounds, resolved.maxRounds)`：省略则用天花板；非法或超帽抛 `TypeError`。[E: packages/workflow/tool-ralph/src/index.ts:442][E: packages/workflow/tool-ralph/src/index.ts:444][E: packages/workflow/tool-ralph/src/index.ts:213]

3. **冻结路由。** `void requireFreshProvider(ctx, resolved.subagentProvider)` 只做门控，返回值不参与后续调用——真正 `agent()` 由引擎按 `subagentProvider` 字符串再查一次。缺注册 / 无 schema / 继承父上下文都在 `start` 前失败，`engine.requests.length === 0`。[E: packages/workflow/tool-ralph/src/index.ts:445][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:315]

4. **启动固定脚本。** `ctx.workflowEngine.start({ script: RALPH_SCRIPT, meta: RALPH_META, args: { objective, maxRounds, maxHandoffChars }, subagentProvider, maxTotalAgents: maxRounds, parent, signal: exec.signal })`。`RALPH_META.name` 是 `'ralph-loop'`；`maxTotalAgents` 与本调用轮次帽对齐，防止脚本循环超过模型/部署同意的 child 数。[E: packages/workflow/tool-ralph/src/index.ts:447][E: packages/workflow/tool-ralph/src/index.ts:81][E: packages/workflow/tool-ralph/src/index.ts:452][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:150]

5. **引擎侧同步校验。** shipped `WorkerThreadWorkflowEngine.start` 先 `validateMeta`、`assertBodyParses`，再解析 provider 与 `maxTotalAgents`，然后 `new WorkerRun`。脚本解析失败会同步抛 `WorkflowError`；单测里 `startError` 路径 `disposed === 0`（还没有 live run）。[E: packages/workflow/workflow-worker-thread/src/index.ts:143][E: packages/workflow/workflow-worker-thread/src/index.ts:145][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:374]

6. **把父 abort 桥到 run。** `exec.signal` 加 `{ once: true }` 的 `abort` listener，回调 `run.cancel('parent step aborted')`；若进入 body 时已经 aborted，立刻再 cancel 一次。单测：中途 abort → tool `isError`；预先 aborted 的第二次调用根本不 `start`（`TOOL_ABORTED_BEFORE_DISPATCH`）。[E: packages/workflow/tool-ralph/src/index.ts:456][E: packages/workflow/tool-ralph/src/index.ts:458][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:280][E: packages/workflow/tool-ralph/tests/integration.spec.ts:266]

7. **脚本里的一轮。** `RALPH_SCRIPT` 调 `phase('Fresh-agent rounds')`，然后 `for (round = 1; round <= args.maxRounds)`。每轮拼一份 prompt：禁止再调 `ralph`、打印不可变 `objective`、轮次 `N of max`、工作区是 source of truth、上一份 handoff（首轮是 `(none — this is the first round)`）。然后 `await agent(prompt, { label, phase, schema: reportSchema })`。[E: packages/workflow/tool-ralph/src/index.ts:152][E: packages/workflow/tool-ralph/src/index.ts:163][E: packages/workflow/tool-ralph/src/index.ts:100]

8. **child 合同（集成栈）。** 真实 `spawn` + worker-thread 下，每轮 child 的 `session.header.cwd` 等于父 cwd，`parentSession` 指向父 session，`seedLength` 为 `undefined`（无父 transcript）。父历史标记与 `PARENT_PROMPT_MARKER` 不会出现在任何一轮 LLM 请求里；第二轮请求才含上一轮 `summary` 文本。每个 child 在轮末从 `ctx.agents` 卸掉。[E: packages/workflow/tool-ralph/tests/integration.spec.ts:99][E: packages/workflow/tool-ralph/tests/integration.spec.ts:101][E: packages/workflow/tool-ralph/tests/integration.spec.ts:108][E: packages/workflow/tool-ralph/tests/integration.spec.ts:113]

9. **脚本内校验 report。** `reportSchema` 要求五键且 `additionalProperties: false`：`status ∈ {continue,complete,blocked}`，`summary` / `evidence` / `nextSteps` / `blocker`。`validateReport` 再要求 trim 后的非空字符串；`continue` 必须有 `nextSteps` 且 `blocker === ''`；`complete` 必须有 `evidence`、空 `nextSteps`、空 `blocker`；`blocked` 必须有具体 `blocker`。超 `args.maxHandoffChars` 抛错，引擎把这次跑成 `stopReason: 'error'`。[E: packages/workflow/tool-ralph/src/index.ts:100][E: packages/workflow/tool-ralph/src/index.ts:127][E: packages/workflow/tool-ralph/src/index.ts:145][E: packages/workflow/tool-ralph/tests/integration.spec.ts:192]

10. **脚本终态。** `agent()` 返回 `null` → `{ status: 'round-failed', roundsStarted, lastReport }`；`complete` / `blocked` 立刻 `return`；循环走完 → `{ status: 'budget-limited', roundsStarted: args.maxRounds, report: previous }`。[E: packages/workflow/tool-ralph/src/index.ts:169][E: packages/workflow/tool-ralph/src/index.ts:172][E: packages/workflow/tool-ralph/src/index.ts:176]

11. **host 二次解码。** `await run.result` 后 `stopReasonError`：非 `completed` 直接抛。`readRunResult` 再按封闭键集解码；`budget-limited` 还要求 `roundsStarted === maxRounds`。`round-failed` 转成 `isError` 文本；其余三态作为 `value.result` 返回。[E: packages/workflow/tool-ralph/src/index.ts:461][E: packages/workflow/tool-ralph/src/index.ts:464][E: packages/workflow/tool-ralph/src/index.ts:307]

12. **`finally` 必 dispose。** 无论成功或抛错，去掉 abort listener 并 `await run.dispose()`，等 worker 与 child 静默。`start` 同步抛出时还没有 run，不会 dispose。[E: packages/workflow/tool-ralph/src/index.ts:472][E: packages/workflow/tool-ralph/src/index.ts:473][E: packages/workflow/tool-ralph/tests/tool-ralph.spec.ts:266]

## 设计动机·edge

DSH 把「Ralph 环」做成**固定脚本的专用 Consumer**，而不是让模型往 `workflow` 工具里贴一段循环。差别是控制权：`workflow` 的 schema 含模型可写 `script`；`ralph` 的 schema 只有 `objective` + 可选 `maxRounds`。不要把 `workflow` 的参数表套到本页。

和同层其它编排的边界：

- **vs `workflow`**：同一 `ctx.workflowEngine`，同一 worker-thread Provider。`workflow` 是通用脚本入口；`ralph` 冻结循环、schema、handoff 校验，模型不能改 provider、不能改 report 形状。
- **vs `subagent` / `subagent_fork`**：一次性（或 continuable）委托。`fork` 继承父上下文，正好违反 Ralph 的 fresh 合同，`requireFreshProvider` 会拒。
- **vs goal 三件套**：goal 是同会话持久目标；Ralph 是跨多个**空白** child 的前台迭代。工具 description 把「普通长跑」划给 goal。[E: packages/workflow/tool-ralph/src/index.ts:184]

和常见 peer「Ralph loop」（外层 shell / 人工程序反复开新 session）的差异：

- **脚本在部署侧。** 模型不能改循环条件，也不能在 child 里再调 `ralph`（prompt 写明「this round already is its worker」）。[E: packages/workflow/tool-ralph/src/index.ts:156]
- **handoff 是 typed JSON，不是自由 transcript。** 未规范化的 `summary`（两侧空白）会让脚本抛错，集成测试钉死 `summary must be non-empty and normalized`。[E: packages/workflow/tool-ralph/tests/integration.spec.ts:192]
- **完成是自报。** `complete` 成功返回，但 prompt / section / `render` 都把它标成 worker report，不是第二套评测 agent。
- **`blocked` 与 `budget-limited` 也是成功。** 它们表示「环按合同停了」，不是引擎故障。`round-failed` 与 `stopReason !== completed` 才是 `isError`。
- **取消是整 run。** 父 step abort 会 `cancel` worker 与当前 child；集成测试等到 `workflow/agent-end` 的 `cancelled`，且 child 从 registry 消失。[E: packages/workflow/tool-ralph/tests/integration.spec.ts:267]

其它容易踩的边：

- 省略 `maxRounds` 时用的是**部署天花板**。插件默认 256，但三个 shipped 有 delegation 的 preset 写成 64；产品默认 web 会话实际是 64，不是 256。
- `maxRounds` schema 类型是 `number` 不是 `integer`；`1.5` 过 schema 后被 `resolveMaxRounds` 拒。
- 第一轮 `round-failed` 的 `lastReport` 必须是 `null`；后续轮必须带上一份合法 `continue`。形状不对会被 host 判畸形，而不是当成普通 child 失败。[E: packages/workflow/tool-ralph/src/index.ts:316]
- 同步 `start` 失败不会留下半个 run；一旦返回了 `WorkflowRun`，`finally` 总会 `dispose`。

## Sources

- `packages/workflow/tool-ralph/src/index.ts`
- `packages/workflow/tool-ralph/package.json`
- `packages/workflow/tool-ralph/tests/tool-ralph.spec.ts`
- `packages/workflow/tool-ralph/tests/integration.spec.ts`
- `packages/workflow/workflow/src/index.ts`
- `packages/workflow/workflow/src/runtime-types.ts`
- `packages/workflow/workflow/src/types.ts`
- `packages/workflow/workflow-worker-thread/src/index.ts`
- `packages/subagent/subagent/src/index.ts`
- `packages/subagent/subagent/src/out-of-process.ts`
- `packages/subagent/subagent-spawn-in-process/src/index.ts`
- `packages/subagent/subagent-fork-in-process/src/index.ts`
- `packages/subagent/subagent-codex/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/tools/src/schema.ts`
- `packages/guard/timeout-policy/src/index.ts`
- `packages/session/session-checkpoint-policy/src/index.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `apps/cli/config/agent-presets/minimal/agent.cordis.yml`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `apps/cli/config/agent-presets/code/agent.cordis.yml`
- `apps/cli/config/agent-presets/cordis/agent.cordis.yml`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 脊柱；本工具作为 top-level 调用进入同一管线。
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表。
- [workflow](workflow.md) — 同一 `ctx.workflowEngine` 上、模型可提交脚本的通用入口；不要把那边的 schema 当成 `ralph` 的参数。
- [workflow 引擎](../../subsystems/orchestration/workflow.md) — `WorkflowEngine` Definition 与 worker-thread Provider。
- [standard preset](../presets/standard.md) — web 默认 composition；`delegation` 组里挂本工具且 `maxRounds: 64`。
