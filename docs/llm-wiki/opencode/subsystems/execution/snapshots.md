---
id: execution.snapshots
title: Snapshots & Revert(shadow git)
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/snapshot/index.ts
  - packages/opencode/src/session/revert.ts
symbols:
  - Snapshot.Service
  - Snapshot.track
  - Snapshot.patch
  - Snapshot.restore
  - Snapshot.revert
  - SessionRevert.revert
related:
  - execution.git
  - session-v1.store
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V1 snapshots 是一个 shadow git 子系统：每个 worktree 对应 `Global.Path.data/snapshot/<project-id>/<hash(worktree)>` 下的独立 git dir，通过 `--git-dir`/`--work-tree` 和 `objects/info/alternates` 记录、diff、restore、revert 用户会话修改。

## 能回答的问题

- opencode 的 snapshot 为什么不是直接用源仓 `.git`？
- `objects/info/alternates` 在 snapshot 中起什么作用？
- `track`、`patch`、`restore`、`revert` 分别做什么？
- session revert 如何决定删哪些消息和还原哪些文件？
- snapshot 对 ignored/large files 有哪些处理？

## 职责边界

`Snapshot.Service` 暴露 `init`、`cleanup`、`track`、`patch`、`restore`、`revert`、`diff`、`diffFull` [E: packages/opencode/src/snapshot/index.ts:45] [E: packages/opencode/src/snapshot/index.ts:46] [E: packages/opencode/src/snapshot/index.ts:47] [E: packages/opencode/src/snapshot/index.ts:48] [E: packages/opencode/src/snapshot/index.ts:49] [E: packages/opencode/src/snapshot/index.ts:50] [E: packages/opencode/src/snapshot/index.ts:51] [E: packages/opencode/src/snapshot/index.ts:52]。状态按 instance 生成：`directory` 是当前 directory，`worktree` 是 project worktree，`gitdir` 是 `Global.Path.data/snapshot/<project-id>/<Hash.fast(worktree)>`，`vcs` 来自 project [E: packages/opencode/src/snapshot/index.ts:77] [E: packages/opencode/src/snapshot/index.ts:78] [E: packages/opencode/src/snapshot/index.ts:79] [E: packages/opencode/src/snapshot/index.ts:80]。服务只在 `state.vcs === "git"` 且 config `snapshot !== false` 时启用 [E: packages/opencode/src/snapshot/index.ts:167] [E: packages/opencode/src/snapshot/index.ts:168]。

## Shadow git 结构

所有 snapshot git 命令通过 `args(cmd)` 注入 `--git-dir state.gitdir --work-tree state.worktree` [E: packages/opencode/src/snapshot/index.ts:83]。这让 snapshot 使用独立 index/tree，但工作区指向真实 worktree。初始化时，`track` 若发现 `state.gitdir` 不存在，会 `git init` 并设置 `core.autocrlf=false`、`core.longpaths=true`、`core.symlinks=true`、`core.fsmonitor=false`、`feature.manyFiles=true`、index v4、untrackedCache 等 [E: packages/opencode/src/snapshot/index.ts:321] [E: packages/opencode/src/snapshot/index.ts:324] [E: packages/opencode/src/snapshot/index.ts:327] [E: packages/opencode/src/snapshot/index.ts:328] [E: packages/opencode/src/snapshot/index.ts:329] [E: packages/opencode/src/snapshot/index.ts:330] [E: packages/opencode/src/snapshot/index.ts:332] [E: packages/opencode/src/snapshot/index.ts:333] [E: packages/opencode/src/snapshot/index.ts:335]。

`seed` 会查源仓 `git-common-dir`，把源仓 `objects` 和源仓已有 alternates 中仍存在的路径写入 snapshot gitdir 的 `objects/info/alternates` [E: packages/opencode/src/snapshot/index.ts:200] [E: packages/opencode/src/snapshot/index.ts:210] [E: packages/opencode/src/snapshot/index.ts:211] [E: packages/opencode/src/snapshot/index.ts:217] [E: packages/opencode/src/snapshot/index.ts:223]。这可以被理解为复用源仓 object database，降低 shadow git 初次追踪大仓库时的对象重算成本 [I]。如果源仓 index 存在，`seed` 还 best-effort copy 到 shadow git index [E: packages/opencode/src/snapshot/index.ts:228] [E: packages/opencode/src/snapshot/index.ts:230]。

## 控制流

1. `track` 在 lock 内确认 enabled，创建 gitdir，初始化 shadow git 后调用 `add()`，再 `write-tree` 返回 tree hash [E: packages/opencode/src/snapshot/index.ts:318] [E: packages/opencode/src/snapshot/index.ts:320] [E: packages/opencode/src/snapshot/index.ts:322] [E: packages/opencode/src/snapshot/index.ts:324] [E: packages/opencode/src/snapshot/index.ts:339] [E: packages/opencode/src/snapshot/index.ts:340]।
2. `add` 同步 exclude 文件，分别运行 `diff-files --name-only -z` 与 `ls-files --others --exclude-standard -z` 找 tracked/untracked candidates [E: packages/opencode/src/snapshot/index.ts:235] [E: packages/opencode/src/snapshot/index.ts:238] [E: packages/opencode/src/snapshot/index.ts:241]。
3. `add` 用源仓 ignore rules 检查 candidates；新变成 ignored 的文件会从 snapshot index drop，避免 re-add [E: packages/opencode/src/snapshot/index.ts:264] [E: packages/opencode/src/snapshot/index.ts:267] [E: packages/opencode/src/snapshot/index.ts:270]。
4. `add` 把大于 2MiB 的 untracked files 加入 exclude block，避免 snapshot 初次追踪过大 untracked 文件 [E: packages/opencode/src/snapshot/index.ts:32] [E: packages/opencode/src/snapshot/index.ts:276] [E: packages/opencode/src/snapshot/index.ts:286]。
5. `patch(hash)` 先 `add()` 刷新 index，再 diff cached names against hash，过滤 ignored removals，返回 absolute normalized files [E: packages/opencode/src/snapshot/index.ts:351] [E: packages/opencode/src/snapshot/index.ts:353] [E: packages/opencode/src/snapshot/index.ts:369] [E: packages/opencode/src/snapshot/index.ts:373] [E: packages/opencode/src/snapshot/index.ts:375]。
6. `restore(snapshot)` 用 `read-tree snapshot` 加载 shadow tree，再 `checkout-index -a -f` 写回 worktree [E: packages/opencode/src/snapshot/index.ts:385] [E: packages/opencode/src/snapshot/index.ts:387]。
7. `revert(patches)` 对每个 patch file 去重，按 hash/file 还原；如果文件在 snapshot tree 不存在，则删除当前文件 [E: packages/opencode/src/snapshot/index.ts:410] [E: packages/opencode/src/snapshot/index.ts:412] [E: packages/opencode/src/snapshot/index.ts:413] [E: packages/opencode/src/snapshot/index.ts:416] [E: packages/opencode/src/snapshot/index.ts:418] [E: packages/opencode/src/snapshot/index.ts:419] [E: packages/opencode/src/snapshot/index.ts:426] [E: packages/opencode/src/snapshot/index.ts:430] [E: packages/opencode/src/snapshot/index.ts:433] [E: packages/opencode/src/snapshot/index.ts:441]。
8. `diff(hash)` 与 `diffFull(from, to)` 都在 lock 内先刷新或读取 shadow git，`diffFull` 使用 `git diff --name-status`、`--numstat` 和 `cat-file --batch` 批量生成 per-file full patch [E: packages/opencode/src/snapshot/index.ts:526] [E: packages/opencode/src/snapshot/index.ts:528] [E: packages/opencode/src/snapshot/index.ts:546] [E: packages/opencode/src/snapshot/index.ts:603] [E: packages/opencode/src/snapshot/index.ts:687] [E: packages/opencode/src/snapshot/index.ts:699]。

## SessionRevert 集成

`SessionRevert.revert` 先 `state.assertNotBusy(sessionID)`，避免运行中 session 被回滚 [E: packages/opencode/src/session/revert.ts:39]。它扫描 session messages，从目标 message/part 之后收集 `part.type === "patch"` 的 snapshot patch entries [E: packages/opencode/src/session/revert.ts:46] [E: packages/opencode/src/session/revert.ts:51]。第一次 revert 时会保存 `rev.snapshot = session.revert?.snapshot ?? snap.track()`；已有 revert snapshot 时先 restore，再 `snap.revert(patches)` [E: packages/opencode/src/session/revert.ts:70] [E: packages/opencode/src/session/revert.ts:71] [E: packages/opencode/src/session/revert.ts:72]。之后计算 diff summary、写 `session_diff` storage、publish `Session.Event.Diff`，并把 revert summary 写回 session [E: packages/opencode/src/session/revert.ts:73] [E: packages/opencode/src/session/revert.ts:76] [E: packages/opencode/src/session/revert.ts:78]。

`unrevert` 会 restore 保存的 snapshot 并 clear revert state [E: packages/opencode/src/session/revert.ts:95] [E: packages/opencode/src/session/revert.ts:96]。`cleanup` 会删除 revert target 之后的 messages 或 parts，然后 clear revert [E: packages/opencode/src/session/revert.ts:119] [E: packages/opencode/src/session/revert.ts:129] [E: packages/opencode/src/session/revert.ts:133]。

## 设计动机与权衡

shadow git 的设计目标是复用 git tree/index/diff 能力，又不污染用户源仓 `.git`。`--git-dir`/`--work-tree` 提供隔离，`alternates` 复用对象库降低大仓库成本 [I]。权衡是它仍依赖 git CLI 和文件系统当前状态，因此所有核心操作都用 per-gitdir semaphore lock 包起来 [E: packages/opencode/src/snapshot/index.ts:63] [E: packages/opencode/src/snapshot/index.ts:164]。

## Gotcha

- snapshot `hash` 是 shadow git tree hash，不是 commit hash。
- ignored file removals 会从 user-facing patch/diff 里隐藏。
- untracked 大文件可能被 exclude，不保证 snapshot 捕捉所有大文件内容。
- V2 `FileMutation` 暴露的是 create/write/writeTextPreservingBom/writeIfUnchanged/remove primitives，没有 snapshot/undo primitive；不要把 V1 snapshot 视为 V2 core 已接通 [E: packages/core/src/file-mutation.ts:170] [I]。

## Sources

- packages/opencode/src/snapshot/index.ts
- packages/opencode/src/session/revert.ts
- packages/core/src/file-mutation.ts

## 相关

- [Git CLI wrapper](git.md)
- [Session/message/part 存储与转换](../session-v1/store.md)
