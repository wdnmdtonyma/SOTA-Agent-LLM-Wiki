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
symbols:
  - stream
  - AnthropicOptions
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.prompt-caching
evidence: explicit
status: verified
updated: 305c014dcc
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

`stream` 是该 wire adapter 的权威入口:它同步返回 `AssistantMessageEventStream`,在内部异步初始化 `AssistantMessage` 输出骨架、client、params、request options,再调用 `client.messages.create({ ...params, stream: true }, requestOptions).asResponse()`。[E: packages/ai/src/api/anthropic-messages.ts:487] [E: packages/ai/src/api/anthropic-messages.ts:492] [E: packages/ai/src/api/anthropic-messages.ts:495] [E: packages/ai/src/api/anthropic-messages.ts:549] [E: packages/ai/src/api/anthropic-messages.ts:554] [E: packages/ai/src/api/anthropic-messages.ts:560]

`AnthropicOptions` 扩展统一 `StreamOptions`,并暴露 Anthropic-specific thinking 开关、thinking budget、adaptive effort、thinking display、interleaved thinking beta、tool choice 和预构造 `Anthropic` client 注入点。[E: packages/ai/src/api/anthropic-messages.ts:202] [E: packages/ai/src/api/anthropic-messages.ts:210] [E: packages/ai/src/api/anthropic-messages.ts:216] [E: packages/ai/src/api/anthropic-messages.ts:229] [E: packages/ai/src/api/anthropic-messages.ts:242] [E: packages/ai/src/api/anthropic-messages.ts:249] [E: packages/ai/src/api/anthropic-messages.ts:255] [E: packages/ai/src/api/anthropic-messages.ts:261]

`streamSimple` 是简化入口:没有 `reasoning` 时显式传 `thinkingEnabled: false`;adaptive thinking model 把统一 reasoning level 映射为 `effort`;非 adaptive thinking model 通过 `adjustMaxTokensForThinking` 和 `clampMaxTokensToContext` 计算 `maxTokens` 与 `thinkingBudgetTokens` 后再调用 `stream`。[E: packages/ai/src/api/anthropic-messages.ts:801] [E: packages/ai/src/api/anthropic-messages.ts:808] [E: packages/ai/src/api/anthropic-messages.ts:810] [E: packages/ai/src/api/anthropic-messages.ts:815] [E: packages/ai/src/api/anthropic-messages.ts:816] [E: packages/ai/src/api/anthropic-messages.ts:819] [E: packages/ai/src/api/anthropic-messages.ts:826] [E: packages/ai/src/api/anthropic-messages.ts:833] [E: packages/ai/src/api/anthropic-messages.ts:835] [E: packages/ai/src/api/anthropic-messages.ts:839]

## 请求构造

`createClient` 分三条 auth/header 路径:GitHub Copilot 使用 bearer `authToken`、Copilot dynamic headers 和 selective beta headers;Anthropic OAuth token 使用 bearer `authToken`、Claude Code beta/identity headers 和 Claude CLI user-agent;普通 API key 或 header-owned auth 走非 OAuth client,`apiKey` 为空时由 headers 承载授权,并可按 compat 和 `sessionId` 注入 `x-session-affinity`。[E: packages/ai/src/api/anthropic-messages.ts:283] [E: packages/ai/src/api/anthropic-messages.ts:286] [E: packages/ai/src/api/anthropic-messages.ts:288] [E: packages/ai/src/api/anthropic-messages.ts:847] [E: packages/ai/src/api/anthropic-messages.ts:868] [E: packages/ai/src/api/anthropic-messages.ts:871] [E: packages/ai/src/api/anthropic-messages.ts:879] [E: packages/ai/src/api/anthropic-messages.ts:882] [E: packages/ai/src/api/anthropic-messages.ts:891] [E: packages/ai/src/api/anthropic-messages.ts:894] [E: packages/ai/src/api/anthropic-messages.ts:902] [E: packages/ai/src/api/anthropic-messages.ts:903] [E: packages/ai/src/api/anthropic-messages.ts:916] [E: packages/ai/src/api/anthropic-messages.ts:928]

`buildParams` 的最小 payload 是 `{ model, messages, max_tokens, stream: true }`,其中 `messages` 来自 `convertMessages`,`max_tokens` 使用 `options.maxTokens` 或 `model.maxTokens`。[E: packages/ai/src/api/anthropic-messages.ts:939] [E: packages/ai/src/api/anthropic-messages.ts:961] [E: packages/ai/src/api/anthropic-messages.ts:962] [E: packages/ai/src/api/anthropic-messages.ts:929] [E: packages/ai/src/api/anthropic-messages.ts:971] [E: packages/ai/src/api/anthropic-messages.ts:972]

OAuth token request 会把 Claude Code identity 作为第一段 `system` text,再追加调用方 system prompt;非 OAuth request 只在存在 `context.systemPrompt` 时设置 `system`。[E: packages/ai/src/api/anthropic-messages.ts:976] [E: packages/ai/src/api/anthropic-messages.ts:980] [E: packages/ai/src/api/anthropic-messages.ts:984] [E: packages/ai/src/api/anthropic-messages.ts:987] [E: packages/ai/src/api/anthropic-messages.ts:991] [E: packages/ai/src/api/anthropic-messages.ts:996]

temperature 只在调用方提供、未启用 thinking、且 compat 表示支持 temperature 时写入 payload;metadata 只透传 string 型 `metadata.user_id`;`toolChoice` string 会转成 `{ type }`,对象形式原样作为 Anthropic `tool_choice`。[E: packages/ai/src/api/anthropic-messages.ts:1003] [E: packages/ai/src/api/anthropic-messages.ts:1004] [E: packages/ai/src/api/anthropic-messages.ts:1058] [E: packages/ai/src/api/anthropic-messages.ts:1060] [E: packages/ai/src/api/anthropic-messages.ts:1061] [E: packages/ai/src/api/anthropic-messages.ts:1065] [E: packages/ai/src/api/anthropic-messages.ts:1067] [E: packages/ai/src/api/anthropic-messages.ts:1069]

## Message 与 Tool 转换

`convertMessages` 先调用 `transformMessages(messages, model, normalizeToolCallId)`,因此 Anthropic adapter 在 wire serialization 前复用跨 provider 的 message normalization;传入的 `normalizeToolCallId` callback 会把非 `[A-Za-z0-9_-]` 字符替换为 `_`,并截断到 64 字符。[E: packages/ai/src/api/anthropic-messages.ts:1077] [E: packages/ai/src/api/anthropic-messages.ts:1078] [E: packages/ai/src/api/anthropic-messages.ts:1116] [E: packages/ai/src/api/anthropic-messages.ts:947]

user string message 会丢弃空白内容并写成 sanitized string;user block message 会把 text/image blocks 转为 Anthropic `text`/base64 `image` content,过滤空白 text block,并在过滤后没有 block 时跳过该 message。[E: packages/ai/src/api/anthropic-messages.ts:1130] [E: packages/ai/src/api/anthropic-messages.ts:1132] [E: packages/ai/src/api/anthropic-messages.ts:1135] [E: packages/ai/src/api/anthropic-messages.ts:1139] [E: packages/ai/src/api/anthropic-messages.ts:1142] [E: packages/ai/src/api/anthropic-messages.ts:1147] [E: packages/ai/src/api/anthropic-messages.ts:1150] [E: packages/ai/src/api/anthropic-messages.ts:1156] [E: packages/ai/src/api/anthropic-messages.ts:1162]

assistant message 会把非空 text 写为 Anthropic `text`,redacted thinking 写回 `redacted_thinking`,带 signature 的 thinking 写回 `thinking`,缺 signature 的 thinking 默认降级成 plain text,但 `allowEmptySignature` compat 可保留空 signature thinking block。[E: packages/ai/src/api/anthropic-messages.ts:1168] [E: packages/ai/src/api/anthropic-messages.ts:1172] [E: packages/ai/src/api/anthropic-messages.ts:1175] [E: packages/ai/src/api/anthropic-messages.ts:1180] [E: packages/ai/src/api/anthropic-messages.ts:1182] [E: packages/ai/src/api/anthropic-messages.ts:1112] [E: packages/ai/src/api/anthropic-messages.ts:1197] [E: packages/ai/src/api/anthropic-messages.ts:1202] [E: packages/ai/src/api/anthropic-messages.ts:1207] [E: packages/ai/src/api/anthropic-messages.ts:1131]

assistant tool call 写成 Anthropic `tool_use`,OAuth request 会把工具名转换为 Claude Code canonical casing;streaming response 中的 OAuth tool name 会用当前 `context.tools` 反向恢复到本地工具名。[E: packages/ai/src/api/anthropic-messages.ts:1213] [E: packages/ai/src/api/anthropic-messages.ts:1215] [E: packages/ai/src/api/anthropic-messages.ts:1217] [E: packages/ai/src/api/anthropic-messages.ts:1218] [E: packages/ai/src/api/anthropic-messages.ts:615] [E: packages/ai/src/api/anthropic-messages.ts:618] [E: packages/ai/src/api/anthropic-messages.ts:619] [E: packages/ai/src/api/anthropic-messages.ts:620]

连续 `toolResult` messages 会合并为单个 user message 的多个 `tool_result` blocks,每个 block 带 `tool_use_id`、`content` 和 `is_error`;`convertContentBlocks` 在无图像时把 text 拼接成 sanitized string,有图像时生成 text/image block array,纯图像结果会补一个 `"(see attached image)"` text block。[E: packages/ai/src/api/anthropic-messages.ts:1227] [E: packages/ai/src/api/anthropic-messages.ts:1151] [E: packages/ai/src/api/anthropic-messages.ts:1103] [E: packages/ai/src/api/anthropic-messages.ts:1098] [E: packages/ai/src/api/anthropic-messages.ts:1105] [E: packages/ai/src/api/anthropic-messages.ts:1232] [E: packages/ai/src/api/anthropic-messages.ts:1249] [E: packages/ai/src/api/anthropic-messages.ts:1251] [E: packages/ai/src/api/anthropic-messages.ts:117] [E: packages/ai/src/api/anthropic-messages.ts:131] [E: packages/ai/src/api/anthropic-messages.ts:133] [E: packages/ai/src/api/anthropic-messages.ts:137] [E: packages/ai/src/api/anthropic-messages.ts:146] [E: packages/ai/src/api/anthropic-messages.ts:157] [E: packages/ai/src/api/anthropic-messages.ts:159]

启用 `supportsToolReferences` 时，request builder 将 deferred tools 从立即 `tools` 列表拆出；`ToolResultMessage.addedToolNames` 会在对应 `tool_result` 后追加 Anthropic `tool_reference { tool_name }` blocks，并只引用实际存在于 deferred map 的名称 [E: packages/ai/src/api/anthropic-messages.ts:184] [E: packages/ai/src/api/anthropic-messages.ts:951] [E: packages/ai/src/api/anthropic-messages.ts:960] [E: packages/ai/src/api/anthropic-messages.ts:1088] [E: packages/ai/src/api/anthropic-messages.ts:1091] [E: packages/ai/src/api/anthropic-messages.ts:1094] [E: packages/ai/src/api/anthropic-messages.ts:1095]。

`convertTools` 把统一 `Tool` 转为 Anthropic tool schema:名称可按 OAuth canonical casing 改写,description 原样传递,input schema 取 `parameters.properties` 和 `parameters.required`,支持 eager input streaming 的模型会设置 `eager_input_streaming: true`,且只在最后一个 tool 上挂 prompt cache control。[E: packages/ai/src/api/anthropic-messages.ts:1287] [E: packages/ai/src/api/anthropic-messages.ts:1297] [E: packages/ai/src/api/anthropic-messages.ts:1314] [E: packages/ai/src/api/anthropic-messages.ts:1315] [E: packages/ai/src/api/anthropic-messages.ts:1316] [E: packages/ai/src/api/anthropic-messages.ts:1301] [E: packages/ai/src/api/anthropic-messages.ts:1302] [E: packages/ai/src/api/anthropic-messages.ts:1303] [E: packages/ai/src/api/anthropic-messages.ts:1320]

## Streaming Event 转换

`iterateSseMessages` 是本文件内的 SSE decoder:它从 `ReadableStream<Uint8Array>` 读 chunks,用 `TextDecoder` 和 line parser 累积 `event:` / `data:` 字段,遇到空行 flush 为 `ServerSentEvent`,并在 finally 中释放 reader lock。[E: packages/ai/src/api/anthropic-messages.ts:332] [E: packages/ai/src/api/anthropic-messages.ts:334] [E: packages/ai/src/api/anthropic-messages.ts:349] [E: packages/ai/src/api/anthropic-messages.ts:351] [E: packages/ai/src/api/anthropic-messages.ts:387] [E: packages/ai/src/api/anthropic-messages.ts:391] [E: packages/ai/src/api/anthropic-messages.ts:393] [E: packages/ai/src/api/anthropic-messages.ts:402] [E: packages/ai/src/api/anthropic-messages.ts:407] [E: packages/ai/src/api/anthropic-messages.ts:411] [E: packages/ai/src/api/anthropic-messages.ts:442]

`iterateAnthropicEvents` 只放行 Anthropic message event set,遇到 SSE `error` event 直接 throw,JSON parse 失败时把 event name、data 和 raw lines 包进错误;如果看到 `message_start` 但没有看到 `message_stop`,stream 结束后会抛出 `"Anthropic stream ended before message_stop"`。[E: packages/ai/src/api/anthropic-messages.ts:446] [E: packages/ai/src/api/anthropic-messages.ts:457] [E: packages/ai/src/api/anthropic-messages.ts:458] [E: packages/ai/src/api/anthropic-messages.ts:462] [E: packages/ai/src/api/anthropic-messages.ts:467] [E: packages/ai/src/api/anthropic-messages.ts:468] [E: packages/ai/src/api/anthropic-messages.ts:471] [E: packages/ai/src/api/anthropic-messages.ts:476] [E: packages/ai/src/api/anthropic-messages.ts:482] [E: packages/ai/src/api/anthropic-messages.ts:483]

stream 消费端在 response headers hook 后先 push normalized `start`;`message_start` 记录 `responseId`、input/output token 和 cache read/write token 到 `output.usage`。[E: packages/ai/src/api/anthropic-messages.ts:567] [E: packages/ai/src/api/anthropic-messages.ts:568] [E: packages/ai/src/api/anthropic-messages.ts:573] [E: packages/ai/src/api/anthropic-messages.ts:574] [E: packages/ai/src/api/anthropic-messages.ts:575] [E: packages/ai/src/api/anthropic-messages.ts:578] [E: packages/ai/src/api/anthropic-messages.ts:579] [E: packages/ai/src/api/anthropic-messages.ts:580] [E: packages/ai/src/api/anthropic-messages.ts:581]

`content_block_start` 建立 normalized content block:text -> `text_start`,thinking -> `thinking_start`,redacted thinking -> redacted `thinking_start`,tool_use -> `toolcall_start`;tool_use block 同时保存 streaming scratch 字段 `partialJson`。[E: packages/ai/src/api/anthropic-messages.ts:587] [E: packages/ai/src/api/anthropic-messages.ts:588] [E: packages/ai/src/api/anthropic-messages.ts:595] [E: packages/ai/src/api/anthropic-messages.ts:596] [E: packages/ai/src/api/anthropic-messages.ts:604] [E: packages/ai/src/api/anthropic-messages.ts:605] [E: packages/ai/src/api/anthropic-messages.ts:609] [E: packages/ai/src/api/anthropic-messages.ts:614] [E: packages/ai/src/api/anthropic-messages.ts:615] [E: packages/ai/src/api/anthropic-messages.ts:623] [E: packages/ai/src/api/anthropic-messages.ts:627]

`content_block_delta` 追加 text/thinking delta 到对应 block 并 push `text_delta` / `thinking_delta`;`input_json_delta` 追加到 `partialJson`,用 `parseStreamingJson` 更新 tool arguments,并 push `toolcall_delta`;`signature_delta` 只累积 thinking signature,不产生 normalized delta event。[E: packages/ai/src/api/anthropic-messages.ts:629] [E: packages/ai/src/api/anthropic-messages.ts:630] [E: packages/ai/src/api/anthropic-messages.ts:634] [E: packages/ai/src/api/anthropic-messages.ts:635] [E: packages/ai/src/api/anthropic-messages.ts:642] [E: packages/ai/src/api/anthropic-messages.ts:646] [E: packages/ai/src/api/anthropic-messages.ts:647] [E: packages/ai/src/api/anthropic-messages.ts:654] [E: packages/ai/src/api/anthropic-messages.ts:658] [E: packages/ai/src/api/anthropic-messages.ts:659] [E: packages/ai/src/api/anthropic-messages.ts:660] [E: packages/ai/src/api/anthropic-messages.ts:667] [E: packages/ai/src/api/anthropic-messages.ts:672]

`content_block_stop` 删除内部 `index`,再按 block type push `text_end`、`thinking_end` 或 `toolcall_end`;tool call 结束时会重新 parse `partialJson` 为最终 arguments 并删除 scratch buffer。[E: packages/ai/src/api/anthropic-messages.ts:675] [E: packages/ai/src/api/anthropic-messages.ts:676] [E: packages/ai/src/api/anthropic-messages.ts:679] [E: packages/ai/src/api/anthropic-messages.ts:680] [E: packages/ai/src/api/anthropic-messages.ts:681] [E: packages/ai/src/api/anthropic-messages.ts:687] [E: packages/ai/src/api/anthropic-messages.ts:688] [E: packages/ai/src/api/anthropic-messages.ts:694] [E: packages/ai/src/api/anthropic-messages.ts:695] [E: packages/ai/src/api/anthropic-messages.ts:698] [E: packages/ai/src/api/anthropic-messages.ts:699]

## Usage、StopReason 与错误

`message_delta` 用 `mapStopReason` 更新 normalized `stopReason`,并只在 usage 字段非 null 时覆盖 input/output/cache read/cache write fields;省略字段保留已有值是这些 guarded assignment 的结果。[E: packages/ai/src/api/anthropic-messages.ts:707] [E: packages/ai/src/api/anthropic-messages.ts:708] [E: packages/ai/src/api/anthropic-messages.ts:710] [E: packages/ai/src/api/anthropic-messages.ts:711] [E: packages/ai/src/api/anthropic-messages.ts:719] [E: packages/ai/src/api/anthropic-messages.ts:722] [E: packages/ai/src/api/anthropic-messages.ts:725] [E: packages/ai/src/api/anthropic-messages.ts:728] [I]

adapter 用 input + output + cacheRead + cacheWrite 计算 `usage.totalTokens`,并在 `message_start` 和 `message_delta` 两处调用 `calculateCost`;1h cache creation token 会额外写入 `cacheWrite1h`,随后同一个 usage 对象交给 `calculateCost`。[E: packages/ai/src/api/anthropic-messages.ts:582] [E: packages/ai/src/api/anthropic-messages.ts:584] [E: packages/ai/src/api/anthropic-messages.ts:585] [E: packages/ai/src/api/anthropic-messages.ts:586] [E: packages/ai/src/api/anthropic-messages.ts:741] [E: packages/ai/src/api/anthropic-messages.ts:742] [E: packages/ai/src/api/anthropic-messages.ts:743]

`mapStopReason` 把 `end_turn` 映射为 `stop`,`max_tokens` 映射为 `length`,`tool_use` 映射为 `toolUse`,`refusal` 和 `sensitive` 映射为 `error`,`pause_turn` 与 `stop_sequence` 映射为 `stop`;未知 stop reason 会 throw。[E: packages/ai/src/api/anthropic-messages.ts:1325] [E: packages/ai/src/api/anthropic-messages.ts:1330] [E: packages/ai/src/api/anthropic-messages.ts:1332] [E: packages/ai/src/api/anthropic-messages.ts:1334] [E: packages/ai/src/api/anthropic-messages.ts:1336] [E: packages/ai/src/api/anthropic-messages.ts:1339] [E: packages/ai/src/api/anthropic-messages.ts:1341] [E: packages/ai/src/api/anthropic-messages.ts:1343] [E: packages/ai/src/api/anthropic-messages.ts:1345] [E: packages/ai/src/api/anthropic-messages.ts:1349]

正常结束时 `stream` push `done` 并 `end`;如果 abort signal 已触发、normalized stop reason 是 `aborted` / `error`、SSE/parse/request 任一步抛错,catch 会清理所有 content block 的内部 `index` 和 `partialJson`,把 stop reason 设为 `aborted` 或 `error`,push terminal `error` event 并 end。[E: packages/ai/src/api/anthropic-messages.ts:747] [E: packages/ai/src/api/anthropic-messages.ts:748] [E: packages/ai/src/api/anthropic-messages.ts:754] [E: packages/ai/src/api/anthropic-messages.ts:755] [E: packages/ai/src/api/anthropic-messages.ts:758] [E: packages/ai/src/api/anthropic-messages.ts:759] [E: packages/ai/src/api/anthropic-messages.ts:761] [E: packages/ai/src/api/anthropic-messages.ts:764] [E: packages/ai/src/api/anthropic-messages.ts:766] [E: packages/ai/src/api/anthropic-messages.ts:768] [E: packages/ai/src/api/anthropic-messages.ts:769]

## Prompt Caching 交互

Anthropic cache retention 默认来自 `options.cacheRetention`,未传时兼容读取 `PI_CACHE_RETENTION=long`,否则默认为 `"short"`;retention 为 `"none"` 时不返回 `cacheControl`,retention 为 `"long"` 且模型 compat 支持长缓存时生成 `{ type: "ephemeral", ttl: "1h" }`,其他启用场景生成短期 `{ type: "ephemeral" }`。[E: packages/ai/src/api/anthropic-messages.ts:49] [E: packages/ai/src/api/anthropic-messages.ts:50] [E: packages/ai/src/api/anthropic-messages.ts:53] [E: packages/ai/src/api/anthropic-messages.ts:56] [E: packages/ai/src/api/anthropic-messages.ts:59] [E: packages/ai/src/api/anthropic-messages.ts:64] [E: packages/ai/src/api/anthropic-messages.ts:65] [E: packages/ai/src/api/anthropic-messages.ts:68] [E: packages/ai/src/api/anthropic-messages.ts:71]

Anthropic cache control 可挂在 system text block、最后一个 user message block、最后一个 tool definition;如果 cache retention 是 `"none"`,client 创建时也不会把 `sessionId` 转为 session affinity header。[E: packages/ai/src/api/anthropic-messages.ts:981] [E: packages/ai/src/api/anthropic-messages.ts:988] [E: packages/ai/src/api/anthropic-messages.ts:997] [E: packages/ai/src/api/anthropic-messages.ts:1257] [E: packages/ai/src/api/anthropic-messages.ts:1259] [E: packages/ai/src/api/anthropic-messages.ts:1266] [E: packages/ai/src/api/anthropic-messages.ts:1273] [E: packages/ai/src/api/anthropic-messages.ts:1320] [E: packages/ai/src/api/anthropic-messages.ts:533] [E: packages/ai/src/api/anthropic-messages.ts:534]

`openai-prompt-cache.ts` 只定义 OpenAI prompt cache key 的 64 字符上限和 `clampOpenAIPromptCacheKey`;在本节点的两个 source 中,Anthropic prompt caching 由 Anthropic `cache_control` block metadata 表达,而 OpenAI helper 不参与 Anthropic request construction。[E: packages/ai/src/api/openai-prompt-cache.ts:1] [E: packages/ai/src/api/openai-prompt-cache.ts:3] [E: packages/ai/src/api/openai-prompt-cache.ts:6] [E: packages/ai/src/api/openai-prompt-cache.ts:7] [I]

## 设计动机与 Gotcha

`getAnthropicCompat` 为 Anthropic-compatible model compat fields 提供默认能力表:默认支持 eager tool input streaming、long cache retention、tool cache control 和 temperature,默认不发送 session affinity headers,默认不允许空 thinking signature。[E: packages/ai/src/api/anthropic-messages.ts:173] [E: packages/ai/src/api/anthropic-messages.ts:177] [E: packages/ai/src/api/anthropic-messages.ts:178] [E: packages/ai/src/api/anthropic-messages.ts:179] [E: packages/ai/src/api/anthropic-messages.ts:180] [E: packages/ai/src/api/anthropic-messages.ts:181] [E: packages/ai/src/api/anthropic-messages.ts:182]

fine-grained tool streaming beta 只在有 tools 且 compat 不支持 eager tool input streaming 时启用;interleaved thinking beta 在调用方允许且 model 不是 force-adaptive thinking 时加入 beta header。[E: packages/ai/src/api/anthropic-messages.ts:1283] [E: packages/ai/src/api/anthropic-messages.ts:1284] [E: packages/ai/src/api/anthropic-messages.ts:858] [E: packages/ai/src/api/anthropic-messages.ts:860] [E: packages/ai/src/api/anthropic-messages.ts:864]

`options.onPayload` 可以替换最终 Anthropic params,`options.onResponse` 可以观察 HTTP status 和 headers;两者使调用方能调试或调整 wire payload/response metadata,但也意味着文档中的 builder 输出可能被 hook 改写。[E: packages/ai/src/api/anthropic-messages.ts:549] [E: packages/ai/src/api/anthropic-messages.ts:550] [E: packages/ai/src/api/anthropic-messages.ts:552] [E: packages/ai/src/api/anthropic-messages.ts:567] [I]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api === "anthropic-messages"` 如何进入本文件的 `stream` / `streamSimple`;本节点只展开进入 Anthropic wire adapter 之后的 payload 与 event conversion。
- [subsys.ai.prompt-caching](prompt-caching.md) - prompt caching 的跨 API 策略归档节点;本节点只覆盖 Anthropic `cache_control` 与 `openai-prompt-cache.ts` 的边界。

## 本轮 stream 状态与 fetch 变化

Accumulator 现在从 `stopReason: "pending"` 开始；收到 `message_delta` 时同时保存 Anthropic `stop_reason` 到 `rawStopReason` 再映射 unified reason，流结束时若仍为 pending 或 error 都进入 terminal error path。[E: packages/ai/src/api/anthropic-messages.ts:495] [E: packages/ai/src/api/anthropic-messages.ts:509] [E: packages/ai/src/api/anthropic-messages.ts:707] [E: packages/ai/src/api/anthropic-messages.ts:708] [E: packages/ai/src/api/anthropic-messages.ts:713] [E: packages/ai/src/api/anthropic-messages.ts:751] [E: packages/ai/src/api/anthropic-messages.ts:758]

`content_block_start` 不再丢掉 provider 在首帧携带的初始 text/thinking/signature；custom fetch 则透过 client factory 注入 Anthropic SDK。[E: packages/ai/src/api/anthropic-messages.ts:587] [E: packages/ai/src/api/anthropic-messages.ts:604] [E: packages/ai/src/api/anthropic-messages.ts:853] [E: packages/ai/src/api/anthropic-messages.ts:874]

## Sources

- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-prompt-cache.ts
- packages/ai/src/utils/deferred-tools.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - provider/API dispatch 如何选择 `anthropic-messages` implementation。
- [subsys.ai.prompt-caching](prompt-caching.md) - Anthropic cache control 与 OpenAI prompt cache key helper 在全局缓存策略中的位置。
