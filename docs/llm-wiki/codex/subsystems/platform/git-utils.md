---
id: subsys.platform.git-utils
title: Git utils
kind: subsystem
tier: T2
source: [codex-rs/git-utils/src/lib.rs, codex-rs/git-utils/src/info.rs, codex-rs/git-utils/src/branch.rs, codex-rs/git-utils/src/apply.rs, codex-rs/git-utils/src/baseline.rs, codex-rs/git-utils/src/fsmonitor.rs, codex-rs/git-utils/src/operations.rs, codex-rs/git-utils/src/errors.rs, codex-rs/git-utils/src/platform.rs, codex-rs/git-utils/src/worktree.rs, codex-rs/utils/git-discovery/src/lib.rs, codex-rs/ext/git-attribution/src/lib.rs, codex-rs/ext/git-attribution/src/policy.rs, codex-rs/ext/git-attribution/src/world_state.rs]
symbols: [GitInfo, collect_git_info, ApplyGitRequest, apply_git_patch, SAFE_BARE_REPOSITORY_CONFIG, merge_base_with_head, GitBaselineDiff, detect_fsmonitor_override, RepositoryIdentity, GitRootDiscovery]
related: [subsys.cloud.cloud-tasks, subsys.cloud.cloud-task-api, config.storage-telemetry-misc, spine.extension-system, subsys.platform.worktree]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> `codex_git_utils` 是 Codex 的本地 Git 支持 crate：`lib.rs` 导出 patch apply、baseline diff/reset、merge-base、metadata、fsmonitor policy、symlink helpers、`RepositoryIdentity`，以及拒绝隐式 bare repo 的 `SAFE_BARE_REPOSITORY_CONFIG`。`codex-utils-git-discovery` 在其上提供有界共享 `GitRootDiscovery`。managed worktree 的 Desktop 契约在独立 crate `codex-rs/worktree`，它只消费这条安全 Git config，不复用 apply/baseline API。[E: codex-rs/git-utils/src/lib.rs:16][E: codex-rs/git-utils/src/lib.rs:55][E: codex-rs/utils/git-discovery/src/lib.rs:31][E: codex-rs/worktree/src/git.rs:169]

## 能回答的问题

- `codex_git_utils` 当前实际 re-export 哪些 public API？
- `SAFE_BARE_REPOSITORY_CONFIG` 是什么，谁在用？
- `collect_git_info` 返回哪些字段，怎样并行读取 git metadata？
- Cloud task apply 怎样通过 `apply_git_patch` 调用 system `git apply`？
- `merge_base_with_head` 怎样处理 HEAD、branch ref 和 upstream ahead？
- internal baseline repository 如何 reset、diff 并渲染 unified diff？

## 职责边界

git-utils 节点覆盖 `codex-rs/git-utils` crate 的 public API 与支撑性 crate-private helpers。`operations.rs` 的 helper 都是 `pub(crate)`，供 branch/baseline 等模块内部复用，不是 crate 外部 API。managed worktree 的 layout / `bind_thread` / keep-count 属于 `subsys.platform.worktree`。[E: codex-rs/git-utils/src/lib.rs:18][E: codex-rs/worktree/src/lib.rs:274]

## Public exports

`lib.rs` 先声明 `SAFE_BARE_REPOSITORY_CONFIG = "safe.bareRepository=explicit"`：拒绝隐式发现的 bare repository，但保留经 `GIT_DIR` / `--git-dir` 显式选中的仓库。[E: codex-rs/git-utils/src/lib.rs:16]

随后 re-export apply、baseline、`merge_base_with_head`、fsmonitor、info、`create_symlink`、`get_has_changes_in_repo`、`resolve_root_git_project_for_trust`、以及 `worktree::RepositoryIdentity`。[E: codex-rs/git-utils/src/lib.rs:18][E: codex-rs/git-utils/src/lib.rs:53][E: codex-rs/git-utils/src/lib.rs:55]

内部模块含 `git_process`、`status`、`trust`、`worktree`。[E: codex-rs/git-utils/src/lib.rs:6][E: codex-rs/git-utils/src/lib.rs:12]

## Git metadata

`GitInfo` 只含 `commit_hash`、`branch` 和 `repository_url` 三个 optional 字段；working-tree dirty state、recent commits、remote diff、branches 是独立 helper。[E: codex-rs/git-utils/src/info.rs:46]

`collect_git_info` 先检查 `git rev-parse --git-dir`；成功后并行跑 HEAD / branch / origin URL。[E: codex-rs/git-utils/src/info.rs:66]

## Patch apply

`apply_git_patch` 解析 repo root、把 diff 写入临时 patch file，并按 `revert` / `preflight` 选择 `git apply --3way` 或 `git apply --check`。[E: codex-rs/git-utils/src/apply.rs:42][E: codex-rs/git-utils/src/apply.rs:56][E: codex-rs/git-utils/src/apply.rs:78]

## Branch And Baseline

`merge_base_with_head` 校验仓库、解析 repo root 和 HEAD，HEAD 或 branch ref 缺失时返回 `Ok(None)`。[E: codex-rs/git-utils/src/branch.rs:15][E: codex-rs/git-utils/src/branch.rs:23][E: codex-rs/git-utils/src/branch.rs:27]

`GitBaselineDiff` 是从最近一次 internal baseline reset 到当前目录内容的结构化 diff。`reset_git_repository` 用 fresh one-commit baseline 替换现有 `.git` metadata，面向 internal directory，不是用户仓库。[E: codex-rs/git-utils/src/baseline.rs:48][E: codex-rs/git-utils/src/baseline.rs:69][E: codex-rs/git-utils/src/baseline.rs:94]

## Fsmonitor And Symlink

`FsmonitorOverride` 是 internal git 命令的安全 `core.fsmonitor` override。`detect_fsmonitor_override` 读有效 `core.fsmonitor`，只在 Git 宣称 `feature: fsmonitor--daemon` 时保留 `BuiltIn`。[E: codex-rs/git-utils/src/fsmonitor.rs:15][E: codex-rs/git-utils/src/fsmonitor.rs:49][E: codex-rs/git-utils/src/fsmonitor.rs:119]

Unix symlink 直接调 `std::os::unix::fs::symlink`；Windows 按 metadata 选 `symlink_dir` 或 `symlink_file`。[E: codex-rs/git-utils/src/platform.rs:6][E: codex-rs/git-utils/src/platform.rs:29]

## Git attribution extension

`ext/git-attribution` 是与 `git-utils` 相邻但不同的 production extension：`install` 把它注册成 prompt contributor。enabled world-state 要求 commit message 保留并唯一追加 `Co-authored-by: Codex <noreply@openai.com>`。[E: codex-rs/ext/git-attribution/src/lib.rs:98][E: codex-rs/ext/git-attribution/src/world_state.rs:19]

## Git-root discovery crate

`codex-utils-git-discovery` 的 `GitRootDiscovery` 按 cwd 共享 in-flight probe，最多 8 个并发，完成后不缓存结果；finder 默认调用 `get_git_repo_root`。[E: codex-rs/utils/git-discovery/src/lib.rs:24][E: codex-rs/utils/git-discovery/src/lib.rs:31][E: codex-rs/utils/git-discovery/src/lib.rs:43][E: codex-rs/utils/git-discovery/src/lib.rs:52] `ThreadManagerState` 持有一份 `Arc<GitRootDiscovery>`。[E: codex-rs/core/src/thread_manager.rs:91][E: codex-rs/core/src/thread_manager.rs:379]

`RepositoryIdentity` 用 canonical common dir / relative cwd / primary root 描述同一仓库的主 checkout 与 linked worktrees，不执行 Git。[E: codex-rs/git-utils/src/worktree.rs:16][E: codex-rs/git-utils/src/worktree.rs:34]

## 与 managed worktree 的边界

`WorktreeManager` 在执行 Git metadata 查询时注入 `SAFE_BARE_REPOSITORY_CONFIG`，并禁用 hooks/fsmonitor。它不调用 `apply_git_patch` 或 baseline reset；thread 绑定走 `codex-thread.json`。[E: codex-rs/worktree/src/git.rs:169][E: codex-rs/worktree/src/git.rs:171][E: codex-rs/worktree/src/git.rs:173][E: codex-rs/worktree/src/metadata.rs:19]

## Gotchas

- `git-utils` crate 模块清单含 apply/baseline/branch/errors/fsmonitor/git_process/info/operations/platform/status/trust/worktree，没有 ghost commit 模块；internal snapshot 走 baseline repository diff/reset。[E: codex-rs/git-utils/src/lib.rs:1][E: codex-rs/git-utils/src/lib.rs:12]
- 不要为 `git-discovery` 另建 wiki 节点。[I]
- `operations.rs` 的 crate-private git command wrapper 没有 timeout；5 秒 timeout 和 fsmonitor policy 在 `info.rs` 的 async helper 里。[E: codex-rs/git-utils/src/info.rs:40]
- Baseline reset 对 `root/.git` 是破坏性的，文档面向 internal directories，不是用户仓库。[I]

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
- codex-rs/git-utils/src/worktree.rs
- codex-rs/utils/git-discovery/src/lib.rs
- codex-rs/ext/git-attribution/src/lib.rs
- codex-rs/ext/git-attribution/src/policy.rs
- codex-rs/ext/git-attribution/src/world_state.rs

## 相关

- `subsys.cloud.cloud-tasks`: cloud task environment/git ref detection 使用本地 git metadata。
- `subsys.cloud.cloud-task-api`: cloud task apply run 使用 `ApplyGitRequest` 和 `apply_git_patch`。
- `config.storage-telemetry-misc`: config 中的 ghost snapshot 设置已不等同于 `git-utils` public ghost commit API。
- `spine.extension-system`: Git attribution 如何作为 context contributor 安装到 app-server registry。
- [Managed worktree](worktree.md) — Desktop managed worktree layout、`bind_thread` 与 keep-count。
