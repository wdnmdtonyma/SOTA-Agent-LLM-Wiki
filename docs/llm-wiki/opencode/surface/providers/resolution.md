---
id: provider.resolution
title: Provider 解析链(V1 当前活跑)
kind: surface
tier: T1
v: v1
source: [packages/opencode/src/provider/provider.ts, packages/core/src/models-dev.ts, packages/opencode/src/provider/transform.ts]
symbols: [Provider.defaultLayer, Provider.getModel, Provider.getLanguage, Provider.defaultModel, ProviderTransform]
related: [model-layer.provider-registry-v1, provider.catalog]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 provider resolution 是当前活跑的模型入口：`packages/opencode/src/provider/provider.ts` 把 models.dev catalog、config、env、auth storage、plugin hooks、内建 custom loader 和 AI SDK package loader 合成可调用的 `LanguageModelV3`。

## 能回答的问题

- V1 当前如何从 `models.dev`、`opencode.json`、环境变量、auth 文件和 plugin hook 合成 provider？
- V1 `Provider.getModel()` 找不到 provider 或 model 时为什么能给 suggestions？
- V1 `Provider.getLanguage()` 什么时候加载 bundled AI SDK，什么时候动态安装 npm package？
- V1 默认模型选择顺序是什么？
- V1 provider transform 为什么会改 message、providerOptions、reasoning variant 和 output token cap？

## 定位

本节点只描述 V1 provider runtime。V2 provider catalog 与原生 provider protocol 由 [provider.catalog](catalog.md) 描述；V2 已经有 `packages/core/src` 内核和 `packages/llm` 引擎，但 V1 当前聊天主线仍是 Vercel AI SDK，路径是 `SessionPrompt.runLoop -> SessionProcessor -> LLM.stream -> Provider.getLanguage()` [I]。V1 provider service 在 Effect layer 中读取 `Plugin.Service`、`ModelsDev.Service` 和 `RuntimeFlags.Service`，因此 V1 解析链横跨 `packages/opencode/src` 与 `packages/core/src/models-dev.ts`。[E: packages/opencode/src/provider/provider.ts:1302][E: packages/opencode/src/provider/provider.ts:1309][E: packages/opencode/src/provider/provider.ts:1310][E: packages/opencode/src/provider/provider.ts:1311]

## 解析输入与来源优先级

| 来源 | 进入点 | 写入内容 | 证据 |
|---|---|---|---|
| models.dev catalog | `modelsDevSvc.get()` 后 `mapValues(modelsDev, fromModelsDevProvider)` | 生成 `catalog` 与 `database`，作为后续 provider merge 的基线 | [E: packages/opencode/src/provider/provider.ts:1317][E: packages/opencode/src/provider/provider.ts:1318][E: packages/opencode/src/provider/provider.ts:1319] |
| config provider | `cfg.provider` entries | provider name/env/options/source/models；config model 可以覆盖 npm/api/capabilities/cost/limit/headers/variants | [E: packages/opencode/src/provider/provider.ts:1357][E: packages/opencode/src/provider/provider.ts:1395][E: packages/opencode/src/provider/provider.ts:1401][E: packages/opencode/src/provider/provider.ts:1420][E: packages/opencode/src/provider/provider.ts:1478] |
| plugin provider models | `hook.provider.models` | 在 known provider 上替换整个 model map；传入 public provider 与 stored auth | [E: packages/opencode/src/provider/provider.ts:1367][E: packages/opencode/src/provider/provider.ts:1377][E: packages/opencode/src/provider/provider.ts:1379][E: packages/opencode/src/provider/provider.ts:1380] |
| environment variables | `env.all()` + provider `env` list | 如果 provider env var 有值，merge `source: "env"`，单 env provider 还写入 `key` | [E: packages/opencode/src/provider/provider.ts:1489][E: packages/opencode/src/provider/provider.ts:1493][E: packages/opencode/src/provider/provider.ts:1495][E: packages/opencode/src/provider/provider.ts:1497] |
| auth storage API key | `auth.all()` entries with `type === "api"` | merge `source: "api"` 和 `key` | [E: packages/opencode/src/provider/provider.ts:1502][E: packages/opencode/src/provider/provider.ts:1506][E: packages/opencode/src/provider/provider.ts:1507][E: packages/opencode/src/provider/provider.ts:1509] |
| plugin auth loader | `plugin.auth.loader` | 用 stored auth 和 public provider 计算 provider `options`；如果 provider 尚未 active，source 标为 `custom` | [E: packages/opencode/src/provider/provider.ts:1515][E: packages/opencode/src/provider/provider.ts:1520][E: packages/opencode/src/provider/provider.ts:1524][E: packages/opencode/src/provider/provider.ts:1531] |
| built-in custom loaders | `custom(dep)` | 可注册 custom `getModel`、vars loader、model discovery loader 和 extra options | [E: packages/opencode/src/provider/provider.ts:1535][E: packages/opencode/src/provider/provider.ts:1543][E: packages/opencode/src/provider/provider.ts:1544][E: packages/opencode/src/provider/provider.ts:1548] |

`mergeProvider()` 是 V1 解析链的中心合并点：已有 active provider 用 `mergeDeep(existing, provider)` 更新；没有 active provider 时必须先在 `database` 里找到同 id provider 才能启用。[E: packages/opencode/src/provider/provider.ts:1340][E: packages/opencode/src/provider/provider.ts:1341][E: packages/opencode/src/provider/provider.ts:1344][E: packages/opencode/src/provider/provider.ts:1347][E: packages/opencode/src/provider/provider.ts:1350]

## models.dev 到 V1 Model/Provider

`fromModelsDevModel()` 把 models.dev model 映射为 V1 `Model`：`providerID` 来自 provider id，`api.id/url/npm` 来自 model provider override 或 provider default，npm fallback 是 `@ai-sdk/openai-compatible`。[E: packages/opencode/src/provider/provider.ts:1188][E: packages/opencode/src/provider/provider.ts:1191][E: packages/opencode/src/provider/provider.ts:1195][E: packages/opencode/src/provider/provider.ts:1196][E: packages/opencode/src/provider/provider.ts:1197] 同一函数把 reasoning、attachment、toolcall、input/output modalities、interleaved、cost 和 limit 写成 V1 capability shape。[E: packages/opencode/src/provider/provider.ts:1202][E: packages/opencode/src/provider/provider.ts:1208][E: packages/opencode/src/provider/provider.ts:1210][E: packages/opencode/src/provider/provider.ts:1227]

`fromModelsDevProvider()` 构造 provider `Info`，source 先标成 `"custom"`，并复制 provider env list 与 models map；如果 models.dev model 有 `experimental.modes`，V1 会为每个 mode 生成一个 `model-id-mode` 变体 model，并把 provider body snake_case key 转成 camelCase option key。[E: packages/opencode/src/provider/provider.ts:1239][E: packages/opencode/src/provider/provider.ts:1243][E: packages/opencode/src/provider/provider.ts:1244][E: packages/opencode/src/provider/provider.ts:1254][E: packages/opencode/src/provider/provider.ts:1265][E: packages/opencode/src/provider/provider.ts:1267]

`ModelsDev.Service` 默认以 `https://models.dev` 为 source 并读取 `${source}/api.json`，cache file 位于 `Global.Path.cache` 下，TTL 检测是 5 分钟，并用跨进程 `Flock` 避免多个 opencode CLI 同时写同一 cache 文件。[E: packages/core/src/models-dev.ts:138][E: packages/core/src/models-dev.ts:139][E: packages/core/src/models-dev.ts:143][E: packages/core/src/models-dev.ts:154][E: packages/core/src/models-dev.ts:204] `OPENCODE_MODELS_PATH` 可以改成磁盘读取，`OPENCODE_DISABLE_MODELS_FETCH` 会让 populate 返回空 catalog，后台 refresh 每 60 分钟重复一次。[E: packages/core/src/models-dev.ts:162][E: packages/core/src/models-dev.ts:200][E: packages/core/src/models-dev.ts:233][E: packages/core/src/models-dev.ts:235]

## 过滤、variants 与 suggestions

V1 先读取 `enabled_providers` 和 `disabled_providers`，`isProviderAllowed()` 对 provider id 做 allow/deny 判断；最终 active providers loop 也会删除不允许的 provider。[E: packages/opencode/src/provider/provider.ts:1358][E: packages/opencode/src/provider/provider.ts:1359][E: packages/opencode/src/provider/provider.ts:1361][E: packages/opencode/src/provider/provider.ts:1362][E: packages/opencode/src/provider/provider.ts:1577][E: packages/opencode/src/provider/provider.ts:1580] 模型过滤包含特殊 GPT-5 chat aliases、alpha status、deprecated status、provider blacklist/whitelist；model 过滤后 provider 没有任何 model 时会删除整个 provider。[E: packages/opencode/src/provider/provider.ts:1591][E: packages/opencode/src/provider/provider.ts:1598][E: packages/opencode/src/provider/provider.ts:1599][E: packages/opencode/src/provider/provider.ts:1601][E: packages/opencode/src/provider/provider.ts:1620]

`ProviderTransform.variants()` 只对 reasoning-capable model 生成 variants；否则直接返回空对象。[E: packages/opencode/src/provider/transform.ts:673][E: packages/opencode/src/provider/transform.ts:674] V1 会在 config model 解析时 merge transform variants 与 config variants，并丢弃 `disabled` 的 variant。[E: packages/opencode/src/provider/provider.ts:1478][E: packages/opencode/src/provider/provider.ts:1480][E: packages/opencode/src/provider/provider.ts:1481] active model 如果没有 variants，也会再次用 `ProviderTransform.variants(model)` 补齐。[E: packages/opencode/src/provider/provider.ts:1606][E: packages/opencode/src/provider/provider.ts:1607]

`getModel()` 找不到 provider 时，会在 catalog/provider ids 上用 `modelSuggestions()` 或 `fuzzysort` 生成 suggestions；找到 provider 但找不到 model 时，会先基于 active provider model ids 生成 suggestions，不足时再回退到 catalog provider。[E: packages/opencode/src/provider/provider.ts:1777][E: packages/opencode/src/provider/provider.ts:1781][E: packages/opencode/src/provider/provider.ts:1783][E: packages/opencode/src/provider/provider.ts:1785][E: packages/opencode/src/provider/provider.ts:1792][E: packages/opencode/src/provider/provider.ts:1795] `modelSuggestions()` 会过滤 deprecated model，alpha model 只有启用 experimental models 时才参与建议。[E: packages/opencode/src/provider/provider.ts:1273][E: packages/opencode/src/provider/provider.ts:1277][E: packages/opencode/src/provider/provider.ts:1278]

## SDK resolution 与 LanguageModel 缓存

`resolveSDK()` 先合成 provider options，再用 provider id、AI SDK npm package 和 options hash 缓存 SDK instance；cache key 不包含 `model.api.id`，所以相同 provider id、npm package 和 options 会复用同一个 SDK object。[E: packages/opencode/src/provider/provider.ts:1639][E: packages/opencode/src/provider/provider.ts:1642][E: packages/opencode/src/provider/provider.ts:1693][E: packages/opencode/src/provider/provider.ts:1695][E: packages/opencode/src/provider/provider.ts:1696][E: packages/opencode/src/provider/provider.ts:1697][E: packages/opencode/src/provider/provider.ts:1700] `BUNDLED_PROVIDERS` 覆盖已打包的 AI SDK provider factory，例如 OpenAI、Anthropic、Google、OpenRouter、xAI、Mistral、Groq、GitHub Copilot 和 Venice 等。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:110][E: packages/opencode/src/provider/provider.ts:112][E: packages/opencode/src/provider/provider.ts:116][E: packages/opencode/src/provider/provider.ts:118][E: packages/opencode/src/provider/provider.ts:119][E: packages/opencode/src/provider/provider.ts:120][E: packages/opencode/src/provider/provider.ts:121][E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:133]

如果 npm package 不在 bundled map 里，V1 会通过 `Npm.add(model.api.npm)` 安装或定位 entrypoint，再 dynamic import 包中第一个以 `create` 开头的导出作为 SDK factory。[E: packages/opencode/src/provider/provider.ts:1736][E: packages/opencode/src/provider/provider.ts:1747][E: packages/opencode/src/provider/provider.ts:1751][E: packages/opencode/src/provider/provider.ts:1759][E: packages/opencode/src/provider/provider.ts:1761] `getLanguage()` 的缓存 key 是 `${providerID}/${model.id}`；如果 provider 有 custom model loader 就调用 loader，否则默认调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1801][E: packages/opencode/src/provider/provider.ts:1804][E: packages/opencode/src/provider/provider.ts:1811][E: packages/opencode/src/provider/provider.ts:1821]

`resolveSDK()` 还会做 provider-specific option surgery：Google Vertex Anthropic 会补 region baseURL；OpenAI-compatible 会默认 `includeUsage: true`；provider key 会写入 `apiKey`；model headers 会合入 options headers。[E: packages/opencode/src/provider/provider.ts:1644][E: packages/opencode/src/provider/provider.ts:1653][E: packages/opencode/src/provider/provider.ts:1660][E: packages/opencode/src/provider/provider.ts:1661][E: packages/opencode/src/provider/provider.ts:1685][E: packages/opencode/src/provider/provider.ts:1686][E: packages/opencode/src/provider/provider.ts:1687]

## Transform 层

`ProviderTransform.message()` 在发给 AI SDK 之前处理 unsupported parts、message normalization、Anthropic/Claude/Google Vertex Anthropic/Alibaba prompt caching、providerOptions key remap 和 Responses item id stripping。[E: packages/opencode/src/provider/transform.ts:430][E: packages/opencode/src/provider/transform.ts:431][E: packages/opencode/src/provider/transform.ts:432][E: packages/opencode/src/provider/transform.ts:434][E: packages/opencode/src/provider/transform.ts:444][E: packages/opencode/src/provider/transform.ts:448][E: packages/opencode/src/provider/transform.ts:459][E: packages/opencode/src/provider/transform.ts:463]

`ProviderTransform.options()` 根据 provider/model 设置默认 request options，例如 OpenAI/GitHub Copilot/Amazon Mantle store false、Azure prompt cache key、OpenRouter/LLMGateway usage include、Google thinkingConfig、GPT-5 reasoning defaults 和 encrypted reasoning include。[E: packages/opencode/src/provider/transform.ts:1090][E: packages/opencode/src/provider/transform.ts:1091][E: packages/opencode/src/provider/transform.ts:1096][E: packages/opencode/src/provider/transform.ts:1099][E: packages/opencode/src/provider/transform.ts:1104][E: packages/opencode/src/provider/transform.ts:1134][E: packages/opencode/src/provider/transform.ts:1182][E: packages/opencode/src/provider/transform.ts:1191][E: packages/opencode/src/provider/transform.ts:1193]

`ProviderTransform.providerOptions()` 把 model-level options 放到 AI SDK 期望的 providerOptions namespace；Gateway 特殊处理 `gateway` 和 upstream slug，Azure 同时传 `openai` 与 `azure` namespace。[E: packages/opencode/src/provider/transform.ts:1265][E: packages/opencode/src/provider/transform.ts:1276][E: packages/opencode/src/provider/transform.ts:1282][E: packages/opencode/src/provider/transform.ts:1290][E: packages/opencode/src/provider/transform.ts:1319][E: packages/opencode/src/provider/transform.ts:1320] `maxOutputTokens()` 把 model output limit 与默认 `OUTPUT_TOKEN_MAX = 32000` 取最小值。[E: packages/opencode/src/provider/transform.ts:1325][E: packages/opencode/src/provider/transform.ts:1326]

## 默认模型

`defaultModel()` 先尊重 config 中的 `model` 字符串，并用 `parseModel()` 按第一个 `/` 切 provider id 与 model id。[E: packages/opencode/src/provider/provider.ts:1913][E: packages/opencode/src/provider/provider.ts:1915][E: packages/opencode/src/provider/provider.ts:1963][E: packages/opencode/src/provider/provider.ts:1964] 如果 config 没有 model，V1 会读取 state 目录下 `model.json` 的 recent 列表，找到第一个仍存在的 provider/model 直接返回。[E: packages/opencode/src/provider/provider.ts:1918][E: packages/opencode/src/provider/provider.ts:1930][E: packages/opencode/src/provider/provider.ts:1931][E: packages/opencode/src/provider/provider.ts:1934] 仍找不到时，V1 选第一个 active provider，并用 `sort()` 在该 provider models 中选优先模型；`sort()` 当前按 `gpt-5`、`claude-sonnet-4`、`big-pickle`、`gemini-3-pro` priority、`latest`、id 排序。[E: packages/opencode/src/provider/provider.ts:1938][E: packages/opencode/src/provider/provider.ts:1940][E: packages/opencode/src/provider/provider.ts:1952][E: packages/opencode/src/provider/provider.ts:1957][E: packages/opencode/src/provider/provider.ts:1958][E: packages/opencode/src/provider/provider.ts:1959]

## Sources

- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts
- packages/opencode/src/provider/transform.ts

## 相关

- [V1 provider registry](../../subsystems/model-layer/provider-registry-v1.md)
- [Provider catalog](catalog.md)
