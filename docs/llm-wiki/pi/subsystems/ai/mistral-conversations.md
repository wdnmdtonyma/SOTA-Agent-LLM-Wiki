---
id: subsys.ai.mistral-conversations
title: Mistral Conversations 协议
kind: subsystem
tier: T2
pkg: ai
source:
 - packages/ai/src/api/mistral-conversations.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/utils/pi-user-agent.ts
 - packages/ai/test/mistral-http-transport.test.ts
 - packages/ai/test/mistral-reasoning-mode.test.ts
symbols:
 - stream
 - streamSimple
 - MistralOptions
related:
 - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.ai.mistral-conversations` 描述 `pi-ai` 的 Mistral Conversations wire implementation：它把统一 `TranscriptContext` 和 `MistralOptions` 转成 native HTTP `POST {baseUrl}/v1/chat/completions` SSE 请求，再把 Mistral streaming chunk 归一为 `AssistantMessageEventStream`。实现不再创建 Mistral SDK client。

## 能回答的问题

- `mistral-conversations` 的 `stream` 入口如何构造 payload、用什么 HTTP 端点、怎样消费 SSE?
- `MistralOptions` 支持哪些 provider-specific 字段，以及 `streamSimple` 如何选择 reasoning 参数?
- camelCase payload 如何 remap 成 Mistral wire 的 snake_case JSON?
- user/assistant/toolResult message 如何转成 Mistral chat message?
- pi `Tool[]` 和 streaming tool call delta 如何在 Mistral request/event 两侧转换?
- Mistral usage、prompt cache、stop reason 和错误如何映射回 pi `AssistantMessage`?
- 空 content delta 为什么必须忽略,尤其是 GLM?
- `zai-glm-5-2` 走 `prompt_mode` 还是 `reasoning_effort`?

## 职责边界

`packages/ai/src/api/mistral-conversations.ts` 导出 `stream`，签名接收 `TranscriptContext`，返回 `AssistantMessageEventStream`。内部先 `resolveTranscript(context, model.compat?.supportsMidConvoSystemMessages)`，再完成 API key 检查、payload 构造、`requestMistralStream()` HTTP 调用和 event consumption。[E: packages/ai/src/api/mistral-conversations.ts:124] [E: packages/ai/src/api/mistral-conversations.ts:126] [E: packages/ai/src/api/mistral-conversations.ts:130] [E: packages/ai/src/api/mistral-conversations.ts:136]

`MistralOptions` 扩展通用 `StreamOptions`，额外暴露 `toolChoice`、`promptMode?: "reasoning"` 和 `reasoningEffort?: "none" | "high"` [E: packages/ai/src/api/mistral-conversations.ts:36] [E: packages/ai/src/api/mistral-conversations.ts:37] [E: packages/ai/src/api/mistral-conversations.ts:38] [E: packages/ai/src/api/mistral-conversations.ts:39]。

`stream` 的 output accumulator 初始化为 assistant role、当前 `model.api`、`model.provider`、`model.id`、零值 usage、`stopReason: "pending"` 和当前 timestamp [E: packages/ai/src/api/mistral-conversations.ts:219] [E: packages/ai/src/api/mistral-conversations.ts:221] [E: packages/ai/src/api/mistral-conversations.ts:222] [E: packages/ai/src/api/mistral-conversations.ts:223] [E: packages/ai/src/api/mistral-conversations.ts:232] [E: packages/ai/src/api/mistral-conversations.ts:233]。

`subsys.ai.wire-protocol-dispatch` 覆盖 `Models.stream` 如何按 `model.api` 找到 lazy `ProviderStreams`；本节点只覆盖进入 `mistral-conversations.ts` 之后的 request/message/tool/event/usage/error 转换。[I]

## Native HTTP transport

`stream` 要求 `options.apiKey`，缺失时抛出 `No API key for provider: ${model.provider}` [E: packages/ai/src/api/mistral-conversations.ts:136] [E: packages/ai/src/api/mistral-conversations.ts:137] [E: packages/ai/src/api/mistral-conversations.ts:138]。

`requestMistralStream` 用 `model.baseUrl` 解析 URL，再相对它打开 `v1/chat/completions`；默认模型因此打到 `https://api.mistral.ai/v1/chat/completions` [E: packages/ai/src/api/mistral-conversations.ts:303] [E: packages/ai/src/api/mistral-conversations.ts:304] [E: packages/ai/src/api/mistral-conversations.ts:305] [E: packages/ai/test/mistral-http-transport.test.ts:109]。请求是 `POST`，body 是 `toMistralWirePayload(payload)` 的 JSON，fetch 使用 `options.fetch ?? globalThis.fetch` [E: packages/ai/src/api/mistral-conversations.ts:309] [E: packages/ai/src/api/mistral-conversations.ts:310] [E: packages/ai/src/api/mistral-conversations.ts:312]。

超时默认 `options.timeoutMs ?? 60_000`，通过 `AbortSignal.timeout` 实现；若 caller 提供 `options.signal`，则与 timeout signal `AbortSignal.any` 合并 [E: packages/ai/src/api/mistral-conversations.ts:307] [E: packages/ai/src/api/mistral-conversations.ts:308]。

`options.onPayload` 可以在发送前替换完整 payload；callback 返回 `undefined` 时保留原 payload [E: packages/ai/src/api/mistral-conversations.ts:141] [E: packages/ai/src/api/mistral-conversations.ts:147] [E: packages/ai/src/api/mistral-conversations.ts:148]。`options.onResponse` 在收到 HTTP response 后立刻调用，参数是 `{ status, headers }` [E: packages/ai/src/api/mistral-conversations.ts:316] [E: packages/ai/test/mistral-http-transport.test.ts:119]。

非 2xx 响应读出 body 后抛 `MistralHttpError(status, body, statusText)`；没有 body 则抛 `Mistral response has no body` [E: packages/ai/src/api/mistral-conversations.ts:318] [E: packages/ai/src/api/mistral-conversations.ts:320] [E: packages/ai/src/api/mistral-conversations.ts:322] [E: packages/ai/src/api/mistral-conversations.ts:323]。成功路径把 `response.body` 交给 `readMistralEvents()` 做 SSE 解析 [E: packages/ai/src/api/mistral-conversations.ts:326]。

## Headers 与 wire payload

`buildMistralHeaders` 默认先写 `User-Agent: getPiUserAgent()`，再固定 `accept: text/event-stream`、`authorization: Bearer ${apiKey}`、`content-type: application/json`，然后 overlay `model.headers` 与 `options.headers` [E: packages/ai/src/api/mistral-conversations.ts:342] [E: packages/ai/src/api/mistral-conversations.ts:343] [E: packages/ai/src/utils/pi-user-agent.ts:17] [E: packages/ai/src/api/mistral-conversations.ts:344] [E: packages/ai/src/api/mistral-conversations.ts:345] [E: packages/ai/src/api/mistral-conversations.ts:346] [E: packages/ai/src/api/mistral-conversations.ts:348] [E: packages/ai/src/api/mistral-conversations.ts:349]。启用 prompt caching 且 caller 未显式给 `x-affinity` 时，把 `options.sessionId` 写入 `x-affinity` [E: packages/ai/src/api/mistral-conversations.ts:353] [E: packages/ai/src/api/mistral-conversations.ts:354]。

Prompt caching 的本地启用条件是 `cacheRetention !== "none"` 且存在 `sessionId`；同一 predicate 同时控制 request body 的 `promptCacheKey` 和 header 的 `x-affinity` [E: packages/ai/src/api/mistral-conversations.ts:532] [E: packages/ai/src/api/mistral-conversations.ts:537] [E: packages/ai/src/api/mistral-conversations.ts:538]。

`toMistralWirePayload` 把内部 camelCase 字段 remap 成 Mistral snake_case：`maxTokens`→`max_tokens`、`promptMode`→`prompt_mode`、`reasoningEffort`→`reasoning_effort`、`toolChoice`→`tool_choice`、`promptCacheKey`→`prompt_cache_key`，以及 `topP` / `randomSeed` / `responseFormat` / `presencePenalty` / `frequencyPenalty` / `parallelToolCalls` / `safePrompt` [E: packages/ai/src/api/mistral-conversations.ts:372] [E: packages/ai/src/api/mistral-conversations.ts:375] [E: packages/ai/src/api/mistral-conversations.ts:376] [E: packages/ai/src/api/mistral-conversations.ts:382] [E: packages/ai/src/api/mistral-conversations.ts:383] [E: packages/ai/src/api/mistral-conversations.ts:384] [E: packages/ai/src/api/mistral-conversations.ts:385]。`response_format.jsonSchema` 再 remap 为 `json_schema`，其中 `schemaDefinition` 变成 `schema` [E: packages/ai/src/api/mistral-conversations.ts:395] [E: packages/ai/src/api/mistral-conversations.ts:399]。测试断言 wire JSON 不再保留 camelCase 源键 [E: packages/ai/test/mistral-http-transport.test.ts:146] [E: packages/ai/test/mistral-http-transport.test.ts:147] [E: packages/ai/test/mistral-http-transport.test.ts:148]。

message 侧 `toolCalls`/`toolCallId` 变成 `tool_calls`/`tool_call_id`；content chunk 的 `imageUrl` 变成 `image_url` [E: packages/ai/src/api/mistral-conversations.ts:410] [E: packages/ai/src/api/mistral-conversations.ts:411] [E: packages/ai/src/api/mistral-conversations.ts:421]。

## request payload 构造

`buildChatPayload` 总是设置 `model: model.id`、`stream: true` 和 `messages: toChatMessages(...)`；当 `getCurrentTools(context.messages)` 非空时写入 `tools`，当 temperature/maxTokens/toolChoice/promptMode/reasoningEffort/prompt cache 条件存在时分别写入对应字段。[E: packages/ai/src/api/mistral-conversations.ts:519] [E: packages/ai/src/api/mistral-conversations.ts:520] [E: packages/ai/src/api/mistral-conversations.ts:525] [E: packages/ai/src/api/mistral-conversations.ts:526]

`toChatMessages` 把 transcript 里的 system 消息写成 role `system`:leading 用 `getSystemMessageText`,later 用 `renderSystemMessageUpdate`。不再读 `context.systemPrompt`。[E: packages/ai/src/api/mistral-conversations.ts:798] [E: packages/ai/src/api/mistral-conversations.ts:799]

## streamSimple 与 reasoning

`streamSimple` 是 `SimpleStreamOptions` 到 `MistralOptions` 的 adapter：它检查 API key，调用 `buildBaseOptions`，用 `clampThinkingLevel` 处理 `options.reasoning`，再把结果转交给同文件的 `stream` [E: packages/ai/src/api/mistral-conversations.ts:186] [E: packages/ai/src/api/mistral-conversations.ts:191] [E: packages/ai/src/api/mistral-conversations.ts:197] [E: packages/ai/src/api/mistral-conversations.ts:200] [E: packages/ai/src/api/mistral-conversations.ts:210]。

`clampedReasoning === "off"` 会被收成 `undefined`；`shouldUseReasoning` 还要求 `model.reasoning` 为真且 reasoning 仍有值。因此 thinking 关闭、或模型本身不标 reasoning 时，两条 reasoning 字段都不会写入 [E: packages/ai/src/api/mistral-conversations.ts:200] [E: packages/ai/src/api/mistral-conversations.ts:201] [E: packages/ai/src/api/mistral-conversations.ts:203] [E: packages/ai/src/api/mistral-conversations.ts:206] [E: packages/ai/src/api/mistral-conversations.ts:208] [E: packages/ai/test/mistral-reasoning-mode.test.ts:64] [E: packages/ai/test/mistral-reasoning-mode.test.ts:114]。

当 `shouldUseReasoning` 为真时，`streamSimple` 对 `usesPromptModeReasoning(model)` 的模型设置 `promptMode: "reasoning"`，对 `usesReasoningEffort(model)` 的模型设置 `reasoningEffort`；两条分支互斥 [E: packages/ai/src/api/mistral-conversations.ts:206] [E: packages/ai/src/api/mistral-conversations.ts:207] [E: packages/ai/src/api/mistral-conversations.ts:208]。

`usesReasoningEffort` 精确匹配 `mistral-small-2603`、`mistral-small-latest`、**`zai-glm-5-2`**,以及任意 `mistral-medium-*`(`model.id.startsWith("mistral-medium-")`)。命中时发 `reasoning_effort`,不发被忽略的 `prompt_mode`。因此 GLM on Mistral 走 GLM `reasoning_effort`,不是 Magistral 的 `prompt_mode`。`usesPromptModeReasoning` 要求 `model.reasoning` 为真且不走 `usesReasoningEffort`。[E: packages/ai/src/api/mistral-conversations.ts:906] [E: packages/ai/src/api/mistral-conversations.ts:906] [E: packages/ai/src/api/mistral-conversations.ts:909] [E: packages/ai/src/api/mistral-conversations.ts:913] [E: packages/ai/test/mistral-reasoning-mode.test.ts:73]

`mapReasoningEffort` 先查 `model.thinkingLevelMap?.[level]`，没有映射时默认返回 `"high"`；因此该 adapter 不把 `SimpleStreamOptions.thinkingBudgets` 直接传给 Mistral [E: packages/ai/src/api/mistral-conversations.ts:922] [I]。

## message 转换

`stream` 在 serializer 之前调用 `transformMessages(context.messages, model, normalizeMistralToolCallId)`，所以 unsupported image downgrade、errored assistant replay 跳过、orphaned tool result 合成和跨 provider tool call id normalization 先在 shared transform 层完成 [E: packages/ai/src/api/mistral-conversations.ts:141] [E: packages/ai/src/api/mistral-conversations.ts:141] [I]。

Mistral tool call id normalizer 使用两个 `Map` 维护原 id 到 Mistral id、Mistral id 到原 id 的双向关系；新 id 由 `deriveMistralToolCallId` 生成，冲突时增加 attempt 后重试 [E: packages/ai/src/api/mistral-conversations.ts:237] [E: packages/ai/src/api/mistral-conversations.ts:238] [E: packages/ai/src/api/mistral-conversations.ts:239] [E: packages/ai/src/api/mistral-conversations.ts:242] [E: packages/ai/src/api/mistral-conversations.ts:247]。

`deriveMistralToolCallId` 删除非字母数字字符，若 attempt 0 后正好是 9 个字符则直接复用，否则对原 seed 或 `seed:attempt` 做 `shortHash`、再过滤并截断到 9 个字符 [E: packages/ai/src/api/mistral-conversations.ts:28] [E: packages/ai/src/api/mistral-conversations.ts:260] [E: packages/ai/src/api/mistral-conversations.ts:261] [E: packages/ai/src/api/mistral-conversations.ts:264] [E: packages/ai/src/api/mistral-conversations.ts:266]。

`toChatMessages` 对 string user message 输出 `{ role: "user", content: sanitizeSurrogates(text) }`；对多模态 user message，它只保留 text 或模型支持 image 时的 image，并把 image 转为 data URL `image_url` chunk [E: packages/ai/src/api/mistral-conversations.ts:804] [E: packages/ai/src/api/mistral-conversations.ts:806] [E: packages/ai/src/api/mistral-conversations.ts:809] [E: packages/ai/src/api/mistral-conversations.ts:813] [E: packages/ai/src/api/mistral-conversations.ts:814]。

如果 user message 只有图片且模型不支持图片，`toChatMessages` 会生成文本占位 `(image omitted: model does not support images)`；如果过滤后没有可发送内容且不满足这个占位条件，该 user message 不会进入 result [E: packages/ai/src/api/mistral-conversations.ts:820] [E: packages/ai/src/api/mistral-conversations.ts:821] [E: packages/ai/src/api/mistral-conversations.ts:823]。

assistant 历史消息会拆成 `contentParts` 和 `toolCalls`：非空 text block 转 text content chunk，非空 thinking block 转 Mistral `thinking` content chunk，toolCall block 转 `{ id, type: "function", function: { name, arguments: JSON.stringify(...) } }`；只有存在 content 或 tool call 时才 push assistant message [E: packages/ai/src/api/mistral-conversations.ts:827] [E: packages/ai/src/api/mistral-conversations.ts:831] [E: packages/ai/src/api/mistral-conversations.ts:837] [E: packages/ai/src/api/mistral-conversations.ts:846] [E: packages/ai/src/api/mistral-conversations.ts:854] [E: packages/ai/src/api/mistral-conversations.ts:857]。

tool result message 会把 text parts 用换行拼接，再由 `buildToolResultText` 加上 error prefix、图片省略说明或空输出占位；模型支持图片时，tool result 的 image parts 会追加为 data URL `image_url` chunks [E: packages/ai/src/api/mistral-conversations.ts:862] [E: packages/ai/src/api/mistral-conversations.ts:867] [E: packages/ai/src/api/mistral-conversations.ts:868] [E: packages/ai/src/api/mistral-conversations.ts:872] [E: packages/ai/src/api/mistral-conversations.ts:874]。

`buildToolResultText` 对纯文本、图片、有无 image support、`isError` 四种输入维度生成最终 tool result text；没有文本也没有图片时返回 `(no tool output)` 或 `[tool error] (no tool output)` [E: packages/ai/src/api/mistral-conversations.ts:888] [E: packages/ai/src/api/mistral-conversations.ts:892] [E: packages/ai/src/api/mistral-conversations.ts:906]。

## tool request 与 tool event

`toFunctionTools` 把 pi `Tool[]` 映射成 Mistral function tools：tool name、description 和 parameters 进入 function 字段；parameters 先经过 `getJsonSchemaToolParameters(tool, strict)` 与 `stripSymbolKeys`，`strict` 来自 `resolveJsonSchemaStrictSampling(tool, true)`，缺失时回落 `false` [E: packages/ai/src/api/mistral-conversations.ts:763] [E: packages/ai/src/api/mistral-conversations.ts:765] [E: packages/ai/src/api/mistral-conversations.ts:771] [E: packages/ai/src/api/mistral-conversations.ts:772]。

`stripSymbolKeys` 递归处理数组和普通对象，对象路径只遍历 `Object.entries(value)` 的 string-keyed entries，所以 symbol-keyed metadata 不会进入最终 JSON schema object [E: packages/ai/src/api/mistral-conversations.ts:778] [E: packages/ai/src/api/mistral-conversations.ts:785] [E: packages/ai/src/api/mistral-conversations.ts:786]。

`mapToolChoice` 允许 `"auto" | "none" | "any" | "required"` 原样穿透，函数定向选择则只保留 `{ type: "function", function: { name } }` [E: packages/ai/src/api/mistral-conversations.ts:912] [E: packages/ai/src/api/mistral-conversations.ts:913] [E: packages/ai/src/api/mistral-conversations.ts:916]。

streaming tool call delta 到来时，当前 text/thinking block 会先结束；如果 Mistral chunk 没给有效 id（缺省或字面 `"null"`），本实现用 `deriveMistralToolCallId(\`toolcall:${toolCall.index ?? 0}\`, 0)` 生成 `callId`。合并同一碎片的 key 是 `toolCall.index ?? callId`，因此同 index、无 id 的后续 delta 会拼到同一个 `toolCall` block [E: packages/ai/src/api/mistral-conversations.ts:698] [E: packages/ai/src/api/mistral-conversations.ts:702] [E: packages/ai/src/api/mistral-conversations.ts:703] [E: packages/ai/src/api/mistral-conversations.ts:705] [E: packages/ai/src/api/mistral-conversations.ts:706]。

首次看到某个 tool call key 时，本实现创建 pi `toolCall` block，初始化 `arguments: {}` 和 streaming scratch buffer `partialArgs: ""`，并发送 `toolcall_start`；后续 delta 追加到 `partialArgs`，用 `parseStreamingJson` 尝试更新 parsed arguments，并发送 `toolcall_delta` [E: packages/ai/src/api/mistral-conversations.ts:717] [E: packages/ai/src/api/mistral-conversations.ts:722] [E: packages/ai/src/api/mistral-conversations.ts:723] [E: packages/ai/src/api/mistral-conversations.ts:727] [E: packages/ai/src/api/mistral-conversations.ts:734] [E: packages/ai/src/api/mistral-conversations.ts:730]。

Mistral stream 结束后，所有 tool call block 会用最终 `partialArgs` 再解析一次，删除 scratch buffer，并发送 `toolcall_end`；catch 路径也会遍历 output content 删除残留 `partialArgs` [E: packages/ai/src/api/mistral-conversations.ts:745] [E: packages/ai/src/api/mistral-conversations.ts:745] [E: packages/ai/src/api/mistral-conversations.ts:753] [E: packages/ai/src/api/mistral-conversations.ts:169] [E: packages/ai/src/api/mistral-conversations.ts:171]。

## SSE、event 与 usage

`readMistralEvents` 用 `ReadableStream` reader + `TextDecoder` 按多种 `\r`/`\n` 边界切 SSE event；`data: [DONE]` 结束迭代，其它 `data:` 行 JSON.parse 后要求存在 `choices` 数组 [E: packages/ai/src/api/mistral-conversations.ts:445] [E: packages/ai/src/api/mistral-conversations.ts:449] [E: packages/ai/src/api/mistral-conversations.ts:492] [E: packages/ai/src/api/mistral-conversations.ts:504] [E: packages/ai/src/api/mistral-conversations.ts:507]。abort 时 cancel reader [E: packages/ai/src/api/mistral-conversations.ts:452] [E: packages/ai/src/api/mistral-conversations.ts:453]。

`consumeChatStream` 迭代这些 event，取 `event.data` 为 chunk，并把第一个非空 `chunk.id` 记录为 `output.responseId` [E: packages/ai/src/api/mistral-conversations.ts:595] [E: packages/ai/src/api/mistral-conversations.ts:600]。

usage chunk 会把 prompt tokens 拆成 pi `usage.input` 与 `usage.cacheRead`，把 completion tokens 写入 `usage.output`，把 cache write 固定为 0，把 total tokens 设为 Mistral total 或本地四项相加，最后调用 `calculateCost(model, output.usage)` [E: packages/ai/src/api/mistral-conversations.ts:602] [E: packages/ai/src/api/mistral-conversations.ts:606] [E: packages/ai/src/api/mistral-conversations.ts:607] [E: packages/ai/src/api/mistral-conversations.ts:609] [E: packages/ai/src/api/mistral-conversations.ts:613]。

`getMistralCachedPromptTokens` 兼容多种 cached prompt token 字段命名，只接受 finite number，并把结果 clamp 到 `[0, promptTokens]` [E: packages/ai/src/api/mistral-conversations.ts:541] [E: packages/ai/src/api/mistral-conversations.ts:558] [E: packages/ai/src/api/mistral-conversations.ts:559]。

text delta 支持两种 Mistral content 形态：当 `delta.content` 是 string 时按单个 text delta 处理；当它是 content item array 时，`item.type === "text"` 也进入 text block，`item.type === "thinking"` 则把 thinking parts 中的 text 拼接后进入 thinking block。[E: packages/ai/src/api/mistral-conversations.ts:630] [E: packages/ai/src/api/mistral-conversations.ts:632] [E: packages/ai/src/api/mistral-conversations.ts:653]

string content delta 在 `sanitizeSurrogates` 之后若为空字符串则 **continue,不 open text block**。GLM models on Mistral 会在 thinking 和 tool call 周围发 empty content deltas;给它们开 block 会把 thinking 拆成多块,replay 时被 Mistral 拒绝(`Expected at most one leading ThinkChunk`)。[E: packages/ai/src/api/mistral-conversations.ts:633] [E: packages/ai/src/api/mistral-conversations.ts:636]

text/thinking block 状态是互斥的：切换 block 类型前会调用 `finishCurrentBlock`，新 block 创建时发送 `text_start` 或 `thinking_start`，追加 delta 时发送 `text_delta` 或 `thinking_delta` [E: packages/ai/src/api/mistral-conversations.ts:637] [E: packages/ai/src/api/mistral-conversations.ts:641] [E: packages/ai/src/api/mistral-conversations.ts:660] [E: packages/ai/src/api/mistral-conversations.ts:664]。

Mistral finish reason 通过 `mapChatStopReason` 转为 pi `StopReason`：null/`stop` 归为 `stop`，`length` 和 `model_length` 归为 `length`，`tool_calls` 归为 `toolUse`，`error` 与未知值归为 `error`（未知值带 `Provider stopped with: ...`） [E: packages/ai/src/api/mistral-conversations.ts:619] [E: packages/ai/src/api/mistral-conversations.ts:922] [E: packages/ai/src/api/mistral-conversations.ts:925] [E: packages/ai/src/api/mistral-conversations.ts:927] [E: packages/ai/src/api/mistral-conversations.ts:930] [E: packages/ai/src/api/mistral-conversations.ts:932] [E: packages/ai/src/api/mistral-conversations.ts:935]。

正常路径在消费完 stream 后检查 abort signal 和 terminal stop reason，再发送 `{ type: "done", reason, message }` 并结束 stream；流结束仍 `pending` 时抛 `Mistral stream ended without a finish reason`；如果 output stop reason 已经是 `aborted` 或 `error`，它会转入 catch 的 error event 路径 [E: packages/ai/src/api/mistral-conversations.ts:155] [E: packages/ai/src/api/mistral-conversations.ts:159] [E: packages/ai/src/api/mistral-conversations.ts:160] [E: packages/ai/src/api/mistral-conversations.ts:162] [E: packages/ai/src/api/mistral-conversations.ts:166]。

## 错误和边界

catch 路径把 `output.stopReason` 设为 `aborted` 或 `error`，把 `formatMistralError(error)` 写入 `output.errorMessage`，然后发送 `{ type: "error", reason, error: output }` 并结束 stream [E: packages/ai/src/api/mistral-conversations.ts:173] [E: packages/ai/src/api/mistral-conversations.ts:174] [E: packages/ai/src/api/mistral-conversations.ts:175]。

`formatMistralError` 识别 error 上的 numeric `statusCode` 和 string `body`（`MistralHttpError` 提供这两项）；同时存在时输出 `Mistral API error (${statusCode})` 加截断后的 body，只有 status code 时输出 status code 加 `error.message`，普通 Error 返回 message，非 Error 走 safe JSON stringify [E: packages/ai/src/api/mistral-conversations.ts:269] [E: packages/ai/src/api/mistral-conversations.ts:272] [E: packages/ai/src/api/mistral-conversations.ts:274] [E: packages/ai/src/api/mistral-conversations.ts:277] [E: packages/ai/src/api/mistral-conversations.ts:278] [E: packages/ai/src/api/mistral-conversations.ts:280] [E: packages/ai/src/api/mistral-conversations.ts:329]。

Mistral error body 最多保留 4000 字符，超过时追加 truncated 字符数说明；非 Error fallback 的 JSON stringify 若返回 `undefined` 或抛错，会退回 `String(value)` [E: packages/ai/src/api/mistral-conversations.ts:29] [E: packages/ai/src/api/mistral-conversations.ts:283] [E: packages/ai/src/api/mistral-conversations.ts:285] [E: packages/ai/src/api/mistral-conversations.ts:291]。

本实现只使用第一条 choice，因为 `consumeChatStream` 每个 chunk 读取 `chunk.choices[0]`，没有遍历其它 choices [E: packages/ai/src/api/mistral-conversations.ts:616] [E: packages/ai/src/api/mistral-conversations.ts:617] [I]。

## Sources

- packages/ai/src/api/mistral-conversations.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/test/mistral-http-transport.test.ts
- packages/ai/test/mistral-reasoning-mode.test.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `Models.stream`、lazy API 与 `model.api` 到 provider-specific wire module 的派发边界。
