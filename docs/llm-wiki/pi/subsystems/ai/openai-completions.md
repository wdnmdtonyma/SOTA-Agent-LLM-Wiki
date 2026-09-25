---
id: subsys.ai.openai-completions
title: OpenAI Completions 协议
kind: subsystem
tier: T2
pkg: ai
source:
 - packages/ai/src/api/openai-completions.ts
 - packages/ai/src/api/openai-responses-shared.ts
 - packages/ai/src/api/simple-options.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/types.ts
 - packages/ai/src/utils/pi-user-agent.ts
 - packages/ai/test/openai-completions-tool-result-images.test.ts
symbols:
 - stream
 - OpenAICompletionsOptions
 - samplingParams
related:
 - subsys.ai.wire-protocol-dispatch
 - subsys.ai.openai-responses
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.openai-completions` 是 `pi-ai` 的 OpenAI Chat Completions wire 协议实现:它把统一 `TranscriptContext`/`Model<"openai-completions">` 转成 `client.chat.completions.create(..., {stream:true})` 请求,再把 `ChatCompletionChunk` 归一成 `AssistantMessageEventStream`。

## 能回答的问题

- `openai-completions` 的 `stream` 入口怎样创建 OpenAI SDK client、构造 Chat Completions payload、发起 streaming 请求?
- `OpenAICompletionsOptions` 在通用 `StreamOptions` 外额外支持哪些字段?
- Chat Completions 请求里的 `messages`、`tools`、`tool_choice`、usage streaming、cache key、reasoning effort 分别在哪里填充?
- 空 text part 还会不会发给 multimodal user message?
- unknown OpenAI-compat 默认是否发送 strict tools?
- streaming chunk 的 text、reasoning、tool call、usage、finish reason 如何映射成内部事件和 `AssistantMessage`?
- `thinking_token_budget` 与 `samplingParams` 怎样进入 Chat Completions payload?
- DeepSeek 的 `maxTokens` 走 `max_tokens` 还是 `max_completion_tokens`?
- `openai-completions.ts` 与 `openai-responses-shared.ts` 的边界是什么,哪些逻辑没有共享?

## 职责边界

`openai-completions.ts` 负责完整的 Chat Completions wire path。`stream` 接收 `TranscriptContext`,先 `resolveTranscript(context, supportsMidConvoSystemMessages)`,再解析 API key、创建 OpenAI client、构造 Chat payload、`client.chat.completions.create(...).withResponse()` 调用、chunk loop(含 `onProviderStreamEvent`)、usage 解析、finish reason 映射与 error/done 事件收束。[E: packages/ai/src/api/openai-completions.ts:299] [E: packages/ai/src/api/openai-completions.ts:301] [E: packages/ai/src/api/openai-completions.ts:305] [E: packages/ai/src/api/openai-completions.ts:554] `openai-responses-shared.ts` 覆盖 Responses API 的 conversion,不是 Chat Completions chunk parser。[E: packages/ai/src/api/openai-responses-shared.ts:145] [E: packages/ai/src/api/openai-responses-shared.ts:434]

`OpenAICompletionsOptions` 继承 `StreamOptions`,额外暴露 `toolChoice`、`reasoningEffort` 和 `thinkingBudgets`;`reasoningEffort` 接受 `minimal|low|medium|high|xhigh|max`,`toolChoice` 可为 `auto|none|required` 或指定 function name,`thinkingBudgets` 只在 compat `supportsThinkingTokenBudget` 时使用。[E: packages/ai/src/api/openai-completions.ts:149][E: packages/ai/src/api/openai-completions.ts:150][E: packages/ai/src/api/openai-completions.ts:151][E: packages/ai/src/api/openai-completions.ts:153] 继承的 `StreamOptions.samplingParams` 是任意 record,在 named request 字段之后 `Object.assign` 进 payload,因此可覆盖 `temperature` / `max_tokens` 等已写字段。[E: packages/ai/src/types.ts:207] [E: packages/ai/src/api/openai-completions.ts:998] [E: packages/ai/src/api/openai-completions.ts:998]

## 关键文件

- `packages/ai/src/api/openai-completions.ts` - 权威实现 `stream`、`streamSimple`、`convertMessages`、`convertTools`、`parseChunkUsage`、`mapStopReason`、provider compat detection/resolution。[E: packages/ai/src/api/openai-completions.ts:299][E: packages/ai/src/api/openai-completions.ts:731][E: packages/ai/src/api/openai-completions.ts:1184][E: packages/ai/src/api/openai-completions.ts:1473][E: packages/ai/src/api/openai-completions.ts:1510][E: packages/ai/src/api/openai-completions.ts:1553][E: packages/ai/src/api/openai-completions.ts:1584][E: packages/ai/src/api/openai-completions.ts:1687]
- `packages/ai/src/api/openai-responses-shared.ts` - Responses API 的 shared helpers;本节点只用它说明与 Responses 协议的边界,因为 Chat Completions implementation 的 imports 不包含该 shared 模块。[I][E: packages/ai/src/api/openai-completions.ts:1][E: packages/ai/src/api/openai-completions.ts:66][E: packages/ai/src/api/openai-responses-shared.ts:145][E: packages/ai/src/api/openai-responses-shared.ts:434]

## 数据模型

`stream` 初始化一个 `AssistantMessage` partial,预填 `role:"assistant"`、空 `content`、`api/provider/model`、零值 usage、`stopReason:"pending"` 和 timestamp;后续 chunk parsing 原地补全 `content`、`usage`、`responseId`、`responseModel`、`rawStopReason`、`stopReason`、`errorMessage`。[E: packages/ai/src/api/openai-completions.ts:304][E: packages/ai/src/api/openai-completions.ts:308][E: packages/ai/src/api/openai-completions.ts:311][E: packages/ai/src/api/openai-completions.ts:314][E: packages/ai/src/api/openai-completions.ts:322][E: packages/ai/src/api/openai-completions.ts:559][E: packages/ai/src/api/openai-completions.ts:576][E: packages/ai/src/api/openai-completions.ts:579]

streaming 内部有三类 block:`TextContent`、`ThinkingContent`、`StreamingToolCallBlock`;tool call block 在 stream 中额外带 `partialArgs` 和 `streamIndex`,结束时解析 `partialArgs` 并删除 scratch 字段,避免 replay 持久化 parser 缓冲。[E: packages/ai/src/api/openai-completions.ts:381][E: packages/ai/src/api/openai-completions.ts:389][E: packages/ai/src/api/openai-completions.ts:651][E: packages/ai/src/api/openai-completions.ts:463][E: packages/ai/src/api/openai-completions.ts:465]

## 控制流

1. `stream@openai-completions.ts:311` 同步返回 `AssistantMessageEventStream`,异步 IIFE 内先解析 API key、compat、cache retention、session affinity,再创建 OpenAI SDK client 并构造 params。[E: packages/ai/src/api/openai-completions.ts:299][E: packages/ai/src/api/openai-completions.ts:307][E: packages/ai/src/api/openai-completions.ts:336][E: packages/ai/src/api/openai-completions.ts:337][E: packages/ai/src/api/openai-completions.ts:342][E: packages/ai/src/api/openai-completions.ts:343][E: packages/ai/src/api/openai-completions.ts:355][E: packages/ai/src/api/openai-completions.ts:356]
 `cacheRetention === "none"` 时 `cacheSessionId` 为 `undefined`，`createClient` 收不到 `sessionId`，因此不会写任何 session-affinity header。[E: packages/ai/src/api/openai-completions.ts:342] [E: packages/ai/src/api/openai-completions.ts:343] [E: packages/ai/src/api/openai-completions.ts:355]
 `detectCompat` 在 `provider === "openrouter"` 或 `baseUrl` 含 `openrouter.ai` 时默认 `sendSessionAffinityHeaders: true` 且 `sessionAffinityFormat: "openrouter"`；`model.compat` 可覆盖这两项。[E: packages/ai/src/api/openai-completions.ts:1596] [E: packages/ai/src/api/openai-completions.ts:1671] [E: packages/ai/src/api/openai-completions.ts:1672] [E: packages/ai/src/api/openai-completions.ts:1720] [E: packages/ai/src/api/openai-completions.ts:1721]
 Session affinity 仅在已转发的 `sessionId` 且 compat 启用时注入：`openrouter` 写 `x-session-id`；`openai` 写 `session_id`、`x-client-request-id`、`x-session-affinity`；`openai-nosession` 省略 `session_id` 但保留后两个 headers [E: packages/ai/src/api/openai-completions.ts:771] [E: packages/ai/src/api/openai-completions.ts:772] [E: packages/ai/src/api/openai-completions.ts:773] [E: packages/ai/src/api/openai-completions.ts:775] [E: packages/ai/src/api/openai-completions.ts:779]。
2. `onPayload` 可替换即将发送的 Chat Completions params,request options 会透传 abort signal、timeout 和 `maxRetries` 默认值 0。[E: packages/ai/src/api/openai-completions.ts:361][E: packages/ai/src/api/openai-completions.ts:363][E: packages/ai/src/api/openai-completions.ts:365][E: packages/ai/src/api/openai-completions.ts:366][E: packages/ai/src/api/openai-completions.ts:367][E: packages/ai/src/api/openai-completions.ts:368]
3. wire request 调用 `client.chat.completions.create(params, requestOptions).withResponse()`,再把 HTTP status/headers 交给 `onResponse`,随后 push `start` 事件。[E: packages/ai/src/api/openai-completions.ts:370][E: packages/ai/src/api/openai-completions.ts:371][E: packages/ai/src/api/openai-completions.ts:371][E: packages/ai/src/api/openai-completions.ts:378][E: packages/ai/src/api/openai-completions.ts:379]
4. `for await (const chunk of openaiStream)` 逐 chunk 更新 response id/model、usage、choice finish reason、text/thinking/tool call deltas 和 encrypted reasoning details。[E: packages/ai/src/api/openai-completions.ts:553][E: packages/ai/src/api/openai-completions.ts:559][E: packages/ai/src/api/openai-completions.ts:561][E: packages/ai/src/api/openai-completions.ts:564][E: packages/ai/src/api/openai-completions.ts:576][E: packages/ai/src/api/openai-completions.ts:586][E: packages/ai/src/api/openai-completions.ts:665]
5. chunk loop 结束后,implementation 对所有 blocks 调用 `finishBlock`,再把 abort、error stop reason、缺失 finish reason 变成 thrown error;正常路径 push `done` 并 end stream,catch 路径清理 scratch 字段、设置 `stopReason` 并 push `error`。[E: packages/ai/src/api/openai-completions.ts:680][E: packages/ai/src/api/openai-completions.ts:681][E: packages/ai/src/api/openai-completions.ts:683][E: packages/ai/src/api/openai-completions.ts:693][E: packages/ai/src/api/openai-completions.ts:693][E: packages/ai/src/api/openai-completions.ts:700][E: packages/ai/src/api/openai-completions.ts:703][E: packages/ai/src/api/openai-completions.ts:713][E: packages/ai/src/api/openai-completions.ts:723]

## 请求字段

`buildParams` 的基础 payload 是 `{model, messages, stream:true, prompt_cache_key?, prompt_cache_retention?}`;`messages` 来自 `convertMessages`。`prompt_cache_key` 在两种情况下都会 clamped 写入:(1) OpenAI 官方 `api.openai.com` 且 cache retention 非 `none`;(2) `cacheRetention==="long"` 且 `compat.supportsLongCacheRetention`,与 host 无关。long retention 且 compat 支持时另设 `prompt_cache_retention:"24h"`。[E: packages/ai/src/api/openai-completions.ts:803][E: packages/ai/src/api/openai-completions.ts:817][E: packages/ai/src/api/openai-completions.ts:818][E: packages/ai/src/api/openai-completions.ts:821][E: packages/ai/src/api/openai-completions.ts:822][E: packages/ai/src/api/openai-completions.ts:823][E: packages/ai/src/api/openai-completions.ts:826]

当 compat 没有禁用 streaming usage 时,params 增加 `stream_options:{include_usage:true}`;支持 store 的 provider 会显式 `store=false`;`maxTokens` 根据 compat `maxTokensField` 写入 `max_tokens` 或 `max_completion_tokens`;temperature 仅在 options 提供时写入。[E: packages/ai/src/api/openai-completions.ts:829][E: packages/ai/src/api/openai-completions.ts:830][E: packages/ai/src/api/openai-completions.ts:833][E: packages/ai/src/api/openai-completions.ts:834][E: packages/ai/src/api/openai-completions.ts:837][E: packages/ai/src/api/openai-completions.ts:838][E: packages/ai/src/api/openai-completions.ts:839][E: packages/ai/src/api/openai-completions.ts:841][E: packages/ai/src/api/openai-completions.ts:845][E: packages/ai/src/api/openai-completions.ts:846] DeepSeek 被 `detectCompat` 算进 `useMaxTokens`:provider 为 `deepseek` 或 base URL 含 `deepseek.com` 时走 `max_tokens`,而不是 OpenAI 官方的 `max_completion_tokens`。[E: packages/ai/src/api/openai-completions.ts:1602][E: packages/ai/src/api/openai-completions.ts:1620][E: packages/ai/src/api/openai-completions.ts:1622][E: packages/ai/src/api/openai-completions.ts:1642]

tools 来自 `resolveTranscriptTools(context.messages, supportsMidConvoSystemMessages && supportsMidConvoToolAdditions)` 的 `requestTools`,经 `convertTools` 转成 OpenAI function tools;没有当前 request tools 但历史消息含 tool call/tool result 时,params 写入空 tools 数组以兼容要求 tools param 的代理/provider。[E: packages/ai/src/api/openai-completions.ts:808] [E: packages/ai/src/api/openai-completions.ts:849] [E: packages/ai/src/api/openai-completions.ts:850] [E: packages/ai/src/api/openai-completions.ts:854] [E: packages/ai/src/api/openai-completions.ts:1473] `toolChoice` 只在 options 提供时写入 `params.tool_choice`。[E: packages/ai/src/api/openai-completions.ts:863]

reasoning 参数按 compat 分支写入 provider-specific shape:Z.ai 用 `thinking` 与可选 `reasoning_effort`,且启用时带 `clear_thinking:false`;Qwen variants 用 `enable_thinking` 或 `chat_template_kwargs`;Baseten 用 configurable `chat_template_args`，并只在 `supportsReasoningEffort` 时写映射后的 `reasoning_effort`;DeepSeek 用 `thinking`/`reasoning_effort`;OpenRouter 用嵌套 `reasoning`;`ant-ling` 在有 `reasoningEffort` 时写嵌套 `reasoning.effort`(仅 mapped string);Together 用 `reasoning.enabled` 与可选 `reasoning_effort`;`string-thinking` 写 top-level `thinking` string;默认 OpenAI-style 分支用 `reasoning_effort`。[E: packages/ai/src/api/openai-completions.ts:874][E: packages/ai/src/api/openai-completions.ts:879][E: packages/ai/src/api/openai-completions.ts:887][E: packages/ai/src/api/openai-completions.ts:895][E: packages/ai/src/api/openai-completions.ts:905][E: packages/ai/src/api/openai-completions.ts:910][E: packages/ai/src/api/openai-completions.ts:912][E: packages/ai/src/api/openai-completions.ts:914][E: packages/ai/src/api/openai-completions.ts:916][E: packages/ai/src/api/openai-completions.ts:919][E: packages/ai/src/api/openai-completions.ts:922][E: packages/ai/src/api/openai-completions.ts:932][E: packages/ai/src/api/openai-completions.ts:942][E: packages/ai/src/api/openai-completions.ts:945][E: packages/ai/src/api/openai-completions.ts:947][E: packages/ai/src/api/openai-completions.ts:956][E: packages/ai/src/api/openai-completions.ts:959][E: packages/ai/src/api/openai-completions.ts:963]

`buildChatTemplateValues()` 同时服务 `chatTemplateKwargs` 与 Baseten `chatTemplateArgs`：它逐值解析 literal 或 `$var`，忽略解析为 `undefined` 的项，空 object 不发到 wire。[E: packages/ai/src/api/openai-completions.ts:900] [E: packages/ai/src/api/openai-completions.ts:901] [E: packages/ai/src/api/openai-completions.ts:910] [E: packages/ai/src/api/openai-completions.ts:1025] [E: packages/ai/src/api/openai-completions.ts:1033] [E: packages/ai/src/api/openai-completions.ts:1034] [E: packages/ai/src/api/openai-completions.ts:1040]

thinking-token budget 独立于 `thinkingFormat`：`resolveThinkingTokenBudgetField()` 优先用 `compat.thinkingTokenBudgetField`，否则 `supportsThinkingTokenBudget` 时写 `thinking_token_budget` [E: packages/ai/src/api/openai-completions.ts:871] [E: packages/ai/src/api/openai-completions.ts:1003] [E: packages/ai/src/api/openai-completions.ts:1006] [E: packages/ai/src/api/openai-completions.ts:1007] [E: packages/ai/src/types.ts:805]。`resolveClampedThinkingBudget()` 只在有 `reasoningEffort` 且 `model.reasoning` 时算 budget，再与 `max_tokens`/`max_completion_tokens`/`model.maxTokens` 天花板比较并给答案留空间；budget 为 0 则不写 [E: packages/ai/src/api/openai-completions.ts:1011] [E: packages/ai/src/api/openai-completions.ts:1016] [E: packages/ai/src/api/openai-completions.ts:977] [E: packages/ai/src/api/openai-completions.ts:978]。`chat-template` / Baseten 的 `{ "$var": "thinking.budget" }` 也消费同一 clamped budget [E: packages/ai/src/api/openai-completions.ts:901] [E: packages/ai/src/api/openai-completions.ts:910] [E: packages/ai/src/api/openai-completions.ts:1060] [E: packages/ai/src/types.ts:94]。

`samplingParams` 在 `buildParams` 最后 `Object.assign` 进 request,因此 direct `stream` / `complete` 都会 merge,不依赖 `streamSimple`。`streamSimple` 经 `buildBaseOptions()` 把 request `samplingParams` 拷进 options 后再交给 `stream`。[E: packages/ai/src/api/openai-completions.ts:998] [E: packages/ai/src/api/openai-completions.ts:998] [E: packages/ai/src/api/simple-options.ts:29] [E: packages/ai/src/types.ts:207]

`detectCompat` 对 unknown OpenAI-compat 默认 `supportsStrictMode: false`。`convertTools` 只有 `compat.supportsStrictMode !== false` 时才把 `strict` 写进 function tool;因此未声明 compat 的 OpenAI-compat 端点默认 **不**发 strict tools,避免未知字段被拒。显式 `model.compat.supportsStrictMode` 仍可覆盖。[E: packages/ai/src/api/openai-completions.ts:1666] [E: packages/ai/src/api/openai-completions.ts:1496] [E: packages/ai/src/api/openai-completions.ts:1504] [E: packages/ai/src/api/openai-completions.ts:1713]

## 消息与 tool call 转换

`convertMessages` 先 `resolveTranscript`,再通过 `transformMessages(normalizedContext.messages, model, normalizeToolCallId)` 做 replay normalization。pipe 分隔的 Responses/Codex-style id 会分别 sanitize `callId` 与 `itemId` 再拼成 `callId_itemId`;combined 长度 ≤40 时原样使用,否则用 truncated `callId` 前缀加 8-char hash。OpenAI provider 的非 pipe id 才会截断到 40 字符。[E: packages/ai/src/api/openai-completions.ts:1184] [E: packages/ai/src/api/openai-completions.ts:1186] [E: packages/ai/src/api/openai-completions.ts:1190] [E: packages/ai/src/api/openai-completions.ts:1201] [E: packages/ai/src/api/openai-completions.ts:1215] [E: packages/ai/src/api/openai-completions.ts:1219]

system prompt 根据 reasoning model 与 compat 选择 `developer` 或 `system` role,文本来自 transcript system messages(`getSystemMessageText` / `renderSystemMessageUpdate`),不是 `context.systemPrompt`。user string 转 user text。带 image 的 user content 转 Chat Completions `text`/`image_url` parts 时,**空 text part 会被 filter 掉**,不再发给 multimodal 端点(回归 #9797)。[E: packages/ai/src/api/openai-completions.ts:1224] [E: packages/ai/src/api/openai-completions.ts:1248] [E: packages/ai/src/api/openai-completions.ts:1259] [E: packages/ai/src/api/openai-completions.ts:1260] [E: packages/ai/test/openai-completions-tool-result-images.test.ts:73]

assistant 历史消息会收集 text blocks;常规路径把 text 拼成 string content,但 `requiresThinkingAsText` 且存在 thinking blocks 时会把 thinking 和文本作为 Chat Completions text parts 发送;thinking blocks 也可能按 compat 写入 provider-specific reasoning field。tool call blocks 转为 `assistantMsg.tool_calls` 的 OpenAI function call shape;带 `thoughtSignature` 的 tool call 会回填到 `reasoning_details`。[E: packages/ai/src/api/openai-completions.ts:1289][E: packages/ai/src/api/openai-completions.ts:1299][E: packages/ai/src/api/openai-completions.ts:1289][E: packages/ai/src/api/openai-completions.ts:1314][E: packages/ai/src/api/openai-completions.ts:1319][E: packages/ai/src/api/openai-completions.ts:1326][E: packages/ai/src/api/openai-completions.ts:1327][E: packages/ai/src/api/openai-completions.ts:1326][E: packages/ai/src/api/openai-completions.ts:1338][E: packages/ai/src/api/openai-completions.ts:1302][E: packages/ai/src/api/openai-completions.ts:1352][E: packages/ai/src/api/openai-completions.ts:1369][E: packages/ai/src/api/openai-completions.ts:1389][E: packages/ai/src/api/openai-completions.ts:1375]

tool result history 转为 role `tool` messages,纯图片结果会用占位文本;如果模型支持 image input,连续 tool results 里的 image blocks 会额外汇总成一个 user message `Attached image(s) from tool result:` 加 image_url parts。[E: packages/ai/src/api/openai-completions.ts:1397][E: packages/ai/src/api/openai-completions.ts:1405][E: packages/ai/src/api/openai-completions.ts:1415][E: packages/ai/src/api/openai-completions.ts:1378][E: packages/ai/src/api/openai-completions.ts:1418][E: packages/ai/src/api/openai-completions.ts:1425][E: packages/ai/src/api/openai-completions.ts:1428][E: packages/ai/src/api/openai-completions.ts:1449][E: packages/ai/src/api/openai-completions.ts:1454]

## stream chunk 解析

text delta 来自 `choice.delta.content`;首次遇到 text 时创建 text block 并 push `text_start`,每个 delta 追加到 block 并 push `text_delta`,结束时 `finishBlock` push `text_end`。[E: packages/ai/src/api/openai-completions.ts:474][E: packages/ai/src/api/openai-completions.ts:476][E: packages/ai/src/api/openai-completions.ts:478][E: packages/ai/src/api/openai-completions.ts:588][E: packages/ai/src/api/openai-completions.ts:593][E: packages/ai/src/api/openai-completions.ts:595][E: packages/ai/src/api/openai-completions.ts:433]

thinking delta 从 `reasoning_content`、`reasoning`、`reasoning_text` 三个非标准字段中取第一个非空字段;首次遇到 thinking 时创建 thinking block,把字段名写入 `thinkingSignature`,但 `opencode-go` 的 `reasoning` 字段会归一为 `reasoning_content`;随后发出 `thinking_start`/`thinking_delta`/`thinking_end`。[E: packages/ai/src/api/openai-completions.ts:482][E: packages/ai/src/api/openai-completions.ts:487][E: packages/ai/src/api/openai-completions.ts:490][E: packages/ai/src/api/openai-completions.ts:606][E: packages/ai/src/api/openai-completions.ts:609][E: packages/ai/src/api/openai-completions.ts:620][E: packages/ai/src/api/openai-completions.ts:621][E: packages/ai/src/api/openai-completions.ts:622][E: packages/ai/src/api/openai-completions.ts:623][E: packages/ai/src/api/openai-completions.ts:624][E: packages/ai/src/api/openai-completions.ts:625][E: packages/ai/src/api/openai-completions.ts:627][E: packages/ai/src/api/openai-completions.ts:441]

tool call delta 来自 `choice.delta.tool_calls`;parser 用 stream index 或 id 找到/创建 block,累加 `function.arguments` 到 `partialArgs`,用 `parseStreamingJson` 维护增量可读 arguments,每个 delta 发 `toolcall_delta`,结束时发 `toolcall_end`。[E: packages/ai/src/api/openai-completions.ts:494][E: packages/ai/src/api/openai-completions.ts:497][E: packages/ai/src/api/openai-completions.ts:501][E: packages/ai/src/api/openai-completions.ts:525][E: packages/ai/src/api/openai-completions.ts:635][E: packages/ai/src/api/openai-completions.ts:648][E: packages/ai/src/api/openai-completions.ts:650][E: packages/ai/src/api/openai-completions.ts:651][E: packages/ai/src/api/openai-completions.ts:657][E: packages/ai/src/api/openai-completions.ts:467]

`reasoning_details` 是 replay metadata，不是用户可见 delta：stream 中累积到 `streamedReasoningDetails`，block finalize 时 `JSON.stringify` 进 thinking `thinkingSignature` [E: packages/ai/src/api/openai-completions.ts:328] [E: packages/ai/src/api/openai-completions.ts:329] [E: packages/ai/src/api/openai-completions.ts:331]。`appendOpenAIReasoningDetail()` 合并连续 `reasoning.text` / `reasoning.summary` delta，encrypted 条目保持独立 [E: packages/ai/src/api/openai-completions.ts:252] [E: packages/ai/src/api/openai-completions.ts:254] [E: packages/ai/src/api/openai-completions.ts:260] [E: packages/ai/src/api/openai-completions.ts:265] [E: packages/ai/src/api/openai-completions.ts:674]。replay 时优先把 thinking signature 解析回 `reasoning_details`；否则回退 legacy encrypted `thoughtSignature` [E: packages/ai/src/api/openai-completions.ts:1303] [E: packages/ai/src/api/openai-completions.ts:1309] [E: packages/ai/src/api/openai-completions.ts:1374]。

usage 优先来自 `chunk.usage`,fallback 到 `choice.usage`;`parseChunkUsage` 把 `prompt_tokens` 扣除 cache read/write 后作为 input,把 `completion_tokens` 作为 output,把 `completion_tokens_details.reasoning_tokens` 作为 reasoning,再调用 `calculateCost`。[E: packages/ai/src/api/openai-completions.ts:563][E: packages/ai/src/api/openai-completions.ts:564][E: packages/ai/src/api/openai-completions.ts:572][E: packages/ai/src/api/openai-completions.ts:573][E: packages/ai/src/api/openai-completions.ts:1521][E: packages/ai/src/api/openai-completions.ts:1523][E: packages/ai/src/api/openai-completions.ts:1524][E: packages/ai/src/api/openai-completions.ts:1537][E: packages/ai/src/api/openai-completions.ts:1539][E: packages/ai/src/api/openai-completions.ts:1545][E: packages/ai/src/api/openai-completions.ts:1549]

finish reason 映射规则是 `null -> stop`，`stop|end -> stop`,`length -> length`,`function_call|tool_calls -> toolUse`,`content_filter|network_error|unknown -> error`。默认 `supportsFinishReason` 为真时，整个 stream 未见 finish reason 会当成错误而不是 silently done；compat 显式 `supportsFinishReason: false` 时改为从是否存在 tool call 推断 `toolUse` 或 `stop`。[E: packages/ai/src/api/openai-completions.ts:576][E: packages/ai/src/api/openai-completions.ts:578][E: packages/ai/src/api/openai-completions.ts:1557][E: packages/ai/src/api/openai-completions.ts:1559][E: packages/ai/src/api/openai-completions.ts:1562][E: packages/ai/src/api/openai-completions.ts:1564][E: packages/ai/src/api/openai-completions.ts:1567][E: packages/ai/src/api/openai-completions.ts:1569][E: packages/ai/src/api/openai-completions.ts:1572][E: packages/ai/src/api/openai-completions.ts:690][E: packages/ai/src/api/openai-completions.ts:696]

## 与 Responses/shared 模块边界

Responses shared 的 `convertResponsesMessages` 生成 Responses API `ResponseInput`;当目标 provider 被允许且历史 assistant tool call id 带 pipe 时,它保留 `call_id|item_id` 双段结构,并在必要时让 item id 满足 `fc_` 前缀要求。[E: packages/ai/src/api/openai-responses-shared.ts:145][E: packages/ai/src/api/openai-responses-shared.ts:152][E: packages/ai/src/api/openai-responses-shared.ts:165][E: packages/ai/src/api/openai-responses-shared.ts:166][E: packages/ai/src/api/openai-responses-shared.ts:167][E: packages/ai/src/api/openai-responses-shared.ts:168][E: packages/ai/src/api/openai-responses-shared.ts:173][E: packages/ai/src/api/openai-responses-shared.ts:176] Chat Completions 的 `convertMessages` 则把 pipe id 压成单个 Chat `tool_call_id`(sanitize 后的 `callId_itemId`,超长再 hash),因为 Chat Completions tool messages 使用单个 `tool_call_id` 字段。[E: packages/ai/src/api/openai-completions.ts:1193][E: packages/ai/src/api/openai-completions.ts:1201][E: packages/ai/src/api/openai-completions.ts:1206][E: packages/ai/src/api/openai-completions.ts:1415][E: packages/ai/src/api/openai-completions.ts:1418]

Responses shared 的 `processResponsesStream` 按 `ResponseStreamEvent` 的 typed event name 建 slot,例如 `response.output_item.added`、`response.output_text.delta`、`response.function_call_arguments.delta`、`response.output_item.done`、`response.completed|response.incomplete`;Completions 的 stream loop 只处理 `ChatCompletionChunk` 的 `choices[0].delta` 和 `finish_reason`。[E: packages/ai/src/api/openai-responses-shared.ts:434][E: packages/ai/src/api/openai-responses-shared.ts:600][E: packages/ai/src/api/openai-responses-shared.ts:604][E: packages/ai/src/api/openai-responses-shared.ts:636][E: packages/ai/src/api/openai-responses-shared.ts:656][E: packages/ai/src/api/openai-responses-shared.ts:684][E: packages/ai/src/api/openai-responses-shared.ts:744][E: packages/ai/src/api/openai-completions.ts:553][E: packages/ai/src/api/openai-completions.ts:567][E: packages/ai/src/api/openai-completions.ts:576][E: packages/ai/src/api/openai-completions.ts:586]

`openai-completions.ts` and `openai-responses-shared.ts` both normalize into the same internal `AssistantMessage` content block vocabulary, but the evidence in this node only establishes same-shape event outputs, not a shared parser abstraction.[I][E: packages/ai/src/api/openai-completions.ts:389][E: packages/ai/src/api/openai-completions.ts:433][E: packages/ai/src/api/openai-completions.ts:441][E: packages/ai/src/api/openai-completions.ts:467][E: packages/ai/src/api/openai-responses-shared.ts:427][E: packages/ai/src/api/openai-responses-shared.ts:475][E: packages/ai/src/api/openai-responses-shared.ts:484][E: packages/ai/src/api/openai-responses-shared.ts:527]

## 设计动机与权衡

Compat detection/resolution lets one Chat Completions implementation target OpenAI and many OpenAI-compatible providers;detected defaults cover provider/baseURL families,then explicit `model.compat` fields override individual capabilities.[E: packages/ai/src/api/openai-completions.ts:1584][E: packages/ai/src/api/openai-completions.ts:1588][E: packages/ai/src/api/openai-completions.ts:1604][E: packages/ai/src/api/openai-completions.ts:1635][E: packages/ai/src/api/openai-completions.ts:1687][E: packages/ai/src/api/openai-completions.ts:1688][E: packages/ai/src/api/openai-completions.ts:1691][E: packages/ai/src/api/openai-completions.ts:1692]

Client auth treats explicit API key as primary,Authorization-style headers as sufficient fallback with dummy key `"unused"`,and absence of both as a provider-specific error;this supports providers/proxies that authenticate entirely through headers.[E: packages/ai/src/api/openai-completions.ts:82][E: packages/ai/src/api/openai-completions.ts:83][E: packages/ai/src/api/openai-completions.ts:84][E: packages/ai/src/api/openai-completions.ts:85]

## gotcha

- Default `supportsFinishReason` still requires a provider `finish_reason`: after stream end, absence throws `"Stream ended without finish_reason"` and emits an error event. Compat `supportsFinishReason: false` instead infers `toolUse` or `stop`.[E: packages/ai/src/api/openai-completions.ts:690][E: packages/ai/src/api/openai-completions.ts:696][E: packages/ai/src/api/openai-completions.ts:697][E: packages/ai/src/api/openai-completions.ts:723]
- `streamSimple` does not directly send `SimpleStreamOptions.reasoning`;it clamps reasoning with `clampThinkingLevel`,turns `"off"` into undefined,then forwards `reasoningEffort` into `stream`.[E: packages/ai/src/api/openai-completions.ts:739][E: packages/ai/src/api/openai-completions.ts:742][E: packages/ai/src/api/openai-completions.ts:743][E: packages/ai/src/api/openai-completions.ts:745][E: packages/ai/src/api/openai-completions.ts:747]
- Cache control has two different mechanisms:OpenAI-style `prompt_cache_key` / `prompt_cache_retention` in params,plus Anthropic-compatible `cache_control` inserted into system prompt, last tool, and last conversation message when compat requests Anthropic cache control.[E: packages/ai/src/api/openai-completions.ts:821][E: packages/ai/src/api/openai-completions.ts:826][E: packages/ai/src/api/openai-completions.ts:1068][E: packages/ai/src/api/openai-completions.ts:1072][E: packages/ai/src/api/openai-completions.ts:1080][E: packages/ai/src/api/openai-completions.ts:1085][E: packages/ai/src/api/openai-completions.ts:1086][E: packages/ai/src/api/openai-completions.ts:1087]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - 上游 dispatch 层按 `model.api === "openai-completions"` 进入本 wire implementation;本节点只覆盖进入 `stream` 后的 Chat Completions request/stream behavior。[I]
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire path uses `openai-responses-shared.ts` for Responses input/tool/event conversion;本节点对 shared 文件的描述只用于划清与 Chat Completions 的协议边界。[E: packages/ai/src/api/openai-responses-shared.ts:145][E: packages/ai/src/api/openai-responses-shared.ts:361][E: packages/ai/src/api/openai-responses-shared.ts:434]

## 本轮 stream 状态、finish reason 与 fetch 变化

Accumulator 从 `pending` 开始；chunk 的原始 `finish_reason` 同时写入 `rawStopReason` 与 unified `stopReason`。默认仍要求 provider 给出 finish reason；只有 compat 显式 `supportsFinishReason: false` 时，流结束后才从是否存在 tool call 推断 `toolUse` 或 `stop`。[E: packages/ai/src/api/openai-completions.ts:309] [E: packages/ai/src/api/openai-completions.ts:323] [E: packages/ai/src/api/openai-completions.ts:576] [E: packages/ai/src/api/openai-completions.ts:583] [E: packages/ai/src/api/openai-completions.ts:687] [E: packages/ai/src/api/openai-completions.ts:700]

Client factory 默认先写 `User-Agent: getPiUserAgent()`，再 overlay `model.headers` 与 request headers；`options.fetch` 传给 SDK [E: packages/ai/src/api/openai-completions.ts:761] [E: packages/ai/src/api/openai-completions.ts:784] [E: packages/ai/src/utils/pi-user-agent.ts:17]。function tool delta 同时带空 `custom: {}` 时也不会再被误判为 custom grammar call。[E: packages/ai/src/api/openai-completions.ts:648]

## Sources

- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/types.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/test/openai-completions-tool-result-images.test.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api` 到 `api/<name>.ts` implementation 的派发边界。
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire 协议及 `openai-responses-shared.ts` 的主使用方。
