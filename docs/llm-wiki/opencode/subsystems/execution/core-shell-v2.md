---
id: execution.core-shell-v2
title: V2 Core Shell Helper
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/shell.ts, packages/core/src/tool/bash.ts, packages/core/src/pty.ts, packages/opencode/src/tool/shell.ts]
symbols: [Shell.preferred, Shell.acceptable, Shell.args, Shell.list, Shell.killTree, Shell.login]
related: [execution.shell-v1, execution.shell-v2, execution.pty, tool.bash]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `packages/core/src/shell.ts` 是 V2 core 的 shell utility module：它负责 shell path/name/metadata、preferred/acceptable 选择、login shell 检测、shell args 生成和 process-tree cleanup；它不是 V2 bash tool 本身，也不是 Effect service。

## 能回答的问题
- `Shell.preferred()` 和 `Shell.acceptable()` 有什么区别?
- 哪些 shell 被认为不适合默认 command execution?
- Windows fallback 如何找 PowerShell、Git Bash 和 COMSPEC?
- V2 PTY 和 V2 bash tool 分别如何使用 core shell helper?
- V1 shell tool 现在从哪里 import shell helper?

## Shell Metadata

`META` 记录 shell name 的行为：bash/dash/ksh/sh/zsh 是 login+posix，fish 是 deny+login，nu 是 deny，powershell/pwsh 是 ps。[E: packages/core/src/shell.ts:13][E: packages/core/src/shell.ts:14][E: packages/core/src/shell.ts:16][E: packages/core/src/shell.ts:18][E: packages/core/src/shell.ts:19][E: packages/core/src/shell.ts:20][E: packages/core/src/shell.ts:22]

`name(file)` 在 Windows 用 `path.win32.parse(FSUtil.windowsPath(file)).name.toLowerCase()`，其它平台用 `path.basename(file).toLowerCase()`；`login/posix/ps` 都从 `META[name(file)]` 派生。[E: packages/core/src/shell.ts:139][E: packages/core/src/shell.ts:140][E: packages/core/src/shell.ts:141][E: packages/core/src/shell.ts:144][E: packages/core/src/shell.ts:148][E: packages/core/src/shell.ts:152]

`acceptable(configShell?)` 使用 `select(..., { acceptable: true })`，因此会跳过 `deny: true` shell；`preferred(configShell?)` 不要求 acceptable，用于 PTY 等更接近用户 interactive shell 的场景。[E: packages/core/src/shell.ts:214][E: packages/core/src/shell.ts:215][E: packages/core/src/shell.ts:216][E: packages/core/src/shell.ts:205][E: packages/core/src/shell.ts:206][E: packages/core/src/shell.ts:207]

## Resolution 与 Fallback

`full(file)` 在 Windows 下把 path 标准化，特殊处理 bash：absolute `/.../bash` 或 bare `bash` 会优先返回 `gitbash()`；其它 bare shell 走 `which(shell)` fallback。[E: packages/core/src/shell.ts:66][E: packages/core/src/shell.ts:67][E: packages/core/src/shell.ts:70][E: packages/core/src/shell.ts:73][E: packages/core/src/shell.ts:74]

`win()` fallback 顺序是 `pwsh`、`powershell`、`gitbash()`、`process.env.COMSPEC || "cmd.exe"`，并去重后 full normalize。[E: packages/core/src/shell.ts:98][E: packages/core/src/shell.ts:101][E: packages/core/src/shell.ts:103]

非 Windows `unix()` 优先读 `/etc/shells`，没有可读内容时回落到 `/bin/bash`、`/bin/zsh`、`/bin/sh`；generic `fallback()` 在 macOS 返回 `/bin/zsh`，其它平台优先 `which("bash")`，否则 `/bin/sh`。[E: packages/core/src/shell.ts:108][E: packages/core/src/shell.ts:109][E: packages/core/src/shell.ts:110][E: packages/core/src/shell.ts:111][E: packages/core/src/shell.ts:132][E: packages/core/src/shell.ts:133][E: packages/core/src/shell.ts:134][E: packages/core/src/shell.ts:136]

`list()` 在 Windows 返回 `win()`，其它平台返回 `unix()`，再过滤 `resolve(s)` 成功的 entries 并映射为 `{ path, name, acceptable }`。[E: packages/core/src/shell.ts:223][E: packages/core/src/shell.ts:224][E: packages/core/src/shell.ts:225][E: packages/core/src/shell.ts:156][E: packages/core/src/shell.ts:160][E: packages/core/src/shell.ts:161][E: packages/core/src/shell.ts:162]

## Command Args Helper

`args(file, command, cwd)` 为 shell-specific invocation 生成参数：nu/fish 用 `-c command`，zsh/bash 用 login shell 并 source rc file、`cd -- "$1"` 后 eval command，cmd 用 `/c`，PowerShell 用 `-NoProfile -Command`，其它 POSIX shell 用 `-c`。[E: packages/core/src/shell.ts:166][E: packages/core/src/shell.ts:168][E: packages/core/src/shell.ts:169][E: packages/core/src/shell.ts:171][E: packages/core/src/shell.ts:176][E: packages/core/src/shell.ts:177][E: packages/core/src/shell.ts:183][E: packages/core/src/shell.ts:185][E: packages/core/src/shell.ts:190][E: packages/core/src/shell.ts:191][E: packages/core/src/shell.ts:197][E: packages/core/src/shell.ts:198][E: packages/core/src/shell.ts:199]

`killTree(proc)` kills child process groups differently by platform：Windows runs `taskkill /pid <pid> /f /t`; POSIX tries `process.kill(-pid, "SIGTERM")`, waits 200ms, then `SIGKILL` if not exited, with fallback to `proc.kill` when group kill fails。[E: packages/core/src/shell.ts:31][E: packages/core/src/shell.ts:35][E: packages/core/src/shell.ts:37][E: packages/core/src/shell.ts:47][E: packages/core/src/shell.ts:49][E: packages/core/src/shell.ts:51][E: packages/core/src/shell.ts:53][E: packages/core/src/shell.ts:54][E: packages/core/src/shell.ts:57]

## Call Sites

V2 PTY `create` uses `Shell.preferred(Config.latest(config.entries(), "shell"))` to select command when no command is supplied; login shells get `-l`, cwd defaults to current Location directory, and env overlays `TERM=xterm-256color` plus `OPENCODE_TERMINAL=1`.[E: packages/core/src/pty.ts:165][E: packages/core/src/pty.ts:167][E: packages/core/src/pty.ts:168][E: packages/core/src/pty.ts:169][E: packages/core/src/pty.ts:173][E: packages/core/src/pty.ts:174]

V2 bash tool does not use `Shell.args`; it reads config entries, picks configured `.shell` or its own `defaultShell()`, and passes the model command to `ChildProcess.make(input.command, [], { shell })`。[E: packages/core/src/tool/bash.ts:150][E: packages/core/src/tool/bash.ts:151][E: packages/core/src/tool/bash.ts:153][E: packages/core/src/tool/bash.ts:154][E: packages/core/src/tool/bash.ts:156]

V1 `ShellTool` now imports `Shell` from `@opencode-ai/core/shell` and uses `Shell.acceptable(cfg.shell)`, `Shell.name(shell)`, and `Shell.ps(shell)` in its legacy tree-sitter/permission flow。[E: packages/opencode/src/tool/shell.ts:15][E: packages/opencode/src/tool/shell.ts:600][E: packages/opencode/src/tool/shell.ts:601][E: packages/opencode/src/tool/shell.ts:619]

## Gotcha

- `core/src/shell.ts` is not a service layer; it exports plain functions and a few resettable module caches.[E: packages/core/src/shell.ts:202][E: packages/core/src/shell.ts:210][E: packages/core/src/shell.ts:219]
- `acceptable()` intentionally rejects fish and nu by metadata, while `preferred()` can still select user `SHELL` for interactive PTY behavior.[E: packages/core/src/shell.ts:16][E: packages/core/src/shell.ts:18][E: packages/core/src/shell.ts:205][E: packages/core/src/shell.ts:214]
- The V2 bash tool still documents TODO parity debt for tree-sitter approvals, BashArity, plugin `shell.env`, progress metadata and durable background jobs.[I][I][I][I][I][I]

## Sources
- packages/core/src/shell.ts
- packages/core/src/tool/bash.ts
- packages/core/src/pty.ts
- packages/opencode/src/tool/shell.ts

## 相关
- [V1 shell 执行](shell-v1.md)
- [V2 bash 工具](shell-v2.md)
- [PTY 子系统](pty.md)
- [Bash/Shell 工具](../../surface/tools/bash.md)
