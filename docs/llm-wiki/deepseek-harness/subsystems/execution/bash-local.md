---
id: subsys.execution.bash-local
title: bash-local provider
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/shell/bash-local/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/shell/bash-sandbox/src/helpers.ts
  - packages/shell/bash-local/tests/executor.spec.ts
  - packages/shell/bash-local/tests/settings.spec.ts
  - packages/shell/bash-sandbox/tests/sandbox.spec.ts
  - packages/shell/bash-sandbox/tests/partial-landlock.spec.ts
  - packages/shell/bash-sandbox/tests/bwrap.e2e.ts
  - packages/shell/bash-sandbox/tests/landlock.e2e.ts
  - packages/shell/bash-sandbox/tests/seatbelt.e2e.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/shell/shell/src/index.ts
  - packages/shell/shell/src/types.ts
  - packages/shell/shell/tests/service.spec.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-bash/tests/tools.spec.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/util/timeout/src/index.ts
  - vendor/cordis/src/events.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
symbols:
  - LocalBashExecutor
  - SandboxBashExecutor
related:
  - spine.overview
  - spine.capability-seams
  - spine.tool-call-anatomy
  - subsys.execution.shell
  - subsys.execution.subprocess
  - subsys.execution.sandbox
  - subsys.execution.sandbox-policy
  - subsys.execution.sandbox-local
  - subsys.execution.pwsh-local
  - surface.tools.bash
  - surface.misc.security
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `LocalBashExecutor` 是 `ctx.shell` 的本地 Provider，也是 `ctx.subprocess` 的 Consumer：`run` / `start` 把 `['bash', '-c', command]` 交给 `this.ctx.subprocess.spawn`。shipped `dsh-base` **不**单独挂 `@deepseek-ai/dsh-bash-local`；默认 host 行是它的围栏子类 `SandboxBashExecutor`（`id: bash-sandbox`），对精确 argv 调 `ctx.sandbox.confine`，`danger-full-access` 不 confine，runner 起不来就 fail-loud。

## 能回答的问题

- shipped `dsh web` 组合里 `ctx.shell` 是 `dsh-bash-local` 还是 `dsh-bash-sandbox`？有没有单独的 `id: bash-local` 行？
- `LocalBashExecutor` 怎样把一条命令变成 `ctx.subprocess.spawn`？timeout / abort / 后台 job 各走哪条路径？
- `SandboxBashExecutor` 何时调用 `ctx.sandbox.confine`？何时完全不 confine？confine 失败或 runner 没跑起来，前台和后台各怎样 fail-loud？
- 沙箱 mode 写在本包 Config 里吗？还是读 `ctx.sandboxPolicy` 的 per-call `resolve()`？
- 只换 `ctx.fs` 会不会把 `bash -c` 搬到远程？围栏挂在 `tools/pre-execute` 吗？
- win32 上 `bash-sandbox` 被 `disabled` 之后，`ctx.shell` 换成什么？那是不是「Windows 没有 sandbox」？

## 职责边界

本页拥有两份 **host 面** Provider：`LocalBashExecutor`（`@deepseek-ai/dsh-bash-local`）与子类 `SandboxBashExecutor`（`@deepseek-ai/dsh-bash-sandbox`）。它们都 `extends ShellExecutor`，构造时 `super(ctx, 'shell')` 独占 `ctx.shell`。[E: packages/shell/shell/src/index.ts:67] [E: packages/shell/bash-local/src/index.ts:102] [E: packages/shell/bash-sandbox/src/index.ts:44] 本页写：command defaulting、deadline / 输出预算、`bash -c` argv、以及 sandbox 包装如何 confine / 分类 / fail-loud。

本页**不**拥有：

- `ctx.shell` 抽象合同、`run` 对非零/timeout/abort **resolve** 的语义、`SHELL_SETTINGS_NAMESPACE` 的所有权 — [`subsys.execution.shell`](shell.md)。
- `ctx.subprocess.spawn` 的 detached 树、credential scrub、PTY — [`subsys.execution.subprocess`](subprocess.md)。本执行器只 `inject` 这一键。
- `ctx.sandbox.confine` 的 bwrap / Landlock / Seatbelt / Windows ACL 选择链 — [`subsys.execution.sandbox-local`](sandbox-local.md)。本页只写「对精确 argv 调 `confine`，拿到什么 argv 就 spawn 什么」。
- `SandboxMode` 词表、`approveEscalation`、`SANDBOX_UNAVAILABLE` 的定义 — [`subsys.execution.sandbox`](sandbox.md)。
- `sandbox/mode` fold 与 per-session `resolve()` — [`subsys.execution.sandbox-policy`](sandbox-policy.md)。
- 模型可见 `bash` 的 schema / `run_in_background` / body 内升权 — [`surface.tools.bash`](../../surface/tools/bash.md)。
- win32 默认 `ctx.shell` — [`subsys.execution.pwsh-local`](pwsh-local.md)。
- Job id / 所有权 — 不在本执行器里；`tool-bash` 把 `start()` 句柄交给 `ctx.jobs`。

**host 面 vs agent-preset 面。** 执行器、`ctx.sandbox`、`ctx.sandboxPolicy`、`ctx.shellEnv` 是进程级 host 服务。`dsh-web-app` 只把模型可见的 `id: tool-bash` 设 `disabled: true`，改由 preset 按会话挂回；`id: bash-sandbox` 留在 host。[E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:44] 默认安装路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/shell/bash-local/src/index.ts` | `LocalBashExecutor`：`inject = ['subprocess']`；`resolve` / `run` / `start` / `runArgv` / `startArgv` |
| `packages/shell/bash-sandbox/src/index.ts` | `SandboxBashExecutor extends LocalBashExecutor`：`inject` 加上 `sandbox` + `sandboxPolicy`；confine 与 settlement 分类 |
| `packages/shell/bash-sandbox/src/helpers.ts` | `isRunnerSpawnFailure` / `classifyDenial` / `classifyRunnerFailure` / `matchesSignature` |
| `packages/shell/bash-local/tests/executor.spec.ts` | 前台 resolve 合同、timeout/abort 互斥、后台 handle、进程树所有权在 subprocess |
| `packages/shell/bash-local/tests/settings.spec.ts` | `SHELL_SETTINGS_NAMESPACE` 盖过 composition entry |
| `packages/shell/bash-sandbox/tests/sandbox.spec.ts` | 精确 argv 交接、danger 绕过、fail-loud、`runnerFailed` 对 denial 的优先级 |
| `packages/shell/bash-sandbox/tests/partial-landlock.spec.ts` | 真进程上的 runner-failure 分类（不写 runner 选择链） |
| `packages/shell/bash-sandbox/tests/bwrap.e2e.ts` / `landlock.e2e.ts` / `seatbelt.e2e.ts` | 真 runner 集成；细节归 [`subsys.execution.sandbox-local`](sandbox-local.md) |
| `packages/bundle/base/cordis.patch.yml` | 默认 host 行 `id: bash-sandbox`（win32 `disabled`） |
| `packages/bundle/web-app/cordis.patch.yml` | 关掉 `tool-bash`，执行器仍留 host |
| `packages/shell/shell/src/index.ts` | Definition：`ShellExecutor` `super(ctx, 'shell')` |
| `packages/shell/tool-bash/src/index.ts` | 模型面 Consumer：`inject` 含 `shell`；body 里 `approveEscalation` 再 `ctx.shell.run` |

## 数据模型

| 符号 / 键 | 落点 | 含义 |
|---|---|---|
| `LocalBashExecutor` | `@deepseek-ai/dsh-bash-local` | 本地 Provider。`static inject = ['subprocess']`。[E: packages/shell/bash-local/src/index.ts:103] |
| `SandboxBashExecutor` | `@deepseek-ai/dsh-bash-sandbox` | 默认 shipped Provider。`static inject = ['subprocess', 'sandbox', 'sandboxPolicy']`。[E: packages/shell/bash-sandbox/src/index.ts:45] |
| `Config` | 继承自 local | `timeoutMs` 默认 `120_000`、`maxTimeoutMs` `600_000`、`maxOutputBytes` `64_000`、`maxSpillBytes`、`graceMs`、可选 `cwd`。政策 **不** 在这里。[E: packages/shell/bash-local/src/index.ts:107] [E: packages/shell/bash-local/src/index.ts:108] [E: packages/shell/bash-sandbox/src/index.ts:35] |
| `ENV_OVERRIDES` | local | spawn 显式 env 的底层：`NO_COLOR=1` / `TERM=dumb` / `PAGER=cat` / `GIT_PAGER=cat`；再叠 `spec.env`，最后 `spec.dshEnv`。[E: packages/shell/bash-local/src/index.ts:27] [E: packages/shell/bash-local/src/index.ts:196] |
| `ShellExecSpec.sandboxPolicy` | Definition 类型 | local `resolve` 原样带回，本类不 confine；子类覆盖 `resolve` 补默认。[E: packages/shell/bash-local/src/index.ts:169] [E: packages/shell/shell/src/types.ts:109] |
| `sandboxMode` | 执行器 getter | 基类返回 `undefined`（不沙箱）。`SandboxBashExecutor` 返回构造时读到的 `ctx.sandboxPolicy.defaultMode`。[E: packages/shell/shell/src/index.ts:76] [E: packages/shell/bash-sandbox/src/index.ts:71] [E: packages/shell/bash-sandbox/src/index.ts:76] |
| `ShellSandboxInfo` | 前台 `result.sandbox` / 后台 `proc.sandbox` | `mode` / `denied` / 可选 `enforcement` / 可选 `runnerFailed`。[E: packages/shell/shell/src/types.ts:21] [E: packages/shell/shell/src/types.ts:29] |
| `SANDBOX_UNAVAILABLE` | `@deepseek-ai/dsh-sandbox` | `SandboxUnavailableError.code`。runner 没把命令跑起来时前台抛这个，**禁止**静默裸跑。[E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox/src/index.ts:131] |
| `SandboxMode` | sandbox Definition | `'read-only' \| 'workspace-write' \| 'danger-full-access'`。本执行器只按 mode 决定 confine 与否。[E: packages/sandbox/sandbox/src/index.ts:29] |
| `id: bash-sandbox` | `dsh-base` | `name: '@deepseek-ai/dsh-bash-sandbox'`，`disabled: !!js process.platform === 'win32'`，`config.timeoutMs: 60000`。[E: packages/bundle/base/cordis.patch.yml:178] [E: packages/bundle/base/cordis.patch.yml:179] [E: packages/bundle/base/cordis.patch.yml:180] |

## 控制流

1. **shipped host 挂围栏子类，不挂裸 local。** `dsh-base` 的 `id: bash-sandbox` 加载 `@deepseek-ai/dsh-bash-sandbox`，同一行在 win32 上 `disabled`。[E: packages/bundle/base/cordis.patch.yml:178] [E: packages/bundle/base/cordis.patch.yml:180] 对称行是 `id: pwsh-sandbox`，在非 win32 `disabled`。[E: packages/bundle/base/cordis.patch.yml:184] [E: packages/bundle/base/cordis.patch.yml:186] `base.spec.ts` 求值这两对 `!!js`：linux 上 bash 开、pwsh 关；win32 反过来。仓库没有 `windows.cordis.patch.yml`。[E: packages/bundle/base/tests/base.spec.ts:62] [E: packages/bundle/base/tests/base.spec.ts:64] [E: packages/bundle/base/tests/base.spec.ts:71] [E: packages/bundle/base/tests/base.spec.ts:75] 同文件没有 `id: bash-local`：`SandboxBashExecutor` 继承 local 后独占 `ctx.shell`。win32 默认 `ctx.shell` 是 pwsh 围栏包装，**不是**「Windows 没有 sandbox」——ACL restricted-token 在 [`subsys.execution.sandbox-local`](sandbox-local.md)。

2. **同一 realm 只能一份 `ctx.shell`。** `ShellExecutor` 构造 `super(ctx, 'shell')`。[E: packages/shell/shell/src/index.ts:67] 再挂第二个实现会抛 `service "shell" has been registered`。[E: packages/shell/shell/tests/service.spec.ts:82] 因此不能在 `bash-sandbox` 旁边再插一条 `dsh-bash-local`；要把 POSIX 栈搬到 Windows，必须同时关 `pwsh-sandbox` / `tool-pwsh` 并打开 `bash-sandbox` / `tool-bash`。

3. **host Provider 留下，preset 只挂 Consumer。** `dsh-web-app` 覆写 `id: tool-bash` 为 `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] `standard` preset 再挂回同 id 的 `@deepseek-ai/dsh-tool-bash`（win32 仍 `disabled`）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:44] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:45] 该行只 `ctx.tools.register`，自己不 `provide` `shell`，所以不必 `isolate`。headless overlay 不写 `tool-bash` 行，base 那一行留在 host 全局层。[I]

4. **`LocalBashExecutor` 是 `ctx.subprocess` 的 Consumer。** `static inject = ['subprocess']`。[E: packages/shell/bash-local/src/index.ts:103] 它**不** `inject` `fs`。换 `ctx.fs` 不会改 `bash -c` 的世界；换 `ctx.subprocess`（例如 E2B 的配对 Provider，细节在 [`subsys.execution.e2b`](e2b.md)）会把本执行器的 spawn 一起带走。

5. **`resolve@packages/shell/bash-local/src/index.ts` 填齐 spec，不 spawn。** `timeoutMs` 经 `clampTimeout(requested, config.timeoutMs, config.maxTimeoutMs)`：缺省用 `config.timeoutMs`，只对上钳到 `config.maxTimeoutMs`；per-call 正有限值可以**低于** config 默认。[E: packages/shell/bash-local/src/index.ts:147] [E: packages/util/timeout/src/index.ts:54] [E: packages/shell/bash-local/tests/executor.spec.ts:99] `workdir` 是 `request.workdir ?? config.cwd ?? process.cwd()`；`stdoutMaxBytes` 默认 `maxOutputBytes`。[E: packages/shell/bash-local/src/index.ts:157] [E: packages/shell/bash-local/src/index.ts:153] `stdin` / `env` / `dshEnv` 有才带上。[E: packages/shell/bash-local/src/index.ts:163] `sandboxPolicy` 原样抄回，本类不看它。[E: packages/shell/bash-local/src/index.ts:169] 测试：config `cwd` 可被 per-call `workdir` 覆盖；缺省 `pwd` 等于 `process.cwd()`；超大 `timeoutMs` 被 `maxTimeoutMs` 卡住。[E: packages/shell/bash-local/tests/executor.spec.ts:51] [E: packages/shell/bash-local/tests/executor.spec.ts:59] [E: packages/shell/bash-local/tests/executor.spec.ts:65]

6. **`run` / `start` 把公共命令落成 `bash -c`。** `run@packages/shell/bash-local/src/index.ts` 调 `runArgv(spec, ['bash', '-c', spec.command])`；`start` 同理走 `startArgv`。[E: packages/shell/bash-local/src/index.ts:212] [E: packages/shell/bash-local/src/index.ts:243] 子类在围栏边界替换这份 argv 后再复用同一套生命周期。

7. **前台：`runArgv` 熔合 timeout 与 abort，只把基础设施失败 reject。** `deadline(spec.signal, spec.timeoutMs, 'BASH_TIMEOUT')` 之后 `this.ctx.subprocess.spawn(this.spawnSpec(…))`，等 `handle.done`。[E: packages/shell/bash-local/src/index.ts:226] [E: packages/shell/bash-local/src/index.ts:227] `timedOut` 只认本执行器的 `BASH_TIMEOUT`；其它 abort 记 `aborted`，二者互斥。[E: packages/shell/bash-local/src/index.ts:230] [E: packages/shell/bash-local/src/index.ts:231] 结算走 `return { ...outcome, timedOut, aborted, … }`，所以 timeout / abort 是 **resolve** 不是 reject。[E: packages/shell/bash-local/src/index.ts:232] [E: packages/shell/bash-local/tests/executor.spec.ts:102] [E: packages/shell/bash-local/tests/executor.spec.ts:114] 坏 `workdir` 的 spawn 失败则 reject（`ENOENT`）。[E: packages/shell/bash-local/tests/executor.spec.ts:133] 自杀 `SIGTERM` 既不是 timedOut 也不是 aborted。[E: packages/shell/bash-local/tests/executor.spec.ts:127] [E: packages/shell/bash-local/tests/executor.spec.ts:128]

8. **后台：`startArgv` 立刻返回，忽略 `timeoutMs`。** spawn 用 `spec.signal`，不用 deadline。[E: packages/shell/bash-local/src/index.ts:257] 测试：`start` 在 150ms 内返回 `status: 'running'`。[E: packages/shell/bash-local/tests/executor.spec.ts:166] spawn 失败时 `done` **resolve**（不 reject），`status = 'killed'`，`readOutput` 给出 `spawn failed:`。[E: packages/shell/bash-local/src/index.ts:285] [E: packages/shell/bash-local/tests/executor.spec.ts:295] `readOutput` 增量消费，stderr 标成 `[stderr]` 段。[E: packages/shell/bash-local/tests/executor.spec.ts:204]

9. **活着的后台进程属于 `ctx.subprocess`，不属于执行器 fiber。** 卸掉 executor fiber 后进程仍 running；卸掉 subprocess 服务才杀树并 await。[E: packages/shell/bash-local/tests/executor.spec.ts:319] [E: packages/shell/bash-local/tests/executor.spec.ts:324] `kill()` 对 running 调 `terminate()` 一次返回 `true`，已结算再调返回 `false`。[E: packages/shell/bash-local/src/index.ts:311]

10. **timeout / 输出预算走 local Config + Settings，不走 sandbox Config。** 构造里 `installSettingsSection(ctx, SHELL_SETTINGS_NAMESPACE, LocalBashExecutor.Config, …)`，`validate` 是 `assertServiceableBashConfig`。[E: packages/shell/bash-local/src/index.ts:128] [E: packages/shell/bash-local/src/index.ts:129] Settings 把 `timeoutMs` 改成 `5_000` 立刻反映到 `bash.config`；非法值拒绝，composition entry 保留。[E: packages/shell/bash-local/tests/settings.spec.ts:52] [E: packages/shell/bash-local/tests/settings.spec.ts:60] `SandboxBashExecutor` 没有自己的 `Config`：mode / workspaceRoot 在 `ctx.sandboxPolicy`。[E: packages/shell/bash-sandbox/src/index.ts:35]

11. **`SandboxBashExecutor.resolve` 盖上 per-call 政策。** `sandboxPolicy: request.sandboxPolicy ?? this.ctx.sandboxPolicy.resolve()`。[E: packages/shell/bash-sandbox/src/index.ts:85] 工具层传入调用会话解析好的政策；直调落到 deployment `resolve()`。`sandboxMode` 只暴露构造时的 `defaultMode`，给 schema 广告用，不是某次会话的 fold 结果。[E: packages/shell/bash-sandbox/src/index.ts:71] [E: packages/sandbox/sandbox-policy/src/index.ts:135]

12. **`danger-full-access` 不调用 `confine`。** 前台 `super.run(spec)` 后只盖 `{ mode, denied: false }`，没有 `enforcement`；provider 调用次数为 0。[E: packages/shell/bash-sandbox/src/index.ts:91] [E: packages/shell/bash-sandbox/src/index.ts:93] [E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:296] 后台 `super.start(spec)`，结算不写 `proc.sandbox`（`undefined`）。[E: packages/shell/bash-sandbox/src/index.ts:119] [E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:303] 升权到该 mode 同样绕过 provider——grant 本身就是权威，不是先 probe 再放行。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:336]

13. **其余 mode：对精确 argv `confine`，再 spawn 返回的 argv。** `confine@packages/shell/bash-sandbox/src/index.ts` 调 `this.ctx.sandbox.confine(['bash', '-c', command], policy)`。[E: packages/shell/bash-sandbox/src/index.ts:178] 假 provider 记录到的就是这份三元组，不是一条 shell 字符串。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:96] 返回的 argv 原样进 `ctx.subprocess.spawn`（测试用 `env DSH_WRAP=1 bash -c …` 替换）。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:108] `run` / `start` 各咨询一次，本 Consumer **不**缓存 wrap。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:162] runner 选择（bwrap / Landlock / Seatbelt / ACL）在 [`subsys.execution.sandbox-local`](sandbox-local.md)。

14. **不可用必须 fail-loud，禁止静默退回 host。** `SandboxProvider.confine` 自己抛的 `SandboxUnavailableError` 在 `run` / `start` 原样冒出，`code` 是 `SANDBOX_UNAVAILABLE`。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:171] [E: packages/sandbox/sandbox/src/index.ts:124] spawn 阶段若 `isRunnerSpawnFailure`（cwd 可用，且 ENOENT/EACCES 精确指向 argv[0]），前台改抛 `SandboxUnavailableError`。[E: packages/shell/bash-sandbox/src/helpers.ts:44] [E: packages/shell/bash-sandbox/src/index.ts:102] [E: packages/shell/bash-sandbox/src/index.ts:103] 命令已经跑起来之后，stderr 命中 wrap 的 `runnerFailureRules` 同样前台抛，detail 是那一行 fatal 文本。[E: packages/shell/bash-sandbox/src/index.ts:109] [E: packages/shell/bash-sandbox/src/index.ts:111] [E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:603] 后台没有这条 throw 通道：`onProcessDone` 盖 `runnerFailed: true`，`denied` 为 false。[E: packages/shell/bash-sandbox/src/index.ts:163] [E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:617] runner 失败优先于 denial：fatal 行里即使含 `Permission denied` 也不标 denied。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:610] 坏 `workdir` 仍是普通 `ENOENT`，不是 `SandboxUnavailableError`——分类要求 cwd 先可用。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:196] 上游已经 abort 的前台调用保持 cancellation，不改写成 sandbox 错。[E: packages/shell/bash-sandbox/src/index.ts:101] [E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:180]

15. **结算事实按进程记账，不按「最近一次 wrap」。** `start` 把 `mode` / `enforcement` / signatures / runner 规则放进 `processFacts` Map。[E: packages/shell/bash-sandbox/src/index.ts:135] 重叠后台任务：一条测「各自带着自己的 mode」（escalated `workspace-write` 旁边默认 `read-only`，enforcement 都是 `full`）。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:348] 另一条测「各自带着自己的 wrap dialect / enforcement」（`partial` + `permission denied` 对 `full` + `read-only file system`）。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:620] 信号杀死（`exitCode === null`）永不标 denial。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:649] `denied` 只匹配 wrap 自带的文件拒绝方言；Unix 签名下 `mount: Operation not permitted` 不是 denial。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:375]

16. **模型面 Consumer 是 `tool-bash`，升权在 execute body，不在 `tools/pre-execute`。** `inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`。[E: packages/shell/tool-bash/src/index.ts:31] 没有 `ctx.shell` 时插件挂起，`ctx.tools.schemas()` 为空。[E: packages/shell/tool-bash/tests/tools.spec.ts:417] `apply` 读 `ctx.shell.sandboxMode`：基类 `undefined` 则不广告升权字段、不要求 `sandboxPolicy`；围栏执行器则必须能 `ctx.get('sandboxPolicy')`。[E: packages/shell/tool-bash/src/index.ts:192] [E: packages/shell/tool-bash/src/index.ts:196] execute 里若带 `sandbox_permissions` + `justification`，先 `approveEscalation`（唯一放行是 `allowed-once`），再把批准 mode 写进 per-call policy，然后 `ctx.shell.run(ctx.shell.resolve(…))` 或 `jobs.start` → `ctx.shell.start`。[E: packages/shell/tool-bash/src/index.ts:335] [E: packages/sandbox/sandbox/src/escalation.ts:183] [E: packages/shell/tool-bash/src/index.ts:370] [E: packages/shell/tool-bash/src/index.ts:380] 字段表在 [`surface.tools.bash`](../../surface/tools/bash.md)，本页不展开。

17. **围栏不挂 `tools/pre-execute`。** `SandboxBashExecutor` 不注册 waterfall。`tools/pre-execute` 的 innermost `next` 是 `allow`；listener 不调用传入的 `next()` 就不会 `cbs.shift()`，默认 allow 到不了，`tool-bash` 的 `execute`（也就没有 `confine` / `spawn`）不会跑。[E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1477] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] 文件围栏在 `dsh-fs-sandbox` 的 `writeText` / `editText`；进程围栏在本页的 `confine`。两者都读同一份 `ctx.sandboxPolicy`，但 **`ctx.fs` 与 `ctx.subprocess` 没有运行时耦合**。

## 设计动机

把「怎么跑 bash」和「跑之前要不要 confine」拆成继承，而不是两个抢 `ctx.shell` 的平行插件：examples / hooks / 测试可以只挂 `LocalBashExecutor`；shipped `dsh-base` 换成子类后，`tool-bash` 的 `inject` 与 `defineTool({ name: 'bash' })` 一行都不用改。政策不进本包 Config，是为了跟 `fs-sandbox` 读同一份 `ctx.sandboxPolicy`，避免两家各自 drift。

confine 吃精确 argv、再把 provider 返回的 argv 原样 spawn：runner 先于内层 `bash -c` 启动（`BASH_ENV` 钩子测到 `runner` 行写在 `hook` 之前）。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:138] 这样 sandbox 包装的是即将 spawn 的那条进程，而不是再包一层「请你自己去解析这串 shell」。

fail-loud 是产品事实：没有 usable runner 时拒绝裸跑。Codex 是 OS sandbox，还管网络 / 进程面；DSH 这一缝的 `SandboxMode` 只有三个文件副作用档，网络与进程可见性不在这个词表里。[I] Pi 没有 in-core 执行沙箱。本页不把 DSH 写成 Seatbelt/seccomp 产品。

进程树所有权放在 `ctx.subprocess`：执行器 HMR / fiber dispose 不能把还在跑的后台 job 一起带走，这和 jobs 注册表「登记活过 producer fiber」一致。

## Gotcha

- **默认树里没有 `id: bash-local`。** 搜 `@deepseek-ai/dsh-bash-local` 会在 examples 与测试里出现；`dsh web` / `dsh-base` 挂的是 `id: bash-sandbox`。[E: packages/bundle/base/cordis.patch.yml:179]
- **`LocalBashExecutor.sandboxMode` 是 `undefined`。** 只挂裸 local 时 `tool-bash` 不广告 `sandbox_permissions`，也不要求 `ctx.sandboxPolicy`。[E: packages/shell/shell/src/index.ts:76] [E: packages/shell/tool-bash/src/index.ts:193]
- **`SandboxBashExecutor.sandboxMode` 冻结在构造时的 deployment default。** 会话 `sandbox/mode` override 只进入 `resolve()` 盖上的 `spec.sandboxPolicy`，不改 getter。
- **后台 `danger-full-access` 的 `proc.sandbox` 是 `undefined`，前台却有 `{ mode, denied: false }`。** 不要用「有没有 sandbox 字段」判断命令是否跑过。[E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:295] [E: packages/shell/bash-sandbox/tests/sandbox.spec.ts:303]
- **坏 cwd 不是 `SANDBOX_UNAVAILABLE`。** `isRunnerSpawnFailure` 先要求 `isUsableWorkdir`；缺目录走普通 `ENOENT`。[E: packages/shell/bash-sandbox/src/helpers.ts:44]
- **后台 spawn 失败走 `runnerFailed` 戳记，前台走 throw。** 没有统一的「返回一个 isError result」通道。
- **`start` 不理 `timeoutMs`。** 停后台靠 `kill()` 或 `spec.signal`。[E: packages/shell/bash-local/src/index.ts:257]
- **围栏不在 `tools/pre-execute`。** 在那一层加「替 bash confine」会跟本执行器重复，而且 listener 忘了 `next()` 会让整个 tool body 消失。
- **不要并列挂 local 与 sandbox。** 两个都 `provide` `shell`，load 期 duplicate-service 抛。[E: packages/shell/shell/tests/service.spec.ts:82]
- **preset 再 publish 一份 `ctx.shell` 必须 `isolate`。** shipped preset 不这么做；host 上的 `bash-sandbox` 给所有会话共用。这和 `minimal` 给自己 `isolate.fs: true` + `dsh-fs-local` 不是对称关系。
- **`dshEnv` 覆盖 `ENV_OVERRIDES` 和 caller `env`。** 显式 `NO_COLOR` 挡不住托管快照里的同名键。[E: packages/shell/bash-local/src/index.ts:196]
- **credential scrub 不在本包。** spawn 的显式 env 交给 `ctx.subprocess` 在 ambient scrub 之后 merge。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.shell` | `@deepseek-ai/dsh-shell` 的 `ShellExecutor`；`super(ctx, 'shell')`；基类 `sandboxMode === undefined` | **host**：裸实现 `LocalBashExecutor`（examples / 测试）。**默认 shipped**：`SandboxBashExecutor`，`dsh-base` 行 `id: bash-sandbox`（win32 `disabled`）；win32 换 `id: pwsh-sandbox` | **preset 面**（web）或 **host 面**（headless）的 `dsh-tool-bash`：`inject` 含 `shell`；`ctx.shell.resolve` → `run` / `start`。没有 `ctx.shell` 则插件挂起 |
| `ctx.subprocess` | `SubprocessRuntime`（[`subsys.execution.subprocess`](subprocess.md)） | **host** `id: subprocess` = `dsh-subprocess-local` | `LocalBashExecutor`：`static inject = ['subprocess']`；`runArgv` / `startArgv` 调 `this.ctx.subprocess.spawn`。本执行器是这条缝的 Consumer，不是它的 Provider |
| `ctx.sandbox` | `SandboxProvider.confine(argv, policy)`（[`subsys.execution.sandbox`](sandbox.md)） | **host** `id: sandbox` = `dsh-sandbox-local`（选择链在 [`subsys.execution.sandbox-local`](sandbox-local.md)） | `SandboxBashExecutor.confine`：传入 `['bash', '-c', command]`，spawn **返回**的 argv。`danger-full-access` 不调用 |
| `ctx.sandboxPolicy` | `SandboxPolicyService`（[`subsys.execution.sandbox-policy`](sandbox-policy.md)） | **host** `id: sandbox-policy`（base 默认 mode 来自 `DSH_PERMISSION_MODE`，否则 `workspace-write`） | `SandboxBashExecutor`：构造读 `defaultMode`；`resolve()` 读 `ctx.sandboxPolicy.resolve()`。政策不在本包 Config |
| 升权 | `approveEscalation`；grant 只有 `allowed-once` | **host** `id: approval` | `tool-bash` execute **body** 开头，不在 `tools/pre-execute`，也不在本执行器 |
| `tools/pre-execute` | `Events['tools/pre-execute']`；不 `next()` 则链停 | 任意 `ctx.on`（permission 等） | `ToolRuntime` 默认 `allow`。本执行器**不**在这条 waterfall 上注册 |

换 `ctx.shell` 的 Provider（sandbox → 裸 local，或 bash → pwsh）会改 `tool-bash` / `tool-pwsh` 看见的世界，但模型工具名仍由 Consumer 写进 `ctx.tools`。只换 `ctx.fs` 不会带走 `bash -c`。

## Sources

- packages/shell/bash-local/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/shell/bash-sandbox/src/helpers.ts
- packages/shell/bash-local/tests/executor.spec.ts
- packages/shell/bash-local/tests/settings.spec.ts
- packages/shell/bash-sandbox/tests/sandbox.spec.ts
- packages/shell/bash-sandbox/tests/partial-landlock.spec.ts
- packages/shell/bash-sandbox/tests/bwrap.e2e.ts
- packages/shell/bash-sandbox/tests/landlock.e2e.ts
- packages/shell/bash-sandbox/tests/seatbelt.e2e.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/shell/shell/src/index.ts
- packages/shell/shell/src/types.ts
- packages/shell/shell/tests/service.spec.ts
- packages/shell/tool-bash/src/index.ts
- packages/shell/tool-bash/tests/tools.spec.ts
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/sandbox/sandbox-policy/src/index.ts
- packages/core/tools/src/index.ts
- packages/util/timeout/src/index.ts
- vendor/cordis/src/events.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml

## 相关

- [spine.overview](../../spine/overview.md) — Cordis 组合运行时与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer；`ctx.fs` 与 `ctx.subprocess` 无运行时耦合。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute`；升权不在 pre-execute。
- [subsys.execution.shell](shell.md) — `ctx.shell` Definition 与 `ctx.shellEnv`。
- [subsys.execution.subprocess](subprocess.md) — `spawn` / scrub / 进程树。
- [subsys.execution.sandbox](sandbox.md) — `confine` 合同、`SandboxMode`、`SANDBOX_UNAVAILABLE`、`approveEscalation`。
- [subsys.execution.sandbox-policy](sandbox-policy.md) — per-call `resolve()` 与 `sandbox/mode` fold。
- [subsys.execution.sandbox-local](sandbox-local.md) — bwrap / Landlock / Seatbelt / Windows ACL 选择链。
- [subsys.execution.pwsh-local](pwsh-local.md) — win32 默认 `ctx.shell`。
- [surface.tools.bash](../../surface/tools/bash.md) — 模型可见 `bash` 的 schema 与 execute。
- [surface.misc.security](../../surface/misc/security.md) — 审批与沙箱产品面（index 仍为 planned）。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — `dsh-base` 真树与 shell 双栈 `disabled`。
