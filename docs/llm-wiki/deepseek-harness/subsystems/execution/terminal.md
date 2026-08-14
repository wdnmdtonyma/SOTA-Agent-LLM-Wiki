---
id: subsys.execution.terminal
title: terminals PTY 缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/terminal/terminal/src/index.ts
  - packages/terminal/terminal/src/types.ts
  - packages/terminal/terminal/package.json
  - packages/terminal/terminal/tests/service.spec.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/terminal/terminal-bash/src/config.ts
  - packages/terminal/terminal-bash/src/session.ts
  - packages/terminal/terminal-bash/src/sanitize.ts
  - packages/terminal/terminal-bash/package.json
  - packages/terminal/terminal-bash/tests/index.spec.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/subprocess/subprocess-local/src/index.ts
  - packages/subprocess/subprocess-local/src/terminal.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox-policy/src/session-mode.ts
  - packages/core/session/src/index.ts
  - packages/core/session/tests/session.spec.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/terminal/tool-terminal/src/index.ts
  - apps/cli/package.json
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - examples/headless-agent/e2b.cordis.yml
  - packages/e2b/e2b/tests/composition.e2e.ts
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/reflect.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.terminals
  - TerminalSessionService
  - terminal-bash
  - BashTerminalBackend
  - LocalPtySession
related:
  - spine.overview
  - spine.capability-seams
  - spine.tool-call-anatomy
  - subsys.execution.subprocess
  - subsys.execution.sandbox-policy
  - subsys.execution.sandbox
  - subsys.execution.e2b
  - subsys.execution.shell
  - subsys.composition.bundle-base
  - surface.tools.terminal
  - surface.tools.bash-persistent
  - surface.presets.minimal
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.terminals`（`TerminalSessionService`）是 **agent-preset 面** 的 owner-scoped PTY 注册表：铸造 `TerminalSessionId`、发布会话、按 **exact `Agent`** 授权、以及 awaited cleanup。它不拥有 PTY 字节力学。默认 shipped 不在 host base；`dsh-base` / `dsh-web-app` 没有 `dsh-terminal` 行。`minimal` 用 `cordis:group` + `isolate.terminals: true` 挂 `dsh-terminal` + `dsh-terminal-bash` + `dsh-tool-bash-persistent`。可替换 backend 是 `BashTerminalBackend`（插件名 `terminal-bash`）：`inject = ['terminals', 'sandboxPolicy', 'subprocess']`，默认 `spawnTerminal` = `ctx.subprocess.spawnTerminal`，**不** `inject` `fs`。

## 能回答的问题

- `ctx.terminals` 由哪个包 `provide`？它是抽象 Definition 还是具体 Service？backend 换掉哪一层？
- 为什么 `dsh web` 默认组合里常常没有这条缝？`minimal` 为什么必须 `isolate.terminals`？
- `terminal-bash` 怎样读 `ctx.sandboxPolicy`、何时 `ctx.sandbox.confine`、缺 sandbox 会不会裸跑？
- sandbox mode 切换时，live / 正在创建的 PTY 怎样在 `sandbox/mode` **提交前**被拦住？
- 只换 `ctx.fs`、只换 `ctx.subprocess`、换 backend type，分别带走什么？
- 模型面谁消费本缝？`bash` persistent 与 `terminal_*` 六件套分别在哪些 yml 里？

## 职责边界

`@deepseek-ai/dsh-terminal` 拥有：Cordis 键 `terminals`、id 铸造、backend 注册表、owner 可见的 `spawn` / `startSend` / `read` / `signal` / `kill` / `list`、`hasOwnerActivity`（覆盖 unpublished setup）、以及 owner fiber / service fiber 上的 awaited teardown。包名写在 `package.json`。[E: packages/terminal/terminal/package.json:2] 与 `ctx.fs` / `ctx.shell` / `ctx.subprocess` 不同：本 Definition **不是**等子类去 `provide` 的抽象类，而是具体 `Service`；可替换的是 `TerminalBackend`，不是第二个 `ctx.terminals` 实现。

`@deepseek-ai/dsh-terminal-bash` 拥有：默认 type `shell` 的 backend、受控 prompt / 就绪探测 / 有界 scrollback、按 `SandboxExecutionPolicy` 决定是否 `confine` 再 `spawnTerminal`、以及挂在 **exact owner** 上的 sandbox-mode fence。插件名是 `terminal-bash`。[E: packages/terminal/terminal-bash/src/index.ts:23] [E: packages/terminal/terminal-bash/package.json:2]

明确**不**拥有：

- `node-pty` 分配、前台 pgid、`SIGKILL` 拒杀 shell、树级 `terminate()`：[subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）。本页只写 backend 如何调用 `spawnTerminal`。
- `SandboxMode` 词汇、`ctx.sandbox.confine`、`SANDBOX_UNAVAILABLE`：[subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）。
- `sandbox/mode` fold 与 `setSandboxMode` 写路径：[subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）。本页只写 fence 怎样在提交前否决。
- one-shot `bash -c` / `ctx.shell`：[subsys.execution.shell](shell.md)（`subsys.execution.shell`）。
- 模型可见 `bash`（persistent）字段与重置文案：[surface.tools.bash-persistent](../../surface/tools/bash-persistent.md)（`surface.tools.bash-persistent`）。
- `terminal_open` / `terminal_send` / `terminal_read` / `terminal_signal` / `terminal_close` / `terminal_list` 的 schema：[surface.tools.terminal](../../surface/tools/terminal.md)（`surface.tools.terminal`）。
- E2B 远程 one-world：[subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）。

**host 面 vs agent-preset 面。** `ctx.subprocess` / `ctx.sandbox` / `ctx.sandboxPolicy` 仍是 **host 面**（`dsh-base` 的 `id: subprocess` / `id: sandbox` / `id: sandbox-policy` / `id: bash-sandbox`）。[E: packages/bundle/base/cordis.patch.yml:163] [E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:178] `ctx.terminals` **不是** host 默认键：`dsh-web-app` 只把 host 上的 `tool-bash` 行 `disabled: true`，并不 insert `dsh-terminal`。[E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] `apps/cli` 的 dependencies 含 `@deepseek-ai/dsh-terminal`，所以 preset / overlay 的包名解析得通；这不等于 root realm 已经 `provide`。[E: apps/cli/package.json:47] 默认安装路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。浏览器 client 不实现 `TerminalSessionService`。

**没有 `terminals/*` waterfall。** Definition 不声明 `terminals/pre-spawn` 一类槽。组合失败是「同 realm 第二份 `terminals` service 抛」和「Consumer `inject` 等到服务」。`sandbox/mode` fence 走 Cordis `internal/dispatch`（emit 分发期抛错），不是一条要 `next()` 的 terminals waterfall。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/terminal/terminal/src/index.ts` | Definition：`TerminalSessionService`、`TerminalError`、`registerBackend` |
| `packages/terminal/terminal/src/types.ts` | `TerminalBackend` / send / read / signal 合同 |
| `packages/terminal/terminal/tests/service.spec.ts` | owner 栅栏、unpublished rollback、`SEND_ACTIVE`、disposal |
| `packages/terminal/terminal-bash/src/index.ts` | `inject`、`BashTerminalBackend`、sandbox-mode fence、`apply` |
| `packages/terminal/terminal-bash/src/config.ts` | Schemastery 默认（`backendType: 'shell'`、`timeoutMs: 30_000`） |
| `packages/terminal/terminal-bash/src/session.ts` | `LocalPtySession`：就绪、互斥 send、close |
| `packages/subprocess/subprocess-local/src/index.ts` | 默认 `spawnTerminal`（node-pty） |
| `packages/subprocess/subprocess-local/src/terminal.ts` | `LocalTerminalHandle`（前台信号 / 会话树清理） |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | 唯一 shipped 成员：`isolate.terminals` 组 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `TerminalSessionService` | `Service` 子类；键名 `'terminals'`。拥有 backend `Map`、已发布 `sessions`、in-flight `pendingSpawns` / `reservedNames`。[E: packages/terminal/terminal/src/index.ts:116] |
| `TerminalSessionId` | 注册表铸造的 branded 字符串，形如 `pty-${++nextId}`。[E: packages/terminal/terminal/src/index.ts:166] |
| `TerminalError.code` | `DUPLICATE_BACKEND` / `DUPLICATE_NAME` / `FOREIGN_SESSION` / `NO_BACKEND` / `NO_SESSION` / `OWNER_NOT_LIVE` / `SEND_ACTIVE` / `SERVICE_DISPOSING`。[E: packages/terminal/terminal/src/index.ts:55] |
| `TerminalBackend` | `{ type, spawn(spec) }`。`spawn` 必须在失败时自行清掉未发布资源；双边失败用 `TerminalBackendCleanupError`。[E: packages/terminal/terminal/src/types.ts:170] |
| `TerminalBackendSession` | backend 活会话：`motd` / `startSend` / `read` / `signal` / `status` / `close`。就绪策略在 backend，不在注册表。 |
| `TerminalWaitReason` | `'stdin_read' \| 'inferred_idle' \| 'timeout' \| 'session_exit'`。这是 send 把控制权交还的原因，**不**等于任意子进程已退出。[E: packages/terminal/terminal/src/types.ts:29] |
| `TerminalSignal` | `'SIGINT' \| 'SIGTERM' \| 'SIGKILL' \| 'SIGTSTP' \| 'SIGHUP'`。与 `SubprocessTerminalSignal` 成员相同，两边不互相 import。[E: packages/terminal/terminal/src/types.ts:36] |
| `hasOwnerActivity(owner)` | pending spawn **或** 已发布 session。政策围栏用它，避免 publication 空窗。[E: packages/terminal/terminal/src/index.ts:232] |
| `terminal-bash` `Config` | `backendType` 默认 `'shell'`；`shellPath` 默认 `/bin/bash`；`shellArgs` 默认 `--noprofile --norc -i`；`timeoutMs` 默认 `30_000`（**一条 send 的就绪上限**，不是 `defineTool.timeoutMs`）。[E: packages/terminal/terminal-bash/src/config.ts:45] [E: packages/terminal/terminal-bash/src/config.ts:57] |
| `inject` | `['terminals', 'sandboxPolicy', 'subprocess']`。没有 `fs`，也没有 `sandbox`（sandbox 用 `ctx.get`）。[E: packages/terminal/terminal-bash/src/index.ts:25] |
| `CONTROLLED_PROMPT` | `'dsh> '`。backend 把 `PS1` 设成它，并用 `PROMPT_COMMAND` 打 OSC `133;D` 标记。[E: packages/terminal/terminal-bash/src/sanitize.ts:9] [E: packages/terminal/terminal-bash/src/index.ts:62] |

本缝 **不**声明 Cordis `Events`。`sandbox/mode` 事件属于 session log，定义在 sandbox-policy 包。

## 控制流

1. `TerminalSessionService`@packages/terminal/terminal/src/index.ts 在 augmentation 里声明 `Context.terminals`，构造调用 `Service` → `ctx.reflect.provide('terminals', self)`，并用 `ctx.effect` 登记 `disposeAll`。[E: packages/terminal/terminal/src/index.ts:50] [E: packages/terminal/terminal/src/index.ts:116] [E: vendor/cordis/src/service.ts:57]
2. 同一 isolate realm 再挂第二个名为 `terminals` 的 service，`reflect.provide` 抛 `service "terminals" has been registered`。[E: vendor/cordis/src/reflect.ts:290] backend 重名走另一条：`registerBackend` 抛 `DUPLICATE_BACKEND`，并包在 `ctx.effect` 里以便 unload 只删自己那份贡献。[E: packages/terminal/terminal/src/index.ts:128] [E: packages/terminal/terminal/tests/service.spec.ts:141]
3. **host 不挂本缝。** `dsh-base` 的执行面 service 行是 `subprocess` / `sandbox` / `sandbox-policy` / `bash-sandbox`，没有 `id: pty`。[E: packages/bundle/base/cordis.patch.yml:163] [E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:178] 唯一 shipped 成员在 `minimal`：`id: persistent-shell` 的 `cordis:group` 写 `isolate.terminals: true`，组内三行是 `@deepseek-ai/dsh-terminal` / `@deepseek-ai/dsh-terminal-bash` / `@deepseek-ai/dsh-tool-bash-persistent`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:25] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:28] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33]
4. `standard` / `code` / `cordis` 的 shell 行是 `@deepseek-ai/dsh-tool-bash`（one-shot，`ctx.shell`），没有 `isolate.terminals` 组。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:45] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:46] preset 若把 `TerminalSessionService` 发进 root realm，`leakedServices` 会把它算进 `root[Context.isolate]`，`mountPreset` 拒绝。[E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:365] `isolate` 列表只有 `terminals`：组内 `inject` 的 `sandboxPolicy` / `subprocess` 仍解析到 host。
5. `apply`@packages/terminal/terminal-bash/src/index.ts 校验 Config 后 `ctx.terminals.registerBackend(new BashTerminalBackend(ctx, config))`。默认 `spawnTerminal` 闭包是 `ctx.subprocess.spawnTerminal`。[E: packages/terminal/terminal-bash/src/index.ts:152] [E: packages/terminal/terminal-bash/src/index.ts:110] Loader 单测钉死 `name === 'terminal-bash'` 且 `inject` 恰好那三项。[E: packages/terminal/terminal-bash/tests/index.spec.ts:347] [E: packages/terminal/terminal-bash/tests/index.spec.ts:348]
6. `spawn`@packages/terminal/terminal/src/index.ts：`assertActive`；`ensureOwnerCleanup`（owner 必须是 `ctx.agents.get(owner.id) === owner`）；按 `request.type` 取 backend；空 `name` 抛错；`reserveName` + `reserveSpawn`；把调用方 `signal` 与内部 abort 合成后交给 `backend.spawn`。成功且 owner 仍 live 才 `sessions.set` 并返回 snapshot（含 `motd`）。[E: packages/terminal/terminal/src/index.ts:154] [E: packages/terminal/terminal/src/index.ts:158] [E: packages/terminal/terminal/src/index.ts:194] 失败且 session 未发布则 `session.close('PTY spawn rolled back')`。单测：未登记 owner → `OWNER_NOT_LIVE`；缺 backend → `NO_BACKEND`；同名已发布或正在创建 → `DUPLICATE_NAME`；owner 在 unpublished 期间消失 → pending 以 `OWNER_NOT_LIVE` 失败且 rollback close。[E: packages/terminal/terminal/tests/service.spec.ts:178] [E: packages/terminal/terminal/tests/service.spec.ts:180] [E: packages/terminal/terminal/tests/service.spec.ts:189] [E: packages/terminal/terminal/tests/service.spec.ts:216]
7. `BashTerminalBackend.spawn`@packages/terminal/terminal-bash/src/index.ts 先 `ensureSandboxModeFence(owner)`，再 `ctx.sandboxPolicy.resolve({ session: spec.owner.session })` 一次取出 `mode` + `workspaceRoot`。[E: packages/terminal/terminal-bash/src/index.ts:121] [E: packages/terminal/terminal-bash/src/index.ts:122] `spawnArgv`：`danger-full-access` 直接返回 `[shellPath, ...shellArgs]`；其它 mode 没有 `ctx.sandbox` 就抛 `requires a ctx.sandbox provider in the execution world`，**不**调用 `spawnTerminal`；有 sandbox 则把 `confine(...).argv` 交给后续 spawn。[E: packages/terminal/terminal-bash/src/index.ts:73] [E: packages/terminal/terminal-bash/src/index.ts:76] [E: packages/terminal/terminal-bash/src/index.ts:79] cwd 是 `spec.cwd ?? policy.workspaceRoot`。[E: packages/terminal/terminal-bash/src/index.ts:127] 缺 sandbox 的单测断言 spawn 函数根本不会跑。[E: packages/terminal/terminal-bash/tests/index.spec.ts:260] [E: packages/terminal/terminal-bash/tests/index.spec.ts:264]
8. 显式 `env` 只含 terminal 覆盖（`TERM=dumb`、`PAGER=cat`、`PS1`、`PROMPT_COMMAND`、`DSH_SHELL` / `DSH_SESSION_ID` / `DSH_PTY_SESSION_ID`）。ambient 密钥不在这份对象里；真正剥环境的是 subprocess Provider 的 `childEnv`。[E: packages/terminal/terminal-bash/src/index.ts:59] [E: packages/terminal/terminal-bash/src/index.ts:65] 单测：confine 后 argv 变成 `['/sandbox', '--', '/bin/bash', '-i']`，`PTY_TEST_SECRET` 不出现在 `spec.env`。[E: packages/terminal/terminal-bash/tests/index.spec.ts:204] [E: packages/terminal/terminal-bash/tests/index.spec.ts:214]
9. `LocalSubprocessRuntime.spawnTerminal`@packages/subprocess/subprocess-local/src/index.ts 用 `node-pty` 分配（`name: 'dumb'`），`env` 走 `childEnv(spec.env)`，句柄是 `LocalTerminalHandle`。spec 的 `signal` 只取消**分配**；发布后的寿命由 handle `terminate()` 管。[E: packages/subprocess/subprocess-local/src/index.ts:161] [E: packages/subprocess/subprocess-local/src/index.ts:175] [E: packages/subprocess/subprocess/src/index.ts:139] `LocalTerminalHandle.signalForeground('SIGKILL')` 若前台组就是 shell 自己，会拒，要求走 session `terminate()` / 注册表 `kill`。[E: packages/subprocess/subprocess-local/src/terminal.ts:98]
10. `LocalPtySession.initialize`@packages/terminal/terminal-bash/src/session.ts 发一条空 send（`text: ''`, `submit: false`）等到就绪。`session_exit` / `timeout` 使 spawn 失败；成功则把 viewport 写成 `motd`。[E: packages/terminal/terminal-bash/src/session.ts:212] [E: packages/terminal/terminal-bash/src/session.ts:214] [E: packages/terminal/terminal-bash/src/session.ts:216] 初始化失败会 `session.close('PTY startup failed')`，close 再失败则 `TerminalBackendCleanupError`。[E: packages/terminal/terminal-bash/src/index.ts:140]
11. 已发布之后，所有操作过 `expectOwned`：未知 id → `NO_SESSION`；`record.owner !== owner` → `FOREIGN_SESSION`。`list` 只返回该 owner。单测：foreign 的 `read` / `signal` / `kill` 都抛 `belongs to another agent`。[E: packages/terminal/terminal/src/index.ts:390] [E: packages/terminal/terminal/tests/service.spec.ts:170] `startSend` 在注册表层互斥：已有 `record.active` 抛 `SEND_ACTIVE`；backend 自己的 `LocalPtySession.startSend` 再挡一层（含 draining write / interrupt）。[E: packages/terminal/terminal/src/index.ts:246] [E: packages/terminal/terminal-bash/src/session.ts:234] `kill` 若已有 `closing` 就 join 并返回 `false`；close 失败则清掉 fence 让调用方可重试，会话仍留在 map 里。[E: packages/terminal/terminal/src/index.ts:288] [E: packages/terminal/terminal/src/index.ts:298] [E: packages/terminal/terminal/tests/service.spec.ts:501]
12. **sandbox/mode fence。** `setSandboxMode` 只 `session.append('sandbox/mode', { mode })`。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:70] `Session.append` 在 `log.push` 之前用 `events.dispatch('emit', …)` 收集 listener，Cordis 对非 `internal/*` 名字先 `emit('internal/dispatch', …)`。[E: packages/core/session/src/index.ts:378] [E: vendor/cordis/src/events.ts:169] fence 挂在 `owner.ctx.on('internal/dispatch', …, { global: true })`：只看该 owner 的 `session/event` 且 `event.type === 'sandbox/mode'`；新 mode 与 `effectiveSandboxMode(events) ?? defaultMode` 相同，或 `!hasOwnerActivity(owner)`，就放行；否则抛错，append 不提交。[E: packages/terminal/terminal-bash/src/index.ts:43] [E: packages/terminal/terminal-bash/src/index.ts:48] session 单测：`internal/dispatch` 抛错时 `session.events` 仍为空。[E: packages/core/session/tests/session.spec.ts:1521] [E: packages/core/session/tests/session.spec.ts:1522] backend 单测：同 mode 可再写一条；降到 `read-only` 在有 live session 或 unpublished spawn 时抛 `cannot change sandbox mode…`；unload backend 后围栏仍在（listener 绑在 owner，不绑在 provider fiber）。[E: packages/terminal/terminal-bash/tests/index.spec.ts:411] [E: packages/terminal/terminal-bash/tests/index.spec.ts:414] [E: packages/terminal/terminal-bash/tests/index.spec.ts:455]
13. teardown：owner fiber dispose → `disposeOwned`（abort pending + `close('PTY owner disposed')`）。service fiber dispose → `disposing = true`，`disposeAll` 关所有 owner；`finally` 仍清空 `backends` / `ownerCleanups`，避免一份卡住的 close 把注册表孤儿化。[E: packages/terminal/terminal/src/index.ts:428] [E: packages/terminal/terminal/src/index.ts:447] [E: packages/terminal/terminal/tests/service.spec.ts:599]
14. **Consumer。** `dsh-tool-bash-persistent` `inject = ['tools', 'terminals']`，body 只打 `ctx.terminals.spawn` / `startSend` / `read` / `kill`，不碰 `ctx.shell`。[E: packages/shell/tool-bash-persistent/src/index.ts:402] [E: packages/shell/tool-bash-persistent/src/index.ts:234] `dsh-tool-terminal` `inject = ['terminals', 'tools', 'systemPrompt']`，注册六个 wire 名；没有 `ctx.terminals` 时插件挂起。[E: packages/terminal/tool-terminal/src/index.ts:27] [E: packages/terminal/tool-terminal/src/index.ts:163] 四个 shipped preset **都不**挂 `dsh-tool-terminal`。E2B POC overlay 才 `insert` `id: pty` + `terminal-bash` + `tool-terminal`。[E: examples/headless-agent/e2b.cordis.yml:37] [E: examples/headless-agent/e2b.cordis.yml:39] [E: examples/headless-agent/e2b.cordis.yml:41]
15. **换世界。** `terminal-bash` 不 `inject` `fs`。只换 `ctx.fs` 不会把 PTY 搬到远程。只换 `ctx.subprocess` 会换掉默认 `spawnTerminal` 的执行世界。E2B live e2e 在成对替换后断言 `terminal.echo.waitReason === 'stdin_read'`。[E: packages/e2b/e2b/tests/composition.e2e.ts:160] 换 `type` 或换 backend 包会换 argv / env / confine 方言。换 / isolate `ctx.terminals` 会换 id、鉴权与 cleanup，但 host 上的 `subprocess` / `sandboxPolicy` 仍是那一份。

## 设计动机

- **注册表与力学拆开。** owner / id / 互斥 send / awaited cleanup 对每个 backend 都一样；`node-pty` 就绪探测、受控 prompt、confine argv 会随执行世界变。模型工具只 `inject` `terminals`，不 import `*-bash`。
- **键放在 preset isolate，不放进 `dsh-base`。** 会话身份是 exact `Agent`。host 上再挂一份 `ctx.terminals` 会让两个 preset 抢同一 realm，或让没有 PTY 工具的 `standard` 会话也带着空注册表。`minimal` 用 `isolate.terminals: true` 把泄漏挡在 `mountPreset`。
- **围栏罩文件副作用，PTY 必须跟 mode 一起死。** `SandboxMode` 只有 `read-only` / `workspace-write` / `danger-full-access`，没有网络 / 进程可见性取值。[E: packages/sandbox/sandbox/src/index.ts:29] 一条已经用更宽 mode 打开的 PTY 若在降权后继续活着，就绕过了后续 `confine`。fence 因此在 `internal/dispatch` 否决，而不是写完 log 再补救。
- **缺 sandbox 与缺 runner 都 fail-loud。** confined mode 没有 `ctx.sandbox`：backend 自己抛错。有 sandbox 但平台没有 usable runner：`confine` 抛 `SANDBOX_UNAVAILABLE`，禁止退回裸 argv。[E: packages/sandbox/sandbox/src/index.ts:124] `danger-full-access` 才跳过 confine。
- **就绪 ≠ 退出。** 交互式 REPL 可以在进程仍 running 时把 send 交还（`stdin_read` / `inferred_idle`）。把 `waitReason` 当成 `exitCode` 会让模型以为命令已经结束。

相对 Codex：Codex 默认产品路径就有持久 shell；DSH 默认 `dsh web` + `standard` 走 one-shot `ctx.shell`，PTY 是 `minimal` / overlay 的 opt-in。相对 Pi：Pi 没有这条可替换 `ctx.terminals` 缝，持久 shell 焊在具体工具里。

## Gotcha

- `waitReason` 为 `inferred_idle` 或 `timeout` 时，`sessionStatus` 仍可以是 `{ kind: 'running' }`。`dsh-tool-terminal` 的 system-prompt 段落把这句写进模型可见文案。[E: packages/terminal/tool-terminal/src/index.ts:159]
- 同一 session 同时两条 send → `SEND_ACTIVE`。`dsh-tool-bash-persistent` 用 per-owner 队列避开它；直接打注册表不会排队。
- 授权比的是 **同一个 `Agent` 对象**，不是 session id 字符串。另一个 agent 拿着 `pty-1` 会收到 `FOREIGN_SESSION`。
- `hasOwnerActivity` 在 `backend.spawn` 尚未返回时已是 `true`。unpublished 期间改 sandbox mode 同样被拒。[E: packages/terminal/terminal-bash/tests/index.spec.ts:455]
- 调用方 abort 优先于 rollback 失败：pending `spawn` 仍 reject 成调用方 reason；cleanup 失败留到 owner/service dispose 再以 `failed to clean up PTY lifecycle` 冒出来。[E: packages/terminal/terminal/tests/service.spec.ts:255] [E: packages/terminal/terminal/tests/service.spec.ts:258]
- `LocalTerminalHandle` 拒绝对 shell 自己 `SIGKILL`。模型面要拆掉整棵会话走 `kill`，不要指望 `terminal_signal(SIGKILL)` 杀掉 bash 主进程。[E: packages/subprocess/subprocess-local/src/terminal.ts:99]
- `minimal` 把 `terminal-bash.config.timeoutMs` 覆写成 `300000`；包默认是 `30_000`。这是 **send 就绪墙钟**。`dsh-tool-bash-persistent` 另有自己的 `timeoutMs`（命令墙钟），两套不要混。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:30] [E: packages/terminal/terminal-bash/src/config.ts:57]
- persistent `bash` 在 spawn 之后会再 `startSend` 改 `PS1`。backend 的 `CONTROLLED_PROMPT`（`dsh> `）是就绪合同，不一定是模型最终看见的提示符。[E: packages/shell/tool-bash-persistent/src/index.ts:247]
- `dsh-web-app` 注释里出现 `tool-terminal` 只是在解释 `ctx.jobs` 为什么留在 host，**不是** web bundle 挂了六件套。六个名字的 schema 见 T1 页，本页不列表。
- 官方 `terminal-bash` README 把 inject 写成 `pty`。可加载源是 `terminals`。wiki 跟代码。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-terminal` 的 `TerminalSessionService`（具体 Service，不是抽象类） | `ctx.terminals`。`super(ctx, 'terminals')`。**没有** `dsh-base` / `dsh-web-app` 行 |
| **Backend（默认 PTY 力学）** | `@deepseek-ai/dsh-terminal-bash` 的 `BashTerminalBackend` + `LocalPtySession` | `registerBackend`；`type` 默认 `'shell'`。`inject = ['terminals', 'sandboxPolicy', 'subprocess']`。不 `provide` 第二个 `ctx.terminals` |
| **进程底物** | `ctx.subprocess.spawnTerminal`；默认 `@deepseek-ai/dsh-subprocess-local` | **host**：`dsh-base` `id: subprocess`。换 E2B 时仍占 `ctx.subprocess`，见 [subsys.execution.e2b](e2b.md) |
| **Consumer（shipped）** | `@deepseek-ai/dsh-tool-bash-persistent`（模型名仍是 `bash`） | `inject = ['tools', 'terminals']`。只在 `minimal` 的 `isolate.terminals` 组 |
| **Consumer（opt-in）** | `@deepseek-ai/dsh-tool-terminal`（`terminal_*` 六件套） | `inject = ['terminals', 'tools', 'systemPrompt']`。四个 shipped preset 都没有这行；E2B POC overlay `id: tool-terminal` |
| **政策 / 围栏（相邻缝）** | `ctx.sandboxPolicy`（必 inject）+ `ctx.sandbox`（`ctx.get`，confined mode 才要） | 都在 **host**。preset 不 isolate 这两键 |

换 backend / 换 `ctx.subprocess` = 改 yml 行，不改 `tool-bash-persistent`。把第二个 `TerminalSessionService` 挂进同一 realm 会抛，不会静默覆盖。`registerBackend` 的同名冲突是 `DUPLICATE_BACKEND`，与 service 重名是两层。

## Sources

- packages/terminal/terminal/src/index.ts
- packages/terminal/terminal/src/types.ts
- packages/terminal/terminal/package.json
- packages/terminal/terminal/tests/service.spec.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/terminal/terminal-bash/src/config.ts
- packages/terminal/terminal-bash/src/session.ts
- packages/terminal/terminal-bash/src/sanitize.ts
- packages/terminal/terminal-bash/package.json
- packages/terminal/terminal-bash/tests/index.spec.ts
- packages/subprocess/subprocess/src/index.ts
- packages/subprocess/subprocess-local/src/index.ts
- packages/subprocess/subprocess-local/src/terminal.ts
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox-policy/src/session-mode.ts
- packages/core/session/src/index.ts
- packages/core/session/tests/session.spec.ts
- packages/preset/agent-presets/src/mount.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/shell/tool-bash-persistent/src/index.ts
- packages/terminal/tool-terminal/src/index.ts
- apps/cli/package.json
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- examples/headless-agent/e2b.cordis.yml
- packages/e2b/e2b/tests/composition.e2e.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/reflect.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `shell` / `subprocess` 三角；PTY 只吃 `subprocess`。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：模型 `tool-call` 进入 `tools/pre-execute → execute → post-execute`。本缝不挂那条 waterfall。
- [subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）：`spawnTerminal` 原语与 `LocalTerminalHandle`。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`resolve` 与 `sandbox/mode` fold；本页 fence 读同一份。
- [subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）：`confine` 与 `SANDBOX_UNAVAILABLE`。
- [subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）：成对替换 `fs`+`subprocess` 时 PTY 跟着 `spawnTerminal` 走。
- [subsys.execution.shell](shell.md)（`subsys.execution.shell`）：默认产品路径上的 one-shot `ctx.shell`，与本缝并行存在。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host 执行面没有 `dsh-terminal` 行。
- [surface.tools.terminal](../../surface/tools/terminal.md)（`surface.tools.terminal`）：`terminal_*` 六件套（opt-in）。
- [surface.tools.bash-persistent](../../surface/tools/bash-persistent.md)（`surface.tools.bash-persistent`）：`minimal` 里模型可见的持久 `bash`。
- [surface.presets.minimal](../../surface/presets/minimal.md)（`surface.presets.minimal`）：`isolate.terminals` 组的成员表。
