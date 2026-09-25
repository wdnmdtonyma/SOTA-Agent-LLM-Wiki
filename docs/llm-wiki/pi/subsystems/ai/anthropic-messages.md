---
id: subsys.ai.anthropic-messages
title: Anthropic Messages 协议
kind: subsystem
tier: T2
pkg: ai
source:
 - packages/ai/src/api/anthropic-messages.ts
 - packages/ai/src/api/openai-prompt-cache.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/utils/pi-user-agent.ts
 - packages/ai/src/types.ts
 - packages/ai/src/providers/fireworks.ts
 - packages/ai/src/api/openai-responses-shared.ts
 - packages/ai/scripts/generate-models.ts
 - packages/ai/test/transcript-tool-changes.test.ts
symbols:
 - stream
 - AnthropicOptions
 - getCurrentTools
 - resolveTranscript
related:
 - subsys.ai.wire-protocol-dispatch
 - subsys.ai.prompt-caching
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.anthropic-messages` 描述 `pi-ai` 的 Anthropic Messages wire adapter:它把统一 `TranscriptContext` / `Message` / `Tool` 输入构造成 Anthropic `messages.create(...stream: true)` payload,再把 Anthropic SSE events 归一为 `AssistantMessageEventStream`。已删除的 `packages/ai/src/utils/deferred-tools.ts` 不再参与本 adapter。

## 能回答的问题

- `stream` 入口如何创建 Anthropic SDK client、构造 request params、发起 streaming request?
- `AnthropicOptions` 支持哪些 thinking、tool choice、client 注入和 request hook?
- 用户消息、assistant thinking、tool call、tool result 如何转成 Anthropic Messages payload?
- Anthropic native `defer_loading` / `tool_addition` / `tool_removal` 与 catalog `supportsMidConvoToolChanges` 怎样配合?
- Fireworks Messages 为什么仍走本 adapter,而 prefix deferral 的 `tool_search` 不在这里?
- Anthropic `content_block_*` / `message_delta` 事件如何映射成 normalized text/thinking/toolcall/usage/stopReason?
- adapter 如何处理 OAuth/Claude Code identity、Copilot headers、abort、SSE parse error 和 unknown stop reason?

## 职责边界

`stream` 是该 wire adapter 的权威入口:签名接收 `TranscriptContext`(不是带 `systemPrompt`/`tools` 字段的 `Context`),同步返回 `AssistantMessageEventStream`。内部先 `resolveTranscript(context, supportsMidConvoSystemMessages)`,再用 `getCurrentTools(normalizedContext.messages)` 取当前工具集。[E: packages/ai/src/api/anthropic-messages.ts:511] [E: packages/ai/src/api/anthropic-messages.ts:513] [E: packages/ai/src/api/anthropic-messages.ts:517] [E: packages/ai/src/api/anthropic-messages.ts:518] [E: packages/ai/src/types.ts:711]

`AnthropicOptions` 扩展统一 `StreamOptions`,并暴露 Anthropic-specific thinking 开关、thinking budget、adaptive effort、thinking display、interleaved thinking beta、tool choice 和预构造 `Anthropic` client 注入点。[E: packages/ai/src/api/anthropic-messages.ts:230] [E: packages/ai/src/api/anthropic-messages.ts:236] [E: packages/ai/src/api/anthropic-messages.ts:249] [E: packages/ai/src/api/anthropic-messages.ts:262] [E: packages/ai/src/api/anthropic-messages.ts:269] [E: packages/ai/src/api/anthropic-messages.ts:275] [E: packages/ai/src/api/anthropic-messages.ts:281]

`streamSimple` 是简化入口:没有 `reasoning` 时显式传 `thinkingEnabled: false`;`forceAdaptiveThinking` 把统一 reasoning level 映射为 `effort`;非 adaptive thinking model 通过 `adjustMaxTokensForThinking` 和 `clampMaxTokensToContext` 计算 `maxTokens` 与 `thinkingBudgetTokens` 后再调用 `stream`。[E: packages/ai/src/api/anthropic-messages.ts:866] [E: packages/ai/src/api/anthropic-messages.ts:877] [E: packages/ai/src/api/anthropic-messages.ts:886] [E: packages/ai/src/api/anthropic-messages.ts:888] [E: packages/ai/src/api/anthropic-messages.ts:897] [E: packages/ai/src/api/anthropic-messages.ts:904] [E: packages/ai/src/api/anthropic-messages.ts:906]

## 请求构造

`createClient` 分三条 auth/header 路径:GitHub Copilot 使用 bearer `authToken`、Copilot dynamic headers 和 selective beta headers;Anthropic OAuth token 使用 bearer `authToken`、Claude Code beta/identity headers 和 Claude CLI user-agent;普通 API key 或 header-owned auth 走非 OAuth client,`apiKey` 为空时由 headers 承载授权,并可按 compat 和已转发的 `sessionId` 注入 session-affinity header。[E: packages/ai/src/api/anthropic-messages.ts:918] [E: packages/ai/src/api/anthropic-messages.ts:927] [E: packages/ai/src/api/anthropic-messages.ts:930] [E: packages/ai/src/api/anthropic-messages.ts:949] [E: packages/ai/src/api/anthropic-messages.ts:972] [E: packages/ai/src/api/anthropic-messages.ts:974]

`getAnthropicCompat` 在 `provider === "openrouter"` 或 `baseUrl` 含 `openrouter.ai` 时默认 `sendSessionAffinityHeaders: true` 且 `sessionAffinityFormat: "openrouter"`；非 OpenRouter 默认不发 session-affinity header。`cacheRetention === "none"` 时 `cacheSessionId` 为 `undefined`，因此不会把 `sessionId` 传给 `createClient`。compat 还默认 `supportsMidConvoSystemMessages` / `supportsMidConvoToolChanges` 为 false,由 catalog 对官方 Anthropic 模型打开。[E: packages/ai/src/api/anthropic-messages.ts:206] [E: packages/ai/src/api/anthropic-messages.ts:207] [E: packages/ai/src/api/anthropic-messages.ts:211] [E: packages/ai/src/api/anthropic-messages.ts:212] [E: packages/ai/src/api/anthropic-messages.ts:217] [E: packages/ai/src/api/anthropic-messages.ts:218] [E: packages/ai/src/types.ts:912]

普通 API key 路径在存在 session id 且 `compat.sendSessionAffinityHeaders` 时写 header：`sessionAffinityFormat === "openrouter"` 用 `x-session-id`，否则用 `x-session-affinity`。[E: packages/ai/src/api/anthropic-messages.ts:974] [E: packages/ai/src/api/anthropic-messages.ts:975] [E: packages/ai/src/api/anthropic-messages.ts:976]

`mergeClientHeaders()` 默认先写 `User-Agent: getPiUserAgent()`，再 overlay 各路径 headers；OAuth 路径随后用 `user-agent: claude-cli/${claudeCodeVersion}` 覆盖默认 Pi UA。[E: packages/ai/src/api/anthropic-messages.ts:294] [E: packages/ai/src/api/anthropic-messages.ts:295] [E: packages/ai/src/api/anthropic-messages.ts:960] [E: packages/ai/src/utils/pi-user-agent.ts:17] `model.compat.allowedFallbackModels` 非空时启用 `server-side-fallback-2026-07-01` beta，并把 fallback id 写入 `params.fallbacks`。[E: packages/ai/src/api/anthropic-messages.ts:183] [E: packages/ai/src/api/anthropic-messages.ts:202] [E: packages/ai/src/api/anthropic-messages.ts:1035] [E: packages/ai/src/api/anthropic-messages.ts:1208] [E: packages/ai/src/types.ts:919]

`buildParams` 的最小 payload 是 `{ model, messages, max_tokens, stream: true }`,其中 conversation messages 来自 `convertMessages`,`max_tokens` 使用 `options.maxTokens` 或 `model.maxTokens`。leading system prompt 不再读 `context.systemPrompt`,而是 `getInitialSystemMessage(context.messages)` 再 `getSystemMessageText`。[E: packages/ai/src/api/anthropic-messages.ts:1043] [E: packages/ai/src/api/anthropic-messages.ts:1051] [E: packages/ai/src/api/anthropic-messages.ts:1052] [E: packages/ai/src/api/anthropic-messages.ts:1074] [E: packages/ai/src/api/anthropic-messages.ts:1080]

OAuth token request 会把 Claude Code identity 作为第一段 `system` text,再追加 initial system text;非 OAuth request 只在存在 initial system text 时设置 `system`。[E: packages/ai/src/api/anthropic-messages.ts:1086] [E: packages/ai/src/api/anthropic-messages.ts:1090] [E: packages/ai/src/api/anthropic-messages.ts:1094] [E: packages/ai/src/api/anthropic-messages.ts:1101]

temperature 只在调用方提供、未启用 thinking、且 compat 表示支持 temperature、且不是 mid-convo effort 模型时写入 payload;metadata 只透传 string 型 `metadata.user_id`;`toolChoice` string 会转成 `{ type }`,对象形式原样作为 Anthropic `tool_choice`。[E: packages/ai/src/api/anthropic-messages.ts:1113] [E: packages/ai/src/api/anthropic-messages.ts:1119] [E: packages/ai/src/api/anthropic-messages.ts:1200] [E: packages/ai/src/api/anthropic-messages.ts:1201] [E: packages/ai/src/api/anthropic-messages.ts:1203]

## Native deferred tools(`defer_loading`)

本 adapter **不再** import `splitDeferredTools` / `deferred-tools.ts`。延迟加载走 Anthropic native `defer_loading` + mid-conversation `tool_addition` / `tool_removal`,由 catalog compat 门控。[E: packages/ai/src/types.ts:912] [E: packages/ai/src/api/anthropic-messages.ts:195]

`nativeToolChanges` 为真当且仅当 `supportsMidConvoSystemMessages`、`supportsMidConvoToolChanges`、leading system message 有 `toolsAdded`,且 transcript 没有同名工具重定义。`hasToolRedefinitions` 为真时退回当前完整工具列表,因为 Anthropic 按 name 引用工具,无法表达同名新定义。[E: packages/ai/src/api/anthropic-messages.ts:1058] [E: packages/ai/src/api/anthropic-messages.ts:1059] [E: packages/ai/src/api/anthropic-messages.ts:1060] [E: packages/ai/src/api/anthropic-messages.ts:1061] [E: packages/ai/src/api/anthropic-messages.ts:1062] [E: packages/ai/src/api/anthropic-messages.ts:1063] [E: packages/ai/src/utils/transcript.ts:183]

开启 native tool changes 时,request `tools` 由三段组成:leading `toolsAdded` 保持立即加载(cache breakpoint 挂在最后一个 initial tool 上);固定占位工具 `DEFERRED_TOOL_PLACEHOLDER`(`name: "__pi_deferred_placeholder__"`,`defer_loading: true`);随后 `getDeclaredTools()` 里不在 initial set 的工具全部 `defer_loading: true`。占位工具从第一轮就进入 cached prefix,避免第一次真实 late tool 把 prefix 打穿;它永不激活,模型也看不见。[E: packages/ai/src/api/anthropic-messages.ts:195] [E: packages/ai/src/api/anthropic-messages.ts:199] [E: packages/ai/src/api/anthropic-messages.ts:1123] [E: packages/ai/src/api/anthropic-messages.ts:1130] [E: packages/ai/src/api/anthropic-messages.ts:1138] [E: packages/ai/src/api/anthropic-messages.ts:1144] [E: packages/ai/test/transcript-tool-changes.test.ts:93]

未开启 native tool changes 时,`params.tools` 就是 `getCurrentTools(context.messages)` 的立即列表。[E: packages/ai/src/api/anthropic-messages.ts:1147] [E: packages/ai/src/api/anthropic-messages.ts:1148] [E: packages/ai/src/utils/transcript.ts:58]

catalog 只对官方 `provider === "anthropic"` 且 `supportsAnthropicMidConvoSystemMessages(modelId)` 的模型同时打开 `supportsMidConvoSystemMessages` 与 `supportsMidConvoToolChanges`。OpenCode Zen / GitHub Copilot 只转发 mid-convo system messages,显式不发 `tool_addition`/`tool_removal`。[E: packages/ai/scripts/generate-models.ts:1200] [E: packages/ai/scripts/generate-models.ts:1201] [E: packages/ai/scripts/generate-models.ts:1202] [E: packages/ai/scripts/generate-models.ts:1206] [E: packages/ai/scripts/generate-models.ts:1206]

Fireworks Messages **仍走本 Anthropic Messages adapter**:`fireworksProvider()` 的 `api` map 把 `"anthropic-messages"` 接到 `anthropicMessagesApi()`;generator 对非 GLM / 非 Kimi K3 的 Fireworks 模型写 `api: "anthropic-messages"` 和 `baseUrl: "https://api.fireworks.ai/inference"`。Fireworks catalog **不**设 `supportsMidConvoToolChanges`,因此不走 native `defer_loading` 拆分,而是当前工具列表 + session affinity 做 prefix cache。[E: packages/ai/src/providers/fireworks.ts:7] [E: packages/ai/src/providers/fireworks.ts:15] [E: packages/ai/scripts/generate-models.ts:1682] [E: packages/ai/scripts/generate-models.ts:1684] [E: packages/ai/scripts/generate-models.ts:1686]

OpenAI Responses 的 prefix deferral 是另一条路:`supportsToolSearch` 时 shared converter 发 completed `tool_search_call` + `tool_search_output`,并在 output tools 上写 `defer_loading: true`。那不是本文件的协议,也不是已删的 `deferred-tools.ts`。[E: packages/ai/src/api/openai-responses-shared.ts:195] [E: packages/ai/src/api/openai-responses-shared.ts:199] [E: packages/ai/src/api/openai-responses-shared.ts:206] [E: packages/ai/src/api/openai-responses-shared.ts:378] [I]

`nativeToolChanges` 为真时还会把 `mid-conversation-tool-changes-2026-07-01` 加进 beta headers。[E: packages/ai/src/api/anthropic-messages.ts:186] [E: packages/ai/src/api/anthropic-messages.ts:1039]

## Message 与 Tool 转换

`buildParams` 先调用 `transformMessages(context.messages, model, normalizeToolCallId)` 再把 conversation(去掉 leading system)交给 `convertMessages`;`normalizeToolCallId` 会把非 `[A-Za-z0-9_-]` 字符替换为 `_`,并截断到 64 字符。[E: packages/ai/src/api/anthropic-messages.ts:1053] [E: packages/ai/src/api/anthropic-messages.ts:1054] [E: packages/ai/src/api/anthropic-messages.ts:1216] [E: packages/ai/src/api/anthropic-messages.ts:1217]

user string message 会丢弃空白内容并写成 sanitized string;user block message 会把 text/image blocks 转为 Anthropic `text`/base64 `image` content,过滤空白 text block,并在过滤后没有 block 时跳过该 message。[E: packages/ai/src/api/anthropic-messages.ts:1279] [E: packages/ai/src/api/anthropic-messages.ts:1280] [E: packages/ai/src/api/anthropic-messages.ts:1288] [E: packages/ai/src/api/anthropic-messages.ts:1305] [E: packages/ai/src/api/anthropic-messages.ts:1311]

later system messages 在 native tool changes 下会把 `toolsRemoved` 写成 `tool_removal` + `tool_reference`,把 `toolsAdded` 写成 `tool_addition` + `tool_reference`;这些 system 块被 hold 到下一条 assistant 之前(或 transcript 末尾)再 flush,以免插在 `tool_use`/`tool_result` 之间。[E: packages/ai/src/api/anthropic-messages.ts:1249] [E: packages/ai/src/api/anthropic-messages.ts:1258] [E: packages/ai/src/api/anthropic-messages.ts:1264] [E: packages/ai/src/api/anthropic-messages.ts:1267] [E: packages/ai/src/api/anthropic-messages.ts:1273] [E: packages/ai/test/transcript-tool-changes.test.ts:104]

assistant message 会把非空 text 写为 Anthropic `text`,redacted thinking 写回 `redacted_thinking`,带 signature 的 thinking 写回 `thinking`,缺 signature 的 thinking 默认降级成 plain text,但 `allowEmptySignature` compat 可保留空 signature thinking block。[E: packages/ai/src/api/anthropic-messages.ts:1322] [E: packages/ai/src/api/anthropic-messages.ts:1330] [E: packages/ai/src/api/anthropic-messages.ts:1345] [E: packages/ai/src/api/anthropic-messages.ts:1357]

assistant tool call 写成 Anthropic `tool_use`,OAuth request 会把工具名转换为 Claude Code canonical casing。[E: packages/ai/src/api/anthropic-messages.ts:1363] [E: packages/ai/src/api/anthropic-messages.ts:1365] [E: packages/ai/src/api/anthropic-messages.ts:1367]

连续 `toolResult` messages 会合并为单个 user message 的多个 `tool_result` blocks,每个 block 带 `tool_use_id`、`content` 和 `is_error`;`convertContentBlocks` 在无图像时把 text 拼接成 sanitized string,有图像时生成 text/image block array,纯图像结果会补一个 `"(see attached image)"` text block。[E: packages/ai/src/api/anthropic-messages.ts:1220] [E: packages/ai/src/api/anthropic-messages.ts:1386] [E: packages/ai/src/api/anthropic-messages.ts:1390] [E: packages/ai/src/api/anthropic-messages.ts:1398]

`convertTools` 把统一 `Tool` 转为 Anthropic tool schema:名称可按 OAuth canonical casing 改写,description 原样传递,input schema 取 parameters,支持 eager input streaming 的模型会设置 `eager_input_streaming: true`,`supportsStrictTools` 且 resolved strict 为真时写 `strict: true`,且只在最后一个 tool 上挂 prompt cache control。[E: packages/ai/src/api/anthropic-messages.ts:1465] [E: packages/ai/src/api/anthropic-messages.ts:1474] [E: packages/ai/src/api/anthropic-messages.ts:1492] [E: packages/ai/src/api/anthropic-messages.ts:1494] [E: packages/ai/src/api/anthropic-messages.ts:1495] [E: packages/ai/src/api/anthropic-messages.ts:1497]

## Streaming Event 转换

`iterateSseMessages` 是本文件内的 SSE decoder:它从 `ReadableStream<Uint8Array>` 读 chunks,用 `TextDecoder` 和 line parser 累积 `event:` / `data:` 字段,遇到空行 flush 为 `ServerSentEvent`,并在 finally 中释放 reader lock。[E: packages/ai/src/api/anthropic-messages.ts:411] [E: packages/ai/src/api/anthropic-messages.ts:415] [E: packages/ai/src/api/anthropic-messages.ts:416] [E: packages/ai/src/api/anthropic-messages.ts:465] [E: packages/ai/src/api/anthropic-messages.ts:466]

`iterateAnthropicEvents` 只放行 Anthropic message event set,遇到 SSE `error` event 直接 throw,JSON parse 失败时把 event name、data 和 raw lines 包进错误;如果看到 `message_start` 但没有看到 `message_stop`,stream 结束后会抛出 `"Anthropic stream ended before message_stop"`。[E: packages/ai/src/api/anthropic-messages.ts:470] [E: packages/ai/src/api/anthropic-messages.ts:482] [E: packages/ai/src/api/anthropic-messages.ts:486] [E: packages/ai/src/api/anthropic-messages.ts:500] [E: packages/ai/src/api/anthropic-messages.ts:506]

stream 消费端在 response headers hook 后先 push normalized `start`;每个解析出的 Anthropic event 先 `await options?.onProviderStreamEvent?.(event, model)` 再归一。`message_start` 记录 `responseId`、input/output token 和 cache read/write token 到 `output.usage`。[E: packages/ai/src/api/anthropic-messages.ts:595] [E: packages/ai/src/api/anthropic-messages.ts:596] [E: packages/ai/src/api/anthropic-messages.ts:602] [E: packages/ai/src/api/anthropic-messages.ts:603] [E: packages/ai/src/types.ts:198]

`content_block_start` 建立 normalized content block:text -> `text_start`,thinking -> `thinking_start`,redacted thinking -> redacted `thinking_start`,tool_use -> `toolcall_start`;首帧携带的初始 text/thinking/signature 会写进 block,不再丢掉。[E: packages/ai/src/api/anthropic-messages.ts:627] [E: packages/ai/src/api/anthropic-messages.ts:634] [E: packages/ai/src/api/anthropic-messages.ts:637] [E: packages/ai/src/api/anthropic-messages.ts:642] [E: packages/ai/src/api/anthropic-messages.ts:645] [E: packages/ai/src/api/anthropic-messages.ts:651] [E: packages/ai/src/api/anthropic-messages.ts:661]

Accumulator 从 `stopReason: "pending"` 开始;`message_delta` 用 `mapStopReason` 更新 normalized `stopReason`,并只在 usage 字段非 null 时覆盖 input/output/cache fields。流结束仍 `pending` 时抛 `"Anthropic stream ended without a stop reason"`。[E: packages/ai/src/api/anthropic-messages.ts:537] [E: packages/ai/src/api/anthropic-messages.ts:753] [E: packages/ai/src/api/anthropic-messages.ts:758] [E: packages/ai/src/api/anthropic-messages.ts:803] [E: packages/ai/src/api/anthropic-messages.ts:804]

`mapStopReason` 把 `end_turn` 映射为 `stop`,`max_tokens` 映射为 `length`,`tool_use` 映射为 `toolUse`,`refusal` 和 `sensitive` 映射为 `error`,`pause_turn` 与 `stop_sequence` 映射为 `stop`;未知 stop reason 会 throw。[E: packages/ai/src/api/anthropic-messages.ts:1502] [E: packages/ai/src/api/anthropic-messages.ts:1508] [E: packages/ai/src/api/anthropic-messages.ts:1510] [E: packages/ai/src/api/anthropic-messages.ts:1512] [E: packages/ai/src/api/anthropic-messages.ts:1526]

正常结束时 `stream` push `done` 并 `end`;如果 abort signal 已触发、normalized stop reason 是 `aborted` / `error`、SSE/parse/request 任一步抛错,catch 会清理所有 content block 的内部 `index` 和 `partialJson`,把 stop reason 设为 `aborted` 或 `error`,push terminal `error` event 并 end。[E: packages/ai/src/api/anthropic-messages.ts:823] [E: packages/ai/src/api/anthropic-messages.ts:825] [E: packages/ai/src/api/anthropic-messages.ts:826] [E: packages/ai/src/api/anthropic-messages.ts:829]

## Prompt Caching 交互

Anthropic cache retention 默认来自 `options.cacheRetention`,未传时兼容读取 `PI_CACHE_RETENTION=long`,否则默认为 `"short"`;retention 为 `"none"` 时不返回 `cacheControl`,retention 为 `"long"` 且模型 compat 支持长缓存时生成 `{ type: "ephemeral", ttl: "1h" }`,其他启用场景生成短期 `{ type: "ephemeral" }`。[E: packages/ai/src/api/anthropic-messages.ts:60] [E: packages/ai/src/api/anthropic-messages.ts:64] [E: packages/ai/src/api/anthropic-messages.ts:76] [E: packages/ai/src/api/anthropic-messages.ts:79] [E: packages/ai/src/api/anthropic-messages.ts:82]

Anthropic cache control 可挂在 system text block、最后一个 user 或 system message block(含 `tool_addition`/`tool_removal`)、最后一个 tool definition;如果 cache retention 是 `"none"`,client 创建时也不会把 `sessionId` 转为 session affinity header。[E: packages/ai/src/api/anthropic-messages.ts:1091] [E: packages/ai/src/api/anthropic-messages.ts:1408] [E: packages/ai/src/api/anthropic-messages.ts:1418] [E: packages/ai/src/api/anthropic-messages.ts:1497]

`openai-prompt-cache.ts` 只定义 OpenAI prompt cache key 的 64 字符上限和 `clampOpenAIPromptCacheKey`;Anthropic prompt caching 由 Anthropic `cache_control` block metadata 表达,OpenAI helper 不参与 Anthropic request construction。[E: packages/ai/src/api/openai-prompt-cache.ts:1] [E: packages/ai/src/api/openai-prompt-cache.ts:3] [I]

## 设计动机与 Gotcha

`getAnthropicCompat` 为 Anthropic-compatible model compat fields 提供默认能力表:默认支持 eager tool input streaming、long cache retention、tool cache control 和 temperature,默认不允许空 thinking signature,默认关闭 mid-convo system/tool changes。session affinity 默认跟 OpenRouter 走。[E: packages/ai/src/api/anthropic-messages.ts:209] [E: packages/ai/src/api/anthropic-messages.ts:210] [E: packages/ai/src/api/anthropic-messages.ts:213] [E: packages/ai/src/api/anthropic-messages.ts:214] [E: packages/ai/src/api/anthropic-messages.ts:215] [E: packages/ai/src/api/anthropic-messages.ts:217] [E: packages/ai/src/api/anthropic-messages.ts:218]

fine-grained tool streaming beta 只在有当前 tools 且 compat 不支持 eager tool input streaming 时启用;interleaved thinking beta 在调用方允许且 model 不是 force-adaptive thinking 时加入 beta header。[E: packages/ai/src/api/anthropic-messages.ts:1458] [E: packages/ai/src/api/anthropic-messages.ts:1462] [E: packages/ai/src/api/anthropic-messages.ts:1027] [E: packages/ai/src/api/anthropic-messages.ts:1033]

`options.onPayload` 可以替换最终 Anthropic params,`options.onResponse` 可以观察 HTTP status 和 headers,`options.onProviderStreamEvent` 在归一化之前观察每个解析出的 Anthropic event。文档中的 builder 输出可能被 hook 改写。[E: packages/ai/src/api/anthropic-messages.ts:595] [E: packages/ai/src/api/anthropic-messages.ts:602] [I]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api === "anthropic-messages"` 如何进入本文件的 `stream` / `streamSimple`;本节点只展开进入 Anthropic wire adapter 之后的 payload 与 event conversion。
- [subsys.ai.prompt-caching](prompt-caching.md) - prompt caching 的跨 API 策略归档节点;本节点只覆盖 Anthropic `cache_control` 与 `openai-prompt-cache.ts` 的边界。

## Sources

- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-prompt-cache.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/src/types.ts
- packages/ai/src/providers/fireworks.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/test/transcript-tool-changes.test.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - provider/API dispatch 如何选择 `anthropic-messages` implementation。
- [subsys.ai.prompt-caching](prompt-caching.md) - Anthropic cache control 与 OpenAI prompt cache key helper 在全局缓存策略中的位置。
