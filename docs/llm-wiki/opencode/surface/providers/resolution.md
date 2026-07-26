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
updated: 7534d23551
---

> V1 provider resolution 是当前活跑的模型入口：`packages/opencode/src/provider/provider.ts` 把 models.dev catalog、config、env、auth storage、plugin hooks、内建 custom loader 和 AI SDK package loader 合成可调用的 `LanguageModelV3`。

## 能回答的问题

- V1 当前如何从 `models.dev`、`opencode.json`、环境变量、auth 文件和 plugin hook 合成 provider？
- V1 `Provider.getModel()` 找不到 provider 或 model 时为什么能给 suggestions？
- V1 `Provider.getLanguage()` 什么时候加载 bundled AI SDK，什么时候动态安装 npm package？
- V1 默认模型选择顺序是什么？
- V1 provider transform 为什么会改 message、providerOptions、reasoning variant 和 output token cap？

## 定位

本节点只描述 V1 provider runtime。V2 provider catalog 与原生 provider protocol 由 [provider.catalog](catalog.md) 描述；V2 已经有 `packages/core/src` 内核和 `packages/llm` 引擎，但 V1 当前聊天主线仍是 Vercel AI SDK，路径是 `SessionPrompt.runLoop -> SessionProcessor -> LLM.stream -> Provider.getLanguage()` [I]。V1 provider service 在 Effect layer 中读取 `Plugin.Service`、`ModelsDev.Service` 和 `RuntimeFlags.Service`，因此 V1 解析链横跨 `packages/opencode/src` 与 `packages/core/src/models-dev.ts`。[E: packages/opencode/src/provider/provider.ts:1327][E: packages/opencode/src/provider/provider.ts:1334][E: packages/opencode/src/provider/provider.ts:1335][E: packages/opencode/src/provider/provider.ts:1336]

## 解析输入与来源优先级

| 来源 | 进入点 | 写入内容 | 证据 |
|---|---|---|---|
| models.dev catalog | `modelsDevSvc.get()` 后 `mapValues(modelsDev, fromModelsDevProvider)` | 生成 `catalog` 与 `database`，作为后续 provider merge 的基线 | [E: packages/opencode/src/provider/provider.ts:1342][E: packages/opencode/src/provider/provider.ts:1343][E: packages/opencode/src/provider/provider.ts:1344] |
| config provider | `cfg.provider` entries | provider name/env/options/source/models；config model 可以覆盖 npm/api/capabilities/cost/limit/headers/variants | [E: packages/opencode/src/provider/provider.ts:1382][E: packages/opencode/src/provider/provider.ts:1420][E: packages/opencode/src/provider/provider.ts:1426][E: packages/opencode/src/provider/provider.ts:1445][E: packages/opencode/src/provider/provider.ts:1478] |
| plugin provider models | `hook.provider.models` | 在 known provider 上替换整个 model map；传入 public provider 与 stored auth | [E: packages/opencode/src/provider/provider.ts:1392][E: packages/opencode/src/provider/provider.ts:1402][E: packages/opencode/src/provider/provider.ts:1404][E: packages/opencode/src/provider/provider.ts:1405] |
| environment variables | `env.all()` + provider `env` list | 如果 provider env var 有值，merge `source: "env"`，单 env provider 还写入 `key` | [E: packages/opencode/src/provider/provider.ts:1518][E: packages/opencode/src/provider/provider.ts:1522][E: packages/opencode/src/provider/provider.ts:1524][E: packages/opencode/src/provider/provider.ts:1526] |
| auth storage API key | `auth.all()` entries with `type === "api"` | merge `source: "api"` 和 `key` | [E: packages/opencode/src/provider/provider.ts:1531][E: packages/opencode/src/provider/provider.ts:1535][E: packages/opencode/src/provider/provider.ts:1536][E: packages/opencode/src/provider/provider.ts:1538] |
| plugin auth loader | `plugin.auth.loader` | 用 stored auth 和 public provider 计算 provider `options`；如果 provider 尚未 active，source 标为 `custom` | [E: packages/opencode/src/provider/provider.ts:1544][E: packages/opencode/src/provider/provider.ts:1549][E: packages/opencode/src/provider/provider.ts:1553][E: packages/opencode/src/provider/provider.ts:1560] |
| built-in custom loaders | `custom(dep)` | 可注册 custom `getModel`、vars loader、model discovery loader 和 extra options | [E: packages/opencode/src/provider/provider.ts:1564][E: packages/opencode/src/provider/provider.ts:1572][E: packages/opencode/src/provider/provider.ts:1573][E: packages/opencode/src/provider/provider.ts:1577] |

`mergeProvider()` 是 V1 解析链的中心合并点：已有 active provider 用 `mergeDeep(existing, provider)` 更新；没有 active provider 时必须先在 `database` 里找到同 id provider 才能启用。[E: packages/opencode/src/provider/provider.ts:1365][E: packages/opencode/src/provider/provider.ts:1366][E: packages/opencode/src/provider/provider.ts:1369][E: packages/opencode/src/provider/provider.ts:1372][E: packages/opencode/src/provider/provider.ts:1375]

## models.dev 到 V1 Model/Provider

`fromModelsDevModel()` 把 models.dev model 映射为 V1 `Model`：`providerID` 来自 provider id，`api.id/url/npm` 来自 model provider override 或 provider default，npm fallback 是 `@ai-sdk/openai-compatible`。[E: packages/opencode/src/provider/provider.ts:1207][E: packages/opencode/src/provider/provider.ts:1210][E: packages/opencode/src/provider/provider.ts:1214][E: packages/opencode/src/provider/provider.ts:1215][E: packages/opencode/src/provider/provider.ts:1216] 同一函数把 reasoning、attachment、toolcall、input/output modalities、interleaved、cost 和 limit 写成 V1 capability shape。[E: packages/opencode/src/provider/provider.ts:1221][E: packages/opencode/src/provider/provider.ts:1227][E: packages/opencode/src/provider/provider.ts:1229][E: packages/opencode/src/provider/provider.ts:1246]

`fromModelsDevProvider()` 构造 provider `Info`，source 先标成 `"custom"`，并复制 provider env list 与 models map；如果 models.dev model 有 `experimental.modes`，V1 会为每个 mode 生成一个 `model-id-mode` 变体 model。[E: packages/opencode/src/provider/provider.ts:1260][E: packages/opencode/src/provider/provider.ts:1264][E: packages/opencode/src/provider/provider.ts:1265][E: packages/opencode/src/provider/provider.ts:1267][E: packages/opencode/src/provider/provider.ts:1277][E: packages/opencode/src/provider/provider.ts:1283] mode body 通常把 snake_case key 转成 camelCase;但 `@ai-sdk/openai` 的 nested `reasoning.mode` 会特别变成顶层 `reasoningMode`。[E: packages/opencode/src/provider/provider.ts:1287][E: packages/opencode/src/provider/provider.ts:1289][E: packages/opencode/src/provider/provider.ts:1292][E: packages/opencode/src/provider/provider.ts:1293][E: packages/opencode/src/provider/provider.ts:1295]

`ModelsDev.Service` 默认以 `https://models.dev` 为 source 并读取 `${source}/api.json`，cache file 位于 `Global.Path.cache` 下，TTL 检测是 5 分钟，并用跨进程 `Flock` 避免多个 opencode CLI 同时写同一 cache 文件。[E: packages/core/src/models-dev.ts:154][E: packages/core/src/models-dev.ts:155][E: packages/core/src/models-dev.ts:159][E: packages/core/src/models-dev.ts:170][E: packages/core/src/models-dev.ts:220] `OPENCODE_MODELS_PATH` 可以改成磁盘读取，`OPENCODE_DISABLE_MODELS_FETCH` 会让 populate 返回空 catalog，后台 refresh 每 60 分钟重复一次。[E: packages/core/src/models-dev.ts:178][E: packages/core/src/models-dev.ts:216][E: packages/core/src/models-dev.ts:249][E: packages/core/src/models-dev.ts:251]

## 过滤、variants 与 suggestions

V1 先读取 `enabled_providers` 和 `disabled_providers`，`isProviderAllowed()` 对 provider id 做 allow/deny 判断；最终 active providers loop 也会删除不允许的 provider。[E: packages/opencode/src/provider/provider.ts:1383][E: packages/opencode/src/provider/provider.ts:1384][E: packages/opencode/src/provider/provider.ts:1386][E: packages/opencode/src/provider/provider.ts:1387][E: packages/opencode/src/provider/provider.ts:1606][E: packages/opencode/src/provider/provider.ts:1609] 模型过滤包含特殊 GPT-5 chat aliases、alpha status、deprecated status、provider blacklist/whitelist；model 过滤后 provider 没有任何 model 时会删除整个 provider。[E: packages/opencode/src/provider/provider.ts:1620][E: packages/opencode/src/provider/provider.ts:1627][E: packages/opencode/src/provider/provider.ts:1628][E: packages/opencode/src/provider/provider.ts:1630][E: packages/opencode/src/provider/provider.ts:1649]

models.dev model 有 `reasoning_options` 时,V1 先用 `ProviderTransform.reasoningVariants()` 把 catalog 声明的 effort/toggle/budget 翻译成 provider-specific variants;函数返回 `undefined` 时才回退 heuristic `ProviderTransform.variants()`。除字段缺失外,toggle/budget 对 npm package 没有可用映射也可能返回 `undefined`。[E: packages/core/src/models-dev.ts:47][E: packages/core/src/models-dev.ts:71][E: packages/opencode/src/provider/provider.ts:1252][E: packages/opencode/src/provider/transform.ts:1631][E: packages/opencode/src/provider/transform.ts:1633][E: packages/opencode/src/provider/transform.ts:1636][E: packages/opencode/src/provider/transform.ts:1639][E: packages/opencode/src/provider/transform.ts:1641][E: packages/opencode/src/provider/transform.ts:1643][E: packages/opencode/src/provider/transform.ts:1678][E: packages/opencode/src/provider/transform.ts:1679] config 没有换 npm package 时保留 catalog variants,换了 npm 才重算 heuristic,然后 merge config variants 并丢弃 `disabled` 项。[E: packages/opencode/src/provider/provider.ts:1503][E: packages/opencode/src/provider/provider.ts:1504][E: packages/opencode/src/provider/provider.ts:1505][E: packages/opencode/src/provider/provider.ts:1506][E: packages/opencode/src/provider/provider.ts:1507][E: packages/opencode/src/provider/provider.ts:1509][E: packages/opencode/src/provider/provider.ts:1510] final loop 仅在 `model.variants === undefined` 时补 heuristic;显式 `{}` 不会被重填。[E: packages/opencode/src/provider/provider.ts:1635][E: packages/opencode/src/provider/provider.ts:1636]

`getModel()` 找不到 provider 时，会在 catalog/provider ids 上用 `modelSuggestions()` 或 `fuzzysort` 生成 suggestions；找到 provider 但找不到 model 时，会先基于 active provider model ids 生成 suggestions，不足时再回退到 catalog provider。[E: packages/opencode/src/provider/provider.ts:1806][E: packages/opencode/src/provider/provider.ts:1810][E: packages/opencode/src/provider/provider.ts:1812][E: packages/opencode/src/provider/provider.ts:1814][E: packages/opencode/src/provider/provider.ts:1821][E: packages/opencode/src/provider/provider.ts:1824] `modelSuggestions()` 会过滤 deprecated model，alpha model 只有启用 experimental models 时才参与建议。[E: packages/opencode/src/provider/provider.ts:1298][E: packages/opencode/src/provider/provider.ts:1302][E: packages/opencode/src/provider/provider.ts:1303]

## SDK resolution 与 LanguageModel 缓存

`resolveSDK()` 先合成 provider options，再用 provider id、AI SDK npm package 和 options hash 缓存 SDK instance；cache key 不包含 `model.api.id`，所以相同 provider id、npm package 和 options 会复用同一个 SDK object。[E: packages/opencode/src/provider/provider.ts:1668][E: packages/opencode/src/provider/provider.ts:1671][E: packages/opencode/src/provider/provider.ts:1722][E: packages/opencode/src/provider/provider.ts:1724][E: packages/opencode/src/provider/provider.ts:1725][E: packages/opencode/src/provider/provider.ts:1726][E: packages/opencode/src/provider/provider.ts:1729] `BUNDLED_PROVIDERS` 覆盖已打包的 AI SDK provider factory，例如 OpenAI、Anthropic、Google、OpenRouter、xAI、Mistral、Groq、GitHub Copilot 和 Venice 等。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:110][E: packages/opencode/src/provider/provider.ts:112][E: packages/opencode/src/provider/provider.ts:116][E: packages/opencode/src/provider/provider.ts:118][E: packages/opencode/src/provider/provider.ts:119][E: packages/opencode/src/provider/provider.ts:120][E: packages/opencode/src/provider/provider.ts:121][E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:133]

如果 npm package 不在 bundled map 里，V1 会通过 `Npm.add(model.api.npm)` 安装或定位 entrypoint，再 dynamic import 包中第一个以 `create` 开头的导出作为 SDK factory。[E: packages/opencode/src/provider/provider.ts:1765][E: packages/opencode/src/provider/provider.ts:1776][E: packages/opencode/src/provider/provider.ts:1780][E: packages/opencode/src/provider/provider.ts:1788][E: packages/opencode/src/provider/provider.ts:1790] `getLanguage()` 的缓存 key 是 `${providerID}/${model.id}`；如果 provider 有 custom model loader 就调用 loader，否则默认调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1830][E: packages/opencode/src/provider/provider.ts:1833][E: packages/opencode/src/provider/provider.ts:1840][E: packages/opencode/src/provider/provider.ts:1850]

`resolveSDK()` 还会做 provider-specific option surgery：Google Vertex Anthropic 会补 region baseURL；OpenAI-compatible 会默认 `includeUsage: true`；provider key 会写入 `apiKey`；model headers 会合入 options headers。[E: packages/opencode/src/provider/provider.ts:1673][E: packages/opencode/src/provider/provider.ts:1682][E: packages/opencode/src/provider/provider.ts:1689][E: packages/opencode/src/provider/provider.ts:1690][E: packages/opencode/src/provider/provider.ts:1714][E: packages/opencode/src/provider/provider.ts:1715][E: packages/opencode/src/provider/provider.ts:1716]

## Transform 层

`ProviderTransform.message()` 在发给 AI SDK 之前处理 unsupported parts、message normalization、prompt-cache breakpoints、providerOptions key remap 和 Responses item id stripping；Anthropic/Vertex-Anthropic options 已带 `cacheControl` 时会跳过手工 breakpoint 注入。[E: packages/opencode/src/provider/transform.ts:464][E: packages/opencode/src/provider/transform.ts:465][E: packages/opencode/src/provider/transform.ts:467][E: packages/opencode/src/provider/transform.ts:469][E: packages/opencode/src/provider/transform.ts:480][E: packages/opencode/src/provider/transform.ts:482][E: packages/opencode/src/provider/transform.ts:486][E: packages/opencode/src/provider/transform.ts:497]

`ProviderTransform.options()` 根据 provider/model 设置默认 request options，例如 store false、SDK-specific cache key、gateway usage/caching、Google/Kimi thinking 与 GPT-5 reasoning defaults。DeepInfra/Cerebras 写 `prompt_cache_key`；OpenAI/Azure/xAI/Mistral/Venice 写 `promptCacheKey`，并统一尊重 `setCacheKey:false`。Meta OpenAI path 只加 reasoning summary 与 encrypted include，不再默认 xhigh effort。[E: packages/opencode/src/provider/transform.ts:1155][E: packages/opencode/src/provider/transform.ts:1162][E: packages/opencode/src/provider/transform.ts:1195][E: packages/opencode/src/provider/transform.ts:1197][E: packages/opencode/src/provider/transform.ts:1220][E: packages/opencode/src/provider/transform.ts:1243][E: packages/opencode/src/provider/transform.ts:1244][E: packages/opencode/src/provider/transform.ts:1247][E: packages/opencode/src/provider/transform.ts:1254][E: packages/opencode/src/provider/transform.ts:1258][E: packages/opencode/src/provider/transform.ts:1267]

`ProviderTransform.providerOptions()` 把 model-level options 放到 AI SDK 期望的 providerOptions namespace；Gateway 特殊处理 `gateway` 和 upstream slug，Azure 同时传 `openai` 与 `azure` namespace。[E: packages/opencode/src/provider/transform.ts:1335][E: packages/opencode/src/provider/transform.ts:1346][E: packages/opencode/src/provider/transform.ts:1352][E: packages/opencode/src/provider/transform.ts:1360][E: packages/opencode/src/provider/transform.ts:1389][E: packages/opencode/src/provider/transform.ts:1390] `maxOutputTokens()` 把 model output limit 与默认 `OUTPUT_TOKEN_MAX = 32000` 取最小值。[E: packages/opencode/src/provider/transform.ts:1395][E: packages/opencode/src/provider/transform.ts:1396]

## 默认模型

`defaultModel()` 先尊重 config 中的 `model` 字符串，并用 `parseModel()` 按第一个 `/` 切 provider id 与 model id。[E: packages/opencode/src/provider/provider.ts:1942][E: packages/opencode/src/provider/provider.ts:1944][E: packages/opencode/src/provider/provider.ts:1992][E: packages/opencode/src/provider/provider.ts:1993] 如果 config 没有 model，V1 会读取 state 目录下 `model.json` 的 recent 列表，找到第一个仍存在的 provider/model 直接返回。[E: packages/opencode/src/provider/provider.ts:1947][E: packages/opencode/src/provider/provider.ts:1959][E: packages/opencode/src/provider/provider.ts:1960][E: packages/opencode/src/provider/provider.ts:1963] 仍找不到时，V1 选第一个 active provider，并用 `sort()` 在该 provider models 中选优先模型；`sort()` 当前按 `gpt-5`、`claude-sonnet-4`、`big-pickle`、`gemini-3-pro` priority、`latest`、id 排序。[E: packages/opencode/src/provider/provider.ts:1967][E: packages/opencode/src/provider/provider.ts:1969][E: packages/opencode/src/provider/provider.ts:1981][E: packages/opencode/src/provider/provider.ts:1986][E: packages/opencode/src/provider/provider.ts:1987][E: packages/opencode/src/provider/provider.ts:1988]

## Sources

- packages/opencode/src/provider/provider.ts
- packages/core/src/models-dev.ts
- packages/opencode/src/provider/transform.ts

## 相关

- [V1 provider registry](../../subsystems/model-layer/provider-registry-v1.md)
- [Provider catalog](catalog.md)
