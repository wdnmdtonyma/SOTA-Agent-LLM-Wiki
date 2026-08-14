---
id: subsys.orchestration.subagent-acp
title: ACP 子代理后端
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent-acp/src/index.ts
  - packages/subagent/subagent-acp/src/run.ts
  - packages/subagent/subagent/src/out-of-process.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/types.ts
  - packages/subagent/subagent/src/lifecycle.ts
  - packages/subagent/subagent-acp/tests/subagent-acp.spec.ts
  - packages/subagent/subagent-acp/tests/loader-composition.e2e.ts
  - examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml
  - examples/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - vendor/loader/src/index.ts
  - vendor/cordis/src/events.ts
  - packages/subagent/subagent-dsh-sdk/src/index.ts
symbols:
  - AcpProvider
  - providerName
  - apply
  - startAcpRun
  - inject
related:
  - spine.overview
  - subsys.orchestration.subagent
  - subsys.orchestration.subagent-dsh-sdk
  - spine.trace-subagent
  - surface.tools.subagent
  - subsys.execution.subprocess
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-subagent-acp` 是 **example-only** 的进程外 subagent Provider：`AcpProvider` 经 `ctx.subprocess.spawn` 拉起讲 Agent Client Protocol（ACP）stdio 的子进程，默认 registry 名 `acp`。它不进 `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset，也不是 `dsh web` 的默认委托后端。

## 能回答的问题

- `dsh-subagent-acp` 在不在 shipped bundle / preset 里？仓库里哪份 yml 才真正挂 `id: subagent-acp`？
- `AcpProvider` 怎么用 `ctx.subprocess` 与 ACP stdio 跑完一次 one-shot？`localAgent` 为什么恒为 `undefined`？
- 为什么没有 `prepareContinuable`？`startContinuable('acp', …)` 会得到什么错误码？
- `command` 为什么是必填？default export 会丢掉什么 loader 元数据？
- capabilities 全 `false` 之后，带 `maxDepth` / `persona` / `toolFilter` / `outputSchema` 的 `start` 在哪一层被拒？
- 本包和 `dsh-subagent-dsh-sdk` 的 spawn 路径差在 `inject` 的哪一项？

## 职责边界

本包拥有 **host 面** 的一份 named `SubagentProvider`：`apply` 校验 Config，再 `ctx.subagents.registerProvider(new AcpProvider(…))`。[E: packages/subagent/subagent-acp/src/index.ts:173] [E: packages/subagent/subagent-acp/src/index.ts:188] 插件名 `subagent-acp`，`inject = ['subagents', 'subprocess']`——子进程必须走 `ctx.subprocess.spawn`，不能自己 `child_process.spawn`。[E: packages/subagent/subagent-acp/src/index.ts:23] [E: packages/subagent/subagent-acp/src/index.ts:24] [E: packages/subagent/subagent-acp/src/index.ts:162]

它**不**拥有：

- `ctx.subagents` Definition、`start` / `startContinuable` 门控、descriptor / lifecycle 词汇 — [`subsys.orchestration.subagent`](subagent.md)（`subsys.orchestration.subagent`）。
- 模型可见 `subagent` 工具 schema 与 `backgroundMode` — [`surface.tools.subagent`](../../surface/tools/subagent.md)（`surface.tools.subagent`）。本页只写 Provider 名与 capability 广告。
- `ctx.subprocess` 的 scrub / 树级 teardown — [`subsys.execution.subprocess`](../execution/subprocess.md)（`subsys.execution.subprocess`）。本包是 Consumer：把 `spawn` 函数塞进 `AcpRunSpec`。
- 另一条进程外 DSH 子 runtime（SDK client 自己拉起进程，`inject` 只有 `subagents`）— [`subsys.orchestration.subagent-dsh-sdk`](subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:26]
- shipped 默认委托后端。`dsh-base` 只 insert `subagent` + `subagent-spawn-in-process` + `subagent-fork-in-process`，`dependencies` 也只有这三家，没有 `@deepseek-ai/dsh-subagent-acp`。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] [E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] `dsh-web-app` / `dsh-headless` 的 patch 与 manifest 同样没有本包。`standard` preset 的委托工具钉 `provider: spawn`，不是 `acp`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:189] workspace 里声明本包的是 `examples/package.json`。[E: examples/package.json:75] 真实挂载行在 example fixture：`id: subagent-acp` / `name: '@deepseek-ai/dsh-subagent-acp'`。[E: examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml:17] [E: examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml:18]

**host 面 vs agent-preset 面。** `AcpProvider` 一旦加载就写进程级 `ctx.subagents` 表，和 spawn / fork 一样是 host 单例。它目前只出现在 example / 测试 composition，不进 shipped host 树，也没有 preset `isolate` remount。默认产品路径仍是 `dsh web` 本地 Web GUI；本仓没有 shipped TUI。`examples/acp-agent/cordis.yml` 是 **被 spawn 的 ACP 子服务器** 自己的组合（stdout 走 JSON-RPC），不是父进程挂 `AcpProvider` 的那份树。

**没有 waterfall，没有 isolate。** 本包不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `subagents` / `subprocess`、缺 `command` 拒载、capability 拒 `start`。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] 父工具管线的 `tools/pre-execute` 属于 Consumer / loop，不在本包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent-acp/src/index.ts` | named export 插件：`name` / `inject` / `Config` / `apply`；`AcpProvider` |
| `packages/subagent/subagent-acp/src/run.ts` | `startAcpRun`：spawn、ACP handshake、`session/prompt`、dispose 阶梯 |
| `packages/subagent/subagent/src/out-of-process.ts` | 进程外后端词汇：`NO_START_CAPABILITIES`、`subprocessRunHandle`（`localAgent: undefined`） |
| `packages/subagent/subagent/src/index.ts` | Definition：`registerProvider` / `start` / `prepareContinuable` 门 |
| `packages/subagent/subagent/src/types.ts` | `SubagentProvider.prepareContinuable?`（方法在场才是 continuable 能力） |
| `examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml` | 唯一真实 fixture：父树挂本包 + `tool-subagent` `provider: acp` |
| `packages/subagent/subagent-acp/tests/subagent-acp.spec.ts` | named export、capabilities、cwd、permission、cancel、result 不 reject |
| `packages/subagent/subagent-acp/tests/loader-composition.e2e.ts` | Loader 真树：省略 `cwd` 时子进程与 ACP session 都继承父 session workspace |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AcpProvider` | `implements SubagentProvider`。`name` 来自 Config `providerName`（默认 `'acp'`）。`inheritsParentContext = false`。只有 `start`，没有 `prepareContinuable`。[E: packages/subagent/subagent-acp/src/index.ts:67] [E: packages/subagent/subagent-acp/src/index.ts:149] |
| `capabilities` | 四个 start 旗标全 `false`：`outputSchema` / `depthLimit` / `toolFilter` / `persona`。与 `NO_START_CAPABILITIES` 同值，但本包内联写出，不 import 该常量。[E: packages/subagent/subagent-acp/src/index.ts:147] [E: packages/subagent/subagent/src/out-of-process.ts:26] |
| `Config.command` | **必填**。schemastery `z.string().required()`；没有默认可执行文件。[E: packages/subagent/subagent-acp/src/index.ts:68] |
| `Config.args` / `env` / `permission` | `args` 默认 `[]`；`env` 默认 `{}`，在 subprocess scrub 之后合并（可显式回填孩子自己的 `DEEPSEEK_API_KEY` 或 `DSH_*`）；`permission` 默认 `'reject'`，或 `'allow'` 选第一条 `allow_once` / `allow_always`。[E: packages/subagent/subagent-acp/src/index.ts:69] [E: packages/subagent/subagent-acp/src/index.ts:71] |
| `Config.cwd` | 可选覆盖。空字符串在 load 时抛；相对路径按 harness 启动目录 `resolve` 一次。省略则 `start` 时读 `request.parent.session.header.cwd`。[E: packages/subagent/subagent-acp/src/index.ts:180] [E: packages/subagent/subagent-acp/src/index.ts:134] |
| `AcpRunSpec` | `startAcpRun` 的全量入参：`command` / `args` / `cwd` / `permission` / `env` / 两档 dispose grace / `spawn` / 可选 `onError`。无默认。 |
| `SubagentRun` | `id` 是父命名空间 `SessionId(randomUUID())`；`localAgent: undefined`；`result` 在发布后把子失败压成 `stopReason`，不 reject。[E: packages/subagent/subagent-acp/src/run.ts:204] [E: packages/subagent/subagent-acp/src/run.ts:355] |
| `PermissionPolicy` | `'allow' \| 'reject'`。没有第三条「问人」；`session/request_permission` 在 Client callback 里自动答完。 |
| dispose grace | `disposeEofGraceMs` 默认 `6000`（stdin EOF 窗口）；`disposeGraceMs` 默认 `3000`（随后 `terminate()` 的 SIGTERM→SIGKILL）。必须是 `0 < n ≤ MAX_TIMER_DELAY_MS`。[E: packages/subagent/subagent-acp/src/run.ts:89] [E: packages/subagent/subagent-acp/src/run.ts:92] |

`examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml` 把 `maxDepth` 写成 `'provider-managed'`，因为 ACP 广告没有 `depthLimit`，数字默认 `3` 会被 Definition 在 `start` 前拒掉。[E: examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml:35]

## 控制流

1. Loader 用 named export 加载本包。`unwrapExports` 取 `exports.default ?? exports`；若写成 `export default { apply }`，`name` / `inject` 会丢，`subagents` / `subprocess` 等不到。[E: vendor/loader/src/index.ts:194] 测试钉死 `'default' in acp` 为 false，且 `inject` 等于 `['subagents', 'subprocess']`。[E: packages/subagent/subagent-acp/tests/subagent-acp.spec.ts:880] [E: packages/subagent/subagent-acp/tests/subagent-acp.spec.ts:882]

2. `apply@packages/subagent/subagent-acp/src/index.ts` 校验两档 dispose grace，拒绝空 `cwd`，把相对 `cwd` 收成绝对可进入目录，然后 `registerProvider`。[E: packages/subagent/subagent-acp/src/index.ts:176] [E: packages/subagent/subagent-acp/src/index.ts:188] `SubagentRuntime.registerProvider@packages/subagent/subagent/src/index.ts` 是 `ctx.effect()`：重名 `DUPLICATE_PROVIDER`；fiber dispose 只挡住新 `start`，已交给 holder 的 run 不撤回。[E: packages/subagent/subagent/src/index.ts:372] [E: packages/subagent/subagent/src/index.ts:374] [E: packages/subagent/subagent/src/index.ts:378]

3. 模型侧 Consumer（同一 fixture 里的 `dsh-tool-subagent`，`provider: acp`）在 `subagent/provider-added` 后才 `ctx.tools.register`。那是 emit，不是 waterfall。字段表不在本页。[E: examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml:31]

4. 前台 / one-shot 走 `SubagentRuntime.start@packages/subagent/subagent/src/index.ts`：`expectProvider` → `assertCapabilities` → one-shot descriptor → `await provider.start(resolved)` → `observeRun`。[E: packages/subagent/subagent/src/index.ts:415] [E: packages/subagent/subagent/src/index.ts:416] [E: packages/subagent/subagent/src/index.ts:425] 请求里只要出现 `outputSchema` / `maxDepth` / `toolFilter` / `persona`，ACP 的全 false 广告就抛 `UNSUPPORTED_CAPABILITY`，不会进 `startAcpRun`。[E: packages/subagent/subagent/src/index.ts:489]

5. `AcpProvider.start` 组 `AcpRunSpec`：`spawn: spec => this.ctx.subprocess.spawn(spec)`，`onError` 打到 `ctx.logger.warn`，再 `return startAcpRun(request, spec)`。[E: packages/subagent/subagent-acp/src/index.ts:162] [E: packages/subagent/subagent-acp/src/index.ts:169]

6. `startAcpRun@packages/subagent/subagent-acp/src/run.ts`：信号已 abort 则立刻抛，**不 spawn**。[E: packages/subagent/subagent-acp/src/run.ts:200] 生命周期 id 在父进程 `SessionId(randomUUID())` 铸造——ACP 子服务器里的 `sessionId` 只在那个进程内唯一，不能当 `SubagentRun.id`。[E: packages/subagent/subagent-acp/src/run.ts:204] 测试用 `MOCK_SESSION_ID: 'acp-child-session'` 时 `run.id` 不等于该字符串。[E: packages/subagent/subagent-acp/tests/subagent-acp.spec.ts:391]

7. `spec.spawn` 拉起孩子：`argv = [command, ...args]`，`stdio = { stdin: 'pipe', stdout: 'pipe', stderr: 'inherit' }`，`graceMs = disposeGraceMs`，`env` 叠在 scrub 之后。[E: packages/subagent/subagent-acp/src/run.ts:209] [E: packages/subagent/subagent-acp/src/run.ts:212] 协议是 `@agentclientprotocol/sdk` 的 `ClientSideConnection` + `ndJsonStream` 绑在这两根 pipe 上。

8. 发布句柄之前必须完成 handshake：`conn.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} })`——不广告 fs / terminal；孩子在自己的进程里自给。[E: packages/subagent/subagent-acp/src/run.ts:297] [E: packages/subagent/subagent-acp/src/run.ts:301] 然后 `conn.newSession({ cwd: spec.cwd, mcpServers: [] })`，返回值缺少 string `sessionId` 则 reap 子进程再 reject。[E: packages/subagent/subagent-acp/src/run.ts:303] [E: packages/subagent/subagent-acp/src/run.ts:305] 启动期失败（含 spawn 失败、握手中 abort）走 `disposeProcess` 后 **reject** `start()`，此时还没有 published run。

9. handshake 成功才返回 `SubagentRun`：`localAgent: undefined`。[E: packages/subagent/subagent-acp/src/run.ts:355] `observeRun` 把 `local: run.localAgent !== undefined` 打进 `subagent/start`，因此 ACP 的 `local` 恒 false，进不了「有本地 child session」的枚举路径。[E: packages/subagent/subagent/src/lifecycle.ts:143] 词汇上这与 `subprocessRunHandle` 相同。[E: packages/subagent/subagent/src/out-of-process.ts:205]

10. 已发布之后 `conn.prompt({ sessionId, prompt: toAcpPrompt(request.prompt) })`。非 text 的 harness block 会被丢掉；只有 `agent_message_chunk` 的 text 进入 `AssistantOutputFold`。thought / tool call / plan 被消费但不进 `result.output`。[E: packages/subagent/subagent-acp/src/run.ts:329] [E: packages/subagent/subagent-acp/src/run.ts:176]

11. 孩子的 `session/request_permission` 由 Client callback 按 `permission` 自动答：`allow` 选第一条 `allow_once`/`allow_always`，否则（含默认 `reject`）回 `cancelled`。没有人机审批面。[E: packages/subagent/subagent-acp/src/run.ts:256] [E: packages/subagent/subagent-acp/src/run.ts:262]

12. `acpStopReason`：`end_turn`→`completed`，`max_tokens`→`max-tokens`，`refusal`→`refusal`，`cancelled`→`aborted`，`max_turn_requests` 与未知变体→`error`（绝不假装完成）。[E: packages/subagent/subagent-acp/src/run.ts:137] [E: packages/subagent/subagent-acp/src/run.ts:149] 发布后的 transport / 子崩溃进入 `catch`：若已 cancel 则 `aborted`，否则 `onError` 后 `stopReason: 'error'`。`onError` 自己抛也会被吞，保证 `result` 不 reject。[E: packages/subagent/subagent-acp/src/run.ts:342]

13. `dispose` 幂等：摘 abort listener、`requestCancel`（best-effort `session/cancel`）、再 `disposeAcpChild`——先 `stdin.end()` 等整棵树在 `eofGraceMs` 内退出，否则 `terminate()`（POSIX SIGTERM→grace→SIGKILL）并 `waitForExit`。[E: packages/subagent/subagent-acp/src/run.ts:357] [E: packages/subagent/subagent-acp/src/run.ts:114] [E: packages/subagent/subagent-acp/src/run.ts:121]

14. **Continuable 进不来。** `prepareContinuable` 在 `SubagentProvider` 上是可选方法，方法在场才是能力。[E: packages/subagent/subagent/src/types.ts:323] `AcpProvider` 没有这个方法。`SubagentRuntime.prepareContinuable` 见到 `undefined` 就抛 `UNSUPPORTED_CAPABILITY`（文案含 `no prepareContinuable capability`），manager 不会给 ACP 建 Activation。[E: packages/subagent/subagent/src/index.ts:438] [E: packages/subagent/subagent/src/index.ts:442] shipped `standard` 把 `subagent` 配成 `backgroundMode: continuable`，那条路默认打 `spawn` 的 `prepareContinuable`，不会落到本后端。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191]

## 设计动机

进程外 ACP 孩子有自己的进程、session、模型与工具，不能替父执行 `outputSchema` / `maxDepth` / `toolFilter` / `persona`。Definition 在 `start` 前按广告拒掉，避免「收下再默默忽略」。`inheritsParentContext = false` 只描述对话：父 log 不跨进程；孩子唯一从父读到的是 workspace `cwd`。

`command` 必填，是因为可执行文件是部署事实（真实 `acp-agent` bin、或测试里的 mock server），运行时猜不出来。这正是它停在 example overlay 的原因：shipped `dsh-base` 不能替用户选定一个 ACP 二进制。

走 `ctx.subprocess` 是为了共用 credential / `DSH_*` scrub、树级 teardown 与 host dispose 杀光。对照 `dsh-subagent-dsh-sdk`：那边 `inject` 只有 `subagents`，由 SDK client 自己拉起子 DSH runtime。ACP 没有这条例外。

父命名空间 `run.id` 与孩子 ACP `sessionId` 刻意分开，避免两个 ACP 孩子或一个本地 agent 撞上同一个 session 字符串。`localAgent: undefined` 让 lifecycle 的 `local` 快照为 false。

`permission` 自动答，是因为这条缝是自动化委托，不是再开一条人机审批。默认 `reject` 让未经声明的孩子工具停在 `cancelled`→`aborted`。

named export only：Loader 的 default-interop 会剥掉模块顶上的 `inject`。测试用 `loader.unwrapExports(acp)` 断言 identity 仍带 `name` / `apply`。

## Gotcha

- **不是 shipped 默认后端。** 包在 monorepo 里 ≠ 进了 `dsh-base`。`dsh web` 的 `standard` 委托仍是 in-process `spawn`。只 overlay 本包、不改 `tool-subagent` 的 `provider`，模型还是打到 `spawn`。
- **default export 会丢掉 `inject`。** `unwrapExports` 先取 `.default`。[E: vendor/loader/src/index.ts:194] 必须 `export const name` / `export const inject` / `export function apply`。
- **没有 `prepareContinuable`。** `startContinuable` / preset 默认 continuable 路径不能打到 `acp`。要委托 ACP 必须走 `ctx.subagents.start`（one-shot 前台或 one-shot Job），并把 Consumer 的 `maxDepth` 设成 `'provider-managed'`，否则数字 cap 先被 `assertCapabilities` 拒。
- **缺 `command` 不能 load。** 没有「先挂上再等 Settings」。空 `cwd` 也在 load 失败——`path.resolve('')` 等于进程启动目录，会悄悄绑到 server launch dir。父 session 也没有 cwd 时，`start` 在 spawn 之前抛 `no working directory`。[E: packages/subagent/subagent-acp/src/index.ts:136]
- **发布前 reject，发布后不 reject。** handshake / 预 abort / 坏 `sessionId` 让 `start()` 失败且已 reap。发布后的子崩溃变成 `result.stopReason === 'error'`，日志走 `onError`。
- **ACP 内联了 out-of-process 合同，没有 import 那些 helper。** `dsh-sdk` 用 `NO_START_CAPABILITIES` / `resolveChildCwd`；本包自己写了同值 `capabilities`、自己的 `resolveCwd`、自己的 handle（仍保证 `localAgent: undefined`）。读 `out-of-process.ts` 是为了对照词汇，不要写成「ACP 调用了 `subprocessRunHandle`」。
- **只传 text。** 图片 / reasoning block 不会进入 `session/prompt`；孩子的 thought 不会回到父模型。
- **`examples/acp-agent/cordis.yml` 不是 Provider 行。** 那是孩子 ACP 服务器。父侧挂载行在 `tests/fixtures/subagent/subagent-acp/cordis.yml`。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subagent` 的 `SubagentRuntime` | `ctx.subagents`。**host**：`dsh-base` `id: subagent`。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-subagent-acp` 的 `AcpProvider` | `registerProvider`，默认名 `acp`。`inject = ['subagents', 'subprocess']`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。example fixture：`id: subagent-acp` |
| **Provider（对照，shipped）** | `subagent-spawn-in-process` / `subagent-fork-in-process` | host 行 `providerName: spawn` / `fork`。有 `prepareContinuable`，`localAgent` 指向同进程 child |
| **Provider（对照，另一家 example）** | `dsh-subagent-dsh-sdk` 的 `SdkSubagentProvider` | `inject = ['subagents']` only；子进程不经 `ctx.subprocess` |
| **Consumer** | `@deepseek-ai/dsh-tool-subagent` | Config `provider` 必须等于已注册的 `providerName`。fixture 写 `provider: acp` 且 `maxDepth: 'provider-managed'`。shipped `standard` 写 `provider: spawn`，不消费本后端 |

换 ACP 后端 = overlay 本包并改 Consumer 的 `provider`，不是改 `dsh-base`。同名再注册会 `DUPLICATE_PROVIDER`。

## Sources

- packages/subagent/subagent-acp/src/index.ts
- packages/subagent/subagent-acp/src/run.ts
- packages/subagent/subagent/src/out-of-process.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/types.ts
- packages/subagent/subagent/src/lifecycle.ts
- packages/subagent/subagent-acp/tests/subagent-acp.spec.ts
- packages/subagent/subagent-acp/tests/loader-composition.e2e.ts
- examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml
- examples/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- vendor/loader/src/index.ts
- vendor/cordis/src/events.ts
- packages/subagent/subagent-dsh-sdk/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [subsys.orchestration.subagent](subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition；`registerProvider` / `start` / `startContinuable`。
- [subsys.orchestration.subagent-dsh-sdk](subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）：另一家 example 进程外后端；SDK client 自己拉起子进程。
- [spine.trace-subagent](../../spine/trace-subagent.md)（`spine.trace-subagent`）：shipped `standard` 前台 `subagent` → in-process `spawn` 的闭合走读，不经过本包。
- [surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）：模型可见委托工具；`provider` 选哪家 backend。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess.spawn` 与 `scrubbedParentEnv`。
