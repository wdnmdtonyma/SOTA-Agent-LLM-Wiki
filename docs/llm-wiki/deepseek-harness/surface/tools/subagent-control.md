---
id: surface.tools.subagent-control
title: send_message / interrupt_agent / list_agents
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/subagent/tool-subagent-control/src/index.ts
  - packages/subagent/tool-subagent-control/src/list-agents.ts
  - packages/subagent/tool-subagent-control/src/invariant.ts
  - packages/subagent/tool-subagent-control/package.json
  - packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts
  - packages/subagent/tool-subagent-control/tests/list-agents.spec.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/continuation.ts
  - packages/subagent/subagent/src/list-children.ts
  - packages/subagent/subagent/src/error.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/session/src/types.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - send_message
  - interrupt_agent
  - list_agents
  - apply
  - inject
  - name
  - resolveListAgentsRequest
  - project
  - statusOf
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.subagent
  - surface.tools.subagent-fork
  - surface.tools.report
  - spine.trace-subagent
  - subsys.orchestration.subagent
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名 `send_message` / `interrupt_agent` / `list_agents`；实现包 `@deepseek-ai/dsh-tool-subagent-control`。前两个由插件 `tool-subagent-control` 注册，第三个由**另一入口** `@deepseek-ai/dsh-tool-subagent-control/list-agents`（插件名 `tool-subagent-list-agents`）单独注册。三者都是 `ctx.subagents` 上 continuable 子代理的薄 adapter：投递下一轮、打断当前轮、列出可续跑孩子。

## 能回答的问题

- `send_message`、`interrupt_agent`、`list_agents` 分别是哪个 Cordis 插件、哪个 package export 装上的？
- 默认 Config 下三个 wire 名各有哪些参数？`list_agents` 省略 `scope` 时列出谁、会不会露出 one-shot 孩子？
- `send_message` 回的是子代理答案还是投递回执？失败是不是「没送到」？
- `ctx.subagents.followup` / `interrupt` / `listChildren` 各自要求什么 authority？换掉 spawn/fork provider 会不会改这三个工具？
- `minimal` / `standard` / `code` / `cordis` 谁装这两行？`delegation` group 的 isolate 挡的是 `subagents` 还是 `workflowEngine`？
- 无 `exec.agent`、非直接父、深祖先、已 settle 的 id，三个工具各自怎样失败或 no-op？

## Identity

家族页三个 **model-visible** `name` 必须全部入表。它们同属 `@deepseek-ai/dsh-tool-subagent-control`，但 **不是** 同一个 `apply()`。[E: packages/subagent/tool-subagent-control/package.json:2]

| wire `name` | 插件 `export const name` | 装入口 | `inject` | 工厂 |
|---|---|---|---|---|
| `send_message` | `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control`（`exports["."]`） | `['tools', 'subagents']` | `apply(ctx)` 里第一次 `ctx.tools.register(defineTool({ name: 'send_message', ... }))` [E: packages/subagent/tool-subagent-control/src/index.ts:18] [E: packages/subagent/tool-subagent-control/src/index.ts:19] [E: packages/subagent/tool-subagent-control/src/index.ts:26] [E: packages/subagent/tool-subagent-control/src/index.ts:27] |
| `interrupt_agent` | `tool-subagent-control`（与 `send_message` 同一个 `apply()` 的第二次 `register`） | `@deepseek-ai/dsh-tool-subagent-control`（`exports["."]`） | `['tools', 'subagents']` | `defineTool({ name: 'interrupt_agent', ... })` [E: packages/subagent/tool-subagent-control/src/index.ts:79] [E: packages/subagent/tool-subagent-control/src/index.ts:80] |
| `list_agents` | `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents`（`exports["./list-agents"]`） | `['tools', 'subagents', 'agents']` | 独立 `apply(ctx)` → `defineTool({ name: 'list_agents', ... })` [E: packages/subagent/tool-subagent-control/src/list-agents.ts:17] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:18] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:91] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:93] [E: packages/subagent/tool-subagent-control/package.json:25] |

两个 `apply` **都没有** `Config` 参数：签名是 `apply(ctx: Context): void`，boot 时没有改名 / 改参旋钮。[E: packages/subagent/tool-subagent-control/src/index.ts:25] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:91]

`inject` 缺 `ctx.tools` 或 `ctx.subagents` 时插件挂起，catalog 里不会出现对应名字。`list_agents` 额外要求 `ctx.agents`，因为投影状态要读 live `Agent` 表。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:222] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:260]

测试钉死命名空间插件形态：无 `default` export；`tool.name` / `tool.inject` / `typeof tool.apply` 就是 Cordis 插件合同。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:220] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:259]

`ctx.tools.register` 走 layer `effect`，fiber `dispose()` 会卸掉这两个（或一个）名字——测试分别卸 `send_message`+`interrupt_agent` 与单独卸 `list_agents`。[E: packages/core/tools/src/index.ts:1057] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:214] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:254]

同包还有 invariant companion `@deepseek-ai/dsh-tool-subagent-control/invariant`（插件名 `tool-subagent-control-invariant`）：`install` 是空函数，声明「没有独立 lifecycle stream」。[E: packages/subagent/tool-subagent-control/src/invariant.ts:13] [E: packages/subagent/tool-subagent-control/src/invariant.ts:21]

这三个名字**不是** [subagent.md](subagent.md) / [subagent-fork.md](subagent-fork.md) 那两个 `dsh-tool-subagent` 实例。spawn/fork 负责拉起孩子；本页只做后续控制，好让多个 delegation 工具共用一套 control API。

## 用途定位

| 工具 | 模型该用它做什么 | 明确不做什么 |
|---|---|---|
| `send_message` | 按 durable `subagent_id` 给 **continuable** 后台子代理塞一条 **下一轮** user 消息 | 不返回子代理答案；不能改写正在跑的那一轮；不是 `job_output` / job id 通道 [E: packages/subagent/tool-subagent-control/src/index.ts:31] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:110] |
| `interrupt_agent` | 按 `agent_id` 请求取消目标 **当前轮**；目标可以是直接孩子或更深后代 | 不拆 Activation、不丢已入队但未 claim 的 inbox、不连带停掉目标自己拉起的后代；已结束的 id 是 accepted no-op [E: packages/subagent/tool-subagent-control/src/index.ts:82] [E: packages/subagent/tool-subagent-control/src/index.ts:86] |
| `list_agents` | 按 durable id + label 回忆「我还开着哪些可续跑后台子代理」 | 不是 completion 轮询（结束会另有 notice）；快照不是 `send_message` 投递承诺 [E: packages/subagent/tool-subagent-control/src/list-agents.ts:95] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:101] |

`send_message` 的描述写明：子代理若仍在工作，消息等到当前轮结束才成为下一 turn；调用只确认 **delivered**，失败等于 **NOT delivered**。[E: packages/subagent/tool-subagent-control/src/index.ts:32] [E: packages/subagent/tool-subagent-control/src/index.ts:33]

`list_agents` 的描述写明：`scope: descendants` 用稳定 pre-order 走完整子树，并标 durable 直接父 id 与 depth；模型只许对 **depth-1** 调 `send_message`，更深条目只做 `interrupt_agent` 候选。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:103] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:105]

孩子的创建走 [subagent.md](subagent.md)（`toolName: subagent` + `provider: spawn`）或 [subagent-fork.md](subagent-fork.md)（`toolName: subagent_fork` + `provider: fork`）。孩子主动回父会话是 [report.md](report.md) 的 `report`，不在本页 catalog。

## 输入 schema

两个插件都没有 `Config`，下表就是默认 boot 后 `ctx.tools.schemas()` 的形状。`defineTool` 先按 ParameterSchemaSpec 校验；`required: true` 编进 JSON Schema `required` 数组。[E: packages/core/tools/src/schema.ts:449] [E: packages/core/tools/src/schema.ts:586]

### `send_message`

测试：全局只注册一次；properties 排序后恰好 `['message', 'subagent_id']`；描述含 `next turn`，不含 `job_output` / `job id`。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:105] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:108] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:113]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `subagent_id` | `string` | 是 | 无 | schema 必填 | 后台子代理启动时返回的 durable id。execute 里 `SessionId(...)` 只做 brand，无运行时格式检查。[E: packages/subagent/tool-subagent-control/src/index.ts:35] [E: packages/subagent/tool-subagent-control/src/index.ts:37] [E: packages/core/session/src/types.ts:29] |
| `message` | `string` | 是 | 无 | schema 必填 | 投给子代理的纯文本；body 包成单块 `{ type: 'text', text }`。[E: packages/subagent/tool-subagent-control/src/index.ts:40] [E: packages/subagent/tool-subagent-control/src/index.ts:65] |

没有 `run_in_background`、没有 timeout 字段、没有 Config 改广告。

### `interrupt_agent`

测试：properties 恰好 `['agent_id']`；描述含 `current turn` 与 `send_message`。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:233] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:234]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `agent_id` | `string` | 是 | 无 | schema 必填 | 要打断的 agent / 子代理 session id。同样 `SessionId(...)` brand。[E: packages/subagent/tool-subagent-control/src/index.ts:89] [E: packages/subagent/tool-subagent-control/src/index.ts:91] [E: packages/subagent/tool-subagent-control/src/index.ts:116] |

### `list_agents`

测试：唯一可选参数 `scope`；`enum` 为 `['children', 'descendants']`；`required` 为空数组。[E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:112] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:113] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:114]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `scope` | `string` | 否 | 省略 → `'children'`（`resolveListAgentsRequest`） | `enum`: `children` \| `descendants` | `children` 只列直接孩子；`descendants` 走完整子树。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:49] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:107] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:109] |

**投影门（不是 schema 字段）：** `project()` 在 `entry.mode !== 'continuable'` 时返回 `undefined`，one-shot 孩子不会出现在模型结果里；diagnostic 行照样保留。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:77] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:73]

## 输出 & 截断 / spill

三个工具都 **没有** spill、没有 `maxOutputBytes`、没有 `presentCall` / `presentResult`。成功路径：`defineTool` 的 `output.render` 把结构化 `value` 收成一段 text，registry `createSuccessResult` 再冻成 `content`。[E: packages/core/tools/src/index.ts:1793] [E: packages/core/tools/src/index.ts:1800]

| 工具 | `output.schema` | 成功 `value` | 模型看到的 render |
|---|---|---|---|
| `send_message` | 对象，`additionalProperties: false`，必填 `messageId: string` | `{ messageId }`（inbox 接受后的 id） | `message queued as the next turn for subagent ${subagent_id}` [E: packages/subagent/tool-subagent-control/src/index.ts:51] [E: packages/subagent/tool-subagent-control/src/index.ts:56] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:132] |
| `interrupt_agent` | 对象，必填 `accepted: boolean` | 未抛则 **恒** `{ accepted: true }` | `interrupt requested for agent ${agent_id}` [E: packages/subagent/tool-subagent-control/src/index.ts:100] [E: packages/subagent/tool-subagent-control/src/index.ts:105] [E: packages/subagent/tool-subagent-control/src/index.ts:117] |
| `list_agents` | `array`，item 为 `child` 或 `diagnostic` 的 `oneOf` | 过滤 one-shot 后的投影数组 | 空数组 → `(no subagents)`；否则一行一个条目 [E: packages/subagent/tool-subagent-control/src/list-agents.ts:115] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:149] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:124] |

`list_agents` 的 `child` 行：`kind: 'child'`、`id`、`label`、`status` ∈ `{running, idle, ready}`，以及仅 descendants 才有意义的可选 `parent` / `depth`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:122] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:125] `diagnostic` 行：`reason` ∈ `{corrupt, unsupported, unavailable}`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:136]

render 文本：

- `children`：`{id} [{status}] — {label}` 或 `{id} [diagnostic: {reason}]`，**不**印 parent/depth。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:154] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:158]
- `descendants`：在 status 后追加 ` parent={parent} depth={depth}`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:155]

抛错（无 calling agent、UNAUTHORIZED、NOT_RESUMABLE 等）被 registry 收成 `isError: true`，正文 `Error: ${message}`。[E: packages/core/tools/src/index.ts:1874] [E: packages/core/tools/src/index.ts:1875] 测试：未知 id 的 `send_message` 是 errored 且文本含 `unavailable`；缺 `exec.agent` 的三个工具都含 `requires a calling agent`。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:176] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:203] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:243]

## 背后的 seam

| 角色 | 实体 | 本家族怎么用 |
|---|---|---|
| Definition | `ctx.subagents` / `SubagentRuntime`（`super(ctx, 'subagents')`） | `followup` / `interrupt` / `listChildren` / `listDescendants`。[E: packages/subagent/subagent/src/index.ts:184] [E: packages/subagent/subagent/src/index.ts:231] [E: packages/subagent/subagent/src/index.ts:255] [E: packages/subagent/subagent/src/index.ts:339] |
| Provider（续跑运行时） | `SubagentContinuationManager`，仅当 `ctx.inject(['agents'])` 绑上 | `followup` 经 `requireContinuations()`；缺 `agents` 抛 `CONTINUATION_UNAVAILABLE`。`interrupt` 用可选链：没有 manager 就静默 return。[E: packages/subagent/subagent/src/index.ts:186] [E: packages/subagent/subagent/src/index.ts:458] [E: packages/subagent/subagent/src/index.ts:256] |
| Provider（发现） | `list-children.ts` 的 live-preferred corpus | `SubagentRuntime.listChildren` 只转给 `listSubagentChildren(this.ctx, ...)`，实现读 session corpus，不经过 continuation manager。[E: packages/subagent/subagent/src/list-children.ts:134] [E: packages/subagent/subagent/src/index.ts:340] |
| Consumer | `@deepseek-ai/dsh-tool-subagent-control` 与 `/list-agents` | 工具自己不做 residency / 授权路由，只把 `exec.agent` 交给服务。[E: packages/subagent/tool-subagent-control/src/index.ts:66] [E: packages/subagent/tool-subagent-control/src/index.ts:116] |

换掉 `spawn` / `fork` **provider** 不会改这三个工具的 schema 或 authority：它们不按 provider 名分发。换掉或卸掉 `ctx.subagents` 会让两个插件因 `inject` 挂起。卸掉 `ctx.agents` 会：让 `list_agents` 挂起；让 `followup` 因 `requireContinuations()` 失败；让 `interrupt` 在无 manager 时变成 no-op。

`list_agents` 另外消费 `ctx.agents.get(id)`：没有 live `Agent` → `ready`；`agent.status === 'running'` → `running`；其余 live 状态 → `idle`。`AgentStatus` 本身只有 `'idle' | 'running'`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:61] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:62] [E: packages/core/agent/src/runtime-types.ts:50]

`send_message` 写入的 durable `source` 是 `{ kind: 'coordinator', form: 'relay', senderSessionId: parent.id }`——记录发送方，**不**授予 authority。真正的门在 `authorizeLineage`：调用者必须是 **exact live direct parent**。[E: packages/subagent/tool-subagent-control/src/index.ts:71] [E: packages/subagent/subagent/src/continuation.ts:1222] [E: packages/subagent/subagent/src/continuation.ts:1223]

`interrupt_agent` 交给服务的 authority 是 `{ kind: 'ancestor', agent: caller }`。服务核：caller 仍是 `ctx.agents` 里那一个对象、caller.id ≠ target、target 的 live `activation.ancestry` 含 caller。缺 Activation 直接 return（no-op，不 cold-resume）。[E: packages/subagent/subagent/src/continuation.ts:528] [E: packages/subagent/subagent/src/continuation.ts:533] [E: packages/subagent/subagent/src/continuation.ts:547] [E: packages/subagent/subagent/src/continuation.ts:555]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` → 可选 `serviceAsk` → 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] 本家族**不**自己挂 pre-execute / post-execute listener。

对本家族的挂点：

- **timeout：** 三个 `defineTool` 都 **没有** `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59]
- **approval：** 不 `ask`，不调 `ctx.approval`。
- **sandbox：** 不 confine、不读 `sandboxPolicy`。
- **checkpoint：** host `session-checkpoint-policy` 在 `tools/execute` 上：有 `exec.agent` 且无 `exec.parent` 时先 `ctx.sessions.flush`，再 `next()`。嵌套（Code Mode `parent`）跳过。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1278]
- **Code Mode：** `code` preset 仍装这两行，但 `mode: code` 时无 `parent` 的模型直调原生名在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]
- **信号：** `send_message` / `list_agents` 把 `exec.signal` 交给服务（lookup / persist / 扫描）。`interrupt_agent` 同步授权并 `cancel`，不传 tool signal。[E: packages/subagent/tool-subagent-control/src/index.ts:72] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:175] [E: packages/subagent/tool-subagent-control/src/index.ts:116]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。shipped 行 **没有** extra `config:`，**没有** `disabled:`。

| preset | `@deepseek-ai/dsh-tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | `disabled` | isolate |
|---|---|---|---|---|
| `minimal` | **否**。yml 只有 persona + persistent bash + `str_replace_editor` | **否** | — | 本包两行都未出现 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | 是。`id: tool-subagent-control` | 是。`id: tool-subagent-list-agents` | 无 | 在 `delegation` group；group 只 `isolate.workflowEngine: true`，**不** isolate `subagents`（工具解析 host 上的 registry）[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:180] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:184] |
| `code` | 是。`id: tool-subagent-control` | 是。`id: tool-subagent-list-agents` | 无 | 在 `delegation` group；只 `isolate.workflowEngine: true` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:175] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:179] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:181] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:185] |
| `cordis` | 是。`id: tool-subagent-control` | 是。`id: tool-subagent-list-agents` | 无 | 在 `delegation` group；只 `isolate.workflowEngine: true` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:162] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:166] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:168] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:172] |

组合旁注（**不是** preset 成员资格）：`dsh-base` 也 insert 了 host 行 `tool-subagent-control` 与 `tool-subagent-list-agents`。[E: packages/bundle/base/cordis.patch.yml:307] [E: packages/bundle/base/cordis.patch.yml:310] `dsh-web-app` overlay 把这两行 `disabled: true`，改由每个 session 的 preset 再挂。[E: packages/bundle/web-app/cordis.patch.yml:374] [E: packages/bundle/web-app/cordis.patch.yml:375] [E: packages/bundle/web-app/cordis.patch.yml:377] host 上的 `dsh-subagent` + spawn/fork **backends** 仍留在 process singleton；preset 只贡献 model-facing 工具。

## execute() 走读

公共前置：`defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，违规抛 `ToolArgsError`。[E: packages/core/tools/src/schema.ts:586] [E: packages/core/tools/src/schema.ts:587]

### `send_message`

1. `execute@packages/subagent/tool-subagent-control/src/index.ts`：取 `exec.agent`。没有 calling agent 就抛 `send_message requires a calling agent (exec.agent was undefined)`。[E: packages/subagent/tool-subagent-control/src/index.ts:60] [E: packages/subagent/tool-subagent-control/src/index.ts:63]
2. 把 `args.message` 收成 `ContentBlock[]` 单 text 块。[E: packages/subagent/tool-subagent-control/src/index.ts:65]
3. `ctx.subagents.followup(parent, SessionId(args.subagent_id), message, { source: { kind: 'coordinator', form: 'relay', senderSessionId: parent.id }, signal: exec.signal })`。[E: packages/subagent/tool-subagent-control/src/index.ts:66] [E: packages/subagent/tool-subagent-control/src/index.ts:68] [E: packages/subagent/tool-subagent-control/src/index.ts:71]
4. `SubagentRuntime.followup@packages/subagent/subagent/src/index.ts` 转给 `requireContinuations().followup(...)`。[E: packages/subagent/subagent/src/index.ts:237]
5. `SubagentContinuationManager.followup@packages/subagent/subagent/src/continuation.ts`：`assertAdmitting(parent)` 后按 childId 加锁。无 Activation → `coldResume`；有 disposal 中的 Activation → 等释放再重试；否则 `submitAdmitted`。[E: packages/subagent/subagent/src/continuation.ts:482] [E: packages/subagent/subagent/src/continuation.ts:486]
6. `coldResume`：`persistence.inspect` 失败 → `SubagentError(..., 'NOT_RESUMABLE')` 文案 `subagent "…" is unavailable`。折出的 descriptor 不是 `continuable` → 同样 `NOT_RESUMABLE`，并写「do not retry send_message with this id」。inspect 成功后先 `authorizeLineage`。[E: packages/subagent/subagent/src/continuation.ts:895] [E: packages/subagent/subagent/src/continuation.ts:906] [E: packages/subagent/subagent/src/continuation.ts:901]
7. `authorizeLineage`：`ctx.agents.get(parent.id) !== parent` → 要 exact live parent；`parentSession !== parent.id` → `belongs to another parent session`（`UNAUTHORIZED`）。祖先 / sibling / stranger 都过不了这扇门。[E: packages/subagent/subagent/src/continuation.ts:1216] [E: packages/subagent/subagent/src/continuation.ts:1223] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:196]
8. 入队是 **下一 FIFO turn**，不会并进正在跑的那一轮。测试：open turn 期间再 `send_message`，持久化 user 文本是 `['long work', 'also consider Y']` 两条。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:167]
9. 返回 `{ messageId }`。render **不**回传 messageId 文本，只说 queued。[E: packages/subagent/tool-subagent-control/src/index.ts:75]

### `interrupt_agent`

1. 取 `exec.agent`；缺失则抛 `interrupt_agent requires a calling agent (exec.agent was undefined)`。[E: packages/subagent/tool-subagent-control/src/index.ts:109] [E: packages/subagent/tool-subagent-control/src/index.ts:112]
2. `ctx.subagents.interrupt(SessionId(args.agent_id), { kind: 'ancestor', agent: caller })`。工具不加第二层授权。[E: packages/subagent/tool-subagent-control/src/index.ts:116]
3. `SubagentRuntime.interrupt` 是 `this.continuations?.interrupt(...)`：无 continuation manager 则什么都不做。[E: packages/subagent/subagent/src/index.ts:256]
4. `SubagentContinuationManager.interrupt@packages/subagent/subagent/src/continuation.ts`：ancestor 必须仍是 `ctx.agents` 里的同一对象；`caller.id === targetSessionId` → `cannot interrupt itself`。[E: packages/subagent/subagent/src/continuation.ts:533] [E: packages/subagent/subagent/src/continuation.ts:540]
5. `activations.get` 为 `undefined` → **直接 return**（已结束、未知 id、one-shot 一律 accepted no-op，且不 cold-resume）。测试：settled 孩子与 `'no-such-agent'` 都 `isError === false`，且 settled id 不会重新 `ctx.agents.get`。[E: packages/subagent/subagent/src/continuation.ts:547] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:376] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:381]
6. live 但不在 `activation.ancestry`（sibling / stranger）→ `not a live descendant`，且 `cancel` 不会被调用。[E: packages/subagent/subagent/src/continuation.ts:555] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:353] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:357]
7. 深祖先 **可以** 打断非直接创建的后代：测试里 root parent 对 grandchild 调 `interrupt_agent`，`cancel` 以 `{ kind: 'parent' }` + `{ keepInbox: true }` 打上。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:311] [E: packages/subagent/subagent/src/continuation.ts:564]
8. `keepInbox: true`：已 queued 的 `send_message` 停在 inbox，等下一次 waking `send_message` 才跑。测试：打断后 `adapter.requests` 仍为 1，`inbox.nextTurn` 长度为 1。[E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:265] [E: packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts:269]
9. 工具立刻 `Promise.resolve({ accepted: true })`，不等目标观察到 signal。[E: packages/subagent/tool-subagent-control/src/index.ts:117]

### `list_agents`

1. 取 `exec.agent`；缺失则抛 `list_agents requires a calling agent (exec.agent was undefined)`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:165] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:168]
2. `resolveListAgentsRequest`：`scope` 缺省 `'children'`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:49]
3. `children`：`ctx.subagents.listChildren(parent.id, exec.signal)`，再 `project(ctx.agents, entry)`（不带 position）。测试钉死转发的就是 tool 的 `signal`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:175] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:200]
4. `descendants`：`listDescendants(parent.id, exec.signal)`，`project(ctx.agents, entry, entry)` 把 `parentId` / `depth` 抄到模型字段。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:181] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:183]
5. `project@packages/subagent/tool-subagent-control/src/list-agents.ts`：diagnostic 原样保留；`mode !== 'continuable'` 丢掉；continuable 填 `statusOf`。[E: packages/subagent/tool-subagent-control/src/list-agents.ts:72] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:77] [E: packages/subagent/tool-subagent-control/src/list-agents.ts:82]
6. 真实 one-shot sibling 不会出现在结果里；settled continuable 以 `[ready]` 列出。[E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:222]
7. descendants 集成：idle 的 depth-1 分支 + running 的 depth-2 叶子，render 带 `parent=` / `depth=`。[E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:296]
8. 服务侧 `listDescendants` 仍把 one-shot / 普通 session 当遍历节点，所以 one-shot 中间层下面的 continuable 叶子还能被发现；工具只滤掉 one-shot **行**。[E: packages/subagent/subagent/src/list-children.ts:161] [E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:341]

## 设计动机·edge

- **控制面与创建面拆包。** `@deepseek-ai/dsh-tool-subagent` 按 `toolName`/`provider` 可以装多次（`subagent`、`subagent_fork`、以及 shipped 里 `disabled: true` 的 `subagent_codex` / `subagent_claude_code`）。control 三件套全局各一个名字，避免每个 provider 再发明一套 follow-up API。
- **`list_agents` 可单独不装。** 模块注释写明：部署可以只挂 `send_message` 做 continuation delivery，不把发现面暴露给模型。shipped `standard` / `code` / `cordis` 两行都装。
- **发现默认只投影 continuable。** one-shot 不能被 `send_message` 续跑，所以不会出现在列表里；descendants 遍历仍会穿过它们，以免漏掉更深处的 continuable。
- **`ready` ≠ 终态结果。** 没有 live `Agent` 只表示当前不驻留、仍可 `send_message` 冷启动。描述禁止模型把 listing 当成「去收结果」。完成靠 settlement notice，不是靠轮询本工具。[E: packages/subagent/tool-subagent-control/tests/list-agents.spec.ts:230]
- **`send_message` 只认直接父。** `authorizeLineage` 比 `list_agents` 的 descendants 视图更严：depth-2 的 id 能列出来、能 `interrupt_agent`，但不能 follow-up。
- **打断保留 inbox。** `cancel(..., { keepInbox: true })` 停的是当前轮，不是整段对话。已经 queued 的 follow-up 要再发一条 waking `send_message` 才会跑。
- **缺席目标对 interrupt 是成功。** 与 `send_message` 相反：后者对坏 id / 非 continuable 是 `isError`。interrupt 把完成竞态、重复请求、one-shot、未知 id 收成同一种 accepted no-op，避免模型为「已经停了」再重试出错误。
- **不是 jobs。** continuable 路径没有 Task；`send_message` schema 刻意不提 `job_output`。读输出、杀进程是 [jobs.md](jobs.md) 的 `job_*`，对象是 bash/pwsh 后台 job，不是子代理会话。
- **调用必须有 owning agent。** 三个 execute 都硬门 `exec.agent`。agentless / 纯 host 调用会失败，不会悄悄用某个默认 session。

## Sources

- packages/subagent/tool-subagent-control/src/index.ts
- packages/subagent/tool-subagent-control/src/list-agents.ts
- packages/subagent/tool-subagent-control/src/invariant.ts
- packages/subagent/tool-subagent-control/package.json
- packages/subagent/tool-subagent-control/tests/tool-subagent-control.spec.ts
- packages/subagent/tool-subagent-control/tests/list-agents.spec.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/continuation.ts
- packages/subagent/subagent/src/list-children.ts
- packages/subagent/subagent/src/error.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/session/src/types.ts
- packages/core/agent/src/runtime-types.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、timeout wrapper、Code Mode collapse、exclusive 调度。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [subagent](subagent.md)（`surface.tools.subagent`）：shipped `toolName: subagent` + `provider: spawn` + `backgroundMode: continuable`，产出本页 `subagent_id` 的创建面。
- [subagent_fork](subagent-fork.md)（`surface.tools.subagent-fork`）：同一 `dsh-tool-subagent` 包的 `provider: fork` 实例；控制面仍是本页三件套。
- [report](report.md)（`surface.tools.report`）：continuable 孩子 `childCtx.tools` 上的回父工具，不是父 catalog 的第四个 control 名。
- [trace: 拉起子代理](../../spine/trace-subagent.md)（`spine.trace-subagent`）：从 `subagent` / `subagent_fork` 工具进 `ctx.subagents` 的端到端走读。
- [subagent 缝](../../subsystems/orchestration/subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition / continuation manager / listing，不是本页的模型 schema。
