---
id: session-v2.model-resolution
title: Runner 模型解析(catalog→route)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/session/runner/model.ts
  - packages/core/src/catalog.ts
  - packages/core/src/credential.ts
  - packages/core/src/integration.ts
  - packages/schema/src/model.ts
  - packages/schema/src/provider.ts
  - specs/v2/provider-model.md
  - specs/v2/provider-policy.md
  - CONTEXT.md
symbols: [SessionRunnerModel, SessionRunnerModel.resolve, fromCatalogModel, withDefaults, withVariant, apiKey, supported]
related: [model-layer.model-catalog-v2, model-layer.llm-protocols]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 runner model resolution 把 Location catalog 中的 `ModelV2.Info` 解析成 `@opencode-ai/llm` `Model`,并在当前实现中只支持 OpenAI Responses、Anthropic Messages、OpenAI-compatible Chat 三类 AI-SDK-shaped catalog model。

## 能回答的问题

- `SessionRunner` 没有 explicit model 时怎样选默认模型?
- `ModelV2.Info.api` 当前支持哪些 package 到 native route 的映射?
- API key、headers、body 和 limits 怎样进入 route defaults?
- Session model variant 在哪里 overlay 到 request?
- provider policy、Integration connection 与 model availability 在 model resolution 前后在哪里生效?

## 职责边界

`SessionRunnerModel` 不是 catalog store。它读取 Location-scoped `Catalog.Service` 和 `Integration.Service`;有 explicit session model 时只从 `catalog.model.available()` 里找 exact provider/model,没有 explicit model 时选择 supported default 或 first supported available model。选中后 resolver 读取 provider 对应 Integration connection,credential connection 再 resolve 成 credential value,然后通过 `fromCatalogModel(...)` 进入具体 route branch。[E: packages/core/src/session/runner/model.ts:182][E: packages/core/src/session/runner/model.ts:185][E: packages/core/src/session/runner/model.ts:186][E: packages/core/src/session/runner/model.ts:188][E: packages/core/src/session/runner/model.ts:190][E: packages/core/src/session/runner/model.ts:191][E: packages/core/src/session/runner/model.ts:192][E: packages/core/src/session/runner/model.ts:195][E: packages/core/src/session/runner/model.ts:197][E: packages/core/src/session/runner/model.ts:204][E: packages/core/src/session/runner/model.ts:205][E: packages/core/src/session/runner/model.ts:211]

Catalog 的 provider/model merge、provider policy filtering 与 availability gate 由 `Catalog.layer` 负责;current resolver does not wait on `PluginBoot.Service` because that deleted source is no longer in this code path。[E: packages/core/src/catalog.ts:78][E: packages/core/src/catalog.ts:87][E: packages/core/src/catalog.ts:160][E: packages/core/src/catalog.ts:161][E: packages/core/src/catalog.ts:210][E: packages/core/src/catalog.ts:211][E: packages/core/src/catalog.ts:212][I]

## 数据模型

| 实体 | 字段/方法 | 含义 |
|---|---|---|
| `Model.Ref` | `id`, `providerID`, optional `variant` | Session 选择的模型引用。[E: packages/schema/src/model.ts:14][E: packages/schema/src/model.ts:15][E: packages/schema/src/model.ts:16][E: packages/schema/src/model.ts:17] |
| `Model.Info` | `api`, `request`, `variants`, `limit`, `enabled` | Catalog 中的完整 model record。[E: packages/schema/src/model.ts:60][E: packages/schema/src/model.ts:65][E: packages/schema/src/model.ts:67][E: packages/schema/src/model.ts:71][E: packages/schema/src/model.ts:80][E: packages/schema/src/model.ts:81] |
| `Provider.Info` | `disabled`, `api`, `request`, optional `integrationID` | Provider availability gate、provider API/default request 与 Integration lookup key。[E: packages/schema/src/provider.ts:53][E: packages/schema/src/provider.ts:55][E: packages/schema/src/provider.ts:57][E: packages/schema/src/provider.ts:58][E: packages/schema/src/provider.ts:59] |
| `Provider.Request` | `headers`, `body` | Current request knobs in schema;deleted `model-request.ts` generation/options fields are not part of this HEAD's schema。[E: packages/schema/src/provider.ts:46][E: packages/schema/src/provider.ts:47][E: packages/schema/src/provider.ts:48][E: packages/schema/src/provider.ts:49] |

`Catalog.model.available()` 要求 provider available 且 model enabled,所以 runner fallback selection 只看 usable models。[E: packages/core/src/catalog.ts:210][E: packages/core/src/catalog.ts:211][E: packages/core/src/catalog.ts:212]

## 控制流

1. `SessionRunnerModel.locationLayer@packages/core/src/session/runner/model.ts:182` 构造 Location-scoped resolver,读取 `Catalog.Service` 与 `Integration.Service`。[E: packages/core/src/session/runner/model.ts:182][E: packages/core/src/session/runner/model.ts:185][E: packages/core/src/session/runner/model.ts:186][E: packages/core/src/session/runner/model.ts:187]

2. 如果 session 有 explicit `session.model`,resolver 在 `catalog.model.available()` 中找 providerID/modelID exact match;没有 explicit model 时,先取 `catalog.model.default()` 并过滤 `supported`,否则在 `catalog.model.available()` 中找第一个 supported model。[E: packages/core/src/session/runner/model.ts:190][E: packages/core/src/session/runner/model.ts:191][E: packages/core/src/session/runner/model.ts:192][E: packages/core/src/session/runner/model.ts:195][E: packages/core/src/session/runner/model.ts:197]

3. Explicit model 找不到 usable match 时,返回 `ModelUnavailableError`;没有 selected model 时,返回 `ModelNotSelectedError({ sessionID })`。[E: packages/core/src/session/runner/model.ts:198][E: packages/core/src/session/runner/model.ts:199][E: packages/core/src/session/runner/model.ts:203]

4. 选中 model 后,resolver 用 catalog provider 的 `integrationID` 或 provider id 读取 active Integration connection；credential/env connection 再由 `integrations.connection.resolve(...)` 解析成 `Credential.Value | undefined`。[E: packages/core/src/session/runner/model.ts:204][E: packages/core/src/session/runner/model.ts:205][E: packages/core/src/session/runner/model.ts:206][E: packages/core/src/session/runner/model.ts:211][E: packages/core/src/integration.ts:381][E: packages/core/src/integration.ts:385][E: packages/core/src/integration.ts:386][E: packages/core/src/integration.ts:390]

5. Standalone `resolve(session, model, credential)` is a thin helper;it applies `withVariant(selected, session.model?.variant)` before `fromCatalogModel`。[E: packages/core/src/session/runner/model.ts:172][E: packages/core/src/session/runner/model.ts:173]

6. `withVariant@packages/core/src/session/runner/model.ts:104` treats `variantID === "default"` or undefined as `model.request.variant`;if an explicit non-default variant is missing,it returns `VariantUnavailableError`;if found,it overlays variant headers/body onto `draft.request`。[E: packages/core/src/session/runner/model.ts:104][E: packages/core/src/session/runner/model.ts:108][E: packages/core/src/session/runner/model.ts:109][E: packages/core/src/session/runner/model.ts:110][E: packages/core/src/session/runner/model.ts:111][E: packages/core/src/session/runner/model.ts:121][E: packages/core/src/session/runner/model.ts:122]

7. `fromCatalogModel` first merges key-credential metadata into request body,then resolves auth through `apiKey(...)`。[E: packages/core/src/session/runner/model.ts:131][E: packages/core/src/session/runner/model.ts:135][E: packages/core/src/session/runner/model.ts:136][E: packages/core/src/session/runner/model.ts:139][E: packages/core/src/session/runner/model.ts:141]

8. `apiKey@packages/core/src/session/runner/model.ts:83` priority is credential key,credential oauth access,then `model.request.body.apiKey` or `model.api.settings?.apiKey`;current code does not fall back to an env name directly here because env resolution already happens in Integration connection resolution。[E: packages/core/src/session/runner/model.ts:83][E: packages/core/src/session/runner/model.ts:84][E: packages/core/src/session/runner/model.ts:85][E: packages/core/src/session/runner/model.ts:86][E: packages/core/src/session/runner/model.ts:87][E: packages/core/src/integration.ts:386][E: packages/core/src/integration.ts:388]

9. `withDefaults@packages/core/src/session/runner/model.ts:90` writes route defaults:provider from `model.providerID`,endpoint baseURL from `model.api.url`,request headers,HTTP body without `apiKey`,and context/output limits。[E: packages/core/src/session/runner/model.ts:90][E: packages/core/src/session/runner/model.ts:91][E: packages/core/src/session/runner/model.ts:92][E: packages/core/src/session/runner/model.ts:93][E: packages/core/src/session/runner/model.ts:95][E: packages/core/src/session/runner/model.ts:96][E: packages/core/src/session/runner/model.ts:97][E: packages/core/src/session/runner/model.ts:98][E: packages/core/src/session/runner/model.ts:99][E: packages/core/src/session/runner/model.ts:100]

10. OpenAI branch matches `model.api.type === "aisdk"` and package `@ai-sdk/openai`,maps to `OpenAIResponses.route` and bearer auth。[E: packages/core/src/session/runner/model.ts:142][E: packages/core/src/session/runner/model.ts:144][E: packages/core/src/session/runner/model.ts:145][E: packages/core/src/session/runner/model.ts:146]

11. Anthropic branch matches `@ai-sdk/anthropic`,maps to `AnthropicMessages.route` and `x-api-key` header auth。[E: packages/core/src/session/runner/model.ts:149][E: packages/core/src/session/runner/model.ts:151][E: packages/core/src/session/runner/model.ts:152][E: packages/core/src/session/runner/model.ts:153]

12. OpenAI-compatible branch matches `@ai-sdk/openai-compatible` and requires resolved `model.api.url`,maps to `OpenAICompatibleChat.route` and bearer auth。[E: packages/core/src/session/runner/model.ts:156][E: packages/core/src/session/runner/model.ts:158][E: packages/core/src/session/runner/model.ts:159][E: packages/core/src/session/runner/model.ts:160]

13. Other API combinations return `UnsupportedApiError`,payload includes providerID、modelID、api name。[E: packages/core/src/session/runner/model.ts:163][E: packages/core/src/session/runner/model.ts:164][E: packages/core/src/session/runner/model.ts:165][E: packages/core/src/session/runner/model.ts:166][E: packages/core/src/session/runner/model.ts:167]

14. `supported@packages/core/src/session/runner/model.ts:175` and fallback selection use the same narrowing:only `aisdk` + OpenAI/OpenAI-compatible-with-url/Anthropic are supported。[E: packages/core/src/session/runner/model.ts:175][E: packages/core/src/session/runner/model.ts:176][E: packages/core/src/session/runner/model.ts:177][E: packages/core/src/session/runner/model.ts:178][E: packages/core/src/session/runner/model.ts:179][E: packages/core/src/session/runner/model.ts:195][E: packages/core/src/session/runner/model.ts:197]

## Catalog 与 policy 前置

Catalog `projectModel` merges provider-level API/request defaults into each model: native empty model API inherits provider API, AI-SDK model without URL inherits provider URL/settings, and request headers/body are provider defaults overridden by model request。[E: packages/core/src/catalog.ts:78][E: packages/core/src/catalog.ts:80][E: packages/core/src/catalog.ts:82][E: packages/core/src/catalog.ts:87][E: packages/core/src/catalog.ts:88][E: packages/core/src/catalog.ts:89]

Catalog `finalize` evaluates `provider.use` policy statements and removes providers whose policy result is deny。provider-policy spec also requires provider/model catalog entries and overrides before evaluating `provider.use`。[E: packages/core/src/catalog.ts:160][E: packages/core/src/catalog.ts:161][E: packages/core/src/catalog.ts:163][E: packages/core/src/catalog.ts:164][E: specs/v2/provider-policy.md:237][E: specs/v2/provider-policy.md:241][E: specs/v2/provider-policy.md:243]

Catalog availability does not project credential secret into provider/model request. provider available gate only checks provider disabled,literal request body apiKey,active Integration connection,or absence of Integration record;runtime resolver then resolves connection credential and passes it to `fromCatalogModel`。[E: packages/core/src/catalog.ts:71][E: packages/core/src/catalog.ts:72][E: packages/core/src/catalog.ts:73][E: packages/core/src/catalog.ts:74][E: packages/core/src/catalog.ts:75][E: packages/core/src/session/runner/model.ts:205][E: packages/core/src/session/runner/model.ts:211]

## 设计动机与权衡

- provider/model spec says first local V2 runner uses supported default then first available supported model,with explicit model not silently falling back;current implementation returns `ModelUnavailableError` for unusable explicit model and `ModelNotSelectedError` when no model is selected。[E: specs/v2/provider-model.md:270][E: packages/core/src/session/runner/model.ts:190][E: packages/core/src/session/runner/model.ts:195][E: packages/core/src/session/runner/model.ts:197][E: packages/core/src/session/runner/model.ts:198][E: packages/core/src/session/runner/model.ts:203]
- Current implementation's adaptation surface is narrower than old native endpoint plans:the code only matches three `api.type === "aisdk"` branches,even though the spec text still lists a broader native endpoint vocabulary。[E: specs/v2/provider-model.md:273][E: specs/v2/provider-model.md:274][E: specs/v2/provider-model.md:275][E: specs/v2/provider-model.md:276][E: packages/core/src/session/runner/model.ts:142][E: packages/core/src/session/runner/model.ts:149][E: packages/core/src/session/runner/model.ts:156][I]
- Model request settings remain provider-semantic through Catalog resolution;runner maps only current `headers`/`body`/limits/endpoint defaults into LLM route defaults,while selected protocol adapter owns provider wire encoding。[E: CONTEXT.md:136][E: packages/core/src/session/runner/model.ts:95][E: packages/core/src/session/runner/model.ts:98][E: packages/core/src/session/runner/model.ts:99][E: packages/core/src/session/runner/model.ts:100]

## gotcha

- `UnsupportedApiError` 的 schema field 名叫 `api`,实现里的 `apiName` 对 `aisdk` 返回 `aisdk:<package>`;当前代码没有 `UnsupportedEndpointError` class。[E: packages/core/src/session/runner/model.ts:54][E: packages/core/src/session/runner/model.ts:59][E: packages/core/src/session/runner/model.ts:128][E: packages/core/src/session/runner/model.ts:167][I]
- `Provider.Info` 当前没有 `enabled`/`via` 字段；availability 由 `disabled`、literal apiKey、Integration connection 和 Integration record existence 共同算出,本节点以源码为准。[E: packages/schema/src/provider.ts:57][E: packages/core/src/catalog.ts:71][E: packages/core/src/catalog.ts:72][E: packages/core/src/catalog.ts:73][E: packages/core/src/catalog.ts:74][E: packages/core/src/catalog.ts:75]
- OpenAI-compatible 需要 resolved `model.api.url`:Catalog projection can inherit provider-level AISDK URL into a model without model-local URL;fallback `supported` checks `!== undefined`,while `fromCatalogModel` requires truthy `resolved.api.url`。[E: packages/core/src/catalog.ts:82][E: packages/core/src/catalog.ts:83][E: packages/core/src/session/runner/model.ts:156][E: packages/core/src/session/runner/model.ts:179]

## Sources

- packages/core/src/session/runner/model.ts
- packages/core/src/catalog.ts
- packages/core/src/credential.ts
- packages/core/src/integration.ts
- packages/schema/src/model.ts
- packages/schema/src/provider.ts
- specs/v2/provider-model.md
- specs/v2/provider-policy.md
- CONTEXT.md

## 相关

- [model-layer.model-catalog-v2](../model-layer/model-catalog-v2.md)
- [model-layer.llm-protocols](../model-layer/llm-protocols.md)
