---
id: surface.tools.report
title: report
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/subagent/tool-subagent-report/src/index.ts
  - packages/subagent/tool-subagent-report/package.json
  - packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/activation-setup-registry.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - report
  - installReportTool
  - apply
  - inject
  - name
  - Config
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - spine.trace-subagent
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - surface.tools.subagent-control
  - subsys.orchestration.subagent
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名 `report`；实现包 `@deepseek-ai/dsh-tool-subagent-report`（Cordis 插件名 `tool-subagent-report`）。它不是父 agent catalog 里的全局工具，而是挂在 **continuable in-process child** 的 `childCtx.tools` 上的返回通道：把选中的 `output` 交给启动自己的直接 parent。

## 能回答的问题

- `report` 为什么在根 / parent / one-shot / agentless catalog 里看不见，却会出现在 continuable child 的 schema 里？
- 四个 shipped preset 为什么都不挂 `@deepseek-ai/dsh-tool-subagent-report`，host `dsh-base` 又为什么要装？
- 模型参数只有 `output` 吗？`reportDelivery` 会不会进 schema？
- `wakeup` 与 `quiet` 分别怎样进 parent inbox？会不会结束 child 的 turn？
- `toolFilter: { allow: [] }` 为什么仍留得住 `report`，却挡得住 parent 的 `send_message`？
- `UNAUTHORIZED` / `PARENT_UNAVAILABLE` / `DRAINING` 各自在哪条边界抛出？

## Identity

Wire 名是 `report`，写在 `defineTool({ name: 'report', ... })`，由 `installReportTool` 调 `childCtx.tools.register`。[E: packages/subagent/tool-subagent-report/src/index.ts:66] [E: packages/subagent/tool-subagent-report/src/index.ts:65] 实现包是 `@deepseek-ai/dsh-tool-subagent-report`。[E: packages/subagent/tool-subagent-report/package.json:2] Cordis 插件导出名是 `tool-subagent-report`。[E: packages/subagent/tool-subagent-report/src/index.ts:17]

`inject` 是 `['subagents', 'tools', 'systemPrompt']`。声明 `tools` / `systemPrompt` 是为了 Loader 在 load 时就排好序；真正的 `register` 发生在 **child 未发布的 scope**，不是 host 全局 catalog。[E: packages/subagent/tool-subagent-report/src/index.ts:21] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:511]

工厂是 `apply(ctx, config = {})`：用 `Config(config)` 解析 `reportDelivery`（schema 默认 `'wakeup'`），再 `ctx.subagents.registerContinuableSetup(childCtx => installReportTool(childCtx, ctx, reportDelivery))`。[E: packages/subagent/tool-subagent-report/src/index.ts:136] [E: packages/subagent/tool-subagent-report/src/index.ts:139] [E: packages/subagent/tool-subagent-report/src/index.ts:140] [E: packages/subagent/tool-subagent-report/src/index.ts:141] 测试钉死裸 `Config({})` 得到 `reportDelivery: 'wakeup'`，非法值 `'shout'` 抛错。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:514] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:515]

`installReportTool` 同时做两件事，都挂在 **那个 child 的 scope** 上，parent / sibling 看不见：

1. `childCtx.systemPrompt.section({ name: 'tool:report', order: 117, ... })`，正文要求 child 结束前用 `report` 交一份自洽结果，并写明 reporting 不结束 turn。[E: packages/subagent/tool-subagent-report/src/index.ts:54] [E: packages/subagent/tool-subagent-report/src/index.ts:55] [E: packages/subagent/tool-subagent-report/src/index.ts:24] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:415]
2. `childCtx.tools.register(defineTool({ name: 'report', ... }))`。[E: packages/subagent/tool-subagent-report/src/index.ts:65]

工具注册失败时先 `disposeSection()` 再抛；两者都失败则 `AggregateError`。[E: packages/subagent/tool-subagent-report/src/index.ts:107] [E: packages/subagent/tool-subagent-report/src/index.ts:109] 测试：child 上先占住 `report` 名，再 `installReportTool` 会抛 `/already registered in this scope/`，且 `tool:report` section 不会留下。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:348] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:349]

`ctx.tools.schemas()`（host / 无 agent）和 `ctx.tools.schemas(parent)` **都不含** `report`；只有 `startContinuable` 出来的 child scope 才有恰好一条。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:137] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:138] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:142] 包未 load 时 child 也没有隐式能力：`schemas(child)` 不含 `report`，直接 `tools.execute({ name: 'report' })` 是 `isError`。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:151]

本包**不**顺带装 parent 控制工具。测试先确认全局 catalog 没有 `send_message`，再单独 `plugin` `dsh-tool-subagent-control` 才出现该名。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:156] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:158]

## 用途定位

`report` 让 **continuable in-process child** 向启动自己的 **直接 parent** 投递一条选中内容。描述写明：workspace 共享，但 parent **不会**自动拿到 child 的 transcript / 工具输出 / reasoning；结束工作本身不是结果；只送达直接 parent；reporting **不**结束 turn、也 **不**结束 Activation。[E: packages/subagent/tool-subagent-report/src/index.ts:70] [E: packages/subagent/tool-subagent-report/src/index.ts:71]

它**不是** parent 侧的 `send_message` / `interrupt_agent` / `list_agents`（那是 [`surface.tools.subagent-control`](subagent-control.md)）。它也**不是** child 结算时服务自动写的 `subagent-settled` 通知：child 自己不调 `report`，parent 的 `subagent-report` 列表就是空的；测试还确认这条路径不创建 `ctx.jobs`。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:555] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:557]

接收方不能由模型点名。`reportFrom` 从 child 的 durable `parentSession` 推导唯一 parent；调用方只能交出 **确切 live Agent 对象** 当凭证。[E: packages/subagent/subagent/src/continuation.ts:617] [E: packages/subagent/subagent/src/continuation.ts:598]

## 输入 schema

以插件默认 `Config`（`reportDelivery: 'wakeup'`）boot 后、child scope 上的 `defineTool` 为准。模型参数只有一个必填字符串 `output`。测试钉死 `parameters.properties` 的键恰好是 `['output']`。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:144] [E: packages/subagent/tool-subagent-report/src/index.ts:75]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `output` | `string` | 是 | 无 | `defineTool` 的 ParameterSchemaSpec `required: true` | 交给直接 parent 的可行动内容；描述要求总结结论并引用共享路径。[E: packages/subagent/tool-subagent-report/src/index.ts:76] [E: packages/subagent/tool-subagent-report/src/index.ts:77] |

**Config 不改广告。** `reportDelivery` 是部署调度策略（`'quiet' | 'wakeup'`），schema 默认 `'wakeup'`，**不是**模型参数；单次调用不能覆盖。[E: packages/subagent/tool-subagent-report/src/index.ts:37] `defineTool` 没有 `recipient` / `delivery` / `timeoutMs` / `isConcurrencySafe` 字段。[E: packages/subagent/tool-subagent-report/src/index.ts:74]

缺 `output` 或类型不对时，`defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，违规抛 `ToolArgsError`（`INVALID_ARGS`），到不了 `reportFrom`。[E: packages/core/tools/src/schema.ts:586] [E: packages/core/tools/src/schema.ts:587] [E: packages/core/tools/src/schema.ts:465]

## 输出 & 截断 / spill

`output.schema` 是封闭 object：`additionalProperties: false`，唯一必填属性 `messageId: string`。[E: packages/subagent/tool-subagent-report/src/index.ts:83] [E: packages/subagent/tool-subagent-report/src/index.ts:86] `execute` 成功返回 `{ messageId }`，该 id 来自 parent 已接受的那条 user 消息。[E: packages/subagent/tool-subagent-report/src/index.ts:102] [E: packages/subagent/subagent/src/continuation.ts:652]

`output.render` 固定一句：`report accepted by the agent that started you as message ${value.messageId}`。[E: packages/subagent/tool-subagent-report/src/index.ts:91] 测试核对渲染文本包含同一个 `messageId`。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:196]

本工具**没有** spill / 字节截断。`output` 原样变成一条 text `ContentBlock` 再交给 `reportFrom`。[E: packages/subagent/tool-subagent-report/src/index.ts:95] parent 侧看到的正文是服务加的前缀再拼 child 原文：`Background subagent ${childId} reported:` + `output`。[E: packages/subagent/subagent/src/continuation.ts:638] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:199]

描述提醒：失败的 tool result **仍可能已经送达**——`reportFrom` 接受消息之后，后段 `tools/post-execute` 仍能把结果换成 `isError`。[E: packages/subagent/tool-subagent-report/src/index.ts:72] [E: packages/core/tools/src/index.ts:1752]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `ctx.subagents`（`SubagentRuntime`，`super(ctx, 'subagents')`） | `reportFrom` / `registerContinuableSetup` 的合同面。[E: packages/subagent/subagent/src/index.ts:184] [E: packages/subagent/subagent/src/index.ts:270] |
| Provider（编排） | `SubagentContinuationManager` + `SubagentActivationSetupRegistry` | 授权 sender、解析 live parent、按 `delivery` 调 `followup` / `inject`；把 setup contribution 装进 unpublished child。[E: packages/subagent/subagent/src/continuation.ts:583] [E: packages/subagent/subagent/src/activation-setup-registry.ts:90] |
| Consumer | `@deepseek-ai/dsh-tool-subagent-report` | `apply` 只注册 setup；`installReportTool` 的 `execute` 调 **host** `ctx.subagents.reportFrom(exec.agent, content, { delivery, signal })`。[E: packages/subagent/tool-subagent-report/src/index.ts:98] |
| 相邻缝 | `ctx.tools` / `ctx.systemPrompt` | child scope 的 `register` 与 `section`；换掉它们会带走可见性与 guidance，但投递仍走 `ctx.subagents`。[E: packages/subagent/tool-subagent-report/src/index.ts:54] [E: packages/subagent/tool-subagent-report/src/index.ts:65] |

换掉 `ctx.subagents` provider / 卸掉 continuation binding，会带走：谁算 live continuable child、parent 解析、`wakeup`/`quiet` 调度、以及 setup 是否被装上。工具包自己不写 inbox。

`registerContinuableSetup` 用 `ctx.effect(() => this.setupRegistry.register(contribution), ...)` 绑在 **host 上那一个** `SubagentRuntime`：contribution 列表是进程单例，不是 per-agent scope。[E: packages/subagent/subagent/src/index.ts:286] [E: packages/subagent/subagent/src/index.ts:288] `setupRegistry.apply` 对 **每一个** live registration 调 `registration.contribution(childCtx)`。[E: packages/subagent/subagent/src/activation-setup-registry.ts:93] [E: packages/subagent/subagent/src/activation-setup-registry.ts:100] 因此 host 已 `apply()` 一次之后，preset 再挂同一包会再登记一份 contribution；第二次 `installReportTool` 会在同一 `childCtx` 上重复 `register('report')`，撞上 `tool "report" is already registered in this scope`。[I] [E: packages/core/tools/src/index.ts:728]

`restrict` 只过滤 **继承来的** 全局 / 祖先工具；scope **自己** 登记的名字始终可见。这就是 `toolFilter: { allow: [] }` 仍能看见 `report`、却看不见 parent 全局 `send_message` 的原因。[E: packages/core/tools/src/index.ts:1071] [E: packages/core/tools/src/index.ts:1181] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:176] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:177] 顺序是先 `applyChildComposition`（可 `restrict`），再 `setupRegistry.apply`（才 `register` `report`）。[E: packages/subagent/subagent/src/child-agent.ts:174] [E: packages/subagent/subagent/src/continuation.ts:1003] [E: packages/subagent/subagent/src/continuation.ts:1004]

## 执行管线

child 调 `report` 仍走 host 面 `ctx.tools` 的 staged 管线：`tools/pre-execute` → 可选 `serviceAsk` → 单调 `guard` → `tools/execute`（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1743] 本工具**不**自己挂 pre-execute listener，默认 `next()` 得到 `{ kind: 'allow' }`。[E: packages/core/tools/src/index.ts:1477]

对本工具的挂点：

- **approval：** 不返回 `ask`，body 里也没有 `approveEscalation`。普通产品路径不会为 `report` 弹审批。
- **timeout：** `defineTool` 未设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] 取消靠 `exec.signal`：`reportFrom` 入口 `options.signal.throwIfAborted()`。[E: packages/subagent/subagent/src/continuation.ts:588]
- **sandbox：** 不碰 `ctx.fs` / `ctx.sandbox`。没有文件副作用，也没有 confine。
- **checkpoint：** top-level、无 `parent` token 时，`dsh-session-checkpoint-policy` 在 body 前 `sessions.flush`。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 `exclusive`。[E: packages/core/tools/src/index.ts:1278]
- **Code Mode：** continuable child 通过 `agentPresets.composeFrom(childCtx, parent.ctx)` 加入 parent 的 standing preset。[E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/preset/agent-presets/src/index.ts:316] `code` preset 的 `tool-presentation` 把该 standing scope `presentAs('code')`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/agent-tool-presentation/src/index.ts:70] `modeFor` 沿 scope 链取最近的 mode，所以 child 也是 `code`。[E: packages/core/tools/src/index.ts:908] 无 `parent` token 的模型直调 `report` 在进 waterfall **之前** `collapses` 成 `UNKNOWN_TOOL`；要从 `run_code` 程序里带子调用 token 调。[E: packages/core/tools/src/index.ts:1325] wire schema 在 `code` 下只投影 `run_code`。[E: packages/core/tools/src/index.ts:996]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。四个 shipped 文件都 **没有** `@deepseek-ai/dsh-tool-subagent-report` 这一行。host `dsh-base` 才装它。

| preset | 装 `@deepseek-ai/dsh-tool-subagent-report`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。整份组成只有 persona + persistent bash + `str_replace_editor` | — | 本包未出现。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:9] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] | — |
| `standard` | **否**。`delegation` 组只挂 control / list-agents / `subagent` / `subagent_fork` | — | 本包未出现；组本身 `isolate.workflowEngine: true` 管的是 workflow，不是 report。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:181] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:187] | — |
| `code` | **否**。delegation 同样只挂那四行工具 | — | 同 standard。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:182] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:188] | — |
| `cordis` | **否**。delegation 同样只挂那四行工具 | — | 同 standard。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:169] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:175] | — |

组合旁注（**不是** preset 成员资格）：

- `dsh-base` 在 host 插入 `id: tool-subagent-report` / `name: '@deepseek-ai/dsh-tool-subagent-report'`，且 `dsh-base` 的 `package.json` 依赖该包。裸 host 行没有写 `reportDelivery`，因此走插件默认 `'wakeup'`。[E: packages/bundle/base/cordis.patch.yml:332] [E: packages/bundle/base/cordis.patch.yml:333] [E: packages/bundle/base/package.json:105]
- `dsh-web-app` overlay 把 host 上的 `tool-subagent-control` / `tool-subagent-list-agents` / `tool-subagent` / `tool-subagent-fork` 设 `disabled: true`，**没有** `id: tool-subagent-report` 的 disable 行；下一条实际插件是 `workflow-worker-thread`。[E: packages/bundle/web-app/cordis.patch.yml:375] [E: packages/bundle/web-app/cordis.patch.yml:381] [E: packages/bundle/web-app/cordis.patch.yml:384] [E: packages/bundle/web-app/cordis.patch.yml:392] 因此 web profile 上 `report` 的 setup **留在 host**，不由每个 session 的 preset remount。

卸掉插件 fiber 会立刻从 **已驻留** child 撤掉 `report` 与 `tool:report`；之后再 `plugin` 一次 **不会**回写到已经 live 的 Activation，要等下一次 materialization。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:334] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:338]

## execute() 走读

1. **只装给 continuable child。** `SubagentRuntime.start(name, request)` 走 one-shot `provider.start`，descriptor `mode: 'one-shot'`，**不**调 `setupRegistry.apply`。[E: packages/subagent/subagent/src/index.ts:414] [E: packages/subagent/subagent/src/index.ts:420] continuable 路径是 `startContinuable` → `materializeTracked`：先 `applyChildComposition`，再 `return this.setupRegistry.apply(childCtx)`。[E: packages/subagent/subagent/src/index.ts:212] [E: packages/subagent/subagent/src/continuation.ts:1004] 没有 `prepareContinuable` 的 provider 在进 manager 前就被拒（`UNSUPPORTED_CAPABILITY`），因此 remote / 纯 one-shot backend 走不到这份 setup。[E: packages/subagent/subagent/src/index.ts:438]

2. **`installReportTool@packages/subagent/tool-subagent-report/src/index.ts`：** 先挂 `tool:report` section，再 `defineTool` + `childCtx.tools.register`。guidance 与工具都 scoped 到该 child；parent / 全局 assembly 不含 `tool:report`。[E: packages/subagent/tool-subagent-report/src/index.ts:54] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:418] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:422]

3. **模型调用进入 `ToolRuntime.execute`。** child 的 `tools.execute({ name: 'report', arguments: { output }, agent: child })` 走 pre-execute `allow`，无 `timeoutMs` wrapper。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:91] [E: packages/core/tools/src/index.ts:1342]

4. **`defineTool` 包装校验** `output` 为 string 且 required，然后进用户 `execute`。[E: packages/core/tools/src/schema.ts:586]

5. **body：** `content = [{ type: 'text', text: args.output }]`，再 `await ctx.subagents.reportFrom(exec.agent as Agent, content, { delivery, signal: exec.signal })`，返回 `{ messageId }`。[E: packages/subagent/tool-subagent-report/src/index.ts:95] [E: packages/subagent/tool-subagent-report/src/index.ts:98] [E: packages/subagent/tool-subagent-report/src/index.ts:102] 这里的 `ctx` 是 **host / 服务 context**（`apply` 闭包），不是 `childCtx`；`exec.agent` 必须是那个 live child。

6. **`SubagentRuntime.reportFrom` 转给 continuation manager。**[E: packages/subagent/subagent/src/index.ts:275]

7. **`SubagentContinuationManager.reportFrom@packages/subagent/subagent/src/continuation.ts`：** `signal.throwIfAborted()` → `assertAdmitting(child)` → `authorizeReporter(child)` → `resolveReportParent(child)` → `deliverReport(...)`。[E: packages/subagent/subagent/src/continuation.ts:588] [E: packages/subagent/subagent/src/continuation.ts:589] [E: packages/subagent/subagent/src/continuation.ts:590] [E: packages/subagent/subagent/src/continuation.ts:591] [E: packages/subagent/subagent/src/continuation.ts:592]

8. **授权。** `activations.get(child.id)` 必须存在且 `handle.agent === child`（对象身份，不是同 id 的伪造副本）；否则 `SubagentError` `UNAUTHORIZED`（文案 `is not a live continuable subagent and cannot report`）。正在 dispose 则 `ACTIVATION_CLOSING`。[E: packages/subagent/subagent/src/continuation.ts:597] [E: packages/subagent/subagent/src/continuation.ts:598] [E: packages/subagent/subagent/src/continuation.ts:601] 根 agent 调 `reportFrom` 同样 `UNAUTHORIZED`。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:297] 同 id 浅拷贝伪造 sender 也被拒。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:308]

9. **parent。** `parentId = child.session.header.parentSession`，再 `ctx.agents.get(parentId)`；没有 live parent 则 `PARENT_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:617] [E: packages/subagent/subagent/src/continuation.ts:623] parent `inject` 抛错会被翻译成同一个 `PARENT_UNAVAILABLE`。[E: packages/subagent/subagent/src/continuation.ts:687] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:288]

10. **drain。** manager 或该 lineage 已关闭 admission 时 `assertAdmitting` 抛 `DRAINING`。[E: packages/subagent/subagent/src/continuation.ts:853] [E: packages/subagent/subagent/src/continuation.ts:857] 测试在 `drainContinuableDescendants` 期间 `reportFrom` 得到该 code。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:322]

11. **成帧与调度。** `createUserMessage`：首块 `Background subagent ${activation.childId} reported:`，随后展开 child 的 content；`source = { kind: 'subagent-report', form: 'relay', senderSessionId: activation.childId }`。[E: packages/subagent/subagent/src/continuation.ts:636] [E: packages/subagent/subagent/src/continuation.ts:641] `delivery === 'wakeup'` 走 `sendWaking` → `parent.followup(message)`（`ReactLoopAgent.followup` = `send(..., 'next-turn', true)`，单独开一个后续 parent turn 并 wake）；否则 `parent.inject(message)`（`send(..., 'next-step', false)`，加上下文、不 wake）。[E: packages/subagent/subagent/src/continuation.ts:647] [E: packages/subagent/subagent/src/continuation.ts:684] [E: packages/subagent/subagent/src/continuation.ts:685] [E: packages/core/agent-loop/src/agent.ts:123] [E: packages/core/agent-loop/src/agent.ts:131] 函数返回 `message.id`。[E: packages/subagent/subagent/src/continuation.ts:652]

12. **观测。** 默认 `Config({})`（即 `'wakeup'`）把消息放进 parent `nextTurn`（测试记为 `'queued'`）并让 parent 发出下一次 LLM 请求。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:528] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:529] `'quiet'` 记为 `'steering'`（实际是 `inject` 进 `next-step`），parent 保持 `idle`，不再多打请求。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:202] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:203] 多次 report 按接受顺序保留；child settle 之后已接受的 report 仍在。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:231] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:243] 嵌套只向上走 **一条边**：grandchild 的 report 到 child，不到 root。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:254] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:257]

13. **关闭中的 parent。** host 已开始 `dispose` 但 parent 仍在 registry 时，报告仍被接受；dispose 完成后再报则失败。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:503] [E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:505]

14. **post-execute。** 默认 `accept`。成功渲染见本页「输出 & 截断 / spill」的 `output.render` 句。`SubagentError` 经 `dispatchToolBody` 的 `toolErrorResult` 变成 child 侧 `isError` 工具结果。[E: packages/core/tools/src/index.ts:1555]

## 设计动机·edge

- **返回通道是 child 义务，不是 parent catalog 条目。** 根模型、one-shot `start()`、agentless `tools.execute`、以及进不了 `startContinuable` 的 remote provider 都看不到 `report`。父模型用 [`send_message`](subagent-control.md) 往下说话；子模型用本工具往上交结果。
- **不要在 shipped preset 再挂一行。** setup 列表挂在 host 单例 `ctx.subagents` 上，不是 agent-plane isolate 域。host `dsh-base` 已经 `apply()`；preset 再装等于每个 child 装两次 `report`，第二次抛 already-registered。
- **`reportDelivery` 是部署政策。** `'wakeup'` 默认，是因为已经 parked 的 parent 没有别的理由再看 inbox；测试用 `config: {}` 钉死会 enqueue + 发起 parent 请求。`'quiet'` 只 `inject`，适合不想为每条进度打断 parent 的组合。
- **不结束 turn。** 描述、prompt section、`reportFrom` 合同都把 reporting 和 finish 拆开。child 可以先报再继续干活；也可以报多次，顺序保留。
- **没有隐式最终答案。** child 自然说完并 settle，不会把最后一条 assistant 文本变成 `subagent-report`。服务另有 `subagent-settled` 结算通知，与本工具无关。
- **对象身份是凭证。** 同 `SessionId` 的浅拷贝 Agent 过不了 `handle.agent !== child`。调用方不能填 recipient。
- **`allow: []` 挡不住本工具。** restriction 只作用于继承面；`report` 是 child 自己层登记的返回通道。
- **fork 是否看见 `report` 取决于它是不是 continuable。** `start()` one-shot（host `dsh-base` 的 fork 行是 `backgroundMode: one-shot`）不跑 setup。shipped preset 把 `subagent_fork` remount 成 `backgroundMode: continuable` 时，fork child 只要走 `startContinuable`，就会装上同一份 `report`。[E: packages/bundle/base/cordis.patch.yml:329] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198]
- **Code Mode 子代理。** `code` preset 下 child 继承 `presentAs('code')`，模型直调 `report` 会被 collapse；要在 `run_code` 里调。native preset 的 child 则直接看见 `report`。
- **取消窗口。** 已 abort 的 `exec.signal` 在 `reportFrom` 入口就扔；测试对已 abort 的 `tools.execute` 得到 `isError`。[E: packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts:312]

## Sources

- packages/subagent/tool-subagent-report/src/index.ts
- packages/subagent/tool-subagent-report/package.json
- packages/subagent/tool-subagent-report/tests/tool-subagent-report.spec.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/activation-setup-registry.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent-loop/src/agent.ts
- packages/preset/agent-presets/src/index.ts
- packages/core/agent-tool-presentation/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、timeout wrapper、Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录；`report` 只出现在 continuable child scope。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：父模型调 `subagent` 后，同一 `ToolDefinition.execute` 如何再拉起子 session。
- [subagent](subagent.md)（`surface.tools.subagent`）：shipped `toolName: subagent` + `provider: spawn` + `backgroundMode: continuable`。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：`provider: fork`；是否 continuable 决定会不会装上本页的 `report`。
- [send_message / interrupt_agent / list_agents](subagent-control.md)（`surface.tools.subagent-control`）：parent → child 控制面，与本页方向相反。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition、`reportFrom` / `registerContinuableSetup` 的子系统合同。
