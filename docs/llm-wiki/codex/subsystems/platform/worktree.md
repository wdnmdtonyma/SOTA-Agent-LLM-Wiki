---
id: subsys.platform.worktree
title: Managed worktree
kind: subsystem
tier: T2
source: [codex-rs/worktree/src/lib.rs, codex-rs/worktree/src/settings.rs, codex-rs/worktree/src/git.rs, codex-rs/worktree/src/metadata.rs, codex-rs/git-utils/src/lib.rs, codex-rs/tui/src/slash_command.rs, codex-rs/tui/src/chatwidget/slash_dispatch.rs, codex-rs/tui/src/bottom_pane/slash_commands.rs, codex-rs/features/src/lib.rs]
symbols: [WorktreeManager, WorktreeSettings, DEFAULT_WORKTREE_KEEP_COUNT, bind_thread, has_managed_layout, Feature::Worktrees]
related: [subsys.platform.git-utils]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> `WorktreeManager` 按 Codex Desktop 契约 **创建、列出并绑定** managed worktree：checkout 必须落在 managed root 的固定两段布局里，必须是 linked worktree，并能把 thread id 原子绑定到 Git metadata 里的 `codex-thread.json`。TUI `/worktree` 是 `SlashCommand::Worktree`，由 `Feature::Worktrees` 控制可见性。[E: codex-rs/worktree/src/lib.rs:47][E: codex-rs/worktree/src/lib.rs:371][E: codex-rs/worktree/src/lib.rs:273][E: codex-rs/worktree/src/metadata.rs:49][E: codex-rs/tui/src/slash_command.rs:36][E: codex-rs/features/src/lib.rs:195]

## 能回答的问题

- `WorktreeManager` 允许操作哪些 checkout？
- `/worktree` slash 与 `Feature::Worktrees` 如何门控？
- managed layout 的路径形状是什么？
- `bind_thread` 如何防止两个 thread 抢同一 worktree？
- `DEFAULT_WORKTREE_KEEP_COUNT` 和 `[desktop]` 哪些键对应？
- worktree crate 怎样复用 `git-utils` 的安全 Git 配置？

## 职责边界

`codex-rs/worktree` 不替代 `git-utils` 的 patch/baseline API。`WorktreeManager::create` 会在 managed root 下 `git worktree add --detach --no-checkout` 再 hard-reset 填充文件；`list` / `bind_thread` / `owner` 仍只接受 **managed layout + linked worktree** checkout。[E: codex-rs/worktree/src/lib.rs:61][E: codex-rs/worktree/src/lib.rs:91][E: codex-rs/worktree/src/lib.rs:167][E: codex-rs/worktree/src/lib.rs:273][E: codex-rs/worktree/src/lib.rs:339][E: codex-rs/worktree/src/lib.rs:374]

设置解析复用现有 `[desktop]` JSON map，不引入另一套 config 格式。[E: codex-rs/worktree/src/settings.rs:39]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `lib.rs` | `WorktreeManager`、`create`/`list`、`managed_checkout`、`has_managed_layout`、linked-worktree 检查。[E: codex-rs/worktree/src/lib.rs:47][E: codex-rs/worktree/src/lib.rs:61][E: codex-rs/worktree/src/lib.rs:382] |
| `settings.rs` | `[desktop]` 键、`DEFAULT_WORKTREE_KEEP_COUNT`、默认 root `codex_home/worktrees`。[E: codex-rs/worktree/src/settings.rs:12][E: codex-rs/worktree/src/settings.rs:14][E: codex-rs/worktree/src/settings.rs:39] |
| `metadata.rs` | `codex-thread.json` 读写、`bind_thread` 原子 persist。[E: codex-rs/worktree/src/metadata.rs:19][E: codex-rs/worktree/src/metadata.rs:49] |
| `git.rs` | 去掉继承的 `GIT_*` 选择器，注入 `SAFE_BARE_REPOSITORY_CONFIG`，禁用 hooks/fsmonitor。[E: codex-rs/worktree/src/git.rs:101][E: codex-rs/worktree/src/git.rs:124] |
| TUI slash | `SlashCommand::Worktree`；dispatch 打开 managed worktree picker；popup 受 `worktrees_enabled` 过滤。[E: codex-rs/tui/src/slash_command.rs:36][E: codex-rs/tui/src/chatwidget/slash_dispatch.rs:257][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:81] |

## 数据模型

`WorktreeSettings` 三个字段：`root`、`auto_cleanup_enabled`、`keep_count`。[E: codex-rs/worktree/src/settings.rs:20]

`from_desktop_config` 读取：

| desktop 键 | 默认 | 校验 |
|---|---|---|
| `git-worktree-root` | `codex_home/worktrees`；空字符串也回落默认 | 若提供必须是绝对路径 [E: codex-rs/worktree/src/settings.rs:12][E: codex-rs/worktree/src/settings.rs:44][E: codex-rs/worktree/src/settings.rs:54] |
| `worktree-auto-cleanup-enabled` | `true` | 必须是 bool [E: codex-rs/worktree/src/settings.rs:13][E: codex-rs/worktree/src/settings.rs:67] |
| `worktree-keep-count` | `DEFAULT_WORKTREE_KEEP_COUNT`（**15**） | 必须是正整数 [E: codex-rs/worktree/src/settings.rs:12][E: codex-rs/worktree/src/settings.rs:16][E: codex-rs/worktree/src/settings.rs:72] |

`OwnerRecord` 是 versioned camelCase JSON：`version: 1`、`ownerThreadId`。空 thread id 或错误 version 视为 invalid。[E: codex-rs/worktree/src/metadata.rs:22][E: codex-rs/worktree/src/metadata.rs:26][E: codex-rs/worktree/src/metadata.rs:42]

## Managed layout

`has_managed_layout(root, checkout)` 要求 `checkout` 相对 `root` 恰好两段：

1. 第一段是长度为 4 的 ASCII hex bucket；
2. 第二段是任意 `Normal` 组件（worktree 名）；
3. 不能再有后续组件。

不在 root 下、只有一段、或 bucket 不是 4 位 hex，都返回 false。[E: codex-rs/worktree/src/lib.rs:382][E: codex-rs/worktree/src/lib.rs:393]

`WorktreeManager::new` 会 `dunce::simplified` settings root；`managed_checkout` 再 canonicalize root 与 checkout 后做 layout + linked-worktree 检查。[E: codex-rs/worktree/src/lib.rs:52][E: codex-rs/worktree/src/lib.rs:330]

`linked_worktree_common_dir` 还要求 checkout 是 worktree root，且 `--git-dir != --git-common-dir`。[E: codex-rs/worktree/src/lib.rs:370][E: codex-rs/worktree/src/lib.rs:376]

## bind_thread

`WorktreeManager::bind_thread` 先 `managed_checkout`，再调 `metadata::bind_thread`。[E: codex-rs/worktree/src/lib.rs:273]

`bind_thread`：

1. 拒绝空 `thread_id`。[E: codex-rs/worktree/src/metadata.rs:50]
2. 已有同一 owner 则 no-op。[E: codex-rs/worktree/src/metadata.rs:55]
3. 已有**另一** owner 则报 `worktree already belongs to thread {existing}`。[E: codex-rs/worktree/src/metadata.rs:58]
4. 否则在 `git rev-parse --git-path codex-thread.json` 解析出的路径旁 `NamedTempFile` 写入 record，再用 `persist_noclobber` 原子发布；并发已存在时若 owner 仍是自己则成功，否则报 concurrently assigned。[E: codex-rs/worktree/src/metadata.rs:74][E: codex-rs/worktree/src/metadata.rs:88]

`owner()` 读同一文件；NotFound 返回 `None`。[E: codex-rs/worktree/src/metadata.rs:29]

## Git 执行面

`git.rs` 的 Git 命令删掉 `GIT_DIR` / `GIT_WORK_TREE` / `GIT_COMMON_DIR` 等继承选择器，从 cwd 选仓库；并加 `codex_git_utils::SAFE_BARE_REPOSITORY_CONFIG`（`safe.bareRepository=explicit`）、`core.hooksPath` 指向 NUL/`/dev/null`、清空 `core.fsmonitor`。[E: codex-rs/worktree/src/git.rs:108][E: codex-rs/worktree/src/git.rs:124][E: codex-rs/worktree/src/git.rs:126][E: codex-rs/worktree/src/git.rs:128][E: codex-rs/git-utils/src/lib.rs:16]

## 设计动机与权衡

Desktop 已经用 `[desktop]` 管 worktree root / cleanup / keep count；crate 只解析这些键，避免再发明配置面。[E: codex-rs/worktree/src/settings.rs:39][I]

`persist_noclobber` 而不是覆盖写，是为了绑定发布不替换别人的 owner；同 thread 重绑保持原 record。[E: codex-rs/worktree/src/metadata.rs:74][I]

4-hex bucket 布局把大量 worktree 摊到浅目录里，同时让 manager 能用路径形状拒绝“随便一个 checkout”。[E: codex-rs/worktree/src/lib.rs:393][I]

## gotcha

- `keep_count` / `auto_cleanup_enabled` 只被 settings 解析；cleanup 循环不在这个 crate 里。公开 API 现在还有 `create` / `list`。[E: codex-rs/worktree/src/lib.rs:57][E: codex-rs/worktree/src/lib.rs:61][E: codex-rs/worktree/src/lib.rs:167]
- 主仓库 checkout（`git-dir == git-common-dir`）会被拒绝，即使它碰巧在 managed root 下。[E: codex-rs/worktree/src/lib.rs:376]
- `git-worktree-root` 相对路径直接 bail，不会相对 `codex_home` 拼接。[E: codex-rs/worktree/src/settings.rs:54]
- `/worktree` 只在 `Feature::Worktrees`（key `worktrees`）启用时进入 slash popup。[E: codex-rs/features/src/lib.rs:1253][E: codex-rs/tui/src/bottom_pane/slash_commands.rs:81][E: codex-rs/tui/src/slash_command.rs:102]

## Sources

- `codex-rs/worktree/src/lib.rs`
- `codex-rs/worktree/src/settings.rs`
- `codex-rs/worktree/src/git.rs`
- `codex-rs/worktree/src/metadata.rs`
- `codex-rs/git-utils/src/lib.rs`
- `codex-rs/tui/src/slash_command.rs`
- `codex-rs/tui/src/chatwidget/slash_dispatch.rs`
- `codex-rs/tui/src/bottom_pane/slash_commands.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [Git utils](git-utils.md) — `SAFE_BARE_REPOSITORY_CONFIG` 与通用 Git helper；worktree 只消费安全 config，不复用 apply/baseline API。
