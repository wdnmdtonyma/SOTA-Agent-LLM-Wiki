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
updated: 3fd77ae980
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
| `effort` | 每个 string 值成为同名 variant;`null` 成为 `none`。`reasoningEffort()` 再按 npm package 输出 `reasoning.effort`、`thinkingConfig`、`reasoningConfig`、`reasoningEffort` 或 provider 特有 shape;不支持的组合被丢弃。`@ai-sdk/xai`、`@ai-sdk/mistral`、`@ai-sdk/groq`、`ai-gateway-provider` 与 `merge-gateway-ai-sdk-provider` 都属于 `{ reasoningEffort: effort }` pass-through 组。[E: packages/opencode/src/provider/transform.ts:1674] [E: packages/opencode/src/provider/transform.ts:1678] [E: packages/opencode/src/provider/transform.ts:1682] [E: packages/opencode/src/provider/transform.ts:1683] [E: packages/opencode/src/provider/transform.ts:1721] [E: packages/opencode/src/provider/transform.ts:1769] [E: packages/opencode/src/provider/transform.ts:1770] [E: packages/opencode/src/provider/transform.ts:1771] [E: packages/opencode/src/provider/transform.ts:1776] [E: packages/opencode/src/provider/transform.ts:1777] [E: packages/opencode/src/provider/transform.ts:1778] |
| `toggle` | Alibaba 生成 `none/high` 的 `enableThinking`;Cohere 生成 disabled/enabled `thinking`;其他 npm package 得到空 mapping,由 `nonEmptyVariants()` 转成 `undefined` 并让 registry 回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1666] [E: packages/opencode/src/provider/transform.ts:1703] [E: packages/opencode/src/provider/transform.ts:1704] [E: packages/opencode/src/provider/transform.ts:1707] [E: packages/opencode/src/provider/transform.ts:1708] [E: packages/opencode/src/provider/transform.ts:1710] [E: packages/opencode/src/provider/transform.ts:1713] [E: packages/opencode/src/provider/transform.ts:1715] [E: packages/opencode/src/provider/transform.ts:1718] |
| `budget_tokens` | 生成 `high/max`;最大值同时被 catalog max、model output limit - 1 与 31999 限制,`high` 默认约为上限一半且不低于 min。之后 `reasoningBudget()` 按 provider 翻译 budget shape;若两个 budget 都无可用映射且同批也没有可用 toggle mapping,`nonEmptyVariants()` 才会返回 `undefined` 并回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1668] [E: packages/opencode/src/provider/transform.ts:1669] [E: packages/opencode/src/provider/transform.ts:1670] [E: packages/opencode/src/provider/transform.ts:1688] [E: packages/opencode/src/provider/transform.ts:1689] [E: packages/opencode/src/provider/transform.ts:1691] [E: packages/opencode/src/provider/transform.ts:1694] [E: packages/opencode/src/provider/transform.ts:1695] [E: packages/opencode/src/provider/transform.ts:1697] [E: packages/opencode/src/provider/transform.ts:1703] [E: packages/opencode/src/provider/transform.ts:1704] [E: packages/opencode/src/provider/transform.ts:1812] |

`reasoning_options` 字段缺失返回 `undefined`,让 registry 使用 heuristic;不支持的 toggle/budget mapping 也可以经 `nonEmptyVariants()` 返回 `undefined`。显式空数组则返回 `{}` 并抑制 heuristic。[E: packages/opencode/src/provider/transform.ts:1657] [E: packages/opencode/src/provider/transform.ts:1658] [E: packages/opencode/src/provider/transform.ts:1659] [E: packages/opencode/src/provider/transform.ts:1666] [E: packages/opencode/src/provider/transform.ts:1668] [E: packages/opencode/src/provider/transform.ts:1703] [E: packages/opencode/src/provider/transform.ts:1704]

## Base Effort Sets

| Symbol | Values | 语义 |
| --- | --- | --- |
| `WIDELY_SUPPORTED_EFFORTS` | `low`, `medium`, `high` | 多数 provider 分支的基础 effort set。[E: packages/opencode/src/provider/transform.ts:576] |
| `OPENAI_EFFORTS` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` | OpenAI-compatible fallback effort set。[E: packages/opencode/src/provider/transform.ts:577] |
| `OPENAI_GPT5_1_EFFORTS` | `none`, `low`, `medium`, `high` | versioned gpt-5.1 effort set。[E: packages/opencode/src/provider/transform.ts:578] |
| `OPENAI_GPT5_2_PLUS_EFFORTS` | gpt-5.1 set plus `xhigh` | versioned gpt-5.2+ effort set。[E: packages/opencode/src/provider/transform.ts:579] |
| `OPENAI_GPT5_PRO_EFFORTS` | `high` | unversioned/pro GPT-5 pro default。[E: packages/opencode/src/provider/transform.ts:580] |
| `OPENAI_GPT5_PRO_2_PLUS_EFFORTS` | `medium`, `high`, `xhigh` | versioned GPT-5 pro 2+ effort set。[E: packages/opencode/src/provider/transform.ts:581] |
| `OPENAI_GPT5_CHAT_EFFORTS` | `medium` | versioned gpt-5 chat effort set。[E: packages/opencode/src/provider/transform.ts:582] |
| `OPENAI_GPT5_CODEX_XHIGH_EFFORTS` | `low`, `medium`, `high`, `xhigh` | Codex max/version 2+ effort set。[E: packages/opencode/src/provider/transform.ts:583] |
| `OPENAI_GPT5_CODEX_3_PLUS_EFFORTS` | `none`, `low`, `medium`, `high`, `xhigh` | Codex version 3+ effort set。[E: packages/opencode/src/provider/transform.ts:584] |

For the generic release-date fallback inside `openaiReasoningEfforts`, OpenAI `none` effort is added when release date is at least `2025-11-13`, and `xhigh` is added when release date is at least `2025-12-04`; family-specific helpers such as versioned GPT-5 and Codex run before that fallback and may expose `none` or `xhigh` independently。[E: packages/opencode/src/provider/transform.ts:589] [E: packages/opencode/src/provider/transform.ts:592] [E: packages/opencode/src/provider/transform.ts:636] [E: packages/opencode/src/provider/transform.ts:644] [E: packages/opencode/src/provider/transform.ts:645]

## OpenAI Family Helpers

| Helper | Match | Result |
| --- | --- | --- |
| `GPT5_FAMILY_RE` | gpt-5 family anchored at string start or `/`。[E: packages/opencode/src/provider/transform.ts:597] | Regex avoids matching non-family strings such as `gpt-50` or `gpt-5o` by requiring `gpt-5` followed by `.`, `-`, `/`, start, or end。[E: packages/opencode/src/provider/transform.ts:597] |
| `versionedGpt5ReasoningEfforts` | versioned GPT-5 model IDs; versioned pro first。[E: packages/opencode/src/provider/transform.ts:606] [E: packages/opencode/src/provider/transform.ts:607] | pro 2+ gets pro 2+ set; version 1 gets gpt-5.1 set; version >=2 gets gpt-5.2+ set。 |
| `gpt5CodexReasoningEfforts` | gpt-5 family plus `codex`。[E: packages/opencode/src/provider/transform.ts:614] [E: packages/opencode/src/provider/transform.ts:615] | version >=3 gets none+xhigh set; codex-max/version >=2 gets xhigh set; older codex gets low/medium/high。 |
| `gpt5ChatReasoningEfforts` | gpt-5 family plus `-chat`。[E: packages/opencode/src/provider/transform.ts:622] [E: packages/opencode/src/provider/transform.ts:623] | unversioned chat returns empty variants; versioned chat returns `medium`。 |
| `openaiReasoningEfforts` | OpenAI native release-date-aware helper。[E: packages/opencode/src/provider/transform.ts:630] [E: packages/opencode/src/provider/transform.ts:644] | deep-research fixed medium; chat/pro/codex/versioned rules precede release-date additions。 |
| `openaiCompatibleReasoningEfforts` | OpenAI-compatible ID helper。[E: packages/opencode/src/provider/transform.ts:649] [E: packages/opencode/src/provider/transform.ts:654] | chat/pro/codex/versioned rules, else full `OPENAI_EFFORTS`。 |

## Pre-Switch Exclusions And Special Cases

`variants(model)` immediately returns `{}` if `model.capabilities.reasoning` is false。[E: packages/opencode/src/provider/transform.ts:729] [E: packages/opencode/src/provider/transform.ts:730] MiniMax M3 在 Anthropic/OpenAI-compatible API 下生成两档 variants：精确 provider ID `nvidia`/`lilac` 使用 `chat_template_kwargs.thinking_mode=disabled|enabled`，其余 provider 使用 disabled/adaptive thinking shape。[E: packages/opencode/src/provider/transform.ts:736] [E: packages/opencode/src/provider/transform.ts:740] [E: packages/opencode/src/provider/transform.ts:746]

Before switching on `model.api.npm`, the function special-cases GLM 5.2。`isKimiFamily()` 可由 provider/API ID 中的 `kimi`/`moonshot` 或已知 Kimi/Moonshot base URL 命中；该 family 若走 Anthropic/Vertex-Anthropic 会先生成 low/medium/high/xhigh/max adaptive+summarized variants。随后的 suppress 条件却只检查 model ID 是否含 `kimi`，所以仅由 `moonshot`/URL 识别且 model ID 不含 `kimi` 的非 Anthropic path 仍会继续进入 npm-specific switch。[E: packages/opencode/src/provider/transform.ts:29] [E: packages/opencode/src/provider/transform.ts:31] [E: packages/opencode/src/provider/transform.ts:37] [E: packages/opencode/src/provider/transform.ts:38] [E: packages/opencode/src/provider/transform.ts:773] [E: packages/opencode/src/provider/transform.ts:788] DeepSeek、MiniMax、other GLM、K2P、Qwen、big-pickle 等匹配仍会在此提前返回空 variants。[E: packages/opencode/src/provider/transform.ts:781] [E: packages/opencode/src/provider/transform.ts:793] Grok 3 mini has low/high variants, with OpenRouter using `{ reasoning: { effort } }` and non-OpenRouter using `{ reasoningEffort }`;其他 Grok 模型不再被提前排除,会继续落入 npm provider branch。[E: packages/opencode/src/provider/transform.ts:796] [E: packages/opencode/src/provider/transform.ts:797] [E: packages/opencode/src/provider/transform.ts:803] [E: packages/opencode/src/provider/transform.ts:809]

Claude adaptive 的版本判断只读 API ID：4.7+、major >4，以及无法解析版本但含 `claude-` 的 future alias 都返回五档 adaptive variants 并显式请求 summarized display；4.6 仍是四档、不显式请求 display，dated Claude 4 ID 不会把发布日期误当 minor version。[E: packages/opencode/src/provider/transform.ts:657] [E: packages/opencode/src/provider/transform.ts:661] [E: packages/opencode/src/provider/transform.ts:662] [E: packages/opencode/src/provider/transform.ts:665] [E: packages/opencode/src/provider/transform.ts:672] [E: packages/opencode/src/provider/transform.ts:686] [E: packages/opencode/test/provider/transform.test.ts:4770] [E: packages/opencode/test/provider/transform.test.ts:4821]

## Provider/NPM Variant Table

| Branch | Variants emitted |
| --- | --- |
| `@openrouter/ai-sdk-provider` | If api ID starts `openai/` or model ID contains `gpt`, uses `openaiCompatibleReasoningEfforts` and emits `{ reasoning: { effort } }`; otherwise emits low/medium/high in the same OpenRouter shape。[E: packages/opencode/src/provider/transform.ts:810] [E: packages/opencode/src/provider/transform.ts:812] [E: packages/opencode/src/provider/transform.ts:815] |
| `ai-gateway-provider` | For upstream `openai/`, uses release-date-aware `openaiReasoningEfforts` and emits `{ reasoningEffort }`; otherwise emits low/medium/high `{ reasoningEffort }` because Cloudflare compatible endpoint is OAI-shaped。[E: packages/opencode/src/provider/transform.ts:818] [E: packages/opencode/src/provider/transform.ts:826] [E: packages/opencode/src/provider/transform.ts:829] |
| `merge-gateway-ai-sdk-provider` | heuristic `variants()` 没有独立 case，不会从 capability 自动生成档位。catalog `reasoning_options` effort 经 `reasoningEffort()` 写成 `{ reasoningEffort }`；`sdkKey()` 把 providerOptions namespace 定为 `mergeGateway`，测试断言 `providerOptions()` 把 `{ reasoningEffort:"high" }` 放到该 key 下。[E: packages/opencode/src/provider/transform.ts:87] [E: packages/opencode/src/provider/transform.ts:88] [E: packages/opencode/src/provider/transform.ts:1777] [E: packages/opencode/src/provider/transform.ts:1778] [E: packages/opencode/src/provider/transform.ts:1410] [E: packages/opencode/src/provider/transform.ts:1417] [E: packages/opencode/test/provider/transform.test.ts:3373] [E: packages/opencode/test/provider/transform.test.ts:5571] [E: packages/opencode/test/provider/transform.test.ts:5573] |
| `@ai-sdk/gateway` with Anthropic model | 分类看 `model.api.id`。Adaptive Anthropic efforts emit `{ thinking: { type:"adaptive", display? }, effort }`;older non-adaptive Anthropic emits `high/max` thinking budgets 16000/31999。[E: packages/opencode/src/provider/transform.ts:832] [E: packages/opencode/src/provider/transform.ts:833] [E: packages/opencode/src/provider/transform.ts:834] [E: packages/opencode/src/provider/transform.ts:851] |
| `@ai-sdk/gateway` with Google model | 分类与 2.5 判定都看 `model.api.id`;Gemini 2.5 emits `high/max` thinking budgets,other Google emits `low/high` with `includeThoughts` and `thinkingLevel`。[E: packages/opencode/src/provider/transform.ts:866] [E: packages/opencode/src/provider/transform.ts:867] [E: packages/opencode/src/provider/transform.ts:878] [E: packages/opencode/src/provider/transform.ts:883] |
| `@ai-sdk/gateway` other | Uses `openaiCompatibleReasoningEfforts` and emits `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:893] [E: packages/opencode/src/provider/transform.ts:894] |
| `@ai-sdk/github-copilot` | Gemini models get no variants; Claude models get low/medium/high `{ reasoningEffort }`; GPT models get low/medium/high plus conditional xhigh and include encrypted reasoning/summary auto。[E: packages/opencode/src/provider/transform.ts:897] [E: packages/opencode/src/provider/transform.ts:902] [E: packages/opencode/src/provider/transform.ts:912] |
| `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/xai`, `@ai-sdk/deepinfra`, `venice-ai-sdk-provider`, `@ai-sdk/openai-compatible` | North mini code emits `none/high`; deepseek-v4 adds `max`; otherwise low/medium/high `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:923] [E: packages/opencode/src/provider/transform.ts:925] [E: packages/opencode/src/provider/transform.ts:929] [E: packages/opencode/src/provider/transform.ts:934] [E: packages/opencode/src/provider/transform.ts:938] [E: packages/opencode/src/provider/transform.ts:941] |
| `@ai-sdk/azure` | `o1-mini` emits no variants; otherwise `openaiReasoningEfforts` with `{ reasoningEffort, reasoningSummary:"auto", include:["reasoning.encrypted_content"] }`。[E: packages/opencode/src/provider/transform.ts:943] [E: packages/opencode/src/provider/transform.ts:945] [E: packages/opencode/src/provider/transform.ts:947] |
| `@ai-sdk/amazon-bedrock/mantle`, `@ai-sdk/openai` | Meta provider 固定暴露全部 `OPENAI_EFFORTS`;其他 provider 走 release/model-aware `openaiReasoningEfforts`。两者都带 reasoning summary auto 和 encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:956] [E: packages/opencode/src/provider/transform.ts:957] [E: packages/opencode/src/provider/transform.ts:958] [E: packages/opencode/src/provider/transform.ts:960] [E: packages/opencode/src/provider/transform.ts:964] [E: packages/opencode/src/provider/transform.ts:965] [E: packages/opencode/src/provider/transform.ts:971] |
| `@ai-sdk/anthropic`, `@ai-sdk/google-vertex/anthropic` | Adaptive efforts emit `{ thinking:{ type:"adaptive", display? }, effort }`; GitHub Copilot provider filters max/xhigh and opus-4.7 to medium。只匹配字面 `opus-4-5`/`opus-4.5` 的 4.5 helper 会生成 low/medium/high，每档同时带 enabled thinking budget 与 effort；older models emit high/max thinking budgets derived from output limit。[E: packages/opencode/src/provider/transform.ts:984] [E: packages/opencode/src/provider/transform.ts:988] [E: packages/opencode/src/provider/transform.ts:1011] [E: packages/opencode/src/provider/transform.ts:1017] [E: packages/opencode/src/provider/transform.ts:1802] |
| `@ai-sdk/amazon-bedrock` | Adaptive efforts emit `reasoningConfig { type:"adaptive", maxReasoningEffort, display? }`; Anthropic-on-Bedrock emits high/max budgetTokens; Amazon Nova emits low/medium/high maxReasoningEffort。[E: packages/opencode/src/provider/transform.ts:1032] [E: packages/opencode/src/provider/transform.ts:1034] [E: packages/opencode/src/provider/transform.ts:1049] [E: packages/opencode/src/provider/transform.ts:1067] |
| `@ai-sdk/google-vertex`, `@ai-sdk/google` | Delegates to `googleThinkingVariants(model)`。[E: packages/opencode/src/provider/transform.ts:1079] [E: packages/opencode/src/provider/transform.ts:1083] |
| `@ai-sdk/mistral` | Only model IDs containing Mistral Small 4 or Medium 3.5 identifiers emit `high: { reasoningEffort:"high" }`; other Mistral reasoning-capable models still emit none under this branch。[E: packages/opencode/src/provider/transform.ts:1085] [E: packages/opencode/src/provider/transform.ts:1090] [E: packages/opencode/src/provider/transform.ts:1097] |
| `@ai-sdk/cohere`, `@ai-sdk/perplexity` | Always `{}`。[E: packages/opencode/src/provider/transform.ts:1102] [E: packages/opencode/src/provider/transform.ts:1118] |
| `@ai-sdk/groq` | Emits `none/low/medium/high` `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:1106] [E: packages/opencode/src/provider/transform.ts:1108] |
| `@jerome-benoit/sap-ai-provider-v2` | Wraps variants inside `modelParams`; Anthropic adaptive uses `thinking` plus `output_config.effort`, Anthropic old uses `budget_tokens`, Gemini 2.5 uses Google variants, GPT/o-series use `reasoning_effort`, fallback low/medium/high `reasoning_effort`。[E: packages/opencode/src/provider/transform.ts:1122] [E: packages/opencode/src/provider/transform.ts:1127] [E: packages/opencode/src/provider/transform.ts:1140] [E: packages/opencode/src/provider/transform.ts:1145] [E: packages/opencode/src/provider/transform.ts:1149] [E: packages/opencode/src/provider/transform.ts:1152] |

## Google Thinking Variants

`googleThinkingVariants` emits Gemini 2.5 `high/max` budget variants and otherwise maps `googleThinkingLevelEfforts(id)` into `{ thinkingConfig: { includeThoughts: true, thinkingLevel } }`。[E: packages/opencode/src/provider/transform.ts:711] [E: packages/opencode/src/provider/transform.ts:713] [E: packages/opencode/src/provider/transform.ts:721] Gemini 3 flash-image emits `minimal/high`, pro-image emits `high`, flash emits `minimal/low/medium/high`, other Gemini 3 emits `low/medium/high`, and non-Gemini-3 emits `low/high`。[E: packages/opencode/src/provider/transform.ts:692] [E: packages/opencode/src/provider/transform.ts:694] [E: packages/opencode/src/provider/transform.ts:696] Gemini 2.5 pro non-flash max budget is 32768; otherwise max budget is 24576。[E: packages/opencode/src/provider/transform.ts:699] [E: packages/opencode/src/provider/transform.ts:702]

## Default Options Related To Reasoning

`options(input)` sets `toolStreaming=false` for Google Vertex Anthropic or non-Claude Anthropic npm models。[E: packages/opencode/src/provider/transform.ts:1166] [E: packages/opencode/src/provider/transform.ts:1170] OpenAI, `@ai-sdk/openai`, GitHub Copilot, Bedrock Mantle, and xAI set `store=false`; Azure also sets store false。[E: packages/opencode/src/provider/transform.ts:1175] [E: packages/opencode/src/provider/transform.ts:1179] [E: packages/opencode/src/provider/transform.ts:1181] [E: packages/opencode/src/provider/transform.ts:1184] DeepInfra/Cerebras use `prompt_cache_key`; OpenAI/Azure/xAI/Mistral/Venice use `promptCacheKey`，assignment 在 `result["promptCacheKey"] = input.sessionID`，and all cache-key defaults honor `setCacheKey:false`。[E: packages/opencode/src/provider/transform.ts:1262] [E: packages/opencode/src/provider/transform.ts:1263] [E: packages/opencode/src/provider/transform.ts:1266] [E: packages/opencode/src/provider/transform.ts:1273] OpenRouter/llmgateway request usage include true and force Gemini 3 reasoning high。[E: packages/opencode/src/provider/transform.ts:1188] [E: packages/opencode/src/provider/transform.ts:1193]

Google/Vertex reasoning-capable models get `thinkingConfig.includeThoughts=true`, and Gemini 3 adds `thinkingLevel:"high"`。[E: packages/opencode/src/provider/transform.ts:1219] [E: packages/opencode/src/provider/transform.ts:1221] [E: packages/opencode/src/provider/transform.ts:1225] Kimi heuristic on Anthropic transports defaults to adaptive summarized thinking at high effort。[E: packages/opencode/src/provider/transform.ts:1239] [E: packages/opencode/src/provider/transform.ts:1244] GPT-5 non-chat defaults `reasoningEffort:"medium"`, selected OpenAI/Azure/Copilot/Mantle models get `reasoningSummary:"auto"`, OpenAI/Mantle get encrypted reasoning include, non-chat non-codex gpt-5.x non-Azure gets `textVerbosity:"low"`。[E: packages/opencode/src/provider/transform.ts:1292] [E: packages/opencode/src/provider/transform.ts:1294] [E: packages/opencode/src/provider/transform.ts:1301] [E: packages/opencode/src/provider/transform.ts:1303] [E: packages/opencode/src/provider/transform.ts:1316] Azure Completions 提前返回只在 `@ai-sdk/azure` 且 `useCompletionUrls` 时触发：`gpt-(\d+)\.(\d+)` 判定为 5.5+ 则不写 `reasoningEffort`，更旧带小数点 GPT 仍写 `medium`，随后直接 `return result`，因此不会进入这段 GPT-5 summary/include/textVerbosity。[E: packages/opencode/src/provider/transform.ts:1283] [E: packages/opencode/src/provider/transform.ts:1284] [E: packages/opencode/src/provider/transform.ts:1285] [E: packages/opencode/src/provider/transform.ts:1287] [E: packages/opencode/src/provider/transform.ts:1289]

`smallOptions(model)` merges the first variant into `{ store:false }` for OpenAI/openai npm/GitHub Copilot/xAI,disables Google reasoning for empty OpenRouter/llmgateway small variants,and disables Venice thinking when no small variant exists。[E: packages/opencode/src/provider/transform.ts:1329] [E: packages/opencode/src/provider/transform.ts:1335] [E: packages/opencode/src/provider/transform.ts:1337] [E: packages/opencode/src/provider/transform.ts:1338] [E: packages/opencode/src/provider/transform.ts:1340] [E: packages/opencode/src/provider/transform.ts:1341] [E: packages/opencode/src/provider/transform.ts:1342] [E: packages/opencode/src/provider/transform.ts:1346] [E: packages/opencode/src/provider/transform.ts:1348]

## Sources

- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts
- packages/opencode/test/provider/transform.test.ts

## Related

- model-layer.provider-transforms
