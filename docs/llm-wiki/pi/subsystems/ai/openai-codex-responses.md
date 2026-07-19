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
updated: 3da591ab
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

`stream` 是本协议的权威入口: 它创建 `AssistantMessageEventStream`, 构造 assistant output skeleton, 校验 `apiKey`, 从 token 提取 ChatGPT account id, 构造 request body 和 SSE/WebSocket headers, 然后按 transport 决定先尝试 WebSocket 还是直接 SSE [E: packages/ai/src/api/openai-codex-responses.ts:223] [E: packages/ai/src/api/openai-codex-responses.ts:228] [E: packages/ai/src/api/openai-codex-responses.ts:250] [E: packages/ai/src/api/openai-codex-responses.ts:255] [E: packages/ai/src/api/openai-codex-responses.ts:256] [E: packages/ai/src/api/openai-codex-responses.ts:263] [E: packages/ai/src/api/openai-codex-responses.ts:264] [E: packages/ai/src/api/openai-codex-responses.ts:274]。

`OpenAICodexResponsesOptions` 扩展通用 `StreamOptions`, 额外开放 Codex/Responses 相关 knobs: `reasoningEffort` 支持 `"none"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`, `reasoningSummary` 支持 `"off"`/`"on"` 等 Codex 兼容值, 还支持 `serviceTier`、`textVerbosity` 和 `toolChoice` [E: packages/ai/src/api/openai-codex-responses.ts:83] [E: packages/ai/src/api/openai-codex-responses.ts:84] [E: packages/ai/src/api/openai-codex-responses.ts:85] [E: packages/ai/src/api/openai-codex-responses.ts:86] [E: packages/ai/src/api/openai-codex-responses.ts:87]。

本节点覆盖 Codex Responses wire wrapper, 不覆盖 `processResponsesStream()` 的完整 Responses event normalization; Codex 在 SSE 和 WebSocket 两条路径都把事件先映射成 `ResponseStreamEvent`, 再交给 shared normalizer [E: packages/ai/src/api/openai-codex-responses.ts:599] [E: packages/ai/src/api/openai-codex-responses.ts:1421] [E: packages/ai/src/api/openai-codex-responses.ts:1423] [I]。

## 关键文件

- `packages/ai/src/api/openai-codex-responses.ts`: Codex request/header/transport/error/session-cache 的权威实现 [E: packages/ai/src/api/openai-codex-responses.ts:57] [E: packages/ai/src/api/openai-codex-responses.ts:223] [E: packages/ai/src/api/openai-codex-responses.ts:840] [E: packages/ai/src/api/openai-codex-responses.ts:1375]。
- `packages/ai/src/api/openai-responses-shared.ts`: Codex 复用的 Responses message/tool conversion 与 stream event normalizer; 本节点只引用它的角色, 归一化细节应由 OpenAI Responses/shared 节点覆盖 [E: packages/ai/src/api/openai-codex-responses.ts:50] [I]。
- `packages/ai/src/session-resources.ts`: session cleanup registry; Codex 把自己的 WebSocket close helper 注册进去, 使 session 结束清理能关闭缓存连接 [E: packages/ai/src/api/openai-codex-responses.ts:25] [E: packages/ai/src/api/openai-codex-responses.ts:857] [I]。

## 数据模型

`RequestBody` 是 Codex backend 的 body shape: 它保留 Responses 字段 `model`、`stream`、`input`、`tools`、`tool_choice`、`parallel_tool_calls`、`reasoning`、`service_tier`、`text`、`include`、`prompt_cache_key`, 并额外允许 `previous_response_id` 支撑 WebSocket cached continuation [E: packages/ai/src/api/openai-codex-responses.ts:94] [E: packages/ai/src/api/openai-codex-responses.ts:96] [E: packages/ai/src/api/openai-codex-responses.ts:98] [E: packages/ai/src/api/openai-codex-responses.ts:99] [E: packages/ai/src/api/openai-codex-responses.ts:100] [E: packages/ai/src/api/openai-codex-responses.ts:99] [E: packages/ai/src/api/openai-codex-responses.ts:102] [E: packages/ai/src/api/openai-codex-responses.ts:104] [E: packages/ai/src/api/openai-codex-responses.ts:105] [E: packages/ai/src/api/openai-codex-responses.ts:106] [E: packages/ai/src/api/openai-codex-responses.ts:107] [E: packages/ai/src/api/openai-codex-responses.ts:108]。

`buildRequestBody()` 对 Codex 的 request policy 很明确: system prompt 不放进 `input`, 而是写入 top-level `instructions`; `store` 固定为 `false`, `stream` 固定为 `true`, `text.verbosity` 默认 `"low"`, `include` 固定包含 encrypted reasoning content, `prompt_cache_key` 来自 clamped `sessionId`, tool choice 是 auto 且 parallel tool calls 开启 [E: packages/ai/src/api/openai-codex-responses.ts:488] [E: packages/ai/src/api/openai-codex-responses.ts:489] [E: packages/ai/src/api/openai-codex-responses.ts:493] [E: packages/ai/src/api/openai-codex-responses.ts:495] [E: packages/ai/src/api/openai-codex-responses.ts:496] [E: packages/ai/src/api/openai-codex-responses.ts:497] [E: packages/ai/src/api/openai-codex-responses.ts:499] [E: packages/ai/src/api/openai-codex-responses.ts:500] [E: packages/ai/src/api/openai-codex-responses.ts:501] [E: packages/ai/src/api/openai-codex-responses.ts:497] [E: packages/ai/src/api/openai-codex-responses.ts:503]。

Codex 复用同一 deferred-tool protocol：仅当 `model.compat.supportsToolSearch` 为 true 时，`splitDeferredTools()` 延后 marked tools，shared converter 把 `ToolResultMessage.addedToolNames` 变成 `tool_search_call` items；其它工具仍进入 request `tools` [E: packages/ai/src/api/openai-codex-responses.ts:487] [E: packages/ai/src/api/openai-codex-responses.ts:490] [E: packages/ai/src/api/openai-codex-responses.ts:514] [E: packages/ai/src/api/openai-codex-responses.ts:515] [E: packages/ai/src/api/openai-responses-shared.ts:270] [E: packages/ai/src/api/openai-responses-shared.ts:281]。

`CachedWebSocketConnection` 是 per-session WebSocket cache entry: 它保存 socket、busy 标记、idle timer 和可选 continuation state; continuation state 记录上一轮 full request body、last response id 和上一轮 response items, `buildCachedWebSocketRequestBody()` 在可匹配 continuation 时计算后续 `previous_response_id + delta input` [E: packages/ai/src/api/openai-codex-responses.ts:770] [E: packages/ai/src/api/openai-codex-responses.ts:771] [E: packages/ai/src/api/openai-codex-responses.ts:772] [E: packages/ai/src/api/openai-codex-responses.ts:773] [E: packages/ai/src/api/openai-codex-responses.ts:776] [E: packages/ai/src/api/openai-codex-responses.ts:777] [E: packages/ai/src/api/openai-codex-responses.ts:778] [E: packages/ai/src/api/openai-codex-responses.ts:780] [E: packages/ai/src/api/openai-codex-responses.ts:781] [E: packages/ai/src/api/openai-codex-responses.ts:1339] [E: packages/ai/src/api/openai-codex-responses.ts:1345] [E: packages/ai/src/api/openai-codex-responses.ts:1351] [E: packages/ai/src/api/openai-codex-responses.ts:1353] [E: packages/ai/src/api/openai-codex-responses.ts:1354]。

## 控制流

1. `stream@packages/ai/src/api/openai-codex-responses.ts:200` 初始化输出对象后调用 `buildRequestBody()`, 允许 `options.onPayload` inspect/replace body, 用 `sessionId` 或 random request id 生成 WebSocket request id, 并序列化 body [E: packages/ai/src/api/openai-codex-responses.ts:231] [E: packages/ai/src/api/openai-codex-responses.ts:256] [E: packages/ai/src/api/openai-codex-responses.ts:257] [E: packages/ai/src/api/openai-codex-responses.ts:258] [E: packages/ai/src/api/openai-codex-responses.ts:259] [E: packages/ai/src/api/openai-codex-responses.ts:259] [E: packages/ai/src/api/openai-codex-responses.ts:271]。
2. 当 `transport !== "sse"` 且本 session 未被标记 WebSocket fallback active, `stream()` 调 `processWebSocketStream()`; WebSocket 成功完成后 push `done` 并 `stream.end()`, 不再进入 SSE path [E: packages/ai/src/api/openai-codex-responses.ts:275] [E: packages/ai/src/api/openai-codex-responses.ts:280] [E: packages/ai/src/api/openai-codex-responses.ts:286] [E: packages/ai/src/api/openai-codex-responses.ts:304] [E: packages/ai/src/api/openai-codex-responses.ts:309] [E: packages/ai/src/api/openai-codex-responses.ts:310]。
3. WebSocket failure 在首个 message stream event 之前可降级: 代码记录 provider transport diagnostic、记录 session WebSocket failure、把该 session 加入 SSE fallback set, 然后 break 到 SSE fetch path; 如果已经开始 emit WebSocket events, 或错误是非 connection-limit 的 Codex API/protocol error, 则抛出错误 [E: packages/ai/src/api/openai-codex-responses.ts:311] [E: packages/ai/src/api/openai-codex-responses.ts:313] [E: packages/ai/src/api/openai-codex-responses.ts:314] [E: packages/ai/src/api/openai-codex-responses.ts:318] [E: packages/ai/src/api/openai-codex-responses.ts:321] [E: packages/ai/src/api/openai-codex-responses.ts:331] [E: packages/ai/src/api/openai-codex-responses.ts:332] [E: packages/ai/src/api/openai-codex-responses.ts:335] [E: packages/ai/src/api/openai-codex-responses.ts:336]。
4. SSE path 会先尝试把 request body 做 zstd 压缩并设置 `content-encoding: zstd`,不可用时回退 JSON 字符串;随后用 `fetch(resolveCodexUrl(model.baseUrl))` POST `sseBody`,叠加 caller signal 和 `timeoutMs` 派生的 header timeout,支持 `maxRetries`、`retry-after(-ms)` 和 transient HTTP/network retry; response ok 后才 push `start` 并调用 `processStream()` [E: packages/ai/src/api/openai-codex-responses.ts:344] [E: packages/ai/src/api/openai-codex-responses.ts:346] [E: packages/ai/src/api/openai-codex-responses.ts:348] [E: packages/ai/src/api/openai-codex-responses.ts:353] [E: packages/ai/src/api/openai-codex-responses.ts:361] [E: packages/ai/src/api/openai-codex-responses.ts:363] [E: packages/ai/src/api/openai-codex-responses.ts:365] [E: packages/ai/src/api/openai-codex-responses.ts:368] [E: packages/ai/src/api/openai-codex-responses.ts:372] [E: packages/ai/src/api/openai-codex-responses.ts:373] [E: packages/ai/src/api/openai-codex-responses.ts:389] [E: packages/ai/src/api/openai-codex-responses.ts:390] [E: packages/ai/src/api/openai-codex-responses.ts:398] [E: packages/ai/src/api/openai-codex-responses.ts:417] [E: packages/ai/src/api/openai-codex-responses.ts:418] [E: packages/ai/src/api/openai-codex-responses.ts:434] [E: packages/ai/src/api/openai-codex-responses.ts:435]。
5. `processStream()` 把 SSE bytes 交给 `parseSSE()`, 再交给 `mapCodexEvents()`, 最后交给 `processResponsesStream()`; 这说明 Codex SSE event 的最终 assistant stream shape 与 Responses shared normalizer 对齐 [E: packages/ai/src/api/openai-codex-responses.ts:592] [E: packages/ai/src/api/openai-codex-responses.ts:599] [I]。
6. `processWebSocketStream()` 先 `acquireWebSocket()`, 再 `socket.send(JSON.stringify({ type: "response.create", ...requestBody }))`, 然后把 `parseWebSocket()` + `mapCodexEvents()` + `startWebSocketOutputOnFirstEvent()` 的 async iterable 交给 `processResponsesStream()` [E: packages/ai/src/api/openai-codex-responses.ts:1375] [E: packages/ai/src/api/openai-codex-responses.ts:1387] [E: packages/ai/src/api/openai-codex-responses.ts:1420] [E: packages/ai/src/api/openai-codex-responses.ts:1421] [E: packages/ai/src/api/openai-codex-responses.ts:1422] [E: packages/ai/src/api/openai-codex-responses.ts:1423]。
7. `mapCodexEvents()` 把 Codex terminal variants `response.done`、`response.completed`、`response.incomplete` 统一 yield 为 `response.completed` 并 normalize response status; 它把 wire `error` 和 `response.failed` 转成 `CodexApiError`, 因此这些不是普通 delta event [E: packages/ai/src/api/openai-codex-responses.ts:651] [E: packages/ai/src/api/openai-codex-responses.ts:656] [E: packages/ai/src/api/openai-codex-responses.ts:658] [E: packages/ai/src/api/openai-codex-responses.ts:664] [E: packages/ai/src/api/openai-codex-responses.ts:668] [E: packages/ai/src/api/openai-codex-responses.ts:671] [E: packages/ai/src/api/openai-codex-responses.ts:673] [E: packages/ai/src/api/openai-codex-responses.ts:674] [E: packages/ai/src/api/openai-codex-responses.ts:676]。
8. `parseWebSocket()` 将 WebSocket message data decode 成 JSON event queue, 在 `response.completed`/`response.done`/`response.incomplete` 后标记 completion; close 如果发生在 completion 前会变成 error, idle timeout 会主动 close socket 并失败 [E: packages/ai/src/api/openai-codex-responses.ts:1186] [E: packages/ai/src/api/openai-codex-responses.ts:1209] [E: packages/ai/src/api/openai-codex-responses.ts:1211] [E: packages/ai/src/api/openai-codex-responses.ts:1213] [E: packages/ai/src/api/openai-codex-responses.ts:1236] [E: packages/ai/src/api/openai-codex-responses.ts:1243] [E: packages/ai/src/api/openai-codex-responses.ts:1274] [E: packages/ai/src/api/openai-codex-responses.ts:1279] [E: packages/ai/src/api/openai-codex-responses.ts:1280]。

## WebSocket session cache 与 cleanup

WebSocket cache 只按 `sessionId` 生效: 没有 `sessionId` 时每次新建 socket 并在 release 时关闭; 有 `sessionId` 时可复用非 busy 且 reusable 的 cached socket, busy session 会临时新建额外 socket, 不可复用 socket 会被关闭并从 cache 删除 [E: packages/ai/src/api/openai-codex-responses.ts:1043] [E: packages/ai/src/api/openai-codex-responses.ts:1056] [E: packages/ai/src/api/openai-codex-responses.ts:1061] [E: packages/ai/src/api/openai-codex-responses.ts:1065] [E: packages/ai/src/api/openai-codex-responses.ts:1074] [E: packages/ai/src/api/openai-codex-responses.ts:1091] [E: packages/ai/src/api/openai-codex-responses.ts:1101]。

可复用 socket 在 release keep 时会进入 idle expiry, 默认 TTL 是 5 分钟; timer 触发时如果 entry 不 busy, 就 close socket 并删除 session cache entry [E: packages/ai/src/api/openai-codex-responses.ts:757] [E: packages/ai/src/api/openai-codex-responses.ts:954] [E: packages/ai/src/api/openai-codex-responses.ts:958] [E: packages/ai/src/api/openai-codex-responses.ts:959] [E: packages/ai/src/api/openai-codex-responses.ts:960] [E: packages/ai/src/api/openai-codex-responses.ts:961]。

Codex 把 `closeOpenAICodexWebSocketSessions` 注册到 session resource cleanup registry; 这个 helper 支持按单个 `sessionId` 关闭 cached socket, 也支持无参关闭全部 cached sessions [E: packages/ai/src/api/openai-codex-responses.ts:840] [E: packages/ai/src/api/openai-codex-responses.ts:845] [E: packages/ai/src/api/openai-codex-responses.ts:848] [E: packages/ai/src/api/openai-codex-responses.ts:851] [E: packages/ai/src/api/openai-codex-responses.ts:854] [E: packages/ai/src/api/openai-codex-responses.ts:857]。

WebSocket cached continuation 保持 `store: false` 的 base body, 并通过 connection-scoped `previous_response_id` state 构造 delta request; 代码旁注说明 ChatGPT Codex Responses 会拒绝 `store: true` [E: packages/ai/src/api/openai-codex-responses.ts:495] [E: packages/ai/src/api/openai-codex-responses.ts:1351] [E: packages/ai/src/api/openai-codex-responses.ts:1353] [E: packages/ai/src/api/openai-codex-responses.ts:1354] [E: packages/ai/src/api/openai-codex-responses.ts:1396] [I]。

## 与普通 OpenAI Responses 的差异

普通 OpenAI Responses 使用 `openai` SDK client 的 `client.responses.create(params, requestOptions).withResponse()`; Codex Responses 不创建 SDK client, 而是直接拼 ChatGPT backend URL、headers、fetch/SSE 和 WebSocket transport [E: packages/ai/src/api/openai-responses.ts:139] [E: packages/ai/src/api/openai-codex-responses.ts:365] [E: packages/ai/src/api/openai-codex-responses.ts:965] [E: packages/ai/src/api/openai-codex-responses.ts:986]。

普通 OpenAI Responses 的 request builder 调用默认 `convertResponsesMessages()` 时可把 system prompt 放进 Responses `input` 的 developer/system role; Codex request builder 调 `convertResponsesMessages(..., { includeSystemPrompt: false })`, 再把 system prompt 放到 top-level `instructions` [E: packages/ai/src/api/openai-responses.ts:236] [E: packages/ai/src/api/openai-responses-shared.ts:132] [E: packages/ai/src/api/openai-responses-shared.ts:136] [E: packages/ai/src/api/openai-codex-responses.ts:488] [E: packages/ai/src/api/openai-codex-responses.ts:489] [E: packages/ai/src/api/openai-codex-responses.ts:497]。

普通 OpenAI Responses 以 `prompt_cache_retention` 表达 long/none cache policy; Codex 固定 `prompt_cache_key` 来自 session id, 没有在 `RequestBody` 和 `buildRequestBody()` 里设置 `prompt_cache_retention` [E: packages/ai/src/api/openai-responses.ts:240] [E: packages/ai/src/api/openai-responses.ts:245] [E: packages/ai/src/api/openai-responses.ts:246] [E: packages/ai/src/api/openai-codex-responses.ts:93] [E: packages/ai/src/api/openai-codex-responses.ts:108] [E: packages/ai/src/api/openai-codex-responses.ts:501] [I]。

普通 OpenAI Responses 的 `OpenAIResponsesOptions.reasoningEffort` 不含 `"none"`, `reasoningSummary` 不含 `"off"`/`"on"`, 也没有 `textVerbosity`; Codex options 增加这些字段以适配 ChatGPT Codex backend [E: packages/ai/src/api/openai-responses.ts:86] [E: packages/ai/src/api/openai-responses.ts:87] [E: packages/ai/src/api/openai-responses.ts:88] [E: packages/ai/src/api/openai-codex-responses.ts:83] [E: packages/ai/src/api/openai-codex-responses.ts:84] [E: packages/ai/src/api/openai-codex-responses.ts:85] [E: packages/ai/src/api/openai-codex-responses.ts:87] [I]。

Codex headers are ChatGPT-specific: base headers extract account id from JWT, set `chatgpt-account-id`, `originator: pi`, and user agent; SSE adds `OpenAI-Beta: responses=experimental`, while WebSocket uses `responses_websockets=2026-02-06` and per-request `session-id`/`x-client-request-id` [E: packages/ai/src/api/openai-codex-responses.ts:1495] [E: packages/ai/src/api/openai-codex-responses.ts:1500] [E: packages/ai/src/api/openai-codex-responses.ts:1529] [E: packages/ai/src/api/openai-codex-responses.ts:1530] [E: packages/ai/src/api/openai-codex-responses.ts:1531] [E: packages/ai/src/api/openai-codex-responses.ts:1545] [E: packages/ai/src/api/openai-codex-responses.ts:1569] [E: packages/ai/src/api/openai-codex-responses.ts:1570] [E: packages/ai/src/api/openai-codex-responses.ts:1571]。

## Gotcha

- Explicit `transport: "auto"` and `transport: "websocket-cached"` both set `useCachedContext`; actual `previous_response_id` delta rewriting still requires a cached entry with compatible continuation state. The default unset transport chooses WebSocket in `stream()`, but does not satisfy `options?.transport === "auto"` inside `processWebSocketStream()` [E: packages/ai/src/api/openai-codex-responses.ts:274] [E: packages/ai/src/api/openai-codex-responses.ts:280] [E: packages/ai/src/api/openai-codex-responses.ts:1339] [E: packages/ai/src/api/openai-codex-responses.ts:1345] [E: packages/ai/src/api/openai-codex-responses.ts:1351] [E: packages/ai/src/api/openai-codex-responses.ts:1353] [E: packages/ai/src/api/openai-codex-responses.ts:1354] [E: packages/ai/src/api/openai-codex-responses.ts:1396] [I]。
- A per-session WebSocket failure activates SSE fallback for later non-SSE requests in that session; `resetOpenAICodexWebSocketDebugStats(sessionId)` also clears the fallback flag for that session [E: packages/ai/src/api/openai-codex-responses.ts:803] [E: packages/ai/src/api/openai-codex-responses.ts:830] [E: packages/ai/src/api/openai-codex-responses.ts:833] [E: packages/ai/src/api/openai-codex-responses.ts:870] [E: packages/ai/src/api/openai-codex-responses.ts:872]。
- `processResponsesStream()` requires a terminal Responses event; `mapCodexEvents()` converts Codex terminal variants into `response.completed`, so malformed streams that end without that terminal event become errors rather than silent success [E: packages/ai/src/api/openai-codex-responses.ts:671] [E: packages/ai/src/api/openai-codex-responses.ts:676] [E: packages/ai/src/api/openai-responses-shared.ts:589] [E: packages/ai/src/api/openai-responses-shared.ts:590]。
- `partialJson` is scratch state for streaming tool arguments; Codex error cleanup deletes it before emitting the final error assistant message [E: packages/ai/src/api/openai-codex-responses.ts:444] [E: packages/ai/src/api/openai-codex-responses.ts:446]。

## 跨包边界

[subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) 应覆盖 `Models.stream`、provider `api` dispatch、`ProviderStreams` 和 lazy loading 的通用路径; 本节点只描述 dispatch 命中 `openai-codex-responses.ts` 后的 Codex wire behavior [E: packages/ai/src/api/openai-codex-responses.ts:223] [I]。

[subsys.ai.session-resources](session-resources.md) 应覆盖 `registerSessionResourceCleanup` / `cleanupSessionResources` registry 语义; 本节点只记录 Codex 将 `closeOpenAICodexWebSocketSessions` 注册为 session cleanup 的事实和它关闭 WebSocket cache 的行为 [E: packages/ai/src/api/openai-codex-responses.ts:840] [E: packages/ai/src/api/openai-codex-responses.ts:857] [I]。

## Sources

- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/utils/deferred-tools.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `model.api` / provider `api` map 如何把统一 stream call 派发到 Codex wire module。
- [subsys.ai.session-resources](session-resources.md): session-scoped cleanup registry 如何被 agent/session 生命周期调用, 以及 Codex WebSocket cache 清理如何挂入其中。
