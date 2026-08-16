---
id: surface.providers.custom-provider
title: 自定义 provider(扩展)
kind: surface
tier: T1
pkg: ai
source:
  - packages/coding-agent/docs/custom-provider.md
  - packages/coding-agent/docs/models.md
  - packages/coding-agent/src/core/extensions/types.ts
symbols:
  - ProviderConfig
  - registerProvider
  - unregisterProvider
related:
  - surface.extensions.contribution-points
  - subsys.coding-agent.model-registry
  - ref.ai.wire-protocol-catalog
evidence: explicit
status: verified
updated: 086c32e745
---

> `surface.providers.custom-provider` 说明 pi 暴露给使用者的两条自定义 provider 路径:简单兼容端点写 `~/.pi/agent/models.json`,需要扩展生命周期、OAuth/SSO 或自定义 streaming 时用扩展 API `pi.registerProvider()`。

## 能回答的问题

- 自定义 provider 应该写 `models.json`,还是写扩展并调用 `pi.registerProvider()`?
- `models.json` 的 provider/model 配置支持哪些字段?
- `ProviderConfig` 和 `ProviderModelConfig` 对扩展作者暴露哪些字段?
- 覆盖内置 provider、注册新 provider、注销 provider 的外部语义是什么?
- `api`、`streamSimple`、`oauth`、`authHeader` 和 value resolution 的边界是什么?
- index source 能确认哪些动态注册行为,哪些仍需要读实现节点?

## 1 两条自定义路径

`models.json` 是配置型入口:docs 明确把 Ollama、vLLM、LM Studio、proxies 这类 custom providers/models 放在 `~/.pi/agent/models.json` [E: packages/coding-agent/docs/models.md:3]。这个入口面向已有 wire protocol 的 endpoint,并列出 `openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 作为 supported APIs [E: packages/coding-agent/docs/models.md:121] [E: packages/coding-agent/docs/models.md:125] [E: packages/coding-agent/docs/models.md:126] [E: packages/coding-agent/docs/models.md:127] [E: packages/coding-agent/docs/models.md:128]。

扩展型入口是 `pi.registerProvider()`:custom-provider docs 明确说扩展可通过它注册 custom model providers,用于 proxies、custom endpoints、OAuth/SSO 和 custom APIs [E: packages/coding-agent/docs/custom-provider.md:3] [E: packages/coding-agent/docs/custom-provider.md:5] [E: packages/coding-agent/docs/custom-provider.md:6] [E: packages/coding-agent/docs/custom-provider.md:7] [E: packages/coding-agent/docs/custom-provider.md:8]。因此,只是 base URL、headers、模型列表和已支持 API 类型的组合时优先使用 `models.json`;需要 `/login` 集成、动态模型发现或新 streaming implementation 时使用扩展注册 [I]。

`models.json` 会在每次打开 `/model` 时 reload,所以 session 中编辑无需重启 [E: packages/coding-agent/docs/models.md:92]。扩展注册在 initial extension load 之后调用会立即生效,无需 `/reload` [E: packages/coding-agent/docs/custom-provider.md:215] [E: packages/coding-agent/docs/custom-provider.md:217]。

## 2 `models.json` 配置面

provider config 的文档字段包括 `baseUrl`、`api`、`apiKey`、`headers`、`authHeader`、`models` 和 `modelOverrides` [E: packages/coding-agent/docs/models.md:132] [E: packages/coding-agent/docs/models.md:134] [E: packages/coding-agent/docs/models.md:136] [E: packages/coding-agent/docs/models.md:137] [E: packages/coding-agent/docs/models.md:138] [E: packages/coding-agent/docs/models.md:140] [E: packages/coding-agent/docs/models.md:141] [E: packages/coding-agent/docs/models.md:142] [E: packages/coding-agent/docs/models.md:143]。对带 `models` 的非内置 provider,docs 要求有 `baseUrl`,并要求 provider 或 model 层有 `api`;`apiKey` 不要求用于加载文件,模型可通过 `/login`/`auth.json`、CLI `--api-key` 或 provider `apiKey` 变为可用,否则会加载但不出现在 `/model` 与 `--list-models` 的可用列表中 [E: packages/coding-agent/docs/models.md:145]。

model config 的文档字段包括必填 `id`,以及可选 `name`、`api`、`reasoning`、`thinkingLevelMap`、`input`、`contextWindow`、`maxTokens`、`cost` 和 `compat`;文档同时说明 `/model`、`--list-models` 和 footer 以 model `id` 展示,`name` 用于匹配和 secondary detail text [E: packages/coding-agent/docs/models.md:197] [E: packages/coding-agent/docs/models.md:199] [E: packages/coding-agent/docs/models.md:201] [E: packages/coding-agent/docs/models.md:202] [E: packages/coding-agent/docs/models.md:203] [E: packages/coding-agent/docs/models.md:204] [E: packages/coding-agent/docs/models.md:205] [E: packages/coding-agent/docs/models.md:206] [E: packages/coding-agent/docs/models.md:207] [E: packages/coding-agent/docs/models.md:208] [E: packages/coding-agent/docs/models.md:208] [E: packages/coding-agent/docs/models.md:211] [E: packages/coding-agent/docs/models.md:235] [E: packages/coding-agent/docs/models.md:236] [E: packages/coding-agent/docs/models.md:237]。

覆盖内置 provider 时,只写 `baseUrl` 可保留内置模型并改走 proxy;若提供 `models` 数组,custom models 会按 `id` merge/upsert 到内置 provider,同 id 替换,新 id 追加 [E: packages/coding-agent/docs/models.md:300] [E: packages/coding-agent/docs/models.md:302] [E: packages/coding-agent/docs/models.md:314] [E: packages/coding-agent/docs/models.md:316] [E: packages/coding-agent/docs/models.md:331] [E: packages/coding-agent/docs/models.md:332] [E: packages/coding-agent/docs/models.md:333] [E: packages/coding-agent/docs/models.md:334] [E: packages/coding-agent/docs/models.md:335]。

`modelOverrides` 是内置模型的 per-model override 入口,支持 `name`、`reasoning`、`input`、partial `cost`、`contextWindow`、`maxTokens`、`headers` 和 `compat`;未知 model id 会被忽略,同一 provider 同时定义 `models` 时 custom models 在 built-in overrides 之后合并 [E: packages/coding-agent/docs/models.md:339] [E: packages/coding-agent/docs/models.md:341] [E: packages/coding-agent/docs/models.md:380] [E: packages/coding-agent/docs/models.md:381] [E: packages/coding-agent/docs/models.md:382] [E: packages/coding-agent/docs/models.md:385]。

OpenAI-compatible custom models 现在可配置 `thinkingFormat: "baseten"` 与 `chatTemplateArgs`；该格式把 toggle values 放进 `chat_template_args`，并可同时发送 top-level `reasoning_effort`。[E: packages/coding-agent/docs/models.md:469] [E: packages/coding-agent/docs/models.md:471] [E: packages/coding-agent/docs/models.md:482] [E: packages/coding-agent/docs/custom-provider.md:754] [E: packages/coding-agent/docs/custom-provider.md:756] [E: packages/coding-agent/docs/custom-provider.md:773]

## 3 扩展 API: `ProviderConfig`

`ExtensionAPI.registerProvider(name, config)` 是扩展侧注册入口,`ExtensionAPI.unregisterProvider(name)` 是对应注销入口 [E: packages/coding-agent/src/core/extensions/types.ts:1418] [E: packages/coding-agent/src/core/extensions/types.ts:1433]。`ProviderConfig` 的字段包括 display `name`、`baseUrl`、`apiKey`、provider-level `api`、`streamSimple`、`headers`、`authHeader`、`models` 和 `oauth` [E: packages/coding-agent/src/core/extensions/types.ts:1444] [E: packages/coding-agent/src/core/extensions/types.ts:1446] [E: packages/coding-agent/src/core/extensions/types.ts:1448] [E: packages/coding-agent/src/core/extensions/types.ts:1450] [E: packages/coding-agent/src/core/extensions/types.ts:1452] [E: packages/coding-agent/src/core/extensions/types.ts:1459] [E: packages/coding-agent/src/core/extensions/types.ts:1461] [E: packages/coding-agent/src/core/extensions/types.ts:1463] [E: packages/coding-agent/src/core/extensions/types.ts:1465] [E: packages/coding-agent/src/core/extensions/types.ts:1472]。

`ProviderModelConfig` 要求 `id`、`name`、`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens`,并允许 model-level `api`、`baseUrl`、`thinkingLevelMap`、`headers` 和 `compat` [E: packages/coding-agent/src/core/extensions/types.ts:1491] [E: packages/coding-agent/src/core/extensions/types.ts:1493] [E: packages/coding-agent/src/core/extensions/types.ts:1495] [E: packages/coding-agent/src/core/extensions/types.ts:1497] [E: packages/coding-agent/src/core/extensions/types.ts:1499] [E: packages/coding-agent/src/core/extensions/types.ts:1501] [E: packages/coding-agent/src/core/extensions/types.ts:1503] [E: packages/coding-agent/src/core/extensions/types.ts:1505] [E: packages/coding-agent/src/core/extensions/types.ts:1461] [E: packages/coding-agent/src/core/extensions/types.ts:1509] [E: packages/coding-agent/src/core/extensions/types.ts:1511] [E: packages/coding-agent/src/core/extensions/types.ts:1513] [E: packages/coding-agent/src/core/extensions/types.ts:1515]。

扩展 factory 可以是 async;动态模型发现应在 factory 中 fetch 后注册,而不是延迟到 `session_start`,因为 pi 会等待 factory,使 provider 在 interactive startup 与 `pi --list-models` 时已可见 [E: packages/coding-agent/docs/custom-provider.md:91] [E: packages/coding-agent/docs/custom-provider.md:125] [E: packages/coding-agent/docs/custom-provider.md:158]。

`apiKey` 与 custom header values 使用和 `models.json` 相同的 config value 语法:leading `!command` 执行命令,`$ENV_VAR` 或 `${ENV_VAR}` 插值环境变量,`$$` 与 `$!` 分别转义美元符和感叹号 [E: packages/coding-agent/docs/custom-provider.md:184] [E: packages/coding-agent/docs/custom-provider.md:186]。这让扩展 provider 与 `models.json` provider 在 secret/reference 表达上保持一致 [I]。

## 4 注册、注销与替换语义

扩展 API 的覆盖语义在 docs 中是外部行为:只提供 `baseUrl` 和/或 `headers` 且没有 `models` 时,现有模型会保留并使用新 endpoint [E: packages/coding-agent/docs/custom-provider.md:93] [E: packages/coding-agent/docs/custom-provider.md:119]。提供 `models` 时,会替换该 provider 的现有全部模型 [E: packages/coding-agent/docs/custom-provider.md:121] [E: packages/coding-agent/docs/custom-provider.md:123] [E: packages/coding-agent/docs/custom-provider.md:184]。

`pi.unregisterProvider(name)` 用于移除之前通过 `pi.registerProvider(name, ...)` 注册的 provider;注销会移除该 provider 的 dynamic models、API key fallback、OAuth provider registration 和 custom stream handler registrations,并恢复被覆盖的 built-in models 或 provider behavior [E: packages/coding-agent/docs/custom-provider.md:188] [E: packages/coding-agent/docs/custom-provider.md:190] [E: packages/coding-agent/docs/custom-provider.md:215]。

`ExtensionRuntimeState` 持有 `pendingProviderRegistrations`,并暴露 runtime-level `registerProvider`/`unregisterProvider` 函数 [E: packages/coding-agent/src/core/extensions/types.ts:1600] [E: packages/coding-agent/src/core/extensions/types.ts:1603] [E: packages/coding-agent/src/core/extensions/types.ts:1618] [E: packages/coding-agent/src/core/extensions/types.ts:1620]。类型注释描述了 bind 前排队、bind 后调用 `ModelRegistry` 的语义,但本轮不把注释行作为 `[E]` 锚点 [I]。index source 不能确认 AgentSession 是否在注册/注销后刷新当前已选模型视图 [U]。

## 5 OAuth、auth header 与自定义 streaming

`oauth` 用于把 provider 接入 `/login`;docs 的 OAuth 示例注册 `corporate-ai` 后明确用户可通过 `/login corporate-ai` 认证 [E: packages/coding-agent/docs/custom-provider.md:286] [E: packages/coding-agent/docs/custom-provider.md:288] [E: packages/coding-agent/docs/custom-provider.md:350]。`ProviderConfig.oauth` 的 type 要求 `name`、`login()`、`refreshToken()`、`getApiKey()`,并允许可选 `modifyModels()` [E: packages/coding-agent/src/core/extensions/types.ts:1472] [E: packages/coding-agent/src/core/extensions/types.ts:1474] [E: packages/coding-agent/src/core/extensions/types.ts:1480] [E: packages/coding-agent/src/core/extensions/types.ts:1470] [E: packages/coding-agent/src/core/extensions/types.ts:1484] [E: packages/coding-agent/src/core/extensions/types.ts:1486]。

`authHeader: true` 面向需要 `Authorization: Bearer <key>` 但不使用 standard API 的 provider;示例显示它会添加 bearer header [E: packages/coding-agent/docs/custom-provider.md:270] [E: packages/coding-agent/docs/custom-provider.md:272] [E: packages/coding-agent/docs/custom-provider.md:278]。

`api` 字段决定使用哪个 streaming implementation;custom-provider docs 的扩展 API 列出 `anthropic-messages`、`openai-completions`、`openai-responses`、`azure-openai-responses`、`openai-codex-responses`、`mistral-conversations`、`google-generative-ai`、`google-vertex` 和 `bedrock-converse-stream` [E: packages/coding-agent/docs/custom-provider.md:219] [E: packages/coding-agent/docs/custom-provider.md:221] [E: packages/coding-agent/docs/custom-provider.md:225] [E: packages/coding-agent/docs/custom-provider.md:226] [E: packages/coding-agent/docs/custom-provider.md:227] [E: packages/coding-agent/docs/custom-provider.md:228] [E: packages/coding-agent/docs/custom-provider.md:229] [E: packages/coding-agent/docs/custom-provider.md:230] [E: packages/coding-agent/docs/custom-provider.md:231] [E: packages/coding-agent/docs/custom-provider.md:232] [E: packages/coding-agent/docs/custom-provider.md:233]。

非标准 API 可通过 `streamSimple` 实现;docs 要求先学习既有 provider implementations,并给出 `AssistantMessageEventStream` 的 start/content/done-or-error event pattern [E: packages/coding-agent/docs/custom-provider.md:395] [E: packages/coding-agent/docs/custom-provider.md:397] [E: packages/coding-agent/docs/custom-provider.md:407] [E: packages/coding-agent/docs/custom-provider.md:483] [E: packages/coding-agent/docs/custom-provider.md:485] [E: packages/coding-agent/docs/custom-provider.md:487] [E: packages/coding-agent/docs/custom-provider.md:498]。custom streaming provider 如果要让 context overflow 自动恢复生效,需要把 overflow error 规范化为 pi 已知模式;docs 建议在 `message_end` handler 中重写本 provider 的 assistant error message [E: packages/coding-agent/docs/custom-provider.md:567] [E: packages/coding-agent/docs/custom-provider.md:569] [E: packages/coding-agent/docs/custom-provider.md:571] [E: packages/coding-agent/docs/custom-provider.md:576]。

## Gotcha

- `models.json` provider 的 `apiKey` 可以省略以便从 `/login`/`auth.json`、CLI `--api-key` 或 provider `apiKey` 取得可用状态;扩展 `ProviderConfig` 同时暴露 `apiKey` 和 `oauth` 字段,具体 validation 约束需到 model registry 实现节点核 [E: packages/coding-agent/docs/models.md:145] [E: packages/coding-agent/src/core/extensions/types.ts:1450] [E: packages/coding-agent/src/core/extensions/types.ts:1472] [I]。
- `models.json` 的 shell command secret 在 request time 解析,pi 不提供内置 TTL、stale reuse 或恢复逻辑;慢命令或易失败命令应自行包装缓存策略 [E: packages/coding-agent/docs/models.md:172] [E: packages/coding-agent/docs/models.md:174]。
- 逐 key 的源码目录和 lazy wrapper 属于 [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md);本节点只解释 custom provider 如何选择已有 `api` 或新增 `streamSimple` [I]。

## 跨包关系

[surface.extensions.contribution-points](../extensions/contribution-points.md) 应覆盖扩展能注册的工具、命令、provider、UI 与事件等贡献点;本节点只覆盖 provider 相关的 `registerProvider()`/`unregisterProvider()` [E: packages/coding-agent/src/core/extensions/types.ts:1418] [E: packages/coding-agent/src/core/extensions/types.ts:1433] [I]。

[subsys.coding-agent.model-registry](../../subsystems/coding-agent/model-registry.md) 是 `models.json`、dynamic provider、auth/header resolution 和 model availability 的产品层装配节点;本节点只记录 index source 能确认的外部配置面和 Extension API 类型边界 [I]。

[ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md) 是 `api` key 与 wire module 的目录;自定义 provider 只在选择已有 `api` 或注册 `streamSimple` 时触碰它,不在本节点重复完整 catalog [E: packages/coding-agent/docs/custom-provider.md:221] [I]。

## Sources

- packages/coding-agent/docs/custom-provider.md
- packages/coding-agent/docs/models.md
- packages/coding-agent/src/core/extensions/types.ts

## 相关

- [surface.extensions.contribution-points](../extensions/contribution-points.md): 扩展贡献点总览,其中 provider 注册只是一个贡献面。
- [subsys.coding-agent.model-registry](../../subsystems/coding-agent/model-registry.md): `ModelRegistry` 如何加载、合并、过滤和认证模型。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md): `api` 字段可指向的 chat/text wire protocol key 与 lazy module。
