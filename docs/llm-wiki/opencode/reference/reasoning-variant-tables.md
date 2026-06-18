---
id: ref.reasoning-variant-tables
title: Reasoning Variant Tables
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/provider/transform.ts
status: verified
updated: 355a0bcf5
evidence: explicit
symbols:
  - ProviderTransform.variants
  - openaiReasoningEfforts
  - googleThinkingVariants
  - options
  - smallOptions
related:
  - model-layer.provider-transforms
---

# Reasoning Variant Tables

本节点只描述 V1 `packages/opencode/src/provider/transform.ts` 的 reasoning variants。Provider registry 在从 models.dev/config 构建 model 时会调用 `ProviderTransform.variants(base)` 填充 `model.variants`。[E: packages/opencode/src/provider/provider.ts:1216] [E: packages/opencode/src/provider/provider.ts:1218] config model variants 可以 merge 并通过 `disabled` 删除具体 variant。[E: packages/opencode/src/provider/provider.ts:1461] [E: packages/opencode/src/provider/provider.ts:1464]

## Base Effort Sets

| Symbol | Values | 语义 |
| --- | --- | --- |
| `WIDELY_SUPPORTED_EFFORTS` | `low`, `medium`, `high` | 多数 provider 分支的基础 effort set。[E: packages/opencode/src/provider/transform.ts:517] |
| `OPENAI_EFFORTS` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` | OpenAI-compatible fallback effort set。[E: packages/opencode/src/provider/transform.ts:518] |
| `OPENAI_GPT5_1_EFFORTS` | `none`, `low`, `medium`, `high` | versioned gpt-5.1 effort set。[E: packages/opencode/src/provider/transform.ts:519] |
| `OPENAI_GPT5_2_PLUS_EFFORTS` | gpt-5.1 set plus `xhigh` | versioned gpt-5.2+ effort set。[E: packages/opencode/src/provider/transform.ts:520] |
| `OPENAI_GPT5_PRO_EFFORTS` | `high` | unversioned/pro GPT-5 pro default。[E: packages/opencode/src/provider/transform.ts:521] |
| `OPENAI_GPT5_PRO_2_PLUS_EFFORTS` | `medium`, `high`, `xhigh` | versioned GPT-5 pro 2+ effort set。[E: packages/opencode/src/provider/transform.ts:522] |
| `OPENAI_GPT5_CHAT_EFFORTS` | `medium` | versioned gpt-5 chat effort set。[E: packages/opencode/src/provider/transform.ts:523] |
| `OPENAI_GPT5_CODEX_XHIGH_EFFORTS` | `low`, `medium`, `high`, `xhigh` | Codex max/version 2+ effort set。[E: packages/opencode/src/provider/transform.ts:524] |
| `OPENAI_GPT5_CODEX_3_PLUS_EFFORTS` | `none`, `low`, `medium`, `high`, `xhigh` | Codex version 3+ effort set。[E: packages/opencode/src/provider/transform.ts:525] |

For the generic release-date fallback inside `openaiReasoningEfforts`, OpenAI `none` effort is added when release date is at least `2025-11-13`, and `xhigh` is added when release date is at least `2025-12-04`; family-specific helpers such as versioned GPT-5 and Codex run before that fallback and may expose `none` or `xhigh` independently。[E: packages/opencode/src/provider/transform.ts:530] [E: packages/opencode/src/provider/transform.ts:533] [E: packages/opencode/src/provider/transform.ts:579] [E: packages/opencode/src/provider/transform.ts:586]

## OpenAI Family Helpers

| Helper | Match | Result |
| --- | --- | --- |
| `GPT5_FAMILY_RE` | gpt-5 family anchored at string start or `/`。[E: packages/opencode/src/provider/transform.ts:538] [E: packages/opencode/src/provider/transform.ts:538] | Prevents false matching `gpt-50`/`gpt-5o` per comment。[E: packages/opencode/src/provider/transform.ts:538] |
| `versionedGpt5ReasoningEfforts` | versioned GPT-5 model IDs; versioned pro first。[E: packages/opencode/src/provider/transform.ts:547] [E: packages/opencode/src/provider/transform.ts:552] | pro 2+ gets pro 2+ set; version 1 gets gpt-5.1 set; version >=2 gets gpt-5.2+ set。 |
| `gpt5CodexReasoningEfforts` | gpt-5 family plus `codex`。[E: packages/opencode/src/provider/transform.ts:555] [E: packages/opencode/src/provider/transform.ts:560] | version >=3 gets none+xhigh set; codex-max/version >=2 gets xhigh set; older codex gets low/medium/high。 |
| `gpt5ChatReasoningEfforts` | gpt-5 family plus `-chat`。[E: packages/opencode/src/provider/transform.ts:563] [E: packages/opencode/src/provider/transform.ts:565] | unversioned chat returns empty variants; versioned chat returns `medium`。 |
| `openaiReasoningEfforts` | OpenAI native release-date-aware helper。[E: packages/opencode/src/provider/transform.ts:571] [E: packages/opencode/src/provider/transform.ts:587] | deep-research fixed medium; chat/pro/codex/versioned rules precede release-date additions。 |
| `openaiCompatibleReasoningEfforts` | OpenAI-compatible ID helper。[E: packages/opencode/src/provider/transform.ts:590] [E: packages/opencode/src/provider/transform.ts:595] | chat/pro/codex/versioned rules, else full `OPENAI_EFFORTS`。 |

## Pre-Switch Exclusions And Special Cases

`variants(model)` immediately returns `{}` if `model.capabilities.reasoning` is false。[E: packages/opencode/src/provider/transform.ts:665] [E: packages/opencode/src/provider/transform.ts:666] It returns a two-variant MiniMax M3 special case for Anthropic/OpenAI-compatible APIs: `none` disables thinking and `thinking` enables adaptive thinking。[E: packages/opencode/src/provider/transform.ts:669] [E: packages/opencode/src/provider/transform.ts:673]

Before switching on `model.api.npm`, the function suppresses variants for deepseek-chat, deepseek-reasoner, deepseek-r1, deepseek-v3, minimax, glm, kimi, k2p, qwen, and big-pickle IDs。[E: packages/opencode/src/provider/transform.ts:681] [E: packages/opencode/src/provider/transform.ts:692] Grok 3 mini has low/high variants, with OpenRouter using `{ reasoning: { effort } }` and non-OpenRouter using `{ reasoningEffort }`; other grok models get no variants。[E: packages/opencode/src/provider/transform.ts:695] [E: packages/opencode/src/provider/transform.ts:707]

## Provider/NPM Variant Table

| Branch | Variants emitted |
| --- | --- |
| `@openrouter/ai-sdk-provider` | If api ID starts `openai/` or model ID contains `gpt`, uses `openaiCompatibleReasoningEfforts` and emits `{ reasoning: { effort } }`; otherwise emits low/medium/high in the same OpenRouter shape。[E: packages/opencode/src/provider/transform.ts:709] [E: packages/opencode/src/provider/transform.ts:711] |
| `ai-gateway-provider` | For upstream `openai/`, uses release-date-aware `openaiReasoningEfforts` and emits `{ reasoningEffort }`; otherwise emits low/medium/high `{ reasoningEffort }` because Cloudflare compatible endpoint is OAI-shaped。[E: packages/opencode/src/provider/transform.ts:718] [E: packages/opencode/src/provider/transform.ts:729] |
| `@ai-sdk/gateway` with Anthropic model | Adaptive Anthropic efforts emit `{ thinking: { type:"adaptive", display? }, effort }`; older non-adaptive Anthropic emits `high/max` thinking budgets 16000/31999。[E: packages/opencode/src/provider/transform.ts:732] [E: packages/opencode/src/provider/transform.ts:751] |
| `@ai-sdk/gateway` with Google model | Gemini 2.5 emits `high/max` thinking budgets; other Google emits `low/high` with `includeThoughts` and `thinkingLevel`。[E: packages/opencode/src/provider/transform.ts:766] [E: packages/opencode/src/provider/transform.ts:783] |
| `@ai-sdk/gateway` other | Uses `openaiCompatibleReasoningEfforts` and emits `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:793] [E: packages/opencode/src/provider/transform.ts:794] |
| `@ai-sdk/github-copilot` | Gemini models get no variants; Claude models get low/medium/high `{ reasoningEffort }`; GPT models get low/medium/high plus conditional xhigh and include encrypted reasoning/summary auto。[E: packages/opencode/src/provider/transform.ts:797] [E: packages/opencode/src/provider/transform.ts:812] |
| `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/xai`, `@ai-sdk/deepinfra`, `venice-ai-sdk-provider`, `@ai-sdk/openai-compatible` | North mini code emits `none/high`; deepseek-v4 adds `max`; otherwise low/medium/high `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:823] [E: packages/opencode/src/provider/transform.ts:841] |
| `@ai-sdk/azure` | `o1-mini` emits no variants; otherwise `openaiReasoningEfforts` with `{ reasoningEffort, reasoningSummary:"auto", include:["reasoning.encrypted_content"] }`。[E: packages/opencode/src/provider/transform.ts:843] [E: packages/opencode/src/provider/transform.ts:846] |
| `@ai-sdk/amazon-bedrock/mantle`, `@ai-sdk/openai` | `openaiReasoningEfforts` with reasoning summary auto and encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:856] [E: packages/opencode/src/provider/transform.ts:860] |
| `@ai-sdk/anthropic`, `@ai-sdk/google-vertex/anthropic` | Adaptive efforts emit `{ thinking:{ type:"adaptive", display? }, effort }`; GitHub Copilot provider filters max/xhigh and opus-4.7 to medium; opus-4.5 emits low/medium/high `{ effort }`; older models emit high/max thinking budgets derived from output limit。[E: packages/opencode/src/provider/transform.ts:872] [E: packages/opencode/src/provider/transform.ts:885] |
| `@ai-sdk/amazon-bedrock` | Adaptive efforts emit `reasoningConfig { type:"adaptive", maxReasoningEffort, display? }`; Anthropic-on-Bedrock emits high/max budgetTokens; Amazon Nova emits low/medium/high maxReasoningEffort。[E: packages/opencode/src/provider/transform.ts:918] [E: packages/opencode/src/provider/transform.ts:953] |
| `@ai-sdk/google-vertex`, `@ai-sdk/google` | Delegates to `googleThinkingVariants(model)`。[E: packages/opencode/src/provider/transform.ts:965] [E: packages/opencode/src/provider/transform.ts:969] |
| `@ai-sdk/mistral` | Only model IDs containing Mistral Small 4 or Medium 3.5 identifiers emit `high: { reasoningEffort:"high" }`; other Mistral reasoning-capable models still emit none under this branch。[E: packages/opencode/src/provider/transform.ts:971] [E: packages/opencode/src/provider/transform.ts:984] |
| `@ai-sdk/cohere`, `@ai-sdk/perplexity` | Always `{}`。[E: packages/opencode/src/provider/transform.ts:988] [E: packages/opencode/src/provider/transform.ts:1006] |
| `@ai-sdk/groq` | Emits `none/low/medium/high` `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:992] [E: packages/opencode/src/provider/transform.ts:995] |
| `@jerome-benoit/sap-ai-provider-v2` | Wraps variants inside `modelParams`; Anthropic adaptive uses `thinking` plus `output_config.effort`, Anthropic old uses `budget_tokens`, Gemini 2.5 uses Google variants, GPT/o-series use `reasoning_effort`, fallback low/medium/high `reasoning_effort`。[E: packages/opencode/src/provider/transform.ts:1008] [E: packages/opencode/src/provider/transform.ts:1037] |

## Google Thinking Variants

`googleThinkingVariants` emits Gemini 2.5 `high/max` budget variants and otherwise maps `googleThinkingLevelEfforts(id)` into `{ thinkingConfig: { includeThoughts: true, thinkingLevel } }`。[E: packages/opencode/src/provider/transform.ts:647] [E: packages/opencode/src/provider/transform.ts:657] Gemini 3 flash-image emits `minimal/high`, pro-image emits `high`, flash emits `minimal/low/medium/high`, other Gemini 3 emits `low/medium/high`, and non-Gemini-3 emits `low/high`。[E: packages/opencode/src/provider/transform.ts:626] [E: packages/opencode/src/provider/transform.ts:632] Gemini 2.5 pro non-flash max budget is 32768; otherwise max budget is 24576。[E: packages/opencode/src/provider/transform.ts:635] [E: packages/opencode/src/provider/transform.ts:638]

## Default Options Related To Reasoning

`options(input)` sets `toolStreaming=false` for Google Vertex Anthropic or non-Claude Anthropic npm models。[E: packages/opencode/src/provider/transform.ts:1052] [E: packages/opencode/src/provider/transform.ts:1056] OpenAI, `@ai-sdk/openai`, GitHub Copilot, and Bedrock Mantle set `store=false`; Azure also sets `promptCacheKey=sessionID`。[E: packages/opencode/src/provider/transform.ts:1060] [E: packages/opencode/src/provider/transform.ts:1069] OpenRouter/llmgateway request usage include true and force Gemini 3 reasoning high。[E: packages/opencode/src/provider/transform.ts:1074] [E: packages/opencode/src/provider/transform.ts:1078]

Google/Vertex reasoning-capable models get `thinkingConfig.includeThoughts=true`, and Gemini 3 adds `thinkingLevel:"high"`。[E: packages/opencode/src/provider/transform.ts:1104] [E: packages/opencode/src/provider/transform.ts:1109] GPT-5 non-chat defaults `reasoningEffort:"medium"`, selected OpenAI/Azure/Copilot/Mantle models get `reasoningSummary:"auto"`, OpenAI/Mantle get encrypted reasoning include, non-chat non-codex gpt-5.x non-Azure gets `textVerbosity:"low"`。[E: packages/opencode/src/provider/transform.ts:1152] [E: packages/opencode/src/provider/transform.ts:1176]

`smallOptions(model)` merges the first variant into `{ store:false }` for OpenAI/openai npm/GitHub Copilot, maps OpenRouter low to `{ reasoning:{ effort:"none" } }`, disables Google reasoning for empty OpenRouter/llmgateway small variants, and disables Venice thinking when no small variant exists。[E: packages/opencode/src/provider/transform.ts:1202] [E: packages/opencode/src/provider/transform.ts:1221]

## Sources

- packages/opencode/src/provider/transform.ts

## Related

- model-layer.provider-transforms
