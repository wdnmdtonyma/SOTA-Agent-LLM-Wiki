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
  - packages/stats/app/src/routes/model-catalog.ts
  - infra/stats.ts
symbols: [syncStats, Ingest, Routes, getStatsHomeData, getStatsModelData, getStatsLabData, getStatsModelsComparisonData, R2Sql, buildStatsQueries, buildRetentionQueries, RetentionStatRepo]
related: [infra.sst]
evidence: explicit
status: verified
updated: 9f69463f1d
---

> `packages/stats` 是 opencode 的用量、成本、market share、weekly retention 与模型比较数据产品：`core` 做 R2 SQL/Drizzle/Effect domain，`server` 做 ingest 与 sync daemon，`app` 做 SolidStart 数据站点。

## 能回答的问题

- Stats 三个子包各负责什么？
- inference event 从哪里 ingest、如何用 R2 SQL 聚合到 model/provider/geo/retention 表？
- weekly retention 的门槛与 top-N 是什么？
- Free tier 如何进入 aggregates？geo-map 还在吗？
- `ox-alpha` / `x-preview-f` 如何归一成 `glm-5.3-flash`？
- Stats 在 SST infra 中如何部署？

## 职责边界

`packages/stats/README.md` 把 Stats 描述为独立于 console 的站点，并说明 runtime/database/domain services 在 `core`、SolidStart website 在 `app`、deployable entrypoints 在 `function` [E: packages/stats/README.md:3]。当前源码目录实际包含 `core`、`server`、`app` 三个 package，且 `server/package.json` 的 `main` 和 export 指向 `./src/server.ts` [E: packages/stats/core/package.json:3] [E: packages/stats/server/package.json:3] [E: packages/stats/app/package.json:3] [E: packages/stats/server/package.json:8] [E: packages/stats/server/package.json:10]。因此本文按实际源码记录 `core/server/app`，README 中的 `function` 命名视为旧文案或目录改名残留 [I]。

根 `package.json` 把 `packages/stats/*` 纳入 Bun workspaces，并提供 `dev:stats` 通过 SST shell 启动 stats app [E: package.json:13] [E: package.json:29]。`sst.config.ts` 仅在 `stage.deployAws` 为真时 import `infra/stats.js`，并在 outputs 中暴露 `StatsUrl` [E: sst.config.ts:33] [E: sst.config.ts:34] [E: sst.config.ts:43]。

`packages/stats/app/src/routes/geo-map.ts` 已从源树删除。home/lab 不再预计算 d3 world-atlas 路径；geo 只剩 country list / breakdown。[I]

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/stats/core/src/database/schema.ts` | Drizzle MySQL tables：`model_stat`、`provider_stat`、`geo_stat`、`model_retention`。 |
| `packages/stats/core/src/domain/inference.ts` | R2 SQL builder：按 day/week × usage/geo 生成 queries，并把 row 转成 model/provider/geo aggregate；另有 weekly retention SQL。 |
| `packages/stats/core/src/domain/model-normalization.ts` | model lower-case、free suffix strip、`ox-alpha`/`x-preview-f` → `glm-5.3-flash`。 |
| `packages/stats/core/src/domain/retention.ts` | `RetentionStatRepo`：探测 `model_retention` 是否存在，按 cohort 替换 rows。 |
| `packages/stats/core/migrations/20260826000000_model_retention/migration.sql` | 仓内建表 SQL。存在不等于任一远端 database 已 apply。 |
| `packages/stats/core/src/r2-sql.ts` | Cloudflare R2 SQL HTTP client：POST query、decode JSON、10_000 row cap。 |
| `packages/stats/core/src/stat-sync.ts` | 一次 stats sync：并发跑 `buildStatsQueries` / `buildRetentionQueries` 再用 R2 SQL 取数，upsert 聚合表。 |
| `packages/stats/server/src/router.ts` | Effect `HttpRouter` endpoints：`GET /health`、`GET /ready`、`POST /`。 |
| `packages/stats/app/src/routes/index.tsx` | Stats home page：Go `2M` slices、weekly retention section、country breakdown（无世界地图）。 |
| `infra/stats.ts` | S3 Tables/Iceberg event schema、PlanetScale database、SolidStart app、AWS Service sync daemon。 |

## 数据模型

`core` 的 database schema 定义四张 MySQL 聚合表：`model_stat`、`provider_stat`、`geo_stat`、`model_retention` [E: packages/stats/core/src/database/schema.ts:3] [E: packages/stats/core/src/database/schema.ts:32] [E: packages/stats/core/src/database/schema.ts:74] [E: packages/stats/core/src/database/schema.ts:110]。前三张共享 period columns：`grain`、`period_key`、`dataset`、`tier`、`client`、`source` [E: packages/stats/core/src/database/schema.ts:139] [E: packages/stats/core/src/database/schema.ts:140] [E: packages/stats/core/src/database/schema.ts:141] [E: packages/stats/core/src/database/schema.ts:142] [E: packages/stats/core/src/database/schema.ts:143] [E: packages/stats/core/src/database/schema.ts:144]。

`model_retention` 按 `cohort_date` / `dataset` / `tier` / `provider` / `model` unique，字段是 `eligible_users` 与 `retained_users`。[E: packages/stats/core/src/database/schema.ts:111][E: packages/stats/core/src/database/schema.ts:114][E: packages/stats/core/src/database/schema.ts:119][E: packages/stats/core/src/database/schema.ts:120][E: packages/stats/core/src/database/schema.ts:124] 仓内 migration SQL 创建同名表与 index；`RetentionStatRepo.available()` 用 `SELECT ... LIMIT 1` 探测，缺表返回 false 而不是 fail sync。[E: packages/stats/core/migrations/20260826000000_model_retention/migration.sql:1][E: packages/stats/core/src/domain/retention.ts:36][E: packages/stats/core/src/domain/retention.ts:40][E: packages/stats/core/src/domain/retention.ts:43] 这不能证明 production 已跑过该 migration。[I]

`domain/home.ts` 定义 app-facing DTO：`StatsHomeData` 包含 usage、users、leaderboard、market、tokenCost、cacheRatio、sessionCost、retention、country。[E: packages/stats/core/src/domain/home.ts:120][E: packages/stats/core/src/domain/home.ts:571][E: packages/stats/core/src/domain/home.ts:581]

## 模型归一与 Free tier

`normalizeInferenceModel()` 把 id lower-case，并剥 `(-free|:free|:global)+` 后缀。[E: packages/stats/core/src/domain/model-normalization.ts:26][E: packages/stats/core/src/domain/model-normalization.ts:27] `MODEL_NAME_ALIASES` 把 `ox-alpha` 与 `x-preview-f` 映射到 `glm-5.3-flash`；`statModel()` 先 normalize 再查 alias。[E: packages/stats/core/src/domain/model-normalization.ts:18][E: packages/stats/core/src/domain/model-normalization.ts:19][E: packages/stats/core/src/domain/model-normalization.ts:20][E: packages/stats/core/src/domain/model-normalization.ts:37][E: packages/stats/core/src/domain/model-normalization.ts:40] R2 SQL 用 `route_model` 解析 provider model，并在 SQL 里做同样 alias。[E: packages/stats/core/src/domain/inference.ts:106][E: packages/stats/core/src/domain/inference.ts:249][E: packages/stats/core/src/domain/inference.ts:464]

usage/geo query 不再只收 `product = 'go'`。normalized CTE 条件是 `product = 'go' OR (free tier)`；free 判定是 `model_tier='free'`、`FREE_MODELS` 集合、或 model 名匹配 `%-free` / `%-free:global`。[E: packages/stats/core/src/domain/inference.ts:280][E: packages/stats/core/src/domain/inference.ts:477][E: packages/stats/core/src/domain/inference.ts:478] filtered CTE 把这些行写成 `tier = 'Free'`，其余 `'Go'`。[E: packages/stats/core/src/domain/inference.ts:289][E: packages/stats/core/src/domain/inference.ts:291] `DATA_SITE_TIERS` 含 `Go`/`go`/`Free`/`free`；home 用 `SITE_PRODUCT = "Go"` 把 Go+Free 合成一个公开 cohort。[E: packages/stats/core/src/domain/stat.ts:4][E: packages/stats/core/src/domain/home.ts:150]

## Weekly retention

`buildRetentionQueries` 仍只扫 `product = 'go'`（retention 不混 free）。用户当周对该 model 的请求占比 ≥80% 且当周总请求 ≥10 才进 primary model；下一完整 ISO week 再出现则算 retained。[E: packages/stats/core/src/domain/inference.ts:117][E: packages/stats/core/src/domain/inference.ts:158][E: packages/stats/core/src/domain/inference.ts:159][E: packages/stats/core/src/domain/inference.ts:174][E: packages/stats/core/src/domain/inference.ts:175]

`buildRetentionEntries()` 取最近 7 个 cohort week，按 model 累加 user-weeks；`eligibleUserWeeks >= 100` 才给 rank，home 只展示有 rank 的前 15 个模型。[E: packages/stats/core/src/domain/home.ts:145][E: packages/stats/core/src/domain/home.ts:146][E: packages/stats/core/src/domain/home.ts:147][E: packages/stats/core/src/domain/home.ts:586][E: packages/stats/core/src/domain/home.ts:607][E: packages/stats/core/src/domain/home.ts:422][E: packages/stats/core/src/domain/home.ts:424] home page 渲染 `Weekly Retention` section。[E: packages/stats/app/src/routes/index.tsx:93][E: packages/stats/app/src/routes/index.tsx:152]

sync 在 `RetentionStatRepo.available()` 为真时才跑 retention queries，并 `replace` 对应 cohort；缺表则 `retentionQueries = []`。[E: packages/stats/core/src/stat-sync.ts:60][E: packages/stats/core/src/stat-sync.ts:61][E: packages/stats/core/src/stat-sync.ts:82]

## Ingest 与聚合控制流

1. `server/src/server.ts` 创建 Node HTTP server layer，默认 `PORT=3000`、`HOST=0.0.0.0`，然后用 Effect `HttpRouter.serve` 启动 routes [E: packages/stats/server/src/server.ts:12] [E: packages/stats/server/src/server.ts:15] [E: packages/stats/server/src/server.ts:16] [E: packages/stats/server/src/server.ts:23]。
2. `Routes` 注册 `GET /health`、`GET /ready`、`POST /`，并用 semaphore 把并发 ingest request 限为 8 [E: packages/stats/server/src/router.ts:10] [E: packages/stats/server/src/router.ts:16] [E: packages/stats/server/src/router.ts:19] [E: packages/stats/server/src/router.ts:23] [E: packages/stats/server/src/router.ts:24] [E: packages/stats/server/src/router.ts:25]。
3. `POST /` 用 timing-safe bearer token 校验 `Resource.LakeIngestConfig.secret`；授权失败返回 401 [E: packages/stats/server/src/router.ts:35] [E: packages/stats/server/src/router.ts:56] [E: packages/stats/server/src/router.ts:58] [E: packages/stats/server/src/router.ts:60]。
4. Ingest body schema 只读取 optional `events`，非数组或空数组返回 accepted 但 records 为 0 [E: packages/stats/server/src/router.ts:12] [E: packages/stats/server/src/router.ts:45] [E: packages/stats/server/src/router.ts:46]。
5. `Ingest.write` 只处理 object record；每个 object record 的 `_datalake_key` 必须匹配 `database.table`，unsupported route 会返回 `IngestError` [E: packages/stats/server/src/ingest.ts:9] [E: packages/stats/server/src/ingest.ts:35] [E: packages/stats/server/src/ingest.ts:36] [E: packages/stats/server/src/ingest.ts:40]。
6. 支持的 event 被转成 Firehose record：原 `_datalake_key` 被移除，附加 `_lake_database`、`_lake_table`、`_lake_operation: "insert"` [E: packages/stats/server/src/ingest.ts:155] [E: packages/stats/server/src/ingest.ts:159] [E: packages/stats/server/src/ingest.ts:160] [E: packages/stats/server/src/ingest.ts:161] [E: packages/stats/server/src/ingest.ts:162]。
7. Firehose write 每批最多 500 条，失败 batch 最多重试 3 次，并用指数退避 sleep [E: packages/stats/server/src/ingest.ts:7] [E: packages/stats/server/src/ingest.ts:8] [E: packages/stats/server/src/ingest.ts:56]。
8. `syncStats({ full? })` 先把 period end 扣掉 5 分钟 datalake lag。full pass 从 ISO week 前一周与 56 天 display window 的较早边界起算，但不早于 `2026-05-28`；incremental pass 从“两小时前所在 ISO week”的周一起算，同样不早于数据起点 [E: packages/stats/core/src/stat-sync.ts:19] [E: packages/stats/core/src/stat-sync.ts:21] [E: packages/stats/core/src/stat-sync.ts:40] [E: packages/stats/core/src/stat-sync.ts:41]。
9. 一次 sync 调用 `buildStatsQueries(periodStart, periodEnd)` 得到每个 day/week × `usage`/`geo` 的 SQL 列表，再用 `R2Sql.query` 并发度 4 执行，flat 后按 `row.dimension` 分流成 model/provider/geo rows [E: packages/stats/core/src/stat-sync.ts:50] [E: packages/stats/core/src/stat-sync.ts:53] [E: packages/stats/core/src/domain/inference.ts:40]。
10. 分流后的 rows 并发 upsert `model_stat`、`provider_stat`、`geo_stat`，并在表存在时 replace `model_retention`，随后并发删除 retired dimensions [E: packages/stats/core/src/stat-sync.ts:77] [E: packages/stats/core/src/stat-sync.ts:79] [E: packages/stats/core/src/stat-sync.ts:80] [E: packages/stats/core/src/stat-sync.ts:81] [E: packages/stats/core/src/stat-sync.ts:82] [E: packages/stats/core/src/stat-sync.ts:95]。
11. `R2Sql.query` POST 到 `api.sql.cloudflarestorage.com` 的 account/bucket query endpoint，用 bearer `Resource.R2SqlAuthToken`。响应 decode 失败、`success` 为假或 `rows.length >= 10000` 都变成 `R2SqlQueryError`；R2 SQL 没有 OFFSET，达到 10k cap 视为该 period 被截断，不能当成功结果 [E: packages/stats/core/src/r2-sql.ts:46] [E: packages/stats/core/src/r2-sql.ts:49] [E: packages/stats/core/src/r2-sql.ts:53] [E: packages/stats/core/src/r2-sql.ts:76] [E: packages/stats/core/src/r2-sql.ts:88] [E: packages/stats/core/src/r2-sql.ts:91]。

## R2 SQL 语义

`buildStatsQueries` 默认 source 来自 `Resource.R2Sql.namespace/table` 与 `Resource.StatsSyncConfig.dataset`，不是 Athena `InferenceEvent` catalog [E: packages/stats/core/src/domain/inference.ts:40] [E: packages/stats/core/src/domain/inference.ts:42] [E: packages/stats/core/src/domain/inference.ts:43] [E: packages/stats/core/src/domain/inference.ts:44]。每个 period 拆成两条 query：`usage` family 产出 `model`/`provider` 并算 `approx_distinct(session/user_key)`；`geo` family 产出 `geo`/`geo_model`，sessions/unique_users 固定为 0。[E: packages/stats/core/src/domain/inference.ts:211] [E: packages/stats/core/src/domain/inference.ts:214]

normalized CTE 只取 `event_type = 'generation.completed'`、非空 `model_requested`，并用 `__ingest_ts` 与 `started_at` 双窗口过滤。`source` 必须是 `inference` 或 `inference-legacy`；`LIVE_SOURCE_START = 2026-08-11T10:57:48.186Z` 是 exclusive handoff。[E: packages/stats/core/src/domain/inference.ts:35] [E: packages/stats/core/src/domain/inference.ts:274] [E: packages/stats/core/src/domain/inference.ts:275] filtered CTE 丢掉 `EXCLUDED_MODELS`（当前是 `alpha-gpt-next`）[E: packages/stats/core/src/domain/model-normalization.ts:16]。

`packages/stats/core/src/athena.ts` 仍导出 Athena client 与 iterative pagination，但 `stat-sync.ts` 的 query 路径已经改成 `R2Sql` [E: packages/stats/core/src/stat-sync.ts:17] [E: packages/stats/core/src/stat-sync.ts:50] [I]。

## App 展示面

Stats home route 用 SolidStart server query 调 `runStatsEffect(getStatsHomeData())`，只把 Go `2M` usage/users/leaderboard/market/country 以及 Go tokenCost/cacheRatio/sessionCost 和 retention 下发给 client [E: packages/stats/app/src/routes/index.tsx:81] [E: packages/stats/app/src/routes/index.tsx:86] [E: packages/stats/app/src/routes/index.tsx:93]。geo 现在是 `GeoBreakdownSection` 的 top-15 country list，不再引用已删除的 `geo-map.ts`。[E: packages/stats/app/src/routes/index.tsx:1154] [E: packages/stats/app/src/routes/index.tsx:1158]

model catalog route 已把模型、价格与 lab 三个数据源统一切到 `models.opencode.ai`：`catalog.json`、`api.json`、`labs`；loader 在同一个 `Promise.all` 中 fetch 三者再合成 comparison catalog。[E: packages/stats/app/src/routes/model-catalog.ts:4][E: packages/stats/app/src/routes/model-catalog.ts:5][E: packages/stats/app/src/routes/model-catalog.ts:6]

## 部署关系

`infra/stats.ts` 定义 inference S3 Tables namespace/table，table format 是 ICEBERG。Stats database 使用 PlanetScale `opencode-stats`，production 复用 production branch，非 production 创建 stage branch [E: infra/stats.ts:107] [E: infra/stats.ts:112] [E: infra/stats.ts:114] [E: infra/stats.ts:119]。

Stats app 部署成 Cloudflare SolidStart，domain 为 `stats.${domain}`，link database 与 EmailOctopus key，`PUBLIC_URL` 指向 `https://${domain}/data` [E: infra/stats.ts:164] [E: infra/stats.ts:165] [E: infra/stats.ts:167] [E: infra/stats.ts:168] [E: infra/stats.ts:170]。Stats sync daemon 部署成 AWS Service，Dockerfile 是 `packages/stats/server/Dockerfile`，command 是 `bun src/stat-sync.ts`。link 同时包含 PlanetScale database、legacy `inferenceEvent` Athena table、`R2Sql`/`R2SqlAuthToken` 和 `StatsSyncConfig`；infra 注释把 Athena link 标成 rollback 用，应用代码路径已经走 R2 SQL [E: infra/stats.ts:184] [E: infra/stats.ts:205]。这是仓库 infra 声明，不证明当前 production 已经切到 R2 SQL。[I]

## Gotcha

- `packages/stats/server/src/stat-sync.ts` 是 daemon entrypoint：启动时先按 `ModelStatRepo.lastSyncedAt()` 延迟到 hourly cadence，避免 crash loop 立刻重跑 R2 SQL [E: packages/stats/server/src/stat-sync.ts:14] [E: packages/stats/server/src/stat-sync.ts:15]。每天首个 pass 传 `full: true`；full 失败只记 warning 并 fallback incremental [E: packages/stats/server/src/stat-sync.ts:19] [E: packages/stats/server/src/stat-sync.ts:23]。
- `packages/stats/server/Dockerfile` 默认 CMD 是 `bun src/server.ts`，但 SST sync service 覆盖 command 为 `bun src/stat-sync.ts` [E: packages/stats/server/Dockerfile:32] [E: infra/stats.ts:205]。
- `README.md` 的 `function` 子包名称与当前目录不一致；以 `packages/stats/server/` 和 infra command 为准 [E: packages/stats/README.md:9] [E: packages/stats/server/package.json:8] [E: infra/stats.ts:205]。
- retention 仓内 migration 与 `available()` 探测不能外推 production 已建表。[E: packages/stats/core/src/domain/retention.ts:43][I]
- home 页公开 cohort 标签仍是 Go，但 query 已把 Free 行并进同一展示切片。[E: packages/stats/core/src/domain/home.ts:150][E: packages/stats/app/src/routes/index.tsx:86]

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
