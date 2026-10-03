---
id: subsys.ai.classifiers
title: 结构化分类器（System One / Clef / llama.cpp）
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
  - packages/ai/src/api/llama-cpp-classify.ts
  - packages/ai/src/api/llama-cpp-classify.lazy.ts
  - packages/ai/src/api/cloudflare.ts
  - packages/ai/src/providers/typesafe.ts
  - packages/ai/src/providers/typesafe.models.ts
  - packages/ai/src/providers/openrouter.ts
  - packages/ai/src/providers/opencode.ts
  - packages/ai/src/providers/vercel-ai-gateway.ts
  - packages/ai/src/providers/cloudflare-workers-ai.ts
  - packages/ai/src/providers/cloudflare-stream.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/models.generated.ts
  - packages/ai/scripts/generate-models.ts
  - packages/ai/scripts/openrouter-catalog.ts
  - packages/ai/test/classifier-models.test.ts
  - packages/ai/test/cloudflare-workers-ai-system-one.test.ts
  - packages/ai/test/llama-cpp-classify.test.ts
  - packages/coding-agent/src/extensions/llama/provider.ts
symbols:
  - KnownClassifierApi
  - ClassifierModel
  - ProviderClassifier
  - ClassifierContext
  - ClassifierResult
  - classifySystemOne
  - llamaCppClassifyApi
  - typesafeProvider
related:
  - subsys.ai.model-discovery
  - subsys.ai.image-generation
  - subsys.ai.provider-registry
  - ref.ai.model-catalog
  - ref.ai.wire-protocol-catalog
  - subsys.ai.lazy-loading
  - subsys.ai.wire-protocol-dispatch
  - subsys.coding-agent.model-registry
  - surface.providers.llama-cpp
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `subsys.ai.classifiers` 描述 `pi-ai` 的结构化分类器 runtime：`ClassifierModel` 必有 `type: "classifier"`，经 `Models.classify()` 解析 provider auth 后按 `model.api` 分派。`KnownClassifierApi` 是 **3** 个 key：`typesafe-system-one`、`cloudflare-workers-ai-system-one`、`llama-cpp-classify`。前两个走 System One（公开 `bool` 译成 wire `noul`）；第三个用 llama-server 的 next-token 标签概率，不走 System One。

## 能回答的问题

- `KnownClassifierApi` 有哪些取值，各自绑到哪个 API module？
- `Models.classify()` 怎样按 `model.provider` 找 provider、合并鉴权，并把失败编码成 `ClassifierResult`？
- TypeSafe / OpenRouter / OpenCode Zen / Vercel AI Gateway 的 System One URL 与 payload 信封有何不同？
- Cloudflare Workers AI 上 `typesafe/jev` 与 Clef / Clef Flash 的响应信封差在哪？
- `llama-cpp-classify` 怎样把 `choice` / `bool` / `score` 变成 next-token 标签概率，而不生成文本答案？
- 未限定 type 的 `getModel()` / `getBuiltinModel()` 为什么读不到 Jev / Clef / llama.cpp classifier？

## 职责边界

分类器不是 chat stream，也不是图像生成。`ClassifierModel` 扩展 `BaseModel`，强制 `type: "classifier"`，并带 `contextWindow`；它只给 `classify()` 用 [E: packages/ai/src/types.ts:1153] [E: packages/ai/src/types.ts:1154]。

`KnownClassifierApi` 是 `"typesafe-system-one" | "cloudflare-workers-ai-system-one" | "llama-cpp-classify"`；`ClassifierApi` 允许自定义 string [E: packages/ai/src/types.ts:35] [E: packages/ai/src/types.ts:37]。`ProviderClassifier` 的唯一方法是 `classify(model, context, options?) => Promise<ClassifierResult>` [E: packages/ai/src/types.ts:316] [E: packages/ai/src/types.ts:317]。`ClassifierOptions.temperature` 在归一化前除标签 logits；不能应用的 API 忽略它 [E: packages/ai/src/types.ts:324] [E: packages/ai/src/types.ts:330]。

本节点覆盖分类器类型、`Models.classify()` 鉴权包装、System One 共享协议、Cloudflare Clef 信封，以及 `llama-cpp-classify` 的标签读出。逐 provider 的 `CLASSIFIER_MODELS` bucket 结构归 [subsys.ai.model-discovery](model-discovery.md) 与 [ref.ai.model-catalog](../../reference/model-catalog.md)；chat stream 分派归 [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md)；图像生成归 [subsys.ai.image-generation](image-generation.md)；llama.cpp 产品面（`/llama`、动态 provider）归 [surface.providers.llama-cpp](../../surface/providers/llama-cpp.md)。

## 关键文件

- `packages/ai/src/types.ts`: `KnownClassifierApi`、`ClassifierContext` / `ClassifierQuestion` / `ClassifierResult`、`ClassifierModel` [E: packages/ai/src/types.ts:35] [E: packages/ai/src/types.ts:653] [E: packages/ai/src/types.ts:1153]。
- `packages/ai/src/models.ts`: `Provider.classify`、`Models.classify()`、`createProvider({ classifiers })` [E: packages/ai/src/models.ts:228] [E: packages/ai/src/models.ts:348] [E: packages/ai/src/models.ts:966] [E: packages/ai/src/models.ts:1023]。
- `packages/ai/src/api/system-one-shared.ts`: `classifySystemOne()`、`bool`↔`noul` 翻译、答案解析 [E: packages/ai/src/api/system-one-shared.ts:148] [E: packages/ai/src/api/system-one-shared.ts:175]。
- `packages/ai/src/api/typesafe-system-one.ts`: TypeSafe / OpenRouter / OpenCode / Vercel 共用的 System One transport [E: packages/ai/src/api/typesafe-system-one.ts:8] [E: packages/ai/src/api/typesafe-system-one.ts:20]。
- `packages/ai/src/api/cloudflare-workers-ai-system-one.ts`: Workers AI REST envelope，同时解析 Jev run record 与 Clef 直出 [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:26] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:36] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:46]。
- `packages/ai/src/api/llama-cpp-classify.ts`: llama-server `/tokenize` + `/apply-template` + `/completion` 标签读出 [E: packages/ai/src/api/llama-cpp-classify.ts:425] [E: packages/ai/src/api/llama-cpp-classify.ts:436]。
- `packages/ai/src/providers/typesafe.ts`: `typesafeProvider()` 只挂 classifier models 与 `typesafe-system-one` [E: packages/ai/src/providers/typesafe.ts:6] [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:15]。

## 数据模型

`ClassifierContext` 有 JSON `state` 和 `questions: Record<string, ClassifierQuestion>` [E: packages/ai/src/types.ts:653] [E: packages/ai/src/types.ts:654] [E: packages/ai/src/types.ts:655]。三种公开问题：

| type | 字段 | 源 |
| --- | --- | --- |
| `choice` | `instructions`、`criteria: Record<string, string>` | [E: packages/ai/src/types.ts:633] [E: packages/ai/src/types.ts:634] [E: packages/ai/src/types.ts:635] [E: packages/ai/src/types.ts:636] |
| `score` | `instructions`、`criteria: string[]` | [E: packages/ai/src/types.ts:639] [E: packages/ai/src/types.ts:640] [E: packages/ai/src/types.ts:641] [E: packages/ai/src/types.ts:642] |
| `bool` | `instructions`、`criteria: { true, false }` | [E: packages/ai/src/types.ts:645] [E: packages/ai/src/types.ts:646] [E: packages/ai/src/types.ts:647] [E: packages/ai/src/types.ts:648] |

对应答案：`choice` 带 `choice` / `probabilities` / `confidence`；`score` 带 `score` / `confidence`；`bool` 只带 `probability` [E: packages/ai/src/types.ts:658] [E: packages/ai/src/types.ts:665] [E: packages/ai/src/types.ts:671]。`ClassifierResult.stopReason` 是 `"stop" | "error" | "aborted"` [E: packages/ai/src/types.ts:677] [E: packages/ai/src/types.ts:679]。服务报告 token 时结果可带 `usage`（按 catalog 计价）[E: packages/ai/src/types.ts:685]。

`SystemOneTransport` 把服务差异收成 `api`、`label`、`url(model)`、`payload(model, request)`、`output(body)` [E: packages/ai/src/api/system-one-shared.ts:23] [E: packages/ai/src/api/system-one-shared.ts:25] [E: packages/ai/src/api/system-one-shared.ts:29] [E: packages/ai/src/api/system-one-shared.ts:31] [E: packages/ai/src/api/system-one-shared.ts:33]。`SystemOneWireRequest` 是 `{ state, questions }`，不含服务信封 [E: packages/ai/src/api/system-one-shared.ts:17] [E: packages/ai/src/api/system-one-shared.ts:18] [E: packages/ai/src/api/system-one-shared.ts:19]。

## 控制流

1. `Models.classify@packages/ai/src/models.ts:966` 先 `assertClassifierModel(model)`。chat 模型被当成 classifier 传入时不会 throw 给 caller，而是进 catch 变成 `stopReason: "error"` 的 `ClassifierResult`，errorMessage 含 `"is not a classifier model"` [E: packages/ai/src/models.ts:972] [E: packages/ai/src/models.ts:979] [E: packages/ai/src/utils/model-operations.ts:38] [E: packages/ai/src/utils/model-operations.ts:40] [E: packages/ai/test/classifier-models.test.ts:109] [E: packages/ai/test/classifier-models.test.ts:110] [E: packages/ai/test/classifier-models.test.ts:111]。
2. 随后 `requireProvider(model)` 用 `model.provider` 取 owning provider；没有 `provider.classify` 时抛 `ModelsError("provider", ... does not support classification)`，同样被编码成 error result [E: packages/ai/src/models.ts:824] [E: packages/ai/src/models.ts:973] [E: packages/ai/src/models.ts:974] [E: packages/ai/src/models.ts:975]。
3. `applyAuth` 解析 credential：显式 `options.apiKey` 优先于 resolved auth；headers / env 按 key 合并，caller 覆盖同名 key；若 auth 带 `baseUrl` 则复制 request model 覆盖 `baseUrl` [E: packages/ai/src/models.ts:859] [E: packages/ai/src/models.ts:860] [E: packages/ai/src/models.ts:862] [E: packages/ai/src/models.ts:863]。未配置 auth 抛 `ModelsError("auth", Provider is not configured: ...)` [E: packages/ai/src/models.ts:853] [E: packages/ai/src/models.ts:854]。
4. `createProvider()` 在 `classifiers` map 非空时给 provider 挂 `classify`：按 `model.api` 取 implementation，缺失时返回 `classifierErrorResult` 而不是 reject [E: packages/ai/src/models.ts:1161] [E: packages/ai/src/models.ts:1162] [E: packages/ai/src/models.ts:1163] [E: packages/ai/src/models.ts:1170]。
5. System One 路径：`classifySystemOne@packages/ai/src/api/system-one-shared.ts:175` 校验 `model.api === transport.api` 且 `options.apiKey` 存在，否则进入 catch 写成 error/aborted result [E: packages/ai/src/api/system-one-shared.ts:191] [E: packages/ai/src/api/system-one-shared.ts:192] [E: packages/ai/src/api/system-one-shared.ts:232] [E: packages/ai/src/api/system-one-shared.ts:233]。
6. System One 请求体先走 `wireRequest(context)`：每个 `question.type === "bool"` 被改写成 `{ ...question, type: "noul" }`，`choice` / `score` 原样保留 [E: packages/ai/src/api/system-one-shared.ts:148] [E: packages/ai/src/api/system-one-shared.ts:154]。HTTP 是 `POST` + `Authorization: Bearer` + `content-type: application/json` [E: packages/ai/src/api/system-one-shared.ts:167] [E: packages/ai/src/api/system-one-shared.ts:206] [E: packages/ai/src/api/system-one-shared.ts:207]。
7. 成功后 `parseAnswers` 按问题 id 对齐。`bool` 问题要求 wire `answer.type === "noul"`，再写成 public `{ type: "bool", probability: answer.noul }` [E: packages/ai/src/api/system-one-shared.ts:110] [E: packages/ai/src/api/system-one-shared.ts:114] [E: packages/ai/src/api/system-one-shared.ts:115]。`choice` / `score` 分别要求同名 type [E: packages/ai/src/api/system-one-shared.ts:86] [E: packages/ai/src/api/system-one-shared.ts:87] [E: packages/ai/src/api/system-one-shared.ts:99] [E: packages/ai/src/api/system-one-shared.ts:100]。
8. 默认 `maxRetries` 是 2（与 chat SDK 常见默认一致，但走 `retryProviderRequest` 而不是 OpenAI SDK）[E: packages/ai/src/api/system-one-shared.ts:220]。fetch 默认 `globalThis.fetch`，可被 `options.fetch` 替换 [E: packages/ai/src/api/system-one-shared.ts:197]。
9. llama.cpp 路径不经过 `classifySystemOne`：`classify@packages/ai/src/api/llama-cpp-classify.ts:425` 要求 `model.api === "llama-cpp-classify"`，温度必须为正有限数，然后逐题读 next-token 标签概率 [E: packages/ai/src/api/llama-cpp-classify.ts:436] [E: packages/ai/src/api/llama-cpp-classify.ts:437] [E: packages/ai/src/api/llama-cpp-classify.ts:442] [E: packages/ai/src/api/llama-cpp-classify.ts:447]。

同一 provider+id 的 chat 行与 classifier 行是分开的 catalog 条目：`getModel("test", "shared")` 只返回 chat，`getModelOfType("classifier", "test", "shared")` 返回 classifier [E: packages/ai/test/classifier-models.test.ts:82] [E: packages/ai/test/classifier-models.test.ts:83] [E: packages/ai/test/classifier-models.test.ts:84] [E: packages/ai/src/models.ts:472] [E: packages/ai/src/models.ts:476]。

## TypeSafe 原生 Jev

`typesafeProvider()` 的 id 是 `"typesafe"`，显示名 `"TypeSafe"`，auth 走 `TYPESAFE_API_KEY` [E: packages/ai/src/providers/typesafe.ts:8] [E: packages/ai/src/providers/typesafe.ts:9] [E: packages/ai/src/providers/typesafe.ts:11]。`models` 只取 `Object.values(TYPESAFE_CLASSIFIER_MODELS)`，`classifiers` 只注册 `"typesafe-system-one": typesafeSystemOneApi()` [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.ts:15]。它没有 chat `api` map。

生成器从 `https://models.dev/models.json?type=decision` 读 `typesafe/jev-latest`，写入 `id: "jev-latest"`、`api: "typesafe-system-one"`、`provider: "typesafe"`、`baseUrl: "https://api.typesafe.ai/v1/"`、cost 全 0、`contextWindow` 默认 64000 [E: packages/ai/scripts/generate-models.ts:2677] [E: packages/ai/scripts/generate-models.ts:2680] [E: packages/ai/scripts/generate-models.ts:2687] [E: packages/ai/scripts/generate-models.ts:2689] [E: packages/ai/scripts/generate-models.ts:2690] [E: packages/ai/scripts/generate-models.ts:2691] [E: packages/ai/scripts/generate-models.ts:2695] [E: packages/ai/scripts/generate-models.ts:2696]。

单测断言 `getBuiltinClassifierModel("typesafe", "jev-latest")` 的 `type` / `api` / `provider` / `contextWindow: 64000`；`getBuiltinClassifierModels("typesafe")` 与 `getAllBuiltinModels("typesafe")` 都等于这一条；`builtinModels().getModel("typesafe", "jev-latest")` 是 `undefined` [E: packages/ai/test/classifier-models.test.ts:115] [E: packages/ai/test/classifier-models.test.ts:116] [E: packages/ai/test/classifier-models.test.ts:122] [E: packages/ai/test/classifier-models.test.ts:123] [E: packages/ai/test/classifier-models.test.ts:126]。

TypeSafe transport 的 URL 是 `new URL("systemone", `${baseUrl}/`)`，因此 `https://api.typesafe.ai/v1/` 变成 `https://api.typesafe.ai/v1/systemone`；payload 是 `{ model: model.id, ...request }`，答案取响应顶层（`output` 直接返回 body）[E: packages/ai/src/api/typesafe-system-one.ts:9] [E: packages/ai/src/api/typesafe-system-one.ts:11] [E: packages/ai/src/api/typesafe-system-one.ts:12] [E: packages/ai/src/api/typesafe-system-one.ts:13]。

## 继承 TypeSafe 协议的 Jev（OpenRouter / OpenCode / Vercel）

这三个 builtin 都注册 `classifiers: { "typesafe-system-one": typesafeSystemOneApi() }`，差异只在 `baseUrl` 与 credential，**不**新增 `KnownClassifierApi` [E: packages/ai/src/providers/openrouter.ts:34] [E: packages/ai/src/providers/opencode.ts:26] [E: packages/ai/src/providers/vercel-ai-gateway.ts:16] [I]。

`openrouterProvider()` 把 `OPENROUTER_CLASSIFIER_MODELS` 和 chat / image catalog 一起放进同一个 `models` 数组 [E: packages/ai/src/providers/openrouter.ts:23] [E: packages/ai/src/providers/openrouter.ts:26]。生成器另拉 `?output_modalities=decisions`；`architecture.output_modalities` 含 `"decisions"` 的条目成为 `type: "classifier"`、`api: "typesafe-system-one"`、`provider: "openrouter"`、`baseUrl: "https://openrouter.ai/api/v1"` 的行，因此打到 `https://openrouter.ai/api/v1/systemone` [E: packages/ai/scripts/generate-models.ts:1313] [E: packages/ai/scripts/openrouter-catalog.ts:114] [E: packages/ai/scripts/openrouter-catalog.ts:117] [E: packages/ai/scripts/openrouter-catalog.ts:120] [E: packages/ai/scripts/openrouter-catalog.ts:122] [E: packages/ai/src/api/typesafe-system-one.ts:11]。credential 与 OpenRouter chat / image 共用 `OPENROUTER_API_KEY` 和 lazy OAuth [E: packages/ai/src/providers/openrouter.ts:16] [E: packages/ai/src/providers/openrouter.ts:17]。

`opencodeProvider()` 把硬编码 `OPENCODE_CLASSIFIER_MODELS` 与 chat 拼进 `models`。生成器钉 `jev-1.13` 与 `jev-1.13-free`（`provider: "opencode"`、`baseUrl: "https://opencode.ai/zen/v1"`、`contextWindow: 32000`）[E: packages/ai/src/providers/opencode.ts:18] [E: packages/ai/scripts/generate-models.ts:2712] [E: packages/ai/scripts/generate-models.ts:2715] [E: packages/ai/scripts/generate-models.ts:2718] [E: packages/ai/scripts/generate-models.ts:2719] [E: packages/ai/scripts/generate-models.ts:2726] [E: packages/ai/scripts/generate-models.ts:2729]。URL 变成 `https://opencode.ai/zen/v1/systemone` [E: packages/ai/test/classifier-models.test.ts:132]。

`vercelAIGatewayProvider()` 把 AI Gateway `type === "evaluation"` 的条目写成 `typesafe-system-one`，`baseUrl` 是 `https://ai-gateway.vercel.sh/typesafe/v1`，因此打到 `https://ai-gateway.vercel.sh/typesafe/v1/systemone` [E: packages/ai/src/providers/vercel-ai-gateway.ts:13] [E: packages/ai/scripts/generate-models.ts:229] [E: packages/ai/scripts/generate-models.ts:1369] [E: packages/ai/scripts/generate-models.ts:1374] [E: packages/ai/scripts/generate-models.ts:1376] [E: packages/ai/test/classifier-models.test.ts:131]。单测对这三条路由断言 `getModel(provider, id)` 为 `undefined`，且 `bool` 经 `noul` 映回 [E: packages/ai/test/classifier-models.test.ts:139] [E: packages/ai/test/classifier-models.test.ts:162]。

OpenRouter 逐 id 清单在 gitignored JSON，本节点不枚举 [I]。

## Cloudflare Workers AI Jev 与 Clef

Workers AI 没有未认证 catalog，models.dev 也不列其 System One 模型；生成器硬编码三条 `api: "cloudflare-workers-ai-system-one"`、`provider: "cloudflare-workers-ai"` 的行，并入 `CLASSIFIER_MODELS` [E: packages/ai/scripts/generate-models.ts:2737] [E: packages/ai/scripts/generate-models.ts:3476] [E: packages/ai/scripts/generate-models.ts:3481]：

| id | name | cost.input | contextWindow |
| --- | --- | ---: | ---: |
| `@cf/cloudflare/clef` | Clef | 0.24 | 65536 [E: packages/ai/scripts/generate-models.ts:2744] [E: packages/ai/scripts/generate-models.ts:2745] [E: packages/ai/scripts/generate-models.ts:2750] [E: packages/ai/scripts/generate-models.ts:2751] |
| `@cf/cloudflare/clef-flash` | Clef Flash | 0.09 | 65536 [E: packages/ai/scripts/generate-models.ts:2754] [E: packages/ai/scripts/generate-models.ts:2755] [E: packages/ai/scripts/generate-models.ts:2760] [E: packages/ai/scripts/generate-models.ts:2761] |
| `typesafe/jev` | Jev | 0 | 32000 [E: packages/ai/scripts/generate-models.ts:2765] [E: packages/ai/scripts/generate-models.ts:2766] [E: packages/ai/scripts/generate-models.ts:2771] [E: packages/ai/scripts/generate-models.ts:2773] |

Clef / Clef Flash / Jev 三条硬编码行都广告 `input: ["text"]` [E: packages/ai/scripts/generate-models.ts:2749] [E: packages/ai/scripts/generate-models.ts:2760] [E: packages/ai/scripts/generate-models.ts:2771]。`baseUrl` 是 `CLOUDFLARE_WORKERS_AI_REST_BASE_URL` = `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai` [E: packages/ai/scripts/generate-models.ts:2748] [E: packages/ai/src/api/cloudflare.ts:6] [E: packages/ai/src/api/cloudflare.ts:7]。

`cloudflareWorkersAIProvider()` 把 chat models 与 `CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS` 拼进 `models`，chat 走 `openai-completions`，classifiers 走 `"cloudflare-workers-ai-system-one": cloudflareClassifier(cloudflareWorkersAISystemOneApi())` [E: packages/ai/src/providers/cloudflare-workers-ai.ts:16] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:18] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:20] [E: packages/ai/src/providers/cloudflare-workers-ai.ts:22]。`cloudflareClassifier` 在 classify 前用 env 替换 `{CLOUDFLARE_ACCOUNT_ID}` / `{CLOUDFLARE_GATEWAY_ID}` [E: packages/ai/src/providers/cloudflare-stream.ts:11] [E: packages/ai/src/providers/cloudflare-stream.ts:12] [E: packages/ai/src/providers/cloudflare-stream.ts:31] [E: packages/ai/src/providers/cloudflare-stream.ts:33] [E: packages/ai/src/providers/cloudflare-stream.ts:34]。

Workers AI transport：URL 是 `new URL("run", `${baseUrl}/`)`（即 `.../ai/run`）；payload 是 `{ model: model.id, input: request }` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:29] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:30]。`output()` 先看 Cloudflare 信封：`success === false` 拼 errors；若 `result` 自身带 `answers`（Clef 直出 `{ model, answers, usage }`）就返回 `result`；否则要求第三方 run record `state === "Completed"`，答案取 `result.result` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:33] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:36] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:37] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:41]。`bool`→`noul` 翻译与 TypeSafe 共用 `classifySystemOne` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:46] [E: packages/ai/src/api/system-one-shared.ts:154]。

单测：Jev 走 `{ result: { state, result: jevOutput } }`；Clef / Clef Flash 走 `{ result: clefOutput, success: true }`，并按 `cost.input` 核 usage 计价 [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:82] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:106] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:107] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:108] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:121] [E: packages/ai/test/cloudflare-workers-ai-system-one.test.ts:131]。

## llama-cpp-classify

`llama-cpp-classify` 是第三个 `KnownClassifierApi`。实现不调用 System One：模型不生成答案，每题变成一个 chat prompt，在单 token 标签上读 next-token log-prob，再 softmax [E: packages/ai/src/types.ts:35] [E: packages/ai/src/api/llama-cpp-classify.ts:425] [E: packages/ai/src/api/llama-cpp-classify.ts:436] [E: packages/ai/src/api/llama-cpp-classify.ts:393]。

标签：`choice` 用 `A–Z a–z 0–9`（2–62 项）；`score` 用 `0–9`（2–10 级）；`bool` 用 `Yes` / `No`（keys `true` / `false`）[E: packages/ai/src/api/llama-cpp-classify.ts:39] [E: packages/ai/src/api/llama-cpp-classify.ts:40] [E: packages/ai/src/api/llama-cpp-classify.ts:41] [E: packages/ai/src/api/llama-cpp-classify.ts:105] [E: packages/ai/src/api/llama-cpp-classify.ts:113] [E: packages/ai/src/api/llama-cpp-classify.ts:119]。超出范围在发请求前失败 [E: packages/ai/src/api/llama-cpp-classify.ts:442] [E: packages/ai/test/llama-cpp-classify.test.ts:320] [E: packages/ai/test/llama-cpp-classify.test.ts:321]。

`renderQuestion` 把 state、整份 overview、再一份 state、然后带标签的本题拼进 user message，使各题共享 prompt prefix（服务端 prompt cache 只评一次）[E: packages/ai/src/api/llama-cpp-classify.ts:170] [E: packages/ai/src/api/llama-cpp-classify.ts:176] [E: packages/ai/src/api/llama-cpp-classify.ts:447]。HTTP 打 llama-server 根（`llamaServerRoot` 去掉 trailing slash 与末尾 `/v1`）：`/tokenize`、`/apply-template`（`enable_thinking: false`）、`/completion`（`n_predict: 1`、`post_sampling_probs: false`、`cache_prompt: true`）[E: packages/ai/src/api/llama-cpp-classify.ts:95] [E: packages/ai/src/api/llama-cpp-classify.ts:347] [E: packages/ai/src/api/llama-cpp-classify.ts:371] [E: packages/ai/src/api/llama-cpp-classify.ts:372] [E: packages/ai/src/api/llama-cpp-classify.ts:373] [E: packages/ai/src/api/llama-cpp-classify.ts:375]。模板若以 `<think>` 结尾会立刻补 `</think>`，让下一 token 是答案而不是推理 [E: packages/ai/src/api/llama-cpp-classify.ts:355]。

读出深度先 `max(256, 16 * labels)`，缺标签再试 4096、32768；仍缺则 error，不把缺失标签当成零概率 [E: packages/ai/src/api/llama-cpp-classify.ts:44] [E: packages/ai/src/api/llama-cpp-classify.ts:47] [E: packages/ai/src/api/llama-cpp-classify.ts:405] [E: packages/ai/test/llama-cpp-classify.test.ts:247] [E: packages/ai/test/llama-cpp-classify.test.ts:253]。`temperature` 默认 1，除 log-prob 后再 softmax；非正数在发请求前失败 [E: packages/ai/src/api/llama-cpp-classify.ts:180] [E: packages/ai/src/api/llama-cpp-classify.ts:437] [E: packages/ai/test/llama-cpp-classify.test.ts:222] [E: packages/ai/test/llama-cpp-classify.test.ts:234]。choice/score 的 `confidence` 用 TypeSafe 文档公式 `(n * peak - 1) / (n - 1)` [E: packages/ai/src/api/llama-cpp-classify.ts:189] [E: packages/ai/src/api/llama-cpp-classify.ts:204]。bool 答案是 `Yes` 标签的概率，**不**经过 `noul` [E: packages/ai/src/api/llama-cpp-classify.ts:201] [E: packages/ai/src/api/llama-cpp-classify.ts:202]。`onPayload` / `onResponse` 只包 `/completion`（`observe: true`），tokenize / apply-template 不观察 [E: packages/ai/src/api/llama-cpp-classify.ts:230] [E: packages/ai/src/api/llama-cpp-classify.ts:288] [E: packages/ai/src/api/llama-cpp-classify.ts:377]。

`llama.cpp` **不是** `builtinProviders()` 的静态 provider。coding-agent 内置扩展 `createLlamaProvider()` 给每个 selectable chat 模型合成一条同 id 的 `ClassifierModel<"llama-cpp-classify">`：chat `baseUrl` 是 `llamaInferenceUrl(serverUrl)`（`…/v1`），classifier `baseUrl` 是 server root；`classify` 委托 `llamaCppClassifyApi()` [E: packages/coding-agent/src/extensions/llama/provider.ts:12] [E: packages/coding-agent/src/extensions/llama/provider.ts:84] [E: packages/coding-agent/src/extensions/llama/provider.ts:89] [E: packages/coding-agent/src/extensions/llama/provider.ts:91] [E: packages/coding-agent/src/extensions/llama/provider.ts:111] [E: packages/coding-agent/src/extensions/llama/provider.ts:149] [E: packages/coding-agent/src/extensions/llama/provider.ts:262]。42 个 generated shard **没有** `llama.cpp.models.ts`；运行时 catalog 由扩展 refresh 持久化 chat+classifier 两行 [E: packages/ai/src/models.generated.ts:265] [I]。产品入口（`/llama`、`/model`）见 [surface.providers.llama-cpp](../../surface/providers/llama-cpp.md)。

## 设计动机与权衡

`Models.classify()` 与 `Models.generateImages()` 一样 never reject：未知 provider、未配置 auth、错误 type 都变成带 `stopReason` 的 result，让上层按统一 shape 处理 [E: packages/ai/src/models.ts:348] [E: packages/ai/src/models.ts:979] [E: packages/ai/src/utils/model-operations.ts:56] [I]。

公开 API 用 `bool`，System One wire 用 TypeSafe 的 `noul`：翻译集中在 `wireRequest` / `parseAnswers`，TypeSafe 与 Cloudflare 共用，避免每个 transport 自己改问题 schema [E: packages/ai/src/api/system-one-shared.ts:154] [E: packages/ai/src/api/typesafe-system-one.ts:20] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:46] [I]。llama.cpp 不走这条翻译：它用 `Yes`/`No` 标签概率直接填 `ClassifierBoolAnswer.probability` [E: packages/ai/src/api/llama-cpp-classify.ts:201] [I]。

OpenRouter / OpenCode / Vercel 复用 `typesafe-system-one` 而不是新的 KnownClassifierApi：差异只在 `baseUrl` 与 credential [E: packages/ai/src/providers/openrouter.ts:34] [E: packages/ai/src/api/typesafe-system-one.ts:8] [I]。Cloudflare 需要不同信封（Jev run record vs Clef 直出），所以才有 `cloudflare-workers-ai-system-one` [E: packages/ai/src/types.ts:35] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:30] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:36]。llama.cpp 是完全不同的本地读出协议，所以是第三个 key [E: packages/ai/src/api/llama-cpp-classify.ts:425] [I]。

## gotcha

- 未限定 type 的读取仍是 chat-only。`getBuiltinModel("typesafe", "jev-latest")` / `Models.getModel("typesafe", "jev-latest")` 读不到 Jev；Clef / OpenRouter decisions / llama.cpp classifier 同样必须 `getBuiltinClassifierModel` 或 `getModelOfType("classifier", ...)` [E: packages/ai/src/providers/all.ts:62] [E: packages/ai/src/providers/all.ts:82] [E: packages/ai/src/models.ts:472] [E: packages/ai/test/classifier-models.test.ts:126]。
- `typesafeProvider()` 的 `models` 只有 classifier catalog。`TYPESAFE_MODELS` / `TYPESAFE_IMAGE_MODELS` 仍作为空结构 shard 存在，但 factory 不把它们注册进 runtime [E: packages/ai/src/providers/typesafe.ts:13] [E: packages/ai/src/providers/typesafe.models.ts:7] [E: packages/ai/src/providers/typesafe.models.ts:10] [E: packages/ai/test/classifier-models.test.ts:123]。
- lazy wrapper `typesafeSystemOneApi()` / `cloudflareWorkersAISystemOneApi()` / `llamaCppClassifyApi()` 在第一次 `classify` 时才 `import()` 实现模块 [E: packages/ai/src/api/typesafe-system-one.lazy.ts:3] [E: packages/ai/src/api/typesafe-system-one.lazy.ts:5] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts:3] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts:5] [E: packages/ai/src/api/llama-cpp-classify.lazy.ts:3] [E: packages/ai/src/api/llama-cpp-classify.lazy.ts:5]。
- `hasApi()` 对非 chat 模型永远 false，即使 `model.api` 字符串碰巧相等 [E: packages/ai/src/models.ts:1189] [E: packages/ai/src/models.ts:1190]。
- Cloudflare `output()` 用 `"answers" in result` 区分 Clef 直出与 Jev run record；把 Clef 响应误当成 run record 会去读不存在的 `state` [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:36] [E: packages/ai/src/api/cloudflare-workers-ai-system-one.ts:37]。
- llama.cpp classifier 的 `baseUrl` 是 server root，chat 的 `baseUrl` 是 `…/v1`。`llamaServerRoot` 仍会剥掉末尾 `/v1`，所以两种 URL 都能打到 `/tokenize` [E: packages/coding-agent/src/extensions/llama/provider.ts:91] [E: packages/coding-agent/src/extensions/llama/provider.ts:111] [E: packages/ai/src/api/llama-cpp-classify.ts:95] [E: packages/ai/test/llama-cpp-classify.test.ts:382]。

## 跨包边界

[subsys.ai.model-discovery](model-discovery.md) 拥有 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 三个 generated object 与 `getBuiltinClassifierModel()`。本节点只说明 classifier 行如何进入 TypeSafe / OpenRouter / OpenCode / Vercel / Cloudflare 的 runtime `classify`，以及 llama.cpp 动态行如何绑 `llama-cpp-classify` [I]。

[ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md) 枚举 10 个 chat `KnownApi` + 1 个 `KnownImageApi` + **3** 个 `KnownClassifierApi`；本节点解释 classifier 三个 key 的 payload [I]。

[subsys.ai.image-generation](image-generation.md) 是对称的 one-shot 操作（`type: "image"` + `Models.generateImages()`），不走 System One 或 llama.cpp 读出 [I]。

coding-agent `ModelRuntime.classify()` 在产品层再包一层 `prepareRequest` 后委派同一个 `provider.classify`；那是 [subsys.coding-agent.model-registry](../coding-agent/model-registry.md) 的 runtime 包装，不改变 `pi-ai` 的协议 [I]。llama.cpp 动态 provider 装配见 [surface.providers.llama-cpp](../../surface/providers/llama-cpp.md)。

## Sources

- packages/ai/src/types.ts
- packages/ai/src/models.ts
- packages/ai/src/utils/model-operations.ts
- packages/ai/src/api/system-one-shared.ts
- packages/ai/src/api/typesafe-system-one.ts
- packages/ai/src/api/typesafe-system-one.lazy.ts
- packages/ai/src/api/cloudflare-workers-ai-system-one.ts
- packages/ai/src/api/cloudflare-workers-ai-system-one.lazy.ts
- packages/ai/src/api/llama-cpp-classify.ts
- packages/ai/src/api/llama-cpp-classify.lazy.ts
- packages/ai/src/api/cloudflare.ts
- packages/ai/src/providers/typesafe.ts
- packages/ai/src/providers/typesafe.models.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/providers/opencode.ts
- packages/ai/src/providers/vercel-ai-gateway.ts
- packages/ai/src/providers/cloudflare-workers-ai.ts
- packages/ai/src/providers/cloudflare-stream.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/models.generated.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/scripts/openrouter-catalog.ts
- packages/ai/test/classifier-models.test.ts
- packages/ai/test/cloudflare-workers-ai-system-one.test.ts
- packages/ai/test/llama-cpp-classify.test.ts
- packages/coding-agent/src/extensions/llama/provider.ts

## 相关

- [subsys.ai.model-discovery](model-discovery.md): `CLASSIFIER_MODELS` aggregator、`getBuiltinClassifierModel()`、catalog schema v6、Clef / OpenCode 硬编码行。
- [subsys.ai.image-generation](image-generation.md): 对称的 `Models.generateImages()` / `type: "image"` 管线。
- [subsys.ai.provider-registry](provider-registry.md): `builtinProviders()` 含 `typesafeProvider()` 与 `cloudflareWorkersAIProvider()`。
- [ref.ai.model-catalog](../../reference/model-catalog.md): 42 个 structural shard；Clef / OpenCode Jev 硬编码 id；`llama-cpp-classify` 不在 shard 里。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md): 10 chat + 1 image + 3 classifier API key。
- [subsys.ai.lazy-loading](lazy-loading.md): classifier lazy wrapper 用动态 `import()`，不是 `lazyApi()` 的 stream 包装。
- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): chat `ProviderStreams.stream`；classifier 不走该 contract。
- [subsys.coding-agent.model-registry](../coding-agent/model-registry.md): 产品层 `ModelRuntime.classify()` 包装，不改变 System One / llama.cpp 协议。
- [surface.providers.llama-cpp](../../surface/providers/llama-cpp.md): coding-agent 动态 `llama.cpp` provider 如何为每个 chat 模型合成 classifier 行。
