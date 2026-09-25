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
 - packages/ai/src/index.ts
 - packages/ai/src/utils/pi-user-agent.ts
 - packages/ai/test/google-raw-stop-reason.test.ts
symbols:
 - stream
 - GoogleOptions
related:
 - subsys.ai.wire-protocol-dispatch
 - subsys.ai.google-vertex
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.google-generative-ai` 描述 `pi-ai` 如何把统一 `Context` 和 `GoogleOptions` 转成 Gemini Developer API `generateContentStream` 请求,并把 Google SDK stream 归一回 `AssistantMessageEventStream`。

## 能回答的问题

- `google-generative-ai` wire implementation 的入口函数和 provider 装配点在哪里?
- `GoogleOptions` 支持哪些 Google-specific 控制项?
- `Context.messages` 如何转成 Gemini `Content[]`,包括文本、图片、thinking、tool call 和 tool result?
- `context.tools` 与 `toolChoice` 如何转成 Gemini function declarations 和 function calling mode?
- Google SDK streaming chunk 如何被转换成 pi 的 text/thinking/toolcall/done/error 事件?
- `MAX_TOKENS` 同时带 tool call 时 stop reason 是 `length` 还是 `toolUse`?
- Google Generative AI 与 Google Vertex AI 在认证、endpoint、thinking enum 和项目/地域参数上有什么差异?

## 职责边界

`packages/ai/src/api/google-generative-ai.ts` 是 Gemini Developer API 的 wire entry:它导出 `stream` 和 `streamSimple`,用 `new GoogleGenAI({ apiKey, httpOptions })` 创建 client,并调用 `client.models.generateContentStream(params)`。[E: packages/ai/src/api/google-generative-ai.ts:59][E: packages/ai/src/api/google-generative-ai.ts:100][E: packages/ai/src/api/google-generative-ai.ts:305][E: packages/ai/src/api/google-generative-ai.ts:363][E: packages/ai/src/api/google-generative-ai.ts:364][E: packages/ai/src/api/google-generative-ai.ts:365]

内置 `google` provider 把 provider id 设为 `google`,默认 base URL 设为 `https://generativelanguage.googleapis.com/v1beta`,认证来源设为 `GEMINI_API_KEY`,并把 `api` 接到 `googleGenerativeAIApi()` lazy wrapper。[E: packages/ai/src/providers/google.ts:8][E: packages/ai/src/providers/google.ts:10][E: packages/ai/src/providers/google.ts:11][E: packages/ai/src/providers/google.ts:13] lazy wrapper 只做 dynamic import,实际协议代码仍在 `google-generative-ai.ts`。[E: packages/ai/src/api/google-generative-ai.lazy.ts:4]

`GoogleOptions` 扩展通用 `StreamOptions`,只增加 `toolChoice?: "auto" | "none" | "any"` 和 `thinking` 配置;`thinking.budgetTokens` 可传 token budget,`thinking.level` 使用 `GoogleApiThinkingLevel` 字符串类型。[E: packages/ai/src/api/google-generative-ai.ts:47][E: packages/ai/src/api/google-generative-ai.ts:48][E: packages/ai/src/api/google-generative-ai.ts:49][E: packages/ai/src/api/google-generative-ai.ts:51][E: packages/ai/src/api/google-generative-ai.ts:52][E: packages/ai/src/api/google-shared.ts:36] `GoogleThinkingLevel` 已改名为 `GoogleApiThinkingLevel`；`ResolvedGoogleThinkingLevel` 是 Pi `ThinkingLevel` 去掉 `xhigh`/`max` 的子集。`resolveGoogleThinkingLevel()` 在查 `thinkingLevelMap` 之前若 `level === "off"` 直接返回 `"high"`，否则再经 map 解析 [E: packages/ai/src/api/google-shared.ts:37] [E: packages/ai/src/api/google-shared.ts:48] [E: packages/ai/src/api/google-shared.ts:36] [E: packages/ai/src/api/google-shared.ts:52] [E: packages/ai/src/index.ts:13]。

## request 构造

`stream` 先建立一个空的 `AssistantMessage` accumulator,检查 `options.apiKey`,再创建 SDK client、调用 `buildParams(model, context, options)`,允许 `options.onPayload` 替换 payload,最后把 payload 交给 `generateContentStream`。[E: packages/ai/src/api/google-generative-ai.ts:68][E: packages/ai/src/api/google-generative-ai.ts:90][E: packages/ai/src/api/google-generative-ai.ts:94][E: packages/ai/src/api/google-generative-ai.ts:88][E: packages/ai/src/api/google-generative-ai.ts:96][E: packages/ai/src/api/google-generative-ai.ts:100]

`createClient` 把 `model.baseUrl` 写入 SDK `httpOptions.baseUrl`,同时把 `apiVersion` 清空,因为该 base URL 已经包含版本路径;`model.headers` 和 `options.headers` 经 `providerHeadersToRecord` 合并后作为 SDK HTTP headers。[E: packages/ai/src/api/google-generative-ai.ts:348][E: packages/ai/src/api/google-generative-ai.ts:354][E: packages/ai/src/api/google-generative-ai.ts:356][E: packages/ai/src/api/google-generative-ai.ts:358][E: packages/ai/src/api/google-generative-ai.ts:363]

`buildParams` 负责把 `Context` 转为 `GenerateContentParameters`:它调用 shared `convertMessages`,把 `temperature` 和 `maxTokens` 转成 `GenerateContentConfig.temperature` 和 `maxOutputTokens`,把 `context.systemPrompt` 转成 `systemInstruction`,把 `context.tools` 转成 Gemini `tools`,最后返回 `{ model, contents, config }`。[E: packages/ai/src/api/google-generative-ai.ts:369][E: packages/ai/src/api/google-generative-ai.ts:374][E: packages/ai/src/api/google-generative-ai.ts:379][E: packages/ai/src/api/google-generative-ai.ts:383][E: packages/ai/src/api/google-generative-ai.ts:392][E: packages/ai/src/api/google-generative-ai.ts:380][E: packages/ai/src/api/google-generative-ai.ts:380][E: packages/ai/src/api/google-generative-ai.ts:422]

`streamSimple` 是统一 simple options 到 Google options 的 adapter:没有 `options.reasoning` 时显式传 `thinking: { enabled: false }`;有 reasoning 时先 `clampThinkingLevel`，再 `resolveGoogleThinkingLevel(model, clampedReasoning)` 得到 `ResolvedGoogleThinkingLevel`；Gemini 3 Pro、Gemini 3 Flash/Lite 和 Gemma 4 走 `getThinkingLevel()` 的 `GoogleApiThinkingLevel`，其他模型走 thinking budget。[E: packages/ai/src/api/google-generative-ai.ts:316][E: packages/ai/src/api/google-generative-ai.ts:319][E: packages/ai/src/api/google-generative-ai.ts:323][E: packages/ai/src/api/google-generative-ai.ts:327][E: packages/ai/src/api/google-generative-ai.ts:319][E: packages/ai/src/api/google-generative-ai.ts:324][E: packages/ai/src/api/google-generative-ai.ts:333]

## content 转换

`google-shared.ts` 同时服务 `google-generative-ai` 和 `google-vertex`:它用 `GoogleApiType = "google-generative-ai" | "google-vertex"` 约束 shared 转换函数的泛型范围,两个 wire implementation 也都从该文件导入 shared helpers。[E: packages/ai/src/api/google-shared.ts:30][E: packages/ai/src/api/google-shared.ts:141][E: packages/ai/src/api/google-generative-ai.ts:29][E: packages/ai/src/api/google-vertex.ts:33]

`convertMessages(model, context)` 先调用 `transformMessages(context.messages, model, normalizeToolCallId)`,并把 Google-specific tool call id normalizer 交给 shared message transformer。[E: packages/ai/src/api/google-shared.ts:141][E: packages/ai/src/api/google-shared.ts:195][E: packages/ai/src/api/google-shared.ts:196][E: packages/ai/src/api/google-shared.ts:197][E: packages/ai/src/api/google-shared.ts:141] 对 user 文本消息,它生成 `{ role: "user", parts: [{ text }] }`;对 user 多模态消息,文本 block 变成 `{ text }`,图片 block 变成 Gemini `inlineData`。[E: packages/ai/src/api/google-shared.ts:203][E: packages/ai/src/api/google-shared.ts:205][E: packages/ai/src/api/google-shared.ts:207][E: packages/ai/src/api/google-shared.ts:210][E: packages/ai/src/api/google-shared.ts:212][E: packages/ai/src/api/google-shared.ts:214]

对 assistant 历史消息,`convertMessages` 输出 Gemini `role: "model"`;文本 block 变成 text part,thinking block 在同 provider 同 model 时保留 `thought: true`,否则降级为普通 text part。[E: packages/ai/src/api/google-shared.ts:228][E: packages/ai/src/api/google-shared.ts:231][E: packages/ai/src/api/google-shared.ts:234][E: packages/ai/src/api/google-shared.ts:241][E: packages/ai/src/api/google-shared.ts:245][E: packages/ai/src/api/google-shared.ts:248][E: packages/ai/src/api/google-shared.ts:254][E: packages/ai/src/api/google-shared.ts:261][E: packages/ai/src/api/google-shared.ts:280]

thinking signature 只在同 provider 同 model 且 base64 有效时 replay;该限制由 `resolveThoughtSignature` 的 `isSameProviderAndModel && isValidThoughtSignature(signature)` 实现。[E: packages/ai/src/api/google-shared.ts:149][E: packages/ai/src/api/google-shared.ts:151][E: packages/ai/src/api/google-shared.ts:152][E: packages/ai/src/api/google-shared.ts:158][E: packages/ai/src/api/google-shared.ts:159]

## tool 转换

assistant `toolCall` block 会变成 Gemini `functionCall` part,包括 `name`、`args`,并在 `requiresToolCallId(model.id)` 为真时携带 `id`;当前代码对 `claude-`、`gpt-oss-` 前缀以及 Gemini major>=3(含 `gemini-live-N`)要求显式 tool call id。[E: packages/ai/src/api/google-shared.ts:165][E: packages/ai/src/api/google-shared.ts:167][E: packages/ai/src/api/google-shared.ts:168][E: packages/ai/src/api/google-shared.ts:169][E: packages/ai/src/api/google-shared.ts:170][E: packages/ai/src/api/google-shared.ts:174][E: packages/ai/src/api/google-shared.ts:175][E: packages/ai/src/api/google-shared.ts:265][E: packages/ai/src/api/google-shared.ts:268][E: packages/ai/src/api/google-shared.ts:269][E: packages/ai/src/api/google-shared.ts:270][E: packages/ai/src/api/google-shared.ts:271]

tool result message 会转成 user turn 里的 `functionResponse`:文本结果被拼成 `output` 或 `error`,图片结果在支持 multimodal function response 的模型上进入 `functionResponse.parts`,否则追加一个独立 user image turn。[E: packages/ai/src/api/google-shared.ts:284][E: packages/ai/src/api/google-shared.ts:286][E: packages/ai/src/api/google-shared.ts:301][E: packages/ai/src/api/google-shared.ts:311][E: packages/ai/src/api/google-shared.ts:314][E: packages/ai/src/api/google-shared.ts:315][E: packages/ai/src/api/google-shared.ts:333][E: packages/ai/src/api/google-shared.ts:334]

连续 tool result 会合并进同一个 user turn,因为 shared code 检查最后一个 content 是否已经是包含 `functionResponse` 的 user turn,是则 `lastContent.parts.push(functionResponsePart)`。[E: packages/ai/src/api/google-shared.ts:322][E: packages/ai/src/api/google-shared.ts:323][E: packages/ai/src/api/google-shared.ts:324]

`convertTools` 把 pi `Tool[]` 转成 Gemini `functionDeclarations`;默认使用 `parametersJsonSchema`,只有 `useParameters=true` 时才使用经 `sanitizeForOpenApi` 处理的 legacy `parameters` 字段。[E: packages/ai/src/api/google-shared.ts:380][E: packages/ai/src/api/google-shared.ts:385][E: packages/ai/src/api/google-shared.ts:386][E: packages/ai/src/api/google-shared.ts:394][E: packages/ai/src/api/google-shared.ts:391][E: packages/ai/src/api/google-shared.ts:392]

当存在工具时,`buildParams` 用 `resolveGoogleFunctionCallingMode(tools, toolChoice, supportsStrictMode)` 决定 mode:任意 tool 使用 strict sampling 时即使 `toolChoice` 缺失或 `auto` 也会得到 `VALIDATED`;只有 mode 非 `undefined` 才写入 `config.toolConfig`。Vertex 同样调用 `resolveGoogleFunctionCallingMode`,不直接 import/call `mapToolChoice`。[E: packages/ai/src/api/google-generative-ai.ts:386][E: packages/ai/src/api/google-generative-ai.ts:375][E: packages/ai/src/api/google-generative-ai.ts:376][E: packages/ai/src/api/google-generative-ai.ts:398][E: packages/ai/src/api/google-generative-ai.ts:399][E: packages/ai/src/api/google-shared.ts:423][E: packages/ai/src/api/google-shared.ts:428][E: packages/ai/src/api/google-shared.ts:432][E: packages/ai/src/api/google-shared.ts:433][E: packages/ai/src/api/google-shared.ts:435][E: packages/ai/src/api/google-vertex.ts:40][E: packages/ai/src/api/google-vertex.ts:475][E: packages/ai/src/api/google-vertex.ts:475]

## event 转换

Google SDK chunk 的 `candidate.content.parts` 是 streaming event 的主要输入;文本 part 先由 `isThinkingPart(part)` 判定为 thinking 或 text,再按 block 类型发出 `thinking_start`/`thinking_delta` 或 `text_start`/`text_delta`。[E: packages/ai/src/api/google-generative-ai.ts:106][E: packages/ai/src/api/google-generative-ai.ts:111][E: packages/ai/src/api/google-generative-ai.ts:112][E: packages/ai/src/api/google-generative-ai.ts:114][E: packages/ai/src/api/google-generative-ai.ts:115][E: packages/ai/src/api/google-generative-ai.ts:139][E: packages/ai/src/api/google-generative-ai.ts:141][E: packages/ai/src/api/google-generative-ai.ts:143][E: packages/ai/src/api/google-generative-ai.ts:145][E: packages/ai/src/api/google-generative-ai.ts:154][E: packages/ai/src/api/google-generative-ai.ts:166]

`isThinkingPart` 只把 `part.thought === true` 视为 thinking;`thoughtSignature` 本身不代表该 part 是 thinking 内容。[E: packages/ai/src/api/google-shared.ts:128][E: packages/ai/src/api/google-shared.ts:129] stream 过程中,`retainThoughtSignature` 保留当前 block 最近一个非空 thought signature,避免后续 delta 缺省时把 signature 覆盖成 `undefined`。[E: packages/ai/src/api/google-generative-ai.ts:150][E: packages/ai/src/api/google-generative-ai.ts:162][E: packages/ai/src/api/google-shared.ts:141][E: packages/ai/src/api/google-shared.ts:142][E: packages/ai/src/api/google-shared.ts:143]

当 chunk part 含 `functionCall` 时,当前 text/thinking block 会先结束,然后生成 pi `ToolCall` block;如果 Google 没给 id 或 id 与已有 tool call 重复,代码用 `${name}_${Date.now()}_${++toolCallCounter}` 生成 id,再发 `toolcall_start`、`toolcall_delta`、`toolcall_end`。[E: packages/ai/src/api/google-generative-ai.ts:175][E: packages/ai/src/api/google-generative-ai.ts:192][E: packages/ai/src/api/google-generative-ai.ts:196][E: packages/ai/src/api/google-generative-ai.ts:198][E: packages/ai/src/api/google-generative-ai.ts:200][E: packages/ai/src/api/google-generative-ai.ts:203][E: packages/ai/src/api/google-generative-ai.ts:212][E: packages/ai/src/api/google-generative-ai.ts:213][E: packages/ai/src/api/google-generative-ai.ts:219]

finish reason 先经 shared `mapStopReason` 转成 pi `StopReason`。`MAX_TOKENS` 映射为 `length`，`STOP` 映射为 `stop`。`MALFORMED_FUNCTION_CALL`、`UNEXPECTED_TOOL_CALL`、`NO_IMAGE` 与其它 listed safety/recitation 原因映射为 `error`。只有 mapped reason 仍是 `stop` 且 content 里已有 `toolCall` 时，才改写成 `toolUse`；`length` 即使夹带 function call 也保持 `length`，不再当普通 tool use。Vertex 用同一判断。测试锁定 `MAX_TOKENS` + tool call → `length`，`STOP` + tool call → `toolUse`。[E: packages/ai/src/api/google-generative-ai.ts:224][E: packages/ai/src/api/google-generative-ai.ts:226][E: packages/ai/src/api/google-generative-ai.ts:227][E: packages/ai/src/api/google-generative-ai.ts:228][E: packages/ai/src/api/google-shared.ts:441][E: packages/ai/src/api/google-shared.ts:443][E: packages/ai/src/api/google-shared.ts:444][E: packages/ai/src/api/google-shared.ts:445][E: packages/ai/src/api/google-shared.ts:446][E: packages/ai/src/api/google-shared.ts:459][E: packages/ai/src/api/google-shared.ts:460][E: packages/ai/src/api/google-shared.ts:462][E: packages/ai/src/api/google-shared.ts:463][E: packages/ai/src/api/google-vertex.ts:235][E: packages/ai/src/api/google-vertex.ts:236][E: packages/ai/test/google-raw-stop-reason.test.ts:172][E: packages/ai/test/google-raw-stop-reason.test.ts:178][E: packages/ai/test/google-raw-stop-reason.test.ts:183][E: packages/ai/test/google-raw-stop-reason.test.ts:189]

usage metadata 被转成 pi `usage`:input 扣除 cache read,candidates token 与 thoughts token 合并为 output,thoughts token 另存为 `reasoning`,然后调用 `calculateCost(model, output.usage)`。[E: packages/ai/src/api/google-generative-ai.ts:232][E: packages/ai/src/api/google-generative-ai.ts:234][E: packages/ai/src/api/google-generative-ai.ts:237][E: packages/ai/src/api/google-generative-ai.ts:238][E: packages/ai/src/api/google-generative-ai.ts:240][E: packages/ai/src/api/google-generative-ai.ts:250]

正常结束时,未关闭的 text/thinking block 会先发 end event,再发 `done` 并 `stream.end()`;异常路径把 stop reason 设为 `aborted` 或 `error`,通过 shared provider-error formatter 写入 `errorMessage`,发 `error` event 后结束 stream。[E: packages/ai/src/api/google-generative-ai.ts:22][E: packages/ai/src/api/google-generative-ai.ts:254][E: packages/ai/src/api/google-generative-ai.ts:256][E: packages/ai/src/api/google-generative-ai.ts:263][E: packages/ai/src/api/google-generative-ai.ts:286][E: packages/ai/src/api/google-generative-ai.ts:287][E: packages/ai/src/api/google-generative-ai.ts:295][E: packages/ai/src/api/google-generative-ai.ts:296][E: packages/ai/src/api/google-generative-ai.ts:297][E: packages/ai/src/api/google-generative-ai.ts:298]

## 与 Vertex 的差异

Google Generative AI 要求 `options.apiKey` 存在,否则直接报 `No API key for provider`;Vertex 先 `resolveApiKey(options)`,有有效 key 时走 API key client,否则走 ADC/project/location client。[E: packages/ai/src/api/google-generative-ai.ts:90][E: packages/ai/src/api/google-generative-ai.ts:91][E: packages/ai/src/api/google-generative-ai.ts:92][E: packages/ai/src/api/google-vertex.ts:99][E: packages/ai/src/api/google-vertex.ts:101] [E: packages/ai/src/api/google-vertex.ts:103]

Google Generative AI client 传的是 `{ apiKey, httpOptions }`;Vertex 的 ADC client 传 `vertexai: true`、project、location 和 `apiVersion: "v1"`,Vertex API-key client 则传 `vertexai: true`、apiKey 和同一 API version。[E: packages/ai/src/api/google-generative-ai.ts:363][E: packages/ai/src/api/google-generative-ai.ts:364][E: packages/ai/src/api/google-vertex.ts:62][E: packages/ai/src/api/google-vertex.ts:365][E: packages/ai/src/api/google-vertex.ts:366][E: packages/ai/src/api/google-vertex.ts:367][E: packages/ai/src/api/google-vertex.ts:368][E: packages/ai/src/api/google-vertex.ts:369][E: packages/ai/src/api/google-vertex.ts:380][E: packages/ai/src/api/google-vertex.ts:381][E: packages/ai/src/api/google-vertex.ts:382][E: packages/ai/src/api/google-vertex.ts:383]

Vertex 从 `options.project`、`GOOGLE_CLOUD_PROJECT` 或 `GCLOUD_PROJECT` 解析 project,从 `options.location` 或 `GOOGLE_CLOUD_LOCATION` 解析 location;缺失时抛出明确错误。[E: packages/ai/src/api/google-vertex.ts:441][E: packages/ai/src/api/google-vertex.ts:443][E: packages/ai/src/api/google-vertex.ts:444][E: packages/ai/src/api/google-vertex.ts:445][E: packages/ai/src/api/google-vertex.ts:446][E: packages/ai/src/api/google-vertex.ts:454][E: packages/ai/src/api/google-vertex.ts:455][E: packages/ai/src/api/google-vertex.ts:456]

两者共享 message/tool/stop-reason 转换入口,因为 Vertex 也导入同一组 shared helpers,并在 `buildParams` 中调用 `convertMessages`、`convertTools`、`resolveGoogleFunctionCallingMode`。[E: packages/ai/src/api/google-vertex.ts:34][E: packages/ai/src/api/google-vertex.ts:35][E: packages/ai/src/api/google-vertex.ts:36][E: packages/ai/src/api/google-vertex.ts:40][E: packages/ai/src/api/google-vertex.ts:462][E: packages/ai/src/api/google-vertex.ts:467][E: packages/ai/src/api/google-vertex.ts:475][E: packages/ai/src/api/google-vertex.ts:479]

thinking level 的 SDK enum 表达不同:Generative AI 直接把 shared `GoogleApiThinkingLevel` 字符串 cast 到 SDK thinkingLevel,Vertex 先用 `THINKING_LEVEL_MAP` 映射到 `@google/genai` 的 `ThinkingLevel` enum。[E: packages/ai/src/api/google-generative-ai.ts:394][E: packages/ai/src/api/google-generative-ai.ts:394][E: packages/ai/src/api/google-vertex.ts:62][E: packages/ai/src/api/google-vertex.ts:62][E: packages/ai/src/api/google-vertex.ts:66][E: packages/ai/src/api/google-vertex.ts:498][E: packages/ai/src/api/google-vertex.ts:492]

## gotcha

- `thoughtSignature` 是 replay context,不是 thinking 内容判据;只有 `part.thought === true` 会进入 pi `thinking` block。[E: packages/ai/src/api/google-shared.ts:128][E: packages/ai/src/api/google-shared.ts:129]
- 对 Gemini 3/Gemma 4,禁用 visible thinking 不一定是 `thinkingBudget: 0`:Generative AI 对 Gemini 3 Pro 返回 `LOW`,对 Gemini 3 Flash/Gemma 4 返回 `MINIMAL`;未命中特殊分支的模型回退到 budget 0。[E: packages/ai/src/api/google-generative-ai.ts:432][E: packages/ai/src/api/google-generative-ai.ts:436][E: packages/ai/src/api/google-generative-ai.ts:440][E: packages/ai/src/api/google-generative-ai.ts:442][E: packages/ai/src/api/google-generative-ai.ts:447]
- `convertTools` 默认发送 `parametersJsonSchema`;只有调用方显式传 `useParameters=true` 才会降级到 OpenAPI-style `parameters`。[E: packages/ai/src/api/google-shared.ts:380][E: packages/ai/src/api/google-shared.ts:394][E: packages/ai/src/api/google-shared.ts:392]

## 跨包边界

- `subsys.ai.wire-protocol-dispatch` 应覆盖 `Models.stream` / `createProvider` / lazy API 如何按 `model.api` 进入 `googleGenerativeAIApi()`;本节点只从 `google` provider 的 lazy wrapper 和 `stream` implementation 处展开。
- `subsys.ai.google-vertex` 应覆盖 Vertex 的 ADC、project/location、resource scope、自定义 base URL 和 enum 映射细节;本节点只列出与 Generative AI 共享或不同的协议点。

## 本轮 stream 状态、retry 与 fetch 变化

Accumulator 从 `pending` 开始；candidate finish reason 同时保存在 `rawStopReason` 并映射 unified reason，流结束仍为 pending 会转成 terminal error。[E: packages/ai/src/api/google-generative-ai.ts:68] [E: packages/ai/src/api/google-generative-ai.ts:82] [E: packages/ai/src/api/google-generative-ai.ts:224] [E: packages/ai/src/api/google-generative-ai.ts:228] [E: packages/ai/src/api/google-generative-ai.ts:276] [E: packages/ai/src/api/google-generative-ai.ts:283]

`generateContentStream()` 建流请求现在经 `retryGoogleRequest()` 接入 shared provider retry；它不包后续 `for await` 的中途断流。Google SDK 不能注入任意 fetch，因此非 `globalThis.fetch` 会被显式拒绝。[E: packages/ai/src/api/google-generative-ai.ts:86] [E: packages/ai/src/api/google-generative-ai.ts:88] [E: packages/ai/src/api/google-generative-ai.ts:100] [E: packages/ai/src/api/google-shared.ts:494] [E: packages/ai/src/api/google-shared.ts:498]

Client `httpOptions.headers` 默认先写 `User-Agent: getPiUserAgent()`，再 overlay `model.headers` 与 request headers [E: packages/ai/src/api/google-generative-ai.ts:358] [E: packages/ai/src/utils/pi-user-agent.ts:17]。

## Sources

- packages/ai/src/api/google-generative-ai.ts
- packages/ai/src/api/google-shared.ts
- packages/ai/src/api/google-vertex.ts
- packages/ai/src/api/google-generative-ai.lazy.ts
- packages/ai/src/providers/google.ts
- packages/ai/src/index.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/test/google-raw-stop-reason.test.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api` 到 lazy `ProviderStreams` implementation 的派发层。
- [subsys.ai.google-vertex](google-vertex.md) - 同一 shared Gemini serializer 在 Vertex AI 认证和 endpoint 语义下的协议入口。
