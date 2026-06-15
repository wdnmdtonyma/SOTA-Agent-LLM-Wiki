---
id: subsys.core.ghost-undo
title: Ghost snapshot 与 undo
kind: subsystem
tier: T2
source: [codex-rs/core/src/tasks/ghost_snapshot.rs, codex-rs/core/src/tasks/undo.rs, codex-rs/git-utils/src/ghost_commits.rs, codex-rs/git-utils/src/operations.rs, codex-rs/git-utils/src/lib.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/mod.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/handlers.rs]
symbols: [GhostSnapshotTask, UndoTask, GhostCommit, CreateGhostCommitOptions, RestoreGhostCommitOptions, create_ghost_commit_with_report, restore_ghost_commit_with_options, maybe_start_ghost_snapshot]
related: [subsys.platform.git-utils, ref.protocol-items, ref.protocol-event-lifecycle, subsys.core.turn-engine]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Ghost snapshot/undo 是 Codex 在工具执行前用临时 Git commit 捕获工作区状态，并在用户触发 `Op::Undo` 时从最近的 `ResponseItem::GhostSnapshot` 恢复工作树的状态机。[E: codex-rs/core/src/session/turn.rs:360][E: codex-rs/core/src/tasks/undo.rs:76][I]

## 能回答的问题

- ghost snapshot 什么时候启动，什么时候跳过？
- snapshot commit 如何捕获 tracked/untracked/forced include 文件？
- undo 如何定位最近一次 snapshot，并如何修改 conversation history？
- restore 为什么只恢复 worktree 而不恢复 index？
- 大 untracked 文件/目录 warnings 怎样进入 UI？

## 职责边界

- `codex-rs/core/src/tasks/ghost_snapshot.rs` 负责任务调度、超时 warning、把 `GhostCommit` 写入 history、打开 tool gate。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:28][E: codex-rs/core/src/tasks/ghost_snapshot.rs:47][E: codex-rs/core/src/tasks/ghost_snapshot.rs:107]
- `codex-rs/core/src/tasks/undo.rs` 负责找最近的 snapshot、调用 restore、更新 history、发送 undo lifecycle events。[E: codex-rs/core/src/tasks/undo.rs:43][E: codex-rs/core/src/tasks/undo.rs:69][E: codex-rs/core/src/tasks/undo.rs:125]
- `codex-rs/git-utils/src/ghost_commits.rs` 负责 Git plumbing：status capture、temp index、commit-tree、restore、untracked cleanup。[E: codex-rs/git-utils/src/ghost_commits.rs:301][E: codex-rs/git-utils/src/ghost_commits.rs:431]
- protocol 层只保存 `GhostCommit` 和 undo events，不实现 Git 操作。[E: codex-rs/protocol/src/models.rs:33][E: codex-rs/protocol/src/protocol.rs:3237]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/core/src/session/mod.rs` | `maybe_start_ghost_snapshot` 在 feature 开启时订阅 tool_call_gate 并 spawn task。[E: codex-rs/core/src/session/mod.rs:2813][E: codex-rs/core/src/session/mod.rs:2816][E: codex-rs/core/src/session/mod.rs:2824] |
| `codex-rs/core/src/tasks/ghost_snapshot.rs` | 后台 snapshot task、warning、history item、gate ready。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:44][E: codex-rs/core/src/tasks/ghost_snapshot.rs:92][E: codex-rs/core/src/tasks/ghost_snapshot.rs:151] |
| `codex-rs/git-utils/src/ghost_commits.rs` | `create_ghost_commit_with_report` 与 `restore_ghost_commit_with_options`。[E: codex-rs/git-utils/src/ghost_commits.rs:301][E: codex-rs/git-utils/src/ghost_commits.rs:431] |
| `codex-rs/core/src/tasks/undo.rs` | Undo task lifecycle 与 history rewrite。[E: codex-rs/core/src/tasks/undo.rs:19][E: codex-rs/core/src/tasks/undo.rs:103] |
| `codex-rs/protocol/src/models.rs` | `GhostCommit` 和 `ResponseItem::GhostSnapshot` 数据模型。[E: codex-rs/protocol/src/models.rs:33][E: codex-rs/protocol/src/models.rs:583] |

## 数据模型

| 实体 | 字段/状态 | 说明 |
|---|---|---|
| `GhostCommit` | `id`、`parent`、`preexisting_untracked_files`、`preexisting_untracked_dirs` | snapshot 不只保存 commit id，还记录 restore 时应保留的 preexisting untracked 路径。[E: codex-rs/protocol/src/models.rs:33][E: codex-rs/protocol/src/models.rs:37] |
| `CreateGhostCommitOptions` | `repo_path`、`message`、`force_include`、`ghost_snapshot` | snapshot caller 可配置 repo path、commit message、强制 include 路径和 ghost snapshot 阈值；repo prefix 和 parent commit 由 create path 内部解析。[E: codex-rs/git-utils/src/ghost_commits.rs:50][E: codex-rs/git-utils/src/ghost_commits.rs:52][E: codex-rs/git-utils/src/ghost_commits.rs:53][E: codex-rs/git-utils/src/ghost_commits.rs:54][E: codex-rs/git-utils/src/ghost_commits.rs:55][E: codex-rs/git-utils/src/ghost_commits.rs:307][E: codex-rs/git-utils/src/ghost_commits.rs:309] |
| `RestoreGhostCommitOptions` | repo path、prefix、snapshot config | restore 使用 repo path 和 ghost snapshot config。[E: codex-rs/git-utils/src/ghost_commits.rs:61][E: codex-rs/git-utils/src/ghost_commits.rs:153] |
| `GhostSnapshotReport` | `large_untracked_dirs`、`ignored_untracked_files` | create path 返回 `(GhostCommit, GhostSnapshotReport)` tuple；report 只承载大 untracked dir 和被忽略 untracked file 警告数据。[E: codex-rs/git-utils/src/ghost_commits.rs:81][E: codex-rs/git-utils/src/ghost_commits.rs:83][E: codex-rs/git-utils/src/ghost_commits.rs:84][E: codex-rs/git-utils/src/ghost_commits.rs:85][E: codex-rs/git-utils/src/ghost_commits.rs:302][E: codex-rs/git-utils/src/ghost_commits.rs:304] |
| `UndoStartedEvent`/`UndoCompletedEvent` | `message`、`success` | UI lifecycle 事件表达 undo 开始和完成状态。[E: codex-rs/protocol/src/protocol.rs:3237][E: codex-rs/protocol/src/protocol.rs:3243] |

## 控制流：snapshot

1. `run_turn` 在工具循环前调用 `maybe_start_ghost_snapshot`，让 snapshot 有机会在 tool execution 前完成或打开 gate。[E: codex-rs/core/src/session/turn.rs:360][E: codex-rs/core/src/session/turn.rs:361][I]
2. `maybe_start_ghost_snapshot` 只有在 `Feature::GhostCommit` 开启时继续；它订阅 `tool_call_gate` token 并 spawn `GhostSnapshotTask`。[E: codex-rs/core/src/session/mod.rs:2813][E: codex-rs/core/src/session/mod.rs:2816][E: codex-rs/core/src/session/mod.rs:2824][E: codex-rs/core/src/session/mod.rs:2825]
3. `GhostSnapshotTask::run` spawn background task；如果 warnings 未禁用，会在 240 秒后 snapshot 仍未完成时发送 `WarningEvent`。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:44][E: codex-rs/core/src/tasks/ghost_snapshot.rs:26][E: codex-rs/core/src/tasks/ghost_snapshot.rs:47]
4. snapshot task 在 blocking thread 中构造 `CreateGhostCommitOptions::new(&repo_path).ghost_snapshot(...)`，并调用 `create_ghost_commit_with_report`。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:84][E: codex-rs/core/src/tasks/ghost_snapshot.rs:89]
5. `create_ghost_commit_with_report` 先确保是 Git repo、解析 repo root/prefix/head，再创建 temp index；它用 `read-tree` 载入 parent tree，随后把 tracked/untracked paths 加入 temp index。[E: codex-rs/git-utils/src/ghost_commits.rs:301][E: codex-rs/git-utils/src/ghost_commits.rs:310][E: codex-rs/git-utils/src/ghost_commits.rs:335][E: codex-rs/git-utils/src/ghost_commits.rs:351][E: codex-rs/git-utils/src/ghost_commits.rs:359]
6. forced include 路径用 `git add --force` 加入 temp index；之后 `write-tree` 和 `commit-tree` 生成 ghost commit。[E: codex-rs/git-utils/src/ghost_commits.rs:369][E: codex-rs/git-utils/src/ghost_commits.rs:377][E: codex-rs/git-utils/src/ghost_commits.rs:383]
7. 成功后 core 格式化 warning，记录 `ResponseItem::GhostSnapshot { ghost_commit }`，并记录 snapshot id。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:92][E: codex-rs/core/src/tasks/ghost_snapshot.rs:95][E: codex-rs/core/src/tasks/ghost_snapshot.rs:111][E: codex-rs/core/src/tasks/ghost_snapshot.rs:112][E: codex-rs/core/src/tasks/ghost_snapshot.rs:115]
8. 非 Git repo 被识别为 `NotAGitRepository` 并跳过；其他错误只 warn，不把错误抛给 turn。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:117][E: codex-rs/core/src/tasks/ghost_snapshot.rs:122]
9. task 结束前调用 `tool_call_gate.mark_ready(token)`，允许等待 snapshot 的 tool path 继续。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:151][E: codex-rs/core/src/tasks/ghost_snapshot.rs:152]

## 控制流：undo

1. submission loop 收到 `Op::Undo` 后调用 `undo`，后者创建默认 turn 并 spawn `UndoTask`。[E: codex-rs/core/src/session/handlers.rs:597][E: codex-rs/core/src/session/handlers.rs:1154]
2. `UndoTask::run` 发送 `UndoStarted`；如果 cancellation token 已取消，发送 unsuccessful `UndoCompleted` 并返回。[E: codex-rs/core/src/tasks/undo.rs:43][E: codex-rs/core/src/tasks/undo.rs:53][E: codex-rs/core/src/tasks/undo.rs:57]
3. UndoTask 反向扫描 raw history，寻找最后一个 `ResponseItem::GhostSnapshot`；没有 snapshot 时返回 “No ghost snapshot...” failure message。[E: codex-rs/core/src/tasks/undo.rs:69][E: codex-rs/core/src/tasks/undo.rs:80][E: codex-rs/core/src/tasks/undo.rs:82][E: codex-rs/core/src/tasks/undo.rs:88]
4. 找到 snapshot 后，UndoTask 调用 blocking `restore_ghost_commit_with_options`。[E: codex-rs/core/src/tasks/undo.rs:94][E: codex-rs/core/src/tasks/undo.rs:100]
5. restore 先 capture 当前 untracked，再调用 `restore_to_commit_inner`，最后删除“当前存在但不在 snapshot preserved set 中”的新 untracked 路径。[E: codex-rs/git-utils/src/ghost_commits.rs:431][E: codex-rs/git-utils/src/ghost_commits.rs:445][E: codex-rs/git-utils/src/ghost_commits.rs:822]
6. `restore_to_commit_inner` 使用 `git restore --source <commit> --worktree -- <prefix|.>`，并明确不使用 `--staged` 以保留 index。[E: codex-rs/git-utils/src/ghost_commits.rs:472][E: codex-rs/git-utils/src/ghost_commits.rs:473][E: codex-rs/git-utils/src/ghost_commits.rs:478][E: codex-rs/git-utils/src/ghost_commits.rs:483][E: codex-rs/git-utils/src/ghost_commits.rs:486][E: codex-rs/git-utils/src/ghost_commits.rs:489]
7. restore 成功后，UndoTask 从 history 中移除该 `GhostSnapshot` item，并把 history 替换为 `reference_context_item`；完成消息包含短 commit id。[E: codex-rs/core/src/tasks/undo.rs:103][E: codex-rs/core/src/tasks/undo.rs:107][E: codex-rs/core/src/tasks/undo.rs:111]
8. restore 失败或 join error 会发送 failure message；无论成功失败最终都发送 `UndoCompleted`。[E: codex-rs/core/src/tasks/undo.rs:113][E: codex-rs/core/src/tasks/undo.rs:121][E: codex-rs/core/src/tasks/undo.rs:125]

## 设计动机与权衡

- ghost snapshot 使用 Git object database 和 temp index，而不是复制整个工作区；这能把 tracked/untracked 内容存成 commit，同时不直接改真实 index。[E: codex-rs/git-utils/src/ghost_commits.rs:335][E: codex-rs/git-utils/src/ghost_commits.rs:351][E: codex-rs/git-utils/src/ghost_commits.rs:383][I]
- restore 明确只改 worktree，不改 staged index；这保护用户已有 index 状态，但也意味着 undo 不是完整 Git reset。[E: codex-rs/git-utils/src/ghost_commits.rs:472][E: codex-rs/git-utils/src/ghost_commits.rs:473][E: codex-rs/git-utils/src/ghost_commits.rs:483][I]
- snapshot task 即使失败也会打开 tool_call_gate，说明 ghost snapshot 是安全辅助状态，不应永久阻塞工具执行。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:122][E: codex-rs/core/src/tasks/ghost_snapshot.rs:151][I]

## Gotcha

- snapshot 只在 Git repo 中工作；`NotAGitRepository` 会被跳过而不是创建替代文件快照。[E: codex-rs/core/src/tasks/ghost_snapshot.rs:117][E: codex-rs/git-utils/src/operations.rs:10][E: codex-rs/git-utils/src/operations.rs:25]
- undo 只恢复最近一个 `ResponseItem::GhostSnapshot`，并在成功后移除该 history item；重复 undo 会寻找更早的 snapshot。[E: codex-rs/core/src/tasks/undo.rs:69][E: codex-rs/core/src/tasks/undo.rs:107]
- untracked cleanup 会删除 restore 前当前 untracked 中不该 preserve 的文件/目录；preexisting untracked 通过 `GhostCommit` 的 preserved sets 保护。[E: codex-rs/git-utils/src/ghost_commits.rs:822][E: codex-rs/git-utils/src/ghost_commits.rs:833][E: codex-rs/git-utils/src/ghost_commits.rs:837][E: codex-rs/git-utils/src/ghost_commits.rs:840][E: codex-rs/git-utils/src/ghost_commits.rs:843][E: codex-rs/git-utils/src/ghost_commits.rs:847]

## Sources

- `codex-rs/core/src/tasks/ghost_snapshot.rs`
- `codex-rs/core/src/tasks/undo.rs`
- `codex-rs/git-utils/src/ghost_commits.rs`
- `codex-rs/git-utils/src/operations.rs`
- `codex-rs/git-utils/src/lib.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/handlers.rs`

## 相关

- 索引 id：`subsys.platform.git-utils`
- 索引 id：`ref.protocol-items`
- 索引 id：`ref.protocol-event-lifecycle`
- 索引 id：`subsys.core.turn-engine`
