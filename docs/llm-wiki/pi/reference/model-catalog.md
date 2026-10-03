---
id: ref.ai.model-catalog
title: 模型结构目录(42 buckets)
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
  - packages/ai/src/providers/meta.models.ts
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
  - packages/ai/src/providers/radius.models.ts
  - packages/ai/src/providers/together.models.ts
  - packages/ai/src/providers/typesafe.models.ts
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
  - packages/coding-agent/src/core/model-resolver.ts
  - packages/ai/test/cloudflare-workers-ai-system-one.test.ts
symbols:
  - MODELS
  - IMAGE_MODELS
  - CLASSIFIER_MODELS
  - Model
  - KnownClassifierApi
related:
  - subsys.ai.model-discovery
  - subsys.ai.model-catalog-publication
  - subsys.ai.classifiers
  - ref.ai.image-models
  - subsys.coding-agent.model-resolver
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.ai.model-catalog` 记录目标 commit 已提交的 generated model **结构**。 [I] 完整模型值（name / cost / context / 逐 id 的 `Model.api`）在 generated、gitignored 的 `src/providers/data/<provider>.json`；本 catalog 只记录 id / provider / api 中源码能证明的结构事实。

## 能回答的问题

- 当前提交的 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 各有哪些 provider bucket?
- 每个 `*.models.ts` shard 如何并行 flatten chat / image / classifier?
- `KnownClassifierApi` 现在几个取值，`llama-cpp-classify` 是否出现在 generated shard 里?
- `qwen-token-plan-individual` 的 committed allowlist 有哪些 id?
- DeepSeek 官方 bucket 硬编码了哪些 id（有没有 `deepseek-v4-flash-vision-exp`）?
- Cloudflare Clef 与 NVIDIA 产品默认模型 id 是什么?

## 证据边界

目标 commit 提交了 **42** 个 provider structural shard（42 个 `*.models.ts` 文件）。每个 shard 从 gitignored `./data/<provider>.json` 并行导出三组 catalog：`flattenChatModelCatalog` → `*_MODELS`、`flattenImageModelCatalog` → `*_IMAGE_MODELS`、`flattenClassifierModelCatalog` → `*_CLASSIFIER_MODELS`。内部 helper `flattenModelCatalog(groups, type)` 按 `model.type` 过滤；实际 id/api/cost 等值不在 git tree [E: packages/ai/src/providers/amazon-bedrock.models.ts:4] [E: packages/ai/src/providers/amazon-bedrock.models.ts:8] [E: packages/ai/src/providers/amazon-bedrock.models.ts:11] [E: packages/ai/src/providers/amazon-bedrock.models.ts:14] [E: packages/ai/src/providers/radius.models.ts:8] [E: packages/ai/src/model-catalog.ts:53] [E: packages/ai/src/model-catalog.ts:57] [E: packages/ai/src/model-catalog.ts:62] [E: packages/ai/src/model-catalog.ts:69] [E: packages/ai/src/model-catalog.ts:76]。

`models.generated.ts` 把这 42 个 shard 聚合成并行的 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS`（同一 42 个 provider key，type 面与 value 面相等）。三份 object 都含 `meta`、`qwen-token-plan-individual`、`radius`、`typesafe`，从 `"amazon-bedrock"` 到 `"zai-coding-cn"` [E: packages/ai/src/models.generated.ts:48] [E: packages/ai/src/models.generated.ts:64] [E: packages/ai/src/models.generated.ts:78] [E: packages/ai/src/models.generated.ts:79] [E: packages/ai/src/models.generated.ts:81] [E: packages/ai/src/models.generated.ts:89] [E: packages/ai/src/models.generated.ts:91] [E: packages/ai/src/models.generated.ts:107] [E: packages/ai/src/models.generated.ts:121] [E: packages/ai/src/models.generated.ts:122] [E: packages/ai/src/models.generated.ts:124] [E: packages/ai/src/models.generated.ts:132] [E: packages/ai/src/models.generated.ts:135] [E: packages/ai/src/models.generated.ts:223]。同一 upstream id 可按 chat/image/classifier 分行。

`KnownClassifierApi` 现为三个：`"typesafe-system-one" | "cloudflare-workers-ai-system-one" | "llama-cpp-classify"` [E: packages/ai/src/types.ts:35]。前两个出现在 generated classifier 硬编码行里；`llama-cpp-classify` **没有**对应 `*.models.ts` bucket，`KnownProvider` 从 `"amazon-bedrock"` 列到 `"xiaomi-token-plan-sgp"`，不含 llama.cpp [E: packages/ai/src/types.ts:39] [E: packages/ai/src/types.ts:40] [E: packages/ai/src/types.ts:81]。`ClassifierModel` 强制 `type: "classifier"` [E: packages/ai/src/types.ts:1153] [E: packages/ai/src/types.ts:1154]。

`generate-models.ts` 先写 structural `.models.ts`（三个 flatten 调用）与 gitignored `src/providers/data/*.json`，再写 `models.generated.ts` 的三个 aggregator [E: packages/ai/scripts/generate-models.ts:3585] [E: packages/ai/scripts/generate-models.ts:3588] [E: packages/ai/scripts/generate-models.ts:3590] [E: packages/ai/scripts/generate-models.ts:3592] [E: packages/ai/scripts/generate-models.ts:3595] [E: packages/ai/scripts/generate-models.ts:3605] [E: packages/ai/scripts/generate-models.ts:3613] [E: packages/ai/scripts/generate-models.ts:3621] [E: packages/ai/scripts/generate-models.ts:3630]。因此 checkout 可复现的是 **42 个 bucket 结构**，不是 flattened model 总数。

硬编码 classifier 在生成末尾并入 `classifierModels`：`OPENCODE_CLASSIFIER_MODELS` 与 `CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS` [E: packages/ai/scripts/generate-models.ts:3476] [E: packages/ai/scripts/generate-models.ts:3480] [E: packages/ai/scripts/generate-models.ts:3481]。

`tools/generate-model-catalog.mjs` 按 `flattenChatModelCatalog` wrapper + `generate-models.ts` 硬编码 allowlist 生成本页骨架，再核 IMAGE/CLASSIFIER 与本轮 id 变更；不再寻找旧的逐模型 `Model<"api">` shard key。[I]

## Provider 覆盖摘要

| provider | structural shard | MODELS value bucket | committed per-model ids |
|---|---|---|---|
| `amazon-bedrock` | `packages/ai/src/providers/amazon-bedrock.models.ts` | [E: packages/ai/src/models.generated.ts:91] | gitignored JSON only [I] |
| `ant-ling` | `packages/ai/src/providers/ant-ling.models.ts` | [E: packages/ai/src/models.generated.ts:92] | gitignored JSON only [I] |
| `anthropic` | `packages/ai/src/providers/anthropic.models.ts` | [E: packages/ai/src/models.generated.ts:93] | gitignored JSON only [I] |
| `azure-openai-responses` | `packages/ai/src/providers/azure-openai-responses.models.ts` | [E: packages/ai/src/models.generated.ts:94] | gitignored JSON only [I] |
| `baseten` | `packages/ai/src/providers/baseten.models.ts` | [E: packages/ai/src/models.generated.ts:95] | gitignored JSON only [I] |
| `cerebras` | `packages/ai/src/providers/cerebras.models.ts` | [E: packages/ai/src/models.generated.ts:96] | gitignored JSON only [I] |
| `cloudflare-ai-gateway` | `packages/ai/src/providers/cloudflare-ai-gateway.models.ts` | [E: packages/ai/src/models.generated.ts:97] | gitignored JSON only；`workers-ai/` 前缀规则见下 [I] |
| `cloudflare-workers-ai` | `packages/ai/src/providers/cloudflare-workers-ai.models.ts` | [E: packages/ai/src/models.generated.ts:98] | generator hardcoded 3 classifier ids（Clef / Jev，见下表） |
| `deepseek` | `packages/ai/src/providers/deepseek.models.ts` | [E: packages/ai/src/models.generated.ts:99] | generator hardcoded `deepseek-flash` + `deepseek-v4-pro`（见下表） |
| `fireworks` | `packages/ai/src/providers/fireworks.models.ts` | [E: packages/ai/src/models.generated.ts:100] | gitignored JSON only [I] |
| `github-copilot` | `packages/ai/src/providers/github-copilot.models.ts` | [E: packages/ai/src/models.generated.ts:101] | gitignored JSON only [I] |
| `google` | `packages/ai/src/providers/google.models.ts` | [E: packages/ai/src/models.generated.ts:102] | gitignored JSON only [I] |
| `google-vertex` | `packages/ai/src/providers/google-vertex.models.ts` | [E: packages/ai/src/models.generated.ts:103] | gitignored JSON only [I] |
| `groq` | `packages/ai/src/providers/groq.models.ts` | [E: packages/ai/src/models.generated.ts:104] | gitignored JSON only [I] |
| `huggingface` | `packages/ai/src/providers/huggingface.models.ts` | [E: packages/ai/src/models.generated.ts:105] | gitignored JSON only [I] |
| `kimi-coding` | `packages/ai/src/providers/kimi-coding.models.ts` | [E: packages/ai/src/models.generated.ts:106] | gitignored JSON only [I] |
| `meta` | `packages/ai/src/providers/meta.models.ts` | [E: packages/ai/src/models.generated.ts:107] | gitignored JSON only [I] |
| `minimax` | `packages/ai/src/providers/minimax.models.ts` | [E: packages/ai/src/models.generated.ts:108] | gitignored JSON only [I] |
| `minimax-cn` | `packages/ai/src/providers/minimax-cn.models.ts` | [E: packages/ai/src/models.generated.ts:109] | gitignored JSON only [I] |
| `mistral` | `packages/ai/src/providers/mistral.models.ts` | [E: packages/ai/src/models.generated.ts:110] | gitignored JSON only [I] |
| `moonshotai` | `packages/ai/src/providers/moonshotai.models.ts` | [E: packages/ai/src/models.generated.ts:111] | gitignored JSON only [I] |
| `moonshotai-cn` | `packages/ai/src/providers/moonshotai-cn.models.ts` | [E: packages/ai/src/models.generated.ts:112] | gitignored JSON only [I] |
| `nvidia` | `packages/ai/src/providers/nvidia.models.ts` | [E: packages/ai/src/models.generated.ts:113] | gitignored JSON only [I]；coding-agent default 见下 |
| `openai` | `packages/ai/src/providers/openai.models.ts` | [E: packages/ai/src/models.generated.ts:114] | gitignored JSON only [I] |
| `openai-codex` | `packages/ai/src/providers/openai-codex.models.ts` | [E: packages/ai/src/models.generated.ts:115] | gitignored JSON only [I] |
| `opencode` | `packages/ai/src/providers/opencode.models.ts` | [E: packages/ai/src/models.generated.ts:116] | generator hardcoded `jev-1.13` / `jev-1.13-free`（见下表） |
| `opencode-go` | `packages/ai/src/providers/opencode-go.models.ts` | [E: packages/ai/src/models.generated.ts:117] | gitignored JSON only [I] |
| `openrouter` | `packages/ai/src/providers/openrouter.models.ts` | [E: packages/ai/src/models.generated.ts:118] | gitignored JSON only [I] |
| `qwen-token-plan` | `packages/ai/src/providers/qwen-token-plan.models.ts` | [E: packages/ai/src/models.generated.ts:119] | gitignored JSON only [I] |
| `qwen-token-plan-cn` | `packages/ai/src/providers/qwen-token-plan-cn.models.ts` | [E: packages/ai/src/models.generated.ts:120] | gitignored JSON only [I] |
| `qwen-token-plan-individual` | `packages/ai/src/providers/qwen-token-plan-individual.models.ts` | [E: packages/ai/src/models.generated.ts:121] | generator allowlist 9 ids（见下表） [E: packages/ai/scripts/generate-models.ts:322] |
| `radius` | `packages/ai/src/providers/radius.models.ts` | [E: packages/ai/src/models.generated.ts:122] | gitignored JSON only [I] |
| `together` | `packages/ai/src/providers/together.models.ts` | [E: packages/ai/src/models.generated.ts:123] | gitignored JSON only [I]；effort map 钉 `deepseek-ai/DeepSeek-V4-Pro-0813` |
| `typesafe` | `packages/ai/src/providers/typesafe.models.ts` | [E: packages/ai/src/models.generated.ts:124] | gitignored JSON only [I] |
| `vercel-ai-gateway` | `packages/ai/src/providers/vercel-ai-gateway.models.ts` | [E: packages/ai/src/models.generated.ts:125] | gitignored JSON only [I] |
| `xai` | `packages/ai/src/providers/xai.models.ts` | [E: packages/ai/src/models.generated.ts:126] | gitignored JSON only [I] |
| `xiaomi` | `packages/ai/src/providers/xiaomi.models.ts` | [E: packages/ai/src/models.generated.ts:127] | gitignored JSON only [I] |
| `xiaomi-token-plan-ams` | `packages/ai/src/providers/xiaomi-token-plan-ams.models.ts` | [E: packages/ai/src/models.generated.ts:128] | gitignored JSON only [I] |
| `xiaomi-token-plan-cn` | `packages/ai/src/providers/xiaomi-token-plan-cn.models.ts` | [E: packages/ai/src/models.generated.ts:129] | gitignored JSON only [I] |
| `xiaomi-token-plan-sgp` | `packages/ai/src/providers/xiaomi-token-plan-sgp.models.ts` | [E: packages/ai/src/models.generated.ts:130] | gitignored JSON only [I] |
| `zai` | `packages/ai/src/providers/zai.models.ts` | [E: packages/ai/src/models.generated.ts:131] | gitignored JSON only [I] |
| `zai-coding-cn` | `packages/ai/src/providers/zai-coding-cn.models.ts` | [E: packages/ai/src/models.generated.ts:132] | gitignored JSON only [I] |

共 **42** 个 structural provider bucket。`MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 的 type 面与 value 面都是这 42 个 key。

## 本轮可从源码证明的 model id

`qwen-token-plan-individual` 是国际 Token Plan 源的 allowlist 视图。生成器把 `alibaba-token-plan` 输入过滤到 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS`，并固定 `api: "openai-completions"`、同一新加坡 compatible-mode base URL [E: packages/ai/scripts/generate-models.ts:2609] [E: packages/ai/scripts/generate-models.ts:2611] [E: packages/ai/scripts/generate-models.ts:2639]。最终 JSON 是否包含这 9 个 id 仍取决于生成时的远端 catalog，因此下表是 **generator allowlist**，不是 gitignored JSON 的 membership 证明 [I]。

| id | provider | api/wire | committed evidence |
|---|---|---|---|
| `deepseek-v4-flash-0731` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:323] [E: packages/ai/scripts/generate-models.ts:2611] |
| `deepseek-v4-pro` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:324] [E: packages/ai/scripts/generate-models.ts:2611] |
| `deepseek-v4-pro-0813` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:325] [E: packages/ai/scripts/generate-models.ts:2611] |
| `glm-5.2` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:326] [E: packages/ai/scripts/generate-models.ts:2611] |
| `qwen3.6-flash` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:327] [E: packages/ai/scripts/generate-models.ts:2611] |
| `qwen3.7-max` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:328] [E: packages/ai/scripts/generate-models.ts:2611] |
| `qwen3.7-plus` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:329] [E: packages/ai/scripts/generate-models.ts:2611] |
| `qwen3.8-flash` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:330] [E: packages/ai/scripts/generate-models.ts:2611] |
| `qwen3.8-max` | `qwen-token-plan-individual` | `openai-completions` | [E: packages/ai/scripts/generate-models.ts:331] [E: packages/ai/scripts/generate-models.ts:2611] |

`qwen3.8-max-preview` 在 `QWEN_TOKEN_PLAN_EXCLUDED_MODEL_IDS` 中，国际 / CN / Individual 三条变体都会跳过 [E: packages/ai/scripts/generate-models.ts:313] [E: packages/ai/scripts/generate-models.ts:2628]。

### DeepSeek 官方 bucket

DeepSeek 官方 bucket 另有一组 **generator 硬编码** 的 chat 行，不依赖 gitignored JSON。`deepseek-flash`（name `DeepSeek V4.1 Flash`，`openai-completions`，`input: ["text", "image"]`）与 `deepseek-v4-pro`（name `DeepSeek V4 Pro`，`input: ["text"]`）写在生成器里 [E: packages/ai/scripts/generate-models.ts:3103] [E: packages/ai/scripts/generate-models.ts:3104] [E: packages/ai/scripts/generate-models.ts:3105] [E: packages/ai/scripts/generate-models.ts:3110] [E: packages/ai/scripts/generate-models.ts:3123] [E: packages/ai/scripts/generate-models.ts:3124] [E: packages/ai/scripts/generate-models.ts:3129]。不要再 cite 已删除的 `deepseek-v4-flash-vision-exp` 硬编码行。这两行不是 Individual allowlist 成员。

Together 的 reasoning-effort toggle 集合现钉 `deepseek-ai/DeepSeek-V4-Pro-0813`（不再是无日期后缀的 `deepseek-ai/DeepSeek-V4-Pro`）[E: packages/ai/scripts/generate-models.ts:201]。该 id 是否进入 `together` JSON 仍取决于 models.dev [I]。NVIDIA NIM 排除表仍列出 `deepseek-ai/deepseek-v4-flash` 与 `deepseek-ai/deepseek-v4-pro`，因此这两个 NVIDIA 形态不会进 `nvidia` catalog [E: packages/ai/scripts/generate-models.ts:246] [E: packages/ai/scripts/generate-models.ts:247]。

### Cloudflare Clef（Workers AI classifiers）

`CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS` 硬编码三条 `cloudflare-workers-ai-system-one` 行，并入 generated classifier catalog：

| id | provider | api/wire | committed evidence |
|---|---|---|---|
| `@cf/cloudflare/clef` | `cloudflare-workers-ai` | `cloudflare-workers-ai-system-one` | [E: packages/ai/scripts/generate-models.ts:2744] [E: packages/ai/scripts/generate-models.ts:2746] [E: packages/ai/scripts/generate-models.ts:2747] |
| `@cf/cloudflare/clef-flash` | `cloudflare-workers-ai` | `cloudflare-workers-ai-system-one` | [E: packages/ai/scripts/generate-models.ts:2754] [E: packages/ai/scripts/generate-models.ts:2756] [E: packages/ai/scripts/generate-models.ts:2757] |
| `typesafe/jev` | `cloudflare-workers-ai` | `cloudflare-workers-ai-system-one` | [E: packages/ai/scripts/generate-models.ts:2766] [E: packages/ai/scripts/generate-models.ts:2768] [E: packages/ai/scripts/generate-models.ts:2769] |

Clef / Clef Flash 都声明 `input: ["text"]` [E: packages/ai/scripts/generate-models.ts:2749] [E: packages/ai/scripts/generate-models.ts:2760]。测试按这两条 id 走 `getModelOfType("classifier", "cloudflare-workers-ai", id)` 与 `/ai/run` [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:107] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:108] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:111]。

同文件 `OPENCODE_CLASSIFIER_MODELS` 把 OpenCode Zen 的 Jev 钉成 `jev-1.13` 与 `jev-1.13-free`（`typesafe-system-one`，`provider: "opencode"`），不再使用旧 id `jev-latest` [E: packages/ai/scripts/generate-models.ts:2715] [E: packages/ai/scripts/generate-models.ts:2718] [E: packages/ai/scripts/generate-models.ts:2726] [E: packages/ai/scripts/generate-models.ts:2729]。

### NVIDIA 产品默认

`nvidia` shard 的逐 id 清单仍只在 gitignored JSON。coding-agent `defaultModelPerProvider.nvidia` 现为 `nvidia/nemotron-3-ultra-550b-a55b`，替换已下线的 `nvidia/nemotron-3-super-120b-a12b` [E: packages/coding-agent/src/core/model-resolver.ts:28]。该 default 是产品选择指针，不是 generated catalog 的 membership 证明 [I]。

### llama-cpp-classify

`llama-cpp-classify` 是 `KnownClassifierApi` 的第三个成员 [E: packages/ai/src/types.ts:35]，但 **42 个 generated shard 都不导出它**：没有 `llama.cpp.models.ts`，`CLASSIFIER_MODELS` 的 key 止于 `zai-coding-cn` [E: packages/ai/src/models.generated.ts:265] [E: packages/ai/src/models.generated.ts:308]。运行时 classifier 由 llama.cpp 扩展合成，不属于本页 grouped catalog 实例。

`cloudflare-ai-gateway` bucket 的 `workers-ai` upstream 固定 `api: "openai-completions"`、compat base URL，id 为 models.dev 的 prefixed id；models.dev 漏掉该前缀时，生成器从 `cloudflare-workers-ai` catalog 镜像 `workers-ai/${modelId}`。具体 chat id 仍在 gitignored JSON，本页只记录此前缀规则 [E: packages/ai/scripts/generate-models.ts:1970] [E: packages/ai/scripts/generate-models.ts:1973] [E: packages/ai/scripts/generate-models.ts:2010] [E: packages/ai/scripts/generate-models.ts:2015] [I]。

## 设计动机与 gotcha

- `*.models.ts` 现在是 TypeScript structure/type surface，不是完整 metadata snapshot；把旧版 npm artifact 的逐 id 表原样保留会冒充当前 checkout 可核的 `[E]`。[I]
- structural shard 的 bucket count（42）是静态 checkout 可复现的数量；发布 bundle 的 model count 由生成时外部 catalog 输入决定，二者应通过 source commit 关联而不能默认永远相等。[I]
- `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 提供 typed built-in aggregation；运行时 dynamic refresh 和远端 overlay 属于 `subsys.ai.model-discovery`，不由本引用页展开。[I]
- `llama-cpp-classify` 扩展了 `KnownClassifierApi`，但 grouped catalog 实例仍是 42 个 generated shard，不要把 llama.cpp 算成第 43 个 bucket。[E: packages/ai/src/types.ts:35]
- NVIDIA 产品 default 写在 coding-agent `defaultModelPerProvider`，不写在 `nvidia.models.ts`。[E: packages/coding-agent/src/core/model-resolver.ts:28]

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
- packages/ai/src/providers/meta.models.ts
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
- packages/ai/src/providers/radius.models.ts
- packages/ai/src/providers/together.models.ts
- packages/ai/src/providers/typesafe.models.ts
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
- packages/coding-agent/src/core/model-resolver.ts
- packages/ai/test/cloudflare-workers-ai-system-one.test.ts

## 相关

- [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md): provider catalog 装配、查询与动态刷新。
- [subsys.ai.model-catalog-publication](../subsystems/ai/model-catalog-publication.md): JSON bundle 生成、校验、版本化发布与 CI 门控。
- [subsys.ai.classifiers](../subsystems/ai/classifiers.md): `KnownClassifierApi` 三个取值与 `classify()` 分派。
- [ref.ai.image-models](image-models.md): `IMAGE_MODELS` 字段与 OpenRouter 图像行。
- [subsys.coding-agent.model-resolver](../subsystems/coding-agent/model-resolver.md): `defaultModelPerProvider`（含 NVIDIA default）。
