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
updated: 086c32e745
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

`stream` 是该 wire adapter 的权威入口:它同步返回 `AssistantMessageEventStream`,在内部异步初始化 `AssistantMessage` 输出骨架、client、params、request options,再调用 `client.messages.create({ ...params, stream: true }, requestOptions).asResponse()`。[E: packages/ai/src/api/anthropic-messages.ts:502] [E: packages/ai/src/api/anthropic-messages.ts:507] [E: packages/ai/src/api/anthropic-messages.ts:510] [E: packages/ai/src/api/anthropic-messages.ts:564] [E: packages/ai/src/api/anthropic-messages.ts:569] [E: packages/ai/src/api/anthropic-messages.ts:575]

`AnthropicOptions` 扩展统一 `StreamOptions`,并暴露 Anthropic-specific thinking 开关、thinking budget、adaptive effort、thinking display、interleaved thinking beta、tool choice 和预构造 `Anthropic` client 注入点。[E: packages/ai/src/api/anthropic-messages.ts:203] [E: packages/ai/src/api/anthropic-messages.ts:211] [E: packages/ai/src/api/anthropic-messages.ts:217] [E: packages/ai/src/api/anthropic-messages.ts:230] [E: packages/ai/src/api/anthropic-messages.ts:243] [E: packages/ai/src/api/anthropic-messages.ts:250] [E: packages/ai/src/api/anthropic-messages.ts:256] [E: packages/ai/src/api/anthropic-messages.ts:262]

`streamSimple` 是简化入口:没有 `reasoning` 时显式传 `thinkingEnabled: false`;adaptive thinking model 把统一 reasoning level 映射为 `effort`;非 adaptive thinking model 通过 `adjustMaxTokensForThinking` 和 `clampMaxTokensToContext` 计算 `maxTokens` 与 `thinkingBudgetTokens` 后再调用 `stream`。[E: packages/ai/src/api/anthropic-messages.ts:816] [E: packages/ai/src/api/anthropic-messages.ts:823] [E: packages/ai/src/api/anthropic-messages.ts:825] [E: packages/ai/src/api/anthropic-messages.ts:830] [E: packages/ai/src/api/anthropic-messages.ts:831] [E: packages/ai/src/api/anthropic-messages.ts:834] [E: packages/ai/src/api/anthropic-messages.ts:841] [E: packages/ai/src/api/anthropic-messages.ts:848] [E: packages/ai/src/api/anthropic-messages.ts:850] [E: packages/ai/src/api/anthropic-messages.ts:854]

## 请求构造

`createClient` 分三条 auth/header 路径:GitHub Copilot 使用 bearer `authToken`、Copilot dynamic headers 和 selective beta headers;Anthropic OAuth token 使用 bearer `authToken`、Claude Code beta/identity headers 和 Claude CLI user-agent;普通 API key 或 header-owned auth 走非 OAuth client,`apiKey` 为空时由 headers 承载授权,并可按 compat 和 `sessionId` 注入 `x-session-affinity`。[E: packages/ai/src/api/anthropic-messages.ts:298] [E: packages/ai/src/api/anthropic-messages.ts:301] [E: packages/ai/src/api/anthropic-messages.ts:303] [E: packages/ai/src/api/anthropic-messages.ts:862] [E: packages/ai/src/api/anthropic-messages.ts:883] [E: packages/ai/src/api/anthropic-messages.ts:886] [E: packages/ai/src/api/anthropic-messages.ts:895] [E: packages/ai/src/api/anthropic-messages.ts:898] [E: packages/ai/src/api/anthropic-messages.ts:907] [E: packages/ai/src/api/anthropic-messages.ts:910] [E: packages/ai/src/api/anthropic-messages.ts:919] [E: packages/ai/src/api/anthropic-messages.ts:920] [E: packages/ai/src/api/anthropic-messages.ts:933] [E: packages/ai/src/api/anthropic-messages.ts:946]

`buildParams` 的最小 payload 是 `{ model, messages, max_tokens, stream: true }`,其中 `messages` 来自 `convertMessages`,`max_tokens` 使用 `options.maxTokens` 或 `model.maxTokens`。[E: packages/ai/src/api/anthropic-messages.ts:957] [E: packages/ai/src/api/anthropic-messages.ts:979] [E: packages/ai/src/api/anthropic-messages.ts:980] [E: packages/ai/src/api/anthropic-messages.ts:947] [E: packages/ai/src/api/anthropic-messages.ts:989] [E: packages/ai/src/api/anthropic-messages.ts:990]

OAuth token request 会把 Claude Code identity 作为第一段 `system` text,再追加调用方 system prompt;非 OAuth request 只在存在 `context.systemPrompt` 时设置 `system`。[E: packages/ai/src/api/anthropic-messages.ts:994] [E: packages/ai/src/api/anthropic-messages.ts:998] [E: packages/ai/src/api/anthropic-messages.ts:1002] [E: packages/ai/src/api/anthropic-messages.ts:1005] [E: packages/ai/src/api/anthropic-messages.ts:1009] [E: packages/ai/src/api/anthropic-messages.ts:1014]

temperature 只在调用方提供、未启用 thinking、且 compat 表示支持 temperature 时写入 payload;metadata 只透传 string 型 `metadata.user_id`;`toolChoice` string 会转成 `{ type }`,对象形式原样作为 Anthropic `tool_choice`。[E: packages/ai/src/api/anthropic-messages.ts:1021] [E: packages/ai/src/api/anthropic-messages.ts:1022] [E: packages/ai/src/api/anthropic-messages.ts:1076] [E: packages/ai/src/api/anthropic-messages.ts:1078] [E: packages/ai/src/api/anthropic-messages.ts:1079] [E: packages/ai/src/api/anthropic-messages.ts:1083] [E: packages/ai/src/api/anthropic-messages.ts:1085] [E: packages/ai/src/api/anthropic-messages.ts:1087]

## Message 与 Tool 转换

`convertMessages` 先调用 `transformMessages(messages, model, normalizeToolCallId)`,因此 Anthropic adapter 在 wire serialization 前复用跨 provider 的 message normalization;传入的 `normalizeToolCallId` callback 会把非 `[A-Za-z0-9_-]` 字符替换为 `_`,并截断到 64 字符。[E: packages/ai/src/api/anthropic-messages.ts:1095] [E: packages/ai/src/api/anthropic-messages.ts:1096] [E: packages/ai/src/api/anthropic-messages.ts:1134] [E: packages/ai/src/api/anthropic-messages.ts:965]

user string message 会丢弃空白内容并写成 sanitized string;user block message 会把 text/image blocks 转为 Anthropic `text`/base64 `image` content,过滤空白 text block,并在过滤后没有 block 时跳过该 message。[E: packages/ai/src/api/anthropic-messages.ts:1148] [E: packages/ai/src/api/anthropic-messages.ts:1150] [E: packages/ai/src/api/anthropic-messages.ts:1153] [E: packages/ai/src/api/anthropic-messages.ts:1157] [E: packages/ai/src/api/anthropic-messages.ts:1160] [E: packages/ai/src/api/anthropic-messages.ts:1165] [E: packages/ai/src/api/anthropic-messages.ts:1168] [E: packages/ai/src/api/anthropic-messages.ts:1174] [E: packages/ai/src/api/anthropic-messages.ts:1180]

assistant message 会把非空 text 写为 Anthropic `text`,redacted thinking 写回 `redacted_thinking`,带 signature 的 thinking 写回 `thinking`,缺 signature 的 thinking 默认降级成 plain text,但 `allowEmptySignature` compat 可保留空 signature thinking block。[E: packages/ai/src/api/anthropic-messages.ts:1186] [E: packages/ai/src/api/anthropic-messages.ts:1190] [E: packages/ai/src/api/anthropic-messages.ts:1193] [E: packages/ai/src/api/anthropic-messages.ts:1198] [E: packages/ai/src/api/anthropic-messages.ts:1200] [E: packages/ai/src/api/anthropic-messages.ts:1130] [E: packages/ai/src/api/anthropic-messages.ts:1215] [E: packages/ai/src/api/anthropic-messages.ts:1220] [E: packages/ai/src/api/anthropic-messages.ts:1225] [E: packages/ai/src/api/anthropic-messages.ts:1149]

assistant tool call 写成 Anthropic `tool_use`,OAuth request 会把工具名转换为 Claude Code canonical casing;streaming response 中的 OAuth tool name 会用当前 `context.tools` 反向恢复到本地工具名。[E: packages/ai/src/api/anthropic-messages.ts:1231] [E: packages/ai/src/api/anthropic-messages.ts:1233] [E: packages/ai/src/api/anthropic-messages.ts:1235] [E: packages/ai/src/api/anthropic-messages.ts:1236] [E: packages/ai/src/api/anthropic-messages.ts:630] [E: packages/ai/src/api/anthropic-messages.ts:633] [E: packages/ai/src/api/anthropic-messages.ts:634] [E: packages/ai/src/api/anthropic-messages.ts:635]

连续 `toolResult` messages 会合并为单个 user message 的多个 `tool_result` blocks,每个 block 带 `tool_use_id`、`content` 和 `is_error`;`convertContentBlocks` 在无图像时把 text 拼接成 sanitized string,有图像时生成 text/image block array,纯图像结果会补一个 `"(see attached image)"` text block。[E: packages/ai/src/api/anthropic-messages.ts:1245] [E: packages/ai/src/api/anthropic-messages.ts:1169] [E: packages/ai/src/api/anthropic-messages.ts:1121] [E: packages/ai/src/api/anthropic-messages.ts:1116] [E: packages/ai/src/api/anthropic-messages.ts:1123] [E: packages/ai/src/api/anthropic-messages.ts:1250] [E: packages/ai/src/api/anthropic-messages.ts:1267] [E: packages/ai/src/api/anthropic-messages.ts:1269] [E: packages/ai/src/api/anthropic-messages.ts:118] [E: packages/ai/src/api/anthropic-messages.ts:132] [E: packages/ai/src/api/anthropic-messages.ts:134] [E: packages/ai/src/api/anthropic-messages.ts:138] [E: packages/ai/src/api/anthropic-messages.ts:147] [E: packages/ai/src/api/anthropic-messages.ts:158] [E: packages/ai/src/api/anthropic-messages.ts:160]

启用 `supportsToolReferences` 时，request builder 将 deferred tools 从立即 `tools` 列表拆出；`ToolResultMessage.addedToolNames` 会在对应 `tool_result` 后追加 Anthropic `tool_reference { tool_name }` blocks，并只引用实际存在于 deferred map 的名称 [E: packages/ai/src/api/anthropic-messages.ts:185] [E: packages/ai/src/api/anthropic-messages.ts:969] [E: packages/ai/src/api/anthropic-messages.ts:978] [E: packages/ai/src/api/anthropic-messages.ts:1106] [E: packages/ai/src/api/anthropic-messages.ts:1109] [E: packages/ai/src/api/anthropic-messages.ts:1112] [E: packages/ai/src/api/anthropic-messages.ts:1113]。

`convertTools` 把统一 `Tool` 转为 Anthropic tool schema:名称可按 OAuth canonical casing 改写,description 原样传递,input schema 取 `parameters.properties` 和 `parameters.required`,支持 eager input streaming 的模型会设置 `eager_input_streaming: true`,且只在最后一个 tool 上挂 prompt cache control。[E: packages/ai/src/api/anthropic-messages.ts:1305] [E: packages/ai/src/api/anthropic-messages.ts:1315] [E: packages/ai/src/api/anthropic-messages.ts:1333] [E: packages/ai/src/api/anthropic-messages.ts:1334] [E: packages/ai/src/api/anthropic-messages.ts:1335] [E: packages/ai/src/api/anthropic-messages.ts:1320] [E: packages/ai/src/api/anthropic-messages.ts:1321] [E: packages/ai/src/api/anthropic-messages.ts:1322] [E: packages/ai/src/api/anthropic-messages.ts:1339]

## Streaming Event 转换

`iterateSseMessages` 是本文件内的 SSE decoder:它从 `ReadableStream<Uint8Array>` 读 chunks,用 `TextDecoder` 和 line parser 累积 `event:` / `data:` 字段,遇到空行 flush 为 `ServerSentEvent`,并在 finally 中释放 reader lock。[E: packages/ai/src/api/anthropic-messages.ts:347] [E: packages/ai/src/api/anthropic-messages.ts:349] [E: packages/ai/src/api/anthropic-messages.ts:364] [E: packages/ai/src/api/anthropic-messages.ts:366] [E: packages/ai/src/api/anthropic-messages.ts:402] [E: packages/ai/src/api/anthropic-messages.ts:406] [E: packages/ai/src/api/anthropic-messages.ts:408] [E: packages/ai/src/api/anthropic-messages.ts:417] [E: packages/ai/src/api/anthropic-messages.ts:422] [E: packages/ai/src/api/anthropic-messages.ts:426] [E: packages/ai/src/api/anthropic-messages.ts:457]

`iterateAnthropicEvents` 只放行 Anthropic message event set,遇到 SSE `error` event 直接 throw,JSON parse 失败时把 event name、data 和 raw lines 包进错误;如果看到 `message_start` 但没有看到 `message_stop`,stream 结束后会抛出 `"Anthropic stream ended before message_stop"`。[E: packages/ai/src/api/anthropic-messages.ts:461] [E: packages/ai/src/api/anthropic-messages.ts:472] [E: packages/ai/src/api/anthropic-messages.ts:473] [E: packages/ai/src/api/anthropic-messages.ts:477] [E: packages/ai/src/api/anthropic-messages.ts:482] [E: packages/ai/src/api/anthropic-messages.ts:483] [E: packages/ai/src/api/anthropic-messages.ts:486] [E: packages/ai/src/api/anthropic-messages.ts:491] [E: packages/ai/src/api/anthropic-messages.ts:497] [E: packages/ai/src/api/anthropic-messages.ts:498]

stream 消费端在 response headers hook 后先 push normalized `start`;`message_start` 记录 `responseId`、input/output token 和 cache read/write token 到 `output.usage`。[E: packages/ai/src/api/anthropic-messages.ts:582] [E: packages/ai/src/api/anthropic-messages.ts:583] [E: packages/ai/src/api/anthropic-messages.ts:588] [E: packages/ai/src/api/anthropic-messages.ts:589] [E: packages/ai/src/api/anthropic-messages.ts:590] [E: packages/ai/src/api/anthropic-messages.ts:593] [E: packages/ai/src/api/anthropic-messages.ts:594] [E: packages/ai/src/api/anthropic-messages.ts:595] [E: packages/ai/src/api/anthropic-messages.ts:596]

`content_block_start` 建立 normalized content block:text -> `text_start`,thinking -> `thinking_start`,redacted thinking -> redacted `thinking_start`,tool_use -> `toolcall_start`;tool_use block 同时保存 streaming scratch 字段 `partialJson`。[E: packages/ai/src/api/anthropic-messages.ts:602] [E: packages/ai/src/api/anthropic-messages.ts:603] [E: packages/ai/src/api/anthropic-messages.ts:610] [E: packages/ai/src/api/anthropic-messages.ts:611] [E: packages/ai/src/api/anthropic-messages.ts:619] [E: packages/ai/src/api/anthropic-messages.ts:620] [E: packages/ai/src/api/anthropic-messages.ts:624] [E: packages/ai/src/api/anthropic-messages.ts:629] [E: packages/ai/src/api/anthropic-messages.ts:630] [E: packages/ai/src/api/anthropic-messages.ts:638] [E: packages/ai/src/api/anthropic-messages.ts:642]

`content_block_delta` 追加 text/thinking delta 到对应 block 并 push `text_delta` / `thinking_delta`;`input_json_delta` 追加到 `partialJson`,用 `parseStreamingJson` 更新 tool arguments,并 push `toolcall_delta`;`signature_delta` 只累积 thinking signature,不产生 normalized delta event。[E: packages/ai/src/api/anthropic-messages.ts:644] [E: packages/ai/src/api/anthropic-messages.ts:645] [E: packages/ai/src/api/anthropic-messages.ts:649] [E: packages/ai/src/api/anthropic-messages.ts:650] [E: packages/ai/src/api/anthropic-messages.ts:657] [E: packages/ai/src/api/anthropic-messages.ts:661] [E: packages/ai/src/api/anthropic-messages.ts:662] [E: packages/ai/src/api/anthropic-messages.ts:669] [E: packages/ai/src/api/anthropic-messages.ts:673] [E: packages/ai/src/api/anthropic-messages.ts:674] [E: packages/ai/src/api/anthropic-messages.ts:675] [E: packages/ai/src/api/anthropic-messages.ts:682] [E: packages/ai/src/api/anthropic-messages.ts:687]

`content_block_stop` 删除内部 `index`,再按 block type push `text_end`、`thinking_end` 或 `toolcall_end`;tool call 结束时会重新 parse `partialJson` 为最终 arguments 并删除 scratch buffer。[E: packages/ai/src/api/anthropic-messages.ts:690] [E: packages/ai/src/api/anthropic-messages.ts:691] [E: packages/ai/src/api/anthropic-messages.ts:694] [E: packages/ai/src/api/anthropic-messages.ts:695] [E: packages/ai/src/api/anthropic-messages.ts:696] [E: packages/ai/src/api/anthropic-messages.ts:702] [E: packages/ai/src/api/anthropic-messages.ts:703] [E: packages/ai/src/api/anthropic-messages.ts:709] [E: packages/ai/src/api/anthropic-messages.ts:710] [E: packages/ai/src/api/anthropic-messages.ts:713] [E: packages/ai/src/api/anthropic-messages.ts:714]

## Usage、StopReason 与错误

`message_delta` 用 `mapStopReason` 更新 normalized `stopReason`,并只在 usage 字段非 null 时覆盖 input/output/cache read/cache write fields;省略字段保留已有值是这些 guarded assignment 的结果。[E: packages/ai/src/api/anthropic-messages.ts:722] [E: packages/ai/src/api/anthropic-messages.ts:723] [E: packages/ai/src/api/anthropic-messages.ts:725] [E: packages/ai/src/api/anthropic-messages.ts:726] [E: packages/ai/src/api/anthropic-messages.ts:734] [E: packages/ai/src/api/anthropic-messages.ts:737] [E: packages/ai/src/api/anthropic-messages.ts:740] [E: packages/ai/src/api/anthropic-messages.ts:743] [I]

adapter 用 input + output + cacheRead + cacheWrite 计算 `usage.totalTokens`,并在 `message_start` 和 `message_delta` 两处调用 `calculateCost`;1h cache creation token 会额外写入 `cacheWrite1h`,随后同一个 usage 对象交给 `calculateCost`。[E: packages/ai/src/api/anthropic-messages.ts:597] [E: packages/ai/src/api/anthropic-messages.ts:599] [E: packages/ai/src/api/anthropic-messages.ts:600] [E: packages/ai/src/api/anthropic-messages.ts:601] [E: packages/ai/src/api/anthropic-messages.ts:756] [E: packages/ai/src/api/anthropic-messages.ts:757] [E: packages/ai/src/api/anthropic-messages.ts:758]

`mapStopReason` 把 `end_turn` 映射为 `stop`,`max_tokens` 映射为 `length`,`tool_use` 映射为 `toolUse`,`refusal` 和 `sensitive` 映射为 `error`,`pause_turn` 与 `stop_sequence` 映射为 `stop`;未知 stop reason 会 throw。[E: packages/ai/src/api/anthropic-messages.ts:1344] [E: packages/ai/src/api/anthropic-messages.ts:1349] [E: packages/ai/src/api/anthropic-messages.ts:1351] [E: packages/ai/src/api/anthropic-messages.ts:1353] [E: packages/ai/src/api/anthropic-messages.ts:1355] [E: packages/ai/src/api/anthropic-messages.ts:1358] [E: packages/ai/src/api/anthropic-messages.ts:1360] [E: packages/ai/src/api/anthropic-messages.ts:1362] [E: packages/ai/src/api/anthropic-messages.ts:1364] [E: packages/ai/src/api/anthropic-messages.ts:1368]

正常结束时 `stream` push `done` 并 `end`;如果 abort signal 已触发、normalized stop reason 是 `aborted` / `error`、SSE/parse/request 任一步抛错,catch 会清理所有 content block 的内部 `index` 和 `partialJson`,把 stop reason 设为 `aborted` 或 `error`,push terminal `error` event 并 end。[E: packages/ai/src/api/anthropic-messages.ts:762] [E: packages/ai/src/api/anthropic-messages.ts:763] [E: packages/ai/src/api/anthropic-messages.ts:769] [E: packages/ai/src/api/anthropic-messages.ts:770] [E: packages/ai/src/api/anthropic-messages.ts:773] [E: packages/ai/src/api/anthropic-messages.ts:774] [E: packages/ai/src/api/anthropic-messages.ts:776] [E: packages/ai/src/api/anthropic-messages.ts:779] [E: packages/ai/src/api/anthropic-messages.ts:781] [E: packages/ai/src/api/anthropic-messages.ts:783] [E: packages/ai/src/api/anthropic-messages.ts:784]

## Prompt Caching 交互

Anthropic cache retention 默认来自 `options.cacheRetention`,未传时兼容读取 `PI_CACHE_RETENTION=long`,否则默认为 `"short"`;retention 为 `"none"` 时不返回 `cacheControl`,retention 为 `"long"` 且模型 compat 支持长缓存时生成 `{ type: "ephemeral", ttl: "1h" }`,其他启用场景生成短期 `{ type: "ephemeral" }`。[E: packages/ai/src/api/anthropic-messages.ts:50] [E: packages/ai/src/api/anthropic-messages.ts:51] [E: packages/ai/src/api/anthropic-messages.ts:54] [E: packages/ai/src/api/anthropic-messages.ts:57] [E: packages/ai/src/api/anthropic-messages.ts:60] [E: packages/ai/src/api/anthropic-messages.ts:65] [E: packages/ai/src/api/anthropic-messages.ts:66] [E: packages/ai/src/api/anthropic-messages.ts:69] [E: packages/ai/src/api/anthropic-messages.ts:72]

Anthropic cache control 可挂在 system text block、最后一个 user message block、最后一个 tool definition;如果 cache retention 是 `"none"`,client 创建时也不会把 `sessionId` 转为 session affinity header。[E: packages/ai/src/api/anthropic-messages.ts:999] [E: packages/ai/src/api/anthropic-messages.ts:1006] [E: packages/ai/src/api/anthropic-messages.ts:1015] [E: packages/ai/src/api/anthropic-messages.ts:1275] [E: packages/ai/src/api/anthropic-messages.ts:1277] [E: packages/ai/src/api/anthropic-messages.ts:1284] [E: packages/ai/src/api/anthropic-messages.ts:1291] [E: packages/ai/src/api/anthropic-messages.ts:1339] [E: packages/ai/src/api/anthropic-messages.ts:548] [E: packages/ai/src/api/anthropic-messages.ts:549]

`openai-prompt-cache.ts` 只定义 OpenAI prompt cache key 的 64 字符上限和 `clampOpenAIPromptCacheKey`;在本节点的两个 source 中,Anthropic prompt caching 由 Anthropic `cache_control` block metadata 表达,而 OpenAI helper 不参与 Anthropic request construction。[E: packages/ai/src/api/openai-prompt-cache.ts:1] [E: packages/ai/src/api/openai-prompt-cache.ts:3] [E: packages/ai/src/api/openai-prompt-cache.ts:6] [E: packages/ai/src/api/openai-prompt-cache.ts:7] [I]

## 设计动机与 Gotcha

`getAnthropicCompat` 为 Anthropic-compatible model compat fields 提供默认能力表:默认支持 eager tool input streaming、long cache retention、tool cache control 和 temperature,默认不发送 session affinity headers,默认不允许空 thinking signature。[E: packages/ai/src/api/anthropic-messages.ts:174] [E: packages/ai/src/api/anthropic-messages.ts:178] [E: packages/ai/src/api/anthropic-messages.ts:179] [E: packages/ai/src/api/anthropic-messages.ts:180] [E: packages/ai/src/api/anthropic-messages.ts:181] [E: packages/ai/src/api/anthropic-messages.ts:182] [E: packages/ai/src/api/anthropic-messages.ts:183]

fine-grained tool streaming beta 只在有 tools 且 compat 不支持 eager tool input streaming 时启用;interleaved thinking beta 在调用方允许且 model 不是 force-adaptive thinking 时加入 beta header。[E: packages/ai/src/api/anthropic-messages.ts:1301] [E: packages/ai/src/api/anthropic-messages.ts:1302] [E: packages/ai/src/api/anthropic-messages.ts:873] [E: packages/ai/src/api/anthropic-messages.ts:875] [E: packages/ai/src/api/anthropic-messages.ts:879]

`options.onPayload` 可以替换最终 Anthropic params,`options.onResponse` 可以观察 HTTP status 和 headers;两者使调用方能调试或调整 wire payload/response metadata,但也意味着文档中的 builder 输出可能被 hook 改写。[E: packages/ai/src/api/anthropic-messages.ts:564] [E: packages/ai/src/api/anthropic-messages.ts:565] [E: packages/ai/src/api/anthropic-messages.ts:567] [E: packages/ai/src/api/anthropic-messages.ts:582] [I]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api === "anthropic-messages"` 如何进入本文件的 `stream` / `streamSimple`;本节点只展开进入 Anthropic wire adapter 之后的 payload 与 event conversion。
- [subsys.ai.prompt-caching](prompt-caching.md) - prompt caching 的跨 API 策略归档节点;本节点只覆盖 Anthropic `cache_control` 与 `openai-prompt-cache.ts` 的边界。

## 本轮 stream 状态与 fetch 变化

Accumulator 现在从 `stopReason: "pending"` 开始；收到 `message_delta` 时同时保存 Anthropic `stop_reason` 到 `rawStopReason` 再映射 unified reason，流结束时若仍为 pending 或 error 都进入 terminal error path。[E: packages/ai/src/api/anthropic-messages.ts:510] [E: packages/ai/src/api/anthropic-messages.ts:524] [E: packages/ai/src/api/anthropic-messages.ts:722] [E: packages/ai/src/api/anthropic-messages.ts:723] [E: packages/ai/src/api/anthropic-messages.ts:728] [E: packages/ai/src/api/anthropic-messages.ts:766] [E: packages/ai/src/api/anthropic-messages.ts:773]

`content_block_start` 不再丢掉 provider 在首帧携带的初始 text/thinking/signature；custom fetch 则透过 client factory 注入 Anthropic SDK。[E: packages/ai/src/api/anthropic-messages.ts:602] [E: packages/ai/src/api/anthropic-messages.ts:619] [E: packages/ai/src/api/anthropic-messages.ts:868] [E: packages/ai/src/api/anthropic-messages.ts:889]

## Sources

- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-prompt-cache.ts
- packages/ai/src/utils/deferred-tools.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - provider/API dispatch 如何选择 `anthropic-messages` implementation。
- [subsys.ai.prompt-caching](prompt-caching.md) - Anthropic cache control 与 OpenAI prompt cache key helper 在全局缓存策略中的位置。
