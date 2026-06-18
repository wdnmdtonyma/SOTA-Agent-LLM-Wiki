---
id: model-layer.model-catalog-v2
title: Model Catalog V2
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/catalog.ts, packages/core/src/provider.ts, packages/core/src/model.ts, packages/core/src/plugin/provider/, packages/core/src/plugin/provider.ts, packages/core/src/plugin/boot.ts, packages/core/src/plugin/models-dev.ts, packages/core/src/config/plugin/provider.ts, packages/core/src/integration.ts, packages/opencode/src/provider/provider.ts, packages/llm/src/schema/ids.ts, specs/v2/provider-model.md, specs/v2/provider-policy.md]
symbols: [Catalog.Service, ProviderV2.Info, ModelV2.Info, ProviderPlugins, ModelsDevPlugin, ConfigProviderPlugin, ProviderPolicy, Integration.Service]
related: [plugin-api.v2-hooks, provider.catalog, integrations.integration-v2]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 model catalog 是 plugin-ordered provider/model registry:provider plugins、models.dev、config provider plugin、integration connection availability 和 provider policy 一起构造 `ProviderV2.Info` / `ModelV2.Info`,再由 catalog API 提供 provider/model get/all/available/default/small 查询。

## 能回答的问题
- V2 provider/model schema 与 V1 registry 有什么不同?
- ProviderPlugins 以什么顺序注册?
- models.dev 与 config provider plugin 分别写哪些字段?
- Integration connection 如何影响 provider availability?
- provider policy 在 catalog lifecycle 的哪个阶段生效?

## V2 Schema

`ProviderV2.ID` 是 branded string,内置 well-known providers 包含 opencode/anthropic/openai/google/google-vertex/github-copilot/amazon-bedrock/azure/openrouter/mistral/gitlab。[E: packages/core/src/provider.ts:7][E: packages/core/src/provider.ts:20]

`ProviderV2.Api` 分成 `aisdk` 与 `native`:AI SDK api 有 package/url/settings,native api 有 url/settings。[E: packages/core/src/provider.ts:25][E: packages/core/src/provider.ts:38] `ProviderV2.Info` 字段是 id/name/enabled/env/api/request,enabled 可以是 false、env、credential 或 custom。[E: packages/core/src/provider.ts:47][E: packages/core/src/provider.ts:51][E: packages/core/src/provider.ts:63][E: packages/core/src/provider.ts:52]

`ModelV2.Info` 字段覆盖 id/providerID/family/name/api/capabilities/request/variants/time/cost/status/enabled/limit。[E: packages/core/src/model.ts:56][E: packages/core/src/model.ts:80] `ModelV2.Api` 也分 aisdk/native,并带 model-level api id。[E: packages/core/src/model.ts:44][E: packages/core/src/model.ts:46][E: packages/core/src/model.ts:50]

命名陷阱:V2 `ProviderV2.Info` / `ModelV2.Info`、V1 `Provider.Info` / `Provider.Model`、`packages/llm` 的 `ProviderID` 是三套 schema/type 命名。[E: packages/core/src/provider.ts:47][E: packages/core/src/model.ts:56][E: packages/opencode/src/provider/provider.ts:1018][E: packages/opencode/src/provider/provider.ts:1035][E: packages/llm/src/schema/ids.ts:14] 它们不能混用。[I]

## Plugin Order

`ProviderPlugins` array 在 `packages/core/src/plugin/provider.ts` 中按源码顺序列出 34 个 provider plugin,从 Alibaba/AmazonBedrock/Anthropic 开始,到 XAI/Zenmux/DynamicProvider 结束。[E: packages/core/src/plugin/provider.ts:34][E: packages/core/src/plugin/provider.ts:68]

boot 阶段先添加 Env/Agent/Command/Skill plugins,然后按 `ProviderPlugins` 数组顺序逐个 add provider plugin,再 add ModelsDevPlugin 与 ConfigProviderPlugin。[E: packages/core/src/plugin/boot.ts:100][E: packages/core/src/plugin/boot.ts:108]

`PluginV2.add` 替换同 id hook 后把 hook append 到 hooks array,`triggerFor` 用 `for (const item of hooks)` 顺序执行 matching hook。[E: packages/core/src/plugin.ts:105][E: packages/core/src/plugin.ts:124][E: packages/core/src/plugin.ts:149][E: packages/core/src/plugin.ts:153]

## Catalog Lifecycle

Catalog layer 依赖 Location、Plugin、Event、Policy、Integration、Scope。[E: packages/core/src/catalog.ts:88][E: packages/core/src/catalog.ts:93][E: packages/core/src/catalog.ts:94]

state editor 可以 provider.update/remove、model.update/remove、default.set;missing provider/model 时会用 `ProviderV2.Info.empty` 与 `ModelV2.Info.empty` 初始化 record。[E: packages/core/src/catalog.ts:135][E: packages/core/src/catalog.ts:169]

finalize 阶段在 reason 不是 `plugin.added` 时触发 `catalog.transform`;然后如果有 policy statements,会对每个 provider 评估 `provider.use`,deny 时删除 provider。[E: packages/core/src/catalog.ts:189][E: packages/core/src/catalog.ts:191][E: packages/core/src/catalog.ts:193][E: packages/core/src/catalog.ts:194]

Catalog 还订阅 `PluginV2.Event.Added`;同 location 的 plugin added 会触发 `plugin.triggerFor(event.data.id, "catalog.transform", catalog, {})`,让新增 plugin 只跑自己的 transform。[E: packages/core/src/catalog.ts:201][E: packages/core/src/catalog.ts:208]

## Data Sources

`ModelsDevPlugin` 同时拿 Catalog、Integration、ModelsDev、Event、Scope;refresh 时先为有 env 的 provider 注册 integration key/env methods,再把 models.dev provider/model 写入 catalog。[E: packages/core/src/plugin/models-dev.ts:54][E: packages/core/src/plugin/models-dev.ts:58][E: packages/core/src/plugin/models-dev.ts:63][E: packages/core/src/plugin/models-dev.ts:69][E: packages/core/src/plugin/models-dev.ts:71][E: packages/core/src/plugin/models-dev.ts:75][E: packages/core/src/plugin/models-dev.ts:81][E: packages/core/src/plugin/models-dev.ts:127]

models.dev provider 写 name/env/api,有 npm 时是 aisdk api,无 npm 时是 native api。[E: packages/core/src/plugin/models-dev.ts:84][E: packages/core/src/plugin/models-dev.ts:95] model 写 name/family/api/capabilities/variants/release/cost/status/enabled/limit。[E: packages/core/src/plugin/models-dev.ts:99][E: packages/core/src/plugin/models-dev.ts:130]

ConfigProviderPlugin 读取 config entries,先处理 configured default model,再把 config `providers` 写入 catalog;configured provider entry 会把 provider 标成 `{ via: "custom" }`,并可覆盖 name/env/api/request,model 可以覆盖 family/name/api/capabilities/request/variants/cost/enabled/limit。[E: packages/core/src/config/plugin/provider.ts:45][E: packages/core/src/config/plugin/provider.ts:49][E: packages/core/src/config/plugin/provider.ts:55][E: packages/core/src/config/plugin/provider.ts:32][E: packages/core/src/config/plugin/provider.ts:56][E: packages/core/src/config/plugin/provider.ts:59][E: packages/core/src/config/plugin/provider.ts:65][E: packages/core/src/config/plugin/provider.ts:116]

Provider availability 在 catalog `available(provider, integration, connected)` helper 中完成:provider disabled 时 false；request body 已有 apiKey 时 true；已有 Integration connection 时 true；没有对应 integration 时也视为 available。[E: packages/core/src/catalog.ts:96][E: packages/core/src/catalog.ts:97][E: packages/core/src/catalog.ts:98][E: packages/core/src/catalog.ts:99][E: packages/core/src/catalog.ts:100]

model resolve 会让 native model 在没有 url/settings 时继承 provider api,让 AI SDK model 合并 provider api url/settings,并把 provider request 与 model request merge。[E: packages/core/src/catalog.ts:103][E: packages/core/src/catalog.ts:112][E: packages/core/src/catalog.ts:116]

## Query API

provider API 提供 get/all/available,available 结合 provider disabled、request apiKey 和 Integration connections 过滤。[E: packages/core/src/catalog.ts:216][E: packages/core/src/catalog.ts:226][E: packages/core/src/catalog.ts:227][E: packages/core/src/catalog.ts:228] model API 提供 get/all/available/default/small,model.available 要求 provider available 且 model.enabled。[E: packages/core/src/catalog.ts:239][E: packages/core/src/catalog.ts:253][E: packages/core/src/catalog.ts:262][E: packages/core/src/catalog.ts:282]

default model 先检查 configured default provider/model 是否仍 enabled,否则取 available models 中 release time 最新的一个。[E: packages/core/src/catalog.ts:262][E: packages/core/src/catalog.ts:271][E: packages/core/src/catalog.ts:277]

small model 对 opencode provider 优先 `gpt-5-nano`;否则先过滤 active/enabled/text input/output/cost/release age,用 small-name regex 优先 small 候选,最后按 cost/age 加权分数排序。[E: packages/core/src/catalog.ts:282][E: packages/core/src/catalog.ts:300][E: packages/core/src/catalog.ts:296][E: packages/core/src/catalog.ts:308][E: packages/core/src/catalog.ts:306][E: packages/core/src/catalog.ts:324][E: packages/core/src/catalog.ts:316]

## 设计动机

`specs/v2/provider-model.md` 的设计稿把 provider/model catalog 组织为 plugin order、built-in plugins 与 plugin hooks 三块。[E: specs/v2/provider-model.md:347][E: specs/v2/provider-model.md:360][E: specs/v2/provider-model.md:390] 源码当前以 `ProviderPlugins` + boot order + `catalog.transform` 实现相同方向。[E: packages/core/src/plugin/provider.ts:34][E: packages/core/src/plugin/boot.ts:104][E: packages/core/src/catalog.ts:189][I]

`provider-policy.md` 定义 `provider.use` policy action,目标是对所有来源的 providers 生效,并且 plugins 不能 override policy denial。[E: specs/v2/provider-policy.md:10][E: specs/v2/provider-policy.md:19][E: specs/v2/provider-policy.md:200][E: specs/v2/provider-policy.md:227][E: specs/v2/provider-policy.md:233]

## 易错点

- provider plugin 顺序来自 boot add 顺序与 hooks array 顺序。[E: packages/core/src/plugin/boot.ts:104][E: packages/core/src/plugin.ts:149] 这不是按 provider id 字母排序。[I]
- `enabled` 不只是 boolean;V2 provider enabled 可以记录来自 env、credential、custom 的来源。[E: packages/core/src/provider.ts:51][E: packages/core/src/provider.ts:63]
- V2 catalog query 不再直接投影明文 credential；availability 通过 Integration connection map 判断，credential material 由 downstream model resolution/auth path 处理。[E: packages/core/src/catalog.ts:96][E: packages/core/src/catalog.ts:226][E: packages/core/src/catalog.ts:228][I]

## Sources
- packages/core/src/catalog.ts
- packages/core/src/provider.ts
- packages/core/src/model.ts
- packages/core/src/plugin/provider/
- packages/core/src/plugin/provider.ts
- packages/core/src/plugin/boot.ts
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
