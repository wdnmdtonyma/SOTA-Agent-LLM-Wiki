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
  - packages/ai/src/utils/model-operations.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/providers/openai.models.ts
  - packages/ai/src/providers/baseten.models.ts
  - packages/ai/src/providers/openrouter.models.ts
  - packages/ai/src/providers/typesafe.models.ts
  - packages/ai/src/providers/radius.models.ts
  - packages/ai/src/providers/radius.ts
  - packages/ai/src/types.ts
  - packages/ai/src/api/google-shared.ts
  - packages/ai/src/providers/xai.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/models-dev-reasoning-options.ts
  - packages/ai/scripts/openrouter-reasoning-options.ts
  - packages/ai/scripts/model-data.ts
  - packages/ai/scripts/check-model-data.ts
  - packages/ai/package.json
  - packages/ai/test/reasoning-options.test.ts
  - packages/ai/test/fireworks-models.test.ts
  - packages/ai/test/images-models.test.ts
  - packages/ai/test/classifier-models.test.ts
symbols:
  - MODELS
  - IMAGE_MODELS
  - CLASSIFIER_MODELS
  - getBuiltinModel
  - getBuiltinImageModel
  - getBuiltinClassifierModel
  - getAllBuiltinModels
  - builtinProviders
  - builtinModels
  - calculateCost
  - flattenChatModelCatalog
related:
  - subsys.ai.provider-registry
  - ref.ai.model-catalog
  - subsys.ai.image-generation
  - ref.ai.image-models
evidence: explicit
status: verified
updated: ff72faba28
---

> `model-discovery` 是 `pi-ai` 的模型目录边界：generated 同时导出 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS`；未限定 type 的读取仍是 chat-only；`getBuiltinImageModel` / `getBuiltinClassifierModel` / `getAllBuiltinModels` 按 type 取；catalog data schema 是 v6。

## 能回答的问题

- generated `MODELS` catalog 的 provider key 与 per-provider model map 在哪里汇总?
- `IMAGE_MODELS` / `CLASSIFIER_MODELS` 与 `MODELS` 如何对齐，同一 upstream id 怎样分行?
- `getBuiltinModel()` / `getBuiltinImageModel()` / `getBuiltinClassifierModel()` 读的是静态 catalog 还是 runtime collection?
- 为什么 `getModel()` / `getBuiltinModels()` 看不到图像和分类器?
- `builtinModels()` 如何从内置 provider factories 组装可查询的 `Models` collection?
- `calculateCost()` 如何用 model cost metadata 写回 usage cost?
- 更新模型目录时为什么不能直接手改 `models.generated.ts`，schema v6 校验什么?

## 职责边界

`packages/ai/src/models.generated.ts` 是静态目录 aggregator：它 import **42** 个 `providers/<id>.models.ts` shard，并把每个 shard 的三种 catalog 分别挂到 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS`。type 面从 `"amazon-bedrock"` 到 `"zai-coding-cn"`，value 面同样 42 个 bucket，含 `meta`、`typesafe`、`radius` [E: packages/ai/src/models.generated.ts:47] [E: packages/ai/src/models.generated.ts:64] [E: packages/ai/src/models.generated.ts:79] [E: packages/ai/src/models.generated.ts:81] [E: packages/ai/src/models.generated.ts:89] [E: packages/ai/src/models.generated.ts:135] [E: packages/ai/src/models.generated.ts:223]。每个 shard 只 import ignored `./data/<provider>.json`，再由 `flattenChatModelCatalog` / `flattenImageModelCatalog` / `flattenClassifierModelCatalog` flatten；model value 不再内联于 TypeScript source [E: packages/ai/src/providers/baseten.models.ts:4] [E: packages/ai/src/providers/baseten.models.ts:7] [E: packages/ai/src/providers/openai.models.ts:4] [E: packages/ai/src/model-catalog.ts:62] [E: packages/ai/src/model-catalog.ts:69] [E: packages/ai/src/model-catalog.ts:76]。

`packages/ai/src/providers/all.ts` 是 static helper 与 runtime assembly 的交叉点。`BuiltinProvider = keyof typeof MODELS`（42 个静态 key，含 radius）[E: packages/ai/src/providers/all.ts:53]。`getBuiltinModel` 读 `MODELS`；`getBuiltinImageModel` 读 `IMAGE_MODELS`；`getBuiltinClassifierModel` 读 `CLASSIFIER_MODELS`；`getAllBuiltinModels` 三者拼接 [E: packages/ai/src/providers/all.ts:62] [E: packages/ai/src/providers/all.ts:72] [E: packages/ai/src/providers/all.ts:82] [E: packages/ai/src/providers/all.ts:131]。`builtinProviders()` 构造 **42** 个 fresh provider，数组含 `metaProvider()`、`radiusProvider()`、`typesafeProvider()`，以 `zaiCodingCnProvider()` 收尾 [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:154] [E: packages/ai/src/providers/all.ts:169] [E: packages/ai/src/providers/all.ts:171] [E: packages/ai/src/providers/all.ts:179]。`builtinModels()` 先 `createModels()` 再逐个 `setProvider()` [E: packages/ai/src/providers/all.ts:184] [E: packages/ai/src/providers/all.ts:186] [E: packages/ai/src/providers/all.ts:187]。

`packages/ai/src/models.ts` 是 runtime collection：未限定 type 的 `getModels()` / `getModel()` 只返回 chat；`getModelsOfType` / `getModelOfType` / `getAllModels` 才跨越 type [E: packages/ai/src/models.ts:423] [E: packages/ai/src/models.ts:445] [E: packages/ai/src/models.ts:467] [E: packages/ai/src/models.ts:471] [E: packages/ai/src/models.ts:475]。`calculateCost()` 用 `AnyModel.cost` 回填 `usage.cost` [E: packages/ai/src/models.ts:1187]。

已删除、不要再 cite：`packages/ai/src/utils/deferred-tools.ts`、`images-models.ts` 作为独立 Images collection、`image-models.generated.ts`。Fireworks/Anthropic deferred tools 现走 catalog `compat` 与 Anthropic native `defer_loading` / OpenAI `supportsToolSearch`，不在本节点展开 [I]。

## 关键文件

- `packages/ai/src/models.generated.ts`: 42-bucket 三分 aggregator [E: packages/ai/src/models.generated.ts:47] [E: packages/ai/src/models.generated.ts:135] [E: packages/ai/src/models.generated.ts:223]。
- `packages/ai/src/model-catalog.ts`: JSON API groups 推导 literal types，再按 `type` flatten 成 chat/image/classifier map [E: packages/ai/src/model-catalog.ts:53] [E: packages/ai/src/model-catalog.ts:57]。
- `packages/ai/scripts/model-data.ts`: `MODEL_DATA_SCHEMA_VERSION = 6`；manifest 必须匹配 [E: packages/ai/scripts/model-data.ts:5] [E: packages/ai/scripts/model-data.ts:232]。
- `packages/ai/scripts/generate-models.ts`: 生成 shard、JSON identity `` `${model.type}:${model.id}` ``、三分 export [E: packages/ai/scripts/generate-models.ts:3371] [E: packages/ai/scripts/generate-models.ts:3457] [E: packages/ai/scripts/generate-models.ts:3465] [E: packages/ai/scripts/generate-models.ts:3473]。
- `packages/ai/src/providers/all.ts`: static getters 与 `builtinProviders()` [E: packages/ai/src/providers/all.ts:62] [E: packages/ai/src/providers/all.ts:136]。
- `packages/ai/src/models.ts`: runtime collection、`hasApi()`、`calculateCost()` [E: packages/ai/src/models.ts:243] [E: packages/ai/src/models.ts:1183] [E: packages/ai/src/models.ts:1187]。
- `packages/ai/src/types.ts`: `BaseModel` / `Model` / `ImageModel` / `ClassifierModel` [E: packages/ai/src/types.ts:1062] [E: packages/ai/src/types.ts:1076] [E: packages/ai/src/types.ts:1110] [E: packages/ai/src/types.ts:1117]。

## 数据模型

`MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 都是 provider-id → per-provider map。例如 `"openai": OPENAI_MODELS` 与 `"openai": OPENAI_IMAGE_MODELS` 是平行 bucket，不是同一个 object [E: packages/ai/src/models.generated.ts:71] [E: packages/ai/src/models.generated.ts:114] [E: packages/ai/src/models.generated.ts:159] [E: packages/ai/src/models.generated.ts:202]。`getBuiltinProviders()` 用 `Object.keys(MODELS)` 暴露这 42 个 key [E: packages/ai/src/providers/all.ts:94] [E: packages/ai/src/providers/all.ts:95]。

JSON 里每个模型的 identity 是 `` `${model.type}:${model.id}` ``，按 `model.api` 分组。flatten 时丢掉 type 前缀，只保留 `id`，所以 TypeScript map 的 key 是裸 model id；同一 id 的 chat/image 行分属不同 generated object [E: packages/ai/scripts/generate-models.ts:3367] [E: packages/ai/scripts/generate-models.ts:3371] [E: packages/ai/src/model-catalog.ts:57] [E: packages/ai/src/model-catalog.ts:58]。测试钉死 OpenRouter 上 `google/gemini-3-pro-image` 同时有 chat（`openai-completions`）和 image（`openrouter-images`）[E: packages/ai/test/images-models.test.ts:400] [E: packages/ai/test/images-models.test.ts:403]。

`Model<TApi>` 把一个 chat 模型绑到 `api`（wire）和 `provider`（ownership）：`api` 是 KnownApi，`provider` 是 owning id，另有 `reasoning`、`input`、`cost`、`contextWindow`、`maxTokens` [E: packages/ai/src/types.ts:1076] [E: packages/ai/src/types.ts:1083] [E: packages/ai/src/types.ts:1065] [E: packages/ai/src/types.ts:1066] [E: packages/ai/src/types.ts:1091] [E: packages/ai/src/types.ts:1092]。没有 `type` 的条目是 chat：`type?: "chat"`，`getModelType` 返回 `model.type ?? "chat"` [E: packages/ai/src/types.ts:1082] [E: packages/ai/src/utils/model-operations.ts:17] [E: packages/ai/src/utils/model-operations.ts:18]。`createProvider` 的 `getModels()` 过滤 `isModelType(model, "chat")` [E: packages/ai/src/models.ts:1078]。

`Model.api` 与 `Model.provider` 驱动两个选择：`requireProvider()` / `requireChatProvider()` 用 `model.provider` 找 instance；`createProvider` 的 `apiFor()` 用 `model.api` 在 single implementation 或 by-API map 里选 `ProviderStreams` [E: packages/ai/src/models.ts:818] [E: packages/ai/src/models.ts:826] [E: packages/ai/src/models.ts:1057]。图像/分类器走平行的 `images` / `classifiers` map [E: packages/ai/src/models.ts:1141] [E: packages/ai/src/models.ts:1156]。

Radius 现在有静态 shard：`radiusProvider()` 在默认 gateway 下用 `Object.values(RADIUS_MODELS)` 做 baseline，refresh 仍可 overlay 动态目录 [E: packages/ai/src/providers/radius.models.ts:7] [E: packages/ai/src/providers/radius.ts:26] [E: packages/ai/src/providers/radius.ts:27] [E: packages/ai/src/models.generated.ts:79]。上一轮「Radius 不在 MODELS object」已经过时。

## 控制流

1. Catalog generation: `generate-models.ts` 为每个排序 provider 写只 import JSON 的 structural shard（三个 flatten export），再写带显式 readonly mapping 的 aggregator；data directory 经 staging/rename 原子替换并 `validateGeneratedModelData` [E: packages/ai/scripts/generate-models.ts:3437] [E: packages/ai/scripts/generate-models.ts:3440] [E: packages/ai/scripts/generate-models.ts:3443] [E: packages/ai/scripts/generate-models.ts:3482] [E: packages/ai/scripts/generate-models.ts:3489] [E: packages/ai/scripts/generate-models.ts:3490]。JSON identity 写入 `` `${model.type}:${model.id}` `` [E: packages/ai/scripts/generate-models.ts:3371]。
2. Schema v6: `createModelDataManifest` 写 `schemaVersion: MODEL_DATA_SCHEMA_VERSION`（6）；`validateModelDataDirectory` 若 manifest 不是 6 就报 `expected 6` [E: packages/ai/scripts/model-data.ts:5] [E: packages/ai/scripts/model-data.ts:137] [E: packages/ai/scripts/model-data.ts:232] [E: packages/ai/scripts/model-data.ts:234]。
3. Static chat read: `getBuiltinModel(provider, modelId)` index `MODELS[provider][id]`，不查询 runtime `ModelsImpl` [E: packages/ai/src/providers/all.ts:62] [E: packages/ai/src/providers/all.ts:66]。`getBuiltinModels(provider)` 对缺 key 返回 `[]` [E: packages/ai/src/providers/all.ts:104] [E: packages/ai/src/providers/all.ts:107] [E: packages/ai/src/providers/all.ts:108]。
4. Static image/classifier read: `getBuiltinImageModel` / `getBuiltinClassifierModel` 对 `IMAGE_MODELS` / `CLASSIFIER_MODELS` 做同样的 optional index + cast [E: packages/ai/src/providers/all.ts:75] [E: packages/ai/src/providers/all.ts:89]。`getAllBuiltinModels(provider)` = chat + image + classifier [E: packages/ai/src/providers/all.ts:131] [E: packages/ai/src/providers/all.ts:132]。OpenRouter 测试断言 `chat.length + images.length + classifiers.length === all.length` 且 compat `getModels` 等于 chat [E: packages/ai/test/images-models.test.ts:383] [E: packages/ai/test/images-models.test.ts:385]。TypeSafe 测试断言 `getModel("typesafe", "jev-latest")` 为 `undefined`，必须 `getModelOfType("classifier", ...)` [E: packages/ai/test/classifier-models.test.ts:126] [E: packages/ai/test/classifier-models.test.ts:127]。
5. Runtime assembly: `builtinModels(options)` → `createModels` → 循环 `builtinProviders()` → `setProvider` [E: packages/ai/src/providers/all.ts:184] [E: packages/ai/src/providers/all.ts:185] [E: packages/ai/src/providers/all.ts:186] [E: packages/ai/src/providers/all.ts:187]。
6. Runtime lookup: `getModels(provider)` 未知 id 或 `getModels()` throw 都返回 `[]`；`getModel` 在该 chat list 里找 `model.id` [E: packages/ai/src/models.ts:423] [E: packages/ai/src/models.ts:426] [E: packages/ai/src/models.ts:428] [E: packages/ai/src/models.ts:471]。`getAllModels` 优先 `getAllModels?.()` 否则退回 chat `getModels()` [E: packages/ai/src/models.ts:450]。
7. Runtime refresh: `refresh(options)` 并发刷新暴露 `refreshModels` 的 provider [E: packages/ai/src/models.ts:545] [E: packages/ai/src/models.ts:556]。每个 task 先 `allowNetwork: false` 恢复 stored catalog，允许联网且 credential 就绪时再跑第二阶段 [E: packages/ai/src/models.ts:570] [E: packages/ai/src/models.ts:572] [E: packages/ai/src/models.ts:576]。失败写入 `errors` map，不拒绝整次 refresh [E: packages/ai/src/models.ts:581]。
8. Cost: `calculateCost(model, usage)` 用 `input + cacheRead + cacheWrite` 选 `inputTokensAbove` 小于该值的最高 tier，选中的四项 rates 应用于整请求 [E: packages/ai/src/models.ts:1187] [E: packages/ai/src/models.ts:1188] [E: packages/ai/src/models.ts:1191] [E: packages/ai/src/models.ts:1192]。随后按 bucket 计费；`cacheWrite1h` 用选中 input rate 的 2 倍；结果写回同一个 `usage.cost` [E: packages/ai/src/models.ts:1200] [E: packages/ai/src/models.ts:1201] [E: packages/ai/src/models.ts:1204] [E: packages/ai/src/models.ts:1205] [E: packages/ai/src/models.ts:1206]。
9. Reasoning metadata: generator 按 `provider:id` 记录 models.dev `reasoning_options`，再只为直接支持 effort 的 adapter 合并 `thinkingLevelMap`：Anthropic 需 adaptive thinking；OpenAI/Azure/Codex Responses 直接支持；Completions 需 compat 同时满足 OpenAI thinking format 与 reasoning effort [E: packages/ai/scripts/generate-models.ts:513] [E: packages/ai/scripts/generate-models.ts:519] [E: packages/ai/scripts/generate-models.ts:520] [E: packages/ai/scripts/generate-models.ts:522] [E: packages/ai/scripts/generate-models.ts:534] [E: packages/ai/scripts/generate-models.ts:537] [E: packages/ai/scripts/generate-models.ts:539]。
10. OpenRouter reasoning: `getOpenRouterThinkingLevelMap()`；`supported_efforts` 复用 `getEffortThinkingLevelMap()`，`mandatory === true` 时 `off: null` [E: packages/ai/scripts/openrouter-reasoning-options.ts:12] [E: packages/ai/scripts/openrouter-reasoning-options.ts:16] [E: packages/ai/scripts/openrouter-reasoning-options.ts:20] [E: packages/ai/scripts/openrouter-reasoning-options.ts:22]。
11. Google Gemma 4 在没有 effort map 时写 `{ off: null, minimal: "MINIMAL", low: null, medium: null, high: "HIGH" }`，供 `resolveGoogleThinkingLevel()` 消费 [E: packages/ai/scripts/generate-models.ts:1009] [E: packages/ai/scripts/generate-models.ts:1010] [E: packages/ai/src/api/google-shared.ts:48] [E: packages/ai/src/api/google-shared.ts:52]。
12. xAI 生成行走 `openai-responses`（`xaiProvider` 的 `api` 是 `openAIResponsesApi()`）；没有 verified effort options 时 `off`/`minimal` 标 `null` [E: packages/ai/src/providers/xai.ts:7] [E: packages/ai/src/providers/xai.ts:22] [E: packages/ai/scripts/generate-models.ts:1050] [E: packages/ai/scripts/generate-models.ts:1051]。`grok-build-0.1` 仍在 `XAI_BUILTIN_EXCLUDED_MODEL_IDS` [E: packages/ai/scripts/generate-models.ts:454] [E: packages/ai/scripts/generate-models.ts:459]。
13. Cloudflare AI Gateway：`workers-ai` upstream 走 `openai-completions` + compat base，id 保留 `workers-ai/${modelId}` [E: packages/ai/scripts/generate-models.ts:1922] [E: packages/ai/scripts/generate-models.ts:1923] [E: packages/ai/scripts/generate-models.ts:1925]。
14. Anthropic fallback：`ANTHROPIC_ALLOWED_FALLBACK_MODELS` 把 `claude-fable-5` 映射到 `claude-opus-4-8` / `claude-opus-5`，把 `claude-opus-5` 映射到 `claude-opus-4-8`；`applyAnthropicAllowedFallbackModelMetadata()` 把目标行的 `provider` / `id` / `cost` 写入 `compat.allowedFallbackModels` [E: packages/ai/scripts/generate-models.ts:272] [E: packages/ai/scripts/generate-models.ts:273] [E: packages/ai/scripts/generate-models.ts:274] [E: packages/ai/scripts/generate-models.ts:820] [E: packages/ai/scripts/generate-models.ts:832]。
15. Fireworks `processFireworksModels()`：id 含 `glm-` 或 `kimi-k3` 的行走 `openai-completions`；其余行走 `anthropic-messages`。Messages 行在 models.dev 标了 effort、或 id 落在 `FIREWORKS_ADAPTIVE_THINKING_FALLBACK_MODELS`（含 Fireworks 侧 `deepseek-v4-flash-0731` / `deepseek-v4-flash-vision-exp` / `deepseek-v4-pro-0813`）时写 `forceAdaptiveThinking: true`。`glm-5p2` 去掉 low/medium alias；`kimi-k3` 去掉 medium alias [E: packages/ai/scripts/generate-models.ts:1667] [E: packages/ai/scripts/generate-models.ts:1670] [E: packages/ai/scripts/generate-models.ts:1674] [E: packages/ai/scripts/generate-models.ts:1677] [E: packages/ai/scripts/generate-models.ts:1684] [E: packages/ai/scripts/generate-models.ts:1696] [E: packages/ai/scripts/generate-models.ts:291] [E: packages/ai/scripts/generate-models.ts:292] [E: packages/ai/scripts/generate-models.ts:293] [E: packages/ai/scripts/generate-models.ts:1158] [E: packages/ai/scripts/generate-models.ts:1161] [E: packages/ai/scripts/generate-models.ts:1163] [E: packages/ai/scripts/generate-models.ts:1165] [E: packages/ai/test/fireworks-models.test.ts:100]。
16. GitHub Copilot：`gpt-*` / `grok-` / `oswe` / `mai-` 走 `openai-responses`；Claude 4.x/5.x 走 `anthropic-messages` [E: packages/ai/scripts/generate-models.ts:2297] [E: packages/ai/scripts/generate-models.ts:2301] [E: packages/ai/scripts/generate-models.ts:2306] [E: packages/ai/scripts/generate-models.ts:2309]。
17. DeepSeek 官方 bucket 不读 models.dev 的 `data.deepseek` loop；生成器只 push 两行硬编码：`deepseek-flash`（显示名 DeepSeek V4.1 Flash，`input: ["text","image"]`，cost 0.3/1.2/0.006）与 `deepseek-v4-pro`（text-only，cost 1.32/3.96/0.044）。数组不再出现 `deepseek-v4-flash` 或 `deepseek-v4-flash-vision-exp` [E: packages/ai/scripts/generate-models.ts:2955] [E: packages/ai/scripts/generate-models.ts:2957] [E: packages/ai/scripts/generate-models.ts:2958] [E: packages/ai/scripts/generate-models.ts:2964] [E: packages/ai/scripts/generate-models.ts:2977] [E: packages/ai/scripts/generate-models.ts:2983]。
18. OpenAI Codex 是显式数组，全部 `api: "openai-codex-responses"`、`provider: "openai-codex"`：`gpt-6-astra`、`gpt-6-sol`、`gpt-6-luna`、`gpt-5.3-codex-spark`、`gpt-5.5`、`gpt-5.6-luna`、`gpt-5.6-sol`、`gpt-5.6-terra` [E: packages/ai/scripts/generate-models.ts:3087] [E: packages/ai/scripts/generate-models.ts:3089] [E: packages/ai/scripts/generate-models.ts:3101] [E: packages/ai/scripts/generate-models.ts:3113] [E: packages/ai/scripts/generate-models.ts:3125] [E: packages/ai/scripts/generate-models.ts:3137] [E: packages/ai/scripts/generate-models.ts:3149] [E: packages/ai/scripts/generate-models.ts:3161] [E: packages/ai/scripts/generate-models.ts:3173]。
19. Image/classifier 生成：OpenRouter 另拉 `?output_modalities=image` 与 `?output_modalities=decisions`；TypeSafe Jev 来自 models.dev `type=decision` 的 `typesafe/jev-latest`；Cloudflare `typesafe/jev` 是硬编码 `cloudflare-workers-ai-system-one` 行 [E: packages/ai/scripts/generate-models.ts:1290] [E: packages/ai/scripts/generate-models.ts:1291] [E: packages/ai/scripts/generate-models.ts:2628] [E: packages/ai/scripts/generate-models.ts:2635] [E: packages/ai/scripts/generate-models.ts:2656] [E: packages/ai/scripts/generate-models.ts:2658]。含 image 输入的行套 `applyImageInputMetadata()`，默认 resize 2000×2000 / 4.5 MiB / jpeg 80 [E: packages/ai/scripts/generate-models.ts:406] [E: packages/ai/scripts/generate-models.ts:971] [E: packages/ai/scripts/generate-models.ts:994]。

`getEffortThinkingLevelMap()` 只把 verified `effort` values 映射成 selectable levels：`none` 映射 `off`，`minimal` 到 `max` 逐项保留；单独的 `toggle` / `budget_tokens` / `default` / JSON `null` 不推导 map [E: packages/ai/scripts/models-dev-reasoning-options.ts:18] [E: packages/ai/scripts/models-dev-reasoning-options.ts:19] [E: packages/ai/scripts/models-dev-reasoning-options.ts:25] [E: packages/ai/scripts/models-dev-reasoning-options.ts:27] [E: packages/ai/test/reasoning-options.test.ts:4] [E: packages/ai/test/reasoning-options.test.ts:31] [E: packages/ai/test/reasoning-options.test.ts:34]。

## 设计动机与权衡

Static catalog read 与 runtime collection 是两条路径：`getBuiltin*` 只读 generated metadata；`builtinModels()` 返回含 auth / refresh / stream / generateImages / classify 的 collection [E: packages/ai/src/providers/all.ts:62] [E: packages/ai/src/providers/all.ts:184] [E: packages/ai/src/models.ts:340] [E: packages/ai/src/models.ts:347] [I]。

未限定 type 的读取保持 chat-only，避免把 `type: "image"` / `"classifier"` 送进 stream picker 或旧 compat `getModels()` [E: packages/ai/src/models.ts:423] [E: packages/ai/src/providers/all.ts:104] [E: packages/ai/test/images-models.test.ts:374] [I]。

`calculateCost()` mutates and returns `usage.cost`，让 API 模块 parse usage 后把 cost 留在同一 `Usage` 对象上 [E: packages/ai/src/models.ts:1187] [E: packages/ai/src/models.ts:1205] [E: packages/ai/src/models.ts:1206] [I]。

`hasApi(model, api)` 只对 chat 且 `model.api === api` 收窄；非 chat 即使 api 字符串相同也是 false [E: packages/ai/src/models.ts:1183] [E: packages/ai/src/models.ts:1184]。

`getSupportedThinkingLevels()` 的扩展顺序含 `max`；与 `xhigh` 一样，只有 `thinkingLevelMap` 明确提供映射才报告支持 [E: packages/ai/src/models.ts:1209] [E: packages/ai/src/models.ts:1211] [E: packages/ai/src/models.ts:1217]。

## Gotcha

- `models.generated.ts`、provider `.models.ts` 与 ignored `providers/data/*.json` 是同一次生成的耦合输出；`build:offline` 先 `check:model-data` 再把 data 复制到 dist [E: packages/ai/package.json:56] [E: packages/ai/package.json:59] [E: packages/ai/package.json:61] [E: packages/ai/scripts/generate-models.ts:3490] [I]。
- `getBuiltinModel()` / `getBuiltinImageModel()` / `getBuiltinClassifierModel()` 的 TypeScript 签名不包含 `undefined`，实现却是 optional index + cast [E: packages/ai/src/providers/all.ts:66] [E: packages/ai/src/providers/all.ts:76] [E: packages/ai/src/providers/all.ts:89] [I]。
- `getBuiltinProviders()` 与 `builtinProviders()` 现在都是 42，且 MODELS 含 radius；二者仍是不同数据结构（key 列表 vs factory 数组）[E: packages/ai/src/providers/all.ts:94] [E: packages/ai/src/providers/all.ts:136] [I]。
- `ModelsImpl.getModels()` 是 best-effort：未知 provider 和 throwing `getModels()` 都产出空列表 [E: packages/ai/src/models.ts:426] [E: packages/ai/src/models.ts:428]。
- flattened row 仍只存在于 gitignored JSON。目标模型数必须绑定官方 artifact 与带时间/hash 的远端快照，不能仅由 42 个 key 推导 row 数 [I]。Generator 会读 models.dev、OpenRouter、Vercel、NVIDIA 等远端目录，今天重跑可以得到不同 snapshot [E: packages/ai/scripts/generate-models.ts:1285] [I]。
- `qwen-token-plan-individual` allowlist 仍含 `deepseek-v4-flash-0731`；那是国际 Token Plan 的过滤 id，不是官方 DeepSeek bucket 行。Fireworks fallback set 里的 `accounts/fireworks/models/deepseek-v4-flash-vision-exp` 只作用于 Fireworks Messages [E: packages/ai/scripts/generate-models.ts:293] [E: packages/ai/scripts/generate-models.ts:318]。

## 跨包边界

[subsys.ai.provider-registry](provider-registry.md) owns provider membership 与 factory 构造；本节点说明 model discovery 如何使用那些 helper 以及三分 catalog 边界 [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:184] [I]。

[ref.ai.model-catalog](../../reference/model-catalog.md) 记录 42 个 bucket 结构、官方 DeepSeek / Codex 硬编码 id 与 Individual allowlist；本节点写 catalog 装配、refresh、schema v6 与 generator reasoning / Fireworks 路由，不枚举 gitignored JSON 里的上千模型 [E: packages/ai/src/models.generated.ts:47] [E: packages/ai/src/models.generated.ts:89] [I]。

[subsys.ai.image-generation](image-generation.md) 与 [ref.ai.image-models](../../reference/image-models.md) 覆盖 `IMAGE_MODELS` 的 runtime 与结构 catalog [I]。

## Sources

- packages/ai/src/models.generated.ts
- packages/ai/src/model-catalog.ts
- packages/ai/src/models.ts
- packages/ai/src/utils/model-operations.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openai.models.ts
- packages/ai/src/providers/baseten.models.ts
- packages/ai/src/providers/openrouter.models.ts
- packages/ai/src/providers/typesafe.models.ts
- packages/ai/src/providers/radius.models.ts
- packages/ai/src/providers/radius.ts
- packages/ai/src/types.ts
- packages/ai/src/api/google-shared.ts
- packages/ai/src/providers/xai.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/models-dev-reasoning-options.ts
- packages/ai/scripts/openrouter-reasoning-options.ts
- packages/ai/scripts/model-data.ts
- packages/ai/scripts/check-model-data.ts
- packages/ai/package.json
- packages/ai/test/reasoning-options.test.ts
- packages/ai/test/fireworks-models.test.ts
- packages/ai/test/images-models.test.ts
- packages/ai/test/classifier-models.test.ts

## 相关

- [subsys.ai.provider-registry](provider-registry.md): provider factory registry 与 runtime membership。
- [ref.ai.model-catalog](../../reference/model-catalog.md): generated chat catalog 结构与硬编码 id。
- [subsys.ai.image-generation](image-generation.md): `Models.generateImages()` 与 `type: "image"`。
- [ref.ai.image-models](../../reference/image-models.md): `IMAGE_MODELS` 结构 catalog。
