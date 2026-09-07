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
  - packages/console/app/src/middleware.ts
  - packages/console/app/src/lib/server-action.ts
  - packages/console/app/src/lib/lite-usage.ts
  - packages/console/app/src/lib/request-country.ts
  - packages/console/app/src/lib/inference-proxy.ts
  - packages/console/app/src/routes/api/support/actions/reset-quota.ts
  - packages/console/app/src/routes/stripe/webhook.ts
  - packages/console/app/src/routes/zen/util/handler.ts
  - packages/console/app/src/routes/zen/util/requestBody.ts
  - packages/console/app/src/routes/zen/util/pricing.ts
  - packages/console/app/src/routes/zen/util/redis.ts
  - packages/console/app/src/routes/zen/util/trainingConsent.ts
  - packages/console/app/src/routes/zen/go/v1/usage.ts
  - packages/console/app/src/routes/zen/v1/models.ts
  - packages/console/app/src/routes/workspace/common.tsx
  - packages/console/function/src/auth-redirect.ts
  - packages/console/function/src/auth.ts
  - packages/console/core/package.json
  - packages/console/core/src/drizzle/index.ts
  - packages/console/core/src/schema/billing.sql.ts
  - packages/console/core/src/schema/referral.sql.ts
  - packages/console/core/src/schema/workspace.sql.ts
  - packages/console/core/src/quota.ts
  - packages/console/core/src/model.ts
  - packages/console/core/src/referral.ts
  - packages/console/core/src/billing.ts
  - packages/console/app/src/routes/zen/util/provider/openai.ts
  - packages/console/app/src/routes/api/enterprise.ts
  - packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql
  - packages/console/core/migrations/20260901161032_workspace_migrated_at/migration.sql
  - packages/console/app/src/routes/zen/util/provider/google.ts
  - packages/console/app/src/routes/zen/util/trialLimiter.ts
  - packages/console/app/test/providerUsage.test.ts
  - infra/console.ts
symbols:
  - Billing
  - Database
  - WorkspaceTable
  - handler
  - prepareRequestBody
  - isPeakPricing
  - isAllowedAuthorizationRedirect
  - sanitizeServerActionRequest
  - proxyInference
  - Quota
  - requiresGoTrainingConsent
related:
  - server.sharing
  - infra.sst
evidence: explicit
status: verified
updated: e207624c48
---

> Console 是 opencode 的 hosted 管理和计费 surface: `packages/console/app` 是 SolidStart/Nitro Cloudflare app, `packages/console/core` 封装 PlanetScale/Drizzle、Stripe billing、workspace/user/provider 等业务数据。

## 能回答的问题

- Console 和 coding agent runtime 有什么关系?
- Workspace `migrated_at` 如何把 Zen inference 转发到新 Console?
- Quota.reset 如何清零 lite/subscription 计数，support 路由用什么鉴权?
- Zen 如何流式转发 request body，还有没有 3-way failover / 429 retry?
- DeepSeek 峰时定价、Go coupon 与 checkout 限流怎样工作?
- Auth redirect allowlist 与 server-action referer sanitize 规则是什么?
- Muse Spark 的 geo / training policy 如何拒绝请求?
- `cost200K.threshold` 与 OpenAI usage 归一化如何影响计费？
- Billing/Stripe webhook 写入哪些 Drizzle table?

## 职责边界

Console 是 hosted product/control-plane surface, 不是 V1/V2 terminal agent loop。`@opencode-ai/console-app` 依赖 SolidStart、Nitro、OpenAuth、Stripe JS、Upstash Redis 和 `@opencode-ai/console-core` [E: packages/console/app/package.json:18] [E: packages/console/app/package.json:19] [E: packages/console/app/package.json:27] [E: packages/console/app/package.json:28] [E: packages/console/app/package.json:29] [E: packages/console/app/package.json:31]。`@opencode-ai/console-core` 依赖 PlanetScale、Drizzle ORM、Stripe、postgres 和 Zod, 表明计费/数据逻辑在 core 包内 [E: packages/console/core/package.json:13] [E: packages/console/core/package.json:15] [E: packages/console/core/package.json:16] [E: packages/console/core/package.json:17] [E: packages/console/core/package.json:19]。

V1/V2 关系: Console 节点标 `v: na`, 因为它不运行 V1 `SessionPrompt.runLoop` 或 V2 `SessionRunner`; 它通过 hosted APIs、billing、workspace 管理影响产品面 [I]。

`packages/console/app/src/routes/black/subscribe/[plan].tsx` 已从源树删除；Black subscribe 页不再作为 Console 路由存在。

这不是 zen/go live 模型菜单。模型 id 来自外部 catalog；wiki 只记录源码里写死的 contributor id、政策门控与 proxy 路径，不把营销文档里的模型名写成硬编码 live catalog。[I]

## 技术栈

- SolidStart 文件路由: app root import `Router` 和 `FileRoutes`, 并在 default `App` 里渲染 `FileRoutes` [E: packages/console/app/src/app.tsx:2] [E: packages/console/app/src/app.tsx:3] [E: packages/console/app/src/app.tsx:25] [E: packages/console/app/src/app.tsx:41]。
- Nitro Cloudflare module preset: Vite config 同时安装 `solidStart` middleware 和 `nitro({ preset: "cloudflare-module", cloudflare.nodeCompat: true })` [E: packages/console/app/vite.config.ts:7] [E: packages/console/app/vite.config.ts:8] [E: packages/console/app/vite.config.ts:10] [E: packages/console/app/vite.config.ts:12] [E: packages/console/app/vite.config.ts:14]。
- PlanetScale + Drizzle: `Database.client` 用 `@planetscale/database` Client, host/username/password 来自 SST `Resource.Database`, 再传给 `drizzle` [E: packages/console/core/src/drizzle/index.ts:1] [E: packages/console/core/src/drizzle/index.ts:4] [E: packages/console/core/src/drizzle/index.ts:20] [E: packages/console/core/src/drizzle/index.ts:21] [E: packages/console/core/src/drizzle/index.ts:22] [E: packages/console/core/src/drizzle/index.ts:23] [E: packages/console/core/src/drizzle/index.ts:25]。
- Stripe billing: `Billing.stripe()` 使用 `Resource.STRIPE_SECRET_KEY` 创建 Stripe client, API version 是 `2025-03-31.basil` [E: packages/console/core/src/billing.ts:29] [E: packages/console/core/src/billing.ts:30] [E: packages/console/core/src/billing.ts:31]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/console/app/src/app.tsx` | App shell。安装 `LanguageProvider`, `I18nProvider`, `MetaProvider`, Suspense 和 `FileRoutes` [E: packages/console/app/src/app.tsx:31] [E: packages/console/app/src/app.tsx:32] [E: packages/console/app/src/app.tsx:33] [E: packages/console/app/src/app.tsx:35] [E: packages/console/app/src/app.tsx:41]。 |
| `packages/console/app/src/context/auth.ts` | OpenAuth client 和 SolidStart session。`AuthClient` 使用 `VITE_AUTH_URL`, `useAuthSession()` 使用 `Resource.ZEN_SESSION_SECRET`, `getActor()` 解析 public/account/user actor；workspace 已 `migratedAt` 时 302/303 到新 Console [E: packages/console/app/src/context/auth.ts:10] [E: packages/console/app/src/context/auth.ts:12] [E: packages/console/app/src/context/auth.ts:31] [E: packages/console/app/src/context/auth.ts:41] [E: packages/console/app/src/context/auth.ts:104]。 |
| `packages/console/app/src/lib/inference-proxy.ts` | Zen full-catalog inference 转发。无 `migratedAt` 返回 `undefined`，让本地 `handler` 继续。 |
| `packages/console/core/src/quota.ts` | `Quota.reset` 把 lite/subscription 用量计数清零，不动时间戳。 |
| `packages/console/app/src/routes/api/support/actions/reset-quota.ts` | Support POST。`Bearer SUPPORT_API_KEY` 鉴权后调 `Quota.reset`。 |
| `packages/console/app/src/routes/zen/util/trainingConsent.ts` | `requiresGoTrainingConsent` 只认两个 contributor id。 |
| `packages/console/app/src/routes/zen/util/requestBody.ts` | Zen 增量扫顶层 `"model"`，再把剩余 body 以 `ReadableStream` 上流。 |
| `packages/console/app/src/routes/zen/util/pricing.ts` | DeepSeek CST 工作日峰时判定。 |
| `packages/console/function/src/auth-redirect.ts` | OAuth `redirect_uri` allowlist。 |
| `packages/console/app/src/lib/server-action.ts` | `/_server` referer sanitize。 |
| `packages/console/app/src/routes/stripe/webhook.ts` | Stripe webhook endpoint。验证 `stripe-signature`, 处理 checkout、customer、subscription、invoice 等事件 [E: packages/console/app/src/routes/stripe/webhook.ts:14] [E: packages/console/app/src/routes/stripe/webhook.ts:15] [E: packages/console/app/src/routes/stripe/webhook.ts:17]。 |
| `packages/console/core/src/schema/billing.sql.ts` | Billing schema。定义 `billing`, `subscription`, `lite`, `payment`, `usage`, `coupon` tables [E: packages/console/core/src/schema/billing.sql.ts:17] [E: packages/console/core/src/schema/billing.sql.ts:60] [E: packages/console/core/src/schema/billing.sql.ts:74] [E: packages/console/core/src/schema/billing.sql.ts:90] [E: packages/console/core/src/schema/billing.sql.ts:114] [E: packages/console/core/src/schema/billing.sql.ts:146]。 |
| `packages/console/app/src/routes/zen/go/v1/usage.ts` | Go usage HTTP GET。Bearer API key 读 `LiteTable` rolling/weekly/monthly，返回简化 `usage` JSON。 |

## 数据模型

`WorkspaceTable` 是 workspace root table, 主键是 ULID `id`, 有可选 `slug`、必填 `name`、region，以及 nullable `allow_training`、`is_blocked`、`is_flagged_by_anthropic`、`is_flagged_by_openai`、`migrated_at`；workspace-scoped tables 复用 `workspaceIndexes(table)` 生成 `(workspaceID, id)` primary key。[E: packages/console/core/src/schema/workspace.sql.ts:4] [E: packages/console/core/src/schema/workspace.sql.ts:7] [E: packages/console/core/src/schema/workspace.sql.ts:8] [E: packages/console/core/src/schema/workspace.sql.ts:9] [E: packages/console/core/src/schema/workspace.sql.ts:10] [E: packages/console/core/src/schema/workspace.sql.ts:11] [E: packages/console/core/src/schema/workspace.sql.ts:12] [E: packages/console/core/src/schema/workspace.sql.ts:13] [E: packages/console/core/src/schema/workspace.sql.ts:14] [E: packages/console/core/src/schema/workspace.sql.ts:15] [E: packages/console/core/src/schema/workspace.sql.ts:21] [E: packages/console/core/src/schema/workspace.sql.ts:24]。仓内 migration `20260901161032_workspace_migrated_at` 只写 `ALTER TABLE workspace ADD migrated_at timestamp(3)`；存在不等于任一远端 database 已 apply。[E: packages/console/core/migrations/20260901161032_workspace_migrated_at/migration.sql:1][I]

`BillingTable` 包含 customer/payment method、balance、monthly usage、reload、subscription 和 lite subscription 等字段 [E: packages/console/core/src/schema/billing.sql.ts:22] [E: packages/console/core/src/schema/billing.sql.ts:23] [E: packages/console/core/src/schema/billing.sql.ts:26] [E: packages/console/core/src/schema/billing.sql.ts:28] [E: packages/console/core/src/schema/billing.sql.ts:30] [E: packages/console/core/src/schema/billing.sql.ts:36] [E: packages/console/core/src/schema/billing.sql.ts:47]。当前 Drizzle schema 除 `workspaceIndexes` 外声明 `global_customer_id`、`global_subscription_id`、`global_lite_subscription_id` 三个 unique index。[E: packages/console/core/src/schema/billing.sql.ts:54][E: packages/console/core/src/schema/billing.sql.ts:55][E: packages/console/core/src/schema/billing.sql.ts:56] `ReferralRewardTable` 主键是 `(workspaceID, referralID)`，另有 `referral_id` secondary index。[E: packages/console/core/src/schema/referral.sql.ts:25][E: packages/console/core/src/schema/referral.sql.ts:34][E: packages/console/core/src/schema/referral.sql.ts:36] 仓内仍保留 `20260803084635_married_misty_knight/migration.sql`；这只是仓内 SQL 文本，不能证明任一远端 database 已经应用。[E: packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql:1][I]

`UsageTable` 记录 model/provider、tokens、cost、keyID、sessionID 和 plan enrichment [E: packages/console/core/src/schema/billing.sql.ts:114] [E: packages/console/core/src/schema/billing.sql.ts:118] [E: packages/console/core/src/schema/billing.sql.ts:119] [E: packages/console/core/src/schema/billing.sql.ts:120] [E: packages/console/core/src/schema/billing.sql.ts:127] [E: packages/console/core/src/schema/billing.sql.ts:128] [E: packages/console/core/src/schema/billing.sql.ts:129]。

`Actor.Info` 由 `getActor()` 返回 public/account/user 三类。无登录 session 时返回 `type: "public"`, 有 account session 时返回 account actor, workspace 参数存在且匹配 `UserTable` 时返回 user actor [E: packages/console/app/src/context/auth.ts:41] [E: packages/console/app/src/context/auth.ts:48] [E: packages/console/app/src/context/auth.ts:74] [E: packages/console/app/src/context/auth.ts:81] [E: packages/console/app/src/context/auth.ts:103] [E: packages/console/app/src/context/auth.ts:119]。workspace 行带 `migratedAt` 时不回 user actor，而是 `redirect` 到 `Resource.ConsoleMigration.consoleUrl/login`（GET/HEAD 用 302，其它方法 303）。[E: packages/console/app/src/context/auth.ts:104][E: packages/console/app/src/context/auth.ts:105][E: packages/console/app/src/context/auth.ts:108]

## Workspace 迁移与 inference proxy

`proxyInference()` 只在 Zen `handler` 的 `modelList === "full"` 且已解析到 `model` 时调用，且在 rate-limit / validate / auth 之前。它先从 catalog entry 取出 `byokProvider` 与对应 native model，再把已读 body 的 replay stream 交给 proxy。[E: packages/console/app/src/routes/zen/util/handler.ts:105][E: packages/console/app/src/routes/zen/util/handler.ts:111] 转发失败返回 503 `Inference routing is unavailable. Please retry later.`。[E: packages/console/app/src/routes/zen/util/handler.ts:118][E: packages/console/app/src/routes/zen/util/handler.ts:119] 有 `Response` 就直接 return，不再跑本地 handler。[E: packages/console/app/src/routes/zen/util/handler.ts:122]

路径映射：固定 POST `/zen/v1/chat/completions` → `/openai/v1/chat/completions`、`/zen/v1/responses` → `/openai/v1/responses`、`/zen/v1/messages` → `/anthropic/v1/messages`；Google 则把 `/zen/v1/models/…:(generateContent|streamGenerateContent)` 改写成 `/google/v1beta/models/…`。对不上返回 `undefined`。[E: packages/console/app/src/lib/inference-proxy.ts:7][E: packages/console/app/src/lib/inference-proxy.ts:24][E: packages/console/app/src/lib/inference-proxy.ts:29] 缺 key 或 key 为 `"public"` 也返回 `undefined`。[E: packages/console/app/src/lib/inference-proxy.ts:36]

workspace 查询把 `WorkspaceTable.migrated_at` 投影成 `migratedAt`，并在传入 `generation.provider` 时 left-join 未删除且 `credentials` 非空的 `ProviderTable`。[E: packages/console/app/src/lib/inference-proxy.ts:43][E: packages/console/app/src/lib/inference-proxy.ts:48] **没有 `migratedAt` 返回 `undefined`，继续本地 handler。**[E: packages/console/app/src/lib/inference-proxy.ts:63]

有 `migratedAt` 后：已绑 BYOK provider 时必须带 native model，否则抛 `Legacy BYOK model mapping is unavailable`；目标 path 是 `/custom/conn_${workspace.id.slice(4)}_${provider}` 再接 Google `:method` suffix 或 `/zen/v1` 之后的原 pathname。[E: packages/console/app/src/lib/inference-proxy.ts:64][E: packages/console/app/src/lib/inference-proxy.ts:65][E: packages/console/app/src/lib/inference-proxy.ts:70] 未绑 BYOK 则走上面的 zen native path（`/openai/…`、`/anthropic/…`、`/google/…`）。[E: packages/console/app/src/lib/inference-proxy.ts:75] destination 来自 `Resource.ConsoleMigration.inferenceUrl`。[E: packages/console/app/src/lib/inference-proxy.ts:67]

Zen `GET /zen/v1/models` 同样：workspace 有 `migratedAt` 才把请求转到 `${inferenceUrl}/v1/models`；否则本地列 catalog。[E: packages/console/app/src/routes/zen/v1/models.ts:53][E: packages/console/app/src/routes/zen/v1/models.ts:60][E: packages/console/app/src/routes/zen/v1/models.ts:62]

SST 只在 `production` / `dev` 填 migration domain：`consoleUrl` 是 `https://{domain}/console`，`inferenceUrl` 是 `https://{domain}/inference`；其它 stage 是空字符串。[E: infra/console.ts:225][E: infra/console.ts:227][E: infra/console.ts:229][E: infra/console.ts:230]

## Quota reset

`Quota.reset({ workspaceID, plan })` 的 `plan` 只能是 `lite` 或 `subscription`。[E: packages/console/core/src/quota.ts:13][E: packages/console/core/src/quota.ts:16] lite 把未删除 `LiteTable` 的 `rollingUsage` / `weeklyUsage` / `monthlyUsage` 写成 `0`；subscription 把未删除 `SubscriptionTable` 的 `rollingUsage` / `fixedUsage` 写成 `0`。[E: packages/console/core/src/quota.ts:32][E: packages/console/core/src/quota.ts:52] `set()` 只含计数，不含 `timeRollingUpdated` 等时间戳；故意保留当前 window stamp，让下一笔用量从零累加。[E: packages/console/core/src/quota.ts:32] 找不到 row 分别抛 `No lite usage counters found for workspace` / `No subscription usage counters found for workspace`。[E: packages/console/core/src/quota.ts:30][E: packages/console/core/src/quota.ts:50]

Support 路由 `POST /api/support/actions/reset-quota` 用 `safeEqual` 比较 `Authorization` 与 `Bearer ${Resource.SUPPORT_API_KEY.value}`，失败 401。[E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:12][E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:13] body 是 `{ workspaceID: wrk_…, plan: lite|subscription }`；成功调 `Quota.reset` 并回 `{ success: true, message: "Usage counters reset to zero", result }`。[E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:8][E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:21]

## Zen request body 与单次上游

`prepareRequestBody()` 增量读 request `ReadableStream`，在 depth=1 扫顶层 JSON string key `"model"`，记录 UTF-8 字节区间；找到后停止缓冲，把已读 chunks 里的 model 换成 provider model，再 `passthrough` 剩余 bytes。[E: packages/console/app/src/routes/zen/util/requestBody.ts:4][E: packages/console/app/src/routes/zen/util/requestBody.ts:19][E: packages/console/app/src/routes/zen/util/requestBody.ts:30][E: packages/console/app/src/routes/zen/util/requestBody.ts:94][E: packages/console/app/src/routes/zen/util/requestBody.ts:99] Google format 不走这条路径，直接把原始 body 上流。[E: packages/console/app/src/routes/zen/util/handler.ts:97][E: packages/console/app/src/routes/zen/util/handler.ts:98]

上流 `fetch` 使用 `duplex: "half"`，并把 caller `signal` 传给上游，避免 Console 断开后留下 orphaned inference。[E: packages/console/app/src/routes/zen/util/handler.ts:268][E: packages/console/app/src/routes/zen/util/handler.ts:271] 是否 stream 看上游响应 `content-type` 是否包含 `text/event-stream`。[E: packages/console/app/src/routes/zen/util/handler.ts:273]

`providerRequest()` 只调用一次；没有最多 3 次 provider failover，也没有对 429/529 的自动 retry。429/529（以及 400/404）只是被当成非流式 JSON 读一次并记账。[E: packages/console/app/src/routes/zen/util/handler.ts:296][E: packages/console/app/src/routes/zen/util/handler.ts:315]

## DeepSeek 峰时定价、coupon、checkout

`isPeakPricing(date)` 把时间加 8 小时后用 `getUTCDay()`/`getUTCHours()` 当 CST：CST 周六/周日一律 false；CST 工作日只在 9–12 与 14–18（左闭右开）为 true。不是 UTC 周末判定——UTC 周日 16:00 已是 CST 周一，会按工作日算。[E: packages/console/app/src/routes/zen/util/pricing.ts:1][E: packages/console/app/src/routes/zen/util/pricing.ts:6][E: packages/console/app/src/routes/zen/util/pricing.ts:8][E: packages/console/app/src/routes/zen/util/pricing.ts:10] `calculateCost` 在 `modelInfo.costPeak` 且当前为峰时时改用 peak 价；否则若存在 `cost200K` 且 `inputTokens + cacheRead + cacheWrite5m + cacheWrite1h > cost200K.threshold`（schema 默认 `200_000`）则改用 long-context 档，再否则用 `modelInfo.cost`。[E: packages/console/app/src/routes/zen/util/handler.ts:1023][E: packages/console/app/src/routes/zen/util/handler.ts:1025][E: packages/console/app/src/routes/zen/util/handler.ts:1027][E: packages/console/core/src/model.ts:25]

OpenAI `normalizeUsage` 把 `inputTokens` 写成 `max(0, input_tokens - cached_tokens - cache_write_tokens)`：上游 `input_tokens` 已含 cache 分量，cache 另按自己的费率计费，钳到 0 避免重叠 detail 把 input 成本打成负数。[E: packages/console/app/src/routes/zen/util/provider/openai.ts:57]

非 anonymous 记账先拍一张 `trackedAt = new Date()`，再用它算 week/month bounds 并写回 `time*Updated`。subscription `fixedUsage`：`timeFixedUpdated >= week.end` 时不加（请求跨过窗口边界不累加）；已在本周则累加；否则重置为本次 cost。lite 的 monthly/weekly 同样用 `>= period.end` 冻结计数。[E: packages/console/app/src/routes/zen/util/handler.ts:1103][E: packages/console/app/src/routes/zen/util/handler.ts:1152][E: packages/console/app/src/routes/zen/util/handler.ts:1196]

Enterprise 询盘邮件的 `to` 是 `Resource.ENTERPRISE_SALES_INBOX_EMAIL.value`，不是硬编码 inbox 地址。[E: packages/console/app/src/routes/api/enterprise.ts:101]

Go checkout 选 coupon 时只认未兑换的 `GO12MONTHS100` / `GO6MONTHS100` / `GO3MONTHS100` / `GOFREEMONTH`。`GO1MONTH50`（首月 50%）不再进入 checkout `discounts`。[E: packages/console/core/src/billing.ts:322][E: packages/console/core/src/billing.ts:323][E: packages/console/core/src/billing.ts:329][E: packages/console/core/src/billing.ts:331] webhook 读的是 `metadata.coupon`，若等于 `LiteData.firstMonth50Coupon`（SST `ZEN_LITE_PRICE.firstMonth50Coupon`）会记 `GO1MONTH50`；不是名为 `firstMonth50Coupon` 的 metadata 键。`redeemCoupon("GO1MONTH50")` 不再校验/发放新折扣，只写 coupon row。[E: packages/console/app/src/routes/stripe/webhook.ts:114][E: packages/console/app/src/routes/stripe/webhook.ts:164][E: packages/console/core/src/billing.ts:181][E: packages/console/core/src/billing.ts:196] `CouponType` 枚举仍保留该字面量，不代表仍在售。[E: packages/console/core/src/schema/billing.sql.ts:140]

`checkCheckoutRateLimit(accountID)` 对 Redis key `stage:ratelimit:checkout:${accountID}` `INCR`，首次设 3600s TTL，`count > 5` 抛错。这是每账户每小时 5 次 checkout，不是 5 秒窗口。[E: packages/console/app/src/routes/zen/util/redis.ts:20][E: packages/console/app/src/routes/zen/util/redis.ts:22][E: packages/console/app/src/routes/zen/util/redis.ts:24][E: packages/console/app/src/routes/zen/util/redis.ts:25] workspace `createCheckoutUrl` 与 Go lite checkout 都先走这道限流。[E: packages/console/app/src/routes/workspace/common.tsx:81]

`buildLiteUsageBreakdown()` 按 `(model, multiplier)` 聚合 usage sources，再把贡献百分比摊到一位小数，供 Go limits UI 使用。[E: packages/console/app/src/lib/lite-usage.ts:20][E: packages/console/app/src/lib/lite-usage.ts:24][E: packages/console/app/src/lib/lite-usage.ts:55]

## Auth redirect 与 server-action referer

`isAllowedAuthorizationRedirect(clientID, redirectURI)` 只接受 `clientID === "app"`。localhost / `127.0.0.1` 允许 `http:` 或 `https:`；其它 host 必须 `https:` 且 hostname 是 `opencode.ai` 或 `*.opencode.ai`（`endsWith(".opencode.ai")`，因此 `opencode.ai.evil.example` 会被拒）。[E: packages/console/function/src/auth-redirect.ts:1][E: packages/console/function/src/auth-redirect.ts:2][E: packages/console/function/src/auth-redirect.ts:11][E: packages/console/function/src/auth-redirect.ts:14] issuer `/authorize` 与 OpenAuth `allow` 都调用它。[E: packages/console/function/src/auth.ts:50][E: packages/console/function/src/auth.ts:117]

`sanitizeServerActionRequest()` 只处理 pathname `/_server`。referer 缺、不可 parse、或 origin 不等于 request origin 时，把 referer 改成 request origin。[E: packages/console/app/src/lib/server-action.ts:1][E: packages/console/app/src/lib/server-action.ts:5][E: packages/console/app/src/lib/server-action.ts:6][E: packages/console/app/src/lib/server-action.ts:9] SolidStart middleware `onRequest` 最先调用它。[E: packages/console/app/src/middleware.ts:8]

## Muse Spark geo 与 training policy

`isModelCountryRestricted()` 对 `muse-spark-1.3-contributor`、`muse-spark-1.3-contributor-free`、`muse-spark-1.2-contributor`、`muse-spark-1.2-contributor-free` 生效；country 来自 CF `cf.country` 或 `cf-ipcountry`，命中 22 国集合则拒。[E: packages/console/app/src/lib/request-country.ts:32][E: packages/console/app/src/lib/request-country.ts:35][E: packages/console/app/src/lib/request-country.ts:41] handler 在 validate model 后立刻检查，抛 `RegionError`。[E: packages/console/app/src/routes/zen/util/handler.ts:137][E: packages/console/app/src/routes/zen/util/handler.ts:138]

`requiresGoTrainingConsent(model)` **只**认 `muse-spark-1.3-contributor` 与 `muse-spark-1.2-contributor`；`-free` / preview 变体返回 false。[E: packages/console/app/src/routes/zen/util/trainingConsent.ts:2] lite catalog 上命中该函数且 workspace `allowTraining` 为假时抛 `DataPolicyError`。[E: packages/console/app/src/routes/zen/util/handler.ts:146][E: packages/console/app/src/routes/zen/util/handler.ts:147] `authenticate()` 把 `WorkspaceTable.allow_training` 投影成 `allowTraining`。[E: packages/console/app/src/routes/zen/util/handler.ts:703][E: packages/console/app/src/routes/zen/util/handler.ts:816]

## 控制流

1. HTTP request 进入 SolidStart app, `App` 的 router 使用 `FileRoutes`, route 文件定义页面/API endpoint [E: packages/console/app/src/app.tsx:27] [E: packages/console/app/src/app.tsx:41]。
2. 需要身份的 server function 调用 `getActor(workspace?)`。`getActor` 先从 request locals 复用 actor, 再读 `useAuthSession()` session [E: packages/console/app/src/context/auth.ts:41] [E: packages/console/app/src/context/auth.ts:45] [E: packages/console/app/src/context/auth.ts:47]。
3. workspace actor 解析查询 `UserTable` 并 join `WorkspaceTable`。已 `migratedAt` 则 redirect 新 Console；否则更新 `timeSeen` 并回 user actor [E: packages/console/app/src/context/auth.ts:81] [E: packages/console/app/src/context/auth.ts:91] [E: packages/console/app/src/context/auth.ts:104] [E: packages/console/app/src/context/auth.ts:116]。
4. Zen full-catalog `handler` 先 `proxyInference`；有响应就结束。无 `migratedAt` / 无 path / 无 key 时继续本地 validate → geo → auth。[E: packages/console/app/src/routes/zen/util/handler.ts:111][E: packages/console/app/src/routes/zen/util/handler.ts:122]
5. Zen `authenticate()` 查询 API key 时把 `allow_training` 与三个 moderation columns 投影成 workspace flags；`isBlocked` 拒绝所有 model，Anthropic flag 只拒绝 `claude-*`，OpenAI flag 只拒绝 `gpt-*`，命中后抛出 `requestBlockedByUpstreamProvider` 的 `AuthError`。[E: packages/console/app/src/routes/zen/util/handler.ts:703][E: packages/console/app/src/routes/zen/util/handler.ts:704][E: packages/console/app/src/routes/zen/util/handler.ts:705][E: packages/console/app/src/routes/zen/util/handler.ts:706][E: packages/console/app/src/routes/zen/util/handler.ts:783][E: packages/console/app/src/routes/zen/util/handler.ts:784][E: packages/console/app/src/routes/zen/util/handler.ts:785][E: packages/console/app/src/routes/zen/util/handler.ts:787]
6. Stripe webhook POST 先用 Stripe secret 验证事件, 再按事件类型分支处理 [E: packages/console/app/src/routes/stripe/webhook.ts:14] [E: packages/console/app/src/routes/stripe/webhook.ts:15] [E: packages/console/app/src/routes/stripe/webhook.ts:17]。
7. `Billing.reload()` 读取当前 workspace billing customer/payment method, 创建 invoice 和 invoice items, finalize 并 off-session pay [E: packages/console/core/src/billing.ts:75] [E: packages/console/core/src/billing.ts:76]。
8. `Referral.summary()` 并行查询当前 workspace 的 `ReferralRewardTable` history、`ReferralTable` invites、当前 account 作为 invitee 的 referral，以及 invitee 侧 rewards。[E: packages/console/core/src/referral.ts:57][E: packages/console/core/src/referral.ts:62]
9. Go usage endpoint 是 SolidStart `GET` `packages/console/app/src/routes/zen/go/v1/usage.ts`。它从 `Authorization: Bearer` 取 API key；缺 key 返回 401 `AuthError`。找到 key 后再读该 user 的 `LiteTable` row，没有 Go/lite row 返回 403 `EntitlementError`。[E: packages/console/app/src/routes/zen/go/v1/usage.ts:10][E: packages/console/app/src/routes/zen/go/v1/usage.ts:11][E: packages/console/app/src/routes/zen/go/v1/usage.ts:31][E: packages/console/app/src/routes/zen/go/v1/usage.ts:95][E: packages/console/app/src/routes/zen/go/v1/usage.ts:100]
10. 成功响应只返回 `{ usage: { rolling, weekly, monthly } }`。每个 window 经 `Subscription.analyze*Usage` 后再 `formatUsage`，字段是 `status`、`percent`、`resetsAt` ISO timestamp，不再回传 raw token/limit。[E: packages/console/app/src/routes/zen/go/v1/usage.ts:115][E: packages/console/app/src/routes/zen/go/v1/usage.ts:117][E: packages/console/app/src/routes/zen/go/v1/usage.ts:152][E: packages/console/app/src/routes/zen/go/v1/usage.ts:154]
11. Google provider usage normalization 把 `thoughtsTokenCount` 单列为 reasoning tokens，同时令 `outputTokens = candidatesTokenCount + reasoningTokens`。[E: packages/console/app/src/routes/zen/util/provider/google.ts:61][E: packages/console/app/src/routes/zen/util/provider/google.ts:64][E: packages/console/app/src/routes/zen/util/provider/google.ts:68][E: packages/console/app/src/routes/zen/util/provider/google.ts:69]
12. Support `POST /api/support/actions/reset-quota` 校验 `SUPPORT_API_KEY` 后调用 `Quota.reset`，只清计数。[E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:13][E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:21]

## 设计动机与权衡

Console 把 hosted billing/account/workspace 逻辑从 terminal agent runtime 分离, 但通过 shared UI 和 cloud resources 与产品面相连 [I]。SST 把 `packages/console/app` 部署成 Cloudflare SolidStart resource, link 了 buckets、database、Upstash、auth URL、`ConsoleMigration`、Stripe secrets、`SUPPORT_API_KEY`、Honeycomb webhook、SES/Salesforce secrets 和 pricing linkables [E: infra/console.ts:258] [E: infra/console.ts:262] [E: infra/console.ts:264] [E: infra/console.ts:265] [E: infra/console.ts:267] [E: infra/console.ts:268] [E: infra/console.ts:269] [E: infra/console.ts:270] [E: infra/console.ts:273] [E: infra/console.ts:274] [E: infra/console.ts:276] [E: infra/console.ts:277] [E: infra/console.ts:278] [E: infra/console.ts:279] [E: infra/console.ts:280] [E: infra/console.ts:281] [E: infra/console.ts:282]。PlanetScale database resource 由 `infra/console.ts` 生成 `sst.Linkable("Database")`, Console core 通过 `Resource.Database` 读取 host/username/password [E: infra/console.ts:36] [E: infra/console.ts:38] [E: infra/console.ts:40] [E: infra/console.ts:41] [E: packages/console/core/src/drizzle/index.ts:21] [E: packages/console/core/src/drizzle/index.ts:22] [E: packages/console/core/src/drizzle/index.ts:23]。

## Gotcha

- Console 的 `@opencode-ai/console-core` 使用 PlanetScale serverless driver [E: packages/console/core/src/drizzle/index.ts:1], 它不是 opencode V2 SQLite database [I]。
- Console app 的 `build` script 还会调用 `packages/opencode/script/schema.ts` 生成 `config.json` 和 `tui.json`, 这是 Web artifact 的 schema 输出, 不代表 Console 跑 terminal agent [E: packages/console/app/package.json:10] [I]。
- 仓内 migration SQL 与当前 Drizzle schema 都写了 `global_lite_subscription_id` / `referral_id` / `migrated_at`；wiki 只能描述仓库源码，不能确认 production migration state。[E: packages/console/core/src/schema/billing.sql.ts:56][E: packages/console/core/src/schema/referral.sql.ts:36][E: packages/console/core/src/schema/workspace.sql.ts:15][E: packages/console/core/migrations/20260901161032_workspace_migrated_at/migration.sql:1][I]
- Google normalizer 已把 reasoning 包进 `outputTokens`，但 generic trial limiter 仍把 `outputTokens + reasoningTokens` 再相加，Stats `buildTokenCost` 也用 `outputTokens + reasoningTokens` 做 output cost-per-million。对 Google usage 这可能二次计算 thoughts，契约是否应改仍未确认。[E: packages/console/app/src/routes/zen/util/provider/google.ts:68][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:31][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:33][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:34][E: packages/stats/core/src/domain/home.ts:743][U]
- `proxyInference` 只覆盖 Zen full catalog，不覆盖 Go/lite `modelList`。[E: packages/console/app/src/routes/zen/util/handler.ts:105]
- `requiresGoTrainingConsent` 不含 `-free` 变体；geo block 则包含 1.2/1.3 的 contributor 与 contributor-free。[E: packages/console/app/src/routes/zen/util/trainingConsent.ts:2][E: packages/console/app/src/lib/request-country.ts:35]

## Sources

- `packages/console/app/package.json`
- `packages/console/app/vite.config.ts`
- `packages/console/app/src/app.tsx`
- `packages/console/app/src/context/auth.ts`
- `packages/console/app/src/middleware.ts`
- `packages/console/app/src/lib/server-action.ts`
- `packages/console/app/src/lib/lite-usage.ts`
- `packages/console/app/src/lib/request-country.ts`
- `packages/console/app/src/lib/inference-proxy.ts`
- `packages/console/app/src/routes/api/support/actions/reset-quota.ts`
- `packages/console/app/src/routes/stripe/webhook.ts`
- `packages/console/app/src/routes/zen/util/handler.ts`
- `packages/console/app/src/routes/zen/util/requestBody.ts`
- `packages/console/app/src/routes/zen/util/pricing.ts`
- `packages/console/app/src/routes/zen/util/redis.ts`
- `packages/console/app/src/routes/zen/util/trainingConsent.ts`
- `packages/console/app/src/routes/zen/go/v1/usage.ts`
- `packages/console/app/src/routes/zen/v1/models.ts`
- `packages/console/app/src/routes/workspace/common.tsx`
- `packages/console/function/src/auth-redirect.ts`
- `packages/console/function/src/auth.ts`
- `packages/console/core/package.json`
- `packages/console/core/src/drizzle/index.ts`
- `packages/console/core/src/schema/billing.sql.ts`
- `packages/console/core/src/schema/referral.sql.ts`
- `packages/console/core/src/schema/workspace.sql.ts`
- `packages/console/core/src/quota.ts`
- `packages/console/core/src/model.ts`
- `packages/console/core/src/referral.ts`
- `packages/console/core/src/billing.ts`
- `packages/console/app/src/routes/zen/util/provider/openai.ts`
- `packages/console/app/src/routes/api/enterprise.ts`
- `packages/console/core/migrations/20260803084635_married_misty_knight/migration.sql`
- `packages/console/core/migrations/20260901161032_workspace_migrated_at/migration.sql`
- `packages/console/app/src/routes/zen/util/provider/google.ts`
- `packages/console/app/src/routes/zen/util/trialLimiter.ts`
- `packages/console/app/test/providerUsage.test.ts`
- `infra/console.ts`

## 相关

- [会话分享](../server/sharing.md)
- [SST 云基础设施(Cloudflare/AWS)](../infra/sst.md)
