---
id: model-layer.provider-registry-v1
title: Provider Registry V1
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/provider/provider.ts, packages/schema/src/provider.ts, packages/schema/src/model.ts, packages/llm/src/schema/ids.ts, packages/core/src/provider.ts, packages/core/src/model.ts, packages/opencode/src/plugin/index.ts, packages/opencode/src/plugin/modal/modal.ts, packages/opencode/src/plugin/modal/models.ts, packages/opencode/test/plugin/modal-models.test.ts]
symbols: [Provider.Service, BUNDLED_PROVIDERS, fromModelsDevProvider, resolveSDK, getLanguage, ModalPlugin, ModalModels.get]
related: [provider.resolution, ref.ai-sdk-provider-map]
evidence: explicit
status: verified
updated: 89130db6b0
---

> V1 provider registry 是 `packages/opencode/src/provider/provider.ts` 里的 AI SDK provider/model resolver:它从 models.dev catalog、config、env、auth、plugin hooks 和 provider-specific custom loader 合成 `Provider.Info` / `Provider.Model`,再按 model 的 npm package 创建或缓存 `LanguageModelV3`。

## 能回答的问题
- V1 provider registry 的数据源按什么顺序 merge?
- bundled AI SDK provider 与动态 npm provider 如何加载?
- custom loader 负责哪些 provider-specific hack?
- config/env/auth/plugin 如何影响 provider 可见性和 model variants?
- V1 `Provider.Model` 与 V2 `ModelV2.Info` 是否同一个类型?

## 命名边界

V1 的 `Provider.Service` interface 暴露 `getProvider(): Info`、`getModel(): Model`、`getLanguage(): LanguageModelV3`。[E: packages/opencode/src/provider/provider.ts:1155][E: packages/opencode/src/provider/provider.ts:1156][E: packages/opencode/src/provider/provider.ts:1157] 这不是 `packages/llm` 的 native `ProviderID/ModelID`,也不是 V2 core 的 `ProviderV2.Info` / `ModelV2.Info`。[E: packages/llm/src/schema/ids.ts:14][E: packages/llm/src/schema/ids.ts:17][E: packages/schema/src/provider.ts:53][E: packages/schema/src/model.ts:60]

V1 当前活跑主线是 Vercel AI SDK path,所以这个 registry 是默认 provider path;`packages/llm` 是可选 native protocol engine seam。[I]

## 输入与 Catalog 转换

`fromModelsDevProvider` 把 models.dev provider 转成 V1 `Info`:遍历 provider.models,每个 model 调 `fromModelsDevModel`,并把 experimental modes 展开成 `${model.id}-${mode}` 的额外 model id。[E: packages/opencode/src/provider/provider.ts:1265][E: packages/opencode/src/provider/provider.ts:1267][E: packages/opencode/src/provider/provider.ts:1268][E: packages/opencode/src/provider/provider.ts:1269][E: packages/opencode/src/provider/provider.ts:1270]

`fromModelsDevModel` 会把 models.dev api/status/cost/limits/capabilities 等字段投影到 V1 model,然后优先调用 `ProviderTransform.reasoningVariants(model, base)`;它返回 `undefined`——例如字段缺失,或 toggle/budget 对该 npm package 没有可用映射——时才回退 `ProviderTransform.variants(base)`。[E: packages/opencode/src/provider/provider.ts:1212][E: packages/opencode/src/provider/provider.ts:1218][E: packages/opencode/src/provider/provider.ts:1223][E: packages/opencode/src/provider/provider.ts:1226][E: packages/opencode/src/provider/provider.ts:1227][E: packages/opencode/src/provider/provider.ts:1232][E: packages/opencode/src/provider/provider.ts:1257][E: packages/opencode/src/provider/provider.ts:1261][E: packages/opencode/src/provider/transform.ts:1650][E: packages/opencode/src/provider/transform.ts:1652][E: packages/opencode/src/provider/transform.ts:1654][E: packages/opencode/src/provider/transform.ts:1689][E: packages/opencode/src/provider/transform.ts:1690]

models.dev/config 的 `interleaved` 兼容 boolean、field object 与 string shorthand；registry 把 string 统一投影为 `{ field }`。field schema 保留三个已知字面量，同时接受任意 string，所以 provider catalog 新增字段名不必先改 registry schema。[E: packages/core/src/models-dev.ts:18][E: packages/core/src/models-dev.ts:19][E: packages/core/src/models-dev.ts:20][E: packages/core/src/models-dev.ts:77][E: packages/core/src/models-dev.ts:78][E: packages/core/src/models-dev.ts:79][E: packages/core/src/models-dev.ts:80][E: packages/core/src/models-dev.ts:81][E: packages/core/src/models-dev.ts:82][E: packages/core/src/v1/config/provider.ts:8][E: packages/core/src/v1/config/provider.ts:9][E: packages/core/src/v1/config/provider.ts:10][E: packages/core/src/v1/config/provider.ts:22][E: packages/core/src/v1/config/provider.ts:23][E: packages/core/src/v1/config/provider.ts:24][E: packages/core/src/v1/config/provider.ts:25][E: packages/core/src/v1/config/provider.ts:26][E: packages/core/src/v1/config/provider.ts:27][E: packages/opencode/src/provider/provider.ts:979][E: packages/opencode/src/provider/provider.ts:980][E: packages/opencode/src/provider/provider.ts:981][E: packages/opencode/src/provider/provider.ts:984][E: packages/opencode/src/provider/provider.ts:985][E: packages/opencode/src/provider/provider.ts:986][E: packages/opencode/src/provider/provider.ts:987][E: packages/opencode/src/provider/provider.ts:1251][E: packages/opencode/src/provider/provider.ts:1482][E: packages/opencode/src/provider/provider.ts:1487]

## Modal 动态模型发现

`ModalPlugin` 已加入内建 plugin 列表；和其他默认插件一样，整体仍受 `disableDefaultPlugins` 控制。它只在存在 API auth（或 `MODAL_PROXY_TOKEN`）且 catalog 的第一个 model 有 URL 时工作；hook 在 config provider 扩展之前执行，所以本轮 config 后补 URL 不能触发 discovery。失败时 catch 返回空模型集，不抛出初始化错误；该空集只替换从静态 catalog JSON round-trip 得到的 registry working database copy，静态 catalog 及其 models 保留。若 config 随后也没有向 working copy 补回 model，最终 active-provider 过滤会删除 Modal。[E: packages/opencode/src/plugin/index.ts:66][E: packages/opencode/src/plugin/index.ts:74][E: packages/opencode/src/plugin/index.ts:168][E: packages/opencode/src/plugin/modal/modal.ts:4][E: packages/opencode/src/plugin/modal/modal.ts:7][E: packages/opencode/src/plugin/modal/modal.ts:9][E: packages/opencode/src/plugin/modal/modal.ts:10][E: packages/opencode/src/plugin/modal/modal.ts:11][E: packages/opencode/src/plugin/modal/modal.ts:13][E: packages/opencode/src/provider/provider.ts:1348][E: packages/opencode/src/provider/provider.ts:1349][E: packages/opencode/src/provider/provider.ts:1397][E: packages/opencode/src/provider/provider.ts:1409][E: packages/opencode/src/provider/provider.ts:1410][E: packages/opencode/src/provider/provider.ts:1425][E: packages/opencode/src/provider/provider.ts:1654][E: packages/opencode/src/provider/provider.ts:1655]

发现器向 `${baseURL}/models` 发 Bearer 请求，超时 3 秒；每个返回项以 `base_model_id ?? hugging_face_id ?? id` 先选第一个非 nullish key，再只做一次 template lookup——key 未命中时不会继续尝试后备 ID。随后它合成 API、价格、limit、modalities/tool/reasoning/interleaved capability。数值报价乘 1,000,000 进入 catalog 单位；显式 `reasoning_options` 转为 `reasoningEffort` variants，字段缺失才继承 template variants。[E: packages/opencode/src/plugin/modal/models.ts:44][E: packages/opencode/src/plugin/modal/models.ts:47][E: packages/opencode/src/plugin/modal/models.ts:50][E: packages/opencode/src/plugin/modal/models.ts:51][E: packages/opencode/src/plugin/modal/models.ts:53][E: packages/opencode/src/plugin/modal/models.ts:55][E: packages/opencode/src/plugin/modal/models.ts:63][E: packages/opencode/src/plugin/modal/models.ts:69][E: packages/opencode/src/plugin/modal/models.ts:77][E: packages/opencode/src/plugin/modal/models.ts:85][E: packages/opencode/src/plugin/modal/models.ts:90][E: packages/opencode/src/plugin/modal/models.ts:113][E: packages/opencode/src/plugin/modal/models.ts:117][E: packages/opencode/src/plugin/modal/models.ts:118][E: packages/opencode/src/plugin/modal/models.ts:119][E: packages/opencode/src/plugin/modal/models.ts:120][E: packages/opencode/src/plugin/modal/models.ts:121][E: packages/opencode/src/plugin/modal/models.ts:122][E: packages/opencode/src/plugin/modal/models.ts:123][E: packages/opencode/src/plugin/modal/models.ts:124][E: packages/opencode/src/plugin/modal/models.ts:128]

experimental mode body 经 `modeOptions()` 转 camelCase;`@ai-sdk/openai` 的 `{ reasoning: { mode } }` 特别转成 `{ reasoningMode }`,避免把 nested `reasoning` 原样传给 SDK。[E: packages/opencode/src/provider/provider.ts:1277][E: packages/opencode/src/provider/provider.ts:1292][E: packages/opencode/src/provider/provider.ts:1294][E: packages/opencode/src/provider/provider.ts:1297][E: packages/opencode/src/provider/provider.ts:1298][E: packages/opencode/src/provider/provider.ts:1300]

## Merge Pipeline

1. registry 初始化时读取 config、models.dev、runtime flags,并建立 providers、language model cache、modelLoaders、varsLoaders、sdk cache、discoveryLoaders。[E: packages/opencode/src/provider/provider.ts:1332][E: packages/opencode/src/provider/provider.ts:1346][E: packages/opencode/src/provider/provider.ts:1347][E: packages/opencode/src/provider/provider.ts:1351][E: packages/opencode/src/provider/provider.ts:1352][E: packages/opencode/src/provider/provider.ts:1353][E: packages/opencode/src/provider/provider.ts:1356][E: packages/opencode/src/provider/provider.ts:1359][E: packages/opencode/src/provider/provider.ts:1360]

2. `mergeProvider` 先尝试覆盖已有 provider,否则从 models.dev database 找基础 provider 再 deep merge patch。[E: packages/opencode/src/provider/provider.ts:1370][E: packages/opencode/src/provider/provider.ts:1372][E: packages/opencode/src/provider/provider.ts:1374][E: packages/opencode/src/provider/provider.ts:1377][E: packages/opencode/src/provider/provider.ts:1380]

3. registry 先 `plugin.list()`,随后才读取 `cfg.provider`,让 plugin-derived config 有机会参与 provider config 解析。[E: packages/opencode/src/provider/provider.ts:1384][E: packages/opencode/src/provider/provider.ts:1387]

4. config 里的 disabled/enabled provider 被读成集合,`isProviderAllowed` 同时检查 whitelist 与 disabled list。[E: packages/opencode/src/provider/provider.ts:1388][E: packages/opencode/src/provider/provider.ts:1389][E: packages/opencode/src/provider/provider.ts:1391][E: packages/opencode/src/provider/provider.ts:1392][E: packages/opencode/src/provider/provider.ts:1393]

5. plugin provider model hook 可以替换 database 中已有 provider 的 models,并接收 public provider info 与 plugin auth。[E: packages/opencode/src/provider/provider.ts:1397][E: packages/opencode/src/provider/provider.ts:1399][E: packages/opencode/src/provider/provider.ts:1407][E: packages/opencode/src/provider/provider.ts:1409][E: packages/opencode/src/provider/provider.ts:1410] `toPublicInfo()` 在 JSON-safe 序列化前还会删掉不通过 V1 `Model` schema 的 model entry,避免非法 shape 进入 public hook 输入。[E: packages/opencode/src/provider/provider.ts:1079][E: packages/opencode/src/provider/provider.ts:1081][E: packages/opencode/src/provider/provider.ts:1084][E: packages/opencode/src/provider/provider.ts:1087]

6. config provider 会扩展 database:provider-level name/env/options/source/models,model-level api/capabilities/cost/options/limit/header/family/release_date 重新合成。若 npm package 与 catalog model 相同就保留 catalog variants,换 package 才重算 heuristic,之后再 merge config variants。[E: packages/opencode/src/provider/provider.ts:1427][E: packages/opencode/src/provider/provider.ts:1430][E: packages/opencode/src/provider/provider.ts:1450][E: packages/opencode/src/provider/provider.ts:1478][E: packages/opencode/src/provider/provider.ts:1508][E: packages/opencode/src/provider/provider.ts:1509][E: packages/opencode/src/provider/provider.ts:1510][E: packages/opencode/src/provider/provider.ts:1511][E: packages/opencode/src/provider/provider.ts:1512]

7. env activation 会在 provider.env 中找第一个存在的 env var;只有 provider.env 长度为 1 时才把该值写成 provider key。auth provider key 来自 `Auth.all()` 里 type 为 `api` 的条目。[E: packages/opencode/src/provider/provider.ts:1523][E: packages/opencode/src/provider/provider.ts:1527][E: packages/opencode/src/provider/provider.ts:1531][E: packages/opencode/src/provider/provider.ts:1536][E: packages/opencode/src/provider/provider.ts:1540][E: packages/opencode/src/provider/provider.ts:1543]

8. plugin auth loader 与 custom loaders 可以补 options、modelLoaders、varsLoaders、discoverModels,之后 config provider patch 会再应用一次。[E: packages/opencode/src/provider/provider.ts:1565][E: packages/opencode/src/provider/provider.ts:1566][E: packages/opencode/src/provider/provider.ts:1569][E: packages/opencode/src/provider/provider.ts:1578][E: packages/opencode/src/provider/provider.ts:1579][E: packages/opencode/src/provider/provider.ts:1580][E: packages/opencode/src/provider/provider.ts:1594]

9. 最终过滤会删除 disabled/未 allowed provider,删除特定 GPT chat alias、alpha/deprecated model、blacklist/whitelist model,仅对 `variants === undefined` 的 model 补 heuristic variants,并删除空 provider。[E: packages/opencode/src/provider/provider.ts:1611][E: packages/opencode/src/provider/provider.ts:1613][E: packages/opencode/src/provider/provider.ts:1614][E: packages/opencode/src/provider/provider.ts:1625][E: packages/opencode/src/provider/provider.ts:1631][E: packages/opencode/src/provider/provider.ts:1632][E: packages/opencode/src/provider/provider.ts:1633][E: packages/opencode/src/provider/provider.ts:1638][E: packages/opencode/src/provider/provider.ts:1640][E: packages/opencode/src/provider/provider.ts:1641][E: packages/opencode/src/provider/provider.ts:1654][E: packages/opencode/src/provider/provider.ts:1655]

## AI SDK 加载

`BUNDLED_PROVIDERS` 是 V1 内置 AI SDK factory map,包含 Anthropic/OpenAI/Azure/Google/Bedrock/OpenRouter/GitLab/GitHub Copilot/Venice 等 npm entry。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:133] 对 GitHub Copilot,内置 loader 不是第三方包,而是从 `@opencode-ai/core/github-copilot/copilot-provider` 导入 `createOpenaiCompatible`。[E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:132]

`resolveSDK` 合成 provider options:处理 Google Vertex Anthropic baseURL、openai-compatible includeUsage、baseURL env interpolation、apiKey、model headers,再按 providerID/npm/options hash 做 SDK cache。[E: packages/opencode/src/provider/provider.ts:1673][E: packages/opencode/src/provider/provider.ts:1676][E: packages/opencode/src/provider/provider.ts:1683][E: packages/opencode/src/provider/provider.ts:1694][E: packages/opencode/src/provider/provider.ts:1703][E: packages/opencode/src/provider/provider.ts:1719][E: packages/opencode/src/provider/provider.ts:1720][E: packages/opencode/src/provider/provider.ts:1721][E: packages/opencode/src/provider/provider.ts:1727]

如果 npm 在 `BUNDLED_PROVIDERS` 中,registry 调 bundled factory;否则通过 `Npm.add(model.api.npm)` 安装/解析 entrypoint,动态 import 后取第一个以 `create` 开头的 export 创建 SDK。[E: packages/opencode/src/provider/provider.ts:1770][E: packages/opencode/src/provider/provider.ts:1772][E: packages/opencode/src/provider/provider.ts:1773][E: packages/opencode/src/provider/provider.ts:1785][E: packages/opencode/src/provider/provider.ts:1786][E: packages/opencode/src/provider/provider.ts:1793][E: packages/opencode/src/provider/provider.ts:1795][E: packages/opencode/src/provider/provider.ts:1796]

`getLanguage` 以 `providerID/model.id` 缓存 `LanguageModelV3`;有 custom modelLoader 时用 loader,否则调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1835][E: packages/opencode/src/provider/provider.ts:1838][E: packages/opencode/src/provider/provider.ts:1839][E: packages/opencode/src/provider/provider.ts:1845][E: packages/opencode/src/provider/provider.ts:1855][E: packages/opencode/src/provider/provider.ts:1856]

## Custom Loader 设计动机

custom loader 是 provider-specific escape hatch,类型允许返回 `getModel`、vars、options、discoverModels,并通过 `autoload` 控制是否自动激活 provider。[E: packages/opencode/src/provider/provider.ts:140][E: packages/opencode/src/provider/provider.ts:141][E: packages/opencode/src/provider/provider.ts:142][E: packages/opencode/src/provider/provider.ts:143][E: packages/opencode/src/provider/provider.ts:144]

典型例子:

- Anthropic 注入 `anthropic-beta` header。[E: packages/opencode/src/provider/provider.ts:170][E: packages/opencode/src/provider/provider.ts:175]
- OpenAI 默认取 `sdk.responses(modelID)`,header timeout 是 300000 ms。[E: packages/opencode/src/provider/provider.ts:35][E: packages/opencode/src/provider/provider.ts:206][E: packages/opencode/src/provider/provider.ts:208]
- Meta 也用 `sdk.responses(modelID)`,但不自动激活 provider。[E: packages/opencode/src/provider/provider.ts:210][E: packages/opencode/src/provider/provider.ts:212][E: packages/opencode/src/provider/provider.ts:213][E: packages/opencode/src/provider/provider.ts:214]
- GitHub Copilot 先尊重 model API 中的 `endpoint: responses|chat`;没有 override 时,GPT-5 class model 用 Responses,但排除 `gpt-5-mini`,其他用 chat。[E: packages/opencode/src/provider/provider.ts:228][E: packages/opencode/src/provider/provider.ts:230][E: packages/opencode/src/provider/provider.ts:231][E: packages/opencode/src/provider/provider.ts:232][E: packages/opencode/src/provider/provider.ts:234][E: packages/opencode/src/provider/provider.ts:235][E: packages/opencode/src/provider/provider.ts:236]
- opencode provider 在没有 key/auth/config apiKey 时隐藏付费模型,保留免费模型并用 public api key。[E: packages/opencode/src/provider/provider.ts:185][E: packages/opencode/src/provider/provider.ts:193][E: packages/opencode/src/provider/provider.ts:199]

## 易错点

- V1 `Provider.Model.api.npm` 指向 AI SDK package,不是 native protocol id。[E: packages/opencode/src/provider/provider.ts:965][E: packages/opencode/src/provider/provider.ts:968]
- V1 registry 的 plugin hook 与 V2 `PluginV2` 不是同一套 plugin system。[I]
- `sync/README.md` 是历史设计,V1 Bus service 已不存在;当前不要从旧 Bus 文档推导 provider registry 行为。[I]
- Modal `/models` 是 best-effort discovery；缺 token、catalog 首个 model 缺 base URL、HTTP/schema error 都表现为空覆盖。静态 catalog entry 与 models 保留，但 working database copy 的 models 会被空覆盖，并可能让最终 active registry 删除 Modal provider。[E: packages/opencode/src/plugin/modal/modal.ts:10][E: packages/opencode/src/plugin/modal/modal.ts:11][E: packages/opencode/src/plugin/modal/modal.ts:13][E: packages/opencode/src/plugin/modal/models.ts:57][E: packages/opencode/src/plugin/modal/models.ts:58][E: packages/opencode/src/provider/provider.ts:1348][E: packages/opencode/src/provider/provider.ts:1349][E: packages/opencode/src/provider/provider.ts:1409][E: packages/opencode/src/provider/provider.ts:1410][E: packages/opencode/src/provider/provider.ts:1654][E: packages/opencode/src/provider/provider.ts:1655]

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

## Related
- provider.resolution
- ref.ai-sdk-provider-map
