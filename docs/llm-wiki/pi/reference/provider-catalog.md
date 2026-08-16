---
id: ref.ai.provider-catalog
title: provider 完整目录(40)
kind: catalog
tier: T3
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
  - packages/ai/src/models.generated.ts
  - packages/ai/src/auth/helpers.ts
  - packages/ai/src/env-api-keys.ts
  - packages/coding-agent/src/core/model-resolver.ts
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
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/providers/qwen-token-plan.ts
  - packages/ai/src/providers/qwen-token-plan-cn.ts
  - packages/ai/src/providers/qwen-token-plan-individual.ts
  - packages/ai/src/providers/radius.ts
  - packages/ai/src/providers/together.ts
  - packages/ai/src/providers/vercel-ai-gateway.ts
  - packages/ai/src/providers/xai.ts
  - packages/ai/src/providers/xiaomi.ts
  - packages/ai/src/providers/xiaomi-token-plan-ams.ts
  - packages/ai/src/providers/xiaomi-token-plan-cn.ts
  - packages/ai/src/providers/xiaomi-token-plan-sgp.ts
  - packages/ai/src/providers/zai.ts
  - packages/ai/src/providers/zai-coding-cn.ts
symbols: [builtinProviders]
related: [subsys.ai.provider-registry, surface.providers.overview]
evidence: explicit
status: verified
updated: 086c32e745
---

> `ref.ai.provider-catalog` 逐实例列出 `packages/ai/src/providers/all.ts` 中 `builtinProviders()` 当前返回的 40 个 runtime 文本 provider：id、auth/env、api/wire、coding-agent 默认模型、source 文件。

## 能回答的问题

- `builtinProviders()` 当前返回多少个内置 provider?
- 某个 provider id 用哪个 factory、哪组 auth/env、哪条 wire API?
- 某个 provider 在 coding-agent 的默认模型是什么?
- runtime provider 集合与 generated `MODELS` bucket 差在哪里?
- 本轮新增的 Qwen Token Plan Individual 与国际 Token Plan 如何共享密钥?

## Provider 集合口径

membership 只按 `builtinProviders()` 的 return array 计算：当前 40 个 fresh provider objects，从 `amazonBedrockProvider()` 到 `zaiCodingCnProvider()`；本轮在 `qwenTokenPlanCnProvider()` 与 `radiusProvider()` 之间插入 `qwenTokenPlanIndividualProvider()` [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:118] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:130]。

generated `MODELS` 有 39 个 static bucket；`BuiltinProvider = keyof typeof MODELS`，Radius 只在 runtime array 中，没有 structural shard [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/models.generated.ts:74] [E: packages/ai/src/models.generated.ts:114] [E: packages/ai/src/providers/all.ts:121]。`builtinImagesProviders()` 另行返回 OpenRouter images，不计入本表 [E: packages/ai/src/providers/all.ts:144] [E: packages/ai/src/providers/all.ts:145]。

默认模型列来自 coding-agent `defaultModelPerProvider`，不是 `createProvider()` 字段；provider factory 只提供 catalog/auth/api [E: packages/coding-agent/src/core/model-resolver.ts:20] [E: packages/ai/src/models.ts:739] [E: packages/ai/src/models.ts:748] [I]。`envApiKeyAuth()` 的 stored credential key 优先，否则按传入 env var 顺序取第一个有值项 [E: packages/ai/src/auth/helpers.ts:9] [E: packages/ai/src/auth/helpers.ts:21] [E: packages/ai/src/auth/helpers.ts:23] [E: packages/ai/src/auth/helpers.ts:26]。

`qwen-token-plan` 与 `qwen-token-plan-individual` 共用 `QWEN_TOKEN_PLAN_API_KEY` 和同一新加坡 compatible-mode base URL；Individual 是更窄的 allowlist catalog，不是独立密钥 [E: packages/ai/src/providers/qwen-token-plan.ts:8] [E: packages/ai/src/providers/qwen-token-plan.ts:10] [E: packages/ai/src/providers/qwen-token-plan.ts:11] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/ai/src/env-api-keys.ts:81] [E: packages/ai/src/env-api-keys.ts:83]。

## 内置 provider 逐实例目录

| # | id / name | auth/env | api/wire | 默认模型 | source |
|---:|---|---|---|---|---|
| 1 | `amazon-bedrock` / `Amazon Bedrock` | `bedrockAuth`：stored bearer，或 `AWS_BEARER_TOKEN_BEDROCK` / `AWS_PROFILE` / access-key pair / ECS / IRSA 环境信号 [E: packages/ai/src/providers/amazon-bedrock.ts:11] [E: packages/ai/src/providers/amazon-bedrock.ts:61] [E: packages/ai/src/providers/amazon-bedrock.ts:64] [E: packages/ai/src/providers/amazon-bedrock.ts:65] [E: packages/ai/src/providers/amazon-bedrock.ts:72] [E: packages/ai/src/providers/amazon-bedrock.ts:75] [E: packages/ai/src/providers/amazon-bedrock.ts:76] [E: packages/ai/src/providers/amazon-bedrock.ts:77] | `bedrock-converse-stream` via `bedrockConverseStreamApi()` [E: packages/ai/src/providers/amazon-bedrock.ts:88] | `us.anthropic.claude-opus-4-6-v1` [E: packages/coding-agent/src/core/model-resolver.ts:21] | `packages/ai/src/providers/amazon-bedrock.ts` [E: packages/ai/src/providers/all.ts:91] |
| 2 | `ant-ling` / `Ant Ling` | `ANT_LING_API_KEY` via `envApiKeyAuth`；base `https://api.ant-ling.com/v1` [E: packages/ai/src/providers/ant-ling.ts:10] [E: packages/ai/src/providers/ant-ling.ts:11] | `openai-completions` [E: packages/ai/src/providers/ant-ling.ts:13] | `Ring-2.6-1T` [E: packages/coding-agent/src/core/model-resolver.ts:22] | `packages/ai/src/providers/ant-ling.ts` [E: packages/ai/src/providers/all.ts:92] |
| 3 | `anthropic` / `Anthropic` | stored credential → `ANTHROPIC_AUTH_TOKEN` Bearer header → `ANTHROPIC_OAUTH_TOKEN` / `ANTHROPIC_API_KEY`；另有 lazy OAuth `Anthropic (Claude Pro/Max)`；base `https://api.anthropic.com` [E: packages/ai/src/providers/anthropic.ts:20] [E: packages/ai/src/providers/anthropic.ts:24] [E: packages/ai/src/providers/anthropic.ts:28] [E: packages/ai/src/providers/anthropic.ts:33] [E: packages/ai/src/providers/anthropic.ts:50] | `anthropic-messages` [E: packages/ai/src/providers/anthropic.ts:57] | `claude-opus-4-8` [E: packages/coding-agent/src/core/model-resolver.ts:23] | `packages/ai/src/providers/anthropic.ts` [E: packages/ai/src/providers/all.ts:93] |
| 4 | `azure-openai-responses` / `Azure OpenAI` | `AZURE_OPENAI_API_KEY` via `envApiKeyAuth`；endpoint/version 由 API 层从 options/env/model base URL 解析 [E: packages/ai/src/providers/azure-openai-responses.ts:9] | `azure-openai-responses` [E: packages/ai/src/providers/azure-openai-responses.ts:12] | `gpt-5.4` [E: packages/coding-agent/src/core/model-resolver.ts:25] | `packages/ai/src/providers/azure-openai-responses.ts` [E: packages/ai/src/providers/all.ts:94] |
| 5 | `baseten` / `Baseten` | `BASETEN_API_KEY`；base `https://inference.baseten.co/v1` [E: packages/ai/src/providers/baseten.ts:10] [E: packages/ai/src/providers/baseten.ts:11] | `openai-completions` [E: packages/ai/src/providers/baseten.ts:13] | `zai-org/GLM-5.2` [E: packages/coding-agent/src/core/model-resolver.ts:48] | `packages/ai/src/providers/baseten.ts` [E: packages/ai/src/providers/all.ts:95] |
| 6 | `cerebras` / `Cerebras` | `CEREBRAS_API_KEY`；base `https://api.cerebras.ai/v1` [E: packages/ai/src/providers/cerebras.ts:10] [E: packages/ai/src/providers/cerebras.ts:11] | `openai-completions` [E: packages/ai/src/providers/cerebras.ts:13] | `zai-glm-4.7` [E: packages/coding-agent/src/core/model-resolver.ts:37] | `packages/ai/src/providers/cerebras.ts` [E: packages/ai/src/providers/all.ts:96] |
| 7 | `cloudflare-ai-gateway` / `Cloudflare AI Gateway` | `cloudflareAIGatewayAuth()`：`CLOUDFLARE_API_KEY` + account/gateway env [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:15] [E: packages/ai/src/env-api-keys.ts:111] | API map：`anthropic-messages` / `openai-completions` / `openai-responses`，均经 `cloudflareStreams()` [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:18] [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:19] [E: packages/ai/src/providers/cloudflare-ai-gateway.ts:20] | `workers-ai/@cf/moonshotai/kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:53] | `packages/ai/src/providers/cloudflare-ai-gateway.ts` [E: packages/ai/src/providers/all.ts:97] |
| 8 | `cloudflare-workers-ai` / `Cloudflare Workers AI` | `cloudflareWorkersAIAuth()`：`CLOUDFLARE_API_KEY` + account env [E: packages/ai/src/providers/cloudflare-workers-ai.ts:11] [E: packages/ai/src/env-api-keys.ts:110] | `openai-completions` via `cloudflareStreams()` [E: packages/ai/src/providers/cloudflare-workers-ai.ts:13] | `@cf/moonshotai/kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:52] | `packages/ai/src/providers/cloudflare-workers-ai.ts` [E: packages/ai/src/providers/all.ts:98] |
| 9 | `deepseek` / `DeepSeek` | `DEEPSEEK_API_KEY`；base `https://api.deepseek.com` [E: packages/ai/src/providers/deepseek.ts:10] [E: packages/ai/src/providers/deepseek.ts:11] | `openai-completions` [E: packages/ai/src/providers/deepseek.ts:13] | `deepseek-v4-pro` [E: packages/coding-agent/src/core/model-resolver.ts:29] | `packages/ai/src/providers/deepseek.ts` [E: packages/ai/src/providers/all.ts:99] |
| 10 | `fireworks` / `Fireworks` | `FIREWORKS_API_KEY`；base `https://api.fireworks.ai/inference` [E: packages/ai/src/providers/fireworks.ts:10] [E: packages/ai/src/providers/fireworks.ts:12] | API map：`anthropic-messages` / `openai-completions` [E: packages/ai/src/providers/fireworks.ts:15] [E: packages/ai/src/providers/fireworks.ts:16] | `accounts/fireworks/models/kimi-k2p6` [E: packages/coding-agent/src/core/model-resolver.ts:46] | `packages/ai/src/providers/fireworks.ts` [E: packages/ai/src/providers/all.ts:100] |
| 11 | `github-copilot` / `GitHub Copilot` | `COPILOT_GITHUB_TOKEN` + lazy OAuth `GitHub Copilot`；base `https://api.individual.githubcopilot.com`；OAuth credential 可按 `availableModelIds` 过滤 [E: packages/ai/src/providers/github-copilot.ts:13] [E: packages/ai/src/providers/github-copilot.ts:15] [E: packages/ai/src/providers/github-copilot.ts:16] [E: packages/ai/src/providers/github-copilot.ts:19] | API map：`anthropic-messages` / `openai-completions` / `openai-responses` [E: packages/ai/src/providers/github-copilot.ts:29] [E: packages/ai/src/providers/github-copilot.ts:30] [E: packages/ai/src/providers/github-copilot.ts:31] | `gpt-5.4` [E: packages/coding-agent/src/core/model-resolver.ts:32] | `packages/ai/src/providers/github-copilot.ts` [E: packages/ai/src/providers/all.ts:101] |
| 12 | `google` / `Google` | `GEMINI_API_KEY`；base `https://generativelanguage.googleapis.com/v1beta` [E: packages/ai/src/providers/google.ts:10] [E: packages/ai/src/providers/google.ts:11] | `google-generative-ai` [E: packages/ai/src/providers/google.ts:13] | `gemini-3.1-pro-preview` [E: packages/coding-agent/src/core/model-resolver.ts:30] | `packages/ai/src/providers/google.ts` [E: packages/ai/src/providers/all.ts:102] |
| 13 | `google-vertex` / `Google Vertex AI` | `GOOGLE_CLOUD_API_KEY` 或 ADC + project/location env [E: packages/ai/src/providers/google-vertex.ts:13] [E: packages/ai/src/env-api-keys.ts:89] | `google-vertex` [E: packages/ai/src/providers/google-vertex.ts:98] | `gemini-3.1-pro-preview` [E: packages/coding-agent/src/core/model-resolver.ts:31] | `packages/ai/src/providers/google-vertex.ts` [E: packages/ai/src/providers/all.ts:103] |
| 14 | `groq` / `Groq` | `GROQ_API_KEY`；base `https://api.groq.com/openai/v1` [E: packages/ai/src/providers/groq.ts:10] [E: packages/ai/src/providers/groq.ts:11] | `openai-completions` [E: packages/ai/src/providers/groq.ts:13] | `openai/gpt-oss-120b` [E: packages/coding-agent/src/core/model-resolver.ts:36] | `packages/ai/src/providers/groq.ts` [E: packages/ai/src/providers/all.ts:104] |
| 15 | `huggingface` / `Hugging Face` | `HF_TOKEN`；base `https://router.huggingface.co/v1` [E: packages/ai/src/providers/huggingface.ts:10] [E: packages/ai/src/providers/huggingface.ts:11] | `openai-completions` [E: packages/ai/src/providers/huggingface.ts:13] | `moonshotai/Kimi-K2.6` [E: packages/coding-agent/src/core/model-resolver.ts:45] | `packages/ai/src/providers/huggingface.ts` [E: packages/ai/src/providers/all.ts:105] |
| 16 | `kimi-coding` / `Kimi For Coding` | `KIMI_API_KEY` 或 lazy OAuth `Kimi Code (subscription)`；base `https://api.kimi.com/coding` [E: packages/ai/src/providers/kimi-coding.ts:11] [E: packages/ai/src/providers/kimi-coding.ts:13] [E: packages/ai/src/providers/kimi-coding.ts:15] | `anthropic-messages` [E: packages/ai/src/providers/kimi-coding.ts:22] | `kimi-for-coding` [E: packages/coding-agent/src/core/model-resolver.ts:51] | `packages/ai/src/providers/kimi-coding.ts` [E: packages/ai/src/providers/all.ts:106] |
| 17 | `minimax` / `MiniMax` | `MINIMAX_API_KEY`；base `https://api.minimax.io/anthropic` [E: packages/ai/src/providers/minimax.ts:10] [E: packages/ai/src/providers/minimax.ts:11] | `anthropic-messages` [E: packages/ai/src/providers/minimax.ts:13] | `MiniMax-M2.7` [E: packages/coding-agent/src/core/model-resolver.ts:41] | `packages/ai/src/providers/minimax.ts` [E: packages/ai/src/providers/all.ts:107] |
| 18 | `minimax-cn` / `MiniMax CN` | `MINIMAX_CN_API_KEY`；base `https://api.minimaxi.com/anthropic` [E: packages/ai/src/providers/minimax-cn.ts:10] [E: packages/ai/src/providers/minimax-cn.ts:11] | `anthropic-messages` [E: packages/ai/src/providers/minimax-cn.ts:13] | `MiniMax-M2.7` [E: packages/coding-agent/src/core/model-resolver.ts:42] | `packages/ai/src/providers/minimax-cn.ts` [E: packages/ai/src/providers/all.ts:108] |
| 19 | `mistral` / `Mistral` | `MISTRAL_API_KEY`；base `https://api.mistral.ai` [E: packages/ai/src/providers/mistral.ts:10] [E: packages/ai/src/providers/mistral.ts:11] | `mistral-conversations`（native HTTP Chat Completions stream） [E: packages/ai/src/providers/mistral.ts:13] | `devstral-medium-latest` [E: packages/coding-agent/src/core/model-resolver.ts:40] | `packages/ai/src/providers/mistral.ts` [E: packages/ai/src/providers/all.ts:109] |
| 20 | `moonshotai` / `Moonshot AI` | `MOONSHOT_API_KEY`；base `https://api.moonshot.ai/v1` [E: packages/ai/src/providers/moonshotai.ts:10] [E: packages/ai/src/providers/moonshotai.ts:11] | `openai-completions` [E: packages/ai/src/providers/moonshotai.ts:13] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:43] | `packages/ai/src/providers/moonshotai.ts` [E: packages/ai/src/providers/all.ts:110] |
| 21 | `moonshotai-cn` / `Moonshot AI CN` | 共享 `MOONSHOT_API_KEY`；base `https://api.moonshot.cn/v1` [E: packages/ai/src/providers/moonshotai-cn.ts:10] [E: packages/ai/src/providers/moonshotai-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/moonshotai-cn.ts:13] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:44] | `packages/ai/src/providers/moonshotai-cn.ts` [E: packages/ai/src/providers/all.ts:111] |
| 22 | `nvidia` / `NVIDIA` | `NVIDIA_API_KEY`；base `https://integrate.api.nvidia.com/v1` [E: packages/ai/src/providers/nvidia.ts:10] [E: packages/ai/src/providers/nvidia.ts:11] | `openai-completions` [E: packages/ai/src/providers/nvidia.ts:13] | `nvidia/nemotron-3-super-120b-a12b` [E: packages/coding-agent/src/core/model-resolver.ts:28] | `packages/ai/src/providers/nvidia.ts` [E: packages/ai/src/providers/all.ts:112] |
| 23 | `openai` / `OpenAI` | `OPENAI_API_KEY`；base `https://api.openai.com/v1` [E: packages/ai/src/providers/openai.ts:10] [E: packages/ai/src/providers/openai.ts:11] | `openai-responses` [E: packages/ai/src/providers/openai.ts:13] | `gpt-5.5` [E: packages/coding-agent/src/core/model-resolver.ts:24] | `packages/ai/src/providers/openai.ts` [E: packages/ai/src/providers/all.ts:113] |
| 24 | `openai-codex` / `OpenAI Codex` | 仅 lazy OAuth `OpenAI (ChatGPT Plus/Pro)`，无 api-key auth 项；base `https://chatgpt.com/backend-api` [E: packages/ai/src/providers/openai-codex.ts:12] [E: packages/ai/src/providers/openai-codex.ts:14] [E: packages/ai/src/providers/openai-codex.ts:11] | `openai-codex-responses` [E: packages/ai/src/providers/openai-codex.ts:20] | `gpt-5.5` [E: packages/coding-agent/src/core/model-resolver.ts:26] | `packages/ai/src/providers/openai-codex.ts` [E: packages/ai/src/providers/all.ts:114] |
| 25 | `opencode` / `OpenCode Zen` | `OPENCODE_API_KEY` [E: packages/ai/src/providers/opencode.ts:15] | API map：`anthropic-messages` / `google-generative-ai` / `openai-completions` / `openai-responses` [E: packages/ai/src/providers/opencode.ts:18] [E: packages/ai/src/providers/opencode.ts:19] [E: packages/ai/src/providers/opencode.ts:20] [E: packages/ai/src/providers/opencode.ts:21] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:49] | `packages/ai/src/providers/opencode.ts` [E: packages/ai/src/providers/all.ts:115] |
| 26 | `opencode-go` / `OpenCode Go` | 共享 `OPENCODE_API_KEY` [E: packages/ai/src/providers/opencode-go.ts:12] | API map：`anthropic-messages` / `openai-completions` / `openai-responses` [E: packages/ai/src/providers/opencode-go.ts:15] [E: packages/ai/src/providers/opencode-go.ts:16] [E: packages/ai/src/providers/opencode-go.ts:17] | `kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:50] | `packages/ai/src/providers/opencode-go.ts` [E: packages/ai/src/providers/all.ts:116] |
| 27 | `openrouter` / `OpenRouter` | `OPENROUTER_API_KEY` 或 lazy `OpenRouter OAuth`；base `https://openrouter.ai/api/v1` [E: packages/ai/src/providers/openrouter.ts:10] [E: packages/ai/src/providers/openrouter.ts:13] [E: packages/ai/src/providers/openrouter.ts:15] | `openai-completions` [E: packages/ai/src/providers/openrouter.ts:21] | `moonshotai/kimi-k2.6` [E: packages/coding-agent/src/core/model-resolver.ts:33] | `packages/ai/src/providers/openrouter.ts` [E: packages/ai/src/providers/all.ts:117] |
| 28 | `qwen-token-plan` / `Qwen Token Plan` | `QWEN_TOKEN_PLAN_API_KEY`；base `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` [E: packages/ai/src/providers/qwen-token-plan.ts:10] [E: packages/ai/src/providers/qwen-token-plan.ts:11] | `openai-completions` [E: packages/ai/src/providers/qwen-token-plan.ts:13] | `qwen3.7-max` [E: packages/coding-agent/src/core/model-resolver.ts:54] | `packages/ai/src/providers/qwen-token-plan.ts` [E: packages/ai/src/providers/all.ts:118] |
| 29 | `qwen-token-plan-cn` / `Qwen Token Plan CN` | `QWEN_TOKEN_PLAN_CN_API_KEY`；base `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` [E: packages/ai/src/providers/qwen-token-plan-cn.ts:10] [E: packages/ai/src/providers/qwen-token-plan-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/qwen-token-plan-cn.ts:13] | `qwen3.7-max` [E: packages/coding-agent/src/core/model-resolver.ts:55] | `packages/ai/src/providers/qwen-token-plan-cn.ts` [E: packages/ai/src/providers/all.ts:119] |
| 30 | `qwen-token-plan-individual` / `Qwen Token Plan Individual` | 与国际 Token Plan **共享** `QWEN_TOKEN_PLAN_API_KEY` 和同一新加坡 base URL；独立 id 与更窄 catalog [E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/ai/src/env-api-keys.ts:83] | `openai-completions` [E: packages/ai/src/providers/qwen-token-plan-individual.ts:13] | `qwen3.8-max` [E: packages/coding-agent/src/core/model-resolver.ts:56] | `packages/ai/src/providers/qwen-token-plan-individual.ts` [E: packages/ai/src/providers/all.ts:120] |
| 31 | `radius` / `Radius` | `RADIUS_API_KEY` 或 Radius OAuth；动态目录来自 gateway config，无 static `MODELS` bucket [E: packages/ai/src/providers/radius.ts:31] [E: packages/ai/src/providers/radius.ts:32] [E: packages/ai/src/providers/radius.ts:35] | `pi-messages` [E: packages/ai/src/providers/radius.ts:25] [E: packages/ai/src/providers/radius.ts:79] | `auto` [E: packages/coding-agent/src/core/model-resolver.ts:27] | `packages/ai/src/providers/radius.ts` [E: packages/ai/src/providers/all.ts:121] |
| 32 | `together` / `Together` | `TOGETHER_API_KEY`；base `https://api.together.ai/v1` [E: packages/ai/src/providers/together.ts:10] [E: packages/ai/src/providers/together.ts:11] | `openai-completions` [E: packages/ai/src/providers/together.ts:13] | `moonshotai/Kimi-K2.6` [E: packages/coding-agent/src/core/model-resolver.ts:47] | `packages/ai/src/providers/together.ts` [E: packages/ai/src/providers/all.ts:122] |
| 33 | `vercel-ai-gateway` / `Vercel AI Gateway` | `AI_GATEWAY_API_KEY`；base `https://ai-gateway.vercel.sh` [E: packages/ai/src/providers/vercel-ai-gateway.ts:10] [E: packages/ai/src/providers/vercel-ai-gateway.ts:11] | `anthropic-messages` [E: packages/ai/src/providers/vercel-ai-gateway.ts:13] | `zai/glm-5.1` [E: packages/coding-agent/src/core/model-resolver.ts:34] | `packages/ai/src/providers/vercel-ai-gateway.ts` [E: packages/ai/src/providers/all.ts:123] |
| 34 | `xai` / `xAI` | `XAI_API_KEY` 或 lazy OAuth `xAI (Grok/X subscription)`；base `https://api.x.ai/v1` [E: packages/ai/src/providers/xai.ts:12] [E: packages/ai/src/providers/xai.ts:14] [E: packages/ai/src/providers/xai.ts:16] | API map：`openai-completions` / `openai-responses` [E: packages/ai/src/providers/xai.ts:24] [E: packages/ai/src/providers/xai.ts:25] | `grok-4.5` [E: packages/coding-agent/src/core/model-resolver.ts:35] | `packages/ai/src/providers/xai.ts` [E: packages/ai/src/providers/all.ts:124] |
| 35 | `xiaomi` / `Xiaomi` | `XIAOMI_API_KEY`；base `https://api.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi.ts:10] [E: packages/ai/src/providers/xiaomi.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:57] | `packages/ai/src/providers/xiaomi.ts` [E: packages/ai/src/providers/all.ts:125] |
| 36 | `xiaomi-token-plan-ams` / `Xiaomi Token Plan AMS` | `XIAOMI_TOKEN_PLAN_AMS_API_KEY`；base `https://token-plan-ams.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi-token-plan-ams.ts:10] [E: packages/ai/src/providers/xiaomi-token-plan-ams.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi-token-plan-ams.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:59] | `packages/ai/src/providers/xiaomi-token-plan-ams.ts` [E: packages/ai/src/providers/all.ts:126] |
| 37 | `xiaomi-token-plan-cn` / `Xiaomi Token Plan CN` | `XIAOMI_TOKEN_PLAN_CN_API_KEY`；base `https://token-plan-cn.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi-token-plan-cn.ts:10] [E: packages/ai/src/providers/xiaomi-token-plan-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi-token-plan-cn.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:58] | `packages/ai/src/providers/xiaomi-token-plan-cn.ts` [E: packages/ai/src/providers/all.ts:127] |
| 38 | `xiaomi-token-plan-sgp` / `Xiaomi Token Plan SGP` | `XIAOMI_TOKEN_PLAN_SGP_API_KEY`；base `https://token-plan-sgp.xiaomimimo.com/v1` [E: packages/ai/src/providers/xiaomi-token-plan-sgp.ts:10] [E: packages/ai/src/providers/xiaomi-token-plan-sgp.ts:11] | `openai-completions` [E: packages/ai/src/providers/xiaomi-token-plan-sgp.ts:13] | `mimo-v2.5-pro` [E: packages/coding-agent/src/core/model-resolver.ts:60] | `packages/ai/src/providers/xiaomi-token-plan-sgp.ts` [E: packages/ai/src/providers/all.ts:128] |
| 39 | `zai` / `Z.AI` | `ZAI_API_KEY`；base `https://api.z.ai/api/coding/paas/v4` [E: packages/ai/src/providers/zai.ts:10] [E: packages/ai/src/providers/zai.ts:11] | `openai-completions` [E: packages/ai/src/providers/zai.ts:13] | `glm-5.3` [E: packages/coding-agent/src/core/model-resolver.ts:38] | `packages/ai/src/providers/zai.ts` [E: packages/ai/src/providers/all.ts:129] |
| 40 | `zai-coding-cn` / `Z.AI Coding CN` | `ZAI_CODING_CN_API_KEY`；base `https://open.bigmodel.cn/api/coding/paas/v4` [E: packages/ai/src/providers/zai-coding-cn.ts:10] [E: packages/ai/src/providers/zai-coding-cn.ts:11] | `openai-completions` [E: packages/ai/src/providers/zai-coding-cn.ts:13] | `glm-5.3` [E: packages/coding-agent/src/core/model-resolver.ts:39] | `packages/ai/src/providers/zai-coding-cn.ts` [E: packages/ai/src/providers/all.ts:130] |

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts
- packages/ai/src/models.generated.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/env-api-keys.ts
- packages/coding-agent/src/core/model-resolver.ts
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
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/providers/qwen-token-plan.ts
- packages/ai/src/providers/qwen-token-plan-cn.ts
- packages/ai/src/providers/qwen-token-plan-individual.ts
- packages/ai/src/providers/radius.ts
- packages/ai/src/providers/together.ts
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
