---
id: subsys.integration.web-search
title: web search providers
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/web/web/src/index.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/web/web-search-exa/src/index.ts
  - packages/web/web-search-perplexity/src/index.ts
  - packages/web/web/src/types.ts
  - packages/web/web-search-deepseek/src/provider.ts
  - packages/web/web-search-exa/src/provider.ts
  - packages/web/web-search-perplexity/src/provider.ts
  - packages/web/web-search-deepseek/tests/deepseek.spec.ts
  - packages/web/web/tests/web.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/web/web/package.json
  - packages/web/web-search-deepseek/package.json
  - packages/web/web-search-exa/package.json
  - packages/web/web-search-perplexity/package.json
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/src/search.ts
  - packages/web/tool-web/tests/tool-web.spec.ts
  - packages/web/web-search-exa/tests/exa.spec.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
symbols:
  - ctx.web
  - WebRuntime
  - DeepSeekSearchProvider
  - registerSearchProvider
related:
  - spine.overview
  - spine.capability-seams
  - surface.tools.web-search
  - subsys.integration.web-fetch
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.llm.deepseek
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-web` 的 `ctx.web` 是 search / fetch 共用的 capability seam；本页写 **search 半边** 的 Definition（`WebRuntime.registerSearchProvider` / `search` / `capSources`）与三家 Provider。Consumer 是 `dsh-tool-web` 的 `web_search`。shipped 树只挂 `web-search-deepseek`（`searchProvider: deepseek-official`）。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个 coding agent」。capability seam = Definition / Provider / Consumer。`ctx.web` 与 search Provider 坐在 **host 面**；模型可见工具由 preset remount。五个 shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。叠 `dsh-base` 的 profile 才带本缝；`sdk-minimal` 只叠 `dsh-sdk-minimal`，不带 `dsh-web`。入口不只是 `dsh web`，还包括 `dsh --profile sdk|sdk-minimal|acp`。本仓没有 shipped TUI。

## 能回答的问题

- `ctx.web` 的 search 半边是谁拥有的？`registerSearchProvider` 怎样可逆？和 fetch 是不是同一张表？
- shipped bundle / preset 挂了哪家 search Provider？Exa / Perplexity 包在仓库里为什么不是产品默认？
- 选路：钉死 id / 恰好一个 usable / 零个 / 多个分别抛什么 `WebError` code？enablement 和 availability 差在哪？
- Base URL 链读不读 `DEEPSEEK_BASE_URL`？`SEARCH_BASE_URL_ENV` 是什么？密钥能不能共用 `DEEPSEEK_API_KEY`？
- DeepSeek 适配器为什么不传 `maxResults`、不设 `content`？`capSources` 在哪一层截断？
- host 面 vs agent-preset 面：`dsh-base` / `dsh-web-app` / shipped preset 各挂什么？本缝有没有 waterfall？

## 职责边界

本页拥有 **host 面** 的 search 选路与三家适配器：

- Definition：`@deepseek-ai/dsh-web` 的 `WebRuntime`，`super(ctx, 'web')` 把实例提供成 `ctx.web`。default export Service，不是 named-export 插件。[E: packages/web/web/package.json:2] [E: packages/web/web/src/index.ts:91] [E: packages/web/web/src/index.ts:202] [E: vendor/cordis/src/service.ts:58]
- Provider（shipped）：`@deepseek-ai/dsh-web-search-deepseek`，插件名 `web-search-deepseek`，`inject = ['web']`，`apply` 里 `registerSearchProvider(new DeepSeekSearchProvider(…))`，稳定 id `deepseek-official`。[E: packages/web/web-search-deepseek/package.json:2] [E: packages/web/web-search-deepseek/src/index.ts:38] [E: packages/web/web-search-deepseek/src/index.ts:41] [E: packages/web/web-search-deepseek/src/index.ts:139] [E: packages/web/web-search-deepseek/src/provider.ts:27]
- Provider（仓库有、**不进** shipped 树）：`@deepseek-ai/dsh-web-search-exa`（id `exa`）、`@deepseek-ai/dsh-web-search-perplexity`（id `perplexity`）。同样 `inject = ['web']`，named export。[E: packages/web/web-search-exa/package.json:2] [E: packages/web/web-search-exa/src/index.ts:29] [E: packages/web/web-search-exa/src/index.ts:32] [E: packages/web/web-search-exa/src/provider.ts:19] [E: packages/web/web-search-perplexity/package.json:2] [E: packages/web/web-search-perplexity/src/index.ts:24] [E: packages/web/web-search-perplexity/src/index.ts:27] [E: packages/web/web-search-perplexity/src/provider.ts:19]

它**不**拥有：

- 模型可见 `web_search` 的 schema / 超时 / `formatSearchOutput` / prompt 段 — [`surface.tools.web-search`](../../surface/tools/web-search.md)（`surface.tools.web-search`）。本页只写 Consumer 如何调用 `ctx.web.search`。
- fetch 半边的 Provider 与政策 — [`subsys.integration.web-fetch`](web-fetch.md)（`subsys.integration.web-fetch`）。`WebRuntime` 共用一把选路函数，但 `searchProviders` / `fetchProviders` 是两张 Map，id 命名空间独立。[E: packages/web/web/src/index.ts:85] [E: packages/web/web/src/index.ts:86] [E: packages/web/web/tests/web.spec.ts:61]
- DeepSeek **对话**路由 `deepseek-official`（`ctx.llm` + `DEEPSEEK_BASE_URL`）— [`subsys.llm.deepseek`](../llm/deepseek.md)（`subsys.llm.deepseek`）。同名字符串是另一条 seam 的 adapter id，不是本页的 search Provider。
- `dsh-base` 整棵 host 树 — [`subsys.composition.bundle-base`](../composition/bundle-base.md)（`subsys.composition.bundle-base`）。

**host 面 vs agent-preset 面。** `id: web` 与 `id: web-search-deepseek` 只出现在 `dsh-base` 的 insert 里：`searchProvider: deepseek-official`，`apiKeyEnv: DEEPSEEK_API_KEY`。[E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/base/cordis.patch.yml:453] [E: packages/bundle/base/cordis.patch.yml:456] [E: packages/bundle/base/cordis.patch.yml:459] 同文件还钉 `fetchProvider: http` 并 insert `web-fetch-http`，那是 fetch 半边，不在本页展开。[E: packages/bundle/base/cordis.patch.yml:454] [E: packages/bundle/base/cordis.patch.yml:461] manifest 依赖只有 `@deepseek-ai/dsh-web`、`@deepseek-ai/dsh-web-fetch-http` 与 `@deepseek-ai/dsh-web-search-deepseek`，没有 Exa / Perplexity。[E: packages/bundle/base/package.json:122] [E: packages/bundle/base/package.json:125]

`web` profile 的 bundle 序是 `dsh-base` 再叠 `dsh-web-app`；`headless` 是 `dsh-base` 再叠 `dsh-headless`；`sdk` / `acp` 同样叠 `dsh-base` 再叠对应 app；`sdk-minimal` **只**叠 `dsh-sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:143] [E: packages/boot/app-boot/src/profile.ts:147] [E: packages/boot/app-boot/src/profile.ts:151] [E: packages/boot/app-boot/src/profile.ts:155] [E: packages/boot/app-boot/src/profile.ts:138] `dsh-web-app` 把 host 面 `tool-web` 写成 `disabled: true`，不改 `web` / `web-search-deepseek`。[E: packages/bundle/web-app/cordis.patch.yml:432] [E: packages/bundle/web-app/cordis.patch.yml:432] `dsh-headless` 的 patch 没有 `id: web` / `id: web-search-*` 行，沿用 `dsh-base`。[I]

四个 shipped preset 都不挂 search Provider。`standard` / `ptc` / `cordis` 只 remount Consumer：`id: tool-web`，`fetch: true`，`searchTimeoutMs: 60000`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:255] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:257] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:241] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:244] `minimal` 没有 `tool-web` 行。[I] 旧目录名 `code` 现为 `presets/ptc/`；wiki 节点 id `surface.presets.code` 仍是稳定别名。

**没有 waterfall，没有 isolate。** 本缝不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `web`、重复 id `WEB_DUPLICATE_PROVIDER`、执行期选不中 Provider。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:239] 父工具管线的 `tools/pre-execute` 属于 Consumer / loop，不在本页。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/web/web/src/index.ts` | `WebRuntime`：`ctx.web`、两张 Provider 表、`resolveProvider`、`capSources` |
| `packages/web/web/src/types.ts` | `WebSearchRequest` / `WebSearchResult` / `WebSearchProvider` / `WebError` |
| `packages/web/web-search-deepseek/src/index.ts` | named 插件：`resolveOptions`、`SEARCH_BASE_URL_ENV`、settings 段、`apply` |
| `packages/web/web-search-deepseek/src/provider.ts` | `DeepSeekSearchProvider`：Anthropic Messages + `web_search_20250305` |
| `packages/web/web-search-exa/src/index.ts` | Exa 插件；**不进** shipped bundle |
| `packages/web/web-search-exa/src/provider.ts` | `ExaSearchProvider`：`POST /search`，请求层可带 `numResults` |
| `packages/web/web-search-perplexity/src/index.ts` | Perplexity 插件；**不进** shipped bundle |
| `packages/web/web-search-perplexity/src/provider.ts` | `PerplexitySearchProvider`：chat-completions，可回 `content` |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`web` + `web-search-deepseek` + host `tool-web` |
| `packages/bundle/web-app/cordis.patch.yml` | 关掉 host `tool-web`，不改 search Provider |
| `packages/preset/agent-presets/presets/standard/agent.cordis.yml` | preset 只 remount Consumer |
| `packages/preset/agent-presets/presets/ptc/agent.cordis.yml` | PTC preset remount Consumer（旧名 `code`） |
| `packages/web/web/tests/web.spec.ts` | 选路码、`capSources`、fiber dispose、search/fetch 分表 |
| `packages/web/web-search-deepseek/tests/deepseek.spec.ts` | 默认端点、凭据、无 result block、named export |

## 数据模型

| 符号 | 要点 |
|---|---|
| `WebRuntimeConfig` | 可选 `searchProvider` / `fetchProvider`。省略则「恰好一个 usable」才自动选。`$DSH_WEB_SEARCH_PROVIDER` 填**同一个** `searchProviderId` 字段，不是第二条隐式链。[E: packages/web/web/src/index.ts:80] [E: packages/web/web/src/index.ts:92] |
| `WebSearchRequest` | `query` + 可选 `maxResults`。模型参数表不在本页；`dsh-tool-web` 总会带上 `maxResults`。[E: packages/web/web/src/types.ts:16] [E: packages/web/web/src/types.ts:25] |
| `WebSearchResult` | 可选 `content`、`sources[]`、`truncated`。`content` 是 Provider 摘要；DeepSeek / Exa 不设，Perplexity 可设。[E: packages/web/web/src/types.ts:35] [E: packages/web/web-search-deepseek/src/provider.ts:173] [E: packages/web/web-search-exa/src/provider.ts:80] [E: packages/web/web-search-perplexity/src/provider.ts:79] |
| `WebSearchSource` | 必有 `url`；`title` / `snippet` / `publishedAt` 可选。[E: packages/web/web/src/types.ts:50] |
| `WebSearchProvider` | `id` + `available()` + `search(request, signal?)`。`available()` 是同步谓词。[E: packages/web/web/src/types.ts:102] [E: packages/web/web/src/types.ts:105] |
| `DeepSeekSearchProviderOptions` | `apiKey?` / `resolveApiKey?` / `apiKeyEnv?` / `baseURL` / `model` / `apiVersion` / `maxTokens` / `maxUses` / `recordRequest?`。插件路径每次 search 现投影。 |
| `DEEPSEEK_PROVIDER_ID` | `'deepseek-official'`。默认 `baseURL` 是 `https://api.deepseek.com/anthropic/v1`（再拼 `/messages`），**不是** chat-completions 的 `https://api.deepseek.com`。[E: packages/web/web-search-deepseek/src/provider.ts:27] [E: packages/web/web-search-deepseek/src/provider.ts:35] |
| `SEARCH_BASE_URL_ENV` | 字面 `'DEEPSEEK_SEARCH_BASE_URL'`。解析链：`config.baseURL` ?? 启动环境该变量 ?? `DEEPSEEK_DEFAULT_BASE_URL`。链上没有 `DEEPSEEK_BASE_URL`。[E: packages/web/web-search-deepseek/src/index.ts:82] [E: packages/web/web-search-deepseek/src/index.ts:110] [E: packages/web/web-search-deepseek/src/index.ts:111] [E: packages/web/web-search-deepseek/src/index.ts:112] |
| `WebError` code | 选路：`WEB_PROVIDER_CONFIGURED_MISSING` / `WEB_PROVIDER_CONFIGURED_UNAVAILABLE` / `WEB_PROVIDER_UNAVAILABLE` / `WEB_PROVIDER_AMBIGUOUS` / `WEB_DUPLICATE_PROVIDER`。DeepSeek 另抛 `WEB_PROVIDER_CREDENTIAL_MISSING` / `WEB_PROVIDER_ERROR` / `WEB_ABORTED`。[E: packages/web/web/src/index.ts:177] [E: packages/web/web/src/index.ts:180] [E: packages/web/web/src/index.ts:187] [E: packages/web/web/src/index.ts:191] [E: packages/web/web/src/index.ts:120] [E: packages/web/web-search-deepseek/src/provider.ts:307] |

`available()` ≠ 有密钥。插件 `resolveOptions` **总是**装上 `resolveApiKey` 函数，所以 DeepSeek 在缺 key 时仍 `available() === true`（只要 `baseURL` 能 `URL.canParse`，且 `maxTokens` / `maxUses` 是正整数）；缺 key 发生在 `search()` 里的 `WEB_PROVIDER_CREDENTIAL_MISSING`。[E: packages/web/web-search-deepseek/src/index.ts:102] [E: packages/web/web-search-deepseek/src/provider.ts:194] [E: packages/web/web-search-deepseek/src/provider.ts:307] 直接 `new DeepSeekSearchProvider({ apiKey: '', … })` 且不给 `resolveApiKey` 时，`available()` 才是 false。[E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:162]

## 控制流

1. `web` profile 先叠 `dsh-base`，再叠 `dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:143] `dsh-base` insert `id: web` / `name: '@deepseek-ai/dsh-web'`，钉 `searchProvider: deepseek-official`；再 insert `id: web-search-deepseek`，`apiKeyEnv: DEEPSEEK_API_KEY`；再 insert host `id: tool-web`（`fetch: false`，`searchTimeoutMs: 60000`）。[E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/base/cordis.patch.yml:453] [E: packages/bundle/base/cordis.patch.yml:456] [E: packages/bundle/base/cordis.patch.yml:459] [E: packages/bundle/base/cordis.patch.yml:464] [E: packages/bundle/base/cordis.patch.yml:467] `dsh-web-app` 把那行 host `tool-web` 改成 `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:432] `standard` / `ptc` / `cordis` 在 **preset 面** 再挂回同一 Consumer 行且 `fetch: true`；`minimal` 不挂。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251]

2. `WebRuntime` 构造：`super(ctx, 'web')` 立刻 `provide`，`searchProviderId = config.searchProvider ?? process.env.DSH_WEB_SEARCH_PROVIDER`。[E: packages/web/web/src/index.ts:91] [E: packages/web/web/src/index.ts:92] shipped yml 已经写了 `searchProvider`，因此 `$DSH_WEB_SEARCH_PROVIDER` **赢不了** 那一行。本包 **不** 读 `DEEPSEEK_BASE_URL`。`app-boot` 把 `DEEPSEEK_BASE_URL` 与 `DEEPSEEK_SEARCH_BASE_URL` 并列入 bootstrap-only 名单，正是两条变量。[E: packages/boot/app-boot/src/index.ts:112]

3. `apply@packages/web/web-search-deepseek/src/index.ts` 是 named export。`installSettingsSection` 把 `current` 换成 live settings 源，`onChange` 为空——改 endpoint / key **不** 重注册 Provider。[E: packages/web/web-search-deepseek/src/index.ts:130] [E: packages/web/web-search-deepseek/src/index.ts:132] [E: packages/web/web-search-deepseek/src/index.ts:136] 然后 `ctx.web.registerSearchProvider(new DeepSeekSearchProvider(() => resolveOptions(ctx, current())))`。[E: packages/web/web-search-deepseek/src/index.ts:139] 测试用 `unwrapExports` 钉死这条路能 `inject: ['web']`。[E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:468]

4. `registerSearchProvider@packages/web/web/src/index.ts` 走私有 `registerProvider`：同表同 id 立刻 `WEB_DUPLICATE_PROVIDER`；否则 `ctx.effect` 写入 Map，yield 时 `delete`。[E: packages/web/web/src/index.ts:103] [E: packages/web/web/src/index.ts:120] [E: packages/web/web/src/index.ts:122] 返回的 disposer 与 contributing fiber dispose 都会摘掉。[E: packages/web/web/tests/web.spec.ts:50] [E: packages/web/web/tests/web.spec.ts:73] fiber 卸掉且 `searchProvider` 仍钉着 `deepseek-official` 时，下一次 `search` 是 `WEB_PROVIDER_CONFIGURED_MISSING`，不会改去自动选别人。[E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:433]

5. Exa / Perplexity **只有 overlay 才会进树**。各自 `apply` 在 load 时把 Config + 环境密钥冻进 Provider 实例（`EXA_API_KEY` / `PERPLEXITY_API_KEY`），没有 DeepSeek 那套 settings thunk。[E: packages/web/web-search-exa/src/index.ts:61] [E: packages/web/web-search-perplexity/src/index.ts:56] `dsh-base` 的 `dependencies` 与 bundle patch 都没有这两包。包存在 ≠ 产品默认装。

6. Consumer `runSearchQueries@packages/web/tool-web/src/search.ts` 在 `execute` 路径里调用 `ctx.web.search({ query, maxResults }, signal)`。单 query 走一次；多 query 并发，每次仍带同一 `maxResults`。[E: packages/web/tool-web/src/search.ts:238] [E: packages/web/tool-web/src/search.ts:246] `maxResults` 来自 `tool-web` Config，不是模型参数。插件 `search: true` 时，即使当时零个 usable Provider，schema 里仍有 `web_search`；失败码是执行期的 `WEB_PROVIDER_UNAVAILABLE`（或钉死 id 时的 `WEB_PROVIDER_CONFIGURED_*`）。enablement ≠ availability。[E: packages/web/tool-web/src/index.ts:91] [E: packages/web/tool-web/tests/tool-web.spec.ts:479] [E: packages/web/tool-web/tests/tool-web.spec.ts:485]

7. `WebRuntime.search@packages/web/web/src/index.ts` 在**调用时** `resolveProvider`，再 `provider.search`，再 `capSources`。[E: packages/web/web/src/index.ts:141] [E: packages/web/web/src/index.ts:145] [E: packages/web/web/src/index.ts:146] `resolveProvider`：有 `configuredId` 则必须已登记且 `available()`，否则 `WEB_PROVIDER_CONFIGURED_MISSING` / `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`；无 id 时过滤 `available()` 为真的条目——零个 `WEB_PROVIDER_UNAVAILABLE`，多于一个 `WEB_PROVIDER_AMBIGUOUS`（文案带上那些 id），恰好一个才用。[E: packages/web/web/src/index.ts:174] [E: packages/web/web/src/index.ts:177] [E: packages/web/web/src/index.ts:180] [E: packages/web/web/src/index.ts:184] [E: packages/web/web/src/index.ts:187] [E: packages/web/web/src/index.ts:191] 测试钉死「多个 usable 不按注册顺序挑」。[E: packages/web/web/tests/web.spec.ts:102] [E: packages/web/web/tests/web.spec.ts:106]

8. `DeepSeekSearchProvider.search@packages/web/web-search-deepseek/src/provider.ts` 入口立刻 `resolveOptions()` 冻一份，整次调用共用 endpoint / key / model。[E: packages/web/web-search-deepseek/src/provider.ts:204] `apiKey()`：字面 `apiKey` 非空直接用；否则 await `resolveApiKey`（有 `ctx.credentials` 走 `credentials.resolve`，否则 `launchEnvironmentOf(ctx).get(apiKeyEnv)`）。空结果抛 `WEB_PROVIDER_CREDENTIAL_MISSING`。[E: packages/web/web-search-deepseek/src/index.ts:102] [E: packages/web/web-search-deepseek/src/provider.ts:289] [E: packages/web/web-search-deepseek/src/provider.ts:307] 配置全省略时，测试打到 `https://api.deepseek.com/anthropic/v1/messages`，`x-api-key` 来自环境 `DEEPSEEK_API_KEY`。[E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:495]

9. 辅助 Messages 请求。`endpoint = ${baseURL}/messages`。body **只有** `model` / `max_tokens` / 一条 user text `Perform a web search for the query: ${request.query}` / `tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses }]`。没有 `maxResults`，不走 `ctx.llm`。[E: packages/web/web-search-deepseek/src/provider.ts:207] [E: packages/web/web-search-deepseek/src/provider.ts:213] [E: packages/web/web-search-deepseek/src/provider.ts:215] `recordRequest` 先 `session.append('web/deepseek-search-llm-request', …)` 再 `fetch`；抛错会挡住发出（model-visible ⟺ logged）。[E: packages/web/web-search-deepseek/src/index.ts:118] [E: packages/web/web-search-deepseek/src/provider.ts:217] headers 同时带 `x-api-key` 与 `Authorization: Bearer`；`redirect: 'error'`。[E: packages/web/web-search-deepseek/src/provider.ts:227] [E: packages/web/web-search-deepseek/src/provider.ts:231]

10. `mapAnthropicResponse`：没有 `web_search_tool_result` 块就 `WEB_PROVIDER_ERROR`，不刮 prose。[E: packages/web/web-search-deepseek/src/provider.ts:150] [E: packages/web/web-search-deepseek/src/provider.ts:153] 从 result 块收 `web_search_result`，按 `url` 去重；snippet 来自 text 块 `citations[].cited_text`；`page_age` → `publishedAt`。返回 `{ sources, truncated: false }`，**不设** `content`。[E: packages/web/web-search-deepseek/src/provider.ts:162] [E: packages/web/web-search-deepseek/src/provider.ts:173]

11. `capSources@packages/web/web/src/index.ts` 在 seam 回程截断：`maxResults` 省略或条数未超则原样返回；超出则 `sources.slice(0, maxResults)` 且 `truncated: true`。[E: packages/web/web/src/index.ts:198] [E: packages/web/web/src/index.ts:199] 测试：Provider 回 3 条、请求 `maxResults: 2` 时长度为 2 且 `truncated === true`。[E: packages/web/web/tests/web.spec.ts:166] [E: packages/web/web/tests/web.spec.ts:167] DeepSeek 自己总报 `truncated: false`；条数帽是这一层的事。

12. Exa 对照（仅 overlay）：`numResults = request.maxResults ?? options.numResults`，有值才写进 `POST /search` body；无 highlight 的条目直接丢掉；同样不设 `content`。[E: packages/web/web-search-exa/src/provider.ts:98] [E: packages/web/web-search-exa/src/provider.ts:114] [E: packages/web/web-search-exa/src/provider.ts:80] [E: packages/web/web-search-exa/tests/exa.spec.ts:122] Perplexity 对照：body 是 `messages: [{ role: 'user', content: request.query }]`，**不**传 `maxResults`；`content` 取自 generated answer，sources 优先 `search_results[]`，否则 URL-only `citations[]`。[E: packages/web/web-search-perplexity/src/provider.ts:116] [E: packages/web/web-search-perplexity/src/provider.ts:75] [E: packages/web/web-search-perplexity/src/provider.ts:79]

13. **没有 waterfall。** 本缝不注册 waterfall listener。Cordis 全局规则是：listener 不调用传入的 `next()` 就不会 `cbs.shift()`。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239]

## 设计动机

search 与 fetch 共用 `ctx.web`，是为了让选路、取消、`WebError` 与产品配置只有一个主人；请求 / 结果类型仍然分开。选路钉死或「恰好一个 usable」，是为了加第二家 Provider 时不会悄悄改行为——多个 usable 必须 `WEB_PROVIDER_AMBIGUOUS`，绝不按注册顺序。

`searchProvider: deepseek-official` 写进 `dsh-base`，是预留 overlay Exa / Perplexity 的空间：包可以进 monorepo，但 shipped 树不会突然变成歧义。

Base URL 拆开：search 说的是 Anthropic 兼容 Messages + 原生 `web_search_20250305`，chat 说的是另一条 completions 基址。密钥可以共用 `DEEPSEEK_API_KEY`；override 只能是 `DEEPSEEK_SEARCH_BASE_URL` 或插件 `baseURL`。`app-boot` 把两个名字并列进 bootstrap-only，防止发现文件偷偷改网络根。

`maxResults` 由 seam 回程强制，因为不是每家 API 都有结果数控件。DeepSeek 的 `max_uses` 限制 server tool 调用次数，不是条数帽；官方映射按 URL 去重，因为 `max_uses > 1` 可能重复同一 URL。Exa 可以在请求层带 `numResults` 省钱，但 `capSources` 仍是最后一道。

DeepSeek 不走 `ctx.llm`、不刮散文：辅助 Messages 是 Provider 私有 `fetch`。没有 `web_search_tool_result` 就是错。`recordRequest` 先于 dispatch，保证这条辅助输入进 session log。

`available()` 保持廉价本地检查。插件路径把 `resolveApiKey` 函数本身当成「有凭据平面」，缺 key 变成执行期 `WEB_PROVIDER_CREDENTIAL_MISSING`，而不是把 Provider 从 registry 里抹掉——否则钉死的 `searchProvider` 会先变成 `CONFIGURED_UNAVAILABLE`，盖住更可操作的凭据文案。

注册走 `ctx.effect`：HMR / fiber dispose 摘掉 Provider，选路在下一次 `search` 重算。

## Gotcha

- **Exa / Perplexity 包存在 ≠ 产品默认装。** `dsh-base` 的 patch 与 `package.json` 只有 DeepSeek。只 overlay 包、不改 `searchProvider`，模型仍打到 `deepseek-official`。去掉 pin 且两家都 usable，得到 `WEB_PROVIDER_AMBIGUOUS`。
- **`DEEPSEEK_BASE_URL` 改不了 search。** 解析链只看 `config.baseURL` / `DEEPSEEK_SEARCH_BASE_URL` / `DEEPSEEK_DEFAULT_BASE_URL`。chat 适配器的基址是另一页。
- **`$DSH_WEB_SEARCH_PROVIDER` 赢不了 shipped yml。** 它只在 `config.searchProvider` 省略时写入同一字段。`dsh-base` 已经写了 `deepseek-official`。
- **enablement ≠ availability ≠ 有密钥。** 关掉 `tool-web.search` 才从 catalog 消失。Provider 没挂、钉死的 id 失踪、多个 usable 打架，模型仍看见 `web_search`。DeepSeek 插件在缺 `DEEPSEEK_API_KEY` 时 `available()` 仍为 true，execute 抛 `WEB_PROVIDER_CREDENTIAL_MISSING`。
- **`max_uses` ≠ `maxResults`。** 前者默认 5，是 Messages server tool 次数；后者是 Consumer Config（默认由 `searchMaxResults`），由 `capSources` 切片。DeepSeek body 不带 `maxResults`，也不设 `content`。
- **无 result block 就是错。** 散文-only 的 2xx 变成 `WEB_PROVIDER_ERROR`，不是空 `sources`。
- **同 id 再注册 fail-loud。** `WEB_DUPLICATE_PROVIDER`。search 与 fetch 可以各有一个 `id: 'shared'`。
- **卸掉 DeepSeek fiber 不会自动改选。** shipped 钉着 `deepseek-official` 时变成 `WEB_PROVIDER_CONFIGURED_MISSING`。
- **DeepSeek 有 settings thunk；Exa / Perplexity 在 `apply` 冻死。** 改 Exa key 要重载插件。
- **插件 Config `fetch: true` 是包默认。** `dsh-tool-web` 的 schema 默认 `fetch: true`。[E: packages/web/tool-web/src/index.ts:56] `dsh-base` 的 host 行写 `fetch: false`；`standard` / `ptc` / `cordis` remount 写成 `fetch: true`。fetch Provider 页是 [`subsys.integration.web-fetch`](web-fetch.md)。
- **`sdk-minimal` 没有本缝。** 它不叠 `dsh-base`，bundle 依赖也不含 `dsh-web`。叠 `dsh-base` 的 `web` / `headless` / `sdk` / `acp` 才有 host 面 search。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-web` 的 `WebRuntime` | `ctx.web`。**host**：`dsh-base` `id: web`，`searchProvider: deepseek-official`。也认 `$DSH_WEB_SEARCH_PROVIDER` 填同一字段 |
| **Provider（本页，shipped）** | `@deepseek-ai/dsh-web-search-deepseek` 的 `DeepSeekSearchProvider` | `registerSearchProvider`，id `deepseek-official`。`inject = ['web']`。host 行 `id: web-search-deepseek`，`apiKeyEnv: DEEPSEEK_API_KEY`。**不在** shipped preset |
| **Provider（本页，仓库 only）** | `dsh-web-search-exa` / `dsh-web-search-perplexity` | id `exa` / `perplexity`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / 四个 shipped preset |
| **Consumer** | `@deepseek-ai/dsh-tool-web` 的 `web_search` | `inject = ['tools', 'web', 'systemPrompt']`。host `dsh-base` 有一行且 `fetch: false`；`dsh-web-app` `disabled: true`；`standard` / `ptc` / `cordis` remount 且 `fetch: true`，`minimal` 不装。字段表在 [`surface.tools.web-search`](../../surface/tools/web-search.md) |
| **对照（另一条 seam）** | `@deepseek-ai/dsh-llm-deepseek` | 也叫 `deepseek-official`，但是 `ctx.llm` + `DEEPSEEK_BASE_URL`。不要和 search Provider 混 |

换 search 后端 = overlay 另一家 Provider **并** 改 `id: web` 的 `searchProvider`（或在未 pin 时保证恰好一个 usable）。同 id 再注册会 `WEB_DUPLICATE_PROVIDER`。

## Sources

- packages/web/web/src/index.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/web/web-search-exa/src/index.ts
- packages/web/web-search-perplexity/src/index.ts
- packages/web/web/src/types.ts
- packages/web/web-search-deepseek/src/provider.ts
- packages/web/web-search-exa/src/provider.ts
- packages/web/web-search-perplexity/src/provider.ts
- packages/web/web-search-deepseek/tests/deepseek.spec.ts
- packages/web/web/tests/web.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/package.json
- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/web/web/package.json
- packages/web/web-search-deepseek/package.json
- packages/web/web-search-exa/package.json
- packages/web/web-search-perplexity/package.json
- packages/web/tool-web/src/index.ts
- packages/web/tool-web/src/search.ts
- packages/web/tool-web/tests/tool-web.spec.ts
- packages/web/web-search-exa/tests/exa.spec.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角。
- [surface.tools.web-search](../../surface/tools/web-search.md)（`surface.tools.web-search`）：模型可见 `web_search` 的 schema、超时、输出信封；本页不复述字段表。
- [subsys.integration.web-fetch](web-fetch.md)（`subsys.integration.web-fetch`）：同一 `ctx.web` 的 fetch 半边；host 默认关，`standard` / `ptc` / `cordis` remount 打开。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host 真树插入 `web` + `web-search-deepseek`。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）：`dsh web` 叠层；关掉 host `tool-web`。
- [subsys.llm.deepseek](../llm/deepseek.md)（`subsys.llm.deepseek`）：对话路由也叫 `deepseek-official`，读 `DEEPSEEK_BASE_URL`，与 search 不是同一条缝。
