---
id: subsys.context.timeout-policy
title: 工具超时策略
kind: subsystem
tier: T2
pkg: context
source:
  - packages/guard/timeout-policy/src/index.ts
  - packages/guard/timeout-policy/src/invariant.ts
  - packages/guard/timeout-policy/tests/timeout-policy.spec.ts
  - packages/guard/timeout-policy/package.json
  - packages/util/timeout/src/index.ts
  - packages/util/timeout/tests/timeout.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/tests/tools.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/session/session-checkpoint-policy/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - TOOL_TIMEOUT
  - apply
  - timeoutMs
related:
  - spine.tool-call-anatomy
  - subsys.core.tools
  - spine.overview
  - subsys.persistence.checkpoint
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-tool-call-timeout-policy` 是 **host 面** Consumer：`inject = ['tools']`，挂 `tools/execute` waterfall，读 `ctx.tools.get(name, agent)?.timeoutMs`。`undefined` 则原样 `next()`；有预算则 `deadline(exec.signal, timeoutMs, TOOL_TIMEOUT)` 暂时换 `exec.signal`，`await next()`，**仅当自己的 timer 响了**（`timeoutOf(..., TOOL_TIMEOUT)`）才把结果换成 `TOOL_TIMEOUT`。它不是 Definition，不 `provide` 任何 `ctx.*`，`timeoutMs` 从不进模型 schema。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），能力缝是 Definition / Provider / Consumer。本行坐在进程级 host 树，和 `ctx.tools` 同一面；**agent-preset 面不重挂**。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。模型下一轮看见的 timeout 文案来自随后那条 `tool/result`（`model-visible ⟺ logged`），不是 schema 里的参数。

## 能回答的问题

- `timeout-policy` 是 Definition 还是 Consumer？有没有 `ctx.timeout`？
- `timeoutMs` 为什么不进 `schemas()` / `schemaOf`？模型能不能改预算？
- `tools/execute` 上怎样换 `exec.signal`、怎样 `next()`？不调用 `next()` 会怎样？
- 只有自己的 `TOOL_TIMEOUT` timer 才替换结果；外层 deadline / 调用方 cancel 分别变成什么？
- `finally` 为什么要恢复 upstream signal？`tools/post-execute` 看见的是哪根 signal？
- `dsh-base` 怎么挂？`dsh-web-app` 会不会 `disabled`？四个 shipped preset 会不会重挂？要不要 isolate？

## 职责边界

本包 `@deepseek-ai/dsh-tool-call-timeout-policy` 拥有： [E: packages/guard/timeout-policy/package.json:2]

- function plugin 入口 `name = 'timeout-policy'`、`inject = ['tools']`、`apply`。 [E: packages/guard/timeout-policy/src/index.ts:28] [E: packages/guard/timeout-policy/src/index.ts:31] [E: packages/guard/timeout-policy/src/index.ts:55]
- 本插件拥有的分类码 `TOOL_TIMEOUT`（同时是 `deadline` 的 `code` 和替换 result 的 `error.info.code`）。 [E: packages/guard/timeout-policy/src/index.ts:25] [E: packages/guard/timeout-policy/src/index.ts:46]
- 在 `tools/execute` 上武装 / 拆除 per-call deadline，并在**自己的** timer 获胜后替换 `ToolExecutionResult`。 [E: packages/guard/timeout-policy/src/index.ts:56] [E: packages/guard/timeout-policy/src/index.ts:73]
- companion `timeout-policy-invariant`：`inject = ['invariants']`，installer 是空函数——本插件没有包内可变历史。 [E: packages/guard/timeout-policy/src/invariant.ts:15] [E: packages/guard/timeout-policy/src/invariant.ts:21]

本包**不**拥有：

- `ctx.tools` 注册表、`tools/pre-execute` / `tools/post-execute` 合同、`schemaOf` 白名单 —— [`subsys.core.tools`](../core/tools.md)。
- 各工具自己写在 `defineTool` / `register` 上的 `timeoutMs` **默认值**（bash / web_fetch / lsp 等数字留给对应 T1 页）。本页只消费「有没有预算」。
- 顶层 `sessions.flush` —— [`subsys.persistence.checkpoint`](../persistence/checkpoint.md) 的 `dsh-session-checkpoint-policy` 也挂 `tools/execute`，但认 `parent` / `agent`，本插件不认。 [E: packages/session/session-checkpoint-policy/src/index.ts:71]
- sandbox / `ctx.sandbox.confine` / `approveEscalation`；审批 `ctx.approval`。本插件既不 deny 调用，也不改 arguments。
- 重复调用提醒 —— 那是 `subsys.context.repeat-reminder`，挂 post-execute / pre-step，不否决。

`apply` 不 `ctx.provide`，因此也没有 isolate realm 可漏。shipped preset **不**重挂这一行。[I]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/guard/timeout-policy/src/index.ts` | `TOOL_TIMEOUT` / `name` / `inject` / `apply`；`tools/execute` wrapper |
| `packages/guard/timeout-policy/src/invariant.ts` | 空 installer 的 companion |
| `packages/guard/timeout-policy/tests/timeout-policy.spec.ts` | 无预算放行、快路径保结果、换 signal、post-execute 恢复、本 timer 替换、upstream cancel 不替换、fiber dispose |
| `packages/guard/timeout-policy/package.json` | 包名 `@deepseek-ai/dsh-tool-call-timeout-policy` |
| `packages/util/timeout/src/index.ts` | `deadline` / `timeoutOf` / `TimeoutReason` |
| `packages/util/timeout/tests/timeout.spec.ts` | 上游先 abort 不算 timeout；`timeoutOf(signal, code)` 按 code 收窄 |
| `packages/core/tools/src/index.ts` | `ToolDefinition.timeoutMs`、`schemaOf`、`tools/execute` waterfall、`get`、`register` 校验、`fuseToolSignals` |
| `packages/core/tools/src/schema.ts` | `defineTool` 把正有限 `timeoutMs` 拷进定义 |
| `packages/core/tools/tests/tools.spec.ts` | `schemas()` 不含 `timeoutMs`；`timeoutMs: 0` / `Infinity` 注册失败 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: timeout-policy` |
| `packages/bundle/web-app/cordis.patch.yml` | 用来对照：web overlay **没有** disable 本行 |
| `packages/session/session-checkpoint-policy/src/index.ts` | 同事件上的另一个 Consumer（本页不展开 flush） |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `TOOL_TIMEOUT` | 字符串 `'TOOL_TIMEOUT'`。`deadline(..., TOOL_TIMEOUT)` 与 `timeoutOf(signal, TOOL_TIMEOUT)` 用同一码；替换 result 的 `error.info` 是 `{ name: 'ToolTimeoutError', code: TOOL_TIMEOUT }`。 [E: packages/guard/timeout-policy/src/index.ts:25] [E: packages/guard/timeout-policy/src/index.ts:46] |
| `timeoutMs` | `ToolDefinition` 可选字段。省略 = 无预算。**不是**模型参数。 [E: packages/core/tools/src/index.ts:255] |
| `toolTimeoutResult` | `content[0].text` = ``Error: tool call timed out after ${timeoutMs}ms``，`isError: true`。 [E: packages/guard/timeout-policy/src/index.ts:42] [E: packages/guard/timeout-policy/src/index.ts:45] |
| `ToolDispatchExecution.signal` | around-dispatch 视图里 **可写** 的那一根；wrapper 只能换 signal，不能换 `name` / `callId` / `arguments`。 [E: packages/core/tools/src/index.ts:391] [E: packages/core/tools/src/index.ts:393] |
| `Deadline` | `dsh-timeout`：`signal` + `[Symbol.dispose]`（`using` 退出时清 timer）。`timeoutMs <= 0` 是该库的「不武装」哨兵；注册表根本不让 `<= 0` 进定义。 [E: packages/util/timeout/src/index.ts:96] [E: packages/core/tools/src/index.ts:1048] |
| `TimeoutReason` | abort reason：`code` + `timeoutMs`。`timeoutOf(x, code)` 只在 `reason instanceof TimeoutReason` 且 `code` 吻合时返回它。 [E: packages/util/timeout/src/index.ts:184] [E: packages/util/timeout/src/index.ts:189] |

本插件没有 `Config`、没有 `z.object`，`dsh-base` 行也没有 `config:` 子键。[I]

## 控制流

1. **host 面插入 Consumer，不是第二份注册表。** `dsh-base` 的根 `insert` 写 `id: timeout-policy` / `name: '@deepseek-ai/dsh-tool-call-timeout-policy'`，无 `config`。 [E: packages/bundle/base/cordis.patch.yml:343] [E: packages/bundle/base/cordis.patch.yml:344] manifest 依赖同名包。 [E: packages/bundle/base/package.json:93] Loader 先满足 `inject = ['tools']`，再跑 `apply`。 [E: packages/guard/timeout-policy/src/index.ts:31] `apply` 只 `ctx.on('tools/execute', …)`，不 `super` / 不 `provide`。 [E: packages/guard/timeout-policy/src/index.ts:56]

2. **`dsh-web-app` 不 disable；preset 不重挂；无 isolate。** web overlay 会把部分 host 行标 `disabled: true`，例如 `id: compaction-basic`。 [E: packages/bundle/web-app/cordis.patch.yml:358] [E: packages/bundle/web-app/cordis.patch.yml:359] 同一份 `cordis.patch.yml` **没有** `id: timeout-policy` 行，因此不会关掉 base 挂上的 Consumer。[I] `dsh-headless` 与四个 shipped preset（`minimal` / `standard` / `code` / `cordis`）的 yml 同样没有 `timeout-policy` 行——既不 remount 也不 disable。[I] 本插件不 publish 服务，`leakedServices` 不会因为它而要求 `isolate`。默认 `dsh web` 仍走 host 上这一条 listener。

3. **注册表把 around-dispatch 收成 waterfall，叶子是 `dispatchToolBody`。** `dispatchScheduledExecution` 调用 `ctx.waterfall(carrier, 'tools/execute', mutableExec, () => this.dispatchToolBody(mutableExec))`。 [E: packages/core/tools/src/index.ts:1573] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1575] Cordis `Events.waterfall` 把最后一个参数 pop 成 innermost `next`；listener 每次调用传入的 `next()` 才 `cbs.shift()`，否则内建 body **不跑**。 [E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:242] 本插件有预算时走 `await next()`，没有否决通道。 [E: packages/guard/timeout-policy/src/index.ts:68]

4. **读可见定义上的 `timeoutMs`，不是读模型 arguments。** listener 第一句是 `ctx.tools.get(exec.name, exec.agent)?.timeoutMs`。 [E: packages/guard/timeout-policy/src/index.ts:57] `get` 按 agent scope 取可见赢家；没有 agent 则看 global 层。 [E: packages/core/tools/src/index.ts:1204] [E: packages/core/tools/src/index.ts:1205] `timeoutMs === undefined`（未声明、或该名对这个 agent 不可见）则 `return next()`，**不碰** `exec.signal`。 [E: packages/guard/timeout-policy/src/index.ts:59] 测试：无预算工具在 body 里看到的 signal 就是调用方传入的那根。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:57]

5. **有预算：武装 `deadline`，把派生 signal 暂时写进 `exec`。** `using d = deadline(exec.signal, timeoutMs, TOOL_TIMEOUT)` 把调用方 cancel 与本 timer fuse；`AbortSignal.any` 只保留**先** abort 的一方的 reason。 [E: packages/guard/timeout-policy/src/index.ts:61] [E: packages/util/timeout/src/index.ts:110] 然后 `upstream = exec.signal`、`exec.signal = d.signal`。 [E: packages/guard/timeout-policy/src/index.ts:65] [E: packages/guard/timeout-policy/src/index.ts:66] 测试：有预算的 body 在 dispatch 期间看到的 **不是** 调用方原 signal。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:80]

6. **`await next()`，不丢弃工具 promise。** timer 响了只是 abort `d.signal`；wrapper 仍等到下游（其它 `tools/execute` listener + `dispatchToolBody` + `ToolDefinition.execute`）settle。`using` 在 listener 返回时 `dispose` 清 timer。合作式工具必须自己看 signal；忽略 signal 的 body 会让这一层一直挂起，没有 hard-kill。

7. **registry 会把 caller signal fuse 回 wrapper 替换。** `dispatchToolBody` 取 `wrapperSignal = exec.signal`，再 `fuseToolSignals(state.callerSignal, wrapperSignal)`。 [E: packages/core/tools/src/index.ts:1536] [E: packages/core/tools/src/index.ts:1537] 两根不是同一对象时新建 controller，先到的那根把 `source.reason` 交给 `controller.abort`。 [E: packages/core/tools/src/index.ts:1901] [E: packages/core/tools/src/index.ts:1902] 因此本插件换 signal **摘不掉** 调用方取消。body 跑完后 registry 把 `exec.signal` 写回 `wrapperSignal`（此时仍是 `d.signal`），再把控制权交回 wrapper。

8. **只有 `timeoutOf(d.signal, TOOL_TIMEOUT)` 有值才替换。** 下游返回后：`timeoutOf` 要求 `reason instanceof TimeoutReason` 且 `reason.code === 'TOOL_TIMEOUT'`；外层其它 wrapper 先响的 deadline 在这里是 `undefined`，当普通 upstream cancel。 [E: packages/guard/timeout-policy/src/index.ts:73] [E: packages/util/timeout/src/index.ts:188] [E: packages/util/timeout/src/index.ts:189] 自己的 timer 赢了就 `return toolTimeoutResult(timeoutMs)`，下游自己的 abort / `WEB_ABORTED` / 成功文本全部丢掉。 [E: packages/guard/timeout-policy/src/index.ts:74] 测试钉死文案与 `error.info`。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:108] [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:124] 调用方先 abort：保留 registry 的 `TOOL_ABORTED`（`AbortError` / `tool call aborted`），**不**写成 `TOOL_TIMEOUT`。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:152] [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:154] 本 timer 先响、调用方后 abort：仍是 `TOOL_TIMEOUT`。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:186] 预算内快速返回则原样留下工具自己的 result。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:65]

9. **`finally` 恢复 upstream，post-execute 看不见 timeout signal。** 无论替换还是原样返回，`exec.signal = upstream` 都在 listener 把值交出去之前跑完。 [E: packages/guard/timeout-policy/src/index.ts:78] 测试：`tools/post-execute` 读到的 `exec.signal` 就是调用方那根。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:93] `next()` 若抛错，本插件没有 `catch`，不会改写成 `TOOL_TIMEOUT`；`finally` 仍恢复 signal。

10. **`timeoutMs` 从不进模型 schema。** `schemaOf` 只解构 `name` / `description` / `parameters`，返回对象也只有这三项。 [E: packages/core/tools/src/index.ts:1257] [E: packages/core/tools/src/index.ts:1263] [E: packages/core/tools/src/index.ts:1264] [E: packages/core/tools/src/index.ts:1265] `schemas()` / Code Mode SDK 投影都走这条白名单。测试：注册 `timeoutMs: 5_000` 之后 `'timeoutMs' in schema` 为 false。 [E: packages/core/tools/tests/tools.spec.ts:83] 模型不能把预算当参数传来；改预算只能改工具定义或换定义。

11. **正有限校验在注册表 / `defineTool`，不在本插件。** `register` 拒绝非有限或 `<= 0` 的 `timeoutMs`。 [E: packages/core/tools/src/index.ts:1047] [E: packages/core/tools/src/index.ts:1048] [E: packages/core/tools/src/index.ts:1049] `defineTool` 同样在入口丢掉 0 / 负数 / `Infinity`。 [E: packages/core/tools/src/schema.ts:563] 本插件假定读到的预算已经合法，直接交给 `deadline`。

12. **本插件不看 `exec.parent`。** 对比：checkpoint 在 `exec.agent === undefined || exec.parent !== undefined` 时直接 `next()`，嵌套 Code Mode 子调用不二次 flush。 [E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:71] timeout-policy 对每次 `tools/execute` 都按该次可见定义的 `timeoutMs` 独立武装。子调用有自己的预算就有自己的 `TOOL_TIMEOUT`；没有预算就原样 `next()`。

13. **fiber dispose 卸掉 listener（HMR）。** 测试：挂上插件后有预算工具看到派生 signal；`fiber.dispose()` 后再 execute，看到的又是调用方原 signal。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:213] [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:216] Loader `unwrapExports` 钉死无 default export、`name === 'timeout-policy'`、`inject === ['tools']`。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:226] [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:227]

## 设计动机

超时是 **host 面政策**，不是模型可填的字段。把预算留在 `ToolDefinition.timeoutMs`、用 `schemaOf` 滤掉，模型才不能靠「把 timeout 调大」绕过合作式上限；下一轮历史里出现的是结构化 `TOOL_TIMEOUT` 文案，replay / 其它 Consumer 可以按 `error.info.code` 分流。

wrapper 只通知、不 hard-kill：`deadline` 的 signal 只 abort，工具自己停。`await next()` 等到静默，避免「timer 响了就丢掉 in-flight promise」造成的双重副作用。`timeoutOf(..., TOOL_TIMEOUT)` 按 code 收窄，是为了让另一层 `tools/execute` 的 timer 先响时走普通 cancel，而不是被误标成本插件超时。

政策挂在 host 的 `ctx.tools` 事件上，是因为注册表是进程单例：每个 session / preset 的 `register` 都写进同一份 `ctx.tools`。把 timeout-policy 搬进 preset isolate 既无服务可隔离，也会让不同会话丢掉统一的 around-dispatch。所以 `dsh-web-app` 拆走的是 per-session 的 tool 行和 compaction 后端，而不是这一条 Consumer。

## Gotcha

- 工具忽略 `exec.signal`：本层会一直 `await next()`，不会在 timer 响起时强行返回。测试里的 fixture 都是 abort 后才 settle。
- 外层 / 别人的 deadline 先响：`timeoutOf(d.signal, TOOL_TIMEOUT)` 为 `undefined`，下游 result 原样上传，**不会**贴上 `ToolTimeoutError`。 [E: packages/guard/timeout-policy/src/index.ts:73]
- 调用方 cancel 赢：结果是 registry 的 `TOOL_ABORTED`，不是 `TOOL_TIMEOUT`。 [E: packages/guard/timeout-policy/tests/timeout-policy.spec.ts:154]
- `tools/post-execute` 看到的 `exec.signal` 已被恢复；不要在 post-execute 里用 `timeoutOf(exec.signal, TOOL_TIMEOUT)` 判断「刚才是不是超时」——应看 result 的 `error.info.code`。 [E: packages/guard/timeout-policy/src/index.ts:78]
- `timeoutMs: 0` 不能当「关闭超时」的哨兵：`register` / `defineTool` 直接抛。 [E: packages/core/tools/tests/tools.spec.ts:1972] [E: packages/core/tools/tests/tools.spec.ts:1973]
- 本插件**没有** `parent` 豁免。嵌套 `run_code` SDK 子调用若声明了 `timeoutMs`，一样走 `TOOL_TIMEOUT`。
- shipped 组合里不能靠 preset 关掉它：四个 `agent.cordis.yml` 都没有这一行，web overlay 也不 disable。[I]
- 不要把本包写成 `ctx.timeout` 或空 Definition 行。服务键是 `ctx.tools`；本包只是它的 Consumer。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| 工具超时 | `@deepseek-ai/dsh-tools` 的 `ToolDefinition.timeoutMs` + `Events['tools/execute']`（`ctx.tools`）。没有 `ctx.timeout`，也没有单独的空 Definition 插件行。 | 各工具包在 `defineTool` / `register` 时声明正有限 `timeoutMs`。`dsh-base` 只插入本 Consumer 行。 | 本插件 `inject = ['tools']`，`apply` 挂 `tools/execute`：换 `exec.signal`，按 `timeoutOf(..., TOOL_TIMEOUT)` 替换 result。leaf 是 `dispatchToolBody` → `ToolDefinition.execute`。 |
| 组合面 | host 行 `id: timeout-policy` / `name: '@deepseek-ai/dsh-tool-call-timeout-policy'`（`packages/bundle/base/cordis.patch.yml`） | **host**：`dsh-base` 始终挂。`dsh-web-app` **不** `disabled`。 | **preset 不重挂**，也无 `isolate` 组。`minimal` / `standard` / `code` / `cordis` 都吃 host 这一条。 |
| 相邻 around-dispatch | 同一 `tools/execute` waterfall | `dsh-session-checkpoint-policy`（顶层 `flush`；`parent` 则跳过） | 两边都必须 `next()`，否则 body 不跑。本插件不负责耐久。 |

## Sources

- packages/guard/timeout-policy/src/index.ts
- packages/guard/timeout-policy/src/invariant.ts
- packages/guard/timeout-policy/tests/timeout-policy.spec.ts
- packages/guard/timeout-policy/package.json
- packages/util/timeout/src/index.ts
- packages/util/timeout/tests/timeout.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/tests/tools.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/session/session-checkpoint-policy/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md) — 从 `assistant/message` 的 tool-call 到 `tool/result`；timeout 落在 `tools/execute` 这一层。
- [`subsys.core.tools`](../core/tools.md) — `ctx.tools` 注册表、`schemaOf` 白名单、`tools/pre-execute` → `execute` → `post-execute`。
- [`spine.overview`](../../spine/overview.md) — `profile → bundle → agent preset`；host 面 vs agent-preset 面。
- [`subsys.persistence.checkpoint`](../persistence/checkpoint.md) — 同事件上的 top-level `sessions.flush`；认 `parent`，本插件不认。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — host insert 含 `id: timeout-policy`；web overlay / preset 不搬这条。
