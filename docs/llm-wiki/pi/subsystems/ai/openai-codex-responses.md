---
id: subsys.ai.openai-codex-responses
title: OpenAI Codex(WebSocket)协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/openai-codex-responses.ts
symbols:
  - stream
  - OpenAICodexResponsesOptions
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.session-resources
evidence: explicit
status: verified
updated: 8c943640
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

`stream` 是本协议的权威入口: 它创建 `AssistantMessageEventStream`, 构造 assistant output skeleton, 校验 `apiKey`, 从 token 提取 ChatGPT account id, 构造 request body 和 SSE/WebSocket headers, 然后按 transport 决定先尝试 WebSocket 还是直接 SSE [E: packages/ai/src/api/openai-codex-responses.ts:221] [E: packages/ai/src/api/openai-codex-responses.ts:226] [E: packages/ai/src/api/openai-codex-responses.ts:248] [E: packages/ai/src/api/openai-codex-responses.ts:253] [E: packages/ai/src/api/openai-codex-responses.ts:254] [E: packages/ai/src/api/openai-codex-responses.ts:260] [E: packages/ai/src/api/openai-codex-responses.ts:261] [E: packages/ai/src/api/openai-codex-responses.ts:271]。

`OpenAICodexResponsesOptions` 扩展通用 `StreamOptions`, 额外开放 Codex/Responses 相关 knobs: `reasoningEffort` 支持 `"none"` 到 `"xhigh"`, `reasoningSummary` 支持 `"off"`/`"on"` 等 Codex 兼容值, 还支持 `serviceTier` 和 `textVerbosity` [E: packages/ai/src/api/openai-codex-responses.ts:82] [E: packages/ai/src/api/openai-codex-responses.ts:83] [E: packages/ai/src/api/openai-codex-responses.ts:84] [E: packages/ai/src/api/openai-codex-responses.ts:85] [E: packages/ai/src/api/openai-codex-responses.ts:86]。

本节点覆盖 Codex Responses wire wrapper, 不覆盖 `processResponsesStream()` 的完整 Responses event normalization; Codex 在 SSE 和 WebSocket 两条路径都把事件先映射成 `ResponseStreamEvent`, 再交给 shared normalizer [E: packages/ai/src/api/openai-codex-responses.ts:594] [E: packages/ai/src/api/openai-codex-responses.ts:1407] [E: packages/ai/src/api/openai-codex-responses.ts:1409] [I]。

## 关键文件

- `packages/ai/src/api/openai-codex-responses.ts`: Codex request/header/transport/error/session-cache 的权威实现 [E: packages/ai/src/api/openai-codex-responses.ts:56] [E: packages/ai/src/api/openai-codex-responses.ts:221] [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:1361]。
- `packages/ai/src/api/openai-responses-shared.ts`: Codex 复用的 Responses message/tool conversion 与 stream event normalizer; 本节点只引用它的角色, 归一化细节应由 OpenAI Responses/shared 节点覆盖 [E: packages/ai/src/api/openai-codex-responses.ts:49] [I]。
- `packages/ai/src/session-resources.ts`: session cleanup registry; Codex 把自己的 WebSocket close helper 注册进去, 使 session 结束清理能关闭缓存连接 [E: packages/ai/src/api/openai-codex-responses.ts:25] [E: packages/ai/src/api/openai-codex-responses.ts:850] [I]。

## 数据模型

`RequestBody` 是 Codex backend 的 body shape: 它保留 Responses 字段 `model`、`stream`、`input`、`tools`、`tool_choice`、`parallel_tool_calls`、`reasoning`、`service_tier`、`text`、`include`、`prompt_cache_key`, 并额外允许 `previous_response_id` 支撑 WebSocket cached continuation [E: packages/ai/src/api/openai-codex-responses.ts:92] [E: packages/ai/src/api/openai-codex-responses.ts:94] [E: packages/ai/src/api/openai-codex-responses.ts:96] [E: packages/ai/src/api/openai-codex-responses.ts:97] [E: packages/ai/src/api/openai-codex-responses.ts:98] [E: packages/ai/src/api/openai-codex-responses.ts:99] [E: packages/ai/src/api/openai-codex-responses.ts:100] [E: packages/ai/src/api/openai-codex-responses.ts:102] [E: packages/ai/src/api/openai-codex-responses.ts:103] [E: packages/ai/src/api/openai-codex-responses.ts:104] [E: packages/ai/src/api/openai-codex-responses.ts:105] [E: packages/ai/src/api/openai-codex-responses.ts:106]。

`buildRequestBody()` 对 Codex 的 request policy 很明确: system prompt 不放进 `input`, 而是写入 top-level `instructions`; `store` 固定为 `false`, `stream` 固定为 `true`, `text.verbosity` 默认 `"low"`, `include` 固定包含 encrypted reasoning content, `prompt_cache_key` 来自 clamped `sessionId`, tool choice 是 auto 且 parallel tool calls 开启 [E: packages/ai/src/api/openai-codex-responses.ts:484] [E: packages/ai/src/api/openai-codex-responses.ts:485] [E: packages/ai/src/api/openai-codex-responses.ts:488] [E: packages/ai/src/api/openai-codex-responses.ts:490] [E: packages/ai/src/api/openai-codex-responses.ts:491] [E: packages/ai/src/api/openai-codex-responses.ts:492] [E: packages/ai/src/api/openai-codex-responses.ts:494] [E: packages/ai/src/api/openai-codex-responses.ts:495] [E: packages/ai/src/api/openai-codex-responses.ts:496] [E: packages/ai/src/api/openai-codex-responses.ts:497] [E: packages/ai/src/api/openai-codex-responses.ts:498]。

`CachedWebSocketConnection` 是 per-session WebSocket cache entry: 它保存 socket、busy 标记、idle timer 和可选 continuation state; continuation state 记录上一轮 full request body、last response id 和上一轮 response items, `buildCachedWebSocketRequestBody()` 在可匹配 continuation 时计算后续 `previous_response_id + delta input` [E: packages/ai/src/api/openai-codex-responses.ts:764] [E: packages/ai/src/api/openai-codex-responses.ts:765] [E: packages/ai/src/api/openai-codex-responses.ts:766] [E: packages/ai/src/api/openai-codex-responses.ts:767] [E: packages/ai/src/api/openai-codex-responses.ts:770] [E: packages/ai/src/api/openai-codex-responses.ts:771] [E: packages/ai/src/api/openai-codex-responses.ts:772] [E: packages/ai/src/api/openai-codex-responses.ts:773] [E: packages/ai/src/api/openai-codex-responses.ts:774] [E: packages/ai/src/api/openai-codex-responses.ts:1325] [E: packages/ai/src/api/openai-codex-responses.ts:1331] [E: packages/ai/src/api/openai-codex-responses.ts:1337] [E: packages/ai/src/api/openai-codex-responses.ts:1339] [E: packages/ai/src/api/openai-codex-responses.ts:1340]。

## 控制流

1. `stream@packages/ai/src/api/openai-codex-responses.ts:200` 初始化输出对象后调用 `buildRequestBody()`, 允许 `options.onPayload` inspect/replace body, 用 `sessionId` 或 random request id 生成 WebSocket request id, 并序列化 body [E: packages/ai/src/api/openai-codex-responses.ts:229] [E: packages/ai/src/api/openai-codex-responses.ts:254] [E: packages/ai/src/api/openai-codex-responses.ts:255] [E: packages/ai/src/api/openai-codex-responses.ts:256] [E: packages/ai/src/api/openai-codex-responses.ts:257] [E: packages/ai/src/api/openai-codex-responses.ts:259] [E: packages/ai/src/api/openai-codex-responses.ts:268]。
2. 当 `transport !== "sse"` 且本 session 未被标记 WebSocket fallback active, `stream()` 调 `processWebSocketStream()`; WebSocket 成功完成后 push `done` 并 `stream.end()`, 不再进入 SSE path [E: packages/ai/src/api/openai-codex-responses.ts:272] [E: packages/ai/src/api/openai-codex-responses.ts:277] [E: packages/ai/src/api/openai-codex-responses.ts:283] [E: packages/ai/src/api/openai-codex-responses.ts:301] [E: packages/ai/src/api/openai-codex-responses.ts:306] [E: packages/ai/src/api/openai-codex-responses.ts:307]。
3. WebSocket failure 在首个 message stream event 之前可降级: 代码记录 provider transport diagnostic、记录 session WebSocket failure、把该 session 加入 SSE fallback set, 然后 break 到 SSE fetch path; 如果已经开始 emit WebSocket events, 或错误是非 connection-limit 的 Codex API/protocol error, 则抛出错误 [E: packages/ai/src/api/openai-codex-responses.ts:308] [E: packages/ai/src/api/openai-codex-responses.ts:310] [E: packages/ai/src/api/openai-codex-responses.ts:311] [E: packages/ai/src/api/openai-codex-responses.ts:315] [E: packages/ai/src/api/openai-codex-responses.ts:318] [E: packages/ai/src/api/openai-codex-responses.ts:328] [E: packages/ai/src/api/openai-codex-responses.ts:329] [E: packages/ai/src/api/openai-codex-responses.ts:332] [E: packages/ai/src/api/openai-codex-responses.ts:333]。
4. SSE path 会先尝试把 request body 做 zstd 压缩并设置 `content-encoding: zstd`,不可用时回退 JSON 字符串;随后用 `fetch(resolveCodexUrl(model.baseUrl))` POST `sseBody`,叠加 caller signal 和 `timeoutMs` 派生的 header timeout,支持 `maxRetries`、`retry-after(-ms)` 和 transient HTTP/network retry; response ok 后才 push `start` 并调用 `processStream()` [E: packages/ai/src/api/openai-codex-responses.ts:341] [E: packages/ai/src/api/openai-codex-responses.ts:343] [E: packages/ai/src/api/openai-codex-responses.ts:345] [E: packages/ai/src/api/openai-codex-responses.ts:350] [E: packages/ai/src/api/openai-codex-responses.ts:358] [E: packages/ai/src/api/openai-codex-responses.ts:360] [E: packages/ai/src/api/openai-codex-responses.ts:362] [E: packages/ai/src/api/openai-codex-responses.ts:365] [E: packages/ai/src/api/openai-codex-responses.ts:369] [E: packages/ai/src/api/openai-codex-responses.ts:370] [E: packages/ai/src/api/openai-codex-responses.ts:386] [E: packages/ai/src/api/openai-codex-responses.ts:387] [E: packages/ai/src/api/openai-codex-responses.ts:395] [E: packages/ai/src/api/openai-codex-responses.ts:414] [E: packages/ai/src/api/openai-codex-responses.ts:415] [E: packages/ai/src/api/openai-codex-responses.ts:431] [E: packages/ai/src/api/openai-codex-responses.ts:432]。
5. `processStream()` 把 SSE bytes 交给 `parseSSE()`, 再交给 `mapCodexEvents()`, 最后交给 `processResponsesStream()`; 这说明 Codex SSE event 的最终 assistant stream shape 与 Responses shared normalizer 对齐 [E: packages/ai/src/api/openai-codex-responses.ts:587] [E: packages/ai/src/api/openai-codex-responses.ts:594] [I]。
6. `processWebSocketStream()` 先 `acquireWebSocket()`, 再 `socket.send(JSON.stringify({ type: "response.create", ...requestBody }))`, 然后把 `parseWebSocket()` + `mapCodexEvents()` + `startWebSocketOutputOnFirstEvent()` 的 async iterable 交给 `processResponsesStream()` [E: packages/ai/src/api/openai-codex-responses.ts:1361] [E: packages/ai/src/api/openai-codex-responses.ts:1373] [E: packages/ai/src/api/openai-codex-responses.ts:1406] [E: packages/ai/src/api/openai-codex-responses.ts:1407] [E: packages/ai/src/api/openai-codex-responses.ts:1408] [E: packages/ai/src/api/openai-codex-responses.ts:1409]。
7. `mapCodexEvents()` 把 Codex terminal variants `response.done`、`response.completed`、`response.incomplete` 统一 yield 为 `response.completed` 并 normalize response status; 它把 wire `error` 和 `response.failed` 转成 `CodexApiError`, 因此这些不是普通 delta event [E: packages/ai/src/api/openai-codex-responses.ts:646] [E: packages/ai/src/api/openai-codex-responses.ts:651] [E: packages/ai/src/api/openai-codex-responses.ts:653] [E: packages/ai/src/api/openai-codex-responses.ts:659] [E: packages/ai/src/api/openai-codex-responses.ts:663] [E: packages/ai/src/api/openai-codex-responses.ts:666] [E: packages/ai/src/api/openai-codex-responses.ts:668] [E: packages/ai/src/api/openai-codex-responses.ts:669] [E: packages/ai/src/api/openai-codex-responses.ts:671]。
8. `parseWebSocket()` 将 WebSocket message data decode 成 JSON event queue, 在 `response.completed`/`response.done`/`response.incomplete` 后标记 completion; close 如果发生在 completion 前会变成 error, idle timeout 会主动 close socket 并失败 [E: packages/ai/src/api/openai-codex-responses.ts:1172] [E: packages/ai/src/api/openai-codex-responses.ts:1195] [E: packages/ai/src/api/openai-codex-responses.ts:1197] [E: packages/ai/src/api/openai-codex-responses.ts:1199] [E: packages/ai/src/api/openai-codex-responses.ts:1222] [E: packages/ai/src/api/openai-codex-responses.ts:1229] [E: packages/ai/src/api/openai-codex-responses.ts:1260] [E: packages/ai/src/api/openai-codex-responses.ts:1265] [E: packages/ai/src/api/openai-codex-responses.ts:1266]。

## WebSocket session cache 与 cleanup

WebSocket cache 只按 `sessionId` 生效: 没有 `sessionId` 时每次新建 socket 并在 release 时关闭; 有 `sessionId` 时可复用非 busy 且 reusable 的 cached socket, busy session 会临时新建额外 socket, 不可复用 socket 会被关闭并从 cache 删除 [E: packages/ai/src/api/openai-codex-responses.ts:1032] [E: packages/ai/src/api/openai-codex-responses.ts:1045] [E: packages/ai/src/api/openai-codex-responses.ts:1050] [E: packages/ai/src/api/openai-codex-responses.ts:1054] [E: packages/ai/src/api/openai-codex-responses.ts:1060] [E: packages/ai/src/api/openai-codex-responses.ts:1077] [E: packages/ai/src/api/openai-codex-responses.ts:1087]。

可复用 socket 在 release keep 时会进入 idle expiry, 默认 TTL 是 5 分钟; timer 触发时如果 entry 不 busy, 就 close socket 并删除 session cache entry [E: packages/ai/src/api/openai-codex-responses.ts:752] [E: packages/ai/src/api/openai-codex-responses.ts:943] [E: packages/ai/src/api/openai-codex-responses.ts:947] [E: packages/ai/src/api/openai-codex-responses.ts:948] [E: packages/ai/src/api/openai-codex-responses.ts:949] [E: packages/ai/src/api/openai-codex-responses.ts:950]。

Codex 把 `closeOpenAICodexWebSocketSessions` 注册到 session resource cleanup registry; 这个 helper 支持按单个 `sessionId` 关闭 cached socket, 也支持无参关闭全部 cached sessions [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:838] [E: packages/ai/src/api/openai-codex-responses.ts:841] [E: packages/ai/src/api/openai-codex-responses.ts:844] [E: packages/ai/src/api/openai-codex-responses.ts:847] [E: packages/ai/src/api/openai-codex-responses.ts:850]。

WebSocket cached continuation 保持 `store: false` 的 base body, 并通过 connection-scoped `previous_response_id` state 构造 delta request; 代码旁注说明 ChatGPT Codex Responses 会拒绝 `store: true` [E: packages/ai/src/api/openai-codex-responses.ts:490] [E: packages/ai/src/api/openai-codex-responses.ts:1337] [E: packages/ai/src/api/openai-codex-responses.ts:1339] [E: packages/ai/src/api/openai-codex-responses.ts:1340] [E: packages/ai/src/api/openai-codex-responses.ts:1382] [I]。

## 与普通 OpenAI Responses 的差异

普通 OpenAI Responses 使用 `openai` SDK client 的 `client.responses.create(params, requestOptions).withResponse()`; Codex Responses 不创建 SDK client, 而是直接拼 ChatGPT backend URL、headers、fetch/SSE 和 WebSocket transport [E: packages/ai/src/api/openai-responses.ts:130] [E: packages/ai/src/api/openai-codex-responses.ts:362] [E: packages/ai/src/api/openai-codex-responses.ts:954] [E: packages/ai/src/api/openai-codex-responses.ts:975]。

普通 OpenAI Responses 的 request builder 调用默认 `convertResponsesMessages()` 时可把 system prompt 放进 Responses `input` 的 developer/system role; Codex request builder 调 `convertResponsesMessages(..., { includeSystemPrompt: false })`, 再把 system prompt 放到 top-level `instructions` [E: packages/ai/src/api/openai-responses.ts:221] [E: packages/ai/src/api/openai-responses-shared.ts:125] [E: packages/ai/src/api/openai-responses-shared.ts:129] [E: packages/ai/src/api/openai-codex-responses.ts:484] [E: packages/ai/src/api/openai-codex-responses.ts:485] [E: packages/ai/src/api/openai-codex-responses.ts:492]。

普通 OpenAI Responses 以 `prompt_cache_retention` 表达 long/none cache policy; Codex 固定 `prompt_cache_key` 来自 session id, 没有在 `RequestBody` 和 `buildRequestBody()` 里设置 `prompt_cache_retention` [E: packages/ai/src/api/openai-responses.ts:223] [E: packages/ai/src/api/openai-responses.ts:229] [E: packages/ai/src/api/openai-responses.ts:230] [E: packages/ai/src/api/openai-codex-responses.ts:91] [E: packages/ai/src/api/openai-codex-responses.ts:106] [E: packages/ai/src/api/openai-codex-responses.ts:496] [I]。

普通 OpenAI Responses 的 `OpenAIResponsesOptions.reasoningEffort` 不含 `"none"`, `reasoningSummary` 不含 `"off"`/`"on"`, 也没有 `textVerbosity`; Codex options 增加这些字段以适配 ChatGPT Codex backend [E: packages/ai/src/api/openai-responses.ts:78] [E: packages/ai/src/api/openai-responses.ts:79] [E: packages/ai/src/api/openai-responses.ts:80] [E: packages/ai/src/api/openai-codex-responses.ts:82] [E: packages/ai/src/api/openai-codex-responses.ts:83] [E: packages/ai/src/api/openai-codex-responses.ts:84] [E: packages/ai/src/api/openai-codex-responses.ts:86] [I]。

Codex headers are ChatGPT-specific: base headers extract account id from JWT, set `chatgpt-account-id`, `originator: pi`, and user agent; SSE adds `OpenAI-Beta: responses=experimental`, while WebSocket uses `responses_websockets=2026-02-06` and per-request `session-id`/`x-client-request-id` [E: packages/ai/src/api/openai-codex-responses.ts:1481] [E: packages/ai/src/api/openai-codex-responses.ts:1486] [E: packages/ai/src/api/openai-codex-responses.ts:1515] [E: packages/ai/src/api/openai-codex-responses.ts:1516] [E: packages/ai/src/api/openai-codex-responses.ts:1517] [E: packages/ai/src/api/openai-codex-responses.ts:1531] [E: packages/ai/src/api/openai-codex-responses.ts:1555] [E: packages/ai/src/api/openai-codex-responses.ts:1556] [E: packages/ai/src/api/openai-codex-responses.ts:1557]。

## Gotcha

- Explicit `transport: "auto"` and `transport: "websocket-cached"` both set `useCachedContext`; actual `previous_response_id` delta rewriting still requires a cached entry with compatible continuation state. The default unset transport chooses WebSocket in `stream()`, but does not satisfy `options?.transport === "auto"` inside `processWebSocketStream()` [E: packages/ai/src/api/openai-codex-responses.ts:271] [E: packages/ai/src/api/openai-codex-responses.ts:277] [E: packages/ai/src/api/openai-codex-responses.ts:1325] [E: packages/ai/src/api/openai-codex-responses.ts:1331] [E: packages/ai/src/api/openai-codex-responses.ts:1337] [E: packages/ai/src/api/openai-codex-responses.ts:1339] [E: packages/ai/src/api/openai-codex-responses.ts:1340] [E: packages/ai/src/api/openai-codex-responses.ts:1382] [I]。
- A per-session WebSocket failure activates SSE fallback for later non-SSE requests in that session; `resetOpenAICodexWebSocketDebugStats(sessionId)` also clears the fallback flag for that session [E: packages/ai/src/api/openai-codex-responses.ts:796] [E: packages/ai/src/api/openai-codex-responses.ts:823] [E: packages/ai/src/api/openai-codex-responses.ts:826] [E: packages/ai/src/api/openai-codex-responses.ts:863] [E: packages/ai/src/api/openai-codex-responses.ts:865]。
- `processResponsesStream()` requires a terminal Responses event; `mapCodexEvents()` converts Codex terminal variants into `response.completed`, so malformed streams that end without that terminal event become errors rather than silent success [E: packages/ai/src/api/openai-codex-responses.ts:666] [E: packages/ai/src/api/openai-codex-responses.ts:671] [E: packages/ai/src/api/openai-responses-shared.ts:528] [E: packages/ai/src/api/openai-responses-shared.ts:529]。
- `partialJson` is scratch state for streaming tool arguments; Codex error cleanup deletes it before emitting the final error assistant message [E: packages/ai/src/api/openai-codex-responses.ts:441] [E: packages/ai/src/api/openai-codex-responses.ts:443]。

## 跨包边界

[subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) 应覆盖 `Models.stream`、provider `api` dispatch、`ProviderStreams` 和 lazy loading 的通用路径; 本节点只描述 dispatch 命中 `openai-codex-responses.ts` 后的 Codex wire behavior [E: packages/ai/src/api/openai-codex-responses.ts:221] [I]。

[subsys.ai.session-resources](session-resources.md) 应覆盖 `registerSessionResourceCleanup` / `cleanupSessionResources` registry 语义; 本节点只记录 Codex 将 `closeOpenAICodexWebSocketSessions` 注册为 session cleanup 的事实和它关闭 WebSocket cache 的行为 [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:850] [I]。

## Sources

- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `model.api` / provider `api` map 如何把统一 stream call 派发到 Codex wire module。
- [subsys.ai.session-resources](session-resources.md): session-scoped cleanup registry 如何被 agent/session 生命周期调用, 以及 Codex WebSocket cache 清理如何挂入其中。
