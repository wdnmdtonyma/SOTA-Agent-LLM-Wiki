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
updated: 3da591ab
---

> `ModelRuntime` 已取代旧 `ModelRegistry` 成为 coding-agent 的 canonical 模型/auth runtime；`ModelRegistry` 现在只是面向 extension 兼容 API 的同步 facade。

## 能回答的问题

- built-in provider、`models.json`、extension provider 如何合成？
- `getModels()` 与 available snapshot 有什么差别？
- auth、动态 model refresh 和 request headers 在哪里接入？
- runtime `--api-key` 如何影响 availability？
- 为什么 `ModelRegistry` 仍存在，但不再拥有核心状态？

## Canonical runtime

`ModelRuntime` 自己持有 `pi-ai` `MutableModels`、`RuntimeCredentials`、built-in/native-extension/config extension provider maps、`ModelConfig` 与 availability snapshot [E: packages/coding-agent/src/core/model-runtime.ts:92] [E: packages/coding-agent/src/core/model-runtime.ts:93] [E: packages/coding-agent/src/core/model-runtime.ts:94] [E: packages/coding-agent/src/core/model-runtime.ts:95] [E: packages/coding-agent/src/core/model-runtime.ts:97] [E: packages/coding-agent/src/core/model-runtime.ts:98] [E: packages/coding-agent/src/core/model-runtime.ts:102] [E: packages/coding-agent/src/core/model-runtime.ts:103]。constructor 用同一 credential overlay 创建 `pi-ai Models` collection，并立刻重建 provider 集 [E: packages/coding-agent/src/core/model-runtime.ts:121] [E: packages/coding-agent/src/core/model-runtime.ts:125] [E: packages/coding-agent/src/core/model-runtime.ts:127] [E: packages/coding-agent/src/core/model-runtime.ts:128]。

`create()` 默认从 `auth.json` 建 `AuthStorage`，再包成 `RuntimeCredentials`；默认读取 agent dir 下的 `models.json`，动态 catalog cache 使用相邻的 `models-store.json`。built-in providers 来自 `providers/all`，非 radius provider 会包装 remote catalog 能力 [E: packages/coding-agent/src/core/model-runtime.ts:131] [E: packages/coding-agent/src/core/model-runtime.ts:132] [E: packages/coding-agent/src/core/model-runtime.ts:133] [E: packages/coding-agent/src/core/model-runtime.ts:135] [E: packages/coding-agent/src/core/model-runtime.ts:136] [E: packages/coding-agent/src/core/model-runtime.ts:139] [E: packages/coding-agent/src/core/model-runtime.ts:141] [E: packages/coding-agent/src/core/model-runtime.ts:142] [E: packages/coding-agent/src/core/model-runtime.ts:144]。初始化最后带 15 秒默认 timeout 执行一次 refresh；`PI_OFFLINE` 会关闭默认网络刷新 [E: packages/coding-agent/src/core/model-runtime.ts:152] [E: packages/coding-agent/src/core/model-runtime.ts:157] [E: packages/coding-agent/src/core/model-runtime.ts:158] [E: packages/coding-agent/src/core/model-runtime.ts:161]。

## Provider 合成与配置

参与合成的 provider id 是 built-ins、native extensions、`models.json` 与 config extensions 的并集 [E: packages/coding-agent/src/core/model-runtime.ts:185] [E: packages/coding-agent/src/core/model-runtime.ts:187] [E: packages/coding-agent/src/core/model-runtime.ts:188] [E: packages/coding-agent/src/core/model-runtime.ts:189] [E: packages/coding-agent/src/core/model-runtime.ts:190]。没有 overlay 的 built-in 原样进入 `pi-ai Models`；存在配置层时交给 `composeModelProvider()`，合成错误被记录，且有 base 时回退到 base provider [E: packages/coding-agent/src/core/model-runtime.ts:194] [E: packages/coding-agent/src/core/model-runtime.ts:195] [E: packages/coding-agent/src/core/model-runtime.ts:202] [E: packages/coding-agent/src/core/model-runtime.ts:204] [E: packages/coding-agent/src/core/model-runtime.ts:209] [E: packages/coding-agent/src/core/model-runtime.ts:212] [E: packages/coding-agent/src/core/model-runtime.ts:213] [E: packages/coding-agent/src/core/model-runtime.ts:214]。

`models.json` 的 provider schema 支持 name、baseUrl、apiKey、api、radius OAuth、headers、compat、authHeader、custom models 与 modelOverrides [E: packages/coding-agent/src/core/model-config.ts:183] [E: packages/coding-agent/src/core/model-config.ts:184] [E: packages/coding-agent/src/core/model-config.ts:185] [E: packages/coding-agent/src/core/model-config.ts:186] [E: packages/coding-agent/src/core/model-config.ts:187] [E: packages/coding-agent/src/core/model-config.ts:188] [E: packages/coding-agent/src/core/model-config.ts:189] [E: packages/coding-agent/src/core/model-config.ts:190] [E: packages/coding-agent/src/core/model-config.ts:191] [E: packages/coding-agent/src/core/model-config.ts:192] [E: packages/coding-agent/src/core/model-config.ts:193]。custom model 的 `id` 必填，其余 capability/cost/header/compat 字段可选；override 是 metadata/cost/header/compat 的 partial layer [E: packages/coding-agent/src/core/model-config.ts:148] [E: packages/coding-agent/src/core/model-config.ts:149] [E: packages/coding-agent/src/core/model-config.ts:151] [E: packages/coding-agent/src/core/model-config.ts:152] [E: packages/coding-agent/src/core/model-config.ts:156] [E: packages/coding-agent/src/core/model-config.ts:157] [E: packages/coding-agent/src/core/model-config.ts:158] [E: packages/coding-agent/src/core/model-config.ts:159] [E: packages/coding-agent/src/core/model-config.ts:160] [E: packages/coding-agent/src/core/model-config.ts:163] [E: packages/coding-agent/src/core/model-config.ts:177] [E: packages/coding-agent/src/core/model-config.ts:180]。

`ModelConfig.load()` 接受带注释的 JSON，缺文件返回空配置，parse/schema 错误保存在 config error 中；成功后每个 provider config 会 clone、deep-freeze 后存入 map [E: packages/coding-agent/src/core/model-config.ts:235] [E: packages/coding-agent/src/core/model-config.ts:236] [E: packages/coding-agent/src/core/model-config.ts:240] [E: packages/coding-agent/src/core/model-config.ts:242] [E: packages/coding-agent/src/core/model-config.ts:251] [E: packages/coding-agent/src/core/model-config.ts:255] [E: packages/coding-agent/src/core/model-config.ts:259] [E: packages/coding-agent/src/core/model-config.ts:265] [E: packages/coding-agent/src/core/model-config.ts:270] [E: packages/coding-agent/src/core/model-config.ts:271] [E: packages/coding-agent/src/core/model-config.ts:273]。

`composeModelProvider()` 的层次顺序是 built-in → `models.json` custom/upsert → extension model replacement → `models.json` modelOverrides；它还合成 API-key/OAuth auth，并选择 built-in、extension 或 compat API stream implementation [E: packages/coding-agent/src/core/provider-composer.ts:412] [E: packages/coding-agent/src/core/provider-composer.ts:418] [E: packages/coding-agent/src/core/provider-composer.ts:426] [E: packages/coding-agent/src/core/provider-composer.ts:428] [E: packages/coding-agent/src/core/provider-composer.ts:429] [E: packages/coding-agent/src/core/provider-composer.ts:435] [E: packages/coding-agent/src/core/provider-composer.ts:436] [E: packages/coding-agent/src/core/provider-composer.ts:441] [E: packages/coding-agent/src/core/provider-composer.ts:442] [E: packages/coding-agent/src/core/provider-composer.ts:456] [E: packages/coding-agent/src/core/provider-composer.ts:461] [E: packages/coding-agent/src/core/provider-composer.ts:464]。

## Inventory 与 availability

`getModels()`/`getModel()` 是 last-known catalog 的同步读取；`getAvailable()` 会等待正在进行的 availability refresh，并以 auth check 结果过滤 provider [E: packages/coding-agent/src/core/model-runtime.ts:295] [E: packages/coding-agent/src/core/model-runtime.ts:296] [E: packages/coding-agent/src/core/model-runtime.ts:299] [E: packages/coding-agent/src/core/model-runtime.ts:300] [E: packages/coding-agent/src/core/model-runtime.ts:307] [E: packages/coding-agent/src/core/model-runtime.ts:310] [E: packages/coding-agent/src/core/model-runtime.ts:311] [E: packages/coding-agent/src/core/model-runtime.ts:320] [E: packages/coding-agent/src/core/model-runtime.ts:321]。refresh 同时取 available models、每个 provider 的 auth check 和 credential metadata，生成 `all`、`available`、configured/stored provider sets 与 auth map [E: packages/coding-agent/src/core/model-runtime.ts:234] [E: packages/coding-agent/src/core/model-runtime.ts:236] [E: packages/coding-agent/src/core/model-runtime.ts:237] [E: packages/coding-agent/src/core/model-runtime.ts:242] [E: packages/coding-agent/src/core/model-runtime.ts:246] [E: packages/coding-agent/src/core/model-runtime.ts:254] [E: packages/coding-agent/src/core/model-runtime.ts:256] [E: packages/coding-agent/src/core/model-runtime.ts:257] [E: packages/coding-agent/src/core/model-runtime.ts:258] [E: packages/coding-agent/src/core/model-runtime.ts:259]。

动态 catalog 的 `FileModelsStore` 复用 locked JSON backend，以 provider id 为 key 读写 `ModelsStoreEntry` [E: packages/coding-agent/src/core/models-store.ts:25] [E: packages/coding-agent/src/core/models-store.ts:28] [E: packages/coding-agent/src/core/models-store.ts:29] [E: packages/coding-agent/src/core/models-store.ts:36] [E: packages/coding-agent/src/core/models-store.ts:38] [E: packages/coding-agent/src/core/models-store.ts:42] [E: packages/coding-agent/src/core/models-store.ts:45] [E: packages/coding-agent/src/core/models-store.ts:46]。`pi-ai Models.refresh()` 把该 store、有效 credential、network/force/signal 传给动态 provider，失败时再以 `allowNetwork: false` 尝试恢复缓存，并把 provider error 汇总返回 [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:288] [E: packages/ai/src/models.ts:295] [E: packages/ai/src/models.ts:297] [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:300] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:317] [E: packages/ai/src/models.ts:327]。

## Auth 与请求

runtime auth 状态按 runtime override、stored credential、`models.json`/extension configured key、ambient auth check 的顺序呈现 [E: packages/coding-agent/src/core/model-runtime.ts:416] [E: packages/coding-agent/src/core/model-runtime.ts:417] [E: packages/coding-agent/src/core/model-runtime.ts:418] [E: packages/coding-agent/src/core/model-runtime.ts:419] [E: packages/coding-agent/src/core/model-runtime.ts:423] [E: packages/coding-agent/src/core/model-runtime.ts:424] [E: packages/coding-agent/src/core/model-runtime.ts:425]。`setRuntimeApiKey()` 更新 credential overlay 和 snapshot 后刷新 model runtime，因此首次 `--api-key` 不需要写入 `auth.json` [E: packages/coding-agent/src/core/model-runtime.ts:392] [E: packages/coding-agent/src/core/model-runtime.ts:393] [E: packages/coding-agent/src/core/model-runtime.ts:394] [E: packages/coding-agent/src/core/model-runtime.ts:395] [E: packages/coding-agent/src/core/model-runtime.ts:402] [E: packages/coding-agent/src/core/model-runtime.ts:404]。

请求前 `prepareRequest()` 要求 provider 与 resolved auth 都存在；resolved baseUrl 覆盖 request model，显式 request API key 胜过 resolved key，headers/env 按字段合并 [E: packages/coding-agent/src/core/model-runtime.ts:428] [E: packages/coding-agent/src/core/model-runtime.ts:432] [E: packages/coding-agent/src/core/model-runtime.ts:434] [E: packages/coding-agent/src/core/model-runtime.ts:435] [E: packages/coding-agent/src/core/model-runtime.ts:438] [E: packages/coding-agent/src/core/model-runtime.ts:440] [E: packages/coding-agent/src/core/model-runtime.ts:442] [E: packages/coding-agent/src/core/model-runtime.ts:446] [E: packages/coding-agent/src/core/model-runtime.ts:449] [E: packages/coding-agent/src/core/model-runtime.ts:450] [E: packages/coding-agent/src/core/model-runtime.ts:451]。`stream`/`streamSimple` 都延迟执行这一步，再委托拥有该 model 的 provider [E: packages/coding-agent/src/core/model-runtime.ts:456] [E: packages/coding-agent/src/core/model-runtime.ts:461] [E: packages/coding-agent/src/core/model-runtime.ts:466] [E: packages/coding-agent/src/core/model-runtime.ts:482] [E: packages/coding-agent/src/core/model-runtime.ts:484] [E: packages/coding-agent/src/core/model-runtime.ts:485]。

login/logout 委托 `pi-ai Models`，随后 refresh；reload 则重新加载 `ModelConfig`、重建 providers 再 refresh [E: packages/coding-agent/src/core/model-runtime.ts:493] [E: packages/coding-agent/src/core/model-runtime.ts:494] [E: packages/coding-agent/src/core/model-runtime.ts:495] [E: packages/coding-agent/src/core/model-runtime.ts:499] [E: packages/coding-agent/src/core/model-runtime.ts:500] [E: packages/coding-agent/src/core/model-runtime.ts:502] [E: packages/coding-agent/src/core/model-runtime.ts:503] [E: packages/coding-agent/src/core/model-runtime.ts:506] [E: packages/coding-agent/src/core/model-runtime.ts:507] [E: packages/coding-agent/src/core/model-runtime.ts:509] [E: packages/coding-agent/src/core/model-runtime.ts:510]。

## Extension 注册与兼容 facade

native `Provider` 与旧式 `ProviderConfigInput` 都可注册；旧式注册先验证，再把非 `undefined` 字段合并到上次 registration，重组单个 provider 并异步无网络 refresh [E: packages/coding-agent/src/core/model-runtime.ts:533] [E: packages/coding-agent/src/core/model-runtime.ts:536] [E: packages/coding-agent/src/core/model-runtime.ts:537] [E: packages/coding-agent/src/core/model-runtime.ts:542] [E: packages/coding-agent/src/core/model-runtime.ts:545] [E: packages/coding-agent/src/core/model-runtime.ts:549] [E: packages/coding-agent/src/core/model-runtime.ts:552] [E: packages/coding-agent/src/core/model-runtime.ts:554] [E: packages/coding-agent/src/core/model-runtime.ts:555] [E: packages/coding-agent/src/core/model-runtime.ts:577]。

`ModelRegistry` constructor 只保存一个 `ModelRuntime`；`getAll`、`getAvailable`、`find`、auth 查询与 provider registration 全部委托 runtime [E: packages/coding-agent/src/core/model-registry.ts:20] [E: packages/coding-agent/src/core/model-registry.ts:21] [E: packages/coding-agent/src/core/model-registry.ts:23] [E: packages/coding-agent/src/core/model-registry.ts:24] [E: packages/coding-agent/src/core/model-registry.ts:36] [E: packages/coding-agent/src/core/model-registry.ts:37] [E: packages/coding-agent/src/core/model-registry.ts:40] [E: packages/coding-agent/src/core/model-registry.ts:41] [E: packages/coding-agent/src/core/model-registry.ts:44] [E: packages/coding-agent/src/core/model-registry.ts:45] [E: packages/coding-agent/src/core/model-registry.ts:54] [E: packages/coding-agent/src/core/model-registry.ts:76] [E: packages/coding-agent/src/core/model-registry.ts:124] [E: packages/coding-agent/src/core/model-registry.ts:127]。所以这个文件仍是 extension API 的兼容面，不是核心 state owner [I]。

## Sources

- `packages/coding-agent/src/core/model-runtime.ts`
- `packages/coding-agent/src/core/model-registry.ts`
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
