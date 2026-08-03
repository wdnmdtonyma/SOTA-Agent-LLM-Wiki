---
id: surface.providers.overview
title: provider 选择与配置
kind: surface
tier: T1
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/radius.ts
  - packages/coding-agent/docs/providers.md
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
updated: a8ee03b815
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

runtime ground truth 是 `builtinProviders()`：当前有 38 个 provider objects，包含位于 OpenRouter 与 Together 之间的动态 Radius [E: packages/ai/src/providers/all.ts:87] [E: packages/ai/src/providers/all.ts:114] [E: packages/ai/src/providers/all.ts:117] [E: packages/ai/src/providers/all.ts:126]。`builtinModels()` 把这 38 个 objects 全部写入 `Models` collection [E: packages/ai/src/providers/all.ts:131] [E: packages/ai/src/providers/all.ts:133] [E: packages/ai/src/providers/all.ts:134]。

generated `MODELS` 是另一套 37-bucket static catalog：`BuiltinProvider` 取 `keyof typeof MODELS`，`getBuiltinProviders()` 只返回 `Object.keys(MODELS)`，而 Radius 只出现在 runtime array [E: packages/ai/src/providers/all.ts:51] [E: packages/ai/src/providers/all.ts:67] [E: packages/ai/src/providers/all.ts:68] [E: packages/ai/src/providers/all.ts:117]。所以 provider catalog 按 runtime array 计 38，model catalog 按 committed structural shards 计 37。[I]

图片生成 provider 另走 `builtinImagesProviders()`/`builtinImagesModels()`，当前只注册 OpenRouter Images，不进入 chat/text `Models` [E: packages/ai/src/providers/all.ts:140] [E: packages/ai/src/providers/all.ts:141] [E: packages/ai/src/providers/all.ts:145] [E: packages/ai/src/providers/all.ts:150]。

## Runtime provider contract

provider 必须给 id/name、auth、同步 last-known `getModels()` 与 stream/streamSimple；动态 provider 可实现 `refreshModels(context)` [E: packages/ai/src/models.ts:75] [E: packages/ai/src/models.ts:89] [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:104] [E: packages/ai/src/models.ts:113] [E: packages/ai/src/models.ts:119]。

`Models` 提供 lookup、全体 refresh、auth check、available model filtering、login/logout 与 streaming [E: packages/ai/src/models.ts:127] [E: packages/ai/src/models.ts:147] [E: packages/ai/src/models.ts:150] [E: packages/ai/src/models.ts:153] [E: packages/ai/src/models.ts:164] [E: packages/ai/src/models.ts:168] [E: packages/ai/src/models.ts:171] [E: packages/ai/src/models.ts:173]。用户界面应把 `getAvailable()` 视为“已配置 provider 的可选模型”，而不是只看所有 provider 的 raw `getModels()` [E: packages/ai/src/models.ts:150] [E: packages/ai/src/models.ts:153] [I]。

`Models.refresh({ allowNetwork, force, signal })` 并行处理全部动态 provider，把 per-provider errors 收集进 `ModelsRefreshResult`；它不是旧的 `refresh(providerId)` API [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:53] [E: packages/ai/src/models.ts:147] [E: packages/ai/src/models.ts:276] [E: packages/ai/src/models.ts:327]。每个 refresh 获得 provider-scoped models store；失败后还会用 `allowNetwork: false` best-effort 恢复缓存 [E: packages/ai/src/models.ts:287] [E: packages/ai/src/models.ts:297] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:314]。

## Request auth 与委派

stream 先按 `model.provider` require provider，调用 `getAuth()`；request options 的 apiKey/headers/env 覆盖 resolved auth，`transformHeaders` 最后运行 [E: packages/ai/src/models.ts:455] [E: packages/ai/src/models.ts:463] [E: packages/ai/src/models.ts:468] [E: packages/ai/src/models.ts:478] [E: packages/ai/src/models.ts:480] [E: packages/ai/src/models.ts:484]。之后 `stream()`/`streamSimple()` 才委派给 provider object [E: packages/ai/src/models.ts:489] [E: packages/ai/src/models.ts:500] [E: packages/ai/src/models.ts:512] [E: packages/ai/src/models.ts:516]。

Docs 给出的用户可见 credential precedence 是 CLI `--api-key`、`auth.json`、环境变量、`models.json` provider key [E: packages/coding-agent/docs/providers.md:302] [E: packages/coding-agent/docs/providers.md:309]。Provider-scoped credential env 能覆盖进程环境，并承载 Cloudflare、Azure、Vertex、Bedrock 等附加配置 [E: packages/coding-agent/docs/providers.md:131] [E: packages/coding-agent/docs/providers.md:149]。

## Custom provider 的两条路

`models.json` 适合复用现有 wire protocol 的 base URL、headers、auth 与 model list；extension 适合新 stream implementation、OAuth 或自定义生命周期 [E: packages/coding-agent/docs/providers.md:296] [I]。`createProvider()` 支持 static baseline `models`、可选 `fetchModels()` dynamic overlay、credential filter，以及单一 API 或按 `model.api` 的 map [E: packages/ai/src/models.ts:533] [E: packages/ai/src/models.ts:542] [E: packages/ai/src/models.ts:544] [E: packages/ai/src/models.ts:545] [E: packages/ai/src/models.ts:547]。

dynamic overlay 会从 `ModelsStore` 恢复，联网 fetch 成功后再替换并持久化；相同 model id 覆盖 baseline [E: packages/ai/src/models.ts:561] [E: packages/ai/src/models.ts:565] [E: packages/ai/src/models.ts:600] [E: packages/ai/src/models.ts:607] [E: packages/ai/src/models.ts:610]。缺少对应 API implementation 时，stream path 返回 `ModelsError("stream", ...)` [E: packages/ai/src/models.ts:574] [E: packages/ai/src/models.ts:580] [E: packages/ai/src/models.ts:583]。

## 两个动态特例

- Radius 属于 `pi-ai` 的 38 个 runtime built-ins，但没有 static shard；它从 stored/gateway config 产生 `pi-messages` models [E: packages/ai/src/providers/radius.ts:20] [E: packages/ai/src/providers/radius.ts:35] [E: packages/ai/src/providers/radius.ts:54] [E: packages/ai/src/providers/radius.ts:56]。
- llama.cpp 不是 `pi-ai` static builtin；coding-agent 的 hidden built-in extension 运行时注册它，只有 router 当前 loaded 模型进入 selector。详见 [surface.providers.llama-cpp](llama-cpp.md) [I]。

## Gotcha

- `getBuiltinProviders()` 名字指 generated catalog keys，不是 `builtinProviders()` runtime objects [E: packages/ai/src/providers/all.ts:67] [E: packages/ai/src/providers/all.ts:87]。
- `getModels()` 是 last-known sync read；未出现模型可能表示未 refresh、未配置或 provider 抛错，不必然表示 provider 不存在 [E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:257]。
- custom provider id 是 collection 的 replace key；`setProvider()` 以 `provider.id` upsert [E: packages/ai/src/models.ts:189] [E: packages/ai/src/models.ts:230] [E: packages/ai/src/models.ts:231]。

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/radius.ts
- packages/coding-agent/docs/providers.md

## 相关

- [subsys.ai.provider-registry](../../subsystems/ai/provider-registry.md): runtime registry、dynamic refresh 与 static catalog 的边界。
- [surface.providers.auth](auth.md): `/login`、OAuth/API key 与 request credential resolution。
- [surface.providers.custom-provider](custom-provider.md): `models.json` 和 extension provider 的配置细节。
- [surface.providers.llama-cpp](llama-cpp.md): llama.cpp router 与 Hugging Face GGUF 管理。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 38 个 runtime built-in provider 目录。
