---
id: subsys.ai.anthropic-messages
title: Anthropic Messages 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/anthropic-messages.ts
  - packages/ai/src/api/openai-prompt-cache.ts
  - packages/ai/src/utils/deferred-tools.ts
  - packages/ai/src/utils/pi-user-agent.ts
  - packages/ai/src/types.ts
symbols:
  - stream
  - AnthropicOptions
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.prompt-caching
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.ai.anthropic-messages` 描述 `pi-ai` 的 Anthropic Messages wire adapter:它把统一 `Context` / `Message` / `Tool` 输入构造成 Anthropic `messages.create(...stream: true)` payload,再把 Anthropic SSE events 归一为 `AssistantMessageEventStream`。

## 能回答的问题

- `stream` 入口如何创建 Anthropic SDK client、构造 request params、发起 streaming request?
- `AnthropicOptions` 支持哪些 thinking、tool choice、client 注入和 request hook?
- 用户消息、assistant thinking、tool call、tool result 如何转成 Anthropic Messages payload?
- Anthropic `content_block_*` / `message_delta` 事件如何映射成 normalized text/thinking/toolcall/usage/stopReason?
- Anthropic prompt caching 与 OpenAI prompt cache key helper 的边界在哪里?
- adapter 如何处理 OAuth/Claude Code identity、Copilot headers、abort、SSE parse error 和 unknown stop reason?

## 职责边界

`stream` 是该 wire adapter 的权威入口:它同步返回 `AssistantMessageEventStream`,在内部异步初始化 `AssistantMessage` 输出骨架、client、params、request options,再调用 `client.messages.create({ ...params, stream: true }, requestOptions).asResponse()`。[E: packages/ai/src/api/anthropic-messages.ts:502] [E: packages/ai/src/api/anthropic-messages.ts:507] [E: packages/ai/src/api/anthropic-messages.ts:511] [E: packages/ai/src/api/anthropic-messages.ts:566] [E: packages/ai/src/api/anthropic-messages.ts:571] [E: packages/ai/src/api/anthropic-messages.ts:577]

`AnthropicOptions` 扩展统一 `StreamOptions`,并暴露 Anthropic-specific thinking 开关、thinking budget、adaptive effort、thinking display、interleaved thinking beta、tool choice 和预构造 `Anthropic` client 注入点。[E: packages/ai/src/api/anthropic-messages.ts:221] [E: packages/ai/src/api/anthropic-messages.ts:227] [E: packages/ai/src/api/anthropic-messages.ts:240] [E: packages/ai/src/api/anthropic-messages.ts:253] [E: packages/ai/src/api/anthropic-messages.ts:260] [E: packages/ai/src/api/anthropic-messages.ts:266] [E: packages/ai/src/api/anthropic-messages.ts:272] [E: packages/ai/src/api/anthropic-messages.ts:272]

`streamSimple` 是简化入口:没有 `reasoning` 时显式传 `thinkingEnabled: false`;adaptive thinking model 把统一 reasoning level 映射为 `effort`;非 adaptive thinking model 通过 `adjustMaxTokensForThinking` 和 `clampMaxTokensToContext` 计算 `maxTokens` 与 `thinkingBudgetTokens` 后再调用 `stream`。[E: packages/ai/src/api/anthropic-messages.ts:846] [E: packages/ai/src/api/anthropic-messages.ts:854] [E: packages/ai/src/api/anthropic-messages.ts:860] [E: packages/ai/src/api/anthropic-messages.ts:866] [E: packages/ai/src/api/anthropic-messages.ts:871] [E: packages/ai/src/api/anthropic-messages.ts:877] [E: packages/ai/src/api/anthropic-messages.ts:884] [E: packages/ai/src/api/anthropic-messages.ts:890]

## 请求构造

`createClient` 分三条 auth/header 路径:GitHub Copilot 使用 bearer `authToken`、Copilot dynamic headers 和 selective beta headers;Anthropic OAuth token 使用 bearer `authToken`、Claude Code beta/identity headers 和 Claude CLI user-agent;普通 API key 或 header-owned auth 走非 OAuth client,`apiKey` 为空时由 headers 承载授权,并可按 compat 和已转发的 `sessionId` 注入 session-affinity header。[E: packages/ai/src/api/anthropic-messages.ts:298] [E: packages/ai/src/api/anthropic-messages.ts:301] [E: packages/ai/src/api/anthropic-messages.ts:303] [E: packages/ai/src/api/anthropic-messages.ts:898] [E: packages/ai/src/api/anthropic-messages.ts:907] [E: packages/ai/src/api/anthropic-messages.ts:910] [E: packages/ai/src/api/anthropic-messages.ts:917] [E: packages/ai/src/api/anthropic-messages.ts:920] [E: packages/ai/src/api/anthropic-messages.ts:929] [E: packages/ai/src/api/anthropic-messages.ts:932] [E: packages/ai/src/api/anthropic-messages.ts:939] [E: packages/ai/src/api/anthropic-messages.ts:940] [E: packages/ai/src/api/anthropic-messages.ts:954] [E: packages/ai/src/api/anthropic-messages.ts:968]

`getAnthropicCompat` 在 `provider === "openrouter"` 或 `baseUrl` 含 `openrouter.ai` 时默认 `sendSessionAffinityHeaders: true` 且 `sessionAffinityFormat: "openrouter"`；非 OpenRouter 默认不发 session-affinity header。`cacheRetention === "none"` 时 `cacheSessionId` 为 `undefined`，因此不会把 `sessionId` 传给 `createClient`。[E: packages/ai/src/api/anthropic-messages.ts:185] [E: packages/ai/src/api/anthropic-messages.ts:189] [E: packages/ai/src/api/anthropic-messages.ts:190] [E: packages/ai/src/api/anthropic-messages.ts:552] [E: packages/ai/src/api/anthropic-messages.ts:553] [E: packages/ai/src/api/anthropic-messages.ts:561]

普通 API key 路径在存在 session id 且 `compat.sendSessionAffinityHeaders` 时写 header：`sessionAffinityFormat === "openrouter"` 用 `x-session-id`，否则用 `x-session-affinity`。[E: packages/ai/src/api/anthropic-messages.ts:954] [E: packages/ai/src/api/anthropic-messages.ts:955] [E: packages/ai/src/api/anthropic-messages.ts:956]

`mergeClientHeaders()` 默认先写 `User-Agent: getPiUserAgent()`，再 overlay 各路径 headers；OAuth 路径随后用 `user-agent: claude-cli/${claudeCodeVersion}` 覆盖默认 Pi UA [E: packages/ai/src/api/anthropic-messages.ts:286] [E: packages/ai/src/api/anthropic-messages.ts:289] [E: packages/ai/src/api/anthropic-messages.ts:936] [E: packages/ai/src/api/anthropic-messages.ts:940] [E: packages/ai/src/utils/pi-user-agent.ts:17]。`model.compat.allowedFallbackModels` 非空时启用 `server-side-fallback-2026-07-01` beta，并把 fallback id 写入 `params.fallbacks` [E: packages/ai/src/api/anthropic-messages.ts:176] [E: packages/ai/src/api/anthropic-messages.ts:180] [E: packages/ai/src/api/anthropic-messages.ts:556] [E: packages/ai/src/api/anthropic-messages.ts:1170] [E: packages/ai/src/api/anthropic-messages.ts:1172] [E: packages/ai/src/types.ts:725]。

`buildParams` 的最小 payload 是 `{ model, messages, max_tokens, stream: true }`,其中 `messages` 来自 `convertMessages`,`max_tokens` 使用 `options.maxTokens` 或 `model.maxTokens`。[E: packages/ai/src/api/anthropic-messages.ts:1021] [E: packages/ai/src/api/anthropic-messages.ts:1043] [E: packages/ai/src/api/anthropic-messages.ts:1055] [E: packages/ai/src/api/anthropic-messages.ts:1056] [E: packages/ai/src/api/anthropic-messages.ts:1061] [E: packages/ai/src/api/anthropic-messages.ts:1061]

OAuth token request 会把 Claude Code identity 作为第一段 `system` text,再追加调用方 system prompt;非 OAuth request 只在存在 `context.systemPrompt` 时设置 `system`。[E: packages/ai/src/api/anthropic-messages.ts:1066] [E: packages/ai/src/api/anthropic-messages.ts:1070] [E: packages/ai/src/api/anthropic-messages.ts:1074] [E: packages/ai/src/api/anthropic-messages.ts:1077] [E: packages/ai/src/api/anthropic-messages.ts:1081] [E: packages/ai/src/api/anthropic-messages.ts:1086]

temperature 只在调用方提供、未启用 thinking、且 compat 表示支持 temperature 时写入 payload;metadata 只透传 string 型 `metadata.user_id`;`toolChoice` string 会转成 `{ type }`,对象形式原样作为 Anthropic `tool_choice`。[E: packages/ai/src/api/anthropic-messages.ts:1094] [E: packages/ai/src/api/anthropic-messages.ts:1099] [E: packages/ai/src/api/anthropic-messages.ts:1155] [E: packages/ai/src/api/anthropic-messages.ts:1157] [E: packages/ai/src/api/anthropic-messages.ts:1158] [E: packages/ai/src/api/anthropic-messages.ts:1162] [E: packages/ai/src/api/anthropic-messages.ts:1164] [E: packages/ai/src/api/anthropic-messages.ts:1166]

## Message 与 Tool 转换

`convertMessages` 先调用 `transformMessages(messages, model, normalizeToolCallId)`,因此 Anthropic adapter 在 wire serialization 前复用跨 provider 的 message normalization;传入的 `normalizeToolCallId` callback 会把非 `[A-Za-z0-9_-]` 字符替换为 `_`,并截断到 64 字符。[E: packages/ai/src/api/anthropic-messages.ts:1180] [E: packages/ai/src/api/anthropic-messages.ts:1179] [E: packages/ai/src/api/anthropic-messages.ts:1223] [E: packages/ai/src/api/anthropic-messages.ts:1029]

user string message 会丢弃空白内容并写成 sanitized string;user block message 会把 text/image blocks 转为 Anthropic `text`/base64 `image` content,过滤空白 text block,并在过滤后没有 block 时跳过该 message。[E: packages/ai/src/api/anthropic-messages.ts:1240] [E: packages/ai/src/api/anthropic-messages.ts:1241] [E: packages/ai/src/api/anthropic-messages.ts:1244] [E: packages/ai/src/api/anthropic-messages.ts:1248] [E: packages/ai/src/api/anthropic-messages.ts:1251] [E: packages/ai/src/api/anthropic-messages.ts:1256] [E: packages/ai/src/api/anthropic-messages.ts:1259] [E: packages/ai/src/api/anthropic-messages.ts:1265] [E: packages/ai/src/api/anthropic-messages.ts:1271]

assistant message 会把非空 text 写为 Anthropic `text`,redacted thinking 写回 `redacted_thinking`,带 signature 的 thinking 写回 `thinking`,缺 signature 的 thinking 默认降级成 plain text,但 `allowEmptySignature` compat 可保留空 signature thinking block。[E: packages/ai/src/api/anthropic-messages.ts:1277] [E: packages/ai/src/api/anthropic-messages.ts:1281] [E: packages/ai/src/api/anthropic-messages.ts:1284] [E: packages/ai/src/api/anthropic-messages.ts:1289] [E: packages/ai/src/api/anthropic-messages.ts:1291] [E: packages/ai/src/api/anthropic-messages.ts:1214] [E: packages/ai/src/api/anthropic-messages.ts:1306] [E: packages/ai/src/api/anthropic-messages.ts:1311] [E: packages/ai/src/api/anthropic-messages.ts:1316] [E: packages/ai/src/api/anthropic-messages.ts:1239]

assistant tool call 写成 Anthropic `tool_use`,OAuth request 会把工具名转换为 Claude Code canonical casing;streaming response 中的 OAuth tool name 会用当前 `context.tools` 反向恢复到本地工具名。[E: packages/ai/src/api/anthropic-messages.ts:1322] [E: packages/ai/src/api/anthropic-messages.ts:1324] [E: packages/ai/src/api/anthropic-messages.ts:1326] [E: packages/ai/src/api/anthropic-messages.ts:1327] [E: packages/ai/src/api/anthropic-messages.ts:648] [E: packages/ai/src/api/anthropic-messages.ts:651] [E: packages/ai/src/api/anthropic-messages.ts:652] [E: packages/ai/src/api/anthropic-messages.ts:653]

连续 `toolResult` messages 会合并为单个 user message 的多个 `tool_result` blocks,每个 block 带 `tool_use_id`、`content` 和 `is_error`;`convertContentBlocks` 在无图像时把 text 拼接成 sanitized string,有图像时生成 text/image block array,纯图像结果会补一个 `"(see attached image)"` text block。[E: packages/ai/src/api/anthropic-messages.ts:1345] [E: packages/ai/src/api/anthropic-messages.ts:1260] [E: packages/ai/src/api/anthropic-messages.ts:1205] [E: packages/ai/src/api/anthropic-messages.ts:1200] [E: packages/ai/src/api/anthropic-messages.ts:1207] [E: packages/ai/src/api/anthropic-messages.ts:1350] [E: packages/ai/src/api/anthropic-messages.ts:1367] [E: packages/ai/src/api/anthropic-messages.ts:1369] [E: packages/ai/src/api/anthropic-messages.ts:121] [E: packages/ai/src/api/anthropic-messages.ts:135] [E: packages/ai/src/api/anthropic-messages.ts:137] [E: packages/ai/src/api/anthropic-messages.ts:141] [E: packages/ai/src/api/anthropic-messages.ts:150] [E: packages/ai/src/api/anthropic-messages.ts:161] [E: packages/ai/src/api/anthropic-messages.ts:163]

启用 `supportsToolReferences` 时，request builder 将 deferred tools 从立即 `tools` 列表拆出；`convertToolResult` 只引用仍在 deferred set 且尚未 loaded 的 `addedToolNames`。有 `tool_reference` 时它们**替换**该 `tool_result.content`(不能与普通 text/image 混放)，被置换的原 content 进入 `siblingContent`；同一 user message 先写完所有 `tool_result`，再把全部 sibling 接到后面。[E: packages/ai/src/api/anthropic-messages.ts:204] [E: packages/ai/src/api/anthropic-messages.ts:1033] [E: packages/ai/src/api/anthropic-messages.ts:1042] [E: packages/ai/src/api/anthropic-messages.ts:1190] [E: packages/ai/src/api/anthropic-messages.ts:1193] [E: packages/ai/src/api/anthropic-messages.ts:1206] [E: packages/ai/src/api/anthropic-messages.ts:1206] [E: packages/ai/src/api/anthropic-messages.ts:1209] [E: packages/ai/src/api/anthropic-messages.ts:1367] [E: packages/ai/src/api/anthropic-messages.ts:1369]。

`convertTools` 把统一 `Tool` 转为 Anthropic tool schema:名称可按 OAuth canonical casing 改写,description 原样传递,input schema 取 `parameters.properties` 和 `parameters.required`,支持 eager input streaming 的模型会设置 `eager_input_streaming: true`,且只在最后一个 tool 上挂 prompt cache control。[E: packages/ai/src/api/anthropic-messages.ts:1425] [E: packages/ai/src/api/anthropic-messages.ts:1435] [E: packages/ai/src/api/anthropic-messages.ts:1453] [E: packages/ai/src/api/anthropic-messages.ts:1454] [E: packages/ai/src/api/anthropic-messages.ts:1455] [E: packages/ai/src/api/anthropic-messages.ts:1440] [E: packages/ai/src/api/anthropic-messages.ts:1441] [E: packages/ai/src/api/anthropic-messages.ts:1442] [E: packages/ai/src/api/anthropic-messages.ts:1459]

## Streaming Event 转换

`iterateSseMessages` 是本文件内的 SSE decoder:它从 `ReadableStream<Uint8Array>` 读 chunks,用 `TextDecoder` 和 line parser 累积 `event:` / `data:` 字段,遇到空行 flush 为 `ServerSentEvent`,并在 finally 中释放 reader lock。[E: packages/ai/src/api/anthropic-messages.ts:347] [E: packages/ai/src/api/anthropic-messages.ts:349] [E: packages/ai/src/api/anthropic-messages.ts:364] [E: packages/ai/src/api/anthropic-messages.ts:370] [E: packages/ai/src/api/anthropic-messages.ts:402] [E: packages/ai/src/api/anthropic-messages.ts:406] [E: packages/ai/src/api/anthropic-messages.ts:408] [E: packages/ai/src/api/anthropic-messages.ts:417] [E: packages/ai/src/api/anthropic-messages.ts:422] [E: packages/ai/src/api/anthropic-messages.ts:426] [E: packages/ai/src/api/anthropic-messages.ts:461]

`iterateAnthropicEvents` 只放行 Anthropic message event set,遇到 SSE `error` event 直接 throw,JSON parse 失败时把 event name、data 和 raw lines 包进错误;如果看到 `message_start` 但没有看到 `message_stop`,stream 结束后会抛出 `"Anthropic stream ended before message_stop"`。[E: packages/ai/src/api/anthropic-messages.ts:461] [E: packages/ai/src/api/anthropic-messages.ts:472] [E: packages/ai/src/api/anthropic-messages.ts:477] [E: packages/ai/src/api/anthropic-messages.ts:481] [E: packages/ai/src/api/anthropic-messages.ts:482] [E: packages/ai/src/api/anthropic-messages.ts:483] [E: packages/ai/src/api/anthropic-messages.ts:486] [E: packages/ai/src/api/anthropic-messages.ts:491] [E: packages/ai/src/api/anthropic-messages.ts:497] [E: packages/ai/src/api/anthropic-messages.ts:502]

stream 消费端在 response headers hook 后先 push normalized `start`;`message_start` 记录 `responseId`、input/output token 和 cache read/write token 到 `output.usage`。[E: packages/ai/src/api/anthropic-messages.ts:584] [E: packages/ai/src/api/anthropic-messages.ts:585] [E: packages/ai/src/api/anthropic-messages.ts:590] [E: packages/ai/src/api/anthropic-messages.ts:591] [E: packages/ai/src/api/anthropic-messages.ts:592] [E: packages/ai/src/api/anthropic-messages.ts:605] [E: packages/ai/src/api/anthropic-messages.ts:606] [E: packages/ai/src/api/anthropic-messages.ts:608] [E: packages/ai/src/api/anthropic-messages.ts:611]

`content_block_start` 建立 normalized content block:text -> `text_start`,thinking -> `thinking_start`,redacted thinking -> redacted `thinking_start`,tool_use -> `toolcall_start`;tool_use block 同时保存 streaming scratch 字段 `partialJson`。[E: packages/ai/src/api/anthropic-messages.ts:614] [E: packages/ai/src/api/anthropic-messages.ts:621] [E: packages/ai/src/api/anthropic-messages.ts:628] [E: packages/ai/src/api/anthropic-messages.ts:629] [E: packages/ai/src/api/anthropic-messages.ts:637] [E: packages/ai/src/api/anthropic-messages.ts:638] [E: packages/ai/src/api/anthropic-messages.ts:642] [E: packages/ai/src/api/anthropic-messages.ts:647] [E: packages/ai/src/api/anthropic-messages.ts:648] [E: packages/ai/src/api/anthropic-messages.ts:656] [E: packages/ai/src/api/anthropic-messages.ts:660]

`content_block_delta` 追加 text/thinking delta 到对应 block 并 push `text_delta` / `thinking_delta`;`input_json_delta` 追加到 `partialJson`,用 `parseStreamingJson` 更新 tool arguments,并 push `toolcall_delta`;`signature_delta` 只累积 thinking signature,不产生 normalized delta event。[E: packages/ai/src/api/anthropic-messages.ts:662] [E: packages/ai/src/api/anthropic-messages.ts:663] [E: packages/ai/src/api/anthropic-messages.ts:667] [E: packages/ai/src/api/anthropic-messages.ts:668] [E: packages/ai/src/api/anthropic-messages.ts:675] [E: packages/ai/src/api/anthropic-messages.ts:679] [E: packages/ai/src/api/anthropic-messages.ts:680] [E: packages/ai/src/api/anthropic-messages.ts:687] [E: packages/ai/src/api/anthropic-messages.ts:691] [E: packages/ai/src/api/anthropic-messages.ts:692] [E: packages/ai/src/api/anthropic-messages.ts:693] [E: packages/ai/src/api/anthropic-messages.ts:700] [E: packages/ai/src/api/anthropic-messages.ts:705]

`content_block_stop` 删除内部 `index`,再按 block type push `text_end`、`thinking_end` 或 `toolcall_end`;tool call 结束时会重新 parse `partialJson` 为最终 arguments 并删除 scratch buffer。[E: packages/ai/src/api/anthropic-messages.ts:708] [E: packages/ai/src/api/anthropic-messages.ts:709] [E: packages/ai/src/api/anthropic-messages.ts:712] [E: packages/ai/src/api/anthropic-messages.ts:713] [E: packages/ai/src/api/anthropic-messages.ts:714] [E: packages/ai/src/api/anthropic-messages.ts:720] [E: packages/ai/src/api/anthropic-messages.ts:721] [E: packages/ai/src/api/anthropic-messages.ts:728] [E: packages/ai/src/api/anthropic-messages.ts:731] [E: packages/ai/src/api/anthropic-messages.ts:731] [E: packages/ai/src/api/anthropic-messages.ts:732]

## Usage、StopReason 与错误

`message_delta` 用 `mapStopReason` 更新 normalized `stopReason`,并只在 usage 字段非 null 时覆盖 input/output/cache read/cache write fields;省略字段保留已有值是这些 guarded assignment 的结果。[E: packages/ai/src/api/anthropic-messages.ts:740] [E: packages/ai/src/api/anthropic-messages.ts:743] [E: packages/ai/src/api/anthropic-messages.ts:745] [E: packages/ai/src/api/anthropic-messages.ts:746] [E: packages/ai/src/api/anthropic-messages.ts:754] [E: packages/ai/src/api/anthropic-messages.ts:757] [E: packages/ai/src/api/anthropic-messages.ts:760] [E: packages/ai/src/api/anthropic-messages.ts:767] [I]

`message_start` 把 `event.message.model` 写回 `output.model`。若返回 model 与请求 id 不同，adapter 在 `allowedFallbackModels` 里找同 provider 的 cost，构造 `usageModel = { ...model, id: output.model, cost: fallbackCost }`，再在 `message_start` / `message_delta` 用 **returned model** 计价 [E: packages/ai/src/api/anthropic-messages.ts:533] [E: packages/ai/src/api/anthropic-messages.ts:595] [E: packages/ai/src/api/anthropic-messages.ts:602] [E: packages/ai/src/api/anthropic-messages.ts:613] [E: packages/ai/src/api/anthropic-messages.ts:779]。adapter 用 input + output + cacheRead + cacheWrite 计算 `usage.totalTokens`;1h cache creation token 会额外写入 `cacheWrite1h`。[E: packages/ai/src/api/anthropic-messages.ts:609] [E: packages/ai/src/api/anthropic-messages.ts:611] [E: packages/ai/src/api/anthropic-messages.ts:612]

`mapStopReason` 把 `end_turn` 映射为 `stop`,`max_tokens` 映射为 `length`,`tool_use` 映射为 `toolUse`,`refusal` 和 `sensitive` 映射为 `error`,`pause_turn` 与 `stop_sequence` 映射为 `stop`;未知 stop reason 会 throw。[E: packages/ai/src/api/anthropic-messages.ts:1464] [E: packages/ai/src/api/anthropic-messages.ts:1469] [E: packages/ai/src/api/anthropic-messages.ts:1471] [E: packages/ai/src/api/anthropic-messages.ts:1473] [E: packages/ai/src/api/anthropic-messages.ts:1475] [E: packages/ai/src/api/anthropic-messages.ts:1478] [E: packages/ai/src/api/anthropic-messages.ts:1480] [E: packages/ai/src/api/anthropic-messages.ts:1482] [E: packages/ai/src/api/anthropic-messages.ts:1484] [E: packages/ai/src/api/anthropic-messages.ts:1488]

正常结束时 `stream` push `done` 并 `end`;如果 abort signal 已触发、normalized stop reason 是 `aborted` / `error`、SSE/parse/request 任一步抛错,catch 会清理所有 content block 的内部 `index` 和 `partialJson`,把 stop reason 设为 `aborted` 或 `error`,push terminal `error` event 并 end。[E: packages/ai/src/api/anthropic-messages.ts:780] [E: packages/ai/src/api/anthropic-messages.ts:783] [E: packages/ai/src/api/anthropic-messages.ts:786] [E: packages/ai/src/api/anthropic-messages.ts:787] [E: packages/ai/src/api/anthropic-messages.ts:803] [E: packages/ai/src/api/anthropic-messages.ts:804] [E: packages/ai/src/api/anthropic-messages.ts:806] [E: packages/ai/src/api/anthropic-messages.ts:809] [E: packages/ai/src/api/anthropic-messages.ts:811] [E: packages/ai/src/api/anthropic-messages.ts:813] [E: packages/ai/src/api/anthropic-messages.ts:818]

## Prompt Caching 交互

Anthropic cache retention 默认来自 `options.cacheRetention`,未传时兼容读取 `PI_CACHE_RETENTION=long`,否则默认为 `"short"`;retention 为 `"none"` 时不返回 `cacheControl`,retention 为 `"long"` 且模型 compat 支持长缓存时生成 `{ type: "ephemeral", ttl: "1h" }`,其他启用场景生成短期 `{ type: "ephemeral" }`。[E: packages/ai/src/api/anthropic-messages.ts:53] [E: packages/ai/src/api/anthropic-messages.ts:54] [E: packages/ai/src/api/anthropic-messages.ts:57] [E: packages/ai/src/api/anthropic-messages.ts:60] [E: packages/ai/src/api/anthropic-messages.ts:63] [E: packages/ai/src/api/anthropic-messages.ts:68] [E: packages/ai/src/api/anthropic-messages.ts:69] [E: packages/ai/src/api/anthropic-messages.ts:72] [E: packages/ai/src/api/anthropic-messages.ts:75]

Anthropic cache control 可挂在 system text block、最后一个 user message block、最后一个 tool definition;如果 cache retention 是 `"none"`,client 创建时也不会把 `sessionId` 转为 session affinity header（含 OpenRouter 的 `x-session-id`）。[E: packages/ai/src/api/anthropic-messages.ts:1071] [E: packages/ai/src/api/anthropic-messages.ts:1078] [E: packages/ai/src/api/anthropic-messages.ts:1087] [E: packages/ai/src/api/anthropic-messages.ts:1375] [E: packages/ai/src/api/anthropic-messages.ts:1377] [E: packages/ai/src/api/anthropic-messages.ts:1384] [E: packages/ai/src/api/anthropic-messages.ts:1391] [E: packages/ai/src/api/anthropic-messages.ts:1459] [E: packages/ai/src/api/anthropic-messages.ts:553] [E: packages/ai/src/api/anthropic-messages.ts:561]

`openai-prompt-cache.ts` 只定义 OpenAI prompt cache key 的 64 字符上限和 `clampOpenAIPromptCacheKey`;在本节点的两个 source 中,Anthropic prompt caching 由 Anthropic `cache_control` block metadata 表达,而 OpenAI helper 不参与 Anthropic request construction。[E: packages/ai/src/api/openai-prompt-cache.ts:1] [E: packages/ai/src/api/openai-prompt-cache.ts:3] [E: packages/ai/src/api/openai-prompt-cache.ts:6] [E: packages/ai/src/api/openai-prompt-cache.ts:7] [I]

## 设计动机与 Gotcha

`getAnthropicCompat` 为 Anthropic-compatible model compat fields 提供默认能力表:默认支持 eager tool input streaming、long cache retention、tool cache control 和 temperature,默认不允许空 thinking signature。session affinity 默认跟 OpenRouter 走:`isOpenRouter` 时发 header 且 format 为 `"openrouter"`，否则不发。[E: packages/ai/src/api/anthropic-messages.ts:185] [E: packages/ai/src/api/anthropic-messages.ts:187] [E: packages/ai/src/api/anthropic-messages.ts:188] [E: packages/ai/src/api/anthropic-messages.ts:189] [E: packages/ai/src/api/anthropic-messages.ts:190] [E: packages/ai/src/api/anthropic-messages.ts:187] [E: packages/ai/src/api/anthropic-messages.ts:188] [E: packages/ai/src/api/anthropic-messages.ts:193]

fine-grained tool streaming beta 只在有 tools 且 compat 不支持 eager tool input streaming 时启用;interleaved thinking beta 在调用方允许且 model 不是 force-adaptive thinking 时加入 beta header。[E: packages/ai/src/api/anthropic-messages.ts:1422] [E: packages/ai/src/api/anthropic-messages.ts:1421] [E: packages/ai/src/api/anthropic-messages.ts:912] [E: packages/ai/src/api/anthropic-messages.ts:907] [E: packages/ai/src/api/anthropic-messages.ts:907]

`options.onPayload` 可以替换最终 Anthropic params,`options.onResponse` 可以观察 HTTP status 和 headers;两者使调用方能调试或调整 wire payload/response metadata,但也意味着文档中的 builder 输出可能被 hook 改写。[E: packages/ai/src/api/anthropic-messages.ts:566] [E: packages/ai/src/api/anthropic-messages.ts:567] [E: packages/ai/src/api/anthropic-messages.ts:569] [E: packages/ai/src/api/anthropic-messages.ts:584] [I]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api === "anthropic-messages"` 如何进入本文件的 `stream` / `streamSimple`;本节点只展开进入 Anthropic wire adapter 之后的 payload 与 event conversion。
- [subsys.ai.prompt-caching](prompt-caching.md) - prompt caching 的跨 API 策略归档节点;本节点只覆盖 Anthropic `cache_control` 与 `openai-prompt-cache.ts` 的边界。

## 本轮 stream 状态与 fetch 变化

Accumulator 现在从 `stopReason: "pending"` 开始；收到 `message_delta` 时同时保存 Anthropic `stop_reason` 到 `rawStopReason` 再映射 unified reason，流结束时若仍为 pending 或 error 都进入 terminal error path。[E: packages/ai/src/api/anthropic-messages.ts:511] [E: packages/ai/src/api/anthropic-messages.ts:530] [E: packages/ai/src/api/anthropic-messages.ts:740] [E: packages/ai/src/api/anthropic-messages.ts:743] [E: packages/ai/src/api/anthropic-messages.ts:753] [E: packages/ai/src/api/anthropic-messages.ts:783] [E: packages/ai/src/api/anthropic-messages.ts:803]

`content_block_start` 不再丢掉 provider 在首帧携带的初始 text/thinking/signature；custom fetch 则透过 client factory 注入 Anthropic SDK。[E: packages/ai/src/api/anthropic-messages.ts:614] [E: packages/ai/src/api/anthropic-messages.ts:637] [E: packages/ai/src/api/anthropic-messages.ts:902] [E: packages/ai/src/api/anthropic-messages.ts:913]

## Sources

- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-prompt-cache.ts
- packages/ai/src/utils/deferred-tools.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/src/types.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - provider/API dispatch 如何选择 `anthropic-messages` implementation。
- [subsys.ai.prompt-caching](prompt-caching.md) - Anthropic cache control 与 OpenAI prompt cache key helper 在全局缓存策略中的位置。
