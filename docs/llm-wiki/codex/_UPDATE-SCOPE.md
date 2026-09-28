# UPDATE SCOPE — Codex Wiki（3abbf9fe2c → 1cc7e23612）

> 开始日期：2026-09-28
>
> **旧 Wiki 基线**：`3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8`
> **点时快照 target**：`1cc7e2361237ce7244430ee1d581c77f95c57ac8`
> **冻结时间**：2026-09-28；冻结时已确认 target 是官方 `origin/main`
> **跨度**：816 commits · 4321 files changed · +296,580 / -68,913
> 只读审计见 `_RESEARCH-1cc7e23612.md`。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。
>
> 本轮执行：影响分级 → 机械 SHA bump + safe-only `[E]` rebase → 13 批 filler rewrite/refresh → 独立 L2（同 13 批）→ L3（≤2 轮）→ reconcile ×2 + lint。

复现：

```bash
git -C codex fetch origin main
git -C codex rev-list --count 3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8..1cc7e2361237ce7244430ee1d581c77f95c57ac8
git -C codex diff --shortstat 3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8..1cc7e2361237ce7244430ee1d581c77f95c57ac8
```

HEAD 提交：Show a short, neutral TUI interruption notice (#48830)。

## 1. 影响分类

以基线 185 个节点为总体。分类脚本把已删除文件算进 `modified`，机械 A-BROKEN=0；手工核对 `source:` 后有 5 个语义缺失路径（2 条 rename、3 条删除）。

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN（语义） | 5 | `review_session_factory.rs`、`agents_overview_render.rs`、`provider/orchestrator.rs` 删除；`transport/auth.rs`→`websocket-auth`；`plugin_id.rs`→`core-plugin-common` |
| B-HEAVY | 29 | 直接 source churn ≥ 2,000 |
| C-DRIFT | 145 | 至少一个直接 source 改动；机械 SHA bump + exact `[E]` rebase，高价值页 rewrite/refresh |
| D-CLEAN | 11 | 已登记 source 未改；仍 bump SHA |
| 退役 / 新增 | 0 | 节点集合仍 185 |

机械 rebase：174 files，18135 citations，exact 改写 10318，skipped contextual/fuzzy 672，unresolved 3（均落在已删路径，由 filler 清掉）。随后 SHA bump 185 页到 `1cc7e23612`，并滑动 193 条落在注释/空行上的 `[E:]`。

## 2. 必须重写 / 逐实例重核的面

- crates **147 → 153**（+`agent-message-board-client`、`core-plugin-common`、`ext/agent-message-board`、`mermaid`、`tcp-tunnel`、`websocket-auth`）。`ext/` **15 → 16**。
- Features **144 → 152**：+`analytics_plan_history`、`daemon_auto_start`、`instant_interrupt`、`prefer_mxc`、`system_proxy_fallback`、`defer_mailbox_preemption`、`agent_message_board`、`nonfatal_clock_read_errors`。
- `Op` **28 → 29**（+`InterruptIfNoPendingInput`）。
- Slash **59 → 62**（+`Tui`、`Daemon`、`Warnings`）。
- ConfigToml pub **102 → 104**（+`cloud`、+`model_post_turn_compact_threshold_percent`）。
- CLI Subcommand **29 → 30**（+`TcpTunnel`）。
- client RPC **166 → 170**；notifications **84 → 85**；server requests **11**；RPC 合计 **261 → 266**。
- EventMsg **83**、工具节点 **39** 不变。
- Agent message board 9 个 namespaced 工具 fold 进 extension / collaboration，不新建节点。
- Mermaid TUI 渲染 fold 进 tui rendering / config.ui-tui。

## 3. 执行与验收

- 只改 `docs/llm-wiki/codex/**` 与父仓 `codex` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs`，须 0 error。
- 全部节点 `updated: 1cc7e23612`；index / 文件树 / `llms.txt` 同一集合。
- 本轮是源码证据与 Wiki 验证，不宣称大型 Rust/runtime 测试通过。

## 4. L2 / L3

独立 L2 覆盖全部 174 个语义/高价值节点（13 批：catalogs-ref、slash-cli、config-rpc、spine、tui、core-guardian、core-tools-exec、tools-high、mcp-auth-platform、leftover-surface-a/b、leftover-subs-a/b）。D-CLEAN 11 页仅 SHA bump。

L2 报 117 条；L3 第 1 轮后 L2b 仍报 88 条；L3 第 2 轮后 Lead 抽查 catalogs 已改（`RolloutItem` 12、`ElicitationRequest::UserVerification`、login issuer 非 debug-only）。未开第 3 轮。

Lead 收束还修了：YAML-list frontmatter → 行内数组（否则 reconcile 丢 `source:`）、lint 对齐的 `[E:]` slide、10 处跨节点 `symbols` 去重。

## 5. 状态

完成：185 个节点 `updated: 1cc7e23612` / `status: verified`。reconcile 幂等。`node tools/lint.mjs` 0 error。入口 `README.md` / `llms.txt` / `index.json.groups` 已对齐 153 crates、152 features、185 节点、catalog 新计数（RPC **266** = 170+85+11；Op **29**；slash **62**；ConfigToml **104**；CLI **30**）。父仓工作树 `codex` 已 detached checkout 到 target；gitlink 待随 wiki 一并提交。

