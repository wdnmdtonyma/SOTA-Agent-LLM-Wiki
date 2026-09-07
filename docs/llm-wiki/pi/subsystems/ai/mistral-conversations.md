---
id: subsys.ai.mistral-conversations
title: Mistral Conversations 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/mistral-conversations.ts
  - packages/ai/src/utils/pi-user-agent.ts
  - packages/ai/test/mistral-http-transport.test.ts
symbols:
  - stream
  - streamSimple
  - MistralOptions
related:
  - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 9767ba275f
---

> `subsys.ai.mistral-conversations` 描述 `pi-ai` 的 Mistral Conversations wire implementation：它把统一 `Context` 和 `MistralOptions` 转成 native HTTP `POST {baseUrl}/v1/chat/completions` SSE 请求，再把 Mistral streaming chunk 归一为 `AssistantMessageEventStream`。实现不再创建 Mistral SDK client。

## 能回答的问题

- `mistral-conversations` 的 `stream` 入口如何构造 payload、用什么 HTTP 端点、怎样消费 SSE?
- `MistralOptions` 支持哪些 provider-specific 字段，以及 `streamSimple` 如何选择 reasoning 参数?
- camelCase payload 如何 remap 成 Mistral wire 的 snake_case JSON?
- user/assistant/toolResult message 如何转成 Mistral chat message?
- pi `Tool[]` 和 streaming tool call delta 如何在 Mistral request/event 两侧转换?
- Mistral usage、prompt cache、stop reason 和错误如何映射回 pi `AssistantMessage`?

## 职责边界

`packages/ai/src/api/mistral-conversations.ts` 导出 `stream`，返回 `AssistantMessageEventStream`，并在异步闭包中完成 API key 检查、payload 构造、`requestMistralStream()` HTTP 调用和 event consumption [E: packages/ai/src/api/mistral-conversations.ts:122] [E: packages/ai/src/api/mistral-conversations.ts:133] [E: packages/ai/src/api/mistral-conversations.ts:141] [E: packages/ai/src/api/mistral-conversations.ts:146] [E: packages/ai/src/api/mistral-conversations.ts:148]。

`MistralOptions` 扩展通用 `StreamOptions`，额外暴露 `toolChoice`、`promptMode?: "reasoning"` 和 `reasoningEffort?: "none" | "high"` [E: packages/ai/src/api/mistral-conversations.ts:34] [E: packages/ai/src/api/mistral-conversations.ts:35] [E: packages/ai/src/api/mistral-conversations.ts:36] [E: packages/ai/src/api/mistral-conversations.ts:37]。

`stream` 的 output accumulator 初始化为 assistant role、当前 `model.api`、`model.provider`、`model.id`、零值 usage、`stopReason: "pending"` 和当前 timestamp [E: packages/ai/src/api/mistral-conversations.ts:207] [E: packages/ai/src/api/mistral-conversations.ts:209] [E: packages/ai/src/api/mistral-conversations.ts:210] [E: packages/ai/src/api/mistral-conversations.ts:211] [E: packages/ai/src/api/mistral-conversations.ts:222]。

`subsys.ai.wire-protocol-dispatch` 覆盖 `Models.stream` 如何按 `model.api` 找到 lazy `ProviderStreams`；本节点只覆盖进入 `mistral-conversations.ts` 之后的 request/message/tool/event/usage/error 转换。[I]

## Native HTTP transport

`stream` 要求 `options.apiKey`，缺失时抛出 `No API key for provider: ${model.provider}` [E: packages/ai/src/api/mistral-conversations.ts:133] [E: packages/ai/src/api/mistral-conversations.ts:134] [E: packages/ai/src/api/mistral-conversations.ts:135]。

`requestMistralStream` 用 `model.baseUrl` 解析 URL，再相对它打开 `v1/chat/completions`；默认模型因此打到 `https://api.mistral.ai/v1/chat/completions` [E: packages/ai/src/api/mistral-conversations.ts:293] [E: packages/ai/src/api/mistral-conversations.ts:294] [E: packages/ai/src/api/mistral-conversations.ts:295] [E: packages/ai/test/mistral-http-transport.test.ts:109]。请求是 `POST`，body 是 `toMistralWirePayload(payload)` 的 JSON，fetch 使用 `options.fetch ?? globalThis.fetch` [E: packages/ai/src/api/mistral-conversations.ts:299] [E: packages/ai/src/api/mistral-conversations.ts:300] [E: packages/ai/src/api/mistral-conversations.ts:302]。

超时默认 `options.timeoutMs ?? 60_000`，通过 `AbortSignal.timeout` 实现；若 caller 提供 `options.signal`，则与 timeout signal `AbortSignal.any` 合并 [E: packages/ai/src/api/mistral-conversations.ts:297] [E: packages/ai/src/api/mistral-conversations.ts:298]。

`options.onPayload` 可以在发送前替换完整 payload；callback 返回 `undefined` 时保留原 payload [E: packages/ai/src/api/mistral-conversations.ts:141] [E: packages/ai/src/api/mistral-conversations.ts:142] [E: packages/ai/src/api/mistral-conversations.ts:143]。`options.onResponse` 在收到 HTTP response 后立刻调用，参数是 `{ status, headers }` [E: packages/ai/src/api/mistral-conversations.ts:306] [E: packages/ai/test/mistral-http-transport.test.ts:119]。

非 2xx 响应读出 body 后抛 `MistralHttpError(status, body, statusText)`；没有 body 则抛 `Mistral response has no body` [E: packages/ai/src/api/mistral-conversations.ts:308] [E: packages/ai/src/api/mistral-conversations.ts:310] [E: packages/ai/src/api/mistral-conversations.ts:312] [E: packages/ai/src/api/mistral-conversations.ts:313]。成功路径把 `response.body` 交给 `readMistralEvents()` 做 SSE 解析 [E: packages/ai/src/api/mistral-conversations.ts:316]。

## Headers 与 wire payload

`buildMistralHeaders` 默认先写 `User-Agent: getPiUserAgent()`，再固定 `accept: text/event-stream`、`authorization: Bearer ${apiKey}`、`content-type: application/json`，然后 overlay `model.headers` 与 `options.headers` [E: packages/ai/src/api/mistral-conversations.ts:332] [E: packages/ai/src/api/mistral-conversations.ts:333] [E: packages/ai/src/utils/pi-user-agent.ts:17] [E: packages/ai/src/api/mistral-conversations.ts:334] [E: packages/ai/src/api/mistral-conversations.ts:335] [E: packages/ai/src/api/mistral-conversations.ts:336] [E: packages/ai/src/api/mistral-conversations.ts:338] [E: packages/ai/src/api/mistral-conversations.ts:339]。启用 prompt caching 且 caller 未显式给 `x-affinity` 时，把 `options.sessionId` 写入 `x-affinity` [E: packages/ai/src/api/mistral-conversations.ts:343] [E: packages/ai/src/api/mistral-conversations.ts:344]。

Prompt caching 的本地启用条件是 `cacheRetention !== "none"` 且存在 `sessionId`；同一 predicate 同时控制 request body 的 `promptCacheKey` 和 header 的 `x-affinity` [E: packages/ai/src/api/mistral-conversations.ts:521] [E: packages/ai/src/api/mistral-conversations.ts:533] [E: packages/ai/src/api/mistral-conversations.ts:534]。

`toMistralWirePayload` 把内部 camelCase 字段 remap 成 Mistral snake_case：`maxTokens`→`max_tokens`、`promptMode`→`prompt_mode`、`reasoningEffort`→`reasoning_effort`、`toolChoice`→`tool_choice`、`promptCacheKey`→`prompt_cache_key`，以及 `topP` / `randomSeed` / `responseFormat` / `presencePenalty` / `frequencyPenalty` / `parallelToolCalls` / `safePrompt` [E: packages/ai/src/api/mistral-conversations.ts:362] [E: packages/ai/src/api/mistral-conversations.ts:365] [E: packages/ai/src/api/mistral-conversations.ts:366] [E: packages/ai/src/api/mistral-conversations.ts:372] [E: packages/ai/src/api/mistral-conversations.ts:373] [E: packages/ai/src/api/mistral-conversations.ts:374] [E: packages/ai/src/api/mistral-conversations.ts:375]。`response_format.jsonSchema` 再 remap 为 `json_schema`，其中 `schemaDefinition` 变成 `schema` [E: packages/ai/src/api/mistral-conversations.ts:385] [E: packages/ai/src/api/mistral-conversations.ts:389]。测试断言 wire JSON 不再保留 camelCase 源键 [E: packages/ai/test/mistral-http-transport.test.ts:146] [E: packages/ai/test/mistral-http-transport.test.ts:147] [E: packages/ai/test/mistral-http-transport.test.ts:148]。

message 侧 `toolCalls`/`toolCallId` 变成 `tool_calls`/`tool_call_id`；content chunk 的 `imageUrl` 变成 `image_url` [E: packages/ai/src/api/mistral-conversations.ts:400] [E: packages/ai/src/api/mistral-conversations.ts:401] [E: packages/ai/src/api/mistral-conversations.ts:411]。

## request payload 构造

`buildChatPayload` 总是设置 `model: model.id`、`stream: true` 和 `messages: toChatMessages(...)`；当 `context.tools` 非空时写入 `tools`，当 temperature/maxTokens/toolChoice/promptMode/reasoningEffort/prompt cache 条件存在时分别写入对应字段 [E: packages/ai/src/api/mistral-conversations.ts:509] [E: packages/ai/src/api/mistral-conversations.ts:510] [E: packages/ai/src/api/mistral-conversations.ts:511] [E: packages/ai/src/api/mistral-conversations.ts:512] [E: packages/ai/src/api/mistral-conversations.ts:515] [E: packages/ai/src/api/mistral-conversations.ts:516] [E: packages/ai/src/api/mistral-conversations.ts:517] [E: packages/ai/src/api/mistral-conversations.ts:518] [E: packages/ai/src/api/mistral-conversations.ts:519] [E: packages/ai/src/api/mistral-conversations.ts:520] [E: packages/ai/src/api/mistral-conversations.ts:521]。

`context.systemPrompt` 会被 `sanitizeSurrogates` 清洗后作为 role `system` message 插到 payload messages 开头 [E: packages/ai/src/api/mistral-conversations.ts:523] [E: packages/ai/src/api/mistral-conversations.ts:524] [E: packages/ai/src/api/mistral-conversations.ts:525] [E: packages/ai/src/api/mistral-conversations.ts:526]。

## streamSimple 与 reasoning

`streamSimple` 是 `SimpleStreamOptions` 到 `MistralOptions` 的 adapter：它检查 API key，调用 `buildBaseOptions`，用 `clampThinkingLevel` 处理 `options.reasoning`，再把结果转交给同文件的 `stream` [E: packages/ai/src/api/mistral-conversations.ts:181] [E: packages/ai/src/api/mistral-conversations.ts:186] [E: packages/ai/src/api/mistral-conversations.ts:192] [E: packages/ai/src/api/mistral-conversations.ts:195] [E: packages/ai/src/api/mistral-conversations.ts:199]。

当模型支持 reasoning 且 caller 提供的 reasoning 未被 clamp 为 `"off"` 时，`streamSimple` 对 `usesPromptModeReasoning(model)` 的模型设置 `promptMode: "reasoning"`，对 `usesReasoningEffort(model)` 的模型设置 `reasoningEffort` [E: packages/ai/src/api/mistral-conversations.ts:197] [E: packages/ai/src/api/mistral-conversations.ts:201] [E: packages/ai/src/api/mistral-conversations.ts:202] [E: packages/ai/src/api/mistral-conversations.ts:203]。

`usesReasoningEffort` 当前只匹配 `mistral-small-2603`、`mistral-small-latest` 和 `mistral-medium-3.5`；`usesPromptModeReasoning` 则要求 `model.reasoning` 为真且不匹配 `usesReasoningEffort` [E: packages/ai/src/api/mistral-conversations.ts:893] [E: packages/ai/src/api/mistral-conversations.ts:894] [E: packages/ai/src/api/mistral-conversations.ts:897] [E: packages/ai/src/api/mistral-conversations.ts:898]。

`mapReasoningEffort` 先查 `model.thinkingLevelMap?.[level]`，没有映射时默认返回 `"high"`；因此该 adapter 不把 `SimpleStreamOptions.thinkingBudgets` 直接传给 Mistral [E: packages/ai/src/api/mistral-conversations.ts:905] [I]。

## message 转换

`stream` 在 serializer 之前调用 `transformMessages(context.messages, model, normalizeMistralToolCallId)`，所以 unsupported image downgrade、errored assistant replay 跳过、orphaned tool result 合成和跨 provider tool call id normalization 先在 shared transform 层完成 [E: packages/ai/src/api/mistral-conversations.ts:138] [E: packages/ai/src/api/mistral-conversations.ts:139] [I]。

Mistral tool call id normalizer 使用两个 `Map` 维护原 id 到 Mistral id、Mistral id 到原 id 的双向关系；新 id 由 `deriveMistralToolCallId` 生成，冲突时增加 attempt 后重试 [E: packages/ai/src/api/mistral-conversations.ts:227] [E: packages/ai/src/api/mistral-conversations.ts:228] [E: packages/ai/src/api/mistral-conversations.ts:229] [E: packages/ai/src/api/mistral-conversations.ts:232] [E: packages/ai/src/api/mistral-conversations.ts:237]。

`deriveMistralToolCallId` 删除非字母数字字符，若 attempt 0 后正好是 9 个字符则直接复用，否则对原 seed 或 `seed:attempt` 做 `shortHash`、再过滤并截断到 9 个字符 [E: packages/ai/src/api/mistral-conversations.ts:26] [E: packages/ai/src/api/mistral-conversations.ts:250] [E: packages/ai/src/api/mistral-conversations.ts:251] [E: packages/ai/src/api/mistral-conversations.ts:254] [E: packages/ai/src/api/mistral-conversations.ts:256]。

`toChatMessages` 对 string user message 输出 `{ role: "user", content: sanitizeSurrogates(text) }`；对多模态 user message，它只保留 text 或模型支持 image 时的 image，并把 image 转为 data URL `image_url` chunk [E: packages/ai/src/api/mistral-conversations.ts:788] [E: packages/ai/src/api/mistral-conversations.ts:790] [E: packages/ai/src/api/mistral-conversations.ts:793] [E: packages/ai/src/api/mistral-conversations.ts:797] [E: packages/ai/src/api/mistral-conversations.ts:798]。

如果 user message 只有图片且模型不支持图片，`toChatMessages` 会生成文本占位 `(image omitted: model does not support images)`；如果过滤后没有可发送内容且不满足这个占位条件，该 user message 不会进入 result [E: packages/ai/src/api/mistral-conversations.ts:804] [E: packages/ai/src/api/mistral-conversations.ts:805] [E: packages/ai/src/api/mistral-conversations.ts:807]。

assistant 历史消息会拆成 `contentParts` 和 `toolCalls`：非空 text block 转 text content chunk，非空 thinking block 转 Mistral `thinking` content chunk，toolCall block 转 `{ id, type: "function", function: { name, arguments: JSON.stringify(...) } }`；只有存在 content 或 tool call 时才 push assistant message [E: packages/ai/src/api/mistral-conversations.ts:811] [E: packages/ai/src/api/mistral-conversations.ts:815] [E: packages/ai/src/api/mistral-conversations.ts:821] [E: packages/ai/src/api/mistral-conversations.ts:830] [E: packages/ai/src/api/mistral-conversations.ts:838] [E: packages/ai/src/api/mistral-conversations.ts:841]。

tool result message 会把 text parts 用换行拼接，再由 `buildToolResultText` 加上 error prefix、图片省略说明或空输出占位；模型支持图片时，tool result 的 image parts 会追加为 data URL `image_url` chunks [E: packages/ai/src/api/mistral-conversations.ts:846] [E: packages/ai/src/api/mistral-conversations.ts:851] [E: packages/ai/src/api/mistral-conversations.ts:852] [E: packages/ai/src/api/mistral-conversations.ts:856] [E: packages/ai/src/api/mistral-conversations.ts:858]。

`buildToolResultText` 对纯文本、图片、有无 image support、`isError` 四种输入维度生成最终 tool result text；没有文本也没有图片时返回 `(no tool output)` 或 `[tool error] (no tool output)` [E: packages/ai/src/api/mistral-conversations.ts:872] [E: packages/ai/src/api/mistral-conversations.ts:876] [E: packages/ai/src/api/mistral-conversations.ts:890]。

## tool request 与 tool event

`toFunctionTools` 把 pi `Tool[]` 映射成 Mistral function tools：tool name、description 和 parameters 进入 function 字段；parameters 先经过 `getJsonSchemaToolParameters(tool, strict)` 与 `stripSymbolKeys`，`strict` 来自 `resolveJsonSchemaStrictSampling(tool, true)`，缺失时回落 `false` [E: packages/ai/src/api/mistral-conversations.ts:753] [E: packages/ai/src/api/mistral-conversations.ts:755] [E: packages/ai/src/api/mistral-conversations.ts:761] [E: packages/ai/src/api/mistral-conversations.ts:762]。

`stripSymbolKeys` 递归处理数组和普通对象，对象路径只遍历 `Object.entries(value)` 的 string-keyed entries，所以 symbol-keyed metadata 不会进入最终 JSON schema object [E: packages/ai/src/api/mistral-conversations.ts:768] [E: packages/ai/src/api/mistral-conversations.ts:775] [E: packages/ai/src/api/mistral-conversations.ts:776]。

`mapToolChoice` 允许 `"auto" | "none" | "any" | "required"` 原样穿透，函数定向选择则只保留 `{ type: "function", function: { name } }` [E: packages/ai/src/api/mistral-conversations.ts:911] [E: packages/ai/src/api/mistral-conversations.ts:912] [E: packages/ai/src/api/mistral-conversations.ts:915]。

streaming tool call delta 到来时，当前 text/thinking block 会先结束；如果 Mistral chunk 没给有效 id（缺省或字面 `"null"`），本实现用 `deriveMistralToolCallId(\`toolcall:${toolCall.index ?? 0}\`, 0)` 生成 `callId`。合并同一碎片的 key 是 `toolCall.index ?? callId`，因此同 index、无 id 的后续 delta 会拼到同一个 `toolCall` block [E: packages/ai/src/api/mistral-conversations.ts:688] [E: packages/ai/src/api/mistral-conversations.ts:692] [E: packages/ai/src/api/mistral-conversations.ts:693] [E: packages/ai/src/api/mistral-conversations.ts:695] [E: packages/ai/src/api/mistral-conversations.ts:696]。

首次看到某个 tool call key 时，本实现创建 pi `toolCall` block，初始化 `arguments: {}` 和 streaming scratch buffer `partialArgs: ""`，并发送 `toolcall_start`；后续 delta 追加到 `partialArgs`，用 `parseStreamingJson` 尝试更新 parsed arguments，并发送 `toolcall_delta` [E: packages/ai/src/api/mistral-conversations.ts:707] [E: packages/ai/src/api/mistral-conversations.ts:712] [E: packages/ai/src/api/mistral-conversations.ts:713] [E: packages/ai/src/api/mistral-conversations.ts:717] [E: packages/ai/src/api/mistral-conversations.ts:724] [E: packages/ai/src/api/mistral-conversations.ts:725]。

Mistral stream 结束后，所有 tool call block 会用最终 `partialArgs` 再解析一次，删除 scratch buffer，并发送 `toolcall_end`；catch 路径也会遍历 output content 删除残留 `partialArgs` [E: packages/ai/src/api/mistral-conversations.ts:735] [E: packages/ai/src/api/mistral-conversations.ts:740] [E: packages/ai/src/api/mistral-conversations.ts:743] [E: packages/ai/src/api/mistral-conversations.ts:164] [E: packages/ai/src/api/mistral-conversations.ts:166]。

## SSE、event 与 usage

`readMistralEvents` 用 `ReadableStream` reader + `TextDecoder` 按多种 `\r`/`\n` 边界切 SSE event；`data: [DONE]` 结束迭代，其它 `data:` 行 JSON.parse 后要求存在 `choices` 数组 [E: packages/ai/src/api/mistral-conversations.ts:435] [E: packages/ai/src/api/mistral-conversations.ts:486] [E: packages/ai/src/api/mistral-conversations.ts:494] [E: packages/ai/src/api/mistral-conversations.ts:497] [E: packages/ai/src/api/mistral-conversations.ts:498]。abort 时 cancel reader [E: packages/ai/src/api/mistral-conversations.ts:442] [E: packages/ai/src/api/mistral-conversations.ts:449]。

`consumeChatStream` 迭代这些 event，取 `event.data` 为 chunk，并把第一个非空 `chunk.id` 记录为 `output.responseId` [E: packages/ai/src/api/mistral-conversations.ts:590] [E: packages/ai/src/api/mistral-conversations.ts:594]。

usage chunk 会把 prompt tokens 拆成 pi `usage.input` 与 `usage.cacheRead`，把 completion tokens 写入 `usage.output`，把 cache write 固定为 0，把 total tokens 设为 Mistral total 或本地四项相加，最后调用 `calculateCost(model, output.usage)` [E: packages/ai/src/api/mistral-conversations.ts:596] [E: packages/ai/src/api/mistral-conversations.ts:600] [E: packages/ai/src/api/mistral-conversations.ts:601] [E: packages/ai/src/api/mistral-conversations.ts:603] [E: packages/ai/src/api/mistral-conversations.ts:607]。

`getMistralCachedPromptTokens` 兼容多种 cached prompt token 字段命名，只接受 finite number，并把结果 clamp 到 `[0, promptTokens]` [E: packages/ai/src/api/mistral-conversations.ts:537] [E: packages/ai/src/api/mistral-conversations.ts:554] [E: packages/ai/src/api/mistral-conversations.ts:555]。

text delta 支持两种 Mistral content 形态：当 `delta.content` 是 string 时按单个 text delta 处理；当它是 content item array 时，`item.type === "text"` 也进入 text block，`item.type === "thinking"` 则把 thinking parts 中的 text 拼接后进入 thinking block [E: packages/ai/src/api/mistral-conversations.ts:624] [E: packages/ai/src/api/mistral-conversations.ts:626] [E: packages/ai/src/api/mistral-conversations.ts:644] [E: packages/ai/src/api/mistral-conversations.ts:667]。

text/thinking block 状态是互斥的：切换 block 类型前会调用 `finishCurrentBlock`，新 block 创建时发送 `text_start` 或 `thinking_start`，追加 delta 时发送 `text_delta` 或 `thinking_delta` [E: packages/ai/src/api/mistral-conversations.ts:628] [E: packages/ai/src/api/mistral-conversations.ts:632] [E: packages/ai/src/api/mistral-conversations.ts:651] [E: packages/ai/src/api/mistral-conversations.ts:655]。

Mistral finish reason 通过 `mapChatStopReason` 转为 pi `StopReason`：null/`stop` 归为 `stop`，`length` 和 `model_length` 归为 `length`，`tool_calls` 归为 `toolUse`，`error` 与未知值归为 `error`（未知值带 `Provider stopped with: ...`） [E: packages/ai/src/api/mistral-conversations.ts:613] [E: packages/ai/src/api/mistral-conversations.ts:921] [E: packages/ai/src/api/mistral-conversations.ts:924] [E: packages/ai/src/api/mistral-conversations.ts:926] [E: packages/ai/src/api/mistral-conversations.ts:929] [E: packages/ai/src/api/mistral-conversations.ts:931] [E: packages/ai/src/api/mistral-conversations.ts:934]。

正常路径在消费完 stream 后检查 abort signal 和 terminal stop reason，再发送 `{ type: "done", reason, message }` 并结束 stream；流结束仍 `pending` 时抛 `Mistral stream ended without a finish reason`；如果 output stop reason 已经是 `aborted` 或 `error`，它会转入 catch 的 error event 路径 [E: packages/ai/src/api/mistral-conversations.ts:150] [E: packages/ai/src/api/mistral-conversations.ts:154] [E: packages/ai/src/api/mistral-conversations.ts:155] [E: packages/ai/src/api/mistral-conversations.ts:157] [E: packages/ai/src/api/mistral-conversations.ts:161]。

## 错误和边界

catch 路径把 `output.stopReason` 设为 `aborted` 或 `error`，把 `formatMistralError(error)` 写入 `output.errorMessage`，然后发送 `{ type: "error", reason, error: output }` 并结束 stream [E: packages/ai/src/api/mistral-conversations.ts:168] [E: packages/ai/src/api/mistral-conversations.ts:169] [E: packages/ai/src/api/mistral-conversations.ts:170]。

`formatMistralError` 识别 error 上的 numeric `statusCode` 和 string `body`（`MistralHttpError` 提供这两项）；同时存在时输出 `Mistral API error (${statusCode})` 加截断后的 body，只有 status code 时输出 status code 加 `error.message`，普通 Error 返回 message，非 Error 走 safe JSON stringify [E: packages/ai/src/api/mistral-conversations.ts:259] [E: packages/ai/src/api/mistral-conversations.ts:262] [E: packages/ai/src/api/mistral-conversations.ts:264] [E: packages/ai/src/api/mistral-conversations.ts:267] [E: packages/ai/src/api/mistral-conversations.ts:268] [E: packages/ai/src/api/mistral-conversations.ts:270] [E: packages/ai/src/api/mistral-conversations.ts:319]。

Mistral error body 最多保留 4000 字符，超过时追加 truncated 字符数说明；非 Error fallback 的 JSON stringify 若返回 `undefined` 或抛错，会退回 `String(value)` [E: packages/ai/src/api/mistral-conversations.ts:27] [E: packages/ai/src/api/mistral-conversations.ts:273] [E: packages/ai/src/api/mistral-conversations.ts:275] [E: packages/ai/src/api/mistral-conversations.ts:281]。

本实现只使用第一条 choice，因为 `consumeChatStream` 每个 chunk 读取 `chunk.choices[0]`，没有遍历其它 choices [E: packages/ai/src/api/mistral-conversations.ts:610] [E: packages/ai/src/api/mistral-conversations.ts:611] [I]。

## Sources

- packages/ai/src/api/mistral-conversations.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/test/mistral-http-transport.test.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `Models.stream`、lazy API 与 `model.api` 到 provider-specific wire module 的派发边界。
