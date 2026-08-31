# UPDATE SCOPE — Codex Wiki（9ded177ce7 → a9519cbcdd）

> 本文件记录 2026-08-31 的 Codex-only 增量更新。
> **旧 Wiki 基线**：`9ded177ce7c1c0bd2047f902936c177612ab3434`
> **最终点时快照 target**：`a9519cbcdd2d664530edb2469224ee03c1056799`
> **冻结时间**：2026-08-31；冻结时已确认 target 是官方 `origin/main`
> **跨度**：678 commits · 2314 files changed · +219,373 / -38,604
> 只读审计见 `_RESEARCH-a9519cbcdd.md`。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 9ded177ce7c1c0bd2047f902936c177612ab3434..a9519cbcdd2d664530edb2469224ee03c1056799
git -C codex diff --shortstat 9ded177ce7c1c0bd2047f902936c177612ab3434..a9519cbcdd2d664530edb2469224ee03c1056799
```

上游覆盖 `rust-v0.148.0` / `rust-v0.149.0`；HEAD 在稳定版之后。

## 1. 影响分类

以基线 181 个节点为总体，按 source 存在性 + 真实 diff 求交：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 9 | shell/guardian/lark/escalation/exec-server source 删除或搬家 |
| B-HEAVY | 20 | 直接 source churn ≥ 2,000 |
| C-DRIFT | 144 | 至少一个直接 source 改动 |
| D-CLEAN | 8 | 已登记 source 未改；仍 bump SHA |
| 退役 | 0 | `tool.shell-command` 保留 id，改写退役映射 |
| 新增 | 3 | `tool.send-user-message-async`、`subsys.core.history-notes`、`subsys.platform.worktree` |

## 2. 必须重写 / 逐实例重核的面

- `shell_command` 不再注册；one-shot `exec_command` 是 UnifiedExec=off 的 fallback。
- Guardian V2：`async_scorer` + `sync_reviewer` + `guardian-context`。
- `update_plan` opt-in；`send_user_message_async` 新工具；clock/sleep 双门控。
- history-notes 9 个 namespace tools；worktree Desktop 契约。
- Catalog：crates 138、features 133、Op 29、EventMsg 83、client RPC 157、notifications 83、slash 59。

## 3. 执行与验收

- 只改 `docs/llm-wiki/codex/**` 与父仓 `codex` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs`，须 0 error。
- 全部节点 `updated: a9519cbcdd`；index / 文件树 / `llms.txt` 同一集合。
- 本轮是源码证据与 Wiki 验证，不宣称大型 Rust/runtime 测试通过。

## 4. 状态

完成：184 个节点 `updated: a9519cbcdd` / `status: verified`。reconcile 幂等。`node tools/lint.mjs` 0 error。入口 `README.md` / `llms.txt` / `index.json.groups` 已对齐 138 crates、184 节点、catalog 新计数（notifications **83**）。父仓 `codex` gitlink 仍指向旧基线 `9ded177ce7`，工作树已 checkout 到 target；未提交。
