---
id: execution.worktree
title: Worktree 管理(agent sandbox)
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/worktree/index.ts
symbols:
  - Worktree.Service
  - Worktree.makeWorktreeInfo
  - Worktree.createFromInfo
  - Worktree.remove
  - Worktree.reset
related:
  - execution.git
  - server.control-plane
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 Worktree 管理把 agent sandbox 映射为 git worktree：目录位于 `Global.Path.data/worktree/<project-id>/<slug>`，默认 branch 是 `opencode/<name>`，创建后异步 checkout/bootstrap，移除和 reset 会清理 worktree、branch、submodule 与 start scripts。

## 能回答的问题

- opencode worktree sandbox 目录和 branch 名如何生成？
- create 是同步完成还是异步 bootstrap？
- worktree remove 如何处理 stale entry、branch deletion 和 fsmonitor？
- reset 为什么会拒绝 primary workspace？
- startCommand 和 project start command 在哪里执行？

## 职责边界

`Worktree.Service` 暴露 `makeWorktreeInfo`、`createFromInfo`、`create`、`list`、`remove`、`reset` [E: packages/opencode/src/worktree/index.ts:136] [E: packages/opencode/src/worktree/index.ts:137] [E: packages/opencode/src/worktree/index.ts:138] [E: packages/opencode/src/worktree/index.ts:139] [E: packages/opencode/src/worktree/index.ts:140] [E: packages/opencode/src/worktree/index.ts:141]。`Info` 包含 `name`、可选 `branch`、`directory`；`CreateInput` 可带 `name` 和额外 `startCommand` [E: packages/opencode/src/worktree/index.ts:40] [E: packages/opencode/src/worktree/index.ts:41] [E: packages/opencode/src/worktree/index.ts:42] [E: packages/opencode/src/worktree/index.ts:47] [E: packages/opencode/src/worktree/index.ts:48] [E: packages/opencode/src/worktree/index.ts:49]。服务只支持 git project；非 git 会抛 `WorktreeNotGitError` [E: packages/opencode/src/worktree/index.ts:220] [E: packages/opencode/src/worktree/index.ts:221]。

## 名称、目录、branch

`makeWorktreeInfo` 使用根目录 `Global.Path.data/worktree/<project-id>`，确保目录存在后调用 `candidate`，用户传入的 name 会先经过 `slugify` [E: packages/opencode/src/worktree/index.ts:224] [E: packages/opencode/src/worktree/index.ts:225] [E: packages/opencode/src/worktree/index.ts:227]。`candidate` 最多尝试 26 次：冲突后追加 `Slug.create()`；未 detached 时 branch 是 `opencode/<name>`，目录是 root/name [E: packages/opencode/src/worktree/index.ts:190] [E: packages/opencode/src/worktree/index.ts:197] [E: packages/opencode/src/worktree/index.ts:198] [E: packages/opencode/src/worktree/index.ts:199] [E: packages/opencode/src/worktree/index.ts:200]。如果目录已存在或 branch ref 已存在，candidate 会继续尝试 [E: packages/opencode/src/worktree/index.ts:202] [E: packages/opencode/src/worktree/index.ts:206] [E: packages/opencode/src/worktree/index.ts:207]。

`slugify` 会 trim、lowercase，把非 `[a-z0-9]` 折成 `-`，并去掉首尾 `-` [E: packages/opencode/src/worktree/index.ts:108] [E: packages/opencode/src/worktree/index.ts:109] [E: packages/opencode/src/worktree/index.ts:110] [E: packages/opencode/src/worktree/index.ts:111] [E: packages/opencode/src/worktree/index.ts:112] [E: packages/opencode/src/worktree/index.ts:113]。

## 创建与 bootstrap

1. `create(input)` 调用 `makeWorktreeInfo({ name })`，再 `createFromInfo(info, startCommand)`，最后返回 info [E: packages/opencode/src/worktree/index.ts:306] [E: packages/opencode/src/worktree/index.ts:307] [E: packages/opencode/src/worktree/index.ts:308]。
2. `setup(info)` 在当前 worktree 下运行 `git worktree add --no-checkout -b <branch> <directory>`；detached 时用 `--detach <directory> HEAD` [E: packages/opencode/src/worktree/index.ts:232] [E: packages/opencode/src/worktree/index.ts:234] [E: packages/opencode/src/worktree/index.ts:235]。
3. `setup` 成功后调用 `project.addSandbox(project.id, info.directory)`，把 sandbox 注册到 project [E: packages/opencode/src/worktree/index.ts:244]。
4. `createFromInfo` 同步完成 setup，但把 `boot(info, startCommand)` fork 到 service scope；因此 checkout/bootstrap/start scripts 是异步的 [E: packages/opencode/src/worktree/index.ts:298] [E: packages/opencode/src/worktree/index.ts:299] [E: packages/opencode/src/worktree/index.ts:300] [E: packages/opencode/src/worktree/index.ts:301]。
5. `boot` 先在新目录运行 `git reset --hard` 填充 worktree，失败时 emit `worktree.failed` 到 `GlobalBus` [E: packages/opencode/src/worktree/index.ts:253] [E: packages/opencode/src/worktree/index.ts:257]。
6. checkout 成功后，`store.load({ directory })` 建立 instance；失败也 emit `worktree.failed` [E: packages/opencode/src/worktree/index.ts:266] [E: packages/opencode/src/worktree/index.ts:272]。
7. bootstrap 成功后 emit `worktree.ready`，再运行 project start command 与额外 start command [E: packages/opencode/src/worktree/index.ts:284] [E: packages/opencode/src/worktree/index.ts:294]。

## list/remove/reset

`list` 只在 git project 中运行 `git worktree list --porcelain`，解析 `worktree` 和 `branch` 行，过滤 primary worktree，并把 branch 去掉 `refs/heads/` 前缀 [E: packages/opencode/src/worktree/index.ts:351] [E: packages/opencode/src/worktree/index.ts:355] [E: packages/opencode/src/worktree/index.ts:362] [E: packages/opencode/src/worktree/index.ts:366] [E: packages/opencode/src/worktree/index.ts:371]。

`remove` 会 canonicalize 目标目录；如果不是当前 worktree，会先 `store.disposeDirectory` [E: packages/opencode/src/worktree/index.ts:410] [E: packages/opencode/src/worktree/index.ts:413]。如果 git list 找不到 entry 但目录存在，它会 stop fsmonitor 并直接删除目录 [E: packages/opencode/src/worktree/index.ts:423] [E: packages/opencode/src/worktree/index.ts:426] [E: packages/opencode/src/worktree/index.ts:427]。找到 entry 时，它调用 `git worktree remove --force`，然后 `cleanDirectory(entry.path)`，最后如果 entry 有 branch，就 `git branch -D <branch>` [E: packages/opencode/src/worktree/index.ts:435] [E: packages/opencode/src/worktree/index.ts:452] [E: packages/opencode/src/worktree/index.ts:454] [E: packages/opencode/src/worktree/index.ts:456]。

`reset` 拒绝 primary workspace，必须找到 default branch；remote default branch 会先 fetch，然后在 worktree 里 `reset --hard base.ref`，`clean -ffdx`，强制更新 submodules，再确认 `status --porcelain=v1` 为空 [E: packages/opencode/src/worktree/index.ts:548] [E: packages/opencode/src/worktree/index.ts:550] [E: packages/opencode/src/worktree/index.ts:565] [E: packages/opencode/src/worktree/index.ts:574] [E: packages/opencode/src/worktree/index.ts:581] [E: packages/opencode/src/worktree/index.ts:531] [E: packages/opencode/src/worktree/index.ts:538] [E: packages/opencode/src/worktree/index.ts:594] [E: packages/opencode/src/worktree/index.ts:600] [E: packages/opencode/src/worktree/index.ts:606] [E: packages/opencode/src/worktree/index.ts:612] [E: packages/opencode/src/worktree/index.ts:617]。reset 成功后异步运行 start scripts [E: packages/opencode/src/worktree/index.ts:621] [E: packages/opencode/src/worktree/index.ts:623]。

## Start scripts

`runStartScripts` 从 `ProjectTable` 读 project row，取 `project?.commands?.start` 作为 project startup，再运行 input.extra 作为 worktree start command [E: packages/opencode/src/worktree/index.ts:501] [E: packages/opencode/src/worktree/index.ts:508] [E: packages/opencode/src/worktree/index.ts:511]。执行 shell 在 Windows 是 `cmd /c`，其它平台是 `bash -lc` [E: packages/opencode/src/worktree/index.ts:479]。

## 设计动机与权衡

Worktree sandbox 让子任务或控制平面能在同一 git repo 上隔离文件改动，同时仍共享 Git object database 和 repo history [I]。代价是生命周期要同时管理 git worktree entry、branch、directory、instance store 和 start scripts；因此 remove/reset 逻辑比单纯删除目录复杂。

## Gotcha

- create 返回 info 不等于 sandbox ready；ready/failed 通过 `GlobalBus` event 发出。
- reset 不允许 primary workspace，避免把用户当前主工作区清空。
- remove 会删除 `opencode/<name>` branch；不要把 sandbox branch 当长期用户分支。
- `packages/cli` 的 lildax 新 CLI host 与 `packages/opencode/src/cli` 并存；worktree service 在 V1 opencode package 内。

## Sources

- packages/opencode/src/worktree/index.ts

## 相关

- [Git CLI wrapper](git.md)
- [Control Plane / Workspaces](../server/control-plane.md)
