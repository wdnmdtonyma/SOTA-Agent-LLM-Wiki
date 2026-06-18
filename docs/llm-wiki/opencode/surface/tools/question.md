---
id: tool.question
title: Question 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/question.ts, packages/opencode/src/tool/question.txt, packages/opencode/src/question/index.ts, packages/opencode/src/tool/registry.ts, packages/opencode/src/effect/runtime-flags.ts, packages/opencode/src/tool/tool.ts, packages/core/src/tool/question.ts, packages/core/src/question.ts, packages/core/src/tool/builtins.ts, packages/core/src/tool/registry.ts]
symbols: [QuestionTool, Question, QuestionV2]
related: [integrations.question, ref.tool-catalog]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Question 工具允许模型在执行中暂停并向用户提问；V1 通过 `Question.Service.ask()` 直接挂 pending Deferred，V2 在调用 `QuestionV2.ask()` 前先走 `permission.assert({ action: "question" })`。

## 能回答的问题

- `question` 工具在 V1 什么时候会被 registry 暴露？
- `Question.Prompt` 包含哪些字段，`custom` 是否可由 tool input 设置？
- V1 与 V2 的 question pending/reply/reject 事件名是什么？
- V2 question permission action/resources 是什么？
- 模型最终看到的 answers 文本如何格式化？

## V1

### 1 Identity

V1 `QuestionTool` 通过 `Tool.define("question", ...)` 注册；registry 初始化 `question`，但只有 `flags.client` 是 `app`、`cli`、`desktop` 或 `OPENCODE_ENABLE_QUESTION_TOOL` 开启时才放入 builtin 列表。[E: packages/opencode/src/tool/question.ts:14][E: packages/opencode/src/tool/question.ts:15][E: packages/opencode/src/tool/registry.ts:212][E: packages/opencode/src/effect/runtime-flags.ts:41][E: packages/opencode/src/tool/registry.ts:196][E: packages/opencode/src/tool/registry.ts:221]

### 2 用途定位

V1 prompt 说明 Question 用来收集用户偏好/需求、澄清模糊指令、获取实现决策或给用户选择方向。[E: packages/opencode/src/tool/question.txt:1][E: packages/opencode/src/tool/question.txt:2][E: packages/opencode/src/tool/question.txt:3][E: packages/opencode/src/tool/question.txt:4][E: packages/opencode/src/tool/question.txt:5]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `questions` | mutable array of `Question.Prompt` | 是 | 无 | 每项必须含 question/header/options，可选 multiple | 要问用户的问题列表。[E: packages/opencode/src/tool/question.ts:6][E: packages/opencode/src/tool/question.ts:7][E: packages/opencode/src/question/index.ts:24][E: packages/opencode/src/question/index.ts:25][E: packages/opencode/src/question/index.ts:28][E: packages/opencode/src/question/index.ts:31][E: packages/opencode/src/question/index.ts:34][E: packages/opencode/src/question/index.ts:47] |
| `questions[].question` | `string` | 是 | 无 | 完整问题文本 | 用户看到的问题。[E: packages/opencode/src/question/index.ts:25] |
| `questions[].header` | `string` | 是 | 无 | description 写 max 30 chars | 短标题。[E: packages/opencode/src/question/index.ts:28][E: packages/opencode/src/question/index.ts:29] |
| `questions[].options` | array of option | 是 | 无 | option 有 label/description | 选择项。[E: packages/opencode/src/question/index.ts:15][E: packages/opencode/src/question/index.ts:18][E: packages/opencode/src/question/index.ts:31][E: packages/opencode/src/question/index.ts:32] |
| `questions[].multiple` | optional `boolean` | 否 | 无 | schema optional | 是否允许多选。[E: packages/opencode/src/question/index.ts:34][E: packages/opencode/src/question/index.ts:35] |
| `questions[].custom` | 不在 tool input schema 中 | 否 | UI/service convention | `Question.Info` 有 custom，但 `Question.Prompt` 没有 custom | tool prompt 讲 custom，但模型不能通过 `QuestionTool.Parameters` 传该字段。[E: packages/opencode/src/tool/question.ts:7][E: packages/opencode/src/question/index.ts:39][E: packages/opencode/src/question/index.ts:41][E: packages/opencode/src/question/index.ts:47][E: packages/opencode/src/tool/question.txt:8] |

### 4 输出 & 大小/截断限制

V1 execute 把 answers 格式化为 `"question"="answer1, answer2"`，没有 answer 时写 `Unanswered`；output 是 `User has answered your questions: ...`，metadata 保存 `answers`。[E: packages/opencode/src/tool/question.ts:30][E: packages/opencode/src/tool/question.ts:31][E: packages/opencode/src/tool/question.ts:36][E: packages/opencode/src/tool/question.ts:38] 通用 output bounding 仍由 V1 `Tool.define` wrapper 处理。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:141]

### 5 权限

V1 QuestionTool 本身不调用 `ctx.ask` permission；它直接调用 `Question.Service.ask()`。V1 访问控制主要体现在 registry 是否暴露 `question` 工具，以及 session/agent 是否能看到该 tool。[E: packages/opencode/src/tool/question.ts:24][E: packages/opencode/src/tool/registry.ts:196][E: packages/opencode/src/tool/registry.ts:221][I]

### 6 execute() 走读

1. V1 execute 调 `question.ask({ sessionID, questions, tool })`，如果当前 tool context 有 callID，就把 `{ messageID, callID }` 写进 question request。[E: packages/opencode/src/tool/question.ts:24][E: packages/opencode/src/tool/question.ts:25][E: packages/opencode/src/tool/question.ts:26][E: packages/opencode/src/tool/question.ts:27]
2. `Question.ask()` 生成 `QuestionID.ascending()`，创建 Deferred，放入 pending map，发布 `question.asked` event，然后等待 Deferred。[E: packages/opencode/src/question/index.ts:88][E: packages/opencode/src/question/index.ts:158][E: packages/opencode/src/question/index.ts:159][E: packages/opencode/src/question/index.ts:162][E: packages/opencode/src/question/index.ts:169][E: packages/opencode/src/question/index.ts:170][E: packages/opencode/src/question/index.ts:173]
3. reply 会发布 `question.replied` 并 succeed Deferred；reject 会发布 `question.rejected` 并 fail `RejectedError`。[E: packages/opencode/src/question/index.ts:89][E: packages/opencode/src/question/index.ts:90][E: packages/opencode/src/question/index.ts:192][E: packages/opencode/src/question/index.ts:197][E: packages/opencode/src/question/index.ts:209][E: packages/opencode/src/question/index.ts:213]

## V2

### 1 Identity

V2 `QuestionTool` name 是 `"question"`，在 V2 builtins 中注册；源码没有 V1 的 client gate。[E: packages/core/src/tool/question.ts:10][E: packages/core/src/tool/question.ts:52][E: packages/core/src/tool/question.ts:53][E: packages/core/src/tool/builtins.ts:37][I]

### 2 用途定位

V2 description 直接写在源码字符串里，包括 ask-user 场景、custom usage notes、answers array 和 recommended option 约定。[E: packages/core/src/tool/question.ts:12][E: packages/core/src/tool/question.ts:19][E: packages/core/src/tool/question.ts:20][E: packages/core/src/tool/question.ts:21]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `questions` | array of `QuestionV2.Prompt` | 是 | 无 | 每项含 question/header/options，可选 multiple | 要问用户的问题列表。[E: packages/core/src/tool/question.ts:24][E: packages/core/src/question.ts:21][E: packages/core/src/question.ts:22][E: packages/core/src/question.ts:23][E: packages/core/src/question.ts:24][E: packages/core/src/question.ts:25][E: packages/core/src/question.ts:36] |
| `questions[].question` | `string` | 是 | 无 | 完整问题文本 | 用户看到的问题。[E: packages/core/src/question.ts:22] |
| `questions[].header` | `string` | 是 | 无 | description 写 max 30 chars | 短标题。[E: packages/core/src/question.ts:23] |
| `questions[].options` | array of option | 是 | 无 | option 有 label/description | 选择项。[E: packages/core/src/question.ts:16][E: packages/core/src/question.ts:17][E: packages/core/src/question.ts:24] |
| `questions[].multiple` | optional `boolean` | 否 | 无 | schema optional | 是否允许多选。[E: packages/core/src/question.ts:25] |
| `questions[].custom` | 不在 tool input schema 中 | 否 | UI/service convention | `QuestionV2.Info` 有 custom，但 `QuestionV2.Prompt` 没有 custom | V2 tool input 也不能设置 custom。[E: packages/core/src/tool/question.ts:24][E: packages/core/src/question.ts:28][E: packages/core/src/question.ts:30][E: packages/core/src/question.ts:36] |

### 4 输出 & 大小/截断限制

V2 output schema 是 `{ answers: QuestionV2.Answer[] }`；`toModelOutput()` 生成与 V1 同形的 `User has answered your questions: ...` 文本。[E: packages/core/src/tool/question.ts:27][E: packages/core/src/tool/question.ts:28][E: packages/core/src/tool/question.ts:32][E: packages/core/src/tool/question.ts:42][E: packages/core/src/tool/question.ts:57][E: packages/opencode/src/tool/question.ts:36][I] V2 generic bounding 由 registry settle 阶段处理。[E: packages/core/src/tool/registry.ts:73][E: packages/core/src/tool/registry.ts:74]

### 5 权限

V2 QuestionTool 在 ask 前执行 `permission.assert({ action: "question", resources: ["*"] })`；permission failure 被映射为 `ToolFailure({ message: "Permission denied: question" })`。[E: packages/core/src/tool/question.ts:62][E: packages/core/src/tool/question.ts:63][E: packages/core/src/tool/question.ts:64][E: packages/core/src/tool/question.ts:70]

### 6 execute() 走读

1. V2 先 assert question permission。[E: packages/core/src/tool/question.ts:62][E: packages/core/src/tool/question.ts:63]
2. permission 通过后调用 `question.ask({ sessionID, questions, tool })`，tool 总是带 assistant message id 和 tool call id。[E: packages/core/src/tool/question.ts:73][E: packages/core/src/tool/question.ts:74][E: packages/core/src/tool/question.ts:76]
3. `QuestionV2.ask()` 创建 `ID.ascending()`、Deferred 和 pending entry，发布 `question.v2.asked`，等待 reply/reject。[E: packages/core/src/question.ts:64][E: packages/core/src/question.ts:140][E: packages/core/src/question.ts:143][E: packages/core/src/question.ts:144][E: packages/core/src/question.ts:146][E: packages/core/src/question.ts:147][E: packages/core/src/question.ts:148]
4. V2 reply/reject 事件名分别是 `question.v2.replied` 与 `question.v2.rejected`。[E: packages/core/src/question.ts:63][E: packages/core/src/question.ts:66][E: packages/core/src/question.ts:73][E: packages/core/src/question.ts:74]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 暴露门控 | client 是 app/cli/desktop 或 `OPENCODE_ENABLE_QUESTION_TOOL` 才放入 builtin。[E: packages/opencode/src/effect/runtime-flags.ts:41][E: packages/opencode/src/tool/registry.ts:196][E: packages/opencode/src/tool/registry.ts:221] | V2 builtins 直接注册 question，没有 V1 的 client gate。[E: packages/core/src/tool/builtins.ts:37][I] |
| 权限 | Tool execute 不调用 permission ask。[E: packages/opencode/src/tool/question.ts:24][I] | Tool execute 调 `permission.assert({ action: "question" })`。[E: packages/core/src/tool/question.ts:62][E: packages/core/src/tool/question.ts:63] |
| Event 名 | `question.asked/replied/rejected`。[E: packages/opencode/src/question/index.ts:88][E: packages/opencode/src/question/index.ts:89][E: packages/opencode/src/question/index.ts:90] | `question.v2.asked/replied/rejected`。[E: packages/core/src/question.ts:64][E: packages/core/src/question.ts:66][E: packages/core/src/question.ts:74] |
| `custom` 字段 | `Question.Info` 有 optional custom，但 tool input 是 `Question.Prompt`，不含 custom。[E: packages/opencode/src/tool/question.ts:7][E: packages/opencode/src/question/index.ts:41][E: packages/opencode/src/question/index.ts:47] | V2 同样用 `QuestionV2.Prompt`，不含 custom。[E: packages/core/src/tool/question.ts:24][E: packages/core/src/question.ts:30][E: packages/core/src/question.ts:36] |

## 设计动机·edge·历史

Question 的 prompt 说 custom 默认启用，但工具 schema 选的是 `Prompt` 而不是 `Info`，所以 `custom` 是 UI/request model 的可选字段，不是 LLM tool input 字段。[E: packages/opencode/src/tool/question.txt:8][E: packages/opencode/src/tool/question.ts:7][E: packages/opencode/src/question/index.ts:39][E: packages/opencode/src/question/index.ts:47][E: packages/core/src/tool/question.ts:24][E: packages/core/src/question.ts:28][E: packages/core/src/question.ts:36][I]

## Sources

- packages/opencode/src/tool/question.ts
- packages/opencode/src/tool/question.txt
- packages/opencode/src/question/index.ts
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/core/src/tool/question.ts
- packages/core/src/question.ts
- packages/core/src/tool/builtins.ts
- packages/core/src/tool/registry.ts

## 相关

- [Ask-user / Question](../../subsystems/integrations/question.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
