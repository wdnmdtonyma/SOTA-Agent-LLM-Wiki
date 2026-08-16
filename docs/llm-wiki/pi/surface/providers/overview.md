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
  - packages/ai/src/models.ts
  - packages/ai/src/providers/radius.ts
  - packages/coding-agent/docs/providers.md
  - packages/coding-agent/src/core/model-resolver.ts
symbols:
  - builtinProviders
  - createProvider
  - Provider
related:
  - subsys.ai.provider-registry
  - surface.providers.auth
  - surface.providers.custom-provider
  - surface.providers.llama-cpp
  - ref.ai.provider-catalog
evidence: explicit
status: verified
updated: 086c32e745
---

> `surface.providers.overview` 是用户可见的 provider 心智模型：选择 provider/model 后，Pi 从 runtime `Models` collection 检查配置、筛选可用模型、解析 credential，再把请求交给 provider-owned wire implementation。

## 能回答的问题

- 内置 provider 集合与 generated model catalog 有什么区别?
- `/login`、环境变量、`auth.json` 与 CLI request override 怎样进入 provider?
- 动态 provider 的目录何时从 store 恢复、何时联网刷新?
- custom provider 应使用 `models.json` 还是 extension?
- llama.cpp 与 Radius 为什么不应按普通 structural provider 理解?

## 用户入口

Provider docs 把配置分成 OAuth subscription 和 API key 两类：交互模式用 `/login`/`/logout` 管理 credential，API-key provider 也能直接从环境变量启动 [E: packages/coding-agent/docs/providers.md:3] [E: packages/coding-agent/docs/providers.md:17] [E: packages/coding-agent/docs/providers.md:26] [E: packages/coding-agent/docs/providers.md:62] [E: packages/coding-agent/docs/providers.md:66]。用户再通过 `/model`、CLI `--provider`/`--model` 或 embedding API 选择具体模型；完整登录与 credential precedence 由 [surface.providers.auth](auth.md) 解释。[I]

## 内置集合与 static catalog

runtime ground truth 是 `builtinProviders()`：当前有 40 个 provider objects，包含 Baseten、本轮新增的 Qwen Token Plan Individual，以及位于 Individual/Together 之间的动态 Radius [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:95] [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:130]。`builtinModels()` 把这 40 个 objects 全部写入 `Models` collection [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:137] [E: packages/ai/src/providers/all.ts:138]。

generated `MODELS` 是另一套 39-bucket static catalog：`BuiltinProvider` 取 `keyof typeof MODELS`，`getBuiltinProviders()` 只返回 `Object.keys(MODELS)`，而 Radius 只出现在 runtime array [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:121]。所以 provider catalog 按 runtime array 计 40，model catalog 按 committed structural shards 计 39。[I]

Baseten 使用 `BASETEN_API_KEY`、固定 `https://inference.baseten.co/v1` 和 `openai-completions` adapter；默认模型解析表选择 `zai-org/GLM-5.2`。[E: packages/ai/src/providers/baseten.ts:6] [E: packages/ai/src/providers/baseten.ts:10] [E: packages/ai/src/providers/baseten.ts:11] [E: packages/ai/src/providers/baseten.ts:13] [E: packages/coding-agent/src/core/model-resolver.ts:48]

Qwen Token Plan Individual 是独立 runtime id `qwen-token-plan-individual`：与国际 Token Plan 共用新加坡 compatible-mode base URL 和 `QWEN_TOKEN_PLAN_API_KEY`，但使用更窄的 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS`；coding-agent 默认模型是 `qwen3.8-max`。[E: packages/ai/src/providers/qwen-token-plan-individual.ts:8] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:10] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] [E: packages/ai/src/providers/qwen-token-plan-individual.ts:12] [E: packages/coding-agent/src/core/model-resolver.ts:56]

图片生成 provider 另走 `builtinImagesProviders()`/`builtinImagesModels()`，当前只注册 OpenRouter Images，不进入 chat/text `Models` [E: packages/ai/src/providers/all.ts:144] [E: packages/ai/src/providers/all.ts:145] [E: packages/ai/src/providers/all.ts:149] [E: packages/ai/src/providers/all.ts:154]。

## Runtime provider contract

provider 必须给 id/name、auth、同步 last-known `getModels()` 与 stream/streamSimple；动态 provider 可实现 `refreshModels(context)` [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:111] [E: packages/ai/src/models.ts:119] [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:136] [E: packages/ai/src/models.ts:142]。

`Models` 提供 lookup、全体 refresh、auth check、available model filtering、login/logout 与 streaming [E: packages/ai/src/models.ts:156] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:180] [E: packages/ai/src/models.ts:183] [E: packages/ai/src/models.ts:194] [E: packages/ai/src/models.ts:198] [E: packages/ai/src/models.ts:170] [E: packages/ai/src/models.ts:203]。用户界面应把 `getAvailable()` 视为“已配置 provider 的可选模型”，而不是只看所有 provider 的 raw `getModels()` [E: packages/ai/src/models.ts:180] [E: packages/ai/src/models.ts:183] [I]。

`Models.refresh({ allowNetwork, force, signal, providers })` 并行处理动态 provider，把 per-provider errors 收集进 `ModelsRefreshResult`；它不是旧的 `refresh(providerId)` API [E: packages/ai/src/models.ts:64] [E: packages/ai/src/models.ts:67] [E: packages/ai/src/models.ts:73] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:386] [E: packages/ai/src/models.ts:445]。每个 refresh 先 restore stored catalog，再在允许联网时 fetch [E: packages/ai/src/models.ts:375] [E: packages/ai/src/models.ts:376] [E: packages/ai/src/models.ts:411] [E: packages/ai/src/models.ts:417]。

## Request auth 与委派

stream 先按 `model.provider` require provider，调用 `getAuth()`；request options 的 apiKey/headers/env 覆盖 resolved auth，`transformHeaders` 最后运行 [E: packages/ai/src/models.ts:628] [E: packages/ai/src/models.ts:643] [E: packages/ai/src/models.ts:644] [E: packages/ai/src/models.ts:655] [E: packages/ai/src/models.ts:657]。之后 `stream()`/`streamSimple()` 才委派给 provider object [E: packages/ai/src/models.ts:667] [E: packages/ai/src/models.ts:678] [E: packages/ai/src/models.ts:690] [E: packages/ai/src/models.ts:694]。

Docs 给出的用户可见 credential precedence 是 CLI `--api-key`、`auth.json`、环境变量、`models.json` provider key [E: packages/coding-agent/docs/providers.md:310] [E: packages/coding-agent/docs/providers.md:317]。Provider-scoped credential env 能覆盖进程环境，并承载 Cloudflare、Azure、Vertex、Bedrock 等附加配置 [E: packages/coding-agent/docs/providers.md:139] [E: packages/coding-agent/docs/providers.md:157]。

## Custom provider 的两条路

`models.json` 适合复用现有 wire protocol 的 base URL、headers、auth 与 model list；extension 适合新 stream implementation、OAuth 或自定义生命周期 [E: packages/coding-agent/docs/providers.md:304] [I]。`createProvider()` 支持 static baseline `models`、可选 `fetchModels()` dynamic overlay、credential filter，以及单一 API 或按 `model.api` 的 map [E: packages/ai/src/models.ts:739] [E: packages/ai/src/models.ts:748] [E: packages/ai/src/models.ts:750] [E: packages/ai/src/models.ts:751] [E: packages/ai/src/models.ts:753]。

dynamic overlay 会从 `ModelsStore` 恢复，联网 fetch 成功后再替换并持久化；相同 model id 覆盖 baseline [E: packages/ai/src/models.ts:766] [E: packages/ai/src/models.ts:770] [E: packages/ai/src/models.ts:600] [E: packages/ai/src/models.ts:818] [E: packages/ai/src/models.ts:610]。缺少对应 API implementation 时，stream path 返回 `ModelsError("stream", ...)` [E: packages/ai/src/models.ts:779] [E: packages/ai/src/models.ts:785] [E: packages/ai/src/models.ts:788]。

## 两个动态特例

- Radius 属于 `pi-ai` 的 40 个 runtime built-ins，但没有 static shard；它从 stored/gateway config 产生 `pi-messages` models [E: packages/ai/src/providers/radius.ts:20] [E: packages/ai/src/providers/radius.ts:34] [E: packages/ai/src/providers/radius.ts:69] [E: packages/ai/src/providers/radius.ts:56]。
- llama.cpp 不是 `pi-ai` static builtin；coding-agent 的 hidden built-in extension 运行时注册它，只有 router 当前 loaded 模型进入 selector。详见 [surface.providers.llama-cpp](llama-cpp.md) [I]。

## Gotcha

- `getBuiltinProviders()` 名字指 generated catalog keys，不是 `builtinProviders()` runtime objects [E: packages/ai/src/providers/all.ts:69] [E: packages/ai/src/providers/all.ts:89]。
- `getModels()` 是 last-known sync read；未出现模型可能表示未 refresh、未配置或 provider 抛错，不必然表示 provider 不存在 [E: packages/ai/src/models.ts:119] [E: packages/ai/src/models.ts:294] [E: packages/ai/src/models.ts:301]。
- custom provider id 是 collection 的 replace key；`setProvider()` 以 `provider.id` upsert [E: packages/ai/src/models.ts:225] [E: packages/ai/src/models.ts:269] [E: packages/ai/src/models.ts:271]。

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/qwen-token-plan-individual.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/radius.ts
- packages/coding-agent/docs/providers.md
- packages/coding-agent/src/core/model-resolver.ts

## 相关

- [subsys.ai.provider-registry](../../subsystems/ai/provider-registry.md): runtime registry、dynamic refresh 与 static catalog 的边界。
- [surface.providers.auth](auth.md): `/login`、OAuth/API key 与 request credential resolution。
- [surface.providers.custom-provider](custom-provider.md): `models.json` 和 extension provider 的配置细节。
- [surface.providers.llama-cpp](llama-cpp.md): llama.cpp router 与 Hugging Face GGUF 管理。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 40 个 runtime built-in provider 目录。
