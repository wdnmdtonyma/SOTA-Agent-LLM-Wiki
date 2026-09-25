# UPDATE SCOPE — Pi Wiki（71dca871bc → ff72faba28）

> 完成日期：2026-09-25
>
> **base**（上一轮 verified / 父仓旧 gitlink）：`71dca871bc80b6bc97be37f0ca3189399d651fff`
>
> **target**（官方 `earendil-works/pi` `origin/main`）：`ff72faba28d10c86611863d0aaa5d3122f2d8cb0`（产品 **0.87.1** + `[Unreleased]`）
>
> 冻结时 submodule checkout：detached `ff72faba28`
>
> 方法约束仍以 `RUN.md` 和 `conventions.md` 为准。本轮执行：影响分级 → 机械 SHA bump + `--safe-only` 证据 rebase → 并行 filler（create/rewrite/refresh）→ 高价值节点独立 L2 证伪 → 独立 L3 → `llms.txt` / README / index 登记 → reconcile ×2 → lint。

## 1. 上游与源码跨度

已确认 submodule `origin` 为 `https://github.com/earendil-works/pi`，默认分支 `main`，base 是 target 的祖先。

```text
190 commits
747 files changed
89068 insertions(+)
24124 deletions(-)
```

复现：

```bash
git -C pi rev-list --count 71dca871bc80b6bc97be37f0ca3189399d651fff..ff72faba28d10c86611863d0aaa5d3122f2d8cb0
git -C pi diff --shortstat 71dca871bc80b6bc97be37f0ca3189399d651fff..ff72faba28d10c86611863d0aaa5d3122f2d8cb0
```

上游 tag：`v0.86.0` / `v0.86.1` / `v0.87.0` / `v0.87.1`。最新 commit：`fix(coding-agent): save new session file at the first user message`（2026-09-25）。`git diff --name-status --find-renames`：**246 A / 26 D / 1 R / 474 M**。

不要把 `packages/durable/docs/pico*`、`packages/agent/docs/pico*` 当 shipped 源。

## 2. 200 个基线节点的影响分级

分级把基线 `index.json` 的 `source[]` 与 target diff 交叉（见 `_staging/impact-ff72faba28.json`）。共享大文件（尤其 `docs/extensions.md`、`docs/rpc.md`、`agent-session.ts`）会把机械命中抬成 B-HEAVY / C-DRIFT；执行时按主题收束：

| 分级 | 机械数量 | 实际处理 |
|---|---:|---|
| A-BROKEN | 9 | 删除 source 的节点 rewrite；补新路径 |
| B-HEAVY | 25 | 主题 rewrite（extensions / catalogs / chord / session / RPC）；其余 SHA bump + exact rebase |
| C-DRIFT | 122 | 主题 refresh；其余 SHA bump / exact `[E:]` rebase |
| D-CLEAN | 44 | 只 bump SHA |

机械 A-BROKEN（source 被删）：

- `surface.misc.images`、`subsys.ai.image-generation`、`ref.ai.image-models`（`images-models.ts` / `image-models.generated.ts` / `providers/openrouter-images.ts` 删除）
- `subsys.ai.anthropic-messages`、`subsys.ai.openai-responses`、`subsys.ai.openai-codex-responses`、`subsys.ai.model-discovery`（`utils/deferred-tools.ts` 删除）
- `subsys.evals.pi-harness`、`subsys.evals.comparative-harness`（evals 目录重写）

## 3. Inventory 变化

基线 200。本轮 **+4 / -0**，最终 **204**（T0 12 / T1 35 / T2 124 / T3 33）。

新增节点：

| id | path | 原因 |
|---|---|---|
| `subsys.durable.runtime` | `subsystems/durable/runtime.md` | 新包 `@earendil-works/pi-durable`：session / documents / types |
| `subsys.durable.storage` | `subsystems/durable/storage.md` | Memory / JSONL / SQLite storage + Node adapters + conformance |
| `subsys.ai.classifiers` | `subsystems/ai/classifiers.md` | `Models.classify()` + `KnownClassifierApi` + TypeSafe / Cloudflare Jev |
| `subsys.coding-agent.cache-warming` | `subsystems/coding-agent/cache-warming.md` | prompt-cache warming + `cache_warming_decision` |

不要把 pico 手稿写成 shipped 运行时。不要退役现有节点。`pi-session-backend-sqlite-node` 与 `pi-durable` 是不同层，不要合并。

## 4. 必须覆盖的新架构与对外行为

| 主题 | 结论与承载节点 |
|---|---|
| 产品版本 0.87.1 + Unreleased | `spine.overview`、`ref.package-index`、README / llms.txt |
| 新 workspace `packages/durable`；build 链插入 durable | `spine.layered-architecture`、`ref.package-index`、两个 durable 节点 |
| Image 模型并入 `Provider`/`Models`；删除 `ImagesModels` | `subsys.ai.image-generation`、`ref.ai.image-models`、`surface.misc.images`、`subsys.coding-agent.model-registry` |
| Classifier / Jev | `subsys.ai.classifiers`、`ref.ai.wire-protocol-catalog`、`subsys.ai.model-discovery` |
| Catalog schema v6 + `IMAGE_MODELS` / `CLASSIFIER_MODELS` | `ref.ai.model-catalog`、`subsys.ai.model-discovery`、`subsys.ai.model-catalog-publication` |
| Meta + TypeSafe providers；Radius 静态 shard | `ref.ai.provider-catalog`、`surface.providers.overview`、`surface.providers.auth` |
| `TranscriptContext` 替换 provider stream `Context` | `spine.provider-stream`、`subsys.ai.wire-protocol-dispatch`、`surface.providers.custom-provider` |
| `shouldStopAfterTurn` → `finishTurn`；新增 `prepareRequest` | `spine.agent-loop`、`subsys.agent-core.turn-control` |
| `ContextEditEntry`；SessionManager 为 canonical context | `spine.session-state-model`、`ref.coding-agent.session-format`、`subsys.coding-agent.session-manager` |
| Extension：`context_with_system` / `agent_before_settle` / `provider_stream_event` / `cache_warming_decision`；`turn_end` 可行动 | `surface.extensions.events`、`ref.coding-agent.extension-events`、`subsys.coding-agent.extension-runner` |
| Evals Docker 文档对照 rewrite | `subsys.evals.pi-harness`、`subsys.evals.comparative-harness` |
| 新 session 文件在第一条 user/assistant 消息时创建 | `subsys.coding-agent.session-manager`、`surface.sessions.management` |
| RPC prompt disposition / `streamingBehavior` | `surface.modes.rpc`、`surface.modes.rpc-protocol`、`ref.coding-agent.rpc-methods` |
| `/bug` slash | `ref.coding-agent.slash-commands`、`surface.slash-commands.overview` |
| Chord immutable delta tracker | `subsys.chord.delta` |
| HTML export hidden-message toggle | `subsys.coding-agent.html-export` |
| TypeScript 7 + Node type stripping | `spine.overview`、`ref.package-index`（一句即可） |

### Catalog 重数（以 target 源码为准，filler 必须再核）

| 项 | 上一轮 | 本轮 | 备注 |
|---|---:|---:|---|
| runtime providers | 40 | **42** | +`meta` +`typesafe` |
| static model buckets | 39 | **42** | +`meta` +`typesafe` +`radius` |
| KnownApi (chat) | 10 | **10** | 不变 |
| KnownImageApi | 1 | **1** | `openrouter-images` |
| KnownClassifierApi | — | **2** | `typesafe-system-one`、`cloudflare-workers-ai-system-one` |
| slash | 23 | **24** | +`/bug` |
| RPC commands | 33 | **33** | `prompt` 增 `streamingBehavior` |
| extension `on()` 事件 | 36 | **40** | +4 见上 |
| tools | 8 | **8** | coding/read-only 仍不含 powershell |
| interactive components | 43 | **43** | 文件数仍 43 |
| TUI components | 16 | 待核 | `packages/tui/src/components/` 现 18 文件 |

config keys / env / CLI / keybindings 由对应 catalog filler 按 ground truth 重数，不要沿用 86 / 103 / 63 / 90。

## 5. 证伪策略

Fillers 自核 ≥3 条 `[E:]`。随后按 `RUN.md`：

- **L2**：独立 verifier，覆盖 durable、image/classifier、evals、agent-loop/finishTurn、session context edit、extension events、catalogs、RPC/session persist、chord delta。
- **L3**：≤2 轮；`l2_fixes_hold` 必须对照源码成立。
- 报告：`_research/update-71dca871bc-ff72faba28-l2.md`。

机械 SHA 页未逐页 L2。

## 6. 不确定项

`reference/uncertainty.md` 由 reconcile 从 `_staging/uncertainty-*.md` 重生。本轮 filler 写下的 `uncertainty-update-ff72faba28-*` 会并进去。

## 7. 元数据与引用收敛

- 全部 verified node frontmatter：`updated: ff72faba28`
- `index.json.updated` 与所有 `index.nodes[].updated`：`ff72faba28`
- `README.md`、`llms.txt`、`index.json` 的节点计数一致（204）
- `pkg` 取值含 `durable`（lint / conventions / index.packages）
- 未安装上游 `node_modules`，不宣称 runtime tests 通过

## 8. 最终验证

```bash
git -C pi rev-parse --short=10 HEAD   # ff72faba28
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs   # 第二次：0 节点更新
node docs/llm-wiki/pi/tools/lint.mjs
```

完成条件：204 verified / 0 planned；`lint` 0 error；二次 reconcile 幂等。父仓 `pi` gitlink 工作树指向 `ff72faba28d10c86611863d0aaa5d3122f2d8cb0`。
