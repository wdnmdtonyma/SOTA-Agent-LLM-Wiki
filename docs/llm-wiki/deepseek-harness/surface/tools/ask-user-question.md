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
  - packages/core/agent/src/index.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/apiproxy/src/api/events.schema.ts
  - packages/host/apiproxy/tests/api-proxy-question.spec.ts
  - packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx
  - packages/client/ui-user-questions/src/client/QuestionComposer.tsx
  - packages/plan/plan-mode/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
  - examples/acp-agent/child-question.cordis.yml
symbols:
  - ask_user_question
  - apply
  - name
  - inject
  - UserQuestionService
  - UserQuestionError
  - registerProvider
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
updated: 47f943859b
---

> `ask_user_question` 是 `@deepseek-ai/dsh-tool-ask-user` 向模型注册的 **model-visible 工具**：暂停当前 tool-call，等 UI 通过 `ctx.userQuestions.ask` 收回人类答案，再把结构化 `{ answers }` 当成普通 `tool/result` 喂回 agent loop。它不是 slash command，也不是 `ctx.approval` 那条工具审批缝。

## 能回答的问题

- `ask_user_question` 的 wire `name`、实现包、`inject` 和 `defineTool` 注册点在哪？
- 模型可见字段是哪些？`multi_select` 怎样变成 seam 上的 `multiSelect`？`detail` / `intent` 能不能从这支工具发出去？
- 成功结果、空问题、无 provider、子 agent、取消、abort 分别长什么样？会不会 spill？
- 消费哪些 `ctx.*`？换 UI provider 会带走什么？和 `ctx.approval` / `ctx.commands` / `exit_plan_mode` 的 plan-review 差在哪？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-ask-user`？`minimal` 和 host 全局层有没有这支工具？
- `execute()` 怎样进 `tools/pre-execute → execute → post-execute`？approval / sandbox / timeout 挂不挂？

## Identity

模型看见的工具名是字面量 `'ask_user_question'`，由 `apply` 交给 `ctx.tools.register(defineTool({ name: 'ask_user_question', … }))`。[E: packages/interaction/tool-ask-user/src/index.ts:21][E: packages/interaction/tool-ask-user/src/index.ts:20]

实现包是 `@deepseek-ai/dsh-tool-ask-user`。Cordis 插件名 `export const name = 'tool-ask-user'`，`inject = ['tools', 'userQuestions']`：host 没挂上 `ctx.userQuestions` 时这一行保持 pending，catalog 里不会出现 `ask_user_question`。[E: packages/interaction/tool-ask-user/package.json:2][E: packages/interaction/tool-ask-user/src/index.ts:13][E: packages/interaction/tool-ask-user/src/index.ts:14]

`apply(ctx)` **没有** schemastery `Config`，也没有改名 / 改参的部署旋钮。插件只做一件事：注册这一支工具。fiber `dispose` 后 `ctx.tools.get('ask_user_question')` 变回 `undefined`。[E: packages/interaction/tool-ask-user/src/index.ts:19][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:314][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:318]

`defineTool` **没有** `timeoutMs`、`isConcurrencySafe`、`presentCall` / `presentResult`、`output.presentationMeta`。registry 把未声明并发分类器的调用标成 `exclusive`；Web UI 用 keyed toolview `key: 'ask_user_question'` 画一行摘要，不走 definition 上的 presenter。[E: packages/core/tools/src/index.ts:1278][E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:98]

单测把编译后的 schema 钉成：顶层 `required: ['questions']`；每题有 `id` / `question` / `header` / `options` / `multi_select`；option 只有 `label` / `description`，**没有** `value` / `recommended` / `preview`。[E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:52][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:58][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:62][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:73][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:74][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:75]

## 用途定位

模型在需要确认、二选一、或多缺一项人类才能给的信息时调用这支工具。description 要求「简洁提问」，并强调每题带一个会在答案里原样回显的稳定 `id`。[E: packages/interaction/tool-ask-user/src/index.ts:16][E: packages/interaction/tool-ask-user/src/index.ts:17]

它走 **tool-call 管线**：loop 先 `append('tool/call')`，body 在 `ctx.userQuestions.ask` 上 await，人答完（或取消 / abort）后 `append('tool/result')`，`surfaceOp: 'append'`。下一轮 `deriveMessages()` 只看见这段普通 tool result，没有单独的 question 事件类型。[E: packages/core/agent-loop/src/tool-calls.ts:263][E: packages/core/agent-loop/src/tool-calls.ts:281][E: packages/core/agent-loop/src/tool-calls.ts:288]

三件不要和它混的东西：

1. **不是 slash command。** 人命令走 `@deepseek-ai/dsh-commands` 的 `ctx.commands`（插件名 `'commands'`），由 UI 直接 `command/run`，不经模型 turn、也不进这支 tool schema。[E: packages/interaction/commands/src/index.ts:23]
2. **不是 `ctx.approval`。** approval 是 `tools/pre-execute` 上的政策门（grant 是 `allowed-once`），模型看不见一张问卷。`ask_user_question` 自己不 `ask`、不读 sandbox stamp。
3. **不是 plan 终审。** shipped plan-mode 文案要求：可观察事实自己查，只把用户所有的选择交给 `ask_user_question`；计划本身必须走 `exit_plan_mode`，禁止用这支工具问「要不要开工」。`exit_plan_mode` 会自己调 `ctx.userQuestions.ask`，并带上 `intent: { kind: 'plan-review', … }` —— 那是另一支工具的 body，不是 `ask_user_question` 的 schema。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:120][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:124][E: packages/plan/plan-mode/src/index.ts:334][E: packages/plan/plan-mode/src/index.ts:347]

子 agent（runtime 上被另一个 live agent 拥有）禁止等人：seam 在碰到 provider 之前就抛 `DELEGATED_CALLER`，文案要求把未决问题写进 child 的最终结果，交给 root 再问。[E: packages/interaction/user-questions/src/index.ts:107][E: packages/interaction/user-questions/src/index.ts:111][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:283]

## 输入 schema

以插件**默认**（也是唯一）boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object：只有 `questions` 进入 JSON Schema `required`。[E: packages/interaction/tool-ask-user/src/index.ts:24][E: packages/core/tools/src/schema.ts:451][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:58]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `questions` | `array` | 是 | 无 | schema **没有** `minItems`；空数组过 validate，在 `UserQuestionService.ask` 里变成 `EMPTY_QUESTIONS` | 一次可以问多题，按数组顺序交给 UI。[E: packages/interaction/tool-ask-user/src/index.ts:24][E: packages/interaction/user-questions/src/index.ts:96] |
| `questions[].id` | `string` | 是 | 无 | schema 只要 string | 稳定题号，答案原样回显。[E: packages/interaction/tool-ask-user/src/index.ts:32] |
| `questions[].question` | `string` | 是 | 无 | schema 只要 string | 给人看的题干。[E: packages/interaction/tool-ask-user/src/index.ts:33] |
| `questions[].header` | `string` | 否 | 省略则不转发 | 可选短标题，例如 `"Confirm"` | `execute` 仅在 `!== undefined` 时写入 seam item。[E: packages/interaction/tool-ask-user/src/index.ts:34][E: packages/interaction/tool-ask-user/src/index.ts:85] |
| `questions[].options` | `array` | 否 | 省略则不转发 | 每项是 object | 可选菜单。推荐项的产品约定是：**把该项放第一，并在 label 末尾追加 ` (Recommended)`**，不要另发明字段。[E: packages/interaction/tool-ask-user/src/index.ts:38][E: packages/interaction/tool-ask-user/src/index.ts:40] |
| `questions[].options[].label` | `string` | 是 | 无 | schema 只要 string | 人看到的选项文案；答案 `selected` 回的就是这些 label。[E: packages/interaction/tool-ask-user/src/index.ts:45] |
| `questions[].options[].description` | `string` | 否 | 无 | 一句利弊 | 有能力的 UI 用来解释取舍。[E: packages/interaction/tool-ask-user/src/index.ts:46] |
| `questions[].multi_select` | `boolean` | 否 | description 写「Defaults to false」；省略则 **不** 写 seam 字段，UI / `matchesQuestions` 把非 `true` 当单选 | wire 名是 snake_case | `execute` 映射成 seam 的 `multiSelect`。[E: packages/interaction/tool-ask-user/src/index.ts:50][E: packages/interaction/tool-ask-user/src/index.ts:87][E: packages/interaction/user-questions/src/types.ts:47] |

题目 object 与 option object 都标了 `additionalProperties: true`。[E: packages/interaction/tool-ask-user/src/index.ts:30][E: packages/interaction/tool-ask-user/src/index.ts:43] `execute` **只拷** `id` / `question` / `header` / `options` / `multi_select`。模型即使塞进 `detail` 或 `intent`，也不会进入 `AskUserQuestionRequest`——那两个字段是 seam 类型给 **其它调用方**（`exit_plan_mode` 的 plan-review）用的，本工具不转发。[E: packages/interaction/tool-ask-user/src/index.ts:82][E: packages/interaction/user-questions/src/types.ts:41][E: packages/interaction/user-questions/src/types.ts:49]

`options` 数组是整段原样转发（`options: question.options`）。schema 故意不广告 `value` / `recommended` / `preview`；推荐标签测试把 `pnpm (Recommended)` 当作普通 `label` 传下去。[E: packages/interaction/tool-ask-user/src/index.ts:86][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:140]

shipped 三个装了它的 preset 的 `tool-ask-user` 行都没有 `config:`，因此产品默认就是这张表。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:237][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:238]

## 输出 & 截断 / spill

`execute` 返回的规范值是封闭 object：`answers[]`，每项必有 `id`、`selected: string[]`，可选 `custom`。`additionalProperties: false`。registry 校验后再 `render`。[E: packages/interaction/tool-ask-user/src/index.ts:61][E: packages/interaction/tool-ask-user/src/index.ts:70][E: packages/core/tools/src/index.ts:1795][E: packages/core/tools/src/index.ts:1800]

模型看见的是一整段 JSON 文本，不是信封：

```
{"answers":[{"id":"pkg","selected":["pnpm"]}]}
```

`render` 就是 `JSON.stringify(value)`。`custom` 有值才写入；`selected` 先浅拷一份再冻结。[E: packages/interaction/tool-ask-user/src/index.ts:78][E: packages/interaction/tool-ask-user/src/index.ts:93][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:103]

多题 / 多选 / 纯 custom 的规范值形状由单测定死：可以同时带 `selected` 与 `custom`；也可以 `selected: []` 只留 `custom`。[E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:185]

本工具 **没有** spill 路径，也没有 `presentationMeta`。截断若发生，只会来自后续 compaction 的 `tool-result-pruner`（`standard` / `code` / `cordis` 的 isolate 组），不是这支工具的输出合同。

失败走 registry `toolErrorResult`：`content` 为 `Error: <message>`；`UserQuestionError` 作为 `HarnessError` 会把 `{ name, code }` 放进 `error.info`，并随 `tool/result` 的 `error` 字段落盘。[E: packages/core/tools/src/index.ts:1874][E: packages/core/tools/src/index.ts:644][E: packages/core/agent-loop/src/tool-calls.ts:284][E: packages/interaction/user-questions/src/index.ts:43]

| `UserQuestionError.code` | 谁抛 | 模型看到的要点 |
|---|---|---|
| `EMPTY_QUESTIONS` | `UserQuestionService.ask` | `questions: []`。[E: packages/interaction/user-questions/src/index.ts:97][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:304] |
| `ASK_ABORTED` | service（进入时 signal 已 aborted）或 Web provider（等待中被取消） | 「ask_user_question was aborted before the user answered」。[E: packages/interaction/user-questions/src/index.ts:94][E: packages/host/apiproxy/src/api-proxy.ts:1385] |
| `CALLER_NOT_LIVE` | service | 传入了 `agent`，但 `ctx.agents.get(id)` 不是**同一个** live 实例。[E: packages/interaction/user-questions/src/index.ts:102] |
| `DELEGATED_CALLER` | service | live agent 不是 `agents.roots()` 成员（被另一个 live agent 拥有）。[E: packages/interaction/user-questions/src/index.ts:111][E: packages/core/agent/src/index.ts:613] |
| `NO_PROVIDER` | service | 没有 UI provider。[E: packages/interaction/user-questions/src/index.ts:137][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:255] |
| `ASK_MISSING_AGENT` | Web `createApiProxy` provider | `request.agent` 缺失；直接 `ctx.tools.execute` 且不传 `agent` 会打到这里。[E: packages/host/apiproxy/src/api-proxy.ts:1374] |
| `ASK_CANCELLED` | Web `respond` | 人主动关掉整组问卷（`result.ok === false` 且 `error.code === 'cancelled'`）。文案是 `the user cancelled ask_user_question`。[E: packages/host/apiproxy/src/api-proxy.ts:3719] |
| `BAD_INTENT` | service | 请求带了 `intent` 但 approve label 对不上 option，或缺 `detail`。本工具的 map **不会**发出 `intent`，正常路径碰不到。[E: packages/interaction/user-questions/src/index.ts:128] |
| `DUPLICATE_PROVIDER` | `registerProvider` | 同一 context 再挂第二个 UI。[E: packages/interaction/user-questions/src/index.ts:67] |

Web 卡片：`AskQuestionRow` 把 `ASK_CANCELLED` 显示成 cancelled，把 `ASK_ABORTED` 显示成 interrupted / `stopped`，pending 时显示 waiting。[E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:58][E: packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx:60]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-user-questions`：`ctx.userQuestions`（`UserQuestionService`），服务名字面量 `'userQuestions'`。[E: packages/interaction/user-questions/package.json:2][E: packages/interaction/user-questions/src/index.ts:55] |
| Provider | **一个** `UserQuestionProvider`。`registerProvider` 用 `ctx.effect` 占槽，重复注册抛 `DUPLICATE_PROVIDER`；dispose 把槽清掉。[E: packages/interaction/user-questions/src/index.ts:64][E: packages/interaction/user-questions/src/index.ts:67] shipped Web：`createApiProxy` 把 `ask` 变成 mux 帧 `question/requested`，用稳定 `rpcId` 等 `respond`。[E: packages/host/apiproxy/src/api-proxy.ts:1369][E: packages/host/apiproxy/src/api-proxy.ts:1392] client 面 `@deepseek-ai/dsh-client-ui-user-questions` 画 composer。[E: packages/bundle/web-app/cordis.patch.yml:270][E: packages/bundle/web-app/cordis.patch.yml:271] |
| Consumer | `@deepseek-ai/dsh-tool-ask-user` 的 `ask_user_question`；另有 `exit_plan_mode` 走同一 `ask()`，带 `intent` / `detail`。 |

`dsh-base` 在 **host 面**插入服务行 `id: user-questions` / `name: '@deepseek-ai/dsh-user-questions'`，**不**插入 `tool-ask-user`。模型可见工具属于 preset remount。`ApiProxyService.inject` 硬依赖 `'userQuestions'`，所以 Web 网关启动时服务必须已经在。[E: packages/bundle/base/cordis.patch.yml:55][E: packages/bundle/base/cordis.patch.yml:56][E: packages/host/apiproxy/src/index.ts:72]

换 provider 会带走：问卷怎么画、人能不能 skip / 写 Other、取消码、以及「必须带 agent」这类通道政策。不会带走：wire schema、`multi_select → multiSelect` 映射、live-root / delegated 守卫、空批次拒绝。Web 通道额外校验答案必须对得上发出去的那一组题：单选时 `custom` 与 `selected` 互斥；多选允许同时带选项和 custom；`selected` 必须是本题 `options[].label`。[E: packages/host/apiproxy/src/api-proxy.ts:726][E: packages/host/apiproxy/src/api-proxy.ts:731][E: packages/host/apiproxy/tests/api-proxy-question.spec.ts:90][E: packages/host/apiproxy/tests/api-proxy-question.spec.ts:111]

mux 出站 schema 要求 `question/requested.questions` 至少一题，并认识 seam 字段 `multiSelect` / `detail` / `intent`（camelCase）。那是 host↔client 帧，不是模型参数。[E: packages/host/apiproxy/src/api/events.schema.ts:51][E: packages/host/apiproxy/src/api/events.schema.ts:26]

## 执行管线

模型发出 `ask_user_question` 后，loop 造 **没有** `parent` 的 `ToolExecutionInput`（带 `agent`），经 `ctx.tools.execute`：`tools/pre-execute` → 可能的 approval ask → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render` → `tools/result`。[E: packages/core/agent-loop/src/tool-calls.ts:73][E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

对本工具的挂点：

- **`tools/pre-execute`**：本插件不注册 listener，也不返回 `{ kind: 'ask' }`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会进 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **调度**：未声明 `isConcurrencySafe`，`executionMode` 直接 `exclusive`。两道问卷不会和别的 exclusive 调用重叠；这与「等人」语义一致。[E: packages/core/tools/src/index.ts:1278]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`；flush 后若已 abort，body 不跑。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`；本工具未声明，包装器直接 `next()`，**没有**截止时间。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]
- **body**：`defineTool` 先 `validateArgs`，再进 `apply` 里的 `execute`。`exec.signal` 原样传给 `ask({ signal })`。[E: packages/core/tools/src/schema.ts:586][E: packages/interaction/tool-ask-user/src/index.ts:90][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:216]
- **`tools/post-execute`**：本插件不注册 listener，默认 `accept`。[E: packages/core/tools/src/index.ts:1745]
- **sandbox / approval**：不挂。没有文件副作用，也没有 per-call sandbox stamp。

`code` preset（picker **PTC 模式**）下，模型能直接调的 **唯一** wire 工具是 `run_code`。`ask_user_question` 仍在 registry / SDK 里：`wireSchemas` 在 `mode === 'code'` 时只交出名为 `run_code` 的 schema；`sdkSchemas` 则投影除 `run_code` 以外的可见定义。模型直呼 `ask_user_question` 会在 **policy 之前** collapse；从 `run_code` 程序里 `await tools.ask_user_question(args)` 带着 `parent` token（`nested === true`），不 collapse，重入完整守卫，但 checkpoint 对 `exec.parent !== undefined` 直接 `next()`。[E: packages/core/tools/src/index.ts:994][E: packages/core/tools/src/index.ts:996][E: packages/core/tools/src/index.ts:1241][E: packages/core/tools/src/index.ts:1325][E: packages/session/session-checkpoint-policy/src/index.ts:71][E: apps/cli/tests/web-agent-presets.e2e.ts:301]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。仓库里有 `@deepseek-ai/dsh-tool-ask-user` ≠ 每个会话都装。

| preset | 装 `@deepseek-ai/dsh-tool-ask-user`？ | `disabled` | isolate | shipped Config | 说明 |
|---|---|---|---|---|---|
| `minimal` | **否** | — | 无此行 | — | yml 只有 persona + persistent bash + `str_replace_editor`。装配后模型工具是 `['bash', 'str_replace_editor']`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59][E: apps/cli/tests/web-agent-presets.e2e.ts:227] |
| `standard` | **是** | 无 | 无（只往 host `tools` 注册） | 无 `config` | `- id: tool-ask-user` / `name: '@deepseek-ai/dsh-tool-ask-user'`。Web e2e 的 standard catalog 以 `ask_user_question` 打头。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:237][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:238][E: apps/cli/tests/web-agent-presets.e2e.ts:207] |
| `code` | **是** | 无 | 无 | 无 `config` | 与 standard 同一行。Code Mode 只换呈现（唯一 wire = `run_code`），工具行仍在。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:238][E: apps/cli/config/agent-presets/code/agent.cordis.yml:239] |
| `cordis` | **是** | 无 | 无 | 无 `config` | 同样 remount，位置在 `tool-ralph` 之后、`tool-todo` 之前。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:225][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:226] |

Web 组合把模型可见工具全部赶到 per-session preset：全局层 `toolNames(ctx)` 为空，`ask_user_question` 也包括在内。[E: apps/cli/tests/web-agent-presets.e2e.ts:157]

其它 composition 可以自行挂这一行。例如 `examples/acp-agent/child-question.cordis.yml` 同时 insert `user-questions`、`tool-ask-user` 和一个 tripwire provider，用来钉死 child 不能等人——那是 example，不是 shipped 产品默认。[E: examples/acp-agent/child-question.cordis.yml:9][E: examples/acp-agent/child-question.cordis.yml:11]

## execute() 走读

符号：`apply` @ `packages/interaction/tool-ask-user/src/index.ts`，`UserQuestionService.ask` @ `packages/interaction/user-questions/src/index.ts`，Web 等待 @ `createApiProxy`。

1. **校验参数。** `defineTool` 的 wrapper 对隐式 schema 跑 `validate`；缺 `questions`、题上缺 `id`/`question`、option 缺 `label` 会抛 `ToolArgsError`（`INVALID_ARGS`），到不了 `ask`。[E: packages/core/tools/src/schema.ts:586][E: packages/core/tools/src/schema.ts:466]

2. **投影成 seam 请求。** `execute` 把每题映射为 `AskUserQuestionItem`：拷 `id` / `question`；有则拷 `header` / `options`；把 `multi_select` 改名为 `multiSelect`。有 `exec.agent` 就写入 `agent`；始终带 `signal: exec.signal`。[E: packages/interaction/tool-ask-user/src/index.ts:81][E: packages/interaction/tool-ask-user/src/index.ts:87][E: packages/interaction/tool-ask-user/src/index.ts:89][E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:240]

3. **service 入口守卫（先于 provider）。** `UserQuestionService.ask` 顺序：
   - `signal.aborted` → `ASK_ABORTED`，`provider.ask` 不会被调用。[E: packages/interaction/user-questions/src/index.ts:93][E: packages/interaction/user-questions/tests/user-questions.spec.ts:81]
   - `questions.length === 0` → `EMPTY_QUESTIONS`。[E: packages/interaction/user-questions/src/index.ts:96]
   - 若带了 `agent`：必须 `ctx.agents.get(agent.id) === agent`（精确 live 实例，不是同 id 的旧对象），且 `agents.roots().includes(agent)`。边界按 **runtime 所有权**，不按 durable session lineage：带着 lineage 恢复出来的新 runtime root 可以问；正在跑的 child 不行。[E: packages/interaction/user-questions/src/index.ts:102][E: packages/interaction/user-questions/src/index.ts:107][E: packages/interaction/user-questions/tests/user-questions.spec.ts:132][E: packages/interaction/user-questions/tests/user-questions.spec.ts:160]
   - 若某题声明了 `intent`：approve label 必须是本题某个 option；且必须带 `detail`。本工具不发 `intent`，这一步是给 plan-review 等调用方的。[E: packages/interaction/user-questions/src/index.ts:124]
   - `this.provider === undefined` → `NO_PROVIDER`。[E: packages/interaction/user-questions/src/index.ts:136]

4. **交给唯一 UI provider。** 成功路径就是 `return this.provider.ask(request)`。[E: packages/interaction/user-questions/src/index.ts:139] Web provider 没有 `agent` 立刻 `ASK_MISSING_AGENT`；否则分配 `RpcId`，把 `{ type: 'question/requested', sessionId, questions }` 推进每条 mux 队列，并监听 `signal` abort。[E: packages/host/apiproxy/src/api-proxy.ts:1372][E: packages/host/apiproxy/src/api-proxy.ts:1392]

5. **人在 composer 里答。** `QuestionComposer`：单选点一项就进下一题；多选是 checkbox；可以写 custom（单选 custom 会清掉 `selected`，多选保留已勾选项）；可以 skip（`selected: []` 且无 `custom`）。提交走 `pending.answer`。[E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:101][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:133][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:167][E: packages/client/ui-user-questions/src/client/QuestionComposer.tsx:181]

6. **`respond` 结算。** `ok: false` 且 `error.code === 'cancelled'` → `ASK_CANCELLED`。`ok: true` 则按 `matchesQuestions` 核对 session / 题数 / id 对齐 / 无重复 label / 非空 custom / 单选互斥 / label∈options，失败回 `accepted: false`（问卷仍挂着）。通过则 `resolve` 答案。[E: packages/host/apiproxy/src/api-proxy.ts:3713][E: packages/host/apiproxy/src/api-proxy.ts:3719][E: packages/host/apiproxy/src/api-proxy.ts:3736][E: packages/host/apiproxy/src/api-proxy.ts:3740]

7. **投影回规范值。** `execute` 把每条 answer 收成 `{ id, selected: [...], custom? }`，去掉 `undefined` 的 `custom`。[E: packages/interaction/tool-ask-user/src/index.ts:92]

8. **registry 投影。** `createSuccessResult` 校验 output schema，再 `JSON.stringify` 成一段 text。loop `append('tool/result')`。turn 取消若发生在 body 已开始之后，registry 只在结果 **还不是** `isError` 时换成 `ABORTED`；工具自己已经结构化失败（例如 `ASK_ABORTED`）会保留原码。[E: packages/core/tools/src/index.ts:1793][E: packages/core/tools/src/index.ts:1800][E: packages/core/tools/src/index.ts:1592][E: packages/core/agent-loop/src/tool-calls.ts:281]

## 设计动机·edge

和 Claude Code 的 `AskUserQuestion` 方言很近：一批题、每题 `id` + options、推荐项写在 label 里、可选 `header`、可选多选。DSH 的差异落在 **组合缝** 而不是又发明一套问卷 JSON：

- **Consumer / Definition / Provider 拆开。** 模型工具可以在没有 UI 的 composition 里存在（execute 才 `NO_PROVIDER`）；也可以只挂服务、不挂工具。example 的 child-question tripwire 就是这种拆法。
- **wire 用 `multi_select`，seam / mux / UI 用 `multiSelect`。** 映射只发生在这一个 `execute` 里。
- **不把 plan-review 塞进这支工具。** `intent` + `detail` 留给 `exit_plan_mode`，避免模型用问卷假装「计划已批准」。
- **runtime root 才能等人。** 所有权看 `agents.roots()`，不看 `delegationDepth`。恢复出来的 lineage root 可以问；活着的 child 必须把问题写进 `report` / 最终结果。
- **单槽 provider。** 不会静默替换正在等人的 UI。
- **答案协议允许 skip 与 Other。** skip = 空 `selected`；Other = `custom`。Web 单选不允许「既点了选项又写 custom」。
- **无人值守部署会结构化失败，而不是挂死。** 缺 provider 立刻 `NO_PROVIDER`；缺 agent 的 Web 通道立刻 `ASK_MISSING_AGENT`。
- **exclusive + 无 timeout。** 等人不是短 I/O；截止时间由 turn abort / 人取消驱动，不由 `timeout-policy`。

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
- packages/core/agent/src/index.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/index.ts
- packages/host/apiproxy/src/api/events.schema.ts
- packages/host/apiproxy/tests/api-proxy-question.spec.ts
- packages/client/ui-tool/src/client/tool/toolviews/ask-question-row.tsx
- packages/client/ui-user-questions/src/client/QuestionComposer.tsx
- packages/plan/plan-mode/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts
- examples/acp-agent/child-question.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute`；本工具不挂 approval / sandbox / timeout。
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表。
- [user-questions 子系统](../../subsystems/interaction/user-questions.md) — `ctx.userQuestions` 的 Definition / Provider 合同、错误码与 live-root 边界。
