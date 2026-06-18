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
  - packages/console/core/package.json
  - packages/console/core/src/drizzle/index.ts
  - packages/console/core/src/schema/billing.sql.ts
  - packages/console/core/src/schema/workspace.sql.ts
  - packages/console/core/src/billing.ts
  - infra/console.ts
related:
  - server.sharing
  - infra.sst
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Console 是 opencode 的 hosted 管理和计费 surface: `packages/console/app` 是 SolidStart/Nitro Cloudflare app, `packages/console/core` 封装 PlanetScale/Drizzle、Stripe billing、workspace/user/provider 等业务数据。

## 能回答的问题

- Console 和 coding agent runtime 有什么关系?
- Console 的前端和 server runtime 用什么框架?
- OpenAuth session、Actor 和 workspace user 是怎样接上的?
- Billing/Stripe webhook 写入哪些 Drizzle table?
- Console 如何通过 SST 连接 PlanetScale、Stripe、Upstash、Honeycomb 等资源?

## 职责边界

Console 是 hosted product/control-plane surface, 不是 V1/V2 terminal agent loop。`@opencode-ai/console-app` 依赖 SolidStart、Nitro、OpenAuth、Stripe JS、Upstash Redis 和 `@opencode-ai/console-core` [E: packages/console/app/package.json:18] [E: packages/console/app/package.json:19] [E: packages/console/app/package.json:27] [E: packages/console/app/package.json:28] [E: packages/console/app/package.json:29] [E: packages/console/app/package.json:31]。`@opencode-ai/console-core` 依赖 PlanetScale、Drizzle ORM、Stripe、postgres 和 Zod, 表明计费/数据逻辑在 core 包内 [E: packages/console/core/package.json:13] [E: packages/console/core/package.json:15] [E: packages/console/core/package.json:17] [E: packages/console/core/package.json:19]。

V1/V2 关系: Console 节点标 `v: na`, 因为它不运行 V1 `SessionPrompt.runLoop` 或 V2 `SessionRunner`; 它通过 hosted APIs、billing、workspace 管理影响产品面 [I]。

## 技术栈

- SolidStart 文件路由: app root import `Router` 和 `FileRoutes`, 并在 default `App` 里渲染 `FileRoutes` [E: packages/console/app/src/app.tsx:2] [E: packages/console/app/src/app.tsx:3] [E: packages/console/app/src/app.tsx:41]。
- Nitro Cloudflare module preset: Vite config 同时安装 `solidStart` middleware 和 `nitro({ preset: "cloudflare-module", cloudflare.nodeCompat: true })` [E: packages/console/app/vite.config.ts:7] [E: packages/console/app/vite.config.ts:10] [E: packages/console/app/vite.config.ts:12] [E: packages/console/app/vite.config.ts:14]。
- PlanetScale + Drizzle: `Database.client` 用 `@planetscale/database` Client, host/username/password 来自 SST `Resource.Database`, 再传给 `drizzle` [E: packages/console/core/src/drizzle/index.ts:1] [E: packages/console/core/src/drizzle/index.ts:4] [E: packages/console/core/src/drizzle/index.ts:21] [E: packages/console/core/src/drizzle/index.ts:22] [E: packages/console/core/src/drizzle/index.ts:23] [E: packages/console/core/src/drizzle/index.ts:25]。
- Stripe billing: `Billing.stripe()` 使用 `Resource.STRIPE_SECRET_KEY` 创建 Stripe client, API version 是 `2025-03-31.basil` [E: packages/console/core/src/billing.ts:29] [E: packages/console/core/src/billing.ts:30] [E: packages/console/core/src/billing.ts:31]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/console/app/src/app.tsx` | App shell。安装 `LanguageProvider`, `I18nProvider`, `MetaProvider`, Suspense 和 `FileRoutes` [E: packages/console/app/src/app.tsx:31] [E: packages/console/app/src/app.tsx:33] [E: packages/console/app/src/app.tsx:35] [E: packages/console/app/src/app.tsx:41]。 |
| `packages/console/app/src/context/auth.ts` | OpenAuth client 和 SolidStart session。`AuthClient` 使用 `VITE_AUTH_URL`, `useAuthSession()` 使用 `Resource.ZEN_SESSION_SECRET`, `getActor()` 解析 public/account/user actor [E: packages/console/app/src/context/auth.ts:11] [E: packages/console/app/src/context/auth.ts:30] [E: packages/console/app/src/context/auth.ts:40] [E: packages/console/app/src/context/auth.ts:73] [E: packages/console/app/src/context/auth.ts:102]。 |
| `packages/console/app/src/routes/stripe/webhook.ts` | Stripe webhook endpoint。验证 `stripe-signature`, 处理 checkout、customer、subscription、invoice 等事件 [E: packages/console/app/src/routes/stripe/webhook.ts:14] [E: packages/console/app/src/routes/stripe/webhook.ts:17] [E: packages/console/app/src/routes/stripe/webhook.ts:23] [E: packages/console/app/src/routes/stripe/webhook.ts:46] [E: packages/console/app/src/routes/stripe/webhook.ts:108] [E: packages/console/app/src/routes/stripe/webhook.ts:209]。 |
| `packages/console/core/src/drizzle/index.ts` | Database context 和 transaction helper。`Database.use` 自动选择当前 transaction context 或 root client [E: packages/console/core/src/drizzle/index.ts:31] [E: packages/console/core/src/drizzle/index.ts:36] [E: packages/console/core/src/drizzle/index.ts:69]。 |
| `packages/console/core/src/schema/billing.sql.ts` | Billing schema。定义 `billing`, `subscription`, `lite`, `payment`, `usage`, `coupon` tables [E: packages/console/core/src/schema/billing.sql.ts:17] [E: packages/console/core/src/schema/billing.sql.ts:59] [E: packages/console/core/src/schema/billing.sql.ts:73] [E: packages/console/core/src/schema/billing.sql.ts:89] [E: packages/console/core/src/schema/billing.sql.ts:113] [E: packages/console/core/src/schema/billing.sql.ts:144]。 |

## 数据模型

`WorkspaceTable` 是 workspace root table, 主键是 ULID `id`, 有可选 `slug` 和必填 `name`; workspace-scoped tables 复用 `workspaceIndexes(table)` 生成 `(workspaceID, id)` primary key [E: packages/console/core/src/schema/workspace.sql.ts:4] [E: packages/console/core/src/schema/workspace.sql.ts:7] [E: packages/console/core/src/schema/workspace.sql.ts:15] [E: packages/console/core/src/schema/workspace.sql.ts:18]。

`BillingTable` 包含 customer/payment method、balance、monthly usage、reload、subscription 和 lite subscription 等字段 [E: packages/console/core/src/schema/billing.sql.ts:22] [E: packages/console/core/src/schema/billing.sql.ts:23] [E: packages/console/core/src/schema/billing.sql.ts:26] [E: packages/console/core/src/schema/billing.sql.ts:28] [E: packages/console/core/src/schema/billing.sql.ts:30] [E: packages/console/core/src/schema/billing.sql.ts:36] [E: packages/console/core/src/schema/billing.sql.ts:47]。`UsageTable` 记录 model/provider、tokens、cost、keyID、sessionID 和 plan enrichment [E: packages/console/core/src/schema/billing.sql.ts:113] [E: packages/console/core/src/schema/billing.sql.ts:118] [E: packages/console/core/src/schema/billing.sql.ts:119] [E: packages/console/core/src/schema/billing.sql.ts:120] [E: packages/console/core/src/schema/billing.sql.ts:121] [E: packages/console/core/src/schema/billing.sql.ts:126] [E: packages/console/core/src/schema/billing.sql.ts:127] [E: packages/console/core/src/schema/billing.sql.ts:128] [E: packages/console/core/src/schema/billing.sql.ts:129]。

`Actor.Info` 由 `getActor()` 返回 public/account/user 三类。无登录 session 时返回 `type: "public"`, 有 account session 时返回 account actor, workspace 参数存在且匹配 `UserTable` 时返回 user actor [E: packages/console/app/src/context/auth.ts:73] [E: packages/console/app/src/context/auth.ts:52] [E: packages/console/app/src/context/auth.ts:95] [E: packages/console/app/src/context/auth.ts:103]。

## 控制流

1. HTTP request 进入 SolidStart app, `App` 的 router 使用 `FileRoutes`, route 文件定义页面/API endpoint [E: packages/console/app/src/app.tsx:27] [E: packages/console/app/src/app.tsx:41]。
2. 需要身份的 server function 调用 `getActor(workspace?)`。`getActor` 先从 request locals 复用 actor, 再读 `useAuthSession()` session [E: packages/console/app/src/context/auth.ts:42] [E: packages/console/app/src/context/auth.ts:44] [E: packages/console/app/src/context/auth.ts:46]。
3. workspace actor 解析查询 `UserTable`, 条件是 workspaceID、未删除、accountID in session accounts, 找到后更新 `timeSeen` [E: packages/console/app/src/context/auth.ts:80] [E: packages/console/app/src/context/auth.ts:86] [E: packages/console/app/src/context/auth.ts:87] [E: packages/console/app/src/context/auth.ts:88] [E: packages/console/app/src/context/auth.ts:96] [E: packages/console/app/src/context/auth.ts:99]。
4. Stripe webhook POST 先用 Stripe secret 验证事件, 再按事件类型分支处理 [E: packages/console/app/src/routes/stripe/webhook.ts:14] [E: packages/console/app/src/routes/stripe/webhook.ts:18] [E: packages/console/app/src/routes/stripe/webhook.ts:23]。
5. `checkout.session.completed` payment 分支检查 workspace/customer/payment/invoice metadata, 然后在 `Actor.provide("system", { workspaceID })` 内更新 billing balance 和插入 payment record [E: packages/console/app/src/routes/stripe/webhook.ts:46] [E: packages/console/app/src/routes/stripe/webhook.ts:53] [E: packages/console/app/src/routes/stripe/webhook.ts:54] [E: packages/console/app/src/routes/stripe/webhook.ts:56] [E: packages/console/app/src/routes/stripe/webhook.ts:57] [E: packages/console/app/src/routes/stripe/webhook.ts:59] [E: packages/console/app/src/routes/stripe/webhook.ts:83] [E: packages/console/app/src/routes/stripe/webhook.ts:97]。
6. `Billing.reload()` 读取当前 workspace billing customer/payment method, 创建 invoice 和 invoice items, finalize 并 off-session pay [E: packages/console/core/src/billing.ts:76] [E: packages/console/core/src/billing.ts:79] [E: packages/console/core/src/billing.ts:80] [E: packages/console/core/src/billing.ts:91] [E: packages/console/core/src/billing.ts:102] [E: packages/console/core/src/billing.ts:116] [E: packages/console/core/src/billing.ts:117]。

## 设计动机与权衡

Console 把 hosted billing/account/workspace 逻辑从 terminal agent runtime 分离, 但通过 shared UI 和 cloud resources 与产品面相连 [I]。SST 把 `packages/console/app` 部署成 Cloudflare SolidStart resource, link 了 buckets、database、Upstash、auth URL、Stripe secrets、Honeycomb webhook、SES/Salesforce secrets 和 pricing linkables [E: infra/console.ts:248] [E: infra/console.ts:250] [E: infra/console.ts:252] [E: infra/console.ts:253] [E: infra/console.ts:254] [E: infra/console.ts:255] [E: infra/console.ts:257] [E: infra/console.ts:258] [E: infra/console.ts:260] [E: infra/console.ts:263] [E: infra/console.ts:264] [E: infra/console.ts:265] [E: infra/console.ts:266] [E: infra/console.ts:267] [E: infra/console.ts:268] [E: infra/console.ts:269]。PlanetScale database resource 由 `infra/console.ts` 生成 `sst.Linkable("Database")`, Console core 通过 `Resource.Database` 读取 host/username/password [E: infra/console.ts:36] [E: infra/console.ts:38] [E: packages/console/core/src/drizzle/index.ts:21] [E: packages/console/core/src/drizzle/index.ts:22] [E: packages/console/core/src/drizzle/index.ts:23]。

## Gotcha

- Console 的 `@opencode-ai/console-core` 使用 PlanetScale serverless driver [E: packages/console/core/src/drizzle/index.ts:1], 它不是 opencode V2 SQLite database [I]。
- Console app 的 `build` script 还会调用 `packages/opencode/script/schema.ts` 生成 `config.json` 和 `tui.json`, 这是 Web artifact 的 schema 输出, 不代表 Console 跑 terminal agent [E: packages/console/app/package.json:10] [I]。

## Sources

- `packages/console/app/package.json`
- `packages/console/app/vite.config.ts`
- `packages/console/app/src/app.tsx`
- `packages/console/app/src/context/auth.ts`
- `packages/console/app/src/routes/stripe/webhook.ts`
- `packages/console/core/package.json`
- `packages/console/core/src/drizzle/index.ts`
- `packages/console/core/src/schema/billing.sql.ts`
- `packages/console/core/src/schema/workspace.sql.ts`
- `packages/console/core/src/billing.ts`
- `infra/console.ts`

## 相关

- [会话分享](../server/sharing.md)
- [SST 云基础设施(Cloudflare/AWS)](../infra/sst.md)
