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
updated: 355a0bcf5
---

> V1 provider resolution 是当前活跑的模型入口：`packages/opencode/src/provider/provider.ts` 把 models.dev catalog、config、env、auth.json、plugin hooks 和 AI SDK package loader 合成可调用的 `LanguageModelV3`。

## 能回答的问题

- V1 当前如何从 `models.dev`、`opencode.json`、环境变量、auth 文件和 plugin provider hook 合成 provider？
- V1 `Provider.getModel()` 找不到 provider 或 model 时为什么能给 suggestions？
- V1 `Provider.getLanguage()` 什么时候加载 bundled AI SDK，什么时候动态安装 npm package？
- V1 默认模型选择顺序是什么？
- V1 provider transform 为什么会改 message、providerOptions、reasoning variant 和 output token cap？

## 定位

本节点只描述 V1 当前 runtime。V2 provider catalog 与原生 provider protocol 由 [provider.catalog](catalog.md) 描述；V2 已经有 `packages/core/src` 内核和 `packages/llm` 引擎，但 V1 当前聊天主线仍是 Vercel AI SDK，路径是 `SessionPrompt.runLoop -> SessionProcessor -> LLM.stream -> Provider.getLanguage()` [I]。V1 `provider.ts` 内部已经复用 `@opencode/v2` 的 `ModelsDev.Service` 读取 catalog cache，因此 V1 解析链横跨 `packages/opencode/src` 与 `packages/core/src/models-dev.ts`。[E: packages/opencode/src/provider/provider.ts:1293][E: packages/opencode/src/provider/provider.ts:1300]

## 解析输入与来源优先级

| 来源 | 进入点 | 写入内容 | 证据 |
|---|---|---|---|
| models.dev catalog | `modelsDevSvc.get()` 后 `mapValues(modelsDev, fromModelsDevProvider)` | 生成 `catalog` 与 `database`，作为后续 provider merge 的基线 | [E: packages/opencode/src/provider/provider.ts:1300][E: packages/opencode/src/provider/provider.ts:1301][E: packages/opencode/src/provider/provider.ts:1302] |
| config provider | `cfg.provider` entries | provider name/env/options/source/models；config model 可以覆盖 npm/api/capabilities/cost/limit/headers/variants | [E: packages/opencode/src/provider/provider.ts:1340][E: packages/opencode/src/provider/provider.ts:1378][E: packages/opencode/src/provider/provider.ts:1403][E: packages/opencode/src/provider/provider.ts:1461] |
| plugin provider models | `hook.provider.models` | 在 known provider 上替换整个 model map；传入 public provider 与 stored auth | [E: packages/opencode/src/provider/provider.ts:1350][E: packages/opencode/src/provider/provider.ts:1360][E: packages/opencode/src/provider/provider.ts:1362][E: packages/opencode/src/provider/provider.ts:1363] |
| environment variables | `env.all()` + provider `env` list | 如果 provider env var 有值，merge `source: "env"`，单 env provider 还写入 `key` | [E: packages/opencode/src/provider/provider.ts:1472][E: packages/opencode/src/provider/provider.ts:1476][E: packages/opencode/src/provider/provider.ts:1478][E: packages/opencode/src/provider/provider.ts:1480] |
| auth.json API key | `auth.all()` entries with `type === "api"` | merge `source: "api"` 和 `key` | [E: packages/opencode/src/provider/provider.ts:1485][E: packages/opencode/src/provider/provider.ts:1489][E: packages/opencode/src/provider/provider.ts:1490][E: packages/opencode/src/provider/provider.ts:1492] |
| plugin auth loader | `plugin.auth.loader` | 用 stored auth 和 public provider 计算 provider `options`；如果 provider 尚未 active，source 标为 `custom` | [E: packages/opencode/src/provider/provider.ts:1498][E: packages/opencode/src/provider/provider.ts:1503][E: packages/opencode/src/provider/provider.ts:1507][E: packages/opencode/src/provider/provider.ts:1514] |
| built-in custom loaders | `custom(dep)` | 可注册 custom `getModel`、vars loader、model discovery loader 和 extra options | [E: packages/opencode/src/provider/provider.ts:1518][E: packages/opencode/src/provider/provider.ts:1526][E: packages/opencode/src/provider/provider.ts:1527][E: packages/opencode/src/provider/provider.ts:1531] |

`mergeProvider()` 是 V1 解析链的中心合并点：已有 active provider 用 `mergeDeep(existing, provider)` 更新；没有 active provider 时必须先在 `database` 里找到同 id provider 才能启用。[E: packages/opencode/src/provider/provider.ts:1323][E: packages/opencode/src/provider/provider.ts:1327][E: packages/opencode/src/provider/provider.ts:1330][E: packages/opencode/src/provider/provider.ts:1333]

## models.dev 到 V1 Model/Provider

`fromModelsDevModel()` 把 models.dev model 映射为 V1 `Model`：`providerID` 来自 provider id，`api.id/url/npm` 来自 model provider override 或 provider default，npm fallback 是 `@ai-sdk/openai-compatible`。[E: packages/opencode/src/provider/provider.ts:1171][E: packages/opencode/src/provider/provider.ts:1174][E: packages/opencode/src/provider/provider.ts:1178][E: packages/opencode/src/provider/provider.ts:1180] 同一函数把 temperature/reasoning/attachment/toolcall、input/output modalities、interleaved、cost 和 limit 写成 V1 capability shape。[E: packages/opencode/src/provider/provider.ts:1191][E: packages/opencode/src/provider/provider.ts:1196][E: packages/opencode/src/provider/provider.ts:1203][E: packages/opencode/src/provider/provider.ts:1210]

`fromModelsDevProvider()` 构造 provider `Info`，source 先标成 `"custom"`，并复制 provider env list 与 models map；如果 models.dev model 有 `experimental.modes`，V1 会为每个 mode 生成一个 `model-id-mode` 变体 model，并把 provider body snake_case key 转成 camelCase option key。[E: packages/opencode/src/provider/provider.ts:1222][E: packages/opencode/src/provider/provider.ts:1226][E: packages/opencode/src/provider/provider.ts:1227][E: packages/opencode/src/provider/provider.ts:1237][E: packages/opencode/src/provider/provider.ts:1248][E: packages/opencode/src/provider/provider.ts:1250]

`ModelsDev.Service` 默认从 `https://models.dev/api.json` 读取 catalog，cache file 位于 `Global.Path.cache` 下，TTL 检测是 5 分钟，并用跨进程 `Flock` 避免多个 opencode CLI 同时写同一 cache 文件。[E: packages/core/src/models-dev.ts:142][E: packages/core/src/models-dev.ts:143][E: packages/core/src/models-dev.ts:147][E: packages/core/src/models-dev.ts:208] `OPENCODE_MODELS_PATH` 可以改成磁盘读取，`OPENCODE_DISABLE_MODELS_FETCH` 会让 populate 返回空 catalog，后台 refresh 每 60 分钟重复一次。[E: packages/core/src/models-dev.ts:166][E: packages/core/src/models-dev.ts:204][E: packages/core/src/models-dev.ts:237][E: packages/core/src/models-dev.ts:239]

## 过滤、variants 与 suggestions

V1 先读取 `enabled_providers` 和 `disabled_providers`，`isProviderAllowed()` 对 provider id 做 allow/deny 判断；最终 active providers loop 也会删除不允许的 provider。[E: packages/opencode/src/provider/provider.ts:1341][E: packages/opencode/src/provider/provider.ts:1342][E: packages/opencode/src/provider/provider.ts:1344][E: packages/opencode/src/provider/provider.ts:1560][E: packages/opencode/src/provider/provider.ts:1563] 模型过滤包含特殊 GPT-5 chat aliases、alpha status、deprecated status、provider blacklist/whitelist；model 过滤后 provider 没有任何 model 时会删除整个 provider。[E: packages/opencode/src/provider/provider.ts:1569][E: packages/opencode/src/provider/provider.ts:1574][E: packages/opencode/src/provider/provider.ts:1581][E: packages/opencode/src/provider/provider.ts:1584][E: packages/opencode/src/provider/provider.ts:1603]

`ProviderTransform.variants()` 只对 reasoning-capable model 生成 variants；否则直接返回空对象。[E: packages/opencode/src/provider/transform.ts:665][E: packages/opencode/src/provider/transform.ts:666] V1 会在 config model 解析时 merge transform variants 与 config variants，并丢弃 `disabled` 的 variant。[E: packages/opencode/src/provider/provider.ts:1461][E: packages/opencode/src/provider/provider.ts:1463][E: packages/opencode/src/provider/provider.ts:1464] active model 如果没有 variants，也会再次用 `ProviderTransform.variants(model)` 补齐。[E: packages/opencode/src/provider/provider.ts:1589][E: packages/opencode/src/provider/provider.ts:1590]

`getModel()` 找不到 provider 时，会在 catalog/providers ids 上用 fuzzysort 生成最多 3 个 provider suggestions；找到 provider 但找不到 model 时，会先基于 active provider model ids 生成 suggestions，不足时再回退到 catalog provider。[E: packages/opencode/src/provider/provider.ts:1760][E: packages/opencode/src/provider/provider.ts:1764][E: packages/opencode/src/provider/provider.ts:1768][E: packages/opencode/src/provider/provider.ts:1773][E: packages/opencode/src/provider/provider.ts:1775][E: packages/opencode/src/provider/provider.ts:1778] `modelSuggestions()` 会过滤 deprecated model，alpha model 只有启用 experimental models 时才参与建议。[E: packages/opencode/src/provider/provider.ts:1256][E: packages/opencode/src/provider/provider.ts:1260][E: packages/opencode/src/provider/provider.ts:1261]

## SDK resolution 与 LanguageModel 缓存

`resolveSDK()` 先合成 provider options，再用 provider id、AI SDK npm package 和 options hash 缓存 SDK instance；cache key 不包含 `model.api.id`，所以相同 provider id、npm package 和 options 会复用同一个 SDK object。[E: packages/opencode/src/provider/provider.ts:1622][E: packages/opencode/src/provider/provider.ts:1625][E: packages/opencode/src/provider/provider.ts:1676][E: packages/opencode/src/provider/provider.ts:1678][E: packages/opencode/src/provider/provider.ts:1679][E: packages/opencode/src/provider/provider.ts:1680][E: packages/opencode/src/provider/provider.ts:1683][E: packages/opencode/src/provider/provider.ts:1684] `BUNDLED_PROVIDERS` 覆盖已打包的 AI SDK provider factory，例如 OpenAI、Anthropic、Google、OpenRouter、xAI、Mistral、Groq、GitHub Copilot 和 Venice 等。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:110][E: packages/opencode/src/provider/provider.ts:116][E: packages/opencode/src/provider/provider.ts:118][E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:133]

如果 npm package 不在 bundled map 里，V1 会通过 `Npm.add(model.api.npm)` 安装或定位 entrypoint，再 dynamic import 包中第一个以 `create` 开头的导出作为 SDK factory。[E: packages/opencode/src/provider/provider.ts:1719][E: packages/opencode/src/provider/provider.ts:1730][E: packages/opencode/src/provider/provider.ts:1734][E: packages/opencode/src/provider/provider.ts:1742][E: packages/opencode/src/provider/provider.ts:1744] `getLanguage()` 的缓存 key 是 `${providerID}/${model.id}`；如果 provider 有 custom model loader 就调用 loader，否则默认调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1784][E: packages/opencode/src/provider/provider.ts:1787][E: packages/opencode/src/provider/provider.ts:1788][E: packages/opencode/src/provider/provider.ts:1794][E: packages/opencode/src/provider/provider.ts:1804]

`resolveSDK()` 还会做 provider-specific option surgery：Google Vertex Anthropic 会补 region baseURL；OpenAI-compatible 会默认 `includeUsage: true`；provider key 会写入 `apiKey`；model headers 会合入 options headers。[E: packages/opencode/src/provider/provider.ts:1628][E: packages/opencode/src/provider/provider.ts:1636][E: packages/opencode/src/provider/provider.ts:1643][E: packages/opencode/src/provider/provider.ts:1644][E: packages/opencode/src/provider/provider.ts:1669][E: packages/opencode/src/provider/provider.ts:1671]

## Transform 层

`ProviderTransform.message()` 在发给 AI SDK 之前处理 unsupported parts、message normalization、Anthropic/Claude/Google Vertex Anthropic/Alibaba prompt caching、providerOptions key remap 和 Responses item id stripping。[E: packages/opencode/src/provider/transform.ts:430][E: packages/opencode/src/provider/transform.ts:431][E: packages/opencode/src/provider/transform.ts:432][E: packages/opencode/src/provider/transform.ts:433][E: packages/opencode/src/provider/transform.ts:435][E: packages/opencode/src/provider/transform.ts:436][E: packages/opencode/src/provider/transform.ts:437][E: packages/opencode/src/provider/transform.ts:441][E: packages/opencode/src/provider/transform.ts:444][E: packages/opencode/src/provider/transform.ts:448][E: packages/opencode/src/provider/transform.ts:463] `ProviderTransform.options()` 根据 provider/model 设置默认 request options，例如 OpenAI/GitHub Copilot/Amazon Mantle store false、Azure prompt cache key、OpenRouter usage include、Google thinkingConfig、GPT-5 reasoning defaults 和 gateway caching。[E: packages/opencode/src/provider/transform.ts:1045][E: packages/opencode/src/provider/transform.ts:1061][E: packages/opencode/src/provider/transform.ts:1066][E: packages/opencode/src/provider/transform.ts:1069][E: packages/opencode/src/provider/transform.ts:1074][E: packages/opencode/src/provider/transform.ts:1104][E: packages/opencode/src/provider/transform.ts:1152][E: packages/opencode/src/provider/transform.ts:1193]

`ProviderTransform.providerOptions()` 把 model-level options 放到 AI SDK 期望的 providerOptions namespace；Gateway 特殊处理 `gateway` 和 upstream slug，Azure 同时传 `openai` 与 `azure` namespace。[E: packages/opencode/src/provider/transform.ts:1235][E: packages/opencode/src/provider/transform.ts:1242][E: packages/opencode/src/provider/transform.ts:1250][E: packages/opencode/src/provider/transform.ts:1275][E: packages/opencode/src/provider/transform.ts:1279][E: packages/opencode/src/provider/transform.ts:1280] `maxOutputTokens()` 把 model output limit 与默认 `OUTPUT_TOKEN_MAX = 32000` 取最小值。[E: packages/opencode/src/provider/transform.ts:1285][E: packages/opencode/src/provider/transform.ts:1286]

## 默认模型

`defaultModel()` 先尊重 config 中的 `model` 字符串，并用 `parseModel()` 按第一个 `/` 切 provider id 与 model id。[E: packages/opencode/src/provider/provider.ts:1897][E: packages/opencode/src/provider/provider.ts:1899][E: packages/opencode/src/provider/provider.ts:1957][E: packages/opencode/src/provider/provider.ts:1961] 如果 config 没有 model，V1 会读取 state 目录下 `model.json` 的 recent 列表，找到第一个仍存在的 provider/model 直接返回。[E: packages/opencode/src/provider/provider.ts:1901][E: packages/opencode/src/provider/provider.ts:1902][E: packages/opencode/src/provider/provider.ts:1914][E: packages/opencode/src/provider/provider.ts:1918] 仍找不到时，V1 选第一个 active provider，并用 `sort()` 在该 provider models 中选优先模型；`sort()` 当前按 `gpt-5`、`claude-sonnet-4`、`big-pickle`、`gemini-3-pro` priority、`latest`、id 排序。[E: packages/opencode/src/provider/provider.ts:1921][E: packages/opencode/src/provider/provider.ts:1923][E: packages/opencode/src/provider/provider.ts:1947][E: packages/opencode/src/provider/provider.ts:1951]

## Sources

- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts
- packages/opencode/src/provider/transform.ts

## 相关

- [V1 provider registry](../../subsystems/model-layer/provider-registry-v1.md)
- [Provider catalog](catalog.md)
