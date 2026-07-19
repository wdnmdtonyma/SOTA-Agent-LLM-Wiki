---
id: subsys.ai.model-discovery
title: 模型目录与发现
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/models.generated.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/types.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/package.json
symbols:
  - MODELS
  - calculateCost
  - Model
related:
  - subsys.ai.provider-registry
  - ref.ai.model-catalog
evidence: explicit
status: verified
updated: 3da591ab
---

> `model-discovery` 是 `pi-ai` 的文字模型目录边界: generated `MODELS` 提供静态 `Model` metadata, `getBuiltinModel()`/`getBuiltinModels()` 读取该目录, `builtinModels()` 把 provider factories 注册成可 refresh、可 stream 的 runtime `Models` collection。

## 能回答的问题

- generated `MODELS` catalog 的 provider key 与 per-provider model map 在哪里汇总?
- `getBuiltinModel()` / `getBuiltinModels()` 读的是静态 catalog 还是 runtime provider collection?
- `builtinModels()` 如何从内置 provider factories 组装可查询的 `Models` collection?
- `Model.api` 与 `Model.provider` 在 wire dispatch 和 provider ownership 中分别表达什么?
- `calculateCost()` 如何用 model cost metadata 写回 usage cost?
- 更新模型目录时为什么不能直接手改 `models.generated.ts`?

## 职责边界

`packages/ai/src/models.generated.ts` 是文字模型静态目录的 aggregator: 它 import 每个 `providers/<id>.models.ts` 里的 provider-specific catalog, 再把这些 catalog 挂到 `MODELS` object 的 provider id key 下 [E: packages/ai/src/models.generated.ts:4] [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:41] [E: packages/ai/src/models.generated.ts:75]。本节点只把 generated file 当作当前事实快照; 目录生成规则与编辑入口来自 `scripts/generate-models.ts` 和 `package.json` 的 `generate-models` script [E: packages/ai/scripts/generate-models.ts:2383] [E: packages/ai/scripts/generate-models.ts:2388] [E: packages/ai/package.json:52]。

`packages/ai/src/providers/all.ts` 是 built-in catalog helper 与 runtime provider assembly 的交叉点: `getBuiltinModel()` / `getBuiltinModels()` 直接读取 generated `MODELS`, 而 `builtinModels()` 先 `createModels()` 再注册 `builtinProviders()` 返回的 provider instances [E: packages/ai/src/providers/all.ts:2] [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:68] [E: packages/ai/src/providers/all.ts:71] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:122] [E: packages/ai/src/providers/all.ts:123]。

`packages/ai/src/models.ts` 是 runtime collection 与计费 helper: `ModelsImpl.getModels()` / `getModel()` 读取 provider 的 model list；`refresh(options)` 并发刷新所有暴露 `refreshModels()` 的 provider，把 credential、per-provider store、network policy、force 与 abort signal 组成 context，并汇总 per-provider errors；`calculateCost()` 用 `Model.cost` 和 `Usage` token counts 回填 `usage.cost` [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:255] [E: packages/ai/src/models.ts:272] [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:279] [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:297] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:327] [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:653] [E: packages/ai/src/models.ts:658]。

## 关键文件

- `packages/ai/src/models.generated.ts`: generated `MODELS` aggregator, 当前把 35 个 provider id 映射到 per-provider model catalog constant [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:41] [E: packages/ai/src/models.generated.ts:75] [I]。
- `packages/ai/src/models.ts`: runtime `Models` collection、`createProvider()` dispatch、`hasApi()` runtime narrowing、`calculateCost()` 和 thinking-level helpers [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:556] [E: packages/ai/src/models.ts:635] [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:663]。
- `packages/ai/src/providers/all.ts`: static built-in model helpers 与 built-in provider registration bridge [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:68] [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:120]。
- `packages/ai/src/types.ts`: `Model<TApi>` 的字段 contract, 包括 `api`、`provider`、`cost`、context/token limits 和 optional compat/header fields [E: packages/ai/src/types.ts:706] [E: packages/ai/src/types.ts:709] [E: packages/ai/src/types.ts:710] [E: packages/ai/src/types.ts:371] [E: packages/ai/src/types.ts:720] [E: packages/ai/src/types.ts:721] [E: packages/ai/src/types.ts:722] [E: packages/ai/src/types.ts:724]。

## 数据模型

`MODELS` 是 generated provider-to-model-map: top-level key 是 provider id, value 是该 provider 的 model map constant, 例如 `"anthropic": ANTHROPIC_MODELS`、`"openai": OPENAI_MODELS`、`"openai-codex": OPENAI_CODEX_MODELS` [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:62] [E: packages/ai/src/models.generated.ts:63]。这些 provider id keys 同时被 `getBuiltinProviders()` 用 `Object.keys(MODELS)` 暴露为 static catalog provider list [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:65]。

`Model<TApi>` 的核心字段把一个模型绑定到协议和 provider ownership: `api` 是 wire API key, `provider` 是 owning provider id, `baseUrl` 是 request base URL, `reasoning` 标识 reasoning capability, `input` 列出 text/image 输入 modality, `cost` 记录基础 input/output/cacheRead/cacheWrite 单价并可带 request-wide `tiers`, `contextWindow` 与 `maxTokens` 记录上下文和输出 token limit [E: packages/ai/src/types.ts:688] [E: packages/ai/src/types.ts:695] [E: packages/ai/src/types.ts:700] [E: packages/ai/src/types.ts:702] [E: packages/ai/src/types.ts:706] [E: packages/ai/src/types.ts:719] [E: packages/ai/src/types.ts:720] [E: packages/ai/src/types.ts:721]。

`Model.api` 与 `Model.provider` 分别驱动两个不同选择: `ModelsImpl.requireProvider()` 用 `model.provider` 找 provider instance, `createProvider()` 的 `apiFor()` 用 `model.api` 在 single implementation 或 by-API map 中选择 `ProviderStreams` [E: packages/ai/src/models.ts:455] [E: packages/ai/src/models.ts:456] [E: packages/ai/src/models.ts:574] [E: packages/ai/src/models.ts:580]。因此同一 provider 可以承载多个 wire API, 但每个 model row 必须同时有 provider ownership 与 API routing key [E: packages/ai/src/models.ts:547] [E: packages/ai/src/models.ts:574] [I]。

## 控制流

1. Catalog generation: `generate-models.ts` creates provider catalog files and an aggregator; the aggregator output string starts with `export const MODELS = {`, appends each sorted provider id as a property, and writes `src/models.generated.ts` [E: packages/ai/scripts/generate-models.ts:2325] [E: packages/ai/scripts/generate-models.ts:2384] [E: packages/ai/scripts/generate-models.ts:2372] [E: packages/ai/scripts/generate-models.ts:2379] [E: packages/ai/scripts/generate-models.ts:2383] [E: packages/ai/scripts/generate-models.ts:2384] [E: packages/ai/scripts/generate-models.ts:2385] [E: packages/ai/scripts/generate-models.ts:2388]。
2. Static read: `getBuiltinModel(provider, modelId)` indexes `MODELS[provider]` and returns `models?.[modelId]` typed as `Model<BuiltinModelApi<...>>`; it does not query runtime `ModelsImpl` or provider instances [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:61] [I]。
3. Static enumeration: `getBuiltinModels(provider)` reads `MODELS[provider]`, returns `Object.values(models)` when present, and returns `[]` when the provider key is absent [E: packages/ai/src/providers/all.ts:68] [E: packages/ai/src/providers/all.ts:71] [E: packages/ai/src/providers/all.ts:72] [E: packages/ai/src/providers/all.ts:73] [E: packages/ai/src/providers/all.ts:74]。
4. Runtime assembly: `builtinModels(options)` constructs a `MutableModels` collection with `createModels(options)`, loops over `builtinProviders()`, registers each provider via `models.setProvider(provider)`, and returns the collection [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:122] [E: packages/ai/src/providers/all.ts:123] [E: packages/ai/src/providers/all.ts:125]。
5. Runtime lookup: `ModelsImpl.getModels(provider)` returns `[]` for an unknown provider id, catches throwing provider `getModels()` calls as `[]`, and `getModel(provider, id)` finds the first model whose `model.id` matches inside that provider list [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:252] [E: packages/ai/src/models.ts:253] [E: packages/ai/src/models.ts:255] [E: packages/ai/src/models.ts:257] [E: packages/ai/src/models.ts:272] [E: packages/ai/src/models.ts:273]。
6. Runtime refresh: `ModelsImpl.refresh(options)` selects every provider exposing `refreshModels`, runs them concurrently with `Promise.all()`, and gives each hook a credential plus provider-scoped `ModelsStore` adapter [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:279] [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:297]。Each task catches its own failure into the result's `errors` map and retries the same hook with `allowNetwork: false` to restore cached models best-effort, so one provider failure is reported without rejecting the aggregate refresh [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:327]。
7. Cost calculation: `calculateCost(model, usage)` 先用 `input + cacheRead + cacheWrite` 计算整请求 input usage，并选择 `inputTokensAbove` 小于该值的最高 tier；选中的四项 rates 应用于整请求，而不是只对超阈值部分计费 [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:640] [E: packages/ai/src/models.ts:643] [E: packages/ai/src/models.ts:644] [E: packages/ai/src/models.ts:645] [E: packages/ai/src/models.ts:646]。随后 input/output/cacheRead 按各 bucket 计费，1h cache write 使用选中 input rate 的 2 倍，最后汇总到 `usage.cost.total` [E: packages/ai/src/models.ts:651] [E: packages/ai/src/models.ts:653] [E: packages/ai/src/models.ts:657] [E: packages/ai/src/models.ts:658]。

## 设计动机与权衡

Static catalog read 与 runtime model collection 是两条路径: `getBuiltinModel()` / `getBuiltinModels()` 只读 generated metadata, 适合 catalog/query 用例; `builtinModels()` 返回包含 provider auth、refresh 与 stream behavior 的 collection, 适合真实请求路径 [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:68] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/models.ts:89] [E: packages/ai/src/models.ts:63] [E: packages/ai/src/models.ts:113] [I]。

`calculateCost()` mutates and returns `usage.cost` instead of returning a detached object, so API modules can parse usage, call the helper, and keep the cost fields attached to the same `Usage` object passed through the stream output [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:653] [E: packages/ai/src/models.ts:657] [E: packages/ai/src/models.ts:658] [I]。

`hasApi(model, api)` is the runtime narrowing escape hatch for dynamically looked-up models: it checks `model.api === api` and narrows `Model<Api>` to `Model<TApi>` for typed stream options [E: packages/ai/src/models.ts:635] [E: packages/ai/src/models.ts:636]。

`getSupportedThinkingLevels()` 的扩展顺序包含 `max`；与 `xhigh` 一样，只有 `thinkingLevelMap` 明确提供映射时才报告支持，避免把最高档默认宣称给所有 reasoning models [E: packages/ai/src/models.ts:661] [E: packages/ai/src/models.ts:663] [E: packages/ai/src/models.ts:669]。

## Gotcha

- `models.generated.ts` and provider `.models.ts` files are generator outputs written by `generate-models.ts`; update model metadata through `npm run generate-models` / `scripts/generate-models.ts`, not by treating the generated files as hand-written design sources [E: packages/ai/package.json:52] [E: packages/ai/scripts/generate-models.ts:2384] [E: packages/ai/scripts/generate-models.ts:2372] [E: packages/ai/scripts/generate-models.ts:2388] [I]。
- `getBuiltinModel()` can return `undefined` at runtime even though its TypeScript signature is `Model<...>`: the implementation returns `models?.[modelId as string]` and casts the result, with no runtime throw or fallback [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:59] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:61] [I]。
- `getBuiltinProviders()` reads generated `MODELS` keys, while `builtinProviders()` constructs provider instances from explicit provider factory calls; current source makes these adjacent but not a single shared data structure [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:79] [I]。
- `ModelsImpl.getModels()` is best-effort and swallow-fail: unknown provider id and throwing provider `getModels()` both yield empty model lists rather than errors [E: packages/ai/src/models.ts:252] [E: packages/ai/src/models.ts:253] [E: packages/ai/src/models.ts:255] [E: packages/ai/src/models.ts:257]。

## 跨包边界

[subsys.ai.provider-registry](provider-registry.md) owns provider membership and provider construction details: this node only explains how model discovery uses the provider registry helpers and runtime collection boundary [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:120] [I]。

[ref.ai.model-catalog](../../reference/model-catalog.md) should enumerate generated model rows; this node documents the mechanics around the generated catalog, not every model id or provider-specific model capability row [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:76] [I]。

## Sources

- packages/ai/src/models.generated.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/types.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/package.json

## 相关

- [subsys.ai.provider-registry](provider-registry.md): provider factory registry, runtime provider construction, and provider membership ground truth.
- [ref.ai.model-catalog](../../reference/model-catalog.md): generated model metadata catalog that should enumerate individual model rows.
