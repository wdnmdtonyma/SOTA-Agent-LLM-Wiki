---
id: provider.catalog
title: Provider catalog 与原生 provider facade
kind: catalog
tier: T1
v: shared
source: [packages/llm/src/providers/, packages/opencode/src/provider/provider.ts, packages/core/src/models-dev.ts]
symbols: [LLMProvider, OpenAI, Anthropic, OpenAICompatible, AmazonBedrock, Google, GitHubCopilot, Azure, Cloudflare, OpenRouter, XAI]
related: [model-layer.llm-protocols, ref.llm-provider-facade-catalog]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Provider catalog 有两层：V1 当前活跑用 models.dev + Vercel AI SDK package loader；`packages/llm` 是原生 provider protocol/facade 引擎，在 V1 里是可选 seam，在 V2 里是设计方向。

## 能回答的问题

- V1 provider catalog 的 provider/model 字段来自 models.dev 的哪些 schema？
- `packages/llm/src/providers` 当前导出了哪些原生 provider facade？
- V1 bundled AI SDK provider 列表与 `packages/llm` provider facade 有什么差异？
- OpenAI、Anthropic、OpenAICompatible、Amazon Bedrock、Google、GitHub Copilot、Azure、Cloudflare、OpenRouter、xAI 的 auth/baseURL/route 入口在哪里？
- V1 与 V2 迁移中 provider catalog 的边界在哪里？

## V1

V1 catalog 的 canonical input 是 `ModelsDev.Provider` 和 `ModelsDev.Model` schema。Provider schema 包含 optional `api`、`name`、`env`、`id`、optional `npm` 和 `models` record；Model schema 包含 `id`、`name`、family/release_date、attachment/reasoning/temperature/tool_call、limit、modalities、experimental modes、status 和 optional provider npm/api override。[E: packages/core/src/models-dev.ts:47][E: packages/core/src/models-dev.ts:48][E: packages/core/src/models-dev.ts:49][E: packages/core/src/models-dev.ts:50][E: packages/core/src/models-dev.ts:51][E: packages/core/src/models-dev.ts:52][E: packages/core/src/models-dev.ts:53][E: packages/core/src/models-dev.ts:54][E: packages/core/src/models-dev.ts:55][E: packages/core/src/models-dev.ts:65][E: packages/core/src/models-dev.ts:70][E: packages/core/src/models-dev.ts:76][E: packages/core/src/models-dev.ts:94][E: packages/core/src/models-dev.ts:95][E: packages/core/src/models-dev.ts:96][E: packages/core/src/models-dev.ts:101][E: packages/core/src/models-dev.ts:102][E: packages/core/src/models-dev.ts:103][E: packages/core/src/models-dev.ts:104][E: packages/core/src/models-dev.ts:105][E: packages/core/src/models-dev.ts:106][E: packages/core/src/models-dev.ts:107] V1 `fromModelsDevProvider()` 将 models.dev provider 转成 V1 provider `Info`，`fromModelsDevModel()` 将 models.dev model 转成 V1 model `api/capabilities/cost/limit/variants`。[E: packages/opencode/src/provider/provider.ts:1188][E: packages/opencode/src/provider/provider.ts:1194][E: packages/opencode/src/provider/provider.ts:1202][E: packages/opencode/src/provider/provider.ts:1203][E: packages/opencode/src/provider/provider.ts:1208][E: packages/opencode/src/provider/provider.ts:1227][E: packages/opencode/src/provider/provider.ts:1233][E: packages/opencode/src/provider/provider.ts:1239][E: packages/opencode/src/provider/provider.ts:1263][E: packages/opencode/src/provider/provider.ts:1269]

V1 AI SDK runtime catalog 由 `BUNDLED_PROVIDERS` 和 dynamic npm import 执行。Bundled list 包含 Bedrock、Anthropic、Azure、Google、Google Vertex、OpenAI、OpenAI-compatible、OpenRouter、xAI、Mistral、Groq、DeepInfra、Cerebras、Cohere、Gateway、TogetherAI、Perplexity、Vercel、Alibaba、GitLab、GitHub Copilot 和 Venice。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:108][E: packages/opencode/src/provider/provider.ts:109][E: packages/opencode/src/provider/provider.ts:110][E: packages/opencode/src/provider/provider.ts:111][E: packages/opencode/src/provider/provider.ts:112][E: packages/opencode/src/provider/provider.ts:113][E: packages/opencode/src/provider/provider.ts:114][E: packages/opencode/src/provider/provider.ts:116][E: packages/opencode/src/provider/provider.ts:117][E: packages/opencode/src/provider/provider.ts:118][E: packages/opencode/src/provider/provider.ts:119][E: packages/opencode/src/provider/provider.ts:120][E: packages/opencode/src/provider/provider.ts:121][E: packages/opencode/src/provider/provider.ts:122][E: packages/opencode/src/provider/provider.ts:123][E: packages/opencode/src/provider/provider.ts:124][E: packages/opencode/src/provider/provider.ts:125][E: packages/opencode/src/provider/provider.ts:126][E: packages/opencode/src/provider/provider.ts:127][E: packages/opencode/src/provider/provider.ts:128][E: packages/opencode/src/provider/provider.ts:129][E: packages/opencode/src/provider/provider.ts:130][E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:133] 如果 model npm 不在 bundled list，V1 会 `Npm.add(model.api.npm)` 后 dynamic import 并寻找 `create*` factory。[E: packages/opencode/src/provider/provider.ts:1736][E: packages/opencode/src/provider/provider.ts:1747][E: packages/opencode/src/provider/provider.ts:1751][E: packages/opencode/src/provider/provider.ts:1759][E: packages/opencode/src/provider/provider.ts:1761]

## V2 / packages/llm

`packages/llm/src/providers/index.ts` 当前导出原生 provider facade：Anthropic、AmazonBedrock、Azure、Cloudflare、GitHubCopilot、Google、OpenAI、OpenAICompatible、OpenRouter 和 XAI，并额外命名导出 Cloudflare AI Gateway 与 Workers AI facade。[E: packages/llm/src/providers/index.ts:1][E: packages/llm/src/providers/index.ts:2][E: packages/llm/src/providers/index.ts:3][E: packages/llm/src/providers/index.ts:4][E: packages/llm/src/providers/index.ts:5][E: packages/llm/src/providers/index.ts:6][E: packages/llm/src/providers/index.ts:7][E: packages/llm/src/providers/index.ts:8][E: packages/llm/src/providers/index.ts:9][E: packages/llm/src/providers/index.ts:10][E: packages/llm/src/providers/index.ts:11] 这些 facade 是 provider protocol engine 的配置面，不等同于 V1 `BUNDLED_PROVIDERS` 的 Vercel AI SDK factory map。[E: packages/opencode/src/provider/provider.ts:107][E: packages/llm/src/providers/index.ts:1][I]

| facade | provider id / route | auth 与配置 | 证据 |
|---|---|---|---|
| `Anthropic` | id `"anthropic"`，routes 是 `AnthropicMessages.route` | optional apiKey 或 env `ANTHROPIC_API_KEY`，header key 是 `x-api-key`；`configure()` 返回 provider object | [E: packages/llm/src/providers/anthropic.ts:7][E: packages/llm/src/providers/anthropic.ts:9][E: packages/llm/src/providers/anthropic.ts:13][E: packages/llm/src/providers/anthropic.ts:16][E: packages/llm/src/providers/anthropic.ts:17][E: packages/llm/src/providers/anthropic.ts:25] |
| `OpenAI` | id `"openai"`，routes 覆盖 Responses、WebSocket realtime、Chat Completions | api key 来自 input 或 `OPENAI_API_KEY`；`configure()` 暴露 `responses()` 与 `chat()` helpers | [E: packages/llm/src/providers/openai.ts:10][E: packages/llm/src/providers/openai.ts:12][E: packages/llm/src/providers/openai.ts:24][E: packages/llm/src/providers/openai.ts:37][E: packages/llm/src/providers/openai.ts:42][E: packages/llm/src/providers/openai.ts:46] |
| `OpenAICompatible` | generic `configure({ provider, baseURL })` | bearer token 来自 input `apiKey`；预置 profiles 包含 baseten、cerebras、deepinfra、deepseek、fireworks、groq、togetherai | [E: packages/llm/src/providers/openai-compatible.ts:7][E: packages/llm/src/providers/openai-compatible.ts:22][E: packages/llm/src/providers/openai-compatible.ts:23][E: packages/llm/src/providers/openai-compatible.ts:28][E: packages/llm/src/providers/openai-compatible.ts:29][E: packages/llm/src/providers/openai-compatible.ts:59][E: packages/llm/src/providers/openai-compatible.ts:60][E: packages/llm/src/providers/openai-compatible.ts:61][E: packages/llm/src/providers/openai-compatible.ts:62][E: packages/llm/src/providers/openai-compatible.ts:63][E: packages/llm/src/providers/openai-compatible.ts:64][E: packages/llm/src/providers/openai-compatible.ts:65] |
| `AmazonBedrock` | id `"amazon-bedrock"`，route 是 `BedrockConverse.route` | region 默认 `us-east-1`；没有 apiKey 时用 SigV4 auth | [E: packages/llm/src/providers/amazon-bedrock.ts:7][E: packages/llm/src/providers/amazon-bedrock.ts:18][E: packages/llm/src/providers/amazon-bedrock.ts:24][E: packages/llm/src/providers/amazon-bedrock.ts:29] |
| `Google` | id `"google"`，route 是 Gemini route | optional apiKey 或 env `GOOGLE_GENERATIVE_AI_API_KEY`，header key 是 `x-goog-api-key` | [E: packages/llm/src/providers/google.ts:7][E: packages/llm/src/providers/google.ts:9][E: packages/llm/src/providers/google.ts:13][E: packages/llm/src/providers/google.ts:17] |
| `GitHubCopilot` | id `"github-copilot"`，routes 包含 OpenAI Responses 与 Chat | `ModelOptions` 要求 `baseURL` 来自 runtime；`shouldUseResponsesApi()` 对 GPT-5 family 选择 Responses API，但排除 gpt-5-mini | [E: packages/llm/src/providers/github-copilot.ts:8][E: packages/llm/src/providers/github-copilot.ts:12][E: packages/llm/src/providers/github-copilot.ts:14][E: packages/llm/src/providers/github-copilot.ts:18][E: packages/llm/src/providers/github-copilot.ts:22][E: packages/llm/src/providers/github-copilot.ts:25] |
| `Azure` | id `"azure"` | route auth 去掉 authorization header；resource/baseURL 二选一生成 baseURL；routes 覆盖 Responses 与 Chat | [E: packages/llm/src/providers/azure.ts:9][E: packages/llm/src/providers/azure.ts:10][E: packages/llm/src/providers/azure.ts:46][E: packages/llm/src/providers/azure.ts:74][E: packages/llm/src/providers/azure.ts:107] |
| `CloudflareAIGateway` / `CloudflareWorkersAI` | ids `"cloudflare-ai-gateway"` 与 `"cloudflare-workers-ai"` | gateway baseURL 使用 account/gateway id；Workers AI baseURL 使用 account id；exports 两个 provider object | [E: packages/llm/src/providers/cloudflare.ts:8][E: packages/llm/src/providers/cloudflare.ts:9][E: packages/llm/src/providers/cloudflare.ts:36][E: packages/llm/src/providers/cloudflare.ts:53][E: packages/llm/src/providers/cloudflare.ts:119][E: packages/llm/src/providers/cloudflare.ts:124] |
| `OpenRouter` | id `"openrouter"`，profile 是 OpenRouter compatibility profile | auth env `OPENROUTER_API_KEY`；provider config exposes OpenAI-compatible protocol route | [E: packages/llm/src/providers/openrouter.ts:12][E: packages/llm/src/providers/openrouter.ts:13][E: packages/llm/src/providers/openrouter.ts:38][E: packages/llm/src/providers/openrouter.ts:69][E: packages/llm/src/providers/openrouter.ts:84] |
| `XAI` | id `"xai"` | routes 覆盖 Responses 与 OpenAI-compatible Chat；auth env `XAI_API_KEY` | [E: packages/llm/src/providers/xai.ts:8][E: packages/llm/src/providers/xai.ts:15][E: packages/llm/src/providers/xai.ts:17][E: packages/llm/src/providers/xai.ts:20][E: packages/llm/src/providers/xai.ts:39] |

## V1/V2 迁移边界

| 维度 | V1 当前活跑 | V2 / native direction |
|---|---|---|
| catalog source | `modelsDevSvc.get()` 生成基线 catalog，`provider.ts` 内部再经 config/env/auth/plugin/custom provider merge 链路得到 V1 active provider set。[E: packages/opencode/src/provider/provider.ts:1310][E: packages/opencode/src/provider/provider.ts:1317][E: packages/opencode/src/provider/provider.ts:1318][E: packages/opencode/src/provider/provider.ts:1395][E: packages/opencode/src/provider/provider.ts:1489][E: packages/opencode/src/provider/provider.ts:1502][E: packages/opencode/src/provider/provider.ts:1515][E: packages/opencode/src/provider/provider.ts:1535][E: packages/opencode/src/provider/provider.ts:1577][E: packages/opencode/src/provider/provider.ts:1579][E: packages/opencode/src/provider/provider.ts:1580] | `packages/llm` provider facade 直接描述 protocol route/auth/config；V2 core 可把 facade 当 engine seam。[E: packages/llm/src/providers/index.ts:1][E: packages/llm/src/providers/openai.ts:12] |
| execution engine | Vercel AI SDK `LanguageModelV3`，由 bundled/dynamic AI SDK factory 产生。[E: packages/opencode/src/provider/provider.ts:102][E: packages/opencode/src/provider/provider.ts:103][E: packages/opencode/src/provider/provider.ts:104][E: packages/opencode/src/provider/provider.ts:1133][E: packages/opencode/src/provider/provider.ts:1736][E: packages/opencode/src/provider/provider.ts:1759][E: packages/opencode/src/provider/provider.ts:1801][E: packages/opencode/src/provider/provider.ts:1810][E: packages/opencode/src/provider/provider.ts:1821] | 原生 route/protocol facade：每个 provider 明确 routes、auth 和 model factory。[E: packages/llm/src/providers/anthropic.ts:9][E: packages/llm/src/providers/openai.ts:12][E: packages/llm/src/providers/amazon-bedrock.ts:18] |
| providerOptions | V1 `ProviderTransform.providerOptions()` 把 options 转成 AI SDK namespace。[E: packages/opencode/src/provider/transform.ts:1265][E: packages/opencode/src/provider/transform.ts:1315][E: packages/opencode/src/provider/transform.ts:1322] | packages/llm facade 的 options 更靠近 provider protocol；例如 OpenAI facade 分 `responses()` 与 `chat()`。[E: packages/llm/src/providers/openai.ts:42][E: packages/llm/src/providers/openai.ts:46] |

## Sources

- packages/llm/src/providers/index.ts
- packages/llm/src/providers/anthropic.ts
- packages/llm/src/providers/openai.ts
- packages/llm/src/providers/openai-compatible.ts
- packages/llm/src/providers/amazon-bedrock.ts
- packages/llm/src/providers/google.ts
- packages/llm/src/providers/github-copilot.ts
- packages/llm/src/providers/azure.ts
- packages/llm/src/providers/cloudflare.ts
- packages/llm/src/providers/openrouter.ts
- packages/llm/src/providers/xai.ts
- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts

## 相关

- [LLM protocols](../../subsystems/model-layer/llm-protocols.md)
- [Provider facade reference](../../reference/llm-provider-facade-catalog.md)
