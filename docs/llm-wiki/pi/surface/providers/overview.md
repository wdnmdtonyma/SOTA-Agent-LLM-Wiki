---
id: surface.providers.overview
title: provider 选择与配置
kind: surface
tier: T1
pkg: ai
source:
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.ts
  - packages/coding-agent/docs/providers.md
symbols:
  - builtinProviders
  - createProvider
  - Provider
related:
  - subsys.ai.provider-registry
  - surface.providers.auth
  - ref.ai.provider-catalog
evidence: explicit
status: verified
updated: 8c943640
---

> `surface.providers.overview` 是 pi 的 provider 选择与配置入口说明: 它把用户可见的 `/login`、API key、`--provider`/`--model`、custom provider 与 `pi-ai` 的 runtime `Provider`/`Models` 集合连接起来。

## 能回答的问题

- pi 内置 provider 集合的 ground truth 在哪里,与 generated model catalog 是什么关系?
- `Provider` 在 runtime 中必须提供哪些字段和方法?
- provider 选择后,一次请求如何找到 provider、解析 auth、再委派给具体 wire API?
- `/login`、环境变量、`auth.json`、CLI `--api-key` 和 `models.json` 的凭证优先级是什么?
- custom provider 应该走 `models.json` 还是扩展注册?
- provider catalog、auth 节点和 provider registry 节点分别负责什么,本节点不重复哪些细节?

## 1 入口心智模型

Pi 文档把 provider 分成两类用户入口: subscription provider 通过 OAuth 登录,API-key provider 通过环境变量或 auth file 配置;每个 provider 都有 pi 已知的可用模型列表,该列表随 pi release 更新 [E: packages/coding-agent/docs/providers.md:3]。交互模式里用户用 `/login` 选择 provider,`/logout` 清理凭证;subscription token 存在 `~/.pi/agent/auth.json` 并会在过期后自动刷新 [E: packages/coding-agent/docs/providers.md:16] [E: packages/coding-agent/docs/providers.md:22]。API-key provider 可以通过 `/login` 写入 `auth.json`,也可以直接用环境变量启动 pi [E: packages/coding-agent/docs/providers.md:42] [E: packages/coding-agent/docs/providers.md:44] [E: packages/coding-agent/docs/providers.md:46]。

本节点说的是“如何选中和配置 provider 这张可见面”;全量 provider id/name/auth/model-source 的逐实例表属于 [ref.ai.provider-catalog](../../reference/provider-catalog.md),provider object 的注册中心和 `builtinModels()` 机制属于 [subsys.ai.provider-registry](../../subsystems/ai/provider-registry.md),登录和 credential resolution 的完整控制流属于 [surface.providers.auth](auth.md) [I]。

## 2 内置 provider 集合

内置文本 provider 集合的源码 ground truth 是 `packages/ai/src/providers/all.ts` 的 `builtinProviders()` return array;当前源码中它依次调用 35 个 provider factory,从 `amazonBedrockProvider()` 到 `zaiCodingCnProvider()` [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71] [E: packages/ai/src/providers/all.ts:72] [E: packages/ai/src/providers/all.ts:106]。`builtinModels(options)` 创建一个 `Models` 集合,遍历 `builtinProviders()` 的结果并对每个 provider 调用 `models.setProvider(provider)` [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:112] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/providers/all.ts:114]。

Generated model catalog 与 provider 集合相邻但不是同一个入口:`getBuiltinModel(provider, modelId)` 从 `MODELS[provider]` 读取单个 generated model,`getBuiltinProviders()` 则返回 `Object.keys(MODELS)` [E: packages/ai/src/providers/all.ts:48] [E: packages/ai/src/providers/all.ts:52] [E: packages/ai/src/providers/all.ts:53] [E: packages/ai/src/providers/all.ts:56] [E: packages/ai/src/providers/all.ts:57]。因此写 provider membership 时以 `builtinProviders()` 为准,写模型元数据时以 generated `MODELS` 为准;两者可作为交叉检查对象,但职责不同 [I]。

图片生成 provider 另走 `builtinImagesProviders()` 与 `builtinImagesModels()`:当前 image-generation provider 只有 `openrouterImagesProvider()`,并注册进 `ImagesModels` 而不是文本/chat 的 `Models` 集合 [E: packages/ai/src/providers/all.ts:120] [E: packages/ai/src/providers/all.ts:121] [E: packages/ai/src/providers/all.ts:125] [E: packages/ai/src/providers/all.ts:126] [E: packages/ai/src/providers/all.ts:127] [E: packages/ai/src/providers/all.ts:128]。所以 `surface.providers.overview` 的“provider 选择”默认指文本/chat provider;图片模型入口应落到 image-generation 节点或 catalog [I]。

## 3 Provider contract

`Provider` 是 pi-ai 的 runtime 单位:interface 要求 `id`、`name`、`auth`、`getModels()`、`stream()` 和 `streamSimple()`,并允许 provider 带 `baseUrl`、`headers` 和可选 `refreshModels()` [E: packages/ai/src/models.ts:32] [E: packages/ai/src/models.ts:33] [E: packages/ai/src/models.ts:34] [E: packages/ai/src/models.ts:36] [E: packages/ai/src/models.ts:37] [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:54] [E: packages/ai/src/models.ts:63] [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:71]。`Provider.auth` 和 `CreateProviderOptions.auth` 都是非可选字段;ambient credentials、AWS profile、ADC 文件或 keyless local server 如何表达 auth semantics 属于源码注释层解释,本节点仅把它作为 provider auth surface 的边界推断 [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:302] [I]。

`createProvider(input)` 是内置 provider factory 与 `models.json` custom provider 的共同构造器:输入包含 `id`、`name`、`baseUrl`、`headers`、`auth`、初始 `models`、可选 `refreshModels()` 和 `api`/api map [E: packages/ai/src/models.ts:295] [E: packages/ai/src/models.ts:296] [E: packages/ai/src/models.ts:298] [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:300] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:312] [E: packages/ai/src/models.ts:314]。构造后的 provider 用 `input.name ?? input.id` 作为 display name,`getModels()` 返回当前闭包里的 model list,并在提供 `refreshModels()` 时共享同一个 in-flight refresh promise [E: packages/ai/src/models.ts:323] [E: packages/ai/src/models.ts:324] [E: packages/ai/src/models.ts:325] [E: packages/ai/src/models.ts:346] [E: packages/ai/src/models.ts:347] [E: packages/ai/src/models.ts:348] [E: packages/ai/src/models.ts:352] [E: packages/ai/src/models.ts:353] [E: packages/ai/src/models.ts:355] [E: packages/ai/src/models.ts:357]。

`createProvider()` 支持单一 API implementation 或按 `model.api` 分派的 API map;当 model 的 `api` 找不到实现时,它返回一个会抛 `ModelsError("stream", ...)` 的 lazy stream [E: packages/ai/src/models.ts:327] [E: packages/ai/src/models.ts:329] [E: packages/ai/src/models.ts:331] [E: packages/ai/src/models.ts:337] [E: packages/ai/src/models.ts:338] [E: packages/ai/src/models.ts:339] [E: packages/ai/src/models.ts:340]。这就是 mixed-API provider 能在同一 provider 下暴露多种 wire protocol 的 runtime 形状;具体哪些 provider 使用 API map,应由逐 provider factory 或 catalog 节点展开 [I]。

## 4 选择、认证与请求委派

`Models` 是 provider 集合的产品级入口:它提供 `getProviders()`、`getProvider(id)`、`getModels(provider?)`、`getModel(provider, id)`、`refresh(provider?)`、`getAuth(model)`、`stream()`、`complete()`、`streamSimple()` 和 `completeSimple()` [E: packages/ai/src/models.ts:79] [E: packages/ai/src/models.ts:80] [E: packages/ai/src/models.ts:81] [E: packages/ai/src/models.ts:87] [E: packages/ai/src/models.ts:93] [E: packages/ai/src/models.ts:101] [E: packages/ai/src/models.ts:112] [E: packages/ai/src/models.ts:114] [E: packages/ai/src/models.ts:120] [E: packages/ai/src/models.ts:126] [E: packages/ai/src/models.ts:127]。`MutableModels.setProvider(provider)` 在实现中用 `provider.id` 写入 map,所以 custom registration 或 built-in bootstrapping 的最终冲突键是 provider id [E: packages/ai/src/models.ts:152] [E: packages/ai/src/models.ts:153]。

一次 streaming 请求先通过 `requireProvider(model)` 按 `model.provider` 找到 provider;如果找不到,抛 `ModelsError("provider", "Unknown provider: ...")` [E: packages/ai/src/models.ts:222] [E: packages/ai/src/models.ts:223] [E: packages/ai/src/models.ts:225]。随后 `applyAuth(model, options)` 调 `resolveProviderAuth(...)`,把 resolved auth 的 `baseUrl`、`apiKey`、`headers` 和 `env` 合并到 request model/options;最后 `stream()` 或 `streamSimple()` 委派给 provider 的同名方法 [E: packages/ai/src/models.ts:230] [E: packages/ai/src/models.ts:234] [E: packages/ai/src/models.ts:245] [E: packages/ai/src/models.ts:247] [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:251] [E: packages/ai/src/models.ts:252] [E: packages/ai/src/models.ts:263] [E: packages/ai/src/models.ts:265] [E: packages/ai/src/models.ts:266] [E: packages/ai/src/models.ts:278] [E: packages/ai/src/models.ts:281] [E: packages/ai/src/models.ts:282]。

用户可见凭证解析顺序在 provider docs 中写成四层:CLI `--api-key` flag、`auth.json` entry、环境变量、`models.json` custom provider keys [E: packages/coding-agent/docs/providers.md:268] [E: packages/coding-agent/docs/providers.md:270] [E: packages/coding-agent/docs/providers.md:272] [E: packages/coding-agent/docs/providers.md:273] [E: packages/coding-agent/docs/providers.md:274] [E: packages/coding-agent/docs/providers.md:275]。源码侧的 `ModelsImpl.applyAuth()` 能证明 request options 的 `apiKey` 和 `env` 会作为 override 传入 `resolveProviderAuth(...)`,并且 resolved auth 与显式 request options 合并时显式 options 对 `apiKey`、`headers`、`env` 的同名字段有后写入覆盖效果 [E: packages/ai/src/models.ts:234] [E: packages/ai/src/models.ts:240] [E: packages/ai/src/models.ts:241] [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:251] [E: packages/ai/src/models.ts:252] [I]。

## 5 API key、auth.json 与 provider-scoped env

Provider docs 给出 API-key provider 的表格,把 provider display name、环境变量和 `auth.json` key 对齐;例如 Anthropic 使用 `ANTHROPIC_API_KEY`/`anthropic`,OpenAI 使用 `OPENAI_API_KEY`/`openai`,Cloudflare AI Gateway 还需要 `CLOUDFLARE_ACCOUNT_ID` 与 `CLOUDFLARE_GATEWAY_ID` [E: packages/coding-agent/docs/providers.md:49] [E: packages/coding-agent/docs/providers.md:51] [E: packages/coding-agent/docs/providers.md:54] [E: packages/coding-agent/docs/providers.md:61]。该表不是 membership ground truth;provider membership 仍以 `builtinProviders()` 为准,auth/env 完整目录应由 auth/env catalog 覆盖 [I]。

`auth.json` credential 可以带 provider-scoped `env` object;docs 明确这些值会在解析 credential key、provider/model headers 和 Cloudflare/Azure/Vertex/Bedrock 等 provider 配置时优先于 process environment [E: packages/coding-agent/docs/providers.md:105] [E: packages/coding-agent/docs/providers.md:107] [E: packages/coding-agent/docs/providers.md:111] [E: packages/coding-agent/docs/providers.md:114] [E: packages/coding-agent/docs/providers.md:115] [E: packages/coding-agent/docs/providers.md:116] [E: packages/coding-agent/docs/providers.md:117]。这个能力用于让 pi 使用不同于项目 shell environment 的 provider settings [E: packages/coding-agent/docs/providers.md:123]。

`key` 字段还能表达 shell command、环境变量插值、escape 和 literal value;docs 中 `!command` 代表执行命令并缓存 stdout,`$ENV_VAR`/`${ENV_VAR}` 代表环境变量插值,`$$` 与 `$!` 分别转义 dollar 和 bang 前缀 [E: packages/coding-agent/docs/providers.md:127] [E: packages/coding-agent/docs/providers.md:129] [E: packages/coding-agent/docs/providers.md:134] [E: packages/coding-agent/docs/providers.md:140] [E: packages/coding-agent/docs/providers.md:145]。解析语法本身属于配置值解析或 auth 节点,本节点只记录 provider 可见配置面 [I]。

## 6 Custom provider 的两条路

Docs 的 Custom Providers 小节把 custom provider 组织成 `models.json` 与 extensions 两类入口;由于承载正文行以 Markdown bold 开头,本节点不再把该分法标成可被 lint 安全定位的 `[E]` [E: packages/coding-agent/docs/providers.md:262] [I]。因此如果只是 base URL、headers、model list、OpenAI/Anthropic/Google 等已支持 wire protocol 的组合,优先落在 `models.json`;如果需要新的 stream implementation、OAuth 或 provider 生命周期逻辑,才进入 extension provider surface [I]。

`createProvider()` 的输入形状解释了 `models.json` custom provider 的能力边界:它能提供初始 models、auth、baseUrl、headers 和单一 API 或 api map,但真正新增一个不在 `ProviderStreams` 中的 wire protocol 需要提供新的 stream implementation [E: packages/ai/src/models.ts:295] [E: packages/ai/src/models.ts:299] [E: packages/ai/src/models.ts:300] [E: packages/ai/src/models.ts:302] [E: packages/ai/src/models.ts:304] [E: packages/ai/src/models.ts:314] [I]。

## 7 Gotcha

- `ModelsImpl.getModels(provider)` 和 all-provider listing 都是 best-effort:未知 provider 返回 `[]`,provider 的 `getModels()` 抛错时也被吞掉,所以“列表里没有模型”不一定等同于 provider 不存在或 provider 不可请求 [E: packages/ai/src/models.ts:172] [E: packages/ai/src/models.ts:174] [E: packages/ai/src/models.ts:175] [E: packages/ai/src/models.ts:177] [E: packages/ai/src/models.ts:179] [E: packages/ai/src/models.ts:184] [E: packages/ai/src/models.ts:187] [I]。
- `Models.refresh(provider)` 对单 provider 的 refresh failure 会包装或传播为 `ModelsError("model_source", ...)`,而无参 refresh 用 `Promise.allSettled(...)` best-effort 刷新所有 provider [E: packages/ai/src/models.ts:198] [E: packages/ai/src/models.ts:200] [E: packages/ai/src/models.ts:203] [E: packages/ai/src/models.ts:205] [E: packages/ai/src/models.ts:206] [E: packages/ai/src/models.ts:213]。
- Lookup/listing 与请求失败语义不同:`getModel(provider, id)` 只是从 last-known model list 查找,stream path 会要求 provider 存在并执行 auth 与 dispatch [E: packages/ai/src/models.ts:194] [E: packages/ai/src/models.ts:195] [E: packages/ai/src/models.ts:263] [E: packages/ai/src/models.ts:264] [E: packages/ai/src/models.ts:265]。
- `builtinProviders()` 每次返回 factory call 结果,不是缓存的 singleton array;因此扩展或配置层不要假设修改一次返回值会改变下一次 `builtinProviders()` 的返回对象 [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71] [E: packages/ai/src/providers/all.ts:72] [E: packages/ai/src/providers/all.ts:106] [I]。

## 跨包关系

[subsys.ai.provider-registry](../../subsystems/ai/provider-registry.md) 解释 `builtinProviders()`、`builtinModels()`、`createModels()` 和 generated model catalog 的 registry 机制;本节点只把这些机制翻译成用户可见的 provider 选择与配置面 [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/models.ts:291] [I]。

[surface.providers.auth](auth.md) 应覆盖 `/login`、OAuth、API key、credential store 和 request override 的完整认证行为;本节点只说明选择 provider 后 request auth 会进入 `resolveProviderAuth(...)` 并合并到 provider 请求 [E: packages/ai/src/models.ts:234] [E: packages/ai/src/models.ts:250] [E: packages/ai/src/models.ts:251] [E: packages/ai/src/models.ts:252] [I]。

[ref.ai.provider-catalog](../../reference/provider-catalog.md) 是内置 provider 的逐实例 catalog;本节点不重复 35 行 provider 表,只说明 catalog 的 membership 应以 `builtinProviders()` 为 ground truth [E: packages/ai/src/providers/all.ts:70] [I]。

## Sources

- packages/ai/src/providers/all.ts
- packages/ai/src/models.ts
- packages/coding-agent/docs/providers.md

## 相关

- [subsys.ai.provider-registry](../../subsystems/ai/provider-registry.md): provider 注册中心、`builtinModels()` 和 generated model catalog 的关系。
- [surface.providers.auth](auth.md): 用户登录、OAuth/API key 与 credential resolution。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): 内置 provider 的逐实例完整目录。
