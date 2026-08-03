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
updated: 305c014dcc
---

> `ModelRuntime` 已取代旧 `ModelRegistry` 成为 coding-agent 的 canonical 模型/auth runtime；`ModelRegistry` 现在只是面向 extension 兼容 API 的同步 facade。

## 能回答的问题

- built-in provider、`models.json`、extension provider 如何合成？
- `getModels()` 与 available snapshot 有什么差别？
- auth、动态 model refresh 和 request headers 在哪里接入？
- runtime `--api-key` 如何影响 availability？
- 为什么 `ModelRegistry` 仍存在，但不再拥有核心状态？

## Canonical runtime

`ModelRuntime` 自己持有 `pi-ai` `MutableModels`、`RuntimeCredentials`、built-in/native-extension/config extension provider maps、`ModelConfig` 与 availability snapshot [E: packages/coding-agent/src/core/model-runtime.ts:98] [E: packages/coding-agent/src/core/model-runtime.ts:99] [E: packages/coding-agent/src/core/model-runtime.ts:100] [E: packages/coding-agent/src/core/model-runtime.ts:101] [E: packages/coding-agent/src/core/model-runtime.ts:103] [E: packages/coding-agent/src/core/model-runtime.ts:104] [E: packages/coding-agent/src/core/model-runtime.ts:108] [E: packages/coding-agent/src/core/model-runtime.ts:109]。constructor 用同一 credential overlay 创建 `pi-ai Models` collection，并立刻重建 provider 集 [E: packages/coding-agent/src/core/model-runtime.ts:128] [E: packages/coding-agent/src/core/model-runtime.ts:132] [E: packages/coding-agent/src/core/model-runtime.ts:134] [E: packages/coding-agent/src/core/model-runtime.ts:135]。

`create()` 默认从 `auth.json` 建 `AuthStorage`，再包成 `RuntimeCredentials`；默认读取 agent dir 下的 `models.json`，动态 catalog cache 使用相邻的 `models-store.json`。built-in providers 来自 `providers/all`，非 radius provider 会包装 remote catalog 能力 [E: packages/coding-agent/src/core/model-runtime.ts:138] [E: packages/coding-agent/src/core/model-runtime.ts:139] [E: packages/coding-agent/src/core/model-runtime.ts:140] [E: packages/coding-agent/src/core/model-runtime.ts:142] [E: packages/coding-agent/src/core/model-runtime.ts:143] [E: packages/coding-agent/src/core/model-runtime.ts:146] [E: packages/coding-agent/src/core/model-runtime.ts:149] [E: packages/coding-agent/src/core/model-runtime.ts:150] [E: packages/coding-agent/src/core/model-runtime.ts:152]。初始化最后带 15 秒默认 timeout 执行一次 refresh；`PI_OFFLINE` 会关闭默认网络刷新 [E: packages/coding-agent/src/core/model-runtime.ts:162] [E: packages/coding-agent/src/core/model-runtime.ts:168] [E: packages/coding-agent/src/core/model-runtime.ts:164] [E: packages/coding-agent/src/core/model-runtime.ts:172]。

## Provider 合成与配置

参与合成的 provider id 是 built-ins、native extensions、`models.json` 与 config extensions 的并集 [E: packages/coding-agent/src/core/model-runtime.ts:196] [E: packages/coding-agent/src/core/model-runtime.ts:198] [E: packages/coding-agent/src/core/model-runtime.ts:199] [E: packages/coding-agent/src/core/model-runtime.ts:200] [E: packages/coding-agent/src/core/model-runtime.ts:201]。没有 overlay 的 built-in 原样进入 `pi-ai Models`；存在配置层时交给 `composeModelProvider()`，合成错误被记录，且有 base 时回退到 base provider [E: packages/coding-agent/src/core/model-runtime.ts:205] [E: packages/coding-agent/src/core/model-runtime.ts:206] [E: packages/coding-agent/src/core/model-runtime.ts:213] [E: packages/coding-agent/src/core/model-runtime.ts:215] [E: packages/coding-agent/src/core/model-runtime.ts:220] [E: packages/coding-agent/src/core/model-runtime.ts:223] [E: packages/coding-agent/src/core/model-runtime.ts:224] [E: packages/coding-agent/src/core/model-runtime.ts:225]。

`models.json` 的 provider schema 支持 name、baseUrl、apiKey、api、radius OAuth、headers、compat、authHeader、custom models 与 modelOverrides [E: packages/coding-agent/src/core/model-config.ts:191] [E: packages/coding-agent/src/core/model-config.ts:192] [E: packages/coding-agent/src/core/model-config.ts:193] [E: packages/coding-agent/src/core/model-config.ts:194] [E: packages/coding-agent/src/core/model-config.ts:195] [E: packages/coding-agent/src/core/model-config.ts:196] [E: packages/coding-agent/src/core/model-config.ts:197] [E: packages/coding-agent/src/core/model-config.ts:198] [E: packages/coding-agent/src/core/model-config.ts:199] [E: packages/coding-agent/src/core/model-config.ts:200] [E: packages/coding-agent/src/core/model-config.ts:201]。custom model 的 `id` 必填，其余 capability/cost/header/compat 字段可选；override 是 metadata/cost/header/compat 的 partial layer [E: packages/coding-agent/src/core/model-config.ts:156] [E: packages/coding-agent/src/core/model-config.ts:157] [E: packages/coding-agent/src/core/model-config.ts:159] [E: packages/coding-agent/src/core/model-config.ts:160] [E: packages/coding-agent/src/core/model-config.ts:164] [E: packages/coding-agent/src/core/model-config.ts:165] [E: packages/coding-agent/src/core/model-config.ts:166] [E: packages/coding-agent/src/core/model-config.ts:167] [E: packages/coding-agent/src/core/model-config.ts:168] [E: packages/coding-agent/src/core/model-config.ts:171] [E: packages/coding-agent/src/core/model-config.ts:185] [E: packages/coding-agent/src/core/model-config.ts:188]。

OpenAI Completions compat schema 现在接受 `thinkingFormat: "baseten"` 与 `chatTemplateArgs` record；`mergeCompat()` 将它与 `chatTemplateKwargs` 一样作为 nested object 合并，避免 model override 整体丢掉 base 的 template args。[E: packages/coding-agent/src/core/model-config.ts:82] [E: packages/coding-agent/src/core/model-config.ts:87] [E: packages/coding-agent/src/core/model-config.ts:97] [E: packages/coding-agent/src/core/model-config.ts:98] [E: packages/coding-agent/src/core/provider-composer.ts:78] [E: packages/coding-agent/src/core/provider-composer.ts:87] [E: packages/coding-agent/src/core/provider-composer.ts:94]

`ModelConfig.load()` 接受带注释的 JSON，缺文件返回空配置，parse/schema 错误保存在 config error 中；成功后每个 provider config 会 clone、deep-freeze 后存入 map [E: packages/coding-agent/src/core/model-config.ts:243] [E: packages/coding-agent/src/core/model-config.ts:244] [E: packages/coding-agent/src/core/model-config.ts:248] [E: packages/coding-agent/src/core/model-config.ts:250] [E: packages/coding-agent/src/core/model-config.ts:259] [E: packages/coding-agent/src/core/model-config.ts:263] [E: packages/coding-agent/src/core/model-config.ts:267] [E: packages/coding-agent/src/core/model-config.ts:273] [E: packages/coding-agent/src/core/model-config.ts:278] [E: packages/coding-agent/src/core/model-config.ts:279] [E: packages/coding-agent/src/core/model-config.ts:281]。

`composeModelProvider()` 的层次顺序是 built-in → `models.json` custom/upsert → extension model replacement → `models.json` modelOverrides；它还合成 API-key/OAuth auth，并选择 built-in、extension 或 compat API stream implementation [E: packages/coding-agent/src/core/provider-composer.ts:412] [E: packages/coding-agent/src/core/provider-composer.ts:418] [E: packages/coding-agent/src/core/provider-composer.ts:426] [E: packages/coding-agent/src/core/provider-composer.ts:428] [E: packages/coding-agent/src/core/provider-composer.ts:429] [E: packages/coding-agent/src/core/provider-composer.ts:435] [E: packages/coding-agent/src/core/provider-composer.ts:436] [E: packages/coding-agent/src/core/provider-composer.ts:441] [E: packages/coding-agent/src/core/provider-composer.ts:442] [E: packages/coding-agent/src/core/provider-composer.ts:456] [E: packages/coding-agent/src/core/provider-composer.ts:461] [E: packages/coding-agent/src/core/provider-composer.ts:464]。

## Inventory 与 availability

`getModels()`/`getModel()` 是 last-known catalog 的同步读取；`getAvailable()` 会等待正在进行的 availability refresh，并以 auth check 结果过滤 provider [E: packages/coding-agent/src/core/model-runtime.ts:319] [E: packages/coding-agent/src/core/model-runtime.ts:320] [E: packages/coding-agent/src/core/model-runtime.ts:323] [E: packages/coding-agent/src/core/model-runtime.ts:324] [E: packages/coding-agent/src/core/model-runtime.ts:331] [E: packages/coding-agent/src/core/model-runtime.ts:334] [E: packages/coding-agent/src/core/model-runtime.ts:335] [E: packages/coding-agent/src/core/model-runtime.ts:344] [E: packages/coding-agent/src/core/model-runtime.ts:345]。refresh 同时取 available models、每个 provider 的 auth check 和 credential metadata，生成 `all`、`available`、configured/stored provider sets 与 auth map [E: packages/coding-agent/src/core/model-runtime.ts:240] [E: packages/coding-agent/src/core/model-runtime.ts:247] [E: packages/coding-agent/src/core/model-runtime.ts:248] [E: packages/coding-agent/src/core/model-runtime.ts:253] [E: packages/coding-agent/src/core/model-runtime.ts:257] [E: packages/coding-agent/src/core/model-runtime.ts:269] [E: packages/coding-agent/src/core/model-runtime.ts:271] [E: packages/coding-agent/src/core/model-runtime.ts:272] [E: packages/coding-agent/src/core/model-runtime.ts:273] [E: packages/coding-agent/src/core/model-runtime.ts:274]。

动态 catalog 的 `FileModelsStore` 复用 locked JSON backend，以 provider id 为 key 读写 `ModelsStoreEntry` [E: packages/coding-agent/src/core/models-store.ts:25] [E: packages/coding-agent/src/core/models-store.ts:28] [E: packages/coding-agent/src/core/models-store.ts:29] [E: packages/coding-agent/src/core/models-store.ts:36] [E: packages/coding-agent/src/core/models-store.ts:38] [E: packages/coding-agent/src/core/models-store.ts:42] [E: packages/coding-agent/src/core/models-store.ts:45] [E: packages/coding-agent/src/core/models-store.ts:46]。`pi-ai Models.refresh()` 把该 store、有效 credential、network/force/signal 传给动态 provider，失败时再以 `allowNetwork: false` 尝试恢复缓存，并把 provider error 汇总返回 [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:288] [E: packages/ai/src/models.ts:295] [E: packages/ai/src/models.ts:297] [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:300] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:317] [E: packages/ai/src/models.ts:327]。

## Auth 与请求

runtime auth 状态按 runtime override、stored credential、`models.json`/extension configured key、ambient auth check 的顺序呈现 [E: packages/coding-agent/src/core/model-runtime.ts:444] [E: packages/coding-agent/src/core/model-runtime.ts:445] [E: packages/coding-agent/src/core/model-runtime.ts:446] [E: packages/coding-agent/src/core/model-runtime.ts:447] [E: packages/coding-agent/src/core/model-runtime.ts:451] [E: packages/coding-agent/src/core/model-runtime.ts:452] [E: packages/coding-agent/src/core/model-runtime.ts:453]。`setRuntimeApiKey()` 更新 credential overlay 和 snapshot 后刷新 model runtime，因此首次 `--api-key` 不需要写入 `auth.json` [E: packages/coding-agent/src/core/model-runtime.ts:435] [E: packages/coding-agent/src/core/model-runtime.ts:421] [E: packages/coding-agent/src/core/model-runtime.ts:422] [E: packages/coding-agent/src/core/model-runtime.ts:423] [E: packages/coding-agent/src/core/model-runtime.ts:430] [E: packages/coding-agent/src/core/model-runtime.ts:437]。

请求前 `prepareRequest()` 要求 provider 与 resolved auth 都存在；resolved baseUrl 覆盖 request model，显式 request API key 胜过 resolved key，headers/env 按字段合并 [E: packages/coding-agent/src/core/model-runtime.ts:456] [E: packages/coding-agent/src/core/model-runtime.ts:460] [E: packages/coding-agent/src/core/model-runtime.ts:462] [E: packages/coding-agent/src/core/model-runtime.ts:463] [E: packages/coding-agent/src/core/model-runtime.ts:466] [E: packages/coding-agent/src/core/model-runtime.ts:468] [E: packages/coding-agent/src/core/model-runtime.ts:470] [E: packages/coding-agent/src/core/model-runtime.ts:474] [E: packages/coding-agent/src/core/model-runtime.ts:477] [E: packages/coding-agent/src/core/model-runtime.ts:478] [E: packages/coding-agent/src/core/model-runtime.ts:479]。`stream`/`streamSimple` 都延迟执行这一步，再委托拥有该 model 的 provider [E: packages/coding-agent/src/core/model-runtime.ts:484] [E: packages/coding-agent/src/core/model-runtime.ts:489] [E: packages/coding-agent/src/core/model-runtime.ts:494] [E: packages/coding-agent/src/core/model-runtime.ts:510] [E: packages/coding-agent/src/core/model-runtime.ts:512] [E: packages/coding-agent/src/core/model-runtime.ts:513]。

login/logout 委托 `pi-ai Models`，随后 refresh；reload 则重新加载 `ModelConfig`、重建 providers 再 refresh [E: packages/coding-agent/src/core/model-runtime.ts:521] [E: packages/coding-agent/src/core/model-runtime.ts:522] [E: packages/coding-agent/src/core/model-runtime.ts:437] [E: packages/coding-agent/src/core/model-runtime.ts:531] [E: packages/coding-agent/src/core/model-runtime.ts:532] [E: packages/coding-agent/src/core/model-runtime.ts:534] [E: packages/coding-agent/src/core/model-runtime.ts:535] [E: packages/coding-agent/src/core/model-runtime.ts:531] [E: packages/coding-agent/src/core/model-runtime.ts:539] [E: packages/coding-agent/src/core/model-runtime.ts:541] [E: packages/coding-agent/src/core/model-runtime.ts:535]。

## Extension 注册与兼容 facade

native `Provider` 与旧式 `ProviderConfigInput` 都可注册；旧式注册先验证，再把非 `undefined` 字段合并到上次 registration，重组单个 provider 并异步无网络 refresh [E: packages/coding-agent/src/core/model-runtime.ts:561] [E: packages/coding-agent/src/core/model-runtime.ts:564] [E: packages/coding-agent/src/core/model-runtime.ts:565] [E: packages/coding-agent/src/core/model-runtime.ts:570] [E: packages/coding-agent/src/core/model-runtime.ts:573] [E: packages/coding-agent/src/core/model-runtime.ts:577] [E: packages/coding-agent/src/core/model-runtime.ts:580] [E: packages/coding-agent/src/core/model-runtime.ts:582] [E: packages/coding-agent/src/core/model-runtime.ts:583] [E: packages/coding-agent/src/core/model-runtime.ts:605]。

`ModelRegistry` constructor 只保存一个 `ModelRuntime`；`getAll`、`getAvailable`、`find`、auth 查询与 provider registration 全部委托 runtime [E: packages/coding-agent/src/core/model-registry.ts:29] [E: packages/coding-agent/src/core/model-registry.ts:30] [E: packages/coding-agent/src/core/model-registry.ts:32] [E: packages/coding-agent/src/core/model-registry.ts:33] [E: packages/coding-agent/src/core/model-registry.ts:45] [E: packages/coding-agent/src/core/model-registry.ts:46] [E: packages/coding-agent/src/core/model-registry.ts:49] [E: packages/coding-agent/src/core/model-registry.ts:50] [E: packages/coding-agent/src/core/model-registry.ts:53] [E: packages/coding-agent/src/core/model-registry.ts:54] [E: packages/coding-agent/src/core/model-registry.ts:63] [E: packages/coding-agent/src/core/model-registry.ts:84] [E: packages/coding-agent/src/core/model-registry.ts:132] [E: packages/coding-agent/src/core/model-registry.ts:135]。所以这个文件仍是 extension API 的兼容面，不是核心 state owner [I]。

`getApiKeyAndHeaders()` 的 success shape 现在把 headers 定义为 `ProviderHeaders`，并原样返回 compatibility 或 resolved auth headers；不再过滤值为 `null` 的 entries。[E: packages/coding-agent/src/core/model-registry.ts:15] [E: packages/coding-agent/src/core/model-registry.ts:19] [E: packages/coding-agent/src/core/model-registry.ts:61] [E: packages/coding-agent/src/core/model-registry.ts:69] [E: packages/coding-agent/src/core/model-registry.ts:71] [E: packages/coding-agent/src/core/model-registry.ts:74] `null` 是 header deletion marker，不是空 header value；Cloudflare regression test 要求 facade 保留 `Authorization: null` 与 `x-api-key: null`，同时保留实际 `cf-aig-authorization`。[E: packages/coding-agent/test/model-registry.test.ts:1065] [E: packages/coding-agent/test/model-registry.test.ts:1067] [E: packages/coding-agent/test/model-registry.test.ts:1070] [E: packages/coding-agent/test/model-registry.test.ts:1072] [E: packages/coding-agent/test/model-registry.test.ts:1073] [E: packages/coding-agent/test/model-registry.test.ts:1074]

## Sources

- `packages/coding-agent/src/core/model-runtime.ts`
- `packages/coding-agent/src/core/model-registry.ts`
- `packages/coding-agent/test/model-registry.test.ts`
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
