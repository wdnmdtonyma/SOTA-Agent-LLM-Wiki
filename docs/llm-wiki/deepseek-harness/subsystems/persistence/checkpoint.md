---
id: subsys.persistence.checkpoint
title: checkpoint 策略
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-checkpoint-policy/package.json
  - packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts
  - packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts
  - packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/repair.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/session/session-persistence-jsonl/src/storage.ts
  - packages/session/session-persistence/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/llm/llm/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - vendor/cordis/src/events.ts
symbols:
  - session-checkpoint-policy
  - afterCheckpoint
  - TOOL_ABORTED_BEFORE_DISPATCH
related:
  - spine.session-log
  - spine.tool-call-anatomy
  - subsys.core.session
  - subsys.persistence.session-persistence
  - subsys.core.tools
  - spine.overview
  - spine.turn-and-step
  - subsys.persistence.jsonl
  - subsys.core.agent-loop
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: d347e70390
---

> `session-checkpoint-policy` 是 **host 面 glue**：自己不 `provide` 任何 `ctx` 键，只 `inject` `llm` / `sessionPersistence` / `sessions` / `tools`，在三条 waterfall 上先 `await ctx.sessions.flush(...)` 再决定要不要 `next()`。它卡的是「adapter 即将花 token」和「top-level tool body 即将对外产生副作用」，不是「每个 `append` 都刷盘」。JSONL 侧的 listener 把这次 flush 变成 write handle 的 `drainLive` + `flush`。这是 Cordis 组合运行时的耐久屏障，用来兑现 **model-visible ⟺ logged**。

## 能回答的问题

- 三个 flush 落点分别挂在哪条 waterfall？`session/flush` 是 emit、parallel 还是 waterfall？谁必须调用传入的 `next()`？
- 无 `sessionId`、id 已脱离 store、没有 `exec.agent`、或 `exec.parent !== undefined` 时为什么 0 次额外 flush？
- flush 被拒、或 flush 期间 `signal.aborted`，还会不会构造 adapter / 跑 tool body？错误码是抛错还是 `TOOL_ABORTED_BEFORE_DISPATCH`？
- `append` 热路径碰不碰盘？handle 上 200ms live 合批和 `SessionStore.flush` 差在哪一层？
- SIGKILL 落在 adapter 刚 dispatch、或 tool 副作用点时，reload 盘上已有什么、谁补 `interruptedTurnClosers`？
- 这条 glue 在 `dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-minimal` 各挂几次？

## 职责边界

本包拥有：三条 waterfall 拦截（`llm/stream` / `tools/execute` / `agent/pre-step`）、`afterCheckpoint` 把 flush 放进 adapter 流构造之前、flush 期间 abort 时返回的 `TOOL_ABORTED_BEFORE_DISPATCH` 结果、以及「嵌套 `exec.parent` 不再刷一次」的门。插件导出 `name = 'session-checkpoint-policy'`、`inject`、`apply`；`package.json` 名是 `@deepseek-ai/dsh-session-checkpoint-policy`。 [E: packages/session/session-checkpoint-policy/src/index.ts:15] [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/package.json:2]

本包**不**拥有：`Session.append` / `deriveMessages` / `SESSION_FORMAT_VERSION`（[subsys.core.session](../core/session.md)）；`session/flush` 的 parallel 派发（同页 `SessionStore.flush`）；JSONL handle 的 200ms 合批、lease、torn truncate（[subsys.persistence.jsonl](jsonl.md)）；`SessionHandle` 合同（[subsys.persistence.session-persistence](session-persistence.md)）；`tools/pre-execute → execute → post-execute` 管线本身（[subsys.core.tools](../core/tools.md)）；turn / step 何时 `append`（[spine.turn-and-step](../../spine/turn-and-step.md)、[subsys.core.agent-loop](../core/agent-loop.md)）；resume 时合成 closer（`AgentLoop.resumeWith`）。compaction 只追加 `surfaceOp: { op: 'replace', start, end }`，本页不得把 log 写成可删 chat 数组。

这是 **host 面** 行。agent-preset 面不 remount checkpoint。叠 `dsh-base` 的 shipped profile 是 `web` / `headless` / `sdk` / `acp`；`sdk-minimal` 的 insert 是完整树、不含本行。本包 **没有** `src/invariant.ts`：顺序由被拦截的 waterfall 自己 fail-closed。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-checkpoint-policy/src/index.ts` | `apply`：三条 `ctx.on`；`afterCheckpoint`；`abortedBeforeDispatchResult` |
| `packages/session/session-checkpoint-policy/package.json` | 包名 |
| `packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts` | flush 先于 adapter / tool；拒盘不 `next()`；嵌套 0 flush；fiber dispose |
| `packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts` | 非 win32：SIGKILL 后 handle.read + `interruptedTurnClosers` |
| `packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts` | 子进程：adapter 写 `request-dispatched` / tool 写 `tool-side-effect` 后挂起 |
| `packages/core/session/src/index.ts` | `session/event` emit；`session/flush` **parallel**；`SessionStore.flush` |
| `packages/core/session/src/repair.ts` | `interruptedTurnClosers` |
| `packages/session/session-persistence-jsonl/src/storage.ts` | `session/flush` → `drainLive` + `handle.flush` |
| `packages/core/agent-loop/src/index.ts` | resume：`open('write')` 后 append closer |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: session-checkpoint-policy` |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 不叠 base；insert 无 checkpoint |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | Loader 名 `session-checkpoint-policy`。`inject = ['llm', 'sessionPersistence', 'sessions', 'tools']`。四者齐了才 `apply`；`apply` 只 `ctx.on`，不 `provide`。`sessionPersistence` 是装载顺序门，本包不读 `ctx.sessionPersistence`。 [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:257] |
| `afterCheckpoint` | 内部 async generator：`await ctx.sessions.flush(session)` **再** `yield* next()`。flush 抛错则 generator 在第一轮 `next()` 之前失败，innermost `adapterStream` 根本不跑。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] |
| `TOOL_ABORTED_BEFORE_DISPATCH` | 从 `@deepseek-ai/dsh-tools` 导入，**wire 值**是 `'ABORTED_BEFORE_DISPATCH'`。flush 完成后若 `exec.signal.aborted`，policy 返回 `isError` 结果且 **不** `next()`。 [E: packages/core/tools/src/index.ts:465] [E: packages/session/session-checkpoint-policy/src/index.ts:73] |
| `session/flush` | 事件签名只有 `(session)`，没有 `next`。`SessionStore.flush` 对全部 listener `Promise.allSettled`，再抛第一个 rejection；返回值是「是否至少有一个 listener」。这是 **parallel**，不是 waterfall。 [E: packages/core/session/src/index.ts:82] [E: packages/core/session/src/index.ts:1121] |
| live 合批 | JSONL handle `LIVE_WRITE_BATCH_MAX_DELAY_MS = 200`。`session/event` 只 `enqueueLive`（`structuredClone`）。`session/flush` listener 先 `drainLive` 再 `handle.flush`。 [E: packages/session/session-persistence-jsonl/src/storage.ts:35] [E: packages/session/session-persistence-jsonl/src/storage.ts:241] [E: packages/session/session-persistence-jsonl/src/storage.ts:506] |
| `SESSION_FORMAT_VERSION` | header `version` 现为 **2**。JSONL load 时 catalog 走 v0→v1→v2；比 2 新的盘仍拒。本页不 bump 这个数。 [E: packages/core/session/src/types.ts:86] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。`isReplaceOp` 要求恰好 3 个键。**没有 delete。** [E: packages/core/session/src/types.ts:416] [E: packages/core/session/src/types.ts:418] [E: packages/core/session/src/surface.ts:183] |
| `interruptedTurnClosers` | 对已提交前缀补尾巴：有 `tool/call` seq → `TOOL_OUTCOME_UNKNOWN`；仅有 assistant tool-call 块 → `TOOL_NOT_STARTED`；再补开着的 `step/end` 与 `turn/end { kind: 'interrupted' }`。平衡 log 返回 `[]`。 [E: packages/core/session/src/repair.ts:29] [E: packages/core/session/src/repair.ts:119] [E: packages/core/session/src/repair.ts:133] |

## 控制流

1. **host 组合挂 glue；叠 base 的 profile 继承，`sdk-minimal` 没有。** `dsh-base` 插入 `id: session-checkpoint-policy` / `name: '@deepseek-ai/dsh-session-checkpoint-policy'`，与 `id: session`、`id: session-persistence-jsonl` 同层。 [E: packages/bundle/base/cordis.patch.yml:395] [E: packages/bundle/base/cordis.patch.yml:396] [E: packages/bundle/base/package.json:71] `dsh-web-app` **没有** checkpoint 的 `id:` / `disabled:`；它另写 `session-query-sqlite`（仍 `openAt: never`）并 insert `workspace`。 [E: packages/bundle/web-app/cordis.patch.yml:26] [E: packages/bundle/web-app/cordis.patch.yml:61] `dsh-headless` insert 是 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26] `dsh-sdk-minimal` 不叠 `dsh-base`，insert 含 JSONL sessions，**没有** `session-checkpoint-policy` 行。

2. **`append` 只提交内存。** `Session.append` 钉 `seq = this.log.length`，`validateNext` 通过后 `log.push`，再 fire-and-forget `session/event`。 [E: packages/core/session/src/index.ts:737] 热路径不 `fsync`。JSONL write handle 把事件推进 200ms 窗。要把缓冲写成盘，调用方走 `SessionStore.flush`。 [E: packages/core/session/src/index.ts:1117]

3. **`session/flush` 是 parallel，不是 waterfall。** `SessionStore.flush` 取 `enter` 时钉下的 carrier，`Promise.allSettled` 全部跑完，再抛第一个 rejection。JSONL tracker 的 listener 是 `drainLive` + `handle.flush`。本页 policy **不是** `session/flush` 的 listener，它是 **调用方**。 [E: packages/core/session/src/index.ts:1121] [E: packages/session/session-persistence-jsonl/src/storage.ts:506] 已物化会话上 `handle.flush` 直接 return（drain 里的 `persistBatch` 已经 fsync）。 [E: packages/session/session-persistence-jsonl/src/storage.ts:173]

4. **相关 waterfall 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：不调用就不会 `cbs.shift()`。`llm/stream` 的 innermost 是 `LlmRuntime.adapterStream`；`tools/execute` 的 innermost 是 `dispatchToolBody`。省略 `next()` = adapter / tool body / 本步决策都不跑。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: packages/llm/llm/src/index.ts:1101] [E: packages/llm/llm/src/index.ts:1105] [E: packages/core/tools/src/index.ts:1565] [E: packages/core/tools/src/index.ts:1566]

5. **落点 1 · `llm/stream`（adapter 之前，副作用门）。** `options.sessionId === undefined` → 直接 `return next()`；`ctx.sessions.get(id)` 已是 `undefined` → 直接 `next()`；否则返回 `afterCheckpoint(ctx, session, next)`。测试钉死顺序 `flush:start → flush:end → adapter`；无 live session 时 order 只有 `adapter`；`session/flush` reject `'disk unavailable'` 时 drain 抛错且 adapter 数组为空。 [E: packages/session/session-checkpoint-policy/src/index.ts:64] [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:73] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:82] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:104]

6. **`dsh-agent-loop` invariant 在更外层。** companion 挂同一条 `llm/stream`，`{ global: true, prepend: true }`：loop 请求必须 frozen、带 live `sessionId`、log 里已有 `step/start` 与 `request/header`，且 `JSON.stringify(options.messages) === JSON.stringify(session.deriveMessages())`。检查通过后 **必须** `return next()`，才会轮到本页 flush。 [E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:40] [E: packages/core/agent-loop/src/invariant.ts:53]

7. **一次 step 里，落点 1 刷的是「当前请求前缀」。** `ReactLoopAgent.turn` 先 `append('turn/start')`。`agent/pre-step` 那次 flush 发生在 `preStep` 里，早于本步 `append('step/start')` 和带 `surfaceOp: 'append'` 的 `user/message`。 [E: packages/core/agent-loop/src/agent.ts:267] [E: packages/core/agent-loop/src/agent.ts:291] [E: packages/core/agent-loop/src/agent.ts:295] `buildRequest` 再按需 `append('request/header')`（`reason` 为 `initial` / `resume` / `change` / `series`，log-only）。 [E: packages/core/agent-loop/src/agent.ts:552] 然后 `preparedCall?.stream(request) ?? llm.stream(request)` 进入落点 1。adapter 被构造时，盘上已经有本步的 `user/message` + `request/header`。v2 不再把每个 `assistant/chunk` 写成独立 session 事件；流嵌在 `assistant/message` / `assistant/attempt` 的 `stream` 里。 [E: packages/core/agent-loop/src/agent.ts:358] [E: packages/core/agent-loop/src/agent.ts:389]

8. **落点 2 · `tools/execute`（top-level tool body 之前，副作用门）。** dispatch 前先 `append('tool/call')`（`arguments` 是模型原文 JSON 字符串）。 [E: packages/core/agent-loop/src/tool-calls.ts:264] policy：`exec.agent === undefined || exec.parent !== undefined` → `return next()`（0 次本层 flush）；否则 `await ctx.sessions.flush(exec.agent.session)`，再看 `exec.signal.aborted`，最后 `return next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:74] PTC `run_code` 子调用带着 `parent` token 重入同一 registry。测试：带 `parent: Symbol('outer')` 时 `flushes === 0`。 [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:212]

9. **落点 2 的两种 fail-closed。** flush 期间 abort：`await flush` **仍跑完**（盘上已有 `tool/call`），然后 `return abortedBeforeDispatchResult()`，**不** `next()`。测试 order 停在 `flush:start, flush:end`。 [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:73] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:173] flush **抛错**：waterfall 整段 reject，同样不进 body；测试 `ran === false`、content 为 `Error: disk unavailable`。 [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:192] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:193]

10. **落点 3 · `agent/pre-step`（耐久刷盘，不是副作用门）。** 每步决策前 `await ctx.sessions.flush(agent.session)` 再 `return next()`。它把**上一 step 已提交**的 assistant / tool/result，以及刚写下的 `turn/start`，送到 persistence。它**不**阻止即将发生的 tool body。 [E: packages/session/session-checkpoint-policy/src/index.ts:79] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:226] 事件声明在 `dsh-agent` 的 `Events['agent/pre-step']`。 [E: packages/core/agent/src/runtime-types.ts:276]

11. **hard-crash e2e（非 win32）。** 子进程挂 JSONL（`compression: 'none'`）+ 本页 policy + `AgentLoop`。`request` 模式：adapter `stream` 一进就写 marker `request-dispatched` 再挂起；父进程 SIGKILL。reload `open('read')` + 内存 `interruptedTurnClosers` 后 type 序列含完整请求前缀并以 `turn/end { kind: 'interrupted' }` 收尾。 [E: packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts:25] [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:75] [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:96] `tool` 模式：body 写 `tool-side-effect` 再挂起；reload 看得到 `assistant/message` 与 `tool/call`，补上的 `tool/result` 带 `code: TOOL_OUTCOME_UNKNOWN`。 [E: packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts:52] [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:113] 产品 resume 路径是 `AgentLoop.resumeWith`：`open('write')` 后把 closer **append 回盘**。 [E: packages/core/agent-loop/src/index.ts:867] [E: packages/core/agent-loop/src/index.ts:878] e2e 的 `load` helper 只在内存拼接 closer，用于断言语义，不等于 persistence 自动 `commitRepair`（那个 API 已随 coordinator 删除）。

12. **fiber 卸掉 = 三扇门卸掉。** `ctx.on` 登记在 owning fiber 上。测试：`plugin(checkpointPolicy)` 后一次 `llm.stream` 触发 1 次 flush；`fiber.dispose()` 后再 stream，flush 计数仍是 1。 [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:245] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:246]

## 设计动机

Peer harness 常见「内存 `messages` + 事后再写盘」。DSH 把 append-only `SessionEvent` 日志当成唯一真相：模型下一轮看见的只能是 `deriveMessages()` 对 `surface.nodes` 的投影。要把这条合同熬过 SIGKILL，必须在**不可逆副作用之前**设耐久屏障——adapter 一 dispatch 就开始花 token；top-level tool body 一开始就可能改用户磁盘 / 网络。嵌套 `parent` 不再刷，是因为外层 `run_code`（PTC 传输，[subsys.core.code-mode](../core/code-mode.md)）那一次 `tool/call` 已经在落点 2 刷过。

`agent/pre-step` 是第三条刷盘，动机不同：下一步 `buildRequest` 之前，把上一 step 的 response / result 从 200ms live 窗里赶出去。它不是副作用门。

policy 做成独立 glue、而不是写进 `ReactLoopAgent`，是因为 DSH 是组合运行时：换 loop、换 adapter、换 `SessionPersistence` Provider，这三扇门仍然卡在同一组 waterfall 名上。`inject` 带上 `sessionPersistence`，是为了保证 JSONL tracker 的 `session/flush` listener 先于本页 `apply` 挂上；没有 backend 时 `SessionStore.flush` 仍 resolve（listener 数为 0 则返回 `false`），屏障就变成空转。

## Gotcha

- **不是每个 `append` 都刷盘。** `turn/start`、`assistant/attempt`、中间的 `session/event` 都只进 200ms 窗。漏写本页三扇门，等于接受最多约 200ms 加一次后台写的丢失窗。
- **`session/flush` 没有 `next()`。** 把它当成 waterfall、指望「不调用 next 就挡住别人」是错的。
- **waterfall 漏 `next()` 等于停整条链。** checkpoint 或 loop invariant 检查完若不 `return next()` / `yield* next()`，adapter 不会被调用。 [E: vendor/cordis/src/events.ts:238]
- **无 live session 的 `llm.stream` 不刷。** 缺 `sessionId`、或 id 已不在 `ctx.sessions`，policy 直接 `next()`。
- **没有 `exec.agent` 的 `tools.execute` 不刷。** 裸 `ctx.tools.execute({ … })` 走 `next()`。
- **嵌套 `parent` 的 0 flush 是功能，不是漏网。** 子调用的副作用算在外层 `tool/call` 已经耐久的前提下。
- **flush 期间 abort ≠ crash。** abort 路径盘上已有 `tool/call`，loop 会再 `append` 一条 `tool/result`（`ABORTED_BEFORE_DISPATCH`）。crash 在 body 里 SIGKILL，盘上只有 `tool/call`，resume 才补 `TOOL_OUTCOME_UNKNOWN`。
- **wire code 不是 TypeScript 名。** `TOOL_ABORTED_BEFORE_DISPATCH === 'ABORTED_BEFORE_DISPATCH'`。
- **e2e 跳过 win32。** `describe.skipIf(process.platform === 'win32')`。 [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:91]
- **closer 由 agent-loop resume 写回盘，不是 persistence `commitRepair`。** e2e helper 只在内存拼接；产品路径 `handle.append(closers)`。 [E: packages/core/agent-loop/src/index.ts:878]
- **`sdk-minimal` 没有本页 glue。** 叠 `dsh-base` 的 `web` / `headless` / `sdk` / `acp` 才继承 `session-checkpoint-policy`。
- **header `version` 是 2。** 崩过的盘仍要能被 catalog 迁到 2，或本来就是 v2，才能打开。本页不负责迁盘。

## Seam 三角

| 角色 | 包 / 合同 | ctx 键 | `dsh-base` | `dsh-web-app` | `dsh-headless` | `dsh-sdk-minimal` |
|---|---|---|---|---|---|---|
| Definition | `dsh-llm` 的 `llm/stream`；`dsh-tools` 的 `tools/execute`；`dsh-agent` 的 `agent/pre-step`；`dsh-session` 的 `session/flush`（parallel，无 `next`） | 无 `ctx.checkpoint`。policy 不占键 | 四条声明随 `llm` / `tools` / `agent` / `session` 行进入叠 base 的 profile | 不改这四条事件合同 | 继承 base | 自己 insert 会话/工具栈；**无** checkpoint 行 |
| Provider | shipped 落盘：`dsh-session-persistence-jsonl` → tracker 听 `session/flush`。`SessionStore`（`ctx.sessions`）是 flush **入口** | `ctx.sessionPersistence`、`ctx.sessions` | `id: session-persistence-jsonl` + `id: session` | **继承** jsonl / checkpoint | **继承** | 完整 insert：含 JSONL sessions，**不含** `session-checkpoint-policy` |
| Consumer / glue | `@deepseek-ai/dsh-session-checkpoint-policy`：`inject` 四键，三条 waterfall 里 `flush` 后再 `next()` | 无。读 `ctx.sessions.flush` / `get` | `id: session-checkpoint-policy` | **继承**，无 disable | **继承** | **未挂** |

换 JSONL 为第三方 `SessionPersistence` backend，只换 `session/flush` 的落盘实现；三扇门的名字与 fail-closed 语义不变。卸掉本页行，JSONL live 窗仍会在约 200ms 后写盘，但 adapter / top-level tool 不再等那次写完。preset 不得再 publish 一份 `sessions`，因此也不能在 isolate 里「另挂一套 checkpoint」。

## Sources

- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-checkpoint-policy/package.json
- packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts
- packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts
- packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts
- packages/core/session/src/index.ts
- packages/core/session/src/repair.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/session/session-persistence-jsonl/src/storage.ts
- packages/session/session-persistence/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent-loop/src/invariant.ts
- packages/llm/llm/src/index.ts
- packages/core/agent/src/runtime-types.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages`、本页两个副作用落点在整条 turn 里的位置。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：`tool/call` 之后的 `pre-execute → execute → post-execute`；PTC `parent` 为何跳过顶层 checkpoint。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/flush` parallel、`interruptedTurnClosers` 合同。
- [subsys.persistence.session-persistence](session-persistence.md)：`SessionHandle`；resume 时 closer 经 handle `append`。
- [subsys.core.tools](../core/tools.md)：`tools/execute` waterfall、`TOOL_ABORTED_BEFORE_DISPATCH` 的 registry 侧铸造。
- [subsys.core.code-mode](../core/code-mode.md)：PTC `run_code` 子调用带 `parent`，复用外层 checkpoint。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.turn-and-step](../../spine/turn-and-step.md)：`turn/start` / `preStep` / `step/start` 与 inbox 何时变成 `user/message`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend，本页 `flush` 最终写到的盘。
- [subsys.core.agent-loop](../core/agent-loop.md)：`ReactLoopAgent` 何时 `llm.stream` / `executeToolCalls`；`llm/stream` 上的 reconstruction invariant。
