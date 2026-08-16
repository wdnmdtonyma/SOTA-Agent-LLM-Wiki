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
  - packages/ai/src/models.ts
  - packages/ai/src/providers/all.ts
symbols:
  - ModelRuntime
  - ModelRegistry
  - ModelConfig
  - composeModelProvider
related:
  - subsys.coding-agent.model-resolver
  - subsys.coding-agent.auth-storage
  - subsys.ai.provider-registry
  - subsys.ai.model-discovery
evidence: explicit
status: verified
updated: 086c32e745
---

> `ModelRuntime` 已取代旧 `ModelRegistry` 成为 coding-agent 的 canonical 模型/auth runtime；`ModelRegistry` 现在只是面向 extension 兼容 API 的同步 facade。

## 能回答的问题

- built-in provider、`models.json`、extension provider 如何合成？
- `getModels()` 与 available snapshot 有什么差别？
- auth、动态 model refresh 和 request headers 在哪里接入？
- `refresh()` 的 `ModelsRefreshOptions` / `ModelsRefreshResult` 是什么, 并发 refresh 如何共享 in-flight catalog 拉取？
- runtime `--api-key` 如何影响 availability？
- 为什么 `ModelRegistry` 仍存在，但不再拥有核心状态？

## Canonical runtime

`ModelRuntime` 自己持有 `pi-ai` `MutableModels`、`RuntimeCredentials`、built-in/native-extension/config extension provider maps、`ModelConfig` 与 availability snapshot [E: packages/coding-agent/src/core/model-runtime.ts:130] [E: packages/coding-agent/src/core/model-runtime.ts:131] [E: packages/coding-agent/src/core/model-runtime.ts:132] [E: packages/coding-agent/src/core/model-runtime.ts:133] [E: packages/coding-agent/src/core/model-runtime.ts:135] [E: packages/coding-agent/src/core/model-runtime.ts:136] [E: packages/coding-agent/src/core/model-runtime.ts:140] [E: packages/coding-agent/src/core/model-runtime.ts:141]。constructor 用同一 credential overlay 创建 `pi-ai Models` collection，并立刻重建 provider 集 [E: packages/coding-agent/src/core/model-runtime.ts:162] [E: packages/coding-agent/src/core/model-runtime.ts:166] [E: packages/coding-agent/src/core/model-runtime.ts:168] [E: packages/coding-agent/src/core/model-runtime.ts:169]。

`create()` 默认从 `auth.json` 建 `AuthStorage`，再包成 `RuntimeCredentials`；默认读取 agent dir 下的 `models.json`，动态 catalog cache 使用相邻的 `models-store.json`。built-in providers 来自 `providers/all`，非 radius provider 会包装 remote catalog 能力 [E: packages/coding-agent/src/core/model-runtime.ts:172] [E: packages/coding-agent/src/core/model-runtime.ts:173] [E: packages/coding-agent/src/core/model-runtime.ts:174] [E: packages/coding-agent/src/core/model-runtime.ts:176] [E: packages/coding-agent/src/core/model-runtime.ts:177] [E: packages/coding-agent/src/core/model-runtime.ts:180] [E: packages/coding-agent/src/core/model-runtime.ts:183] [E: packages/coding-agent/src/core/model-runtime.ts:184] [E: packages/coding-agent/src/core/model-runtime.ts:186]。初始化最后带 15 秒默认 timeout 执行一次 refresh；`PI_OFFLINE` 会关闭默认网络刷新 [E: packages/coding-agent/src/core/model-runtime.ts:196] [E: packages/coding-agent/src/core/model-runtime.ts:168] [E: packages/coding-agent/src/core/model-runtime.ts:198] [E: packages/coding-agent/src/core/model-runtime.ts:172]。

## Provider 合成与配置

参与合成的 provider id 是 built-ins、native extensions、`models.json` 与 config extensions 的并集 [E: packages/coding-agent/src/core/model-runtime.ts:236] [E: packages/coding-agent/src/core/model-runtime.ts:238] [E: packages/coding-agent/src/core/model-runtime.ts:239] [E: packages/coding-agent/src/core/model-runtime.ts:240] [E: packages/coding-agent/src/core/model-runtime.ts:241]。没有 overlay 的 built-in 原样进入 `pi-ai Models`；存在配置层时交给 `composeModelProvider()`，合成错误被记录，且有 base 时回退到 base provider [E: packages/coding-agent/src/core/model-runtime.ts:245] [E: packages/coding-agent/src/core/model-runtime.ts:246] [E: packages/coding-agent/src/core/model-runtime.ts:253] [E: packages/coding-agent/src/core/model-runtime.ts:255] [E: packages/coding-agent/src/core/model-runtime.ts:260] [E: packages/coding-agent/src/core/model-runtime.ts:263] [E: packages/coding-agent/src/core/model-runtime.ts:264] [E: packages/coding-agent/src/core/model-runtime.ts:265]。

`models.json` 的 provider schema 支持 name、baseUrl、apiKey、api、radius OAuth、headers、compat、authHeader、custom models 与 modelOverrides [E: packages/coding-agent/src/core/model-config.ts:194] [E: packages/coding-agent/src/core/model-config.ts:195] [E: packages/coding-agent/src/core/model-config.ts:196] [E: packages/coding-agent/src/core/model-config.ts:197] [E: packages/coding-agent/src/core/model-config.ts:198] [E: packages/coding-agent/src/core/model-config.ts:199] [E: packages/coding-agent/src/core/model-config.ts:200] [E: packages/coding-agent/src/core/model-config.ts:201] [E: packages/coding-agent/src/core/model-config.ts:202] [E: packages/coding-agent/src/core/model-config.ts:203] [E: packages/coding-agent/src/core/model-config.ts:204]。custom model 的 `id` 必填，其余 capability/cost/header/compat 字段可选；override 是 metadata/cost/header/compat 的 partial layer [E: packages/coding-agent/src/core/model-config.ts:157] [E: packages/coding-agent/src/core/model-config.ts:158] [E: packages/coding-agent/src/core/model-config.ts:160] [E: packages/coding-agent/src/core/model-config.ts:161] [E: packages/coding-agent/src/core/model-config.ts:165] [E: packages/coding-agent/src/core/model-config.ts:166] [E: packages/coding-agent/src/core/model-config.ts:167] [E: packages/coding-agent/src/core/model-config.ts:169] [E: packages/coding-agent/src/core/model-config.ts:170] [E: packages/coding-agent/src/core/model-config.ts:173] [E: packages/coding-agent/src/core/model-config.ts:187] [E: packages/coding-agent/src/core/model-config.ts:191]。

OpenAI Completions compat schema 现在接受 `thinkingFormat: "baseten"` 与 `chatTemplateArgs` record；`mergeCompat()` 将它与 `chatTemplateKwargs` 一样作为 nested object 合并，避免 model override 整体丢掉 base 的 template args。[E: packages/coding-agent/src/core/model-config.ts:82] [E: packages/coding-agent/src/core/model-config.ts:87] [E: packages/coding-agent/src/core/model-config.ts:97] [E: packages/coding-agent/src/core/model-config.ts:98] [E: packages/coding-agent/src/core/provider-composer.ts:81] [E: packages/coding-agent/src/core/provider-composer.ts:90] [E: packages/coding-agent/src/core/provider-composer.ts:97]

`ModelConfig.load()` 接受带注释的 JSON，缺文件返回空配置，parse/schema 错误保存在 config error 中；成功后每个 provider config 会 clone、deep-freeze 后存入 map [E: packages/coding-agent/src/core/model-config.ts:246] [E: packages/coding-agent/src/core/model-config.ts:247] [E: packages/coding-agent/src/core/model-config.ts:251] [E: packages/coding-agent/src/core/model-config.ts:253] [E: packages/coding-agent/src/core/model-config.ts:262] [E: packages/coding-agent/src/core/model-config.ts:266] [E: packages/coding-agent/src/core/model-config.ts:270] [E: packages/coding-agent/src/core/model-config.ts:276] [E: packages/coding-agent/src/core/model-config.ts:281] [E: packages/coding-agent/src/core/model-config.ts:282] [E: packages/coding-agent/src/core/model-config.ts:284]。

`composeModelProvider()` 的层次顺序是 built-in → `models.json` custom/upsert → extension model replacement → `models.json` modelOverrides；它还合成 API-key/OAuth auth，并选择 built-in、extension 或 compat API stream implementation [E: packages/coding-agent/src/core/provider-composer.ts:420] [E: packages/coding-agent/src/core/provider-composer.ts:426] [E: packages/coding-agent/src/core/provider-composer.ts:434] [E: packages/coding-agent/src/core/provider-composer.ts:436] [E: packages/coding-agent/src/core/provider-composer.ts:437] [E: packages/coding-agent/src/core/provider-composer.ts:443] [E: packages/coding-agent/src/core/provider-composer.ts:444] [E: packages/coding-agent/src/core/provider-composer.ts:449] [E: packages/coding-agent/src/core/provider-composer.ts:450] [E: packages/coding-agent/src/core/provider-composer.ts:464] [E: packages/coding-agent/src/core/provider-composer.ts:469] [E: packages/coding-agent/src/core/provider-composer.ts:472]。

## Inventory 与 availability

`getModels()`/`getModel()` 是 last-known catalog 的同步读取；`getAvailable()` 会等待正在进行的 availability refresh，并以 auth check 结果过滤 provider [E: packages/coding-agent/src/core/model-runtime.ts:392] [E: packages/coding-agent/src/core/model-runtime.ts:393] [E: packages/coding-agent/src/core/model-runtime.ts:396] [E: packages/coding-agent/src/core/model-runtime.ts:397] [E: packages/coding-agent/src/core/model-runtime.ts:331] [E: packages/coding-agent/src/core/model-runtime.ts:334] [E: packages/coding-agent/src/core/model-runtime.ts:335] [E: packages/coding-agent/src/core/model-runtime.ts:344] [E: packages/coding-agent/src/core/model-runtime.ts:419]。refresh 同时取 available models、每个 provider 的 auth check 和 credential metadata，生成 `all`、`available`、configured/stored provider sets 与 auth map [E: packages/coding-agent/src/core/model-runtime.ts:280] [E: packages/coding-agent/src/core/model-runtime.ts:287] [E: packages/coding-agent/src/core/model-runtime.ts:248] [E: packages/coding-agent/src/core/model-runtime.ts:253] [E: packages/coding-agent/src/core/model-runtime.ts:257] [E: packages/coding-agent/src/core/model-runtime.ts:306] [E: packages/coding-agent/src/core/model-runtime.ts:308] [E: packages/coding-agent/src/core/model-runtime.ts:309] [E: packages/coding-agent/src/core/model-runtime.ts:310] [E: packages/coding-agent/src/core/model-runtime.ts:311]。

动态 catalog 的 `FileModelsStore` 复用 locked JSON backend，以 provider id 为 key 读写 `ModelsStoreEntry` [E: packages/coding-agent/src/core/models-store.ts:46] [E: packages/coding-agent/src/core/models-store.ts:51] [E: packages/coding-agent/src/core/models-store.ts:29] [E: packages/coding-agent/src/core/models-store.ts:36] [E: packages/coding-agent/src/core/models-store.ts:36] [E: packages/coding-agent/src/core/models-store.ts:41] [E: packages/coding-agent/src/core/models-store.ts:129] [E: packages/coding-agent/src/core/models-store.ts:131]。`pi-ai Models.refresh()` 把该 store、有效 credential、network/force/signal 传给动态 provider，失败时再以 `allowNetwork: false` 尝试恢复缓存，并把 provider error 汇总返回 [E: packages/ai/src/models.ts:283] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:295] [E: packages/ai/src/models.ts:376] [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:380] [E: packages/ai/src/models.ts:301] [E: packages/ai/src/models.ts:422] [E: packages/ai/src/models.ts:376] [E: packages/ai/src/models.ts:317] [E: packages/ai/src/models.ts:326]。

## Auth 与请求

runtime auth 状态按 runtime override、stored credential、`models.json`/extension configured key、ambient auth check 的顺序呈现 [E: packages/coding-agent/src/core/model-runtime.ts:561] [E: packages/coding-agent/src/core/model-runtime.ts:562] [E: packages/coding-agent/src/core/model-runtime.ts:563] [E: packages/coding-agent/src/core/model-runtime.ts:564] [E: packages/coding-agent/src/core/model-runtime.ts:568] [E: packages/coding-agent/src/core/model-runtime.ts:569] [E: packages/coding-agent/src/core/model-runtime.ts:570]。`setRuntimeApiKey()` 更新 credential overlay 和 snapshot 后刷新 model runtime，因此首次 `--api-key` 不需要写入 `auth.json` [E: packages/coding-agent/src/core/model-runtime.ts:434] [E: packages/coding-agent/src/core/model-runtime.ts:539] [E: packages/coding-agent/src/core/model-runtime.ts:422] [E: packages/coding-agent/src/core/model-runtime.ts:761] [E: packages/coding-agent/src/core/model-runtime.ts:774] [E: packages/coding-agent/src/core/model-runtime.ts:437]。

请求前 `prepareRequest()` 要求 provider 与 resolved auth 都存在；resolved baseUrl 覆盖 request model，显式 request API key 胜过 resolved key，headers/env 按字段合并 [E: packages/coding-agent/src/core/model-runtime.ts:454] [E: packages/coding-agent/src/core/model-runtime.ts:581] [E: packages/coding-agent/src/core/model-runtime.ts:462] [E: packages/coding-agent/src/core/model-runtime.ts:588] [E: packages/coding-agent/src/core/model-runtime.ts:592] [E: packages/coding-agent/src/core/model-runtime.ts:594] [E: packages/coding-agent/src/core/model-runtime.ts:596] [E: packages/coding-agent/src/core/model-runtime.ts:600] [E: packages/coding-agent/src/core/model-runtime.ts:603] [E: packages/coding-agent/src/core/model-runtime.ts:604] [E: packages/coding-agent/src/core/model-runtime.ts:605]。`stream`/`streamSimple` 都延迟执行这一步，再委托拥有该 model 的 provider [E: packages/coding-agent/src/core/model-runtime.ts:610] [E: packages/coding-agent/src/core/model-runtime.ts:615] [E: packages/coding-agent/src/core/model-runtime.ts:620] [E: packages/coding-agent/src/core/model-runtime.ts:636] [E: packages/coding-agent/src/core/model-runtime.ts:638] [E: packages/coding-agent/src/core/model-runtime.ts:639]。

login/logout 委托 `pi-ai Models`，随后 refresh；reload 则重新加载 `ModelConfig`、重建 providers 再 refresh [E: packages/coding-agent/src/core/model-runtime.ts:521] [E: packages/coding-agent/src/core/model-runtime.ts:522] [E: packages/coding-agent/src/core/model-runtime.ts:437] [E: packages/coding-agent/src/core/model-runtime.ts:531] [E: packages/coding-agent/src/core/model-runtime.ts:532] [E: packages/coding-agent/src/core/model-runtime.ts:783] [E: packages/coding-agent/src/core/model-runtime.ts:532] [E: packages/coding-agent/src/core/model-runtime.ts:531] [E: packages/coding-agent/src/core/model-runtime.ts:691] [E: packages/coding-agent/src/core/model-runtime.ts:697] [E: packages/coding-agent/src/core/model-runtime.ts:532]。

## Extension 注册与兼容 facade

native `Provider` 与旧式 `ProviderConfigInput` 都可注册；旧式注册先验证，再把非 `undefined` 字段合并到上次 registration，重组单个 provider 并异步无网络 refresh [E: packages/coding-agent/src/core/model-runtime.ts:733] [E: packages/coding-agent/src/core/model-runtime.ts:736] [E: packages/coding-agent/src/core/model-runtime.ts:737] [E: packages/coding-agent/src/core/model-runtime.ts:742] [E: packages/coding-agent/src/core/model-runtime.ts:745] [E: packages/coding-agent/src/core/model-runtime.ts:749] [E: packages/coding-agent/src/core/model-runtime.ts:752] [E: packages/coding-agent/src/core/model-runtime.ts:754] [E: packages/coding-agent/src/core/model-runtime.ts:755] [E: packages/coding-agent/src/core/model-runtime.ts:777]。

`ModelRegistry` constructor 只保存一个 `ModelRuntime`；`getAll`、`getAvailable`、`find`、auth 查询与 provider registration 全部委托 runtime [E: packages/coding-agent/src/core/model-registry.ts:32] [E: packages/coding-agent/src/core/model-registry.ts:33] [E: packages/coding-agent/src/core/model-registry.ts:35] [E: packages/coding-agent/src/core/model-registry.ts:36] [E: packages/coding-agent/src/core/model-registry.ts:48] [E: packages/coding-agent/src/core/model-registry.ts:49] [E: packages/coding-agent/src/core/model-registry.ts:52] [E: packages/coding-agent/src/core/model-registry.ts:53] [E: packages/coding-agent/src/core/model-registry.ts:56] [E: packages/coding-agent/src/core/model-registry.ts:57] [E: packages/coding-agent/src/core/model-registry.ts:66] [E: packages/coding-agent/src/core/model-registry.ts:88] [E: packages/coding-agent/src/core/model-registry.ts:136] [E: packages/coding-agent/src/core/model-registry.ts:139]。所以这个文件仍是 extension API 的兼容面，不是核心 state owner [I]。

`ModelRegistry.refresh(options?)` 和 `ModelRuntime.refresh(options)` 都接受 `ModelsRefreshOptions` 并返回 `ModelsRefreshResult`: options 含 `allowNetwork`、`providers`、`force`、`signal`;result 含 `aborted` 和 per-provider `errors` map [E: packages/coding-agent/src/core/model-registry.ts:40] [E: packages/coding-agent/src/core/model-registry.ts:41] [E: packages/coding-agent/src/core/model-runtime.ts:690] [E: packages/ai/src/models.ts:64] [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:67] [E: packages/ai/src/models.ts:69] [E: packages/ai/src/models.ts:70] [E: packages/ai/src/models.ts:73] [E: packages/ai/src/models.ts:74] [E: packages/ai/src/models.ts:75]。runtime refresh 先 reload `models.json` 并按 `providers` 局部 recompose 或全量 rebuild, 再把 `allowNetwork` 默认成 `modelNetworkEnabled`, 最后 refresh provider availability [E: packages/coding-agent/src/core/model-runtime.ts:691] [E: packages/coding-agent/src/core/model-runtime.ts:693] [E: packages/coding-agent/src/core/model-runtime.ts:697] [E: packages/coding-agent/src/core/model-runtime.ts:699] [E: packages/coding-agent/src/core/model-runtime.ts:730]。

interactive 全 catalog refresh 不直接并发打 `modelRuntime.refresh()`; `refreshModelCatalogs()` 按 runtime WeakMap 共享同一个 in-flight refresh, 每个 caller 用自己的 `AbortSignal` wait。一个 waiter abort 只减少 waiters;最后一个 waiter 离开才 abort 共享 operation [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:16] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:18] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:19] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:33] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:36] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:37] [E: packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts:46] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:23] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:32] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:38] [E: packages/coding-agent/test/model-catalog-refresh.test.ts:54]。`InteractiveMode.run()` 在非 `PI_OFFLINE` 时用这条 shared path, 15s timeout [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1038] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1040] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1041]。

`getApiKeyAndHeaders()` 的 success shape 现在把 headers 定义为 `ProviderHeaders`，并原样返回 compatibility 或 resolved auth headers；不再过滤值为 `null` 的 entries。[E: packages/coding-agent/src/core/model-registry.ts:17] [E: packages/coding-agent/src/core/model-registry.ts:21] [E: packages/coding-agent/src/core/model-registry.ts:64] [E: packages/coding-agent/src/core/model-registry.ts:72] [E: packages/coding-agent/src/core/model-registry.ts:74] [E: packages/coding-agent/src/core/model-registry.ts:77] `null` 是 header deletion marker，不是空 header value；Cloudflare regression test 要求 facade 保留 `Authorization: null` 与 `x-api-key: null`，同时保留实际 `cf-aig-authorization`。[E: packages/coding-agent/test/model-registry.test.ts:1098] [E: packages/coding-agent/test/model-registry.test.ts:1100] [E: packages/coding-agent/test/model-registry.test.ts:1103] [E: packages/coding-agent/test/model-registry.test.ts:1105] [E: packages/coding-agent/test/model-registry.test.ts:1106] [E: packages/coding-agent/test/model-registry.test.ts:1107]

## Sources

- `packages/coding-agent/src/core/model-runtime.ts`
- `packages/coding-agent/src/core/model-registry.ts`
- `packages/coding-agent/test/model-registry.test.ts`
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
