# Update facts — e207624c48

> Filler 的速查。每条仍须回源码核对行号。路径相对 `opencode/`。

## Provider / transforms / timeouts

- **Anthropic thinking blockBinding（NEW）**: Claude 5.1+（`anthropicBindsThinking`：major>5 或 major=5 且 minor>=1；**Mythos 5.1 除外**）默认注入 `thinking.blockBinding = { prefixMismatchBehavior: "drop_block" }`（Anthropic / Vertex-Anthropic）或 Bedrock 的 `reasoningConfig.blockBinding`。只在 thinking/reasoningConfig type 为 `adaptive`/`enabled` 且用户未显式设 `blockBinding` 时注入。[E: packages/opencode/src/provider/transform.ts:690][E: packages/opencode/src/provider/transform.ts:706][E: packages/opencode/src/provider/transform.ts:719][E: packages/opencode/src/provider/transform.ts:726]
- **config 可 opt-out**: `thinking.blockBinding === false` 或 `reasoningConfig.blockBinding === false` 会被剥掉（OpenCode-only 哨兵），即使模型不在默认 scope。[E: packages/opencode/src/provider/transform.ts:712]
- **接入点**: `providerOptions()` 在非 OpenAI-reasoning-gate 路径走 `anthropicBlockBinding`；OpenAI/Azure/Mantle 且有 reasoning capability 或已设 effort/summary 时仍只加 `forceReasoning: true`。[E: packages/opencode/src/provider/transform.ts:1408][E: packages/opencode/src/provider/transform.ts:1417]
- **GitLab reasoning variants**: `gitlab-ai-provider` 的 `reasoningEffort()`：`family` 以 `gpt` 开头 → `{ reasoningEffort }`；`claude` → `{ thinking: { type: "adaptive", effort } }`；其它 return undefined。[E: packages/opencode/src/provider/transform.ts:1827][E: packages/opencode/src/provider/transform.ts:1828][E: packages/opencode/src/provider/transform.ts:1829]
- **全局 SSE timeout 默认 5 分钟**: `getLanguage`/`resolveSDK` fetch wrapper：`chunkTimeout ?? 300_000`、`headerTimeout ?? 300_000`。`headerTimeout === false` 关闭 header timeout；`chunkTimeout` 非正数则不 wrap SSE。[E: packages/opencode/src/provider/provider.ts:1795][E: packages/opencode/src/provider/provider.ts:1803][E: packages/opencode/src/provider/provider.ts:1804]
- **config schema**: `headerTimeout` 与 `chunkTimeout` 都是 `PositiveInt | false`，文档写 default 300000。[E: packages/core/src/v1/config/provider.ts:108][E: packages/core/src/v1/config/provider.ts:117]
- **SSE cancel**: V1 `provider.ts` 与 core `aisdk.ts` 都改成 `reader.cancel(err).catch(() => {})`。[E: packages/opencode/src/provider/provider.ts:49][E: packages/core/src/aisdk.ts:38]
- **headerTimeout 不再是 non-OpenAI 的 opt-in**：无配置即启用 300s；必须显式 `false` 才关。chunk timeout 错误文案 `"SSE read timed out"` 走 `SessionRetry.retryable`。[E: packages/opencode/test/provider/header-timeout.test.ts:187]
- **Core `aisdk.ts` 没有 300s 默认**：`chunkTimeout = options.chunkTimeout`，只有 cancel 修复，不要写成 V2 也默认 5 分钟。[E: packages/core/src/aisdk.ts:83]
- **Bedrock `none` effort**：`transform.ts` fallback 本 range **未改**；新增 GPT-5.6 Bedrock 测试。wire `{ reasoning: { effort: "none" } }` 来自 `@ai-sdk/amazon-bedrock` patch，不要写成 opencode 新 API。[E: packages/opencode/src/provider/transform.ts:1797]
- **OpenAI service tier**：审计文件内 **无** `serviceTier` TS 变更；行为在 `patches/@ai-sdk%2Fopenai@3.0.88.patch`。
- **BUNDLED_PROVIDERS**: 仍含 `gitlab-ai-provider`；本 range 无增删 npm key。[E: packages/opencode/src/provider/provider.ts:136]
- **blockBinding 线上形态**：Anthropic body `block_binding.prefix_mismatch_behavior` + beta `thinking-binding-controls-2026-08-01`（测试固定）。空 options 的 Claude 5.1+ 会默认补 `{ type: "adaptive", blockBinding }`。[E: packages/opencode/test/provider/transform.test.ts:1330]

## Auth / plugin / Copilot / Codex

- **Azure discovery 已删**: `AzureAuthPlugin` 不再读 `azureProfile.json`、不再 `az cognitiveservices account list`、**没有** `provider.models` hook、**没有** `discoverAzureModels`。OAuth 只剩手动 `resourceName` text prompt（或 `AZURE_RESOURCE_NAME`）。[E: packages/opencode/src/plugin/azure.ts:20][E: packages/opencode/src/plugin/azure.ts:54][E: packages/opencode/src/plugin/azure.ts:80][E: packages/opencode/src/plugin/azure.ts:89]
- **未装 `az` 仍隐藏 OAuth**。[E: packages/opencode/src/plugin/azure.ts:107]
- **Entra token / scopes 仍在**: Cognitive Services vs AI Foundry hostname。[E: packages/opencode/src/plugin/azure.ts:8][E: packages/opencode/src/plugin/azure.ts:116]
- **Codex GPT filter**: `^gpt-(\d+)(?:\.(\d+))?`，允许整数版本（`gpt-6`）；比较 `major > 5 || (major === 5 && minor > 4)`。`gpt-5.6` 仍单独 DISALLOW。行为差：`gpt-5.10` 旧 parseFloat 当成 5.1 会拒，现在 minor=10 允许。[E: packages/opencode/src/plugin/openai/codex.ts:300][E: packages/opencode/src/plugin/openai/codex.ts:304]
- **Copilot**: `chat.headers` 增加 `X-Interaction-Id = incoming.sessionID`。`providerID.includes("github-copilot")` 即加（含 enterprise）；其它 provider 不加。[E: packages/opencode/src/plugin/github-copilot/copilot.ts:361][E: packages/opencode/src/plugin/github-copilot/copilot.ts:364]
- **Azure init 零 CLI**：`AzureAuthPlugin()` 只 `which("az")`，不再读 profile / list accounts。[E: packages/opencode/src/plugin/azure.ts:20]

## Session / tools / apply_patch

- **thinking dropped log**: `step-finish` 若 `providerMetadata.anthropic.inputTransformations` 非空数组，打 `thinking blocks dropped by provider` warning。[E: packages/opencode/src/session/processor.ts:438]
- **tool time.start 不重置**: running 状态复用 `match.state.time`，只有非 running 才 `{ start: Date.now() }`。[E: packages/opencode/src/session/tools.ts:77]
- **apply_patch**: `movePath` 仅在 truthy 时写入输出对象。[E: packages/opencode/src/tool/apply_patch.ts:201]
- **无新/删 tool wire name**。`instruction.ts` 本 range 无实质语义（若 numstat 为 0 则不要编造）。

## Console / Stats / App / TUI

- **workspace.migrated_at**: Console schema + migration `20260901161032_workspace_migrated_at`。[E: packages/console/core/src/schema/workspace.sql.ts:15]
- **SST ConsoleMigration**: production `https://opencode.ai/console|inference`；dev `https://dev.opencode.ai/...`；preview stage 空串防误路由。[E: infra/console.ts:224]
- **登录重定向**: `getActor` 若 workspace 已 `migratedAt` → 302/303 到 `ConsoleMigration.consoleUrl/login`（`Cache-Control: no-store`）。[E: packages/console/app/src/context/auth.ts:104]
- **inference proxy（NEW）**: `proxyInference`：workspace 有 `migratedAt` 才转发到 `Resource.ConsoleMigration.inferenceUrl`；已绑 BYOK provider 时改写到 `/custom/conn_${workspaceId}_${provider}`；否则走 zen 原生 path。无 migratedAt → `undefined`。[E: packages/console/app/src/lib/inference-proxy.ts:13][E: packages/console/app/src/lib/inference-proxy.ts:63][E: packages/console/app/src/lib/inference-proxy.ts:67]
- **Zen handler**: `modelList === "full"` 且有 model 时，在 rate-limit/auth/balance **之前**调 `proxyInference`；失败 503 `"Inference routing is unavailable"`。[E: packages/console/app/src/routes/zen/util/handler.ts:104]
- **`/zen/v1/models`**: 非 public key 且已迁移 → fetch 新 inference `/v1/models`。[E: packages/console/app/src/routes/zen/v1/models.ts:14]
- **training consent**: `requiresGoTrainingConsent` 只认 `muse-spark-1.3-contributor` / `muse-spark-1.2-contributor`（不含 free/preview）。国家限制另含 `muse-spark-1.3-contributor` / `-free`。[E: packages/console/app/src/routes/zen/util/trainingConsent.ts:2][E: packages/console/app/src/lib/request-country.ts:34]
- **quota reset（NEW）**: `Quota.reset({ workspaceID, plan: lite|subscription })` 把用量计数清零、不动时间戳；support POST `/api/support/actions/reset-quota` 用 `SUPPORT_API_KEY`。[E: packages/console/core/src/quota.ts:13][E: packages/console/app/src/routes/api/support/actions/reset-quota.ts:12]
- **cost200K.threshold**: 默认 200_000，计费 flip 读 `modelInfo.cost200K.threshold` 不再写死 200k。[E: packages/console/core/src/model.ts:22]
- **OpenAI usage 归一化**: `inputTokens = max(0, input_tokens - cached_tokens - cache_write_tokens)`。[E: packages/console/app/src/routes/zen/util/provider/openai.ts:54]
- **计费窗口**: 单快照 `trackedAt`；跨窗口 `time*Updated >= period.end` 不再累加。[E: packages/console/app/src/routes/zen/util/handler.ts:1102]
- **Enterprise inbox**: `contact@anoma.ly` → `Resource.ENTERPRISE_SALES_INBOX_EMAIL`。[E: packages/console/app/src/routes/api/enterprise.ts:101]
- **不要**把 zen 文档里的 Muse Spark / Gemini / Omen Alpha 写成硬编码 live catalog。
- **Stats stealth**: `STEALTH_MODELS = {"omen-alpha"}`；`statProvider` → `"unknown"`。[E: packages/stats/core/src/domain/model-normalization.ts:17]
- **Stats country**: `country` 从 `Record<UsageRange, …>` 变为单一 `CountryEntry[]`（2M `GROUP BY country`）。query cache TTL 是 **5 分钟**（`QUERY_CACHE_TTL_MS = 5 * 60 * 1000`），最多 256 条；不是 60 秒。[E: packages/stats/core/src/domain/home.ts:34][E: packages/stats/core/src/domain/home.ts:78][E: packages/stats/core/src/domain/home.ts:147][E: packages/stats/core/src/domain/home.ts:282]
- **Stats 别名**: `deepseek-v4-flash-0731` 与 `…dsv4-flash-final-rnaovd` → `deepseek-v4-flash`。[E: packages/stats/core/src/domain/model-normalization.ts:20]
- **Stats UI**: 未知/providerless lab 隐藏 icon；stealth 不暴露真实 route provider。
- **App**: desktop 连 `opencode` provider 时 authorization URL 加 `client_id=opencode-desktop`。[E: packages/app/src/components/dialog-connect-provider.tsx:565]
- **TUI**: `Dynamic` 仅从 `solid-js/web` 改 import `@opentui/solid`，不是协议变化；ellipsis 文案不要写成行为变更。

## 不变

- SessionV2 不是默认路径。
- Effect HttpApi，不是 Hono。
- 无新/删模型可见 tool。
- 36 workspace packages；`bun@1.3.14`；发布 **`1.18.29`**。
- zen/go live 模型表来自外部 catalog。
- `packages/core/src/config.ts` 与 V2 runner 默认路径本 range 无“V2 变默认”的证据。
