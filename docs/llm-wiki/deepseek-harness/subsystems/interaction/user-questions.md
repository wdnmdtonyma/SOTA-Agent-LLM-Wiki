---
id: subsys.interaction.user-questions
title: user-questions
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/interaction/user-questions/src/index.ts
  - packages/interaction/user-questions/src/types.ts
  - packages/interaction/user-questions/src/invariant.ts
  - packages/interaction/user-questions/package.json
  - packages/interaction/user-questions/tests/user-questions.spec.ts
  - packages/interaction/tool-ask-user/src/index.ts
  - packages/interaction/tool-ask-user/package.json
  - packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/agent/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/llm/llm/src/error.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - examples/acp-agent/child-question.cordis.yml
symbols:
  - ctx.userQuestions
  - UserQuestionService
  - UserQuestionProvider
  - UserQuestionError
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
updated: 47f943859b
---

> `ctx.userQuestions` 是 **host 面** `UserQuestionService`：一个 context **只能**挂一个 `UserQuestionProvider`，`ask()` 在进 UI 之前做 fail-closed 门控。它不是 model-visible 工具，也不是 `ctx.approval` 那条 `ask | never` 审批缝。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

## 能回答的问题

- `ctx.userQuestions`、`ask_user_question`、`exit_plan_mode`、`ctx.approval` 各是哪一层？换 UI 会不会换问卷 JSON？
- 一个 context 再挂第二个 provider 抛什么？dispose 之后还能不能问？
- `ask()` 的检查顺序是什么？无 provider 的 error code 是哪一个？
- 带 `agent` 时为什么必须是 **exact live runtime root**？`CALLER_NOT_LIVE` 和 `DELEGATED_CALLER` 差在哪？子代理能不能问人？
- `dsh-base` 挂的是 Definition 还是工具？`dsh-web-app` 会不会 disable 这一行？preset 谁装 `tool-ask-user`？

## 职责边界

本包 `@deepseek-ai/dsh-user-questions` 拥有： [E: packages/interaction/user-questions/package.json:2]

- Context 增强键 `userQuestions` 与 `UserQuestionService`（`super(ctx, 'userQuestions')`）。 [E: packages/interaction/user-questions/src/index.ts:16] [E: packages/interaction/user-questions/src/index.ts:55]
- 单槽 `registerProvider`：第二个活跃 provider 抛 `DUPLICATE_PROVIDER`；disposer 把槽清成 `undefined`。 [E: packages/interaction/user-questions/src/index.ts:64] [E: packages/interaction/user-questions/src/index.ts:67]
- `ask()` 入口门：已 abort / 空问题 / live-root / `intent` 完整性 / 无 provider。 [E: packages/interaction/user-questions/src/index.ts:92] [E: packages/interaction/user-questions/src/index.ts:137]
- 浏览器可进的 wire 类型（`package.json` 的 `./types` 子路径）：`AskUserQuestionItem` / `AskUserQuestionAnswer` / `AskUserQuestionIntent`。`types.ts` 没有 cordis / service import，client 链不必加载 `Context.userQuestions` 增强。 [E: packages/interaction/user-questions/package.json:25] [E: packages/interaction/user-questions/src/types.ts:35]
- `UserQuestionError`（`HarnessError` 子类，稳定 `code`）。 [E: packages/interaction/user-questions/src/index.ts:43] [E: packages/llm/llm/src/error.ts:15]

本包**不**拥有：

- `ask_user_question` 的 model schema / `defineTool` 注册 —— [`surface.tools.ask-user-question`](../../surface/tools/ask-user-question.md)。本页只把它当 Consumer。
- `ctx.approval`、`approval/request` waterfall、`allowed-once` —— [`subsys.interaction.approval`](./approval.md)。问卷和审批是两条缝。
- Web mux 帧、`POST /api/respond`、composer 组件。shipped provider 的挂点在 `createApiProxy` 的 `registerProvider`；`dsh-web-app` 另插 `id: ui-user-questions` 只负责呈现。本页不写 client UI。 [E: packages/host/apiproxy/src/api-proxy.ts:1369] [E: packages/bundle/web-app/cordis.patch.yml:270]
- 答案是否匹配选项、`id` 是否唯一：`ask()` 把门过完就 `return this.provider.ask(request)`，不校验 `AskUserQuestionAnswer`。 [E: packages/interaction/user-questions/src/index.ts:139]
- 独立的 request/answer 审计流。companion installer 是空函数，注释写明 seam 不 publish 这类事件。 [E: packages/interaction/user-questions/src/invariant.ts:21]

官方包 README 还把「permission plugin」写成调用方；本仓 shipped 源码里 `permission-presets` 不读 `ctx.userQuestions`。wiki 跟代码：生产 Consumer 是 `tool-ask-user` 与 `plan-mode`。[U]

`dsh-user-questions` 是 **host 面** Definition。agent-preset 面只 remount Consumer 行 `tool-ask-user`，不另造一份 `ctx.userQuestions`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/interaction/user-questions/src/index.ts` | `UserQuestionService` / `UserQuestionProvider` / `UserQuestionError` / `AskUserQuestionRequest` |
| `packages/interaction/user-questions/src/types.ts` | 无 Cordis 的问卷 / 答案 / `plan-review` intent |
| `packages/interaction/user-questions/src/invariant.ts` | 空 installer；无独立审计流 |
| `packages/interaction/user-questions/package.json` | 包名 `@deepseek-ai/dsh-user-questions`；导出 `.` / `./types` / `./invariant` |
| `packages/interaction/user-questions/tests/user-questions.spec.ts` | 无 provider、重复 provider、abort、空批、live-root、stale 对象、`BAD_INTENT` |
| `packages/interaction/tool-ask-user/src/index.ts` | Consumer：`inject = ['tools', 'userQuestions']`，注册 `ask_user_question` |
| `packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts` | 投影、signal、resumed root、`NO_PROVIDER` / `DELEGATED_CALLER` / 空批 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: user-questions` |
| `packages/bundle/web-app/cordis.patch.yml` | overlay **不** disable 该行；另插 `ui-user-questions` |
| `packages/bundle/headless/cordis.patch.yml` | overlay 无 provider 行，也不 disable Definition |
| `packages/core/agent/src/index.ts` | `agents.get` 身份、`roots()` = `owner === undefined` |
| `packages/plan/plan-mode/src/index.ts` | 第二 Consumer：`ctx.get('userQuestions')` + `intent: plan-review` |
| `packages/host/apiproxy/src/api-proxy.ts` | shipped Web：唯一 `registerProvider` 调用点 |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | preset 面 `id: tool-ask-user` |
| `examples/acp-agent/child-question.cordis.yml` | example tripwire，不是 shipped 产品默认 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `UserQuestionService` | `Service` 子类，键字面量 `'userQuestions'`。没有 `Config`，没有 `static inject`：`agents` 只在带 `agent` 的 `ask()` 里 `ctx.get('agents')`。 [E: packages/interaction/user-questions/src/index.ts:51] [E: packages/interaction/user-questions/src/index.ts:55] [E: packages/interaction/user-questions/src/index.ts:101] |
| `UserQuestionProvider` | `{ ask(request): Promise<AskUserQuestionAnswer> }`。一个 context 一个实例。 [E: packages/interaction/user-questions/src/index.ts:38] [E: packages/interaction/user-questions/src/index.ts:39] |
| `AskUserQuestionRequest` | `{ questions, agent?, signal? }`。`agent` 出现时必须是 registry 里**同一个** live 对象，且是 runtime root。 [E: packages/interaction/user-questions/src/index.ts:28] [E: packages/interaction/user-questions/src/index.ts:32] |
| `AskUserQuestionItem` | `id` / `question`；可选 `detail` / `header` / `options` / `multiSelect` / `intent`。seam 字段是 camelCase `multiSelect`。 [E: packages/interaction/user-questions/src/types.ts:35] [E: packages/interaction/user-questions/src/types.ts:47] |
| `AskUserQuestionIntent` | 目前唯一 `kind` 是 `'plan-review'`。`approve` 是选项 **label**（按名，不按位）。intent 只改呈现，不改答案协议。 [E: packages/interaction/user-questions/src/types.ts:23] [E: packages/interaction/user-questions/src/types.ts:25] [E: packages/interaction/user-questions/src/types.ts:31] |
| `AskUserQuestionAnswer` | `{ answers: [{ id, selected: string[], custom? }] }`。服务不解释 skip / Other。 [E: packages/interaction/user-questions/src/types.ts:63] [E: packages/interaction/user-questions/src/types.ts:57] |
| `UserQuestionError` | `name = 'UserQuestionError'`，`code` 走 `HarnessError`。服务本体码：`DUPLICATE_PROVIDER` / `ASK_ABORTED` / `EMPTY_QUESTIONS` / `CALLER_NOT_LIVE` / `DELEGATED_CALLER` / `BAD_INTENT` / `NO_PROVIDER`。 [E: packages/interaction/user-questions/src/index.ts:46] [E: packages/llm/llm/src/error.ts:15] |

无 provider 的 fail-closed 码是 **`NO_PROVIDER`**（文案 `no user-questions provider is registered`），不是 `unavailable`。 [E: packages/interaction/user-questions/src/index.ts:137] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:47]

## 控制流

1. **host 面挂 Definition。** `dsh-base` 根 `insert` 写 `id: user-questions` / `name: '@deepseek-ai/dsh-user-questions'`，无 `config`。 [E: packages/bundle/base/cordis.patch.yml:55] [E: packages/bundle/base/cordis.patch.yml:56] manifest 依赖同名包。 [E: packages/bundle/base/package.json:114] 插件是 class default export：`export default UserQuestionService`。 [E: packages/interaction/user-questions/src/index.ts:143] 这一行提供 `ctx.userQuestions`，**不**注册 `ask_user_question`。

2. **`dsh-web-app` 不 disable；preset 不 remount 服务。** web overlay 会把若干 host 行标 `disabled: true`，但同一份文件里**没有** `id: user-questions` 行，因此不会关掉 base 挂上的服务。[I] overlay 另插 client 行 `id: ui-user-questions` / `name: '@deepseek-ai/dsh-client-ui-user-questions'`，这是呈现，不是第二份 `UserQuestionService`。 [E: packages/bundle/web-app/cordis.patch.yml:270] [E: packages/bundle/web-app/cordis.patch.yml:271] `dsh-headless` 的 patch 同样没有 `user-questions` / `ui-user-questions` 行：Definition 从 base 继承，**没有** shipped headless provider。[I] 四个 shipped preset 都不插 `id: user-questions`。[I]

3. **一个 context 一个 provider。** `registerProvider` 用 `ctx.effect` 占槽：`this.provider !== undefined` 则抛 `UserQuestionError` / `DUPLICATE_PROVIDER`（`a user-questions provider is already registered`），**不会**静默替换当前 UI。 [E: packages/interaction/user-questions/src/index.ts:65] [E: packages/interaction/user-questions/src/index.ts:66] [E: packages/interaction/user-questions/src/index.ts:67] `yield` 的 disposer 把 `this.provider` 置回 `undefined`。 [E: packages/interaction/user-questions/src/index.ts:71] 测试：连续 `dispose()` 两次之后 `ask()` 仍是 `NO_PROVIDER`；第二次 `registerProvider` 抛 `UserQuestionError`。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:59] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:69] effect 标签仍是 `'userInteraction.registerProvider()'`（旧名残留，不影响合同）。 [E: packages/interaction/user-questions/src/index.ts:73]

4. **shipped Web 的 Provider 在 apiproxy。** `ApiProxyService.static inject` 硬依赖 `'userQuestions'`，网关起来时服务必须已经在。 [E: packages/host/apiproxy/src/index.ts:72] `createApiProxy` 调用 `ctx.userQuestions.registerProvider({ ask })`：没有 `request.agent` 立刻 `ASK_MISSING_AGENT`；否则分配 `rpcId`，把 `{ type: 'question/requested', sessionId, questions }` 推进 mux 队列，并听 `signal` abort。 [E: packages/host/apiproxy/src/api-proxy.ts:1369] [E: packages/host/apiproxy/src/api-proxy.ts:1374] [E: packages/host/apiproxy/src/api-proxy.ts:1392] 人关掉整组问卷时 provider 抛 `ASK_CANCELLED`（`the user cancelled ask_user_question`）。 [E: packages/host/apiproxy/src/api-proxy.ts:3719] 这两个码**不是** `UserQuestionService.ask` 自己抛的。

5. **Consumer：`tool-ask-user` 要等服务。** 插件名 `'tool-ask-user'`，`inject = ['tools', 'userQuestions']`：host 没挂 Definition 时这一行保持 pending，catalog 里不会出现 `ask_user_question`。 [E: packages/interaction/tool-ask-user/src/index.ts:13] [E: packages/interaction/tool-ask-user/src/index.ts:14] `apply` 只 `ctx.tools.register(defineTool({ name: 'ask_user_question', … }))`，没有 Config。 [E: packages/interaction/tool-ask-user/src/index.ts:20] [E: packages/interaction/tool-ask-user/src/index.ts:21] fiber dispose 后 `ctx.tools.get('ask_user_question')` 变回 `undefined`。 [E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:318] 模型参数与 wire 表见 [`surface.tools.ask-user-question`](../../surface/tools/ask-user-question.md)，本页不展开 schema。

6. **工具 body 投影成 seam 请求。** `execute` 调 `ctx.userQuestions.ask`：每题只拷 `id` / `question`，有则拷 `header` / `options`，把 wire 的 `multi_select` 改名为 `multiSelect`。 [E: packages/interaction/tool-ask-user/src/index.ts:81] [E: packages/interaction/tool-ask-user/src/index.ts:87] 模型即使塞进 `detail` / `intent`，本工具也不转发——那两个字段给 `exit_plan_mode` 这类调用方。有 `exec.agent` 才写入 `agent`；始终带 `signal: exec.signal`。 [E: packages/interaction/tool-ask-user/src/index.ts:89] [E: packages/interaction/tool-ask-user/src/index.ts:90]

7. **preset 才装工具。** `standard` / `code` / `cordis` 的 `agent.cordis.yml` 有 `- id: tool-ask-user` / `name: '@deepseek-ai/dsh-tool-ask-user'`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:237] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:238] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:238] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:225] `minimal` 没有这一行，因此 minimal catalog 没有 `ask_user_question`。[I] `dsh-base` **不**插入 `tool-ask-user`。

8. **`ask()` 先看 signal，再看空批。** `request.signal?.aborted` → `ASK_ABORTED`（`ask_user_question was aborted before the user answered`），此时 **不会**调 `provider.ask`。 [E: packages/interaction/user-questions/src/index.ts:93] [E: packages/interaction/user-questions/src/index.ts:94] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:81] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:82] `questions.length === 0` → `EMPTY_QUESTIONS`（`ask_user_question requires at least one question`），同样不到 provider。 [E: packages/interaction/user-questions/src/index.ts:96] [E: packages/interaction/user-questions/src/index.ts:97] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:92] 服务**只**在入口看 abort；等待中途的 abort 是 provider 的事（apiproxy 再抛一次 `ASK_ABORTED`）。 [E: packages/host/apiproxy/src/api-proxy.ts:1385]

9. **带 `agent`：exact live 实例。** `agent !== undefined` 时 `this.ctx.get('agents')`。registry 缺失，或 `agents.get(agent.id) !== agent`（同 id 的旧对象也算），抛 `CALLER_NOT_LIVE`。 [E: packages/interaction/user-questions/src/index.ts:100] [E: packages/interaction/user-questions/src/index.ts:102] [E: packages/interaction/user-questions/src/index.ts:105] `AgentRegistry.get` 返回 `this.store.get(id)?.agent`，比较的是对象身份。 [E: packages/core/agent/src/index.ts:583] [E: packages/core/agent/src/index.ts:584] 测试：没有 `agents` 插件、以及 `enter` 了 live 却传入另一个同 id stub，都是 `CALLER_NOT_LIVE`，且 `provider.ask` 未被调用。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:144] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:160] **不带** `agent` 的请求跳过这一段：服务允许 programmatic 无 agent 调用；Web provider 随后自己要 session。 [E: packages/interaction/user-questions/src/index.ts:100]

10. **live 还不够：必须是 runtime root。** `!agents.roots().includes(agent)` → `DELEGATED_CALLER`。文案要求把未决问题写进 child 的最终结果。 [E: packages/interaction/user-questions/src/index.ts:107] [E: packages/interaction/user-questions/src/index.ts:111] `roots()` 是 `entry.owner === undefined` 的 live agent，**不**看 `session.header.delegationDepth`。 [E: packages/core/agent/src/index.ts:613] [E: packages/core/agent/src/index.ts:615] `enter(agent, owner)` 把 `owner` 写进 entry；`enter(child, root)` 的 child 不是 root。 [E: packages/core/agent/src/index.ts:474] [E: packages/core/agent/src/index.ts:486] 测试：`delegationDepth = 1` 但 `enter(agent, undefined)` 的 resumed 会话可以问到 provider；`enter(child, root)` 的 child 在碰到 provider 之前就被拒。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:132] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:110] [E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:283] **子代理不能问人。**

11. **`intent` 在 asker 侧钉死，不靠每个 UI。** 某题带了 `intent`：`approve` 必须等于本题某个 `options[].label`（`options` 缺省当 `[]`），且必须带 `detail`。任一缺口 → `BAD_INTENT`。 [E: packages/interaction/user-questions/src/index.ts:124] [E: packages/interaction/user-questions/src/index.ts:128] [E: packages/interaction/user-questions/src/index.ts:130] [E: packages/interaction/user-questions/src/index.ts:133] 测试：错误 label、完全没有 options、有 label 但没有 `detail`，都到不了 provider。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:179] [E: packages/interaction/user-questions/tests/user-questions.spec.ts:198] 合法的 `plan-review` 原样出现在 `provider.ask` 收到的 request 里。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:220]

12. **最后才看槽。** 以上都过了，`this.provider === undefined` → `NO_PROVIDER`。 [E: packages/interaction/user-questions/src/index.ts:136] [E: packages/interaction/user-questions/src/index.ts:137] 因此空批 / 非 live / 子代理在**没有** UI 时也会先撞到各自的码，而不是统一 `NO_PROVIDER`。成功路径就是 `return this.provider.ask(request)`。 [E: packages/interaction/user-questions/src/index.ts:139]

13. **第二 Consumer：`exit_plan_mode`。** `plan-mode` **不** `inject` 本服务：`ctx.get('userQuestions') === undefined` 时抛「no user-questions channel… switch the session mode instead」，工具仍在 catalog。 [E: packages/plan/plan-mode/src/index.ts:330] [E: packages/plan/plan-mode/src/index.ts:332] 有服务则 `ask` 固定题 `id: 'plan-review'`，带 `detail: args.plan` 与 `intent: { kind: 'plan-review', approve: 'Approve' }`，并传入 `agent` / `exec.signal`。 [E: packages/plan/plan-mode/src/index.ts:334] [E: packages/plan/plan-mode/src/index.ts:347] dismiss 的 `ASK_CANCELLED` 被改写成「The user dismissed the plan review…」，避免模型看见它没调用过的 `ask_user_question` 名字。 [E: packages/plan/plan-mode/src/index.ts:357] 审阅 UI 与 Approve 后何时 append `plan/mode` 见 [`surface.tools.exit-plan-mode`](../../surface/tools/exit-plan-mode.md)。

14. **这不是 waterfall，也没有 `next()`。** `ask()` 是服务方法，不是 `approval/request` / `tools/pre-execute` listener。漏 `next()` 的 Cordis 规则不作用在本缝上。答案回到调用方之后，由 Consumer 写成普通 `tool/result`；本服务不 `append` session 事件。

15. **example 不是产品默认。** `examples/acp-agent/child-question.cordis.yml` 同时 insert `user-questions`、`tool-ask-user` 和一个 tripwire provider，用来钉死 child 在碰到 UI 之前就被 `DELEGATED_CALLER` 拦住。 [E: examples/acp-agent/child-question.cordis.yml:9] [E: examples/acp-agent/child-question.cordis.yml:11]

## 设计动机

把「谁来画问卷」和「谁来问」拆开，是为了让同一份 `AskUserQuestionRequest` 服务两个调用方：模型写的 `ask_user_question`，和产品写死文案的 `exit_plan_mode`。换 UI 只换 `UserQuestionProvider`；问卷 JSON、live-root 门、`BAD_INTENT` 仍在 Definition。

一个 context 只许一个 provider，是为了禁止「第二个 UI 把第一个顶掉、人还在答上一张卷」。重复注册抛错，而不是 last-write-wins。

门控按 **runtime 所有权** 而不是 durable lineage：owned child 没有人应答者，问了会永远挂起；带着 `delegationDepth` 恢复出来的新 runtime root 却应该能问。所以比较的是 `agents.get(id) === agent` 加 `roots()`，不是 header 上的深度。

无 provider fail-closed（`NO_PROVIDER`），是因为 headless / 测试 / 忘了挂 UI 时，静默编造答案比让模型看见结构化错误更糟。

`intent` 在 asker 校验：类型系统保证不了「approve label 真是本题的选项」和「plan-review 带着要审的 `detail`」。漏了这两条，认 tag 的 UI 会让人批准一张看不见的计划，或不在选项里的 label。

`./types` 拆出无 Cordis 的形状，是为了让 apiproxy → client 的类型链不必加载 `Context.userQuestions` 增强。

## Gotcha

- **一个 context 一个 provider。** 第二个 `registerProvider` 是 `DUPLICATE_PROVIDER`，不会替换。要换 UI 必须先 dispose。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:69]
- **子代理不能问人。** live 且 `enter(child, root)` → `DELEGATED_CALLER`，文案要求把问题写进 child 最终结果，交给 root 再问。工具层测试确认 `provider.ask` 长度为 0。 [E: packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts:289]
- **同 id 不够。** stale 对象复用 live id 是 `CALLER_NOT_LIVE`，不是 `DELEGATED_CALLER`。 [E: packages/interaction/user-questions/tests/user-questions.spec.ts:160]
- **无 provider 的码是 `NO_PROVIDER`。** 不要写成 approval 的 `'unavailable'`。整份服务缺失（`ctx.get('userQuestions') === undefined`）是另一件事：`tool-ask-user` 会 pending，`exit_plan_mode` 抛 channel 文案。 [E: packages/interaction/user-questions/src/index.ts:137] [E: packages/plan/plan-mode/src/index.ts:332]
- **`ASK_ABORTED` 只在入口看 `signal.aborted`。** 已经交给 provider 之后，服务不再轮询。等待中取消看 provider。 [E: packages/interaction/user-questions/src/index.ts:93]
- **`ASK_CANCELLED` / `ASK_MISSING_AGENT` 是 Web provider 的码。** 服务本体枚举不含它们。`exit_plan_mode` 只改写 `ASK_CANCELLED`。 [E: packages/host/apiproxy/src/api-proxy.ts:1374] [E: packages/plan/plan-mode/src/index.ts:357]
- **不要把问卷当审批。** `ctx.approval` 的政策是 `ask | never`，放行值是 `'allowed-once'`。本缝没有政策旋钮，也没有 waterfall。
- **`ask_user_question` 不转发 `detail` / `intent`。** plan-review 必须走 `exit_plan_mode` 自己的 `ask()`。 [E: packages/interaction/tool-ask-user/src/index.ts:82]
- **headless 有服务、通常没有人。** base 挂了 Definition，headless overlay 不挂 provider；一旦有 Consumer 调用 `ask()`，就是 `NO_PROVIDER`。[I]
- **服务不校验答案。** provider 可以返回对不上选项的 `selected`，或漏题。调用方（工具 / plan-mode）自己解释。
- **没有问卷审计事件。** 不要去 log 里找 `user-question/asked`。模型下一轮看见的是 Consumer 写下的 `tool/result`。 [E: packages/interaction/user-questions/src/invariant.ts:21]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-user-questions` | `ctx.userQuestions`（`UserQuestionService`）：`registerProvider` + `ask`；类型在 `./types` | `dsh-base` `id: user-questions`。preset **不**重挂。`dsh-web-app` **不** disable |
| Provider | 一个 `UserQuestionProvider`。shipped Web：`createApiProxy` 里 `registerProvider` | `ask(request) → Promise<AskUserQuestionAnswer>`；重复注册 `DUPLICATE_PROVIDER` | client 行 `id: ui-user-questions` 只呈现。headless 无 shipped provider |
| Consumer | `@deepseek-ai/dsh-tool-ask-user`（`ask_user_question`）；`dsh-plan-mode` 的 `exit_plan_mode` | 前者 `inject = ['tools', 'userQuestions']`；后者 `ctx.get('userQuestions')` 机会主义 | `standard` / `code` / `cordis` 插 `id: tool-ask-user`。`minimal` 不插 |

换 UI 只换 Provider。换 Consumer 不能绕过 live-root / 单槽 / `NO_PROVIDER`。审批是隔壁缝 [`subsys.interaction.approval`](./approval.md)，grant 不会变成一张问卷。

## Sources

- packages/interaction/user-questions/src/index.ts
- packages/interaction/user-questions/src/types.ts
- packages/interaction/user-questions/src/invariant.ts
- packages/interaction/user-questions/package.json
- packages/interaction/user-questions/tests/user-questions.spec.ts
- packages/interaction/tool-ask-user/src/index.ts
- packages/interaction/tool-ask-user/package.json
- packages/interaction/tool-ask-user/tests/tool-ask-user.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/agent/src/index.ts
- packages/plan/plan-mode/src/index.ts
- packages/host/apiproxy/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/llm/llm/src/error.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- examples/acp-agent/child-question.cordis.yml

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [ask_user_question](../../surface/tools/ask-user-question.md)（`surface.tools.ask-user-question`）：本缝上的模型提问工具；schema / preset catalog 在那一页。
- [subsys.core.agent](../core/agent.md)：`ctx.agents.get` 身份与 `roots()` runtime 所有权。
- [user-approval](./approval.md)（`subsys.interaction.approval`）：工具审批缝（`ask \| never` / `'allowed-once'`），不是问卷。
- [exit_plan_mode](../../surface/tools/exit-plan-mode.md)（`surface.tools.exit-plan-mode`）：同一 `ask()` 上的 plan-review Consumer。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：tool-call 等到 `tool/result`；本缝发生在工具 body 里，不是 `tools/pre-execute`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)：host insert 含 `id: user-questions`。
