---
id: subsys.ai.provider-registry
title: provider 注册中心
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/baseten.ts
  - packages/ai/src/providers/qwen-token-plan-individual.ts
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
updated: 086c32e745
---

> `subsys.ai.provider-registry` 描述 `pi-ai` 当前的 provider 装配与 runtime collection：40 个 fresh built-in provider 进入 `ModelsImpl`，其中 Radius 是没有 structural model shard 的动态 provider；generated `MODELS` 负责其余 39 个静态 catalog buckets，包括本轮新增的 Qwen Token Plan Individual。

## 能回答的问题

- runtime built-in provider 与 generated model catalog 为什么不是同一集合?
- `Models` 怎样存储 provider、恢复/刷新动态目录、检查认证并委派 stream?
- `createProvider()` 的 static baseline、dynamic overlay 与 `ModelsStore` 是什么关系?
- Radius 为什么属于 builtin provider，却不出现在 structural model catalog?

## 两个 ground truth

runtime membership 以 `builtinProviders()` 为准：它返回从 `amazonBedrockProvider()` 到 `zaiCodingCnProvider()` 的 40 个 fresh provider objects；Baseten 位于 Azure 与 Cerebras 之间，`qwenTokenPlanIndividualProvider()` 位于 CN Token Plan 与 Radius 之间，Radius 仍位于 Individual 与 Together 之间 [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:90] [E: packages/ai/src/providers/all.ts:95] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:130]。

static catalog membership 则来自 generated `MODELS`。`BuiltinProvider = keyof typeof MODELS`，而 Radius 只在 runtime provider array 中；因此它没有 static catalog entry [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:121] [I]。`getBuiltinModel()`、`getBuiltinProviders()` 和 `getBuiltinModels()` 都只读该 generated object [E: packages/ai/src/providers/all.ts:61] [E: packages/ai/src/providers/all.ts:65] [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:79]。

Baseten 是普通 static builtin：factory 固定 `https://inference.baseten.co/v1`、`BASETEN_API_KEY`、`openai-completions` 与 `BASETEN_MODELS`；它同时出现在 runtime array 和 generated catalog，不具备 Radius 的动态-only例外。[E: packages/ai/src/providers/baseten.ts:6] [E: packages/ai/src/providers/baseten.ts:10] [E: packages/ai/src/providers/baseten.ts:11] [E: packages/ai/src/providers/baseten.ts:12] [E: packages/ai/src/providers/baseten.ts:13] [E: packages/ai/src/models.generated.ts:49]

Qwen Token Plan Individual 也是普通 static builtin：`qwenTokenPlanIndividualProvider()` 的 id 是 `qwen-token-plan-individual`，base URL 与国际 Token Plan 相同，auth 走 `envApiKeyAuth(..., ["QWEN_TOKEN_PLAN_API_KEY"])`，API 是 `openAICompletionsApi()`，models 来自 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS` [E: packages/ai/src/providers/qwen-token-plan-individual.ts:6] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:12] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:13] [E: packages/ai/src/models.generated.ts:74]。它与 `qwen-token-plan` 共享同一 env key，但 runtime id 与 generated bucket 都独立。

`builtinModels(options)` 创建 collection，逐个 `setProvider()` 注册 `builtinProviders()` 的结果 [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:137] [E: packages/ai/src/providers/all.ts:140]。图片生成另有 `builtinImagesProviders()`/`builtinImagesModels()`，当前只注册 OpenRouter images，不属于本 chat/text collection [E: packages/ai/src/providers/all.ts:144] [E: packages/ai/src/providers/all.ts:145] [E: packages/ai/src/providers/all.ts:149] [E: packages/ai/src/providers/all.ts:154]。

## Provider 与 Models contract

`Provider` 必须提供 id/name、auth、同步 `getModels()`、stream 和 streamSimple；动态 provider 可提供 `refreshModels(context)`，并应保留 last-known list、遵守 shared abort signal [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:111] [E: packages/ai/src/models.ts:119] [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:136] [E: packages/ai/src/models.ts:142]。

`Models` 暴露同步 provider/model lookup、全体动态 provider refresh、auth check、available model 过滤、login/logout，以及 stream/complete convenience [E: packages/ai/src/models.ts:156] [E: packages/ai/src/models.ts:164] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:180] [E: packages/ai/src/models.ts:183] [E: packages/ai/src/models.ts:194] [E: packages/ai/src/models.ts:198] [E: packages/ai/src/models.ts:170] [E: packages/ai/src/models.ts:203] [E: packages/ai/src/models.ts:216]。`MutableModels` 只增加按 provider id 的 set/delete/clear [E: packages/ai/src/models.ts:225] [E: packages/ai/src/models.ts:229]。

`ModelsImpl` 内部维护 provider map、credential store、models store 与 auth context；默认分别使用 in-memory stores 和 default auth context [E: packages/ai/src/models.ts:254] [E: packages/ai/src/models.ts:266]。同步 model listing 是 best-effort：未知 provider 或 provider `getModels()` 抛错都会产出空结果 [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:301] [E: packages/ai/src/models.ts:305] [E: packages/ai/src/models.ts:313]。

## 动态目录 refresh

`Models.refresh(options)` 并发刷新具有 `refreshModels` 的 provider；可用 `options.providers` 限制 id，并支持 `allowNetwork`、`force` 与 shared signal [E: packages/ai/src/models.ts:64] [E: packages/ai/src/models.ts:67] [E: packages/ai/src/models.ts:386] [E: packages/ai/src/models.ts:391] [E: packages/ai/src/models.ts:392]。每个 refresh 先用 `allowNetwork: false` 恢复 stored catalog，再在允许联网且 credential 就绪时做 network refresh [E: packages/ai/src/models.ts:375] [E: packages/ai/src/models.ts:376] [E: packages/ai/src/models.ts:411] [E: packages/ai/src/models.ts:417]。

失败不会 reject 整批 refresh：错误进入 `ModelsRefreshResult.errors`，返回值还带 `aborted` [E: packages/ai/src/models.ts:422] [E: packages/ai/src/models.ts:424] [E: packages/ai/src/models.ts:445]。过期 OAuth 通过 credential store `modify()` 刷新，API-key provider 则调用自己的 `resolve()` 形成 refresh credential [E: packages/ai/src/models.ts:448] [E: packages/ai/src/models.ts:453] [E: packages/ai/src/models.ts:469] [E: packages/ai/src/models.ts:474]。

## `createProvider()` overlay

`CreateProviderOptions` 当前要求 static `models` 与 auth/api，可选 `fetchModels(context)` 和 credential-specific `filterModels()`；旧的 input-level `refreshModels` 已被 `fetchModels` 取代 [E: packages/ai/src/models.ts:739] [E: packages/ai/src/models.ts:746] [E: packages/ai/src/models.ts:748] [E: packages/ai/src/models.ts:750] [E: packages/ai/src/models.ts:751] [E: packages/ai/src/models.ts:753]。

factory 保存 immutable baseline 与 dynamic overlay；同 id dynamic model 替换 baseline，其它 dynamic model 追加 [E: packages/ai/src/models.ts:762] [E: packages/ai/src/models.ts:763] [E: packages/ai/src/models.ts:766] [E: packages/ai/src/models.ts:773]。如果存在 `fetchModels`，生成的 provider refresh 会先恢复 stored overlay，再在允许 network 时 fetch、替换并持久化新目录；`publishProviderModels` 用 per-provider `publicationChains` 串行化同一 provider 的 publication [E: packages/ai/src/models.ts:801] [E: packages/ai/src/models.ts:803] [E: packages/ai/src/models.ts:817] [E: packages/ai/src/models.ts:818] [E: packages/ai/src/models.ts:820] [E: packages/ai/src/models.ts:338] [E: packages/ai/src/models.ts:344]。

API 可以是单一 `ProviderStreams`，也可以按 `model.api` 映射。缺失 implementation 会生成 `ModelsError("stream", ...)`；成功路径把 stream/streamSimple 委派给选中的 implementation [E: packages/ai/src/models.ts:775] [E: packages/ai/src/models.ts:779] [E: packages/ai/src/models.ts:785] [E: packages/ai/src/models.ts:788] [E: packages/ai/src/models.ts:829] [E: packages/ai/src/models.ts:831]。

## Request auth 与 stream

stream path 先按 `model.provider` require provider，再用 `getAuth()` 解析 credential；explicit request apiKey/headers/env 覆盖 resolved auth，同步应用可选 header transform [E: packages/ai/src/models.ts:628] [E: packages/ai/src/models.ts:643] [E: packages/ai/src/models.ts:644] [E: packages/ai/src/models.ts:655] [E: packages/ai/src/models.ts:657]。`stream()` 和 `streamSimple()` 都通过 `lazyStream` 包住 async auth/setup，然后调用 provider-owned stream implementation [E: packages/ai/src/models.ts:667] [E: packages/ai/src/models.ts:672] [E: packages/ai/src/models.ts:678] [E: packages/ai/src/models.ts:690] [E: packages/ai/src/models.ts:694]。

## Radius 的特殊位置

`radiusProvider()` 返回 `Provider<"pi-messages">`，构造时用 `getRadiusModels(id, undefined)` 得到空的初始目录；首次 refresh 才先恢复 `ModelsStore`，若 store 为空且 credential 是 OAuth，再迁移 credential 中可能存在的 legacy config，允许联网时继续从 gateway config 建立并持久化动态目录 [E: packages/ai/src/providers/radius.ts:20] [E: packages/ai/src/providers/radius.ts:24] [E: packages/ai/src/providers/radius.ts:34] [E: packages/ai/src/providers/radius.ts:39] [E: packages/ai/src/providers/radius.ts:51] [E: packages/ai/src/providers/radius.ts:52] [E: packages/ai/src/providers/radius.ts:40] [E: packages/ai/src/providers/radius.ts:69] [E: packages/ai/src/providers/radius.ts:56]。因此 provider catalog 必须计入 Radius，而 structural model catalog 不应为它伪造 shard。[I]

## Gotcha

- `getBuiltinProviders()` 的 39 个 generated keys 不是 runtime `builtinProviders()` 的 40 个 objects；名字相近但 universe 不同 [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:89] [I]。
- `Models.refresh()` 默认刷新全部动态 provider，可用 `options.providers` 限制集合；失败集中返回，不是旧版的 `refresh(provider)` throw-on-one-provider contract [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:386] [E: packages/ai/src/models.ts:391] [E: packages/ai/src/models.ts:445]。
- `getModels()` 是 last-known synchronous read；是否 configured/available 要看 `checkAuth()`/`getAvailable()` [E: packages/ai/src/models.ts:119] [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:180] [E: packages/ai/src/models.ts:183]。

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/qwen-token-plan-individual.ts
- packages/ai/src/providers/radius.ts

## 相关

- [surface.providers.overview](../../surface/providers/overview.md): 用户可见的 provider 选择、配置与 custom provider。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 40 个 runtime built-in provider 逐实例目录。
- [ref.ai.model-catalog](../../reference/model-catalog.md): 39 个 structural provider buckets 下的静态模型结构目录。
- [subsys.ai.pi-messages](pi-messages.md): Radius 使用的动态 wire protocol。
