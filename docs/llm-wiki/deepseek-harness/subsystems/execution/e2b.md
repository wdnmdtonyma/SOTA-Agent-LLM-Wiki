---
id: subsys.execution.e2b
title: E2B 远程世界
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/e2b/e2b/src/index.ts
  - packages/e2b/e2b/package.json
  - packages/e2b/e2b/tests/e2b.spec.ts
  - packages/e2b/e2b/tests/composition.e2e.ts
  - packages/e2b/fs-e2b/src/index.ts
  - packages/e2b/fs-e2b/package.json
  - packages/e2b/subprocess-e2b/src/index.ts
  - packages/e2b/subprocess-e2b/src/environment.ts
  - packages/e2b/subprocess-e2b/src/process.ts
  - packages/e2b/subprocess-e2b/package.json
  - packages/fs/fs/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - examples/headless-agent/e2b.cordis.yml
  - examples/headless-agent/advanced.cordis.yml
  - examples/headless-agent/cordis.yml
  - examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml
  - vendor/cordis/src/service.ts
symbols:
  - ctx.e2b
  - E2BRuntime
  - E2BFileSystem
  - E2BSubprocessRuntime
related:
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs
  - subsys.execution.subprocess
  - subsys.execution.terminal
  - subsys.execution.lsp
  - subsys.execution.sandbox-policy
evidence: explicit
status: verified
updated: 47f943859b
---

> E2B 是 **POC 远程 one-world**，不是 shipped 默认路径。`E2BRuntime` 占 `ctx.e2b`，创建并销毁**一个**短生命周期远程 Linux sandbox；`E2BFileSystem` 与 `E2BSubprocessRuntime` 都 `static inject = ['e2b']`，分别独占 `ctx.fs` 与 `ctx.subprocess`。成对替换才把 Bash / PTY / `glob`/`grep` / LSP 与 `read`/`write` 放进同一远程世界；只换 `ctx.fs` 不会带走 `bash -c`。

## 能回答的问题

- `ctx.e2b` 是谁 `provide` 的？`fs-e2b` / `subprocess-e2b` 怎样等到同一份 SDK 句柄？
- 默认 `dsh web` / shipped preset 会不会挂 `dsh-e2b`？POC overlay 关掉哪两行、插入哪三行？
- 为什么必须 **成对** 换 `ctx.fs` + `ctx.subprocess`？只换 `fs` 时 Bash / PTY / `glob` 还在哪？
- live e2e 怎样证明同沙箱交叉可见，以及 `hover` / `terminal` 也在这个世界里？
- overlay 为什么把 `sandbox-policy` 设成 `danger-full-access`？
- API key 从哪读、交给谁、会不会写进远程进程环境？

## 职责边界

三个包一起构成这条 POC 路径：

- `@deepseek-ai/dsh-e2b` 的 `E2BRuntime`：**同一类**既是 `ctx.e2b` 的 Definition（augmentation + `super(ctx, 'e2b')`）也是 Provider。[E: packages/e2b/e2b/package.json:2] [E: packages/e2b/e2b/src/index.ts:65] [E: packages/e2b/e2b/src/index.ts:91]
- `@deepseek-ai/dsh-fs-e2b` 的 `E2BFileSystem`：`ctx.fs` 的远程 Provider，`inject = ['e2b']`。[E: packages/e2b/fs-e2b/package.json:2] [E: packages/e2b/fs-e2b/src/index.ts:172]
- `@deepseek-ai/dsh-subprocess-e2b` 的 `E2BSubprocessRuntime`：`ctx.subprocess` 的远程 Provider，同样 `inject = ['e2b']`。[E: packages/e2b/subprocess-e2b/package.json:2] [E: packages/e2b/subprocess-e2b/src/index.ts:53]

明确不拥有：

- `FileSystem` / `SubprocessRuntime` 抽象与默认 local Provider：[subsys.execution.fs](fs.md)（`subsys.execution.fs`）、[subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）。
- `bash -c` resolve / timeout / 输出预算：[subsys.execution.shell](shell.md)。POC overlay **不**换 `id: bash`；`LocalBashExecutor` 只 `inject` `subprocess`，世界跟着 `ctx.subprocess` 走。[E: packages/shell/bash-local/src/index.ts:103] [E: examples/headless-agent/cordis.yml:39]
- PTY 会话策略 / `terminal_*` 字段：[subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）。`terminal-bash` `inject` 含 `subprocess`，不含 `fs`。[E: packages/terminal/terminal-bash/src/index.ts:25]
- LSP 成帧与四个 query：[subsys.execution.lsp](lsp.md)（`subsys.execution.lsp`）。`lsp-stdio` 同时 `inject` `fs` + `subprocess`。[E: packages/lsp/lsp-stdio/src/index.ts:47]
- `SandboxMode` fold / `sandbox/mode`：[subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）。本页只写 overlay 把 mode 钉成 `danger-full-access`。
- 模型可见 tool 字段表（`read` / `bash` / `terminal_*` / `lsp`）。

**POC，不是默认产品路径。** 默认安装是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。`dsh-base` 的 host 行仍是 `id: subprocess` → `dsh-subprocess-local`、`id: fs-sandbox` → `dsh-fs-sandbox`。[E: packages/bundle/base/cordis.patch.yml:163] [E: packages/bundle/base/cordis.patch.yml:164] [E: packages/bundle/base/cordis.patch.yml:443] [E: packages/bundle/base/cordis.patch.yml:444] `dsh-base` / `dsh-web-app` / `dsh-headless` 与四份 shipped preset（`minimal` / `standard` / `code` / `cordis`）都没有 `dsh-e2b` / `dsh-fs-e2b` / `dsh-subprocess-e2b` 行。[I]

可加载入口是 `examples/headless-agent/e2b.cordis.yml`：include `advanced.cordis.yml`，后者再 include example 的 `cordis.yml`；把本地 `subprocess` 与 `fs-local` `disabled: true`，插入 `e2b` + `subprocess-e2b` + `fs-e2b`。[E: examples/headless-agent/e2b.cordis.yml:13] [E: examples/headless-agent/advanced.cordis.yml:5] [E: examples/headless-agent/e2b.cordis.yml:15] [E: examples/headless-agent/e2b.cordis.yml:17] [E: examples/headless-agent/e2b.cordis.yml:18] [E: examples/headless-agent/e2b.cordis.yml:20] [E: examples/headless-agent/e2b.cordis.yml:23] [E: examples/headless-agent/e2b.cordis.yml:28] [E: examples/headless-agent/e2b.cordis.yml:30] 这份 overlay 的 disable 目标是 **example** 的 `id: subprocess` / `id: fs-local`，不是 `dsh-base` 的 `id: fs-sandbox`。[E: examples/headless-agent/cordis.yml:35] [E: examples/headless-agent/cordis.yml:36] [E: examples/headless-agent/cordis.yml:156] [E: examples/headless-agent/cordis.yml:157]

`ctx.fs` 与 `ctx.subprocess` **没有运行时耦合**。只换 `ctx.fs` 时，`LocalBashExecutor` / `terminal-bash` / `tool-fs-search` 仍 `inject` 原来的 host `ctx.subprocess`，`bash -c`、PTY、`glob`/`grep` 留在本机。[E: packages/shell/bash-local/src/index.ts:103] [E: packages/terminal/terminal-bash/src/index.ts:25] [E: packages/fs/tool-fs-search/src/index.ts:70] E2B 的设计是共享 `ctx.e2b` 的**成对替换**。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/e2b/e2b/src/index.ts` | `E2BRuntime`、`e2bControlEnvs`、`quoteE2BShellArg`、`Config` |
| `packages/e2b/e2b/tests/e2b.spec.ts` | 创建/销毁、env key、缺 key 抛、控制面 `HOME` |
| `packages/e2b/e2b/tests/composition.e2e.ts` | live：交叉可见、`hover`、`terminal`、host 侧无落盘、sandbox 已删 |
| `packages/e2b/fs-e2b/src/index.ts` | `E2BFileSystem`：POSIX resolve、远程原子写、`inject = ['e2b']` |
| `packages/e2b/subprocess-e2b/src/index.ts` | `E2BSubprocessRuntime`：`resolveExecutable` / `spawn` / `spawnTerminal` |
| `packages/e2b/subprocess-e2b/src/environment.ts` | 读远程 env、剥 `DSH_*` 与 credential 形名字、显式 overlay |
| `packages/e2b/subprocess-e2b/src/process.ts` | 远程进程组、`env -i` 启动、控制面 `e2bControlEnvs` |
| `examples/headless-agent/e2b.cordis.yml` | headless-agent 的 POC overlay |
| `examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml` | live e2e 实际 boot 的瘦树（不是那份 overlay） |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Context.e2b` | Cordis augmentation。键名 `'e2b'`。[E: packages/e2b/e2b/src/index.ts:65] [E: packages/e2b/e2b/src/index.ts:91] |
| `E2BRuntime` | 具体 `Service`，不是抽象类。`getSandbox()`、只读 `cwd` / `runtimeRoot`。 |
| `Config` | `apiKey?`（省略读 `E2B_API_KEY`）、`cwd` 默认 `'/home/user/workspace'`、`timeoutMs` 默认 `300_000`。[E: packages/e2b/e2b/src/index.ts:77] [E: packages/e2b/e2b/src/index.ts:78] [E: packages/e2b/e2b/src/index.ts:94] |
| `runtimeRoot` | `posix.join(cwd, '.dsh-e2b')`。必须是真实目录（拒 symlink / 普通文件）。进程/PTY 私有状态写在它下面。[E: packages/e2b/e2b/src/index.ts:102] [E: packages/e2b/e2b/src/index.ts:162] |
| `e2bControlEnvs(overrides)` | `{ ...overrides, HOME: '/.dsh-e2b-control-<uuid>' }`。后写的 `HOME` 盖掉调用方。[E: packages/e2b/e2b/src/index.ts:39] |
| `E2BFileSystem` | `extends FileSystem`，仍占 `ctx.fs`。`writeText` 签名止于 `signal`，没有 `sandboxPolicy` 第五参。[E: packages/e2b/fs-e2b/src/index.ts:171] [E: packages/e2b/fs-e2b/src/index.ts:380] `FileSystem.sandboxMode` 基类返回 `undefined`。[E: packages/fs/fs/src/index.ts:104] 本类没有 override。[I] |
| `E2BSubprocessRuntime` | `extends SubprocessRuntime`，`super(ctx)` 占 `ctx.subprocess`。`Config.pollMs` 默认 `20`。[E: packages/e2b/subprocess-e2b/src/index.ts:52] [E: packages/subprocess/subprocess/src/index.ts:104] [E: packages/e2b/subprocess-e2b/src/index.ts:56] |
| `scrubRemoteEnvironment` | 丢掉 `DSH_*` 与 `SENSITIVE_ENV_PATTERN`（`/KEY\|PASSWORD\|SECRET\|TOKEN/i`）。[E: packages/e2b/subprocess-e2b/src/environment.ts:65] [E: packages/subprocess/subprocess/src/index.ts:44] |
| `serializeRemoteEnvironment` | 先 `scrubRemoteEnvironment`，再叠显式条目；`undefined` 是 tombstone。[E: packages/e2b/subprocess-e2b/src/environment.ts:94] [E: packages/e2b/subprocess-e2b/src/environment.ts:100] |

本缝 **不**声明 `e2b/*` waterfall。组合失败是「同 realm 第二份 `e2b` / `fs` / `subprocess` 抛」和「adapter `inject` 等到 `ctx.e2b`」。

## 控制流

1. `E2BRuntime`@packages/e2b/e2b/src/index.ts 构造调用 `Service` → `ctx.reflect.provide('e2b', self)`。构造当下就开始 `open()`（eager）；`getSandbox()` 等同一份 `ready`。[E: packages/e2b/e2b/src/index.ts:91] [E: vendor/cordis/src/service.ts:57] [E: packages/e2b/e2b/src/index.ts:103] [E: packages/e2b/e2b/src/index.ts:132]
2. 缺 `config.apiKey` 且 `E2B_API_KEY` 为空则 `validate` 抛 `configure apiKey or set E2B_API_KEY`；空 key 在 `Sandbox.create` 之前失败。[E: packages/e2b/e2b/src/index.ts:141] [E: packages/e2b/e2b/tests/e2b.spec.ts:228] [E: packages/e2b/e2b/tests/e2b.spec.ts:220]
3. `open` 只把 `apiKey` 交给 `Sandbox.create`（另带 `timeoutMs`、`secure: true`、`lifecycle.onTimeout: 'kill'`）。随后 `makeDir(cwd)`、`makeDir(runtimeRoot)`，确认 runtime root 是真实目录，再 `chmod 700`。[E: packages/e2b/e2b/src/index.ts:153] [E: packages/e2b/e2b/src/index.ts:159] [E: packages/e2b/e2b/src/index.ts:160] [E: packages/e2b/e2b/src/index.ts:162] [E: packages/e2b/e2b/tests/e2b.spec.ts:83]
4. 控制面命令走 `e2bControlEnvs()`：每次一个新的 `/.dsh-e2b-control-<uuid>` `HOME`，后写覆盖调用方传入的 `HOME`。[E: packages/e2b/e2b/src/index.ts:39] [E: packages/e2b/e2b/tests/e2b.spec.ts:67]
5. fiber dispose 设 `disposed`，等 `ready` 后 `sandbox.kill()`；`SandboxNotFoundError` 当已删除。dispose 后再 `getSandbox()` 抛 `disposing`。[E: packages/e2b/e2b/src/index.ts:118] [E: packages/e2b/e2b/src/index.ts:120] [E: packages/e2b/e2b/tests/e2b.spec.ts:100]
6. **成对挂 adapter。** `E2BFileSystem` / `E2BSubprocessRuntime` 都 `static inject = ['e2b']`，分别 `extends` `FileSystem` / `SubprocessRuntime`，独占 `ctx.fs` / `ctx.subprocess`。两边的 I/O 都 `await this.ctx.e2b.getSandbox()`。[E: packages/e2b/fs-e2b/src/index.ts:172] [E: packages/e2b/fs-e2b/src/index.ts:181] [E: packages/e2b/subprocess-e2b/src/index.ts:53] [E: packages/e2b/subprocess-e2b/src/index.ts:110]
7. **POC overlay。** `examples/headless-agent/e2b.cordis.yml` disable 本地 `subprocess` + `fs-local`，insert `e2b`（`cwd: !!js process.cwd()`）+ `subprocess-e2b` + `fs-e2b`，并把 `sandbox-policy` 设 `mode: danger-full-access`、`workspaceRoot: !!js process.cwd()`。[E: examples/headless-agent/e2b.cordis.yml:17] [E: examples/headless-agent/e2b.cordis.yml:20] [E: examples/headless-agent/e2b.cordis.yml:25] [E: examples/headless-agent/e2b.cordis.yml:34] [E: examples/headless-agent/e2b.cordis.yml:35] 不插入 `dsh-sandbox-local`。`terminal-bash` 在 `danger-full-access` 下直接返回裸 argv；其它 mode 没有 `ctx.sandbox` 会抛。[E: packages/terminal/terminal-bash/src/index.ts:73] [E: packages/terminal/terminal-bash/src/index.ts:76]
8. 用户进程环境：`readRemoteEnvironment` → `bootstrapEnvironment` 把敏感名 tombstone 成 `''` 给 SDK login shell → `serializeRemoteEnvironment(ambient, spec.env)` 写入私有 env 文件，远程 `env -i` 启动。ambient 里的 `DSH_*` / `*KEY*` 等被剥；**显式** `spec.env` 可以再放回去。[E: packages/e2b/subprocess-e2b/src/environment.ts:65] [E: packages/e2b/subprocess-e2b/src/environment.ts:79] [E: packages/e2b/subprocess-e2b/src/process.ts:412] [E: packages/e2b/subprocess-e2b/src/process.ts:326] `apiKey` 只出现在 `Sandbox.create`，不进这些 `envs` / env 文件。[I]
9. **只换 `ctx.fs` 带不走 Bash。** `LocalBashExecutor` 的 `inject` 只有 `subprocess`；`tool-fs-search` 同样只 `inject` `subprocess`。`lsp-stdio` 是少数两条都吃的 Consumer：只换一边会让读源与 spawn 分属两个世界。[E: packages/shell/bash-local/src/index.ts:103] [E: packages/fs/tool-fs-search/src/index.ts:70] [E: packages/lsp/lsp-stdio/src/index.ts:47]
10. **live 组合。** `composition.e2e.ts` 在缺 `E2B_API_KEY` 时 skip；有 key 时 boot 的是 fixture `examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml`（同样挂 `e2b` + `subprocess-e2b` + `fs-e2b` + `danger-full-access`），**不是** `e2b.cordis.yml`。[E: packages/e2b/e2b/tests/composition.e2e.ts:25] [E: packages/e2b/e2b/tests/composition.e2e.ts:22] [E: examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml:5] [E: examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml:11] [E: examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml:19] [E: examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml:27]
11. 同一份 stdout 断言 `bashRead: 'versioned-by-fs\n'`（Bash 读到 fs 写的版本）与 `fsRead: 'written-by-bash\n'`（fs 读到 Bash 写的文件），并断言 `hover` 与 `terminal` 字段。[E: packages/e2b/e2b/tests/composition.e2e.ts:147] [E: packages/e2b/e2b/tests/composition.e2e.ts:148] [E: packages/e2b/e2b/tests/composition.e2e.ts:151] [E: packages/e2b/e2b/tests/composition.e2e.ts:159]
12. 同一次 inspect 要求 host 工作目录里 `from-fs.txt` / `from-bash.txt` 等为 `ENOENT`（副作用留在远程）。测完 `Sandbox.getInfo(sandboxId)` 必须是 `SandboxNotFoundError`。[E: packages/e2b/e2b/tests/composition.e2e.ts:139] [E: packages/e2b/e2b/tests/composition.e2e.ts:178]

## 设计动机

- **一个 sandbox、两条 seam。** `ctx.fs` 与 `ctx.subprocess` 在类型上互不 `inject`。共享 `ctx.e2b` 把两个 Provider 绑回 one-world，而不把 Bash 焊进 `FileSystem`。
- **Consumer 不改。** overlay 留下 `dsh-bash-local` / `dsh-terminal-bash` / `dsh-lsp-stdio` / `dsh-tool-fs`。换世界 = 换 bundle / `--patch` 行。
- **远程世界自己隔离。** overlay 把 `sandbox-policy` 钉成 `danger-full-access`，跳过本机 `bwrap` / seatbelt；也不挂 `dsh-sandbox-local`。这不是 Codex 级网络/进程词汇，只是「文件政策放行 + 执行发生在 E2B VM」。[I]
- **控制面与用户进程拆开。** SDK 不可避免 `/bin/bash -l -c`；`e2bControlEnvs` 给每次控制命令一个空 `HOME`。用户 argv 另走 `env -i` + 剥过的远程环境。
- **key 留在 host。** `apiKey` 只用于 `Sandbox.create`。DSH 不把它写入控制面 `envs` 或远程 env 文件。

相对默认 `dsh web`：host 仍是 `fs-sandbox` + `subprocess-local` + `bash-sandbox`。相对 Pi：Pi 没有这条可替换远程 one-world 缝。

## Gotcha

- **不是 shipped preset 成员。** 在 `apps/cli/config/agent-presets/*/agent.cordis.yml` 里搜 `e2b` 会落空。要远程世界，显式 `--patch` / 加载 `e2b.cordis.yml` 这类 overlay。
- **disable 的 id 跟 `dsh-base` 对不上。** overlay 关的是 example 的 `fs-local`。把它叠到 `dsh web` **不会**关掉 host `id: fs-sandbox`，同一 realm 再挂 `fs-e2b` 会 duplicate-service。
- **`cwd` 必须三处同名。** overlay 把 `e2b.cwd` 与 `sandbox-policy.workspaceRoot` 都写成 `process.cwd()`；`bash-local` 缺省 workdir 也是 `process.cwd()`。`open()` 只 `makeDir` `e2b.cwd`。丢掉 `!!js` 行会回落到 `'/home/user/workspace'`，Bash/PTY 仍把 host 路径当远程 `cwd`，spawn 失败。[E: packages/e2b/e2b/src/index.ts:77] [E: packages/e2b/e2b/src/index.ts:159] [E: packages/shell/bash-local/src/index.ts:157] [E: packages/e2b/e2b/tests/e2b.spec.ts:80]
- **只换 `fs-e2b` 是分裂世界。** `read`/`write` 进远程，`bash` / PTY / `glob`/`grep` 仍在 host `subprocess-local`。
- **`fs-e2b` 不执行 in-process 围栏。** `writeText` 没有 `sandboxPolicy` 参数；`sandboxMode` 保持基类 `undefined`。政策放行靠 overlay 的 `danger-full-access` + 远程 VM，不是 `SandboxedFileSystem.checkedTarget`。
- **相对命令照样拒。** `resolveExecutable` 对含 `/` 的相对路径抛，与 local 一致。[E: packages/e2b/subprocess-e2b/src/index.ts:120]
- **live e2e 默认 skip。** 没有 `E2B_API_KEY` 时整组 `skipIf`；CI 绿不代表打过真沙箱。[E: packages/e2b/e2b/tests/composition.e2e.ts:25]
- **live e2e ≠ example overlay。** 断言交叉可见的是 fixture 瘦树；example overlay 额外挂 `tool-terminal` / `tool-lsp` 以及 include 进来的 headless agent 工具面。

## Seam 三角

| 角色 | 落点 | ctx 键 / 装配 |
|---|---|---|
| **Definition（`ctx.e2b`）** | `@deepseek-ai/dsh-e2b` · `E2BRuntime`（具体类，无单独抽象包） | `Context.e2b`；`super(ctx, 'e2b')` |
| **Provider（`ctx.e2b`）** | 同一个 `E2BRuntime` | POC：`id: e2b` / `name: '@deepseek-ai/dsh-e2b'`。**不**在 `dsh-base` / shipped preset |
| **Consumer（`ctx.e2b`）兼 Provider（`ctx.fs`）** | `@deepseek-ai/dsh-fs-e2b` · `E2BFileSystem` | `static inject = ['e2b']`；占 `ctx.fs`。必须先 disable 原 fs 行 |
| **Consumer（`ctx.e2b`）兼 Provider（`ctx.subprocess`）** | `@deepseek-ai/dsh-subprocess-e2b` · `E2BSubprocessRuntime` | `static inject = ['e2b']`；占 `ctx.subprocess`。必须先 disable 原 subprocess 行 |
| **Consumer（`ctx.fs`，模型面）** | `dsh-tool-fs` 等 | `inject` 含 `fs`。换 Provider 不必改 schema |
| **Consumer（`ctx.subprocess`）** | `dsh-bash-local`（因此 `tool-bash`）、`dsh-terminal-bash`、`dsh-tool-fs-search` | 只 `inject` `subprocess`（Bash 隔着 `ctx.shell`）。**只换 `ctx.fs` 带不走它们** |
| **Consumer（两条 seam）** | `dsh-lsp-stdio` | `inject = ['fs', 'lsp', 'subprocess']`。成对替换才 one-world |
| **政策（不是 E2B Provider）** | overlay 里的 `dsh-sandbox-policy` | `mode: danger-full-access`。远程 VM 隔离；本机 `ctx.sandbox` 不在这份 overlay 里 |

换世界 = 改 include / `--patch` 行，不改 `tool-bash` / `tool-fs`。同一 realm 第二份 `e2b` / `fs` / `subprocess` 会抛，不会静默覆盖。

## Sources

- packages/e2b/e2b/src/index.ts
- packages/e2b/e2b/package.json
- packages/e2b/e2b/tests/e2b.spec.ts
- packages/e2b/e2b/tests/composition.e2e.ts
- packages/e2b/fs-e2b/src/index.ts
- packages/e2b/fs-e2b/package.json
- packages/e2b/subprocess-e2b/src/index.ts
- packages/e2b/subprocess-e2b/src/environment.ts
- packages/e2b/subprocess-e2b/src/process.ts
- packages/e2b/subprocess-e2b/package.json
- packages/fs/fs/src/index.ts
- packages/subprocess/subprocess/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/bundle/base/cordis.patch.yml
- examples/headless-agent/e2b.cordis.yml
- examples/headless-agent/advanced.cordis.yml
- examples/headless-agent/cordis.yml
- examples/headless-agent/tests/fixtures/e2b/e2b/cordis.yml
- vendor/cordis/src/service.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `subprocess` 解耦，以及成对替换才带走 Bash/PTY/LSP。
- [subsys.execution.fs](fs.md)（`subsys.execution.fs`）：`ctx.fs` Definition；默认 Provider 仍是 `fs-sandbox`。
- [subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess` Definition；默认 Provider 仍是 `subprocess-local`。
- [subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）：`ctx.terminals` 与 `terminal-bash`；PTY 吃 `subprocess` 不吃 `fs`。
- [subsys.execution.lsp](lsp.md)（`subsys.execution.lsp`）：`lsp-stdio` 同时消费两条 seam；shipped preset 不挂，出现在 E2B overlay。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`ctx.sandboxPolicy`；本 overlay 把它钉成 `danger-full-access`。
