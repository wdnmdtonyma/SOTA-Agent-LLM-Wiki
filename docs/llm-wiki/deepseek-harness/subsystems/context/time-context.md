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
  - packages/context/time-context/package.json
  - examples/web-schedule/cordis.yml
  - examples/headless-agent/tests/fixtures/time-context.cordis.yml
  - apps/cli/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/runtime-context.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/context/agent-instructions/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - time-context
  - apply
  - refreshIntervalMs
  - timeZone
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
updated: 47f943859b
---

> `@deepseek-ai/dsh-time-context` 是 **opt-in 的 function plugin**：没有 `ctx.timeContext`。它挂 `agent/pre-step`，在内层 `next()` 给出 `enter` 之后，往决策 `messages` 末尾再塞一条 `user/message`（`source.kind === 'plugin'`、`plugin: 'time-context'`），文案是当前墙钟、本请求浏览器时区政策、以及距上一条 baseline 的 elapsed。**默认产品路径不会注入时间。** `dsh-base` / `dsh-web-app` / `dsh-headless` / 四个 shipped preset 都没有 `id: time-context`；仓库里只在 examples overlay 出现。

## 能回答的问题

- `dsh web` / shipped preset 会不会给模型写当前时间？cli `package.json` 依赖本包等于装上了吗？
- `apply` 挂哪条 waterfall？不调用 `next()` 会怎样？谁真正 `append` 进 session？
- `timeZone` 与浏览器 `clientTimeZone` 谁赢？缺省、mixed、非法值各怎样？
- `refreshIntervalMs` 0 / 省略 / 正整数 / 非法值分别怎样？compaction `replace` 掉旧读数之后还会不会再注入？
- 文案为什么必须在 `step/start` 之后、`request/header` 之前进 log？这是 system section 吗？
- 这条 `user/message` 和 loop 的 `RuntimeContextProjection`、工作区 `agent-instructions` 差在哪？

## 职责边界

本包拥有：function-plugin 入口 `name` / `inject` / `apply` / `Config`（字段 `timeZone`、`refreshIntervalMs`）、请求区 `deriveBrowserTimeZoneContext`、ISO-shaped `formatTimestamp`、以及独立 companion `@deepseek-ai/dsh-time-context/invariant`。插件名是字面量 `'time-context'`。 [E: packages/context/time-context/src/index.ts:21] `inject = ['agents']`：`AgentRegistry` 未就绪则 Loader 让本行 pending。 [E: packages/context/time-context/src/index.ts:24] 测试钉死 namespace 导出（没有 `default`，`inject` 不会被 unwrap 丢掉）。 [E: packages/context/time-context/tests/time-context.spec.ts:483] [E: packages/context/time-context/tests/time-context.spec.ts:488]

本包**不**拥有：

- 进程级服务键。`apply(ctx, config)` 只 `ctx.on('agent/pre-step', …)`，从不 `provide`，因此没有 `ctx.timeContext`。 [E: packages/context/time-context/src/index.ts:170]
- shipped 组合树。默认安装是本地 Web GUI（`dsh web`），不是 TUI；本仓没有 shipped TUI 包。`dsh-base` / `dsh-web-app` / `dsh-headless` / `minimal` / `standard` / `code` / `cordis` **都没有** `id: time-context`。[I]
- turn / step 驱动、inbox claim、以及把 `enter.messages` 写成 `user/message` 的那一拍 —— [`subsys.core.agent-loop`](../core/agent-loop.md) 的 `ReactLoopAgent`。本包只改 waterfall 返回值，**不**调用 `agent.inject`（测试 stub 对 `inject` 直接抛）。 [E: packages/context/time-context/tests/time-context.spec.ts:49]
- runtime-context snapshot。那是 loop 的 `RuntimeContextProjection`，`source.plugin === '@deepseek-ai/dsh-system-prompt'`；清空句是 `Current runtime context: none.`，有内容时前缀是 `Current runtime context. This snapshot supersedes…`。本包的 `plugin` 是短名 `'time-context'`。 [E: packages/core/agent-loop/src/runtime-context.ts:12] [E: packages/core/agent-loop/src/runtime-context.ts:13] [E: packages/core/system-prompt/src/index.ts:239]
- 工作区 `AGENTS.md` / `CLAUDE.md` 指令 —— [`subsys.context.agent-instructions`](./agent-instructions.md)。那条 `user/message` 的 `source.kind === 'agent-instructions'`，不是本插件。 [E: packages/context/agent-instructions/src/index.ts:215]
- 谁把 `clientTimeZone` 写进 user-rpc（Web 宿主等）。本包只从已经进 turn 的 user-rpc `source` 推导。
- `Session` / `deriveMessages()` / `SurfaceOp` 合同 —— [`spine.session-log`](../../spine/session-log.md)。本包产出的是普通 `append` surface。

**host 面 vs agent-preset 面。** 仓库里的装配是 **host overlay**（`--patch` / examples `cordis.yml`），不是 preset `isolate` remount。`apply` 不 `provide`，`leakedServices` 扫不到本包。四个 shipped preset 没有本行，因此也没有 `isolate: { … time-context … }`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/context/time-context/src/index.ts` | function plugin：`name` / `inject` / `Config` / `apply`；`agent/pre-step` prepend |
| `packages/context/time-context/src/request-zone.ts` | 从本 turn user-rpc 推导 `resolved` / `mixed` / `missing` 并渲染政策行 |
| `packages/context/time-context/src/timestamp.ts` | `en-US` + `longOffset` 的 ISO-shaped 时间戳 |
| `packages/context/time-context/src/invariant.ts` | companion：open turn + `step/start` 之后 + `request/header` 之前；文案 / source 形状 |
| `packages/context/time-context/tests/time-context.spec.ts` | 文案、interval、时区、fiber dispose、真实 loop、Loader unwrap |
| `packages/context/time-context/tests/request-zone.spec.ts` | user-rpc only、canonical 校验、三档政策 |
| `packages/context/time-context/tests/invariant.spec.ts` | 位置窗、baseline、snapshot source、late register |
| `packages/context/time-context/tests/time-context.e2e.ts` | 真实 headless Loader + `time-context.cordis.yml` |
| `examples/web-schedule/cordis.yml` | 仓库里面向 Web 的 overlay：`insert` `id: time-context` |
| `examples/headless-agent/tests/fixtures/time-context.cordis.yml` | 测试专用 composition：同样 opt-in 挂本包 |
| `packages/bundle/base/cordis.patch.yml` | shipped host 真树：**没有**本行（用「文件中不存在 id」作 [I]） |

## 数据模型

没有独立事件 type，也没有 fold 表。模型看见的是一条普通 `user/message`。

| 符号 | 要点 |
|---|---|
| `name` | `'time-context'`。Loader 诊断名，也是 `source.plugin` 与 snapshot `sections[0].name`。 [E: packages/context/time-context/src/index.ts:21] |
| `inject` | `['agents']`。 [E: packages/context/time-context/src/index.ts:24] |
| `Config.timeZone` | 可选。缺省 = 插件 **load 时** `Intl` 解析出的进程区，之后改 `TZ` 也不换。 [E: packages/context/time-context/src/index.ts:158] |
| `Config.refreshIntervalMs` | 可选。省略或 `0` = 每个合格 step 都注入；`> 0` = 同一 session 内距上一次本插件读数不足该毫秒则跳过。非法值 **load 失败**。 [E: packages/context/time-context/src/index.ts:177] [E: packages/context/time-context/src/index.ts:134] |
| `source` | `{ kind: 'plugin', plugin: 'time-context', form: 'snapshot', sections: [{ name: 'time-context', text }] }`。`text` 必须等于模型读到的那一块。 [E: packages/context/time-context/src/index.ts:204] |
| `BrowserTimeZoneContext` | `resolved`（唯一 canonical 区）/ `mixed`（去重排序后多个）/ `missing`。 [E: packages/context/time-context/src/request-zone.ts:10] [E: packages/context/time-context/src/request-zone.ts:11] [E: packages/context/time-context/src/request-zone.ts:12] |
| `time-context-invariant` | 独立插件。`inject = ['invariants']`，`ctx.invariants.register('@deepseek-ai/dsh-time-context', install)`。 [E: packages/context/time-context/src/invariant.ts:23] [E: packages/context/time-context/src/invariant.ts:25] [E: packages/context/time-context/src/invariant.ts:193] |

文案三行，形状被 companion 的 `READING` 钉死： [E: packages/context/time-context/src/index.ts:122] [E: packages/context/time-context/src/invariant.ts:15]

1. `Time sampled while preparing turn T, step S: YYYY-MM-DDTHH:mm:ss±HH:mm[Zone]`
2. 浏览器时区政策（`resolved` / `mixed` / `unavailable`）
3. `Elapsed since the preceding model-visible message|step context: <duration|unavailable>.`

`step === 1` 的 baseline 固定是 `model-visible message`；后续 step 是 `step context`。 [E: packages/context/time-context/src/index.ts:120]

## 控制流

1. **组合真树：opt-in overlay，不是 shipped 行。** `@deepseek-ai/dsh` launcher 把本包放进 `dependencies`，所以 `--patch` 能解析 `@deepseek-ai/dsh-time-context`；这不等于默认装进会话。 [E: apps/cli/package.json:53] 仓库里面向产品面的 overlay 是 `examples/web-schedule/cordis.yml`：host 面 `insert` `id: time-context` / `name: '@deepseek-ai/dsh-time-context'`，无 `config`（走缺省）。 [E: examples/web-schedule/cordis.yml:5] [E: examples/web-schedule/cordis.yml:6] 测试专用树是 `examples/headless-agent/tests/fixtures/time-context.cordis.yml` 同一对 id / name。 [E: examples/headless-agent/tests/fixtures/time-context.cordis.yml:12] [E: examples/headless-agent/tests/fixtures/time-context.cordis.yml:13] `dsh-base` / `dsh-web-app` / `dsh-headless` / 四个 shipped `agent.cordis.yml` **都没有** `id: time-context`。[I] 把「`dsh web` 默认会注入当前时间」写成产品行为，整页作废。

2. **`apply@packages/context/time-context/src/index.ts` 是 function plugin，不占服务键。** load 时先 `validateRefreshInterval`：给出的 `refreshIntervalMs` 必须是非负安全整数，否则 `TypeError`。 [E: packages/context/time-context/src/index.ts:148] [E: packages/context/time-context/src/index.ts:130] [E: packages/context/time-context/src/index.ts:133] 再 `createTimestampFormatter(config.timeZone)`：显式非法 IANA 抛 `invalid IANA timeZone`；省略 `timeZone` 却解析不了进程区则抛 `failed to resolve the system time zone`。 [E: packages/context/time-context/src/index.ts:151] [E: packages/context/time-context/src/index.ts:155] 测试：`-1` / `0.5` / 超过 `MAX_SAFE_INTEGER` / `Infinity` / `NaN` 一律 load 失败；`Not/A_Real_Zone` 同样。 [E: packages/context/time-context/tests/time-context.spec.ts:392] [E: packages/context/time-context/tests/time-context.spec.ts:378] 成功后把 `fallbackFormatter.resolvedOptions().timeZone` 钉成 fallback；之后改 `process.env.TZ` 不影响已 load 的实例。 [E: packages/context/time-context/src/index.ts:158] [E: packages/context/time-context/tests/time-context.spec.ts:371]

3. **挂 `agent/pre-step`，`{ prepend: true }`，必须先 `next()`。** listener 签名吃 `{ agent, turn, step, signal }` 和 waterfall `next`。 [E: packages/context/time-context/src/index.ts:170] [E: packages/context/time-context/src/index.ts:174] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：不调用传入的 `next()` 就不会 `cbs.shift()`，内层 listener 与 `ReactLoopAgent.preStep` 默认 `{ kind: 'enter', messages: claimed 或 claimed+runtime-context }` 都被 veto，本步不会 `step/start`。 [E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:238] [E: packages/core/agent-loop/src/agent.ts:237] [E: packages/core/agent-loop/src/agent.ts:238] `agentEvents.waterfall` 把这条语义接到 agent-scoped carrier。 [E: packages/core/agent/src/dispatch.ts:146] `prepend: true` 让本 listener 在外侧：先 `await next()` 拿到**内层已经改完**的决策，再决定要不要追加时钟读数。 [E: packages/context/time-context/src/index.ts:208]

4. **内层 `reject`、已 abort、或 refresh 窗口未到：原样交回，不造读数。** `decision.kind === 'reject'` 或 `signal.aborted` 立即 `return decision`。 [E: packages/context/time-context/src/index.ts:175] 真实 loop：下游 listener throw / `cancel` 之后，log 里 0 条 time-context、0 次模型请求、没有 `step/start`。 [E: packages/context/time-context/tests/time-context.spec.ts:429] [E: packages/context/time-context/tests/time-context.spec.ts:431] 已 abort 的第二次 `pre-step` 也不会再追加。 [E: packages/context/time-context/tests/time-context.spec.ts:357] 仅当 `refreshIntervalMs !== undefined && refreshIntervalMs > 0` 才看间隔：`latestInjectionTime` 从 **整本** `session.events` 倒着找上一条 `source.plugin === 'time-context'`（被 `surfaceOp: replace` 从 surface 摘掉的旧读数也算）；`now >= lastInjection && now - lastInjection < refreshIntervalMs` 则跳过。 [E: packages/context/time-context/src/index.ts:88] [E: packages/context/time-context/src/index.ts:91] [E: packages/context/time-context/src/index.ts:177] [E: packages/context/time-context/src/index.ts:181] 墙钟回拨使 `now < lastInjection` 时不等式不成立，**仍会注入**；elapsed 被 `Math.max(0, …)` 夹成 `0s`。 [E: packages/context/time-context/src/index.ts:42] [E: packages/context/time-context/tests/time-context.spec.ts:283] 间隔按 session 计，不跨 session 共享：阈值内本 session 被跳过，隔壁 session 仍写入。 [E: packages/context/time-context/tests/time-context.spec.ts:341] [E: packages/context/time-context/tests/time-context.spec.ts:343]

5. **选区：本 turn 的 user-rpc 唯一区赢，否则 fallback。** `requestMessages` = 本 `turn/start` 之后已经入 log 的 `user/message` **加上** 内层决策里尚未 append 的 `decision.messages`。 [E: packages/context/time-context/src/index.ts:100] [E: packages/context/time-context/src/index.ts:107] [E: packages/context/time-context/src/index.ts:186] `browserTimeZone` 只认 `source.kind === 'user'` 且同时带字符串 `rpcId` 与 `clientTimeZone` 的消息；plugin / 普通 user source 都不贡献区。 [E: packages/context/time-context/src/request-zone.ts:17] [E: packages/context/time-context/src/request-zone.ts:18] [E: packages/context/time-context/src/request-zone.ts:21] 值必须是字面 `'UTC'` 或 `Area/Location` IANA，且 `Intl.resolvedOptions().timeZone` 必须等于原值（`Etc/UTC` 这种非 canonical 直接 `TypeError`）。 [E: packages/context/time-context/src/request-zone.ts:25] [E: packages/context/time-context/src/request-zone.ts:37] 去重排序后：0 个 → `missing`；1 个 → `resolved`；多个 → `mixed`。 [E: packages/context/time-context/src/request-zone.ts:56] [E: packages/context/time-context/src/request-zone.ts:57] [E: packages/context/time-context/src/request-zone.ts:58] `resolved` 用浏览器区格式化时间戳；`mixed` / `missing` 用 load 时的 fallback 区，并命令模型去问用户。 [E: packages/context/time-context/src/index.ts:188] [E: packages/context/time-context/src/request-zone.ts:69] [E: packages/context/time-context/src/request-zone.ts:70] [E: packages/context/time-context/src/request-zone.ts:73] [E: packages/context/time-context/src/request-zone.ts:75] [E: packages/context/time-context/src/request-zone.ts:76] 时间戳本身是 `formatTimestamp`：`YYYY-MM-DDTHH:mm:ss` + 数值 offset + `[IANA]`。 [E: packages/context/time-context/src/timestamp.ts:36]

6. **elapsed baseline 只看已经入 log 的事件，不看还在决策里的 claimed 批次。** `step === 1` 调 `precedingMessageTime`：倒着找最近一条 `user/message` / `assistant/message` / `tool/result` 的 `event.time`。 [E: packages/context/time-context/src/index.ts:61] `step > 1` 调 `precedingStepContextTime`：倒着找本 turn 内上一条 `plugin === 'time-context'`，碰到本 `turn/start` 就停。 [E: packages/context/time-context/src/index.ts:76] 找不到则文案写 `unavailable`。 [E: packages/context/time-context/src/index.ts:119] 默认 loop 在 `pre-step` **之后**才 `append` claimed 用户消息，所以新鲜 turn 的 step 1 对「刚 claim 的那条 user」通常是 `unavailable`；下一 turn 的 step 1 才能看到上一 turn 已经落地的 surface。真实 loop 测试把第一枪钉成 `unavailable`。 [E: packages/context/time-context/tests/time-context.spec.ts:468]

7. **本包只改 `PreStepDecision`，真正写入 session 的是 loop。** 合格路径返回 `{ kind: 'enter', messages: [...decision.messages, createUserMessage(…)] }`。 [E: packages/context/time-context/src/index.ts:199] `ReactLoopAgent.turn` 在 waterfall 返回 `enter` 且本步会花钱之后：先 `session.append('step/start', { turn, step })`，再对 `decision.messages` 逐条 `append('user/message', …, { surfaceOp: 'append' })`。 [E: packages/core/agent-loop/src/agent.ts:279] [E: packages/core/agent-loop/src/agent.ts:283] `buildRequest` 更晚才 `append('request/header', …)`。 [E: packages/core/agent-loop/src/agent.ts:466] companion 把这个窗钉死：读数必须在 open turn 内、已经有 `step/start`、且尚未 `request/header`；否则 `fail('… inside an open turn' / '… follow step/start' / '… precede request/header')`。 [E: packages/context/time-context/src/invariant.ts:64] [E: packages/context/time-context/src/invariant.ts:65] [E: packages/context/time-context/src/invariant.ts:66] 位置测试覆盖 turn 已 `end`、只有 `turn/start`、空 session、以及 header 已写出。 [E: packages/context/time-context/tests/invariant.spec.ts:236] [E: packages/context/time-context/tests/invariant.spec.ts:246] [E: packages/context/time-context/tests/invariant.spec.ts:249] [E: packages/context/time-context/tests/invariant.spec.ts:255]

8. **进模型历史，不进 `system` / `request/header`。** `deriveMessages()` 投影这条 `user/message`；`request.system` 与所有 `request/header` 事件的 JSON 都不含 `Time sampled while preparing`。 [E: packages/context/time-context/tests/time-context.spec.ts:474] [E: packages/context/time-context/tests/time-context.spec.ts:476] 多 step 会**累积**：第二枪的 messages 同时带 step 1 与 step 2 的读数。 [E: packages/context/time-context/tests/time-context.spec.ts:470] [E: packages/context/time-context/tests/time-context.spec.ts:471] headless Loader e2e 用进程区 `Asia/Shanghai`、每个 request 一条、且 `seq` 大于对应 `step/start`。 [E: packages/context/time-context/tests/time-context.e2e.ts:54] [E: packages/context/time-context/tests/time-context.e2e.ts:57] [E: packages/context/time-context/tests/time-context.e2e.ts:73] `request/header` JSON 不含 `Time sampled while preparing`。 [E: packages/context/time-context/tests/time-context.e2e.ts:82]

9. **compaction `replace` 摘掉 surface，但 refresh 仍看见旧读数。** 测试把 user + time-context 闭区间 `replace` 成 compaction 摘要后，`deriveMessages()` 不再含 `Time sampled while preparing`；resume 后在阈值内的下一 turn 被跳过，恰好满 `refreshIntervalMs` 才再写。新 turn 的 step 2 回看本 turn 没有 time-context，elapsed 又是 `unavailable`。 [E: packages/context/time-context/tests/time-context.spec.ts:298] [E: packages/context/time-context/tests/time-context.spec.ts:302] [E: packages/context/time-context/tests/time-context.spec.ts:320] `SurfaceOp` 没有 delete：旧事件仍在 append-only log 里，只是不进模型历史。

10. **isolate / 生命周期。** 本包不提供可泄漏的服务，preset 也没有本行。`ctx.on` 挂在插件 fiber 上：`fiber.dispose()` 之后再打 `pre-step`，不再追加读数。 [E: packages/context/time-context/tests/time-context.spec.ts:405] companion **不是**主入口的副作用。examples overlay 只 insert `@deepseek-ai/dsh-time-context`，不 insert `@deepseek-ai/dsh-time-context/invariant`；要跑运行时校验必须另挂 `time-context-invariant`（测试自己 `ctx.plugin(TimeInvariant)`）。 [E: packages/context/time-context/src/invariant.ts:193] [E: packages/context/time-context/tests/invariant.spec.ts:15]

## 设计动机

时钟如果写进稳定 `system`，每次过一秒都让 `request/header` 失效、也破坏 prompt cache。DSH 的合同是 **model-visible ⟺ logged**：动态事实必须变成带 `surfaceOp` 的 surface 事件。本包走 `user/message` + `source.kind === 'plugin'`，和 sandbox / approval 的 runtime-context snapshot 同一条「记入历史」的路，但 **plugin 名与文案前缀都不同**，不会被 `RuntimeContextProjection` 当成可替换的 runtime snapshot。

默认产品不装它：每个合格 step 一条读数会吃 token，而且多数 coding 会话并不依赖墙钟。cli 依赖只为 `--patch` 解析包名，跟 schedule 同一类 opt-in。Web overlay 把它和 `schedule` 放在同一份 examples `cordis.yml` 里，是因为提醒文案常带「今天下午」这种未限定时区的话；Schedule 自己 **不** inject、也不读本包。

浏览器区从本 turn 的 user-rpc 推导，而不是信任进程 `TZ`：同一个 headless 进程可以服务多个客户端。多个区同时出现时故意 fallback + 让模型去问，避免偷偷用错区排日程。

## Gotcha

- **写成「默认 `dsh web` 会注入时间」整页作废。** shipped bundle / preset 没有本行。[I] cli `dependencies` 里有 `@deepseek-ai/dsh-time-context` 只表示 `--patch` 解析得到包，不是已挂。 [E: apps/cli/package.json:53]
- **不调用 `next()` = 否决整步。** 默认 enter、runtime-context 追加、其他内层 `pre-step` listener 都到不了。本包自己是先 `next()` 再装饰；漏掉 `next` 的是**别的** listener，或错误改写本包。 [E: vendor/cordis/src/events.ts:238]
- **`refreshIntervalMs` 没有静默回退。** 负数、小数、非安全整数在 `apply` 抛错，插件根本 load 不上。 [E: packages/context/time-context/tests/time-context.spec.ts:392]
- **step 1 的 elapsed 经常是 `unavailable`。** lookup 发生在 claimed 用户消息入 log **之前**。不要把 unit test 里 `openMessageTurn` 先 `append` 再 `fire` 的路径当成默认 loop。 [E: packages/context/time-context/tests/time-context.spec.ts:468]
- **`source.plugin` 是 `'time-context'`，不是 npm 包名。** runtime-context 用 `'@deepseek-ai/dsh-system-prompt'`。按包名过滤会漏掉本读数；按短名过滤会漏掉 runtime snapshot。 [E: packages/context/time-context/src/index.ts:204] [E: packages/core/agent-loop/src/runtime-context.ts:12]
- **compaction 之后模型看不见旧读数，refresh 仍算它。** `latestInjectionTime` 扫的是 `session.events`，不是 `surface.nodes`。 [E: packages/context/time-context/src/index.ts:88]
- **examples overlay 不自动装 invariant companion。** 主插件与 `/invariant` 是两个 Cordis 插件。
- **非法 / 非 canonical `clientTimeZone` 会在 `pre-step` 里抛。** 不是写成 `mixed` 再继续。`+08:00`、`Not/A_Real_Zone`、`Etc/UTC` 都失败。 [E: packages/context/time-context/tests/request-zone.spec.ts:39] [E: packages/context/time-context/tests/request-zone.spec.ts:43] [E: packages/context/time-context/tests/request-zone.spec.ts:46]
- **fiber dispose 卸 listener。** 热重载 / `--patch` 卸掉本行之后，旧 session 不会继续长出时钟消息。 [E: packages/context/time-context/tests/time-context.spec.ts:408]

## Seam 三角

| Seam | Definition | Provider | Consumer |
|---|---|---|---|
| `agent/pre-step` waterfall | `@deepseek-ai/dsh-agent` `Events`：`(payload, next) => PreStepDecision` [E: packages/core/agent/src/runtime-types.ts:231] | `ReactLoopAgent.preStep` 的 innermost `enter`（claimed ± runtime-context）[E: packages/core/agent-loop/src/agent.ts:237] | 本包 `apply`：`inject = ['agents']`，`prepend` listener 先 `next()` 再追加时钟 `UserMessage`。**没有** shipped bundle / preset 行；只在 examples overlay |
| `Config.timeZone` / `Config.refreshIntervalMs` | 同包 `Config` + schemastery `z.object` [E: packages/context/time-context/src/index.ts:35] | overlay 行的 `config:`（web-schedule / headless fixture **都不写**，走缺省） | `apply`：非法 interval / 非法或不可解析区在 load 失败；运行时用 fallback 区 + `latestInjectionTime` |
| 耐久读数形状 / 包所有权 | companion `READING` + `SOURCE_NAME === 'time-context'` + snapshot 四键 source [E: packages/context/time-context/src/invariant.ts:13] [E: packages/context/time-context/src/invariant.ts:116] | 主插件 `createUserMessage`；loop 以 `surfaceOp: 'append'` 提交 | `time-context-invariant`：`ctx.invariants.register('@deepseek-ai/dsh-time-context', …)`，挂 `session/created` 与 `internal/dispatch` 的 `session/event`。examples 默认不挂 |
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
- packages/context/time-context/package.json
- examples/web-schedule/cordis.yml
- examples/headless-agent/tests/fixtures/time-context.cordis.yml
- apps/cli/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/runtime-context.ts
- packages/core/agent/src/dispatch.ts
- packages/core/agent/src/runtime-types.ts
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
