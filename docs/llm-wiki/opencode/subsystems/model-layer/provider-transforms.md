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
updated: 9f69463f1d
---

> V1 provider transforms 是 AI SDK request 的 provider-specific normalization 层:它修 message content、cache hints、providerOptions key、Responses item metadata、reasoning variants、default generation/provider options,让同一条 V1 session loop 能喂给不同 AI SDK provider。

## 能回答的问题
- 为什么 V1 message 发送前会按 provider 改写?
- Bedrock / Anthropic 分别怎样决定是否保留 reasoning part?
- cache control 是如何选中消息和 content part 的?
- Qwen / Gemini / DeepSeek V4 Flash 的 sampling 默认从哪里来?
- `textVerbosity: "low"` 会注入给哪些 npm package?
- reasoning variants 是从哪里产生的?

## Message Transform Pipeline

`message(msgs, model, options)` 的顺序是:先 `unsupportedParts`,再 `normalizeMessages`,按模型与 SDK 决定是否注入 cache breakpoints,然后 remap providerOptions key,最后在 Responses store 不为 true 时剥离 itemId。[E: packages/opencode/src/provider/transform.ts:466][E: packages/opencode/src/provider/transform.ts:467][E: packages/opencode/src/provider/transform.ts:483][E: packages/opencode/src/provider/transform.ts:487][E: packages/opencode/src/provider/transform.ts:498][E: packages/opencode/src/provider/transform.ts:509]

`unsupportedParts` 会根据 model capabilities 把不支持的 file/image part 替换成 error text,避免把 provider 不接受的媒体直接传给 AI SDK。[E: packages/opencode/src/provider/transform.ts:410][E: packages/opencode/src/provider/transform.ts:439]

`normalizeMessages` 做多 provider hack:

- Anthropic SDK 会过滤空 text,以及既没有非空 text、也没有 `anthropic.signature` / `anthropic.redactedData` 的 reasoning。[E: packages/opencode/src/provider/transform.ts:170][E: packages/opencode/src/provider/transform.ts:182][E: packages/opencode/src/provider/transform.ts:185][E: packages/opencode/src/provider/transform.ts:186]
- Bedrock (`@ai-sdk/amazon-bedrock`) **只保留**带 `signature` / `redactedContent` / `redactedData` 的 reasoning;非空但未签名的 text-only reasoning 会被丢掉。metadata 先读 `providerOptions[model.providerID]`,再 fallback `providerOptions.bedrock`。[E: packages/opencode/src/provider/transform.ts:198][E: packages/opencode/src/provider/transform.ts:213][E: packages/opencode/src/provider/transform.ts:214] 测试固定这三字段在 `bedrock` / `amazon-bedrock` / 自定义 providerID 命名空间下都能保住空 text reasoning;stored `amazon-bedrock` 空对象会盖掉 `bedrock.signature`,整条 reasoning 被滤掉。[E: packages/opencode/test/provider/transform.test.ts:2433][E: packages/opencode/test/provider/transform.test.ts:2462][E: packages/opencode/test/provider/transform.test.ts:2470]
- Claude toolCallId 会 scrub 到 `[a-zA-Z0-9_-]`。[E: packages/opencode/src/provider/transform.ts:224][E: packages/opencode/src/provider/transform.ts:225]
- Mistral family（provider ID 为 `mistral`,或 API ID 含 mistral/devstral/codestral/pixtral/mixtral）把 toolCallId 压成 9 位 alnum,并在 tool 与 user 消息之间插 assistant `"Done."`。[E: packages/opencode/src/provider/transform.ts:255][E: packages/opencode/src/provider/transform.ts:261][E: packages/opencode/src/provider/transform.ts:288][E: packages/opencode/src/provider/transform.ts:294]
- DeepSeek 会给缺少 reasoning part 的 assistant 补空 reasoning。[E: packages/opencode/src/provider/transform.ts:304][E: packages/opencode/src/provider/transform.ts:309]

`applyCaching` 选择前两个 system message 与最后两个 non-system message,并给 Anthropic/OpenRouter/Bedrock/OpenAI-compatible/Copilot/Alibaba 等 provider 写对应 providerOptions cache controls。[E: packages/opencode/src/provider/transform.ts:359][E: packages/opencode/src/provider/transform.ts:360][E: packages/opencode/src/provider/transform.ts:378] 但 Anthropic/Vertex-Anthropic SDK 的 request options 已带 `cacheControl` 时,transform 会跳过这组手工 breakpoints;代码只证明“不再注入”,不证明服务端一定产生 cache hit。[E: packages/opencode/src/provider/transform.ts:468][E: packages/opencode/src/provider/transform.ts:470][E: packages/opencode/src/provider/transform.ts:481][E: packages/opencode/test/provider/transform.test.ts:3265][E: packages/opencode/test/provider/transform.test.ts:3276]

providerOptions key remap 用 `sdkKey(model.api.npm)`:如果 SDK 期望的 key 与 `model.providerID` 不同,会把 providerOptions 从 stored providerID 搬到 SDK key。`merge-gateway-ai-sdk-provider` 映成 `mergeGateway`。[E: packages/opencode/src/provider/transform.ts:87][E: packages/opencode/src/provider/transform.ts:88][E: packages/opencode/src/provider/transform.ts:487][E: packages/opencode/src/provider/transform.ts:493]

Responses item id 剥离只在 `options.store !== true` 且 npm 是 `@ai-sdk/openai` / `@ai-sdk/azure` / `@ai-sdk/amazon-bedrock/mantle` / `@ai-sdk/github-copilot` 时做,并删除对应 SDK key 下的 `itemId`。[E: packages/opencode/src/provider/transform.ts:503][E: packages/opencode/src/provider/transform.ts:505][E: packages/opencode/src/provider/transform.ts:512]

## Generation Defaults

`temperature` / `topP` / `topK` 统一以 `model.api.id` 的小写值做 heuristic,而不是 catalog alias `model.id`。[E: packages/opencode/src/provider/transform.ts:528][E: packages/opencode/src/provider/transform.ts:547][E: packages/opencode/src/provider/transform.ts:563]

Qwen **不再**写死 `temperature=0.55` / `topP=1`。`temperature()` / `topP()` / `topK()` 对 Qwen ID 都落到最终 `undefined`;测试覆盖 `Qwen3.8-27B` 与 `qwen3-coder-30b-a3b-instruct`。[E: packages/opencode/src/provider/transform.ts:543][E: packages/opencode/src/provider/transform.ts:559][E: packages/opencode/src/provider/transform.ts:570][E: packages/opencode/test/provider/transform.test.ts:3349][E: packages/opencode/test/provider/transform.test.ts:3355]

仍有的 heuristic:Claude temperature 为 `undefined`;MiniMax M2 topK 按 m2 variant 20/40;north-mini-code temperature 1.0。[E: packages/opencode/src/provider/transform.ts:530][E: packages/opencode/src/provider/transform.ts:529][E: packages/opencode/src/provider/transform.ts:565][E: packages/opencode/src/provider/transform.ts:566]

Gemini sampling defaults 不再对所有包含 `gemini` 的 ID 生效。当前 whitelist patterns 是 2.5、3 flash/pro、3.1、以及非 lite 的 3.5 flash,它们保留 temperature=1、topP=0.95、topK=64;未命中这些 pattern 的 ID（测试例包括 3.5 flash-lite、3.6、4 与 `gemini-future`）省略三个 deprecated controls。它不是“未来版本”判断:例如名字里带 future 但仍命中 2.5/3.1 pattern 的 ID 仍会注入 defaults。测试还固定 configured alias 必须按 API model ID 判定。[E: packages/opencode/src/provider/transform.ts:520][E: packages/opencode/src/provider/transform.ts:532][E: packages/opencode/src/provider/transform.ts:549][E: packages/opencode/src/provider/transform.ts:569][E: packages/opencode/test/provider/transform.test.ts:3374][E: packages/opencode/test/provider/transform.test.ts:3382][E: packages/opencode/test/provider/transform.test.ts:3399][E: packages/opencode/test/provider/transform.test.ts:3405]

DeepSeek V4 Flash 的 `topP=0.95` 不是“凡是 flash 都注入”。`topP()` 只在 API ID 包含 `deepseek-v4-flash-0731` / `deepseek-v4-flash:0731`,或 API ID 包含 `deepseek-v4-flash` 且 `providerID` 为 `deepseek` / 以 `opencode` 开头（含 `opencode-go`）时返回 0.95;temperature 与 topK 仍不设。测试固定 OpenRouter/Vercel 上的未带 dated suffix 的 `deepseek/deepseek-v4-flash` 以及 custom `DeepSeek-V4-Flash` 保持三个 sampling 都为 undefined。[E: packages/opencode/src/provider/transform.ts:554][E: packages/opencode/src/provider/transform.ts:555][E: packages/opencode/src/provider/transform.ts:557][E: packages/opencode/test/provider/transform.test.ts:3432][E: packages/opencode/test/provider/transform.test.ts:3434][E: packages/opencode/test/provider/transform.test.ts:3442]

`options` 是 provider default options 聚合器:它可以关 tool streaming、设置 store false、按 SDK 选择 prompt cache key、设置 gateway usage/caching、Gemini thinkingConfig、Alibaba `enable_thinking`、Kimi adaptive thinking,以及 GPT-5 与 Azure Completions 路径的 reasoningEffort/reasoningSummary/textVerbosity/encrypted reasoning include 等。[E: packages/opencode/src/provider/transform.ts:1156][E: packages/opencode/src/provider/transform.ts:1167][E: packages/opencode/src/provider/transform.ts:1178][E: packages/opencode/src/provider/transform.ts:1182][E: packages/opencode/src/provider/transform.ts:1186][E: packages/opencode/src/provider/transform.ts:1218][E: packages/opencode/src/provider/transform.ts:1241][E: packages/opencode/src/provider/transform.ts:1256][E: packages/opencode/src/provider/transform.ts:1270][E: packages/opencode/src/provider/transform.ts:1286][E: packages/opencode/src/provider/transform.ts:1291][E: packages/opencode/src/provider/transform.ts:1298][E: packages/opencode/src/provider/transform.ts:1313]

重要默认:

- OpenAI、`@ai-sdk/openai`、GitHub Copilot、Bedrock Mantle 和 xAI 默认 `store=false`。[E: packages/opencode/src/provider/transform.ts:1172][E: packages/opencode/src/provider/transform.ts:1173][E: packages/opencode/src/provider/transform.ts:1174][E: packages/opencode/src/provider/transform.ts:1175][E: packages/opencode/src/provider/transform.ts:1176][E: packages/opencode/src/provider/transform.ts:1178]
- Azure 默认 `store=false`;和 OpenAI、xAI、Mistral、Venice 一样,在没有 `setCacheKey:false` 时用 session id 做 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1182][E: packages/opencode/src/provider/transform.ts:1259][E: packages/opencode/src/provider/transform.ts:1263][E: packages/opencode/src/provider/transform.ts:1264][E: packages/opencode/src/provider/transform.ts:1265][E: packages/opencode/src/provider/transform.ts:1266][E: packages/opencode/src/provider/transform.ts:1267][E: packages/opencode/src/provider/transform.ts:1270]
- DeepInfra/Cerebras 使用 snake-case `prompt_cache_key`;其他 SDK 只有显式 `setCacheKey:true` 才加入 camel-case key。OpenRouter 不在默认列表中。[E: packages/opencode/src/provider/transform.ts:1260][E: packages/opencode/src/provider/transform.ts:1261][E: packages/opencode/src/provider/transform.ts:1268][E: packages/opencode/test/provider/transform.test.ts:271][E: packages/opencode/test/provider/transform.test.ts:292]
- Meta provider 在 `@ai-sdk/openai` path 上只默认 `reasoningSummary=auto` 并 include encrypted reasoning,不再强制 `reasoningEffort=xhigh`。[E: packages/opencode/src/provider/transform.ts:1211][E: packages/opencode/src/provider/transform.ts:1212][E: packages/opencode/src/provider/transform.ts:1213]
- API ID 包含 `gpt-5`、但不包含精确 substring `gpt-5-chat` 或 `gpt-5-pro` 时,默认 `reasoningEffort=medium`;OpenAI/Azure/Copilot/Bedrock Mantle 还默认 `reasoningSummary=auto`。因此不能把例外泛化为所有 chat/pro family。[E: packages/opencode/src/provider/transform.ts:1289][E: packages/opencode/src/provider/transform.ts:1290][E: packages/opencode/src/provider/transform.ts:1291][E: packages/opencode/src/provider/transform.ts:1293][E: packages/opencode/src/provider/transform.ts:1294][E: packages/opencode/src/provider/transform.ts:1295][E: packages/opencode/src/provider/transform.ts:1296][E: packages/opencode/src/provider/transform.ts:1298]
- `textVerbosity: "low"` **只**在 API ID 含 `gpt-5.`、不含 `codex`、不含 `-chat`,且 `model.api.npm` 是 `@ai-sdk/openai` 或 `@ai-sdk/amazon-bedrock/mantle` 时注入。Azure、Copilot、`@ai-sdk/openai-compatible` 都不会走这条默认。[E: packages/opencode/src/provider/transform.ts:1308][E: packages/opencode/src/provider/transform.ts:1311][E: packages/opencode/src/provider/transform.ts:1313][E: packages/opencode/test/provider/transform.test.ts:489][E: packages/opencode/test/provider/transform.test.ts:509][E: packages/opencode/test/provider/transform.test.ts:527]
- Azure Completions 提前返回只看 `@ai-sdk/azure` 加上 `providerOptions.useCompletionUrls`,不再用 API ID 是否包含字面量 `gpt-5.5` 做门。`gpt-(\d+)\.(\d+)` 解析出 major>5 或 major=5 且 minor>=5 时跳过 `reasoningEffort`;更旧的带小数点 GPT 仍写 `reasoningEffort=medium`。两条路径都 `return result`,因此 store/cache key 保留,但不会进入后面的 GPT-5 summary/include/textVerbosity 段。没有 `useCompletionUrls` 的 Azure gpt-5.5+ 仍走通用 GPT-5 defaults,测试期望 `reasoningSummary=auto` 与 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1280][E: packages/opencode/src/provider/transform.ts:1281][E: packages/opencode/src/provider/transform.ts:1282][E: packages/opencode/src/provider/transform.ts:1284][E: packages/opencode/src/provider/transform.ts:1286][E: packages/opencode/test/provider/transform.test.ts:256][E: packages/opencode/test/provider/transform.test.ts:267][E: packages/opencode/test/provider/transform.test.ts:268][E: packages/opencode/test/provider/transform.test.ts:686][E: packages/opencode/test/provider/transform.test.ts:693][E: packages/opencode/test/provider/transform.test.ts:706][E: packages/opencode/test/provider/transform.test.ts:713]

## Reasoning Variants

models.dev 模型现在可以用 `reasoning_options` 声明 `effort`、`toggle` 或 `budget_tokens` 能力;`reasoningVariants(model, target)` 会优先把这些 catalog 能力翻译成 provider-specific variants。它返回 `undefined` 时回退到 heuristic `variants(target)`;这可能是字段缺失,也可能是 toggle/budget 对当前 npm package 没有映射,而显式空数组会得到空 variants。[E: packages/opencode/src/provider/transform.ts:1653][E: packages/opencode/src/provider/transform.ts:1655][E: packages/opencode/src/provider/transform.ts:1656][E: packages/opencode/src/provider/transform.ts:1658][E: packages/opencode/src/provider/transform.ts:1663][E: packages/opencode/src/provider/transform.ts:1665][E: packages/opencode/src/provider/transform.ts:1701]

heuristic `variants(model)` 首先要求 `model.capabilities.reasoning`,没有 reasoning capability 直接返回空对象。[E: packages/opencode/src/provider/transform.ts:726][E: packages/opencode/src/provider/transform.ts:727]

变体生成是 provider/npm/model-id 组合规则,不是统一标准字段。例如 MiniMax M3 的 nvidia/lilac 分支用 `chat_template_kwargs.thinking_mode`,其余 Anthropic/OpenAI-compatible 分支用 disabled/adaptive thinking;Kimi heuristic 在 Anthropic/Vertex-Anthropic path 上先生成五档 adaptive+summarized variants,其他 Kimi path 才可能落入 suppress;grok-3-mini 在 OpenRouter 下用 `{ reasoning: { effort } }`,非 OpenRouter 用 `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:733][E: packages/opencode/src/provider/transform.ts:737][E: packages/opencode/src/provider/transform.ts:744][E: packages/opencode/src/provider/transform.ts:770][E: packages/opencode/src/provider/transform.ts:785][E: packages/opencode/src/provider/transform.ts:793][E: packages/opencode/src/provider/transform.ts:796][E: packages/opencode/src/provider/transform.ts:801]

Claude adaptive classification is API-ID heuristic: 4.7+、major >4,以及无法解析版本但含 `claude-` 的 future alias 会获得 `low/medium/high/xhigh/max` adaptive variants,并请求 summarized display;4.6 仍是四档且不显式请求 display。dated Claude 4 ID 的日期不会被误判成 minor version。[E: packages/opencode/src/provider/transform.ts:654][E: packages/opencode/src/provider/transform.ts:658][E: packages/opencode/src/provider/transform.ts:659][E: packages/opencode/src/provider/transform.ts:662][E: packages/opencode/src/provider/transform.ts:670][E: packages/opencode/src/provider/transform.ts:678][E: packages/opencode/src/provider/transform.ts:684][E: packages/opencode/test/provider/transform.test.ts:4917][E: packages/opencode/test/provider/transform.test.ts:4965]

Mistral reasoning 只为 Small 4 / Medium 3.5 identifiers 输出 `high` effort;同时 pinned AI SDK patch 把 `promptCacheKey` 序列化成 wire `prompt_cache_key`,保留 native thinking（含 reference/signature）到 provider metadata,并在后续 assistant history 恢复 structured content。[E: packages/opencode/src/provider/transform.ts:1082][E: packages/opencode/src/provider/transform.ts:1096][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:75][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:85][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:97][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:149][E: packages/core/test/provider-mistral.test.ts:4][E: packages/core/test/provider-mistral.test.ts:56][E: packages/core/test/provider-mistral.test.ts:160]

OpenRouter heuristic 用 `reasoning.effort`;`ai-gateway-provider` heuristic 返回 OpenAI-compatible style 的 `reasoningEffort` variants。[E: packages/opencode/src/provider/transform.ts:807][E: packages/opencode/src/provider/transform.ts:812][E: packages/opencode/src/provider/transform.ts:822][E: packages/opencode/src/provider/transform.ts:824][E: packages/opencode/src/provider/transform.ts:826] `merge-gateway-ai-sdk-provider` 不在 heuristic `variants()` switch 里;catalog `reasoning_options` effort 经 `reasoningEffort()` 与 `@ai-sdk/openai-compatible` / `@ai-sdk/xai` / `@ai-sdk/mistral` / `@ai-sdk/groq` / `@ai-sdk/cerebras` / `@ai-sdk/deepinfra` / `@ai-sdk/togetherai` / `venice-ai-sdk-provider` / `ai-gateway-provider` 一样直接写成 `{ reasoningEffort }`,`sdkKey()` 再把 providerOptions namespace 映成 `mergeGateway`。[E: packages/opencode/src/provider/transform.ts:87][E: packages/opencode/src/provider/transform.ts:88][E: packages/opencode/src/provider/transform.ts:1765][E: packages/opencode/src/provider/transform.ts:1774][E: packages/opencode/src/provider/transform.ts:1775][E: packages/opencode/src/provider/transform.ts:1407][E: packages/opencode/src/provider/transform.ts:1414][E: packages/opencode/test/provider/transform.test.ts:3516][E: packages/opencode/test/provider/transform.test.ts:5714][E: packages/opencode/test/provider/transform.test.ts:5716]

## 设计动机

V1 provider transforms 存在是因为 AI SDK abstraction 不完全屏蔽 provider wire 差异:不同 provider 对空 content、tool id charset、reasoning control、cache control、store/itemId 的要求不同。[I] registry 在把 models.dev/config model 合成 V1 model 时,Cloudflare AI Gateway 会先把 `openai/*` / `anthropic/*` 映成 native npm,再调用 `ProviderTransform.reasoningVariants(model, base)`,失败才回退 heuristic variants,说明 variants 是 model catalog 的一部分,不是 runtime 临时开关。[E: packages/opencode/src/provider/provider.ts:1254][E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1271][E: packages/opencode/src/provider/provider.ts:1310] config model 会 merge variants,并用 `disabled` 删除具体档位。[E: packages/opencode/src/provider/provider.ts:1568][E: packages/opencode/src/provider/provider.ts:1570]

## 易错点

- 这里是 V1 AI SDK transform,不是 `packages/llm` native protocol adapter;不要把 `ProviderTransform.options` 和 native route defaults 混写。[I]
- Bedrock 与 Anthropic 的 reasoning 过滤条件不同:Anthropic 仍可因非空 text 保留;Bedrock 必须有 signature / redactedContent / redactedData。[E: packages/opencode/src/provider/transform.ts:182][E: packages/opencode/src/provider/transform.ts:214]
- `store=false` 会影响 Responses item metadata;transform 在 OpenAI/Azure/Mantle/Copilot 的 provider options 中显式删除 `itemId`。[E: packages/opencode/src/provider/transform.ts:503][E: packages/opencode/src/provider/transform.ts:505][E: packages/opencode/src/provider/transform.ts:512]
- reasoning variants 优先由 models.dev `reasoning_options` 声明并按 npm package 翻译;`reasoningVariants()` 返回 `undefined` 时才按 model capability、model id、npm package 走 heuristic。[E: packages/opencode/src/provider/transform.ts:1653][E: packages/opencode/src/provider/transform.ts:1655][E: packages/opencode/src/provider/transform.ts:1663][E: packages/opencode/src/provider/transform.ts:1665][E: packages/opencode/src/provider/transform.ts:726]
- Gemini 的 alias/display ID 不能决定 sampling defaults;三个 transform 都明确读取 `model.api.id`。是否注入完全由当前 whitelist regex 命中决定,不能按“当前/未来版本”概括。[E: packages/opencode/src/provider/transform.ts:520][E: packages/opencode/src/provider/transform.ts:528][E: packages/opencode/src/provider/transform.ts:547][E: packages/opencode/src/provider/transform.ts:563][E: packages/opencode/test/provider/transform.test.ts:3405][E: packages/opencode/test/provider/transform.test.ts:3407]
- `textVerbosity: "low"` 不是“凡 gpt-5.x 且非 Azure 就注入”;门在 `model.api.npm`。[E: packages/opencode/src/provider/transform.ts:1311][E: packages/opencode/src/provider/transform.ts:1313]

## Sources
- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- patches/@ai-sdk%2Fmistral@3.0.51.patch
- packages/opencode/test/provider/transform.test.ts
- packages/core/test/provider-mistral.test.ts
- packages/opencode/test/session/llm.test.ts

## 相关
- ref.reasoning-variant-tables
