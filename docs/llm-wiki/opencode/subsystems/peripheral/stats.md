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
  - infra/stats.ts
symbols: [syncStats, Ingest, Routes, getStatsHomeData, getStatsModelData, getStatsLabData]
related: [infra.sst]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `packages/stats` 是 opencode 的用量、成本、market share 数据产品：`core` 做 Athena/Drizzle/Effect domain，`server` 做 ingest 与 sync daemon，`app` 做 SolidStart 数据站点。

## 能回答的问题

- Stats 三个子包各负责什么？
- inference event 从哪里 ingest、如何聚合到 model/provider/geo 表？
- Stats server 暴露哪些 HTTP endpoint？
- Stats app 展示哪些页面和数据块？
- Stats 在 SST infra 中如何部署？

## 职责边界

`packages/stats/README.md` 把 Stats 描述为独立于 console 的站点，并说明 runtime/database/domain services 在 `core`、SolidStart website 在 `app`、deployable entrypoints 在 `function` [E: packages/stats/README.md:3]。当前源码目录实际包含 `core`、`server`、`app` 三个 package，且 `server/package.json` 的 `main` 和 export 指向 `./src/server.ts` [E: packages/stats/core/package.json:3] [E: packages/stats/server/package.json:3] [E: packages/stats/app/package.json:3] [E: packages/stats/server/package.json:8] [E: packages/stats/server/package.json:10]。因此本文按实际源码记录 `core/server/app`，README 中的 `function` 命名视为旧文案或目录改名残留 [I]。

根 `package.json` 把 `packages/stats/*` 纳入 Bun workspaces，并提供 `dev:stats` 通过 SST shell 启动 stats app [E: package.json:13] [E: package.json:28]。`sst.config.ts` 仅在 `stage.deployAws` 为真时 import `infra/stats.js`，并在 outputs 中暴露 `StatsUrl` [E: sst.config.ts:33] [E: sst.config.ts:34] [E: sst.config.ts:43]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/stats/core/src/database/schema.ts` | Drizzle MySQL tables：`model_stat`、`provider_stat`、`geo_stat`。 |
| `packages/stats/core/src/domain/inference.ts` | Athena SQL builder 和 Athena row 到 aggregate 的转换。 |
| `packages/stats/core/src/stat-sync.ts` | 一次 stats sync：查询 Athena 四个维度，upsert MySQL 聚合表。 |
| `packages/stats/server/src/router.ts` | Effect `HttpRouter` endpoints：`GET /health`、`GET /ready`、`POST /`。 |
| `packages/stats/server/src/ingest.ts` | Firehose batch ingest service。 |
| `packages/stats/server/src/stat-sync.ts` | 每小时运行一次 `syncStats()` 的 daemon。 |
| `packages/stats/app/src/routes/index.tsx` | Stats home page，读取 `getStatsHomeData()` 并渲染 usage/cost/cache/market/geo sections。 |
| `infra/stats.ts` | S3 Tables/Iceberg event schema、PlanetScale database、SolidStart app、AWS Service sync daemon。 |

## 数据模型

`core` 的 database schema 定义三个 MySQL 聚合表：`model_stat`、`provider_stat`、`geo_stat` [E: packages/stats/core/src/database/schema.ts:3] [E: packages/stats/core/src/database/schema.ts:32] [E: packages/stats/core/src/database/schema.ts:74]。三张表共享 period columns：`grain`、`period_key`、`dataset`、`tier`、`client`、`source` [E: packages/stats/core/src/database/schema.ts:110] [E: packages/stats/core/src/database/schema.ts:113] [E: packages/stats/core/src/database/schema.ts:118]。共享 metric columns 包括 sessions、requests、input/output/reasoning/cache tokens、total tokens、input/output/total cost microcents、duration/TTFB percentiles、output TPS、success/error/sample counts [E: packages/stats/core/src/database/schema.ts:122] [E: packages/stats/core/src/database/schema.ts:124] [E: packages/stats/core/src/database/schema.ts:126] [E: packages/stats/core/src/database/schema.ts:127] [E: packages/stats/core/src/database/schema.ts:128] [E: packages/stats/core/src/database/schema.ts:129] [E: packages/stats/core/src/database/schema.ts:130] [E: packages/stats/core/src/database/schema.ts:131] [E: packages/stats/core/src/database/schema.ts:132] [E: packages/stats/core/src/database/schema.ts:133] [E: packages/stats/core/src/database/schema.ts:134] [E: packages/stats/core/src/database/schema.ts:135] [E: packages/stats/core/src/database/schema.ts:136] [E: packages/stats/core/src/database/schema.ts:138] [E: packages/stats/core/src/database/schema.ts:139] [E: packages/stats/core/src/database/schema.ts:140] [E: packages/stats/core/src/database/schema.ts:141] [E: packages/stats/core/src/database/schema.ts:142] [E: packages/stats/core/src/database/schema.ts:143]。

`provider_stat` 和 `geo_stat` 额外包含 market share columns，字段是 token/request/session share [E: packages/stats/core/src/database/schema.ts:38] [E: packages/stats/core/src/database/schema.ts:83] [E: packages/stats/core/src/database/schema.ts:148] [E: packages/stats/core/src/database/schema.ts:150] [E: packages/stats/core/src/database/schema.ts:151] [E: packages/stats/core/src/database/schema.ts:152]。`model_stat` 有 `provider_model` 和按 tokens/requests/cost 的 rank [E: packages/stats/core/src/database/schema.ts:9] [E: packages/stats/core/src/database/schema.ts:11] [E: packages/stats/core/src/database/schema.ts:13]。

`domain/home.ts` 定义 app-facing DTO：`StatsHomeData` 包含 usage、users、leaderboard、market、tokenCost、cacheRatio、sessionCost、country；`StatsModelData` 包含 model profile、rank、totals、usage、token mix、country、peers；`StatsLabData` 包含 provider/lab aggregate、usage 和 model list [E: packages/stats/core/src/domain/home.ts:44] [E: packages/stats/core/src/domain/home.ts:70] [E: packages/stats/core/src/domain/home.ts:84] [E: packages/stats/core/src/domain/home.ts:86] [E: packages/stats/core/src/domain/home.ts:87] [E: packages/stats/core/src/domain/home.ts:93]。

## Ingest 与聚合控制流

1. `server/src/server.ts` 创建 Node HTTP server layer，默认 `PORT=3000`、`HOST=0.0.0.0`，然后用 Effect `HttpRouter.serve` 启动 routes [E: packages/stats/server/src/server.ts:12] [E: packages/stats/server/src/server.ts:15] [E: packages/stats/server/src/server.ts:16] [E: packages/stats/server/src/server.ts:23]。
2. `Routes` 注册 `GET /health`、`GET /ready`、`POST /`，并用 semaphore 把并发 ingest request 限为 8 [E: packages/stats/server/src/router.ts:10] [E: packages/stats/server/src/router.ts:16] [E: packages/stats/server/src/router.ts:19] [E: packages/stats/server/src/router.ts:23] [E: packages/stats/server/src/router.ts:25]。
3. `POST /` 用 timing-safe bearer token 校验 `Resource.LakeIngestConfig.secret`；授权失败返回 401 [E: packages/stats/server/src/router.ts:35] [E: packages/stats/server/src/router.ts:56] [E: packages/stats/server/src/router.ts:58] [E: packages/stats/server/src/router.ts:60]。
4. Ingest body schema 只读取 optional `events`，非数组或空数组返回 accepted 但 records 为 0 [E: packages/stats/server/src/router.ts:12] [E: packages/stats/server/src/router.ts:45] [E: packages/stats/server/src/router.ts:46]。
5. `Ingest.write` 只处理 object record；每个 object record 的 `_datalake_key` 必须匹配 `database.table`，unsupported route 会返回 `IngestError` [E: packages/stats/server/src/ingest.ts:9] [E: packages/stats/server/src/ingest.ts:35] [E: packages/stats/server/src/ingest.ts:36] [E: packages/stats/server/src/ingest.ts:40] [E: packages/stats/server/src/ingest.ts:130] [E: packages/stats/server/src/ingest.ts:145] [E: packages/stats/server/src/ingest.ts:147] [E: packages/stats/server/src/ingest.ts:149] [E: packages/stats/server/src/ingest.ts:150] [E: packages/stats/server/src/ingest.ts:151]。
6. 支持的 event 被转成 Firehose record：原 `_datalake_key` 被移除，附加 `_lake_database`、`_lake_table`、`_lake_operation: "insert"` [E: packages/stats/server/src/ingest.ts:155] [E: packages/stats/server/src/ingest.ts:159] [E: packages/stats/server/src/ingest.ts:160] [E: packages/stats/server/src/ingest.ts:161] [E: packages/stats/server/src/ingest.ts:162]。
7. Firehose write 每批最多 500 条，失败 batch 最多重试 3 次，并用指数退避 sleep [E: packages/stats/server/src/ingest.ts:7] [E: packages/stats/server/src/ingest.ts:8] [E: packages/stats/server/src/ingest.ts:56] [E: packages/stats/server/src/ingest.ts:108] [E: packages/stats/server/src/ingest.ts:116] [E: packages/stats/server/src/ingest.ts:126] [E: packages/stats/server/src/ingest.ts:127]。
8. `syncStats()` 计算 period end 时扣掉 5 分钟 datalake lag，并把 period start 锚定到 ISO week 起点前一周与 `2026-05-28` 之间的较晚值 [E: packages/stats/core/src/stat-sync.ts:11] [E: packages/stats/core/src/stat-sync.ts:12] [E: packages/stats/core/src/stat-sync.ts:24] [E: packages/stats/core/src/stat-sync.ts:25] [E: packages/stats/core/src/stat-sync.ts:27] [E: packages/stats/core/src/stat-sync.ts:29] [E: packages/stats/core/src/stat-sync.ts:30]。
9. 一次 sync 并发跑四个 Athena 查询：model、provider、geo、geo_model，分别 flatMap 成 aggregates [E: packages/stats/core/src/stat-sync.ts:40] [E: packages/stats/core/src/stat-sync.ts:43] [E: packages/stats/core/src/stat-sync.ts:46] [E: packages/stats/core/src/stat-sync.ts:49] [E: packages/stats/core/src/stat-sync.ts:52]。
10. aggregates 转成 rows 后并发 upsert `model_stat`、`provider_stat`、`geo_stat`，随后并发删除 retired dimensions [E: packages/stats/core/src/stat-sync.ts:51] [E: packages/stats/core/src/stat-sync.ts:55] [E: packages/stats/core/src/stat-sync.ts:61] [E: packages/stats/core/src/stat-sync.ts:63]。

## Athena SQL 语义

`buildStatsQuery(periodStart, periodEnd, dimension)` 从 `Resource.InferenceEvent.catalog/database/table` 构造 source table [E: packages/stats/core/src/domain/inference.ts:17] [E: packages/stats/core/src/domain/inference.ts:20]。SQL 只选择 `event_type = 'completions'`、model 非空、event timestamp 落在 period window 内的 records [E: packages/stats/core/src/domain/inference.ts:92] [E: packages/stats/core/src/domain/inference.ts:93] [E: packages/stats/core/src/domain/inference.ts:94] [E: packages/stats/core/src/domain/inference.ts:95] [E: packages/stats/core/src/domain/inference.ts:96]。tier 规则把 `source = 'lite'` 标为 `Go`，把部分 free/nano 模型标为 `Free`，其他标为 `Paid`；后续 `normalizeTier` 会把 `Paid` 改成 `Zen` [E: packages/stats/core/src/domain/inference.ts:100] [E: packages/stats/core/src/domain/inference.ts:101] [E: packages/stats/core/src/domain/inference.ts:102] [E: packages/stats/core/src/domain/inference.ts:103] [E: packages/stats/core/src/domain/stat.ts:253] [E: packages/stats/core/src/domain/stat.ts:254]。

SQL 聚合列计算 distinct sessions、requests、tokens、microcent costs、duration/TTFB percentiles、output TPS、success/error counts [E: packages/stats/core/src/domain/inference.ts:43] [E: packages/stats/core/src/domain/inference.ts:44] [E: packages/stats/core/src/domain/inference.ts:46] [E: packages/stats/core/src/domain/inference.ts:51] [E: packages/stats/core/src/domain/inference.ts:53] [E: packages/stats/core/src/domain/inference.ts:54] [E: packages/stats/core/src/domain/inference.ts:55] [E: packages/stats/core/src/domain/inference.ts:57] [E: packages/stats/core/src/domain/inference.ts:58] [E: packages/stats/core/src/domain/inference.ts:60] [E: packages/stats/core/src/domain/inference.ts:61] [E: packages/stats/core/src/domain/inference.ts:62] [E: packages/stats/core/src/domain/inference.ts:63]。`tokens_total` 把 cache read/write、input、output 相加，cost microcents 兼容新旧字段：优先 microcents，缺失时用 dollar cost 乘 1,000,000 [E: packages/stats/core/src/domain/inference.ts:132] [E: packages/stats/core/src/domain/inference.ts:133] [E: packages/stats/core/src/domain/inference.ts:135]。

## App 展示面

Stats home route 用 SolidStart server query 调 `runStatsEffect(getStatsHomeData())`，并设置 public/stale cache headers [E: packages/stats/app/src/routes/index.tsx:117] [E: packages/stats/app/src/routes/index.tsx:119] [E: packages/stats/app/src/routes/index.tsx:126]。页面先渲染 `Hero`，随后渲染 `TopModelsSection`、`UniqueUsersSection`、`SessionCostSection`、`TokenCostSection`、`CacheRatioSection`、`MarketShareSection`、`GeoBreakdownSection` [E: packages/stats/app/src/routes/index.tsx:178] [E: packages/stats/app/src/routes/index.tsx:179] [E: packages/stats/app/src/routes/index.tsx:180] [E: packages/stats/app/src/routes/index.tsx:181] [E: packages/stats/app/src/routes/index.tsx:182] [E: packages/stats/app/src/routes/index.tsx:183] [E: packages/stats/app/src/routes/index.tsx:184] [E: packages/stats/app/src/routes/index.tsx:185]。

Lab 和 model dynamic routes 也通过 `domain/home` 读取 `getStatsLabData` 与 `getStatsModelData`，但这些文件名包含 SolidStart bracket route，当前正文证据用 home route 和 domain/service 层为主 [I]。`getStatsHomeData` 从 `ModelStatRepo`、`ProviderStatRepo`、`GeoStatRepo` 并发读取 daily rows，再构建 usage、leaderboard、market、cost、cache、country records [E: packages/stats/core/src/domain/home.ts:131] [E: packages/stats/core/src/domain/home.ts:139] [E: packages/stats/core/src/domain/home.ts:143] [E: packages/stats/core/src/domain/home.ts:190] [E: packages/stats/core/src/domain/home.ts:216]。

## 部署关系

`infra/stats.ts` 定义 inference S3 Tables namespace/table，table format 是 ICEBERG，schema 中包含 event timestamp、Cloudflare geo、duration/status、provider/model、tokens 和 cost fields [E: infra/stats.ts:9] [E: infra/stats.ts:14] [E: infra/stats.ts:20] [E: infra/stats.ts:25] [E: infra/stats.ts:29] [E: infra/stats.ts:30] [E: infra/stats.ts:36] [E: infra/stats.ts:38] [E: infra/stats.ts:47] [E: infra/stats.ts:48] [E: infra/stats.ts:49] [E: infra/stats.ts:65] [E: infra/stats.ts:81]。Stats database 使用 PlanetScale `opencode-stats`，production 复用 production branch，非 production 创建 stage branch [E: infra/stats.ts:107] [E: infra/stats.ts:112] [E: infra/stats.ts:114] [E: infra/stats.ts:119]。

Stats app 部署成 Cloudflare SolidStart，domain 为 `stats.${domain}`，link database 与 EmailOctopus key，`PUBLIC_URL` 指向 `https://${domain}/data` [E: infra/stats.ts:164] [E: infra/stats.ts:165] [E: infra/stats.ts:167] [E: infra/stats.ts:168] [E: infra/stats.ts:170]。Stats sync daemon 部署成 AWS Service，Dockerfile 是 `packages/stats/server/Dockerfile`，command 是 `bun src/stat-sync.ts`，并 link database、inference event、stats sync config [E: infra/stats.ts:184] [E: infra/stats.ts:189] [E: infra/stats.ts:191] [E: infra/stats.ts:193] [E: infra/stats.ts:194]。

## Gotcha

- `packages/stats/server/src/stat-sync.ts` 是 daemon entrypoint，每小时 repeat `syncStats()`；`packages/stats/server/src/server.ts` 是 ingest HTTP server，两者同包但不同 command [E: packages/stats/server/src/stat-sync.ts:7] [E: packages/stats/server/src/stat-sync.ts:16] [E: packages/stats/server/src/server.ts:6] [E: packages/stats/server/src/server.ts:7] [E: packages/stats/server/src/server.ts:20] [E: packages/stats/server/src/server.ts:23] [E: packages/stats/server/src/server.ts:28]。
- `packages/stats/server/Dockerfile` 默认 CMD 是 `bun src/server.ts`，但 SST sync service 覆盖 command 为 `bun src/stat-sync.ts` [E: packages/stats/server/Dockerfile:32] [E: infra/stats.ts:191]。
- `README.md` 的 `function` 子包名称与当前目录不一致；以 `packages/stats/server/` 和 infra command 为准 [E: packages/stats/README.md:9] [E: packages/stats/server/package.json:8] [E: infra/stats.ts:189]。

## Sources

- `packages/stats/README.md`
- `packages/stats/core/package.json`
- `packages/stats/server/package.json`
- `packages/stats/app/package.json`
- `packages/stats/core/src/database/schema.ts`
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
- `infra/stats.ts`
- `sst.config.ts`

## 相关

- `infra.sst`：Stats 的 AWS/Cloudflare/PlanetScale resources 都由 SST 装配；本节点覆盖 Stats package 本身和关键 infra edge。
