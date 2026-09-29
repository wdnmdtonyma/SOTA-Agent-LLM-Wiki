---
id: model-layer.provider-registry-v1
title: Provider Registry V1
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/provider/provider.ts, packages/schema/src/provider.ts, packages/schema/src/model.ts, packages/llm/src/schema/ids.ts, packages/core/src/provider.ts, packages/core/src/model.ts, packages/opencode/src/plugin/index.ts, packages/opencode/src/plugin/modal/modal.ts, packages/opencode/src/plugin/modal/models.ts, packages/opencode/test/plugin/modal-models.test.ts, packages/opencode/src/plugin/azure.ts, packages/opencode/src/plugin/openai/codex.ts, packages/core/src/plugin/provider/cloudflare-ai-gateway.ts, packages/core/src/models-dev.ts, packages/core/src/v1/config/provider.ts, packages/opencode/src/provider/transform.ts, packages/core/src/aisdk.ts]
symbols: [Provider.Service, BUNDLED_PROVIDERS, fromModelsDevProvider, resolveSDK, getLanguage, ModalPlugin, ModalModels.get, googleVertexEndpoint, cloudflareGatewayNpm, wrapSSE, AzureAuthPlugin]
related: [provider.resolution, ref.ai-sdk-provider-map]
evidence: explicit
status: verified
updated: 7945de2089
---

> V1 provider registry 是 `packages/opencode/src/provider/provider.ts` 里的 AI SDK provider/model resolver：它从 models.dev catalog、config、env、auth、plugin hooks 和 provider-specific custom loader 合成 `Provider.Info` / `Provider.Model`，再按 model 的 npm package 创建或缓存 `LanguageModelV3`。

## 能回答的问题

- V1 provider registry 的数据源按什么顺序 merge？
- bundled AI SDK provider 与动态 npm provider 如何加载？
- `googleVertexEndpoint`、Cloudflare AI Gateway 三分路由、`cloudflareGatewayNpm()`、Azure OAuth `accountId` 各做什么？
- `hook.provider.models` 还在解析链上吗？Azure 还注册吗？
- `headerTimeout` / `chunkTimeout` 的全局默认与 `false` 语义是什么？
- config/env/auth/plugin 如何影响 provider 可见性和 model variants？
- V1 `Provider.Model` 与 V2 `ModelV2.Info` 是否同一个类型？

## 命名边界

V1 的 `Provider.Service` interface 暴露 `getProvider(): Info`、`getModel(): Model`、`getLanguage(): LanguageModelV3`。[E: packages/opencode/src/provider/provider.ts:1248][E: packages/opencode/src/provider/provider.ts:1249][E: packages/opencode/src/provider/provider.ts:1250] 这不是 `packages/llm` 的 native `ProviderID/ModelID`，也不是 V2 core 的 `ProviderV2.Info` / `ModelV2.Info`。[E: packages/llm/src/schema/ids.ts:14][E: packages/llm/src/schema/ids.ts:17][E: packages/schema/src/provider.ts:53][E: packages/schema/src/model.ts:60]

V1 当前活跑主线是 Vercel AI SDK path，所以这个 registry 是默认 provider path；`packages/llm` 是可选 native protocol engine seam。[I]

## 输入与 Catalog 转换

`fromModelsDevModel` 会把 models.dev api/status/cost/limits/capabilities 等字段投影到 V1 model，然后优先调用 `ProviderTransform.reasoningVariants(model, base)`；它返回 `undefined` 时才回退 `ProviderTransform.variants(base)`。[E: packages/opencode/src/provider/provider.ts:1316][E: packages/opencode/src/provider/provider.ts:1365][E: packages/opencode/src/provider/transform.ts:1717][E: packages/opencode/src/provider/transform.ts:1718]

`api.npm` 先走 `cloudflareGatewayNpm(provider.id, model.id)`：仅 `cloudflare-ai-gateway` 上，`openai/*` → `@ai-sdk/openai`，`anthropic/*` → `@ai-sdk/anthropic`，其它返回 `undefined` 再 fallback catalog/provider npm。这样 reasoning variants 在计算前已经对着 native SDK。[E: packages/opencode/src/provider/provider.ts:1309][E: packages/opencode/src/provider/provider.ts:1310][E: packages/opencode/src/provider/provider.ts:1311][E: packages/opencode/src/provider/provider.ts:1326]

models.dev/config 的 `interleaved` 兼容 boolean、field object 与 string shorthand；registry 把 string 统一投影为 `{ field }`。field schema 保留三个已知字面量，同时接受任意 string，所以 provider catalog 新增字段名不必先改 registry schema。[E: packages/core/src/models-dev.ts:18][E: packages/core/src/models-dev.ts:19][E: packages/core/src/models-dev.ts:20][E: packages/core/src/models-dev.ts:77][E: packages/core/src/models-dev.ts:78][E: packages/core/src/models-dev.ts:80][E: packages/core/src/v1/config/provider.ts:8][E: packages/core/src/v1/config/provider.ts:9][E: packages/core/src/v1/config/provider.ts:10][E: packages/core/src/v1/config/provider.ts:22][E: packages/core/src/v1/config/provider.ts:23][E: packages/core/src/v1/config/provider.ts:25][E: packages/opencode/src/provider/provider.ts:1359]

`fromModelsDevProvider()` 把 `experimental.modes` 展开成 `model-id-mode` 变体；mode body 经 `modeOptions()` 转 camelCase，`@ai-sdk/openai` 的 `{ reasoning: { mode } }` 特别转成 `{ reasoningMode }`，避免把 nested `reasoning` 原样传给 SDK。[E: packages/opencode/src/provider/provider.ts:1377][E: packages/opencode/src/provider/provider.ts:1378][E: packages/opencode/src/provider/provider.ts:1385][E: packages/opencode/src/provider/provider.ts:1386][E: packages/opencode/src/provider/provider.ts:1400][E: packages/opencode/src/provider/provider.ts:1403][E: packages/opencode/src/provider/provider.ts:1406][E: packages/opencode/src/provider/provider.ts:1408]

本节点不枚举 live zen/go model ID；registry 的模型集合来自 `modelsDevSvc.get()` 的远程/缓存 JSON。[I]

## Vertex / Cloudflare / Azure custom loaders

`googleVertexEndpoint(location)` 按 location 分成三路 host：`global` → `aiplatform.googleapis.com`；`eu`/`us` → `aiplatform.{location}.rep.googleapis.com`（REP）；其它 region → `{location}-aiplatform.googleapis.com`。[E: packages/opencode/src/provider/provider.ts:136][E: packages/opencode/src/provider/provider.ts:137][E: packages/opencode/src/provider/provider.ts:138][E: packages/opencode/src/provider/provider.ts:139] `google-vertex` loader 把该 host 写入 `GOOGLE_VERTEX_ENDPOINT` var。[E: packages/opencode/src/provider/provider.ts:571] `google-vertex-anthropic` 另用 `googleVertexAnthropicBaseURL()`：只有 `eu`/`us` 才生成 REP Anthropic publisher URL。[E: packages/opencode/src/provider/provider.ts:129][E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:133]

`cloudflare-ai-gateway` custom `getModel` 按 model id 前缀三分路由，**不是**一律 `createUnified({ apiKey })`：`openai/*` → native OpenAI passthrough；`anthropic/*` → native Anthropic，点号版本 `replaceAll(".", "-")`；`workers-ai/` / `@cf/` → `createUnified({ apiKey: apiToken })`（唯一向上游传 CF token）；其它第三方 → `createOpenAICompatible` + REST `cf-aig-gateway-id`。[E: packages/opencode/src/provider/provider.ts:902][E: packages/opencode/src/provider/provider.ts:907][E: packages/opencode/src/provider/provider.ts:916][E: packages/opencode/src/provider/provider.ts:917][E: packages/opencode/src/provider/provider.ts:925] 该 loader 自己组 client，必须显式 `timeoutFetch`：`gatewayFetch = timeoutFetch(options ?? {})`，`createAiGateway({ binding: { run } })` 用 timeout-aware fetch POST gateway URL，REST 路径 `fetch: gatewayFetch`。[E: packages/opencode/src/provider/provider.ts:96][E: packages/opencode/src/provider/provider.ts:878][E: packages/opencode/src/provider/provider.ts:882][E: packages/opencode/src/provider/provider.ts:888][E: packages/opencode/src/provider/provider.ts:930]

V2 Core `CloudflareAIGatewayPlugin` **没有** mirror 这套三分路由：它只对 Workers AI (`workers-ai/` / `@cf/`) 把 token 传给 `createUnified({ apiKey })`，其它模型 `createUnified({})`。[E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:27][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:34][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:35]

Azure custom loader 的 resource 优先级：`provider.options.resourceName` → API auth `metadata.resourceName` → **OAuth `auth.accountId`** → `AZURE_RESOURCE_NAME`。[E: packages/opencode/src/provider/provider.ts:286][E: packages/opencode/src/provider/provider.ts:287][E: packages/opencode/src/provider/provider.ts:288][E: packages/opencode/src/provider/provider.ts:289] Azure CLI OAuth 成功时把用户输入的 `resourceName`（或已有 `AZURE_RESOURCE_NAME`）存进 `accountId`。[E: packages/opencode/src/plugin/azure.ts:89][E: packages/opencode/src/plugin/azure.ts:98]

`AzureAuthPlugin` **不再**注册 `hook.provider.models`，也没有 `discoverAzureModels` / Cognitive Services account 或 deployment 自动发现。OAuth 只剩手动 `resourceName` text prompt；未装 `az` 仍隐藏 OAuth。[E: packages/opencode/src/plugin/azure.ts:46][E: packages/opencode/src/plugin/azure.ts:54][E: packages/opencode/src/plugin/azure.ts:80][E: packages/opencode/src/plugin/azure.ts:107]

## Modal 动态模型发现

`ModalPlugin` 已加入内建 plugin 列表；和其他默认插件一样，整体仍受 `disableDefaultPlugins` 控制。它只在存在 API auth（或 `MODAL_PROXY_TOKEN`）且 catalog 的第一个 model 有 URL 时工作；hook 在 config provider 扩展之前执行，所以本轮 config 后补 URL 不能触发 discovery。失败时 catch 返回空模型集，不抛出初始化错误；该空集只替换从静态 catalog JSON round-trip 得到的 registry working database copy，静态 catalog 及其 models 保留。若 config 随后也没有向 working copy 补回 model，最终 active-provider 过滤会删除 Modal。[E: packages/opencode/src/plugin/index.ts:67][E: packages/opencode/src/plugin/index.ts:75][E: packages/opencode/src/plugin/index.ts:170][E: packages/opencode/src/plugin/modal/modal.ts:4][E: packages/opencode/src/plugin/modal/modal.ts:7][E: packages/opencode/src/plugin/modal/modal.ts:9][E: packages/opencode/src/plugin/modal/modal.ts:10][E: packages/opencode/src/plugin/modal/modal.ts:11][E: packages/opencode/src/plugin/modal/modal.ts:13][E: packages/opencode/src/provider/provider.ts:1505][E: packages/opencode/src/provider/provider.ts:1508][E: packages/opencode/src/provider/provider.ts:1517][E: packages/opencode/src/provider/provider.ts:1518]

发现器向 `${baseURL}/models` 发 Bearer 请求，超时 3 秒；每个返回项以 `base_model_id ?? hugging_face_id ?? id` 先选第一个非 nullish key，再只做一次 template lookup——key 未命中时不会继续尝试后备 ID。随后它合成 API、价格、limit、modalities/tool/reasoning/interleaved capability。数值报价乘 1,000,000 进入 catalog 单位；显式 `reasoning_options` 转为 `reasoningEffort` variants，字段缺失才继承 template variants。[E: packages/opencode/src/plugin/modal/models.ts:47][E: packages/opencode/src/plugin/modal/models.ts:50][E: packages/opencode/src/plugin/modal/models.ts:51][E: packages/opencode/src/plugin/modal/models.ts:55][E: packages/opencode/src/plugin/modal/models.ts:63][E: packages/opencode/src/plugin/modal/models.ts:69][E: packages/opencode/src/plugin/modal/models.ts:77][E: packages/opencode/src/plugin/modal/models.ts:85][E: packages/opencode/src/plugin/modal/models.ts:90][E: packages/opencode/src/plugin/modal/models.ts:113][E: packages/opencode/src/plugin/modal/models.ts:117][E: packages/opencode/src/plugin/modal/models.ts:118]

`internalPlugins()` 还注册 `CerebrasPlugin`（V1 plugin，不是新 tool）。[E: packages/opencode/src/plugin/index.ts:84]

## Merge Pipeline

1. registry 初始化时读取 config、models.dev、runtime flags，并建立 providers、language model cache、modelLoaders、varsLoaders、sdk cache、discoveryLoaders。[E: packages/opencode/src/provider/provider.ts:1440][E: packages/opencode/src/provider/provider.ts:1444][E: packages/opencode/src/provider/provider.ts:1448][E: packages/opencode/src/provider/provider.ts:1449][E: packages/opencode/src/provider/provider.ts:1455][E: packages/opencode/src/provider/provider.ts:1459][E: packages/opencode/src/provider/provider.ts:1460][E: packages/opencode/src/provider/provider.ts:1461][E: packages/opencode/src/provider/provider.ts:1467][E: packages/opencode/src/provider/provider.ts:1468]

2. `mergeProvider` 先尝试覆盖已有 provider，否则从 models.dev database 找基础 provider 再 deep merge patch。[E: packages/opencode/src/provider/provider.ts:1478][E: packages/opencode/src/provider/provider.ts:1479][E: packages/opencode/src/provider/provider.ts:1482][E: packages/opencode/src/provider/provider.ts:1485][E: packages/opencode/src/provider/provider.ts:1488]

3. registry 先 `plugin.list()`，随后才读取 `cfg.provider`，让 plugin-derived config 有机会参与 provider config 解析。[E: packages/opencode/src/provider/provider.ts:1492][E: packages/opencode/src/provider/provider.ts:1495]

4. config 里的 disabled/enabled provider 被读成集合，`isProviderAllowed` 同时检查 whitelist 与 disabled list。[E: packages/opencode/src/provider/provider.ts:1496][E: packages/opencode/src/provider/provider.ts:1497][E: packages/opencode/src/provider/provider.ts:1499][E: packages/opencode/src/provider/provider.ts:1500][E: packages/opencode/src/provider/provider.ts:1501]

5. plugin provider model hook 可以替换 database 中已有 provider 的 models，并接收 public provider info 与 plugin auth。[E: packages/opencode/src/provider/provider.ts:1505][E: packages/opencode/src/provider/provider.ts:1506][E: packages/opencode/src/provider/provider.ts:1507][E: packages/opencode/src/provider/provider.ts:1513][E: packages/opencode/src/provider/provider.ts:1518] 解析链仍遍历 `hook.provider.models`。Azure plugin 不再注册该 hook；Codex 仍用它过滤 OAuth GPT 模型。Codex `ALLOWED_MODELS` 含 `gpt-5.5`、`gpt-5.3-codex-spark`、`gpt-5.4`、`gpt-5.4-mini`、`gpt-6-sol`、`gpt-6-luna`；`DISALLOWED_MODELS` 含 `gpt-5.5-pro`。[E: packages/opencode/src/plugin/azure.ts:54][E: packages/opencode/src/plugin/openai/codex.ts:15][E: packages/opencode/src/plugin/openai/codex.ts:16][E: packages/opencode/src/plugin/openai/codex.ts:297] `toPublicInfo()` 在 JSON-safe 序列化前还会删掉不通过 V1 `Model` schema 的 model entry，避免非法 shape 进入 public hook 输入。[E: packages/opencode/src/provider/provider.ts:1172][E: packages/opencode/src/provider/provider.ts:1177]

6. config provider 会扩展 database：provider-level name/env/options/source/models，model-level api/capabilities/cost/options/limit/header/family/release_date 重新合成。若 npm package 与 catalog model 相同就保留 catalog variants，换 package 才重算 heuristic，之后再 merge config variants。[E: packages/opencode/src/provider/provider.ts:1619][E: packages/opencode/src/provider/provider.ts:1620][E: packages/opencode/src/provider/provider.ts:1622][E: packages/opencode/src/provider/provider.ts:1623][E: packages/opencode/src/provider/provider.ts:1624] config-defined gateway model 会再跑 `cloudflareGatewayNpm(providerID, apiID)`。[E: packages/opencode/src/provider/provider.ts:1553]

7. env activation 会在 provider.env 中找第一个存在的 env var；只有 provider.env 长度为 1 时才把该值写成 provider key。auth provider key 来自 `Auth.all()` 里 type 为 `api` 的条目。[E: packages/opencode/src/provider/provider.ts:1634][E: packages/opencode/src/provider/provider.ts:1638][E: packages/opencode/src/provider/provider.ts:1642][E: packages/opencode/src/provider/provider.ts:1647][E: packages/opencode/src/provider/provider.ts:1651][E: packages/opencode/src/provider/provider.ts:1654]

8. plugin auth loader 与 custom loaders 可以补 options、modelLoaders、varsLoaders、discoverModels，之后 config provider patch 会再应用一次。[E: packages/opencode/src/provider/provider.ts:1660][E: packages/opencode/src/provider/provider.ts:1667][E: packages/opencode/src/provider/provider.ts:1676][E: packages/opencode/src/provider/provider.ts:1680][E: packages/opencode/src/provider/provider.ts:1689][E: packages/opencode/src/provider/provider.ts:1691][E: packages/opencode/src/provider/provider.ts:1699]

9. 最终过滤会删除 disabled/未 allowed provider，删除特定 GPT chat alias、alpha/deprecated model、blacklist/whitelist model，仅对 `variants === undefined` 的 model 补 heuristic variants，并删除空 provider。[E: packages/opencode/src/provider/provider.ts:1722][E: packages/opencode/src/provider/provider.ts:1724][E: packages/opencode/src/provider/provider.ts:1737][E: packages/opencode/src/provider/provider.ts:1744][E: packages/opencode/src/provider/provider.ts:1745][E: packages/opencode/src/provider/provider.ts:1752][E: packages/opencode/src/provider/provider.ts:1756][E: packages/opencode/src/provider/provider.ts:1766]

## AI SDK 加载

`BUNDLED_PROVIDERS` 是 V1 内置 AI SDK factory map，包含 Anthropic/OpenAI/Azure/Google/Bedrock/OpenRouter/GitLab/GitHub Copilot/Venice 等 npm entry；`gitlab-ai-provider` 仍在 map 里，本 range 无新增 npm key。[E: packages/opencode/src/provider/provider.ts:148][E: packages/opencode/src/provider/provider.ts:171][E: packages/opencode/src/provider/provider.ts:174] 对 GitHub Copilot，内置 loader 不是第三方包，而是从 `@opencode-ai/core/github-copilot/copilot-provider` 导入 `createOpenaiCompatible`。[E: packages/opencode/src/provider/provider.ts:172][E: packages/opencode/src/provider/provider.ts:173]

`resolveSDK` 合成 provider options：处理 Google Vertex Anthropic baseURL、openai-compatible includeUsage、baseURL env interpolation、apiKey、model headers，再按 providerID/npm/options hash 做 SDK cache。[E: packages/opencode/src/provider/provider.ts:1785][E: packages/opencode/src/provider/provider.ts:1790][E: packages/opencode/src/provider/provider.ts:1799][E: packages/opencode/src/provider/provider.ts:1806][E: packages/opencode/src/provider/provider.ts:1832][E: packages/opencode/src/provider/provider.ts:1833][E: packages/opencode/src/provider/provider.ts:1839][E: packages/opencode/src/provider/provider.ts:1846][E: packages/opencode/src/provider/provider.ts:1849]

文件顶层 `timeoutFetch(options)` 对走 `resolveSDK` 的 provider 生效：`options["fetch"] = timeoutFetch(options)`，默认 `chunkTimeout ?? 300_000`、`headerTimeout ?? 300_000`。[E: packages/opencode/src/provider/provider.ts:96][E: packages/opencode/src/provider/provider.ts:98][E: packages/opencode/src/provider/provider.ts:99][E: packages/opencode/src/provider/provider.ts:1849] V1 schema 里两者都是 `PositiveInt | false`，文档写 default 300000。[E: packages/core/src/v1/config/provider.ts:108][E: packages/core/src/v1/config/provider.ts:117] `headerTimeout === false` 关闭 header timeout；`chunkTimeout` 不是正数（含 `false`）则不 wrap SSE。[E: packages/opencode/src/provider/provider.ts:105][E: packages/opencode/src/provider/provider.ts:106] SSE 超时后 `reader.cancel(err).catch(() => {})`。[E: packages/opencode/src/provider/provider.ts:49][E: packages/core/src/aisdk.ts:38] Core `aisdk.ts` **没有** 300s 默认：`chunkTimeout = options.chunkTimeout`，未设就不 wrap。[E: packages/core/src/aisdk.ts:83] Cloudflare AI Gateway custom loader 不经 `resolveSDK` 的 fetch 赋值，必须自己 `timeoutFetch`。[E: packages/opencode/src/provider/provider.ts:878]

如果 npm 在 `BUNDLED_PROVIDERS` 中，registry 调 bundled factory；否则通过 `Npm.add(model.api.npm)` 安装/解析 entrypoint，动态 import 后取第一个以 `create` 开头的 export 创建 SDK。[E: packages/opencode/src/provider/provider.ts:1853][E: packages/opencode/src/provider/provider.ts:1854][E: packages/opencode/src/provider/provider.ts:1868][E: packages/opencode/src/provider/provider.ts:1876][E: packages/opencode/src/provider/provider.ts:1878]

`getLanguage` 以 `providerID/model.id` 缓存 `LanguageModelV3`；有 custom modelLoader 时用 loader，否则调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1918][E: packages/opencode/src/provider/provider.ts:1921]

## Custom Loader 设计动机

custom loader 是 provider-specific escape hatch，类型允许返回 `getModel`、vars、options、discoverModels，并通过 `autoload` 控制是否自动激活 provider。[E: packages/opencode/src/provider/provider.ts:177][E: packages/opencode/src/provider/provider.ts:178][E: packages/opencode/src/provider/provider.ts:180][E: packages/opencode/src/provider/provider.ts:181][E: packages/opencode/src/provider/provider.ts:185]

典型例子：

- Anthropic 注入 `anthropic-beta` header。[E: packages/opencode/src/provider/provider.ts:177][E: packages/opencode/src/provider/provider.ts:181]
- OpenAI 默认取 `sdk.responses(modelID)`，custom options 仍写 `headerTimeout: OPENAI_HEADER_TIMEOUT_DEFAULT`（300000）；`timeoutFetch` 对 `resolveSDK` 路径默认同一值。[E: packages/opencode/src/provider/provider.ts:35][E: packages/opencode/src/provider/provider.ts:247][E: packages/opencode/src/provider/provider.ts:249][E: packages/opencode/src/provider/provider.ts:1849]
- Meta 也用 `sdk.responses(modelID)`，但不自动激活 provider。[E: packages/opencode/src/provider/provider.ts:251][E: packages/opencode/src/provider/provider.ts:255]
- GitHub Copilot 先尊重 model API 中的 `endpoint: responses|chat`；没有 override 时，GPT-5 class model 用 Responses，但排除 `gpt-5-mini`，其他用 chat。[E: packages/opencode/src/provider/provider.ts:270][E: packages/opencode/src/provider/provider.ts:272][E: packages/opencode/src/provider/provider.ts:276]
- opencode provider 在没有 key/auth/config apiKey 时隐藏付费模型，保留免费模型并用 public api key。[E: packages/opencode/src/provider/provider.ts:231][E: packages/opencode/src/provider/provider.ts:240]
- Cloudflare AI Gateway 按前缀三分路由，并用 `cloudflareGatewayNpm()` 把 openai/anthropic 模型改到 native npm；loader 显式 `timeoutFetch`。[E: packages/opencode/src/provider/provider.ts:878][E: packages/opencode/src/provider/provider.ts:902][E: packages/opencode/src/provider/provider.ts:1309]
- Azure OAuth 把 `accountId` 当 resource；Azure plugin 不再做 models/deployment discovery。[E: packages/opencode/src/provider/provider.ts:288][E: packages/opencode/src/plugin/azure.ts:54]
- amazon-bedrock `getModel` 保全 `arn:` 与已有 `global.` / `us.` / `eu.` / `jp.` / `apac.` / `au.` prefix。[E: packages/opencode/src/provider/provider.ts:414][E: packages/opencode/src/provider/provider.ts:418]

## 易错点

- V1 `Provider.Model.api.npm` 指向 AI SDK package，不是 native protocol id。[E: packages/opencode/src/provider/provider.ts:1058][E: packages/opencode/src/provider/provider.ts:1061][E: packages/opencode/src/provider/provider.ts:1129][E: packages/opencode/src/provider/provider.ts:1132]
- V1 registry 的 plugin hook 与 V2 `PluginV2` 不是同一套 plugin system。[I]
- `sync/README.md` 是历史设计，V1 Bus service 已不存在；当前不要从旧 Bus 文档推导 provider registry 行为。[I]
- Modal `/models` 是 best-effort discovery；缺 token、catalog 首个 model 缺 base URL、HTTP/schema error 都表现为空覆盖。静态 catalog entry 与 models 保留，但 working database copy 的 models 会被空覆盖，并可能让最终 active registry 删除 Modal provider。[E: packages/opencode/src/plugin/modal/modal.ts:7][E: packages/opencode/src/plugin/modal/modal.ts:10][E: packages/opencode/src/plugin/modal/modal.ts:11][E: packages/opencode/src/plugin/modal/modal.ts:13][E: packages/opencode/src/plugin/modal/models.ts:57][E: packages/opencode/src/provider/provider.ts:1505][E: packages/opencode/src/provider/provider.ts:1517][E: packages/opencode/src/provider/provider.ts:1518] gitlab 动态发现走 `discoveryLoaders[gitlab]`，不是 Modal hook。[E: packages/opencode/src/provider/provider.ts:1708][E: packages/opencode/src/provider/provider.ts:1712][E: packages/opencode/src/provider/provider.ts:1715]
- 不要把 V1 Cloudflare 三分路由当成 V2 Core plugin 行为；Core plugin 只 token-scope Workers AI。[E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:35]
- 不要把 Azure OAuth 写成仍有 `provider.models` hook 或 `az cognitiveservices account deployment list` 自动发现；解析链上的 hook 行仍给 Codex 等其它 plugin 用。[E: packages/opencode/src/plugin/azure.ts:54][E: packages/opencode/src/plugin/openai/codex.ts:290][E: packages/opencode/src/provider/provider.ts:1454]

## Sources

- packages/opencode/src/provider/provider.ts
- packages/schema/src/provider.ts
- packages/schema/src/model.ts
- packages/llm/src/schema/ids.ts
- packages/core/src/provider.ts
- packages/core/src/model.ts
- packages/opencode/src/plugin/index.ts
- packages/opencode/src/plugin/modal/modal.ts
- packages/opencode/src/plugin/modal/models.ts
- packages/opencode/test/plugin/modal-models.test.ts
- packages/opencode/src/plugin/azure.ts
- packages/opencode/src/plugin/openai/codex.ts
- packages/core/src/plugin/provider/cloudflare-ai-gateway.ts
- packages/core/src/models-dev.ts
- packages/core/src/v1/config/provider.ts
- packages/opencode/src/provider/transform.ts
- packages/core/src/aisdk.ts

## 相关

- provider.resolution
- ref.ai-sdk-provider-map
