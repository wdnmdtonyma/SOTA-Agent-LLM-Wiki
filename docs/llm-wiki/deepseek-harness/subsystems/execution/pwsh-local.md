---
id: subsys.execution.pwsh-local
title: pwsh-local provider
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/shell/pwsh-local/src/index.ts
  - packages/shell/pwsh-local/src/resolve.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/shell/pwsh-sandbox/src/helpers.ts
  - packages/shell/pwsh-local/tests/executor.spec.ts
  - packages/shell/pwsh-local/tests/settings.spec.ts
  - packages/shell/pwsh-sandbox/tests/sandbox.spec.ts
  - packages/shell/pwsh-sandbox/tests/acl.e2e.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/shell/tests/service.spec.ts
  - packages/shell/tool-pwsh/src/index.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox-local/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/tests/windows-shell.spec.ts
symbols:
  - PwshLocalExecutor
  - SandboxPwshExecutor
  - resolvePwshPath
  - candidatePwshPaths
related:
  - spine.overview
  - spine.capability-seams
  - spine.tool-call-anatomy
  - subsys.execution.shell
  - subsys.execution.bash-local
  - subsys.execution.subprocess
  - subsys.execution.sandbox
  - subsys.execution.sandbox-local
  - surface.tools.pwsh
  - surface.misc.security
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-pwsh-local` 的 `PwshLocalExecutor` 与 `@deepseek-ai/dsh-pwsh-sandbox` 的 `SandboxPwshExecutor` 是 `ctx.shell` 的 **win32 Provider**：本地侧把命令编成一条 `pwsh -NoLogo -NoProfile -NonInteractive -Command` argv，交给 `ctx.subprocess.spawn`；shipped `dsh-base` 挂的是围栏包装（`id: pwsh-sandbox`），对**精确 argv** 调 `ctx.sandbox.confine`，runner 起不来就抛 `SANDBOX_UNAVAILABLE`，不是「Windows 没有 sandbox」。

## 能回答的问题

- win32 上默认 `ctx.shell` 是哪个 class、哪一行 bundle `id`？`dsh-pwsh-local` 自己有没有 shipped 行？
- `resolvePwshPath` 怎样选可执行文件？显式 `pwshPath`、Store 别名、PowerShell 5.1 各排第几？
- `SandboxPwshExecutor` 何时调用 `ctx.sandbox.confine`？`danger-full-access` 还围不围栏？
- runner 启动失败时 foreground 抛什么、background 盖什么事实？会不会退回裸跑？
- host 面的 `pwsh-sandbox` 和 agent-preset 面的 `tool-pwsh` 谁留在进程、谁被 `dsh-web-app` 关掉再由 preset 挂回？
- 本包有没有 waterfall？`tools/pre-execute` 管不管这条围栏？只换 `ctx.fs` 会不会搬走 `pwsh -Command`？

## 职责边界

本页拥有两条 **Provider** 实现，占同一个 Cordis 服务键 `ctx.shell`。`PwshLocalExecutor extends ShellExecutor`，`static inject = ['subprocess']`：它是 `ctx.subprocess` 的 Consumer，负责 command defaulting、deadline、UTF-8 preamble、可执行解析、以及把精确 argv 交给 `spawn`。[E: packages/shell/pwsh-local/src/index.ts:128] [E: packages/shell/pwsh-local/src/index.ts:129] `SandboxPwshExecutor extends PwshLocalExecutor`，`static override inject = ['subprocess', 'sandbox', 'sandboxPolicy']`：在 local 的 argv 缝上加 `ctx.sandbox.confine`，并给 `result.sandbox` / `proc.sandbox` 盖 mode、denial、enforcement、`runnerFailed`。[E: packages/shell/pwsh-sandbox/src/index.ts:52] [E: packages/shell/pwsh-sandbox/src/index.ts:53]

`ShellExecutor` 构造函数 `super(ctx, 'shell')` 登记该键；同一 realm 再挂第二个实现会抛 `service "shell" has been registered`。[E: packages/shell/shell/src/index.ts:67] [E: packages/shell/shell/tests/service.spec.ts:82] 这就是 bash 栈与 pwsh 栈必须用对称 `disabled` 互斥的原因：两边都 `provide` 同一把 `ctx.shell`。

本页**不**拥有：

- `ShellExecutor` 合同、`run` 对非零退出/timeout/abort **resolve** 的语义、以及 Settings 命名空间 `SHELL_SETTINGS_NAMESPACE` 的归属 — [`subsys.execution.shell`](shell.md)。本页只消费该命名空间：`installSettingsSection(ctx, SHELL_SETTINGS_NAMESPACE, …)`。[E: packages/shell/pwsh-local/src/index.ts:168] [E: packages/shell/shell/src/index.ts:22]
- `ctx.subprocess.spawn` 的 process tree / spill / SIGTERM→grace→SIGKILL — [`subsys.execution.subprocess`](subprocess.md)。
- `ctx.sandbox` 词表、`approveEscalation`、`writableRoots` — [`subsys.execution.sandbox`](sandbox.md)。升权发生在 **tool body** 里的 `approvePwshEscalation`，不在本执行器。[E: packages/shell/tool-pwsh/src/index.ts:353]
- bwrap / Landlock / Seatbelt / Windows ACL runner 选择链 — [`subsys.execution.sandbox-local`](sandbox-local.md)。本页只写：win32 链是 `['windows-acl']`，confine 交给那条链。[E: packages/sandbox/sandbox-local/src/index.ts:165]
- 模型可见 `pwsh` 的 schema / `run_in_background` / job kind — [`surface.tools.pwsh`](../../surface/tools/pwsh.md)。Consumer 是 `dsh-tool-pwsh`，`inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`。[E: packages/shell/tool-pwsh/src/index.ts:49]
- `ctx.fs`。pwsh 从不走文件系统缝；只换 `ctx.fs` 不会把 `pwsh -Command` 搬到远程。

**host 面 vs agent-preset 面。** `id: pwsh-sandbox` 写在 `dsh-base` 的 root insert 上，是进程级 host Provider。[E: packages/bundle/base/cordis.patch.yml:184] [E: packages/bundle/base/cordis.patch.yml:185] `dsh-web-app` 把模型可见的 `id: tool-pwsh` 写成 `disabled: true`，**不**关掉执行器行。[E: packages/bundle/web-app/cordis.patch.yml:296] [E: packages/bundle/web-app/cordis.patch.yml:297] 组合 `dsh-base + dsh-web-app` 之后：`pwsh-sandbox` 仍按平台门控（win32 启用、linux 禁用），`tool-pwsh` 在所有平台都是 `disabled === true`；`sandbox` / `sandbox-policy` / `fs-sandbox` / `approval` 保持启用。[E: apps/cli/tests/windows-shell.spec.ts:59] [E: apps/cli/tests/windows-shell.spec.ts:60] [E: apps/cli/tests/windows-shell.spec.ts:64] [E: apps/cli/tests/windows-shell.spec.ts:69] preset（`standard` / `code` / `cordis`）再挂回 Consumer 行 `id: tool-pwsh`，同样 `disabled: !!js process.platform !== 'win32'`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:48] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50] 默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

**waterfall。** 本包不注册 `fs/write-intent` 这类 waterfall 槽，执行路径里没有 `next()`。围栏是 `this.ctx.sandbox.confine(this.argv(spec), policy)` 的同步方法调用，**不**挂在 `tools/pre-execute`。[E: packages/shell/pwsh-sandbox/src/index.ts:184] 忘了 `next()` 会卡住的是别的缝（例如 `tools/pre-execute` 默认 `allow` 走不到）；对 pwsh 围栏，漏掉的是 `confine` 本身，而 shipped 包装在 `danger-full-access` 之外**总会**调用它。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/shell/pwsh-local/src/index.ts` | `PwshLocalExecutor`：argv、resolve、run/start、settings |
| `packages/shell/pwsh-local/src/resolve.ts` | `candidatePwshPaths` / `resolvePwshPath`（无包依赖，供 coverage probe 共用） |
| `packages/shell/pwsh-sandbox/src/index.ts` | `SandboxPwshExecutor`：confine、fail-loud、sandbox 事实 |
| `packages/shell/pwsh-sandbox/src/helpers.ts` | `isRunnerSpawnFailure` / `classifyRunnerFailure` / `classifyDenial`（与 bash-sandbox 同方言） |
| `packages/shell/pwsh-local/tests/executor.spec.ts` | 可执行解析 + 真 pwsh 的 run/start 合同 |
| `packages/shell/pwsh-local/tests/settings.spec.ts` | 共享 `shell` Settings 段；`pwshPath` 变更才重解析 |
| `packages/shell/pwsh-sandbox/tests/sandbox.spec.ts` | fake `ctx.sandbox`：精确 argv、bypass、fail-closed |
| `packages/shell/pwsh-sandbox/tests/acl.e2e.ts` | win32 真 ACL runner + 真 pwsh |
| `packages/bundle/base/cordis.patch.yml` | shipped `id: pwsh-sandbox` 与平台 `disabled` |
| `apps/cli/tests/windows-shell.spec.ts` | base+web-app 组合后的真实 roster |

## 数据模型

| 符号 | 要点 |
|---|---|
| `PwshLocalExecutor.Config` | `cwd?` / `pwshPath?` 无 schema 默认；`timeoutMs` 默认 `120_000`，`maxTimeoutMs` `600_000`，`maxOutputBytes` `64_000`，`maxSpillBytes` 64MiB，`graceMs` `3_000`。[E: packages/shell/pwsh-local/src/index.ts:131] [E: packages/shell/pwsh-local/src/index.ts:133] 政策不在这份 Config。 |
| `SandboxPwshExecutor.Config` | `export type Config = LocalConfig`。无自己的 `static Config`；mode / workspaceRoot 在 `ctx.sandboxPolicy`。[E: packages/shell/pwsh-sandbox/src/index.ts:40] |
| `resolvePwshPath(configured, env, platform)` | 非空 `configured` 原样信任；`win32` 按 `candidatePwshPaths` 取第一个 `lstat` 为 file/symlink 的路径；否则 `'pwsh'`。[E: packages/shell/pwsh-local/src/resolve.ts:72] [E: packages/shell/pwsh-local/src/resolve.ts:78] |
| `candidatePwshPaths` | `%ProgramFiles%\PowerShell\7\pwsh.exe` → `PATH` 各段的 `pwsh.exe`（剥引号）→ `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`。[E: packages/shell/pwsh-local/src/resolve.ts:25] [E: packages/shell/pwsh-local/src/resolve.ts:32] [E: packages/shell/pwsh-local/src/resolve.ts:35] |
| `ENV_OVERRIDES` | 对象里只有 `NO_COLOR=1`、`PAGER=cat`、`GIT_PAGER=cat` 三项，不含 `TERM`。[E: packages/shell/pwsh-local/src/index.ts:35] [E: packages/shell/pwsh-local/src/index.ts:36] [E: packages/shell/pwsh-local/src/index.ts:37] |
| `ENCODING_PREAMBLE` | 每条命令前缀 `[Console]::OutputEncoding` + `$OutputEncoding` UTF-8，专治 5.1 的 OEM 代码页。[E: packages/shell/pwsh-local/src/index.ts:49] |
| `sandboxMode` | `ShellExecutor` 基类返回 `undefined`；`SandboxPwshExecutor` 覆盖为构造时读到的 `ctx.sandboxPolicy.defaultMode`。[E: packages/shell/shell/src/index.ts:76] [E: packages/shell/pwsh-sandbox/src/index.ts:79] |
| `result.sandbox` / `proc.sandbox` | confined：`{ mode, denied, enforcement, runnerFailed? }`；`danger-full-access` 前台盖 `{ mode, denied: false }`，后台 **不**盖事实。[E: packages/shell/pwsh-sandbox/src/index.ts:101] [E: packages/shell/pwsh-sandbox/src/index.ts:127] |
| `SandboxUnavailableError` | `HarnessError`，`code` 是 `SANDBOX_UNAVAILABLE`。消息点名 Windows ACL restricted-token runner。[E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox/src/index.ts:140] |

`SandboxMode` 只有 `read-only` / `workspace-write` / `danger-full-access`。网络与进程可见性不在这个词汇里；不要把本缝写成 Codex 级 Seatbelt/seccomp 产品。

## 控制流

1. **组合选栈。** `dsh-base` 同时写下 `id: bash-sandbox`（`disabled: !!js process.platform === 'win32'`）与 `id: pwsh-sandbox`（`disabled: !!js process.platform !== 'win32'`）。`base.spec.ts` 在 win32/linux 两个影子 `process` 上求值，钉死「每台宿主恰好一套」。没有 `windows.cordis.patch.yml`。`SandboxPwshExecutor@packages/shell/pwsh-sandbox/src/index.ts` 是 win32 默认 `ctx.shell`。[E: packages/bundle/base/cordis.patch.yml:180] [E: packages/bundle/base/cordis.patch.yml:186] [E: packages/bundle/base/tests/base.spec.ts:64] [E: packages/bundle/base/tests/base.spec.ts:75]

2. **构造登记。** Cordis 先满足 `inject`，再 `new SandboxPwshExecutor(ctx, config)` → `super` 进 `PwshLocalExecutor` → `ShellExecutor` 的 `super(ctx, 'shell')`。`assertServiceablePwshConfig` 拒绝非正有限数字和越界 `graceMs`。`resolvePwshPath(entry.pwshPath)` 写入 `this.resolvedPwshPath`。`PwshLocalExecutor.constructor@packages/shell/pwsh-local/src/index.ts` [E: packages/shell/pwsh-local/src/index.ts:164] [E: packages/shell/pwsh-local/src/index.ts:167]

3. **可执行解析。** `resolvePwshPath@packages/shell/pwsh-local/src/resolve.ts`：显式非空路径不探测；win32 才扫 well-known 位置。`candidateExists` 用 `lstatSync`（不 follow reparse），file **或** symlink 都算可 spawn，目录不算——这是给 Microsoft Store app execution alias 的：`stat` 会撞 EACCES，`lstat` 仍看见条目。[E: packages/shell/pwsh-local/src/resolve.ts:48] [E: packages/shell/pwsh-local/src/resolve.ts:49] [E: packages/shell/pwsh-local/tests/executor.spec.ts:70] [E: packages/shell/pwsh-local/tests/executor.spec.ts:139]

4. **Consumer 进 execute。** `dsh-tool-pwsh` 没有 `ctx.shell` 就挂起。execute 里若带 `sandbox_permissions`+`justification` 先 `approvePwshEscalation`（内部再调 `approveEscalation`；升权合同在 [`subsys.execution.sandbox`](sandbox.md)），再组 `request`（含 `dshEnv: ctx.shellEnv.collect(exec)` 与 per-call `sandboxPolicy`），前台 `ctx.shell.run(ctx.shell.resolve(…))`，后台 `ctx.shell.start(ctx.shell.resolve(request))`。字段表在 [`surface.tools.pwsh`](../../surface/tools/pwsh.md)，本页不展开。[E: packages/shell/tool-pwsh/src/index.ts:353] [E: packages/shell/tool-pwsh/src/index.ts:387] [E: packages/shell/tool-pwsh/src/index.ts:397]

5. **`resolve` 填默认。** `PwshLocalExecutor.resolve`：`workdir = request.workdir ?? config.cwd ?? process.cwd()`；`timeoutMs` 经 `clampTimeout` 封顶 `maxTimeoutMs`；透传 `stdin` / `env` / `dshEnv` / `sandboxPolicy`。`SandboxPwshExecutor.resolve` 再盖 `sandboxPolicy: request.sandboxPolicy ?? ctx.sandboxPolicy.resolve()`——直调（无 tool）回落到部署政策。`SandboxPwshExecutor.resolve@packages/shell/pwsh-sandbox/src/index.ts` [E: packages/shell/pwsh-local/src/index.ts:200] [E: packages/shell/pwsh-sandbox/src/index.ts:93]

6. **编精确 argv。** `argv(spec)` 固定为 `[pwshPath, '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', ENCODING_PREAMBLE + spec.command]`。命令是 **一个** `-Command` 元素：PowerShell 自己解析文本，没有 `bash -c` 那种二次 quoting；原生 `C:\...` 原样穿过。套件断言 `argv[5] === preamble + command`。`PwshLocalExecutor.argv@packages/shell/pwsh-local/src/index.ts` [E: packages/shell/pwsh-local/src/index.ts:218] [E: packages/shell/pwsh-local/tests/executor.spec.ts:186]

7. **`danger-full-access` 绕过 confine。** `SandboxPwshExecutor.run` 读 `spec.sandboxPolicy.mode`；等于 `'danger-full-access'` 时 `super.run(spec)`（即未包裹的 `this.argv(spec)`），返回 `{ mode, denied: false }`，**不**调用 `ctx.sandbox.confine`。`start` 同样 `return super.start(spec)`，后台不写 `proc.sandbox`。套件要求 `calls` 长度为 0。`SandboxPwshExecutor.run@packages/shell/pwsh-sandbox/src/index.ts` [E: packages/shell/pwsh-sandbox/src/index.ts:99] [E: packages/shell/pwsh-sandbox/src/index.ts:127] [E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:196]

8. **其余 mode：confine 精确 argv 再 spawn。** `confine` 把 `this.argv(spec)` 交给 `ctx.sandbox.confine`；返回的 `confined.argv` 原样进 `runArgv` / `startArgv`。套件检查 provider 收到的 `argv[0]` 匹配 `pwsh`、含 `-NonInteractive`、最后一项含命令原文，且 `policy` 就是 per-call 那份。win32 上 `LocalSandboxProvider` 的链是 `windows-acl`（ACL restricted-token），**不是**「无沙箱」。runner 选择细节在 [`subsys.execution.sandbox-local`](sandbox-local.md)。[E: packages/shell/pwsh-sandbox/src/index.ts:184] [E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:178] [E: packages/sandbox/sandbox-local/src/index.ts:165]

9. **`runArgv` → `ctx.subprocess.spawn`。** `spawnSpec` 的 `env` 是 `{ ...ENV_OVERRIDES, ...spec.env, ...spec.dshEnv }`（后写覆盖）；stdout/stderr 都是 collect+spill。前台用 `deadline(spec.signal, spec.timeoutMs, 'BASH_TIMEOUT')`——原因字符串与 bash-local **相同**，`timeoutOf` 也按这个字符串认 `timedOut`。后台 `startArgv` **忽略** `timeoutMs`，只吃 `spec.signal` / `kill()`。`PwshLocalExecutor.runArgv@packages/shell/pwsh-local/src/index.ts` [E: packages/shell/pwsh-local/src/index.ts:240] [E: packages/shell/pwsh-local/src/index.ts:262] [E: packages/shell/pwsh-local/src/index.ts:263] [E: packages/shell/pwsh-local/src/index.ts:286]

10. **fail-loud，禁止裸跑。** 前台：`runArgv` 抛错且 `isRunnerSpawnFailure(error, confined.argv[0], workdir)`（仅 `ENOENT`/`EACCES` + argv[0] 出处 + 可进入的 cwd）→ `throw new SandboxUnavailableError(mode, …)`；进程起来了但 `classifyRunnerFailure` 命中 `confine()` 返回的 `runnerFailureRules` 同样抛。不可归因的 spawn 错（例如 `EMFILE`）原样再抛，**不会**改成 unconfined 重试。上游 `signal.aborted` 优先于 runner 归因。后台：同步可归因抛同样变 `SandboxUnavailableError`；异步 spawn 失败则 `done` resolve、`status: 'killed'`，`onProcessDone` 盖 `runnerFailed: true`（`denied: false`），读路径带 `spawn failed:`。套件标题写死 `never unconfined`。`SandboxPwshExecutor.run@packages/shell/pwsh-sandbox/src/index.ts` [E: packages/shell/pwsh-sandbox/src/index.ts:111] [E: packages/shell/pwsh-sandbox/src/index.ts:119] [E: packages/shell/pwsh-sandbox/src/helpers.ts:15] [E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:234] [E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:310]

11. **生命周期属 `ctx.subprocess`。** 卸掉执行器 fiber，后台进程继续跑；卸掉 `LocalSubprocessRuntime` 才杀树并 join。local 前台坏 workdir 是 reject（基础设施失败）；后台坏 workdir 是 `killed` + stderr 笔记——这是 `ShellExecutor` 合同，sandbox 包装在可归因 runner 失败时把它升级成 `SANDBOX_UNAVAILABLE` / `runnerFailed`。[E: packages/shell/pwsh-local/tests/executor.spec.ts:467] [E: packages/shell/pwsh-local/tests/executor.spec.ts:472] [E: packages/shell/pwsh-local/tests/executor.spec.ts:443]

真 Windows 上 `acl.e2e.ts` 用 `LocalSandboxProvider` + 真 pwsh：`read-only` 拒绝对 workspace / temp / escape 路径的 `Set-Content`，但 `Get-Content` 秘密文件仍可读——沙箱罩的是**文件副作用**，不是读隔离。[E: packages/shell/pwsh-sandbox/tests/acl.e2e.ts:73] [E: packages/shell/pwsh-sandbox/tests/acl.e2e.ts:76]

## 设计动机

- **一套 patch、两套栈。** bash 没有 Windows runner，所以 win32 用 pwsh 行换掉 POSIX 行，而不是另写 `windows.cordis.patch.yml`。两边都 `provide` `ctx.shell`，互斥必须在 load 期用 `disabled` 做完。
- **argv 缝而不是再包一层 shell。** `-Command` 吃一个字符串，quoting 域与 `bash -c` 不同；sandbox  twin 才能对**同一条** argv 调 `confine`，与 [`subsys.execution.bash-local`](bash-local.md) 的 `runArgv`/`startArgv` 对称。
- **5.1 仍是 last-resort。** 探测顺序把 Windows PowerShell 5.1 放最后，但一旦落到它，OEM 代码页会弄脏 UTF-8 collector，所以 preamble 每条都加，pwsh 7 吃下去是空操作。
- **Store 别名用 lstat。** `stat` 跟 reparse 会 EACCES，coverage probe 与执行器必须共用 `resolve.ts`，否则「测到了但运行时解析不同」会豁免错文件。
- **政策不进执行器 Config。** timeout/maxOutput 是 local 预算；mode/root 是 `ctx.sandboxPolicy` 的 per-call 事实。这样 fs-sandbox 与 pwsh-sandbox 读同一份政策，而不是两份 Config 漂移。
- **fail-closed 对齐 Definition。** `SandboxProvider.confine` 必须返回 enforcing argv 或失败；执行器侧把「命令没跑」从「命令被拒」里拆出来，避免把 runner stderr 里的 denial 词误判成策略拒绝后继续裸跑。
- **对 peer harness。** Codex 的 OS sandbox 还管网络/进程面；DSH 这一缝只罩文件副作用。Pi 没有 in-core 执行沙箱。Claude 用 `TERM=dumb` 压交互；pwsh 只设 `NO_COLOR`。

## Gotcha

- **shipped 行是 `pwsh-sandbox`，不是 `pwsh-local`。** `dsh-base` insert 没有 `id: pwsh-local`；`SandboxPwshExecutor` **extends** `PwshLocalExecutor` 并独占 `ctx.shell`。测试 overlay / 例子可以只挂 unconfined local，那不是默认产品树。[I]
- **`bash-sandbox` 行带 `timeoutMs: 60000`，`pwsh-sandbox` 行没有 `config`。** win32 前台默认超时是 schema 的 `120_000`，不是 60s。[E: packages/bundle/base/cordis.patch.yml:182] [E: packages/shell/pwsh-local/src/index.ts:133]
- **deadline 原因字符串是 `'BASH_TIMEOUT'`。** 从 bash-local 镜像过来。改一边会让 `timedOut` 分类静默失效。[E: packages/shell/pwsh-local/src/index.ts:262] [E: packages/shell/pwsh-local/src/index.ts:267]
- **Settings 段名是 `shell`，两家共用。** 跨平台带走的 `timeoutMs` / `pwshPath` 文档仍解析；`onChange` 只在声明的 `pwshPath` 变化时重跑 `resolvePwshPath`，改 `timeoutMs` 不重新探盘。[E: packages/shell/pwsh-local/tests/settings.spec.ts:72] [E: packages/shell/pwsh-local/tests/settings.spec.ts:82]
- **空字符串 `pwshPath` 不算「显式」。** `configured.length > 0` 才短路；`''` 掉进平台探测，最后仍可能是裸 `'pwsh'`。[E: packages/shell/pwsh-local/src/resolve.ts:72] [E: packages/shell/pwsh-local/tests/executor.spec.ts:81]
- **后台 `danger-full-access` 的 `proc.sandbox` 是 `undefined`。** 前台会盖 `{ mode, denied: false }`。Consumer 不能假设两种路径字段同形。[E: packages/shell/pwsh-sandbox/src/index.ts:101] [E: packages/shell/pwsh-sandbox/src/index.ts:127] [E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:324]
- **Windows 强杀常常是 exit 1、无 signal。** POSIX 才报 `SIGTERM`/`SIGKILL`。模型侧文案在 tool 层，执行器只透传 `outcome`。[E: packages/shell/pwsh-local/tests/executor.spec.ts:284]
- **windows-acl 的 runner-failure 规则带 `allowedExitCodes: [127]`。** 被围栏的命令若只是在别的退出码下打印了 `windows-acl-run: ` 字样，**不是** runner 失败。[E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:135]
- **`isRunnerSpawnFailure` 在分类时检查 cwd，与 spawn 非原子。** 并发替换路径可能改归因，但不能把一次已经失败的 confine 变成 unconfined 重跑。[E: packages/shell/pwsh-sandbox/src/helpers.ts:47]
- **同时启用两套 shell 栈会在 load 期炸。** 恢复 POSIX bash 到 Windows 必须四行一起改（关 `pwsh-sandbox`/`tool-pwsh` 且开 `bash-sandbox`/`tool-bash`）。[E: packages/shell/shell/tests/service.spec.ts:82]
- **不要写成「Windows 没有 sandbox」。** `acl.e2e.ts` 只在 `win32` 上跑，但跑的是真 `LocalSandboxProvider` + 真 pwsh；`SandboxUnavailableError` 的文案把 ACL runner 与 bwrap/Landlock/`sandbox-exec` 并列。[E: packages/shell/pwsh-sandbox/tests/acl.e2e.ts:29] [E: packages/sandbox/sandbox/src/index.ts:137]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-shell` 的 `ShellExecutor`；augmentation 声明 `Context.shell`。Settings 命名空间 `SHELL_SETTINGS_NAMESPACE`（`'shell'`）也在 Definition 包，不在某个 executor | `ctx.shell`。第一个 `provide('shell')` 的插件就是 Provider（`super(ctx, 'shell')`）。`dsh-base` 没有单独的 `id: shell` 行。[I] [E: packages/shell/shell/src/index.ts:42] [E: packages/shell/shell/src/index.ts:67] |
| **Provider** | **host**：`dsh-base` `id: pwsh-sandbox` = `@deepseek-ai/dsh-pwsh-sandbox`（`SandboxPwshExecutor`），`disabled: !!js process.platform !== 'win32'`。它 **extends** `PwshLocalExecutor`，独占同一 `ctx.shell`。POSIX 对偶是 `id: bash-sandbox`。测试/例子才可能直接挂 `dsh-pwsh-local` | `ctx.shell`；`inject` `subprocess` + `sandbox` + `sandboxPolicy`。`id: sandbox` / `id: sandbox-policy` / `id: subprocess` 同在 host。无 `isolate`。[E: packages/bundle/base/cordis.patch.yml:184] [E: packages/bundle/base/cordis.patch.yml:186] [E: packages/shell/pwsh-sandbox/src/index.ts:53] |
| **Consumer** | `dsh-tool-pwsh`（模型可见名 `pwsh`）。`dsh-web-app` 把 host 上的 `id: tool-pwsh` `disabled: true`；`standard` / `code` / `cordis` preset 按平台挂回。本执行器还消费 `ctx.subprocess`（spawn）与 `ctx.sandbox`（confine） | `inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`。缺 `ctx.shell` → 插件 pending，schemas 空。`jobs` / `approval` / `sandboxPolicy` 用 `ctx.get`，不在 `inject`。[E: packages/shell/tool-pwsh/src/index.ts:49] [E: packages/bundle/web-app/cordis.patch.yml:297] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:49] |

换掉 `ctx.shell`（例如 profile patch 成裸 `dsh-pwsh-local`）会拿走围栏与 `sandboxMode` 广告，但 `tool-pwsh` 的 wire 名不变。换掉 `ctx.subprocess` 会改 pwsh / bash / PTY / `glob`/`grep` / lsp-stdio 整组世界。只换 `ctx.fs` 不会。E2B 要同时换走 fs+subprocess，那是 [`subsys.execution.e2b`](e2b.md) 的配对，不是换 `ctx.shell`。

## Sources

- packages/shell/pwsh-local/src/index.ts
- packages/shell/pwsh-local/src/resolve.ts
- packages/shell/pwsh-sandbox/src/index.ts
- packages/shell/pwsh-sandbox/src/helpers.ts
- packages/shell/pwsh-local/tests/executor.spec.ts
- packages/shell/pwsh-local/tests/settings.spec.ts
- packages/shell/pwsh-sandbox/tests/sandbox.spec.ts
- packages/shell/pwsh-sandbox/tests/acl.e2e.ts
- packages/shell/shell/src/index.ts
- packages/shell/shell/tests/service.spec.ts
- packages/shell/tool-pwsh/src/index.ts
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox-local/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/tests/windows-shell.spec.ts

## 相关

- [spine.overview](../../spine/overview.md) — host 面 vs agent-preset 面；本页的 `pwsh-sandbox` 属 host。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 词表；`ctx.shell` 是其中一条缝。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute`；pwsh 围栏在 execute 体内的 `ctx.shell.run`，不在 pre-execute。
- [subsys.execution.shell](shell.md) — `ctx.shell` Definition、`run`/`start` 合同、`ctx.shellEnv`。
- [subsys.execution.bash-local](bash-local.md) — POSIX 对偶：`LocalBashExecutor` / `SandboxBashExecutor`，`bash -c`。
- [subsys.execution.subprocess](subprocess.md) — `ctx.subprocess.spawn`；pwsh 是它的 Consumer。
- [subsys.execution.sandbox](sandbox.md) — `confine` 合同、`SANDBOX_UNAVAILABLE`、`approveEscalation`。
- [subsys.execution.sandbox-local](sandbox-local.md) — win32 `windows-acl` runner 链（本页不写选择细节）。
- [surface.tools.pwsh](../../surface/tools/pwsh.md) — 模型可见 `pwsh` 的 schema / execute / preset 成员资格。
- [surface.misc.security](../../surface/misc/security.md) — 审批与沙箱产品面（index 仍为 planned）。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — `dsh-base` 里 `pwsh-sandbox` / `tool-pwsh` 的平台门控行。
