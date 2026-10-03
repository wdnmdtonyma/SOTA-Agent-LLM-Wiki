---
id: ref.ai.provider-catalog
title: provider 完整目录(42)
kind: catalog
tier: T3
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
  - packages/ai/src/models.generated.ts
  - packages/ai/src/types.ts
  - packages/ai/src/auth/helpers.ts
  - packages/ai/src/env-api-keys.ts
  - packages/coding-agent/src/core/model-resolver.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/test/model-resolver.test.ts
  - packages/ai/src/providers/amazon-bedrock.ts
  - packages/ai/src/providers/ant-ling.ts
  - packages/ai/src/providers/anthropic.ts
  - packages/ai/src/providers/azure-openai-responses.ts
  - packages/ai/src/providers/baseten.ts
  - packages/ai/src/providers/cerebras.ts
  - packages/ai/src/providers/cloudflare-ai-gateway.ts
  - packages/ai/src/providers/cloudflare-auth.ts
  - packages/ai/src/providers/cloudflare-workers-ai.ts
  - packages/ai/src/providers/deepseek.ts
  - packages/ai/src/providers/fireworks.ts
  - packages/ai/src/providers/github-copilot.ts
  - packages/ai/src/providers/google.ts
  - packages/ai/src/providers/google-vertex.ts
  - packages/ai/src/providers/groq.ts
  - packages/ai/src/providers/huggingface.ts
  - packages/ai/src/providers/kimi-coding.ts
  - packages/ai/src/providers/meta.ts
  - packages/ai/src/providers/minimax.ts
  - packages/ai/src/providers/minimax-cn.ts
  - packages/ai/src/providers/mistral.ts
  - packages/ai/src/providers/moonshotai.ts
  - packages/ai/src/providers/moonshotai-cn.ts
  - packages/ai/src/providers/nvidia.ts
  - packages/ai/src/providers/openai.ts
  - packages/ai/src/providers/openai-codex.ts
  - packages/ai/src/providers/opencode.ts
  - packages/ai/src/providers/opencode-go.ts
  - packages/ai/src/providers/opencode-headers.ts
  - packages/ai/test/opencode-provider-headers.test.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/providers/qwen-token-plan.ts
  - packages/ai/src/providers/qwen-token-plan-cn.ts
  - packages/ai/src/providers/qwen-token-plan-individual.ts
  - packages/ai/src/providers/radius.ts
  - packages/ai/src/providers/radius.models.ts
  - packages/ai/src/providers/radius-config.ts
  - packages/ai/src/providers/together.ts
  - packages/ai/src/providers/typesafe.ts
  - packages/ai/src/providers/vercel-ai-gateway.ts
  - packages/ai/src/providers/xai.ts
  - packages/ai/src/providers/xiaomi.ts
  - packages/ai/src/providers/xiaomi-token-plan-ams.ts
  - packages/ai/src/providers/xiaomi-token-plan-cn.ts
  - packages/ai/src/providers/xiaomi-token-plan-sgp.ts
  - packages/ai/src/providers/zai.ts
  - packages/ai/src/providers/zai-coding-cn.ts
symbols: [builtinProviders]
related: [subsys.ai.provider-registry, surface.providers.overview, ref.ai.model-catalog, subsys.coding-agent.model-resolver, surface.providers.auth, subsys.ai.classifiers]
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.ai.provider-catalog` 逐实例列出 `packages/ai/src/providers/all.ts` 中 `builtinProviders()` 当前返回的 **42** 个 runtime provider：factory 函数、id、auth/env、api/wire、coding-agent 默认模型、source 文件。集合相对上一 freeze 未增删 factory；`meta` / `typesafe` / `radius` 仍在表内。NVIDIA 默认模型改在 `defaultModelPerProvider`，不在 `nvidia.ts`。

## 能回答的问题

- `builtinProviders()` 当前返回多少个内置 provider，42 个 factory 函数各叫什么?
- 某个 provider id 用哪个 factory、哪组 auth/env、哪条 wire API?
- 某个 provider 在 coding-agent 的默认模型是什么? NVIDIA 默认写在哪一文件?
- runtime provider 集合与 generated `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` bucket 是否对齐?
- `meta`、`typesafe`、`radius` 分别挂哪条 chat / classifier / gateway API?
- `qwen-token-plan-individual` 与国际 Token Plan 如何共享密钥?

## Provider 集合口径

membership 只按 `builtinProviders()` 的 return array 计算：当前 **42** 个 fresh provider objects。相对 `ff72faba28` **没有**增删 factory 函数：`metaProvider()` 仍在 `kimiCodingProvider()` 与 `minimaxProvider()` 之间，`radiusProvider()` 仍在 Individual 与 Together 之间，`typesafeProvider()` 仍在 `togetherProvider()` 与 `vercelAIGatewayProvider()` 之间 [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:138] [E: packages/ai/src/providers/all.ts:154] [E: packages/ai/src/providers/all.ts:169] [E: packages/ai/src/providers/all.ts:171] [E: packages/ai/src/providers/all.ts:179]。

42 个 factory 调用（与下表 #1–#42 一一对应）：`amazonBedrockProvider`、`antLingProvider`、`anthropicProvider`、`azureOpenAIResponsesProvider`、`basetenProvider`、`cerebrasProvider`、`cloudflareAIGatewayProvider`、`cloudflareWorkersAIProvider`、`deepseekProvider`、`fireworksProvider`、`githubCopilotProvider`、`googleProvider`、`googleVertexProvider`、`groqProvider`、`huggingfaceProvider`、`kimiCodingProvider`、`metaProvider`、`minimaxProvider`、`minimaxCnProvider`、`mistralProvider`、`moonshotaiProvider`、`moonshotaiCnProvider`、`nvidiaProvider`、`openaiProvider`、`openaiCodexProvider`、`opencodeProvider`、`opencodeGoProvider`、`openrouterProvider`、`qwenTokenPlanProvider`、`qwenTokenPlanCnProvider`、`qwenTokenPlanIndividualProvider`、`radiusProvider`、`togetherProvider`、`typesafeProvider`、`vercelAIGatewayProvider`、`xaiProvider`、`xiaomiProvider`、`xiaomiTokenPlanAmsProvider`、`xiaomiTokenPlanCnProvider`、`xiaomiTokenPlanSgpProvider`、`zaiProvider`、`zaiCodingCnProvider` [E: packages/ai/src/providers/all.ts:138] [E: packages/ai/src/providers/all.ts:179]。

`faux.ts` 的 `faux` provider 与 coding-agent 扩展注册的 `llama.cpp` **都不**在 `builtinProviders()` 里。

generated `MODELS` 现在也是 **42** 个 static bucket（type 面从 `"amazon-bedrock"` 到 `"zai-coding-cn"`，含 `"meta"`、`"radius"`、`"typesafe"`）；value 面从 L91 到 L132。`BuiltinProvider = keyof typeof MODELS`。`KnownProvider` 同样是这 42 个 id（顺序不同，无额外成员）[E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/models.generated.ts:47] [E: packages/ai/src/models.generated.ts:64] [E: packages/ai/src/models.generated.ts:79] [E: packages/ai/src/models.generated.ts:81] [E: packages/ai/src/models.generated.ts:91] [E: packages/ai/src/models.generated.ts:107] [E: packages/ai/src/models.generated.ts:122] [E: packages/ai/src/models.generated.ts:124] [E: packages/ai/src/models.generated.ts:132] [E: packages/ai/src/types.ts:39] [E: packages/ai/src/types.ts:81]。`all.ts` 在 `BuiltinProvider` 上方仍写着 Radius 没有 static catalog 的过时注释；以 `MODELS["radius"]` 与 `RADIUS_MODELS` 为准 [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/models.generated.ts:79] [E: packages/ai/src/providers/radius.models.ts:7]。

不存在 `builtinImagesProviders()`。OpenRouter 图像 API 挂在同一个 `openrouterProvider()` 的 `images` map 上，不另计一行 [E: packages/ai/src/providers/openrouter.ts:32]。`IMAGE_MODELS` / `CLASSIFIER_MODELS` 也是同一组 42 个 bucket 键 [E: packages/ai/src/models.generated.ts:210] [E: packages/ai/src/models.generated.ts:257] [E: packages/ai/src/models.generated.ts:300]。

默认模型列来自 coding-agent `defaultModelPerProvider`，不是 `createProvider()` 字段。除 `radiusProvider()` 手写 `Provider<"pi-messages">` 外，其余 factory 走 `createProvider()`；`api` 在给了 `images` 或 `classifiers` 时可省略 [E: packages/coding-agent/src/core/model-resolver.ts:20] [E: packages/ai/src/models.ts:1019] [E: packages/ai/src/models.ts:1023] [E: packages/ai/src/models.ts:1034] [E: packages/ai/src/providers/radius.ts:22]。`typesafe` 是该 Partial record 里唯一缺席的 `KnownProvider`：classifier-only，没有 chat 默认模型 [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:14] [E: packages/coding-agent/src/core/model-resolver.ts:20] [E: packages/coding-agent/test/model-resolver.test.ts:728]。`envApiKeyAuth()` 的 stored credential key 优先，否则按传入 env var 顺序取第一个有值项 [E: packages/ai/src/auth/helpers.ts:9] [E: packages/ai/src/auth/helpers.ts:21] [E: packages/ai/src/auth/helpers.ts:23] [E: packages/ai/src/auth/helpers.ts:26]。

`qwen-token-plan` 与 `qwen-token-plan-individual` 共用 `QWEN_TOKEN_PLAN_API_KEY` 和同一新加坡 compatible-mode base URL；Individual 是更窄的 allowlist catalog，不是独立密钥 [E: packages/ai/src/providers/qwen-token-plan.ts:8] [E: packages/ai/src/providers/qwen-token-plan.ts:10] [E: packages/ai/src/providers/qwen-token-plan.ts:11] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/ai/src/env-api-keys.ts:86] [E: packages/ai/src/env-api-keys.ts:88]。

`xai` 走 Completions/Responses 单 API：factory 类型是 `Provider<"openai-responses">`，`api` 只挂 `openAIResponsesApi()`；coding-agent 默认模型是 `grok-4.7` [E: packages/ai/src/providers/xai.ts:7] [E: packages/ai/src/providers/xai.ts:22] [E: packages/coding-agent/src/core/model-resolver.ts:35]。

`opencode` / `opencode-go` 用 `withOpenCodeSessionHeader()` 包住每条 wire API。有 `sessionId` 时写入 `x-opencode-session`，不看 `cacheRetention`；caller 已用任意大小写提供同名 header 时不覆盖 [E: packages/ai/src/providers/opencode-headers.ts:3] [E: packages/ai/src/providers/opencode-headers.ts:10] [E: packages/ai/src/providers/opencode-headers.ts:11] [E: packages/ai/src/providers/opencode-headers.ts:19] [E: packages/ai/src/providers/opencode.ts:20] [E: packages/ai/src/providers/opencode-go.ts:16] [E: packages/ai/test/opencode-provider-headers.test.ts:56]。

## meta / typesafe / radius / NVIDIA 默认

`metaProvider()`：`id: "meta"`，`Provider<"openai-responses">`，base `https://api.meta.ai/v1`。auth 是 `META_API_KEY` via `envApiKeyAuth`，加上 lazy OAuth `Meta (Muse subscription)`。chat 只挂 `openAIResponsesApi()`。coding-agent 默认 `muse-spark-1.3` [E: packages/ai/src/providers/meta.ts:7] [E: packages/ai/src/providers/meta.ts:9] [E: packages/ai/src/providers/meta.ts:11] [E: packages/ai/src/providers/meta.ts:13] [E: packages/ai/src/providers/meta.ts:15] [E: packages/ai/src/providers/meta.ts:22] [E: packages/ai/src/env-api-keys.ts:116] [E: packages/coding-agent/src/core/model-resolver.ts:52]。

`typesafeProvider()`：classifier-only builtin。`models` 来自 `TYPESAFE_CLASSIFIER_MODELS`，`classifiers: { "typesafe-system-one": typesafeSystemOneApi() }`，**没有** chat `api` map。auth 是 `TYPESAFE_API_KEY`。同一 `typesafe-system-one` 协议还挂在 `openrouterProvider()`、`opencodeProvider()`、`vercelAIGatewayProvider()` 上；`cloudflare-workers-ai` 另挂 `cloudflare-workers-ai-system-one`。`llama-cpp-classify` 是 `KnownClassifierApi` 成员，但不是本表的 builtin provider [E: packages/ai/src/providers/typesafe.ts:6] [E: packages/ai/src/providers/typesafe.ts:11] [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:14] [E: packages/ai/src/providers/typesafe.ts:15] [E: packages/ai/src/env-api-keys.ts:98] [E: packages/ai/src/providers/openrouter.ts:34] [E: packages/ai/src/providers/opencode.ts:26] [E: packages/ai/src/providers/vercel-ai-gateway.ts:16] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:22] [E: packages/ai/src/types.ts:35]。

`radiusProvider()`：**不**走 `createProvider()`。默认 id/name 为 `radius` / `Radius`；默认 gateway `https://radius.pi.dev`。默认 gateway 把 `Object.values(RADIUS_MODELS)` 当 baseline，再与 `getRadiusModels` / `refreshModels` overlay 按 id 合并；自定义 gateway 的 baseline 为空。auth 是 `RADIUS_API_KEY` 或 Radius OAuth。wire 是 `pi-messages`。coding-agent 默认 `balanced`；登录后 catalog 若没有该 id，交互模式回退到该 provider 的第一个模型 [E: packages/ai/src/providers/radius.ts:22] [E: packages/ai/src/providers/radius.ts:26] [E: packages/ai/src/providers/radius.ts:28] [E: packages/ai/src/providers/radius.ts:31] [E: packages/ai/src/providers/radius.ts:37] [E: packages/ai/src/providers/radius.ts:38] [E: packages/ai/src/providers/radius.ts:40] [E: packages/ai/src/providers/radius.ts:49] [E: packages/ai/src/providers/radius.ts:93] [E: packages/ai/src/providers/radius.models.ts:7] [E: packages/ai/src/providers/radius-config.ts:4] [E: packages/coding-agent/src/core/model-resolver.ts:27] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6032] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6034]。

NVIDIA **默认模型不在 provider 文件里**。`nvidiaProvider()` 只声明 `id: "nvidia"`、`NVIDIA_API_KEY`、base `https://integrate.api.nvidia.com/v1` 和 `openai-completions`，没有 default-model 字段。coding-agent 默认已改为 `nvidia/nemotron-3-ultra-550b-a55b`（不再是 `nvidia/nemotron-3-super-120b-a12b`）[E: packages/ai/src/providers/nvidia.ts:6] [E: packages/ai/src/providers/nvidia.ts:10] [E: packages/ai/src/providers/nvidia.ts:11] [E: packages/ai/src/providers/nvidia.ts:13] [E: packages/coding-agent/src/core/model-resolver.ts:28]。

## 内置 provider 逐实例目录

| # | id / name | auth/env | api/wire | 默认模型 | source |
|---:|---|---|---|---|---|
| 1 | `amazon-bedrock` / `Amazon Bedrock` | `bedrockAuth`：stored bearer，或 `AWS_BEARER_TOKEN_BEDROCK` / `AWS_PROFILE` / access-key pair / ECS / IRSA 环境信号 [E: packages/ai/src/providers/amazon-bedrock.ts:11] [E: packages/ai/src/providers/amazon-bedrock.ts:61] [E: packages/ai/src/providers/amazon-bedrock.ts:64] [E: packages/ai/src/providers/amazon-bedrock.ts:65] [E: packages/ai/src/providers/amazon-bedrock.ts:72] [E: packages/ai/src/providers/amazon-bedrock.ts:75] [E: packages/ai/src/providers/amazon-bedrock.ts:76] [E: packages/ai/src/providers/amazon-bedrock.ts:77] | `bedrock-converse-stream` via `bedrockConverseStreamApi()` [E: packages/ai/src/providers/amazon-bedrock.ts:88] | `us.anthropic.claude-opus-4-6-v1` [E: packages/coding-agent/src/core/model-resolver.ts:21] | `packages/ai/src/providers/amazon-bedrock.ts` [E: packages/ai/src/providers/all.ts:138] |
| 2 | `ant-ling` / `Ant Ling` | `ANT_LING_API_KEY` via `envApiKeyAuth`；base `https://api.ant-ling.com/v1` [E: packages/ai/src/providers/ant-ling.ts:10] [E: packages/ai/src/providers/ant-ling.ts:11] | `openai-completions` [E: packages/ai/src/providers/ant-ling.ts:13] | `Ring-2.6-1T` [E: packages/coding-agent/src/core/model-resolver.ts:22] | `packages/ai/src/providers/ant-ling.ts` [E: packages/ai/src/providers/all.ts:139] |
| 3 | `anthropic` / `Anthropic` | stored credential → `ANTHROPIC_AUTH_TOKEN` Bearer header → `ANTHROPIC_OAUTH_TOKEN` / `ANTHROPIC_API_KEY` → workload identity federation（`ANTHROPIC_FEDERATION_RULE_ID` + org + identity token file）；另有 lazy OAuth `Anthropic (Claude Pro/Max)`；base `https://api.anthropic.com` [E: packages/ai/src/providers/anthropic.ts:30] [E: packages/ai/src/providers/anthropic.ts:34] [E: packages/ai/src/providers/anthropic.ts:38] [E: packages/ai/src/providers/anthropic.ts:43] [E: packages/ai/src/providers/anthropic.ts:69] [E: packages/ai/src/providers/anthropic.ts:81] | `anthropic-messages` [E: packages/ai/src/providers/anthropic.ts:88] | `claude-opus-4-8` [E: packages/coding-agent/src/core/model-resolver.ts:23] | `packages/ai/src/providers/anthropic.ts` [E: packages/ai/src/providers/all.ts:140] |
| 4 | `azure-openai-responses` / `Azure OpenAI` | `AZURE_OPENAI_API_KEY` via `envApiKeyAuth`；endpoint/version 由 API 层从 options/env/model base URL 解析 [E: packages/ai/src/providers/azure-openai-responses.ts:9] | `azure-openai-responses` [E: packages/ai/src/providers/azure-openai-responses.ts:12] | `gpt-5.4` [E: packages/coding-agent/src/core/model-resolver.ts:25] | `packages/ai/src/providers/azure-openai-responses.ts` [E: packages/ai/src/providers/all.ts:141] |
| 5 | `baseten` / `Baseten` | `BASETEN_API_KEY`；base `https://inference.baseten.co/v1` [E: packages/ai/src/providers/baseten.ts:10] [E: packages/ai/src/providers/baseten.ts:11] | `openai-completions` [E: packages/ai/src/providers/baseten.ts:13] | `zai-org/GLM-5.2` [E: packages/coding-agent/src/core/model-resolver.ts:48] | `packages/ai/src/providers/baseten.ts` [E: packages/ai/src/providers/all.ts:142] |
| 6 | `cerebras` / `Cerebras` | `CEREBRAS_API_KEY`；base `https://api.cerebras.ai/v1` [E: packages/ai/src/providers/cerebras.ts:10] [E: packages/ai/src/providers/cerebras.ts:11] | `openai-completions` [E: packages/ai/src/providers/cerebras.ts:13] | `gpt-oss-120b` [E: packages/coding-agent/src/core/model-resolver.ts:37] | `packages/ai/src/providers/cerebras.ts` [E: packages/ai/src/providers/all.ts:143] |
| 7 | `cloudflare-ai-gateway` / `Cloudflare AI Gateway` | `cloudflareAIGatewayAuth()`：`CLOUDFLARE_API_KEY` + account/gateway env [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:19] [E: packages/ai/src/env-api-keys.ts:118] | API map：`anthropic-messages` / `openai-completions` / `openai-responses`，均经 `cloudflareStreams()` [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:21] [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:22] [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:23] [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:24] | `workers-ai/@cf/moonshotai/kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:54] | `packages/ai/src/providers/cloudflare-ai-gateway.ts` [E: packages/ai/src/providers/all.ts:144] |
| 8 | `cloudflare-workers-ai` / `Cloudflare Workers AI` | `cloudflareWorkersAIAuth()`：`CLOUDFLARE_API_KEY` + account env [E: packages/ai/src/providers/cloudflare-workers-ai.ts:15] [E: packages/ai/src/env-api-keys.ts:117] | chat `openai-completions` via `cloudflareStreams()`；classifier map `cloudflare-workers-ai-system-one` [E: packages/ai/src/providers/cloudflare-workers-ai.ts:20] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:21] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:22] | `@cf/moonshotai/kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:53] | `packages/ai/src/providers/cloudflare-workers-ai.ts` [E: packages/ai/src/providers/all.ts:145] |
| 9 | `deepseek` / `DeepSeek` | `DEEPSEEK_API_KEY`；base `https://api.deepseek.com` [E: packages/ai/src/providers/deepseek.ts:10] [E: packages/ai/src/providers/deepseek.ts:11] | `openai-completions` [E: packages/ai/src/providers/deepseek.ts:13] | `deepseek-v4-pro` [E: packages/coding-agent/src/core/model-resolver.ts:29] | `packages/ai/src/providers/deepseek.ts` [E: packages/ai/src/providers/all.ts:146] |
| 10 | `fireworks` / `Fireworks` | `FIREWORKS_API_KEY`；base `https://api.fireworks.ai/inference` [E: packages/ai/src/providers/fireworks.ts:10] [E: packages/ai/src/providers/fireworks.ts:12] | API map：`anthropic-messages` / `openai-completions` [E: packages/ai/src/providers/fireworks.ts:15] [E: packages/ai/src/providers/fireworks.ts:16] | `accounts/fireworks/models/kimi-k3` [E: packages/coding-agent/src/core/model-resolver.ts:46] | `packages/ai/src/providers/fireworks.ts` [E: packages/ai/src/providers/all.ts:147] |
| 11 | `github-copilot` / `GitHub Copilot` | `COPILOT_GITHUB_TOKEN` + lazy OAuth `GitHub Copilot`；base `https://api.individual.githubcopilot.com`；OAuth credential 可按 `availableModelIds` 过滤 [E: packages/ai/src/providers/github-copilot.ts:13] [E: packages/ai/src/providers/github-copilot.ts:15] [E: packages/ai/src/providers/github-copilot.ts:16] [E: packages/ai/src/providers/github-copilot.ts:19] | API map：`anthropic-messages` / `openai-completions` / `openai-responses` [E: packages/ai/src/providers/github-copilot.ts:29] [E: packages/ai/src/providers/github-copilot.ts:30] [E: packages/ai/src/providers/github-copilot.ts:31] | `gpt-5.4` [E: packages/coding-agent/src/core/model-resolver.ts:32] | `packages/ai/src/providers/github-copilot.ts` [E: packages/ai/src/providers/all.ts:148] |
| 12 | `google` / `Google` | `GEMINI_API_KEY`；base `https://generativelanguage.googleapis.com/v1beta` [E: packages/ai/src/providers/google.ts:10] [E: packages/ai/src/providers/google.ts:11] | `google-generative-ai` [E: packages/ai/src/providers/google.ts:13] | `gemini-3.1-pro-preview` [E: packages/coding-agent/src/core/model-resolver.ts:30] | `packages/ai/src/providers/google.ts` [E: packages/ai/src/providers/all.ts:149] |
| 13 | `google-vertex` / `Google Vertex AI` | `GOOGLE_CLOUD_API_KEY`，或 ADC / service-account 文件 + project/location env [E: packages/ai/src/providers/google-vertex.ts:13] [E: packages/ai/src/providers/google-vertex.ts:23] [E: packages/ai/src/providers/google-vertex.ts:71] [E: packages/ai/src/env-api-keys.ts:94] | `google-vertex` [E: packages/ai/src/providers/google-vertex.ts:98] | `gemini-3.1-pro-preview` [E: packages/coding-agent/src/core/model-resolver.ts:31] | `packages/ai/src/providers/google-vertex.ts` [E: packages/ai/src/providers/all.ts:150] |
| 14 | `groq` / `Groq` | `GROQ_API_KEY`；base `https://api.groq.com/openai/v1` [E: packages/ai/src/providers/groq.ts:10] [E: packages/ai/src/providers/groq.ts:11] | `openai-completions` [E: packages/ai/src/providers/groq.ts:13] | `openai/gpt-oss-120b` [E: packages/coding-agent/src/core/model-resolver.ts:36] | `packages/ai/src/providers/groq.ts` [E: packages/ai/src/providers/all.ts:151] |
| 15 | `huggingface` / `Hugging Face` | `HF_TOKEN`；base `https://router.huggingface.co/v1` [E: packages/ai/src/providers/huggingface.ts:10] [E: packages/ai/src/providers/huggingface.ts:11] | `openai-completions` [E: packages/ai/src/providers/huggingface.ts:13] | `moonshotai/Kimi-K2.6` [E: packages/coding-agent/src/core/model-resolver.ts:45] | `packages/ai/src/providers/huggingface.ts` [E: packages/ai/src/providers/all.ts:152] |
| 16 | `kimi-coding` / `Kimi For Coding` | `KIMI_API_KEY` 或 lazy OAuth `Kimi Code (subscription)`；base `https://api.kimi.com/coding` [E: packages/ai/src/providers/kimi-coding.ts:11] [E: packages/ai/src/providers/kimi-coding.ts:13] [E: packages/ai/src/providers/kimi-coding.ts:15] | `anthropic-messages` [E: packages/ai/src/providers/kimi-coding.ts:22] | `kimi-for-coding` [E: packages/coding-agent/src/core/model-resolver.ts:51] | `packages/ai/src/providers/kimi-coding.ts` [E: packages/ai/src/providers/all.ts:153] |
| 17 | `meta` / `Meta` | `META_API_KEY` via `envApiKeyAuth`，或 lazy OAuth `Meta (Muse subscription)`；base `https://api.meta.ai/v1` [E: packages/ai/src/providers/meta.ts:10] [E: packages/ai/src/providers/meta.ts:11] [E: packages/ai/src/providers/meta.ts:13] [E: packages/ai/src/providers/meta.ts:15] [E: packages/ai/src/env-api-keys.ts:116] | `openai-responses` via `openAIResponsesApi()` [E: packages/ai/src/providers/meta.ts:7] [E: packages/ai/src/providers/meta.ts:22] | `muse-spark-1.3` [E: packages/coding-agent/src/core/model-resolver.ts:52] | `packages/ai/src/providers/meta.ts` [E: packages/ai/src/providers/all.ts:154] |
| 18 | `minimax` / `MiniMax` | `MINIMAX_API_KEY`；base `https://api.minimax.io/anthropic` [E: packages/ai/src/providers/minimax.ts:10] [E: packages/ai/src/providers/minimax.ts:11] | `anthropic-messages` [E: packages/ai/src/providers/minimax.ts:13] | `MiniMax-M2.7` [E: packages/coding-agent/src/core/model-resolver.ts:41] | `packages/ai/src/providers/minimax.ts` [E: packages/ai/src/providers/all.ts:155] |
| 19 | `minimax-cn` / `MiniMax CN` | `MINIMAX_CN_API_KEY`；base `https://api.minimaxi.com/anthropic` [E: packages/ai/src/providers/minimax-cn.ts:10] [E: packages/ai/src/providers/minimax-cn.ts:11] | `anthropic-messages` [E: packages/ai/src/providers/minimax-cn.ts:13] | `MiniMax-M2.7` [E: packages/coding-agent/src/core/model-resolver.ts:42] | `packages/ai/src/providers/minimax-cn.ts` [E: packages/ai/src/providers/all.ts:156] |
| 20 | `mistral` / `Mistral` | `MISTRAL_API_KEY`；base `https://api.mistral.ai` [E: packages/ai/src/providers/mistral.ts:10] [E: packages/ai/src/providers/mistral.ts:11] | `mistral-conversations` [E: packages/ai/src/providers/mistral.ts:13] | `devstral-medium-latest` [E: packages/coding-agent/src/core/model-resolver.ts:40] | `packages/ai/src/providers/mistral.ts` [E: packages/ai/src/providers/all.ts:157] |
| 21 | `moonshotai` / `Moonshot AI` | `MOONSHOT_API_KEY`；base `https://api.moonshot.ai/v1` [E: packages/ai/src/providers/moonshotai.ts:10] [E: packages/ai/src/providers/moonshotai.ts:11] | `openai-completions` [E: packages/ai/src/providers/moonshotai.ts:13] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:43] | `packages/ai/src/providers/moonshotai.ts` [E: packages/ai/src/providers/all.ts:158] |
| 22 | `moonshotai-cn` / `Moonshot AI CN` | 共享 `MOONSHOT_API_KEY`；base `https://api.moonshot.cn/v1` [E: packages/ai/src/providers/moonshotai-cn.ts:10] [E: packages/ai/src/providers/moonshotai-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/moonshotai-cn.ts:13] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:44] | `packages/ai/src/providers/moonshotai-cn.ts` [E: packages/ai/src/providers/all.ts:159] |
| 23 | `nvidia` / `NVIDIA` | `NVIDIA_API_KEY`；base `https://integrate.api.nvidia.com/v1`。factory **没有** default-model 字段 [E: packages/ai/src/providers/nvidia.ts:10] [E: packages/ai/src/providers/nvidia.ts:11] [E: packages/ai/src/providers/nvidia.ts:13] | `openai-completions` [E: packages/ai/src/providers/nvidia.ts:13] | `nvidia/nemotron-3-ultra-550b-a55b`（写在 `defaultModelPerProvider`，不在 `nvidia.ts`） [E: packages/coding-agent/src/core/model-resolver.ts:28] | `packages/ai/src/providers/nvidia.ts` [E: packages/ai/src/providers/all.ts:160] |
| 24 | `openai` / `OpenAI` | `OPENAI_API_KEY` **以及** lazy OAuth `OpenAI (ChatGPT subscription)` / `Sign in with ChatGPT`；base `https://api.openai.com/v1` [E: packages/ai/src/providers/openai.ts:11] [E: packages/ai/src/providers/openai.ts:13] [E: packages/ai/src/providers/openai.ts:15] [E: packages/ai/src/providers/openai.ts:17] | `openai-responses` [E: packages/ai/src/providers/openai.ts:22] | `gpt-5.5` [E: packages/coding-agent/src/core/model-resolver.ts:24] | `packages/ai/src/providers/openai.ts` [E: packages/ai/src/providers/all.ts:161] |
| 25 | `openai-codex` / `OpenAI Codex (legacy)` | 仅 lazy OAuth `OpenAI (ChatGPT Plus/Pro)`，无 api-key auth 项；base `https://chatgpt.com/backend-api` [E: packages/ai/src/providers/openai-codex.ts:10] [E: packages/ai/src/providers/openai-codex.ts:12] [E: packages/ai/src/providers/openai-codex.ts:14] | `openai-codex-responses` [E: packages/ai/src/providers/openai-codex.ts:20] | `gpt-6.1-sol` [E: packages/coding-agent/src/core/model-resolver.ts:26] | `packages/ai/src/providers/openai-codex.ts` [E: packages/ai/src/providers/all.ts:162] |
| 26 | `opencode` / `OpenCode Zen` | `OPENCODE_API_KEY` [E: packages/ai/src/providers/opencode.ts:17] | chat API map：`anthropic-messages` / `google-generative-ai` / `openai-completions` / `openai-responses`，每条经 `withOpenCodeSessionHeader`；`classifiers: { "typesafe-system-one": typesafeSystemOneApi() }`；models 含 `OPENCODE_CLASSIFIER_MODELS` [E: packages/ai/src/providers/opencode.ts:18] [E: packages/ai/src/providers/opencode.ts:20] [E: packages/ai/src/providers/opencode.ts:21] [E: packages/ai/src/providers/opencode.ts:22] [E: packages/ai/src/providers/opencode.ts:23] [E: packages/ai/src/providers/opencode.ts:26] [E: packages/ai/src/providers/opencode-headers.ts:3] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:49] | `packages/ai/src/providers/opencode.ts` [E: packages/ai/src/providers/all.ts:163] |
| 27 | `opencode-go` / `OpenCode Go` | 共享 `OPENCODE_API_KEY` [E: packages/ai/src/providers/opencode-go.ts:13] | API map：`anthropic-messages` / `openai-completions` / `openai-responses`（无 google-generative-ai），同样经 `withOpenCodeSessionHeader` [E: packages/ai/src/providers/opencode-go.ts:16] [E: packages/ai/src/providers/opencode-go.ts:17] [E: packages/ai/src/providers/opencode-go.ts:18] [E: packages/ai/src/providers/opencode-headers.ts:19] | `kimi-k3` [E: packages/coding-agent/src/core/model-resolver.ts:50] | `packages/ai/src/providers/opencode-go.ts` [E: packages/ai/src/providers/all.ts:164] |
| 28 | `openrouter` / `OpenRouter` | `OPENROUTER_API_KEY` 或 lazy `OpenRouter OAuth`；base `https://openrouter.ai/api/v1` [E: packages/ai/src/providers/openrouter.ts:13] [E: packages/ai/src/providers/openrouter.ts:16] [E: packages/ai/src/providers/openrouter.ts:18] | chat API map：`anthropic-messages` / `openai-completions`；`images: { "openrouter-images": openrouterImagesApi() }`；`classifiers: { "typesafe-system-one": typesafeSystemOneApi() }` [E: packages/ai/src/providers/openrouter.ts:28] [E: packages/ai/src/providers/openrouter.ts:29] [E: packages/ai/src/providers/openrouter.ts:30] [E: packages/ai/src/providers/openrouter.ts:32] [E: packages/ai/src/providers/openrouter.ts:34] | `moonshotai/kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:33] | `packages/ai/src/providers/openrouter.ts` [E: packages/ai/src/providers/all.ts:165] |
| 29 | `qwen-token-plan` / `Qwen Token Plan` | `QWEN_TOKEN_PLAN_API_KEY`；base `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` [E: packages/ai/src/providers/qwen-token-plan.ts:10] [E: packages/ai/src/providers/qwen-token-plan.ts:11] | `openai-completions` [E: packages/ai/src/providers/qwen-token-plan.ts:13] | `qwen3.7-max` [E: packages/coding-agent/src/core/model-resolver.ts:55] | `packages/ai/src/providers/qwen-token-plan.ts` [E: packages/ai/src/providers/all.ts:166] |
| 30 | `qwen-token-plan-cn` / `Qwen Token Plan CN` | `QWEN_TOKEN_PLAN_CN_API_KEY`；base `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` [E: packages/ai/src/providers/qwen-token-plan-cn.ts:10] [E: packages/ai/src/providers/qwen-token-plan-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/qwen-token-plan-cn.ts:13] | `qwen3.7-max` [E: packages/coding-agent/src/core/model-resolver.ts:56] | `packages/ai/src/providers/qwen-token-plan-cn.ts` [E: packages/ai/src/providers/all.ts:167] |
| 31 | `qwen-token-plan-individual` / `Qwen Token Plan Individual` | 与国际 Token Plan **共享** `QWEN_TOKEN_PLAN_API_KEY` 和同一新加坡 base URL；独立 id 与更窄 catalog [E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/ai/src/env-api-keys.ts:88] | `openai-completions` [E: packages/ai/src/providers/qwen-token-plan-individual.ts:13] | `qwen3.8-max` [E: packages/coding-agent/src/core/model-resolver.ts:57] | `packages/ai/src/providers/qwen-token-plan-individual.ts` [E: packages/ai/src/providers/all.ts:168] |
| 32 | `radius` / `Radius` | `RADIUS_API_KEY` 或 Radius OAuth；默认 gateway `https://radius.pi.dev` 时用 static `RADIUS_MODELS` 作 baseline，再与 gateway `refreshModels` overlay 合并；自定义 gateway baseline 为空 [E: packages/ai/src/providers/radius.ts:26] [E: packages/ai/src/providers/radius.ts:37] [E: packages/ai/src/providers/radius.ts:38] [E: packages/ai/src/providers/radius.ts:49] [E: packages/ai/src/providers/radius.models.ts:7] [E: packages/ai/src/providers/radius-config.ts:4] | `pi-messages`（手写 `Provider`，不走 `createProvider`） [E: packages/ai/src/providers/radius.ts:22] [E: packages/ai/src/providers/radius.ts:31] [E: packages/ai/src/providers/radius.ts:93] | `balanced`；登录后若 catalog 没有该 id，用该 provider 第一个模型 [E: packages/coding-agent/src/core/model-resolver.ts:27] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6032] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6034] | `packages/ai/src/providers/radius.ts` [E: packages/ai/src/providers/all.ts:169] |
| 33 | `together` / `Together` | `TOGETHER_API_KEY`；base `https://api.together.ai/v1` [E: packages/ai/src/providers/together.ts:10] [E: packages/ai/src/providers/together.ts:11] | `openai-completions` [E: packages/ai/src/providers/together.ts:13] | `moonshotai/Kimi-K3` [E: packages/coding-agent/src/core/model-resolver.ts:47] | `packages/ai/src/providers/together.ts` [E: packages/ai/src/providers/all.ts:170] |
| 34 | `typesafe` / `TypeSafe` | `TYPESAFE_API_KEY` via `envApiKeyAuth` [E: packages/ai/src/providers/typesafe.ts:11] [E: packages/ai/src/env-api-keys.ts:98] | classifier-only：`classifiers: { "typesafe-system-one": typesafeSystemOneApi() }`；`models` 来自 `TYPESAFE_CLASSIFIER_MODELS`，无 chat `api` map [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:14] [E: packages/ai/src/providers/typesafe.ts:15] | unset：`defaultModelPerProvider` 无 `typesafe` 键；无 chat catalog 的 builtin 不得有 chat 默认 [E: packages/coding-agent/test/model-resolver.test.ts:728] | `packages/ai/src/providers/typesafe.ts` [E: packages/ai/src/providers/all.ts:171] |
| 35 | `vercel-ai-gateway` / `Vercel AI Gateway` | `AI_GATEWAY_API_KEY`；base `https://ai-gateway.vercel.sh` [E: packages/ai/src/providers/vercel-ai-gateway.ts:11] [E: packages/ai/src/providers/vercel-ai-gateway.ts:12] | chat `anthropic-messages`；models 含 `VERCEL_AI_GATEWAY_CLASSIFIER_MODELS`；`classifiers: { "typesafe-system-one": typesafeSystemOneApi() }` [E: packages/ai/src/providers/vercel-ai-gateway.ts:13] [E: packages/ai/src/providers/vercel-ai-gateway.ts:14] [E: packages/ai/src/providers/vercel-ai-gateway.ts:16] | `zai/glm-5.1` [E: packages/coding-agent/src/core/model-resolver.ts:34] | `packages/ai/src/providers/vercel-ai-gateway.ts` [E: packages/ai/src/providers/all.ts:172] |
| 36 | `xai` / `xAI` | `XAI_API_KEY` 或 lazy OAuth `xAI (Grok/X subscription)`；base `https://api.x.ai/v1` [E: packages/ai/src/providers/xai.ts:11] [E: packages/ai/src/providers/xai.ts:13] [E: packages/ai/src/providers/xai.ts:15] | `openai-responses` via `openAIResponsesApi()` [E: packages/ai/src/providers/xai.ts:7] [E: packages/ai/src/providers/xai.ts:22] | `grok-4.7` [E: packages/coding-agent/src/core/model-resolver.ts:35] | `packages/ai/src/providers/xai.ts` [E: packages/ai/src/providers/all.ts:173] |
| 37 | `xiaomi` / `Xiaomi` | `XIAOMI_API_KEY`；base `https://api.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi.ts:10] [E: packages/ai/src/providers/xiaomi.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:58] | `packages/ai/src/providers/xiaomi.ts` [E: packages/ai/src/providers/all.ts:174] |
| 38 | `xiaomi-token-plan-ams` / `Xiaomi Token Plan AMS` | `XIAOMI_TOKEN_PLAN_AMS_API_KEY`；base `https://token-plan-ams.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi-token-plan-ams.ts:10] [E: packages/ai/src/providers/xiaomi-token-plan-ams.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi-token-plan-ams.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:60] | `packages/ai/src/providers/xiaomi-token-plan-ams.ts` [E: packages/ai/src/providers/all.ts:175] |
| 39 | `xiaomi-token-plan-cn` / `Xiaomi Token Plan CN` | `XIAOMI_TOKEN_PLAN_CN_API_KEY`；base `https://token-plan-cn.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi-token-plan-cn.ts:10] [E: packages/ai/src/providers/xiaomi-token-plan-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi-token-plan-cn.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:59] | `packages/ai/src/providers/xiaomi-token-plan-cn.ts` [E: packages/ai/src/providers/all.ts:176] |
| 40 | `xiaomi-token-plan-sgp` / `Xiaomi Token Plan SGP` | `XIAOMI_TOKEN_PLAN_SGP_API_KEY`；base `https://token-plan-sgp.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi-token-plan-sgp.ts:10] [E: packages/ai/src/providers/xiaomi-token-plan-sgp.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi-token-plan-sgp.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:61] | `packages/ai/src/providers/xiaomi-token-plan-sgp.ts` [E: packages/ai/src/providers/all.ts:177] |
| 41 | `zai` / `Z.AI` | `ZAI_API_KEY`；base `https://api.z.ai/api/coding/paas/v4` [E: packages/ai/src/providers/zai.ts:10] [E: packages/ai/src/providers/zai.ts:11] | `openai-completions` [E: packages/ai/src/providers/zai.ts:13] | `glm-5.3` [E: packages/coding-agent/src/core/model-resolver.ts:38] | `packages/ai/src/providers/zai.ts` [E: packages/ai/src/providers/all.ts:178] |
| 42 | `zai-coding-cn` / `Z.AI Coding CN` | `ZAI_CODING_CN_API_KEY`；base `https://open.bigmodel.cn/api/coding/paas/v4` [E: packages/ai/src/providers/zai-coding-cn.ts:10] [E: packages/ai/src/providers/zai-coding-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/zai-coding-cn.ts:13] | `glm-5.3` [E: packages/coding-agent/src/core/model-resolver.ts:39] | `packages/ai/src/providers/zai-coding-cn.ts` [E: packages/ai/src/providers/all.ts:179] |

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts
- packages/ai/src/models.generated.ts
- packages/ai/src/types.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/env-api-keys.ts
- packages/coding-agent/src/core/model-resolver.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/test/model-resolver.test.ts
- packages/ai/src/providers/amazon-bedrock.ts
- packages/ai/src/providers/ant-ling.ts
- packages/ai/src/providers/anthropic.ts
- packages/ai/src/providers/azure-openai-responses.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/cerebras.ts
- packages/ai/src/providers/cloudflare-ai-gateway.ts
- packages/ai/src/providers/cloudflare-auth.ts
- packages/ai/src/providers/cloudflare-workers-ai.ts
- packages/ai/src/providers/deepseek.ts
- packages/ai/src/providers/fireworks.ts
- packages/ai/src/providers/github-copilot.ts
- packages/ai/src/providers/google.ts
- packages/ai/src/providers/google-vertex.ts
- packages/ai/src/providers/groq.ts
- packages/ai/src/providers/huggingface.ts
- packages/ai/src/providers/kimi-coding.ts
- packages/ai/src/providers/meta.ts
- packages/ai/src/providers/minimax.ts
- packages/ai/src/providers/minimax-cn.ts
- packages/ai/src/providers/mistral.ts
- packages/ai/src/providers/moonshotai.ts
- packages/ai/src/providers/moonshotai-cn.ts
- packages/ai/src/providers/nvidia.ts
- packages/ai/src/providers/openai.ts
- packages/ai/src/providers/openai-codex.ts
- packages/ai/src/providers/opencode.ts
- packages/ai/src/providers/opencode-go.ts
- packages/ai/src/providers/opencode-headers.ts
- packages/ai/test/opencode-provider-headers.test.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/providers/qwen-token-plan.ts
- packages/ai/src/providers/qwen-token-plan-cn.ts
- packages/ai/src/providers/qwen-token-plan-individual.ts
- packages/ai/src/providers/radius.ts
- packages/ai/src/providers/radius.models.ts
- packages/ai/src/providers/radius-config.ts
- packages/ai/src/providers/together.ts
- packages/ai/src/providers/typesafe.ts
- packages/ai/src/providers/vercel-ai-gateway.ts
- packages/ai/src/providers/xai.ts
- packages/ai/src/providers/xiaomi.ts
- packages/ai/src/providers/xiaomi-token-plan-ams.ts
- packages/ai/src/providers/xiaomi-token-plan-cn.ts
- packages/ai/src/providers/xiaomi-token-plan-sgp.ts
- packages/ai/src/providers/zai.ts
- packages/ai/src/providers/zai-coding-cn.ts

## 相关

- [subsys.ai.provider-registry](../subsystems/ai/provider-registry.md): provider registry 说明 `builtinProviders()` 如何进入 `builtinModels()` 和 runtime `Models` collection。
- [surface.providers.overview](../surface/providers/overview.md): provider 选择与配置的用户可见面入口。
- [ref.ai.model-catalog](model-catalog.md): 42 个 generated `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` structural shard。
- [subsys.coding-agent.model-resolver](../subsystems/coding-agent/model-resolver.md): `defaultModelPerProvider` 与初始模型选择。
- [surface.providers.auth](../surface/providers/auth.md): OAuth / api-key 登录与 credential 解析。
- [subsys.ai.classifiers](../subsystems/ai/classifiers.md): `typesafe-system-one` / Cloudflare Clef / `llama-cpp-classify`。
