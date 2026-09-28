---
id: subsys.coding-agent.model-registry
title: 模型运行时与兼容注册表
kind: subsystem
tier: T2
pkg: coding-agent
source:
 - packages/coding-agent/src/core/model-runtime.ts
 - packages/coding-agent/src/core/model-registry.ts
 - packages/coding-agent/src/core/model-config.ts
 - packages/coding-agent/src/core/models-store.ts
 - packages/coding-agent/src/core/provider-composer.ts
 - packages/coding-agent/src/core/runtime-credentials.ts
 - packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts
 - packages/coding-agent/test/model-catalog-refresh.test.ts
 - packages/coding-agent/test/model-registry.test.ts
 - packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts
 - packages/coding-agent/docs/extensions.md
 - packages/ai/src/models.ts
 - packages/ai/src/providers/all.ts
symbols:
 - ModelRuntime
 - ModelRegistry
 - ModelRegistry.stream
 - ModelRegistry.streamSimple
 - ModelRuntime.generateImages
 - ModelRuntime.classify
 - ModelRuntime.getModelsOfType
 - ModelConfig
 - composeModelProvider
 - ProviderModelConfig
related:
 - subsys.coding-agent.model-resolver
 - subsys.coding-agent.auth-storage
 - subsys.ai.provider-registry
 - subsys.ai.model-discovery
evidence: explicit
status: verified
updated: 6f7551516b
---

> `ModelRuntime` 已取代旧 `ModelRegistry` 成为 coding-agent 的 canonical 模型/auth runtime；`ModelRegistry` 现在只是面向 extension 兼容 API 的同步 facade。

## 能回答的问题

- built-in provider、`models.json`、extension provider 如何合成？
- `getModels()` 与 available snapshot 有什么差别？
- auth、动态 model refresh 和 request headers 在哪里接入？
- `refresh()` 的 `ModelsRefreshOptions` / `ModelsRefreshResult` 是什么, 并发 refresh 如何共享 in-flight catalog 拉取？
- runtime `--api-key` 如何影响 availability？
- `getModelsOfType` / `generateImages` / `classify` 怎样按 `chat` / `image` / `classifier` 分流？
- 为什么 `ModelRegistry` 仍存在，但不再拥有核心状态,也不暴露 image/classifier API？
- `ModelRegistry.stream` / `streamSimple` 怎样做 request-time auth,扩展能不能用它们打 `pi.registerProvider()` 的自定义 provider？

## Canonical runtime

`ModelRuntime` 自己持有 `pi-ai` `MutableModels`、`RuntimeCredentials`、built-in/native-extension/config extension provider maps、`ModelConfig` 与 availability snapshot [E: packages/coding-agent/src/core/model-runtime.ts:153] [E: packages/coding-agent/src/core/model-runtime.ts:154] [E: packages/coding-agent/src/core/model-runtime.ts:155] [E: packages/coding-agent/src/core/model-runtime.ts:156] [E: packages/coding-agent/src/core/model-runtime.ts:158] [E: packages/coding-agent/src/core/model-runtime.ts:159] [E: packages/coding-agent/src/core/model-runtime.ts:163] [E: packages/coding-agent/src/core/model-runtime.ts:164]。constructor 用同一 credential overlay 创建 `pi-ai Models` collection，并立刻重建 provider 集 [E: packages/coding-agent/src/core/model-runtime.ts:185] [E: packages/coding-agent/src/core/model-runtime.ts:189] [E: packages/coding-agent/src/core/model-runtime.ts:191] [E: packages/coding-agent/src/core/model-runtime.ts:192]。

`create()` 默认从 `auth.json` 建 `AuthStorage`，再包成 `RuntimeCredentials`；默认读取 agent dir 下的 `models.json`，动态 catalog cache 使用相邻的 `models-store.json`。built-in providers 来自 `providers/all`，非 radius provider 会包装 remote catalog 能力 [E: packages/coding-agent/src/core/model-runtime.ts:195] [E: packages/coding-agent/src/core/model-runtime.ts:196] [E: packages/coding-agent/src/core/model-runtime.ts:197] [E: packages/coding-agent/src/core/model-runtime.ts:199] [E: packages/coding-agent/src/core/model-runtime.ts:200] [E: packages/coding-agent/src/core/model-runtime.ts:203] [E: packages/coding-agent/src/core/model-runtime.ts:206] [E: packages/coding-agent/src/core/model-runtime.ts:207] [E: packages/coding-agent/src/core/model-runtime.ts:209]。初始化 refresh 只在 `options.modelRefreshTimeoutMs` 已设置时才启动 abort timer;默认 `create()` 没有 15s timer。15s timeout 在 `InteractiveMode.run()` 的 `refreshModelCatalogs()` 路径, 不是 `create()` 默认行为。`PI_OFFLINE` 会关闭默认网络刷新 [E: packages/coding-agent/src/core/model-runtime.ts:219] [E: packages/coding-agent/src/core/model-runtime.ts:223] [E: packages/coding-agent/src/core/model-runtime.ts:225] [E: packages/coding-agent/src/core/model-runtime.ts:226] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1095] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1097] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1097]。

## Provider 合成与配置

参与合成的 provider id 是 built-ins、native extensions、`models.json` 与 config extensions 的并集 [E: packages/coding-agent/src/core/model-runtime.ts:259] [E: packages/coding-agent/src/core/model-runtime.ts:261] [E: packages/coding-agent/src/core/model-runtime.ts:262] [E: packages/coding-agent/src/core/model-runtime.ts:263] [E: packages/coding-agent/src/core/model-runtime.ts:264]。没有 overlay 的 built-in 原样进入 `pi-ai Models`；存在配置层时交给 `composeModelProvider()`，合成错误被记录，且有 base 时回退到 base provider [E: packages/coding-agent/src/core/model-runtime.ts:268] [E: packages/coding-agent/src/core/model-runtime.ts:269] [E: packages/coding-agent/src/core/model-runtime.ts:276] [E: packages/coding-agent/src/core/model-runtime.ts:278] [E: packages/coding-agent/src/core/model-runtime.ts:283] [E: packages/coding-agent/src/core/model-runtime.ts:286] [E: packages/coding-agent/src/core/model-runtime.ts:287] [E: packages/coding-agent/src/core/model-runtime.ts:288]。

`models.json` 的 provider schema 支持 name、baseUrl、apiKey、api、radius OAuth、headers、compat、authHeader、custom models 与 modelOverrides [E: packages/coding-agent/src/core/model-config.ts:229] [E: packages/coding-agent/src/core/model-config.ts:230] [E: packages/coding-agent/src/core/model-config.ts:231] [E: packages/coding-agent/src/core/model-config.ts:232] [E: packages/coding-agent/src/core/model-config.ts:233] [E: packages/coding-agent/src/core/model-config.ts:234] [E: packages/coding-agent/src/core/model-config.ts:235] [E: packages/coding-agent/src/core/model-config.ts:236] [E: packages/coding-agent/src/core/model-config.ts:237] [E: packages/coding-agent/src/core/model-config.ts:238] [E: packages/coding-agent/src/core/model-config.ts:239]。custom model 的 `id` 必填，其余 capability/cost/header/compat 字段可选；override 是 metadata/cost/header/compat 的 partial layer [E: packages/coding-agent/src/core/model-config.ts:188] [E: packages/coding-agent/src/core/model-config.ts:189] [E: packages/coding-agent/src/core/model-config.ts:191] [E: packages/coding-agent/src/core/model-config.ts:192] [E: packages/coding-agent/src/core/model-config.ts:197] [E: packages/coding-agent/src/core/model-config.ts:199] [E: packages/coding-agent/src/core/model-config.ts:200] [E: packages/coding-agent/src/core/model-config.ts:202] [E: packages/coding-agent/src/core/model-config.ts:203] [E: packages/coding-agent/src/core/model-config.ts:206] [E: packages/coding-agent/src/core/model-config.ts:222] [E: packages/coding-agent/src/core/model-config.ts:226]。

OpenAI Completions compat schema 现在接受 `thinkingFormat: "baseten"` 与 `chatTemplateArgs` record；`mergeCompat()` 将它与 `chatTemplateKwargs` 一样作为 nested object 合并，避免 model override 整体丢掉 base 的 template args。[E: packages/coding-agent/src/core/model-config.ts:84] [E: packages/coding-agent/src/core/model-config.ts:89] [E: packages/coding-agent/src/core/model-config.ts:99] [E: packages/coding-agent/src/core/model-config.ts:100] [E: packages/coding-agent/src/core/provider-composer.ts:121] [E: packages/coding-agent/src/core/provider-composer.ts:130] [E: packages/coding-agent/src/core/provider-composer.ts:137]

`ModelConfig.load()` 接受带注释的 JSON，缺文件返回空配置，parse/schema 错误保存在 config error 中；成功后每个 provider config 会 clone、deep-freeze 后存入 map [E: packages/coding-agent/src/core/model-config.ts:281] [E: packages/coding-agent/src/core/model-config.ts:282] [E: packages/coding-agent/src/core/model-config.ts:286] [E: packages/coding-agent/src/core/model-config.ts:288] [E: packages/coding-agent/src/core/model-config.ts:297] [E: packages/coding-agent/src/core/model-config.ts:301] [E: packages/coding-agent/src/core/model-config.ts:305] [E: packages/coding-agent/src/core/model-config.ts:311] [E: packages/coding-agent/src/core/model-config.ts:316] [E: packages/coding-agent/src/core/model-config.ts:317] [E: packages/coding-agent/src/core/model-config.ts:319]。

`composeModelProvider()` 的层次顺序是 built-in → `models.json` custom/upsert → extension model replacement → `models.json` modelOverrides；它还合成 API-key/OAuth auth，并选择 built-in、extension 或 compat API stream implementation [E: packages/coding-agent/src/core/provider-composer.ts:523] [E: packages/coding-agent/src/core/provider-composer.ts:529] [E: packages/coding-agent/src/core/provider-composer.ts:537] [E: packages/coding-agent/src/core/provider-composer.ts:445] [E: packages/coding-agent/src/core/provider-composer.ts:540] [E: packages/coding-agent/src/core/provider-composer.ts:553] [E: packages/coding-agent/src/core/provider-composer.ts:453] [E: packages/coding-agent/src/core/provider-composer.ts:559] [E: packages/coding-agent/src/core/provider-composer.ts:560] [E: packages/coding-agent/src/core/provider-composer.ts:574] [E: packages/coding-agent/src/core/provider-composer.ts:579] [E: packages/coding-agent/src/core/provider-composer.ts:582]。

## Inventory 与 availability

`getModels()`/`getModel()` 是 last-known catalog 的同步读取；`getAvailable()` 会等待正在进行的 availability refresh，并以 auth check 结果过滤 provider [E: packages/coding-agent/src/core/model-runtime.ts:415] [E: packages/coding-agent/src/core/model-runtime.ts:416] [E: packages/coding-agent/src/core/model-runtime.ts:419] [E: packages/coding-agent/src/core/model-runtime.ts:420] [E: packages/coding-agent/src/core/model-runtime.ts:354] [E: packages/coding-agent/src/core/model-runtime.ts:357] [E: packages/coding-agent/src/core/model-runtime.ts:358] [E: packages/coding-agent/src/core/model-runtime.ts:367] [E: packages/coding-agent/src/core/model-runtime.ts:470]。refresh 同时取 available models、每个 provider 的 auth check 和 credential metadata，生成 `all`、`available`、configured/stored provider sets 与 auth map [E: packages/coding-agent/src/core/model-runtime.ts:308] [E: packages/coding-agent/src/core/model-runtime.ts:310] [E: packages/coding-agent/src/core/model-runtime.ts:311] [E: packages/coding-agent/src/core/model-runtime.ts:320] [E: packages/coding-agent/src/core/model-runtime.ts:329] [E: packages/coding-agent/src/core/model-runtime.ts:331] [E: packages/coding-agent/src/core/model-runtime.ts:332] [E: packages/coding-agent/src/core/model-runtime.ts:333] [E: packages/coding-agent/src/core/model-runtime.ts:334]。

动态 catalog 的 `FileModelsStore` 复用 locked JSON backend，以 provider id 为 key 读写 `ModelsStoreEntry` [E: packages/coding-agent/src/core/models-store.ts:47] [E: packages/coding-agent/src/core/models-store.ts:52] [E: packages/coding-agent/src/core/models-store.ts:30] [E: packages/coding-agent/src/core/models-store.ts:37] [E: packages/coding-agent/src/core/models-store.ts:37] [E: packages/coding-agent/src/core/models-store.ts:42] [E: packages/coding-agent/src/core/models-store.ts:130] [E: packages/coding-agent/src/core/models-store.ts:132]。`pi-ai Models.refresh()` 总是先跑 cache-only `refreshModels` phase (`allowNetwork: false`), 然后在 `allowNetwork` 为真时再跑 networked phase;这不是失败后的 fallback [E: packages/ai/src/models.ts:545] [E: packages/ai/src/models.ts:570] [E: packages/ai/src/models.ts:570] [E: packages/ai/src/models.ts:572] [E: packages/ai/src/models.ts:574] [E: packages/ai/src/models.ts:576] [E: packages/ai/src/models.ts:526] [E: packages/ai/src/models.ts:535] [E: packages/ai/src/models.ts:539]。provider error 汇总返回 [E: packages/ai/src/models.ts:579] [E: packages/ai/src/models.ts:583] [E: packages/ai/src/models.ts:604]。

## Auth 与请求

runtime auth 状态按 runtime override、stored credential、`models.json`/extension configured key、ambient auth check 的顺序呈现 [E: packages/coding-agent/src/core/model-runtime.ts:612] [E: packages/coding-agent/src/core/model-runtime.ts:613] [E: packages/coding-agent/src/core/model-runtime.ts:614] [E: packages/coding-agent/src/core/model-runtime.ts:615] [E: packages/coding-agent/src/core/model-runtime.ts:619] [E: packages/coding-agent/src/core/model-runtime.ts:620] [E: packages/coding-agent/src/core/model-runtime.ts:621]。`setRuntimeApiKey()` 更新 credential overlay 和 snapshot 后刷新 model runtime，因此首次 `--api-key` 不需要写入 `auth.json` [E: packages/coding-agent/src/core/model-runtime.ts:485] [E: packages/coding-agent/src/core/model-runtime.ts:590] [E: packages/coding-agent/src/core/model-runtime.ts:473] [E: packages/coding-agent/src/core/model-runtime.ts:860] [E: packages/coding-agent/src/core/model-runtime.ts:873] [E: packages/coding-agent/src/core/model-runtime.ts:488]。

请求前 `prepareRequest()` 要求 provider 与 resolved auth 都存在；resolved baseUrl 覆盖 request model，显式 request API key 胜过 resolved key，headers/env 按字段合并 [E: packages/coding-agent/src/core/model-runtime.ts:505] [E: packages/coding-agent/src/core/model-runtime.ts:635] [E: packages/coding-agent/src/core/model-runtime.ts:513] [E: packages/coding-agent/src/core/model-runtime.ts:642] [E: packages/coding-agent/src/core/model-runtime.ts:646] [E: packages/coding-agent/src/core/model-runtime.ts:648] [E: packages/coding-agent/src/core/model-runtime.ts:650] [E: packages/coding-agent/src/core/model-runtime.ts:600] [E: packages/coding-agent/src/core/model-runtime.ts:658] [E: packages/coding-agent/src/core/model-runtime.ts:659] [E: packages/coding-agent/src/core/model-runtime.ts:660]。`stream`/`streamSimple` 都延迟执行这一步，再委托拥有该 model 的 provider [E: packages/coding-agent/src/core/model-runtime.ts:665] [E: packages/coding-agent/src/core/model-runtime.ts:707] [E: packages/coding-agent/src/core/model-runtime.ts:620] [E: packages/coding-agent/src/core/model-runtime.ts:689] [E: packages/coding-agent/src/core/model-runtime.ts:693] [E: packages/coding-agent/src/core/model-runtime.ts:639]。

`getModels()` / `getModel()` 仍是 chat-only 同步读取;`getModelsOfType(type)` / `getModelOfType(type, ...)` / `getAllModels()` 才覆盖 `chat` / `image` / `classifier`。[E: packages/coding-agent/src/core/model-runtime.ts:415] [E: packages/coding-agent/src/core/model-runtime.ts:423] [E: packages/coding-agent/src/core/model-runtime.ts:427] [E: packages/coding-agent/src/core/model-runtime.ts:435] `generateImages()` / `classify()` 各自 `assertImageModel` / `assertClassifierModel`,再 `prepareRequest()` 做同一套 request-time auth,最后要求 provider 实现对应方法;失败返回 `imageErrorResult` / `classifierErrorResult` 而不是抛给调用方。[E: packages/coding-agent/src/core/model-runtime.ts:738] [E: packages/coding-agent/src/core/model-runtime.ts:744] [E: packages/coding-agent/src/core/model-runtime.ts:746] [E: packages/coding-agent/src/core/model-runtime.ts:749] [E: packages/coding-agent/src/core/model-runtime.ts:751] [E: packages/coding-agent/src/core/model-runtime.ts:755] [E: packages/coding-agent/src/core/model-runtime.ts:761] [E: packages/coding-agent/src/core/model-runtime.ts:763] [E: packages/coding-agent/src/core/model-runtime.ts:766] [E: packages/coding-agent/src/core/model-runtime.ts:768]

`composeModelProvider()` 的 type overlay:`getModels()` 仍 filter `isModelType(..., "chat")`,`getAllModels()` 保留全部 type。extension `ProviderModelConfig` 是 `chat` | `image` | `classifier` 判别联合,`extensionModelFromDefinition()` 按 `definition.type` 填对应 api;extension `images` / `classifiers` map 按 `model.api` 覆盖 base `generateImages` / `classify`。`models.json` custom models 仍走 chat `modelFromJson`;`modelOverrides` 也只 apply 到 chat。[E: packages/coding-agent/src/core/provider-composer.ts:64] [E: packages/coding-agent/src/core/provider-composer.ts:75] [E: packages/coding-agent/src/core/provider-composer.ts:81] [E: packages/coding-agent/src/core/provider-composer.ts:87] [E: packages/coding-agent/src/core/provider-composer.ts:100] [E: packages/coding-agent/src/core/provider-composer.ts:262] [E: packages/coding-agent/src/core/provider-composer.ts:272] [E: packages/coding-agent/src/core/provider-composer.ts:275] [E: packages/coding-agent/src/core/provider-composer.ts:308] [E: packages/coding-agent/src/core/provider-composer.ts:552] [E: packages/coding-agent/src/core/provider-composer.ts:592] [E: packages/coding-agent/src/core/provider-composer.ts:635] [E: packages/coding-agent/src/core/provider-composer.ts:638] [E: packages/coding-agent/src/core/provider-composer.ts:647] [E: packages/coding-agent/src/core/provider-composer.ts:650]

login/logout 委托 `pi-ai Models`，随后 refresh；reload 则重新加载 `ModelConfig`、重建 providers 再 refresh [E: packages/coding-agent/src/core/model-runtime.ts:572] [E: packages/coding-agent/src/core/model-runtime.ts:573] [E: packages/coding-agent/src/core/model-runtime.ts:488] [E: packages/coding-agent/src/core/model-runtime.ts:582] [E: packages/coding-agent/src/core/model-runtime.ts:583] [E: packages/coding-agent/src/core/model-runtime.ts:882] [E: packages/coding-agent/src/core/model-runtime.ts:583] [E: packages/coding-agent/src/core/model-runtime.ts:582] [E: packages/coding-agent/src/core/model-runtime.ts:790] [E: packages/coding-agent/src/core/model-runtime.ts:796] [E: packages/coding-agent/src/core/model-runtime.ts:583]。

## Extension 注册与兼容 facade

native `Provider` 与旧式 `ProviderConfigInput` 都可注册；旧式注册先验证，再把非 `undefined` 字段合并到上次 registration，重组单个 provider 并异步无网络 refresh [E: packages/coding-agent/src/core/model-runtime.ts:832] [E: packages/coding-agent/src/core/model-runtime.ts:835] [E: packages/coding-agent/src/core/model-runtime.ts:836] [E: packages/coding-agent/src/core/model-runtime.ts:841] [E: packages/coding-agent/src/core/model-runtime.ts:844] [E: packages/coding-agent/src/core/model-runtime.ts:848] [E: packages/coding-agent/src/core/model-runtime.ts:851] [E: packages/coding-agent/src/core/model-runtime.ts:853] [E: packages/coding-agent/src/core/model-runtime.ts:854] [E: packages/coding-agent/src/core/model-runtime.ts:876]。

`ModelRegistry` constructor 只保存一个 `ModelRuntime`；`getAll`、`getAvailable`、`find`、auth 查询、provider registration 以及 `stream` / `streamSimple` / `complete` 全部委托 runtime [E: packages/coding-agent/src/core/model-registry.ts:34] [E: packages/coding-agent/src/core/model-registry.ts:37] [E: packages/coding-agent/src/core/model-registry.ts:50] [E: packages/coding-agent/src/core/model-registry.ts:54] [E: packages/coding-agent/src/core/model-registry.ts:58] [E: packages/coding-agent/src/core/model-registry.ts:106] [E: packages/coding-agent/src/core/model-registry.ts:111] [E: packages/coding-agent/src/core/model-registry.ts:115] [E: packages/coding-agent/src/core/model-registry.ts:116] [E: packages/coding-agent/src/core/model-registry.ts:147] [E: packages/coding-agent/src/core/model-registry.ts:152] [E: packages/coding-agent/src/core/model-registry.ts:155]。facade **没有** `generateImages` / `classify` / `getModelsOfType`;image/classifier 调用必须走 `ModelRuntime`。[I] 所以这个文件仍是 extension API 的兼容面，不是核心 state owner [I]。

`ModelRegistry.stream()` / `streamSimple()` 在 request-time 走 `ModelRuntime.prepareRequest()`(解析 auth、headers、baseUrl)再调用拥有该 model 的 provider。[E: packages/coding-agent/src/core/model-registry.ts:106] [E: packages/coding-agent/src/core/model-registry.ts:111] [E: packages/coding-agent/src/core/model-runtime.ts:573] [E: packages/coding-agent/src/core/model-runtime.ts:665] [E: packages/coding-agent/src/core/model-runtime.ts:673] [E: packages/coding-agent/src/core/model-runtime.ts:689] [E: packages/coding-agent/src/core/model-runtime.ts:693] 扩展应通过 `ctx.modelRegistry.stream` / `streamSimple` 调用 `pi.registerProvider()` 注册的自定义 provider; `#8964` 回归测试断言这些 facade 能带上 extension `apiKey`,而 `pi-ai/compat` 的 `getApiProvider()` 看不到该 registration。 [E: packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts:7] [E: packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts:36] [E: packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts:52]

`ModelRegistry.refresh(options?)` 和 `ModelRuntime.refresh(options)` 都接受 `ModelsRefreshOptions` 并返回 `ModelsRefreshResult`: options 含 `allowNetwork`、`providers`、`force`、`signal`;result 含 `aborted` 和 per-provider `errors` map [E: packages/coding-agent/src/core/model-registry.ts:42] [E: packages/coding-agent/src/core/model-registry.ts:42] [E: packages/coding-agent/src/core/model-runtime.ts:789] [E: packages/ai/src/models.ts:91] [E: packages/ai/src/models.ts:92] [E: packages/ai/src/models.ts:94] [E: packages/ai/src/models.ts:96] [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:100] [E: packages/ai/src/models.ts:101] [E: packages/ai/src/models.ts:102]。runtime refresh 先 reload `models.json` 并按 `providers` 局部 recompose 或全量 rebuild, 再把 `allowNetwork` 默认成 `modelNetworkEnabled`, 最后 refresh provider availability [E: packages/coding-agent/src/core/model-runtime.ts:790] [E: packages/coding-agent/src/core/model-runtime.ts:792] [E: packages/coding-agent/src/core/model-runtime.ts:796] [E: packages/coding-agent/src/core/model-runtime.ts:798] [E: packages/coding-agent/src/core/model-runtime.ts:829]。

interactive 全 catalog refresh 不直接并发打 `modelRuntime.refresh()`; `refreshModelCatalogs()` 按 runtime WeakMap 共享同一个 in-flight refresh, 每个 caller 用自己的 `AbortSignal` wait。一个 waiter abort 只减少 waiters;最后一个 waiter 离开才 abort 共享 operation [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:16] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:18] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:19] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:33] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:36] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:37] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:46] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:23] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:32] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:38] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:54]。`InteractiveMode.run()` 在非 `PI_OFFLINE` 时用这条 shared path, 15s timeout [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1095] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1084] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1084]。

`getApiKeyAndHeaders()` 的 success shape 现在把 headers 定义为 `ProviderHeaders`，并原样返回 compatibility 或 resolved auth headers；不再过滤值为 `null` 的 entries。[E: packages/coding-agent/src/core/model-registry.ts:19] [E: packages/coding-agent/src/core/model-registry.ts:23] [E: packages/coding-agent/src/core/model-registry.ts:68] [E: packages/coding-agent/src/core/model-registry.ts:76] [E: packages/coding-agent/src/core/model-registry.ts:79] [E: packages/coding-agent/src/core/model-registry.ts:79] `null` 是 header deletion marker，不是空 header value；Cloudflare regression test 要求 facade 保留 `Authorization: null` 与 `x-api-key: null`，同时保留实际 `cf-aig-authorization`。[E: packages/coding-agent/test/model-registry.test.ts:1235] [E: packages/coding-agent/test/model-registry.test.ts:1237] [E: packages/coding-agent/test/model-registry.test.ts:1240] [E: packages/coding-agent/test/model-registry.test.ts:1242] [E: packages/coding-agent/test/model-registry.test.ts:1243] [E: packages/coding-agent/test/model-registry.test.ts:1244]

## Sources

- `packages/coding-agent/src/core/model-runtime.ts`
- `packages/coding-agent/src/core/model-registry.ts`
- `packages/coding-agent/test/model-registry.test.ts`
- `packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts`
- `packages/coding-agent/docs/extensions.md`
- `packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts`
- `packages/coding-agent/test/model-catalog-refresh.test.ts`
- `packages/coding-agent/src/core/model-config.ts`
- `packages/coding-agent/src/core/models-store.ts`
- `packages/coding-agent/src/core/provider-composer.ts`
- `packages/coding-agent/src/core/runtime-credentials.ts`
- `packages/ai/src/models.ts`
- `packages/ai/src/providers/all.ts`

## 相关

- [subsys.coding-agent.model-resolver](model-resolver.md) - CLI 与 scope 如何从 runtime inventory 选择具体 model。
- [subsys.coding-agent.auth-storage](auth-storage.md) - persisted credential 与 runtime key overlay。
- [subsys.ai.provider-registry](../ai/provider-registry.md) - `pi-ai` provider/Models collection 的底层契约。
- [subsys.ai.model-discovery](../ai/model-discovery.md) - 动态 provider catalog refresh 与 cache restore。
