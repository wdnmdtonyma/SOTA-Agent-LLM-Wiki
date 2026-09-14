# UPDATE SCOPE — opencode wiki 增量更新（b3f1a96c6d → df23b7f948）

> 更新日期：2026-09-14
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`b3f1a96c6dd7adeb28b36dd11add1998fc84d67b`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`df23b7f9488a38e6f8064a0739d4f8cde86d7cfb`
>
> **跨度**：11 commits · 39 files changed · 2,033 insertions · 1,319 deletions
>
> 发布版本：仍是 **`1.18.30`**。`bun@1.3.14` 与 36 workspace packages 不变。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 189 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉。

```sh
git -C opencode diff --numstat \
  b3f1a96c6dd7adeb28b36dd11add1998fc84d67b..df23b7f9488a38e6f8064a0739d4f8cde86d7cfb
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除 |
| B-HEAVY | 1 | `ref.package-index`（`packages/` umbrella，含 console support 新路由、ACP、stats、web i18n、gateway pin） |
| C-DRIFT | 9 | source churn < 2,000 行 |
| D-CLEAN | 179 | source 未命中；统一 bump `updated` |
| 新节点 | 0 | batch block / billing header / restoreSession / retention 拆 query 写入既有节点 |
| 退役节点 | 0 | |
| 完成后 verified nodes | 189 | 不变 |

机械 C-DRIFT：`spine.overview`、`integrations.mcp-client`、`integrations.acp`、`server.embedded-public-api`、`clients.console`、`infra.build-monorepo`、`infra.native-binary-release`、`infra.nix`、`peripheral.stats`。

语义批次：`integrations.acp`、`clients.console`、`peripheral.stats`、`ref.package-index`。`clients.console` 的机械命中只有 `handler.ts`；`workspace.ts` 与两条 support 路由本轮补进 `source[]`。

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| ACP `restoreSession`：durable `Session.model`/`agent` 先于 message history | `integrations.acp` | load/resume/fork 共用；resume 仍不 replay |
| ACP `DEFAULT_VARIANT_VALUE = "default"`；`hasVariant` 接受哨兵 | `integrations.acp` | effort options 始终并入 `"default"` |
| 换模型发 `config_option_update`；effort/mode 只回 RPC | `integrations.acp` | `sendConfigOptionUpdate` 只挂 model 路径 |
| reasoning replay/live thought 的 ACP `messageId` 用 part id | `integrations.acp` | text chunk 仍用 message id |
| `Workspace.blockBatch` / `unblockBatch`；support 两条 POST | `clients.console` | 无单条 `block` 导出；缺 ID 进 `notFound` |
| lite 新 inference 写 `x-zen-billing-source` `go`/`credit` | `clients.console` | 只在 `modelList === "lite"` 且 `isNewInference` |
| Stats retention 每个 cohort week 一条 query | `peripheral.stats` | 不再整窗一条 SQL |
| R2 SQL 15 分钟 timeout + 关掉 Bun 5 分钟 idle | `peripheral.stats` | 失败 message 带耗时 |
| `deepseek-flash` → `deepseek-v4.1-flash` | `peripheral.stats` | stats 归一，不是 live zen catalog |
| `@ai-sdk/gateway` 3.0.104 → 3.0.191 | `ref.package-index` | pin only |
| web `docs/*/go.mdx` 营销额度 | 不单开节点 | 与上一轮相同：营销面 |
| `nix/hashes.json` | `infra.nix` | 只 bump SHA；行号仍是 2–6 |
| 发布仍 `1.18.30` | `spine.overview`、`ref.package-index` | bun / 36 packages 不变 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` 仍不是默认执行路径。
- 两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON。
- `hook.provider.models` 机制仍在。

## 4. 节点改动

### 语义更新

- ACP：`integrations.acp`（并补 `config-option.ts` 进 source）
- Console：`clients.console`（并补 `workspace.ts` 与 block/unblock 路由进 source）
- Stats：`peripheral.stats`
- 依赖 pin：`ref.package-index`

### 证据或 target 元数据更新

- 受 `service.ts` / `handler.ts` / `stat-sync.ts` / `r2-sql.ts` / `inference.ts` 行号漂移影响的 C-DRIFT 已机械重落 `[E]`。
- 179 个 D-CLEAN 完成 SHA bump。
- 全部 189 个 node frontmatter `updated` 统一为 `df23b7f948`。

## 5. L2 独立证伪

另起 4 个干净 workflow agent（effort `low`），对语义批次回源证伪 `df23b7f948`（不信 filler / update-facts）。4/4 `verified=true`。就地修了 ACP 换模型 variant 规则与 Stats 两处错绑行号。

### L3（独立复核 L2 改句，1 轮，无需第 2 轮）

L2 当时就地改完。按 `RUN.md` 对有改句的批次另起 L3，**只复核 L2 改句**，不信 L2 / filler。2/2 `l2_fixes_hold=true`，未再改文件。console 与 package-index L2 无改句，不单开 L3。

| 批次 | 结果 | 复核要点 |
|---|---|---|
| acp | hold | `selectModelVariant` 先 `selected.variant`；仅 `sameModel` 且 `hasVariant` 才保留 `current.variant`；换模型未带 variant 不把旧 effort 带到新模型。`service.ts:917` / `:924` / `:925` |
| stats | hold | home `runStatsEffect(getStatsHomeData())` 在 `index.tsx:85`（`:84` 是 `"use server"`）；`Promise.all` 三源 fetch 在 `model-catalog.ts:61`，`:4`–`:6` 是 URL 常量 |

| 批次 | 结果 | 就地修正要点 |
|---|---|---|
| acp | pass | 收紧「换模型保留 current variant」：必须同模型 |
| console | pass | 无再改。batch 500 / SELECT 存在性 / 无单条 `block` / lite `x-zen-billing-source` |
| stats | pass | `index.tsx:85`；补 `model-catalog.ts:61` |
| package-index | pass | 无再改。36 packages、`1.18.30`、`bun@1.3.14`、gateway `3.0.191` |

必核语义全部成立：ACP durable-first restore + `"default"` effort 哨兵 + reasoning `messageId` 用 part id / Support batch block 缺 ID 进 `notFound` 且无单条 `block` / lite 新 inference `x-zen-billing-source` / retention 按周拆 query / R2 SQL 15 分钟 timeout / `deepseek-flash` 只是 stats 归一 / `1.18.30`+36+`bun@1.3.14` / SessionV2 非默认。

仍开着：Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（`home.ts:743`）。

## 6. 未决与风险边界

- zen/go live 模型表来自外部 catalog。`go-models.ts` 与 web `docs/go.mdx` 是营销面。
- Console / Stats schema 与仓内 migration SQL 不同步处只记代码意图。
- workspace 路径含 `[id]` 的文件 lint 无法核 `[E:]`，lite-section 只作 `[I]`。
- 未安装上游 `node_modules`，不宣称 runtime tests 通过。
- Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（上一轮遗留 `[U]`）。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 189 个 verified node frontmatter `updated` 精确为 `df23b7f948`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数 189。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target。
- 本会话只改 `docs/llm-wiki/opencode/**`、根仓 `opencode` gitlink，以及本轮 L2/L3 workflow 定义。
