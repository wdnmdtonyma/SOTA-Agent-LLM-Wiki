---
id: subsys.llm.retry
title: llm retry
kind: subsystem
tier: T2
pkg: llm
source:
  - packages/llm/llm-retry/src/index.ts
  - packages/llm/llm-retry/src/history.ts
  - packages/llm/llm-retry/src/types.ts
  - packages/llm/llm-retry/src/invariant.ts
  - packages/llm/llm-retry/src/brand.ts
  - packages/llm/llm-retry/package.json
  - packages/llm/llm-retry/tests/retry.spec.ts
  - packages/llm/llm-retry/tests/loader-composition.spec.ts
  - packages/llm/llm-retry/tests/persistence.spec.ts
  - packages/llm/llm/src/retry-policy.ts
  - packages/llm/llm/src/index.ts
  - packages/llm/llm/src/error.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/session/src/surface.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/llm/llm-pi-ai/src/adapter.ts
  - vendor/cordis/src/events.ts
symbols:
  - apply
  - RetryId
related:
  - spine.overview
  - spine.turn-and-step
  - subsys.llm.service
  - subsys.core.agent-loop
  - subsys.composition.bundle-base
  - subsys.llm.deepseek
  - subsys.llm.pi-ai
  - spine.session-log
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-llm-retry` 是 **host 面** function plugin：挂在 `agent/request-error` waterfall 上，按 adapter **注册时**冻结进 `AdapterRegistration.retryPolicy` 的 `ResolvedRetryPolicy` 做可取消退避。它**不是** `LlmAdapter`，不调用 `registerAdapter`，也不提供 `ctx.*` 服务。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），capability seam 是 Definition / Provider / Consumer。本行坐在 **host 面**（和 `ctx.llm` / `ctx.agents` 同一进程级树），**不**进 agent-preset 的 tools / persona / isolate。默认产品路径是 `dsh web`，本仓没有 shipped TUI。`model-visible ⟺ logged`：失败尝试留下的 `assistant/chunk` 与 `llm/retry*` 都不进 `deriveMessages()`；只有成功收束的 `assistant/message` 才成为下一枪的对话。

## 能回答的问题

- `dsh-llm-retry` 是不是 adapter？`inject` 为什么是 `['agents']` 而不是 `llm`？
- plugin `Config` 为什么必须是空对象？把 `retryPolicy` 写在这一行会怎样？policy **值**实际活在哪？
- `policy === undefined`、`mode: 'always'`、`mode: 'normal'` 各自何时 `next()`、何时自己返回 `{ kind: 'retry' }`？
- adapter 省略 policy 时默认是什么（`mode` / `maxRetries` / `retryableCodes`）？
- `llm/retry` 和 `llm/retry-started` 谁先落盘？取消或 dispose 会不会写 started？次数从哪条 session 事件计？
- 重试是新 `turn` / 新 `step`，还是同一 `ReactLoopAgent.step` 的 `while` 再打一枪？

## 职责边界

本包 `@deepseek-ai/dsh-llm-retry` 拥有： [E: packages/llm/llm-retry/package.json:2]

- function plugin 入口 `apply` / `name = 'llm-retry'` / `inject = ['agents']`。 [E: packages/llm/llm-retry/src/index.ts:20] [E: packages/llm/llm-retry/src/index.ts:21] [E: packages/llm/llm-retry/src/index.ts:99]
- 空 `Config`：类型是 `Readonly<Record<string, never>>`，运行时 schema 是 `z.object({})`。 [E: packages/llm/llm-retry/src/index.ts:24] [E: packages/llm/llm-retry/src/index.ts:27]
- 在 `agent/request-error` 上执行已解析 policy：计次、backoff、`AbortSignal` 熔断、dispose 排空。
- 非 surface 事件 `llm/retry` / `llm/retry-started` 的 `SessionEventMap` 扩增，以及 branded `RetryId`。 [E: packages/llm/llm-retry/src/types.ts:9] [E: packages/llm/llm-retry/src/types.ts:11] [E: packages/llm/llm-retry/src/brand.ts:4]
- companion `./invariant`（`name = 'llm-retry-invariant'`，`inject = ['invariants']`）核这些事件相对开 turn / 开 step / `request/header` 的约束。 [E: packages/llm/llm-retry/src/invariant.ts:14] [E: packages/llm/llm-retry/src/invariant.ts:16]

本包 **不** 拥有：

- `ctx.llm`、`registerAdapter`、HTTP、credentials、`llm/stream` waterfall — [`subsys.llm.service`](./service.md)。
- policy **值**。`LlmAdapter.providerRetryPolicy` 默认返回 `undefined`；`registerAdapter` 在那时调用 `resolveRetryPolicy(undefined, …)` 并把结果冻进 registration。 [E: packages/llm/llm/src/index.ts:196] [E: packages/llm/llm/src/index.ts:387] [E: packages/llm/llm/src/index.ts:388]
- DeepSeek / pi-ai 的 catalog、key、settings 热替换 — [`subsys.llm.deepseek`](./deepseek.md) / [`subsys.llm.pi-ai`](./pi-ai.md)。pi-ai 把 SDK `maxRetries` 写成 `0`，把可见次数留给本执行器。 [E: packages/llm/llm-pi-ai/src/adapter.ts:97]
- turn / step 合同、默认「不重试」inner `next`、`{ kind: 'retry' }` 之后如何再 dispatch — [`subsys.core.agent-loop`](../core/agent-loop.md) / [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- `deriveMessages()` / surface 三类 — [`spine.session-log`](../../spine/session-log.md)。`llm/retry*` 不在 `SURFACE_EVENT_TYPES`。 [E: packages/core/session/src/surface.ts:16]
- Codex / Claude 子代理后端。`dsh-base` **没有**那两行。

`dsh-base` 用 `id: llm-retry` 无 `config` 地插入本包。 [E: packages/bundle/base/cordis.patch.yml:72] [E: packages/bundle/base/cordis.patch.yml:73] `dsh-web-app` / `dsh-headless` / 四个 shipped preset 的 yml **没有** `llm-retry` 行（既不 remount 也不 `disabled`）。[I] `apply` 不 `ctx.provide`，因此也没有 isolate realm。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/llm/llm-retry/src/index.ts` | `apply` / 空 `Config` / `recover` / `backoff` / `agent/request-error` 监听 |
| `packages/llm/llm-retry/src/types.ts` | `llm/retry`、`llm/retry-started` 载荷；`normal` 带 `maxRetries`，`always` 省略 |
| `packages/llm/llm-retry/src/brand.ts` | `RetryId` branded string；工厂不做校验 |
| `packages/llm/llm-retry/src/history.ts` | `providerForOpenStep`：invariant 用，从开 step 内生效的 `request/header` 取 provider |
| `packages/llm/llm-retry/src/invariant.ts` | companion：开 turn / 开 step、policy 链编号、`retry-started` 配对 |
| `packages/llm/llm/src/retry-policy.ts` | `RetryPolicyConfig` / `resolveRetryPolicy` / 默认值（adapter 省略时） |
| `packages/llm/llm/src/index.ts` | registration 捕获 `retryPolicy`；`PreparedLlmCall.retryPolicy` |
| `packages/core/agent-loop/src/agent.ts` | `step` 的 `while`：失败 → waterfall → `{ kind: 'retry' }` 则 `continue` |
| `packages/core/agent/src/runtime-types.ts` | `RequestErrorAction`；`agent/request-error` 签名（含 `retryPolicy`） |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: llm-retry` |
| `packages/llm/llm-retry/tests/retry.spec.ts` | 计次、always 先 `next()`、空 Config、同 step、Retry-After、dispose |
| `packages/llm/llm-retry/tests/loader-composition.spec.ts` | 真 Loader 挂本包后 registration policy 能恢复 |
| `packages/llm/llm-retry/tests/persistence.spec.ts` | `llm/retry` 落盘无损且 `deriveMessages()` 仍为空 |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `Config` | 本插件 | 必须是 `{}`。任一自有 key 抛 `llm-retry: unknown key "…"`；`retryPolicy` 另抛 `belongs under each provider`。 [E: packages/llm/llm-retry/src/index.ts:32] [E: packages/llm/llm-retry/src/index.ts:33] [E: packages/llm/llm-retry/src/index.ts:35] |
| `ResolvedRetryPolicy` | `@deepseek-ai/dsh-llm` | `normal`（`maxRetries` + `retryableCodes` + backoff）或 `always`（只有 backoff）。注册时冻结。 |
| 默认 policy | `resolveRetryPolicy(undefined, …)` | `mode: 'normal'`，`maxRetries: 2`，`retryableCodes` = `EMPTY_RESPONSE` / `RATE_LIMIT` / `SERVER` / `TIMEOUT` / `TRANSPORT`，backoff `500` / `10000` / `0.1`。 [E: packages/llm/llm/src/retry-policy.ts:14] [E: packages/llm/llm/src/retry-policy.ts:15] [E: packages/llm/llm/src/retry-policy.ts:16] [E: packages/llm/llm/src/retry-policy.ts:17] [E: packages/llm/llm/src/retry-policy.ts:18] [E: packages/llm/llm/src/retry-policy.ts:151] [E: packages/llm/llm/src/retry-policy.ts:152] [E: packages/llm/llm/src/error.ts:39] |
| `RequestErrorAction` | `dsh-agent` | `{ kind: 'retry' } \| undefined`。`undefined` = 本步失败终结。 [E: packages/core/agent/src/runtime-types.ts:58] |
| `RetryId` | 本包 | 一条 provider+`policyKey` 链共用的身份；首记 `randomUUID()`，后续复用。 [E: packages/llm/llm-retry/src/index.ts:192] |
| `policyKey` | `recover` 内 | `always`：`JSON.stringify([mode, initialDelayMs, maxDelayMs, jitterRatio])`；`normal` 再插入 `maxRetries` 与排序后的 `retryableCodes`。 [E: packages/llm/llm-retry/src/index.ts:67] |
| `llm/retry` | session log | 等待**之前**写入。含 `retryId` / turn / step / provider / mode / `policyKey` / `retry` / `delayMs` / `failure`；`normal` 另有 `maxRetries`。 [E: packages/llm/llm-retry/src/index.ts:150] |
| `llm/retry-started` | session log | 等待**成功结束之后**、返回 `{ kind: 'retry' }` **之前**写入。取消不写。 [E: packages/llm/llm-retry/src/index.ts:152] [E: packages/llm/llm-retry/src/index.ts:153] |
| `LlmFailure` | `dsh-llm` | `message` + `code`；可选 `status` / `providerRetryAfterMs` / `requestId`。policy 只认 `code`（外加 Retry-After 数值）。 |

次数：`agent.session.events.findLast` 找同 `turn` + `step` + `provider` + `policyKey` 的最近一条 `llm/retry`，`previousRetry` 缺省 `0`，本枪 `retry = previousRetry + 1`。 [E: packages/llm/llm-retry/src/index.ts:182] [E: packages/llm/llm-retry/src/index.ts:189] [E: packages/llm/llm-retry/src/index.ts:191] `normal` 在 `previousRetry >= maxRetries` 时 `next()`，不再调度。 [E: packages/llm/llm-retry/src/index.ts:190] 换 registration 导致 `policyKey` 变了，编号从 1 重开（测试：替换 adapter 后第二条 `llm/retry` 仍是 `retry: 1`）。 [E: packages/llm/llm-retry/tests/retry.spec.ts:638]

## 控制流

DSH 主线仍是 `profile → bundle → agent preset`。本插件只参与 **host 面** 已在跑的 `ReactLoopAgent.step`：模型流失败之后、`step/end` 之前。

### 1. 组合与空 Config

1. `dsh-base` 根 insert 含 `id: llm-retry` / `name: '@deepseek-ai/dsh-llm-retry'`，没有 `config:` 键。 [E: packages/bundle/base/cordis.patch.yml:72] [E: packages/bundle/base/cordis.patch.yml:73]
2. Loader 等到 `ctx.agents` 就绪后调 `apply(ctx, config = {})`。`validateConfig` 看见任何一个 key 就抛；测试把 `{ retryPolicy: { mode: 'always' } }` 钉成 `/retryPolicy belongs under each provider/`，把拼写错误钉成 `/unknown key "retryPolciy"/`。 [E: packages/llm/llm-retry/src/index.ts:100] [E: packages/llm/llm-retry/tests/retry.spec.ts:1030] [E: packages/llm/llm-retry/tests/retry.spec.ts:1036]
3. `apply` 登记 `ctx.on('agent/request-error', …)`，并用 `ctx.effect` 在卸插件时 `disposeListener()`、`lifetime.abort`、`Promise.allSettled(active)`。 [E: packages/llm/llm-retry/src/index.ts:210] [E: packages/llm/llm-retry/src/index.ts:221]

### 2. policy 值从哪来（不是本包）

4. 某 adapter `registerAdapter(providers, adapter)` 时，对每个 route 读 `adapter.providerRetryPolicy(provider)`；`undefined` 就 `resolveRetryPolicy(undefined, …)`，结果放进私有 `adapters` map 的 `AdapterRegistration.retryPolicy`。 [E: packages/llm/llm/src/index.ts:387] [E: packages/llm/llm/src/index.ts:392]
5. `prepareCall` 把**那一次** registration 的 policy 拷到 `PreparedLlmCall.retryPolicy`。中途 `replace` / dispose 旧 route 不会改已经发出的这次失败所用的 policy。 [E: packages/llm/llm/src/index.ts:797]
6. `ReactLoopAgent.buildRequest` 调 `llm.prepareCall`；`NO_ADAPTER` 被吞掉后 `preparedCall` 保持 `undefined`。 [E: packages/core/agent-loop/src/agent.ts:449] [E: packages/core/agent-loop/src/agent.ts:453]

### 3. 失败如何进 waterfall

7. `ReactLoopAgent.step` 外层是 `while (true)`。流结束若 `finish.kind === 'error' || finish.kind === 'aborted'`，走 `dispatch.waterfall('agent/request-error', { turn, step, provider, failure, retryPolicy: preparedCall?.retryPolicy, signal }, inner)`。 [E: packages/core/agent-loop/src/agent.ts:339] [E: packages/core/agent-loop/src/agent.ts:354] [E: packages/core/agent-loop/src/agent.ts:355] [E: packages/core/agent-loop/src/agent.ts:361]
8. `agentEvents.waterfall` 把 `agent` 注入 payload（调用方不能覆盖）。 [E: packages/core/agent/src/dispatch.ts:118] [E: packages/core/agent/src/dispatch.ts:143]
9. Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237]
10. loop 的 inner `next` 是 `() => Promise.resolve(undefined)`：整条链若无人返回 `{ kind: 'retry' }`，本步失败终结。 [E: packages/core/agent-loop/src/agent.ts:364] `action?.kind !== 'retry'` 时抛 `LlmError`；相等则 `continue`，**同一** `turn` / `step` 再 `buildRequest`。 [E: packages/core/agent-loop/src/agent.ts:367] [E: packages/core/agent-loop/src/agent.ts:370]

### 4. `recover@packages/llm/llm-retry/src/index.ts`（必须写清 `next()`）

先登记的 listener 是 outer。本插件通常随 host 树早挂；后挂的「专用恢复」是 inner（downstream）。`lifetime` 已 abort 时，即便 waterfall 还握着旧 callback，也直接 `Promise.resolve(undefined)`，**不**进入 `recover`。 [E: packages/llm/llm-retry/src/index.ts:217]

11. `policy === undefined`（没有 `preparedCall`，例如 route 已卸、`NO_ADAPTER`）→ `return next()`。测试：dispose adapter 后 0 次 HTTP、0 条 `llm/retry`，`turn/end` 的 code 是 `NO_ADAPTER`。 [E: packages/llm/llm-retry/src/index.ts:160] [E: packages/llm/llm-retry/tests/retry.spec.ts:451] [E: packages/llm/llm-retry/tests/retry.spec.ts:456]
12. `mode === 'always'`：**先** `settleDownstream(next)`。下游返回 `{ kind: 'retry' }` 则原样返回，**不**写 `llm/retry`、不 backoff。下游抛错只 `logger.warn`，然后继续走本层 always。turn / plugin 已 abort 则在 `next()` 前后都直接 `return`。 [E: packages/llm/llm-retry/src/index.ts:161] [E: packages/llm/llm-retry/src/index.ts:166] [E: packages/llm/llm-retry/src/index.ts:174] [E: packages/llm/llm-retry/tests/retry.spec.ts:733] [E: packages/llm/llm-retry/tests/retry.spec.ts:744]
13. `mode === 'normal'`：`failure.code` 不在 `policy.retryableCodes` → `return next()`（测试：`AUTH` 0 条 `llm/retry`、0 个 timer）。 [E: packages/llm/llm-retry/src/index.ts:177] [E: packages/llm/llm-retry/src/index.ts:178] [E: packages/llm/llm-retry/tests/retry.spec.ts:433] 过了名单再看 `previousRetry >= maxRetries`，到顶也 `next()`。 [E: packages/llm/llm-retry/src/index.ts:190] [E: packages/llm/llm-retry/tests/retry.spec.ts:339]
14. `normal` 一旦决定自己退避，**不**再 `next()`：更 inner 的 `agent/request-error` 听不见这次失败。这是故意短路，不是漏写。

### 5. 先落盘再等

15. 算出 `delayMs`：有效且 `<= maxDelayMs` 的 `failure.providerRetryAfterMs` 原样使用；超过上限时 `normal` `next()`、`always` 改用本地 `localDelay`。 [E: packages/llm/llm-retry/src/index.ts:194] [E: packages/llm/llm-retry/src/index.ts:198] [E: packages/llm/llm-retry/src/index.ts:199]
16. `backoff`：熔断 `AbortSignal.any([signal, lifetime.signal])` 已 abort 则什么都不写。否则 **先** `append('llm/retry', …)`，再 `cancellableDelay`。等成功才 `append('llm/retry-started', { retryId, turn, step, retry })` 并 `return { kind: 'retry' }`；abort 清 timer、不写 started、返回 `undefined`。 [E: packages/llm/llm-retry/src/index.ts:150] [E: packages/llm/llm-retry/src/index.ts:151] [E: packages/llm/llm-retry/src/index.ts:152] [E: packages/llm/llm-retry/src/index.ts:153]
17. 测试钉死：`RATE_LIMIT` 先出现 `llm/retry`（`retry: 1`、`delayMs: 500`），499ms 时仍 1 次请求，再 1ms 才第二次；全程只有一条 `step/start { turn: 1, step: 1 }`。 [E: packages/llm/llm-retry/tests/retry.spec.ts:202] [E: packages/llm/llm-retry/tests/retry.spec.ts:204] [E: packages/llm/llm-retry/tests/retry.spec.ts:205] [E: packages/llm/llm-retry/tests/retry.spec.ts:208] [E: packages/llm/llm-retry/tests/retry.spec.ts:209] [E: packages/llm/llm-retry/tests/retry.spec.ts:216]
18. 失败那一枪的 `assistant/chunk`（含半截 `tool-call`）留在开 step 的 log 里，但 **没有** `assistant/message` / `tool/call`，工具 `execute` 次数为 0；重试请求的 `messages` 与第一枪相同。 [E: packages/llm/llm-retry/tests/retry.spec.ts:302] [E: packages/llm/llm-retry/tests/retry.spec.ts:303] [E: packages/llm/llm-retry/tests/retry.spec.ts:718]
19. `llm/retry` 本身不是 surface：persistence 测试 append 后 `deriveMessages()` 为 `[]`，flush/load 事件无损。 [E: packages/llm/llm-retry/tests/persistence.spec.ts:58]
20. 真 Loader 组合（`name: '@deepseek-ai/dsh-llm-retry'` 无 config）加上 adapter 自带的 `providerRetryPolicy`，一次 `SERVER` 之后能再打一枪并留下 1 条 `llm/retry`。 [E: packages/llm/llm-retry/tests/loader-composition.spec.ts:95] [E: packages/llm/llm-retry/tests/loader-composition.spec.ts:112]

### 6. isolate

本页不涉及 isolate。执行器不 publish 服务，preset 也不 remount。把它再挂进某个 agent-preset 而漏 `isolate` **不会**触发 `leakedServices`（没有泄漏的 service 名），但会多一个 `agent/request-error` listener。

## 设计动机

- **执行器与 policy 值拆开。** 各 provider 的 settings / composition 拥有 `retryPolicy`；执行器拒绝任何自己的 key，避免「全局一份预算」把 DeepSeek 和 pi-ai catalog 绑死。`registerAdapter` 捕获的是当时那份 resolved 值，settings 改 policy 必须 `replace` 该 route 才换下次 `prepareCall` 看到的对象。
- **不包 `llm/stream`。** 一次 `stream()` = 一次 provider 尝试。pi-ai 把 SDK `maxRetries` 钉成 `0`，避免 SDK 内重试与本层预算相乘。 [E: packages/llm/llm-pi-ai/src/adapter.ts:97]
- **先 `llm/retry` 再 sleep。** UI / persistence / 崩溃重放能看见「已经决定等」；`llm/retry-started` 才是「等完、下一枪即将发出」。
- **同 step 再打，不提交失败 assistant。** 半截 tool-call 不会变成模型可见历史，也不会跑工具。下一枪 `deriveMessages()` 仍是失败前的 surface。
- **`always` 先问下游。** 专用恢复（换 cred、换 route）可以返回 `{ kind: 'retry' }` 立刻再打；抛错不会掐死 always 兜底。
- **计次认 log，不认内存。** 同 step 内换 provider 或换 `policyKey` 各有预算；HMR 换 registration 不会把旧次数算到新 policy 上。

## Gotcha

- **这不是 adapter。** 没有 `registerAdapter`，没有 provider 字符串 route，不读 `ctx.llm`。`inject = ['agents']` 只是为了等 `agent/*` 事件所在的 host 服务。 [E: packages/llm/llm-retry/src/index.ts:21]
- **Config 不能写 policy。** `{ retryPolicy: … }` 与任意未知 key 都在 `apply` 同步抛错，不是静默忽略。 [E: packages/llm/llm-retry/tests/retry.spec.ts:1030]
- **默认名单不含 `AUTH` / `MISSING_CREDENTIAL` / `ABORTED`。** `EMPTY_RESPONSE` 是适配器把「正常结束但零 content」收成的 code，默认可重试。 [E: packages/llm/llm/src/retry-policy.ts:18] [E: packages/llm/llm/src/error.ts:39] [E: packages/llm/llm-retry/tests/retry.spec.ts:226]
- **`maxRetries: 0` 合法**（`resolveRetryPolicy` 允许非负整数）。`previousRetry` 初值 `0`，`0 >= 0` 立刻 `next()`，等于关掉 normal 重试。
- **`always` 仍会 `next()`。** 漏读成「always 不走 waterfall」是错的。下游 `{ kind: 'retry' }` 会让 always **跳过**自己的 `llm/retry`。 [E: packages/llm/llm-retry/tests/retry.spec.ts:744]
- **重试不新开 turn / step。** `ReactLoopAgent.step` 在同一 `while` 里 `continue`。测试只看到一条 `step/start`。包内 README 写「closes the failed turn / fresh numbered turn」与代码冲突，以 loop 为准。 [E: packages/core/agent-loop/src/agent.ts:370] [E: packages/llm/llm-retry/tests/retry.spec.ts:216] [U]
- **waterfall 发生在开 step 里。** invariant 要求 `llm/retry` 时最近边界是 `step/start` 不是 `step/end`。 [E: packages/llm/llm-retry/src/invariant.ts:96]
- **忘了 `next()` 又没返回 `retry` = 失败终结。** inner 默认是 `undefined`。 [E: packages/core/agent-loop/src/agent.ts:364]
- **Retry-After 超过 `maxDelayMs`：** `normal` 放弃；`always` 改用本地 jitter，不会因为供应商说「等太久」而停。 [E: packages/llm/llm-retry/src/index.ts:198]
- **dispose / `cancel` 会熔断等待。** 已写出的 `llm/retry` 留在 log；没有 `llm/retry-started`；`turn/end` 可以是 `aborted`。dispose 会等仍在跑的下游 `next()` 结束。 [E: packages/llm/llm-retry/tests/retry.spec.ts:970]
- **`providerForOpenStep` 不在热路径。** `recover` 用 payload 上的 `provider` + session 里的 `llm/retry`；`history.ts` 只给 invariant 对 `request/header`。
- **`./invariant` 不在 `dsh-base`。** base 没有 `invariants` 行；companion 是测试 / 诊断挂载，不是 shipped 默认树的一部分。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 | bundle / preset 行 |
|---|---|---|---|
| **Definition** | `@deepseek-ai/dsh-agent` 的 `agent/request-error` + `RequestErrorAction`；`@deepseek-ai/dsh-llm` 的 `ResolvedRetryPolicy` / `resolveRetryPolicy`；本包 `SessionEventMap['llm/retry']` | 无独立 `ctx.llmRetry`。事件挂在 agent scope；policy 类型在 `dsh-llm` | 无。合同随 `id: agent` / `id: llm` 进树 |
| **Provider（执行）** | `@deepseek-ai/dsh-llm-retry` 的 `apply`：听 waterfall、写事件、backoff | 无 service 名。`inject = ['agents']` | **host** `dsh-base`：`id: llm-retry`，无 `config`，无 `isolate`。web-app / headless / shipped preset **无**本行 |
| **Provider（policy 值）** | 各 adapter 的 `providerRetryPolicy`；省略则 registration 填默认 `normal` / `2` / 五码 | `ctx.llm` 私有 `adapters` map 的 provider 字符串（没有 `ctx.llm.route`） | `id: llm-deepseek` 始终 `registerAdapter(['deepseek-official'], …)`；`id: llm-pi-ai` 在 Settings 写出 profile 之前 **零** route |
| **Consumer** | `ReactLoopAgent.step`：失败时把 `preparedCall?.retryPolicy` 送进 waterfall，看到 `{ kind: 'retry' }` 就同 step 再 `prepareCall` | `ctx.agentLoop` / 每会话 `Agent` | host `id: agent-loop`（`agents: []`）。preset 面不消费本执行器 |

换执行器 = overlay / 去掉 `id: llm-retry`，或另挂一个 `agent/request-error` listener。换默认预算 = 改 adapter 的 `retryPolicy`（或让 `providerRetryPolicy` 返回非 `undefined`），**不要**往本行塞 Config。卸掉本行后，loop 的 inner `next` 仍返回 `undefined`，失败即终结。

## Sources

- packages/llm/llm-retry/src/index.ts
- packages/llm/llm-retry/src/history.ts
- packages/llm/llm-retry/src/types.ts
- packages/llm/llm-retry/src/invariant.ts
- packages/llm/llm-retry/src/brand.ts
- packages/llm/llm-retry/package.json
- packages/llm/llm-retry/tests/retry.spec.ts
- packages/llm/llm-retry/tests/loader-composition.spec.ts
- packages/llm/llm-retry/tests/persistence.spec.ts
- packages/llm/llm/src/retry-policy.ts
- packages/llm/llm/src/index.ts
- packages/llm/llm/src/error.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/src/dispatch.ts
- packages/core/session/src/surface.ts
- packages/bundle/base/cordis.patch.yml
- packages/llm/llm-pi-ai/src/adapter.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host 面 vs agent-preset 面。
- [`spine.turn-and-step`](../../spine/turn-and-step.md) — `followup` → step → `llm.stream`；失败默认不 retry，除非 waterfall 返回 `{ kind: 'retry' }`。
- [`spine.session-log`](../../spine/session-log.md) — `deriveMessages()` 只折叠三类 surface；`llm/retry*` 留在 append-only log。
- [`subsys.llm.service`](./service.md) — `ctx.llm` / `registerAdapter` / `prepareCall`；本页只消费 registration 上冻住的 `retryPolicy`。
- [`subsys.llm.deepseek`](./deepseek.md) — 默认路由 `deepseek-official`；`retryPolicy` 变了才 `replace` 该 route。
- [`subsys.llm.pi-ai`](./pi-ai.md) — base 始终挂、零 adapter route 直到 Settings；SDK `maxRetries: 0`。
- [`subsys.core.agent-loop`](../core/agent-loop.md) — `ReactLoopAgent.step` 的 `while` 与 `agent/request-error` inner `next`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — host insert 含 `id: llm-retry`；preset 不 remount。
