---
id: subsys.interaction.user-questions
title: user-questions
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/interaction/user-questions/src/index.ts
  - packages/interaction/user-questions/src/types.ts
  - packages/interaction/user-questions/package.json
  - packages/interaction/user-questions/tests/user-questions.spec.ts
  - packages/interaction/tool-ask-user/src/index.ts
  - packages/interaction/tool-ask-user/package.json
  - packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/core/agent/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/llm/llm/src/error.ts
  - packages/api/remotes/src/remote-events.ts
  - packages/client/ui-user-questions/src/client/index.ts
  - packages/client/ui-user-questions/src/client/contract/slots.ts
  - packages/core/scope/src/scoped-events.generated.ts
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/test-support/session-snapshot/tests/fixtures/child-question-tripwire.ts
  - snapshots/session/subagent-child-question-rejection/cordis.yml
symbols:
  - ctx.userQuestions
  - UserQuestionService
  - UserQuestionError
  - AskUserQuestionRequest
  - user-questions/request
related:
  - spine.overview
  - surface.tools.ask-user-question
  - subsys.core.agent
  - subsys.interaction.approval
  - surface.tools.exit-plan-mode
  - spine.tool-call-anatomy
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: d347e70390
---

> `ctx.userQuestions` 是 **host 面** `UserQuestionService`：`ask()` 做 fail-closed 门控后，把请求丢进 Cordis waterfall `user-questions/request`。它不是 model-visible 工具，也不是 `ctx.approval` 那条 `ask | never` 审批缝。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。本仓没有 shipped TUI。

## 能回答的问题

- `ctx.userQuestions`、`ask_user_question`、`exit_plan_mode`、`ctx.approval` 各是哪一层？换 UI 会不会换问卷 JSON？
- 没有 listener 接受请求时抛什么？`next()` 一路传到尾巴是什么码？
- `ask()` 的检查顺序是什么？无 answerer 的 error code 是哪一个？
- 带 `agent` 时为什么必须是 **exact live runtime root**？`CALLER_NOT_LIVE` 和 `DELEGATED_CALLER` 差在哪？子代理能不能问人？
- `dsh-base` 挂的是 Definition 还是工具？`dsh-web-app` 会不会 disable 这一行？preset 谁装 `tool-ask-user`？

## 职责边界

本包 `@deepseek-ai/dsh-user-questions` 拥有： [E: packages/interaction/user-questions/package.json:2]

- Context 增强键 `userQuestions` 与 `UserQuestionService`（`super(ctx, 'userQuestions')`）。 [E: packages/interaction/user-questions/src/index.ts:17] [E: packages/interaction/user-questions/src/index.ts:67]
- `ask()` 入口门：已 abort / 空问题 / live-root / `intent` 完整性；通过后走 `ctx.waterfall('user-questions/request', …)`。 [E: packages/interaction/user-questions/src/index.ts:87] [E: packages/interaction/user-questions/src/index.ts:137]
- 浏览器可进的 wire 类型（`package.json` 的 `./types` 子路径）：`AskUserQuestionItem` / `AskUserQuestionAnswer` / `AskUserQuestionIntent` / `AskUserQuestionRequestEvent`。`types.ts` 没有 cordis / service import，client 链不必加载 `Context.userQuestions` 增强。 [E: packages/interaction/user-questions/package.json:25] [E: packages/interaction/user-questions/src/types.ts:33]
- Events 合同：`'user-questions/request'` 是 **waterfall**；listener 返回答案或 `next()`。带 agent 时 `this` 是 `Scoped<Agent>`。 [E: packages/interaction/user-questions/src/types.ts:85] [E: packages/interaction/user-questions/src/types.ts:88]
- `UserQuestionError`（`HarnessError` 子类，稳定 `code`）。 [E: packages/interaction/user-questions/src/index.ts:34] [E: packages/llm/llm/src/error.ts:17]

本包**不**拥有：

- `ask_user_question` 的 model schema / `defineTool` 注册 —— [`surface.tools.ask-user-question`](../../surface/tools/ask-user-question.md)。本页只把它当 Consumer。
- `ctx.approval`、`approval/request` waterfall、`allowed-once` —— [`subsys.interaction.approval`](./approval.md)。问卷和审批是两条缝。
- Web mux 帧、composer 组件。shipped Web answerer 挂在 client 行 `id: ui-user-questions`，经 `ctx.remote.$on('user-questions/request')` 接到 Host 转发的 waterfall。本页不写 UI 控件细节。 [E: packages/bundle/web-app/cordis.patch.yml:298] [E: packages/client/ui-user-questions/src/client/index.ts:104]
- 答案是否匹配选项、`id` 是否唯一：`ask()` 把门过完就把 request 交给 waterfall，不校验 `AskUserQuestionAnswer`。 [E: packages/interaction/user-questions/src/index.ts:135]
- 独立的 request/answer 审计流。

官方包 README 还可能把「permission plugin」写成调用方；shipped 源码里 `permission-presets` 不读 `ctx.userQuestions`。wiki 跟代码：生产 Consumer 是 `tool-ask-user` 与 `plan-mode`。[I]

`dsh-user-questions` 是 **host 面** Definition。agent-preset 面只 remount Consumer 行 `tool-ask-user`，不另造一份 `ctx.userQuestions`。

旧 API `registerProvider` / 单槽 `UserQuestionProvider` **已不存在**。answerer 是 waterfall listener，可以组合：先听的可以 `next()` 交给后面。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:78]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/interaction/user-questions/src/index.ts` | `UserQuestionService` / `UserQuestionError` / `AskUserQuestionRequest` / waterfall 调度 |
| `packages/interaction/user-questions/src/types.ts` | 无 Cordis runtime 的问卷 / 答案 / `plan-review` intent / Events |
| `packages/interaction/user-questions/package.json` | 包名 `@deepseek-ai/dsh-user-questions`；导出 `.` / `./types` |
| `packages/interaction/user-questions/tests/user-questions.spec.ts` | 无 answerer、dispose、abort、空批、live-root、stale 对象、`BAD_INTENT`、组合 `next()`、远程错误还原 |
| `packages/interaction/tool-ask-user/src/index.ts` | Consumer：`inject = ['tools', 'userQuestions']`，注册 `ask_user_question` |
| `packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts` | 投影、signal、`NO_PROVIDER` / `DELEGATED_CALLER` / 空批 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: user-questions` |
| `packages/bundle/web-app/cordis.patch.yml` | overlay **不** disable 该行；另插 `ui-user-questions` |
| `packages/core/agent/src/index.ts` | `agents.get` 身份、`roots()` = `owner === undefined` |
| `packages/plan/plan-mode/src/index.ts` | 第二 Consumer：`ctx.get('userQuestions')` + `intent: plan-review` |
| `packages/api/remotes/src/remote-events.ts` | Host 把 `user-questions/request` 标成可转发 waterfall |
| `packages/client/ui-user-questions/src/client/index.ts` | shipped Web：`ctx.remote.$on` 接到问卷 |
| `packages/client/ui-user-questions/src/client/contract/slots.ts` | `PendingQuestion.cancel` → `ASK_CANCELLED` |
| `packages/preset/agent-presets/presets/standard/agent.cordis.yml` | preset 面 `id: tool-ask-user` |
| `snapshots/session/subagent-child-question-rejection/cordis.yml` | snapshot tripwire，不是 shipped 产品默认 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `UserQuestionService` | `Service` 子类，键字面量 `'userQuestions'`。没有 `Config`，没有 `static inject`：`agents` 只在带 `agent` 的 `ask()` 里 `ctx.get('agents')`。 [E: packages/interaction/user-questions/src/index.ts:66] [E: packages/interaction/user-questions/src/index.ts:67] [E: packages/interaction/user-questions/src/index.ts:95] |
| `AskUserQuestionRequest` | 等于 `AskUserQuestionRequestEvent`：`{ questions, agent?, signal? }`。`agent` 出现时必须是 registry 里**同一个** live 对象，且是 runtime root。 [E: packages/interaction/user-questions/src/index.ts:31] [E: packages/interaction/user-questions/src/types.ts:67] |
| `AskUserQuestionItem` | `id` / `question`；可选 `detail` / `header` / `options` / `multiSelect` / `intent`。seam 字段是 camelCase `multiSelect`。 [E: packages/interaction/user-questions/src/types.ts:33] [E: packages/interaction/user-questions/src/types.ts:45] |
| `AskUserQuestionIntent` | 目前唯一 `kind` 是 `'plan-review'`。`approve` 是选项 **label**（按名，不按位）。intent 只改呈现，不改答案协议。 [E: packages/interaction/user-questions/src/types.ts:23] [E: packages/interaction/user-questions/src/types.ts:29] |
| `AskUserQuestionAnswer` | `{ answers: [{ id, selected: string[], custom? }] }`。服务不解释 skip / Other。 [E: packages/interaction/user-questions/src/types.ts:63] [E: packages/interaction/user-questions/src/types.ts:55] |
| `UserQuestionError` | `name = 'UserQuestionError'`，`code` 走 `HarnessError`。服务本体码：`ASK_ABORTED` / `EMPTY_QUESTIONS` / `CALLER_NOT_LIVE` / `DELEGATED_CALLER` / `BAD_INTENT` / `NO_PROVIDER`。answerer 还可以抛 `ASK_CANCELLED` 等，经 `restoreUserQuestionError` 还原。 [E: packages/interaction/user-questions/src/index.ts:37] [E: packages/interaction/user-questions/src/index.ts:53] [E: packages/llm/llm/src/error.ts:17] |

无 answerer 的 fail-closed 码是 **`NO_PROVIDER`**（文案 `no user-questions answerer accepted the request`），不是 `unavailable`。 [E: packages/interaction/user-questions/src/index.ts:132] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:58]

## 控制流

1. **host 面挂 Definition。** `dsh-base` 根 `insert` 写 `id: user-questions` / `name: '@deepseek-ai/dsh-user-questions'`，无 `config`。 [E: packages/bundle/base/cordis.patch.yml:64] [E: packages/bundle/base/cordis.patch.yml:65] manifest 依赖同名包。 [E: packages/bundle/base/package.json:122] 插件是 class default export：`export default UserQuestionService`。 [E: packages/interaction/user-questions/src/index.ts:154] 这一行提供 `ctx.userQuestions`，**不**注册 `ask_user_question`。`sdk-minimal` 不叠 `dsh-base`，因此默认没有这条 Definition，除非自己 insert。[I]

2. **`dsh-web-app` 不 disable；preset 不 remount 服务。** web overlay 会把若干 host 行标 `disabled: true`，但同一份文件里**没有** `id: user-questions` 行，因此不会关掉 base 挂上的服务。[I] overlay 另插 client 行 `id: ui-user-questions` / `name: '@deepseek-ai/dsh-client-ui-user-questions'`，这是呈现 + Remote Event listener，不是第二份 `UserQuestionService`。 [E: packages/bundle/web-app/cordis.patch.yml:298] [E: packages/bundle/web-app/cordis.patch.yml:298] `dsh-headless` 的 patch 没有 `user-questions` / `ui-user-questions` 行：Definition 从 base 继承，**没有** shipped headless answerer。[I] 四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）都不插 `id: user-questions`。[I]

3. **answerer 是 waterfall，不是单槽 provider。** 测试用 `ctx.on('user-questions/request', request => answerer.ask(request))` 注册。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:15] 第一个 listener 可以 `next()`，第二个再给答案。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:78] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:80] listener dispose 之后 `ask()` 仍是 `NO_PROVIDER`。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:71] 没有 `DUPLICATE_PROVIDER`：多个 listener 是合法组合，不是互斥替换。

4. **shipped Web 的 answerer 在 client，经 remotes 转发。** `API_REMOTE_FORWARDED_EVENTS` 把 `{ event: 'user-questions/request', mode: 'waterfall' }` 列入 Host 可转发集合。 [E: packages/api/remotes/src/remote-events.ts:34] 浏览器半边 `apply`：`ctx.remote.$on('user-questions/request', function (request, next) { return answerQuestion(...) })`。 [E: packages/client/ui-user-questions/src/client/index.ts:104] `answerQuestion` 用 `sessions.scopeOf(owner)` 对上 session；对不上就 `next()`。 [E: packages/client/ui-user-questions/src/client/index.ts:61] [E: packages/client/ui-user-questions/src/client/index.ts:62] 人关掉问卷时 `PendingQuestion.cancel()` 抛带 `code: 'ASK_CANCELLED'` 的 `UserQuestionError` 形状（文案 `the user cancelled ask_user_question`）。 [E: packages/client/ui-user-questions/src/client/contract/slots.ts:186] 这个码**不是** `UserQuestionService.ask` 自己构造的；服务会把跨 Typert 运输后的同名对象还原成真正的 `UserQuestionError`。 [E: packages/interaction/user-questions/src/index.ts:53] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:160]

5. **Consumer：`tool-ask-user` 要等服务。** 插件名 `'tool-ask-user'`，`inject = ['tools', 'userQuestions']`：host 没挂 Definition 时这一行保持 pending，catalog 里不会出现 `ask_user_question`。 [E: packages/interaction/tool-ask-user/src/index.ts:13] [E: packages/interaction/tool-ask-user/src/index.ts:14] `apply` 只 `ctx.tools.register(defineTool({ name: 'ask_user_question', … }))`，没有 Config。 [E: packages/interaction/tool-ask-user/src/index.ts:20] [E: packages/interaction/tool-ask-user/src/index.ts:21] fiber dispose 后 `ctx.tools.get('ask_user_question')` 变回 `undefined`。 [E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:329] 模型参数与 wire 表见 [`surface.tools.ask-user-question`](../../surface/tools/ask-user-question.md)，本页不展开 schema。

6. **工具 body 投影成 seam 请求。** `execute` 调 `ctx.userQuestions.ask`：每题只拷 `id` / `question`，有则拷 `header` / `options`，把 wire 的 `multi_select` 改名为 `multiSelect`。 [E: packages/interaction/tool-ask-user/src/index.ts:81] [E: packages/interaction/tool-ask-user/src/index.ts:87] 模型即使塞进 `detail` / `intent`，本工具也不转发——那两个字段给 `exit_plan_mode` 这类调用方。有 `exec.agent` 才写入 `agent`；始终带 `signal: exec.signal`。 [E: packages/interaction/tool-ask-user/src/index.ts:89] [E: packages/interaction/tool-ask-user/src/index.ts:90]

7. **preset 才装工具。** `standard` / `ptc` / `cordis` 的 `agent.cordis.yml` 有 `- id: tool-ask-user` / `name: '@deepseek-ai/dsh-tool-ask-user'`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:243] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:245] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:245] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:231] `minimal` 没有这一行，因此 minimal catalog 没有 `ask_user_question`。[I] `dsh-base` **不**插入 `tool-ask-user`。旧 preset 目录名 `code` 现为 **PTC**（`presets/ptc/`）。

8. **`ask()` 先看 signal，再看空批。** `request.signal?.aborted` → `ASK_ABORTED`（`ask_user_question was aborted before the user answered`），此时 **不会**进 waterfall。 [E: packages/interaction/user-questions/src/index.ts:87] [E: packages/interaction/user-questions/src/index.ts:88] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:100] `questions.length === 0` → `EMPTY_QUESTIONS`（`ask_user_question requires at least one question`），同样不到 answerer。 [E: packages/interaction/user-questions/src/index.ts:90] [E: packages/interaction/user-questions/src/index.ts:91] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:191] 等待中途 abort：waterfall 抛错后若 `signal.aborted` 且不是已还原的 `UserQuestionError`，再包一层 `ASK_ABORTED`。 [E: packages/interaction/user-questions/src/index.ts:146] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:119] 若 answerer 自己抛了 `ASK_CANCELLED` 同时 abort signal，**保留** domain 错误。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:141]

9. **带 `agent`：exact live 实例。** `agent !== undefined` 时 `this.ctx.get('agents')`。registry 缺失，或 `agents.get(agent.id) !== agent`（同 id 的旧对象也算），抛 `CALLER_NOT_LIVE`。 [E: packages/interaction/user-questions/src/index.ts:94] [E: packages/interaction/user-questions/src/index.ts:96] [E: packages/interaction/user-questions/src/index.ts:99] `AgentRegistry.get` 返回 `this.store.get(id)?.agent`，比较的是对象身份。 [E: packages/core/agent/src/index.ts:578] [E: packages/core/agent/src/index.ts:578] 测试：没有 `agents` 插件、以及 `enter` 了 live 却传入另一个同 id stub，都是 `CALLER_NOT_LIVE`，且 answerer 未被调用。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:243] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:259] **不带** `agent` 的请求跳过这一段：服务允许 programmatic 无 agent 调用，waterfall 也不走 `scopeTarget`。 [E: packages/interaction/user-questions/src/index.ts:135]

10. **live 还不够：必须是 runtime root。** `!agents.roots().includes(agent)` → `DELEGATED_CALLER`。文案要求把未决问题写进 child 的最终结果。 [E: packages/interaction/user-questions/src/index.ts:101] [E: packages/interaction/user-questions/src/index.ts:105] `roots()` 是 `entry.owner === undefined` 的 live agent，**不**看 `session.header.delegationDepth`。 [E: packages/core/agent/src/index.ts:608] [E: packages/core/agent/src/index.ts:608] `enter(agent, owner)` 把 `owner` 写进 entry；`enter(child, root)` 的 child 不是 root。 [E: packages/core/agent/src/index.ts:469] [E: packages/core/agent/src/index.ts:478] 测试：`delegationDepth = 1` 但 `enter(agent, undefined)` 的 resumed 会话可以问到 answerer；`enter(child, root)` 的 child 在碰到 UI 之前就被拒。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:223] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:209] [E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:294] **子代理不能问人。**

11. **`intent` 在 asker 侧钉死，不靠每个 UI。** 某题带了 `intent`：`approve` 必须等于本题某个 `options[].label`（`options` 缺省当 `[]`），且必须带 `detail`。任一缺口 → `BAD_INTENT`。 [E: packages/interaction/user-questions/src/index.ts:118] [E: packages/interaction/user-questions/src/index.ts:122] [E: packages/interaction/user-questions/src/index.ts:124] [E: packages/interaction/user-questions/src/index.ts:127] 测试：错误 label、完全没有 options、有 label 但没有 `detail`，都到不了 answerer。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:308] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:328] 合法的 `plan-review` 原样出现在 answerer 收到的 request 里。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:352]

12. **最后才进 waterfall。** 以上都过了：无 agent 时 `this.ctx.waterfall('user-questions/request', request, noAnswerer)`；有 agent 时用 `scopeTarget(agent, agent)` 做 scoped dispatch，request 展开 `{ ...request, agent }`。 [E: packages/interaction/user-questions/src/index.ts:136] [E: packages/interaction/user-questions/src/index.ts:139] 尾巴 `noAnswerer` 拒绝为 `NO_PROVIDER`。 [E: packages/interaction/user-questions/src/index.ts:130] scope 过滤用 generated 表：`'user-questions/request'` 从 `args[0].agent` 取 scope 键。 [E: packages/core/scope/src/scoped-events.generated.ts:37] 因此空批 / 非 live / 子代理在**没有** UI 时也会先撞到各自的码，而不是统一 `NO_PROVIDER`。

13. **第二 Consumer：`exit_plan_mode`。** `plan-mode` **不** `inject` 本服务：`ctx.get('userQuestions') === undefined` 时抛「no user-questions channel… switch the session mode instead」，工具仍在 catalog。 [E: packages/plan/plan-mode/src/index.ts:296] [E: packages/plan/plan-mode/src/index.ts:298] 有服务则 `ask` 固定题 `id: 'plan-review'`（`REVIEW_ID`），带 `detail: args.plan` 与 `intent: { kind: 'plan-review', approve: 'Approve' }`，并传入 `agent` / `exec.signal`。 [E: packages/plan/plan-mode/src/index.ts:69] [E: packages/plan/plan-mode/src/index.ts:313] dismiss 的 `ASK_CANCELLED` 被改写成「The user dismissed the plan review…」，避免模型看见它没调用过的 `ask_user_question` 名字。 [E: packages/plan/plan-mode/src/index.ts:323] 审阅 UI 与 Approve 后何时 append `plan/mode` 见 [`surface.tools.exit-plan-mode`](../../surface/tools/exit-plan-mode.md)。

14. **`ask()` 本身不是 listener waterfall 的 `next()` 合同。** 入口是服务方法；真正的 Cordis waterfall 是 `user-questions/request`，**漏 `next()` 会卡住这条缝**（与 `approval/request` 同类）。答案回到调用方之后，由 Consumer 写成普通 `tool/result`；本服务不 `append` session 事件。

15. **snapshot 不是产品默认。** `snapshots/session/subagent-child-question-rejection/cordis.yml` 同时 insert `tool-ask-user`、一个 tripwire listener，并显式挂 `user-questions`。tripwire 的 `user-questions/request` handler 抛「delegated question reached the UI answerer」，用来钉死 child 在碰到 UI 之前就被 `DELEGATED_CALLER` 拦住。 [E: snapshots/session/subagent-child-question-rejection/cordis.yml:4] [E: snapshots/session/subagent-child-question-rejection/cordis.yml:9] [E: packages/test-support/session-snapshot/tests/fixtures/child-question-tripwire.ts:12]

## 设计动机

把「谁来画问卷」和「谁来问」拆开，是为了让同一份 `AskUserQuestionRequest` 服务两个调用方：模型写的 `ask_user_question`，和产品写死文案的 `exit_plan_mode`。换 UI 只换 `user-questions/request` listener；问卷 JSON、live-root 门、`BAD_INTENT` 仍在 Definition。

改成 waterfall 而不是单槽 `registerProvider`，是为了让 Host 转发 + 浏览器 session 作用域 + 测试 stub 能组合：对不上 session 的 listener `next()`，没有人接则 `NO_PROVIDER`。

门控按 **runtime 所有权** 而不是 durable lineage：owned child 没有人应答者，问了会永远挂起；带着 `delegationDepth` 恢复出来的新 runtime root 却应该能问。所以比较的是 `agents.get(id) === agent` 加 `roots()`，不是 header 上的深度。

无 answerer fail-closed（`NO_PROVIDER`），是因为 headless / `dsh --profile sdk|sdk-minimal|acp` / 测试 / 忘了挂 UI 时，静默编造答案比让模型看见结构化错误更糟。

`intent` 在 asker 校验：类型系统保证不了「approve label 真是本题的选项」和「plan-review 带着要审的 `detail`」。漏了这两条，认 tag 的 UI 会让人批准一张看不见的计划，或不在选项里的 label。

`./types` 拆出无 Cordis 的形状，是为了让 remotes → client 的类型链不必加载 `Context.userQuestions` 增强。

## Gotcha

- **多个 listener 合法。** 这不是旧的「一个 context 一个 provider」。要换 UI 就 dispose 自己的 `ctx.on` / `$on`，不要假设互斥槽。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:78]
- **子代理不能问人。** live 且 `enter(child, root)` → `DELEGATED_CALLER`，文案要求把问题写进 child 最终结果，交给 root 再问。工具层测试确认 answerer `seen` 长度为 0。 [E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:300]
- **同 id 不够。** stale 对象复用 live id 是 `CALLER_NOT_LIVE`，不是 `DELEGATED_CALLER`。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:259]
- **无 answerer 的码是 `NO_PROVIDER`。** 文案是 `no user-questions answerer accepted the request`，不要写成 approval 的 `'unavailable'`，也不要写成旧文案 `no user-questions provider is registered`。整份服务缺失（`ctx.get('userQuestions') === undefined`）是另一件事：`tool-ask-user` 会 pending，`exit_plan_mode` 抛 channel 文案。 [E: packages/interaction/user-questions/src/index.ts:131] [E: packages/plan/plan-mode/src/index.ts:298]
- **入口 `ASK_ABORTED` 只看当时的 `signal.aborted`。** 已经进 waterfall 之后，abort 靠 catch 路径归一。 [E: packages/interaction/user-questions/src/index.ts:87]
- **`ASK_CANCELLED` 是 answerer 的码。** 服务本体 `ask()` 不构造它。Web 在 `PendingQuestion.cancel`。`exit_plan_mode` 只改写 `ASK_CANCELLED`。 [E: packages/client/ui-user-questions/src/client/contract/slots.ts:186] [E: packages/plan/plan-mode/src/index.ts:323]
- **跨进程运输会丢 class。** 浏览器抛的是带 `name`/`code` 的普通 `Error`；Host 侧 `restoreUserQuestionError` 再 new 一个 `UserQuestionError` 并挂 `cause`。 [E: packages/client/ui-user-questions/src/client/contract/slots.ts:101] [E: packages/interaction/user-questions/src/index.ts:59]
- **不要把问卷当审批。** `ctx.approval` 的政策是 `ask | never`，放行值是 `'allowed-once'`。本缝没有政策旋钮。
- **`ask_user_question` 不转发 `detail` / `intent`。** plan-review 必须走 `exit_plan_mode` 自己的 `ask()`。 [E: packages/interaction/tool-ask-user/src/index.ts:82]
- **headless / sdk / acp 有服务、通常没有人。** base 挂了 Definition（`sdk-minimal` 除外），这些 overlay 不挂 `ui-user-questions`；一旦有 Consumer 调用 `ask()`，就是 `NO_PROVIDER`。[I]
- **服务不校验答案。** answerer 可以返回对不上选项的 `selected`，或漏题。调用方（工具 / plan-mode）自己解释。
- **没有问卷审计事件。** 不要去 log 里找 `user-question/asked`。模型下一轮看见的是 Consumer 写下的 `tool/result`。
- **scoped dispatch。** 带 `agent` 的 ask 只发给对该 agent 注册的 listener；无 agent 的 ask 走未 scoped 的 waterfall。 [E: packages/interaction/user-questions/src/index.ts:138]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-user-questions` | `ctx.userQuestions`（`UserQuestionService`）：`ask` → `user-questions/request` waterfall；类型在 `./types` | `dsh-base` `id: user-questions`。preset **不**重挂。`dsh-web-app` **不** disable |
| Provider（answerer） | waterfall listener。shipped Web：`dsh-client-ui-user-questions` 的 `ctx.remote.$on` | 返回 `AskUserQuestionAnswer` 或 `next()`；全员 `next()` → `NO_PROVIDER` | client 行 `id: ui-user-questions`。headless / sdk / acp 无 shipped answerer |
| Consumer | `@deepseek-ai/dsh-tool-ask-user`（`ask_user_question`）；`dsh-plan-mode` 的 `exit_plan_mode` | 前者 `inject = ['tools', 'userQuestions']`；后者 `ctx.get('userQuestions')` 机会主义 | `standard` / `ptc` / `cordis` 插 `id: tool-ask-user`。`minimal` 不插 |

换 UI 只换 answerer。换 Consumer 不能绕过 live-root / `NO_PROVIDER`。审批是隔壁缝 [`subsys.interaction.approval`](./approval.md)，grant 不会变成一张问卷。

## Sources

- packages/interaction/user-questions/src/index.ts
- packages/interaction/user-questions/src/types.ts

- packages/interaction/user-questions/package.json
- packages/interaction/user-questions/tests/user-questions.spec.ts
- packages/interaction/tool-ask-user/src/index.ts
- packages/interaction/tool-ask-user/package.json
- packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/core/agent/src/index.ts
- packages/plan/plan-mode/src/index.ts
- packages/llm/llm/src/error.ts
- packages/api/remotes/src/remote-events.ts
- packages/client/ui-user-questions/src/client/index.ts
- packages/client/ui-user-questions/src/client/contract/slots.ts
- packages/core/scope/src/scoped-events.generated.ts
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/test-support/session-snapshot/tests/fixtures/child-question-tripwire.ts
- snapshots/session/subagent-child-question-rejection/cordis.yml

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [ask_user_question](../../surface/tools/ask-user-question.md)（`surface.tools.ask-user-question`）：本缝上的模型提问工具；schema / preset catalog 在那一页。
- [subsys.core.agent](../core/agent.md)：`ctx.agents.get` 身份与 `roots()` runtime 所有权。
- [user-approval](./approval.md)（`subsys.interaction.approval`）：工具审批缝（`ask \| never` / `'allowed-once'`），不是问卷。
- [exit_plan_mode](../../surface/tools/exit-plan-mode.md)（`surface.tools.exit-plan-mode`）：同一 `ask()` 上的 plan-review Consumer。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：tool-call 等到 `tool/result`；本缝发生在工具 body 里，不是 `tools/pre-execute`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)：host insert 含 `id: user-questions`。
