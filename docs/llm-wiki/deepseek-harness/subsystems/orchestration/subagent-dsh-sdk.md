---
id: subsys.orchestration.subagent-dsh-sdk
title: DSH SDK 子进程后端
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent-dsh-sdk/src/index.ts
  - packages/subagent/subagent-dsh-sdk/src/run.ts
  - packages/subagent/subagent-dsh-sdk/package.json
  - packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts
  - packages/subagent/subagent-dsh-sdk/tests/loader-composition.e2e.ts
  - examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml
  - examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/out-of-process.ts
  - packages/subagent/subagent/src/lifecycle.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/subagent/subagent-acp/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/sdk/client/src/client.ts
  - packages/sdk/client/src/api.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - SdkSubagentProvider
  - startSdkRun
  - apply
related:
  - spine.overview
  - spine.trace-subagent
  - subsys.orchestration.subagent
  - subsys.orchestration.subagent-acp
  - surface.tools.subagent
  - subsys.execution.subprocess
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-subagent-dsh-sdk` 是 **host 面、overlay-only** 的进程外 `SubagentProvider`：每个孩子是一份独立的 DeepSeek Harness runtime，由 `@deepseek-ai/dsh-sdk-client` 在 stdio JSON-RPC 上拉起并驱动。它**不在** shipped `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset；`inject` 只有 `subagents`，**不**走 `ctx.subprocess.spawn`。

## 能回答的问题

- `dsh-sdk` 后端装进默认 `dsh web` 了吗？包存在是否等于 shipped？
- 子进程是谁 `spawn` 的？为什么 ACP / Codex / Claude Code 走 `ctx.subprocess`，本包不走？
- 孩子默认 `provider` / `model` 是什么？和父会话的 `ctx.llm` 路由有没有共享？
- 父 namespace 的 `SubagentRun.id` 和孩子 runtime 里的 session id 是不是同一个？
- 能不能 `startContinuable`？`backgroundMode: continuable` 的 `tool-subagent` 挂到本 provider 会怎样？
- 本包有没有自己的 waterfall / isolate？父 turn 的 `tools/pre-execute` 还要不要 `next()`？

## 职责边界

本包拥有：名为 `SdkSubagentProvider` 的 **Provider** 实现、load-time `Config`（`command` 必填）、以及 `startSdkRun` 这一次 one-shot 子 runtime 的握手 / 取消 / 结算 / `harness.close()` 回收。插件名是 `subagent-dsh-sdk`，`inject` **只有** `['subagents']`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:25] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:26] 包清单是 `@deepseek-ai/dsh-subagent-dsh-sdk`。[E: packages/subagent/subagent-dsh-sdk/package.json:2]

**不在 shipped 组合。** `dsh-base` 的 subagent 组只 insert `id: subagent` + `subagent-spawn-in-process`（`providerName: spawn`）+ `subagent-fork-in-process`（`providerName: fork`）。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:298] [E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/cordis.patch.yml:303] 对应 `dependencies` 是 `@deepseek-ai/dsh-subagent` / `dsh-subagent-fork-in-process` / `dsh-subagent-spawn-in-process`，没有 `@deepseek-ai/dsh-subagent-dsh-sdk`。[E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] `dsh-web-app` / `dsh-headless` 的 manifest 与 shipped `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 同样没有本包 id / 依赖名。[I] in-repo 的真 Loader 组合写在 example fixture：`id: subagent-dsh-sdk` → `@deepseek-ai/dsh-subagent-dsh-sdk`。[E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml:17] [E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml:18]

本包**不**拥有：

- `ctx.subagents` Definition、`registerProvider`、`start` / `startContinuable` 门控 — [subsys.orchestration.subagent](./subagent.md)（`subsys.orchestration.subagent`）。
- 模型可见 `subagent` 工具 schema / `backgroundMode` 路由 — [surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）。
- `ctx.subprocess` 与 local spawn 实现 — [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）。ACP 才 `inject = ['subagents', 'subprocess']` 并把 `ctx.subprocess.spawn` 交给孩子。[E: packages/subagent/subagent-acp/src/index.ts:24]
- 孩子进程内部的 composition（孩子自己的 `cordis.yml`、自己的 `ctx.llm`、自己的 tools）。fixture 孩子挂 `@deepseek-ai/dsh-sdk-jsonrpc-server`。[E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml:5] [E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml:6]
- jobs、fork seed、in-process `applyChildComposition`。本 provider `inheritsParentContext = false`，不读父对话。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:96]

**host 面 vs agent-preset 面。** Provider 登记在加载它的 Context 上（overlay 通常是 host / root realm）。默认产品路径 `dsh web` 的 host 只带 `spawn` / `fork`；`standard` preset 的 `tool-subagent` 指向 `provider: spawn`，不会凭空看见 `dsh-sdk`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:186] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:189] 要把本后端接到模型，必须另挂一条 `dsh-tool-subagent` 且 `config.provider` 等于本包的 `providerName`（默认 `dsh-sdk`）。[E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml:29] 浏览器 client 不执行 `start()`。

**没有 isolate。** 本包不声明 isolate 服务，shipped preset 也不把本行 remount 进会话 realm。example fixture 同样没有 `isolate:` 块。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent-dsh-sdk/src/index.ts` | 插件：`name` / `inject` / `Config` / `apply` / `SdkSubagentProvider` |
| `packages/subagent/subagent-dsh-sdk/src/run.ts` | `startSdkRun`、`sdkStopReason`、`SdkRunSpec`；构造 `DeepSeekHarness` |
| `packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts` | 真 stdio + fake runtime：handshake、env scrub、双 id、无 default export |
| `packages/subagent/subagent-dsh-sdk/tests/loader-composition.e2e.ts` | 真 Loader + 孩子 `child.cordis.yml`：cwd 继承 |
| `examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml` | overlay 真树：省略 `providerName`，工具钉 `provider: dsh-sdk` |
| `examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml` | 被拉起的完整子 runtime |
| `packages/sdk/client/src/client.ts` | `HarnessClient.start()`：`node:child_process.spawn` |
| `packages/sdk/client/src/api.ts` | `DeepSeekHarness`：孩子 `initialize` 的 provider/model 回落 |
| `packages/subagent/subagent/src/out-of-process.ts` | `NO_START_CAPABILITIES`、`resolveChildCwd`、`settleRunResult`、`subprocessRunHandle` |
| `packages/bundle/base/cordis.patch.yml` | shipped host 只有 spawn/fork，没有本行 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Config` | `command` **必填**。`providerName` 默认 `'dsh-sdk'`；`provider` 默认 `'deepseek-official'`；`model` 默认 `'deepseek-v4-flash'`；`args` / `env` 默认空。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:72] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:73] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:76] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:77] |
| `cwd?` / `maxTokens?` | 无 schemastery 默认。`cwd` 在 load 时 `validateConfiguredCwd`；省略则每个 `start` 继承父 session header 的 workspace。 |
| 时限 | `shutdownTimeoutMs` 默认 `1000`；`disposeEofGraceMs` 默认 `6000`；`disposeGraceMs` 默认 `3000`。`apply` 再 `assertPositiveFinite`。 |
| `SdkSubagentProvider` | `capabilities = NO_START_CAPABILITIES`（`outputSchema` / `depthLimit` / `toolFilter` / `persona` 全 `false`）；`inheritsParentContext = false`。类上**没有** `prepareContinuable` 方法。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:94] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:96] |
| `SdkRunSpec` | 已解析的 spawn 规格：`command` / `args` / `cwd` / `provider` / `model` / 可选 `maxTokens` / `env` / 三个时限 / 可选 `onError`。 |
| `SubagentRun.id` | 父 namespace：`SessionId(randomUUID())`，在 `startSdkRun` 里铸造，交给 `subprocessRunHandle`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:116] |
| 子 runtime session id | 握手成功后另铸 `session-${uuid-without-dashes}`，只出现在 JSON-RPC wire 与孩子进程内。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:165] |
| `localAgent` | 恒 `undefined`：进程外孩子在父 `ctx.agents` 里没有 live `Agent`。[E: packages/subagent/subagent/src/out-of-process.ts:205] |
| `sdkStopReason` | 孩子 `turn/end`：`completed` / `max-tokens` / `aborted` 原样映射；其余（含缺 reason）走 `default` → `'error'`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:81] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:83] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:85] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:90] |

本包**不**声明 Cordis `Events`，不挂 `llm/stream` 或 `tools/pre-execute` waterfall。

## 控制流

1. Overlay 加载 `apply@packages/subagent/subagent-dsh-sdk/src/index.ts`。schemastery 填完默认后，校验三个时限与可选 `maxTokens`，再 `validateConfiguredCwd`（相对路径按 harness 启动目录解析一次；空字符串抛错）。最后 `ctx.subagents.registerProvider(new SdkSubagentProvider(...))`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:133] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:137]

2. `registerProvider@packages/subagent/subagent/src/index.ts` 是 Cordis `ctx.effect()`：重名抛 `DUPLICATE_PROVIDER`；yield 的 disposer 只 `providers.delete` 并 `subagent/provider-removed`，已经返回给 holder 的 run 不撤回。登记成功后 `ctx.emit('subagent/provider-added', provider)`（普通 emit，不是 waterfall）。[E: packages/subagent/subagent/src/index.ts:372] [E: packages/subagent/subagent/src/index.ts:374] [E: packages/subagent/subagent/src/index.ts:383]

3. Consumer 若挂了 `dsh-tool-subagent` 且 `config.provider` 对上 `providerName`，会在 `provider-added` 时 `ctx.tools.register`。fixture 把 `maxDepth` 设成 `'provider-managed'`：本 provider `depthLimit === false`，数值 cap 会在 mount 期就抛。[E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml:33] [E: packages/subagent/tool-subagent/src/index.ts:285] `backgroundMode: continuable` 且 `prepareContinuable === undefined` 同样在 mount 失败，不会拖到第一次调用。[E: packages/subagent/tool-subagent/src/index.ts:292]

4. 父 Agent 的模型 tool-call 仍走 `tools/pre-execute` **waterfall**。`Events.waterfall@vendor/cordis/src/events.ts` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，`tool-subagent.execute` 到不了。[E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] 本后端自己不注册这条 waterfall。

5. 前台 / one-shot Job 进入 `SubagentRuntime.start@packages/subagent/subagent/src/index.ts`：`expectProvider` → `assertCapabilities` → one-shot `snapshotSubagentDescriptor` → `provider.start` → `observeRun`。请求带了 `outputSchema` / `maxDepth` / `toolFilter` / `persona` 任一字段，本 provider 全 false，立刻 `UNSUPPORTED_CAPABILITY`，**不会**进 `startSdkRun`。[E: packages/subagent/subagent/src/index.ts:415] [E: packages/subagent/subagent/src/index.ts:489]

6. `SdkSubagentProvider.start` 组 `SdkRunSpec`：`cwd` 用 `resolveChildCwd('subagent-dsh-sdk', config.cwd, request.parent.session.header.cwd)`——配置覆盖优先，否则父 session workspace；两边都没有就抛 `no working directory for the child`。父 Cordis 上下文只读这一项。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:104] [E: packages/subagent/subagent/src/out-of-process.ts:116] 然后 `return startSdkRun(request, spec)`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:118]

7. `startSdkRun@packages/subagent/subagent-dsh-sdk/src/run.ts`：信号已经 abort 则**立刻抛**，连 `DeepSeekHarness` 都不建（单测用 `touch <sentinel>` 证明进程没起来）。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:113] [E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:288] 否则先铸父 namespace `id = SessionId(randomUUID())`，再 `new DeepSeekHarness({ launch: { command, args, cwd, env, …timeouts }, cwd, provider, model, maxTokens? })`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:116] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:118]

8. 子环境是 `{ ...scrubbedParentEnv(), ...spec.env }`：先剥 credential 形名字与全部 `DSH_*`，再合并显式 `config.env`（例如孩子自己的 `DEEPSEEK_API_KEY`）。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:123] [E: packages/subprocess/subprocess/src/index.ts:60] 单测：ambient `DSH_TEST_AMBIENT_SECRET_KEY` 到不了孩子，显式 `DEEPSEEK_API_KEY` 能到。[E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:141] [E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:142]

9. **文档化的 subprocess 例外。** `await harness.start()` 触发 SDK client 自己的进程生命周期，不是 `ctx.subprocess.spawn`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:150] `HarnessClient.start@packages/sdk/client/src/client.ts` 调 `node:child_process` 的 `spawn(command, args, { cwd, env, stdio: ['pipe','pipe','pipe'] })`。[E: packages/sdk/client/src/client.ts:206] `DeepSeekHarness.start` 先 `clientInstance.start()` 再 `initialize`，把 `cwd` / `provider` / `model` / 可选 `maxTokens` 交给孩子 runtime。[E: packages/sdk/client/src/api.ts:65] [E: packages/sdk/client/src/api.ts:66] 握手失败：摘 abort 监听、`harness.close()` 回收尚未发布的进程，再把错误抛给 `start()` 的调用方——此时没有 `SubagentRun` 可 `dispose`，也没有 `subagent/start`。

10. 握手成功后才铸 `childSessionId`，用 `AssistantOutputFold` 订阅 `session.event`，`settleRunResult` 包住 `harness.session(childSessionId).run(prompt)`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:165] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:180] 发布句柄走 `subprocessRunHandle`：`localAgent: undefined`，`dispose` 幂等，先本地 `requestCancel` 再 `teardown: () => harness.close()`。wire 上没有 prompt-cancel；取消只在父侧结算，再靠 shutdown + EOF/SIGTERM/SIGKILL 梯子拆孩子。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:198] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:204] `observeRun` 先挂 `result` 的 `subagent/end`，再同步 `subagent/start`。[E: packages/subagent/subagent/src/lifecycle.ts:147] [E: packages/subagent/subagent/src/lifecycle.ts:160]

11. 孩子默认路由来自本包 `Config`：`provider: 'deepseek-official'`、`model: 'deepseek-v4-flash'`。`startSdkRun` 把这两项原样放进 `DeepSeekHarness`；SDK 构造器在调用方省略时用同一对回落，但本路径总会传入已解析的 Config。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:129] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:130] [E: packages/sdk/client/src/api.ts:40] [E: packages/sdk/client/src/api.ts:41] 孩子进程有自己的 composition 与 adapter 表，**不**复用父 `ctx.llm` 的 `adapters` map。

12. **无 continuable。** `SubagentProvider.prepareContinuable?` 是可选方法，方法在不在就是能力。[E: packages/subagent/subagent/src/types.ts:323] `SdkSubagentProvider` 只实现 `start`。`SubagentRuntime.prepareContinuable` 发现 `undefined` 就抛 `UNSUPPORTED_CAPABILITY`（文案含 `no prepareContinuable capability`），在 continuation manager 预留任何孩子资源之前拒绝。[E: packages/subagent/subagent/src/index.ts:438] [E: packages/subagent/subagent/src/index.ts:441] `startContinuable` 只转给 manager，不会改走 `provider.start`。[E: packages/subagent/subagent/src/index.ts:212]

13. 两次 `start` 得到两个父 namespace `run.id`。单测：`nextRun.id !== run.id`，且 `run.localAgent` 为 `undefined`。[E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:92] [E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:102]

14. 插件必须是 named export：`name` / `inject` / `apply` / `Config`；`default` 为 `undefined`。Loader 若吃 default export 会丢掉 `inject`，`ctx.subagents` 还没就绪就会装失败。[E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:476] [E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:480]

## 设计动机

- **完整第二份 runtime，不是同进程再开一个 `Agent`。** in-process `spawn` / `fork` 共享父 Cordis 树、只换 session；本后端跨进程，孩子的 `cordis.yml` 自己决定 tools / model / persistence。父侧唯一继承的是 workspace cwd（或 load-time `cwd` 覆盖）。
- **SDK client 拥有传输，所以不进 `ctx.subprocess`。** `HarnessClient` 必须独占 stdio 帧、EOF 安静窗口和自己的杀树梯子。若再包一层 `ctx.subprocess.spawn`，两套生命周期会抢 stdin / 退出边。subprocess 缝把 `scrubbedParentEnv` 做成可独立 import 的纯函数，正是给这类 SDK 托管传输用的。ACP / Codex / Claude Code 是普通 CLI stdio，走 `ctx.subprocess`。
- **双 id。** 父 `SubagentRun.id` 给 `subagent/start`、工具 structured value、jobs 关联；孩子 session id 是 JSON-RPC `session/prompt` 的钥匙。混用会让 `listChildren` 和孩子自己的 jsonl 对不上。
- **能力全 false + 无 `prepareContinuable`。** 进程外孩子无法替父执行 `outputSchema` / `maxDepth` / `toolFilter` / `persona`，也不能把父 continuation manager 的 Activation 接到一份远端 runtime。缺能力就拒绝，不静默忽略。
- **先握手再发布。** 启动失败必须在没有 run handle 的情况下自己 reap；发布之后 `result` 不得 reject，失败压成 `stopReason`。

相对 Codex / Claude：那两家也是进程外、也无 continuable，但走 `ctx.subprocess` 拉第三方 CLI，而且 **连 `dsh-base` 行都没有**。本包同样不在 base，差别是孩子仍是一份 DSH runtime，协议是本仓 SDK JSON-RPC。相对 ACP：ACP 也 overlay-only、也 `localAgent === undefined`，但 `inject` 含 `subprocess`。相对 in-process spawn：spawn 在 shipped base 里，有 `prepareContinuable(): {}`，孩子是同进程新 session。

## Gotcha

- 包在仓库里 ≠ 默认产品有这条后端。只启用 `tool-subagent` 而不 overlay 本包，`ctx.subagents.start('dsh-sdk')` 是 `NO_PROVIDER`。
- `command` 没有默认值。漏配会在 Loader 校验失败，不是第一次 `start` 才爆。
- 省略 `cwd` 时，父 session header 必须有可进入的绝对 workspace；不能回落到 harness 进程启动目录（一个 host 服务多个 session）。[E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:471]
- ambient `DSH_*` 会被剥光。孩子若靠 `DSH_CORDIS_CONFIG` / `DSH_HOME` 找自己的树，必须写进 `config.env`。
- 没有 wire 级 prompt cancel。`signal` abort 或 `dispose` 只在父侧把 `result` 打成 `aborted`，再 `harness.close()`；孩子可能仍会再跑一会儿直到梯子拆完。
- `sdkStopReason(undefined)` 与 `interrupted` 都是 `'error'`，不会报 `completed`。[E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:83]
- 畸形 `session/prompt` 回执会让 `settleRunResult` 走 `error`，且 **不**把尚未归属的 stream 文本算进 output。
- fiber dispose 只注销 provider（HMR），不杀已经 `start` 出去的孩子；holder 必须自己 `run.dispose()`。[E: packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts:382]
- 不要给本 provider 配 `backgroundMode: continuable`。正确的 Consumer 配法是 one-shot（前台等 `result`，或 `jobs.start` 包一层 `ctx.subagents.start`）。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subagent` 的 `SubagentRuntime` | `ctx.subagents`。**host**：`dsh-base` `id: subagent`。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-subagent-dsh-sdk` 的 `SdkSubagentProvider`（默认 registry 名 `dsh-sdk`） | **不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。overlay：`id: subagent-dsh-sdk`，`inject = ['subagents']` |
| **Provider（对照，走 subprocess）** | `dsh-subagent-acp` / `dsh-subagent-codex` / `dsh-subagent-claude-code` | `inject` 含 `subprocess`。ACP 同样 example-only；Codex/Claude **也**不在 base |
| **Provider（对照，shipped）** | `dsh-subagent-spawn-in-process` / `dsh-subagent-fork-in-process` | **host**：`id: subagent-spawn-in-process` / `subagent-fork-in-process` |
| **传输库（非 Cordis 插件）** | `@deepseek-ai/dsh-sdk-client` 的 `DeepSeekHarness` / `HarnessClient` | 不登记 `ctx.*`。`HarnessClient.start` 自己 `spawn` |
| **Consumer** | `@deepseek-ai/dsh-tool-subagent`，`config.provider` 必须等于本 provider 名 | fixture：`provider: dsh-sdk`、`toolName: subagent`、`maxDepth: 'provider-managed'`。shipped `standard` 的同工具指向 `spawn`，不是本页 |
| **env 政策（函数，不是服务）** | `scrubbedParentEnv`（`@deepseek-ai/dsh-subprocess`） | 本包 import 函数，不 `inject` `ctx.subprocess` |

换这条 Provider = 在组合树上 **新增** overlay 行并另挂一条指向 `dsh-sdk` 的 tool，不是改 `dsh-base` 里已有的 spawn 行。同名再 `registerProvider` 会 `DUPLICATE_PROVIDER`，不会覆盖。

## Sources

- packages/subagent/subagent-dsh-sdk/src/index.ts
- packages/subagent/subagent-dsh-sdk/src/run.ts
- packages/subagent/subagent-dsh-sdk/package.json
- packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts
- packages/subagent/subagent-dsh-sdk/tests/loader-composition.e2e.ts
- examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml
- examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/out-of-process.ts
- packages/subagent/subagent/src/lifecycle.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/subagent/subagent-acp/src/index.ts
- packages/subprocess/subprocess/src/index.ts
- packages/sdk/client/src/client.ts
- packages/sdk/client/src/api.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`，host 面 vs preset 面。
- [spine.trace-subagent](../../spine/trace-subagent.md)（`spine.trace-subagent`）：默认 shipped 路径是 in-process `spawn`，不是本 SDK 后端。
- [subsys.orchestration.subagent](./subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition、`start` / `startContinuable`、`registerProvider`。
- [subsys.orchestration.subagent-acp](./subagent-acp.md)（`subsys.orchestration.subagent-acp`）：同样 overlay-only 的进程外后端，但走 `ctx.subprocess` + ACP stdio。
- [surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）：模型可见委托工具；Consumer 行把 `provider` 指到 `dsh-sdk` 才会打到本页。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess` 与 `scrubbedParentEnv`；本页是 SDK 托管传输例外。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 只装 spawn/fork，不装本包。
