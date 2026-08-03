---
id: ref.ai.model-catalog
title: 模型目录(target structure + v0.83.0/Baseten snapshot)
kind: catalog
tier: T3
pkg: ai
source:
  - packages/ai/src/models.generated.ts
  - packages/ai/src/model-catalog.ts
  - packages/ai/src/providers/amazon-bedrock.models.ts
  - packages/ai/src/providers/ant-ling.models.ts
  - packages/ai/src/providers/anthropic.models.ts
  - packages/ai/src/providers/azure-openai-responses.models.ts
  - packages/ai/src/providers/baseten.models.ts
  - packages/ai/src/providers/cerebras.models.ts
  - packages/ai/src/providers/cloudflare-ai-gateway.models.ts
  - packages/ai/src/providers/cloudflare-workers-ai.models.ts
  - packages/ai/src/providers/deepseek.models.ts
  - packages/ai/src/providers/fireworks.models.ts
  - packages/ai/src/providers/github-copilot.models.ts
  - packages/ai/src/providers/google.models.ts
  - packages/ai/src/providers/google-vertex.models.ts
  - packages/ai/src/providers/groq.models.ts
  - packages/ai/src/providers/huggingface.models.ts
  - packages/ai/src/providers/kimi-coding.models.ts
  - packages/ai/src/providers/minimax.models.ts
  - packages/ai/src/providers/minimax-cn.models.ts
  - packages/ai/src/providers/mistral.models.ts
  - packages/ai/src/providers/moonshotai.models.ts
  - packages/ai/src/providers/moonshotai-cn.models.ts
  - packages/ai/src/providers/nvidia.models.ts
  - packages/ai/src/providers/openai.models.ts
  - packages/ai/src/providers/openai-codex.models.ts
  - packages/ai/src/providers/opencode.models.ts
  - packages/ai/src/providers/opencode-go.models.ts
  - packages/ai/src/providers/openrouter.models.ts
  - packages/ai/src/providers/qwen-token-plan.models.ts
  - packages/ai/src/providers/qwen-token-plan-cn.models.ts
  - packages/ai/src/providers/together.models.ts
  - packages/ai/src/providers/vercel-ai-gateway.models.ts
  - packages/ai/src/providers/xai.models.ts
  - packages/ai/src/providers/xiaomi.models.ts
  - packages/ai/src/providers/xiaomi-token-plan-ams.models.ts
  - packages/ai/src/providers/xiaomi-token-plan-cn.models.ts
  - packages/ai/src/providers/xiaomi-token-plan-sgp.models.ts
  - packages/ai/src/providers/zai.models.ts
  - packages/ai/src/providers/zai-coding-cn.models.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/model-data.ts
  - packages/ai/scripts/check-model-data.ts
  - packages/ai/package.json
symbols:
  - MODELS
  - ModelCatalog
  - flattenModelCatalog
related:
  - subsys.ai.model-discovery
  - subsys.ai.model-catalog-publication
evidence: inferred
status: verified
updated: 305c014dcc
---

> 目标 commit 显式定义 38 个静态 provider bucket；目标 membership 由官方 `@earendil-works/pi-ai@0.83.0` 制品的 1,153 个模型，加上 target 新增 Baseten generator 在审计快照中的 16 个 active models，合计 1,169。逐模型数仍标为 `[I]`：ignored JSON 不在 target tree，且 Baseten 输入来自会漂移的 models.dev。

## 证据边界

目标源码的 provider shard 不再内联 model values，而是 import 被 Git 忽略的 `./data/<provider>.json`，再由 `ModelCatalog` / `flattenModelCatalog()` 形成类型化目录。[E: packages/ai/src/providers/openai.models.ts:4] [E: packages/ai/src/providers/openai.models.ts:5] [E: packages/ai/src/providers/openai.models.ts:7] [E: packages/ai/src/model-catalog.ts:15] [E: packages/ai/src/model-catalog.ts:22]

`models.generated.ts` 显式聚合 38 个 provider；本轮相对 `a8ee03b815` 新增 `BASETEN_MODELS` import、typed key 与 value entry。[E: packages/ai/src/models.generated.ts:4] [E: packages/ai/src/models.generated.ts:8] [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:48] [E: packages/ai/src/models.generated.ts:82] [E: packages/ai/src/models.generated.ts:87]

生成器分别写 structural shards、`models.generated.ts`、ignored JSON data 与发布用 JSON bundle；package build 会先 hydrate/check data，再把它复制进 dist。[E: packages/ai/scripts/generate-models.ts:2770] [E: packages/ai/scripts/generate-models.ts:2777] [E: packages/ai/scripts/generate-models.ts:2785] [E: packages/ai/scripts/generate-models.ts:2791] [E: packages/ai/scripts/generate-models.ts:2804] [E: packages/ai/scripts/generate-models.ts:2808] [E: packages/ai/scripts/generate-models.ts:2812] [E: packages/ai/scripts/generate-models.ts:2832] [E: packages/ai/scripts/generate-models.ts:2836] [E: packages/ai/scripts/generate-models.ts:2839] [E: packages/ai/package.json:52] [E: packages/ai/package.json:58]

官方 npm registry 的 `@earendil-works/pi-ai@0.83.0` metadata 给出 `gitHead=845d6ff1f6643aba440341cce877ce1c43ebbc39`，该 release commit 是目标 `c1019d9202` 的祖先；artifact manifest schema 3、37 个 JSON shard，flatten 后为 1,153 个 model。[I] `c1019d9202` 显式新增第 38 个 Baseten shard，但 ignored `data/baseten.json` 不在 Git tree。[E: packages/ai/src/providers/baseten.models.ts:4] [E: packages/ai/src/providers/baseten.models.ts:7] [E: packages/ai/src/providers/baseten.models.ts:8]

审计于 `2026-08-03T13:10:07Z` 下载 `https://models.dev/api.json`（SHA-256 `b3a52ba98bb4b58714734f8bb98c9bc7ffeff3558f915bcc3211cfe5f276728d`）：Baseten 有 18 rows，其中 2 个 `status: deprecated`，按 target generator 的唯一 membership filter 后为 16。[E: packages/ai/scripts/generate-models.ts:1094] [E: packages/ai/scripts/generate-models.ts:1142] [E: packages/ai/scripts/generate-models.ts:1143] [I] 因此 target catalog 口径为 `1,153 + 16 = 1,169`；这个 Baseten 数是带时间/hash 的远端快照，不伪装成 commit-local `[E]`。

## Provider 覆盖摘要

本摘要的旧 37-bucket model 数由官方 npm v0.83.0 artifact 推导；API 分布再应用 target generator 对 Fireworks 两个 Kimi K3 row 的 wire override。Baseten 一行来自上述带 hash 的 models.dev 快照，统一为 `[I]`。末列 `[E]` 只证明目标 commit 存在对应 structural provider bucket，不把制品/远端快照中的数量提升为 commit-local explicit fact。

| provider | models | API 分布 | commit bucket evidence |
|---|---:|---|---|
| `amazon-bedrock` | 114 | `bedrock-converse-stream` 114 | [E: packages/ai/src/models.generated.ts:44] |
| `ant-ling` | 3 | `openai-completions` 3 | [E: packages/ai/src/models.generated.ts:45] |
| `anthropic` | 15 | `anthropic-messages` 15 | [E: packages/ai/src/models.generated.ts:46] |
| `azure-openai-responses` | 38 | `azure-openai-responses` 38 | [E: packages/ai/src/models.generated.ts:47] |
| `baseten` | 16 | `openai-completions` 16 | [E: packages/ai/src/models.generated.ts:48] |
| `cerebras` | 3 | `openai-completions` 3 | [E: packages/ai/src/models.generated.ts:49] |
| `cloudflare-ai-gateway` | 43 | `anthropic-messages` 19; `openai-completions` 5; `openai-responses` 19 | [E: packages/ai/src/models.generated.ts:50] |
| `cloudflare-workers-ai` | 13 | `openai-completions` 13 | [E: packages/ai/src/models.generated.ts:51] |
| `deepseek` | 2 | `openai-completions` 2 | [E: packages/ai/src/models.generated.ts:52] |
| `fireworks` | 16 | `anthropic-messages` 12; `openai-completions` 4 | [E: packages/ai/src/models.generated.ts:53] |
| `github-copilot` | 29 | `anthropic-messages` 10; `openai-completions` 7; `openai-responses` 12 | [E: packages/ai/src/models.generated.ts:54] |
| `google` | 24 | `google-generative-ai` 24 | [E: packages/ai/src/models.generated.ts:55] |
| `google-vertex` | 12 | `google-vertex` 12 | [E: packages/ai/src/models.generated.ts:56] |
| `groq` | 7 | `openai-completions` 7 | [E: packages/ai/src/models.generated.ts:57] |
| `huggingface` | 51 | `openai-completions` 51 | [E: packages/ai/src/models.generated.ts:58] |
| `kimi-coding` | 4 | `anthropic-messages` 4 | [E: packages/ai/src/models.generated.ts:59] |
| `minimax` | 3 | `anthropic-messages` 3 | [E: packages/ai/src/models.generated.ts:60] |
| `minimax-cn` | 3 | `anthropic-messages` 3 | [E: packages/ai/src/models.generated.ts:61] |
| `mistral` | 30 | `mistral-conversations` 30 | [E: packages/ai/src/models.generated.ts:62] |
| `moonshotai` | 10 | `openai-completions` 10 | [E: packages/ai/src/models.generated.ts:63] |
| `moonshotai-cn` | 10 | `openai-completions` 10 | [E: packages/ai/src/models.generated.ts:64] |
| `nvidia` | 30 | `openai-completions` 30 | [E: packages/ai/src/models.generated.ts:65] |
| `openai` | 38 | `openai-responses` 38 | [E: packages/ai/src/models.generated.ts:66] |
| `openai-codex` | 7 | `openai-codex-responses` 7 | [E: packages/ai/src/models.generated.ts:67] |
| `opencode` | 59 | `anthropic-messages` 14; `google-generative-ai` 5; `openai-completions` 20; `openai-responses` 20 | [E: packages/ai/src/models.generated.ts:68] |
| `opencode-go` | 16 | `anthropic-messages` 3; `openai-completions` 12; `openai-responses` 1 | [E: packages/ai/src/models.generated.ts:69] |
| `openrouter` | 303 | `openai-completions` 303 | [E: packages/ai/src/models.generated.ts:70] |
| `qwen-token-plan` | 15 | `openai-completions` 15 | [E: packages/ai/src/models.generated.ts:71] |
| `qwen-token-plan-cn` | 15 | `openai-completions` 15 | [E: packages/ai/src/models.generated.ts:72] |
| `together` | 17 | `openai-completions` 17 | [E: packages/ai/src/models.generated.ts:73] |
| `vercel-ai-gateway` | 193 | `anthropic-messages` 193 | [E: packages/ai/src/models.generated.ts:74] |
| `xai` | 3 | `openai-completions` 2; `openai-responses` 1 | [E: packages/ai/src/models.generated.ts:75] |
| `xiaomi` | 6 | `openai-completions` 6 | [E: packages/ai/src/models.generated.ts:76] |
| `xiaomi-token-plan-ams` | 3 | `openai-completions` 3 | [E: packages/ai/src/models.generated.ts:77] |
| `xiaomi-token-plan-cn` | 3 | `openai-completions` 3 | [E: packages/ai/src/models.generated.ts:78] |
| `xiaomi-token-plan-sgp` | 3 | `openai-completions` 3 | [E: packages/ai/src/models.generated.ts:79] |
| `zai` | 6 | `openai-completions` 6 | [E: packages/ai/src/models.generated.ts:80] |
| `zai-coding-cn` | 6 | `openai-completions` 6 | [E: packages/ai/src/models.generated.ts:81] |

## v0.82.1 → target membership delta

v0.82.1 → v0.83.0 membership 为 `+51 / -7`，净增 44，即 `1,109 + 44 = 1,153`。删除 7 个 id：Fireworks 的 `accounts/fireworks/models/glm-5p1`、`accounts/fireworks/routers/glm-5p1-fast`；NVIDIA 的 `mistralai/mistral-small-4-119b-2603`、`stepfun-ai/step-3.5-flash`；OpenRouter 的 `poolside/laguna-m.1`、`poolside/laguna-m.1:free`；Vercel AI Gateway 的 `google/gemini-3-pro-preview`。[I]

新增分布为 Cloudflare AI Gateway +1 `claude-opus-5`；Fireworks +2 `accounts/fireworks/models/kimi-k3`、`accounts/fireworks/routers/kimi-k3-fast`；Hugging Face +1 `moonshotai/Kimi-K3`；OpenCode +1 `kimi-k3`；Together +1 `moonshotai/Kimi-K3`；Vercel AI Gateway +2 `alibaba/qwen3.7-flash`、`moonshotai/kimi-k3-fast`；NVIDIA +14（Gemma 3、Mistral、Nemotron、Laguna XS 与 Inkling rows）；OpenRouter +29（28 个 `:batch` alias 与 `qwen/qwen3.7-flash`）。[I]

target generator 还把 Fireworks 两个 Kimi K3 id 固定到 `openai-completions`、Fireworks base URL，并启用 reasoning/deferred/session-affinity compat；加上 Baseten 16 个 `openai-completions` models 后，target API 总分布是 `anthropic-messages=276`、`azure-openai-responses=38`、`bedrock-converse-stream=114`、`google-generative-ai=29`、`google-vertex=12`、`mistral-conversations=30`、`openai-codex-responses=7`、`openai-completions=572`、`openai-responses=91`，合计 1,169。[E: packages/ai/scripts/generate-models.ts:1094] [E: packages/ai/scripts/generate-models.ts:1164] [E: packages/ai/scripts/generate-models.ts:1167] [E: packages/ai/scripts/generate-models.ts:1168] [I]

Baseten 的 16 个 active snapshot ids 是：`nvidia/Nemotron-120B-A12B`、`nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B`、`thinkingmachines/inkling-small`、`thinkingmachines/inkling`、`zai-org/GLM-5`、`zai-org/GLM-5.2-Fast`、`zai-org/GLM-5.2`、`zai-org/GLM-5.1`、`zai-org/GLM-4.7`、`deepseek-ai/DeepSeek-V4-Flash-0731`、`deepseek-ai/DeepSeek-V4-Pro`、`moonshotai/Kimi-K2.6`、`moonshotai/Kimi-K2.5`、`moonshotai/Kimi-K2.7-Code`、`moonshotai/Kimi-K3`、`openai/gpt-oss-120b`。[I]

以下逐实例表保留 v0.82.1 artifact snapshot，结合本节 delta 才是 target membership；不能把单个旧 snapshot row 误写成 target tree 内 `[E]`。

## MODELS 逐实例目录（v0.82.1 snapshot）

### amazon-bedrock

| id | provider | api/wire | evidence |
|---|---|---|---|
| `amazon.nova-2-lite-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `amazon.nova-lite-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `amazon.nova-micro-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `amazon.nova-pro-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-fable-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-haiku-4-5-20251001-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-opus-4-1-20250805-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-opus-4-5-20251101-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-opus-4-6-v1` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-opus-4-7` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-opus-4-8` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-sonnet-4-5-20250929-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-sonnet-4-6` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `anthropic.claude-sonnet-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-haiku-4-5-20251001-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-opus-4-6-v1` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-opus-4-8` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-opus-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-sonnet-4-5-20250929-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-sonnet-4-6` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `au.anthropic.claude-sonnet-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `deepseek.r1-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `deepseek.v3-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `deepseek.v3.2` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-fable-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-haiku-4-5-20251001-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-opus-4-5-20251101-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-opus-4-6-v1` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-opus-4-7` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-opus-4-8` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-opus-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-sonnet-4-5-20250929-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-sonnet-4-6` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `eu.anthropic.claude-sonnet-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-fable-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-opus-4-5-20251101-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-opus-4-6-v1` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-opus-4-7` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-opus-4-8` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-opus-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-sonnet-4-5-20250929-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-sonnet-4-6` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `global.anthropic.claude-sonnet-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `google.gemma-3-27b-it` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `google.gemma-3-4b-it` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-haiku-4-5-20251001-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-opus-4-7` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-opus-4-8` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-opus-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-sonnet-4-5-20250929-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-sonnet-4-6` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `jp.anthropic.claude-sonnet-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `meta.llama3-1-70b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `meta.llama3-1-8b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `meta.llama3-3-70b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `meta.llama4-maverick-17b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `meta.llama4-scout-17b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `minimax.minimax-m2` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `minimax.minimax-m2.1` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `minimax.minimax-m2.5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.devstral-2-123b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.magistral-small-2509` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.ministral-3-14b-instruct` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.ministral-3-3b-instruct` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.ministral-3-8b-instruct` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.mistral-large-3-675b-instruct` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.pixtral-large-2502-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.voxtral-mini-3b-2507` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `mistral.voxtral-small-24b-2507` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `moonshot.kimi-k2-thinking` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `moonshotai.kimi-k2.5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `nvidia.nemotron-nano-12b-v2` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `nvidia.nemotron-nano-3-30b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `nvidia.nemotron-nano-9b-v2` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `nvidia.nemotron-super-3-120b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-5.4` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-5.5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-5.6-luna` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-5.6-sol` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-5.6-terra` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-oss-120b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-oss-120b-1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-oss-20b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-oss-20b-1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-oss-safeguard-120b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `openai.gpt-oss-safeguard-20b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-235b-a22b-2507-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-32b-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-coder-30b-a3b-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-coder-480b-a35b-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-coder-next` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-next-80b-a3b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `qwen.qwen3-vl-235b-a22b` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-fable-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-haiku-4-5-20251001-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-opus-4-1-20250805-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-opus-4-5-20251101-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-opus-4-6-v1` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-opus-4-7` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-opus-4-8` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-opus-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-sonnet-4-6` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.anthropic.claude-sonnet-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.deepseek.r1-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.meta.llama4-maverick-17b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `us.meta.llama4-scout-17b-instruct-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `writer.palmyra-x4-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `writer.palmyra-x5-v1:0` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `xai.grok-4.3` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `zai.glm-4.7` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `zai.glm-4.7-flash` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |
| `zai.glm-5` | `amazon-bedrock` | `bedrock-converse-stream` | npm v0.82.1 artifact [I] |

### ant-ling

| id | provider | api/wire | evidence |
|---|---|---|---|
| `Ling-2.6-1T` | `ant-ling` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Ling-2.6-flash` | `ant-ling` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Ring-2.6-1T` | `ant-ling` | `openai-completions` | npm v0.82.1 artifact [I] |

### anthropic

| id | provider | api/wire | evidence |
|---|---|---|---|
| `claude-fable-5` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-haiku-4-5` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-haiku-4-5-20251001` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-1` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-1-20250805` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-5` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-5-20251101` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-6` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-7` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-8` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-5` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-5` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-5-20250929` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-6` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-5` | `anthropic` | `anthropic-messages` | npm v0.82.1 artifact [I] |

### azure-openai-responses

| id | provider | api/wire | evidence |
|---|---|---|---|
| `gpt-4` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4-turbo` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4.1` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4.1-mini` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4.1-nano` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-2024-05-13` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-2024-08-06` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-2024-11-20` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-mini` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-chat-latest` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-mini` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-nano` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-pro` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-chat-latest` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-pro` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-chat-latest` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex-spark` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-mini` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-nano` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-pro` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5-pro` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-luna` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-sol` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-terra` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-realtime-2.1` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `o1` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `o1-pro` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `o3` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `o3-mini` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `o3-pro` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |
| `o4-mini` | `azure-openai-responses` | `azure-openai-responses` | npm v0.82.1 artifact [I] |

### cerebras

| id | provider | api/wire | evidence |
|---|---|---|---|
| `gemma-4-31b` | `cerebras` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gpt-oss-120b` | `cerebras` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-glm-4.7` | `cerebras` | `openai-completions` | npm v0.82.1 artifact [I] |

### cloudflare-ai-gateway

| id | provider | api/wire | evidence |
|---|---|---|---|
| `claude-3-5-haiku` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-3-haiku` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-3-opus` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-3-sonnet` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-3.5-haiku` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-3.5-sonnet` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-fable-5` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-haiku-4-5` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-1` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-5` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-6` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-7` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-8` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-5` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-6` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-5` | `cloudflare-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `workers-ai/@cf/moonshotai/kimi-k2.5` | `cloudflare-ai-gateway` | `openai-completions` | npm v0.82.1 artifact [I] |
| `workers-ai/@cf/moonshotai/kimi-k2.6` | `cloudflare-ai-gateway` | `openai-completions` | npm v0.82.1 artifact [I] |
| `workers-ai/@cf/nvidia/nemotron-3-120b-a12b` | `cloudflare-ai-gateway` | `openai-completions` | npm v0.82.1 artifact [I] |
| `workers-ai/@cf/zai-org/glm-4.7-flash` | `cloudflare-ai-gateway` | `openai-completions` | npm v0.82.1 artifact [I] |
| `workers-ai/@cf/zai-org/glm-5.2` | `cloudflare-ai-gateway` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gpt-4` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4-turbo` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-mini` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1-codex` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-codex` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-luna` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-sol` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-terra` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o1` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o3` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o3-mini` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o3-pro` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o4-mini` | `cloudflare-ai-gateway` | `openai-responses` | npm v0.82.1 artifact [I] |

### cloudflare-workers-ai

| id | provider | api/wire | evidence |
|---|---|---|---|
| `@cf/google/gemma-4-26b-a4b-it` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/ibm-granite/granite-4.0-h-micro` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/moonshotai/kimi-k2.6` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/moonshotai/kimi-k2.7-code` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/nvidia/nemotron-3-120b-a12b` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/openai/gpt-oss-120b` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/openai/gpt-oss-20b` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/qwen/qwen3-30b-a3b-fp8` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/zai-org/glm-4.7-flash` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `@cf/zai-org/glm-5.2` | `cloudflare-workers-ai` | `openai-completions` | npm v0.82.1 artifact [I] |

### deepseek

| id | provider | api/wire | evidence |
|---|---|---|---|
| `deepseek-v4-flash` | `deepseek` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-pro` | `deepseek` | `openai-completions` | npm v0.82.1 artifact [I] |

### fireworks

| id | provider | api/wire | evidence |
|---|---|---|---|
| `accounts/fireworks/models/deepseek-v4-flash` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/deepseek-v4-pro` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/glm-5p1` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/gpt-oss-120b` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/gpt-oss-20b` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/kimi-k2p6` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/kimi-k2p7-code` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/minimax-m2p7` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/minimax-m3` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/qwen3p7-plus` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/routers/glm-5p1-fast` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/routers/kimi-k2p6-fast` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/routers/kimi-k2p6-turbo` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/routers/kimi-k2p7-code-fast` | `fireworks` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/models/glm-5p2` | `fireworks` | `openai-completions` | npm v0.82.1 artifact [I] |
| `accounts/fireworks/routers/glm-5p2-fast` | `fireworks` | `openai-completions` | npm v0.82.1 artifact [I] |

### github-copilot

| id | provider | api/wire | evidence |
|---|---|---|---|
| `claude-haiku-4.5` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4.5` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4.6` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4.7` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4.8` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-5` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4.5` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4.6` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-5` | `github-copilot` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-fable-5` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gemini-2.5-pro` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gemini-3-flash-preview` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gemini-3.1-pro-preview` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gpt-4.1` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `github-copilot` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gpt-5-mini` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-codex` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-mini` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-nano` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-luna` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-sol` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-terra` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |
| `mai-code-1-flash-picker` | `github-copilot` | `openai-responses` | npm v0.82.1 artifact [I] |

### google

| id | provider | api/wire | evidence |
|---|---|---|---|
| `deep-research-max-preview-04-2026` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `deep-research-preview-04-2026` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-2.0-flash` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-2.0-flash-lite` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-2.5-computer-use-preview-10-2025` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-2.5-flash` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-2.5-flash-lite` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-2.5-pro` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3-flash-preview` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3-pro-preview` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-flash-lite` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-flash-lite-image` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-flash-lite-preview` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-flash-live-preview` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-pro-preview` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-pro-preview-customtools` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash-lite` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.6-flash` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-flash-latest` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-flash-lite-latest` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-robotics-er-1.6-preview` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemma-4-26b-a4b-it` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemma-4-31b-it` | `google` | `google-generative-ai` | npm v0.82.1 artifact [I] |

### google-vertex

| id | provider | api/wire | evidence |
|---|---|---|---|
| `gemini-2.5-flash` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-2.5-flash-lite` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-2.5-pro` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3-flash-preview` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3.1-flash-lite` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3.1-pro-preview` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3.1-pro-preview-customtools` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash-lite` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-3.6-flash` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-flash-latest` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |
| `gemini-flash-lite-latest` | `google-vertex` | `google-vertex` | npm v0.82.1 artifact [I] |

### groq

| id | provider | api/wire | evidence |
|---|---|---|---|
| `llama-3.1-8b-instant` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |
| `llama-3.3-70b-versatile` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/llama-4-scout-17b-16e-instruct` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-120b` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-safeguard-20b` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-32b` | `groq` | `openai-completions` | npm v0.82.1 artifact [I] |

### huggingface

| id | provider | api/wire | evidence |
|---|---|---|---|
| `deepseek-ai/DeepSeek-R1` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-ai/DeepSeek-R1-0528` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-ai/DeepSeek-V3.2` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-ai/DeepSeek-V4-Flash` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-ai/DeepSeek-V4-Pro` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-26B-A4B-it` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-31B-it` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/Llama-3.3-70B-Instruct` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M2` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M2.1` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M2.5` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M2.7` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M3` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2-Instruct` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2-Instruct-0905` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2-Thinking` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2.5` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2.6` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2.7-Code` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-120b` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-235B-A22B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-235B-A22B-Thinking-2507` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-32B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-Coder-30B-A3B-Instruct` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-Coder-480B-A35B-Instruct` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-Coder-Next` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-Next-80B-A3B-Instruct` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3-Next-80B-A3B-Thinking` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.5-122B-A10B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.5-27B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.5-35B-A3B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.5-397B-A17B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.5-9B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.6-27B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.6-35B-A3B` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `stepfun-ai/Step-3.5-Flash` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `stepfun-ai/Step-3.7-Flash` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `XiaomiMiMo/MiMo-V2-Flash` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `XiaomiMiMo/MiMo-V2.5` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `XiaomiMiMo/MiMo-V2.5-Pro` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-4.5` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-4.5-Air` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-4.5V` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-4.6` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-4.7` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-4.7-Flash` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-5` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-5.1` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-5.2` | `huggingface` | `openai-completions` | npm v0.82.1 artifact [I] |

### kimi-coding

| id | provider | api/wire | evidence |
|---|---|---|---|
| `k3` | `kimi-coding` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `k3-256k` | `kimi-coding` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `kimi-for-coding` | `kimi-coding` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `kimi-for-coding-highspeed` | `kimi-coding` | `anthropic-messages` | npm v0.82.1 artifact [I] |

### minimax

| id | provider | api/wire | evidence |
|---|---|---|---|
| `MiniMax-M2.7` | `minimax` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `MiniMax-M2.7-highspeed` | `minimax` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `MiniMax-M3` | `minimax` | `anthropic-messages` | npm v0.82.1 artifact [I] |

### minimax-cn

| id | provider | api/wire | evidence |
|---|---|---|---|
| `MiniMax-M2.7` | `minimax-cn` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `MiniMax-M2.7-highspeed` | `minimax-cn` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `MiniMax-M3` | `minimax-cn` | `anthropic-messages` | npm v0.82.1 artifact [I] |

### mistral

| id | provider | api/wire | evidence |
|---|---|---|---|
| `codestral-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `devstral-2512` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `devstral-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `devstral-medium-2507` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `devstral-medium-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `devstral-small-2505` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `devstral-small-2507` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `labs-devstral-small-2512` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `magistral-medium-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `magistral-small` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `ministral-3b-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `ministral-8b-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-large-2411` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-large-2512` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-large-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-medium-2505` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-medium-2508` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-medium-2604` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-medium-3.5` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-medium-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-nemo` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-small-2506` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-small-2603` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `mistral-small-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `open-mistral-7b` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `open-mistral-nemo` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `open-mixtral-8x22b` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `open-mixtral-8x7b` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `pixtral-12b` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |
| `pixtral-large-latest` | `mistral` | `mistral-conversations` | npm v0.82.1 artifact [I] |

### moonshotai

| id | provider | api/wire | evidence |
|---|---|---|---|
| `kimi-k2-0711-preview` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-0905-preview` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-thinking` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-thinking-turbo` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-turbo-preview` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.5` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.6` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code-highspeed` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k3` | `moonshotai` | `openai-completions` | npm v0.82.1 artifact [I] |

### moonshotai-cn

| id | provider | api/wire | evidence |
|---|---|---|---|
| `kimi-k2-0711-preview` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-0905-preview` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-thinking` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-thinking-turbo` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2-turbo-preview` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.5` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.6` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code-highspeed` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k3` | `moonshotai-cn` | `openai-completions` | npm v0.82.1 artifact [I] |

### nvidia

| id | provider | api/wire | evidence |
|---|---|---|---|
| `meta/llama-3.1-70b-instruct` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta/llama-3.1-8b-instruct` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta/llama-3.2-11b-vision-instruct` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta/llama-3.2-90b-vision-instruct` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta/llama-3.3-70b-instruct` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimaxai/minimax-m3` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-small-4-119b-2603` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.6` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-nano-30b-a3b` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-super-120b-a12b` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-ultra-550b-a55b` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nvidia-nemotron-nano-9b-v2` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-120b` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `stepfun-ai/step-3.5-flash` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `stepfun-ai/step-3.7-flash` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-5.2` | `nvidia` | `openai-completions` | npm v0.82.1 artifact [I] |

### openai

| id | provider | api/wire | evidence |
|---|---|---|---|
| `gpt-4` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4-turbo` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4.1` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4.1-mini` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4.1-nano` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-2024-05-13` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-2024-08-06` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-2024-11-20` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-4o-mini` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-chat-latest` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-mini` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-nano` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-pro` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-chat-latest` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-pro` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-chat-latest` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex-spark` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-mini` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-nano` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-pro` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5-pro` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-luna` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-sol` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-terra` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-realtime-2.1` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o1` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o1-pro` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o3` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o3-mini` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o3-pro` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |
| `o4-mini` | `openai` | `openai-responses` | npm v0.82.1 artifact [I] |

### openai-codex

| id | provider | api/wire | evidence |
|---|---|---|---|
| `gpt-5.3-codex-spark` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-mini` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-luna` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-sol` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-terra` | `openai-codex` | `openai-codex-responses` | npm v0.82.1 artifact [I] |

### opencode

| id | provider | api/wire | evidence |
|---|---|---|---|
| `claude-fable-5` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-haiku-4-5` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-1` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-5` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-6` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-7` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-4-8` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-opus-5` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-5` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-4-6` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `claude-sonnet-5` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `qwen3.5-plus` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `qwen3.6-plus` | `opencode` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `gemini-3-flash` | `opencode` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.1-pro` | `opencode` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash` | `opencode` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.5-flash-lite` | `opencode` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `gemini-3.6-flash` | `opencode` | `google-generative-ai` | npm v0.82.1 artifact [I] |
| `big-pickle` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-flash` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-flash-free` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-pro` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.1` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.2` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `grok-build-0.1` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.5` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.6` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `laguna-s-2.1-free` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `ling-3.0-flash-free` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-free` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax-m2.5` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax-m2.7` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax-m3` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nemotron-3-ultra-free` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `north-mini-code-free` | `opencode` | `openai-completions` | npm v0.82.1 artifact [I] |
| `gpt-5` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-codex` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5-nano` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1-codex` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1-codex-max` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.1-codex-mini` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.2-codex` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.3-codex` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-mini` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-nano` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.4-pro` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.5-pro` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-luna` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-sol` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `gpt-5.6-terra` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |
| `grok-4.5` | `opencode` | `openai-responses` | npm v0.82.1 artifact [I] |

### opencode-go

| id | provider | api/wire | evidence |
|---|---|---|---|
| `minimax-m3` | `opencode-go` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `qwen3.7-max` | `opencode-go` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `qwen3.7-plus` | `opencode-go` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek-v4-flash` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-pro` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.1` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.2` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `hy3` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.6` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k3` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-pro` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax-m2.7` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.6-plus` | `opencode-go` | `openai-completions` | npm v0.82.1 artifact [I] |
| `grok-4.5` | `opencode-go` | `openai-responses` | npm v0.82.1 artifact [I] |

### openrouter

| id | provider | api/wire | evidence |
|---|---|---|---|
| `~anthropic/claude-fable-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~anthropic/claude-haiku-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~anthropic/claude-opus-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~anthropic/claude-sonnet-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~google/gemini-flash-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~google/gemini-pro-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~moonshotai/kimi-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~openai/gpt-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~openai/gpt-mini-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `~x-ai/grok-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `ai21/jamba-large-1.7` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `aion-labs/aion-2.0` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `aion-labs/aion-3.0` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `aion-labs/aion-3.0-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `amazon/nova-2-lite-v1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `amazon/nova-lite-v1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `amazon/nova-micro-v1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `amazon/nova-premier-v1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `amazon/nova-pro-v1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-3-haiku` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-fable-5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-haiku-4.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.6` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.7` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.7-fast` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.8` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.8-fast` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-5-fast` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-4` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-4.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-4.6` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `arcee-ai/trinity-large-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `arcee-ai/virtuoso-large` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `auto` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `bytedance-seed/seed-1.6` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `bytedance-seed/seed-1.6-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `bytedance-seed/seed-2.0-lite` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `bytedance-seed/seed-2.0-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `cohere/command-r-08-2024` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `cohere/command-r-plus-08-2024` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `cohere/north-mini-code:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-chat` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-chat-v3-0324` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-chat-v3.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-r1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-r1-0528` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.1-terminus` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.2-exp` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v4-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v4-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-flash-lite` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-pro-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-pro-preview-05-06` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3-flash-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3-pro-image` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.1-flash-lite` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.1-flash-lite-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.1-pro-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.1-pro-preview-customtools` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.5-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.5-flash-lite` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemini-3.6-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-3-12b-it` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-3-27b-it` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-26b-a4b-it` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-26b-a4b-it:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-31b-it` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-31b-it:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `ibm-granite/granite-4.1-8b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `inception/mercury-2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `inclusionai/ling-2.6-1t` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `inclusionai/ling-2.6-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `inclusionai/ling-3.0-flash:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `inclusionai/ring-2.6-1t` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-air-v2.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-pro-v2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-pro-v2.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meituan/longcat-2.0` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/llama-3.1-70b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/llama-3.1-8b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/llama-3.3-70b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/llama-4-maverick` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/llama-4-scout` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta/muse-spark-1.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.7` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/codestral-2508` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/devstral-2512` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/ministral-14b-2512` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/ministral-3b-2512` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/ministral-8b-2512` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-large` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-large-2407` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-large-2512` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-medium-3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-medium-3-5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-medium-3.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-nemo` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-saba` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-small-2603` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mistral-small-3.2-24b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/mixtral-8x22b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mistralai/voxtral-small-24b-2507` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2-0905` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.6` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.7-code` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nex-agi/nex-n2-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nex-agi/nex-n2-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-nano-30b-a3b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-nano-30b-a3b:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-super-120b-a12b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-super-120b-a12b:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-ultra-550b-a55b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-nano-12b-v2-vl:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-nano-9b-v2:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-3.5-turbo` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-3.5-turbo-0613` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-3.5-turbo-16k` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4-turbo` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4-turbo-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4.1-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4.1-nano` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o-2024-05-13` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o-2024-08-06` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o-2024-11-20` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o-mini-2024-07-18` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-codex` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-nano` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-chat` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-codex` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-codex-max` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-codex-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2-chat` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2-codex` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.3-chat` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.3-codex` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4-nano` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.5-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-luna` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-luna-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-sol` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-sol-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-terra` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-terra-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-audio` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-audio-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-chat-latest` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-120b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-safeguard-20b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o3-deep-research` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o3-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o3-mini-high` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o3-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o4-mini` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o4-mini-deep-research` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/o4-mini-high` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openrouter/auto` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openrouter/auto-beta` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openrouter/free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openrouter/fusion` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `poolside/laguna-m.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `poolside/laguna-m.1:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `poolside/laguna-s-2.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `poolside/laguna-s-2.1:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `poolside/laguna-xs-2.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `poolside/laguna-xs-2.1:free` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen-2.5-72b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen-2.5-7b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen-plus` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen-plus-2025-07-28` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen-plus-2025-07-28:thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-14b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-235b-a22b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-235b-a22b-2507` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-235b-a22b-thinking-2507` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-30b-a3b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-30b-a3b-instruct-2507` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-30b-a3b-thinking-2507` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-32b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-8b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-coder` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-coder-30b-a3b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-coder-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-coder-next` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-coder-plus` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-max` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-max-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-next-80b-a3b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-next-80b-a3b-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-235b-a22b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-235b-a22b-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-30b-a3b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-30b-a3b-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-32b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-8b-instruct` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3-vl-8b-thinking` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-122b-a10b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-27b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-35b-a3b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-397b-a17b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-9b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-flash-02-23` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-plus-02-15` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.5-plus-20260420` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.6-27b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.6-35b-a3b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.6-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.6-max-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.6-plus` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.7-max` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen/qwen3.7-plus` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `rekaai/reka-edge` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `relace/relace-search` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `sakana/fugu-ultra` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `sao10k/l3.1-euryale-70b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `stepfun/step-3.5-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `stepfun/step-3.7-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `tencent/hy3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `tencent/hy3-preview` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `thedrummer/unslopnemo-12b` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `thinkingmachines/inkling` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `upstage/solar-pro-3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `x-ai/grok-4.20` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `x-ai/grok-4.3` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `x-ai/grok-4.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `x-ai/grok-build-0.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `xiaomi/mimo-v2.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `xiaomi/mimo-v2.5-pro` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.5-air` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.5v` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.6` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.6v` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.7` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-4.7-flash` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-5` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-5-turbo` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-5.1` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-5.2` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |
| `z-ai/glm-5v-turbo` | `openrouter` | `openai-completions` | npm v0.82.1 artifact [I] |

### qwen-token-plan

| id | provider | api/wire | evidence |
|---|---|---|---|
| `deepseek-v3.2` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-flash` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-pro` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.1` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.2` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.5` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.6` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMax-M2.5` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.6-flash` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.6-plus` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.7-max` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.7-plus` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.8-max-preview` | `qwen-token-plan` | `openai-completions` | npm v0.82.1 artifact [I] |

### qwen-token-plan-cn

| id | provider | api/wire | evidence |
|---|---|---|---|
| `deepseek-v3.2` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-flash` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `deepseek-v4-pro` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.1` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.2` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.5` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.6` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `kimi-k2.7-code` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMax-M2.5` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.6-flash` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.6-plus` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.7-max` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.7-plus` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `qwen3.8-max-preview` | `qwen-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |

### together

| id | provider | api/wire | evidence |
|---|---|---|---|
| `deepseek-ai/DeepSeek-V4-Pro` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `google/gemma-4-31B-it` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `meta-llama/Llama-3.3-70B-Instruct-Turbo` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M2.7` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `MiniMaxAI/MiniMax-M3` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2.6` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `moonshotai/Kimi-K2.7-Code` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-ultra-550b-a55b` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-120b` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen2.5-7B-Instruct-Turbo` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.5-9B` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.6-Plus` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `Qwen/Qwen3.7-Max` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `thinkingmachines/Inkling` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |
| `zai-org/GLM-5.2` | `together` | `openai-completions` | npm v0.82.1 artifact [I] |

### vercel-ai-gateway

| id | provider | api/wire | evidence |
|---|---|---|---|
| `alibaba/qwen-3-14b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen-3-235b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen-3-30b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen-3-32b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen-3.6-max-preview` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-235b-a22b-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-coder` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-coder-30b-a3b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-coder-next` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-coder-plus` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-max` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-max-preview` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-max-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-next-80b-a3b-instruct` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-next-80b-a3b-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-vl-235b-a22b-instruct` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-vl-instruct` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3-vl-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3.5-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3.5-plus` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3.6-27b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3.6-plus` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3.7-max` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `alibaba/qwen3.7-plus` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `amazon/nova-2-lite` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `amazon/nova-lite` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `amazon/nova-micro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `amazon/nova-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-3-haiku` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-fable-5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-haiku-4.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.6` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.7` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.8` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-4.8-fast` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-opus-5-fast` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-4` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-4.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-4.6` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `anthropic/claude-sonnet-5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `arcee-ai/trinity-large-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `arcee-ai/trinity-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `bytedance/seed-1.6` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `bytedance/seed-1.8` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `cohere/command-a` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-r1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.1-terminus` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v3.2-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v4-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `deepseek/deepseek-v4-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-flash-lite` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-2.5-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3-pro-preview` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3.1-flash-lite` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3.1-pro-preview` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3.5-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3.5-flash-lite` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemini-3.6-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemma-4-26b-a4b-it` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `google/gemma-4-31b-it` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `inception/mercury-2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `inception/mercury-coder-small` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `inclusionai/ling-3.0-flash-free` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `interfaze/interfaze-beta` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-air-v2.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-pro-v1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-pro-v2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `kwaipilot/kat-coder-pro-v2.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `meta/llama-3.1-70b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `meta/llama-3.1-8b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `meta/llama-3.3-70b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `meta/llama-4-maverick` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `meta/llama-4-scout` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `meta/muse-spark-1.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.1-lightning` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.5-highspeed` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.7` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m2.7-highspeed` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `minimax/minimax-m3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/codestral` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/devstral-2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/devstral-small-2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/magistral-medium` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/magistral-small` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/ministral-14b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/ministral-3b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/ministral-8b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/mistral-large-3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/mistral-medium` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/mistral-medium-3.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/mistral-nemo` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/mistral-small` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `mistral/pixtral-12b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.6` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.7-code` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k2.7-code-highspeed` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `moonshotai/kimi-k3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-nano-30b-a3b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-super-120b-a12b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-3-ultra-550b-a55b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-nano-12b-v2-vl` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `nvidia/nemotron-nano-9b-v2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-3.5-turbo` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-4-turbo` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-4.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-4.1-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-4.1-nano` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-4o-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-codex` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-nano` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-codex` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-codex-max` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-codex-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-instant` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.1-thinking` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2-codex` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.2-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.3-chat` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.3-codex` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4-nano` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.4-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.5-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-luna` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-sol` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-5.6-terra` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-120b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-20b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/gpt-oss-safeguard-20b` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/o1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/o3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/o3-deep-research` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/o3-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/o3-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `openai/o4-mini` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `poolside/laguna-s-2.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `poolside/laguna-s-2.1-free` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `sakana/fugu-ultra` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `stepfun/step-3.5-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `stepfun/step-3.7-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `tencent/hy3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `thinkingmachines/inkling` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.1-fast-non-reasoning` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.1-fast-reasoning` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.20-multi-agent` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.20-multi-agent-beta` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.20-non-reasoning` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.20-non-reasoning-beta` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.20-reasoning` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.20-reasoning-beta` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.3` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-4.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xai/grok-build-0.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xiaomi/mimo-v2.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `xiaomi/mimo-v2.5-pro` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.5-air` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.5v` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.6` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.6v` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.6v-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.7` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.7-flash` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-4.7-flashx` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-5` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-5-turbo` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-5.1` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-5.2` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-5.2-fast` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |
| `zai/glm-5v-turbo` | `vercel-ai-gateway` | `anthropic-messages` | npm v0.82.1 artifact [I] |

### xai

| id | provider | api/wire | evidence |
|---|---|---|---|
| `grok-4.3` | `xai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `grok-build-0.1` | `xai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `grok-4.5` | `xai` | `openai-responses` | npm v0.82.1 artifact [I] |

### xiaomi

| id | provider | api/wire | evidence |
|---|---|---|---|
| `mimo-v2-flash` | `xiaomi` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2-omni` | `xiaomi` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2-pro` | `xiaomi` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5` | `xiaomi` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-pro` | `xiaomi` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-pro-ultraspeed` | `xiaomi` | `openai-completions` | npm v0.82.1 artifact [I] |

### xiaomi-token-plan-ams

| id | provider | api/wire | evidence |
|---|---|---|---|
| `mimo-v2-pro` | `xiaomi-token-plan-ams` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5` | `xiaomi-token-plan-ams` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-pro` | `xiaomi-token-plan-ams` | `openai-completions` | npm v0.82.1 artifact [I] |

### xiaomi-token-plan-cn

| id | provider | api/wire | evidence |
|---|---|---|---|
| `mimo-v2-pro` | `xiaomi-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5` | `xiaomi-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-pro` | `xiaomi-token-plan-cn` | `openai-completions` | npm v0.82.1 artifact [I] |

### xiaomi-token-plan-sgp

| id | provider | api/wire | evidence |
|---|---|---|---|
| `mimo-v2-pro` | `xiaomi-token-plan-sgp` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5` | `xiaomi-token-plan-sgp` | `openai-completions` | npm v0.82.1 artifact [I] |
| `mimo-v2.5-pro` | `xiaomi-token-plan-sgp` | `openai-completions` | npm v0.82.1 artifact [I] |

### zai

| id | provider | api/wire | evidence |
|---|---|---|---|
| `glm-4.5-air` | `zai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-4.7` | `zai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5-turbo` | `zai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.1` | `zai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.2` | `zai` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5v-turbo` | `zai` | `openai-completions` | npm v0.82.1 artifact [I] |

### zai-coding-cn

| id | provider | api/wire | evidence |
|---|---|---|---|
| `glm-4.5-air` | `zai-coding-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-4.7` | `zai-coding-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5-turbo` | `zai-coding-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.1` | `zai-coding-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5.2` | `zai-coding-cn` | `openai-completions` | npm v0.82.1 artifact [I] |
| `glm-5v-turbo` | `zai-coding-cn` | `openai-completions` | npm v0.82.1 artifact [I] |

## L2 证伪

- 目标 Git tree 中不存在 `src/providers/data/*.json`，因此不能用 shard 的 8 行 wrapper 假装逐模型 id 是显式源码证据。[E: packages/ai/src/providers/openai.models.ts:4] [E: packages/ai/src/providers/openai.models.ts:8]
- v0.83.0 artifact 给出 Baseten 之前的 37-bucket/1,153-model baseline；target 新增的第 38 个 shard 只能用带时间/hash 的 models.dev snapshot 补齐，因此 1,169 仍维持 [I]。
- `builtinProviders()` 另有动态 Radius provider，静态模型 bucket 数 38 不等于 runtime provider factory 数 39。[I]

## Sources

- packages/ai/src/models.generated.ts
- packages/ai/src/model-catalog.ts
- packages/ai/src/providers/amazon-bedrock.models.ts
- packages/ai/src/providers/ant-ling.models.ts
- packages/ai/src/providers/anthropic.models.ts
- packages/ai/src/providers/azure-openai-responses.models.ts
- packages/ai/src/providers/baseten.models.ts
- packages/ai/src/providers/cerebras.models.ts
- packages/ai/src/providers/cloudflare-ai-gateway.models.ts
- packages/ai/src/providers/cloudflare-workers-ai.models.ts
- packages/ai/src/providers/deepseek.models.ts
- packages/ai/src/providers/fireworks.models.ts
- packages/ai/src/providers/github-copilot.models.ts
- packages/ai/src/providers/google.models.ts
- packages/ai/src/providers/google-vertex.models.ts
- packages/ai/src/providers/groq.models.ts
- packages/ai/src/providers/huggingface.models.ts
- packages/ai/src/providers/kimi-coding.models.ts
- packages/ai/src/providers/minimax.models.ts
- packages/ai/src/providers/minimax-cn.models.ts
- packages/ai/src/providers/mistral.models.ts
- packages/ai/src/providers/moonshotai.models.ts
- packages/ai/src/providers/moonshotai-cn.models.ts
- packages/ai/src/providers/nvidia.models.ts
- packages/ai/src/providers/openai.models.ts
- packages/ai/src/providers/openai-codex.models.ts
- packages/ai/src/providers/opencode.models.ts
- packages/ai/src/providers/opencode-go.models.ts
- packages/ai/src/providers/openrouter.models.ts
- packages/ai/src/providers/qwen-token-plan.models.ts
- packages/ai/src/providers/qwen-token-plan-cn.models.ts
- packages/ai/src/providers/together.models.ts
- packages/ai/src/providers/vercel-ai-gateway.models.ts
- packages/ai/src/providers/xai.models.ts
- packages/ai/src/providers/xiaomi.models.ts
- packages/ai/src/providers/xiaomi-token-plan-ams.models.ts
- packages/ai/src/providers/xiaomi-token-plan-cn.models.ts
- packages/ai/src/providers/xiaomi-token-plan-sgp.models.ts
- packages/ai/src/providers/zai.models.ts
- packages/ai/src/providers/zai-coding-cn.models.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/model-data.ts
- packages/ai/scripts/check-model-data.ts
- packages/ai/package.json

## 相关

- [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md)
- [subsys.ai.model-catalog-publication](../subsystems/ai/model-catalog-publication.md)
