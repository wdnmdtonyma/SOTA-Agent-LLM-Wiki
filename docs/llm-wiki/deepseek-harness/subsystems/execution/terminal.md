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
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-pwsh-persistent/src/index.ts
  - packages/terminal/tool-terminal/src/index.ts
  - apps/cli/package.json
  - snapshots/session/pty-tools-sandbox-backend/cordis.yml
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
  - surface.tools.pwsh
  - surface.presets.minimal
  - surface.presets.code
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `ctx.terminals`（`TerminalSessionService`）是 **agent-preset 面**（以及 `dsh-sdk-minimal` 完整 insert）的 owner-scoped PTY 注册表：铸造 `TerminalSessionId`、发布会话、按 **exact `Agent`** 授权、以及 awaited cleanup。它不拥有 PTY 字节力学。`dsh-base` / `dsh-web-app` 没有 `dsh-terminal` 行。shipped preset 里只有 `minimal` 用 `cordis:group` + `isolate.terminals: true` 挂 `dsh-terminal` + `dsh-terminal-bash`（bash / pwsh 两行）+ persistent 工具。可替换 backend 是 `BashTerminalBackend`（插件名 `terminal-bash`）：`inject = ['terminals', 'sandboxPolicy', 'sessionProjections', 'subprocess']`，默认 `spawnTerminal` = `ctx.subprocess.spawnTerminal`，**不** `inject` `fs`。

## 能回答的问题

- `ctx.terminals` 由哪个包 `provide`？它是抽象 Definition 还是具体 Service？backend 换掉哪一层？
- 为什么 `dsh web` + `standard` 默认组合常常没有这条缝？`minimal` 为什么必须 `isolate.terminals`？`sdk-minimal` 怎样直接 insert `pty`？
- `terminal-bash` 怎样读 `ctx.sandboxPolicy`、何时 `ctx.sandbox.confine`、缺 sandbox 会不会裸跑？`shellDialect: pwsh` 改变什么？
- sandbox mode 切换时，live / 正在创建的 PTY 怎样在 `sandbox/mode` **提交前**被拦住？
- 只换 `ctx.fs`、只换 `ctx.subprocess`、换 backend type，分别带走什么？
- 模型面谁消费本缝？persistent `bash` / `pwsh` 与 `terminal_*` 六件套分别在哪些 yml 里？

## 职责边界

`@deepseek-ai/dsh-terminal` 拥有：Cordis 键 `terminals`、id 铸造、backend 注册表、owner 可见的 `spawn` / `startSend` / `read` / `signal` / `kill` / `list`、`hasOwnerActivity`（覆盖 unpublished setup）、以及 owner fiber / service fiber 上的 awaited teardown。包名写在 `package.json`。[E: packages/terminal/terminal/package.json:2] 与 `ctx.fs` / `ctx.shell` / `ctx.subprocess` 不同：本 Definition **不是**等子类去 `provide` 的抽象类，而是具体 `Service`；可替换的是 `TerminalBackend`，不是第二个 `ctx.terminals` 实现。

`@deepseek-ai/dsh-terminal-bash` 拥有：默认 type `shell` 的 backend、`shellDialect` `bash` | `pwsh`、受控 prompt / 就绪探测 / 有界 scrollback、按 `SandboxExecutionPolicy` 决定是否 `confine` 再 `spawnTerminal`、以及挂在 **exact owner** 上的 sandbox-mode fence。插件名是 `terminal-bash`。[E: packages/terminal/terminal-bash/src/index.ts:25] [E: packages/terminal/terminal-bash/package.json:2]

明确**不**拥有：

- `node-pty` 分配、前台 pgid、`SIGKILL` 拒杀 shell、树级 `terminate()`：[subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）。本页只写 backend 如何调用 `spawnTerminal`。
- `SandboxMode` 词汇、`ctx.sandbox.confine`、`SANDBOX_UNAVAILABLE`：[subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）。
- `sandbox/mode` fold 与 `setSandboxMode` 写路径：[subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）。本页只写 fence 怎样在提交前否决。
- one-shot `bash -c` / `ctx.shell`：[subsys.execution.shell](shell.md)（`subsys.execution.shell`）。
- 模型可见 persistent `bash` 字段与重置文案：[surface.tools.bash-persistent](../../surface/tools/bash-persistent.md)（`surface.tools.bash-persistent`）。
- 模型可见 persistent `pwsh`（包 `@deepseek-ai/dsh-tool-pwsh-persistent`，wire 名仍是 `pwsh`）：[surface.tools.pwsh](../../surface/tools/pwsh.md)（`surface.tools.pwsh`）。
- `terminal_open` / `terminal_send` / `terminal_read` / `terminal_signal` / `terminal_close` / `terminal_list` 的 schema：[surface.tools.terminal](../../surface/tools/terminal.md)（`surface.tools.terminal`）。
- E2B 远程 one-world：[subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）。

**host 面 vs agent-preset 面。** `ctx.subprocess` / `ctx.sandbox` / `ctx.sandboxPolicy` 仍是 **host 面**（`dsh-base` 的 `id: subprocess` / `id: sandbox` / `id: sandbox-policy` / `id: bash-sandbox`）。[E: packages/bundle/base/cordis.patch.yml:205] [E: packages/bundle/base/cordis.patch.yml:211] [E: packages/bundle/base/cordis.patch.yml:214] [E: packages/bundle/base/cordis.patch.yml:220] `ctx.terminals` **不是** host 默认键：`dsh-web-app` 只把 host 上的 `tool-bash` / `tool-pwsh` 行 `disabled: true`，并不 insert `dsh-terminal`。[E: packages/bundle/web-app/cordis.patch.yml:320] [E: packages/bundle/web-app/cordis.patch.yml:323] `apps/cli` 的 dependencies 含 `@deepseek-ai/dsh-terminal`，所以 preset / overlay 的包名解析得通；这不等于 root realm 已经 `provide`。[E: apps/cli/package.json:70] 默认 GUI 入口是 `dsh web`（`--profile web`）；另有 `dsh --profile headless|sdk|sdk-minimal|acp`。本仓没有 shipped TUI 模板。浏览器 client 不实现 `TerminalSessionService`。

**没有 `terminals/*` waterfall。** Definition 不声明 `terminals/pre-spawn` 一类槽。组合失败是「同 realm 第二份 `terminals` service 抛」和「Consumer `inject` 等到服务」。`sandbox/mode` fence 走 Cordis `internal/dispatch`（emit 分发期抛错），不是一条要 `next()` 的 terminals waterfall。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/terminal/terminal/src/index.ts` | Definition：`TerminalSessionService`、`TerminalError`、`registerBackend` |
| `packages/terminal/terminal/src/types.ts` | `TerminalBackend` / send / read / signal 合同 |
| `packages/terminal/terminal/tests/service.spec.ts` | owner 栅栏、unpublished rollback、`SEND_ACTIVE`、disposal |
| `packages/terminal/terminal-bash/src/index.ts` | `inject`、`BashTerminalBackend`、sandbox-mode fence、pwsh startup、`apply` |
| `packages/terminal/terminal-bash/src/config.ts` | Schemastery 默认（`backendType: 'shell'`、`timeoutMs: 30_000`、`shellDialect`） |
| `packages/terminal/terminal-bash/src/session.ts` | `LocalPtySession`：就绪、互斥 send、close |
| `packages/subprocess/subprocess-local/src/index.ts` | 默认 `spawnTerminal`（node-pty） |
| `packages/subprocess/subprocess-local/src/terminal.ts` | `LocalTerminalHandle`（前台信号 / 会话树清理） |
| `packages/preset/agent-presets/presets/minimal/agent.cordis.yml` | shipped preset 唯一 `isolate.terminals` 组 |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 不叠 `dsh-base` 的完整 insert，含 `id: pty` |

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
| `hasOwnerActivity(owner)` | pending spawn **或** 已发布 session。政策围栏用它，避免 publication 空窗。[E: packages/terminal/terminal/src/index.ts:231] |
| `terminal-bash` `Config` | `backendType` 默认 `'shell'`；`shellDialect` 默认 `'bash'`；bash 默认 `/bin/bash` + `--noprofile --norc -i`；pwsh 默认 `resolvePwshPath()` + `-NoLogo -NoProfile`；`timeoutMs` 默认 `30_000`（**一条 send / pwsh 完整 startup 的就绪上限**，不是 `defineTool.timeoutMs`）。[E: packages/terminal/terminal-bash/src/config.ts:85] [E: packages/terminal/terminal-bash/src/config.ts:98] |
| `inject` | `['terminals', 'sandboxPolicy', 'sessionProjections', 'subprocess']`。没有 `fs`，也没有 `sandbox`（sandbox 用 `ctx.get`）。[E: packages/terminal/terminal-bash/src/index.ts:27] |
| `CONTROLLED_PROMPT` | `'dsh> '`。bash dialect 把 `PS1` 设成它，并用 `PROMPT_COMMAND` 打 OSC `133;D` 标记；pwsh 走 `PWSH_PROMPT_SETUP` 函数，不靠 `PS1`。[E: packages/terminal/terminal-bash/src/sanitize.ts:9] [E: packages/terminal/terminal-bash/src/index.ts:82] [E: packages/terminal/terminal-bash/src/index.ts:97] |

本缝 **不**声明 Cordis `Events`。`sandbox/mode` 事件属于 session log，定义在 sandbox-policy 包。

## 控制流

1. `TerminalSessionService`@packages/terminal/terminal/src/index.ts 在 augmentation 里声明 `Context.terminals`，构造调用 `Service` → `ctx.reflect.provide('terminals', self)`，并用 `ctx.effect` 登记 `disposeAll`。[E: packages/terminal/terminal/src/index.ts:50] [E: packages/terminal/terminal/src/index.ts:116] [E: vendor/cordis/src/service.ts:57]
2. 同一 isolate realm 再挂第二个名为 `terminals` 的 service，`reflect.provide` 抛 `service "terminals" has been registered`。[E: vendor/cordis/src/reflect.ts:290] backend 重名走另一条：`registerBackend` 抛 `DUPLICATE_BACKEND`，并包在 `ctx.effect` 里以便 unload 只删自己那份贡献。[E: packages/terminal/terminal/src/index.ts:127] [E: packages/terminal/terminal/tests/service.spec.ts:141]
3. **`dsh-base` 不挂本缝。** 执行面 service 行是 `subprocess` / `sandbox` / `sandbox-policy` / `bash-sandbox`，没有 `id: pty`。[E: packages/bundle/base/cordis.patch.yml:205] [E: packages/bundle/base/cordis.patch.yml:211] [E: packages/bundle/base/cordis.patch.yml:220] shipped preset 里只有 `minimal`：`id: persistent-shell` 的 `cordis:group` 写 `isolate.terminals: true`，组内含 `@deepseek-ai/dsh-terminal`、`dsh-terminal-bash`（POSIX bash / win32 `shellDialect: pwsh` 各一行）、`dsh-tool-bash-persistent`、`dsh-tool-pwsh-persistent`。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:25] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:28] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:31] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:37] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:59] **`dsh-sdk-minimal` 不叠 base**，自己的完整 insert 含 `id: pty` + `terminal-bash` / `terminal-pwsh` + persistent 工具（host 平面，不是 preset isolate）。[E: packages/bundle/sdk-minimal/cordis.patch.yml:50] [E: packages/bundle/sdk-minimal/cordis.patch.yml:53]
4. `standard` / `ptc` / `cordis` 的 shell 行是 `@deepseek-ai/dsh-tool-bash` 与 `@deepseek-ai/dsh-tool-pwsh`（one-shot，`ctx.shell`），没有 `isolate.terminals` 组。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:45] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:52] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:45] preset 若把 `TerminalSessionService` 发进 root realm，`leakedServices` 会把它算进 `root[Context.isolate]`，`mountPreset` 拒绝。[E: packages/preset/agent-presets/src/mount.ts:221] [E: packages/preset/agent-presets/src/mount.ts:407] `isolate` 列表只有 `terminals`：组内 `inject` 的 `sandboxPolicy` / `sessionProjections` / `subprocess` 仍解析到 host。
5. `apply`@packages/terminal/terminal-bash/src/index.ts 校验 Config 后 `ctx.terminals.registerBackend(new BashTerminalBackend(ctx, config))`。默认 `spawnTerminal` 闭包是 `ctx.subprocess.spawnTerminal`。[E: packages/terminal/terminal-bash/src/index.ts:225] [E: packages/terminal/terminal-bash/src/index.ts:182] Loader 单测钉死 `name === 'terminal-bash'` 且 `inject` 恰好那四项。[E: packages/terminal/terminal-bash/tests/index.spec.ts:545] [E: packages/terminal/terminal-bash/tests/index.spec.ts:546]
6. `spawn`@packages/terminal/terminal/src/index.ts：`assertActive`；`ensureOwnerCleanup`（owner 必须是 `ctx.agents.get(owner.id) === owner`）；按 `request.type` 取 backend；空 `name` 抛错；`reserveName` + `reserveSpawn`；把调用方 `signal` 与内部 abort 合成后交给 `backend.spawn`。成功且 owner 仍 live 才 `sessions.set` 并返回 snapshot（含 `motd`）。[E: packages/terminal/terminal/src/index.ts:154] [E: packages/terminal/terminal/src/index.ts:157] [E: packages/terminal/terminal/src/index.ts:194] 失败且 session 未发布则 `session.close('PTY spawn rolled back')`。单测：未登记 owner → `OWNER_NOT_LIVE`；缺 backend → `NO_BACKEND`；同名已发布或正在创建 → `DUPLICATE_NAME`；owner 在 unpublished 期间消失 → pending 以 `OWNER_NOT_LIVE` 失败且 rollback close。[E: packages/terminal/terminal/tests/service.spec.ts:178] [E: packages/terminal/terminal/tests/service.spec.ts:180] [E: packages/terminal/terminal/tests/service.spec.ts:189] [E: packages/terminal/terminal/tests/service.spec.ts:216]
7. `BashTerminalBackend.spawn`@packages/terminal/terminal-bash/src/index.ts 先 `ensureSandboxModeFence(this.ctx, spec.owner)`，再 `ctx.sandboxPolicy.resolve({ session: spec.owner.session })` 一次取出 mode + `workspaceRoot`。[E: packages/terminal/terminal-bash/src/index.ts:193] [E: packages/terminal/terminal-bash/src/index.ts:194] `spawnArgv`：`danger-full-access` 直接返回 `[shellPath, ...shellArgs]`；其它 mode 没有 `ctx.sandbox` 就抛 `requires a ctx.sandbox provider in the execution world`，**不**调用 `spawnTerminal`；有 sandbox 则把 `confine(...).argv` 交给后续 spawn。[E: packages/terminal/terminal-bash/src/index.ts:102] [E: packages/terminal/terminal-bash/src/index.ts:105] [E: packages/terminal/terminal-bash/src/index.ts:108] cwd 是 `spec.cwd ?? policy.workspaceRoot`。[E: packages/terminal/terminal-bash/src/index.ts:199] 缺 sandbox 的单测断言 spawn 函数根本不会跑。[E: packages/terminal/terminal-bash/tests/index.spec.ts:271] [E: packages/terminal/terminal-bash/tests/index.spec.ts:275]
8. 显式 `env` 只含 terminal 覆盖（`TERM=dumb`、`PAGER=cat`、`GIT_PAGER=cat`、bash 的 `PS1` / `PROMPT_COMMAND`、pwsh 的 `NO_COLOR`、`DSH_SHELL` / `DSH_SESSION_ID` / `DSH_PTY_SESSION_ID`）。ambient 密钥不在这份对象里；真正剥环境的是 subprocess Provider 的 `childEnv`。[E: packages/terminal/terminal-bash/src/index.ts:67] [E: packages/terminal/terminal-bash/src/index.ts:82] 单测：confine 后 argv 变成 `['/sandbox', '--', '/bin/bash', '-i']`，`PTY_TEST_SECRET` 不出现在 `spec.env`。[E: packages/terminal/terminal-bash/tests/index.spec.ts:212] [E: packages/terminal/terminal-bash/tests/index.spec.ts:223]
9. `LocalSubprocessRuntime.spawnTerminal`@packages/subprocess/subprocess-local/src/index.ts 用 `node-pty` 分配（`name: 'dumb'`），`env` 走 `childEnv(spec.env)`，句柄是 `LocalTerminalHandle`。spec 的 `signal` 只取消**分配**；发布后的寿命由 handle `terminate()` 管。[E: packages/subprocess/subprocess-local/src/index.ts:161] [E: packages/subprocess/subprocess-local/src/index.ts:175] [E: packages/subprocess/subprocess/src/index.ts:139] `LocalTerminalHandle.signalForeground('SIGKILL')` 若前台组就是 shell 自己，会拒，要求走 session `terminate()` / 注册表 `kill`。[E: packages/subprocess/subprocess-local/src/terminal.ts:100]
10. `LocalPtySession.initialize`@packages/terminal/terminal-bash/src/session.ts 发一条空 send（`text: ''`, `submit: false`）等到就绪。`session_exit` / `timeout` 使 spawn 失败；成功则把 viewport 写成 `motd`。[E: packages/terminal/terminal-bash/src/session.ts:238] [E: packages/terminal/terminal-bash/src/session.ts:240] [E: packages/terminal/terminal-bash/src/session.ts:242] pwsh dialect **不**走 `initialize`：`startupSession` 提交 `ENCODING_PREAMBLE + PWSH_PROMPT_SETUP`，直到 `waitReason === 'stdin_read'`。[E: packages/terminal/terminal-bash/src/index.ts:135] 初始化失败会 `session.close('PTY startup failed')`，close 再失败则 `TerminalBackendCleanupError`。[E: packages/terminal/terminal-bash/src/index.ts:212]
11. 已发布之后，所有操作过 `expectOwned`：未知 id → `NO_SESSION`；`record.owner !== owner` → `FOREIGN_SESSION`。`list` 只返回该 owner。单测：foreign 的 `read` / `signal` / `kill` 都抛 `belongs to another agent`。[E: packages/terminal/terminal/src/index.ts:390] [E: packages/terminal/terminal/tests/service.spec.ts:170] `startSend` 在注册表层互斥：已有 `record.active` 抛 `SEND_ACTIVE`；backend 自己的 `LocalPtySession.startSend` 再挡一层（含 draining write / interrupt）。[E: packages/terminal/terminal/src/index.ts:246] [E: packages/terminal/terminal-bash/src/session.ts:260] `kill` 若已有 `closing` 就 join 并返回 `false`；close 失败则清掉 fence 让调用方可重试，会话仍留在 map 里。[E: packages/terminal/terminal/src/index.ts:287] [E: packages/terminal/terminal/src/index.ts:298] [E: packages/terminal/terminal/tests/service.spec.ts:501]
12. **sandbox/mode fence。** `setSandboxMode` 只 `session.append('sandbox/mode', { mode })`。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:54] `collectSessionCallbacks` 在真正入 log 之前用 `events.dispatch('emit', …)` 收集 listener，Cordis 对非 `internal/*` 名字先 `emit('internal/dispatch', …)`。[E: packages/core/session/src/index.ts:376] [E: vendor/cordis/src/events.ts:169] fence 挂在 `owner.ctx.on('internal/dispatch', …, { global: true })`：只看该 owner 的 `session/event` 且 `event.type === 'sandbox/mode'`；新 mode 与 `sessionProjections.stateOf(session, 'sandboxMode') ?? sandboxPolicy.defaultMode` 相同，或 `!hasOwnerActivity(owner)`，就放行；否则抛错，append 不提交。[E: packages/terminal/terminal-bash/src/index.ts:51] [E: packages/terminal/terminal-bash/src/index.ts:57] session 单测：`internal/dispatch` 抛错时 `session.events` 仍为空。[E: packages/core/session/tests/session.spec.ts:1521] [E: packages/core/session/tests/session.spec.ts:1522] backend 单测：同 mode 可再写一条；降到 `read-only` 在有 live session 或 unpublished spawn 时抛 `cannot change sandbox mode…`；unload backend 后围栏仍在（listener 绑在 owner，不绑在 provider fiber）。[E: packages/terminal/terminal-bash/tests/index.spec.ts:612] [E: packages/terminal/terminal-bash/tests/index.spec.ts:615] [E: packages/terminal/terminal-bash/tests/index.spec.ts:657]
13. teardown：owner fiber dispose → `disposeOwned`（abort pending + `close('PTY owner disposed')`）。service fiber dispose → `disposing = true`，`disposeAll` 关所有 owner；`finally` 仍清空 `backends` / `ownerCleanups`，避免一份卡住的 close 把注册表孤儿化。[E: packages/terminal/terminal/src/index.ts:428] [E: packages/terminal/terminal/src/index.ts:447] [E: packages/terminal/terminal/tests/service.spec.ts:599]
14. **Consumer。** `dsh-tool-bash-persistent` `inject = ['tools', 'terminals']`，body 只打 `ctx.terminals.spawn` / `startSend` / `kill`，不碰 `ctx.shell`。[E: packages/shell/tool-bash-persistent/src/index.ts:429] [E: packages/shell/tool-bash-persistent/src/index.ts:253] `dsh-tool-pwsh-persistent` 同样 `inject = ['tools', 'terminals']`。[E: packages/shell/tool-pwsh-persistent/src/index.ts:469] `dsh-tool-terminal` `inject = ['terminals', 'tools', 'systemPrompt']`，注册六个 wire 名；没有 `ctx.terminals` 时插件挂起。[E: packages/terminal/tool-terminal/src/index.ts:27] [E: packages/terminal/tool-terminal/src/index.ts:162] 四个 shipped preset **都不**挂 `dsh-tool-terminal`。snapshot / e2e overlay 才 `insert` `id: pty` + `terminal-bash` + `tool-terminal`。[E: snapshots/session/pty-tools-sandbox-backend/cordis.yml:4] [E: snapshots/session/pty-tools-sandbox-backend/cordis.yml:6] [E: snapshots/session/pty-tools-sandbox-backend/cordis.yml:16]
15. **换世界。** `terminal-bash` 不 `inject` `fs`。只换 `ctx.fs` 不会把 PTY 搬到远程。只换 `ctx.subprocess` 会换掉默认 `spawnTerminal` 的执行世界。E2B live e2e 在成对替换后断言 `terminal.echo.waitReason === 'stdin_read'`。[E: packages/e2b/e2b/tests/composition.e2e.ts:162] 换 `type` 或换 backend 包会换 argv / env / confine 方言。换 / isolate `ctx.terminals` 会换 id、鉴权与 cleanup，但 host 上的 `subprocess` / `sandboxPolicy` 仍是那一份。

## 设计动机

- **注册表与力学拆开。** owner / id / 互斥 send / awaited cleanup 对每个 backend 都一样；`node-pty` 就绪探测、受控 prompt、confine argv、pwsh bootstrap 会随执行世界 / dialect 变。模型工具只 `inject` `terminals`，不 import `*-bash`。
- **键放在 preset isolate（web 产品路径），不放进 `dsh-base`。** 会话身份是 exact `Agent`。host 上再挂一份 `ctx.terminals` 会让两个 preset 抢同一 realm，或让没有 PTY 工具的 `standard` 会话也带着空注册表。`minimal` 用 `isolate.terminals: true` 把泄漏挡在 `mountPreset`。`sdk-minimal` 是例外：它是完整 insert、没有 agent-presets roster，PTY 行直接在 bundle 树里。
- **围栏罩文件副作用，PTY 必须跟 mode 一起死。** `SandboxMode` 只有 `read-only` / `workspace-write` / `danger-full-access`，没有网络 / 进程可见性取值。[E: packages/sandbox/sandbox/src/index.ts:29] 一条已经用更宽 mode 打开的 PTY 若在降权后继续活着，就绕过了后续 `confine`。fence 因此在 `internal/dispatch` 否决，而不是写完 log 再补救。当前 fold 读 `sessionProjections.stateOf(..., 'sandboxMode')`，与 policy 包的投影一致。
- **缺 sandbox 与缺 runner 都 fail-loud。** confined mode 没有 `ctx.sandbox`：backend 自己抛错。有 sandbox 但平台没有 usable runner：`confine` 抛 `SANDBOX_UNAVAILABLE`，禁止退回裸 argv。[E: packages/sandbox/sandbox/src/index.ts:124] `danger-full-access` 才跳过 confine。
- **就绪 ≠ 退出。** 交互式 REPL 可以在进程仍 running 时把 send 交还（`stdin_read` / `inferred_idle`）。把 `waitReason` 当成 `exitCode` 会让模型以为命令已经结束。

相对 Codex：Codex 默认产品路径就有持久 shell；DSH 默认 `dsh web` + `standard` 走 one-shot `ctx.shell`，PTY 是 `minimal` / `sdk-minimal` / overlay 的 opt-in。相对 Pi：Pi 没有这条可替换 `ctx.terminals` 缝，持久 shell 焊在具体工具里。

## Gotcha

- `waitReason` 为 `inferred_idle` 或 `timeout` 时，`sessionStatus` 仍可以是 `{ kind: 'running' }`。`dsh-tool-terminal` 的 system-prompt 段落把这句写进模型可见文案。[E: packages/terminal/tool-terminal/src/index.ts:159]
- 同一 session 同时两条 send → `SEND_ACTIVE`。`dsh-tool-bash-persistent` 用 per-owner 队列避开它；直接打注册表不会排队。
- 授权比的是 **同一个 `Agent` 对象**，不是 session id 字符串。另一个 agent 拿着 `pty-1` 会收到 `FOREIGN_SESSION`。
- `hasOwnerActivity` 在 `backend.spawn` 尚未返回时已是 `true`。unpublished 期间改 sandbox mode 同样被拒。[E: packages/terminal/terminal-bash/tests/index.spec.ts:657]
- 调用方 abort 优先于 rollback 失败：pending `spawn` 仍 reject 成调用方 reason；cleanup 失败留到 owner/service dispose 再以 `failed to clean up PTY lifecycle` 冒出来。[E: packages/terminal/terminal/tests/service.spec.ts:255] [E: packages/terminal/terminal/tests/service.spec.ts:258]
- `LocalTerminalHandle` 拒绝对 shell 自己 `SIGKILL`。模型面要拆掉整棵会话走 `kill`，不要指望 `terminal_signal(SIGKILL)` 杀掉 bash 主进程。[E: packages/subprocess/subprocess-local/src/terminal.ts:101]
- `minimal` 把 `terminal-bash.config.timeoutMs` 覆写成 `300000`；包默认是 `30_000`。这是 **send / pwsh startup 就绪墙钟**。`dsh-tool-bash-persistent` / `dsh-tool-pwsh-persistent` 另有自己的 `timeoutMs`（命令墙钟），两套不要混。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:34] [E: packages/terminal/terminal-bash/src/config.ts:98]
- persistent `bash` 在 spawn 之后会再 `startSend` 执行 `stty -echo`（抑制回显），**不**改 `PS1`。backend 的 `CONTROLLED_PROMPT`（`dsh> `）仍是就绪合同。[E: packages/shell/tool-bash-persistent/src/index.ts:268]
- `dsh-web-app` 注释里出现 `tool-terminal` 只是在解释 `ctx.jobs` 为什么留在 host，**不是** web bundle 挂了六件套。[E: packages/bundle/web-app/cordis.patch.yml:327] 六个名字的 schema 见 T1 页，本页不列表。
- 官方 `terminal-bash` README 可能仍把 inject 写成旧键。可加载源是 `terminals` + `sandboxPolicy` + `sessionProjections` + `subprocess`。wiki 跟代码。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-terminal` 的 `TerminalSessionService`（具体 Service，不是抽象类） | `ctx.terminals`。`super(ctx, 'terminals')`。**没有** `dsh-base` / `dsh-web-app` 行；`dsh-sdk-minimal` 有 `id: pty` |
| **Backend（默认 PTY 力学）** | `@deepseek-ai/dsh-terminal-bash` 的 `BashTerminalBackend` + `LocalPtySession` | `registerBackend`；`type` 默认 `'shell'`。`inject = ['terminals', 'sandboxPolicy', 'sessionProjections', 'subprocess']`。不 `provide` 第二个 `ctx.terminals` |
| **进程底物** | `ctx.subprocess.spawnTerminal`；默认 `@deepseek-ai/dsh-subprocess-local` | **host**（`dsh-base`）或 `sdk-minimal` 自己的 `id: subprocess`。换 E2B 时仍占 `ctx.subprocess`，见 [subsys.execution.e2b](e2b.md) |
| **Consumer（shipped preset）** | `@deepseek-ai/dsh-tool-bash-persistent`（模型名 `bash`）与 `@deepseek-ai/dsh-tool-pwsh-persistent`（模型名 `pwsh`） | `inject = ['tools', 'terminals']`。只在 `minimal` 的 `isolate.terminals` 组（以及 `sdk-minimal` bundle） |
| **Consumer（opt-in）** | `@deepseek-ai/dsh-tool-terminal`（`terminal_*` 六件套） | `inject = ['terminals', 'tools', 'systemPrompt']`。四个 shipped preset 都没有这行；snapshot overlay `id: tool-terminal` |
| **政策 / 围栏（相邻缝）** | `ctx.sandboxPolicy`（必 inject）+ `ctx.sessionProjections`（fence fold）+ `ctx.sandbox`（`ctx.get`，confined mode 才要） | 都在 **host**（或 sdk-minimal 自己的树）。preset 不 isolate 这些键 |

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
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/shell/tool-bash-persistent/src/index.ts
- packages/shell/tool-pwsh-persistent/src/index.ts
- packages/terminal/tool-terminal/src/index.ts
- apps/cli/package.json
- snapshots/session/pty-tools-sandbox-backend/cordis.yml
- packages/e2b/e2b/tests/composition.e2e.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/reflect.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `shell` / `subprocess` 三角；PTY 只吃 `subprocess`。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：模型 `tool-call` 进入 `tools/pre-execute → execute → post-execute`。本缝不挂那条 waterfall。
- [subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）：`spawnTerminal` 原语与 `LocalTerminalHandle`。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`resolve` 与 `sandbox/mode` fold；本页 fence 读同一份投影。
- [subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）：`confine` 与 `SANDBOX_UNAVAILABLE`。
- [subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）：成对替换 `fs`+`subprocess` 时 PTY 跟着 `spawnTerminal` 走。
- [subsys.execution.shell](shell.md)（`subsys.execution.shell`）：默认产品路径上的 one-shot `ctx.shell`，与本缝并行存在。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host 执行面没有 `dsh-terminal` 行。
- [surface.tools.terminal](../../surface/tools/terminal.md)（`surface.tools.terminal`）：`terminal_*` 六件套（opt-in）。
- [surface.tools.bash-persistent](../../surface/tools/bash-persistent.md)（`surface.tools.bash-persistent`）：`minimal` 里模型可见的持久 `bash`。
- [surface.tools.pwsh](../../surface/tools/pwsh.md)（`surface.tools.pwsh`）：persistent `pwsh`（勿与 one-shot `dsh-tool-pwsh` 混）。
- [surface.presets.minimal](../../surface/presets/minimal.md)（`surface.presets.minimal`）：`isolate.terminals` 组的成员表。
- [surface.presets.code](../../surface/presets/code.md)（`surface.presets.code`）：稳定别名；目录是 `presets/ptc/`，one-shot shell，无本缝。
