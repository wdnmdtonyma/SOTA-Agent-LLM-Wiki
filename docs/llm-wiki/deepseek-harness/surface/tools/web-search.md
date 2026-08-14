---
id: surface.tools.web-search
title: web_search
kind: tool
tier: T1
pkg: integration
source:
  - packages/web/tool-web/src/search.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/src/fetch.ts
  - packages/web/tool-web/package.json
  - packages/web/tool-web/tests/tool-web.spec.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/web/web-search-deepseek/src/provider.ts
  - packages/web/web-search-deepseek/package.json
  - packages/web/web-search-deepseek/tests/deepseek.spec.ts
  - packages/web/web/src/index.ts
  - packages/web/web/src/types.ts
  - packages/web/web/package.json
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/boot/app-boot/src/index.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - web_search
  - applyWebSearchTool
  - WEB_SEARCH_MAX_RESULTS
  - parseSearchArgs
  - SEARCH_BASE_URL_ENV
  - apply
  - name
  - inject
  - Config
  - formatSearchOutput
  - presentSearchCall
  - presentSearchResult
  - DeepSeekSearchProvider
  - DEEPSEEK_DEFAULT_BASE_URL
  - DEEPSEEK_PROVIDER_ID
related:
  - spine.tool-call-anatomy
  - spine.trace-code-mode
  - ref.tools-catalog
  - surface.tools.web-fetch
  - surface.presets.code
  - subsys.integration.web-search
evidence: explicit
status: verified
updated: 47f943859b
---

> `web_search` 是 `@deepseek-ai/dsh-tool-web` 向模型注册的联网检索工具：wire 名 `web_search`，参数只有 `query`，经 `ctx.web.search` 交给默认 Provider `@deepseek-ai/dsh-web-search-deepseek`（`id: deepseek-official`），返回可选摘要与来源 URL 列表。

## 能回答的问题

- `web_search` 的 wire `name`、实现包、`inject` 和 `defineTool` 注册点在哪？同插件的 `web_fetch` 为什么 shipped catalog 里没有？
- 模型可见字段是不是只有 `query`？`searchMaxResults` / `searchTimeoutMs` 是谁的 Config，默认多少，shipped yml 改了什么？
- 密钥走哪条凭据？Base URL 是 `DEEPSEEK_SEARCH_BASE_URL` 还是 `DEEPSEEK_BASE_URL`？缺 key / 缺 provider 时 schema 还在不在？
- 输出信封、`truncated` footer、`presentationMeta` 长什么样？会不会 spill？
- 四个 shipped preset 谁装 `tool-web`？`code` preset 下模型能不能直呼 `web_search`？
- `execute()` 怎样进 `ctx.web`，DeepSeek Provider 打哪条 Messages 端点，`maxResults` 谁截断？

## Identity

模型看见的工具名是字面量 `'web_search'`，由 `applyWebSearchTool` 交给 `ctx.tools.register(defineTool({ name: 'web_search', … }))`。[E: packages/web/tool-web/src/search.ts:225][E: packages/web/tool-web/src/search.ts:224]

实现包是 `@deepseek-ai/dsh-tool-web`。Cordis 插件名 `export const name = 'tool-web'`，`inject = ['tools', 'web', 'systemPrompt']`：没有挂上 `ctx.web` 时插件保持 pending，catalog 里不会出现 `web_search`。[E: packages/web/tool-web/package.json:2][E: packages/web/tool-web/src/index.ts:21][E: packages/web/tool-web/src/index.ts:24]

`apply(ctx, config)` 在 schemastery 填完默认值后，若 `resolved.search` 为真，就把 `searchMaxResults` / `searchTimeoutMs` / `resolved.fetch` 传给 `applyWebSearchTool`。`resolved.fetch` 只决定两件事：要不要再调 `applyWebFetchTool` 登记 `web_fetch`，以及 search 的 `systemPrompt` 段能不能点名 `web_fetch`。[E: packages/web/tool-web/src/index.ts:88][E: packages/web/tool-web/src/index.ts:90][E: packages/web/tool-web/src/fetch.ts:437]

注册时顺带挂一条 `systemPrompt` section，名 `tool:web_search`，order `110`。`fetchEnabled === false`（shipped 产品默认）写「用返回的 snippet，并引用 URL」；`true` 才写「需要全文时再 follow up `web_fetch`」。测试钉死 search-only 引导里不得出现 `web_fetch` 字样。[E: packages/web/tool-web/src/search.ts:217][E: packages/web/tool-web/src/search.ts:218][E: packages/web/tool-web/src/search.ts:221][E: packages/web/tool-web/tests/tool-web.spec.ts:495][E: packages/web/tool-web/tests/tool-web.spec.ts:496]

`isConcurrencySafe: () => true` 让 registry 把这次调用标成 `parallel`。[E: packages/web/tool-web/src/search.ts:258][E: packages/web/tool-web/tests/tool-web.spec.ts:449]

`defineTool` 把 Config 解析出的 `searchTimeoutMs` 写成 `ToolDefinition.timeoutMs`。host 上的 `@deepseek-ai/dsh-tool-call-timeout-policy` 读到该数字后，在 `tools/execute` 上套截止时间。[E: packages/web/tool-web/src/search.ts:256][E: packages/guard/timeout-policy/src/index.ts:57]

默认 Provider 是另一个包：`@deepseek-ai/dsh-web-search-deepseek`，插件名 `web-search-deepseek`，`inject = ['web']`，`apply` 里 `ctx.web.registerSearchProvider(new DeepSeekSearchProvider(…))`，稳定 id `deepseek-official`。[E: packages/web/web-search-deepseek/package.json:2][E: packages/web/web-search-deepseek/src/index.ts:38][E: packages/web/web-search-deepseek/src/index.ts:41][E: packages/web/web-search-deepseek/src/index.ts:137][E: packages/web/web-search-deepseek/src/provider.ts:27]

## 用途定位

`web_search` 只做**当前信息的网页检索**。模型只给一句 `query`；返回多少条、等多久、要不要同场挂 `web_fetch`，全是部署 Config，不是模型参数。工具包自己不选 Provider、不发 HTTP：网络与凭证都在 `ctx.web` 背后。[E: packages/web/web/src/types.ts:16][E: packages/web/tool-web/src/search.ts:261]

它不是浏览器、不是 HTML 抓取。全文读取是同插件的 `web_fetch`（`applyWebFetchTool`，参数只有 `url`）。插件 Config 默认 `fetch: true` 会登记 `web_fetch`，但四个 shipped preset 与 `dsh-base` 的 `tool-web` 行都写成 `fetch: false`，产品默认 catalog **没有** `web_fetch`。[E: packages/web/tool-web/src/index.ts:54][E: packages/web/tool-web/src/fetch.ts:437][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: packages/bundle/base/cordis.patch.yml:417]

`dsh-base` 也没有挂 `@deepseek-ai/dsh-web-fetch-http`。仓库里存在 fetch Provider 不等于产品默认装。

启用的 `web_search` 在 Provider 缺失时**仍然出现在 schema 里**；失败发生在 `execute`，结构化码是 `WEB_PROVIDER_UNAVAILABLE`（或已配置但选不中时的 `WEB_PROVIDER_CONFIGURED_*` / `WEB_PROVIDER_AMBIGUOUS`）。schema 跟 enablement，不跟 availability。[E: packages/web/tool-web/tests/tool-web.spec.ts:474][E: packages/web/tool-web/tests/tool-web.spec.ts:478][E: packages/web/web/src/index.ts:187]

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object：`query` 进入 JSON Schema `required`。schema **不填默认值**；空白串的拒绝发生在 `parseSearchArgs`。[E: packages/web/tool-web/src/search.ts:228][E: packages/core/tools/src/schema.ts:295][E: packages/web/tool-web/src/search.ts:30]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `query` | `string` | 是 | 无 | schema 只要 string；`parseSearchArgs` 再拒 `trim().length === 0` | 唯一模型参数。非 string（例如 `123`）在 registry `validate` 阶段变成 `INVALID_ARGS`，到不了 `parseSearchArgs`。[E: packages/web/tool-web/src/search.ts:228][E: packages/web/tool-web/src/search.ts:30][E: packages/web/tool-web/tests/tool-web.spec.ts:568] |

**没有** `max_results` / `timeout` / `num_results` 这类模型字段。条数与截止时间是 Config，经 `execute` 闭包和 `timeoutMs` 注入。

**Config 会改行为与 prompt 文案，不改字段名。** 六个键都可选；schemastery 默认如下：

| Config 键 | 默认常量 | 作用 |
|---|---|---|
| `search` | `true` | 为假则整枚不登记 `web_search`（prompt section 也不挂）。[E: packages/web/tool-web/src/index.ts:53][E: packages/web/tool-web/src/index.ts:87] |
| `fetch` | `true`（**插件默认**；**不是**产品默认） | 为真才登记 `web_fetch`，并把 search prompt 切到「可 follow up `web_fetch`」分支。[E: packages/web/tool-web/src/index.ts:54][E: packages/web/tool-web/src/index.ts:90] |
| `searchMaxResults` | `WEB_SEARCH_MAX_RESULTS` = `8` | 每次 `ctx.web.search` 的 `maxResults`；seam 回程截断。非正整数让插件 load 失败。[E: packages/web/tool-web/src/index.ts:55][E: packages/web/tool-web/src/search.ts:20][E: packages/web/tool-web/src/index.ts:83] |
| `searchTimeoutMs` | `DEFAULT_WEB_TOOL_TIMEOUT_MS` = `30000` | 写成 `web_search` 的 `timeoutMs`。shipped yml 改成 `60000`。[E: packages/web/tool-web/src/index.ts:57][E: packages/web/tool-web/src/index.ts:27] |
| `fetchTimeoutMs` | `30000` | 只影响 `web_fetch`，本页不展开。[E: packages/web/tool-web/src/index.ts:56] |
| `fetchMaxOutputChars` | `200000` | 只影响 `web_fetch`。[E: packages/web/tool-web/src/index.ts:58] |

未配置 `searchMaxResults` 时，测试看到 seam 请求的 `maxResults` 就是 `WEB_SEARCH_MAX_RESULTS`（8）。配成 `2` 时，即便 Provider 回 5 条，模型文本也只剩前 2 条并带截断注记。[E: packages/web/tool-web/tests/tool-web.spec.ts:654][E: packages/web/tool-web/tests/tool-web.spec.ts:671]

插件默认 `timeoutMs` 是 30s；Config 覆盖会写进 definition。[E: packages/web/tool-web/tests/tool-web.spec.ts:693][E: packages/web/tool-web/tests/tool-web.spec.ts:700]

`web_search` **从不**广告 `sandbox_permissions` / `justification`。它不挂 sandbox，也不 `ask`。

shipped `standard` / `code` / `cordis` 的 `tool-web` 行覆盖两项：`fetch: false`、`searchTimeoutMs: 60000`。`search` / `searchMaxResults` 不写，因此产品面上是「只登记 search、8 条、60s」。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:251]

## 输出 & 截断 / spill

`execute` 返回的**规范值**是封闭 object：可选 `content`（Provider 摘要）、必填 `sources[]`（每项至少 `url`，可选 `title` / `snippet` / `publishedAt`）、必填 `truncated`。registry 用 `output.schema` 校验后再 `render`。[E: packages/web/tool-web/src/search.ts:266][E: packages/web/tool-web/src/search.ts:267][E: packages/web/tool-web/src/search.ts:250][E: packages/core/tools/src/index.ts:1795]

模型看见的是 `formatSearchOutput` 拼出的一段 text，不是裸规范值：

1. 若 `content` 非空，先整段放出。
2. 若有 sources：`Sources:` 下列 markdown 链接。label 优先 `title`，否则 hostname；解析失败则用原 URL 字符串。`snippet` 与 `(publishedAt)` 接在破折号后。
3. 既无 content 也无 sources：插入 `No results found.`。
4. `truncated === true`：追加 `(Showing the first N sources. Refine the query for more.)`。
5. 成功路径最后固定一句「用 markdown 链接引用这些 URL」。[E: packages/web/tool-web/src/search.ts:56][E: packages/web/tool-web/src/search.ts:67][E: packages/web/tool-web/src/search.ts:69][E: packages/web/tool-web/src/search.ts:72][E: packages/web/tool-web/src/search.ts:73]

默认 DeepSeek Provider 的 `mapAnthropicResponse` 只回 `{ sources, truncated: false }`，**不设** `content`。规范值里的摘要只可能来自其它 search Provider 填的 `content`，不是这条官方 DeepSeek 映射。[E: packages/web/web-search-deepseek/src/provider.ts:173]

`truncated` 由 **seam** 在回程执行：Provider 若交回超过 `request.maxResults` 条，`capSources` 切片并置 `truncated: true`。DeepSeek 适配器自己总是 `truncated: false`，也不把 `maxResults` 送进 Messages body。[E: packages/web/web/src/index.ts:199][E: packages/web/web-search-deepseek/src/provider.ts:173]

顶层成功调用把结构化来源写进 `output.presentationMeta`（`WebSearchMeta`：`sources` / `truncated` / 可选 `answer`，`answer` 对应规范值 `content`），随 `tool/result` 落盘；`presentResult` 收成 UI 的 `card: 'web'`、`kind: 'search'`。`presentCall` 是 pending 卡片：`card: 'generic'`、`kind: 'search'`、`title` 与 `rawInput` 都是 `query`。meta 畸形或 `isError` 时 `presentResult` 返回 `undefined`，回退通用卡片。[E: packages/web/tool-web/src/search.ts:254][E: packages/web/tool-web/src/search.ts:185][E: packages/web/tool-web/src/search.ts:189][E: packages/web/tool-web/src/search.ts:84][E: packages/web/tool-web/tests/tool-web.spec.ts:527]

`web_search` **没有**自己的 spill 路径：不读 `ctx.spillStore`。同目录 `spill.spec.ts` 只 showcase `web_fetch` 的大正文。8 条来源的渲染文本通常远小于 spill 政策；即便日后撞上通用 `dsh-spill-policy`，那也是 registry 层，不是本工具合同。

失败结果走 registry `toolErrorResult`：`content` 为 `Error: <message>`。`WebError` / `ToolArgsError` 这类 `HarnessError` 的 `{ name, code }` 进 `error.info`（`WEB_PROVIDER_UNAVAILABLE`、`WEB_PROVIDER_CREDENTIAL_MISSING`、`INVALID_ARGS`、`WEB_ABORTED` 等）。[E: packages/core/tools/src/index.ts:1874][E: packages/core/tools/src/index.ts:644][E: packages/web/tool-web/tests/tool-web.spec.ts:551]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-web` 的 `ctx.web`：`registerSearchProvider` / `search` / `registerFetchProvider` / `fetch`。`searchProvider` / `fetchProvider` 钉死选用哪个 id；省略则「恰好一个 usable」才自动选。也认环境变量 `DSH_WEB_SEARCH_PROVIDER` / `DSH_WEB_FETCH_PROVIDER`，与 Config 同一字段，不是第二条隐式优先级链。[E: packages/web/web/package.json:2][E: packages/web/web/src/index.ts:140][E: packages/web/web/src/index.ts:92][E: packages/web/web/src/index.ts:93] |
| Provider | 产品默认 `@deepseek-ai/dsh-web-search-deepseek`（`DeepSeekSearchProvider.id = 'deepseek-official'`）。`dsh-base` 只挂这一家 search Provider；四个 shipped `agent.cordis.yml` 不另挂 search Provider 行。[E: packages/web/web-search-deepseek/src/provider.ts:27][E: packages/bundle/base/cordis.patch.yml:407][E: packages/bundle/base/cordis.patch.yml:410] |
| Consumer | `@deepseek-ai/dsh-tool-web` 的 `web_search`（以及 Config 打开时的 `web_fetch`）。工具只调 `ctx.web.search({ query, maxResults }, exec.signal)`。[E: packages/web/tool-web/src/search.ts:261] |

`dsh-base` 把 seam 钉在 `searchProvider: deepseek-official`，并挂 `web-search-deepseek` 行 `apiKeyEnv: DEEPSEEK_API_KEY`。[E: packages/bundle/base/cordis.patch.yml:407][E: packages/bundle/base/cordis.patch.yml:412]

密钥与 Base URL **不是**同一套 LLM chat 变量：

- **密钥**：`config.apiKey`（字面量，settings 里标 `secret`）优先；否则每次 search 调 `resolveApiKey`。有 `ctx.credentials` 时 `credentials.resolve(apiKeyEnv)`；没有凭据服务时回退 `launchEnvironmentOf(ctx).get(apiKeyEnv)`。`apiKeyEnv` 默认 `'DEEPSEEK_API_KEY'`。缺 key 抛 `WEB_PROVIDER_CREDENTIAL_MISSING`，文案指向 credentials / Models 页 / 启动环境 / 字面 `apiKey`。[E: packages/web/web-search-deepseek/src/index.ts:43][E: packages/web/web-search-deepseek/src/index.ts:104][E: packages/web/web-search-deepseek/src/provider.ts:298][E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:527]
- **Base URL**：`config.baseURL` ?? 启动环境里的 `DEEPSEEK_SEARCH_BASE_URL`（`SEARCH_BASE_URL_ENV`）?? `DEEPSEEK_DEFAULT_BASE_URL`（`https://api.deepseek.com/anthropic/v1`）。解析链**不读** `DEEPSEEK_BASE_URL`。chat-completions 适配器的基址是另一条变量；bootstrap 敏感名单把两者并列写出，正是为了不混用。[E: packages/web/web-search-deepseek/src/index.ts:82][E: packages/web/web-search-deepseek/src/index.ts:110][E: packages/web/web-search-deepseek/src/index.ts:111][E: packages/web/web-search-deepseek/src/index.ts:112][E: packages/web/web-search-deepseek/src/provider.ts:35][E: packages/boot/app-boot/src/index.ts:109]
- 配置全省略时，测试打到的 URL 是 `https://api.deepseek.com/anthropic/v1/messages`，`x-api-key` 来自环境里的 `DEEPSEEK_API_KEY`。[E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:473]

`DeepSeekSearchProvider.available()` 在插件路径上几乎总是 true：`resolveOptions` 每次都装上 `resolveApiKey` 函数，缺 key 不会让 Provider 从 registry 里「消失」，而是在 `search()` 里抛凭据错误。`available()` 为假的情况是 baseURL 无法 `URL.canParse`，或 `maxTokens` / `maxUses` 不是正整数。[E: packages/web/web-search-deepseek/src/provider.ts:191][E: packages/web/web-search-deepseek/src/index.ts:102]

换 Provider 会带走：HTTP 方言、是否产生 `content` 摘要、snippet 从哪来、凭证名、是否发辅助模型请求。不会带走：模型 schema（只有 `query`）、`searchMaxResults` 截断、`formatSearchOutput` 信封、`timeoutMs`、`fetch: false` 的 prompt 分支。

DeepSeek 这条路**不走** `ctx.llm`。它用原生 `fetch` POST Anthropic 兼容 `/messages`，body 带 server tool `web_search_20250305`（`name: 'web_search'`，`max_uses` 默认 5）。发出前若当前 agent 存在，会 `session.append('web/deepseek-search-llm-request', …)` 记一份无密钥的请求快照。[E: packages/web/web-search-deepseek/src/provider.ts:212][E: packages/web/web-search-deepseek/src/index.ts:118][E: packages/web/web-search-deepseek/src/index.ts:119]

## 执行管线

模型发出 `web_search` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render` / `presentationMeta` → `tool/result`。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

对本工具的挂点：

- **`tools/pre-execute`**：`web_search` 自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **`isConcurrencySafe`**：恒 `true`，调度器可与其它 parallel 调用重叠。[E: packages/web/tool-web/src/search.ts:258]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`；flush 后若已 abort，返回 `ABORTED_BEFORE_DISPATCH`，body 不跑。[E: packages/session/session-checkpoint-policy/src/index.ts:71][E: packages/session/session-checkpoint-policy/src/index.ts:72]
  - `timeout-policy` 读 `definition.timeoutMs`。插件默认 30s；shipped `tool-web` 写成 60s。到期把 `exec.signal` 换成带 `TOOL_TIMEOUT` 的 deadline，body 看到 abort 后，包装器用结构化 `TOOL_TIMEOUT` 覆盖返回值。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:74]
- **body**：`defineTool` 先 `validate` 参数，再进 `applyWebSearchTool` 的 `execute`。取消信号经 `exec.signal` 传给 `ctx.web.search`，再传给 Provider 的 `fetch`。[E: packages/core/tools/src/schema.ts:586][E: packages/web/tool-web/src/search.ts:263][E: packages/web/tool-web/tests/tool-web.spec.ts:639]
- **`tools/post-execute`**：`web_search` 不注册 listener，默认 `accept`。规范值由 registry `createSuccessResult` 冻结后 `render`。[E: packages/core/tools/src/index.ts:1745][E: packages/core/tools/src/index.ts:1800]
- **sandbox / approval**：不挂。Sandbox 只罩文件副作用。

Code Mode（`code` preset 的 `tool-presentation` `mode: code`）下，模型不能直呼 `web_search`：非嵌套且 `mode === 'code'` 时，除 `run_code` 外的名字在 `createExecution` 里 collapse；`if (collapsed)` 直接返回 `final-result`，不进 `tools/pre-execute`。SDK 子分发带 `parent`（`nested === true`），`collapses` 为假，仍走完整管线。`code` 的 **wire 工具只有** `run_code`；`web_search` 仍登记，并出现在 `tools:sdk` 段，供 `await tools.web_search({ query })`。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:1423][E: packages/core/tools/src/index.ts:996][E: apps/cli/tests/web-agent-presets.e2e.ts:301][E: apps/cli/tests/web-agent-presets.e2e.ts:305]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。`ctx.web` 与 `web-search-deepseek` 留在 **host** 面（`dsh-base`）；preset 只 remount 模型可见的 `tool-web`。

| preset | 装 `@deepseek-ai/dsh-tool-web`？ | `disabled` | isolate | shipped Config |
|---|---|---|---|---|
| `minimal` | **否** | — | 无 `tool-web` 行（isolate 只罩 `terminals` / `fs`） | yml 没有 `id: tool-web`。web profile 下 host 行也被关掉，e2e catalog 只有 `bash` 与 `str_replace_editor`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:21][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51][E: apps/cli/tests/web-agent-presets.e2e.ts:227] |
| `standard` | **是** | 无 | 无（顶层 remount 进 host `tools` registry） | `- id: tool-web` / `name: '@deepseek-ai/dsh-tool-web'`，`fetch: false`，`searchTimeoutMs: 60000`。e2e 精确 catalog 含 `web_search`、不含 `web_fetch`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: apps/cli/tests/web-agent-presets.e2e.ts:209] |
| `code` | **是** | 无 | 无 | 与 standard 同一 `tool-web` 行。改变的是呈现：`assembly.tools === ['run_code']`，SDK 文本仍含 `web_search`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:248][E: apps/cli/config/agent-presets/code/agent.cordis.yml:251][E: apps/cli/tests/web-agent-presets.e2e.ts:301] |
| `cordis` | **是** | 无 | 无 | 同样 remount，同样 `fetch: false` / `60000`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:235][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:238] |

host `dsh-base` 自己也有一行 `tool-web`（同样 `fetch: false`、`searchTimeoutMs: 60000`），并且挂 `web` + `web-search-deepseek`，**没有** `web-fetch-http`。[E: packages/bundle/base/cordis.patch.yml:414][E: packages/bundle/base/cordis.patch.yml:417][E: packages/bundle/base/cordis.patch.yml:404]

`web` profile 的 `dsh-web-app` 把 host 面 `tool-web` 设成 `disabled: true`，改由每会话 preset 再挂。因此 `minimal` 在产品 web 面上没有 `web_search`；`standard` / `code` / `cordis` 靠自己的那一行把它加回来。[E: packages/bundle/web-app/cordis.patch.yml:407][E: packages/bundle/web-app/cordis.patch.yml:408]

`search: false` 可以只留 `web_fetch`。四个 shipped yml 都不写 `search: false`，测试覆盖这条分支，但那不是产品默认。[E: packages/web/tool-web/tests/tool-web.spec.ts:467]

## execute() 走读

符号：`applyWebSearchTool` @ `packages/web/tool-web/src/search.ts`，`WebRuntime.search` / `capSources` @ `packages/web/web/src/index.ts`，`DeepSeekSearchProvider.search` / `mapAnthropicResponse` @ `packages/web/web-search-deepseek/src/provider.ts`，`resolveOptions` @ `packages/web/web-search-deepseek/src/index.ts`。

1. **registry 校验类型。** `defineTool` 的包装 `execute` 先 `validate(args)`：缺 `query`、或 `query` 不是 string，抛 `ToolArgsError` / `INVALID_ARGS`。[E: packages/core/tools/src/schema.ts:586][E: packages/web/tool-web/tests/tool-web.spec.ts:568]

2. **值约束。** `parseSearchArgs(args)`：`query.trim().length === 0` 抛普通 `Error('query must be a non-empty string')`，registry 收成 `isError` 文本，没有 `WebError` code。[E: packages/web/tool-web/src/search.ts:260][E: packages/web/tool-web/src/search.ts:30][E: packages/web/tool-web/tests/tool-web.spec.ts:88]

3. **进 seam。** `ctx.web.search({ query: input.query, maxResults }, exec.signal)`。`maxResults` 来自插件 Config（默认 8），不是模型参数。`exec.signal` 原样下传。[E: packages/web/tool-web/src/search.ts:261][E: packages/web/tool-web/tests/tool-web.spec.ts:639]

4. **选 Provider。** `WebRuntime.search` 调 `resolveProvider`。shipped 钉了 `searchProvider: deepseek-official`：未登记 → `WEB_PROVIDER_CONFIGURED_MISSING`；已登记但 `available() === false` → `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`。未配置 id 时：零个 usable → `WEB_PROVIDER_UNAVAILABLE`；多于一个 → `WEB_PROVIDER_AMBIGUOUS`。[E: packages/web/web/src/index.ts:141][E: packages/web/web/src/index.ts:177][E: packages/web/web/src/index.ts:187][E: packages/web/web/src/index.ts:191]

5. **DeepSeek 一次快照。** `DeepSeekSearchProvider.search` 入口立刻 `resolveOptions()`，整次调用共用这一份 endpoint / key / model。`apiKey()`：字面 `apiKey` 非空直接用；否则 await `resolveApiKey`（credentials 或启动环境）。空结果抛 `WEB_PROVIDER_CREDENTIAL_MISSING`。凭据解析失败且并非 abort，码是 `WEB_PROVIDER_ERROR`。[E: packages/web/web-search-deepseek/src/provider.ts:201][E: packages/web/web-search-deepseek/src/provider.ts:280][E: packages/web/web-search-deepseek/src/provider.ts:298][E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:496]

6. **辅助 Messages 请求。** endpoint = `${baseURL}/messages`。body：`model`（默认 `deepseek-v4-flash`）、`max_tokens`（默认 4096）、一条 user text `Perform a web search for the query: ${request.query}`、tools `[{ type: 'web_search_20250305', name: 'web_search', max_uses }]`（默认 5）。`recordRequest` 先落盘再 `fetch`；`recordRequest` 抛错会挡住发出。headers 同时带 `x-api-key` 与 `Authorization: Bearer`。`redirect: 'error'`。[E: packages/web/web-search-deepseek/src/provider.ts:204][E: packages/web/web-search-deepseek/src/provider.ts:210][E: packages/web/web-search-deepseek/src/provider.ts:212][E: packages/web/web-search-deepseek/src/provider.ts:224]

7. **映射与去重。** HTTP 非 2xx → `WEB_PROVIDER_ERROR`（尽量抽 `error.message`）。2xx 后 `mapAnthropicResponse`：没有 `web_search_tool_result` 块就抛 `WEB_PROVIDER_ERROR`（不回退去刮 prose）。从 result 块收 `web_search_result`，按 `url` 去重；snippet 来自 text 块 `citations[].cited_text`（`citationSnippets`，同一 URL 先到先得）；`page_age` 映射成 `publishedAt`。返回 `{ sources, truncated: false }`。[E: packages/web/web-search-deepseek/src/provider.ts:151][E: packages/web/web-search-deepseek/src/provider.ts:153][E: packages/web/web-search-deepseek/src/provider.ts:162][E: packages/web/web-search-deepseek/src/provider.ts:173]

8. **seam 截断。** `capSources(result, request.maxResults)`：条数未超则原样返回；超出则 `sources.slice(0, maxResults)` 且 `truncated: true`。[E: packages/web/web/src/index.ts:146][E: packages/web/web/src/index.ts:199]

9. **投影规范值。** 工具 body 把 `content`（若有）与 `projectSource` 后的 sources、以及 seam 的 `truncated` 交回 registry。缺省字段不写进对象，满足 `additionalProperties: false`。[E: packages/web/tool-web/src/search.ts:266][E: packages/web/tool-web/src/search.ts:267][E: packages/web/tool-web/src/search.ts:268]

10. **registry 投影。** `render` → `formatSearchOutput`；顶层调用再跑 `presentationMeta` → `searchMetaFromValue`。abort / 超时在包装器层变成 `WEB_ABORTED` 或 `TOOL_TIMEOUT`，不装成成功信封。[E: packages/web/tool-web/src/search.ts:253][E: packages/core/tools/src/index.ts:1800][E: packages/web/web-search-deepseek/src/provider.ts:239]

## 设计动机·edge

- **模型只问问题，产品控上下文。** `searchMaxResults` 对齐 `dsh-tool-fs` 的 `READ_LIMIT`：默认 8 与 OpenCode Exa 默认同量级。模型不能把 cap 开大来灌 context。[E: packages/web/tool-web/src/search.ts:20]
- **密钥共用、基址拆开。** search 说的是 Anthropic 兼容 Messages + 原生 `web_search_20250305`，chat 说的是另一条 completions 基址。复用 `DEEPSEEK_API_KEY`，禁止复用 `DEEPSEEK_BASE_URL`。override 只能是 `DEEPSEEK_SEARCH_BASE_URL` 或 `web-search-deepseek` 的 `baseURL`。[E: packages/web/web-search-deepseek/src/index.ts:82][E: packages/web/web-search-deepseek/src/index.ts:112]
- **enablement ≠ availability。** 关掉 `search` 才从 catalog 消失。Provider 没挂、key 没写、多个 Provider 打架，模型仍然看见 `web_search`，execute 给带 `code` 的 `WebError`。[E: packages/web/tool-web/tests/tool-web.spec.ts:474]
- **产品默认没有 `web_fetch`。** 插件 Config 默认 `fetch: true` 是包级默认，会被当成「开箱即 fetch」。四个 shipped preset 与 `dsh-base` 都 `fetch: false`，host 也不挂 `web-fetch-http`。search prompt 在这条配置下不会教模型去调一个不存在的工具。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: packages/web/tool-web/tests/tool-web.spec.ts:496]
- **`max_uses` ≠ `maxResults`。** DeepSeek 请求里的 `max_uses`（默认 5）限制 server tool 调用次数；条数帽是 consumer 的 `searchMaxResults`，由 seam 切片。官方映射按 URL 去重，因为 `max_uses > 1` 可能重复同一 URL。[E: packages/web/web-search-deepseek/src/provider.ts:212][E: packages/web/web/src/index.ts:199]
- **无 result block 就是错。** 不把模型散文当搜索结果刮下来。[E: packages/web/web-search-deepseek/src/provider.ts:153]
- **每次 search 现解析密钥。** Models 页写入或轮换 `DEEPSEEK_API_KEY` 后，下一次调用就能用到，不必重启进程。[E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:505]
- **并行安全是显式 opt-in。** search 是只读；两个 `web_search` 可重叠。
- **Code Mode 只收窄 wire。** `code` preset 仍然装 `tool-web`，但模型直呼名必须是 `run_code`。从程序里调 `web_search` 才重入本页这条管线。[E: apps/cli/tests/web-agent-presets.e2e.ts:301][E: packages/core/tools/src/index.ts:1325]
- **和 Claude / Codex 的差异。** 没有独立的 `web_search` 供应商 SDK 暴露给模型；也没有把 search+fetch 合成一个带 `mode` 的工具。DSH 拆成 `web_search` / `web_fetch` 两个 wire 名，再用 Config 关掉 fetch。

## Sources

- packages/web/tool-web/src/search.ts
- packages/web/tool-web/src/index.ts
- packages/web/tool-web/src/fetch.ts
- packages/web/tool-web/package.json
- packages/web/tool-web/tests/tool-web.spec.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/web/web-search-deepseek/src/provider.ts
- packages/web/web-search-deepseek/package.json
- packages/web/web-search-deepseek/tests/deepseek.spec.ts
- packages/web/web/src/index.ts
- packages/web/web/src/types.ts
- packages/web/web/package.json
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/boot/app-boot/src/index.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 脊柱
- [trace: Code Mode 一轮](../../spine/trace-code-mode.md) — `code` preset 如何把 wire 收成唯一的 `run_code`，SDK 子调用怎样重入本工具
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表
- [web_fetch](web-fetch.md) — 同插件的 URL 抓取；四个 shipped preset 与 `dsh-base` 都 `fetch: false`
- [code preset (PTC)](../presets/code.md) — `tool-presentation` `mode: code`；native 工具行仍在
- [web search providers](../../subsystems/integration/web-search.md) — `ctx.web` 选路、DeepSeek / Exa / Perplexity Provider
