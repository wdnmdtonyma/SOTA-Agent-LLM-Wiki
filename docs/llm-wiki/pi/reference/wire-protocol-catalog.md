---
id: ref.ai.wire-protocol-catalog
title: wire 协议与客户端目录(10 chat + image + classifier)
kind: catalog
tier: T3
pkg: ai
source:
 - packages/ai/src/api/lazy.ts
 - packages/ai/src/api/pi-messages.lazy.ts
 - packages/ai/src/api/pi-messages.ts
 - packages/ai/src/api/openrouter-images.lazy.ts
 - packages/ai/src/api/typesafe-system-one.lazy.ts
 - packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts
 - packages/ai/src/types.ts
symbols:
 - KnownApi
 - KnownImageApi
 - KnownClassifierApi
 - ProviderStreams
 - ProviderImages
 - ProviderClassifier
related:
 - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 6f7551516b
---

> `ref.ai.wire-protocol-catalog` 逐实例列出 `pi-ai` **chat/text** streaming wire protocol key（`KnownApi`，**10** 个）、图像 API（`KnownImageApi`，1 个）和 classifier API（`KnownClassifierApi`，2 个）。chat 的 10 不把 image/classifier 算进去。

## 能回答的问题

- `KnownApi` 当前包含哪些 chat/text wire protocol key?
- 每个 chat wire protocol key 对应哪个 `packages/ai/src/api/<name>.lazy.ts` wrapper?
- 每个 lazy wrapper 是否同时覆盖 `stream` 与 `streamSimple`?
- `KnownImageApi` 与 `KnownClassifierApi` 分别有哪些 key，为什么不算进 10?
- 哪个 subsystem 节点继续解释某个 wire protocol 的 payload 构造和 event normalization?

## 统一覆盖口径

`KnownApi` 是 chat/text 表的 key universe:它在 `types.ts` 中定义为 **10** 个 chat/text API key 的 union,每个 key 的逐行证据见下表;`Api = KnownApi | (string & {})` 允许自定义字符串扩展。[E: packages/ai/src/types.ts:17][E: packages/ai/src/types.ts:27][E: packages/ai/src/types.ts:29] `ProviderStreams` 是 chat/text wire module 的统一 shape:每个 module value 需要提供 `stream(model, context, options?)` 与 `streamSimple(model, context, options?)`,二者都返回 `AssistantMessageEventStream`。[E: packages/ai/src/types.ts:286][E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288]

`lazyApi(load)` 把一个动态导入的 `ProviderStreams` module 包成同形 value:它返回对象里的 `stream` 会延迟调用 `(await load()).stream(...)`,对象里的 `streamSimple` 会延迟调用 `(await load()).streamSimple(...)`。[E: packages/ai/src/api/lazy.ts:73][E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78] 因此表中每个 lazy wrapper 的 stream/simple support 都来自同一个 `ProviderStreams` + `lazyApi` contract,而不是各 row 自己重新定义契约。[I]

`KnownImageApi` 只有 `"openrouter-images"`。对应 lazy wrapper 返回 `ProviderImages`，contract 是 `generateImages(...)`，**不**进入 10 个 chat `ProviderStreams`。[E: packages/ai/src/types.ts:31][E: packages/ai/src/api/openrouter-images.lazy.ts:3][E: packages/ai/src/types.ts:307][E: packages/ai/src/types.ts:308] 类型名是 `KnownImageApi`，不是旧的 `KnownImagesApi`。

`KnownClassifierApi` 是 `"typesafe-system-one" | "cloudflare-workers-ai-system-one"` 两个 key。对应 `ProviderClassifier.classify(...)`，同样**不**计入 10 个 chat API。[E: packages/ai/src/types.ts:35][E: packages/ai/src/types.ts:316][E: packages/ai/src/types.ts:317][E: packages/ai/src/api/typesafe-system-one.lazy.ts:3][E: packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts:3]

`StreamOptions.fetch` 是 shared type surface，不代表 10 个 wire 都支持 custom fetch。当前 test/source matrix 证明 Anthropic、OpenAI Completions/Responses/Azure Responses、Mistral、Codex Responses 的 SSE path 与 `pi-messages` 会注入 custom fetch；Google Generative AI/Vertex 对非 `globalThis.fetch` 显式抛错；Bedrock 本轮既未注入也未显式拒绝；WebSocket transport 不受该选项影响。[E: packages/ai/src/types.ts:142] [E: packages/ai/test/fetch-option.test.ts:63] [E: packages/ai/test/fetch-option.test.ts:73] [E: packages/ai/test/fetch-option.test.ts:103] [E: packages/ai/test/fetch-option.test.ts:109] [E: packages/ai/test/fetch-option.test.ts:124] [E: packages/ai/test/fetch-option.test.ts:142]

## Wire protocol keys

| api key | lazy module | stream/simple support | 对应节点 | 源码证据 |
|---|---|---|---|---|
| `openai-completions` | `packages/ai/src/api/openai-completions.lazy.ts` -> `openAICompletionsApi()` -> `import("./openai-completions.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.openai-completions](../subsystems/ai/openai-completions.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:18]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/openai-completions.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `mistral-conversations` | `packages/ai/src/api/mistral-conversations.lazy.ts` -> `mistralConversationsApi()` -> `import("./mistral-conversations.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.mistral-conversations](../subsystems/ai/mistral-conversations.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:19]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/mistral-conversations.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `openai-responses` | `packages/ai/src/api/openai-responses.lazy.ts` -> `openAIResponsesApi()` -> `import("./openai-responses.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.openai-responses](../subsystems/ai/openai-responses.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:20]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/openai-responses.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `azure-openai-responses` | `packages/ai/src/api/azure-openai-responses.lazy.ts` -> `azureOpenAIResponsesApi()` -> `import("./azure-openai-responses.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.azure-openai-responses](../subsystems/ai/azure-openai-responses.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:21]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/azure-openai-responses.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `openai-codex-responses` | `packages/ai/src/api/openai-codex-responses.lazy.ts` -> `openAICodexResponsesApi()` -> `import("./openai-codex-responses.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.openai-codex-responses](../subsystems/ai/openai-codex-responses.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:22]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/openai-codex-responses.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `anthropic-messages` | `packages/ai/src/api/anthropic-messages.lazy.ts` -> `anthropicMessagesApi()` -> `import("./anthropic-messages.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.anthropic-messages](../subsystems/ai/anthropic-messages.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:23]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/anthropic-messages.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `bedrock-converse-stream` | `packages/ai/src/api/bedrock-converse-stream.lazy.ts` -> `bedrockConverseStreamApi()` -> `importNodeOnlyApi("./bedrock-converse-stream.ts")` or `bedrockModuleOverride` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.bedrock-converse](../subsystems/ai/bedrock-converse.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:24]; lazy wrapper returns `ProviderStreams` via `lazyApi` and loads override/import path [E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:15][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:26][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:27][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:29]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `google-generative-ai` | `packages/ai/src/api/google-generative-ai.lazy.ts` -> `googleGenerativeAIApi()` -> `import("./google-generative-ai.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.google-generative-ai](../subsystems/ai/google-generative-ai.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:25]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/google-generative-ai.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `google-vertex` | `packages/ai/src/api/google-vertex.lazy.ts` -> `googleVertexApi()` -> `import("./google-vertex.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.google-vertex](../subsystems/ai/google-vertex.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:26]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/google-vertex.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:75][E: packages/ai/src/api/lazy.ts:76][E: packages/ai/src/api/lazy.ts:77][E: packages/ai/src/api/lazy.ts:78]; contract [E: packages/ai/src/types.ts:287][E: packages/ai/src/types.ts:288] |
| `pi-messages` | `packages/ai/src/api/pi-messages.lazy.ts` -> `piMessagesApi()` -> `import("./pi-messages.ts")` | `stream` + `streamSimple`; POST Pi context/options and consume Pi-native SSE events | [subsys.ai.pi-messages](../subsystems/ai/pi-messages.md) | key in `KnownApi` [E: packages/ai/src/types.ts:27]; lazy wrapper [E: packages/ai/src/api/pi-messages.lazy.ts:4]; implementation exports [E: packages/ai/src/api/pi-messages.ts:355][E: packages/ai/src/api/pi-messages.ts:432] |

共 10 个 chat `KnownApi` key。下面两表**不算进这 10**。

## Image API keys (`KnownImageApi`，1)

| api key | lazy module | contract | 对应节点 | 源码证据 |
|---|---|---|---|---|
| `openrouter-images` | `packages/ai/src/api/openrouter-images.lazy.ts` -> `openrouterImagesApi()` -> `import("./openrouter-images.ts").generateImages` | `ProviderImages.generateImages(model, context, options?)` | [subsys.ai.image-generation](../subsystems/ai/image-generation.md) [I] | key [E: packages/ai/src/types.ts:31]; lazy [E: packages/ai/src/api/openrouter-images.lazy.ts:3]; contract [E: packages/ai/src/types.ts:307] [E: packages/ai/src/types.ts:308] |

## Classifier API keys (`KnownClassifierApi`，2)

| api key | lazy module | contract | 对应节点 | 源码证据 |
|---|---|---|---|---|
| `typesafe-system-one` | `packages/ai/src/api/typesafe-system-one.lazy.ts` -> `typesafeSystemOneApi()` -> `import("./typesafe-system-one.ts").classify` | `ProviderClassifier.classify(model, context, options?)` | [subsys.ai.classifiers](../subsystems/ai/classifiers.md) [I] | key [E: packages/ai/src/types.ts:35]; lazy [E: packages/ai/src/api/typesafe-system-one.lazy.ts:3]; contract [E: packages/ai/src/types.ts:317] |
| `cloudflare-workers-ai-system-one` | `packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts` -> `cloudflareWorkersAISystemOneApi()` -> `import("./cloudflare-workers-ai-system-one.ts").classify` | `ProviderClassifier.classify(model, context, options?)` | [subsys.ai.classifiers](../subsystems/ai/classifiers.md) [I] | key [E: packages/ai/src/types.ts:35]; lazy [E: packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts:3]; contract [E: packages/ai/src/types.ts:317] |

## Sources

- `packages/ai/src/types.ts`
- `packages/ai/src/api/lazy.ts`
- `packages/ai/src/api/*.lazy.ts`
- `packages/ai/src/api/pi-messages.ts`
- `packages/ai/src/api/openrouter-images.lazy.ts`
- `packages/ai/src/api/typesafe-system-one.lazy.ts`
- `packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts`

## 相关

- [subsys.ai.wire-protocol-dispatch](../subsystems/ai/wire-protocol-dispatch.md):解释 `Model.api` 如何选择 `ProviderStreams`,以及缺失 implementation 时如何转成 stream error。
