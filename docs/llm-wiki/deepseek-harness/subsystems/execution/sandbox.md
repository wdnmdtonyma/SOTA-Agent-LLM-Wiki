---
id: subsys.execution.sandbox
title: sandbox 缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/sandbox/sandbox/src/roots.ts
  - packages/sandbox/sandbox/tests/escalation.spec.ts
  - packages/sandbox/sandbox/tests/roots.spec.ts
  - packages/sandbox/sandbox/tests/vocabulary.spec.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/sandbox/sandbox-local/src/index.ts
  - packages/sandbox/sandbox-local/src/profiles.ts
  - vendor/cordis/src/service.ts
symbols:
  - ctx.sandbox
  - SandboxProvider
  - SandboxMode
  - approveEscalation
  - SANDBOX_UNAVAILABLE
  - writableRoots
related:
  - spine.overview
  - spine.tool-call-anatomy
  - spine.trace-tool-approval
  - spine.capability-seams
  - subsys.execution.sandbox-policy
  - subsys.execution.sandbox-local
  - subsys.execution.fs-sandbox
  - subsys.interaction.approval
  - subsys.core.tools
  - surface.misc.security
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.sandbox`（`SandboxProvider`）是 **host 面**进程围栏缝：把精确 argv 包成 enforcing runner，执行 **per-call 文件政策**（`SandboxMode` = `read-only` / `workspace-write` / `danger-full-access`）。同一包还拥有升权合同 `approveEscalation` 与共用可写根 `writableRoots`。没有 usable backend 时抛 `SANDBOX_UNAVAILABLE`，禁止静默裸跑。

## 能回答的问题

- `ctx.sandbox` 的 Definition / Provider / Consumer 各落在哪个包？`confine` 失败时能不能退回 host 裸跑？
- `SandboxMode` 三档各自罩什么？`danger-full-access` 为什么不调用 `confine`？
- `SANDBOX_UNAVAILABLE` 与 `FS_SANDBOX_DENIED` 分别表示「围栏没装上」还是「围栏拦住了写」？
- 升权在哪一层发生？grant 有没有 `allow-always`？缺 approval / 缺 agent / 非严格更宽会怎样？
- `writableRoots` 谁用？`read-only` 为什么是空数组？
- 沙箱为什么不挂在 `tools/pre-execute`？host 面与 agent-preset 面怎么切？

## 职责边界

本包 `@deepseek-ai/dsh-sandbox` 拥有：抽象服务 `SandboxProvider`（`super(ctx, 'sandbox')` 占 `ctx.sandbox`）、闭合词汇 `SandboxMode` / `ConfinedSandboxMode`、fail-closed 错误 `SandboxUnavailableError`（`code: SANDBOX_UNAVAILABLE`）、共用可写根 `writableRoots` / `canonicalPath`、以及两家 enforcing 工具共用的升权合同 `approveEscalation`（含 `WIDER_MODES`、`ESCALATION_TARGETS`、`validateEscalationArgs`、模型面 marker）。

本包**不**拥有：

- 平台 runner 选择链（bwrap / Landlock / Seatbelt / Windows ACL）与 probe —— [`subsys.execution.sandbox-local`](sandbox-local.md)（`subsys.execution.sandbox-local`）。
- `ctx.sandboxPolicy`、`sandbox/mode` fold、session override —— [`subsys.execution.sandbox-policy`](sandbox-policy.md)（`subsys.execution.sandbox-policy`）。
- `writeText` / `editText` 上的 in-process 围栏实现 —— [`subsys.execution.fs-sandbox`](fs-sandbox.md)（`subsys.execution.fs-sandbox`）。`SandboxedFileSystem` **不** `inject` `sandbox`，只读 `writableRoots` 与 `ctx.sandboxPolicy`。
- `bash -c` / pwsh argv 怎样交给 `confine` —— `subsys.execution.bash-local` / `subsys.execution.pwsh-local`。
- `approval/request` waterfall 与 `ask|never` —— [`subsys.interaction.approval`](../interaction/approval.md)（`subsys.interaction.approval`）。
- `tools/pre-execute` / `tools/execute` 管线 —— [`subsys.core.tools`](../core/tools.md)（`subsys.core.tools`）/ [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）。
- `read` / `write` / `edit` / `bash` / `pwsh` 字段表 —— `surface.tools.*`。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。`ctx.sandbox` / `ctx.sandboxPolicy` / `fs-sandbox` / `bash-sandbox` / `pwsh-sandbox` 是 **host 面**（进程级，session 出现之前就要 `inject`）。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。`dsh-web-app` 把模型可见 `tool-fs` / `tool-bash` 行 `disabled: true`，改由 preset 挂回；sandbox Provider **留在 host**。[E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:313]

这一缝只罩**文件副作用**。类型里没有 network / process-visibility 取值。[E: packages/sandbox/sandbox/src/index.ts:29] Codex 是 OS sandbox + 网络/进程面；DSH 的 `confine` 用 runner 包 argv，只为执行同一份文件政策。Pi 没有 in-core 执行沙箱。[I]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sandbox/sandbox/src/index.ts` | Definition：`SandboxProvider`、`SandboxMode`、`SANDBOX_UNAVAILABLE` |
| `packages/sandbox/sandbox/src/escalation.ts` | 升权合同：`approveEscalation` / `WIDER_MODES` / marker |
| `packages/sandbox/sandbox/src/roots.ts` | `writableRoots` / `canonicalPath`：fs 围栏与 Seatbelt 共用 |
| `packages/sandbox/sandbox/tests/vocabulary.spec.ts` | 钉死 `SandboxUnavailableError.code` |
| `packages/sandbox/sandbox/tests/escalation.spec.ts` | 钉死严格更宽、不提示、无 `allow-always` |
| `packages/sandbox/sandbox/tests/roots.spec.ts` | 钉死 `read-only` 空列表、`workspace-write` 去重 |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: sandbox` = `dsh-sandbox-local` |
| `packages/sandbox/sandbox-local/src/index.ts` | shipped Provider：无 usable runner 抛 `SANDBOX_UNAVAILABLE` |
| `packages/fs/fs-sandbox/src/index.ts` | 文件围栏 Consumer（词汇，不调 `confine`） |
| `packages/shell/bash-sandbox/src/index.ts` | POSIX 进程围栏 Consumer（调 `confine`） |
| `packages/shell/pwsh-sandbox/src/index.ts` | win32 进程围栏 Consumer（调 `confine`） |
| `packages/fs/tool-fs/src/sandbox.ts` | `write` / `edit` body 内升权 |
| `packages/shell/tool-bash/src/index.ts` | `bash` body 内升权 |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `SandboxMode` | `index.ts` | `'read-only' \| 'workspace-write' \| 'danger-full-access'`。闭合三元，没有第四档。[E: packages/sandbox/sandbox/src/index.ts:29] |
| `ConfinedSandboxMode` | `Exclude<SandboxMode, 'danger-full-access'>` | `confine` 入参只接受前两档。[E: packages/sandbox/sandbox/src/index.ts:32] |
| `SandboxExecutionPolicy` | `mode` + `workspaceRoot` + 可选 `sessionId` | 一次 capability call 的完整文件政策；`danger-full-access` 也可以带 root，方便调用方先 `resolve` 再选路。 |
| `SandboxPolicy` | 收窄 `mode: ConfinedSandboxMode` | `confine(argv, policy)` 的政策类型。[E: packages/sandbox/sandbox/src/index.ts:71] |
| `ConfinedArgv` | `argv` + `enforcement` + `denialSignatures` + `runnerFailureRules` | `confine` 的唯一返回：替换调用方自己的 argv。 |
| `SANDBOX_UNAVAILABLE` | `HarnessError.code` | 请求了 confined 模式但没有 usable backend。[E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox/tests/vocabulary.spec.ts:16] |
| `WIDER_MODES` | `escalation.ts` | `read-only` → 两档更宽；`workspace-write` → 只到 `danger-full-access`；满权无出口。[E: packages/sandbox/sandbox/src/escalation.ts:28] [E: packages/sandbox/sandbox/tests/escalation.spec.ts:24] |
| `ESCALATION_TARGETS` | schema 枚举 | `['workspace-write', 'danger-full-access']`。`read-only` 是地板，没有人升到它。[E: packages/sandbox/sandbox/src/escalation.ts:41] |
| `EscalationOutcome` | 四值闭合 | `'allowed-once' \| 'rejected' \| 'cancelled' \| 'unavailable'`。**没有** `allow-always`。[E: packages/sandbox/sandbox/src/escalation.ts:93] |
| `writableRoots` | `roots.ts` | `workspace-write` → canonical 去重的 workspace + `/tmp` + `os.tmpdir()`；其它 mode 返回 `[]`。[E: packages/sandbox/sandbox/src/roots.ts:53] [E: packages/sandbox/sandbox/src/roots.ts:54] |

## 控制流

1. **host 挂 Provider，Definition 包本身不是 bundle 行。** `dsh-base` 插入 `id: sandbox` = `@deepseek-ai/dsh-sandbox-local`，并列 `id: sandbox-policy`、`id: bash-sandbox`（win32 `disabled`）、`id: pwsh-sandbox`（非 win32 `disabled`）、`id: fs-sandbox`。[E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:170] [E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:178] [E: packages/bundle/base/cordis.patch.yml:184] [E: packages/bundle/base/cordis.patch.yml:443] shipped **没有**单独的 `fs-local` / `bash-local` 行占 `ctx.fs` / `ctx.shell`：sandbox 包装继承 local 并独占同一键。`@deepseek-ai/dsh-sandbox` 只导出抽象类与词汇，不进 `cordis.patch.yml`。

2. **`SandboxProvider`@packages/sandbox/sandbox/src/index.ts 占 `ctx.sandbox`。** 构造 `super(ctx, 'sandbox')`；Cordis `Service` 随即 `ctx.reflect.provide(name, self, …)`。[E: packages/sandbox/sandbox/src/index.ts:148] [E: packages/sandbox/sandbox/src/index.ts:161] [E: vendor/cordis/src/service.ts:57] 同一 realm 再挂第二个同名 service 会抛。`LocalSandboxProvider` 继承该类并仍登记为唯一的 `ctx.sandbox`。

3. **`confine`@packages/sandbox/sandbox/src/index.ts 必须返回 enforcing argv，或 fail-closed。** 签名是 `confine(argv, policy): ConfinedArgv`：`argv` 是即将 spawn 的精确数组（shell Consumer 传 `['bash', '-c', command]`），`policy` 类型是 `SandboxPolicy`（不含 `danger-full-access`）。[E: packages/sandbox/sandbox/src/index.ts:175] shipped Provider 要么在 runner 前缀后接 `'--'` 与原 argv，要么在无 usable runner 时抛 `SandboxUnavailableError`；返回值里没有「原样 argv」通道。[E: packages/sandbox/sandbox-local/src/index.ts:328] [E: packages/sandbox/sandbox-local/src/index.ts:494]

4. **不可用必须 fail-loud。** `SandboxUnavailableError` 把 `SANDBOX_UNAVAILABLE` 交给 `HarnessError.code`，文案点名 refused mode，并把 operator 出口写成「装 runner，或把 Consumer 切到 `danger-full-access`」。[E: packages/sandbox/sandbox/src/index.ts:140] [E: packages/sandbox/sandbox/tests/vocabulary.spec.ts:23] 测试还钉死执行期 runner 失败走同一 `code`，并附 `Runner failure:` 细节。[E: packages/sandbox/sandbox/tests/vocabulary.spec.ts:32] **禁止**把「没有 runner」写成静默退回 host 裸跑。

5. **`danger-full-access` 绕过 confinement，不调用 `confine`。** 类型上 `confine` 吃不到这一档。`SandboxBashExecutor.run` / `start` 在 `mode === 'danger-full-access'` 时直接 `super.run` / `super.start`。[E: packages/shell/bash-sandbox/src/index.ts:91] [E: packages/shell/bash-sandbox/src/index.ts:119] `SandboxPwshExecutor` 同样跳过。[E: packages/shell/pwsh-sandbox/src/index.ts:99] `SandboxedFileSystem.checkedTarget` 原样返回调用方 target。[E: packages/fs/fs-sandbox/src/index.ts:129] 这是显式满权，不是 runner 缺失时的降级。

6. **进程围栏 Consumer：`bash-sandbox` / `pwsh-sandbox` 调 `ctx.sandbox.confine`。** `SandboxBashExecutor` `static inject = ['subprocess', 'sandbox', 'sandboxPolicy']`。[E: packages/shell/bash-sandbox/src/index.ts:45] confined 路径把 `['bash', '-c', command]` 交给 `this.ctx.sandbox.confine`，再用返回 argv 走 local spawn。[E: packages/shell/bash-sandbox/src/index.ts:178] runner 没把命令跑起来：foreground 抛 `SandboxUnavailableError`；分类到的 runner-failure stderr 同样抛，而不是当成命令自己失败。[E: packages/shell/bash-sandbox/src/index.ts:103] [E: packages/shell/bash-sandbox/src/index.ts:111] background `start` 在 `onProcessDone` 上标 `runnerFailed`，命令仍视为没跑。`SandboxPwshExecutor` 对 `this.argv(spec)` 做同一件事。[E: packages/shell/pwsh-sandbox/src/index.ts:184] runner 方言选择留给 [`subsys.execution.sandbox-local`](sandbox-local.md)。

7. **文件围栏 Consumer：`fs-sandbox` 读词汇，不调 `confine`。** `SandboxedFileSystem` `static inject = ['sandboxPolicy']`，仍是唯一的 `ctx.fs`。[E: packages/fs/fs-sandbox/src/index.ts:60] 只在 `writeText` / `editText` 加围栏；读全部放过。`checkedTarget`：`read-only` 抛 `FS_SANDBOX_DENIED`；`workspace-write` 重新 `resolve` 再对 `writableRoots(policy)` 做 containment。[E: packages/fs/fs-sandbox/src/index.ts:131] [E: packages/fs/fs-sandbox/src/index.ts:138] 这是可信代码里对模型控制路径的 policy check，**不是** kernel 边界。

8. **`writableRoots`@packages/sandbox/sandbox/src/roots.ts 是 fs 与 bash 共用的可写根，避免两家漂移。** `read-only`（以及非 `workspace-write`）返回 `[]`；`workspace-write` 把 `workspaceRoot`、`/tmp`、`os.tmpdir()` 做 `canonicalPath` 再去重。[E: packages/sandbox/sandbox/src/roots.ts:53] [E: packages/sandbox/sandbox/src/roots.ts:54] 测试钉死空列表与去重。[E: packages/sandbox/sandbox/tests/roots.spec.ts:27] `checkedTarget` 遍历这份列表；Seatbelt profile 也从同一函数取 allow-list。[E: packages/fs/fs-sandbox/src/index.ts:138] [E: packages/sandbox/sandbox-local/src/profiles.ts:53]

9. **沙箱不挂在 `tools/pre-execute`。** `dsh-tool-fs` `inject = ['tools', 'fs', 'systemPrompt']`，`dsh-tool-bash` `inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`：两家都不 `inject` `sandbox`。[E: packages/fs/tool-fs/src/index.ts:22] [E: packages/shell/tool-bash/src/index.ts:31] `tools/pre-execute` 是另一条 waterfall（默认 `next()` 得到 `allow`；listener 不调用 `next()` 就不会 `shift`，链停在本层）——本缝没有 listener 挂在那里。强制发生在 `ToolDefinition.execute` **body 开头**：`write` 先 `FsSandboxController.resolvePolicy`，再 `waterfall('fs/write-intent')`，再 `ctx.fs.writeText`。[E: packages/fs/tool-fs/src/write.ts:107] [E: packages/fs/tool-fs/src/write.ts:111] [E: packages/fs/tool-fs/src/write.ts:114] `bash` 先 `approveBashEscalation`，再把带 `sandboxPolicy` 的 request 交给 `ctx.shell`。[E: packages/shell/tool-bash/src/index.ts:335] `fs/write-intent` 单槽由 `fs-observation-policy` 占住且**不**调用 `next()`，与本缝正交（卸掉观察插件，provider 回到无条件 write；围栏仍在 `checkedTarget`）。

10. **`approveEscalation`@packages/sandbox/sandbox/src/escalation.ts：必须严格更宽；grant 只有 `allowed-once`。** 顺序 fail-closed：先查 `WIDER_MODES[effectiveMode]`，非严格更宽立刻抛，**从不**问人。[E: packages/sandbox/sandbox/src/escalation.ts:162] [E: packages/sandbox/sandbox/tests/escalation.spec.ts:91] 缺 `approver`、缺 `agent` 各抛不同文案。[E: packages/sandbox/sandbox/src/escalation.ts:166] [E: packages/sandbox/sandbox/src/escalation.ts:169] 通过后才 `approver.request({ reason: escalate sandbox to … })`；唯一返回 granted mode 的分支是 `'allowed-once'`，`rejected` / `cancelled` / `unavailable` 全抛。[E: packages/sandbox/sandbox/src/escalation.ts:183] `tool-fs` 与 `tool-bash` 在 body 里把 `ctx.get('approval')` 收成 structural `EscalationApprover` 交下来，本包不依赖 approval / agent 类型。[E: packages/fs/tool-fs/src/sandbox.ts:97] [E: packages/fs/tool-fs/src/sandbox.ts:100]

11. **host 面 vs agent-preset 面。** Provider、`ctx.sandboxPolicy`、`fs-sandbox` / `bash-sandbox` / `pwsh-sandbox` 留在 host。默认 `dsh web` 组合里 `dsh-web-app` 关掉 `tool-bash` / `tool-fs`，preset 再按会话 `register`；升权字段是否出现，看当时 `ctx.fs.sandboxMode` / `ctx.shell.sandboxMode` 是否有值（confining backend 已挂）。[E: packages/fs/tool-fs/src/sandbox.ts:45] [E: packages/shell/tool-bash/src/index.ts:193] `ctx.fs` 与 `ctx.subprocess` 没有运行时耦合：只换 `ctx.fs` 不会把 `bash -c` 搬到远程。E2B 是成对换 fs+subprocess 的另一页。

## 设计动机

- **一份词汇，两家执行。** `write`/`edit` 的 in-process 围栏和 `bash`/`pwsh` 的 runner 围栏必须对模型说同一句话：`sandboxDenialMarker` / `escalationHintMarker` 与 `approveEscalation` 的 verbatim 文案都住在本包，测试按字面钉死，避免两家漂移。[E: packages/sandbox/sandbox/tests/escalation.spec.ts:47]
- **fail-loud 优于降级。** confined 模式一旦请求，没有 usable backend 就拒绝执行。静默 unconfined 会让「我以为在沙箱里」变成产品谎言；`SANDBOX_UNAVAILABLE` 让 `tool/result` 能按 `code` 区分「没围上」和「命令自己失败」。[E: packages/sandbox/sandbox/src/index.ts:124]
- **满权是显式档位，不是 fallback。** `danger-full-access` 从类型上排除出 `confine`，Consumer 自己走 unfenced 路径。错误文案把「切到满权」写成 operator 出口，而不是 Provider 偷偷代劳。[E: packages/sandbox/sandbox/tests/vocabulary.spec.ts:23]
- **升权一次性、可审计。** schema 枚举是闭合目标集；严格更宽是 **execution** 检查（effective mode 是 per-call 真相）。没有 `allow-always`，避免一次批准把整段会话焊成满权。
- **可写根一份派生。** `writableRoots` 让 fs fence 与 Seatbelt grant 不可能一个能写 `/tmp`、另一个不能。

## Gotcha

- **`SANDBOX_UNAVAILABLE` ≠ `FS_SANDBOX_DENIED`。** 前者是围栏没装上 / runner 没把命令跑起来（fail-loud）。后者是围栏在、写被政策拒绝；tool 层再映射成 `[sandbox: file access denied under …]` + 升权 hint。[E: packages/fs/fs-sandbox/src/index.ts:131] [E: packages/fs/tool-fs/src/sandbox.ts:129]
- **`danger-full-access` 不调用 `confine`。** 不要把「满权绕过」读成「confine 原样返回 argv」。类型已经把这一档剔出 `SandboxPolicy`。[E: packages/sandbox/sandbox/src/index.ts:71]
- **`fs-sandbox` 不是 `ctx.sandbox` 的 Consumer。** 它 `inject` 的是 `sandboxPolicy`。换掉 `dsh-sandbox-local` 不会自动改 `writeText` 围栏；换掉 `writableRoots` 的语义才会让两家一起动。
- **读不被本缝挡住。** `SandboxedFileSystem` 只 override 两个 mutation。`read-only` 仍可读任意 `ctx.fs` 能 resolve 的路径。
- **非严格更宽从不弹审批。** 从 `workspace-write` 再要 `workspace-write`、或从满权再要任何目标，都会在 `approver.request` 之前抛。[E: packages/sandbox/sandbox/tests/escalation.spec.ts:91]
- **`sandbox_permissions` 与 `justification` 必须成对且理由非空。** `validateEscalationArgs` 在 tool body 里、升权询问之前跑。[E: packages/fs/tool-fs/src/sandbox.ts:88]
- **本缝不是 Codex 级网络/进程隔离产品。** `SandboxMode` 只有文件副作用三档。不要把 `confine` 写成 Seatbelt/seccomp 的网络+进程可见性套件；那条选择链在 [`subsys.execution.sandbox-local`](sandbox-local.md)。
- **`ctx.sandboxPolicy.resolve` 的 fold 不在本页。** Consumer 拿到的是已经完全指定的 `SandboxExecutionPolicy`；谁赢（批准 mode / session override / 部署默认）见 [`subsys.execution.sandbox-policy`](sandbox-policy.md)。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.sandbox` | `@deepseek-ai/dsh-sandbox` 的 `SandboxProvider`；augmentation `Context.sandbox`；`confine` | **host** `dsh-base` 行 `id: sandbox` = `@deepseek-ai/dsh-sandbox-local`（`LocalSandboxProvider extends SandboxProvider`） | `SandboxBashExecutor` / `SandboxPwshExecutor`：`inject` 含 `sandbox`，对精确 argv 调 `confine` |
| 文件政策词汇 | 同包：`SandboxMode`、`writableRoots`、`SandboxUnavailableError` | 不 `provide` 新 `ctx` 键 | `SandboxedFileSystem.checkedTarget`；Seatbelt `seatbeltProfileArgs`；错误身份被 bash-sandbox 再抛 |
| 升权合同 | 同包函数 `approveEscalation`（不是 Cordis service） | 无 | **preset 面** `dsh-tool-fs` / `dsh-tool-bash` 的 `execute` body；`approver` 来自 host `ctx.approval` |
| `ctx.sandboxPolicy`（邻缝） | `@deepseek-ai/dsh-sandbox-policy` 的 `SandboxPolicyService` | **host** `id: sandbox-policy` | `fs-sandbox` / `bash-sandbox` `inject`；tool 层 `resolve({ session })`。fold 细节不在本页 |

`dsh-sandbox` 本身没有 `id:` 行。换世界 = 换 host 的 `id: sandbox` Provider，或换 `id: fs-sandbox` / `id: bash-sandbox` 包装；不要改 `tool-bash` / `tool-fs`。

## Sources

- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/sandbox/sandbox/src/roots.ts
- packages/sandbox/sandbox/tests/escalation.spec.ts
- packages/sandbox/sandbox/tests/roots.spec.ts
- packages/sandbox/sandbox/tests/vocabulary.spec.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/shell/pwsh-sandbox/src/index.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/fs/tool-fs/src/write.ts
- packages/shell/tool-bash/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/sandbox/sandbox-local/src/index.ts
- packages/sandbox/sandbox-local/src/profiles.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → preset` 与 host / preset 切面。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`；沙箱在 body 不在 pre-execute。
- [spine.trace-tool-approval](../../spine/trace-tool-approval.md)（`spine.trace-tool-approval`）：`allowed-once` 升权的一条真实路径。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 词表；`ctx.fs` 与 `ctx.subprocess` 无运行时耦合。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`ctx.sandboxPolicy.resolve` 与 `sandbox/mode` fold。
- [subsys.execution.sandbox-local](sandbox-local.md)（`subsys.execution.sandbox-local`）：bwrap / Landlock / Seatbelt / Windows ACL 选择链。
- [subsys.execution.fs-sandbox](fs-sandbox.md)（`subsys.execution.fs-sandbox`）：默认 `ctx.fs` 包装，只围 `writeText` / `editText`。
- [subsys.interaction.approval](../interaction/approval.md)（`subsys.interaction.approval`）：`approval/request` waterfall；本页只消费 `allowed-once`。
- [subsys.core.tools](../core/tools.md)（`subsys.core.tools`）：`tools/pre-execute` 必须 `next()`；本缝不是那条 listener。
- [surface.misc.security](../../surface/misc/security.md)（`surface.misc.security`）：审批与沙箱的产品面（planned）。
