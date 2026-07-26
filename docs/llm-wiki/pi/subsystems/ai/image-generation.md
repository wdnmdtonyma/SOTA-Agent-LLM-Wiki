---
id: subsys.ai.image-generation
title: 图像生成管线
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/images-models.ts
  - packages/ai/src/images.ts
  - packages/ai/src/providers/openrouter-images.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/test/openrouter-oauth.test.ts
symbols:
  - ImagesProvider
  - ImagesModel
  - generateImages
related:
  - ref.ai.image-models
evidence: explicit
status: verified
updated: cee5ff7520
---

> `subsys.ai.image-generation` 描述 `pi-ai` 的图像生成 provider/model runtime: `ImagesModels` 管 provider 清单、模型清单、refresh 和鉴权包装,底层 `generateImages` 再按 `ImagesModel.api` 分派到已注册的 image API implementation。

## 能回答的问题

- `ImagesProvider` 在图像生成侧必须提供哪些 provider metadata、模型清单和生成函数?
- `ImagesModels.generateImages()` 如何按 `model.provider` 找 provider、合并鉴权并把错误编码成 `AssistantImages`?
- `packages/ai/src/images.ts` 的 `generateImages()` 与 `ImagesModels.generateImages()` 有什么边界差异?
- OpenRouter image provider 的 id、auth、模型目录和 API adapter 从哪里来?
- `ref.ai.image-models` 应覆盖哪些 catalog 内容,本子系统节点不复制哪些模型清单?

## 职责边界

`ImagesProvider` 是图像生成侧 provider contract: 它包含 `id`、`name`、`auth`,同步 `getModels()`,可选 `refreshModels()`,以及真正执行请求的 `generateImages(model, context, options?)` [E: packages/ai/src/images-models.ts:12] [E: packages/ai/src/images-models.ts:13] [E: packages/ai/src/images-models.ts:14] [E: packages/ai/src/images-models.ts:21] [E: packages/ai/src/images-models.ts:29] [E: packages/ai/src/images-models.ts:36] [E: packages/ai/src/images-models.ts:38]。

`ImagesModels` 是 runtime provider collection: 它暴露 provider lookup、模型 lookup、dynamic refresh、auth resolution 和 auth-wrapped `generateImages()` convenience method [E: packages/ai/src/images-models.ts:49] [E: packages/ai/src/images-models.ts:50] [E: packages/ai/src/images-models.ts:51] [E: packages/ai/src/images-models.ts:57] [E: packages/ai/src/images-models.ts:60] [E: packages/ai/src/images-models.ts:68] [E: packages/ai/src/images-models.ts:75] [E: packages/ai/src/images-models.ts:83]。

本节点覆盖图像 provider/model runtime 和 OpenRouter provider binding,不展开 OpenRouter wire payload、response parsing,也不枚举 `IMAGE_MODELS.openrouter` 的每个模型;模型清单枚举归 [ref.ai.image-models](../../reference/image-models.md) 所有 [E: packages/ai/src/providers/openrouter-images.ts:4] [E: packages/ai/src/providers/openrouter-images.ts:19] [I]。

## 关键文件

- `packages/ai/src/images-models.ts`: 定义 `ImagesProvider`/`ImagesModels`,实现 provider map、模型读取、refresh、auth resolution、auth merge、错误编码和 `createImagesProvider()` [E: packages/ai/src/images-models.ts:12] [E: packages/ai/src/images-models.ts:49] [E: packages/ai/src/images-models.ts:97] [E: packages/ai/src/images-models.ts:180] [E: packages/ai/src/images-models.ts:206] [E: packages/ai/src/images-models.ts:212] [E: packages/ai/src/images-models.ts:218] [E: packages/ai/src/images-models.ts:250]。
- `packages/ai/src/images.ts`: 导入 image builtins registration,用 `getImagesApiProvider(model.api)` 找 image API provider,并把 `model/context/options` 转交给该 API provider 的 `generateImages()` [E: packages/ai/src/images.ts:1] [E: packages/ai/src/images.ts:3] [E: packages/ai/src/images.ts:7] [E: packages/ai/src/images.ts:14] [E: packages/ai/src/images.ts:19] [E: packages/ai/src/images.ts:20]。
- `packages/ai/src/providers/openrouter-images.ts`: 创建内置 OpenRouter image provider,把 provider id/name/auth、generated model catalog 和 lazy image API adapter 绑在一起 [E: packages/ai/src/providers/openrouter-images.ts:1] [E: packages/ai/src/providers/openrouter-images.ts:4] [E: packages/ai/src/providers/openrouter-images.ts:7] [E: packages/ai/src/providers/openrouter-images.ts:9] [E: packages/ai/src/providers/openrouter-images.ts:10] [E: packages/ai/src/providers/openrouter-images.ts:12] [E: packages/ai/src/providers/openrouter-images.ts:19] [E: packages/ai/src/providers/openrouter-images.ts:20]。

## 数据模型

`ImagesModel<ImagesApi>` 是本子系统流经 provider 清单、模型查找和生成请求的模型类型: `ImagesProvider.getModels()` 返回 `readonly ImagesModel<ImagesApi>[]`, `ImagesProvider.generateImages()` 和 `ImagesModels.generateImages()` 都接收同一个 `ImagesModel<ImagesApi>` [E: packages/ai/src/images-models.ts:29] [E: packages/ai/src/images-models.ts:38] [E: packages/ai/src/images-models.ts:57] [E: packages/ai/src/images-models.ts:83]。

`CreateImagesProviderOptions` 把 provider 工厂拆成 `id`、可选 `name`、必需 `auth`、初始 `models`、可选 dynamic `refreshModels` 和一个 `ProviderImages` API adapter; `createImagesProvider()` 用这些 part 生成符合 `ImagesProvider` contract 的对象 [E: packages/ai/src/images-models.ts:230] [E: packages/ai/src/images-models.ts:231] [E: packages/ai/src/images-models.ts:233] [E: packages/ai/src/images-models.ts:235] [E: packages/ai/src/images-models.ts:237] [E: packages/ai/src/images-models.ts:245] [E: packages/ai/src/images-models.ts:246] [E: packages/ai/src/images-models.ts:250]。

`createImagesProvider()` 的模型清单是 mutable snapshot: 它先保存 `input.models`, `getModels()` 返回当前 snapshot;如果提供 `refreshModels`,成功返回的新列表会替换 snapshot,并且并发 refresh 共享同一个 in-flight promise [E: packages/ai/src/images-models.ts:251] [E: packages/ai/src/images-models.ts:252] [E: packages/ai/src/images-models.ts:259] [E: packages/ai/src/images-models.ts:260] [E: packages/ai/src/images-models.ts:262] [E: packages/ai/src/images-models.ts:264] [E: packages/ai/src/images-models.ts:269]。

## 控制流

1. `createImagesModels@packages/ai/src/images-models.ts:219` 返回 `ImagesModelsImpl`,其 constructor 使用传入 credential/auth context 或默认 in-memory credential store 与默认 auth context [E: packages/ai/src/images-models.ts:102] [E: packages/ai/src/images-models.ts:103] [E: packages/ai/src/images-models.ts:104] [E: packages/ai/src/images-models.ts:226] [E: packages/ai/src/images-models.ts:227]。
2. Provider lifecycle 由 `setProvider()`、`deleteProvider()`、`clearProviders()` 管理,内部 key 是 `provider.id`;读取 provider list 时返回 `providers.values()` 的数组快照 [E: packages/ai/src/images-models.ts:98] [E: packages/ai/src/images-models.ts:107] [E: packages/ai/src/images-models.ts:108] [E: packages/ai/src/images-models.ts:111] [E: packages/ai/src/images-models.ts:115] [E: packages/ai/src/images-models.ts:119] [E: packages/ai/src/images-models.ts:120]。
3. `ImagesModels.getModels(provider?)` 对指定 provider 做 map lookup,provider 不存在返回空数组,provider `getModels()` throw 也返回空数组;未指定 provider 时逐个 provider best-effort 拼接模型清单,throwing provider 被跳过 [E: packages/ai/src/images-models.ts:127] [E: packages/ai/src/images-models.ts:129] [E: packages/ai/src/images-models.ts:130] [E: packages/ai/src/images-models.ts:132] [E: packages/ai/src/images-models.ts:134] [E: packages/ai/src/images-models.ts:138] [E: packages/ai/src/images-models.ts:141]。
4. `ImagesModels.refresh(provider?)` 在指定 provider 时只调用该 provider 的 `refreshModels()`;该 refresh 抛普通错误时包装成 `ModelsError("model_source", ...)`,未指定 provider 时对所有 provider 的可选 `refreshModels()` 执行 `Promise.allSettled()` best-effort refresh [E: packages/ai/src/images-models.ts:153] [E: packages/ai/src/images-models.ts:155] [E: packages/ai/src/images-models.ts:156] [E: packages/ai/src/images-models.ts:158] [E: packages/ai/src/images-models.ts:161] [E: packages/ai/src/images-models.ts:168]。
5. `ImagesModels.generateImages@packages/ai/src/images-models.ts:176` 先用 `model.provider` 找 owning provider,找不到时抛 `ModelsError("provider", ...)`,随后用 provider/model/credential/auth context 解析请求 auth [E: packages/ai/src/images-models.ts:188] [E: packages/ai/src/images-models.ts:189] [E: packages/ai/src/images-models.ts:191] [E: packages/ai/src/images-models.ts:180]。
6. 如果 auth resolution 没有产生 auth,`ImagesModels.generateImages()` 直接调用 provider 的 `generateImages(model, context, options)`;如果 auth 带 `baseUrl`,request model 会被复制并覆盖 `baseUrl` [E: packages/ai/src/images-models.ts:198] [E: packages/ai/src/images-models.ts:199] [E: packages/ai/src/images-models.ts:200] [E: packages/ai/src/images-models.ts:203]。
7. `ImagesModels.generateImages()` 的 auth merge 规则是显式 `options.apiKey` 优先于 resolved `auth.apiKey`;headers 和 env 按 key 合并,调用方 options 覆盖 resolved auth/env 中同名 key,最后把合并后的 options 传给 provider [E: packages/ai/src/images-models.ts:206] [E: packages/ai/src/images-models.ts:207] [E: packages/ai/src/images-models.ts:208] [E: packages/ai/src/images-models.ts:209] [E: packages/ai/src/images-models.ts:211]。
8. `ImagesModels.generateImages()` 捕获 provider lookup、auth resolution 和 provider call 的所有错误,返回 `AssistantImages` shape 的 error result: `api/provider/model` 来自请求模型,`output` 为空数组,`stopReason` 为 `"error"`,并填入 error message 与 timestamp [E: packages/ai/src/images-models.ts:212] [E: packages/ai/src/images-models.ts:213] [E: packages/ai/src/images-models.ts:214] [E: packages/ai/src/images-models.ts:215] [E: packages/ai/src/images-models.ts:216] [E: packages/ai/src/images-models.ts:217] [E: packages/ai/src/images-models.ts:218] [E: packages/ai/src/images-models.ts:219] [E: packages/ai/src/images-models.ts:220]。
9. 底层 `generateImages@packages/ai/src/images.ts:14` 不是 provider collection wrapper: 它只按 `model.api` 从 image API registry 取 `ProviderImages`,缺失 API provider 时抛错并使 async `generateImages()` 返回 rejected Promise,命中后直接调用 API provider 的 `generateImages()` [E: packages/ai/src/images.ts:6] [E: packages/ai/src/images.ts:7] [E: packages/ai/src/images.ts:8] [E: packages/ai/src/images.ts:9] [E: packages/ai/src/images.ts:14] [E: packages/ai/src/images.ts:19] [E: packages/ai/src/images.ts:20]。
10. `createImagesProvider()` 生成的 provider method 只是把 `model/context/options` 转交给 `input.api.generateImages()`,因此实际 wire payload/HTTP 实现留在 API adapter 侧,provider factory 只负责 model/auth/API adapter 组装 [E: packages/ai/src/images-models.ts:246] [E: packages/ai/src/images-models.ts:272] [I]。

## OpenRouter image provider

`openrouterImagesProvider()` 返回 `createImagesProvider({...})` 的结果,provider id 固定为 `"openrouter"`,显示名为 `"OpenRouter"` [E: packages/ai/src/providers/openrouter-images.ts:7] [E: packages/ai/src/providers/openrouter-images.ts:8] [E: packages/ai/src/providers/openrouter-images.ts:9] [E: packages/ai/src/providers/openrouter-images.ts:10]。

OpenRouter image provider 的 auth 同时包含 `OPENROUTER_API_KEY` helper 与 lazy OpenRouter OAuth loader；它与 text provider 共用 id `openrouter`。两个 collection 注入同一个 `CredentialStore` 时，会从同一 provider key 解析相同 stored OAuth access key；测试分别调用 text/image `getAuth("openrouter")` 并断言结果一致 [E: packages/ai/src/providers/openrouter-images.ts:2] [E: packages/ai/src/providers/openrouter-images.ts:3] [E: packages/ai/src/providers/openrouter-images.ts:9] [E: packages/ai/src/providers/openrouter-images.ts:12] [E: packages/ai/src/providers/openrouter-images.ts:13] [E: packages/ai/src/providers/openrouter-images.ts:16] [E: packages/ai/src/images-models.ts:177] [E: packages/ai/src/images-models.ts:180] [E: packages/ai/test/openrouter-oauth.test.ts:36] [E: packages/ai/test/openrouter-oauth.test.ts:38] [E: packages/ai/test/openrouter-oauth.test.ts:45] [E: packages/ai/test/openrouter-oauth.test.ts:47] [E: packages/ai/test/openrouter-oauth.test.ts:50] [E: packages/ai/test/openrouter-oauth.test.ts:51]。

OpenRouter image provider 的模型列表来自 generated catalog `IMAGE_MODELS.openrouter`,并以 `Object.values(...)` 交给 `createImagesProvider()` 的 `models` 字段;本文件不维护逐模型常量 [E: packages/ai/src/providers/openrouter-images.ts:4] [E: packages/ai/src/providers/openrouter-images.ts:19] [I]。

OpenRouter image provider 的 API adapter 来自 `openrouterImagesApi()` lazy wrapper,并作为 `api` 字段交给 provider factory;后续 provider `generateImages()` 会转调这个 adapter 的 `generateImages()` [E: packages/ai/src/providers/openrouter-images.ts:1] [E: packages/ai/src/providers/openrouter-images.ts:20] [E: packages/ai/src/images-models.ts:272]。

## 设计动机与权衡

图像生成 runtime 复用了 provider/auth/model collection 的结构,但 API contract 是 `ProviderImages.generateImages()` 的 Promise result,不是文字模型的 event stream contract;`images.ts` 只解析 image API registry 并返回 `AssistantImages` promise [E: packages/ai/src/images.ts:6] [E: packages/ai/src/images.ts:14] [E: packages/ai/src/images.ts:20] [I]。

`ImagesModels.getModels()` 和 all-provider `refresh()` 都是 best-effort 边界:单个 provider 的 `getModels()` throw 不会中断读取所有模型,未指定 provider 的 refresh 用 `Promise.allSettled()` 吃掉单个 provider 失败;指定 provider refresh 则会把失败暴露给 caller [E: packages/ai/src/images-models.ts:131] [E: packages/ai/src/images-models.ts:134] [E: packages/ai/src/images-models.ts:140] [E: packages/ai/src/images-models.ts:142] [E: packages/ai/src/images-models.ts:157] [E: packages/ai/src/images-models.ts:161] [E: packages/ai/src/images-models.ts:168]。

`ImagesModels.generateImages()` 有意把运行时错误编码成 `AssistantImages.stopReason = "error"` 而不是向上 reject;这让上层可以按统一 image result shape 处理成功和失败 [E: packages/ai/src/images-models.ts:212] [E: packages/ai/src/images-models.ts:217] [E: packages/ai/src/images-models.ts:218] [I]。

## gotcha

- 同名 `generateImages` 有两个层级: `packages/ai/src/images.ts` 的导出函数按 `model.api` 选择 image API provider,`ImagesModels.generateImages()` 按 `model.provider` 选择 owning provider 并处理 auth/error wrapper;读调用栈时要先看 caller 持有的是 API-level function 还是 `ImagesModels` instance [E: packages/ai/src/images.ts:19] [E: packages/ai/src/images-models.ts:189] [I]。
- `ImagesModels.getAuth(model)` 只按 `model.provider` 找 provider;provider 不存在时返回 `undefined`,不构造 error result,而 `ImagesModels.generateImages()` 的未知 provider 会被 catch 后转成 error result [E: packages/ai/src/images-models.ts:171] [E: packages/ai/src/images-models.ts:189] [E: packages/ai/src/images-models.ts:179] [E: packages/ai/src/images-models.ts:188] [E: packages/ai/src/images-models.ts:191] [E: packages/ai/src/images-models.ts:212]。
- `builtinImagesProviders()` 的完整返回数组当前只含 `openrouterImagesProvider()`，因此目标树唯一内置 image-generation provider 是 OpenRouter；外部调用方仍可向 mutable collection 注册第三方 provider。[E: packages/ai/src/providers/all.ts:140] [E: packages/ai/src/providers/all.ts:141] [E: packages/ai/src/images-models.ts:107]

## 跨包边界

[ref.ai.image-models](../../reference/image-models.md) 应逐模型覆盖 generated image catalog,包括 `IMAGE_MODELS.openrouter` 中有哪些模型、各模型 metadata 和对应 provider;本节点只记录 OpenRouter provider 从 generated catalog 取 `Object.values(IMAGE_MODELS.openrouter)` 作为模型清单 [E: packages/ai/src/providers/openrouter-images.ts:4] [E: packages/ai/src/providers/openrouter-images.ts:19] [I]。

文字模型的 `subsys.ai.wire-protocol-dispatch` 以 `ProviderStreams.stream/streamSimple` 为核心,图像生成不走这个 contract;本节点只说 image-side `ProviderImages.generateImages()` promise contract 和 `ImagesModels` wrapper [E: packages/ai/src/images.ts:14] [E: packages/ai/src/images.ts:20] [I]。

## Sources

- packages/ai/src/images-models.ts
- packages/ai/src/images.ts
- packages/ai/src/providers/openrouter-images.ts
- packages/ai/src/providers/all.ts
- packages/ai/test/openrouter-oauth.test.ts

## 相关

- [ref.ai.image-models](../../reference/image-models.md): 图像模型/provider 目录的逐项 catalog,应枚举 `IMAGE_MODELS.openrouter` 的模型实例,避免在 subsystem 节点复制模型表。
