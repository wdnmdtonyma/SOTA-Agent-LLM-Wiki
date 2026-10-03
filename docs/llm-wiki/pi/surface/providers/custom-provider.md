---
id: surface.providers.custom-provider
title: 自定义 provider(扩展)
kind: surface
tier: T1
pkg: ai
source:
 - packages/coding-agent/docs/custom-provider.md
 - packages/coding-agent/docs/models.md
 - packages/coding-agent/docs/settings.md
 - packages/coding-agent/docs/extensions.md
 - packages/coding-agent/src/core/extensions/types.ts
 - packages/coding-agent/src/core/model-registry.ts
 - packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts
 - packages/ai/src/types.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/models.ts
symbols:
 - ProviderConfig
 - registerProvider
 - unregisterProvider
 - TranscriptContext
 - getCurrentSystemPrompt
 - getCurrentTools
related:
 - surface.extensions.contribution-points
 - subsys.coding-agent.model-registry
 - ref.ai.wire-protocol-catalog
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.providers.custom-provider` 说明 pi 暴露给使用者的两条自定义 provider 路径:简单兼容端点写 `~/.pi/agent/models.json`,需要扩展生命周期、OAuth/SSO 或自定义 streaming 时用扩展 API `pi.registerProvider()`。自定义 `stream` / `streamSimple` **必须**接收 `TranscriptContext`,用 `getCurrentSystemPrompt` / `getCurrentTools` 读 prompt 与 tools。

## 能回答的问题

- 自定义 provider 应该写 `models.json`,还是写扩展并调用 `pi.registerProvider()`?
- 自定义 streaming 为什么不能再读 `context.systemPrompt` / `context.tools`?
- `getCurrentSystemPrompt` / `getCurrentTools` / `collapseSystemMessages` 分别解决什么?
- `onProviderStreamEvent` 在自定义 stream 里必须怎么调?
- `ProviderConfig` 和 `ProviderModelConfig` 对扩展作者暴露哪些字段?
- 覆盖内置 provider、注册新 provider、注销 provider 的外部语义是什么?

## 1 两条自定义路径

`models.json` 是配置型入口:docs 把 Ollama、vLLM、LM Studio、proxies 这类 custom providers/models 放在 `~/.pi/agent/models.json`。这个入口面向已有 wire protocol 的 endpoint。[E: packages/coding-agent/docs/custom-provider.md:3] [E: packages/coding-agent/docs/custom-provider.md:11]

扩展型入口是 `pi.registerProvider()`:可以注册完整 `Provider`(pi-ai native),也可以注册 name + `ProviderConfig`(legacy 配置面)。需要 `/login` 集成、动态模型发现或新 streaming implementation 时使用扩展注册。[E: packages/coding-agent/docs/custom-provider.md:21] [E: packages/coding-agent/src/core/extensions/types.ts:1817] [E: packages/coding-agent/src/core/extensions/types.ts:1818]

扩展 factory 可以是 async;动态模型发现应在 factory 中 fetch 后注册,因为 pi 会等待 factory,使 provider 在 interactive startup 与 `pi --list-models` 时已可见。[E: packages/coding-agent/docs/custom-provider.md:21]

## 2 自定义 stream 必须读 `TranscriptContext`

公开 `Models.stream` / `streamSimple` 仍接受 `Context`(`systemPrompt` / `tools` 是 leading system message 的 shorthand)。`Models` 在 dispatch 前调用 `normalizeContext()`,因此 `Provider.stream`、`ProviderStreams` 和 `api/<name>.ts` 只看见 `TranscriptContext`:`messages` 里的 system 消息携带 prompt 与 `toolsAdded` / `toolsRemoved`。[E: packages/ai/src/types.ts:732] [E: packages/ai/src/types.ts:746] [E: packages/ai/src/models.ts:876] [E: packages/ai/src/utils/transcript.ts:30] [E: packages/ai/src/types.ts:287]

`ProviderConfig.streamSimple` 的签名是 `(model, context: TranscriptContext, options?) => AssistantMessageEventStream`。调用方必须用 `getCurrentSystemPrompt(context.messages)` 和 `getCurrentTools(context.messages)` 读 prompt 与 tools,而不是 `context.systemPrompt` / `context.tools`(这两个字段在 `TranscriptContext` 上不存在)。[E: packages/coding-agent/src/core/extensions/types.ts:1909] [E: packages/coding-agent/src/core/extensions/types.ts:1911] [E: packages/coding-agent/docs/custom-provider.md:124]

`getCurrentTools` 按 transcript 顺序应用每个 system 的 `toolsRemoved` / `toolsAdded`。`getCurrentSystemPrompt` 把所有 system `content` 与 named `sections` replay 成当前 prompt 文本。模型若支持 mid-conversation system messages,later system 可以原样发送;否则调用 `collapseSystemMessages(context)` 折成一条 leading system message。[E: packages/ai/src/utils/transcript.ts:58] [E: packages/ai/src/utils/transcript.ts:63] [E: packages/ai/src/utils/transcript.ts:99] [E: packages/ai/src/utils/transcript.ts:108] [E: packages/coding-agent/docs/custom-provider.md:124]

自定义 stream 还必须兑现 `SimpleStreamOptions` 的 instrumentation:

- 发送前调用 `options.onPayload`,并用返回的 replacement payload。
- 收到 HTTP response、消费 body 之前调用 `options.onResponse`。
- 每个解析出的 provider event 在归一化之前 `await options.onProviderStreamEvent?.(providerEvent, model)`。
- 透传 abort signal 与 provider-scoped env。

省略这些 hook 会使扩展 provider 与内置 adapter 行为不一致。[E: packages/coding-agent/docs/custom-provider.md:139] [E: packages/coding-agent/docs/custom-provider.md:141] [E: packages/coding-agent/docs/custom-provider.md:142] [E: packages/coding-agent/docs/custom-provider.md:143] [E: packages/ai/src/types.ts:198]

扩展自己发请求应走 `ctx.modelRegistry.stream()` / `streamSimple()`,二者委托 `ModelRuntime` 做 request-time auth,能看到 `pi.registerProvider()` 的自定义 provider;不要用 `pi-ai/compat` streaming helpers。`ModelRegistry.stream` 仍接受 `Context`(产品层入口),由 runtime/`Models` 再 normalize。[E: packages/coding-agent/src/core/model-registry.ts:129] [E: packages/coding-agent/src/core/model-registry.ts:131] [E: packages/coding-agent/src/core/model-registry.ts:138] [E: packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts:7]

## 3 `models.json` 配置面

provider config 的文档字段包括 `baseUrl`、`api`、`apiKey`、`oauth`、`headers`、`authHeader`、`models` 和 `modelOverrides`。只是 base URL、headers、模型列表和已支持 API 类型的组合时优先使用 `models.json`。[E: packages/coding-agent/docs/custom-provider.md:11] [I]

覆盖内置 provider 时,只写 `baseUrl` 可保留内置模型并改走 proxy;若提供 `models` 数组,legacy form 会替换该 provider 的现有模型(含 chat/image/classifier)。省略 `type` 表示 `"chat"`。[E: packages/coding-agent/docs/custom-provider.md:30]

`models.json` 的 `modelOverrides` 不要和 settings 的 `compaction.modelOverrides` 混淆——后者键是精确 `"provider/modelId"`,只覆盖 compaction 的 `reserveTokens` / `keepRecentTokens`。[E: packages/coding-agent/docs/settings.md:73] [I]

## 4 扩展 API: `ProviderConfig`

`ExtensionAPI.registerProvider(name, config)` 是扩展侧注册入口,`ExtensionAPI.unregisterProvider(name)` 是对应注销入口;还有 `registerProvider(provider: Provider)` 的 native 重载。[E: packages/coding-agent/src/core/extensions/types.ts:1817] [E: packages/coding-agent/src/core/extensions/types.ts:1818] [E: packages/coding-agent/src/core/extensions/types.ts:1833]

`ProviderConfig` 的字段包括 display `name`、`baseUrl`、`apiKey`、provider-level `api`、`streamSimple`、`images`、`classifiers`、`headers`、`authHeader`、`models`、可选 `refreshModels` 和 `oauth`。[E: packages/coding-agent/src/core/extensions/types.ts:1890] [E: packages/coding-agent/src/core/extensions/types.ts:1894] [E: packages/coding-agent/src/core/extensions/types.ts:1898] [E: packages/coding-agent/src/core/extensions/types.ts:1909] [E: packages/coding-agent/src/core/extensions/types.ts:1915] [E: packages/coding-agent/src/core/extensions/types.ts:1923] [E: packages/coding-agent/src/core/extensions/types.ts:1928]

chat `ProviderChatModelConfig` 要求 `id`、`name`、`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens`,并允许 model-level `api`、`baseUrl`、`thinkingLevelMap`、`samplingParams`、`headers` 和 `compat`。[E: packages/coding-agent/src/core/extensions/types.ts:1950] [E: packages/coding-agent/src/core/extensions/types.ts:1952] [E: packages/coding-agent/src/core/extensions/types.ts:1958] [E: packages/coding-agent/src/core/extensions/types.ts:1962] [E: packages/coding-agent/src/core/extensions/types.ts:1972] [E: packages/coding-agent/src/core/extensions/types.ts:1978] [E: packages/coding-agent/src/core/extensions/types.ts:1980] [E: packages/coding-agent/src/core/extensions/types.ts:1981]

`apiKey` 与 custom header values 使用和 `models.json` 相同的 config value 语法:leading `!command` 执行命令,`$ENV_VAR` 或 `${ENV_VAR}` 插值环境变量。[E: packages/coding-agent/src/core/extensions/types.ts:1896]

## 5 注册、注销与替换语义

扩展 API 的覆盖语义:只提供 `baseUrl` 和/或 `headers` 且没有 `models` 时,现有模型会保留并使用新 endpoint。提供 `models` 时,会替换该 provider 的现有全部模型。[E: packages/coding-agent/docs/custom-provider.md:30] [E: packages/coding-agent/src/core/extensions/types.ts:1923]

`pi.unregisterProvider(name)` 用于移除之前通过 `pi.registerProvider` 注册的 provider;注销会移除该 provider 的 dynamic models 并恢复被覆盖的 built-in models。[E: packages/coding-agent/src/core/extensions/types.ts:1833]

`ExtensionRuntimeState` 持有 `pendingProviderRegistrations` 与 `pendingNativeProviderRegistrations`,并暴露 runtime-level `registerProvider` / `registerNativeProvider` / `unregisterProvider`。[E: packages/coding-agent/src/core/extensions/types.ts:2113] [E: packages/coding-agent/src/core/extensions/types.ts:2115] [E: packages/coding-agent/src/core/extensions/types.ts:2132] [E: packages/coding-agent/src/core/extensions/types.ts:2133] [E: packages/coding-agent/src/core/extensions/types.ts:2134] 类型注释写 bind 后这些方法直接打到 `ModelRegistry`,但 index source 不能确认 AgentSession 是否在注册/注销后刷新当前已选模型视图。[I] [U]

## 6 OAuth、auth header 与自定义 streaming

`oauth` 用于把 provider 接入 `/login`。`ProviderConfig.oauth` 的 type 要求 `name`、`login()`、`refreshToken()`、`getApiKey()`,并允许可选 `modifyModels()`。[E: packages/coding-agent/src/core/extensions/types.ts:1930] [E: packages/coding-agent/src/core/extensions/types.ts:1938] [E: packages/coding-agent/src/core/extensions/types.ts:1942]

`authHeader: true` 面向需要 `Authorization: Bearer <key>` 但不使用 standard API 的 provider。[E: packages/coding-agent/src/core/extensions/types.ts:1921]

`api` 字段决定使用哪个已有 streaming implementation。非标准 API 才实现 `streamSimple`;docs 要求先学习既有 provider implementations,并给出 `AssistantMessageEventStream` 的 start/content/done-or-error event pattern。[E: packages/coding-agent/docs/custom-provider.md:122] [E: packages/coding-agent/docs/custom-provider.md:122] [E: packages/coding-agent/docs/custom-provider.md:128]

custom streaming provider 如果要让 context overflow 自动恢复生效,需要把 overflow error 规范化为 pi 已知模式。[E: packages/coding-agent/docs/custom-provider.md:152]

## Gotcha

- `TranscriptContext` 没有 `systemPrompt` / `tools` 字段。从旧 `Context` 抄来的自定义 stream 会在运行时读到 `undefined` 工具列表。[E: packages/ai/src/types.ts:746] [E: packages/ai/src/utils/transcript.ts:30]
- `models.json` provider 的 `apiKey` 可以省略以便从 `/login`/`auth.json`、CLI `--api-key` 或 provider `apiKey` 取得可用状态;扩展 `ProviderConfig` 同时暴露 `apiKey` 和 `oauth` 字段。[E: packages/coding-agent/src/core/extensions/types.ts:1896] [E: packages/coding-agent/src/core/extensions/types.ts:1930] [I]
- 逐 key 的源码目录和 lazy wrapper 属于 [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md);本节点只解释 custom provider 如何选择已有 `api` 或新增 `streamSimple`。[I]

## 跨包关系

[surface.extensions.contribution-points](../extensions/contribution-points.md) 应覆盖扩展能注册的工具、命令、provider、UI 与事件等贡献点;本节点只覆盖 provider 相关的 `registerProvider()`/`unregisterProvider()`。[E: packages/coding-agent/src/core/extensions/types.ts:1817] [I]

[subsys.coding-agent.model-registry](../../subsystems/coding-agent/model-registry.md) 是 `models.json`、dynamic provider、auth/header resolution 和 model availability 的产品层装配节点。[I]

[ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md) 是 `api` key 与 wire module 的目录。[I]

## Sources

- packages/coding-agent/docs/custom-provider.md
- packages/coding-agent/docs/models.md
- packages/coding-agent/docs/settings.md
- packages/coding-agent/docs/extensions.md
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/test/suite/regressions/8964-extension-provider-streaming.test.ts
- packages/ai/src/types.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/models.ts

## 相关

- [surface.extensions.contribution-points](../extensions/contribution-points.md): 扩展贡献点总览,其中 provider 注册只是一个贡献面。
- [subsys.coding-agent.model-registry](../../subsystems/coding-agent/model-registry.md): `ModelRegistry` 如何加载、合并、过滤和认证模型。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md): `api` 字段可指向的 chat/text wire protocol key 与 lazy module。
