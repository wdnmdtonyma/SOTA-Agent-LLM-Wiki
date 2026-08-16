# UPDATE SCOPE — Codex Wiki 完成记录（7750465934 → 9ded177ce7）

> 完成日期：2026-08-16
> Wiki verified base / 父仓旧 gitlink：`7750465934d97dd3cbcb3b1655d2f622744010d3`
> 官方 `openai/codex origin/main` target：`9ded177ce7c1c0bd2047f902936c177612ab3434`
> 最终 submodule checkout：detached `9ded177ce7c1c0bd2047f902936c177612ab3434`
> 最新稳定版：`rust-v0.147.0`（2026-08-07）。最新 prerelease：`rust-v0.148.0-alpha.20`。HEAD 在稳定版之后。

本文件记录本轮已执行的 base→target 影响分析、新增/退役判定、L2 独立证伪与最终验证。方法约束仍以 `RUN.md` 和 `conventions.md` 为准。只读审计见 `_RESEARCH-9ded177ce7.md`。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/openai/codex`，官方默认分支为 `main`，且 base 是 target 的祖先。

提交前再次执行 `git fetch origin main`；`refs/remotes/origin/main` 仍为 `9ded177ce7c1c0bd2047f902936c177612ab3434`，相对冻结 target 的尾差为 0 commit。

```text
519 commits
1729 files changed
180960 insertions(+)
38952 deletions(-)
374 added / 30 deleted / 1310 modified / 15 renamed
```

复现：

```bash
git -C codex rev-list --count 7750465934d97dd3cbcb3b1655d2f622744010d3..9ded177ce7c1c0bd2047f902936c177612ab3434
git -C codex diff --shortstat 7750465934d97dd3cbcb3b1655d2f622744010d3..9ded177ce7c1c0bd2047f902936c177612ab3434
git -C codex diff --name-status 7750465934d97dd3cbcb3b1655d2f622744010d3..9ded177ce7c1c0bd2047f902936c177612ab3434
```

## 2. 177 个基线节点的影响分级

分级把基线 `index.json` 的 source 文件/目录与 target diff 交叉：

| 分级 | 数量 | 处理 |
|---|---:|---|
| A-BROKEN | 6 | source 删除/移动，必须重定位 |
| B-HEAVY | 15 | 直接 source churn ≥ 2,000，重读 |
| C-DRIFT | 146 | 至少一个直接 source 改动 |
| D-CLEAN | 10 | 已登记 source 未改；仍 bump SHA 并核对路径 |

6 个 A-BROKEN 都是 source 退役，不是 Wiki 概念退役：

1. `subsys.core.context-manager`：`core/src/audio_preparation.rs` → `utils/audio/src/lib.rs`
2. `subsys.core.instruction-assembly`：`core-skills/src/skill_instructions.rs` 删除，指令下沉 `ext/skills`
3. `subsys.core.collaboration-modes`：删除 `execute.md` / `pair_programming.md`
4. `subsys.config-auth.skills`：`core-skills` crate 退役，迁到 `ext/skills` + `skills`
5. `subsys.config-auth.plugins`：仍引用已删 `core-skills/src/loader.rs`
6. `subsys.cloud.cloud-config`：`cli/src/mcp_cmd/cloud_config.rs` → `cli/src/cloud_config.rs`

## 3. Inventory 变化

### 退役节点

无。

本轮有概念/字段退役，但它们不是独立 Wiki 节点：

- `ModeKind::PairProgramming` / `Execute` 变体删除；旧名是 `Default` 的 serde alias。
- `core-skills` crate 整体删除。
- `Op::UserInput` 不再是 regular turn 入口，换成 `Op::TurnInput`。
- `thread/rollback` 对 Paginated 线程 deprecated，改走 `thread/revert`。
- `RolloutItem` / `InitialHistory` 定义迁到 `history` crate。
- `resolve_tool_apporval` 不再存在；中央入口是 `Session::request_approval()`。

### 新增节点

| 节点 | 判定 |
|---|---|
| `subsys.core.approval-guardian-v2` | 独立 crate `ext/guardian-v2`：Luna 风险分类 + 低风险直批 + 高风险回落 V1 |
| `subsys.core.thread-queue` | 独立 `ext/queue` + 6 个 `thread/queue/*` RPC + `ThreadQueueChanged` |
| `subsys.core.rollout-migration` | legacy JSONL → Paginated 后台迁移 / rollback / CLI `migrate-rollouts` |
| `subsys.platform.diagnostics` | `diagnostics` crate + `codex doctor` 扩展 + `server/diagnostics` |

最终为 **181 个 verified nodes**：

| Tier | 数量 |
|---|---:|
| T0 | 11 |
| T1 | 70 |
| T2 | 88 |
| T3 | 12 |

其中 tool nodes 37；workspace members **134**；App-Server catalog **229**（144 client requests + 74 notifications + 11 server requests）；`ConfigToml` 顶层键 **97**；`Op`/`EventMsg` **27/81**；feature registry **114**。

`FEATURES` 数组与 `Feature` enum 均为 114 条一一对应。naive `FeatureSpec {` 字面计数会多算辅助类型，不能当 catalog 数。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| Guardian V2 | Luna 预打分、`SecurityRiskScore` 快照、低于 `review_threshold` 才直批；高风险/缺分/模型强制 auto-review 回落 V1。`subsys.core.approval-guardian-v2` |
| Thread queue | `queue_1.sqlite`、`MAX_QUEUE_ITEMS=100`、6 experimental RPC、拒绝 ephemeral/v2 spawned subagents。`subsys.core.thread-queue` |
| Rollout migration | feature `background_paginated_rollout_migration` default-off；CLI 默认 dry-run。`subsys.core.rollout-migration` |
| Thread revert | Paginated 用 `thread/revert`；`thread/rollback` 对非 TUI 发 deprecationNotice。`rpc.thread-methods` / `thread-store` |
| Skills 下沉 | host loader/catalog 在 `ext/skills`，invocation/selection 在 `skills`。`subsys.config-auth.skills` |
| Code Mode gRPC | `grpc://` host、`/readyz` `/healthz`、dual transport。`subsys.core.code-mode-runtime` |
| UnifiedExec | `Feature::UnifiedExec` 全平台默认 `true`（含 Windows），仍受 `conpty_supported()` 约束。 |
| Collaboration modes | 只剩 `Plan` / `Default`。 |
| Diagnostics | doctor disk/security/storage/endpoint + experimental `server/diagnostics`。 |
| Workload identity | 新 crate，写入 `subsys.providers.auth-layer` / `subsys.config-auth.auth-flows`，不另建节点。 |
| MCP | protocol discovery metrics、CIMD vs DCR OAuth registration、hooks `mcp_tool` handler。 |
| TUI startup | composer 在非 first-login 时可编辑但不提交；`/export` 存在；仍无 thread-section CRUD UI。 |
| Protocol | `Op` 27（`TurnInput`/`ThreadSettings`/`ThreadRollback`/`ApproveGuardianDeniedAction`）；`EventMsg` 81。 |

## 5. L2 独立证伪

源码影响按 core/tools、thread/state、Guardian、App-Server/protocol、MCP/providers、TUI、exec/network 与 catalogs 分面重读；节点落盘后再对四个新节点和 crate/feature/RPC 计数做独立证伪。

L2 已推翻并就地修复两条 Guardian V2 过宽结论：

- TUI/exec 并不是 empty-registry：它们走 app-server `thread_extensions()`，因此会装上 V2；只有 MCP 与 V1 reviewer 的 empty registry 没有 V2。
- Guardian reviewer 工具面是 `spec_plan.rs` 硬编码的 `exec_command`/`write_stdin`/`view_image`，并不读取 `Feature::UnifiedExec`。

其余高风险主张经源码存活：6 个 queue RPC 均为 experimental、`MAX_QUEUE_ITEMS=100`、background migration default-off、CLI 默认 dry-run、`server/diagnostics` experimental、crate 134、feature 114、RPC 144/74/11、Op/EventMsg 27/81。

L1 先报 2096 error（9 个跨节点 symbol 冲突 + 2086 条 `[E:]` 落在注释/闭合符 + 1 条 uncertainty 示例路径）。已 qualify 冲突 symbol，并把闭合符/注释引用拨到邻近支撑代码行；随后 lint **0 error / 0 warning**。

机械行号重定位不能代替语义重读。A-BROKEN、Guardian V2、thread queue/revert/migration、Code Mode gRPC、RPC 计数、crate/feature catalog 已按源码重写；部分低 churn 子系统页以 SHA + 已知失效 claim 修补为主，残余行号精度风险记在 `_staging/uncertainty-catalogs.md`。

## 6. 不确定项与跳过判定

继续保留或新记的主要 `[U]` 包括：remote Code Mode 部署层认证/TLS、multi-segment incremental replay、exec-network `Ask` 最终 UI、system proxy/PAC 长期契约、Windows IPv6 process attribution、dynamic skill selector 稳定用户协议、remote plugin disk cache 长期格式、Guardian V2 是否只在 app-server `thread_extensions()` 安装、reserved thread id 的 first-party 调用面、background migration 未宣称完成。

未为 workload-identity、thread revert、thread usage、code-mode gRPC 另建节点：它们分别由 auth-layer/auth-flows、thread-store/thread RPC、token-budget、code-mode-runtime 自包含承载。

## 7. 元数据与引用收敛

- 所有 181 个 retained/new verified node frontmatter：`updated: 9ded177ce7`。
- `index.json.updated` 与所有 `index.nodes[].updated`：`9ded177ce7`。
- `README.md`、`llms.txt`、`index.json` 的节点/tool/crate/RPC/feature 计数一致。
- 6 个失效 source 均已重定位；submodule 源码工作树 clean。
- `opencode` / `pi` 子模块未初始化、未修改。

## 8. 最终验证

```bash
git -C codex rev-parse HEAD
git -C codex status --short
node docs/llm-wiki/codex/tools/reconcile.mjs
node docs/llm-wiki/codex/tools/reconcile.mjs
node docs/llm-wiki/codex/tools/lint.mjs
jq -r '.updated, (.nodes|length), ([.nodes[].updated]|unique|join(",")), ([.nodes[]|select(.status=="planned")]|length)' docs/llm-wiki/codex/index.json
git diff --check
```

验收结果：

- submodule HEAD 精确等于 target full SHA，子模块源码工作树 clean；相对 `origin/main` 尾差 0。
- reconcile 首轮登记 4 个新节点，第二轮幂等。
- lint：0 error。
- 181 verified / 0 planned，节点、index 顶层与子模块 SHA 一致。
