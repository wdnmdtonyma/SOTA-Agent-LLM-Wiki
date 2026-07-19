---
id: model-layer.provider-transforms
title: Provider Transforms
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/provider/transform.ts]
symbols: [ProviderTransform.message, ProviderTransform.reasoningVariants, ProviderTransform.variants, ProviderTransform.options, ProviderTransform.temperature, ProviderTransform.topP, ProviderTransform.topK]
related: [ref.reasoning-variant-tables]
evidence: explicit
status: verified
updated: 67caf894e
---

> V1 provider transforms 是 AI SDK request 的 provider-specific normalization 层:它修 message content、cache hints、providerOptions key、Responses item metadata、reasoning variants、default generation/provider options,让同一条 V1 session loop 能喂给不同 AI SDK provider。

## 能回答的问题
- 为什么 V1 message 发送前会按 provider 改写?
- cache control 是如何选中消息和 content part 的?
- reasoning variants 是从哪里产生的?
- GPT-5/OpenAI/Copilot 的默认 provider options 在哪里设?
- providerOptions key 为什么有时要从 providerID 改成 SDK key?

## Message Transform Pipeline

`message(msgs, model, options)` 的顺序是:先 `unsupportedParts`,再 `normalizeMessages`,再按 Anthropic/Claude/Alibaba 类 provider 应用 caching,然后 remap providerOptions key,最后在 Responses store 不为 true 时剥离 itemId。[E: packages/opencode/src/provider/transform.ts:430][E: packages/opencode/src/provider/transform.ts:431][E: packages/opencode/src/provider/transform.ts:432][E: packages/opencode/src/provider/transform.ts:444][E: packages/opencode/src/provider/transform.ts:459][E: packages/opencode/src/provider/transform.ts:470]

`unsupportedParts` 会根据 model capabilities 把不支持的 file/image part 替换成 error text,避免把 provider 不接受的媒体直接传给 AI SDK。[E: packages/opencode/src/provider/transform.ts:374][E: packages/opencode/src/provider/transform.ts:404]

`normalizeMessages` 做多 provider hack:Anthropic/Bedrock 会过滤空 text/reasoning content,Claude toolCallId 会 scrub 到 `[a-zA-Z0-9_-]`,Mistral toolCallId 会压成 9 位 alnum 并在 tool 与 user 消息之间插 assistant "Done.",DeepSeek 会给 assistant 补空 reasoning。[E: packages/opencode/src/provider/transform.ts:134][E: packages/opencode/src/provider/transform.ts:186][E: packages/opencode/src/provider/transform.ts:189][E: packages/opencode/src/provider/transform.ts:208][E: packages/opencode/src/provider/transform.ts:219][E: packages/opencode/src/provider/transform.ts:259][E: packages/opencode/src/provider/transform.ts:269][E: packages/opencode/src/provider/transform.ts:280]

`applyCaching` 选择前两个 system message 与最后两个 non-system message,并给 Anthropic/OpenRouter/Bedrock/OpenAI-compatible/Copilot/Alibaba 等 provider 写对应 providerOptions cache controls。[E: packages/opencode/src/provider/transform.ts:323][E: packages/opencode/src/provider/transform.ts:344]

providerOptions key remap 用 `sdkKey(model.api.npm)`:如果 SDK 期望的 key 与 `model.providerID` 不同,会把 providerOptions 从 stored providerID 搬到 SDK key。[E: packages/opencode/src/provider/transform.ts:448][E: packages/opencode/src/provider/transform.ts:459]

Responses item id 剥离只在 `options.store !== true` 且 npm 是 OpenAI/Azure/Bedrock Mantle 这类 Responses path 时做,并删除 provider options 中的 `itemId`。[E: packages/opencode/src/provider/transform.ts:464][E: packages/opencode/src/provider/transform.ts:471]

## Generation Defaults

`temperature`/`topP`/`topK` 是 model-id heuristic:例如 qwen temperature 0.55,Claude temperature undefined,Gemini topK 64,MiniMax topK 按 m2 variant 20/40。[E: packages/opencode/src/provider/transform.ts:484][E: packages/opencode/src/provider/transform.ts:485][E: packages/opencode/src/provider/transform.ts:511][E: packages/opencode/src/provider/transform.ts:512][E: packages/opencode/src/provider/transform.ts:513][E: packages/opencode/src/provider/transform.ts:515]

`options` 是 provider default options 聚合器:它可以关 tool streaming、设置 store false、prompt cache key、OpenRouter/LLM Gateway usage include、Gemini thinkingConfig、Alibaba `enable_thinking`、GPT-5 与 Azure `gpt-5.5` 的 reasoningSummary/reasoningEffort/textVerbosity/encrypted reasoning include 等。[E: packages/opencode/src/provider/transform.ts:1086][E: packages/opencode/src/provider/transform.ts:1097][E: packages/opencode/src/provider/transform.ts:1108][E: packages/opencode/src/provider/transform.ts:1117][E: packages/opencode/src/provider/transform.ts:1160][E: packages/opencode/src/provider/transform.ts:1198][E: packages/opencode/src/provider/transform.ts:1201][E: packages/opencode/src/provider/transform.ts:1215][E: packages/opencode/src/provider/transform.ts:1218][E: packages/opencode/src/provider/transform.ts:1230]

重要默认:

- OpenAI、`@ai-sdk/openai`、GitHub Copilot、Bedrock Mantle 和 xAI 默认 `store=false`。[E: packages/opencode/src/provider/transform.ts:1102][E: packages/opencode/src/provider/transform.ts:1103][E: packages/opencode/src/provider/transform.ts:1104][E: packages/opencode/src/provider/transform.ts:1105][E: packages/opencode/src/provider/transform.ts:1106][E: packages/opencode/src/provider/transform.ts:1108]
- Azure 默认 `store=false` 并用 session id 做 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1111][E: packages/opencode/src/provider/transform.ts:1112][E: packages/opencode/src/provider/transform.ts:1113]
- 除非 `setCacheKey === false`,OpenAI provider、`@ai-sdk/openai`、`@ai-sdk/xai` 或显式启用 `setCacheKey` 会把 session id 放进 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1142][E: packages/opencode/src/provider/transform.ts:1143][E: packages/opencode/src/provider/transform.ts:1144][E: packages/opencode/src/provider/transform.ts:1145][E: packages/opencode/src/provider/transform.ts:1146][E: packages/opencode/src/provider/transform.ts:1149]
- Meta provider 在 `@ai-sdk/openai` path 上默认 `reasoningEffort=xhigh`、`reasoningSummary=auto` 并 include encrypted reasoning。[E: packages/opencode/src/provider/transform.ts:1152][E: packages/opencode/src/provider/transform.ts:1153][E: packages/opencode/src/provider/transform.ts:1154][E: packages/opencode/src/provider/transform.ts:1155]
- 非 chat GPT-5 默认 `reasoningEffort=medium`;OpenAI/Azure/Copilot/Bedrock Mantle 还默认 `reasoningSummary=auto`。[E: packages/opencode/src/provider/transform.ts:1206][E: packages/opencode/src/provider/transform.ts:1208][E: packages/opencode/src/provider/transform.ts:1215]

## Reasoning Variants

models.dev 模型现在可以用 `reasoning_options` 声明 `effort`、`toggle` 或 `budget_tokens` 能力;`reasoningVariants(model, target)` 会优先把这些 catalog 能力翻译成 provider-specific variants。它返回 `undefined` 时回退到 heuristic `variants(target)`;这可能是字段缺失,也可能是 toggle/budget 对当前 npm package 没有映射,而显式空数组会得到空 variants。[E: packages/opencode/src/provider/transform.ts:1583][E: packages/opencode/src/provider/transform.ts:1584][E: packages/opencode/src/provider/transform.ts:1585][E: packages/opencode/src/provider/transform.ts:1586][E: packages/opencode/src/provider/transform.ts:1588][E: packages/opencode/src/provider/transform.ts:1591][E: packages/opencode/src/provider/transform.ts:1592][E: packages/opencode/src/provider/transform.ts:1593][E: packages/opencode/src/provider/transform.ts:1595][E: packages/opencode/src/provider/transform.ts:1630][E: packages/opencode/src/provider/transform.ts:1631]

heuristic `variants(model)` 首先要求 `model.capabilities.reasoning`,没有 reasoning capability 直接返回空对象。[E: packages/opencode/src/provider/transform.ts:673][E: packages/opencode/src/provider/transform.ts:674]

变体生成是 provider/npm/model-id 组合规则,不是统一标准字段。例如 MiniMax M3 在 Anthropic/OpenAI-compatible path 返回 disabled/adaptive thinking 两个变体,DeepSeek/MiniMax/非 GLM 5.2/Kimi/Qwen/Big Pickle 等 id 直接不生成 variants,grok-3-mini 在 OpenRouter 下用 `{ reasoning: { effort } }`,非 OpenRouter 用 `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:681][E: packages/opencode/src/provider/transform.ts:685][E: packages/opencode/src/provider/transform.ts:686][E: packages/opencode/src/provider/transform.ts:710][E: packages/opencode/src/provider/transform.ts:725][E: packages/opencode/src/provider/transform.ts:728][E: packages/opencode/src/provider/transform.ts:733]

OpenRouter branch 用 `reasoning.effort`;AI Gateway branch 返回 OpenAI-compatible style 的 `reasoningEffort` variants。[E: packages/opencode/src/provider/transform.ts:739][E: packages/opencode/src/provider/transform.ts:744][E: packages/opencode/src/provider/transform.ts:747][E: packages/opencode/src/provider/transform.ts:756][E: packages/opencode/src/provider/transform.ts:758]

## 设计动机

V1 provider transforms 存在是因为 AI SDK abstraction 不完全屏蔽 provider wire 差异:不同 provider 对空 content、tool id charset、reasoning control、cache control、store/itemId 的要求不同。[I] registry 在把 models.dev/config model 合成 V1 model 时先使用 catalog `reasoning_options`,再回退 heuristic variants,说明 variants 是 model catalog 的一部分,不是 runtime 临时开关。[E: packages/opencode/src/provider/provider.ts:1252][E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1503][E: packages/opencode/src/provider/provider.ts:1507][E: packages/opencode/src/provider/provider.ts:1508][E: packages/opencode/src/provider/provider.ts:1510]

## 易错点

- 这里是 V1 AI SDK transform,不是 `packages/llm` native protocol adapter;不要把 `ProviderTransform.options` 和 native route defaults 混写。[I]
- `store=false` 会影响 Responses item metadata;transform 在相关 provider options 中显式删除 `itemId`。[E: packages/opencode/src/provider/transform.ts:464][E: packages/opencode/src/provider/transform.ts:471]
- reasoning variants 优先由 models.dev `reasoning_options` 声明并按 npm package 翻译;`reasoningVariants()` 返回 `undefined` 时才按 model capability、model id、npm package 走 heuristic。[E: packages/opencode/src/provider/transform.ts:1583][E: packages/opencode/src/provider/transform.ts:1585][E: packages/opencode/src/provider/transform.ts:1593][E: packages/opencode/src/provider/transform.ts:1595][E: packages/opencode/src/provider/transform.ts:1648]

## Sources
- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts

## Related
- ref.reasoning-variant-tables
