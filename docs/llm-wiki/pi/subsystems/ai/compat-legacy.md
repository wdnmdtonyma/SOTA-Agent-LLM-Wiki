---
id: subsys.ai.compat-legacy
title: 兼容/遗留别名层
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/compat.ts
  - packages/ai/src/legacy-api-aliases.ts
symbols:
  - stream
  - complete
  - getModel
related:
  - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.compat-legacy` 说明 `@earendil-works/pi-ai/compat` 的旧全局 API 兼容层:它重导出 legacy surface,保留 `stream` / `complete` / `getModel` 入口,并把新代码迁移边界指向 `createModels()` 和 provider factories。[E: packages/ai/src/compat.ts:26][E: packages/ai/src/compat.ts:27][E: packages/ai/src/compat.ts:57][E: packages/ai/src/compat.ts:237][E: packages/ai/src/compat.ts:249][I]

## 能回答的问题

- `@earendil-works/pi-ai/compat` 比 `packages/ai/src/index.ts` 多保留了哪些 legacy exports?
- `stream()` / `complete()` 在 compat 层如何选择 builtin `Models` 或 legacy API registry?
- `getModel`、`getModels`、`getProviders` 为什么只是静态 catalog alias?
- `legacy-api-aliases.ts` 中 `streamOpenAIResponses`、`streamAnthropic` 这类旧名字实际指向哪里?
- 旧代码迁移到新 provider/model surface 时,哪些能力不要继续从 compat 入口扩展?
- compat 层的 env API key 注入有哪些 gotcha?

## 职责边界

`compat.ts` 是旧全局 `pi-ai` surface 的临时入口:文件注释要求 existing apps 可以把 import 切到 `@earendil-works/pi-ai/compat`,而 new code 使用 `createModels()` 和 provider factories;该迁移意图来自源码注释,不是类型系统强制的运行时规则。[I]

compat 层的职责是保留旧入口和旧别名,不是实现新的 provider-specific wire payload:它重导出 lazy API wrappers、env API key helper、image modules、core index、legacy aliases 和 builtin image provider registration,然后在同文件内维护文字模型 legacy API registry。[E: packages/ai/src/compat.ts:13][E: packages/ai/src/compat.ts:22][E: packages/ai/src/compat.ts:23][E: packages/ai/src/compat.ts:24][E: packages/ai/src/compat.ts:26][E: packages/ai/src/compat.ts:27][E: packages/ai/src/compat.ts:28][E: packages/ai/src/compat.ts:94][I]

`legacy-api-aliases.ts` 的职责更窄:它只实例化若干 `api/<name>.lazy.ts` stream bundle,再导出 deprecated `streamX` / `streamSimpleX` 名称;这些 alias 不参与 `compat.ts` 的 `apiProviderRegistry` 注册、override 或 env 注入逻辑。[E: packages/ai/src/legacy-api-aliases.ts:19][E: packages/ai/src/legacy-api-aliases.ts:26][E: packages/ai/src/legacy-api-aliases.ts:29][E: packages/ai/src/legacy-api-aliases.ts:105][I]

## 关键文件

- `packages/ai/src/compat.ts`:兼容入口,重导出旧 surface,定义 deprecated catalog reads、legacy API provider registry、faux provider helper、builtin API registration、env API key fallback、`stream` / `complete` / `streamSimple` / `completeSimple`。[E: packages/ai/src/compat.ts:13][E: packages/ai/src/compat.ts:57][E: packages/ai/src/compat.ts:60][E: packages/ai/src/compat.ts:63][E: packages/ai/src/compat.ts:94][E: packages/ai/src/compat.ts:120][E: packages/ai/src/compat.ts:154][E: packages/ai/src/compat.ts:172][E: packages/ai/src/compat.ts:214][E: packages/ai/src/compat.ts:237][E: packages/ai/src/compat.ts:249][E: packages/ai/src/compat.ts:258][E: packages/ai/src/compat.ts:270][I]
- `packages/ai/src/legacy-api-aliases.ts`:旧 per-API stream alias 文件,把 `streamAnthropic`、`streamOpenAICompletions`、`streamOpenAIResponses`、`streamGoogle`、`streamMistral` 等名字绑定到对应 lazy wrapper 的 `stream` / `streamSimple`。[E: packages/ai/src/legacy-api-aliases.ts:19][E: packages/ai/src/legacy-api-aliases.ts:29][E: packages/ai/src/legacy-api-aliases.ts:40][E: packages/ai/src/legacy-api-aliases.ts:51][E: packages/ai/src/legacy-api-aliases.ts:67][E: packages/ai/src/legacy-api-aliases.ts:89][E: packages/ai/src/legacy-api-aliases.ts:100]

## 数据模型

`getModel`、`getModels`、`getProviders` 在 compat 层不是 wrapper function,而是分别直接赋值为 `getBuiltinModel`、`getBuiltinModels`、`getBuiltinProviders`;源码注释把三者标为 deprecated static catalog read。[E: packages/ai/src/compat.ts:57][E: packages/ai/src/compat.ts:60][E: packages/ai/src/compat.ts:63][I]

`ApiProvider<TApi, TOptions>` 是 legacy registry 接收的 runtime value:它携带 `api` string、provider-specific `stream` 和 `streamSimple`;注册时会被 `wrapStream` / `wrapStreamSimple` 转成接受 generic `Model<Api>` 的内部函数。[E: packages/ai/src/compat.ts:77][E: packages/ai/src/compat.ts:78][E: packages/ai/src/compat.ts:79][E: packages/ai/src/compat.ts:80][E: packages/ai/src/compat.ts:120][E: packages/ai/src/compat.ts:127][E: packages/ai/src/compat.ts:128]

`apiProviderRegistry` 是 `Map<string, RegisteredApiProvider>`,每个 entry 保存 wrapped provider 和可选 `sourceId`;`unregisterApiProviders(sourceId)` 只删除同一 `sourceId` 注册的 provider entry。[E: packages/ai/src/compat.ts:89][E: packages/ai/src/compat.ts:90][E: packages/ai/src/compat.ts:91][E: packages/ai/src/compat.ts:94][E: packages/ai/src/compat.ts:142][E: packages/ai/src/compat.ts:144][E: packages/ai/src/compat.ts:145]

`BUILTIN_APIS` 是 compat registry 的 builtin wire implementation 列表,当前列出 Anthropic Messages、OpenAI Completions、OpenAI Responses、OpenAI Codex Responses、Azure OpenAI Responses、Google Generative AI、Google Vertex、Mistral Conversations 和 Bedrock Converse Stream。[E: packages/ai/src/compat.ts:172][E: packages/ai/src/compat.ts:173][E: packages/ai/src/compat.ts:174][E: packages/ai/src/compat.ts:175][E: packages/ai/src/compat.ts:176][E: packages/ai/src/compat.ts:177][E: packages/ai/src/compat.ts:178][E: packages/ai/src/compat.ts:179][E: packages/ai/src/compat.ts:180][E: packages/ai/src/compat.ts:181]

## 控制流

1. Module load 执行 `registerBuiltInApiProviders()`,因此 import compat 会把 builtin API implementations 注册到 legacy registry。[E: packages/ai/src/compat.ts:191][E: packages/ai/src/compat.ts:206]
2. `registerBuiltInApiProviders()` 对每个 builtin API 先检查 `getApiProvider(api)`,不存在时才调用 `registerApiProvider(...)`;随后把当前 registry 中的 provider 保存到 `builtinApiProviderInstances`。[E: packages/ai/src/compat.ts:192][E: packages/ai/src/compat.ts:193][E: packages/ai/src/compat.ts:194][E: packages/ai/src/compat.ts:196]
3. `shouldUseBuiltinModels(model)` 先从 `compatModels.getModel(model.provider, model.id)` 查 builtin catalog,再要求 builtin model 的 `api` 等于 request model 的 `api`,并且 registry 当前 provider 等于 `registerBuiltInApiProviders()` 记录的 builtin provider instance。[E: packages/ai/src/compat.ts:196][E: packages/ai/src/compat.ts:224][E: packages/ai/src/compat.ts:225][E: packages/ai/src/compat.ts:226]
4. `stream(model, context, options)` 命中 builtin model + builtin provider 时,直接调用 `compatModels.stream(model, context, options)`;这条路径复用新 `Models` surface,不会走 compat registry fallback。[E: packages/ai/src/compat.ts:237][E: packages/ai/src/compat.ts:242][E: packages/ai/src/compat.ts:243]
5. `stream()` 未命中 builtin fast path 时,用 `resolveApiProvider(model.api)` 找 legacy registered provider,再调用 `provider.stream(model, context, withEnvApiKey(model, options))`。[E: packages/ai/src/compat.ts:245][E: packages/ai/src/compat.ts:246]
6. `complete(model, context, options)` 是 `stream(...).result()` 的 async convenience alias;`completeSimple()` 对 `streamSimple(...).result()` 做同样包装。[E: packages/ai/src/compat.ts:249][E: packages/ai/src/compat.ts:254][E: packages/ai/src/compat.ts:255][E: packages/ai/src/compat.ts:270][E: packages/ai/src/compat.ts:275][E: packages/ai/src/compat.ts:276]
7. `streamSimple()` 与 `stream()` 使用相同的 builtin fast path / legacy registry fallback 结构,差异是 options 类型为 `SimpleStreamOptions`,并调用 provider 的 `streamSimple`。[E: packages/ai/src/compat.ts:258][E: packages/ai/src/compat.ts:263][E: packages/ai/src/compat.ts:264][E: packages/ai/src/compat.ts:266][E: packages/ai/src/compat.ts:267]
8. `resolveApiProvider(api)` 找不到 legacy provider 时同步抛出 `Error("No API provider registered for api: ...")`;这和 `Models.stream` 的 lazy stream error 协议不是同一个失败形态。[E: packages/ai/src/compat.ts:229][E: packages/ai/src/compat.ts:230][E: packages/ai/src/compat.ts:231][E: packages/ai/src/compat.ts:232][I]

## legacy stream aliases

`legacy-api-aliases.ts` 在 module scope 调用每个 lazy API factory,例如 `anthropicMessagesApi()`、`openAICompletionsApi()`、`openAIResponsesApi()`;随后 deprecated alias 直接引用这些 bundle 的 `stream` 或 `streamSimple`。[E: packages/ai/src/legacy-api-aliases.ts:19][E: packages/ai/src/legacy-api-aliases.ts:25][E: packages/ai/src/legacy-api-aliases.ts:26][E: packages/ai/src/legacy-api-aliases.ts:29][E: packages/ai/src/legacy-api-aliases.ts:34][E: packages/ai/src/legacy-api-aliases.ts:89][E: packages/ai/src/legacy-api-aliases.ts:94][E: packages/ai/src/legacy-api-aliases.ts:100][E: packages/ai/src/legacy-api-aliases.ts:105]

这些 alias 是 provider-specific typed casts,不是 model catalog lookup:例如 `streamOpenAIResponses` 被 cast 为 `StreamFunction<"openai-responses", OpenAIResponsesOptions>`,而 `streamSimpleOpenAIResponses` 被 cast 为 `StreamFunction<"openai-responses", SimpleStreamOptions>`。[E: packages/ai/src/legacy-api-aliases.ts:100][E: packages/ai/src/legacy-api-aliases.ts:101][E: packages/ai/src/legacy-api-aliases.ts:102][E: packages/ai/src/legacy-api-aliases.ts:105][E: packages/ai/src/legacy-api-aliases.ts:106][E: packages/ai/src/legacy-api-aliases.ts:107]

`compat.ts` 通过 `export * from "./legacy-api-aliases.ts"` 把这些旧名字重新暴露给 compat consumers;因此迁移时要把旧 per-API import 迁到对应 `api/<name>` module 或 `api/<name>.lazy.ts` factory,而不是在 compat 文件继续新增 alias。[E: packages/ai/src/compat.ts:27][E: packages/ai/src/legacy-api-aliases.ts:29][E: packages/ai/src/legacy-api-aliases.ts:40][E: packages/ai/src/legacy-api-aliases.ts:51][E: packages/ai/src/legacy-api-aliases.ts:67][E: packages/ai/src/legacy-api-aliases.ts:89][E: packages/ai/src/legacy-api-aliases.ts:100][I]

## 设计动机与权衡

compat 保留旧全局 dispatcher,但优先让 builtin catalog model 走 `compatModels.stream()` / `compatModels.streamSimple()`;只有 custom model、overridden API provider 或非 builtin provider instance 才落到 legacy registry fallback。[E: packages/ai/src/compat.ts:208][E: packages/ai/src/compat.ts:224][E: packages/ai/src/compat.ts:226][E: packages/ai/src/compat.ts:242][E: packages/ai/src/compat.ts:245][I]

`registerBuiltInApiProviders()` 不覆盖已注册 entry,源码注释说明 compat 可能在 test 或 extension 注册 builtin API override 后加载;对应代码用 `if (!getApiProvider(api))` 防止 clobber existing entries。[E: packages/ai/src/compat.ts:191][E: packages/ai/src/compat.ts:193][E: packages/ai/src/compat.ts:194][I]

`registerFauxProvider()` 是 compat 中保留的 faux provider 辅助入口:它创建 faux core,生成随机 `sourceId`,注册 faux stream functions,并返回 `unregister()` 用同一 `sourceId` 删除 provider entries。[E: packages/ai/src/compat.ts:154][E: packages/ai/src/compat.ts:155][E: packages/ai/src/compat.ts:156][E: packages/ai/src/compat.ts:157][E: packages/ai/src/compat.ts:166][E: packages/ai/src/compat.ts:167]

## gotcha

- `withEnvApiKey()` 只有在 `options?.apiKey` 不是 non-empty string 时才读取 env;显式空字符串会被视为没有显式 key,因此可能被 `getEnvApiKey(model.provider, options?.env)` 的结果替换。[E: packages/ai/src/compat.ts:210][E: packages/ai/src/compat.ts:211][E: packages/ai/src/compat.ts:218][E: packages/ai/src/compat.ts:219][E: packages/ai/src/compat.ts:221][I]
- Builtin fast path 不调用 `withEnvApiKey()`,而是把原始 `options` 交给 `compatModels.stream()` / `compatModels.streamSimple()`;legacy registry fallback 才执行 compat 层 env API key injection。[E: packages/ai/src/compat.ts:242][E: packages/ai/src/compat.ts:243][E: packages/ai/src/compat.ts:246][E: packages/ai/src/compat.ts:263][E: packages/ai/src/compat.ts:264][E: packages/ai/src/compat.ts:267][I]
- `wrapStream()` 和 `wrapStreamSimple()` 会在 runtime 校验 `model.api === api`,不匹配时同步抛 `Mismatched api`;因此 legacy registry provider 不能安全接收不同 API 的 model。[E: packages/ai/src/compat.ts:96][E: packages/ai/src/compat.ts:100][E: packages/ai/src/compat.ts:101][E: packages/ai/src/compat.ts:102][E: packages/ai/src/compat.ts:108][E: packages/ai/src/compat.ts:112][E: packages/ai/src/compat.ts:113][E: packages/ai/src/compat.ts:114]
- `resetApiProviders()` 会清空 registry 和 builtin instance cache,然后重新注册 builtin providers;测试或扩展如果用它,之前的 custom registrations 会被移除。[E: packages/ai/src/compat.ts:200][E: packages/ai/src/compat.ts:201][E: packages/ai/src/compat.ts:202][E: packages/ai/src/compat.ts:203][I]
- `getModel` 是 static builtin catalog alias;它不会返回通过 `registerApiProvider()` 或 `registerFauxProvider()` 动态注册的模型,除非对应 helper 自己返回模型对象。[E: packages/ai/src/compat.ts:57][E: packages/ai/src/compat.ts:154][E: packages/ai/src/compat.ts:160][E: packages/ai/src/compat.ts:161][I]

## 跨包边界

[subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) 描述新 `Models.stream` / `Models.streamSimple` 如何按 `Model.api` 分派到 `ProviderStreams`;本 compat 节点只覆盖旧全局入口如何复用或绕过那条路径。[E: packages/ai/src/compat.ts:242][E: packages/ai/src/compat.ts:243][E: packages/ai/src/compat.ts:245][E: packages/ai/src/compat.ts:246][I]

迁移边界是:新代码优先使用 `createModels()` 与 provider factories,旧代码只在迁移期间保留 compat import、legacy global dispatcher 和 deprecated per-API alias;该边界来自 compat 文件注释和 deprecated 注释,不是本节点额外定义的新 API policy。[I]

## Sources

- packages/ai/src/compat.ts
- packages/ai/src/legacy-api-aliases.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `Models.stream` / `Models.streamSimple` 的新 wire 协议调度边界。
