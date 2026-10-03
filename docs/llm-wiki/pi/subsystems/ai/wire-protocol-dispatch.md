---
id: subsys.ai.wire-protocol-dispatch
title: wire 协议调度层
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/models.ts
  - packages/ai/src/api/lazy.ts
  - packages/ai/src/types.ts
  - packages/ai/src/utils/transcript.ts
  - packages/ai/src/api/openai-responses.lazy.ts
  - packages/ai/src/api/anthropic-messages.lazy.ts
  - packages/ai/src/api/google-generative-ai.lazy.ts
  - packages/ai/src/api/bedrock-converse-stream.lazy.ts
  - packages/ai/src/api/openrouter-images.lazy.ts
  - packages/ai/src/api/openai-responses.ts
  - packages/ai/src/api/openai-responses-shared.ts
  - packages/ai/src/api/anthropic-messages.ts
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/api/transform-messages.ts
  - packages/ai/src/providers/github-copilot.ts
symbols:
  - ProviderStreams
  - TranscriptContext
  - stream
  - streamSimple
  - normalizeContext
related:
  - spine.provider-stream
  - ref.ai.wire-protocol-catalog
  - subsys.ai.message-transform
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.ai.wire-protocol-dispatch` 说明 `pi-ai` 如何把统一的 `Model` + `Context` streaming request 先 `normalizeContext()` 成 `TranscriptContext`,再按 `Model.api` 分派到 `packages/ai/src/api/<name>.ts` 的 `stream` / `streamSimple` wire implementation。

## 能回答的问题

- `ProviderStreams` 对每个 wire implementation 要求哪些导出函数,context 类型是什么?
- `Models.stream` 和 `Models.streamSimple` 在调用 provider 前如何把 `Context` 收成 `TranscriptContext`?
- wire module 必须用 `getCurrentSystemPrompt` / `getCurrentTools` 读什么?
- `onProviderStreamEvent` 属于哪一层的 options,dispatch 是否改写它?
- `createProvider` 如何在单一 API implementation 与 `model.api` map 之间选择?
- `<name>.lazy.ts` 文件在 dispatch 链路中承担什么职责?
- 缺失 `model.api` implementation 时,错误为什么表现为 stream error 而不是同步 throw?

## 职责边界

wire 协议调度层的职责是选择并调用一个 `ProviderStreams` implementation;`ProviderStreams` 的 runtime contract 必选 `stream` 与 `streamSimple`(二者接收 `TranscriptContext`,返回 `AssistantMessageEventStream`),并可选 `fetchDeferred` / `cancelDeferred`。[E: packages/ai/src/types.ts:286] [E: packages/ai/src/types.ts:287] [E: packages/ai/src/types.ts:288] [E: packages/ai/src/types.ts:293] [E: packages/ai/src/types.ts:298] 因此 provider-specific payload 构造与 event normalization 不属于 dispatch contract 本身,而属于具体 `api/<name>.ts` implementation 的职责边界。[I]

dispatch 的输入模型是 `Model<TApi>`,其中 `api` 字段保存 wire 协议名,`provider` 字段保存 provider id;因此同一个 provider 可以持有多个 API implementation,选择键来自 model metadata 而不是 caller 手写的协议枚举。[E: packages/ai/src/models.ts:1034] [E: packages/ai/src/models.ts:1063]

`Models.stream` / `Models.streamSimple` 是上层统一入口、auth 边界和 transcript 归一边界:它们先 `normalizeContext(context)` 得到 `TranscriptContext`,再返回 `lazyStream` 包装的 `AssistantMessageEventStream`,在异步 setup 中执行 provider lookup、auth 合并和 `provider.stream(requestModel, transcript, requestOptions)`。[E: packages/ai/src/models.ts:871] [E: packages/ai/src/models.ts:876] [E: packages/ai/src/models.ts:883] [E: packages/ai/src/models.ts:895] [E: packages/ai/src/models.ts:896] [E: packages/ai/src/utils/transcript.ts:30]

## 关键文件

- `packages/ai/src/types.ts`:定义 `KnownApi` 名称集合、`ApiOptionsMap` / `ApiStreamOptions<TApi>` 的类型映射、`ProviderStreams` 的 wire module contract(`TranscriptContext`)、`StreamFunction` 的函数形状,以及 `onProviderStreamEvent`。[E: packages/ai/src/types.ts:17] [E: packages/ai/src/types.ts:257] [E: packages/ai/src/types.ts:274] [E: packages/ai/src/types.ts:286] [E: packages/ai/src/types.ts:198] [E: packages/ai/src/types.ts:371] [E: packages/ai/src/types.ts:373]
- `packages/ai/src/models.ts`:实现 `ModelsImpl.stream` / `streamSimple` 的 `normalizeContext` + provider/auth wrapper,以及 `createProvider` 对单 API 与 per-API map 的 dispatch。[E: packages/ai/src/models.ts:871] [E: packages/ai/src/models.ts:1034] [E: packages/ai/src/models.ts:1063] [E: packages/ai/src/models.ts:1116]
- `packages/ai/src/utils/transcript.ts`:`normalizeContext` / `getCurrentSystemPrompt` / `getCurrentTools` / `resolveTranscript`。[E: packages/ai/src/utils/transcript.ts:30] [E: packages/ai/src/utils/transcript.ts:58] [E: packages/ai/src/utils/transcript.ts:99]
- `packages/ai/src/api/lazy.ts`:实现 `lazyStream` 和 `lazyApi`,把 lazy import/auth/setup 的异步失败转为 terminal `error` event。[E: packages/ai/src/api/lazy.ts:46] [E: packages/ai/src/api/lazy.ts:54] [E: packages/ai/src/api/lazy.ts:73]
- `packages/ai/src/api/<name>.lazy.ts`:文字模型 wire 协议的常规 lazy wrapper 返回 `ProviderStreams`,并直接 `lazyApi(() => import("./<name>.ts"))`。[E: packages/ai/src/api/openai-responses.lazy.ts:4] [E: packages/ai/src/api/anthropic-messages.lazy.ts:4] [E: packages/ai/src/api/google-generative-ai.lazy.ts:4]
- `packages/ai/src/api/<name>.ts`:`StreamFunction` 要求 `stream(model, context: TranscriptContext, options?)`。OpenAI Responses 与 Anthropic Messages 是这一路径的代表性 implementation。[E: packages/ai/src/api/openai-responses.ts:127] [E: packages/ai/src/api/openai-responses.ts:129] [E: packages/ai/src/api/anthropic-messages.ts:571] [E: packages/ai/src/api/anthropic-messages.ts:573]

## 数据模型

`ProviderStreams` 是调度层的最小可执行值:必选 `stream(model, context: TranscriptContext, options?)` 和 `streamSimple(model, context: TranscriptContext, options?)`,二者都返回 `AssistantMessageEventStream`;可选 `fetchDeferred` / `cancelDeferred` 由 `createProvider` 在任一 implementation 声明时挂到 provider,并由 `lazyApi` 按 `LazyApiCapabilities` 转发。[E: packages/ai/src/types.ts:287] [E: packages/ai/src/types.ts:288] [E: packages/ai/src/models.ts:1116] [E: packages/ai/src/models.ts:1121] [E: packages/ai/src/api/lazy.ts:68]

`TranscriptContext` 只有 `messages`;prompt 与 tools 活在 system messages 的 `content` / `toolsAdded` / `toolsRemoved` 上。`Context` 仍是公开入口的 shorthand。[E: packages/ai/src/types.ts:732] [E: packages/ai/src/types.ts:746] [E: packages/ai/src/utils/transcript.ts:10] [E: packages/ai/src/utils/transcript.ts:20]

`StreamFunction<TApi, TOptions>` 是 wire implementation 的函数形状,第一个数据参数是 `TranscriptContext`,返回 `AssistantMessageEventStream`。[E: packages/ai/src/types.ts:371] [E: packages/ai/src/types.ts:373]

`CreateProviderOptions.api` 接受两种形态:一个 `ProviderStreams` 供所有 models 复用,或一个 `Partial<Record<TApi, ProviderStreams>>` 供 mixed-API provider 按 `model.api` 分派。也可以只给 `images` / `classifiers` 而不给 chat `api`(例如 TypeSafe)。[E: packages/ai/src/models.ts:989] [E: packages/ai/src/models.ts:1019] [E: packages/ai/src/models.ts:1045]

`ApiStreamOptions<TApi>` 把 known API string 映射到 provider-specific options type;未知自定义 API string 退回到 generic `StreamOptions & Record<string, unknown>`。`onProviderStreamEvent` 在 `StreamOptions` 上,dispatch 原样转交,不改写。[E: packages/ai/src/types.ts:198] [E: packages/ai/src/types.ts:274] [E: packages/ai/src/models.ts:1116]

`SimpleStreamOptions` 是统一 convenience surface,在 `StreamOptions` 上额外携带 `toolChoice`、`reasoning`、`deferred` 与 `thinkingBudgets`。[E: packages/ai/src/types.ts:350] [E: packages/ai/src/types.ts:352] [E: packages/ai/src/types.ts:353] [E: packages/ai/src/types.ts:355]

## 控制流

1. `ModelsImpl.stream@packages/ai/src/models.ts:865` 先 `normalizeContext(context)`,再 `lazyStream(model, async () => ...)`,所以 caller 立即得到一个 `AssistantMessageEventStream`;真正的 provider lookup 在 setup 回调内执行。[E: packages/ai/src/models.ts:871] [E: packages/ai/src/models.ts:876] [E: packages/ai/src/models.ts:877] [E: packages/ai/src/api/lazy.ts:50] [E: packages/ai/src/api/lazy.ts:60]
2. setup 回调执行 `requireChatProvider(model)`,再执行 `applyAuth(model, options)`,最后调用 `provider.stream(requestModel, transcript, requestOptions)`;`streamSimple` 用同样框架调用 `provider.streamSimple(...)`。[E: packages/ai/src/models.ts:878] [E: packages/ai/src/models.ts:879] [E: packages/ai/src/models.ts:883] [E: packages/ai/src/models.ts:900]
3. `applyAuth` 把 resolved auth 的 `baseUrl` 写入 request model,并合并 `apiKey`、`headers`、`env`;显式 request options 对 `apiKey` 优先。[E: packages/ai/src/models.ts:837] [E: packages/ai/src/models.ts:859] [E: packages/ai/src/models.ts:860]
4. `createProvider@packages/ai/src/models.ts:1028` 先判断 `input.api` 是否有 callable `stream`;有则视作 single `ProviderStreams`,否则视作 by-API map。[E: packages/ai/src/models.ts:1035] [E: packages/ai/src/models.ts:1036] [E: packages/ai/src/models.ts:1039]
5. `apiFor(model)` 返回 single implementation 或 `byApi?.[model.api]`;这就是 wire 协议按 `Model.api` 派发的核心代码路径。[E: packages/ai/src/models.ts:1063]
6. `dispatch(model, run)` 找不到 implementation 时返回 `lazyStream` 包装的 `ModelsError("stream", ...)`;因此缺失 API implementation 会进入 `lazyStream` 的 async setup failure 路径,而不是从 provider method 同步抛出。[E: packages/ai/src/models.ts:1069] [E: packages/ai/src/models.ts:1070] [E: packages/ai/src/models.ts:1072] [E: packages/ai/src/api/lazy.ts:54]
7. provider 的 `stream` / `streamSimple` method 只把 `model/context/options` 转交给 dispatch 选出的 `ProviderStreams.stream` 或 `ProviderStreams.streamSimple`。[E: packages/ai/src/models.ts:1116] [E: packages/ai/src/models.ts:1117]
8. `lazyApi(load, capabilities?)` 自身返回 `ProviderStreams`:它的 `stream` / `streamSimple` 等待 `load()` 后调用目标 module,并把同一个 `TranscriptContext` 传下去。[E: packages/ai/src/api/lazy.ts:73] [E: packages/ai/src/api/lazy.ts:75] [E: packages/ai/src/api/lazy.ts:76]
9. `lazyStream` 的 `setup().catch` 构造 `error` assistant message,向 outer stream push `{ type: "error", reason: "error", error: message }`,再 `end(message)`。[E: packages/ai/src/api/lazy.ts:54] [E: packages/ai/src/api/lazy.ts:56] [E: packages/ai/src/api/lazy.ts:57]

## 设计动机与权衡

dispatch 以 `ProviderStreams` 为 runtime value,让 provider factory 可以只声明一个 single implementation,也可以声明 mixed-API map;GitHub Copilot 就把 `"anthropic-messages"`、`"openai-completions"`、`"openai-responses"` 三个 `model.api` 显式映射到不同 lazy wrappers。[E: packages/ai/src/models.ts:1035] [E: packages/ai/src/providers/github-copilot.ts:28] [E: packages/ai/src/providers/github-copilot.ts:29] [E: packages/ai/src/providers/github-copilot.ts:30] [E: packages/ai/src/providers/github-copilot.ts:31]

`lazyStream` 把 auth resolution、dynamic import、缺失 API implementation 这些 setup failure 都压进同一个 assistant event protocol。[E: packages/ai/src/api/lazy.ts:46] [E: packages/ai/src/api/lazy.ts:54] [I]

`streamSimple` 保持统一 caller surface,但 provider options 的具体映射仍在 wire module 内完成;例如 OpenAI Responses 把 `reasoning` clamp 后转成 `reasoningEffort`,Anthropic Messages 在 no-reasoning、adaptive thinking、budget thinking 三种路径间选择 provider-specific options。[E: packages/ai/src/api/openai-responses.ts:238] [E: packages/ai/src/api/openai-responses.ts:250] [E: packages/ai/src/api/anthropic-messages.ts:941] [E: packages/ai/src/api/anthropic-messages.ts:950] [E: packages/ai/src/api/anthropic-messages.ts:970]

wire 实现必须从 transcript 读 prompt/tools。Anthropic `stream` 入口立刻 `getCurrentTools(normalizedContext.messages)`;Completions `buildParams` 用 `resolveTranscriptTools(context.messages, ...)`。自定义 `streamSimple` 同样必须读 `getCurrentSystemPrompt(context.messages)` / `getCurrentTools(context.messages)`,不能再期望 `context.systemPrompt` / `context.tools`。[E: packages/ai/src/api/anthropic-messages.ts:578] [E: packages/ai/src/api/openai-completions.ts:808] [E: packages/ai/src/utils/transcript.ts:58] [E: packages/ai/src/utils/transcript.ts:99]

## gotcha

不要把 README 或 provider 名称当作 wire 协议 ground truth。[I] 文字模型 wire 协议的核验路径是 `Model.api` -> `createProvider` 的 `api` / by-API map -> `api/<name>.lazy.ts` -> `api/<name>.ts` 的 `stream` / `streamSimple`。[E: packages/ai/src/models.ts:1063] [E: packages/ai/src/api/lazy.ts:76]

Bedrock 的 lazy wrapper 是一个特例:它通过 variable specifier import 加载 Node-only AWS SDK implementation,并允许 Bun binary build 注入 `bedrockModuleOverride`;因此不能把所有 `<name>.lazy.ts` 都机械理解成一行静态 dynamic import。[E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:10] [E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:22] [E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:26] [E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:29]

`KnownApi` 是已知文字 API 的类型集合,但 `Api = KnownApi | (string & {})` 允许 custom API string;如果 custom provider 给出未知 `model.api`,运行时仍必须提供匹配的 `ProviderStreams` map entry,否则 dispatch 会生成 stream error。[E: packages/ai/src/types.ts:17] [E: packages/ai/src/types.ts:29] [E: packages/ai/src/models.ts:1063] [E: packages/ai/src/models.ts:1072]

图片 API 不走本节点的 `ProviderStreams` contract;`ProviderImages` 使用 `generateImages(...)` Promise contract,`openrouter-images.lazy.ts` 也返回 `ProviderImages` 而不是 `ProviderStreams`。[E: packages/ai/src/types.ts:307] [E: packages/ai/src/types.ts:308] [E: packages/ai/src/api/openrouter-images.lazy.ts:3] [E: packages/ai/src/api/openrouter-images.lazy.ts:4]

## 跨包边界

`spine.provider-stream` 描述从 `Models.stream` 到 normalized assistant events 的端到端主路径;本节点只展开其中 `ProviderStreams` selection、lazy loading 与 `model.api` dispatch 这一段。[I]

`subsys.ai.message-transform` 是 wire payload 前的消息归一化边界:dispatch 层只把 `TranscriptContext` 交给 wire module。`transformMessages(messages, model, ...)` 本身处理 unsupported image downgrade、thinking replay、tool call id normalization 与 orphaned tool result 补齐,并由 provider-specific builders 调用。[E: packages/ai/src/api/transform-messages.ts:64] [E: packages/ai/src/api/openai-responses-shared.ts:179] [E: packages/ai/src/api/anthropic-messages.ts:1134]

`ref.ai.wire-protocol-catalog` 应逐项列出每个 `api/<name>.lazy.ts`、目标 `api/<name>.ts` 与 provider bindings;本节点只保留 dispatch invariant 和 representative evidence。[I]

下游 agent / coding-agent 应通过 `Models.stream` / `Models.streamSimple` 或兼容 facade 消费 `AssistantMessageEventStream`,不应绕过 `Models` 的 auth、`normalizeContext` 与 dispatch 边界直接选择 `api/<name>.ts`。[I]

## Sources

- packages/ai/src/models.ts
- packages/ai/src/api/lazy.ts
- packages/ai/src/types.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/api/openai-responses.lazy.ts
- packages/ai/src/api/anthropic-messages.lazy.ts
- packages/ai/src/api/google-generative-ai.lazy.ts
- packages/ai/src/api/bedrock-converse-stream.lazy.ts
- packages/ai/src/api/openrouter-images.lazy.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/transform-messages.ts
- packages/ai/src/providers/github-copilot.ts

## 相关

- [spine.provider-stream](../../spine/provider-stream.md) - `Models.stream` 到 normalized assistant event stream 的端到端主路径。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md) - 每个 wire 协议 lazy wrapper、implementation module 与 provider binding 的目录。
- [subsys.ai.message-transform](message-transform.md) - provider-specific payload builder 调用前的消息归一化规则。
