---
id: subsys.client.connection
title: client connection
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/connection/src/index.ts
  - packages/client/connection/src/api-path.ts
  - packages/client/connection/src/http-bridge.ts
  - packages/client/connection/src/api-request-trust.ts
  - packages/client/connection/src/loopback-hostname.ts
  - packages/client/connection/src/rpc-host.ts
  - packages/client/connection/src/rpc.ts
  - packages/client/connection/src/browser-auth.ts
  - packages/client/connection/src/client/index.ts
  - packages/client/connection/src/client/rpc.ts
  - packages/client/connection/src/client/connection.ts
  - packages/client/connection/package.json
  - packages/client/connection/tests/node-half.host.spec.ts
  - packages/client/connection/tests/http-bridge.host.spec.ts
  - packages/client/connection/tests/client-apply.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/tests/trusted-hosts.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/src/stream-protocol.ts
  - packages/api/gateway/src/client/index.ts
  - packages/attachment/attachment-local/src/index.ts
  - vendor/loader/src/index.ts
  - packages/boot/app-boot/src/profile.ts
symbols:
  - client-connection
  - API_PATH
  - isTrustedApiRequest
  - BrowserAuth
  - HostConnectionService
  - ConnectionHandle
  - ConnectionController
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.host.webserver
  - subsys.host.apiproxy
  - subsys.client.runtime
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-headless
  - subsys.composition.bundle-base
  - subsys.integration.api-gateway
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-client-connection`（Cordis `name: 'client-connection'`）是 **client 面传输双面**：node 半边把 `/api` 挂到 `ctx.webServer`（Host/Origin 篱笆 → `BrowserAuth` cookie → WHATWG `bridge` → 共享 interceptor / exact Fetch）；浏览器半边提供 `ctx.connection`（无 `?fixture` 时 `createWebConnectionRpc` 走 `POST /<channel>/<endpoint>`）。本包**不**执行模型 turn；WebSocket mux 由 API Gateway 登记。

## 能回答的问题

- `dsh-base` / `dsh-web-app` / `dsh-headless` 谁 insert `id: connection`？yml `inject: [webRuntime]` 和插件 `inject = ['webServer', 'credentials']` 如何叠在一起？
- `/api` 请求先过哪道篱笆？`trustedHosts` 是认证吗？`--host 0.0.0.0` 拒在哪一层？
- 403 与 401 分别何时写？`BrowserAuth` 的 `?token=` 与 `dsh-auth-*` cookie 怎么换？
- GET `/api/remote.mux` 由谁登记 upgrade？浏览器 unary 仍走 HTTP 吗？
- 无 interceptor 时 `/api/<endpoint>` 回什么？`connection.rpc.intercept` 谁先吃 endpoint？
- `maxRequestBodyBytes` 为什么必须盖住 attachments 的 base64 图像上限？`?fixture` 换哪套 RPC？

## 职责边界

DSH 是 **Cordis 组合运行时**（主线 `profile → bundle → agent preset`；capability seam = Definition / Provider / Consumer）。默认 GUI 路径是 `dsh web`（`PROFILE_TEMPLATES.web`）；另有 shipped startup profile `headless` / `sdk` / `sdk-minimal` / `acp`。[E: packages/boot/app-boot/src/profile.ts:110] 本仓没有 shipped TUI。`--host 0.0.0.0` 在 `web-startup` action 里被拒绝，**不是**本包的 listen 逻辑。[E: packages/bundle/web-app/src/startup.ts:75]

本包拥有：

- 路径常量 `API_PATH`（`'/api'`）。mux path **不**在本包定义。
- `/api` 的 **Host 篱笆**（`isTrustedApiRequest`）和 **浏览器会话认证**（`BrowserAuth`）。
- `node:http` ↔ WHATWG `Request` 的 `bridge`，以及 body 上限 `maxRequestBodyBytes`。
- host `HostConnectionService`（`ctx.connection.rpc.handle` / `rpc.intercept` / `fetch.register`、`requestRejection`、`authorizeIndex`）。
- 浏览器 `ctx.connection`：fixture 或 HTTP RPC、`registerGenerationSource` + `start` 单消费者回路。

本包**不**拥有：

- `node:http` `listen` 与路由表实现 — [`subsys.host.webserver`](../host/webserver.md)。
- Session / Settings / Workspace Host Remote 合同 — 节点 id [`subsys.host.apiproxy`](../host/apiproxy.md) 现写三个 `packages/api/*-controller`。本包只提供 `/api` carrier。
- Typert Remote 分发与 **WebSocket mux**（`/api/remote.mux`）— [`subsys.integration.api-gateway`](../integration/api-gateway.md)。
- `--host` / `--port` / `--trusted-host` 解析、LAN 采样、`provide('webRuntime')` — [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)。
- 浏览器 `ctx.sessions` / slot / store — [`subsys.client.runtime`](runtime.md)。**API Gateway 客户端**才是 `connection.start` 的唯一流消费者。
- 模型 turn、`Inbox`、agent-loop。client 把 JSON POST 出去，不跑 loop。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/connection/src/index.ts` | node `apply`：篱笆、`BrowserAuth`、`/api` 路由、图像 body 容量 |
| `packages/client/connection/src/api-path.ts` | `API_PATH = '/api'` |
| `packages/client/connection/src/api-request-trust.ts` | `isTrustedApiRequest` / `assertTrustedAuthority` |
| `packages/client/connection/src/loopback-hostname.ts` | `localhost` / `[::1]` / IPv4 `127/8` |
| `packages/client/connection/src/http-bridge.ts` | `bridge`；默认 cap `300 MiB`；超限 413 |
| `packages/client/connection/src/browser-auth.ts` | 进程 launch token、HttpOnly cookie、index 303 |
| `packages/client/connection/src/rpc-host.ts` | `HostConnectionService`：共享 `/api` interceptor + exact Fetch + 专用 channel |
| `packages/client/connection/src/client/index.ts` | 浏览器 `apply`：`?fixture` / `__DSH_TRANSPORT__`、`provide('connection')` |
| `packages/client/connection/src/client/rpc.ts` | unary `POST ${channel}/${endpoint}` |
| `packages/client/connection/src/client/connection.ts` | `ConnectionController`：generation source、backoff |
| `packages/bundle/web-app/cordis.patch.yml` | **唯一** shipped `id: connection` 行 |
| `packages/api/gateway/src/index.ts` | `rpc.intercept('/api', …)` 与 `REMOTE_STREAM_MUX_PATH` upgrade |
| `packages/api/gateway/src/client/index.ts` | `connection.start` 的唯一产品消费者 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` | 字面量 `'client-connection'`。[E: packages/client/connection/src/index.ts:49] |
| `API_PATH` | `'/api'`。prefix 路由吃 `/api` 与 `/api/<anything>`。[E: packages/client/connection/src/api-path.ts:7] |
| `inject`（host） | `['webServer', 'credentials']`。[E: packages/client/connection/src/index.ts:69] |
| `ConnectionConfig`（host） | `trustedHosts?: string[]`（缺省 `[]`）；`cookieMaxAgeDays` 缺省 `30`；`maxRequestBodyBytes` 缺省 `DEFAULT_MAX_REQUEST_BODY_BYTES`。[E: packages/client/connection/src/index.ts:90] |
| `isTrustedApiRequest` | 读 `Host`（必有、可解析、loopback 或 `trustedHosts`）+ 拒 `sec-fetch-site: cross-site` + 若有 `Origin` 则必须与 Host 同 authority（字面量 `null` 拒）。[E: packages/client/connection/src/api-request-trust.ts:106] [E: packages/client/connection/src/api-request-trust.ts:111] |
| `isLoopbackHostname` | `localhost`、`[::1]`、IPv4 `127/8`（四段且每段 ≤ 255）。[E: packages/client/connection/src/loopback-hostname.ts:13] |
| `DEFAULT_MAX_REQUEST_BODY_BYTES` | `300 * 1024 * 1024`。按默认聚合图像 200 MiB 的 base64 膨胀（×4/3）加约 1 MiB 信封余量取整。[E: packages/client/connection/src/http-bridge.ts:14] [E: packages/attachment/attachment-local/src/index.ts:31] |
| `requestRejection` | 先 `isTrustedApiRequest` → `403`；再 `browserAuth.isAuthenticated` 失败 → `401`。[E: packages/client/connection/src/rpc-host.ts:97] [E: packages/client/connection/src/rpc-host.ts:98] |
| `HostConnectionHandle` | `rpc.handle` / `rpc.intercept` / `fetch.register` / `createSharedFetchHandler` / `requestRejection` / `authorizeIndex` / `authenticatedUrl`。[E: packages/client/connection/src/rpc.ts:160] |
| `ConnectionHandle`（browser） | `isLoopback` / `generation` / `state` / `rpc` / `reconnect` / `registerGenerationSource` / `start`。第二次 `start` 抛「already owned」。[E: packages/client/connection/src/client/index.ts:269] |
| `ConnectionState` | `'connected'` / `'disconnected'` / `'connecting'`。[E: packages/client/connection/src/client/connection.ts:43] |
| `dsh.client` | `inject: []`、`platform: 'web'`、`immediately: true`。[E: packages/client/connection/package.json:36] |

**已删除的符号（47f 时代）：** `PRIVILEGED_METHODS`、`MUX_EVENTS_PATH`、`HOST_EVENTS_PATH`、`WebApiClient`、`ctx.apiProxy`、`toFetchHandler`。特权方法二次空名单不再存在：LAN 上只要过篱笆且带有效 cookie，unary 与 loopback 同等进入 interceptor。

## 控制流

1. **只有 web-app 叠 `id: connection`。** `PROFILE_TEMPLATES.web` 是 `dsh-base` 再 `dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:111] web overlay insert 写 `id: connection` / `name: '@deepseek-ai/dsh-client-connection'` / `inject: [webRuntime]` / `trustedHosts: !!js ctx.webRuntime.trustedHosts`。[E: packages/bundle/web-app/cordis.patch.yml:176] [E: packages/bundle/web-app/cordis.patch.yml:181] [E: packages/bundle/web-app/cordis.patch.yml:183] `dsh-base` 的 insert 有 `typert-gateway`（`@deepseek-ai/dsh-api-gateway`），**没有** `connection` / `webserver`。[E: packages/bundle/base/cordis.patch.yml:45] `dsh-headless` 的 insert 是 `code-runtime` / `headless-startup` / `headless-runner`，同样没有 HTTP 宿主。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] `sdk` / `sdk-minimal` / `acp` 也不叠本行（无 webserver carrier）。本仓没有 shipped TUI。

2. **Loader `inject` 是挂载门，yml 往插件声明上合并。** 插件导出 `inject = ['webServer', 'credentials']`。[E: packages/client/connection/src/index.ts:69] Loader 在 `internal/plugin` 里 `Inject.resolve(fiber.entry.options.inject, fiber.inject)`，把 yml 的 `webRuntime` **加进**同一张 map，不是整表替换。[E: vendor/loader/src/index.ts:122] 因此 web 树上本行等 `webServer`、`credentials` **和** `webRuntime` 都 provide 才 `apply`。`--help` 不 `provide('webStartup')`，`webserver` 行 pending，本行也不挂 `/api`。

3. **`trustedHosts` 来自 `webRuntime` 快照，不是认证名单。** `resolveLanTrust`：只有 bind 字面量 `'0.0.0.0'` 才采非 internal IPv4；loopback bind 的 `lanAddresses` 是 `[]`，`trustedHosts` = LAN 字面量后接 `--trusted-host`。[E: packages/bundle/web-app/src/index.ts:126] [E: packages/bundle/web-app/src/index.ts:131] [E: packages/bundle/web-app/tests/trusted-hosts.spec.ts:30] 默认旗标路径 bind `127.0.0.1`，篱笆只认 loopback，除非用户另加 `--trusted-host`。`--host 0.0.0.0` 在 `web-startup` action 里 `program.error(…intentionally not supported yet for safety…)`，**不** `provide('webStartup')`。[E: packages/bundle/web-app/src/startup.ts:75] `WebServer.Config.host` 仍承认 `'0.0.0.0'`：一条整行改写 `webserver.config` 的 overlay 仍可能绑 all-interfaces，那时才靠本包的 `trustedHosts` 放行 LAN IP。

4. **`apply@packages/client/connection/src/index.ts` 先 fail-loud 配置。** 逐条 `assertTrustedAuthority`：必须是能原样（大小写除外）活过 WHATWG 解析的裸 `host` 或 `host:port`；带 path / userinfo / 空白 / 零填充端口的条目在 load 时抛。[E: packages/client/connection/src/api-request-trust.ts:51] [E: packages/client/connection/tests/node-half.host.spec.ts:183] 再跑 `assertImageBodyCapacity`：若当时已有 `attachments`，`maxRequestBodyBytes` 必须 ≥ `ceil(maxMessageImageBytes * 4 / 3) + 1 MiB`，否则抛错、**不**登记路由。[E: packages/client/connection/src/index.ts:59] [E: packages/client/connection/tests/node-half.host.spec.ts:172] `attachments` 迟到时用 `ctx.inject(['attachments'], …)` 再断言一次。[E: packages/client/connection/src/index.ts:138]

5. **host `ctx.connection` 是 `HostConnectionService`。** 构造 `super(ctx, 'connection')`，传入 `trustedHosts` 与 `BrowserAuth.create(ctx.root, ctx.credentials, cookieMaxAgeDays)`。[E: packages/client/connection/src/index.ts:113] [E: packages/client/connection/src/rpc-host.ts:74] 然后 `createSharedFetchHandler(API_PATH)`：pathname 命中 `fetchRoutes` 且 method 匹配则走 exact Fetch；否则从 `/api/` 切 endpoint，interceptor `matches(endpoint)` 为真才 dispatch；否则 `404 not found`。[E: packages/client/connection/src/rpc-host.ts:123] [E: packages/client/connection/src/rpc-host.ts:127]

6. **`/api` HTTP 路由：篱笆 + cookie 先于 bridge。** `ctx.webServer.register` 一条 `kind: 'prefix'`、`path: API_PATH`。[E: packages/client/connection/src/index.ts:125] handler 先 `connection.requestRejection(req)`：失败立刻 `writeHead(rejection)` + `'unauthorized'`/`'forbidden'`，**不**读 body。[E: packages/client/connection/src/index.ts:128] [E: packages/client/connection/tests/node-half.host.spec.ts:204] 通过才 `bridge(req, res, fetchHandler, maxRequestBodyBytes)`。[E: packages/client/connection/src/index.ts:135]

7. **`bridge` 把 node:http 收成 WHATWG `Request`。** `content-length` 或累计 chunk 超过 cap → `413` + `connection: close` + `req.destroy()`，handler 不跑。[E: packages/client/connection/src/http-bridge.ts:49] [E: packages/client/connection/tests/http-bridge.host.spec.ts:32] 断开检测挂在 `ServerResponse` 的 `close`（不是 `IncomingMessage`）。合成 `Request` 的 origin 是 `http://dsh.internal`。[E: packages/client/connection/src/http-bridge.ts:69]

8. **认证：进程 token 换 cookie，不是特权方法名单。** `BrowserAuth.authenticatedUrl` 给干净 origin 加上 `?token=`（进程内存 `WeakMap` 里 32 字节 launch token）。[E: packages/client/connection/src/browser-auth.ts:228] `authorizeIndex`：GET `/` 且 token 匹配 → `303` + `Set-Cookie`（`HttpOnly; SameSite=Strict`，名 `dsh-auth-` + authority 的 sha256 base64url）。[E: packages/client/connection/src/browser-auth.ts:256] 后续 `/api` 用 `isAuthenticated` 验 cookie：签名、audience=`Host`、未过期。[E: packages/client/connection/src/browser-auth.ts:289] 测试钉：trusted Host 无 cookie → `401 unauthorized`；untrusted Host → `403 forbidden`。[E: packages/client/connection/tests/node-half.host.spec.ts:218] [E: packages/client/connection/tests/node-half.host.spec.ts:204]

9. **本包不再登记 mux/host upgrade。** node-half 测试钉死：挂载后 `upgrades` 长度为 0，只登记 HTTP prefix。[E: packages/client/connection/tests/node-half.host.spec.ts:185] Gateway 在 `inject(['connection', 'webServer'])` 后登记 `REMOTE_STREAM_MUX_PATH`（`'/api/remote.mux'`），upgrade 同样调 `connection.requestRejection`。[E: packages/api/gateway/src/stream-protocol.ts:6] [E: packages/api/gateway/src/index.ts:215]

10. **无 interceptor → 404；有则 Typert `dispatchRpc`。** HTTP `/api` 路由在 gateway 出现之前就能挂。共享 interceptor 的 `fetch` 要求 `POST` + `application/json`，否则 404/415。[E: packages/client/connection/src/rpc-host.ts:210] 业务错误是 200 + `server-response` 里 `RpcResult`，不是本包的 403。Session 动词在 [`subsys.host.apiproxy`](../host/apiproxy.md)（`ctx.sessionController` 等）。

11. **Typert 先 intercept 同一 `/api`。** `TypertGatewayService` `inject(['connection'], …)` 后 `rpc.intercept('/api', endpoint => this.claimsEndpoint(endpoint), dispatchRpc)`。[E: packages/api/gateway/src/index.ts:199] 共享 channel 同时只允许一个 interceptor。[E: packages/client/connection/src/rpc-host.ts:193] `rpc.handle('/api')` 非法（`/api` 保留给共享 channel）。[E: packages/client/connection/src/rpc-host.ts:281]

12. **浏览器半边：无 `?fixture` 用 HTTP RPC。** `apply` 的 `inject` 是 `[]`。`location.search` 带 `fixture` 键 → `createFixtureConnectionRpc`；否则 `createWebConnectionRpc(transport?.fetch, transport?.openStream)`，再 `ctx.provide('connection', handle)`。[E: packages/client/connection/src/client/index.ts:195] [E: packages/client/connection/src/client/index.ts:198] [E: packages/client/connection/src/client/index.ts:295] 无 `location` 也走 Web RPC，`isLoopback` 为 true。`?fixture` 下 `rpc.call('/api', 'settings/describe', …)` 直接成功。[E: packages/client/connection/tests/client-apply.client.spec.ts:135] `__DSH_TRANSPORT__.ownsHost` 可把 `isLoopback` 强制为 true（worker preview）。[E: packages/client/connection/src/client/index.ts:237]

13. **unary 是 `POST ${channel}/${endpoint}`。** `createWebConnectionRpc.call` 组 `ClientRequest`，`content-type: application/json`，相对 `location.origin`（无则 `http://dsh.internal`）。[E: packages/client/connection/src/client/rpc.ts:46] 浏览器默认**没有** `rpc.open`；Gateway 客户端自建 `RemoteStreamMuxClient`。[E: packages/client/connection/src/client/rpc.ts:61] [E: packages/api/gateway/src/client/index.ts:148]

14. **`ConnectionController` 等 generation source ready。** `start` 要求已 `registerGenerationSource`，否则抛错。[E: packages/client/connection/src/client/index.ts:271] source 在挂好增量监听后调 `ready(host)`；`generationReadyTimeoutMs` 缺省 3000。[E: packages/client/connection/src/recovery-config.ts:30] 然后 `onConnected`。流失或失败 → abort 本代、`connecting`/`disconnected`、抖动 backoff。sink throw 只 `console.error`。

15. **API Gateway 客户端是 `start` 的唯一产品消费者。** `ClientRemoteService` 构造时拿 `ctx.connection`，loader quiescence 后 `connection.start({ onConnected, onReconnectRequested })`。[E: packages/api/gateway/src/client/index.ts:168] 第二次 `start` 抛错。[E: packages/client/connection/src/client/index.ts:269] 旧 `packages/client/runtime` 已删除。

16. **第一次普通提问只是本线上的一条 unary。** Session client 经 `ctx.remote` / `ctx.sessions` 发 `POST /api/<namespace>/<method>`。host 再 `followup`。client **不**执行模型 turn。端到端步骤在 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

## 设计动机

- **传输与合同切开。** interceptor / exact Fetch 零 `node:http`；本包只拥有浏览器打开的那条物理面（Host 篱笆、cookie、body cap）。Gateway 拥有 Typert codec 与 WS mux。
- **`trustedHosts` 是 DNS-rebinding 篱笆，不是登录。** rebound 页带着攻击者域名，即使 socket 落到本机。plain HTTP 的读请求往往没有 Origin / Fetch-Metadata。网络可达性归 webserver bind。
- **登录是进程绑定 cookie。** `dsh web` 打印的 URL 带一次性 `?token=`；换出的 cookie 钉在 Host authority 上。LAN 匿名调用方既过不了篱笆也没有 cookie。
- **图像 base64 会撑破默认 HTTP cap。** 默认聚合 200 MiB 编码后再 ×4/3，加上 RPC JSON 信封。cap 不够就在 load 抛。
- **双面同一包。** node 半边扫进 `window.__DSH_BOOT__`；浏览器半边 `immediately: true` 先于 UI 插件。换 carrier（`__DSH_TRANSPORT__`）不必改 Session。

## Gotcha

- **untrusted Host = 403；trusted 但无 cookie = 401。** 篱笆先于认证。[E: packages/client/connection/src/rpc-host.ts:97]
- **没有 `PRIVILEGED_METHODS`。** 不要再写「`session.create` 不在特权集合」——集合已删除。
- **web-app yml 注释仍写「fetch/SSE client」，浏览器 unary 是 fetch；mux 是 Gateway WebSocket。** [E: packages/bundle/web-app/cordis.patch.yml:176]
- **本包不登记 `/api/events.mux`。** 现行 path 是 `/api/remote.mux`，由 gateway 登记。[E: packages/api/gateway/src/stream-protocol.ts:6]
- **`maxRequestBodyBytes` 过小会让整插件 load 失败**（有 `attachments` 时）。[E: packages/client/connection/src/index.ts:59]
- **`rpc.handle('/api')` 非法。** 专用 channel 形如 `/rpc`。[E: packages/client/connection/src/rpc-host.ts:281]
- **共享 `/api` 只能有一个 interceptor。** 第二个 `intercept` 抛 `already has an interceptor`。[E: packages/client/connection/src/rpc-host.ts:193]
- **`start()` 单消费者且必须先 `registerGenerationSource`。** Gateway 客户端拥有回路。
- **`?fixture` 整页脱离 HTTP。** 生产 URL 不要带这个 query。
- **`--host 0.0.0.0` 拒在 `web-startup`，不是本包。** 本包仍必须在 all-interfaces overlay 下按 `trustedHosts` 工作。
- **client 不跑模型 turn。** 403/401/413 都是 carrier；业务错误在 200 的 `server-response` 里。

## Seam 三角

| 缝 | Definition | Provider（base / web-app / headless） | Consumer |
|---|---|---|---|
| host `ctx.connection` | `HostConnectionHandle`（`rpc` + `fetch` + `requestRejection`） | **web-app** `id: connection` → `HostConnectionService`。**base / headless / sdk / sdk-minimal / acp：无此行。** | `TypertGatewayService` 的 `rpc.intercept('/api', …)`；专用 `/rpc` 类 channel；frontend-static 的 `authorizeIndex` |
| browser `ctx.connection` | `ConnectionHandle`（`rpc` / `start` / `generation`） | 同一包 `./client` `apply`；`dsh.client.immediately: true` | API Gateway **client** `inject` 本服务后 `start`；Session controller 客户端走 `ctx.remote` |
| `/api` 信任篱笆 | `isTrustedApiRequest` + `assertTrustedAuthority` | **web-app** 行把 `trustedHosts` 绑到 `ctx.webRuntime.trustedHosts` | 每条 `/api` HTTP；Gateway mux upgrade 复用 `requestRejection` |
| `BrowserAuth` | cookie + process token | 本包 `credentials` inject；secret 存在 credential key `client-connection/browser-session` | `/api` 与 index；web-runtime 打印 `authenticatedUrl` |
| Typert `/api` intercept | `ConnectionRpcEndpointMatcher` | **base** 已有 `id: typert-gateway`；web 叠 base 后仍在。**headless 有 gateway 包、无 HTTP carrier。** | plugin-inventory 等 Remote；session/settings/workspace controller 的 Host Remote |
| `ctx.webServer` | `WebServer.register` / `registerUpgrade` | **web-app** `id: webserver` | connection 的 prefix `/api`；gateway 的 mux upgrade |
| `ctx.webRuntime` | `trustedHosts`（LAN 字面量 + `--trusted-host`） | **web-app** `id: web-runtime` | connection 行 `inject: [webRuntime]` |

换掉 web-app 的 `connection` 行：浏览器打不到 Host Remote，`typertGateway` 服务可以还在，但没有物理 `/api`。换掉 `api-gateway` 行、留下 connection：篱笆仍 403/401，放行后 unary 404。Definition（`/api` 路径、RPC 信封）不变。

## Sources

- packages/client/connection/src/index.ts
- packages/client/connection/src/api-path.ts
- packages/client/connection/src/http-bridge.ts
- packages/client/connection/src/api-request-trust.ts
- packages/client/connection/src/loopback-hostname.ts
- packages/client/connection/src/rpc-host.ts
- packages/client/connection/src/rpc.ts
- packages/client/connection/src/browser-auth.ts
- packages/client/connection/src/client/index.ts
- packages/client/connection/src/client/rpc.ts
- packages/client/connection/src/client/connection.ts
- packages/client/connection/package.json
- packages/client/connection/tests/node-half.host.spec.ts
- packages/client/connection/tests/http-bridge.host.spec.ts
- packages/client/connection/tests/client-apply.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/tests/trusted-hosts.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/api/gateway/src/index.ts
- packages/api/gateway/src/stream-protocol.ts
- packages/api/gateway/src/client/index.ts
- packages/attachment/attachment-local/src/index.ts
- vendor/loader/src/index.ts
- packages/boot/app-boot/src/profile.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一次 session prompt unary；本页是其中 `/api` + cookie 那一段。
- [`subsys.host.webserver`](../host/webserver.md) — `listen` 与 `register` / `registerUpgrade`；本包是 prefix `/api` 的登记者。
- [`subsys.host.apiproxy`](../host/apiproxy.md) — 现为三个 Host HTTP API controller + webserver；本包是它们的 HTTP carrier。
- [`subsys.client.runtime`](runtime.md) — `packages/client/store` + session-controller 客户端 + ui-renderer；消费 `ctx.remote` 而非直接 `connection.start`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面：旗标、`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 叠 `connection` 行、`webRuntime.trustedHosts`。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 无 webserver / 无 connection。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — 共享 insert；有 `typert-gateway`、无 `/api` 物理面。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `rpc.intercept('/api', …)` 与 `/api/remote.mux`。
