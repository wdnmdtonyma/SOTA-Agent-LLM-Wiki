# UPDATE SCOPE — Pi Wiki（ff72faba28 → 4c6fb7cfe8）

> 开始日期：2026-10-03
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`ff72faba28d10c86611863d0aaa5d3122f2d8cb0`
>
> **target**（官方 `earendil-works/pi` `origin/main`）：`4c6fb7cfe8c538a668726f6f8b3554098c39faee`（产品 **1.0.1** + `[Unreleased]`）
>
> 冻结时 submodule checkout：detached `4c6fb7cfe8`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 退役已删 harness 节点 → 机械 SHA bump + `--safe-only` 证据 rebase → 并行 filler（create/rewrite/refresh）→ 高价值节点独立 L2 证伪 → 独立 L3 → `llms.txt` / README / index 登记 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/earendil-works/pi`，默认分支 `main`，base 是 target 的祖先。

```text
166 commits
959 files changed
78918 insertions(+)
118215 deletions(-)
```

复现：

```bash
git -C pi rev-list --count ff72faba28d10c86611863d0aaa5d3122f2d8cb0..4c6fb7cfe8c538a668726f6f8b3554098c39faee
git -C pi diff --shortstat ff72faba28d10c86611863d0aaa5d3122f2d8cb0..4c6fb7cfe8c538a668726f6f8b3554098c39faee
```

上游 release commits：`v0.99.0` / `v0.99.1` / `v0.99.2` / `v1.0.0` / `v1.0.1`。最新 commit：`Add [Unreleased] section for next cycle`（2026-10-03）。`git diff --name-status --find-renames`：**255 A / 331 D / 7 R / 366 M**。

不要把 `packages/durable/docs/pico*`、`packages/agent/docs/pico*` 当 shipped 源。agent-core 的 experimental harness 已在 1.0.0 删除，不要再 cite `packages/agent/src/harness/**` 或 `packages/session-backends/**`。

## 2. 204 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-4c6fb7cfe8.json`）。共享大文件会把机械命中抬成 B-HEAVY / C-DRIFT；执行时按主题收束：

| 分级 | 机械数量 | 实际处理 |
|---|---:|---|
| A-BROKEN | 37 | 17 个已删 harness/sqlite 节点 **退役**；其余 rewrite（补新路径 / 改 source） |
| B-HEAVY | 59 | 主题 rewrite（MCP / codemode / catalogs / durable / TUI fullscreen / extensions）；其余 SHA bump + exact rebase |
| C-DRIFT | 78 | 主题 refresh；其余 SHA bump / exact `[E:]` rebase |
| D-CLEAN | 30 | 只 bump SHA |

机械 A-BROKEN 里因 **整个 source 树删除** 而退役的节点见 §3。其余 A-BROKEN（spine、durable.runtime、skills/prompt surface、tools-catalog、interactive.components、usage-accounting、telemetry.contracts 等）rewrite。

## 3. Inventory 变化

基线 204。本轮 **−17 / +8**，目标 **195**（T0 12 / T1 37 / T2 118 / T3 28；收尾以 index 为准）。

### 退役（源码已从 agent-core / session-backends 删除，主题由现有或新节点覆盖）

| 退役 id | 替代 |
|---|---|
| `subsys.agent-core.session-storage` | `subsys.coding-agent.session-manager` + `subsys.durable.storage` |
| `subsys.agent-core.jsonl-storage` | 同上 |
| `subsys.agent-core.memory-storage` | `subsys.durable.storage` |
| `subsys.agent-core.session-tree` | `spine.session-state-model` + `subsys.coding-agent.session-manager` |
| `subsys.agent-core.tree-navigation` | `surface.sessions.management` |
| `subsys.agent-core.session-search` | 能力已随 harness 删除；durable 无 FTS 替代节点 |
| `subsys.agent-core.execution-tools` | `subsys.durable.harness`（durable `./tools`）+ `ref.tools-catalog` |
| `subsys.agent-core.agent-harness-lifecycle` | `subsys.durable.harness` |
| `subsys.agent-core.harness-events` | `subsys.durable.harness` |
| `subsys.agent-core.exec-env` | `subsys.durable.runtime`（`./env` / `./env/node`） |
| `subsys.agent-core.message-conversion` | `subsys.agent-core.message-model` |
| `subsys.session-backends.sqlite-node` | `subsys.durable.storage`（SQLite 在 pi-durable） |
| `ref.agent.error-codes` | durable `errors.ts` 写入 `subsys.durable.runtime`；coding-agent 错误留在各自节点 |
| `ref.agent.session-entry-types` | `ref.coding-agent.session-format` |
| `subsys.agent-core.skills-loading` | `surface.skills.system` |
| `subsys.agent-core.prompt-templates` | `surface.prompt-templates.system` |
| `subsys.agent-core.system-prompt` | `subsys.coding-agent.system-prompt` |

`ref.agent.agent-events` **保留**：`AgentEvent` 仍在 `packages/agent/src/types.ts`（10 个 loop variant）。删掉 harness `HarnessEvent` 叙述。

`subsys.agent-core.compaction` / `branch-summary` / `ref.agent.compaction-config` **保留并 remap** 到 `packages/coding-agent/src/core/compaction/`。

### 新增节点

| id | path | 原因 |
|---|---|---|
| `surface.mcp.overview` | `surface/mcp/overview.md` | 用户可见 MCP：`/mcp`、`pi mcp`、`.pi/mcp.json`、exposure |
| `surface.codemode.overview` | `surface/codemode/overview.md` | 用户可见 codemode 工具与 settings |
| `subsys.mcp.client` | `subsystems/mcp/client.md` | 新包 `@earendil-works/pi-mcp`：client / transports / OAuth |
| `subsys.codemode.runtime` | `subsystems/codemode/runtime.md` | 新包 `@earendil-works/pi-codemode`：QuickJS WASM sandbox |
| `subsys.coding-agent.mcp` | `subsystems/coding-agent/mcp.md` | 内置 replaceable `mcp` 扩展 + `core/mcp-servers.ts` |
| `subsys.coding-agent.codemode` | `subsystems/coding-agent/codemode.md` | 内置 replaceable `codemode` 扩展；含 `tool-search` 协作 |
| `subsys.coding-agent.virtual-models` | `subsystems/coding-agent/virtual-models.md` | Virtual models / `pi-virtual` API |
| `subsys.durable.harness` | `subsystems/durable/harness.md` | durable `Harness` / tasks / tools / registry（1.0 可复用 harness 落点） |

不要把 pico 手稿写成 shipped 运行时。不要把 `pi-durable` SQLite 写成已删除的 `pi-session-backend-sqlite-node`。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| 产品版本 **1.0.1** + Unreleased | `spine.overview`、`ref.package-index`、README / llms.txt |
| 新包 `packages/codemode`、`packages/mcp`；删除 `packages/session-backends` | `spine.layered-architecture`、`ref.package-index` |
| 根 build：chord → tui → telemetry → **codemode → mcp** → ai → durable → agent → protocol → client → server → coding-agent | 同上。**不再** build sqlite-node |
| agent-core 1.0 只剩 `Agent` / loop / proxy / types | `spine.agent-loop`、`spine.layered-architecture`、保留的 agent-core 节点 |
| 可复用 session/harness 迁到 `pi-durable` | `subsys.durable.runtime` / `storage` / **harness** |
| MCP 产品面 + `mcp_servers_change` | `surface.mcp.overview`、`subsys.coding-agent.mcp`、extension catalogs |
| Codemode + tool_search 内置扩展 | `surface.codemode.overview`、`subsys.coding-agent.codemode` |
| Virtual models | `subsys.coding-agent.virtual-models`、`subsys.coding-agent.model-registry` |
| TUI 默认 fullscreen；`quietStartup: "header"` | `surface.modes.interactive`、`ref.coding-agent.config-keys` |
| Classifier +`llama-cpp-classify`；Cloudflare Clef | `subsys.ai.classifiers`、`ref.ai.wire-protocol-catalog` |
| `registerToolRenderer()`；MCP 工具可在 server 连接前渲染 | `surface.extensions.contribution-points` |
| Nix flake；managed installer；去掉 shrinkwrap | `spine.overview`、`surface.cli.overview`（一句即可） |
| experimental durable TUI / vacation planner | `subsys.coding-agent.experimental-cli` |
| `daxnuts` easter egg 删除；`/arminsayshi` 3D | `ref.interactive.components` |

### Catalog 重数（以源码为准，本轮除 components 外不变）

| 项 | 上一轮 | 本轮起点 | 备注 |
|---|---:|---:|---|
| runtime providers | 42 | **42** | 集合未增 provider 函数；内容变了 |
| static model buckets | 42 | **42** | 仍 42 个 `*.models.ts` |
| KnownApi (chat) | 10 | **10** | 不变 |
| KnownImageApi | 1 | **1** | `openrouter-images` |
| KnownClassifierApi | 2 | **3** | +`llama-cpp-classify` |
| slash builtin | 24 | **24** | `/mcp` 是 mcp 扩展贡献，不进 `BUILTIN_SLASH_COMMANDS` |
| RPC commands | 33 | **33** | 须再核 |
| extension `on()` 事件 | 40 | **41** | +`mcp_servers_change` |
| tools | 8 | **8** | coding/read-only 仍不含 powershell |
| interactive components | 43 | 待核 | `daxnuts.ts` 已删 |

config keys / env / CLI / keybindings 由对应 catalog filler 按 ground truth 重数，不要沿用 88 / 105 / 63 / 90。Settings 新增 `codemode` 等，`tuiMode` 默认 `"fullscreen"`，`quietStartup` 可为 `"header"`。

## 5. 证伪策略

Fillers 自核 ≥3 条 `[E:]`。随后按 `RUN.md`：

- **L2**：独立 verifier，覆盖 layered-architecture / agent-core 瘦身、durable harness、MCP、codemode、virtual models、catalogs（providers/slash/events/config/env）、session persist、TUI fullscreen。
- **L3**：≤2 轮；`l2_fixes_hold` 必须对照源码成立。
- 报告：`_research/update-ff72faba28-4c6fb7cfe8-l2.md`。

机械 SHA 页未逐页 L2。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 写下的 `uncertainty-update-4c6fb7cfe8-*` 会并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: 4c6fb7cfe8`
- `index.json.updated` 与所有 `index.nodes[].updated`：`4c6fb7cfe8`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（目标 195）
- `pkg` 取值含 `codemode` 与 `mcp`（lint / conventions / index.packages）
- 未安装上游 `node_modules`，不宣称 runtime tests 通过

## 8. 最终验证

```bash
git -C pi rev-parse --short=10 HEAD   # 4c6fb7cfe8
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/pi/tools/lint.mjs
```

完成条件：全部节点 verified / 0 planned；`lint` 0 error；二次 reconcile 幂等。父仓 `pi` gitlink 工作树指向 `4c6fb7cfe8c538a668726f6f8b3554098c39faee`。
