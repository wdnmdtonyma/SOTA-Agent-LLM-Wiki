---
id: surface.tools.ask-user-question
title: ask_user_question
kind: tool
tier: T1
pkg: interaction
source:
  - packages/interaction/tool-ask-user/src/index.ts
  - packages/interaction/tool-ask-user/package.json
  - packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts
  - packages/interaction/user-questions/src/index.ts
  - packages/interaction/user-questions/src/types.ts
  - packages/interaction/user-questions/package.json
  - packages/interaction/user-questions/tests/user-questions.spec.ts
  - packages/interaction/commands/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/ptc.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx
  - packages/client/ui-user-questions/src/index.ts
  - packages/client/ui-user-questions/src/client/index.ts
  - packages/client/ui-user-questions/src/client/QuestionComposer.tsx
  - packages/client/ui-user-questions/src/client/contract/slots.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/api/remotes/src/remote-events.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - snapshots/session/subagent-child-question-rejection/cordis.yml
  - packages/test-support/session-snapshot/tests/fixtures/child-question-tripwire.ts
symbols:
  - ask_user_question
  - apply
  - name
  - inject
  - UserQuestionService
  - UserQuestionError
  - AskUserQuestionRequest
  - AskUserQuestionItem
  - multi_select
  - multiSelect
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - subsys.interaction.user-questions
evidence: explicit
status: verified
updated: c291e7961a
---

> `ask_user_question` 是 `@deepseek-ai/dsh-tool-ask-user` 向模型注册的 **model-visible 工具**：暂停当前 tool-call，等 UI 通过 `ctx.userQuestions.ask` 收回人类答案，再把结构化 `{ answers }` 当成普通 `tool/result` 喂回 agent loop。它不是 slash command，也不是 `ctx.approval` 那条工具审批缝。

## 能回答的问题

- `ask_user_question` 的 wire `name`、实现包、`inject` 和 `defineTool` 注册点在哪？
- 模型可见字段是哪些？`multi_select` 怎样变成 seam 上的 `multiSelect`？`detail` / `intent` 能不能从这支工具发出去？
- 成功结果、空问题、无 answerer、子 agent、取消、abort 分别长什么样？会不会 spill？
- 消费哪些 `ctx.*`？换 UI answerer 会带走什么？和 `ctx.approval` / `ctx.commands` / `exit_plan_mode` 的 plan-review 差在哪？
- 四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）谁装 `@deepseek-ai/dsh-tool-ask-user`？`minimal` 和 host 全局层有没有这支工具？
- `execute()` 怎样进 `tools/pre-execute → execute → post-execute`？approval / sandbox / timeout 挂不挂？PTC `run_code` 子调用怎样重入？

## Identity

模型看见的工具名是字面量 `'ask_user_question'`，由 `apply` 交给 `ctx.tools.register(defineTool({ name: 'ask_user_question', … }))`。[E: packages/interaction/tool-ask-user/src/index.ts:21][E: packages/interaction/tool-ask-user/src/index.ts:20]

实现包是 `@deepseek-ai/dsh-tool-ask-user`。Cordis 插件名 `export const name = 'tool-ask-user'`，`inject = ['tools', 'userQuestions']`：host 没挂上 `ctx.userQuestions` 时这一行保持 pending，catalog 里不会出现 `ask_user_question`。[E: packages/interaction/tool-ask-user/package.json:2][E: packages/interaction/tool-ask-user/src/index.ts:13][E: packages/interaction/tool-ask-user/src/index.ts:14]

`apply(ctx)` **没有** schemastery `Config`，也没有改名 / 改参的部署旋钮。插件只做一件事：注册这一支工具。fiber `dispose` 后 `ctx.tools.get('ask_user_question')` 变回 `undefined`。[E: packages/interaction/tool-ask-user/src/index.ts:19][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:325][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:329]

`defineTool` **没有** `timeoutMs`、`isConcurrencySafe`、`presentCall` / `presentResult`、`output.presentationMeta`。registry 把未声明并发分类器的调用标成 `exclusive`；Web UI 用 keyed toolview `key: 'ask_user_question'` 画一行摘要，不走 definition 上的 presenter。[E: packages/core/tools/src/index.ts:1268][E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:204]

单测把编译后的 schema 钉成：顶层 `required: ['questions']`；每题有 `id` / `question` / `header` / `options` / `multi_select`；option 只有 `label` / `description`，**没有** `value` / `recommended` / `preview`。[E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:63][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:69][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:73][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:84][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:85][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:86]

## 用途定位

模型在需要确认、二选一、或多缺一项人类才能给的信息时调用这支工具。description 要求「简洁提问」，并强调每题带一个会在答案里原样回显的稳定 `id`。[E: packages/interaction/tool-ask-user/src/index.ts:16][E: packages/interaction/tool-ask-user/src/index.ts:17]

它走 **tool-call 管线**：loop 先 `append('tool/call')`，body 在 `ctx.userQuestions.ask` 上 await，人答完（或取消 / abort）后 `append('tool/result')`，`surfaceOp: 'append'`。下一轮 `deriveMessages()` 只看见这段普通 tool result，没有单独的 question 事件类型。[E: packages/core/agent-loop/src/tool-calls.ts:264][E: packages/core/agent-loop/src/tool-calls.ts:282][E: packages/core/agent-loop/src/tool-calls.ts:289]

三件不要和它混的东西：

1. **不是 slash command。** 人命令走 `@deepseek-ai/dsh-commands` 的 `ctx.commands`（插件名 `'commands'`），由 UI 直接 `command/run`，不经模型 turn、也不进这支 tool schema。[E: packages/interaction/commands/src/index.ts:27]
2. **不是 `ctx.approval`。** approval 是 `tools/pre-execute` 上的政策门（grant 是 `allowed-once`），模型看不见一张问卷。`ask_user_question` 自己不返回 `{ kind: 'ask' }`、不读 sandbox stamp。[E: packages/core/tools/src/index.ts:1467]
3. **不是 plan 终审。** shipped `standard` / `ptc` / `cordis` 的 plan-mode 文案要求：可观察事实自己查，只把用户所有的选择交给 `ask_user_question`；计划本身必须走 `exit_plan_mode`，禁止用这支工具问「要不要开工」。`exit_plan_mode` 会自己调 `ctx.userQuestions.ask`，并带上 `intent: { kind: 'plan-review', … }` —— 那是另一支工具的 body，不是 `ask_user_question` 的 schema。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:121][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:125][E: packages/plan/plan-mode/src/index.ts:300][E: packages/plan/plan-mode/src/index.ts:315]

子 agent（runtime 上被另一个 live agent 拥有）禁止等人：service 在碰到 waterfall answerer 之前就抛 `DELEGATED_CALLER`，文案要求把未决问题写进 child 的最终结果，交给 root 再问。[E: packages/interaction/user-questions/src/index.ts:101][E: packages/interaction/user-questions/src/index.ts:105][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:293]

## 输入 schema

以插件**默认**（也是唯一）boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object：只有 `questions` 进入 JSON Schema `required`。[E: packages/interaction/tool-ask-user/src/index.ts:24][E: packages/core/tools/src/schema.ts:451][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:69]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `questions` | `array` | 是 | 无 | schema **没有** `minItems`；空数组过 validate，在 `UserQuestionService.ask` 里变成 `EMPTY_QUESTIONS` | 一次可以问多题，按数组顺序交给 UI。[E: packages/interaction/tool-ask-user/src/index.ts:24][E: packages/interaction/user-questions/src/index.ts:90] |
| `questions[].id` | `string` | 是 | 无 | schema 只要 string | 稳定题号，答案原样回显。[E: packages/interaction/tool-ask-user/src/index.ts:32] |
| `questions[].question` | `string` | 是 | 无 | schema 只要 string | 给人看的题干。[E: packages/interaction/tool-ask-user/src/index.ts:33] |
| `questions[].header` | `string` | 否 | 省略则不转发 | 可选短标题，例如 `"Confirm"` | `execute` 仅在 `!== undefined` 时写入 seam item。[E: packages/interaction/tool-ask-user/src/index.ts:34][E: packages/interaction/tool-ask-user/src/index.ts:85] |
| `questions[].options` | `array` | 否 | 省略则不转发 | 每项是 object | 可选菜单。推荐项的产品约定是：**把该项放第一，并在 label 末尾追加 ` (Recommended)`**，不要另发明字段。[E: packages/interaction/tool-ask-user/src/index.ts:38][E: packages/interaction/tool-ask-user/src/index.ts:40] |
| `questions[].options[].label` | `string` | 是 | 无 | schema 只要 string | 人看到的选项文案；答案 `selected` 回的就是这些 label。[E: packages/interaction/tool-ask-user/src/index.ts:45] |
| `questions[].options[].description` | `string` | 否 | 无 | 一句利弊 | 有能力的 UI 用来解释取舍。[E: packages/interaction/tool-ask-user/src/index.ts:46] |
| `questions[].multi_select` | `boolean` | 否 | description 写「Defaults to false」；省略则 **不** 写 seam 字段，UI 把非 `true` 当单选 | wire 名是 snake_case | `execute` 映射成 seam 的 `multiSelect`。[E: packages/interaction/tool-ask-user/src/index.ts:50][E: packages/interaction/tool-ask-user/src/index.ts:87][E: packages/interaction/user-questions/src/types.ts:45] |

题目 object 与 option object 都标了 `additionalProperties: true`。[E: packages/interaction/tool-ask-user/src/index.ts:30][E: packages/interaction/tool-ask-user/src/index.ts:43] `execute` **只拷** `id` / `question` / `header` / `options` / `multi_select`。模型即使塞进 `detail` 或 `intent`，也不会进入 `AskUserQuestionRequest`——那两个字段是 seam 类型给 **其它调用方**（`exit_plan_mode` 的 plan-review）用的，本工具不转发。[E: packages/interaction/tool-ask-user/src/index.ts:82][E: packages/interaction/user-questions/src/types.ts:39][E: packages/interaction/user-questions/src/types.ts:47]

`options` 数组是整段原样转发（`options: question.options`）。schema 故意不广告 `value` / `recommended` / `preview`；推荐标签测试把 `pnpm (Recommended)` 当作普通 `label` 传下去。[E: packages/interaction/tool-ask-user/src/index.ts:86][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:125]

shipped 三个装了它的 preset 的 `tool-ask-user` 行都没有 `config:`，因此产品默认就是这张表。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:238][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:239]

## 输出 & 截断 / spill

`execute` 返回的规范值是封闭 object：`answers[]`，每项必有 `id`、`selected: string[]`，可选 `custom`。`additionalProperties: false`。registry 校验后再 `render`。[E: packages/interaction/tool-ask-user/src/index.ts:61][E: packages/interaction/tool-ask-user/src/index.ts:70][E: packages/core/tools/src/index.ts:1783][E: packages/core/tools/src/index.ts:1790]

模型看见的是一整段 JSON 文本，不是信封：

```
{"answers":[{"id":"pkg","selected":["pnpm"]}]}
```

`render` 就是 `JSON.stringify(value)` 包进一段 `text` block。`custom` 有值才写入；`selected` 先浅拷一份再返回。[E: packages/interaction/tool-ask-user/src/index.ts:78][E: packages/interaction/tool-ask-user/src/index.ts:95][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:114]

多题 / 多选 / 纯 custom 的规范值形状由单测定死：可以同时带 `selected` 与 `custom`；也可以 `selected: []` 只留 `custom`。[E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:196]

本工具 **没有** spill 路径，也没有 `presentationMeta`。截断若发生，只会来自后续 compaction 的 `tool-result-pruner`（`standard` / `ptc` / `cordis` 的 isolate 组），不是这支工具的输出合同。

失败走 registry `toolErrorResult`：`content` 为 `Error: <message>`；`UserQuestionError` 作为 `HarnessError` 会把 `{ name, code }` 放进 `error.info`，并随 `tool/result` 的 `error` 字段落盘。[E: packages/core/tools/src/index.ts:1864][E: packages/core/tools/src/index.ts:637][E: packages/core/agent-loop/src/tool-calls.ts:285][E: packages/interaction/user-questions/src/index.ts:34]

| `UserQuestionError.code` | 谁抛 | 模型看到的要点 |
|---|---|---|
| `EMPTY_QUESTIONS` | `UserQuestionService.ask` | `questions: []`。[E: packages/interaction/user-questions/src/index.ts:91][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:315] |
| `ASK_ABORTED` | service（进入时 signal 已 aborted，或等待中 abort 且原因不是 `UserQuestionError`）或 Web composer（`PendingQuestion.abort`） | 「ask_user_question was aborted before the user answered」。[E: packages/interaction/user-questions/src/index.ts:43][E: packages/client/ui-user-questions/src/client/contract/slots.ts:150] |
| `CALLER_NOT_LIVE` | service | 传入了 `agent`，但 `ctx.agents.get(id)` 不是**同一个** live 实例。[E: packages/interaction/user-questions/src/index.ts:97] |
| `DELEGATED_CALLER` | service | live agent 不是 `agents.roots()` 成员（被另一个 live agent 拥有）。[E: packages/interaction/user-questions/src/index.ts:105][E: packages/core/agent/src/index.ts:597] |
| `NO_PROVIDER` | service waterfall 的 `next` 底 | 没有任何 answerer `return` 答案（消息：`no user-questions answerer accepted the request`）。[E: packages/interaction/user-questions/src/index.ts:132][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:266] |
| `ASK_CANCELLED` | Web `PendingQuestion.cancel`（人关掉整组问卷） | 文案是 `the user cancelled ask_user_question`；Typert 把带 `name`/`code` 的 Error 送回 host，service `restoreUserQuestionError` 还原成 `UserQuestionError`。[E: packages/client/ui-user-questions/src/client/contract/slots.ts:186][E: packages/interaction/user-questions/src/index.ts:59] |
| `BAD_INTENT` | service | 请求带了 `intent` 但 approve label 对不上 option，或缺 `detail`。本工具的 map **不会**发出 `intent`，正常路径碰不到。[E: packages/interaction/user-questions/src/index.ts:122] |

已删除的旧 host `createApiProxy` 通道码（`ASK_MISSING_AGENT`、mux `question/requested`、`registerProvider` / `DUPLICATE_PROVIDER`）**不再存在**。当前 Web 半边走 Typert Remote Event `'user-questions/request'`（waterfall）。[E: packages/api/remotes/src/remote-events.ts:34][E: packages/client/ui-user-questions/src/client/index.ts:104]

Web 卡片：`AskQuestionRow` 把 `ASK_CANCELLED` 显示成 cancelled（`state = 'ok'`），把 `ASK_ABORTED` 显示成 interrupted / `stopped`，pending 时显示 waiting。[E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:153][E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:160][E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:168]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-user-questions`：`ctx.userQuestions`（`UserQuestionService`），服务名字面量 `'userQuestions'`。[E: packages/interaction/user-questions/package.json:2][E: packages/interaction/user-questions/src/index.ts:67] |
| Answerer | Cordis waterfall `'user-questions/request'`。监听者 return 答案即认领，或 `next()` 委托；全部放过则 `NO_PROVIDER`。[E: packages/interaction/user-questions/src/types.ts:85][E: packages/interaction/user-questions/src/index.ts:136] 有 `agent` 时走 `scopeTarget(agent, agent)`，只打到该 Agent 作用域。[E: packages/interaction/user-questions/src/index.ts:138] shipped Web：client 半边 `ctx.remote.$on('user-questions/request', …)` 建 `PendingQuestion`，composer 作答。[E: packages/client/ui-user-questions/src/client/index.ts:104] host 面 `@deepseek-ai/dsh-client-ui-user-questions` 的 node `apply()` 是空函数——工具行不在这个包。[E: packages/client/ui-user-questions/src/index.ts:11][E: packages/bundle/web-app/cordis.patch.yml:345] |
| Consumer | `@deepseek-ai/dsh-tool-ask-user` 的 `ask_user_question`；另有 `exit_plan_mode` 走同一 `ask()`，带 `intent` / `detail`。[E: packages/plan/plan-mode/src/index.ts:300] |

`dsh-base` 在 **host 面**插入服务行 `id: user-questions` / `name: '@deepseek-ai/dsh-user-questions'`，**不**插入 `tool-ask-user`。模型可见工具属于 preset remount（web profile 的 `agent-presets` 行）。其它 shipped profile（`headless` / `sdk` / `sdk-minimal` / `acp`）不叠 web 的 preset roster，host 面是否出现这支工具取决于那条 composition 有没有自己 insert `tool-ask-user`。[E: packages/bundle/base/cordis.patch.yml:64][E: packages/bundle/base/cordis.patch.yml:65]

换 answerer 会带走：问卷怎么画、人能不能 skip / 写 Other、取消码。不会带走：wire schema、`multi_select → multiSelect` 映射、live-root / delegated 守卫、空批次拒绝。Web composer：单选点一项就进下一题；多选是 checkbox；单选写 custom 会清掉 `selected`，多选保留已勾选项；skip 把该题标 `skipped: true`（提交时 `selected: []`）。[E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:196][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:254][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:268][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:215]

Typert 把 host 上的 `'user-questions/request'` 标成 `mode: 'waterfall'`，载荷用 seam 字段（`questions` / `agent` / camelCase `multiSelect` / `detail` / `intent`）。那是 host↔client Remote Event，不是模型参数。[E: packages/api/remotes/src/remote-events.ts:34]

## 执行管线

模型发出 `ask_user_question` 后，loop 造 **没有** `parent` 的 `ToolExecutionInput`（带 `agent`），经 `ctx.tools.execute`：`tools/pre-execute` → 可能的 approval ask → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render` → `tools/result`。[E: packages/core/agent-loop/src/tool-calls.ts:74][E: packages/core/tools/src/index.ts:1467][E: packages/core/tools/src/index.ts:1565]

对本工具的挂点：

- **`tools/pre-execute`**：本插件不注册 listener，也不返回 `{ kind: 'ask' }`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会进 `ctx.approval`。[E: packages/core/tools/src/index.ts:1467]
- **调度**：未声明 `isConcurrencySafe`，`executionMode` 直接 `exclusive`。两道问卷不会和别的 exclusive 调用重叠；这与「等人」语义一致。[E: packages/core/tools/src/index.ts:1268]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`；flush 后若已 abort，body 不跑。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`；本工具未声明，包装器直接 `next()`，**没有**截止时间。[E: packages/guard/timeout-policy/src/index.ts:59][E: packages/guard/timeout-policy/src/index.ts:61]
- **body**：`defineTool` 先 `validateArgs`，再进 `apply` 里的 `execute`。`exec.signal` 原样传给 `ask({ signal })`。[E: packages/core/tools/src/schema.ts:585][E: packages/interaction/tool-ask-user/src/index.ts:90][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:209]
- **`tools/post-execute`**：本插件不注册 listener，默认 `accept`。[E: packages/core/tools/src/index.ts:1735]
- **sandbox / approval**：不挂。没有文件副作用，也没有 per-call sandbox stamp。

`ptc` preset（picker **PTC 模式**，节点 id `surface.presets.code` 仍是稳定别名）下，模型能直接调的 **唯一** wire 工具是 `run_code`。`ask_user_question` 仍在 registry / SDK 里：`wireSchemas` 在 `mode === 'ptc'` 时只交出名为 `run_code` 的 schema；`sdkSchemas` 则投影除 `run_code` 以外的可见定义。模型直呼 `ask_user_question` 会在 **policy 之前** collapse（`UNKNOWN_TOOL`，文案要求从 `run_code` 程序里调）；从 `run_code` 程序里 `await tools.ask_user_question(args)` 带着 `parent: exec.token`（`nested === true`），不 collapse，重入 `TOOL_RUNTIME_SCHEDULER`，但 checkpoint 对 `exec.parent !== undefined` 直接 `next()`。[E: packages/core/tools/src/index.ts:986][E: packages/core/tools/src/index.ts:1231][E: packages/core/tools/src/index.ts:1315][E: packages/core/tools/src/index.ts:1429][E: packages/core/tools/src/ptc.ts:476][E: packages/session/session-checkpoint-policy/src/index.ts:71][E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:269]

## Preset 装配

成员资格只认 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml`，不以 package 存在为准。仓库里有 `@deepseek-ai/dsh-tool-ask-user` ≠ 每个会话都装。

| preset | 装 `@deepseek-ai/dsh-tool-ask-user`？ | `disabled` | isolate | shipped Config | 说明 |
|---|---|---|---|---|---|
| `minimal` | **否** | — | 无此行 | — | yml 不 insert 该行。装配后模型工具是 `['bash']`（POSIX）。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21][E: apps/cli/tests/web-agent-presets.e2e.ts:299] |
| `standard` | **是** | 无 | 无（只往 host `tools` 注册） | 无 `config` | `- id: tool-ask-user` / `name: '@deepseek-ai/dsh-tool-ask-user'`。Web e2e 的 standard catalog 以 `ask_user_question` 打头。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:238][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:239][E: apps/cli/tests/web-agent-presets.e2e.ts:243] |
| `ptc` | **是** | 无 | 无 | 无 `config` | 与 standard 同一行。PTC 只换呈现（唯一 wire = `run_code`），工具行仍在；另有 `tool-presentation` `mode: ptc`。[E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:248][E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:248][E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:269] |
| `cordis` | **是** | 无 | 无 | 无 `config` | 同样 remount。[E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:226][E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:227] |

Web 组合把模型可见工具全部赶到 per-session preset：全局层 `toolNames(ctx)` 为空，`ask_user_question` 也包括在内。[E: apps/cli/tests/web-agent-presets.e2e.ts:185]

其它 composition 可以自行挂这一行。例如 snapshot 夹具 `snapshots/session/subagent-child-question-rejection/cordis.yml` 同时 insert `tool-ask-user` 和一个 tripwire answerer（`child-question-tripwire.ts` 监听 `'user-questions/request'` 并 throw），用来钉死 child 不能等人——那是测试夹具，不是 shipped 产品默认。[E: snapshots/session/subagent-child-question-rejection/cordis.yml:4][E: packages/test-support/session-snapshot/tests/fixtures/child-question-tripwire.ts:12]

## execute() 走读

符号：`apply` @ `packages/interaction/tool-ask-user/src/index.ts`，`UserQuestionService.ask` @ `packages/interaction/user-questions/src/index.ts`，Web 等待 @ client `PendingQuestion`。

1. **校验参数。** `defineTool` 的 wrapper 对隐式 schema 跑 `validate`；缺 `questions`、题上缺 `id`/`question`、option 缺 `label` 会抛 `ToolArgsError`（`INVALID_ARGS`），到不了 `ask`。[E: packages/core/tools/src/schema.ts:585][E: packages/core/tools/src/schema.ts:466]

2. **投影成 seam 请求。** `execute` 把每题映射为 `AskUserQuestionItem`：拷 `id` / `question`；有则拷 `header` / `options`；把 `multi_select` 改名为 `multiSelect`。有 `exec.agent` 就写入 `agent`；始终带 `signal: exec.signal`。[E: packages/interaction/tool-ask-user/src/index.ts:81][E: packages/interaction/tool-ask-user/src/index.ts:87][E: packages/interaction/tool-ask-user/src/index.ts:89][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:251]

3. **service 入口守卫（先于 waterfall）。** `UserQuestionService.ask` 顺序：
   - `signal.aborted` → `ASK_ABORTED`，answerer 不会被调用。[E: packages/interaction/user-questions/src/index.ts:87][E: packages/interaction/user-questions/tests/user-questions.spec.ts:100]
   - `questions.length === 0` → `EMPTY_QUESTIONS`。[E: packages/interaction/user-questions/src/index.ts:90]
   - 若带了 `agent`：必须 `ctx.agents.get(agent.id) === agent`（精确 live 实例，不是同 id 的旧对象），且 `agents.roots().includes(agent)`。边界按 **runtime 所有权**，不按 durable session lineage：带着 lineage 恢复出来的新 runtime root 可以问；正在跑的 child 不行。[E: packages/interaction/user-questions/src/index.ts:96][E: packages/interaction/user-questions/src/index.ts:101][E: packages/interaction/user-questions/tests/user-questions.spec.ts:210][E: packages/interaction/user-questions/tests/user-questions.spec.ts:231]
   - 若某题声明了 `intent`：approve label 必须是本题某个 option；且必须带 `detail`。本工具不发 `intent`，这一步是给 plan-review 等调用方的。[E: packages/interaction/user-questions/src/index.ts:115]
   - waterfall 底 `noAnswerer` → `NO_PROVIDER`。[E: packages/interaction/user-questions/src/index.ts:130]

4. **交给 scoped waterfall。** 成功路径：无 agent 时 `this.ctx.waterfall('user-questions/request', request, noAnswerer)`；有 agent 时再套 `scopeTarget`。[E: packages/interaction/user-questions/src/index.ts:136] Web client listener 建 `PendingQuestion`，abort 时 reject `ASK_ABORTED`。[E: packages/client/ui-user-questions/src/client/index.ts:104][E: packages/client/ui-user-questions/src/client/contract/slots.ts:150]

5. **人在 composer 里答。** `QuestionComposer`：无 `plan-review` intent 走 `QuestionFlow`；有则走 `PlanReviewPanel`（那是 `exit_plan_mode` 路径）。单选点一项就进下一题；多选是 checkbox；可以写 custom；可以 skip。提交走 `pending.answer`。[E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:116][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:188][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:226]

6. **结算。** `pending.cancel()` → `ASK_CANCELLED`。`pending.answer` 把整批答案 resolve 回 host waterfall。[E: packages/client/ui-user-questions/src/client/contract/slots.ts:186][E: packages/client/ui-user-questions/src/client/contract/slots.ts:161]

7. **投影回规范值。** `execute` 把每条 answer 收成 `{ id, selected: [...], custom? }`，去掉 `undefined` 的 `custom`。[E: packages/interaction/tool-ask-user/src/index.ts:92]

8. **registry 投影。** `createSuccessResult` 校验 output schema，再 `JSON.stringify` 成一段 text。loop `append('tool/result')`。turn 取消若发生在 body 已开始之后，registry 只在结果 **还不是** `isError` 时换成 `ABORTED`；工具自己已经结构化失败（例如 `ASK_ABORTED`）会保留原码。[E: packages/core/tools/src/index.ts:1783][E: packages/core/tools/src/index.ts:1790][E: packages/core/tools/src/index.ts:1583][E: packages/core/agent-loop/src/tool-calls.ts:282]

## 设计动机·edge

和 Claude Code 的 `AskUserQuestion` 方言很近：一批题、每题 `id` + options、推荐项写在 label 里、可选 `header`、可选多选。DSH 的差异落在 **组合缝** 而不是又发明一套问卷 JSON：

- **Consumer / Definition / Answerer 拆开。** 模型工具可以在没有 UI 的 composition 里存在（execute 才 `NO_PROVIDER`）；也可以只挂服务、不挂工具。snapshot 的 child-question tripwire 就是这种拆法。
- **wire 用 `multi_select`，seam / Remote / UI 用 `multiSelect`。** 映射只发生在这一个 `execute` 里。
- **不把 plan-review 塞进这支工具。** `intent` + `detail` 留给 `exit_plan_mode`，避免模型用问卷假装「计划已批准」。
- **runtime root 才能等人。** 所有权看 `agents.roots()`，不看 `delegationDepth`。恢复出来的 lineage root 可以问；活着的 child 必须把问题写进 `report` / 最终结果。
- **waterfall 而非单槽 `registerProvider`。** 多个 answerer 可以 `next()` 委托；没有人认领才 `NO_PROVIDER`。Web client 一个 session 上的 composer 认领当前 pending。
- **答案协议允许 skip 与 Other。** skip = 空 `selected`；Other = `custom`。Web 单选写 custom 会清掉已选 label。
- **无人值守部署会结构化失败，而不是挂死。** 缺 answerer 立刻 `NO_PROVIDER`。
- **exclusive + 无 timeout。** 等人不是短 I/O；截止时间由 turn abort / 人取消驱动，不由 `timeout-policy`。
- **PTC 不删工具行。** `presets/ptc/` 仍装 `tool-ask-user`；模型直呼被 collapse，SDK / `run_code` 子调用仍可等人。

## Sources

- packages/interaction/tool-ask-user/src/index.ts
- packages/interaction/tool-ask-user/package.json
- packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts
- packages/interaction/user-questions/src/index.ts
- packages/interaction/user-questions/src/types.ts
- packages/interaction/user-questions/package.json
- packages/interaction/user-questions/tests/user-questions.spec.ts
- packages/interaction/commands/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/ptc.ts
- packages/core/agent/src/index.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx
- packages/client/ui-user-questions/src/index.ts
- packages/client/ui-user-questions/src/client/index.ts
- packages/client/ui-user-questions/src/client/QuestionComposer.tsx
- packages/client/ui-user-questions/src/client/contract/slots.ts
- packages/plan/plan-mode/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/api/remotes/src/remote-events.ts
- apps/cli/tests/web-agent-presets.e2e.ts
- snapshots/session/subagent-child-question-rejection/cordis.yml
- packages/test-support/session-snapshot/tests/fixtures/child-question-tripwire.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute`；本工具不挂 approval / sandbox / timeout。
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表。
- [user-questions 子系统](../../subsystems/interaction/user-questions.md) — `ctx.userQuestions` 的 Definition / waterfall answerer 合同、错误码与 live-root 边界。
