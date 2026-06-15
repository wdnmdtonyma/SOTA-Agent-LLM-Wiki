---
id: model-layer.provider-registry-v1
title: Provider Registry V1
kind: subsystem
tier: T1
v: v1
source: [packages/opencode/src/provider/provider.ts]
symbols: [Provider.Service, BUNDLED_PROVIDERS, fromModelsDevProvider, resolveSDK, getLanguage]
related: [provider.resolution, ref.ai-sdk-provider-map]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 provider registry 是 `packages/opencode/src/provider/provider.ts` 里的 AI SDK provider/model resolver:它从 models.dev catalog、config、env、auth、plugin hooks 和 provider-specific custom loader 合成 `Provider.Info` / `Provider.Model`,再按 model 的 npm package 创建或缓存 `LanguageModelV3`。

## 能回答的问题
- V1 provider registry 的数据源按什么顺序 merge?
- bundled AI SDK provider 与动态 npm provider 如何加载?
- custom loader 负责哪些 provider-specific hack?
- config/env/auth/plugin 如何影响 provider 可见性和 model variants?
- V1 `Provider.Model` 与 V2 `ModelV2.Info` 是否同一个类型?

## 命名边界

V1 的 `Provider.Service` interface 暴露 `getProvider(): Info`、`getModel(): Model`、`getLanguage(): LanguageModelV3`。[E: packages/opencode/src/provider/provider.ts:1099][E: packages/opencode/src/provider/provider.ts:1103] 这不是 `packages/llm` 的 native `ProviderID/ModelID`,也不是 V2 core 的 `ProviderV2.Info` / `ModelV2.Info`。[E: packages/llm/src/schema/ids.ts:14][E: packages/core/src/provider.ts:48][E: packages/core/src/model.ts:56]

V1 当前活跑主线是 Vercel AI SDK path,所以这个 registry 是默认 provider path;`packages/llm` 是可选 native protocol engine seam。[I]

## 输入与 Catalog 转换

`fromModelsDevProvider` 把 models.dev provider 转成 V1 `Info`:遍历 provider.models,每个 model 调 `fromModelsDevModel`,并把 experimental modes 展开成 `${model.id}-${mode}` 的额外 model id。[E: packages/opencode/src/provider/provider.ts:1211][E: packages/opencode/src/provider/provider.ts:1212][E: packages/opencode/src/provider/provider.ts:1214]

`fromModelsDevModel` 会把 models.dev api/status/cost/limits/capabilities 等字段投影到 V1 model,最后调用 `ProviderTransform.variants(base)` 生成 variants。[E: packages/opencode/src/provider/provider.ts:1158][E: packages/opencode/src/provider/provider.ts:1205]

## Merge Pipeline

1. registry 初始化时读取 config、models.dev、runtime flags,并建立 providers、language model cache、modelLoaders、varsLoaders、sdk cache、discoveryLoaders。[E: packages/opencode/src/provider/provider.ts:1286][E: packages/opencode/src/provider/provider.ts:1301]

2. `mergeProvider` 先尝试覆盖已有 provider,否则从 models.dev database 找基础 provider 再 deep merge patch。[E: packages/opencode/src/provider/provider.ts:1311][E: packages/opencode/src/provider/provider.ts:1320]

3. registry 先 `plugin.list()`,随后才读取 `cfg.provider`,让 plugin-derived config 有机会参与 provider config 解析。[E: packages/opencode/src/provider/provider.ts:1324][E: packages/opencode/src/provider/provider.ts:1327]

4. config 里的 disabled/enabled provider 被读成集合,`isProviderAllowed` 同时检查 whitelist 与 disabled list。[E: packages/opencode/src/provider/provider.ts:1329][E: packages/opencode/src/provider/provider.ts:1333]

5. plugin provider model hook 可以替换 database 中已有 provider 的 models,并接收 public provider info 与 plugin auth。[E: packages/opencode/src/provider/provider.ts:1349][E: packages/opencode/src/provider/provider.ts:1350]

6. config provider 会扩展 database:provider-level name/env/options/source/models,model-level api/capabilities/cost/options/limit/header/family/release_date/variants 全部重新合成。[E: packages/opencode/src/provider/provider.ts:1365][E: packages/opencode/src/provider/provider.ts:1455]

7. env activation 会在 provider.env 中找第一个存在的 env var;只有 provider.env 长度为 1 时才把该值写成 provider key。auth provider key 来自 `Auth.all()` 里 type 为 `api` 的条目。[E: packages/opencode/src/provider/provider.ts:1463][E: packages/opencode/src/provider/provider.ts:1467][E: packages/opencode/src/provider/provider.ts:1472][E: packages/opencode/src/provider/provider.ts:1479]

8. plugin auth loader 与 custom loaders 可以补 options、modelLoaders、varsLoaders、discoverModels,之后 config provider patch 会再应用一次。[E: packages/opencode/src/provider/provider.ts:1485][E: packages/opencode/src/provider/provider.ts:1519][E: packages/opencode/src/provider/provider.ts:1524][E: packages/opencode/src/provider/provider.ts:1530]

9. 最终过滤会删除 disabled/未 allowed provider,删除特定 GPT chat alias、alpha/deprecated model、blacklist/whitelist model,补缺失 variants,并删除空 provider。[E: packages/opencode/src/provider/provider.ts:1549][E: packages/opencode/src/provider/provider.ts:1567][E: packages/opencode/src/provider/provider.ts:1568][E: packages/opencode/src/provider/provider.ts:1577][E: packages/opencode/src/provider/provider.ts:1591]

## AI SDK 加载

`BUNDLED_PROVIDERS` 是 V1 内置 AI SDK factory map,包含 Anthropic/OpenAI/Azure/Google/Bedrock/OpenRouter/GitLab/GitHub Copilot/Venice 等 npm entry。[E: packages/opencode/src/provider/provider.ts:107][E: packages/opencode/src/provider/provider.ts:133] 对 GitHub Copilot,内置 loader 不是第三方包,而是从 `@opencode-ai/core/github-copilot/copilot-provider` 导入 `createOpenaiCompatible`。[E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:132]

`resolveSDK` 合成 provider options:处理 Google Vertex Anthropic baseURL、openai-compatible includeUsage、baseURL env interpolation、apiKey、model headers,再按 providerID/npm/options hash 做 SDK cache。[E: packages/opencode/src/provider/provider.ts:1615][E: packages/opencode/src/provider/provider.ts:1630][E: packages/opencode/src/provider/provider.ts:1648][E: packages/opencode/src/provider/provider.ts:1656][E: packages/opencode/src/provider/provider.ts:1670]

如果 npm 在 `BUNDLED_PROVIDERS` 中,registry 调 bundled factory;否则通过 `Npm.add(model.api.npm)` 安装/解析 entrypoint,动态 import 后取第一个以 `create` 开头的 export 创建 SDK。[E: packages/opencode/src/provider/provider.ts:1706][E: packages/opencode/src/provider/provider.ts:1713][E: packages/opencode/src/provider/provider.ts:1721][E: packages/opencode/src/provider/provider.ts:1729][E: packages/opencode/src/provider/provider.ts:1731]

`getLanguage` 以 `providerID/model.id` 缓存 `LanguageModelV3`;有 custom modelLoader 时用 loader,否则调用 `sdk.languageModel(model.api.id)`。[E: packages/opencode/src/provider/provider.ts:1774][E: packages/opencode/src/provider/provider.ts:1781][E: packages/opencode/src/provider/provider.ts:1791]

## Custom Loader 设计动机

custom loader 是 provider-specific escape hatch,类型允许返回 `getModel`、vars、options、discoverModels,并通过 `autoload` 控制是否自动激活 provider。[E: packages/opencode/src/provider/provider.ts:140][E: packages/opencode/src/provider/provider.ts:144]

典型例子:

- Anthropic 注入 `anthropic-beta` header。[E: packages/opencode/src/provider/provider.ts:170][E: packages/opencode/src/provider/provider.ts:175]
- OpenAI 默认取 `sdk.responses(modelID)` 并设置 header timeout。[E: packages/opencode/src/provider/provider.ts:206][E: packages/opencode/src/provider/provider.ts:208]
- GitHub Copilot 对 GPT-5 class model 用 Responses,但排除 `gpt-5-mini`,否则用 chat。[E: packages/opencode/src/provider/provider.ts:223][E: packages/opencode/src/provider/provider.ts:225]
- opencode provider 在没有 key/auth/config apiKey 时隐藏付费模型,保留免费模型并用 public api key。[E: packages/opencode/src/provider/provider.ts:185][E: packages/opencode/src/provider/provider.ts:193][E: packages/opencode/src/provider/provider.ts:199]

## 易错点

- V1 `Provider.Model.api.npm` 指向 AI SDK package,不是 native protocol id。[E: packages/opencode/src/provider/provider.ts:1394]
- V1 registry 的 plugin hook 与 V2 `PluginV2` 不是同一套 plugin system。[I]
- `sync/README.md` 是历史设计,V1 Bus service 已不存在;当前不要从旧 Bus 文档推导 provider registry 行为。[I]

## Sources
- packages/opencode/src/provider/provider.ts

## Related
- provider.resolution
- ref.ai-sdk-provider-map
