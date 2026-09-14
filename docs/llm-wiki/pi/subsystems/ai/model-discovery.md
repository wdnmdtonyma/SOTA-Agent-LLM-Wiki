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
  - packages/ai/src/api/google-shared.ts
  - packages/ai/src/providers/xai.ts
  - packages/ai/src/utils/deferred-tools.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/models-dev-reasoning-options.ts
  - packages/ai/scripts/openrouter-reasoning-options.ts
  - packages/ai/scripts/model-data.ts
  - packages/ai/scripts/check-model-data.ts
  - packages/ai/package.json
  - packages/ai/test/reasoning-options.test.ts
  - packages/ai/test/fireworks-models.test.ts
  - packages/ai/test/fireworks-deferred-tools.test.ts
symbols:
  - MODELS
  - ModelCatalog
  - flattenModelCatalog
  - calculateCost
  - Model
  - getBuiltinModel
  - builtinProviders
  - builtinModels
  - getEffortThinkingLevelMap
  - getOpenRouterThinkingLevelMap
related:
  - subsys.ai.provider-registry
  - ref.ai.model-catalog
evidence: explicit
status: verified
updated: 71dca871bc
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

`packages/ai/src/models.generated.ts` 是文字模型静态目录的 aggregator：它 import **39** 个 `providers/<id>.models.ts` catalog，并把它们挂到 `MODELS` 的 provider key 下。type 面从 `"amazon-bedrock"` 到 `"zai-coding-cn"`，value 面同样 39 个 bucket；没有 `radius`。[E: packages/ai/src/models.generated.ts:4] [E: packages/ai/src/models.generated.ts:44] [E: packages/ai/src/models.generated.ts:45] [E: packages/ai/src/models.generated.ts:83] [E: packages/ai/src/models.generated.ts:85] [E: packages/ai/src/models.generated.ts:123] 每个 shard 只 import ignored `./data/<provider>.json`，再由 `ModelCatalog` / `flattenModelCatalog()` 提供 typed flattening；model value 不再内联于 TypeScript source [E: packages/ai/src/providers/baseten.models.ts:4] [E: packages/ai/src/providers/baseten.models.ts:7] [E: packages/ai/src/model-catalog.ts:15] [E: packages/ai/src/model-catalog.ts:22]。

`packages/ai/src/providers/all.ts` 是 built-in catalog helper 与 runtime provider assembly 的交叉点。`BuiltinProvider` 等于 `keyof typeof MODELS`（39 个静态 key）[E: packages/ai/src/providers/all.ts:53]。`getBuiltinModel()` / `getBuiltinModels()` 直接读取 generated `MODELS` [E: packages/ai/src/providers/all.ts:2] [E: packages/ai/src/providers/all.ts:61] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:79]。`builtinProviders()` 构造 **40** 个 fresh provider instance：数组从 `amazonBedrockProvider()` 到 `zaiCodingCnProvider()`，并在 Individual Token Plan 与 Together 之间插入 `radiusProvider()` [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:91] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:122] [E: packages/ai/src/providers/all.ts:130]。`builtinModels()` 先 `createModels()` 再逐个 `setProvider()` [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:137] [E: packages/ai/src/providers/all.ts:138]。

`packages/ai/src/models.ts` 是 runtime collection 与计费 helper: `ModelsImpl.getModels()` / `getModel()` 读取 provider 的 model list；`refresh(options)` 并发刷新所有暴露 `refreshModels()` 的 provider，把 credential、per-provider store、network policy、force 与 abort signal 组成 context，并汇总 per-provider errors；`calculateCost()` 用 `Model.cost` 和 `Usage` token counts 回填 `usage.cost` [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:321] [E: packages/ai/src/models.ts:391] [E: packages/ai/src/models.ts:397] [E: packages/ai/src/models.ts:381] [E: packages/ai/src/models.ts:427] [E: packages/ai/src/models.ts:891] [E: packages/ai/src/models.ts:905] [E: packages/ai/src/models.ts:910]。

## 关键文件

- `packages/ai/src/models.generated.ts`: generated `MODELS` aggregator，当前把 39 个 provider id 映射到 per-provider model catalog constant [E: packages/ai/src/models.generated.ts:44] [E: packages/ai/src/models.generated.ts:83]。
- `packages/ai/scripts/openrouter-reasoning-options.ts`: 把 OpenRouter `reasoning` metadata 转成 Pi `thinkingLevelMap`；`supported_efforts` 复用 `getEffortThinkingLevelMap()`，`mandatory === true` 时 `off: null` [E: packages/ai/scripts/openrouter-reasoning-options.ts:12] [E: packages/ai/scripts/openrouter-reasoning-options.ts:16] [E: packages/ai/scripts/openrouter-reasoning-options.ts:20] [E: packages/ai/scripts/openrouter-reasoning-options.ts:22]。
- `packages/ai/src/model-catalog.ts`: 用 imported JSON 的 API groups 推导 model id/api/provider literal types，再把 groups flatten 成运行时 map [E: packages/ai/src/model-catalog.ts:3] [E: packages/ai/src/model-catalog.ts:15] [E: packages/ai/src/model-catalog.ts:22]。
- `packages/ai/src/models.ts`: runtime `Models` collection、`createProvider()` dispatch、`hasApi()` runtime narrowing、`calculateCost()` 和 thinking-level helpers [E: packages/ai/src/models.ts:156] [E: packages/ai/src/models.ts:775] [E: packages/ai/src/models.ts:887] [E: packages/ai/src/models.ts:891] [E: packages/ai/src/models.ts:915]。
- `packages/ai/src/providers/all.ts`: static built-in model helpers 与 built-in provider registration bridge [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:61] [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:135]。
- `packages/ai/src/types.ts`: `Model<TApi>` 的字段 contract, 包括 `api`、`provider`、`cost`、context/token limits 和 optional compat/header fields [E: packages/ai/src/types.ts:845] [E: packages/ai/src/types.ts:848] [E: packages/ai/src/types.ts:849] [E: packages/ai/src/types.ts:858] [E: packages/ai/src/types.ts:859] [E: packages/ai/src/types.ts:860] [E: packages/ai/src/types.ts:865]。
- `packages/ai/scripts/generate-models.ts`: catalog generator。Fireworks Messages 写 `supportsToolReferences: true`；官方 DeepSeek / Codex 行是硬编码数组，不走 models.dev 的 provider loop [E: packages/ai/scripts/generate-models.ts:1426] [E: packages/ai/scripts/generate-models.ts:2643] [E: packages/ai/scripts/generate-models.ts:2775]。

## 数据模型

`MODELS` 是 generated provider-to-model-map: top-level key 是 provider id, value 是该 provider 的 model map constant, 例如 `"anthropic": ANTHROPIC_MODELS`、`"openai": OPENAI_MODELS`、`"openai-codex": OPENAI_CODEX_MODELS` [E: packages/ai/src/models.generated.ts:44] [E: packages/ai/src/models.generated.ts:87] [E: packages/ai/src/models.generated.ts:107] [E: packages/ai/src/models.generated.ts:108]。这些 provider id keys 同时被 `getBuiltinProviders()` 用 `Object.keys(MODELS)` 暴露为 static catalog provider list [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:70]。`builtinProviders()` 构造 provider instances，比 `MODELS` 多一个 Radius [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:121]。

`Model<TApi>` 的核心字段把一个模型绑定到协议和 provider ownership: `api` 是 wire API key, `provider` 是 owning provider id, `baseUrl` 是 request base URL, `reasoning` 标识 reasoning capability, `input` 列出 text/image 输入 modality, `cost` 记录基础 input/output/cacheRead/cacheWrite 单价并可带 request-wide `tiers`, `contextWindow` 与 `maxTokens` 记录上下文和输出 token limit [E: packages/ai/src/types.ts:845] [E: packages/ai/src/types.ts:848] [E: packages/ai/src/types.ts:849] [E: packages/ai/src/types.ts:850] [E: packages/ai/src/types.ts:851] [E: packages/ai/src/types.ts:857] [E: packages/ai/src/types.ts:858] [E: packages/ai/src/types.ts:859] [E: packages/ai/src/types.ts:860]。

`Model.api` 与 `Model.provider` 分别驱动两个不同选择: `ModelsImpl.requireProvider()` 用 `model.provider` 找 provider instance, `createProvider()` 的 `apiFor()` 用 `model.api` 在 single implementation 或 by-API map 中选择 `ProviderStreams` [E: packages/ai/src/models.ts:633] [E: packages/ai/src/models.ts:634] [E: packages/ai/src/models.ts:792] [E: packages/ai/src/models.ts:798]。因此同一 provider 可以承载多个 wire API, 但每个 model row 必须同时有 provider ownership 与 API routing key [I]。

## 控制流

1. Catalog generation: `generate-models.ts` 为每个排序 provider 写一个只 import JSON data 的 structural shard，再生成带显式 readonly provider mapping 的 aggregator；data directory 通过 staging/rename 原子替换并调用 validator [E: packages/ai/scripts/generate-models.ts:3057] [E: packages/ai/scripts/generate-models.ts:3059] [E: packages/ai/scripts/generate-models.ts:3065] [E: packages/ai/scripts/generate-models.ts:3084] [E: packages/ai/scripts/generate-models.ts:3091] [E: packages/ai/scripts/generate-models.ts:3092]。
2. Static read: `getBuiltinModel(provider, modelId)` indexes `MODELS[provider]` and returns `models?.[modelId]` typed as `Model<BuiltinModelApi<...>>`; it does not query runtime `ModelsImpl` or provider instances [E: packages/ai/src/providers/all.ts:61] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:66] [I]。
3. Static enumeration: `getBuiltinModels(provider)` reads `MODELS[provider]`, returns `Object.values(models)` when present, and returns `[]` when the provider key is absent [E: packages/ai/src/providers/all.ts:79] [E: packages/ai/src/providers/all.ts:82] [E: packages/ai/src/providers/all.ts:83] [E: packages/ai/src/providers/all.ts:84] [E: packages/ai/src/providers/all.ts:85]。
4. Runtime assembly: `builtinModels(options)` constructs a `MutableModels` collection with `createModels(options)`, loops over `builtinProviders()`, registers each provider via `models.setProvider(provider)`, and returns the collection [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:137] [E: packages/ai/src/providers/all.ts:138] [E: packages/ai/src/providers/all.ts:140]。
5. Runtime lookup: `ModelsImpl.getModels(provider)` returns `[]` for an unknown provider id, catches throwing provider `getModels()` calls as `[]`, and `getModel(provider, id)` finds the first model whose `model.id` matches inside that provider list [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:301] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:306] [E: packages/ai/src/models.ts:321] [E: packages/ai/src/models.ts:322]。
6. Runtime refresh: `ModelsImpl.refresh(options)` selects every provider exposing `refreshModels` and runs them concurrently with `Promise.all()` [E: packages/ai/src/models.ts:391] [E: packages/ai/src/models.ts:402]。Each task always restores cached provider state first via `runProviderRefreshPhase(..., allowNetwork: false)`，then if network is allowed runs a second phase with resolved credential [E: packages/ai/src/models.ts:416] [E: packages/ai/src/models.ts:418] [E: packages/ai/src/models.ts:422]。`catch` 只把失败写入 `errors` map，不会再调用 hook，所以单个 provider 失败不会拒绝整次 refresh [E: packages/ai/src/models.ts:427] [E: packages/ai/src/models.ts:429]。
7. Cost calculation: `calculateCost(model, usage)` 先用 `input + cacheRead + cacheWrite` 计算整请求 input usage，并选择 `inputTokensAbove` 小于该值的最高 tier；选中的四项 rates 应用于整请求，而不是只对超阈值部分计费 [E: packages/ai/src/models.ts:891] [E: packages/ai/src/models.ts:892] [E: packages/ai/src/models.ts:895] [E: packages/ai/src/models.ts:896] [E: packages/ai/src/models.ts:897] [E: packages/ai/src/models.ts:898]。随后 input/output/cacheRead 按各 bucket 计费，1h cache write 使用选中 input rate 的 2 倍，最后汇总到 `usage.cost.total` [E: packages/ai/src/models.ts:903] [E: packages/ai/src/models.ts:905] [E: packages/ai/src/models.ts:906] [E: packages/ai/src/models.ts:907] [E: packages/ai/src/models.ts:908] [E: packages/ai/src/models.ts:909]。
8. Reasoning metadata generation: generator 先按 `provider:id` 记录 models.dev 的 `reasoning_options`，再只为直接支持 effort 的 adapter 合并 `thinkingLevelMap`：Anthropic 需 adaptive thinking；OpenAI Responses、Azure Responses、Codex Responses 直接支持；Completions 需 compat 同时满足 OpenAI thinking format 与 reasoning effort。[E: packages/ai/scripts/generate-models.ts:490] [E: packages/ai/scripts/generate-models.ts:496] [E: packages/ai/scripts/generate-models.ts:497] [E: packages/ai/scripts/generate-models.ts:499] [E: packages/ai/scripts/generate-models.ts:511] [E: packages/ai/scripts/generate-models.ts:514] [E: packages/ai/scripts/generate-models.ts:516] [E: packages/ai/scripts/generate-models.ts:518] [E: packages/ai/scripts/generate-models.ts:2948]
9. OpenRouter reasoning options: `fetchOpenRouterModels()` 把远端 `model.reasoning` 交给 `getOpenRouterThinkingLevelMap()`，有 map 时写入 model row [E: packages/ai/scripts/generate-models.ts:1140] [E: packages/ai/scripts/generate-models.ts:1172] [E: packages/ai/scripts/openrouter-reasoning-options.ts:12]。
10. Google `thinkingLevelMap` 由 `applyThinkingLevelMetadata()` 写入：Gemini 3 Flash 只有 `{off:null}`；`LOW` / `HIGH` / `MINIMAL` 字面量分别给 Gemini 3 Pro（`low`/`high`）和 Gemma 4（`minimal`/`high`），供 `resolveGoogleThinkingLevel()` 消费 [E: packages/ai/scripts/generate-models.ts:975] [E: packages/ai/scripts/generate-models.ts:976] [E: packages/ai/scripts/generate-models.ts:978] [E: packages/ai/scripts/generate-models.ts:979] [E: packages/ai/scripts/generate-models.ts:981] [E: packages/ai/src/api/google-shared.ts:32] [E: packages/ai/src/api/google-shared.ts:38]。
11. xAI 生成行固定 `api: "openai-responses"` 与 `XAI_RESPONSES_COMPAT`；没有 verified effort options 时 `off`/`minimal` 标 `null` [E: packages/ai/scripts/generate-models.ts:443] [E: packages/ai/scripts/generate-models.ts:1878] [E: packages/ai/scripts/generate-models.ts:1881] [E: packages/ai/scripts/generate-models.ts:917] [E: packages/ai/src/providers/xai.ts:7] [E: packages/ai/src/providers/xai.ts:22]。
12. Cloudflare AI Gateway catalog：`workers-ai` upstream 走 `openai-completions` + compat base，id 保留 `workers-ai/${modelId}`；若 models.dev 的 gateway 列表漏了该前缀，生成器从 Workers AI catalog 镜像补行 [E: packages/ai/scripts/generate-models.ts:1798] [E: packages/ai/scripts/generate-models.ts:1799] [E: packages/ai/scripts/generate-models.ts:1801] [E: packages/ai/scripts/generate-models.ts:1843]。
13. Anthropic server-side fallback metadata：`ANTHROPIC_ALLOWED_FALLBACK_MODELS` 把 `claude-fable-5` 映射到 `claude-opus-4-8` / `claude-opus-5`，把 `claude-opus-5` 映射到 `claude-opus-4-8`；`applyAnthropicAllowedFallbackModelMetadata()` 把目标行的 `provider` / `id` / `cost` 写入 `compat.allowedFallbackModels` [E: packages/ai/scripts/generate-models.ts:274] [E: packages/ai/scripts/generate-models.ts:275] [E: packages/ai/scripts/generate-models.ts:276] [E: packages/ai/scripts/generate-models.ts:786] [E: packages/ai/scripts/generate-models.ts:798] [E: packages/ai/scripts/generate-models.ts:2955]。
14. Fireworks `processFireworksModels()`：id 含 `glm-` 或 `kimi-k3` 的行走 `openai-completions`（Kimi K3 另带 `deferredToolsMode: "kimi"` [E: packages/ai/scripts/generate-models.ts:1443]）；其余行走 `anthropic-messages`，并把 `supportsToolReferences` 设为 `true`。Messages 行在 models.dev 标了 effort、或 id 落在 `FIREWORKS_ADAPTIVE_THINKING_FALLBACK_MODELS`（含 Fireworks 侧 `deepseek-v4-flash-0731` / `deepseek-v4-flash-vision-exp` / Qwen3.8）时写 `forceAdaptiveThinking: true`。`glm-5p2` 去掉 low/medium alias；`kimi-k3` 去掉 medium alias。[E: packages/ai/scripts/generate-models.ts:1426] [E: packages/ai/scripts/generate-models.ts:1469] [E: packages/ai/scripts/generate-models.ts:1472] [E: packages/ai/scripts/generate-models.ts:1476] [E: packages/ai/scripts/generate-models.ts:1479] [E: packages/ai/scripts/generate-models.ts:1486] [E: packages/ai/scripts/generate-models.ts:293] [E: packages/ai/scripts/generate-models.ts:294] [E: packages/ai/scripts/generate-models.ts:295] [E: packages/ai/scripts/generate-models.ts:1498] [E: packages/ai/scripts/generate-models.ts:1499] [E: packages/ai/scripts/generate-models.ts:1030] [E: packages/ai/scripts/generate-models.ts:1033] [E: packages/ai/scripts/generate-models.ts:1035] [E: packages/ai/scripts/generate-models.ts:1037] [E: packages/ai/test/fireworks-models.test.ts:22] [E: packages/ai/test/fireworks-models.test.ts:25] [E: packages/ai/test/fireworks-models.test.ts:108]
15. GitHub Copilot：生成器把全部 `gpt-*`（以及 `grok-` / `oswe` / `mai-`）路由到 `openai-responses`；Claude 4.x/5.x 仍走 `anthropic-messages`。[E: packages/ai/scripts/generate-models.ts:2144] [E: packages/ai/scripts/generate-models.ts:2148] [E: packages/ai/scripts/generate-models.ts:2153] [E: packages/ai/scripts/generate-models.ts:2156]
16. DeepSeek 官方 bucket 不读 models.dev 的 `data.deepseek` loop；生成器只 `push` 两行硬编码：`deepseek-flash`（显示名 DeepSeek V4.1 Flash，`input: ["text","image"]`，`thinkingLevelMap: DEEPSEEK_V4_FLASH_THINKING_LEVEL_MAP`，cost 0.3/1.2/0.006）与 `deepseek-v4-pro`（text-only，cost 1.32/3.96/0.044）。该数组不再出现 `deepseek-v4-flash` 或 `deepseek-v4-flash-vision-exp`。[E: packages/ai/scripts/generate-models.ts:2641] [E: packages/ai/scripts/generate-models.ts:2643] [E: packages/ai/scripts/generate-models.ts:2644] [E: packages/ai/scripts/generate-models.ts:2649] [E: packages/ai/scripts/generate-models.ts:2650] [E: packages/ai/scripts/generate-models.ts:2653] [E: packages/ai/scripts/generate-models.ts:2654] [E: packages/ai/scripts/generate-models.ts:2655] [E: packages/ai/scripts/generate-models.ts:2663] [E: packages/ai/scripts/generate-models.ts:2669] [E: packages/ai/scripts/generate-models.ts:2672] [E: packages/ai/scripts/generate-models.ts:2673] [E: packages/ai/scripts/generate-models.ts:2674]
17. OpenAI Codex 同样只有显式数组：`gpt-6-astra`、`gpt-5.3-codex-spark`、`gpt-5.5`、`gpt-5.6-luna`、`gpt-5.6-sol`、`gpt-5.6-terra`，全部 `api: "openai-codex-responses"`。`provider: "openai-codex"` 只出现在这 6 行，因此 catalog 不再硬编码 `gpt-5.4` / `gpt-5.4-mini`。[E: packages/ai/scripts/generate-models.ts:2773] [E: packages/ai/scripts/generate-models.ts:2775] [E: packages/ai/scripts/generate-models.ts:2777] [E: packages/ai/scripts/generate-models.ts:2787] [E: packages/ai/scripts/generate-models.ts:2799] [E: packages/ai/scripts/generate-models.ts:2811] [E: packages/ai/scripts/generate-models.ts:2823] [E: packages/ai/scripts/generate-models.ts:2835]

`getEffortThinkingLevelMap()` 只把 verified `effort` values 映射成 selectable levels：`none` 映射 `off`，`minimal` 到 `max` 逐项保留；`default` / null 没有 Pi 等价值，`toggle` / `budget_tokens` 留给 adapter 自己处理，因此这些输入单独出现时不推导 map。[E: packages/ai/scripts/models-dev-reasoning-options.ts:3] [E: packages/ai/scripts/models-dev-reasoning-options.ts:18] [E: packages/ai/scripts/models-dev-reasoning-options.ts:19] [E: packages/ai/scripts/models-dev-reasoning-options.ts:20] [E: packages/ai/scripts/models-dev-reasoning-options.ts:25] [E: packages/ai/scripts/models-dev-reasoning-options.ts:27] [E: packages/ai/test/reasoning-options.test.ts:4] [E: packages/ai/test/reasoning-options.test.ts:19] [E: packages/ai/test/reasoning-options.test.ts:31] [E: packages/ai/test/reasoning-options.test.ts:34]

Fireworks Messages 的 Pi 侧 deferred-tool 分割只看 `supportsToolReferences` 布尔值：`splitDeferredTools()` 用 transcript 里的 `addedToolNames` 决定哪些 schema 标 `defer_loading`，不按 loader 名过滤 [E: packages/ai/src/utils/deferred-tools.ts:8] [E: packages/ai/src/utils/deferred-tools.ts:15] [E: packages/ai/src/utils/deferred-tools.ts:25]。单测对 `ToolSearch` / `tool_search` / `discover_tools` 都会发出 `defer_loading: true` [E: packages/ai/test/fireworks-deferred-tools.test.ts:75] [E: packages/ai/test/fireworks-deferred-tools.test.ts:88]。Fireworks 上游只对 `ToolSearch` / `tool_search` 做 prompt-prefix cache deferral；其它 loader 名仍能工作，但 loaded schema 会进入初始 tool prefix，失去 cache 收益 [I]。这不改变 API 路由：GLM / Kimi K3 仍是 Completions，不是 Messages [E: packages/ai/scripts/generate-models.ts:1472] [E: packages/ai/scripts/generate-models.ts:1479] [E: packages/ai/test/fireworks-models.test.ts:108]。

## 设计动机与权衡

Static catalog read 与 runtime model collection 是两条路径: `getBuiltinModel()` / `getBuiltinModels()` 只读 generated metadata, 适合 catalog/query 用例; `builtinModels()` 返回包含 provider auth、refresh 与 stream behavior 的 collection, 适合真实请求路径 [E: packages/ai/src/providers/all.ts:61] [E: packages/ai/src/providers/all.ts:79] [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:111] [E: packages/ai/src/models.ts:136] [I]。

`calculateCost()` mutates and returns `usage.cost` instead of returning a detached object, so API modules can parse usage, call the helper, and keep the cost fields attached to the same `Usage` object passed through the stream output [E: packages/ai/src/models.ts:891] [E: packages/ai/src/models.ts:905] [E: packages/ai/src/models.ts:909] [E: packages/ai/src/models.ts:910] [I]。

`hasApi(model, api)` is the runtime narrowing escape hatch for dynamically looked-up models: it checks `model.api === api` and narrows `Model<Api>` to `Model<TApi>` for typed stream options [E: packages/ai/src/models.ts:887] [E: packages/ai/src/models.ts:888]。

`getSupportedThinkingLevels()` 的扩展顺序包含 `max`；与 `xhigh` 一样，只有 `thinkingLevelMap` 明确提供映射时才报告支持，避免把最高档默认宣称给所有 reasoning models [E: packages/ai/src/models.ts:913] [E: packages/ai/src/models.ts:915] [E: packages/ai/src/models.ts:921]。

## Gotcha

- `models.generated.ts`、provider `.models.ts` 与 ignored `providers/data/*.json` 是同一次生成的耦合输出；`build:offline` 会先校验 data manifest，再把 data 复制到 dist [E: packages/ai/package.json:56] [E: packages/ai/package.json:60] [E: packages/ai/package.json:62] [E: packages/ai/scripts/generate-models.ts:3092] [I]。
- `getBuiltinModel()` can return `undefined` at runtime even though its TypeScript signature is `Model<...>`: the implementation returns `models?.[modelId as string]` and casts the result, with no runtime throw or fallback [E: packages/ai/src/providers/all.ts:61] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:66] [I]。
- `getBuiltinProviders()` reads generated `MODELS` keys（39），while `builtinProviders()` constructs provider instances from explicit factory calls（40，含 Radius）；两者相邻但不是同一数据结构 [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:121] [I]。
- `ModelsImpl.getModels()` is best-effort and swallow-fail: unknown provider id and throwing provider `getModels()` both yield empty model lists rather than errors [E: packages/ai/src/models.ts:301] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:306]。

目标 `71dca871bc` / v0.85.1 Unreleased 未新增 structural bucket：`MODELS` 仍是 39 个 key，runtime providers 仍是 40。本轮可核的生成器增量：官方 DeepSeek 硬编码改为 `deepseek-flash` + `deepseek-v4-pro`；Codex 显式列表只剩 6 个 id（`gpt-6-astra` 仍在，不再硬编码 `gpt-5.4` / `gpt-5.4-mini`）；Fireworks Messages 写 `supportsToolReferences: true`；`grok-build-0.1` 仍在 `XAI_BUILTIN_EXCLUDED_MODEL_IDS`；Copilot 全部 `gpt-*` 走 `openai-responses`。flattened row 仍只存在于 gitignored JSON。[E: packages/ai/src/models.generated.ts:44] [E: packages/ai/src/models.generated.ts:83] [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/scripts/generate-models.ts:2643] [E: packages/ai/scripts/generate-models.ts:2663] [E: packages/ai/scripts/generate-models.ts:2775] [E: packages/ai/scripts/generate-models.ts:1426] [E: packages/ai/scripts/generate-models.ts:440] [E: packages/ai/scripts/generate-models.ts:2148] [I]

Generator 会读取 models.dev、OpenRouter、Vercel 与 NVIDIA 等远端目录，ignored `providers/data/*.json` 不在 target tree；因此今天在同一 commit 重跑 generator 可以得到不同 snapshot。[E: packages/ai/scripts/generate-models.ts:1140] [E: packages/ai/scripts/generate-models.ts:1172] [I] 目标模型数必须绑定官方 artifact 与带时间/hash 的远端快照，不能仅由 aggregator 的 39 个 key 推导 model row 数。

`qwen-token-plan-individual` allowlist 仍含 `deepseek-v4-flash-0731`；那是国际 Token Plan 的过滤 id，不是官方 DeepSeek bucket 行 [E: packages/ai/scripts/generate-models.ts:320] [E: packages/ai/scripts/generate-models.ts:2405] [E: packages/ai/scripts/generate-models.ts:2407]。Fireworks fallback set 里的 `accounts/fireworks/models/deepseek-v4-flash-vision-exp` 同样只作用于 Fireworks Messages，不进官方 DeepSeek 硬编码数组 [E: packages/ai/scripts/generate-models.ts:295]。

## 跨包边界

[subsys.ai.provider-registry](provider-registry.md) owns provider membership and provider construction details: this node only explains how model discovery uses the provider registry helpers and runtime collection boundary [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:135] [I]。

[ref.ai.model-catalog](../../reference/model-catalog.md) 记录 39 个 bucket 结构、官方 DeepSeek / Codex 硬编码 id 与 Individual allowlist；本节点写 catalog 装配、refresh 与 generator reasoning / Fireworks deferred-tool metadata，不枚举 gitignored JSON 里的上千模型 [E: packages/ai/src/models.generated.ts:44] [E: packages/ai/src/models.generated.ts:123] [I]。

## Sources

- packages/ai/src/models.generated.ts
- packages/ai/src/model-catalog.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openai.models.ts
- packages/ai/src/providers/baseten.models.ts
- packages/ai/src/types.ts
- packages/ai/src/api/google-shared.ts
- packages/ai/src/providers/xai.ts
- packages/ai/src/utils/deferred-tools.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/models-dev-reasoning-options.ts
- packages/ai/scripts/openrouter-reasoning-options.ts
- packages/ai/scripts/model-data.ts
- packages/ai/scripts/check-model-data.ts
- packages/ai/package.json
- packages/ai/test/reasoning-options.test.ts
- packages/ai/test/fireworks-models.test.ts
- packages/ai/test/fireworks-deferred-tools.test.ts

## 相关

- [subsys.ai.provider-registry](provider-registry.md): provider factory registry, runtime provider construction, and provider membership ground truth.
- [ref.ai.model-catalog](../../reference/model-catalog.md): generated model metadata catalog that should enumerate individual model rows.
