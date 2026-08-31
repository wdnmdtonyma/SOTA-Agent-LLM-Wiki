---
id: ref.ai-sdk-provider-map
title: AI SDK Provider Map
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/provider/provider.ts
  - packages/opencode/src/plugin/azure.ts
  - packages/core/src/plugin/provider/cloudflare-ai-gateway.ts
status: verified
updated: 9f69463f1d
evidence: explicit
symbols:
  - BUNDLED_PROVIDERS
  - custom
  - Provider.Service
  - resolveSDK
  - googleVertexEndpoint
  - cloudflareGatewayNpm
related:
  - model-layer.provider-registry-v1
---

# AI SDK Provider Map

本节点只描述 V1 provider registry 的 AI SDK map。V1 当前活跑 provider path 在 `packages/opencode/src/provider/provider.ts`：它在 `Layer.effect(Service, ...)` 中读取 config、auth、env、plugin 和 models.dev 服务，再用 `BUNDLED_PROVIDERS` 或 npm dynamic import 创建 AI SDK provider instance。[E: packages/opencode/src/provider/provider.ts:1385][E: packages/opencode/src/provider/provider.ts:1389][E: packages/opencode/src/provider/provider.ts:1390][E: packages/opencode/src/provider/provider.ts:1391][E: packages/opencode/src/provider/provider.ts:1392][E: packages/opencode/src/provider/provider.ts:1393][E: packages/opencode/src/provider/provider.ts:1400][E: packages/opencode/src/provider/provider.ts:1827][E: packages/opencode/src/provider/provider.ts:1828][E: packages/opencode/src/provider/provider.ts:1838][E: packages/opencode/src/provider/provider.ts:1842][E: packages/opencode/src/provider/provider.ts:1852][E: packages/opencode/src/provider/provider.ts:1853]

## Provider Model Schema

V1 `Model` 记录含 `id/providerID/api/name/family/capabilities/cost/limit/status/options/headers/release_date/variants`。[E: packages/opencode/src/provider/provider.ts:1074][E: packages/opencode/src/provider/provider.ts:1075][E: packages/opencode/src/provider/provider.ts:1076][E: packages/opencode/src/provider/provider.ts:1077][E: packages/opencode/src/provider/provider.ts:1078][E: packages/opencode/src/provider/provider.ts:1079][E: packages/opencode/src/provider/provider.ts:1080][E: packages/opencode/src/provider/provider.ts:1081][E: packages/opencode/src/provider/provider.ts:1082][E: packages/opencode/src/provider/provider.ts:1083][E: packages/opencode/src/provider/provider.ts:1084][E: packages/opencode/src/provider/provider.ts:1085][E: packages/opencode/src/provider/provider.ts:1086][E: packages/opencode/src/provider/provider.ts:1087] `Info` 记录含 `id/name/source/env/key/options/models`，source 只能是 `env/config/custom/api`。[E: packages/opencode/src/provider/provider.ts:1091][E: packages/opencode/src/provider/provider.ts:1092][E: packages/opencode/src/provider/provider.ts:1093][E: packages/opencode/src/provider/provider.ts:1094][E: packages/opencode/src/provider/provider.ts:1095][E: packages/opencode/src/provider/provider.ts:1096][E: packages/opencode/src/provider/provider.ts:1097][E: packages/opencode/src/provider/provider.ts:1098]

## Bundled Providers

本 HEAD 的 `BUNDLED_PROVIDERS` 明确列出 24 个 npm specifier。命中 bundled loader 时，`resolveSDK` 直接 dynamic import bundled factory 并缓存 SDK；未命中且 `model.api.npm` 不是 `file://` specifier 时才调用 `Npm.add(model.api.npm)` 安装/解析外部 package。[E: packages/opencode/src/provider/provider.ts:114][E: packages/opencode/src/provider/provider.ts:139][E: packages/opencode/src/provider/provider.ts:1827][E: packages/opencode/src/provider/provider.ts:1838][E: packages/opencode/src/provider/provider.ts:1839][E: packages/opencode/src/provider/provider.ts:1842]

| NPM specifier | Factory | 特殊说明 |
| --- | --- | --- |
| `@ai-sdk/amazon-bedrock` | `createAmazonBedrock` | standard Bedrock loader。[E: packages/opencode/src/provider/provider.ts:114] |
| `@ai-sdk/amazon-bedrock/mantle` | `createBedrockMantle` | Mantle loader；custom Bedrock model selection 会优先 responses，safeguard 模型走 chat。[E: packages/opencode/src/provider/provider.ts:115][E: packages/opencode/src/provider/provider.ts:168][E: packages/opencode/src/provider/provider.ts:169][E: packages/opencode/src/provider/provider.ts:171] |
| `@ai-sdk/anthropic` | `createAnthropic` | custom loader adds Anthropic beta headers。[E: packages/opencode/src/provider/provider.ts:116][E: packages/opencode/src/provider/provider.ts:181] |
| `@ai-sdk/azure` | `createAzure` | Azure custom loader 选择 chat/responses/messages/languageModel。[E: packages/opencode/src/provider/provider.ts:117][E: packages/opencode/src/provider/provider.ts:160][E: packages/opencode/src/provider/provider.ts:161][E: packages/opencode/src/provider/provider.ts:162][E: packages/opencode/src/provider/provider.ts:163][E: packages/opencode/src/provider/provider.ts:165] |
| `@ai-sdk/google` | `createGoogleGenerativeAI` | Google AI Studio provider。[E: packages/opencode/src/provider/provider.ts:118] |
| `@ai-sdk/google-vertex` | `createVertex` | Vertex loader；custom loader injects ADC fetch/token，并用 `googleVertexEndpoint` 写 `GOOGLE_VERTEX_ENDPOINT`。[E: packages/opencode/src/provider/provider.ts:119][E: packages/opencode/src/provider/provider.ts:532][E: packages/opencode/src/provider/provider.ts:538] |
| `@ai-sdk/google-vertex/anthropic` | `createVertexAnthropic` | Vertex Anthropic loader。[E: packages/opencode/src/provider/provider.ts:120][E: packages/opencode/src/provider/provider.ts:121] |
| `@ai-sdk/openai` | `createOpenAI` | OpenAI custom loader uses responses model and default header timeout。[E: packages/opencode/src/provider/provider.ts:122][E: packages/opencode/src/provider/provider.ts:212][E: packages/opencode/src/provider/provider.ts:214] |
| `@ai-sdk/openai-compatible` | `createOpenAICompatible` | compatible providers default `includeUsage=true` unless disabled。[E: packages/opencode/src/provider/provider.ts:123][E: packages/opencode/src/provider/provider.ts:1751][E: packages/opencode/src/provider/provider.ts:1752] |
| `@openrouter/ai-sdk-provider` | `createOpenRouter` | custom loader adds `HTTP-Referer` and `X-Title` headers。[E: packages/opencode/src/provider/provider.ts:124][E: packages/opencode/src/provider/provider.ts:479][E: packages/opencode/src/provider/provider.ts:480] |
| `@ai-sdk/xai` | `createXai` | xAI custom loader uses responses model。[E: packages/opencode/src/provider/provider.ts:125][E: packages/opencode/src/provider/provider.ts:227] |
| `@ai-sdk/mistral` | `createMistral` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:126] |
| `@ai-sdk/groq` | `createGroq` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:127] |
| `@ai-sdk/deepinfra` | `createDeepInfra` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:128] |
| `@ai-sdk/cerebras` | `createCerebras` | custom loader adds integration header。[E: packages/opencode/src/provider/provider.ts:129][E: packages/opencode/src/provider/provider.ts:886] |
| `@ai-sdk/cohere` | `createCohere` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:130] |
| `@ai-sdk/gateway` | `createGateway` | bundled Vercel AI Gateway provider。[E: packages/opencode/src/provider/provider.ts:131] |
| `@ai-sdk/togetherai` | `createTogetherAI` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:132] |
| `@ai-sdk/perplexity` | `createPerplexity` | bundled only, no custom entry in this file。[E: packages/opencode/src/provider/provider.ts:133] |
| `@ai-sdk/vercel` | `createVercel` | custom loader adds lower-case referer/title headers。[E: packages/opencode/src/provider/provider.ts:134][E: packages/opencode/src/provider/provider.ts:500][E: packages/opencode/src/provider/provider.ts:501] |
| `@ai-sdk/alibaba` | `createAlibaba` | bundled Alibaba provider。[E: packages/opencode/src/provider/provider.ts:135] |
| `gitlab-ai-provider` | `createGitLab` | custom GitLab loader supports agenticChat/workflowChat and workflow discovery。[E: packages/opencode/src/provider/provider.ts:136][E: packages/opencode/src/provider/provider.ts:647][E: packages/opencode/src/provider/provider.ts:662] |
| `@ai-sdk/github-copilot` | `createOpenaiCompatible` from core copilot provider | Bundled specifier imports `@opencode-ai/core/github-copilot/copilot-provider` instead of external `@ai-sdk/github-copilot` package factory。[E: packages/opencode/src/provider/provider.ts:137][E: packages/opencode/src/provider/provider.ts:138] |
| `venice-ai-sdk-provider` | `createVenice` | bundled Venice provider。[E: packages/opencode/src/provider/provider.ts:139] |

`cloudflareGatewayNpm()` 不在 `BUNDLED_PROVIDERS` 里，但会改写 catalog/config 合成的 `model.api.npm`：仅当 provider 是 `cloudflare-ai-gateway` 时，`openai/*` → `@ai-sdk/openai`，`anthropic/*` → `@ai-sdk/anthropic`，从而命中上表 native factory 并驱动 reasoning variants。[E: packages/opencode/src/provider/provider.ts:1254][E: packages/opencode/src/provider/provider.ts:1255][E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1271][E: packages/opencode/src/provider/provider.ts:1498]

## Custom Loader Map

`custom(dep)` returns an object of provider-specific loaders with optional `autoload/getModel/vars/options/discoverModels` fields。[E: packages/opencode/src/provider/provider.ts:145][E: packages/opencode/src/provider/provider.ts:146][E: packages/opencode/src/provider/provider.ts:147][E: packages/opencode/src/provider/provider.ts:148][E: packages/opencode/src/provider/provider.ts:149][E: packages/opencode/src/provider/provider.ts:150][E: packages/opencode/src/provider/provider.ts:174][E: packages/opencode/src/provider/provider.ts:175]

| Provider key | autoload / options / getModel behavior |
| --- | --- |
| `anthropic` | `autoload:false`; injects `anthropic-beta: interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14`。[E: packages/opencode/src/provider/provider.ts:176][E: packages/opencode/src/provider/provider.ts:181] |
| `opencode` | Keeps zero-input-cost models only if no env/auth/config API key exists; otherwise uses normal provider options。[E: packages/opencode/src/provider/provider.ts:185][E: packages/opencode/src/provider/provider.ts:188][E: packages/opencode/src/provider/provider.ts:192][E: packages/opencode/src/provider/provider.ts:196][E: packages/opencode/src/provider/provider.ts:204][E: packages/opencode/src/provider/provider.ts:205] |
| `openai` | `autoload:false`; `getModel` always returns `sdk.responses(modelID)`; `headerTimeout` default 300000 ms。[E: packages/opencode/src/provider/provider.ts:35][E: packages/opencode/src/provider/provider.ts:208][E: packages/opencode/src/provider/provider.ts:212][E: packages/opencode/src/provider/provider.ts:214] |
| `meta` | `autoload:false`; `getModel` returns `sdk.responses(modelID)`。[E: packages/opencode/src/provider/provider.ts:216][E: packages/opencode/src/provider/provider.ts:218][E: packages/opencode/src/provider/provider.ts:220] |
| `xai` | `autoload:false`; `getModel` returns `sdk.responses(modelID)`。[E: packages/opencode/src/provider/provider.ts:223][E: packages/opencode/src/provider/provider.ts:227] |
| `github-copilot` | Falls back to `languageModel` when responses/chat are both missing; otherwise model API `endpoint:responses\|chat` wins, then GPT major >= 5 except `gpt-5-mini` uses responses, and remaining models use chat。[E: packages/opencode/src/provider/provider.ts:231][E: packages/opencode/src/provider/provider.ts:235][E: packages/opencode/src/provider/provider.ts:236][E: packages/opencode/src/provider/provider.ts:237][E: packages/opencode/src/provider/provider.ts:238][E: packages/opencode/src/provider/provider.ts:240][E: packages/opencode/src/provider/provider.ts:241][E: packages/opencode/src/provider/provider.ts:242] |
| `azure` | resourceName 来自 provider options、API auth metadata、**OAuth `auth.accountId`**、或 `AZURE_RESOURCE_NAME`；缺 resource 且无 baseURL 时 getModel throw guided error。[E: packages/opencode/src/provider/provider.ts:251][E: packages/opencode/src/provider/provider.ts:252][E: packages/opencode/src/provider/provider.ts:253][E: packages/opencode/src/provider/provider.ts:254][E: packages/opencode/src/provider/provider.ts:258][E: packages/opencode/src/provider/provider.ts:262] |
| `azure-cognitive-services` | Reads `AZURE_COGNITIVE_SERVICES_RESOURCE_NAME`; baseURL 在 `useDeploymentBasedUrls` 为 true 时停在 `/openai`，否则补 `/openai/v1`。[E: packages/opencode/src/provider/provider.ts:288][E: packages/opencode/src/provider/provider.ts:295][E: packages/opencode/src/provider/provider.ts:296] |
| `amazon-bedrock` | region precedence config/env/default `us-east-1`; supports profile, bearer token, config apiKey, web identity, container creds; autoload true when credentials present。[E: packages/opencode/src/provider/provider.ts:307][E: packages/opencode/src/provider/provider.ts:308][E: packages/opencode/src/provider/provider.ts:309][E: packages/opencode/src/provider/provider.ts:312][E: packages/opencode/src/provider/provider.ts:314][E: packages/opencode/src/provider/provider.ts:316][E: packages/opencode/src/provider/provider.ts:317][E: packages/opencode/src/provider/provider.ts:331][E: packages/opencode/src/provider/provider.ts:333][E: packages/opencode/src/provider/provider.ts:345][E: packages/opencode/src/provider/provider.ts:369] |
| `llmgateway` | Adds opencode referer/title/source headers。[E: packages/opencode/src/provider/provider.ts:468][E: packages/opencode/src/provider/provider.ts:469][E: packages/opencode/src/provider/provider.ts:470] |
| `openrouter` | Adds opencode referer/title headers。[E: packages/opencode/src/provider/provider.ts:479][E: packages/opencode/src/provider/provider.ts:480] |
| `nvidia` | Autoloads when provider source is config; adds referer/title/billing-origin headers。[E: packages/opencode/src/provider/provider.ts:486][E: packages/opencode/src/provider/provider.ts:489][E: packages/opencode/src/provider/provider.ts:490][E: packages/opencode/src/provider/provider.ts:491] |
| `vercel` | Adds lower-case `http-referer` and `x-title` headers。[E: packages/opencode/src/provider/provider.ts:500][E: packages/opencode/src/provider/provider.ts:501] |
| `google-vertex` | project from options or Google envs; location from options/env/default `us-central1`; `googleVertexEndpoint(location)`：`global` → `aiplatform.googleapis.com`，`eu`/`us` → `aiplatform.{location}.rep.googleapis.com`，其它 → `{location}-aiplatform.googleapis.com`；injects ADC bearer token via custom fetch。[E: packages/opencode/src/provider/provider.ts:101][E: packages/opencode/src/provider/provider.ts:102][E: packages/opencode/src/provider/provider.ts:103][E: packages/opencode/src/provider/provider.ts:104][E: packages/opencode/src/provider/provider.ts:509][E: packages/opencode/src/provider/provider.ts:516][E: packages/opencode/src/provider/provider.ts:521][E: packages/opencode/src/provider/provider.ts:532][E: packages/opencode/src/provider/provider.ts:538] |
| `google-vertex-anthropic` | project from Google Cloud envs; location default `global`; `googleVertexAnthropicBaseURL` 只为 `eu`/`us` 生成 REP Anthropic publisher URL。[E: packages/opencode/src/provider/provider.ts:94][E: packages/opencode/src/provider/provider.ts:96][E: packages/opencode/src/provider/provider.ts:98][E: packages/opencode/src/provider/provider.ts:558][E: packages/opencode/src/provider/provider.ts:559][E: packages/opencode/src/provider/provider.ts:562] |
| `sap-ai-core` | Reads/stores `AICORE_SERVICE_KEY`, uses deployment/resource group envs, getModel calls `sdk(modelID)`。[E: packages/opencode/src/provider/provider.ts:581][E: packages/opencode/src/provider/provider.ts:589][E: packages/opencode/src/provider/provider.ts:590][E: packages/opencode/src/provider/provider.ts:593][E: packages/opencode/src/provider/provider.ts:594][E: packages/opencode/src/provider/provider.ts:596] |
| `zenmux` | Adds opencode referer/title headers。[E: packages/opencode/src/provider/provider.ts:605][E: packages/opencode/src/provider/provider.ts:606] |
| `gitlab` | Token from oauth/api auth or `GITLAB_TOKEN`; options include instanceUrl, apiKey, aiGatewayHeaders, featureFlags; model loader chooses workflowChat for `duo-workflow-*` else agenticChat。[E: packages/opencode/src/provider/provider.ts:617][E: packages/opencode/src/provider/provider.ts:620][E: packages/opencode/src/provider/provider.ts:621][E: packages/opencode/src/provider/provider.ts:640][E: packages/opencode/src/provider/provider.ts:641][E: packages/opencode/src/provider/provider.ts:642][E: packages/opencode/src/provider/provider.ts:643][E: packages/opencode/src/provider/provider.ts:644][E: packages/opencode/src/provider/provider.ts:647][E: packages/opencode/src/provider/provider.ts:662] |
| `cloudflare-workers-ai` | Requires account ID from env/auth metadata unless baseURL already configured; api key from env/auth; adds User-Agent and vars account ID。[E: packages/opencode/src/provider/provider.ts:738][E: packages/opencode/src/provider/provider.ts:742][E: packages/opencode/src/provider/provider.ts:743][E: packages/opencode/src/provider/provider.ts:753][E: packages/opencode/src/provider/provider.ts:760][E: packages/opencode/src/provider/provider.ts:764][E: packages/opencode/src/provider/provider.ts:768] |
| `cloudflare-ai-gateway` | Requires account ID and gateway ID unless baseURL configured; token from `CLOUDFLARE_API_TOKEN`/`CF_AIG_TOKEN`/auth。`getModel` 三分路由：`openai/*` native OpenAI passthrough；`anthropic/*` native Anthropic + `replaceAll(".", "-")`；`workers-ai/`/`@cf/` 才 `createUnified({ apiKey })`（唯一向上游传 CF token）；其它第三方 `createOpenAICompatible` + REST `cf-aig-gateway-id`。[E: packages/opencode/src/provider/provider.ts:775][E: packages/opencode/src/provider/provider.ts:779][E: packages/opencode/src/provider/provider.ts:781][E: packages/opencode/src/provider/provider.ts:800][E: packages/opencode/src/provider/provider.ts:848][E: packages/opencode/src/provider/provider.ts:853][E: packages/opencode/src/provider/provider.ts:862][E: packages/opencode/src/provider/provider.ts:863][E: packages/opencode/src/provider/provider.ts:871] |
| `cerebras` | Adds `X-Cerebras-3rd-Party-Integration: opencode`。[E: packages/opencode/src/provider/provider.ts:886] |
| `kilo` | Adds referer/title headers。[E: packages/opencode/src/provider/provider.ts:895][E: packages/opencode/src/provider/provider.ts:896] |
| `snowflake-cortex` | Requires account and token from env/auth/options; OAuth 也读 `auth.accountId`；baseURL 是 Snowflake Cortex URL；非 OAuth-only 路径的 fetch 把 `max_tokens` 改写成 `max_completion_tokens` 并 normalize streaming empty role。[E: packages/opencode/src/provider/provider.ts:904][E: packages/opencode/src/provider/provider.ts:907][E: packages/opencode/src/provider/provider.ts:910][E: packages/opencode/src/provider/provider.ts:915][E: packages/opencode/src/provider/provider.ts:929][E: packages/opencode/src/provider/provider.ts:946][E: packages/opencode/src/provider/provider.ts:982] |

Azure CLI OAuth 把用户选的 resourceName 写入 stored auth 的 `accountId`，V1 azure loader 再把它当 resource。[E: packages/opencode/src/plugin/azure.ts:190][E: packages/opencode/src/provider/provider.ts:253]

V2 Core `CloudflareAIGatewayPlugin` **没有** mirror 上表三分路由：它只对 Workers AI (`workers-ai/` / `@cf/`) 把 token 传给 `createUnified({ apiKey })`，其它模型 `createUnified({})`。[E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:27][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:34][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:35]

## Provider Assembly Control Flow

1. State initialization reads config, models.dev catalog, plugins, auth and env services。[E: packages/opencode/src/provider/provider.ts:1389][E: packages/opencode/src/provider/provider.ts:1390][E: packages/opencode/src/provider/provider.ts:1391][E: packages/opencode/src/provider/provider.ts:1392][E: packages/opencode/src/provider/provider.ts:1400][E: packages/opencode/src/provider/provider.ts:1401]
2. Plugin provider model hooks run before config provider extension so plugin config hooks can affect `cfg.provider` interpretation。[E: packages/opencode/src/provider/provider.ts:1437][E: packages/opencode/src/provider/provider.ts:1440][E: packages/opencode/src/provider/provider.ts:1450][E: packages/opencode/src/provider/provider.ts:1478]
3. Config providers extend or create database entries; custom model fields merge with existing catalog model。npm package 未变时保留 catalog variants，变更 package 时才重算 heuristic variants，再 merge config variants。config-defined gateway model 会再跑一次 `cloudflareGatewayNpm()`。[E: packages/opencode/src/provider/provider.ts:1478][E: packages/opencode/src/provider/provider.ts:1489][E: packages/opencode/src/provider/provider.ts:1498][E: packages/opencode/src/provider/provider.ts:1564][E: packages/opencode/src/provider/provider.ts:1565][E: packages/opencode/src/provider/provider.ts:1566][E: packages/opencode/src/provider/provider.ts:1568]
4. Env keys create `source:"env"` provider entries and API auth storage creates `source:"api"` entries。[E: packages/opencode/src/provider/provider.ts:1579][E: packages/opencode/src/provider/provider.ts:1586][E: packages/opencode/src/provider/provider.ts:1592][E: packages/opencode/src/provider/provider.ts:1598]
5. Custom loaders run; if `autoload` or provider already exists, registry records `getModel/vars/discoverModels/options` and merges provider patch。[E: packages/opencode/src/provider/provider.ts:1625][E: packages/opencode/src/provider/provider.ts:1633][E: packages/opencode/src/provider/provider.ts:1634][E: packages/opencode/src/provider/provider.ts:1635][E: packages/opencode/src/provider/provider.ts:1636][E: packages/opencode/src/provider/provider.ts:1637][E: packages/opencode/src/provider/provider.ts:1638]
6. Disabled/enabled provider filters and model blacklist/whitelist/deprecated/alpha filtering are applied before final state returns。[E: packages/opencode/src/provider/provider.ts:1441][E: packages/opencode/src/provider/provider.ts:1442][E: packages/opencode/src/provider/provider.ts:1669][E: packages/opencode/src/provider/provider.ts:1689][E: packages/opencode/src/provider/provider.ts:1690][E: packages/opencode/src/provider/provider.ts:1692]
7. `resolveSDK` applies baseURL variable substitution, provider key as apiKey, model headers, fetch timeout wrapping, SDK cache key, bundled loader, `file://` import, or dynamic npm import。[E: packages/opencode/src/provider/provider.ts:1760][E: packages/opencode/src/provider/provider.ts:1777][E: packages/opencode/src/provider/provider.ts:1778][E: packages/opencode/src/provider/provider.ts:1779][E: packages/opencode/src/provider/provider.ts:1784][E: packages/opencode/src/provider/provider.ts:1800][E: packages/opencode/src/provider/provider.ts:1827][E: packages/opencode/src/provider/provider.ts:1838][E: packages/opencode/src/provider/provider.ts:1839][E: packages/opencode/src/provider/provider.ts:1842][E: packages/opencode/src/provider/provider.ts:1852]
8. `getLanguage` caches model language objects by `${providerID}/${model.id}` and uses custom `modelLoaders[providerID]` if present, otherwise `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1895][E: packages/opencode/src/provider/provider.ts:1896][E: packages/opencode/src/provider/provider.ts:1902][E: packages/opencode/src/provider/provider.ts:1912][E: packages/opencode/src/provider/provider.ts:1913]

## Sources

- packages/opencode/src/provider/provider.ts
- packages/opencode/src/plugin/azure.ts
- packages/core/src/plugin/provider/cloudflare-ai-gateway.ts

## 相关

- [V1 provider registry](../subsystems/model-layer/provider-registry-v1.md)
