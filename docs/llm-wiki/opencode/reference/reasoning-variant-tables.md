---
id: ref.reasoning-variant-tables
title: Reasoning Variant Tables
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/provider/transform.ts
status: verified
updated: 8b68dc0d7
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
| `WIDELY_SUPPORTED_EFFORTS` | `low`, `medium`, `high` | 多数 provider 分支的基础 effort set。[E: packages/opencode/src/provider/transform.ts:519] |
| `OPENAI_EFFORTS` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` | OpenAI-compatible fallback effort set。[E: packages/opencode/src/provider/transform.ts:520] |
| `OPENAI_GPT5_1_EFFORTS` | `none`, `low`, `medium`, `high` | versioned gpt-5.1 effort set。[E: packages/opencode/src/provider/transform.ts:521] |
| `OPENAI_GPT5_2_PLUS_EFFORTS` | gpt-5.1 set plus `xhigh` | versioned gpt-5.2+ effort set。[E: packages/opencode/src/provider/transform.ts:522] |
| `OPENAI_GPT5_PRO_EFFORTS` | `high` | unversioned/pro GPT-5 pro default。[E: packages/opencode/src/provider/transform.ts:523] |
| `OPENAI_GPT5_PRO_2_PLUS_EFFORTS` | `medium`, `high`, `xhigh` | versioned GPT-5 pro 2+ effort set。[E: packages/opencode/src/provider/transform.ts:524] |
| `OPENAI_GPT5_CHAT_EFFORTS` | `medium` | versioned gpt-5 chat effort set。[E: packages/opencode/src/provider/transform.ts:525] |
| `OPENAI_GPT5_CODEX_XHIGH_EFFORTS` | `low`, `medium`, `high`, `xhigh` | Codex max/version 2+ effort set。[E: packages/opencode/src/provider/transform.ts:526] |
| `OPENAI_GPT5_CODEX_3_PLUS_EFFORTS` | `none`, `low`, `medium`, `high`, `xhigh` | Codex version 3+ effort set。[E: packages/opencode/src/provider/transform.ts:527] |

For the generic release-date fallback inside `openaiReasoningEfforts`, OpenAI `none` effort is added when release date is at least `2025-11-13`, and `xhigh` is added when release date is at least `2025-12-04`; family-specific helpers such as versioned GPT-5 and Codex run before that fallback and may expose `none` or `xhigh` independently。[E: packages/opencode/src/provider/transform.ts:532] [E: packages/opencode/src/provider/transform.ts:535] [E: packages/opencode/src/provider/transform.ts:579] [E: packages/opencode/src/provider/transform.ts:587] [E: packages/opencode/src/provider/transform.ts:588]

## OpenAI Family Helpers

| Helper | Match | Result |
| --- | --- | --- |
| `GPT5_FAMILY_RE` | gpt-5 family anchored at string start or `/`。[E: packages/opencode/src/provider/transform.ts:540] | Regex avoids matching non-family strings such as `gpt-50` or `gpt-5o` by requiring `gpt-5` followed by `.`, `-`, `/`, start, or end。[E: packages/opencode/src/provider/transform.ts:540] |
| `versionedGpt5ReasoningEfforts` | versioned GPT-5 model IDs; versioned pro first。[E: packages/opencode/src/provider/transform.ts:549] [E: packages/opencode/src/provider/transform.ts:550] | pro 2+ gets pro 2+ set; version 1 gets gpt-5.1 set; version >=2 gets gpt-5.2+ set。 |
| `gpt5CodexReasoningEfforts` | gpt-5 family plus `codex`。[E: packages/opencode/src/provider/transform.ts:557] [E: packages/opencode/src/provider/transform.ts:558] | version >=3 gets none+xhigh set; codex-max/version >=2 gets xhigh set; older codex gets low/medium/high。 |
| `gpt5ChatReasoningEfforts` | gpt-5 family plus `-chat`。[E: packages/opencode/src/provider/transform.ts:565] [E: packages/opencode/src/provider/transform.ts:566] | unversioned chat returns empty variants; versioned chat returns `medium`。 |
| `openaiReasoningEfforts` | OpenAI native release-date-aware helper。[E: packages/opencode/src/provider/transform.ts:573] [E: packages/opencode/src/provider/transform.ts:587] | deep-research fixed medium; chat/pro/codex/versioned rules precede release-date additions。 |
| `openaiCompatibleReasoningEfforts` | OpenAI-compatible ID helper。[E: packages/opencode/src/provider/transform.ts:592] [E: packages/opencode/src/provider/transform.ts:597] | chat/pro/codex/versioned rules, else full `OPENAI_EFFORTS`。 |

## Pre-Switch Exclusions And Special Cases

`variants(model)` immediately returns `{}` if `model.capabilities.reasoning` is false。[E: packages/opencode/src/provider/transform.ts:673] [E: packages/opencode/src/provider/transform.ts:674] It returns a two-variant MiniMax M3 special case for Anthropic/OpenAI-compatible APIs: `none` disables thinking and `thinking` enables adaptive thinking。[E: packages/opencode/src/provider/transform.ts:680] [E: packages/opencode/src/provider/transform.ts:685] [E: packages/opencode/src/provider/transform.ts:686]

Before switching on `model.api.npm`, the function special-cases GLM 5.2 and then suppresses variants for deepseek-chat, deepseek-reasoner, deepseek-r1, deepseek-v3, minimax, other glm IDs, kimi, k2p, qwen, and big-pickle IDs。[E: packages/opencode/src/provider/transform.ts:677] [E: packages/opencode/src/provider/transform.ts:691] [E: packages/opencode/src/provider/transform.ts:710] [E: packages/opencode/src/provider/transform.ts:722] Grok 3 mini has low/high variants, with OpenRouter using `{ reasoning: { effort } }` and non-OpenRouter using `{ reasoningEffort }`; other grok models get no variants。[E: packages/opencode/src/provider/transform.ts:725] [E: packages/opencode/src/provider/transform.ts:732] [E: packages/opencode/src/provider/transform.ts:737]

## Provider/NPM Variant Table

| Branch | Variants emitted |
| --- | --- |
| `@openrouter/ai-sdk-provider` | If api ID starts `openai/` or model ID contains `gpt`, uses `openaiCompatibleReasoningEfforts` and emits `{ reasoning: { effort } }`; otherwise emits low/medium/high in the same OpenRouter shape。[E: packages/opencode/src/provider/transform.ts:740] [E: packages/opencode/src/provider/transform.ts:742] [E: packages/opencode/src/provider/transform.ts:745] |
| `ai-gateway-provider` | For upstream `openai/`, uses release-date-aware `openaiReasoningEfforts` and emits `{ reasoningEffort }`; otherwise emits low/medium/high `{ reasoningEffort }` because Cloudflare compatible endpoint is OAI-shaped。[E: packages/opencode/src/provider/transform.ts:748] [E: packages/opencode/src/provider/transform.ts:756] [E: packages/opencode/src/provider/transform.ts:759] |
| `@ai-sdk/gateway` with Anthropic model | Adaptive Anthropic efforts emit `{ thinking: { type:"adaptive", display? }, effort }`; older non-adaptive Anthropic emits `high/max` thinking budgets 16000/31999。[E: packages/opencode/src/provider/transform.ts:762] [E: packages/opencode/src/provider/transform.ts:764] [E: packages/opencode/src/provider/transform.ts:781] |
| `@ai-sdk/gateway` with Google model | Gemini 2.5 emits `high/max` thinking budgets; other Google emits `low/high` with `includeThoughts` and `thinkingLevel`。[E: packages/opencode/src/provider/transform.ts:796] [E: packages/opencode/src/provider/transform.ts:797] [E: packages/opencode/src/provider/transform.ts:813] |
| `@ai-sdk/gateway` other | Uses `openaiCompatibleReasoningEfforts` and emits `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:823] [E: packages/opencode/src/provider/transform.ts:824] |
| `@ai-sdk/github-copilot` | Gemini models get no variants; Claude models get low/medium/high `{ reasoningEffort }`; GPT models get low/medium/high plus conditional xhigh and include encrypted reasoning/summary auto。[E: packages/opencode/src/provider/transform.ts:827] [E: packages/opencode/src/provider/transform.ts:832] [E: packages/opencode/src/provider/transform.ts:842] |
| `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/xai`, `@ai-sdk/deepinfra`, `venice-ai-sdk-provider`, `@ai-sdk/openai-compatible` | North mini code emits `none/high`; deepseek-v4 adds `max`; otherwise low/medium/high `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:853] [E: packages/opencode/src/provider/transform.ts:855] [E: packages/opencode/src/provider/transform.ts:859] [E: packages/opencode/src/provider/transform.ts:864] [E: packages/opencode/src/provider/transform.ts:868] [E: packages/opencode/src/provider/transform.ts:871] |
| `@ai-sdk/azure` | `o1-mini` emits no variants; otherwise `openaiReasoningEfforts` with `{ reasoningEffort, reasoningSummary:"auto", include:["reasoning.encrypted_content"] }`。[E: packages/opencode/src/provider/transform.ts:873] [E: packages/opencode/src/provider/transform.ts:875] [E: packages/opencode/src/provider/transform.ts:877] |
| `@ai-sdk/amazon-bedrock/mantle`, `@ai-sdk/openai` | `openaiReasoningEfforts` with reasoning summary auto and encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:886] [E: packages/opencode/src/provider/transform.ts:887] [E: packages/opencode/src/provider/transform.ts:889] |
| `@ai-sdk/anthropic`, `@ai-sdk/google-vertex/anthropic` | Adaptive efforts emit `{ thinking:{ type:"adaptive", display? }, effort }`; GitHub Copilot provider filters max/xhigh and opus-4.7 to medium; opus-4.5 emits low/medium/high `{ effort }`; older models emit high/max thinking budgets derived from output limit。[E: packages/opencode/src/provider/transform.ts:902] [E: packages/opencode/src/provider/transform.ts:906] [E: packages/opencode/src/provider/transform.ts:929] [E: packages/opencode/src/provider/transform.ts:933] |
| `@ai-sdk/amazon-bedrock` | Adaptive efforts emit `reasoningConfig { type:"adaptive", maxReasoningEffort, display? }`; Anthropic-on-Bedrock emits high/max budgetTokens; Amazon Nova emits low/medium/high maxReasoningEffort。[E: packages/opencode/src/provider/transform.ts:948] [E: packages/opencode/src/provider/transform.ts:950] [E: packages/opencode/src/provider/transform.ts:965] [E: packages/opencode/src/provider/transform.ts:983] |
| `@ai-sdk/google-vertex`, `@ai-sdk/google` | Delegates to `googleThinkingVariants(model)`。[E: packages/opencode/src/provider/transform.ts:995] [E: packages/opencode/src/provider/transform.ts:999] |
| `@ai-sdk/mistral` | Only model IDs containing Mistral Small 4 or Medium 3.5 identifiers emit `high: { reasoningEffort:"high" }`; other Mistral reasoning-capable models still emit none under this branch。[E: packages/opencode/src/provider/transform.ts:1001] [E: packages/opencode/src/provider/transform.ts:1006] [E: packages/opencode/src/provider/transform.ts:1013] |
| `@ai-sdk/cohere`, `@ai-sdk/perplexity` | Always `{}`。[E: packages/opencode/src/provider/transform.ts:1018] [E: packages/opencode/src/provider/transform.ts:1034] |
| `@ai-sdk/groq` | Emits `none/low/medium/high` `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:1022] [E: packages/opencode/src/provider/transform.ts:1024] |
| `@jerome-benoit/sap-ai-provider-v2` | Wraps variants inside `modelParams`; Anthropic adaptive uses `thinking` plus `output_config.effort`, Anthropic old uses `budget_tokens`, Gemini 2.5 uses Google variants, GPT/o-series use `reasoning_effort`, fallback low/medium/high `reasoning_effort`。[E: packages/opencode/src/provider/transform.ts:1038] [E: packages/opencode/src/provider/transform.ts:1043] [E: packages/opencode/src/provider/transform.ts:1056] [E: packages/opencode/src/provider/transform.ts:1061] [E: packages/opencode/src/provider/transform.ts:1065] [E: packages/opencode/src/provider/transform.ts:1068] |

## Google Thinking Variants

`googleThinkingVariants` emits Gemini 2.5 `high/max` budget variants and otherwise maps `googleThinkingLevelEfforts(id)` into `{ thinkingConfig: { includeThoughts: true, thinkingLevel } }`。[E: packages/opencode/src/provider/transform.ts:655] [E: packages/opencode/src/provider/transform.ts:657] [E: packages/opencode/src/provider/transform.ts:665] Gemini 3 flash-image emits `minimal/high`, pro-image emits `high`, flash emits `minimal/low/medium/high`, other Gemini 3 emits `low/medium/high`, and non-Gemini-3 emits `low/high`。[E: packages/opencode/src/provider/transform.ts:636] [E: packages/opencode/src/provider/transform.ts:638] [E: packages/opencode/src/provider/transform.ts:640] Gemini 2.5 pro non-flash max budget is 32768; otherwise max budget is 24576。[E: packages/opencode/src/provider/transform.ts:643] [E: packages/opencode/src/provider/transform.ts:646]

## Default Options Related To Reasoning

`options(input)` sets `toolStreaming=false` for Google Vertex Anthropic or non-Claude Anthropic npm models。[E: packages/opencode/src/provider/transform.ts:1082] [E: packages/opencode/src/provider/transform.ts:1086] OpenAI, `@ai-sdk/openai`, GitHub Copilot, and Bedrock Mantle set `store=false`; Azure also sets `promptCacheKey=sessionID`。[E: packages/opencode/src/provider/transform.ts:1090] [E: packages/opencode/src/provider/transform.ts:1101] OpenRouter/llmgateway request usage include true and force Gemini 3 reasoning high。[E: packages/opencode/src/provider/transform.ts:1104] [E: packages/opencode/src/provider/transform.ts:1109]

Google/Vertex reasoning-capable models get `thinkingConfig.includeThoughts=true`, and Gemini 3 adds `thinkingLevel:"high"`。[E: packages/opencode/src/provider/transform.ts:1134] [E: packages/opencode/src/provider/transform.ts:1136] [E: packages/opencode/src/provider/transform.ts:1140] GPT-5 non-chat defaults `reasoningEffort:"medium"`, selected OpenAI/Azure/Copilot/Mantle models get `reasoningSummary:"auto"`, OpenAI/Mantle get encrypted reasoning include, non-chat non-codex gpt-5.x non-Azure gets `textVerbosity:"low"`。[E: packages/opencode/src/provider/transform.ts:1182] [E: packages/opencode/src/provider/transform.ts:1184] [E: packages/opencode/src/provider/transform.ts:1191] [E: packages/opencode/src/provider/transform.ts:1194] [E: packages/opencode/src/provider/transform.ts:1206]

`smallOptions(model)` merges the first variant into `{ store:false }` for OpenAI/openai npm/GitHub Copilot, maps OpenRouter low to `{ reasoning:{ effort:"none" } }`, disables Google reasoning for empty OpenRouter/llmgateway small variants, and disables Venice thinking when no small variant exists。[E: packages/opencode/src/provider/transform.ts:1232] [E: packages/opencode/src/provider/transform.ts:1240] [E: packages/opencode/src/provider/transform.ts:1244] [E: packages/opencode/src/provider/transform.ts:1247] [E: packages/opencode/src/provider/transform.ts:1253]

## Sources

- packages/opencode/src/provider/transform.ts

## Related

- model-layer.provider-transforms
