---
id: infra.sst
title: SST 云基础设施(Cloudflare/AWS)
kind: subsystem
tier: T2
v: na
source:
  - package.json
  - sst.config.ts
  - infra/app.ts
  - infra/console.ts
  - infra/lake.ts
  - infra/stage.ts
  - infra/stats.ts
  - infra/enterprise.ts
  - infra/monitoring.ts
  - infra/secret.ts
symbols:
  - $config
  - api
  - database
  - lakeIngest
  - stat
related:
  - clients.console
  - peripheral.function
evidence: explicit
status: verified
updated: 355a0bcf5
---

> SST 云基础设施节点描述 opencode 的 hosted surfaces: Cloudflare Workers/R2/KV/SolidStart/Astro, PlanetScale/Stripe/Honeycomb providers, 以及只在指定 stage 部署的 AWS data lake 与 stats services。

## 能回答的问题

- `sst.config.ts` 如何选择 stage、provider 和 infra module?
- `infra/app.ts` 部署哪些 Cloudflare front door 资源?
- Console 的 PlanetScale、OpenAuth、Stripe、worker 和 SolidStart 如何装配?
- AWS lake 使用哪些 S3 Tables、Glue、Athena、Firehose、ECS Service 资源?
- Honeycomb alerts 何时启用?

## 职责边界

SST 层是 hosted service infrastructure, 不是 terminal agent kernel。`sst.config.ts` 把 app 名设为 `opencode`, production removal 策略为 `retain`, production stage 受保护, `home` provider 是 Cloudflare [E: sst.config.ts:6] [E: sst.config.ts:7] [E: sst.config.ts:8] [E: sst.config.ts:9]。provider 列表同时配置 AWS、Stripe、random、PlanetScale、Honeycomb, AWS region 固定 `us-east-1` [E: sst.config.ts:11] [E: sst.config.ts:13] [E: sst.config.ts:20] [E: sst.config.ts:24] [E: sst.config.ts:25] [E: sst.config.ts:26]。

V1/V2 关系: SST 资源为 Web docs、Web app、Console、share/backend function、stats/lake 提供 hosted runtime, 不直接决定 V1 或 V2 session execution。Cloudflare Worker `Api` 指向 `packages/function/src/api.ts`, 这个 Worker 属于分享/外围后端, 不是本地 CLI server [E: infra/app.ts:13] [E: infra/app.ts:15] [I]。

## 技术栈

- SST v4 config: root catalog pin `sst` 版本, `sst.config.ts` 使用 `$config({ app, run })` [E: package.json:80] [E: sst.config.ts:3]。
- Cloudflare-first surfaces: `Api` Worker、R2 Bucket、Astro docs、StaticSite app、AuthApi Worker、Console SolidStart、Stat Worker、Enterprise SolidStart 都是 `sst.cloudflare.*` 资源 [E: infra/app.ts:11] [E: infra/app.ts:13] [E: infra/app.ts:52] [E: infra/app.ts:62] [E: infra/console.ts:63] [E: infra/console.ts:248] [E: infra/console.ts:302] [E: infra/enterprise.ts:6]。
- AWS data lake: lake module 使用 S3 Tables, Glue catalog, S3 buckets, Athena workgroup, IAM, Firehose, SST AWS VPC/Cluster/Service [E: infra/lake.ts:16] [E: infra/lake.ts:21] [E: infra/lake.ts:54] [E: infra/lake.ts:64] [E: infra/lake.ts:76] [E: infra/lake.ts:156] [E: infra/lake.ts:194] [E: infra/lake.ts:214]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `sst.config.ts` | SST app entry。按 stage 决定 AWS module 是否加载, 导入 app/console/enterprise/monitoring, 输出 StatWorkerUrl/LakeUrl/AwsStage 等 [E: sst.config.ts:30] [E: sst.config.ts:33] [E: sst.config.ts:35] [E: sst.config.ts:36] [E: sst.config.ts:37] [E: sst.config.ts:41]。 |
| `infra/stage.ts` | stage-derived domain。production 用 `opencode.ai`, dev 用 `dev.opencode.ai`, 其它 stage 用 `<stage>.dev.opencode.ai`; `deployAws` 只在 `$app.stage === awsStage` 时为 true [E: infra/stage.ts:1] [E: infra/stage.ts:2] [E: infra/stage.ts:3] [E: infra/stage.ts:4] [E: infra/stage.ts:8] [E: infra/stage.ts:9]。 |
| `infra/app.ts` | public Cloudflare app front door。创建 API Worker、Durable Object namespace binding、docs Astro、WebApp StaticSite [E: infra/app.ts:13] [E: infra/app.ts:37] [E: infra/app.ts:42] [E: infra/app.ts:52] [E: infra/app.ts:62]。 |
| `infra/console.ts` | Console infra。创建 PlanetScale branch/password Linkable, Auth Worker, Stripe webhook/products/prices, LogProcessor Worker, Console SolidStart, Stat Worker [E: infra/console.ts:11] [E: infra/console.ts:29] [E: infra/console.ts:36] [E: infra/console.ts:63] [E: infra/console.ts:74] [E: infra/console.ts:142] [E: infra/console.ts:243] [E: infra/console.ts:248] [E: infra/console.ts:302]。 |
| `infra/lake.ts` | AWS lake foundation。创建 S3 Tables bucket, Glue federated catalog, Athena results bucket/workgroup, Firehose Iceberg delivery, ingest ECS service, lake Linkables and query permissions [E: infra/lake.ts:16] [E: infra/lake.ts:21] [E: infra/lake.ts:64] [E: infra/lake.ts:156] [E: infra/lake.ts:214] [E: infra/lake.ts:270] [E: infra/lake.ts:277]。 |
| `infra/stats.ts` | stats app and sync. 定义 `inference.event` Iceberg table, Stats PlanetScale database, Stats SolidStart app, `StatsSyncService` ECS service [E: infra/stats.ts:9] [E: infra/stats.ts:14] [E: infra/stats.ts:105] [E: infra/stats.ts:135] [E: infra/stats.ts:162] [E: infra/stats.ts:182]。 |
| `infra/monitoring.ts` | Honeycomb alerts. 只由 config 在 production 或 `vimtor` stage 导入, 内部用 Discord webhook recipient 和 triggers 监控 model/provider HTTP errors、TPS、free tier request spike [E: sst.config.ts:37] [E: infra/monitoring.ts:7] [E: infra/monitoring.ts:160] [E: infra/monitoring.ts:200] [E: infra/monitoring.ts:240] [E: infra/monitoring.ts:260]。 |

## 数据模型

Stage model 由 `infra/stage.ts` 集中计算。`domain` 和 `shortDomain` 分别服务主站域名和 Enterprise Teams 域名, `awsStage` 把非 production stage 映射到 `dev`, `deployAws` 限制 AWS-heavy module 只在匹配 stage 部署 [E: infra/stage.ts:1] [E: infra/stage.ts:8] [E: infra/stage.ts:9] [E: infra/stage.ts:17]。

Linkable 是跨资源配置模型。Console database Linkable 暴露 host/database/username/password/port [E: infra/console.ts:36] [E: infra/console.ts:38] [E: infra/console.ts:39] [E: infra/console.ts:40] [E: infra/console.ts:41] [E: infra/console.ts:42]。Lake ingest Linkable 暴露 ingest service URL 和 secret [E: infra/lake.ts:270] [E: infra/lake.ts:272] [E: infra/lake.ts:273]。Secret 模块还把 random password 包装成 Linkable property, 并集中声明 R2、Honeycomb、Upstash secrets [E: infra/secret.ts:1] [E: infra/secret.ts:7] [E: infra/secret.ts:10] [E: infra/secret.ts:12]。

## 控制流

1. `sst.config.ts` app phase 设置 stage protection、Cloudflare home、AWS/Stripe/PlanetScale/Honeycomb providers [E: sst.config.ts:3] [E: sst.config.ts:8] [E: sst.config.ts:9] [E: sst.config.ts:10]。
2. run phase 先 import `infra/stage.js` 和 `infra/app.js`, 再按 `stage.deployAws` 条件 import `infra/lake.js` 与 `infra/stats.js` [E: sst.config.ts:31] [E: sst.config.ts:32] [E: sst.config.ts:33] [E: sst.config.ts:34]。
3. run phase 总是 import Console 并取出 `stat`, 总是 import Enterprise, production 或 `vimtor` 时 import Monitoring [E: sst.config.ts:35] [E: sst.config.ts:36] [E: sst.config.ts:37]。
4. `infra/app.ts` 的 API Worker 绑定 R2 bucket、GitHub app secrets、admin secret、Discord/Feishu secrets, 并在 transform 中加 `SYNC_SERVER` Durable Object namespace 与 migrations [E: infra/app.ts:20] [E: infra/app.ts:21] [E: infra/app.ts:22] [E: infra/app.ts:24] [E: infra/app.ts:37] [E: infra/app.ts:42]。
5. Console module 为 production stage 读取 production PlanetScale branch, 其它 stage 创建从 production 分支派生的 branch [E: infra/console.ts:16] [E: infra/console.ts:18] [E: infra/console.ts:23] [E: infra/console.ts:27]。
6. Lake module 的 Firehose destination 是 Iceberg, metadata extraction query 从 record 中读取 `_lake_database`, `_lake_table`, `_lake_operation` [E: infra/lake.ts:156] [E: infra/lake.ts:160] [E: infra/lake.ts:170] [E: infra/lake.ts:176]。
7. Stats module 把 `StatsSyncService` 放进 lake cluster, 运行 `bun src/stat-sync.ts`, 链接 database、inferenceEvent、dataset config, 并使用 lake query permissions [E: infra/stats.ts:182] [E: infra/stats.ts:191] [E: infra/stats.ts:192] [E: infra/stats.ts:193]。

## 设计动机与权衡

SST config 把 Cloudflare 作为 home provider, 但把数据湖和 batch sync 放在 AWS, 这反映出 request/edge surfaces 与 analytics/storage surfaces 的部署边界不同 [E: sst.config.ts:9] [E: infra/app.ts:13] [E: infra/lake.ts:214] [I]。`deployAws` 限制 AWS-heavy resources 只在 production 或 `dev` 这种 canonical AWS stage 部署, 可以避免为每个临时 Cloudflare stage 都创建完整 lake/stats AWS stack [E: infra/stage.ts:8] [E: infra/stage.ts:9] [E: sst.config.ts:33] [I]。

## Gotcha

- 两个 HTTP server 的实现细节属于 server 节点; SST 的 `Api` Worker 是 Cloudflare backend, 不等同于 V1 `packages/opencode/src/server` 或 V2 `@opencode-ai/server` 本地 HTTP server [E: infra/app.ts:15] [I]。
- `infra/app.ts` 中 Durable Object binding 名叫 `SYNC_SERVER`, 这是 Cloudflare resource binding, 不代表 V1 legacy Bus 服务仍存在 [E: infra/app.ts:37] [I]。
- `infra/monitoring.ts` 在非 production/vimtor stage 不由 `sst.config.ts` 导入, 但文件内部也用 `$app.stage !== "production"` 禁用 alerts [E: sst.config.ts:37] [E: infra/monitoring.ts:5]。

## Sources

- `package.json`
- `sst.config.ts`
- `infra/app.ts`
- `infra/console.ts`
- `infra/lake.ts`
- `infra/stage.ts`
- `infra/stats.ts`
- `infra/enterprise.ts`
- `infra/monitoring.ts`
- `infra/secret.ts`

## 相关

- [Console(SolidStart 计费/管理)](../clients/console.md)
- [Cloud Function(CF Worker 分享后端)](../peripheral/function.md)
