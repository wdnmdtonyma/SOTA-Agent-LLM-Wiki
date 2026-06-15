---
id: subsys.platform.git-utils
title: Git utils
kind: subsystem
tier: T2
source: [codex-rs/git-utils/src/lib.rs, codex-rs/git-utils/src/info.rs, codex-rs/git-utils/src/branch.rs, codex-rs/git-utils/src/apply.rs, codex-rs/git-utils/src/operations.rs, codex-rs/git-utils/src/ghost_commits.rs, codex-rs/git-utils/src/errors.rs, codex-rs/git-utils/src/platform.rs]
symbols: [GitInfo, collect_git_info, ApplyGitRequest, ApplyGitResult, apply_git_patch, extract_paths_from_patch, stage_paths, merge_base_with_head, create_ghost_commit, create_symlink]
related: [subsys.cloud.cloud-tasks, subsys.cloud.cloud-task-api, subsys.core.ghost-undo]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex_git_utils` 是 Codex 的 Git 支撑 crate：`lib.rs` 对外导出 patch apply、merge-base、git metadata、ghost commit 和 symlink helpers，同时把 `operations.rs` 保持为 crate-private 内部执行层。[E: codex-rs/git-utils/src/lib.rs:9][E: codex-rs/git-utils/src/lib.rs:15][E: codex-rs/git-utils/src/lib.rs:25][E: codex-rs/git-utils/src/lib.rs:34][E: codex-rs/git-utils/src/lib.rs:46][E: codex-rs/git-utils/src/operations.rs:10]

## 能回答的问题

- `codex_git_utils` 当前实际 re-export 哪些 public API？
- `collect_git_info` 返回哪些字段，怎样并行读取 git metadata？
- Cloud task apply 怎样通过 `apply_git_patch` 调用 system `git apply`？
- `merge_base_with_head` 怎样处理 HEAD、branch ref 和 upstream ahead？
- ghost commit snapshot 的 public option/report types 有哪些？
- symlink helper 在 Unix 与 Windows 分支上的差异是什么？

## 职责边界

git-utils 节点覆盖 `codex-rs/git-utils` crate 的 public API 与支撑性 crate-private helpers。`operations.rs` 的 `ensure_git_repository`、`resolve_head`、`resolve_repository_root`、`run_git_for_status` 和 `run_git_for_stdout` 都是 `pub(crate)`，供 branch/ghost commit 等模块内部复用，不是 crate 外部 API。[E: codex-rs/git-utils/src/operations.rs:10][E: codex-rs/git-utils/src/operations.rs:32][E: codex-rs/git-utils/src/operations.rs:80][E: codex-rs/git-utils/src/operations.rs:133][E: codex-rs/git-utils/src/operations.rs:146]

`GitToolingError` 是 branch/operations/ghost/platform helpers 使用的结构化错误类型；`apply_git_patch` 自身返回 `std::io::Result<ApplyGitResult>`，`collect_git_info` 返回 `Option<GitInfo>`。[E: codex-rs/git-utils/src/errors.rs:10][E: codex-rs/git-utils/src/branch.rs:18][E: codex-rs/git-utils/src/apply.rs:41][E: codex-rs/git-utils/src/info.rs:67]

## Public exports

`lib.rs` re-export `ApplyGitRequest`、`ApplyGitResult`、`apply_git_patch`、`extract_paths_from_patch`、`parse_git_apply_output` 和 `stage_paths`。[E: codex-rs/git-utils/src/lib.rs:9][E: codex-rs/git-utils/src/lib.rs:10][E: codex-rs/git-utils/src/lib.rs:11][E: codex-rs/git-utils/src/lib.rs:12][E: codex-rs/git-utils/src/lib.rs:13][E: codex-rs/git-utils/src/lib.rs:14] branch 与 ghost commit exports 包括 `merge_base_with_head`、`CreateGhostCommitOptions`、`GhostSnapshotConfig`、`GhostSnapshotReport`、`capture_ghost_snapshot_report` 和 `create_ghost_commit`。[E: codex-rs/git-utils/src/lib.rs:15][E: codex-rs/git-utils/src/lib.rs:19][E: codex-rs/git-utils/src/lib.rs:20][E: codex-rs/git-utils/src/lib.rs:21][E: codex-rs/git-utils/src/lib.rs:25][E: codex-rs/git-utils/src/lib.rs:26]

info exports 包括 `GitInfo`、`collect_git_info`、branch/default branch helpers、remote URL helpers、repo root、HEAD hash、dirty-state、remote diff、local branches、recent commits 和 trust-root resolution。[E: codex-rs/git-utils/src/lib.rs:33][E: codex-rs/git-utils/src/lib.rs:34][E: codex-rs/git-utils/src/lib.rs:35][E: codex-rs/git-utils/src/lib.rs:36][E: codex-rs/git-utils/src/lib.rs:37][E: codex-rs/git-utils/src/lib.rs:39][E: codex-rs/git-utils/src/lib.rs:40][E: codex-rs/git-utils/src/lib.rs:41][E: codex-rs/git-utils/src/lib.rs:42][E: codex-rs/git-utils/src/lib.rs:43][E: codex-rs/git-utils/src/lib.rs:44][E: codex-rs/git-utils/src/lib.rs:45]

## Git metadata

`GitInfo` 只包含 `commit_hash`、`branch` 和 `repository_url` 三个 optional 字段，不包含 working-tree dirty state 或 recent commits。[E: codex-rs/git-utils/src/info.rs:45][E: codex-rs/git-utils/src/info.rs:48][E: codex-rs/git-utils/src/info.rs:51][E: codex-rs/git-utils/src/info.rs:54] `collect_git_info` 先用 `git rev-parse --git-dir` 判断当前目录是否在 git repo 中，失败时返回 `None`。[E: codex-rs/git-utils/src/info.rs:67][E: codex-rs/git-utils/src/info.rs:69][E: codex-rs/git-utils/src/info.rs:74][E: codex-rs/git-utils/src/info.rs:75]

repo check 通过后，`collect_git_info` 用 `tokio::join!` 并行执行 `git rev-parse HEAD`、`git rev-parse --abbrev-ref HEAD` 和 `git remote get-url origin`，再分别填充 commit、branch 和 repository URL。[E: codex-rs/git-utils/src/info.rs:79][E: codex-rs/git-utils/src/info.rs:80][E: codex-rs/git-utils/src/info.rs:81][E: codex-rs/git-utils/src/info.rs:82][E: codex-rs/git-utils/src/info.rs:96][E: codex-rs/git-utils/src/info.rs:106][E: codex-rs/git-utils/src/info.rs:115]

`get_git_repo_root` 是 filesystem walk：它从 base path 或 parent 往上找 `.git` entry，不要求调用 git binary。[E: codex-rs/git-utils/src/info.rs:32][E: codex-rs/git-utils/src/info.rs:33][E: codex-rs/git-utils/src/info.rs:36][E: codex-rs/git-utils/src/info.rs:38] `run_git_command_with_timeout` 只存在于 `info.rs` 的 metadata helpers 中，设置 `GIT_OPTIONAL_LOCKS=0`、`kill_on_drop(true)` 并用 5 秒 timeout 包住 command output。[E: codex-rs/git-utils/src/info.rs:42][E: codex-rs/git-utils/src/info.rs:272][E: codex-rs/git-utils/src/info.rs:275][E: codex-rs/git-utils/src/info.rs:278][E: codex-rs/git-utils/src/info.rs:279]

## Patch apply

`ApplyGitRequest` 字段是 `cwd`、`diff`、`revert`、`preflight`；`ApplyGitResult` 字段是 `exit_code`、`applied_paths`、`skipped_paths`、`conflicted_paths`、`stdout`、`stderr` 和 `cmd_for_log`。[E: codex-rs/git-utils/src/apply.rs:18][E: codex-rs/git-utils/src/apply.rs:19][E: codex-rs/git-utils/src/apply.rs:20][E: codex-rs/git-utils/src/apply.rs:21][E: codex-rs/git-utils/src/apply.rs:22][E: codex-rs/git-utils/src/apply.rs:28][E: codex-rs/git-utils/src/apply.rs:29][E: codex-rs/git-utils/src/apply.rs:30][E: codex-rs/git-utils/src/apply.rs:31][E: codex-rs/git-utils/src/apply.rs:32][E: codex-rs/git-utils/src/apply.rs:33][E: codex-rs/git-utils/src/apply.rs:34]

`apply_git_patch` 先通过 `git rev-parse --show-toplevel` 解析 repo root，再把 diff 写入临时 patch 文件；`revert && !preflight` 时会先对 diff 中仍存在的路径执行 best-effort staging。[E: codex-rs/git-utils/src/apply.rs:41][E: codex-rs/git-utils/src/apply.rs:42][E: codex-rs/git-utils/src/apply.rs:45][E: codex-rs/git-utils/src/apply.rs:49][E: codex-rs/git-utils/src/apply.rs:51][E: codex-rs/git-utils/src/apply.rs:127][E: codex-rs/git-utils/src/apply.rs:128][E: codex-rs/git-utils/src/apply.rs:129][E: codex-rs/git-utils/src/apply.rs:130] normal apply 使用 `git apply --3way`，`CODEX_APPLY_GIT_CFG` 环境变量可追加 `git -c key=value` 配置片段。[E: codex-rs/git-utils/src/apply.rs:55][E: codex-rs/git-utils/src/apply.rs:62][E: codex-rs/git-utils/src/apply.rs:68][E: codex-rs/git-utils/src/apply.rs:69]

preflight 路径使用 `git apply --check`，不会修改 working tree；preflight 和 normal apply 都会解析 stdout/stderr，排序并去重 applied/skipped/conflicted paths。[E: codex-rs/git-utils/src/apply.rs:76][E: codex-rs/git-utils/src/apply.rs:77][E: codex-rs/git-utils/src/apply.rs:83][E: codex-rs/git-utils/src/apply.rs:84][E: codex-rs/git-utils/src/apply.rs:87][E: codex-rs/git-utils/src/apply.rs:106][E: codex-rs/git-utils/src/apply.rs:109] `extract_paths_from_patch` 只读取 `diff --git` header 中的 a/b path，`stage_paths` 只 stage 磁盘上实际存在的路径并且不因 `git add` 非零退出而 hard fail。[E: codex-rs/git-utils/src/apply.rs:194][E: codex-rs/git-utils/src/apply.rs:198][E: codex-rs/git-utils/src/apply.rs:204][E: codex-rs/git-utils/src/apply.rs:207][E: codex-rs/git-utils/src/apply.rs:320][E: codex-rs/git-utils/src/apply.rs:325][E: codex-rs/git-utils/src/apply.rs:338][E: codex-rs/git-utils/src/apply.rs:341]

## Branch 与 ghost commits

`merge_base_with_head` 先要求 repo 有效、解析 repo root 和 HEAD；没有 HEAD 或 branch ref 解析失败时返回 `Ok(None)`。[E: codex-rs/git-utils/src/branch.rs:15][E: codex-rs/git-utils/src/branch.rs:19][E: codex-rs/git-utils/src/branch.rs:20][E: codex-rs/git-utils/src/branch.rs:21][E: codex-rs/git-utils/src/branch.rs:23][E: codex-rs/git-utils/src/branch.rs:26][E: codex-rs/git-utils/src/branch.rs:27] 如果 upstream branch 远端 ahead，函数会优先对 upstream ref 求 merge-base，否则使用本地 branch ref。[E: codex-rs/git-utils/src/branch.rs:30][E: codex-rs/git-utils/src/branch.rs:31][E: codex-rs/git-utils/src/branch.rs:32][E: codex-rs/git-utils/src/branch.rs:37][E: codex-rs/git-utils/src/branch.rs:47][E: codex-rs/git-utils/src/branch.rs:112]

ghost commit API 暴露创建/恢复 options、snapshot config、snapshot report 和 large untracked report types；默认 config 会忽略大于 10 MiB 的 untracked files 和至少 200 个 untracked files 的 directories。[E: codex-rs/git-utils/src/ghost_commits.rs:27][E: codex-rs/git-utils/src/ghost_commits.rs:29][E: codex-rs/git-utils/src/ghost_commits.rs:51][E: codex-rs/git-utils/src/ghost_commits.rs:59][E: codex-rs/git-utils/src/ghost_commits.rs:65][E: codex-rs/git-utils/src/ghost_commits.rs:83][E: codex-rs/git-utils/src/ghost_commits.rs:90][E: codex-rs/git-utils/src/ghost_commits.rs:97][E: codex-rs/git-utils/src/ghost_commits.rs:74][E: codex-rs/git-utils/src/ghost_commits.rs:75] `create_ghost_commit` 调用 `create_ghost_commit_with_report` 并只返回 commit，`capture_ghost_snapshot_report` 只计算 snapshot report。[E: codex-rs/git-utils/src/ghost_commits.rs:255][E: codex-rs/git-utils/src/ghost_commits.rs:258][E: codex-rs/git-utils/src/ghost_commits.rs:262][E: codex-rs/git-utils/src/ghost_commits.rs:265]

## 设计动机与权衡

git-utils 把多类 system git 调用集中在同一 crate 下，但保留不同调用面的错误语义：apply 使用 `io::Result`，metadata collection 使用 `Option`，branch/ghost/platform helpers 使用 `GitToolingError`。[I] 这个分层由 `lib.rs` 的 public re-export 和各入口函数签名共同体现。[E: codex-rs/git-utils/src/lib.rs:9][E: codex-rs/git-utils/src/lib.rs:15][E: codex-rs/git-utils/src/lib.rs:25][E: codex-rs/git-utils/src/apply.rs:41][E: codex-rs/git-utils/src/info.rs:67][E: codex-rs/git-utils/src/branch.rs:18][E: codex-rs/git-utils/src/errors.rs:10]

`collect_git_info` 选择返回 `Option<GitInfo>` 而不是错误，适合 telemetry/context 这类 best-effort metadata；branch/ghost/platform helpers 返回 `GitToolingError`，适合需要把失败原因交给调用方处理的 mutating 或 repository-sensitive 操作。[I] 这个差异由函数签名体现。[E: codex-rs/git-utils/src/info.rs:67][E: codex-rs/git-utils/src/branch.rs:18][E: codex-rs/git-utils/src/ghost_commits.rs:257][E: codex-rs/git-utils/src/platform.rs:10]

## Gotchas

- `lib.rs` 当前没有声明或 re-export `baseline.rs`；不要把 baseline helper 当作 `codex_git_utils` 的 public API。[E: codex-rs/git-utils/src/lib.rs:1][E: codex-rs/git-utils/src/lib.rs:46]
- `operations.rs` 的 git command wrapper 没有 timeout；5 秒 timeout 只在 `info.rs::run_git_command_with_timeout` 这一套 metadata helpers 中出现。[E: codex-rs/git-utils/src/operations.rs:185][E: codex-rs/git-utils/src/operations.rs:209][E: codex-rs/git-utils/src/info.rs:42][E: codex-rs/git-utils/src/info.rs:272][E: codex-rs/git-utils/src/info.rs:279]
- Unix symlink 分支直接调用 `std::os::unix::fs::symlink`；Windows 分支会读取 source metadata，并按 `is_symlink_dir()` 选择 `symlink_dir` 或 `symlink_file`。[E: codex-rs/git-utils/src/platform.rs:5][E: codex-rs/git-utils/src/platform.rs:13][E: codex-rs/git-utils/src/platform.rs:17][E: codex-rs/git-utils/src/platform.rs:27][E: codex-rs/git-utils/src/platform.rs:28][E: codex-rs/git-utils/src/platform.rs:29][E: codex-rs/git-utils/src/platform.rs:31]

## Sources

- `codex-rs/git-utils/src/lib.rs`
- `codex-rs/git-utils/src/info.rs`
- `codex-rs/git-utils/src/branch.rs`
- `codex-rs/git-utils/src/apply.rs`
- `codex-rs/git-utils/src/operations.rs`
- `codex-rs/git-utils/src/ghost_commits.rs`
- `codex-rs/git-utils/src/errors.rs`
- `codex-rs/git-utils/src/platform.rs`

## 相关

- `subsys.cloud.cloud-tasks`: cloud task environment/git ref detection 使用本地 git metadata。
- `subsys.cloud.cloud-task-api`: cloud task apply run 使用 `ApplyGitRequest` 和 `apply_git_patch`。
- `subsys.core.ghost-undo`: ghost snapshot/undo 消费 ghost commit helpers。
