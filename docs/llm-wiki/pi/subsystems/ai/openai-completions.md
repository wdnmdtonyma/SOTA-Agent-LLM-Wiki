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
  - packages/ai/src/types.ts
symbols:
  - stream
  - OpenAICompletionsOptions
  - samplingParams
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.openai-responses
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.ai.openai-completions` 是 `pi-ai` 的 OpenAI Chat Completions wire 协议实现:它把统一 `Context`/`Model<"openai-completions">` 转成 `client.chat.completions.create(..., {stream:true})` 请求,再把 `ChatCompletionChunk` 归一成 `AssistantMessageEventStream`。

## 能回答的问题

- `openai-completions` 的 `stream` 入口怎样创建 OpenAI SDK client、构造 Chat Completions payload、发起 streaming 请求?
- `OpenAICompletionsOptions` 在通用 `StreamOptions` 外额外支持哪些字段?
- Chat Completions 请求里的 `messages`、`tools`、`tool_choice`、usage streaming、cache key、reasoning effort 分别在哪里填充?
- streaming chunk 的 text、reasoning、tool call、usage、finish reason 如何映射成内部事件和 `AssistantMessage`?
- `thinking_token_budget` 与 `samplingParams` 怎样进入 Chat Completions payload?
- DeepSeek 的 `maxTokens` 走 `max_tokens` 还是 `max_completion_tokens`?
- `openai-completions.ts` 与 `openai-responses-shared.ts` 的边界是什么,哪些逻辑没有共享?

## 职责边界

`openai-completions.ts` 负责完整的 Chat Completions wire path:API key 解析、OpenAI client 创建、Chat payload 构造、`client.chat.completions.create(...).withResponse()` 调用、chunk loop、usage 解析、finish reason 映射与 error/done 事件收束。[E: packages/ai/src/api/openai-completions.ts:201][E: packages/ai/src/api/openai-completions.ts:228][E: packages/ai/src/api/openai-completions.ts:236][E: packages/ai/src/api/openai-completions.ts:237][E: packages/ai/src/api/openai-completions.ts:247][E: packages/ai/src/api/openai-completions.ts:441][E: packages/ai/src/api/openai-completions.ts:589][E: packages/ai/src/api/openai-completions.ts:609] `openai-responses-shared.ts` 覆盖 Responses API 的 `ResponseInput` conversion、Responses tool conversion 与 `ResponseStreamEvent` processing,不是 Chat Completions chunk parser。[E: packages/ai/src/api/openai-responses-shared.ts:138][E: packages/ai/src/api/openai-responses-shared.ts:359][E: packages/ai/src/api/openai-responses-shared.ts:432]

`OpenAICompletionsOptions` 继承 `StreamOptions`,额外暴露 `toolChoice`、`reasoningEffort` 和 `thinkingBudgets`;`reasoningEffort` 接受 `minimal|low|medium|high|xhigh|max`,`toolChoice` 可为 `auto|none|required` 或指定 function name,`thinkingBudgets` 只在 compat `supportsThinkingTokenBudget` 时使用。[E: packages/ai/src/api/openai-completions.ts:143][E: packages/ai/src/api/openai-completions.ts:144][E: packages/ai/src/api/openai-completions.ts:145][E: packages/ai/src/api/openai-completions.ts:147] 继承的 `StreamOptions.samplingParams` 是任意 record,在 named request 字段之后 `Object.assign` 进 payload,因此可覆盖 `temperature` / `max_tokens` 等已写字段。[E: packages/ai/src/types.ts:189][E: packages/ai/src/api/openai-completions.ts:886][E: packages/ai/src/api/openai-completions.ts:887]

## 关键文件

- `packages/ai/src/api/openai-completions.ts` - 权威实现 `stream`、`streamSimple`、`convertMessages`、`convertTools`、`parseChunkUsage`、`mapStopReason`、provider compat detection/resolution。[E: packages/ai/src/api/openai-completions.ts:201][E: packages/ai/src/api/openai-completions.ts:617][E: packages/ai/src/api/openai-completions.ts:1047][E: packages/ai/src/api/openai-completions.ts:1338][E: packages/ai/src/api/openai-completions.ts:1375][E: packages/ai/src/api/openai-completions.ts:1413][E: packages/ai/src/api/openai-completions.ts:1444][E: packages/ai/src/api/openai-completions.ts:1544]
- `packages/ai/src/api/openai-responses-shared.ts` - Responses API 的 shared helpers;本节点只用它说明与 Responses 协议的边界,因为 Chat Completions implementation 的 imports 不包含该 shared 模块。[I][E: packages/ai/src/api/openai-completions.ts:1][E: packages/ai/src/api/openai-completions.ts:57][E: packages/ai/src/api/openai-responses-shared.ts:138][E: packages/ai/src/api/openai-responses-shared.ts:432]

## 数据模型

`stream` 初始化一个 `AssistantMessage` partial,预填 `role:"assistant"`、空 `content`、`api/provider/model`、零值 usage、`stopReason:"pending"` 和 timestamp;后续 chunk parsing 原地补全 `content`、`usage`、`responseId`、`responseModel`、`rawStopReason`、`stopReason`、`errorMessage`。[E: packages/ai/src/api/openai-completions.ts:206][E: packages/ai/src/api/openai-completions.ts:209][E: packages/ai/src/api/openai-completions.ts:212][E: packages/ai/src/api/openai-completions.ts:215][E: packages/ai/src/api/openai-completions.ts:223][E: packages/ai/src/api/openai-completions.ts:446][E: packages/ai/src/api/openai-completions.ts:463][E: packages/ai/src/api/openai-completions.ts:466]

streaming 内部有三类 block:`TextContent`、`ThinkingContent`、`StreamingToolCallBlock`;tool call block 在 stream 中额外带 `partialArgs` 和 `streamIndex`,结束时解析 `partialArgs` 并删除 scratch 字段,避免 replay 持久化 parser 缓冲。[E: packages/ai/src/api/openai-completions.ts:258][E: packages/ai/src/api/openai-completions.ts:266][E: packages/ai/src/api/openai-completions.ts:538][E: packages/ai/src/api/openai-completions.ts:340][E: packages/ai/src/api/openai-completions.ts:342]

## 控制流

1. `stream@openai-completions.ts:151` 同步返回 `AssistantMessageEventStream`,异步 IIFE 内先解析 API key、compat、cache retention、session affinity,再创建 OpenAI SDK client 并构造 params。[E: packages/ai/src/api/openai-completions.ts:201][E: packages/ai/src/api/openai-completions.ts:208][E: packages/ai/src/api/openai-completions.ts:228][E: packages/ai/src/api/openai-completions.ts:229][E: packages/ai/src/api/openai-completions.ts:234][E: packages/ai/src/api/openai-completions.ts:235][E: packages/ai/src/api/openai-completions.ts:236][E: packages/ai/src/api/openai-completions.ts:237]
   Session affinity 仅在 compat 启用时注入：`openrouter` 写 `x-session-id`；`openai` 写 `session_id`、`x-client-request-id`、`x-session-affinity`；`openai-nosession` 省略 `session_id` 但保留后两个 headers [E: packages/ai/src/api/openai-completions.ts:653] [E: packages/ai/src/api/openai-completions.ts:657] [E: packages/ai/src/api/openai-completions.ts:660] [E: packages/ai/src/api/openai-completions.ts:664]。
2. `onPayload` 可替换即将发送的 Chat Completions params,request options 会透传 abort signal、timeout 和 `maxRetries` 默认值 0。[E: packages/ai/src/api/openai-completions.ts:238][E: packages/ai/src/api/openai-completions.ts:240][E: packages/ai/src/api/openai-completions.ts:242][E: packages/ai/src/api/openai-completions.ts:243][E: packages/ai/src/api/openai-completions.ts:244][E: packages/ai/src/api/openai-completions.ts:245]
3. wire request 调用 `client.chat.completions.create(params, requestOptions).withResponse()`,再把 HTTP status/headers 交给 `onResponse`,随后 push `start` 事件。[E: packages/ai/src/api/openai-completions.ts:247][E: packages/ai/src/api/openai-completions.ts:248][E: packages/ai/src/api/openai-completions.ts:248][E: packages/ai/src/api/openai-completions.ts:255][E: packages/ai/src/api/openai-completions.ts:256]
4. `for await (const chunk of openaiStream)` 逐 chunk 更新 response id/model、usage、choice finish reason、text/thinking/tool call deltas 和 encrypted reasoning details。[E: packages/ai/src/api/openai-completions.ts:441][E: packages/ai/src/api/openai-completions.ts:446][E: packages/ai/src/api/openai-completions.ts:448][E: packages/ai/src/api/openai-completions.ts:451][E: packages/ai/src/api/openai-completions.ts:463][E: packages/ai/src/api/openai-completions.ts:473][E: packages/ai/src/api/openai-completions.ts:552]
5. chunk loop 结束后,implementation 对所有 blocks 调用 `finishBlock`,再把 abort、error stop reason、缺失 finish reason 变成 thrown error;正常路径 push `done` 并 end stream,catch 路径清理 scratch 字段、设置 `stopReason` 并 push `error`。[E: packages/ai/src/api/openai-completions.ts:569][E: packages/ai/src/api/openai-completions.ts:570][E: packages/ai/src/api/openai-completions.ts:572][E: packages/ai/src/api/openai-completions.ts:582][E: packages/ai/src/api/openai-completions.ts:582][E: packages/ai/src/api/openai-completions.ts:589][E: packages/ai/src/api/openai-completions.ts:592][E: packages/ai/src/api/openai-completions.ts:599][E: packages/ai/src/api/openai-completions.ts:609]

## 请求字段

`buildParams` 的基础 payload 是 `{model, messages, stream:true, prompt_cache_key?, prompt_cache_retention?}`;`messages` 来自 `convertMessages`,OpenAI 官方 base URL 且 cache retention 非 `none` 时会设置 clamped prompt cache key,long retention 且 compat 支持时会设置 `prompt_cache_retention:"24h"`。[E: packages/ai/src/api/openai-completions.ts:693][E: packages/ai/src/api/openai-completions.ts:696][E: packages/ai/src/api/openai-completions.ts:697][E: packages/ai/src/api/openai-completions.ts:698][E: packages/ai/src/api/openai-completions.ts:699][E: packages/ai/src/api/openai-completions.ts:700][E: packages/ai/src/api/openai-completions.ts:705]

当 compat 没有禁用 streaming usage 时,params 增加 `stream_options:{include_usage:true}`;支持 store 的 provider 会显式 `store=false`;`maxTokens` 根据 compat `maxTokensField` 写入 `max_tokens` 或 `max_completion_tokens`;temperature 仅在 options 提供时写入。[E: packages/ai/src/api/openai-completions.ts:708][E: packages/ai/src/api/openai-completions.ts:709][E: packages/ai/src/api/openai-completions.ts:712][E: packages/ai/src/api/openai-completions.ts:713][E: packages/ai/src/api/openai-completions.ts:716][E: packages/ai/src/api/openai-completions.ts:717][E: packages/ai/src/api/openai-completions.ts:718][E: packages/ai/src/api/openai-completions.ts:720][E: packages/ai/src/api/openai-completions.ts:724][E: packages/ai/src/api/openai-completions.ts:725] DeepSeek 被 `detectCompat` 算进 `useMaxTokens`:provider 为 `deepseek` 或 base URL 含 `deepseek.com` 时走 `max_tokens`,而不是 OpenAI 官方的 `max_completion_tokens`。[E: packages/ai/src/api/openai-completions.ts:1461][E: packages/ai/src/api/openai-completions.ts:1480][E: packages/ai/src/api/openai-completions.ts:1482][E: packages/ai/src/api/openai-completions.ts:1502]

tools 来自 `context.tools` 时通过 `convertTools` 转成 OpenAI function tools;没有当前 tools 但历史消息含 tool call/tool result 时,params 写入空 tools 数组以兼容要求 tools param 的代理/provider。[E: packages/ai/src/api/openai-completions.ts:983][E: packages/ai/src/api/openai-completions.ts:732][E: packages/ai/src/api/openai-completions.ts:736][E: packages/ai/src/api/openai-completions.ts:738][E: packages/ai/src/api/openai-completions.ts:1338][E: packages/ai/src/api/openai-completions.ts:1342][E: packages/ai/src/api/openai-completions.ts:1335][E: packages/ai/src/api/openai-completions.ts:1369] `toolChoice` 只在 options 提供时写入 `params.tool_choice`。[E: packages/ai/src/api/openai-completions.ts:745][E: packages/ai/src/api/openai-completions.ts:746]

reasoning 参数按 compat 分支写入 provider-specific shape:Z.ai 用 `thinking` 与可选 `reasoning_effort`,且启用时带 `clear_thinking:false`;Qwen variants 用 `enable_thinking` 或 `chat_template_kwargs`;Baseten 用 configurable `chat_template_args`，并只在 `supportsReasoningEffort` 时写映射后的 `reasoning_effort`;DeepSeek 用 `thinking`/`reasoning_effort`,OpenRouter 用嵌套 `reasoning`,Together 用 `reasoning.enabled` 与可选 `reasoning_effort`,默认 OpenAI-style 分支用 `reasoning_effort`。[E: packages/ai/src/api/openai-completions.ts:749][E: packages/ai/src/api/openai-completions.ts:754][E: packages/ai/src/api/openai-completions.ts:762][E: packages/ai/src/api/openai-completions.ts:770][E: packages/ai/src/api/openai-completions.ts:780][E: packages/ai/src/api/openai-completions.ts:785][E: packages/ai/src/api/openai-completions.ts:787][E: packages/ai/src/api/openai-completions.ts:789][E: packages/ai/src/api/openai-completions.ts:791][E: packages/ai/src/api/openai-completions.ts:794][E: packages/ai/src/api/openai-completions.ts:797][E: packages/ai/src/api/openai-completions.ts:807][E: packages/ai/src/api/openai-completions.ts:822][E: packages/ai/src/api/openai-completions.ts:838]

`buildChatTemplateValues()` 同时服务 `chatTemplateKwargs` 与 Baseten `chatTemplateArgs`：它逐值解析 literal 或 `$var`，忽略解析为 `undefined` 的项，空 object 不发到 wire。[E: packages/ai/src/api/openai-completions.ts:775] [E: packages/ai/src/api/openai-completions.ts:776] [E: packages/ai/src/api/openai-completions.ts:785] [E: packages/ai/src/api/openai-completions.ts:893] [E: packages/ai/src/api/openai-completions.ts:900] [E: packages/ai/src/api/openai-completions.ts:901] [E: packages/ai/src/api/openai-completions.ts:907]

vLLM-style `thinking_token_budget` 独立于 `thinkingFormat`:只要 `compat.supportsThinkingTokenBudget`、存在 `reasoningEffort` 且模型是 reasoning model,就按 level 取 budget(`minimal` 1024 / `low` 2048 / `medium` 8192 / `high` 16384,可被 `options.thinkingBudgets` 覆盖),再与 `max_tokens`/`max_completion_tokens`/`model.maxTokens` 天花板比较,并至少给答案留 `MIN_ANSWER_TOKENS` (1024)。`xhigh`/`max` 先被 `clampReasoning()` 收成 `high`。budget 算完为 0 则不写该字段。[E: packages/ai/src/api/openai-completions.ts:852] [E: packages/ai/src/api/openai-completions.ts:854] [E: packages/ai/src/api/openai-completions.ts:859] [E: packages/ai/src/api/openai-completions.ts:861] [E: packages/ai/src/api/openai-completions.ts:863] [E: packages/ai/src/api/openai-completions.ts:865] [E: packages/ai/src/api/simple-options.ts:55] [E: packages/ai/src/api/simple-options.ts:57] [E: packages/ai/src/api/simple-options.ts:58] [E: packages/ai/src/types.ts:590]

`samplingParams` 在 buildParams 最后 `Object.assign` 进 request,因此调用方或 `Model.samplingParams` 的 key 可以覆盖前面的 named fields。`streamSimple` 经 `buildBaseOptions()` 把 `model.samplingParams` 与 request `samplingParams` 按 key merge,request 覆盖 model。[E: packages/ai/src/api/openai-completions.ts:886] [E: packages/ai/src/api/openai-completions.ts:886] [E: packages/ai/src/api/openai-completions.ts:887] [E: packages/ai/src/api/simple-options.ts:27] [E: packages/ai/src/api/simple-options.ts:28] [E: packages/ai/src/api/simple-options.ts:29] [E: packages/ai/src/types.ts:189]

## 消息与 tool call 转换

`convertMessages` 先通过 `transformMessages(context.messages, model, normalizeToolCallId)` 做 replay normalization,其中 pipe 分隔的 Responses/Codex-style tool call id 会取 `call_id` 部分并归一化到最多 40 字符;OpenAI provider 的非 pipe id 也会截断到 40 字符。[E: packages/ai/src/api/openai-completions.ts:1055][E: packages/ai/src/api/openai-completions.ts:1063][E: packages/ai/src/api/openai-completions.ts:1066][E: packages/ai/src/api/openai-completions.ts:1077][E: packages/ai/src/api/openai-completions.ts:1081]

system prompt 根据 reasoning model 与 compat 选择 `developer` 或 `system` role;user string 转 user text,带 image 的 user content 转 Chat Completions `text`/`image_url` parts。[E: packages/ai/src/api/openai-completions.ts:1083][E: packages/ai/src/api/openai-completions.ts:1084][E: packages/ai/src/api/openai-completions.ts:1085][E: packages/ai/src/api/openai-completions.ts:1086][E: packages/ai/src/api/openai-completions.ts:1102][E: packages/ai/src/api/openai-completions.ts:1104][E: packages/ai/src/api/openai-completions.ts:1109][E: packages/ai/src/api/openai-completions.ts:1112][E: packages/ai/src/api/openai-completions.ts:1117]

assistant 历史消息会收集 text blocks;常规路径把 text 拼成 string content,但 `requiresThinkingAsText` 且存在 thinking blocks 时会把 thinking 和文本作为 Chat Completions text parts 发送;thinking blocks 也可能按 compat 写入 provider-specific reasoning field。tool call blocks 转为 `assistantMsg.tool_calls` 的 OpenAI function call shape;带 `thoughtSignature` 的 tool call 会回填到 `reasoning_details`。[E: packages/ai/src/api/openai-completions.ts:1137][E: packages/ai/src/api/openai-completions.ts:1147][E: packages/ai/src/api/openai-completions.ts:1149][E: packages/ai/src/api/openai-completions.ts:1153][E: packages/ai/src/api/openai-completions.ts:1158][E: packages/ai/src/api/openai-completions.ts:1165][E: packages/ai/src/api/openai-completions.ts:1166][E: packages/ai/src/api/openai-completions.ts:1174][E: packages/ai/src/api/openai-completions.ts:1175][E: packages/ai/src/api/openai-completions.ts:1187][E: packages/ai/src/api/openai-completions.ts:1189][E: packages/ai/src/api/openai-completions.ts:1206][E: packages/ai/src/api/openai-completions.ts:1210][E: packages/ai/src/api/openai-completions.ts:1221]

tool result history 转为 role `tool` messages,纯图片结果会用占位文本;如果模型支持 image input,连续 tool results 里的 image blocks 会额外汇总成一个 user message `Attached image(s) from tool result:` 加 image_url parts。[E: packages/ai/src/api/openai-completions.ts:1244][E: packages/ai/src/api/openai-completions.ts:1253][E: packages/ai/src/api/openai-completions.ts:1263][E: packages/ai/src/api/openai-completions.ts:1225][E: packages/ai/src/api/openai-completions.ts:1266][E: packages/ai/src/api/openai-completions.ts:1279][E: packages/ai/src/api/openai-completions.ts:1282][E: packages/ai/src/api/openai-completions.ts:1303][E: packages/ai/src/api/openai-completions.ts:1308]

## stream chunk 解析

text delta 来自 `choice.delta.content`;首次遇到 text 时创建 text block 并 push `text_start`,每个 delta 追加到 block 并 push `text_delta`,结束时 `finishBlock` push `text_end`。[E: packages/ai/src/api/openai-completions.ts:351][E: packages/ai/src/api/openai-completions.ts:353][E: packages/ai/src/api/openai-completions.ts:355][E: packages/ai/src/api/openai-completions.ts:475][E: packages/ai/src/api/openai-completions.ts:480][E: packages/ai/src/api/openai-completions.ts:482][E: packages/ai/src/api/openai-completions.ts:311]

thinking delta 从 `reasoning_content`、`reasoning`、`reasoning_text` 三个非标准字段中取第一个非空字段;首次遇到 thinking 时创建 thinking block,把字段名写入 `thinkingSignature`,但 `opencode-go` 的 `reasoning` 字段会归一为 `reasoning_content`;随后发出 `thinking_start`/`thinking_delta`/`thinking_end`。[E: packages/ai/src/api/openai-completions.ts:359][E: packages/ai/src/api/openai-completions.ts:364][E: packages/ai/src/api/openai-completions.ts:367][E: packages/ai/src/api/openai-completions.ts:493][E: packages/ai/src/api/openai-completions.ts:496][E: packages/ai/src/api/openai-completions.ts:507][E: packages/ai/src/api/openai-completions.ts:508][E: packages/ai/src/api/openai-completions.ts:509][E: packages/ai/src/api/openai-completions.ts:510][E: packages/ai/src/api/openai-completions.ts:511][E: packages/ai/src/api/openai-completions.ts:512][E: packages/ai/src/api/openai-completions.ts:514][E: packages/ai/src/api/openai-completions.ts:318]

tool call delta 来自 `choice.delta.tool_calls`;parser 用 stream index 或 id 找到/创建 block,累加 `function.arguments` 到 `partialArgs`,用 `parseStreamingJson` 维护增量可读 arguments,每个 delta 发 `toolcall_delta`,结束时发 `toolcall_end`。[E: packages/ai/src/api/openai-completions.ts:381][E: packages/ai/src/api/openai-completions.ts:384][E: packages/ai/src/api/openai-completions.ts:388][E: packages/ai/src/api/openai-completions.ts:412][E: packages/ai/src/api/openai-completions.ts:522][E: packages/ai/src/api/openai-completions.ts:535][E: packages/ai/src/api/openai-completions.ts:537][E: packages/ai/src/api/openai-completions.ts:538][E: packages/ai/src/api/openai-completions.ts:544][E: packages/ai/src/api/openai-completions.ts:344]

`reasoning_details` 中符合 `reasoning.encrypted` shape 的条目会序列化为 JSON 并挂到对应 tool call 的 `thoughtSignature`;如果 reasoning detail 早于 tool call block 到达,parser 会先放进 pending map,后续 `ensureToolCallBlock` 再应用。[E: packages/ai/src/api/openai-completions.ts:129][E: packages/ai/src/api/openai-completions.ts:135][E: packages/ai/src/api/openai-completions.ts:371][E: packages/ai/src/api/openai-completions.ts:375][E: packages/ai/src/api/openai-completions.ts:377][E: packages/ai/src/api/openai-completions.ts:437][E: packages/ai/src/api/openai-completions.ts:552][E: packages/ai/src/api/openai-completions.ts:555][E: packages/ai/src/api/openai-completions.ts:559][E: packages/ai/src/api/openai-completions.ts:561]

usage 优先来自 `chunk.usage`,fallback 到 `choice.usage`;`parseChunkUsage` 把 `prompt_tokens` 扣除 cache read/write 后作为 input,把 `completion_tokens` 作为 output,把 `completion_tokens_details.reasoning_tokens` 作为 reasoning,再调用 `calculateCost`。[E: packages/ai/src/api/openai-completions.ts:450][E: packages/ai/src/api/openai-completions.ts:451][E: packages/ai/src/api/openai-completions.ts:459][E: packages/ai/src/api/openai-completions.ts:460][E: packages/ai/src/api/openai-completions.ts:1385][E: packages/ai/src/api/openai-completions.ts:1386][E: packages/ai/src/api/openai-completions.ts:1387][E: packages/ai/src/api/openai-completions.ts:1397][E: packages/ai/src/api/openai-completions.ts:1399][E: packages/ai/src/api/openai-completions.ts:1405][E: packages/ai/src/api/openai-completions.ts:1409]

finish reason 映射规则是 `stop|end -> stop`,`length -> length`,`function_call|tool_calls -> toolUse`,`content_filter|network_error|unknown -> error`;如果整个 stream 未见 finish reason,实现视为错误而不是 silently done。[E: packages/ai/src/api/openai-completions.ts:463][E: packages/ai/src/api/openai-completions.ts:465][E: packages/ai/src/api/openai-completions.ts:1419][E: packages/ai/src/api/openai-completions.ts:1422][E: packages/ai/src/api/openai-completions.ts:1424][E: packages/ai/src/api/openai-completions.ts:1427][E: packages/ai/src/api/openai-completions.ts:1429][E: packages/ai/src/api/openai-completions.ts:1432][E: packages/ai/src/api/openai-completions.ts:582]

## 与 Responses/shared 模块边界

Responses shared 的 `convertResponsesMessages` 生成 Responses API `ResponseInput`;当目标 provider 被允许且历史 assistant tool call id 带 pipe 时,它保留 `call_id|item_id` 双段结构,并在必要时让 item id 满足 `fc_` 前缀要求。[E: packages/ai/src/api/openai-responses-shared.ts:138][E: packages/ai/src/api/openai-responses-shared.ts:144][E: packages/ai/src/api/openai-responses-shared.ts:158][E: packages/ai/src/api/openai-responses-shared.ts:159][E: packages/ai/src/api/openai-responses-shared.ts:160][E: packages/ai/src/api/openai-responses-shared.ts:161][E: packages/ai/src/api/openai-responses-shared.ts:166][E: packages/ai/src/api/openai-responses-shared.ts:169] Chat Completions 的 `convertMessages` 则把 pipe id 压回单段 Chat `tool_call_id`,因为 Chat Completions tool messages 使用单个 `tool_call_id` 字段。[E: packages/ai/src/api/openai-completions.ts:1055][E: packages/ai/src/api/openai-completions.ts:1063][E: packages/ai/src/api/openai-completions.ts:1066][E: packages/ai/src/api/openai-completions.ts:1263][E: packages/ai/src/api/openai-completions.ts:1266]

Responses shared 的 `processResponsesStream` 按 `ResponseStreamEvent` 的 typed event name 建 slot,例如 `response.output_item.added`、`response.output_text.delta`、`response.function_call_arguments.delta`、`response.output_item.done`、`response.completed|response.incomplete`;Completions 的 stream loop 只处理 `ChatCompletionChunk` 的 `choices[0].delta` 和 `finish_reason`。[E: packages/ai/src/api/openai-responses-shared.ts:432][E: packages/ai/src/api/openai-responses-shared.ts:597][E: packages/ai/src/api/openai-responses-shared.ts:600][E: packages/ai/src/api/openai-responses-shared.ts:632][E: packages/ai/src/api/openai-responses-shared.ts:652][E: packages/ai/src/api/openai-responses-shared.ts:680][E: packages/ai/src/api/openai-responses-shared.ts:740][E: packages/ai/src/api/openai-completions.ts:441][E: packages/ai/src/api/openai-completions.ts:454][E: packages/ai/src/api/openai-completions.ts:463][E: packages/ai/src/api/openai-completions.ts:473]

`openai-completions.ts` and `openai-responses-shared.ts` both normalize into the same internal `AssistantMessage` content block vocabulary, but the evidence in this node only establishes same-shape event outputs, not a shared parser abstraction.[I][E: packages/ai/src/api/openai-completions.ts:266][E: packages/ai/src/api/openai-completions.ts:311][E: packages/ai/src/api/openai-completions.ts:318][E: packages/ai/src/api/openai-completions.ts:344][E: packages/ai/src/api/openai-responses-shared.ts:425][E: packages/ai/src/api/openai-responses-shared.ts:473][E: packages/ai/src/api/openai-responses-shared.ts:482][E: packages/ai/src/api/openai-responses-shared.ts:525]

## 设计动机与权衡

Compat detection/resolution lets one Chat Completions implementation target OpenAI and many OpenAI-compatible providers;detected defaults cover provider/baseURL families,then explicit `model.compat` fields override individual capabilities.[E: packages/ai/src/api/openai-completions.ts:1444][E: packages/ai/src/api/openai-completions.ts:1448][E: packages/ai/src/api/openai-completions.ts:1463][E: packages/ai/src/api/openai-completions.ts:1495][E: packages/ai/src/api/openai-completions.ts:1544][E: packages/ai/src/api/openai-completions.ts:1545][E: packages/ai/src/api/openai-completions.ts:1548][E: packages/ai/src/api/openai-completions.ts:1549]

Client auth treats explicit API key as primary,Authorization-style headers as sufficient fallback with dummy key `"unused"`,and absence of both as a provider-specific error;this supports providers/proxies that authenticate entirely through headers.[E: packages/ai/src/api/openai-completions.ts:73][E: packages/ai/src/api/openai-completions.ts:74][E: packages/ai/src/api/openai-completions.ts:75][E: packages/ai/src/api/openai-completions.ts:76]

## gotcha

- `finish_reason` is required for success:after stream end,absence of finish reason throws `"Stream ended without finish_reason"` and emits an error event.[E: packages/ai/src/api/openai-completions.ts:582][E: packages/ai/src/api/openai-completions.ts:586][E: packages/ai/src/api/openai-completions.ts:609]
- `streamSimple` does not directly send `SimpleStreamOptions.reasoning`;it clamps reasoning with `clampThinkingLevel`,turns `"off"` into undefined,then forwards `reasoningEffort` into `stream`.[E: packages/ai/src/api/openai-completions.ts:624][E: packages/ai/src/api/openai-completions.ts:625][E: packages/ai/src/api/openai-completions.ts:626][E: packages/ai/src/api/openai-completions.ts:629][E: packages/ai/src/api/openai-completions.ts:631]
- Cache control has two different mechanisms:OpenAI-style `prompt_cache_key` / `prompt_cache_retention` in params,plus Anthropic-compatible `cache_control` inserted into system prompt, last tool, and last conversation message when compat requests Anthropic cache control.[E: packages/ai/src/api/openai-completions.ts:700][E: packages/ai/src/api/openai-completions.ts:705][E: packages/ai/src/api/openai-completions.ts:931][E: packages/ai/src/api/openai-completions.ts:935][E: packages/ai/src/api/openai-completions.ts:943][E: packages/ai/src/api/openai-completions.ts:948][E: packages/ai/src/api/openai-completions.ts:949][E: packages/ai/src/api/openai-completions.ts:950]

## 跨包边界

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - 上游 dispatch 层按 `model.api === "openai-completions"` 进入本 wire implementation;本节点只覆盖进入 `stream` 后的 Chat Completions request/stream behavior。[I]
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire path uses `openai-responses-shared.ts` for Responses input/tool/event conversion;本节点对 shared 文件的描述只用于划清与 Chat Completions 的协议边界。[E: packages/ai/src/api/openai-responses-shared.ts:138][E: packages/ai/src/api/openai-responses-shared.ts:359][E: packages/ai/src/api/openai-responses-shared.ts:432]

## 本轮 stream 状态、finish reason 与 fetch 变化

Accumulator 从 `pending` 开始；chunk 的原始 `finish_reason` 同时写入 `rawStopReason` 与 unified `stopReason`。默认仍要求 provider 给出 finish reason；只有 compat 显式 `supportsFinishReason: false` 时，流结束后才从是否存在 tool call 推断 `toolUse` 或 `stop`。[E: packages/ai/src/api/openai-completions.ts:210] [E: packages/ai/src/api/openai-completions.ts:224] [E: packages/ai/src/api/openai-completions.ts:463] [E: packages/ai/src/api/openai-completions.ts:470] [E: packages/ai/src/api/openai-completions.ts:576] [E: packages/ai/src/api/openai-completions.ts:589]

Client factory 现在接受 `options.fetch` 并传入 SDK；function tool delta 同时带空 `custom: {}` 时也不会再被误判为 custom grammar call。[E: packages/ai/src/api/openai-completions.ts:236] [E: packages/ai/src/api/openai-completions.ts:381] [E: packages/ai/src/api/openai-completions.ts:435] [E: packages/ai/src/api/openai-completions.ts:677]

## Sources

- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/types.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api` 到 `api/<name>.ts` implementation 的派发边界。
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire 协议及 `openai-responses-shared.ts` 的主使用方。
