---
id: subsys.context.time-context
title: 时间上下文
kind: subsystem
tier: T2
pkg: context
source:
  - packages/context/time-context/src/index.ts
  - packages/context/time-context/src/request-zone.ts
  - packages/context/time-context/src/timestamp.ts
  - packages/context/time-context/src/invariant.ts
  - packages/context/time-context/tests/time-context.spec.ts
  - packages/context/time-context/tests/request-zone.spec.ts
  - packages/context/time-context/tests/invariant.spec.ts
  - packages/context/time-context/tests/time-context.e2e.ts
  - packages/context/time-context/tests/fixtures/time-context.patch.yml
  - packages/context/time-context/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - apps/web/tests/fixtures/time-context-every-step.patch.yml
  - apps/cli/package.json
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/runtime-context.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/system-prompt/src/index.ts
  - packages/context/agent-instructions/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - time-context
  - apply
  - refreshIntervalMs
  - timeZone
  - timeContext
related:
  - spine.turn-and-step
  - spine.session-log
  - subsys.core.agent-loop
  - spine.overview
  - spine.context-and-compaction
  - subsys.core.system-prompt
  - subsys.context.agent-instructions
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh-time-context` 是 **function plugin**：没有 `ctx.timeContext` 服务键。它 `inject` `agents` 与 `sessionProjections`，挂 `agent/pre-step`，在内层 `next()` 给出 `enter` 之后，往决策 `messages` 末尾再塞一条 `user/message`（`source.kind === 'time-context'`），文案是当前墙钟、本请求浏览器时区政策、以及距上一条 baseline 的 elapsed。**默认产品路径不会注入时间。** `dsh-web-app` 在 host 面插了 `id: time-context`，但 **`disabled: true`**（与 `schedule` 同行）；`dsh-base` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app` 与四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）都没有启用行。要注入，必须 overlay 把该行 `disabled: false`（测试 fixture 就是这样做的）。

## 能回答的问题

- `dsh web` / `dsh --profile sdk|sdk-minimal|acp|headless` / shipped preset 会不会给模型写当前时间？cli `package.json` 依赖本包等于装上了吗？web-app 那一行默认开着吗？
- `apply` 挂哪条 waterfall？不调用 `next()` 会怎样？谁真正 `append` 进 session？
- `timeZone` 与浏览器 `clientTimeZone` 谁赢？缺省、mixed、非法值各怎样？
- `refreshIntervalMs` 省略 / 0 / 正整数 / 非法值分别怎样？compaction `replace` 掉旧读数之后还会不会再注入？
- 文案为什么必须在 `step/start` 之后、`request/header` 之前进 log？这是 system section 吗？
- 这条 `user/message` 和 loop 的 `RuntimeContextProjection`、工作区 `agent-instructions`、以及 `sessionProjections` 键 `timeContext` 差在哪？

## 职责边界

本包拥有：function-plugin 入口 `name` / `inject` / `apply` / `Config`（字段 `timeZone`、`refreshIntervalMs`）、投影键 `'timeContext'`、请求区 `deriveBrowserTimeZoneContext`、ISO-shaped `formatTimestamp`、以及独立 companion `@deepseek-ai/dsh-time-context/invariant`。插件名是字面量 `'time-context'`。 [E: packages/context/time-context/src/index.ts:31] `inject = ['agents', 'sessionProjections']`：`AgentRegistry` 或投影注册表未就绪则 Loader 让本行 pending。 [E: packages/context/time-context/src/index.ts:53]

本包**不**拥有：

- 进程级服务键。`apply(ctx, config)` 只 `register` 投影并 `ctx.on('agent/pre-step', …)`，从不 `provide`，因此没有 `ctx.timeContext`。 [E: packages/context/time-context/src/index.ts:157] [E: packages/context/time-context/src/index.ts:185]
- shipped 组合树的默认启用。五个 shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。web-app **有** `id: time-context` 但 `disabled: true`。四个 shipped preset 声明在 `packages/bundle/web-app/presets/*.patch.yml`，也没有本行。 [E: packages/bundle/web-app/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:123]
- turn / step 驱动、inbox claim、以及把 `enter.messages` 写成 `user/message` 的那一拍 —— [`subsys.core.agent-loop`](../core/agent-loop.md) 的 `ReactLoopAgent`。本包只改 waterfall 返回值。
- runtime-context snapshot。那是 loop 的 `RuntimeContextProjection`，`source.kind === 'runtime-context'`；清空句是 `Current runtime context: none.`。本包的 `kind` 是 `'time-context'`。 [E: packages/core/agent-loop/src/runtime-context.ts:15] [E: packages/core/agent-loop/src/runtime-context.ts:20]
- 工作区 `AGENTS.md` / `CLAUDE.md` 指令 —— [`subsys.context.agent-instructions`](./agent-instructions.md)。那条 `user/message` 的 `source.kind === 'agent-instructions'`，不是本插件。 [E: packages/context/agent-instructions/src/index.ts:218]
- 谁把 `clientTimeZone` 写进 user-rpc（Web 宿主等）。本包只从已经进 turn 的 user-rpc `source` 推导。
- `Session` / `deriveMessages()` / `SurfaceOp` 合同 —— [`spine.session-log`](../../spine/session-log.md)。本包产出的是普通 `append` surface。

**host 面 vs agent-preset 面。** 仓库里的装配是 **host overlay**（web-app 那行 + 测试 / `--patch`），不是 preset `isolate` remount。`apply` 不 `provide`，`leakedServices` 扫不到本包。四个 shipped preset 没有本行，因此也没有 `isolate: { … time-context … }`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/context/time-context/src/index.ts` | function plugin：`name` / `inject` / `Config` / `apply`；投影 `timeContext`；`agent/pre-step` prepend |
| `packages/context/time-context/src/request-zone.ts` | 从本 turn user-rpc 推导 `resolved` / `mixed` / `missing` 并渲染政策行 |
| `packages/context/time-context/src/timestamp.ts` | `en-US` + `longOffset` 的 ISO-shaped 时间戳 |
| `packages/context/time-context/src/invariant.ts` | companion：open turn + `step/start` 之后 + `request/header` 之前；文案 / source 形状 |
| `packages/context/time-context/tests/time-context.spec.ts` | 文案、interval、时区、fiber dispose、真实 loop、Loader unwrap、投影 fold |
| `packages/context/time-context/tests/request-zone.spec.ts` | user-rpc only、canonical 校验、三档政策 |
| `packages/context/time-context/tests/invariant.spec.ts` | 位置窗、baseline、snapshot source、late register |
| `packages/context/time-context/tests/time-context.e2e.ts` | 真实 Loader + 本包 `tests/fixtures/time-context.patch.yml` |
| `packages/bundle/web-app/cordis.patch.yml` | shipped host 行：`id: time-context`，**`disabled: true`** |
| `apps/web/tests/fixtures/time-context-every-step.patch.yml` | 测试 overlay：`disabled: false` + `refreshIntervalMs: 0` |
| `packages/context/time-context/tests/fixtures/time-context.patch.yml` | 测试专用 composition：opt-in 挂本包 |

## 数据模型

没有独立事件 type。模型看见的是一条普通 `user/message`。刷新与 elapsed **不再**倒扫 `session.events`，而是读折叠投影 `sessionProjections.stateOf(session, 'timeContext')`。

| 符号 | 要点 |
|---|---|
| `name` | `'time-context'`。Loader 诊断名，也是 `source.kind` 与 snapshot `sections[0].name`。 [E: packages/context/time-context/src/index.ts:31] |
| `inject` | `['agents', 'sessionProjections']`。 [E: packages/context/time-context/src/index.ts:53] |
| `Config.timeZone` | 可选。缺省 = 插件 **load 时** `Intl` 解析出的进程区，之后改 `TZ` 也不换。 [E: packages/context/time-context/src/index.ts:145] |
| `Config.refreshIntervalMs` | 可选。省略时 `apply` 填 **`600_000`（10 分钟）**；`0` = 每个合格 step 都注入；`> 0` = 同一 session 内距上一次本插件读数不足该毫秒则跳过。非法值 **load 失败**。 [E: packages/context/time-context/src/index.ts:60] [E: packages/context/time-context/src/index.ts:134] [E: packages/context/time-context/src/index.ts:118] |
| `source` | `{ kind: 'time-context', form: 'snapshot', sections: [{ name: 'time-context', text }] }`。`text` 必须等于模型读到的那一块。 [E: packages/context/time-context/src/index.ts:221] |
| `timeContext` 投影 | `key: 'timeContext'`，`stateVersion: 2`；字段 `lastMessageTime` / `lastInjectionTime` / `lastTurnInjectionTime`。 [E: packages/context/time-context/src/index.ts:158] [E: packages/context/time-context/src/index.ts:159] [E: packages/context/time-context/src/index.ts:161] |
| `BrowserTimeZoneContext` | `resolved`（唯一 canonical 区）/ `mixed`（去重排序后多个）/ `missing`。 [E: packages/context/time-context/src/request-zone.ts:10] [E: packages/context/time-context/src/request-zone.ts:11] [E: packages/context/time-context/src/request-zone.ts:12] |
| `time-context-invariant` | 独立插件。`inject = ['invariants']`，`ctx.invariants.register('@deepseek-ai/dsh-time-context', install)`。 [E: packages/context/time-context/src/invariant.ts:23] [E: packages/context/time-context/src/invariant.ts:25] [E: packages/context/time-context/src/invariant.ts:193] |

文案三行，形状被 companion 的 `READING` 钉死： [E: packages/context/time-context/src/index.ts:112] [E: packages/context/time-context/src/invariant.ts:14]

1. `Time sampled while preparing turn T, step S: YYYY-MM-DDTHH:mm:ss±HH:mm[Zone]`
2. 浏览器时区政策（`resolved` / `mixed` / `unavailable`）
3. `Elapsed since the preceding model-visible message|step context: <duration|unavailable>.`

`step === 1` 的 baseline 固定是 `model-visible message`；后续 step 是 `step context`。 [E: packages/context/time-context/src/index.ts:110]

## 控制流

1. **组合真树：web-app 挂了但默认关掉。** `@deepseek-ai/dsh` launcher 把本包放进 `dependencies`，所以 `--patch` 能解析 `@deepseek-ai/dsh-time-context`；这不等于默认装进会话。 [E: apps/cli/package.json:67] `dsh-web-app` insert `id: time-context` / `name: '@deepseek-ai/dsh-time-context'`，**`disabled: true`**（与 `schedule` 一起，给「今天下午」这类未限定时区的提醒文案用）。 [E: packages/bundle/web-app/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:123] 测试 overlay `apps/web/tests/fixtures/time-context-every-step.patch.yml` 把它 `disabled: false` 并写 `refreshIntervalMs: 0`。 [E: apps/web/tests/fixtures/time-context-every-step.patch.yml:2] [E: apps/web/tests/fixtures/time-context-every-step.patch.yml:4] 本包 fixture `tests/fixtures/time-context.patch.yml` 同样 opt-in insert。 [E: packages/context/time-context/tests/fixtures/time-context.patch.yml:26] 四个 shipped `presets/*.patch.yml` **没有** `id: time-context`。[I] 把「`dsh web` 默认会注入当前时间」写成产品行为，整页作废。

2. **`apply@packages/context/time-context/src/index.ts` 是 function plugin，不占服务键。** load 时 `refreshIntervalMs = config.refreshIntervalMs ?? 600_000`，再 `validateRefreshInterval`：必须是非负安全整数，否则 `TypeError`。 [E: packages/context/time-context/src/index.ts:134] [E: packages/context/time-context/src/index.ts:118] 再 `createTimestampFormatter(config.timeZone)`：显式非法 IANA 抛 `invalid IANA timeZone`；省略 `timeZone` 却解析不了进程区则抛 `failed to resolve the system time zone`。 [E: packages/context/time-context/src/index.ts:141] [E: packages/context/time-context/src/index.ts:142] 成功后把 `fallbackFormatter.resolvedOptions().timeZone` 钉成 fallback；之后改 `process.env.TZ` 不影响已 load 的实例。 [E: packages/context/time-context/src/index.ts:145]

3. **挂 `agent/pre-step`，`{ prepend: true }`，必须先 `next()`。** listener 签名吃 `{ agent, turn, step, signal }` 和 waterfall `next`。 [E: packages/context/time-context/src/index.ts:185] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：不调用传入的 `next()` 就不会 `cbs.shift()`，内层 listener 与 `ReactLoopAgent.preStep` 默认 `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }` 都被 veto，本步不会 `step/start`。 [E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:238] [E: packages/core/agent-loop/src/agent.ts:278] `prepend: true` 让本 listener 在外侧：先 `await next()` 拿到**内层已经改完**的决策，再决定要不要追加时钟读数。 [E: packages/context/time-context/src/index.ts:225]

4. **内层 `reject`、已 abort、或 refresh 窗口未到：原样交回，不造读数。** `decision.kind === 'reject'` 或 `signal.aborted` 立即 `return decision`。 [E: packages/context/time-context/src/index.ts:190] 仅当 `refreshIntervalMs > 0` 才看间隔：`lastInjection` 来自投影 `state.lastInjectionTime`（被 `surfaceOp: replace` 从 surface 摘掉的旧读数仍已 fold 进投影）；`now >= lastInjection && now - lastInjection < refreshIntervalMs` 则跳过。 [E: packages/context/time-context/src/index.ts:193] [E: packages/context/time-context/src/index.ts:194] [E: packages/context/time-context/src/index.ts:197] 墙钟回拨使 `now < lastInjection` 时不等式不成立，**仍会注入**；elapsed 被 `Math.max(0, …)` 夹成 `0s`。 [E: packages/context/time-context/src/index.ts:71]

5. **选区：本 turn 的 user-rpc 唯一区赢，否则 fallback。** `requestMessages` = 本 `turn/start` 之后已经入 log 的 `user/message` **加上** 内层决策里尚未 append 的 `decision.messages`。 [E: packages/context/time-context/src/index.ts:87] [E: packages/context/time-context/src/index.ts:203] `browserTimeZone` 只认 `source.kind === 'user'` 且同时带字符串 `rpcId` 与 `clientTimeZone` 的消息；plugin / 普通 user source 都不贡献区。 [E: packages/context/time-context/src/request-zone.ts:17] [E: packages/context/time-context/src/request-zone.ts:18] [E: packages/context/time-context/src/request-zone.ts:21] 值必须是字面 `'UTC'` 或 `Area/Location` IANA，且 `Intl.resolvedOptions().timeZone` 必须等于原值（`Etc/UTC` 这种非 canonical 直接 `TypeError`）。 [E: packages/context/time-context/src/request-zone.ts:25] [E: packages/context/time-context/src/request-zone.ts:36] 去重排序后：0 个 → `missing`；1 个 → `resolved`；多个 → `mixed`。 [E: packages/context/time-context/src/request-zone.ts:56] [E: packages/context/time-context/src/request-zone.ts:57] [E: packages/context/time-context/src/request-zone.ts:58] `resolved` 用浏览器区格式化时间戳；`mixed` / `missing` 用 load 时的 fallback 区，并命令模型去问用户。 [E: packages/context/time-context/src/index.ts:205] [E: packages/context/time-context/src/request-zone.ts:69] [E: packages/context/time-context/src/request-zone.ts:72] [E: packages/context/time-context/src/request-zone.ts:75] 时间戳本身是 `formatTimestamp`：`YYYY-MM-DDTHH:mm:ss` + 数值 offset + `[IANA]`。 [E: packages/context/time-context/src/timestamp.ts:36]

6. **elapsed baseline 读投影，不扫事件表。** `step === 1` 用 `state.lastMessageTime`（`user/message` / `assistant/message` / `tool/result` 的 `event.time`）。 [E: packages/context/time-context/src/index.ts:200] [E: packages/context/time-context/src/index.ts:178] `step > 1` 用 `state.lastTurnInjectionTime`（本插件写入的 `user/message`）；`turn/start` 与 `turn/end` 会把该字段清回 `null`。 [E: packages/context/time-context/src/index.ts:202] [E: packages/context/time-context/src/index.ts:163] 找不到则文案写 `unavailable`。 [E: packages/context/time-context/src/index.ts:109] 默认 loop 在 `pre-step` **之后**才 `append` claimed 用户消息，所以新鲜 turn 的 step 1 对「刚 claim 的那条 user」通常是 `unavailable`。

7. **本包只改 `PreStepDecision`，真正写入 session 的是 loop。** 合格路径返回 `{ …decision, messages: [...decision.messages, createUserMessage(…)] }`。 [E: packages/context/time-context/src/index.ts:215] `ReactLoopAgent` 在 waterfall 返回 `enter` 且本步会花钱之后：先 `session.append('step/start', { turn, step })`，再对 `decision.messages` 逐条 `append('user/message', …, { surfaceOp: 'append' })`。 [E: packages/core/agent-loop/src/agent.ts:404] `buildRequest` 更晚才 `append('request/header', …)`。 [E: packages/core/agent-loop/src/agent.ts:603] companion 把这个窗钉死：读数必须在 open turn 内、已经有 `step/start`、且尚未 `request/header`；否则 `fail('… inside an open turn' / '… follow step/start' / '… precede request/header')`。 [E: packages/context/time-context/src/invariant.ts:64] [E: packages/context/time-context/src/invariant.ts:65] [E: packages/context/time-context/src/invariant.ts:66]

8. **进模型历史，作为 `user/message`；不进 `system/message`，也不进 `request/header`。** `deriveMessages()` 投影这条 `user/message`。识别靠 `source.kind === 'time-context'`，不是 `kind: 'plugin'`。

9. **compaction `replace` 摘掉 surface，但 refresh 仍看见旧读数。** `SurfaceOp` 没有 delete：旧事件仍在 append-only log 里；投影 fold 已记下 `lastInjectionTime`。 [E: packages/context/time-context/src/index.ts:174]

10. **isolate / 生命周期。** 本包不提供可泄漏的服务，preset 也没有本行。`ctx.on` 挂在插件 fiber 上：`fiber.dispose()` 之后再打 `pre-step`，不再追加读数。companion **不是**主入口的副作用。web-app 只 insert `@deepseek-ai/dsh-time-context`，不 insert `@deepseek-ai/dsh-time-context/invariant`；要跑运行时校验必须另挂 `time-context-invariant`。 [E: packages/context/time-context/src/invariant.ts:193]

## 设计动机

时钟如果写进稳定 `system`，每次过一秒都让 `request/header` 失效、也破坏 prompt cache。DSH 的合同是 **model-visible ⟺ logged**：动态事实必须变成带 `surfaceOp` 的 surface 事件。本包走 `user/message` + first-class `source.kind === 'time-context'`，和 sandbox / approval 的 runtime-context snapshot 同一条「记入历史」的路，但 **kind 与文案前缀都不同**，不会被 `RuntimeContextProjection` 当成可替换的 runtime snapshot。

刷新与 elapsed 走 `sessionProjections` 而不是每次倒扫 log：compaction `replace` 不会抹掉 fold 过的 `lastInjectionTime`，resume 后仍能守住 `refreshIntervalMs`。

默认产品不启用它：每个合格 step 一条读数会吃 token，而且多数 coding 会话并不依赖墙钟。web-app 把它和 `schedule` 放在同一组 **disabled** host 行，是因为提醒文案常带「今天下午」这种未限定时区的话；Schedule 自己 **不** inject、也不读本包。省略 `refreshIntervalMs` 时默认 10 分钟，而不是每个 step。

浏览器区从本 turn 的 user-rpc 推导，而不是信任进程 `TZ`：同一个 headless / sdk / acp 进程可以服务多个客户端。多个区同时出现时故意 fallback + 让模型去问，避免偷偷用错区排日程。

## Gotcha

- **写成「默认 `dsh web` 会注入时间」整页作废。** web-app 有这一行，但 `disabled: true`。四个 shipped preset 没有本行。cli `dependencies` 里有 `@deepseek-ai/dsh-time-context` 只表示 `--patch` 解析得到包，不是已挂。 [E: packages/bundle/web-app/cordis.patch.yml:123] [E: apps/cli/package.json:67]
- **省略 `refreshIntervalMs` 不是每个 step。** `apply` 填 `600_000`。要每个合格 step 都写，必须显式 `0`（测试 fixture 就是这样）。 [E: packages/context/time-context/src/index.ts:134] [E: apps/web/tests/fixtures/time-context-every-step.patch.yml:4]
- **不调用 `next()` = 否决整步。** 默认 enter、runtime-context 追加、其他内层 `pre-step` listener 都到不了。本包自己是先 `next()` 再装饰。 [E: vendor/cordis/src/events.ts:238]
- **`refreshIntervalMs` 没有静默回退。** 负数、小数、非安全整数在 `apply` 抛错，插件根本 load 不上。 [E: packages/context/time-context/src/index.ts:118]
- **step 1 的 elapsed 经常是 `unavailable`。** lookup 发生在 claimed 用户消息入 log **之前**。不要把 unit test 里先 `append` 再 `fire` 的路径当成默认 loop。
- **`source.kind` 是 `'time-context'`，不是 `'plugin'`。** runtime-context 用 `'runtime-context'`。按包名或 `plugin:` 短名过滤会漏掉两边。 [E: packages/context/time-context/src/index.ts:221] [E: packages/core/agent-loop/src/runtime-context.ts:15]
- **compaction 之后模型看不见旧读数，refresh 仍算它。** `lastInjectionTime` 来自投影 fold，不是 `surface.nodes`。 [E: packages/context/time-context/src/index.ts:174]
- **web-app 行不自动装 invariant companion。** 主插件与 `/invariant` 是两个 Cordis 插件。
- **非法 / 非 canonical `clientTimeZone` 会在 `pre-step` 里抛。** 不是写成 `mixed` 再继续。`+08:00`、`Not/A_Real_Zone`、`Etc/UTC` 都失败。 [E: packages/context/time-context/src/request-zone.ts:25] [E: packages/context/time-context/src/request-zone.ts:36]
- **fiber dispose 卸 listener。** 热重载 / `--patch` 卸掉本行之后，旧 session 不会继续长出时钟消息。
- **`turn/start` 清掉本 turn 的 injection 指针。** 下一 turn 的 step 2 若本 turn 还没写入读数，elapsed 会是 `unavailable`，即使上一 turn 有过读数。 [E: packages/context/time-context/src/index.ts:163]

## Seam 三角

| Seam | Definition | Provider | Consumer |
|---|---|---|---|
| `agent/pre-step` waterfall | `@deepseek-ai/dsh-agent` `Events`：`(payload, next) => PreStepDecision` [E: packages/core/agent/src/runtime-types.ts:320] | `ReactLoopAgent.preStep` 的 innermost `enter`（claimed ± runtime-context）[E: packages/core/agent-loop/src/agent.ts:278] | 本包 `apply`：`inject = ['agents', 'sessionProjections']`，`prepend` listener 先 `next()` 再追加时钟 `UserMessage`。web-app 行默认 `disabled: true`；preset 不挂 |
| `Config.timeZone` / `Config.refreshIntervalMs` | 同包 `Config` + schemastery `z.object` [E: packages/context/time-context/src/index.ts:64] | overlay 行的 `config:`（web-app 出厂行不写 config；启用时省略 interval = 10 分钟） | `apply`：非法 interval / 非法或不可解析区在 load 失败；运行时用 fallback 区 + 投影 `lastInjectionTime` |
| 投影 `timeContext` | `sessionProjections.register({ key: 'timeContext', stateVersion: 2, … })` [E: packages/context/time-context/src/index.ts:157] | 本包 fold：turn 边界清 `lastTurnInjectionTime`；`kind: 'time-context'` 的 `user/message` 写 injection 指针 | `pre-step` 读 `stateOf(session, 'timeContext')` 决定跳过 / elapsed |
| 耐久读数形状 / 包所有权 | companion `READING` + `SOURCE_NAME === 'time-context'` + snapshot source [E: packages/context/time-context/src/invariant.ts:13] | 主插件 `createUserMessage`；loop 以 `surfaceOp: 'append'` 提交 | `time-context-invariant`：`ctx.invariants.register('@deepseek-ai/dsh-time-context', …)`。web-app 默认不挂 |
| 浏览器请求区 | `BrowserTimeZoneContext` 闭合联合 | 本 turn user-rpc `source.clientTimeZone`（宿主写入，本包只读） | `deriveBrowserTimeZoneContext` → 选 `selectedTimeZone` + 政策行；invariant 再对已提交读数重算一遍 |

换 loop 只要仍遵守「`pre-step` 返回的 messages 在 `step/start` 之后、`request/header` 之前 `append`」，companion 才能继续成立。换 persistence 不影响本包：它不 `flush`、不写自己的事件 type。

## Sources

- packages/context/time-context/src/index.ts
- packages/context/time-context/src/request-zone.ts
- packages/context/time-context/src/timestamp.ts
- packages/context/time-context/src/invariant.ts
- packages/context/time-context/tests/time-context.spec.ts
- packages/context/time-context/tests/request-zone.spec.ts
- packages/context/time-context/tests/invariant.spec.ts
- packages/context/time-context/tests/time-context.e2e.ts
- packages/context/time-context/tests/fixtures/time-context.patch.yml
- packages/context/time-context/package.json
- packages/bundle/web-app/cordis.patch.yml
- apps/web/tests/fixtures/time-context-every-step.patch.yml
- apps/cli/package.json
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/runtime-context.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/system-prompt/src/index.ts
- packages/context/agent-instructions/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.turn-and-step](../../spine/turn-and-step.md)（`spine.turn-and-step`）：claim → `pre-step` → `step/start` → `user/message` → `request/header` 的时序。
- [spine.session-log](../../spine/session-log.md)（`spine.session-log`）：`deriveMessages()` 只投影 surface；`replace` 不是 delete。
- [subsys.core.agent-loop](../core/agent-loop.md)（`subsys.core.agent-loop`）：默认 innermost `enter`、runtime-context 投影、真正 `append` 的那一拍。
- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`；host 面 vs agent-preset 面。
- [spine.context-and-compaction](../../spine/context-and-compaction.md)（`spine.context-and-compaction`）：system 装配 / snapshot / compaction 总图；本包是另一条 opt-in 的 `pre-step` 装饰。
- [subsys.core.system-prompt](../core/system-prompt.md)（`subsys.core.system-prompt`）：`ctx.systemPrompt` 与 runtime-context 段；时钟读数**不是** system section。
- [subsys.context.agent-instructions](./agent-instructions.md)（`subsys.context.agent-instructions`）：另一条 `pre-step` `user/message`，`source.kind === 'agent-instructions'`。
