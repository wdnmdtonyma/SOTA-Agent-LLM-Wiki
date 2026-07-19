---
id: ref.reasoning-variant-tables
title: Reasoning Variant Tables
kind: reference
tier: T3
v: v1
source:
  - packages/opencode/src/provider/transform.ts
  - packages/opencode/src/provider/provider.ts
  - packages/core/src/models-dev.ts
status: verified
updated: 67caf894e
evidence: explicit
symbols:
  - ProviderTransform.variants
  - ProviderTransform.reasoningVariants
  - openaiReasoningEfforts
  - googleThinkingVariants
  - options
  - smallOptions
related:
  - model-layer.provider-transforms
---

# Reasoning Variant Tables

本节点只描述 V1 `packages/opencode/src/provider/transform.ts` 的 reasoning variants。Provider registry 从 models.dev 构建 model 时先调用 `ProviderTransform.reasoningVariants(model, base)`;只有它返回 `undefined` 时才回退 `ProviderTransform.variants(base)`。[E: packages/opencode/src/provider/provider.ts:1252] [E: packages/opencode/src/provider/provider.ts:1256] config model variants 会 merge 并可通过 `disabled` 删除具体 variant。[E: packages/opencode/src/provider/provider.ts:1503] [E: packages/opencode/src/provider/provider.ts:1507] [E: packages/opencode/src/provider/provider.ts:1509] [E: packages/opencode/src/provider/provider.ts:1510]

## Models.dev Reasoning Options

`reasoning_options` 是 optional array:可声明 `effort` 与可用 string/null values、`toggle`,或带 optional min/max 的 `budget_tokens`。[E: packages/core/src/models-dev.ts:47] [E: packages/core/src/models-dev.ts:49] [E: packages/core/src/models-dev.ts:50] [E: packages/core/src/models-dev.ts:53] [E: packages/core/src/models-dev.ts:56] [E: packages/core/src/models-dev.ts:57] [E: packages/core/src/models-dev.ts:58] [E: packages/core/src/models-dev.ts:71]

| Catalog option | Variant 翻译 |
| --- | --- |
| `effort` | 每个 string 值成为同名 variant;`null` 成为 `none`。`reasoningEffort()` 再按 npm package 输出 `reasoning.effort`、`thinkingConfig`、`reasoningConfig`、`reasoningEffort` 或 provider 特有 shape;不支持的组合被丢弃。[E: packages/opencode/src/provider/transform.ts:1601] [E: packages/opencode/src/provider/transform.ts:1605] [E: packages/opencode/src/provider/transform.ts:1609] [E: packages/opencode/src/provider/transform.ts:1610] [E: packages/opencode/src/provider/transform.ts:1648] |
| `toggle` | Alibaba 生成 `none/high` 的 `enableThinking`;Cohere 生成 disabled/enabled `thinking`;其他 npm package 得到空 mapping,由 `nonEmptyVariants()` 转成 `undefined` 并让 registry 回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1593] [E: packages/opencode/src/provider/transform.ts:1630] [E: packages/opencode/src/provider/transform.ts:1631] [E: packages/opencode/src/provider/transform.ts:1634] [E: packages/opencode/src/provider/transform.ts:1635] [E: packages/opencode/src/provider/transform.ts:1637] [E: packages/opencode/src/provider/transform.ts:1640] [E: packages/opencode/src/provider/transform.ts:1642] [E: packages/opencode/src/provider/transform.ts:1645] |
| `budget_tokens` | 生成 `high/max`;最大值同时被 catalog max、model output limit - 1 与 31999 限制,`high` 默认约为上限一半且不低于 min。之后 `reasoningBudget()` 按 provider 翻译 budget shape;若两个 budget 都无可用映射且同批也没有可用 toggle mapping,`nonEmptyVariants()` 才会返回 `undefined` 并回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1595] [E: packages/opencode/src/provider/transform.ts:1596] [E: packages/opencode/src/provider/transform.ts:1597] [E: packages/opencode/src/provider/transform.ts:1615] [E: packages/opencode/src/provider/transform.ts:1616] [E: packages/opencode/src/provider/transform.ts:1618] [E: packages/opencode/src/provider/transform.ts:1621] [E: packages/opencode/src/provider/transform.ts:1622] [E: packages/opencode/src/provider/transform.ts:1624] [E: packages/opencode/src/provider/transform.ts:1630] [E: packages/opencode/src/provider/transform.ts:1631] [E: packages/opencode/src/provider/transform.ts:1718] |

`reasoning_options` 字段缺失返回 `undefined`,让 registry 使用 heuristic;不支持的 toggle/budget mapping 也可以经 `nonEmptyVariants()` 返回 `undefined`。显式空数组则返回 `{}` 并抑制 heuristic。[E: packages/opencode/src/provider/transform.ts:1584] [E: packages/opencode/src/provider/transform.ts:1585] [E: packages/opencode/src/provider/transform.ts:1586] [E: packages/opencode/src/provider/transform.ts:1593] [E: packages/opencode/src/provider/transform.ts:1595] [E: packages/opencode/src/provider/transform.ts:1630] [E: packages/opencode/src/provider/transform.ts:1631]

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

Before switching on `model.api.npm`, the function special-cases GLM 5.2 and then suppresses variants for deepseek-chat, deepseek-reasoner, deepseek-r1, deepseek-v3, minimax, other glm IDs, kimi, k2p, qwen, and big-pickle IDs。[E: packages/opencode/src/provider/transform.ts:677] [E: packages/opencode/src/provider/transform.ts:691] [E: packages/opencode/src/provider/transform.ts:710] [E: packages/opencode/src/provider/transform.ts:722] Grok 3 mini has low/high variants, with OpenRouter using `{ reasoning: { effort } }` and non-OpenRouter using `{ reasoningEffort }`;其他 Grok 模型不再被提前排除,会继续落入 npm provider branch。[E: packages/opencode/src/provider/transform.ts:725] [E: packages/opencode/src/provider/transform.ts:726] [E: packages/opencode/src/provider/transform.ts:732] [E: packages/opencode/src/provider/transform.ts:738]

## Provider/NPM Variant Table

| Branch | Variants emitted |
| --- | --- |
| `@openrouter/ai-sdk-provider` | If api ID starts `openai/` or model ID contains `gpt`, uses `openaiCompatibleReasoningEfforts` and emits `{ reasoning: { effort } }`; otherwise emits low/medium/high in the same OpenRouter shape。[E: packages/opencode/src/provider/transform.ts:739] [E: packages/opencode/src/provider/transform.ts:741] [E: packages/opencode/src/provider/transform.ts:744] |
| `ai-gateway-provider` | For upstream `openai/`, uses release-date-aware `openaiReasoningEfforts` and emits `{ reasoningEffort }`; otherwise emits low/medium/high `{ reasoningEffort }` because Cloudflare compatible endpoint is OAI-shaped。[E: packages/opencode/src/provider/transform.ts:747] [E: packages/opencode/src/provider/transform.ts:755] [E: packages/opencode/src/provider/transform.ts:758] |
| `@ai-sdk/gateway` with Anthropic model | 分类看 `model.api.id`。Adaptive Anthropic efforts emit `{ thinking: { type:"adaptive", display? }, effort }`;older non-adaptive Anthropic emits `high/max` thinking budgets 16000/31999。[E: packages/opencode/src/provider/transform.ts:761] [E: packages/opencode/src/provider/transform.ts:762] [E: packages/opencode/src/provider/transform.ts:763] [E: packages/opencode/src/provider/transform.ts:780] |
| `@ai-sdk/gateway` with Google model | 分类与 2.5 判定都看 `model.api.id`;Gemini 2.5 emits `high/max` thinking budgets,other Google emits `low/high` with `includeThoughts` and `thinkingLevel`。[E: packages/opencode/src/provider/transform.ts:795] [E: packages/opencode/src/provider/transform.ts:796] [E: packages/opencode/src/provider/transform.ts:807] [E: packages/opencode/src/provider/transform.ts:812] |
| `@ai-sdk/gateway` other | Uses `openaiCompatibleReasoningEfforts` and emits `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:822] [E: packages/opencode/src/provider/transform.ts:823] |
| `@ai-sdk/github-copilot` | Gemini models get no variants; Claude models get low/medium/high `{ reasoningEffort }`; GPT models get low/medium/high plus conditional xhigh and include encrypted reasoning/summary auto。[E: packages/opencode/src/provider/transform.ts:826] [E: packages/opencode/src/provider/transform.ts:831] [E: packages/opencode/src/provider/transform.ts:841] |
| `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/xai`, `@ai-sdk/deepinfra`, `venice-ai-sdk-provider`, `@ai-sdk/openai-compatible` | North mini code emits `none/high`; deepseek-v4 adds `max`; otherwise low/medium/high `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:852] [E: packages/opencode/src/provider/transform.ts:854] [E: packages/opencode/src/provider/transform.ts:858] [E: packages/opencode/src/provider/transform.ts:863] [E: packages/opencode/src/provider/transform.ts:867] [E: packages/opencode/src/provider/transform.ts:870] |
| `@ai-sdk/azure` | `o1-mini` emits no variants; otherwise `openaiReasoningEfforts` with `{ reasoningEffort, reasoningSummary:"auto", include:["reasoning.encrypted_content"] }`。[E: packages/opencode/src/provider/transform.ts:872] [E: packages/opencode/src/provider/transform.ts:874] [E: packages/opencode/src/provider/transform.ts:876] |
| `@ai-sdk/amazon-bedrock/mantle`, `@ai-sdk/openai` | Meta provider 固定暴露全部 `OPENAI_EFFORTS`;其他 provider 走 release/model-aware `openaiReasoningEfforts`。两者都带 reasoning summary auto 和 encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:885] [E: packages/opencode/src/provider/transform.ts:886] [E: packages/opencode/src/provider/transform.ts:887] [E: packages/opencode/src/provider/transform.ts:889] [E: packages/opencode/src/provider/transform.ts:893] [E: packages/opencode/src/provider/transform.ts:894] [E: packages/opencode/src/provider/transform.ts:900] |
| `@ai-sdk/anthropic`, `@ai-sdk/google-vertex/anthropic` | Adaptive efforts emit `{ thinking:{ type:"adaptive", display? }, effort }`; GitHub Copilot provider filters max/xhigh and opus-4.7 to medium; opus-4.5 emits low/medium/high `{ effort }`; older models emit high/max thinking budgets derived from output limit。[E: packages/opencode/src/provider/transform.ts:913] [E: packages/opencode/src/provider/transform.ts:917] [E: packages/opencode/src/provider/transform.ts:940] [E: packages/opencode/src/provider/transform.ts:944] |
| `@ai-sdk/amazon-bedrock` | Adaptive efforts emit `reasoningConfig { type:"adaptive", maxReasoningEffort, display? }`; Anthropic-on-Bedrock emits high/max budgetTokens; Amazon Nova emits low/medium/high maxReasoningEffort。[E: packages/opencode/src/provider/transform.ts:959] [E: packages/opencode/src/provider/transform.ts:961] [E: packages/opencode/src/provider/transform.ts:976] [E: packages/opencode/src/provider/transform.ts:994] |
| `@ai-sdk/google-vertex`, `@ai-sdk/google` | Delegates to `googleThinkingVariants(model)`。[E: packages/opencode/src/provider/transform.ts:1006] [E: packages/opencode/src/provider/transform.ts:1010] |
| `@ai-sdk/mistral` | Only model IDs containing Mistral Small 4 or Medium 3.5 identifiers emit `high: { reasoningEffort:"high" }`; other Mistral reasoning-capable models still emit none under this branch。[E: packages/opencode/src/provider/transform.ts:1012] [E: packages/opencode/src/provider/transform.ts:1017] [E: packages/opencode/src/provider/transform.ts:1024] |
| `@ai-sdk/cohere`, `@ai-sdk/perplexity` | Always `{}`。[E: packages/opencode/src/provider/transform.ts:1029] [E: packages/opencode/src/provider/transform.ts:1045] |
| `@ai-sdk/groq` | Emits `none/low/medium/high` `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:1033] [E: packages/opencode/src/provider/transform.ts:1035] |
| `@jerome-benoit/sap-ai-provider-v2` | Wraps variants inside `modelParams`; Anthropic adaptive uses `thinking` plus `output_config.effort`, Anthropic old uses `budget_tokens`, Gemini 2.5 uses Google variants, GPT/o-series use `reasoning_effort`, fallback low/medium/high `reasoning_effort`。[E: packages/opencode/src/provider/transform.ts:1049] [E: packages/opencode/src/provider/transform.ts:1054] [E: packages/opencode/src/provider/transform.ts:1067] [E: packages/opencode/src/provider/transform.ts:1072] [E: packages/opencode/src/provider/transform.ts:1076] [E: packages/opencode/src/provider/transform.ts:1079] |

## Google Thinking Variants

`googleThinkingVariants` emits Gemini 2.5 `high/max` budget variants and otherwise maps `googleThinkingLevelEfforts(id)` into `{ thinkingConfig: { includeThoughts: true, thinkingLevel } }`。[E: packages/opencode/src/provider/transform.ts:655] [E: packages/opencode/src/provider/transform.ts:657] [E: packages/opencode/src/provider/transform.ts:665] Gemini 3 flash-image emits `minimal/high`, pro-image emits `high`, flash emits `minimal/low/medium/high`, other Gemini 3 emits `low/medium/high`, and non-Gemini-3 emits `low/high`。[E: packages/opencode/src/provider/transform.ts:636] [E: packages/opencode/src/provider/transform.ts:638] [E: packages/opencode/src/provider/transform.ts:640] Gemini 2.5 pro non-flash max budget is 32768; otherwise max budget is 24576。[E: packages/opencode/src/provider/transform.ts:643] [E: packages/opencode/src/provider/transform.ts:646]

## Default Options Related To Reasoning

`options(input)` sets `toolStreaming=false` for Google Vertex Anthropic or non-Claude Anthropic npm models。[E: packages/opencode/src/provider/transform.ts:1093] [E: packages/opencode/src/provider/transform.ts:1097] OpenAI, `@ai-sdk/openai`, GitHub Copilot, Bedrock Mantle, and xAI set `store=false`; Azure also sets `promptCacheKey=sessionID`。[E: packages/opencode/src/provider/transform.ts:1101] [E: packages/opencode/src/provider/transform.ts:1106] [E: packages/opencode/src/provider/transform.ts:1111] [E: packages/opencode/src/provider/transform.ts:1113] OpenRouter/llmgateway request usage include true and force Gemini 3 reasoning high。[E: packages/opencode/src/provider/transform.ts:1116] [E: packages/opencode/src/provider/transform.ts:1121]

Google/Vertex reasoning-capable models get `thinkingConfig.includeThoughts=true`, and Gemini 3 adds `thinkingLevel:"high"`。[E: packages/opencode/src/provider/transform.ts:1158] [E: packages/opencode/src/provider/transform.ts:1160] [E: packages/opencode/src/provider/transform.ts:1164] GPT-5 non-chat defaults `reasoningEffort:"medium"`, selected OpenAI/Azure/Copilot/Mantle models get `reasoningSummary:"auto"`, OpenAI/Mantle get encrypted reasoning include, non-chat non-codex gpt-5.x non-Azure gets `textVerbosity:"low"`。[E: packages/opencode/src/provider/transform.ts:1206] [E: packages/opencode/src/provider/transform.ts:1208] [E: packages/opencode/src/provider/transform.ts:1215] [E: packages/opencode/src/provider/transform.ts:1218] [E: packages/opencode/src/provider/transform.ts:1230]

`smallOptions(model)` merges the first variant into `{ store:false }` for OpenAI/openai npm/GitHub Copilot/xAI,disables Google reasoning for empty OpenRouter/llmgateway small variants,and disables Venice thinking when no small variant exists。[E: packages/opencode/src/provider/transform.ts:1256] [E: packages/opencode/src/provider/transform.ts:1262] [E: packages/opencode/src/provider/transform.ts:1264] [E: packages/opencode/src/provider/transform.ts:1265] [E: packages/opencode/src/provider/transform.ts:1267] [E: packages/opencode/src/provider/transform.ts:1268] [E: packages/opencode/src/provider/transform.ts:1269] [E: packages/opencode/src/provider/transform.ts:1273] [E: packages/opencode/src/provider/transform.ts:1275]

## Sources

- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts

## Related

- model-layer.provider-transforms
