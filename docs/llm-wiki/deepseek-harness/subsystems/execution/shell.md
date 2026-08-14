---
id: subsys.execution.shell
title: shell 执行缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/shell/shell/src/index.ts
  - packages/shell/shell/src/types.ts
  - packages/shell/shell/src/render.ts
  - packages/shell/shell/tests/service.spec.ts
  - packages/shell/shell/tests/render.spec.ts
  - packages/shell/shell-env/src/index.ts
  - packages/shell/shell-env/tests/shell-env.spec.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-bash/tests/tools.spec.ts
  - packages/shell/tool-pwsh/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/shell/bash-local/tests/executor.spec.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/shell/pwsh-local/src/index.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/hooks/hooks-codex/src/index.ts
  - packages/hooks/hook-protocol/src/runner.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/settings/settings/src/index.ts
  - packages/subprocess/subprocess/src/types.ts
  - packages/core/tools/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/index.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/reflect.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.shell
  - ShellExecutor
  - ctx.shellEnv
  - SHELL_SETTINGS_NAMESPACE
  - ShellEnvRegistry
related:
  - spine.overview
  - spine.capability-seams
  - spine.tool-call-anatomy
  - subsys.execution.bash-local
  - subsys.execution.pwsh-local
  - subsys.execution.subprocess
  - subsys.execution.sandbox
  - subsys.core.tools
  - subsys.composition.bundle-base
  - surface.tools.bash
  - surface.tools.pwsh
  - surface.misc.security
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.shell`（`ShellExecutor`）是 **host 面**命令执行缝的 Definition：抽象类构造 `super(ctx, 'shell')` 占唯一的 Cordis service 名 `shell`，原语是 `resolve` / `run` / `start`。`run` 对非零退出、timeout、abort **resolve** 出 `ShellRunResult`，只对基础设施失败 reject。默认 shipped Provider **不是**本 Definition 包，而是 `dsh-bash-sandbox` / `dsh-pwsh-sandbox`；并列 host 服务 `ctx.shellEnv` 登记可信 `DSH_*`。模型面 Consumer 是 `dsh-tool-bash` / `dsh-tool-pwsh`。

## 能回答的问题

- `ctx.shell` 由哪个包声明？`dsh-base` 为什么不挂 `@deepseek-ai/dsh-shell` 本身？
- 同一 realm 同时启用 POSIX 与 win32 两行会怎样？`SHELL_SETTINGS_NAMESPACE` 为什么写在 Definition 而不是某个 executor？
- `ctx.shellEnv` 和 `ctx.shell` 是一条缝还是两条？谁 `collect`、谁把快照写进 `dshEnv`？
- 没有 `ctx.shell` 时 `dsh-tool-bash` 会挂起还是注册空 schema？
- 本缝有没有 `shell/*` waterfall？模型 `bash` 调用经过哪条 `tools/*` 链，不 `next()` 会怎样？

## 职责边界

`@deepseek-ai/dsh-shell` 拥有：`ctx.shell` 的 TypeScript 合同（`ShellExecutor` + `ShellExecRequest` / `ShellExecSpec` / `ShellRunResult` / `ShellProcess`）、Settings 命名空间 `SHELL_SETTINGS_NAMESPACE`、以及给 `dsh-tool-bash` / `dsh-tool-pwsh` 共用的 `parseExitStatus`。并列包 `@deepseek-ai/dsh-shell-env` 拥有 `ctx.shellEnv`（`ShellEnvRegistry`）：可信 `DSH_*` 的登记与 per-call `collect`。两条都是 **host 面** service；agent-preset 面不 `provide` 它们。

明确**不**拥有：

- 默认 POSIX / win32 实现与 `ctx.sandbox.confine` 围栏：[subsys.execution.bash-local](bash-local.md)（`subsys.execution.bash-local`）/ [subsys.execution.pwsh-local](pwsh-local.md)（`subsys.execution.pwsh-local`）。
- `bash -c` / 本地 pwsh 精确 argv 真正 spawn 的世界：[subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）。只换 `ctx.fs` 不会把这条命令搬到远程。
- `SandboxMode` / `SANDBOX_UNAVAILABLE` / `approveEscalation` 合同：[subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）。产品面审批话术在 [surface.misc.security](../../surface/misc/security.md)（`surface.misc.security`）。
- 模型看见的 `bash` / `pwsh` 字段表：[surface.tools.bash](../../surface/tools/bash.md)（`surface.tools.bash`）/ [surface.tools.pwsh](../../surface/tools/pwsh.md)（`surface.tools.pwsh`）。
- Job id / 所有权 / `job_output`：`dsh-jobs`。本缝的 `start` 只交回 `ShellProcess` 句柄。
- 持久 PTY `bash`：`dsh-tool-bash-persistent` `inject = ['tools', 'terminals']`，不碰 `ctx.shell`。[E: packages/shell/tool-bash-persistent/src/index.ts:402]
- `tools/pre-execute` → `execute` → `post-execute` 管线本身：[subsys.core.tools](../core/tools.md)（`subsys.core.tools`）。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是把 shell 焊进某一个 coding agent。默认安装路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/shell/shell/src/index.ts` | Definition：`ShellExecutor`、`Context.shell`、`SHELL_SETTINGS_NAMESPACE` |
| `packages/shell/shell/src/types.ts` | `ShellExecRequest` / `ShellExecSpec` / `ShellRunResult` / `ShellProcess`；重导出 `DSH_ENV_PREFIX` |
| `packages/shell/shell/src/render.ts` | `parseExitStatus`：从渲染文本找回 exit / signal pill |
| `packages/shell/shell/tests/service.spec.ts` | 登记 `ctx.shell`、基类 `sandboxMode === undefined`、同 realm 第二份抛 |
| `packages/shell/shell-env/src/index.ts` | 并列服务：`ShellEnvRegistry` / `ctx.shellEnv` |
| `packages/shell/shell-env/tests/shell-env.spec.ts` | 内置 `DSH_*`、contributor 独占、`ctx.effect` 可逆 |
| `packages/shell/tool-bash/src/index.ts` | 模型面 Consumer：`inject` 四键，`ctx.shell.run(ctx.shell.resolve(…))` |
| `packages/shell/tool-pwsh/src/index.ts` | win32 对称 Consumer |
| `packages/shell/bash-local/src/index.ts` | 本地 Provider 骨架：`inject` `subprocess`，安装 `SHELL_SETTINGS_NAMESPACE` |
| `packages/shell/bash-sandbox/src/index.ts` | 默认 POSIX Provider：`extends LocalBashExecutor`，仍占 `ctx.shell` |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`bash-sandbox` / `pwsh-sandbox` / `shell-env` / 平台互斥 tool 行 |
| `packages/bundle/web-app/cordis.patch.yml` | 关掉模型可见 tool 行；`shell-env` 留在 host |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | Web 默认 preset 把 `tool-bash` / `tool-pwsh` 挂回会话 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ShellExecutor` | `extends Service`；构造 `super(ctx, 'shell')`。抽象方法 `resolve` / `run` / `start`。[E: packages/shell/shell/src/index.ts:67] |
| `sandboxMode` | 基类 getter 返回 `undefined`；围栏 backend 覆盖。Consumer 用它决定要不要广告升权字段。[E: packages/shell/shell/src/index.ts:76] [E: packages/shell/shell/tests/service.spec.ts:75] |
| `ShellExecRequest` | 调用方请求：`command` 必填；`workdir` / `timeoutMs` / `stdoutMaxBytes` / `signal` / `stdin` / `env` / `dshEnv` / `sandboxPolicy` 可选。模型工具不把 `stdin` / `env` / `stdoutMaxBytes` 暴露成参数。 |
| `ShellExecSpec` | `resolve` 填齐并封顶后的规格。`start` 忽略 `timeoutMs`（后台无 executor timeout）。 |
| `ShellRunResult` | 一次前台结算。`timedOut` 与 `aborted` 互斥（fused deadline 只报先到的原因）。`sandbox?` 仅围栏 executor 盖章。[E: packages/shell/shell/src/types.ts:125] [E: packages/shell/shell/src/types.ts:131] [E: packages/shell/bash-local/tests/executor.spec.ts:104] [E: packages/shell/bash-local/tests/executor.spec.ts:116] |
| `ShellProcess` | `start` 立即返回的句柄。`done` 永不 reject；spawn 失败结算为 `killed`，错误走 stderr / 读路径。[E: packages/shell/shell/src/types.ts:169] |
| `SHELL_SETTINGS_NAMESPACE` | `settingsNamespace('shell')`，kebab 合法品牌串。命名空间在 Definition，不在某个 executor。[E: packages/shell/shell/src/index.ts:22] [E: packages/settings/settings/src/index.ts:26] |
| `ctx.shellEnv` | `ShellEnvRegistry`，`super(ctx, 'shellEnv')`。内置 `DSH_HOME` / `DSH_SHELL='1'`，有 `exec.agent` 再加 `DSH_SESSION_ID`。[E: packages/shell/shell-env/src/index.ts:100] [E: packages/shell/shell-env/src/index.ts:154] [E: packages/shell/shell-env/src/index.ts:155] |
| `DSH_ENV_PREFIX` | `'DSH_'`，所有权在 subprocess 缝，本包重导出。[E: packages/subprocess/subprocess/src/types.ts:13] |
| `parseExitStatus` | 从模型可见渲染文本拆 `[exit code: N]` / `[killed by signal: X]`。必须「前导换行 + 字符串末尾」才认；timeout / sandbox 标记留在 body。[E: packages/shell/shell/src/render.ts:36] |

本 Definition **不**声明 `shell/*` 事件。augmentation 只往 `Context` 加 `shell: ShellExecutor`。[E: packages/shell/shell/src/index.ts:42]

## 控制流

1. **Definition 只占键，不进 shipped 树。** `ShellExecutor`@packages/shell/shell/src/index.ts 在构造里 `super(ctx, 'shell')`，Cordis `Service` 随即 `ctx.reflect.provide('shell', self, …)`。[E: packages/shell/shell/src/index.ts:67] [E: vendor/cordis/src/service.ts:57] `dsh-base` 的 `cordis.patch.yml` **没有** `name: '@deepseek-ai/dsh-shell'` 行：真正 `provide` 的是子类插件。测试用 stub 子类 `ctx.plugin(StubExecutor)` 后即可 `ctx.shell.resolve` / `run` / `start`。[E: packages/shell/shell/tests/service.spec.ts:56]

2. **同一 realm 只能一份 `ctx.shell`。** `Reflect.provide` 发现 `this.store[key]` 已占用就抛 `service "shell" has been registered at <…>`。[E: vendor/cordis/src/reflect.ts:290] 测试再挂第二个子类，正则命中这句。[E: packages/shell/shell/tests/service.spec.ts:82] 因此 POSIX 与 win32 两行必须靠 `disabled` 互斥，不能双开。

3. **host 默认 Provider 是 sandbox 包装，不是 `*-local`。** `dsh-base` 挂 `id: bash-sandbox` / `name: '@deepseek-ai/dsh-bash-sandbox'`，`disabled: !!js process.platform === 'win32'`；对称挂 `id: pwsh-sandbox`，`disabled: !!js process.platform !== 'win32'`。[E: packages/bundle/base/cordis.patch.yml:178] [E: packages/bundle/base/cordis.patch.yml:179] [E: packages/bundle/base/cordis.patch.yml:180] [E: packages/bundle/base/cordis.patch.yml:184] [E: packages/bundle/base/cordis.patch.yml:185] [E: packages/bundle/base/cordis.patch.yml:186] `base.spec.ts` 用 `evaluate({ process: { platform } }, expr)` 钉死这四行（含 tool 行）在 win32 / linux 恰好互斥，并且仓库没有 `windows.cordis.patch.yml`。[E: packages/bundle/base/tests/base.spec.ts:71] [E: packages/bundle/base/tests/base.spec.ts:72] [E: packages/bundle/base/tests/base.spec.ts:75] `SandboxBashExecutor extends LocalBashExecutor`，`static inject = ['subprocess', 'sandbox', 'sandboxPolicy']`，覆盖 `sandboxMode`，**仍然**登记成唯一的 `ctx.shell`。[E: packages/shell/bash-sandbox/src/index.ts:44] [E: packages/shell/bash-sandbox/src/index.ts:45] [E: packages/shell/bash-sandbox/src/index.ts:75] `SandboxPwshExecutor` 同样 `extends PwshLocalExecutor` 且 `inject` 三键。[E: packages/shell/pwsh-sandbox/src/index.ts:52] [E: packages/shell/pwsh-sandbox/src/index.ts:53] 围栏细节在 [subsys.execution.bash-local](bash-local.md)；`danger-full-access` 不调用 `confine`。

4. **`ctx.shellEnv` 是并列 host 服务，不是 `ctx.shell` 的字段。** `dsh-base` 单独挂 `id: shell-env` / `name: '@deepseek-ai/dsh-shell-env'`。[E: packages/bundle/base/cordis.patch.yml:207] [E: packages/bundle/base/cordis.patch.yml:208] `apply@packages/shell/shell-env/src/index.ts` `new ShellEnvRegistry` 再 `register` 内置 contributor `session-persistence`（`DSH_SESSION_JSONL`，仅 jsonl backend 才给出路径）。[E: packages/shell/shell-env/src/index.ts:201] [E: packages/shell/shell-env/src/index.ts:203] `register` 走 `this.ctx.effect(function* …)`：重名、非法键、抢保留键（`DSH_HOME` / `DSH_SHELL` / `DSH_SESSION_ID`）、抢别人的键全部当场抛；fiber dispose 卸掉条目。[E: packages/shell/shell-env/src/index.ts:111] [E: packages/shell/shell-env/src/index.ts:74] 测试：`collect` 无 agent 只有 `DSH_HOME`+`DSH_SHELL`；有 session 再加 `DSH_SESSION_ID`。[E: packages/shell/shell-env/tests/shell-env.spec.ts:40]

5. **Web 切 host / preset：Provider 与 `shell-env` 留下，模型 tool 行搬走。** `dsh-web-app` 把 `id: tool-bash` / `id: tool-pwsh` 写成 `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:296] [E: packages/bundle/web-app/cordis.patch.yml:297] `shell-env` **没有**对应 disable。`dsh-web-app` 的 `apply` 在 `surfaceContext` 下 `ctx.inject(['shellEnv'], …)` 再 `register` contributor `web-runtime`，写入 `DSH_WEB_URL`。[E: packages/bundle/web-app/src/index.ts:149] [E: packages/bundle/web-app/src/index.ts:150] 注入发生在任何 session 出现之前，所以这份 registry 必须在 host 面；塞进 preset realm 后 Web 行看不见 `ctx.shellEnv`。`standard` preset 再按平台挂回 Consumer：`id: tool-bash` `disabled: !!js process.platform === 'win32'`，`id: tool-pwsh` 倒置。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:44] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:46] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:48] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50] 这两行只 `register` 进 host 的 `ctx.tools`，自己不 `provide`，不必 `isolate`。`minimal` **不**挂 `dsh-tool-bash`：它挂的是 `dsh-tool-bash-persistent`（`isolate.terminals`），走 `ctx.terminals`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33]

6. **Consumer 用 `inject` 等到 service；缺 `ctx.shell` 则插件挂起。** `dsh-tool-bash` `export const inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`。[E: packages/shell/tool-bash/src/index.ts:31] `dsh-tool-pwsh` 同一四元组。[E: packages/shell/tool-pwsh/src/index.ts:49] 测试先装 `tools` + `shellEnv` 再 `plugin(ToolBash)`：`ctx.tools.schemas()` 长度为 0；补上 `LocalBashExecutor` 之后才出现 `bash`。[E: packages/shell/tool-bash/tests/tools.spec.ts:417] [E: packages/shell/tool-bash/tests/tools.spec.ts:421] 卸掉 tool 插件 fiber，schema 与 `tool:bash` prompt section 一并消失。[E: packages/shell/tool-bash/tests/tools.spec.ts:405] 围栏 executor 已广告 `sandboxMode` 但 `ctx.sandboxPolicy` 缺失时，`apply` **load 期**抛，不静默降级。[E: packages/shell/tool-bash/src/index.ts:196]

7. **模型路径上的 waterfall 在 `ctx.tools`，不在本缝。** `ShellExecutor` 没有 `shell/*` listener 槽。`bash` 进 body 之前走 host `tools/pre-execute`：`ToolRuntime` 调 `this.ctx.waterfall(carrier, 'tools/pre-execute', exec, () => Promise.resolve({ kind: 'allow' }))`。[E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1477] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；listener 不调用传入的 `next()` 就不会 `cbs.shift()`，默认 `allow` 到不了，body 不跑。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] `tools/execute` / `tools/post-execute` 同一规则，细节在 [subsys.core.tools](../core/tools.md) / [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)。升权 `approveEscalation` 发生在 **tool body 开头**，不挂 `tools/pre-execute`，grant 只有 `allowed-once`。

8. **body：先 `collect` 再 `resolve` 再 `run`/`start`。** `tool-bash` `execute` 调 `ctx.shellEnv.collect(exec)` 得到冻结 `dshEnv`，组装 `request`（可选 `workdir` / `timeoutMs` / `sandboxPolicy`），前台 `await ctx.shell.run(ctx.shell.resolve({ …request, signal: exec.signal }))`。[E: packages/shell/tool-bash/src/index.ts:341] [E: packages/shell/tool-bash/src/index.ts:380] 后台把 `ctx.shell.start(ctx.shell.resolve(request))` 交给 `ctx.jobs.start` 的 `run` 回调；本页不写 job id。[E: packages/shell/tool-bash/src/index.ts:370] 模型多传的 `env` / `stdin` / `stdoutMaxBytes` **不会**写进 request。[E: packages/shell/tool-bash/tests/tools.spec.ts:1248] `pwsh` 的 `execute` 同样 `dshEnv: ctx.shellEnv.collect(exec)` 再 `ctx.shell.run(ctx.shell.resolve(…))`。[E: packages/shell/tool-pwsh/src/index.ts:363] [E: packages/shell/tool-pwsh/src/index.ts:397]

9. **`run` 的合同：命令结果 resolve，基础设施 reject。** 抽象方法是 `run(spec): Promise<ShellRunResult>`。[E: packages/shell/shell/src/index.ts:93] 本地实现里 timeout / abort / 进程自杀都 **await 出** `ShellRunResult`：`sleep 60` + 短 `timeoutMs` 得到 `timedOut: true`；caller `AbortSignal` 得到 `aborted: true`；`kill -TERM $$` 得到 `signal: 'SIGTERM'` 且两者都为 false。[E: packages/shell/bash-local/tests/executor.spec.ts:102] [E: packages/shell/bash-local/tests/executor.spec.ts:114] [E: packages/shell/bash-local/tests/executor.spec.ts:126] 坏 `workdir` 这种基础设施失败才 `rejects`（`ENOENT`）。[E: packages/shell/bash-local/tests/executor.spec.ts:133] `tool-bash` 把 `result.aborted` 再映射成 `TOOL_ABORTED` 抛给管线，其它结算变成模型可见 `kind: 'foreground'`。[E: packages/shell/tool-bash/src/index.ts:384] 默认 Provider 的 `run` 在 `danger-full-access` 之外会 `confine` 精确 argv；runner 启动失败（命令没跑）前台抛 `SANDBOX_UNAVAILABLE`，后台带 `runnerFailed`——那是基础设施，不是 exit code。细节在 [subsys.execution.bash-local](bash-local.md) / [subsys.execution.sandbox](sandbox.md)。

10. **Provider 是 `ctx.subprocess` 的 Consumer。** `LocalBashExecutor` `static inject = ['subprocess']`，`run` 把 `['bash', '-c', spec.command]` 交给 `runArgv`，后者 `this.ctx.subprocess.spawn`。[E: packages/shell/bash-local/src/index.ts:103] [E: packages/shell/bash-local/src/index.ts:212] [E: packages/shell/bash-local/src/index.ts:226] `startArgv` 同样 `spawn`，只把 `spec.signal` 传下去，**不**套 `deadline(spec.timeoutMs)`。[E: packages/shell/bash-local/src/index.ts:257] `PwshLocalExecutor` 同样 `inject = ['subprocess']`。[E: packages/shell/pwsh-local/src/index.ts:129] 换 `ctx.subprocess` 改这一整组的世界；换 `ctx.fs` 不会。后台进程跟 executor fiber 解耦：卸掉 executor 后 `proc.status` 仍是 `running`，卸掉 `LocalSubprocessRuntime` 才杀树。[E: packages/shell/bash-local/tests/executor.spec.ts:318] [E: packages/shell/bash-local/tests/executor.spec.ts:319] [E: packages/shell/bash-local/tests/executor.spec.ts:323] 后台 spawn 失败时 `done` **resolves**（不 reject），status 为 `killed`。[E: packages/shell/bash-local/tests/executor.spec.ts:295]

11. **Settings 命名空间由 Definition 导出、由当前那一个 Provider 安装。** `LocalBashExecutor` 构造调用 `installSettingsSection(ctx, SHELL_SETTINGS_NAMESPACE, LocalBashExecutor.Config, …)`。[E: packages/shell/bash-local/src/index.ts:128] `PwshLocalExecutor` 对**同一个** namespace 安装自己的 `Config`（含 `pwshPath`）。[E: packages/shell/pwsh-local/src/index.ts:168] 因为同一 realm 只能有一个 `ctx.shell`，两家不会把同一 namespace 登记两次；跨平台带走的 `settings.yaml` 仍解析到 `shell`。

12. **进程内还有两类非模型 Consumer。** `hooks-codex` / `hooks-claude-code` `inject = ['shell']`，`runHook` 用 `bash.run(bash.resolve({ command, stdin, env, … }))` 写 hook JSON——这正是 `ShellExecRequest.stdin` / `env` 的设计用途。[E: packages/hooks/hooks-codex/src/index.ts:41] [E: packages/hooks/hook-protocol/src/runner.ts:87] `dsh-permission-presets` `static inject = ['shell', 'approval', 'sessions']`：`ctx.shell.sandboxMode === undefined` 时 load 期抛，因为 preset 表捆绑了 sandbox mode。[E: packages/interaction/permission-presets/src/index.ts:180] [E: packages/interaction/permission-presets/src/index.ts:192] 这是默认挂 sandbox 包装而不是裸 `*-local` 的组合理由之一。

## 设计动机

- **合同与实现拆开。** `tool-bash` import 的是 `@deepseek-ai/dsh-shell` 类型，不 import `bash-local`。换世界 = 换 bundle / `--patch` 行，改 `ctx.shell` 的实现类；模型工具名与 schema 仍由 Consumer 写进 `ctx.tools`。
- **命令失败是结果，不是异常。** 模型必须看见 `[exit code: N]` 才能决定要不要升权或停手。把非零 / timeout / abort 做成 reject 会让工具管线把一次普通 `false` 当成基础设施故障。
- **Settings 跟能力走，不跟方言走。** 命名空间叫 `shell` 是因为 host 永远只有一个 provider；win32 换 pwsh 行时文档键不用改。
- **`DSH_*` 单独成服务。** Web / persistence 要在 session 出现之前 `register`。把 registry 焊进 executor 会让 `dsh-web-app` 的 `inject(['shellEnv'])` 失去独立生命周期。
- **和 peer harness 差在层，不差在「会不会跑 bash」。** Codex 产品面是 OS sandbox + 网络/进程可见性；DSH 这一缝只保证「谁 `provide` `ctx.shell`」以及文件副作用围栏（`SandboxMode` 词汇里没有 network）。Pi 没有这条可替换 host 缝，shell 跟 agent 绑在一起。

## Gotcha

- 同时把 `bash-sandbox` 与 `pwsh-sandbox` 的 `disabled` 去掉：第二个 `provide('shell')` 直接炸，不是 last-wins。[E: vendor/cordis/src/reflect.ts:290]
- 只装 `dsh-tool-bash`、不装任何 executor：插件 pending，`ctx.tools.schemas()` 为空，不是注册一个永远失败的 `bash`。[E: packages/shell/tool-bash/tests/tools.spec.ts:417]
- `ShellEnvRegistry.list()` 只枚举 contributor 声明，**不含** registry 自有的 `DSH_HOME` / `DSH_SHELL` / `DSH_SESSION_ID`。把它当完整目录会漏内置键。[E: packages/shell/shell-env/src/index.ts:185]
- contributor 抢 `DSH_HOME` / `DSH_SHELL` / `DSH_SESSION_ID`，或 `collect` 时返回未声明键 / 非 string，全部 fail-loud。[E: packages/shell/shell-env/src/index.ts:125] [E: packages/shell/shell-env/src/index.ts:166]
- `parseExitStatus('[exit code: 5]')`（没有前导换行）会被当成干净退出 0，那段字留在 body。[E: packages/shell/shell/tests/render.spec.ts:23]
- `start` 立刻返回；`timeoutMs` 对后台无效。停它靠 `kill()` 或 `spec.signal`，不是 executor 闹钟。
- `minimal` 的模型 `bash` 不是本缝 Consumer。不要把「preset 挂回 tool-bash」写成四份 shipped preset 的共性。
- YAML 注释里出现的 “TUI” 不是 shipped 产品面。默认路径仍是 `dsh web`。
- `glob` / `grep` **不**走 `ctx.shell`，走 `ctx.subprocess`（[subsys.execution.subprocess](subprocess.md)）。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | 包 `@deepseek-ai/dsh-shell`。`ShellExecutor` `super(ctx, 'shell')` → `ctx.shell`。导出 `SHELL_SETTINGS_NAMESPACE`。**不**作为 bundle 行加载。无 `shell/*` waterfall。 |
| **并列 Definition / host 服务** | 包 `@deepseek-ai/dsh-shell-env`。`ShellEnvRegistry` `super(ctx, 'shellEnv')` → `ctx.shellEnv`。base 行 `id: shell-env`。`register` 是 `ctx.effect`，不是 waterfall。 |
| **Provider（默认 host）** | POSIX：`@deepseek-ai/dsh-bash-sandbox`，base `id: bash-sandbox`，win32 `disabled`。win32：`@deepseek-ai/dsh-pwsh-sandbox`，base `id: pwsh-sandbox`，非 win32 `disabled`。二者都 **extends** 对应 `*-local`，独占同一 `ctx.shell`。`*-local` 本身 **不**出现在 shipped base。 |
| **Provider 的下游** | `LocalBashExecutor` / `PwshLocalExecutor` `inject` `subprocess`。围栏包装再 `inject` `sandbox` + `sandboxPolicy`。 |
| **Consumer（模型面 / preset）** | `dsh-tool-bash` / `dsh-tool-pwsh`：`inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`。web 下由 `standard` / `code` / `cordis` 挂回；headless 留在 host 全局层。字段表在 `surface.tools.*`。 |
| **Consumer（host 进程内）** | `hooks-codex` / `hooks-claude-code`（`inject` `shell`，用 `stdin`/`env`）；`dsh-permission-presets`（读 `sandboxMode`）。`dsh-web-app` 是 `ctx.shellEnv` 的 contributor，不是 `ctx.shell` 的 Consumer。 |

换 `ctx.shell` 的实现（例如去掉 sandbox 包装、或将来远程 executor）会带走所有 `inject: 'shell'` 的插件；模型工具名可以不变。换 `ctx.shellEnv` 会改每次 `collect` 的 `DSH_*` 快照，但不会改 spawn 世界。

## Sources

- packages/shell/shell/src/index.ts
- packages/shell/shell/src/types.ts
- packages/shell/shell/src/render.ts
- packages/shell/shell/tests/service.spec.ts
- packages/shell/shell/tests/render.spec.ts
- packages/shell/shell-env/src/index.ts
- packages/shell/shell-env/tests/shell-env.spec.ts
- packages/shell/tool-bash/src/index.ts
- packages/shell/tool-bash/tests/tools.spec.ts
- packages/shell/tool-pwsh/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/shell/bash-local/tests/executor.spec.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/shell/pwsh-local/src/index.ts
- packages/shell/pwsh-sandbox/src/index.ts
- packages/shell/tool-bash-persistent/src/index.ts
- packages/hooks/hooks-codex/src/index.ts
- packages/hooks/hook-protocol/src/runner.ts
- packages/interaction/permission-presets/src/index.ts
- packages/settings/settings/src/index.ts
- packages/subprocess/subprocess/src/types.ts
- packages/core/tools/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/index.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- vendor/cordis/src/service.ts
- vendor/cordis/src/reflect.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md) — 组合主线与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 总图；`ctx.shell` 是三条主缝之一。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → body → `tool/result`；本缝不拥有这条管线。
- [subsys.execution.bash-local](bash-local.md) — `LocalBashExecutor` / `SandboxBashExecutor`：`bash -c`、`confine`、fail-loud。
- [subsys.execution.pwsh-local](pwsh-local.md) — win32 默认 `ctx.shell` 与 ACL 围栏包装。
- [subsys.execution.subprocess](subprocess.md) — spawn / scrub / PTY 原语；本缝的下游世界。
- [subsys.execution.sandbox](sandbox.md) — `confine` 合同、`SandboxMode`、`SANDBOX_UNAVAILABLE`、`approveEscalation`。
- [subsys.core.tools](../core/tools.md) — `ctx.tools` 与必须 `next()` 的 waterfall。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — `dsh-base` 真树与平台互斥 `disabled`。
- [surface.tools.bash](../../surface/tools/bash.md) — 模型可见 `bash` 字段与渲染。
- [surface.tools.pwsh](../../surface/tools/pwsh.md) — 模型可见 `pwsh`。
- [surface.misc.security](../../surface/misc/security.md) — 审批与沙箱产品面（index 仍 planned）。
