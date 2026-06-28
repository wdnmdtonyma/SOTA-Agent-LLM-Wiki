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
updated: 5a073885
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

`packages/ai/src/models.generated.ts` 是文字模型静态目录的 aggregator: 它 import 每个 `providers/<id>.models.ts` 里的 provider-specific catalog, 再把这些 catalog 挂到 `MODELS` object 的 provider id key 下 [E: packages/ai/src/models.generated.ts:4] [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:41] [E: packages/ai/src/models.generated.ts:75]。本节点只把 generated file 当作当前事实快照; 目录生成规则与编辑入口来自 `scripts/generate-models.ts` 和 `package.json` 的 `generate-models` script [E: packages/ai/scripts/generate-models.ts:2324] [E: packages/ai/scripts/generate-models.ts:2329] [E: packages/ai/package.json:48]。

`packages/ai/src/providers/all.ts` 是 built-in catalog helper 与 runtime provider assembly 的交叉点: `getBuiltinModel()` / `getBuiltinModels()` 直接读取 generated `MODELS`, 而 `builtinModels()` 先 `createModels()` 再注册 `builtinProviders()` 返回的 provider instances [E: packages/ai/src/providers/all.ts:2] [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:63] [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:112] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/providers/all.ts:114]。

`packages/ai/src/models.ts` 是 runtime collection 与计费 helper: `ModelsImpl.getModels()` / `getModel()` 读取 provider 的 model list, `refresh()` 在目标 provider 存在且暴露 `refreshModels()` 时委托刷新钩子, `calculateCost()` 用 `Model.cost` 和 `Usage` token counts 回填 `usage.cost` [E: packages/ai/src/models.ts:172] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:194] [E: packages/ai/src/models.ts:198] [E: packages/ai/src/models.ts:200] [E: packages/ai/src/models.ts:201] [E: packages/ai/src/models.ts:203] [E: packages/ai/src/models.ts:385] [E: packages/ai/src/models.ts:389] [E: packages/ai/src/models.ts:394]。

## 关键文件

- `packages/ai/src/models.generated.ts`: generated `MODELS` aggregator, 当前把 35 个 provider id 映射到 per-provider model catalog constant [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:41] [E: packages/ai/src/models.generated.ts:75] [I]。
- `packages/ai/src/models.ts`: runtime `Models` collection、`createProvider()` dispatch、`hasApi()` runtime narrowing、`calculateCost()` 和 thinking-level helpers [E: packages/ai/src/models.ts:79] [E: packages/ai/src/models.ts:323] [E: packages/ai/src/models.ts:381] [E: packages/ai/src/models.ts:385] [E: packages/ai/src/models.ts:399]。
- `packages/ai/src/providers/all.ts`: static built-in model helpers 与 built-in provider registration bridge [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:111]。
- `packages/ai/src/types.ts`: `Model<TApi>` 的字段 contract, 包括 `api`、`provider`、`cost`、context/token limits 和 optional compat/header fields [E: packages/ai/src/types.ts:666] [E: packages/ai/src/types.ts:669] [E: packages/ai/src/types.ts:670] [E: packages/ai/src/types.ts:679] [E: packages/ai/src/types.ts:685] [E: packages/ai/src/types.ts:686] [E: packages/ai/src/types.ts:687] [E: packages/ai/src/types.ts:689]。

## 数据模型

`MODELS` 是 generated provider-to-model-map: top-level key 是 provider id, value 是该 provider 的 model map constant, 例如 `"anthropic": ANTHROPIC_MODELS`、`"openai": OPENAI_MODELS`、`"openai-codex": OPENAI_CODEX_MODELS` [E: packages/ai/src/models.generated.ts:40] [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:62] [E: packages/ai/src/models.generated.ts:63]。这些 provider id keys 同时被 `getBuiltinProviders()` 用 `Object.keys(MODELS)` 暴露为 static catalog provider list [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:57]。

`Model<TApi>` 的核心字段把一个模型绑定到协议和 provider ownership: `api` 是 wire API key, `provider` 是 owning provider id, `baseUrl` 是 request base URL, `reasoning` 标识 reasoning capability, `input` 列出 text/image 输入 modality, `cost` 记录每百万 tokens 的 input/output/cacheRead/cacheWrite 单价, `contextWindow` 与 `maxTokens` 记录上下文和输出 token limit [E: packages/ai/src/types.ts:666] [E: packages/ai/src/types.ts:669] [E: packages/ai/src/types.ts:670] [E: packages/ai/src/types.ts:671] [E: packages/ai/src/types.ts:672] [E: packages/ai/src/types.ts:678] [E: packages/ai/src/types.ts:679] [E: packages/ai/src/types.ts:680] [E: packages/ai/src/types.ts:681] [E: packages/ai/src/types.ts:682] [E: packages/ai/src/types.ts:683] [E: packages/ai/src/types.ts:685] [E: packages/ai/src/types.ts:686]。

`Model.api` 与 `Model.provider` 分别驱动两个不同选择: `ModelsImpl.requireProvider()` 用 `model.provider` 找 provider instance, `createProvider()` 的 `apiFor()` 用 `model.api` 在 single implementation 或 by-API map 中选择 `ProviderStreams` [E: packages/ai/src/models.ts:222] [E: packages/ai/src/models.ts:223] [E: packages/ai/src/models.ts:331] [E: packages/ai/src/models.ts:337]。因此同一 provider 可以承载多个 wire API, 但每个 model row 必须同时有 provider ownership 与 API routing key [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:331] [I]。

## 控制流

1. Catalog generation: `generate-models.ts` creates provider catalog files and an aggregator; the aggregator output string starts with `export const MODELS = {`, appends each sorted provider id as a property, and writes `src/models.generated.ts` [E: packages/ai/scripts/generate-models.ts:2294] [E: packages/ai/scripts/generate-models.ts:2305] [E: packages/ai/scripts/generate-models.ts:2315] [E: packages/ai/scripts/generate-models.ts:2320] [E: packages/ai/scripts/generate-models.ts:2324] [E: packages/ai/scripts/generate-models.ts:2325] [E: packages/ai/scripts/generate-models.ts:2326] [E: packages/ai/scripts/generate-models.ts:2329]。
2. Static read: `getBuiltinModel(provider, modelId)` indexes `MODELS[provider]` and returns `models?.[modelId]` typed as `Model<BuiltinModelApi<...>>`; it does not query runtime `ModelsImpl` or provider instances [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:53] [I]。
3. Static enumeration: `getBuiltinModels(provider)` reads `MODELS[provider]`, returns `Object.values(models)` when present, and returns `[]` when the provider key is absent [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:63] [E: packages/ai/src/providers/all.ts:64] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:66]。
4. Runtime assembly: `builtinModels(options)` constructs a `MutableModels` collection with `createModels(options)`, loops over `builtinProviders()`, registers each provider via `models.setProvider(provider)`, and returns the collection [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:112] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/providers/all.ts:114] [E: packages/ai/src/providers/all.ts:116]。
5. Runtime lookup: `ModelsImpl.getModels(provider)` returns `[]` for an unknown provider id, catches throwing provider `getModels()` calls as `[]`, and `getModel(provider, id)` finds the first model whose `model.id` matches inside that provider list [E: packages/ai/src/models.ts:172] [E: packages/ai/src/models.ts:174] [E: packages/ai/src/models.ts:175] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:179] [E: packages/ai/src/models.ts:194] [E: packages/ai/src/models.ts:195]。
6. Runtime refresh: `ModelsImpl.refresh(provider)` calls `entry.refreshModels()` only when the named provider exists and exposes refresh; the all-provider path uses `Promise.allSettled()` across provider entries, so one rejecting dynamic source does not reject the aggregate refresh call [E: packages/ai/src/models.ts:198] [E: packages/ai/src/models.ts:200] [E: packages/ai/src/models.ts:201] [E: packages/ai/src/models.ts:203] [E: packages/ai/src/models.ts:213]。
7. Cost calculation: `calculateCost(model, usage)` treats `model.cost.*` as dollars per million tokens, calculates input/output/cacheRead directly from usage token counts, calculates cacheWrite from normal cache writes plus 1h cache writes at `2 * model.cost.input`, sums all components into `usage.cost.total`, then returns `usage.cost` [E: packages/ai/src/models.ts:385] [E: packages/ai/src/models.ts:387] [E: packages/ai/src/models.ts:388] [E: packages/ai/src/models.ts:389] [E: packages/ai/src/models.ts:390] [E: packages/ai/src/models.ts:391] [E: packages/ai/src/models.ts:392] [E: packages/ai/src/models.ts:393] [E: packages/ai/src/models.ts:394]。

## 设计动机与权衡

Static catalog read 与 runtime model collection 是两条路径: `getBuiltinModel()` / `getBuiltinModels()` 只读 generated metadata, 适合 catalog/query 用例; `builtinModels()` 返回包含 provider auth、refresh 与 stream behavior 的 collection, 适合真实请求路径 [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:63] [E: packages/ai/src/models.ts:65] [I]。

`calculateCost()` mutates and returns `usage.cost` instead of returning a detached object, so API modules can parse usage, call the helper, and keep the cost fields attached to the same `Usage` object passed through the stream output [E: packages/ai/src/models.ts:385] [E: packages/ai/src/models.ts:389] [E: packages/ai/src/models.ts:393] [E: packages/ai/src/models.ts:394] [I]。

`hasApi(model, api)` is the runtime narrowing escape hatch for dynamically looked-up models: it checks `model.api === api` and narrows `Model<Api>` to `Model<TApi>` for typed stream options [E: packages/ai/src/models.ts:381] [E: packages/ai/src/models.ts:382]。

## Gotcha

- `models.generated.ts` and provider `.models.ts` files are generator outputs written by `generate-models.ts`; update model metadata through `npm run generate-models` / `scripts/generate-models.ts`, not by treating the generated files as hand-written design sources [E: packages/ai/package.json:48] [E: packages/ai/scripts/generate-models.ts:2305] [E: packages/ai/scripts/generate-models.ts:2315] [E: packages/ai/scripts/generate-models.ts:2329] [I]。
- `getBuiltinModel()` can return `undefined` at runtime even though its TypeScript signature is `Model<...>`: the implementation returns `models?.[modelId as string]` and casts the result, with no runtime throw or fallback [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:51] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:53] [I]。
- `getBuiltinProviders()` reads generated `MODELS` keys, while `builtinProviders()` constructs provider instances from explicit provider factory calls; current source makes these adjacent but not a single shared data structure [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:57] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71] [I]。
- `ModelsImpl.getModels()` is best-effort and swallow-fail: unknown provider id and throwing provider `getModels()` both yield empty model lists rather than errors [E: packages/ai/src/models.ts:174] [E: packages/ai/src/models.ts:175] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:179]。
- The current index entry for this node only names `models.generated.ts` and `models.ts`, but requested concepts require `providers/all.ts` for `builtinModels()`/`getBuiltinModel()` and `types.ts` for `Model` fields; this node records the supporting files in frontmatter while leaving index reconciliation to a later metadata pass [U]。

## 跨包边界

[subsys.ai.provider-registry](provider-registry.md) owns provider membership and provider construction details: this node only explains how model discovery uses the provider registry helpers and runtime collection boundary [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:111] [I]。

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
