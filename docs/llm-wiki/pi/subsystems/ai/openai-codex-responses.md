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
  - packages/ai/src/utils/deferred-tools.ts
symbols:
  - stream
  - OpenAICodexResponsesOptions
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.session-resources
evidence: explicit
status: verified
updated: 086c32e745
---

> `openai-codex-responses.ts` 是 `pi-ai` 调 ChatGPT Codex Responses backend 的 wire 协议入口: 它把统一 `Context`/`StreamOptions` 转成 Codex request, 优先走 WebSocket streaming, 必要时降级 SSE, 再复用 OpenAI Responses shared normalizer 输出 `AssistantMessageEventStream`。

## 能回答的问题

- `openai-codex-responses` 的 `stream()` 如何从统一 provider stream 进入 ChatGPT Codex backend?
- Codex request body 和 headers 与普通 OpenAI Responses 有哪些差异?
- WebSocket、WebSocket cached context、SSE fallback 的控制流在哪里?
- Codex wire event 如何转换成普通 Responses stream event, 再转换成 `thinking_*`、`text_*`、`toolcall_*`?
- session cleanup 如何关闭 Codex WebSocket session cache?
- 哪些失败会走 SSE fallback, 哪些失败直接变成 stream error?

## 职责边界

`stream` 是本协议的权威入口: 它创建 `AssistantMessageEventStream`, 构造 assistant output skeleton, 校验 `apiKey`, 从 token 提取 ChatGPT account id, 构造 request body 和 SSE/WebSocket headers, 然后按 transport 决定先尝试 WebSocket 还是直接 SSE [E: packages/ai/src/api/openai-codex-responses.ts:230] [E: packages/ai/src/api/openai-codex-responses.ts:235] [E: packages/ai/src/api/openai-codex-responses.ts:257] [E: packages/ai/src/api/openai-codex-responses.ts:262] [E: packages/ai/src/api/openai-codex-responses.ts:269] [E: packages/ai/src/api/openai-codex-responses.ts:275] [E: packages/ai/src/api/openai-codex-responses.ts:276] [E: packages/ai/src/api/openai-codex-responses.ts:286]。

`OpenAICodexResponsesOptions` 扩展通用 `StreamOptions`, 额外开放 Codex/Responses 相关 knobs: `reasoningEffort` 支持 `"none"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`, `reasoningSummary` 支持 `"off"`/`"on"` 等 Codex 兼容值, 还支持 `serviceTier`、`textVerbosity` 和 `toolChoice` [E: packages/ai/src/api/openai-codex-responses.ts:72] [E: packages/ai/src/api/openai-codex-responses.ts:73] [E: packages/ai/src/api/openai-codex-responses.ts:74] [E: packages/ai/src/api/openai-codex-responses.ts:75] [E: packages/ai/src/api/openai-codex-responses.ts:76]。

本节点覆盖 Codex Responses wire wrapper, 不覆盖 `processResponsesStream()` 的完整 Responses event normalization; Codex 在 SSE 和 WebSocket 两条路径都把事件先映射成 `ResponseStreamEvent`, 再交给 shared normalizer [E: packages/ai/src/api/openai-codex-responses.ts:665] [E: packages/ai/src/api/openai-codex-responses.ts:1503] [E: packages/ai/src/api/openai-codex-responses.ts:1506] [I]。

## 关键文件

- `packages/ai/src/api/openai-codex-responses.ts`: Codex request/header/transport/error/session-cache 的权威实现 [E: packages/ai/src/api/openai-codex-responses.ts:45] [E: packages/ai/src/api/openai-codex-responses.ts:230] [E: packages/ai/src/api/openai-codex-responses.ts:909] [E: packages/ai/src/api/openai-codex-responses.ts:1453]。
- `packages/ai/src/api/openai-responses-shared.ts`: Codex 复用的 Responses message/tool conversion 与 stream event normalizer; 本节点只引用它的角色, 归一化细节应由 OpenAI Responses/shared 节点覆盖 [E: packages/ai/src/api/openai-codex-responses.ts:38] [I]。
- `packages/ai/src/session-resources.ts`: session cleanup registry; Codex 把自己的 WebSocket close helper 注册进去, 使 session 结束清理能关闭缓存连接 [E: packages/ai/src/api/openai-codex-responses.ts:10] [E: packages/ai/src/api/openai-codex-responses.ts:925] [I]。

## 数据模型

`RequestBody` 是 Codex backend 的 body shape: 它保留 Responses 字段 `model`、`stream`、`input`、`tools`、`tool_choice`、`parallel_tool_calls`、`reasoning`、`service_tier`、`text`、`include`、`prompt_cache_key`, 并额外允许 `previous_response_id` 支撑 WebSocket cached continuation [E: packages/ai/src/api/openai-codex-responses.ts:83] [E: packages/ai/src/api/openai-codex-responses.ts:85] [E: packages/ai/src/api/openai-codex-responses.ts:87] [E: packages/ai/src/api/openai-codex-responses.ts:88] [E: packages/ai/src/api/openai-codex-responses.ts:89] [E: packages/ai/src/api/openai-codex-responses.ts:88] [E: packages/ai/src/api/openai-codex-responses.ts:91] [E: packages/ai/src/api/openai-codex-responses.ts:93] [E: packages/ai/src/api/openai-codex-responses.ts:94] [E: packages/ai/src/api/openai-codex-responses.ts:95] [E: packages/ai/src/api/openai-codex-responses.ts:96] [E: packages/ai/src/api/openai-codex-responses.ts:97]。

`buildRequestBody()` 对 Codex 的 request policy 很明确: system prompt 不放进 `input`, 而是写入 top-level `instructions`; `store` 固定为 `false`, `stream` 固定为 `true`, `text.verbosity` 默认 `"low"`, `include` 固定包含 encrypted reasoning content, `prompt_cache_key` 来自 clamped `sessionId`, tool choice 是 auto 且 parallel tool calls 开启 [E: packages/ai/src/api/openai-codex-responses.ts:534] [E: packages/ai/src/api/openai-codex-responses.ts:535] [E: packages/ai/src/api/openai-codex-responses.ts:546] [E: packages/ai/src/api/openai-codex-responses.ts:548] [E: packages/ai/src/api/openai-codex-responses.ts:549] [E: packages/ai/src/api/openai-codex-responses.ts:550] [E: packages/ai/src/api/openai-codex-responses.ts:552] [E: packages/ai/src/api/openai-codex-responses.ts:553] [E: packages/ai/src/api/openai-codex-responses.ts:554] [E: packages/ai/src/api/openai-codex-responses.ts:550] [E: packages/ai/src/api/openai-codex-responses.ts:556]。

Codex 复用同一 deferred-tool protocol：仅当 `model.compat.supportsToolSearch` 为 true 时，`splitDeferredTools()` 延后 marked tools，shared converter 把 `ToolResultMessage.addedToolNames` 变成 `tool_search_call` items；其它工具仍进入 request `tools` [E: packages/ai/src/api/openai-codex-responses.ts:542] [E: packages/ai/src/api/openai-codex-responses.ts:537] [E: packages/ai/src/api/openai-codex-responses.ts:567] [E: packages/ai/src/api/openai-codex-responses.ts:568] [E: packages/ai/src/api/openai-responses-shared.ts:314] [E: packages/ai/src/api/openai-responses-shared.ts:331]。

`CachedWebSocketConnection` 是 per-session WebSocket cache entry: 它保存 socket、busy 标记、idle timer 和可选 continuation state; continuation state 记录上一轮 full request body、last response id 和上一轮 response items, `buildCachedWebSocketRequestBody()` 在可匹配 continuation 时计算后续 `previous_response_id + delta input` [E: packages/ai/src/api/openai-codex-responses.ts:839] [E: packages/ai/src/api/openai-codex-responses.ts:840] [E: packages/ai/src/api/openai-codex-responses.ts:841] [E: packages/ai/src/api/openai-codex-responses.ts:842] [E: packages/ai/src/api/openai-codex-responses.ts:845] [E: packages/ai/src/api/openai-codex-responses.ts:846] [E: packages/ai/src/api/openai-codex-responses.ts:847] [E: packages/ai/src/api/openai-codex-responses.ts:849] [E: packages/ai/src/api/openai-codex-responses.ts:850] [E: packages/ai/src/api/openai-codex-responses.ts:1420] [E: packages/ai/src/api/openai-codex-responses.ts:1426] [E: packages/ai/src/api/openai-codex-responses.ts:1432] [E: packages/ai/src/api/openai-codex-responses.ts:1434] [E: packages/ai/src/api/openai-codex-responses.ts:1435]。

## 控制流

1. `stream@packages/ai/src/api/openai-codex-responses.ts:200` 初始化输出对象后调用 `buildRequestBody()`, 允许 `options.onPayload` inspect/replace body, 用 `sessionId` 或 random request id 生成 WebSocket request id, 并序列化 body [E: packages/ai/src/api/openai-codex-responses.ts:238] [E: packages/ai/src/api/openai-codex-responses.ts:269] [E: packages/ai/src/api/openai-codex-responses.ts:270] [E: packages/ai/src/api/openai-codex-responses.ts:271] [E: packages/ai/src/api/openai-codex-responses.ts:272] [E: packages/ai/src/api/openai-codex-responses.ts:272] [E: packages/ai/src/api/openai-codex-responses.ts:283]。
2. 当 `transport !== "sse"` 且本 session 未被标记 WebSocket fallback active, `stream()` 调 `processWebSocketStream()`; WebSocket 成功完成后 push `done` 并 `stream.end()`, 不再进入 SSE path [E: packages/ai/src/api/openai-codex-responses.ts:288] [E: packages/ai/src/api/openai-codex-responses.ts:293] [E: packages/ai/src/api/openai-codex-responses.ts:300] [E: packages/ai/src/api/openai-codex-responses.ts:326] [E: packages/ai/src/api/openai-codex-responses.ts:331] [E: packages/ai/src/api/openai-codex-responses.ts:332]。
3. WebSocket failure 在首个 message stream event 之前可降级: 代码记录 provider transport diagnostic、记录 session WebSocket failure、把该 session 加入 SSE fallback set, 然后 break 到 SSE fetch path; 如果已经开始 emit WebSocket events, 或错误是非 connection-limit 的 Codex API/protocol error, 则抛出错误 [E: packages/ai/src/api/openai-codex-responses.ts:333] [E: packages/ai/src/api/openai-codex-responses.ts:335] [E: packages/ai/src/api/openai-codex-responses.ts:341] [E: packages/ai/src/api/openai-codex-responses.ts:345] [E: packages/ai/src/api/openai-codex-responses.ts:348] [E: packages/ai/src/api/openai-codex-responses.ts:358] [E: packages/ai/src/api/openai-codex-responses.ts:359] [E: packages/ai/src/api/openai-codex-responses.ts:362] [E: packages/ai/src/api/openai-codex-responses.ts:363]。
4. SSE path 会先尝试把 request body 做 zstd 压缩并设置 `content-encoding: zstd`,不可用时回退 JSON 字符串;随后用 `fetch(resolveCodexUrl(model.baseUrl))` POST `sseBody`,叠加 caller signal 和 `timeoutMs` 派生的 header timeout,支持 `maxRetries`、`retry-after(-ms)` 和 transient HTTP/network retry; response ok 后才 push `start` 并调用 `processStream()` [E: packages/ai/src/api/openai-codex-responses.ts:371] [E: packages/ai/src/api/openai-codex-responses.ts:373] [E: packages/ai/src/api/openai-codex-responses.ts:375] [E: packages/ai/src/api/openai-codex-responses.ts:380] [E: packages/ai/src/api/openai-codex-responses.ts:388] [E: packages/ai/src/api/openai-codex-responses.ts:390] [E: packages/ai/src/api/openai-codex-responses.ts:379] [E: packages/ai/src/api/openai-codex-responses.ts:395] [E: packages/ai/src/api/openai-codex-responses.ts:399] [E: packages/ai/src/api/openai-codex-responses.ts:400] [E: packages/ai/src/api/openai-codex-responses.ts:416] [E: packages/ai/src/api/openai-codex-responses.ts:417] [E: packages/ai/src/api/openai-codex-responses.ts:423] [E: packages/ai/src/api/openai-codex-responses.ts:445] [E: packages/ai/src/api/openai-codex-responses.ts:447] [E: packages/ai/src/api/openai-codex-responses.ts:465] [E: packages/ai/src/api/openai-codex-responses.ts:467]。
5. `processStream()` 把 SSE bytes 交给 `parseSSE()`, 再交给 `mapCodexEvents()`, 最后交给 `processResponsesStream()`; 这说明 Codex SSE event 的最终 assistant stream shape 与 Responses shared normalizer 对齐 [E: packages/ai/src/api/openai-codex-responses.ts:649] [E: packages/ai/src/api/openai-codex-responses.ts:665] [I]。
6. `processWebSocketStream()` 先 `acquireWebSocket()`, 再 `socket.send(JSON.stringify({ type: "response.create", ...requestBody }))`, 然后把 `parseWebSocket()` + `mapCodexEvents()` + `startWebSocketOutputOnFirstEvent()` 的 async iterable 交给 `processResponsesStream()` [E: packages/ai/src/api/openai-codex-responses.ts:1453] [E: packages/ai/src/api/openai-codex-responses.ts:1468] [E: packages/ai/src/api/openai-codex-responses.ts:1502] [E: packages/ai/src/api/openai-codex-responses.ts:1503] [E: packages/ai/src/api/openai-codex-responses.ts:1504] [E: packages/ai/src/api/openai-codex-responses.ts:1506]。
7. `mapCodexEvents()` 把 Codex terminal variants `response.done`、`response.completed`、`response.incomplete` 统一 yield 为 `response.completed` 并 normalize response status; 它把 wire `error` 和 `response.failed` 转成 `CodexApiError`, 因此这些不是普通 delta event [E: packages/ai/src/api/openai-codex-responses.ts:722] [E: packages/ai/src/api/openai-codex-responses.ts:722] [E: packages/ai/src/api/openai-codex-responses.ts:724] [E: packages/ai/src/api/openai-codex-responses.ts:730] [E: packages/ai/src/api/openai-codex-responses.ts:734] [E: packages/ai/src/api/openai-codex-responses.ts:737] [E: packages/ai/src/api/openai-codex-responses.ts:742] [E: packages/ai/src/api/openai-codex-responses.ts:743] [E: packages/ai/src/api/openai-codex-responses.ts:745]。
8. `parseWebSocket()` 将 WebSocket message data decode 成 JSON event queue, 在 `response.completed`/`response.done`/`response.incomplete` 后标记 completion; close 如果发生在 completion 前会变成 error, idle timeout 会主动 close socket 并失败 [E: packages/ai/src/api/openai-codex-responses.ts:1267] [E: packages/ai/src/api/openai-codex-responses.ts:1290] [E: packages/ai/src/api/openai-codex-responses.ts:1292] [E: packages/ai/src/api/openai-codex-responses.ts:1294] [E: packages/ai/src/api/openai-codex-responses.ts:1317] [E: packages/ai/src/api/openai-codex-responses.ts:1324] [E: packages/ai/src/api/openai-codex-responses.ts:1355] [E: packages/ai/src/api/openai-codex-responses.ts:1360] [E: packages/ai/src/api/openai-codex-responses.ts:1361]。

## WebSocket session cache 与 cleanup

WebSocket cache 只按 `sessionId` 生效: 没有 `sessionId` 时每次新建 socket 并在 release 时关闭; 有 `sessionId` 时可复用非 busy 且 reusable 的 cached socket, busy session 会临时新建额外 socket, 不可复用 socket 会被关闭并从 cache 删除 [E: packages/ai/src/api/openai-codex-responses.ts:1113] [E: packages/ai/src/api/openai-codex-responses.ts:1127] [E: packages/ai/src/api/openai-codex-responses.ts:1132] [E: packages/ai/src/api/openai-codex-responses.ts:1120] [E: packages/ai/src/api/openai-codex-responses.ts:1147] [E: packages/ai/src/api/openai-codex-responses.ts:1166] [E: packages/ai/src/api/openai-codex-responses.ts:1176]。

可复用 socket 在 release keep 时会进入 idle expiry, 默认 TTL 是 5 分钟; timer 触发时如果 entry 不 busy, 就 close socket 并删除 session cache entry [E: packages/ai/src/api/openai-codex-responses.ts:826] [E: packages/ai/src/api/openai-codex-responses.ts:1009] [E: packages/ai/src/api/openai-codex-responses.ts:1026] [E: packages/ai/src/api/openai-codex-responses.ts:1027] [E: packages/ai/src/api/openai-codex-responses.ts:1028] [E: packages/ai/src/api/openai-codex-responses.ts:916]。

Codex 把 `closeOpenAICodexWebSocketSessions` 注册到 session resource cleanup registry; 这个 helper 支持按单个 `sessionId` 关闭 cached socket, 也支持无参关闭全部 cached sessions [E: packages/ai/src/api/openai-codex-responses.ts:909] [E: packages/ai/src/api/openai-codex-responses.ts:914] [E: packages/ai/src/api/openai-codex-responses.ts:916] [E: packages/ai/src/api/openai-codex-responses.ts:906] [E: packages/ai/src/api/openai-codex-responses.ts:922] [E: packages/ai/src/api/openai-codex-responses.ts:925]。

WebSocket cached continuation 保持 `store: false` 的 base body, 并通过 connection-scoped `previous_response_id` state 构造 delta request; 代码旁注说明 ChatGPT Codex Responses 会拒绝 `store: true` [E: packages/ai/src/api/openai-codex-responses.ts:548] [E: packages/ai/src/api/openai-codex-responses.ts:1432] [E: packages/ai/src/api/openai-codex-responses.ts:1434] [E: packages/ai/src/api/openai-codex-responses.ts:1435] [E: packages/ai/src/api/openai-codex-responses.ts:1478] [I]。

## 与普通 OpenAI Responses 的差异

普通 OpenAI Responses 使用 `openai` SDK client 的 `client.responses.create(params, requestOptions).withResponse()`; Codex Responses 不创建 SDK client, 而是直接拼 ChatGPT backend URL、headers、fetch/SSE 和 WebSocket transport [E: packages/ai/src/api/openai-responses.ts:151] [E: packages/ai/src/api/openai-codex-responses.ts:379] [E: packages/ai/src/api/openai-codex-responses.ts:1035] [E: packages/ai/src/api/openai-codex-responses.ts:1056]。

普通 OpenAI Responses 的 request builder 调用默认 `convertResponsesMessages()` 时可把 system prompt 放进 Responses `input` 的 developer/system role; Codex request builder 调 `convertResponsesMessages(..., { includeSystemPrompt: false })`, 再把 system prompt 放到 top-level `instructions` [E: packages/ai/src/api/openai-responses.ts:274] [E: packages/ai/src/api/openai-responses-shared.ts:174] [E: packages/ai/src/api/openai-responses-shared.ts:178] [E: packages/ai/src/api/openai-codex-responses.ts:534] [E: packages/ai/src/api/openai-codex-responses.ts:535] [E: packages/ai/src/api/openai-codex-responses.ts:550]。

普通 OpenAI Responses 以 `prompt_cache_retention` 表达 long/none cache policy; Codex 固定 `prompt_cache_key` 来自 session id, 没有在 `RequestBody` 和 `buildRequestBody()` 里设置 `prompt_cache_retention` [E: packages/ai/src/api/openai-responses.ts:284] [E: packages/ai/src/api/openai-responses.ts:290] [E: packages/ai/src/api/openai-responses.ts:291] [E: packages/ai/src/api/openai-codex-responses.ts:82] [E: packages/ai/src/api/openai-codex-responses.ts:97] [E: packages/ai/src/api/openai-codex-responses.ts:554] [I]。

普通 OpenAI Responses 的 `OpenAIResponsesOptions.reasoningEffort` 不含 `"none"`, `reasoningSummary` 不含 `"off"`/`"on"`, 也没有 `textVerbosity`; Codex options 增加这些字段以适配 ChatGPT Codex backend [E: packages/ai/src/api/openai-responses.ts:92] [E: packages/ai/src/api/openai-responses.ts:93] [E: packages/ai/src/api/openai-responses.ts:94] [E: packages/ai/src/api/openai-codex-responses.ts:72] [E: packages/ai/src/api/openai-codex-responses.ts:73] [E: packages/ai/src/api/openai-codex-responses.ts:74] [E: packages/ai/src/api/openai-codex-responses.ts:76] [I]。

Codex headers are ChatGPT-specific: base headers extract account id from JWT, set `chatgpt-account-id`, `originator: pi`, and user agent; SSE adds `OpenAI-Beta: responses=experimental`, while WebSocket uses `responses_websockets=2026-02-06` and per-request `session-id`/`x-client-request-id` [E: packages/ai/src/api/openai-codex-responses.ts:1577] [E: packages/ai/src/api/openai-codex-responses.ts:1582] [E: packages/ai/src/api/openai-codex-responses.ts:1604] [E: packages/ai/src/api/openai-codex-responses.ts:1605] [E: packages/ai/src/api/openai-codex-responses.ts:1606] [E: packages/ai/src/api/openai-codex-responses.ts:1619] [E: packages/ai/src/api/openai-codex-responses.ts:1643] [E: packages/ai/src/api/openai-codex-responses.ts:1644] [E: packages/ai/src/api/openai-codex-responses.ts:1645]。

## Gotcha

- Explicit `transport: "auto"` and `transport: "websocket-cached"` both set `useCachedContext`; actual `previous_response_id` delta rewriting still requires a cached entry with compatible continuation state. The default unset transport chooses WebSocket in `stream()`, but does not satisfy `options?.transport === "auto"` inside `processWebSocketStream()` [E: packages/ai/src/api/openai-codex-responses.ts:286] [E: packages/ai/src/api/openai-codex-responses.ts:293] [E: packages/ai/src/api/openai-codex-responses.ts:1420] [E: packages/ai/src/api/openai-codex-responses.ts:1426] [E: packages/ai/src/api/openai-codex-responses.ts:1432] [E: packages/ai/src/api/openai-codex-responses.ts:1434] [E: packages/ai/src/api/openai-codex-responses.ts:1435] [E: packages/ai/src/api/openai-codex-responses.ts:1478] [I]。
- A per-session WebSocket failure activates SSE fallback for later non-SSE requests in that session; `resetOpenAICodexWebSocketDebugStats(sessionId)` also clears the fallback flag for that session [E: packages/ai/src/api/openai-codex-responses.ts:872] [E: packages/ai/src/api/openai-codex-responses.ts:899] [E: packages/ai/src/api/openai-codex-responses.ts:902] [E: packages/ai/src/api/openai-codex-responses.ts:938] [E: packages/ai/src/api/openai-codex-responses.ts:940]。
- `processResponsesStream()` requires a terminal Responses event; `mapCodexEvents()` converts Codex terminal variants into `response.completed`, so malformed streams that end without that terminal event become errors rather than silent success [E: packages/ai/src/api/openai-codex-responses.ts:737] [E: packages/ai/src/api/openai-codex-responses.ts:745] [E: packages/ai/src/api/openai-responses-shared.ts:757] [E: packages/ai/src/api/openai-responses-shared.ts:758]。
- `partialJson` is scratch state for streaming tool arguments; Codex error cleanup deletes it before emitting the final error assistant message [E: packages/ai/src/api/openai-codex-responses.ts:477] [E: packages/ai/src/api/openai-codex-responses.ts:479]。

## 跨包边界

[subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) 应覆盖 `Models.stream`、provider `api` dispatch、`ProviderStreams` 和 lazy loading 的通用路径; 本节点只描述 dispatch 命中 `openai-codex-responses.ts` 后的 Codex wire behavior [E: packages/ai/src/api/openai-codex-responses.ts:230] [I]。

[subsys.ai.session-resources](session-resources.md) 应覆盖 `registerSessionResourceCleanup` / `cleanupSessionResources` registry 语义; 本节点只记录 Codex 将 `closeOpenAICodexWebSocketSessions` 注册为 session cleanup 的事实和它关闭 WebSocket cache 的行为 [E: packages/ai/src/api/openai-codex-responses.ts:909] [E: packages/ai/src/api/openai-codex-responses.ts:925] [I]。

## 本轮 stream 状态与 fetch 变化

Codex Responses accumulator 从 `pending` 开始；shared Responses processor 完成后，adapter 断言结果已 terminal，避免把未收敛 partial 当 final。`rawStopReason` 来自 shared terminal response status。[E: packages/ai/src/api/openai-codex-responses.ts:238] [E: packages/ai/src/api/openai-codex-responses.ts:252] [E: packages/ai/src/api/openai-codex-responses.ts:467] [E: packages/ai/src/api/openai-codex-responses.ts:474] [E: packages/ai/src/api/openai-responses-shared.ts:567] [E: packages/ai/src/api/openai-responses-shared.ts:568]

custom fetch 只注入 Codex SSE request path；公开 contract 明确 fetch 不影响 WebSocket transport。[E: packages/ai/src/api/openai-codex-responses.ts:387] [E: packages/ai/src/api/openai-codex-responses.ts:392] [E: packages/ai/src/types.ts:130] [E: packages/ai/src/types.ts:130]

## Sources

- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/utils/deferred-tools.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `model.api` / provider `api` map 如何把统一 stream call 派发到 Codex wire module。
- [subsys.ai.session-resources](session-resources.md): session-scoped cleanup registry 如何被 agent/session 生命周期调用, 以及 Codex WebSocket cache 清理如何挂入其中。
