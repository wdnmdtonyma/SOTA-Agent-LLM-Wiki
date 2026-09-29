# UPDATE SCOPE — opencode wiki 增量更新（03e67171ab → 7945de2089）

> 更新日期：2026-09-29
>
> **base（上一轮 verified HEAD / 父仓旧 gitlink）**：`03e67171ab2dc1e7f16e8cebfbc7f778f61b89f0`
>
> **target（官方 `anomalyco/opencode` `origin/dev`）**：`7945de208964a49300d7f770d1a71d078db9a4c4`
>
> **跨度**：20 commits · 78 files changed · 5,956 insertions · 3,225 deletions
>
> 发布版本仍是 **`1.18.33`**。根仍 `bun@1.3.14`，workspace 仍 36 个 package。

目标 checkout 已用 `git -C opencode rev-parse HEAD`、`git -C opencode rev-parse refs/remotes/origin/dev` 和 ancestry check 交叉确认。`opencode` 只更新根仓 gitlink；本轮没有修改上游源码。

## 1. 影响重算

重算以更新前 `index.json` 的 189 个 verified nodes 为集合，将每个 frontmatter `source[]` 与真实 numstat 交叉。删除的 source 计为 A-BROKEN，不把 diff 里的 `D` 路径算成 C-DRIFT hit。

```sh
git -C opencode diff --numstat \
  03e67171ab2dc1e7f16e8cebfbc7f778f61b89f0..7945de208964a49300d7f770d1a71d078db9a4c4
```

| 分类 | 数量 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | 无 source 删除（删除的 `go-ornate-*.svg` 不在任何 node source[]） |
| B-HEAVY | 1 | `ref.package-index`（`packages/` umbrella，含 console i18n / stats / web docs） |
| C-DRIFT | 2 | `clients.console`、`peripheral.stats` |
| D-CLEAN | 186 | source 未命中；统一 bump `updated` |
| 新节点 | 0 | Go Plus / catalog-identity 写入既有节点 |
| 退役节点 | 0 | |
| 完成后 verified nodes | 189 | 不变 |

机械 B-HEAVY：`ref.package-index`。语义批次：`clients.console`、`peripheral.stats`。`package-index` 只复述版本与 36 packages（发布仍 1.18.33）。

## 2. 真实 diff 的影响判定

| 代码变化 | Wiki 承载 | 判定 |
|---|---|---|
| 发布仍 `1.18.33` | `spine.overview`、`ref.package-index` | bun / 36 packages 不变 |
| Go 页 Go $10 + Go Plus $40；`plusLimits` 按模型；`GoPlanChart` | `clients.console` | `go-models.ts` 仍是营销表 |
| `?ref=` 展示 referral 已结束 | `clients.console` | 营销面 |
| Stripe `customer.subscription.updated` 强制 Black `cancel_at_period_end` | `clients.console` | 停续订 |
| Black UI 去掉 billing portal Manage | `clients.console` | 路径含 `[id]`，只 `[I]` |
| Stats `catalog-identity` 从 `models.opencode.ai/catalog.json` 归因 | `peripheral.stats` | stale 走 cache/legacy |
| `deleteUnknownDimensions`；home 保留已知 lab provider | `peripheral.stats` | |
| `longcat` → meituan | `peripheral.stats` | |
| web `go.mdx`/`zen.mdx` / i18n | 不扩写 | 营销/文案 |

## 3. 显式快速核验：本轮未变化的专属重点

- `SessionV2` / `SessionRunner` 仍不是默认执行路径。
- 两个 server 仍是 Effect HttpApi，不是 Hono。
- V1/V2 tool registries 没有新增、删除或改名的模型可见 tool。
- workspace package 集合仍是 36 个；根 `bun@1.3.14`；发布 `1.18.33`。
- `models.opencode.ai` / zen catalog 仍是外部 JSON。
- R2 SQL 分页+retry、1D leaderboard 10× 隐藏、stealth、`hy4`→Tencent 仍成立。

## 4. 节点改动

### 语义更新

- Console：`clients.console`（补 `go-plan-chart.tsx`、`i18n/en.ts` 进 source）
- Stats：`peripheral.stats`（补 `catalog-identity.ts` 进 source）
- 版本与 package：`ref.package-index` 复述 1.18.33 / 36 / bun@1.3.14

### 证据或 target 元数据更新

- 受行号漂移影响的 C-DRIFT 已机械重落 `[E]`（bump-sha 18 处，集中在 stats）。
- 186 个 D-CLEAN 完成 SHA bump。
- 全部 189 个 node frontmatter `updated` 统一为 `7945de2089`。

## 5. L2 独立证伪

另起 workflow（effort `low`）对 3 个语义批次回源证伪 `7945de2089`（不信 filler / update-facts）。Fill 3/3。L2 第一轮 10 条（console 2 / stats 8）；L3 后 L2b 剩 stats 2 条。L3 第二轮把 leaderboard 窗口改到 `home.ts:425`，但把 `hy4` 错绑到 `:8`（那是 `hy3`）；主会话改回 `:9`，并把 `catalog-identity.ts:64` 纯括号行改到 `:63`。lint 0 error / 0 warning。

| 批次 | L2 | L3 / 复核要点 |
|---|---|---|
| console | 2 条，已修 | `console-core` Stripe/postgres 行号；`VITE_AUTH_URL` 在 `auth.ts:13`。Go $10/$40、`plusLimits` 非倍数、`GoPlanChart`、`subscribeUrl` 绝对 URL、Black `cancel_at_period_end` 在 webhook `:206`。`[id]` Black UI 只 `[I]` |
| stats | 8 + L2b 2，已修 | catalog-identity 10s/5min/stale 不 abort；`statProviderSql` stealth→catalog→rules；`deleteUnknownDimensions`；`normalizeStatRow` 只 remap unknown/retired；`longcat`→meituan；hy4 在 `:9`；leaderboard 1D/1W 在 `:425` |
| catalogs | L2 空 | 仍 `1.18.33`、36 packages、`bun@1.3.14`、togetherai 2.0.68、gitlab-ai-provider 6.18.0。`lildax` bin 在 `packages/cli/package.json:8` |

必核语义：Go 营销页 $10+$40 / `plusLimits` 按模型 / Black webhook 停续订 / `?ref=` 只提示 referral 结束 / Stats catalog identity 失败不 abort / 已知 lab 行不经 `statProvider` 重写 / `longcat`→meituan / `1.18.33`+36+`bun@1.3.14` / SessionV2 非默认。

## 6. 未决与风险边界

- zen/go live 模型表来自外部 catalog。`go-models.ts` 与 web `docs/go.mdx` / `docs/zen.mdx` 是营销面。
- Console / Stats schema 与仓内 migration SQL 不同步处只记代码意图。
- workspace 路径含 `[id]` 的文件 lint 无法核 `[E:]`，Black billing UI 只作 `[I]`。
- 未安装上游 `node_modules`，不宣称 runtime tests 通过。
- Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（遗留 `[U]`）。
- 机械 `[E]` 重落只保证行不是空行/注释/纯括号；语义精度由 L2 对语义批次把关。

## 7. 实际验证与环境边界

- 本轮是源码证据与 Wiki 验证，没有跑 `bun install` 或定向测试。
- 所有结论以 target checkout 静态源码与已有测试文件为准。
- 上游源码与 lockfile 均未修改。

## 8. 完成门槛

- 所有 189 个 verified node frontmatter `updated` 精确为 `7945de2089`；`index.json.updated` 与每个 node entry 同步。
- `index.json` planned=0，节点数 189。
- `node tools/reconcile.mjs` 第二次 0 更新；`node tools/lint.mjs` 0 error / 0 warning。
- submodule HEAD 与 `refs/remotes/origin/dev` 都是 target（若 origin/dev 在冻结后漂移，以冻结 SHA 为准并在此注明）。
- 本会话只改 `docs/llm-wiki/opencode/**`、根仓 `opencode` gitlink，以及本轮 L2/L3 workflow 定义。
