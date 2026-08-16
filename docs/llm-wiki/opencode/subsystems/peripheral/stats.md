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
  - packages/stats/core/src/stat-sync.ts
  - packages/stats/app/src/routes/model-catalog.ts
  - packages/stats/app/src/routes/geo-map.ts
  - infra/stats.ts
symbols: [syncStats, Ingest, Routes, getStatsHomeData, getStatsModelData, getStatsLabData, getStatsModelsComparisonData, R2Sql, buildStatsQueries]
related: [infra.sst]
evidence: explicit
status: verified
updated: 3fd77ae980
---

> `packages/stats` 是 opencode 的用量、成本、market share 与模型比较数据产品：`core` 做 R2 SQL/Drizzle/Effect domain，`server` 做 ingest 与 sync daemon，`app` 做 SolidStart 数据站点。

## 能回答的问题

- Stats 三个子包各负责什么？
- inference event 从哪里 ingest、如何用 R2 SQL 聚合到 model/provider/geo 表？
- Stats server 暴露哪些 HTTP endpoint？
- Stats app 展示哪些页面和数据块？
- 模型比较页如何把 models.dev catalog 与实测 usage stats 合并？
- Stats 在 SST infra 中如何部署？

## 职责边界

`packages/stats/README.md` 把 Stats 描述为独立于 console 的站点，并说明 runtime/database/domain services 在 `core`、SolidStart website 在 `app`、deployable entrypoints 在 `function` [E: packages/stats/README.md:3]。当前源码目录实际包含 `core`、`server`、`app` 三个 package，且 `server/package.json` 的 `main` 和 export 指向 `./src/server.ts` [E: packages/stats/core/package.json:3] [E: packages/stats/server/package.json:3] [E: packages/stats/app/package.json:3] [E: packages/stats/server/package.json:8] [E: packages/stats/server/package.json:10]。因此本文按实际源码记录 `core/server/app`，README 中的 `function` 命名视为旧文案或目录改名残留 [I]。

根 `package.json` 把 `packages/stats/*` 纳入 Bun workspaces，并提供 `dev:stats` 通过 SST shell 启动 stats app [E: package.json:13] [E: package.json:29]。`sst.config.ts` 仅在 `stage.deployAws` 为真时 import `infra/stats.js`，并在 outputs 中暴露 `StatsUrl` [E: sst.config.ts:33] [E: sst.config.ts:34] [E: sst.config.ts:43]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/stats/core/src/database/schema.ts` | Drizzle MySQL tables：`model_stat`、`provider_stat`、`geo_stat`。 |
| `packages/stats/core/src/domain/inference.ts` | R2 SQL builder：按 day/week × usage/geo 生成 queries，并把 row 转成 model/provider/geo aggregate。 |
| `packages/stats/core/src/r2-sql.ts` | Cloudflare R2 SQL HTTP client：POST query、decode JSON、10_000 row cap。 |
| `packages/stats/core/src/stat-sync.ts` | 一次 stats sync：并发跑 `buildStatsQueries` 再用 R2 SQL 取数，upsert MySQL 聚合表。 |
| `packages/stats/core/src/athena.ts` | 仍导出的 Athena query/poll client；当前 `syncStats` 不再调用它。 |
| `packages/stats/server/src/router.ts` | Effect `HttpRouter` endpoints：`GET /health`、`GET /ready`、`POST /`。 |
| `packages/stats/server/src/ingest.ts` | Firehose batch ingest service。 |
| `packages/stats/server/src/stat-sync.ts` | 每小时运行一次 `syncStats()` 的 daemon；full pass 失败则 fallback incremental。 |
| `packages/stats/app/src/routes/index.tsx` | Stats home page，只把 Go `2M` slices 下发给 client，并渲染 usage/cost/cache/market/geo sections。 |
| `packages/stats/app/src/routes/geo-map.ts` | 预计算 world-atlas 110m 路径与 small-country markers，供 home/lab geo map 复用。 |
| `packages/stats/app/src/routes/compare/index.tsx` | 模型比较选择页与 featured comparison pairs。 |
| `packages/stats/app/src/component/model-compare-detail.tsx` | 2–6 模型对比详情，把 catalog 字段与 usage stats 组装为 radar/matrix。 |
| `infra/stats.ts` | S3 Tables/Iceberg event schema、PlanetScale database、SolidStart app、AWS Service sync daemon。 |

## 数据模型

`core` 的 database schema 定义三个 MySQL 聚合表：`model_stat`、`provider_stat`、`geo_stat` [E: packages/stats/core/src/database/schema.ts:3] [E: packages/stats/core/src/database/schema.ts:32] [E: packages/stats/core/src/database/schema.ts:74]。三张表共享 period columns：`grain`、`period_key`、`dataset`、`tier`、`client`、`source` [E: packages/stats/core/src/database/schema.ts:110] [E: packages/stats/core/src/database/schema.ts:113] [E: packages/stats/core/src/database/schema.ts:118]。共享 metric columns 包括 sessions、requests、input/output/reasoning/cache tokens、total tokens、input/output/total cost microcents、duration/TTFB percentiles、output TPS、success/error/sample counts [E: packages/stats/core/src/database/schema.ts:122] [E: packages/stats/core/src/database/schema.ts:124] [E: packages/stats/core/src/database/schema.ts:126] [E: packages/stats/core/src/database/schema.ts:127] [E: packages/stats/core/src/database/schema.ts:128] [E: packages/stats/core/src/database/schema.ts:129] [E: packages/stats/core/src/database/schema.ts:130] [E: packages/stats/core/src/database/schema.ts:131] [E: packages/stats/core/src/database/schema.ts:132] [E: packages/stats/core/src/database/schema.ts:133] [E: packages/stats/core/src/database/schema.ts:134] [E: packages/stats/core/src/database/schema.ts:135] [E: packages/stats/core/src/database/schema.ts:136] [E: packages/stats/core/src/database/schema.ts:138] [E: packages/stats/core/src/database/schema.ts:139] [E: packages/stats/core/src/database/schema.ts:140] [E: packages/stats/core/src/database/schema.ts:141] [E: packages/stats/core/src/database/schema.ts:142] [E: packages/stats/core/src/database/schema.ts:143]。

`provider_stat` 和 `geo_stat` 额外包含 market share columns，字段是 token/request/session share [E: packages/stats/core/src/database/schema.ts:38] [E: packages/stats/core/src/database/schema.ts:83] [E: packages/stats/core/src/database/schema.ts:148] [E: packages/stats/core/src/database/schema.ts:150] [E: packages/stats/core/src/database/schema.ts:151] [E: packages/stats/core/src/database/schema.ts:152]。`model_stat` 有 `provider_model` 和按 tokens/requests/cost 的 rank [E: packages/stats/core/src/database/schema.ts:9] [E: packages/stats/core/src/database/schema.ts:11] [E: packages/stats/core/src/database/schema.ts:13]。

`domain/home.ts` 定义 app-facing DTO：`StatsHomeData` 包含 usage、users、leaderboard、market、tokenCost、cacheRatio、sessionCost、country；`StatsModelData` 包含 model profile、rank、totals、usage、token mix、country、peers；`StatsLabData` 包含 provider/lab aggregate、usage 和 model list [E: packages/stats/core/src/domain/home.ts:45] [E: packages/stats/core/src/domain/home.ts:71] [E: packages/stats/core/src/domain/home.ts:107] [E: packages/stats/core/src/domain/home.ts:109] [E: packages/stats/core/src/domain/home.ts:110] [E: packages/stats/core/src/domain/home.ts:116]。新增 `StatsModelComparisonData`，每个 requested model 对应一个 comparison entry 或 `null`，entry 保留 rank/share/change/totals/usage [E: packages/stats/core/src/domain/home.ts:85] [E: packages/stats/core/src/domain/home.ts:96] [E: packages/stats/core/src/domain/home.ts:99] [E: packages/stats/core/src/domain/home.ts:103] [E: packages/stats/core/src/domain/home.ts:105]。

## Ingest 与聚合控制流

1. `server/src/server.ts` 创建 Node HTTP server layer，默认 `PORT=3000`、`HOST=0.0.0.0`，然后用 Effect `HttpRouter.serve` 启动 routes [E: packages/stats/server/src/server.ts:12] [E: packages/stats/server/src/server.ts:15] [E: packages/stats/server/src/server.ts:16] [E: packages/stats/server/src/server.ts:23]。
2. `Routes` 注册 `GET /health`、`GET /ready`、`POST /`，并用 semaphore 把并发 ingest request 限为 8 [E: packages/stats/server/src/router.ts:10] [E: packages/stats/server/src/router.ts:16] [E: packages/stats/server/src/router.ts:19] [E: packages/stats/server/src/router.ts:23] [E: packages/stats/server/src/router.ts:25]。
3. `POST /` 用 timing-safe bearer token 校验 `Resource.LakeIngestConfig.secret`；授权失败返回 401 [E: packages/stats/server/src/router.ts:35] [E: packages/stats/server/src/router.ts:56] [E: packages/stats/server/src/router.ts:58] [E: packages/stats/server/src/router.ts:60]。
4. Ingest body schema 只读取 optional `events`，非数组或空数组返回 accepted 但 records 为 0 [E: packages/stats/server/src/router.ts:12] [E: packages/stats/server/src/router.ts:45] [E: packages/stats/server/src/router.ts:46]。
5. `Ingest.write` 只处理 object record；每个 object record 的 `_datalake_key` 必须匹配 `database.table`，unsupported route 会返回 `IngestError` [E: packages/stats/server/src/ingest.ts:9] [E: packages/stats/server/src/ingest.ts:35] [E: packages/stats/server/src/ingest.ts:36] [E: packages/stats/server/src/ingest.ts:40] [E: packages/stats/server/src/ingest.ts:130] [E: packages/stats/server/src/ingest.ts:145] [E: packages/stats/server/src/ingest.ts:147] [E: packages/stats/server/src/ingest.ts:149] [E: packages/stats/server/src/ingest.ts:150] [E: packages/stats/server/src/ingest.ts:151]。
6. 支持的 event 被转成 Firehose record：原 `_datalake_key` 被移除，附加 `_lake_database`、`_lake_table`、`_lake_operation: "insert"` [E: packages/stats/server/src/ingest.ts:155] [E: packages/stats/server/src/ingest.ts:159] [E: packages/stats/server/src/ingest.ts:160] [E: packages/stats/server/src/ingest.ts:161] [E: packages/stats/server/src/ingest.ts:162]。
7. Firehose write 每批最多 500 条，失败 batch 最多重试 3 次，并用指数退避 sleep [E: packages/stats/server/src/ingest.ts:7] [E: packages/stats/server/src/ingest.ts:8] [E: packages/stats/server/src/ingest.ts:56] [E: packages/stats/server/src/ingest.ts:108] [E: packages/stats/server/src/ingest.ts:116] [E: packages/stats/server/src/ingest.ts:126] [E: packages/stats/server/src/ingest.ts:127]。
8. `syncStats({ full? })` 先把 period end 扣掉 5 分钟 datalake lag。full pass 从 ISO week 前一周与 56 天 display window 的较早边界起算，但不早于 `2026-05-28`；incremental pass 从“两小时前所在 ISO week”的周一起算，同样不早于数据起点 [E: packages/stats/core/src/stat-sync.ts:11] [E: packages/stats/core/src/stat-sync.ts:12] [E: packages/stats/core/src/stat-sync.ts:14] [E: packages/stats/core/src/stat-sync.ts:18] [E: packages/stats/core/src/stat-sync.ts:28] [E: packages/stats/core/src/stat-sync.ts:29] [E: packages/stats/core/src/stat-sync.ts:83] [E: packages/stats/core/src/stat-sync.ts:86] [E: packages/stats/core/src/stat-sync.ts:96] [E: packages/stats/core/src/stat-sync.ts:98]。
9. 一次 sync 不再发单个 Athena query。它调用 `buildStatsQueries(periodStart, periodEnd)` 得到每个 day/week × `usage`/`geo` 的 SQL 列表，再用 `R2Sql.query` 并发度 4 执行，flat 后按 `row.dimension` 分流成 model/provider/geo rows [E: packages/stats/core/src/stat-sync.ts:37] [E: packages/stats/core/src/stat-sync.ts:38] [E: packages/stats/core/src/stat-sync.ts:40] [E: packages/stats/core/src/stat-sync.ts:42] [E: packages/stats/core/src/stat-sync.ts:45] [E: packages/stats/core/src/domain/inference.ts:36] [E: packages/stats/core/src/domain/inference.ts:42]。
10. 分流后的 rows 并发 upsert `model_stat`、`provider_stat`、`geo_stat`，随后并发删除 retired dimensions [E: packages/stats/core/src/stat-sync.ts:48] [E: packages/stats/core/src/stat-sync.ts:52] [E: packages/stats/core/src/stat-sync.ts:54] [E: packages/stats/core/src/stat-sync.ts:56]。
11. `R2Sql.query` POST 到 `api.sql.cloudflarestorage.com` 的 account/bucket query endpoint，用 bearer `Resource.R2SqlAuthToken`。响应 decode 失败、`success` 为假或 `rows.length >= 10000` 都变成 `R2SqlQueryError`；R2 SQL 没有 OFFSET，达到 10k cap 视为该 period 被截断，不能当成功结果 [E: packages/stats/core/src/r2-sql.ts:46] [E: packages/stats/core/src/r2-sql.ts:49] [E: packages/stats/core/src/r2-sql.ts:53] [E: packages/stats/core/src/r2-sql.ts:76] [E: packages/stats/core/src/r2-sql.ts:88] [E: packages/stats/core/src/r2-sql.ts:91]。

## R2 SQL 语义

`buildStatsQueries` 默认 source 来自 `Resource.R2Sql.namespace/table` 与 `Resource.StatsSyncConfig.dataset`，不是 Athena `InferenceEvent` catalog [E: packages/stats/core/src/domain/inference.ts:36] [E: packages/stats/core/src/domain/inference.ts:38] [E: packages/stats/core/src/domain/inference.ts:39] [E: packages/stats/core/src/domain/inference.ts:40]。每个 period 拆成两条 query：`usage` family 产出 `model`/`provider` 并算 `approx_distinct(session/user_key)`；`geo` family 产出 `geo`/`geo_model`，sessions/unique_users 固定为 0。这样把高基数 geo grouping 与 costly distinct 分开，避免单次结果顶到 10k 行 [E: packages/stats/core/src/domain/inference.ts:42] [E: packages/stats/core/src/domain/inference.ts:47] [E: packages/stats/core/src/domain/inference.ts:57] [E: packages/stats/core/src/domain/inference.ts:65] [E: packages/stats/core/src/domain/inference.ts:73] [E: packages/stats/core/src/domain/inference.ts:186]。

normalized CTE 只取 `event_type = 'generation.completed'`、`product = 'go'`、非空 `model_requested`，并用 `__ingest_ts` 与 `started_at` 双窗口过滤。`source` 必须是 `inference` 或 `inference-legacy`；`LIVE_SOURCE_START = 2026-08-11T10:57:48.186Z` 是 exclusive handoff，legacy 只计该时刻之前、live 只计该时刻及之后，避免重叠双计 [E: packages/stats/core/src/domain/inference.ts:31] [E: packages/stats/core/src/domain/inference.ts:135] [E: packages/stats/core/src/domain/inference.ts:136] [E: packages/stats/core/src/domain/inference.ts:138] [E: packages/stats/core/src/domain/inference.ts:139] [E: packages/stats/core/src/domain/inference.ts:141] [E: packages/stats/core/src/domain/inference.ts:144] [E: packages/stats/core/src/domain/inference.ts:146]。filtered CTE 把 tier 固定写成 `'Go'`，并丢掉 `EXCLUDED_MODELS` [E: packages/stats/core/src/domain/inference.ts:150] [E: packages/stats/core/src/domain/inference.ts:174]。

聚合列是 requests、token/cost sums、`AVG(duration_ms/ttfb_ms/output_tps)`、success/error/sample counts。p50/p95 duration 与 TTFB 在 SQL 里显式 `null`，不再算 percentile [E: packages/stats/core/src/domain/inference.ts:86] [E: packages/stats/core/src/domain/inference.ts:95] [E: packages/stats/core/src/domain/inference.ts:96] [E: packages/stats/core/src/domain/inference.ts:97] [E: packages/stats/core/src/domain/inference.ts:99] [E: packages/stats/core/src/domain/inference.ts:100]。`tokens_total` 仍把 cache read/write、input、output 相加；cost 列直接读 `cost_input/output/total` 当 microcents [E: packages/stats/core/src/domain/inference.ts:131] [E: packages/stats/core/src/domain/inference.ts:133] [E: packages/stats/core/src/domain/inference.ts:169]。

`packages/stats/core/src/athena.ts` 仍导出 Athena client 与 iterative pagination，但 `stat-sync.ts` 的 query 路径已经改成 `R2Sql` [E: packages/stats/core/src/index.ts:1] [E: packages/stats/core/src/stat-sync.ts:9] [E: packages/stats/core/src/stat-sync.ts:30] [I]。

## App 展示面

Stats home route 用 SolidStart server query 调 `runStatsEffect(getStatsHomeData())`，只把 Go `2M` usage/users/leaderboard/market/country 以及 Go tokenCost/cacheRatio/sessionCost 下发给 client，并设置 public/stale cache headers [E: packages/stats/app/src/routes/index.tsx:80] [E: packages/stats/app/src/routes/index.tsx:82] [E: packages/stats/app/src/routes/index.tsx:85] [E: packages/stats/app/src/routes/index.tsx:92] [E: packages/stats/app/src/routes/index.tsx:100]。页面先渲染 `Hero`，随后渲染 usage/users/session-cost/token-cost/cache/market/geo sections，以及由 2M leaderboard 生成的 `ComparisonCardsSection` [E: packages/stats/app/src/routes/index.tsx:147] [E: packages/stats/app/src/routes/index.tsx:148] [E: packages/stats/app/src/routes/index.tsx:154] [E: packages/stats/app/src/routes/index.tsx:155]。

geo map 路径从 `geo-map.ts` 静态预计算：world-atlas 110m countries（去掉 id `010`）、equirectangular path、small-country fallback markers。home 页 `buildCountryStats` 丢掉 `tokens <= 0` 与 `AQ`；map fill 对 zero-usage country 把 opacity 设为 0 [E: packages/stats/app/src/routes/geo-map.ts:16] [E: packages/stats/app/src/routes/geo-map.ts:22] [E: packages/stats/app/src/routes/geo-map.ts:31] [E: packages/stats/app/src/routes/geo-map.ts:111] [E: packages/stats/core/src/domain/home.ts:622] [E: packages/stats/core/src/domain/home.ts:624] [E: packages/stats/app/src/routes/index.tsx:1150] [E: packages/stats/app/src/routes/index.tsx:1151]。

Lab 和 model dynamic routes 通过 `domain/home` 读取 `getStatsLabData` 与 `getStatsModelData` [E: packages/stats/core/src/domain/home.ts:182] [E: packages/stats/core/src/domain/home.ts:206]。`getStatsHomeData` 并发读取 model/provider/geo daily rows，再构建 usage、leaderboard、market、cost、cache、country records [E: packages/stats/core/src/domain/home.ts:168] [E: packages/stats/core/src/domain/home.ts:171] [E: packages/stats/core/src/domain/home.ts:176] [E: packages/stats/core/src/domain/home.ts:326] [E: packages/stats/core/src/domain/home.ts:343] [E: packages/stats/core/src/domain/home.ts:379]。

新增 `/data/compare` 选择页从 model catalog 构造可选模型和 featured pairs；两个模型都选定后导航到 canonical comparison URL [E: packages/stats/app/src/routes/compare/index.tsx:72] [E: packages/stats/app/src/routes/compare/index.tsx:78] [E: packages/stats/app/src/routes/compare/index.tsx:187] [E: packages/stats/app/src/routes/compare/index.tsx:196] [E: packages/stats/app/src/routes/compare/index.tsx:200] [E: packages/stats/app/src/routes/compare/index.tsx:211]。详情页最多接受 6 个 model request，server query 调 `getStatsModelsComparisonData` 取得 usage stats，再与 catalog metadata 合并成 radar/matrix；family comparison 用 `resolveComparisonFamily` 把 family slug 解析到排序后的首个候选模型 [E: packages/stats/app/src/component/model-compare-detail.tsx:68] [E: packages/stats/app/src/component/model-compare-detail.tsx:110] [E: packages/stats/app/src/component/model-compare-detail.tsx:128] [E: packages/stats/app/src/component/model-compare-detail.tsx:142] [E: packages/stats/app/src/component/model-compare-detail.tsx:150] [E: packages/stats/app/src/component/model-compare-detail.tsx:159] [E: packages/stats/app/src/component/model-compare-detail.tsx:179] [E: packages/stats/app/src/lib/comparison-pages.ts:153] [E: packages/stats/app/src/lib/comparison-pages.ts:156] [E: packages/stats/app/src/lib/comparison-pages.ts:158]。

`getStatsModelsComparisonData` 只读一次 `ModelStatRepo.listDaily()`，逐 request 复用 `buildStatsModelData`，找不到的模型保留为 `null`，并取所有非空 entry 中最新的 `updatedAt` [E: packages/stats/core/src/domain/home.ts:297] [E: packages/stats/core/src/domain/home.ts:302] [E: packages/stats/core/src/domain/home.ts:303] [E: packages/stats/core/src/domain/home.ts:308] [E: packages/stats/core/src/domain/home.ts:310]。

model catalog route 已把模型、价格与 lab 三个数据源统一切到 `models.opencode.ai`：`catalog.json`、`api.json`、`labs`；loader 在同一个 `Promise.all` 中 fetch 三者再合成 comparison catalog。[E: packages/stats/app/src/routes/model-catalog.ts:3][E: packages/stats/app/src/routes/model-catalog.ts:4][E: packages/stats/app/src/routes/model-catalog.ts:5][E: packages/stats/app/src/routes/model-catalog.ts:59][E: packages/stats/app/src/routes/model-catalog.ts:60][E: packages/stats/app/src/routes/model-catalog.ts:61][E: packages/stats/app/src/routes/model-catalog.ts:62][E: packages/stats/app/src/routes/model-catalog.ts:63][E: packages/stats/app/src/routes/model-catalog.ts:65][E: packages/stats/app/src/routes/model-catalog.ts:230][E: packages/stats/app/src/routes/model-catalog.ts:231][E: packages/stats/app/src/routes/model-catalog.ts:232][E: packages/stats/app/src/routes/model-catalog.ts:236][E: packages/stats/app/src/routes/model-catalog.ts:237][E: packages/stats/app/src/routes/model-catalog.ts:240]

## 部署关系

`infra/stats.ts` 定义 inference S3 Tables namespace/table，table format 是 ICEBERG，schema 中包含 event timestamp、Cloudflare geo、duration/status、provider/model、tokens 和 cost fields [E: infra/stats.ts:9] [E: infra/stats.ts:14] [E: infra/stats.ts:20] [E: infra/stats.ts:25] [E: infra/stats.ts:29] [E: infra/stats.ts:30] [E: infra/stats.ts:36] [E: infra/stats.ts:38] [E: infra/stats.ts:47] [E: infra/stats.ts:48] [E: infra/stats.ts:49] [E: infra/stats.ts:65] [E: infra/stats.ts:81]。Stats database 使用 PlanetScale `opencode-stats`，production 复用 production branch，非 production 创建 stage branch [E: infra/stats.ts:107] [E: infra/stats.ts:112] [E: infra/stats.ts:114] [E: infra/stats.ts:119]。

Stats app 部署成 Cloudflare SolidStart，domain 为 `stats.${domain}`，link database 与 EmailOctopus key，`PUBLIC_URL` 指向 `https://${domain}/data` [E: infra/stats.ts:164] [E: infra/stats.ts:165] [E: infra/stats.ts:167] [E: infra/stats.ts:168] [E: infra/stats.ts:170]。Stats sync daemon 部署成 AWS Service，放进 lake cluster，architecture `arm64`，memory `2 GB`。Dockerfile 是 `packages/stats/server/Dockerfile`，command 是 `bun src/stat-sync.ts`。link 同时包含 PlanetScale database、legacy `inferenceEvent` Athena table、`R2Sql`/`R2SqlAuthToken` 和 `StatsSyncConfig`；infra 注释把 Athena link 标成 rollback 用，应用代码路径已经走 R2 SQL [E: infra/stats.ts:184] [E: infra/stats.ts:185] [E: infra/stats.ts:194] [E: infra/stats.ts:195] [E: infra/stats.ts:196] [E: infra/stats.ts:200] [E: infra/stats.ts:203] [E: infra/stats.ts:205] [E: infra/stats.ts:208]。这是仓库 infra 声明，不证明当前 production 已经切到 R2 SQL。[I]

## Gotcha

- `packages/stats/server/src/stat-sync.ts` 是 daemon entrypoint：启动时先按 `ModelStatRepo.lastSyncedAt()` 延迟到 hourly cadence，避免 crash loop 立刻重跑 R2 SQL [E: packages/stats/server/src/stat-sync.ts:14] [E: packages/stats/server/src/stat-sync.ts:15] [E: packages/stats/server/src/stat-sync.ts:46] [E: packages/stats/server/src/stat-sync.ts:48] [E: packages/stats/server/src/stat-sync.ts:55]。每天首个 pass 传 `full: true`；full 失败只记 warning 并 `lastFullDay = today`，然后 fallback `syncStats({ full: false })` 重算当前 ISO week。incremental 失败也只 warning，不抛死进程 [E: packages/stats/server/src/stat-sync.ts:19] [E: packages/stats/server/src/stat-sync.ts:23] [E: packages/stats/server/src/stat-sync.ts:26] [E: packages/stats/server/src/stat-sync.ts:31] [E: packages/stats/server/src/stat-sync.ts:34]。`packages/stats/server/src/server.ts` 是 ingest HTTP server，两者同包但不同 command [E: packages/stats/server/src/server.ts:6] [E: packages/stats/server/src/server.ts:7] [E: packages/stats/server/src/server.ts:20] [E: packages/stats/server/src/server.ts:23] [E: packages/stats/server/src/server.ts:28]。
- `packages/stats/server/Dockerfile` 默认 CMD 是 `bun src/server.ts`，但 SST sync service 覆盖 command 为 `bun src/stat-sync.ts` [E: packages/stats/server/Dockerfile:32] [E: infra/stats.ts:205]。
- `README.md` 的 `function` 子包名称与当前目录不一致；以 `packages/stats/server/` 和 infra command 为准 [E: packages/stats/README.md:9] [E: packages/stats/server/package.json:8] [E: infra/stats.ts:205]。
- incremental/full window 仍按 ISO week + 56 天 display window 计算；R2 SQL 的 day/week query 各自产出当日/当周 totals，home 页再只取 Go `2M` 切片展示 [E: packages/stats/core/src/stat-sync.ts:14] [E: packages/stats/core/src/domain/inference.ts:42] [E: packages/stats/app/src/routes/index.tsx:85]。

## Sources

- `packages/stats/README.md`
- `packages/stats/core/package.json`
- `packages/stats/server/package.json`
- `packages/stats/app/package.json`
- `packages/stats/core/src/database/schema.ts`
- `packages/stats/core/src/athena.ts`
- `packages/stats/core/src/r2-sql.ts`
- `packages/stats/core/src/domain/inference.ts`
- `packages/stats/core/src/domain/stat.ts`
- `packages/stats/core/src/domain/home.ts`
- `packages/stats/core/src/stat-sync.ts`
- `packages/stats/server/src/server.ts`
- `packages/stats/server/src/router.ts`
- `packages/stats/server/src/ingest.ts`
- `packages/stats/server/src/stat-sync.ts`
- `packages/stats/server/Dockerfile`
- `packages/stats/app/src/routes/index.tsx`
- `packages/stats/app/src/routes/geo-map.ts`
- `packages/stats/app/src/routes/model-catalog.ts`
- `packages/stats/app/src/routes/compare/index.tsx`
- `packages/stats/app/src/component/model-compare-detail.tsx`
- `packages/stats/app/src/lib/comparison-pages.ts`
- `infra/stats.ts`
- `sst.config.ts`

## 相关

- `infra.sst`：Stats 的 AWS/Cloudflare/PlanetScale resources 都由 SST 装配；本节点覆盖 Stats package 本身和关键 infra edge。
