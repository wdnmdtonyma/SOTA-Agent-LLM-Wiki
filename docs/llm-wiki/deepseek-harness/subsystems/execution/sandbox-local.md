---
id: subsys.execution.sandbox-local
title: sandbox-local 后端
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/sandbox/sandbox-local/src/index.ts
  - packages/sandbox/sandbox-local/src/profiles.ts
  - packages/sandbox/sandbox-local/tests/local.spec.ts
  - packages/sandbox/sandbox-local/tests/acl-grants.spec.ts
  - packages/sandbox/sandbox-local/package.json
  - packages/sandbox/sandbox-windows-acl/src/index.ts
  - packages/sandbox/sandbox-windows-acl/src/workspace-sid.ts
  - packages/sandbox/sandbox-windows-acl/src/grant.ts
  - packages/sandbox/sandbox-windows-acl/src/token.ts
  - packages/sandbox/sandbox-windows-acl/src/runner.ts
  - packages/sandbox/sandbox-windows-acl/src/win32-abi.ts
  - packages/sandbox/sandbox-windows-acl/src/path-boundary.ts
  - packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts
  - packages/sandbox/sandbox-windows-acl/package.json
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox/src/roots.ts
  - packages/sandbox/sandbox/tests/vocabulary.spec.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/shell/bash-sandbox/src/helpers.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - vendor/cordis/src/service.ts
  - native/README.md
symbols:
  - LocalSandboxProvider
  - selectRunner
  - PLATFORM_CHAINS
  - AclSandbox
  - AclWriteGrant
  - workspaceWriteSid
  - tempWriteSid
related:
  - spine.overview
  - spine.capability-seams
  - spine.tool-call-anatomy
  - subsys.execution.sandbox
  - subsys.execution.sandbox-policy
  - subsys.execution.fs-sandbox
  - subsys.execution.bash-local
  - subsys.execution.pwsh-local
  - subsys.composition.bundle-base
  - surface.misc.security
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-sandbox-local` 的 `LocalSandboxProvider` 是 **host 面默认 `ctx.sandbox` Provider**：按 `PLATFORM_CHAINS` 选 runner（Linux `bwrap` 再 `landlock`；macOS `seatbelt`/`sandbox-exec`；Windows `windows-acl`），把即将 spawn 的精确 argv 包成 enforcing 前缀。`selectRunner` 在平台无链或多候选全部 probe 失败时抛 `SandboxUnavailableError`（`code: SANDBOX_UNAVAILABLE`）；`confine` **从不**把原始 argv 交回去。这一层只执行 **per-call 文件副作用**政策，不是 Codex 级网络/进程隔离产品。

## 能回答的问题

- shipped `dsh web` 组合里谁独占 `ctx.sandbox`？`dsh-sandbox-windows-acl` 是不是另一条 bundle 行？
- `PLATFORM_CHAINS` 每个平台的候选是谁？何时 probe、何时不 probe？
- `selectRunner` 在什么情况下抛 `SANDBOX_UNAVAILABLE`？sole candidate 的 runner 二进制缺失时，`confine` 会不会先成功？
- `landlock` / `windows-acl` 何时报告 `enforcement: 'partial'`？`bwrap` / `seatbelt` 呢？
- Windows workspace SID 为什么站立、temp SID 为什么 per-session 随机？agentless 调用谁管私有 temp？
- 这一层罩网络或进程可见性吗？Seatbelt profile 是不是 Codex 那种 deny-default？

## 职责边界

本页拥有 **host 面** shipped Provider `@deepseek-ai/dsh-sandbox-local` 的 `LocalSandboxProvider`（默认导出，Cordis 当插件加载，独占 `ctx.sandbox`），以及它调用的平台方言：`bwrapProfileArgs` / `landlockProfileArgs` / `seatbeltProfileArgs`、`PLATFORM_CHAINS` / `selectRunner` / `STATIC_ENFORCEMENT`、Windows 档的 grant 生命周期（`AclWriteGrant` + `workspaceWriteSid` / `tempWriteSid`）和 runner argv 合同（`@deepseek-ai/dsh-sandbox-windows-acl` 的 `AclSandbox` / `runner.ts`）。[E: packages/sandbox/sandbox-local/package.json:2] [E: packages/sandbox/sandbox-local/src/index.ts:250] [E: packages/sandbox/sandbox-windows-acl/package.json:2]

本页**不**拥有：

- `SandboxProvider` 抽象、`SandboxMode` 三元、`SANDBOX_UNAVAILABLE` 类型定义、`writableRoots` 语义、`approveEscalation` — [`subsys.execution.sandbox`](sandbox.md)（`subsys.execution.sandbox`）。本页只实现 `confine` 并抛同一错误类。
- `ctx.sandboxPolicy.resolve`、`sandbox/mode` fold、部署默认 vs session override — [`subsys.execution.sandbox-policy`](sandbox-policy.md)（`subsys.execution.sandbox-policy`）。`confine` 把 `SandboxPolicy` 当已经完全指定的入参。
- `writeText` / `editText` 的 in-process 围栏 — [`subsys.execution.fs-sandbox`](fs-sandbox.md)（`subsys.execution.fs-sandbox`）。`SandboxedFileSystem` **不** `inject` `sandbox`，不调 `confine`。[E: packages/fs/fs-sandbox/src/index.ts:60]
- `bash -c` / pwsh argv 怎样交给 `confine`、前台/后台怎样把 runner 失败再抛成 `SANDBOX_UNAVAILABLE` — [`subsys.execution.bash-local`](bash-local.md) / [`subsys.execution.pwsh-local`](pwsh-local.md)。
- `tools/pre-execute` 与 body 内升权 — [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md) / [`subsys.execution.sandbox`](sandbox.md)。本包没有 waterfall listener。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。`ctx.sandbox` 是 **host 面**（进程级，session 出现之前就要 `inject`）。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。`dsh-web-app` 关掉模型可见 `tool-bash` / `tool-fs` 行，改由 preset 挂回；`id: sandbox` **留在 host**，web-app patch **没有** `sandbox` 键。[E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:170] [E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313]

`@deepseek-ai/dsh-sandbox-windows-acl` **不是**第二条 `ctx.sandbox` Provider，也不是 `cordis.patch.yml` 行：它是 `dsh-sandbox-local` 的依赖库（`AclWriteGrant` / SID 派生 / runner 入口）。[E: packages/sandbox/sandbox-local/package.json:42]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sandbox/sandbox-local/src/index.ts` | `LocalSandboxProvider`：`confine` / `selectRunner` / `PLATFORM_CHAINS` / Windows grant 缓存 |
| `packages/sandbox/sandbox-local/src/profiles.ts` | 三套 POSIX 方言：bwrap mounts、Landlock grants、Seatbelt SBPL |
| `packages/sandbox/sandbox-local/tests/local.spec.ts` | 钉死方言、chain、sole-candidate 不 probe、fail-closed、landlock partial |
| `packages/sandbox/sandbox-local/tests/acl-grants.spec.ts` | 钉死 workspace 站立 ACE、per-session 随机 temp、agentless 不物化 |
| `packages/sandbox/sandbox-windows-acl/src/index.ts` | `AclSandbox`：restricted token + spawn；失败从不裸跑 |
| `packages/sandbox/sandbox-windows-acl/src/workspace-sid.ts` | `workspaceWriteSid` / `tempWriteSid` |
| `packages/sandbox/sandbox-windows-acl/src/grant.ts` | `AclWriteGrant`：standing vs revocable ACE |
| `packages/sandbox/sandbox-windows-acl/src/token.ts` | `createRestrictedToken`：`WRITE_RESTRICTED` + Everyone keep-alive |
| `packages/sandbox/sandbox-windows-acl/src/runner.ts` | argv 前缀进程：`windows-acl-run:` + exit 127 |
| `packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts` | win32 链：sole candidate 不 probe、`enforcement: 'partial'` |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: sandbox` = `dsh-sandbox-local` |
| `native/README.md` | landlock-run 工作区线索（**不是** `[E]`） |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `PLATFORM_CHAINS` | `sandbox-local/src/index.ts` | `linux: ['bwrap', 'landlock']`；`darwin: ['seatbelt']`；`win32: ['windows-acl']`。先按平台取链，再决定是否 probe。[E: packages/sandbox/sandbox-local/src/index.ts:160] [E: packages/sandbox/sandbox-local/src/index.ts:161] [E: packages/sandbox/sandbox-local/src/index.ts:165] |
| `STATIC_ENFORCEMENT` | 同文件 | 唯一候选、不 probe 时的宣称：`bwrap`/`landlock`/`seatbelt` = `'full'`；`windows-acl` = `'partial'`。产品 Linux 链有两档，`landlock` 的 STATIC 值今天走不到。[E: packages/sandbox/sandbox-local/src/index.ts:178] [E: packages/sandbox/sandbox-local/src/index.ts:179] [E: packages/sandbox/sandbox-local/src/index.ts:180] [E: packages/sandbox/sandbox-local/src/index.ts:186] |
| `SelectedRunner` | 同文件 | `{ runner, enforcement }`；缓存还可以是 `'unavailable'`。 |
| `Config.runnerCommand` | 同文件 | 非空则跳过整条链与 probe，断言 `enforcement: 'full'`，profile 用 **bwrap 形**。[E: packages/sandbox/sandbox-local/src/index.ts:319] [E: packages/sandbox/sandbox-local/src/index.ts:320] |
| `Config.runnerFailureSignatures` | 同文件 | 与 `runnerCommand` 成对：有命令必须非空单行；无命令不得带签名。[E: packages/sandbox/sandbox-local/src/index.ts:284] [E: packages/sandbox/sandbox-local/src/index.ts:287] |
| `Config.probeTimeoutMs` | 同文件 | 默认 `5000`。`0` 在构造期拒绝：Node 把 `spawnSync({ timeout: 0 })` 当成无超时。[E: packages/sandbox/sandbox-local/src/index.ts:255] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:329] |
| `DENIAL_SIGNATURES` | 同文件 | 本 runner 的文件拒绝方言（bwrap `read-only file system`；landlock `permission denied`；seatbelt `operation not permitted`；windows-acl 三条 access-denied）。[E: packages/sandbox/sandbox-local/src/index.ts:206] [E: packages/sandbox/sandbox-local/src/index.ts:207] [E: packages/sandbox/sandbox-local/src/index.ts:208] [E: packages/sandbox/sandbox-local/src/index.ts:211] |
| `RUNNER_FAILURE_RULES` | 同文件 | runner 没把命令跑起来的证据。windows-acl 门在 exit `127` + `windows-acl-run: `；landlock 门在 launcher 失败码。[E: packages/sandbox/sandbox-local/src/index.ts:232] [E: packages/sandbox/sandbox-local/src/index.ts:233] [E: packages/sandbox/sandbox-local/src/index.ts:239] |
| `workspaceWriteSid` | `workspace-sid.ts` | 从 canonical workspace 路径 SHA-256 派生 `S-1-4-x-y`。同一路径跨会话共用。[E: packages/sandbox/sandbox-windows-acl/src/workspace-sid.ts:39] |
| `tempWriteSid` | 同文件 | 从随机 temp 路径派生 `S-1-4-x-y-1`（第三段 domain-separate）。[E: packages/sandbox/sandbox-windows-acl/src/workspace-sid.ts:53] |
| `AclWriteGrant.add(..., standing)` | `grant.ts` | `standing: true` 的 ACE 在 `dispose` 时不撤销（只扫 `revocablePaths`）；temp 默认 `standing = false`。[E: packages/sandbox/sandbox-windows-acl/src/grant.ts:74] [E: packages/sandbox/sandbox-windows-acl/src/grant.ts:87] |

## 控制流

1. **host 挂本 Provider，Definition 包本身不是 bundle 行。** `dsh-base` 插入 `id: sandbox` = `@deepseek-ai/dsh-sandbox-local`，旁边是 `id: sandbox-policy`、`id: bash-sandbox`（win32 `disabled`）、`id: pwsh-sandbox`（非 win32 `disabled`）、`id: fs-sandbox`。[E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:170] [E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:178] [E: packages/bundle/base/cordis.patch.yml:180] [E: packages/bundle/base/cordis.patch.yml:184] [E: packages/bundle/base/cordis.patch.yml:186] [E: packages/bundle/base/cordis.patch.yml:443] `@deepseek-ai/dsh-sandbox` 只导出抽象类与词汇。`dsh-sandbox-windows-acl` 不进 patch。

2. **`LocalSandboxProvider`@packages/sandbox/sandbox-local/src/index.ts 占 `ctx.sandbox`。** 构造 `super(ctx)` → `SandboxProvider` `super(ctx, 'sandbox')` → Cordis `Service` `ctx.reflect.provide(name, self, …)`。[E: packages/sandbox/sandbox-local/src/index.ts:277] [E: packages/sandbox/sandbox/src/index.ts:161] [E: vendor/cordis/src/service.ts:57] 无 `static inject`。同一 realm 再挂第二个名为 `'sandbox'` 的 Service 会抛。构造还 `ctx.effect` 登记 dispose 时 `revokeAclGrants`（Windows temp ACE / 私有目录）。[E: packages/sandbox/sandbox-local/src/index.ts:300] [E: packages/sandbox/sandbox-local/src/index.ts:301]

3. **`confine`@packages/sandbox/sandbox-local/src/index.ts 只返回包装 argv，或抛。** 有 `runnerCommand`：`[...runnerCommand, ...bwrapProfileArgs(policy), '--', ...argv]`，`enforcement: 'full'`，**不**走链、**不** probe。[E: packages/sandbox/sandbox-local/src/index.ts:317] [E: packages/sandbox/sandbox-local/src/index.ts:319] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:127] 否则 `selectRunner` + `runnerArgv`，同样在 runner 前缀后接 `'--'` 与调用方 argv。[E: packages/sandbox/sandbox-local/src/index.ts:325] [E: packages/sandbox/sandbox-local/src/index.ts:328] 返回值类型是 `ConfinedArgv`（`argv` + `enforcement` + `denialSignatures` + `runnerFailureRules`）；字段里没有「原样 argv」通道。[E: packages/sandbox/sandbox/src/index.ts:97]

4. **`selectRunner` 在无可用 runner 时 fail-loud。** 第一次调用走 `chainVerdict()` 并缓存；缓存是 `'unavailable'` 就 `throw new SandboxUnavailableError(mode)`。[E: packages/sandbox/sandbox-local/src/index.ts:493] [E: packages/sandbox/sandbox-local/src/index.ts:494] `SandboxUnavailableError` 把 `SANDBOX_UNAVAILABLE` 交给 `HarnessError.code`。[E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox/src/index.ts:140] 平台不在表里（测试用 `freebsd`）时链为空，**一个 probe 都不跑**，命令不执行。[E: packages/sandbox/sandbox-local/src/index.ts:502] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:216] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:217] Linux 两档都 probe 失败，同样抛并缓存 unavailable。[E: packages/sandbox/sandbox-local/tests/local.spec.ts:239] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:241]

5. **多候选才 probe；sole candidate 不 probe。** `chainVerdict`：`rest.length === 0` 直接 `{ runner: first, enforcement: STATIC_ENFORCEMENT[first] }`。[E: packages/sandbox/sandbox-local/src/index.ts:504] 产品 `darwin` / `win32` 各只有一档。darwin 测试钉死 `probeSeatbelt` **不被调用**，仍包装 `sandbox-exec` + `enforcement: 'full'`。[E: packages/sandbox/sandbox-local/tests/local.spec.ts:201] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:204] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:208] win32 测试钉死 `probeWindowsAcl` **不被调用**，`enforcement: 'partial'`。[E: packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts:44] [E: packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts:48] Linux 有两档：先 probe `bwrap`，通过则 `full` 且不碰 landlock；bwrap 失败再 probe landlock。[E: packages/sandbox/sandbox-local/src/index.ts:505] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:173] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:192] 裁决缓存到 Provider 生命周期，第二次 `confine` 不再 probe。[E: packages/sandbox/sandbox-local/tests/local.spec.ts:232]

6. **sole candidate 的执行期拒绝仍 fail-closed。** 不 probe 只表示「没有另一档可仲裁」，**不**表示二进制一定在。`confine` 此时仍返回包装 argv。Consumer（`SandboxBashExecutor` / `SandboxPwshExecutor`）spawn 后用 `isRunnerSpawnFailure` 或 `classifyRunnerFailure` 认出 runner 没把命令跑起来，再抛 `SandboxUnavailableError`。[E: packages/shell/bash-sandbox/src/index.ts:102] [E: packages/shell/bash-sandbox/src/index.ts:109] [E: packages/shell/bash-sandbox/src/index.ts:111] [E: packages/shell/bash-sandbox/src/helpers.ts:39] [E: packages/shell/bash-sandbox/src/helpers.ts:81] windows-acl runner 自己约定：任何 runner 侧失败打印 `windows-acl-run: <detail>` 并 `exit 127`。[E: packages/sandbox/sandbox-windows-acl/src/runner.ts:61] [E: packages/sandbox/sandbox-windows-acl/src/runner.ts:224]

7. **probe 通过后的 enforcement。** `probeRunner`：`bwrap` / `seatbelt` 通过 → `'full'`；`windows-acl` 通过 → 永远 `'partial'`；`landlock` 把 launcher `--probe` 的报告原样收成 `'full' | 'partial' | 'unusable'`。[E: packages/sandbox/sandbox-local/src/index.ts:522] [E: packages/sandbox/sandbox-local/src/index.ts:526] [E: packages/sandbox/sandbox-local/src/index.ts:530] [E: packages/sandbox/sandbox-local/src/index.ts:535] 测试：假 launcher 打 `landlock: fully enforced` → `full`；打 `landlock: partially enforced (older ABI)` → `partial`；非零退出 → `SANDBOX_UNAVAILABLE`。[E: packages/sandbox/sandbox-local/tests/local.spec.ts:308] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:314] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:322] `windows-acl` 的 STATIC 与 probe 通过值都是 `'partial'`：`WRITE_RESTRICTED` 必须把 Everyone 留在 restricting list，且 NTFS hard link 按文件对象而非路径鉴权。[E: packages/sandbox/sandbox-local/src/index.ts:186] [E: packages/sandbox/sandbox-windows-acl/src/win32-abi.ts:88] [E: packages/sandbox/sandbox-windows-acl/src/token.ts:211] [I]

8. **三套 POSIX profile 只编码文件政策。** `bwrapProfileArgs`：整树 `--ro-bind / /` + `--dev`/`--proc`/`--die-with-parent`；`workspace-write` 再 `--tmpfs /tmp` 并 `--bind` workspace。[E: packages/sandbox/sandbox-local/src/profiles.ts:17] [E: packages/sandbox/sandbox-local/src/profiles.ts:19] [E: packages/sandbox/sandbox-local/src/profiles.ts:20] `landlockProfileArgs`：`--ro /` + `--rw /dev/null`；`workspace-write` 再 `--rw /tmp` 与 workspace（**不是**整棵 `/dev`）。[E: packages/sandbox/sandbox-local/src/profiles.ts:31] [E: packages/sandbox/sandbox-local/src/profiles.ts:33] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:79] `seatbeltProfileArgs`：`(version 1) (allow default) (deny file-write*)`，再放行 `/dev/null` literal；`workspace-write` 的可写根来自共用 `writableRoots`（canonical 去重的 workspace + `/tmp` + `os.tmpdir()`）。[E: packages/sandbox/sandbox-local/src/profiles.ts:52] [E: packages/sandbox/sandbox-local/src/profiles.ts:53] [E: packages/sandbox/sandbox/src/roots.ts:54] bwrap / landlock **不**调用 `writableRoots`，各自拼 temp。[I]

9. **Windows：workspace SID 站立，temp SID per-session 随机。** `windowsAclRunnerArgv`：没有 `sessionId` **或** `read-only` → 只传 `--workspace` / `--temp`（ambient `os.tmpdir()`）/ `--mode`，**不**传 SID，也**不**在 Provider 里 `AclWriteGrant.create`。[E: packages/sandbox/sandbox-local/src/index.ts:360] [E: packages/sandbox/sandbox-local/src/index.ts:365] [E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:310] 带 `sessionId` 的 `workspace-write`：`materializeAclGrant` 用 `workspaceWriteSid(workspaceRoot)` 给 workspace 建 **standing** ACE（`grant.add(workspaceRoot, true)`），再用 `mkdtempSync(join(tmpdir(), 'dsh-'))` + `tempWriteSid` 给该 session/workspace 对建可撤销 ACE；argv 带 `--write-sid` 与 `--temp-write-sid`。[E: packages/sandbox/sandbox-local/src/index.ts:394] [E: packages/sandbox/sandbox-local/src/index.ts:398] [E: packages/sandbox/sandbox-local/src/index.ts:415] [E: packages/sandbox/sandbox-local/src/index.ts:416] [E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:124] [E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:125] 同一对再次 `confine` 复用 argv；父子 session 或换 workspace 拿到不同 temp 路径/SID。[E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:135] [E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:214] 新 Provider 即使 session id 相同也换新 temp，避免 crash 残渣碰撞。[E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:192] temp 父目录若落在 workspace 内，在任何 ACE 之前抛。[E: packages/sandbox/sandbox-local/src/index.ts:393] [E: packages/sandbox/sandbox-windows-acl/src/path-boundary.ts:24] [E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:252]

10. **Windows runner 进程：seam 已物化则不再管 DACL。** 产品 argv 是 `[node, runner, '--workspace', …, '--temp', …, '--mode', …, 可选 SID 对, '--', <argv>]`。[E: packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts:36] [E: packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts:41] 成对 SID 出现时 `manageDacls: false`，runner 既不 grant 也不 revoke；缺 SID 的 agentless `workspace-write` 则在 `--temp` 根下 `mkdtempSync` 自己的私有子目录，退出后删掉。[E: packages/sandbox/sandbox-windows-acl/src/runner.ts:167] [E: packages/sandbox/sandbox-windows-acl/src/runner.ts:156] `AclSandbox.spawn` 在 token 未 init 时抛，子进程**从不**以未限制 token 启动。[E: packages/sandbox/sandbox-windows-acl/src/index.ts:354] restricting list：`read-only` = `[logon, Everyone]`；`workspace-write` = `[logon, Everyone, ...writeSids]`。[E: packages/sandbox/sandbox-windows-acl/src/token.ts:204] [E: packages/sandbox/sandbox-windows-acl/src/token.ts:207] 标志位含 `WRITE_RESTRICTED`（只交叉**写**访问）。[E: packages/sandbox/sandbox-windows-acl/src/token.ts:211] [E: packages/sandbox/sandbox-windows-acl/src/win32-abi.ts:88]

11. **Consumer 调 `confine`；本包没有 waterfall。** `SandboxBashExecutor` `static inject = ['subprocess', 'sandbox', 'sandboxPolicy']`，把 `['bash', '-c', command]` 交给 `this.ctx.sandbox.confine`。[E: packages/shell/bash-sandbox/src/index.ts:45] [E: packages/shell/bash-sandbox/src/index.ts:178] `SandboxPwshExecutor` 同样 `inject`，对 `this.argv(spec)` 做同一件事。[E: packages/shell/pwsh-sandbox/src/index.ts:53] [E: packages/shell/pwsh-sandbox/src/index.ts:184] `danger-full-access` 在 Consumer 里绕过，类型上进不了 `SandboxPolicy`，本 Provider 看不见这一档。[E: packages/shell/bash-sandbox/src/index.ts:91] [E: packages/sandbox/sandbox/src/index.ts:71] `SandboxedFileSystem` 只 `inject` `sandboxPolicy`。[E: packages/fs/fs-sandbox/src/index.ts:60] `dsh-tool-fs` / `dsh-tool-bash` 不 `inject` `sandbox`。`approveEscalation` 与 `sandbox/mode` fold 的权威不在本页。

12. **host 面 vs agent-preset 面。** Provider、Windows grant 缓存、`ctx.sandboxPolicy`、`bash-sandbox` / `pwsh-sandbox` / `fs-sandbox` 留在 host。preset 只 `register` 模型可见工具。`ctx.fs` 与 `ctx.subprocess` 没有运行时耦合：只换 `ctx.fs` 不会改本页选出的 runner。本包也**不是** `tools/pre-execute` listener。

## 设计动机

- **fail-loud 优于静默裸跑。** confined 模式一旦请求，没有 usable runner 就拒绝执行。返回原始 argv 会让「我以为在沙箱里」变成产品谎言；`SANDBOX_UNAVAILABLE` 让 `tool/result` 能按 `code` 区分「没围上」和「命令自己失败」。[E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox-local/src/index.ts:494]
- **probe 只仲裁，不给唯一候选做安慰体检。** Linux 有 bwrap 与 landlock 两档，才需要一次功能 probe。darwin / win32 只有一档：再 probe 也改变不了选择，缺失二进制的真相挪到执行期（`sandbox-exec:` / `windows-acl-run:`）。[E: packages/sandbox/sandbox-local/src/index.ts:504] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:208]
- **只罩文件副作用。** `SandboxMode` 没有 network / process-visibility 取值。[E: packages/sandbox/sandbox/src/index.ts:29] Seatbelt 档案是 `(allow default)` 再 `deny file-write*`，不是 Codex 那种 deny-default + 网络/mach 套件。[E: packages/sandbox/sandbox-local/src/profiles.ts:52] Windows `WRITE_RESTRICTED` 只交叉写访问。[E: packages/sandbox/sandbox-windows-acl/src/win32-abi.ts:88]
- **方言按 runner 带在 `ConfinedArgv` 上，不搞跨后端并集。** Consumer 用本 wrap 的 `denialSignatures` / `runnerFailureRules` 分类；并集会把一个后端从不产生的字串当成拒绝。[E: packages/sandbox/sandbox/src/index.ts:108] [E: packages/sandbox/sandbox-local/src/index.ts:330]
- **Windows grant 拆成「每工作区站立」+「每会话随机 temp」。** 站立 ACE 让后续 provision 走 exact-ACE skip；随机 temp SID 阻止共享 workspace 的兄弟会话走进彼此的 temp 树。agentless 调用把私有子目录生命周期交给 runner，避免 Provider 在没有 session 键时伪造身份。[E: packages/sandbox/sandbox-local/src/index.ts:398] [E: packages/sandbox/sandbox-windows-acl/src/workspace-sid.ts:53]

`native/README.md` 只说明 `landlock-run/` 与 harness 同仓发布；launcher CLI / probe 文案以 `dsh-sandbox-local` 测试与 `@deepseek-ai/node-addon-landlock-run` 入口为准，不把该 README 标成 `[E]`。

## Gotcha

- **`selectRunner` 抛错 ≠ 「二进制不在 PATH」。** 空链 / 多候选全挂才在 wrap 期抛。sole candidate 缺失时 `confine` 先成功，失败发生在 spawn / runner stderr。[E: packages/sandbox/sandbox-local/src/index.ts:504] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:204]
- **`STATIC_ENFORCEMENT.landlock === 'full'` 会被产品路径错过。** Linux 必 probe；老 ABI 的 probe 报告是 `'partial'`。[E: packages/sandbox/sandbox-local/src/index.ts:179] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:314]
- **`windows-acl` 即使「选上了」也是 `partial`。** 不要把 win32 链读成 full confinement。[E: packages/sandbox/sandbox-local/src/index.ts:186] [E: packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts:44]
- **Seatbelt 不是 Codex sandbox-exec 产品。** `(allow default)` 放行走文件写以外的一切，包括网络与进程可见性。[E: packages/sandbox/sandbox-local/src/profiles.ts:52]
- **`runnerCommand` 跳过平台链，却仍用 bwrap 形 profile。** 操作员必须自备能吃 `--ro-bind` / `--bind` 的 runner，并提供 `runnerFailureSignatures`。[E: packages/sandbox/sandbox-local/src/index.ts:319] [E: packages/sandbox/sandbox-local/tests/local.spec.ts:141]
- **`fs-sandbox` 不是本缝 Consumer。** 换掉 `dsh-sandbox-local` 不会改 `writeText` 围栏。Seatbelt 与 fs fence 共享的是 `writableRoots`，不是 `confine`。[E: packages/fs/fs-sandbox/src/index.ts:60] [E: packages/sandbox/sandbox-local/src/profiles.ts:53]
- **`danger-full-access` 进不了本页。** Consumer 直接 `super.run` / 原样返回 target；不要把「满权」读成「`confine` 返回原始 argv」。[E: packages/sandbox/sandbox/src/index.ts:71]
- **workspace 不能包含 ambient temp。** `assertTempRootOutsideWorkspace` 在物化 ACE 之前拒绝，否则私有 temp 会继承站立 workspace 能力。[E: packages/sandbox/sandbox-windows-acl/src/path-boundary.ts:24]
- **Provider dispose 的 grant 清理失败只 `logger.warn`，不中断 cordis teardown。** 站立 workspace ACE 本就不撤。[E: packages/sandbox/sandbox-local/src/index.ts:474] [E: packages/sandbox/sandbox-local/tests/acl-grants.spec.ts:331]
- **本页不解释 `sandbox/mode` 谁赢，也不解释升权 grant。** 那些分别在 [`subsys.execution.sandbox-policy`](sandbox-policy.md) 与 [`subsys.execution.sandbox`](sandbox.md)。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.sandbox` | `@deepseek-ai/dsh-sandbox` 的 `SandboxProvider`；augmentation `Context.sandbox`；`confine(argv, policy): ConfinedArgv` | **本页 / host** `dsh-base` 行 `id: sandbox` = `@deepseek-ai/dsh-sandbox-local`（`LocalSandboxProvider extends SandboxProvider`）。`dsh-sandbox-windows-acl` 是其库，不 `provide` 新键 | `SandboxBashExecutor` / `SandboxPwshExecutor`：`inject` 含 `sandbox`，对精确 argv 调 `confine` |
| 平台 runner 方言 | 无独立 `ctx` 键。`PLATFORM_CHAINS` / `selectRunner` / profile builders 住在 Provider 包 | 同 `LocalSandboxProvider`；`runnerCommand` 是操作员覆写，不是换包 | Consumer 只看返回的 `argv` + `enforcement` + 两套签名。分类逻辑在 bash-sandbox helpers |
| Windows ACL 力学 | 无 Cordis service。`AclSandbox` / `AclWriteGrant` / SID 派生 | 被 `windowsAclRunnerArgv` + runner 进程调用 | 同一对 shell Consumer；agentless 路径由 runner 自管 temp |
| 文件政策词汇（邻） | `SandboxMode` / `writableRoots` / `SandboxUnavailableError` 在 Definition 包 | 本 Provider 抛 `SandboxUnavailableError`；Seatbelt 读 `writableRoots` | `SandboxedFileSystem.checkedTarget`（**不**调 `confine`） |
| `ctx.sandboxPolicy`（邻） | `@deepseek-ai/dsh-sandbox-policy` | **host** `id: sandbox-policy` | `fs-sandbox` / `bash-sandbox` `inject`。fold 不在本页 |

换世界 = 换 host 的 `id: sandbox` 行，或设 `runnerCommand`。不要改 `tool-bash` / `tool-fs`。不要在 preset 里再 `provide` 一份 `ctx.sandbox`（会与 host 撞名）。

## Sources

- packages/sandbox/sandbox-local/src/index.ts
- packages/sandbox/sandbox-local/src/profiles.ts
- packages/sandbox/sandbox-local/tests/local.spec.ts
- packages/sandbox/sandbox-local/tests/acl-grants.spec.ts
- packages/sandbox/sandbox-local/package.json
- packages/sandbox/sandbox-windows-acl/src/index.ts
- packages/sandbox/sandbox-windows-acl/src/workspace-sid.ts
- packages/sandbox/sandbox-windows-acl/src/grant.ts
- packages/sandbox/sandbox-windows-acl/src/token.ts
- packages/sandbox/sandbox-windows-acl/src/runner.ts
- packages/sandbox/sandbox-windows-acl/src/win32-abi.ts
- packages/sandbox/sandbox-windows-acl/src/path-boundary.ts
- packages/sandbox/sandbox-windows-acl/tests/provider-chain.spec.ts
- packages/sandbox/sandbox-windows-acl/package.json
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox/src/roots.ts
- packages/sandbox/sandbox/tests/vocabulary.spec.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/shell/bash-sandbox/src/helpers.ts
- packages/shell/pwsh-sandbox/src/index.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- vendor/cordis/src/service.ts
- native/README.md

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer；`ctx.fs` 与 `ctx.subprocess` 无运行时耦合。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：沙箱在 tool body，不在 `tools/pre-execute`。
- [subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）：`confine` 合同、`SandboxMode`、`approveEscalation`、`SANDBOX_UNAVAILABLE` 定义。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`ctx.sandboxPolicy.resolve` 与 `sandbox/mode` fold。
- [subsys.execution.fs-sandbox](fs-sandbox.md)（`subsys.execution.fs-sandbox`）：默认 `ctx.fs` 包装，只围 `writeText` / `editText`，不调 `confine`。
- [subsys.execution.bash-local](bash-local.md)（`subsys.execution.bash-local`）：POSIX Consumer：对 `['bash', '-c', command]` 调 `confine`。
- [subsys.execution.pwsh-local](pwsh-local.md)（`subsys.execution.pwsh-local`）：win32 Consumer：对 pwsh argv 调 `confine`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host insert 真树，`id: sandbox` 行。
- [surface.misc.security](../../surface/misc/security.md)（`surface.misc.security`）：审批与沙箱的产品面（planned）。
