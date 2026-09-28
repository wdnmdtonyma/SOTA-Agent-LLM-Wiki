---
id: spine.provider-stream
title: provider 流式调用(统一→wire→归一)
kind: flow
tier: T0
pkg: ai
source:
 - packages/ai/src/models.ts
 - packages/ai/src/types.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/providers/all.ts
 - packages/ai/src/providers/openai.ts
 - packages/ai/src/providers/anthropic.ts
 - packages/ai/src/providers/github-copilot.ts
 - packages/ai/src/providers/opencode.ts
 - packages/ai/src/providers/opencode-go.ts
 - packages/ai/src/providers/opencode-headers.ts
 - packages/ai/src/api/lazy.ts
 - packages/ai/src/api/openai-responses.lazy.ts
 - packages/ai/src/api/anthropic-messages.lazy.ts
 - packages/ai/src/api/openai-completions.lazy.ts
 - packages/ai/src/api/openai-responses.ts
 - packages/ai/src/api/openai-responses-shared.ts
 - packages/ai/src/api/openai-completions.ts
 - packages/ai/src/api/anthropic-messages.ts
 - packages/ai/src/api/openai-codex-responses.ts
 - packages/ai/src/utils/event-stream.ts
 - packages/ai/src/api/transform-messages.ts
 - packages/ai/src/api/simple-options.ts
 - packages/ai/src/utils/provider-retry.ts
symbols:
 - Models.stream
 - streamSimple
 - ProviderStreams
 - TranscriptContext
 - normalizeContext
 - getCurrentTools
 - onProviderStreamEvent
 - AssistantMessageEventStream
 - transformMessages
related:
 - spine.agent-loop
 - subsys.ai.wire-protocol-dispatch
 - subsys.ai.event-stream
 - ref.ai.core-types
 - subsys.ai.provider-retry
evidence: explicit
status: verified
updated: 6f7551516b
---

> `spine.provider-stream` 描述 `pi-ai` 中一次 LLM provider streaming call 如何从统一 `Models.stream` / `streamSimple` 入口(`Context`),`normalizeContext()` 成 `TranscriptContext`,经过 provider/API dispatch 与 lazy loading,转成 provider wire request,再归一为 `AssistantMessageEventStream` 事件协议。产品侧 `ModelRuntime.streamSimple()` 走同一条 spine。

```mermaid
flowchart TD
 Caller["caller with Model + Context + options"] --> Models["Models.stream / Models.streamSimple"]
 Models --> Norm["normalizeContext → TranscriptContext"]
 Norm --> LazyOuter["lazyStream outer AssistantMessageEventStream"]
 LazyOuter --> ProviderLookup["requireChatProvider(model)"]
 ProviderLookup --> Auth["applyAuth: resolve auth, merge apiKey headers env"]
 Auth --> Provider["Provider.stream / Provider.streamSimple(TranscriptContext)"]
 Provider --> Dispatch["createProvider dispatch via single ProviderStreams or by model.api"]
 Dispatch --> LazyApi["lazyApi dynamic import of api/name.ts"]
 LazyApi --> Wire["wire module stream / streamSimple"]
 Wire --> Tools["getCurrentSystemPrompt / getCurrentTools"]
 Tools --> Transform["build params + transformMessages"]
 Transform --> Retry["optional provider request retry"]
 Retry --> Observe["onProviderStreamEvent before normalize"]
 Observe --> Normalize["provider wire events -> AssistantMessageEvent"]
 Normalize --> Result["done/error final AssistantMessage"]
```

## 能回答的问题

- `Models.stream` 和 `Models.streamSimple` 各自在哪一层做 auth,在哪一层把 `Context` 收成 `TranscriptContext`?
- custom / builtin provider 的 `stream` 输入为什么必须读 `getCurrentSystemPrompt` / `getCurrentTools`?
- `model.api` 如何选择 `packages/ai/src/api/<name>.ts` 的 `ProviderStreams`?
- `onProviderStreamEvent` 在归一化之前观察什么?
- `lazyStream` / `lazyApi` 为什么能同步返回 stream,同时把 setup failure 编码成 stream error?
- API implementation 如何把 Anthropic/OpenAI 等 provider-specific streaming event 归一成 `AssistantMessageEventStream`?

## 端到端步骤

1. 入口对象是 `ModelsImpl`,它持有 `Provider` map。公开 `Models.stream(model, context: Context, options?)` 先 `const transcript = normalizeContext(context)`,再 `lazyStream(model, async () => ...)` 同步构造并返回 outer `AssistantMessageEventStream`。`complete()` 只是 `this.stream(...).result()`。真正的 provider lookup 和 auth resolution 在异步 setup 内执行。[E: packages/ai/src/models.ts:865] [E: packages/ai/src/models.ts:870] [E: packages/ai/src/models.ts:871] [E: packages/ai/src/models.ts:886] [E: packages/ai/src/api/lazy.ts:46] [E: packages/ai/src/api/lazy.ts:60] [E: packages/ai/src/utils/transcript.ts:30]
2. `normalizeContext` 把 `Context.systemPrompt` / `Context.tools` 折成 leading system message(`toolsAdded`),产出带 brand 的 `TranscriptContext`。这是唯一生产该类型的入口;provider 与 `api/<name>.ts` 只接收 `messages`。[E: packages/ai/src/utils/transcript.ts:20] [E: packages/ai/src/utils/transcript.ts:30] [E: packages/ai/src/utils/transcript.ts:33] [E: packages/ai/src/types.ts:697] [E: packages/ai/src/types.ts:711]
3. setup 回调先 `requireChatProvider(model)`,再 `applyAuth(model, options)`,最后调用 `provider.stream(requestModel, transcript, requestOptions)`。`streamSimple` 同样先 `normalizeContext`,最终调用 `provider.streamSimple(requestModel, transcript, requestOptions)`。[E: packages/ai/src/models.ts:872] [E: packages/ai/src/models.ts:877] [E: packages/ai/src/models.ts:889] [E: packages/ai/src/models.ts:890] [E: packages/ai/src/models.ts:894]
4. `Provider.stream` / `ProviderStreams.stream` 的 context 参数是 `TranscriptContext`。wire module 用 `getCurrentSystemPrompt(messages)` / `getCurrentTools(messages)`(或 `getInitialSystemMessage` / `resolveTranscriptTools`)读 prompt 与当前工具,而不是 `context.systemPrompt` / `context.tools`。[E: packages/ai/src/models.ts:203] [E: packages/ai/src/types.ts:287] [E: packages/ai/src/utils/transcript.ts:58] [E: packages/ai/src/utils/transcript.ts:99] [E: packages/ai/src/api/anthropic-messages.ts:518] [E: packages/ai/src/api/openai-completions.ts:808]
5. `applyAuth` 使用 `getAuth` 取回 provider/model 的 request auth,把 auth `baseUrl` 写入 `requestModel`,并按字段合并 `apiKey`、`headers`、`env`;显式请求 options 对 `apiKey` 优先,`headers` 按 key 合并。[E: packages/ai/src/models.ts:831] [E: packages/ai/src/models.ts:842] [E: packages/ai/src/models.ts:853] [E: packages/ai/src/models.ts:854]
6. `createProvider` 把 provider 配置里的 `api` 归一成两种 dispatch:单一 `ProviderStreams` 直接复用,或者 `Partial<Record<api, ProviderStreams>>` 按 `model.api` 查找；没有匹配 API implementation 时返回一个 lazy stream error,不是同步 throw。[E: packages/ai/src/models.ts:1028] [E: packages/ai/src/models.ts:1029] [E: packages/ai/src/models.ts:1057] [E: packages/ai/src/models.ts:1064] [E: packages/ai/src/models.ts:1066] [E: packages/ai/src/api/lazy.ts:54]
7. `Provider.stream` 和 `Provider.streamSimple` 都只负责把 `model/context/options` 交给 dispatch 选中的 `ProviderStreams.stream` 或 `ProviderStreams.streamSimple`。[E: packages/ai/src/models.ts:1110] [E: packages/ai/src/models.ts:1111] [E: packages/ai/src/types.ts:287] [E: packages/ai/src/types.ts:288]
8. `builtinModels()` 创建 `Models` collection 后遍历 `builtinProviders()` 并 `setProvider(provider)`；内置 provider factory 再把 provider 的 `api` 字段接到 lazy API wrapper,如 OpenAI -> `openAIResponsesApi()`、Anthropic -> `anthropicMessagesApi()`、GitHub Copilot -> `anthropic-messages` / `openai-completions` / `openai-responses` 的 per-API map。[E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:184] [E: packages/ai/src/providers/all.ts:186] [E: packages/ai/src/providers/openai.ts:6] [E: packages/ai/src/providers/openai.ts:13] [E: packages/ai/src/providers/anthropic.ts:43] [E: packages/ai/src/providers/anthropic.ts:57] [E: packages/ai/src/providers/github-copilot.ts:9] [E: packages/ai/src/providers/github-copilot.ts:29] [E: packages/ai/src/providers/github-copilot.ts:30] [E: packages/ai/src/providers/github-copilot.ts:31]
 OpenCode Zen / Go 在 dispatch 前用 `withOpenCodeSessionHeader()` 包住各 API：有 `sessionId` 就写 `x-opencode-session`，不看 `cacheRetention`。Zen 四条 API，Go 三条（无 `google-generative-ai`）。[E: packages/ai/src/providers/opencode-headers.ts:10] [E: packages/ai/src/providers/opencode-headers.ts:14] [E: packages/ai/src/providers/opencode-headers.ts:19] [E: packages/ai/src/providers/opencode.ts:19] [E: packages/ai/src/providers/opencode.ts:22] [E: packages/ai/src/providers/opencode-go.ts:16] [E: packages/ai/src/providers/opencode-go.ts:18]
9. `lazyApi(load)` 本身实现为 `ProviderStreams`:它的 `stream` 和 `streamSimple` 分别调用 `lazyStream(model, async () => (await load()).stream(...))`。[E: packages/ai/src/api/lazy.ts:73] [E: packages/ai/src/api/lazy.ts:75] [E: packages/ai/src/api/lazy.ts:76] [E: packages/ai/src/api/lazy.ts:77]
10. lazy wrapper 到 wire module 的绑定是逐 API 显式 dynamic import:`openAIResponsesApi()`、`anthropicMessagesApi()` 和 `openAICompletionsApi()` 都返回 `lazyApi(() => import("./<api>.ts"))`。[E: packages/ai/src/api/openai-responses.lazy.ts:4] [E: packages/ai/src/api/anthropic-messages.lazy.ts:4] [E: packages/ai/src/api/openai-completions.lazy.ts:4]
11. 具体 wire module 的 `streamSimple` 会把统一 `reasoning` 收窄成 provider-specific options:OpenAI Responses/Completions clamp 后传 `reasoningEffort`,Anthropic 无 reasoning 时显式禁用 thinking。[E: packages/ai/src/api/openai-responses.ts:220] [E: packages/ai/src/api/openai-responses.ts:232] [E: packages/ai/src/api/openai-completions.ts:731] [E: packages/ai/src/api/anthropic-messages.ts:866] [E: packages/ai/src/api/anthropic-messages.ts:877]
12. `SimpleStreamOptions.maxRetries` / `maxRetryDelayMs` 经 shared option adapter 进入 provider request,并转发 `onProviderStreamEvent`。[E: packages/ai/src/api/simple-options.ts:41] [E: packages/ai/src/api/simple-options.ts:44] 使用共享 helper 的 wire path 会在请求尚未建立成功时按 status/headers 与 server delay 做可取消重试；默认 `maxRetries` 为 0。[E: packages/ai/src/utils/provider-retry.ts:105] [E: packages/ai/src/utils/provider-retry.ts:109] [I]

## `onProviderStreamEvent`

`StreamOptions.onProviderStreamEvent` 在 adapter 把解析后的 provider event 归一成 `AssistantMessageEvent` **之前**调用。event data 是 adapter-owned,必须当只读;不保证是原始 HTTP/SSE bytes。adapter 显式支持才会 invoke。[E: packages/ai/src/types.ts:198]

代表性调用点:Anthropic 在 `iterateAnthropicEvents` 循环里;OpenAI Completions 在 `for await (const chunk of openaiStream)` 里;OpenAI Responses shared processor 在 `for await (const event of openaiStream)` 里;Codex 在 `mapCodexEvents` yield 之前。[E: packages/ai/src/api/anthropic-messages.ts:602] [E: packages/ai/src/api/openai-completions.ts:554] [E: packages/ai/src/api/openai-responses-shared.ts:601] [E: packages/ai/src/api/openai-codex-responses.ts:751]

## 统一消息到 wire payload

`transformMessages(messages, model, normalizeToolCallId?)` 是进入 provider-specific request builder 前的跨 provider normalization:它先按目标 model 的 `input` 能力把 unsupported image blocks 替换为文本 placeholder,再处理 assistant 历史消息里的 thinking blocks、tool call id、errored/aborted turns 和 orphaned tool calls。[E: packages/ai/src/api/transform-messages.ts:64] [E: packages/ai/src/api/transform-messages.ts:74]

`transformMessages` 的 tool-call normalization 维护 assistant/tool-result 一致性:assistant `toolCall.id` 可被 `normalizeToolCallId` 重写并记录到 `toolCallIdMap`,后续 `toolResult.toolCallId` 会按同一映射改写。[E: packages/ai/src/api/transform-messages.ts:70]

多个 wire builders 在生成 provider payload 前显式调用 `transformMessages`,但传入的 tool-call id normalizer 按 API 约束不同:OpenAI Responses 处理 `callId|itemId` 并确保 item id 以 `fc_` 开头,OpenAI Completions 提取/截断 call id,Anthropic 把 id 交给 `normalizeToolCallId` 后再 build params。[E: packages/ai/src/api/openai-responses-shared.ts:179] [E: packages/ai/src/api/openai-completions.ts:1220] [E: packages/ai/src/api/anthropic-messages.ts:1053]

## wire 到归一化事件

`AssistantMessageEventStream` 是 `EventStream<AssistantMessageEvent, AssistantMessage>` 的 specialization;它把 `done` event 的 `message` 或 `error` event 的 `error` 解析为 `.result()` 的 final `AssistantMessage`。[E: packages/ai/src/utils/event-stream.ts:91] [E: packages/ai/src/utils/event-stream.ts:94] [E: packages/ai/src/utils/event-stream.ts:96] [E: packages/ai/src/utils/event-stream.ts:99]

`AssistantMessageEvent` 类型把 normalized stream 限定为 start/text/thinking/toolcall/done/error 事件集合;`StreamFunction` contract 的返回类型同样是 `AssistantMessageEventStream`,输入是 `TranscriptContext`。[E: packages/ai/src/types.ts:364] [E: packages/ai/src/types.ts:366] [E: packages/ai/src/types.ts:732]

OpenAI Responses wire implementation 先创建 `AssistantMessageEventStream`,HTTP stream 建立后 push `start`,再由 `processResponsesStream` 将 Responses output item / delta / done events 归一为 thinking/text/toolcall events。[E: packages/ai/src/api/openai-responses.ts:113] [E: packages/ai/src/api/openai-responses.ts:178] [E: packages/ai/src/api/openai-responses.ts:180] [E: packages/ai/src/api/openai-responses-shared.ts:434]

Anthropic Messages wire implementation 同样创建 `AssistantMessageEventStream`,在 `messages.create` 后 push `start`,再把 Anthropic `content_block_start` / `content_block_delta` / `content_block_stop` 映射到 text/thinking/toolcall 生命周期。[E: packages/ai/src/api/anthropic-messages.ts:511] [E: packages/ai/src/api/anthropic-messages.ts:596] [E: packages/ai/src/api/anthropic-messages.ts:627]

## 关键决策点

- `Models.stream` / `streamSimple` 是统一入口、auth boundary 和 `Context` → `TranscriptContext` 归一边界;provider-specific wire 不再看见 `systemPrompt`/`tools` 顶层字段。[E: packages/ai/src/models.ts:865] [E: packages/ai/src/models.ts:870] [E: packages/ai/src/types.ts:711]
- `lazyStream` 把 async setup failure 转为符合 assistant event protocol 的 `error` terminal message。[E: packages/ai/src/api/lazy.ts:46] [E: packages/ai/src/api/lazy.ts:54] [E: packages/ai/src/api/lazy.ts:56]
- `transformMessages` 是 replay compatibility layer,不是 wire serializer:它返回仍然是 `Message[]`。[E: packages/ai/src/api/transform-messages.ts:64]

## 指向 T1/T2 深挖

- `subsys.ai.wire-protocol-dispatch` 应展开每个 `api/<name>.lazy.ts` 和 provider `api` map 的完整表;本页只描述 `createProvider` 的 dispatch spine。
- `subsys.ai.event-stream` 应展开 `EventStream` queue/waiter/result 语义;本页只描述 provider streaming 相关的 event protocol。
- `ref.ai.core-types` 应覆盖 `Model`、`Context`、`TranscriptContext`、`Message`、`AssistantMessageEvent`、`StreamOptions` 的字段级含义。
- `subsys.ai.provider-retry` 区分 request-level backoff 与完整 assistant-call retry。
- `spine.agent-loop` 是 `pi-agent-core` 消费 `AssistantMessageEventStream` 的上游 loop;本页停在 `pi-ai` 归一化事件输出边界。

## Sources

- packages/ai/src/models.ts
- packages/ai/src/types.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openai.ts
- packages/ai/src/providers/anthropic.ts
- packages/ai/src/providers/github-copilot.ts
- packages/ai/src/providers/opencode.ts
- packages/ai/src/providers/opencode-go.ts
- packages/ai/src/providers/opencode-headers.ts
- packages/ai/src/api/lazy.ts
- packages/ai/src/api/openai-responses.lazy.ts
- packages/ai/src/api/anthropic-messages.lazy.ts
- packages/ai/src/api/openai-completions.lazy.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/utils/event-stream.ts
- packages/ai/src/api/transform-messages.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/utils/provider-retry.ts

## 相关

- [spine.agent-loop](../spine/agent-loop.md) - `pi-agent-core` 如何消费 normalized assistant stream 并推进 agent loop。
- [subsys.ai.wire-protocol-dispatch](../subsystems/ai/wire-protocol-dispatch.md) - `model.api` 到 `api/<name>.ts` implementation 的完整派发表。
- [subsys.ai.event-stream](../subsystems/ai/event-stream.md) - `EventStream` / `AssistantMessageEventStream` 的数据结构和消费语义。
- [ref.ai.core-types](../reference/core-types.md) - `Model`、`Context`、`TranscriptContext`、`Message`、`AssistantMessageEvent` 等核心类型清单。
- [subsys.ai.provider-retry](../subsystems/ai/provider-retry.md) - provider request 与 assistant message 两层 retry 的触发、预算和 backoff。
