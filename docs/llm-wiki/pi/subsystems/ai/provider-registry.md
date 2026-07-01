---
id: subsys.ai.provider-registry
title: provider 注册中心
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
symbols:
  - builtinProviders
  - builtinModels
  - getBuiltinModel
related:
  - surface.providers.overview
  - ref.ai.provider-catalog
  - ref.ai.model-catalog
evidence: explicit
status: verified
updated: 8c943640
---

> `provider-registry` 是 `pi-ai` 的内置 provider 装配点: `builtinProviders()` 构造 provider 实例, `builtinModels()` 把这些 provider 注册进运行时 `Models` collection, `getBuiltinModel()`/`getBuiltinModels()` 提供对 generated model catalog 的 typed static read。

## 能回答的问题

- `pi-ai` 当前内置 provider 集合的 ground truth 应该看哪里?
- `builtinProviders()` 和 `getBuiltinProviders()` 是不是同一个语义?
- `builtinModels()` 如何把 provider factories 变成可查询、可 stream 的 `Models` collection?
- `Models` collection 查 provider、查 model、refresh model list、resolve auth 时分别走哪些方法?
- `createProvider()` 如何按 `model.api` dispatch 到具体 wire API implementation?
- provider catalog 与 model catalog 的边界在哪里?

## 职责边界

`packages/ai/src/providers/all.ts` 是内置 provider 集合的装配文件: 它集中 import 各 provider factory, 然后由 `builtinProviders()` 返回 factory call 数组 [E: packages/ai/src/providers/all.ts:5] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71]。按本 wiki 的 ground-truth 约定, provider 集以 `builtinProviders()` 为准; 本轮核到该数组里有 35 个 factory call, 而 index 的 provider group 仍写 38, 所以 catalog 侧需要后续 reconcile [U]。

`packages/ai/src/models.ts` 是运行时 collection 与 provider contract: `Provider` 定义 provider 需要暴露 `id`、`name`、可选 `baseUrl`/`headers`、`auth`、model list、可选 refresh 和 stream 方法 [E: packages/ai/src/models.ts:32] [E: packages/ai/src/models.ts:33] [E: packages/ai/src/models.ts:34] [E: packages/ai/src/models.ts:36] [E: packages/ai/src/models.ts:37] [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:54] [E: packages/ai/src/models.ts:63] [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:71]。

`getBuiltinModel()`、`getBuiltinProviders()` 和 `getBuiltinModels()` 是 static catalog helpers: `all.ts` imports generated `MODELS`, then reads by provider/model id, provider keys, or provider values [E: packages/ai/src/providers/all.ts:2] [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:57] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:63] [E: packages/ai/src/providers/all.ts:65]。这几个 helper 的 provider universe 来自 generated model catalog 的 keys, 不等同于运行时 `builtinProviders()` 的 factory array; 当前二者数量相同是本轮人工对照结果, 不应把这种一致性当成 API 契约 [I]。

## 关键文件

- `packages/ai/src/providers/all.ts`: 覆盖本节点的 `getBuiltinModel()`、`getBuiltinProviders()`、`getBuiltinModels()`、`builtinProviders()`、`builtinModels()` 和 image-provider sibling helpers [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:125]。
- `packages/ai/src/models.ts`: 覆盖 `Provider`/`Models`/`MutableModels` interfaces、`ModelsImpl` runtime collection、`createModels()` 和 `createProvider()` [E: packages/ai/src/models.ts:32] [E: packages/ai/src/models.ts:79] [E: packages/ai/src/models.ts:130] [E: packages/ai/src/models.ts:142] [E: packages/ai/src/models.ts:291] [E: packages/ai/src/models.ts:323]。

## 数据模型

`Provider<TApi>` 是 provider factory 的返回 contract: provider 自己拥有 metadata、auth semantics、last-known model list、optional dynamic refresh, and stream behavior [E: packages/ai/src/models.ts:32] [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:54] [E: packages/ai/src/models.ts:63] [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:71]。

`Models` 是 provider collection facade: 它可以列出 provider、按 id 取 provider、同步读一个或全部 provider 的 last-known model list、按 provider/id 查单个 model、刷新 dynamic provider、解析 request auth, and delegate streaming/completion [E: packages/ai/src/models.ts:79] [E: packages/ai/src/models.ts:80] [E: packages/ai/src/models.ts:81] [E: packages/ai/src/models.ts:87] [E: packages/ai/src/models.ts:93] [E: packages/ai/src/models.ts:101] [E: packages/ai/src/models.ts:112] [E: packages/ai/src/models.ts:114] [E: packages/ai/src/models.ts:120] [E: packages/ai/src/models.ts:126] [E: packages/ai/src/models.ts:127]。

`MutableModels` 只在 `Models` 上增加 provider mutation: `setProvider(provider)`、`deleteProvider(id)`、`clearProviders()`; implementation 用 `Map<string, Provider>` 存储 provider, `setProvider()` 以 `provider.id` upsert/replace [E: packages/ai/src/models.ts:130] [E: packages/ai/src/models.ts:132] [E: packages/ai/src/models.ts:133] [E: packages/ai/src/models.ts:134] [E: packages/ai/src/models.ts:143] [E: packages/ai/src/models.ts:152] [E: packages/ai/src/models.ts:153]。

`CreateProviderOptions<TApi>` 是 provider factory 的 parts bag: factory 必须给 `id`、`auth`、initial `models` 和 `api`, 可选给 display `name`、`baseUrl`、headers 和 dynamic `refreshModels()` [E: packages/ai/src/models.ts:295] [E: packages/ai/src/models.ts:296] [E: packages/ai/src/models.ts:298] [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:300] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:312] [E: packages/ai/src/models.ts:314]。

## 内置 provider factory 清单

`builtinProviders()` 当前按以下顺序调用 35 个 factory; 这里列的是 registry entry 的 factory symbol, 不是 provider display name 或 catalog row [E: packages/ai/src/providers/all.ts:70] [I]。

| # | factory symbol | evidence |
|---:|---|---|
| 1 | `amazonBedrockProvider()` | [E: packages/ai/src/providers/all.ts:72] |
| 2 | `antLingProvider()` | [E: packages/ai/src/providers/all.ts:73] |
| 3 | `anthropicProvider()` | [E: packages/ai/src/providers/all.ts:74] |
| 4 | `azureOpenAIResponsesProvider()` | [E: packages/ai/src/providers/all.ts:75] |
| 5 | `cerebrasProvider()` | [E: packages/ai/src/providers/all.ts:76] |
| 6 | `cloudflareAIGatewayProvider()` | [E: packages/ai/src/providers/all.ts:77] |
| 7 | `cloudflareWorkersAIProvider()` | [E: packages/ai/src/providers/all.ts:78] |
| 8 | `deepseekProvider()` | [E: packages/ai/src/providers/all.ts:79] |
| 9 | `fireworksProvider()` | [E: packages/ai/src/providers/all.ts:80] |
| 10 | `githubCopilotProvider()` | [E: packages/ai/src/providers/all.ts:81] |
| 11 | `googleProvider()` | [E: packages/ai/src/providers/all.ts:82] |
| 12 | `googleVertexProvider()` | [E: packages/ai/src/providers/all.ts:83] |
| 13 | `groqProvider()` | [E: packages/ai/src/providers/all.ts:84] |
| 14 | `huggingfaceProvider()` | [E: packages/ai/src/providers/all.ts:85] |
| 15 | `kimiCodingProvider()` | [E: packages/ai/src/providers/all.ts:86] |
| 16 | `minimaxProvider()` | [E: packages/ai/src/providers/all.ts:87] |
| 17 | `minimaxCnProvider()` | [E: packages/ai/src/providers/all.ts:88] |
| 18 | `mistralProvider()` | [E: packages/ai/src/providers/all.ts:89] |
| 19 | `moonshotaiProvider()` | [E: packages/ai/src/providers/all.ts:90] |
| 20 | `moonshotaiCnProvider()` | [E: packages/ai/src/providers/all.ts:91] |
| 21 | `nvidiaProvider()` | [E: packages/ai/src/providers/all.ts:92] |
| 22 | `openaiProvider()` | [E: packages/ai/src/providers/all.ts:93] |
| 23 | `openaiCodexProvider()` | [E: packages/ai/src/providers/all.ts:94] |
| 24 | `opencodeProvider()` | [E: packages/ai/src/providers/all.ts:95] |
| 25 | `opencodeGoProvider()` | [E: packages/ai/src/providers/all.ts:96] |
| 26 | `openrouterProvider()` | [E: packages/ai/src/providers/all.ts:97] |
| 27 | `togetherProvider()` | [E: packages/ai/src/providers/all.ts:98] |
| 28 | `vercelAIGatewayProvider()` | [E: packages/ai/src/providers/all.ts:99] |
| 29 | `xaiProvider()` | [E: packages/ai/src/providers/all.ts:100] |
| 30 | `xiaomiProvider()` | [E: packages/ai/src/providers/all.ts:101] |
| 31 | `xiaomiTokenPlanAmsProvider()` | [E: packages/ai/src/providers/all.ts:102] |
| 32 | `xiaomiTokenPlanCnProvider()` | [E: packages/ai/src/providers/all.ts:103] |
| 33 | `xiaomiTokenPlanSgpProvider()` | [E: packages/ai/src/providers/all.ts:104] |
| 34 | `zaiProvider()` | [E: packages/ai/src/providers/all.ts:105] |
| 35 | `zaiCodingCnProvider()` | [E: packages/ai/src/providers/all.ts:106] |

## 控制流

1. Static catalog lookup: `getBuiltinModel@packages/ai/src/providers/all.ts:48` indexes generated `MODELS[provider]`, returns `models?.[modelId]` typed as `Model<BuiltinModelApi<...>>`, and does not consult runtime-registered provider instances [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:53] [I]。
2. Static provider/model enumeration: `getBuiltinProviders@packages/ai/src/providers/all.ts:56` returns `Object.keys(MODELS)`, while `getBuiltinModels@packages/ai/src/providers/all.ts:60` returns `Object.values(models)` for one generated provider entry or `[]` when that entry is missing [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:57] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:63] [E: packages/ai/src/providers/all.ts:64] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:66]。
3. Runtime provider construction: `builtinProviders@packages/ai/src/providers/all.ts:70` returns a new array of direct factory calls; each call constructs a provider through its provider module, so callers should treat `builtinProviders()` as constructing provider instances rather than returning a singleton registry object [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71] [I]。
4. Runtime collection construction: `builtinModels@packages/ai/src/providers/all.ts:111` calls `createModels(options)`, loops over `builtinProviders()`, and invokes `models.setProvider(provider)` for each provider before returning the `MutableModels` collection [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:112] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/providers/all.ts:114] [E: packages/ai/src/providers/all.ts:116]。
5. Collection initialization: `createModels@packages/ai/src/models.ts:291` constructs `ModelsImpl`, which defaults to `InMemoryCredentialStore` and `defaultProviderAuthContext()` when options are absent [E: packages/ai/src/models.ts:147] [E: packages/ai/src/models.ts:148] [E: packages/ai/src/models.ts:149] [E: packages/ai/src/models.ts:291] [E: packages/ai/src/models.ts:292]。
6. Provider lookup and model lookup: `ModelsImpl.getProvider()` reads the provider map by id, `getModels(provider)` reads one provider and catches provider `getModels()` failures as empty lists, and `getModel(provider, id)` finds by `model.id` inside that provider's list [E: packages/ai/src/models.ts:168] [E: packages/ai/src/models.ts:169] [E: packages/ai/src/models.ts:172] [E: packages/ai/src/models.ts:174] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:179] [E: packages/ai/src/models.ts:194] [E: packages/ai/src/models.ts:195]。
7. All-provider model listing: `ModelsImpl.getModels()` without a provider id iterates all registered provider entries, appends each `entry.getModels()` result, and ignores throwing providers instead of failing the whole list [E: packages/ai/src/models.ts:183] [E: packages/ai/src/models.ts:184] [E: packages/ai/src/models.ts:186] [E: packages/ai/src/models.ts:187] [E: packages/ai/src/models.ts:191]。
8. Refresh: `ModelsImpl.refresh(provider)` only calls `refreshModels()` when the named provider exists and has that method, wraps non-`ModelsError` failures as `ModelsError("model_source", ...)`, and `refresh()` without provider id uses `Promise.allSettled()` across all registered providers [E: packages/ai/src/models.ts:198] [E: packages/ai/src/models.ts:200] [E: packages/ai/src/models.ts:201] [E: packages/ai/src/models.ts:203] [E: packages/ai/src/models.ts:205] [E: packages/ai/src/models.ts:206] [E: packages/ai/src/models.ts:213]。
9. Auth and streaming: `ModelsImpl.getAuth()` resolves auth through the provider that owns `model.provider`; `stream()` lazily requires that provider, applies auth into request model/options, then delegates to `provider.stream()` [E: packages/ai/src/models.ts:216] [E: packages/ai/src/models.ts:217] [E: packages/ai/src/models.ts:219] [E: packages/ai/src/models.ts:258] [E: packages/ai/src/models.ts:263] [E: packages/ai/src/models.ts:264] [E: packages/ai/src/models.ts:265] [E: packages/ai/src/models.ts:266]。
10. Provider factory dispatch: `createProvider()` detects whether `input.api` is a single `ProviderStreams` implementation or a map keyed by `model.api`; missing API entries become lazy stream errors, while `stream()` and `streamSimple()` both dispatch through that selected implementation [E: packages/ai/src/models.ts:323] [E: packages/ai/src/models.ts:327] [E: packages/ai/src/models.ts:328] [E: packages/ai/src/models.ts:329] [E: packages/ai/src/models.ts:331] [E: packages/ai/src/models.ts:337] [E: packages/ai/src/models.ts:340] [E: packages/ai/src/models.ts:365] [E: packages/ai/src/models.ts:366] [E: packages/ai/src/models.ts:367]。

## 设计动机与权衡

`Provider` owns stream behavior and `Models` owns auth application plus request delegation; this split keeps provider-specific wire protocol inside provider implementations while leaving callers with one collection interface for lookup, auth, streaming, and completion [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:71] [E: packages/ai/src/models.ts:216] [E: packages/ai/src/models.ts:263] [E: packages/ai/src/models.ts:266] [I]。

`builtinModels()` deliberately builds on `builtinProviders()` instead of reading generated `MODELS` directly, because runtime streaming requires full `Provider` objects with auth and `stream()` methods, not just generated `Model` metadata [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:71] [I]。

`createProvider()` allows a single provider to host mixed API families by accepting either one `ProviderStreams` object or a partial map keyed by `model.api`; this is the mechanism that lets one provider factory expose multiple upstream wire protocols without making `ModelsImpl` understand provider-specific protocol branching [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:327] [E: packages/ai/src/models.ts:331] [E: packages/ai/src/models.ts:365] [I]。

## Gotcha

- `builtinProviders()` is the provider-set ground truth; `getBuiltinProviders()` is a generated-model-catalog helper based on `Object.keys(MODELS)` [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:57] [E: packages/ai/src/providers/all.ts:70]。When filling [ref.ai.provider-catalog](../../reference/provider-catalog.md), prefer `builtinProviders()` for membership and use model catalog keys only as a cross-check [I]。
- `ModelsImpl.getModels()` is best-effort: unknown provider id returns `[]`, provider `getModels()` throws are swallowed, and all-provider listing also ignores throwing providers [E: packages/ai/src/models.ts:174] [E: packages/ai/src/models.ts:175] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:179] [E: packages/ai/src/models.ts:184] [E: packages/ai/src/models.ts:187]。
- `ModelsImpl.requireProvider()` throws `ModelsError("provider", ...)` for streaming through an unknown provider, so lookup/listing and streaming have different failure behavior [E: packages/ai/src/models.ts:222] [E: packages/ai/src/models.ts:223] [E: packages/ai/src/models.ts:225] [E: packages/ai/src/models.ts:264]。
- `createProvider()` stores `input.models` in a mutable closure and replaces it only after a successful `refreshModels()` resolution; failed refreshes leave the previous last-known list in place [E: packages/ai/src/models.ts:324] [E: packages/ai/src/models.ts:326] [E: packages/ai/src/models.ts:355] [E: packages/ai/src/models.ts:357] [E: packages/ai/src/models.ts:359]。
- Image-generation providers are adjacent but separate: `builtinImagesProviders()` currently returns `openrouterImagesProvider()`, and `builtinImagesModels()` registers image providers into `ImagesModels`, not the text/chat `Models` collection covered by this node [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:125] [E: packages/ai/src/providers/all.ts:126] [E: packages/ai/src/providers/all.ts:127] [E: packages/ai/src/providers/all.ts:128] [I]。
- The existing index metadata says provider group count is 38 while the current `builtinProviders()` array has 35 entries; this node follows source ground truth and records the mismatch for later catalog/index cleanup [U]。

## 跨包边界

[surface.providers.overview](../../surface/providers/overview.md) is the user-facing provider selection/config surface: it should explain how products choose and configure providers, while this node explains how `pi-ai` constructs and stores provider objects [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/models.ts:152] [I]。

[ref.ai.provider-catalog](../../reference/provider-catalog.md) is the provider instance catalog: it should enumerate provider ids/names/auth/model-source details row by row, using `builtinProviders()` membership from this node as the registry ground truth [E: packages/ai/src/providers/all.ts:70] [I]。

[ref.ai.model-catalog](../../reference/model-catalog.md) is the generated model metadata catalog: it should enumerate generated model entries and their `Model.api`/capability metadata, while this node only documents how `getBuiltinModel()` reads that catalog and how runtime providers expose model lists [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/models.ts:54] [I]。

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts

## 相关

- [surface.providers.overview](../../surface/providers/overview.md): provider 选择、配置和用户可见入口。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 内置 provider catalog, 应逐实例列 provider id、factory、auth 与 model source。
- [ref.ai.model-catalog](../../reference/model-catalog.md): generated model metadata catalog, 应逐模型列 id、provider、api 与能力字段。
