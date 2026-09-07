# UPDATE SCOPE — Codex Wiki（a9519cbcdd → 121f91fd5d）

> 完成日期：2026-09-07
>
> **旧 Wiki 基线**：`a9519cbcdd2d664530edb2469224ee03c1056799`
> **点时快照 target**：`121f91fd5d9dc66017866ce9bdc49f1e182721df`
> **冻结时间**：2026-09-07；冻结时已确认 target 是官方 `origin/main`
> **跨度**：323 commits · 1756 files changed · +120,702 / -23,962
> 只读审计见 `_RESEARCH-121f91fd5d.md`。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。
>
> 本轮执行：workflow `codex-wiki-update`（**6 个批次 filler，无逐节点 L2**；用户明确要求控并发、不过度 verify）→ lead SHA bump + 证据行号重落 → `llms.txt` 登记新节点 → reconcile ×2 → lint。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count a9519cbcdd2d664530edb2469224ee03c1056799..121f91fd5d9dc66017866ce9bdc49f1e182721df
git -C codex diff --shortstat a9519cbcdd2d664530edb2469224ee03c1056799..121f91fd5d9dc66017866ce9bdc49f1e182721df
```

HEAD 提交：Enable remote named permission profile selection in the TUI (#43340)。

## 1. 影响分类

以基线 184 个节点为总体，按 source 存在性 + 真实 diff 求交（目录型 source 不算缺失）：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 5 | mcp-server 删除、send_user_message_async 改名、trace_transport.rs 删除 |
| B-HEAVY | 4 | TUI 直接 source churn ≥ 2,000 |
| C-DRIFT | ~163 | 至少一个直接 source 改动；机械 SHA bump + exact `[E]` rebase |
| D-CLEAN | 12 | 已登记 source 未改；仍 bump SHA |
| 退役 | 1 | `subsys.mcp.server` 保留 id，改写退役映射 |
| 新增 | 1 | `tool.request-user-input-async` |

## 2. 必须重写 / 逐实例重核的面

- `codex mcp-server` / `codex-rs/mcp-server` 已删除。
- `send_message_to_user_async` 取代旧 message 形工具；`request_user_input_async` 是新 questions 形工具；旧 catalog 名 `send_user_message_async` 现在注册后者。
- Catalog：crates **145**、features **140**、Op **29**、EventMsg **83**、client RPC **162**、notifications **83**、server requests **11**、slash **60**、ConfigToml **101**、CLI subcommands **29**。
- 新 crate fold：attachment-store / mxc-sandbox / windows-sandbox-service / realtime-webrtc / voice-host / git-discovery / otel-trace-websocket / config-schema。

## 3. 执行与验收

- 只改 `docs/llm-wiki/codex/**` 与父仓 `codex` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs`，须 0 error。
- 全部节点 `updated: 121f91fd5d`；index / 文件树 / `llms.txt` 同一集合。
- 本轮是源码证据与 Wiki 验证，不宣称大型 Rust/runtime 测试通过。

## 4. 状态

完成：185 个节点 `updated: 121f91fd5d` / `status: verified`。reconcile 幂等。`node tools/lint.mjs` 0 error。入口 `README.md` / `llms.txt` / `index.json.groups` 已对齐 145 crates、185 节点、catalog 新计数（RPC **256** = 162+83+11）。父仓工作树 `codex` 已 detached checkout 到 target；gitlink 待随 wiki 一并提交。
