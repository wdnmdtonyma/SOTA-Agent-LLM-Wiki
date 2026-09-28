---
id: subsys.coding-agent.cache-warming
title: 提示缓存预热
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/cache-warmer.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/test/cache-warmer.test.ts
  - packages/coding-agent/test/settings-manager.test.ts
symbols:
  - CacheWarmer
  - CacheWarmingMode
  - CacheWarmingDecision
  - CacheWarmingDecisionEvent
  - emitCacheWarmingDecision
  - getCacheWarmingDelayMs
related:
  - spine.layered-architecture
  - ref.package-index
  - subsys.coding-agent.settings-manager
  - surface.extensions.events
  - ref.coding-agent.extension-events
  - subsys.coding-agent.extension-runner
  - subsys.ai.prompt-caching
  - subsys.coding-agent.agent-session
evidence: explicit
status: verified
updated: 6f7551516b
---

> `CacheWarmer` 用成本阈值决定是否在 TTL 到期前重放上一轮 provider 请求（`maxTokens: 1`），以保住 prompt cache；模式分 `off` / `streaming` / `idle`，extension 可通过 `cache_warming_decision` 覆盖单次决策。

## 能回答的问题

- `cacheWarming` 三个 mode 分别在什么时候发 refresh、什么时候停？
- idle 与 tool-run（streaming）阶段的 continuation 概率和安全窗口有何不同？
- `cache_warming_decision` 能改什么、谁赢、失败会怎样？
- `/session` 显示哪些 cache-warming 诊断字段？
- 哪些请求根本不会被预热（无 TTL、不可 replay、经济学不够）？

## 职责边界

`packages/coding-agent/src/core/cache-warmer.ts` 是产品层 prompt-cache warming 子系统：它根据当前 mode、模型 `promptCache` TTL、以及 `$0.05` 期望节省阈值调度一次 replay，把成功 usage 写成 `kind: "cache_warm"` 的 session entry，不把 refresh 文本写入 LLM context。[E: packages/coding-agent/src/core/cache-warmer.ts:162] [E: packages/coding-agent/src/core/cache-warmer.ts:20] [E: packages/coding-agent/src/core/cache-warmer.ts:342] [E: packages/coding-agent/src/core/cache-warmer.ts:343]

provider 如何给请求打 cache 标记属于 [subsys.ai.prompt-caching](../ai/prompt-caching.md)；本节点只覆盖 coding-agent 何时重放请求、如何计价、如何给 `/session` 和 extension 暴露决策。[I]

## 关键文件

- `packages/coding-agent/src/core/cache-warmer.ts`：`CacheWarmer`、`getCacheWarmingDelayMs`、`getPromptCacheTtlMs`、`isReplayable`、status/usage 格式化。
- `packages/coding-agent/src/core/settings-manager.ts`：`CACHE_WARMING_MODES` 与只读 global `cacheWarming`。
- `packages/coding-agent/src/core/sdk.ts`：每个 session request 上 `cacheWarmer.start()`，并把 `emitCacheWarmingDecision` 接到 runner。
- `packages/coding-agent/src/core/agent-session.ts`：`cacheWarmingStatus`、`setCacheWarmingMode()`、settled 时 `onAgentSettled()`。
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`：`/session` 诊断与 transcript 上的 cache-warm usage 行。

## 数据模型

`CacheWarmingMode` 是 `"off" | "streaming" | "idle"`，默认 `"streaming"`。[E: packages/coding-agent/src/core/settings-manager.ts:77] [E: packages/coding-agent/src/core/settings-manager.ts:957] getter 只读 `globalSettings.cacheWarming`，project `.pi/settings.json` 里的同名键被忽略。[E: packages/coding-agent/src/core/settings-manager.ts:955] [E: packages/coding-agent/src/core/settings-manager.ts:956] [E: packages/coding-agent/test/settings-manager.test.ts:398] [E: packages/coding-agent/test/settings-manager.test.ts:401]

`CacheWarmingDecision` 是 `/session` 看到的一次 warm/stop 输入：`phase` 为 `"streaming"`（发出该请求的 agent run 仍在）或 `"idle"`，外加 `warmCost`、`missCost`、`continuationProbability`、`expectedSavings`、`economicsAvailable`、`action`。[E: packages/coding-agent/src/core/cache-warmer.ts:91] [E: packages/coding-agent/src/core/cache-warmer.ts:93] [E: packages/coding-agent/src/core/cache-warmer.ts:105]

`CacheWarmingDecisionEvent` 是 extension 看到的子集：`type: "cache_warming_decision"` 加上 `warmCost` / `missCost` / `continuationProbability` / `action`。模型、idle、context size 在 `ExtensionContext` 上，不在 event 里。[E: packages/coding-agent/src/core/cache-warmer.ts:112] [E: packages/coding-agent/src/core/cache-warmer.ts:114] [E: packages/coding-agent/src/core/extensions/types.ts:1399] handler 可返回 `{ action?: "warm" | "stop" }`。[E: packages/coding-agent/src/core/cache-warmer.ts:117] [E: packages/coding-agent/src/core/cache-warmer.ts:119]

`CacheWarmingStatus` 的 `state` 是 `"inactive" | "scheduled" | "refreshing"`，可带 `reason`、`nextWarmAt`、`decision`、`extensionOverride`。[E: packages/coding-agent/src/core/cache-warmer.ts:122] [E: packages/coding-agent/src/core/cache-warmer.ts:124] [E: packages/coding-agent/src/core/cache-warmer.ts:131]

## 控制流

1. `SettingsManager.getCacheWarmingMode@settings-manager.ts:955` 只看 global settings；非法值回落到 `"streaming"`。[E: packages/coding-agent/src/core/settings-manager.ts:955] [E: packages/coding-agent/src/core/settings-manager.ts:957] [E: packages/coding-agent/test/settings-manager.test.ts:407]
2. `createAgentSession@sdk.ts:305` 构造 `CacheWarmer(modelRuntime, sessionManager, getMode, decide)`；`decide` 把 event 交给 `extensionRunnerRef.current?.emitCacheWarmingDecision`，没有 runner 时用 event 自带的 `action`。[E: packages/coding-agent/src/core/sdk.ts:305] [E: packages/coding-agent/src/core/sdk.ts:308] [E: packages/coding-agent/src/core/sdk.ts:309]
3. Agent `streamFn` 仅当 `options.sessionId === sessionManager.getSessionId()` 时 `cacheWarmer.start({ model, context, options }, isCurrent)`。compaction/summary 用自己的 routing id，不会替换当前 cache entry。[E: packages/coding-agent/src/core/sdk.ts:396] [E: packages/coding-agent/src/core/sdk.ts:397] `isCurrent` 比较 provider/id 以及“当前 messages 仍以请求时的 prefix 为前缀”，不靠对象 identity。[E: packages/coding-agent/src/core/sdk.ts:344] [E: packages/coding-agent/src/core/sdk.ts:347]
4. `CacheWarmer.start@cache-warmer.ts:205` 清掉上一次 run。`mode === "off"` 立刻 `stop("cache warming disabled")`。[E: packages/coding-agent/src/core/cache-warmer.ts:206] [E: packages/coding-agent/src/core/cache-warmer.ts:208] [E: packages/coding-agent/src/core/cache-warmer.ts:209] Anthropic budget-based thinking（`reasoning` 开且没有 `compat.forceAdaptiveThinking`）判定为不可安全 replay。[E: packages/coding-agent/src/core/cache-warmer.ts:212] [E: packages/coding-agent/src/core/cache-warmer.ts:56] [E: packages/coding-agent/src/core/cache-warmer.ts:57] 没有对应 retention 的 `promptCache` 秒数、或 `cacheRetention === "none"`、或 TTL ≤ 10s，都会 stop。[E: packages/coding-agent/src/core/cache-warmer.ts:216] [E: packages/coding-agent/src/core/cache-warmer.ts:29] [E: packages/coding-agent/src/core/cache-warmer.ts:30]
5. 通过门控后，run 的 `phase` 从 `"streaming"` 开始，delay 为 `min(ttl*0.9, ttl-10s)` 且至少 1ms，然后 `schedule()`。[E: packages/coding-agent/src/core/cache-warmer.ts:238] [E: packages/coding-agent/src/core/cache-warmer.ts:31] [E: packages/coding-agent/src/core/cache-warmer.ts:242]
6. `schedule@cache-warmer.ts:284` 设 `nextWarmAt` 和 `refreshDeadlineAt`（保留一半到期裕量给迟到 timer）。streaming 安全窗是 `startedAt + 1h`，idle 是 `startedAt + 30min`；超过则 stop。[E: packages/coding-agent/src/core/cache-warmer.ts:286] [E: packages/coding-agent/src/core/cache-warmer.ts:290] [E: packages/coding-agent/src/core/cache-warmer.ts:291] [E: packages/coding-agent/src/core/cache-warmer.ts:16] [E: packages/coding-agent/src/core/cache-warmer.ts:18]
7. Timer 到期进入 `refresh@cache-warmer.ts:300`。先 `validateRun` 和 `refreshDeadlineMissed`；过期则 `stop("cache refresh deadline missed")`，避免迟到 refresh 变成全价 cache write。[E: packages/coding-agent/src/core/cache-warmer.ts:302] [E: packages/coding-agent/src/core/cache-warmer.ts:303] [E: packages/coding-agent/src/core/cache-warmer.ts:358] [E: packages/coding-agent/src/core/cache-warmer.ts:359] [E: packages/coding-agent/test/cache-warmer.test.ts:197]
8. `evaluate@cache-warmer.ts:378` 用当前 branch 最近一条 assistant usage 的 `input+cacheRead+cacheWrite` 当 prompt size。`warmCost` = cache-read(prompt)+1 output token；`missCost` = 全价 cache-write 或 input 减去 cache-hit。streaming 的 `continuationProbability` 是 `1`，idle 是常量 `0.15`。[E: packages/coding-agent/src/core/cache-warmer.ts:380] [E: packages/coding-agent/src/core/cache-warmer.ts:66] [E: packages/coding-agent/src/core/cache-warmer.ts:386] [E: packages/coding-agent/src/core/cache-warmer.ts:388] [E: packages/coding-agent/src/core/cache-warmer.ts:26] `action` 在 `expectedSavings >= 0.05` 时为 `"warm"`，否则 `"stop"`。[E: packages/coding-agent/src/core/cache-warmer.ts:398] [E: packages/coding-agent/src/core/cache-warmer.ts:20]
9. `decide()` 发出 `cache_warming_decision`。runner 的 `emitCacheWarmingDecision@runner.ts:1020` 从 event 自带 action 起步，最后一个返回 `result.action` 的 handler 获胜；handler 抛错被 `emitError` 后继续，warmer 侧 `decide` throw 则回落到 pi 自己的 action。[E: packages/coding-agent/src/core/extensions/runner.ts:1020] [E: packages/coding-agent/src/core/extensions/runner.ts:1022] [E: packages/coding-agent/src/core/extensions/runner.ts:1028] [E: packages/coding-agent/src/core/cache-warmer.ts:315] [E: packages/coding-agent/test/cache-warmer.test.ts:364] extension 改写后再次检查 deadline，避免慢 handler 把过期 cache 当 warm。[E: packages/coding-agent/src/core/cache-warmer.ts:318] [E: packages/coding-agent/test/cache-warmer.test.ts:217]
10. `action === "stop"` 结束当前 run，reason 区分 `"stopped by extension"` / `"expected savings below threshold"` / `"cache economics unavailable"`。[E: packages/coding-agent/src/core/cache-warmer.ts:320] [E: packages/coding-agent/src/core/cache-warmer.ts:322] `"warm"` 则 `streamSimple(..., { maxTokens: 1, maxRetries: 0 })`；成功且非 error/aborted 时 `appendUsage("cache_warm", ...)`，extension override 带 note `"extension override"`。[E: packages/coding-agent/src/core/cache-warmer.ts:335] [E: packages/coding-agent/src/core/cache-warmer.ts:342] [E: packages/coding-agent/src/core/cache-warmer.ts:347] refresh 抛错被吞掉，不打扰 active agent run。[E: packages/coding-agent/src/core/cache-warmer.ts:351]
11. `AgentSession._emitAgentSettled@agent-session.ts:873` 先 `cacheWarmer.onAgentSettled()`。`streaming` mode 在此 `stop("agent run settled")`；`idle` mode 把 `phase` 改成 `"idle"` 并套用 30 分钟窗。[E: packages/coding-agent/src/core/agent-session.ts:874] [E: packages/coding-agent/src/core/cache-warmer.ts:245] [E: packages/coding-agent/src/core/cache-warmer.ts:248] [E: packages/coding-agent/src/core/cache-warmer.ts:252] [E: packages/coding-agent/test/cache-warmer.test.ts:282] `setCacheWarmingMode()` 写 global settings 后立刻 `onModeChanged()`。[E: packages/coding-agent/src/core/agent-session.ts:1216] [E: packages/coding-agent/src/core/agent-session.ts:1217] [E: packages/coding-agent/src/core/agent-session.ts:1218]

## `/session` 诊断

`/session` 固定打出 `Cache Warming` 块：`Mode` 来自 `getCacheWarmingMode()`，`Status` 来自 `formatCacheWarmingStatus(session.cacheWarmingStatus)`；没有 warmer 时显示 `Inactive (cache warming unavailable)`。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6452] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6475] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6486] 若 `decision.economicsAvailable`，再打印 cache miss penalty 和 refresh cost。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6488] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6489] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6481]

`formatCacheWarmingStatus` 把 scheduled 状态写成 `Decision in …` 或 `Decision now`，refreshing 写成 `Warming cache (…)`，停下来写成 `Stopped (…)`；extension override 会标在 details 里。[E: packages/coding-agent/src/core/cache-warmer.ts:433] [E: packages/coding-agent/src/core/cache-warmer.ts:440] [E: packages/coding-agent/src/core/cache-warmer.ts:444] [E: packages/coding-agent/test/cache-warmer.test.ts:320] 成功的 usage 行是 `Cache warmed…: $…`，不进入 model context。[E: packages/coding-agent/src/core/cache-warmer.ts:449] [E: packages/coding-agent/src/core/cache-warmer.ts:452] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3320]

## 设计动机与权衡

- streaming 把 continuation 当成必然（概率 1），所以长 tool run 期间只要经济学过线就会续命；idle 用实测常量 0.15，并收紧到 30 分钟，因为停下来越久越不准。[E: packages/coding-agent/src/core/cache-warmer.ts:388] [E: packages/coding-agent/src/core/cache-warmer.ts:18] [I]
- 迟到 timer 宁可不发：半窗 deadline 之后的 refresh 更可能是全价 write，不是 cache warm。[E: packages/coding-agent/src/core/cache-warmer.ts:290] [E: packages/coding-agent/src/core/cache-warmer.ts:358] [I]
- `cacheWarming` 只允许 global，因为每次 refresh 都花钱。[E: packages/coding-agent/src/core/settings-manager.ts:157] [E: packages/coding-agent/src/core/settings-manager.ts:955]

## Gotcha

- Anthropic 非 adaptive thinking 的 replay 会改 `budget_tokens`，Anthropic 用它当 message cache key，所以直接判定不可 replay。[E: packages/coding-agent/src/core/cache-warmer.ts:55] [E: packages/coding-agent/src/core/cache-warmer.ts:56] [E: packages/coding-agent/src/core/cache-warmer.ts:57]
- prompt tokens 为 0 或价格全 0 时 `economicsAvailable` 为 false，status 显示 `cache economics unavailable`，不会发 refresh。[E: packages/coding-agent/src/core/cache-warmer.ts:389] [E: packages/coding-agent/src/core/cache-warmer.ts:193] [E: packages/coding-agent/test/cache-warmer.test.ts:248]
- `start()` 替换任何上一次 run 并 abort 其 in-flight refresh；失败的 refresh 不 `appendUsage`。[E: packages/coding-agent/src/core/cache-warmer.ts:206] [E: packages/coding-agent/src/core/cache-warmer.ts:276] [E: packages/coding-agent/test/cache-warmer.test.ts:306]

## 跨包边界

[subsys.ai.prompt-caching](../ai/prompt-caching.md) 解释 provider 如何把 `cacheRetention` 变成 Anthropic `cache_control` 或 OpenAI cache key；本节点消费 `Model.promptCache` 秒数和 `calculateCost`，不改 wire body。[I]

[surface.extensions.events](../../surface/extensions/events.md) / [ref.coding-agent.extension-events](../../reference/extension-events.md) 把 `cache_warming_decision` 放进 40 个 `pi.on()` 事件；本节点写决策经济学和 runner 的 last-action-wins。[I]

[subsys.coding-agent.extension-runner](extension-runner.md) 实现 `emitCacheWarmingDecision()`；[subsys.coding-agent.agent-session](agent-session.md) 在 settled / mode change 时驱动 warmer。[I]

## Sources

- packages/coding-agent/src/core/cache-warmer.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/test/cache-warmer.test.ts
- packages/coding-agent/test/settings-manager.test.ts

## 相关

- [spine.layered-architecture](../../spine/layered-architecture.md): coding-agent 产品层如何叠在 agent / ai 之上。
- [ref.package-index](../../reference/package-index.md): `@earendil-works/pi-coding-agent` 包边界。
- [subsys.coding-agent.settings-manager](settings-manager.md): global `cacheWarming` 读写。
- [surface.extensions.events](../../surface/extensions/events.md): `cache_warming_decision` 在 hook 面中的位置。
- [ref.coding-agent.extension-events](../../reference/extension-events.md): 该事件的 catalog 行。
- [subsys.coding-agent.extension-runner](extension-runner.md): last-override 分发。
- [subsys.ai.prompt-caching](../ai/prompt-caching.md): provider 侧 cache 标记。
- [subsys.coding-agent.agent-session](agent-session.md): session 级 status 与 settled 回调。
