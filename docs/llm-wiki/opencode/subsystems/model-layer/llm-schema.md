---
id: model-layer.llm-schema
title: LLM Schema
kind: subsystem
tier: T2
v: shared
source: [packages/llm/src/schema/]
symbols: [LLMRequest, Message, ContentPart, ToolDefinition, LLMEvent, Usage, LLMError, LLMResponse]
related: [ref.llm-event-catalog]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> `packages/llm/src/schema` 是 native LLM engine 的公共 wire model:它定义 provider-agnostic `LLMRequest`、message content parts、tool definition/output、16 类 streaming `LLMEvent`、加性 `Usage` 契约,以及 10 类 `LLMErrorReason`。

## 能回答的问题
- `LLMRequest` 的字段有哪些,哪些是 generation/http/provider options?
- `ContentPart` 能承载 text/media/tool call/tool result/reasoning 哪些结构?
- 16 个 `LLMEvent` 分别是什么,哪些带 usage 或 provider metadata?
- `Usage` 的 input/output/cache/reasoning 字段为什么不能直接相加两次?
- `LLMError` 的 10 类 reason 如何区分 retryable?

## V1

V1 默认 AI SDK loop 使用 AI SDK message/model 类型,但 `packages/llm` schema 是 V1 native seam 的 common model。[I] 重要命名陷阱:不要把 `packages/opencode/src/session/message-v2.ts` 误认为 V2 schema;那个文件是 V1 与 AI SDK message 的转换层,不是 `packages/core/src` 的 V2 kernel。[I]

## V2

V2 runner 组装 provider request 时面向 `LLM.request` / `llm.stream(request)` 语义,`packages/llm` schema 是 native engine 入口的数据合同。[I] V2 durable session events 不是这里的 `LLMEvent`;runner 会把 `LLMEvent` 投影成 session event。[I]

## 核心输入模型

`LLMRequest` 字段是 `id/model/system/messages/tools/toolChoice/generation/providerOptions/http/responseFormat/cache/metadata`。[E: packages/llm/src/schema/messages.ts:286][E: packages/llm/src/schema/messages.ts:298] `LLMRequest.input` helper 会把这些字段投影成 plain input object。[E: packages/llm/src/schema/messages.ts:304][E: packages/llm/src/schema/messages.ts:316]

`Message` 的字段是 `id/role/content/metadata/native`,其中 role 使用 schema ids 里的 `MessageRole`。[E: packages/llm/src/schema/messages.ts:198][E: packages/llm/src/schema/messages.ts:203][E: packages/llm/src/schema/ids.ts:33] `Message.system` 是 role 为 `system` 的 chronological message helper;request-level `system` 仍是 `LLMRequest.system` 字段。[E: packages/llm/src/schema/messages.ts:233][E: packages/llm/src/schema/messages.ts:289]

`ContentPart` 是 text、media、tool-call、tool-result、reasoning 的 union。[E: packages/llm/src/schema/messages.ts:193][E: packages/llm/src/schema/messages.ts:196] `MediaPart` 承载 `mediaType/data/filename/metadata`,tool result value 可表达 JSON、text、error 或 structured content。[E: packages/llm/src/schema/messages.ts:33][E: packages/llm/src/schema/messages.ts:38][E: packages/llm/src/schema/messages.ts:68][E: packages/llm/src/schema/messages.ts:80]

`ToolDefinition` 的 wire fields 是 `name/description/inputSchema/outputSchema/cache/metadata/native`,并由 `ToolDefinition.make` 构造。[E: packages/llm/src/schema/messages.ts:239][E: packages/llm/src/schema/messages.ts:246][E: packages/llm/src/schema/messages.ts:253]

## 16 个 LLMEvent

`llmEventTagged` 的 union 包含且只包含 16 类 event:step-start、text-start、text-delta、text-end、reasoning-start、reasoning-delta、reasoning-end、tool-input-start、tool-input-delta、tool-input-end、tool-call、tool-result、tool-error、step-finish、finish、provider-error。[E: packages/llm/src/schema/events.ts:209][E: packages/llm/src/schema/events.ts:226]

字段设计按 lifecycle 分层:

- step events: `StepStart` 只有 `index`, `StepFinish` 带 `index/reason/usage/providerMetadata`。[E: packages/llm/src/schema/events.ts:78][E: packages/llm/src/schema/events.ts:80][E: packages/llm/src/schema/events.ts:183][E: packages/llm/src/schema/events.ts:188]
- text/reasoning events: start 与 end 以 `id` 标识 block,delta 携带 `text`;reasoning end 可携带 `providerMetadata`。[E: packages/llm/src/schema/events.ts:84][E: packages/llm/src/schema/events.ts:94][E: packages/llm/src/schema/events.ts:121][E: packages/llm/src/schema/events.ts:124]
- tool input events: start/delta/end 用 `id/name` 标识 tool input stream,delta 用 `text` 承载增量 JSON 文本。[E: packages/llm/src/schema/events.ts:128][E: packages/llm/src/schema/events.ts:140][E: packages/llm/src/schema/events.ts:144][E: packages/llm/src/schema/events.ts:148]
- tool terminal events: `ToolCall` 有 `id/name/input/providerExecuted/providerMetadata`, `ToolResult` 有 `output/providerMetadata`, `ToolError` 有 `message`。[E: packages/llm/src/schema/events.ts:152][E: packages/llm/src/schema/events.ts:159][E: packages/llm/src/schema/events.ts:162][E: packages/llm/src/schema/events.ts:180]
- finish events: `Finish` 带 reason、usage、providerMetadata,provider-error event 带 message/classification/retryable/providerMetadata。[E: packages/llm/src/schema/events.ts:192][E: packages/llm/src/schema/events.ts:197][E: packages/llm/src/schema/events.ts:200][E: packages/llm/src/schema/events.ts:205]

`LLMResponse` 是 non-streaming fold 的结果,字段包括 events 与 optional usage,并暴露 text/reasoning/toolCalls getter 从 events 派生内容。[E: packages/llm/src/schema/events.ts:338][E: packages/llm/src/schema/events.ts:354]

## Usage 加性契约

`Usage` 把 input/output/cache/reasoning 拆成字段:inputTokens、outputTokens、nonCachedInputTokens、cacheReadInputTokens、cacheWriteInputTokens、reasoningTokens、totalTokens、providerMetadata 都是独立 schema field。[E: packages/llm/src/schema/events.ts:51][E: packages/llm/src/schema/events.ts:59] `visibleOutputTokens` 用 `outputTokens - reasoningTokens` 计算可见输出,且不会低于 0。[E: packages/llm/src/schema/events.ts:67][E: packages/llm/src/schema/events.ts:68]

协议共享 helper 也执行同一契约:provider supplied total 优先;没有 total 且 input/output 至少有一个存在时才用 input+output fallback。[E: packages/llm/src/protocols/shared.ts:83][E: packages/llm/src/protocols/shared.ts:90]

## LLMError 10 reason

`LLMErrorReason` union 包含 10 类 reason:invalid-request、no-route、authentication、rate-limit、quota-exceeded、content-policy、provider-internal、transport、invalid-provider-output、unknown-provider。[E: packages/llm/src/schema/errors.ts:160][E: packages/llm/src/schema/errors.ts:171]

retryable 是 reason 自己的属性:rate-limit 与 provider-internal 默认 retryable,invalid-request/no-route/authentication/quota/content-policy/transport/invalid-provider-output/unknown-provider 默认非 retryable。[E: packages/llm/src/schema/errors.ts:34][E: packages/llm/src/schema/errors.ts:74][E: packages/llm/src/schema/errors.ts:109][E: packages/llm/src/schema/errors.ts:129][E: packages/llm/src/schema/errors.ts:181]

`LLMError` 记录 `module/method/reason`,并从 reason 读取 `retryable` 与 `retryAfterMs`。[E: packages/llm/src/schema/errors.ts:174][E: packages/llm/src/schema/errors.ts:186]

## 易错点

- `providerMetadata` 与 `native` 不是同一个字段:events/parts 上的 providerMetadata 是 provider-specific metadata,Message/ToolDefinition 上的 native 是 provider-native escape hatch。[I]
- `ToolResultValue.error` 是 tool result value 的一种 literal,而 `ToolFailure` 是 runtime failure type。[E: packages/llm/src/schema/messages.ts:76][E: packages/llm/src/schema/errors.ts:203]
- `Message.system(...)` 是 chronological system message helper,不是 request-level `system` 字段本身。[E: packages/llm/src/schema/messages.ts:233][E: packages/llm/src/schema/messages.ts:289]

## Sources
- packages/llm/src/schema/
- packages/llm/src/protocols/shared.ts

## Related
- ref.llm-event-catalog
