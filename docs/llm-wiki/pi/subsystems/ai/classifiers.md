---
id: subsys.ai.classifiers
title: 结构化分类器（System One / Jev）
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/types.ts
  - packages/ai/src/models.ts
  - packages/ai/src/utils/model-operations.ts
  - packages/ai/src/api/system-one-shared.ts
  - packages/ai/src/api/typesafe-system-one.ts
  - packages/ai/src/api/typesafe-system-one.lazy.ts
  - packages/ai/src/api/cloudflare-workers-ai-system-one.ts
  - packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts
  - packages/ai/src/api/cloudflare.ts
  - packages/ai/src/providers/typesafe.ts
  - packages/ai/src/providers/typesafe.models.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/providers/cloudflare-workers-ai.ts
  - packages/ai/src/providers/cloudflare-stream.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/openrouter-catalog.ts
  - packages/ai/test/classifier-models.test.ts
symbols:
  - KnownClassifierApi
  - ClassifierModel
  - ProviderClassifier
  - ClassifierContext
  - ClassifierResult
  - classifySystemOne
  - typesafeProvider
related:
  - subsys.ai.model-discovery
  - subsys.ai.image-generation
  - subsys.ai.provider-registry
  - ref.ai.model-catalog
  - subsys.ai.lazy-loading
  - subsys.ai.wire-protocol-dispatch
  - subsys.coding-agent.model-registry
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.classifiers` 描述 `pi-ai` 的结构化分类器 runtime：`ClassifierModel` 必有 `type: "classifier"`，经 `Models.classify()` 解析 provider auth 后按 `model.api` 分派到 System One 实现。公开问题类型是 Jev 风格的 `choice` / `score` / `bool`；TypeSafe 把 public `bool` 译成 wire `noul`。

## 能回答的问题

- `KnownClassifierApi` 有哪些取值，各自绑到哪个 API module？
- `Models.classify()` 怎样按 `model.provider` 找 provider、合并鉴权，并把失败编码成 `ClassifierResult`？
- TypeSafe 原生、OpenRouter Jev 与 Cloudflare Workers AI Jev 的 URL / payload 信封有何不同？
- 公开 `bool` 问题怎样变成 wire `noul`，答案又怎样映回 `ClassifierBoolAnswer`？
- 未限定 type 的 `getModel()` / `getBuiltinModel()` 为什么读不到 Jev？

## 职责边界

分类器不是 chat stream，也不是图像生成。`ClassifierModel` 扩展 `BaseModel`，强制 `type: "classifier"`，并带 `contextWindow`；它只给 `classify()` 用 [E: packages/ai/src/types.ts:1117] [E: packages/ai/src/types.ts:1118] [E: packages/ai/src/types.ts:1119]。

`KnownClassifierApi` 是 `"typesafe-system-one" | "cloudflare-workers-ai-system-one"`；`ClassifierApi` 允许自定义 string [E: packages/ai/src/types.ts:35] [E: packages/ai/src/types.ts:37]。`ProviderClassifier` 的唯一方法是 `classify(model, context, options?) => Promise<ClassifierResult>` [E: packages/ai/src/types.ts:316] [E: packages/ai/src/types.ts:317]。

本节点覆盖分类器类型、`Models.classify()` 鉴权包装、System One 共享协议和三个内置绑定。逐 provider 的 `CLASSIFIER_MODELS` bucket 结构归 [subsys.ai.model-discovery](model-discovery.md) 与 [ref.ai.model-catalog](../../reference/model-catalog.md)；chat stream 分派归 [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md)；图像生成归 [subsys.ai.image-generation](image-generation.md)。

## 关键文件

- `packages/ai/src/types.ts`: `KnownClassifierApi`、`ClassifierContext` / `ClassifierQuestion` / `ClassifierResult`、`ClassifierModel` [E: packages/ai/src/types.ts:35] [E: packages/ai/src/types.ts:620] [E: packages/ai/src/types.ts:1117]。
- `packages/ai/src/models.ts`: `Provider.classify`、`Models.classify()`、`createProvider({ classifiers })` [E: packages/ai/src/models.ts:227] [E: packages/ai/src/models.ts:347] [E: packages/ai/src/models.ts:960] [E: packages/ai/src/models.ts:1017]。
- `packages/ai/src/api/system-one-shared.ts`: `classifySystemOne()`、`bool`↔`noul` 翻译、答案解析 [E: packages/ai/src/api/system-one-shared.ts:122] [E: packages/ai/src/api/system-one-shared.ts:149]。
- `packages/ai/src/api/typesafe-system-one.ts`: TypeSafe / OpenRouter 共用的 System One transport [E: packages/ai/src/api/typesafe-system-one.ts:8] [E: packages/ai/src/api/typesafe-system-one.ts:20]。
- `packages/ai/src/api/cloudflare-workers-ai-system-one.ts`: Workers AI REST envelope [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:23] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:42]。
- `packages/ai/src/providers/typesafe.ts`: `typesafeProvider()` 只挂 classifier models 与 `typesafe-system-one` [E: packages/ai/src/providers/typesafe.ts:6] [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:15]。

## 数据模型

`ClassifierContext` 有 JSON `state` 和 `questions: Record<string, ClassifierQuestion>` [E: packages/ai/src/types.ts:620] [E: packages/ai/src/types.ts:621] [E: packages/ai/src/types.ts:622]。三种公开问题：

| type | 字段 | 源 |
| --- | --- | --- |
| `choice` | `instructions`、`criteria: Record<string, string>` | [E: packages/ai/src/types.ts:600] [E: packages/ai/src/types.ts:601] [E: packages/ai/src/types.ts:602] [E: packages/ai/src/types.ts:603] |
| `score` | `instructions`、`criteria: string[]` | [E: packages/ai/src/types.ts:606] [E: packages/ai/src/types.ts:607] [E: packages/ai/src/types.ts:608] [E: packages/ai/src/types.ts:609] |
| `bool` | `instructions`、`criteria: { true, false }` | [E: packages/ai/src/types.ts:612] [E: packages/ai/src/types.ts:613] [E: packages/ai/src/types.ts:614] [E: packages/ai/src/types.ts:615] |

对应答案：`choice` 带 `choice` / `probabilities` / `confidence`；`score` 带 `score` / `confidence`；`bool` 只带 `probability` [E: packages/ai/src/types.ts:625] [E: packages/ai/src/types.ts:632] [E: packages/ai/src/types.ts:638]。`ClassifierResult.stopReason` 是 `"stop" | "error" | "aborted"` [E: packages/ai/src/types.ts:644] [E: packages/ai/src/types.ts:646]。

`SystemOneTransport` 把服务差异收成 `api`、`label`、`url(model)`、`payload(model, request)`、`answers(body)` [E: packages/ai/src/api/system-one-shared.ts:21] [E: packages/ai/src/api/system-one-shared.ts:23] [E: packages/ai/src/api/system-one-shared.ts:27] [E: packages/ai/src/api/system-one-shared.ts:29] [E: packages/ai/src/api/system-one-shared.ts:31]。`SystemOneWireRequest` 是 `{ state, questions }`，不含服务信封 [E: packages/ai/src/api/system-one-shared.ts:15] [E: packages/ai/src/api/system-one-shared.ts:16] [E: packages/ai/src/api/system-one-shared.ts:17]。

## 控制流

1. `Models.classify@packages/ai/src/models.ts:960` 先 `assertClassifierModel(model)`。chat 模型被当成 classifier 传入时不会 throw 给 caller，而是进 catch 变成 `stopReason: "error"` 的 `ClassifierResult`，errorMessage 含 `"is not a classifier model"` [E: packages/ai/src/models.ts:966] [E: packages/ai/src/models.ts:973] [E: packages/ai/src/utils/model-operations.ts:38] [E: packages/ai/src/utils/model-operations.ts:40] [E: packages/ai/test/classifier-models.test.ts:109] [E: packages/ai/test/classifier-models.test.ts:110] [E: packages/ai/test/classifier-models.test.ts:111]。
2. 随后 `requireProvider(model)` 用 `model.provider` 取 owning provider；没有 `provider.classify` 时抛 `ModelsError("provider", ... does not support classification)`，同样被编码成 error result [E: packages/ai/src/models.ts:818] [E: packages/ai/src/models.ts:967] [E: packages/ai/src/models.ts:968] [E: packages/ai/src/models.ts:969]。
3. `applyAuth` 解析 credential：显式 `options.apiKey` 优先于 resolved auth；headers / env 按 key 合并，caller 覆盖同名 key；若 auth 带 `baseUrl` 则复制 request model 覆盖 `baseUrl` [E: packages/ai/src/models.ts:853] [E: packages/ai/src/models.ts:854] [E: packages/ai/src/models.ts:856] [E: packages/ai/src/models.ts:857]。未配置 auth 抛 `ModelsError("auth", Provider is not configured: ...)` [E: packages/ai/src/models.ts:847] [E: packages/ai/src/models.ts:848]。
4. `createProvider()` 在 `classifiers` map 非空时给 provider 挂 `classify`：按 `model.api` 取 implementation，缺失时返回 `classifierErrorResult` 而不是 reject [E: packages/ai/src/models.ts:1155] [E: packages/ai/src/models.ts:1156] [E: packages/ai/src/models.ts:1157] [E: packages/ai/src/models.ts:1164]。
5. `classifySystemOne@packages/ai/src/api/system-one-shared.ts:149` 校验 `model.api === transport.api` 且 `options.apiKey` 存在，否则进入 catch 写成 error/aborted result [E: packages/ai/src/api/system-one-shared.ts:165] [E: packages/ai/src/api/system-one-shared.ts:166] [E: packages/ai/src/api/system-one-shared.ts:202] [E: packages/ai/src/api/system-one-shared.ts:203]。
6. 请求体先走 `wireRequest(context)`：每个 `question.type === "bool"` 被改写成 `{ ...question, type: "noul" }`，`choice` / `score` 原样保留 [E: packages/ai/src/api/system-one-shared.ts:122] [E: packages/ai/src/api/system-one-shared.ts:128]。HTTP 是 `POST` + `Authorization: Bearer` + `content-type: application/json` [E: packages/ai/src/api/system-one-shared.ts:141] [E: packages/ai/src/api/system-one-shared.ts:180] [E: packages/ai/src/api/system-one-shared.ts:181]。
7. 成功后 `parseAnswers` 按问题 id 对齐。`bool` 问题要求 wire `answer.type === "noul"`，再写成 public `{ type: "bool", probability: answer.noul }` [E: packages/ai/src/api/system-one-shared.ts:108] [E: packages/ai/src/api/system-one-shared.ts:112] [E: packages/ai/src/api/system-one-shared.ts:113]。`choice` / `score` 分别要求同名 type [E: packages/ai/src/api/system-one-shared.ts:84] [E: packages/ai/src/api/system-one-shared.ts:85] [E: packages/ai/src/api/system-one-shared.ts:97] [E: packages/ai/src/api/system-one-shared.ts:98]。
8. 默认 `maxRetries` 是 2（与 chat SDK 常见默认一致，但走 `retryProviderRequest` 而不是 OpenAI SDK）[E: packages/ai/src/api/system-one-shared.ts:194]。fetch 默认 `globalThis.fetch`，可被 `options.fetch` 替换 [E: packages/ai/src/api/system-one-shared.ts:171]。

同一 provider+id 的 chat 行与 classifier 行是分开的 catalog 条目：`getModel("test", "shared")` 只返回 chat，`getModelOfType("classifier", "test", "shared")` 返回 classifier [E: packages/ai/test/classifier-models.test.ts:82] [E: packages/ai/test/classifier-models.test.ts:83] [E: packages/ai/test/classifier-models.test.ts:84] [E: packages/ai/src/models.ts:471] [E: packages/ai/src/models.ts:475]。

## TypeSafe 原生 Jev

`typesafeProvider()` 的 id 是 `"typesafe"`，显示名 `"TypeSafe"`，auth 走 `TYPESAFE_API_KEY` [E: packages/ai/src/providers/typesafe.ts:8] [E: packages/ai/src/providers/typesafe.ts:9] [E: packages/ai/src/providers/typesafe.ts:11]。`models` 只取 `Object.values(TYPESAFE_CLASSIFIER_MODELS)`，`classifiers` 只注册 `"typesafe-system-one": typesafeSystemOneApi()` [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:15]。它没有 chat `api` map。

生成器从 `https://models.dev/models.json?type=decision` 读 `typesafe/jev-latest`，写入 `id: "jev-latest"`、`api: "typesafe-system-one"`、`provider: "typesafe"`、`baseUrl: "https://api.typesafe.ai/v1/"`、cost 全 0、`contextWindow` 默认 64000 [E: packages/ai/scripts/generate-models.ts:2625] [E: packages/ai/scripts/generate-models.ts:2628] [E: packages/ai/scripts/generate-models.ts:2635] [E: packages/ai/scripts/generate-models.ts:2637] [E: packages/ai/scripts/generate-models.ts:2638] [E: packages/ai/scripts/generate-models.ts:2639] [E: packages/ai/scripts/generate-models.ts:2642] [E: packages/ai/scripts/generate-models.ts:2643]。

单测断言 `getBuiltinClassifierModel("typesafe", "jev-latest")` 的 `type` / `api` / `provider` / `contextWindow: 64000`；`getBuiltinClassifierModels("typesafe")` 与 `getAllBuiltinModels("typesafe")` 都等于这一条；`builtinModels().getModel("typesafe", "jev-latest")` 是 `undefined` [E: packages/ai/test/classifier-models.test.ts:115] [E: packages/ai/test/classifier-models.test.ts:116] [E: packages/ai/test/classifier-models.test.ts:122] [E: packages/ai/test/classifier-models.test.ts:123] [E: packages/ai/test/classifier-models.test.ts:126]。

TypeSafe transport 的 URL 是 `new URL("systemone", `${baseUrl}/`)`，因此 `https://api.typesafe.ai/v1/` 变成 `https://api.typesafe.ai/v1/systemone`；payload 是 `{ model: model.id, ...request }`，答案取响应顶层 `body.answers` [E: packages/ai/src/api/typesafe-system-one.ts:9] [E: packages/ai/src/api/typesafe-system-one.ts:11] [E: packages/ai/src/api/typesafe-system-one.ts:12] [E: packages/ai/src/api/typesafe-system-one.ts:15]。

## OpenRouter Jev

`openrouterProvider()` 把 `OPENROUTER_CLASSIFIER_MODELS` 和 chat / image catalog 一起放进同一个 `models` 数组，并注册 `classifiers: { "typesafe-system-one": typesafeSystemOneApi() }` [E: packages/ai/src/providers/openrouter.ts:23] [E: packages/ai/src/providers/openrouter.ts:26] [E: packages/ai/src/providers/openrouter.ts:34]。`typesafe-system-one.ts` 用 `model.baseUrl` 拼 `systemone`，OpenRouter 分类器的 `baseUrl: "https://openrouter.ai/api/v1"` 因此打到 `https://openrouter.ai/api/v1/systemone` [E: packages/ai/scripts/openrouter-catalog.ts:120] [E: packages/ai/scripts/openrouter-catalog.ts:122] [E: packages/ai/src/api/typesafe-system-one.ts:11]。

生成器另拉 `?output_modalities=decisions` 列表；`architecture.output_modalities` 含 `"decisions"` 的条目成为 `type: "classifier"`、`api: "typesafe-system-one"`、`provider: "openrouter"` 的行 [E: packages/ai/scripts/generate-models.ts:1291] [E: packages/ai/scripts/openrouter-catalog.ts:114] [E: packages/ai/scripts/openrouter-catalog.ts:117] [E: packages/ai/scripts/openrouter-catalog.ts:120] [E: packages/ai/scripts/openrouter-catalog.ts:121]。credential 与 OpenRouter chat / image 共用 `OPENROUTER_API_KEY` 和 lazy OAuth [E: packages/ai/src/providers/openrouter.ts:16] [E: packages/ai/src/providers/openrouter.ts:17]。

单测对每个 `getBuiltinClassifierModels("openrouter")` 条目断言 `api: "typesafe-system-one"`、`baseUrl: "https://openrouter.ai/api/v1"`，并且 `getModel("openrouter", id)` 为 `undefined` [E: packages/ai/test/classifier-models.test.ts:132] [E: packages/ai/test/classifier-models.test.ts:133] [E: packages/ai/test/classifier-models.test.ts:134]。逐 id 清单在 gitignored JSON，本节点不枚举 [I]。

## Cloudflare Workers AI Jev

Workers AI 没有未认证 catalog，models.dev 也不列其 System One 模型；生成器硬编码一条 `id: "typesafe/jev"`、`name: "Jev"`、`api: "cloudflare-workers-ai-system-one"`、`provider: "cloudflare-workers-ai"`、`input: ["text"]`、cost 全 0、`contextWindow: 32000` [E: packages/ai/scripts/generate-models.ts:2656] [E: packages/ai/scripts/generate-models.ts:2658] [E: packages/ai/scripts/generate-models.ts:2659] [E: packages/ai/scripts/generate-models.ts:2660] [E: packages/ai/scripts/generate-models.ts:2661] [E: packages/ai/scripts/generate-models.ts:2664] [E: packages/ai/scripts/generate-models.ts:2666]。`baseUrl` 是 `CLOUDFLARE_WORKERS_AI_REST_BASE_URL` = `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai` [E: packages/ai/scripts/generate-models.ts:2663] [E: packages/ai/src/api/cloudflare.ts:6] [E: packages/ai/src/api/cloudflare.ts:7]。

`cloudflareWorkersAIProvider()` 把 chat models 与 `CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS` 拼进 `models`，chat 走 `openai-completions`，classifiers 走 `"cloudflare-workers-ai-system-one": cloudflareClassifier(cloudflareWorkersAISystemOneApi())` [E: packages/ai/src/providers/cloudflare-workers-ai.ts:16] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:18] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:20] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:22]。`cloudflareClassifier` 在 classify 前用 env 替换 `{CLOUDFLARE_ACCOUNT_ID}` / `{CLOUDFLARE_GATEWAY_ID}` [E: packages/ai/src/providers/cloudflare-stream.ts:11] [E: packages/ai/src/providers/cloudflare-stream.ts:12] [E: packages/ai/src/providers/cloudflare-stream.ts:31] [E: packages/ai/src/providers/cloudflare-stream.ts:33] [E: packages/ai/src/providers/cloudflare-stream.ts:34]。

Workers AI transport：URL 是 `new URL("run", `${baseUrl}/`)`（即 `.../ai/run`）；payload 是 `{ model: model.id, input: request }` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:26] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:27]。响应信封是 `{ success, result: { state: "Completed", result: { answers, usage } } }`；`success === false` 拼 Cloudflare errors；`state !== "Completed"` 抛错；答案取 `run.result.answers` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:30] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:33] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:37]。`bool`→`noul` 翻译与 TypeSafe 共用 `classifySystemOne` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:42] [E: packages/ai/src/api/system-one-shared.ts:128]。

## 设计动机与权衡

`Models.classify()` 与 `Models.generateImages()` 一样 never reject：未知 provider、未配置 auth、错误 type 都变成带 `stopReason` 的 result，让上层按统一 shape 处理 [E: packages/ai/src/models.ts:347] [E: packages/ai/src/models.ts:973] [E: packages/ai/src/utils/model-operations.ts:56] [I]。

公开 API 用 `bool`，wire 用 TypeSafe 的 `noul`：翻译集中在 `wireRequest` / `parseAnswers`，三个服务共用，避免每个 transport 自己改问题 schema [E: packages/ai/src/api/system-one-shared.ts:128] [E: packages/ai/src/api/typesafe-system-one.ts:20] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:42] [I]。

OpenRouter 复用 `typesafe-system-one` 而不是第三种 KnownClassifierApi：差异只在 `baseUrl` 与 credential，协议相同 [E: packages/ai/src/providers/openrouter.ts:34] [E: packages/ai/src/api/typesafe-system-one.ts:8] [I]。Cloudflare 需要不同信封，所以才有 `cloudflare-workers-ai-system-one` [E: packages/ai/src/types.ts:35] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:27] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:37]。

## gotcha

- 未限定 type 的读取仍是 chat-only。`getBuiltinModel("typesafe", "jev-latest")` / `Models.getModel("typesafe", "jev-latest")` 读不到 Jev；必须用 `getBuiltinClassifierModel` 或 `getModelOfType("classifier", ...)` [E: packages/ai/src/providers/all.ts:62] [E: packages/ai/src/providers/all.ts:82] [E: packages/ai/src/models.ts:471] [E: packages/ai/test/classifier-models.test.ts:126]。
- `typesafeProvider()` 的 `models` 只有 classifier catalog。`TYPESAFE_MODELS` / `TYPESAFE_IMAGE_MODELS` 仍作为空结构 shard 存在，但 factory 不把它们注册进 runtime [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.models.ts:7] [E: packages/ai/src/providers/typesafe.models.ts:10] [E: packages/ai/test/classifier-models.test.ts:123]。
- lazy wrapper `typesafeSystemOneApi()` / `cloudflareWorkersAISystemOneApi()` 在第一次 `classify` 时才 `import()` 实现模块 [E: packages/ai/src/api/typesafe-system-one.lazy.ts:3] [E: packages/ai/src/api/typesafe-system-one.lazy.ts:5] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts:3] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts:5]。
- `hasApi()` 对非 chat 模型永远 false，即使 `model.api` 字符串碰巧相等 [E: packages/ai/src/models.ts:1183] [E: packages/ai/src/models.ts:1184]。

## 跨包边界

[subsys.ai.model-discovery](model-discovery.md) 拥有 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 三个 generated object 与 `getBuiltinClassifierModel()`。本节点只说明 classifier 行如何进入 `typesafe` / `openrouter` / `cloudflare-workers-ai` 的 runtime `classify` [I]。

[subsys.ai.image-generation](image-generation.md) 是对称的 one-shot 操作（`type: "image"` + `Models.generateImages()`），不走 System One [I]。

coding-agent `ModelRuntime.classify()` 在产品层再包一层 `prepareRequest` 后委派同一个 `provider.classify`；那是 [subsys.coding-agent.model-registry](../coding-agent/model-registry.md) 的 runtime 包装，不改变 `pi-ai` 的 System One 协议 [I]。

## Sources

- packages/ai/src/types.ts
- packages/ai/src/models.ts
- packages/ai/src/utils/model-operations.ts
- packages/ai/src/api/system-one-shared.ts
- packages/ai/src/api/typesafe-system-one.ts
- packages/ai/src/api/typesafe-system-one.lazy.ts
- packages/ai/src/api/cloudflare-workers-ai-system-one.ts
- packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts
- packages/ai/src/api/cloudflare.ts
- packages/ai/src/providers/typesafe.ts
- packages/ai/src/providers/typesafe.models.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/providers/cloudflare-workers-ai.ts
- packages/ai/src/providers/cloudflare-stream.ts
- packages/ai/src/providers/all.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/openrouter-catalog.ts
- packages/ai/test/classifier-models.test.ts

## 相关

- [subsys.ai.model-discovery](model-discovery.md): `CLASSIFIER_MODELS` aggregator、`getBuiltinClassifierModel()`、catalog schema v6。
- [subsys.ai.image-generation](image-generation.md): 对称的 `Models.generateImages()` / `type: "image"` 管线。
- [subsys.ai.provider-registry](provider-registry.md): `builtinProviders()` 含 `typesafeProvider()` 与 `cloudflareWorkersAIProvider()`。
- [ref.ai.model-catalog](../../reference/model-catalog.md): 42 个 structural shard，含 `typesafe.models.ts`。
- [subsys.ai.lazy-loading](lazy-loading.md): classifier lazy wrapper 用动态 `import()`，不是 `lazyApi()` 的 stream 包装。
- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): chat `ProviderStreams.stream`；classifier 不走该 contract。
- [subsys.coding-agent.model-registry](../coding-agent/model-registry.md): 产品层 `ModelRuntime.classify()` 包装，不改变 System One 协议。
