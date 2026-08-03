---
id: subsys.ai.openai-completions
title: OpenAI Completions 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/api/openai-responses-shared.ts
symbols:
  - stream
  - OpenAICompletionsOptions
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.openai-responses
evidence: explicit
status: verified
updated: 305c014dcc
---

> `subsys.ai.openai-completions` 是 `pi-ai` 的 OpenAI Chat Completions wire 协议实现:它把统一 `Context`/`Model<"openai-completions">` 转成 `client.chat.completions.create(..., {stream:true})` 请求,再把 `ChatCompletionChunk` 归一成 `AssistantMessageEventStream`。

## 能回答的问题

- `openai-completions` 的 `stream` 入口怎样创建 OpenAI SDK client、构造 Chat Completions payload、发起 streaming 请求?
- `OpenAICompletionsOptions` 在通用 `StreamOptions` 外额外支持哪些字段?
- Chat Completions 请求里的 `messages`、`tools`、`tool_choice`、usage streaming、cache key、reasoning effort 分别在哪里填充?
- streaming chunk 的 text、reasoning、tool call、usage、finish reason 如何映射成内部事件和 `AssistantMessage`?
- `openai-completions.ts` 与 `openai-responses-shared.ts` 的边界是什么,哪些逻辑没有共享?

## 职责边界

`openai-completions.ts` 负责完整的 Chat Completions wire path:API key 解析、OpenAI client 创建、Chat payload 构造、`client.chat.completions.create(...).withResponse()` 调用、chunk loop、usage 解析、finish reason 映射与 error/done 事件收束。[E: packages/ai/src/api/openai-completions.ts:196][E: packages/ai/src/api/openai-completions.ts:223][E: packages/ai/src/api/openai-completions.ts:231][E: packages/ai/src/api/openai-completions.ts:232][E: packages/ai/src/api/openai-completions.ts:242][E: packages/ai/src/api/openai-completions.ts:436][E: packages/ai/src/api/openai-completions.ts:584][E: packages/ai/src/api/openai-completions.ts:604] `openai-responses-shared.ts` 覆盖 Responses API 的 `ResponseInput` conversion、Responses tool conversion 与 `ResponseStreamEvent` processing,不是 Chat Completions chunk parser。[E: packages/ai/src/api/openai-responses-shared.ts:136][E: packages/ai/src/api/openai-responses-shared.ts:344][E: packages/ai/src/api/openai-responses-shared.ts:416]

`OpenAICompletionsOptions` 继承 `StreamOptions`,额外暴露 `toolChoice` 和 `reasoningEffort`;`reasoningEffort` 接受 `minimal|low|medium|high|xhigh|max`,`toolChoice` 可为 `auto|none|required` 或指定 function name。[E: packages/ai/src/api/openai-completions.ts:141][E: packages/ai/src/api/openai-completions.ts:123][E: packages/ai/src/api/openai-completions.ts:143]

## 关键文件

- `packages/ai/src/api/openai-completions.ts` - 权威实现 `stream`、`streamSimple`、`convertMessages`、`convertTools`、`parseChunkUsage`、`mapStopReason`、provider compat detection/resolution。[E: packages/ai/src/api/openai-completions.ts:196][E: packages/ai/src/api/openai-completions.ts:612][E: packages/ai/src/api/openai-completions.ts:1015][E: packages/ai/src/api/openai-completions.ts:1306][E: packages/ai/src/api/openai-completions.ts:1343][E: packages/ai/src/api/openai-completions.ts:1381][E: packages/ai/src/api/openai-completions.ts:1412][E: packages/ai/src/api/openai-completions.ts:1510]
- `packages/ai/src/api/openai-responses-shared.ts` - Responses API 的 shared helpers;本节点只用它说明与 Responses 协议的边界,因为 Chat Completions implementation 的 imports 不包含该 shared 模块。[I][E: packages/ai/src/api/openai-completions.ts:1][E: packages/ai/src/api/openai-completions.ts:55][E: packages/ai/src/api/openai-responses-shared.ts:136][E: packages/ai/src/api/openai-responses-shared.ts:416]

## 数据模型

`stream` 初始化一个 `AssistantMessage` partial,预填 `role:"assistant"`、空 `content`、`api/provider/model`、零值 usage、`stopReason:"pending"` 和 timestamp;后续 chunk parsing 原地补全 `content`、`usage`、`responseId`、`responseModel`、`rawStopReason`、`stopReason`、`errorMessage`。[E: packages/ai/src/api/openai-completions.ts:201][E: packages/ai/src/api/openai-completions.ts:204][E: packages/ai/src/api/openai-completions.ts:207][E: packages/ai/src/api/openai-completions.ts:210][E: packages/ai/src/api/openai-completions.ts:218][E: packages/ai/src/api/openai-completions.ts:441][E: packages/ai/src/api/openai-completions.ts:458][E: packages/ai/src/api/openai-completions.ts:461]

streaming 内部有三类 block:`TextContent`、`ThinkingContent`、`StreamingToolCallBlock`;tool call block 在 stream 中额外带 `partialArgs` 和 `streamIndex`,结束时解析 `partialArgs` 并删除 scratch 字段,避免 replay 持久化 parser 缓冲。[E: packages/ai/src/api/openai-completions.ts:253][E: packages/ai/src/api/openai-completions.ts:261][E: packages/ai/src/api/openai-completions.ts:533][E: packages/ai/src/api/openai-completions.ts:335][E: packages/ai/src/api/openai-completions.ts:337]

## 控制流

1. `stream@openai-completions.ts:151` 同步返回 `AssistantMessageEventStream`,异步 IIFE 内先解析 API key、compat、cache retention、session affinity,再创建 OpenAI SDK client 并构造 params。[E: packages/ai/src/api/openai-completions.ts:196][E: packages/ai/src/api/openai-completions.ts:203][E: packages/ai/src/api/openai-completions.ts:223][E: packages/ai/src/api/openai-completions.ts:224][E: packages/ai/src/api/openai-completions.ts:229][E: packages/ai/src/api/openai-completions.ts:230][E: packages/ai/src/api/openai-completions.ts:231][E: packages/ai/src/api/openai-completions.ts:232]
   Session affinity 仅在 compat 启用时注入：`openrouter` 写 `x-session-id`；`openai` 写 `session_id`、`x-client-request-id`、`x-session-affinity`；`openai-nosession` 省略 `session_id` 但保留后两个 headers [E: packages/ai/src/api/openai-completions.ts:647] [E: packages/ai/src/api/openai-completions.ts:651] [E: packages/ai/src/api/openai-completions.ts:654] [E: packages/ai/src/api/openai-completions.ts:658]。
2. `onPayload` 可替换即将发送的 Chat Completions params,request options 会透传 abort signal、timeout 和 `maxRetries` 默认值 0。[E: packages/ai/src/api/openai-completions.ts:233][E: packages/ai/src/api/openai-completions.ts:235][E: packages/ai/src/api/openai-completions.ts:237][E: packages/ai/src/api/openai-completions.ts:238][E: packages/ai/src/api/openai-completions.ts:239][E: packages/ai/src/api/openai-completions.ts:240]
3. wire request 调用 `client.chat.completions.create(params, requestOptions).withResponse()`,再把 HTTP status/headers 交给 `onResponse`,随后 push `start` 事件。[E: packages/ai/src/api/openai-completions.ts:242][E: packages/ai/src/api/openai-completions.ts:243][E: packages/ai/src/api/openai-completions.ts:243][E: packages/ai/src/api/openai-completions.ts:250][E: packages/ai/src/api/openai-completions.ts:251]
4. `for await (const chunk of openaiStream)` 逐 chunk 更新 response id/model、usage、choice finish reason、text/thinking/tool call deltas 和 encrypted reasoning details。[E: packages/ai/src/api/openai-completions.ts:436][E: packages/ai/src/api/openai-completions.ts:441][E: packages/ai/src/api/openai-completions.ts:443][E: packages/ai/src/api/openai-completions.ts:446][E: packages/ai/src/api/openai-completions.ts:458][E: packages/ai/src/api/openai-completions.ts:468][E: packages/ai/src/api/openai-completions.ts:547]
5. chunk loop 结束后,implementation 对所有 blocks 调用 `finishBlock`,再把 abort、error stop reason、缺失 finish reason 变成 thrown error;正常路径 push `done` 并 end stream,catch 路径清理 scratch 字段、设置 `stopReason` 并 push `error`。[E: packages/ai/src/api/openai-completions.ts:564][E: packages/ai/src/api/openai-completions.ts:565][E: packages/ai/src/api/openai-completions.ts:567][E: packages/ai/src/api/openai-completions.ts:577][E: packages/ai/src/api/openai-completions.ts:577][E: packages/ai/src/api/openai-completions.ts:584][E: packages/ai/src/api/openai-completions.ts:587][E: packages/ai/src/api/openai-completions.ts:594][E: packages/ai/src/api/openai-completions.ts:604]

## 请求字段

`buildParams` 的基础 payload 是 `{model, messages, stream:true, prompt_cache_key?, prompt_cache_retention?}`;`messages` 来自 `convertMessages`,OpenAI 官方 base URL 且 cache retention 非 `none` 时会设置 clamped prompt cache key,long retention 且 compat 支持时会设置 `prompt_cache_retention:"24h"`。[E: packages/ai/src/api/openai-completions.ts:687][E: packages/ai/src/api/openai-completions.ts:690][E: packages/ai/src/api/openai-completions.ts:691][E: packages/ai/src/api/openai-completions.ts:692][E: packages/ai/src/api/openai-completions.ts:693][E: packages/ai/src/api/openai-completions.ts:694][E: packages/ai/src/api/openai-completions.ts:699]

当 compat 没有禁用 streaming usage 时,params 增加 `stream_options:{include_usage:true}`;支持 store 的 provider 会显式 `store=false`;`maxTokens` 根据 compat 写入 `max_tokens` 或 `max_completion_tokens`;temperature 仅在 options 提供时写入。[E: packages/ai/src/api/openai-completions.ts:702][E: packages/ai/src/api/openai-completions.ts:703][E: packages/ai/src/api/openai-completions.ts:706][E: packages/ai/src/api/openai-completions.ts:707][E: packages/ai/src/api/openai-completions.ts:710][E: packages/ai/src/api/openai-completions.ts:712][E: packages/ai/src/api/openai-completions.ts:714][E: packages/ai/src/api/openai-completions.ts:718][E: packages/ai/src/api/openai-completions.ts:719]

tools 来自 `context.tools` 时通过 `convertTools` 转成 OpenAI function tools;没有当前 tools 但历史消息含 tool call/tool result 时,params 写入空 tools 数组以兼容要求 tools param 的代理/provider。[E: packages/ai/src/api/openai-completions.ts:951][E: packages/ai/src/api/openai-completions.ts:726][E: packages/ai/src/api/openai-completions.ts:730][E: packages/ai/src/api/openai-completions.ts:732][E: packages/ai/src/api/openai-completions.ts:1306][E: packages/ai/src/api/openai-completions.ts:1310][E: packages/ai/src/api/openai-completions.ts:1335][E: packages/ai/src/api/openai-completions.ts:1337] `toolChoice` 只在 options 提供时写入 `params.tool_choice`。[E: packages/ai/src/api/openai-completions.ts:739][E: packages/ai/src/api/openai-completions.ts:740]

reasoning 参数按 compat 分支写入 provider-specific shape:Z.ai 用 `thinking` 与可选 `reasoning_effort`,且启用时带 `clear_thinking:false`;Qwen variants 用 `enable_thinking` 或 `chat_template_kwargs`;Baseten 用 configurable `chat_template_args`，并只在 `supportsReasoningEffort` 时写映射后的 `reasoning_effort`;DeepSeek 用 `thinking`/`reasoning_effort`,OpenRouter 用嵌套 `reasoning`,Together 用 `reasoning.enabled` 与可选 `reasoning_effort`,默认 OpenAI-style 分支用 `reasoning_effort`。[E: packages/ai/src/api/openai-completions.ts:743][E: packages/ai/src/api/openai-completions.ts:748][E: packages/ai/src/api/openai-completions.ts:756][E: packages/ai/src/api/openai-completions.ts:764][E: packages/ai/src/api/openai-completions.ts:774][E: packages/ai/src/api/openai-completions.ts:779][E: packages/ai/src/api/openai-completions.ts:781][E: packages/ai/src/api/openai-completions.ts:783][E: packages/ai/src/api/openai-completions.ts:785][E: packages/ai/src/api/openai-completions.ts:788][E: packages/ai/src/api/openai-completions.ts:791][E: packages/ai/src/api/openai-completions.ts:801][E: packages/ai/src/api/openai-completions.ts:816][E: packages/ai/src/api/openai-completions.ts:832]

`buildChatTemplateValues()` 同时服务 `chatTemplateKwargs` 与 Baseten `chatTemplateArgs`：它逐值解析 literal 或 `$var`，忽略解析为 `undefined` 的项，空 object 不发到 wire。[E: packages/ai/src/api/openai-completions.ts:769] [E: packages/ai/src/api/openai-completions.ts:770] [E: packages/ai/src/api/openai-completions.ts:779] [E: packages/ai/src/api/openai-completions.ts:861] [E: packages/ai/src/api/openai-completions.ts:868] [E: packages/ai/src/api/openai-completions.ts:869] [E: packages/ai/src/api/openai-completions.ts:875]

## 消息与 tool call 转换

`convertMessages` 先通过 `transformMessages(context.messages, model, normalizeToolCallId)` 做 replay normalization,其中 pipe 分隔的 Responses/Codex-style tool call id 会取 `call_id` 部分并归一化到最多 40 字符;OpenAI provider 的非 pipe id 也会截断到 40 字符。[E: packages/ai/src/api/openai-completions.ts:1023][E: packages/ai/src/api/openai-completions.ts:1031][E: packages/ai/src/api/openai-completions.ts:1034][E: packages/ai/src/api/openai-completions.ts:1045][E: packages/ai/src/api/openai-completions.ts:1049]

system prompt 根据 reasoning model 与 compat 选择 `developer` 或 `system` role;user string 转 user text,带 image 的 user content 转 Chat Completions `text`/`image_url` parts。[E: packages/ai/src/api/openai-completions.ts:1051][E: packages/ai/src/api/openai-completions.ts:1052][E: packages/ai/src/api/openai-completions.ts:1053][E: packages/ai/src/api/openai-completions.ts:1054][E: packages/ai/src/api/openai-completions.ts:1070][E: packages/ai/src/api/openai-completions.ts:1072][E: packages/ai/src/api/openai-completions.ts:1077][E: packages/ai/src/api/openai-completions.ts:1080][E: packages/ai/src/api/openai-completions.ts:1085]

assistant 历史消息会收集 text blocks;常规路径把 text 拼成 string content,但 `requiresThinkingAsText` 且存在 thinking blocks 时会把 thinking 和文本作为 Chat Completions text parts 发送;thinking blocks 也可能按 compat 写入 provider-specific reasoning field。tool call blocks 转为 `assistantMsg.tool_calls` 的 OpenAI function call shape;带 `thoughtSignature` 的 tool call 会回填到 `reasoning_details`。[E: packages/ai/src/api/openai-completions.ts:1105][E: packages/ai/src/api/openai-completions.ts:1115][E: packages/ai/src/api/openai-completions.ts:1117][E: packages/ai/src/api/openai-completions.ts:1121][E: packages/ai/src/api/openai-completions.ts:1126][E: packages/ai/src/api/openai-completions.ts:1133][E: packages/ai/src/api/openai-completions.ts:1134][E: packages/ai/src/api/openai-completions.ts:1142][E: packages/ai/src/api/openai-completions.ts:1143][E: packages/ai/src/api/openai-completions.ts:1155][E: packages/ai/src/api/openai-completions.ts:1157][E: packages/ai/src/api/openai-completions.ts:1174][E: packages/ai/src/api/openai-completions.ts:1178][E: packages/ai/src/api/openai-completions.ts:1189]

tool result history 转为 role `tool` messages,纯图片结果会用占位文本;如果模型支持 image input,连续 tool results 里的 image blocks 会额外汇总成一个 user message `Attached image(s) from tool result:` 加 image_url parts。[E: packages/ai/src/api/openai-completions.ts:1212][E: packages/ai/src/api/openai-completions.ts:1221][E: packages/ai/src/api/openai-completions.ts:1231][E: packages/ai/src/api/openai-completions.ts:1193][E: packages/ai/src/api/openai-completions.ts:1234][E: packages/ai/src/api/openai-completions.ts:1247][E: packages/ai/src/api/openai-completions.ts:1250][E: packages/ai/src/api/openai-completions.ts:1271][E: packages/ai/src/api/openai-completions.ts:1276]

## stream chunk 解析

text delta 来自 `choice.delta.content`;首次遇到 text 时创建 text block 并 push `text_start`,每个 delta 追加到 block 并 push `text_delta`,结束时 `finishBlock` push `text_end`。[E: packages/ai/src/api/openai-completions.ts:346][E: packages/ai/src/api/openai-completions.ts:348][E: packages/ai/src/api/openai-completions.ts:350][E: packages/ai/src/api/openai-completions.ts:470][E: packages/ai/src/api/openai-completions.ts:475][E: packages/ai/src/api/openai-completions.ts:477][E: packages/ai/src/api/openai-completions.ts:306]

thinking delta 从 `reasoning_content`、`reasoning`、`reasoning_text` 三个非标准字段中取第一个非空字段;首次遇到 thinking 时创建 thinking block,把字段名写入 `thinkingSignature`,但 `opencode-go` 的 `reasoning` 字段会归一为 `reasoning_content`;随后发出 `thinking_start`/`thinking_delta`/`thinking_end`。[E: packages/ai/src/api/openai-completions.ts:354][E: packages/ai/src/api/openai-completions.ts:359][E: packages/ai/src/api/openai-completions.ts:362][E: packages/ai/src/api/openai-completions.ts:488][E: packages/ai/src/api/openai-completions.ts:491][E: packages/ai/src/api/openai-completions.ts:502][E: packages/ai/src/api/openai-completions.ts:503][E: packages/ai/src/api/openai-completions.ts:504][E: packages/ai/src/api/openai-completions.ts:505][E: packages/ai/src/api/openai-completions.ts:506][E: packages/ai/src/api/openai-completions.ts:507][E: packages/ai/src/api/openai-completions.ts:509][E: packages/ai/src/api/openai-completions.ts:313]

tool call delta 来自 `choice.delta.tool_calls`;parser 用 stream index 或 id 找到/创建 block,累加 `function.arguments` 到 `partialArgs`,用 `parseStreamingJson` 维护增量可读 arguments,每个 delta 发 `toolcall_delta`,结束时发 `toolcall_end`。[E: packages/ai/src/api/openai-completions.ts:376][E: packages/ai/src/api/openai-completions.ts:379][E: packages/ai/src/api/openai-completions.ts:383][E: packages/ai/src/api/openai-completions.ts:407][E: packages/ai/src/api/openai-completions.ts:517][E: packages/ai/src/api/openai-completions.ts:530][E: packages/ai/src/api/openai-completions.ts:532][E: packages/ai/src/api/openai-completions.ts:533][E: packages/ai/src/api/openai-completions.ts:539][E: packages/ai/src/api/openai-completions.ts:339]

`reasoning_details` 中符合 `reasoning.encrypted` shape 的条目会序列化为 JSON 并挂到对应 tool call 的 `thoughtSignature`;如果 reasoning detail 早于 tool call block 到达,parser 会先放进 pending map,后续 `ensureToolCallBlock` 再应用。[E: packages/ai/src/api/openai-completions.ts:127][E: packages/ai/src/api/openai-completions.ts:133][E: packages/ai/src/api/openai-completions.ts:366][E: packages/ai/src/api/openai-completions.ts:370][E: packages/ai/src/api/openai-completions.ts:372][E: packages/ai/src/api/openai-completions.ts:432][E: packages/ai/src/api/openai-completions.ts:547][E: packages/ai/src/api/openai-completions.ts:550][E: packages/ai/src/api/openai-completions.ts:554][E: packages/ai/src/api/openai-completions.ts:556]

usage 优先来自 `chunk.usage`,fallback 到 `choice.usage`;`parseChunkUsage` 把 `prompt_tokens` 扣除 cache read/write 后作为 input,把 `completion_tokens` 作为 output,把 `completion_tokens_details.reasoning_tokens` 作为 reasoning,再调用 `calculateCost`。[E: packages/ai/src/api/openai-completions.ts:445][E: packages/ai/src/api/openai-completions.ts:446][E: packages/ai/src/api/openai-completions.ts:454][E: packages/ai/src/api/openai-completions.ts:455][E: packages/ai/src/api/openai-completions.ts:1353][E: packages/ai/src/api/openai-completions.ts:1354][E: packages/ai/src/api/openai-completions.ts:1355][E: packages/ai/src/api/openai-completions.ts:1365][E: packages/ai/src/api/openai-completions.ts:1367][E: packages/ai/src/api/openai-completions.ts:1373][E: packages/ai/src/api/openai-completions.ts:1377]

finish reason 映射规则是 `stop|end -> stop`,`length -> length`,`function_call|tool_calls -> toolUse`,`content_filter|network_error|unknown -> error`;如果整个 stream 未见 finish reason,实现视为错误而不是 silently done。[E: packages/ai/src/api/openai-completions.ts:458][E: packages/ai/src/api/openai-completions.ts:460][E: packages/ai/src/api/openai-completions.ts:1387][E: packages/ai/src/api/openai-completions.ts:1390][E: packages/ai/src/api/openai-completions.ts:1392][E: packages/ai/src/api/openai-completions.ts:1395][E: packages/ai/src/api/openai-completions.ts:1397][E: packages/ai/src/api/openai-completions.ts:1400][E: packages/ai/src/api/openai-completions.ts:577]

## 与 Responses/shared 模块边界

Responses shared 的 `convertResponsesMessages` 生成 Responses API `ResponseInput`;当目标 provider 被允许且历史 assistant tool call id 带 pipe 时,它保留 `call_id|item_id` 双段结构,并在必要时让 item id 满足 `fc_` 前缀要求。[E: packages/ai/src/api/openai-responses-shared.ts:136][E: packages/ai/src/api/openai-responses-shared.ts:142][E: packages/ai/src/api/openai-responses-shared.ts:156][E: packages/ai/src/api/openai-responses-shared.ts:157][E: packages/ai/src/api/openai-responses-shared.ts:158][E: packages/ai/src/api/openai-responses-shared.ts:159][E: packages/ai/src/api/openai-responses-shared.ts:164][E: packages/ai/src/api/openai-responses-shared.ts:167] Chat Completions 的 `convertMessages` 则把 pipe id 压回单段 Chat `tool_call_id`,因为 Chat Completions tool messages 使用单个 `tool_call_id` 字段。[E: packages/ai/src/api/openai-completions.ts:1023][E: packages/ai/src/api/openai-completions.ts:1031][E: packages/ai/src/api/openai-completions.ts:1034][E: packages/ai/src/api/openai-completions.ts:1231][E: packages/ai/src/api/openai-completions.ts:1234]

Responses shared 的 `processResponsesStream` 按 `ResponseStreamEvent` 的 typed event name 建 slot,例如 `response.output_item.added`、`response.output_text.delta`、`response.function_call_arguments.delta`、`response.output_item.done`、`response.completed|response.incomplete`;Completions 的 stream loop 只处理 `ChatCompletionChunk` 的 `choices[0].delta` 和 `finish_reason`。[E: packages/ai/src/api/openai-responses-shared.ts:416][E: packages/ai/src/api/openai-responses-shared.ts:574][E: packages/ai/src/api/openai-responses-shared.ts:577][E: packages/ai/src/api/openai-responses-shared.ts:609][E: packages/ai/src/api/openai-responses-shared.ts:629][E: packages/ai/src/api/openai-responses-shared.ts:657][E: packages/ai/src/api/openai-responses-shared.ts:715][E: packages/ai/src/api/openai-completions.ts:436][E: packages/ai/src/api/openai-completions.ts:449][E: packages/ai/src/api/openai-completions.ts:458][E: packages/ai/src/api/openai-completions.ts:468]

`openai-completions.ts` and `openai-responses-shared.ts` both normalize into the same internal `AssistantMessage` content block vocabulary, but the evidence in this node only establishes same-shape event outputs, not a shared parser abstraction.[I][E: packages/ai/src/api/openai-completions.ts:261][E: packages/ai/src/api/openai-completions.ts:306][E: packages/ai/src/api/openai-completions.ts:313][E: packages/ai/src/api/openai-completions.ts:339][E: packages/ai/src/api/openai-responses-shared.ts:409][E: packages/ai/src/api/openai-responses-shared.ts:457][E: packages/ai/src/api/openai-responses-shared.ts:466][E: packages/ai/src/api/openai-responses-shared.ts:507]

## 设计动机与权衡

Compat detection/resolution lets one Chat Completions implementation target OpenAI and many OpenAI-compatible providers;detected defaults cover provider/baseURL families,then explicit `model.compat` fields override individual capabilities.[E: packages/ai/src/api/openai-completions.ts:1412][E: packages/ai/src/api/openai-completions.ts:1416][E: packages/ai/src/api/openai-completions.ts:1430][E: packages/ai/src/api/openai-completions.ts:1462][E: packages/ai/src/api/openai-completions.ts:1510][E: packages/ai/src/api/openai-completions.ts:1511][E: packages/ai/src/api/openai-completions.ts:1514][E: packages/ai/src/api/openai-completions.ts:1515]

Client auth treats explicit API key as primary,Authorization-style headers as sufficient fallback with dummy key `"unused"`,and absence of both as a provider-specific error;this supports providers/proxies that authenticate entirely through headers.[E: packages/ai/src/api/openai-completions.ts:71][E: packages/ai/src/api/openai-completions.ts:72][E: packages/ai/src/api/openai-completions.ts:73][E: packages/ai/src/api/openai-completions.ts:74]

## gotcha

- `finish_reason` is required for success:after stream end,absence of finish reason throws `"Stream ended without finish_reason"` and emits an error event.[E: packages/ai/src/api/openai-completions.ts:577][E: packages/ai/src/api/openai-completions.ts:581][E: packages/ai/src/api/openai-completions.ts:604]
- `streamSimple` does not directly send `SimpleStreamOptions.reasoning`;it clamps reasoning with `clampThinkingLevel`,turns `"off"` into undefined,then forwards `reasoningEffort` into `stream`.[E: packages/ai/src/api/openai-completions.ts:619][E: packages/ai/src/api/openai-completions.ts:620][E: packages/ai/src/api/openai-completions.ts:621][E: packages/ai/src/api/openai-completions.ts:624][E: packages/ai/src/api/openai-completions.ts:626]
- Cache control has two different mechanisms:OpenAI-style `prompt_cache_key` / `prompt_cache_retention` in params,plus Anthropic-compatible `cache_control` inserted into system prompt, last tool, and last conversation message when compat requests Anthropic cache control.[E: packages/ai/src/api/openai-completions.ts:694][E: packages/ai/src/api/openai-completions.ts:699][E: packages/ai/src/api/openai-completions.ts:899][E: packages/ai/src/api/openai-completions.ts:903][E: packages/ai/src/api/openai-completions.ts:911][E: packages/ai/src/api/openai-completions.ts:916][E: packages/ai/src/api/openai-completions.ts:917][E: packages/ai/src/api/openai-completions.ts:918]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - 上游 dispatch 层按 `model.api === "openai-completions"` 进入本 wire implementation;本节点只覆盖进入 `stream` 后的 Chat Completions request/stream behavior。[I]
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire path uses `openai-responses-shared.ts` for Responses input/tool/event conversion;本节点对 shared 文件的描述只用于划清与 Chat Completions 的协议边界。[E: packages/ai/src/api/openai-responses-shared.ts:136][E: packages/ai/src/api/openai-responses-shared.ts:344][E: packages/ai/src/api/openai-responses-shared.ts:416]

## 本轮 stream 状态、finish reason 与 fetch 变化

Accumulator 从 `pending` 开始；chunk 的原始 `finish_reason` 同时写入 `rawStopReason` 与 unified `stopReason`。默认仍要求 provider 给出 finish reason；只有 compat 显式 `supportsFinishReason: false` 时，流结束后才从是否存在 tool call 推断 `toolUse` 或 `stop`。[E: packages/ai/src/api/openai-completions.ts:205] [E: packages/ai/src/api/openai-completions.ts:219] [E: packages/ai/src/api/openai-completions.ts:458] [E: packages/ai/src/api/openai-completions.ts:465] [E: packages/ai/src/api/openai-completions.ts:571] [E: packages/ai/src/api/openai-completions.ts:584]

Client factory 现在接受 `options.fetch` 并传入 SDK；function tool delta 同时带空 `custom: {}` 时也不会再被误判为 custom grammar call。[E: packages/ai/src/api/openai-completions.ts:231] [E: packages/ai/src/api/openai-completions.ts:376] [E: packages/ai/src/api/openai-completions.ts:430] [E: packages/ai/src/api/openai-completions.ts:671]

## Sources

- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/openai-responses-shared.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api` 到 `api/<name>.ts` implementation 的派发边界。
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire 协议及 `openai-responses-shared.ts` 的主使用方。
