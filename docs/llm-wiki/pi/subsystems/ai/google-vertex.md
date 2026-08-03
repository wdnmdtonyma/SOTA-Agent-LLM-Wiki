---
id: subsys.ai.google-vertex
title: Google Vertex AI 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/google-vertex.ts
  - packages/ai/src/api/google-shared.ts
symbols:
  - stream
  - GoogleVertexOptions
related:
  - subsys.ai.google-generative-ai
  - subsys.ai.env-api-keys
evidence: explicit
status: verified
updated: 305c014dcc
---

> `subsys.ai.google-vertex` 描述 `pi-ai` 的 `google-vertex` wire 协议入口:它用 `@google/genai` 的 Vertex 模式构造客户端,把 pi 的 `Context` 转成 Gemini `GenerateContentParameters`,并把 Vertex/Gemini stream chunk 归一成 `AssistantMessageEventStream`。

## 能回答的问题

- `google-vertex` 的 `stream` 如何选择 API key 模式或 Application Default Credentials 模式?
- Vertex 请求里的 `project`、`location`、`httpOptions`、headers 和 custom base URL 在哪里构造?
- `GoogleVertexOptions` 相比普通 Gemini API options 多了哪些字段?
- Vertex 如何复用 `google-shared.ts` 的 message/tool/stop-reason 转换?
- 哪些 Vertex 行为可由 `google-vertex.ts` 本身验证,哪些 sibling/env 差异需要跳转到相关节点?

## 职责边界

`GoogleVertexOptions` 是 `StreamOptions` 的 Vertex 扩展,它保留 `toolChoice` 与 `thinking` 配置,并额外接受 `project` 与 `location` 两个 Vertex 定位字段。[E: packages/ai/src/api/google-vertex.ts:45][E: packages/ai/src/api/google-vertex.ts:52][E: packages/ai/src/api/google-vertex.ts:53] `stream` 的 API identity 固定为 `"google-vertex"`,输出消息也写入 `api: "google-vertex"` 与当前 `model.provider` / `model.id`。[E: packages/ai/src/api/google-vertex.ts:70][E: packages/ai/src/api/google-vertex.ts:81][E: packages/ai/src/api/google-vertex.ts:82][E: packages/ai/src/api/google-vertex.ts:83]

`stream` 不是 provider registry 或 auth discovery 层;它假定外层已经把 provider/model/options 传入,然后在 wire module 内部解析 Vertex API key、ADC project/location、payload 与 streaming events。[I] API key 如何从环境发现不在本节点 source 范围内;本节点只解释 `api/google-vertex.ts` 在真正发请求前如何消费 `options.apiKey`、`options.env`、`project` 与 `location`。[E: packages/ai/src/api/google-vertex.ts:100][E: packages/ai/src/api/google-vertex.ts:102][E: packages/ai/src/api/google-vertex.ts:104][E: packages/ai/src/api/google-vertex.ts:421][E: packages/ai/src/api/google-vertex.ts:433][E: packages/ai/src/api/google-vertex.ts:446]

## 关键文件

- `packages/ai/src/api/google-vertex.ts` 是 `google-vertex` wire implementation:定义 `GoogleVertexOptions`、`stream`、`streamSimple`、Vertex client constructors、project/location/API key resolution、request payload builder 与 stream chunk normalization。[E: packages/ai/src/api/google-vertex.ts:45][E: packages/ai/src/api/google-vertex.ts:70][E: packages/ai/src/api/google-vertex.ts:313][E: packages/ai/src/api/google-vertex.ts:349][E: packages/ai/src/api/google-vertex.ts:367][E: packages/ai/src/api/google-vertex.ts:454]
- `packages/ai/src/api/google-shared.ts` 是 Google Generative AI 与 Vertex 共用的转换层:它把 pi messages 转成 `Content[]`,把 pi tools 转成 Gemini function declarations,并把 Google finish reason 映射回 pi stop reason。[E: packages/ai/src/api/google-shared.ts:12][E: packages/ai/src/api/google-shared.ts:98][E: packages/ai/src/api/google-shared.ts:285][E: packages/ai/src/api/google-shared.ts:341]

## 数据模型

`GoogleVertexOptions.thinking` 支持 `enabled`、`budgetTokens` 和 `level`,其中 `level` 使用 `GoogleThinkingLevel`;本文件把这些字符串 level 映射到 `@google/genai` 的 `ThinkingLevel` enum 后再放进 Vertex request config。[E: packages/ai/src/api/google-vertex.ts:47][E: packages/ai/src/api/google-vertex.ts:50][E: packages/ai/src/api/google-vertex.ts:59][E: packages/ai/src/api/google-vertex.ts:484] `project` 和 `location` 可以直接从 options 传入;缺省时分别读取 `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` 与 `GOOGLE_CLOUD_LOCATION`。[E: packages/ai/src/api/google-vertex.ts:52][E: packages/ai/src/api/google-vertex.ts:53][E: packages/ai/src/api/google-vertex.ts:434][E: packages/ai/src/api/google-vertex.ts:436][E: packages/ai/src/api/google-vertex.ts:437][E: packages/ai/src/api/google-vertex.ts:447]

`GCP_VERTEX_CREDENTIALS_MARKER` 的值是 `"gcp-vertex-credentials"`;`resolveApiKey` 会把空 key、该 marker、以及形如 `<...>` 的 placeholder 都视为无 API key,从而走 ADC/client-with-project-location 分支。[E: packages/ai/src/api/google-vertex.ts:57][E: packages/ai/src/api/google-vertex.ts:100][E: packages/ai/src/api/google-vertex.ts:102][E: packages/ai/src/api/google-vertex.ts:103][E: packages/ai/src/api/google-vertex.ts:104][E: packages/ai/src/api/google-vertex.ts:421][E: packages/ai/src/api/google-vertex.ts:423][E: packages/ai/src/api/google-vertex.ts:429][E: packages/ai/src/api/google-vertex.ts:430]

## 控制流

1. `stream@google-vertex.ts` 同步创建 `AssistantMessageEventStream`,在异步闭包里初始化 normalized assistant output,并把 `api`、`provider`、`model`、usage 初值、`stopReason` 与 `timestamp` 写入 output。[E: packages/ai/src/api/google-vertex.ts:70][E: packages/ai/src/api/google-vertex.ts:75][E: packages/ai/src/api/google-vertex.ts:77][E: packages/ai/src/api/google-vertex.ts:78][E: packages/ai/src/api/google-vertex.ts:81][E: packages/ai/src/api/google-vertex.ts:82][E: packages/ai/src/api/google-vertex.ts:83][E: packages/ai/src/api/google-vertex.ts:84][E: packages/ai/src/api/google-vertex.ts:92][E: packages/ai/src/api/google-vertex.ts:93]
2. `stream` 先调用 `resolveApiKey(options)`;若返回 key,使用 `createClientWithApiKey(model, apiKey, options?.headers)`,否则使用 `createClient(model, resolveProject(options), resolveLocation(options), options?.headers, options?.env)`。[E: packages/ai/src/api/google-vertex.ts:100][E: packages/ai/src/api/google-vertex.ts:102][E: packages/ai/src/api/google-vertex.ts:103][E: packages/ai/src/api/google-vertex.ts:104]
3. `createClient` 构造 `new GoogleGenAI({ vertexai: true, project, location, apiVersion: "v1", googleAuthOptions?, httpOptions? })`;`googleAuthOptions` 只在 `GOOGLE_APPLICATION_CREDENTIALS` 可解析时设置 `{ keyFilename }`。[E: packages/ai/src/api/google-vertex.ts:349][E: packages/ai/src/api/google-vertex.ts:356][E: packages/ai/src/api/google-vertex.ts:357][E: packages/ai/src/api/google-vertex.ts:358][E: packages/ai/src/api/google-vertex.ts:359][E: packages/ai/src/api/google-vertex.ts:360][E: packages/ai/src/api/google-vertex.ts:361][E: packages/ai/src/api/google-vertex.ts:362][E: packages/ai/src/api/google-vertex.ts:363][E: packages/ai/src/api/google-vertex.ts:416][E: packages/ai/src/api/google-vertex.ts:417][E: packages/ai/src/api/google-vertex.ts:418]
4. `createClientWithApiKey` 同样设置 `vertexai: true` 与 `apiVersion: "v1"`,但传入 `apiKey` 而不传 `project`、`location` 或 `googleAuthOptions`;因此 API key 模式和 ADC project/location 模式在 client constructor 层分叉。[E: packages/ai/src/api/google-vertex.ts:367][E: packages/ai/src/api/google-vertex.ts:372][E: packages/ai/src/api/google-vertex.ts:373][E: packages/ai/src/api/google-vertex.ts:374][E: packages/ai/src/api/google-vertex.ts:375][E: packages/ai/src/api/google-vertex.ts:376]
5. `buildHttpOptions` 从 `model.baseUrl` 解析 custom base URL;空字符串或包含 `{location}` 的 base URL 被忽略,非空 base URL 会设置 `baseUrl` 和 `baseUrlResourceScope: ResourceScope.COLLECTION`,并在 URL path 已含 API version 时把 `httpOptions.apiVersion` 置为空字符串。[E: packages/ai/src/api/google-vertex.ts:380][E: packages/ai/src/api/google-vertex.ts:382][E: packages/ai/src/api/google-vertex.ts:383][E: packages/ai/src/api/google-vertex.ts:384][E: packages/ai/src/api/google-vertex.ts:385][E: packages/ai/src/api/google-vertex.ts:386][E: packages/ai/src/api/google-vertex.ts:387][E: packages/ai/src/api/google-vertex.ts:399][E: packages/ai/src/api/google-vertex.ts:401][E: packages/ai/src/api/google-vertex.ts:404]
6. `buildHttpOptions` 合并 `model.headers` 与 per-request `options.headers`,再通过 `providerHeadersToRecord` 写入 `httpOptions.headers`;空 `httpOptions` 会返回 `undefined`,避免给 SDK 传空对象。[E: packages/ai/src/api/google-vertex.ts:391][E: packages/ai/src/api/google-vertex.ts:392][E: packages/ai/src/api/google-vertex.ts:393][E: packages/ai/src/api/google-vertex.ts:396]
7. `buildParams` 先用 `convertMessages(model, context)` 生成 Gemini `Content[]`,再把 `temperature` 映射到 `config.temperature`,把 `maxTokens` 映射到 `config.maxOutputTokens`,把 `context.systemPrompt` 映射到 `systemInstruction`,把 `context.tools` 映射到 `convertTools(context.tools)`。[E: packages/ai/src/api/google-vertex.ts:454][E: packages/ai/src/api/google-vertex.ts:459][E: packages/ai/src/api/google-vertex.ts:461][E: packages/ai/src/api/google-vertex.ts:462][E: packages/ai/src/api/google-vertex.ts:463][E: packages/ai/src/api/google-vertex.ts:465][E: packages/ai/src/api/google-vertex.ts:466][E: packages/ai/src/api/google-vertex.ts:472][E: packages/ai/src/api/google-vertex.ts:474][E: packages/ai/src/api/google-vertex.ts:475]
8. `buildParams` 只在存在 tools 且 `options.toolChoice` 存在时设置 `config.toolConfig.functionCallingConfig.mode = mapToolChoice(options.toolChoice)`;否则显式把 `config.toolConfig` 置为 `undefined`。[E: packages/ai/src/api/google-vertex.ts:475][E: packages/ai/src/api/google-vertex.ts:503][E: packages/ai/src/api/google-vertex.ts:477][E: packages/ai/src/api/google-vertex.ts:470][E: packages/ai/src/api/google-vertex.ts:270][E: packages/ai/src/api/google-vertex.ts:471]
9. `buildParams` 只在 `options.thinking.enabled` 且 `model.reasoning` 为真时设置 `{ includeThoughts: true }`,再优先写 `thinkingLevel`,否则写 `thinkingBudget`;当 model 支持 reasoning 且 caller 显式 `thinking.enabled=false` 时,它用 `getDisabledThinkingConfig(model)` 生成关闭或最低级 thinking config。[E: packages/ai/src/api/google-vertex.ts:481][E: packages/ai/src/api/google-vertex.ts:482][E: packages/ai/src/api/google-vertex.ts:483][E: packages/ai/src/api/google-vertex.ts:484][E: packages/ai/src/api/google-vertex.ts:485][E: packages/ai/src/api/google-vertex.ts:486][E: packages/ai/src/api/google-vertex.ts:488][E: packages/ai/src/api/google-vertex.ts:489][E: packages/ai/src/api/google-vertex.ts:490][E: packages/ai/src/api/google-vertex.ts:520][E: packages/ai/src/api/google-vertex.ts:525][E: packages/ai/src/api/google-vertex.ts:528][E: packages/ai/src/api/google-vertex.ts:533]
10. `buildParams` 把 `options.signal` 映射到 `config.abortSignal`,如果 signal 已经 aborted 则先抛 `Request aborted`;最终 payload 是 `{ model: model.id, contents, config }`。[E: packages/ai/src/api/google-vertex.ts:493][E: packages/ai/src/api/google-vertex.ts:494][E: packages/ai/src/api/google-vertex.ts:495][E: packages/ai/src/api/google-vertex.ts:497][E: packages/ai/src/api/google-vertex.ts:500][E: packages/ai/src/api/google-vertex.ts:501][E: packages/ai/src/api/google-vertex.ts:502][E: packages/ai/src/api/google-vertex.ts:503]
11. `stream` 在 `onPayload` hook 有返回值时用 hook 返回的 `GenerateContentParameters` 替换 params,随后调用 `client.models.generateContentStream(params)` 并 push normalized `start` event。[E: packages/ai/src/api/google-vertex.ts:105][E: packages/ai/src/api/google-vertex.ts:106][E: packages/ai/src/api/google-vertex.ts:107][E: packages/ai/src/api/google-vertex.ts:108][E: packages/ai/src/api/google-vertex.ts:106][E: packages/ai/src/api/google-vertex.ts:112]
12. stream chunk 处理读取 `chunk.candidates?.[0].content.parts`:text part 按 `isThinkingPart(part)` 分成 `thinking_*` 或 `text_*` events,并通过 `retainThoughtSignature` 保留 text/thinking block 的 thought signature。[E: packages/ai/src/api/google-vertex.ts:116][E: packages/ai/src/api/google-vertex.ts:120][E: packages/ai/src/api/google-vertex.ts:121][E: packages/ai/src/api/google-vertex.ts:123][E: packages/ai/src/api/google-vertex.ts:124][E: packages/ai/src/api/google-vertex.ts:147][E: packages/ai/src/api/google-vertex.ts:150][E: packages/ai/src/api/google-vertex.ts:157][E: packages/ai/src/api/google-vertex.ts:159][E: packages/ai/src/api/google-vertex.ts:163][E: packages/ai/src/api/google-vertex.ts:170][E: packages/ai/src/api/google-vertex.ts:171][E: packages/ai/src/api/google-vertex.ts:175]
13. function call part 会先关闭当前 text/thinking block,再生成 `ToolCall`;如果 Google 没有给 id 或 id 与既有 tool call 冲突,pi 会用 `name_Date.now_counter` 生成新 id。[E: packages/ai/src/api/google-vertex.ts:184][E: packages/ai/src/api/google-vertex.ts:185][E: packages/ai/src/api/google-vertex.ts:204][E: packages/ai/src/api/google-vertex.ts:205][E: packages/ai/src/api/google-vertex.ts:206][E: packages/ai/src/api/google-vertex.ts:207][E: packages/ai/src/api/google-vertex.ts:208][E: packages/ai/src/api/google-vertex.ts:211][E: packages/ai/src/api/google-vertex.ts:213][E: packages/ai/src/api/google-vertex.ts:214][E: packages/ai/src/api/google-vertex.ts:215][E: packages/ai/src/api/google-vertex.ts:216][E: packages/ai/src/api/google-vertex.ts:220][E: packages/ai/src/api/google-vertex.ts:221][E: packages/ai/src/api/google-vertex.ts:227]
14. finish reason 经 `mapStopReason` 转成 pi stop reason;只要输出内容中存在 `toolCall`,最终 stop reason 会被覆盖为 `"toolUse"`。[E: packages/ai/src/api/google-vertex.ts:232][E: packages/ai/src/api/google-vertex.ts:234][E: packages/ai/src/api/google-vertex.ts:235][E: packages/ai/src/api/google-vertex.ts:236]
15. usage metadata 映射为 pi usage:input 从 `promptTokenCount - cachedContentTokenCount` 计算,output 加总 `candidatesTokenCount` 与 `thoughtsTokenCount`,cacheRead 取 cached token,reasoning 取 thoughts token,然后调用 `calculateCost(model, output.usage)`。[E: packages/ai/src/api/google-vertex.ts:240][E: packages/ai/src/api/google-vertex.ts:242][E: packages/ai/src/api/google-vertex.ts:243][E: packages/ai/src/api/google-vertex.ts:245][E: packages/ai/src/api/google-vertex.ts:246][E: packages/ai/src/api/google-vertex.ts:248][E: packages/ai/src/api/google-vertex.ts:249][E: packages/ai/src/api/google-vertex.ts:258]
16. 正常结束时 `stream` push `done` 并 `end`;catch 分支会把 stop reason 设为 `"aborted"` 或 `"error"`,通过 shared provider-error formatter 写入 `errorMessage`,push terminal `error` event 并 `end`。[E: packages/ai/src/api/google-vertex.ts:27][E: packages/ai/src/api/google-vertex.ts:294][E: packages/ai/src/api/google-vertex.ts:295][E: packages/ai/src/api/google-vertex.ts:296][E: packages/ai/src/api/google-vertex.ts:303][E: packages/ai/src/api/google-vertex.ts:304][E: packages/ai/src/api/google-vertex.ts:305][E: packages/ai/src/api/google-vertex.ts:306]

## shared 转换层

`convertMessages` 接受 `Model<"google-generative-ai" | "google-vertex">`,因此 Vertex 与 Gemini API 共享同一个 message serializer。[E: packages/ai/src/api/google-shared.ts:12][E: packages/ai/src/api/google-shared.ts:98] 它先调用 `transformMessages(context.messages, model, normalizeToolCallId)`,其中 `normalizeToolCallId` 仅在 `requiresToolCallId(model.id)` 为真时把 id 限定为字母数字、`_`、`-` 并截断到 64 字符。[E: packages/ai/src/api/google-shared.ts:100][E: packages/ai/src/api/google-shared.ts:101][E: packages/ai/src/api/google-shared.ts:102][E: packages/ai/src/api/google-shared.ts:105]

用户消息转成 Gemini `role: "user"`;纯文本进入 `{ text }`,结构化内容中的 text 也进入 `{ text }`,image blocks 进入 `{ inlineData: { mimeType, data } }`。[E: packages/ai/src/api/google-shared.ts:108][E: packages/ai/src/api/google-shared.ts:110][E: packages/ai/src/api/google-shared.ts:111][E: packages/ai/src/api/google-shared.ts:112][E: packages/ai/src/api/google-shared.ts:115][E: packages/ai/src/api/google-shared.ts:116][E: packages/ai/src/api/google-shared.ts:117][E: packages/ai/src/api/google-shared.ts:119][E: packages/ai/src/api/google-shared.ts:120][E: packages/ai/src/api/google-shared.ts:121][E: packages/ai/src/api/google-shared.ts:122]

assistant 消息转成 Gemini `role: "model"`;text block 与 thinking/toolCall block 的 signature 只有在历史消息来自同一 provider/model 且 signature 是有效 base64 时才保留,thinking block 在同 provider/model 时写成 `{ thought: true, text, thoughtSignature? }`,否则降级为普通 text。[E: packages/ai/src/api/google-shared.ts:56][E: packages/ai/src/api/google-shared.ts:65][E: packages/ai/src/api/google-shared.ts:66][E: packages/ai/src/api/google-shared.ts:133][E: packages/ai/src/api/google-shared.ts:136][E: packages/ai/src/api/google-shared.ts:139][E: packages/ai/src/api/google-shared.ts:140][E: packages/ai/src/api/google-shared.ts:146][E: packages/ai/src/api/google-shared.ts:147][E: packages/ai/src/api/google-shared.ts:150][E: packages/ai/src/api/google-shared.ts:153][E: packages/ai/src/api/google-shared.ts:158][E: packages/ai/src/api/google-shared.ts:159][E: packages/ai/src/api/google-shared.ts:160][E: packages/ai/src/api/google-shared.ts:166][E: packages/ai/src/api/google-shared.ts:167][E: packages/ai/src/api/google-shared.ts:171][E: packages/ai/src/api/google-shared.ts:178][E: packages/ai/src/api/google-shared.ts:185][E: packages/ai/src/api/google-shared.ts:186]

tool result 转成 user-role `functionResponse`;文本结果写入 `response.output` 或 `response.error`,image result 只有在 `model.input` 包含 image 时参与转换,并且对 Gemini 3+ 以内嵌 `parts` 放进 function response,对 Gemini < 3 会追加一个单独 user image turn。[E: packages/ai/src/api/google-shared.ts:189][E: packages/ai/src/api/google-shared.ts:193][E: packages/ai/src/api/google-shared.ts:194][E: packages/ai/src/api/google-shared.ts:197][E: packages/ai/src/api/google-shared.ts:198][E: packages/ai/src/api/google-shared.ts:203][E: packages/ai/src/api/google-shared.ts:206][E: packages/ai/src/api/google-shared.ts:216][E: packages/ai/src/api/google-shared.ts:217][E: packages/ai/src/api/google-shared.ts:219][E: packages/ai/src/api/google-shared.ts:220][E: packages/ai/src/api/google-shared.ts:231][E: packages/ai/src/api/google-shared.ts:232][E: packages/ai/src/api/google-shared.ts:238][E: packages/ai/src/api/google-shared.ts:239][E: packages/ai/src/api/google-shared.ts:240][E: packages/ai/src/api/google-shared.ts:241]

`convertTools` 把 pi `Tool[]` 转成 Gemini `functionDeclarations`;默认写 `parametersJsonSchema`,只有 `useParameters=true` 时才写 sanitised OpenAPI-style `parameters`。[E: packages/ai/src/api/google-shared.ts:285][E: packages/ai/src/api/google-shared.ts:289][E: packages/ai/src/api/google-shared.ts:292][E: packages/ai/src/api/google-shared.ts:293][E: packages/ai/src/api/google-shared.ts:294][E: packages/ai/src/api/google-shared.ts:295][E: packages/ai/src/api/google-shared.ts:296][E: packages/ai/src/api/google-shared.ts:297]

## 与 Gemini API 的关系

当前 source 只能直接证明 Vertex 侧复用了 `google-shared.ts` 的 Google API union 类型和转换 helpers,并且 Vertex stream 调用 `client.models.generateContentStream(params)` 处理 `GenerateContentResponse` chunk。[E: packages/ai/src/api/google-shared.ts:12][E: packages/ai/src/api/google-shared.ts:98][E: packages/ai/src/api/google-shared.ts:285][E: packages/ai/src/api/google-shared.ts:341][E: packages/ai/src/api/google-vertex.ts:32][E: packages/ai/src/api/google-vertex.ts:33][E: packages/ai/src/api/google-vertex.ts:34][E: packages/ai/src/api/google-vertex.ts:35][E: packages/ai/src/api/google-vertex.ts:36][E: packages/ai/src/api/google-vertex.ts:37][E: packages/ai/src/api/google-vertex.ts:38][E: packages/ai/src/api/google-vertex.ts:39][E: packages/ai/src/api/google-vertex.ts:42][E: packages/ai/src/api/google-vertex.ts:106]

`google-generative-ai.ts` 的 API-key-only 行为、non-Vertex client construction、`streamSimple` 分支和 Gemma 4 thinking 特例由 `subsys.ai.google-generative-ai` 覆盖;本节点只把这些 sibling 差异作为 Vertex 视角下的跨节点边界,不把它们当作 Vertex source 自己证明的事实 [I]。

## 设计动机与权衡

Vertex keeps the request serializer close to the shared Google API shape: it builds `GenerateContentParameters` / `GenerateContentConfig`, constructs `GoogleGenAI`, and sends the final params through `client.models.generateContentStream(params)`.[I][E: packages/ai/src/api/google-vertex.ts:2][E: packages/ai/src/api/google-vertex.ts:3][E: packages/ai/src/api/google-vertex.ts:4][E: packages/ai/src/api/google-vertex.ts:105][E: packages/ai/src/api/google-vertex.ts:106]

The Vertex-specific branch is concentrated in auth and endpoint construction: API key mode avoids requiring project/location, while ADC mode requires project/location before request creation.[I][E: packages/ai/src/api/google-vertex.ts:102][E: packages/ai/src/api/google-vertex.ts:103][E: packages/ai/src/api/google-vertex.ts:104][E: packages/ai/src/api/google-vertex.ts:433][E: packages/ai/src/api/google-vertex.ts:438][E: packages/ai/src/api/google-vertex.ts:439][E: packages/ai/src/api/google-vertex.ts:446][E: packages/ai/src/api/google-vertex.ts:448][E: packages/ai/src/api/google-vertex.ts:449]

## gotcha

- A usable `options.apiKey` selects API-key client construction and bypasses `resolveProject` / `resolveLocation`; ADC mode calls both resolvers, and each throws when its value is unavailable.[E: packages/ai/src/api/google-vertex.ts:100][E: packages/ai/src/api/google-vertex.ts:102][E: packages/ai/src/api/google-vertex.ts:103][E: packages/ai/src/api/google-vertex.ts:104][E: packages/ai/src/api/google-vertex.ts:433][E: packages/ai/src/api/google-vertex.ts:438][E: packages/ai/src/api/google-vertex.ts:439][E: packages/ai/src/api/google-vertex.ts:446][E: packages/ai/src/api/google-vertex.ts:448][E: packages/ai/src/api/google-vertex.ts:449]
- `resolveCustomBaseUrl` ignores base URLs containing `{location}` instead of templating them; callers that expect runtime interpolation need to provide a concrete base URL or rely on the SDK's project/location endpoint construction.[E: packages/ai/src/api/google-vertex.ts:399][E: packages/ai/src/api/google-vertex.ts:401][E: packages/ai/src/api/google-vertex.ts:402][I]
- Vertex consumes `candidate.content.parts` from `client.models.generateContentStream(params)` chunks before mapping text/function-call parts into pi events; backend-level equivalence with Gemini API is outside this node's evidence scope.[E: packages/ai/src/api/google-vertex.ts:106][E: packages/ai/src/api/google-vertex.ts:120][E: packages/ai/src/api/google-vertex.ts:121][I]

## 跨包边界

`subsys.ai.google-generative-ai` is the sibling Gemini API wire implementation. This node verifies only the shared conversion surface visible in `google-shared.ts`; sibling-specific auth and client-constructor differences belong to that sibling node's own source.[E: packages/ai/src/api/google-shared.ts:12][E: packages/ai/src/api/google-shared.ts:98][E: packages/ai/src/api/google-shared.ts:285][E: packages/ai/src/api/google-shared.ts:341][I]

`subsys.ai.env-api-keys` covers discovery of environment-backed credentials. This node verifies only how `google-vertex.ts` consumes values after they arrive as `options.apiKey`, `options.env`, `project`, and `location`; env discovery details require that node's own source.[E: packages/ai/src/api/google-vertex.ts:421][E: packages/ai/src/api/google-vertex.ts:433][E: packages/ai/src/api/google-vertex.ts:446][U]

## 本轮 stream 状态、retry 与 fetch 变化

Vertex accumulator 从 `pending` 开始；candidate finish reason 同时写入 `rawStopReason` 与 unified reason，未看到终止状态就进入 error path。[E: packages/ai/src/api/google-vertex.ts:78] [E: packages/ai/src/api/google-vertex.ts:92] [E: packages/ai/src/api/google-vertex.ts:232] [E: packages/ai/src/api/google-vertex.ts:236] [E: packages/ai/src/api/google-vertex.ts:280] [E: packages/ai/src/api/google-vertex.ts:294]

`generateContentStream()` 建流请求经 `retryGoogleRequest()` 接入 shared retry，但不重试后续 iterator 中途失败；Vertex 同样对非 `globalThis.fetch` 显式抛错。[E: packages/ai/src/api/google-vertex.ts:96] [E: packages/ai/src/api/google-vertex.ts:98] [E: packages/ai/src/api/google-vertex.ts:110] [E: packages/ai/src/api/google-shared.ts:393] [E: packages/ai/src/api/google-shared.ts:397]

## Sources

- packages/ai/src/api/google-vertex.ts
- packages/ai/src/api/google-shared.ts

## 相关

- [subsys.ai.google-generative-ai](google-generative-ai.md) - sibling Gemini API wire implementation; use its node for sibling-specific auth/client-constructor evidence.
- [subsys.ai.env-api-keys](env-api-keys.md) - provider environment credential discovery; use its node for `GOOGLE_CLOUD_API_KEY` and Vertex ADC readiness evidence.
