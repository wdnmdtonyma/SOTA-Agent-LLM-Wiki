---
id: model-layer.provider-transforms
title: Provider Transforms
kind: subsystem
tier: T1
v: v1
source: [packages/opencode/src/provider/transform.ts]
symbols: [ProviderTransform.message, ProviderTransform.variants, ProviderTransform.options, ProviderTransform.temperature, ProviderTransform.topP, ProviderTransform.topK]
related: [ref.reasoning-variant-tables]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 provider transforms 是 AI SDK request 的 provider-specific normalization 层:它修 message content、cache hints、providerOptions key、Responses item metadata、reasoning variants、default generation/provider options,让同一条 V1 session loop 能喂给不同 AI SDK provider。

## 能回答的问题
- 为什么 V1 message 发送前会按 provider 改写?
- cache control 是如何选中消息和 content part 的?
- reasoning variants 是从哪里产生的?
- GPT-5/OpenAI/Copilot 的默认 provider options 在哪里设?
- providerOptions key 为什么有时要从 providerID 改成 SDK key?

## Message Transform Pipeline

`message(msgs, model, options)` 的顺序是:先 `unsupportedParts`,再 `normalizeMessages`,再按 Anthropic/Claude/Alibaba 类 provider 应用 caching,然后 remap providerOptions key,最后在 Responses store 不为 true 时剥离 itemId。[E: packages/opencode/src/provider/transform.ts:430][E: packages/opencode/src/provider/transform.ts:476]

`unsupportedParts` 会根据 model capabilities 把不支持的 file/image part 替换成 error text,避免把 provider 不接受的媒体直接传给 AI SDK。[E: packages/opencode/src/provider/transform.ts:374][E: packages/opencode/src/provider/transform.ts:404]

`normalizeMessages` 做多 provider hack:Anthropic/Bedrock 会过滤空 text/reasoning content,Claude toolCallId 会 scrub 到 `[a-zA-Z0-9_-]`,Mistral toolCallId 会压成 9 位 alnum 并在 tool 与 user 消息之间插 assistant "Done.",DeepSeek 会给 assistant 补空 reasoning。[E: packages/opencode/src/provider/transform.ts:134][E: packages/opencode/src/provider/transform.ts:186][E: packages/opencode/src/provider/transform.ts:189][E: packages/opencode/src/provider/transform.ts:208][E: packages/opencode/src/provider/transform.ts:219][E: packages/opencode/src/provider/transform.ts:259][E: packages/opencode/src/provider/transform.ts:269][E: packages/opencode/src/provider/transform.ts:280]

`applyCaching` 选择前两个 system message 与最后两个 non-system message,并给 Anthropic/OpenRouter/Bedrock/OpenAI-compatible/Copilot/Alibaba 等 provider 写对应 providerOptions cache controls。[E: packages/opencode/src/provider/transform.ts:323][E: packages/opencode/src/provider/transform.ts:344]

providerOptions key remap 用 `sdkKey(model.api.npm)`:如果 SDK 期望的 key 与 `model.providerID` 不同,会把 providerOptions 从 stored providerID 搬到 SDK key。[E: packages/opencode/src/provider/transform.ts:448][E: packages/opencode/src/provider/transform.ts:459]

Responses item id 剥离只在 `options.store !== true` 且 npm 是 OpenAI/Azure/Bedrock Mantle 这类 Responses path 时做,并删除 provider options 中的 `itemId`。[E: packages/opencode/src/provider/transform.ts:464][E: packages/opencode/src/provider/transform.ts:471]

## Generation Defaults

`temperature`/`topP`/`topK` 是 model-id heuristic:例如 qwen temperature 0.55,Claude temperature undefined,Gemini topK 64,MiniMax topK 按 m2 variant 20/40。[E: packages/opencode/src/provider/transform.ts:482][E: packages/opencode/src/provider/transform.ts:483][E: packages/opencode/src/provider/transform.ts:510][E: packages/opencode/src/provider/transform.ts:513]

`options` 是 provider default options 聚合器:它可以关 tool streaming、设置 store false、prompt cache key、OpenRouter usage include、Gemini thinkingConfig、Alibaba `enable_thinking`、GPT-5 reasoningEffort/reasoningSummary/textVerbosity/encrypted reasoning include 等。[E: packages/opencode/src/provider/transform.ts:1045][E: packages/opencode/src/provider/transform.ts:1199]

重要默认:

- OpenAI、`@ai-sdk/openai`、GitHub Copilot、Bedrock Mantle 默认 `store=false`。[E: packages/opencode/src/provider/transform.ts:1061][E: packages/opencode/src/provider/transform.ts:1066]
- Azure 默认 `store=false` 并用 session id 做 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1069][E: packages/opencode/src/provider/transform.ts:1071]
- OpenAI provider 或显式 `setCacheKey` 会把 session id 放进 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1100][E: packages/opencode/src/provider/transform.ts:1101]
- 非 chat GPT-5 默认 `reasoningEffort=medium`;OpenAI/Azure/Copilot/Bedrock Mantle 还默认 `reasoningSummary=auto`。[E: packages/opencode/src/provider/transform.ts:1154][E: packages/opencode/src/provider/transform.ts:1161]

## Reasoning Variants

`variants(model)` 首先要求 `model.capabilities.reasoning`,没有 reasoning capability 直接返回空对象。[E: packages/opencode/src/provider/transform.ts:665][E: packages/opencode/src/provider/transform.ts:666]

变体生成是 provider/npm/model-id 组合规则,不是统一标准字段。例如 MiniMax M3 在 Anthropic/OpenAI-compatible path 返回 disabled/adaptive thinking 两个变体,DeepSeek/MiniMax/GLM/Kimi/Qwen/Big Pickle 等 id 直接不生成 variants,grok-3-mini 在 OpenRouter 下用 `{ reasoning: { effort } }`,非 OpenRouter 用 `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:670][E: packages/opencode/src/provider/transform.ts:692][E: packages/opencode/src/provider/transform.ts:695][E: packages/opencode/src/provider/transform.ts:704]

OpenRouter branch 用 `reasoning.effort`;AI Gateway branch 返回 OpenAI-compatible style 的 `reasoningEffort` variants。[E: packages/opencode/src/provider/transform.ts:709][E: packages/opencode/src/provider/transform.ts:715][E: packages/opencode/src/provider/transform.ts:718][E: packages/opencode/src/provider/transform.ts:729]

## 设计动机

V1 provider transforms 存在是因为 AI SDK abstraction 不完全屏蔽 provider wire 差异:不同 provider 对空 content、tool id charset、reasoning control、cache control、store/itemId 的要求不同。[I] registry 在把 models.dev/config model 合成 V1 model 时调用 `ProviderTransform.variants`,说明 variants 是 model catalog 的一部分,不是 runtime 临时开关。[E: packages/opencode/src/provider/provider.ts:1448][E: packages/opencode/src/provider/provider.ts:1449]

## 易错点

- 这里是 V1 AI SDK transform,不是 `packages/llm` native protocol adapter;不要把 `ProviderTransform.options` 和 native route defaults 混写。[I]
- `store=false` 会影响 Responses item metadata;transform 在相关 provider options 中显式删除 `itemId`。[E: packages/opencode/src/provider/transform.ts:464][E: packages/opencode/src/provider/transform.ts:471]
- reasoning variants 表不是静态配置文件,而是按 model capability、model id、npm package 动态生成。[E: packages/opencode/src/provider/transform.ts:665]

## Sources
- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts

## Related
- ref.reasoning-variant-tables
