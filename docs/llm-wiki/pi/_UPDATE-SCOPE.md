# UPDATE SCOPE — Pi Wiki（305c014dcc → 086c32e745）

> 本文件记录 2026-08-16 的 Pi-only 增量更新。
> **旧父仓 gitlink / Wiki 基线**：`305c014dcccfe97ebd3f4057ac16c436f1e2c71e`
> **最终点时快照 target**：`086c32e74530564922d011ade23ff582c9d63116`
> **冻结时间**：2026-08-16；冻结时已确认 target 是官方 `origin/main`
> **跨度**：317 commits · 547 files changed · +37,929 / -23,797

复现：

```bash
git -C pi fetch origin main
git -C pi rev-list --count 305c014dcccfe97ebd3f4057ac16c436f1e2c71e..086c32e74530564922d011ade23ff582c9d63116
git -C pi diff --shortstat 305c014dcccfe97ebd3f4057ac16c436f1e2c71e..086c32e74530564922d011ade23ff582c9d63116
```

上游覆盖 v0.84.0 / v0.84.1 / v0.84.2 与随后的 Copilot login 修复。

## 1. 影响分类

以基线 202 个节点为总体，按 source 存在性 + 真实 diff 求交：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 20 | 10 个 legacy server 源面删除；harness session 文件拆分；storage 包改名为 session-backends |
| B-HEAVY | 见下 | harness v4、telemetry 新包、TUI LaTeX/search、catalog 成员变化 |
| C-DRIFT | 154 | source 命中但多数可 evidence rebase + 局部语义更新 |
| D-CLEAN | 28 | 无 source 命中 |
| 退役 | 10 | legacy JSONL IPC / supervisor / Radius 整面删除 |
| 新增 | 5 | telemetry、harness-events、latex、alt-screen-search、cloudflare-gateway-binding |

## 2. 结构性退役

`feat: remove legacy server implementation (#7614)` 删除 `packages/server/src/legacy/**`。下列节点退役（文件删除、index 移除）：

- `subsys.server.supervisor`
- `subsys.server.rpc-spawner`
- `subsys.server.ipc-transport`
- `subsys.server.message-protocol`
- `subsys.server.request-handler`
- `subsys.server.storage`
- `subsys.server.radius`
- `subsys.server.config`
- `ref.server.ipc-messages`
- `ref.server.instance-status`

`pi-server` 只保留 composable protocol session server：`session-server` / `live-sessions` / `protocol-adapters` / `unix-transport`。

## 3. 必须重写的 A/B 面

### Harness v4 session API

- 旧 `SessionRepository` / `ArraySessionIndex` / `jsonl-repo.ts` / `memory-repo.ts` / `keyed-operation-queue.ts` 已删除。
- 新公开面：`JsonlSessionRepo`、`InMemorySessionRepo`、`Session` / `SessionStorage` / lane-based v4 types，文件在 `packages/agent/src/harness/session/{index,jsonl,jsonl/*,memory,session,types,context,state}.ts`。
- 搜索从 `harness/session/search.ts` 迁到 `packages/agent/src/search/{index,scanning}.ts`。
- 新增 `harness/events.ts`、`harness/reducer.ts`、`harness/result.ts`、`harness/telemetry.ts`。

受影响节点：`spine.session-state-model`、`subsys.agent-core.session-storage`、`jsonl-storage`、`memory-storage`、`tree-navigation`、`session-tree`、`session-search`、`agent-harness-lifecycle`、`ref.agent.session-entry-types`、`ref.agent.agent-events`、`ref.agent.error-codes`。

### session-backends 包改名

- `packages/storage/sqlite-node` → `packages/session-backends/sqlite-node`
- npm 名：`@earendil-works/pi-session-backend-sqlite-node`
- Wiki 节点从 `subsys.storage.sqlite-node` 迁到 `subsys.session-backends.sqlite-node`（路径 `subsystems/session-backends/sqlite-node.md`），`pkg: session-backends`。

### 新包 `pi-telemetry`

- `@earendil-works/pi-telemetry`：vendor-neutral contracts + memory/noop adapters + testing conformance。
- 新节点：`subsys.telemetry.contracts`。
- `pkg` 枚举新增 `telemetry` 与 `session-backends`。

## 4. 新增节点

| id | 路径 | 理由 |
|---|---|---|
| `subsys.telemetry.contracts` | `subsystems/telemetry/contracts.md` | 新 workspace 包 |
| `subsys.agent-core.harness-events` | `subsystems/agent-core/harness-events.md` | `harness/events.ts` 订阅/watch API |
| `subsys.tui.latex` | `subsystems/tui/latex.md` | `packages/tui/src/latex.ts` Unicode math |
| `subsys.tui.alt-screen-search` | `subsystems/tui/alt-screen-search.md` | `packages/tui/src/alt-screen-search.ts` fullscreen search |
| `subsys.ai.cloudflare-gateway-binding` | `subsystems/ai/cloudflare-gateway-binding.md` | `createGatewayBindingFetch()` Workers AI binding |

## 5. Catalog / 产品增量（必须逐实例重核）

- provider：新增 Qwen Token Plan Individual → runtime providers **40**（原 39）。
- models：重跑 `tools/generate-model-catalog.mjs`，更新 `group.models.instance_count`。
- config：`defaultTools`、fullscreen exit output、markdown mermaid/latex、`--use-theme` 等。
- env：`AI_AGENT=pi`、`PI_TUI_ESC_TIMEOUT`、Qwen Individual 共享 `QWEN_TOKEN_PLAN_API_KEY`。
- keybindings / TUI actions：fullscreen search、half-page scroll、single-line scroll、prompt history。
- CLI：`--use-theme`、`pi auth check`。
- slash / extension events：`terminate` on blocked tool_call；`expandPromptTemplates`。
- JSON/RPC：`message_update` 只发 delta，去掉 cumulative `message` / `partial`。
- protocol：`SessionMetadata` 取代 list summaries。
- coding-agent：`AGENTS.override.md`、UI mode 改名 TUI mode、configurable Harness factory、auth preflight。

## 6. 执行与验收

- 只改 `docs/llm-wiki/pi/**` 与父仓 `pi` gitlink。
- 填充后 `node tools/reconcile.mjs` 两次 + `node tools/lint.mjs` 两次，须 0 error / 0 warning。
- 全部节点 `updated: 086c32e745`；index / 文件树 / `llms.txt` 同一集合。
- 未安装上游 `node_modules`，不宣称 runtime tests 通过。

## 7. 最终结果

- 节点：202 → **197**（退役 10 个 legacy server，新增 5 个面 + session-backends 迁址）。
- 197 verified / 0 planned；T0/T1/T2/T3 = 12/34/118/33。
- catalog：providers **40**，structural model buckets **39**，config **79**，keybindings **89**，env **95**。
- 两次 reconcile 幂等；两次 lint **0 error / 0 warning**。
- 冻结后再 fetch：`origin/main` 仍为 `086c32e74530564922d011ade23ff582c9d63116`。
- L2 记录：`_research/update-305c014dcc-086c32e745-l2.md`。
