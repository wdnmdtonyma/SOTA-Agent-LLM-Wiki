---
id: integrations.question
title: Question integration
kind: subsystem
tier: T2
v: shared
status: verified
updated: 8b68dc0d7
source:
  - packages/opencode/src/question/index.ts
  - packages/opencode/src/question/schema.ts
  - packages/opencode/src/tool/question.ts
  - packages/opencode/src/tool/registry.ts
  - packages/opencode/src/server/routes/instance/httpapi/groups/question.ts
  - packages/opencode/src/server/routes/instance/httpapi/handlers/question.ts
  - packages/core/src/question.ts
  - packages/core/src/tool/question.ts
  - packages/core/src/session/runner/llm.ts
  - packages/core/src/plugin/agent.ts
  - packages/schema/src/v1/question.ts
  - packages/schema/src/question.ts
  - packages/protocol/src/groups/question.ts
  - packages/server/src/handlers/question.ts
symbols:
  - Question.Service
  - Question.Event.Asked
  - QuestionTool
  - QuestionV2.Service
  - QuestionV2.Event.Asked
related:
  - tool.question
evidence: explicit
---

> Question integration 是模型向用户提出结构化问题的中断点；V1/V2 都有 pending-question service、question tool、reply/reject API，但事件命名、permission model、HTTP route 和 runner 中断语义不同。

## 能回答的问题

- question tool 的输入 schema、pending request、answer/reply 是什么结构。
- V1 question tool 何时注册，HTTP endpoint 如何 reply/reject。
- V2 question service 为什么说 pending prompt 属于 Location。
- 拒绝 question 对 V2 LLM runner 有什么影响。
- agent permission 如何默认控制 question tool。

## V1

### 职责

V1 `Question.Service` 管理 pending question map，提供 ask/reply/reject/list，并通过 event bus 发布 asked/replied/rejected。[E: packages/opencode/src/question/index.ts:48] [E: packages/opencode/src/question/index.ts:87] V1 `question` tool 把模型输入的问题数组传给 service，并把答案格式化成 text output。[E: packages/opencode/src/tool/question.ts:14] [E: packages/opencode/src/tool/question.ts:22]

### 数据模型

`Question.Option` 包含必填 `label` 和必填 `description`。[E: packages/schema/src/v1/question.ts:15] [E: packages/schema/src/v1/question.ts:17] question base fields 是必填 `question`、`header`、`options`，以及可选 `multiple`。[E: packages/schema/src/v1/question.ts:20] [E: packages/schema/src/v1/question.ts:21] [E: packages/schema/src/v1/question.ts:22] [E: packages/schema/src/v1/question.ts:23] [E: packages/schema/src/v1/question.ts:24] pending request 包含 `id`、`sessionID`、`questions`、可选 `tool`，其中 `tool` 带 messageID/callID。[E: packages/schema/src/v1/question.ts:35] [E: packages/schema/src/v1/question.ts:32] reply payload 只有 `answers`，每个 answer 是 string array。[E: packages/schema/src/v1/question.ts:41] [E: packages/schema/src/v1/question.ts:42]

### 控制流

1. `ask(sessionID, questions, tool?)` 通过 `QuestionID.ascending()` 创建 `que` 前缀 id，创建 deferred，把 request 放入 pending map，发布 `question.asked` event。[E: packages/opencode/src/question/index.ts:93] [E: packages/schema/src/v1/question.ts:10] [E: packages/schema/src/v1/question.ts:12] [E: packages/opencode/src/question/index.ts:96] [E: packages/opencode/src/question/index.ts:97] [E: packages/opencode/src/question/index.ts:103] [E: packages/opencode/src/question/index.ts:104]
2. `ask` 等待 deferred；无论成功失败，退出时都会从 pending map 删除该 id。[E: packages/opencode/src/question/index.ts:106] [E: packages/opencode/src/question/index.ts:109]
3. `reply(input)` 先检查 pending map；不存在时返回 NotFoundError。[E: packages/opencode/src/question/index.ts:114]
4. reply 成功时删除 pending、发布 `question.replied`、resolve deferred。[E: packages/opencode/src/question/index.ts:124] [E: packages/opencode/src/question/index.ts:129]
5. `reject(id)` 同样先查 pending；成功时删除 pending、发布 `question.rejected`、让 deferred fail。[E: packages/opencode/src/question/index.ts:134] [E: packages/opencode/src/question/index.ts:141]
6. service finalizer 会 reject 所有 pending question 并清空 map，避免进程关闭时留下悬挂 deferred。[E: packages/opencode/src/question/index.ts:74]

### Tool 与 API

1. V1 `question` tool 参数是 `questions: Array(Question.Prompt)`。[E: packages/opencode/src/tool/question.ts:6]
2. tool 执行时把 sessionID 和可选 tool call source 传给 `Question.ask`。[E: packages/opencode/src/tool/question.ts:22]
3. registry 中 `question` tool 只在 client 是 app/cli/desktop 或显式 `enableQuestionTool` 时加入 built-in tool list。[E: packages/opencode/src/tool/registry.ts:195] [E: packages/opencode/src/tool/registry.ts:220]
4. V1 HTTP route group root 是 `/question`，定义 list/reply/reject endpoints。[E: packages/opencode/src/server/routes/instance/httpapi/groups/question.ts:11] [E: packages/opencode/src/server/routes/instance/httpapi/groups/question.ts:22] [E: packages/opencode/src/server/routes/instance/httpapi/groups/question.ts:32] [E: packages/opencode/src/server/routes/instance/httpapi/groups/question.ts:45]
5. V1 route handler 的 `reply` 和 `reject` 直接调用 `Question.Service`，并把 `Question.NotFoundError` 映射为 `QuestionNotFoundError` HTTP error。[E: packages/opencode/src/server/routes/instance/httpapi/handlers/question.ts:20] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/question.ts:26] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/question.ts:39] [E: packages/opencode/src/server/routes/instance/httpapi/handlers/question.ts:40]

## V2

### 职责

V2 `QuestionV2.Service` 是 core service，接口同样是 ask/reply/reject/list，但 question id 由 schema `ascending()` 生成，prefix 是 `que`。[E: packages/core/src/question.ts:56] [E: packages/schema/src/question.ts:10] [E: packages/schema/src/question.ts:13]

V2 question service 导出 `locationLayer = layer`，pending map 在该 layer 内创建，finalizer 会 fail pending deferred；这让 pending prompts 的生命周期跟随 Location layer。[E: packages/core/src/question.ts:79] [E: packages/core/src/question.ts:81] [E: packages/core/src/question.ts:151] [I]

### 数据模型

V2 `Question.Option`、base question、Info/Prompt/Tool/Request/Answer/Reply 与 V1 结构相近，但事件名称带 `question.v2.*` 前缀。[E: packages/schema/src/question.ts:22] [E: packages/schema/src/question.ts:70] V2 request 同样包含 `id`、`sessionID`、`questions`、可选 `tool`。[E: packages/schema/src/question.ts:52] [E: packages/schema/src/question.ts:56]

### 控制流

1. V2 `ask` 用 `uninterruptibleMask` 包裹，生成 id、deferred、request，写入 pending map，发布 `question.v2.asked`。[E: packages/core/src/question.ts:93] [E: packages/core/src/question.ts:96] [E: packages/core/src/question.ts:97] [E: packages/core/src/question.ts:98] [E: packages/core/src/question.ts:99] [E: packages/core/src/question.ts:100]
2. `ask` 等待 deferred，并在退出时从 pending map 删除 id。[E: packages/core/src/question.ts:101] [E: packages/core/src/question.ts:104]
3. `reply` 在 uninterruptible 区域查 pending、发布 `question.v2.replied`、resolve deferred、删除 pending。[E: packages/core/src/question.ts:112] [E: packages/core/src/question.ts:115] [E: packages/core/src/question.ts:117] [E: packages/core/src/question.ts:122] [E: packages/core/src/question.ts:123]
4. `reject` 查 pending、发布 `question.v2.rejected`、fail deferred、删除 pending。[E: packages/core/src/question.ts:128] [E: packages/core/src/question.ts:131] [E: packages/core/src/question.ts:133] [E: packages/core/src/question.ts:137] [E: packages/core/src/question.ts:138]
5. finalizer 会 fail 所有 pending deferred 并清空 map。[E: packages/core/src/question.ts:81]

### Tool、permission、runner

1. V2 tool name 是 `question`，description 明确说模型可以通过它向用户询问信息。[E: packages/core/src/tool/question.ts:12] [E: packages/core/src/tool/question.ts:14]
2. tool input 是 questions array，output 是 answers array，model output 把每个 answer 格式化为文本块。[E: packages/core/src/tool/question.ts:25] [E: packages/core/src/tool/question.ts:34]
3. V2 tool 执行前做 permission assert，action 是 `question`，resources 是 `*`，并带 sessionID、agent、tool-call source；源码没有在 question permission assert 里传 `save` 字段。[E: packages/core/src/tool/question.ts:63] [E: packages/core/src/tool/question.ts:65] [E: packages/core/src/tool/question.ts:66] [E: packages/core/src/tool/question.ts:65] [E: packages/core/src/tool/question.ts:69]
4. permission denied 会映射成 tool failure，而不是直接抛普通异常给 runner。[E: packages/core/src/tool/question.ts:71]
5. V2 LLM runner 把 `QuestionV2.RejectedError` 识别为特殊 rejection，用于后续中断处理。[E: packages/core/src/session/runner/llm.ts:144] [E: packages/core/src/session/runner/llm.ts:145]
6. 当 question rejected 时，runner 会清理 running tool fibers、失败未 settled tools，并 interrupt。[E: packages/core/src/session/runner/llm.ts:292] [E: packages/core/src/session/runner/llm.ts:293] [E: packages/core/src/session/runner/llm.ts:294] [E: packages/core/src/session/runner/llm.ts:295]
7. V2 默认 agent 插件里，基础默认 permission deny question，但 default agent 和 plan agent 又显式 allow question。[E: packages/core/src/plugin/agent.ts:115] [E: packages/core/src/plugin/agent.ts:130] [E: packages/core/src/plugin/agent.ts:142]

### Server API

V2 server question group 定义全局 pending list、按 session list、reply、reject 四类 endpoint：`GET /api/question/request`、`GET /api/session/:sessionID/question`、`POST /api/session/:sessionID/question/:requestID/reply`、`POST /api/session/:sessionID/question/:requestID/reject`。[E: packages/protocol/src/groups/question.ts:20] [E: packages/protocol/src/groups/question.ts:37] [E: packages/protocol/src/groups/question.ts:52] [E: packages/protocol/src/groups/question.ts:68]

handler 用 `withOwnedQuestion` 校验 question 存在且 `sessionID` 匹配；不存在或 session 不匹配都会走 `missingRequest(requestID)` 的 not-found 语义。[E: packages/server/src/handlers/question.ts:14] [E: packages/server/src/handlers/question.ts:20] [E: packages/server/src/handlers/question.ts:21] session list endpoint 会按 request.sessionID 过滤。[E: packages/server/src/handlers/question.ts:35] [E: packages/server/src/handlers/question.ts:36]

## V1 / V2 差异表

| 维度 | V1 | V2 |
| --- | --- | --- |
| event name | `question.asked/replied/rejected` | `question.v2.asked/replied/rejected` |
| id generator | `QuestionID.ascending()` with `que` prefix [E: packages/schema/src/v1/question.ts:10] [E: packages/schema/src/v1/question.ts:12] | ascending identifier with `que` prefix [E: packages/schema/src/question.ts:10] [E: packages/schema/src/question.ts:13] |
| tool gating | registry 按 client/flag 启用 | built-in tool + permission assert |
| HTTP routes | instance HttpApi `/question/*` | server API `/api/.../question...` |
| rejection behavior | service deferred fail；runner 语义不在本节点源文件体现。[I] | LLM runner 明确 halt loop/interrupt。 |

## 设计动机与权衡

question service 把“模型需要用户输入”建模为 pending deferred，而不是把用户答案同步塞进 tool execution；这允许 UI/API 在稍后 reply 或 reject。[I] V1 和 V2 都在 ask 时保存 pending request 并等待 deferred。[E: packages/opencode/src/question/index.ts:97] [E: packages/core/src/question.ts:98] [E: packages/core/src/question.ts:101]

V2 把 pending prompts 的 pending map 放在 location layer 中，配合 finalizer 自动 fail pending deferred，避免 Location 结束后仍有悬挂用户问题。[I] 源码中的 pending map、finalizer、`locationLayer` export 共同体现这一点。[E: packages/core/src/question.ts:79] [E: packages/core/src/question.ts:81] [E: packages/core/src/question.ts:151]

## 易踩坑

- V1 `question` tool 不是总是给模型可见；registry 受 client/flag 控制。[E: packages/opencode/src/tool/registry.ts:194]
- V2 question denied 会变成 tool failure，不是普通 permission exception 泄漏给模型。[E: packages/core/src/tool/question.ts:71]
- V2 reply/reject 必须匹配 sessionID；handler 会阻止跨 session 操作 pending question。[E: packages/server/src/handlers/question.ts:21]
- 拒绝 V2 question 会中断 LLM loop，不能把 reject 当作“返回空答案继续执行”。[E: packages/core/src/session/runner/llm.ts:292] [E: packages/core/src/session/runner/llm.ts:295]

## Sources

- packages/opencode/src/question/index.ts
- packages/opencode/src/question/schema.ts
- packages/opencode/src/tool/question.ts
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/server/routes/instance/httpapi/groups/question.ts
- packages/opencode/src/server/routes/instance/httpapi/handlers/question.ts
- packages/core/src/question.ts
- packages/core/src/tool/question.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/plugin/agent.ts
- packages/schema/src/v1/question.ts
- packages/schema/src/question.ts
- packages/protocol/src/groups/question.ts
- packages/server/src/handlers/question.ts

## 相关

- tool.question
