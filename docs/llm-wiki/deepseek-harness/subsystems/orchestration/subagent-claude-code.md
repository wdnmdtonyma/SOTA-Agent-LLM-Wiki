---
id: subsys.orchestration.subagent-claude-code
title: Claude Code 子代理后端
kind: subsystem
tier: T2
pkg: orchestration
source:
  - packages/subagent/subagent-claude-code/package.json
  - packages/subagent/subagent-claude-code/src/index.ts
  - packages/subagent/subagent-claude-code/src/run.ts
  - packages/subagent/subagent-claude-code/src/process.ts
  - packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts
  - packages/subagent/subagent-claude-code/tests/loader-composition.e2e.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/out-of-process.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/bundle/base/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - examples/acp-agent/tests/fixtures/subagent/subagent-claude-code/cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - ClaudeCodeProvider
related:
  - spine.overview
  - spine.trace-subagent
  - subsys.orchestration.subagent
  - subsys.orchestration.subagent-codex
  - subsys.composition.bundle-base
  - surface.tools.subagent
  - subsys.execution.subprocess
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-subagent-claude-code` 是 **host 面**、进程外、one-shot 的 `SubagentProvider`：registry 名写死 `'claude-code'`，每次 `start` 先 `ctx.subprocess.resolveExecutable('claude', …)`，再走官方 Claude Agent SDK，把真实 CLI 进程树交给 `ctx.subprocess`。包在 monorepo 里；`dsh-base` **不装**；shipped preset 只有 `disabled: true` 的 tool 行。

## 能回答的问题

- `@deepseek-ai/dsh-subagent-claude-code` 在不在仓库里？`dsh-base` 有没有把它当 dormant 行装上？
- provider 名是 `'claude'` 还是 `'claude-code'`？谁在 `start` 里解析可执行文件？
- 一次 one-shot 如何从 `ctx.subagents.start('claude-code')` 走到官方 `query()`，失败时为什么 `output` 是空数组？
- `standard` / `code` / `cordis` 里的 `tool-subagent-claude-code` 行启用了工具吗？只去掉 `disabled`、不 insert 本包会怎样？
- 本 Provider 有没有 `prepareContinuable`？`inheritsParentContext` 是什么？
- 本包挂不挂 waterfall？要不要进 preset `isolate`？

## 职责边界

本页覆盖 **Provider**：`ClaudeCodeProvider` + `apply@packages/subagent/subagent-claude-code/src/index.ts`。它 `inject = ['subagents', 'subprocess']`，自己不 `provide` 新的 `ctx` 键。[E: packages/subagent/subagent-claude-code/src/index.ts:27] [E: packages/subagent/subagent-claude-code/src/index.ts:111]

拥有：写死名 `'claude-code'` 的注册、PATH 上解析 `claude`、官方 SDK 一次 query、把 SDK 的 custom spawn 投影成 `ctx.subprocess.spawn`、严格 success 才算完成、失败 / 取消时丢掉部分文本、杀整棵 CLI 树。

明确不拥有：

- `ctx.subagents` 注册表、`start` / `startContinuable` 门控、descriptor：[subsys.orchestration.subagent](./subagent.md)（`subsys.orchestration.subagent`）。
- 对称的 Codex 后端（`codex app-server --stdio`，名写死 `'codex'`）：[subsys.orchestration.subagent-codex](./subagent-codex.md)（`subsys.orchestration.subagent-codex`）。
- 模型可见工具字段与 `subagent` / `subagent_claude_code` schema：[surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）。本页不写 T1 字段表。
- `resolveExecutable` / `spawn` / `scrubbedParentEnv` 的实现：[subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）。
- `dsh-base` 默认 insert 哪些 subagent 后端：[subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subagent/subagent-claude-code/package.json` | 包存在：`@deepseek-ai/dsh-subagent-claude-code`；依赖官方 `@anthropic-ai/claude-agent-sdk` |
| `packages/subagent/subagent-claude-code/src/index.ts` | `apply` + `ClaudeCodeProvider`：名、capabilities、`resolveExecutable('claude')`、`registerProvider` |
| `packages/subagent/subagent-claude-code/src/run.ts` | `startClaudeCodeRun`：官方 `query`、`collectOutput: () => []`、`persistSession: false` |
| `packages/subagent/subagent-claude-code/src/process.ts` | `claudeSpawnSpec` / `ManagedClaudeCodeProcess`：SDK spawn → 共享进程树 |
| `packages/bundle/base/tests/base.spec.ts` | 钉死 base **没有**本包行、manifest **没有**本包依赖 |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | preset 面 `tool-subagent-claude-code` 且 `disabled: true` |
| `examples/acp-agent/tests/fixtures/subagent/subagent-claude-code/cordis.yml` | 测试专用 opt-in 组合，不是 shipped bundle |

## 数据模型

| 符号 | 关键点 | 含义 |
|---|---|---|
| `Config` | `env?` / `disposeGraceMs?` | 叠在 `scrubbedParentEnv()` 之后的部署环境；杀树 grace，默认 `3000`。没有 `cwd` 覆盖键 |
| `ClaudeCodeProvider.name` | `'claude-code'` | 写死字符串，不是 `'claude'`，也不是插件 `export const name`（那是 `'subagent-claude-code'`） |
| `capabilities` | `NO_START_CAPABILITIES` | `outputSchema` / `depthLimit` / `toolFilter` / `persona` 全 `false` |
| `inheritsParentContext` | `false` | 子 CLI 看不到父对话 |
| `ClaudeCodeRunSpec` | `cwd` / `executable` / `env` / `spawn` | 一次官方 query 的已解析输入 |
| `SubagentResult` | `stopReason` + `output` | 只有严格 SDK `success` 才带最终文本；error / aborted 走空 `collectOutput` |

`ClaudeCodeProvider` **没有** `prepareContinuable`。`startContinuable('claude-code')` 会在缝里被拒，到不了本包。

## 控制流

本包 **不** 挂 `tools/pre-execute` / `llm/stream` / `agent/pre-step` 任一 waterfall。`Events.waterfall@vendor/cordis/src/events.ts` 必须调用传入的 `next()` 才会 `shift` 到下一层；不调用就停在本 listener。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] `ClaudeCodeProvider` 没有这层钩子，因此也没有「故意不 `next()` 的 reject」。父 tool 管线的 waterfall 属于 `ctx.tools`，在 `tool-subagent.execute` 之前已经跑完。

isolate：本包必须和 `ctx.subagents` 同在 **host 面**。`standard` 的 `delegation` 组只 `isolate: { workflowEngine: true }`，不 isolate `subagents`，也不 insert 本包。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:177] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178]

1. **包存在，默认组合不装。** `package.json@packages/subagent/subagent-claude-code/package.json` 发布 `@deepseek-ai/dsh-subagent-claude-code`，并依赖 `@anthropic-ai/claude-agent-sdk`。[E: packages/subagent/subagent-claude-code/package.json:2] [E: packages/subagent/subagent-claude-code/package.json:45] `dsh-base` 只 insert `subagent` + `subagent-spawn-in-process` + `subagent-fork-in-process`。[E: packages/bundle/base/cordis.patch.yml:292] [E: packages/bundle/base/cordis.patch.yml:295] [E: packages/bundle/base/cordis.patch.yml:300] `base.spec.ts` 钉死 `id: subagent-claude-code` 行数为 0，且 `dependencies` 不含 `@deepseek-ai/dsh-subagent-claude-code`。[E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:41] 旧 README / Agent Note 写「Codex / Claude load dormant」作废：没有行 = 没装，不是休眠加载。

2. **Preset 只留关掉的 Consumer 行。** `standard` / `code` / `cordis` 在 `delegation` 里写 `id: tool-subagent-claude-code`，`name: '@deepseek-ai/dsh-tool-subagent'`，`disabled: true`，`config.provider: claude-code`，`toolName: subagent_claude_code`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:212] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:214] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:216] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:215] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:202] `disabled: true` **不等于** host 已经挂上本后端。`minimal` 没有这一行。要真正跑起来，必须：(a) 在 host 组合 insert 本包；(b) 复制 preset 后去掉 `disabled`。只做 (b) 时 `ctx.subagents.getProvider('claude-code')` 仍是 `undefined`。

3. **opt-in 组合只出现在测试 fixture。** `examples/acp-agent/tests/fixtures/subagent/subagent-claude-code/cordis.yml` 同时挂 `id: subagent-claude-code` 与未 disabled 的 tool 行。[E: examples/acp-agent/tests/fixtures/subagent/subagent-claude-code/cordis.yml:15] [E: examples/acp-agent/tests/fixtures/subagent/subagent-claude-code/cordis.yml:26] loader e2e 断言注册名是 `'claude-code'`，且 load 时 `PATH: ''`、`starts: 0`——装包不会去探二进制。[E: packages/subagent/subagent-claude-code/tests/loader-composition.e2e.ts:28] [E: packages/subagent/subagent-claude-code/tests/loader-composition.e2e.ts:47] [E: packages/subagent/subagent-claude-code/tests/loader-composition.e2e.ts:69]

4. **`apply@index.ts` 校验 Config 后注册。** `disposeGraceMs` 必须是正有限数且 `<= MAX_TIMER_DELAY_MS`，然后 `ctx.subagents.registerProvider(new ClaudeCodeProvider(ctx, resolved))`。[E: packages/subagent/subagent-claude-code/src/index.ts:101] [E: packages/subagent/subagent-claude-code/src/index.ts:111] 插件是 named export：`export const name = 'subagent-claude-code'`，**没有** `default` export（丢掉 `inject` 的那种 default 包装会让 Loader 看不到 `['subagents', 'subprocess']`）。[E: packages/subagent/subagent-claude-code/src/index.ts:26] [E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:392] `registerProvider@packages/subagent/subagent/src/index.ts` 走 `ctx.effect()`：重名抛 `DUPLICATE_PROVIDER`；卸掉只挡住新 `start`，已返回的 run 不撤回。[E: packages/subagent/subagent/src/index.ts:372] [E: packages/subagent/subagent/src/index.ts:374]

5. **Consumer 等 `subagent/provider-added`。** `dsh-tool-subagent` 在 `provider.name === config.provider` 时才 `ctx.tools.register`；本包未挂上时打 info「not registered yet」，工具不进 catalog。[E: packages/subagent/tool-subagent/src/index.ts:440] [E: packages/subagent/tool-subagent/src/index.ts:441] [E: packages/subagent/tool-subagent/src/index.ts:453] 这是普通 `ctx.on` emit，不是 waterfall，没有 `next()`。

6. **`SubagentRuntime.start@packages/subagent/subagent/src/index.ts` 按名分发。** `expectProvider('claude-code')` 找不到就 `NO_PROVIDER`。[E: packages/subagent/subagent/src/index.ts:415] [E: packages/subagent/subagent/src/index.ts:452] `assertCapabilities` 看到 `outputSchema` / `maxDepth` / `toolFilter` / `persona` 任一请求而 provider 旗为 false 就 `UNSUPPORTED_CAPABILITY`。[E: packages/subagent/subagent/src/index.ts:481] [E: packages/subagent/subagent/src/index.ts:489] `ClaudeCodeProvider.capabilities` 是 `NO_START_CAPABILITIES`（全 false），`inheritsParentContext = false`。[E: packages/subagent/subagent-claude-code/src/index.ts:53] [E: packages/subagent/subagent-claude-code/src/index.ts:54] [E: packages/subagent/subagent-claude-code/src/index.ts:55] [E: packages/subagent/subagent/src/out-of-process.ts:25] descriptor 钉 `mode: 'one-shot'` 后才 `provider.start`。[E: packages/subagent/subagent/src/index.ts:420] [E: packages/subagent/subagent/src/index.ts:425] 没有 `prepareContinuable` 时 `startContinuable` 在缝里抛 `UNSUPPORTED_CAPABILITY`。[E: packages/subagent/subagent/src/index.ts:438]

7. **`ClaudeCodeProvider.start@index.ts` 先解析 `claude`。** 父 `session.header.cwd` 缺失则立刻 throw，不进 SDK。[E: packages/subagent/subagent-claude-code/src/index.ts:63] [E: packages/subagent/subagent-claude-code/src/index.ts:66] 然后 `this.ctx.subprocess.resolveExecutable('claude', this.config.env, request.signal)`。[E: packages/subagent/subagent-claude-code/src/index.ts:69] [E: packages/subagent/subagent-claude-code/src/index.ts:70] 单测钉死调用实参是 `'claude'` + Config `env`；PATH 上没有该名时 `start` reject，且 `query` 一次都没调。[E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:360] [E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:361] [E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:373] `resolveChildCwd` 的配置覆盖传 `undefined`：孩子 cwd 就是父 Session workspace。[E: packages/subagent/subagent-claude-code/src/index.ts:77]

8. **`startClaudeCodeRun@run.ts` 才碰官方 SDK。** `textTask` 要求非空、全是 text block，拼成一段 prompt。[E: packages/subagent/subagent-claude-code/src/run.ts:70] [E: packages/subagent/subagent-claude-code/src/run.ts:76] 请求已 abort 则 throw `aborted before SDK startup`。[E: packages/subagent/subagent-claude-code/src/run.ts:208] `officialQuery`（`@anthropic-ai/claude-agent-sdk` 的 `query`）带 `claudeQueryOptions`：`pathToClaudeCodeExecutable`、`persistSession: false`、`disallowedTools: ['AskUserQuestion']`、`env = { ...scrubbedParentEnv(), ...spec.env }`。[E: packages/subagent/subagent-claude-code/src/run.ts:224] [E: packages/subagent/subagent-claude-code/src/run.ts:187] [E: packages/subagent/subagent-claude-code/src/run.ts:188] [E: packages/subagent/subagent-claude-code/src/run.ts:186] SDK 的 `spawnClaudeCodeProcess` 钩子必须同步交出 `pid > 0` 的 handle，否则当「没有可控进程」失败并清理。[E: packages/subagent/subagent-claude-code/src/run.ts:189] [E: packages/subagent/subagent-claude-code/src/run.ts:230]

9. **进程树归 `ctx.subprocess`。** `claudeSpawnSpec@process.ts` 把 SDK `SpawnOptions` 译成 `SubprocessSpawnSpec`：`stdio` 为 stdin/stdout pipe、stderr inherit。[E: packages/subagent/subagent-claude-code/src/process.ts:51] [E: packages/subagent/subagent-claude-code/src/process.ts:69] win32 上 `.cmd` / `.bat` 走 `cmd.exe /d /v:off /s /c %DSH_CLAUDE_CODE_EXECUTABLE%`，可执行路径放进环境变量而不是 argv 裸路径。[E: packages/subagent/subagent-claude-code/src/process.ts:60] [E: packages/subagent/subagent-claude-code/src/process.ts:63] `ManagedClaudeCodeProcess` 只投影流与 exit；`kill` 转 `child.terminate()`，升级梯子仍在 subprocess 缝。

10. **结算：成功要完整 success；失败丢文本。** `consumeClaudeQuery` 扫完整 iterator，只认 `type === 'result'`，再经 `successfulResult`：必须 `subtype === 'success'`、`!is_error`、非空白 `result`。[E: packages/subagent/subagent-claude-code/src/run.ts:117] [E: packages/subagent/subagent-claude-code/src/run.ts:94] 否则 throw。`settleRunResult` 的 `collectOutput` **写死** `() => []`。[E: packages/subagent/subagent-claude-code/src/run.ts:270] [E: packages/subagent/subagent-claude-code/src/run.ts:272] 因此 SDK 错误 subtype、iterator 在已有 success 之后再 reject、以及本地 cancel 胜出时，`output` 都是 `[]`（`stopReason` 为 `'error'` 或 `'aborted'`）。[E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:659] [E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:677] [E: packages/subagent/subagent/src/out-of-process.ts:160] 发布后的 handle 来自 `subprocessRunHandle`：`localAgent: undefined`，`dispose` 幂等，先 `query.close()` 再杀树等到 `done`。[E: packages/subagent/subagent/src/out-of-process.ts:205] [E: packages/subagent/subagent-claude-code/src/run.ts:279]

## 设计动机

DSH 的产品单元是 `profile → bundle → agent preset`，不是「再做一个 Claude Code」。默认 shipped 树只保证 in-process `spawn` / `fork`；把官方 Claude CLI 放进 **opt-in Provider 包**，避免每个 `dsh web` 进程都去解析、甚至误启动 `claude`。

协议不自研：对话循环、工具、计费、会话文件都留在 `@anthropic-ai/claude-agent-sdk`。本包只做三件事：解析本机 `claude`、把 SDK 生出的进程交给共享 `ctx.subprocess`（host 能杀树、能 scrub 环境）、把 SDK 结果收成缝上的 `SubagentResult`。

`collectOutput: () => []` 是故意 fail-closed。进程外 CLI 的中间 JSON 不是父 session 的 model-visible 文本；部分答案若在失败路径泄漏，会让父模型把半截 CLI 输出当成完成。取消与 iterator 异常同样丢文本，避免「先 completed 再改口」。

`persistSession: false` + 禁用 `AskUserQuestion`：这是 unattended one-shot，不是用户桌面上的可续聊 Claude Code。没有 `prepareContinuable`，也就不会出现「父以为能 `send_message`、子其实是一次性 SDK query」的缝。

`NO_START_CAPABILITIES`：另一个进程里的 Claude 不会执行父侧的 `persona` / `toolFilter` / `maxDepth` / `outputSchema`。缝在 `start` 之前拒掉，而不是接了再假装支持。preset 行因此写 `maxDepth: provider-managed`。

## Gotcha

- **仓库里有包 ≠ 产品装了后端。** `dsh-base` 的 `package.json` 依赖 `dsh-subagent` / spawn / fork，没有 `@deepseek-ai/dsh-subagent-claude-code`。[E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] 测试把「零行 + 无依赖」钉死。不要把 preset 里的 `disabled: true` 读成 base dormant 加载。
- **只打开 tool、不 insert 本包 → provider 未注册。** `start('claude-code')` 走 `NO_PROVIDER`。工具行会一直等 `subagent/provider-added`。
- **只 insert 本包、不打开 tool → 模型看不见 `subagent_claude_code`。** registry 里有 `'claude-code'`，catalog 没有对应 wire 名。
- **`resolveExecutable` 找的是 PATH 名 `'claude'`，不是 SDK 自带的 platform binary。** 部署机没装官方 CLI，`start` 在 `officialQuery` 之前失败。
- **父 Session 必须有 `header.cwd`。** Config 没有 `cwd` 键可补；缺 cwd 的 parent 直接 throw。
- **失败不保留部分文本。** 对照 Codex 的 `wire.collectOutput()`：Claude 这条路径恒 `[]`。iterator 在 `success('partial final')` 之后再抛，结果仍是空 `output` + `error`。[E: packages/subagent/subagent-claude-code/src/run.ts:272]
- **prompt 只接受 text。** reasoning / 空数组 / 全空白都会在进 SDK 前 throw。
- **不要 `default export` 包一层。** 单测钉死 `'default' in claudeCode === false`，好让 Loader 保留 `inject`。[E: packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts:392]
- **win32 `.cmd` / `.bat` 必须走 shim。** 直接把带空格的 `claude.cmd` 塞进 argv 会被 cmd 再解析拆开。
- **`enableRunInBackground: false` 写在 disabled 行上。** 复制 preset 后若改成 `backgroundMode: continuable`，`tool-subagent` 会因本 Provider 没有 `prepareContinuable` 在 mount 期炸掉。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subagent` 的 `SubagentRuntime` | **host** `ctx.subagents`。`dsh-base` 行 `id: subagent`。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-subagent-claude-code` 的 `ClaudeCodeProvider` | `registerProvider` 名 `'claude-code'`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset。要挂就 host overlay `id: subagent-claude-code` |
| **Provider（对照，默认）** | `dsh-subagent-spawn-in-process` / `dsh-subagent-fork-in-process` | **host** `id: subagent-spawn-in-process`（`providerName: spawn`）、`id: subagent-fork-in-process`（`fork`） |
| **Consumer** | `@deepseek-ai/dsh-tool-subagent` | preset 行 `id: tool-subagent-claude-code`，`provider: claude-code`，**`disabled: true`**。打开后 wire 名 `subagent_claude_code`。不 isolate 本 Provider |
| **下游缝（本包是 Consumer）** | `ctx.subprocess` | `inject` 含 `subprocess`。`resolveExecutable` + `spawn`。换 local / E2B 会改 CLI 跑在哪台机器 |

换本 Provider = 在 host 组合 insert 本包，并在**用户自己的** preset 副本去掉 tool 行的 `disabled`。不要改 `dsh-base` 去「dormant 加载」。

## Sources

- packages/subagent/subagent-claude-code/package.json
- packages/subagent/subagent-claude-code/src/index.ts
- packages/subagent/subagent-claude-code/src/run.ts
- packages/subagent/subagent-claude-code/src/process.ts
- packages/subagent/subagent-claude-code/tests/subagent-claude-code.spec.ts
- packages/subagent/subagent-claude-code/tests/loader-composition.e2e.ts
- packages/subagent/subagent/src/index.ts
- packages/subagent/subagent/src/out-of-process.ts
- packages/subagent/tool-subagent/src/index.ts
- packages/bundle/base/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- examples/acp-agent/tests/fixtures/subagent/subagent-claude-code/cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`；host 面 backends 与 preset 面 tools。
- [spine.trace-subagent](../../spine/trace-subagent.md)（`spine.trace-subagent`）：默认 `subagent` → in-process `spawn` 的闭合路径；Claude / Codex 只作为 opt-in 对照。
- [subsys.orchestration.subagent](./subagent.md)（`subsys.orchestration.subagent`）：`ctx.subagents` Definition、`registerProvider`、`start` / `startContinuable`。
- [subsys.orchestration.subagent-codex](./subagent-codex.md)（`subsys.orchestration.subagent-codex`）：对称的 Codex 进程外 one-shot 后端；同样不进 `dsh-base`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 装 spawn/fork、不装本包。
- [surface.tools.subagent](../../surface/tools/subagent.md)（`surface.tools.subagent`）：模型可见委托工具；`subagent_claude_code` 的 schema 在那一页。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`resolveExecutable` / `spawn` / `scrubbedParentEnv`。
