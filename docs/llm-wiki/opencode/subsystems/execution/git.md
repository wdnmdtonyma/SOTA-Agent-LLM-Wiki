---
id: execution.git
title: Git CLI wrapper
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/git/index.ts
symbols:
  - Git.Service
  - Git.run
  - Git.defaultBranch
  - Git.status
  - Git.patch
related:
  - execution.worktree
  - execution.snapshots
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 Git CLI wrapper 是 `packages/opencode/src/git/index.ts` 的 Effect service：它把 git 命令统一加上 hardened flags，使用 `AppProcess.run` 捕获 stdout/stderr/truncation，并提供 branch/status/diff/patch/applyPatch 等 typed helper。

## 能回答的问题

- 所有 Git wrapper 命令默认带哪些 flags？
- `defaultBranch` 如何从 remote HEAD、init.defaultBranch、main/master 中推断？
- status/diff/stat/patch 对 rename、binary、truncation 如何处理？
- untracked file patch 是怎样用 `git diff --no-index /dev/null` 生成的？
- Git wrapper 与 snapshots/worktree 的关系是什么？

## 职责边界

`Git.Service` 暴露 `run`、`branch`、`prefix`、`defaultBranch`、`hasHead`、`mergeBase`、`show`、`status`、`diff`、`stats`、`patch`、`patchAll`、`patchUntracked`、`statUntracked`、`applyPatch` [E: packages/opencode/src/git/index.ts:76] [E: packages/opencode/src/git/index.ts:90]。它是 V1 package service tag `@opencode/Git`，LayerNode 依赖 `AppProcess.node` [E: packages/opencode/src/git/index.ts:101] [E: packages/opencode/src/git/index.ts:346]。

## Hardened flags

所有 `run(args, opts)` 都会把命令变成 `git ...cfg ...args`，其中 cfg 包含 `--no-optional-locks`、`core.autocrlf=false`、`core.fsmonitor=false`、`core.longpaths=true`、`core.symlinks=true`、`core.quotepath=false` [E: packages/opencode/src/git/index.ts:7] [E: packages/opencode/src/git/index.ts:9] [E: packages/opencode/src/git/index.ts:11] [E: packages/opencode/src/git/index.ts:13] [E: packages/opencode/src/git/index.ts:15] [E: packages/opencode/src/git/index.ts:17] [E: packages/opencode/src/git/index.ts:113]。`run` 使用 `ChildProcess.make("git", ...)`，stdin 默认为 ignore，stdout/stderr pipe，并把 `AppProcess` result 包装成 `Result` [E: packages/opencode/src/git/index.ts:113] [E: packages/opencode/src/git/index.ts:117] [E: packages/opencode/src/git/index.ts:118] [E: packages/opencode/src/git/index.ts:119] [E: packages/opencode/src/git/index.ts:123] [E: packages/opencode/src/git/index.ts:128]。错误被 catch 成 exitCode 1 的 synthetic result，而不是抛出 [E: packages/opencode/src/git/index.ts:131]。

## 控制流与 helper

1. `branch(cwd)` 运行 `symbolic-ref --quiet --short HEAD`，exit code 非 0 返回 undefined [E: packages/opencode/src/git/index.ts:165] [E: packages/opencode/src/git/index.ts:166] [E: packages/opencode/src/git/index.ts:168]。
2. `prefix(cwd)` 运行 `rev-parse --show-prefix`，失败返回空字符串 [E: packages/opencode/src/git/index.ts:172] [E: packages/opencode/src/git/index.ts:173] [E: packages/opencode/src/git/index.ts:174]。
3. `defaultBranch(cwd)` 先选 primary remote：优先 `origin`，只有一个 remote 时用它，其次 `upstream`，最后第一个 remote [E: packages/opencode/src/git/index.ts:157] [E: packages/opencode/src/git/index.ts:158] [E: packages/opencode/src/git/index.ts:159] [E: packages/opencode/src/git/index.ts:160] [E: packages/opencode/src/git/index.ts:161]。
4. 若 remote 存在，`defaultBranch` 读取 `refs/remotes/<remote>/HEAD` 并去掉 `refs/remotes/` 前缀；失败后查本地 heads，再试 `init.defaultBranch`、`main`、`master` [E: packages/opencode/src/git/index.ts:180] [E: packages/opencode/src/git/index.ts:182] [E: packages/opencode/src/git/index.ts:188] [E: packages/opencode/src/git/index.ts:189] [E: packages/opencode/src/git/index.ts:191] [E: packages/opencode/src/git/index.ts:192]。
5. `status(cwd)` 使用 `status --porcelain=v1 --untracked-files=all --no-renames -z -- .`，按 NUL 拆分后取前两位 status code 和 file [E: packages/opencode/src/git/index.ts:217] [E: packages/opencode/src/git/index.ts:221] [E: packages/opencode/src/git/index.ts:223] [E: packages/opencode/src/git/index.ts:224]。
6. `diff(cwd, ref)` 使用 `git diff --no-ext-diff --no-renames --name-status -z ref -- .`，按 pair 解析 status code 与 file [E: packages/opencode/src/git/index.ts:230] [E: packages/opencode/src/git/index.ts:232] [E: packages/opencode/src/git/index.ts:234] [E: packages/opencode/src/git/index.ts:236]。
7. `stats(cwd, ref)` 使用 `--numstat -z`，binary `-` 统计为 0 additions/deletions [E: packages/opencode/src/git/index.ts:242] [E: packages/opencode/src/git/index.ts:251] [E: packages/opencode/src/git/index.ts:252]。
8. `patch` 和 `patchAll` 用 `git diff --patch --no-ext-diff --no-renames --unified=<context>`；单文件 patch 若 output truncated 返回空 text 且 `truncated: true` [E: packages/opencode/src/git/index.ts:265] [E: packages/opencode/src/git/index.ts:268] [E: packages/opencode/src/git/index.ts:273] [E: packages/opencode/src/git/index.ts:276]。
9. `patchUntracked` 用 `git diff --no-index --patch ... /dev/null file` 生成新文件 patch，truncated 时返回空 text [E: packages/opencode/src/git/index.ts:284] [E: packages/opencode/src/git/index.ts:287] [E: packages/opencode/src/git/index.ts:288] [E: packages/opencode/src/git/index.ts:293] [E: packages/opencode/src/git/index.ts:294] [E: packages/opencode/src/git/index.ts:298]。
10. `applyPatch` 运行 `git apply -`，stdin 是 patch 文本编码 stream [E: packages/opencode/src/git/index.ts:323]।

## status kind 归类

`kind(code)` 把 `??` 和纯 add 归为 `"added"`，包含 `U` 归为 `"modified"`，包含 `D` 且不含 `A` 归为 `"deleted"`，其它都归为 `"modified"` [E: packages/opencode/src/git/index.ts:94] [E: packages/opencode/src/git/index.ts:95] [E: packages/opencode/src/git/index.ts:96] [E: packages/opencode/src/git/index.ts:97] [E: packages/opencode/src/git/index.ts:98]。因此 rename 因为 wrapper 使用 `--no-renames` 禁用 rename detection，会表现成 delete/add 或 modified，而不是单独 rename kind [I]。

## 设计动机与权衡

Git wrapper 把 opencode 内部的 git usage 统一到同一套 flags，减少 fsmonitor、autocrlf、quotepath、longpaths 和 optional locks 带来的跨平台差异 [I]。它不试图成为完整 Git abstraction；复杂操作如 shadow snapshot 仍在 snapshot service 中直接构造 `--git-dir`/`--work-tree` 命令，因为 snapshot 需要独立 gitdir 语义。

## Gotcha

- `run` 的错误不会 throw；调用方必须检查 `exitCode`。
- `show` 检测 stdout 中含 NUL 时返回空字符串，避免 binary 内容进入文本通道 [E: packages/opencode/src/git/index.ts:211]。
- patch truncation 对单文件返回空 text，调用方要看 `truncated`。
- 这个 wrapper 是 V1 service；V2 core 没有等价默认 Git service 节点。

## Sources

- packages/opencode/src/git/index.ts

## 相关

- [Worktree 管理](worktree.md)
- [Snapshots & Revert](snapshots.md)
