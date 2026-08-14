---
id: surface.tools.todo-write
title: todo_write
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/todo/tool-todo/src/index.ts
  - packages/todo/tool-todo/src/types.ts
  - packages/todo/tool-todo/src/invariant.ts
  - packages/todo/tool-todo/package.json
  - packages/todo/tool-todo/tests/tool-todo.spec.ts
  - packages/todo/tool-todo/tests/projection.spec.ts
  - packages/todo/tool-todo/tests/loader-composition.spec.ts
  - packages/todo/tool-todo/tests/invariant.spec.ts
  - packages/todo/tool-todo/tests/integration.spec.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/known-event-types.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/invariant.ts
  - packages/core/session/tests/session.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-projection/src/index.ts
  - packages/plan/plan-mode/tests/plan-mode.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - todo_write
  - apply
  - Config
  - STATUSES
  - name
  - inject
  - toTodoList
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - spine.session-log
  - surface.tools.exit-plan-mode
  - ref.session-events
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名 `todo_write`；实现包 `@deepseek-ai/dsh-tool-todo`（Cordis 插件名 `tool-todo`）。每次调用提交**整表** `todos[]`，append 一条 `todo/write` 快照到调用 agent 的 session；不是增量 patch，也没有 per-item 编辑。

## 能回答的问题

- 模型目录里的 `todo_write` 是哪个包、哪个 Cordis 插件名、`inject` 要什么？
- 一次调用是整表替换还是增量 patch？`todos[].content` / `status` 有哪些约束？
- `Config.allowParallelInProgress` 改的是 schema 字段，还是 description + execute 门？
- 列表存在哪？`todo/write` 会不会进 `deriveMessages()`？`todos` projection 何时变成 `null`？
- `minimal` / `standard` / `code` / `cordis` 谁装本包？plan-mode 会不会从 catalog 摘掉它？
- 没有 owning agent 时 execute 会怎样？拒绝的调用会不会落到 durable log？

## Identity

| 面 | 值 |
|---|---|
| wire `name` | `todo_write` [E: packages/todo/tool-todo/src/index.ts:150] |
| 实现包 | `@deepseek-ai/dsh-tool-todo` [E: packages/todo/tool-todo/package.json:2] |
| Cordis 插件名 | `tool-todo` [E: packages/todo/tool-todo/src/index.ts:22] |
| `inject` | `['tools']` [E: packages/todo/tool-todo/src/index.ts:23] |
| 工厂 | `apply(ctx, config: Config)` [E: packages/todo/tool-todo/src/index.ts:128] |
| 注册 | `ctx.tools.register(defineTool({ name: 'todo_write', ... }))` [E: packages/todo/tool-todo/src/index.ts:149] |

本页只有这一条 model-visible 名。没有 `todo_read` / `todo_edit` / `todo_complete`。

Loader 认 namespace 导出：`name` / `inject` / `apply`，**没有** `default`（`default` 会让 Loader 丢掉 `inject`）。[E: packages/todo/tool-todo/tests/tool-todo.spec.ts:224] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:226]

`Config` 只有一个必填布尔：`allowParallelInProgress`。schemastery 写成 `z.boolean().required()`，**没有默认值**；yml 省略或写成非布尔会在 load 时失败，boot 到不了 running tool。[E: packages/todo/tool-todo/src/index.ts:42] [E: packages/todo/tool-todo/tests/loader-composition.spec.ts:132]

模块内 `STATUSES` 是 `['pending', 'in_progress', 'completed']`，同时喂给参数 / 输出 schema 的 `enum`。[E: packages/todo/tool-todo/src/index.ts:26] [E: packages/todo/tool-todo/src/index.ts:165]

`apply` 还在可选缝 `ctx.sessionProjections` 上登记 unit `todos`（`inject: ['tools']` 本身不要求这条缝；没有 projection registry 的 headless 组装仍能注册工具）。[E: packages/todo/tool-todo/src/index.ts:135] [E: packages/todo/tool-todo/src/index.ts:137]

## 用途定位

本工具让模型维护**当前工作的结构化任务表**。描述要求：每次发送 **ENTIRE** list，调用 **REPLACES** 上一份；没有 partial update、没有按条目编辑。[E: packages/todo/tool-todo/src/index.ts:46] [E: packages/todo/tool-todo/src/index.ts:47] schema 里 `todos` 的说明同样是 “The COMPLETE task list, replacing any previous list.” [E: packages/todo/tool-todo/src/index.ts:156]

列表是 **per-agent-session** 状态：execute 写到 `exec.agent.session`，不是独立 `ctx.todos` 服务。没有 owning agent 就无处落盘，插件选择 throw 而不是静默 no-op。[E: packages/todo/tool-todo/src/index.ts:211]

它**不是** plan-mode 的规划文档通道。`standard` / `code` / `cordis` 的 `plan-mode.section` 明文写：不要用 `todo_write` 跟踪规划阶段；规划正文走 `exit_plan_mode`，本工具跟的是批准之后的实现进度。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:118] 这是 prompt 政策，不是 schema / execute 门——plan mode 下 `todo_write` 仍留在 catalog。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:428]

## 输入 schema

以插件 **`Config.allowParallelInProgress: true`**（四个 shipped 里装了本包的三份 yml 都这么写）boot 后的 `ctx.tools.schemas()` 为准。properties **只有** `todos`。[E: packages/todo/tool-todo/tests/tool-todo.spec.ts:59] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:243]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `todos` | `array` | 是 | 无 | 元素是 object | 整表替换载荷。[E: packages/todo/tool-todo/src/index.ts:153] |
| `todos[].content` | `string` | 是 | 无 | schema 只要求 string；execute 再 `trim`，空串 / 纯空白拒绝；trim 后的 content 在本表内唯一 | 「短祈使句」任务行。没有 id / priority / `activeForm`。[E: packages/todo/tool-todo/src/index.ts:161] [E: packages/todo/tool-todo/src/index.ts:96] |
| `todos[].status` | `string` | 是 | 无 | `enum`: `pending` \| `in_progress` \| `completed` | 三态生命周期。非法值（如 `doing`）在 registry 参数校验阶段失败，进不了 `execute`。[E: packages/todo/tool-todo/src/index.ts:162] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:64] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:116] |

条目 object 设 `additionalProperties: false`。多出来的键（测试用 `children: []`）在 schema 边界失败，文案含 `not a declared property`；这样 logged snapshot 与模型自认为写下的形状一致，不会被静默拍扁。[E: packages/todo/tool-todo/src/index.ts:159] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:190]

`todos` 没有 `minItems`。`toTodoList` 对空数组直接返回 `[]`，再走 append。这是 schema 允许的形状，不是单独的产品开关。

**Config 不改广告字段。** `allowParallelInProgress` 只改两处：

1. `description`：`true` 要求「several at once when work genuinely runs in parallel」；`false` 要求「Keep AT MOST ONE todo `in_progress`」。[E: packages/todo/tool-todo/src/index.ts:76] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:178]
2. `toTodoList`：`false` 且 `in_progress` 计数 `> 1` 时 throw `at most one task may be in_progress`；`true` 接受同一份并行表。[E: packages/todo/tool-todo/src/index.ts:107] [E: packages/todo/tool-todo/tests/loader-composition.spec.ts:110]

`status` 的 enum **不会**随 Config 缩小。单活约束是 execute 值约束，不是 schema `enum`。

`defineTool` 先把 ParameterSchemaSpec 编成 JSON Schema，再在包装 `execute` 里 `validateJsonSchemaValue`；通过后才进用户 body。[E: packages/core/tools/src/schema.ts:586]

## 输出 & 截断 / spill

`output.schema` 是一个 `additionalProperties: false` 的 object，两块都 required：

| 字段 | 含义 |
|---|---|
| `todos` | 规范化后的整表：`content` 已 trim，`status` 仍是三态 enum。[E: packages/todo/tool-todo/src/index.ts:177] |
| `counts.pending` / `counts.inProgress` / `counts.completed` | 按规范化表现算的整数。[E: packages/todo/tool-todo/src/index.ts:189] |

`output.render` 把模型可见文本收成一句：`Updated todo list: ${pending} pending, ${inProgress} in progress, ${completed} completed.` [E: packages/todo/tool-todo/src/index.ts:203] 单元测试钉死成功路径 `isError === false`，渲染含 `1 pending, 1 in progress, 0 completed`。[E: packages/todo/tool-todo/tests/tool-todo.spec.ts:75]

没有字节预算、没有 spill 文件、没有截断标记。返回值就是整表 + 三个计数；registry 成功路径会再按 `output.schema` 校验一遍。[E: packages/core/tools/src/index.ts:1795]

`presentCall` 只服务 UI：`{ card: 'generic', title: 'Update todo list', kind: 'other', rawInput: args.todos }`。`rawInput` 是模型原始数组，不是 trim 后的 snapshot。[E: packages/todo/tool-todo/src/index.ts:224] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:209] 没有 `presentResult`。

## 背后的 seam

本工具**不**声明 `ctx.todos` 一类独立 Definition。权威状态是 calling agent 的 `Session` 事件日志。

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition（工具注册表） | `ctx.tools` / `ToolRuntime` | `inject = ['tools']`；`register(defineTool(...))`。[E: packages/todo/tool-todo/src/index.ts:23] |
| Consumer | `@deepseek-ai/dsh-tool-todo` | `toTodoList` 之后 `exec.agent.session.append('todo/write', { todos })`。[E: packages/todo/tool-todo/src/index.ts:213] |
| Provider（日志） | `Session.append` | 快照 JSON、freeze、push；`todo/write` 不是 surface-eligible，不能带 `surfaceOp`。[E: packages/core/session/src/index.ts:604] [E: packages/core/session/src/types.ts:299] |
| Provider（可选投影） | `ctx.sessionProjections` | 有缝才登记 `todos` unit。unit `apply` 折叠：`todo/write` → `event.data.todos`（整表）；`turn/start` → `null`；其它事件 `return state`（同一引用）。[E: packages/todo/tool-todo/src/index.ts:141] [E: packages/todo/tool-todo/src/index.ts:142] [E: packages/todo/tool-todo/src/index.ts:143] `ProjectionDefinition.apply` 只是通用 `(state, event) => S` 签名，不编码这三分支。[E: packages/session/session-projection/src/index.ts:60] `drive` 用 `Object.is(next, cell.state)` 判断有无变更。[E: packages/session/session-projection/src/index.ts:415] |

换掉 session / projection 实现会带走：事件能否 append、`todo/write` 是否仍是 known type、history tail 上有没有 `todos` 键。工具代码自己不选存储后端。

`SessionEventMap['todo/write']` 的载荷是 `{ todos: TodoItem[] }`。[E: packages/core/session/src/types.ts:299] `TodoItem` 只有 `content` + 三态 `status` 两个字段。[E: packages/core/session/src/types.ts:191] [E: packages/core/session/src/types.ts:193] `KNOWN_SESSION_EVENT_TYPES` 含 `'todo/write'`。[E: packages/core/session/src/known-event-types.ts:51]

`todo/write` **不是** surface 事件：`SURFACE_EVENT_TYPES` 只有 `user/message` / `assistant/message` / `tool/result`；`deriveEventMessage` 对非这三类返回 `null`。[E: packages/core/session/src/surface.ts:15] [E: packages/core/session/src/surface.ts:112] session 测试钉死：append `todo/write` 之后 `deriveMessages()` 长度不变，`surface.nodes` 不含该 seq。[E: packages/core/session/tests/session.spec.ts:1713] [E: packages/core/session/tests/session.spec.ts:1715]

core session invariant 只要求 `todo/write` 落在 open turn 内，不检查条目形状。[E: packages/core/session/src/invariant.ts:150] [E: packages/core/session/src/invariant.ts:153] 形状由包配套 `@deepseek-ai/dsh-tool-todo/invariant`（插件名 `tool-todo-invariant`）在 `session/event` 上校验：必须是已 trim、非空、content 唯一、status 属于三态。它**故意不**数 `in_progress`——并行策略是当时部署的 `Config`，收紧策略后仍要能 replay 旧 log。[E: packages/todo/tool-todo/src/invariant.ts:25] [E: packages/todo/tool-todo/tests/invariant.spec.ts:22] 四个 shipped `agent.cordis.yml` **没有**挂这个 companion [I]；它不是 model-visible 工具。

`todos` projection-key 的类型合并住在 `src/types.ts`（`SessionProjectionMap.todos: TodoItem[] | null`），不是 `index.ts` 里第二份声明。[E: packages/todo/tool-todo/src/types.ts:22]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] 本插件**不**自己挂 pre-execute / post-execute listener [I]。

对本工具的挂点：

- **approval：** `defineTool` 没有声明会触发 `ask` 的策略。普通调用不经过 `ctx.approval.request`。[I]
- **sandbox：** 不读 `ctx.sandbox` / `ctx.sandboxPolicy`。body 只碰 session 日志。[I]
- **timeout：** `defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59]
- **checkpoint：** host `dsh-session-checkpoint-policy` 在 top-level（有 `exec.agent` 且无 `parent`）`tools/execute` 里先 `flush` 再 `next()`。本工具的副作用是 append `todo/write`，发生在 flush **之后**的 body 里。[E: packages/session/session-checkpoint-policy/src/index.ts:70]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1278]
- **Code Mode：** `code` preset 仍装本包，但 `mode: code` 时无 `parent` 的模型直调 `todo_write` 在进 waterfall 前 `collapses`（名字不是 `run_code`），必须从 `run_code` 程序里子调度。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325]
- **plan mode：** catalog 跨 mode 保持同一份；`todo_write` 不会被摘掉。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:411]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。装了的三份都是顶层 consumer 行，**没有** `disabled`，**没有** `isolate:`，Config 都是 `allowParallelInProgress: true`。

| preset | 装 `@deepseek-ai/dsh-tool-todo`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。装配后模型工具只有 `bash` + `str_replace_editor` | — | 本包未出现。文件里的 model-facing 行是 `dsh-tool-bash-persistent` 与 `dsh-tool-str-replace-editor` [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: apps/cli/tests/web-agent-presets.e2e.ts:227] | — |
| `standard` | 是 | 无 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:240] | 无。不在 `planning` / `delegation` realm | `allowParallelInProgress: true` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:243] |
| `code` | 是 | 无 [E: apps/cli/config/agent-presets/code/agent.cordis.yml:241] | 无 | 同 standard [E: apps/cli/config/agent-presets/code/agent.cordis.yml:244] |
| `cordis` | 是 | 无 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:228] | 无 | 同 standard [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:231] |

`standard` 的 e2e 精确 catalog（去掉依赖本机 ripgrep 的 `glob`/`grep`）含 `todo_write`。[E: apps/cli/tests/web-agent-presets.e2e.ts:209]

`planning` realm（`isolate.planMode: true`）只装 `@deepseek-ai/dsh-plan-mode`。本工具行在 “remaining model-facing rows”，与 plan-mode 插件不是同一 isolate 域；禁止用本工具跟踪规划阶段的句子写在 plan-mode 的 `section:` 字符串里，不是本插件 Config。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:118]

组合旁注（**不是** preset 成员资格）：`dsh-base` 也 insert 了 host 行 `tool-todo`（同样 `allowParallelInProgress: true`）。[E: packages/bundle/base/cordis.patch.yml:367] `dsh-web-app` overlay 把 host `tool-todo` 设 `disabled: true`，改由每个 session 的 preset remount。[E: packages/bundle/web-app/cordis.patch.yml:404] [E: packages/bundle/web-app/cordis.patch.yml:405] TUI / 未 overlay 的 host 是否仍直接吃 host 行，标 [I]（web overlay 的模式与 `tool-bash` 相同，本页未再核 TUI boot 源）。

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`：非数组 `todos`、非法 `status`、条目未知键在这里变成 `ToolArgsError`，用户 body 未跑。[E: packages/core/tools/src/schema.ts:586] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:116]
2. `toTodoList@packages/todo/tool-todo/src/index.ts`：逐项 `content.trim()`；trim 后长度为 0 → `invalid todo: \`content\` must be a non-empty string`；`seen` 命中 → `invalid todos: duplicate content ...`；`status === 'in_progress'` 时累加 `active`。[E: packages/todo/tool-todo/src/index.ts:91] [E: packages/todo/tool-todo/src/index.ts:98] [E: packages/todo/tool-todo/src/index.ts:101]
3. `!allowParallel && active > 1` → throw；测试确认拒绝**不会**写出 `todo/write`。[E: packages/todo/tool-todo/src/index.ts:107] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:156]
4. `if (!exec.agent)` throw `todo_write requires an owning agent session`。[E: packages/todo/tool-todo/src/index.ts:208] [E: packages/todo/tool-todo/tests/tool-todo.spec.ts:202]
5. `exec.agent.session.append('todo/write', { todos })`。`Session.append` 对 `data` 做 JSON snapshot + `deepFreeze`，调用方事后改数组改不了 log。[E: packages/todo/tool-todo/src/index.ts:213] [E: packages/core/session/src/index.ts:614] [E: packages/core/session/tests/session.spec.ts:1684]
6. 按规范化表数 `pending` / `in_progress` / `completed`，`Promise.resolve` 返回 `{ todos, counts }`。`inProgress` 计数键是 camelCase，status 字面量仍是 `in_progress`。[E: packages/todo/tool-todo/src/index.ts:217]
7. 第二次成功调用再 append 一条新的 `todo/write`。当前列表 = `findLast(type === 'todo/write')`，last-write-wins；旧事件仍留在 log。[E: packages/todo/tool-todo/tests/tool-todo.spec.ts:106] [E: packages/todo/tool-todo/tests/integration.spec.ts:96]
8. 有 `sessionProjections` 时，unit `apply` 把最新 `event.data.todos` 收成 standing 值；随后一条 `turn/start` 把投影清成 `null`，`turn/end` 不改（完成清单还能给 UI 看）。[E: packages/todo/tool-todo/src/index.ts:142] [E: packages/todo/tool-todo/tests/projection.spec.ts:101] [E: packages/todo/tool-todo/tests/projection.spec.ts:104]
9. 卸载插件 fiber 会 `unregister` 工具（HMR）：`schemas()` 不再含 `todo_write`。[E: packages/todo/tool-todo/tests/tool-todo.spec.ts:219]

## 设计动机·edge

- **整表替换，不是 patch。** 模型漏发旧条目等于删掉它们。`TodoItem` 只有 `content` + `status`，没有 `id` 字段。[E: packages/core/session/src/types.ts:191] [E: packages/core/session/src/types.ts:193]
- **并行是部署选择，不是 schema 方言。** shipped `standard`/`code`/`cordis` 把 `allowParallelInProgress` 设为 `true`。把 Config 改成 `false` 只收紧**新**调用；旧 log 里的双 active 快照 invariant 仍接受。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:243] [E: packages/todo/tool-todo/tests/invariant.spec.ts:36]
- **需要 owning agent。** agentless / 裸 `ctx.tools.execute` 没有 session 可写。这与 bash 不同：bash 可以在无 agent 时仍走 `ctx.shell`。
- **log-only UI 状态。** `todo/write` 不进下一轮模型 history。模型下一轮看见的是 `tool/call` + `tool/result` 那句 counts 摘要，不是整表回放。UI / api-proxy 从事件或 `todos` projection 读 standing 清单。[E: packages/core/session/src/types.ts:299] [E: packages/todo/tool-todo/tests/projection.spec.ts:90]
- **trim 是存储键。** `'  plan the work  '` 落成 `'plan the work'`；两条只差空白的 content 算 duplicate。[E: packages/todo/tool-todo/tests/tool-todo.spec.ts:94]
- **plan-mode 禁令是软层。** catalog 为 request-cache 稳定而保持注册；政策写在 `plan:policy` section。模型若仍调用，execute **不会**因为「当前是 plan mode」而拒绝。
- **与 Claude / Codex todo 方言。** 这里没有 `activeForm`、没有 merge-by-id、没有单独的 mark-complete 工具。一次参数就是下一份权威表。
- **空表合法。** 描述建议跳过 trivial 单步任务，但空 `todos: []` 仍会写出一份空 snapshot。

## Sources

- packages/todo/tool-todo/src/index.ts
- packages/todo/tool-todo/src/types.ts
- packages/todo/tool-todo/src/invariant.ts
- packages/todo/tool-todo/package.json
- packages/todo/tool-todo/tests/tool-todo.spec.ts
- packages/todo/tool-todo/tests/projection.spec.ts
- packages/todo/tool-todo/tests/loader-composition.spec.ts
- packages/todo/tool-todo/tests/invariant.spec.ts
- packages/todo/tool-todo/tests/integration.spec.ts
- packages/core/session/src/types.ts
- packages/core/session/src/known-event-types.ts
- packages/core/session/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/invariant.ts
- packages/core/session/tests/session.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-projection/src/index.ts
- packages/plan/plan-mode/tests/plan-mode.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、timeout wrapper、Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [会话日志与 deriveMessages](../../spine/session-log.md)（`spine.session-log`）：`todo/write` 是 log-only 事件，不进 derived history。
- [exit_plan_mode](exit-plan-mode.md)（`surface.tools.exit-plan-mode`）：规划正文与批准通道；plan-mode section 把实现进度留给本工具。
- [SessionEvent 目录](../../reference/session-events.md)（`ref.session-events`）：`todo/write` 在 `SessionEventMap` 中的条目。
