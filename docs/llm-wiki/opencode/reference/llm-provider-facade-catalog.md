---
id: ref.llm-provider-facade-catalog
title: LLM Provider Facade Catalog
kind: reference
tier: T3
v: shared
source:
  - packages/llm/src/providers/
status: verified
updated: 355a0bcf5
evidence: explicit
symbols:
  - Provider.configure
  - AnthropicProvider.configure
  - OpenAIProvider.configure
  - AzureProvider.configure
  - OpenAICompatibleProvider.configure
related:
  - provider.catalog
---

# LLM Provider Facade Catalog

本节点描述 `packages/llm/src/providers` 的 provider facade。Facade 的职责是给 route 绑定 auth、endpoint、默认 protocol route 和 model helper；它不实现 stream parser，stream parser 属于 protocol。

## V1

V1 当前主线使用 `packages/opencode/src/provider/provider.ts` 的 AI SDK loader map；`packages/llm/src/providers` 属 native provider seam，只有启用 native LLM path 时才成为 V1 的候选执行引擎。[I]

## V2

V2 新内核把 `packages/llm` 当 provider engine，provider facade 是从 catalog/provider config 到 routed model 的配置层。[I] `packages/llm/src/providers/index.ts` 导出 Amazon Bedrock、Anthropic、Azure、Cloudflare、GitHub Copilot、Google、OpenAI、OpenAI Compatible、OpenRouter 和 xAI provider facades。[E: packages/llm/src/providers/index.ts:1] [E: packages/llm/src/providers/index.ts:11]

## Provider Facade Table

| Facade | `id` / routes | configure options | env/auth | default route/baseURL behavior |
| --- | --- | --- | --- | --- |
| `AnthropicProvider` | `id = "anthropic"`；routes 是 `AnthropicMessages.route`。[E: packages/llm/src/providers/anthropic.ts:7] [E: packages/llm/src/providers/anthropic.ts:9] | `Config` 只有 optional `apiKey` 与 `baseURL`。[E: packages/llm/src/providers/anthropic.ts:11] | `Auth.optional(input.apiKey).orElse(Auth.config("ANTHROPIC_API_KEY")).header("x-api-key")`。[E: packages/llm/src/providers/anthropic.ts:13] [E: packages/llm/src/providers/anthropic.ts:16] | `configuredRoute` 给 route endpoint 绑定 baseURL，并用 `model(...)` 暴露单 route model。[E: packages/llm/src/providers/anthropic.ts:20] [E: packages/llm/src/providers/anthropic.ts:29] |
| `OpenAIProvider` | `id = "openai"`；routes 是 Responses、Responses WebSocket、Chat。[E: packages/llm/src/providers/openai.ts:10] [E: packages/llm/src/providers/openai.ts:12] | `baseURL/queryParams/apiKey/providerOptions`。[E: packages/llm/src/providers/openai.ts:17] [E: packages/llm/src/providers/openai.ts:21] | optional apiKey fallback `OPENAI_API_KEY`，bearer auth。[E: packages/llm/src/providers/openai.ts:24] | `model` 默认用 `OpenAIResponses.route.id`；也暴露 `responses/responsesWebSocket/chat` helpers。[E: packages/llm/src/providers/openai.ts:50] [E: packages/llm/src/providers/openai.ts:53] |
| `GoogleProvider` | `id = "google"`；routes 是 `Gemini.route`。[E: packages/llm/src/providers/google.ts:7] [E: packages/llm/src/providers/google.ts:9] | optional `apiKey/baseURL`。[E: packages/llm/src/providers/google.ts:11] | optional apiKey fallback `GOOGLE_GENERATIVE_AI_API_KEY`，header `x-goog-api-key`。[E: packages/llm/src/providers/google.ts:13] [E: packages/llm/src/providers/google.ts:17] | `configuredRoute` 绑定 baseURL/auth，`model(...)` 用 Gemini route。[E: packages/llm/src/providers/google.ts:20] [E: packages/llm/src/providers/google.ts:29] |
| `AmazonBedrockProvider` | `id = "amazon-bedrock"`；routes 是 `BedrockConverse.route`。[E: packages/llm/src/providers/amazon-bedrock.ts:7] [E: packages/llm/src/providers/amazon-bedrock.ts:18] | `apiKey/headers/credentials/region/baseURL`，region 默认注释为 `us-east-1`。[E: packages/llm/src/providers/amazon-bedrock.ts:9] [E: packages/llm/src/providers/amazon-bedrock.ts:16] | 有 `apiKey` 时 bearer，否则 SigV4 auth；region 解析为 `region ?? credentials?.region ?? "us-east-1"`。[E: packages/llm/src/providers/amazon-bedrock.ts:24] [E: packages/llm/src/providers/amazon-bedrock.ts:29] | baseURL 默认 `https://bedrock-runtime.${region}.amazonaws.com`。[E: packages/llm/src/providers/amazon-bedrock.ts:20] |
| `AzureProvider` | `id = "azure"`；routes 是 Azure-specific OpenAI Responses/Chat configured routes。[E: packages/llm/src/providers/azure.ts:9] [E: packages/llm/src/providers/azure.ts:46] | `resourceName/baseURL` 至少一个、`apiVersion/queryParams/useCompletionUrls/providerOptions`。[E: packages/llm/src/providers/azure.ts:16] [E: packages/llm/src/providers/azure.ts:22] | optional apiKey fallback `AZURE_OPENAI_API_KEY`，header `api-key`。[E: packages/llm/src/providers/azure.ts:65] [E: packages/llm/src/providers/azure.ts:70] | `resourceBaseURL` 用 `https://${resourceName}.openai.azure.com/openai/v1`；`useCompletionUrls` true 时默认 chat，否则 responses。[E: packages/llm/src/providers/azure.ts:26] [E: packages/llm/src/providers/azure.ts:100] |
| `OpenAICompatibleProvider` | `id = "openai-compatible"`；routes 是 `OpenAICompatibleChat.route`。[E: packages/llm/src/providers/openai-compatible.ts:7] [E: packages/llm/src/providers/openai-compatible.ts:20] | generic configure 必须给 `baseURL`，可给 `provider/apiKey/headers/queryParams/providerOptions`。[E: packages/llm/src/providers/openai-compatible.ts:9] [E: packages/llm/src/providers/openai-compatible.ts:12] | bearer AuthOptions 使用 `apiKey`，没有默认 env。[E: packages/llm/src/providers/openai-compatible.ts:29] | dynamic provider ID 默认为 input.provider 或 `openai-compatible`；profile providers 预置 baseURL。[E: packages/llm/src/providers/openai-compatible.ts:28] [E: packages/llm/src/providers/openai-compatible.ts:31] [E: packages/llm/src/providers/openai-compatible-profile.ts:6] |
| `OpenRouterProvider` | `id = "openrouter"`；profile baseURL 来自 `OpenAICompatibleProfiles.openrouter`。[E: packages/llm/src/providers/openrouter.ts:12] [E: packages/llm/src/providers/openrouter.ts:13] | `OpenRouterOptions` 支持 `usage/reasoning/promptCacheKey`，model options 可含这些字段。[E: packages/llm/src/providers/openrouter.ts:16] [E: packages/llm/src/providers/openrouter.ts:30] | auth fallback `OPENROUTER_API_KEY`。[E: packages/llm/src/providers/openrouter.ts:84] | 自定义 protocol wraps OpenAI Chat body，把 usage/reasoning/prompt_cache_key 映射进 body。[E: packages/llm/src/providers/openrouter.ts:38] [E: packages/llm/src/providers/openrouter.ts:56] |
| `XAIProvider` | `id = "xai"`；routes 是 Responses 与 compatible chat。[E: packages/llm/src/providers/xai.ts:8] [E: packages/llm/src/providers/xai.ts:15] | `apiKey/baseURL/providerOptions`。[E: packages/llm/src/providers/xai.ts:10] | auth fallback `XAI_API_KEY`。[E: packages/llm/src/providers/xai.ts:17] | baseURL 默认 profile `xai`，`model` 默认 Responses，同时暴露 `responses/chat`。[E: packages/llm/src/providers/xai.ts:19] [E: packages/llm/src/providers/xai.ts:46] |
| `GitHubCopilotProvider` | `id = "github-copilot"`。[E: packages/llm/src/providers/github-copilot.ts:8] | baseURL required；provider 无 canonical public URL。[E: packages/llm/src/providers/github-copilot.ts:12] [E: packages/llm/src/providers/github-copilot.ts:15] | bearer auth 用 explicit `apiKey`。[E: packages/llm/src/providers/github-copilot.ts:35] | GPT major >= 5 且非 `gpt-5-mini` 用 Responses，否则 Chat。[E: packages/llm/src/providers/github-copilot.ts:18] [E: packages/llm/src/providers/github-copilot.ts:56] |
| `CloudflareAIGatewayProvider` | `id = "cloudflare-ai-gateway"`。[E: packages/llm/src/providers/cloudflare.ts:8] | `accountId/baseURL/gatewayId/gatewayApiKey`。[E: packages/llm/src/providers/cloudflare.ts:22] [E: packages/llm/src/providers/cloudflare.ts:26] | Gateway auth header `cf-aig-authorization` from gatewayApiKey or envs `CLOUDFLARE_API_TOKEN/CF_AIG_TOKEN`。[E: packages/llm/src/providers/cloudflare.ts:42] [E: packages/llm/src/providers/cloudflare.ts:47] | baseURL is `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat` unless overridden。[E: packages/llm/src/providers/cloudflare.ts:36] [E: packages/llm/src/providers/cloudflare.ts:39] |
| `CloudflareWorkersAIProvider` | `id = "cloudflare-workers-ai"`。[E: packages/llm/src/providers/cloudflare.ts:9] | `accountId/baseURL/apiKey`。[E: packages/llm/src/providers/cloudflare.ts:34] | bearer auth uses apiKey through `workersAIAuth`。[E: packages/llm/src/providers/cloudflare.ts:59] | baseURL is `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`。[E: packages/llm/src/providers/cloudflare.ts:53] |

## OpenAI-Compatible Profiles

`openai-compatible-profile.ts` 预置 baseten、cerebras、deepinfra、deepseek、fireworks、groq、openrouter、togetherai、xai 的 baseURL。[E: packages/llm/src/providers/openai-compatible-profile.ts:6] [E: packages/llm/src/providers/openai-compatible-profile.ts:16] `openai-compatible.ts` 导出 profile facades：baseten/cerebras/deepinfra/deepseek/fireworks/groq/togetherai。[E: packages/llm/src/providers/openai-compatible.ts:59] [E: packages/llm/src/providers/openai-compatible.ts:65]

## Default OpenAI Options

`openai-options.ts` 把 provider semantic options 映射成 OpenAI providerOptions：`store/promptCacheKey/reasoningEffort/reasoningSummary/include/textVerbosity/serviceTier`。[E: packages/llm/src/providers/openai-options.ts:28] [E: packages/llm/src/providers/openai-options.ts:37] GPT-5 default options 会设置 reasoning effort medium、reasoning summary auto、include encrypted reasoning，并在部分 gpt-5.x 非 chat/pro/codex 模型上设置 low text verbosity。[E: packages/llm/src/providers/openai-options.ts:44] [E: packages/llm/src/providers/openai-options.ts:50]

## Sources

- packages/llm/src/providers/

## Related

- provider.catalog
