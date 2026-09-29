# Update facts — 7945de2089

> Filler / L2 的速查。每条仍须回源码核对行号。路径相对 `opencode/`。事实以 checkout `7945de2089` 为准。

## 版本 / 依赖

- 发布仍是 **`1.18.33`**（`packages/opencode`、`packages/core`、`packages/cli`）。[E: packages/opencode/package.json:3][E: packages/core/package.json:3][E: packages/cli/package.json:4]
- 根仍是 `bun@1.3.14`；workspace globs 展开仍 **36** 个 package。[E: package.json:7][E: package.json:26]
- `@ai-sdk/togetherai` 仍 **2.0.68**；`gitlab-ai-provider` 仍 **6.18.0**；`@ai-sdk/gateway` 仍 **3.0.191**。本轮没有新增/删除 workspace package，没有模型可见 tool 改名。

## Console Go 营销面（不是 live catalog）

- `goModels` 仍是 5 小时请求数 + 月额度的 UI 表，不是 zen live catalog。[E: packages/console/app/src/component/go-models.ts:1][E: packages/console/app/src/component/go-models.ts:2]
- 新增 `plusLimits`：按 model id 写 Go Plus `[requests, allowance]`，注释写明 **不是** Go 的固定倍数。[E: packages/console/app/src/component/go-models.ts:77][E: packages/console/app/src/component/go-models.ts:78]
- `goPlanModels` 把 `plusRequests` / `plusAllowance` merge 进每条 model。[E: packages/console/app/src/component/go-models.ts:110]
- Go 页 hero 并排 **Go $10 / 月** 与 **Go Plus $40 / 月**；`subscribeUrl` 硬编码 `https://opencode.ai/console/go`。[E: packages/console/app/src/routes/go/index.tsx:68][E: packages/console/app/src/routes/go/index.tsx:134][E: packages/console/app/src/routes/go/index.tsx:141]
- 比较图从 `LimitsGraph` 换成 `GoPlanChart`，数据源 `goPlanModels`。[E: packages/console/app/src/routes/go/index.tsx:11][E: packages/console/app/src/component/go-plan-chart.tsx:5][E: packages/console/app/src/component/go-plan-chart.tsx:10]
- `?ref=` 只展示 referral 已结束文案，不再发 credit。[E: packages/console/app/src/routes/go/index.tsx:100][E: packages/console/app/src/i18n/en.ts:4]
- `go-ornate-dark.svg` / `go-ornate-light.svg` 已删除。FAQ 展示名 `DeepSeek V4.1 Flash` 在 `go/index.tsx` 的 `models` 表。[E: packages/console/app/src/routes/go/index.tsx:58]
- web `docs/go.mdx` / `docs/zen.mdx` 仍是营销面，不要当 live catalog。

## Console Black 停续订

- Stripe `customer.subscription.updated`：若 product 是 Black，status 为 `active`/`trialing`/`past_due`，且尚未 `cancel_at_period_end`/`cancel_at`，则 `subscriptions.update(..., cancel_at_period_end: true)`，comment `Legacy Black retirement: renewal is not allowed`。[E: packages/console/app/src/routes/stripe/webhook.ts:198][E: packages/console/app/src/routes/stripe/webhook.ts:205]
- 该分支对非 Black product `return "ignored"`（同一 POST 里后续 **不同 event type** 的 handler 不受影响，因为它们是别的 webhook 投递）。[E: packages/console/app/src/routes/stripe/webhook.ts:201]
- Black billing UI 去掉 `Billing.generateSessionUrl` / Manage 按钮；展示 `workspace.black.subscription.ending`。[I]（路径含 `[id]`，lint 不能核 `[E:]`：`packages/console/app/src/routes/workspace/[id]/billing/black-section.tsx`）
- 旧 Console 仍只服务 Black；Go checkout 仍 throw 迁到新 Console（上一轮已落地，本轮未改 `billing.ts`）。

## Stats catalog identity

- 新文件 `packages/stats/core/src/domain/catalog-identity.ts`。`loadCatalogIdentity()` GET `https://models.opencode.ai/catalog.json`，`AbortSignal.timeout(10_000)`，成功后 cache 5 分钟。[E: packages/stats/core/src/domain/catalog-identity.ts:3][E: packages/stats/core/src/domain/catalog-identity.ts:12][E: packages/stats/core/src/domain/catalog-identity.ts:21]
- 只读 provider `opencode` 与 `opencode-go`。`offerings` 键是 `providerID/modelID.toLowerCase()` → lab；`models` 只收录 **唯一 lab** 的归一化 model 名。[E: packages/stats/core/src/domain/catalog-identity.ts:4][E: packages/stats/core/src/domain/catalog-identity.ts:51][E: packages/stats/core/src/domain/catalog-identity.ts:64]
- fetch 失败：有 cache 则 `{ catalog, stale: true }`，否则 `{ catalog: undefined, stale: true }`，sync **不 abort**。[E: packages/stats/core/src/domain/catalog-identity.ts:24]
- `syncStats` 先 `loadCatalogIdentity`；stale 打 warning（cached vs legacy attribution）。`buildStatsQueries` / `buildRetentionQueries` / `to*Aggregate` 传入 `catalog`。[E: packages/stats/core/src/stat-sync.ts:47][E: packages/stats/core/src/stat-sync.ts:60][E: packages/stats/core/src/domain/inference.ts:43]
- `statProviderSql` 顺序：stealth → catalog offerings（`provider`+raw model）→ catalog models（归一化名）→ `MODEL_AUTHOR_RULES` → 非 retired provider。`compatible()`：已有 `statProvider` 不是 unknown 且不等于 catalog lab 时 **不改** 历史维度。[E: packages/stats/core/src/domain/inference.ts:514][E: packages/stats/core/src/domain/inference.ts:519]
- upsert 之后 `ModelStatRepo.deleteUnknownDimensions` / `GeoStatRepo.deleteUnknownDimensions`：同一 period+model（geo 再加 country）若已有已知 lab 行，删掉 `provider="unknown"` 旧行。[E: packages/stats/core/src/stat-sync.ts:159][E: packages/stats/core/src/domain/model.ts:207]
- `normalizeStatRows`：若同 period/tier/model 已有非 unknown、非 retired 行，且 `statProvider(model,"","unknown")` 指向该 lab，则丢掉 unknown 行。[E: packages/stats/core/src/domain/home.ts:989]
- `normalizeStatRow`：仅当 `row.provider === "unknown"` 或 provider 在 `RETIRED_STAT_PROVIDERS` 时才 `statProvider()` 重写；已知 lab 行保留入库 provider。[E: packages/stats/core/src/domain/home.ts:1023]
- model page country：已知 provider 的 `listCountryTotals` 为空时，再以 `provider: "unknown"` 查一次。[E: packages/stats/core/src/domain/home.ts:226]
- `MODEL_AUTHOR_RULES` 增加 `{ match: "longcat", author: "meituan" }`。[E: packages/stats/core/src/domain/model-normalization.ts:11]
- chart tooltip CSS 改为不透明背景（`#ffffff` / `#242424`），不影响聚合语义。

## 不变

- SessionV2 不是默认路径。
- Effect HttpApi，不是 Hono。
- 无新/删模型可见 tool。
- 36 workspace packages；`bun@1.3.14`；发布 `1.18.33`。
- zen/go live 模型表来自外部 catalog。`go-models.ts` 与 web `docs/go.mdx` / `docs/zen.mdx` 是营销面。
- Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（遗留 `[U]`）。
- R2 SQL cursor 分页 + 40005/429/5xx retry、15 分钟 timeout、1D leaderboard 10× 隐藏、stealth `omen-alpha`/`space-bunny`/`union-alpha`、`hy4`→Tencent 仍成立。
