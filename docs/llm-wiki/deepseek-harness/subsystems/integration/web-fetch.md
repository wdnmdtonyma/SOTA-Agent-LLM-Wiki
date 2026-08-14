---
id: subsys.integration.web-fetch
title: web fetch provider
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/web/web-fetch-http/src/index.ts
  - packages/web/web/src/types.ts
  - packages/web/web-fetch-http/src/provider.ts
  - packages/web/web-fetch-http/src/policy.ts
  - packages/web/web-fetch-http/tests/fetch-http.spec.ts
  - packages/web/web-fetch-http/package.json
  - packages/web/web/src/index.ts
  - packages/web/web/tests/web.spec.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/tests/tool-web.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - examples/acp-agent/web.cordis.yml
  - vendor/cordis/src/events.ts
  - vendor/loader/src/index.ts
symbols:
  - HttpFetchProvider
  - LOCAL_FETCH_PROVIDER_ID
  - apply
  - name
  - inject
related:
  - spine.overview
  - spine.capability-seams
  - surface.tools.web-fetch
  - subsys.integration.web-search
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-web-fetch-http` 是 `ctx.web` **fetch 半边**的匿名 HTTP(S) Provider：插件名 `web-fetch-http`，`inject = ['web']`，`apply` 调用 `ctx.web.registerFetchProvider(new HttpFetchProvider(limits))`，稳定 id `LOCAL_FETCH_PROVIDER_ID = 'http'`。它不是 default-export Service，也不进 `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset。仓库里有这个包 ≠ 产品默认装。

## 能回答的问题

- `dsh-web-fetch-http` 在不在 shipped bundle / preset 里？哪份 yml 才真正挂 `id: web-fetch-http`？
- 插件名、`inject`、`LOCAL_FETCH_PROVIDER_ID`、`registerFetchProvider` 各是什么？为什么不能写成 `export default`？
- 插件 Config 的 `fetch: true` 和 shipped `fetch: false` 分别属于哪个包？只开工具、不挂本 Provider 会怎样？
- `HttpFetchProvider` 的 scheme / 凭据 / 同 origin redirect / 字节与字符帽 / UA 政策各抛什么 `WebError` code？
- `ctx.web.fetch` 怎么选 provider？`DSH_WEB_FETCH_PROVIDER` 是不是另一条隐藏优先级？
- 本包有没有 waterfall？fiber dispose 会不会卸掉 `http`？

## 职责边界

本包拥有 **host 面可选** 的一份 `WebFetchProvider`：named export 插件 `name = 'web-fetch-http'`，`inject = ['web']`，`apply` 校验 limits 后 `registerFetchProvider`。[E: packages/web/web-fetch-http/src/index.ts:28] [E: packages/web/web-fetch-http/src/index.ts:31] [E: packages/web/web-fetch-http/src/index.ts:100] 实现类 `HttpFetchProvider`，id 钉死 `LOCAL_FETCH_PROVIDER_ID = 'http'`。[E: packages/web/web-fetch-http/src/provider.ts:33] [E: packages/web/web-fetch-http/src/provider.ts:37] npm 名 `@deepseek-ai/dsh-web-fetch-http`。[E: packages/web/web-fetch-http/package.json:2] 它只做匿名 GET、URL 卫生、同 origin redirect、字节/字符帽、charset 解码与 `Content-Type` 分类；请求不带 cookie、不读 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_SEARCH_BASE_URL`。[E: packages/web/web-fetch-http/src/provider.ts:105] [E: packages/web/web-fetch-http/src/provider.ts:108]

它**不**拥有：

- `ctx.web` Definition、`registerFetchProvider` / `fetch` 选路、`WebFetchRequest` 词汇 — 同 seam 的 `@deepseek-ai/dsh-web`（`WebRuntime`）。本页写 Provider 如何登记、Definition 如何在调用时解析；search 半边交给 [`subsys.integration.web-search`](web-search.md)（`subsys.integration.web-search`）。
- 模型可见 `web_fetch` schema、turndown、输出帽、spill、卡片 meta — [`surface.tools.web-fetch`](../../surface/tools/web-fetch.md)（`surface.tools.web-fetch`）。Consumer 是 `@deepseek-ai/dsh-tool-web` 的 `applyWebFetchTool`；本页不复述 `url` 字段表。
- shipped 默认 fetch 能力。`dsh-base` 的 web 段只有 `id: web`（`searchProvider: deepseek-official`）+ `id: web-search-deepseek` + `id: tool-web`（`fetch: false`），**没有** `id: web-fetch-http`。[E: packages/bundle/base/cordis.patch.yml:404] [E: packages/bundle/base/cordis.patch.yml:409] [E: packages/bundle/base/cordis.patch.yml:414] [E: packages/bundle/base/cordis.patch.yml:417] `dsh-base` 的 `dependencies` 有 `@deepseek-ai/dsh-tool-web` / `@deepseek-ai/dsh-web` / `@deepseek-ai/dsh-web-search-deepseek`，没有 `@deepseek-ai/dsh-web-fetch-http`。[E: packages/bundle/base/package.json:108] [E: packages/bundle/base/package.json:115] [E: packages/bundle/base/package.json:116]
- `id: web` 也不是 Web GUI。HTTP 宿主是 `dsh-web-app` 的 `id: webserver`，见 [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）。

**host 面 vs agent-preset 面。** `ctx.web` 是 host 单例（`dsh-base` `id: web`）。`dsh-web-app` 把 host 上那行 `tool-web` 标 `disabled: true`，改由每会话 preset 再挂；四个 shipped preset 仍写 `fetch: false`。[E: packages/bundle/web-app/cordis.patch.yml:407] [E: packages/bundle/web-app/cordis.patch.yml:408] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250] `minimal` 连 `tool-web` 都没有，成员停在 `persistent-shell` + `filesystem`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] `dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，不重写 `tool-web`，因此沿用 base 的 `fetch: false`，也没有本包。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

仓内把本包写进 composition 的样本是 `examples/acp-agent/web.cordis.yml`：`id: web-fetch-http` / `name: '@deepseek-ai/dsh-web-fetch-http'`，同树再挂 `tool-web` 且 `search: false`（`fetch` 省略，吃 Consumer 包默认 `true`）。[E: examples/acp-agent/web.cordis.yml:14] [E: examples/acp-agent/web.cordis.yml:15] [E: examples/acp-agent/web.cordis.yml:21]

**没有 waterfall，没有 isolate。** 本包不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `web`、limits 非法拒载、重名 `WEB_DUPLICATE_PROVIDER`。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] `tools/pre-execute` 属于 Consumer / loop，不在本包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/web/web-fetch-http/src/index.ts` | named export 插件：`name` / `inject` / `Config` / `apply`；`DEFAULT_USER_AGENT` |
| `packages/web/web-fetch-http/src/provider.ts` | `HttpFetchProvider`、`LOCAL_FETCH_PROVIDER_ID`：GET、redirect、帽、错误翻译 |
| `packages/web/web-fetch-http/src/policy.ts` | 无网络半边：`validateFetchUrl` / `isSameOrigin` / `classifyContentType` / charset |
| `packages/web/web/src/index.ts` | Definition：`registerFetchProvider`、`WebRuntime.fetch`、`resolveProvider` |
| `packages/web/web/src/types.ts` | `WebFetchRequest` / `WebFetchResult` / `WebFetchBody` / `WebFetchProvider` / `WebError` |
| `packages/web/tool-web/src/index.ts` | Consumer 插件：`fetch` 默认 `true`；`if (resolved.fetch) applyWebFetchTool` |
| `packages/bundle/base/cordis.patch.yml` | shipped host：`web` + `web-search-deepseek` + `tool-web` `fetch: false`，无本包 |
| `examples/acp-agent/web.cordis.yml` | 仓内真实挂载行 |
| `packages/web/web-fetch-http/tests/fetch-http.spec.ts` | 政策、redirect、帽、abort、named export、fiber dispose |

## 数据模型

| 符号 | 要点 |
|---|---|
| `HttpFetchProvider` | `implements WebFetchProvider`。`id` 恒为 `'http'`。`available()` 恒 `true`（匿名、无凭据可查）。[E: packages/web/web-fetch-http/src/provider.ts:42] [E: packages/web/web-fetch-http/src/provider.ts:43] |
| `LOCAL_FETCH_PROVIDER_ID` | 字面量 `'http'`。配置 `fetchProvider` / `DSH_WEB_FETCH_PROVIDER` 时写这个 id。[E: packages/web/web-fetch-http/src/provider.ts:33] |
| `HttpFetchLimits` / 插件 `Config` | 全部有默认：`maxUrlLength: 2048`、`maxResponseBytes: 5_000_000`、`maxBodyChars: 100_000`、`timeoutMs: 30_000`、`maxRedirects: 5`、`userAgent: DEFAULT_USER_AGENT`。[E: packages/web/web-fetch-http/src/index.ts:50] [E: packages/web/web-fetch-http/src/index.ts:53] [E: packages/web/web-fetch-http/src/index.ts:54] 前四项必须是正有限数；`timeoutMs` 还不得大于 `2_147_483_647`；`maxRedirects` 是非负整数（`0` = 不跟随）。[E: packages/web/web-fetch-http/src/index.ts:87] [E: packages/web/web-fetch-http/src/index.ts:91] |
| `DEFAULT_USER_AGENT` | `'deepseek-harness/0.0.1 (+https://github.com/deepseek-ai)'`。产品 agent，不是浏览器伪装。[E: packages/web/web-fetch-http/src/index.ts:25] |
| `WebFetchRequest` | 只有 `url`。timeout / format / 抽取不进 seam 请求；取消走独立的 `signal` 参数。[E: packages/web/web/src/types.ts:63] [E: packages/web/web/src/types.ts:64] |
| `WebFetchResult` | 最终 URL、`statusCode`、封闭 union `WebFetchBody`（`html` \| `text`）、provider 是否裁过解码正文。非 2xx 仍是 result。[E: packages/web/web/src/types.ts:73] [E: packages/web/web/src/types.ts:93] |
| `WebError` code（本 Provider） | 卫生：`WEB_INVALID_URL` / `WEB_BLOCKED_URL`。跳转：`WEB_REDIRECT_BLOCKED`。体积：`WEB_FETCH_TOO_LARGE`。类型：`WEB_UNSUPPORTED_CONTENT_TYPE`。时间：`WEB_FETCH_TIMEOUT`。取消：`WEB_ABORTED`。传输 / 无 Location：`WEB_PROVIDER_ERROR`。 |
| Consumer `Config.fetch` | **不是本包的键。** `@deepseek-ai/dsh-tool-web` 的 schemastery 把 `fetch` 默认成 `true`；这是包默认，会被 shipped yml 写成 `false`。[E: packages/web/tool-web/src/index.ts:54] [E: packages/web/tool-web/src/index.ts:90] |

`dsh-base` 的 `id: web` 只钉 `searchProvider: deepseek-official`，**不**写 `fetchProvider`。[E: packages/bundle/base/cordis.patch.yml:407]

## 控制流

1. Loader 用 named export 加载本包。`unwrapExports` 取 `exports.default ?? exports`；若写成 `export default { apply }`，`name` / `inject` 会丢，`web` 等不到。[E: vendor/loader/src/index.ts:194] 测试钉死 `'default' in fetchPlugin` 为 false。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:383]

2. `apply@packages/web/web-fetch-http/src/index.ts` 把 schemastery 填完的 limits 再断言一遍，然后 `ctx.web.registerFetchProvider(new HttpFetchProvider(limits))`。[E: packages/web/web-fetch-http/src/index.ts:84] [E: packages/web/web-fetch-http/src/index.ts:100] 非法 limits（非正、超时超出 Node timer、小数 / 负 `maxRedirects`）在 load 时抛，不会留下半登记的 provider。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:389]

3. `WebRuntime.registerFetchProvider@packages/web/web/src/index.ts` 走 `ctx.effect`：重名抛 `WEB_DUPLICATE_PROVIDER`；yield 的 disposer 从 `fetchProviders` map 删掉该 id。[E: packages/web/web/src/index.ts:114] [E: packages/web/web/src/index.ts:120] [E: packages/web/web/src/index.ts:124] 测试：挂上 `fetchProvider: 'http'` 后 `fiber.dispose()`，下一次 `ctx.web.fetch` 变成 `WEB_PROVIDER_CONFIGURED_MISSING`。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:379] search 与 fetch 的 id 命名空间独立，两边可以各有一个 `'http'`。[E: packages/web/web/tests/web.spec.ts:64]

4. Consumer `@deepseek-ai/dsh-tool-web` 的 `apply` **只在** `resolved.fetch` 为真时调用 `applyWebFetchTool`。[E: packages/web/tool-web/src/index.ts:90] 插件 Config 默认 `fetch: true`。[E: packages/web/tool-web/src/index.ts:54] `standard` / `code` / `cordis` 三份 shipped preset 与 `dsh-base` 都覆盖成 `fetch: false`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:251] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:238] 字段表、turndown、spill 不在本页。

5. 已登记的 Consumer 调 `ctx.web.fetch(request, signal)`。`WebFetchRequest` 只有 `url`；`WebRuntime.fetch@packages/web/web/src/index.ts` **在调用时** `resolveProvider`，不按注册顺序。[E: packages/web/web/src/types.ts:64] [E: packages/web/web/src/index.ts:157] [E: packages/web/web/src/index.ts:158]

6. `resolveProvider` 选路（fetch 与 search 共用同一函数）：[E: packages/web/web/src/index.ts:172]
   - 配置了 `fetchProvider`（或环境变量 `DSH_WEB_FETCH_PROVIDER` 写入**同一**字段）且已登记且 `available()` → 用它。[E: packages/web/web/src/index.ts:93]
   - 配置了但没登记 → `WEB_PROVIDER_CONFIGURED_MISSING`。[E: packages/web/web/src/index.ts:177]
   - 登记了但 `available() === false` → `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`。[E: packages/web/web/src/index.ts:180]
   - 未配置且恰好一个可用 → 用它。
   - 未配置且多个可用 → `WEB_PROVIDER_AMBIGUOUS`。[E: packages/web/web/src/index.ts:191]
   - 未配置且没有可用 → `WEB_PROVIDER_UNAVAILABLE`。[E: packages/web/web/src/index.ts:187]
   `HttpFetchProvider.available()` 恒 true，所以对本后端「不可用」只会发生在**没登记**。`fetch: false` 时 catalog 没有 `web_fetch`；`fetch: true` 但 fetch 表为空时，`ctx.web.fetch` 仍抛 `WEB_PROVIDER_UNAVAILABLE`。enablement ≠ availability。[E: packages/web/tool-web/tests/tool-web.spec.ts:460] [E: packages/web/web/tests/web.spec.ts:204]

7. `HttpFetchProvider.fetch@packages/web/web-fetch-http/src/provider.ts`：`signal` 已 abort 则立刻 `WEB_ABORTED`，**不发请求**。[E: packages/web/web-fetch-http/src/provider.ts:47] 否则 `deadline(signal, limits.timeoutMs, 'WEB_FETCH_TIMEOUT')` 作为 backstop，再 `followAndRead`。[E: packages/web/web-fetch-http/src/provider.ts:51] 这层超时码是 `WEB_FETCH_TIMEOUT`；Consumer 侧还有独立的 `fetchTimeoutMs` → `TOOL_TIMEOUT`，细节在 [`surface.tools.web-fetch`](../../surface/tools/web-fetch.md)。

8. `validateFetchUrl@packages/web/web-fetch-http/src/policy.ts` 在任何网络访问之前跑：超 `maxUrlLength`、`new URL` 失败、scheme 不是 `http:` / `https:` → `WEB_INVALID_URL`；URL 内嵌 username / password → `WEB_BLOCKED_URL`。[E: packages/web/web-fetch-http/src/policy.ts:26] [E: packages/web/web-fetch-http/src/policy.ts:35] [E: packages/web/web-fetch-http/src/policy.ts:38] **没有**私网 / link-local / metadata / SSRF 过滤。每次 redirect 目标再验一遍，同 origin 凭据 Location 同样 `WEB_BLOCKED_URL`。[E: packages/web/web-fetch-http/src/provider.ts:82] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:193]

9. `requestOnce`：`method: 'GET'`、`redirect: 'manual'`，headers 只有 `user-agent` 与 `accept`（`text/html,application/xhtml+xml,text/*;q=0.9,application/json;q=0.8`）。[E: packages/web/web-fetch-http/src/provider.ts:106] [E: packages/web/web-fetch-http/src/provider.ts:107] [E: packages/web/web-fetch-http/src/provider.ts:108] 3xx 集合是 `301 | 302 | 303 | 307 | 308`。[E: packages/web/web-fetch-http/src/provider.ts:212] 跳数先于解析 Location：`redirectsFollowed >= maxRedirects` → `WEB_REDIRECT_BLOCKED`（文案 `exceeded the maximum of N redirects`），即便下一跳已经跨源。[E: packages/web/web-fetch-http/src/provider.ts:65] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:246] 无 `Location` → 取消 body 后 `WEB_PROVIDER_ERROR`。[E: packages/web/web-fetch-http/src/provider.ts:74] 跨 origin（scheme + hostname + port 任一不同）→ `WEB_REDIRECT_BLOCKED`，模型必须对那个 origin 再发一次 Consumer 调用。[E: packages/web/web-fetch-http/src/policy.ts:53] [E: packages/web/web-fetch-http/src/provider.ts:83]

10. `readBody`：`classifyContentType` 把 `text/html` 与 `application/xhtml+xml` 收成 `html`；其它 `text/*` 以及 `application/json` / `application/xml` / `+json` / `+xml` 收成 `text`；其余（含缺 header、`image/png`）返回 `undefined`，provider 抛 `WEB_UNSUPPORTED_CONTENT_TYPE` 并 `cancel` 未读 stream。[E: packages/web/web-fetch-http/src/policy.ts:67] [E: packages/web/web-fetch-http/src/policy.ts:69] [E: packages/web/web-fetch-http/src/provider.ts:122] charset 先于读 body 解析：未声明用 UTF-8；`TextDecoder` 不认识则同样 `WEB_UNSUPPORTED_CONTENT_TYPE` 并 cancel。[E: packages/web/web-fetch-http/src/policy.ts:99] [E: packages/web/web-fetch-http/src/policy.ts:103] [E: packages/web/web-fetch-http/src/provider.ts:132]

11. 体积两档。`Content-Length` 已超过 `maxResponseBytes` → 立刻 `WEB_FETCH_TOO_LARGE`，不读 body。[E: packages/web/web-fetch-http/src/provider.ts:161] stream 涨过帽则切短并 `truncatedByBytes: true`；刚好填满帽不算截断。[E: packages/web/web-fetch-http/src/provider.ts:180] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:130] 解码后再按 `maxBodyChars` 切字符，`truncated = truncatedByBytes || truncatedByChars`。[E: packages/web/web-fetch-http/src/provider.ts:137] [E: packages/web/web-fetch-http/src/provider.ts:145] 404 一类非 2xx **不是**错误：`statusCode` 留在 result 里。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:107]

12. `translateAbortOrNetwork` 看 deadline 的 `signal`，不看 thrown 的构造函数：本层 `timeoutOf(..., 'WEB_FETCH_TIMEOUT')` 有值 → `WEB_FETCH_TIMEOUT`（含读 body 中途超时）；其它 abort → `WEB_ABORTED`；signal 未 abort → `WEB_PROVIDER_ERROR`（连不上）。[E: packages/web/web-fetch-http/src/provider.ts:236] [E: packages/web/web-fetch-http/src/provider.ts:237] [E: packages/web/web-fetch-http/src/provider.ts:239] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:325]

## 设计动机

模型自选 URL 的 GET 会打到调用方给出的任意 http(s) 主机。卫生检查只覆盖 scheme / 凭据 / 长度，没有私网拦截，所以 shipped 组合既不挂本包、又把 Consumer 的 `fetch` 钉死 `false`。[I] Search 走服务端检索，不让模型指定任意 origin，可以留在 `dsh-base`。

`redirect: 'manual'` + 同 origin 上限，是为了让每一次新 origin 都变成一次新的 tool-call（也是一次新的权限 / provider 决策）。跳数预算先于跨源诊断，避免超长链路上的 Location 把错误码搅成「跨源」。

请求匿名、UA 不装浏览器，是为了不携带 cookie / ambient 凭据，也不去骗依赖浏览器指纹的站点。`available()` 恒 true：没有密钥可检查，登记即能用。

`WebFetchRequest` 故意只有 `url`。timeout 与输出呈现属于 Consumer / timeout-policy，换 fetch provider 不该改模型字段。非 2xx 留在 result 里，因为那是资源状态，不是「取失败」。

named export only：Loader 的 default-interop 会剥掉模块顶上的 `inject`。本包不是 `export default` Service，它只往已有的 `ctx.web` 登记。

## Gotcha

- **不要把包默认当成产品默认。** `dsh-tool-web` 的 `fetch: true` 只表示「这个插件被裸 mount 时会登记 `web_fetch`」。四个 shipped preset 与 `dsh-base` 一律 `fetch: false`；本 Provider 根本不在 shipped 树。`dsh web` 默认 catalog 有 `web_search`、没有 `web_fetch`。
- **两道开关都要开。** 只改 `tool-web.fetch: true`、不 overlay 本包 → catalog 有名字，execute 报 `WEB_PROVIDER_UNAVAILABLE`。只挂本包、Consumer 仍 `fetch: false` → provider 闲置，模型看不见工具。example 同时做了这两件事，并且用 `search: false` 让 snapshot 只暴露 fetch。
- **测试里 `ctx.plugin` 本包 ≠ 进了 shipped 树。** `dsh-base` 的 `dependencies` 有 `@deepseek-ai/dsh-tool-web` 与 `@deepseek-ai/dsh-web-search-deepseek`，没有 `@deepseek-ai/dsh-web-fetch-http`。[E: packages/bundle/base/package.json:108] [E: packages/bundle/base/package.json:116]
- **default export 会丢掉 `inject`。** `unwrapExports` 先取 `.default`。[E: vendor/loader/src/index.ts:194]
- **没有 SSRF 门。** `file:` / `ftp:` 会被拒；`http://169.254.169.254/` 或 RFC1918 地址不会。不要在能打到内网的部署上打开本 Provider。
- **跨源 redirect 不会自动跟。** 模型必须对 `WEB_REDIRECT_BLOCKED` 消息里的 origin 再调一次 Consumer。
- **`DSH_WEB_FETCH_PROVIDER` 不是第二条链。** 它和 Config `fetchProvider` 写同一个字段；已配置但未登记是 `WEB_PROVIDER_CONFIGURED_MISSING`，不是回退到「唯一可用者」。
- **`id: web` ≠ 本包 ≠ Web GUI。** `id: web` 是 `@deepseek-ai/dsh-web` 缝；本包是 `id: web-fetch-http`；浏览器宿主是 `dsh-web-app` 的 `webserver`。
- **provider 超时码 ≠ 工具超时码。** 直接打 `HttpFetchProvider.fetch` 得到 `WEB_FETCH_TIMEOUT`；经 timeout-policy 的 `web_fetch` 通常先看到 `TOOL_TIMEOUT`。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-web` 的 `WebRuntime` | `ctx.web`。**host**：`dsh-base` `id: web`（只钉 `searchProvider: deepseek-official`）。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-web-fetch-http` 的 `HttpFetchProvider` | `registerFetchProvider`，id `http`。`inject = ['web']`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。example：`id: web-fetch-http` |
| **Provider（对照，search 半边）** | `dsh-web-search-deepseek` 等 | 同一把 `ctx.web` 的 `registerSearchProvider`。shipped 只挂 DeepSeek。细节见 [`subsys.integration.web-search`](web-search.md) |
| **Consumer** | `@deepseek-ai/dsh-tool-web` 的 `applyWebFetchTool` | 模型名 `web_fetch`。包默认 `fetch: true`；`dsh-base` 与 `standard` / `code` / `cordis` 写 `fetch: false`；`minimal` 无此行。`dsh-web-app` 把 host 行 `disabled: true`，改由 preset 再挂。字段表见 [`surface.tools.web-fetch`](../../surface/tools/web-fetch.md) |

换 fetch 后端 = overlay 一个 `WebFetchProvider` 并打开 Consumer 的 `fetch`，不是改 `dsh-base` 的 search 行。同 id 再登记会 `WEB_DUPLICATE_PROVIDER`。

## Sources

- packages/web/web-fetch-http/src/index.ts
- packages/web/web/src/types.ts
- packages/web/web-fetch-http/src/provider.ts
- packages/web/web-fetch-http/src/policy.ts
- packages/web/web-fetch-http/tests/fetch-http.spec.ts
- packages/web/web-fetch-http/package.json
- packages/web/web/src/index.ts
- packages/web/web/tests/web.spec.ts
- packages/web/tool-web/src/index.ts
- packages/web/tool-web/tests/tool-web.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- examples/acp-agent/web.cordis.yml
- vendor/cordis/src/events.ts
- vendor/loader/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角；本缝的 `ctx` 键是 `web`。
- [surface.tools.web-fetch](../../surface/tools/web-fetch.md)（`surface.tools.web-fetch`）：模型可见 `web_fetch`；schema / turndown / spill / `TOOL_TIMEOUT`。
- [subsys.integration.web-search](web-search.md)（`subsys.integration.web-search`）：同一 `ctx.web` 的 search 半边与三家 search Provider。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 挂 `web` + `web-search-deepseek` + `tool-web` `fetch: false`。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）：host `tool-web` `disabled: true`，preset 再挂；默认产品路径仍是 `dsh web`。
