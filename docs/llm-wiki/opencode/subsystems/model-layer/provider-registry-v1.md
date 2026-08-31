---
id: model-layer.provider-registry-v1
title: Provider Registry V1
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/provider/provider.ts, packages/schema/src/provider.ts, packages/schema/src/model.ts, packages/llm/src/schema/ids.ts, packages/core/src/provider.ts, packages/core/src/model.ts, packages/opencode/src/plugin/index.ts, packages/opencode/src/plugin/modal/modal.ts, packages/opencode/src/plugin/modal/models.ts, packages/opencode/test/plugin/modal-models.test.ts, packages/opencode/src/plugin/azure.ts, packages/core/src/plugin/provider/cloudflare-ai-gateway.ts, packages/core/src/models-dev.ts, packages/core/src/v1/config/provider.ts, packages/opencode/src/provider/transform.ts]
symbols: [Provider.Service, BUNDLED_PROVIDERS, fromModelsDevProvider, resolveSDK, getLanguage, ModalPlugin, ModalModels.get, googleVertexEndpoint, cloudflareGatewayNpm]
related: [provider.resolution, ref.ai-sdk-provider-map]
evidence: explicit
status: verified
updated: 9f69463f1d
---

> V1 provider registry 是 `packages/opencode/src/provider/provider.ts` 里的 AI SDK provider/model resolver：它从 models.dev catalog、config、env、auth、plugin hooks 和 provider-specific custom loader 合成 `Provider.Info` / `Provider.Model`，再按 model 的 npm package 创建或缓存 `LanguageModelV3`。

## 能回答的问题

- V1 provider registry 的数据源按什么顺序 merge？
- bundled AI SDK provider 与动态 npm provider 如何加载？
- `googleVertexEndpoint`、Cloudflare AI Gateway 三分路由、`cloudflareGatewayNpm()`、Azure OAuth `accountId` 各做什么？
- config/env/auth/plugin 如何影响 provider 可见性和 model variants？
- V1 `Provider.Model` 与 V2 `ModelV2.Info` 是否同一个类型？

## 命名边界

V1 的 `Provider.Service` interface 暴露 `getProvider(): Info`、`getModel(): Model`、`getLanguage(): LanguageModelV3`。[E: packages/opencode/src/provider/provider.ts:1193][E: packages/opencode/src/provider/provider.ts:1194][E: packages/opencode/src/provider/provider.ts:1195] 这不是 `packages/llm` 的 native `ProviderID/ModelID`，也不是 V2 core 的 `ProviderV2.Info` / `ModelV2.Info`。[E: packages/llm/src/schema/ids.ts:14][E: packages/llm/src/schema/ids.ts:17][E: packages/schema/src/provider.ts:53][E: packages/schema/src/model.ts:60]

V1 当前活跑主线是 Vercel AI SDK path，所以这个 registry 是默认 provider path；`packages/llm` 是可选 native protocol engine seam。[I]

## 输入与 Catalog 转换

`fromModelsDevProvider` 把 models.dev provider 转成 V1 `Info`：遍历 provider.models，每个 model 调 `fromModelsDevModel`，并把 experimental modes 展开成 `${model.id}-${mode}` 的额外 model id。[E: packages/opencode/src/provider/provider.ts:1318][E: packages/opencode/src/provider/provider.ts:1320][E: packages/opencode/src/provider/provider.ts:1321][E: packages/opencode/src/provider/provider.ts:1322][E: packages/opencode/src/provider/provider.ts:1323]

`fromModelsDevModel` 会把 models.dev api/status/cost/limits/capabilities 等字段投影到 V1 model，然后优先调用 `ProviderTransform.reasoningVariants(model, base)`；它返回 `undefined`——例如字段缺失，或 toggle/budget 对该 npm package 没有可用映射——时才回退 `ProviderTransform.variants(base)`。[E: packages/opencode/src/provider/provider.ts:1261][E: packages/opencode/src/provider/provider.ts:1268][E: packages/opencode/src/provider/provider.ts:1276][E: packages/opencode/src/provider/provider.ts:1285][E: packages/opencode/src/provider/provider.ts:1286][E: packages/opencode/src/provider/provider.ts:1287][E: packages/opencode/src/provider/provider.ts:1310][E: packages/opencode/src/provider/transform.ts:1653][E: packages/opencode/src/provider/transform.ts:1655][E: packages/opencode/src/provider/transform.ts:1663][E: packages/opencode/src/provider/transform.ts:1700][E: packages/opencode/src/provider/transform.ts:1701]

`api.npm` 先走 `cloudflareGatewayNpm(provider.id, model.id)`：仅 `cloudflare-ai-gateway` 上，`openai/*` → `@ai-sdk/openai`，`anthropic/*` → `@ai-sdk/anthropic`，其它返回 `undefined` 再 fallback catalog/provider npm。这样 reasoning variants 在计算前已经对着 native SDK。[E: packages/opencode/src/provider/provider.ts:1254][E: packages/opencode/src/provider/provider.ts:1255][E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1271]

models.dev/config 的 `interleaved` 兼容 boolean、field object 与 string shorthand；registry 把 string 统一投影为 `{ field }`。field schema 保留三个已知字面量，同时接受任意 string，所以 provider catalog 新增字段名不必先改 registry schema。[E: packages/core/src/models-dev.ts:18][E: packages/core/src/models-dev.ts:19][E: packages/core/src/models-dev.ts:20][E: packages/core/src/models-dev.ts:77][E: packages/core/src/models-dev.ts:78][E: packages/core/src/models-dev.ts:80][E: packages/core/src/v1/config/provider.ts:8][E: packages/core/src/v1/config/provider.ts:9][E: packages/core/src/v1/config/provider.ts:10][E: packages/core/src/v1/config/provider.ts:22][E: packages/core/src/v1/config/provider.ts:23][E: packages/core/src/v1/config/provider.ts:25][E: packages/opencode/src/provider/provider.ts:1017][E: packages/opencode/src/provider/provider.ts:1018][E: packages/opencode/src/provider/provider.ts:1019][E: packages/opencode/src/provider/provider.ts:1022][E: packages/opencode/src/provider/provider.ts:1024][E: packages/opencode/src/provider/provider.ts:1025][E: packages/opencode/src/provider/provider.ts:1304][E: packages/opencode/src/provider/provider.ts:1538]

experimental mode body 经 `modeOptions()` 转 camelCase；`@ai-sdk/openai` 的 `{ reasoning: { mode } }` 特别转成 `{ reasoningMode }`，避免把 nested `reasoning` 原样传给 SDK。[E: packages/opencode/src/provider/provider.ts:1322][E: packages/opencode/src/provider/provider.ts:1345][E: packages/opencode/src/provider/provider.ts:1348][E: packages/opencode/src/provider/provider.ts:1351][E: packages/opencode/src/provider/provider.ts:1353]

本节点不枚举 live zen/go model ID；registry 的模型集合来自 `modelsDevSvc.get()` 的远程/缓存 JSON。[I]

## Vertex / Cloudflare / Azure custom loaders

`googleVertexEndpoint(location)` 按 location 分成三路 host：`global` → `aiplatform.googleapis.com`；`eu`/`us` → `aiplatform.{location}.rep.googleapis.com`（REP）；其它 region → `{location}-aiplatform.googleapis.com`。[E: packages/opencode/src/provider/provider.ts:101][E: packages/opencode/src/provider/provider.ts:102][E: packages/opencode/src/provider/provider.ts:103][E: packages/opencode/src/provider/provider.ts:104] `google-vertex` loader 把该 host 写入 `GOOGLE_VERTEX_ENDPOINT` var。[E: packages/opencode/src/provider/provider.ts:532] `google-vertex-anthropic` 另用 `googleVertexAnthropicBaseURL()`：只有 `eu`/`us` 才生成 REP Anthropic publisher URL。[E: packages/opencode/src/provider/provider.ts:94][E: packages/opencode/src/provider/provider.ts:96][E: packages/opencode/src/provider/provider.ts:98][E: packages/opencode/src/provider/provider.ts:562]

`cloudflare-ai-gateway` custom `getModel` 按 model id 前缀三分路由，**不是**一律 `createUnified({ apiKey })`：`openai/*` → native OpenAI passthrough；`anthropic/*` → native Anthropic，点号版本 `replaceAll(".", "-")`；`workers-ai/` / `@cf/` → `createUnified({ apiKey: apiToken })`（唯一向上游传 CF token）；其它第三方 → `createOpenAICompatible` + REST `cf-aig-gateway-id`。[E: packages/opencode/src/provider/provider.ts:848][E: packages/opencode/src/provider/provider.ts:853][E: packages/opencode/src/provider/provider.ts:862][E: packages/opencode/src/provider/provider.ts:863][E: packages/opencode/src/provider/provider.ts:871]

V2 Core `CloudflareAIGatewayPlugin` **没有** mirror 这套三分路由：它只对 Workers AI (`workers-ai/` / `@cf/`) 把 token 传给 `createUnified({ apiKey })`，其它模型 `createUnified({})`。[E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:27][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:34][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:35]

Azure custom loader 的 resource 优先级：`provider.options.resourceName` → API auth `metadata.resourceName` → **OAuth `auth.accountId`** → `AZURE_RESOURCE_NAME`。[E: packages/opencode/src/provider/provider.ts:251][E: packages/opencode/src/provider/provider.ts:252][E: packages/opencode/src/provider/provider.ts:253][E: packages/opencode/src/provider/provider.ts:254] Azure CLI OAuth 成功时把用户选的 resourceName 存进 `accountId`。[E: packages/opencode/src/plugin/azure.ts:190]

## Modal 动态模型发现

`ModalPlugin` 已加入内建 plugin 列表；和其他默认插件一样，整体仍受 `disableDefaultPlugins` 控制。它只在存在 API auth（或 `MODAL_PROXY_TOKEN`）且 catalog 的第一个 model 有 URL 时工作；hook 在 config provider 扩展之前执行，所以本轮 config 后补 URL 不能触发 discovery。失败时 catch 返回空模型集，不抛出初始化错误；该空集只替换从静态 catalog JSON round-trip 得到的 registry working database copy，静态 catalog 及其 models 保留。若 config 随后也没有向 working copy 补回 model，最终 active-provider 过滤会删除 Modal。[E: packages/opencode/src/plugin/index.ts:67][E: packages/opencode/src/plugin/index.ts:75][E: packages/opencode/src/plugin/index.ts:170][E: packages/opencode/src/plugin/modal/modal.ts:4][E: packages/opencode/src/plugin/modal/modal.ts:7][E: packages/opencode/src/plugin/modal/modal.ts:9][E: packages/opencode/src/plugin/modal/modal.ts:10][E: packages/opencode/src/plugin/modal/modal.ts:11][E: packages/opencode/src/plugin/modal/modal.ts:13][E: packages/opencode/src/provider/provider.ts:1401][E: packages/opencode/src/provider/provider.ts:1402][E: packages/opencode/src/provider/provider.ts:1450][E: packages/opencode/src/provider/provider.ts:1462][E: packages/opencode/src/provider/provider.ts:1478][E: packages/opencode/src/provider/provider.ts:1711][E: packages/opencode/src/provider/provider.ts:1712]

发现器向 `${baseURL}/models` 发 Bearer 请求，超时 3 秒；每个返回项以 `base_model_id ?? hugging_face_id ?? id` 先选第一个非 nullish key，再只做一次 template lookup——key 未命中时不会继续尝试后备 ID。随后它合成 API、价格、limit、modalities/tool/reasoning/interleaved capability。数值报价乘 1,000,000 进入 catalog 单位；显式 `reasoning_options` 转为 `reasoningEffort` variants，字段缺失才继承 template variants。[E: packages/opencode/src/plugin/modal/models.ts:47][E: packages/opencode/src/plugin/modal/models.ts:50][E: packages/opencode/src/plugin/modal/models.ts:51][E: packages/opencode/src/plugin/modal/models.ts:55][E: packages/opencode/src/plugin/modal/models.ts:63][E: packages/opencode/src/plugin/modal/models.ts:69][E: packages/opencode/src/plugin/modal/models.ts:77][E: packages/opencode/src/plugin/modal/models.ts:85][E: packages/opencode/src/plugin/modal/models.ts:90][E: packages/opencode/src/plugin/modal/models.ts:113][E: packages/opencode/src/plugin/modal/models.ts:117][E: packages/opencode/src/plugin/modal/models.ts:118]

`internalPlugins()` 还注册 `CerebrasPlugin`（V1 plugin，不是新 tool）。[E: packages/opencode/src/plugin/index.ts:84]

## Merge Pipeline

1. registry 初始化时读取 config、models.dev、runtime flags，并建立 providers、language model cache、modelLoaders、varsLoaders、sdk cache、discoveryLoaders。[E: packages/opencode/src/provider/provider.ts:1385][E: packages/opencode/src/provider/provider.ts:1394][E: packages/opencode/src/provider/provider.ts:1399][E: packages/opencode/src/provider/provider.ts:1400][E: packages/opencode/src/provider/provider.ts:1404][E: packages/opencode/src/provider/provider.ts:1405][E: packages/opencode/src/provider/provider.ts:1406][E: packages/opencode/src/provider/provider.ts:1409][E: packages/opencode/src/provider/provider.ts:1412][E: packages/opencode/src/provider/provider.ts:1413]

2. `mergeProvider` 先尝试覆盖已有 provider，否则从 models.dev database 找基础 provider 再 deep merge patch。[E: packages/opencode/src/provider/provider.ts:1423][E: packages/opencode/src/provider/provider.ts:1425][E: packages/opencode/src/provider/provider.ts:1427][E: packages/opencode/src/provider/provider.ts:1430][E: packages/opencode/src/provider/provider.ts:1433]

3. registry 先 `plugin.list()`，随后才读取 `cfg.provider`，让 plugin-derived config 有机会参与 provider config 解析。[E: packages/opencode/src/provider/provider.ts:1437][E: packages/opencode/src/provider/provider.ts:1440]

4. config 里的 disabled/enabled provider 被读成集合，`isProviderAllowed` 同时检查 whitelist 与 disabled list。[E: packages/opencode/src/provider/provider.ts:1441][E: packages/opencode/src/provider/provider.ts:1442][E: packages/opencode/src/provider/provider.ts:1444][E: packages/opencode/src/provider/provider.ts:1445][E: packages/opencode/src/provider/provider.ts:1446]

5. plugin provider model hook 可以替换 database 中已有 provider 的 models，并接收 public provider info 与 plugin auth。[E: packages/opencode/src/provider/provider.ts:1450][E: packages/opencode/src/provider/provider.ts:1452][E: packages/opencode/src/provider/provider.ts:1460][E: packages/opencode/src/provider/provider.ts:1462][E: packages/opencode/src/provider/provider.ts:1463] `toPublicInfo()` 在 JSON-safe 序列化前还会删掉不通过 V1 `Model` schema 的 model entry，避免非法 shape 进入 public hook 输入。[E: packages/opencode/src/provider/provider.ts:1117][E: packages/opencode/src/provider/provider.ts:1119][E: packages/opencode/src/provider/provider.ts:1122][E: packages/opencode/src/provider/provider.ts:1125]

6. config provider 会扩展 database：provider-level name/env/options/source/models，model-level api/capabilities/cost/options/limit/header/family/release_date 重新合成。若 npm package 与 catalog model 相同就保留 catalog variants，换 package 才重算 heuristic，之后再 merge config variants。config-defined gateway model 会再跑 `cloudflareGatewayNpm(providerID, apiID)`。[E: packages/opencode/src/provider/provider.ts:1480][E: packages/opencode/src/provider/provider.ts:1485][E: packages/opencode/src/provider/provider.ts:1498][E: packages/opencode/src/provider/provider.ts:1506][E: packages/opencode/src/provider/provider.ts:1564][E: packages/opencode/src/provider/provider.ts:1565][E: packages/opencode/src/provider/provider.ts:1566][E: packages/opencode/src/provider/provider.ts:1568]

7. env activation 会在 provider.env 中找第一个存在的 env var；只有 provider.env 长度为 1 时才把该值写成 provider key。auth provider key 来自 `Auth.all()` 里 type 为 `api` 的条目。[E: packages/opencode/src/provider/provider.ts:1579][E: packages/opencode/src/provider/provider.ts:1583][E: packages/opencode/src/provider/provider.ts:1587][E: packages/opencode/src/provider/provider.ts:1592][E: packages/opencode/src/provider/provider.ts:1596][E: packages/opencode/src/provider/provider.ts:1599]

8. plugin auth loader 与 custom loaders 可以补 options、modelLoaders、varsLoaders、discoverModels，之后 config provider patch 会再应用一次。[E: packages/opencode/src/provider/provider.ts:1621][E: packages/opencode/src/provider/provider.ts:1622][E: packages/opencode/src/provider/provider.ts:1625][E: packages/opencode/src/provider/provider.ts:1634][E: packages/opencode/src/provider/provider.ts:1635][E: packages/opencode/src/provider/provider.ts:1636][E: packages/opencode/src/provider/provider.ts:1650]

9. 最终过滤会删除 disabled/未 allowed provider，删除特定 GPT chat alias、alpha/deprecated model、blacklist/whitelist model，仅对 `variants === undefined` 的 model 补 heuristic variants，并删除空 provider。[E: packages/opencode/src/provider/provider.ts:1667][E: packages/opencode/src/provider/provider.ts:1669][E: packages/opencode/src/provider/provider.ts:1670][E: packages/opencode/src/provider/provider.ts:1682][E: packages/opencode/src/provider/provider.ts:1689][E: packages/opencode/src/provider/provider.ts:1690][E: packages/opencode/src/provider/provider.ts:1692][E: packages/opencode/src/provider/provider.ts:1697][E: packages/opencode/src/provider/provider.ts:1698][E: packages/opencode/src/provider/provider.ts:1711][E: packages/opencode/src/provider/provider.ts:1712]

## AI SDK 加载

`BUNDLED_PROVIDERS` 是 V1 内置 AI SDK factory map，包含 Anthropic/OpenAI/Azure/Google/Bedrock/OpenRouter/GitLab/GitHub Copilot/Venice 等 npm entry。[E: packages/opencode/src/provider/provider.ts:114][E: packages/opencode/src/provider/provider.ts:139] 对 GitHub Copilot，内置 loader 不是第三方包，而是从 `@opencode-ai/core/github-copilot/copilot-provider` 导入 `createOpenaiCompatible`。[E: packages/opencode/src/provider/provider.ts:137][E: packages/opencode/src/provider/provider.ts:138]

`resolveSDK` 合成 provider options：处理 Google Vertex Anthropic baseURL、openai-compatible includeUsage、baseURL env interpolation、apiKey、model headers，再按 providerID/npm/options hash 做 SDK cache。[E: packages/opencode/src/provider/provider.ts:1730][E: packages/opencode/src/provider/provider.ts:1733][E: packages/opencode/src/provider/provider.ts:1740][E: packages/opencode/src/provider/provider.ts:1751][E: packages/opencode/src/provider/provider.ts:1760][E: packages/opencode/src/provider/provider.ts:1777][E: packages/opencode/src/provider/provider.ts:1778][E: packages/opencode/src/provider/provider.ts:1779][E: packages/opencode/src/provider/provider.ts:1784]

如果 npm 在 `BUNDLED_PROVIDERS` 中，registry 调 bundled factory；否则通过 `Npm.add(model.api.npm)` 安装/解析 entrypoint，动态 import 后取第一个以 `create` 开头的 export 创建 SDK。[E: packages/opencode/src/provider/provider.ts:1827][E: packages/opencode/src/provider/provider.ts:1828][E: packages/opencode/src/provider/provider.ts:1829][E: packages/opencode/src/provider/provider.ts:1842][E: packages/opencode/src/provider/provider.ts:1843][E: packages/opencode/src/provider/provider.ts:1852][E: packages/opencode/src/provider/provider.ts:1853]

`getLanguage` 以 `providerID/model.id` 缓存 `LanguageModelV3`；有 custom modelLoader 时用 loader，否则调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1892][E: packages/opencode/src/provider/provider.ts:1895][E: packages/opencode/src/provider/provider.ts:1896][E: packages/opencode/src/provider/provider.ts:1902][E: packages/opencode/src/provider/provider.ts:1912][E: packages/opencode/src/provider/provider.ts:1913]

## Custom Loader 设计动机

custom loader 是 provider-specific escape hatch，类型允许返回 `getModel`、vars、options、discoverModels，并通过 `autoload` 控制是否自动激活 provider。[E: packages/opencode/src/provider/provider.ts:146][E: packages/opencode/src/provider/provider.ts:147][E: packages/opencode/src/provider/provider.ts:148][E: packages/opencode/src/provider/provider.ts:149][E: packages/opencode/src/provider/provider.ts:150]

典型例子：

- Anthropic 注入 `anthropic-beta` header。[E: packages/opencode/src/provider/provider.ts:176][E: packages/opencode/src/provider/provider.ts:181]
- OpenAI 默认取 `sdk.responses(modelID)`，header timeout 是 300000 ms。[E: packages/opencode/src/provider/provider.ts:35][E: packages/opencode/src/provider/provider.ts:212][E: packages/opencode/src/provider/provider.ts:214]
- Meta 也用 `sdk.responses(modelID)`，但不自动激活 provider。[E: packages/opencode/src/provider/provider.ts:216][E: packages/opencode/src/provider/provider.ts:218][E: packages/opencode/src/provider/provider.ts:220]
- GitHub Copilot 先尊重 model API 中的 `endpoint: responses|chat`；没有 override 时，GPT-5 class model 用 Responses，但排除 `gpt-5-mini`，其他用 chat。[E: packages/opencode/src/provider/provider.ts:235][E: packages/opencode/src/provider/provider.ts:237][E: packages/opencode/src/provider/provider.ts:238][E: packages/opencode/src/provider/provider.ts:240][E: packages/opencode/src/provider/provider.ts:241][E: packages/opencode/src/provider/provider.ts:242]
- opencode provider 在没有 key/auth/config apiKey 时隐藏付费模型，保留免费模型并用 public api key。[E: packages/opencode/src/provider/provider.ts:196][E: packages/opencode/src/provider/provider.ts:204][E: packages/opencode/src/provider/provider.ts:205]
- Cloudflare AI Gateway 按前缀三分路由，并用 `cloudflareGatewayNpm()` 把 openai/anthropic 模型改到 native npm。[E: packages/opencode/src/provider/provider.ts:848][E: packages/opencode/src/provider/provider.ts:1254]
- Azure OAuth 把 `accountId` 当 resource。[E: packages/opencode/src/provider/provider.ts:253]

## 易错点

- V1 `Provider.Model.api.npm` 指向 AI SDK package，不是 native protocol id。[E: packages/opencode/src/provider/provider.ts:1003][E: packages/opencode/src/provider/provider.ts:1006]
- V1 registry 的 plugin hook 与 V2 `PluginV2` 不是同一套 plugin system。[I]
- `sync/README.md` 是历史设计，V1 Bus service 已不存在；当前不要从旧 Bus 文档推导 provider registry 行为。[I]
- Modal `/models` 是 best-effort discovery；缺 token、catalog 首个 model 缺 base URL、HTTP/schema error 都表现为空覆盖。静态 catalog entry 与 models 保留，但 working database copy 的 models 会被空覆盖，并可能让最终 active registry 删除 Modal provider。[E: packages/opencode/src/plugin/modal/modal.ts:10][E: packages/opencode/src/plugin/modal/modal.ts:11][E: packages/opencode/src/plugin/modal/modal.ts:13][E: packages/opencode/src/plugin/modal/models.ts:57][E: packages/opencode/src/provider/provider.ts:1401][E: packages/opencode/src/provider/provider.ts:1402][E: packages/opencode/src/provider/provider.ts:1462][E: packages/opencode/src/provider/provider.ts:1711][E: packages/opencode/src/provider/provider.ts:1712]
- 不要把 V1 Cloudflare 三分路由当成 V2 Core plugin 行为；Core plugin 只 token-scope Workers AI。[E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:35]

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
- packages/core/src/plugin/provider/cloudflare-ai-gateway.ts
- packages/core/src/models-dev.ts
- packages/core/src/v1/config/provider.ts
- packages/opencode/src/provider/transform.ts

## 相关

- provider.resolution
- ref.ai-sdk-provider-map
