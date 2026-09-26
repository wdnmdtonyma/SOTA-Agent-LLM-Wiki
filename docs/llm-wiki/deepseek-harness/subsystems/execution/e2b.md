---
id: subsys.execution.e2b
title: E2B 远程世界（已退役）
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/ssh/ssh/src/index.ts
  - packages/ssh/ssh/package.json
  - packages/ssh/fs-ssh/src/index.ts
  - packages/ssh/fs-ssh/package.json
  - packages/ssh/subprocess-ssh/src/index.ts
  - packages/ssh/sandbox-ssh/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/fs/fs/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/fs/tool-fs-search/src/index.ts
symbols:
  - ctx.e2b
  - ctx.ssh
related:
  - subsys.execution.ssh
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs
  - subsys.execution.subprocess
  - subsys.execution.terminal
  - subsys.execution.lsp
  - subsys.execution.sandbox-policy
evidence: explicit
status: verified
updated: 477b4f4205
---

> `packages/e2b/**` **已删除**。曾经的 `ctx.e2b` / `E2BRuntime` / `E2BFileSystem` / `E2BSubprocessRuntime` 不再是产品路径。远程 fs / subprocess / sandbox 缝现为 `packages/ssh/{ssh,fs-ssh,subprocess-ssh,sandbox-ssh}`（`ctx.ssh`）。本页保留 wiki id `subsys.execution.e2b` 作为退役映射；活文档在 [subsys.execution.ssh](ssh.md)。

## 能回答的问题

- `ctx.e2b` 还在不在？E2B 包还在 git 树里吗？
- 远程 one-world 现在走哪条缝？
- 默认 `dsh web` / shipped preset 会不会挂 E2B 或 SSH？
- 为什么换远程世界仍必须成对替换 `ctx.fs` 与 `ctx.subprocess`？

## 退役事实

`packages/e2b/` **没有** `package.json` / `src/*.ts`。工作树若还剩目录，只是空壳，不是源码。任何 shipped bundle 都没有 `dsh-e2b` / `dsh-fs-e2b` / `dsh-subprocess-e2b` 行。[I] 核过 `packages/bundle/**/cordis.patch.yml` 与 `packages/bundle/web-app/presets/*.patch.yml` 无 `e2b` 字符串。

`dsh-base` 的 host 行仍是 `id: subprocess` → `dsh-subprocess-local`、`id: fs-sandbox` → `dsh-fs-sandbox`。[E: packages/bundle/base/cordis.patch.yml:219] [E: packages/bundle/base/cordis.patch.yml:517]

远程世界的活接缝是 `ctx.ssh`（`SshConnection`）加上成对的 `SshFileSystem` / `SshSubprocessRuntime` / `SshSandboxProvider`。这四包**同样不在** shipped overlay；live 验收要显式 `DSH_SSH_TEST_CONFIG`。细节、控制流与 seam 三角在 [subsys.execution.ssh](ssh.md)。[E: packages/ssh/ssh/src/index.ts:47] [E: packages/ssh/fs-ssh/src/index.ts:20] [E: packages/ssh/subprocess-ssh/src/index.ts:229] [E: packages/ssh/sandbox-ssh/src/index.ts:10]

`ctx.fs` 与 `ctx.subprocess` **没有运行时耦合**。只换 `ctx.fs` 时，`LocalBashExecutor` / `terminal-bash` / `tool-fs-search` 仍 `inject` 原来的 host `ctx.subprocess`，`bash -c`、PTY、`glob`/`grep` 留在本机。[E: packages/shell/bash-local/src/index.ts:98] [E: packages/terminal/terminal-bash/src/index.ts:27] [E: packages/fs/tool-fs-search/src/index.ts:70] `lsp-stdio` 同时 `inject` `fs` + `subprocess`。[E: packages/lsp/lsp-stdio/src/index.ts:47] 换远程世界 = 成对替换这两条（SSH 路径还要换 `ctx.sandbox`），不改 `tool-bash` / `tool-fs`。

## 不要再写的句子

- `ctx.e2b` 仍是 POC 远程 one-world
- shipped 或 preset 挂 `dsh-e2b` / `dsh-fs-e2b` / `dsh-subprocess-e2b`
- `packages/e2b/e2b/tests/fixtures/composition/cordis.yml` 仍是可加载入口
- API key 走 `E2B_API_KEY` / `Sandbox.create`
- 远程 fs/subprocess 仍由 E2B SDK 提供

## Sources

- packages/ssh/ssh/src/index.ts
- packages/ssh/ssh/package.json
- packages/ssh/fs-ssh/src/index.ts
- packages/ssh/fs-ssh/package.json
- packages/ssh/subprocess-ssh/src/index.ts
- packages/ssh/sandbox-ssh/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/fs/fs/src/index.ts
- packages/subprocess/subprocess/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/fs/tool-fs-search/src/index.ts

## 相关

- [subsys.execution.ssh](ssh.md)（`subsys.execution.ssh`）：活的远程 one-world（`ctx.ssh` + fs/subprocess/sandbox providers）。
- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `subprocess` 解耦，以及成对替换才带走 Bash/PTY/LSP。
- [subsys.execution.fs](fs.md)（`subsys.execution.fs`）：`ctx.fs` Definition；默认 Provider 仍是 `fs-sandbox`。
- [subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess` Definition；默认 Provider 仍是 `subprocess-local`。
- [subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）：`ctx.terminals` 与 `terminal-bash`；PTY 吃 `subprocess` 不吃 `fs`。
- [subsys.execution.lsp](lsp.md)（`subsys.execution.lsp`）：`lsp-stdio` 同时消费两条 seam。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`ctx.sandboxPolicy`。
