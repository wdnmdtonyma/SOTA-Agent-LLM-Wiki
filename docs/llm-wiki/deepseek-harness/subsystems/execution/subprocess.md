---
id: subsys.execution.subprocess
title: subprocess 缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/subprocess/subprocess/src/index.ts
  - packages/subprocess/subprocess/src/types.ts
  - packages/subprocess/subprocess/tests/service.spec.ts
  - packages/subprocess/subprocess-local/src/index.ts
  - packages/subprocess/subprocess-local/src/spawn.ts
  - packages/subprocess/subprocess-local/src/terminal.ts
  - packages/subprocess/subprocess-local/tests/spawn.spec.ts
  - packages/subprocess/subprocess-local/tests/local.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/fs/tool-fs-search/src/index.ts
  - packages/fs/tool-fs-search/src/search-core.ts
  - packages/shell/bash-local/src/index.ts
  - packages/shell/pwsh-local/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/subagent/subagent-acp/src/index.ts
  - packages/subagent/subagent-dsh-sdk/src/index.ts
  - packages/subagent/subagent-dsh-sdk/src/run.ts
  - packages/e2b/subprocess-e2b/src/index.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/reflect.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.subprocess
  - SubprocessRuntime
  - LocalSubprocessRuntime
  - scrubbedParentEnv
related:
  - spine.overview
  - spine.capability-seams
  - subsys.execution.shell
  - subsys.execution.terminal
  - subsys.execution.lsp
  - subsys.execution.e2b
  - subsys.execution.bash-local
  - subsys.composition.bundle-base
  - surface.tools.glob
  - surface.tools.grep
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.subprocess`（`SubprocessRuntime`）是 **host 面**进程执行世界：`resolveExecutable` / `spawn` / `spawnTerminal` 三个全量原语。本缝不做 command defaulting、shell 语义、deadline 分类、PTY 会话策略。默认 Provider 是 `LocalSubprocessRuntime`（`dsh-base` 行 `id: subprocess`）。换这一键会改 Bash / PTY / `glob`/`grep` / LSP stdio / 经本缝 spawn 的进程外 subagent 的世界；只换 `ctx.fs` 不会。

## 能回答的问题

- `ctx.subprocess` 的 Definition 与默认 local Provider 分别是哪个包？谁占 `ctx` 键？
- `scrubbedParentEnv` 剥什么？显式 `env` 为什么能把密钥或 `DSH_*` 再送回去？
- `spawn` 与 `spawnTerminal` 各管到哪一层？谁拥有 timeout / 就绪 / 持久 shell？
- 只换 `ctx.fs`、只换 `ctx.subprocess`、成对换走，分别带走哪些 Consumer？
- 本缝有没有 waterfall？同 realm 再挂第二个 Provider 会怎样？
- host 面的 `id: subprocess` 会不会被 `dsh-web-app` 关掉？preset 的 `isolate.fs` 会不会隔离进程世界？

## 职责边界

本页覆盖 **Definition + 默认 local Provider**（index 把 `@deepseek-ai/dsh-subprocess` 与 `@deepseek-ai/dsh-subprocess-local` 分在同一节点）。Definition 是抽象类 `SubprocessRuntime`，构造里 `super(ctx, 'subprocess')` 占唯一的 `ctx.subprocess`。[E: packages/subprocess/subprocess/src/index.ts:104] 它**没有** bundle 行：`dsh-base` 只挂实现包。[E: packages/bundle/base/cordis.patch.yml:163] [E: packages/bundle/base/cordis.patch.yml:164]

本缝拥有：可执行查找、全量 `SubprocessSpawnSpec` 的托管进程树、一种 terminal-process 原语、统一的 `scrubbedParentEnv`、以及 Provider dispose / host-exit 时杀光还活着的树。`LocalSubprocessRuntime` **没有** `Config`：timeout、cwd 默认、maxOutput、shell 路径都在 Consumer 的 config。

明确不拥有：

- `bash -c` / `pwsh` 的 resolve、timeout、输出预算、`ctx.shell` 键：[subsys.execution.shell](shell.md)（`subsys.execution.shell`）、[subsys.execution.bash-local](bash-local.md)（`subsys.execution.bash-local`）。
- 持久 PTY 就绪、受控 prompt、sandbox mode 切换围栏：[subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）。本页只写 `spawnTerminal` 原语。
- LSP 成帧 / 文档同步：[subsys.execution.lsp](lsp.md)（`subsys.execution.lsp`）。`lsp-stdio` 只是本缝的 Consumer。
- `glob` / `grep` 的模型字段与 ripgrep argv 模板：[surface.tools.glob](../../surface/tools/glob.md)（`surface.tools.glob`）/ [surface.tools.grep](../../surface/tools/grep.md)（`surface.tools.grep`）。它们 **不**走 `ctx.fs`。
- `ctx.sandbox.confine` 与 `SandboxMode`：[subsys.execution.sandbox](sandbox.md) 会写。本缝接到的是已经拼好的 argv；`danger-full-access` 绕过 confine 发生在 Consumer，不在 `spawn`。
- E2B 远程 one-world：[subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）。
- 模型可见 tool 注册表：[subsys.core.tools](../core/tools.md)。

**host 面 vs agent-preset 面。** `ctx.subprocess` 是进程级 host 服务：session 出现之前，Bash / PTY / LSP / search 就要 `inject` 它。`dsh-web-app` **不** `disabled` `id: subprocess`，只关掉模型可见的 `tool-fs-search` 等行。[E: packages/bundle/web-app/cordis.patch.yml:315] [E: packages/bundle/web-app/cordis.patch.yml:316] `standard` preset 再按会话挂回 `tool-fs-search`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:59] `minimal` 用 `isolate.fs: true` + `dsh-fs-local` 隔离的是 `ctx.fs`，**不是** `ctx.subprocess`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55] 浏览器 client 不实现 `SubprocessRuntime`。默认安装路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

**没有 `subprocess/*` 事件。** Definition 不声明 waterfall / emit。Cordis 全局规则仍是：waterfall 必须调用 `next()` 才会 `cbs.shift()`；不调用就否决后续 listener 与内建行为。[E: vendor/cordis/src/events.ts:238] 本缝的组合失败是「同 realm 第二份 service 抛」和「Consumer `inject` 等到服务」，不是占槽不 `next()`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/subprocess/subprocess/src/index.ts` | Definition：`SubprocessRuntime`、`scrubbedParentEnv`、`SENSITIVE_ENV_PATTERN` |
| `packages/subprocess/subprocess/src/types.ts` | `SubprocessSpawnSpec` / `SubprocessHandle` / `SubprocessTerminalHandle`、`DSH_ENV_PREFIX` |
| `packages/subprocess/subprocess/tests/service.spec.ts` | 登记 `ctx.subprocess`、duplicate-service、scrub 单测 |
| `packages/subprocess/subprocess-local/src/index.ts` | 默认 Provider：`LocalSubprocessRuntime` |
| `packages/subprocess/subprocess-local/src/spawn.ts` | `childEnv`、`spawnSubprocess`、树级 SIGTERM→SIGKILL |
| `packages/subprocess/subprocess-local/src/terminal.ts` | `LocalTerminalHandle`（node-pty 会话清理） |
| `packages/subprocess/subprocess-local/tests/spawn.spec.ts` | env merge / tombstone / 显式密钥 / 升级杀 |
| `packages/subprocess/subprocess-local/tests/local.spec.ts` | resolve 规则、dispose 杀活树、PTY 入参 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: subprocess` |
| `packages/fs/tool-fs-search/src/index.ts` | `glob`/`grep` Consumer：`inject` 含 `subprocess`，不含 `fs` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SubprocessRuntime` | `Service` 子类；键名 `'subprocess'`。三个抽象方法：`resolveExecutable` / `spawn` / `spawnTerminal`。[E: packages/subprocess/subprocess/src/index.ts:102] [E: packages/subprocess/subprocess/src/index.ts:118] [E: packages/subprocess/subprocess/src/index.ts:130] [E: packages/subprocess/subprocess/src/index.ts:139] |
| `SubprocessSpawnSpec` | 全量请求：`argv` / `cwd` / `stdio` / `graceMs` / 可选 `signal` / 可选 `env`。本缝不填默认。`argv[0]` 是程序；实现走 `child_process.spawn(program, args, …)`，不设 `shell: true`。[E: packages/subprocess/subprocess-local/src/spawn.ts:350] |
| `SubprocessStdio` | 每路显式：`stdin` = `ignore` \| `pipe` \| `{ data }`；`stdout`/`stderr` = `pipe` \| `inherit` \| `{ maxBytes, spill? }`。 |
| `SubprocessHandle` | 立刻返回的活句柄。`done` 在 close 时 resolve 出 `{ exitCode, signal }`，**只**对 spawn 级失败 reject。`terminate()` 是唯一终止动词。`waitForExit` 等整棵树。 |
| `SubprocessOutcome` | 只有退出码 / 信号。timeout 与 abort 的分类归 Consumer（它拥有 `AbortSignal`）。 |
| `SubprocessTerminalSpawnSpec` | `argv` / `cwd` / `env?` / `rows` / `cols` / `graceMs` / 可选分配取消 `signal`。 |
| `SubprocessTerminalHandle` | `write` / `inspectForeground` / `signalForeground` / 幂等 `terminate()`。就绪与持久 shell 策略不在本类型。 |
| `SENSITIVE_ENV_PATTERN` | `/KEY\|PASSWORD\|SECRET\|TOKEN/i`。[E: packages/subprocess/subprocess/src/index.ts:44] |
| `DSH_ENV_PREFIX` | `'DSH_'`。大小写不敏感匹配：`key.toUpperCase().startsWith('DSH_')`。[E: packages/subprocess/subprocess/src/types.ts:13] [E: packages/subprocess/subprocess/src/index.ts:63] |
| `scrubbedParentEnv()` | 纯函数：拷 `process.env`，丢掉 credential 形名字与全部 `DSH_*`，保留 `PATH` / `HOME` / locale / proxy。不能走 service 的 spawner（SDK 托管传输）也 import 这一份。 |
| `childEnv(extra)` | local 实现：先 `scrubbedParentEnv()`，POSIX 再 `{ ...env, ...extra }`。win32 按大写键替换后再 `push`。[E: packages/subprocess/subprocess-local/src/spawn.ts:37] [E: packages/subprocess/subprocess-local/src/spawn.ts:38] [E: packages/subprocess/subprocess-local/src/spawn.ts:39] [E: packages/subprocess/subprocess-local/src/spawn.ts:43] |

本缝 **不**声明 Cordis `Events`。没有 `subprocess/pre-spawn` 一类槽。

## 控制流

1. `SubprocessRuntime`@packages/subprocess/subprocess/src/index.ts 在 augmentation 里声明 `Context.subprocess`，构造调用 `Service` → `ctx.reflect.provide('subprocess', self)`。[E: packages/subprocess/subprocess/src/index.ts:70] [E: vendor/cordis/src/service.ts:57]
2. 同一 isolate realm 再挂第二个同名 service，`reflect.provide` 抛 `service "subprocess" has been registered`。Definition 测试用两个 stub 钉死这条。[E: vendor/cordis/src/reflect.ts:290] [E: packages/subprocess/subprocess/tests/service.spec.ts:75]
3. `dsh-base`@packages/bundle/base/cordis.patch.yml 在 **host** 插默认 Provider：`id: subprocess` → `@deepseek-ai/dsh-subprocess-local`。[E: packages/bundle/base/cordis.patch.yml:163] [E: packages/bundle/base/cordis.patch.yml:164]
4. `LocalSubprocessRuntime`@packages/subprocess/subprocess-local/src/index.ts `extends SubprocessRuntime`。构造用 `ctx.effect` 登记 teardown：fiber dispose 走 `disposeManagedProcesses`（先 `terminate()` 再等整树）；Node `exit` 上 `prependListener` 做同步 `terminateForHostExit`。[E: packages/subprocess/subprocess-local/src/index.ts:37] [E: packages/subprocess/subprocess-local/src/index.ts:49]
5. Consumer 通过 `inject` 等到 `ctx.subprocess`，不 import `*-local` 实现。`LocalBashExecutor` / `PwshLocalExecutor` 都是 `static inject = ['subprocess']`，再把精确 argv 交给 `this.ctx.subprocess.spawn`。[E: packages/shell/bash-local/src/index.ts:103] [E: packages/shell/bash-local/src/index.ts:226] [E: packages/shell/pwsh-local/src/index.ts:129] [E: packages/shell/pwsh-local/src/index.ts:263]
6. `resolveExecutable`@packages/subprocess/subprocess-local/src/index.ts：空字符串抛；带 `/`（win32 还含 `\\`）的相对路径 fail-loud；绝对路径必须是可执行文件；裸名走 `childEnv(env)` 后的 `PATH`（win32 再叠 `PATHEXT`）。[E: packages/subprocess/subprocess-local/src/index.ts:109] [E: packages/subprocess/subprocess-local/src/index.ts:113]
7. `spawn`@packages/subprocess/subprocess-local/src/index.ts 调 `spawnSubprocess`，把句柄放进 `live`；**整棵树** `waitForExit` 之后才 `live.delete`，不是 direct-child `done` 结算就放手。[E: packages/subprocess/subprocess-local/src/index.ts:147] [E: packages/subprocess/subprocess-local/src/index.ts:148]
8. `spawnSubprocess`@packages/subprocess/subprocess-local/src/spawn.ts 校验 `graceMs`（正有限且 ≤ `MAX_TIMER_DELAY_MS`）、非空 `argv[0]`、未 aborted 的 `signal`。`env = childEnv(spec.env)`：先剥再 merge。POSIX `detached: true` 自建进程组；win32 不 detached，杀树走 `taskkill /T /F`。[E: packages/subprocess/subprocess-local/src/spawn.ts:327] [E: packages/subprocess/subprocess-local/src/spawn.ts:349] [E: packages/subprocess/subprocess-local/src/spawn.ts:360]
9. 显式 `env` 在 scrub **之后** merge，所以故意转发的 `*PASSWORD*` / 当前 `DSH_*` 能活；ambient 同名被剥。tombstone `undefined` 删掉普通 ambient 键。单测钉死这三条。[E: packages/subprocess/subprocess-local/tests/spawn.spec.ts:366] [E: packages/subprocess/subprocess-local/tests/spawn.spec.ts:354] [E: packages/subprocess/subprocess-local/tests/spawn.spec.ts:344]
10. `terminate()` 对还活着的树发 `SIGTERM`，再在 `graceMs` 后 `SIGKILL`。spec 的 `abort` 只触发这条升级，不在 Outcome 里写 timeout。单测：abort → `SIGTERM`；trap TERM → 最终 `SIGKILL`。[E: packages/subprocess/subprocess-local/src/spawn.ts:446] [E: packages/subprocess/subprocess-local/src/spawn.ts:452] [E: packages/subprocess/subprocess-local/src/spawn.ts:460] [E: packages/subprocess/subprocess-local/tests/spawn.spec.ts:179] [E: packages/subprocess/subprocess-local/tests/spawn.spec.ts:188]
11. `spawnTerminal`@packages/subprocess/subprocess-local/src/index.ts 用 `nodePty.spawn`（`TERM=dumb` 由 options.name 给出），`env` 同样走 `childEnv`。`signal` 只取消**分配**；句柄发布后的寿命由 `LocalTerminalHandle.terminate` 管。PTY 就绪 / 持久 shell 政策在 `terminal-bash`。[E: packages/subprocess/subprocess-local/src/index.ts:175] [E: packages/subprocess/subprocess-local/src/index.ts:172] [E: packages/terminal/terminal-bash/src/index.ts:25] [E: packages/terminal/terminal-bash/src/index.ts:110]
12. fiber dispose 杀光 `live` 与 `terminals` 并等待；还在跑的 `sleep 60` 会收到 `SIGTERM`。[E: packages/subprocess/subprocess-local/src/index.ts:86] [E: packages/subprocess/subprocess-local/tests/local.spec.ts:401]
13. **换世界。** `tool-fs-search` `inject = ['tools', 'systemPrompt', 'subprocess']`，`runRipgrep` 直接 `ctx.subprocess.spawn` 固定 ripgrep argv，**不** `inject` `fs`、不走 `ctx.shell`。[E: packages/fs/tool-fs-search/src/index.ts:70] [E: packages/fs/tool-fs-search/src/search-core.ts:227] `lsp-stdio` 同时吃两条：load 时 `resolveExecutable`，进程用 `spawn`，每个 provider 另持 `ctx.fs`。[E: packages/lsp/lsp-stdio/src/index.ts:47] [E: packages/lsp/lsp-stdio/src/index.ts:146] [E: packages/lsp/lsp-stdio/src/index.ts:157] `subagent-acp` `inject = ['subagents', 'subprocess']`，`start` 把 `ctx.subprocess.spawn` 交给 ACP 运行时。[E: packages/subagent/subagent-acp/src/index.ts:24] [E: packages/subagent/subagent-acp/src/index.ts:162] 只换 `ctx.fs` 不会把这些 `spawn` 搬到远程。
14. 远程配对是另一个 Provider：`E2BSubprocessRuntime extends SubprocessRuntime`，`static inject = ['e2b']`，仍登记为 `ctx.subprocess`。fs 必须另挂 `fs-e2b` 才能 one-world；细节在 [subsys.execution.e2b](e2b.md)。[E: packages/e2b/subprocess-e2b/src/index.ts:52] [E: packages/e2b/subprocess-e2b/src/index.ts:53]

## 设计动机

- **全量 spec，零隐藏默认。** timeout / maxOutput / cwd 回落 / shell 可执行路径是 Bash、LSP、search 各自的部署选择。本缝若偷偷填默认，换 Provider 或换 Consumer config 会静默分叉。
- **先剥再 merge。** harness 自己的 `DEEPSEEK_API_KEY` 与过期 `DSH_*` 不得隐式进入子进程；`DSH_SHELL` / 子 agent 自己的 API key 必须能显式活下来。同一份 `scrubbedParentEnv` 给 service spawn、node-pty 与 SDK 托管传输共用。
- **树是所有权边界。** POSIX 杀进程组、Windows `taskkill /T`，`waitForExit` 看整树。TERM-trapping helper 不能在 `done` 已结算后偷偷活过 fiber dispose。
- **collect 用整段 offset，不消费。** 独立读者互不抽干；截断时内存留 tail，完整流在 spill。协议型 Consumer（LSP stderr）与批量 Consumer（bash）共用一条读路径。
- **与 `ctx.fs` 无运行时耦合。** 文件副作用走 `ctx.fs`；进程世界走 `ctx.subprocess`。部署上它们应指向同一 execution world，但代码没有互相 `inject`。只换一边会得到分裂世界——E2B 用共享 `ctx.e2b` 把两个 Provider 绑回去。

相对 Codex：Codex 的 OS sandbox 罩网络与进程可见性。DSH 这一缝是裸进程世界；文件围栏在 `fs-sandbox` / `bash-sandbox` 的 confine，不在 `spawn`。相对 Pi：Pi 没有这条可替换 `ctx.subprocess` 缝，spawn 焊在具体 executor 里。

## Gotcha

- 带分隔符的相对命令（`./bin/tsserver`、`node_modules/.bin/server`、win32 `bin\server.exe`）一律拒绝，不猜解析基。[E: packages/subprocess/subprocess-local/tests/local.spec.ts:124]
- `done` 对非零退出 **resolve**。把它当成「失败才 reject」会把正常 `exit 1` 变成未捕获异常。
- `signal` abort ≠ Outcome 里的 timeout 标记。本缝只升级杀树；`BASH_TIMEOUT` 这类原因在 `LocalBashExecutor`。
- ambient `DSH_TEST_PLAIN` 也会被剥：匹配的是前缀 `DSH_`，不是「看起来像密钥」。`SCRUB_PROBE_PLAIN` 才会留下。[E: packages/subprocess/subprocess/tests/service.spec.ts:90]
- win32 环境键大小写不敏感。`childEnv({ Path: '/bin' })` 会换掉继承的 `PATH`，避免子进程看到两份。
- `LocalTerminalHandle.signalForeground('SIGKILL')` 若前台组就是 shell 自己，会拒，要求走 session `terminate()`。[E: packages/subprocess/subprocess-local/src/terminal.ts:98]
- `dsh-subagent-dsh-sdk` **不是**本缝 Consumer：`inject = ['subagents']`，子进程由 SDK client 自己拉起，只 import `scrubbedParentEnv`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:26] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:20] ACP / Codex / Claude Code 后端才 `inject` `subprocess`。
- 本缝不读 `SandboxMode`。`bash-sandbox` / `terminal-bash` 先 `ctx.sandbox.confine(argv)`（`danger-full-access` 跳过），再把**已经围栏过的 argv** 交给 `spawn` / `spawnTerminal`。
- `minimal` 的 `isolate.fs` 换掉的是该会话的 `ctx.fs`。host 上的 `id: subprocess` 仍是那一份 `LocalSubprocessRuntime`；PTY 后端继续 `inject` 它。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-subprocess` 的 `SubprocessRuntime` + `scrubbedParentEnv`。抽象类，**不是** bundle 插件行 | `ctx.subprocess`。host 只挂 Provider 行 `id: subprocess`，没有单独的 Definition 插件行 |
| **Provider（默认）** | `@deepseek-ai/dsh-subprocess-local` 的 `LocalSubprocessRuntime` | **host**：`dsh-base` `id: subprocess`。`dsh-web-app` 不 disabled 此行。无 `Config` |
| **Provider（远程）** | `@deepseek-ai/dsh-subprocess-e2b` 的 `E2BSubprocessRuntime`，`inject = ['e2b']` | 仍占 `ctx.subprocess`。必须与 `fs-e2b` 成对替换，见 [subsys.execution.e2b](e2b.md) |
| **Consumer（shell）** | `LocalBashExecutor` / `PwshLocalExecutor`（默认再被 sandbox 子类包装成唯一 `ctx.shell`） | `static inject = ['subprocess']`。模型面 `tool-bash` / `tool-pwsh` 只 `inject` `shell`，隔一层 |
| **Consumer（PTY）** | `dsh-terminal-bash` | `inject = ['terminals', 'sandboxPolicy', 'subprocess']`；默认 `ctx.subprocess.spawnTerminal`。preset 可 `isolate.terminals`，不 isolate 本缝 |
| **Consumer（search）** | `dsh-tool-fs-search` 的 `glob` / `grep` | `inject = ['tools', 'systemPrompt', 'subprocess']`。`dsh-web-app` 把 host 行 `disabled: true`；`standard` preset 按会话挂回 |
| **Consumer（LSP）** | `dsh-lsp-stdio` | `inject = ['fs', 'lsp', 'subprocess']`。少数同时吃两条 seam 的插件 |
| **Consumer（进程外 subagent）** | `dsh-subagent-acp` / `dsh-subagent-codex` / `dsh-subagent-claude-code` | `inject` 含 `subprocess`。`dsh-subagent-dsh-sdk` 除外（只复用 scrub 函数） |

换 Provider = 改 bundle / `--patch` 行，不改 `tool-bash` / `tool-fs-search`。把第二个 `SubprocessRuntime` 挂进同一 realm 会抛，不会静默覆盖。

## Sources

- packages/subprocess/subprocess/src/index.ts
- packages/subprocess/subprocess/src/types.ts
- packages/subprocess/subprocess/tests/service.spec.ts
- packages/subprocess/subprocess-local/src/index.ts
- packages/subprocess/subprocess-local/src/spawn.ts
- packages/subprocess/subprocess-local/src/terminal.ts
- packages/subprocess/subprocess-local/tests/spawn.spec.ts
- packages/subprocess/subprocess-local/tests/local.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/fs/tool-fs-search/src/index.ts
- packages/fs/tool-fs-search/src/search-core.ts
- packages/shell/bash-local/src/index.ts
- packages/shell/pwsh-local/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/subagent/subagent-acp/src/index.ts
- packages/subagent/subagent-dsh-sdk/src/index.ts
- packages/subagent/subagent-dsh-sdk/src/run.ts
- packages/e2b/subprocess-e2b/src/index.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- vendor/cordis/src/service.ts
- vendor/cordis/src/reflect.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `shell` / `subprocess` 三条缝的三角与换世界集合。
- [subsys.execution.shell](shell.md)（`subsys.execution.shell`）：`ctx.shell` Definition；本缝的上一层 Consumer。
- [subsys.execution.bash-local](bash-local.md)（`subsys.execution.bash-local`）：`LocalBashExecutor` / `SandboxBashExecutor` 如何 `spawn` `bash -c` 并 confine。
- [subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）：`ctx.terminals` 与 `terminal-bash` 的 PTY 会话策略。
- [subsys.execution.lsp](lsp.md)（`subsys.execution.lsp`）：`lsp-stdio` 同时消费 `ctx.fs` 与 `ctx.subprocess`。
- [subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）：`fs-e2b` + `subprocess-e2b` 成对替换。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 把 `id: subprocess` 插进 root realm。
- [surface.tools.glob](../../surface/tools/glob.md)（`surface.tools.glob`）：模型可见 `glob`，进程走本缝。
- [surface.tools.grep](../../surface/tools/grep.md)（`surface.tools.grep`）：模型可见 `grep`，进程走本缝。
