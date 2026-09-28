---
id: ref.ai.image-models
title: 图像模型与 provider 目录
kind: catalog
tier: T3
pkg: ai
source:
  - packages/ai/src/models.generated.ts
  - packages/ai/src/types.ts
  - packages/ai/src/api/openrouter-images.ts
  - packages/ai/src/model-catalog.ts
  - packages/ai/src/image-models.ts
  - packages/ai/src/providers/openrouter.models.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/scripts/openrouter-catalog.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/model-data.ts
  - packages/ai/test/images-models.test.ts
symbols:
  - IMAGE_MODELS
  - ImageModel
  - KnownImageApi
  - flattenImageModelCatalog
  - getBuiltinImageModel
related:
  - subsys.ai.image-generation
  - subsys.ai.model-discovery
  - ref.ai.model-catalog
evidence: explicit
status: verified
updated: 6f7551516b
---

> `ref.ai.image-models` 是 `IMAGE_MODELS` 的**结构** catalog：记录 generated 三分对象里图像那一份的 bucket、`ImageModel` 字段、OpenRouter 生成规则，以及当前 checkout 能证明的实例。不要再 cite 已删除的 `image-models.generated.ts` / `providers/openrouter-images.ts`。

## 能回答的问题

- `IMAGE_MODELS` 现在从哪里导出，顶层有多少 provider bucket？
- 每个 image model 必须有哪些字段，`api` 的 known 取值是什么？
- gitignored JSON 怎样用 `image:<id>` key 与 chat/classifier 分行？
- OpenRouter 图像模型如何从 `output_modalities=image` 列表生成并挂到 `openrouter` provider？
- 为什么不要手改 `models.generated.ts` 或已删除的 `image-models.generated.ts`？

## Ground Truth

`IMAGE_MODELS` 由 `packages/ai/src/models.generated.ts` 与 `MODELS` / `CLASSIFIER_MODELS` 一起导出。type 面与 value 面都是同一组 42 个 provider key，从 `"amazon-bedrock"` 到 `"zai-coding-cn"`，含 `openrouter`、`radius`、`typesafe`、`meta` [E: packages/ai/src/models.generated.ts:135] [E: packages/ai/src/models.generated.ts:163] [E: packages/ai/src/models.generated.ts:178] [E: packages/ai/src/models.generated.ts:206]。不要再寻找独立的 `image-models.generated.ts`。

每个 structural shard 三个 export。`openrouter.models.ts` 用同一份 `./data/openrouter.json` 分别 `flattenChatModelCatalog` / `flattenImageModelCatalog` / `flattenClassifierModelCatalog` [E: packages/ai/src/providers/openrouter.models.ts:4] [E: packages/ai/src/providers/openrouter.models.ts:7] [E: packages/ai/src/providers/openrouter.models.ts:10] [E: packages/ai/src/providers/openrouter.models.ts:13]。`flattenImageModelCatalog` 只保留 `type === "image"` 的条目，再按 `model.id` 建成 map [E: packages/ai/src/model-catalog.ts:53] [E: packages/ai/src/model-catalog.ts:57] [E: packages/ai/src/model-catalog.ts:69] [E: packages/ai/src/model-catalog.ts:73]。

生成器把 JSON identity 写成 `` `${model.type}:${model.id}` ``，因此同一 upstream id 可以同时有 `chat:google/gemini-3-pro-image` 与 `image:google/gemini-3-pro-image` [E: packages/ai/scripts/generate-models.ts:3371] [E: packages/ai/scripts/generate-models.ts:3312] [E: packages/ai/scripts/generate-models.ts:3315] [E: packages/ai/test/images-models.test.ts:400] [E: packages/ai/test/images-models.test.ts:403]。manifest `schemaVersion` 必须等于 `MODEL_DATA_SCHEMA_VERSION = 6` [E: packages/ai/scripts/model-data.ts:5] [E: packages/ai/scripts/model-data.ts:232]。flattened 值在 gitignored `src/providers/data/*.json`；本页不冒充能枚举当前 JSON 里的全部 id [I]。

## ImageModel 字段

`ImageModel` 共享 `BaseModel`：`id` / `name` / `api` / `provider` / `baseUrl` / `input` / 可选 `inputLimits` / `cost` / 可选 `headers` [E: packages/ai/src/types.ts:1062] [E: packages/ai/src/types.ts:1063] [E: packages/ai/src/types.ts:1064] [E: packages/ai/src/types.ts:1065] [E: packages/ai/src/types.ts:1066] [E: packages/ai/src/types.ts:1068] [E: packages/ai/src/types.ts:1071]。图像专用：`type` 必须是 `"image"`；`output` 是 `("text" | "image")[]` 且始终包含 `"image"` [E: packages/ai/src/types.ts:1110] [E: packages/ai/src/types.ts:1111] [E: packages/ai/src/types.ts:1113]。`KnownImageApi` 只有 `"openrouter-images"` [E: packages/ai/src/types.ts:31]。

校验器对 `type === "image"` 要求 `output` 是含 `"image"` 的 modality list；chat/classifier 行不允许带 `output` [E: packages/ai/scripts/model-data.ts:166] [E: packages/ai/scripts/model-data.ts:167] [E: packages/ai/scripts/model-data.ts:170]。

静态读取：`getBuiltinImageModel(provider, modelId)` / `getBuiltinImageModels(provider)` 读 `IMAGE_MODELS`；`getAllBuiltinModels` 拼接 chat + image + classifier [E: packages/ai/src/providers/all.ts:72] [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:131]。`image-models.ts` 的 `getImageModel` 仍能读同一 object，但已 deprecated [E: packages/ai/src/image-models.ts:32]。

## OpenRouter 生成与装配

生成器并行拉 OpenRouter 默认列表、`?output_modalities=image`、`?output_modalities=decisions` [E: packages/ai/scripts/generate-models.ts:1288] [E: packages/ai/scripts/generate-models.ts:1289] [E: packages/ai/scripts/generate-models.ts:1290] [E: packages/ai/scripts/generate-models.ts:1291]。strict 模式下图像列表为空会 throw [E: packages/ai/scripts/generate-models.ts:1297] [E: packages/ai/scripts/generate-models.ts:1298]。

`buildOpenRouterCatalog` 对 image listing：跳过重复 id；`output_modalities` 必须含 `"image"`；`api: "openrouter-images"`、`provider: "openrouter"`、`baseUrl: "https://openrouter.ai/api/v1"`、`type: "image"`；`input` 来自 `input_modalities`，缺省 `["text"]` [E: packages/ai/scripts/openrouter-catalog.ts:91] [E: packages/ai/scripts/openrouter-catalog.ts:93] [E: packages/ai/scripts/openrouter-catalog.ts:94] [E: packages/ai/scripts/openrouter-catalog.ts:97] [E: packages/ai/scripts/openrouter-catalog.ts:100] [E: packages/ai/scripts/openrouter-catalog.ts:101] [E: packages/ai/scripts/openrouter-catalog.ts:102] [E: packages/ai/scripts/openrouter-catalog.ts:103]。cost 从 OpenRouter `$/token` 乘 1_000_000 再 `toFixed(6)` [E: packages/ai/scripts/openrouter-catalog.ts:29] [E: packages/ai/scripts/openrouter-catalog.ts:39] [E: packages/ai/scripts/openrouter-catalog.ts:41] [E: packages/ai/scripts/openrouter-catalog.ts:42]。

这些 image 行在 `generateModels()` 里单独写入 `providers[id].image`，与 chat 分表，所以同一 upstream ID 可以有不同 API implementation [E: packages/ai/scripts/generate-models.ts:3312] [E: packages/ai/scripts/generate-models.ts:3315]。含 image 输入的行还会套 `applyImageInputMetadata()`（默认 resize 2000×2000 / 4.5 MiB / jpeg 80）[E: packages/ai/scripts/generate-models.ts:3313] [E: packages/ai/scripts/generate-models.ts:406] [E: packages/ai/scripts/generate-models.ts:994]。

`openrouterProvider()` 用 `Object.values(OPENROUTER_IMAGE_MODELS)` 作为 runtime 模型清单的一部分，并挂 `images: { "openrouter-images": openrouterImagesApi() }` [E: packages/ai/src/providers/openrouter.ts:25] [E: packages/ai/src/providers/openrouter.ts:32]。wire 实现是 `api/openrouter-images.ts` 的 `generateImages`，`modalities` 随 `model.output.includes("text")` 在 `["image","text"]` 与 `["image"]` 之间切换 [E: packages/ai/src/api/openrouter-images.ts:42] [E: packages/ai/src/api/openrouter-images.ts:163]。

## 本轮可从源码/测试证明的实例

完整 OpenRouter 图像 id 列表只在 gitignored JSON。下面是测试和 generator 能钉死的结构事实，不是全量 dump [I]。

| 可证事实 | 含义 | 证据 |
| --- | --- | --- |
| `getBuiltinImageModel("openrouter", "black-forest-labs/flux.2-pro").type === "image"` | 该 id 在 `IMAGE_MODELS.openrouter` 中且 discriminant 正确 | [E: packages/ai/test/images-models.test.ts:386] |
| `google/gemini-3-pro-image` 同时有 chat 与 image 行 | chat `api: "openai-completions"`；image `api: "openrouter-images"` | [E: packages/ai/test/images-models.test.ts:400] [E: packages/ai/test/images-models.test.ts:401] [E: packages/ai/test/images-models.test.ts:402] [E: packages/ai/test/images-models.test.ts:403] |
| builtin `getModelsOfType("image")` 的 provider 全是 `openrouter` | 当前内置图像 catalog 只有 OpenRouter bucket 非空 | [E: packages/ai/test/images-models.test.ts:396] [E: packages/ai/test/images-models.test.ts:397] |
| 每条 OpenRouter image 行 `api === "openrouter-images"` | 与 `KnownImageApi` 一致 | [E: packages/ai/test/images-models.test.ts:396] [E: packages/ai/src/types.ts:31] |
| `getBuiltinModels("openrouter")` 全是 chat；`compat getModels` 等于 chat | 未限定 type 的读取仍 chat-only | [E: packages/ai/test/images-models.test.ts:380] [E: packages/ai/test/images-models.test.ts:383] |
| `chat.length + images.length + classifiers.length === getAllBuiltinModels("openrouter").length` | 三分 catalog 互斥拼接 | [E: packages/ai/test/images-models.test.ts:385] |

多数其它 provider 的 `*_IMAGE_MODELS` 是空 `ImageModelCatalog`（同一 flatten 管道，JSON 里没有 `type: "image"` 行）。空 shard 仍然存在，以便 `keyof typeof IMAGE_MODELS` 与 `MODELS` 对齐 [E: packages/ai/src/models.generated.ts:135] [E: packages/ai/src/providers/all.ts:56] [I]。

## Generated Gotcha

`models.generated.ts` 与每个 `providers/<id>.models.ts` 由 `scripts/generate-models.ts` 写出；更新入口是 `npm run generate-models`，不要手改 aggregator [E: packages/ai/scripts/generate-models.ts:3424] [E: packages/ai/scripts/generate-models.ts:3482] [E: packages/ai/package.json:56]。旧入口 `npm run generate-image-models` / `scripts/generate-image-models.ts` 已删除 [I]。

`getBuiltinImageModel` 的 TypeScript 签名不包含 `undefined`，实现却是 `IMAGE_MODELS[provider]?.[id] as ImageModel<...>`；缺 key 时 runtime 得到 `undefined` [E: packages/ai/src/providers/all.ts:75] [E: packages/ai/src/providers/all.ts:76] [I]。

## 跨包关系

[subsys.ai.image-generation](../subsystems/ai/image-generation.md) 解释 `Models.generateImages()` 如何解析 auth 并调用 `openrouter-images`。本节点只覆盖 catalog 结构与 OpenRouter 静态 list 从哪来 [I]。

[subsys.ai.model-discovery](../subsystems/ai/model-discovery.md) 覆盖三分 catalog 的生成/读取总规则与 schema v6。本节点不重复 chat 生成器细节 [I]。

## Sources

- packages/ai/src/models.generated.ts
- packages/ai/src/types.ts
- packages/ai/src/api/openrouter-images.ts
- packages/ai/src/model-catalog.ts
- packages/ai/src/image-models.ts
- packages/ai/src/providers/openrouter.models.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/providers/all.ts
- packages/ai/scripts/openrouter-catalog.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/model-data.ts
- packages/ai/test/images-models.test.ts

## 相关

- [subsys.ai.image-generation](../subsystems/ai/image-generation.md): 图像生成 runtime、auth 与 OpenRouter wire。
- [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md): `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 与 chat-only 默认读取。
- [ref.ai.model-catalog](model-catalog.md): 42 个 structural shard 与 chat catalog 边界。
