---
id: session-v2.model-resolution
title: Runner 模型解析(catalog→route)
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/runner/model.ts, packages/core/src/catalog.ts, packages/core/src/credential.ts, packages/core/src/integration.ts, packages/core/src/integration/connection.ts, packages/core/src/model.ts, packages/core/src/provider.ts, packages/core/src/model-request.ts, specs/v2/provider-model.md, specs/v2/provider-policy.md, CONTEXT.md]
symbols: [SessionRunnerModel, SessionRunnerModel.resolve, fromCatalogModel, withDefaults, withVariant, apiKey, supported]
related: [model-layer.model-catalog-v2, model-layer.llm-protocols]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 runner model resolution 把 Location catalog 中的 `ModelV2.Info` 解析成 `@opencode-ai/llm` `Model`,并在当前实现中只支持 OpenAI、Anthropic、OpenAI-compatible-with-url 三类 AI SDK-shaped catalog model。

## 能回答的问题
- `SessionRunner` 没有 explicit model 时怎样选默认模型?
- `ModelV2.Info.api` 当前支持哪些 package 到 native route 的映射?
- API key、headers、body、generation、provider options 和 limits 怎样进入 route defaults?
- Session model variant 在哪里 overlay 到 request?
- provider policy、Integration connection 与 model availability 在 model resolution 前后在哪里生效?

## 职责边界

`SessionRunnerModel` 不是 catalog store。它读取 `Catalog.Service`、`Credential.Service`、`Integration.Service`,等待 `PluginBoot.Service`,有 explicit session model 时直接取该 catalog model;没有 explicit model 时选择 supported default 或 first supported available model。选中后 resolver 读取 provider 对应 Integration connection,credential connection 再读取 stored credential,然后通过 `fromCatalogModel(...)` 进入具体 route branch。[E: packages/core/src/session/runner/model.ts:144][E: packages/core/src/session/runner/model.ts:145][E: packages/core/src/session/runner/model.ts:146][E: packages/core/src/session/runner/model.ts:147][E: packages/core/src/session/runner/model.ts:151][E: packages/core/src/session/runner/model.ts:153][E: packages/core/src/session/runner/model.ts:154][E: packages/core/src/session/runner/model.ts:155][E: packages/core/src/session/runner/model.ts:157][E: packages/core/src/session/runner/model.ts:158][E: packages/core/src/session/runner/model.ts:161] Catalog 的 provider/model transform、policy filtering 与 Integration availability gate 由 `Catalog.layer` 负责。[E: packages/core/src/catalog.ts:190][E: packages/core/src/catalog.ts:193][E: packages/core/src/catalog.ts:194][E: packages/core/src/catalog.ts:207][E: packages/core/src/catalog.ts:208][E: packages/core/src/catalog.ts:226][E: packages/core/src/catalog.ts:227][E: packages/core/src/catalog.ts:229]

## 数据模型

| 实体 | 字段/方法 | 含义 |
|---|---|---|
| `ModelV2.Ref` | `id`, `providerID`, optional `variant` | Session 选择的模型引用。[E: packages/core/src/model.ts:38][E: packages/core/src/model.ts:39][E: packages/core/src/model.ts:40] |
| `ModelV2.Info` | `api`, `request`, `variants`, `limit`, `enabled` | Catalog 中的完整 model record。[E: packages/core/src/model.ts:56][E: packages/core/src/model.ts:61][E: packages/core/src/model.ts:63][E: packages/core/src/model.ts:67][E: packages/core/src/model.ts:76][E: packages/core/src/model.ts:77] |
| `ProviderV2.Info` | `disabled`, `api`, `request` | Provider availability gate 和 provider-level request defaults。[E: packages/core/src/provider.ts:47][E: packages/core/src/provider.ts:50][E: packages/core/src/provider.ts:51][E: packages/core/src/provider.ts:52] |
| `ModelRequest.Request` | `headers`, `body`, `generation`, `options` | Request knobs split into HTTP body, generation controls and provider-semantic options。[E: packages/core/src/model-request.ts:18][E: packages/core/src/model-request.ts:19][E: packages/core/src/model-request.ts:20][E: packages/core/src/model-request.ts:25] |

`Catalog.model.available()` 要求 provider available 且 model enabled,所以 runner fallback selection 只看 usable models。[E: packages/core/src/catalog.ts:257][E: packages/core/src/catalog.ts:258][E: packages/core/src/catalog.ts:259]

## 控制流

1. `SessionRunnerModel.locationLayer@packages/core/src/session/runner/model.ts:141` 构造 Location-scoped resolver,读取 `Catalog.Service`、`Credential.Service`、`Integration.Service` 与 `PluginBoot.Service`。[E: packages/core/src/session/runner/model.ts:141][E: packages/core/src/session/runner/model.ts:144][E: packages/core/src/session/runner/model.ts:145][E: packages/core/src/session/runner/model.ts:146][E: packages/core/src/session/runner/model.ts:147]
2. `resolve@packages/core/src/session/runner/model.ts:135` 首先 `boot.wait()`,然后再选模型;Location plugins populate/filter catalog 的因果来自 plugin boot sequencing、catalog location dependencies 与 catalog transform/filter path 的组合推断。[E: packages/core/src/session/runner/model.ts:151][E: packages/core/src/catalog.ts:89][E: packages/core/src/catalog.ts:201][E: packages/core/src/catalog.ts:205][E: packages/core/src/catalog.ts:208][I]
3. 如果 session 有 explicit `session.model`,resolver 调 `catalog.model.get(providerID, id)`;没有 explicit model 时,先取 `catalog.model.default()` 并过滤 `supported`,否则在 `catalog.model.available()` 中找第一个 supported model。[E: packages/core/src/session/runner/model.ts:152][E: packages/core/src/session/runner/model.ts:153][E: packages/core/src/session/runner/model.ts:154][E: packages/core/src/session/runner/model.ts:155]
4. 没有 selected model 时,返回 `ModelNotSelectedError({ sessionID })`。[E: packages/core/src/session/runner/model.ts:156]
5. 选中 model 后,resolver 用 providerID 读取 active Integration connection；credential connection 会按 connection id 读取 stored credential。[E: packages/core/src/session/runner/model.ts:157][E: packages/core/src/session/runner/model.ts:161]
6. standalone `resolve(session, model)` 是无 connection 的薄 helper；Location resolver 会先 `withVariant(selected, session.model?.variant)`,再把 connection/credential 传给 `fromCatalogModel`。[E: packages/core/src/session/runner/model.ts:131][E: packages/core/src/session/runner/model.ts:132][E: packages/core/src/session/runner/model.ts:158][E: packages/core/src/session/runner/model.ts:159][E: packages/core/src/session/runner/model.ts:160][E: packages/core/src/session/runner/model.ts:161]
7. `withVariant@packages/core/src/session/runner/model.ts:72` 把 `variantID === "default"` 或 undefined 解释为 model.request.variant;如果找到 variant,用 `ModelRequest.assign(draft.request, variant)` overlay request fields。[E: packages/core/src/session/runner/model.ts:78][E: packages/core/src/session/runner/model.ts:79][E: packages/core/src/session/runner/model.ts:82][E: packages/core/src/model-request.ts:100][E: packages/core/src/model-request.ts:101][E: packages/core/src/model-request.ts:102][E: packages/core/src/model-request.ts:103]
8. `fromCatalogModel` 会先把 credential metadata merge 到 request body,再解析 auth。[E: packages/core/src/session/runner/model.ts:94][E: packages/core/src/session/runner/model.ts:95][E: packages/core/src/session/runner/model.ts:98][E: packages/core/src/session/runner/model.ts:100]
9. `apiKey@packages/core/src/session/runner/model.ts:51` 的优先级是 credential key、credential oauth access、`model.request.body.apiKey` / `model.api.settings?.apiKey`,最后才是 env connection name。[E: packages/core/src/session/runner/model.ts:51][E: packages/core/src/session/runner/model.ts:52][E: packages/core/src/session/runner/model.ts:53][E: packages/core/src/session/runner/model.ts:54][E: packages/core/src/session/runner/model.ts:55][E: packages/core/src/session/runner/model.ts:56]
10. `withDefaults@packages/core/src/session/runner/model.ts:59` 从 catalog model 写 route defaults:provider 来自 `model.providerID`,endpoint baseURL 来自 `model.api.url`,request 贡献 headers/generation/body;non-empty `request.options` 在 package namespace 存在时进入 `providerOptions`;limit 贡献 context/output caps。[E: packages/core/src/session/runner/model.ts:67][E: packages/core/src/session/runner/model.ts:68][E: packages/core/src/session/runner/model.ts:69][E: packages/core/src/session/runner/model.ts:70][E: packages/core/src/session/runner/model.ts:71][E: packages/core/src/session/runner/model.ts:72][E: packages/core/src/session/runner/model.ts:73]
11. `withDefaults` 会从 HTTP body 中移除 `apiKey`,避免把 secret 留在 request body defaults。[E: packages/core/src/session/runner/model.ts:63][E: packages/core/src/session/runner/model.ts:64][E: packages/core/src/session/runner/model.ts:65]
12. `fromCatalogModel` 当前 OpenAI branch 只匹配 `model.api.type === "aisdk"` 且 package 为 `@ai-sdk/openai`,映射到 `OpenAIResponses.route` 与 bearer auth。[E: packages/core/src/session/runner/model.ts:101][E: packages/core/src/session/runner/model.ts:103][E: packages/core/src/session/runner/model.ts:104][E: packages/core/src/session/runner/model.ts:105]
13. Anthropic branch 匹配 `@ai-sdk/anthropic`,映射到 `AnthropicMessages.route` 与 `x-api-key` header auth。[E: packages/core/src/session/runner/model.ts:108][E: packages/core/src/session/runner/model.ts:110][E: packages/core/src/session/runner/model.ts:111][E: packages/core/src/session/runner/model.ts:112]
14. OpenAI-compatible branch 匹配 `@ai-sdk/openai-compatible` 且 `model.api.url` 存在,映射到 `OpenAICompatibleChat.route` 与 bearer auth。[E: packages/core/src/session/runner/model.ts:115][E: packages/core/src/session/runner/model.ts:117][E: packages/core/src/session/runner/model.ts:118][E: packages/core/src/session/runner/model.ts:119]
15. 其它 API 组合返回 `UnsupportedApiError`,payload 包含 providerID、modelID、api name。[E: packages/core/src/session/runner/model.ts:122][E: packages/core/src/session/runner/model.ts:123][E: packages/core/src/session/runner/model.ts:124][E: packages/core/src/session/runner/model.ts:125][E: packages/core/src/session/runner/model.ts:126]
16. `supported@packages/core/src/session/runner/model.ts:134` 与 fallback selection 使用同一 narrowing:只支持 `aisdk` + OpenAI/OpenAI-compatible-with-url/Anthropic。[E: packages/core/src/session/runner/model.ts:134][E: packages/core/src/session/runner/model.ts:135][E: packages/core/src/session/runner/model.ts:136][E: packages/core/src/session/runner/model.ts:137][E: packages/core/src/session/runner/model.ts:138][E: packages/core/src/session/runner/model.ts:154][E: packages/core/src/session/runner/model.ts:155]

## Catalog 与 policy 前置

Catalog `finalize` 会在非 `plugin.added` reason 时触发 `catalog.transform` plugin hook,然后如果 policy service 有 statements,对每个 provider evaluate `provider.use`;结果 deny 时从 catalog draft 移除 provider。`plugin.added` event 会单独触发该 plugin 的 `catalog.transform`。[E: packages/core/src/catalog.ts:190][E: packages/core/src/catalog.ts:191][E: packages/core/src/catalog.ts:193][E: packages/core/src/catalog.ts:194][E: packages/core/src/catalog.ts:201][E: packages/core/src/catalog.ts:205][E: packages/core/src/catalog.ts:208] provider-policy spec 也要求先 assemble provider/model catalog entries 与 overrides,再 evaluate `provider.use`。[E: specs/v2/provider-policy.md:237][E: specs/v2/provider-policy.md:241][E: specs/v2/provider-policy.md:242][E: specs/v2/provider-policy.md:243]

Catalog availability 不再把 credential secret project 到 provider/model request。provider available gate 只看 provider disabled、literal request body apiKey、active Integration connection,或没有 Integration record；runtime resolver 才根据 connection 把 credential 交给 `fromCatalogModel`。[E: packages/core/src/catalog.ts:96][E: packages/core/src/catalog.ts:97][E: packages/core/src/catalog.ts:98][E: packages/core/src/catalog.ts:99][E: packages/core/src/catalog.ts:100][E: packages/core/src/catalog.ts:226][E: packages/core/src/catalog.ts:227][E: packages/core/src/catalog.ts:228][E: packages/core/src/session/runner/model.ts:157][E: packages/core/src/session/runner/model.ts:161]

## 设计动机与权衡

- provider/model spec 说明 first local V2 runner 要等待 Location plugin boot,explicit session model 不 silent fallback,无 explicit model 时用 supported default 或第一 available supported model;当前实现正是这条路径。[E: specs/v2/provider-model.md:270][E: packages/core/src/session/runner/model.ts:151][E: packages/core/src/session/runner/model.ts:153][E: packages/core/src/session/runner/model.ts:154][E: packages/core/src/session/runner/model.ts:155]
- 当前代码实现的 adaptation surface 比 spec 文本里的 native endpoint list 更窄:spec 列出 native `openai/responses`、`openai/completions`、`anthropic/messages` 等,但 `fromCatalogModel` 只匹配 `api.type === "aisdk"` branches。[E: specs/v2/provider-model.md:273][E: specs/v2/provider-model.md:274][E: specs/v2/provider-model.md:275][E: specs/v2/provider-model.md:276][E: packages/core/src/session/runner/model.ts:101][E: packages/core/src/session/runner/model.ts:108][E: packages/core/src/session/runner/model.ts:115][I]
- model request settings 在 Catalog 域中保持 provider-semantic,runner 只把它们放进 route defaults;wire encoding 属于 LLM protocol adapter。[E: CONTEXT.md:103][E: packages/core/src/session/runner/model.ts:69][E: packages/core/src/session/runner/model.ts:70][E: packages/core/src/session/runner/model.ts:71][E: packages/core/src/session/runner/model.ts:72]

## gotcha

- `UnsupportedApiError` 的 schema field 名叫 `api`,实现里的 `apiName` 对 `aisdk` 返回 `aisdk:<package>`;当前代码没有 `UnsupportedEndpointError` class。[E: packages/core/src/session/runner/model.ts:32][E: packages/core/src/session/runner/model.ts:87][I]
- `ProviderV2.Info` 当前没有 `enabled`/`via` 字段；availability 由 `disabled`、literal apiKey、Integration connection 和 Integration record existence 共同算出,本节点以源码为准。[E: packages/core/src/provider.ts:50][E: packages/core/src/catalog.ts:96][E: packages/core/src/catalog.ts:97][E: packages/core/src/catalog.ts:98][E: packages/core/src/catalog.ts:99][E: packages/core/src/catalog.ts:100]
- OpenAI-compatible 需要 resolved `model.api.url`:Catalog resolution can inherit provider-level AISDK URL into a model without model-local URL;fallback `supported` checks `!== undefined`,while `fromCatalogModel` requires truthy `model.api.url`。[E: packages/core/src/catalog.ts:107][E: packages/core/src/catalog.ts:108][E: packages/core/src/session/runner/model.ts:115][E: packages/core/src/session/runner/model.ts:138]

## Sources
- packages/core/src/session/runner/model.ts
- packages/core/src/catalog.ts
- packages/core/src/credential.ts
- packages/core/src/integration.ts
- packages/core/src/integration/connection.ts
- packages/core/src/model.ts
- packages/core/src/provider.ts
- packages/core/src/model-request.ts
- specs/v2/provider-model.md
- specs/v2/provider-policy.md
- CONTEXT.md

## 相关
- [model-layer.model-catalog-v2](../model-layer/model-catalog-v2.md)
- [model-layer.llm-protocols](../model-layer/llm-protocols.md)
