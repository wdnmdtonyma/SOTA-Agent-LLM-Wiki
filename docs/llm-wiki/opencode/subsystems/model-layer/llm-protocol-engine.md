---
id: model-layer.llm-protocol-engine
title: LLM Protocol Engine
kind: subsystem
tier: T1
v: shared
source: [packages/llm/src/route/]
symbols: [Route.make, Route.compile, RequestExecutor, Protocol, Endpoint, Auth, Framing, Transport]
related: [model-layer.llm-protocols, model-layer.llm-schema]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> LLM protocol engine 是 `packages/llm` 里的 provider-native 执行层:一个 route 把 `Protocol + Endpoint + Auth + Framing/Transport` 四个轴组合成可执行模型,再由 `Route.compile` 验证 request body、准备 transport,最后交给 `RequestExecutor` 做 HTTP 执行、重试、错误归因和密钥脱敏。

## 能回答的问题
- `Route` 的四个轴分别管什么?
- `compile` 管线在什么时候验证 provider-native JSON body?
- HTTP 4xx/5xx 如何映射成 `LLMErrorReason`?
- 请求/响应细节如何脱敏,哪些 header/query/body 会被处理?
- V1 与 V2 为什么都要知道 `packages/llm`,但默认执行路径不同?

## V1

V1 当前活跑主线是 `packages/opencode/src` 的 Vercel AI SDK loop,`packages/llm` 在 V1 中是可选 native seam,不是默认 session loop 的主 engine。[I] 这个节点描述的 `Route`/`RequestExecutor` 仍然是共享包语义:V1 代码若选择 native route,会复用同一套 protocol engine,但 V1 provider registry 的默认产物仍是 `LanguageModelV3`。[I]

命名陷阱:不要把 `packages/llm` 的 `ProviderID`/`ModelID` 当成 `packages/opencode/src/provider` 的 `Provider.Info`/`ProviderAuth`,也不要把 route engine 当成 V1 HTTP server。V1 HTTP server 与 V2 HTTP server 都是 Effect HttpApi 体系,不是 Hono。[I]

## V2

V2 的 `packages/core/src` 以 `@opencode/v2` 命名空间推进,model catalog 可以生成 native provider/model,而 native execution 语义由 `packages/llm` 的 route engine 承担。[I] V2 真正接通执行的入口目前是 core public embedded API,不是整个旧 CLI 默认切换。[I]

`Route.make` 的设计动机是把 provider 差异拆成四个互相可换的轴:protocol 是 semantic API shape,endpoint 是 base URL/path/query,auth 是 request header mutation,framing 是 byte stream 到 event frame 的切分。[E: packages/llm/src/route/client.ts:181][E: packages/llm/src/route/client.ts:183][E: packages/llm/src/route/client.ts:185][E: packages/llm/src/route/client.ts:187] 默认 overload 会用 `HttpTransport.httpJson({ framing })`,所以只传 `framing` 的 route 实际仍然会得到 HTTP JSON transport。[E: packages/llm/src/route/client.ts:322][E: packages/llm/src/route/client.ts:329]

## 职责边界

- `Protocol` 描述 provider-native JSON body 与 streaming state machine;它只包含 `id/body/stream`,不包含 endpoint/auth/header 字段,所以 deployment 关切被留给 route。[E: packages/llm/src/route/protocol.ts:36][E: packages/llm/src/route/protocol.ts:42]
- `Endpoint` 只负责 base URL、path、query 的合成,并由 `render` 输出最终 URL。[E: packages/llm/src/route/endpoint.ts:22][E: packages/llm/src/route/endpoint.ts:47]
- `Auth` 的 `apply` 输出 headers;`bearer`/`apiKey`/`header` 是 header mutation helper,missing credential 会转成 authentication-class `LLMError`。[E: packages/llm/src/route/auth.ts:33][E: packages/llm/src/route/auth.ts:67][E: packages/llm/src/route/auth.ts:137]
- `Framing` 把 response stream 切成 provider protocol 能 consume 的 frame;SSE framing 是内置 framing id。[E: packages/llm/src/route/framing.ts:19][E: packages/llm/src/route/framing.ts:25]
- `Transport` 是 request preparation 与 frame streaming 的边界,运行时只要求 HTTP executor,WebSocket executor 是可选项。[E: packages/llm/src/route/transport/index.ts:8][E: packages/llm/src/route/transport/index.ts:13][E: packages/llm/src/route/client.ts:415]

## 数据模型

`Route` 的核心字段是 `id/provider/protocol/endpoint/auth/transport/defaults/body/with/model/prepareTransport/streamPrepared`。[E: packages/llm/src/route/client.ts:37][E: packages/llm/src/route/client.ts:52] route defaults/input 只包含 headers、limits、generation、providerOptions、http,没有 cache 字段。[E: packages/llm/src/route/client.ts:67][E: packages/llm/src/route/client.ts:80]

`Route.with` 是 route patching seam:`RoutePatch` 允许 patch id、provider、auth、transport、endpoint,并继承 route defaults input 字段;实现会 merge endpoint 与 defaults。[E: packages/llm/src/route/client.ts:83][E: packages/llm/src/route/client.ts:88][E: packages/llm/src/route/client.ts:250][E: packages/llm/src/route/client.ts:259]

## 控制流

1. 调用方把 `LLMRequest` 与 route-bound model 交给 `streamRequestWith` 或 `generateWith`;`streamRequestWith` 先 `compile`,再调用 `compiled.route.streamPrepared`。[E: packages/llm/src/route/client.ts:367][E: packages/llm/src/route/client.ts:371]

2. `compile` 先合并 route defaults 与 request 的 generation/providerOptions/http,再调用 `route.body.from(request)` 生成 provider-native body。[E: packages/llm/src/route/client.ts:338][E: packages/llm/src/route/client.ts:341]

3. `compile` 随即用 route body schema 对 native body 做 `Schema.decodeUnknown` 校验,通过后才 `prepareTransport`。[E: packages/llm/src/route/client.ts:343][E: packages/llm/src/route/client.ts:344]

4. `prepareTransport` 把 endpoint/auth/body encoder/headers/request 全部传给 transport,让 HTTP 或 WebSocket transport 自己完成 URL、headers、body 的最终装配。[E: packages/llm/src/route/client.ts:263][E: packages/llm/src/route/client.ts:270]

5. `streamPrepared` 从 transport 取 frames,把每个 frame decode 成 protocol event,遇到 protocol terminal event 时停止,再用 protocol `step` 累积 parser state 与输出 `LLMEvent`。[E: packages/llm/src/route/client.ts:274][E: packages/llm/src/route/client.ts:278][E: packages/llm/src/route/client.ts:281]

6. `generateWith` 不走另一套 API,而是 fold 同一个 stream 成 `LLMResponse`,并用最后一个带 usage 的事件作为 response usage。[E: packages/llm/src/route/client.ts:375][E: packages/llm/src/route/client.ts:383]

## RequestExecutor

`RequestExecutor` 的 public surface 是 `execute(request): Effect<Response, LLMError>`。[E: packages/llm/src/route/executor.ts:27][E: packages/llm/src/route/executor.ts:30] 默认 HTTP executor 会对 HTTP client error 做 `TransportReason` 映射,对 status >= 400 做 provider error 映射,再对 retryable status 运行 retry policy。[E: packages/llm/src/route/executor.ts:375][E: packages/llm/src/route/executor.ts:378]

状态码归因是显式规则:401 变 authentication invalid,403 变 authentication insufficient-permissions,429 根据 quota regex 分成 quota exceeded 或 rate limit,400/404/409/413/422 变 invalid request 并尝试 context overflow 分类,5xx 或其他 retryable status 分支变 provider internal。[E: packages/llm/src/route/executor.ts:236][E: packages/llm/src/route/executor.ts:239][E: packages/llm/src/route/executor.ts:242][E: packages/llm/src/route/executor.ts:253][E: packages/llm/src/route/executor.ts:266][E: packages/llm/src/route/executor.ts:91]

重试只在 `error.retryable` 为 true 且剩余次数大于 0 时发生;delay 优先使用 `retry-after`,否则走指数 jitter。[E: packages/llm/src/route/executor.ts:345][E: packages/llm/src/route/executor.ts:359][E: packages/llm/src/route/executor.ts:362]

脱敏不是只脱 header。executor 收集敏感 header/query 值和 bearer token 片段,再对 body 做 replacement,响应 body 也会脱敏并限制到 `BODY_LIMIT = 16_384`。[E: packages/llm/src/route/executor.ts:35][E: packages/llm/src/route/executor.ts:166][E: packages/llm/src/route/executor.ts:191][E: packages/llm/src/route/executor.ts:197]

## 设计动机

四轴设计让 provider adapter 可以复用 protocol 或 transport:OpenAI-compatible provider 可以复用 OpenAI Chat protocol,GitHub Copilot 可以在 native provider 中按 model 选择 OpenAI Responses 或 Chat route,Bedrock 可以替换 auth/framing/endpoint 而保持同一 `LLMRequest` schema。[I]

OpenAI Responses 同时拥有 HTTP+SSE route 与 WebSocket route,两条 route 都引用同一个 `protocol` 字段;这种 transport 分离的意图是复用协议 state machine。[E: packages/llm/src/protocols/openai-responses.ts:968][E: packages/llm/src/protocols/openai-responses.ts:971][E: packages/llm/src/protocols/openai-responses.ts:995][E: packages/llm/src/protocols/openai-responses.ts:998][I]

## 易错点

- `endpoint` 不是 provider id;provider id 只是 route/model 解析的一部分,最终 URL 来自 Endpoint render 与 provider helper patch。[E: packages/llm/src/route/endpoint.ts:47]
- `auth: Auth.none` 表示 auth apply 直接返回原 headers,不做 header mutation。[E: packages/llm/src/route/auth.ts:96]
- `packages/llm` 的 HTTP status error 归因集中在 RequestExecutor 的 `statusError` 分支。[E: packages/llm/src/route/executor.ts:277]

## Sources
- packages/llm/src/route/
- packages/llm/src/protocols/openai-responses.ts

## Related
- model-layer.llm-protocols
- model-layer.llm-schema
