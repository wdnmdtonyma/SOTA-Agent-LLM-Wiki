---
id: subsys.integration.web-fetch
title: web fetch provider
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/web/web-fetch-http/src/index.ts
  - packages/web/web-fetch-http/src/provider.ts
  - packages/web/web-fetch-http/src/policy.ts
  - packages/web/web-fetch-http/src/network.ts
  - packages/web/web-fetch-http/tests/fetch-http.spec.ts
  - packages/web/web-fetch-http/package.json
  - packages/web/web/src/index.ts
  - packages/web/web/src/types.ts
  - packages/web/web/tests/web.spec.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/tool-web/tests/tool-web.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - snapshots/session/web-fetch/cordis.yml
  - vendor/cordis/src/events.ts
  - vendor/loader/src/index.ts
symbols:
  - HttpFetchProvider
  - LOCAL_FETCH_PROVIDER_ID
  - publicHttpNetwork
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
updated: c291e7961a
---

> `@deepseek-ai/dsh-web-fetch-http` 是 `ctx.web` **fetch 半边**的匿名公共 HTTP(S) Provider：插件名 `web-fetch-http`，`inject = ['web']`，`apply` 调用 `ctx.web.registerFetchProvider(new HttpFetchProvider(limits))`，稳定 id `LOCAL_FETCH_PROVIDER_ID = 'http'`。它不是 default-export Service。`dsh-base` 已挂 `id: web-fetch-http` 并把 `fetchProvider: http` 钉在 `id: web` 上；模型是否看见 `web_fetch` 仍由 Consumer `@deepseek-ai/dsh-tool-web` 的 `fetch` 开关决定。

## 能回答的问题

- `dsh-web-fetch-http` 在不在 shipped bundle 里？`tool-web.fetch` 在 base / 各 preset 分别是什么？
- 插件名、`inject`、`LOCAL_FETCH_PROVIDER_ID`、`registerFetchProvider` 各是什么？为什么不能写成 `export default`？
- `HttpFetchProvider` 的 scheme / 凭据 / 公网 IP 钉死 / 同 origin redirect / 字节与字符帽 / UA 政策各抛什么 `WebError` code？
- `ctx.web.fetch` 怎么选 provider？`DSH_WEB_FETCH_PROVIDER` 是不是另一条隐藏优先级？
- 本包有没有 waterfall？fiber dispose 会不会卸掉 `http`？
- shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；`dsh web` 不是唯一宿主入口。

## 职责边界

本包拥有 **host 面**的一份 `WebFetchProvider`：named export 插件 `name = 'web-fetch-http'`，`inject = ['web']`，`apply` 校验 limits 后 `registerFetchProvider`。[E: packages/web/web-fetch-http/src/index.ts:26] [E: packages/web/web-fetch-http/src/index.ts:29] [E: packages/web/web-fetch-http/src/index.ts:93] 实现类 `HttpFetchProvider`，id 钉死 `LOCAL_FETCH_PROVIDER_ID = 'http'`。[E: packages/web/web-fetch-http/src/provider.ts:36] [E: packages/web/web-fetch-http/src/provider.ts:39] npm 名 `@deepseek-ai/dsh-web-fetch-http`。[E: packages/web/web-fetch-http/package.json:2] 它做匿名 GET、URL 卫生、**公网地址解析与连接钉死**、同 origin redirect、字节/字符帽、charset 解码与 `Content-Type` 分类；请求不带 cookie、不读 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_SEARCH_BASE_URL`。[E: packages/web/web-fetch-http/src/provider.ts:118] [E: packages/web/web-fetch-http/src/network.ts:191]

它**不**拥有：

- `ctx.web` Definition、`registerFetchProvider` / `fetch` 选路、`WebFetchRequest` 词汇 — 同 seam 的 `@deepseek-ai/dsh-web`（`WebRuntime`）。search 半边交给 [`subsys.integration.web-search`](web-search.md)（`subsys.integration.web-search`）。
- 模型可见 `web_fetch` schema、turndown、输出帽、spill、卡片 meta — [`surface.tools.web-fetch`](../../surface/tools/web-fetch.md)（`surface.tools.web-fetch`）。Consumer 是 `@deepseek-ai/dsh-tool-web` 的 `applyWebFetchTool`；本页不复述 `url` 字段表。
- `id: web` 不是 Web GUI。HTTP 宿主是 `dsh-web-app` 的 `id: webserver`，见 [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）。其它 shipped profile 是 `headless` / `sdk` / `sdk-minimal` / `acp`（`dsh --profile sdk|sdk-minimal|acp`）。

**host 面 vs agent-preset 面。** `ctx.web` 是 host 单例。`dsh-base` 的 web 段同时挂 `id: web`（`searchProvider: deepseek-official`、`fetchProvider: http`）+ `id: web-search-deepseek` + `id: web-fetch-http` + `id: tool-web`（`fetch: false`）。[E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/base/cordis.patch.yml:453] [E: packages/bundle/base/cordis.patch.yml:454] [E: packages/bundle/base/cordis.patch.yml:461] [E: packages/bundle/base/cordis.patch.yml:467] `dsh-base` 的 `dependencies` 含 `@deepseek-ai/dsh-tool-web`、`@deepseek-ai/dsh-web`、`@deepseek-ai/dsh-web-fetch-http`、`@deepseek-ai/dsh-web-search-deepseek`。[E: packages/bundle/base/package.json:115] [E: packages/bundle/base/package.json:122] [E: packages/bundle/base/package.json:123] [E: packages/bundle/base/package.json:125] 测试钉死 `web-fetch-http` 行与 `fetchProvider: 'http'`，同时 host `tool-web` 仍 `fetch: false`。[E: packages/bundle/base/tests/base.spec.ts:44] [E: packages/bundle/base/tests/base.spec.ts:45] [E: packages/bundle/base/tests/base.spec.ts:46]

`dsh-web-app` 把 host 上那行 `tool-web` 标 `disabled: true`，改由每会话 preset 再挂。[E: packages/bundle/web-app/cordis.patch.yml:470] [E: packages/bundle/web-app/cordis.patch.yml:470] 四个 shipped preset 目录是 `minimal` / `standard` / `ptc` / `cordis`。`standard` / `ptc` / `cordis` 写 `fetch: true`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:261] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:239] `minimal` 连 `tool-web` 都没有，成员停在 `persistent-shell` + `filesystem`。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:63] `dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，不重写 `tool-web`，因此沿用 base 的 `fetch: false`，但 **仍继承** base 已挂的 `web-fetch-http`。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27]

仓内 snapshot 夹具 `snapshots/session/web-fetch/cordis.yml` 把 shipped `web-fetch-http` 标 `disabled: true`，改插确定性 fixture，并给 `tool-web` 设 `search: false`。[E: snapshots/session/web-fetch/cordis.yml:11] [E: snapshots/session/web-fetch/cordis.yml:13] [E: snapshots/session/web-fetch/cordis.yml:18]

**没有 waterfall，没有 isolate。** 本包不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `web`、limits 非法拒载、重名 `WEB_DUPLICATE_PROVIDER`。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`。[E: vendor/cordis/src/events.ts:238] `tools/pre-execute` 属于 Consumer / loop，不在本包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/web/web-fetch-http/src/index.ts` | named export 插件：`name` / `inject` / `Config` / `apply`；`DEFAULT_USER_AGENT` |
| `packages/web/web-fetch-http/src/provider.ts` | `HttpFetchProvider`、`LOCAL_FETCH_PROVIDER_ID`：GET、redirect、帽、错误翻译 |
| `packages/web/web-fetch-http/src/policy.ts` | 无网络半边：`validateFetchUrl` / `isSameOrigin` / `classifyContentType` / charset；`WEB_FETCH_MAX_URL_LENGTH` |
| `packages/web/web-fetch-http/src/network.ts` | `isPublicIpAddress` / `resolvePublicAddresses` / `requestPinned` / `publicHttpNetwork`：DNS 一次、拒绝非公网、连接钉死 |
| `packages/web/web/src/index.ts` | Definition：`registerFetchProvider`、`WebRuntime.fetch`、`resolveProvider` |
| `packages/web/web/src/types.ts` | `WebFetchRequest` / `WebFetchResult` / `WebFetchBody` / `WebFetchProvider` / `WebError` |
| `packages/web/tool-web/src/index.ts` | Consumer 插件：`fetch` 默认 `true`；`if (resolved.fetch) applyWebFetchTool` |
| `packages/bundle/base/cordis.patch.yml` | shipped host：`web` + `web-search-deepseek` + `web-fetch-http` + `tool-web` `fetch: false` |
| `packages/preset/agent-presets/presets/{standard,ptc,cordis}/agent.cordis.yml` | 会话面打开 `web_fetch` |
| `packages/web/web-fetch-http/tests/fetch-http.spec.ts` | 政策、公网、redirect、帽、abort、named export、fiber dispose |

## 数据模型

| 符号 | 要点 |
|---|---|
| `HttpFetchProvider` | `implements WebFetchProvider`。`id` 恒为 `'http'`。`available()` 恒 `true`（匿名、无凭据可查）。[E: packages/web/web-fetch-http/src/provider.ts:52] [E: packages/web/web-fetch-http/src/provider.ts:52] 可选第二构造参 `resolveAddresses` 默认 `publicHttpNetwork.resolve`。[E: packages/web/web-fetch-http/src/provider.ts:48] |
| `LOCAL_FETCH_PROVIDER_ID` | 字面量 `'http'`。配置 `fetchProvider` / `DSH_WEB_FETCH_PROVIDER` 时写这个 id。[E: packages/web/web-fetch-http/src/provider.ts:36] |
| `HttpFetchLimits` / 插件 `Config` | 全部有默认：`maxResponseBytes: 5_000_000`、`maxBodyChars: 100_000`、`timeoutMs: 30_000`、`maxRedirects: 5`、`userAgent: DEFAULT_USER_AGENT`。[E: packages/web/web-fetch-http/src/index.ts:46] [E: packages/web/web-fetch-http/src/index.ts:48] [E: packages/web/web-fetch-http/src/index.ts:49] URL 长度帽不在 Config 里，而在 `WEB_FETCH_MAX_URL_LENGTH = 2048`。[E: packages/web/web-fetch-http/src/policy.ts:12] 字节/字符/超时必须是正有限数；`timeoutMs` 还不得大于 `2_147_483_647`；`maxRedirects` 是非负整数（`0` = 不跟随）。[E: packages/web/web-fetch-http/src/index.ts:82] [E: packages/web/web-fetch-http/src/index.ts:84] [E: packages/web/web-fetch-http/src/index.ts:85] |
| `DEFAULT_USER_AGENT` | `'deepseek-harness/0.0.1 (+https://github.com/deepseek-ai)'`。产品 agent，不是浏览器伪装。[E: packages/web/web-fetch-http/src/index.ts:23] |
| `WebFetchRequest` | 只有 `url`。timeout / format / 抽取不进 seam 请求；取消走独立的 `signal` 参数。[E: packages/web/web/src/types.ts:64] [E: packages/web/web/src/types.ts:65] |
| `WebFetchResult` | 最终 URL、`statusCode`、封闭 union `WebFetchBody`（`html` \| `text`）、provider 是否裁过解码正文。非 2xx 仍是 result。[E: packages/web/web/src/types.ts:74] [E: packages/web/web/src/types.ts:94] |
| `WebError` code（本 Provider） | 卫生：`WEB_INVALID_URL` / `WEB_BLOCKED_URL`（含凭据与非公网 IP）。跳转：`WEB_REDIRECT_BLOCKED`。体积：`WEB_FETCH_TOO_LARGE`。类型：`WEB_UNSUPPORTED_CONTENT_TYPE`。时间：`WEB_FETCH_TIMEOUT`。取消：`WEB_ABORTED`。传输 / 无 Location / 空 DNS：`WEB_PROVIDER_ERROR`。 |
| Consumer `Config.fetch` | **不是本包的键。** `@deepseek-ai/dsh-tool-web` 的 schemastery 把 `fetch` 默认成 `true`；`dsh-base` 覆盖成 `false`，`standard` / `ptc` / `cordis` 再写成 `true`。[E: packages/web/tool-web/src/index.ts:56] [E: packages/web/tool-web/src/index.ts:94] |

## 控制流

1. Loader 用 named export 加载本包。`unwrapExports` 取 `exports.default ?? exports`；若写成 `export default { apply }`，`name` / `inject` 会丢，`web` 等不到。[E: vendor/loader/src/index.ts:194] 测试钉死 `'default' in fetchPlugin` 为 false。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:582]

2. `apply@packages/web/web-fetch-http/src/index.ts` 把 schemastery 填完的 limits 再断言一遍，然后 `ctx.web.registerFetchProvider(new HttpFetchProvider(limits))`。[E: packages/web/web-fetch-http/src/index.ts:79] [E: packages/web/web-fetch-http/src/index.ts:93] 非法 limits（非正、超时超出 Node timer、小数 / 负 `maxRedirects`）在 load 时抛，不会留下半登记的 provider。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:588]

3. `WebRuntime.registerFetchProvider@packages/web/web/src/index.ts` 走 `ctx.effect`：重名抛 `WEB_DUPLICATE_PROVIDER`；yield 的 disposer 从 `fetchProviders` map 删掉该 id。[E: packages/web/web/src/index.ts:114] [E: packages/web/web/src/index.ts:120] [E: packages/web/web/src/index.ts:124] 测试：挂上 `fetchProvider: 'http'` 后 `fiber.dispose()`，下一次 `ctx.web.fetch` 变成 `WEB_PROVIDER_CONFIGURED_MISSING`。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:578] search 与 fetch 的 id 命名空间独立，两边可以各有一个相同 id。[E: packages/web/web/tests/web.spec.ts:61]

4. Consumer `@deepseek-ai/dsh-tool-web` 的 `apply` **只在** `resolved.fetch` 为真时调用 `applyWebFetchTool`。[E: packages/web/tool-web/src/index.ts:94] 插件 Config 默认 `fetch: true`。[E: packages/web/tool-web/src/index.ts:56] `dsh-base` 覆盖成 `false`；`standard` / `ptc` / `cordis` 再打开。[E: packages/bundle/base/cordis.patch.yml:467] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251] 字段表、turndown、spill 不在本页。

5. 已登记的 Consumer 调 `ctx.web.fetch(request, signal)`。`WebFetchRequest` 只有 `url`；`WebRuntime.fetch@packages/web/web/src/index.ts` **在调用时** `resolveProvider`，不按注册顺序。[E: packages/web/web/src/types.ts:65] [E: packages/web/web/src/index.ts:157] [E: packages/web/web/src/index.ts:158]

6. `resolveProvider` 选路（fetch 与 search 共用同一函数）：[E: packages/web/web/src/index.ts:172]
   - 配置了 `fetchProvider`（或环境变量 `DSH_WEB_FETCH_PROVIDER` 写入**同一**字段）且已登记且 `available()` → 用它。[E: packages/web/web/src/index.ts:93]
   - 配置了但没登记 → `WEB_PROVIDER_CONFIGURED_MISSING`。[E: packages/web/web/src/index.ts:177]
   - 登记了但 `available() === false` → `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`。[E: packages/web/web/src/index.ts:180]
   - 未配置且恰好一个可用 → 用它。
   - 未配置且多个可用 → `WEB_PROVIDER_AMBIGUOUS`。[E: packages/web/web/src/index.ts:191]
   - 未配置且没有可用 → `WEB_PROVIDER_UNAVAILABLE`。[E: packages/web/web/src/index.ts:187]
   `HttpFetchProvider.available()` 恒 true，所以对本后端「不可用」只会发生在**没登记**。`fetch: false` 时 catalog 没有 `web_fetch`；`fetch: true` 但 fetch 表为空时，`ctx.web.fetch` 仍抛 `WEB_PROVIDER_UNAVAILABLE`。enablement ≠ availability。[E: packages/web/tool-web/tests/tool-web.spec.ts:467] [E: packages/web/web/tests/web.spec.ts:204]

7. `HttpFetchProvider.fetch@packages/web/web-fetch-http/src/provider.ts`：`signal` 已 abort 则立刻 `WEB_ABORTED`，**不发请求**。[E: packages/web/web-fetch-http/src/provider.ts:56] 否则 `deadline(signal, limits.timeoutMs, 'WEB_FETCH_TIMEOUT')` 作为 backstop，再 `followAndRead`。[E: packages/web/web-fetch-http/src/provider.ts:61] 这层超时码是 `WEB_FETCH_TIMEOUT`；Consumer 侧还有独立的 `fetchTimeoutMs` → `TOOL_TIMEOUT`，细节在 [`surface.tools.web-fetch`](../../surface/tools/web-fetch.md)。

8. `validateFetchUrl@packages/web/web-fetch-http/src/policy.ts` 在任何网络访问之前跑：超 `WEB_FETCH_MAX_URL_LENGTH`、`new URL` 失败、scheme 不是 `http:` / `https:` → `WEB_INVALID_URL`；URL 内嵌 username / password → `WEB_BLOCKED_URL`。[E: packages/web/web-fetch-http/src/policy.ts:50] [E: packages/web/web-fetch-http/src/policy.ts:33] [E: packages/web/web-fetch-http/src/policy.ts:36] 每次 redirect 目标再验一遍，同 origin 凭据 Location 同样 `WEB_BLOCKED_URL`。[E: packages/web/web-fetch-http/src/provider.ts:92] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:379]

9. `requestOnce` 先 `resolveAddresses(hostname)`（默认 `publicHttpNetwork.resolve` / `resolvePublicAddresses`）：整份 DNS 答案里任一地址不是全局可达 unicast，或经 NAT64 译出非公网 IPv4，整次请求 `WEB_BLOCKED_URL`。[E: packages/web/web-fetch-http/src/provider.ts:118] [E: packages/web/web-fetch-http/src/network.ts:100] [E: packages/web/web-fetch-http/src/network.ts:104] `isPublicIpAddress` 拒绝 RFC1918、link-local（含 `169.254.169.254`）、loopback、组播、文档前缀等。[E: packages/web/web-fetch-http/src/network.ts:54] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:107] 然后 `publicHttpNetwork.request` 用已校验地址集做 Undici `lookup` 钉死：`method: 'GET'`、`redirect: 'manual'`，headers 只有调用方传入的 `user-agent` 与 `accept`。[E: packages/web/web-fetch-http/src/network.ts:191] [E: packages/web/web-fetch-http/src/provider.ts:120] [E: packages/web/web-fetch-http/src/provider.ts:122] 3xx 集合是 `301 | 302 | 303 | 307 | 308`。[E: packages/web/web-fetch-http/src/provider.ts:225] 跳数先于解析 Location：`redirectsFollowed >= maxRedirects` → `WEB_REDIRECT_BLOCKED`（文案 `exceeded the maximum of N redirects`）。[E: packages/web/web-fetch-http/src/provider.ts:76] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:432] 无 `Location` → 取消 body 后 `WEB_PROVIDER_ERROR`。[E: packages/web/web-fetch-http/src/provider.ts:84] 跨 origin（scheme + hostname + port 任一不同）→ `WEB_REDIRECT_BLOCKED`，模型必须对那个 origin 再发一次 Consumer 调用。[E: packages/web/web-fetch-http/src/policy.ts:65] [E: packages/web/web-fetch-http/src/provider.ts:94]

10. `readBody`：`classifyContentType` 把 `text/html` 与 `application/xhtml+xml` 收成 `html`；其它 `text/*` 以及 `application/json` / `application/xml` / `+json` / `+xml` 收成 `text`；其余（含缺 header、`image/png`）返回 `undefined`，provider 抛 `WEB_UNSUPPORTED_CONTENT_TYPE` 并 `cancel` 未读 stream。[E: packages/web/web-fetch-http/src/policy.ts:80] [E: packages/web/web-fetch-http/src/policy.ts:82] [E: packages/web/web-fetch-http/src/provider.ts:135] charset 先于读 body 解析：未声明用 UTF-8；`TextDecoder` 不认识则同样 `WEB_UNSUPPORTED_CONTENT_TYPE` 并 cancel。[E: packages/web/web-fetch-http/src/policy.ts:112] [E: packages/web/web-fetch-http/src/policy.ts:116] [E: packages/web/web-fetch-http/src/provider.ts:147]

11. 体积两档。`Content-Length` 已超过 `maxResponseBytes` → 立刻 `WEB_FETCH_TOO_LARGE`，不读 body。[E: packages/web/web-fetch-http/src/provider.ts:174] stream 涨过帽则切短并 `truncatedByBytes: true`；刚好填满帽不算截断。[E: packages/web/web-fetch-http/src/provider.ts:196] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:316] 解码后再按 `maxBodyChars` 切字符，`truncated = truncatedByBytes || truncatedByChars`。[E: packages/web/web-fetch-http/src/provider.ts:150] [E: packages/web/web-fetch-http/src/provider.ts:158] 404 一类非 2xx **不是**错误：`statusCode` 留在 result 里。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:293]

12. `translateAbortOrNetwork` 看 deadline 的 `signal`，不看 thrown 的构造函数：本层 `timeoutOf(..., 'WEB_FETCH_TIMEOUT')` 有值 → `WEB_FETCH_TIMEOUT`（含读 body 中途超时）；其它 abort → `WEB_ABORTED`；signal 未 abort → `WEB_PROVIDER_ERROR`（连不上）。[E: packages/web/web-fetch-http/src/provider.ts:250] [E: packages/web/web-fetch-http/src/provider.ts:252] [E: packages/web/web-fetch-http/src/provider.ts:252] [E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:511]

## 设计动机

模型自选 URL 的 GET 会打到调用方给出的任意 http(s) 主机。卫生检查覆盖 scheme / 凭据 / 长度，再加 **一次 DNS + 拒绝非公网 + 连接钉死**，避免解析到 RFC1918 / metadata / loopback 后再被 Undici 二次解析绕过。[I] Search 走服务端检索，不让模型指定任意 origin。

`dsh-base` 因此可以挂本 Provider 并钉 `fetchProvider: http`，同时把 **host** `tool-web.fetch` 留在 `false`：headless / sdk-minimal 等不经 Web preset 的路径默认 catalog 仍没有 `web_fetch`。`standard` / `ptc` / `cordis` 在会话面打开工具。

`redirect: 'manual'` + 同 origin 上限，是为了让每一次新 origin 都变成一次新的 tool-call（也是一次新的权限 / 公网校验）。跳数预算先于跨源诊断，避免超长链路上的 Location 把错误码搅成「跨源」。

请求匿名、UA 不装浏览器，是为了不携带 cookie / ambient 凭据，也不去骗依赖浏览器指纹的站点。`available()` 恒 true：没有密钥可检查，登记即能用。

`WebFetchRequest` 故意只有 `url`。timeout 与输出呈现属于 Consumer / timeout-policy，换 fetch provider 不该改模型字段。非 2xx 留在 result 里，因为那是资源状态，不是「取失败」。

named export only：Loader 的 default-interop 会剥掉模块顶上的 `inject`。本包不是 `export default` Service，它只往已有的 `ctx.web` 登记。

## Gotcha

- **包在 shipped 树里 ≠ catalog 一定有 `web_fetch`。** `dsh-base` 依赖并挂载本 Provider，但 host `tool-web.fetch: false`。`dsh --profile web` 走 `standard`/`ptc`/`cordis` 时会话面 `fetch: true`；`headless` / 未覆盖的 host 行仍看不见工具。`minimal` 根本没有 `tool-web`。
- **两道开关。** 只改 `tool-web.fetch: true`、把 `web-fetch-http` 卸掉（snapshot 夹具就是这么干的）→ catalog 有名字，execute 报 `WEB_PROVIDER_UNAVAILABLE` 或 `WEB_PROVIDER_CONFIGURED_MISSING`（base 钉了 `fetchProvider: http`）。只挂本包、Consumer 仍 `fetch: false` → provider 闲置，模型看不见工具。
- **有 SSRF 门，但只认「全局 unicast」。** `file:` / `ftp:` 会被拒；`http://169.254.169.254/`、`10.0.0.1`、loopback 在 `resolvePublicAddresses` 阶段 `WEB_BLOCKED_URL`。测试里本地 HTTP server 必须注入已校验的 `127.0.0.1` resolver，否则真实解析会被挡。[E: packages/web/web-fetch-http/tests/fetch-http.spec.ts:466]
- **跨源 redirect 不会自动跟。** 模型必须对 `WEB_REDIRECT_BLOCKED` 消息里的 origin 再调一次 Consumer。
- **`DSH_WEB_FETCH_PROVIDER` 不是第二条链。** 它和 Config `fetchProvider` 写同一个字段；已配置但未登记是 `WEB_PROVIDER_CONFIGURED_MISSING`，不是回退到「唯一可用者」。
- **`id: web` ≠ 本包 ≠ Web GUI。** `id: web` 是 `@deepseek-ai/dsh-web` 缝；本包是 `id: web-fetch-http`；浏览器宿主是 `dsh-web-app` 的 `webserver`。`dsh web` 不是唯一入口：还有 `dsh --profile headless|sdk|sdk-minimal|acp`。
- **provider 超时码 ≠ 工具超时码。** 直接打 `HttpFetchProvider.fetch` 得到 `WEB_FETCH_TIMEOUT`；经 timeout-policy 的 `web_fetch` 通常先看到 `TOOL_TIMEOUT`。
- **`maxUrlLength` 不再是插件 Config 键。** 长度帽是 `WEB_FETCH_MAX_URL_LENGTH` 常量。
- **default export 会丢掉 `inject`。** `unwrapExports` 先取 `.default`。[E: vendor/loader/src/index.ts:194]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-web` 的 `WebRuntime` | `ctx.web`。**host**：`dsh-base` `id: web`（`searchProvider: deepseek-official`、`fetchProvider: http`）。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-web-fetch-http` 的 `HttpFetchProvider` | `registerFetchProvider`，id `http`。`inject = ['web']`。**在** `dsh-base`（`id: web-fetch-http`） |
| **Provider（对照，search 半边）** | `dsh-web-search-deepseek` 等 | 同一把 `ctx.web` 的 `registerSearchProvider`。shipped 只挂 DeepSeek。细节见 [`subsys.integration.web-search`](web-search.md) |
| **Consumer** | `@deepseek-ai/dsh-tool-web` 的 `applyWebFetchTool` | 模型名 `web_fetch`。包默认 `fetch: true`；`dsh-base` 写 `fetch: false`；`standard` / `ptc` / `cordis` 写 `fetch: true`；`minimal` 无此行。`dsh-web-app` 把 host 行 `disabled: true`，改由 preset 再挂。字段表见 [`surface.tools.web-fetch`](../../surface/tools/web-fetch.md) |

换 fetch 后端 = overlay 一个 `WebFetchProvider`（并改 `fetchProvider` 或卸掉 `http`），不是改 `dsh-base` 的 search 行。同 id 再登记会 `WEB_DUPLICATE_PROVIDER`。

## Sources

- packages/web/web-fetch-http/src/index.ts
- packages/web/web-fetch-http/src/provider.ts
- packages/web/web-fetch-http/src/policy.ts
- packages/web/web-fetch-http/src/network.ts
- packages/web/web-fetch-http/tests/fetch-http.spec.ts
- packages/web/web-fetch-http/package.json
- packages/web/web/src/index.ts
- packages/web/web/src/types.ts
- packages/web/web/tests/web.spec.ts
- packages/web/tool-web/src/index.ts
- packages/web/tool-web/tests/tool-web.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- snapshots/session/web-fetch/cordis.yml
- vendor/cordis/src/events.ts
- vendor/loader/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角；本缝的 `ctx` 键是 `web`。
- [surface.tools.web-fetch](../../surface/tools/web-fetch.md)（`surface.tools.web-fetch`）：模型可见 `web_fetch`；schema / turndown / spill / `TOOL_TIMEOUT`。
- [subsys.integration.web-search](web-search.md)（`subsys.integration.web-search`）：同一 `ctx.web` 的 search 半边与 search Provider。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 挂 `web` + `web-search-deepseek` + `web-fetch-http` + `tool-web` `fetch: false`。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）：host `tool-web` `disabled: true`，preset 再挂。
