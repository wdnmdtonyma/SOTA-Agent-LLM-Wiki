---
id: subsys.persistence.checkpoint
title: checkpoint 策略
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-checkpoint-policy/package.json
  - packages/session/session-checkpoint-policy/src/invariant.ts
  - packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts
  - packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts
  - packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/repair.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/session/session-persistence/src/coordinator.ts
  - packages/session/session-persistence/src/write-behind.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/core/tools/src/index.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/llm/llm/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - vendor/cordis/src/events.ts
  - packages/settings/settings/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
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
evidence: explicit
status: verified
updated: 47f943859b
---

> `session-checkpoint-policy` 是 **host 面 glue**：自己不 `provide` 任何 `ctx` 键，只 `inject` `llm` / `sessionPersistence` / `sessions` / `tools`，在三条 waterfall 上先 `await ctx.sessions.flush(...)` 再决定要不要 `next()`。它卡的是「adapter 即将花 token」和「top-level tool body 即将对外产生副作用」，不是「每个 `append` 都刷盘」。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的耐久屏障，用来兑现 **model-visible ⟺ logged**，不是又一个 coding agent 的事后写盘。

## 能回答的问题

- 三个 flush 落点分别挂在哪条 waterfall？`session/flush` 是 emit、parallel 还是 waterfall？谁必须调用传入的 `next()`？
- 无 `sessionId`、id 已脱离 store、没有 `exec.agent`、或 `exec.parent !== undefined` 时为什么 0 次额外 flush？
- flush 被拒、或 flush 期间 `signal.aborted`，还会不会构造 adapter / 跑 tool body？错误码是抛错还是 `TOOL_ABORTED_BEFORE_DISPATCH`？
- `append` 热路径碰不碰盘？write-behind 默认 200ms 和 `SessionStore.flush` 差在哪一层？
- SIGKILL 落在 adapter 刚 dispatch、或 tool 副作用点时，reload 盘上已有什么、`interruptedTurnClosers` 补什么？
- 这条 glue 在 `dsh-base` / `dsh-web-app` / `dsh-headless` 各挂几次？shipped `session-query-sqlite` 的 `openAt` 是什么？`storage` / `workspace` / `session-projection-cache` 哪一层才有？

## 职责边界

本包拥有：三条 waterfall 拦截（`llm/stream` / `tools/execute` / `agent/pre-step`）、`afterCheckpoint` 把 flush 放进 adapter 流构造之前、flush 期间 abort 时返回的 `TOOL_ABORTED_BEFORE_DISPATCH` 结果、以及「嵌套 `exec.parent` 不再刷一次」的门。插件导出 `name = 'session-checkpoint-policy'`、`inject`、`apply`；`package.json` 名是 `@deepseek-ai/dsh-session-checkpoint-policy`。 [E: packages/session/session-checkpoint-policy/src/index.ts:15] [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/package.json:2]

本包**不**拥有：`Session.append` / `deriveMessages` / `SESSION_FORMAT_VERSION`（[subsys.core.session](../core/session.md)）；`session/flush` 的 parallel 派发与 live-entry 校验（同页 `SessionStore.flush`）；write-behind 合批、prepared cache、`commitRepair`（[subsys.persistence.session-persistence](session-persistence.md) 的 `PersistenceCoordinator`）；JSONL 盘布局（[subsys.persistence.jsonl](jsonl.md)）；`tools/pre-execute → execute → post-execute` 管线本身（[subsys.core.tools](../core/tools.md)）；turn / step 何时 `append`（[spine.turn-and-step](../../spine/turn-and-step.md)、[subsys.core.agent-loop](../core/agent-loop.md)）。compaction 只追加 `surfaceOp: { op: 'replace', start, end }`，本页不得把 log 写成可删 chat 数组。

这是 **host 面** 行。agent-preset 面贡献 tools / persona / isolate，不 remount checkpoint。默认安装路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。`./invariant` companion 的 `install` 是空函数：顺序由被拦截的 waterfall 自己 fail-closed，没有第二份可变关系可钉。 [E: packages/session/session-checkpoint-policy/src/invariant.ts:21]

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- settings 分层：schema defaults → composition `base` → 用户文档 section。`register` 当时就 `resolve(schema, options?.base, this.section(ns))`，实现是 `schema(mergeLayers(base, section))`。 [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/src/index.ts:705]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。secret 值在 `$DSH_HOME/.credentials.yaml`。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52]
- shipped `session-query-sqlite` 的 `openAt: never`（base 写出，web-app 再写一遍仍是 `never`）。 [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]
- `storage` / `workspace` / `session-projection-cache` **只 web-app**；headless `insert` 是 `code-runtime` / `headless-startup` / `headless-runner`，没有这三行。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-checkpoint-policy/src/index.ts` | `apply`：三条 `ctx.on`；`afterCheckpoint`；`abortedBeforeDispatchResult` |
| `packages/session/session-checkpoint-policy/package.json` | 包名；`exports` 含 `./invariant` |
| `packages/session/session-checkpoint-policy/src/invariant.ts` | `session-checkpoint-policy-invariant`：空 `install` |
| `packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts` | flush 先于 adapter / tool；拒盘不 `next()`；嵌套 0 flush；fiber dispose |
| `packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts` | 非 win32：SIGKILL 后 `load` 看到的事件与 repair |
| `packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts` | 子进程：adapter 写 `request-dispatched` / tool 写 `tool-side-effect` 后挂起 |
| `packages/core/session/src/index.ts` | `session/event` emit；`session/flush` **parallel**；`SessionStore.flush` |
| `packages/core/session/src/repair.ts` | `interruptedTurnClosers`；`TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED` |
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 0`；`SurfaceOp` 无 delete |
| `packages/session/session-persistence/src/coordinator.ts` | `session/event` enqueue；`session/flush` → `cancelAutomaticWait` + `writes.flush()` |
| `packages/session/session-persistence/src/write-behind.ts` | `enqueue` 做 `structuredClone`；`flush()` 取消 timer 并排空；`cancelAutomaticWait` |
| `packages/core/tools/src/index.ts` | `TOOL_ABORTED_BEFORE_DISPATCH = 'ABORTED_BEFORE_DISPATCH'`；`tools/execute` waterfall |
| `packages/core/agent-loop/src/tool-calls.ts` | `append('tool/call')` **之后**才 `dispatch`（才进本页门） |
| `packages/core/agent-loop/src/agent.ts` | `agent/pre-step` 在 `step/start` 之前；`preparedCall?.stream ?? llm.stream` 在 `request/header` 之后 |
| `packages/llm/llm/src/index.ts` | `llm/stream` waterfall 的 innermost 才是 `adapterStream` |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: session-checkpoint-policy`；`session-query-sqlite` `openAt: never` |
| `packages/bundle/web-app/cordis.patch.yml` | 不重挂 checkpoint；重写 system-prompt / hmr / tools / session-query；insert storage / workspace / projection-cache |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `packages/settings/settings/src/index.ts` | schema defaults → composition `base` → 用户文档 |
| `packages/credentials/credentials-local/src/index.ts` | `$DSH_HOME/.credentials.yaml` 存 secret 值 |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | Loader 名 `session-checkpoint-policy`。`inject = ['llm', 'sessionPersistence', 'sessions', 'tools']`。四者齐了才 `apply`；`apply` 只 `ctx.on`，不 `provide`。`sessionPersistence` 是装载顺序门，本包不读 `ctx.sessionPersistence`。 [E: packages/session/session-checkpoint-policy/src/index.ts:18] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:267] |
| `afterCheckpoint` | 内部 async generator：`await ctx.sessions.flush(session)` **再** `yield* next()`。flush 抛错则 generator 在第一轮 `next()` 之前失败，innermost `adapterStream` 根本不跑。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] |
| `TOOL_ABORTED_BEFORE_DISPATCH` | 从 `@deepseek-ai/dsh-tools` 导入，**wire 值**是 `'ABORTED_BEFORE_DISPATCH'`。flush 完成后若 `exec.signal.aborted`，policy 返回 `isError` 结果且 **不** `next()`。 [E: packages/core/tools/src/index.ts:472] [E: packages/session/session-checkpoint-policy/src/index.ts:73] |
| `session/flush` | 事件签名只有 `(session)`，没有 `next`。`SessionStore.flush` 对全部 listener `Promise.allSettled`，再抛第一个 rejection；返回值是「是否至少有一个 listener」。这是 **parallel**，不是 waterfall。 [E: packages/core/session/src/index.ts:85] [E: packages/core/session/src/index.ts:1026] [E: packages/core/session/src/index.ts:1037] |
| write-behind | coordinator 默认 `writeBatchMaxDelayMs = 200`。`session/event` 只 `enqueue`（`structuredClone`）。coordinator 显式 `flush` 先 `cancelAutomaticWait` 再 `writes.flush()`。`SessionWriteBehind.flush()` 自己 `cancelTimer` 并排空。 [E: packages/session/session-persistence/src/coordinator.ts:30] [E: packages/session/session-persistence/src/coordinator.ts:1125] [E: packages/session/session-persistence/src/write-behind.ts:47] [E: packages/session/session-persistence/src/coordinator.ts:1327] [E: packages/session/session-persistence/src/coordinator.ts:1336] [E: packages/session/session-persistence/src/write-behind.ts:63] [E: packages/session/session-persistence/src/write-behind.ts:75] |
| `SESSION_FORMAT_VERSION` | header `version` 现为 `0`。新 header 必须等于 0；别的 version **没有**跨 version migration：`version > SESSION_FORMAT_VERSION` 走 upgrade-harness 文案，更旧盘文案是「this build ships no upgrade path」。v0 内部仍有同版本事件形状迁移（`adoptStoredEvents` 调 `migrateLegacyTurnStartEvent` 等），那不是跨 version 承诺。本页不 bump 这个数。 [E: packages/core/session/src/types.ts:56] [E: packages/session/session-persistence/src/coordinator.ts:78] [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80] [E: packages/session/session-persistence/src/coordinator.ts:560] [E: packages/session/session-persistence/src/coordinator.ts:1047] |
| SQLite `SCHEMA_VERSION` | session 盘表布局为 **15**，`user_version` 非 0 且 ≠ 15 → 拒开、原地不迁。与 header `version`、本页 checkpoint、session-query schema 8、storage-sqlite schema 1 **正交**。该 backend **未** 进任何 shipped bundle。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] [E: packages/session/session-persistence-sqlite/src/schema.ts:109] |
| `SurfaceOp` | `'append'` 或 `{ op: 'replace', start, end }`。`isReplaceOp` 要求恰好 3 个键。**没有 delete。** compaction / prune 对 `surface.nodes` 做 `splice` 阴影；`Session.append` 只 `this.log.push`。 [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] [E: packages/core/session/src/surface.ts:175] [E: packages/core/session/src/surface.ts:369] [E: packages/core/session/src/index.ts:643] |
| `interruptedTurnClosers` | load / prepare 时对已提交前缀补尾巴：有 `tool/call` seq → `TOOL_OUTCOME_UNKNOWN`；仅有 assistant tool-call 块 → `TOOL_NOT_STARTED`；再补开着的 `step/end` 与 `turn/end { kind: 'interrupted' }`。平衡 log 返回 `[]`。 [E: packages/core/session/src/repair.ts:16] [E: packages/core/session/src/repair.ts:80] [E: packages/core/session/src/repair.ts:131] |

## 控制流

1. **host 组合挂 glue，web / headless 继承。** `dsh-base` 插入 `id: session-checkpoint-policy` / `name: '@deepseek-ai/dsh-session-checkpoint-policy'`，与 `id: session`、`id: session-persistence-jsonl`、`id: settings`（`@deepseek-ai/dsh-settings-file`）、`id: credentials`（`@deepseek-ai/dsh-credentials-local`）、`id: session-query-sqlite`（`path: ':memory:'`、`openAt: never`）同层。`dsh-base` 的 `package.json` 声明该 workspace 依赖。`dsh-web-app` **没有** checkpoint 的 `id:` / `disabled:`；它另写 `system-prompt` / `hmr` / `tools` / `session-query-sqlite`（仍 `openAt: never`），把大量 `tool-*` 行 `disabled`，并 **insert** `storage` / `workspace` / `session-projection-cache`（这三组 **只 web-app**）。`dsh-headless` 的 `insert` 是 `code-runtime` / `headless-startup` / `headless-runner`，不重挂 jsonl / checkpoint / settings / credentials，也没有 storage / workspace / projection-cache。真树是 `profile → bundle → preset`：persistence 与本页 glue 坐在 **host 面**，preset 只 `register` 工具。 [E: packages/bundle/base/cordis.patch.yml:355] [E: packages/bundle/base/cordis.patch.yml:356] [E: packages/bundle/base/package.json:74] [E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/base/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:16] [E: packages/bundle/web-app/cordis.patch.yml:22] [E: packages/bundle/web-app/cordis.patch.yml:30] [E: packages/bundle/web-app/cordis.patch.yml:33] [E: packages/bundle/web-app/cordis.patch.yml:35] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **`append` 只提交内存。** `Session.append` 钉 `seq = this.log.length`，`validateNext` 通过后 `log.push`，再 fire-and-forget `session/event`。observer 失败不能回滚已提交事件。热路径不 `fsync`。coordinator 在 `session/event` 上 `live.writes.enqueue(event)`（`structuredClone` 进 200ms 窗）。要把缓冲写成盘，调用方走 `SessionStore.flush`：该方法用 `enter` 时钉下的 carrier 收集 listener，再 `Promise.allSettled`。 [E: packages/core/session/src/index.ts:629] [E: packages/core/session/src/index.ts:643] [E: packages/session/session-persistence/src/coordinator.ts:1123] [E: packages/session/session-persistence/src/coordinator.ts:1125] [E: packages/session/session-persistence/src/write-behind.ts:47] [E: packages/core/session/src/index.ts:1022] [E: packages/core/session/src/index.ts:1023] [E: packages/core/session/src/index.ts:1026]

3. **`session/flush` 是 parallel，不是 waterfall。** `SessionStore.flush` 取 `enter` 时钉下的 carrier，收集 listener，`Promise.allSettled` 全部跑完，再抛第一个 rejection。一个 listener 失败挡不住别人跑完。coordinator 的 listener 是 `session => this.flush(session)`：取消自动等待、等 init、`live.writes.flush()` 把队列送到 JSONL（shipped）或其它 `PersistenceBackend`。本页 policy **不是** `session/flush` 的 listener，它是 **调用方**。 [E: packages/core/session/src/index.ts:1026] [E: packages/session/session-persistence/src/coordinator.ts:1129] [E: packages/session/session-persistence/src/coordinator.ts:1327] [E: packages/session/session-persistence/src/coordinator.ts:1336]

4. **相关 waterfall 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：listener 不调用传入的 `next()` 就不会 `cbs.shift()`，内建行为也被 veto。`llm/stream` 的事件名在 waterfall 参数里，innermost 是 `LlmRuntime.adapterStream`；`tools/execute` 的 waterfall 参数之后 innermost 是 `dispatchToolBody`；`agent/pre-step` 的 innermost 默认 `{ kind: 'enter', messages }`，其中 `messages` 在已有 projected context 时是 `[...claimed, context]`，不是裸 `claimed`。省略 `next()` = adapter / tool body / 本步决策都不跑。 [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] [E: packages/llm/llm/src/index.ts:923] [E: packages/llm/llm/src/index.ts:925] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1575] [E: packages/core/agent-loop/src/agent.ts:235] [E: packages/core/agent-loop/src/agent.ts:237] [E: packages/core/agent-loop/src/agent.ts:238]

5. **落点 1 · `llm/stream`（adapter 之前，副作用门）。** `apply` 注册：`options.sessionId === undefined` → 直接 `return next()`；`ctx.sessions.get(id)` 已是 `undefined`（从未 enter，或已 detach）→ 直接 `next()`；否则返回 `afterCheckpoint(ctx, session, next)`。测试钉死顺序 `flush:start → flush:end → adapter`；无 `sessionId` 或 id 已脱离 store 时 order 只有 `adapter`；`session/flush` reject `'disk unavailable'` 时 drain 抛错且 adapter 数组为空。 [E: packages/session/session-checkpoint-policy/src/index.ts:65] [E: packages/session/session-checkpoint-policy/src/index.ts:67] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:83] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:92] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:103] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:115]

6. **`dsh-agent-loop` invariant 在更外层。** invariant companion 挂同一条 `llm/stream`，`ctx.on` 的第三参是 `{ global: true, prepend: true }`：loop 请求必须 frozen、带 live `sessionId`、log 里已有 `step/start` 与 `request/header`，且 `JSON.stringify(options.messages) === JSON.stringify(session.deriveMessages())`。检查通过后 **必须** `return next()`，才会轮到本页 flush。这是 **model-visible ⟺ logged** 的运行时门；本页负责「投影已经对上之后，盘也跟上」。 [E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:40] [E: packages/core/agent-loop/src/invariant.ts:53] [E: packages/core/agent-loop/src/invariant.ts:54]

7. **一次 step 里，落点 1 刷的是「当前请求前缀」。** `ReactLoopAgent.turn` 先 `append('turn/start')`。`agent/pre-step` 那次 flush 发生在 `preStep` 里，早于本步 `append('step/start')` 和带 `surfaceOp: 'append'` 的 `user/message`。`buildRequest` 再按需 `append('request/header')`（`reason` 为 `initial` / `resume` / `change`，log-only）以及可能的 `request/context`。然后 `preparedCall?.stream(request) ?? this.loopCtx.llm.stream(request)` 进入落点 1。prepared 路径走 `streamWithRegistration`（同一条 `llm/stream` waterfall，innermost 仍是 `adapterStream`）。因此 adapter 被构造时，盘上已经有本步的 `user/message` + `request/header`；这两类事件靠的是 `llm/stream` 门，不是 `agent/pre-step` 门。 [E: packages/core/agent-loop/src/agent.ts:255] [E: packages/core/agent-loop/src/agent.ts:279] [E: packages/core/agent-loop/src/agent.ts:283] [E: packages/core/agent-loop/src/agent.ts:466] [E: packages/core/agent-loop/src/agent.ts:469] [E: packages/core/agent-loop/src/agent.ts:345] [E: packages/llm/llm/src/index.ts:811] [E: packages/llm/llm/src/index.ts:925]

8. **落点 2 · `tools/execute`（top-level tool body 之前，副作用门）。** `executeToolCalls` 对每个 model-direct call **先** `append('tool/call')`（`arguments` 是模型原文 JSON 字符串），再 `TOOL_RUNTIME_SCHEDULER.dispatch` → `ctx.waterfall(..., 'tools/execute', …, () => dispatchToolBody)`。policy：`exec.agent === undefined || exec.parent !== undefined` → `return next()`（0 次本层 flush）；否则 `await ctx.sessions.flush(exec.agent.session)`，再看 `exec.signal.aborted`，最后 `return next()`。Code Mode / `run_code` SDK 子调用带着 `parent` token 重入同一 registry，复用外层那一次耐久的 `tool/call`，不再刷。测试：带 `parent: Symbol('outer')` 时 `flushes === 0`。 [E: packages/core/agent-loop/src/tool-calls.ts:167] [E: packages/core/agent-loop/src/tool-calls.ts:263] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:74] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:222]

9. **落点 2 的两种 fail-closed。** flush 期间 abort：`await flush` **仍跑完**（盘上已有 `tool/call`），然后 `return abortedBeforeDispatchResult()`，**不** `next()`。结果文案 `Error: tool call aborted before dispatch`，`error.info.code === TOOL_ABORTED_BEFORE_DISPATCH`；测试 order 停在 `flush:start, flush:end`，tool body 的 `'tool'` 不会出现。flush **抛错**：waterfall 整段 reject，`dispatchScheduledExecution` 的 `catch` 走 `toolErrorResult`（`Error: ${message}`），同样不进 body；测试 `ran === false`、content 为 `Error: disk unavailable`。registry 自己的 abort（body 尚未 `bodyInvoked`）也会铸同一 code，那是 tools 管线，不是本页 listener。 [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:73] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:183] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:203] [E: packages/core/tools/src/index.ts:1874]

10. **落点 3 · `agent/pre-step`（耐久刷盘，不是副作用门）。** 每步决策前 `await ctx.sessions.flush(agent.session)` 再 `return next()`。它把**上一 step 已提交**的 assistant / tool/result，以及刚写下的 `turn/start`，送到 persistence。它**不**阻止即将发生的 tool body（tool body 由落点 2 挡）；flush 失败会让本步 `preStep` 抛错，下一步请求发不出去。测试用 `agentEvents(ctx, agent).waterfall('agent/pre-step', …)` 断言 flush 收到该 `session.id`。事件声明在 `dsh-agent` 的 `Events['agent/pre-step']`。 [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:236] [E: packages/core/agent/src/runtime-types.ts:231]

11. **hard-crash e2e（非 win32）。** 子进程挂 JSONL（`compression: 'none'`）+ 本页 policy + `AgentLoop`。`request` 模式：adapter `stream` 一进就写 marker `request-dispatched` 再挂起；父进程 SIGKILL。reload `sessionPersistence.load` 后 type 序列为 `agent/inbox/spliced, turn/start, agent/inbox/spliced, step/start, user/message, request/header, request/context, step/end, turn/end`，末条 `reason.kind === 'interrupted'`——盘上在 dispatch 瞬间已有完整请求前缀；load 路径在 `tornMarker !== undefined || closers.length > 0` 时 `commitRepair` 把 closers 写回去。`tool` 模式：模型先产出 `crash_tool`，body 写 `tool-side-effect` 再挂起；reload 看得到 `assistant/message` 与 `tool/call`，补上的 `tool/result` 带 `code: TOOL_OUTCOME_UNKNOWN`，正文含 `Do not retry blindly.`。 [E: packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts:24] [E: packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts:50] [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:89] [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:104] [E: packages/session/session-persistence/src/coordinator.ts:945]

12. **repair 只补尾巴，不改前缀。** `interruptedTurnClosers` 扫描已提交事件：开 turn 里未配对的 call，有 `tool/call` seq 就铸 `ToolOutcomeUnknownError` / `TOOL_OUTCOME_UNKNOWN` 并 `sourceEventSeqs: [callSeq]`；只有 assistant 块、从未 `tool/call` 则 `TOOL_NOT_STARTED`。然后补 `step/end`（若 step 仍开）和 `turn/end { kind: 'interrupted' }`。时间戳复用最后一条真事件。`inspect()` 走 `preparations.inspect` + `prepareCore`（内存拼 closers），这条路径不到 `commitPrepared`。`load` / `prepare` 经 `commitPrepared`：`tornMarker !== undefined || closers.length > 0` 时才 `backend.commitRepair`。本页 e2e 走 `load`。 [E: packages/core/session/src/repair.ts:118] [E: packages/session/session-persistence/src/coordinator.ts:787] [E: packages/session/session-persistence/src/coordinator.ts:794] [E: packages/session/session-persistence/src/coordinator.ts:796] [E: packages/session/session-persistence/src/coordinator.ts:903] [E: packages/session/session-persistence/src/coordinator.ts:944] [E: packages/session/session-persistence/src/coordinator.ts:945]

13. **fiber 卸掉 = 三扇门卸掉。** `ctx.on` 登记在 owning fiber 上。测试：`plugin(checkpointPolicy)` 后一次 `llm.stream` 触发 1 次 flush；`fiber.dispose()` 后再 stream，flush 计数仍是 1。Loader `unwrapExports` 要求无 `default`、有 `name` / `inject` / `apply`。 [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:255] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:258] [E: packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts:262] [E: vendor/cordis/src/events.ts:256]

## 设计动机

Peer harness 常见「内存 `messages` + 事后再写盘」。DSH 把 append-only `SessionEvent` 日志当成唯一真相：模型下一轮看见的只能是 `deriveMessages()` 对 `surface.nodes` 的投影。要把这条合同熬过 SIGKILL，必须在**不可逆副作用之前**设耐久屏障——adapter 一 dispatch 就开始花 token、看到完整 request；top-level tool body 一开始就可能改用户磁盘 / 网络。嵌套 `parent` 不再刷，是因为外层 `run_code`（或其它 transport）那一次 `tool/call` 已经在落点 2 刷过；子调用再刷只会把同一前缀写多遍，挡不住外层已经放行的世界。

`agent/pre-step` 是第三条刷盘，动机不同：下一步 `buildRequest` 之前，把上一 step 的 response / result 从 200ms write-behind 里赶出去，避免「模型已经在想下一轮、盘上还停在上上轮」。它不是副作用门——tool 早在落点 2 跑过了。

policy 做成独立 glue、而不是写进 `ReactLoopAgent`，是因为 DSH 是组合运行时：换 loop、换 `ctx.llm` adapter、换 `PersistenceBackend`，这三扇门仍然卡在同一组 waterfall 名上。`inject` 带上 `sessionPersistence`，是为了保证 coordinator 的 `session/flush` listener 先于本页 `apply` 挂上；没有 backend 时 `SessionStore.flush` 仍 resolve（listener 数为 0 则返回 `false`），屏障就变成空转。 [E: packages/core/session/src/index.ts:1038]

## Gotcha

- **不是每个 `append` 都刷盘。** `turn/start`、`assistant/chunk`、中间的 `session/event` 都只进 200ms 窗。漏写本页三扇门，等于接受最多约 200ms 加一次后台写的丢失窗。
- **`session/flush` 没有 `next()`。** 把它当成 waterfall、指望「不调用 next 就挡住别人」是错的。耐久否决发生在 `llm/stream` / `tools/execute`（以及 pre-step 的抛错）里。
- **waterfall 漏 `next()` 等于停整条链。** checkpoint 或 loop invariant 检查完若不 `return next()` / `yield* next()`，adapter 不会被调用。 [E: vendor/cordis/src/events.ts:238]
- **无 live session 的 `llm.stream` 不刷。** 缺 `sessionId`、或 id 已不在 `ctx.sessions`，policy 直接 `next()`。测试 / 非 loop 调用可以绕过耐久门；loop invariant 会另挡「声称是 loop 请求却没有 live session」。
- **没有 `exec.agent` 的 `tools.execute` 不刷。** 只有 loop 填了 `agent` 的 top-level call 才是副作用门。裸 `ctx.tools.execute({ … })` 走 `next()`。
- **嵌套 `parent` 的 0 flush 是功能，不是漏网。** 子调用的副作用算在外层 `tool/call` 已经耐久的前提下。外层若被 abort-before-dispatch，inner 根本不会被调度。
- **flush 期间 abort ≠ crash。** abort 路径盘上已有 `tool/call`，loop 会再 `append` 一条 `tool/result`（`ABORTED_BEFORE_DISPATCH`）。crash 在 body 里 SIGKILL，盘上只有 `tool/call`，reload 才补 `TOOL_OUTCOME_UNKNOWN`。两套 code 不要混。
- **wire code 不是 TypeScript 名。** `TOOL_ABORTED_BEFORE_DISPATCH === 'ABORTED_BEFORE_DISPATCH'`。`TOOL_OUTCOME_UNKNOWN === 'TOOL_OUTCOME_UNKNOWN'`。
- **e2e 跳过 win32。** `describe.skipIf(process.platform === 'win32')`。POSIX `SIGKILL` 编排不在 Windows 上承诺。 [E: packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts:82]
- **`load` / `prepare` 才可能 `commitRepair`。** 只 `inspect` 会在内存里看到 `interrupted` 尾巴，盘上还是开 turn。`commitRepair` 在 `tornMarker !== undefined || closers.length > 0` 时开火，不是只看 closers。 [E: packages/session/session-persistence/src/coordinator.ts:944]
- **header `version` 与 SQLite `user_version` 不是一回事。** 崩过的盘仍要 `version === 0` 才能打开；换 SQLite 后端还要 `SCHEMA_VERSION === 15`。本页不负责迁盘。
- **settings / credentials / session-query 不是本页 glue。** settings 分层是 schema defaults → composition `base` → 用户文档。组合里是 `CredentialRef`，secret 值在 `.credentials.yaml`。shipped `session-query-sqlite` 是 `openAt: never`。`storage` / `workspace` / `session-projection-cache` 只 web-app。 [E: packages/settings/settings/src/index.ts:705] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:76]

## Seam 三角

| 角色 | 包 / 合同 | ctx 键 | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|
| Definition | `dsh-llm` 的 `llm/stream`；`dsh-tools` 的 `tools/execute`；`dsh-agent` 的 `agent/pre-step`；`dsh-session` 的 `session/flush`（parallel，无 `next`） | 无 `ctx.checkpoint`。policy 不占键 | 四条声明随 `llm` / `tools` / `agent` / `session` 行进入每个 profile | 不改这四条事件合同；web-app 把部分 **tool 行** `disabled` 挪到 preset，waterfall 名仍在 host | 继承 base 的四条声明；insert 不含 persistence |
| Provider | shipped 落盘：`dsh-session-persistence-jsonl` → `PersistenceCoordinator` 听 `session/flush`。`SessionStore`（`ctx.sessions`）是 flush **入口** | `ctx.sessionPersistence`、`ctx.sessions` | `id: session-persistence-jsonl`（`root: dshHomePath('sessions')`）+ `id: session` + `id: settings` + `id: credentials` + `id: session-query-sqlite`（`openAt: never`） | **继承** jsonl / checkpoint / settings / credentials / session-query；另写 system-prompt / hmr / tools；insert storage / workspace / projection-cache（**只 web-app**） | **继承**；不重挂 jsonl / checkpoint / settings / credentials；insert 无 storage / workspace / projection-cache |
| Consumer / glue | `@deepseek-ai/dsh-session-checkpoint-policy`：`inject` 四键，三条 waterfall 里 `flush` 后再 `next()`。下游：`adapterStream`、`dispatchToolBody`、loop 的 pre-step 默认 `enter`（可附 projected context） | 无。读 `ctx.sessions.flush` / `get` | `id: session-checkpoint-policy` | **继承**，无 disable | **继承** |

换 JSONL 为仓库里未 shipped 的 SQLite backend，只换 `session/flush` 的落盘实现；三扇门的名字与 fail-closed 语义不变。卸掉本页行，write-behind 仍会在约 200ms 后写盘，但 adapter / top-level tool 不再等那次写完。preset 不得再 publish 一份 `sessions`（`leakedServices`），因此也不能在 isolate 里「另挂一套 checkpoint」。

## Sources

- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-checkpoint-policy/package.json
- packages/session/session-checkpoint-policy/src/invariant.ts
- packages/session/session-checkpoint-policy/tests/session-checkpoint-policy.spec.ts
- packages/session/session-checkpoint-policy/tests/crash-recovery.e2e.ts
- packages/session/session-checkpoint-policy/tests/fixtures/crash-child.ts
- packages/core/session/src/index.ts
- packages/core/session/src/repair.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/session/session-persistence/src/coordinator.ts
- packages/session/session-persistence/src/write-behind.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/core/tools/src/index.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/invariant.ts
- packages/llm/llm/src/index.ts
- packages/core/agent/src/runtime-types.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- vendor/cordis/src/events.ts
- packages/settings/settings/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- packages/llm/llm-deepseek/src/index.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages`、本页两个副作用落点在整条 turn 里的位置。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：`tool/call` 之后的 `pre-execute → execute → post-execute`；Code Mode `parent` 为何跳过顶层 checkpoint。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/flush` parallel、`interruptedTurnClosers` 合同。
- [subsys.persistence.session-persistence](session-persistence.md)：`PersistenceCoordinator`、write-behind 200ms、`load` / `prepare` 在 torn 或 closers 时 `commitRepair`。
- [subsys.core.tools](../core/tools.md)：`tools/execute` waterfall、`TOOL_ABORTED_BEFORE_DISPATCH` 的 registry 侧铸造。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.turn-and-step](../../spine/turn-and-step.md)：`turn/start` / `preStep` / `step/start` 与 inbox 何时变成 `user/message`。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend，本页 `flush` 最终写到的盘。
- [subsys.core.agent-loop](../core/agent-loop.md)：`ReactLoopAgent` 何时 `llm.stream` / `executeToolCalls`；`llm/stream` 上的 reconstruction invariant。
