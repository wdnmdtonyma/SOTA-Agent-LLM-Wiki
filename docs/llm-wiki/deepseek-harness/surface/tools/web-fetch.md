---
id: surface.tools.web-fetch
title: web_fetch
kind: tool
tier: T1
pkg: integration
source:
  - packages/web/tool-web/src/fetch.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/src/search.ts
  - packages/web/tool-web/package.json
  - packages/web/tool-web/tests/tool-web.spec.ts
  - packages/web/tool-web/tests/integration.spec.ts
  - packages/web/tool-web/tests/spill.spec.ts
  - packages/web/tool-web/tests/load-path.spec.ts
  - packages/web/web-fetch-http/src/index.ts
  - packages/web/web-fetch-http/src/provider.ts
  - packages/web/web-fetch-http/src/policy.ts
  - packages/web/web-fetch-http/package.json
  - packages/web/web-fetch-http/tests/fetch-http.spec.ts
  - packages/web/web/src/index.ts
  - packages/web/web/src/types.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/code-mode.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/web/tests/shipped-composition.e2e.ts
  - examples/acp-agent/web.cordis.yml
symbols:
  - web_fetch
  - applyWebFetchTool
  - parseFetchArgs
  - DEFAULT_FETCH_MAX_OUTPUT_CHARS
  - apply
  - Config
  - formatFetchOutput
  - presentFetchCall
  - presentFetchResult
  - HttpFetchProvider
  - LOCAL_FETCH_PROVIDER_ID
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.web-search
  - subsys.integration.web-fetch
evidence: explicit
status: verified
updated: 47f943859b
---

> `web_fetch` 是 `@deepseek-ai/dsh-tool-web` 向模型注册的按 URL 取页工具：wire 名 `web_fetch`，经 `ctx.web.fetch` 取一份解码后的正文，HTML 再经 turndown + GFM 收成 markdown。插件 Config 默认会登记它，但四个 shipped preset 与 `dsh-base` 都写 `fetch: false`，产品默认 catalog **没有** 这个名字。

## 能回答的问题

- `web_fetch` 的 wire `name`、实现包、`inject` 和 `applyWebFetchTool` 注册点在哪？
- 模型可见字段是不是只有 `url`？超时、输出帽、是否登记分别由哪个 Config 键控制？
- 产品默认为什么看不见 `web_fetch`？插件默认 `fetch: true` 和 shipped `fetch: false` 差在哪？
- 输出信封、HTML→markdown、截断 footer、spill 分别由谁做？
- `ctx.web` 的 Definition / Provider / Consumer 各是谁？`dsh-web-fetch-http` 有没有挂进 shipped bundle？
- `execute()` 怎样把 `url` 和 `exec.signal` 交给 seam？非 2xx、非法 scheme、跨源 redirect、超时分别变成什么？

## Identity

模型看见的工具名是字面量 `'web_fetch'`，由 `applyWebFetchTool` 交给 `ctx.tools.register(defineTool({ name: 'web_fetch', … }))`。[E: packages/web/tool-web/src/fetch.ts:437][E: packages/web/tool-web/src/fetch.ts:429]

实现包是 `@deepseek-ai/dsh-tool-web`。Cordis 插件名 `export const name = 'tool-web'`，`inject = ['tools', 'web', 'systemPrompt']`：没有挂上 `ctx.web` 时插件保持 pending，catalog 里不会出现 `web_fetch`。[E: packages/web/tool-web/package.json:2][E: packages/web/tool-web/src/index.ts:21][E: packages/web/tool-web/src/index.ts:24][E: packages/web/tool-web/tests/load-path.spec.ts:23][E: packages/web/tool-web/tests/load-path.spec.ts:24]

`apply(ctx, config)` 在 schemastery 填完默认值后，仅当 `resolved.fetch` 为真才调用 `applyWebFetchTool(ctx, resolved.fetchTimeoutMs, resolved.fetchMaxOutputChars)`。插件 Config 把 `fetch` 默认成 `true`；这是**包默认**，不是产品默认。[E: packages/web/tool-web/src/index.ts:54][E: packages/web/tool-web/src/index.ts:90][E: packages/web/tool-web/tests/tool-web.spec.ts:447]

登记时顺带挂一条 `systemPrompt` section，名 `tool:web_fetch`，order `111`，要求模型用 `web_fetch` 取具体 HTTP(S) URL，并在引用正文时把 URL 写成 markdown 链接。[E: packages/web/tool-web/src/fetch.ts:431][E: packages/web/tool-web/src/fetch.ts:432]

`isConcurrencySafe: () => true` 让 registry 把这次调用标成 `parallel`。[E: packages/web/tool-web/src/fetch.ts:478][E: packages/web/tool-web/tests/tool-web.spec.ts:451]

`defineTool` 把部署侧 `fetchTimeoutMs` 写成 `ToolDefinition.timeoutMs`。host 上的 `@deepseek-ai/dsh-tool-call-timeout-policy` 读到该字段后给 `tools/execute` 套 cooperative deadline。[E: packages/web/tool-web/src/fetch.ts:476][E: packages/web/tool-web/src/index.ts:56][E: packages/guard/timeout-policy/src/index.ts:57]

## 用途定位

`web_fetch` 只取**一个**调用方给出的 HTTP(S) URL，返回解码后的文本。它不是浏览器：不带 cookie、不发 ambient 凭据、不执行页面脚本。本地 provider 的请求是 `GET` + `redirect: 'manual'`，headers 只有 `user-agent` 与 `accept`。它也不走 DeepSeek chat / search API，不读 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_SEARCH_BASE_URL`。[E: packages/web/web-fetch-http/src/provider.ts:106][E: packages/web/web-fetch-http/src/provider.ts:108]

HTML 正文由工具层用共享的 `TurndownService`（`headingStyle: 'atx'`、`codeBlockStyle: 'fenced'`、`bulletListMarker: '-'`）加上 `@joplin/turndown-plugin-gfm` 收成 markdown，并 `remove(['script', 'style', 'noscript'])`。纯文本 / JSON / XML 一类 `kind: 'text'` 原样通过。[E: packages/web/tool-web/src/fetch.ts:25][E: packages/web/tool-web/src/fetch.ts:30][E: packages/web/tool-web/src/fetch.ts:31][E: packages/web/tool-web/src/fetch.ts:239][E: packages/web/tool-web/tests/tool-web.spec.ts:207]

同包的 `web_search` 是发现入口。当 composition 同时启用 fetch 时，search 的 prompt 会建议对具体结果再调 `web_fetch`；四个 shipped preset 都把 `fetch` 关掉，search prompt 改成「用返回的 snippet」，正文里不再出现 `web_fetch` 这个名字。[E: packages/web/tool-web/src/search.ts:219][E: packages/web/tool-web/src/search.ts:221][E: packages/web/tool-web/tests/tool-web.spec.ts:496]

**产品默认 catalog 不含 `web_fetch`。** shipped Web 组合的 `EXPECTED_TOOLS` 含 `web_search`，封闭名单里没有 `web_fetch`。[E: apps/web/tests/shipped-composition.e2e.ts:35][E: apps/web/tests/shipped-composition.e2e.ts:56]

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`parameters` 只有 `url`：进入 JSON Schema `required`，schema **不填** timeout / 输出帽。集成测试钉死 `Object.keys(fetchParams.properties)` 等于 `['url']`，且没有 `timeout_ms`。[E: packages/web/tool-web/src/fetch.ts:440][E: packages/web/tool-web/tests/integration.spec.ts:111][E: packages/web/tool-web/tests/integration.spec.ts:112]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `url` | `string` | 是 | 无 | schema 只要 string；`parseFetchArgs` 再拒 `trim().length === 0` | 交给 `ctx.web.fetch` 的请求 URL。空白字符串在 execute 里抛 `url must be a non-empty string`。[E: packages/web/tool-web/src/fetch.ts:440][E: packages/web/tool-web/src/fetch.ts:89] |

`parseFetchArgs` 只做非空校验，**不**在工具层限制 scheme。`ftp://…` 一类非法 scheme 会进 seam / provider，由 `validateFetchUrl` 抛 `WEB_INVALID_URL`。[E: packages/web/tool-web/tests/tool-web.spec.ts:352][E: packages/web/tool-web/tests/integration.spec.ts:81][E: packages/web/web-fetch-http/src/policy.ts:35]

**Config 会改登记、超时和输出帽，不改字段名。** 四个与 fetch 相关的键：

| Config 键 | 默认常量 | 作用 |
|---|---|---|
| `fetch` | `true`（包默认） | 是否调用 `applyWebFetchTool`。`false` 时 catalog 没有 `web_fetch`，search prompt 也不提这个名字。[E: packages/web/tool-web/src/index.ts:54][E: packages/web/tool-web/src/index.ts:90][E: packages/web/tool-web/tests/tool-web.spec.ts:460] |
| `fetchTimeoutMs` | `DEFAULT_WEB_TOOL_TIMEOUT_MS` = `30_000` | 写成 `timeoutMs`，由 timeout-policy 强制。模型参数表里看不到。[E: packages/web/tool-web/src/index.ts:56][E: packages/web/tool-web/tests/tool-web.spec.ts:692] |
| `fetchMaxOutputChars` | `DEFAULT_FETCH_MAX_OUTPUT_CHARS` = `200_000` | 同步转换的源字符帽，以及完整渲染输出（header + body + footer）的字符帽。[E: packages/web/tool-web/src/index.ts:34][E: packages/web/tool-web/src/index.ts:58] |
| `search` / `searchTimeoutMs` / `searchMaxResults` | 与 `web_search` 共用 | 不进入 `web_fetch` schema。`apply` 把 `resolved.fetch` 传给 `applyWebSearchTool` 的第四参，只影响 search prompt 文案。[E: packages/web/tool-web/src/index.ts:88] |

非正或非整的 `fetchTimeoutMs` / `fetchMaxOutputChars` 在 `apply()` 里 `assertPositiveInteger` 直接让插件 load 失败。[E: packages/web/tool-web/src/index.ts:84][E: packages/web/tool-web/tests/tool-web.spec.ts:713]

shipped 四个 preset 与 `dsh-base` 都把 `fetch` 改成 `false`，并把 `searchTimeoutMs` 写成 `60000`；它们**没有**覆盖 `fetchTimeoutMs` / `fetchMaxOutputChars`。即便以后把 `fetch` 打开，超时默认仍是 30s，不是 search 那条 60s。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: packages/bundle/base/cordis.patch.yml:417]

## 输出 & 截断 / spill

`execute` 返回的**规范值**是封闭 object：`url`（允许 redirect 之后的最终 URL）、`statusCode`、`body: { kind: 'html' | 'text', content }`、`truncated`（**provider** 是否裁过解码正文）。registry 用 `output.schema` 校验后再调用 `render`。[E: packages/web/tool-web/src/fetch.ts:486][E: packages/web/tool-web/src/fetch.ts:470][E: packages/core/tools/src/index.ts:1795]

模型看见的是 `formatFetchOutput` 的一段 text，不是裸规范值：

```
Fetched <finalUrl> (HTTP <statusCode>)

<body markdown or raw text>
```

截断时追加固定 footer：`\n\n(Content truncated. Fetch a more specific URL or section for the full text.)`。[E: packages/web/tool-web/src/fetch.ts:311][E: packages/web/tool-web/src/fetch.ts:247][E: packages/web/tool-web/src/fetch.ts:328]

有效截断 `truncated` 比 provider 字段更宽：`result.truncated || sourceTruncated || prefix.length > maxOutputChars`。转换把 `_` 逃成 `\_` 一类膨胀也会撞帽。完整字符串仍超过帽时，先给 footer 留位置再切 prefix；帽比 footer 还短则硬切。[E: packages/web/tool-web/src/fetch.ts:314][E: packages/web/tool-web/src/fetch.ts:318][E: packages/web/tool-web/tests/tool-web.spec.ts:227]

`render` 与 `presentationMeta` 共用 `renderFetchOutput` 的 WeakMap 备忘，同一份冻结 value + 同一帽只跑一次 turndown。[E: packages/web/tool-web/src/fetch.ts:300][E: packages/web/tool-web/tests/tool-web.spec.ts:404]

顶层成功调用把 `{ url, statusCode, truncated }` 写进 `output.presentationMeta`（`WebFetchMeta`），随 `tool/result` 落盘；`presentResult` 再收成 UI 的 `card: 'web'`、`kind: 'fetch'`。卡片**不**复制正文——无 `web` capability 的 UI 回退到已经是 markdown 的 `content`。失败或 meta 畸形则 `presentResult` 返回 `undefined`，走 generic 卡片。[E: packages/web/tool-web/src/fetch.ts:374][E: packages/web/tool-web/src/fetch.ts:410][E: packages/web/tool-web/tests/tool-web.spec.ts:541]

`presentCall` 是 pending 卡片：`{ card: 'generic', title: url, kind: 'fetch', rawInput: url }`。[E: packages/web/tool-web/src/fetch.ts:339]

`web_fetch` **没有**自己的 spill 路径：不读 `ctx.spillStore`。过长的渲染结果由 host 上的 `@deepseek-ai/dsh-spill-policy` 在 registry 之后截成 preview + `Full formatted result stored at:`；spill 文件里是完整 formatted 文本。showcase 测试用真实 `dsh-web-fetch-http` + `dsh-spill-local` 钉死这条分责。[E: packages/web/tool-web/tests/spill.spec.ts:82][E: packages/web/tool-web/tests/spill.spec.ts:94]

失败结果走 registry `toolErrorResult`：`content` 为 `Error: <message>`，`WebError` / `HarnessError` 的 `{ name, code }` 进 `error.info`（例如 `WEB_INVALID_URL` / `WEB_REDIRECT_BLOCKED` / `WEB_PROVIDER_UNAVAILABLE` / `TOOL_TIMEOUT`）。[E: packages/core/tools/src/index.ts:1874][E: packages/web/tool-web/tests/integration.spec.ts:83][E: packages/web/tool-web/tests/tool-web.spec.ts:478]

非 2xx **不是**失败：status 留在结果头里，`isError === false`。[E: packages/web/tool-web/tests/integration.spec.ts:76][E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:107]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-web` 的 `WebRuntime`（`ctx.web`）：`registerFetchProvider` / `fetch(request, signal)`。请求类型 `WebFetchRequest` 只有 `url`；结果 `WebFetchResult` 带最终 URL、status、封闭 union `WebFetchBody`、provider `truncated`。[E: packages/web/web/src/index.ts:158][E: packages/web/web/src/types.ts:64][E: packages/web/web/src/types.ts:93] |
| Provider | 可选的 `@deepseek-ai/dsh-web-fetch-http`：插件名 `web-fetch-http`，`inject = ['web']`，`apply` 里 `ctx.web.registerFetchProvider(new HttpFetchProvider(limits))`，稳定 id `LOCAL_FETCH_PROVIDER_ID = 'http'`。[E: packages/web/web-fetch-http/package.json:2][E: packages/web/web-fetch-http/src/index.ts:28][E: packages/web/web-fetch-http/src/index.ts:31][E: packages/web/web-fetch-http/src/index.ts:100][E: packages/web/web-fetch-http/src/provider.ts:33] |
| Consumer | `@deepseek-ai/dsh-tool-web` 的 `applyWebFetchTool`：只传 `{ url }` 和 `exec.signal`，自己做 schema、prompt、turndown、输出帽。[E: packages/web/tool-web/src/fetch.ts:481] |

`ctx.web.fetch` 在**调用时**解析 provider，不按注册顺序：[E: packages/web/web/src/index.ts:158]

1. 配置了 `fetchProvider`（或环境变量 `DSH_WEB_FETCH_PROVIDER` 写入同一字段）且已登记且 `available()` → 用它。[E: packages/web/web/src/index.ts:93]
2. 配置了但没登记 → `WEB_PROVIDER_CONFIGURED_MISSING`。
3. 登记了但 `available() === false` → `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`。
4. 未配置且恰好一个可用 → 用它。
5. 未配置且多个可用 → `WEB_PROVIDER_AMBIGUOUS`。
6. 未配置且没有可用 → `WEB_PROVIDER_UNAVAILABLE`。

启用的工具在 provider 缺失时**仍出现在 schema**，要到 `execute` 才结构化失败：`resolveProvider` 在没有任何可用者时抛 `WEB_PROVIDER_UNAVAILABLE`。同包对 `web_search` 的单测钉死「enablement ≠ availability」；`web_fetch` 走同一条 `ctx.web.fetch` 解析。[E: packages/web/web/src/index.ts:187][E: packages/web/tool-web/tests/tool-web.spec.ts:474][E: packages/web/tool-web/tests/tool-web.spec.ts:478]

换 fetch provider 会带走：URL 卫生（scheme / 凭据 / 长度）、redirect 策略、字节/字符帽、charset 解码、`Content-Type` 分类、超时 backstop、User-Agent。不会带走：模型字段 `url`、turndown 规则、`fetchMaxOutputChars`、卡片 meta。

`dsh-web-fetch-http` 的默认 limits：`maxUrlLength: 2048`、`maxResponseBytes: 5_000_000`、`maxBodyChars: 100_000`、`timeoutMs: 30_000`、`maxRedirects: 5`、`userAgent: DEFAULT_USER_AGENT`（`deepseek-harness/0.0.1 (+https://github.com/deepseek-ai)`，不是浏览器伪装）。[E: packages/web/web-fetch-http/src/index.ts:50][E: packages/web/web-fetch-http/src/index.ts:25]

`validateFetchUrl` 只允许 `http:` / `https:`、拒绝 URL 内嵌 username/password、拒绝超长输入。它**不**检查私网 / link-local / metadata 地址；`HttpFetchProvider` 也没有另一道 SSRF 过滤。[E: packages/web/web-fetch-http/src/policy.ts:34][E: packages/web/web-fetch-http/src/policy.ts:37][E: packages/web/web-fetch-http/src/policy.ts:38]

请求是 `GET`、`redirect: 'manual'`，headers 只有 `user-agent` 与 `accept`。同 origin（scheme + hostname + port）redirect 最多 `maxRedirects` 跳；跨源抛 `WEB_REDIRECT_BLOCKED`，模型必须对那个 origin 再发一次 `web_fetch`。[E: packages/web/web-fetch-http/src/provider.ts:107][E: packages/web/web-fetch-http/src/policy.ts:52][E: packages/web/tool-web/tests/integration.spec.ts:90]

`classifyContentType`：`text/html` 与 `application/xhtml+xml` → `html`；其它 `text/*` 以及 `application/json` / `application/xml` / `+json` / `+xml` → `text`；`image/png` 一类返回 `undefined`。[E: packages/web/web-fetch-http/src/policy.ts:67][E: packages/web/web-fetch-http/src/policy.ts:70][E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:57] `HttpFetchProvider.readBody` 在 `kind === undefined` 时才抛 `WEB_UNSUPPORTED_CONTENT_TYPE`。[E: packages/web/web-fetch-http/src/provider.ts:122]

**shipped bundle 没有挂这个 Provider。** `dsh-base` 的 web 段是 `web`（`searchProvider: deepseek-official`）+ `web-search-deepseek` + `tool-web`（`fetch: false`），没有 `id: web-fetch-http`。[E: packages/bundle/base/cordis.patch.yml:405][E: packages/bundle/base/cordis.patch.yml:409][E: packages/bundle/base/cordis.patch.yml:417] 仓内把 `@deepseek-ai/dsh-web-fetch-http` 写进 composition 的样本是 example `examples/acp-agent/web.cordis.yml`（`search: false`，从而只暴露 fetch；插件默认 `fetch: true`）。[E: examples/acp-agent/web.cordis.yml:14][E: examples/acp-agent/web.cordis.yml:21]

## 执行管线

模型发出 `web_fetch` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render` / `presentationMeta` → `tools/result`。[E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

对本工具的挂点：

- **`tools/pre-execute`**：`web_fetch` 自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **`isConcurrencySafe`**：恒 `true`，调度器可与其它 parallel 调用重叠。[E: packages/web/tool-web/src/fetch.ts:478]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:70][E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`（来自 `fetchTimeoutMs`），`deadline(exec.signal, timeoutMs, 'TOOL_TIMEOUT')` 换到 `exec.signal` 再 `next()`。policy 自己的计时器赢了，模型看到 `TOOL_TIMEOUT`，不是 provider 的 `WEB_FETCH_TIMEOUT`。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:61][E: packages/web/tool-web/tests/integration.spec.ts:155]
- **body**：`defineTool` 先 `validateArgs`，再进 `parseFetchArgs` + `ctx.web.fetch`。取消信号经 `exec.signal` 传给 seam / provider。[E: packages/core/tools/src/schema.ts:586][E: packages/web/tool-web/src/fetch.ts:480]
- **`tools/post-execute`**：本工具不注册 listener，默认 `accept`。规范值由 registry `createSuccessResult` 冻结后 `render`。[E: packages/core/tools/src/index.ts:1745][E: packages/core/tools/src/index.ts:1800]
- **sandbox / approval**：不挂。Sandbox 只罩文件副作用；`web_fetch` 没有 per-call sandbox stamp。

Code Mode 下模型不能直呼 `web_fetch`：非嵌套且 `mode === 'code'` 时，除 `run_code` 外的名字在 `collapses` 里为真，`createExecution` 直接 `final-result` / `UNKNOWN_TOOL`，不进 `tools/pre-execute`。SDK 子分发带 `parent`（`nested === true`），不 collapse，仍走完整管线。shipped `code` preset 本身 `fetch: false`，`web_fetch` **根本没登记**，SDK 里也不会出现这个绑定。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:996][E: packages/core/tools/src/code-mode.ts:20][E: apps/cli/config/agent-presets/code/agent.cordis.yml:251]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。

| preset | 装 `@deepseek-ai/dsh-tool-web`？ | `disabled` | isolate | shipped Config | `web_fetch` 进 catalog？ |
|---|---|---|---|---|---|
| `minimal` | **否** | — | 无 `tool-web` 行 | 成员停在 `persistent-shell` + `filesystem`（`bash` / `str_replace_editor`） | 否。文件中没有 `id: tool-web`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | **是** | 无 | 无 | `fetch: false`，`searchTimeoutMs: 60000` | 否。只登记 `web_search`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250] |
| `code` | **是** | 无 | 无 | 与 `standard` 同值 | 否。`fetch: false` 不登记；即便打开，`mode: code` 的 wire 也只剩 `run_code`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:248][E: apps/cli/config/agent-presets/code/agent.cordis.yml:251][E: packages/core/tools/src/index.ts:996] |
| `cordis` | **是** | 无 | 无 | 与 `standard` 同值 | 否。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:235][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:238] |

host 面：

- `dsh-base` 也有一行 `tool-web`，同样 `fetch: false` + `searchTimeoutMs: 60000`，并且**没有** `web-fetch-http` 行。[E: packages/bundle/base/cordis.patch.yml:414][E: packages/bundle/base/cordis.patch.yml:417]
- `dsh-web-app` 把 host 这行 `disabled: true`，改由每会话 preset 再挂（preset 仍是 `fetch: false`）。[E: packages/bundle/web-app/cordis.patch.yml:407][E: packages/bundle/web-app/cordis.patch.yml:408]
- `dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，不重写 `tool-web`，因此沿用 base 的 `fetch: false`。[E: packages/bundle/headless/cordis.patch.yml:24][E: packages/bundle/headless/cordis.patch.yml:27]

要把 `web_fetch` 真正交给模型，composition 必须同时：(1) 把某条 `tool-web` 的 `fetch` 改成 `true`（或省略以吃包默认）；(2) 挂上 `@deepseek-ai/dsh-web-fetch-http`（或另一个 `WebFetchProvider`）。只做 (1) 会让工具出现在 catalog，execute 报 `WEB_PROVIDER_UNAVAILABLE`。example `examples/acp-agent/web.cordis.yml` 是仓内的 opt-in 样本。[E: examples/acp-agent/web.cordis.yml:15][E: packages/web/tool-web/tests/tool-web.spec.ts:478]

## execute() 走读

符号：`applyWebFetchTool` / `parseFetchArgs` / `formatFetchOutput` @ `packages/web/tool-web/src/fetch.ts`；`WebRuntime.fetch` @ `packages/web/web/src/index.ts`；`HttpFetchProvider.fetch` @ `packages/web/web-fetch-http/src/provider.ts`。

1. **registry 校验参数。** `defineTool` 的 wrapper 先按 schema 走 `validate`；缺 `url` 或类型不对抛 `ToolArgsError`（code `INVALID_ARGS`）。通过后再进用户 `execute`。[E: packages/core/tools/src/schema.ts:586][E: packages/core/tools/src/schema.ts:466]

2. **非空 URL。** `parseFetchArgs(args)`：`args.url.trim().length === 0` 抛 `url must be a non-empty string`。成功则原样返回 `{ url }`——不做 trim、不加 timeout 字段。[E: packages/web/tool-web/src/fetch.ts:480][E: packages/web/tool-web/src/fetch.ts:89][E: packages/web/tool-web/tests/tool-web.spec.ts:353]

3. **只把 URL + signal 交给 seam。** `ctx.web.fetch({ url: input.url }, exec.signal)`。单测断言 provider 看见的 request 等于 `{ url }`，`signal` 就是这次 execute 的 AbortSignal。[E: packages/web/tool-web/src/fetch.ts:481][E: packages/web/tool-web/tests/tool-web.spec.ts:599][E: packages/web/tool-web/tests/tool-web.spec.ts:600]

4. **选 provider。** `resolveProvider` 按配置 id / 唯一可用者选择。缺 provider 抛 `WEB_PROVIDER_UNAVAILABLE`；多个未配置抛 `WEB_PROVIDER_AMBIGUOUS`。[E: packages/web/web/src/index.ts:158][E: packages/web/web/src/index.ts:187]

5. **本地 HTTP provider（仅当 composition 挂了它）。** `HttpFetchProvider.fetch`：已 abort 则 `WEB_ABORTED`；否则 `deadline(signal, limits.timeoutMs, 'WEB_FETCH_TIMEOUT')` 作为 backstop，再 `followAndRead`。[E: packages/web/web-fetch-http/src/provider.ts:47][E: packages/web/web-fetch-http/src/provider.ts:51]

6. **URL 卫生 + 同 origin redirect。** `validateFetchUrl` 拒非 http(s)、内嵌凭据、超长；每次 hop 再验一次。跨源 / 超过 `maxRedirects` → `WEB_REDIRECT_BLOCKED`。无 `Location` 的 3xx → `WEB_PROVIDER_ERROR`。[E: packages/web/web-fetch-http/src/provider.ts:57][E: packages/web/web-fetch-http/src/policy.ts:35][E: packages/web/tool-web/tests/integration.spec.ts:90]

7. **读 body。** `requestOnce` 发匿名 GET。`classifyContentType` 失败或 charset 不被 `TextDecoder` 认识 → `WEB_UNSUPPORTED_CONTENT_TYPE`，并 `cancel` 未读 stream。`Content-Length` 超过 `maxResponseBytes` → `WEB_FETCH_TOO_LARGE`；stream 涨过帽则截断并 `truncated: true`。解码后再按 `maxBodyChars` 切字符。[E: packages/web/web-fetch-http/src/provider.ts:119][E: packages/web/web-fetch-http/src/provider.ts:161][E: packages/web/web-fetch-http/src/provider.ts:137]

8. **返回规范值。** 工具把 `result.url` / `statusCode` / `{ kind, content }` / `result.truncated` 原样交回。404 仍是成功值。[E: packages/web/tool-web/src/fetch.ts:486][E: packages/web/tool-web/tests/integration.spec.ts:77]

9. **渲染。** `renderBody`：`kind: 'text'` 切片后通过；`kind: 'html'` 若词法嵌套超过 `MAX_CONVERSION_DEPTH`（512）或 turndown 抛错，则退回 raw HTML。`computeFetchOutput` 再套 header / footer / 输出帽。[E: packages/web/tool-web/src/fetch.ts:229][E: packages/web/tool-web/src/fetch.ts:236][E: packages/web/tool-web/src/fetch.ts:102][E: packages/web/tool-web/tests/tool-web.spec.ts:282]

10. **超时分层。** 工具侧 `fetchTimeoutMs`（默认 30s）由 timeout-policy 写成 `TOOL_TIMEOUT`。provider 自己的 `timeoutMs` 是直接调 `HttpFetchProvider.fetch` 时的 backstop，码为 `WEB_FETCH_TIMEOUT`。集成测试把 provider 设成 30s、工具设成 50ms，慢连接得到的是 `TOOL_TIMEOUT`。[E: packages/web/tool-web/tests/integration.spec.ts:155][E: packages/web/tool-web/tests/integration.spec.ts:175]

## 设计动机·edge

- **不要写成「默认开启」。** 包 Config `fetch: true` 只表示「这个插件被裸 mount 时两件套都登记」。产品 shipped 路径（四个 preset + `dsh-base`）一律 `fetch: false`，且不挂 fetch provider。Web 默认会话 catalog 有 `web_search`、没有 `web_fetch`。[E: packages/web/tool-web/src/index.ts:54][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: apps/web/tests/shipped-composition.e2e.ts:56]
- **timeout 是部署政策，不是模型参数。** `WebFetchRequest` 只有 `url`；cooperative 预算挂在 `ToolDefinition.timeoutMs` 上。这和 Claude 部分 `WebFetch` 方言把 timeout 暴露给模型不同。[E: packages/web/web/src/types.ts:64][E: packages/web/tool-web/tests/integration.spec.ts:111]
- **模型自选 URL + 未完成的私网过滤。** `validateFetchUrl` 不做 SSRF / 私网拦截。这是 shipped 关掉 fetch、也不挂 `web-fetch-http` 的控制面原因；yml 头注释不能当证据，代码事实是卫生检查止于 scheme / 凭据 / 长度。[E: packages/web/web-fetch-http/src/policy.ts:34][E: packages/web/web-fetch-http/src/policy.ts:38][I]
- **HTML 转换必须让出事件循环。** 深度预检避免 unclosed-tag 把同步 turndown 做成秒级工作（测试用 20_000 层，要求 2s 内返回 raw）。`colspan="1000000"` 也不展开。[E: packages/web/tool-web/src/fetch.ts:102][E: packages/web/tool-web/tests/tool-web.spec.ts:268]
- **非 2xx 是资源状态，不是工具失败。** 只有「取不到 / 不能安全表示」才走 `WebError`。
- **redirect 不自动换 origin。** 每一次新 origin 都是一次新的 tool-call（也是一次新的 provider / 权限决策）。
- **匿名、非浏览器 UA。** 请求不携带 cookie，也不假装成 Chrome。
- **不走 DeepSeek API。** `web_fetch` 的 HTTP GET 打的是模型给出的 URL，不读 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_SEARCH_BASE_URL`。search 的密钥与 search 专用 Base URL 属于 `web_search` / `dsh-web-search-deepseek`，本工具不复用那条路由。
- **Code Mode 的唯一 wire 工具仍是 `run_code`。** shipped `code` preset 的 `fetch: false` 让问题更简单：`web_fetch` 未登记。用户 preset 若打开 fetch，也只能从 `await tools.web_fetch({ url })` 重入，不能在 function-calling 里直呼。[E: packages/core/tools/src/code-mode.ts:20][E: packages/core/tools/src/index.ts:996]

## Sources

- packages/web/tool-web/src/fetch.ts
- packages/web/tool-web/src/index.ts
- packages/web/tool-web/src/search.ts
- packages/web/tool-web/package.json
- packages/web/tool-web/tests/tool-web.spec.ts
- packages/web/tool-web/tests/integration.spec.ts
- packages/web/tool-web/tests/spill.spec.ts
- packages/web/tool-web/tests/load-path.spec.ts
- packages/web/web-fetch-http/src/index.ts
- packages/web/web-fetch-http/src/provider.ts
- packages/web/web-fetch-http/src/policy.ts
- packages/web/web-fetch-http/package.json
- packages/web/web-fetch-http/tests/fetch-http.spec.ts
- packages/web/web/src/index.ts
- packages/web/web/src/types.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/code-mode.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/web/tests/shipped-composition.e2e.ts
- examples/acp-agent/web.cordis.yml

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 脊柱；本工具走同一条管线，自己不注册 listener。
- [ref.tools-catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表。
- [surface.tools.web-search](web-search.md) — 同包发现工具 `web_search`；shipped 默认只开 search。
- [subsys.integration.web-fetch](../../subsystems/integration/web-fetch.md) — `ctx.web` fetch 半边与 `HttpFetchProvider` 子系统。
