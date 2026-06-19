---
id: subsys.platform.git-utils
title: Git utils
kind: subsystem
tier: T2
source: [codex-rs/git-utils/src/lib.rs, codex-rs/git-utils/src/info.rs, codex-rs/git-utils/src/branch.rs, codex-rs/git-utils/src/apply.rs, codex-rs/git-utils/src/baseline.rs, codex-rs/git-utils/src/fsmonitor.rs, codex-rs/git-utils/src/operations.rs, codex-rs/git-utils/src/errors.rs, codex-rs/git-utils/src/platform.rs]
symbols: [GitInfo, collect_git_info, ApplyGitRequest, ApplyGitResult, apply_git_patch, extract_paths_from_patch, stage_paths, merge_base_with_head, GitBaselineDiff, ensure_git_baseline_repository, diff_since_latest_init, FsmonitorOverride, detect_fsmonitor_override, create_symlink]
related: [subsys.cloud.cloud-tasks, subsys.cloud.cloud-task-api, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 5670360009
---

> `codex_git_utils` is Codex's local Git support crate: `lib.rs` re-exports patch apply, baseline diff/reset, merge-base, metadata, fsmonitor policy, and symlink helpers, while `operations.rs` remains a crate-private system-git execution layer。[E: codex-rs/git-utils/src/lib.rs:1][E: codex-rs/git-utils/src/lib.rs:10][E: codex-rs/git-utils/src/lib.rs:16][E: codex-rs/git-utils/src/lib.rs:22][E: codex-rs/git-utils/src/lib.rs:25][E: codex-rs/git-utils/src/lib.rs:28][E: codex-rs/git-utils/src/lib.rs:45][E: codex-rs/git-utils/src/operations.rs:11]

## 能回答的问题

- `codex_git_utils` 当前实际 re-export 哪些 public API？
- `collect_git_info` 返回哪些字段，怎样并行读取 git metadata？
- Cloud task apply 怎样通过 `apply_git_patch` 调用 system `git apply`？
- `merge_base_with_head` 怎样处理 HEAD、branch ref 和 upstream ahead？
- internal baseline repository 如何 reset、diff 并渲染 unified diff？
- `core.fsmonitor` 为什么要探测后只保留 built-in daemon？

## 职责边界

git-utils 节点覆盖 `codex-rs/git-utils` crate 的 public API 与支撑性 crate-private helpers。`operations.rs` 的 `ensure_git_repository`、`resolve_head`、`resolve_repository_root`、`run_git_for_status` 和 `run_git_for_stdout` 都是 `pub(crate)`，供 branch/baseline 等模块内部复用，不是 crate 外部 API。[E: codex-rs/git-utils/src/operations.rs:11][E: codex-rs/git-utils/src/operations.rs:33][E: codex-rs/git-utils/src/operations.rs:49][E: codex-rs/git-utils/src/operations.rs:61][E: codex-rs/git-utils/src/operations.rs:74]

`GitToolingError` 是 branch/operations/platform helpers 使用的结构化错误类型；`apply_git_patch` 自身返回 `std::io::Result<ApplyGitResult>`，`collect_git_info` 返回 `Option<GitInfo>`，baseline helpers 返回 `anyhow::Result`。[E: codex-rs/git-utils/src/errors.rs:10][E: codex-rs/git-utils/src/branch.rs:18][E: codex-rs/git-utils/src/operations.rs:65][E: codex-rs/git-utils/src/operations.rs:78][E: codex-rs/git-utils/src/platform.rs:10][E: codex-rs/git-utils/src/apply.rs:41][E: codex-rs/git-utils/src/info.rs:87][E: codex-rs/git-utils/src/baseline.rs:69][E: codex-rs/git-utils/src/baseline.rs:78][E: codex-rs/git-utils/src/baseline.rs:105]

## Public exports

`lib.rs` re-exports `ApplyGitRequest`、`ApplyGitResult`、`apply_git_patch`、`extract_paths_from_patch`、`parse_git_apply_output` 和 `stage_paths`。[E: codex-rs/git-utils/src/lib.rs:10][E: codex-rs/git-utils/src/lib.rs:11][E: codex-rs/git-utils/src/lib.rs:12][E: codex-rs/git-utils/src/lib.rs:13][E: codex-rs/git-utils/src/lib.rs:14][E: codex-rs/git-utils/src/lib.rs:15]

baseline exports include `GitBaselineChange`、`GitBaselineChangeStatus`、`GitBaselineDiff`、`diff_since_latest_init`、`ensure_git_baseline_repository` and `reset_git_repository`; branch/fsmonitor exports include `merge_base_with_head`、`FsmonitorOverride`、`FsmonitorProbeRunner` and `detect_fsmonitor_override`。[E: codex-rs/git-utils/src/lib.rs:16][E: codex-rs/git-utils/src/lib.rs:17][E: codex-rs/git-utils/src/lib.rs:18][E: codex-rs/git-utils/src/lib.rs:19][E: codex-rs/git-utils/src/lib.rs:20][E: codex-rs/git-utils/src/lib.rs:21][E: codex-rs/git-utils/src/lib.rs:22][E: codex-rs/git-utils/src/lib.rs:25][E: codex-rs/git-utils/src/lib.rs:26][E: codex-rs/git-utils/src/lib.rs:27]

info exports include `GitInfo`、`collect_git_info`、branch/default branch helpers、remote URL helpers、repo root, HEAD hash, dirty-state, remote diff, local branches, recent commits, and trust-root resolution。[E: codex-rs/git-utils/src/lib.rs:28][E: codex-rs/git-utils/src/lib.rs:30][E: codex-rs/git-utils/src/lib.rs:31][E: codex-rs/git-utils/src/lib.rs:32][E: codex-rs/git-utils/src/lib.rs:33][E: codex-rs/git-utils/src/lib.rs:34][E: codex-rs/git-utils/src/lib.rs:35][E: codex-rs/git-utils/src/lib.rs:36][E: codex-rs/git-utils/src/lib.rs:37][E: codex-rs/git-utils/src/lib.rs:39][E: codex-rs/git-utils/src/lib.rs:40][E: codex-rs/git-utils/src/lib.rs:41][E: codex-rs/git-utils/src/lib.rs:42][E: codex-rs/git-utils/src/lib.rs:43][E: codex-rs/git-utils/src/lib.rs:44]

## Git metadata

`GitInfo` contains only `commit_hash`、`branch` and `repository_url` optional fields; working-tree dirty state, recent commits, remote diff, and branches are separate helper APIs。[E: codex-rs/git-utils/src/info.rs:65][E: codex-rs/git-utils/src/info.rs:68][E: codex-rs/git-utils/src/info.rs:71][E: codex-rs/git-utils/src/info.rs:74][E: codex-rs/git-utils/src/info.rs:283][E: codex-rs/git-utils/src/info.rs:335][E: codex-rs/git-utils/src/info.rs:382][E: codex-rs/git-utils/src/info.rs:876]

`collect_git_info` first checks `git rev-parse --git-dir`; after a successful repo check it runs `git rev-parse HEAD`、`git rev-parse --abbrev-ref HEAD` and `git remote get-url origin` with `tokio::join!`, then fills the three optional fields independently。[E: codex-rs/git-utils/src/info.rs:87][E: codex-rs/git-utils/src/info.rs:89][E: codex-rs/git-utils/src/info.rs:94][E: codex-rs/git-utils/src/info.rs:99][E: codex-rs/git-utils/src/info.rs:100][E: codex-rs/git-utils/src/info.rs:101][E: codex-rs/git-utils/src/info.rs:105][E: codex-rs/git-utils/src/info.rs:116][E: codex-rs/git-utils/src/info.rs:126][E: codex-rs/git-utils/src/info.rs:135]

`get_git_repo_root` is a filesystem walk: it starts at the base path or its parent and looks for a `.git` entry, without requiring the git binary。[E: codex-rs/git-utils/src/info.rs:33][E: codex-rs/git-utils/src/info.rs:34][E: codex-rs/git-utils/src/info.rs:37][E: codex-rs/git-utils/src/info.rs:39]

## Patch apply

`ApplyGitRequest` fields are `cwd`、`diff`、`revert` and `preflight`; `ApplyGitResult` fields are `exit_code`、`applied_paths`、`skipped_paths`、`conflicted_paths`、`stdout`、`stderr` and `cmd_for_log`。[E: codex-rs/git-utils/src/apply.rs:18][E: codex-rs/git-utils/src/apply.rs:19][E: codex-rs/git-utils/src/apply.rs:20][E: codex-rs/git-utils/src/apply.rs:21][E: codex-rs/git-utils/src/apply.rs:22][E: codex-rs/git-utils/src/apply.rs:27][E: codex-rs/git-utils/src/apply.rs:28][E: codex-rs/git-utils/src/apply.rs:29][E: codex-rs/git-utils/src/apply.rs:30][E: codex-rs/git-utils/src/apply.rs:31][E: codex-rs/git-utils/src/apply.rs:32][E: codex-rs/git-utils/src/apply.rs:33][E: codex-rs/git-utils/src/apply.rs:34]

`apply_git_patch` resolves the repo root with `git rev-parse --show-toplevel`, writes the diff into a temporary patch file, and, for `revert && !preflight`, stages paths that still exist before applying。[E: codex-rs/git-utils/src/apply.rs:41][E: codex-rs/git-utils/src/apply.rs:42][E: codex-rs/git-utils/src/apply.rs:45][E: codex-rs/git-utils/src/apply.rs:49][E: codex-rs/git-utils/src/apply.rs:51][E: codex-rs/git-utils/src/apply.rs:126][E: codex-rs/git-utils/src/apply.rs:127][E: codex-rs/git-utils/src/apply.rs:129]

Normal apply uses `git apply --3way`; `CODEX_APPLY_GIT_CFG` can append `git -c key=value` fragments; preflight uses `git apply --check` and does not modify the working tree。[E: codex-rs/git-utils/src/apply.rs:55][E: codex-rs/git-utils/src/apply.rs:62][E: codex-rs/git-utils/src/apply.rs:68][E: codex-rs/git-utils/src/apply.rs:69][E: codex-rs/git-utils/src/apply.rs:76][E: codex-rs/git-utils/src/apply.rs:77]

`extract_paths_from_patch` reads `diff --git` headers and collects normalized a/b paths; `stage_paths` stages only paths that still exist on disk and treats nonzero `git add` as best-effort rather than a hard error。[E: codex-rs/git-utils/src/apply.rs:194][E: codex-rs/git-utils/src/apply.rs:198][E: codex-rs/git-utils/src/apply.rs:204][E: codex-rs/git-utils/src/apply.rs:207][E: codex-rs/git-utils/src/apply.rs:320][E: codex-rs/git-utils/src/apply.rs:325][E: codex-rs/git-utils/src/apply.rs:338][E: codex-rs/git-utils/src/apply.rs:340]

## Branch And Baseline

`merge_base_with_head` validates the repository, resolves repo root and HEAD, returns `Ok(None)` when HEAD or branch ref is absent, and prefers an upstream ref only when the upstream branch is remote-ahead。[E: codex-rs/git-utils/src/branch.rs:15][E: codex-rs/git-utils/src/branch.rs:19][E: codex-rs/git-utils/src/branch.rs:20][E: codex-rs/git-utils/src/branch.rs:21][E: codex-rs/git-utils/src/branch.rs:23][E: codex-rs/git-utils/src/branch.rs:26][E: codex-rs/git-utils/src/branch.rs:30][E: codex-rs/git-utils/src/branch.rs:31][E: codex-rs/git-utils/src/branch.rs:37][E: codex-rs/git-utils/src/branch.rs:47][E: codex-rs/git-utils/src/branch.rs:112]

`GitBaselineDiff` is a structured diff from the latest internal baseline reset to current directory contents; it contains file-level `changes` and rendered `unified_diff`。[E: codex-rs/git-utils/src/baseline.rs:20][E: codex-rs/git-utils/src/baseline.rs:22][E: codex-rs/git-utils/src/baseline.rs:41][E: codex-rs/git-utils/src/baseline.rs:48][E: codex-rs/git-utils/src/baseline.rs:49][E: codex-rs/git-utils/src/baseline.rs:50]

`reset_git_repository` replaces existing `.git` metadata with a fresh one-commit baseline; `ensure_git_baseline_repository` preserves usable metadata and resets missing/unusable metadata; `diff_since_latest_init` compares HEAD file entries with current filesystem entries and renders unified diff sections。[E: codex-rs/git-utils/src/baseline.rs:65][E: codex-rs/git-utils/src/baseline.rs:69][E: codex-rs/git-utils/src/baseline.rs:74][E: codex-rs/git-utils/src/baseline.rs:78][E: codex-rs/git-utils/src/baseline.rs:83][E: codex-rs/git-utils/src/baseline.rs:89][E: codex-rs/git-utils/src/baseline.rs:104][E: codex-rs/git-utils/src/baseline.rs:105][E: codex-rs/git-utils/src/baseline.rs:109][E: codex-rs/git-utils/src/baseline.rs:110][E: codex-rs/git-utils/src/baseline.rs:111][E: codex-rs/git-utils/src/baseline.rs:112]

Baseline rendering handles added, modified, deleted, and mode-change cases by comparing HEAD tree entries with current entries and then using `similar::TextDiff` to build patch text。[E: codex-rs/git-utils/src/baseline.rs:321][E: codex-rs/git-utils/src/baseline.rs:327][E: codex-rs/git-utils/src/baseline.rs:332][E: codex-rs/git-utils/src/baseline.rs:339][E: codex-rs/git-utils/src/baseline.rs:371][E: codex-rs/git-utils/src/baseline.rs:402][E: codex-rs/git-utils/src/baseline.rs:404][E: codex-rs/git-utils/src/baseline.rs:407][E: codex-rs/git-utils/src/baseline.rs:410][E: codex-rs/git-utils/src/baseline.rs:421]

## Fsmonitor And Symlink

`FsmonitorOverride` is the safe `core.fsmonitor` override for internal git commands: `Disabled` renders `core.fsmonitor=false`, while `BuiltIn` renders `core.fsmonitor=true`。[E: codex-rs/git-utils/src/fsmonitor.rs:13][E: codex-rs/git-utils/src/fsmonitor.rs:15][E: codex-rs/git-utils/src/fsmonitor.rs:24][E: codex-rs/git-utils/src/fsmonitor.rs:26][E: codex-rs/git-utils/src/fsmonitor.rs:27]

`detect_fsmonitor_override` reads raw effective `core.fsmonitor`, rejects malformed values, normalizes uncommon boolean spellings through Git when needed, and keeps `BuiltIn` only when `git version --build-options` advertises `feature: fsmonitor--daemon`。[E: codex-rs/git-utils/src/fsmonitor.rs:49][E: codex-rs/git-utils/src/fsmonitor.rs:57][E: codex-rs/git-utils/src/fsmonitor.rs:63][E: codex-rs/git-utils/src/fsmonitor.rs:66][E: codex-rs/git-utils/src/fsmonitor.rs:80][E: codex-rs/git-utils/src/fsmonitor.rs:91][E: codex-rs/git-utils/src/fsmonitor.rs:100][E: codex-rs/git-utils/src/fsmonitor.rs:114][E: codex-rs/git-utils/src/fsmonitor.rs:117][E: codex-rs/git-utils/src/fsmonitor.rs:121]

`info.rs`'s git command helper sets `GIT_OPTIONAL_LOCKS=0`, disables hook lookup with `core.hooksPath`, adds the selected fsmonitor override, uses `kill_on_drop(true)`, and wraps command output in a 5 second timeout。[E: codex-rs/git-utils/src/info.rs:61][E: codex-rs/git-utils/src/info.rs:427][E: codex-rs/git-utils/src/info.rs:432][E: codex-rs/git-utils/src/info.rs:440][E: codex-rs/git-utils/src/info.rs:443][E: codex-rs/git-utils/src/info.rs:444][E: codex-rs/git-utils/src/info.rs:447][E: codex-rs/git-utils/src/info.rs:448][E: codex-rs/git-utils/src/info.rs:451]

Unix symlink creation directly calls `std::os::unix::fs::symlink` with `link_target`; Windows reads source metadata and selects `symlink_dir` or `symlink_file` based on `is_symlink_dir()`。[E: codex-rs/git-utils/src/platform.rs:5][E: codex-rs/git-utils/src/platform.rs:6][E: codex-rs/git-utils/src/platform.rs:11][E: codex-rs/git-utils/src/platform.rs:13][E: codex-rs/git-utils/src/platform.rs:18][E: codex-rs/git-utils/src/platform.rs:27][E: codex-rs/git-utils/src/platform.rs:28][E: codex-rs/git-utils/src/platform.rs:29][E: codex-rs/git-utils/src/platform.rs:31]

## Gotchas

- `git-utils` no longer contains `ghost_commits.rs` or re-exports ghost commit helpers; current internal snapshot support in this crate is baseline repository diff/reset, while ghost snapshot/undo must be documented from current core/protocol sources。[E: codex-rs/git-utils/src/lib.rs:1][E: codex-rs/git-utils/src/lib.rs:16][E: codex-rs/git-utils/src/lib.rs:21][E: codex-rs/git-utils/src/baseline.rs:69][E: codex-rs/git-utils/src/baseline.rs:105]
- `operations.rs`'s crate-private git command wrapper has no timeout; the 5 second timeout and fsmonitor policy live in `info.rs`'s async command helpers。[E: codex-rs/git-utils/src/operations.rs:92][E: codex-rs/git-utils/src/operations.rs:121][E: codex-rs/git-utils/src/info.rs:61][E: codex-rs/git-utils/src/info.rs:432][E: codex-rs/git-utils/src/info.rs:444][E: codex-rs/git-utils/src/info.rs:448][E: codex-rs/git-utils/src/info.rs:451]
- Baseline reset is intentionally destructive for `root/.git` and is documented for internal directories, not user repositories。[E: codex-rs/git-utils/src/baseline.rs:65][E: codex-rs/git-utils/src/baseline.rs:67][E: codex-rs/git-utils/src/baseline.rs:69][E: codex-rs/git-utils/src/baseline.rs:94][E: codex-rs/git-utils/src/baseline.rs:97]

## Sources

- codex-rs/git-utils/src/lib.rs
- codex-rs/git-utils/src/info.rs
- codex-rs/git-utils/src/branch.rs
- codex-rs/git-utils/src/apply.rs
- codex-rs/git-utils/src/baseline.rs
- codex-rs/git-utils/src/fsmonitor.rs
- codex-rs/git-utils/src/operations.rs
- codex-rs/git-utils/src/errors.rs
- codex-rs/git-utils/src/platform.rs

## 相关

- `subsys.cloud.cloud-tasks`: cloud task environment/git ref detection 使用本地 git metadata。
- `subsys.cloud.cloud-task-api`: cloud task apply run 使用 `ApplyGitRequest` 和 `apply_git_patch`。
- `config.storage-telemetry-misc`: config 中的 ghost snapshot 设置已不等同于 `git-utils` public ghost commit API。
