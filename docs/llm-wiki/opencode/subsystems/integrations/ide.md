---
id: integrations.ide
title: IDE integration
kind: subsystem
tier: T2
v: v1
status: verified
updated: 92c70c9c3
source:
  - packages/opencode/src/ide/index.ts
symbols:
  - Ide.ide
  - Ide.alreadyInstalled
  - Ide.install
  - Ide.Event.Installed
related:
  - integrations.acp
evidence: explicit
---

> IDE integration 是 V1 的轻量本机 IDE 检测与 VS Code-family extension installer；它不负责 ACP protocol，本节点只描述 `packages/opencode/src/ide/index.ts` 的本地命令检测和安装行为。

## 能回答的问题

- opencode 如何判断当前终端来自哪个 IDE。
- 支持哪些 VS Code-family IDE extension 安装目标。
- install extension 时调用哪个 CLI 命令，如何判断已经安装。
- `OPENCODE_CALLER` 对 IDE detection 有什么影响。

## 职责

`packages/opencode/src/ide/index.ts` 的职责很窄：定义支持的 IDE 列表、检测当前 shell 是否来自 VS Code-family IDE、判断当前进程是不是被 VS Code extension 调起、以及通过 IDE CLI 安装 `sst-dev.opencode` extension。[E: packages/opencode/src/ide/index.ts:6] [E: packages/opencode/src/ide/index.ts:39] [E: packages/opencode/src/ide/index.ts:47]

这个文件不实现 editor protocol、不维护 session，也不包含 ACP RPC；ACP server 在 `packages/opencode/src/acp/*` 和 `packages/opencode/src/cli/cmd/acp.ts`。[I]

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/opencode/src/ide/index.ts` | IDE 列表、环境检测、extension 安装。 |

## 数据模型

支持的 IDE 以静态数组表示，每个条目有 `name` 和 CLI `cmd`。当前源码包含 Windsurf/`windsurf`、VS Code Insiders/`code-insiders`、VS Code/`code`、Cursor/`cursor`、VSCodium/`codium`。[E: packages/opencode/src/ide/index.ts:7] [E: packages/opencode/src/ide/index.ts:11]

IDE module 定义了 `ide.installed` event，payload 是被安装的 IDE name；当前 `install()` 函数没有发布该 event。[E: packages/opencode/src/ide/index.ts:16] [E: packages/opencode/src/ide/index.ts:18] [I] 错误类型有 `AlreadyInstalledError` 和 `InstallFailedError`。[E: packages/opencode/src/ide/index.ts:23] [E: packages/opencode/src/ide/index.ts:25]

## 控制流

### 当前 IDE 检测

1. `ide()` 先检查 `process.env["TERM_PROGRAM"] === "vscode"`。[E: packages/opencode/src/ide/index.ts:30]
2. 如果是 VS Code-family terminal，再读取 `GIT_ASKPASS`，并按 supported IDE 的 `name` 做 substring match。[E: packages/opencode/src/ide/index.ts:31] [E: packages/opencode/src/ide/index.ts:33]
3. 命中时返回 IDE display name；没有命中或不是 VS Code terminal 时返回 `"unknown"`。[E: packages/opencode/src/ide/index.ts:33] [E: packages/opencode/src/ide/index.ts:36]

### 已安装判断

1. `alreadyInstalled()` 不查本机 extension 列表，只看 `OPENCODE_CALLER` 是否是 `vscode` 或 `vscode-insiders`。[E: packages/opencode/src/ide/index.ts:40]
2. 这意味着“当前进程由 extension 调起”会被视作已安装信号。[I]

### 安装

1. `install(ide)` 先在 supported IDE list 里按 name 查找 CLI command。[E: packages/opencode/src/ide/index.ts:44]
2. 未找到时抛 `Unknown IDE: ${ide}`。[E: packages/opencode/src/ide/index.ts:45]
3. 找到后执行 `[cmd, "--install-extension", "sst-dev.opencode"]`。[E: packages/opencode/src/ide/index.ts:47]
4. `Process.run` exit code 非 0 时抛 `InstallFailedError({ stderr })`。[E: packages/opencode/src/ide/index.ts:47] [E: packages/opencode/src/ide/index.ts:53] [E: packages/opencode/src/ide/index.ts:54]
5. stdout 包含 `already installed` 时抛 `AlreadyInstalledError`。[E: packages/opencode/src/ide/index.ts:56] [E: packages/opencode/src/ide/index.ts:57]
6. 成功安装路径没有显式 return payload，也没有发布 `ide.installed` event；函数在未抛错时自然结束。[I]

## 设计动机与权衡

IDE integration 选择“CLI 安装 extension + 环境变量检测”的低耦合方式，而不是嵌入 VS Code API。[I] 安装路径调用 `Process.run`，检测路径读取环境变量。[E: packages/opencode/src/ide/index.ts:47] [E: packages/opencode/src/ide/index.ts:30]

`alreadyInstalled()` 用 `OPENCODE_CALLER` 判断，适合从 extension 里启动 opencode 时避免重复提示安装；它不是对磁盘 extension 状态的完整审计。[I] 这一点可以从函数体只读取环境变量看出。[E: packages/opencode/src/ide/index.ts:40]

## 易踩坑

- IDE detection 要求 `TERM_PROGRAM=vscode`，并依赖 `GIT_ASKPASS` 字符串包含 IDE name；未看到 process parent 或 app bundle 检测代码。[E: packages/opencode/src/ide/index.ts:30] [E: packages/opencode/src/ide/index.ts:31] [I]
- supported IDE list 是 VS Code-family CLI；JetBrains、Neovim 等不在这个 installer 里。[E: packages/opencode/src/ide/index.ts:7] [I]
- `AlreadyInstalled` 是通过 stdout substring 判断；当前函数未调用 `--list-extensions`。[E: packages/opencode/src/ide/index.ts:56] [I]
- 本节点不要和 ACP 混写：ACP 是 opencode 作为 Agent Client Protocol server 的 stdio/NDJSON integration，文件在 `packages/opencode/src/acp/*`。[I]

## Sources

- packages/opencode/src/ide/index.ts

## 相关

- integrations.acp
