---
id: subsys.ai.image-generation
title: 图像生成管线
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/images.ts
  - packages/ai/src/images-api-registry.ts
  - packages/ai/src/image-models.ts
  - packages/ai/src/models.ts
  - packages/ai/src/types.ts
  - packages/ai/src/utils/model-operations.ts
  - packages/ai/src/api/openrouter-images.ts
  - packages/ai/src/api/openrouter-images.lazy.ts
  - packages/ai/src/providers/images/register-builtins.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/test/images-models.test.ts
symbols:
  - KnownImageApi
  - ImageModel
  - ProviderImages
  - generateImages
  - registerImagesApiProvider
  - createProvider
related:
  - ref.ai.image-models
  - subsys.ai.model-discovery
  - surface.misc.images
  - subsys.ai.provider-registry
  - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.image-generation` 描述 `pi-ai` 把图像生成并入统一 `Models` 之后的管线：`ImageModel` 必有 `type: "image"`，`Models.generateImages()` 解析 provider auth 再按 `model.api` 分派。独立 `ImagesModels` / `images-models.ts` / `providers/openrouter-images.ts` 已删除。

## 能回答的问题

- `ImageModel` 与 chat `Model` 共享哪些 `BaseModel` 字段，又强制哪些图像专用字段？
- `Models.generateImages()` 如何找 owning provider、合并鉴权，并把错误编码成 `AssistantImages`？
- `packages/ai/src/images.ts` 的全局 `generateImages()` 与 `Models.generateImages()` 有什么边界差异？
- OpenRouter 图像模型怎样挂在同一个 `openrouter` provider 下并共用 credential？
- 未限定 type 的 `getModel()` / `getBuiltinModel()` 为什么读不到图像模型？

## 职责边界

已删除的 surface 不要再 cite：`ImagesModels`、`createImagesModels`、`ImagesProvider`、`builtinImagesProviders` / `builtinImagesModels`、`packages/ai/src/images-models.ts`、`image-models.generated.ts`、`providers/openrouter-images.ts`、`scripts/generate-image-models.ts`。图像生成现在是 `Models` 上的 one-shot 操作 [E: packages/ai/src/models.ts:340] [E: packages/ai/src/models.ts:942] [I]。

`ImageModel<TApi>` 扩展 `BaseModel`，强制 `type: "image"`，`output` 必含 `"image"`，可选再含 `"text"` [E: packages/ai/src/types.ts:1110] [E: packages/ai/src/types.ts:1111] [E: packages/ai/src/types.ts:1113]。`KnownImageApi` 只有 `"openrouter-images"` [E: packages/ai/src/types.ts:31]。`ProviderImages.generateImages` 返回 `Promise<AssistantImages>`，不是 event stream [E: packages/ai/src/types.ts:307] [E: packages/ai/src/types.ts:308]。

本节点覆盖 runtime 调用路径与 OpenRouter 绑定。逐模型 catalog 结构归 [ref.ai.image-models](../../reference/image-models.md)；chat/image/classifier 三分 catalog 归 [subsys.ai.model-discovery](model-discovery.md)；用户消息里的输入图像归 [surface.misc.images](../../surface/misc/images.md)。

## 关键文件

- `packages/ai/src/models.ts`: `Provider.generateImages`、`Models.generateImages()`、`createProvider({ images })` [E: packages/ai/src/models.ts:220] [E: packages/ai/src/models.ts:340] [E: packages/ai/src/models.ts:1015]。
- `packages/ai/src/images.ts`: 兼容全局函数，按 `model.api` 查 images API registry；auth 必须显式 `options.apiKey` [E: packages/ai/src/images.ts:19] [E: packages/ai/src/images.ts:24]。
- `packages/ai/src/images-api-registry.ts`: `registerImagesApiProvider` / `getImagesApiProvider` [E: packages/ai/src/images-api-registry.ts:38] [E: packages/ai/src/images-api-registry.ts:51]。
- `packages/ai/src/providers/images/register-builtins.ts`: 懒加载 OpenRouter 实现并注册 `api: "openrouter-images"` [E: packages/ai/src/providers/images/register-builtins.ts:50] [E: packages/ai/src/providers/images/register-builtins.ts:52] [E: packages/ai/src/providers/images/register-builtins.ts:57]。
- `packages/ai/src/api/openrouter-images.ts`: OpenRouter chat-completions 图像生成 [E: packages/ai/src/api/openrouter-images.ts:42]。
- `packages/ai/src/providers/openrouter.ts`: 同一 `openrouter` provider 同时挂 chat / image / classifier [E: packages/ai/src/providers/openrouter.ts:23] [E: packages/ai/src/providers/openrouter.ts:32]。
- `packages/ai/src/image-models.ts`: 已 deprecated 的静态 catalog 读取，指向 `getBuiltinImageModel` / `Models.getModelOfType("image", ...)` [E: packages/ai/src/image-models.ts:32] [E: packages/ai/src/image-models.ts:45]。

## 数据模型

`ImagesContext` 只有 `input: (TextContent | ImageContent)[]` [E: packages/ai/src/types.ts:582] [E: packages/ai/src/types.ts:583]。`AssistantImages` 带 `api` / `provider` / `model` / `output` / 可选 `responseId` 与 `usage` / `stopReason: "stop" | "error" | "aborted"` [E: packages/ai/src/types.ts:586] [E: packages/ai/src/types.ts:588]。`ImagesOptions` 继承 `ProviderRequestOptions`（含 `fetch`、`apiKey`、`headers`、`onPayload`），另加可选 `metadata` [E: packages/ai/src/types.ts:326] [E: packages/ai/src/types.ts:132] [E: packages/ai/src/types.ts:142]。

`createProvider()` 的 `models` 可混放 chat / image / classifier；没有 `type` 的条目是 chat [E: packages/ai/src/models.ts:995] [E: packages/ai/src/utils/model-operations.ts:17] [E: packages/ai/src/utils/model-operations.ts:18]。`getModels()` 过滤 `isModelType(model, "chat")`；`getAllModels()` 返回全部 type [E: packages/ai/src/models.ts:1078] [E: packages/ai/src/models.ts:1079]。动态 overlay 按 `(getModelType, id)` 替换或追加，因此同一 upstream id 可以同时有 chat 行和 image 行 [E: packages/ai/src/models.ts:1049] [E: packages/ai/src/models.ts:1050]。

## 控制流

1. `Models.generateImages@packages/ai/src/models.ts:942` 先 `assertImageModel(model)`。非 image 模型不会向上 reject，而是 `imageErrorResult`（`output: []`，`stopReason` 为 `"error"` 或 `"aborted"`）[E: packages/ai/src/models.ts:948] [E: packages/ai/src/models.ts:955] [E: packages/ai/src/utils/model-operations.ts:32] [E: packages/ai/src/utils/model-operations.ts:44]。
2. `requireProvider(model)` 用 `model.provider` 找 owning provider；没有 `generateImages` 方法时抛 `ModelsError("provider", ... does not support image generation)`，同样被编码成 error result [E: packages/ai/src/models.ts:818] [E: packages/ai/src/models.ts:949] [E: packages/ai/src/models.ts:950] [E: packages/ai/src/models.ts:951]。
3. `applyAuth` 与 stream / classify 共用：未配置 auth 抛 `Provider is not configured`；显式 `options.apiKey` 覆盖 resolved key；headers / env 合并；auth `baseUrl` 覆盖 request model [E: packages/ai/src/models.ts:847] [E: packages/ai/src/models.ts:853] [E: packages/ai/src/models.ts:854] [E: packages/ai/src/models.ts:856] [E: packages/ai/src/models.ts:857]。
4. `createProvider()` 在 `images` map 非空时挂 `provider.generateImages`：按 `model.api` 取 `ProviderImages`，缺失 implementation 返回 `imageErrorResult` [E: packages/ai/src/models.ts:1140] [E: packages/ai/src/models.ts:1141] [E: packages/ai/src/models.ts:1142] [E: packages/ai/src/models.ts:1152]。`api` / `images` / `classifiers` 至少要有一个非空实现，空 map 会被拒绝 [E: packages/ai/src/models.ts:1039] [E: packages/ai/src/models.ts:1040] [E: packages/ai/test/images-models.test.ts:340] [E: packages/ai/test/images-models.test.ts:341]。
5. 底层 `generateImages@packages/ai/src/images.ts:19` 不是 collection wrapper：它 `import "./providers/images/register-builtins.ts"` 做 side-effect 注册，再 `getImagesApiProvider(model.api)`；没有 API provider 时 throw，使 Promise reject（与 `Models.generateImages()` 的 never-reject 不同）[E: packages/ai/src/images.ts:1] [E: packages/ai/src/images.ts:6] [E: packages/ai/src/images.ts:8] [E: packages/ai/src/images.ts:19] [E: packages/ai/src/images.ts:24]。该函数不调用 `applyAuth`；OpenRouter 实现在缺少 `options.apiKey` 时 throw [E: packages/ai/src/api/openrouter-images.ts:57] [E: packages/ai/src/api/openrouter-images.ts:59]。
6. registry 的 `wrapGenerateImages` 校验 `model.api ===` 注册的 api，不匹配就 throw [E: packages/ai/src/images-api-registry.ts:30] [E: packages/ai/src/images-api-registry.ts:31] [E: packages/ai/src/images-api-registry.ts:32]。

## OpenRouter 图像绑定

`openrouterProvider()` 的 id 仍是 `"openrouter"`。`models` 数组拼接 `OPENROUTER_MODELS`、`OPENROUTER_IMAGE_MODELS`、`OPENROUTER_CLASSIFIER_MODELS` [E: packages/ai/src/providers/openrouter.ts:12] [E: packages/ai/src/providers/openrouter.ts:23] [E: packages/ai/src/providers/openrouter.ts:24] [E: packages/ai/src/providers/openrouter.ts:25] [E: packages/ai/src/providers/openrouter.ts:26]。chat 走 `anthropic-messages` / `openai-completions` map；图像走 `images: { "openrouter-images": openrouterImagesApi() }` [E: packages/ai/src/providers/openrouter.ts:28] [E: packages/ai/src/providers/openrouter.ts:32]。auth 同时有 `OPENROUTER_API_KEY` 与 lazy OpenRouter OAuth [E: packages/ai/src/providers/openrouter.ts:16] [E: packages/ai/src/providers/openrouter.ts:17]。

`builtinModels()` 下 `getModelsOfType("image")` 的每条都是 `type: "image"` 且 `api: "openrouter-images"`，且 `provider === "openrouter"` [E: packages/ai/test/images-models.test.ts:392] [E: packages/ai/test/images-models.test.ts:396] [E: packages/ai/test/images-models.test.ts:397]。`provider.getModels()` 仍全是 chat；图像只出现在 `getAllModels()` / `getModelsOfType("image")` [E: packages/ai/test/images-models.test.ts:394] [E: packages/ai/test/images-models.test.ts:395]。同一 upstream id 可分行：`google/gemini-3-pro-image` 的 chat 行 `api: "openai-completions"`，image 行 `api: "openrouter-images"` [E: packages/ai/test/images-models.test.ts:400] [E: packages/ai/test/images-models.test.ts:401] [E: packages/ai/test/images-models.test.ts:402] [E: packages/ai/test/images-models.test.ts:403]。两边 `getAuth` 解析同一 `OPENROUTER_API_KEY` [E: packages/ai/test/images-models.test.ts:406] [E: packages/ai/test/images-models.test.ts:407]。

`openrouterImagesApi()` 是 lazy `ProviderImages`：第一次调用才 `import("./openrouter-images.ts")` [E: packages/ai/src/api/openrouter-images.lazy.ts:3] [E: packages/ai/src/api/openrouter-images.lazy.ts:5]。compat registry 路径用 `register-builtins.ts` 的 `generateImagesOpenRouter`，失败时返回 lazy-load error `AssistantImages` 而不是 throw [E: packages/ai/src/providers/images/register-builtins.ts:37] [E: packages/ai/src/providers/images/register-builtins.ts:45] [E: packages/ai/src/providers/images/register-builtins.ts:18]。

## OpenRouter wire

`api/openrouter-images.ts` 的 `generateImages` 没有 apiKey 时 throw `No API key for provider: ${model.provider}`，catch 后写成 error/aborted result [E: packages/ai/src/api/openrouter-images.ts:57] [E: packages/ai/src/api/openrouter-images.ts:59] [E: packages/ai/src/api/openrouter-images.ts:112] [E: packages/ai/src/api/openrouter-images.ts:113]。client 是 OpenAI SDK，`baseURL: model.baseUrl`，`fetch` 传入 `options.fetch`（默认 SDK 用 `globalThis.fetch`）[E: packages/ai/src/api/openrouter-images.ts:125] [E: packages/ai/src/api/openrouter-images.ts:127] [E: packages/ai/src/api/openrouter-images.ts:129]。`maxRetries` 在 SDK 侧被设为 0，重试走 `retryProviderRequest` [E: packages/ai/src/api/openrouter-images.ts:70] [E: packages/ai/src/api/openrouter-images.ts:72]。

`buildParams` 把 context 编成单条 user message：text 走 `type: "text"`，image 走 `image_url` data URL；`modalities` 在 `model.output` 含 `"text"` 时是 `["image", "text"]`，否则 `["image"]` [E: packages/ai/src/api/openrouter-images.ts:139] [E: packages/ai/src/api/openrouter-images.ts:154] [E: packages/ai/src/api/openrouter-images.ts:163]。响应里字符串 `message.content` 变成 text block；`message.images[].image_url` 只接受 `data:` URL 并解析 mime + base64 [E: packages/ai/src/api/openrouter-images.ts:94] [E: packages/ai/src/api/openrouter-images.ts:99] [E: packages/ai/src/api/openrouter-images.ts:100] [E: packages/ai/src/api/openrouter-images.ts:103]。

## 设计动机与权衡

图像生成复用 provider / auth / model collection，但 contract 是 Promise result 而不是 `ProviderStreams`。文字模型的 [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) 不覆盖这条路径 [E: packages/ai/src/models.ts:220] [E: packages/ai/src/types.ts:307] [I]。

`Models.generateImages()` 有意把运行时错误编码成 `AssistantImages.stopReason = "error"|"aborted"`，让上层按统一 image result 处理成功和失败 [E: packages/ai/src/models.ts:340] [E: packages/ai/src/models.ts:955] [E: packages/ai/src/utils/model-operations.ts:50] [I]。全局 `images.ts` `generateImages()` 在缺 API provider 时仍 reject，因为它是按 api 的薄分派，不做 collection 级 catch [E: packages/ai/src/images.ts:8] [E: packages/ai/src/images.ts:9]。

未限定 type 的读取保持 chat-only，避免把 image 行送进 stream picker：`getBuiltinModels` / `Models.getModel` / compat `getModels` 都只返回 chat；测试对 OpenRouter 断言 `compat === chat` 且 `chat + images + classifiers === getAllBuiltinModels` [E: packages/ai/src/providers/all.ts:104] [E: packages/ai/src/models.ts:471] [E: packages/ai/test/images-models.test.ts:374] [E: packages/ai/test/images-models.test.ts:383] [E: packages/ai/test/images-models.test.ts:385]。

## gotcha

- 同名 `generateImages` 有两层：`images.ts` 按 `model.api` 查 registry；`Models.generateImages()` 按 `model.provider` 解析 auth。builtin 产品路径走后者 [E: packages/ai/src/images.ts:24] [E: packages/ai/src/models.ts:949]。
- `hasApi()` 对 image 模型永远 false，即使把 `api` 改成某个 KnownApi 字符串 [E: packages/ai/src/models.ts:1183] [E: packages/ai/src/models.ts:1184] [E: packages/ai/test/images-models.test.ts:138]。
- `image-models.ts` 的 `getImageModel` / `getImageModels` / `getImageProviders` 仍可读 `IMAGE_MODELS`，但全部标 `@deprecated`，新代码应走 `getBuiltinImageModel` 或 `getModelOfType("image", ...)` [E: packages/ai/src/image-models.ts:32] [E: packages/ai/src/image-models.ts:40] [E: packages/ai/src/image-models.ts:45]。
- 当前 builtin 图像模型全部挂在 `openrouter` 下；测试断言 `getModelsOfType("image")` 的 provider 都是 `openrouter`。第三方仍可通过 `createProvider({ images })` 注册别的 ImageApi [E: packages/ai/test/images-models.test.ts:397] [E: packages/ai/src/models.ts:1015] [I]。

## 跨包边界

[ref.ai.image-models](../../reference/image-models.md) 覆盖 `IMAGE_MODELS` 结构与 OpenRouter image catalog 的生成规则，不复制本节点的 auth/wire 走读 [I]。

[surface.misc.images](../../surface/misc/images.md) 覆盖用户输入图像、`inputLimits.images.resize` 与终端渲染；那些 `ImageContent` 可以成为 `ImagesContext.input`，但 CLI/TUI 输入路径不等于 `Models.generateImages()` [I]。

## Sources

- packages/ai/src/images.ts
- packages/ai/src/images-api-registry.ts
- packages/ai/src/image-models.ts
- packages/ai/src/models.ts
- packages/ai/src/types.ts
- packages/ai/src/utils/model-operations.ts
- packages/ai/src/api/openrouter-images.ts
- packages/ai/src/api/openrouter-images.lazy.ts
- packages/ai/src/providers/images/register-builtins.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/providers/all.ts
- packages/ai/test/images-models.test.ts

## 相关

- [ref.ai.image-models](../../reference/image-models.md): `IMAGE_MODELS` 结构 catalog 与 OpenRouter 图像模型的生成/读取边界。
- [subsys.ai.model-discovery](model-discovery.md): `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 三分 catalog 与 chat-only 默认读取。
- [surface.misc.images](../../surface/misc/images.md): 输入图像与终端显示，不是 provider 生成调用。
- [subsys.ai.provider-registry](provider-registry.md): `builtinProviders()` 含 `openrouterProvider()`；不再有独立 `builtinImagesProviders()`。
- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): chat `stream`/`streamSimple`；图像生成不走该 contract。
