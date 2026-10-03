---
id: surface.providers.overview
title: provider 选择与配置
kind: surface
tier: T1
pkg: ai
source:
 - packages/ai/src/providers/all.ts
 - packages/ai/src/providers/baseten.ts
 - packages/ai/src/providers/qwen-token-plan-individual.ts
 - packages/ai/src/providers/xai.ts
 - packages/ai/src/providers/meta.ts
 - packages/ai/src/providers/typesafe.ts
 - packages/ai/src/providers/radius.ts
 - packages/ai/src/providers/radius.models.ts
 - packages/ai/src/providers/openrouter.ts
 - packages/ai/src/models.ts
 - packages/ai/src/models.generated.ts
 - packages/ai/src/env-api-keys.ts
 - packages/coding-agent/docs/providers.md
 - packages/coding-agent/src/core/model-resolver.ts
symbols:
 - builtinProviders
 - createProvider
 - Provider
 - metaProvider
 - typesafeProvider
related:
 - subsys.ai.provider-registry
 - surface.providers.auth
 - surface.providers.custom-provider
 - surface.providers.llama-cpp
 - ref.ai.provider-catalog
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.providers.overview` 是用户可见的 provider 心智模型：选择 provider/model 后，Pi 从 runtime `Models` collection 检查配置、筛选可用模型、解析 credential，再把请求交给 provider-owned wire implementation。

## 能回答的问题

- 内置 provider 集合现在有多少个,generated model catalog 是否还缺 Radius?
- Meta 与 TypeSafe 怎样进入 `builtinProviders()`?
- `/login`、环境变量、`auth.json` 与 CLI request override 怎样进入 provider?
- 动态 provider 的目录何时从 store 恢复、何时联网刷新?
- custom provider 应使用 `models.json` 还是 extension?
- 图像模型为什么不再走独立 `builtinImagesProviders()`?

## 用户入口

Provider docs 把配置分成 OAuth subscription 和 API key 两类：交互模式用 `/login`/`/logout` 管理 credential，API-key provider 也能直接从环境变量启动。[E: packages/coding-agent/docs/providers.md:3] [E: packages/coding-agent/docs/providers.md:12] [E: packages/coding-agent/docs/providers.md:22] 用户再通过 `/model`、CLI `--provider`/`--model` 或 embedding API 选择具体模型；完整登录与 credential precedence 由 [surface.providers.auth](auth.md) 解释。[I]

环境变量表含 `META_API_KEY`(Meta)以及其余 API-key provider;TypeSafe 走 `TYPESAFE_API_KEY`,不在这份用户表里,因为它是 classifier-only builtin。[E: packages/coding-agent/docs/providers.md:56] [E: packages/ai/src/env-api-keys.ts:98] [E: packages/ai/src/env-api-keys.ts:116] [E: packages/ai/src/providers/typesafe.ts:11]

## 内置集合与 static catalog

runtime ground truth 是 `builtinProviders()`:当前返回 **42** 个 provider objects,按源码顺序含 Baseten、Fireworks、Kimi Coding、**Meta**、…、Radius、Together、**TypeSafe**、Vercel AI Gateway、xAI、Xiaomi 家族、ZAI。[E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:142] [E: packages/ai/src/providers/all.ts:154] [E: packages/ai/src/providers/all.ts:169] [E: packages/ai/src/providers/all.ts:171] [E: packages/ai/src/providers/all.ts:179] `builtinModels()` 把这 42 个 objects 全部写入 `Models` collection。[E: packages/ai/src/providers/all.ts:184] [E: packages/ai/src/providers/all.ts:186]

generated `MODELS` 现在也是 **42** 个 structural bucket:`BuiltinProvider` 取 `keyof typeof MODELS`,`getBuiltinProviders()` 返回 `Object.keys(MODELS)`。Radius、Meta、TypeSafe 都在 generated aggregator 里;Radius 有 `radius.models.ts` 静态 shard,不再是「runtime-only、无 catalog entry」。[E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:94] [E: packages/ai/src/models.generated.ts:47] [E: packages/ai/src/models.generated.ts:64] [E: packages/ai/src/models.generated.ts:79] [E: packages/ai/src/models.generated.ts:81] [E: packages/ai/src/providers/radius.models.ts:7]

`all.ts` 在 `BuiltinProvider = keyof typeof MODELS` 上方仍有一句过时注释,说 Radius 没有 static catalog entry。源码事实以 `MODELS` 的 `"radius"` key 和 `RADIUS_MODELS` 为准。[E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/models.generated.ts:79] [U]

Baseten 使用 `BASETEN_API_KEY`、固定 `https://inference.baseten.co/v1` 和 `openai-completions` adapter；coding-agent 默认模型是 `zai-org/GLM-5.2`。[E: packages/ai/src/providers/baseten.ts:6] [E: packages/ai/src/providers/baseten.ts:10] [E: packages/ai/src/providers/baseten.ts:11] [E: packages/ai/src/providers/baseten.ts:13] [E: packages/coding-agent/src/core/model-resolver.ts:48] Fireworks 的 coding-agent 默认是 `accounts/fireworks/models/kimi-k3`。[E: packages/coding-agent/src/core/model-resolver.ts:46]

Qwen Token Plan Individual 是独立 runtime id `qwen-token-plan-individual`:与国际 Token Plan 共用新加坡 compatible-mode base URL 和 `QWEN_TOKEN_PLAN_API_KEY`;coding-agent 默认模型是 `qwen3.8-max`。[E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/coding-agent/src/core/model-resolver.ts:57]

xAI 只暴露 `openai-responses`:`xaiProvider()` 的类型是 `Provider<"openai-responses">`,`api` 为 `openAIResponsesApi()`;coding-agent 默认模型是 `grok-4.7`。[E: packages/ai/src/providers/xai.ts:7] [E: packages/ai/src/providers/xai.ts:22] [E: packages/coding-agent/src/core/model-resolver.ts:35]

Meta 是 `Provider<"openai-responses">`:`id: "meta"`,baseUrl `https://api.meta.ai/v1`,同时有 `META_API_KEY` 与 Muse subscription OAuth;coding-agent 默认模型是 `muse-spark-1.3`。[E: packages/ai/src/providers/meta.ts:7] [E: packages/ai/src/providers/meta.ts:9] [E: packages/ai/src/providers/meta.ts:11] [E: packages/ai/src/providers/meta.ts:13] [E: packages/ai/src/providers/meta.ts:15] [E: packages/coding-agent/src/core/model-resolver.ts:52]

TypeSafe 是 classifier-only builtin:`typesafeProvider()` 不设 chat `api`,只设 `classifiers: { "typesafe-system-one": typesafeSystemOneApi() }` 与 `TYPESAFE_API_KEY`。`createProvider` 允许只给 `classifiers` / `images` 而不给 chat `api`。[E: packages/ai/src/providers/typesafe.ts:6] [E: packages/ai/src/providers/typesafe.ts:11] [E: packages/ai/src/providers/typesafe.ts:14] [E: packages/ai/src/models.ts:1019] [E: packages/ai/src/models.ts:1045]

图像模型不再走独立 `builtinImagesProviders()` / `builtinImagesModels()`(已删除)。OpenRouter 把 image models 与 `images: { "openrouter-images": openrouterImagesApi() }` 挂在同一个 chat provider 上;`Models.generateImages()` 按 model.provider 解析 auth 后委派。[E: packages/ai/src/providers/openrouter.ts:32] [E: packages/ai/src/models.ts:341] [E: packages/ai/src/models.ts:948]

## Runtime provider contract

provider 必须给 id/name、auth、同步 last-known `getModels()` 与 stream/streamSimple;动态 provider 可实现 `refreshModels(context)`。`stream` 接收 `TranscriptContext`。[E: packages/ai/src/models.ts:145] [E: packages/ai/src/models.ts:158] [E: packages/ai/src/models.ts:166] [E: packages/ai/src/models.ts:202] [E: packages/ai/src/models.ts:204]

`Models` 提供 lookup、全体 refresh、auth check、available model filtering、login/logout 与 streaming。[E: packages/ai/src/models.ts:244] [E: packages/ai/src/models.ts:274] [E: packages/ai/src/models.ts:277] [E: packages/ai/src/models.ts:280] [E: packages/ai/src/models.ts:310] 用户界面应把 `getAvailable()` 视为「已配置 provider 的可选模型」,而不是只看所有 provider 的 raw `getModels()`。[E: packages/ai/src/models.ts:280] [I]

`Models.refresh({ allowNetwork, force, signal, providers })` 并行处理动态 provider,把 per-provider errors 收集进 `ModelsRefreshResult`;它不是旧的 `refresh(providerId)` API。[E: packages/ai/src/models.ts:92] [E: packages/ai/src/models.ts:101] [E: packages/ai/src/models.ts:274] [E: packages/ai/src/models.ts:546] [E: packages/ai/src/models.ts:605] 每个 refresh 先 restore stored catalog,再在允许联网时 fetch。[E: packages/ai/src/models.ts:535] [E: packages/ai/src/models.ts:571] [E: packages/ai/src/models.ts:577]

## Request auth 与委派

stream 先按 `model.provider` require provider,调用 `getAuth()`;request options 的 apiKey/headers/env 覆盖 resolved auth,`transformHeaders` 最后运行。[E: packages/ai/src/models.ts:837] [E: packages/ai/src/models.ts:848] [E: packages/ai/src/models.ts:859] [E: packages/ai/src/models.ts:860] 之后 `stream()`/`streamSimple()` 才委派给 provider object,并传入已 `normalizeContext()` 的 `TranscriptContext`。[E: packages/ai/src/models.ts:871] [E: packages/ai/src/models.ts:876] [E: packages/ai/src/models.ts:883]

## Custom provider 的两条路

`models.json` 适合复用现有 wire protocol 的 base URL、headers、auth 与 model list;extension 适合新 stream implementation、OAuth 或自定义生命周期。[I] `createProvider()` 支持 static baseline `models`、可选 `fetchModels()` dynamic overlay、credential filter,以及单一 API 或按 `model.api` 的 map。[E: packages/ai/src/models.ts:989] [E: packages/ai/src/models.ts:1001] [E: packages/ai/src/models.ts:1006] [E: packages/ai/src/models.ts:1019]

缺少对应 API implementation 时,stream path 返回 `ModelsError("stream", ...)`。[E: packages/ai/src/models.ts:1063] [E: packages/ai/src/models.ts:1072]

## 两个动态特例

- Radius 属于 `pi-ai` 的 42 个 runtime built-ins,**并且**有 static shard(`RADIUS_MODELS`)。默认 gateway 把 `Object.values(RADIUS_MODELS)` 当 baseline,再与 stored/gateway overlay merge;自定义 gateway 的 baseline 为空,模型来自 refresh。[E: packages/ai/src/providers/radius.ts:22] [E: packages/ai/src/providers/radius.ts:26] [E: packages/ai/src/providers/radius.ts:28] [E: packages/ai/src/providers/radius.ts:40] [E: packages/ai/src/providers/radius.models.ts:7]
- llama.cpp 不是 `pi-ai` static builtin;coding-agent 的 hidden built-in extension 运行时注册它,只有 router 当前 loaded 模型进入 selector。详见 [surface.providers.llama-cpp](llama-cpp.md)。[I]

## Gotcha

- `getBuiltinProviders()` 现在与 `builtinProviders()` 的成员集合对齐为 42(含 radius / meta / typesafe);它仍是 generated catalog keys,不是 runtime object 数组本身。[E: packages/ai/src/providers/all.ts:94] [E: packages/ai/src/providers/all.ts:136]
- `getModels()` 是 last-known sync catalog:动态 provider 返回上次 `refreshModels()` 的列表(首次前为空);实现不得抛错,`Models.getModels()` 在未知 provider 或实现抛错时返回 `[]`。空列表不等于 provider 未配置;配置与否由 `getAvailable()` / `checkAuth()` 判断。[E: packages/ai/src/models.ts:166] [E: packages/ai/src/models.ts:277] [E: packages/ai/src/models.ts:280] [E: packages/ai/src/models.ts:424] [E: packages/ai/src/models.ts:431]
- custom provider id 是 collection 的 replace key;`setProvider()` 以 `provider.id` upsert。[E: packages/ai/src/models.ts:357] [E: packages/ai/src/models.ts:399] [E: packages/ai/src/models.ts:401]
- TypeSafe 没有 chat stream;对它做 `Models.stream` 会因没有 chat API implementation 变成 stream error。[E: packages/ai/src/providers/typesafe.ts:14] [E: packages/ai/src/models.ts:1072] [I]

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/qwen-token-plan-individual.ts
- packages/ai/src/providers/xai.ts
- packages/ai/src/providers/meta.ts
- packages/ai/src/providers/typesafe.ts
- packages/ai/src/providers/radius.ts
- packages/ai/src/providers/radius.models.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/models.ts
- packages/ai/src/models.generated.ts
- packages/ai/src/env-api-keys.ts
- packages/coding-agent/docs/providers.md
- packages/coding-agent/src/core/model-resolver.ts

## 相关

- [subsys.ai.provider-registry](../../subsystems/ai/provider-registry.md): runtime registry、dynamic refresh 与 static catalog 的边界。
- [surface.providers.auth](auth.md): `/login`、OAuth/API key 与 request credential resolution。
- [surface.providers.custom-provider](custom-provider.md): `models.json` 和 extension provider 的配置细节。
- [surface.providers.llama-cpp](llama-cpp.md): llama.cpp router 与 Hugging Face GGUF 管理。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 42 个 runtime built-in provider 目录。
