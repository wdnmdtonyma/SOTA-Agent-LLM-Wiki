---
id: surface.tools.exit-plan-mode
title: exit_plan_mode
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/plan/plan-mode/src/index.ts
  - packages/plan/plan-mode/src/types.ts
  - packages/plan/plan-mode/src/invariant.ts
  - packages/plan/plan-mode/package.json
  - packages/plan/plan-mode/tests/plan-mode.spec.ts
  - packages/plan/plan-mode/tests/integration.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/interaction/user-questions/src/index.ts
  - packages/interaction/user-questions/src/types.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - EXIT_PLAN_MODE
  - foldPlanMode
  - PlanModeController
  - resolveConfig
  - PlanModeConfig
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - subsys.orchestration.plan
  - surface.tools.ask-user-question
  - surface.tools.todo-write
  - surface.tools.run-code
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名 `exit_plan_mode`（常量 `EXIT_PLAN_MODE`）；实现包 `@deepseek-ai/dsh-plan-mode`。把完整 markdown 计划交给人审阅，只有选 `Approve` 才排队退出 plan mode。

## 能回答的问题

- 模型目录里的名字是 `exit_plan_mode` 还是 `plan-mode`？工厂是 `apply()` 还是 `PlanModeController`？
- 不在 plan mode 时 catalog 还广告这个工具吗？直接调用会怎样？
- `plan` 参数怎样才算合法 heading？`##` 标题过不过 execute？
- 审阅走 `ctx.approval` 还是 `ctx.userQuestions`？`Approve` 之后 `foldPlanMode` 何时变成 `false`？
- `minimal` / `standard` / `code` / `cordis` 谁装本包？`isolate.planMode` 写在哪一行？
- Code Mode 下模型能按这个 wire 名直调吗？还是必须从 `run_code` 里调？

## Identity

Wire 名是 `exit_plan_mode`，导出常量 `EXIT_PLAN_MODE`。[E: packages/plan/plan-mode/src/index.ts:67] `defineTool({ name: EXIT_PLAN_MODE, ... })` 把它登记进 `ctx.tools`。[E: packages/plan/plan-mode/src/index.ts:305] [E: packages/plan/plan-mode/src/index.ts:306]

实现包是 `@deepseek-ai/dsh-plan-mode`。[E: packages/plan/plan-mode/package.json:2] 组合层插件 id 是 `plan-mode`（`standard` / `code` / `cordis` 与 `dsh-base` 都这么写；`minimal` 不装）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:110] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:111]

本包**没有**主模块 `apply()`。工厂是 Cordis `Service` 子类 `PlanModeController` 的 constructor（`export default PlanModeController`）：`super(ctx, 'planMode')` 挂 `ctx.planMode`，然后在 constructor 里注册工具、prompt section、可选 `/plan` 与 `plan` projection。[E: packages/plan/plan-mode/src/index.ts:184] [E: packages/plan/plan-mode/src/index.ts:197] [E: packages/plan/plan-mode/src/index.ts:198] [E: packages/plan/plan-mode/src/index.ts:477]

`static inject = ['tools', 'systemPrompt']`。缺这两条 seam 时插件挂起，catalog 里不会出现 `exit_plan_mode`。[E: packages/plan/plan-mode/src/index.ts:185] `ctx.userQuestions` **不**在 `inject` 里：execute 用 `ctx.get('userQuestions')`，组合里没有审阅通道时工具仍注册，调用再失败。[E: packages/plan/plan-mode/src/index.ts:330]

companion `@deepseek-ai/dsh-plan-mode/invariant` 才 `export const apply`，插件名 `plan-mode-invariant`，只把 `plan/mode` 的 `active` 校成 boolean，调用 `ctx.invariants.register`，**不** `ctx.tools.register`。[E: packages/plan/plan-mode/src/invariant.ts:10] [E: packages/plan/plan-mode/src/invariant.ts:23] [E: packages/plan/plan-mode/src/invariant.ts:47] [E: packages/plan/plan-mode/src/invariant.ts:48]

工具在 plan mode **未激活**时也保持注册。进入 / 离开只改 `plan:policy` section，不改 request tool catalog。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:406] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:411] 集成测试里 default 与 plan 两次 `request/header.tools` 都是 `['exit_plan_mode', 'read', 'write']`。[E: packages/plan/plan-mode/tests/integration.spec.ts:85] [E: packages/plan/plan-mode/tests/integration.spec.ts:109]

## 用途定位

本工具是模型**退出** plan mode 的正式通道：把完整计划作为 markdown 交人审阅；人选 `Approve` 后，下一次被接受的 `agent/pre-step` 才把 `plan/mode { active: false }` 写入 session log。描述写明：只在 plan mode 使用；计划必须以命名它的 `#` heading 开头；人可以批准（下一步开始执行）或继续规划（反馈回工具结果）。[E: packages/plan/plan-mode/src/index.ts:85] [E: packages/plan/plan-mode/src/index.ts:86] [E: packages/plan/plan-mode/src/index.ts:87]

它**不是** `ask_user_question`（那是另一件 model-visible 工具，走同一条 `ctx.userQuestions` 缝但问题由模型编写）。它也**不是**人命令 `/plan off`：`/plan` 在 optional `ctx.commands` 子插件里，不经模型 turn。[E: packages/plan/plan-mode/src/index.ts:271] 插件**不**在 `tools/pre-execute` 拦截 `write` / `bash` / `todo_write`；plan mode 对变异工具的约束是 `plan:policy` 文本，不是执行门。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:539] [E: packages/plan/plan-mode/tests/integration.spec.ts:92]

`PlanModeConfig` 只有 `section`：plan mode 激活（或 pending 目标为激活）时渲染为 `plan:policy`（`order: 50`）。[E: packages/plan/plan-mode/src/index.ts:70] [E: packages/plan/plan-mode/src/index.ts:72] [E: packages/plan/plan-mode/src/index.ts:226] [E: packages/plan/plan-mode/src/index.ts:227] Config **不能**改 wire 名或参数。缺 `section`、空白、或多余键会在插件 load 时被 `resolveConfig` **抛错**，不会静默忽略。[E: packages/plan/plan-mode/src/index.ts:109] [E: packages/plan/plan-mode/src/index.ts:112] [E: packages/plan/plan-mode/src/index.ts:116]

## 输入 schema

以插件默认 boot 为准：`PlanModeConfig` 必须自带非空 `section`（测试用 `'Test plan mode instructions.'`），schema 与是否已 `plan/mode { active: true }` **无关**。`ctx.tools.schemas()` 里本工具只有一个必填字段 `plan`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:697] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:698]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `plan` | `string` | 是 | 无 | JSON Schema 层只要 string；execute 再要求 `trim()` 后匹配 `/^#\s+\S/` | 完整计划 markdown。描述写 starting with a `#` heading that names it。[E: packages/plan/plan-mode/src/index.ts:309] [E: packages/plan/plan-mode/src/index.ts:327] |

`defineTool` 先走 `validateJsonSchemaValue`；缺 `plan` 或类型不对抛 `ToolArgsError`，进不了用户 `execute`。[E: packages/core/tools/src/schema.ts:586] [E: packages/core/tools/src/schema.ts:587] 空串 `""` 通过 schema，然后被 heading 检查拒绝，且**不会**调用 `userQuestions.ask`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:719]

**heading 规则（execute，不是 presentCall）：** `args.plan.trim()` 必须匹配 `/^#\s+\S/`——整段 trim 后以**单个** `#` + 空白 + 至少一个非空白开头。`## Title`、`#Title`（无空白）、不以 `#` 起头的正文都会抛 `exit_plan_mode requires a non-empty markdown plan starting with a # heading`。[E: packages/plan/plan-mode/src/index.ts:327] [E: packages/plan/plan-mode/src/index.ts:328]

**Config 不改广告：** `section` 只进 `plan:policy` 文本。没有 `toolName`、没有按模式增减 properties。非 plan mode 仍广告同一份 schema；execute 再用 `foldPlanMode` 拒绝。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:711] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:714]

## 输出 & 截断 / spill

`output.schema` 是封闭对象：唯一成功值 `{ approved: true }`（`const: true`）。[E: packages/plan/plan-mode/src/index.ts:316] `output.render` **忽略** value，固定返回一句：`Plan approved — plan mode exited; carry out the plan starting with your next step.` [E: packages/plan/plan-mode/src/index.ts:319]

成功路径：`result.value === { approved: true }`，`isError === false`，`content` 即该固定句。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:770] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:771]

失败路径全部是 `throw`，由 registry 收成 `Error: <message>` + `isError: true`。[E: packages/core/tools/src/index.ts:1874] 计划正文**不会**出现在成功 tool result 里；它只作为 `userQuestions.ask` 的 `detail` 给人看。Keep-planning 时若带了 `custom`，模型在错误文本里读到 `The user chose to keep planning; their feedback: …`。[E: packages/plan/plan-mode/src/index.ts:374]

本工具**没有** spill、没有 `maxOutputBytes`、没有按字节截断。`presentCall` / `presentResult` 只服务 UI：call 卡 `card: 'generic'`，标题取 `firstHeading(plan)`（任意 ATX 1–6 级、任一源行）否则 `'Plan'`；result 卡标题 `'Plan review'`。[E: packages/plan/plan-mode/src/index.ts:91] [E: packages/plan/plan-mode/src/index.ts:93] [E: packages/plan/plan-mode/src/index.ts:384] [E: packages/plan/plan-mode/src/index.ts:390] `firstHeading` 能从 `## Fix the flake` 抽出标题 `Fix the flake`，但同一字符串过不了 execute 的 `/^#\s+\S/`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:1007] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:1009]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition + 实现 | `PlanModeController` / `ctx.planMode` | `super(ctx, 'planMode')`。拥有 `foldPlanMode`、in-memory `pendingIntents`、注册 `exit_plan_mode`、写 `plan:policy`。没有第二个 plan-mode provider 包。[E: packages/plan/plan-mode/src/index.ts:198] |
| 状态 fold | `foldPlanMode(events, end?)` | 初值 `false`；最后一个 `plan/mode` 的 `data.active` 获胜。[E: packages/plan/plan-mode/src/index.ts:129] [E: packages/plan/plan-mode/src/index.ts:130] [E: packages/plan/plan-mode/src/index.ts:135] |
| Review Definition | `UserQuestionService` / `ctx.userQuestions` | execute 里 `ctx.get('userQuestions')` 再 `ask()`。[E: packages/plan/plan-mode/src/index.ts:330] [E: packages/plan/plan-mode/src/index.ts:334] |
| Review Provider | `registerProvider({ ask })` | UI / apiproxy。换 provider 只换呈现；答案仍是 `{ answers: [{ id, selected, custom? }] }`。[E: packages/interaction/user-questions/src/index.ts:64] |
| 可选 | `ctx.commands` | `ctx.inject(['commands'])` 登记 `/plan`；headless 无 commands 时子插件不挂。[E: packages/plan/plan-mode/src/index.ts:269] |
| 可选 | `ctx.sessionProjections` | 登记 key `plan`（`PlanProjection`：`active` + `pending`）。[E: packages/plan/plan-mode/src/types.ts:18] [E: packages/plan/plan-mode/src/index.ts:246] |
| 运行时根检查 | `ctx.agents` | `userQuestions.ask` 要求 `agent` 是 live root；owned child 抛 `DELEGATED_CALLER`。[E: packages/interaction/user-questions/src/index.ts:107] [E: packages/interaction/user-questions/src/index.ts:111] |

换掉 `ctx.userQuestions` provider 会带走：审阅 UI 是 generic 选项列表还是 `intent.kind === 'plan-review'` 的专用卡、人怎么发出 `Approve` / `Keep planning` / dismiss。**不会**带走：heading 门、`foldPlanMode` 语义、Approve 后要等下一次 `agent/pre-step` 才 append。缺整个 `userQuestions` 服务时，工具仍在 catalog，execute 抛「no user-questions channel… switch the session mode instead」。[E: packages/plan/plan-mode/src/index.ts:332] 服务在但没有 provider 时，`ask()` 抛 `NO_PROVIDER`（`no user-questions provider is registered`），本工具原样上抛。[E: packages/interaction/user-questions/src/index.ts:137] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:741]

`plan:policy` 看 `pendingIntents.get(session)?.active ?? foldPlanMode(...)`：Approve 之后、flush 之前，下一次 assemble 已经不带 section，但 `foldPlanMode` 仍为 `true`。[E: packages/plan/plan-mode/src/index.ts:231] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:774]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] `PlanModeController` **不**自己挂 `tools/pre-execute` listener。

对本工具的挂点：

- **timeout：** `defineTool` 没有 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59] 等人审阅的时间不受工具 deadline 限制；取消靠 `exec.signal` 传进 `ask()`。[E: packages/plan/plan-mode/src/index.ts:350]
- **approval：** 不走 `ctx.approval` / `tools/pre-execute` 的 `ask`。人审阅是 body 内 `userQuestions.ask`。
- **sandbox：** 不读 `ctx.sandbox` / `ctx.sandboxPolicy`。
- **checkpoint：** host `dsh-session-checkpoint-policy` 对**顶层**（有 `exec.agent` 且无 `parent`）在 `tools/execute` 里 `sessions.flush` 之后才 `next()` 进 body。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 `exclusive`。[E: packages/core/tools/src/index.ts:1278]
- **Code Mode：** `code` preset 仍装本包，但 `mode: code` 时无 `parent` 的模型直调会被 registry `collapses`；必须从 `run_code` 程序里调 `tools.exit_plan_mode`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/tools/src/index.ts:1325] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:468]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`。`dsh-base` / `dsh-web-app` 的行是 host 组合对照，不当本表格子。

| preset | 装 `@deepseek-ai/dsh-plan-mode`？ | `disabled` | isolate | Config |
|---|---|---|---|---|
| `minimal` | **否**。文件只有 `persona` + `persistent-shell` + `filesystem`，没有 `dsh-plan-mode` / `planning` | — | 本包未出现 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:48] | — |
| `standard` | 是。组 id `planning` | 无 | `isolate.planMode: true` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:104] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:111] | `section: \|` 长 guidance（以 `You are in plan mode.` 起）[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:113] |
| `code` | 是。组 id `planning` | 无 | `isolate.planMode: true` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:111] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:115] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:118] | `section: \|` 长 guidance [E: apps/cli/config/agent-presets/code/agent.cordis.yml:120] |
| `cordis` | 是。组 id `planning` | 无 | `isolate.planMode: true` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:92] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:96] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:99] | `section: \|` 长 guidance [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:101] |

三份 shipped `section` 都写：留在 plan mode 直到 `exit_plan_mode` 成功或用户切 session mode；catalog 跨模式保持不变；**不要**用 `todo_write` 跟踪规划阶段（那是实施清单）；提交时让 `exit_plan_mode` 做该 assistant 回复里唯一且最后的 tool call；不要用散文或 `ask_user_question` 问 “should I proceed?”。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:114] 这是 prompt 政策，**不是** schema 门，也不是 `todo_write` 的执行拦截。

组合旁注（不是 preset 成员资格）：`dsh-base` 在 host 平面 insert 了同一包，其 `section` 写「listed only to keep the request shape stable」（preset 写的是 keep the tool catalog unchanged）。[E: packages/bundle/base/cordis.patch.yml:265] [E: packages/bundle/base/cordis.patch.yml:266] [E: packages/bundle/base/cordis.patch.yml:273] `dsh-web-app` overlay 把 host `plan-mode` 设 `disabled: true`，改由每个 session 的 preset 在 `planning` realm 再挂。[E: packages/bundle/web-app/cordis.patch.yml:348] [E: packages/bundle/web-app/cordis.patch.yml:349]

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，再进用户 body。[E: packages/core/tools/src/schema.ts:586]
2. `exec.agent` 必须存在，否则抛 `exit_plan_mode requires a calling agent (no session to switch)`。[E: packages/plan/plan-mode/src/index.ts:323] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:705]
3. `foldPlanMode(agent.session.events)` 必须为 `true`。空 log 或最后一条 `plan/mode` 为 `active: false` 时抛 `exit_plan_mode is only available in plan mode`；工具仍留在 `schemas()`。[E: packages/plan/plan-mode/src/index.ts:324] [E: packages/plan/plan-mode/src/index.ts:325] 这里读的是 **log fold**，不是 `pendingIntents`。
4. `args.plan.trim()` 必须匹配 `/^#\s+\S/`，否则在 `ask` 之前抛 heading 错。测试钉死 `''` 与 `'do things'` 都是这条，且 `asked.length === 0`。[E: packages/plan/plan-mode/src/index.ts:327] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:722]
5. `ctx.get('userQuestions')`：`undefined` → 降级文案，让用户手动切 session mode，fold 不变。[E: packages/plan/plan-mode/src/index.ts:331] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:733]
6. `interaction.ask({ questions: [{ id: 'plan-review', header: 'Plan review', question: 'Approve this plan and leave plan mode?', detail: args.plan, options: [Approve, Keep planning], intent: { kind: 'plan-review', approve: 'Approve' } }], agent, signal: exec.signal })`。[E: packages/plan/plan-mode/src/index.ts:76] [E: packages/plan/plan-mode/src/index.ts:79] [E: packages/plan/plan-mode/src/index.ts:334] [E: packages/plan/plan-mode/src/index.ts:347] `AskUserQuestionIntent` 的唯一 `kind` 就是 `'plan-review'`。[E: packages/interaction/user-questions/src/types.ts:25]
7. `UserQuestionService.ask` 在转给 provider 之前：`signal` 已 abort → `ASK_ABORTED`；`agent` 必须是 `ctx.agents` 里那份 live 实例，且必须在 `roots()`；owned child → `DELEGATED_CALLER`（本工具不改写这条，测试期望原文）。[E: packages/interaction/user-questions/src/index.ts:107] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:759] `intent.approve` 必须是本题 options 之一，且必须带 `detail`，否则 `BAD_INTENT`。[E: packages/interaction/user-questions/src/index.ts:124]
8. dismiss：`UserQuestionError` + `ASK_CANCELLED` 被改写成「The user dismissed the plan review to speak instead; stay in plan mode, stop here, and wait for their message.」——避免模型看到它没调用过的 `ask_user_question` 名字。[E: packages/plan/plan-mode/src/index.ts:357] Web 宿主里人取消 pending question 时，apiproxy 抛 `UserQuestionError(..., 'ASK_CANCELLED')`。[E: packages/host/apiproxy/src/api-proxy.ts:3718] [E: packages/host/apiproxy/src/api-proxy.ts:3719] `ASK_ABORTED` 与其它错误原样 `throw cause`。[E: packages/plan/plan-mode/src/index.ts:361] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:952]
9. `ask` 返回后若 plugin fiber 已 dispose（HMR），抛「the plan-mode service was reloaded… present the plan again」，避免宣称一次永远 flush 不了的退出。[E: packages/plan/plan-mode/src/index.ts:365] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:991]
10. 同意条件：恰好一条 `id === 'plan-review'` 的答案，`selected.length === 1` 且 `selected[0] === 'Approve'`，并且 `custom === undefined`。缺项、双选、`Approve`+custom、纯 custom、`Keep planning` 一律当 keep-planning。[E: packages/plan/plan-mode/src/index.ts:370] 无 feedback 用通用句；有 `custom` 则原文拼进错误。[E: packages/plan/plan-mode/src/index.ts:372] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:865]
11. 通过后 **不**立刻 `session.append('plan/mode')`。`pendingIntents.set(session, { active: false, narrate: false })`，返回 `{ approved: true }`。[E: packages/plan/plan-mode/src/index.ts:379] [E: packages/plan/plan-mode/src/index.ts:380] `narrate: false`：下一次 `agent/pre-step` flush 时不注入「The user switched this session back to the default mode.」——工具结果本身就是叙述。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:858]
12. 同一 assistant batch 里 `foldPlanMode` 仍为 `true`，`get()` 读到 `{ active: true, pending: false }`。下一次被接受的 in-turn `agent/pre-step` 调 `onBoundary` → `session.append('plan/mode', { active: false })` 之后 fold 才翻。[E: packages/plan/plan-mode/src/index.ts:456] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:775] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:777]

## 设计动机·edge

- **Catalog 稳定换模式。** 进 / 出 plan mode 不增删工具，是为了 request-cache / header 形状稳定。非 plan mode 调用会失败，但名字一直在。
- **软约束，硬门只在出口。** 其它工具在 plan mode 照样能 `execute` 成功。禁变异、禁 `todo_write` 跟踪规划，写在 `section` 里。sandbox / approval 是独立轴，本插件不读不写它们。
- **Approve 延迟提交。** 同 batch 剩余 tool call 仍处在 fold=plan 的世界；下一次 step 的 request assembly 才按已退出的 fold 组。`plan:policy` 因 pending 提前变空，避免下一步还带规划指导。
- **H1 门 vs UI 标题。** execute 只要 trim 后的 ATX H1（`# ` + 非空白）。`presentCall` 的 `firstHeading` 接受 1–6 级、任意行。`##` 计划可以画出标题卡，但过不了 execute。
- **Consent 极窄。** 只有单选 `Approve` 且没有 `custom` 才算同意。`Approve` 旁边写字、多选、空 answers、重复 `plan-review` 项，全部 keep-planning。
- **Dismiss ≠ 失败通道名。** `ASK_CANCELLED` 改写成「人要说话，停在 plan mode」；abort / provider 抛错保留原消息。
- **子代理没有人。** owned child 调本工具时，`userQuestions.ask` 在 provider 之前就 `DELEGATED_CALLER`。计划审阅回不了子会话。
- **人可以绕过本工具。** `/plan off` 走 `PlanModeController.set`；idle 时立刻 append，open turn 时 queued。那是 commands 面，不是本工具 schema。
- **Code Mode 绑定仍在。** `mode: 'code'` 的 wire catalog 只剩 `run_code`，但 SDK 仍声明 `exit_plan_mode: { approved: true }`；嵌套 dispatch 会打 `tool/code-dispatch`。[E: packages/plan/plan-mode/tests/plan-mode.spec.ts:140] [E: packages/plan/plan-mode/tests/plan-mode.spec.ts:826]
- **没有 `apply_patch` 方言。** 计划是给人看的 markdown，不是可执行补丁。实施发生在 Approve 之后的后续 step，用当时 catalog 里的 `edit` / `write` / `bash` 等。

## Sources

- packages/plan/plan-mode/src/index.ts
- packages/plan/plan-mode/src/types.ts
- packages/plan/plan-mode/src/invariant.ts
- packages/plan/plan-mode/package.json
- packages/plan/plan-mode/tests/plan-mode.spec.ts
- packages/plan/plan-mode/tests/integration.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/interaction/user-questions/src/index.ts
- packages/interaction/user-questions/src/types.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、timeout wrapper、Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [plan mode 状态](../../subsystems/orchestration/plan.md)（`subsys.orchestration.plan`）：`plan/mode` fold、`pendingIntents`、`/plan`、projection `plan` 的子系统页。
- [ask_user_question](ask-user-question.md)（`surface.tools.ask-user-question`）：同一 `ctx.userQuestions` 缝上的模型提问工具；本页的审阅 `id` 是固定的 `plan-review`，问题不是模型写的。
- [todo_write](todo-write.md)（`surface.tools.todo-write`）：`section` 禁止用它跟踪规划阶段；那是 prompt 政策，本工具 schema 不引用它。
- [run_code](run-code.md)（`surface.tools.run-code`）：`mode: code` 时模型直调 `exit_plan_mode` 被 collapse，要从 `run_code` 绑定里调。
