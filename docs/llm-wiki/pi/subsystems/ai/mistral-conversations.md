---
id: subsys.ai.mistral-conversations
title: Mistral Conversations 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/mistral-conversations.ts
symbols:
  - stream
  - MistralOptions
related:
  - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 305c014dcc
---

> `subsys.ai.mistral-conversations` 描述 `pi-ai` 的 Mistral Conversations wire implementation:它把统一 `Context` 和 `MistralOptions` 转成 Mistral SDK `chat.stream` 请求,再把 Mistral streaming chunk 归一为 `AssistantMessageEventStream`。

## 能回答的问题

- `mistral-conversations` 的 `stream` 入口如何创建 SDK client、构造 payload 并调用 Mistral?
- `MistralOptions` 支持哪些 provider-specific 字段,以及 `streamSimple` 如何选择 reasoning 参数?
- user/assistant/toolResult message 如何转成 Mistral chat message?
- pi `Tool[]` 和 streaming tool call delta 如何在 Mistral request/event 两侧转换?
- Mistral usage、prompt cache、stop reason 和错误如何映射回 pi `AssistantMessage`?
- 哪些边界属于 wire dispatch,哪些边界属于本 Mistral serializer?

## 职责边界

`packages/ai/src/api/mistral-conversations.ts` 是 `mistral-conversations` wire implementation 的主体:它导出 `stream`,返回 `AssistantMessageEventStream`,并在异步闭包中完成 API key 检查、Mistral SDK client 创建、payload 构造、`mistral.chat.stream(...)` 调用和 event consumption。[E: packages/ai/src/api/mistral-conversations.ts:49][E: packages/ai/src/api/mistral-conversations.ts:54][E: packages/ai/src/api/mistral-conversations.ts:56][E: packages/ai/src/api/mistral-conversations.ts:60][E: packages/ai/src/api/mistral-conversations.ts:66][E: packages/ai/src/api/mistral-conversations.ts:75][E: packages/ai/src/api/mistral-conversations.ts:80][E: packages/ai/src/api/mistral-conversations.ts:82]

`MistralOptions` 扩展通用 `StreamOptions`,额外暴露 `toolChoice`、`promptMode?: "reasoning"` 和 `reasoningEffort?: "none" | "high"`;payload 构造阶段会把这些字段写入 Mistral request。[E: packages/ai/src/api/mistral-conversations.ts:38][E: packages/ai/src/api/mistral-conversations.ts:40][E: packages/ai/src/api/mistral-conversations.ts:41][E: packages/ai/src/api/mistral-conversations.ts:42][E: packages/ai/src/api/mistral-conversations.ts:43][E: packages/ai/src/api/mistral-conversations.ts:260][E: packages/ai/src/api/mistral-conversations.ts:261][E: packages/ai/src/api/mistral-conversations.ts:262]

`stream` 的 output accumulator 初始化为 assistant role、当前 `model.api`、`model.provider`、`model.id`、零值 usage、`stopReason: "pending"` 和当前 timestamp；只有 terminal provider reason 或 error path 才会把它改成最终原因。[E: packages/ai/src/api/mistral-conversations.ts:138][E: packages/ai/src/api/mistral-conversations.ts:140][E: packages/ai/src/api/mistral-conversations.ts:141][E: packages/ai/src/api/mistral-conversations.ts:142][E: packages/ai/src/api/mistral-conversations.ts:143][E: packages/ai/src/api/mistral-conversations.ts:144][E: packages/ai/src/api/mistral-conversations.ts:145][E: packages/ai/src/api/mistral-conversations.ts:149][E: packages/ai/src/api/mistral-conversations.ts:154]

`subsys.ai.wire-protocol-dispatch` 覆盖 `Models.stream` 如何按 `model.api` 找到 lazy `ProviderStreams`;本节点只覆盖进入 `mistral-conversations.ts` 之后的 Mistral request/message/tool/event/usage/error 转换。[I]

## request 构造

`stream` 要求 `options.apiKey`,缺失时抛出 `No API key for provider: ${model.provider}` 并由本函数 catch 路径转为 stream error event。[E: packages/ai/src/api/mistral-conversations.ts:60][E: packages/ai/src/api/mistral-conversations.ts:61][E: packages/ai/src/api/mistral-conversations.ts:62][E: packages/ai/src/api/mistral-conversations.ts:97][E: packages/ai/src/api/mistral-conversations.ts:102][E: packages/ai/src/api/mistral-conversations.ts:104]

Mistral SDK client 是 per request 创建的,配置只包含 `apiKey` 和 `serverURL: model.baseUrl`;源码注释给出的直接理由是避免并发消费者共享 SDK mutable state。[E: packages/ai/src/api/mistral-conversations.ts:66][E: packages/ai/src/api/mistral-conversations.ts:67][E: packages/ai/src/api/mistral-conversations.ts:68][I]

`buildChatPayload` 总是设置 `model: model.id`、`stream: true` 和 `messages: toChatMessages(...)`;当 `context.tools` 非空时写入 `tools`,当 temperature/maxTokens/toolChoice/promptMode/reasoningEffort/prompt cache 条件存在时分别写入对应 Mistral request 字段。[E: packages/ai/src/api/mistral-conversations.ts:245][E: packages/ai/src/api/mistral-conversations.ts:251][E: packages/ai/src/api/mistral-conversations.ts:252][E: packages/ai/src/api/mistral-conversations.ts:253][E: packages/ai/src/api/mistral-conversations.ts:254][E: packages/ai/src/api/mistral-conversations.ts:257][E: packages/ai/src/api/mistral-conversations.ts:258][E: packages/ai/src/api/mistral-conversations.ts:259][E: packages/ai/src/api/mistral-conversations.ts:260][E: packages/ai/src/api/mistral-conversations.ts:261][E: packages/ai/src/api/mistral-conversations.ts:262][E: packages/ai/src/api/mistral-conversations.ts:263]

`context.systemPrompt` 会被 `sanitizeSurrogates` 清洗后作为 role `system` message 插到 payload messages 开头。[E: packages/ai/src/api/mistral-conversations.ts:265][E: packages/ai/src/api/mistral-conversations.ts:266][E: packages/ai/src/api/mistral-conversations.ts:267][E: packages/ai/src/api/mistral-conversations.ts:268]

`options.onPayload` 可以在发送前替换完整 payload;如果 callback 返回 `undefined`,原 payload 保持不变。[E: packages/ai/src/api/mistral-conversations.ts:75][E: packages/ai/src/api/mistral-conversations.ts:76][E: packages/ai/src/api/mistral-conversations.ts:77][E: packages/ai/src/api/mistral-conversations.ts:78]

`buildRequestOptions` 禁用 SDK retry,透传 abort signal,合并 `model.headers` 与 `options.headers`,并在启用 prompt caching 且 caller 未显式给 `x-affinity` 时把 `options.sessionId` 写入 `x-affinity` header。[E: packages/ai/src/api/mistral-conversations.ts:218][E: packages/ai/src/api/mistral-conversations.ts:224][E: packages/ai/src/api/mistral-conversations.ts:226][E: packages/ai/src/api/mistral-conversations.ts:228][E: packages/ai/src/api/mistral-conversations.ts:229][E: packages/ai/src/api/mistral-conversations.ts:230][E: packages/ai/src/api/mistral-conversations.ts:234][E: packages/ai/src/api/mistral-conversations.ts:235][E: packages/ai/src/api/mistral-conversations.ts:238][E: packages/ai/src/api/mistral-conversations.ts:239]

Prompt caching 的本地启用条件是 `cacheRetention !== "none"` 且存在 `sessionId`;同一 predicate 同时控制 request body 的 `promptCacheKey` 和 request header 的 `x-affinity`。[E: packages/ai/src/api/mistral-conversations.ts:263][E: packages/ai/src/api/mistral-conversations.ts:275][E: packages/ai/src/api/mistral-conversations.ts:276][E: packages/ai/src/api/mistral-conversations.ts:234][E: packages/ai/src/api/mistral-conversations.ts:235]

## streamSimple 与 reasoning

`streamSimple` 是 `SimpleStreamOptions` 到 `MistralOptions` 的 adapter:它检查 API key,调用 `buildBaseOptions`,用 `clampThinkingLevel` 处理 `options.reasoning`,再把结果转交给同文件的 `stream`。[E: packages/ai/src/api/mistral-conversations.ts:115][E: packages/ai/src/api/mistral-conversations.ts:120][E: packages/ai/src/api/mistral-conversations.ts:121][E: packages/ai/src/api/mistral-conversations.ts:125][E: packages/ai/src/api/mistral-conversations.ts:126][E: packages/ai/src/api/mistral-conversations.ts:130]

当模型支持 reasoning 且 caller 提供的 reasoning 未被 clamp 为 `"off"` 时,`streamSimple` 对 `usesPromptModeReasoning(model)` 的模型设置 `promptMode: "reasoning"`,对 `usesReasoningEffort(model)` 的模型设置 `reasoningEffort`。[E: packages/ai/src/api/mistral-conversations.ts:127][E: packages/ai/src/api/mistral-conversations.ts:128][E: packages/ai/src/api/mistral-conversations.ts:132][E: packages/ai/src/api/mistral-conversations.ts:133][E: packages/ai/src/api/mistral-conversations.ts:134]

`usesReasoningEffort` 当前只匹配 `mistral-small-2603`、`mistral-small-latest` 和 `mistral-medium-3.5`;`usesPromptModeReasoning` 则要求 `model.reasoning` 为真且不匹配 `usesReasoningEffort`。[E: packages/ai/src/api/mistral-conversations.ts:634][E: packages/ai/src/api/mistral-conversations.ts:635][E: packages/ai/src/api/mistral-conversations.ts:638][E: packages/ai/src/api/mistral-conversations.ts:639]

`mapReasoningEffort` 先查 `model.thinkingLevelMap?.[level]`,没有映射时默认返回 `"high"`;因此该 adapter 不把 `SimpleStreamOptions.thinkingBudgets` 直接传给 Mistral。[E: packages/ai/src/api/mistral-conversations.ts:642][E: packages/ai/src/api/mistral-conversations.ts:644][E: packages/ai/src/api/mistral-conversations.ts:646][I]

## message 转换

`stream` 在 Mistral serializer 之前调用 `transformMessages(context.messages, model, normalizeMistralToolCallId)`,所以 unsupported image downgrade、errored assistant replay 跳过、orphaned tool result 合成和跨 provider tool call id normalization 先在 shared transform 层完成。[E: packages/ai/src/api/mistral-conversations.ts:72][E: packages/ai/src/api/mistral-conversations.ts:73][I]

Mistral tool call id normalizer 使用两个 `Map` 维护原 id 到 Mistral id、Mistral id 到原 id 的双向关系;新 id 由 `deriveMistralToolCallId` 生成,冲突时增加 attempt 后重试。[E: packages/ai/src/api/mistral-conversations.ts:158][E: packages/ai/src/api/mistral-conversations.ts:159][E: packages/ai/src/api/mistral-conversations.ts:160][E: packages/ai/src/api/mistral-conversations.ts:162][E: packages/ai/src/api/mistral-conversations.ts:168][E: packages/ai/src/api/mistral-conversations.ts:169][E: packages/ai/src/api/mistral-conversations.ts:171][E: packages/ai/src/api/mistral-conversations.ts:172][E: packages/ai/src/api/mistral-conversations.ts:175]

`deriveMistralToolCallId` 删除非字母数字字符,若 attempt 0 后正好是 9 个字符则直接复用,否则对原 seed 或 `seed:attempt` 做 `shortHash`、再过滤并截断到 9 个字符。[E: packages/ai/src/api/mistral-conversations.ts:32][E: packages/ai/src/api/mistral-conversations.ts:180][E: packages/ai/src/api/mistral-conversations.ts:181][E: packages/ai/src/api/mistral-conversations.ts:182][E: packages/ai/src/api/mistral-conversations.ts:183][E: packages/ai/src/api/mistral-conversations.ts:184][E: packages/ai/src/api/mistral-conversations.ts:185][E: packages/ai/src/api/mistral-conversations.ts:186][E: packages/ai/src/api/mistral-conversations.ts:187]

`toChatMessages` 对 string user message 输出 `{ role: "user", content: sanitizeSurrogates(text) }`;对多模态 user message,它只保留 text 或模型支持 image 时的 image,并把 image 转为 data URL `image_url` chunk。[E: packages/ai/src/api/mistral-conversations.ts:526][E: packages/ai/src/api/mistral-conversations.ts:530][E: packages/ai/src/api/mistral-conversations.ts:531][E: packages/ai/src/api/mistral-conversations.ts:532][E: packages/ai/src/api/mistral-conversations.ts:535][E: packages/ai/src/api/mistral-conversations.ts:536][E: packages/ai/src/api/mistral-conversations.ts:537][E: packages/ai/src/api/mistral-conversations.ts:539][E: packages/ai/src/api/mistral-conversations.ts:540]

如果 user message 只有图片且模型不支持图片,`toChatMessages` 会生成文本占位 `(image omitted: model does not support images)`;如果过滤后没有可发送内容且不满足这个占位条件,该 user message 不会进入 result。[E: packages/ai/src/api/mistral-conversations.ts:542][E: packages/ai/src/api/mistral-conversations.ts:543][E: packages/ai/src/api/mistral-conversations.ts:546][E: packages/ai/src/api/mistral-conversations.ts:547][E: packages/ai/src/api/mistral-conversations.ts:549]

assistant 历史消息会拆成 `contentParts` 和 `toolCalls`:非空 text block 转 text content chunk,非空 thinking block 转 Mistral `thinking` content chunk,toolCall block 转 `{ id, type: "function", function: { name, arguments: JSON.stringify(...) } }`;只有存在 content 或 tool call 时才 push assistant message。[E: packages/ai/src/api/mistral-conversations.ts:552][E: packages/ai/src/api/mistral-conversations.ts:553][E: packages/ai/src/api/mistral-conversations.ts:554][E: packages/ai/src/api/mistral-conversations.ts:556][E: packages/ai/src/api/mistral-conversations.ts:558][E: packages/ai/src/api/mistral-conversations.ts:559][E: packages/ai/src/api/mistral-conversations.ts:563][E: packages/ai/src/api/mistral-conversations.ts:565][E: packages/ai/src/api/mistral-conversations.ts:572][E: packages/ai/src/api/mistral-conversations.ts:575][E: packages/ai/src/api/mistral-conversations.ts:579][E: packages/ai/src/api/mistral-conversations.ts:580][E: packages/ai/src/api/mistral-conversations.ts:581][E: packages/ai/src/api/mistral-conversations.ts:582]

tool result message 会把 text parts 用换行拼接,再由 `buildToolResultText` 加上 error prefix、图片省略说明或空输出占位;模型支持图片时,tool result 的 image parts 会追加为 data URL `image_url` chunks。[E: packages/ai/src/api/mistral-conversations.ts:586][E: packages/ai/src/api/mistral-conversations.ts:587][E: packages/ai/src/api/mistral-conversations.ts:592][E: packages/ai/src/api/mistral-conversations.ts:593][E: packages/ai/src/api/mistral-conversations.ts:594][E: packages/ai/src/api/mistral-conversations.ts:595][E: packages/ai/src/api/mistral-conversations.ts:597][E: packages/ai/src/api/mistral-conversations.ts:599][E: packages/ai/src/api/mistral-conversations.ts:602][E: packages/ai/src/api/mistral-conversations.ts:603][E: packages/ai/src/api/mistral-conversations.ts:604][E: packages/ai/src/api/mistral-conversations.ts:605][E: packages/ai/src/api/mistral-conversations.ts:606]

`buildToolResultText` 对纯文本、图片、有无 image support、`isError` 四种输入维度生成最终 tool result text;没有文本也没有图片时返回 `(no tool output)` 或 `[tool error] (no tool output)`。[E: packages/ai/src/api/mistral-conversations.ts:613][E: packages/ai/src/api/mistral-conversations.ts:614][E: packages/ai/src/api/mistral-conversations.ts:615][E: packages/ai/src/api/mistral-conversations.ts:617][E: packages/ai/src/api/mistral-conversations.ts:618][E: packages/ai/src/api/mistral-conversations.ts:619][E: packages/ai/src/api/mistral-conversations.ts:622][E: packages/ai/src/api/mistral-conversations.ts:623][E: packages/ai/src/api/mistral-conversations.ts:624][E: packages/ai/src/api/mistral-conversations.ts:626][E: packages/ai/src/api/mistral-conversations.ts:631]

## tool request 与 tool event

`toFunctionTools` 把 pi `Tool[]` 映射成 Mistral function tools:tool name、description 和 parameters 原样进入 function 字段,但 parameters 先经过 `stripSymbolKeys` 递归删除 symbol-keyed metadata,并且 `strict` 固定为 `false`。[E: packages/ai/src/api/mistral-conversations.ts:495][E: packages/ai/src/api/mistral-conversations.ts:496][E: packages/ai/src/api/mistral-conversations.ts:499][E: packages/ai/src/api/mistral-conversations.ts:500][E: packages/ai/src/api/mistral-conversations.ts:501][E: packages/ai/src/api/mistral-conversations.ts:502][E: packages/ai/src/api/mistral-conversations.ts:503][E: packages/ai/src/api/mistral-conversations.ts:504]

`stripSymbolKeys` 递归处理数组和普通对象,对象路径只遍历 `Object.entries(value)` 的 string-keyed entries,所以 symbol-keyed metadata 不会进入最终 JSON schema object。[E: packages/ai/src/api/mistral-conversations.ts:510][E: packages/ai/src/api/mistral-conversations.ts:511][E: packages/ai/src/api/mistral-conversations.ts:512][E: packages/ai/src/api/mistral-conversations.ts:515][E: packages/ai/src/api/mistral-conversations.ts:516][E: packages/ai/src/api/mistral-conversations.ts:517][E: packages/ai/src/api/mistral-conversations.ts:518][E: packages/ai/src/api/mistral-conversations.ts:520]

`mapToolChoice` 允许 `"auto" | "none" | "any" | "required"` 原样穿透,函数定向选择则只保留 `{ type: "function", function: { name } }`。[E: packages/ai/src/api/mistral-conversations.ts:649][E: packages/ai/src/api/mistral-conversations.ts:650][E: packages/ai/src/api/mistral-conversations.ts:652][E: packages/ai/src/api/mistral-conversations.ts:653][E: packages/ai/src/api/mistral-conversations.ts:654][E: packages/ai/src/api/mistral-conversations.ts:656][E: packages/ai/src/api/mistral-conversations.ts:658]

streaming tool call delta 到来时,当前 text/thinking block 会先结束;如果 Mistral chunk 没给有效 id,本实现用 `toolcall:${index ?? 0}` 走同一个 Mistral tool call id 派生函数,再用 `${callId}:${index || 0}` 作为合并同一 tool call 的 key。[E: packages/ai/src/api/mistral-conversations.ts:428][E: packages/ai/src/api/mistral-conversations.ts:430][E: packages/ai/src/api/mistral-conversations.ts:431][E: packages/ai/src/api/mistral-conversations.ts:432][E: packages/ai/src/api/mistral-conversations.ts:434][E: packages/ai/src/api/mistral-conversations.ts:435][E: packages/ai/src/api/mistral-conversations.ts:437][E: packages/ai/src/api/mistral-conversations.ts:438]

首次看到某个 tool call key 时,本实现创建 pi `toolCall` block,初始化 `arguments: {}` 和 streaming scratch buffer `partialArgs: ""`,并发送 `toolcall_start`;后续 delta 追加到 `partialArgs`,用 `parseStreamingJson` 尝试更新 parsed arguments,并发送 `toolcall_delta`。[E: packages/ai/src/api/mistral-conversations.ts:449][E: packages/ai/src/api/mistral-conversations.ts:450][E: packages/ai/src/api/mistral-conversations.ts:451][E: packages/ai/src/api/mistral-conversations.ts:452][E: packages/ai/src/api/mistral-conversations.ts:453][E: packages/ai/src/api/mistral-conversations.ts:454][E: packages/ai/src/api/mistral-conversations.ts:455][E: packages/ai/src/api/mistral-conversations.ts:457][E: packages/ai/src/api/mistral-conversations.ts:458][E: packages/ai/src/api/mistral-conversations.ts:459][E: packages/ai/src/api/mistral-conversations.ts:462][E: packages/ai/src/api/mistral-conversations.ts:466][E: packages/ai/src/api/mistral-conversations.ts:467][E: packages/ai/src/api/mistral-conversations.ts:469]

Mistral stream 结束后,所有 tool call block 会用最终 `partialArgs` 再解析一次,删除 scratch buffer,并发送 `toolcall_end`;catch 路径也会遍历 output content 删除残留 `partialArgs`,避免把 streaming scratch buffer 持久化到错误消息里。[E: packages/ai/src/api/mistral-conversations.ts:477][E: packages/ai/src/api/mistral-conversations.ts:478][E: packages/ai/src/api/mistral-conversations.ts:481][E: packages/ai/src/api/mistral-conversations.ts:482][E: packages/ai/src/api/mistral-conversations.ts:485][E: packages/ai/src/api/mistral-conversations.ts:486][E: packages/ai/src/api/mistral-conversations.ts:487][E: packages/ai/src/api/mistral-conversations.ts:489][E: packages/ai/src/api/mistral-conversations.ts:98][E: packages/ai/src/api/mistral-conversations.ts:100]

## event 与 usage 转换

`consumeChatStream` 迭代 Mistral `CompletionEvent`,取 `event.data` 为 chunk,并把第一个非空 `chunk.id` 记录为 `output.responseId`。[E: packages/ai/src/api/mistral-conversations.ts:300][E: packages/ai/src/api/mistral-conversations.ts:304][E: packages/ai/src/api/mistral-conversations.ts:332][E: packages/ai/src/api/mistral-conversations.ts:333][E: packages/ai/src/api/mistral-conversations.ts:336]

usage chunk 会把 prompt tokens 拆成 pi `usage.input` 与 `usage.cacheRead`,把 completion tokens 写入 `usage.output`,把 cache write 固定为 0,把 total tokens 设为 Mistral total 或本地四项相加,最后调用 `calculateCost(model, output.usage)`。[E: packages/ai/src/api/mistral-conversations.ts:338][E: packages/ai/src/api/mistral-conversations.ts:339][E: packages/ai/src/api/mistral-conversations.ts:340][E: packages/ai/src/api/mistral-conversations.ts:342][E: packages/ai/src/api/mistral-conversations.ts:343][E: packages/ai/src/api/mistral-conversations.ts:344][E: packages/ai/src/api/mistral-conversations.ts:345][E: packages/ai/src/api/mistral-conversations.ts:346][E: packages/ai/src/api/mistral-conversations.ts:349]

`getMistralCachedPromptTokens` 兼容多种 cached prompt token 字段命名,只接受 finite number,并把结果 clamp 到 `[0, promptTokens]`。[E: packages/ai/src/api/mistral-conversations.ts:279][E: packages/ai/src/api/mistral-conversations.ts:280][E: packages/ai/src/api/mistral-conversations.ts:289][E: packages/ai/src/api/mistral-conversations.ts:290][E: packages/ai/src/api/mistral-conversations.ts:291][E: packages/ai/src/api/mistral-conversations.ts:292][E: packages/ai/src/api/mistral-conversations.ts:293][E: packages/ai/src/api/mistral-conversations.ts:294][E: packages/ai/src/api/mistral-conversations.ts:296][E: packages/ai/src/api/mistral-conversations.ts:297]

text delta 支持两种 Mistral content 形态:当 `delta.content` 是 string 时按单个 text delta 处理;当它是 content item array 时,`item.type === "text"` 也进入 text block,`item.type === "thinking"` 则把 thinking parts 中的 text 拼接后进入 thinking block。[E: packages/ai/src/api/mistral-conversations.ts:364][E: packages/ai/src/api/mistral-conversations.ts:365][E: packages/ai/src/api/mistral-conversations.ts:366][E: packages/ai/src/api/mistral-conversations.ts:368][E: packages/ai/src/api/mistral-conversations.ts:369][E: packages/ai/src/api/mistral-conversations.ts:386][E: packages/ai/src/api/mistral-conversations.ts:387][E: packages/ai/src/api/mistral-conversations.ts:388][E: packages/ai/src/api/mistral-conversations.ts:391][E: packages/ai/src/api/mistral-conversations.ts:409][E: packages/ai/src/api/mistral-conversations.ts:410]

text/thinking block 状态是互斥的:切换 block 类型前会调用 `finishCurrentBlock`,新 block 创建时发送 `text_start` 或 `thinking_start`,追加 delta 时发送 `text_delta` 或 `thinking_delta`,最终结束时发送对应 end event。[E: packages/ai/src/api/mistral-conversations.ts:311][E: packages/ai/src/api/mistral-conversations.ts:314][E: packages/ai/src/api/mistral-conversations.ts:323][E: packages/ai/src/api/mistral-conversations.ts:370][E: packages/ai/src/api/mistral-conversations.ts:371][E: packages/ai/src/api/mistral-conversations.ts:372][E: packages/ai/src/api/mistral-conversations.ts:374][E: packages/ai/src/api/mistral-conversations.ts:377][E: packages/ai/src/api/mistral-conversations.ts:393][E: packages/ai/src/api/mistral-conversations.ts:394][E: packages/ai/src/api/mistral-conversations.ts:395][E: packages/ai/src/api/mistral-conversations.ts:397][E: packages/ai/src/api/mistral-conversations.ts:400][E: packages/ai/src/api/mistral-conversations.ts:477]

Mistral finish reason 通过 `mapChatStopReason` 转为 pi `StopReason`:null/`stop`/未知值归为 `stop`,`length` 和 `model_length` 归为 `length`,`tool_calls` 归为 `toolUse`,`error` 归为 `error`。[E: packages/ai/src/api/mistral-conversations.ts:355][E: packages/ai/src/api/mistral-conversations.ts:352][E: packages/ai/src/api/mistral-conversations.ts:653][E: packages/ai/src/api/mistral-conversations.ts:654][E: packages/ai/src/api/mistral-conversations.ts:665][E: packages/ai/src/api/mistral-conversations.ts:667][E: packages/ai/src/api/mistral-conversations.ts:668][E: packages/ai/src/api/mistral-conversations.ts:670][E: packages/ai/src/api/mistral-conversations.ts:672][E: packages/ai/src/api/mistral-conversations.ts:666]

正常路径在消费完 stream 后检查 abort signal 和 terminal stop reason,再发送 `{ type: "done", reason, message }` 并结束 stream;如果 output stop reason 已经是 `aborted` 或 `error`,它会转入 catch 的 error event 路径。[E: packages/ai/src/api/mistral-conversations.ts:84][E: packages/ai/src/api/mistral-conversations.ts:85][E: packages/ai/src/api/mistral-conversations.ts:91][E: packages/ai/src/api/mistral-conversations.ts:88][E: packages/ai/src/api/mistral-conversations.ts:95][E: packages/ai/src/api/mistral-conversations.ts:96]

## 错误和边界

catch 路径把 `output.stopReason` 设为 `aborted` 或 `error`,把 `formatMistralError(error)` 写入 `output.errorMessage`,然后发送 `{ type: "error", reason, error: output }` 并结束 stream。[E: packages/ai/src/api/mistral-conversations.ts:97][E: packages/ai/src/api/mistral-conversations.ts:102][E: packages/ai/src/api/mistral-conversations.ts:103][E: packages/ai/src/api/mistral-conversations.ts:104][E: packages/ai/src/api/mistral-conversations.ts:105]

`formatMistralError` 会识别 SDK error 上的 numeric `statusCode` 和 string `body`;同时存在时输出 `Mistral API error (${statusCode})` 加截断后的 body,只有 status code 时输出 status code 加 `error.message`,普通 Error 返回 message,非 Error 走 safe JSON stringify。[E: packages/ai/src/api/mistral-conversations.ts:190][E: packages/ai/src/api/mistral-conversations.ts:191][E: packages/ai/src/api/mistral-conversations.ts:192][E: packages/ai/src/api/mistral-conversations.ts:193][E: packages/ai/src/api/mistral-conversations.ts:194][E: packages/ai/src/api/mistral-conversations.ts:195][E: packages/ai/src/api/mistral-conversations.ts:196][E: packages/ai/src/api/mistral-conversations.ts:198][E: packages/ai/src/api/mistral-conversations.ts:199][E: packages/ai/src/api/mistral-conversations.ts:201]

Mistral error body 最多保留 4000 字符,超过时追加 truncated 字符数说明;非 Error fallback 的 JSON stringify 若返回 `undefined` 或抛错,会退回 `String(value)`。[E: packages/ai/src/api/mistral-conversations.ts:33][E: packages/ai/src/api/mistral-conversations.ts:204][E: packages/ai/src/api/mistral-conversations.ts:205][E: packages/ai/src/api/mistral-conversations.ts:206][E: packages/ai/src/api/mistral-conversations.ts:209][E: packages/ai/src/api/mistral-conversations.ts:211][E: packages/ai/src/api/mistral-conversations.ts:212][E: packages/ai/src/api/mistral-conversations.ts:214]

本实现只使用 Mistral SDK `chat.stream` 的第一条 choice,因为 `consumeChatStream` 每个 chunk 读取 `chunk.choices[0]`,没有遍历其它 choices。[E: packages/ai/src/api/mistral-conversations.ts:352][E: packages/ai/src/api/mistral-conversations.ts:353][I]

`stream` 入口没有调用 `options.onResponse`,因为该文件只在 options 类型中继承通用字段,源码中没有读取 `onResponse` 的调用点。[I]

## 本轮 stream 状态与 fetch 变化

Mistral output 从 `pending` 开始；completion `stop_reason` 同时写入 `rawStopReason` 并映射 unified reason，流结束仍 pending 或映射为 error 时走 terminal error。[E: packages/ai/src/api/mistral-conversations.ts:138] [E: packages/ai/src/api/mistral-conversations.ts:154] [E: packages/ai/src/api/mistral-conversations.ts:352] [E: packages/ai/src/api/mistral-conversations.ts:360] [E: packages/ai/src/api/mistral-conversations.ts:84] [E: packages/ai/src/api/mistral-conversations.ts:95]

Mistral SDK client 现在通过 `options.fetch` 接受 request-scoped custom fetch。[E: packages/ai/src/api/mistral-conversations.ts:66] [E: packages/ai/src/api/mistral-conversations.ts:69]

## Sources

- packages/ai/src/api/mistral-conversations.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `Models.stream`、lazy API 与 `model.api` 到 provider-specific wire module 的派发边界。
