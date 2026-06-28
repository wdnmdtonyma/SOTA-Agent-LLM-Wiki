---
id: subsys.ai.google-generative-ai
title: Google Generative AI 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/google-generative-ai.ts
  - packages/ai/src/api/google-shared.ts
  - packages/ai/src/api/google-vertex.ts
  - packages/ai/src/api/google-generative-ai.lazy.ts
  - packages/ai/src/providers/google.ts
symbols:
  - stream
  - GoogleOptions
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.google-vertex
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.ai.google-generative-ai` 描述 `pi-ai` 如何把统一 `Context` 和 `GoogleOptions` 转成 Gemini Developer API `generateContentStream` 请求,并把 Google SDK stream 归一回 `AssistantMessageEventStream`。

## 能回答的问题

- `google-generative-ai` wire implementation 的入口函数和 provider 装配点在哪里?
- `GoogleOptions` 支持哪些 Google-specific 控制项?
- `Context.messages` 如何转成 Gemini `Content[]`,包括文本、图片、thinking、tool call 和 tool result?
- `context.tools` 与 `toolChoice` 如何转成 Gemini function declarations 和 function calling mode?
- Google SDK streaming chunk 如何被转换成 pi 的 text/thinking/toolcall/done/error 事件?
- Google Generative AI 与 Google Vertex AI 在认证、endpoint、thinking enum 和项目/地域参数上有什么差异?

## 职责边界

`packages/ai/src/api/google-generative-ai.ts` 是 Gemini Developer API 的 wire entry:它导出 `stream` 和 `streamSimple`,用 `new GoogleGenAI({ apiKey, httpOptions })` 创建 client,并调用 `client.models.generateContentStream(params)`。[E: packages/ai/src/api/google-generative-ai.ts:49][E: packages/ai/src/api/google-generative-ai.ts:86][E: packages/ai/src/api/google-generative-ai.ts:283][E: packages/ai/src/api/google-generative-ai.ts:336][E: packages/ai/src/api/google-generative-ai.ts:337][E: packages/ai/src/api/google-generative-ai.ts:338]

内置 `google` provider 把 provider id 设为 `google`,默认 base URL 设为 `https://generativelanguage.googleapis.com/v1beta`,认证来源设为 `GEMINI_API_KEY`,并把 `api` 接到 `googleGenerativeAIApi()` lazy wrapper。[E: packages/ai/src/providers/google.ts:8][E: packages/ai/src/providers/google.ts:10][E: packages/ai/src/providers/google.ts:11][E: packages/ai/src/providers/google.ts:13] lazy wrapper 只做 dynamic import,实际协议代码仍在 `google-generative-ai.ts`。[E: packages/ai/src/api/google-generative-ai.lazy.ts:4]

`GoogleOptions` 扩展通用 `StreamOptions`,只增加 `toolChoice?: "auto" | "none" | "any"` 和 `thinking` 配置;`thinking.budgetTokens` 可传 token budget,`thinking.level` 使用 `GoogleThinkingLevel` 字符串类型。[E: packages/ai/src/api/google-generative-ai.ts:37][E: packages/ai/src/api/google-generative-ai.ts:38][E: packages/ai/src/api/google-generative-ai.ts:39][E: packages/ai/src/api/google-generative-ai.ts:41][E: packages/ai/src/api/google-generative-ai.ts:42][E: packages/ai/src/api/google-shared.ts:16]

## request 构造

`stream` 先建立一个空的 `AssistantMessage` accumulator,检查 `options.apiKey`,再创建 SDK client、调用 `buildParams(model, context, options)`,允许 `options.onPayload` 替换 payload,最后把 payload 交给 `generateContentStream`。[E: packages/ai/src/api/google-generative-ai.ts:57][E: packages/ai/src/api/google-generative-ai.ts:76][E: packages/ai/src/api/google-generative-ai.ts:80][E: packages/ai/src/api/google-generative-ai.ts:81][E: packages/ai/src/api/google-generative-ai.ts:82][E: packages/ai/src/api/google-generative-ai.ts:86]

`createClient` 把 `model.baseUrl` 写入 SDK `httpOptions.baseUrl`,同时把 `apiVersion` 清空,因为该 base URL 已经包含版本路径;`model.headers` 和 `options.headers` 经 `providerHeadersToRecord` 合并后作为 SDK HTTP headers。[E: packages/ai/src/api/google-generative-ai.ts:321][E: packages/ai/src/api/google-generative-ai.ts:327][E: packages/ai/src/api/google-generative-ai.ts:329][E: packages/ai/src/api/google-generative-ai.ts:331][E: packages/ai/src/api/google-generative-ai.ts:336]

`buildParams` 负责把 `Context` 转为 `GenerateContentParameters`:它调用 shared `convertMessages`,把 `temperature` 和 `maxTokens` 转成 `GenerateContentConfig.temperature` 和 `maxOutputTokens`,把 `context.systemPrompt` 转成 `systemInstruction`,把 `context.tools` 转成 Gemini `tools`,最后返回 `{ model, contents, config }`。[E: packages/ai/src/api/google-generative-ai.ts:342][E: packages/ai/src/api/google-generative-ai.ts:347][E: packages/ai/src/api/google-generative-ai.ts:350][E: packages/ai/src/api/google-generative-ai.ts:354][E: packages/ai/src/api/google-generative-ai.ts:357][E: packages/ai/src/api/google-generative-ai.ts:359][E: packages/ai/src/api/google-generative-ai.ts:360][E: packages/ai/src/api/google-generative-ai.ts:393]

`streamSimple` 是统一 simple options 到 Google options 的 adapter:没有 `options.reasoning` 时显式传 `thinking: { enabled: false }`;有 reasoning 时先 `clampThinkingLevel`,Gemini 3 Pro、Gemini 3 Flash/Lite 和 Gemma 4 走 thinking level,其他模型走 thinking budget。[E: packages/ai/src/api/google-generative-ai.ts:293][E: packages/ai/src/api/google-generative-ai.ts:294][E: packages/ai/src/api/google-generative-ai.ts:295][E: packages/ai/src/api/google-generative-ai.ts:298][E: packages/ai/src/api/google-generative-ai.ts:302][E: packages/ai/src/api/google-generative-ai.ts:307][E: packages/ai/src/api/google-generative-ai.ts:316]

## content 转换

`google-shared.ts` 同时服务 `google-generative-ai` 和 `google-vertex`:它用 `GoogleApiType = "google-generative-ai" | "google-vertex"` 约束 shared 转换函数的泛型范围,两个 wire implementation 也都从该文件导入 shared helpers。[E: packages/ai/src/api/google-shared.ts:10][E: packages/ai/src/api/google-shared.ts:91][E: packages/ai/src/api/google-generative-ai.ts:26][E: packages/ai/src/api/google-vertex.ts:31]

`convertMessages(model, context)` 先调用 `transformMessages(context.messages, model, normalizeToolCallId)`,并把 Google-specific tool call id normalizer 交给 shared message transformer。[E: packages/ai/src/api/google-shared.ts:91][E: packages/ai/src/api/google-shared.ts:93][E: packages/ai/src/api/google-shared.ts:94][E: packages/ai/src/api/google-shared.ts:95][E: packages/ai/src/api/google-shared.ts:98] 对 user 文本消息,它生成 `{ role: "user", parts: [{ text }] }`;对 user 多模态消息,文本 block 变成 `{ text }`,图片 block 变成 Gemini `inlineData`。[E: packages/ai/src/api/google-shared.ts:101][E: packages/ai/src/api/google-shared.ts:103][E: packages/ai/src/api/google-shared.ts:105][E: packages/ai/src/api/google-shared.ts:108][E: packages/ai/src/api/google-shared.ts:110][E: packages/ai/src/api/google-shared.ts:112]

对 assistant 历史消息,`convertMessages` 输出 Gemini `role: "model"`;文本 block 变成 text part,thinking block 在同 provider 同 model 时保留 `thought: true`,否则降级为普通 text part。[E: packages/ai/src/api/google-shared.ts:126][E: packages/ai/src/api/google-shared.ts:129][E: packages/ai/src/api/google-shared.ts:132][E: packages/ai/src/api/google-shared.ts:136][E: packages/ai/src/api/google-shared.ts:140][E: packages/ai/src/api/google-shared.ts:145][E: packages/ai/src/api/google-shared.ts:148][E: packages/ai/src/api/google-shared.ts:153][E: packages/ai/src/api/google-shared.ts:172]

thinking signature 只在同 provider 同 model 且 base64 有效时 replay;该限制由 `resolveThoughtSignature` 的 `isSameProviderAndModel && isValidThoughtSignature(signature)` 实现。[E: packages/ai/src/api/google-shared.ts:54][E: packages/ai/src/api/google-shared.ts:56][E: packages/ai/src/api/google-shared.ts:57][E: packages/ai/src/api/google-shared.ts:63][E: packages/ai/src/api/google-shared.ts:64]

## tool 转换

assistant `toolCall` block 会变成 Gemini `functionCall` part,包括 `name`、`args`,并在 `requiresToolCallId(model.id)` 为真时携带 `id`;当前代码对 `claude-` 和 `gpt-oss-` 前缀模型要求显式 tool call id。[E: packages/ai/src/api/google-shared.ts:70][E: packages/ai/src/api/google-shared.ts:71][E: packages/ai/src/api/google-shared.ts:157][E: packages/ai/src/api/google-shared.ts:160][E: packages/ai/src/api/google-shared.ts:161][E: packages/ai/src/api/google-shared.ts:162][E: packages/ai/src/api/google-shared.ts:163]

tool result message 会转成 user turn 里的 `functionResponse`:文本结果被拼成 `output` 或 `error`,图片结果在支持 multimodal function response 的模型上进入 `functionResponse.parts`,否则追加一个独立 user image turn。[E: packages/ai/src/api/google-shared.ts:176][E: packages/ai/src/api/google-shared.ts:178][E: packages/ai/src/api/google-shared.ts:193][E: packages/ai/src/api/google-shared.ts:203][E: packages/ai/src/api/google-shared.ts:206][E: packages/ai/src/api/google-shared.ts:207][E: packages/ai/src/api/google-shared.ts:225][E: packages/ai/src/api/google-shared.ts:226]

连续 tool result 会合并进同一个 user turn,因为 shared code 检查最后一个 content 是否已经是包含 `functionResponse` 的 user turn,是则 `lastContent.parts.push(functionResponsePart)`。[E: packages/ai/src/api/google-shared.ts:214][E: packages/ai/src/api/google-shared.ts:215][E: packages/ai/src/api/google-shared.ts:216]

`convertTools` 把 pi `Tool[]` 转成 Gemini `functionDeclarations`;默认使用 `parametersJsonSchema`,只有 `useParameters=true` 时才使用经 `sanitizeForOpenApi` 处理的 legacy `parameters` 字段。[E: packages/ai/src/api/google-shared.ts:272][E: packages/ai/src/api/google-shared.ts:276][E: packages/ai/src/api/google-shared.ts:279][E: packages/ai/src/api/google-shared.ts:282][E: packages/ai/src/api/google-shared.ts:283][E: packages/ai/src/api/google-shared.ts:284]

当存在工具且 `options.toolChoice` 有值时,`buildParams` 写入 `config.toolConfig.functionCallingConfig.mode`,mode 由 shared `mapToolChoice` 把 `"auto" | "none" | "any"` 映射到 Google SDK `FunctionCallingConfigMode`。[E: packages/ai/src/api/google-generative-ai.ts:363][E: packages/ai/src/api/google-generative-ai.ts:364][E: packages/ai/src/api/google-generative-ai.ts:366][E: packages/ai/src/api/google-shared.ts:293][E: packages/ai/src/api/google-shared.ts:296][E: packages/ai/src/api/google-shared.ts:298][E: packages/ai/src/api/google-shared.ts:300]

## event 转换

Google SDK chunk 的 `candidate.content.parts` 是 streaming event 的主要输入;文本 part 先由 `isThinkingPart(part)` 判定为 thinking 或 text,再按 block 类型发出 `thinking_start`/`thinking_delta` 或 `text_start`/`text_delta`。[E: packages/ai/src/api/google-generative-ai.ts:92][E: packages/ai/src/api/google-generative-ai.ts:96][E: packages/ai/src/api/google-generative-ai.ts:97][E: packages/ai/src/api/google-generative-ai.ts:99][E: packages/ai/src/api/google-generative-ai.ts:100][E: packages/ai/src/api/google-generative-ai.ts:124][E: packages/ai/src/api/google-generative-ai.ts:126][E: packages/ai/src/api/google-generative-ai.ts:128][E: packages/ai/src/api/google-generative-ai.ts:130][E: packages/ai/src/api/google-generative-ai.ts:139][E: packages/ai/src/api/google-generative-ai.ts:151]

`isThinkingPart` 只把 `part.thought === true` 视为 thinking;`thoughtSignature` 本身不代表该 part 是 thinking 内容。[E: packages/ai/src/api/google-shared.ts:33][E: packages/ai/src/api/google-shared.ts:34] stream 过程中,`retainThoughtSignature` 保留当前 block 最近一个非空 thought signature,避免后续 delta 缺省时把 signature 覆盖成 `undefined`。[E: packages/ai/src/api/google-generative-ai.ts:135][E: packages/ai/src/api/google-generative-ai.ts:147][E: packages/ai/src/api/google-shared.ts:46][E: packages/ai/src/api/google-shared.ts:47][E: packages/ai/src/api/google-shared.ts:48]

当 chunk part 含 `functionCall` 时,当前 text/thinking block 会先结束,然后生成 pi `ToolCall` block;如果 Google 没给 id 或 id 与已有 tool call 重复,代码用 `${name}_${Date.now()}_${++toolCallCounter}` 生成 id,再发 `toolcall_start`、`toolcall_delta`、`toolcall_end`。[E: packages/ai/src/api/google-generative-ai.ts:160][E: packages/ai/src/api/google-generative-ai.ts:177][E: packages/ai/src/api/google-generative-ai.ts:181][E: packages/ai/src/api/google-generative-ai.ts:183][E: packages/ai/src/api/google-generative-ai.ts:185][E: packages/ai/src/api/google-generative-ai.ts:188][E: packages/ai/src/api/google-generative-ai.ts:197][E: packages/ai/src/api/google-generative-ai.ts:198][E: packages/ai/src/api/google-generative-ai.ts:204]

finish reason 先经 shared `mapStopReason` 转成 pi `StopReason`;如果 output 中存在 tool call,stop reason 会被覆盖为 `toolUse`。[E: packages/ai/src/api/google-generative-ai.ts:209][E: packages/ai/src/api/google-generative-ai.ts:210][E: packages/ai/src/api/google-generative-ai.ts:211][E: packages/ai/src/api/google-generative-ai.ts:212][E: packages/ai/src/api/google-shared.ts:309][E: packages/ai/src/api/google-shared.ts:311][E: packages/ai/src/api/google-shared.ts:313][E: packages/ai/src/api/google-shared.ts:330]

usage metadata 被转成 pi `usage`:input 扣除 cache read,candidates token 与 thoughts token 合并为 output,thoughts token 另存为 `reasoning`,然后调用 `calculateCost(model, output.usage)`。[E: packages/ai/src/api/google-generative-ai.ts:216][E: packages/ai/src/api/google-generative-ai.ts:218][E: packages/ai/src/api/google-generative-ai.ts:221][E: packages/ai/src/api/google-generative-ai.ts:222][E: packages/ai/src/api/google-generative-ai.ts:224][E: packages/ai/src/api/google-generative-ai.ts:234]

正常结束时,未关闭的 text/thinking block 会先发 end event,再发 `done` 并 `stream.end()`;异常路径把 stop reason 设为 `aborted` 或 `error`,写入 `errorMessage`,发 `error` event 后结束 stream。[E: packages/ai/src/api/google-generative-ai.ts:238][E: packages/ai/src/api/google-generative-ai.ts:240][E: packages/ai/src/api/google-generative-ai.ts:247][E: packages/ai/src/api/google-generative-ai.ts:264][E: packages/ai/src/api/google-generative-ai.ts:265][E: packages/ai/src/api/google-generative-ai.ts:273][E: packages/ai/src/api/google-generative-ai.ts:274][E: packages/ai/src/api/google-generative-ai.ts:275][E: packages/ai/src/api/google-generative-ai.ts:276]

## 与 Vertex 的差异

Google Generative AI 要求 `options.apiKey` 存在,否则直接报 `No API key for provider`;Vertex 先 `resolveApiKey(options)`,有有效 key 时走 API key client,否则走 ADC/project/location client。[E: packages/ai/src/api/google-generative-ai.ts:76][E: packages/ai/src/api/google-generative-ai.ts:77][E: packages/ai/src/api/google-generative-ai.ts:78][E: packages/ai/src/api/google-vertex.ts:94][E: packages/ai/src/api/google-vertex.ts:96][E: packages/ai/src/api/google-vertex.ts:98]

Google Generative AI client 传的是 `{ apiKey, httpOptions }`;Vertex 的 ADC client 传 `vertexai: true`、project、location 和 `apiVersion: "v1"`,Vertex API-key client 则传 `vertexai: true`、apiKey 和同一 API version。[E: packages/ai/src/api/google-generative-ai.ts:336][E: packages/ai/src/api/google-generative-ai.ts:337][E: packages/ai/src/api/google-vertex.ts:53][E: packages/ai/src/api/google-vertex.ts:344][E: packages/ai/src/api/google-vertex.ts:345][E: packages/ai/src/api/google-vertex.ts:346][E: packages/ai/src/api/google-vertex.ts:347][E: packages/ai/src/api/google-vertex.ts:348][E: packages/ai/src/api/google-vertex.ts:359][E: packages/ai/src/api/google-vertex.ts:360][E: packages/ai/src/api/google-vertex.ts:361][E: packages/ai/src/api/google-vertex.ts:362]

Vertex 从 `options.project`、`GOOGLE_CLOUD_PROJECT` 或 `GCLOUD_PROJECT` 解析 project,从 `options.location` 或 `GOOGLE_CLOUD_LOCATION` 解析 location;缺失时抛出明确错误。[E: packages/ai/src/api/google-vertex.ts:420][E: packages/ai/src/api/google-vertex.ts:422][E: packages/ai/src/api/google-vertex.ts:423][E: packages/ai/src/api/google-vertex.ts:424][E: packages/ai/src/api/google-vertex.ts:425][E: packages/ai/src/api/google-vertex.ts:433][E: packages/ai/src/api/google-vertex.ts:434][E: packages/ai/src/api/google-vertex.ts:435]

两者共享 message/tool/stop-reason/tool-choice 转换入口,因为 Vertex 也导入同一组 shared helpers,并在 `buildParams` 中调用 `convertMessages`、`convertTools`、`mapToolChoice`。[E: packages/ai/src/api/google-vertex.ts:32][E: packages/ai/src/api/google-vertex.ts:33][E: packages/ai/src/api/google-vertex.ts:34][E: packages/ai/src/api/google-vertex.ts:37][E: packages/ai/src/api/google-vertex.ts:441][E: packages/ai/src/api/google-vertex.ts:446][E: packages/ai/src/api/google-vertex.ts:459][E: packages/ai/src/api/google-vertex.ts:465]

thinking level 的 SDK enum 表达不同:Generative AI 直接把 shared `GoogleThinkingLevel` 字符串 cast 到 SDK thinkingLevel,Vertex 先用 `THINKING_LEVEL_MAP` 映射到 `@google/genai` 的 `ThinkingLevel` enum。[E: packages/ai/src/api/google-generative-ai.ts:375][E: packages/ai/src/api/google-generative-ai.ts:377][E: packages/ai/src/api/google-vertex.ts:56][E: packages/ai/src/api/google-vertex.ts:57][E: packages/ai/src/api/google-vertex.ts:61][E: packages/ai/src/api/google-vertex.ts:474][E: packages/ai/src/api/google-vertex.ts:475]

## gotcha

- `thoughtSignature` 是 replay context,不是 thinking 内容判据;只有 `part.thought === true` 会进入 pi `thinking` block。[E: packages/ai/src/api/google-shared.ts:33][E: packages/ai/src/api/google-shared.ts:34]
- 对 Gemini 3/Gemma 4,禁用 visible thinking 不一定是 `thinkingBudget: 0`:Generative AI 对 Gemini 3 Pro 返回 `LOW`,对 Gemini 3 Flash/Gemma 4 返回 `MINIMAL`;未命中特殊分支的模型回退到 budget 0。[E: packages/ai/src/api/google-generative-ai.ts:417][E: packages/ai/src/api/google-generative-ai.ts:421][E: packages/ai/src/api/google-generative-ai.ts:424][E: packages/ai/src/api/google-generative-ai.ts:427][E: packages/ai/src/api/google-generative-ai.ts:432]
- `convertTools` 默认发送 `parametersJsonSchema`;只有调用方显式传 `useParameters=true` 才会降级到 OpenAPI-style `parameters`。[E: packages/ai/src/api/google-shared.ts:272][E: packages/ai/src/api/google-shared.ts:282][E: packages/ai/src/api/google-shared.ts:284]

## 跨包边界

- `subsys.ai.wire-protocol-dispatch` 应覆盖 `Models.stream` / `createProvider` / lazy API 如何按 `model.api` 进入 `googleGenerativeAIApi()`;本节点只从 `google` provider 的 lazy wrapper 和 `stream` implementation 处展开。
- `subsys.ai.google-vertex` 应覆盖 Vertex 的 ADC、project/location、resource scope、自定义 base URL 和 enum 映射细节;本节点只列出与 Generative AI 共享或不同的协议点。

## Sources

- packages/ai/src/api/google-generative-ai.ts
- packages/ai/src/api/google-shared.ts
- packages/ai/src/api/google-vertex.ts
- packages/ai/src/api/google-generative-ai.lazy.ts
- packages/ai/src/providers/google.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api` 到 lazy `ProviderStreams` implementation 的派发层。
- [subsys.ai.google-vertex](google-vertex.md) - 同一 shared Gemini serializer 在 Vertex AI 认证和 endpoint 语义下的协议入口。
