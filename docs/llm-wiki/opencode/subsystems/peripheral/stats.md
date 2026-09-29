---
id: peripheral.stats
title: Stats(用量/成本统计)
kind: subsystem
tier: T2
v: na
source:
  - packages/stats/core/
  - packages/stats/server/
  - packages/stats/app/
  - packages/stats/core/src/r2-sql.ts
  - packages/stats/core/src/domain/inference.ts
  - packages/stats/core/src/domain/retention.ts
  - packages/stats/core/src/domain/model-normalization.ts
  - packages/stats/core/src/domain/catalog-identity.ts
  - packages/stats/core/src/domain/home.ts
  - packages/stats/core/src/domain/stat.ts
  - packages/stats/core/src/stat-sync.ts
  - packages/stats/core/src/database/schema.ts
  - packages/stats/core/migrations/20260826000000_model_retention/migration.sql
  - packages/stats/core/migrations/20260903161929_parched_patriot/migration.sql
  - packages/stats/app/src/routes/model-catalog.ts
  - packages/stats/app/src/routes/index.tsx
  - packages/stats/app/src/routes/compare-radar.tsx
  - packages/stats/app/src/component/model-compare-detail.tsx
  - infra/stats.ts
symbols: [syncStats, loadCatalogIdentity, catalogIdentity, CatalogIdentity, Ingest, Routes, getStatsHomeData, getStatsModelData, getStatsLabData, getStatsModelsComparisonData, R2Sql, queryR2SqlPages, buildStatsQueries, buildRetentionQueries, RetentionStatRepo, STEALTH_MODELS, MODEL_AUTHOR_RULES, statProvider, statProviderSql, normalizeStatRows, normalizeStatRow, deleteUnknownDimensions, CountryEntry, resolveRadarScore]
related: [infra.sst]
evidence: explicit
status: verified
updated: 7945de2089
---

> `packages/stats` 是 opencode 的用量、成本、market share、weekly retention 与模型比较数据产品：`core` 做 R2 SQL/Drizzle/Effect domain，`server` 做 ingest 与 sync daemon，`app` 做 SolidStart 数据站点。sync 归因先读 `models.opencode.ai/catalog.json`，失败时用 cache 或 legacy `MODEL_AUTHOR_RULES`，**不 abort**。

## 能回答的问题

- Stats 三个子包各负责什么？
- inference event 从哪里 ingest、如何用 R2 SQL 聚合到 model/provider/geo/retention 表？
- weekly retention 的门槛与 top-N 是什么？
- Free tier 如何进入 aggregates？geo-map 还在吗？
- `ox-alpha` / `x-preview-f` 如何归一成 `glm-5.3-flash`？`deepseek-flash` 呢？
- full retention sync 为什么改成每个 cohort week 一条 query？
- R2 SQL 请求有没有超时？超时文案带不带耗时？分页 cursor 与 40005/429/5xx retry 怎么做？
- stealth 模型 `omen-alpha` / `space-bunny` / `union-alpha` 如何把真实 route provider 藏成 `unknown`？
- home leaderboard 的 `1D` 与 `1W` 窗口差在哪？10× 伪涨幅会不会显示？
- radar 缺 reasoning/tool-use benchmark 时怎么打分？`hy4` 归哪个 lab？
- country 是扁平 `CountryEntry[]` 还是按 usage range 分桶？home query cache TTL 是多少？
- Stats 在 SST infra 中如何部署？
- `loadCatalogIdentity` 超时、cache、stale 时 sync 会不会停？
- `statProviderSql` 的 catalog / `MODEL_AUTHOR_RULES` 顺序是什么？`compatible()` 为什么保留不同意的 lab？
- `longcat` 归哪个 lab？home 对已知 lab 行还会不会 `statProvider()` 重写？

## 职责边界

`packages/stats/README.md` 把 Stats 描述为独立于 console 的站点，并说明 runtime/database/domain services 在 `core`、SolidStart website 在 `app`、deployable entrypoints 在 `function` [E: packages/stats/README.md:3]。当前源码目录实际包含 `core`、`server`、`app` 三个 package，且 `server/package.json` 的 `main` 和 export 指向 `./src/server.ts` [E: packages/stats/core/package.json:3] [E: packages/stats/server/package.json:3] [E: packages/stats/app/package.json:3] [E: packages/stats/server/package.json:8] [E: packages/stats/server/package.json:10]。因此本文按实际源码记录 `core/server/app`，README 中的 `function` 命名视为旧文案或目录改名残留 [I]。

根 `package.json` 把 `packages/stats/*` 纳入 Bun workspaces，并提供 `dev:stats` 通过 SST shell 启动 stats app [E: package.json:13] [E: package.json:29]。`sst.config.ts` 仅在 `stage.deployAws` 为真时 import `infra/stats.js`，并在 outputs 中暴露 `StatsUrl` [E: sst.config.ts:33] [E: sst.config.ts:34] [E: sst.config.ts:43]。

`packages/stats/app/src/routes/geo-map.ts` 已从源树删除。home/lab 不再预计算 d3 world-atlas 路径；geo 只剩 country list / breakdown。[I]

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/stats/core/src/database/schema.ts` | Drizzle MySQL tables：`model_stat`、`provider_stat`、`geo_stat`、`model_retention`。`geo_stat` 另有 `idx_country_model_range`。 |
| `packages/stats/core/src/domain/catalog-identity.ts` | GET `catalog.json`；`STATS_PROVIDERS` 仅 `opencode`/`opencode-go`；5 分钟 cache；stale 不 abort。 |
| `packages/stats/core/src/domain/inference.ts` | R2 SQL builder：按 day/week × usage/geo 生成 queries；`statProviderSql` 注入 catalog CASE。 |
| `packages/stats/core/src/domain/model-normalization.ts` | model lower-case、free suffix strip、aliases、`STEALTH_MODELS`、`hy4`→Tencent、`longcat`→Meituan、`muse-spark`→Meta。 |
| `packages/stats/core/src/domain/retention.ts` | `RetentionStatRepo`：探测 `model_retention` 是否存在，按 cohort 替换 rows。 |
| `packages/stats/core/src/r2-sql.ts` | `queryR2SqlPages` cursor 分页 + 每页 retry；`fetchRows` 仍 15 分钟 timeout。 |
| `packages/stats/core/src/stat-sync.ts` | 一次 stats sync：先 `loadCatalogIdentity`，再 `r2Sql.query`，upsert 后 `deleteUnknownDimensions`。 |
| `packages/stats/core/src/domain/home.ts` | Home DTO、leaderboard、`normalizeStatRows` 去重 unknown、已知 lab 不重写 provider。 |
| `packages/stats/app/src/routes/index.tsx` | Home：Go `2M` slices、daily/weekly leaderboard、weekly retention、country list。 |
| `packages/stats/app/src/routes/compare-radar.tsx` | Radar axes；缺 benchmark 时 capability fallback。 |
| `packages/stats/app/src/routes/model-catalog.ts` | Catalog loader；`reasoning`/`toolCall` optional；muse-spark contributor aliases。 |
| `infra/stats.ts` | S3 Tables/Iceberg、PlanetScale、SolidStart app、AWS Service sync daemon。 |

## 数据模型

`core` 的 database schema 定义四张 MySQL 聚合表：`model_stat`、`provider_stat`、`geo_stat`、`model_retention` [E: packages/stats/core/src/database/schema.ts:3] [E: packages/stats/core/src/database/schema.ts:32] [E: packages/stats/core/src/database/schema.ts:74] [E: packages/stats/core/src/database/schema.ts:120]。前三张共享 period columns：`grain`、`period_key`、`dataset`、`tier`、`client`、`source` [E: packages/stats/core/src/database/schema.ts:149] [E: packages/stats/core/src/database/schema.ts:150] [E: packages/stats/core/src/database/schema.ts:151] [E: packages/stats/core/src/database/schema.ts:152] [E: packages/stats/core/src/database/schema.ts:153] [E: packages/stats/core/src/database/schema.ts:154]。`geo_stat` 额外声明 `idx_country_model_range`，覆盖 `(model, provider, grain, dataset, client, source, tier, period_key)`。[E: packages/stats/core/src/database/schema.ts:107] 仓内 migration `20260903161929_parched_patriot` 只写这条 `CREATE INDEX`；存在不等于远端已 apply。[E: packages/stats/core/migrations/20260903161929_parched_patriot/migration.sql:1][I]

`model_retention` 按 `cohort_date` / `dataset` / `tier` / `provider` / `model` unique，字段是 `eligible_users` 与 `retained_users`。[E: packages/stats/core/src/database/schema.ts:124][E: packages/stats/core/src/database/schema.ts:127][E: packages/stats/core/src/database/schema.ts:129][E: packages/stats/core/src/database/schema.ts:130][E: packages/stats/core/src/database/schema.ts:134] 仓内 migration SQL 创建同名表与 index；`RetentionStatRepo.available()` 用 `SELECT ... LIMIT 1` 探测，缺表返回 false 而不是 fail sync。[E: packages/stats/core/migrations/20260826000000_model_retention/migration.sql:1][E: packages/stats/core/src/domain/retention.ts:36][E: packages/stats/core/src/domain/retention.ts:40][E: packages/stats/core/src/domain/retention.ts:43] 这不能证明 production 已跑过该 migration。[I]

`domain/home.ts` 定义 app-facing DTO：`StatsHomeData` 包含 usage、users、leaderboard、market、tokenCost、cacheRatio、sessionCost、retention、country。[E: packages/stats/core/src/domain/home.ts:118][E: packages/stats/core/src/domain/home.ts:128][E: packages/stats/core/src/domain/home.ts:196]

`country` 现在是扁平 `CountryEntry[]`（`{ country, continent, tokens, share, rank }`），不再按 usage range 分桶成 `Record<UsageRange, …>`。home/model 的 country 来自 `listCountryTotals`：调用方先用 `modelRowsWindow(..., "2M")`，再对 day-grain `geo_stat` 做 `GROUP BY country`。[E: packages/stats/core/src/domain/home.ts:34][E: packages/stats/core/src/domain/home.ts:200][E: packages/stats/core/src/domain/home.ts:272][E: packages/stats/core/src/domain/home.ts:282]

`getStatsModelData`：已知 `resolvedProvider` 且 `listCountryTotals(..., { model, provider })` 为空时，再以 `provider: "unknown"` 查一次（旧 unknown 维度尚未清干净时仍能出 country）。[E: packages/stats/core/src/domain/home.ts:221][E: packages/stats/core/src/domain/home.ts:226][E: packages/stats/core/src/domain/home.ts:227]

`queryRows` 用进程内 cache：TTL `QUERY_CACHE_TTL_MS = 5 * 60 * 1000`（5 分钟），最多 256 条；key 是 `[query, params]` JSON。命中未过期直接返回；过期先删再查；query 失败则删掉刚写入的 entry。[E: packages/stats/core/src/domain/home.ts:147][E: packages/stats/core/src/domain/home.ts:148][E: packages/stats/core/src/domain/home.ts:319][E: packages/stats/core/src/domain/home.ts:327]

## Catalog identity（sync 归因）

`loadCatalogIdentity()` GET `https://models.opencode.ai/catalog.json`，`AbortSignal.timeout(10_000)`。[E: packages/stats/core/src/domain/catalog-identity.ts:3][E: packages/stats/core/src/domain/catalog-identity.ts:12][E: packages/stats/core/src/domain/catalog-identity.ts:14] 成功后写入模块 cache，`expiresAt = Date.now() + 5 * 60_000`。[E: packages/stats/core/src/domain/catalog-identity.ts:21] 未过期直接 `{ catalog, stale: false }`。[E: packages/stats/core/src/domain/catalog-identity.ts:13]

`STATS_PROVIDERS = ["opencode", "opencode-go"]`：只扫这两个 provider 的 offerings。[E: packages/stats/core/src/domain/catalog-identity.ts:4] `offerings` 键是 `` `${providerID}/${modelID.toLowerCase()}` `` → lab（canonical id 的第一段）。[E: packages/stats/core/src/domain/catalog-identity.ts:51] `models` 只收录 **唯一 lab** 的归一化 model 名：同一归一名对应多个 lab 则丢弃，避免错误覆盖。[E: packages/stats/core/src/domain/catalog-identity.ts:63]

fetch / parse 失败：`.catch` 返回 `{ catalog: cache.value, stale: true }`——有 cache 就用 stale cache，没有则 `catalog` 为 `undefined`。[E: packages/stats/core/src/domain/catalog-identity.ts:24] **sync 不 abort**。

`syncStats` 开头 `Effect.promise(loadCatalogIdentity)`；`identity.stale` 时 `logWarning`：有 catalog 写 `"using cached identity"`，否则 `"using legacy stats attribution"`。[E: packages/stats/core/src/stat-sync.ts:49][E: packages/stats/core/src/stat-sync.ts:51][E: packages/stats/core/src/stat-sync.ts:54] `buildStatsQueries` / `buildRetentionQueries` 以及 `toModelAggregate` / `toProviderAggregate` / `toGeoAggregate` / `toRetentionAggregate` 都传入 `catalog`。[E: packages/stats/core/src/stat-sync.ts:60][E: packages/stats/core/src/stat-sync.ts:84][E: packages/stats/core/src/stat-sync.ts:104][E: packages/stats/core/src/domain/inference.ts:43][E: packages/stats/core/src/domain/inference.ts:347]

`statProviderSql` 生成 SQL `CASE`，顺序是：stealth → catalog offerings（`raw_provider` + raw model）→ catalog models（归一化名）→ `MODEL_AUTHOR_RULES`（先 `provider_model` 再 `model`）→ 非 `RETIRED_STAT_PROVIDERS` 的原 provider → `'unknown'`。[E: packages/stats/core/src/domain/inference.ts:518][E: packages/stats/core/src/domain/inference.ts:519][E: packages/stats/core/src/domain/inference.ts:527][E: packages/stats/core/src/domain/inference.ts:531]

`compatible(name, lab)`：`statProvider(name, "", "unknown")` 得到已有规则 lab；若已有值不是 `"unknown"` 且不等于 catalog lab，则 **不注入** 该 catalog 分支，避免把历史维度改掉（注释写明需要单独 migration）。[E: packages/stats/core/src/domain/inference.ts:514][E: packages/stats/core/src/domain/inference.ts:516]

upsert 之后先 `deleteRetiredDimensions`，再 `ModelStatRepo.deleteUnknownDimensions` / `GeoStatRepo.deleteUnknownDimensions`：传入的是「已知 lab 且与 catalog/`statProvider` 一致」的行；repo 按同一 period+model（geo 再加 country）删掉仍为 `provider="unknown"` 的旧行。[E: packages/stats/core/src/stat-sync.ts:159][E: packages/stats/core/src/stat-sync.ts:166][E: packages/stats/core/src/domain/model.ts:207][E: packages/stats/core/src/domain/model.ts:229]

## 模型归一、stealth、hy4、longcat 与 Free tier

`normalizeInferenceModel()` 把 id lower-case，并剥 `(-free|:free|:global)+` 后缀。[E: packages/stats/core/src/domain/model-normalization.ts:36] `MODEL_NAME_ALIASES` 把 `deepseek-flash` 映射到 `deepseek-v4.1-flash`，`ox-alpha` 与 `x-preview-f` 映射到 `glm-5.3-flash`，另外还有 `deepseek-v4-flash-0731` / `deepseek-v4-flash-dsv4-flash-final-rnaovd` → `deepseek-v4-flash`、`xiaomi/mimo-v2.5` → `mimo-v2.5`、`opencode-go/union-alpha` 与 `opencode/union-alpha` → `union-alpha`；`statModel()` 先 normalize 再查 alias。[E: packages/stats/core/src/domain/model-normalization.ts:23][E: packages/stats/core/src/domain/model-normalization.ts:28][E: packages/stats/core/src/domain/model-normalization.ts:29][E: packages/stats/core/src/domain/model-normalization.ts:46][E: packages/stats/core/src/domain/model-normalization.ts:49] R2 SQL 用 `route_model` 解析 provider model，并在 SQL 里做同样 alias。[E: packages/stats/core/src/domain/inference.ts:264][E: packages/stats/core/src/domain/inference.ts:481]

`MODEL_AUTHOR_RULES` 含 `{ match: "hy4", author: "tencent" }`、`{ match: "longcat", author: "meituan" }`、`{ match: "muse-spark", author: "meta" }`；`hy4-preview` 归 Tencent，`longcat-*` 归 Meituan，而不是 unknown。[E: packages/stats/core/src/domain/model-normalization.ts:9][E: packages/stats/core/src/domain/model-normalization.ts:11][E: packages/stats/core/src/domain/model-normalization.ts:14][E: packages/stats/core/src/domain/model-normalization.ts:43]

`STEALTH_MODELS = {"omen-alpha", "space-bunny", "union-alpha"}`。[E: packages/stats/core/src/domain/model-normalization.ts:19] `statProvider()` 在 normalize 后的 model 命中该集合时直接返回 `"unknown"`，不再读 `route_model` / `provider_id`。[E: packages/stats/core/src/domain/model-normalization.ts:59] `statProviderSql` 用同样的 `CASE WHEN lower(model) IN (...STEALTH_MODELS...) THEN 'unknown'`，所以 usage/geo/retention 聚合都不会写出真实 route provider。[E: packages/stats/core/src/domain/inference.ts:519]

`normalizeStatRows`：先收集同 period/tier/model 的非 unknown、非 retired provider 键；若 unknown 行的 `statProvider(model,"","unknown")` 已指向该 lab，则丢掉 unknown 行（cleanup 完成前两行并存时只保留 lab）。[E: packages/stats/core/src/domain/home.ts:989][E: packages/stats/core/src/domain/home.ts:1000][E: packages/stats/core/src/domain/home.ts:1006] `normalizeStatRow` **仅当** `row.provider === "unknown"` 或 provider 在 `RETIRED_STAT_PROVIDERS` 时才 `statProvider()` 重写；已知 lab 行保留入库 provider。[E: packages/stats/core/src/domain/home.ts:1023][E: packages/stats/core/src/domain/home.ts:1024]

usage/geo query 不再只收 `product = 'go'`。normalized CTE 条件是 `product = 'go' OR (free tier)`；free 判定是 `model_tier='free'`、`FREE_MODELS` 集合、或 model 名匹配 `%-free` / `%-free:global`。[E: packages/stats/core/src/domain/inference.ts:208][E: packages/stats/core/src/domain/inference.ts:295][E: packages/stats/core/src/domain/inference.ts:499] filtered CTE 把这些行写成 `tier = 'Free'`，其余 `'Go'`。[E: packages/stats/core/src/domain/inference.ts:305][E: packages/stats/core/src/domain/inference.ts:307] `DATA_SITE_TIERS` 含 `Go`/`go`/`Free`/`free`；home 用 `SITE_PRODUCT = "Go"` 把 Go+Free 合成一个公开 cohort。[E: packages/stats/core/src/domain/stat.ts:4][E: packages/stats/core/src/domain/home.ts:150]

## Weekly retention

`buildRetentionQueries` 仍只扫 `product = 'go'`（retention 不混 free）。用户当周对该 model 的请求占比 ≥80% 且当周总请求 ≥10 才进 primary model；下一完整 ISO week 再出现则算 retained。[E: packages/stats/core/src/domain/inference.ts:131][E: packages/stats/core/src/domain/inference.ts:172][E: packages/stats/core/src/domain/inference.ts:173]

每个 cohort week **单独**生成一条 query：`periods.map` 后 `cohortDates` 只有该周一天，`buildRetentionQuery([period], source, catalog)` 不再把整个 display window 拼进一次 user-level join。[E: packages/stats/core/src/domain/inference.ts:73][E: packages/stats/core/src/domain/inference.ts:74][E: packages/stats/core/src/domain/inference.ts:75]

`buildRetentionEntries()` 取最近 7 个 cohort week，按 model 累加 user-weeks；`eligibleUserWeeks >= 100` 才给 rank，home 只展示有 rank 的前 15 个模型。[E: packages/stats/core/src/domain/home.ts:143][E: packages/stats/core/src/domain/home.ts:144][E: packages/stats/core/src/domain/home.ts:145][E: packages/stats/core/src/domain/home.ts:440][E: packages/stats/core/src/domain/home.ts:601][E: packages/stats/core/src/domain/home.ts:622] home page 渲染 `Weekly Retention` section。[E: packages/stats/app/src/routes/index.tsx:159][E: packages/stats/app/src/routes/index.tsx:673]

sync 在 `RetentionStatRepo.available()` 为真时才跑 retention queries，并 `replace` 对应 cohort；缺表则 `retentionQueries = []`。[E: packages/stats/core/src/stat-sync.ts:94][E: packages/stats/core/src/stat-sync.ts:95][E: packages/stats/core/src/stat-sync.ts:138] retention 路径调用 `r2Sql.query(item.query)` **不传** cursor columns。[E: packages/stats/core/src/stat-sync.ts:112]

## Ingest 与聚合控制流

1. `server/src/server.ts` 创建 Node HTTP server layer，默认 `PORT=3000`、`HOST=0.0.0.0`，然后用 Effect `HttpRouter.serve` 启动 routes [E: packages/stats/server/src/server.ts:12] [E: packages/stats/server/src/server.ts:15] [E: packages/stats/server/src/server.ts:16] [E: packages/stats/server/src/server.ts:23]。
2. `Routes` 注册 `GET /health`、`GET /ready`、`POST /`，并用 semaphore 把并发 ingest request 限为 8 [E: packages/stats/server/src/router.ts:10] [E: packages/stats/server/src/router.ts:16] [E: packages/stats/server/src/router.ts:23] [E: packages/stats/server/src/router.ts:24] [E: packages/stats/server/src/router.ts:25]。
3. `POST /` 用 timing-safe bearer token 校验 `Resource.LakeIngestConfig.secret`；授权失败返回 401 [E: packages/stats/server/src/router.ts:35] [E: packages/stats/server/src/router.ts:56] [E: packages/stats/server/src/router.ts:58] [E: packages/stats/server/src/router.ts:60]。
4. Ingest body schema 只读取 optional `events`，非数组或空数组返回 accepted 但 records 为 0 [E: packages/stats/server/src/router.ts:13] [E: packages/stats/server/src/router.ts:45] [E: packages/stats/server/src/router.ts:46]。
5. `Ingest.write` 只处理 object record；每个 object record 的 `_datalake_key` 必须匹配 `database.table`，unsupported route 会返回 `IngestError` [E: packages/stats/server/src/ingest.ts:38] [E: packages/stats/server/src/ingest.ts:145] [E: packages/stats/server/src/ingest.ts:147] [E: packages/stats/server/src/ingest.ts:46]。
6. 支持的 event 被转成 Firehose record：原 `_datalake_key` 被移除，附加 `_lake_database`、`_lake_table`、`_lake_operation: "insert"` [E: packages/stats/server/src/ingest.ts:155] [E: packages/stats/server/src/ingest.ts:159] [E: packages/stats/server/src/ingest.ts:160] [E: packages/stats/server/src/ingest.ts:161] [E: packages/stats/server/src/ingest.ts:162]。
7. Firehose write 每批最多 500 条，失败 batch 最多重试 3 次，并用指数退避 sleep [E: packages/stats/server/src/ingest.ts:7] [E: packages/stats/server/src/ingest.ts:8] [E: packages/stats/server/src/ingest.ts:116]。
8. `syncStats({ full? })` 先把 period end 扣掉 5 分钟 datalake lag。full pass 从 ISO week 前一周与 56 天 display window 的较早边界起算，但不早于 `2026-05-28`；incremental pass 从“两小时前所在 ISO week”的周一起算，同样不早于数据起点 [E: packages/stats/core/src/stat-sync.ts:21] [E: packages/stats/core/src/stat-sync.ts:42] [E: packages/stats/core/src/stat-sync.ts:43]。
9. sync 先 `loadCatalogIdentity`（stale 只 warning）。然后 `buildStatsQueries(periodStart, periodEnd, undefined, catalog)`，`R2Sql.query` 并发度 4，cursor columns `["dimension", "tier", "provider", "model", "country"]`。flat 后按 `row.dimension` 分流，`to*Aggregate(row, catalog)`。每条 query complete/fail 都 `Effect.logInfo` / `logError`。[E: packages/stats/core/src/stat-sync.ts:49] [E: packages/stats/core/src/stat-sync.ts:60] [E: packages/stats/core/src/stat-sync.ts:67] [E: packages/stats/core/src/stat-sync.ts:80] [E: packages/stats/core/src/domain/inference.ts:43]
10. 分流后的 rows 并发 upsert `model_stat`、`provider_stat`、`geo_stat`，表存在时 replace `model_retention`，随后 `deleteRetiredDimensions`，再 `deleteUnknownDimensions`。[E: packages/stats/core/src/stat-sync.ts:135] [E: packages/stats/core/src/stat-sync.ts:151] [E: packages/stats/core/src/stat-sync.ts:157]

## R2 SQL 语义

`R2Sql.query(query, columns?)` 委托 `queryR2SqlPages`。[E: packages/stats/core/src/r2-sql.ts:51] 有 `columns` 时，每页把原 query 包成 `SELECT * FROM (query) AS stats_page`，按 `COALESCE("col", '')` 做 lexicographic `ORDER BY`，满 10_000 行则用最后一行当 cursor，下一页 `WHERE` 是 tuple 大于 cursor（前缀相等、当前列 `>`）。[E: packages/stats/core/src/r2-sql.ts:58][E: packages/stats/core/src/r2-sql.ts:67][E: packages/stats/core/src/r2-sql.ts:88][E: packages/stats/core/src/r2-sql.ts:97] 每页 `Effect.retry`：`times: 2`、`Schedule.exponential("5 seconds")`，仅当 `error.code === 40005` 或 `status === 429` 或 `status >= 500`。[E: packages/stats/core/src/r2-sql.ts:71][E: packages/stats/core/src/r2-sql.ts:72][E: packages/stats/core/src/r2-sql.ts:75] 无 columns 且单页 `page.length >= 10_000` 仍 `R2SqlQueryError`（R2 SQL 没有 OFFSET，达到 cap 视为截断）。[E: packages/stats/core/src/r2-sql.ts:4][E: packages/stats/core/src/r2-sql.ts:78]

15 分钟 timeout **仍在 `fetchRows`**：`timeout: false` 关掉 Bun 默认 5 分钟 idle timer，再用 `AbortSignal.any([signal, AbortSignal.timeout(R2_SQL_TIMEOUT_MS)])`；`R2_SQL_TIMEOUT_MS = 15 * 60_000`。超时或 fetch 失败的 message 带 `after ${Date.now() - startedAt}ms`。[E: packages/stats/core/src/r2-sql.ts:5][E: packages/stats/core/src/r2-sql.ts:111][E: packages/stats/core/src/r2-sql.ts:112][E: packages/stats/core/src/r2-sql.ts:126] POST 目标是 `api.sql.cloudflarestorage.com` 的 account/bucket query endpoint，bearer `Resource.R2SqlAuthToken`。[E: packages/stats/core/src/r2-sql.ts:114][E: packages/stats/core/src/r2-sql.ts:120]

`buildStatsQueries` 默认 source 来自 `Resource.R2Sql.namespace/table` 与 `Resource.StatsSyncConfig.dataset`，不是 Athena `InferenceEvent` catalog [E: packages/stats/core/src/domain/inference.ts:43] [E: packages/stats/core/src/domain/inference.ts:49] [E: packages/stats/core/src/domain/inference.ts:50] [E: packages/stats/core/src/domain/inference.ts:51]。每个 period 拆成两条 query：`usage` family 产出 `model`/`provider` 并算 `approx_distinct(session/user_key)`；`geo` family 产出 `geo`/`geo_model`，sessions/unique_users 固定为 0。[E: packages/stats/core/src/domain/inference.ts:209] [E: packages/stats/core/src/domain/inference.ts:226] [E: packages/stats/core/src/domain/inference.ts:229]

normalized CTE 只取 `event_type = 'generation.completed'`、非空 `model_requested`，并用 `__ingest_ts` 与 `started_at` 双窗口过滤。`source` 必须是 `inference` 或 `inference-legacy`；`LIVE_SOURCE_START = 2026-08-11T10:57:48.186Z` 是 exclusive handoff。[E: packages/stats/core/src/domain/inference.ts:38] [E: packages/stats/core/src/domain/inference.ts:289] [E: packages/stats/core/src/domain/inference.ts:292] [E: packages/stats/core/src/domain/inference.ts:293] filtered CTE 丢掉 `EXCLUDED_MODELS`（当前是 `alpha-gpt-next`）[E: packages/stats/core/src/domain/model-normalization.ts:18][E: packages/stats/core/src/domain/inference.ts:332]。

`packages/stats/core/src/athena.ts` 仍导出 Athena client 与 iterative pagination，但 `stat-sync.ts` 的 query 路径已经改成 `R2Sql` [E: packages/stats/core/src/stat-sync.ts:19] [E: packages/stats/core/src/stat-sync.ts:67] [I]。

## Home leaderboard：1D vs 1W 与伪涨幅

`buildStatsHomeData` 为每个 usage range 都填 `leaderboard[product][range]`，但 **窗口不是该 range 本身**：`range === "1D"` 用单日 `getWindow("1D", …)`，其它 range 一律用 `getWindow("1W", …)`。[E: packages/stats/core/src/domain/home.ts:425] Home 页面只下发 `leaderboard.daily = stats.leaderboard.Go["1D"]` 与 `weekly = ...["1W"]`。[E: packages/stats/app/src/routes/index.tsx:89]

`LEADERBOARD_CHANGE_MIN_MULTIPLE = 10`：`leaderboardChange` 在 `previous <= 0` 或 `current >= previous * 10` 时返回 `null`，UI 因此不显示 10× 以上的涨幅（避免 partial-day 对比完整前一日的伪变化）。[E: packages/stats/core/src/domain/home.ts:152][E: packages/stats/core/src/domain/home.ts:1159][E: packages/stats/core/src/domain/home.ts:1161] `current <= 0` 仍返回 `0`。[E: packages/stats/core/src/domain/home.ts:1160]

## App 展示面、catalog 与 radar

Stats home route 用 SolidStart server query 调 `runStatsEffect(getStatsHomeData())`，只把 Go `2M` usage/users/market/country 以及 Go tokenCost/cacheRatio/sessionCost、retention、daily/weekly leaderboard 下发给 client [E: packages/stats/app/src/routes/index.tsx:85] [E: packages/stats/app/src/routes/index.tsx:87] [E: packages/stats/app/src/routes/index.tsx:89]。geo 现在是 `GeoBreakdownSection` 的 country list，不再引用已删除的 `geo-map.ts`。[E: packages/stats/app/src/routes/index.tsx:163] [E: packages/stats/app/src/routes/index.tsx:1259]

model catalog route 已把模型、价格与 lab 三个数据源统一切到 `models.opencode.ai`：`catalog.json`、`api.json`、`labs`；loader 在同一个 `Promise.all` 中 fetch 三者再合成 comparison catalog。[E: packages/stats/app/src/routes/model-catalog.ts:4][E: packages/stats/app/src/routes/model-catalog.ts:5][E: packages/stats/app/src/routes/model-catalog.ts:6][E: packages/stats/app/src/routes/model-catalog.ts:62]

`ModelCatalogEntry.reasoning` 与 `toolCall` 是 **optional boolean**；loader 只在源字段确为 boolean 时写入，否则 `undefined`。[E: packages/stats/app/src/routes/model-catalog.ts:28][E: packages/stats/app/src/routes/model-catalog.ts:29][E: packages/stats/app/src/routes/model-catalog.ts:208][E: packages/stats/app/src/routes/model-catalog.ts:209]

catalog `aliases` 为 `meta/muse-spark-1.2` 与 `meta/muse-spark-1.3` 各造一条 `-contributor` 条目（独立定价、不进 population 归一）。[E: packages/stats/app/src/routes/model-catalog.ts:156]

Radar：`buildRadarAxes` 的 Reasoning / Tool use 轴 `score` 走 benchmark percentile；`resolveRadarScore` 在无 benchmark 分数时读 `axis.capability`（`reasoning` 或 `toolCall`）：字段缺失 → `50` placeholder（`No data; neutral placeholder`）；`true` → `50`（supported, no comparable benchmark）；`false` → `0`（not supported）。**不是** `reasoning ? 100 : 0`。[E: packages/stats/app/src/routes/compare-radar.tsx:204][E: packages/stats/app/src/routes/compare-radar.tsx:243][E: packages/stats/app/src/routes/compare-radar.tsx:386][E: packages/stats/app/src/routes/compare-radar.tsx:390][E: packages/stats/app/src/routes/compare-radar.tsx:392]

UI 不展示 stealth 的真实 route provider。`isProviderlessLab` 把 lab/`unknown` 当成无 provider；`isKnownCatalogLab` 对这类 lab 直接 false。[E: packages/stats/app/src/routes/model-catalog.ts:119][E: packages/stats/app/src/routes/model-catalog.ts:123][E: packages/stats/app/src/routes/model-catalog.ts:124] home leaderboard 只在 `hasProvider()` 为真时渲染已知 lab icon；stealth 经 `statProvider` 变成 `unknown` 后走 synthetic。[E: packages/stats/app/src/routes/index.tsx:918][E: packages/stats/app/src/routes/index.tsx:919] compare 详情的 lab logo 同样 `Show when={!isProviderlessLab(lab)}`。[E: packages/stats/app/src/component/model-compare-detail.tsx:799] market share 聚合会 `filter(provider !== "unknown")`，stealth 用量不进公开 provider 排行。[E: packages/stats/core/src/domain/home.ts:694]

## 部署关系

`infra/stats.ts` 定义 inference S3 Tables namespace/table，table format 是 ICEBERG。Stats database 使用 PlanetScale `opencode-stats`，production 复用 production branch，非 production 创建 stage branch [E: infra/stats.ts:107] [E: infra/stats.ts:112] [E: infra/stats.ts:114] [E: infra/stats.ts:119]。

Stats app 部署成 Cloudflare SolidStart，domain 为 `stats.${domain}`，link database 与 EmailOctopus key，`PUBLIC_URL` 指向 `https://${domain}/data` [E: infra/stats.ts:164] [E: infra/stats.ts:165] [E: infra/stats.ts:167] [E: infra/stats.ts:168] [E: infra/stats.ts:170]。Stats sync daemon 部署成 AWS Service，Dockerfile 是 `packages/stats/server/Dockerfile`，command 是 `bun src/stat-sync.ts`。link 同时包含 PlanetScale database、legacy `inferenceEvent` Athena table、`R2Sql`/`R2SqlAuthToken` 和 `StatsSyncConfig`；infra 注释把 Athena link 标成 rollback 用，应用代码路径已经走 R2 SQL [E: infra/stats.ts:184] [E: infra/stats.ts:205]。这是仓库 infra 声明，不证明当前 production 已经切到 R2 SQL。[I]

## Gotcha

- `packages/stats/server/src/stat-sync.ts` 是 daemon entrypoint：启动时先按 `ModelStatRepo.lastSyncedAt()` 延迟到 hourly cadence，避免 crash loop 立刻重跑 R2 SQL [E: packages/stats/server/src/stat-sync.ts:47] [E: packages/stats/server/src/stat-sync.ts:48]。每天首个 pass 传 `full: true`；full 失败只记 warning 并 fallback incremental [E: packages/stats/server/src/stat-sync.ts:23] [E: packages/stats/server/src/stat-sync.ts:26]。
- `packages/stats/server/Dockerfile` 默认 CMD 是 `bun src/server.ts`，但 SST sync service 覆盖 command 为 `bun src/stat-sync.ts` [E: packages/stats/server/Dockerfile:32] [E: infra/stats.ts:205]。
- `README.md` 的 `function` 子包名称与当前目录不一致；以 `packages/stats/server/` 和 infra command 为准 [E: packages/stats/README.md:9] [E: packages/stats/server/package.json:8] [E: infra/stats.ts:205]。
- retention 仓内 migration 与 `available()` 探测不能外推 production 已建表。[E: packages/stats/core/src/domain/retention.ts:43][I]
- home 页公开 cohort 标签仍是 Go，但 query 已把 Free 行并进同一展示切片。[E: packages/stats/core/src/domain/home.ts:150][E: packages/stats/app/src/routes/index.tsx:87]
- stealth 只藏 provider，不从 usage/leaderboard 删掉模型本身；`omen-alpha` / `space-bunny` / `union-alpha` 仍可出现在 model 维度，只是 lab/author 走 unknown。[E: packages/stats/core/src/domain/model-normalization.ts:59][E: packages/stats/app/src/routes/index.tsx:918]
- `buildRetentionQueries` 不再把整个 display window 合成一条 SQL。full sync 的 retention 条数等于 cohort week 数，每条仍 `concurrency: 4`。retention query **无** cursor columns，单页仍受 10k cap。[E: packages/stats/core/src/domain/inference.ts:73][E: packages/stats/core/src/stat-sync.ts:112][E: packages/stats/core/src/stat-sync.ts:124]
- `deepseek-flash` 是 **stats 归一名**，归一成 `deepseek-v4.1-flash`。不要把它写成 zen/go live catalog 条目；live catalog 仍来自外部 JSON。[E: packages/stats/core/src/domain/model-normalization.ts:23]
- leaderboard 的非 `1D` range 实际都是 1W 窗口；不要把 `leaderboard.Go["2M"]` 读成 2 个月排行。[E: packages/stats/core/src/domain/home.ts:425]
- 有 cursor columns 时满 10k 会继续翻页，不会因 cap fail；无 columns 才会 fail。[E: packages/stats/core/src/r2-sql.ts:78]
- catalog fetch 失败 **不 abort** sync；无 cache 时 SQL 退回 `MODEL_AUTHOR_RULES`。[E: packages/stats/core/src/domain/catalog-identity.ts:24][E: packages/stats/core/src/stat-sync.ts:54]
- 不要写「home 对已知 lab 行一律 `statProvider()` 重写」：只有 unknown/retired 才 remap。[E: packages/stats/core/src/domain/home.ts:1024]
- `longcat` 不是 unknown provider，规则与 catalog 都指向 `meituan`。[E: packages/stats/core/src/domain/model-normalization.ts:11]

## Sources

- `packages/stats/README.md`
- `packages/stats/core/package.json`
- `packages/stats/server/package.json`
- `packages/stats/app/package.json`
- `packages/stats/core/src/database/schema.ts`
- `packages/stats/core/src/athena.ts`
- `packages/stats/core/src/r2-sql.ts`
- `packages/stats/core/src/domain/inference.ts`
- `packages/stats/core/src/domain/catalog-identity.ts`
- `packages/stats/core/src/domain/model-normalization.ts`
- `packages/stats/core/src/domain/retention.ts`
- `packages/stats/core/src/domain/stat.ts`
- `packages/stats/core/src/domain/home.ts`
- `packages/stats/core/src/stat-sync.ts`
- `packages/stats/core/migrations/20260826000000_model_retention/migration.sql`
- `packages/stats/core/migrations/20260903161929_parched_patriot/migration.sql`
- `packages/stats/server/src/server.ts`
- `packages/stats/server/src/router.ts`
- `packages/stats/server/src/ingest.ts`
- `packages/stats/server/src/stat-sync.ts`
- `packages/stats/server/Dockerfile`
- `packages/stats/app/src/routes/index.tsx`
- `packages/stats/app/src/routes/model-catalog.ts`
- `packages/stats/app/src/routes/compare-radar.tsx`
- `packages/stats/app/src/routes/compare/index.tsx`
- `packages/stats/app/src/component/model-compare-detail.tsx`
- `packages/stats/app/src/lib/comparison-pages.ts`
- `infra/stats.ts`
- `sst.config.ts`

## 相关

- `infra.sst`：Stats 的 AWS/Cloudflare/PlanetScale resources 都由 SST 装配；本节点覆盖 Stats package 本身和关键 infra edge。
