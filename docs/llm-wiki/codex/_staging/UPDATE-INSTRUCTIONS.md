# Codex wiki 增量刷新令（9ded177ce7 → a9519cbcdd）

给 filler / verifier 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径重映射、架构事实和文件纪律。

## 冻结点

- **base**(上一轮 verified): `9ded177ce7` (`9ded177ce7c1c0bd2047f902936c177612ab3434`)
- **target**(必须对照的源码 HEAD): `a9519cbcdd` (`a9519cbcdd2d664530edb2469224ee03c1056799`)
- 源码根: 仓库 `codex/`（相对本 wiki `../../../codex/`）
- 节点 `updated:` 一律写成 `a9519cbcdd`
- 源码已 detached checkout 到 target。判断路径是否存在：`test -f` 或看 git 跟踪文件。

## 路径重映射（frontmatter `source:` 与 `[E:]` 必须改到右边）

| 旧路径 | 新路径 |
|---|---|
| `codex-rs/core/src/tools/handlers/shell.rs` | **已删除**。命令执行只走 `unified_exec/exec_command.rs` + `ExecCommandHandler` |
| `codex-rs/core/src/tools/handlers/shell/shell_command.rs` | **已删除**。同上 |
| `codex-rs/core/src/tools/runtimes/shell.rs` | **已删除**。runtime 在 `tools/runtimes/unified_exec.rs` / `tools/runtimes/zsh_fork.rs` |
| `codex-rs/core/src/tools/runtimes/shell/zsh_fork_backend.rs` | `codex-rs/core/src/tools/runtimes/zsh_fork.rs` |
| `codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs` | `codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs` |
| `codex-rs/core/src/tools/handlers/apply_patch.lark` | `codex-rs/core/assets/tools/apply_patch.lark` |
| `codex-rs/ext/guardian/src/lib.rs` | `codex-rs/guardian-context/src/lib.rs` |
| `codex-rs/ext/guardian-v2/src/config.rs` | `codex-rs/ext/guardian-v2/src/async_scorer/config.rs` |
| `codex-rs/ext/guardian-v2/src/extension.rs` | `codex-rs/ext/guardian-v2/src/async_scorer/extension.rs` |
| `codex-rs/ext/guardian-v2/src/sampler.rs` | `codex-rs/ext/guardian-v2/src/async_scorer/sampler.rs` |
| `codex-rs/ext/guardian-v2/src/transcript.rs` | `codex-rs/ext/guardian-v2/src/async_scorer/transcript.rs` |
| `codex-rs/ext/skills/src/shadow_selection_experiment.rs` | `codex-rs/ext/skills/src/shadow_selection_experiment/mod.rs` |
| `codex-rs/exec-server/testing/run_version_skew.sh` | `bazel/rules/testing/compat/exec_server_compat_test.rs`（旧脚本删除） |
| `codex-rs/exec-server/tests/relay/version_skew.rs` | `bazel/rules/testing/compat/exec_server_compat_test.rs` |

找不到替换文件就从 `source:` 删掉该条，改读 target 上真实还在的文件。禁止把 `[E:]` 指到已删除路径。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **`shell_command` 不再注册**。`add_shell_tools` 只 `registry.add(ExecCommandHandler)`；`Feature::UnifiedExec` 开则加 `WriteStdinHandler`，关则 `ExecCommandHandler::one_shot`。`shell_command` 仍是 reserved name。`tool.shell-command` 节点 **保留 id**，改写成退役映射，不要假装 handler 还在。
2. **`update_plan` 是 opt-in**：`if turn_context.config.update_plan_enabled { registry.add(PlanHandler) }`。HEAD 提交就是把默认关掉。
3. **新工具 `send_user_message_async`**：模型 `experimental_supported_tools` 含该字符串、且 `!session_source.is_non_root_agent()`；`DirectModelOnly`；只接受 `message: string`；立即返回，不结束 turn。
4. **clock / sleep**：`Feature::CurrentTimeReminder` **或** 模型 `experimental_supported_tools` 含 `"clock"` 才加 `CurrentTimeHandler`。`sleep` 还要 `Feature::SleepTool` + `SleepToolMode::AlwaysOn | ModelDriven`。
5. **Guardian V2**：crate 拆成 `async_scorer`（Luna 风险分类）和 `sync_reviewer`（同步 reviewer）。共享 transcript/truncation 在 `guardian-context`。Guardian reviewer turn 仍只暴露 `exec_command` / `write_stdin` / `view_image`。
6. **history-notes**：`ext/history-notes` 装 `history.{list_windows,list_items,read_item,search_contents}` 与 `notes.{list_files_by_prefix,read_file,search_contents,append_to_file,write_file}`。私有 model-only，notes 单文件 ≤ 1_000_000 UTF-8 bytes。
7. **worktree**：`WorktreeManager` 只操作 managed worktree root 下的 checkout，绑定 thread id；Desktop 契约。
8. **agent-roles**：新 crate 做角色文件 discovery/loader；写入 `subsys.core.collaboration-modes` / spawn-agent，**不另建节点**。
9. **catalog 计数必须按 target 重数**：workspace members **138**；features **133**；`Op` **29**；`EventMsg` **83**；client RPC **157**；server notifications **82**；server requests v2 wire **9**（另加 2 个 legacy v1）；`ConfigToml` 顶层 **99**；`SlashCommand` **59**（至少补 `Recap`/`Cd`/`Pwd`/`Agents`）。
10. 正文里凡写「134 crates / 114 features / 27 Op / 81 EventMsg / 144 client RPC / 37 tools」的旧计数，改成上表。工具节点数变为 **38**（+ `send_user_message_async`），总节点 **184**。
11. 不要写 `shell_command` 仍是可注册 core handler。不要写 `update_plan` 默认始终开启。不要把 Guardian V2 文件仍指到 crate 根上的旧 `config.rs`。

## filler 纪律

只写两类文件：

1. 自己的节点 `docs/llm-wiki/codex/<path>`
2. 可选 `_staging/uncertainty-update-<slug>.md`（`<slug>` = 批次名）

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`tools/*`、别人的节点、`codex/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板。
2. 读现有节点 `.md`（保留仍然成立的结构与问题列表；不要写成空模板）。
3. 用 Read / Grep 读 **target** 源码。`source:` 失效路径先按上表重映射，再核对文件确实存在。
4. 重写所有 load-bearing 论断与 `[E: path:line]`，使行号落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. 更新 `source:` / `symbols:` / `related:`（可指向本轮新增节点 id）。
6. `status: verified`（自己核过 `[E:]`）或 `draft`（核不完），`updated: a9519cbcdd`，`evidence: explicit`（除非整页只能 inferred）。
7. 跑 `node docs/llm-wiki/codex/tools/lint.mjs` 时，只处理带自己 `node:<path>` 的报错。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 当 `[E]`；冲突时跟代码。

## 新节点模板要点

- `tool.send-user-message-async`：完整工具模板（Identity / schema / 门控 / handler / exposure）。
- `subsys.core.history-notes`：职责边界、9 个 action、namespace、eventually consistent、禁止向用户披露。
- `subsys.platform.worktree`：`WorktreeManager`、managed layout、`bind_thread`、`DEFAULT_WORKTREE_KEEP_COUNT`。

## 不要退役的节点（就地改 source / 标题）

- `tool.shell-command` → 标题可改成「shell_command（已退役）」；source 改 `spec_plan.rs` + `registry.rs` reserved name + `ExecCommandHandler::one_shot`
- `subsys.core.approval-guardian-v2` → source 改 `async_scorer/*` + `sync_reviewer/*` + `guardian-context`
- `spine.extension-system` → `ext/guardian` 改 `guardian-context`
