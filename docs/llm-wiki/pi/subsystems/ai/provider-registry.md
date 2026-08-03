---
id: subsys.ai.provider-registry
title: provider 注册中心
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/radius.ts
symbols:
  - builtinProviders
  - builtinModels
  - getBuiltinModel
related:
  - surface.providers.overview
  - ref.ai.provider-catalog
  - ref.ai.model-catalog
  - subsys.ai.pi-messages
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.ai.provider-registry` 描述 `pi-ai` 当前的 provider 装配与 runtime collection：38 个 fresh built-in provider 进入 `ModelsImpl`，其中 Radius 是没有 structural model shard 的动态 provider；generated `MODELS` 只负责 37 个静态 catalog buckets。

## 能回答的问题

- runtime built-in provider 与 generated model catalog 为什么不是同一集合?
- `Models` 怎样存储 provider、恢复/刷新动态目录、检查认证并委派 stream?
- `createProvider()` 的 static baseline、dynamic overlay 与 `ModelsStore` 是什么关系?
- Radius 为什么属于 builtin provider，却不出现在 structural model catalog?

## 两个 ground truth

runtime membership 以 `builtinProviders()` 为准：它返回从 `amazonBedrockProvider()` 到 `zaiCodingCnProvider()` 的 38 个 fresh provider objects，Radius 位于 OpenRouter 与 Together 之间 [E: packages/ai/src/providers/all.ts:87] [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:114] [E: packages/ai/src/providers/all.ts:117] [E: packages/ai/src/providers/all.ts:126]。

static catalog membership 则来自 generated `MODELS`。`BuiltinProvider = keyof typeof MODELS`，而 Radius 只在 runtime provider array 中；因此它没有 static catalog entry [E: packages/ai/src/providers/all.ts:51] [E: packages/ai/src/providers/all.ts:117] [I]。`getBuiltinModel()`、`getBuiltinProviders()` 和 `getBuiltinModels()` 都只读该 generated object [E: packages/ai/src/providers/all.ts:59] [E: packages/ai/src/providers/all.ts:63] [E: packages/ai/src/providers/all.ts:67] [E: packages/ai/src/providers/all.ts:77]。

`builtinModels(options)` 创建 collection，逐个 `setProvider()` 注册 `builtinProviders()` 的结果 [E: packages/ai/src/providers/all.ts:131] [E: packages/ai/src/providers/all.ts:132] [E: packages/ai/src/providers/all.ts:133] [E: packages/ai/src/providers/all.ts:136]。图片生成另有 `builtinImagesProviders()`/`builtinImagesModels()`，当前只注册 OpenRouter images，不属于本 chat/text collection [E: packages/ai/src/providers/all.ts:140] [E: packages/ai/src/providers/all.ts:141] [E: packages/ai/src/providers/all.ts:145] [E: packages/ai/src/providers/all.ts:150]。

## Provider 与 Models contract

`Provider` 必须提供 id/name、auth、同步 `getModels()`、stream 和 streamSimple；动态 provider 可提供 `refreshModels(context)`，并应保留 last-known list、遵守 shared abort signal [E: packages/ai/src/models.ts:75] [E: packages/ai/src/models.ts:89] [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:104] [E: packages/ai/src/models.ts:113] [E: packages/ai/src/models.ts:119]。

`Models` 暴露同步 provider/model lookup、全体动态 provider refresh、auth check、available model 过滤、login/logout，以及 stream/complete convenience [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:135] [E: packages/ai/src/models.ts:147] [E: packages/ai/src/models.ts:150] [E: packages/ai/src/models.ts:153] [E: packages/ai/src/models.ts:164] [E: packages/ai/src/models.ts:168] [E: packages/ai/src/models.ts:171] [E: packages/ai/src/models.ts:173] [E: packages/ai/src/models.ts:186]。`MutableModels` 只增加按 provider id 的 set/delete/clear [E: packages/ai/src/models.ts:189] [E: packages/ai/src/models.ts:193]。

`ModelsImpl` 内部维护 provider map、credential store、models store 与 auth context；默认分别使用 in-memory stores 和 default auth context [E: packages/ai/src/models.ts:218] [E: packages/ai/src/models.ts:227]。同步 model listing 是 best-effort：未知 provider 或 provider `getModels()` 抛错都会产出空结果 [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:257] [E: packages/ai/src/models.ts:261] [E: packages/ai/src/models.ts:269]。

## 动态目录 refresh

`Models.refresh(options)` 不再接收单个 provider id；它选择所有具有 `refreshModels` 的 provider，并支持 `allowNetwork`、`force` 与 shared signal [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:279] [E: packages/ai/src/models.ts:284] [E: packages/ai/src/models.ts:297] [E: packages/ai/src/models.ts:301]。每个 provider 得到 scoped `ModelsStore` adapter，refresh 先读取/解析有效 credential，再执行 provider refresh [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:297]。

失败不会 reject 整批 refresh：错误进入 `ModelsRefreshResult.errors`，随后 runtime 用 `allowNetwork: false` 再尝试恢复缓存；最终还返回 aborted 状态 [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:310] [E: packages/ai/src/models.ts:314] [E: packages/ai/src/models.ts:327]。过期 OAuth 只在允许 network 时通过 credential store `modify()` 刷新，API-key provider 则调用自己的 `resolve()` 形成 refresh credential [E: packages/ai/src/models.ts:330] [E: packages/ai/src/models.ts:341] [E: packages/ai/src/models.ts:348] [E: packages/ai/src/models.ts:353]。

## `createProvider()` overlay

`CreateProviderOptions` 当前要求 static `models` 与 auth/api，可选 `fetchModels(context)` 和 credential-specific `filterModels()`；旧的 input-level `refreshModels` 已被 `fetchModels` 取代 [E: packages/ai/src/models.ts:533] [E: packages/ai/src/models.ts:540] [E: packages/ai/src/models.ts:542] [E: packages/ai/src/models.ts:544] [E: packages/ai/src/models.ts:545] [E: packages/ai/src/models.ts:547]。

factory 保存 immutable baseline 与 dynamic overlay；同 id dynamic model 替换 baseline，其它 dynamic model 追加 [E: packages/ai/src/models.ts:556] [E: packages/ai/src/models.ts:557] [E: packages/ai/src/models.ts:561] [E: packages/ai/src/models.ts:568]。如果存在 `fetchModels`，生成的 provider refresh 会先恢复 stored overlay，再在允许 network 时 fetch、替换并持久化新目录；同一 provider 的并发 refresh 共用 in-flight promise [E: packages/ai/src/models.ts:596] [E: packages/ai/src/models.ts:598] [E: packages/ai/src/models.ts:600] [E: packages/ai/src/models.ts:606] [E: packages/ai/src/models.ts:610] [E: packages/ai/src/models.ts:615]。

API 可以是单一 `ProviderStreams`，也可以按 `model.api` 映射。缺失 implementation 会生成 `ModelsError("stream", ...)`；成功路径把 stream/streamSimple 委派给选中的 implementation [E: packages/ai/src/models.ts:570] [E: packages/ai/src/models.ts:574] [E: packages/ai/src/models.ts:580] [E: packages/ai/src/models.ts:583] [E: packages/ai/src/models.ts:619] [E: packages/ai/src/models.ts:621]。

## Request auth 与 stream

stream path 先按 `model.provider` require provider，再用 `getAuth()` 解析 credential；explicit request apiKey/headers/env 覆盖 resolved auth，同步应用可选 header transform [E: packages/ai/src/models.ts:455] [E: packages/ai/src/models.ts:463] [E: packages/ai/src/models.ts:468] [E: packages/ai/src/models.ts:478] [E: packages/ai/src/models.ts:480] [E: packages/ai/src/models.ts:484]。`stream()` 和 `streamSimple()` 都通过 `lazyStream` 包住 async auth/setup，然后调用 provider-owned stream implementation [E: packages/ai/src/models.ts:489] [E: packages/ai/src/models.ts:494] [E: packages/ai/src/models.ts:500] [E: packages/ai/src/models.ts:512] [E: packages/ai/src/models.ts:516]。

## Radius 的特殊位置

`radiusProvider()` 返回 `Provider<"pi-messages">`，构造时用 `getRadiusModels(id, undefined)` 得到空的初始目录；首次 refresh 才先恢复 `ModelsStore`，若 store 为空且 credential 是 OAuth，再迁移 credential 中可能存在的 legacy config，允许联网时继续从 gateway config 建立并持久化动态目录 [E: packages/ai/src/providers/radius.ts:20] [E: packages/ai/src/providers/radius.ts:24] [E: packages/ai/src/providers/radius.ts:35] [E: packages/ai/src/providers/radius.ts:39] [E: packages/ai/src/providers/radius.ts:43] [E: packages/ai/src/providers/radius.ts:44] [E: packages/ai/src/providers/radius.ts:47] [E: packages/ai/src/providers/radius.ts:54] [E: packages/ai/src/providers/radius.ts:56]。因此 provider catalog 必须计入 Radius，而 structural model catalog 不应为它伪造 shard。[I]

## Gotcha

- `getBuiltinProviders()` 的 37 个 generated keys 不是 runtime `builtinProviders()` 的 38 个 objects；名字相近但 universe 不同 [E: packages/ai/src/providers/all.ts:51] [E: packages/ai/src/providers/all.ts:67] [E: packages/ai/src/providers/all.ts:87] [I]。
- `Models.refresh()` 是全体 refresh，失败集中返回，不是旧版的 `refresh(provider)` throw-on-one-provider contract [E: packages/ai/src/models.ts:147] [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:327]。
- `getModels()` 是 last-known synchronous read；是否 configured/available 要看 `checkAuth()`/`getAvailable()` [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:104] [E: packages/ai/src/models.ts:150] [E: packages/ai/src/models.ts:153]。

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/radius.ts

## 相关

- [surface.providers.overview](../../surface/providers/overview.md): 用户可见的 provider 选择、配置与 custom provider。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 38 个 runtime built-in provider 逐实例目录。
- [ref.ai.model-catalog](../../reference/model-catalog.md): 37 个 structural provider buckets 下的静态模型目录。
- [subsys.ai.pi-messages](pi-messages.md): Radius 使用的动态 wire protocol。
