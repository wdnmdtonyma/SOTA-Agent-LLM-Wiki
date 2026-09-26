---
id: subsys.execution.ssh
title: SSH 远程世界
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/ssh/ssh/src/index.ts
  - packages/ssh/ssh/src/protocol.ts
  - packages/ssh/ssh/package.json
  - packages/ssh/ssh/tests/live.e2e.ts
  - packages/ssh/fs-ssh/src/index.ts
  - packages/ssh/fs-ssh/package.json
  - packages/ssh/subprocess-ssh/src/index.ts
  - packages/ssh/subprocess-ssh/package.json
  - packages/ssh/sandbox-ssh/src/index.ts
  - packages/ssh/sandbox-ssh/package.json
  - packages/fs/fs/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - vendor/cordis/src/service.ts
symbols:
  - ctx.ssh
  - SshConnection
  - SshFileSystem
  - SshSubprocessRuntime
  - SshSandboxProvider
  - SSH_PROTOCOL_VERSION
related:
  - subsys.execution.e2b
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs
  - subsys.execution.subprocess
  - subsys.execution.terminal
  - subsys.execution.lsp
  - subsys.execution.sandbox-policy
  - subsys.execution.sandbox
evidence: explicit
status: verified
updated: 477b4f4205
---

> SSH 是 **opt-in 远程 one-world**，不是 shipped 默认路径。`SshConnection` 占 `ctx.ssh`，打开**一条**不重连的 OpenSSH master + 远端 POSIX helper；`SshFileSystem` / `SshSubprocessRuntime` / `SshSandboxProvider` 都 `inject = ['ssh']`（fs 另加 `sandboxPolicy`），分别独占 `ctx.fs`、`ctx.subprocess`、`ctx.sandbox`。成对替换才把 Bash / PTY / `glob`/`grep` / LSP / PTC spawn 与 `read`/`write` 放进同一远程世界；只换 `ctx.fs` 不会带走 `bash -c`。旧 E2B 包已删除，见退役页 [subsys.execution.e2b](e2b.md)。

## 能回答的问题

- `ctx.ssh` 是谁 `provide` 的？`fs-ssh` / `subprocess-ssh` / `sandbox-ssh` 怎样等到同一份 helper？
- 默认 `dsh web` / `dsh --profile sdk|sdk-minimal|acp|headless` / shipped preset 会不会挂 `dsh-ssh`？
- 为什么必须 **成对** 换 `ctx.fs` + `ctx.subprocess`（以及 SSH 路径上的 `ctx.sandbox`）？只换 `fs` 时 Bash / PTY / `glob` 还在哪？
- live e2e 怎样证明同沙箱交叉可见？缺 `DSH_SSH_TEST_CONFIG` 时测什么？
- helper digest / bootstrap digest 对不上会怎样？客户端必须是哪类 OS？

## 职责边界

四个包一起构成这条 opt-in 路径：

- `@deepseek-ai/dsh-ssh` 的 `SshConnection`：**同一类**既是 `ctx.ssh` 的 Definition（augmentation + `super(ctx, 'ssh')`）也是 Provider。[E: packages/ssh/ssh/package.json:2] [E: packages/ssh/ssh/src/index.ts:43] [E: packages/ssh/ssh/src/index.ts:74]
- `@deepseek-ai/dsh-fs-ssh` 的 `SshFileSystem`：`ctx.fs` 的远程 Provider，`inject = ['ssh', 'sandboxPolicy']`。[E: packages/ssh/fs-ssh/package.json:2] [E: packages/ssh/fs-ssh/src/index.ts:21]
- `@deepseek-ai/dsh-subprocess-ssh` 的 `SshSubprocessRuntime`：`ctx.subprocess` 的远程 Provider，`inject = ['ssh']`。[E: packages/ssh/subprocess-ssh/package.json:2] [E: packages/ssh/subprocess-ssh/src/index.ts:230]
- `@deepseek-ai/dsh-sandbox-ssh` 的 `SshSandboxProvider`：`ctx.sandbox` 的远程 Provider，`inject = ['ssh']`。[E: packages/ssh/sandbox-ssh/package.json:2] [E: packages/ssh/sandbox-ssh/src/index.ts:11]

明确不拥有：

- `FileSystem` / `SubprocessRuntime` / `SandboxProvider` 抽象与默认 local Provider：[subsys.execution.fs](fs.md)、[subsys.execution.subprocess](subprocess.md)、[subsys.execution.sandbox](sandbox.md)。
- `bash -c` resolve / timeout / 输出预算：[subsys.execution.shell](shell.md)。`LocalBashExecutor` 只 `inject` `subprocess`，世界跟着 `ctx.subprocess` 走。[E: packages/shell/bash-local/src/index.ts:98]
- PTY 会话策略 / `terminal_*` 字段：[subsys.execution.terminal](terminal.md)。`terminal-bash` 的 `inject` 含 `subprocess`，不含 `fs`。[E: packages/terminal/terminal-bash/src/index.ts:27]
- LSP 成帧与 query：[subsys.execution.lsp](lsp.md)。`lsp-stdio` 同时 `inject` `fs` + `subprocess`。[E: packages/lsp/lsp-stdio/src/index.ts:47]
- `SandboxMode` fold / `sandbox/mode`：[subsys.execution.sandbox-policy](sandbox-policy.md)。本页只写远程 `confine` 把 argv 包装请求打到 helper。
- 模型可见 tool 字段表（`read` / `bash` / `terminal_*` / `lsp`）。

**opt-in，不是默认产品路径。** shipped 宿主入口包括 `dsh web` 以及 `dsh --profile headless|sdk|sdk-minimal|acp`。`dsh-base` 的 host 行仍是 `id: subprocess` → `dsh-subprocess-local`、`id: fs-sandbox` → `dsh-fs-sandbox`。[E: packages/bundle/base/cordis.patch.yml:219] [E: packages/bundle/base/cordis.patch.yml:517] `packages/bundle/` 与四份 shipped preset 都没有 `dsh-ssh` / `dsh-fs-ssh` / `dsh-subprocess-ssh` / `dsh-sandbox-ssh` 行。[I]

可加载入口是测试里直接 `ctx.plugin(SshConnection, config)` 再挂三个 adapter，或等价 `--patch`。live 验收：`packages/ssh/ssh/tests/live.e2e.ts`，缺 `DSH_SSH_TEST_CONFIG` 或 Windows 则整组 skip。[E: packages/ssh/ssh/tests/live.e2e.ts:23] [E: packages/ssh/ssh/tests/live.e2e.ts:65]

`ctx.fs` 与 `ctx.subprocess` **没有运行时耦合**。只换 `ctx.fs` 时，`LocalBashExecutor` / `terminal-bash` / `tool-fs-search` 仍 `inject` 原来的 host `ctx.subprocess`，`bash -c`、PTY、`glob`/`grep` 留在本机。[E: packages/shell/bash-local/src/index.ts:98] [E: packages/terminal/terminal-bash/src/index.ts:27] [E: packages/fs/tool-fs-search/src/index.ts:70] SSH 的设计是共享 `ctx.ssh` 的**成对替换**（含 sandbox）。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/ssh/ssh/src/index.ts` | `SshConnection`、`Config`、OpenSSH master spawn、`request` / `connectStream` |
| `packages/ssh/ssh/src/protocol.ts` | `SSH_PROTOCOL_VERSION`、`SshRpcPeer` |
| `packages/ssh/ssh/tests/live.e2e.ts` | opt-in：交叉 fs/subprocess、sandbox、可选 PTC / LSP |
| `packages/ssh/fs-ssh/src/index.ts` | `SshFileSystem`：POSIX resolve、helper RPC、`inject = ['ssh', 'sandboxPolicy']` |
| `packages/ssh/subprocess-ssh/src/index.ts` | `SshSubprocessRuntime`：远程 process / PTY + 独立 SSH stream |
| `packages/ssh/sandbox-ssh/src/index.ts` | `SshSandboxProvider`：把 `confine` 转发到 helper `sandbox` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Context.ssh` | Cordis augmentation。键名 `'ssh'`。[E: packages/ssh/ssh/src/index.ts:43] [E: packages/ssh/ssh/src/index.ts:74] |
| `SshConnection` | 具体 `Service`，不是抽象类。`ready`、`request`、`connectStream`、`nodeExecutable` / `bootstrapPath`。 |
| `Config` | 必填：`host`、`node`、`helper`、`helperHash`（64 hex）、`workspace`（绝对 POSIX）。可选成对 `bootstrapPath` + `bootstrapHash`。默认 `requestTimeoutMs: 30_000`、`maxFrameBytes: 64 * 1024 * 1024`、`maxPending: 128`、`leaseMs: 30_000`。[E: packages/ssh/ssh/src/index.ts:48] [E: packages/ssh/ssh/src/index.ts:52] |
| `SSH_PROTOCOL_VERSION` | `1`。hello 握手携带。[E: packages/ssh/ssh/src/protocol.ts:10] |
| `SshFileSystem` | `extends FileSystem`，仍占 `ctx.fs`。`sandboxMode` override 为 `ctx.sandboxPolicy.defaultMode`。[E: packages/ssh/fs-ssh/src/index.ts:20] [E: packages/ssh/fs-ssh/src/index.ts:23] |
| `SshSubprocessRuntime` | `extends SubprocessRuntime`，`super(ctx)` 占 `ctx.subprocess`。[E: packages/ssh/subprocess-ssh/src/index.ts:229] [E: packages/ssh/subprocess-ssh/src/index.ts:237] |
| `SshSandboxProvider` | `extends SandboxProvider`。`confine` 调 `ctx.ssh.request('sandbox', { argv, policy }, …)`；失败包成 `SandboxUnavailableError`。[E: packages/ssh/sandbox-ssh/src/index.ts:10] [E: packages/ssh/sandbox-ssh/src/index.ts:16] |

本缝 **不**声明 `ssh/*` waterfall。组合失败是「同 realm 第二份 `ssh` / `fs` / `subprocess` / `sandbox` 抛」和「adapter `inject` 等到 `ctx.ssh`」。

## 控制流

1. `SshConnection`@packages/ssh/ssh/src/index.ts 构造调用 `Service` → `ctx.reflect.provide('ssh', self)`。非 `linux`/`darwin` 立刻抛 `SSH runtime requires a POSIX client`。构造当下就开始 `start()`（eager）；`[Service.init]` 与 `request` 都 `await this.ready`。[E: packages/ssh/ssh/src/index.ts:74] [E: packages/ssh/ssh/src/index.ts:75] [E: packages/ssh/ssh/src/index.ts:85] [E: vendor/cordis/src/service.ts:57]
2. `start` 在 `/tmp/dsh-ssh-` 下建 control 目录，`spawn('ssh', ['-T', '-M', '-S', controlPath, …, host, quoted node helper])`。`BatchMode=yes`、`StrictHostKeyChecking=yes`、`ForwardAgent=no`。[E: packages/ssh/ssh/src/index.ts:259] [E: packages/ssh/ssh/src/index.ts:263]
3. helper `hello` 必须带回与 Config 相同的 `helperHash`；配置了 PTC bootstrap 时 `bootstrapHash` 也必须一致，否则 throw。[E: packages/ssh/ssh/src/index.ts:280] [E: packages/ssh/ssh/src/index.ts:281]
4. 之后周期性 `heartbeat`；丢失或 SSH 断开走 `fail`，所有 in-flight 作废。`dispose` 尽量 `request('close')` 再拆 master。[E: packages/ssh/ssh/src/index.ts:284] [E: packages/ssh/ssh/src/index.ts:183]
5. **成对挂 adapter。** `SshFileSystem` / `SshSubprocessRuntime` / `SshSandboxProvider` 都等到 `ctx.ssh`。fs I/O 走 `this.ctx.ssh.request('fs.*', …)`。[E: packages/ssh/fs-ssh/src/index.ts:21] [E: packages/ssh/fs-ssh/src/index.ts:98] [E: packages/ssh/subprocess-ssh/src/index.ts:230] [E: packages/ssh/sandbox-ssh/src/index.ts:11]
6. **live composition。** `live.e2e.ts` 在同一 `Context` 上 plugin `SshConnection` + `SshFileSystem` + `SshSubprocessRuntime` + `SshSandboxProvider` + `SandboxPolicyService`（`mode: 'workspace-write'`，`workspaceRoot: config.workspace`）。缺 env 则 skip。[E: packages/ssh/ssh/tests/live.e2e.ts:32] [E: packages/ssh/ssh/tests/live.e2e.ts:33] [E: packages/ssh/ssh/tests/live.e2e.ts:36] [E: packages/ssh/ssh/tests/live.e2e.ts:65]
7. **只换 `ctx.fs` 带不走 Bash。** `LocalBashExecutor` 的 `inject` 只有 `subprocess`；`tool-fs-search` 同样 `inject` `subprocess`（另加 `tools` / `systemPrompt`）。`lsp-stdio` 是少数两条都吃的 Consumer：只换一边会让读源与 spawn 分属两个世界。[E: packages/shell/bash-local/src/index.ts:98] [E: packages/fs/tool-fs-search/src/index.ts:70] [E: packages/lsp/lsp-stdio/src/index.ts:47]
8. **PTC 可选。** Config 成对提供 `bootstrapPath` / `bootstrapHash` 后，`SshConnection.bootstrapPath` 才能给远端 `NodePtcRuntime` 用。未配置则 getter 抛 `SSH PTC requires a verified bootstrapPath and bootstrapHash`。[E: packages/ssh/ssh/src/index.ts:101] [E: packages/ssh/ssh/src/index.ts:83]

## 设计动机

- **一个 helper、三条 seam。** `ctx.fs` / `ctx.subprocess` / `ctx.sandbox` 在类型上互不 `inject`。共享 `ctx.ssh` 把三个 Provider 绑回 one-world，而不把 Bash 焊进 `FileSystem`。
- **Consumer 不改。** composition 留下 `dsh-bash-local` / `dsh-terminal-bash` / `dsh-lsp-stdio`。换世界 = 换 bundle / `--patch` 行。
- **远端自己隔离。** `sandbox-ssh` 把 `confine` 做到 SSH host 上的 helper，而不是把本机 `bwrap` 套到已经在远端的 argv。这不是 Codex 级网络词汇。
- **digest 钉死 helper。** `helperHash` / `bootstrapHash` 防止连上一份与本 build 协议不匹配的远端二进制。
- **不重连。** 连接丢失使所有 stream / RPC 失效；调用方必须换一条新的 `SshConnection`，避免半开会话上重放 mutation。

相对默认 `dsh web`：host 仍是 `fs-sandbox` + `subprocess-local`。相对已删除的 E2B：不再有 SaaS sandbox API key；身份是本机 OpenSSH `host` 别名 + 预装 helper。相对 Pi：Pi 没有这条可替换远程 one-world 缝。

## Gotcha

- **不是 shipped preset 成员。** 在 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml` 里搜 `ssh` 会落空。要远程世界，显式 `--patch` / 测试 plugin 树这类 overlay。
- **叠到 `dsh web` 必须先 disable host 行。** `dsh-base` 的 fs 行是 `id: fs-sandbox`，subprocess 行是 `id: subprocess`。同一 realm 再挂 `fs-ssh` / `subprocess-ssh` / `sandbox-ssh` 会 duplicate-service。
- **只换 `fs-ssh` 是分裂世界。** `read`/`write` 进远程，`bash` / PTY / `glob`/`grep` 仍在 host `subprocess-local`。
- **客户端必须是 POSIX。** Windows 构造期失败，不会拖到第一次 `request`。[E: packages/ssh/ssh/src/index.ts:75]
- **`host` 只能是 OpenSSH 别名字符集。** Config parse 用 `/^[a-zA-Z0-9][a-zA-Z0-9_.@-]*$/`；路径字段必须以 `/` 开头。[E: packages/ssh/ssh/src/index.ts:77]
- **live e2e 默认 skip。** 没有 `DSH_SSH_TEST_CONFIG` 时整组 `skipIf`；CI 绿不代表打过真远端。[E: packages/ssh/ssh/tests/live.e2e.ts:26]
- **取消不回滚。** `SshRpcPeer.request` 在 abort 时 `reject`「a completed remote mutation is not rolled back」，并只发 `{ type: 'cancel', id }`；已经在远端发生的写不会自动 undo。[E: packages/ssh/ssh/src/protocol.ts:103] [E: packages/ssh/ssh/src/protocol.ts:104]

## Seam 三角

| 角色 | 落点 | ctx 键 / 装配 |
|---|---|---|
| **Definition（`ctx.ssh`）** | `@deepseek-ai/dsh-ssh` · `SshConnection`（具体类，无单独抽象包） | `Context.ssh`；`super(ctx, 'ssh')` |
| **Provider（`ctx.ssh`）** | 同一个 `SshConnection` | opt-in：`id: ssh` / `name: '@deepseek-ai/dsh-ssh'`。**不**在 `dsh-base` / shipped preset |
| **Consumer（`ctx.ssh`）兼 Provider（`ctx.fs`）** | `@deepseek-ai/dsh-fs-ssh` · `SshFileSystem` | `static inject = ['ssh', 'sandboxPolicy']`；占 `ctx.fs`。叠到 base 时必须先 disable 原 fs 行 |
| **Consumer（`ctx.ssh`）兼 Provider（`ctx.subprocess`）** | `@deepseek-ai/dsh-subprocess-ssh` · `SshSubprocessRuntime` | `static inject = ['ssh']`；占 `ctx.subprocess` |
| **Consumer（`ctx.ssh`）兼 Provider（`ctx.sandbox`）** | `@deepseek-ai/dsh-sandbox-ssh` · `SshSandboxProvider` | `static inject = ['ssh']`；占 `ctx.sandbox` |
| **Consumer（`ctx.fs`，模型面）** | `dsh-tool-fs` 等 | `inject` 含 `fs`。换 Provider 不必改 schema |
| **Consumer（`ctx.subprocess`）** | `dsh-bash-local`（因此 `tool-bash`）、`dsh-terminal-bash`、`dsh-tool-fs-search`、`dsh-ptc-runtime-node` | 只 `inject` `subprocess`（Bash 隔着 `ctx.shell`）。**只换 `ctx.fs` 带不走它们** |
| **Consumer（两条 seam）** | `dsh-lsp-stdio` | `inject = ['fs', 'lsp', 'subprocess']`。成对替换才 one-world |

换世界 = 改 include / `--patch` 行，不改 `tool-bash` / `tool-fs`。同一 realm 第二份 `ssh` / `fs` / `subprocess` / `sandbox` 会抛，不会静默覆盖。

## Sources

- packages/ssh/ssh/src/index.ts
- packages/ssh/ssh/src/protocol.ts
- packages/ssh/ssh/package.json
- packages/ssh/ssh/tests/live.e2e.ts
- packages/ssh/fs-ssh/src/index.ts
- packages/ssh/fs-ssh/package.json
- packages/ssh/subprocess-ssh/src/index.ts
- packages/ssh/subprocess-ssh/package.json
- packages/ssh/sandbox-ssh/src/index.ts
- packages/ssh/sandbox-ssh/package.json
- packages/fs/fs/src/index.ts
- packages/subprocess/subprocess/src/index.ts
- packages/sandbox/sandbox/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/bundle/base/cordis.patch.yml
- vendor/cordis/src/service.ts

## 相关

- [subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）：已删除的 E2B 路径；本页是替代缝。
- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `subprocess` 解耦，以及成对替换才带走 Bash/PTY/LSP。
- [subsys.execution.fs](fs.md)（`subsys.execution.fs`）：`ctx.fs` Definition；默认 Provider 仍是 `fs-sandbox`。
- [subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess` Definition；默认 Provider 仍是 `subprocess-local`。
- [subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）：`ctx.terminals` 与 `terminal-bash`；PTY 吃 `subprocess` 不吃 `fs`。
- [subsys.execution.lsp](lsp.md)（`subsys.execution.lsp`）：`lsp-stdio` 同时消费两条 seam。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`ctx.sandboxPolicy`。
- [subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）：`ctx.sandbox` Definition；SSH 路径换成 `SshSandboxProvider`。
