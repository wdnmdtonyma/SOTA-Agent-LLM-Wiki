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
symbols:
  - MODELS
  - Model
related:
  - subsys.ai.model-discovery
  - subsys.ai.model-catalog-publication
evidence: explicit
status: verified
updated: 086c32e745
---

> `ref.ai.model-catalog` 记录目标 commit 已提交的 generated model **结构**。 [I] 完整模型值（name / cost / context / 逐 id 的 `Model.api`）在 generated、gitignored 的 `src/providers/data/<provider>.json`；本 catalog 只记录 id / provider / api 中源码能证明的结构事实。

## 能回答的问题

- 当前提交的 `MODELS` 有哪些 provider bucket?
- 为什么本页不再逐行枚举上千个 model id?
- `qwen-token-plan-individual` 的 committed allowlist 有哪些 id?
- model structure、gitignored JSON values 与远端发布 bundle 分别由哪一层负责?

## 证据边界

目标 commit 提交了 **39** 个 provider structural shard（本轮新增 `qwen-token-plan-individual.models.ts`）。每个 shard 只保留 `import values from "./data/<provider>.json"` 和 `flattenModelCatalog(provider, values)`；实际 id/api/cost 等值不在 git tree [E: packages/ai/src/providers/qwen-token-plan-individual.models.ts:4] [E: packages/ai/src/providers/qwen-token-plan-individual.models.ts:8] [E: packages/ai/src/providers/amazon-bedrock.models.ts:4] [E: packages/ai/src/providers/amazon-bedrock.models.ts:8] [E: packages/ai/src/model-catalog.ts:22]。

`models.generated.ts` 把这 39 个 shard 聚合为 `MODELS`；type 面与 value 面都包含 `qwen-token-plan-individual` [E: packages/ai/src/models.generated.ts:33] [E: packages/ai/src/models.generated.ts:74] [E: packages/ai/src/models.generated.ts:114]。Radius 不在此 object 中。

`generate-models.ts` 先写 structural `.models.ts` 与 gitignored `src/providers/data/*.json`，再写 `models.generated.ts` [E: packages/ai/scripts/generate-models.ts:2861] [E: packages/ai/scripts/generate-models.ts:2863] [E: packages/ai/scripts/generate-models.ts:2867] [E: packages/ai/scripts/generate-models.ts:2875] [E: packages/ai/scripts/generate-models.ts:2877]。因此 checkout 可复现的是 **39 个 bucket 结构**，不是 flattened model 总数。

`tools/generate-model-catalog.mjs` 仍按旧的逐模型 `Model<"api"> & { id; provider }` shard 形态解析；当前 wrapper 没有那种 key，生成器无法从 checkout 产出逐 id 表。[U]

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
| `deepseek` | `packages/ai/src/providers/deepseek.models.ts` | [E: packages/ai/src/models.generated.ts:93] | gitignored JSON only [I] |
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
| `openai` | `packages/ai/src/providers/openai.models.ts` | [E: packages/ai/src/models.generated.ts:107] | gitignored JSON only [I] |
| `openai-codex` | `packages/ai/src/providers/openai-codex.models.ts` | [E: packages/ai/src/models.generated.ts:108] | gitignored JSON only [I] |
| `opencode` | `packages/ai/src/providers/opencode.models.ts` | [E: packages/ai/src/models.generated.ts:109] | gitignored JSON only [I] |
| `opencode-go` | `packages/ai/src/providers/opencode-go.models.ts` | [E: packages/ai/src/models.generated.ts:110] | gitignored JSON only [I] |
| `openrouter` | `packages/ai/src/providers/openrouter.models.ts` | [E: packages/ai/src/models.generated.ts:111] | gitignored JSON only [I] |
| `qwen-token-plan` | `packages/ai/src/providers/qwen-token-plan.models.ts` | [E: packages/ai/src/models.generated.ts:112] | gitignored JSON only [I] |
| `qwen-token-plan-cn` | `packages/ai/src/providers/qwen-token-plan-cn.models.ts` | [E: packages/ai/src/models.generated.ts:113] | gitignored JSON only [I] |
| `qwen-token-plan-individual` | `packages/ai/src/providers/qwen-token-plan-individual.models.ts` | [E: packages/ai/src/models.generated.ts:114] | generator allowlist 7 ids（见下表） [E: packages/ai/scripts/generate-models.ts:307] |
| `together` | `packages/ai/src/providers/together.models.ts` | [E: packages/ai/src/models.generated.ts:115] | gitignored JSON only [I] |
| `vercel-ai-gateway` | `packages/ai/src/providers/vercel-ai-gateway.models.ts` | [E: packages/ai/src/models.generated.ts:116] | gitignored JSON only [I] |
| `xai` | `packages/ai/src/providers/xai.models.ts` | [E: packages/ai/src/models.generated.ts:117] | gitignored JSON only [I] |
| `xiaomi` | `packages/ai/src/providers/xiaomi.models.ts` | [E: packages/ai/src/models.generated.ts:118] | gitignored JSON only [I] |
| `xiaomi-token-plan-ams` | `packages/ai/src/providers/xiaomi-token-plan-ams.models.ts` | [E: packages/ai/src/models.generated.ts:119] | gitignored JSON only [I] |
| `xiaomi-token-plan-cn` | `packages/ai/src/providers/xiaomi-token-plan-cn.models.ts` | [E: packages/ai/src/models.generated.ts:120] | gitignored JSON only [I] |
| `xiaomi-token-plan-sgp` | `packages/ai/src/providers/xiaomi-token-plan-sgp.models.ts` | [E: packages/ai/src/models.generated.ts:121] | gitignored JSON only [I] |
| `zai` | `packages/ai/src/providers/zai.models.ts` | [E: packages/ai/src/models.generated.ts:122] | gitignored JSON only [I] |
| `zai-coding-cn` | `packages/ai/src/providers/zai-coding-cn.models.ts` | [E: packages/ai/src/models.generated.ts:123] | gitignored JSON only [I] |

共 39 个 structural provider bucket。

## 本轮可从源码证明的 model id

`qwen-token-plan-individual` 是国际 Token Plan 源的 allowlist 视图。生成器把 `alibaba-token-plan` 输入过滤到 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS`，并固定 `api: "openai-completions"`、同一新加坡 compatible-mode base URL [E: packages/ai/scripts/generate-models.ts:2207] [E: packages/ai/scripts/generate-models.ts:2210] [E: packages/ai/scripts/generate-models.ts:2228] [E: packages/ai/scripts/generate-models.ts:2234]。最终 JSON 是否包含这 7 个 id 仍取决于生成时的远端 catalog，因此下表是 **generator allowlist**，不是 gitignored JSON 的 membership 证明 [I]。

| id | provider | api/wire | committed evidence |
|---|---|---|---|
| `deepseek-v4-flash-0731` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:308] [E: packages/ai/scripts/generate-models.ts:2234] |
| `deepseek-v4-pro` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:309] [E: packages/ai/scripts/generate-models.ts:2234] |
| `glm-5.2` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:310] [E: packages/ai/scripts/generate-models.ts:2234] |
| `qwen3.6-flash` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:311] [E: packages/ai/scripts/generate-models.ts:2234] |
| `qwen3.7-max` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:312] [E: packages/ai/scripts/generate-models.ts:2234] |
| `qwen3.7-plus` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:313] [E: packages/ai/scripts/generate-models.ts:2234] |
| `qwen3.8-max` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:314] [E: packages/ai/scripts/generate-models.ts:2234] |

`qwen3.8-max-preview` 在 `QWEN_TOKEN_PLAN_EXCLUDED_MODEL_IDS` 中，国际 / CN / Individual 三条变体都会跳过 [E: packages/ai/scripts/generate-models.ts:298] [E: packages/ai/scripts/generate-models.ts:2227]。

## 设计动机与 gotcha

- `*.models.ts` 现在是 TypeScript structure/type surface，不是完整 metadata snapshot；把旧版 npm artifact 的逐 id 表原样保留会冒充当前 checkout 可核的 `[E]`。[I]
- structural shard 的 bucket count（39）是静态 checkout 可复现的数量；发布 bundle 的 model count 由生成时外部 catalog 输入决定，二者应通过 source commit 关联而不能默认永远相等。[I]
- `MODELS` 仍提供 typed built-in catalog aggregation；运行时 dynamic refresh 和远端 overlay 属于 `subsys.ai.model-discovery`，不由本引用页展开。[I]

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

## 相关

- [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md): provider catalog 装配、查询与动态刷新。
- [subsys.ai.model-catalog-publication](../subsystems/ai/model-catalog-publication.md): JSON bundle 生成、校验、版本化发布与 CI 门控。
