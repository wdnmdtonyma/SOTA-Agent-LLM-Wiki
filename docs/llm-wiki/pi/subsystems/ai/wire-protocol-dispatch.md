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
symbols:
  - ProviderStreams
  - stream
  - streamSimple
related:
  - spine.provider-stream
  - ref.ai.wire-protocol-catalog
  - subsys.ai.message-transform
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.wire-protocol-dispatch` 说明 `pi-ai` 如何把统一的 `Model` + `Context` streaming request,按 `Model.api` 分派到 `packages/ai/src/api/<name>.ts` 的 `stream` / `streamSimple` wire implementation。

## 能回答的问题

- `ProviderStreams` 对每个 wire implementation 要求哪些导出函数?
- `Models.stream` 和 `Models.streamSimple` 在调用 provider 前做了哪些同步/异步边界处理?
- `createProvider` 如何在单一 API implementation 与 `model.api` map 之间选择?
- `<name>.lazy.ts` 文件在 dispatch 链路中承担什么职责?
- 缺失 `model.api` implementation 时,错误为什么表现为 stream error 而不是同步 throw?
- `streamSimple` 与 provider-specific `stream` 的边界在哪里?

## 职责边界

wire 协议调度层的职责是选择并调用一个 `ProviderStreams` implementation;`ProviderStreams` 的 runtime contract 只暴露 `stream` 与 `streamSimple`,二者返回 `AssistantMessageEventStream`。[E: packages/ai/src/types.ts:222][E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224] 因此 provider-specific payload 构造与 event normalization 不属于 dispatch contract 本身,而属于具体 `api/<name>.ts` implementation 的职责边界。[I]

dispatch 的输入模型是 `Model<TApi>`,其中 `api` 字段保存 wire 协议名,`provider` 字段保存 provider id;因此同一个 provider 可以持有多个 API implementation,选择键来自 model metadata 而不是 caller 手写的协议枚举。[E: packages/ai/src/types.ts:666][E: packages/ai/src/types.ts:669][E: packages/ai/src/types.ts:670][E: packages/ai/src/models.ts:314][E: packages/ai/src/models.ts:327][E: packages/ai/src/models.ts:329][E: packages/ai/src/models.ts:331]

`Models.stream` / `Models.streamSimple` 是上层统一入口和 auth 边界:它们先返回 `lazyStream` 包装的 `AssistantMessageEventStream`,再在异步 setup 中执行 provider lookup、auth 合并和 provider 调用。[E: packages/ai/src/models.ts:263][E: packages/ai/src/models.ts:264][E: packages/ai/src/models.ts:265][E: packages/ai/src/models.ts:266][E: packages/ai/src/models.ts:279][E: packages/ai/src/models.ts:280][E: packages/ai/src/models.ts:281][E: packages/ai/src/models.ts:282]

## 关键文件

- `packages/ai/src/types.ts`:定义 `KnownApi` 名称集合、`ApiStreamOptions<TApi>` 的类型映射、`ProviderStreams` 的 wire module contract,以及 `StreamFunction` 的函数形状。[E: packages/ai/src/types.ts:15][E: packages/ai/src/types.ts:24][E: packages/ai/src/types.ts:194][E: packages/ai/src/types.ts:210][E: packages/ai/src/types.ts:222][E: packages/ai/src/types.ts:304][E: packages/ai/src/types.ts:308]
- `packages/ai/src/models.ts`:实现 `ModelsImpl.stream` / `streamSimple` 的 provider/auth wrapper,以及 `createProvider` 对单 API 与 per-API map 的 dispatch。[E: packages/ai/src/models.ts:258][E: packages/ai/src/models.ts:278][E: packages/ai/src/models.ts:323][E: packages/ai/src/models.ts:327][E: packages/ai/src/models.ts:331][E: packages/ai/src/models.ts:365]
- `packages/ai/src/api/lazy.ts`:实现 `lazyStream` 和 `lazyApi`,把 lazy import/auth/setup 的异步失败转为 terminal `error` event。[E: packages/ai/src/api/lazy.ts:39][E: packages/ai/src/api/lazy.ts:43][E: packages/ai/src/api/lazy.ts:49][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:52][E: packages/ai/src/api/lazy.ts:63]
- `packages/ai/src/api/<name>.lazy.ts`:文字模型 wire 协议的常规 lazy wrapper 返回 `ProviderStreams`,并直接 `lazyApi(() => import("./<name>.ts"))`;OpenAI Responses、Anthropic Messages、Google Generative AI 都是这种形态。[E: packages/ai/src/api/openai-responses.lazy.ts:4][E: packages/ai/src/api/anthropic-messages.lazy.ts:4][E: packages/ai/src/api/google-generative-ai.lazy.ts:4]
- `packages/ai/src/api/<name>.ts`:`KnownApi` 列出文字 wire API 名称集合,`ProviderStreams` interface 要求 `stream` 与 `streamSimple`;OpenAI Responses 与 Anthropic Messages 是这一路径的代表性 implementation。[E: packages/ai/src/types.ts:15][E: packages/ai/src/types.ts:24][E: packages/ai/src/types.ts:222][E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224][E: packages/ai/src/api/openai-responses.ts:98][E: packages/ai/src/api/openai-responses.ts:176][E: packages/ai/src/api/anthropic-messages.ts:468][E: packages/ai/src/api/anthropic-messages.ts:767]

## 数据模型

`ProviderStreams` 是调度层的最小可执行值:它只有 `stream(model, context, options?)` 和 `streamSimple(model, context, options?)`,二者都返回 `AssistantMessageEventStream`。[E: packages/ai/src/types.ts:222][E: packages/ai/src/types.ts:223][E: packages/ai/src/types.ts:224]

`StreamFunction<TApi, TOptions>` 是 wire implementation 的函数形状,返回 `AssistantMessageEventStream`;error termination 在事件协议中表现为 `error` event,其 payload 是带 `stopReason` / `errorMessage` 字段的 `AssistantMessage`。[E: packages/ai/src/types.ts:304][E: packages/ai/src/types.ts:308][E: packages/ai/src/types.ts:393][E: packages/ai/src/types.ts:394][E: packages/ai/src/types.ts:465]

`CreateProviderOptions.api` 接受两种形态:一个 `ProviderStreams` 供所有 models 复用,或一个 `Partial<Record<TApi, ProviderStreams>>` 供 mixed-API provider 按 `model.api` 分派。[E: packages/ai/src/models.ts:295][E: packages/ai/src/models.ts:314][E: packages/ai/src/models.ts:327][E: packages/ai/src/models.ts:329][E: packages/ai/src/models.ts:331]

`ApiStreamOptions<TApi>` 把 known API string 映射到 provider-specific options type;未知自定义 API string 退回到 generic `StreamOptions & Record<string, unknown>`。[E: packages/ai/src/types.ts:194][E: packages/ai/src/types.ts:210][E: packages/ai/src/types.ts:211][E: packages/ai/src/types.ts:212]

`SimpleStreamOptions` 是统一 convenience surface,只额外携带 `reasoning` 与 `thinkingBudgets`;provider-specific conversion 留在具体 wire module 内,例如 OpenAI Responses 与 Anthropic Messages 的 `streamSimple` 都在同文件内转换后调用 `stream`。[E: packages/ai/src/types.ts:290][E: packages/ai/src/types.ts:291][E: packages/ai/src/types.ts:293][E: packages/ai/src/api/openai-responses.ts:176][E: packages/ai/src/api/openai-responses.ts:187][E: packages/ai/src/api/anthropic-messages.ts:767][E: packages/ai/src/api/anthropic-messages.ts:801]

## 控制流

1. `ModelsImpl.stream@packages/ai/src/models.ts:258` 调用 `lazyStream(model, async () => ...)`,所以 caller 立即得到一个 `AssistantMessageEventStream`;真正的 provider lookup 在 setup 回调内执行。[E: packages/ai/src/models.ts:258][E: packages/ai/src/models.ts:263][E: packages/ai/src/api/lazy.ts:43][E: packages/ai/src/api/lazy.ts:55]
2. setup 回调执行 `requireProvider(model)`,再执行 `applyAuth(model, options)`,最后调用 `provider.stream(requestModel, context, requestOptions)`;`streamSimple` 用同样框架调用 `provider.streamSimple(...)`。[E: packages/ai/src/models.ts:264][E: packages/ai/src/models.ts:265][E: packages/ai/src/models.ts:266][E: packages/ai/src/models.ts:280][E: packages/ai/src/models.ts:281][E: packages/ai/src/models.ts:282]
3. `applyAuth` 把 resolved auth 的 `baseUrl` 写入 request model,并合并 `apiKey`、`headers`、`env`;显式 request options 对 `apiKey` 优先,`headers` 与 `env` 按 key 合并。[E: packages/ai/src/models.ts:247][E: packages/ai/src/models.ts:250][E: packages/ai/src/models.ts:251][E: packages/ai/src/models.ts:252][E: packages/ai/src/models.ts:253]
4. `createProvider@packages/ai/src/models.ts:323` 先判断 `input.api` 是否有 callable `stream`;有则视作 single `ProviderStreams`,否则视作 by-API map。[E: packages/ai/src/models.ts:323][E: packages/ai/src/models.ts:327][E: packages/ai/src/models.ts:328][E: packages/ai/src/models.ts:329]
5. `apiFor(model)` 返回 single implementation 或 `byApi?.[model.api]`;这就是 wire 协议按 `Model.api` 派发的核心代码路径。[E: packages/ai/src/models.ts:331]
6. `dispatch(model, run)` 找不到 implementation 时返回 `lazyStream` 包装的 `ModelsError("stream", ...)`;因此缺失 API implementation 会进入 `lazyStream` 的 async setup failure 路径,而不是从 provider method 同步抛出。[E: packages/ai/src/models.ts:337][E: packages/ai/src/models.ts:338][E: packages/ai/src/models.ts:339][E: packages/ai/src/models.ts:340][E: packages/ai/src/api/lazy.ts:49][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:52]
7. provider 的 `stream` / `streamSimple` method 只把 `model/context/options` 转交给 dispatch 选出的 `ProviderStreams.stream` 或 `ProviderStreams.streamSimple`。[E: packages/ai/src/models.ts:365][E: packages/ai/src/models.ts:367]
8. `lazyApi(load)` 自身返回 `ProviderStreams`:它的两个方法分别等待 `load()` 后调用目标 module 的 `stream` 或 `streamSimple`。[E: packages/ai/src/api/lazy.ts:63][E: packages/ai/src/api/lazy.ts:65][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:67][E: packages/ai/src/api/lazy.ts:68]
9. `lazyStream` 的 `setup().catch` 构造 `error` assistant message,向 outer stream push `{ type: "error", reason: "error", error: message }`,再 `end(message)`。[E: packages/ai/src/api/lazy.ts:49][E: packages/ai/src/api/lazy.ts:50][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:52]

## 设计动机与权衡

dispatch 以 `ProviderStreams` 为 runtime value,让 provider factory 可以只声明一个 single implementation,也可以声明 mixed-API map;GitHub Copilot 就把 `"anthropic-messages"`、`"openai-completions"`、`"openai-responses"` 三个 `model.api` 显式映射到不同 lazy wrappers。[E: packages/ai/src/models.ts:314][E: packages/ai/src/models.ts:327][E: packages/ai/src/models.ts:329][E: packages/ai/src/providers/github-copilot.ts:19][E: packages/ai/src/providers/github-copilot.ts:20][E: packages/ai/src/providers/github-copilot.ts:21][E: packages/ai/src/providers/github-copilot.ts:22]

`lazyStream` 把 auth resolution、dynamic import、缺失 API implementation 这些 setup failure 都压进同一个 assistant event protocol;这使 caller 侧可以把 setup failure 当作 stream terminal error 处理。[E: packages/ai/src/api/lazy.ts:39][E: packages/ai/src/api/lazy.ts:45][E: packages/ai/src/api/lazy.ts:49][E: packages/ai/src/api/lazy.ts:51][E: packages/ai/src/api/lazy.ts:52][I]

`streamSimple` 保持统一 caller surface,但 provider options 的具体映射仍在 wire module 内完成;例如 OpenAI Responses 把 `reasoning` clamp 后转成 `reasoningEffort`,Anthropic Messages 在 no-reasoning、adaptive thinking、budget thinking 三种路径间选择 provider-specific options。[E: packages/ai/src/api/openai-responses.ts:183][E: packages/ai/src/api/openai-responses.ts:184][E: packages/ai/src/api/openai-responses.ts:185][E: packages/ai/src/api/openai-responses.ts:187][E: packages/ai/src/api/anthropic-messages.ts:775][E: packages/ai/src/api/anthropic-messages.ts:776][E: packages/ai/src/api/anthropic-messages.ts:781][E: packages/ai/src/api/anthropic-messages.ts:801]

## gotcha

不要把 README 或 provider 名称当作 wire 协议 ground truth。[I] 文字模型 wire 协议的核验路径是 `Model.api` -> `createProvider` 的 `api` / by-API map -> `api/<name>.lazy.ts` -> `api/<name>.ts` 的 `stream` / `streamSimple`。[E: packages/ai/src/types.ts:669][E: packages/ai/src/models.ts:331][E: packages/ai/src/api/lazy.ts:66][E: packages/ai/src/api/lazy.ts:68]

Bedrock 的 lazy wrapper 是一个特例:它通过 variable specifier import 加载 Node-only AWS SDK implementation,并允许 Bun binary build 注入 `bedrockModuleOverride`;因此不能把所有 `<name>.lazy.ts` 都机械理解成一行静态 dynamic import。[E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:10][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:11][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:12][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:15][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:22][E: packages/ai/src/api/bedrock-converse-stream.lazy.ts:29]

`KnownApi` 是已知文字 API 的类型集合,但 `Api = KnownApi | (string & {})` 允许 custom API string;如果 custom provider 给出未知 `model.api`,运行时仍必须提供匹配的 `ProviderStreams` map entry,否则 dispatch 会生成 stream error。[E: packages/ai/src/types.ts:15][E: packages/ai/src/types.ts:26][E: packages/ai/src/models.ts:331][E: packages/ai/src/models.ts:338][E: packages/ai/src/models.ts:340]

图片 API 不走本节点的 `ProviderStreams` contract;`ProviderImages` 使用 `generateImages(...)` Promise contract,`openrouter-images.lazy.ts` 也返回 `ProviderImages` 而不是 `ProviderStreams`。[E: packages/ai/src/types.ts:233][E: packages/ai/src/types.ts:234][E: packages/ai/src/types.ts:238][E: packages/ai/src/api/openrouter-images.lazy.ts:3][E: packages/ai/src/api/openrouter-images.lazy.ts:4]

## 跨包边界

`spine.provider-stream` 描述从 `Models.stream` 到 normalized assistant events 的端到端主路径;本节点只展开其中 `ProviderStreams` selection、lazy loading 与 `model.api` dispatch 这一段。[I]

`subsys.ai.message-transform` 是 wire payload 前的消息归一化边界:dispatch 层只把 `Context` 交给 wire module。[I] `transformMessages(messages, model, ...)` 本身处理 unsupported image downgrade、thinking replay、tool call id normalization 与 orphaned tool result 补齐,并由 provider-specific builders 调用。[E: packages/ai/src/api/transform-messages.ts:64][E: packages/ai/src/api/transform-messages.ts:71][E: packages/ai/src/api/transform-messages.ts:97][E: packages/ai/src/api/transform-messages.ts:133][E: packages/ai/src/api/transform-messages.ts:160][E: packages/ai/src/api/transform-messages.ts:217][E: packages/ai/src/api/openai-responses-shared.ts:123][E: packages/ai/src/api/anthropic-messages.ts:1021]

`ref.ai.wire-protocol-catalog` 应逐项列出每个 `api/<name>.lazy.ts`、目标 `api/<name>.ts` 与 provider bindings;本节点只保留 dispatch invariant 和 representative evidence,避免把 catalog 表格复制到 subsystem 文档。[I]

下游 agent / coding-agent 应通过 `Models.stream` / `Models.streamSimple` 或兼容 facade 消费 `AssistantMessageEventStream`,不应绕过 `Models` 的 auth 与 dispatch 边界直接选择 `api/<name>.ts`。[I]

## Sources

- packages/ai/src/models.ts
- packages/ai/src/api/lazy.ts
- packages/ai/src/types.ts
- packages/ai/src/api/openai-responses.lazy.ts
- packages/ai/src/api/anthropic-messages.lazy.ts
- packages/ai/src/api/google-generative-ai.lazy.ts
- packages/ai/src/api/bedrock-converse-stream.lazy.ts
- packages/ai/src/api/openrouter-images.lazy.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/transform-messages.ts
- packages/ai/src/providers/github-copilot.ts

## 相关

- [spine.provider-stream](../../spine/provider-stream.md) - `Models.stream` 到 normalized assistant event stream 的端到端主路径。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md) - 每个 wire 协议 lazy wrapper、implementation module 与 provider binding 的目录。
- [subsys.ai.message-transform](message-transform.md) - provider-specific payload builder 调用前的消息归一化规则。
