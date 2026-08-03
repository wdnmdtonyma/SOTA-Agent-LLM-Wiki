---
id: subsys.ai.model-discovery
title: 模型目录与发现
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/models.generated.ts
  - packages/ai/src/model-catalog.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/providers/openai.models.ts
  - packages/ai/src/providers/baseten.models.ts
  - packages/ai/src/types.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/models-dev-reasoning-options.ts
  - packages/ai/scripts/model-data.ts
  - packages/ai/scripts/check-model-data.ts
  - packages/ai/package.json
  - packages/ai/test/reasoning-options.test.ts
symbols:
  - MODELS
  - ModelCatalog
  - flattenModelCatalog
  - calculateCost
  - Model
  - getEffortThinkingLevelMap
related:
  - subsys.ai.provider-registry
  - ref.ai.model-catalog
evidence: explicit
status: verified
updated: 305c014dcc
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

`packages/ai/src/models.generated.ts` 是文字模型静态目录的 aggregator：它 import 38 个 `providers/<id>.models.ts` catalog，并把它们挂到 `MODELS` 的 provider key 下；本轮新增 `BASETEN_MODELS`。[E: packages/ai/src/models.generated.ts:4] [E: packages/ai/src/models.generated.ts:8] [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:48] [E: packages/ai/src/models.generated.ts:81] 每个 shard 现在只 import ignored `./data/<provider>.json`，再由 `ModelCatalog` / `flattenModelCatalog()` 提供 typed flattening；model value 不再内联于 TypeScript source [E: packages/ai/src/providers/baseten.models.ts:4] [E: packages/ai/src/providers/baseten.models.ts:7] [E: packages/ai/src/model-catalog.ts:15] [E: packages/ai/src/model-catalog.ts:22]。

`packages/ai/src/providers/all.ts` 是 built-in catalog helper 与 runtime provider assembly 的交叉点: `getBuiltinModel()` / `getBuiltinModels()` 直接读取 generated `MODELS`, 而 `builtinModels()` 先 `createModels()` 再注册 `builtinProviders()` 返回的 provider instances [E: packages/ai/src/providers/all.ts:2] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:64] [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:81] [E: packages/ai/src/providers/all.ts:133] [E: packages/ai/src/providers/all.ts:134] [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:136]。

`packages/ai/src/models.ts` 是 runtime collection 与计费 helper: `ModelsImpl.getModels()` / `getModel()` 读取 provider 的 model list；`refresh(options)` 并发刷新所有暴露 `refreshModels()` 的 provider，把 credential、per-provider store、network policy、force 与 abort signal 组成 context，并汇总 per-provider errors；`calculateCost()` 用 `Model.cost` 和 `Usage` token counts 回填 `usage.cost` [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:255] [E: packages/ai/src/models.ts:272] [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:279] [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:297] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:327] [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:653] [E: packages/ai/src/models.ts:658]。

## 关键文件

- `packages/ai/src/models.generated.ts`: generated `MODELS` aggregator，当前把 38 个 provider id 映射到 per-provider model catalog constant [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:81] [I]。
- `packages/ai/src/model-catalog.ts`: 用 imported JSON 的 API groups 推导 model id/api/provider literal types，再把 groups flatten 成运行时 map [E: packages/ai/src/model-catalog.ts:3] [E: packages/ai/src/model-catalog.ts:15] [E: packages/ai/src/model-catalog.ts:22]。
- `packages/ai/src/models.ts`: runtime `Models` collection、`createProvider()` dispatch、`hasApi()` runtime narrowing、`calculateCost()` 和 thinking-level helpers [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:556] [E: packages/ai/src/models.ts:635] [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:663]。
- `packages/ai/src/providers/all.ts`: static built-in model helpers 与 built-in provider registration bridge [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:88] [E: packages/ai/src/providers/all.ts:133]。
- `packages/ai/src/types.ts`: `Model<TApi>` 的字段 contract, 包括 `api`、`provider`、`cost`、context/token limits 和 optional compat/header fields [E: packages/ai/src/types.ts:765] [E: packages/ai/src/types.ts:768] [E: packages/ai/src/types.ts:769] [E: packages/ai/src/types.ts:383] [E: packages/ai/src/types.ts:779] [E: packages/ai/src/types.ts:780] [E: packages/ai/src/types.ts:781] [E: packages/ai/src/types.ts:783]。

## 数据模型

`MODELS` 是 generated provider-to-model-map: top-level key 是 provider id, value 是该 provider 的 model map constant, 例如 `"anthropic": ANTHROPIC_MODELS`、`"openai": OPENAI_MODELS`、`"openai-codex": OPENAI_CODEX_MODELS` [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:85] [E: packages/ai/src/models.generated.ts:105] [E: packages/ai/src/models.generated.ts:106]。这些 provider id keys 同时被 `getBuiltinProviders()` 用 `Object.keys(MODELS)` 暴露为 static catalog provider list [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:69]。

`Model<TApi>` 的核心字段把一个模型绑定到协议和 provider ownership: `api` 是 wire API key, `provider` 是 owning provider id, `baseUrl` 是 request base URL, `reasoning` 标识 reasoning capability, `input` 列出 text/image 输入 modality, `cost` 记录基础 input/output/cacheRead/cacheWrite 单价并可带 request-wide `tiers`, `contextWindow` 与 `maxTokens` 记录上下文和输出 token limit [E: packages/ai/src/types.ts:747] [E: packages/ai/src/types.ts:754] [E: packages/ai/src/types.ts:759] [E: packages/ai/src/types.ts:761] [E: packages/ai/src/types.ts:765] [E: packages/ai/src/types.ts:778] [E: packages/ai/src/types.ts:779] [E: packages/ai/src/types.ts:780]。

`Model.api` 与 `Model.provider` 分别驱动两个不同选择: `ModelsImpl.requireProvider()` 用 `model.provider` 找 provider instance, `createProvider()` 的 `apiFor()` 用 `model.api` 在 single implementation 或 by-API map 中选择 `ProviderStreams` [E: packages/ai/src/models.ts:455] [E: packages/ai/src/models.ts:456] [E: packages/ai/src/models.ts:574] [E: packages/ai/src/models.ts:580]。因此同一 provider 可以承载多个 wire API, 但每个 model row 必须同时有 provider ownership 与 API routing key [E: packages/ai/src/models.ts:547] [E: packages/ai/src/models.ts:574] [I]。

## 控制流

1. Catalog generation: `generate-models.ts` 为每个排序 provider 写一个只 import JSON data 的 structural shard，再生成带显式 readonly provider mapping 的 aggregator；data directory 通过 staging/rename 原子替换并调用 validator [E: packages/ai/scripts/generate-models.ts:2770] [E: packages/ai/scripts/generate-models.ts:2777] [E: packages/ai/scripts/generate-models.ts:2791] [E: packages/ai/scripts/generate-models.ts:2808] [E: packages/ai/scripts/generate-models.ts:2812]。
2. Static read: `getBuiltinModel(provider, modelId)` indexes `MODELS[provider]` and returns `models?.[modelId]` typed as `Model<BuiltinModelApi<...>>`; it does not query runtime `ModelsImpl` or provider instances [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:64] [E: packages/ai/src/providers/all.ts:65] [I]。
3. Static enumeration: `getBuiltinModels(provider)` reads `MODELS[provider]`, returns `Object.values(models)` when present, and returns `[]` when the provider key is absent [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:81] [E: packages/ai/src/providers/all.ts:82] [E: packages/ai/src/providers/all.ts:83] [E: packages/ai/src/providers/all.ts:84]。
4. Runtime assembly: `builtinModels(options)` constructs a `MutableModels` collection with `createModels(options)`, loops over `builtinProviders()`, registers each provider via `models.setProvider(provider)`, and returns the collection [E: packages/ai/src/providers/all.ts:133] [E: packages/ai/src/providers/all.ts:134] [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:138]。
5. Runtime lookup: `ModelsImpl.getModels(provider)` returns `[]` for an unknown provider id, catches throwing provider `getModels()` calls as `[]`, and `getModel(provider, id)` finds the first model whose `model.id` matches inside that provider list [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:252] [E: packages/ai/src/models.ts:253] [E: packages/ai/src/models.ts:255] [E: packages/ai/src/models.ts:257] [E: packages/ai/src/models.ts:272] [E: packages/ai/src/models.ts:273]。
6. Runtime refresh: `ModelsImpl.refresh(options)` selects every provider exposing `refreshModels`, runs them concurrently with `Promise.all()`, and gives each hook a credential plus provider-scoped `ModelsStore` adapter [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:279] [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:297]。Each task catches its own failure into the result's `errors` map and retries the same hook with `allowNetwork: false` to restore cached models best-effort, so one provider failure is reported without rejecting the aggregate refresh [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:327]。
7. Cost calculation: `calculateCost(model, usage)` 先用 `input + cacheRead + cacheWrite` 计算整请求 input usage，并选择 `inputTokensAbove` 小于该值的最高 tier；选中的四项 rates 应用于整请求，而不是只对超阈值部分计费 [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:640] [E: packages/ai/src/models.ts:643] [E: packages/ai/src/models.ts:644] [E: packages/ai/src/models.ts:645] [E: packages/ai/src/models.ts:646]。随后 input/output/cacheRead 按各 bucket 计费，1h cache write 使用选中 input rate 的 2 倍，最后汇总到 `usage.cost.total` [E: packages/ai/src/models.ts:651] [E: packages/ai/src/models.ts:653] [E: packages/ai/src/models.ts:657] [E: packages/ai/src/models.ts:658]。
8. Reasoning metadata generation: generator 先按 `provider:id` 记录 models.dev 的 `reasoning_options`，再只为直接支持 effort 的 adapter 合并 `thinkingLevelMap`：Anthropic 需 adaptive thinking；OpenAI Responses、Azure Responses、Codex Responses 直接支持；Completions 需 compat 同时满足 OpenAI thinking format 与 reasoning effort。[E: packages/ai/scripts/generate-models.ts:440] [E: packages/ai/scripts/generate-models.ts:446] [E: packages/ai/scripts/generate-models.ts:448] [E: packages/ai/scripts/generate-models.ts:452] [E: packages/ai/scripts/generate-models.ts:453] [E: packages/ai/scripts/generate-models.ts:455] [E: packages/ai/scripts/generate-models.ts:457] [E: packages/ai/scripts/generate-models.ts:461] [E: packages/ai/scripts/generate-models.ts:467] [E: packages/ai/scripts/generate-models.ts:470] [E: packages/ai/scripts/generate-models.ts:474] [E: packages/ai/scripts/generate-models.ts:2667] [E: packages/ai/scripts/generate-models.ts:2669]

`getEffortThinkingLevelMap()` 只把 verified `effort` values 映射成 selectable levels：`none` 映射 `off`，`minimal` 到 `max` 逐项保留；`default` / null 没有 Pi 等价值，`toggle` / `budget_tokens` 留给 adapter 自己处理，因此这些输入单独出现时不推导 map。[E: packages/ai/scripts/models-dev-reasoning-options.ts:3] [E: packages/ai/scripts/models-dev-reasoning-options.ts:7] [E: packages/ai/scripts/models-dev-reasoning-options.ts:9] [E: packages/ai/scripts/models-dev-reasoning-options.ts:18] [E: packages/ai/scripts/models-dev-reasoning-options.ts:19] [E: packages/ai/scripts/models-dev-reasoning-options.ts:20] [E: packages/ai/scripts/models-dev-reasoning-options.ts:23] [E: packages/ai/scripts/models-dev-reasoning-options.ts:25] [E: packages/ai/scripts/models-dev-reasoning-options.ts:27] [E: packages/ai/test/reasoning-options.test.ts:4] [E: packages/ai/test/reasoning-options.test.ts:19] [E: packages/ai/test/reasoning-options.test.ts:31] [E: packages/ai/test/reasoning-options.test.ts:34]

## 设计动机与权衡

Static catalog read 与 runtime model collection 是两条路径: `getBuiltinModel()` / `getBuiltinModels()` 只读 generated metadata, 适合 catalog/query 用例; `builtinModels()` 返回包含 provider auth、refresh 与 stream behavior 的 collection, 适合真实请求路径 [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:78] [E: packages/ai/src/providers/all.ts:133] [E: packages/ai/src/models.ts:89] [E: packages/ai/src/models.ts:63] [E: packages/ai/src/models.ts:113] [I]。

`calculateCost()` mutates and returns `usage.cost` instead of returning a detached object, so API modules can parse usage, call the helper, and keep the cost fields attached to the same `Usage` object passed through the stream output [E: packages/ai/src/models.ts:639] [E: packages/ai/src/models.ts:653] [E: packages/ai/src/models.ts:657] [E: packages/ai/src/models.ts:658] [I]。

`hasApi(model, api)` is the runtime narrowing escape hatch for dynamically looked-up models: it checks `model.api === api` and narrows `Model<Api>` to `Model<TApi>` for typed stream options [E: packages/ai/src/models.ts:635] [E: packages/ai/src/models.ts:636]。

`getSupportedThinkingLevels()` 的扩展顺序包含 `max`；与 `xhigh` 一样，只有 `thinkingLevelMap` 明确提供映射时才报告支持，避免把最高档默认宣称给所有 reasoning models [E: packages/ai/src/models.ts:661] [E: packages/ai/src/models.ts:663] [E: packages/ai/src/models.ts:669]。

## Gotcha

- `models.generated.ts`、provider `.models.ts` 与 ignored `providers/data/*.json` 是同一次生成的耦合输出；`build:offline` 会先校验 data manifest，再把 data 复制到 dist [E: packages/ai/package.json:52] [E: packages/ai/package.json:56] [E: packages/ai/package.json:58] [E: packages/ai/scripts/generate-models.ts:2808] [I]。
- `getBuiltinModel()` can return `undefined` at runtime even though its TypeScript signature is `Model<...>`: the implementation returns `models?.[modelId as string]` and casts the result, with no runtime throw or fallback [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:63] [E: packages/ai/src/providers/all.ts:64] [E: packages/ai/src/providers/all.ts:65] [I]。
- `getBuiltinProviders()` reads generated `MODELS` keys, while `builtinProviders()` constructs provider instances from explicit provider factory calls; current source makes these adjacent but not a single shared data structure [E: packages/ai/src/providers/all.ts:60] [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:88] [E: packages/ai/src/providers/all.ts:89] [I]。
- `ModelsImpl.getModels()` is best-effort and swallow-fail: unknown provider id and throwing provider `getModels()` both yield empty model lists rather than errors [E: packages/ai/src/models.ts:252] [E: packages/ai/src/models.ts:253] [E: packages/ai/src/models.ts:255] [E: packages/ai/src/models.ts:257]。

本次 `a8ee03b815 → c1019d9202` follow-up 明确修改 `models.generated.ts` 并新增 `baseten.models.ts` structural shard，使 membership 从 37 增至 38 个静态 bucket；Baseten generator 再为非 deprecated rows 生成 reasoning compat 与 `openai-completions` metadata。[E: packages/ai/src/models.generated.ts:8] [E: packages/ai/src/models.generated.ts:48] [E: packages/ai/src/models.generated.ts:87] [E: packages/ai/src/providers/baseten.models.ts:4] [E: packages/ai/src/providers/baseten.models.ts:7] [E: packages/ai/scripts/generate-models.ts:1094] [E: packages/ai/scripts/generate-models.ts:1143] [E: packages/ai/scripts/generate-models.ts:1179]

Generator 会读取 models.dev、OpenRouter、Vercel 与 NVIDIA 等远端目录，ignored `providers/data/*.json` 不在 target tree；因此今天在同一 commit 重跑 generator 可以得到不同 snapshot。Baseten 特别从 models.dev response 的 `data.baseten` 取所有非 deprecated rows，不要求 `tool_call` flag，再统一生成 `openai-completions` models。[E: packages/ai/scripts/generate-models.ts:1094] [E: packages/ai/scripts/generate-models.ts:1142] [E: packages/ai/scripts/generate-models.ts:1143] [E: packages/ai/scripts/generate-models.ts:1164] [E: packages/ai/scripts/generate-models.ts:1167] [E: packages/ai/scripts/generate-models.ts:1168] [E: packages/ai/scripts/generate-models.ts:1191] [E: packages/ai/scripts/generate-models.ts:1193] [E: packages/ai/scripts/generate-models.ts:1746] [I] 目标模型数必须绑定官方 artifact 与带 hash 的远端快照，不能仅由 aggregator 的 38 个 key 推导 model row 数。

## 跨包边界

[subsys.ai.provider-registry](provider-registry.md) owns provider membership and provider construction details: this node only explains how model discovery uses the provider registry helpers and runtime collection boundary [E: packages/ai/src/providers/all.ts:88] [E: packages/ai/src/providers/all.ts:133] [I]。

[ref.ai.model-catalog](../../reference/model-catalog.md) should enumerate generated model rows; this node documents the mechanics around the generated catalog, not every model id or provider-specific model capability row [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:120] [I]。

## Sources

- packages/ai/src/models.generated.ts
- packages/ai/src/model-catalog.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openai.models.ts
- packages/ai/src/providers/baseten.models.ts
- packages/ai/src/types.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/models-dev-reasoning-options.ts
- packages/ai/scripts/model-data.ts
- packages/ai/scripts/check-model-data.ts
- packages/ai/package.json
- packages/ai/test/reasoning-options.test.ts

## 相关

- [subsys.ai.provider-registry](provider-registry.md): provider factory registry, runtime provider construction, and provider membership ground truth.
- [ref.ai.model-catalog](../../reference/model-catalog.md): generated model metadata catalog that should enumerate individual model rows.
