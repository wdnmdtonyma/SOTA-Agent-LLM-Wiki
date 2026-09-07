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
symbols:
  - ProviderTransform.message
  - ProviderTransform.reasoningVariants
  - ProviderTransform.variants
  - ProviderTransform.options
  - ProviderTransform.providerOptions
  - ProviderTransform.temperature
  - ProviderTransform.topP
  - ProviderTransform.topK
  - anthropicBlockBinding
  - anthropicBindsThinking
  - ANTHROPIC_BLOCK_BINDING
related: [ref.reasoning-variant-tables]
evidence: explicit
status: verified
updated: e207624c48
---

> V1 provider transforms 是 AI SDK request 的 provider-specific normalization 层：它修 message content、cache hints、providerOptions key、Responses item metadata、reasoning variants、default generation/provider options，以及 Claude 5.1+ 的 thinking `blockBinding`，让同一条 V1 session loop 能喂给不同 AI SDK provider。

## 能回答的问题
- 为什么 V1 message 发送前会按 provider 改写？
- Bedrock / Anthropic 分别怎样决定是否保留 reasoning part？
- cache control 是如何选中消息和 content part 的？
- Qwen / Gemini / DeepSeek V4 Flash 的 sampling 默认从哪里来？
- `textVerbosity: "low"` 会注入给哪些 npm package？
- Claude 5.1+ 何时注入 `thinking.blockBinding`，如何 opt-out？
- GitLab (`gitlab-ai-provider`) 的 reasoning variants 按什么 `family` 分流？
- reasoning variants 是从哪里产生的？

## 职责边界

本节点覆盖 `packages/opencode/src/provider/transform.ts` 的 V1 AI SDK 适配层，权威符号是 `ProviderTransform` 命名空间。[E: packages/opencode/src/provider/transform.ts:1909] 它不是 `packages/llm` 的 native protocol adapter；不要把 `ProviderTransform.options` 和 native route defaults 混写。[I]

registry 在合成 V1 model 时调用 `ProviderTransform.reasoningVariants` / `variants`；本节点写这些函数的语义，档位全表在 [ref.reasoning-variant-tables](../../reference/reasoning-variant-tables.md)。

## 关键文件

- `packages/opencode/src/provider/transform.ts`：message / sampling / variants / options / providerOptions / catalog 翻译。
- `packages/opencode/src/provider/provider.ts`：registry 接入 variants，Cloudflare AI Gateway 先把 `openai/*` / `anthropic/*` 映成 native npm。[E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1310]
- `packages/opencode/test/provider/transform.test.ts`：Bedrock signature replay、Qwen 无默认 sampling、`textVerbosity`、`blockBinding`、GitLab family 分流。
- `patches/@ai-sdk%2Fmistral@3.0.51.patch`：Mistral `prompt_cache_key` 与 native thinking metadata。
- Bedrock catalog effort `"none"` / OpenAI `serviceTier` 的 wire 行为分别在 `@ai-sdk/amazon-bedrock` / `@ai-sdk/openai` 的 AI SDK patch 里，**不是** `transform.ts` 新导出的 TS API。

## 数据模型

`ProviderTransform` 是纯函数命名空间，没有 Effect Service。调用面：

| 符号 | 作用 |
| --- | --- |
| `message` | 发送前改写 `ModelMessage[]` |
| `temperature` / `topP` / `topK` | 按 `model.api.id` 给 sampling 默认 |
| `options` / `smallOptions` | 默认 provider options |
| `providerOptions` | 把扁平 options 装进 SDK namespace，并接 `forceReasoning` / `anthropicBlockBinding` |
| `variants` / `reasoningVariants` | heuristic / catalog reasoning 档位 |
| `anthropicBindsThinking` / `anthropicBlockBinding` / `ANTHROPIC_BLOCK_BINDING` | Claude 5.1+ thinking 前缀绑定 |

## 控制流：`message()`

`message(msgs, model, options)` 顺序：[E: packages/opencode/src/provider/transform.ts:465]

1. `unsupportedParts@transform.ts:466`：按 capabilities 把不支持的 file/image 换成 error text。[E: packages/opencode/src/provider/transform.ts:409][E: packages/opencode/src/provider/transform.ts:439]
2. `normalizeMessages@transform.ts:467`：按 SDK/family 做 content / toolCallId / reasoning 过滤。
3. 若模型走 Anthropic 手工 cache，且 options **没有** `cacheControl`，则 `applyCaching@transform.ts:483`。
4. `sdkKey(model.api.npm)` 与 `model.providerID` 不同时，把 providerOptions 从 stored providerID 搬到 SDK key。[E: packages/opencode/src/provider/transform.ts:487][E: packages/opencode/src/provider/transform.ts:493]
5. `options.store !== true` 且 npm 是 `@ai-sdk/openai` / `@ai-sdk/azure` / `@ai-sdk/amazon-bedrock/mantle` / `@ai-sdk/github-copilot` 时，删除对应 SDK key 下的 `itemId`。[E: packages/opencode/src/provider/transform.ts:503][E: packages/opencode/src/provider/transform.ts:505][E: packages/opencode/src/provider/transform.ts:512]

`normalizeMessages` 的 provider hack：

- Anthropic SDK 过滤空 text，以及既没有非空 text、也没有 `anthropic.signature` / `anthropic.redactedData` 的 reasoning。[E: packages/opencode/src/provider/transform.ts:170][E: packages/opencode/src/provider/transform.ts:182][E: packages/opencode/src/provider/transform.ts:185][E: packages/opencode/src/provider/transform.ts:186]
- Bedrock (`@ai-sdk/amazon-bedrock`) **只保留**带 `signature` / `redactedContent` / `redactedData` 的 reasoning；非空但未签名的 text-only reasoning 会被丢掉。metadata 先读 `providerOptions[model.providerID]`，再 fallback `providerOptions.bedrock`。[E: packages/opencode/src/provider/transform.ts:198][E: packages/opencode/src/provider/transform.ts:213][E: packages/opencode/src/provider/transform.ts:214] 测试固定这三字段在 `bedrock` / `amazon-bedrock` / 自定义 providerID 命名空间下都能保住空 text reasoning；stored `amazon-bedrock` 空对象会盖掉 `bedrock.signature`，整条 reasoning 被滤掉。[E: packages/opencode/test/provider/transform.test.ts:2782][E: packages/opencode/test/provider/transform.test.ts:2784][E: packages/opencode/test/provider/transform.test.ts:2812]
- Claude toolCallId 会 scrub 到 `[a-zA-Z0-9_-]`。[E: packages/opencode/src/provider/transform.ts:224][E: packages/opencode/src/provider/transform.ts:225]
- Mistral family（provider ID 为 `mistral`，或 API ID 含 mistral/devstral/codestral/pixtral/mixtral）把 toolCallId 压成 9 位 alnum，并在 tool 与 user 消息之间插 assistant `"Done."`。[E: packages/opencode/src/provider/transform.ts:255][E: packages/opencode/src/provider/transform.ts:261][E: packages/opencode/src/provider/transform.ts:288][E: packages/opencode/src/provider/transform.ts:294]
- DeepSeek 会给缺少 reasoning part 的 assistant 补空 reasoning。[E: packages/opencode/src/provider/transform.ts:304][E: packages/opencode/src/provider/transform.ts:309]

`applyCaching` 选择前两个 system message 与最后两个 non-system message，并给 Anthropic/OpenRouter/Bedrock/OpenAI-compatible/Copilot/Alibaba 等 provider 写对应 providerOptions cache controls。[E: packages/opencode/src/provider/transform.ts:359][E: packages/opencode/src/provider/transform.ts:360][E: packages/opencode/src/provider/transform.ts:378] 但 Anthropic/Vertex-Anthropic SDK 的 request options 已带 `cacheControl` 时，transform 会跳过这组手工 breakpoints；代码只证明“不再注入”，不证明服务端一定产生 cache hit。[E: packages/opencode/src/provider/transform.ts:468][E: packages/opencode/src/provider/transform.ts:470][E: packages/opencode/src/provider/transform.ts:481][E: packages/opencode/test/provider/transform.test.ts:3615][E: packages/opencode/test/provider/transform.test.ts:3626]

providerOptions key remap 用 `sdkKey(model.api.npm)`。`merge-gateway-ai-sdk-provider` 映成 `mergeGateway`。[E: packages/opencode/src/provider/transform.ts:87][E: packages/opencode/src/provider/transform.ts:88]

## Generation Defaults

`temperature` / `topP` / `topK` 统一以 `model.api.id` 的小写值做 heuristic，而不是 catalog alias `model.id`。[E: packages/opencode/src/provider/transform.ts:528][E: packages/opencode/src/provider/transform.ts:547][E: packages/opencode/src/provider/transform.ts:563]

Qwen **不再**写死 `temperature=0.55` / `topP=1`。三个函数对 Qwen ID 都落到最终 `undefined`；测试覆盖 `Qwen3.8-27B` 与 `qwen3-coder-30b-a3b-instruct`。[E: packages/opencode/src/provider/transform.ts:543][E: packages/opencode/src/provider/transform.ts:559][E: packages/opencode/src/provider/transform.ts:570][E: packages/opencode/test/provider/transform.test.ts:3699][E: packages/opencode/test/provider/transform.test.ts:3705]

仍有的 heuristic：Claude temperature 为 `undefined`；MiniMax M2 topK 按 m2 variant 20/40；north-mini-code temperature 1.0。[E: packages/opencode/src/provider/transform.ts:530][E: packages/opencode/src/provider/transform.ts:529][E: packages/opencode/src/provider/transform.ts:565][E: packages/opencode/src/provider/transform.ts:566]

Gemini sampling defaults 不再对所有包含 `gemini` 的 ID 生效。当前 whitelist 是 2.5、3 flash/pro、3.1、以及非 lite 的 3.5 flash，它们保留 temperature=1、topP=0.95、topK=64；未命中这些 pattern 的 ID（测试例包括 3.5 flash-lite、3.6、4 与 `gemini-future`）省略三个 deprecated controls。它不是“未来版本”判断：例如名字里带 future 但仍命中 2.5/3.1 pattern 的 ID 仍会注入 defaults。测试还固定 configured alias 必须按 API model ID 判定。[E: packages/opencode/src/provider/transform.ts:520][E: packages/opencode/src/provider/transform.ts:532][E: packages/opencode/src/provider/transform.ts:549][E: packages/opencode/src/provider/transform.ts:569][E: packages/opencode/test/provider/transform.test.ts:3725][E: packages/opencode/test/provider/transform.test.ts:3734][E: packages/opencode/test/provider/transform.test.ts:3755][E: packages/opencode/test/provider/transform.test.ts:3762]

DeepSeek V4 Flash 的 `topP=0.95` 不是“凡是 flash 都注入”。`topP()` 只在 API ID 包含 `deepseek-v4-flash-0731` / `deepseek-v4-flash:0731`，或 API ID 包含 `deepseek-v4-flash` 且 `providerID` 为 `deepseek` / 以 `opencode` 开头（含 `opencode-go`）时返回 0.95；temperature 与 topK 仍不设。测试固定 OpenRouter/Vercel 上的未带 dated suffix 的 `deepseek/deepseek-v4-flash` 以及 custom `DeepSeek-V4-Flash` 保持三个 sampling 都为 undefined。[E: packages/opencode/src/provider/transform.ts:554][E: packages/opencode/src/provider/transform.ts:555][E: packages/opencode/src/provider/transform.ts:557][E: packages/opencode/test/provider/transform.test.ts:3782][E: packages/opencode/test/provider/transform.test.ts:3784][E: packages/opencode/test/provider/transform.test.ts:3792]

`options` 是 provider default options 聚合器：它可以关 tool streaming、设置 store false、按 SDK 选择 prompt cache key、设置 OpenRouter/llmgateway usage 与 `@ai-sdk/gateway` caching、Gemini thinkingConfig、Alibaba `enable_thinking`、Kimi adaptive thinking，以及 GPT-5 与 Azure Completions 路径的 reasoningEffort/reasoningSummary/textVerbosity/encrypted reasoning include 等。[E: packages/opencode/src/provider/transform.ts:1207][E: packages/opencode/src/provider/transform.ts:1218][E: packages/opencode/src/provider/transform.ts:1229][E: packages/opencode/src/provider/transform.ts:1233][E: packages/opencode/src/provider/transform.ts:1237][E: packages/opencode/src/provider/transform.ts:1269][E: packages/opencode/src/provider/transform.ts:1292][E: packages/opencode/src/provider/transform.ts:1307][E: packages/opencode/src/provider/transform.ts:1321][E: packages/opencode/src/provider/transform.ts:1326][E: packages/opencode/src/provider/transform.ts:1333][E: packages/opencode/src/provider/transform.ts:1342][E: packages/opencode/src/provider/transform.ts:1349][E: packages/opencode/src/provider/transform.ts:1364]

重要默认：

- OpenAI、`@ai-sdk/openai`、GitHub Copilot、Bedrock Mantle 和 xAI 默认 `store=false`。[E: packages/opencode/src/provider/transform.ts:1223][E: packages/opencode/src/provider/transform.ts:1224][E: packages/opencode/src/provider/transform.ts:1225][E: packages/opencode/src/provider/transform.ts:1226][E: packages/opencode/src/provider/transform.ts:1227][E: packages/opencode/src/provider/transform.ts:1229]
- Azure 默认 `store=false`；和 OpenAI、xAI、Mistral、Venice 一样，在没有 `setCacheKey:false` 时用 session id 做 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1233][E: packages/opencode/src/provider/transform.ts:1314][E: packages/opencode/src/provider/transform.ts:1315][E: packages/opencode/src/provider/transform.ts:1316][E: packages/opencode/src/provider/transform.ts:1317][E: packages/opencode/src/provider/transform.ts:1318][E: packages/opencode/src/provider/transform.ts:1321]
- DeepInfra/Cerebras 使用 snake-case `prompt_cache_key`；其他 SDK 只有显式 `setCacheKey:true` 才加入 camel-case key。OpenRouter 不在默认列表中。[E: packages/opencode/src/provider/transform.ts:1311][E: packages/opencode/src/provider/transform.ts:1312][E: packages/opencode/src/provider/transform.ts:1319][E: packages/opencode/test/provider/transform.test.ts:280][E: packages/opencode/test/provider/transform.test.ts:294]
- Meta provider 在 `@ai-sdk/openai` path 上只默认 `reasoningSummary=auto` 并 include encrypted reasoning，不再强制 `reasoningEffort=xhigh`。[E: packages/opencode/src/provider/transform.ts:1262][E: packages/opencode/src/provider/transform.ts:1263][E: packages/opencode/src/provider/transform.ts:1264]
- API ID 包含 `gpt-5`、但不包含精确 substring `gpt-5-chat` 或 `gpt-5-pro` 时，默认 `reasoningEffort=medium`；OpenAI/Azure/Copilot/Bedrock Mantle 还默认 `reasoningSummary=auto`。因此不能把例外泛化为所有 chat/pro family。[E: packages/opencode/src/provider/transform.ts:1340][E: packages/opencode/src/provider/transform.ts:1341][E: packages/opencode/src/provider/transform.ts:1342][E: packages/opencode/src/provider/transform.ts:1344][E: packages/opencode/src/provider/transform.ts:1345][E: packages/opencode/src/provider/transform.ts:1346][E: packages/opencode/src/provider/transform.ts:1347][E: packages/opencode/src/provider/transform.ts:1349]
- `textVerbosity: "low"` **只**在 API ID 含 `gpt-5.`、不含 `codex`、不含 `-chat`，且 `model.api.npm` 是 `@ai-sdk/openai` 或 `@ai-sdk/amazon-bedrock/mantle` 时注入。Azure、Copilot、`@ai-sdk/openai-compatible` 都不会走这条默认。[E: packages/opencode/src/provider/transform.ts:1359][E: packages/opencode/src/provider/transform.ts:1362][E: packages/opencode/src/provider/transform.ts:1364][E: packages/opencode/test/provider/transform.test.ts:491][E: packages/opencode/test/provider/transform.test.ts:511][E: packages/opencode/test/provider/transform.test.ts:529]
- Azure Completions 提前返回只看 `@ai-sdk/azure` 加上 `providerOptions.useCompletionUrls`，不再用 API ID 是否包含字面量 `gpt-5.5` 做门。`gpt-(\d+)\.(\d+)` 解析出 major>5 或 major=5 且 minor>=5 时跳过 `reasoningEffort`；更旧的带小数点 GPT 仍写 `reasoningEffort=medium`。两条路径都 `return result`，因此 store/cache key 保留，但不会进入后面的 GPT-5 summary/include/textVerbosity 段。没有 `useCompletionUrls` 的 Azure gpt-5.5+ 仍走通用 GPT-5 defaults，测试期望 `reasoningSummary=auto` 与 `promptCacheKey`。[E: packages/opencode/src/provider/transform.ts:1331][E: packages/opencode/src/provider/transform.ts:1332][E: packages/opencode/src/provider/transform.ts:1333][E: packages/opencode/src/provider/transform.ts:1335][E: packages/opencode/src/provider/transform.ts:1337][E: packages/opencode/test/provider/transform.test.ts:258][E: packages/opencode/test/provider/transform.test.ts:269][E: packages/opencode/test/provider/transform.test.ts:270][E: packages/opencode/test/provider/transform.test.ts:688][E: packages/opencode/test/provider/transform.test.ts:695][E: packages/opencode/test/provider/transform.test.ts:698][E: packages/opencode/test/provider/transform.test.ts:705]

## Anthropic thinking `blockBinding`

Claude 5.1+ 会把 thinking 签名绑到 system prompt / tool list / 上方消息；OpenCode 跨 turn 会重渲染这些前缀，所以默认请求 API 在 mismatch 时 `drop_block`，而不是整请求失败。[E: packages/opencode/src/provider/transform.ts:706]

`anthropicBindsThinking(apiId)` 用 family/version regex（不把发布日期当 minor）判断默认 scope：`major > 5` 或 `major === 5 && minor >= 1`。**Mythos 5.1 除外**（family 或 suffix 为 `mythos`）。解析不到版本则返回 `false`，因此 `claude-future`、Kimi、Nova 都不会进默认注入。[E: packages/opencode/src/provider/transform.ts:690][E: packages/opencode/src/provider/transform.ts:693][E: packages/opencode/src/provider/transform.ts:696][E: packages/opencode/src/provider/transform.ts:697] 未写 minor 的 `claude-opus-5` 按 minor=0 处理，也不在默认 scope；`claude-sonnet-5-2` / `claude-opus-6` 在。Mythos 5.2 / 5.10 仍会注入，不在 5.1 例外里。[E: packages/opencode/src/provider/transform.ts:695][E: packages/opencode/test/provider/transform.test.ts:885][E: packages/opencode/test/provider/transform.test.ts:886][E: packages/opencode/test/provider/transform.test.ts:887][E: packages/opencode/test/provider/transform.test.ts:888][E: packages/opencode/test/provider/transform.test.ts:915]

`anthropicBlockBinding(model, options)`：

- SDK key 为 `bedrock` 时改 `reasoningConfig`，为 `anthropic` 时改 `thinking`。[E: packages/opencode/src/provider/transform.ts:710]
- `thinking.blockBinding === false` 或 `reasoningConfig.blockBinding === false` 是 OpenCode-only 哨兵：先剥掉该字段再返回，**即使模型不在默认 scope**。[E: packages/opencode/src/provider/transform.ts:712][E: packages/opencode/test/provider/transform.test.ts:941]
- 不在 `anthropicBindsThinking` scope 则原样返回。[E: packages/opencode/src/provider/transform.ts:719]
- 只处理 `@ai-sdk/anthropic` / `@ai-sdk/google-vertex/anthropic` / `@ai-sdk/amazon-bedrock`。缺省 thinking/reasoningConfig 会先补 `{ type: "adaptive" }`；仅当 type 为 `adaptive` 或 `enabled`，且用户未显式设 `blockBinding` 时，才写入 `ANTHROPIC_BLOCK_BINDING = { prefixMismatchBehavior: "drop_block" }`。[E: packages/opencode/src/provider/transform.ts:706][E: packages/opencode/src/provider/transform.ts:723][E: packages/opencode/src/provider/transform.ts:725][E: packages/opencode/src/provider/transform.ts:726][E: packages/opencode/src/provider/transform.ts:731][E: packages/opencode/src/provider/transform.ts:732]
- `type: "disabled"` 或用户已给自定义 `blockBinding`（例如 `{ prefixMismatchBehavior: "error" }`）不覆盖。[E: packages/opencode/src/provider/transform.ts:724][E: packages/opencode/test/provider/transform.test.ts:952]

接入点是 `providerOptions()`：`@ai-sdk/openai` / `@ai-sdk/azure` / `@ai-sdk/amazon-bedrock/mantle` 且模型有 reasoning capability，或 options 已带 `reasoningEffort` / `reasoningSummary` 时，只加 `forceReasoning: true`；其余路径走 `anthropicBlockBinding`。[E: packages/opencode/src/provider/transform.ts:1408][E: packages/opencode/src/provider/transform.ts:1415][E: packages/opencode/src/provider/transform.ts:1416][E: packages/opencode/src/provider/transform.ts:1417]

空 options 的 Claude 5.1+ 也会被补成 `thinking`/`reasoningConfig: { type: "adaptive", blockBinding }`。[E: packages/opencode/test/provider/transform.test.ts:893][E: packages/opencode/test/provider/transform.test.ts:1061] `thinking-binding-controls` beta header 由 patched AI SDK 在字段存在时附加，不是 `transform.ts` 的新导出。

## Reasoning Variants

models.dev 模型现在可以用 `reasoning_options` 声明 `effort`、`toggle` 或 `budget_tokens` 能力；`reasoningVariants(model, target)` 会优先把这些 catalog 能力翻译成 provider-specific variants。它返回 `undefined` 时回退到 heuristic `variants(target)`；这可能是字段缺失，也可能是 toggle/budget 对当前 npm package 没有映射，而显式空数组会得到空 variants。[E: packages/opencode/src/provider/transform.ts:1704][E: packages/opencode/src/provider/transform.ts:1706][E: packages/opencode/src/provider/transform.ts:1707][E: packages/opencode/src/provider/transform.ts:1709][E: packages/opencode/src/provider/transform.ts:1714][E: packages/opencode/src/provider/transform.ts:1716][E: packages/opencode/src/provider/transform.ts:1752]

heuristic `variants(model)` 首先要求 `model.capabilities.reasoning`，没有 reasoning capability 直接返回空对象。[E: packages/opencode/src/provider/transform.ts:777][E: packages/opencode/src/provider/transform.ts:778]

变体生成是 provider/npm/model-id 组合规则，不是统一标准字段。例如 MiniMax M3 的 nvidia/lilac 分支用 `chat_template_kwargs.thinking_mode`，其余 Anthropic/OpenAI-compatible 分支用 disabled/adaptive thinking；Kimi heuristic 在 Anthropic/Vertex-Anthropic path 上先生成五档 adaptive+summarized variants，其他 Kimi path 才可能落入 suppress；grok-3-mini 在 OpenRouter 下用 `{ reasoning: { effort } }`，非 OpenRouter 用 `{ reasoningEffort }`。[E: packages/opencode/src/provider/transform.ts:784][E: packages/opencode/src/provider/transform.ts:788][E: packages/opencode/src/provider/transform.ts:796][E: packages/opencode/src/provider/transform.ts:821][E: packages/opencode/src/provider/transform.ts:836][E: packages/opencode/src/provider/transform.ts:844][E: packages/opencode/src/provider/transform.ts:847][E: packages/opencode/src/provider/transform.ts:852]

Claude adaptive classification 是 API-ID heuristic：4.7+、major >4，以及无法解析版本但含 `claude-` 的 future alias 会获得 `low/medium/high/xhigh/max` adaptive variants，并请求 summarized display；4.6 仍是四档且不显式请求 display。dated Claude 4 ID 的日期不会被误判成 minor version。[E: packages/opencode/src/provider/transform.ts:654][E: packages/opencode/src/provider/transform.ts:658][E: packages/opencode/src/provider/transform.ts:659][E: packages/opencode/src/provider/transform.ts:662][E: packages/opencode/src/provider/transform.ts:670][E: packages/opencode/src/provider/transform.ts:678][E: packages/opencode/src/provider/transform.ts:684][E: packages/opencode/test/provider/transform.test.ts:5316][E: packages/opencode/test/provider/transform.test.ts:5340]

Mistral reasoning 只为 Small 4 / Medium 3.5 identifiers 输出 `high` effort；同时 pinned AI SDK patch 把 `promptCacheKey` 序列化成 wire `prompt_cache_key`，保留 native thinking（含 reference/signature）到 provider metadata，并在后续 assistant history 恢复 structured content。[E: packages/opencode/src/provider/transform.ts:1133][E: packages/opencode/src/provider/transform.ts:1147][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:75][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:85][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:97][E: patches/@ai-sdk%2Fmistral@3.0.51.patch:149][E: packages/core/test/provider-mistral.test.ts:4][E: packages/core/test/provider-mistral.test.ts:56][E: packages/core/test/provider-mistral.test.ts:160]

OpenRouter heuristic 用 `reasoning.effort`；`ai-gateway-provider` heuristic 返回 OpenAI-compatible style 的 `reasoningEffort` variants。[E: packages/opencode/src/provider/transform.ts:858][E: packages/opencode/src/provider/transform.ts:863][E: packages/opencode/src/provider/transform.ts:873][E: packages/opencode/src/provider/transform.ts:875][E: packages/opencode/src/provider/transform.ts:877] `merge-gateway-ai-sdk-provider` 不在 heuristic `variants()` switch 里；catalog `reasoning_options` effort 经 `reasoningEffort()` 与 `@ai-sdk/openai-compatible` / `@ai-sdk/xai` / `@ai-sdk/mistral` / `@ai-sdk/groq` / `@ai-sdk/cerebras` / `@ai-sdk/deepinfra` / `@ai-sdk/togetherai` / `venice-ai-sdk-provider` / `ai-gateway-provider` 一样直接写成 `{ reasoningEffort }`，`sdkKey()` 再把 providerOptions namespace 映成 `mergeGateway`。[E: packages/opencode/src/provider/transform.ts:87][E: packages/opencode/src/provider/transform.ts:88][E: packages/opencode/src/provider/transform.ts:1816][E: packages/opencode/src/provider/transform.ts:1825][E: packages/opencode/src/provider/transform.ts:1826][E: packages/opencode/src/provider/transform.ts:1408][E: packages/opencode/src/provider/transform.ts:1465][E: packages/opencode/test/provider/transform.test.ts:3867][E: packages/opencode/test/provider/transform.test.ts:6114][E: packages/opencode/test/provider/transform.test.ts:6116]

`gitlab-ai-provider` 同样不在 heuristic `variants()` switch 里，没有 `reasoning_options` 时得到 `{}`。catalog effort 经 `reasoningEffort()` 看 `model.family`：以 `gpt` 开头 → `{ reasoningEffort }`；以 `claude` 开头 → `{ thinking: { type: "adaptive", effort } }`；其它 family 返回 `undefined` 被丢掉。[E: packages/opencode/src/provider/transform.ts:1827][E: packages/opencode/src/provider/transform.ts:1828][E: packages/opencode/src/provider/transform.ts:1829][E: packages/opencode/test/provider/transform.test.ts:3955][E: packages/opencode/test/provider/transform.test.ts:3961][E: packages/opencode/test/provider/transform.test.ts:3964] `reasoningBudget()` 对该 npm 也返回 `undefined`。[E: packages/opencode/src/provider/transform.ts:1903]

## 设计动机

V1 provider transforms 存在是因为 AI SDK abstraction 不完全屏蔽 provider wire 差异：不同 provider 对空 content、tool id charset、reasoning control、cache control、store/itemId、thinking 前缀绑定的要求不同。[I] registry 从 models.dev 合成 V1 model 时，Cloudflare AI Gateway 会先把 `openai/*` / `anthropic/*` 映成 native npm，再调用 `ProviderTransform.reasoningVariants(model, base)`，失败才回退 heuristic variants，说明 variants 是 model catalog 的一部分，不是 runtime 临时开关。[E: packages/opencode/src/provider/provider.ts:1254][E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1271][E: packages/opencode/src/provider/provider.ts:1310] config model 路径不走 `reasoningVariants`，只 merge 已有或 heuristic variants，并用 `disabled` 删除具体档位；但合成 `api.npm` 时仍可能再跑 `cloudflareGatewayNpm()`（config-defined gateway 绕过 `fromModelsDevModel`）。[E: packages/opencode/src/provider/provider.ts:1498][E: packages/opencode/src/provider/provider.ts:1566][E: packages/opencode/src/provider/provider.ts:1568][E: packages/opencode/src/provider/provider.ts:1570]

## 易错点

- 这里是 V1 AI SDK transform，不是 `packages/llm` native protocol adapter；不要把 `ProviderTransform.options` 和 native route defaults 混写。[I]
- Bedrock 与 Anthropic 的 reasoning 过滤条件不同：Anthropic 仍可因非空 text 保留；Bedrock 必须有 signature / redactedContent / redactedData。[E: packages/opencode/src/provider/transform.ts:182][E: packages/opencode/src/provider/transform.ts:214]
- `store=false` 会影响 Responses item metadata；transform 在 OpenAI/Azure/Mantle/Copilot 的 provider options 中显式删除 `itemId`。[E: packages/opencode/src/provider/transform.ts:503][E: packages/opencode/src/provider/transform.ts:505][E: packages/opencode/src/provider/transform.ts:512]
- reasoning variants 优先由 models.dev `reasoning_options` 声明并按 npm package 翻译；`reasoningVariants()` 返回 `undefined` 时才按 model capability、model id、npm package 走 heuristic。[E: packages/opencode/src/provider/transform.ts:1704][E: packages/opencode/src/provider/transform.ts:1706][E: packages/opencode/src/provider/transform.ts:1714][E: packages/opencode/src/provider/transform.ts:1716][E: packages/opencode/src/provider/transform.ts:777]
- Gemini 的 alias/display ID 不能决定 sampling defaults；三个 transform 都明确读取 `model.api.id`。是否注入完全由当前 whitelist regex 命中决定，不能按“当前/未来版本”概括。[E: packages/opencode/src/provider/transform.ts:520][E: packages/opencode/src/provider/transform.ts:528][E: packages/opencode/src/provider/transform.ts:547][E: packages/opencode/src/provider/transform.ts:563][E: packages/opencode/test/provider/transform.test.ts:3755][E: packages/opencode/test/provider/transform.test.ts:3757]
- `textVerbosity: "low"` 不是“凡 gpt-5.x 且非 Azure 就注入”；门在 `model.api.npm`。[E: packages/opencode/src/provider/transform.ts:1362][E: packages/opencode/src/provider/transform.ts:1364]
- `blockBinding: false` 是 OpenCode 哨兵，不会原样发给 SDK；默认注入只覆盖 Claude 5.1+（Mythos 5.1 除外），且只在 thinking/reasoningConfig 为 adaptive/enabled 时发生。[E: packages/opencode/src/provider/transform.ts:712][E: packages/opencode/src/provider/transform.ts:696][E: packages/opencode/src/provider/transform.ts:724]
- GitLab variants 看 `model.family` 前缀，不看 model id 是否含 gpt/claude；heuristic `variants()` 没有 `gitlab-ai-provider` case。[E: packages/opencode/src/provider/transform.ts:1828][E: packages/opencode/src/provider/transform.ts:1829][E: packages/opencode/src/provider/transform.ts:1204]
- 不要把 Bedrock catalog effort `"none"` 或 OpenAI service-tier 写成 `transform.ts` 新 API；前者对非 Anthropic Bedrock 仍走既有 `reasoningConfig.maxReasoningEffort`，wire 形状来自 AI SDK patch。

## Sources
- packages/opencode/src/provider/transform.ts
- packages/opencode/src/provider/provider.ts
- patches/@ai-sdk%2Fmistral@3.0.51.patch
- packages/opencode/test/provider/transform.test.ts
- packages/core/test/provider-mistral.test.ts

## 相关
- ref.reasoning-variant-tables
