# Update facts — b3f1a96c6d

> Filler 的速查。每条仍须回源码核对行号。路径相对 `opencode/`。

## 版本 / 依赖

- 发布 **`1.18.30`**（`packages/opencode`、`packages/core`、`packages/cli` 及各 workspace package 的 `version`）。[E: packages/opencode/package.json:3][E: packages/core/package.json:3][E: packages/cli/package.json:4]
- 根仍是 `bun@1.3.14`；workspace 仍 **36** 个 package。[E: package.json:7]
- `gitlab-ai-provider` **6.14.0 → 6.15.0**（`packages/opencode` 与 `packages/core` 的 dependency）。本 range **没有** GitLab reasoning 语义 diff；不要编造新 family 规则。[E: packages/opencode/package.json:123][E: packages/core/package.json:111]

## System prompt：Astra / gpt-6

- V1 `SystemPrompt.provider()` 在 `model.api.id` 含 `gpt` 的分支里，**先**判断 `gpt-6`，命中则返回 `PROMPT_ASTRA`（`session/prompt/gpt-astra.txt`），再才是 `codex` → `codex.txt`，否则 `gpt.txt`。[E: packages/opencode/src/session/system.ts:35][E: packages/opencode/src/session/system.ts:36][E: packages/opencode/src/session/system.ts:37][E: packages/opencode/src/session/system.ts:40]
- `gpt-4` / `o1` / `o3` 仍走 `beast.txt`，且该判断在 `gpt` 分支之前，所以 `gpt-4*` 不会落到 Astra。[E: packages/opencode/src/session/system.ts:33]
- `gpt-astra.txt` 由 `system.ts` 导入，是 live family，不是 orphan。[E: packages/opencode/src/session/system.ts:11]
- `packages/core` 本 range **没有** Astra / `gpt-6` selector。不要写成 V2 runner 已切 Astra。commit 文案 “port from v2” 不是 core 源码事实。

## Bedrock model ID

- V1 `amazon-bedrock` `getModel`：`modelID.startsWith("arn:")` 直接 `sdk.languageModel(modelID)`，不再加 region prefix。[E: packages/opencode/src/provider/provider.ts:379][E: packages/opencode/src/provider/provider.ts:380]
- US 需要 prefix 的子串从 `"deepseek"` 收窄为 `"deepseek.r1"`。`deepseek.v3.2` 保持原样；已有 `us.`/`eu.`/`global.` 等 prefix 仍跳过。[E: packages/opencode/src/provider/provider.ts:383][E: packages/opencode/src/provider/provider.ts:405]
- V2 `resolveModelID()` 同样：`arn:` 原样返回；US prefix 只认 `deepseek.r1`。[E: packages/core/src/plugin/provider/amazon-bedrock.ts:16][E: packages/core/src/plugin/provider/amazon-bedrock.ts:31]
- 测试固定：`deepseek.v3.2` → 不加 prefix；`deepseek.r1-v1:0` → `us.deepseek.r1-v1:0`；已有 `us.deepseek.r1-v1:0` 不双前缀；ARN 原样。[E: packages/core/test/plugin/provider-amazon-bedrock.test.ts:531][E: packages/core/test/plugin/provider-amazon-bedrock.test.ts:532][E: packages/opencode/test/provider/amazon-bedrock.test.ts:251]

## Copilot adaptive thinking

- `CopilotModels.build()`：走 adaptive thinking 的 effort variants **一律** `thinking.display = "summarized"`，不再只给 `opus-4.7`。[E: packages/opencode/src/plugin/github-copilot/models.ts:177][E: packages/opencode/src/plugin/github-copilot/models.ts:179]
- 这是 Copilot remote-model 变体表，不是 `transform.ts` 的 Claude heuristic。不要把这句话写成所有 Anthropic provider 的新默认。

## Console inference proxy / Go

- `paths` 新增 Go 与 models/usage：`POST /zen/go/v1/{chat/completions,responses,messages}` → `/go/openai|anthropic/...`；`GET /zen/v1/models` → `/v1/models`；`GET /zen/go/v1/models` → `/go/v1/models`；`GET /zen/go/v1/usage` → `/go/v1/usage`。[E: packages/console/app/src/lib/inference-proxy.ts:11][E: packages/console/app/src/lib/inference-proxy.ts:14][E: packages/console/app/src/lib/inference-proxy.ts:16]
- `generation` 现为 optional。无 body 的 GET 直接 `new Request(request)` 转发。[E: packages/console/app/src/lib/inference-proxy.ts:21][E: packages/console/app/src/lib/inference-proxy.ts:90]
- `/zen/go/` 请求设 `go=true`，**不** left-join BYOK `ProviderTable`。[E: packages/console/app/src/lib/inference-proxy.ts:37][E: packages/console/app/src/lib/inference-proxy.ts:57]
- messages 的 key 改为 `url.pathname.endsWith("/messages")` 读 `x-api-key`（覆盖 zen 与 go messages）。[E: packages/console/app/src/lib/inference-proxy.ts:38]
- 转发前删除 `x-zen` / `x-zen-model` / `x-zen-ip` / CF access / `host` / `content-length`。[E: packages/console/app/src/lib/inference-proxy.ts:93]
- `inferenceUnavailable()` 抽出 503 JSON：`Inference routing is unavailable. Please retry later.`。[E: packages/console/app/src/lib/inference-proxy.ts:112]
- Zen `handler`：只要解析到 `model` 就调 `proxyInference`（不再要求 `modelList === "full"`）。BYOK `provider`/`model` **只**在 `modelList === "full"` 时传入。[E: packages/console/app/src/routes/zen/util/handler.ts:105][E: packages/console/app/src/routes/zen/util/handler.ts:112]
- `GET /zen/v1/models` 删除 `proxyModels()`；非 public key 走 `proxyInference(request).catch(inferenceUnavailable)`。[E: packages/console/app/src/routes/zen/v1/models.ts:17]
- `GET /zen/go/v1/models` 与 `GET /zen/go/v1/usage` 同样先 proxy，无 `migratedAt` 才走本地 catalog / LiteTable。[E: packages/console/app/src/routes/zen/go/v1/models.ts:11][E: packages/console/app/src/routes/zen/go/v1/usage.ts:12]

## Console OAuth / Stripe / Go UI

- 新路由 `GET /oauth/opencode/client.json`：OAuth Client ID Metadata Document。`client_id` = `origin + /oauth/opencode/client.json`；`application_type: native`；loopback redirect 无端口；`token_endpoint_auth_method: none`；CORS `*`；cache 300s。[E: packages/console/app/src/routes/oauth/opencode/client.json.ts:13][E: packages/console/app/src/routes/oauth/opencode/client.json.ts:20][E: packages/console/app/src/routes/oauth/opencode/client.json.ts:25]
- SST `ZEN_LITE_PRICE`：`$app.stage === "dev"` 时用已有 Stripe `prod_U1tUscpmwtV2bG` / `price_1T3phhE7fOCwHSD4zS6w2NPy`，其它 stage 仍用新建 product/price。[E: infra/console.ts:154][E: infra/console.ts:155]
- `go-models.ts` 是 **marketing/UI allowance 表**（5 小时请求数 + 月额度），不是 live zen catalog。本轮加入 `deepseek-flash`（展示名 DeepSeek V4.1 Flash，`bonus: 4`）。[E: packages/console/app/src/component/go-models.ts:25]
- Go FAQ / lite 列表加入 DeepSeek V4.1 Flash，**去掉 Omen Alpha**。不要把营销名单写成 runtime catalog。

## 不变

- SessionV2 不是默认路径。
- Effect HttpApi，不是 Hono。
- 无新/删模型可见 tool。
- 36 workspace packages；`bun@1.3.14`。
- zen/go live 模型表来自外部 catalog。`go-models.ts` 只是 Console 营销图。
- `hook.provider.models` 机制仍在（Azure 仍不注册）。
