---
id: model-layer.model-catalog-v2
title: Model Catalog V2
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/catalog.ts, packages/core/src/provider.ts, packages/core/src/model.ts, packages/schema/src/provider.ts, packages/schema/src/model.ts, packages/core/src/plugin/provider/, packages/core/src/plugin/provider.ts, packages/core/src/plugin/internal.ts, packages/core/src/plugin.ts, packages/core/src/plugin/models-dev.ts, packages/core/src/config/plugin/provider.ts, packages/core/src/integration.ts, packages/opencode/src/provider/provider.ts, packages/llm/src/schema/ids.ts, specs/v2/provider-model.md, specs/v2/provider-policy.md]
symbols: [Catalog.Service, ProviderV2.Info, ModelV2.Info, ProviderPlugins, ModelsDevPlugin, ConfigProviderPlugin, ProviderPolicy, Integration.Service]
related: [plugin-api.v2-hooks, provider.catalog, integrations.integration-v2]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 model catalog 是 plugin-ordered provider/model registry:provider plugins、models.dev、config provider plugin、integration connection availability 和 provider policy 一起构造 `ProviderV2.Info` / `ModelV2.Info`,再由 catalog API 提供 provider/model get/all/available/default/small 查询。`packages/core/src/provider.ts` 与 `packages/core/src/model.ts` 现在 re-export `@opencode-ai/schema` 的 provider/model schema。

## 能回答的问题
- V2 provider/model schema 与 V1 registry 有什么不同?
- ProviderPlugins 以什么顺序注册?
- models.dev 与 config provider plugin 分别写哪些字段?
- Integration connection 如何影响 provider availability?
- provider policy 在 catalog lifecycle 的哪个阶段生效?

## V2 Schema

`ProviderV2.ID` 是 branded string,内置 well-known providers 包含 opencode/anthropic/openai/google/google-vertex/github-copilot/amazon-bedrock/azure/openrouter/mistral/gitlab。[E: packages/schema/src/provider.ts:8][E: packages/schema/src/provider.ts:11][E: packages/schema/src/provider.ts:21]

`ProviderV2.Api` 分成 `aisdk` 与 `native`:AI SDK api 有 package/url/settings,native api 有 url/settings。[E: packages/schema/src/provider.ts:27][E: packages/schema/src/provider.ts:35][E: packages/schema/src/provider.ts:41] `ProviderV2.Info` 字段是 id/integrationID/name/disabled/api/request；空 provider 默认 native api 与空 request。[E: packages/schema/src/provider.ts:53][E: packages/schema/src/provider.ts:55][E: packages/schema/src/provider.ts:57][E: packages/schema/src/provider.ts:58][E: packages/schema/src/provider.ts:59][E: packages/schema/src/provider.ts:64][E: packages/schema/src/provider.ts:68][E: packages/schema/src/provider.ts:69]

`ModelV2.Info` 字段覆盖 id/providerID/family/name/api/capabilities/request/variants/time/cost/status/enabled/limit。[E: packages/schema/src/model.ts:60][E: packages/schema/src/model.ts:63][E: packages/schema/src/model.ts:79][E: packages/schema/src/model.ts:80][E: packages/schema/src/model.ts:81][E: packages/schema/src/model.ts:82][E: packages/schema/src/model.ts:84] `ModelV2.Api` 也分 aisdk/native,并带 model-level api id。[E: packages/schema/src/model.ts:45][E: packages/schema/src/model.ts:47][E: packages/schema/src/model.ts:50][E: packages/schema/src/model.ts:55]

命名陷阱:V2 `ProviderV2.Info` / `ModelV2.Info`、V1 `Provider.Info` / `Provider.Model`、`packages/llm` 的 `ProviderID` 是三套 schema/type 命名。[E: packages/schema/src/provider.ts:53][E: packages/schema/src/model.ts:60][E: packages/opencode/src/provider/provider.ts:1018][E: packages/opencode/src/provider/provider.ts:1035][E: packages/llm/src/schema/ids.ts:17] 它们不能混用。[I]

## Plugin Order

`ProviderPlugins` array 在 `packages/core/src/plugin/provider.ts` 中按源码顺序列出 34 个 provider plugin,从 Alibaba/AmazonBedrock/Anthropic 开始,到 XAI/Zenmux/DynamicProvider 结束。[E: packages/core/src/plugin/provider.ts:36][E: packages/core/src/plugin/provider.ts:37][E: packages/core/src/plugin/provider.ts:70]

boot 阶段在 `PluginInternal.boot` span 内批量添加 built-in plugins:ConfigReference、Agent、Command、Skill、ModelsDev、ConfigAgent/ConfigCommand/ConfigSkill、`ProviderPlugins`、ConfigExternal、ConfigProvider、Variant；provider plugins 的相对顺序仍来自 `ProviderPlugins` 数组。[E: packages/core/src/plugin/internal.ts:108][E: packages/core/src/plugin/internal.ts:110][E: packages/core/src/plugin/internal.ts:111][E: packages/core/src/plugin/internal.ts:112][E: packages/core/src/plugin/internal.ts:113][E: packages/core/src/plugin/internal.ts:114][E: packages/core/src/plugin/internal.ts:115][E: packages/core/src/plugin/internal.ts:116][E: packages/core/src/plugin/internal.ts:117][E: packages/core/src/plugin/internal.ts:118][E: packages/core/src/plugin/internal.ts:119][E: packages/core/src/plugin/internal.ts:120][E: packages/core/src/plugin/internal.ts:121][E: packages/core/src/plugin/internal.ts:123]

`PluginInternal.add` 为每个 built-in plugin 包装依赖后调用 `PluginV2.Service.add`；`ProviderPlugins` 的循环使用 `for (const item of ProviderPlugins)`，因此 provider plugin add 顺序就是数组顺序。[E: packages/core/src/plugin/internal.ts:81][E: packages/core/src/plugin/internal.ts:105][E: packages/core/src/plugin/internal.ts:118]

## Catalog Lifecycle

Catalog layer 依赖 Event、Policy、Integration；provider/model mutation 通过 `State.Transformable<Draft>` 暴露给 plugins 调用 `ctx.catalog.transform(...)`。[E: packages/core/src/catalog.ts:8][E: packages/core/src/catalog.ts:9][E: packages/core/src/catalog.ts:11][E: packages/core/src/catalog.ts:47][E: packages/core/src/catalog.ts:67][E: packages/core/src/catalog.ts:68][E: packages/core/src/catalog.ts:69]

state editor 可以 provider.update/remove、model.update/remove、default.set;missing provider/model 时会用 `ProviderV2.Info.empty` 与 `ModelV2.Info.empty` 初始化 record。[E: packages/core/src/catalog.ts:29][E: packages/core/src/catalog.ts:33][E: packages/core/src/catalog.ts:34][E: packages/core/src/catalog.ts:38][E: packages/core/src/catalog.ts:39][E: packages/core/src/catalog.ts:42][E: packages/core/src/catalog.ts:116][E: packages/core/src/catalog.ts:140]

finalize 阶段如果有 policy statements,会对每个 provider 评估 `provider.use`,deny 时删除 provider,最后发布 `catalog.updated`。[E: packages/core/src/catalog.ts:160][E: packages/core/src/catalog.ts:161][E: packages/core/src/catalog.ts:162][E: packages/core/src/catalog.ts:163][E: packages/core/src/catalog.ts:164][E: packages/core/src/catalog.ts:168]

Catalog 当前不再订阅 `PluginV2.Event.Added`；catalog 变化来自 plugin effect 主动调用 `ctx.catalog.transform(...)`，例如 ModelsDevPlugin 和 ConfigProviderPlugin 都直接调用 catalog transform。[E: packages/core/src/plugin/models-dev.ts:142][E: packages/core/src/config/plugin/provider.ts:41][I]

## Data Sources

`ModelsDevPlugin` 通过 plugin context 使用 Integration、Catalog、ModelsDev、Event；refresh 时先为有 env 的 provider 注册 integration key/env methods,再把 models.dev provider/model 写入 catalog。[E: packages/core/src/plugin/models-dev.ts:119][E: packages/core/src/plugin/models-dev.ts:122][E: packages/core/src/plugin/models-dev.ts:123][E: packages/core/src/plugin/models-dev.ts:124][E: packages/core/src/plugin/models-dev.ts:128][E: packages/core/src/plugin/models-dev.ts:131][E: packages/core/src/plugin/models-dev.ts:135][E: packages/core/src/plugin/models-dev.ts:142][E: packages/core/src/plugin/models-dev.ts:178]

models.dev provider 写 name/api,有 npm 时是 aisdk api,无 npm 时是 native api；env names 现在通过 Integration methods 表达而不是 ProviderV2.Info 字段。[E: packages/core/src/plugin/models-dev.ts:147][E: packages/core/src/plugin/models-dev.ts:148][E: packages/core/src/plugin/models-dev.ts:149][E: packages/core/src/plugin/models-dev.ts:155][E: packages/core/src/plugin/models-dev.ts:128][E: packages/core/src/plugin/models-dev.ts:137][E: packages/schema/src/provider.ts:53][E: packages/schema/src/provider.ts:55][E: packages/schema/src/provider.ts:59] model 写 name/family/api/capabilities/variants/release/cost/status/enabled/limit。[E: packages/core/src/plugin/models-dev.ts:85][E: packages/core/src/plugin/models-dev.ts:86][E: packages/core/src/plugin/models-dev.ts:87][E: packages/core/src/plugin/models-dev.ts:100][E: packages/core/src/plugin/models-dev.ts:105][E: packages/core/src/plugin/models-dev.ts:106][E: packages/core/src/plugin/models-dev.ts:107][E: packages/core/src/plugin/models-dev.ts:108][E: packages/core/src/plugin/models-dev.ts:109][E: packages/core/src/plugin/models-dev.ts:110]

ConfigProviderPlugin 读取 config entries,先把 configured provider env 写入 Integration env methods，再处理 configured default model 和 config `providers` 的 catalog overrides；provider 可覆盖 name/api/request,model 可以覆盖 family/name/api/capabilities/request/variants/cost/enabled/limit。[E: packages/core/src/config/plugin/provider.ts:13][E: packages/core/src/config/plugin/provider.ts:23][E: packages/core/src/config/plugin/provider.ts:30][E: packages/core/src/config/plugin/provider.ts:41][E: packages/core/src/config/plugin/provider.ts:45][E: packages/core/src/config/plugin/provider.ts:48][E: packages/core/src/config/plugin/provider.ts:53][E: packages/core/src/config/plugin/provider.ts:55][E: packages/core/src/config/plugin/provider.ts:56][E: packages/core/src/config/plugin/provider.ts:62][E: packages/core/src/config/plugin/provider.ts:63][E: packages/core/src/config/plugin/provider.ts:64][E: packages/core/src/config/plugin/provider.ts:65][E: packages/core/src/config/plugin/provider.ts:66][E: packages/core/src/config/plugin/provider.ts:73][E: packages/core/src/config/plugin/provider.ts:78][E: packages/core/src/config/plugin/provider.ts:93][E: packages/core/src/config/plugin/provider.ts:104][E: packages/core/src/config/plugin/provider.ts:105]

Provider availability 在 catalog `available(provider, integration)` helper 中完成:provider disabled 时 false；request body 已有 apiKey 时 true；已有 Integration connection 时 true；没有 `integrationID` 且没有对应 integration 时也视为 available。[E: packages/core/src/catalog.ts:71][E: packages/core/src/catalog.ts:72][E: packages/core/src/catalog.ts:73][E: packages/core/src/catalog.ts:74][E: packages/core/src/catalog.ts:75]

model resolve 会让 native model 在没有 url/settings 时继承 provider api,让 AI SDK model 合并 provider api url/settings,并把 provider request 与 model request merge。[E: packages/core/src/catalog.ts:78][E: packages/core/src/catalog.ts:80][E: packages/core/src/catalog.ts:82][E: packages/core/src/catalog.ts:87][E: packages/core/src/catalog.ts:88][E: packages/core/src/catalog.ts:89][E: packages/core/src/catalog.ts:92]

## Query API

provider API 提供 get/all/available,available 结合 provider disabled、request apiKey 和 Integration connections 过滤。[E: packages/core/src/catalog.ts:48][E: packages/core/src/catalog.ts:49][E: packages/core/src/catalog.ts:50][E: packages/core/src/catalog.ts:51][E: packages/core/src/catalog.ts:184][E: packages/core/src/catalog.ts:185][E: packages/core/src/catalog.ts:187] model API 提供 get/all/available/default/small,model.available 要求 provider available 且 model.enabled。[E: packages/core/src/catalog.ts:53][E: packages/core/src/catalog.ts:54][E: packages/core/src/catalog.ts:55][E: packages/core/src/catalog.ts:56][E: packages/core/src/catalog.ts:57][E: packages/core/src/catalog.ts:58][E: packages/core/src/catalog.ts:210][E: packages/core/src/catalog.ts:212]

default model 先检查 configured default provider/model 是否仍 enabled,否则取 available models 中 release time 最新的一个。[E: packages/core/src/catalog.ts:215][E: packages/core/src/catalog.ts:218][E: packages/core/src/catalog.ts:219][E: packages/core/src/catalog.ts:220][E: packages/core/src/catalog.ts:221][E: packages/core/src/catalog.ts:227][E: packages/core/src/catalog.ts:228]

small model 对 opencode provider 优先 `gpt-5-nano`;否则先过滤 active/enabled/text input/output/cost/release age,用 small-name regex 优先 small 候选,最后按 cost/age 加权分数排序。[E: packages/core/src/catalog.ts:234][E: packages/core/src/catalog.ts:244][E: packages/core/src/catalog.ts:245][E: packages/core/src/catalog.ts:249][E: packages/core/src/catalog.ts:253][E: packages/core/src/catalog.ts:255][E: packages/core/src/catalog.ts:256][E: packages/core/src/catalog.ts:257][E: packages/core/src/catalog.ts:263][E: packages/core/src/catalog.ts:265][E: packages/core/src/catalog.ts:273][E: packages/core/src/catalog.ts:282]

## 设计动机

`specs/v2/provider-model.md` 的设计稿把 provider/model catalog 组织为 plugin order、built-in plugins 与 plugin hooks 三块。[E: specs/v2/provider-model.md:347][E: specs/v2/provider-model.md:360][E: specs/v2/provider-model.md:390] 源码当前以 `ProviderPlugins` + `PluginInternal.boot` order + plugin-triggered `catalog.transform` 实现相同方向。[E: packages/core/src/plugin/provider.ts:36][E: packages/core/src/plugin/internal.ts:108][E: packages/core/src/plugin/internal.ts:118][E: packages/core/src/plugin/models-dev.ts:142][I]

`provider-policy.md` 定义 `provider.use` policy action,目标是对所有来源的 providers 生效,并且 plugins 不能 override policy denial。[E: specs/v2/provider-policy.md:10][E: specs/v2/provider-policy.md:19][E: specs/v2/provider-policy.md:200][E: specs/v2/provider-policy.md:227][E: specs/v2/provider-policy.md:233]

## 易错点

- provider plugin 顺序来自 `ProviderPlugins` array 与 boot loop。[E: packages/core/src/plugin/provider.ts:36][E: packages/core/src/plugin/internal.ts:118] 这不是按 provider id 字母排序。[I]
- V2 provider 使用 optional `disabled`，V2 model 使用 boolean `enabled`；不要把两者混成一个 provider-level `enabled` source 字段。[E: packages/schema/src/provider.ts:57][E: packages/schema/src/model.ts:80]
- V2 catalog query 不再直接投影明文 credential；availability 通过 Integration connection map 判断，credential material 由 downstream model resolution/auth path 处理。[E: packages/core/src/catalog.ts:71][E: packages/core/src/catalog.ts:185][E: packages/core/src/catalog.ts:187][I]

## Sources
- packages/core/src/catalog.ts
- packages/core/src/provider.ts
- packages/core/src/model.ts
- packages/schema/src/provider.ts
- packages/schema/src/model.ts
- packages/core/src/plugin/provider/
- packages/core/src/plugin/provider.ts
- packages/core/src/plugin/internal.ts
- packages/core/src/plugin.ts
- packages/core/src/plugin/models-dev.ts
- packages/core/src/config/plugin/provider.ts
- packages/core/src/integration.ts
- packages/opencode/src/provider/provider.ts
- packages/llm/src/schema/ids.ts
- specs/v2/provider-model.md
- specs/v2/provider-policy.md

## Related
- plugin-api.v2-hooks
- provider.catalog
