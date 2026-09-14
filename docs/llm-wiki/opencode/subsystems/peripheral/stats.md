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
  - packages/stats/core/src/domain/home.ts
  - packages/stats/core/src/domain/stat.ts
  - packages/stats/core/src/stat-sync.ts
  - packages/stats/core/src/database/schema.ts
  - packages/stats/core/migrations/20260826000000_model_retention/migration.sql
  - packages/stats/core/migrations/20260903161929_parched_patriot/migration.sql
  - packages/stats/app/src/routes/model-catalog.ts
  - packages/stats/app/src/routes/index.tsx
  - packages/stats/app/src/component/model-compare-detail.tsx
  - infra/stats.ts
symbols: [syncStats, Ingest, Routes, getStatsHomeData, getStatsModelData, getStatsLabData, getStatsModelsComparisonData, R2Sql, buildStatsQueries, buildRetentionQueries, RetentionStatRepo, STEALTH_MODELS, statProvider, CountryEntry]
related: [infra.sst]
evidence: explicit
status: verified
updated: df23b7f948
---

> `packages/stats` 是 opencode 的用量、成本、market share、weekly retention 与模型比较数据产品：`core` 做 R2 SQL/Drizzle/Effect domain，`server` 做 ingest 与 sync daemon，`app` 做 SolidStart 数据站点。

## 能回答的问题

- Stats 三个子包各负责什么？
- inference event 从哪里 ingest、如何用 R2 SQL 聚合到 model/provider/geo/retention 表？
- weekly retention 的门槛与 top-N 是什么？
- Free tier 如何进入 aggregates？geo-map 还在吗？
- `ox-alpha` / `x-preview-f` 如何归一成 `glm-5.3-flash`？`deepseek-flash` 呢？
- full retention sync 为什么改成每个 cohort week 一条 query？
- R2 SQL 请求有没有超时？超时文案带不带耗时？
- stealth 模型 `omen-alpha` 如何把真实 route provider 藏成 `unknown`？
- country 是扁平 `CountryEntry[]` 还是按 usage range 分桶？home query cache TTL 是多少？
- Stats 在 SST infra 中如何部署？

## 职责边界

`packages/stats/README.md` 把 Stats 描述为独立于 console 的站点，并说明 runtime/database/domain services 在 `core`、SolidStart website 在 `app`、deployable entrypoints 在 `function` [E: packages/stats/README.md:3]。当前源码目录实际包含 `core`、`server`、`app` 三个 package，且 `server/package.json` 的 `main` 和 export 指向 `./src/server.ts` [E: packages/stats/core/package.json:3] [E: packages/stats/server/package.json:3] [E: packages/stats/app/package.json:3] [E: packages/stats/server/package.json:8] [E: packages/stats/server/package.json:10]。因此本文按实际源码记录 `core/server/app`，README 中的 `function` 命名视为旧文案或目录改名残留 [I]。

根 `package.json` 把 `packages/stats/*` 纳入 Bun workspaces，并提供 `dev:stats` 通过 SST shell 启动 stats app [E: package.json:13] [E: package.json:29]。`sst.config.ts` 仅在 `stage.deployAws` 为真时 import `infra/stats.js`，并在 outputs 中暴露 `StatsUrl` [E: sst.config.ts:33] [E: sst.config.ts:34] [E: sst.config.ts:43]。

`packages/stats/app/src/routes/geo-map.ts` 已从源树删除。home/lab 不再预计算 d3 world-atlas 路径；geo 只剩 country list / breakdown。[I]

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/stats/core/src/database/schema.ts` | Drizzle MySQL tables：`model_stat`、`provider_stat`、`geo_stat`、`model_retention`。`geo_stat` 另有 `idx_country_model_range`。 |
| `packages/stats/core/src/domain/inference.ts` | R2 SQL builder：按 day/week × usage/geo 生成 queries，并把 row 转成 model/provider/geo aggregate；另有 weekly retention SQL。stealth 模型在 SQL CASE 里打成 `unknown`。 |
| `packages/stats/core/src/domain/model-normalization.ts` | model lower-case、free suffix strip、`deepseek-flash` → `deepseek-v4.1-flash`、`ox-alpha`/`x-preview-f` → `glm-5.3-flash`、`STEALTH_MODELS = omen-alpha`。 |
| `packages/stats/core/src/domain/retention.ts` | `RetentionStatRepo`：探测 `model_retention` 是否存在，按 cohort 替换 rows。 |
| `packages/stats/core/migrations/20260826000000_model_retention/migration.sql` | 仓内建表 SQL。存在不等于任一远端 database 已 apply。 |
| `packages/stats/core/migrations/20260903161929_parched_patriot/migration.sql` | 仓内给 `geo_stat` 加 `idx_country_model_range`。 |
| `packages/stats/core/src/r2-sql.ts` | Cloudflare R2 SQL HTTP client：POST query、decode JSON、10_000 row cap、15 分钟 `AbortSignal.timeout`，并关掉 Bun 默认 5 分钟 idle timer。 |
| `packages/stats/core/src/stat-sync.ts` | 一次 stats sync：并发跑 `buildStatsQueries` / `buildRetentionQueries` 再用 R2 SQL 取数，upsert 聚合表；每条 query 打 complete/fail 日志。 |
| `packages/stats/server/src/router.ts` | Effect `HttpRouter` endpoints：`GET /health`、`GET /ready`、`POST /`。 |
| `packages/stats/app/src/routes/index.tsx` | Stats home page：Go `2M` slices、weekly retention section、country breakdown（无世界地图）；leaderboard 对 unknown lab 隐藏 provider icon。 |
| `infra/stats.ts` | S3 Tables/Iceberg event schema、PlanetScale database、SolidStart app、AWS Service sync daemon。 |

## 数据模型

`core` 的 database schema 定义四张 MySQL 聚合表：`model_stat`、`provider_stat`、`geo_stat`、`model_retention` [E: packages/stats/core/src/database/schema.ts:3] [E: packages/stats/core/src/database/schema.ts:32] [E: packages/stats/core/src/database/schema.ts:74] [E: packages/stats/core/src/database/schema.ts:120]。前三张共享 period columns：`grain`、`period_key`、`dataset`、`tier`、`client`、`source` [E: packages/stats/core/src/database/schema.ts:149] [E: packages/stats/core/src/database/schema.ts:150] [E: packages/stats/core/src/database/schema.ts:151] [E: packages/stats/core/src/database/schema.ts:152] [E: packages/stats/core/src/database/schema.ts:153] [E: packages/stats/core/src/database/schema.ts:154]。`geo_stat` 额外声明 `idx_country_model_range`，覆盖 `(model, provider, grain, dataset, client, source, tier, period_key)`。[E: packages/stats/core/src/database/schema.ts:107] 仓内 migration `20260903161929_parched_patriot` 只写这条 `CREATE INDEX`；存在不等于远端已 apply。[E: packages/stats/core/migrations/20260903161929_parched_patriot/migration.sql:1][I]

`model_retention` 按 `cohort_date` / `dataset` / `tier` / `provider` / `model` unique，字段是 `eligible_users` 与 `retained_users`。[E: packages/stats/core/src/database/schema.ts:124][E: packages/stats/core/src/database/schema.ts:127][E: packages/stats/core/src/database/schema.ts:129][E: packages/stats/core/src/database/schema.ts:130][E: packages/stats/core/src/database/schema.ts:134] 仓内 migration SQL 创建同名表与 index；`RetentionStatRepo.available()` 用 `SELECT ... LIMIT 1` 探测，缺表返回 false 而不是 fail sync。[E: packages/stats/core/migrations/20260826000000_model_retention/migration.sql:1][E: packages/stats/core/src/domain/retention.ts:36][E: packages/stats/core/src/domain/retention.ts:40][E: packages/stats/core/src/domain/retention.ts:43] 这不能证明 production 已跑过该 migration。[I]

`domain/home.ts` 定义 app-facing DTO：`StatsHomeData` 包含 usage、users、leaderboard、market、tokenCost、cacheRatio、sessionCost、retention、country。[E: packages/stats/core/src/domain/home.ts:118][E: packages/stats/core/src/domain/home.ts:128][E: packages/stats/core/src/domain/home.ts:196]

`country` 现在是扁平 `CountryEntry[]`（`{ country, continent, tokens, share, rank }`），不再按 usage range 分桶成 `Record<UsageRange, …>`。home/model 的 country 来自 `listCountryTotals`：调用方先用 `modelRowsWindow(..., "2M")`，再对 day-grain `geo_stat` 做 `GROUP BY country`。[E: packages/stats/core/src/domain/home.ts:34][E: packages/stats/core/src/domain/home.ts:78][E: packages/stats/core/src/domain/home.ts:200][E: packages/stats/core/src/domain/home.ts:282]

`queryRows` 用进程内 cache：TTL `QUERY_CACHE_TTL_MS = 5 * 60 * 1000`（5 分钟），最多 256 条；key 是 `[query, params]` JSON。命中未过期直接返回；过期先删再查；query 失败则删掉刚写入的 entry。[E: packages/stats/core/src/domain/home.ts:147][E: packages/stats/core/src/domain/home.ts:148][E: packages/stats/core/src/domain/home.ts:322][E: packages/stats/core/src/domain/home.ts:327]

## 模型归一、stealth 与 Free tier

`normalizeInferenceModel()` 把 id lower-case，并剥 `(-free|:free|:global)+` 后缀。[E: packages/stats/core/src/domain/model-normalization.ts:30][E: packages/stats/core/src/domain/model-normalization.ts:31] `MODEL_NAME_ALIASES` 把 `deepseek-flash` 映射到 `deepseek-v4.1-flash`，`ox-alpha` 与 `x-preview-f` 映射到 `glm-5.3-flash`，另外还有 `deepseek-v4-flash-0731` / `deepseek-v4-flash-dsv4-flash-final-rnaovd` → `deepseek-v4-flash`、`xiaomi/mimo-v2.5` → `mimo-v2.5`；`statModel()` 先 normalize 再查 alias。[E: packages/stats/core/src/domain/model-normalization.ts:20][E: packages/stats/core/src/domain/model-normalization.ts:21][E: packages/stats/core/src/domain/model-normalization.ts:23][E: packages/stats/core/src/domain/model-normalization.ts:24][E: packages/stats/core/src/domain/model-normalization.ts:41][E: packages/stats/core/src/domain/model-normalization.ts:44] R2 SQL 用 `route_model` 解析 provider model，并在 SQL 里做同样 alias。[E: packages/stats/core/src/domain/inference.ts:106][E: packages/stats/core/src/domain/inference.ts:249][E: packages/stats/core/src/domain/inference.ts:464]

`STEALTH_MODELS = {"omen-alpha"}`。[E: packages/stats/core/src/domain/model-normalization.ts:17] `statProvider()` 在 normalize 后的 model 命中该集合时直接返回 `"unknown"`，不再读 `route_model` / `provider_id`。[E: packages/stats/core/src/domain/model-normalization.ts:53] `statProviderSql` 用同样的 `CASE WHEN lower(model) IN ('omen-alpha') THEN 'unknown'`，所以 usage/geo/retention 聚合都不会写出真实 route provider。[E: packages/stats/core/src/domain/inference.ts:127][E: packages/stats/core/src/domain/inference.ts:294][E: packages/stats/core/src/domain/inference.ts:484][E: packages/stats/core/src/domain/inference.ts:486] home 再读库时仍过一遍 `statProvider(row.model, undefined, row.provider)`。[E: packages/stats/core/src/domain/home.ts:992]

usage/geo query 不再只收 `product = 'go'`。normalized CTE 条件是 `product = 'go' OR (free tier)`；free 判定是 `model_tier='free'`、`FREE_MODELS` 集合、或 model 名匹配 `%-free` / `%-free:global`。[E: packages/stats/core/src/domain/inference.ts:193][E: packages/stats/core/src/domain/inference.ts:280][E: packages/stats/core/src/domain/inference.ts:477] filtered CTE 把这些行写成 `tier = 'Free'`，其余 `'Go'`。[E: packages/stats/core/src/domain/inference.ts:290][E: packages/stats/core/src/domain/inference.ts:292] `DATA_SITE_TIERS` 含 `Go`/`go`/`Free`/`free`；home 用 `SITE_PRODUCT = "Go"` 把 Go+Free 合成一个公开 cohort。[E: packages/stats/core/src/domain/stat.ts:4][E: packages/stats/core/src/domain/home.ts:150]

## Weekly retention

`buildRetentionQueries` 仍只扫 `product = 'go'`（retention 不混 free）。用户当周对该 model 的请求占比 ≥80% 且当周总请求 ≥10 才进 primary model；下一完整 ISO week 再出现则算 retained。[E: packages/stats/core/src/domain/inference.ts:117][E: packages/stats/core/src/domain/inference.ts:158][E: packages/stats/core/src/domain/inference.ts:159]

每个 cohort week **单独**生成一条 query：`periods.map` 后 `cohortDates` 只有该周一天，`buildRetentionQuery([period], source)` 不再把整个 display window 拼进一次 user-level join。[E: packages/stats/core/src/domain/inference.ts:61][E: packages/stats/core/src/domain/inference.ts:62][E: packages/stats/core/src/domain/inference.ts:63]

`buildRetentionEntries()` 取最近 7 个 cohort week，按 model 累加 user-weeks；`eligibleUserWeeks >= 100` 才给 rank，home 只展示有 rank 的前 15 个模型。[E: packages/stats/core/src/domain/home.ts:143][E: packages/stats/core/src/domain/home.ts:144][E: packages/stats/core/src/domain/home.ts:145][E: packages/stats/core/src/domain/home.ts:432][E: packages/stats/core/src/domain/home.ts:433][E: packages/stats/core/src/domain/home.ts:594][E: packages/stats/core/src/domain/home.ts:615] home page 渲染 `Weekly Retention` section。[E: packages/stats/app/src/routes/index.tsx:158][E: packages/stats/app/src/routes/index.tsx:644]

sync 在 `RetentionStatRepo.available()` 为真时才跑 retention queries，并 `replace` 对应 cohort；缺表则 `retentionQueries = []`。[E: packages/stats/core/src/stat-sync.ts:80][E: packages/stats/core/src/stat-sync.ts:81][E: packages/stats/core/src/stat-sync.ts:120]

## Ingest 与聚合控制流

1. `server/src/server.ts` 创建 Node HTTP server layer，默认 `PORT=3000`、`HOST=0.0.0.0`，然后用 Effect `HttpRouter.serve` 启动 routes [E: packages/stats/server/src/server.ts:12] [E: packages/stats/server/src/server.ts:15] [E: packages/stats/server/src/server.ts:16] [E: packages/stats/server/src/server.ts:23]。
2. `Routes` 注册 `GET /health`、`GET /ready`、`POST /`，并用 semaphore 把并发 ingest request 限为 8 [E: packages/stats/server/src/router.ts:10] [E: packages/stats/server/src/router.ts:16] [E: packages/stats/server/src/router.ts:23] [E: packages/stats/server/src/router.ts:24] [E: packages/stats/server/src/router.ts:25]。
3. `POST /` 用 timing-safe bearer token 校验 `Resource.LakeIngestConfig.secret`；授权失败返回 401 [E: packages/stats/server/src/router.ts:35] [E: packages/stats/server/src/router.ts:56] [E: packages/stats/server/src/router.ts:58] [E: packages/stats/server/src/router.ts:60]。
4. Ingest body schema 只读取 optional `events`，非数组或空数组返回 accepted 但 records 为 0 [E: packages/stats/server/src/router.ts:13] [E: packages/stats/server/src/router.ts:45] [E: packages/stats/server/src/router.ts:46]。
5. `Ingest.write` 只处理 object record；每个 object record 的 `_datalake_key` 必须匹配 `database.table`，unsupported route 会返回 `IngestError` [E: packages/stats/server/src/ingest.ts:38] [E: packages/stats/server/src/ingest.ts:145] [E: packages/stats/server/src/ingest.ts:147] [E: packages/stats/server/src/ingest.ts:46]。
6. 支持的 event 被转成 Firehose record：原 `_datalake_key` 被移除，附加 `_lake_database`、`_lake_table`、`_lake_operation: "insert"` [E: packages/stats/server/src/ingest.ts:155] [E: packages/stats/server/src/ingest.ts:159] [E: packages/stats/server/src/ingest.ts:160] [E: packages/stats/server/src/ingest.ts:161] [E: packages/stats/server/src/ingest.ts:162]。
7. Firehose write 每批最多 500 条，失败 batch 最多重试 3 次，并用指数退避 sleep [E: packages/stats/server/src/ingest.ts:7] [E: packages/stats/server/src/ingest.ts:8] [E: packages/stats/server/src/ingest.ts:116]。
8. `syncStats({ full? })` 先把 period end 扣掉 5 分钟 datalake lag。full pass 从 ISO week 前一周与 56 天 display window 的较早边界起算，但不早于 `2026-05-28`；incremental pass 从“两小时前所在 ISO week”的周一起算，同样不早于数据起点 [E: packages/stats/core/src/stat-sync.ts:19] [E: packages/stats/core/src/stat-sync.ts:20] [E: packages/stats/core/src/stat-sync.ts:40] [E: packages/stats/core/src/stat-sync.ts:41]。
9. 一次 sync 调用 `buildStatsQueries(periodStart, periodEnd)` 得到每个 day/week × `usage`/`geo` 的 SQL 列表，再用 `R2Sql.query` 并发度 4 执行，flat 后按 `row.dimension` 分流成 model/provider/geo rows。每条 query complete/fail 都 `Effect.logInfo` / `logError`，开始时还打 `stats sync started`（含 `full`、period、query 数）。[E: packages/stats/core/src/stat-sync.ts:50] [E: packages/stats/core/src/stat-sync.ts:51] [E: packages/stats/core/src/stat-sync.ts:54] [E: packages/stats/core/src/stat-sync.ts:70] [E: packages/stats/core/src/domain/inference.ts:41]
10. 分流后的 rows 并发 upsert `model_stat`、`provider_stat`、`geo_stat`，并在表存在时 replace `model_retention`，随后并发删除 retired dimensions。retention 同样按 query 打 complete/fail 日志。[E: packages/stats/core/src/stat-sync.ts:91] [E: packages/stats/core/src/stat-sync.ts:93] [E: packages/stats/core/src/stat-sync.ts:117] [E: packages/stats/core/src/stat-sync.ts:118] [E: packages/stats/core/src/stat-sync.ts:119] [E: packages/stats/core/src/stat-sync.ts:120] [E: packages/stats/core/src/stat-sync.ts:133]
11. `R2Sql.query` POST 到 `api.sql.cloudflarestorage.com` 的 account/bucket query endpoint，用 bearer `Resource.R2SqlAuthToken`。`timeout: false` 关掉 Bun 默认 5 分钟 idle timer，再用 `AbortSignal.any([signal, AbortSignal.timeout(R2_SQL_TIMEOUT_MS)])` 把整次请求 bound 在 **15 分钟**；超时或 fetch 失败的 message 带 `after ${Date.now() - startedAt}ms`。[E: packages/stats/core/src/r2-sql.ts:4] [E: packages/stats/core/src/r2-sql.ts:56] [E: packages/stats/core/src/r2-sql.ts:57] [E: packages/stats/core/src/r2-sql.ts:64] [E: packages/stats/core/src/r2-sql.ts:70] 响应 decode 失败、`success` 为假或 `rows.length >= 10000` 都变成 `R2SqlQueryError`；R2 SQL 没有 OFFSET，达到 10k cap 视为该 period 被截断，不能当成功结果 [E: packages/stats/core/src/r2-sql.ts:90] [E: packages/stats/core/src/r2-sql.ts:102] [E: packages/stats/core/src/r2-sql.ts:105]。

## R2 SQL 语义

`buildStatsQueries` 默认 source 来自 `Resource.R2Sql.namespace/table` 与 `Resource.StatsSyncConfig.dataset`，不是 Athena `InferenceEvent` catalog [E: packages/stats/core/src/domain/inference.ts:41] [E: packages/stats/core/src/domain/inference.ts:43] [E: packages/stats/core/src/domain/inference.ts:44] [E: packages/stats/core/src/domain/inference.ts:45]。每个 period 拆成两条 query：`usage` family 产出 `model`/`provider` 并算 `approx_distinct(session/user_key)`；`geo` family 产出 `geo`/`geo_model`，sessions/unique_users 固定为 0。[E: packages/stats/core/src/domain/inference.ts:195] [E: packages/stats/core/src/domain/inference.ts:212] [E: packages/stats/core/src/domain/inference.ts:214]

normalized CTE 只取 `event_type = 'generation.completed'`、非空 `model_requested`，并用 `__ingest_ts` 与 `started_at` 双窗口过滤。`source` 必须是 `inference` 或 `inference-legacy`；`LIVE_SOURCE_START = 2026-08-11T10:57:48.186Z` 是 exclusive handoff。[E: packages/stats/core/src/domain/inference.ts:36] [E: packages/stats/core/src/domain/inference.ts:274] [E: packages/stats/core/src/domain/inference.ts:275] filtered CTE 丢掉 `EXCLUDED_MODELS`（当前是 `alpha-gpt-next`）[E: packages/stats/core/src/domain/model-normalization.ts:16][E: packages/stats/core/src/domain/inference.ts:317]。

`packages/stats/core/src/athena.ts` 仍导出 Athena client 与 iterative pagination，但 `stat-sync.ts` 的 query 路径已经改成 `R2Sql` [E: packages/stats/core/src/stat-sync.ts:17] [E: packages/stats/core/src/stat-sync.ts:42] [I]。

## App 展示面

Stats home route 用 SolidStart server query 调 `runStatsEffect(getStatsHomeData())`，只把 Go `2M` usage/users/leaderboard/market/country 以及 Go tokenCost/cacheRatio/sessionCost 和 retention 下发给 client [E: packages/stats/app/src/routes/index.tsx:85] [E: packages/stats/app/src/routes/index.tsx:87] [E: packages/stats/app/src/routes/index.tsx:94]。geo 现在是 `GeoBreakdownSection` 的 top-15 country list，不再引用已删除的 `geo-map.ts`。[E: packages/stats/app/src/routes/index.tsx:1226] [E: packages/stats/app/src/routes/index.tsx:1230]

model catalog route 已把模型、价格与 lab 三个数据源统一切到 `models.opencode.ai`：`catalog.json`、`api.json`、`labs`；loader 在同一个 `Promise.all` 中 fetch 三者再合成 comparison catalog。[E: packages/stats/app/src/routes/model-catalog.ts:4][E: packages/stats/app/src/routes/model-catalog.ts:5][E: packages/stats/app/src/routes/model-catalog.ts:6][E: packages/stats/app/src/routes/model-catalog.ts:61]

UI 不展示 stealth 的真实 route provider。`isProviderlessLab` 把 lab/`unknown` 当成无 provider；`isKnownCatalogLab` 对这类 lab 直接 false。[E: packages/stats/app/src/routes/model-catalog.ts:117][E: packages/stats/app/src/routes/model-catalog.ts:118][E: packages/stats/app/src/routes/model-catalog.ts:122] home leaderboard 只在 `hasProvider()` 为真时渲染 `ProviderIcon` 与 author 名；`omen-alpha` 经 `statProvider` 变成 `unknown` 后走 fallback 空 span。[E: packages/stats/app/src/routes/index.tsx:884][E: packages/stats/app/src/routes/index.tsx:903][E: packages/stats/app/src/routes/index.tsx:916] compare 详情的 lab logo 同样 `Show when={!isProviderlessLab(lab)}`。[E: packages/stats/app/src/component/model-compare-detail.tsx:799] market share 聚合会 `filter(provider !== "unknown")`，stealth 用量不进公开 provider 排行。[E: packages/stats/core/src/domain/home.ts:687]

## 部署关系

`infra/stats.ts` 定义 inference S3 Tables namespace/table，table format 是 ICEBERG。Stats database 使用 PlanetScale `opencode-stats`，production 复用 production branch，非 production 创建 stage branch [E: infra/stats.ts:107] [E: infra/stats.ts:112] [E: infra/stats.ts:114] [E: infra/stats.ts:119]。

Stats app 部署成 Cloudflare SolidStart，domain 为 `stats.${domain}`，link database 与 EmailOctopus key，`PUBLIC_URL` 指向 `https://${domain}/data` [E: infra/stats.ts:164] [E: infra/stats.ts:165] [E: infra/stats.ts:167] [E: infra/stats.ts:168] [E: infra/stats.ts:170]。Stats sync daemon 部署成 AWS Service，Dockerfile 是 `packages/stats/server/Dockerfile`，command 是 `bun src/stat-sync.ts`。link 同时包含 PlanetScale database、legacy `inferenceEvent` Athena table、`R2Sql`/`R2SqlAuthToken` 和 `StatsSyncConfig`；infra 注释把 Athena link 标成 rollback 用，应用代码路径已经走 R2 SQL [E: infra/stats.ts:184] [E: infra/stats.ts:205]。这是仓库 infra 声明，不证明当前 production 已经切到 R2 SQL。[I]

## Gotcha

- `packages/stats/server/src/stat-sync.ts` 是 daemon entrypoint：启动时先按 `ModelStatRepo.lastSyncedAt()` 延迟到 hourly cadence，避免 crash loop 立刻重跑 R2 SQL [E: packages/stats/server/src/stat-sync.ts:47] [E: packages/stats/server/src/stat-sync.ts:48]。每天首个 pass 传 `full: true`；full 失败只记 warning 并 fallback incremental [E: packages/stats/server/src/stat-sync.ts:23] [E: packages/stats/server/src/stat-sync.ts:26]。
- `packages/stats/server/Dockerfile` 默认 CMD 是 `bun src/server.ts`，但 SST sync service 覆盖 command 为 `bun src/stat-sync.ts` [E: packages/stats/server/Dockerfile:32] [E: infra/stats.ts:205]。
- `README.md` 的 `function` 子包名称与当前目录不一致；以 `packages/stats/server/` 和 infra command 为准 [E: packages/stats/README.md:9] [E: packages/stats/server/package.json:8] [E: infra/stats.ts:205]。
- retention 仓内 migration 与 `available()` 探测不能外推 production 已建表。[E: packages/stats/core/src/domain/retention.ts:43][I]
- home 页公开 cohort 标签仍是 Go，但 query 已把 Free 行并进同一展示切片。[E: packages/stats/core/src/domain/home.ts:150][E: packages/stats/app/src/routes/index.tsx:87]
- stealth 只藏 provider，不从 usage/leaderboard 删掉模型本身；`omen-alpha` 仍可出现在 model 维度，只是 lab/author 走 unknown。[E: packages/stats/core/src/domain/model-normalization.ts:53][E: packages/stats/app/src/routes/index.tsx:884]
- `buildRetentionQueries` 不再把整个 display window 合成一条 SQL。full sync 的 retention 条数等于 cohort week 数，每条仍 `concurrency: 4`。[E: packages/stats/core/src/domain/inference.ts:61][E: packages/stats/core/src/stat-sync.ts:108]
- `deepseek-flash` 是 **stats 归一名**，归一成 `deepseek-v4.1-flash`。不要把它写成 zen/go live catalog 条目；live catalog 仍来自外部 JSON。[E: packages/stats/core/src/domain/model-normalization.ts:20]

## Sources

- `packages/stats/README.md`
- `packages/stats/core/package.json`
- `packages/stats/server/package.json`
- `packages/stats/app/package.json`
- `packages/stats/core/src/database/schema.ts`
- `packages/stats/core/src/athena.ts`
- `packages/stats/core/src/r2-sql.ts`
- `packages/stats/core/src/domain/inference.ts`
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
- `packages/stats/app/src/routes/compare/index.tsx`
- `packages/stats/app/src/component/model-compare-detail.tsx`
- `packages/stats/app/src/lib/comparison-pages.ts`
- `infra/stats.ts`
- `sst.config.ts`

## 相关

- `infra.sst`：Stats 的 AWS/Cloudflare/PlanetScale resources 都由 SST 装配；本节点覆盖 Stats package 本身和关键 infra edge。
