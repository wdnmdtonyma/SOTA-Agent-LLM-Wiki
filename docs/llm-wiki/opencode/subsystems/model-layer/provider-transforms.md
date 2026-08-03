---
id: model-layer.provider-transforms
title: Provider Transforms
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/provider/transform.ts
  - packages/opencode/src/provider/provider.ts
  - patches/@ai-sdk%2Fmistral@3.0.51.patch
  - packages/opencode/test/provider/transform.test.ts
  - packages/core/test/provider-mistral.test.ts
  - packages/opencode/test/session/llm.test.ts
symbols: [ProviderTransform.message, ProviderTransform.reasoningVariants, ProviderTransform.variants, ProviderTransform.options, ProviderTransform.temperature, ProviderTransform.topP, ProviderTransform.topK]
related: [ref.reasoning-variant-tables]
evidence: explicit
status: verified
updated: 89130db6b0
---

> V1 provider transforms 是 AI SDK request 的 provider-specific normalization 层:它修 message content、cache hints、providerOptions key、Responses item metadata、reasoning variants、default generation/provider options,让同一条 V1 session loop 能喂给不同 AI SDK provider。

## 能回答的问题
- 为什么 V1 message 发送前会按 provider 改写?
- cache control 是如何选中消息和 content part 的?
- reasoning variants 是从哪里产生的?
- GPT-5/OpenAI/Copilot 的默认 provider options 在哪里设?
- providerOptions key 为什么有时要从 providerID 改成 SDK key?

## Message Transform Pipeline

`message(msgs, model, options)` 的顺序是:先 `unsupportedParts`,再 `normalizeMessages`,按模型与 SDK 决定是否注入 cache breakpoints,然后 remap providerOptions key,最后在 Responses store 不为 true 时剥离 itemId。[E: packages/opencode/src/provider/transform.ts:464][E: packages/opencode/src/provider/transform.ts:465][E: packages/opencode/src/provider/transform.ts:466][E: packages/opencode/src/provider/transform.ts:486][E: packages/opencode/src/provider/transform.ts:497][E: packages/opencode/src/provider/transform.ts:508]

`unsupportedParts` 会根据 model capabilities 把不支持的 file/image part 替换成 error text,避免把 provider 不接受的媒体直接传给 AI SDK。[E: packages/opencode/src/provider/transform.ts:408][E: packages/opencode/src/provider/transform.ts:438]

`normalizeMessages` 做多 provider hack:Anthropic/Bedrock 会过滤空 text/reasoning content,Claude toolCallId 会 scrub 到 `[a-zA-Z0-9_-]`；Mistral family（provider ID 为 `mistral`，或 API ID 含 mistral/devstral/codestral/pixtral/mixtral）把 toolCallId 压成 9 位 alnum，并在 tool 与 user 消息之间插 assistant `"Done."`；DeepSeek 会给 assistant 补空 reasoning。[E: packages/opencode/src/provider/transform.ts:168][E: packages/opencode/src/provider/transform.ts:220][E: packages/opencode/src/provider/transform.ts:242][E: packages/opencode/src/provider/transform.ts:252][E: packages/opencode/src/provider/transform.ts:260][E: packages/opencode/src/provider/transform.ts:293][E: packages/opencode/src/provider/transform.ts:303][E: packages/opencode/src/provider/transform.ts:314]

`applyCaching` 选择前两个 system message 与最后两个 non-system message,并给 Anthropic/OpenRouter/Bedrock/OpenAI-compatible/Copilot/Alibaba 等 provider 写对应 providerOptions cache controls。[E: packages/opencode/src/provider/transform.ts:357][E: packages/opencode/src/provider/transform.ts:378] 但 Anthropic/Vertex-Anthropic SDK 的 request options 已带 `cacheControl` 时，transform 会跳过这组手工 breakpoints；代码只证明“不再注入”，不证明服务端一定产生 cache hit。[E: packages/opencode/src/provider/transform.ts:467][E: packages/opencode/src/provider/transform.ts:469][E: packages/opencode/src/provider/transform.ts:480][E: packages/opencode/test/provider/transform.test.ts:3115]

providerOptions key remap 用 `sdkKey(model.api.npm)`:如果 SDK 期望的 key 与 `model.providerID` 不同,会把 providerOptions 从 stored providerID 搬到 SDK key。[E: packages/opencode/src/provider/transform.ts:486][E: packages/opencode/src/provider/transform.ts:497]

Responses item id 剥离只在 `options.store !== true` 且 npm 是 OpenAI/Azure/Bedrock Mantle 这类 Responses path 时做,并删除 provider options 中的 `itemId`。[E: packages/opencode/src/provider/transform.ts:502][E: packages/opencode/src/provider/transform.ts:509]

## Generation Defaults

`temperature`/`topP`/`topK` 现在统一以 `model.api.id` 的小写值做 heuristic，而不是 catalog alias `model.id`。例如 qwen temperature 0.55、Claude temperature undefined、MiniMax topK 按 m2 variant 20/40。[E: packages/opencode/src/provider/transform.ts:526][E: packages/opencode/src/provider/transform.ts:527][E: packages/opencode/src/provider/transform.ts:529][E: packages/opencode/src/provider/transform.ts:530][E: packages/opencode/src/provider/transform.ts:546][E: packages/opencode/src/provider/transform.ts:547][E: packages/opencode/src/provider/transform.ts:550][E: packages/opencode/src/provider/transform.ts:557][E: packages/opencode/src/provider/transform.ts:558][E: packages/opencode/src/provider/transform.ts:559][E: packages/opencode/src/provider/transform.ts:560][E: packages/opencode/src/provider/transform.ts:561]

Gemini sampling defaults 不再对所有包含 `gemini` 的 ID 生效。当前 whitelist patterns 是 2.5、3 flash/pro、3.1、以及非 lite 的 3.5 flash，它们保留 temperature=1、topP=0.95、topK=64；未命中这些 pattern 的 ID（测试例包括 3.5 flash-lite、3.6、4 与 `gemini-future`）省略三个 deprecated controls。它不是“未来版本”判断：例如名字里带 future 但仍命中 2.5/3.1 pattern 的 ID 仍会注入 defaults。测试还固定 configured alias 必须按 API model ID 判定。[E: packages/opencode/src/provider/transform.ts:519][E: packages/opencode/src/provider/transform.ts:520][E: packages/opencode/src/provider/transform.ts:521][E: packages/opencode/src/provider/transform.ts:522][E: packages/opencode/src/provider/transform.ts:523][E: packages/opencode/src/provider/transform.ts:531][E: packages/opencode/src/provider/transform.ts:532][E: packages/opencode/src/provider/transform.ts:549][E: packages/opencode/src/provider/transform.ts:550][E: packages/opencode/src/provider/transform.ts:563][E: packages/opencode/src/provider/transform.ts:564][E: packages/opencode/test/provider/transform.test.ts:3212][E: packages/opencode/test/provider/transform.test.ts:3214][E: packages/opencode/test/provider/transform.test.ts:3216][E: packages/opencode/test/provider/transform.test.ts:3217][E: packages/opencode/test/provider/transform.test.ts:3219][E: packages/opencode/test/provider/transform.test.ts:3220][E: packages/opencode/test/provider/transform.test.ts:3221][E: packages/opencode/test/provider/transform.test.ts:3225][E: packages/opencode/test/provider/transform.test.ts:3229][E: packages/opencode/test/provider/transform.test.ts:3231][E: packages/opencode/test/provider/transform.test.ts:3234][E: packages/opencode/test/provider/transform.test.ts:3237][E: packages/opencode/test/provider/transform.test.ts:3238][E: packages/opencode/test/provider/transform.test.ts:3239][E: packages/opencode/test/provider/transform.test.ts:3243][E: packages/opencode/test/provider/transform.test.ts:3244][E: packages/opencode/test/provider/transform.test.ts:3245][E: packages/opencode/test/provider/transform.test.ts:3246][E: packages/opencode/test/provider/transform.test.ts:3248][E: packages/opencode/test/provider/transform.test.ts:3249][E: packages/opencode/test/provider/transform.test.ts:3250][E: packages/opencode/test/provider/transform.test.ts:3251]

`options` 是 provider default options 聚合器:它可以关 tool streaming、设置 store false、按 SDK 选择 prompt cache key、设置 gateway usage/caching、Gemini thinkingConfig、Alibaba `enable_thinking`、Kimi adaptive thinking，以及 GPT-5 与 Azure `gpt-5.5` 的 reasoningSummary/reasoningEffort/textVerbosity/encrypted reasoning include 等。[E: packages/opencode/src/provider/transform.ts:1151][E: packages/opencode/src/provider/transform.ts:1162][E: packages/opencode/src/provider/transform.ts:1173][E: packages/opencode/src/provider/transform.ts:1180][E: packages/opencode/src/provider/transform.ts:1211][E: packages/opencode/src/provider/transform.ts:1231][E: packages/opencode/src/provider/transform.ts:1254][E: packages/opencode/src/provider/transform.ts:1269][E: packages/opencode/src/provider/transform.ts:1273][E: packages/opencode/src/provider/transform.ts:1287][E: packages/opencode/src/provider/transform.ts:1302]

重要默认:

- OpenAI、`@ai-sdk/openai`、GitHub Copilot、Bedrock Mantle 和 xAI 默认 `store=false`。[E: packages/opencode/src/provider/transform.ts:1167][E: packages/opencode/src/provider/transform.ts:1168][E: packages/opencode/src/provider/transform.ts:1169][E: packages/opencode/src/provider/transform.ts:1170][E: packages/opencode/src/provider/transform.ts:1171][E: packages/opencode/src/provider/transform.ts:1173]
- Azure 默认 `store=false`；和 OpenAI、xAI、Mistral、Venice 一样，在没有 `setCacheKey:false` 时用 session id 做 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1176][E: packages/opencode/src/provider/transform.ts:1177][E: packages/opencode/src/provider/transform.ts:1254][E: packages/opencode/src/provider/transform.ts:1258][E: packages/opencode/src/provider/transform.ts:1265]
- DeepInfra/Cerebras 使用 snake-case `prompt_cache_key`；其他 SDK 只有显式 `setCacheKey:true` 才加入 camel-case key。OpenRouter 不在默认列表中。[E: packages/opencode/src/provider/transform.ts:1255][E: packages/opencode/src/provider/transform.ts:1256][E: packages/opencode/src/provider/transform.ts:1263][E: packages/opencode/test/provider/transform.test.ts:270][E: packages/opencode/test/provider/transform.test.ts:291]
- Meta provider 在 `@ai-sdk/openai` path 上只默认 `reasoningSummary=auto` 并 include encrypted reasoning，不再强制 `reasoningEffort=xhigh`。[E: packages/opencode/src/provider/transform.ts:1206][E: packages/opencode/src/provider/transform.ts:1207][E: packages/opencode/src/provider/transform.ts:1208]
- API ID 包含 `gpt-5`、但不包含精确 substring `gpt-5-chat` 或 `gpt-5-pro` 时，默认 `reasoningEffort=medium`;OpenAI/Azure/Copilot/Bedrock Mantle 还默认 `reasoningSummary=auto`。因此不能把例外泛化为所有 chat/pro family。Azure npm + API ID 包含 `gpt-5.5` 会在 GPT-5 reasoning-default 段只新增 summary 后提前返回，跳过通用 effort/textVerbosity/include；函数此前设置的 store/cache key 仍保留。[E: packages/opencode/src/provider/transform.ts:1176][E: packages/opencode/src/provider/transform.ts:1177][E: packages/opencode/src/provider/transform.ts:1254][E: packages/opencode/src/provider/transform.ts:1265][E: packages/opencode/src/provider/transform.ts:1273][E: packages/opencode/src/provider/transform.ts:1275][E: packages/opencode/src/provider/transform.ts:1278][E: packages/opencode/src/provider/transform.ts:1279][E: packages/opencode/src/provider/transform.ts:1280][E: packages/opencode/src/provider/transform.ts:1287][E: packages/opencode/src/provider/transform.ts:1289][E: packages/opencode/src/provider/transform.ts:1297][E: packages/opencode/src/provider/transform.ts:1298][E: packages/opencode/src/provider/transform.ts:1299][E: packages/opencode/src/provider/transform.ts:1300][E: packages/opencode/src/provider/transform.ts:1302]

## Reasoning Variants

models.dev 模型现在可以用 `reasoning_options` 声明 `effort`、`toggle` 或 `budget_tokens` 能力;`reasoningVariants(model, target)` 会优先把这些 catalog 能力翻译成 provider-specific variants。它返回 `undefined` 时回退到 heuristic `variants(target)`;这可能是字段缺失,也可能是 toggle/budget 对当前 npm package 没有映射,而显式空数组会得到空 variants。[E: packages/opencode/src/provider/transform.ts:1642][E: packages/opencode/src/provider/transform.ts:1643][E: packages/opencode/src/provider/transform.ts:1644][E: packages/opencode/src/provider/transform.ts:1645][E: packages/opencode/src/provider/transform.ts:1647][E: packages/opencode/src/provider/transform.ts:1650][E: packages/opencode/src/provider/transform.ts:1651][E: packages/opencode/src/provider/transform.ts:1652][E: packages/opencode/src/provider/transform.ts:1654][E: packages/opencode/src/provider/transform.ts:1689][E: packages/opencode/src/provider/transform.ts:1690]

heuristic `variants(model)` 首先要求 `model.capabilities.reasoning`,没有 reasoning capability 直接返回空对象。[E: packages/opencode/src/provider/transform.ts:721][E: packages/opencode/src/provider/transform.ts:722]

变体生成是 provider/npm/model-id 组合规则,不是统一标准字段。例如 MiniMax M3 的 nvidia/lilac 分支用 `chat_template_kwargs.thinking_mode`，其余 Anthropic/OpenAI-compatible 分支用 disabled/adaptive thinking；Kimi heuristic 在 Anthropic/Vertex-Anthropic path 上先生成五档 adaptive+summarized variants，其他 Kimi path 才可能落入 suppress；grok-3-mini 在 OpenRouter 下用 `{ reasoning: { effort } }`,非 OpenRouter 用 `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:728][E: packages/opencode/src/provider/transform.ts:732][E: packages/opencode/src/provider/transform.ts:738][E: packages/opencode/src/provider/transform.ts:765][E: packages/opencode/src/provider/transform.ts:773][E: packages/opencode/src/provider/transform.ts:788][E: packages/opencode/src/provider/transform.ts:791][E: packages/opencode/src/provider/transform.ts:796]

Claude adaptive classification is API-ID heuristic: 4.7+、major >4，以及无法解析版本但含 `claude-` 的 future alias 会获得 `low/medium/high/xhigh/max` adaptive variants，并请求 summarized display；4.6 仍是四档且不显式请求 display。dated Claude 4 ID 的日期不会被误判成 minor version。[E: packages/opencode/src/provider/transform.ts:649][E: packages/opencode/src/provider/transform.ts:653][E: packages/opencode/src/provider/transform.ts:654][E: packages/opencode/src/provider/transform.ts:657][E: packages/opencode/src/provider/transform.ts:664][E: packages/opencode/src/provider/transform.ts:673][E: packages/opencode/src/provider/transform.ts:678][E: packages/opencode/test/provider/transform.test.ts:4718][E: packages/opencode/test/provider/transform.test.ts:4769]

Mistral reasoning 只为 Small 4 / Medium 3.5 identifiers 输出 `high` effort；同时 pinned AI SDK patch 把 `promptCacheKey` 序列化成 wire `prompt_cache_key`，保留 native thinking（含 references/signature）到 provider metadata，并在后续 assistant history 恢复 structured content。[E: packages/opencode/src/provider/transform.ts:1077][E: packages/opencode/src/provider/transform.ts:1089][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:67][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:81][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:85][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:145][E: packages/core/test/provider-mistral.test.ts:4][E: packages/core/test/provider-mistral.test.ts:30][E: packages/core/test/provider-mistral.test.ts:134]

OpenRouter branch 用 `reasoning.effort`;AI Gateway branch 返回 OpenAI-compatible style 的 `reasoningEffort` variants。[E: packages/opencode/src/provider/transform.ts:802][E: packages/opencode/src/provider/transform.ts:807][E: packages/opencode/src/provider/transform.ts:810][E: packages/opencode/src/provider/transform.ts:819][E: packages/opencode/src/provider/transform.ts:821]

## 设计动机

V1 provider transforms 存在是因为 AI SDK abstraction 不完全屏蔽 provider wire 差异:不同 provider 对空 content、tool id charset、reasoning control、cache control、store/itemId 的要求不同。[I] registry 在把 models.dev/config model 合成 V1 model 时先使用 catalog `reasoning_options`,再回退 heuristic variants,说明 variants 是 model catalog 的一部分,不是 runtime 临时开关。[E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1261][E: packages/opencode/src/provider/provider.ts:1508][E: packages/opencode/src/provider/provider.ts:1512][E: packages/opencode/src/provider/provider.ts:1513][E: packages/opencode/src/provider/provider.ts:1515]

## 易错点

- 这里是 V1 AI SDK transform,不是 `packages/llm` native protocol adapter;不要把 `ProviderTransform.options` 和 native route defaults 混写。[I]
- `store=false` 会影响 Responses item metadata;transform 在相关 provider options 中显式删除 `itemId`。[E: packages/opencode/src/provider/transform.ts:502][E: packages/opencode/src/provider/transform.ts:509]
- reasoning variants 优先由 models.dev `reasoning_options` 声明并按 npm package 翻译;`reasoningVariants()` 返回 `undefined` 时才按 model capability、model id、npm package 走 heuristic。[E: packages/opencode/src/provider/transform.ts:1642][E: packages/opencode/src/provider/transform.ts:1644][E: packages/opencode/src/provider/transform.ts:1652][E: packages/opencode/src/provider/transform.ts:1654][E: packages/opencode/src/provider/transform.ts:1707]
- Gemini 的 alias/display ID 不能决定 sampling defaults；三个 transform 都明确读取 `model.api.id`。是否注入完全由当前 whitelist regex 命中决定，不能按“当前/未来版本”概括。[E: packages/opencode/src/provider/transform.ts:519][E: packages/opencode/src/provider/transform.ts:523][E: packages/opencode/src/provider/transform.ts:527][E: packages/opencode/src/provider/transform.ts:547][E: packages/opencode/src/provider/transform.ts:558][E: packages/opencode/test/provider/transform.test.ts:3243][E: packages/opencode/test/provider/transform.test.ts:3244][E: packages/opencode/test/provider/transform.test.ts:3245][E: packages/opencode/test/provider/transform.test.ts:3246][E: packages/opencode/test/provider/transform.test.ts:3248][E: packages/opencode/test/provider/transform.test.ts:3249][E: packages/opencode/test/provider/transform.test.ts:3250][E: packages/opencode/test/provider/transform.test.ts:3251]

## Sources
- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- patches/@ai-sdk%2Fmistral@3.0.51.patch
- packages/opencode/test/provider/transform.test.ts
- packages/core/test/provider-mistral.test.ts
- packages/opencode/test/session/llm.test.ts

## Related
- ref.reasoning-variant-tables
