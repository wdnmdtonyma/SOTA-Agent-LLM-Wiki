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
updated: e207624c48
evidence: explicit
symbols:
  - ProviderTransform.variants
  - ProviderTransform.reasoningVariants
  - openaiReasoningEfforts
  - googleThinkingVariants
  - reasoningEffort
  - options
  - smallOptions
related:
  - model-layer.provider-transforms
---

# Reasoning Variant Tables

本节点只描述 V1 `packages/opencode/src/provider/transform.ts` 的 reasoning variants。Provider registry 从 models.dev 构建 model 时,Cloudflare AI Gateway 会先把 `openai/*` / `anthropic/*` 映成 native npm,再调用 `ProviderTransform.reasoningVariants(model, base)`;只有它返回 `undefined` 时才回退 `ProviderTransform.variants(base)`。[E: packages/opencode/src/provider/provider.ts:1254] [E: packages/opencode/src/provider/provider.ts:1256] [E: packages/opencode/src/provider/provider.ts:1257] [E: packages/opencode/src/provider/provider.ts:1310] config model variants 会 merge 并可通过 `disabled` 删除具体 variant。[E: packages/opencode/src/provider/provider.ts:1568] [E: packages/opencode/src/provider/provider.ts:1570] [E: packages/opencode/src/provider/provider.ts:1571]

## Models.dev Reasoning Options

`reasoning_options` 是 optional array:可声明 `effort` 与可用 string/null values、`toggle`,或带 optional min/max 的 `budget_tokens`。[E: packages/core/src/models-dev.ts:52] [E: packages/core/src/models-dev.ts:54] [E: packages/core/src/models-dev.ts:55] [E: packages/core/src/models-dev.ts:58] [E: packages/core/src/models-dev.ts:61] [E: packages/core/src/models-dev.ts:62] [E: packages/core/src/models-dev.ts:63] [E: packages/core/src/models-dev.ts:76]

| Catalog option | Variant 翻译 |
| --- | --- |
| `effort` | 每个 string 值成为同名 variant;`null` 成为 `none`。`reasoningEffort()` 再按 npm package 输出 `reasoning.effort`、`thinkingConfig`、`reasoningConfig`、`reasoningEffort` 或 provider 特有 shape;不支持的组合被丢弃。`@ai-sdk/openai-compatible`、`@ai-sdk/xai`、`@ai-sdk/mistral`、`@ai-sdk/groq`、`@ai-sdk/cerebras`、`@ai-sdk/deepinfra`、`@ai-sdk/togetherai`、`venice-ai-sdk-provider`、`ai-gateway-provider` 与 `merge-gateway-ai-sdk-provider` 都属于 `{ reasoningEffort: effort }` pass-through 组。[E: packages/opencode/src/provider/transform.ts:1722] [E: packages/opencode/src/provider/transform.ts:1726] [E: packages/opencode/src/provider/transform.ts:1730] [E: packages/opencode/src/provider/transform.ts:1769] [E: packages/opencode/src/provider/transform.ts:1816] [E: packages/opencode/src/provider/transform.ts:1825] [E: packages/opencode/src/provider/transform.ts:1826] `gitlab-ai-provider` 另按 `model.family` 分流:以 `gpt` 开头写成 `{ reasoningEffort }`,以 `claude` 开头写成 `{ thinking: { type: "adaptive", effort } }`,其它 family 丢弃。[E: packages/opencode/src/provider/transform.ts:1827] [E: packages/opencode/src/provider/transform.ts:1828] [E: packages/opencode/src/provider/transform.ts:1829] |
| `toggle` | Alibaba 生成 `none/high` 的 `enableThinking`;Cohere 生成 disabled/enabled `thinking`;其他 npm package 得到空 mapping,由 `nonEmptyVariants()` 转成 `undefined` 并让 registry 回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1712] [E: packages/opencode/src/provider/transform.ts:1714] [E: packages/opencode/src/provider/transform.ts:1752] [E: packages/opencode/src/provider/transform.ts:1756] [E: packages/opencode/src/provider/transform.ts:1758] [E: packages/opencode/src/provider/transform.ts:1761] [E: packages/opencode/src/provider/transform.ts:1763] [E: packages/opencode/src/provider/transform.ts:1766] |
| `budget_tokens` | 生成 `high/max`;最大值同时被 catalog max、model output limit - 1 与 31999 限制,`high` 默认约为上限一半且不低于 min。之后 `reasoningBudget()` 按 provider 翻译 budget shape;若两个 budget 都无可用映射且同批也没有可用 toggle mapping,`nonEmptyVariants()` 才会返回 `undefined` 并回退 heuristic。[E: packages/opencode/src/provider/transform.ts:1713] [E: packages/opencode/src/provider/transform.ts:1716] [E: packages/opencode/src/provider/transform.ts:1737] [E: packages/opencode/src/provider/transform.ts:1739] [E: packages/opencode/src/provider/transform.ts:1742] [E: packages/opencode/src/provider/transform.ts:1745] [E: packages/opencode/src/provider/transform.ts:1752] [E: packages/opencode/src/provider/transform.ts:1863] ]

`reasoning_options` 字段缺失返回 `undefined`,让 registry 使用 heuristic;不支持的 toggle/budget mapping 也可以经 `nonEmptyVariants()` 返回 `undefined`。显式空数组则返回 `{}` 并抑制 heuristic。[E: packages/opencode/src/provider/transform.ts:1705] [E: packages/opencode/src/provider/transform.ts:1706] [E: packages/opencode/src/provider/transform.ts:1707] [E: packages/opencode/src/provider/transform.ts:1714] [E: packages/opencode/src/provider/transform.ts:1716] [E: packages/opencode/src/provider/transform.ts:1752]

## Base Effort Sets

| Symbol | Values | 语义 |
| --- | --- | --- |
| `WIDELY_SUPPORTED_EFFORTS` | `low`, `medium`, `high` | 多数 provider 分支的基础 effort set。[E: packages/opencode/src/provider/transform.ts:573] |
| `OPENAI_EFFORTS` | `none`, `minimal`, `low`, `medium`, `high`, `xhigh` | OpenAI-compatible fallback effort set。[E: packages/opencode/src/provider/transform.ts:574] |
| `OPENAI_GPT5_1_EFFORTS` | `none`, `low`, `medium`, `high` | versioned gpt-5.1 effort set。[E: packages/opencode/src/provider/transform.ts:575] |
| `OPENAI_GPT5_2_PLUS_EFFORTS` | gpt-5.1 set plus `xhigh` | versioned gpt-5.2+ effort set。[E: packages/opencode/src/provider/transform.ts:576] |
| `OPENAI_GPT5_PRO_EFFORTS` | `high` | unversioned/pro GPT-5 pro default。[E: packages/opencode/src/provider/transform.ts:577] |
| `OPENAI_GPT5_PRO_2_PLUS_EFFORTS` | `medium`, `high`, `xhigh` | versioned GPT-5 pro 2+ effort set。[E: packages/opencode/src/provider/transform.ts:578] |
| `OPENAI_GPT5_CHAT_EFFORTS` | `medium` | versioned gpt-5 chat effort set。[E: packages/opencode/src/provider/transform.ts:579] |
| `OPENAI_GPT5_CODEX_XHIGH_EFFORTS` | `low`, `medium`, `high`, `xhigh` | Codex max/version 2+ effort set。[E: packages/opencode/src/provider/transform.ts:580] |
| `OPENAI_GPT5_CODEX_3_PLUS_EFFORTS` | `none`, `low`, `medium`, `high`, `xhigh` | Codex version 3+ effort set。[E: packages/opencode/src/provider/transform.ts:581] |

For the generic release-date fallback inside `openaiReasoningEfforts`, OpenAI `none` effort is added when release date is at least `2025-11-13`, and `xhigh` is added when release date is at least `2025-12-04`; family-specific helpers such as versioned GPT-5 and Codex run before that fallback and may expose `none` or `xhigh` independently。[E: packages/opencode/src/provider/transform.ts:586] [E: packages/opencode/src/provider/transform.ts:589] [E: packages/opencode/src/provider/transform.ts:635] [E: packages/opencode/src/provider/transform.ts:641] [E: packages/opencode/src/provider/transform.ts:642]

## OpenAI Family Helpers

| Helper | Match | Result |
| --- | --- | --- |
| `GPT5_FAMILY_RE` | gpt-5 family anchored at string start or `/`。[E: packages/opencode/src/provider/transform.ts:594] | 以行首或 `/` 锚定 `gpt-5`，其后必须是 `.`、`-` 或结尾，从而排除 `gpt-50` / `gpt-5o`。`/` 是前缀分隔，不是 `gpt-5` 的后缀。[E: packages/opencode/src/provider/transform.ts:594] |
| `versionedGpt5ReasoningEfforts` | versioned GPT-5 model IDs; versioned pro first。[E: packages/opencode/src/provider/transform.ts:603] [E: packages/opencode/src/provider/transform.ts:604] | pro 2+ gets pro 2+ set; version 1 gets gpt-5.1 set; version >=2 gets gpt-5.2+ set。 |
| `gpt5CodexReasoningEfforts` | gpt-5 family plus `codex`。[E: packages/opencode/src/provider/transform.ts:611] [E: packages/opencode/src/provider/transform.ts:612] | version >=3 gets none+xhigh set; codex-max/version >=2 gets xhigh set; older codex gets low/medium/high。 |
| `gpt5ChatReasoningEfforts` | gpt-5 family plus `-chat`。[E: packages/opencode/src/provider/transform.ts:619] [E: packages/opencode/src/provider/transform.ts:620] | unversioned chat returns empty variants; versioned chat returns `medium`。 |
| `openaiReasoningEfforts` | OpenAI native release-date-aware helper。[E: packages/opencode/src/provider/transform.ts:627] [E: packages/opencode/src/provider/transform.ts:641] | deep-research fixed medium; chat/pro/codex/versioned rules precede release-date additions。 |
| `openaiCompatibleReasoningEfforts` | OpenAI-compatible ID helper。[E: packages/opencode/src/provider/transform.ts:646] [E: packages/opencode/src/provider/transform.ts:651] | chat/pro/codex/versioned rules, else full `OPENAI_EFFORTS`。 |

## Pre-Switch Exclusions And Special Cases

`variants(model)` immediately returns `{}` if `model.capabilities.reasoning` is false。[E: packages/opencode/src/provider/transform.ts:777] [E: packages/opencode/src/provider/transform.ts:778] MiniMax M3 在 Anthropic/OpenAI-compatible API 下生成两档 variants：精确 provider ID `nvidia`/`lilac` 使用 `chat_template_kwargs.thinking_mode=disabled|enabled`，其余 provider 使用 disabled/adaptive thinking shape。[E: packages/opencode/src/provider/transform.ts:784] [E: packages/opencode/src/provider/transform.ts:788] [E: packages/opencode/src/provider/transform.ts:796]

Before switching on `model.api.npm`, GLM 5.2 (`glm-5.2`/`glm-5-2`/`glm-5p2` in model or API ID) emits npm-specific variants and returns: OpenRouter `{ reasoning: { effort: "high"|"xhigh" } }`，openai-compatible `{ reasoningEffort: "high"|"max" }`，Anthropic `{ effort: "high"|"max" }`。[E: packages/opencode/src/provider/transform.ts:781] [E: packages/opencode/src/provider/transform.ts:804] [E: packages/opencode/src/provider/transform.ts:810] [E: packages/opencode/src/provider/transform.ts:816] `isKimiFamily()` 可由 provider/API ID 中的 `kimi`/`moonshot` 或已知 Kimi/Moonshot base URL 命中；该 family 若走 Anthropic/Vertex-Anthropic 会先生成 low/medium/high/xhigh/max adaptive+summarized variants。[E: packages/opencode/src/provider/transform.ts:29] [E: packages/opencode/src/provider/transform.ts:33] [E: packages/opencode/src/provider/transform.ts:38] [E: packages/opencode/src/provider/transform.ts:821] 随后的 suppress 条件却只检查 model ID 是否含 `kimi`，所以仅由 `moonshot`/URL 识别且 model ID 不含 `kimi` 的非 Anthropic path 仍会继续进入 npm-specific switch。[E: packages/opencode/src/provider/transform.ts:836] DeepSeek、MiniMax、other GLM、K2P、Qwen、big-pickle 等匹配仍会在此提前返回空 variants；Qwen 没有 0.55/1 effort 档。[E: packages/opencode/src/provider/transform.ts:829] [E: packages/opencode/src/provider/transform.ts:838] [E: packages/opencode/src/provider/transform.ts:841] Grok 3 mini has low/high variants, with OpenRouter using `{ reasoning: { effort } }` and non-OpenRouter using `{ reasoningEffort }`;其他 Grok 模型不再被提前排除,会继续落入 npm provider branch。[E: packages/opencode/src/provider/transform.ts:844] [E: packages/opencode/src/provider/transform.ts:845] [E: packages/opencode/src/provider/transform.ts:847] [E: packages/opencode/src/provider/transform.ts:852]

Claude adaptive 的版本判断只读 API ID：4.7+、major >4，以及无法解析版本但含 `claude-` 的 future alias 都返回五档 adaptive variants 并显式请求 summarized display；4.6 仍是四档、不显式请求 display，dated Claude 4 ID 不会把发布日期误当 minor version。[E: packages/opencode/src/provider/transform.ts:654] [E: packages/opencode/src/provider/transform.ts:658] [E: packages/opencode/src/provider/transform.ts:659] [E: packages/opencode/src/provider/transform.ts:662] [E: packages/opencode/src/provider/transform.ts:670] [E: packages/opencode/src/provider/transform.ts:678] [E: packages/opencode/src/provider/transform.ts:684] [E: packages/opencode/test/provider/transform.test.ts:5316] [E: packages/opencode/test/provider/transform.test.ts:5331] [E: packages/opencode/test/provider/transform.test.ts:5340]

## Provider/NPM Variant Table

| Branch | Variants emitted |
| --- | --- |
| `@openrouter/ai-sdk-provider` | If api ID starts `openai/` or model ID contains `gpt`, uses `openaiCompatibleReasoningEfforts` and emits `{ reasoning: { effort } }`; otherwise emits low/medium/high in the same OpenRouter shape。[E: packages/opencode/src/provider/transform.ts:858] [E: packages/opencode/src/provider/transform.ts:860] [E: packages/opencode/src/provider/transform.ts:863] |
| `ai-gateway-provider` | For upstream `openai/`, uses release-date-aware `openaiReasoningEfforts` and emits `{ reasoningEffort }`; otherwise emits low/medium/high `{ reasoningEffort }` because Cloudflare compatible endpoint is OAI-shaped。[E: packages/opencode/src/provider/transform.ts:866] [E: packages/opencode/src/provider/transform.ts:873] [E: packages/opencode/src/provider/transform.ts:877] |
| `merge-gateway-ai-sdk-provider` | heuristic `variants()` 没有独立 case，不会从 capability 自动生成档位。catalog `reasoning_options` effort 经 `reasoningEffort()` 写成 `{ reasoningEffort }`；`sdkKey()` 把 providerOptions namespace 定为 `mergeGateway`，测试断言 `providerOptions()` 把 `{ reasoningEffort:"high" }` 放到该 key 下。[E: packages/opencode/src/provider/transform.ts:87] [E: packages/opencode/src/provider/transform.ts:88] [E: packages/opencode/src/provider/transform.ts:1825] [E: packages/opencode/src/provider/transform.ts:1826] [E: packages/opencode/src/provider/transform.ts:1408] [E: packages/opencode/src/provider/transform.ts:1465] [E: packages/opencode/test/provider/transform.test.ts:3867] [E: packages/opencode/test/provider/transform.test.ts:6114] [E: packages/opencode/test/provider/transform.test.ts:6116] |
| `gitlab-ai-provider` | heuristic `variants()` 没有独立 case，落到最终 `{}`。catalog `reasoning_options` effort 看 `model.family`：`gpt*` → `{ reasoningEffort }`；`claude*` → `{ thinking: { type: "adaptive", effort } }`；其它 family 丢弃。`reasoningBudget()` 对该 npm 返回 undefined。[E: packages/opencode/src/provider/transform.ts:1204] [E: packages/opencode/src/provider/transform.ts:1827] [E: packages/opencode/src/provider/transform.ts:1828] [E: packages/opencode/src/provider/transform.ts:1829] [E: packages/opencode/src/provider/transform.ts:1903] [E: packages/opencode/test/provider/transform.test.ts:3955] [E: packages/opencode/test/provider/transform.test.ts:3961] [E: packages/opencode/test/provider/transform.test.ts:3964] |
| `@ai-sdk/gateway` with Anthropic model | 分类看 `model.api.id`。Adaptive Anthropic efforts emit `{ thinking: { type:"adaptive", display? }, effort }`;older non-adaptive Anthropic emits `high/max` thinking budgets 16000/31999。[E: packages/opencode/src/provider/transform.ts:880] [E: packages/opencode/src/provider/transform.ts:881] [E: packages/opencode/src/provider/transform.ts:882] [E: packages/opencode/src/provider/transform.ts:900] |
| `@ai-sdk/gateway` with Google model | 分类与 2.5 判定都看 `model.api.id`;Gemini 2.5 emits `high/max` thinking budgets,other Google emits `low/high` with `includeThoughts` and `thinkingLevel`。[E: packages/opencode/src/provider/transform.ts:914] [E: packages/opencode/src/provider/transform.ts:915] [E: packages/opencode/src/provider/transform.ts:926] [E: packages/opencode/src/provider/transform.ts:932] |
| `@ai-sdk/gateway` other | Uses `openaiCompatibleReasoningEfforts` and emits `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:941] [E: packages/opencode/src/provider/transform.ts:942] |
| `@ai-sdk/github-copilot` | Gemini models get no variants; Claude models get low/medium/high `{ reasoningEffort }`; GPT models get low/medium/high plus conditional xhigh and include encrypted reasoning/summary auto。[E: packages/opencode/src/provider/transform.ts:945] [E: packages/opencode/src/provider/transform.ts:951] [E: packages/opencode/src/provider/transform.ts:955] [E: packages/opencode/src/provider/transform.ts:964] |
| `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/xai`, `@ai-sdk/deepinfra`, `venice-ai-sdk-provider`, `@ai-sdk/openai-compatible` | North mini code emits `none/high`; deepseek-v4 adds `max`; otherwise low/medium/high `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:971] [E: packages/opencode/src/provider/transform.ts:982] [E: packages/opencode/src/provider/transform.ts:986] [E: packages/opencode/src/provider/transform.ts:989] |
| `@ai-sdk/azure` | `o1-mini` emits no variants; otherwise `openaiReasoningEfforts` with `{ reasoningEffort, reasoningSummary:"auto", include:["reasoning.encrypted_content"] }`。[E: packages/opencode/src/provider/transform.ts:991] [E: packages/opencode/src/provider/transform.ts:993] [E: packages/opencode/src/provider/transform.ts:995] |
| `@ai-sdk/amazon-bedrock/mantle`, `@ai-sdk/openai` | Meta provider 固定暴露全部 `OPENAI_EFFORTS`;其他 provider 走 release/model-aware `openaiReasoningEfforts`。两者都带 reasoning summary auto 和 encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:1004] [E: packages/opencode/src/provider/transform.ts:1006] [E: packages/opencode/src/provider/transform.ts:1011] [E: packages/opencode/src/provider/transform.ts:1019] [E: packages/opencode/src/provider/transform.ts:1024] |
| `@ai-sdk/anthropic`, `@ai-sdk/google-vertex/anthropic` | Adaptive efforts emit `{ thinking:{ type:"adaptive", display? }, effort }`; GitHub Copilot provider filters max/xhigh and opus-4.7 to medium。只匹配字面 `opus-4-5`/`opus-4.5` 的 4.5 helper 会生成 low/medium/high，每档同时带 enabled thinking budget 与 effort；older models emit high/max thinking budgets derived from output limit。[E: packages/opencode/src/provider/transform.ts:1032] [E: packages/opencode/src/provider/transform.ts:1038] [E: packages/opencode/src/provider/transform.ts:1059] [E: packages/opencode/src/provider/transform.ts:1065] [E: packages/opencode/src/provider/transform.ts:1853] |
| `@ai-sdk/amazon-bedrock` | Adaptive efforts emit `reasoningConfig { type:"adaptive", maxReasoningEffort, display? }`; Anthropic-on-Bedrock emits high/max budgetTokens; Amazon Nova emits low/medium/high maxReasoningEffort。[E: packages/opencode/src/provider/transform.ts:1080] [E: packages/opencode/src/provider/transform.ts:1082] [E: packages/opencode/src/provider/transform.ts:1097] [E: packages/opencode/src/provider/transform.ts:1116] |
| `@ai-sdk/google-vertex`, `@ai-sdk/google` | Delegates to `googleThinkingVariants(model)`。[E: packages/opencode/src/provider/transform.ts:1127] [E: packages/opencode/src/provider/transform.ts:1131] |
| `@ai-sdk/mistral` | Only model IDs containing Mistral Small 4 or Medium 3.5 identifiers emit `high: { reasoningEffort:"high" }`; other Mistral reasoning-capable models still emit none under this branch。[E: packages/opencode/src/provider/transform.ts:1133] [E: packages/opencode/src/provider/transform.ts:1138] [E: packages/opencode/src/provider/transform.ts:1147] |
| `@ai-sdk/cohere`, `@ai-sdk/perplexity` | Always `{}`。[E: packages/opencode/src/provider/transform.ts:1150] [E: packages/opencode/src/provider/transform.ts:1166] |
| `@ai-sdk/groq` | Emits `none/low/medium/high` `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:1154] [E: packages/opencode/src/provider/transform.ts:1156] |
| `@jerome-benoit/sap-ai-provider-v2` | Wraps variants inside `modelParams`; Anthropic adaptive uses `thinking` plus `output_config.effort`, Anthropic old uses `budget_tokens`, Gemini 2.5 uses Google variants, GPT/o-series use `reasoning_effort`, fallback low/medium/high `reasoning_effort`。[E: packages/opencode/src/provider/transform.ts:1170] [E: packages/opencode/src/provider/transform.ts:1175] [E: packages/opencode/src/provider/transform.ts:1188] [E: packages/opencode/src/provider/transform.ts:1192] [E: packages/opencode/src/provider/transform.ts:1196] [E: packages/opencode/src/provider/transform.ts:1199] |

## Google Thinking Variants

`googleThinkingVariants` emits Gemini 2.5 `high/max` budget variants and otherwise maps `googleThinkingLevelEfforts(id)` into `{ thinkingConfig: { includeThoughts: true, thinkingLevel } }`。[E: packages/opencode/src/provider/transform.ts:759] [E: packages/opencode/src/provider/transform.ts:761] [E: packages/opencode/src/provider/transform.ts:772] Gemini 3 flash-image emits `minimal/high`, pro-image emits `high`, flash emits `minimal/low/medium/high`, other Gemini 3 emits `low/medium/high`, and non-Gemini-3 emits `low/high`。[E: packages/opencode/src/provider/transform.ts:740] [E: packages/opencode/src/provider/transform.ts:741] [E: packages/opencode/src/provider/transform.ts:742] [E: packages/opencode/src/provider/transform.ts:743] Gemini 2.5 pro non-flash max budget is 32768; otherwise max budget is 24576。[E: packages/opencode/src/provider/transform.ts:749] [E: packages/opencode/src/provider/transform.ts:750]

## Default Options Related To Reasoning

`options(input)` sets `toolStreaming=false` for Google Vertex Anthropic or non-Claude Anthropic npm models。[E: packages/opencode/src/provider/transform.ts:1215] [E: packages/opencode/src/provider/transform.ts:1218] OpenAI, `@ai-sdk/openai`, GitHub Copilot, Bedrock Mantle, and xAI set `store=false`; Azure also sets store false。[E: packages/opencode/src/provider/transform.ts:1223] [E: packages/opencode/src/provider/transform.ts:1227] [E: packages/opencode/src/provider/transform.ts:1229] [E: packages/opencode/src/provider/transform.ts:1233] DeepInfra/Cerebras use `prompt_cache_key`; OpenAI/Azure/xAI/Mistral/Venice use `promptCacheKey`，assignment 在 `result["promptCacheKey"] = input.sessionID`，and all cache-key defaults honor `setCacheKey:false`。[E: packages/opencode/src/provider/transform.ts:1310] [E: packages/opencode/src/provider/transform.ts:1311] [E: packages/opencode/src/provider/transform.ts:1314] [E: packages/opencode/src/provider/transform.ts:1321] OpenRouter/llmgateway request usage include true and force Gemini 3 reasoning high。[E: packages/opencode/src/provider/transform.ts:1236] [E: packages/opencode/src/provider/transform.ts:1241]

Google/Vertex reasoning-capable models get `thinkingConfig.includeThoughts=true`, and Gemini 3 adds `thinkingLevel:"high"`。[E: packages/opencode/src/provider/transform.ts:1267] [E: packages/opencode/src/provider/transform.ts:1269] [E: packages/opencode/src/provider/transform.ts:1273] Kimi heuristic on Anthropic transports defaults to adaptive summarized thinking at high effort。[E: packages/opencode/src/provider/transform.ts:1287] [E: packages/opencode/src/provider/transform.ts:1292] API ID 含 `gpt-5` 且不含 `gpt-5-chat` / `gpt-5-pro` 时默认 `reasoningEffort:"medium"`；选中的 OpenAI/Azure/Copilot/Mantle 模型再写 `reasoningSummary:"auto"`，OpenAI/Mantle 再 include encrypted reasoning。`textVerbosity:"low"` **只**在 `model.api.npm` 为 `@ai-sdk/openai` 或 `@ai-sdk/amazon-bedrock/mantle`，且 API ID 含 `gpt-5.`、不含 `codex`、不含 `-chat` 时写入；Azure / Copilot / openai-compatible 不会注入。[E: packages/opencode/src/provider/transform.ts:1340] [E: packages/opencode/src/provider/transform.ts:1341] [E: packages/opencode/src/provider/transform.ts:1342] [E: packages/opencode/src/provider/transform.ts:1349] [E: packages/opencode/src/provider/transform.ts:1352] [E: packages/opencode/src/provider/transform.ts:1364] Azure Completions 提前返回只在 `@ai-sdk/azure` 且 `useCompletionUrls` 时触发：`gpt-(\d+)\.(\d+)` 判定为 5.5+ 则不写 `reasoningEffort`，更旧带小数点 GPT 仍写 `medium`，随后直接 `return result`，因此不会进入这段 GPT-5 summary/include/textVerbosity。[E: packages/opencode/src/provider/transform.ts:1331] [E: packages/opencode/src/provider/transform.ts:1332] [E: packages/opencode/src/provider/transform.ts:1333] [E: packages/opencode/src/provider/transform.ts:1335] [E: packages/opencode/src/provider/transform.ts:1337]

`providerOptions()` 在 OpenAI/Azure/Mantle 且具备 reasoning capability 或已设 effort/summary 时加 `forceReasoning: true`；其余路径走 `anthropicBlockBinding`。Claude 5.1+（Mythos 5.1 除外）在 thinking/reasoningConfig type 为 `adaptive`/`enabled` 且用户未显式设 `blockBinding` 时注入 `{ prefixMismatchBehavior: "drop_block" }`；`blockBinding: false` 是 OpenCode-only 哨兵，会被剥掉。[E: packages/opencode/src/provider/transform.ts:1408] [E: packages/opencode/src/provider/transform.ts:1416] [E: packages/opencode/src/provider/transform.ts:1417] [E: packages/opencode/src/provider/transform.ts:696] [E: packages/opencode/src/provider/transform.ts:706] [E: packages/opencode/src/provider/transform.ts:712] [E: packages/opencode/src/provider/transform.ts:726]

`smallOptions(model)` merges the first variant into `{ store:false }` for OpenAI/openai npm/GitHub Copilot/xAI,disables Google reasoning for empty OpenRouter/llmgateway small variants,and disables Venice thinking when no small variant exists。[E: packages/opencode/src/provider/transform.ts:1377] [E: packages/opencode/src/provider/transform.ts:1385] [E: packages/opencode/src/provider/transform.ts:1388] [E: packages/opencode/src/provider/transform.ts:1389] [E: packages/opencode/src/provider/transform.ts:1390] [E: packages/opencode/src/provider/transform.ts:1394] [E: packages/opencode/src/provider/transform.ts:1396]

## Sources

- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts
- packages/opencode/test/provider/transform.test.ts

## 相关

- model-layer.provider-transforms
