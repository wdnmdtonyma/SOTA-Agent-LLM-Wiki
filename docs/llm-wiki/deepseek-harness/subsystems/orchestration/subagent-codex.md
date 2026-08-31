---
id: subsys.orchestration.subagent-codex
title: Codex 子代理后端
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent-codex/src/index.ts
  - packages/subagent/subagent-codex/src/run.ts
  - packages/subagent/subagent-codex/src/wire.ts
  - packages/subagent/subagent-codex/cordis.patch.yml
  - packages/subagent/subagent-codex/package.json
  - packages/subagent/subagent-codex/tests/subagent-codex.spec.ts
  - packages/subagent/subagent-codex/tests/loader-composition.e2e.ts
  - packages/subagent/subagent-codex/tests/fixtures/loader/cordis.yml
  - packages/subagent/subagent/src/out-of-process.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - vendor/cordis/src/events.ts
  - packages/core/tools/src/index.ts
symbols:
  - CodexProvider
related:
  - spine.overview
  - subsys.orchestration.subagent
  - subsys.orchestration.subagent-claude-code
  - subsys.composition.bundle-base
  - surface.tools.subagent
  - spine.trace-subagent
  - subsys.execution.subprocess
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-subagent-codex` 是 **opt-in 的 host 面 Provider**：默认 registry 名 `'codex'`（`Config.providerName` 可改），每次 `start` 经 `ctx.subprocess.spawn` 拉起 **包内** `@openai/codex` 的 `app-server --stdio`（`process.execPath` + package bin，不查 `PATH`），跑 **one-shot** 文本任务。`dsh-base` **不装**它。包自己带一份可选 Bundle patch（`cordis.patch.yml`），须由 profile / `--patch` 显式叠上。

## 能回答的问题

- 仓库里有 `@deepseek-ai/dsh-subagent-codex`，是否等于 `dsh web` / `dsh --profile sdk|sdk-minimal|acp|headless` / `dsh-base` 已经登记了 `codex` provider？
- 只把 preset 里的 `tool-subagent-codex` 去掉 `disabled`、不 mount 本包，模型能不能调 `subagent_codex`？`start('codex')` 会怎样？
- `CodexProvider` 的 registry 名默认是什么、能不能改？`Config` 有哪些键？有没有 `cwd` / 命令覆盖 / `prepareContinuable`？
- `start()` 何时 `spawn`、何时才把 `SubagentRun` 交给 holder？失败发生在 publish 前还是后，谁负责杀进程树？
- 这条路挂不挂 waterfall？`tools/pre-execute` 不 `next()` 会怎样？preset `delegation` 的 `isolate` 隔的是 Codex 还是 workflow？
- 和 in-process `spawn` / `fork`、以及对称的 Claude Code 后端差在哪一层？

## 职责边界

本页覆盖 **subagent 缝上的 Codex Provider**（符号 `CodexProvider`），加上它如何被（或不被）组合进 shipped 产品。插件名是 `'subagent-codex'`，`inject = ['subagents', 'subprocess']`，`apply` 调 `ctx.subagents.registerProvider`。[E: packages/subagent/subagent-codex/src/index.ts:30] [E: packages/subagent/subagent-codex/src/index.ts:31] [E: packages/subagent/subagent-codex/src/index.ts:135] 包名 `@deepseek-ai/dsh-subagent-codex`。[E: packages/subagent/subagent-codex/package.json:2] 单测钉死 `'default' in codex` 为 `false`：default export 会让 Loader 丢掉 `inject`。[E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:718]

本包拥有：默认 provider 名 `'codex'`（可 `providerName`）、one-shot `start`、固定 argv（Node + 官方 wrapper + `app-server --stdio`）、app-server JSON-RPC 握手 / 临时 thread / 单 turn、无人值守审批答复、以及 publish 前后的进程树回收。`Config` 含 `providerName?`、`model?`、`env?`、`permissionMode?`、`disposeGraceMs?`。[E: packages/subagent/subagent-codex/src/index.ts:38] [E: packages/subagent/subagent-codex/src/index.ts:52]

明确不拥有：

- `ctx.subagents` Definition、`registerProvider` / `start` / `startContinuable` 合同：[subsys.orchestration.subagent](./subagent.md)（`subsys.orchestration.subagent`）。
- 模型可见工具名、`description` / `prompt` schema、`backgroundMode` 文案：[surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）。本页不写 T1 字段表。
- in-process `spawn` / `fork` 孩子 session：[subsys.orchestration.subagent-in-process](./subagent-in-process.md) / [subsys.orchestration.subagent-fork](./subagent-fork.md)。
- 对称的官方 Claude Code 后端：[subsys.orchestration.subagent-claude-code](./subagent-claude-code.md)（`subsys.orchestration.subagent-claude-code`）。
- `ctx.subprocess` 的 env scrub / 杀树升级：[subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）。本包只 `spawn` 一份已经拼好的 spec。
- 安装 Codex CLI、登录、探测 `PATH` 上的 `codex`。运行时二进制来自本包 **runtime** 依赖 `@openai/codex` `0.149.1`。[E: packages/subagent/subagent-codex/package.json:53]

**host 面 vs agent-preset 面。** `registerProvider` 写进进程单例 `this.providers` Map，跨会话可见，不能按 preset isolate 复制一份。[E: packages/subagent/subagent/src/index.ts:515] 因此本包若被挂上，必须坐在 **host 面**。`dsh-base` 当前 **没有** 这一行：host 只插 `id: subagent` + `subagent-spawn-in-process`（`providerName: spawn`）+ `subagent-fork-in-process`（`providerName: fork`）。[E: packages/bundle/base/cordis.patch.yml:334] [E: packages/bundle/base/cordis.patch.yml:337] [E: packages/bundle/base/cordis.patch.yml:342] `base.spec.ts` 要求 `id === 'subagent-codex'` 的 insert 行长度为 0，且 manifest `dependencies` 不含 `@deepseek-ai/dsh-subagent-codex`。[E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:47] 对照：同一份 manifest **有** `@deepseek-ai/dsh-subagent` / `dsh-subagent-fork-in-process` / `dsh-subagent-spawn-in-process`。[E: packages/bundle/base/package.json:94] [E: packages/bundle/base/package.json:95] [E: packages/bundle/base/package.json:96] 这不是「装了但 dormant」：连依赖闭包都没有。

`standard` / `ptc` / `cordis` 在 **preset 面** `delegation` 组里留着 `id: tool-subagent-codex`，但 `disabled: true`。去掉 `disabled` 只启用 Consumer 工具，**不会**把本包挂进 host。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:209] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:211] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:210] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:212] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:197] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:199] `minimal` 没有这条 tool 行。`dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app` 的 overlay 也不 insert 本包。要真正登记 `'codex'`，必须叠上本包自带 patch 或等价 insert `name: '@deepseek-ai/dsh-subagent-codex'`。[E: packages/subagent/subagent-codex/cordis.patch.yml:4] [E: packages/subagent/subagent-codex/cordis.patch.yml:5] Loader e2e 叠真实 patch + fixture 里两个 named 实例；`PATH: ''` 时 `starts: 0`——load 不探测、不拉起二进制。[E: packages/subagent/subagent-codex/tests/loader-composition.e2e.ts:37] [E: packages/subagent/subagent-codex/tests/loader-composition.e2e.ts:97]

默认 Web 入口仍是 `dsh web`（硬编码 profile `web`）。另外可用 `dsh --profile sdk|sdk-minimal|acp|headless`。本仓没有 shipped TUI，TUI 也不会偷偷带上 Codex 后端。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent-codex/package.json` | 包合同；runtime `@openai/codex`；`dsh.bundle.patch` |
| `packages/subagent/subagent-codex/cordis.patch.yml` | 可选 Bundle：host insert `id: subagent-codex` |
| `packages/subagent/subagent-codex/src/index.ts` | `apply`、`Config`、`CodexProvider` |
| `packages/subagent/subagent-codex/src/run.ts` | `codexAppServerArgv`、`textTask`、`startCodexRun`、`disposeCodexChild` |
| `packages/subagent/subagent-codex/src/wire.ts` | `CodexAppServerWire`：handshake / ephemeral thread / 单 turn / 无人值守 |
| `packages/subagent/subagent/src/out-of-process.ts` | `NO_START_CAPABILITIES`、`settleRunResult`、`subprocessRunHandle` |
| `packages/subagent/subagent/src/index.ts` | `registerProvider` / `start` / `expectProvider` / `prepareContinuable` 门 |
| `packages/subagent/tool-subagent/src/index.ts` | Consumer：等 `subagent/provider-added` 再 `ctx.tools.register` |
| `packages/bundle/base/tests/base.spec.ts` | **零** `subagent-codex` 行、**无**本包依赖 |
| `packages/preset/agent-presets/presets/standard/agent.cordis.yml` | `tool-subagent-codex` `disabled: true`（`ptc` / `cordis` 同构） |
| `packages/subagent/subagent-codex/tests/fixtures/loader/cordis.yml` | 测试：named instances + 启用的 tool 行 |
| `packages/subagent/subagent-codex/tests/subagent-codex.spec.ts` | 名 / 能力 / argv / publish 时机 / 无人值守 / dispose |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CodexProvider` | `SubagentProvider`。`name` 来自 `providerName`，默认 `'codex'`。[E: packages/subagent/subagent-codex/src/index.ts:33] [E: packages/subagent/subagent-codex/src/index.ts:53] `inheritsParentContext = false`。[E: packages/subagent/subagent-codex/src/index.ts:65] 类上 **没有** `prepareContinuable`。 |
| `Config` | `providerName` 默认 `'codex'`；`model` 可选；`env` 默认 `{}`；`permissionMode` 默认 `'never'`；`disposeGraceMs` 默认 `DEFAULT_DISPOSE_GRACE_MS = 3000`。[E: packages/subagent/subagent-codex/src/index.ts:53] [E: packages/subagent/subagent-codex/src/index.ts:57] [E: packages/subagent/subagent-codex/src/run.ts:36] [E: packages/subagent/subagent-codex/src/run.ts:69] 没有 `cwd`、没有 argv 覆盖。`disposeGraceMs` 必须正有限且 `≤ MAX_TIMER_DELAY_MS`。[E: packages/subagent/subagent-codex/src/index.ts:125] [E: packages/subagent/subagent-codex/src/index.ts:130] |
| `CodexPermissionMode` | `'never' \| 'approve-for-me' \| 'dangerously-bypass-approvals-and-sandbox'`。[E: packages/subagent/subagent-codex/src/run.ts:56] |
| `NO_START_CAPABILITIES` | `agentOptions` / `outputSchema` / `depthLimit` / `toolFilter` / `persona` 全 `false`。[E: packages/subagent/subagent/src/out-of-process.ts:57] [E: packages/subagent/subagent-codex/src/index.ts:64] 父侧若带这些字段，`assertCapabilities` 在 `start` 之前抛 `UNSUPPORTED_CAPABILITY`。[E: packages/subagent/subagent/src/index.ts:620] [E: packages/subagent/subagent/src/index.ts:632] |
| `CodexRunSpec` | `cwd` / 可选 `model` / `permissionMode` / `env` / `disposeGraceMs` / `spawn` / 可选 `onError`。`cwd` 来自父 session workspace，经 `resolveChildCwd('subagent-codex', undefined, parentCwd)`，配置侧没有覆盖。[E: packages/subagent/subagent-codex/src/index.ts:82] |
| `textTask` | prompt 必须是非空 **text** block 序列；空数组、非 text、全空白都在跨进程之前抛。[E: packages/subagent/subagent-codex/src/run.ts:168] [E: packages/subagent/subagent-codex/src/run.ts:174] [E: packages/subagent/subagent-codex/src/run.ts:179] |
| `CodexAppServerWire` | 一条连接、一个 ephemeral thread、一个 turn。`clientInfo.name = 'deepseek-harness'`。[E: packages/subagent/subagent-codex/src/wire.ts:270] thread 必须 `ephemeral === true`。[E: packages/subagent/subagent-codex/src/wire.ts:297] |
| `SubagentRun` | `subprocessRunHandle` 发布：`localAgent` 恒 `undefined`；`id` 是父命名空间的 `SessionId(randomUUID())`，不是 Codex thread id。[E: packages/subagent/subagent/src/out-of-process.ts:249] [E: packages/subagent/subagent-codex/src/run.ts:437] |
| preset tool 行 | `provider: codex`、`toolName: subagent_codex`、`backgroundMode: one-shot`、`maxDepth: provider-managed`、`disabled: true`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:213] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:214] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:215] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:216] 未写 `enableRunInBackground` 时 Consumer schema 默认 `true`。[E: packages/subagent/tool-subagent/src/index.ts:109] 未写 `backgroundMode` 时默认 `'one-shot'`。[E: packages/subagent/tool-subagent/src/index.ts:110] |

## 控制流

本包 **不**注册 waterfall。`apply` 只 `registerProvider`；登记成功后走 `this.ctx.emit('subagent/provider-added', provider)`，不是 `Events.waterfall`。[E: packages/subagent/subagent/src/index.ts:522] Cordis 全局规则仍在：凡是走到 waterfall 的槽，listener 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层，内建行为也到不了。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239]

1. **组合：包在仓库、不在 shipped host。** `dsh-base` 零 `subagent-codex` 行合同落在 `base.spec.ts`。[E: packages/bundle/base/tests/base.spec.ts:42] 要登记 backend，composition 必须 insert `name: '@deepseek-ai/dsh-subagent-codex'`（包 patch 的 `id: subagent-codex`）。[E: packages/subagent/subagent-codex/cordis.patch.yml:4]

2. **`apply@packages/subagent/subagent-codex/src/index.ts`。** 校验 `disposeGraceMs` 后 `new CodexProvider(resolved.providerName, ctx, resolved)`，`registerProvider` 走 `ctx.effect`：重名 `DUPLICATE_PROVIDER`；fiber dispose 从 map 删掉并 `emitLifecycle('subagent/provider-removed')`，已交给 holder 的 run 不撤回。[E: packages/subagent/subagent-codex/src/index.ts:135] [E: packages/subagent/subagent/src/index.ts:513] [E: packages/subagent/subagent/src/index.ts:518] 单测：挂上后 `getProvider('codex')` 能力旗为 false，`list()` 为 `['codex']`；dispose 后 `list()` 空。[E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:439] [E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:448] [E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:450]

3. **preset Consumer 默认关着。** `delegation` 组 `isolate: { workflowEngine: true }` 只给同组的 workflow 引擎建 entry-local realm，**不** isolate `ctx.subagents`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:177] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:178] 组内 `tool-subagent-codex` `disabled: true`，Loader 根本不激活该 fiber。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:211] 工具插件 `inject = ['tools', 'subagents', 'systemPrompt', 'sessionProjections']`，不 `provide` 服务，所以不必为 Codex 再开 isolate。[E: packages/subagent/tool-subagent/src/index.ts:43]

4. **即使启用 tool、backend 仍缺席。** `tool-subagent` 听 `subagent/provider-added`，仅当 `provider.name === config.provider` 才 `mount` / `ctx.tools.register`；已在表里则立刻 `mount`。[E: packages/subagent/tool-subagent/src/index.ts:573] [E: packages/subagent/tool-subagent/src/index.ts:581] 否则打 info：provider 还没登记，工具会等它出现。[E: packages/subagent/tool-subagent/src/index.ts:586] 只去掉 `disabled`、不 mount 本包 → 模型工具表里 **没有** `subagent_codex`。有人直接 `ctx.subagents.start('codex', …)` 则 `expectProvider` 抛 `NO_PROVIDER`。[E: packages/subagent/subagent/src/index.ts:591]

5. **父 turn 仍过工具 waterfall。** 模型若能发出该 tool-call，`ToolRuntime` 先 `this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。[E: packages/core/tools/src/index.ts:1467] [E: packages/core/tools/src/index.ts:1468] listener 不 `next()`，默认 `allow` 到不了，`execute` 进不了 `ctx.subagents.start`。本包不挂这个槽。

6. **`SubagentRuntime.start` 只走 one-shot。** `expectProvider` → `assertCapabilities` → `snapshotSubagentDescriptor({ mode: 'one-shot', provider: name })` → `await provider.start(resolved)` → `observeRun`。[E: packages/subagent/subagent/src/index.ts:554] [E: packages/subagent/subagent/src/index.ts:559] [E: packages/subagent/subagent/src/index.ts:564] `startContinuable` 走私有 `prepareContinuable`：provider 上该方法为 `undefined` 就 `UNSUPPORTED_CAPABILITY`。[E: packages/subagent/subagent/src/index.ts:577] [E: packages/subagent/subagent/src/types.ts:345] shipped 行 `backgroundMode: one-shot`；`enableRunInBackground` 未钉死为 false。若有人把同一工具改成 `backgroundMode: continuable`，`mount` 会因缺少 `prepareContinuable` 直接抛。[E: packages/subagent/tool-subagent/src/index.ts:339]

7. **`CodexProvider.start`。** 父 `session.header.cwd` 缺失立刻抛，**不** `spawn`。[E: packages/subagent/subagent-codex/src/index.ts:75] [E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:713] 否则把 `ctx.subprocess.spawn` 与 `model` / `permissionMode` / `env` / `disposeGraceMs` 塞进 `startCodexRun`。[E: packages/subagent/subagent-codex/src/index.ts:101] [E: packages/subagent/subagent-codex/src/index.ts:108]

8. **`startCodexRun`：先校验任务再跨进程。** `textTask(request.prompt)`；request 已 abort 则抛 `aborted before app-server startup`。[E: packages/subagent/subagent-codex/src/run.ts:234] [E: packages/subagent/subagent-codex/src/run.ts:236] 然后 `spec.spawn({ argv: codexAppServerArgv(), cwd, stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }, graceMs, env })`。[E: packages/subagent/subagent-codex/src/run.ts:241] [E: packages/subagent/subagent-codex/src/run.ts:244] argv 是 `[process.execPath, CODEX_PACKAGE_BIN, 'app-server', '--stdio']`，任务文本不进命令行。[E: packages/subagent/subagent-codex/src/run.ts:136] 单测钉死这份 spawn spec（含 `stderr: 'pipe'`）。[E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:1518]

9. **publish 门在 ephemeral thread 之后。** `wire.start()` → `initialize(request.signal)` → `startThread(spec.cwd, request.signal)`，每步和 `processFailure` race。[E: packages/subagent/subagent-codex/src/run.ts:322] [E: packages/subagent/subagent-codex/src/run.ts:323] [E: packages/subagent/subagent-codex/src/run.ts:325] handshake 发 `initialize` + notify `initialized`；`thread/start` 带 `{ cwd, ephemeral: true }` 以及 permission / 可选 model。[E: packages/subagent/subagent-codex/src/wire.ts:268] [E: packages/subagent/subagent-codex/src/wire.ts:279] [E: packages/subagent/subagent-codex/src/wire.ts:291] 任一步失败：摘 abort 监听、`disposeProcess`，再把错误抛出——holder **还没有** run 可 `dispose`。[E: packages/subagent/subagent-codex/src/run.ts:327] 单测：回完 `initialize`、在 `thread/start` 应答前 `published === false`。[E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:1511] [E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:1515]

10. **发布后只跑一 turn。** 成功路径 `settleRunResult` + `subprocessRunHandle` 返回。[E: packages/subagent/subagent-codex/src/run.ts:385] [E: packages/subagent/subagent-codex/src/run.ts:436] `runTurn` 发 `turn/start`，input 是纯 text block；等本 thread/turn 的 `turn/completed`。[E: packages/subagent/subagent-codex/src/wire.ts:321] `phase === 'final_answer'` 覆盖 `lastFinalAnswer`；`phase === null` 当兼容回退；`commentary` 忽略。[E: packages/subagent/subagent-codex/src/wire.ts:668] [E: packages/subagent/subagent-codex/src/wire.ts:670] `contextWindowExceeded` 映射 `stopReason: 'max-tokens'`；其它非 `completed` 在 wire 层 throw，由 `settleRunResult` 拍成永不 reject 的 `error`（若本地已 cancel 则 `aborted`）。[E: packages/subagent/subagent-codex/src/wire.ts:123] [E: packages/subagent/subagent-codex/src/wire.ts:363] [E: packages/subagent/subagent/src/out-of-process.ts:192] 成功但没有非空白答案也 throw（`completed without a final answer`）。[E: packages/subagent/subagent-codex/src/wire.ts:371]

11. **无人值守：不把审批打回父 session。** `item/commandExecution/requestApproval` 与 `item/fileChange/requestApproval` 在 `availableDecisions` 里优先 `cancel`，否则 `decline`。[E: packages/subagent/subagent-codex/src/wire.ts:59] [E: packages/subagent/subagent-codex/src/wire.ts:63] [E: packages/subagent/subagent-codex/src/wire.ts:574] 权限给空的 turn-scoped set；user-input 给空 answers；MCP elicitation `decline`。未知 method 或无法给出合法 unattended 决策会 fail 整次 run。[E: packages/subagent/subagent-codex/src/wire.ts:598] [E: packages/subagent/subagent-codex/src/wire.ts:622]

12. **取消与回收。** 本地 abort 调 `wire.interrupt()`（有 thread/turn id 时 best-effort `turn/interrupt`），再靠 `settleRunResult` 的 `cancelled()` 赢 result race。[E: packages/subagent/subagent-codex/src/run.ts:315] [E: packages/subagent/subagent-codex/src/wire.ts:382] `dispose()` 幂等：摘监听、`requestCancel`、一次 memoized teardown。[E: packages/subagent/subagent/src/out-of-process.ts:252] `localAgent` 为 `undefined`，没有 `ctx.agents` 里的孩子可摘。[E: packages/subagent/subagent/src/out-of-process.ts:249] stderr 走 pipe 再同步写到 host `process.stderr.fd`。[E: packages/subagent/subagent-codex/src/run.ts:266]

## 设计动机

- **官方产品当后端，不复刻 loop。** 孩子是 Codex 自己的 app-server，不是再开一个 DSH `Agent`。所以 `localAgent` 为空、`inheritsParentContext` 为 false、能力旗全关：父无法隔进程执行 `maxDepth` / `persona` / `toolFilter` / `outputSchema` / `agentOptions`。preset 才把 `maxDepth` 写成 `provider-managed`，否则 `tool-subagent` 会在 mount 时因 `!depthLimit` 拒掉。[E: packages/subagent/tool-subagent/src/index.ts:323]
- **one-shot 合同对齐进程寿命。** 一次 `start` = 一个进程 + 一个 ephemeral thread + 一个 turn。没有 `prepareContinuable`，避免把 Codex 会话伪装成可 `send_message` 的 DSH 孩子。
- **publish 推迟到 thread 就绪。** `start()` reject 表示从未交出所有权，调用方没有半拉子 handle。协议失败与 `dispose()` 杀树是两条路径。
- **包内 argv，不靠 PATH。** `codexAppServerArgv` 解析 `@openai/codex` 的 `bin.codex`。[E: packages/subagent/subagent-codex/src/run.ts:52] 任务文本走 JSON-RPC，不拼接进命令行。
- **不进 `dsh-base`。** 生产 `@deepseek-ai/dsh` 吃 base 闭包。把 Codex / Claude 放进 base 等于每个安装都下载可选产品集成。当前合同是：包保留、profile 显式叠 Bundle patch。
- **密钥必须显式。** `env` 叠在 subprocess 先剥再 merge 的 parent env 上。ambient `OPENAI_API_KEY` 会被 credential 形名字剥掉；要给孩子的 key 写进 host 行的 `config.env`。
- **registry 名可 Profile 化。** 同一包可多次 insert，不同 `providerName`（loader fixture 的 `codex-primary` / `codex-secondary`）。[E: packages/subagent/subagent-codex/tests/fixtures/loader/cordis.yml:15]

## Gotcha

- **包存在 ≠ 已安装。** `packages/subagent/subagent-codex/` 在 workspace 里，`dsh-base` 的 insert 与 `dependencies` 都没有它。[E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:47] 不要把「仓库有这个包」读成 preset 成员资格。
- **只启用 tool 不够。** `disabled: true` 的 `tool-subagent-codex` 去掉之后，若 host 没有 `registerProvider('codex')`，工具不会进 catalog；`start('codex')` 是 `NO_PROVIDER`。[E: packages/subagent/tool-subagent/src/index.ts:586] [E: packages/subagent/subagent/src/index.ts:591]
- **不能改成 continuable。** `CodexProvider` 没有 `prepareContinuable`。`backgroundMode: continuable` 会在 tool `mount` 失败。[E: packages/subagent/tool-subagent/src/index.ts:339]
- **数字 `maxDepth` 会在 mount 爆炸。** `capabilities.depthLimit === false`。必须 `provider-managed`（shipped 行已这样写），或别传 cap。[E: packages/subagent/tool-subagent/src/index.ts:323] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:216]
- **父 session 必须有绝对、可进入的 cwd。** 缺 cwd 的诊断不提示「去配 Config.cwd」——那个键不存在。[E: packages/subagent/subagent-codex/src/index.ts:77]
- **`delegation` isolate 不是 Codex 围栏。** `isolate.workflowEngine: true` 只隔离 workflow 引擎；registry 与（若你后来加上的）Codex provider 仍是 host 单例。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:178]
- **Codex thread id 不进父 session。** 父 log 只有这次 tool-call / tool-result；ephemeral thread 随进程树销毁。
- **load 不查 `PATH`。** e2e 在空 `PATH` 下只断言 providers 出现与 `starts: 0`。缺/坏二进制的失败发生在第一次 `start` 的 spawn，不是 plugin load。[E: packages/subagent/subagent-codex/tests/loader-composition.e2e.ts:97]
- **必须 named export。** `default` 会丢掉 Loader 看到的 `inject`。[E: packages/subagent/subagent-codex/tests/subagent-codex.spec.ts:718]
- **无人值守会拒绝授权。** Codex 子进程里的 command / file approval 不会冒泡成 DSH `ctx.approval`。需要人工批的工作不应走这条 backend。`permissionMode: 'never'` 是默认。[E: packages/subagent/subagent-codex/src/run.ts:69]
- **one-shot 仍可能走 jobs。** shipped 行没有 `enableRunInBackground: false`；schema 默认 `true`，模型可传 `run_in_background` 把这次 Codex start 挂到 jobs，那仍不是 continuable。[E: packages/subagent/tool-subagent/src/index.ts:109]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subagent` 的 `SubagentRuntime` / `registerProvider` / `start` | **host** `ctx.subagents`。`dsh-base` 行 `id: subagent`。[E: packages/bundle/base/cordis.patch.yml:334] 本包不是这条缝的 Definition |
| **Provider（本页）** | `@deepseek-ai/dsh-subagent-codex` 的 `CodexProvider`，`apply` → `registerProvider` | 默认名 `'codex'`，可 `providerName`。`inject = ['subagents', 'subprocess']`。**不在** `dsh-base` / 五个 shipped profile overlay / 任一 shipped preset。要出现必须叠本包 `cordis.patch.yml` 或等价 insert |
| **Provider（对照，shipped）** | `subagent-spawn-in-process` / `subagent-fork-in-process` | **host** `providerName: spawn` / `fork`。[E: packages/bundle/base/cordis.patch.yml:340] [E: packages/bundle/base/cordis.patch.yml:345] |
| **Consumer** | `@deepseek-ai/dsh-tool-subagent` 的一个实例 | **preset** `id: tool-subagent-codex`：`provider: codex`、`toolName: subagent_codex`、`disabled: true`。只启用这一行、不 mount Provider → 工具等 `subagent/provider-added`，catalog 仍空。字段表见 [surface.tools.subagent](../../surface/tools/subagent.md) |
| **下游缝** | `ctx.subprocess.spawn` | host `id: subprocess`（`dsh-subprocess-local`）。本 Provider 是 subprocess Consumer，不是 subprocess Provider |

换走 `ctx.subprocess`（例如 E2B）会改 Codex 子进程落在哪台机器；换不换 `ctx.fs` 与本 backend 无关。把第二个同名 `'codex'` 的 provider 再 `registerProvider` 会 `DUPLICATE_PROVIDER`，不会覆盖。

## Sources

- packages/subagent/subagent-codex/src/index.ts
- packages/subagent/subagent-codex/src/run.ts
- packages/subagent/subagent-codex/src/wire.ts
- packages/subagent/subagent-codex/cordis.patch.yml
- packages/subagent/subagent-codex/package.json
- packages/subagent/subagent-codex/tests/subagent-codex.spec.ts
- packages/subagent/subagent-codex/tests/loader-composition.e2e.ts
- packages/subagent/subagent-codex/tests/fixtures/loader/cordis.yml
- packages/subagent/subagent/src/out-of-process.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- vendor/cordis/src/events.ts
- packages/core/tools/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`、host 面 vs preset 面。
- [spine.trace-subagent](../../spine/trace-subagent.md)（`spine.trace-subagent`）：默认 `subagent` → `spawn` 的闭合走读；Codex 只作为「包在仓库、base 不装」的分叉出现。
- [subsys.orchestration.subagent](./subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition；`start` / `startContinuable` / `NO_PROVIDER`。
- [subsys.orchestration.subagent-claude-code](./subagent-claude-code.md)（`subsys.orchestration.subagent-claude-code`）：对称的官方产品后端，名写死 `'claude-code'`，同样不进 base。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host 第一层 insert；钉死没有 Codex / Claude 行。
- [surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）：模型可见 `dsh-tool-subagent`（含 `subagent_codex` 这一实例该怎么配）。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess.spawn`、`scrubbedParentEnv`、杀树。
