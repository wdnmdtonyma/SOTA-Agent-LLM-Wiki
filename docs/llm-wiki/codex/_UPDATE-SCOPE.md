# UPDATE SCOPE — Codex Wiki（02a8f038b8 → 3abbf9fe2c）

> 开始日期：2026-09-14
>
> **旧 Wiki 基线**：`02a8f038b87ad34d4a1dc5058eda26972ed7aa6c`
> **点时快照 target**：`3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8`
> **冻结时间**：2026-09-14；冻结时已确认 target 是官方 `origin/main`
> **跨度**：66 commits · 669 files changed · +24,644 / -14,981
> 只读审计见 `_RESEARCH-3abbf9fe2c.md`。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。
>
> 本轮执行：影响分级 → 机械 SHA bump + safe-only `[E]` rebase → 7 批 filler rewrite/refresh → 独立 L2（7 批）→ L3 → reconcile ×2 + lint。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 02a8f038b87ad34d4a1dc5058eda26972ed7aa6c..3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8
git -C codex diff --shortstat 02a8f038b87ad34d4a1dc5058eda26972ed7aa6c..3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8
```

HEAD 提交：Extract Windows sandbox configuration preparation into a helper (#45312)。

## 1. 影响分类

以基线 185 个节点为总体，按 source 存在性 + 真实 diff 求交（目录型 source 不算缺失）：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 已登记 source 在 target 仍在 |
| B-HEAVY | 0 | 无直接 source churn ≥ 2,000 |
| C-DRIFT | 158 | 至少一个直接 source 改动；机械 SHA bump + exact `[E]` rebase，高价值页 rewrite/refresh |
| D-CLEAN | 27 | 已登记 source 未改；仍 bump SHA |
| 退役 / 新增 | 0 | 节点集合仍 185 |

语义 rewrite（source 未缺失，但正文会假）：ThreadRollback / `thread/rollback`、TUI `/personality`、`send_message_to_user_async` 新 feature 门控、worktrees 默认开、features 144、ConfigToml 102、client RPC 166。

## 2. 必须重写 / 逐实例重核的面

- `Op` **28**（删 `ThreadRollback`）；`thread/rollback` client RPC 删除。
- Slash **59**（删 `Personality`）。personality feature 与 Config 字段仍在。
- Features **144**：+`use_xaa`、+`send_message_to_user_async`；`worktrees` = Stable / true。
- ConfigToml pub **102**：+`mcp_enterprise_managed_auth`。
- client RPC **166**；notifications **84**；server requests **11**。
- crates **147** 不变；EventMsg **83**；CLI Subcommand **29**；工具节点 **39**。
- Windows MXC 接到 command execution / managed network / app-server setup；fold 进现有 windows sandbox 页。
- TUI：sparkle 删除；agents overview 从 command center 开 session / worktree。

## 3. 执行与验收

- 只改 `docs/llm-wiki/codex/**` 与父仓 `codex` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs`，须 0 error。
- 全部节点 `updated: 3abbf9fe2c`；index / 文件树 / `llms.txt` 同一集合。
- 本轮是源码证据与 Wiki 验证，不宣称大型 Rust/runtime 测试通过。

## 4. L2 / L3

独立 L2 覆盖 61 个语义/高价值节点（rollback 8 + personality 9 + catalogs 9 + tools 8 + windows-tui 8 + leftover 8 + cites 11）。机械 SHA 页未逐页 L2。

L3 回源后就地修复的负载：

- `ResponseItem` 17→**18**（`ConfigurationUpdate`）。
- guardian 路径的 `exec_command`/`write_stdin`/`view_image` 另有 ShellTool + UnifiedExec + `ViewImage` 门控，不是 Managed+environment 就一定注册。
- `thread/revert` empty-turns 证据落在 `ThreadRevertResponse`。
- Linux argv0 不再误指 Windows MXC 分支。
- Lint 修符号去重与注释/`*` deref 行号。

## 5. 状态

完成：185 个节点 `updated: 3abbf9fe2c` / `status: verified`。reconcile 幂等。`node tools/lint.mjs` 0 error。入口 `README.md` / `llms.txt` / `index.json.groups` 已对齐 147 crates、144 features、185 节点、catalog 新计数（RPC **261** = 166+84+11；Op **28**；slash **59**；ConfigToml **102**）。父仓工作树 `codex` 已 detached checkout 到 target；gitlink 待随 wiki 一并提交。
