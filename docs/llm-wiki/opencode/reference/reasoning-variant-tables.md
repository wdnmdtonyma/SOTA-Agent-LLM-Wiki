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
  - packages/opencode/test/provider/transform.test.ts
status: verified
updated: 89130db6b0
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

本节点只描述 V1 `packages/opencode/src/provider/transform.ts` 的 reasoning variants。Provider registry 从 models.dev 构建 model 时先调用 `ProviderTransform.reasoningVariants(model, base)`;只有它返回 `undefined` 时才回退 `ProviderTransform.variants(base)`。[E: packages/opencode/src/provider/provider.ts:1257] [E: packages/opencode/src/provider/provider.ts:1261] config model variants 会 merge 并可通过 `disabled` 删除具体 variant。[E: packages/opencode/src/provider/provider.ts:1508] [E: packages/opencode/src/provider/provider.ts:1512] [E: packages/opencode/src/provider/provider.ts:1514] [E: packages/opencode/src/provider/provider.ts:1515]

## Models.dev Reasoning Options

`reasoning_options` 是 optional array:可声明 `effort` 与可用 string/null values、`toggle`,或带 optional min/max 的 `budget_tokens`。[E: packages/core/src/models-dev.ts:52] [E: packages/core/src/models-dev.ts:54] [E: packages/core/src/models-dev.ts:55] [E: packages/core/src/models-dev.ts:58] [E: packages/core/src/models-dev.ts:61] [E: packages/core/src/models-dev.ts:62] [E: packages/core/src/models-dev.ts:63] [E: packages/core/src/models-dev.ts:76]

| Catalog option | Variant 翻译 |
| --- | --- |
| `effort` | 每个 string 值成为同名 variant;`null` 成为 `none`。`reasoningEffort()` 再按 npm package 输出 `reasoning.effort`、`thinkingConfig`、`reasoningConfig`、`reasoningEffort` 或 provider 特有 shape;不支持的组合被丢弃。[E: packages/opencode/src/provider/transform.ts:1660] [E: packages/opencode/src/provider/transform.ts:1664] [E: packages/opencode/src/provider/transform.ts:1668] [E: packages/opencode/src/provider/transform.ts:1669] [E: packages/opencode/src/provider/transform.ts:1707] |
| `toggle` | Alibaba 生成 `none/high` 的 `enableThinking`;Cohere 生成 disabled/enabled `thinking`;其他 npm package 得到空 mapping,由 `nonEmptyVariants()` 转成 `undefined` 并让 registry 回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1652] [E: packages/opencode/src/provider/transform.ts:1689] [E: packages/opencode/src/provider/transform.ts:1690] [E: packages/opencode/src/provider/transform.ts:1693] [E: packages/opencode/src/provider/transform.ts:1694] [E: packages/opencode/src/provider/transform.ts:1696] [E: packages/opencode/src/provider/transform.ts:1699] [E: packages/opencode/src/provider/transform.ts:1701] [E: packages/opencode/src/provider/transform.ts:1704] |
| `budget_tokens` | 生成 `high/max`;最大值同时被 catalog max、model output limit - 1 与 31999 限制,`high` 默认约为上限一半且不低于 min。之后 `reasoningBudget()` 按 provider 翻译 budget shape;若两个 budget 都无可用映射且同批也没有可用 toggle mapping,`nonEmptyVariants()` 才会返回 `undefined` 并回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1654] [E: packages/opencode/src/provider/transform.ts:1655] [E: packages/opencode/src/provider/transform.ts:1656] [E: packages/opencode/src/provider/transform.ts:1674] [E: packages/opencode/src/provider/transform.ts:1675] [E: packages/opencode/src/provider/transform.ts:1677] [E: packages/opencode/src/provider/transform.ts:1680] [E: packages/opencode/src/provider/transform.ts:1681] [E: packages/opencode/src/provider/transform.ts:1683] [E: packages/opencode/src/provider/transform.ts:1689] [E: packages/opencode/src/provider/transform.ts:1690] [E: packages/opencode/src/provider/transform.ts:1797] |

`reasoning_options` 字段缺失返回 `undefined`,让 registry 使用 heuristic;不支持的 toggle/budget mapping 也可以经 `nonEmptyVariants()` 返回 `undefined`。显式空数组则返回 `{}` 并抑制 heuristic。[E: packages/opencode/src/provider/transform.ts:1643] [E: packages/opencode/src/provider/transform.ts:1644] [E: packages/opencode/src/provider/transform.ts:1645] [E: packages/opencode/src/provider/transform.ts:1652] [E: packages/opencode/src/provider/transform.ts:1654] [E: packages/opencode/src/provider/transform.ts:1689] [E: packages/opencode/src/provider/transform.ts:1690]

## Base Effort Sets

| Symbol | Values | 语义 |
| --- | --- | --- |
| `WIDELY_SUPPORTED_EFFORTS` | `low`, `medium`, `high` | 多数 provider 分支的基础 effort set。[E: packages/opencode/src/provider/transform.ts:568] |
| `OPENAI_EFFORTS` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` | OpenAI-compatible fallback effort set。[E: packages/opencode/src/provider/transform.ts:569] |
| `OPENAI_GPT5_1_EFFORTS` | `none`, `low`, `medium`, `high` | versioned gpt-5.1 effort set。[E: packages/opencode/src/provider/transform.ts:570] |
| `OPENAI_GPT5_2_PLUS_EFFORTS` | gpt-5.1 set plus `xhigh` | versioned gpt-5.2+ effort set。[E: packages/opencode/src/provider/transform.ts:571] |
| `OPENAI_GPT5_PRO_EFFORTS` | `high` | unversioned/pro GPT-5 pro default。[E: packages/opencode/src/provider/transform.ts:572] |
| `OPENAI_GPT5_PRO_2_PLUS_EFFORTS` | `medium`, `high`, `xhigh` | versioned GPT-5 pro 2+ effort set。[E: packages/opencode/src/provider/transform.ts:573] |
| `OPENAI_GPT5_CHAT_EFFORTS` | `medium` | versioned gpt-5 chat effort set。[E: packages/opencode/src/provider/transform.ts:574] |
| `OPENAI_GPT5_CODEX_XHIGH_EFFORTS` | `low`, `medium`, `high`, `xhigh` | Codex max/version 2+ effort set。[E: packages/opencode/src/provider/transform.ts:575] |
| `OPENAI_GPT5_CODEX_3_PLUS_EFFORTS` | `none`, `low`, `medium`, `high`, `xhigh` | Codex version 3+ effort set。[E: packages/opencode/src/provider/transform.ts:576] |

For the generic release-date fallback inside `openaiReasoningEfforts`, OpenAI `none` effort is added when release date is at least `2025-11-13`, and `xhigh` is added when release date is at least `2025-12-04`; family-specific helpers such as versioned GPT-5 and Codex run before that fallback and may expose `none` or `xhigh` independently。[E: packages/opencode/src/provider/transform.ts:581] [E: packages/opencode/src/provider/transform.ts:584] [E: packages/opencode/src/provider/transform.ts:628] [E: packages/opencode/src/provider/transform.ts:636] [E: packages/opencode/src/provider/transform.ts:637]

## OpenAI Family Helpers

| Helper | Match | Result |
| --- | --- | --- |
| `GPT5_FAMILY_RE` | gpt-5 family anchored at string start or `/`。[E: packages/opencode/src/provider/transform.ts:589] | Regex avoids matching non-family strings such as `gpt-50` or `gpt-5o` by requiring `gpt-5` followed by `.`, `-`, `/`, start, or end。[E: packages/opencode/src/provider/transform.ts:589] |
| `versionedGpt5ReasoningEfforts` | versioned GPT-5 model IDs; versioned pro first。[E: packages/opencode/src/provider/transform.ts:598] [E: packages/opencode/src/provider/transform.ts:599] | pro 2+ gets pro 2+ set; version 1 gets gpt-5.1 set; version >=2 gets gpt-5.2+ set。 |
| `gpt5CodexReasoningEfforts` | gpt-5 family plus `codex`。[E: packages/opencode/src/provider/transform.ts:606] [E: packages/opencode/src/provider/transform.ts:607] | version >=3 gets none+xhigh set; codex-max/version >=2 gets xhigh set; older codex gets low/medium/high。 |
| `gpt5ChatReasoningEfforts` | gpt-5 family plus `-chat`。[E: packages/opencode/src/provider/transform.ts:614] [E: packages/opencode/src/provider/transform.ts:615] | unversioned chat returns empty variants; versioned chat returns `medium`。 |
| `openaiReasoningEfforts` | OpenAI native release-date-aware helper。[E: packages/opencode/src/provider/transform.ts:622] [E: packages/opencode/src/provider/transform.ts:636] | deep-research fixed medium; chat/pro/codex/versioned rules precede release-date additions。 |
| `openaiCompatibleReasoningEfforts` | OpenAI-compatible ID helper。[E: packages/opencode/src/provider/transform.ts:641] [E: packages/opencode/src/provider/transform.ts:646] | chat/pro/codex/versioned rules, else full `OPENAI_EFFORTS`。 |

## Pre-Switch Exclusions And Special Cases

`variants(model)` immediately returns `{}` if `model.capabilities.reasoning` is false。[E: packages/opencode/src/provider/transform.ts:721] [E: packages/opencode/src/provider/transform.ts:722] MiniMax M3 在 Anthropic/OpenAI-compatible API 下生成两档 variants：精确 provider ID `nvidia`/`lilac` 使用 `chat_template_kwargs.thinking_mode=disabled|enabled`，其余 provider 使用 disabled/adaptive thinking shape。[E: packages/opencode/src/provider/transform.ts:728] [E: packages/opencode/src/provider/transform.ts:732] [E: packages/opencode/src/provider/transform.ts:738]

Before switching on `model.api.npm`, the function special-cases GLM 5.2。`isKimiFamily()` 可由 provider/API ID 中的 `kimi`/`moonshot` 或已知 Kimi/Moonshot base URL 命中；该 family 若走 Anthropic/Vertex-Anthropic 会先生成 low/medium/high/xhigh/max adaptive+summarized variants。随后的 suppress 条件却只检查 model ID 是否含 `kimi`，所以仅由 `moonshot`/URL 识别且 model ID 不含 `kimi` 的非 Anthropic path 仍会继续进入 npm-specific switch。[E: packages/opencode/src/provider/transform.ts:29] [E: packages/opencode/src/provider/transform.ts:31] [E: packages/opencode/src/provider/transform.ts:37] [E: packages/opencode/src/provider/transform.ts:38] [E: packages/opencode/src/provider/transform.ts:765] [E: packages/opencode/src/provider/transform.ts:780] DeepSeek、MiniMax、other GLM、K2P、Qwen、big-pickle 等匹配仍会在此提前返回空 variants。[E: packages/opencode/src/provider/transform.ts:773] [E: packages/opencode/src/provider/transform.ts:785] Grok 3 mini has low/high variants, with OpenRouter using `{ reasoning: { effort } }` and non-OpenRouter using `{ reasoningEffort }`;其他 Grok 模型不再被提前排除,会继续落入 npm provider branch。[E: packages/opencode/src/provider/transform.ts:788] [E: packages/opencode/src/provider/transform.ts:789] [E: packages/opencode/src/provider/transform.ts:795] [E: packages/opencode/src/provider/transform.ts:801]

Claude adaptive 的版本判断只读 API ID：4.7+、major >4，以及无法解析版本但含 `claude-` 的 future alias 都返回五档 adaptive variants 并显式请求 summarized display；4.6 仍是四档、不显式请求 display，dated Claude 4 ID 不会把发布日期误当 minor version。[E: packages/opencode/src/provider/transform.ts:649] [E: packages/opencode/src/provider/transform.ts:653] [E: packages/opencode/src/provider/transform.ts:654] [E: packages/opencode/src/provider/transform.ts:657] [E: packages/opencode/src/provider/transform.ts:664] [E: packages/opencode/src/provider/transform.ts:678] [E: packages/opencode/test/provider/transform.test.ts:4718] [E: packages/opencode/test/provider/transform.test.ts:4769]

## Provider/NPM Variant Table

| Branch | Variants emitted |
| --- | --- |
| `@openrouter/ai-sdk-provider` | If api ID starts `openai/` or model ID contains `gpt`, uses `openaiCompatibleReasoningEfforts` and emits `{ reasoning: { effort } }`; otherwise emits low/medium/high in the same OpenRouter shape。[E: packages/opencode/src/provider/transform.ts:802] [E: packages/opencode/src/provider/transform.ts:804] [E: packages/opencode/src/provider/transform.ts:807] |
| `ai-gateway-provider` | For upstream `openai/`, uses release-date-aware `openaiReasoningEfforts` and emits `{ reasoningEffort }`; otherwise emits low/medium/high `{ reasoningEffort }` because Cloudflare compatible endpoint is OAI-shaped。[E: packages/opencode/src/provider/transform.ts:810] [E: packages/opencode/src/provider/transform.ts:818] [E: packages/opencode/src/provider/transform.ts:821] |
| `@ai-sdk/gateway` with Anthropic model | 分类看 `model.api.id`。Adaptive Anthropic efforts emit `{ thinking: { type:"adaptive", display? }, effort }`;older non-adaptive Anthropic emits `high/max` thinking budgets 16000/31999。[E: packages/opencode/src/provider/transform.ts:824] [E: packages/opencode/src/provider/transform.ts:825] [E: packages/opencode/src/provider/transform.ts:826] [E: packages/opencode/src/provider/transform.ts:843] |
| `@ai-sdk/gateway` with Google model | 分类与 2.5 判定都看 `model.api.id`;Gemini 2.5 emits `high/max` thinking budgets,other Google emits `low/high` with `includeThoughts` and `thinkingLevel`。[E: packages/opencode/src/provider/transform.ts:858] [E: packages/opencode/src/provider/transform.ts:859] [E: packages/opencode/src/provider/transform.ts:870] [E: packages/opencode/src/provider/transform.ts:875] |
| `@ai-sdk/gateway` other | Uses `openaiCompatibleReasoningEfforts` and emits `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:885] [E: packages/opencode/src/provider/transform.ts:886] |
| `@ai-sdk/github-copilot` | Gemini models get no variants; Claude models get low/medium/high `{ reasoningEffort }`; GPT models get low/medium/high plus conditional xhigh and include encrypted reasoning/summary auto。[E: packages/opencode/src/provider/transform.ts:889] [E: packages/opencode/src/provider/transform.ts:894] [E: packages/opencode/src/provider/transform.ts:904] |
| `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/xai`, `@ai-sdk/deepinfra`, `venice-ai-sdk-provider`, `@ai-sdk/openai-compatible` | North mini code emits `none/high`; deepseek-v4 adds `max`; otherwise low/medium/high `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:915] [E: packages/opencode/src/provider/transform.ts:917] [E: packages/opencode/src/provider/transform.ts:921] [E: packages/opencode/src/provider/transform.ts:926] [E: packages/opencode/src/provider/transform.ts:930] [E: packages/opencode/src/provider/transform.ts:933] |
| `@ai-sdk/azure` | `o1-mini` emits no variants; otherwise `openaiReasoningEfforts` with `{ reasoningEffort, reasoningSummary:"auto", include:["reasoning.encrypted_content"] }`。[E: packages/opencode/src/provider/transform.ts:935] [E: packages/opencode/src/provider/transform.ts:937] [E: packages/opencode/src/provider/transform.ts:939] |
| `@ai-sdk/amazon-bedrock/mantle`, `@ai-sdk/openai` | Meta provider 固定暴露全部 `OPENAI_EFFORTS`;其他 provider 走 release/model-aware `openaiReasoningEfforts`。两者都带 reasoning summary auto 和 encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:948] [E: packages/opencode/src/provider/transform.ts:949] [E: packages/opencode/src/provider/transform.ts:950] [E: packages/opencode/src/provider/transform.ts:952] [E: packages/opencode/src/provider/transform.ts:956] [E: packages/opencode/src/provider/transform.ts:957] [E: packages/opencode/src/provider/transform.ts:963] |
| `@ai-sdk/anthropic`, `@ai-sdk/google-vertex/anthropic` | Adaptive efforts emit `{ thinking:{ type:"adaptive", display? }, effort }`; GitHub Copilot provider filters max/xhigh and opus-4.7 to medium。只匹配字面 `opus-4-5`/`opus-4.5` 的 4.5 helper 会生成 low/medium/high，每档同时带 enabled thinking budget 与 effort；older models emit high/max thinking budgets derived from output limit。[E: packages/opencode/src/provider/transform.ts:976] [E: packages/opencode/src/provider/transform.ts:980] [E: packages/opencode/src/provider/transform.ts:1003] [E: packages/opencode/src/provider/transform.ts:1009] [E: packages/opencode/src/provider/transform.ts:1787] |
| `@ai-sdk/amazon-bedrock` | Adaptive efforts emit `reasoningConfig { type:"adaptive", maxReasoningEffort, display? }`; Anthropic-on-Bedrock emits high/max budgetTokens; Amazon Nova emits low/medium/high maxReasoningEffort。[E: packages/opencode/src/provider/transform.ts:1024] [E: packages/opencode/src/provider/transform.ts:1026] [E: packages/opencode/src/provider/transform.ts:1041] [E: packages/opencode/src/provider/transform.ts:1059] |
| `@ai-sdk/google-vertex`, `@ai-sdk/google` | Delegates to `googleThinkingVariants(model)`。[E: packages/opencode/src/provider/transform.ts:1071] [E: packages/opencode/src/provider/transform.ts:1075] |
| `@ai-sdk/mistral` | Only model IDs containing Mistral Small 4 or Medium 3.5 identifiers emit `high: { reasoningEffort:"high" }`; other Mistral reasoning-capable models still emit none under this branch。[E: packages/opencode/src/provider/transform.ts:1077] [E: packages/opencode/src/provider/transform.ts:1082] [E: packages/opencode/src/provider/transform.ts:1089] |
| `@ai-sdk/cohere`, `@ai-sdk/perplexity` | Always `{}`。[E: packages/opencode/src/provider/transform.ts:1094] [E: packages/opencode/src/provider/transform.ts:1110] |
| `@ai-sdk/groq` | Emits `none/low/medium/high` `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:1098] [E: packages/opencode/src/provider/transform.ts:1100] |
| `@jerome-benoit/sap-ai-provider-v2` | Wraps variants inside `modelParams`; Anthropic adaptive uses `thinking` plus `output_config.effort`, Anthropic old uses `budget_tokens`, Gemini 2.5 uses Google variants, GPT/o-series use `reasoning_effort`, fallback low/medium/high `reasoning_effort`。[E: packages/opencode/src/provider/transform.ts:1114] [E: packages/opencode/src/provider/transform.ts:1119] [E: packages/opencode/src/provider/transform.ts:1132] [E: packages/opencode/src/provider/transform.ts:1137] [E: packages/opencode/src/provider/transform.ts:1141] [E: packages/opencode/src/provider/transform.ts:1144] |

## Google Thinking Variants

`googleThinkingVariants` emits Gemini 2.5 `high/max` budget variants and otherwise maps `googleThinkingLevelEfforts(id)` into `{ thinkingConfig: { includeThoughts: true, thinkingLevel } }`。[E: packages/opencode/src/provider/transform.ts:703] [E: packages/opencode/src/provider/transform.ts:705] [E: packages/opencode/src/provider/transform.ts:713] Gemini 3 flash-image emits `minimal/high`, pro-image emits `high`, flash emits `minimal/low/medium/high`, other Gemini 3 emits `low/medium/high`, and non-Gemini-3 emits `low/high`。[E: packages/opencode/src/provider/transform.ts:684] [E: packages/opencode/src/provider/transform.ts:686] [E: packages/opencode/src/provider/transform.ts:688] Gemini 2.5 pro non-flash max budget is 32768; otherwise max budget is 24576。[E: packages/opencode/src/provider/transform.ts:691] [E: packages/opencode/src/provider/transform.ts:694]

## Default Options Related To Reasoning

`options(input)` sets `toolStreaming=false` for Google Vertex Anthropic or non-Claude Anthropic npm models。[E: packages/opencode/src/provider/transform.ts:1158] [E: packages/opencode/src/provider/transform.ts:1162] OpenAI, `@ai-sdk/openai`, GitHub Copilot, Bedrock Mantle, and xAI set `store=false`; Azure also sets store false。[E: packages/opencode/src/provider/transform.ts:1166] [E: packages/opencode/src/provider/transform.ts:1171] [E: packages/opencode/src/provider/transform.ts:1176] DeepInfra/Cerebras use `prompt_cache_key`; OpenAI/Azure/xAI/Mistral/Venice use `promptCacheKey`, and all cache-key defaults honor `setCacheKey:false`。[E: packages/opencode/src/provider/transform.ts:1254] [E: packages/opencode/src/provider/transform.ts:1255] [E: packages/opencode/src/provider/transform.ts:1258] [E: packages/opencode/src/provider/transform.ts:1265] OpenRouter/llmgateway request usage include true and force Gemini 3 reasoning high。[E: packages/opencode/src/provider/transform.ts:1180] [E: packages/opencode/src/provider/transform.ts:1185]

Google/Vertex reasoning-capable models get `thinkingConfig.includeThoughts=true`, and Gemini 3 adds `thinkingLevel:"high"`。[E: packages/opencode/src/provider/transform.ts:1211] [E: packages/opencode/src/provider/transform.ts:1213] [E: packages/opencode/src/provider/transform.ts:1217] Kimi heuristic on Anthropic transports defaults to adaptive summarized thinking at high effort。[E: packages/opencode/src/provider/transform.ts:1231] [E: packages/opencode/src/provider/transform.ts:1236] GPT-5 non-chat defaults `reasoningEffort:"medium"`, selected OpenAI/Azure/Copilot/Mantle models get `reasoningSummary:"auto"`, OpenAI/Mantle get encrypted reasoning include, non-chat non-codex gpt-5.x non-Azure gets `textVerbosity:"low"`。[E: packages/opencode/src/provider/transform.ts:1278] [E: packages/opencode/src/provider/transform.ts:1280] [E: packages/opencode/src/provider/transform.ts:1287] [E: packages/opencode/src/provider/transform.ts:1290] [E: packages/opencode/src/provider/transform.ts:1302]

`smallOptions(model)` merges the first variant into `{ store:false }` for OpenAI/openai npm/GitHub Copilot/xAI,disables Google reasoning for empty OpenRouter/llmgateway small variants,and disables Venice thinking when no small variant exists。[E: packages/opencode/src/provider/transform.ts:1315] [E: packages/opencode/src/provider/transform.ts:1321] [E: packages/opencode/src/provider/transform.ts:1323] [E: packages/opencode/src/provider/transform.ts:1324] [E: packages/opencode/src/provider/transform.ts:1326] [E: packages/opencode/src/provider/transform.ts:1327] [E: packages/opencode/src/provider/transform.ts:1328] [E: packages/opencode/src/provider/transform.ts:1332] [E: packages/opencode/src/provider/transform.ts:1334]

## Sources

- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts
- packages/opencode/test/provider/transform.test.ts

## Related

- model-layer.provider-transforms
