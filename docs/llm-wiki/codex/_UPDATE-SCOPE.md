# UPDATE SCOPE — Codex Wiki（121f91fd5d → 02a8f038b8）

> 完成日期：2026-09-11
>
> **旧 Wiki 基线**：`121f91fd5d9dc66017866ce9bdc49f1e182721df`
> **点时快照 target**：`02a8f038b87ad34d4a1dc5058eda26972ed7aa6c`
> **冻结时间**：2026-09-11；冻结时已确认 target 是官方 `origin/main`
> **跨度**：284 commits · 1610 files changed · +134,034 / -33,193
> 只读审计见 `_RESEARCH-02a8f038b8.md`。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。
>
> 本轮执行：影响分级 → 6 批 filler rewrite/refresh → SHA bump + safe-only `[E]` rebase → 独立 L2（6 语义批 + 1 leftover 高价值批）→ L3（就地修证伪项）→ reconcile ×2 + lint。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 121f91fd5d9dc66017866ce9bdc49f1e182721df..02a8f038b87ad34d4a1dc5058eda26972ed7aa6c
git -C codex diff --shortstat 121f91fd5d9dc66017866ce9bdc49f1e182721df..02a8f038b87ad34d4a1dc5058eda26972ed7aa6c
```

HEAD 提交：Check folder consent before creating or resuming TUI tasks (#44755)。

## 1. 影响分类

以基线 185 个节点为总体，按 source 存在性 + 真实 diff 求交（目录型 source 不算缺失）：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 5 | compact_remote v1 删除、`writer_lock` 迁到 `rollout`、guardian-v2 sync reviewer 配置/prompt 删除 |
| B-HEAVY | 5 | shell-parsing / approval-guardian / SDK / request-permissions，直接 source churn ≥ 2,000 |
| C-DRIFT | 153 | 至少一个直接 source 改动；机械 SHA bump + exact `[E]` rebase |
| D-CLEAN | 22 | 已登记 source 未改；仍 bump SHA |
| 退役 / 新增 | 0 | 节点集合仍 185；新 crate / RPC / `/voice` 全部 fold |

## 2. 必须重写 / 逐实例重核的面

- Remote compact v1 已删；活路径是 local `compact.rs` + `compact_remote_v2` + `compact_remote_history`。
- `writer_lock` 在 `rollout` crate。
- Guardian 同步 reviewer 下沉 `ext/guardian-reviewer`；v2 `sync_reviewer` 只剩 lifecycle `install`。
- Catalog：crates **147**、features **142**、Op **29**、EventMsg **83**、client RPC **167**、notifications **84**、server requests **11**、slash **60**、ConfigToml **101**、CLI subcommands **29**。
- 新 crate fold：`ext/guardian-reviewer`、`user-verification`。
- 新 RPC fold：`userVerification/cancel`、`thread/attachment/{add,list,remove}`、`memory/status`、`thread/attachment/updated`。
- Slash：删 `SandboxReadRoot`，加 `Voice`（`/voice`）；合计仍 60。
- TUI folder consent：picker 解析 destination 之后、create/resume 之前跑 `check_directory_trust`。

## 3. 执行与验收

- 只改 `docs/llm-wiki/codex/**` 与父仓 `codex` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs`，须 0 error。
- 全部节点 `updated: 02a8f038b8`；index / 文件树 / `llms.txt` 同一集合。
- 本轮是源码证据与 Wiki 验证，不宣称大型 Rust/runtime 测试通过。

## 4. L2 / L3

独立 L2 覆盖 48 个语义/高价值节点（broken 5 + heavy 5 + catalogs 7 + rpc-slash 7 + spine-tui-auth 8 + core-drift 8 + leftover-high-value 8）。机械 SHA 页未逐页 L2。

L3 回源后就地修复的负载：

- guardian turn **不会**挂 `history.*`（`is_basic_session_source` 整段跳过 MCP / extension / hosted / dynamic）。
- `notifications-system` 合计从 83 改为 **84**（thread catalog 51 + system 33）。
- `mcp.server` crate 行号：`rmcp-client` 在 `Cargo.toml:97`，members 是 L3–L149。
- leftover 机械漂移：turn-metadata attach 路径、network-proxy 若干 cite、Python `ExternalMessage` / `RunInput`。

## 5. 状态

完成：185 个节点 `updated: 02a8f038b8` / `status: verified`。reconcile 幂等。`node tools/lint.mjs` 0 error。入口 `README.md` / `llms.txt` / `index.json.groups` 已对齐 147 crates、142 features、185 节点、catalog 新计数（RPC **262** = 167+84+11）。父仓工作树 `codex` 已 detached checkout 到 target；gitlink 待随 wiki 一并提交。
