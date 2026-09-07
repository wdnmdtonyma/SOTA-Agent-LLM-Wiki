---
id: spine.provider-stream
title: provider 流式调用(统一→wire→归一)
kind: flow
tier: T0
pkg: ai
source:
  - packages/ai/src/models.ts
  - packages/ai/src/types.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/providers/openai.ts
  - packages/ai/src/providers/anthropic.ts
  - packages/ai/src/providers/github-copilot.ts
  - packages/ai/src/api/lazy.ts
  - packages/ai/src/api/openai-responses.lazy.ts
  - packages/ai/src/api/anthropic-messages.lazy.ts
  - packages/ai/src/api/openai-completions.lazy.ts
  - packages/ai/src/api/openai-responses.ts
  - packages/ai/src/api/openai-responses-shared.ts
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/api/anthropic-messages.ts
  - packages/ai/src/utils/event-stream.ts
  - packages/ai/src/api/transform-messages.ts
  - packages/ai/src/api/simple-options.ts
  - packages/ai/src/utils/provider-retry.ts
symbols:
  - Models.stream
  - streamSimple
  - ProviderStreams
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
updated: 9767ba275f
---

> `spine.provider-stream` 描述 `pi-ai` 中一次 LLM provider streaming call 如何从统一 `Models.stream` / `streamSimple` 入口,经过 provider/API dispatch 与 lazy loading,转成 provider wire request,再归一为 `AssistantMessageEventStream` 事件协议。产品侧 `ModelRuntime.streamSimple()` 走同一条 spine；`constrainedSampling` 作为 tool metadata 进入 `Context.tools`，不改变本页的 auth / dispatch / normalize 边界。

```mermaid
flowchart TD
  Caller["caller with Model + Context + options"] --> Models["Models.stream / Models.streamSimple"]
  Models --> LazyOuter["lazyStream outer AssistantMessageEventStream"]
  LazyOuter --> ProviderLookup["requireProvider(model)"]
  ProviderLookup --> Auth["applyAuth: resolve auth, merge apiKey headers env, optional baseUrl"]
  Auth --> Provider["Provider.stream / Provider.streamSimple"]
  Provider --> Dispatch["createProvider dispatch via single ProviderStreams or by model.api"]
  Dispatch --> LazyApi["lazyApi dynamic import of api/<name>.ts"]
  LazyApi --> Wire["wire module stream / streamSimple"]
  Wire --> Transform["build params + transformMessages"]
  Transform --> Retry["optional provider request retry<br/>fresh SDK request + abortable backoff"]
  Retry --> Normalize["provider wire events -> AssistantMessageEvent"]
  Normalize --> Result["done/error final AssistantMessage"]
```

## 能回答的问题

- `Models.stream` 和 `Models.streamSimple` 各自在哪一层做 auth,在哪一层进入 provider wire implementation?
- `model.api` 如何选择 `packages/ai/src/api/<name>.ts` 的 `ProviderStreams`?
- `lazyStream` / `lazyApi` 为什么能同步返回 stream,同时把 setup failure 编码成 stream error?
- `transformMessages` 在统一消息到 wire payload 之前处理哪些跨 provider 兼容问题?
- API implementation 如何把 Anthropic/OpenAI 等 provider-specific streaming event 归一成 `AssistantMessageEventStream`?

## 端到端步骤

1. 入口对象是 `ModelsImpl`,它持有 `Provider` map；`Models.stream` 调用 `lazyStream(model, async () => ...)`,由 `lazyStream` 同步构造并返回 outer `AssistantMessageEventStream`,真正的 provider lookup 和 auth resolution 在异步 setup 内执行。[E: packages/ai/src/models.ts:259] [E: packages/ai/src/models.ts:677] [E: packages/ai/src/api/lazy.ts:46] [E: packages/ai/src/api/lazy.ts:50] [E: packages/ai/src/api/lazy.ts:60] [E: packages/ai/src/models.ts:677]
2. `Models.stream` 的 async setup 先 `requireProvider(model)`,再 `applyAuth(model, options)`,最后调用 `provider.stream(requestModel, context, requestOptions)`；`streamSimple` 使用同一模式,但最终调用 `provider.streamSimple(requestModel, context, requestOptions)`。[E: packages/ai/src/models.ts:683] [E: packages/ai/src/models.ts:679] [E: packages/ai/src/models.ts:683] [E: packages/ai/src/models.ts:695] [E: packages/ai/src/models.ts:697] [E: packages/ai/src/models.ts:698] [E: packages/ai/src/models.ts:699]
3. `applyAuth` 使用 `getAuth` 取回 provider/model 的 request auth,把 auth `baseUrl` 写入 `requestModel`,并按字段合并 `apiKey`、`headers`、`env`；显式请求 options 对 `apiKey` 优先,`headers` 和 `env` 按 key 合并。[E: packages/ai/src/models.ts:641] [E: packages/ai/src/models.ts:649] [E: packages/ai/src/models.ts:660] [E: packages/ai/src/models.ts:661] [E: packages/ai/src/models.ts:663] [E: packages/ai/src/models.ts:664]
4. `createProvider` 把 provider 配置里的 `api` 归一成两种 dispatch:单一 `ProviderStreams` 直接复用,或者 `Partial<Record<api, ProviderStreams>>` 按 `model.api` 查找；没有匹配 API implementation 时返回一个 lazy stream error,不是同步 throw。[E: packages/ai/src/models.ts:788] [E: packages/ai/src/models.ts:801] [E: packages/ai/src/models.ts:792] [E: packages/ai/src/models.ts:799] [E: packages/ai/src/models.ts:800] [E: packages/ai/src/api/lazy.ts:54] [E: packages/ai/src/api/lazy.ts:56]
5. `Provider.stream` 和 `Provider.streamSimple` 都只负责把 `model/context/options` 交给 dispatch 选中的 `ProviderStreams.stream` 或 `ProviderStreams.streamSimple`；`ProviderStreams` contract 要求 API implementation 暴露这两个函数并返回 `AssistantMessageEventStream`。[E: packages/ai/src/models.ts:842] [E: packages/ai/src/models.ts:843] [E: packages/ai/src/types.ts:272] [E: packages/ai/src/types.ts:273] [E: packages/ai/src/types.ts:274]
6. `builtinModels()` 创建 `Models` collection 后遍历 `builtinProviders()` 并 `setProvider(provider)`；内置 provider factory 再把 provider 的 `api` 字段接到 lazy API wrapper,如 OpenAI -> `openAIResponsesApi()`、Anthropic -> `anthropicMessagesApi()`、GitHub Copilot -> `anthropic-messages` / `openai-completions` / `openai-responses` 的 per-API map。[E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:137] [E: packages/ai/src/providers/openai.ts:6] [E: packages/ai/src/providers/openai.ts:13] [E: packages/ai/src/providers/anthropic.ts:43] [E: packages/ai/src/providers/anthropic.ts:57] [E: packages/ai/src/providers/github-copilot.ts:9] [E: packages/ai/src/providers/github-copilot.ts:28] [E: packages/ai/src/providers/github-copilot.ts:29] [E: packages/ai/src/providers/github-copilot.ts:30]
7. `lazyApi(load)` 本身实现为 `ProviderStreams`:它的 `stream` 和 `streamSimple` 分别调用 `lazyStream(model, async () => (await load()).stream(...))` 和 `lazyStream(model, async () => (await load()).streamSimple(...))`；dynamic import failure 会落入 `lazyStream` 的 catch,变成 `error` event 和 final error message。[E: packages/ai/src/api/lazy.ts:73] [E: packages/ai/src/api/lazy.ts:75] [E: packages/ai/src/api/lazy.ts:76] [E: packages/ai/src/api/lazy.ts:77] [E: packages/ai/src/api/lazy.ts:54] [E: packages/ai/src/api/lazy.ts:56]
8. lazy wrapper 到 wire module 的绑定是逐 API 显式 dynamic import:`openAIResponsesApi()`、`anthropicMessagesApi()` 和 `openAICompletionsApi()` 都返回 `lazyApi(() => import("./<api>.ts"))`。[E: packages/ai/src/api/openai-responses.lazy.ts:4] [E: packages/ai/src/api/anthropic-messages.lazy.ts:4] [E: packages/ai/src/api/openai-completions.lazy.ts:4]
9. 具体 wire module 的 `streamSimple` 会把统一 `reasoning` 收窄成 provider-specific options:OpenAI Responses/Completions clamp 后传 `reasoningEffort`,Anthropic 无 reasoning 时显式禁用 thinking,adaptive thinking 时传 `effort`,非 adaptive thinking 时计算 `thinkingBudgetTokens`。[E: packages/ai/src/api/openai-responses.ts:211] [E: packages/ai/src/api/openai-responses.ts:222] [E: packages/ai/src/api/openai-responses.ts:227] [E: packages/ai/src/api/openai-completions.ts:726] [E: packages/ai/src/api/openai-completions.ts:742] [E: packages/ai/src/api/openai-completions.ts:742] [E: packages/ai/src/api/anthropic-messages.ts:873] [E: packages/ai/src/api/anthropic-messages.ts:860] [E: packages/ai/src/api/anthropic-messages.ts:893] [E: packages/ai/src/api/anthropic-messages.ts:893]
10. `SimpleStreamOptions.maxRetries` / `maxRetryDelayMs` 经 shared option adapter 进入 provider request。[E: packages/ai/src/api/simple-options.ts:21] [E: packages/ai/src/api/simple-options.ts:47] [E: packages/ai/src/api/simple-options.ts:48] 使用共享 helper 的 wire path 会在请求尚未建立成功时按 status/headers 与 server delay 做可取消重试；默认 `maxRetries` 为 0。[E: packages/ai/src/utils/provider-retry.ts:105] [E: packages/ai/src/utils/provider-retry.ts:109] [E: packages/ai/src/utils/provider-retry.ts:122] 这层不会重放已经开始消费的 normalized assistant event stream。[I]

## 统一消息到 wire payload

`transformMessages(messages, model, normalizeToolCallId?)` 是进入 provider-specific request builder 前的跨 provider normalization:它先按目标 model 的 `input` 能力把 unsupported image blocks 替换为文本 placeholder,再处理 assistant 历史消息里的 thinking blocks、tool call id、errored/aborted turns 和 orphaned tool calls。[E: packages/ai/src/api/transform-messages.ts:35] [E: packages/ai/src/api/transform-messages.ts:64] [E: packages/ai/src/api/transform-messages.ts:74] [E: packages/ai/src/api/transform-messages.ts:101] [E: packages/ai/src/api/transform-messages.ts:127]

`transformMessages` 的 tool-call normalization 维护 assistant/tool-result 一致性:assistant `toolCall.id` 可被 `normalizeToolCallId` 重写并记录到 `toolCallIdMap`,后续 `toolResult.toolCallId` 会按同一映射改写,避免历史消息跨 API replay 时出现不匹配的 tool result。[E: packages/ai/src/api/transform-messages.ts:70] [E: packages/ai/src/api/transform-messages.ts:84] [E: packages/ai/src/api/transform-messages.ts:136] [E: packages/ai/src/api/transform-messages.ts:139]

多个 wire builders 在生成 provider payload 前显式调用 `transformMessages`,但传入的 tool-call id normalizer 按 API 约束不同:OpenAI Responses 处理 `callId|itemId` 并确保 item id 以 `fc_` 开头,OpenAI Completions 提取/截断 call id,Anthropic 把 id 交给 `normalizeToolCallId` 后再 build params。[E: packages/ai/src/api/openai-responses-shared.ts:158] [E: packages/ai/src/api/openai-responses-shared.ts:166] [E: packages/ai/src/api/openai-responses-shared.ts:172] [E: packages/ai/src/api/openai-completions.ts:1186] [E: packages/ai/src/api/openai-completions.ts:1194] [E: packages/ai/src/api/openai-completions.ts:1212] [E: packages/ai/src/api/anthropic-messages.ts:1028]

## wire 到归一化事件

`AssistantMessageEventStream` 是 `EventStream<AssistantMessageEvent, AssistantMessage>` 的 specialization;它把 `done` event 的 `message` 或 `error` event 的 `error` 解析为 `.result()` 的 final `AssistantMessage`。[E: packages/ai/src/utils/event-stream.ts:69] [E: packages/ai/src/utils/event-stream.ts:72] [E: packages/ai/src/utils/event-stream.ts:74] [E: packages/ai/src/utils/event-stream.ts:76]

`EventStream.push` 在遇到 complete event 时标记 done 并 resolve final result,否则把 event 交给等待中的 consumer 或排进 queue;`end(result?)` 会关闭 stream 并唤醒所有等待中的 async iterator consumer。[E: packages/ai/src/utils/event-stream.ts:21] [E: packages/ai/src/utils/event-stream.ts:24] [E: packages/ai/src/utils/event-stream.ts:26] [E: packages/ai/src/utils/event-stream.ts:31] [E: packages/ai/src/utils/event-stream.ts:38] [E: packages/ai/src/utils/event-stream.ts:44]

`AssistantMessageEvent` 类型把 normalized stream 限定为 start/text/thinking/toolcall/done/error 事件集合,其中 `done` 携带 final `message`,`error` 携带 final `error`；`StreamFunction` contract 的返回类型同样是 `AssistantMessageEventStream`。[E: packages/ai/src/types.ts:546] [E: packages/ai/src/types.ts:547] [E: packages/ai/src/types.ts:557] [E: packages/ai/src/types.ts:562] [E: packages/ai/src/types.ts:334]

OpenAI Responses wire implementation 先创建 `AssistantMessageEventStream`,HTTP stream 建立后 push `start`,再由 `processResponsesStream` 将 Responses output item / delta / done events 归一为 thinking/text/toolcall events,最后按 final `output.stopReason` push `done` 或 catch 中 push `error`。[E: packages/ai/src/api/openai-responses.ts:116] [E: packages/ai/src/api/openai-responses.ts:164] [E: packages/ai/src/api/openai-responses.ts:173] [E: packages/ai/src/api/openai-responses.ts:175] [E: packages/ai/src/api/openai-responses.ts:192] [E: packages/ai/src/api/openai-responses.ts:203] [E: packages/ai/src/api/openai-responses-shared.ts:432]

Anthropic Messages wire implementation 同样创建 `AssistantMessageEventStream`,在 `messages.create` 后 push `start`,再把 Anthropic `content_block_start` / `content_block_delta` / `content_block_stop` 映射到 text/thinking/toolcall 生命周期,最后 push `done`。[E: packages/ai/src/api/anthropic-messages.ts:505] [E: packages/ai/src/api/anthropic-messages.ts:580] [E: packages/ai/src/api/anthropic-messages.ts:588] [E: packages/ai/src/api/anthropic-messages.ts:617] [E: packages/ai/src/api/anthropic-messages.ts:665] [E: packages/ai/src/api/anthropic-messages.ts:711] [E: packages/ai/src/api/anthropic-messages.ts:806]

## 关键决策点

- `Models.stream` / `streamSimple` 是统一入口和 auth boundary;provider-specific wire choices 不在 caller 侧展开,而是在 provider 的 `api` 配置与 `model.api` dispatch 中展开。[E: packages/ai/src/models.ts:156] [E: packages/ai/src/models.ts:672] [E: packages/ai/src/models.ts:695] [E: packages/ai/src/models.ts:792] [E: packages/ai/src/models.ts:842]
- `lazyStream` 把 async setup failure 转为符合 assistant event protocol 的 `error` terminal message,这让 caller 只需要消费一个 async iterable/result promise surface。[E: packages/ai/src/api/lazy.ts:46] [E: packages/ai/src/api/lazy.ts:50] [E: packages/ai/src/api/lazy.ts:54] [E: packages/ai/src/api/lazy.ts:56] [E: packages/ai/src/api/lazy.ts:60]
- `transformMessages` 是 replay compatibility layer,不是 wire serializer:它返回仍然是 `Message[]`。[E: packages/ai/src/api/transform-messages.ts:64] provider-specific builders 再把这些 message 转成 Responses `input`、Chat Completions `messages` 或 Anthropic `messages` payload shape。[E: packages/ai/src/api/openai-responses-shared.ts:172] [E: packages/ai/src/api/openai-completions.ts:1212] [E: packages/ai/src/api/anthropic-messages.ts:1028]

## 指向 T1/T2 深挖

- `subsys.ai.wire-protocol-dispatch` 应展开每个 `api/<name>.lazy.ts` 和 provider `api` map 的完整表;本页只描述 `createProvider` 的 dispatch spine。
- `subsys.ai.event-stream` 应展开 `EventStream` queue/waiter/result 语义、extension factory 和 async iterator edge cases;本页只描述 provider streaming 相关的 event protocol。
- `ref.ai.core-types` 应覆盖 `Model`、`Context`、`Message`、`AssistantMessageEvent`、`StreamOptions`、`SimpleStreamOptions` 的字段级含义;本页只引用这些类型在 stream path 里的角色。
- `subsys.ai.provider-retry` 区分 request-level backoff 与完整 assistant-call retry；本页只标出 request 建立阶段在 provider spine 上的位置。
- `spine.agent-loop` 是 `pi-agent-core` 消费 `AssistantMessageEventStream` 的上游 loop;本页停在 `pi-ai` 归一化事件输出边界。

## Sources

- packages/ai/src/models.ts
- packages/ai/src/types.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openai.ts
- packages/ai/src/providers/anthropic.ts
- packages/ai/src/providers/github-copilot.ts
- packages/ai/src/api/lazy.ts
- packages/ai/src/api/openai-responses.lazy.ts
- packages/ai/src/api/anthropic-messages.lazy.ts
- packages/ai/src/api/openai-completions.lazy.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/utils/event-stream.ts
- packages/ai/src/api/transform-messages.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/utils/provider-retry.ts

## 相关

- [spine.agent-loop](../spine/agent-loop.md) - `pi-agent-core` 如何消费 normalized assistant stream 并推进 agent loop。
- [subsys.ai.wire-protocol-dispatch](../subsystems/ai/wire-protocol-dispatch.md) - `model.api` 到 `api/<name>.ts` implementation 的完整派发表。
- [subsys.ai.event-stream](../subsystems/ai/event-stream.md) - `EventStream` / `AssistantMessageEventStream` 的数据结构和消费语义。
- [ref.ai.core-types](../reference/core-types.md) - `Model`、`Context`、`Message`、`AssistantMessageEvent` 等核心类型清单。
- [subsys.ai.provider-retry](../subsystems/ai/provider-retry.md) - provider request 与 assistant message 两层 retry 的触发、预算和 backoff。
