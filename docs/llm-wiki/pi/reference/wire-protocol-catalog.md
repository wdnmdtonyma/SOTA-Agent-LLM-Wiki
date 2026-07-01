---
id: ref.ai.wire-protocol-catalog
title: wire 协议与客户端目录(9)
kind: catalog
tier: T3
pkg: ai
source:
  - packages/ai/src/api/lazy.ts
  - packages/ai/src/types.ts
symbols:
  - ProviderStreams
related:
  - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 8c943640
---

> `ref.ai.wire-protocol-catalog` 逐实例列出 `pi-ai` chat/text streaming wire protocol key、对应 lazy wrapper、`ProviderStreams` 支持面和本 wiki 的 subsystem 节点映射。

## 能回答的问题

- `KnownApi` 当前包含哪些 chat/text wire protocol key?
- 每个 wire protocol key 对应哪个 `packages/ai/src/api/<name>.lazy.ts` wrapper?
- 每个 lazy wrapper 是否同时覆盖 `stream` 与 `streamSimple`?
- 哪个 subsystem 节点继续解释某个 wire protocol 的 payload 构造和 event normalization?
- `openrouter-images` 为什么不在本 chat/text `ProviderStreams` catalog 中?

## 统一覆盖口径

`KnownApi` 是本表的 key universe:它在 `types.ts` 中定义为 9 个 chat/text API key 的 union,每个 key 的逐行证据见下表;`Api = KnownApi | (string & {})` 允许自定义字符串扩展。[E: packages/ai/src/types.ts:15][E: packages/ai/src/types.ts:26] `ProviderStreams` 是 chat/text wire module 的统一 shape:每个 module value 需要提供 `stream(model, context, options?)` 与 `streamSimple(model, context, options?)`,二者都返回 `AssistantMessageEventStream`。[E: packages/ai/src/types.ts:222][E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224]

`lazyApi(load)` 把一个动态导入的 `ProviderStreams` module 包成同形 value:它返回对象里的 `stream` 会延迟调用 `(await load()).stream(...)`,对象里的 `streamSimple` 会延迟调用 `(await load()).streamSimple(...)`。[E: packages/ai/src/api/lazy.ts:63][E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68] 因此表中每个 lazy wrapper 的 stream/simple support 都来自同一个 `ProviderStreams` + `lazyApi` contract,而不是各 row 自己重新定义契约。[I]

`openrouter-images` 属于 `KnownImagesApi`,对应 lazy wrapper 返回 `ProviderImages`,image contract 是 `ProviderImages.generateImages(...)`。[E: packages/ai/src/types.ts:28][E: packages/ai/src/api/openrouter-images.lazy.ts:1][E: packages/ai/src/api/openrouter-images.lazy.ts:3][E: packages/ai/src/types.ts:233][E: packages/ai/src/types.ts:234] 因此它不进入本 chat/text `ProviderStreams.stream(...)` / `ProviderStreams.streamSimple(...)` catalog。[I]

## Wire protocol keys

| api key | lazy module | stream/simple support | 对应节点 | 源码证据 |
|---|---|---|---|---|
| `openai-completions` | `packages/ai/src/api/openai-completions.lazy.ts` -> `openAICompletionsApi()` -> `import("./openai-completions.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.openai-completions](../subsystems/ai/openai-completions.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:16]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/openai-completions.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `mistral-conversations` | `packages/ai/src/api/mistral-conversations.lazy.ts` -> `mistralConversationsApi()` -> `import("./mistral-conversations.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.mistral-conversations](../subsystems/ai/mistral-conversations.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:17]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/mistral-conversations.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `openai-responses` | `packages/ai/src/api/openai-responses.lazy.ts` -> `openAIResponsesApi()` -> `import("./openai-responses.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.openai-responses](../subsystems/ai/openai-responses.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:18]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/openai-responses.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `azure-openai-responses` | `packages/ai/src/api/azure-openai-responses.lazy.ts` -> `azureOpenAIResponsesApi()` -> `import("./azure-openai-responses.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.azure-openai-responses](../subsystems/ai/azure-openai-responses.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:19]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/azure-openai-responses.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `openai-codex-responses` | `packages/ai/src/api/openai-codex-responses.lazy.ts` -> `openAICodexResponsesApi()` -> `import("./openai-codex-responses.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.openai-codex-responses](../subsystems/ai/openai-codex-responses.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:20]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/openai-codex-responses.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `anthropic-messages` | `packages/ai/src/api/anthropic-messages.lazy.ts` -> `anthropicMessagesApi()` -> `import("./anthropic-messages.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.anthropic-messages](../subsystems/ai/anthropic-messages.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:21]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/anthropic-messages.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `bedrock-converse-stream` | `packages/ai/src/api/bedrock-converse-stream.lazy.ts` -> `bedrockConverseStreamApi()` -> `importNodeOnlyApi("./bedrock-converse-stream.ts")` or `bedrockModuleOverride` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.bedrock-converse](../subsystems/ai/bedrock-converse.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:22]; lazy wrapper returns `ProviderStreams` via `lazyApi` and loads override/import path [E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:15][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:26][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:27][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:29]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `google-generative-ai` | `packages/ai/src/api/google-generative-ai.lazy.ts` -> `googleGenerativeAIApi()` -> `import("./google-generative-ai.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.google-generative-ai](../subsystems/ai/google-generative-ai.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:23]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/google-generative-ai.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |
| `google-vertex` | `packages/ai/src/api/google-vertex.lazy.ts` -> `googleVertexApi()` -> `import("./google-vertex.ts")` | `stream` + `streamSimple` via `ProviderStreams` and `lazyApi` | [subsys.ai.google-vertex](../subsystems/ai/google-vertex.md) [I] | key in `KnownApi` [E: packages/ai/src/types.ts:24]; lazy wrapper returns `ProviderStreams` via `lazyApi` [E: packages/ai/src/api/google-vertex.lazy.ts:4]; lazy stream/simple delegates [E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]; contract [E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] |

## Sources

- `packages/ai/src/types.ts`
- `packages/ai/src/api/lazy.ts`
- `packages/ai/src/api/*.lazy.ts`

## 相关

- [subsys.ai.wire-protocol-dispatch](../subsystems/ai/wire-protocol-dispatch.md):解释 `Model.api` 如何选择 `ProviderStreams`,以及缺失 implementation 时如何转成 stream error。
