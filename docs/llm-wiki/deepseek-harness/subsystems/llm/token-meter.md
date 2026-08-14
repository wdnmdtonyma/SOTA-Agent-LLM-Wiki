---
id: subsys.llm.token-meter
title: token-meter
kind: subsystem
tier: T2
pkg: llm
source:
  - packages/llm/token-meter/src/index.ts
  - packages/llm/token-meter/src/estimate.ts
  - packages/llm/token-meter/src/types.ts
  - packages/llm/token-meter/src/breakdown-projection.ts
  - packages/llm/token-meter/src/usage-projection.ts
  - packages/llm/token-meter/src/projection.ts
  - packages/llm/token-meter/src/surface-fold.ts
  - packages/llm/token-meter/src/surface-projection.ts
  - packages/llm/token-meter/tests/token-meter.spec.ts
  - packages/llm/token-meter/tests/token-usage-projection.spec.ts
  - packages/llm/token-meter/tests/context-breakdown-projection.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/compaction/compaction-basic/src/index.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/core/session/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
symbols:
  - ctx.tokenMeter
  - TokenMeter
  - measure
related:
  - spine.overview
  - spine.context-and-compaction
  - subsys.llm.service
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - spine.session-log
  - subsys.core.session
  - subsys.context.compaction
  - subsys.context.compaction-basic
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-token-meter` 是 **host 面**单例压力计量：`ctx.tokenMeter.measure(session, requestHeader?)` 从 append-only session log 重放当前 surface 与可选 provider `usage`，给出请求压力快照。它不挂 `llm/stream` / `agent/request`，不实现 tokenizer，不计费，也不拥有 compaction 策略。

## 能回答的问题

- `measure()` 在不在模型请求路径上？谁在何时拉一次计量？
- `TokenMeterConfig` 为什么必须是空对象？写 `contextWindow` 会怎样？
- 为什么 `tokenMeter` 必须留在 host 面、**不得**进入 preset `isolate` realm？
- 固定启发式 4 chars/token 怎么计价？有 provider `usage` 时何时才采用？
- `tokenUsage` / `contextPressure` / `contextBreakdown` 三套投影和 `measure()` 各自回答什么？
- `dsh-web-app` 为何 `disabled` compaction 行却留下 meter？

## 职责边界

本包拥有：进程级服务 `TokenMeter`（`ctx.tokenMeter`）、拉式 API `measure` / `estimateMessage`、固定密度启发式 `estimate.ts`、按 `Session` 隔离的 replay fold，以及在组合提供 `ctx.sessionProjections` 时登记的三套投影（`tokenUsage` / `contextPressure` / `contextBreakdown`）。

本包**不**拥有：

- `ctx.llm`、`registerAdapter`、`llm/stream` waterfall、HTTP / credentials —— [`subsys.llm.service`](./service.md)。
- compaction 何时压、压哪一段、`thresholdRatio` / `retainRatio` —— [`subsys.context.compaction`](../context/compaction.md) / [`subsys.context.compaction-basic`](../context/compaction-basic.md)。那条 Consumer 在 pressure / overflow / 选段时反复拉 `measure`。
- append-only `SessionEvent` 日志与 `deriveMessages()` —— [`subsys.core.session`](../core/session.md) / [`spine.session-log`](../../spine/session-log.md)。
- 默认产品组合树里「这一行插在哪」—— [`subsys.composition.bundle-base`](../composition/bundle-base.md)；Web 叠层谁 `disabled` —— [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)。
- tokenizer 实现、账单 / 价格表、`contextWindow` 容量。容量属于各 adapter 的 model info；compaction 用它算阈值。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。`ctx.tokenMeter` 是 **host 面**进程级单例，按 `Session` 分 fold，不是每会话一份服务。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/llm/token-meter/src/index.ts` | `TokenMeter` 服务；`measure`；空 Config；`session/event` 追赶；usage 锚 |
| `packages/llm/token-meter/src/estimate.ts` | 固定密度启发式：4 chars/token、`ROLE_OVERHEAD` / `BLOCK_OVERHEAD` |
| `packages/llm/token-meter/src/types.ts` | `TokenMeterConfig`、`TokenMeasurement`、`TokenMeasurementBaseline` |
| `packages/llm/token-meter/src/surface-fold.ts` | `measure()` 的按节点 surface fold（O(surface)） |
| `packages/llm/token-meter/src/surface-projection.ts` | 投影用的 O(1) shadow-price fold |
| `packages/llm/token-meter/src/usage-projection.ts` | `tokenUsage` / `contextPressure` 纯 fold |
| `packages/llm/token-meter/src/breakdown-projection.ts` | `contextBreakdown` 纯 fold |
| `packages/llm/token-meter/src/projection.ts` | 浏览器可进的三套投影类型 |
| `packages/llm/token-meter/tests/token-meter.spec.ts` | 空 Config、启发式、usage 锚、事务性 replay |
| `packages/llm/token-meter/tests/token-usage-projection.spec.ts` | 同 step 替换、reasoning 不双计 |
| `packages/llm/token-meter/tests/context-breakdown-projection.spec.ts` | `messageTokens` 与 `measure().surfaceTokens` 对齐 |
| `packages/bundle/base/cordis.patch.yml` | host 组合行 `id: token-meter` |
| `packages/bundle/base/package.json` | `dependencies` 含 `@deepseek-ai/dsh-token-meter` |
| `packages/bundle/web-app/cordis.patch.yml` | 只 disable compaction 后端，留下 meter |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | compaction `isolate` 只有 `compaction` / `toolResultPruner` |
| `apps/cli/config/agent-presets/code/agent.cordis.yml` | 同组 `isolate`，同样不含 `tokenMeter` |
| `apps/cli/config/agent-presets/cordis/agent.cordis.yml` | 同组 `isolate`，同样不含 `tokenMeter` |
| `apps/cli/tests/web-agent-presets.e2e.ts` | 挂 preset 之前 `ctx.get('tokenMeter')` 已在 |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 不得把 process-global 服务泄漏进 root |
| `packages/compaction/compaction-basic/src/index.ts` | Consumer：`inject = ['tokenMeter']`，压力路径调 `measure` |
| `packages/compaction/compaction-tool-result-pruner/src/index.ts` | Consumer：`estimateMessage` 写 shadow price |
| `packages/core/session/src/index.ts` | `session/event` 签名无 `next`，append 后 fire-and-forget |
| `vendor/cordis/src/events.ts` | waterfall 必须调用 `next()` 才会 `shift` |
| `vendor/cordis/src/service.ts` | `super(ctx, name)` 立刻 `provide` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `TokenMeterConfig` | `Record<string, never>`。公共类型排除一切设置。[E: packages/llm/token-meter/src/types.ts:12] |
| `TokenMeter.Config` | Schemastery `z.object({})`。未知键在构造里抛 `TokenMeterConfig: unknown key "…"`。[E: packages/llm/token-meter/src/index.ts:77] [E: packages/llm/token-meter/src/index.ts:63] |
| `TokenMeasurement` | 深冻快照：`logRevision`、`baseline`、`surfaceDeltaTokens`、`totalTokens`、`surfaceTokens`、`nodes`。`totalTokens = max(0, baseline.tokens + surfaceDeltaTokens)`。[E: packages/llm/token-meter/src/index.ts:143] |
| `TokenMeasurementBaseline` | `none`（空会话）/ `estimated`（整信封启发式）/ `usage`（provider 桶总和 + 原始 `TokenUsage`）。 |
| `TokenSurfaceNode` | `{ seq, tokens }`。`tokens` 是该 surface 节点投影消息的启发式价。 |
| `CHARS_PER_TOKEN` | 固定 `4`。另加每块 `BLOCK_OVERHEAD = 4`、每条消息 `ROLE_OVERHEAD = 4`。[E: packages/llm/token-meter/src/estimate.ts:13] [E: packages/llm/token-meter/src/estimate.ts:16] [E: packages/llm/token-meter/src/estimate.ts:19] |
| `tokenUsage` | 四只互斥桶：`uncachedInputTokens` / `outputTokens` / `cacheReadTokens` / `cacheWriteTokens`。`bucketsFrom` 不读 `reasoningTokens`；跨 step 累加测试钉死 reasoning 不双计。[E: packages/llm/token-meter/src/usage-projection.ts:31] [E: packages/llm/token-meter/tests/token-usage-projection.spec.ts:150] |
| `contextPressure` | last-wins：`pressureTokens`（prompt 侧，不含 output）、`projectedTokens`、`contextWindow`。不是一次原子请求观察。 |
| `contextBreakdown` | 启发式组成：`systemTokens` + `toolsTokens` + `messageTokens`。三列与 provider 锚的 `projectedTokens` **不可相加当总量**。 |

`usageTokens@index.ts` 把一次 provider 报告加成 `inputTokens + cacheRead + cacheWrite + outputTokens`，不加 `reasoningTokens`。[E: packages/llm/token-meter/src/index.ts:44]

## 控制流

1. **host 面插单例。** `dsh-base` 的根 `insert` 有 `id: token-meter` / `name: '@deepseek-ai/dsh-token-meter'`，依赖写在 base manifest。每个 profile 的第一层都带这一行。[E: packages/bundle/base/cordis.patch.yml:281] [E: packages/bundle/base/cordis.patch.yml:282] [E: packages/bundle/base/package.json:94]

2. **`TokenMeter` 立刻 `provide`。** 构造函数 `super(ctx, 'tokenMeter')` 走 Cordis `Service`：`ctx.reflect.provide('tokenMeter', this)`，fiber 卸载即撤。随后 `validateConfigKeys`：`Object.keys(config)` 任一键立刻抛错，没有默认值可吞掉拼写。[E: packages/llm/token-meter/src/index.ts:82] [E: vendor/cordis/src/service.ts:57] [E: packages/llm/token-meter/src/index.ts:62] [E: packages/llm/token-meter/tests/token-meter.spec.ts:111]

3. **不在请求路径上。** `TokenMeter` 构造只做两件事：可选 `ctx.inject(['sessionProjections'], …)` 登记三套投影，以及 `ctx.on('session/event', …)` 对**已经**建过 fold 的 session 做 eager `_sync`。没有 `llm/stream`、没有 `agent/request`、没有 `agent/pre-step`。`ReactLoopAgent` 发包走 [`subsys.llm.service`](./service.md) 的 `prepareCall` / `stream`，不调用 `measure`。[E: packages/llm/token-meter/src/index.ts:87] [E: packages/llm/token-meter/src/index.ts:95] [I]

4. **`session/event` 不是 waterfall。** 事件签名是 `(session, event) => void`，没有 `next` 参数。append 先 `log.push` 再 `invokeContainedSessionObservers`；listener 失败不能回滚已提交事件。`TokenMeter` 只在 `this.states.has(session)` 时追赶，避免给从未被读过的 session 建 fold。[E: packages/core/session/src/index.ts:76] [E: packages/core/session/src/index.ts:643] [E: packages/core/session/src/index.ts:646] [E: packages/llm/token-meter/src/index.ts:96]

5. **拉式计量：`measure@index.ts`。** 调用方传入 `Session` 与可选的有效信封 `requestHeader`。`_sync` 把私有 `ReplayState` 追到 `session.events` 尾；`logRevision` 等于已消费条数。`requestHeader` 只改请求压力（选哪条 baseline / 是否还能用 usage 锚）；返回的 `surfaceTokens` / `nodes` 永远是当前 surface。生产 Consumer 只传 `session`。[E: packages/llm/token-meter/src/index.ts:116] [E: packages/llm/token-meter/src/index.ts:118]

6. **按事件 fold。** `_foldEvent@index.ts` 先算出下一份 header / step 边界 / usage 锚，再决定是否写入。`request/header` 更新 canonical 信封；`step/start` 记下当时的 `surfaceTokens`；`step/end` 必须配对。surface 事件走 `foldSurfaceTokens@surface-fold.ts`：`append` 追加节点，`replace` 按当前 `nodes` 闭区间 splice。非法 range / 缺 `step/start` 在写入前抛错，同一畸形事件每次 `measure` 都同样失败。[E: packages/llm/token-meter/src/index.ts:194] [E: packages/llm/token-meter/src/surface-fold.ts:49] [E: packages/llm/token-meter/src/surface-fold.ts:63]

7. **启发式定价。** `estimateContent@estimate.ts` 对 `text` / `reasoning` 做 `ceil(length / 4) + 4`；`tool-call` 价 name+arguments；`tool-result` 递归；未知块 `JSON.stringify`。`estimateMessage` 再加 `ROLE_OVERHEAD`。测试钉死 `'abcd'` 文本消息 = 9。信封价是 `estimateSystemTokens + estimateToolsTokens`。[E: packages/llm/token-meter/src/estimate.ts:32] [E: packages/llm/token-meter/src/estimate.ts:57] [E: packages/llm/token-meter/tests/token-meter.spec.ts:145]

8. **usage 锚只在「不比全量启发式更小」时采用。** `assistant/message` 若带 `usage` 且已有 header：用 `sourceEventSeqs` 经 `BlockAssembler` 重装当时的 provider 输出，算出 `estimatedAnchorTokens = estimateHeader + stepStart.surfaceTokens + providerAssistantTokens`。仅当 `usageTokens(usage) >= estimatedAnchorTokens` 才把 baseline 写成 `{ kind: 'usage', tokens, usage }`；否则写 `estimated`。之后 surface 的 signed delta 加在这条锚上；`totalTokens` 下限为 0。[E: packages/llm/token-meter/src/index.ts:246] [E: packages/llm/token-meter/src/index.ts:247] [E: packages/llm/token-meter/tests/token-meter.spec.ts:279]

9. **web 留下；preset 不把 `tokenMeter` 放进 isolate。** `dsh-web-app` 把 host 上的 `compaction-basic` / `command-compact` / `tool-result-pruner` 标 `disabled: true`，**没有** disable `token-meter`。`standard` / `code` / `cordis` 的 compaction 组 `isolate` 都只有 `compaction: true` 与 `toolResultPruner: true`。Web e2e 在任何 preset mount 之前断言 `ctx.get('tokenMeter')` 已定义，并且 `minimal` 会话的投影表仍含三套 meter 单元。[E: packages/bundle/web-app/cordis.patch.yml:358] [E: packages/bundle/web-app/cordis.patch.yml:359] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:142] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:148] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:149] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:129] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:130] [E: apps/cli/tests/web-agent-presets.e2e.ts:170] [E: apps/cli/tests/web-agent-presets.e2e.ts:181]

10. **Consumer 在自己的 waterfall 里拉 meter。** `BasicCompactionEngine` `static inject = ['llm', 'tokenMeter', 'sessions']`；`compactIfNeeded` 在解析 routed target 之后调用 `meter.measure(agent.session)`。它挂在 `agent/pre-step` waterfall：先尝试 pressure compaction，**然后** `return next()`。不调用 `next()` 时 `Events.waterfall` 的 `next` 不会 `cbs.shift()`，turn 停在 pre-step，到不了 `prepareCall` / `stream`。`ToolResultPruner` 同样 `inject = ['tokenMeter']`，在 `compaction/prune` 里用 `estimateMessage` 写下 `shadowedTokenCount`。[E: packages/compaction/compaction-basic/src/index.ts:104] [E: packages/compaction/compaction-basic/src/index.ts:267] [E: packages/compaction/compaction-basic/src/index.ts:164] [E: vendor/cordis/src/events.ts:238] [E: packages/compaction/compaction-tool-result-pruner/src/index.ts:47] [E: packages/compaction/compaction-tool-result-pruner/src/index.ts:165]

11. **投影走另一条 O(1) fold。** `foldSurfaceProjection@surface-projection.ts` 不保留 per-node 价：`compaction/summary` 或 `compaction/prune` 武装一条 `ShadowPriceClaim`，紧邻的 `replace` 用 claim 做 signed delta。缺 claim 的旧 log 以 0 delta 折叠（可能漂移）。`contextBreakdown` 的 `messageTokens` 加上同一份 `fold.deltaTokens`；测试要求它与 `measure().surfaceTokens` 逐事件相等。[E: packages/llm/token-meter/src/surface-projection.ts:70] [E: packages/llm/token-meter/src/breakdown-projection.ts:64] [E: packages/llm/token-meter/tests/context-breakdown-projection.spec.ts:147]

## 设计动机

- **计量与发包解耦。** 请求路径只关心 adapter 是否 `next()` 到 HTTP；压力数字是 compaction / 浏览器状态栏的输入。把 meter 塞进 `llm/stream` 会让一次 stream 既计价又重试，违反「host 面观察 / preset 面策略」的切分。
- **host 单例、按 Session 分 fold。** 投影登记表是进程级的。若 meter 跟 preset 进 isolate，浏览器读到的三套单元会随「此刻挂了哪个 preset」出现或消失；只跑 `minimal` 的进程会完全没有 meter。WeakMap 已按 `Session` 隔离 replay，不必再复制服务。
- **空 Config。** 旧键 `contextWindow` / `models` 曾让人以为 meter 管容量。容量属于 adapter model info，阈值属于 `compaction-basic`。空对象 + `validateConfigKeys` 让拼写在 load 时 fail-loud。
- **usage 必须 ≥ 全量启发式。** 4 chars/token 系统性低估密文本。若采用偏小的 provider 报告当锚，后续 `replace` 造成的负 delta 会把 `totalTokens` 压穿，pressure 门会瞎。只接受「至少和启发式一样大」的 usage，signed delta 才保守。
- **两套 fold 分工。** `measure()` 要给 compaction 选段，必须持有按节点的 `nodes[]`（O(surface)）。投影要进 checkpoint，状态必须 O(1)，所以改走 producer 写下的 shadow price。

## Gotcha

- **`tokenMeter` 不得进 isolate。** shipped preset 的 compaction 组只 isolate `compaction` 与 `toolResultPruner`。若在 preset 再挂一行 `token-meter` 且不加 isolate，`leakedServices` 会收集进 root 符号的服务名并抛错；若加上 `isolate: { tokenMeter: true }`，host `ctx.get('tokenMeter')` 看不见那份实例，投影也会跟 mount 绑定。正确做法是根本不挂第二行，让 `inject: ['tokenMeter']` 解析 host 那一个。[E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:364]
- **任何 Config 键都抛。** 测试覆盖 `models`、`contextWindow`、`contextWidow`。Schemastery 空对象会保留未知键，所以必须手写 `validateConfigKeys`。[E: packages/llm/token-meter/tests/token-meter.spec.ts:107]
- **4 chars/token 不是 tokenizer。** `'abcd'` = 9 只钉启发式算术。CJK / JSON schema 会被低估；`contextBreakdown` 三列不能加总去对 `projectedTokens`。[I]
- **usage 偏小会被丢掉。** provider 报 27、启发式锚更大时，baseline 是 `estimated`，不是 `usage`。测试里随后 shrink surface，若误用偏小 usage 当锚，`27 + surfaceDelta` 会小于 0。[E: packages/llm/token-meter/tests/token-meter.spec.ts:290]
- **`sourceEventSeqs` 空列表 ≠ 缺省。** `[]` 表示已知空流，provider 侧 assistant 价为 0，durable 改写会拉大 `surfaceDeltaTokens`。缺省列表把 durable 文本当成当时的 provider 输出，delta 为 0。
- **`reasoningTokens` 不另加。** `usageTokens` 与 `tokenUsage` 投影都只走四只互斥桶。
- **`requestHeader` 覆盖不改 surface。** 换一份更大的 system 只抬 `totalTokens`，`nodes` 与 `surfaceTokens` 不变。
- **畸形事件不推进 cursor。** `_foldEvent` 先算后写；`measure` 两次抛同一句。replace 指到不在当前 `nodes` 里的 seq 是 log 损坏，fail-loud。
- **投影 replace 缺 claim 静默 0 delta。** 影子价协议出现之前的旧 session 重放不会炸，但 `messageTokens` / `projectedTokens` 可能漂。新 producer 必须把 `compaction/summary` 或 `compaction/prune` 与 `replace` 同步相邻追加。
- **本包没有 runtime invariant。** companion installer 是空函数：估计是每次调用的输出，不是一条可观察的单调关系。

## Seam 三角

| 角 | 包 / 符号 | ctx 键 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-token-meter` 的 `TokenMeter` | `ctx.tokenMeter` | `dsh-base` `id: token-meter`。没有第二家抽象接口，也没有 `registerMeter`。 |
| Provider | 同一包、同一 class。`super(ctx, 'tokenMeter')` 自己 `provide` | 同上 | web-app **不** disable 这一行。headless 继承 base，也不 disable。 |
| Consumer | `dsh-compaction-basic`（`measure` 做 pressure / 选段）；`dsh-compaction-tool-result-pruner`（`estimateMessage` 写 shadow price）；可选 `sessionProjections` 三单元给浏览器 | Consumer `inject = ['tokenMeter']`，解析 **host** 实例 | `standard` / `code` / `cordis` 只 isolate `compaction` + `toolResultPruner`，**没有** `tokenMeter`。`minimal` 不挂 compaction 组，仍读 host meter。preset **不**再插 `token-meter` 行。 |

与 `ctx.llm` / `ctx.compaction` 不同：那些缝把 Definition 与可替换 Provider 拆开。token-meter 是「一个服务插件 = 缝 + 唯一实现」。

## Sources

- packages/llm/token-meter/src/index.ts
- packages/llm/token-meter/src/estimate.ts
- packages/llm/token-meter/src/types.ts
- packages/llm/token-meter/src/breakdown-projection.ts
- packages/llm/token-meter/src/usage-projection.ts
- packages/llm/token-meter/src/projection.ts
- packages/llm/token-meter/src/surface-fold.ts
- packages/llm/token-meter/src/surface-projection.ts
- packages/llm/token-meter/tests/token-meter.spec.ts
- packages/llm/token-meter/tests/token-usage-projection.spec.ts
- packages/llm/token-meter/tests/context-breakdown-projection.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts
- packages/compaction/compaction-basic/src/index.ts
- packages/compaction/compaction-tool-result-pruner/src/index.ts
- packages/core/session/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — Cordis 组合运行时；host 面 vs agent-preset 面
- [`spine.context-and-compaction`](../../spine/context-and-compaction.md) — 装配与压缩主路径；pressure 读 `ctx.tokenMeter.measure`
- [`subsys.llm.service`](./service.md) — `ctx.llm` 与 `llm/stream` waterfall（meter 不挂这条）
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 插入 `id: token-meter`
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web 留下 meter、disable compaction 后端
- [`spine.session-log`](../../spine/session-log.md) — append-only log 与 `deriveMessages`
- [`subsys.core.session`](../core/session.md) — `Session` / `session/event` emit
- [`subsys.context.compaction`](../context/compaction.md) — `ctx.compaction` 缝
- [`subsys.context.compaction-basic`](../context/compaction-basic.md) — 压力阈值与 `measure` Consumer
