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
  - packages/stats/app/src/routes/model-catalog.ts
  - infra/stats.ts
symbols: [syncStats, Ingest, Routes, getStatsHomeData, getStatsModelData, getStatsLabData, getStatsModelsComparisonData]
related: [infra.sst]
evidence: explicit
status: verified
updated: 89130db6b0
---

> `packages/stats` 是 opencode 的用量、成本、market share 与模型比较数据产品：`core` 做 Athena/Drizzle/Effect domain，`server` 做 ingest 与 sync daemon，`app` 做 SolidStart 数据站点。

## 能回答的问题

- Stats 三个子包各负责什么？
- inference event 从哪里 ingest、如何聚合到 model/provider/geo 表？
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
| `packages/stats/core/src/domain/inference.ts` | Athena SQL builder 和 Athena row 到 aggregate 的转换。 |
| `packages/stats/core/src/stat-sync.ts` | 一次 stats sync：用单个 Athena grouping-sets query 计算四个维度并 upsert MySQL 聚合表。 |
| `packages/stats/core/src/athena.ts` | Athena query/poll 与分页结果读取。 |
| `packages/stats/server/src/router.ts` | Effect `HttpRouter` endpoints：`GET /health`、`GET /ready`、`POST /`。 |
| `packages/stats/server/src/ingest.ts` | Firehose batch ingest service。 |
| `packages/stats/server/src/stat-sync.ts` | 每小时运行一次 `syncStats()` 的 daemon。 |
| `packages/stats/app/src/routes/index.tsx` | Stats home page，读取 `getStatsHomeData()` 并渲染 usage/cost/cache/market/geo sections。 |
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
8. `syncStats({ full? })` 先把 period end 扣掉 5 分钟 datalake lag。full pass 从 ISO week 前一周与 56 天 display window 的较早边界起算，但不早于 `2026-05-28`；incremental pass 从“两小时前所在 ISO week”的周一起算，同样不早于数据起点 [E: packages/stats/core/src/stat-sync.ts:11] [E: packages/stats/core/src/stat-sync.ts:12] [E: packages/stats/core/src/stat-sync.ts:14] [E: packages/stats/core/src/stat-sync.ts:18] [E: packages/stats/core/src/stat-sync.ts:28] [E: packages/stats/core/src/stat-sync.ts:29] [E: packages/stats/core/src/stat-sync.ts:81] [E: packages/stats/core/src/stat-sync.ts:84] [E: packages/stats/core/src/stat-sync.ts:94] [E: packages/stats/core/src/stat-sync.ts:96]。
9. 一次 sync 只提交一个 `buildStatsQuery(periodStart, periodEnd)` Athena 查询；SQL 用 `GROUPING SETS` 在一次 source-table scan 中同时产出 model/provider/geo/geo_model 与 week/day grains，返回后再按 `row.dimension` 分流成三类 rows [E: packages/stats/core/src/stat-sync.ts:37] [E: packages/stats/core/src/stat-sync.ts:38] [E: packages/stats/core/src/stat-sync.ts:40] [E: packages/stats/core/src/stat-sync.ts:43] [E: packages/stats/core/src/domain/inference.ts:20] [E: packages/stats/core/src/domain/inference.ts:132] [E: packages/stats/core/src/domain/inference.ts:136] [E: packages/stats/core/src/domain/inference.ts:139] [E: packages/stats/core/src/domain/inference.ts:149] [E: packages/stats/core/src/domain/inference.ts:154]。
10. 分流后的 rows 并发 upsert `model_stat`、`provider_stat`、`geo_stat`，随后并发删除 retired dimensions [E: packages/stats/core/src/stat-sync.ts:46] [E: packages/stats/core/src/stat-sync.ts:50] [E: packages/stats/core/src/stat-sync.ts:52] [E: packages/stats/core/src/stat-sync.ts:56]。
11. Athena result pagination 改成 iterative accumulator：第一页跳过 header，后续页保留全部 rows，直到 `NextToken` 为空；这避免旧递归 spread 在大结果集上反复复制已取 rows [E: packages/stats/core/src/athena.ts:116] [E: packages/stats/core/src/athena.ts:120] [E: packages/stats/core/src/athena.ts:122] [E: packages/stats/core/src/athena.ts:137] [E: packages/stats/core/src/athena.ts:138] [E: packages/stats/core/src/athena.ts:139]。

## Athena SQL 语义

`buildStatsQuery(periodStart, periodEnd)` 从 `Resource.InferenceEvent.catalog/database/table` 构造 source table [E: packages/stats/core/src/domain/inference.ts:20] [E: packages/stats/core/src/domain/inference.ts:25] [E: packages/stats/core/src/domain/inference.ts:27]。SQL 只选择 completions、model 非空、`source = 'lite'`，并同时用 `event_date` partition bounds 与精确 event timestamp window 过滤 [E: packages/stats/core/src/domain/inference.ts:84] [E: packages/stats/core/src/domain/inference.ts:85] [E: packages/stats/core/src/domain/inference.ts:87] [E: packages/stats/core/src/domain/inference.ts:88] [E: packages/stats/core/src/domain/inference.ts:90] [E: packages/stats/core/src/domain/inference.ts:91]。filtered CTE 仍保留 `source='lite' → Go`、free-model → Free、else Paid 的 CASE，但目标查询的 upstream WHERE 已限制为 lite，因此当前被保留 records 都会走 `Go` 分支 [E: packages/stats/core/src/domain/inference.ts:87] [E: packages/stats/core/src/domain/inference.ts:95] [E: packages/stats/core/src/domain/inference.ts:96] [E: packages/stats/core/src/domain/inference.ts:97] [E: packages/stats/core/src/domain/inference.ts:98] [I]。

SQL 聚合列计算 distinct sessions、requests、tokens、microcent costs、duration/TTFB percentiles、output TPS、success/error counts [E: packages/stats/core/src/domain/inference.ts:29] [E: packages/stats/core/src/domain/inference.ts:30] [E: packages/stats/core/src/domain/inference.ts:32] [E: packages/stats/core/src/domain/inference.ts:37] [E: packages/stats/core/src/domain/inference.ts:39] [E: packages/stats/core/src/domain/inference.ts:40] [E: packages/stats/core/src/domain/inference.ts:41] [E: packages/stats/core/src/domain/inference.ts:43] [E: packages/stats/core/src/domain/inference.ts:44] [E: packages/stats/core/src/domain/inference.ts:46] [E: packages/stats/core/src/domain/inference.ts:47] [E: packages/stats/core/src/domain/inference.ts:48] [E: packages/stats/core/src/domain/inference.ts:49]。`tokens_total` 把 cache read/write、input、output 相加，cost microcents 兼容新旧字段：优先 microcents，缺失时用 dollar cost 乘 1,000,000 [E: packages/stats/core/src/domain/inference.ts:118] [E: packages/stats/core/src/domain/inference.ts:119] [E: packages/stats/core/src/domain/inference.ts:121]。

## App 展示面

Stats home route 用 SolidStart server query 调 `runStatsEffect(getStatsHomeData())`，并设置 public/stale cache headers [E: packages/stats/app/src/routes/index.tsx:123] [E: packages/stats/app/src/routes/index.tsx:125] [E: packages/stats/app/src/routes/index.tsx:132]。页面先渲染 `Hero`，随后渲染 usage/cost/cache/market/geo sections，并新增由 2M leaderboard 生成的 `ComparisonCardsSection` [E: packages/stats/app/src/routes/index.tsx:184] [E: packages/stats/app/src/routes/index.tsx:185] [E: packages/stats/app/src/routes/index.tsx:187] [E: packages/stats/app/src/routes/index.tsx:190] [E: packages/stats/app/src/routes/index.tsx:191] [E: packages/stats/app/src/routes/index.tsx:192] [E: packages/stats/app/src/routes/index.tsx:193] [E: packages/stats/app/src/routes/index.tsx:197]。

Lab 和 model dynamic routes 通过 `domain/home` 读取 `getStatsLabData` 与 `getStatsModelData` [E: packages/stats/core/src/domain/home.ts:182] [E: packages/stats/core/src/domain/home.ts:206]。`getStatsHomeData` 并发读取 model/provider/geo daily rows，再构建 usage、leaderboard、market、cost、cache、country records [E: packages/stats/core/src/domain/home.ts:168] [E: packages/stats/core/src/domain/home.ts:171] [E: packages/stats/core/src/domain/home.ts:176] [E: packages/stats/core/src/domain/home.ts:326] [E: packages/stats/core/src/domain/home.ts:343] [E: packages/stats/core/src/domain/home.ts:379]。

新增 `/data/compare` 选择页从 model catalog 构造可选模型和 featured pairs；两个模型都选定后导航到 canonical comparison URL [E: packages/stats/app/src/routes/compare/index.tsx:66] [E: packages/stats/app/src/routes/compare/index.tsx:71] [E: packages/stats/app/src/routes/compare/index.tsx:77] [E: packages/stats/app/src/routes/compare/index.tsx:182] [E: packages/stats/app/src/routes/compare/index.tsx:191] [E: packages/stats/app/src/routes/compare/index.tsx:195] [E: packages/stats/app/src/routes/compare/index.tsx:203] [E: packages/stats/app/src/routes/compare/index.tsx:206]。详情页最多接受 6 个 model request，server query 调 `getStatsModelsComparisonData` 取得 usage stats，再与 catalog metadata 合并成 radar/matrix；family comparison 用 `resolveComparisonFamily` 把 family slug 解析到排序后的首个候选模型 [E: packages/stats/app/src/component/model-compare-detail.tsx:67] [E: packages/stats/app/src/component/model-compare-detail.tsx:109] [E: packages/stats/app/src/component/model-compare-detail.tsx:127] [E: packages/stats/app/src/component/model-compare-detail.tsx:141] [E: packages/stats/app/src/component/model-compare-detail.tsx:149] [E: packages/stats/app/src/component/model-compare-detail.tsx:158] [E: packages/stats/app/src/component/model-compare-detail.tsx:178] [E: packages/stats/app/src/lib/comparison-pages.ts:153] [E: packages/stats/app/src/lib/comparison-pages.ts:156] [E: packages/stats/app/src/lib/comparison-pages.ts:158]。

`getStatsModelsComparisonData` 只读一次 `ModelStatRepo.listDaily()`，逐 request 复用 `buildStatsModelData`，找不到的模型保留为 `null`，并取所有非空 entry 中最新的 `updatedAt` [E: packages/stats/core/src/domain/home.ts:297] [E: packages/stats/core/src/domain/home.ts:301] [E: packages/stats/core/src/domain/home.ts:302] [E: packages/stats/core/src/domain/home.ts:303] [E: packages/stats/core/src/domain/home.ts:304] [E: packages/stats/core/src/domain/home.ts:308] [E: packages/stats/core/src/domain/home.ts:310]。

model catalog route 已把模型、价格与 lab 三个数据源统一切到 `models.opencode.ai`：`catalog.json`、`api.json`、`labs`；loader 在同一个 `Promise.all` 中 fetch 三者再合成 comparison catalog。[E: packages/stats/app/src/routes/model-catalog.ts:3][E: packages/stats/app/src/routes/model-catalog.ts:4][E: packages/stats/app/src/routes/model-catalog.ts:5][E: packages/stats/app/src/routes/model-catalog.ts:59][E: packages/stats/app/src/routes/model-catalog.ts:60][E: packages/stats/app/src/routes/model-catalog.ts:61][E: packages/stats/app/src/routes/model-catalog.ts:62][E: packages/stats/app/src/routes/model-catalog.ts:63][E: packages/stats/app/src/routes/model-catalog.ts:65][E: packages/stats/app/src/routes/model-catalog.ts:230][E: packages/stats/app/src/routes/model-catalog.ts:231][E: packages/stats/app/src/routes/model-catalog.ts:232][E: packages/stats/app/src/routes/model-catalog.ts:236][E: packages/stats/app/src/routes/model-catalog.ts:237][E: packages/stats/app/src/routes/model-catalog.ts:240]

## 部署关系

`infra/stats.ts` 定义 inference S3 Tables namespace/table，table format 是 ICEBERG，schema 中包含 event timestamp、Cloudflare geo、duration/status、provider/model、tokens 和 cost fields [E: infra/stats.ts:9] [E: infra/stats.ts:14] [E: infra/stats.ts:20] [E: infra/stats.ts:25] [E: infra/stats.ts:29] [E: infra/stats.ts:30] [E: infra/stats.ts:36] [E: infra/stats.ts:38] [E: infra/stats.ts:47] [E: infra/stats.ts:48] [E: infra/stats.ts:49] [E: infra/stats.ts:65] [E: infra/stats.ts:81]。Stats database 使用 PlanetScale `opencode-stats`，production 复用 production branch，非 production 创建 stage branch [E: infra/stats.ts:107] [E: infra/stats.ts:112] [E: infra/stats.ts:114] [E: infra/stats.ts:119]。

Stats app 部署成 Cloudflare SolidStart，domain 为 `stats.${domain}`，link database 与 EmailOctopus key，`PUBLIC_URL` 指向 `https://${domain}/data` [E: infra/stats.ts:164] [E: infra/stats.ts:165] [E: infra/stats.ts:167] [E: infra/stats.ts:168] [E: infra/stats.ts:170]。Stats sync daemon 部署成 AWS Service，Dockerfile 是 `packages/stats/server/Dockerfile`，command 是 `bun src/stat-sync.ts`，并 link database、inference event、stats sync config [E: infra/stats.ts:184] [E: infra/stats.ts:191] [E: infra/stats.ts:193] [E: infra/stats.ts:195] [E: infra/stats.ts:196]。

## Gotcha

- `packages/stats/server/src/stat-sync.ts` 是 daemon entrypoint：启动时先按 `ModelStatRepo.lastSyncedAt()` 延迟到 hourly cadence；每天首个成功 pass 传 `full: true` 刷新 display window，其余 pass 只算 incremental ISO-week window [E: packages/stats/server/src/stat-sync.ts:13] [E: packages/stats/server/src/stat-sync.ts:15] [E: packages/stats/server/src/stat-sync.ts:19] [E: packages/stats/server/src/stat-sync.ts:21] [E: packages/stats/server/src/stat-sync.ts:23] [E: packages/stats/server/src/stat-sync.ts:24] [E: packages/stats/server/src/stat-sync.ts:30] [E: packages/stats/server/src/stat-sync.ts:36] [E: packages/stats/server/src/stat-sync.ts:38] [E: packages/stats/server/src/stat-sync.ts:45]。`packages/stats/server/src/server.ts` 是 ingest HTTP server，两者同包但不同 command [E: packages/stats/server/src/server.ts:6] [E: packages/stats/server/src/server.ts:7] [E: packages/stats/server/src/server.ts:20] [E: packages/stats/server/src/server.ts:23] [E: packages/stats/server/src/server.ts:28]。
- `packages/stats/server/Dockerfile` 默认 CMD 是 `bun src/server.ts`，但 SST sync service 覆盖 command 为 `bun src/stat-sync.ts` [E: packages/stats/server/Dockerfile:32] [E: infra/stats.ts:193]。
- `README.md` 的 `function` 子包名称与当前目录不一致；以 `packages/stats/server/` 和 infra command 为准 [E: packages/stats/README.md:9] [E: packages/stats/server/package.json:8] [E: infra/stats.ts:191]。

## Sources

- `packages/stats/README.md`
- `packages/stats/core/package.json`
- `packages/stats/server/package.json`
- `packages/stats/app/package.json`
- `packages/stats/core/src/database/schema.ts`
- `packages/stats/core/src/athena.ts`
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
- `packages/stats/app/src/routes/model-catalog.ts`
- `packages/stats/app/src/routes/compare/index.tsx`
- `packages/stats/app/src/component/model-compare-detail.tsx`
- `packages/stats/app/src/lib/comparison-pages.ts`
- `infra/stats.ts`
- `sst.config.ts`

## 相关

- `infra.sst`：Stats 的 AWS/Cloudflare/PlanetScale resources 都由 SST 装配；本节点覆盖 Stats package 本身和关键 infra edge。
