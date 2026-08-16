---
id: clients.console
title: Console(SolidStart 计费/管理)
kind: subsystem
tier: T2
v: na
source:
  - packages/console/app/package.json
  - packages/console/app/vite.config.ts
  - packages/console/app/src/app.tsx
  - packages/console/app/src/context/auth.ts
  - packages/console/app/src/routes/stripe/webhook.ts
  - packages/console/app/src/routes/zen/util/handler.ts
  - packages/console/app/src/routes/zen/go/v1/usage.ts
  - packages/console/core/package.json
  - packages/console/core/src/drizzle/index.ts
  - packages/console/core/src/schema/billing.sql.ts
  - packages/console/core/src/schema/referral.sql.ts
  - packages/console/core/src/referral.ts
  - packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql
  - packages/console/app/src/routes/zen/util/provider/google.ts
  - packages/console/app/test/providerUsage.test.ts
  - packages/console/core/src/schema/workspace.sql.ts
  - packages/console/core/src/billing.ts
  - infra/console.ts
symbols:
  - Billing
  - Database
  - WorkspaceTable
  - handler
related:
  - server.sharing
  - infra.sst
evidence: explicit
status: verified
updated: 3fd77ae980
---

> Console 是 opencode 的 hosted 管理和计费 surface: `packages/console/app` 是 SolidStart/Nitro Cloudflare app, `packages/console/core` 封装 PlanetScale/Drizzle、Stripe billing、workspace/user/provider 等业务数据。

## 能回答的问题

- Console 和 coding agent runtime 有什么关系?
- Console 的前端和 server runtime 用什么框架?
- OpenAuth session、Actor 和 workspace user 是怎样接上的?
- Billing/Stripe webhook 写入哪些 Drizzle table?
- Go usage endpoint 返回什么 shape，如何鉴权?
- Console 如何通过 SST 连接 PlanetScale、Stripe、Upstash、Honeycomb 等资源?

## 职责边界

Console 是 hosted product/control-plane surface, 不是 V1/V2 terminal agent loop。`@opencode-ai/console-app` 依赖 SolidStart、Nitro、OpenAuth、Stripe JS、Upstash Redis 和 `@opencode-ai/console-core` [E: packages/console/app/package.json:18] [E: packages/console/app/package.json:19] [E: packages/console/app/package.json:27] [E: packages/console/app/package.json:28] [E: packages/console/app/package.json:29] [E: packages/console/app/package.json:31]。`@opencode-ai/console-core` 依赖 PlanetScale、Drizzle ORM、Stripe、postgres 和 Zod, 表明计费/数据逻辑在 core 包内 [E: packages/console/core/package.json:13] [E: packages/console/core/package.json:15] [E: packages/console/core/package.json:16] [E: packages/console/core/package.json:17] [E: packages/console/core/package.json:19]。

V1/V2 关系: Console 节点标 `v: na`, 因为它不运行 V1 `SessionPrompt.runLoop` 或 V2 `SessionRunner`; 它通过 hosted APIs、billing、workspace 管理影响产品面 [I]。

## 技术栈

- SolidStart 文件路由: app root import `Router` 和 `FileRoutes`, 并在 default `App` 里渲染 `FileRoutes` [E: packages/console/app/src/app.tsx:2] [E: packages/console/app/src/app.tsx:3] [E: packages/console/app/src/app.tsx:25] [E: packages/console/app/src/app.tsx:41]。
- Nitro Cloudflare module preset: Vite config 同时安装 `solidStart` middleware 和 `nitro({ preset: "cloudflare-module", cloudflare.nodeCompat: true })` [E: packages/console/app/vite.config.ts:7] [E: packages/console/app/vite.config.ts:8] [E: packages/console/app/vite.config.ts:10] [E: packages/console/app/vite.config.ts:12] [E: packages/console/app/vite.config.ts:14]。
- PlanetScale + Drizzle: `Database.client` 用 `@planetscale/database` Client, host/username/password 来自 SST `Resource.Database`, 再传给 `drizzle` [E: packages/console/core/src/drizzle/index.ts:1] [E: packages/console/core/src/drizzle/index.ts:4] [E: packages/console/core/src/drizzle/index.ts:20] [E: packages/console/core/src/drizzle/index.ts:21] [E: packages/console/core/src/drizzle/index.ts:22] [E: packages/console/core/src/drizzle/index.ts:23] [E: packages/console/core/src/drizzle/index.ts:25]。
- Stripe billing: `Billing.stripe()` 使用 `Resource.STRIPE_SECRET_KEY` 创建 Stripe client, API version 是 `2025-03-31.basil` [E: packages/console/core/src/billing.ts:29] [E: packages/console/core/src/billing.ts:30] [E: packages/console/core/src/billing.ts:31]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/console/app/src/app.tsx` | App shell。安装 `LanguageProvider`, `I18nProvider`, `MetaProvider`, Suspense 和 `FileRoutes` [E: packages/console/app/src/app.tsx:31] [E: packages/console/app/src/app.tsx:32] [E: packages/console/app/src/app.tsx:33] [E: packages/console/app/src/app.tsx:35] [E: packages/console/app/src/app.tsx:41]。 |
| `packages/console/app/src/context/auth.ts` | OpenAuth client 和 SolidStart session。`AuthClient` 使用 `VITE_AUTH_URL`, `useAuthSession()` 使用 `Resource.ZEN_SESSION_SECRET`, `getActor()` 解析 public/account/user actor [E: packages/console/app/src/context/auth.ts:9] [E: packages/console/app/src/context/auth.ts:11] [E: packages/console/app/src/context/auth.ts:28] [E: packages/console/app/src/context/auth.ts:30] [E: packages/console/app/src/context/auth.ts:40] [E: packages/console/app/src/context/auth.ts:73] [E: packages/console/app/src/context/auth.ts:102]。 |
| `packages/console/app/src/routes/stripe/webhook.ts` | Stripe webhook endpoint。验证 `stripe-signature`, 处理 checkout、customer、subscription、invoice 等事件 [E: packages/console/app/src/routes/stripe/webhook.ts:14] [E: packages/console/app/src/routes/stripe/webhook.ts:15] [E: packages/console/app/src/routes/stripe/webhook.ts:17] [E: packages/console/app/src/routes/stripe/webhook.ts:23] [E: packages/console/app/src/routes/stripe/webhook.ts:46] [E: packages/console/app/src/routes/stripe/webhook.ts:108] [E: packages/console/app/src/routes/stripe/webhook.ts:209]。 |
| `packages/console/core/src/drizzle/index.ts` | Database context 和 transaction helper。`Database.use` 自动选择当前 transaction context 或 root client [E: packages/console/core/src/drizzle/index.ts:31] [E: packages/console/core/src/drizzle/index.ts:36] [E: packages/console/core/src/drizzle/index.ts:38] [E: packages/console/core/src/drizzle/index.ts:69]。 |
| `packages/console/core/src/schema/billing.sql.ts` | Billing schema。定义 `billing`, `subscription`, `lite`, `payment`, `usage`, `coupon` tables [E: packages/console/core/src/schema/billing.sql.ts:17] [E: packages/console/core/src/schema/billing.sql.ts:59] [E: packages/console/core/src/schema/billing.sql.ts:73] [E: packages/console/core/src/schema/billing.sql.ts:89] [E: packages/console/core/src/schema/billing.sql.ts:113] [E: packages/console/core/src/schema/billing.sql.ts:144]。 |
| `packages/console/app/src/routes/zen/go/v1/usage.ts` | Go usage HTTP GET。Bearer API key 读 `LiteTable` rolling/weekly/monthly，返回简化 `usage` JSON。 |

## 数据模型

`WorkspaceTable` 是 workspace root table, 主键是 ULID `id`, 有可选 `slug`、必填 `name`、region，以及 nullable `is_blocked`、`is_flagged_by_anthropic`、`is_flagged_by_openai` moderation flags；workspace-scoped tables 复用 `workspaceIndexes(table)` 生成 `(workspaceID, id)` primary key。[E: packages/console/core/src/schema/workspace.sql.ts:4] [E: packages/console/core/src/schema/workspace.sql.ts:7] [E: packages/console/core/src/schema/workspace.sql.ts:8] [E: packages/console/core/src/schema/workspace.sql.ts:9] [E: packages/console/core/src/schema/workspace.sql.ts:10] [E: packages/console/core/src/schema/workspace.sql.ts:11] [E: packages/console/core/src/schema/workspace.sql.ts:12] [E: packages/console/core/src/schema/workspace.sql.ts:13] [E: packages/console/core/src/schema/workspace.sql.ts:19] [E: packages/console/core/src/schema/workspace.sql.ts:22]。

`BillingTable` 包含 customer/payment method、balance、monthly usage、reload、subscription 和 lite subscription 等字段 [E: packages/console/core/src/schema/billing.sql.ts:22] [E: packages/console/core/src/schema/billing.sql.ts:23] [E: packages/console/core/src/schema/billing.sql.ts:26] [E: packages/console/core/src/schema/billing.sql.ts:28] [E: packages/console/core/src/schema/billing.sql.ts:30] [E: packages/console/core/src/schema/billing.sql.ts:36] [E: packages/console/core/src/schema/billing.sql.ts:47]。`UsageTable` 记录 model/provider、tokens、cost、keyID、sessionID 和 plan enrichment [E: packages/console/core/src/schema/billing.sql.ts:113] [E: packages/console/core/src/schema/billing.sql.ts:118] [E: packages/console/core/src/schema/billing.sql.ts:119] [E: packages/console/core/src/schema/billing.sql.ts:120] [E: packages/console/core/src/schema/billing.sql.ts:121] [E: packages/console/core/src/schema/billing.sql.ts:122] [E: packages/console/core/src/schema/billing.sql.ts:123] [E: packages/console/core/src/schema/billing.sql.ts:124] [E: packages/console/core/src/schema/billing.sql.ts:125] [E: packages/console/core/src/schema/billing.sql.ts:126] [E: packages/console/core/src/schema/billing.sql.ts:127] [E: packages/console/core/src/schema/billing.sql.ts:128] [E: packages/console/core/src/schema/billing.sql.ts:129]。

当前 Drizzle schema 里 `BillingTable` 除 `workspaceIndexes` 外只有 `global_customer_id` 与 `global_subscription_id` 两个 unique index；`liteSubscriptionID` 字段存在，但 schema 没有声明 `lite_subscription_id` unique。[E: packages/console/core/src/schema/billing.sql.ts:47][E: packages/console/core/src/schema/billing.sql.ts:53][E: packages/console/core/src/schema/billing.sql.ts:54][E: packages/console/core/src/schema/billing.sql.ts:55] `ReferralRewardTable` 主键是 `(workspaceID, referralID)`，没有单独的 `referral_id` secondary index。[E: packages/console/core/src/schema/referral.sql.ts:25][E: packages/console/core/src/schema/referral.sql.ts:34] 仓库仍保留 `20260803084635_married_misty_knight/migration.sql`，内容是给 `billing.lite_subscription_id` 建 unique、给 `referral_reward.referral_id` 建普通 index；这只是仓内 SQL 文本，不能证明任一远端 database 已经应用，也不能覆盖当前 schema 未声明这两条 index 的事实。[E: packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql:1][E: packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql:2][I]

`Actor.Info` 由 `getActor()` 返回 public/account/user 三类。无登录 session 时返回 `type: "public"`, 有 account session 时返回 account actor, workspace 参数存在且匹配 `UserTable` 时返回 user actor [E: packages/console/app/src/context/auth.ts:40] [E: packages/console/app/src/context/auth.ts:47] [E: packages/console/app/src/context/auth.ts:51] [E: packages/console/app/src/context/auth.ts:73] [E: packages/console/app/src/context/auth.ts:80] [E: packages/console/app/src/context/auth.ts:95] [E: packages/console/app/src/context/auth.ts:102]。

## 控制流

1. HTTP request 进入 SolidStart app, `App` 的 router 使用 `FileRoutes`, route 文件定义页面/API endpoint [E: packages/console/app/src/app.tsx:27] [E: packages/console/app/src/app.tsx:41]。
2. 需要身份的 server function 调用 `getActor(workspace?)`。`getActor` 先从 request locals 复用 actor, 再读 `useAuthSession()` session [E: packages/console/app/src/context/auth.ts:40] [E: packages/console/app/src/context/auth.ts:42] [E: packages/console/app/src/context/auth.ts:44] [E: packages/console/app/src/context/auth.ts:46]。
3. workspace actor 解析查询 `UserTable`, 条件是 workspaceID、未删除、accountID in session accounts, 找到后更新 `timeSeen` [E: packages/console/app/src/context/auth.ts:78] [E: packages/console/app/src/context/auth.ts:80] [E: packages/console/app/src/context/auth.ts:86] [E: packages/console/app/src/context/auth.ts:87] [E: packages/console/app/src/context/auth.ts:88] [E: packages/console/app/src/context/auth.ts:95] [E: packages/console/app/src/context/auth.ts:99]。
4. Zen `authenticate()` 查询 API key 时把三个 moderation columns 投影成 workspace flags；`isBlocked` 拒绝所有 model，Anthropic flag 只拒绝 `claude-*`，OpenAI flag 只拒绝 `gpt-*`，命中后抛出 `requestBlockedByUpstreamProvider` 的 `AuthError`。[E: packages/console/app/src/routes/zen/util/handler.ts:704][E: packages/console/app/src/routes/zen/util/handler.ts:711][E: packages/console/app/src/routes/zen/util/handler.ts:712][E: packages/console/app/src/routes/zen/util/handler.ts:713][E: packages/console/app/src/routes/zen/util/handler.ts:788][E: packages/console/app/src/routes/zen/util/handler.ts:790][E: packages/console/app/src/routes/zen/util/handler.ts:791][E: packages/console/app/src/routes/zen/util/handler.ts:792][E: packages/console/app/src/routes/zen/util/handler.ts:794]
5. Stripe webhook POST 先用 Stripe secret 验证事件, 再按事件类型分支处理 [E: packages/console/app/src/routes/stripe/webhook.ts:14] [E: packages/console/app/src/routes/stripe/webhook.ts:15] [E: packages/console/app/src/routes/stripe/webhook.ts:18] [E: packages/console/app/src/routes/stripe/webhook.ts:23]。
6. `checkout.session.completed` payment 分支检查 workspace/customer/payment/invoice metadata, 然后在 `Actor.provide("system", { workspaceID })` 内更新 billing balance 和插入 payment record [E: packages/console/app/src/routes/stripe/webhook.ts:46] [E: packages/console/app/src/routes/stripe/webhook.ts:47] [E: packages/console/app/src/routes/stripe/webhook.ts:53] [E: packages/console/app/src/routes/stripe/webhook.ts:54] [E: packages/console/app/src/routes/stripe/webhook.ts:55] [E: packages/console/app/src/routes/stripe/webhook.ts:56] [E: packages/console/app/src/routes/stripe/webhook.ts:57] [E: packages/console/app/src/routes/stripe/webhook.ts:59] [E: packages/console/app/src/routes/stripe/webhook.ts:79] [E: packages/console/app/src/routes/stripe/webhook.ts:97]。
7. `Billing.reload()` 读取当前 workspace billing customer/payment method, 创建 invoice 和 invoice items, finalize 并 off-session pay [E: packages/console/core/src/billing.ts:75] [E: packages/console/core/src/billing.ts:76] [E: packages/console/core/src/billing.ts:79] [E: packages/console/core/src/billing.ts:80] [E: packages/console/core/src/billing.ts:91] [E: packages/console/core/src/billing.ts:102] [E: packages/console/core/src/billing.ts:109] [E: packages/console/core/src/billing.ts:116] [E: packages/console/core/src/billing.ts:117]。
8. `Referral.summary()` 并行查询当前 workspace 的 `ReferralRewardTable` history、`ReferralTable` invites、当前 account 作为 invitee 的 referral，以及 invitee 侧 rewards。`rewardReferralIDs` / `inviteeRewardReferralIDs` 用来从 pending 列表里排除已经有 reward row 的 referral；pending 再与 persisted rewards 合并按 `timeCreated` 倒序返回。[E: packages/console/core/src/referral.ts:57][E: packages/console/core/src/referral.ts:62][E: packages/console/core/src/referral.ts:125][E: packages/console/core/src/referral.ts:126][E: packages/console/core/src/referral.ts:139][E: packages/console/core/src/referral.ts:151][E: packages/console/core/src/referral.ts:165][E: packages/console/core/src/referral.ts:172]
9. Go usage endpoint 是 SolidStart `GET` `packages/console/app/src/routes/zen/go/v1/usage.ts`。它从 `Authorization: Bearer` 取 API key，join `KeyTable`/`UserTable`/`WorkspaceTable`/`BillingTable`；缺 key 或未授权返回 401 `AuthError`。找到 key 后再读该 user 的 `LiteTable` row，没有 Go/lite row 返回 403 `EntitlementError`。[E: packages/console/app/src/routes/zen/go/v1/usage.ts:10][E: packages/console/app/src/routes/zen/go/v1/usage.ts:11][E: packages/console/app/src/routes/zen/go/v1/usage.ts:31][E: packages/console/app/src/routes/zen/go/v1/usage.ts:55][E: packages/console/app/src/routes/zen/go/v1/usage.ts:73][E: packages/console/app/src/routes/zen/go/v1/usage.ts:95][E: packages/console/app/src/routes/zen/go/v1/usage.ts:100]
10. 成功响应只返回 `{ usage: { rolling, weekly, monthly } }`。每个 window 经 `Subscription.analyze*Usage` 后再 `formatUsage`，字段是 `status`、`percent`、`resetsAt` ISO timestamp，不再回传 raw token/limit。[E: packages/console/app/src/routes/zen/go/v1/usage.ts:115][E: packages/console/app/src/routes/zen/go/v1/usage.ts:117][E: packages/console/app/src/routes/zen/go/v1/usage.ts:152][E: packages/console/app/src/routes/zen/go/v1/usage.ts:154]
11. Google provider usage normalization 把 `thoughtsTokenCount` 单列为 reasoning tokens，同时令 `outputTokens = candidatesTokenCount + reasoningTokens`。[E: packages/console/app/src/routes/zen/util/provider/google.ts:61][E: packages/console/app/src/routes/zen/util/provider/google.ts:64][E: packages/console/app/src/routes/zen/util/provider/google.ts:68][E: packages/console/app/src/routes/zen/util/provider/google.ts:69] cost calculator 只按 inclusive `outputTokens` 计算 output cost，logger 与 UsageTable 仍分别保存 output/reasoning。[E: packages/console/app/src/routes/zen/util/handler.ts:1031][E: packages/console/app/src/routes/zen/util/handler.ts:1032][E: packages/console/app/src/routes/zen/util/handler.ts:1045][E: packages/console/app/src/routes/zen/util/handler.ts:1090][E: packages/console/app/src/routes/zen/util/handler.ts:1092][E: packages/console/app/src/routes/zen/util/handler.ts:1093][E: packages/console/app/src/routes/zen/util/handler.ts:1128][E: packages/console/app/src/routes/zen/util/handler.ts:1136][E: packages/console/app/src/routes/zen/util/handler.ts:1137]

## 设计动机与权衡

Console 把 hosted billing/account/workspace 逻辑从 terminal agent runtime 分离, 但通过 shared UI 和 cloud resources 与产品面相连 [I]。SST 把 `packages/console/app` 部署成 Cloudflare SolidStart resource, link 了 buckets、database、Upstash、auth URL、Stripe secrets、Honeycomb webhook、SES/Salesforce secrets 和 pricing linkables [E: infra/console.ts:248] [E: infra/console.ts:250] [E: infra/console.ts:252] [E: infra/console.ts:254] [E: infra/console.ts:255] [E: infra/console.ts:256] [E: infra/console.ts:257] [E: infra/console.ts:258] [E: infra/console.ts:261] [E: infra/console.ts:262] [E: infra/console.ts:264] [E: infra/console.ts:265] [E: infra/console.ts:266] [E: infra/console.ts:267] [E: infra/console.ts:268] [E: infra/console.ts:269] [E: infra/console.ts:270] [E: infra/console.ts:272]。PlanetScale database resource 由 `infra/console.ts` 生成 `sst.Linkable("Database")`, Console core 通过 `Resource.Database` 读取 host/username/password [E: infra/console.ts:36] [E: infra/console.ts:38] [E: infra/console.ts:40] [E: infra/console.ts:41] [E: packages/console/core/src/drizzle/index.ts:21] [E: packages/console/core/src/drizzle/index.ts:22] [E: packages/console/core/src/drizzle/index.ts:23]。

## Gotcha

- Console 的 `@opencode-ai/console-core` 使用 PlanetScale serverless driver [E: packages/console/core/src/drizzle/index.ts:1], 它不是 opencode V2 SQLite database [I]。
- Console app 的 `build` script 还会调用 `packages/opencode/script/schema.ts` 生成 `config.json` 和 `tui.json`, 这是 Web artifact 的 schema 输出, 不代表 Console 跑 terminal agent [E: packages/console/app/package.json:10] [I]。
- 仓内 migration SQL 仍写 `global_lite_subscription_id` / `referral_id` index，但当前 Drizzle schema 未声明这两条；`Referral.summary()` 已真正查询 reward/invite rows。Wiki 只能描述仓库源码，不能确认 production migration state。[E: packages/console/core/src/schema/billing.sql.ts:54][E: packages/console/core/src/schema/referral.sql.ts:34][E: packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql:1][E: packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql:2][E: packages/console/core/src/referral.ts:62][I]
- Google normalizer 已把 reasoning 包进 `outputTokens`，但 generic trial limiter 仍把 `outputTokens + reasoningTokens` 再相加，Stats `buildTokenCost` 也用 `outputTokens + reasoningTokens` 做 output cost-per-million。对 Google usage 这可能二次计算 thoughts，契约是否应改仍未确认。[E: packages/console/app/src/routes/zen/util/provider/google.ts:68][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:31][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:33][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:34][E: packages/stats/core/src/domain/home.ts:647][U]
- provider usage test 仍期待 Google `candidates=3, thoughts=2` 得到 `outputTokens=3`，与 target implementation 返回 5 不一致；这是当前源码/测试定义张力，不是已验证通过的行为。[E: packages/console/app/test/providerUsage.test.ts:21][E: packages/console/app/test/providerUsage.test.ts:22][E: packages/console/app/test/providerUsage.test.ts:27][E: packages/console/app/test/providerUsage.test.ts:29][E: packages/console/app/src/routes/zen/util/provider/google.ts:68][U]

## Sources

- `packages/console/app/package.json`
- `packages/console/app/vite.config.ts`
- `packages/console/app/src/app.tsx`
- `packages/console/app/src/context/auth.ts`
- `packages/console/app/src/routes/stripe/webhook.ts`
- `packages/console/app/src/routes/zen/util/handler.ts`
- `packages/console/app/src/routes/zen/go/v1/usage.ts`
- `packages/console/core/package.json`
- `packages/console/core/src/drizzle/index.ts`
- `packages/console/core/src/schema/billing.sql.ts`
- `packages/console/core/src/schema/referral.sql.ts`
- `packages/console/core/src/referral.ts`
- `packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql`
- `packages/console/app/src/routes/zen/util/provider/google.ts`
- `packages/console/app/test/providerUsage.test.ts`
- `packages/console/core/src/schema/workspace.sql.ts`
- `packages/console/core/src/billing.ts`
- `infra/console.ts`

## 相关

- [会话分享](../server/sharing.md)
- [SST 云基础设施(Cloudflare/AWS)](../infra/sst.md)
