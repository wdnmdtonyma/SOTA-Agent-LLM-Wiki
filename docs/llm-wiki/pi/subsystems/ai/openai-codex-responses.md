---
id: subsys.ai.openai-codex-responses
title: OpenAI Codex(WebSocket)协议
kind: subsystem
tier: T2
pkg: ai
source:
 - packages/ai/src/api/openai-codex-responses.ts
 - packages/ai/src/api/openai-responses.ts
 - packages/ai/src/api/openai-responses-shared.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/api/simple-options.ts
 - packages/ai/src/types.ts
symbols:
 - stream
 - OpenAICodexResponsesOptions
 - resolveTranscriptTools
related:
 - subsys.ai.wire-protocol-dispatch
 - subsys.ai.session-resources
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `openai-codex-responses.ts` 是 `pi-ai` 调 ChatGPT Codex Responses backend 的 wire 协议入口: 它把统一 `TranscriptContext`/`StreamOptions` 转成 Codex request, 优先走 WebSocket streaming, 必要时降级 SSE, 再复用 OpenAI Responses shared normalizer 输出 `AssistantMessageEventStream`。已删除的 `deferred-tools.ts` 不再参与本 adapter。

## 能回答的问题

- `openai-codex-responses` 的 `stream()` 如何从统一 provider stream 进入 ChatGPT Codex backend?
- Codex 如何从 `TranscriptContext` 读 system prompt 与 tools?
- `supportsToolSearch` 怎样把 later tools 编成 `tool_search_*` prefix deferral?
- `samplingParams` 在 Codex direct stream/complete 是否写入 body?
- Codex request body 和 headers 与普通 OpenAI Responses 有哪些差异?
- WebSocket、WebSocket cached context、SSE fallback 的控制流在哪里?
- Codex wire event 如何转换成普通 Responses stream event, 再转换成 `thinking_*`、`text_*`、`toolcall_*`?
- session cleanup 如何关闭 Codex WebSocket session cache?

## 职责边界

`stream` 是本协议的权威入口:签名接收 `TranscriptContext`,创建 `AssistantMessageEventStream`,先 `resolveTranscript(context, model.compat?.supportsMidConvoSystemMessages)`,再校验 `apiKey`,从 token 提取 ChatGPT account id,构造 request body 和 SSE/WebSocket headers,然后按 transport 决定先尝试 WebSocket 还是直接 SSE。[E: packages/ai/src/api/openai-codex-responses.ts:237] [E: packages/ai/src/api/openai-codex-responses.ts:239] [E: packages/ai/src/api/openai-codex-responses.ts:243] [E: packages/ai/src/api/openai-codex-responses.ts:265] [E: packages/ai/src/api/openai-codex-responses.ts:270] [E: packages/ai/src/api/openai-codex-responses.ts:277]

`OpenAICodexResponsesOptions` 扩展通用 `StreamOptions`,额外开放 Codex/Responses 相关 knobs: `reasoningEffort` 支持 `"none"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`, `reasoningSummary` 支持 `"off"`/`"on"` 等 Codex 兼容值, 还支持 `serviceTier`、`textVerbosity` 和 `toolChoice`。[E: packages/ai/src/api/openai-codex-responses.ts:79] [E: packages/ai/src/api/openai-codex-responses.ts:80] [E: packages/ai/src/api/openai-codex-responses.ts:81] [E: packages/ai/src/api/openai-codex-responses.ts:82] [E: packages/ai/src/api/openai-codex-responses.ts:83]

本节点覆盖 Codex Responses wire wrapper, 不覆盖 `processResponsesStream()` 的完整 Responses event normalization; Codex 在 SSE 和 WebSocket 两条路径都把事件先映射成 `ResponseStreamEvent`(途中 `await onProviderStreamEvent`), 再交给 shared normalizer。[E: packages/ai/src/api/openai-codex-responses.ts:668] [E: packages/ai/src/api/openai-codex-responses.ts:747] [E: packages/ai/src/api/openai-codex-responses.ts:751] [E: packages/ai/src/api/openai-codex-responses.ts:1543] [I]

## 关键文件

- `packages/ai/src/api/openai-codex-responses.ts`: Codex request/header/transport/error/session-cache 的权威实现。[E: packages/ai/src/api/openai-codex-responses.ts:237] [E: packages/ai/src/api/openai-codex-responses.ts:527]
- `packages/ai/src/api/openai-responses-shared.ts`: Codex 复用的 Responses message/tool conversion 与 stream event normalizer。[E: packages/ai/src/api/openai-codex-responses.ts:45] [I]
- `packages/ai/src/session-resources.ts`: session cleanup registry; Codex 把自己的 WebSocket close helper 注册进去。[E: packages/ai/src/api/openai-codex-responses.ts:10] [I]

## 数据模型

`RequestBody` 是 Codex backend 的 body shape: 它保留 Responses 字段 `model`、`stream`、`input`、`tools`、`tool_choice`、`parallel_tool_calls`、`reasoning`、`service_tier`、`text`、`include`、`prompt_cache_key`, 并额外允许 `previous_response_id` 支撑 WebSocket cached continuation。index signature `[key: string]: unknown` 存在,但 builder 不会自动把 `samplingParams` 填进去。[E: packages/ai/src/api/openai-codex-responses.ts:89] [E: packages/ai/src/api/openai-codex-responses.ts:94] [E: packages/ai/src/api/openai-codex-responses.ts:104] [E: packages/ai/src/api/openai-codex-responses.ts:105]

`buildRequestBody()` 对 Codex 的 request policy: system prompt 不放进 `input`, 而是 `getInitialSystemMessage` + `getSystemMessageText` 写入 top-level `instructions`; `store` 固定为 `false`, `stream` 固定为 `true`, `text.verbosity` 默认 `"low"`, `include` 固定包含 encrypted reasoning content, `prompt_cache_key` 来自 clamped `cacheSessionId`。`cacheRetention === "none"` 时 `cacheSessionId` 为 `undefined`。[E: packages/ai/src/api/openai-codex-responses.ts:275] [E: packages/ai/src/api/openai-codex-responses.ts:551] [E: packages/ai/src/api/openai-codex-responses.ts:552] [E: packages/ai/src/api/openai-codex-responses.ts:553] [E: packages/ai/src/api/openai-codex-responses.ts:555] [E: packages/ai/src/api/openai-codex-responses.ts:561]

## Tool search 与 prefix deferral

与 OpenAI Responses 相同,Codex **不再**调用 `splitDeferredTools()`。`buildRequestBody` 读 `supportsAdditionalTools` 与 `supportsToolSearch`,再用 `resolveTranscriptTools(context.messages, supportsAdditionalTools || supportsToolSearch)` 决定顶层 `tools`。shared converter 在 `supportsToolSearch` 时把 later `toolsAdded` 编成 completed `tool_search_call` + `tool_search_output`,output tools 带 `defer_loading: true`(prefix deferral);`supportsAdditionalTools` 则发 `additional_tools`。[E: packages/ai/src/api/openai-codex-responses.ts:539] [E: packages/ai/src/api/openai-codex-responses.ts:540] [E: packages/ai/src/api/openai-codex-responses.ts:541] [E: packages/ai/src/api/openai-codex-responses.ts:546] [E: packages/ai/src/api/openai-codex-responses.ts:547] [E: packages/ai/src/api/openai-responses-shared.ts:187] [E: packages/ai/src/api/openai-responses-shared.ts:195] [E: packages/ai/src/api/openai-responses-shared.ts:206] [E: packages/ai/src/api/openai-responses-shared.ts:377]

immediate tools 仍进入 request `tools`。[E: packages/ai/src/api/openai-codex-responses.ts:574] [E: packages/ai/src/api/openai-codex-responses.ts:575]

## `samplingParams` 不写入 Codex body

`OpenAICodexResponsesOptions` 继承 `StreamOptions.samplingParams`,`streamSimple` 也经 `buildBaseOptions` 把该字段拷进 options。但 `buildRequestBody()` **没有** `Object.assign(body, model.samplingParams, options?.samplingParams)`。因此 Codex 的 direct `stream` / `complete` 与 `streamSimple` 都不会把 samplingParams merge 进 ChatGPT Codex JSON body;这与 OpenAI Responses / Completions / Azure Responses 不同。[E: packages/ai/src/api/openai-codex-responses.ts:79] [E: packages/ai/src/api/openai-codex-responses.ts:511] [E: packages/ai/src/api/simple-options.ts:29] [E: packages/ai/src/api/openai-responses.ts:382] [U]

## Off reasoning

`streamSimple` 把 `clampThinkingLevel` 后的 `"off"` 收成 `reasoningEffort: undefined`,再交给 `stream` → `buildRequestBody`。[E: packages/ai/src/api/openai-codex-responses.ts:514] [E: packages/ai/src/api/openai-codex-responses.ts:515] [E: packages/ai/src/api/openai-codex-responses.ts:517]

`buildRequestBody` 在 caller 显式传入 `reasoningEffort` 时查 `thinkingLevelMap`。`reasoningEffort === "none"` 时:`thinkingLevelMap.off === undefined` 则 effort 为 `"none"`,否则用 `thinkingLevelMap.off`(可以为 `null`)。`effort !== null` 才写 `body.reasoning`。[E: packages/ai/src/api/openai-codex-responses.ts:582] [E: packages/ai/src/api/openai-codex-responses.ts:584] [E: packages/ai/src/api/openai-codex-responses.ts:589]

未传 `reasoningEffort`(含 `streamSimple` 的 Off)且 `model.reasoning` 为真时,只要 `thinkingLevelMap.off !== null` 就会写 `body.reasoning = { effort: thinkingLevelMap.off ?? "none" }`。只有 `off === null` 才省略 `body.reasoning`。[E: packages/ai/src/api/openai-codex-responses.ts:595] [E: packages/ai/src/api/openai-codex-responses.ts:596]

## 控制流

1. `stream@packages/ai/src/api/openai-codex-responses.ts:237` 初始化输出对象后调用 `buildRequestBody()`, 允许 `options.onPayload` inspect/replace body, 用 `sessionId` 或 random request id 生成 WebSocket request id, 并序列化 body。[E: packages/ai/src/api/openai-codex-responses.ts:246] [E: packages/ai/src/api/openai-codex-responses.ts:277] [E: packages/ai/src/api/openai-codex-responses.ts:278] [E: packages/ai/src/api/openai-codex-responses.ts:291]
2. 当 `transport !== "sse"` 且本 session 未被标记 WebSocket fallback active, `stream()` 调 `processWebSocketStream()`; WebSocket 成功完成后 push `done` 并 `stream.end()`, 不再进入 SSE path。[E: packages/ai/src/api/openai-codex-responses.ts:294] [E: packages/ai/src/api/openai-codex-responses.ts:301]
3. WebSocket failure 在首个 message stream event 之前可降级到 SSE; 如果已经开始 emit WebSocket events, 或错误是非 connection-limit 的 Codex API/protocol error, 则抛出错误。
4. SSE path 会先尝试把 request body 做 zstd 压缩并设置 `content-encoding: zstd`,不可用时回退 JSON 字符串;随后 POST `resolveCodexUrl(model.baseUrl)`, custom fetch 只注入这条 SSE path;公开 contract 明确 fetch 不影响 WebSocket transport。[E: packages/ai/src/types.ts:142]
5. `processStream()` 把 SSE bytes 交给 `parseSSE()`, 再交给 `mapCodexEvents(..., onProviderStreamEvent)`, 最后交给 `processResponsesStream()`。[E: packages/ai/src/api/openai-codex-responses.ts:668] [E: packages/ai/src/api/openai-codex-responses.ts:669]
6. `processWebSocketStream()` 先 `acquireWebSocket()`, 再 `socket.send(JSON.stringify({ type: "response.create", ...requestBody }))`, 然后把 `parseWebSocket()` + `mapCodexEvents(..., onProviderStreamEvent)` 交给 `processResponsesStream()`。[E: packages/ai/src/api/openai-codex-responses.ts:1542] [E: packages/ai/src/api/openai-codex-responses.ts:1543] [E: packages/ai/src/api/openai-codex-responses.ts:1549]
7. `mapCodexEvents()` 在 yield 之前 `await onProviderStreamEvent?.(event, model)`; 把 Codex terminal variants `response.done`、`response.completed`、`response.incomplete` 统一 yield 为 `response.completed`。[E: packages/ai/src/api/openai-codex-responses.ts:751]

## WebSocket session cache 与 cleanup

WebSocket cache 只按 `sessionId` 生效: 没有 `sessionId` 时每次新建 socket 并在 release 时关闭; 有 `sessionId` 时可复用非 busy 且 reusable 的 cached socket。可复用 socket 在 release keep 时会进入 idle expiry, 默认 TTL 是 5 分钟。Codex 把 `closeOpenAICodexWebSocketSessions` 注册到 session resource cleanup registry。

WebSocket cached continuation 保持 `store: false` 的 base body, 并通过 connection-scoped `previous_response_id` state 构造 delta request; 代码旁注说明 ChatGPT Codex Responses 会拒绝 `store: true`。[E: packages/ai/src/api/openai-codex-responses.ts:1518] [E: packages/ai/src/api/openai-codex-responses.ts:1521] [I]

## 与普通 OpenAI Responses 的差异

普通 OpenAI Responses 使用 `openai` SDK client 的 `client.responses.create(...)`; Codex Responses 不创建 SDK client, 而是直接拼 ChatGPT backend URL、headers、fetch/SSE 和 WebSocket transport。[E: packages/ai/src/api/openai-responses.ts:184] [E: packages/ai/src/api/openai-codex-responses.ts:1542]

普通 OpenAI Responses 的 request builder 调用默认 `convertResponsesMessages()` 时可把 system prompt 放进 Responses `input` 的 developer/system role; Codex request builder 调 `convertResponsesMessages(..., { includeSystemPrompt: false })`, 再把 system prompt 放到 top-level `instructions`。[E: packages/ai/src/api/openai-codex-responses.ts:542] [E: packages/ai/src/api/openai-codex-responses.ts:543] [E: packages/ai/src/api/openai-codex-responses.ts:553]

普通 OpenAI Responses 的 `buildParams` 末尾 merge `samplingParams`; Codex `buildRequestBody` 不 merge。[E: packages/ai/src/api/openai-responses.ts:382] [I]

Codex headers are ChatGPT-specific: base headers extract account id from JWT, set `chatgpt-account-id`, `originator: pi`, and user agent; SSE adds `OpenAI-Beta: responses=experimental`, while WebSocket uses `responses_websockets` beta 和 per-request `session-id`/`x-client-request-id`。[E: packages/ai/src/api/openai-codex-responses.ts:1654] [E: packages/ai/src/api/openai-codex-responses.ts:1655] [E: packages/ai/src/api/openai-codex-responses.ts:1656] [E: packages/ai/src/api/openai-codex-responses.ts:1669] [E: packages/ai/src/api/openai-codex-responses.ts:1694] [E: packages/ai/src/api/openai-codex-responses.ts:1695]

## Gotcha

- Explicit `transport: "auto"` and `transport: "websocket-cached"` both set `useCachedContext`; actual `previous_response_id` delta rewriting still requires a cached entry with compatible continuation state。[E: packages/ai/src/api/openai-codex-responses.ts:1518] [I]
- `processResponsesStream()` requires a terminal Responses event; `mapCodexEvents()` converts Codex terminal variants into `response.completed`, so malformed streams that end without that terminal event become errors。[E: packages/ai/src/api/openai-responses-shared.ts:760] [E: packages/ai/src/api/openai-responses-shared.ts:761]
- Codex Responses accumulator 从 `pending` 开始。[E: packages/ai/src/api/openai-codex-responses.ts:260]
- `partialJson` is scratch state for streaming tool arguments; Codex error cleanup deletes it before emitting the final error assistant message。

## 跨包边界

[subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) 应覆盖 `Models.stream`、provider `api` dispatch、`ProviderStreams` 和 lazy loading 的通用路径; 本节点只描述 dispatch 命中 `openai-codex-responses.ts` 后的 Codex wire behavior。[E: packages/ai/src/api/openai-codex-responses.ts:237] [I]

[subsys.ai.session-resources](session-resources.md) 应覆盖 `registerSessionResourceCleanup` / `cleanupSessionResources` registry 语义; 本节点只记录 Codex 将 WebSocket close helper 注册为 session cleanup 的事实。[I]

## Sources

- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/types.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `model.api` / provider `api` map 如何把统一 stream call 派发到 Codex wire module。
- [subsys.ai.session-resources](session-resources.md): session-scoped cleanup registry 如何被 agent/session 生命周期调用, 以及 Codex WebSocket cache 清理如何挂入其中。
