# Codex `9ded177ce7..a9519cbcdd` 源码差分研究

> 研究日期：2026-08-31
> Wiki verified base：`9ded177ce7c1c0bd2047f902936c177612ab3434`
> 目标源码：官方 `openai/codex` `origin/main` = `a9519cbcdd2d664530edb2469224ee03c1056799`（短 SHA `a9519cbcdd`）
> 最新稳定版：`rust-v0.149.0`（2026-08-20）。最新 prerelease：`rust-v0.150.0-alpha.1` / `rust-v0.149.0-alpha.4.1`。HEAD 在稳定版之后。
> 本文不是 Wiki 节点，不进 `index.json` / `llms.txt`。

## 1. 跨度

- 678 commits，2314 files，`+219373 / -38604`；569 added / 32 deleted / 1683 modified / ~30 renamed。
- base 是 target 祖先。
- submodule 已 detached checkout 到 target。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 9ded177ce7c1c0bd2047f902936c177612ab3434..a9519cbcdd2d664530edb2469224ee03c1056799
git -C codex diff --shortstat 9ded177ce7c1c0bd2047f902936c177612ab3434..a9519cbcdd2d664530edb2469224ee03c1056799
```

## 2. 机械分级（181 基线节点）

| 分级 | 数量 |
|---|---:|
| A-BROKEN | 9 |
| B-HEAVY | 20 |
| C-DRIFT | 144 |
| D-CLEAN | 8 |

A-BROKEN（source 必须重定位，不是概念退役）：

1. `spine.shell-exec-flow` / `tool.shell-command` / `subsys.core.approval-policy`：`tools/handlers/shell.rs` 与 `tools/runtimes/shell.rs` 删除。
2. `spine.trace-apply-patch` / `tool.apply-patch`：`apply_patch.lark` → `core/assets/tools/apply_patch.lark`；`shell.rs` 删除。
3. `subsys.exec-sandbox.shell-escalation`：`unix_escalation.rs` → `tools/runtimes/zsh_fork/unix_escalation.rs`。
4. `subsys.exec-sandbox.exec-server`：`exec-server/testing/run_version_skew.sh` 与 `tests/relay/version_skew.rs` 迁到 Bazel compat 测试。
5. `spine.extension-system`：`ext/guardian` → `guardian-context`；`ext/skills/src/shadow_selection_experiment.rs` → 目录模块。
6. `subsys.core.approval-guardian-v2`：`config.rs` / `extension.rs` / `sampler.rs` / `transcript.rs` 下沉 `async_scorer/`。

## 3. Inventory 变化

### Workspace crates：134 → 138

新增：`agent-roles`、`ext/history-notes`、`utils/redacted-string`、`worktree`  
重命名：`ext/guardian` → `guardian-context`（成员数不变）  
移除：无独立 crate 删除。

### Features：114 → 133

新增 19 个 key：`transcript_v2`、`sleep_tool`、`powershell_shell_version`、`shell_snapshot_v2`、`cwd_relative_turn_diffs`、`content_item_kinds`、`code_mode_prewarm`、`local_thread_store_shared_compression`、`write_stdin_approval`、`skip_host_skill_discovery`、`in_app_chat`、`in_app_dictation`、`in_app_local_automation`、`omit_app_server_notification_media`、`send_async_message`、`guardian_ext`、`bedrock_setup_wizard`、`step_model_switching`、`compaction_image_budget`。  
无 key 从 registry 删除。`Feature` enum 与 `FEATURES` 均为 133。

### 工具集

`build_tool_router` / `add_core_tool_sources` 仍是 ground truth。

- **`shell_command` 不再注册**：`add_shell_tools` 只写 `ExecCommandHandler`（`UnifiedExec` 开则 resumable + `write_stdin`；关则 `ExecCommandHandler::one_shot`）。`shell_command` 仍是 reserved name。
- **`update_plan` 改为 opt-in**：`turn_context.config.update_plan_enabled`。
- **新 core 工具** `send_user_message_async`：模型 `experimental_supported_tools` 含该名且非 non-root agent；`ToolExposure::DirectModelOnly`。
- **clock / sleep**：`Feature::CurrentTimeReminder` 或模型 `clock`；`SleepToolMode::AlwaysOn | ModelDriven`。
- **Guardian reviewer 面不变**：仍只 `exec_command` / `write_stdin` / `view_image`。
- **history/notes**：`ext/history-notes` 提供 `history.*` + `notes.*` 共 9 个 namespace 工具。

### App-Server

- client requests：**157**（旧 wiki 144）。新增面包括 `project/{list,read,create,import,update,move,delete}`、`thread/timeline/list`、`modelProvider/capabilities/read`、`account/bedrock/{discover,setup}`、`turn/settings/update` 等。
- server notifications：**82**（旧 74）。新增含 `project/changed`、`modelProvider/authRecoveryStarted`、`modelProvider/authRecoveryCompleted` 等。
- server requests：v2 wire **9** + 2 个 legacy v1（`ApplyPatchApproval` / `ExecCommandApproval`）仍在同一宏里。

### Protocol

- `Op` **29**（旧 27）：新增 `SuspendTurnAndShutdown`、`TurnSettings`。
- `EventMsg` **83**（旧 81）：新增 `AuthRecoveryStarted`、`AuthRecoveryCompleted`。

### Config / slash

- `ConfigToml` 顶层 pub 字段 **99**（旧 97）。
- `SlashCommand` **59**：相对旧 catalog 至少新增 `Recap`、`Cd`、`Pwd`、`Agents`。

## 4. 必须按新架构重读的主题

1. **shell_command 退役 / one-shot exec_command**：独立 handler crate 路径删除；保留节点 id，改写为退役映射。
2. **Guardian V2 拆分**：`async_scorer` + `sync_reviewer`；共享 transcript 下沉 `guardian-context`。
3. **send_user_message_async**：异步提问，不结束 turn。
4. **history-notes**：compaction 后恢复历史 + 跨窗口 notes。
5. **worktree**：Desktop 契约的 managed worktree crate。
6. **agent-roles**：角色文件 discovery/loader；写入 collaboration / spawn-agent，不另建节点。
7. **Project APIs**：experimental `project/*`；写入 RPC catalog。
8. **update_plan opt-in**、**sleep/clock 双门控**、**shared rollout compression**、**MCP package-style names**、**openai/elicitation form**、**TUI /cd /pwd /recap /agents**。

## 5. 新增 / 退役节点判定

退役：无独立 Wiki 节点删除。`tool.shell-command` **保留 id**，正文改成退役 + reserved name + one-shot fallback。

新增 3 个：

| id | path | 理由 |
|---|---|---|
| `tool.send-user-message-async` | `surface/tools/send-user-message-async.md` | 独立 core handler + 独立门控 |
| `subsys.core.history-notes` | `subsystems/core/history-notes.md` | 独立 extension + 9 namespace tools |
| `subsys.platform.worktree` | `subsystems/platform/worktree.md` | 独立 crate + Desktop 契约 |

最终目标：**184 verified nodes**（181 + 3）。

## 6. 写节点纪律（给并行会话）

- target SHA：`a9519cbcdd`
- 只写分配到的节点 `.md` 和 `_staging/uncertainty-update-<batch>.md`
- 禁止改 `index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`
- 禁止改 `codex/` 源码
- `[E: path:line]` 必须落在被断言的代码行，不是注释
- 失效 source 必须改到 target 仍存在的路径
- 不要把旧 SHA `9ded177ce7` 留在 frontmatter
- 新节点 related 可以互指；index 由 lead reconcile
