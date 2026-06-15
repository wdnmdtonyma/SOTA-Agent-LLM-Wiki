---
id: session-v2.model-resolution
title: Runner 模型解析(catalog→route)
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/runner/model.ts, packages/core/src/catalog.ts, packages/core/src/model.ts, packages/core/src/provider.ts, packages/core/src/model-request.ts, specs/v2/provider-model.md, specs/v2/provider-policy.md, CONTEXT.md]
symbols: [SessionRunnerModel, SessionRunnerModel.resolve, fromCatalogModel, withDefaults, withVariant, supported]
related: [model-layer.model-catalog-v2, model-layer.llm-protocols]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V2 runner model resolution 把 Location catalog 中的 `ModelV2.Info` 解析成 `@opencode-ai/llm` `Model`,并在当前实现中只支持 OpenAI、Anthropic、OpenAI-compatible-with-url 三类 AI SDK-shaped catalog model。

## 能回答的问题
- `SessionRunner` 没有 explicit model 时怎样选默认模型?
- `ModelV2.Info.api` 当前支持哪些 package 到 native route 的映射?
- API key、headers、body、generation、provider options 和 limits 怎样进入 route defaults?
- Session model variant 在哪里 overlay 到 request?
- provider policy 与 model availability 在 model resolution 前在哪里生效?

## 职责边界

`SessionRunnerModel` 不是 catalog store。它读取 `Catalog.Service`,等待 `PluginBoot.Service`,有 explicit session model 时直接取该 catalog model;没有 explicit model 时选择 supported default 或 first supported available model,再通过 `fromCatalogModel(...)` 进入具体 route branch。[E: packages/core/src/session/runner/model.ts:132][E: packages/core/src/session/runner/model.ts:137][E: packages/core/src/session/runner/model.ts:139][E: packages/core/src/session/runner/model.ts:140][E: packages/core/src/session/runner/model.ts:141][E: packages/core/src/session/runner/model.ts:143][E: packages/core/src/session/runner/model.ts:120][E: packages/core/src/session/runner/model.ts:91][E: packages/core/src/session/runner/model.ts:98][E: packages/core/src/session/runner/model.ts:105] Catalog 的 provider/model transform、policy filtering、credential projection 由 `Catalog.layer` 负责。[E: packages/core/src/catalog.ts:205][E: packages/core/src/catalog.ts:207][E: packages/core/src/catalog.ts:208][E: packages/core/src/catalog.ts:209][E: packages/core/src/catalog.ts:106][E: packages/core/src/catalog.ts:234]

## 数据模型

| 实体 | 字段/方法 | 含义 |
|---|---|---|
| `ModelV2.Ref` | `id`, `providerID`, optional `variant` | Session 选择的模型引用。[E: packages/core/src/model.ts:38][E: packages/core/src/model.ts:39][E: packages/core/src/model.ts:40] |
| `ModelV2.Info` | `api`, `request`, `variants`, `limit`, `enabled` | Catalog 中的完整 model record。[E: packages/core/src/model.ts:56][E: packages/core/src/model.ts:61][E: packages/core/src/model.ts:63][E: packages/core/src/model.ts:67][E: packages/core/src/model.ts:76][E: packages/core/src/model.ts:77] |
| `ProviderV2.Info` | `enabled`, `api`, `request` | Provider availability、auth source 和 provider-level request defaults。[E: packages/core/src/provider.ts:48][E: packages/core/src/provider.ts:51][E: packages/core/src/provider.ts:67][E: packages/core/src/provider.ts:68] |
| `ModelRequest.Request` | `headers`, `body`, `generation`, `options` | Request knobs split into HTTP body, generation controls and provider-semantic options。[E: packages/core/src/model-request.ts:18][E: packages/core/src/model-request.ts:19][E: packages/core/src/model-request.ts:20][E: packages/core/src/model-request.ts:25] |

`Catalog.model.available()` 要求 provider not disabled 且 model enabled,所以 runner fallback selection 只看 usable models。[E: packages/core/src/catalog.ts:272]

## 控制流

1. `SessionRunnerModel.locationLayer@packages/core/src/session/runner/model.ts:129` 构造 Location-scoped resolver,读取 `Catalog.Service` 与 `PluginBoot.Service`。[E: packages/core/src/session/runner/model.ts:129][E: packages/core/src/session/runner/model.ts:132][E: packages/core/src/session/runner/model.ts:133]
2. `resolve@packages/core/src/session/runner/model.ts:135` 首先 `boot.wait()`,然后再选模型;Location plugins populate/filter catalog 的因果来自 plugin boot sequencing、catalog location dependencies 与 catalog transform/filter path 的组合推断。[E: packages/core/src/session/runner/model.ts:137][E: packages/core/src/catalog.ts:95][E: packages/core/src/catalog.ts:216][E: packages/core/src/catalog.ts:220][E: packages/core/src/catalog.ts:223][I]
3. 如果 session 有 explicit `session.model`,resolver 调 `catalog.model.get(providerID, id)`;没有 explicit model 时,先取 `catalog.model.default()` 并过滤 `supported`,否则在 `catalog.model.available()` 中找第一个 supported model。[E: packages/core/src/session/runner/model.ts:138][E: packages/core/src/session/runner/model.ts:139][E: packages/core/src/session/runner/model.ts:140][E: packages/core/src/session/runner/model.ts:141]
4. 没有 selected model 时,返回 `ModelNotSelectedError({ sessionID })`。[E: packages/core/src/session/runner/model.ts:142]
5. 选中 model 后,resolver 读取 provider record,调用 `resolve(session, selected, provider)`。[E: packages/core/src/session/runner/model.ts:143]
6. `resolve@packages/core/src/session/runner/model.ts:119` 先调用 `withVariant(model, session.model?.variant)`,再进入 `fromCatalogModel`。[E: packages/core/src/session/runner/model.ts:120]
7. `withVariant@packages/core/src/session/runner/model.ts:72` 把 `variantID === "default"` 或 undefined 解释为 model.request.variant;如果找到 variant,用 `ModelRequest.assign(draft.request, variant)` overlay request fields。[E: packages/core/src/session/runner/model.ts:73][E: packages/core/src/session/runner/model.ts:74][E: packages/core/src/session/runner/model.ts:77][E: packages/core/src/model-request.ts:100][E: packages/core/src/model-request.ts:101][E: packages/core/src/model-request.ts:102][E: packages/core/src/model-request.ts:103]
8. `apiKey@packages/core/src/session/runner/model.ts:48` 优先读取 `model.request.body.apiKey`,其次读取 `model.api.settings?.apiKey`,否则当 provider enabled via env 时返回 `Auth.config(provider.enabled.name)`。[E: packages/core/src/session/runner/model.ts:49][E: packages/core/src/session/runner/model.ts:51]
9. `withDefaults@packages/core/src/session/runner/model.ts:54` 从 catalog model 写 route defaults:provider 来自 `model.providerID`,endpoint baseURL 来自 `model.api.url`,request 贡献 headers/generation/body;non-empty `request.options` 在 package namespace 存在时进入 `providerOptions`;limit 贡献 context/output caps。[E: packages/core/src/session/runner/model.ts:62][E: packages/core/src/session/runner/model.ts:63][E: packages/core/src/session/runner/model.ts:64][E: packages/core/src/session/runner/model.ts:65][E: packages/core/src/session/runner/model.ts:66][E: packages/core/src/session/runner/model.ts:67][E: packages/core/src/session/runner/model.ts:68]
10. `withDefaults` 会从 HTTP body 中移除 `apiKey`,避免把 secret 留在 request body defaults。[E: packages/core/src/session/runner/model.ts:58][E: packages/core/src/session/runner/model.ts:59][E: packages/core/src/session/runner/model.ts:60]
11. `fromCatalogModel` 当前 OpenAI branch 只匹配 `model.api.type === "aisdk"` 且 package 为 `@ai-sdk/openai`,映射到 `OpenAIResponses.route` 与 bearer auth。[E: packages/core/src/session/runner/model.ts:89][E: packages/core/src/session/runner/model.ts:91][E: packages/core/src/session/runner/model.ts:92]
12. Anthropic branch 匹配 `@ai-sdk/anthropic`,映射到 `AnthropicMessages.route` 与 `x-api-key` header auth。[E: packages/core/src/session/runner/model.ts:96][E: packages/core/src/session/runner/model.ts:98][E: packages/core/src/session/runner/model.ts:99]
13. OpenAI-compatible branch 匹配 `@ai-sdk/openai-compatible` 且 `model.api.url` 存在,映射到 `OpenAICompatibleChat.route` 与 bearer auth。[E: packages/core/src/session/runner/model.ts:103][E: packages/core/src/session/runner/model.ts:105][E: packages/core/src/session/runner/model.ts:106]
14. 其它 API 组合返回 `UnsupportedApiError`,payload 包含 providerID、modelID、api name。[E: packages/core/src/session/runner/model.ts:111][E: packages/core/src/session/runner/model.ts:112][E: packages/core/src/session/runner/model.ts:113][E: packages/core/src/session/runner/model.ts:114]
15. `supported@packages/core/src/session/runner/model.ts:122` 与 fallback selection 使用同一 narrowing:只支持 `aisdk` + OpenAI/OpenAI-compatible-with-url/Anthropic。[E: packages/core/src/session/runner/model.ts:123][E: packages/core/src/session/runner/model.ts:124][E: packages/core/src/session/runner/model.ts:125][E: packages/core/src/session/runner/model.ts:126][E: packages/core/src/session/runner/model.ts:140][E: packages/core/src/session/runner/model.ts:141]

## Catalog 与 policy 前置

Catalog `finalize` 会在非 `plugin.added` reason 时触发 `catalog.transform` plugin hook,然后如果 policy service 有 statements,对每个 provider evaluate `provider.use`;结果 deny 时从 catalog draft 移除 provider。[E: packages/core/src/catalog.ts:205][E: packages/core/src/catalog.ts:206][E: packages/core/src/catalog.ts:207][E: packages/core/src/catalog.ts:208][E: packages/core/src/catalog.ts:209] provider-policy spec 也要求先 assemble provider/model catalog entries 与 overrides,再 evaluate `provider.use`。[E: specs/v2/provider-policy.md:237][E: specs/v2/provider-policy.md:241][E: specs/v2/provider-policy.md:242][E: specs/v2/provider-policy.md:243]

Catalog credential projection happens through both provider and resolved model paths: `project(...)` writes credential-derived `body.apiKey`/oauth access token onto provider request body,while model resolution merges provider request into model request before runner sees `model.request.body.apiKey`。[E: packages/core/src/catalog.ts:106][E: packages/core/src/catalog.ts:107][E: packages/core/src/catalog.ts:110][E: packages/core/src/catalog.ts:114][E: packages/core/src/catalog.ts:128][E: packages/core/src/catalog.ts:254][E: packages/core/src/catalog.ts:263]

## 设计动机与权衡

- provider/model spec 说明 first local V2 runner 要等待 Location plugin boot,explicit session model 不 silent fallback,无 explicit model 时用 supported default 或第一 available supported model;当前实现正是这条路径。[E: specs/v2/provider-model.md:270][E: packages/core/src/session/runner/model.ts:137][E: packages/core/src/session/runner/model.ts:139][E: packages/core/src/session/runner/model.ts:140][E: packages/core/src/session/runner/model.ts:141]
- 当前代码实现的 adaptation surface 比 spec 文本里的 native endpoint list 更窄:spec 列出 native `openai/responses`、`openai/completions`、`anthropic/messages` 等,但 `fromCatalogModel` 只匹配 `api.type === "aisdk"` branches。[E: specs/v2/provider-model.md:273][E: specs/v2/provider-model.md:274][E: specs/v2/provider-model.md:275][E: specs/v2/provider-model.md:276][E: packages/core/src/session/runner/model.ts:89][E: packages/core/src/session/runner/model.ts:96][E: packages/core/src/session/runner/model.ts:103][I]
- model request settings 在 Catalog 域中保持 provider-semantic,runner 只把它们放进 route defaults;wire encoding 属于 LLM protocol adapter。[E: CONTEXT.md:100][E: packages/core/src/session/runner/model.ts:64][E: packages/core/src/session/runner/model.ts:65][E: packages/core/src/session/runner/model.ts:66][E: packages/core/src/session/runner/model.ts:67]

## gotcha

- `UnsupportedApiError` 的 schema field 名叫 `api`,实现里的 `apiName` 对 `aisdk` 返回 `aisdk:<package>`;当前代码没有 `UnsupportedEndpointError` class。[E: packages/core/src/session/runner/model.ts:29][E: packages/core/src/session/runner/model.ts:82][I]
- `provider.enabled` 在当前 `ProviderV2.Info` 中支持 `{ via: "credential" }`,而较早 spec 片段写的是 `{ via: "account" }`;本节点以源码为准。[E: packages/core/src/provider.ts:58][E: specs/v2/provider-model.md:84]
- OpenAI-compatible 需要 resolved `model.api.url`:Catalog resolution can inherit provider-level AISDK URL into a model without model-local URL;fallback `supported` checks `!== undefined`,while `fromCatalogModel` requires truthy `model.api.url`。[E: packages/core/src/catalog.ts:122][E: packages/core/src/catalog.ts:123][E: packages/core/src/session/runner/model.ts:103][E: packages/core/src/session/runner/model.ts:126]

## Sources
- packages/core/src/session/runner/model.ts
- packages/core/src/catalog.ts
- packages/core/src/model.ts
- packages/core/src/provider.ts
- packages/core/src/model-request.ts
- specs/v2/provider-model.md
- specs/v2/provider-policy.md
- CONTEXT.md

## 相关
- [model-layer.model-catalog-v2](../model-layer/model-catalog-v2.md)
- [model-layer.llm-protocols](../model-layer/llm-protocols.md)
