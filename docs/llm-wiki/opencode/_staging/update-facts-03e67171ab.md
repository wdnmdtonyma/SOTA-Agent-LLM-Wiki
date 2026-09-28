# Update facts — 03e67171ab

> Filler / L2 的速查。每条仍须回源码核对行号。路径相对 `opencode/`。事实以 checkout `03e67171ab` 为准。

## 版本 / 依赖

- 发布 **`1.18.33`**（`packages/opencode`、`packages/core`、`packages/cli`）。[E: packages/opencode/package.json:3][E: packages/core/package.json:3][E: packages/cli/package.json:4]
- 根仍是 `bun@1.3.14`；workspace globs 展开仍 **36** 个 package。[E: package.json:7][E: package.json:26]
- `@ai-sdk/togetherai` **2.0.41 → 2.0.68**（`packages/opencode` 与 `packages/core`）。[E: packages/opencode/package.json:74][E: packages/core/package.json:80]
- `gitlab-ai-provider` **6.15.0 → 6.18.0**。[E: packages/opencode/package.json:123][E: packages/core/package.json:111]
- `@ai-sdk/gateway` 仍 **3.0.191**；`@ai-sdk/provider` 仍 **3.0.16**。不是新 provider family。
- 本轮没有新增/删除 workspace package。

## 共享浏览器打开：`openUrl`

- 新文件 `packages/core/src/open.ts`：`openUrl(input)` 只接受 `http:`/`https:`，否则 `Promise.reject`。[E: packages/core/src/open.ts:3][E: packages/core/src/open.ts:5]
- 调用方改为 `openUrl`：MCP browser、CLI `web`/`account`、TUI `app.tsx`/`link.tsx`/`dialog-retry-action.tsx`、Snowflake / DigitalOcean OAuth。[E: packages/opencode/src/mcp/browser.ts:2][E: packages/opencode/src/cli/cmd/web.ts:6][E: packages/opencode/src/cli/cmd/account.ts:8][E: packages/tui/src/app.tsx:66]
- MCP OAuth `redirectToAuthorization` 拒绝非 http(s) authorization URL。[E: packages/opencode/src/mcp/oauth-provider.ts:128]
- MCP browser：`openUrl` 返回后立刻 `onExit(subprocess.exitCode)`，覆盖 Windows/WSL launcher 已退出的情况。[E: packages/opencode/src/mcp/browser.ts:32]

## debug config 脱敏

- 新文件 `packages/opencode/src/cli/cmd/debug/redact.ts`：`redactConfig` 按 key 名（api key/secret/password/token/authorization/cookie/credential/private key）以及 headers 对象、URL userinfo/query secret 写成 `"***"`。[E: packages/opencode/src/cli/cmd/debug/redact.ts:4]
- `debug config` 打印 `redactConfig(config)`，resolved config 本身仍给 provider 用。[E: packages/opencode/src/cli/cmd/debug/config.ts:4][E: packages/opencode/src/cli/cmd/debug/config.ts:11]

## Provider / Gemini / Cloudflare / Codex / Bedrock

- `timeoutFetch` 提到文件顶层。`resolveSDK` 用 `options["fetch"] = timeoutFetch(options)`。[E: packages/opencode/src/provider/provider.ts:96][E: packages/opencode/src/provider/provider.ts:1849]
- Cloudflare AI Gateway custom loader 自己组 client，必须显式 `timeoutFetch`：`createAiGateway({ binding: { run } })` 走 timeout-aware fetch；OpenAI-compatible REST 路径把 `fetch: gatewayFetch` 传进去。[E: packages/opencode/src/provider/provider.ts:878][E: packages/opencode/src/provider/provider.ts:882][E: packages/opencode/src/provider/provider.ts:930]
- Gemini 2.5 用 `GEMINI_2_5_RE`；legacy 1/2 代用 `GEMINI_LEGACY_RE`。`isLegacyGemini` / `isGemini25`。[E: packages/opencode/src/provider/transform.ts:520][E: packages/opencode/src/provider/transform.ts:521][E: packages/opencode/src/provider/transform.ts:741][E: packages/opencode/src/provider/transform.ts:745]
- Gemma 4 thinking efforts 是 `["minimal", "high"]`。[E: packages/opencode/src/provider/transform.ts:750]
- Google/Vertex 默认 `thinkingLevel: "high"` 的条件是 `!isLegacyGemini`，不再是 `includes("gemini-3")`。[E: packages/opencode/src/provider/transform.ts:1285]
- OpenRouter/LLMGateway 对非 legacy Gemini 写 `reasoning.effort = "high"`。[E: packages/opencode/src/provider/transform.ts:1253]
- Codex `ALLOWED_MODELS` 含 `gpt-6-sol`、`gpt-6-luna`。[E: packages/opencode/src/plugin/openai/codex.ts:15]
- Bedrock `@ai-sdk/amazon-bedrock` 只对 anthropic / nova / llama4 / llama-4 的 **image/** MIME 把 tool-result 附件 hoist。[E: packages/opencode/src/session/message-v2.ts:151]

## TUI remote auth

- `cliErrorMessage` 识别 `ConfigRemoteAuthError`：login page 而不是 JSON，提示 SSO/IAP，带 `opencode auth login <url>`。[E: packages/tui/src/util/error.ts:50]
- TUI `run` 在 `result.reason` 时写 stderr 并 `process.exitCode = 1`。[E: packages/tui/src/app.tsx:359]
- V1 HttpApi error middleware 把 `ConfigErrorV1.RemoteAuthError` 映射成 400 JSON。[E: packages/opencode/src/server/routes/instance/httpapi/middleware/error.ts:24]

## Npm / filesystem search

- Node 下 `resolveEntryPoint` 用 `createRequire(...).resolve(name)` + `pathToFileURL`，不再 `import.meta.resolve(dir)`。[E: packages/core/src/npm.ts:61]
- `filesystem/search.ts` 从 `@opencode-ai/schema/filesystem` 导入 `Entry`/`Match`，对 `FileSystem` 只 `import type`，打断循环。[E: packages/core/src/filesystem/search.ts:8]

## Console

- Zen format schema 增加 `"systemone"`。[E: packages/console/core/src/model.ts:11]
- 新 helper `systemoneHelper`：URL 追加 `/systemone`，header `authorization` + `x-session-affinity`。[E: packages/console/app/src/routes/zen/util/provider/systemone.ts:8]
- 新路由 `POST /zen/v1/systemone` 与 `POST /zen/go/v1/systemone`；`handler` 在 `format === "systemone"` 时走 helper。[E: packages/console/app/src/routes/zen/v1/systemone.ts:6][E: packages/console/app/src/routes/zen/util/handler.ts:689]
- `proxyInference` 路径表加 systemone。新 Console key `oc_sk_` **不查** legacy key 表；legacy key 才 `migratedWorkspace`。转发加 `CF-Access-Client-Id`，client IP 写 `x-zen-ip`（不再 `x-real-ip`）。[E: packages/console/app/src/lib/inference-proxy.ts:11][E: packages/console/app/src/lib/inference-proxy.ts:47][E: packages/console/app/src/lib/inference-proxy.ts:84][E: packages/console/app/src/lib/inference-proxy.ts:86]
- 旧 Console 只服务 Black（`BillingTable.subscriptionID` 非空）。`requireBlackAccount` / function `auth.ts` 无 Black 则 redirect 新 Console。[E: packages/console/app/src/context/auth.ts:138][E: packages/console/function/src/auth.ts:193]
- `Billing` 创建 Go subscription 直接 throw `"Go subscriptions have moved to the new Console"`。[E: packages/console/core/src/billing.ts:307]
- workspace selector 排除 `migrated_at` 非空。[E: packages/console/app/src/routes/workspace/common.tsx:56]
- Desktop download 改为 `opencode.ai/update/api/{latest|beta}/desktop/opencode` 取 asset URL 再 302。[E: packages/console/app/src/routes/download/[channel]/[platform].ts:10]
- 安装文案切到 v2：`opencode.ai/v2/install`、`@opencode/cli`、`opencode-v2` tap。[E: packages/console/app/src/routes/download/index.tsx:55]

## Stats

- `R2Sql.query(query, columns?)` 走 `queryR2SqlPages`：有 columns 时按 lexicographic cursor 分页；每页 retry 2 次（`code === 40005` / 429 / >=500，指数 5s）。无 columns 且单页触达 10_000 仍 fail。[E: packages/stats/core/src/r2-sql.ts:51][E: packages/stats/core/src/r2-sql.ts:58][E: packages/stats/core/src/r2-sql.ts:75]
- 15 分钟 timeout + `timeout: false` 仍在 `fetchRows`。[E: packages/stats/core/src/r2-sql.ts:5][E: packages/stats/core/src/r2-sql.ts:112]
- `syncStats` 调 `r2Sql.query(query, ["dimension", "tier", "provider", "model", "country"])`。[E: packages/stats/core/src/stat-sync.ts:57]
- Home leaderboard：`1D` 用单日窗口，其它 range 用 `1W` 窗口。[E: packages/stats/core/src/domain/home.ts:420]
- `LEADERBOARD_CHANGE_MIN_MULTIPLE = 10`：当前 ≥ 上期 ×10 时 `change` 为 `null`（藏 partial-day 伪涨幅）。[E: packages/stats/core/src/domain/home.ts:152][E: packages/stats/core/src/domain/home.ts:1129]
- Home 页面 `leaderboard.daily = stats.leaderboard.Go["1D"]`，`weekly = ...["1W"]`。[E: packages/stats/app/src/routes/index.tsx:89]
- Radar：benchmark 优先；缺数据时 reasoning/toolCall 支持度 fallback 50，不支持 0，无 capability 字段 50 placeholder。[E: packages/stats/app/src/routes/compare-radar.tsx:386]
- `reasoning` / `toolCall` 在 catalog entry 上改为 optional。[E: packages/stats/app/src/routes/model-catalog.ts:28]
- `hy4` 归 Tencent；`STEALTH_MODELS` 含 `omen-alpha`、`space-bunny`、`union-alpha`。[E: packages/stats/core/src/domain/model-normalization.ts:9][E: packages/stats/core/src/domain/model-normalization.ts:18]
- catalog aliases：`meta/muse-spark-1.2-contributor` / `1.3-contributor`。[E: packages/stats/app/src/routes/model-catalog.ts:156]

## Infra / web

- 新 workflow `.github/workflows/models-snapshot.yml`：每天 12:00 UTC 在 `v2` ref 刷新 models.dev snapshot。[E: .github/workflows/models-snapshot.yml:1][E: .github/workflows/models-snapshot.yml:9]
- Web 营销页 `V2Banner` 链到 `https://opencode.ai/v2`。[E: packages/web/src/components/V2Banner.astro:1]
- UI 增加 Merge Gateway provider icon。这是图标，不是新 runtime provider family。

## 不变

- SessionV2 不是默认路径。
- Effect HttpApi，不是 Hono。
- 无新/删模型可见 tool。
- 36 workspace packages；`bun@1.3.14`。
- zen/go live 模型表来自外部 catalog。web `docs/go.mdx` / `docs/zen.mdx` 与 `go-models.ts` 是营销面。
- Google thoughts 可能被 trial limiter / `buildTokenCost` 二次计入（上一轮遗留 `[U]`）。
