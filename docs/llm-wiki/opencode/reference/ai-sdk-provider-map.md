---
id: ref.ai-sdk-provider-map
title: AI SDK Provider Map
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/provider/provider.ts
status: verified
updated: 92c70c9c3
evidence: explicit
symbols:
  - BUNDLED_PROVIDERS
  - custom
  - Provider.Service
  - resolveSDK
related:
  - model-layer.provider-registry-v1
---

# AI SDK Provider Map

本节点只描述 V1 provider registry 的 AI SDK map。V1 当前活跑 provider path 在 `packages/opencode/src/provider/provider.ts`：它从 `models.dev` catalog、config、env、auth 和 plugins 合成 provider/model 数据，再用 `BUNDLED_PROVIDERS` 或 npm dynamic import 创建 AI SDK provider instance。[E: packages/opencode/src/provider/provider.ts:1272] [E: packages/opencode/src/provider/provider.ts:1287] [E: packages/opencode/src/provider/provider.ts:1706]

## Provider Model Schema

V1 `Model` 记录含 `id/providerID/api/name/family/capabilities/cost/limit/status/options/headers/release_date/variants`。[E: packages/opencode/src/provider/provider.ts:1005] [E: packages/opencode/src/provider/provider.ts:1018] `Info` 记录含 `id/name/source/env/key/options/models`，source 只能是 `env/config/custom/api`。[E: packages/opencode/src/provider/provider.ts:1022] [E: packages/opencode/src/provider/provider.ts:1030]

## Bundled Providers

本 HEAD 的 `BUNDLED_PROVIDERS` 明确列出 24 个 npm specifier。命中 bundled loader 时，`resolveSDK` 直接 dynamic import bundled factory 并缓存 SDK；未命中时才调用 `Npm.add(model.api.npm)` 安装/解析外部 package。[E: packages/opencode/src/provider/provider.ts:107] [E: packages/opencode/src/provider/provider.ts:133] [E: packages/opencode/src/provider/provider.ts:1706] [E: packages/opencode/src/provider/provider.ts:1717]

| NPM specifier | Factory | 特殊说明 |
| --- | --- | --- |
| `@ai-sdk/amazon-bedrock` | `createAmazonBedrock` | standard Bedrock loader。[E: packages/opencode/src/provider/provider.ts:108] |
| `@ai-sdk/amazon-bedrock/mantle` | `createBedrockMantle` | Mantle loader；custom Bedrock model selection 会优先 responses，safeguard 模型走 chat。[E: packages/opencode/src/provider/provider.ts:109] [E: packages/opencode/src/provider/provider.ts:162] |
| `@ai-sdk/anthropic` | `createAnthropic` | custom loader adds Anthropic beta headers。[E: packages/opencode/src/provider/provider.ts:110] [E: packages/opencode/src/provider/provider.ts:173] |
| `@ai-sdk/azure` | `createAzure` | Azure custom loader 选择 chat/responses/messages/languageModel。[E: packages/opencode/src/provider/provider.ts:111] [E: packages/opencode/src/provider/provider.ts:154] |
| `@ai-sdk/google` | `createGoogleGenerativeAI` | Google AI Studio provider。[E: packages/opencode/src/provider/provider.ts:112] |
| `@ai-sdk/google-vertex` | `createVertex` | Vertex loader；custom loader injects ADC fetch/token。[E: packages/opencode/src/provider/provider.ts:113] [E: packages/opencode/src/provider/provider.ts:519] |
| `@ai-sdk/google-vertex/anthropic` | `createVertexAnthropic` | Vertex Anthropic loader。[E: packages/opencode/src/provider/provider.ts:114] |
| `@ai-sdk/openai` | `createOpenAI` | OpenAI custom loader uses responses model and default header timeout。[E: packages/opencode/src/provider/provider.ts:116] [E: packages/opencode/src/provider/provider.ts:205] |
| `@ai-sdk/openai-compatible` | `createOpenAICompatible` | compatible providers default `includeUsage=true` unless disabled。[E: packages/opencode/src/provider/provider.ts:117] [E: packages/opencode/src/provider/provider.ts:1630] |
| `@openrouter/ai-sdk-provider` | `createOpenRouter` | custom loader adds `HTTP-Referer` and `X-Title` headers。[E: packages/opencode/src/provider/provider.ts:118] [E: packages/opencode/src/provider/provider.ts:454] |
| `@ai-sdk/xai` | `createXai` | xAI custom loader uses responses model。[E: packages/opencode/src/provider/provider.ts:119] [E: packages/opencode/src/provider/provider.ts:213] |
| `@ai-sdk/mistral` | `createMistral` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:120] |
| `@ai-sdk/groq` | `createGroq` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:121] |
| `@ai-sdk/deepinfra` | `createDeepInfra` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:122] |
| `@ai-sdk/cerebras` | `createCerebras` | custom loader adds integration header。[E: packages/opencode/src/provider/provider.ts:123] [E: packages/opencode/src/provider/provider.ts:830] |
| `@ai-sdk/cohere` | `createCohere` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:124] |
| `@ai-sdk/gateway` | `createGateway` | bundled Vercel AI Gateway provider。[E: packages/opencode/src/provider/provider.ts:125] |
| `@ai-sdk/togetherai` | `createTogetherAI` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:126] |
| `@ai-sdk/perplexity` | `createPerplexity` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:127] |
| `@ai-sdk/vercel` | `createVercel` | custom loader adds lower-case referer/title headers。[E: packages/opencode/src/provider/provider.ts:128] [E: packages/opencode/src/provider/provider.ts:475] |
| `@ai-sdk/alibaba` | `createAlibaba` | bundled Alibaba provider。[E: packages/opencode/src/provider/provider.ts:129] |
| `gitlab-ai-provider` | `createGitLab` | custom GitLab loader supports agenticChat/workflowChat and workflow discovery。[E: packages/opencode/src/provider/provider.ts:130] [E: packages/opencode/src/provider/provider.ts:591] |
| `@ai-sdk/github-copilot` | `createOpenaiCompatible` from core copilot provider | Bundled specifier imports `@opencode-ai/core/github-copilot/copilot-provider` instead of external `@ai-sdk/github-copilot` package factory。[E: packages/opencode/src/provider/provider.ts:131] |
| `venice-ai-sdk-provider` | `createVenice` | bundled Venice provider。[E: packages/opencode/src/provider/provider.ts:133] |

## Custom Loader Map

`custom(dep)` returns provider-specific loaders with optional `autoload/getModel/vars/options/discoverModels`。[E: packages/opencode/src/provider/provider.ts:139] [E: packages/opencode/src/provider/provider.ts:145] The current source has 22 explicit custom keys:

| Provider key | autoload / options / getModel behavior |
| --- | --- |
| `anthropic` | `autoload:false`; injects `anthropic-beta: interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14`。[E: packages/opencode/src/provider/provider.ts:170] [E: packages/opencode/src/provider/provider.ts:175] |
| `opencode` | Keeps paid models only if env/auth/config API key exists; otherwise deletes non-free models and uses `{ apiKey: "public" }`。[E: packages/opencode/src/provider/provider.ts:179] [E: packages/opencode/src/provider/provider.ts:190] [E: packages/opencode/src/provider/provider.ts:199] |
| `openai` | `autoload:false`; `getModel` always returns `sdk.responses(modelID)`; `headerTimeout` default 10000 ms。[E: packages/opencode/src/provider/provider.ts:202] [E: packages/opencode/src/provider/provider.ts:208] |
| `xai` | `autoload:false`; `getModel` returns `sdk.responses(modelID)`。[E: packages/opencode/src/provider/provider.ts:210] [E: packages/opencode/src/provider/provider.ts:214] |
| `github-copilot` | GPT major >= 5 except `gpt-5-mini` uses responses; otherwise chat; falls back to languageModel when responses/chat missing。[E: packages/opencode/src/provider/provider.ts:218] [E: packages/opencode/src/provider/provider.ts:225] |
| `azure` | resourceName comes from provider options, stored auth metadata, or `AZURE_RESOURCE_NAME`; missing resource and baseURL makes getModel throw a guided error。[E: packages/opencode/src/provider/provider.ts:229] [E: packages/opencode/src/provider/provider.ts:240] | 
| `azure-cognitive-services` | reads `AZURE_COGNITIVE_SERVICES_RESOURCE_NAME` and builds cognitive services baseURL if present。[E: packages/opencode/src/provider/provider.ts:269] [E: packages/opencode/src/provider/provider.ts:277] |
| `amazon-bedrock` | region precedence config/env/default `us-east-1`; supports profile, bearer token, config apiKey, web identity, container creds; autoload true when credentials present。[E: packages/opencode/src/provider/provider.ts:287] [E: packages/opencode/src/provider/provider.ts:317] [E: packages/opencode/src/provider/provider.ts:348] |
| `llmgateway` | Adds opencode referer/title/source headers。[E: packages/opencode/src/provider/provider.ts:443] [E: packages/opencode/src/provider/provider.ts:448] |
| `openrouter` | Adds opencode referer/title headers。[E: packages/opencode/src/provider/provider.ts:454] [E: packages/opencode/src/provider/provider.ts:459] |
| `nvidia` | Autoloads when provider source is config; adds referer/title/billing-origin headers。[E: packages/opencode/src/provider/provider.ts:464] [E: packages/opencode/src/provider/provider.ts:471] |
| `vercel` | Adds lower-case `http-referer` and `x-title` headers。[E: packages/opencode/src/provider/provider.ts:475] [E: packages/opencode/src/provider/provider.ts:481] |
| `google-vertex` | project from options or Google envs; location from options/env/default `us-central1`; injects ADC bearer token via custom fetch。[E: packages/opencode/src/provider/provider.ts:485] [E: packages/opencode/src/provider/provider.ts:501] [E: packages/opencode/src/provider/provider.ts:519] |
| `google-vertex-anthropic` | project from Google Cloud envs; location default `global`; optional regional Anthropic baseURL for `eu`/`us`。[E: packages/opencode/src/provider/provider.ts:537] [E: packages/opencode/src/provider/provider.ts:543] |
| `sap-ai-core` | Reads/stores `AICORE_SERVICE_KEY`, uses deployment/resource group envs, getModel calls `sdk(modelID)`。[E: packages/opencode/src/provider/provider.ts:557] [E: packages/opencode/src/provider/provider.ts:576] |
| `zenmux` | Adds opencode referer/title headers。[E: packages/opencode/src/provider/provider.ts:581] [E: packages/opencode/src/provider/provider.ts:586] |
| `gitlab` | Token from oauth/api auth or `GITLAB_TOKEN`; options include instanceUrl, apiKey, aiGatewayHeaders, featureFlags; model loader chooses workflowChat for `duo-workflow-*` else agenticChat。[E: packages/opencode/src/provider/provider.ts:598] [E: packages/opencode/src/provider/provider.ts:619] [E: packages/opencode/src/provider/provider.ts:627] |
| `cloudflare-workers-ai` | Requires account ID from env/auth metadata unless baseURL already configured; api key from env/auth; adds User-Agent and vars account ID。[E: packages/opencode/src/provider/provider.ts:716] [E: packages/opencode/src/provider/provider.ts:734] [E: packages/opencode/src/provider/provider.ts:747] |
| `cloudflare-ai-gateway` | Requires account ID and gateway ID unless baseURL configured; token from `CLOUDFLARE_API_TOKEN`/`CF_AIG_TOKEN`/auth; uses official `ai-gateway-provider` unified API。[E: packages/opencode/src/provider/provider.ts:754] [E: packages/opencode/src/provider/provider.ts:780] [E: packages/opencode/src/provider/provider.ts:813] |
| `cerebras` | Adds `X-Cerebras-3rd-Party-Integration: opencode`。[E: packages/opencode/src/provider/provider.ts:830] [E: packages/opencode/src/provider/provider.ts:835] |
| `kilo` | Adds referer/title headers。[E: packages/opencode/src/provider/provider.ts:839] [E: packages/opencode/src/provider/provider.ts:844] |
| `snowflake-cortex` | Requires account and PAT from env/auth/options; baseURL is Snowflake Cortex URL; fetch rewrites `max_tokens` to `max_completion_tokens` and normalizes streaming empty role。[E: packages/opencode/src/provider/provider.ts:849] [E: packages/opencode/src/provider/provider.ts:872] [E: packages/opencode/src/provider/provider.ts:879] |

## Provider Assembly Control Flow

1. State initialization reads config, models.dev catalog, plugins, auth and env services。[E: packages/opencode/src/provider/provider.ts:1275] [E: packages/opencode/src/provider/provider.ts:1287]
2. Plugin provider model hooks run before config provider extension so plugin config hooks can affect `cfg.provider` interpretation。[E: packages/opencode/src/provider/provider.ts:1324] [E: packages/opencode/src/provider/provider.ts:1337]
3. Config providers extend or create database entries; custom model fields merge with existing catalog model and recompute variants through `ProviderTransform.variants`。[E: packages/opencode/src/provider/provider.ts:1365] [E: packages/opencode/src/provider/provider.ts:1448]
4. Env keys create `source:"env"` provider entries and API auth storage creates `source:"api"` entries。[E: packages/opencode/src/provider/provider.ts:1459] [E: packages/opencode/src/provider/provider.ts:1472]
5. Custom loaders run; if `autoload` or provider already exists, registry records `getModel/vars/discoverModels/options` and merges provider patch。[E: packages/opencode/src/provider/provider.ts:1505] [E: packages/opencode/src/provider/provider.ts:1513]
6. Disabled/enabled provider filters and model blacklist/whitelist/deprecated/alpha filtering are applied before final state returns。[E: packages/opencode/src/provider/provider.ts:1328] [E: packages/opencode/src/provider/provider.ts:1547] [E: packages/opencode/src/provider/provider.ts:1568]
7. `resolveSDK` applies baseURL variable substitution, provider key as apiKey, model headers, fetch timeout wrapping, SDK cache key, bundled loader or dynamic npm import。[E: packages/opencode/src/provider/provider.ts:1634] [E: packages/opencode/src/provider/provider.ts:1656] [E: packages/opencode/src/provider/provider.ts:1679] [E: packages/opencode/src/provider/provider.ts:1721]
8. `getLanguage` caches model language objects by `${providerID}/${model.id}` and uses custom `modelLoaders[providerID]` if present, otherwise `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1771] [E: packages/opencode/src/provider/provider.ts:1781] [E: packages/opencode/src/provider/provider.ts:1791]

## Sources

- packages/opencode/src/provider/provider.ts

## Related

- model-layer.provider-registry-v1
