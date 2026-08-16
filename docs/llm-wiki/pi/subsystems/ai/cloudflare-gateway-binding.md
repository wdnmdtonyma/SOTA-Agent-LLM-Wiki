---
id: subsys.ai.cloudflare-gateway-binding
title: Cloudflare AI Gateway Workers binding
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/cloudflare-gateway-binding.ts
  - packages/ai/test/cloudflare-gateway-binding.test.ts
  - packages/ai/src/providers/cloudflare-auth.ts
  - packages/ai/src/providers/cloudflare-ai-gateway.ts
  - packages/ai/src/api/cloudflare.ts
symbols:
  - createGatewayBindingFetch
  - CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL
  - GatewayBindingFetchOptions
  - AiGatewayBinding
  - AiGatewayBindingGateway
  - AiGatewayUniversalRequestLike
related:
  - subsys.ai.auth-resolution
  - subsys.ai.openai-completions
  - subsys.ai.openai-responses
  - subsys.ai.anthropic-messages
  - subsys.ai.provider-registry
  - surface.providers.auth
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.ai.cloudflare-gateway-binding` 覆盖 `createGatewayBindingFetch()`:一个只服务单个 AI Gateway 客户端的 `FetchFunction` shim,把 `gateway.ai.cloudflare.com/v1/{account}/{gateway}/...` 前缀下的 POST JSON 请求翻译成 Workers AI binding 的 `env.AI.gateway(id).run(...)`。它不是新 provider,也不自动免去 HTTPS 路径所需的 Cloudflare API token。

## 能回答的问题

- `createGatewayBindingFetch()` 把 HTTPS URL 拆成 binding `provider` / `endpoint` / `query` 的规则是什么?
- 为什么还要传 `cf-aig-authorization: Bearer cloudflare-gateway-binding`,binding 不是已经 in-account 认证吗?
- 哪些 header 会被剥掉,哪些(包括 BYOK `x-api-key`)会原样进入 `run()`?
- 前缀外 URL、非 POST、非 JSON、缺 body 时为什么是 throw 而不是回落到 HTTPS?
- 这个 shim 和 `cloudflareAIGatewayAuth()` / `cloudflare-ai-gateway` provider 的边界在哪?
- `pi-ai` 默认入口会不会导出或自动装配这个 fetch?

## 职责边界

pi 的 Cloudflare AI Gateway 默认运输是 HTTPS:`gateway.ai.cloudflare.com/v1/{account}/{gateway}/{provider}/...`(常量在 `api/cloudflare.ts`)。那条路需要 Cloudflare API token,即使调用方已经是同一 account 里的 Worker。[E: packages/ai/src/api/cloudflare.ts:6][E: packages/ai/src/api/cloudflare.ts:10][E: packages/ai/src/api/cloudflare.ts:14][I]

`createGatewayBindingFetch(options)` 返回的是 **一个 gateway-bound client 的 fetch**,不是通用 fetch。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:79] 它只翻译能用 universal endpoint 表达的请求:`POST` + JSON body + 落在配置前缀内。其余请求抛描述性 `Error`,不静默转发。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:99][E: packages/ai/src/api/cloudflare-gateway-binding.ts:110][E: packages/ai/src/api/cloudflare-gateway-binding.ts:116]

本模块不依赖 `@cloudflare/workers-types`。[I] `AiGatewayBinding` / `AiGatewayBindingGateway` / `AiGatewayUniversalRequestLike` 是 structural type,真实 `env.AI` 满足即可。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:29][E: packages/ai/src/api/cloudflare-gateway-binding.ts:33][E: packages/ai/src/api/cloudflare-gateway-binding.ts:38]

`createGatewayBindingFetch` **不** 出现在 `packages/ai/src/index.ts`。调用方从 `@earendil-works/pi-ai/api/cloudflare-gateway-binding`(`package.json` 的 `./api/*` export)自行 import,再把它塞进 `ProviderRequestOptions.fetch`。[E: packages/ai/package.json:26][E: packages/ai/src/types.ts:130] `cloudflare-ai-gateway` provider 与 `cloudflareAIGatewayAuth()` 都不引用这个模块。[E: packages/ai/src/providers/cloudflare-ai-gateway.ts:1][E: packages/ai/src/providers/cloudflare-auth.ts:74]

模块注释声称 binding 调用 “pre-authenticated in-account”,本仓库测试只用 fake `binding.gateway().run()`,没有 Cloudflare Workers runtime 证明。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:18][U]

## 关键文件

- `packages/ai/src/api/cloudflare-gateway-binding.ts`:权威实现 `createGatewayBindingFetch`、sentinel、header 剥离、URL 规范化与 unexpressible 拒绝。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:55][E: packages/ai/src/api/cloudflare-gateway-binding.ts:79]
- `packages/ai/test/cloudflare-gateway-binding.test.ts`:provider/endpoint 拆分、query string、header 大小写与 init 覆盖、strip 列表、signal、streaming identity、拒绝面、OpenAI Completions SDK 的 null-auth 组合。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:32][E: packages/ai/test/cloudflare-gateway-binding.test.ts:100][E: packages/ai/test/cloudflare-gateway-binding.test.ts:203][E: packages/ai/test/cloudflare-gateway-binding.test.ts:289]
- `packages/ai/src/api/cloudflare.ts`:Workers AI 与 AI Gateway 的 HTTPS base URL 模板,binding shim 对照的就是这些前缀。[E: packages/ai/src/api/cloudflare.ts:2][E: packages/ai/src/api/cloudflare.ts:6][E: packages/ai/src/api/cloudflare.ts:10]
- `packages/ai/src/providers/cloudflare-auth.ts`:`cloudflareAIGatewayAuth()` 仍解析 `CLOUDFLARE_API_KEY` + account + gateway id,并写出真实 `cf-aig-authorization: Bearer ${apiKey}`。这是 HTTPS token 路径,不是 binding sentinel 路径。[E: packages/ai/src/providers/cloudflare-auth.ts:74][E: packages/ai/src/providers/cloudflare-auth.ts:88][E: packages/ai/src/providers/cloudflare-auth.ts:93]
- `packages/ai/src/providers/cloudflare-ai-gateway.ts`:把 Anthropic / OpenAI Completions / OpenAI Responses 三条 wire 包进 `cloudflareStreams()`,用 resolved env 替换 URL 占位符。[E: packages/ai/src/providers/cloudflare-ai-gateway.ts:9][E: packages/ai/src/providers/cloudflare-ai-gateway.ts:17]

## 数据模型

`GatewayBindingFetchOptions` 三个字段:[E: packages/ai/src/api/cloudflare-gateway-binding.ts:57]

| 字段 | 含义 |
|---|---|
| `binding` | Workers AI binding 表面,例如 `env.AI` |
| `baseUrl` | 无尾斜杠的 gateway HTTPS 前缀:`https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayName}` |
| `gateway` | 传给 `binding.gateway()` 的 gateway 名;注释要求它与 `baseUrl` 中的 gateway 一致,实现 **不** 校验二者相等 |

[E: packages/ai/src/api/cloudflare-gateway-binding.ts:59][E: packages/ai/src/api/cloudflare-gateway-binding.ts:64][E: packages/ai/src/api/cloudflare-gateway-binding.ts:66][E: packages/ai/src/api/cloudflare-gateway-binding.ts:80]

`AiGatewayUniversalRequestLike` 是 `run()` 的一条入口:`provider`、`endpoint`、`headers: Record<string, string>`、`query: unknown`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:38] 可选第二参只有 `{ signal?: AbortSignal }`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:34]

`CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL` 字面量是 `"cloudflare-gateway-binding"`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:55] 它不是 Cloudflare 平台 token。API 实现在 dispatch 前要求 API key 或可识别 auth header(`authorization` / `x-api-key` / `cf-aig-authorization`);调用方传 `cf-aig-authorization: Bearer ${CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL}` 只为过这道检查。shim 在调用 binding 前剥离 `cf-aig-authorization`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:71][E: packages/ai/src/api/openai-completions.ts:75][E: packages/ai/src/api/anthropic-messages.ts:298]

`STRIP_HEADERS` 固定为 `content-length`、`host`、`cf-aig-authorization`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:71]

## 控制流

1. `createGatewayBindingFetch@cloudflare-gateway-binding.ts:79` 用 `new URL(options.baseUrl)` 规范化 origin + pathname,并保证 `basePath` 以 `/` 结尾。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:84][E: packages/ai/src/api/cloudflare-gateway-binding.ts:85]
2. 每次 fetch 把 `input` 收成 URL 字符串,method 取 `init.method ?? request.method ?? "GET"` 再 `toUpperCase()`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:88][E: packages/ai/src/api/cloudflare-gateway-binding.ts:90]
3. 前缀判定用 URL 规范化后的 `origin` + `pathname.startsWith(basePath)`,不用原始字符串。非法 URL、跨 origin、或 pathname 不在前缀下,抛 `outside the configured gateway prefix`。注释说明静默转发会把 sentinel 送到任意 host。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:91][E: packages/ai/src/api/cloudflare-gateway-binding.ts:99][E: packages/ai/test/cloudflare-gateway-binding.test.ts:219]
4. 前缀内但 universal endpoint 表达不了的请求走 `unexpressible(reason)`:非 `POST`、pathname 在前缀后缺少 `provider/endpoint`、body 非 JSON、或缺 body。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:116][E: packages/ai/src/api/cloudflare-gateway-binding.ts:120][E: packages/ai/src/api/cloudflare-gateway-binding.ts:131][E: packages/ai/src/api/cloudflare-gateway-binding.ts:134] 这些路径 **不会** 改走 HTTPS,错误文本要求 caller 自行用带 gateway auth 的 HTTPS。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:111]
5. `provider` 是前缀后到第一个 `/` 的片段;`endpoint` 是剩余 path **加上** `parsed.search`(query string 留在 endpoint 上)。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:123][E: packages/ai/src/api/cloudflare-gateway-binding.ts:125][E: packages/ai/test/cloudflare-gateway-binding.test.ts:49][E: packages/ai/test/cloudflare-gateway-binding.test.ts:67]
6. `readBodyText()` 读 `init.body`,显式 `body: null` 清掉 Request 的 body;string / `Uint8Array` / `ArrayBuffer` 直接解码;其余类型经一次性 `Request(..., { duplex: "half" })` 读成文本。JSON 解析结果成为 `query`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:145][E: packages/ai/src/api/cloudflare-gateway-binding.ts:149][E: packages/ai/src/api/cloudflare-gateway-binding.ts:153][E: packages/ai/src/api/cloudflare-gateway-binding.ts:159][E: packages/ai/src/api/cloudflare-gateway-binding.ts:129]
7. `collectHeaders()`:有 `init.headers` 时按 fetch spec **整表替换** Request headers;名字 lower-case 后去重;命中 `STRIP_HEADERS` 的不进入结果。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:171][E: packages/ai/src/api/cloudflare-gateway-binding.ts:174][E: packages/ai/src/api/cloudflare-gateway-binding.ts:177][E: packages/ai/test/cloudflare-gateway-binding.test.ts:83]
8. `signal` 取 `init.signal`;若 init 显式带 `signal: null`,则清掉 Request 上的 signal。然后 `binding.gateway(gateway).run({ provider, endpoint, headers, query }, signal ? { signal } : {})`。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:140][E: packages/ai/src/api/cloudflare-gateway-binding.ts:141][E: packages/ai/test/cloudflare-gateway-binding.test.ts:161]
9. binding 返回的 `Response` **原样交回**,包括流式 body 与 gateway 日志头。测试用 `expect(response).toBe(bindingResponse)` 锁 identity。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:141][E: packages/ai/test/cloudflare-gateway-binding.test.ts:198]

测试里的路径拆分样例(同一 `baseUrl` + `gateway: "my-gateway"`):

| 请求 URL 后缀 | `provider` | `endpoint` |
|---|---|---|
| `/anthropic/v1/messages` | `anthropic` | `v1/messages` |
| `/openai/responses` | `openai` | `responses` |
| `/workers-ai/v1/chat/completions` | `workers-ai` | `v1/chat/completions` |
| `/openai/responses?beta=true` | `openai` | `responses?beta=true` |
| `/anthropic/../anthropic/v1/./messages` | `anthropic` | `v1/messages`(dot-segment 先规范化) |

[E: packages/ai/test/cloudflare-gateway-binding.test.ts:49][E: packages/ai/test/cloudflare-gateway-binding.test.ts:67][E: packages/ai/test/cloudflare-gateway-binding.test.ts:248]

`baseUrl/../other-gateway/...` 虽然原始字符串以 prefix 开头,规范化后会落在前缀外,被拒绝。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:252]

## Auth sentinel 与 HTTPS auth 的边界

HTTPS `cloudflare-ai-gateway` 认证:`cloudflareAIGatewayAuth().resolve()` 需要 `CLOUDFLARE_API_KEY`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_GATEWAY_ID` 三者齐备,否则返回 `undefined`。[E: packages/ai/src/providers/cloudflare-auth.ts:42][E: packages/ai/src/providers/cloudflare-auth.ts:88] 成功时写出:

- `cf-aig-authorization: Bearer ${resolved.apiKey}`
- `Authorization: null`
- `x-api-key: null`

[E: packages/ai/src/providers/cloudflare-auth.ts:93] null 是为了删掉 SDK 占位 `Authorization` / `x-api-key`,避免 gateway 把它们当成覆盖 stored key 的 BYOK。[E: packages/ai/src/providers/cloudflare-auth.ts:94][E: packages/ai/test/cloudflare-gateway-binding.test.ts:289][I]

Binding 路径复用同一 header 形状,但 Bearer 换成 sentinel。shim 剥离 `cf-aig-authorization` 后,测试中的 OpenAI Completions `streamSimple(..., { headers: { "cf-aig-authorization": Bearer sentinel, Authorization: null, "x-api-key": null }, fetch })` 到达 `run()` 的 headers 不含 `authorization` / `x-api-key` / `cf-aig-authorization`。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:314][E: packages/ai/test/cloudflare-gateway-binding.test.ts:328]

如果调用方 **确实** 在 binding 请求上放了非空 `x-api-key`,它会进入 `run()`:测试断言该 header 仍在 binding entry 上。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:125] 这与 “无需 API token” 不矛盾:无需的是 **Cloudflare 账户 API token**;provider BYOK 仍可选择传入。

`compat.ts` 的 `hasResolvedCloudflareAuth()` 把显式 `apiKey` 或字符串型 `headers["cf-aig-authorization"]` 视为已解析 Cloudflare auth;sentinel header 因此也能让 compat 层认为 auth 已满足。[E: packages/ai/src/compat.ts:232]

`cloudflareStreams()` 只做 URL 占位符替换(`{CLOUDFLARE_ACCOUNT_ID}` / `{CLOUDFLARE_GATEWAY_ID}`),不选择 fetch 实现。[E: packages/ai/src/providers/cloudflare-stream.ts:11][E: packages/ai/src/providers/cloudflare-stream.ts:21] 选 binding 还是 HTTPS,是每个 client 自己把 `fetch` / headers 配好的责任;shim 对前缀外 URL 直接 throw。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:99][E: packages/ai/src/types.ts:130]

## 设计动机与权衡

拒绝而不是 passthrough:前缀外 URL 抛 `outside the configured gateway prefix`;前缀内但非 POST/非 JSON 抛 `cannot express ... as a universal gateway request`,并写明改走带 gateway auth 的 HTTPS。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:100][E: packages/ai/src/api/cloudflare-gateway-binding.ts:111][E: packages/ai/test/cloudflare-gateway-binding.test.ts:219]

用 `new URL()` 规范化再拆 provider/endpoint,避免 `../` 这类词法变体和 HTTPS 实际 wire path 不一致。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:84][E: packages/ai/test/cloudflare-gateway-binding.test.ts:238]

不引入 `@cloudflare/workers-types`,让 Node 测试与非 Workers bundler 都能编译这个模块;本文件只用 structural interface。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:29][I]

## Gotcha

- `options.gateway` 与 `baseUrl` 最后一段是否同名 **没有** runtime check。配错时,前缀匹配仍按 `baseUrl` 走,`run()` 却打到另一个 gateway id。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:66][E: packages/ai/src/api/cloudflare-gateway-binding.ts:80][E: packages/ai/src/api/cloudflare-gateway-binding.ts:84]
- 只支持 POST + JSON。GET、缺 body、`not json`、只有 `/anthropic` 这种缺 endpoint 的 path,全部 throw,`run()` 次数为 0。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:203]
- 一次性 stream body 会被 JSON probe 消费掉;非 JSON stream 拒绝后不会 replay。[E: packages/ai/src/api/cloudflare-gateway-binding.ts:159][E: packages/ai/test/cloudflare-gateway-binding.test.ts:258]
- `init.headers` 整表替换 Request headers,不是 merge。[E: packages/ai/test/cloudflare-gateway-binding.test.ts:83]
- `pi-coding-agent` 源码没有引用 `createGatewayBindingFetch`。CHANGELOG 写 “inherited”,本仓库看不到 coding-agent 再导出或自动装配。[E: packages/coding-agent/CHANGELOG.md:26][U]
- “无需 API token” 仅适用于 **调用方已经在 Worker 里持有 `env.AI` binding** 且自行注入这个 fetch。默认 `cloudflare-ai-gateway` provider 仍走 HTTPS + `CLOUDFLARE_API_KEY`。[E: packages/ai/src/providers/cloudflare-auth.ts:42][E: packages/ai/src/providers/cloudflare-ai-gateway.ts:15]

## 跨包边界

[subsys.ai.auth-resolution](auth-resolution.md) / [surface.providers.auth](../../surface/providers/auth.md) 覆盖 `cloudflareAIGatewayAuth()` 如何从 credential / env 解析出真实 API key。binding shim 不参与 `resolveProviderAuth()`。

[subsys.ai.openai-completions](openai-completions.md)、[subsys.ai.openai-responses](openai-responses.md)、[subsys.ai.anthropic-messages](anthropic-messages.md) 是被这个 fetch 替换运输的三条 wire。它们继续发自己的 HTTPS 形状 URL;shim 只改运输。`getClientApiKey()` / `assertRequestAuth()` 把 `cf-aig-authorization` 当成 “已有 auth”,于是 sentinel 能让 SDK 用 `"unused"` placeholder key 继续构造请求。[E: packages/ai/src/api/openai-completions.ts:75][E: packages/ai/src/api/anthropic-messages.ts:298]

[subsys.ai.provider-registry](provider-registry.md) 的 `cloudflareAIGatewayProvider()` 仍是 HTTPS catalog provider。本节点不增加新的 builtin provider id。

## Sources

- packages/ai/src/api/cloudflare-gateway-binding.ts
- packages/ai/test/cloudflare-gateway-binding.test.ts
- packages/ai/src/providers/cloudflare-auth.ts
- packages/ai/src/providers/cloudflare-ai-gateway.ts
- packages/ai/src/providers/cloudflare-stream.ts
- packages/ai/src/api/cloudflare.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/compat.ts
- packages/ai/src/types.ts
- packages/ai/package.json
- packages/coding-agent/CHANGELOG.md

## 相关

- [subsys.ai.auth-resolution](auth-resolution.md): HTTPS 路径上 Cloudflare API key / env 的解析顺序。
- [subsys.ai.openai-completions](openai-completions.md): Completions wire;`cf-aig-authorization` 使 client 使用 `"unused"` API key。
- [subsys.ai.openai-responses](openai-responses.md): Responses wire,同一 header 认证缺口。
- [subsys.ai.anthropic-messages](anthropic-messages.md): Anthropic wire;`assertRequestAuth()` 接受 `cf-aig-authorization`。
- [subsys.ai.provider-registry](provider-registry.md): `cloudflareAIGatewayProvider()` 仍是 HTTPS builtin provider。
- [surface.providers.auth](../../surface/providers/auth.md): 用户可见的 Cloudflare 登录 / env 入口。
