---
id: ref.ai.model-catalog
title: 模型结构目录(generated)
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
  - packages/ai/src/providers/qwen-token-plan-individual.models.ts
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
  - packages/ai/src/types.ts
  - packages/ai/src/providers/all.ts
  - packages/coding-agent/src/core/model-resolver.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
symbols:
  - MODELS
  - Model
related:
  - subsys.ai.model-discovery
  - subsys.ai.model-catalog-publication
evidence: explicit
status: verified
updated: 71dca871bc
---

> `ref.ai.model-catalog` 记录目标 commit 已提交的 generated model **结构**。 [I] 完整模型值（name / cost / context / 逐 id 的 `Model.api`）在 generated、gitignored 的 `src/providers/data/<provider>.json`；本 catalog 只记录 id / provider / api 中源码能证明的结构事实。

## 能回答的问题

- 当前提交的 `MODELS` 有哪些 provider bucket?
- 为什么本页不再逐行枚举上千个 model id?
- `qwen-token-plan-individual` 的 committed allowlist 有哪些 id?
- GPT-6 Astra 进了哪些 catalog？Grok Build 0.1 还在内置 xAI 里吗？Radius 默认模型是什么?
- model structure、gitignored JSON values 与远端发布 bundle 分别由哪一层负责?

## 证据边界

目标 commit 提交了 **39** 个 provider structural shard。每个 shard 只保留 `import values from "./data/<provider>.json"` 和 `flattenModelCatalog(provider, values)`；实际 id/api/cost 等值不在 git tree [E: packages/ai/src/providers/qwen-token-plan-individual.models.ts:4] [E: packages/ai/src/providers/qwen-token-plan-individual.models.ts:8] [E: packages/ai/src/providers/amazon-bedrock.models.ts:4] [E: packages/ai/src/providers/amazon-bedrock.models.ts:8] [E: packages/ai/src/model-catalog.ts:22]。

`models.generated.ts` 把这 39 个 shard 聚合为 `MODELS`；type 面与 value 面都包含 `qwen-token-plan-individual`，都不包含 `radius` [E: packages/ai/src/models.generated.ts:33] [E: packages/ai/src/models.generated.ts:74] [E: packages/ai/src/models.generated.ts:85] [E: packages/ai/src/models.generated.ts:114] [E: packages/ai/src/models.generated.ts:123]。runtime `builtinProviders()` 另外构造 Radius，因此 runtime providers 是 **40**，structural buckets 是 **39** [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:130]。

`generate-models.ts` 先写 structural `.models.ts` 与 gitignored `src/providers/data/*.json`，再写 `models.generated.ts` [E: packages/ai/scripts/generate-models.ts:3057] [E: packages/ai/scripts/generate-models.ts:3059] [E: packages/ai/scripts/generate-models.ts:3065] [E: packages/ai/scripts/generate-models.ts:3084]。因此 checkout 可复现的是 **39 个 bucket 结构**，不是 flattened model 总数。

`tools/generate-model-catalog.mjs` 按 `flattenModelCatalog` wrapper + `generate-models.ts` 硬编码 allowlist 生成本页；不再寻找旧的逐模型 `Model<"api">` shard key。[I]

## Provider 覆盖摘要

| provider | structural shard | MODELS value bucket | committed per-model ids |
|---|---|---|---|
| `amazon-bedrock` | `packages/ai/src/providers/amazon-bedrock.models.ts` | [E: packages/ai/src/models.generated.ts:85] | gitignored JSON only [I] |
| `ant-ling` | `packages/ai/src/providers/ant-ling.models.ts` | [E: packages/ai/src/models.generated.ts:86] | gitignored JSON only [I] |
| `anthropic` | `packages/ai/src/providers/anthropic.models.ts` | [E: packages/ai/src/models.generated.ts:87] | gitignored JSON only [I] |
| `azure-openai-responses` | `packages/ai/src/providers/azure-openai-responses.models.ts` | [E: packages/ai/src/models.generated.ts:88] | gitignored JSON only [I] |
| `baseten` | `packages/ai/src/providers/baseten.models.ts` | [E: packages/ai/src/models.generated.ts:89] | gitignored JSON only [I] |
| `cerebras` | `packages/ai/src/providers/cerebras.models.ts` | [E: packages/ai/src/models.generated.ts:90] | gitignored JSON only [I] |
| `cloudflare-ai-gateway` | `packages/ai/src/providers/cloudflare-ai-gateway.models.ts` | [E: packages/ai/src/models.generated.ts:91] | gitignored JSON only [I] |
| `cloudflare-workers-ai` | `packages/ai/src/providers/cloudflare-workers-ai.models.ts` | [E: packages/ai/src/models.generated.ts:92] | gitignored JSON only [I] |
| `deepseek` | `packages/ai/src/providers/deepseek.models.ts` | [E: packages/ai/src/models.generated.ts:93] | generator 硬编码 2 ids（见下表） [E: packages/ai/scripts/generate-models.ts:2643] [E: packages/ai/scripts/generate-models.ts:2663] |
| `fireworks` | `packages/ai/src/providers/fireworks.models.ts` | [E: packages/ai/src/models.generated.ts:94] | gitignored JSON only [I] |
| `github-copilot` | `packages/ai/src/providers/github-copilot.models.ts` | [E: packages/ai/src/models.generated.ts:95] | gitignored JSON only [I] |
| `google` | `packages/ai/src/providers/google.models.ts` | [E: packages/ai/src/models.generated.ts:96] | gitignored JSON only [I] |
| `google-vertex` | `packages/ai/src/providers/google-vertex.models.ts` | [E: packages/ai/src/models.generated.ts:97] | gitignored JSON only [I] |
| `groq` | `packages/ai/src/providers/groq.models.ts` | [E: packages/ai/src/models.generated.ts:98] | gitignored JSON only [I] |
| `huggingface` | `packages/ai/src/providers/huggingface.models.ts` | [E: packages/ai/src/models.generated.ts:99] | gitignored JSON only [I] |
| `kimi-coding` | `packages/ai/src/providers/kimi-coding.models.ts` | [E: packages/ai/src/models.generated.ts:100] | gitignored JSON only [I] |
| `minimax` | `packages/ai/src/providers/minimax.models.ts` | [E: packages/ai/src/models.generated.ts:101] | gitignored JSON only [I] |
| `minimax-cn` | `packages/ai/src/providers/minimax-cn.models.ts` | [E: packages/ai/src/models.generated.ts:102] | gitignored JSON only [I] |
| `mistral` | `packages/ai/src/providers/mistral.models.ts` | [E: packages/ai/src/models.generated.ts:103] | gitignored JSON only [I] |
| `moonshotai` | `packages/ai/src/providers/moonshotai.models.ts` | [E: packages/ai/src/models.generated.ts:104] | gitignored JSON only [I] |
| `moonshotai-cn` | `packages/ai/src/providers/moonshotai-cn.models.ts` | [E: packages/ai/src/models.generated.ts:105] | gitignored JSON only [I] |
| `nvidia` | `packages/ai/src/providers/nvidia.models.ts` | [E: packages/ai/src/models.generated.ts:106] | gitignored JSON only [I] |
| `openai` | `packages/ai/src/providers/openai.models.ts` | [E: packages/ai/src/models.generated.ts:107] | gitignored JSON only；另有硬编码补行 [I] |
| `openai-codex` | `packages/ai/src/providers/openai-codex.models.ts` | [E: packages/ai/src/models.generated.ts:108] | generator 显式列表 6 ids（见下表） [E: packages/ai/scripts/generate-models.ts:2773] |
| `opencode` | `packages/ai/src/providers/opencode.models.ts` | [E: packages/ai/src/models.generated.ts:109] | gitignored JSON only [I] |
| `opencode-go` | `packages/ai/src/providers/opencode-go.models.ts` | [E: packages/ai/src/models.generated.ts:110] | gitignored JSON only [I] |
| `openrouter` | `packages/ai/src/providers/openrouter.models.ts` | [E: packages/ai/src/models.generated.ts:111] | gitignored JSON only [I] |
| `qwen-token-plan` | `packages/ai/src/providers/qwen-token-plan.models.ts` | [E: packages/ai/src/models.generated.ts:112] | gitignored JSON only [I] |
| `qwen-token-plan-cn` | `packages/ai/src/providers/qwen-token-plan-cn.models.ts` | [E: packages/ai/src/models.generated.ts:113] | gitignored JSON only [I] |
| `qwen-token-plan-individual` | `packages/ai/src/providers/qwen-token-plan-individual.models.ts` | [E: packages/ai/src/models.generated.ts:114] | generator allowlist 9 ids（见下表） [E: packages/ai/scripts/generate-models.ts:319] |
| `together` | `packages/ai/src/providers/together.models.ts` | [E: packages/ai/src/models.generated.ts:115] | gitignored JSON only [I] |
| `vercel-ai-gateway` | `packages/ai/src/providers/vercel-ai-gateway.models.ts` | [E: packages/ai/src/models.generated.ts:116] | gitignored JSON only [I] |
| `xai` | `packages/ai/src/providers/xai.models.ts` | [E: packages/ai/src/models.generated.ts:117] | gitignored JSON only [I] |
| `xiaomi` | `packages/ai/src/providers/xiaomi.models.ts` | [E: packages/ai/src/models.generated.ts:118] | gitignored JSON only [I] |
| `xiaomi-token-plan-ams` | `packages/ai/src/providers/xiaomi-token-plan-ams.models.ts` | [E: packages/ai/src/models.generated.ts:119] | gitignored JSON only [I] |
| `xiaomi-token-plan-cn` | `packages/ai/src/providers/xiaomi-token-plan-cn.models.ts` | [E: packages/ai/src/models.generated.ts:120] | gitignored JSON only [I] |
| `xiaomi-token-plan-sgp` | `packages/ai/src/providers/xiaomi-token-plan-sgp.models.ts` | [E: packages/ai/src/models.generated.ts:121] | gitignored JSON only [I] |
| `zai` | `packages/ai/src/providers/zai.models.ts` | [E: packages/ai/src/models.generated.ts:122] | gitignored JSON only [I] |
| `zai-coding-cn` | `packages/ai/src/providers/zai-coding-cn.models.ts` | [E: packages/ai/src/models.generated.ts:123] | gitignored JSON only [I] |

共 39 个 structural provider bucket。Radius 没有 shard。

## 本轮可从源码证明的 model id

### qwen-token-plan-individual allowlist

`qwen-token-plan-individual` 是国际 Token Plan 源的 allowlist 视图。生成器把 `alibaba-token-plan` 输入过滤到 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS`，并固定 `api: "openai-completions"`、同一新加坡 compatible-mode base URL [E: packages/ai/scripts/generate-models.ts:2404] [E: packages/ai/scripts/generate-models.ts:2405] [E: packages/ai/scripts/generate-models.ts:2407] [E: packages/ai/scripts/generate-models.ts:2435]。最终 JSON 是否包含这 9 个 id 仍取决于生成时的远端 catalog，因此下表是 **generator allowlist**，不是 gitignored JSON 的 membership 证明 [I]。

| id | provider | api/wire | committed evidence |
|---|---|---|---|
| `deepseek-v4-flash-0731` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:320] [E: packages/ai/scripts/generate-models.ts:2405] |
| `deepseek-v4-pro` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:321] [E: packages/ai/scripts/generate-models.ts:2405] |
| `deepseek-v4-pro-0813` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:322] [E: packages/ai/scripts/generate-models.ts:2405] |
| `glm-5.2` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:323] [E: packages/ai/scripts/generate-models.ts:2405] |
| `qwen3.6-flash` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:324] [E: packages/ai/scripts/generate-models.ts:2405] |
| `qwen3.7-max` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:325] [E: packages/ai/scripts/generate-models.ts:2405] |
| `qwen3.7-plus` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:326] [E: packages/ai/scripts/generate-models.ts:2405] |
| `qwen3.8-flash` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:327] [E: packages/ai/scripts/generate-models.ts:2405] |
| `qwen3.8-max` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:328] [E: packages/ai/scripts/generate-models.ts:2405] |

`qwen3.8-max-preview` 在 `QWEN_TOKEN_PLAN_EXCLUDED_MODEL_IDS` 中，国际 / CN / Individual 三条变体都会跳过 [E: packages/ai/scripts/generate-models.ts:310] [E: packages/ai/scripts/generate-models.ts:2424]。

allowlist 里的 `deepseek-v4-flash-0731` 是 Qwen Token Plan Individual 过滤 id，**不要**和官方 DeepSeek bucket 的更名一起删 [E: packages/ai/scripts/generate-models.ts:320]。

### DeepSeek 官方硬编码

`generate-models.ts` 没有 `data.deepseek` 远端 loop。官方 `provider: "deepseek"` 只出现在下面两行，随后 `allModels.push(...deepseekModels)` [E: packages/ai/scripts/generate-models.ts:2641] [E: packages/ai/scripts/generate-models.ts:2647] [E: packages/ai/scripts/generate-models.ts:2667] [E: packages/ai/scripts/generate-models.ts:2682]。

| id | name | api | input | thinkingLevelMap | cost input/output/cacheRead | evidence |
|---|---|---|---|---|---|---|
| `deepseek-flash` | DeepSeek V4.1 Flash | `openai-completions` | `["text","image"]` | `DEEPSEEK_V4_FLASH_THINKING_LEVEL_MAP`（含 `low: "low"`） | 0.3 / 1.2 / 0.006 | [E: packages/ai/scripts/generate-models.ts:2643] [E: packages/ai/scripts/generate-models.ts:2644] [E: packages/ai/scripts/generate-models.ts:2649] [E: packages/ai/scripts/generate-models.ts:2650] [E: packages/ai/scripts/generate-models.ts:2653] [E: packages/ai/scripts/generate-models.ts:2654] [E: packages/ai/scripts/generate-models.ts:2655] |
| `deepseek-v4-pro` | DeepSeek V4 Pro | `openai-completions` | `["text"]` | 该行未内联 map | 1.32 / 3.96 / 0.044 | [E: packages/ai/scripts/generate-models.ts:2663] [E: packages/ai/scripts/generate-models.ts:2664] [E: packages/ai/scripts/generate-models.ts:2669] [E: packages/ai/scripts/generate-models.ts:2672] [E: packages/ai/scripts/generate-models.ts:2673] [E: packages/ai/scripts/generate-models.ts:2674] |

官方 DeepSeek 硬编码数组**不再**包含 `deepseek-v4-flash` 或 `deepseek-v4-flash-vision-exp` [I]。`FIREWORKS_ADAPTIVE_THINKING_FALLBACK_MODELS` 仍列出 Fireworks 侧 id `accounts/fireworks/models/deepseek-v4-flash-vision-exp`，那不是官方 DeepSeek bucket 行 [E: packages/ai/scripts/generate-models.ts:295]。

### OpenAI Codex 显式列表

`provider: "openai-codex"` 只出现在 `codexModels` 数组的 6 行，全部 `api: "openai-codex-responses"` [E: packages/ai/scripts/generate-models.ts:2773] [E: packages/ai/scripts/generate-models.ts:2777]。GPT-5.6 / GPT-6 Astra 用 Codex 272k 默认上限 [E: packages/ai/scripts/generate-models.ts:2769] [E: packages/ai/scripts/generate-models.ts:2783]。

| id | evidence |
|---|---|
| `gpt-6-astra` | [E: packages/ai/scripts/generate-models.ts:2775] |
| `gpt-5.3-codex-spark` | [E: packages/ai/scripts/generate-models.ts:2787] |
| `gpt-5.5` | [E: packages/ai/scripts/generate-models.ts:2799] |
| `gpt-5.6-luna` | [E: packages/ai/scripts/generate-models.ts:2811] |
| `gpt-5.6-sol` | [E: packages/ai/scripts/generate-models.ts:2823] |
| `gpt-5.6-terra` | [E: packages/ai/scripts/generate-models.ts:2835] |

这 6 个 id 是 Codex catalog 的完整硬编码集合；数组里没有 `gpt-5.4` 或 `gpt-5.4-mini` [I]。coding-agent 默认模型 id 是另一层：`openai-codex` 默认 `gpt-5.5`，而 `azure-openai-responses` / `github-copilot` 默认仍是 `gpt-5.4`（resolver 默认，不是 Codex catalog 行）[E: packages/coding-agent/src/core/model-resolver.ts:25] [E: packages/coding-agent/src/core/model-resolver.ts:26] [E: packages/coding-agent/src/core/model-resolver.ts:32]。

### Cloudflare workers-ai 前缀

`cloudflare-ai-gateway` bucket 的 `workers-ai` upstream 固定 `api: "openai-completions"`、compat base URL，id 为 `workers-ai/${modelId}`；models.dev 漏掉该前缀时，生成器从 `cloudflare-workers-ai` catalog 镜像补行。具体 id 仍在 gitignored JSON，本页只记录此前缀规则 [E: packages/ai/scripts/generate-models.ts:1798] [E: packages/ai/scripts/generate-models.ts:1799] [E: packages/ai/scripts/generate-models.ts:1801] [E: packages/ai/scripts/generate-models.ts:1843] [I]。

## 本轮硬编码模型事实

`generate-models.ts` 把 **GPT-6 Astra** (`gpt-6-astra`) 硬编码进 OpenAI Responses catalog，`api: "openai-responses"` [E: packages/ai/scripts/generate-models.ts:2566] [E: packages/ai/scripts/generate-models.ts:2568]。同一 id 也进入 OpenAI Codex 显式列表 [E: packages/ai/scripts/generate-models.ts:2775] [E: packages/ai/scripts/generate-models.ts:2777]。最终 JSON membership 仍取决于生成时的远端 catalog 与这些硬编码行是否被保留 [I]。

**Grok Build 0.1** (`grok-build-0.1`) 在 `XAI_BUILTIN_EXCLUDED_MODEL_IDS` 中，因此不会进入内置 xAI catalog [E: packages/ai/scripts/generate-models.ts:435] [E: packages/ai/scripts/generate-models.ts:440]。OpenCode 路径仍有 `grok-build-0.1` 特殊处理：thinking map 把 off/minimal/low/medium 标 `null`，并把 `supportsReasoningEffort` 设为 `false`；那不是 xAI builtin 行 [E: packages/ai/scripts/generate-models.ts:1047] [E: packages/ai/scripts/generate-models.ts:2074]。

GitHub Copilot 生成器把全部 `gpt-*`（以及 `grok-` / `oswe` / `mai-`）标 `api: "openai-responses"`；Claude 4.x/5.x 仍走 `anthropic-messages`。具体 Copilot id 仍在 gitignored JSON [E: packages/ai/scripts/generate-models.ts:2144] [E: packages/ai/scripts/generate-models.ts:2148] [E: packages/ai/scripts/generate-models.ts:2153] [E: packages/ai/scripts/generate-models.ts:2156] [I]。

Fireworks thinking map 由生成器规则写出，不是新 bucket：DeepSeek V4 / Qwen3.8 fallback 进 `forceAdaptiveThinking`；`glm-5p2` 去掉 low/medium；`kimi-k3` 去掉 medium [E: packages/ai/scripts/generate-models.ts:293] [E: packages/ai/scripts/generate-models.ts:1498] [E: packages/ai/scripts/generate-models.ts:1033] [E: packages/ai/scripts/generate-models.ts:1037]。Fireworks Messages 行另写 `supportsToolReferences: true`；GLM（id 含 `glm-`）与 Kimi K3（id 含 `kimi-k3`）仍走 `openai-completions`，不是 Messages [E: packages/ai/scripts/generate-models.ts:1426] [E: packages/ai/scripts/generate-models.ts:1469] [E: packages/ai/scripts/generate-models.ts:1472] [E: packages/ai/scripts/generate-models.ts:1476] [E: packages/ai/scripts/generate-models.ts:1479]。Pi 侧 deferred-tool 分割不按 loader 名过滤；Fireworks 上游只对 `ToolSearch` / `tool_search` 做 prompt-prefix cache deferral [I]。

Radius 没有 static `.models.ts` shard，也不在 `MODELS` value object 里 [E: packages/ai/src/models.generated.ts:85] [E: packages/ai/src/models.generated.ts:123]。coding-agent 默认模型 id 是 `balanced`；登录后等 catalog discovery，优先找 `balanced`，没有则用 catalog 第一个 Radius 模型 [E: packages/coding-agent/src/core/model-resolver.ts:27] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5709] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5712]。

## 设计动机与 gotcha

- `*.models.ts` 现在是 TypeScript structure/type surface，不是完整 metadata snapshot；把旧版 npm artifact 的逐 id 表原样保留会冒充当前 checkout 可核的 `[E]`。[I]
- structural shard 的 bucket count（39）是静态 checkout 可复现的数量；runtime providers（40）多一个 Radius。发布 bundle 的 model count 由生成时外部 catalog 输入决定，二者应通过 source commit 关联而不能默认永远相等。[I]
- `MODELS` 仍提供 typed built-in catalog aggregation；运行时 dynamic refresh 和远端 overlay 属于 `subsys.ai.model-discovery`，不由本引用页展开。[I]
- 官方 DeepSeek 硬编码更名不影响 Individual allowlist 的 `deepseek-v4-flash-0731`，也不影响 Fireworks fallback 里带 `accounts/fireworks/models/` 前缀的 Flash / vision-exp id。[E: packages/ai/scripts/generate-models.ts:320] [E: packages/ai/scripts/generate-models.ts:294] [E: packages/ai/scripts/generate-models.ts:295]

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
- packages/ai/src/providers/qwen-token-plan-individual.models.ts
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
- packages/ai/src/types.ts
- packages/ai/src/providers/all.ts
- packages/coding-agent/src/core/model-resolver.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts

## 相关

- [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md): provider catalog 装配、查询与动态刷新。
- [subsys.ai.model-catalog-publication](../subsystems/ai/model-catalog-publication.md): JSON bundle 生成、校验、版本化发布与 CI 门控。
