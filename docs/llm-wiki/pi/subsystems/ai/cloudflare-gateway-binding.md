---
id: subsys.ai.cloudflare-gateway-binding
title: Cloudflare Workers AI binding fetch
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/cloudflare-ai-binding.ts
  - packages/ai/test/cloudflare-ai-binding.test.ts
  - packages/ai/src/providers/cloudflare-auth.ts
  - packages/ai/src/providers/cloudflare-ai-gateway.ts
  - packages/ai/src/api/cloudflare.ts
  - packages/ai/scripts/generate-models.ts
symbols:
  - createAiBindingFetch
  - CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL
  - AiBinding
related:
  - subsys.ai.auth-resolution
  - subsys.ai.openai-completions
  - subsys.ai.openai-responses
  - subsys.ai.anthropic-messages
  - subsys.ai.provider-registry
  - surface.providers.auth
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.ai.cloudflare-gateway-binding` 覆盖 `createAiBindingFetch(binding)`:一个把请求原样交给 Workers AI binding `env.AI.fetch()` 的 `FetchFunction`。它不再把 HTTPS gateway URL 翻译成 `gateway().run()`。节点 id 保留旧名,实现文件是 `cloudflare-ai-binding.ts`。

## 能回答的问题

- `createAiBindingFetch()` 对 URL / method / headers / body 做什么?
- 为什么还要传 `cf-aig-authorization: Bearer cloudflare-gateway-binding`?
- 缺 `fetch()` 的 binding 在什么时候失败?
- 这个 shim 和 `cloudflareAIGatewayAuth()` / `cloudflare-ai-gateway` provider 的边界在哪?
- `pi-ai` 默认入口会不会导出或自动装配这个 fetch?
- `cloudflare-ai-gateway` catalog 如何写入 `workers-ai/*` Completions passthrough?

## 职责边界

pi 的 Cloudflare AI Gateway **默认运输仍是 HTTPS**:`gateway.ai.cloudflare.com/v1/{account}/{gateway}/{provider}/...`(常量在 `api/cloudflare.ts`)。那条路需要 Cloudflare API token,即使调用方已经是同一 account 里的 Worker。[E: packages/ai/src/api/cloudflare.ts:6][E: packages/ai/src/api/cloudflare.ts:10][E: packages/ai/src/api/cloudflare.ts:14]

`createAiBindingFetch(binding)` 返回的是 **plain binding fetch**:构造时检查 `binding.fetch` 是函数,然后 `bind` 后原样转发 `(input, init)`。注释写明 method、headers、query string 与 body stream 都不改写、不缓冲、不重编码。[E: packages/ai/src/api/cloudflare-ai-binding.ts:80][E: packages/ai/src/api/cloudflare-ai-binding.ts:83][E: packages/ai/src/api/cloudflare-ai-binding.ts:88][E: packages/ai/src/api/cloudflare-ai-binding.ts:89] 旧符号 `createGatewayBindingFetch` / `GatewayBindingFetchOptions` / `AiGatewayBinding` / `gateway().run()` 翻译层已删除。

本模块不依赖 `@cloudflare/workers-types`。[I] `AiBinding` 是 structural type:`aiGatewayLogId: string | null` 用来钉住真实 `Ai` binding;`fetch` 标成 optional,因为已发布的 `Ai` 类型还没声明它。[E: packages/ai/src/api/cloudflare-ai-binding.ts:42][E: packages/ai/src/api/cloudflare-ai-binding.ts:43][E: packages/ai/src/api/cloudflare-ai-binding.ts:44]

`createAiBindingFetch` **不** 出现在 `packages/ai/src/index.ts`。调用方从 `@earendil-works/pi-ai/api/cloudflare-ai-binding`(`package.json` 的 `./api/*` export)自行 import,再把它塞进 `ProviderRequestOptions.fetch`。[E: packages/ai/package.json:26][E: packages/ai/src/types.ts:134] `cloudflare-ai-gateway` provider 与 `cloudflareAIGatewayAuth()` 都不引用这个模块。[E: packages/ai/src/providers/cloudflare-ai-gateway.ts:11][E: packages/ai/src/providers/cloudflare-auth.ts:74]

模块注释声称 binding 调用 “pre-authenticated in-account”,本仓库测试只用 fake `binding.fetch()`,没有 Cloudflare Workers runtime 证明。[E: packages/ai/test/cloudflare-ai-binding.test.ts:15][U]

## 关键文件

- `packages/ai/src/api/cloudflare-ai-binding.ts`:权威实现 `createAiBindingFetch`、sentinel、`AiBinding` 与构造期 `fetch()` 检查。[E: packages/ai/src/api/cloudflare-ai-binding.ts:57][E: packages/ai/src/api/cloudflare-ai-binding.ts:80]
- `packages/ai/test/cloudflare-ai-binding.test.ts`:passthrough identity、构造期拒绝、OpenAI Completions SDK 的 null-auth 组合。[E: packages/ai/test/cloudflare-ai-binding.test.ts:25][E: packages/ai/test/cloudflare-ai-binding.test.ts:63][E: packages/ai/test/cloudflare-ai-binding.test.ts:69]
- `packages/ai/src/api/cloudflare.ts`:Workers AI 与 AI Gateway 的 HTTPS base URL 模板。binding 路径注释指向 `https://workers-binding.ai/ai-gateway/gateways/{gateway}/{provider}/...`,由调用方写进 model `baseUrl`,shim 不再改 URL。[E: packages/ai/src/api/cloudflare.ts:6][E: packages/ai/src/api/cloudflare-ai-binding.ts:80]
- `packages/ai/src/providers/cloudflare-auth.ts`:`cloudflareAIGatewayAuth()` 仍解析 `CLOUDFLARE_API_KEY` + account + gateway id,并写出真实 `cf-aig-authorization: Bearer ${apiKey}`。这是 HTTPS token 路径,不是 binding sentinel 路径。[E: packages/ai/src/providers/cloudflare-auth.ts:74][E: packages/ai/src/providers/cloudflare-auth.ts:88][E: packages/ai/src/providers/cloudflare-auth.ts:93]
- `packages/ai/src/providers/cloudflare-ai-gateway.ts`:把 Anthropic / OpenAI Completions / OpenAI Responses 三条 wire 包进 `cloudflareStreams()`,用 resolved env 替换 URL 占位符。[E: packages/ai/src/providers/cloudflare-ai-gateway.ts:11][E: packages/ai/src/providers/cloudflare-ai-gateway.ts:22]
- `packages/ai/scripts/generate-models.ts`: `cloudflare-ai-gateway` catalog 把 `workers-ai` upstream 写成 `openai-completions` + `workers-ai/${modelId}`,并在 models.dev 漏列时从 Workers AI catalog 镜像补行。[E: packages/ai/scripts/generate-models.ts:1796][E: packages/ai/scripts/generate-models.ts:1841]

## 数据模型

`createAiBindingFetch` 只收一个 `AiBinding`,没有 `baseUrl` / `gateway` 选项。[E: packages/ai/src/api/cloudflare-ai-binding.ts:80]

| 字段 | 含义 |
|---|---|
| `aiGatewayLogId` | 钉住 `Ai` binding 的 unique member,避免误收任意 `{ fetch }` 对象 |
| `fetch?` | 运行时必有;类型上 optional,构造时检查 |

[E: packages/ai/src/api/cloudflare-ai-binding.ts:43][E: packages/ai/src/api/cloudflare-ai-binding.ts:44]

`CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL` 字面量仍是 `"cloudflare-gateway-binding"`。[E: packages/ai/src/api/cloudflare-ai-binding.ts:57] 它不是 Cloudflare 平台 token。Completions 的 `getClientApiKey()` 认 `apiKey`、`authorization` 或 `cf-aig-authorization`;单独的 `x-api-key` 会抛 `No API key`。三 header 列表(含 `x-api-key`)是 Anthropic `assertRequestAuth()` 的规则。调用方传 `cf-aig-authorization: Bearer ${CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL}` 只为过 SDK 这道检查。shim **不再剥离** 任何 header;gateway 自己在 binding 路径上忽略/剥离 `cf-aig-authorization`。[E: packages/ai/src/api/cloudflare-ai-binding.ts:57][E: packages/ai/src/api/openai-completions.ts:78][E: packages/ai/src/api/anthropic-messages.ts:303][E: packages/ai/test/cloudflare-ai-binding.test.ts:55]

## 控制流

1. `createAiBindingFetch@cloudflare-ai-binding.ts:80` 若 `typeof binding.fetch !== "function"`,立刻 `throw new TypeError("createAiBindingFetch: the AI binding does not expose fetch()")`。失败发生在构造期,不是第一次推理请求。[E: packages/ai/src/api/cloudflare-ai-binding.ts:83][E: packages/ai/src/api/cloudflare-ai-binding.ts:84][E: packages/ai/test/cloudflare-ai-binding.test.ts:66]
2. 通过检查后 `const bindingFetch = binding.fetch.bind(binding)`,再返回 `(input, init) => bindingFetch(input, init)`。`bind` 是因为 `fetch` 是可变属性,narrowing 进不了闭包。[E: packages/ai/src/api/cloudflare-ai-binding.ts:88][E: packages/ai/src/api/cloudflare-ai-binding.ts:89]
3. 返回的 `Response` **原样交回**,包括流式 body 与 gateway 日志头。测试用 `expect(response).toBe(bindingResponse)` 锁 identity,并断言请求 URL / method / headers / body 与调用方传入的一致。[E: packages/ai/test/cloudflare-ai-binding.test.ts:50][E: packages/ai/test/cloudflare-ai-binding.test.ts:58][E: packages/ai/test/cloudflare-ai-binding.test.ts:59]

测试里的样例 URL(调用方自己写 `baseUrl`,shim 不拆 provider/endpoint):

| 请求 URL | 到达 `binding.fetch` 的 URL |
|---|---|
| `https://workers-binding.ai/ai-gateway/gateways/my-gateway/anthropic/v1/messages?beta=true` | 原样 |
| `https://workers-binding.ai/ai-gateway/gateways/my-gateway/openai/chat/completions`(Completions SDK 拼出) | 原样 |

[E: packages/ai/test/cloudflare-ai-binding.test.ts:10][E: packages/ai/test/cloudflare-ai-binding.test.ts:50][E: packages/ai/test/cloudflare-ai-binding.test.ts:105]

## Auth sentinel 与 HTTPS auth 的边界

HTTPS `cloudflare-ai-gateway` 认证:`cloudflareAIGatewayAuth().resolve()` 需要 `CLOUDFLARE_API_KEY`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_GATEWAY_ID` 三者齐备,否则返回 `undefined`。[E: packages/ai/src/providers/cloudflare-auth.ts:42][E: packages/ai/src/providers/cloudflare-auth.ts:88] 成功时写出:

- `cf-aig-authorization: Bearer ${resolved.apiKey}`
- `Authorization: null`
- `x-api-key: null`

[E: packages/ai/src/providers/cloudflare-auth.ts:93] null 是为了删掉 SDK 占位 `Authorization` / `x-api-key`,避免 gateway 把它们当成覆盖 stored key 的 BYOK。[E: packages/ai/src/providers/cloudflare-auth.ts:94][I]

Binding 路径复用同一 header 形状,但 Bearer 换成 sentinel。shim 不再剥 header;Completions 测试里 `streamSimple(..., { headers: { "cf-aig-authorization": Bearer sentinel, Authorization: null, "x-api-key": null }, fetch })` 到达 binding 的 headers **不含** `authorization` / `x-api-key`(SDK 因 null 删掉占位),但 **仍含** sentinel `cf-aig-authorization`。[E: packages/ai/test/cloudflare-ai-binding.test.ts:55][E: packages/ai/test/cloudflare-ai-binding.test.ts:107][E: packages/ai/test/cloudflare-ai-binding.test.ts:108]

`compat.ts` 的 `hasResolvedCloudflareAuth()` 把显式 `apiKey` 或字符串型 `headers["cf-aig-authorization"]` 视为已解析 Cloudflare auth;sentinel header 因此也能让 compat 层认为 auth 已满足。[E: packages/ai/src/compat.ts:232]

`cloudflareStreams()` 只做 URL 占位符替换(`{CLOUDFLARE_ACCOUNT_ID}` / `{CLOUDFLARE_GATEWAY_ID}`),不选择 fetch 实现。[E: packages/ai/src/providers/cloudflare-stream.ts:11][E: packages/ai/src/providers/cloudflare-stream.ts:21] 选 binding 还是 HTTPS,是每个 client 自己把 `fetch` / headers / `baseUrl` 配好的责任。

## 设计动机与权衡

不再翻译 URL:旧 `createGatewayBindingFetch` 只支持 POST + JSON,并把 HTTPS prefix 拆成 `gateway().run({ provider, endpoint, query })`。现行 binding `fetch` 已能吃与 HTTPS 同形的 workers-binding URL,所以 shim 只做类型与构造期检查。[E: packages/ai/src/api/cloudflare-ai-binding.ts:80][E: packages/ai/CHANGELOG.md:29]

不引入 `@cloudflare/workers-types`,让 Node 测试与非 Workers bundler 都能编译这个模块;本文件只用 structural interface。[E: packages/ai/src/api/cloudflare-ai-binding.ts:42][I]

## Gotcha

- 调用方必须把 model `baseUrl` 写成 binding 能服务的路由(文档示例:`https://workers-binding.ai/ai-gateway/gateways/${gateway}/anthropic`)。shim 不会把 `gateway.ai.cloudflare.com/...` 改写成 binding URL。[E: packages/ai/src/api/cloudflare-ai-binding.ts:80]
- 缺 `fetch()` 的对象在构造时 throw,不会在第一次请求才爆。[E: packages/ai/test/cloudflare-ai-binding.test.ts:66]
- `pi-coding-agent` 源码没有引用 `createAiBindingFetch`。CHANGELOG 仍写旧名 `createGatewayBindingFetch` “inherited”,本仓库看不到 coding-agent 再导出或自动装配。[E: packages/coding-agent/CHANGELOG.md:234][U]
- “无需 API token” 仅适用于 **调用方已经在 Worker 里持有 `env.AI` binding** 且自行注入这个 fetch。默认 `cloudflare-ai-gateway` provider 仍走 HTTPS + `CLOUDFLARE_API_KEY`。[E: packages/ai/src/providers/cloudflare-auth.ts:42][E: packages/ai/src/providers/cloudflare-ai-gateway.ts:19]

## 跨包边界

[subsys.ai.auth-resolution](auth-resolution.md) / [surface.providers.auth](../../surface/providers/auth.md) 覆盖 `cloudflareAIGatewayAuth()` 如何从 credential / env 解析出真实 API key。binding shim 不参与 `resolveProviderAuth()`。

[subsys.ai.openai-completions](openai-completions.md)、[subsys.ai.openai-responses](openai-responses.md)、[subsys.ai.anthropic-messages](anthropic-messages.md) 是被这个 fetch 替换运输的三条 wire。它们继续发自己的 HTTPS 形状 URL;shim 只改运输。`getClientApiKey()` / `assertRequestAuth()` 把 `cf-aig-authorization` 当成 “已有 auth”,于是 sentinel 能让 SDK 用 `"unused"` placeholder key 继续构造请求。[E: packages/ai/src/api/openai-completions.ts:78][E: packages/ai/src/api/anthropic-messages.ts:303]

[subsys.ai.provider-registry](provider-registry.md) 的 `cloudflareAIGatewayProvider()` 仍是 HTTPS catalog provider。本节点不增加新的 builtin provider id。

## Catalog `workers-ai/*` passthrough

`cloudflare-ai-gateway` 生成行按 upstream 分流:`openai` 用 Responses + OpenAI passthrough base;`anthropic` 用 Messages + Anthropic passthrough base;`workers-ai` 固定 `api: "openai-completions"`、`CLOUDFLARE_AI_GATEWAY_COMPAT_BASE_URL`,并把 id 写成 `workers-ai/${nativeId}`(prefixedId),compat 打开 `sendSessionAffinityHeaders`。[E: packages/ai/scripts/generate-models.ts:1788][E: packages/ai/scripts/generate-models.ts:1796][E: packages/ai/scripts/generate-models.ts:1798][E: packages/ai/scripts/generate-models.ts:1807]

models.dev 的 gateway 列表可能省略 Workers AI passthrough。生成器在 `data["cloudflare-workers-ai"].models` 上再扫一遍:`tool_call === true` 的模型写成 `workers-ai/${modelId}`,已存在则跳过,同样走 Completions + compat base。[E: packages/ai/scripts/generate-models.ts:1836][E: packages/ai/scripts/generate-models.ts:1841][E: packages/ai/scripts/generate-models.ts:1850]

具体 `workers-ai/*` 成员仍只在 gitignored JSON,本页只记录前缀规则,不枚举模型 [I]。

## Sources

- packages/ai/src/api/cloudflare-ai-binding.ts
- packages/ai/test/cloudflare-ai-binding.test.ts
- packages/ai/src/providers/cloudflare-auth.ts
- packages/ai/src/providers/cloudflare-ai-gateway.ts
- packages/ai/src/providers/cloudflare-stream.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/src/api/cloudflare.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/compat.ts
- packages/ai/src/types.ts
- packages/ai/package.json
- packages/ai/CHANGELOG.md
- packages/coding-agent/CHANGELOG.md

## 相关

- [subsys.ai.auth-resolution](auth-resolution.md): HTTPS 路径上 Cloudflare API key / env 的解析顺序。
- [subsys.ai.openai-completions](openai-completions.md): Completions wire;`cf-aig-authorization` 使 client 使用 `"unused"` API key。
- [subsys.ai.openai-responses](openai-responses.md): Responses wire,同一 header 认证缺口。
- [subsys.ai.anthropic-messages](anthropic-messages.md): Anthropic wire;`assertRequestAuth()` 接受 `cf-aig-authorization`。
- [subsys.ai.provider-registry](provider-registry.md): `cloudflareAIGatewayProvider()` 仍是 HTTPS builtin provider。
- [surface.providers.auth](../../surface/providers/auth.md): 用户可见的 Cloudflare 登录 / env 入口。
