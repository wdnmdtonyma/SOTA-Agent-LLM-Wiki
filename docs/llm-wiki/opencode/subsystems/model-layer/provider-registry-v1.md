---
id: model-layer.provider-registry-v1
title: Provider Registry V1
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/provider/provider.ts, packages/schema/src/provider.ts, packages/schema/src/model.ts, packages/llm/src/schema/ids.ts, packages/core/src/provider.ts, packages/core/src/model.ts]
symbols: [Provider.Service, BUNDLED_PROVIDERS, fromModelsDevProvider, resolveSDK, getLanguage]
related: [provider.resolution, ref.ai-sdk-provider-map]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 provider registry 是 `packages/opencode/src/provider/provider.ts` 里的 AI SDK provider/model resolver:它从 models.dev catalog、config、env、auth、plugin hooks 和 provider-specific custom loader 合成 `Provider.Info` / `Provider.Model`,再按 model 的 npm package 创建或缓存 `LanguageModelV3`。

## 能回答的问题
- V1 provider registry 的数据源按什么顺序 merge?
- bundled AI SDK provider 与动态 npm provider 如何加载?
- custom loader 负责哪些 provider-specific hack?
- config/env/auth/plugin 如何影响 provider 可见性和 model variants?
- V1 `Provider.Model` 与 V2 `ModelV2.Info` 是否同一个类型?

## 命名边界

V1 的 `Provider.Service` interface 暴露 `getProvider(): Info`、`getModel(): Model`、`getLanguage(): LanguageModelV3`。[E: packages/opencode/src/provider/provider.ts:1131][E: packages/opencode/src/provider/provider.ts:1132][E: packages/opencode/src/provider/provider.ts:1133] 这不是 `packages/llm` 的 native `ProviderID/ModelID`,也不是 V2 core 的 `ProviderV2.Info` / `ModelV2.Info`。[E: packages/llm/src/schema/ids.ts:14][E: packages/llm/src/schema/ids.ts:17][E: packages/schema/src/provider.ts:53][E: packages/schema/src/model.ts:60]

V1 当前活跑主线是 Vercel AI SDK path,所以这个 registry 是默认 provider path;`packages/llm` 是可选 native protocol engine seam。[I]

## 输入与 Catalog 转换

`fromModelsDevProvider` 把 models.dev provider 转成 V1 `Info`:遍历 provider.models,每个 model 调 `fromModelsDevModel`,并把 experimental modes 展开成 `${model.id}-${mode}` 的额外 model id。[E: packages/opencode/src/provider/provider.ts:1239][E: packages/opencode/src/provider/provider.ts:1241][E: packages/opencode/src/provider/provider.ts:1242][E: packages/opencode/src/provider/provider.ts:1243][E: packages/opencode/src/provider/provider.ts:1244]

`fromModelsDevModel` 会把 models.dev api/status/cost/limits/capabilities 等字段投影到 V1 model,最后调用 `ProviderTransform.variants(base)` 生成 variants。[E: packages/opencode/src/provider/provider.ts:1188][E: packages/opencode/src/provider/provider.ts:1194][E: packages/opencode/src/provider/provider.ts:1199][E: packages/opencode/src/provider/provider.ts:1202][E: packages/opencode/src/provider/provider.ts:1203][E: packages/opencode/src/provider/provider.ts:1208][E: packages/opencode/src/provider/provider.ts:1235]

## Merge Pipeline

1. registry 初始化时读取 config、models.dev、runtime flags,并建立 providers、language model cache、modelLoaders、varsLoaders、sdk cache、discoveryLoaders。[E: packages/opencode/src/provider/provider.ts:1302][E: packages/opencode/src/provider/provider.ts:1316][E: packages/opencode/src/provider/provider.ts:1317][E: packages/opencode/src/provider/provider.ts:1321][E: packages/opencode/src/provider/provider.ts:1322][E: packages/opencode/src/provider/provider.ts:1323][E: packages/opencode/src/provider/provider.ts:1326][E: packages/opencode/src/provider/provider.ts:1329][E: packages/opencode/src/provider/provider.ts:1330]

2. `mergeProvider` 先尝试覆盖已有 provider,否则从 models.dev database 找基础 provider 再 deep merge patch。[E: packages/opencode/src/provider/provider.ts:1340][E: packages/opencode/src/provider/provider.ts:1342][E: packages/opencode/src/provider/provider.ts:1344][E: packages/opencode/src/provider/provider.ts:1347][E: packages/opencode/src/provider/provider.ts:1350]

3. registry 先 `plugin.list()`,随后才读取 `cfg.provider`,让 plugin-derived config 有机会参与 provider config 解析。[E: packages/opencode/src/provider/provider.ts:1354][E: packages/opencode/src/provider/provider.ts:1357]

4. config 里的 disabled/enabled provider 被读成集合,`isProviderAllowed` 同时检查 whitelist 与 disabled list。[E: packages/opencode/src/provider/provider.ts:1358][E: packages/opencode/src/provider/provider.ts:1359][E: packages/opencode/src/provider/provider.ts:1361][E: packages/opencode/src/provider/provider.ts:1362][E: packages/opencode/src/provider/provider.ts:1363]

5. plugin provider model hook 可以替换 database 中已有 provider 的 models,并接收 public provider info 与 plugin auth。[E: packages/opencode/src/provider/provider.ts:1367][E: packages/opencode/src/provider/provider.ts:1369][E: packages/opencode/src/provider/provider.ts:1377][E: packages/opencode/src/provider/provider.ts:1379][E: packages/opencode/src/provider/provider.ts:1380]

6. config provider 会扩展 database:provider-level name/env/options/source/models,model-level api/capabilities/cost/options/limit/header/family/release_date/variants 全部重新合成。[E: packages/opencode/src/provider/provider.ts:1397][E: packages/opencode/src/provider/provider.ts:1400][E: packages/opencode/src/provider/provider.ts:1401][E: packages/opencode/src/provider/provider.ts:1402][E: packages/opencode/src/provider/provider.ts:1403][E: packages/opencode/src/provider/provider.ts:1420][E: packages/opencode/src/provider/provider.ts:1478]

7. env activation 会在 provider.env 中找第一个存在的 env var;只有 provider.env 长度为 1 时才把该值写成 provider key。auth provider key 来自 `Auth.all()` 里 type 为 `api` 的条目。[E: packages/opencode/src/provider/provider.ts:1489][E: packages/opencode/src/provider/provider.ts:1493][E: packages/opencode/src/provider/provider.ts:1497][E: packages/opencode/src/provider/provider.ts:1502][E: packages/opencode/src/provider/provider.ts:1506][E: packages/opencode/src/provider/provider.ts:1509]

8. plugin auth loader 与 custom loaders 可以补 options、modelLoaders、varsLoaders、discoverModels,之后 config provider patch 会再应用一次。[E: packages/opencode/src/provider/provider.ts:1531][E: packages/opencode/src/provider/provider.ts:1532][E: packages/opencode/src/provider/provider.ts:1535][E: packages/opencode/src/provider/provider.ts:1544][E: packages/opencode/src/provider/provider.ts:1545][E: packages/opencode/src/provider/provider.ts:1546][E: packages/opencode/src/provider/provider.ts:1560]

9. 最终过滤会删除 disabled/未 allowed provider,删除特定 GPT chat alias、alpha/deprecated model、blacklist/whitelist model,补缺失 variants,并删除空 provider。[E: packages/opencode/src/provider/provider.ts:1577][E: packages/opencode/src/provider/provider.ts:1579][E: packages/opencode/src/provider/provider.ts:1580][E: packages/opencode/src/provider/provider.ts:1591][E: packages/opencode/src/provider/provider.ts:1597][E: packages/opencode/src/provider/provider.ts:1598][E: packages/opencode/src/provider/provider.ts:1599][E: packages/opencode/src/provider/provider.ts:1604][E: packages/opencode/src/provider/provider.ts:1606][E: packages/opencode/src/provider/provider.ts:1620][E: packages/opencode/src/provider/provider.ts:1621]

## AI SDK 加载

`BUNDLED_PROVIDERS` 是 V1 内置 AI SDK factory map,包含 Anthropic/OpenAI/Azure/Google/Bedrock/OpenRouter/GitLab/GitHub Copilot/Venice 等 npm entry。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:133] 对 GitHub Copilot,内置 loader 不是第三方包,而是从 `@opencode-ai/core/github-copilot/copilot-provider` 导入 `createOpenaiCompatible`。[E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:132]

`resolveSDK` 合成 provider options:处理 Google Vertex Anthropic baseURL、openai-compatible includeUsage、baseURL env interpolation、apiKey、model headers,再按 providerID/npm/options hash 做 SDK cache。[E: packages/opencode/src/provider/provider.ts:1639][E: packages/opencode/src/provider/provider.ts:1642][E: packages/opencode/src/provider/provider.ts:1649][E: packages/opencode/src/provider/provider.ts:1660][E: packages/opencode/src/provider/provider.ts:1669][E: packages/opencode/src/provider/provider.ts:1685][E: packages/opencode/src/provider/provider.ts:1686][E: packages/opencode/src/provider/provider.ts:1687][E: packages/opencode/src/provider/provider.ts:1693]

如果 npm 在 `BUNDLED_PROVIDERS` 中,registry 调 bundled factory;否则通过 `Npm.add(model.api.npm)` 安装/解析 entrypoint,动态 import 后取第一个以 `create` 开头的 export 创建 SDK。[E: packages/opencode/src/provider/provider.ts:1736][E: packages/opencode/src/provider/provider.ts:1738][E: packages/opencode/src/provider/provider.ts:1739][E: packages/opencode/src/provider/provider.ts:1751][E: packages/opencode/src/provider/provider.ts:1752][E: packages/opencode/src/provider/provider.ts:1759][E: packages/opencode/src/provider/provider.ts:1761][E: packages/opencode/src/provider/provider.ts:1762]

`getLanguage` 以 `providerID/model.id` 缓存 `LanguageModelV3`;有 custom modelLoader 时用 loader,否则调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1801][E: packages/opencode/src/provider/provider.ts:1804][E: packages/opencode/src/provider/provider.ts:1805][E: packages/opencode/src/provider/provider.ts:1811][E: packages/opencode/src/provider/provider.ts:1821][E: packages/opencode/src/provider/provider.ts:1822]

## Custom Loader 设计动机

custom loader 是 provider-specific escape hatch,类型允许返回 `getModel`、vars、options、discoverModels,并通过 `autoload` 控制是否自动激活 provider。[E: packages/opencode/src/provider/provider.ts:140][E: packages/opencode/src/provider/provider.ts:141][E: packages/opencode/src/provider/provider.ts:142][E: packages/opencode/src/provider/provider.ts:143][E: packages/opencode/src/provider/provider.ts:144]

典型例子:

- Anthropic 注入 `anthropic-beta` header。[E: packages/opencode/src/provider/provider.ts:170][E: packages/opencode/src/provider/provider.ts:175]
- OpenAI 默认取 `sdk.responses(modelID)` 并设置 header timeout。[E: packages/opencode/src/provider/provider.ts:206][E: packages/opencode/src/provider/provider.ts:208]
- GitHub Copilot 对 GPT-5 class model 用 Responses,但排除 `gpt-5-mini`,否则用 chat。[E: packages/opencode/src/provider/provider.ts:223][E: packages/opencode/src/provider/provider.ts:225]
- opencode provider 在没有 key/auth/config apiKey 时隐藏付费模型,保留免费模型并用 public api key。[E: packages/opencode/src/provider/provider.ts:185][E: packages/opencode/src/provider/provider.ts:193][E: packages/opencode/src/provider/provider.ts:199]

## 易错点

- V1 `Provider.Model.api.npm` 指向 AI SDK package,不是 native protocol id。[E: packages/opencode/src/provider/provider.ts:952][E: packages/opencode/src/provider/provider.ts:955]
- V1 registry 的 plugin hook 与 V2 `PluginV2` 不是同一套 plugin system。[I]
- `sync/README.md` 是历史设计,V1 Bus service 已不存在;当前不要从旧 Bus 文档推导 provider registry 行为。[I]

## Sources
- packages/opencode/src/provider/provider.ts
- packages/schema/src/provider.ts
- packages/schema/src/model.ts
- packages/llm/src/schema/ids.ts
- packages/core/src/provider.ts
- packages/core/src/model.ts

## Related
- provider.resolution
- ref.ai-sdk-provider-map
