---
id: subsys.core.tools
title: 工具注册表与执行管线
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/types.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/json-schema.ts
  - packages/core/tools/src/presentation.ts
  - packages/core/tools/tests/tools.spec.ts
  - packages/core/tools/tests/execution-mode.spec.ts
  - packages/core/tools/tests/code-mode.spec.ts
  - packages/core/tools/tests/scoped.spec.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/core/scope/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - ctx.tools
  - ToolRuntime
  - defineTool
  - presentAs
related:
  - spine.tool-call-anatomy
  - spine.overview
  - subsys.core.code-mode
  - spine.turn-and-step
  - spine.session-log
  - subsys.core.agent-tool-presentation
  - subsys.persistence.checkpoint
  - subsys.core.scope
  - subsys.composition.agent-presets
  - surface.presets.overview
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.tools`（`ToolRuntime`）是 **host 面**工具注册表与执行管线：`register` / `schemas(scope)` / `execute` 用 `dsh-scope` 分层；模型直调走 `tools/pre-execute`（waterfall，`next()` 默认 `allow`；`ask` 无 `ctx.approval` 变 deny）→ 单调 `guard` → `tools/execute`（around，可换 `signal` 不能换身份）→ body → `tools/post-execute` → emit `tools/result`。`presentAs` 只能在 scoped context 上改该 scope 的 `native` / `code` / `both`；`code` 在进 pre-execute **之前**拒掉非 `run_code` 的直调。

## 能回答的问题

- `ctx.tools` 是 host 面还是 agent-preset 面？谁 `register`、谁 `presentAs`、web 与 headless 差在哪一层？
- `tools/pre-execute` / `tools/execute` / `tools/post-execute` 各自决定什么？waterfall 不调用 `next()` 会怎样？
- `ask` 怎样落到 `ctx.approval`？没有 approval 缝、没有 `exec.agent` 分别 deny 成什么？
- `presentAs` 为什么必须 scoped？一 scope 两个 mode、以及 `mode: 'code'` 直调 native 名，分别在哪一层被拒？
- 顶层 `tools/execute` 进 body 之前谁 `flush`？带着 `parent` 的 Code Mode 子调用为什么跳过？
- `tools/change` 为什么是 unfiltered emit，而 `tools/result` 走 `scopeTarget`？

## 职责边界

本包 `@deepseek-ai/dsh-tools` 拥有：进程级服务 `ctx.tools`、`ToolDefinition` 合同、`defineTool` / JSON Schema 子集、`presentAs` / `restrict` / `guard`、以及 pre / around / post / result 管线。它**不**实现某一种 loop，也**不**拥有某个 `dsh-tool-*` 的参数字段（那些是 `surface.tools.*`）。

明确不拥有：

- 默认 step 调度与 `tool/call`→`tool/result` 落盘：`executeToolCalls` 在 [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）/ [spine.turn-and-step](../../spine/turn-and-step.md)（`spine.turn-and-step`）。
- `run_code` 子调度、SDK 语言对齐、`tools/code-dispatch-log` 只改日志副本：[subsys.core.code-mode](code-mode.md)（`subsys.core.code-mode`）。
- preset 行里的 `presentAs('code'|'both')` 与 `inject(['codeRuntime'])`：[subsys.core.agent-tool-presentation](agent-tool-presentation.md)（`subsys.core.agent-tool-presentation`）。
- top-level `flush` 策略细节：[subsys.persistence.checkpoint](../persistence/checkpoint.md)（`subsys.persistence.checkpoint`）。
- `ScopedLayers` / `scopeTarget` / `bindScopeParent` 原语：[subsys.core.scope](scope.md)（`subsys.core.scope`）。
- standing mount 与 `leakedServices`：[subsys.composition.agent-presets](../composition/agent-presets.md)（`subsys.composition.agent-presets`）。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个固定工具清单的 coding agent」。注册表坐在 **host 面**（与 sandbox / approval / persistence / subagent backends 同级）；**agent-preset 面**只往这份注册表 `register` / `restrict` / `presentAs`，并用 `isolate` 挡住会泄漏到 root realm 的 service publish。`dsh-base` 没有 subagent-codex / subagent-claude-code：不是「装了但 dormant」。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/tools/src/index.ts` | `ToolRuntime`：`ctx.tools`、事件、`register` / `schemas` / `execute` / `presentAs` |
| `packages/core/tools/src/types.ts` | `tool/code-dispatch-start` / `tool/code-dispatch` 的 `SessionEventMap` 扩展（log-only） |
| `packages/core/tools/src/schema.ts` | `defineTool`、`ParameterSchemaSpec`、`ToolArgsError` |
| `packages/core/tools/src/json-schema.ts` | 强制 JSON Schema 子集；未知 keyword fail-closed |
| `packages/core/tools/src/presentation.ts` | `presentCall` / `presentResult` 的 UI render-intent（`ToolCallView` / `ToolResultView`） |
| `packages/core/tools/tests/tools.spec.ts` | 管线顺序、`ask` 退化、waterfall 不 `next()` |
| `packages/core/tools/tests/execution-mode.spec.ts` | `isConcurrencySafe === true` 才 parallel |
| `packages/core/tools/tests/code-mode.spec.ts` | `code` collapse、`presentAs` 必须 scoped |
| `packages/core/tools/tests/scoped.spec.ts` | 分层 register / restrict / scoped listener |
| `packages/core/agent-loop/src/tool-calls.ts` | loop 侧 staged `prepare` / `dispatch` / `finalize` |
| `packages/session/session-checkpoint-policy/src/index.ts` | 顶层 `tools/execute` 进 body 前 `flush` |
| `packages/core/agent-tool-presentation/src/index.ts` | preset 面 `presentAs` 一行 |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset publish 进 root 就拒 |
| `packages/bundle/base/cordis.patch.yml` | host 挂上 `id: tools` |
| `packages/bundle/base/tests/base.spec.ts` | 钉死没有 subagent-codex / subagent-claude-code |
| `packages/bundle/web-app/cordis.patch.yml` | `DSH_TOOLS_MODE`；整表 `disabled: true` 模型可见行 |
| `vendor/cordis/src/events.ts` | waterfall 必须 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Config.mode` | `'native' \| 'code' \| 'both'`，schema 默认 `'native'`。[E: packages/core/tools/src/index.ts:791] |
| `Config.maxParallelSubCalls` | `run_code` 子调用重叠上限，默认 `10`，须正整数。[E: packages/core/tools/src/index.ts:792] |
| `ToolPresentationMode` | 模型看见的形态。部署默认在 tools 行；scope 覆盖走 `presentAs`。 |
| `PreToolDecision` | `allow` / `deny{reason}` / `ask{reason?}`。不能改 arguments（参数已记进 `tool/call`）。[E: packages/core/tools/src/index.ts:588] |
| `PostToolDecision` | `accept`（可换 `content` 或 `value`，不能两者都换）/ `block{feedback}`。[E: packages/core/tools/src/index.ts:597] |
| `ToolGuard` | 只返回 `string \| undefined`。没有 allow 通道，后挂的 guard 不能把拒绝翻成放行。[E: packages/core/tools/src/index.ts:711] |
| `ScheduledToolPreparation` | `dispatch` / `post-result`（还走 post-execute）/ `final-result`（绕过 post）。 |
| `TOOL_RUNTIME_SCHEDULER` | loop 用的 staged API：`prepare` / `dispatch` / `finalize` / `finish`。[E: packages/core/tools/src/index.ts:796] |

事件（本页权威）：

| 事件 | 模式 | 默认 `next()` / 语义 |
|---|---|---|
| `tools/pre-execute` | waterfall | `{ kind: 'allow' }`。[E: packages/core/tools/src/index.ts:152] [E: packages/core/tools/src/index.ts:1477] |
| `tools/execute` | waterfall | `dispatchToolBody`。wrapper 可换 `exec.signal`，不能换 call 身份。[E: packages/core/tools/src/index.ts:163] |
| `tools/post-execute` | waterfall | `{ kind: 'accept' }`。[E: packages/core/tools/src/index.ts:175] [E: packages/core/tools/src/index.ts:1745] |
| `tools/code-dispatch-log` | waterfall | 只改 `run_code` 子调用的**日志副本**。细节在 `subsys.core.code-mode`。[E: packages/core/tools/src/index.ts:189] |
| `tools/result` | emit | `scopeTarget(this, exec.agent)`，失败被 contain。[E: packages/core/tools/src/index.ts:197] [E: packages/core/tools/src/index.ts:1666] |
| `tools/change` | emit | **unfiltered**：`ScopedLayers` 变更直接 `ctx.emit('tools/change')`，不用 `scopeTarget`。[E: packages/core/tools/src/index.ts:207] [E: packages/core/tools/src/index.ts:813] |

`defineTool` 把 `ParameterSchemaSpec` 编成开放 object root，`execute` 前硬校验并抛 `ToolArgsError`（`INVALID_ARGS`）；`presentCall` / `presentResult` / `isConcurrencySafe` 对畸形 args **软**失败（replay 旧日志不能炸 UI）。[E: packages/core/tools/src/schema.ts:545] [E: packages/core/tools/src/schema.ts:586] `assertSupportedJsonSchema` 拒绝子集外 keyword，而不是默默忽略。[E: packages/core/tools/src/json-schema.ts:385] UI 卡片类型在 `presentation.ts`（`ToolCallView` / `ToolResultView`），本页不写各 `dsh-tool-*` 字段表。[E: packages/core/tools/src/presentation.ts:46]

## 控制流

1. **host 面挂上注册表。** `dsh-base` 的 `cordis.patch.yml` 插入 `id: tools` / `name: '@deepseek-ai/dsh-tools'`，省略 `mode` 以保持 schema 默认 `native`。[E: packages/bundle/base/cordis.patch.yml:424] [E: packages/bundle/base/cordis.patch.yml:425] `dsh-base` 没有 subagent-codex / subagent-claude-code：patch 这两 id 行数为 0，manifest 也不依赖那两个包——不是 dormant 加载。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41] `ToolRuntime` 构造 `super(ctx, 'tools')`，`static inject = ['systemPrompt']`，并把 `wireSchemas(scope)` 挂进 `ctx.systemPrompt.tools`。[E: packages/core/tools/src/index.ts:788] [E: packages/core/tools/src/index.ts:827] [E: packages/core/tools/src/index.ts:832] 同 bundle 还挂 `approval`、`timeout-policy`、`session-checkpoint-policy`，它们是这条管线的 Consumer，不是第二份注册表。[E: packages/bundle/base/cordis.patch.yml:188] [E: packages/bundle/base/cordis.patch.yml:343] [E: packages/bundle/base/cordis.patch.yml:355]

2. **web 把模型可见 tool 行挪到 preset；headless 留在 host。** `dsh-web-app` 覆写同一 `id: tools` 的 `mode: !!js process.env.DSH_TOOLS_MODE`（未设则仍是 schema 默认）。[E: packages/bundle/web-app/cordis.patch.yml:35] [E: packages/bundle/web-app/cordis.patch.yml:41] 它把 base 上模型可见行整表标 `disabled: true`（`tool-bash` / `tool-pwsh` / `tool-jobs` / `tool-fs` / `tool-fs-search` / `tool-str-replace-editor` / `skill-filesystem` / `tool-skill` / `tool-goal` / `plan-mode` / `compaction-basic` / `command-compact` / `tool-result-pruner` / `tool-subagent-control` / `tool-subagent-list-agents` / `tool-subagent` / `tool-subagent-fork` / `workflow-worker-thread` / `tool-workflow` / `tool-ralph` / `agent-instructions` / `tool-todo` / `tool-web`），改由 `agent-presets`（`default: standard`）在 standing scope 再 `register`。[E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424] `dsh-headless` 同样吃 `DSH_TOOLS_MODE`，但**不**挂 `agent-presets`、**不** disable base 工具行：模型可见工具留在 host 全局层。[E: packages/bundle/headless/cordis.patch.yml:17] [E: packages/bundle/headless/cordis.patch.yml:20] 某工具「在不在默认产品里」只认 shipped `agent.cordis.yml`，不认仓库里有这个包。`hmr` 也是 `disabled: true`，但不是模型可见 catalog 行。[E: packages/bundle/web-app/cordis.patch.yml:23]

| `id` | `disabled: true` |
|---|---|
| `tool-bash` | [E: packages/bundle/web-app/cordis.patch.yml:294] |
| `tool-pwsh` | [E: packages/bundle/web-app/cordis.patch.yml:297] |
| `tool-jobs` | [E: packages/bundle/web-app/cordis.patch.yml:310] |
| `tool-fs` | [E: packages/bundle/web-app/cordis.patch.yml:313] |
| `tool-fs-search` | [E: packages/bundle/web-app/cordis.patch.yml:316] |
| `tool-str-replace-editor` | [E: packages/bundle/web-app/cordis.patch.yml:319] |
| `skill-filesystem` | [E: packages/bundle/web-app/cordis.patch.yml:331] |
| `tool-skill` | [E: packages/bundle/web-app/cordis.patch.yml:334] |
| `tool-goal` | [E: packages/bundle/web-app/cordis.patch.yml:346] |
| `plan-mode` | [E: packages/bundle/web-app/cordis.patch.yml:349] |
| `compaction-basic` | [E: packages/bundle/web-app/cordis.patch.yml:359] |
| `command-compact` | [E: packages/bundle/web-app/cordis.patch.yml:362] |
| `tool-result-pruner` | [E: packages/bundle/web-app/cordis.patch.yml:365] |
| `tool-subagent-control` | [E: packages/bundle/web-app/cordis.patch.yml:375] |
| `tool-subagent-list-agents` | [E: packages/bundle/web-app/cordis.patch.yml:378] |
| `tool-subagent` | [E: packages/bundle/web-app/cordis.patch.yml:381] |
| `tool-subagent-fork` | [E: packages/bundle/web-app/cordis.patch.yml:384] |
| `workflow-worker-thread` | [E: packages/bundle/web-app/cordis.patch.yml:393] |
| `tool-workflow` | [E: packages/bundle/web-app/cordis.patch.yml:396] |
| `tool-ralph` | [E: packages/bundle/web-app/cordis.patch.yml:399] |
| `agent-instructions` | [E: packages/bundle/web-app/cordis.patch.yml:402] |
| `tool-todo` | [E: packages/bundle/web-app/cordis.patch.yml:405] |
| `tool-web` | [E: packages/bundle/web-app/cordis.patch.yml:408] |

3. **`register` 写进 `ScopedLayers`，`run_code` 名永远预留。** `register@packages/core/tools/src/index.ts` 校验 `output.{schema,render}`，拒绝 `name === RUN_CODE_NAME`（即使当前部署是 native：以后 preset 还可能 `presentAs('code')`），再 `layers.effect(..., layer => layer.tools.insert(name, definition))`。[E: packages/core/tools/src/index.ts:1037] [E: packages/core/tools/src/index.ts:1054] 同层重名抛错；fiber dispose 卸掉条目。[E: packages/core/tools/tests/tools.spec.ts:1981] 层变更回调是 `this.ctx.emit('tools/change')`：scoped listener 也会看到别人的注册变化，因为下一轮 `assemble` 可能受祖先层影响。[E: packages/core/tools/src/index.ts:813]

4. **`view(scope)` 一次遍历：继承面先 restrict，自己的层后 shadow，transport 最后插入。** 祖先（含 global）上的名字要整条链 `admits` 才进 `visible`；本层自己 `register` 的名字**不受**本层 restrict 过滤（子代理自己的 reporting 工具不能被自己的 allow-list 剥掉）。[E: packages/core/tools/src/index.ts:1174] [E: packages/core/tools/src/index.ts:1179] `modeFor(scope) !== 'native'` 时才把预留 `run_code` 塞进该 scope 的 dispatch 表。[E: packages/core/tools/src/index.ts:1189] `restrict` 只能在 scoped context 上调用；空 filter、未知名、点名 `run_code` 都 fail-loud。[E: packages/core/tools/src/index.ts:1073] 测试：scope 里 `register('mine')` 只对该 agent 可见 / 可执行，对别的 agent 就是 `unknown tool`。[E: packages/core/tools/tests/scoped.spec.ts:75]

5. **`schemas(scope)` 是模型可见白名单。** 只投影 `name` / `description` / `parameters`；`execute`、`timeoutMs`、`isConcurrencySafe`、presenters 全部丢掉。[E: packages/core/tools/src/index.ts:1234] [E: packages/core/tools/src/index.ts:1262] 测试钉死 keys 恰好是这三项。[E: packages/core/tools/tests/tools.spec.ts:68] [E: packages/core/tools/tests/execution-mode.spec.ts:133] `wireSchemas` 在 `mode === 'code'` 时进一步把 schemas / knownNames 收成只剩 `run_code`。[E: packages/core/tools/src/index.ts:994] 这是 **model-visible ⟺ logged** 在注册表这一侧：模型请求里的 tools 必须能从当时 scope 的可见定义重建，不能夹带 host 回调。

6. **`presentAs` 是 preset 面的一行，不是第二份注册表。** `presentAs@packages/core/tools/src/index.ts`：`scopeOf(ctx) === undefined` 立刻抛「context-global presentation is the `mode` config field」；已有 `layer.mode` 再声明则抛 conflict。[E: packages/core/tools/src/index.ts:948] [E: packages/core/tools/src/index.ts:956] `modeFor` 从近到远读 chain，nearest 赢，所以 standing preset 的一次声明覆盖所有 `bindScopeParent` 上去的 agent。[E: packages/core/tools/src/index.ts:908] shipped 只有 `code` preset 挂 `dsh-agent-tool-presentation` 且 `mode: code`：`native` 立刻 `presentAs`；`code`/`both` 先 `inject(['codeRuntime'], …)`，缺 runtime 则该行 pending。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: packages/core/agent-tool-presentation/src/index.ts:64] [E: packages/core/agent-tool-presentation/src/index.ts:69] 测试：裸 `ctx.tools.presentAs('code')` 抛 `requires a scoped context`；同一 scope 第二次声明抛 `conflicts with "code"`。[E: packages/core/tools/tests/code-mode.spec.ts:1776] [E: packages/core/tools/tests/code-mode.spec.ts:1769]

7. **loop 只调度，策略在注册表。** `ReactLoopAgent.step@packages/core/agent-loop/src/agent.ts` 抽出 `type === 'tool-call'` 后调用 `executeToolCalls`。[E: packages/core/agent-loop/src/agent.ts:395] `executeToolCalls@packages/core/agent-loop/src/tool-calls.ts` 用 `ctx.agents.requireInitiator()` 填每条 `ToolExecutionInput.agent`，按 `ctx.tools.executionMode(...).kind` 切 exclusive 屏障或 parallel 滚动池。[E: packages/core/agent-loop/src/tool-calls.ts:59] [E: packages/core/agent-loop/src/tool-calls.ts:88] `executionMode` fail-closed：只有 `isConcurrencySafe(args) === true` 才 `parallel`；缺方法、抛错、非 `true`、未知名一律 `exclusive`。[E: packages/core/tools/src/index.ts:1278] [E: packages/core/tools/tests/execution-mode.spec.ts:37] [E: packages/core/tools/tests/execution-mode.spec.ts:48] `startCall` **先** `session.append('tool/call', …)` 再 `TOOL_RUNTIME_SCHEDULER.prepare`。[E: packages/core/agent-loop/src/tool-calls.ts:167] [E: packages/core/agent-loop/src/tool-calls.ts:169] `tool/call` 不是 surface；模型下一轮看见的是随后 `surfaceOp: 'append'` 的 `tool/result`（[spine.session-log](../../spine/session-log.md)）。

8. **`code` collapse 在进 `tools/pre-execute` 之前。** `collapses(name, scope, nested)`：非 nested、有效 mode 是 `code`、名字不是 `run_code`。[E: packages/core/tools/src/index.ts:1325] `createExecution` 若 collapsed，直接返回 `final-result` + `ToolNotFoundError`（文案写明必须从 `run_code` 程序里调），pre-execute / `ask` / guard 都看不见这条注定失败的直调。[E: packages/core/tools/src/index.ts:1423] [E: packages/core/tools/src/index.ts:1439] 带 `parent` token 的 SDK 子调用 `nested === true`，collapse 不生效。测试：部署 `mode: 'code'` 时直调 `write` 是 `UNKNOWN_TOOL`，body 零次。[E: packages/core/tools/tests/code-mode.spec.ts:1595] [E: packages/core/tools/tests/code-mode.spec.ts:1607]

9. **`tools/pre-execute` waterfall：必须 `next()` 才会落到默认 `allow`。** `prepareExecution` 用 `scopeTarget(this, exec.agent)` 做 carrier，再 `ctx.waterfall(..., 'tools/pre-execute', exec, () => allow)`。[E: packages/core/tools/src/index.ts:1474] [E: packages/core/tools/src/index.ts:1476] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；listener 不调用传入的 `next()` 就不会 `cbs.shift()`，链停在本层。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] listener 可以直接返回 `allow` / `deny` / `ask`（permission 模式），也可以 `await next()` 再改写。agent-scoped listener 只收到该 agent 的调用：`scopeTarget` 让祖先 listener 看见后代事件，反向不行。[E: packages/core/scope/src/index.ts:170] [E: packages/core/tools/tests/scoped.spec.ts:273]

10. **`ask` fail-closed。** `gate.kind === 'ask'` 才进 `serviceAsk`：`ctx.get('approval')` 为 `undefined` 时 deny（带 reason，或默认 `requires approval (not yet supported)`）；没有 `exec.agent` 同样 deny（没有 session / UI 可路由）。[E: packages/core/tools/src/index.ts:1479] [E: packages/core/tools/src/index.ts:1693] [E: packages/core/tools/src/index.ts:1694] 唯一放行是 `'allowed-once'`；`rejected` / `cancelled` / `unavailable` 各有文案。[E: packages/core/tools/src/index.ts:1714] 测试：没装 approval 缝时 `ask` 变成 isError，body 不跑。[E: packages/core/tools/tests/tools.spec.ts:697] `allow` 之后才跑单调 `guardReason`：global 层先，再 scope chain；任一 reason 变 deny。[E: packages/core/tools/src/index.ts:1487] deny / 取消走 `post-result`（还过 post-execute）；pre-execute **抛错**走 `final-result`（绕过 post）。[E: packages/core/tools/src/index.ts:1505]

11. **`tools/execute` around：可换 `signal`，不能换身份；checkpoint 在 top-level `next()` 之前。** `dispatchScheduledExecution` 再一次 `waterfall(..., 'tools/execute', mutableExec, () => dispatchToolBody)`。[E: packages/core/tools/src/index.ts:1573] wrapper 不调用 `next()` 就 short-circuit，body 不跑；返回的 result 仍要过 output 合同。[E: packages/core/tools/tests/tools.spec.ts:1768] `dsh-session-checkpoint-policy` 挂在这一层：`exec.agent === undefined || exec.parent !== undefined` 直接 `next()`；否则 `await ctx.sessions.flush(exec.agent.session)`，flush 完若已 abort 则 `ABORTED_BEFORE_DISPATCH`，否则才 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:74] 测试顺序是 `flush:start → flush:end → tool`；flush 失败则 body 零次。[E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:145] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:203] `dsh-tool-call-timeout-policy` 读 `timeoutMs`，换 `exec.signal` 后必须 `next()`，只有自己的 timer 响了才替换成 `TOOL_TIMEOUT`。`dispatchToolBody` 把 caller signal 与 wrapper signal fuse 回去，`bodyInvoked = true` 之后才 `await tool.execute`；取消也不丢弃这条 promise。[E: packages/core/tools/src/index.ts:1548] [E: packages/core/tools/src/index.ts:1549] 管线顺序测试：`pre → execute:before → dispatch → execute:after → post`。[E: packages/core/tools/tests/tools.spec.ts:1091]

12. **post → finalizeContent → `tools/result` → loop 写 surface。** `postExecute` 默认 `accept`；`block` 把 `feedback` 变成 isError；不能同时换 `value` 和 `content`，也不能给失败结果换 `value`。[E: packages/core/tools/src/index.ts:1743] 然后 `finalizeContent`（execute 开始时快照）只许换 `content`。`notifyResult` freeze `exec` 再 emit `tools/result`。[E: packages/core/tools/src/index.ts:1660] [E: packages/core/tools/src/index.ts:1666] loop 的 `commitReady` 按**模型顺序** `finalize`/`finish`，再 `session.append('tool/result', …, { surfaceOp: 'append' })`。[E: packages/core/agent-loop/src/tool-calls.ts:152] [E: packages/core/agent-loop/src/tool-calls.ts:281] `deriveMessages()` 只折叠 surface；这是 **model-visible ⟺ logged** 在结果这一侧。

13. **isolate / `leakedServices`：注册表本身必须留在 host。** `ToolRuntime` 把 `tools` publish 进它所在的 realm。preset 再挂一份 `dsh-tools` 会把 `tools` 写进 root store，`mountPreset` 的 `leakedServices` 会扫到 `rootIsolate[impl.name] === key` 并抛「published process-global service(s) … must sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:364] 因此 shipped preset **不**重挂注册表：`tool-bash` 这类行只 `ctx.tools.register`（消费 host 的 `ctx.tools` / `ctx.shell`）。真正 publish 私有服务的行必须带 `isolate`，例如 `standard` 的 `planMode: true` / `compaction: true` / `workflowEngine: true`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] `presentAs` 只写 `ToolLayer.mode`，不 publish 新 service，所以不需要 isolate 才能声明 Code Mode。

## 设计动机

- **注册表是进程单例，呈现是 scope 声明。** loop 调度器、API proxy 的 presenters、每个 tool plugin 都消费同一份 `ctx.tools`，它不能搬进 preset。preset 能拥有的是「这个 standing scope 的模型看见哪种形态」——这正是 `presentAs` 存在的原因，也是 `dsh-agent-tool-presentation` 只做一行的原因。
- **策略挂 waterfall，不焊进 loop。** 换审批 / timeout / checkpoint / 自定义 deny，是 `ctx.on('tools/…')` 的可逆 effect；不调用 `next()` 就是本层否决。这和把 `beforeToolCall` 焊在单个 `AgentTool` 上的 peer harness 不在同一层。
- **`code` collapse 必须早于 approval。** 否则 hooks 会去「批准」一条 registry 已决定 `UNKNOWN_TOOL` 的直调，模型和人都会以为部署自相矛盾。
- **parallel 是 opt-in。** 未声明 `isConcurrencySafe` 的工具永远独占一组，避免默认可并行把写工具叠在一起。
- **guard 单调、`ask` fail-closed。** 扩展点可以放行或加严，不能把别人的 deny 翻成 allow；没有 approval 缝就当拒绝，而不是静默执行。

## Gotcha

- 在根 context 调 `presentAs` 会抛错。进程级默认用 tools 行的 `mode` config，不是全局 `presentAs`。[E: packages/core/tools/src/index.ts:949]
- 同一 scope 只能有一个 mode。两次 `presentAs` 是矛盾，不是 merge。[E: packages/core/tools/src/index.ts:956]
- `tools/pre-execute` 返回 `ask` 而没挂 `dsh-user-approval`：body 不跑，结果是 isError。[E: packages/core/tools/tests/tools.spec.ts:705]
- `tools/execute` listener 返回 result 却不 `next()`：body 被跳过，但结果仍按 output schema 规范化。[E: packages/core/tools/tests/tools.spec.ts:1781]
- wrapper 只能改 `exec.signal`。identity（`name` / `callId` / `token` / `arguments`）是 readonly；registry 会把 caller signal fuse 回任何替换，取消不能被「换一个 signal」摘掉。[E: packages/core/tools/src/index.ts:1537]
- `tools/change` 没有 scope 过滤。在 agent.ctx 上 `ctx.on('tools/change')` 会看到全进程的注册变化。
- `restrict` 过滤的是**继承面**。对本层自己 `register` 的名字点名会当成 unknown；`run_code` 根本不进 restrictable 集合。
- 顶层 checkpoint 失败是 fail-closed：`tools/execute` listener 抛错变成 isError，body 未调用。嵌套 `parent` 不二次 flush。
- `timeoutMs` / `isConcurrencySafe` / presenters 从不进 `schemas()`。模型只能看见 name / description / parameters。
- web overlay 用 `DSH_TOOLS_MODE` 改的是**部署默认**，不是某次会话的 `presentAs`。per-session Code Mode 走 preset 的 `dsh-agent-tool-presentation`。
- `dsh-base` 没有 subagent-codex / subagent-claude-code。不要写成「base 装了但 dormant」。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| 工具注册表 | `@deepseek-ai/dsh-tools` 的 `ToolRuntime`；`ctx.tools`；事件 `tools/*` | **host**：`dsh-base` 行 `id: tools`（headless 工具也留在这层） | `dsh-tool-*` / plan-mode / schedule 的 `register`；`ReactLoopAgent`→`executeToolCalls`；`ctx.systemPrompt.tools` |
| 呈现模式 | `Config.mode` + `ToolRuntime.presentAs` + `modeFor` | **host** 默认：tools 行 / `DSH_TOOLS_MODE`。**preset**：`dsh-agent-tool-presentation`（shipped 仅 `code`，`mode: code`） | `wireSchemas` / `collapses` / `requireCodeTransport` |
| pre-execute | `Events['tools/pre-execute']` | 任意 `ctx.on`（permission / 自定义 gate） | `ToolRuntime.prepareExecution`；默认 `next()` = `allow` |
| around-dispatch | `Events['tools/execute']` | `dsh-session-checkpoint-policy`（顶层 `flush`）；`dsh-tool-call-timeout-policy`（换 `signal`） | `dispatchToolBody` → `ToolDefinition.execute` |
| 审批 | 可选 `ctx.approval` | **host** `id: approval`（`dsh-user-approval`） | `serviceAsk`：`ask` → `allowed-once` 才放行 |
| scope 分层 | `dsh-scope` 的 `ScopedLayers` / `scopeTarget` | `createScope` + preset `bindScopeParent` | `register` / `restrict` / `presentAs` / 管线 carrier |
| isolate | `leakedServices(ctx, fiber)` | `mountPreset` 在 preset 面审计 | 会 `provide` 的 preset 行必须 `isolate: { …: true }`；`dsh-tools` 本身禁止进 preset |

## Sources

- packages/core/tools/src/index.ts
- packages/core/tools/src/types.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/json-schema.ts
- packages/core/tools/src/presentation.ts
- packages/core/tools/tests/tools.spec.ts
- packages/core/tools/tests/execution-mode.spec.ts
- packages/core/tools/tests/code-mode.spec.ts
- packages/core/tools/tests/scoped.spec.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/src/agent.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts
- packages/core/agent-tool-presentation/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/core/scope/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：从 `assistant/message` 的 tool-call 到 `tool/result` 的端到端解剖。
- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → preset` 与 host / preset 切面。
- [subsys.core.code-mode](code-mode.md)（`subsys.core.code-mode`）：`run_code` transport、SDK 子调度、`tools/code-dispatch-log`。
- [spine.turn-and-step](../../spine/turn-and-step.md)（`spine.turn-and-step`）：`ReactLoopAgent.step` 何时进入 `executeToolCalls`。
- [spine.session-log](../../spine/session-log.md)（`spine.session-log`）：`tool/result` surface 与 `deriveMessages()`。
- [subsys.core.agent-tool-presentation](agent-tool-presentation.md)（`subsys.core.agent-tool-presentation`）：preset 行如何 `presentAs`。
- [subsys.persistence.checkpoint](../persistence/checkpoint.md)（`subsys.persistence.checkpoint`）：`llm/stream` / `tools/execute` / `agent/pre-step` 三个 flush 落点。
- [subsys.core.scope](scope.md)（`subsys.core.scope`）：`ScopedLayers` 向下继承、`scopeTarget` 向上准入。
- [subsys.composition.agent-presets](../composition/agent-presets.md)（`subsys.composition.agent-presets`）：standing mount 与 `leakedServices`。
- [surface.presets.overview](../../surface/presets/overview.md)（`surface.presets.overview`）：四个 shipped preset 的成员资格入口。
