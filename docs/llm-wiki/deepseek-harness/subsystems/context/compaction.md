---
id: subsys.context.compaction
title: compaction 缝
kind: subsystem
tier: T2
pkg: context
source:
  - packages/compaction/compaction/src/index.ts
  - packages/compaction/compaction/src/types.ts
  - packages/compaction/compaction/src/checkpoint.ts
  - packages/compaction/compaction/src/tool-pairing.ts
  - packages/compaction/compaction/src/brand.ts
  - packages/compaction/compaction/src/invariant.ts
  - packages/compaction/compaction/tests/compaction.spec.ts
  - packages/compaction/compaction/tests/tool-pairing.spec.ts
  - packages/compaction/command-compact/src/index.ts
  - packages/compaction/command-compact/tests/command-compact.spec.ts
  - packages/compaction/compaction-basic/src/index.ts
  - packages/compaction/compaction-basic/src/region.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - ctx.compaction
  - CompactionEngine
  - compactIfNeeded
  - compactNow
  - compactRegion
  - compactCheckpointSource
  - ManualCompactionError
related:
  - spine.overview
  - spine.context-and-compaction
  - spine.session-log
  - subsys.context.compaction-basic
  - subsys.core.session
  - subsys.core.agent-loop
  - subsys.llm.token-meter
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.compaction` 是 compaction **Definition** 缝：抽象类 `CompactionEngine` 在构造里 `super(ctx, 'compaction')`，把实现登记为 Cordis 服务。没有单独的空 Definition 插件行；shipped Provider `BasicCompactionEngine` 自己继承该类。成功落地只追加 log-only `compaction/*`，再写一条带 `surfaceOp: { op: 'replace', start, end }` 的 `user/message`（或 pruner 对单条 `tool/result` 的同形 replace）。`SurfaceOp` 没有 delete。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

## 能回答的问题

- `ctx.compaction` 由哪个包声明？`@deepseek-ai/dsh-compaction` 自己是不是 `dsh-base` 的一行？
- `compactIfNeeded` / `compactNow` / `compactRegion` 各在什么时机调用？`trigger` 有哪两个值？
- `compaction/start|summary|end|prune` 为什么不能带 `surfaceOp`？模型下一轮看见的是哪一条事件？
- `compactCheckpointSource` 的 `plugin` 为什么是 `compact` 而不是 `compaction`？
- `/compact` 怎样到达 `compactNow`？它走不走模型 turn？
- `dsh web` 默认路径上，compaction 组挂在 host 面还是 agent-preset isolate？`minimal` 压不压？

## 职责边界

本包 `@deepseek-ai/dsh-compaction` 拥有：服务名 `compaction`、抽象类 `CompactionEngine` 的三个方法合同、`ManualCompactionError` / `CompactionTrigger`、`compaction/*` 的 `SessionEventMap` 声明、检查点 provenance（`compactCheckpointSource` / `isCompactCheckpointSource`）、以及按当前 surface 顺序计算的 `toolPairingBalancedBefore` / `toolPairingBalancedAfter`。companion `@deepseek-ai/dsh-compaction/invariant` 校验 start / summary / end 配对与 turn 边界，不实现策略。

`@deepseek-ai/dsh-command-compact` 是本缝的人命令 **Consumer**：注册 `/compact`，调用 `ctx.compaction.compactNow`。

本页**不**拥有：

- 选段、阈值、`compactSurfaceRegion` 事务细节、summarizer 模板 —— [`subsys.context.compaction-basic`](./compaction-basic.md)（`subsys.context.compaction-basic`）。
- token 计量与 `measure()` —— [`subsys.llm.token-meter`](../llm/token-meter.md)（`subsys.llm.token-meter`）。`tokenMeter` 留在 **host 面**，不进 compaction isolate。
- session fold、`deriveMessages()`、`SurfaceOp` 类型本身 —— [`subsys.core.session`](../core/session.md)（`subsys.core.session`）。本缝只消费那份合同：replace，没有 delete。
- loop 何时进入 `agent/pre-step` / 何时 `assemble` —— [`subsys.core.agent-loop`](../core/agent-loop.md)（`subsys.core.agent-loop`）。shipped Provider 挂在这条 waterfall 上，但步进节奏属于 loop。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/compaction/compaction/src/index.ts` | `CompactionEngine`；`ctx.compaction`；三个抽象方法；`ManualCompactionError` |
| `packages/compaction/compaction/src/types.ts` | `CompactionResult`；merge `compaction/start\|summary\|end\|prune` |
| `packages/compaction/compaction/src/checkpoint.ts` | `compactCheckpointSource`；marker `plugin: 'compact'` |
| `packages/compaction/compaction/src/tool-pairing.ts` | 当前 surface 上的 tool-call / `tool/result` 切口平衡 |
| `packages/compaction/compaction/src/brand.ts` | `CompactionId` brand |
| `packages/compaction/compaction/src/invariant.ts` | 锁与 checkpoint 配对；不带 `error` 的 `end` 必须先有 `summary` |
| `packages/compaction/compaction/tests/compaction.spec.ts` | 登记 `ctx.compaction`；`compaction/*` 无 `surfaceOp` |
| `packages/compaction/compaction/tests/tool-pairing.spec.ts` | 闭步 / 开 call / replace 后重建 |
| `packages/compaction/command-compact/src/index.ts` | `/compact` → `compactNow` |
| `packages/compaction/command-compact/tests/command-compact.spec.ts` | `inject`；六种 `ManualCompactionError.code` 映射 |
| `packages/compaction/compaction-basic/src/index.ts` | shipped Provider；`agent/pre-step` 必须 `next()` |
| `packages/compaction/compaction-basic/src/region.ts` | 位置闭区间校验；唯一摘要 `user/message` replace |
| `packages/compaction/compaction-tool-result-pruner/src/index.ts` | log-only `compaction/prune` + 单条 `tool/result` replace |
| `packages/core/session/src/types.ts` | `SurfaceEventType`；`SurfaceOp` |
| `packages/core/session/src/surface.ts` | 三类 surface；`isReplaceOp`；`splice` |
| `packages/core/session/src/index.ts` | `Session.append`：非 surface 类型不能带 `surfaceOp` |
| `packages/core/agent-loop/src/agent.ts` | `runMaintenance`：非 idle 同步抛 |
| `packages/bundle/base/cordis.patch.yml` | host 挂 backend 三行 |
| `packages/bundle/web-app/cordis.patch.yml` | 把这三行 `disabled: true` |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | isolate 组重挂（`code` / `cordis` 同形） |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | 不挂 compaction 组 |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ctx.compaction` | Cordis 服务键。`CompactionEngine` 构造 `super(ctx, 'compaction')`。 [E: packages/compaction/compaction/src/index.ts:83] [E: packages/compaction/compaction/src/index.ts:98] |
| `CompactionTrigger` | `'pressure'` 或 `'context-overflow'`。只用于 `compactIfNeeded`。 [E: packages/compaction/compaction/src/index.ts:25] |
| `compactIfNeeded` | `(agent, trigger, signal) → CompactionResult \| null`。没有可安全压缩的区间则 `null`。 [E: packages/compaction/compaction/src/index.ts:113] |
| `compactNow` | 显式、可低于自动阈值；要 idle `runMaintenance`；可带 `sourceCommandId`。 [E: packages/compaction/compaction/src/index.ts:139] |
| `compactRegion` | 按 **surface 位置** 的闭区间 `[start, end]`，不是数值 seq 序。两端必须 pairing 平衡。 [E: packages/compaction/compaction/src/index.ts:164] |
| `ManualCompactionError.code` | 封闭联合：`busy` / `cancelled` / `changed` / `summary` / `commit` / `persistence`。`busy` 也可从自动入口抛出。 [E: packages/compaction/compaction/src/index.ts:28] [E: packages/compaction/compaction/src/index.ts:41] |
| `CompactionId` | 一次 start / summary / checkpoint / end 共用的 branded 字符串。 [E: packages/compaction/compaction/src/brand.ts:4] |
| `CompactionResult` | `compactionId`、三条 lifecycle seq、`summary`、`shadowedRange` / `shadowedSeqs` / `shadowedTokenCount`。`shadowedRange` 是位置跨度：先前 replace 之后，作为数字的 `start` 可以大于 `end`；权威集合是 `shadowedSeqs`。 [E: packages/compaction/compaction/src/types.ts:93] [E: packages/compaction/compaction/src/types.ts:114] |
| `compaction/start` | log-only 锁。`turn: number` 必须包在该开 turn 内；`turn: null` 是 turn 之间的手动事务。 [E: packages/compaction/compaction/src/types.ts:23] |
| `compaction/summary` | log-only。`data.summary` 是摘要正文；真正上 surface 的是紧随其后的那条 `user/message`。 [E: packages/compaction/compaction/src/types.ts:33] |
| `compaction/end` | log-only，释放锁。失败可带 `error`。 [E: packages/compaction/compaction/src/types.ts:71] |
| `compaction/prune` | log-only 影子价。紧邻的下一条必须是对同一区间的 surface replace。 [E: packages/compaction/compaction/src/types.ts:81] |
| `compactCheckpointSource` | `{ kind: 'plugin', plugin: 'compact', compactionId, sourceCommandId? }`。plugin 名是 `compact`，不是 `compaction`。 [E: packages/compaction/compaction/src/checkpoint.ts:19] [E: packages/compaction/compaction/src/checkpoint.ts:33] |
| `SurfaceEventType` | 只有 `user/message` / `assistant/message` / `tool/result` 可以带 `surfaceOp`。 [E: packages/core/session/src/types.ts:343] [E: packages/core/session/src/types.ts:344] [E: packages/core/session/src/types.ts:345] [E: packages/core/session/src/types.ts:346] |
| `SurfaceOp` | `'append'`，或 `{ op: 'replace', start, end }`（闭区间）。**没有 delete。** [E: packages/core/session/src/types.ts:372] [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] |
| `CompactionAgentContext` | 缝不依赖 agent 包：只要 `session` 与 `options.provider/model`。 |
| `ManualCompactAgentContext` | 另要 `runMaintenance`。非 idle 时实现应同步失败。 |

`Session.append` 对非 `SurfaceEventType` 不接受第三参 `surfaceOp`（类型上是空元组）。`compaction/*` 因此既不能带 `surfaceOp`，也不能进入 `surface.nodes`。 [E: packages/core/session/src/index.ts:607]

## 控制流

1. **Definition 只占键，不是 Loader 行。** `CompactionEngine@packages/compaction/compaction/src/index.ts` 把 `Context.compaction` 声明为 `CompactionEngine`，构造 `super(ctx, 'compaction')`。测试 `new StubCompactionEngine(ctx)` 之后 `ctx.compaction` 就是该实例；fiber `dispose` 后键变 `undefined`。`dsh-base` 没有 `name: '@deepseek-ai/dsh-compaction'` 这一行 [I]。 [E: packages/compaction/compaction/src/index.ts:83] [E: packages/compaction/compaction/src/index.ts:96] [E: packages/compaction/compaction/src/index.ts:98] [E: packages/compaction/compaction/tests/compaction.spec.ts:97] [E: packages/compaction/compaction/tests/compaction.spec.ts:106]

2. **shipped Provider 自己 `super(ctx)`。** `BasicCompactionEngine@packages/compaction/compaction-basic/src/index.ts` 继承 `CompactionEngine`，`static inject = ['llm', 'tokenMeter', 'sessions']`，`export default BasicCompactionEngine`。构造调用 `super(ctx)`（服务名仍由父类写成 `compaction`），再 `resolveConfig`；`auto` 为真时登记自动压缩。选段 / 阈值 / summarizer 在 [`subsys.context.compaction-basic`](./compaction-basic.md)。 [E: packages/compaction/compaction-basic/src/index.ts:103] [E: packages/compaction/compaction-basic/src/index.ts:104] [E: packages/compaction/compaction-basic/src/index.ts:127] [E: packages/compaction/compaction-basic/src/index.ts:431]

3. **组合真树：base 挂、web disable、preset isolate 重挂。** `dsh-base` 在 host 面插入 `id: compaction-basic`、`id: command-compact`、`id: tool-result-pruner`。`dsh-web-app` 把这三行标 `disabled: true`（多会话不能让 `ctx.compaction` 落在 root realm）。`standard` / `code` / `cordis` 在 **agent-preset 面** 用 `cordis:group` `id: compaction` 重挂同一组，并 `isolate.compaction: true` 与 `isolate.toolResultPruner: true`。`minimal` 的 `agent.cordis.yml` 没有这三行，也不建 compaction 组 [I]。`dsh-headless` overlay 也不 disable 它们，headless 单会话路径继续用 host 那一份 [I]。 [E: packages/bundle/base/cordis.patch.yml:284] [E: packages/bundle/base/cordis.patch.yml:285] [E: packages/bundle/base/cordis.patch.yml:289] [E: packages/bundle/base/cordis.patch.yml:290] [E: packages/bundle/base/cordis.patch.yml:360] [E: packages/bundle/web-app/cordis.patch.yml:358] [E: packages/bundle/web-app/cordis.patch.yml:359] [E: packages/bundle/web-app/cordis.patch.yml:361] [E: packages/bundle/web-app/cordis.patch.yml:362] [E: packages/bundle/web-app/cordis.patch.yml:364] [E: packages/bundle/web-app/cordis.patch.yml:365] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:137] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:142] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:144] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:151] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:132]

4. **`tokenMeter` 故意不进 isolate。** host `dsh-base` 挂 `id: token-meter`。preset isolate 块只有 `compaction` 与 `toolResultPruner` 两个键；组内行解析进程里那一个 meter。`dsh-web-app` 没有 disable `token-meter` 的行 [I]。 [E: packages/bundle/base/cordis.patch.yml:281] [E: packages/bundle/base/cordis.patch.yml:282] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:142]

5. **自动压力走 `agent/pre-step` waterfall，必须 `next()`。** `BasicCompactionEngine._registerAutomaticCompaction` 监听 `agent/pre-step`：未 abort 时先 `this.compactIfNeeded(agent, 'pressure', signal)`，压力失败只 `warn`，然后 **`return next()`**。`Events.waterfall` 把最后一个参数当 innermost `next`；listener 不调用传入的 `next()` 就不会 `cbs.shift()`，后续 listener 与内建行为全部被 veto。另一条 `agent/request-error` 只认 overflow 码，细节在 Provider 页。 [E: packages/compaction/compaction-basic/src/index.ts:153] [E: packages/compaction/compaction-basic/src/index.ts:164] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:242]

6. **`/compact` 是人命令 Consumer，不经模型 turn。** `command-compact` 的 `inject = ['commands', 'compaction']`。`apply` 在 effect 里先 yield drain、再 `ctx.commands.register({ name: 'compact', … })`。`executeCompact` 拒绝任何非空 `rawInput`；否则 `ctx.compaction.compactNow(invocation.agent, invocation.signal, invocation.commandId)`。`null` → 「No compactable history yet.»；成功用 `shadowedSeqs.length` / `shadowedTokenCount` 拼文案，并把 `sourceEventSeq` 指到 `summarySeq`。`ManualCompactionError` 六码各映射一条 human-only `kind: 'error'`；其它异常原样抛。 [E: packages/compaction/command-compact/src/index.ts:11] [E: packages/compaction/command-compact/src/index.ts:66] [E: packages/compaction/command-compact/src/index.ts:67] [E: packages/compaction/command-compact/src/index.ts:101] [E: packages/compaction/command-compact/tests/command-compact.spec.ts:160]

7. **`compactNow` 先抢 idle maintenance。** 合同要求实现同步启动 idle 任务，再做任何异步工作。`ReactLoopAgent.runMaintenance` 在 `phase.kind !== 'idle'` 时立刻抛 `already has active work`。`BasicCompactionEngine.compactNow` 把这次同步抛包装成 `ManualCompactionError('busy')`；任务体内 `owner: null`、只要求选中 span 稳定，成功后 `sessions.flush`。选段与 flush 细节在 Provider 页。 [E: packages/core/agent-loop/src/agent.ts:142] [E: packages/core/agent-loop/src/agent.ts:143] [E: packages/compaction/compaction-basic/src/index.ts:375] [E: packages/compaction/compaction-basic/src/index.ts:414] [E: packages/compaction/compaction-basic/src/index.ts:415]

8. **`compactRegion` 用 surface 下标，不用 seq 数值序。** 实现先 `nodes.indexOf(start)` / `indexOf(end)`：缺席、或 start 的位置在 end **之后**，抛错。然后 `toolPairingBalancedBefore(session, start)` 与 `toolPairingBalancedAfter(session, end)` 必须为真，否则会切断 assistant tool-call 与 `tool/result`。 [E: packages/compaction/compaction-basic/src/region.ts:317] [E: packages/compaction/compaction-basic/src/region.ts:318] [E: packages/compaction/compaction-basic/src/region.ts:327] [E: packages/compaction/compaction-basic/src/region.ts:331]

9. **pairing 按当前 surface 折叠，不按 step 标记。** `eventDelta`：`assistant/message` 里每个 `tool-call` 块 +1，`tool/result` −1，其它 0。`toolPairingBalancedBefore(seq)` 看该节点**前**切口；`After` 看**后**切口。闭步：assistant 之后不平衡，配对 result 之后才平衡。replace 换代后按新 `nodes` 重建；已裁掉的 seq 再查会抛 `not found`。 [E: packages/compaction/compaction/src/tool-pairing.ts:32] [E: packages/compaction/compaction/src/tool-pairing.ts:34] [E: packages/compaction/compaction/src/tool-pairing.ts:117] [E: packages/compaction/compaction/src/tool-pairing.ts:129] [E: packages/compaction/compaction/tests/tool-pairing.spec.ts:63] [E: packages/compaction/compaction/tests/tool-pairing.spec.ts:64]

10. **唯一摘要 surface 变更是随后那条 `user/message`。** 校验过后同步 `append('compaction/start')`（这把锁）→ summarizer → `append('compaction/summary')` → `append('user/message', checkpoint, { surfaceOp: { op: 'replace', start, end }, sourceEventSeqs })` → `compaction/end`。`checkpoint` 的 `source` 必须是 `compactCheckpointSource(compactionId, sourceCommandId?)`。缝测试把同一顺序钉死，并断言 `compaction/start` 运行时没有 `surfaceOp`。 [E: packages/compaction/compaction-basic/src/region.ts:189] [E: packages/compaction/compaction-basic/src/region.ts:447] [E: packages/compaction/compaction-basic/src/region.ts:462] [E: packages/compaction/compaction-basic/src/region.ts:463] [E: packages/compaction/compaction/src/checkpoint.ts:38] [E: packages/compaction/compaction/tests/compaction.spec.ts:72] [E: packages/compaction/compaction/tests/compaction.spec.ts:138] [E: packages/compaction/compaction/tests/compaction.spec.ts:151]

11. **fold 只 splice `nodes`，不删 `this.log`。** `isReplaceOp` 要求对象恰好三键且 `op === 'replace'`。`applySurfacePlan` 对 replace 做 `nodes.splice(startIdx, endIdx - startIdx + 1, plan.seq)` 并把 `replaceGeneration` 加一。被遮挡的原始 surface 事件仍在 append-only log 里；`deriveMessages()` 只投影当前 `nodes`。 [E: packages/core/session/src/surface.ts:173] [E: packages/core/session/src/surface.ts:175] [E: packages/core/session/src/surface.ts:179] [E: packages/core/session/src/surface.ts:369] [E: packages/core/session/src/surface.ts:370]

12. **pruner 共用「前一条 log-only + 后一条 replace」协议。** `ToolResultPruner` 先 `append('compaction/prune', …)`，再对同一 `seq` 写 `tool/result` 且 `surfaceOp: { op: 'replace', start: seq, end: seq }`。字符预算与默认阈值在 Provider 页。 [E: packages/compaction/compaction-tool-result-pruner/src/index.ts:162] [E: packages/compaction/compaction-tool-result-pruner/src/index.ts:171]

13. **锁与 turn 不能交叉。** invariant 在仍有未闭合 `compaction/start` 时再 `start` 会 fail；不带 `error` 的 `compaction/end` 必须已经见过一条 `summary`。编号 owner 必须等于当前开 turn；`turn: null` 的手动括号禁止在开 turn 内出现。 [E: packages/compaction/compaction/src/invariant.ts:131] [E: packages/compaction/compaction/src/invariant.ts:135] [E: packages/compaction/compaction/src/invariant.ts:162] [E: packages/compaction/compaction/src/invariant.ts:215]

## 设计动机

DSH 把 compaction 做成可替换 capability，而不是 loop 内置的 history rewriter。`CompactionEngine` 只规定「何时考虑 / 如何按位置切开 / 如何留下可重建的 replace」；策略、摘要模型、pruner 字符预算都可以换包，调用方仍看 `ctx.compaction`。

`SurfaceOp` 做成封闭联合且没有 delete，是为了守 **model-visible ⟺ logged**：人读 UI 仍能顺着 append-only log 看见当初的原文；模型下一轮只看见 `deriveMessages()` 对当前 `nodes` 的投影。`compaction/*` 故意不是 `SurfaceEventType`，锁和影子价才不会漏进 messages。

检查点 `plugin: 'compact'` 写在 cordis-free 的 `checkpoint.ts`，好让浏览器 / wire 程序识别摘要节点，而不用加载 host 的 `Context` merge。plugin 短名与服务名 `compaction` 故意不同，避免和 Cordis 服务键撞在同一字符串上。

`dsh web` 把 Provider 推进 preset isolate：换 `standard` / `code` / `cordis` / `minimal` 等于换「这个会话压不压」，不是改 `ReactLoopAgent`。`tokenMeter` 留在 host，浏览器读到的压力投影才不会变成「当前挂了哪个 preset」。

## Gotcha

- **没有 delete。** 想从模型历史拿掉一段，只能 `surfaceOp: { op: 'replace', start, end }`。`this.log` 只增不减。
- **方法名是 `compactRegion`，不是 `compactRange`。** 三个抽象方法是 `compactIfNeeded` / `compactNow` / `compactRegion`。
- **`plugin: 'compact'` ≠ 服务名 `compaction`。** `isCompactCheckpointSource` 只看 `kind === 'plugin' && plugin === 'compact'`，不校验 `compactionId`。 [E: packages/compaction/compaction/src/checkpoint.ts:50]
- **`compaction/*` 不能上 surface。** 编译器挡住第三参；缝测试断言运行时也没有 `surfaceOp`。模型看见的是后一条 replace 的 `user/message`，或 pruner 裁过的那条 `tool/result`。
- **`start` / `end` 是位置，不是「小 seq 到大 seq」。** 先前 replace 可能把高 seq 摘要节点放回旧位置，`shadowedRange.start` 作为数字可以大于 `end`。
- **`/compact` 不接受参数。** 多余输入直接 `Usage: /compact (no arguments)`，不再调用 `compactNow`。它走 `ctx.commands`，不经模型 turn。 [E: packages/compaction/command-compact/src/index.ts:63]
- **waterfall 漏 `next()` = 停整条 `agent/pre-step`。** 自动压缩挂在这条链上；只 warn 失败也必须 `return next()`，否则后续 listener 与内建行为都不会跑。
- **preset 重挂必须 isolate。** `CompactionEngine` 会 publish 服务。组 `id: compaction` 是 `cordis:group`，isolate 键 `compaction` 才是服务 realm。漏 isolate 时第二会话会在同一 root realm 再 publish `compaction` 而撞名。
- **`minimal` 不压。** 没有 backend，也就没有 `/compact`、没有压力 pre-step。
- **`busy` 有两条来源。** 会话已有未闭合 `compaction/start`，或 agent 不在 idle（`runMaintenance` 同步抛）。command-compact 把两者都显示成「active compaction, or the agent is not idle」。
- **`compactIfNeeded` / `compactNow` 可以返回 `null`。** 这不是错误：没有可安全切开的区间。单条过大的保留单元或请求信封不能靠 surface compaction 修好。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| **Definition** | `@deepseek-ai/dsh-compaction` · `CompactionEngine` | `ctx.compaction`；`compactIfNeeded` / `compactNow` / `compactRegion`；`compaction/*` 词汇；`compactCheckpointSource` | **不是** Loader 行。库被 Provider import |
| **Provider（shipped）** | `@deepseek-ai/dsh-compaction-basic` · `BasicCompactionEngine` | 同一 `ctx.compaction`；`super(ctx)`；`inject = ['llm', 'tokenMeter', 'sessions']` | `dsh-base` `id: compaction-basic` → `dsh-web-app` `disabled: true` → `standard` / `code` / `cordis` 在 `isolate.compaction` 组内重挂。`minimal` 不挂 |
| **Companion（不是 Provider）** | `@deepseek-ai/dsh-compaction/invariant` | 听 `session/event`，校验锁 / checkpoint / turn 交叉 | 随 invariants 机制加载，不占 `ctx.compaction` |
| **Consumer（人命令）** | `@deepseek-ai/dsh-command-compact` · `apply` | `inject = ['commands', 'compaction']`；只调 `compactNow` | 与 Provider 同行：base 挂、web disable、preset isolate 组内重挂 |
| **Consumer（自动；写在 Provider 里）** | 同一 `BasicCompactionEngine` | `agent/pre-step` / `agent/request-error` waterfall；必须 `next()` | 无独立组合行 |
| **计量（邻缝，host）** | `@deepseek-ai/dsh-token-meter` | `ctx.tokenMeter`；**不**进 isolate | `dsh-base` `id: token-meter`；web-app 不 disable |

host 面 = 进程级 `tokenMeter`，以及 headless 继承下来的 host backend。agent-preset 面 = `dsh web` 默认路径上每会话一份 `ctx.compaction` + `toolResultPruner`。client 面不持有这些键。

## Sources

- packages/compaction/compaction/src/index.ts
- packages/compaction/compaction/src/types.ts
- packages/compaction/compaction/src/checkpoint.ts
- packages/compaction/compaction/src/tool-pairing.ts
- packages/compaction/compaction/src/brand.ts
- packages/compaction/compaction/src/invariant.ts
- packages/compaction/compaction/tests/compaction.spec.ts
- packages/compaction/compaction/tests/tool-pairing.spec.ts
- packages/compaction/command-compact/src/index.ts
- packages/compaction/command-compact/tests/command-compact.spec.ts
- packages/compaction/compaction-basic/src/index.ts
- packages/compaction/compaction-basic/src/region.ts
- packages/compaction/compaction-tool-result-pruner/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/index.ts
- packages/core/agent-loop/src/agent.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — `profile → bundle → preset`；host 面 vs agent-preset 面。
- [`spine.context-and-compaction`](../../spine/context-and-compaction.md) — system-prompt / 指令 / compaction 端到端管道。
- [`spine.session-log`](../../spine/session-log.md) — append-only log、`deriveMessages`、三类 surface、`surfaceOp` 折叠。
- [`subsys.context.compaction-basic`](./compaction-basic.md) — shipped Provider：选段、事务、pruner 字符预算、summarizer。
- [`subsys.core.session`](../core/session.md) — `Session` / `SurfaceOp` / `deriveMessages`；没有 delete。
- [`subsys.core.agent-loop`](../core/agent-loop.md) — `agent/pre-step` 何时开火；`runMaintenance` 与 turn 互斥。
- [`subsys.llm.token-meter`](../llm/token-meter.md) — host 面 `measure()`；不进 compaction isolate。
