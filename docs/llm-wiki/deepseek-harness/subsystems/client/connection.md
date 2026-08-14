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
  - packages/client/connection/src/websocket-downlink.ts
  - packages/client/connection/src/client/index.ts
  - packages/client/connection/src/client/web-api-client.ts
  - packages/client/connection/src/client/rpc.ts
  - packages/client/connection/src/client/connection.ts
  - packages/client/connection/package.json
  - packages/client/connection/tests/node-half.host.spec.ts
  - packages/client/connection/tests/api-request-trust.host.spec.ts
  - packages/client/connection/tests/http-bridge.host.spec.ts
  - packages/client/connection/tests/client-apply.client.spec.ts
  - packages/client/connection/tests/connection.client.spec.ts
  - packages/client/connection/tests/loopback-hostname.client.spec.ts
  - packages/client/connection/tests/websocket-downlink.host.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/tests/trusted-hosts.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/host/apiproxy/src/fetch/handler.ts
  - packages/host/apiproxy/src/fetch/client.ts
  - packages/api/gateway/src/index.ts
  - packages/attachment/attachment-local/src/index.ts
  - packages/client/runtime/src/client/index.ts
  - vendor/loader/src/index.ts
symbols:
  - client-connection
  - API_PATH
  - PRIVILEGED_METHODS
  - isTrustedApiRequest
  - WebApiClient
  - HostConnectionService
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
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-connection`（Cordis `name: 'client-connection'`）是 **client 面传输双面**：node 半边把 host 的 `ctx.apiProxy` 绑到 `ctx.webServer` 的 `/api`（信任篱笆 → WHATWG `bridge` → `toFetchHandler`，mux/host 走 WebSocket upgrade）；浏览器半边提供 `ctx.connection`（无 `?fixture` 时 `WebApiClient`：unary `POST /api/<method>`，mux/host 走 WS）。本包**不**执行模型 turn。

## 能回答的问题

- `dsh-base` / `dsh-web-app` / `dsh-headless` 谁 insert `id: connection`？yml `inject: [webRuntime]` 和插件 `inject = ['webServer']` 如何叠在一起？
- `/api` 请求先过哪道篱笆？`trustedHosts` 是认证吗？`--host 0.0.0.0` 拒在哪一层？
- `PRIVILEGED_METHODS` 完整名单是什么？`session.create` / `session.prompt` / `agentPreset.list` / `llm.models` 为什么不在集合里？
- GET `/api/events.mux` 为何回 426？浏览器半边的 mux/host 物理通道是 SSE 还是 WebSocket？
- 无 `ctx.apiProxy` 时 `/api` 回什么？`connection.rpc.intercept` 谁先吃 endpoint？
- `maxRequestBodyBytes` 为什么必须盖住 attachments 的 base64 图像上限？`?fixture` 换哪套 client？

## 职责边界

DSH 是 **Cordis 组合运行时**（主线 `profile → bundle → agent preset`；capability seam = Definition / Provider / Consumer；`model-visible ⟺ logged`）。默认安装路径是 `dsh web`；本仓没有 shipped TUI。`--host 0.0.0.0` 在 `provide('webStartup')` **之前**被 launcher / `web-startup` 拒绝，**不是**本包的 listen 逻辑。

本包拥有：

- 路径常量 `API_PATH` / `MUX_EVENTS_PATH` / `HOST_EVENTS_PATH`。
- `/api` 的 **Host 篱笆**（`isTrustedApiRequest`）和 **特权方法二次空名单**（`PRIVILEGED_METHODS` + `isTrustedApiRequest(request, [])`）。
- `node:http` ↔ WHATWG `Request` 的 `bridge`，以及 body 上限 `maxRequestBodyBytes`。
- host `HostConnectionService`（`ctx.connection.rpc.handle` / `rpc.intercept`）和 mux/host 的 WebSocket downlink。
- 浏览器 `ctx.connection`：`WebApiClient` / `FixtureApiClient`、`ConnectionController` 双流握手。

本包**不**拥有：

- `node:http` `listen` 与路由表实现 — [`subsys.host.webserver`](../host/webserver.md)。
- 传输无关 BFF 合同与 `session.create` / `session.prompt` / mux 帧语义 — [`subsys.host.apiproxy`](../host/apiproxy.md)。本包只把合同绑到 `/api`。
- Typert Remote 分发（`connection.rpc.intercept('/api', …)`）— [`subsys.integration.api-gateway`](../integration/api-gateway.md)。只点名，不展开 codec。
- `--host` / `--port` / `--trusted-host` 解析、LAN 采样、`provide('webRuntime')` — [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)。
- `Session` / `Session.prompt` / slot — [`subsys.client.runtime`](runtime.md)。runtime 是浏览器半边 `connection.start` 的唯一流消费者。
- 模型 turn、`Inbox`、`ReactLoopAgent`。client 把文本 POST 出去，不跑 loop。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/connection/src/index.ts` | node `apply`：篱笆、特权集合、`/api` 路由、WS 登记、图像 body 容量 |
| `packages/client/connection/src/api-path.ts` | `API_PATH = '/api'`、`/api/events.mux`、`/api/events.host` |
| `packages/client/connection/src/api-request-trust.ts` | `isTrustedApiRequest` / `assertTrustedAuthority`（DNS-rebinding + cross-site） |
| `packages/client/connection/src/loopback-hostname.ts` | `localhost` / `[::1]` / IPv4 `127/8` |
| `packages/client/connection/src/http-bridge.ts` | `bridge`；默认 cap `160 MiB`；超限 413 |
| `packages/client/connection/src/rpc-host.ts` | `HostConnectionService`：共享 `/api` interceptor + 专用 channel |
| `packages/client/connection/src/websocket-downlink.ts` | mux/host upgrade；client 上行消息视为协议违规 |
| `packages/client/connection/src/client/index.ts` | 浏览器 `apply`：`?fixture` 选型、`provide('connection')` |
| `packages/client/connection/src/client/web-api-client.ts` | unary `fetch`；mux/host 覆盖为 WebSocket |
| `packages/client/connection/src/client/connection.ts` | `ConnectionController`：describe + 双流 onOpen、backoff |
| `packages/bundle/web-app/cordis.patch.yml` | **唯一** shipped `id: connection` 行 |
| `packages/bundle/web-app/src/index.ts` | `resolveLanTrust` → `webRuntime.trustedHosts` |
| `packages/client/connection/tests/node-half.host.spec.ts` | 特权钉 loopback；list/select/catalog 放行 |
| `packages/client/connection/tests/client-apply.client.spec.ts` | 无 `?fixture` → `WebApiClient`；WS URL |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` | 字面量 `'client-connection'`。[E: packages/client/connection/src/index.ts:27] |
| `API_PATH` | `'/api'`。prefix 路由吃 `/api` 与 `/api/<anything>`。[E: packages/client/connection/src/api-path.ts:8] |
| `MUX_EVENTS_PATH` / `HOST_EVENTS_PATH` | `'/api/events.mux'` / `'/api/events.host'`。[E: packages/client/connection/src/api-path.ts:11] [E: packages/client/connection/src/api-path.ts:14] |
| `ConnectionConfig`（host） | `trustedHosts?: string[]`（缺省 `[]`）；`maxRequestBodyBytes` 缺省 `DEFAULT_MAX_REQUEST_BODY_BYTES`。 |
| `PRIVILEGED_METHODS` | 即使 Host 已在 `trustedHosts` 命中，也再跑空名单、钉 loopback。完整集合：`agentPreset.read` / `agentPreset.copy` / `agentPreset.openDocument` / `agentPreset.remove` / `host.pickDirectory` / `host.openPath` / `settings.describe` / `settings.openDocument` / `settings.update` / `settings.replace` / `settings.mutate` / `credentials.describe` / `credentials.set` / `credentials.unset` / `llm.discoverModels`。[E: packages/client/connection/src/index.ts:104] [E: packages/client/connection/src/index.ts:118] |
| 不在集合 | `agentPreset.list` / `agentPreset.select` / `session.create` / `session.prompt` / `llm.providers` / `llm.models`。能开会话的调用方已经能跑该进程的默认工具面；钉 switch 是篱笆旁边再立一扇开着的门。[E: packages/client/connection/tests/node-half.host.spec.ts:485] |
| `isTrustedApiRequest` | 读 `Host`（必有、可解析、loopback 或 `trustedHosts`）+ 拒 `sec-fetch-site: cross-site` + 若有 `Origin` 则必须与 Host 同 authority（字面量 `null` 拒）。[E: packages/client/connection/src/api-request-trust.ts:108] [E: packages/client/connection/src/api-request-trust.ts:111] |
| `isLoopbackHostname` | `localhost`、`[::1]`、IPv4 `127/8`（四段且每段 ≤ 255）。[E: packages/client/connection/src/loopback-hostname.ts:13] |
| `DEFAULT_MAX_REQUEST_BODY_BYTES` | `160 * 1024 * 1024`。按默认聚合图像 100 MiB 的 base64 膨胀（×4/3）加约 1 MiB 信封余量取整。[E: packages/client/connection/src/http-bridge.ts:12] [E: packages/attachment/attachment-local/src/index.ts:19] |
| `HostConnectionHandle` | host `ctx.connection`：`rpc.handle(channel, …)` 登记专用前缀；`rpc.intercept('/api', matches, …)` 在 fallback 前截 endpoint。`/api` 不能当专用 channel。[E: packages/client/connection/src/rpc-host.ts:221] |
| `ConnectionHandle`（browser） | `api` / `isLoopback` / `hostDescription` / `rpc` / `start(sinks)`。第二次 `start` 抛「already owned」。[E: packages/client/connection/src/client/index.ts:116] |
| `ConnectionState` | `'connected'`（握手成功）或 `'reconnecting'`（整段 backoff）。初次连接前不发 state。 |
| `dsh.client` | `inject: []`、`platform: 'web'`、`immediately: true`：浏览器半边是壳最先拉的线根。[E: packages/client/connection/package.json:36] |

## 控制流

1. **只有 web-app 叠 `id: connection`。** `PROFILE_TEMPLATES.web` 是 `dsh-base` 再 `dsh-web-app`。web overlay 第一段 insert 写 `id: connection` / `name: '@deepseek-ai/dsh-client-connection'` / `inject: [webRuntime]` / `trustedHosts: !!js ctx.webRuntime.trustedHosts`。[E: packages/bundle/web-app/cordis.patch.yml:156] [E: packages/bundle/web-app/cordis.patch.yml:158] [E: packages/bundle/web-app/cordis.patch.yml:163] `dsh-base` 的 insert 有 `typert-gateway`（`@deepseek-ai/dsh-api-gateway`），**没有** `connection` / `webserver`。[E: packages/bundle/base/cordis.patch.yml:36] `dsh-headless` 的 insert 是 `code-runtime` / `headless-startup` / `headless-runner`，同样没有 HTTP 宿主。[E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] 本仓没有 shipped TUI。

2. **Loader `inject` 是挂载门，yml 往插件声明上合并。** 插件导出 `inject = ['webServer']`。[E: packages/client/connection/src/index.ts:47] Loader 在 `internal/plugin` 里 `Inject.resolve(fiber.entry.options.inject, fiber.inject)`，把 yml 的 `webRuntime` **加进**同一张 map，不是整表替换。[E: vendor/loader/src/index.ts:122] 因此 web 树上本行等 `webServer` **和** `webRuntime` 都 provide 才 `apply`。`webRuntime` 在 bind 之后采样 LAN；`--help` 不 `provide('webStartup')`，`webserver` 行 pending，本行也不挂 `/api`。

3. **`trustedHosts` 来自 `webRuntime` 快照，不是认证名单。** `resolveLanTrust@packages/bundle/web-app/src/index.ts`：只有 bind 字面量 `'0.0.0.0'` 才采非 internal IPv4；loopback bind 的 `lanAddresses` 是 `[]`，`trustedHosts` = LAN 字面量后接 `--trusted-host`。[E: packages/bundle/web-app/src/index.ts:86] [E: packages/bundle/web-app/src/index.ts:91] [E: packages/bundle/web-app/tests/trusted-hosts.spec.ts:30] 默认旗标路径 bind `127.0.0.1`，篱笆只认 loopback，除非用户另加 `--trusted-host`。`--host 0.0.0.0` 在 `web-startup` action 里 `program.error(…intentionally not supported yet for safety…)`，**不** `provide('webStartup')`。[E: packages/bundle/web-app/src/startup.ts:70] `WebServer.Config.host` 仍承认 `'0.0.0.0'`：一条整行改写 `webserver.config` 的 overlay 仍可能绑 all-interfaces，那时才靠本包的 `trustedHosts` 放行 LAN IP。

4. **`apply@packages/client/connection/src/index.ts` 先 fail-loud 配置。** 逐条 `assertTrustedAuthority`：必须是能原样（大小写除外）活过 WHATWG 解析的裸 `host` 或 `host:port`；带 path / userinfo / 空白 / 零填充端口的条目在 load 时抛，而不是请求时悄悄改授权面。[E: packages/client/connection/src/api-request-trust.ts:57] [E: packages/client/connection/tests/node-half.host.spec.ts:113] 若当时已有 `apiProxy`，再跑 `assertImageBodyCapacity`：`maxRequestBodyBytes` 必须 ≥ `ceil(maxMessageImageBytes * 4 / 3) + 1 MiB`，否则抛错、**不**登记路由。[E: packages/client/connection/src/index.ts:38] [E: packages/client/connection/tests/node-half.host.spec.ts:102]

5. **host `ctx.connection` 是 `HostConnectionService`。** 构造 `super(ctx, 'connection')`，再 `createSharedFetchHandler(API_PATH, fallback)`。[E: packages/client/connection/src/rpc-host.ts:52] interceptor 的 `matches(endpoint)` 为真则走 Typert 那条 handler（可再按 `authority === 'loopback'` 空名单）；否则 `fallback.fetch`。[E: packages/client/connection/src/rpc-host.ts:79] [E: packages/client/connection/src/rpc-host.ts:80]

6. **`/api` HTTP 路由：篱笆先于 bridge。** `ctx.webServer.register` 一条 `kind: 'prefix'`、`path: API_PATH`。[E: packages/client/connection/src/index.ts:173] handler 先 `isTrustedApiRequest(req, trustedHosts)`：失败立刻 `403 forbidden`，**不**读 body。[E: packages/client/connection/src/index.ts:165] [E: packages/client/connection/tests/node-half.host.spec.ts:159] 通过才 `bridge(req, res, fetchHandler, maxRequestBodyBytes)`。

7. **`bridge@packages/client/connection/src/http-bridge.ts` 把 node:http 收成 WHATWG `Request`。** `content-length` 或累计 chunk 超过 cap → `413` + `connection: close` + `req.destroy()`，handler 不跑。[E: packages/client/connection/src/http-bridge.ts:49] [E: packages/client/connection/tests/http-bridge.host.spec.ts:31] 断开检测挂在 `ServerResponse` 的 `close`（不是 `IncomingMessage`：Node 16 之后 body 读完就会 fire request close，会误杀长流）。合成 `Request` 的 origin 是 `http://dsh.internal`。

8. **fallback 里特权方法再跑一遍空名单。** 从 pathname 切出 `method`（`/api/` 之后的整段）。`PRIVILEGED_METHODS.has(method) && !isTrustedApiRequest(request, [])` → `403 forbidden`。[E: packages/client/connection/src/index.ts:147] [E: packages/client/connection/src/index.ts:148] 测试钉死：`trustedHosts: ['harness.example']` 时，名单内方法对 `Host: harness.example` 全 403；`session.list` 同类普通读能进 bridge（空 proxy 回 404 证明篱笆过了）。[E: packages/client/connection/tests/node-half.host.spec.ts:186] [E: packages/client/connection/tests/node-half.host.spec.ts:191] 真 HTTP 上同一权威对 `llm.providers` / `llm.models` / `agentPreset.list` / `agentPreset.select` 是 404 不是 403。[E: packages/client/connection/tests/node-half.host.spec.ts:486]

9. **GET 两条 event path 回 426，不走 SSE。** `request.method === 'GET'` 且 pathname 是 mux 或 host → `426` + `upgrade: websocket`。[E: packages/client/connection/src/index.ts:150] [E: packages/client/connection/src/index.ts:152] `toFetchHandler` 内部仍为 in-process / 测试保留 SSE GET；Web 进程里浏览器先撞到本包的 426。

10. **无 `apiProxy` → 404；有则 `toFetchHandler(apiProxy).fetch`。** [E: packages/client/connection/src/index.ts:157] [E: packages/client/connection/src/index.ts:158] HTTP `/api` 路由在 `apiProxy` 出现之前就能挂（测试里只 provide `webServer` 也能 `register`）。`toFetchHandler` 按 path 分发 `POST /api/<method>` 等到 BFF；业务错误是 200 + `RpcResult`，不是本包的 403。细节在 [`subsys.host.apiproxy`](../host/apiproxy.md)。

11. **mux/host 是 `registerUpgrade`，同样过篱笆。** `ctx.inject(['apiProxy'], …)` 等到 BFF 出现：建 `WebSocketDownlinks`，登记 `/api/events.mux` 与 `/api/events.host`。[E: packages/client/connection/src/index.ts:193] [E: packages/client/connection/src/index.ts:194] untrusted upgrade 走 `rejectWebSocketUpgrade`（明文 `HTTP/1.1 403 Forbidden`），**不**做协议协商。[E: packages/client/connection/src/websocket-downlink.ts:145] [E: packages/client/connection/tests/node-half.host.spec.ts:149] 连上之后 client 发来任何 message → `close(1008, 'downlink only')`：上行仍走 HTTP。

12. **Typert 先 intercept 同一 `/api`，本页不展开。** `TypertGatewayService` `inject(['connection'], …)` 后 `rpc.intercept('/api', endpoint => this.claimsEndpoint(endpoint), dispatchRpc, { authority: 'trusted-host' })`。[E: packages/api/gateway/src/index.ts:105] 共享 channel 同时只允许一个 interceptor。Typert 认 `namespace/method`；`session.create` 这种点分名落到 `toFetchHandler` fallback。合同在 [`subsys.integration.api-gateway`](../integration/api-gateway.md)。

13. **浏览器半边：无 `?fixture` 用 `WebApiClient`。** `apply@packages/client/connection/src/client/index.ts` 的 `inject` 是 `[]`。有 `location.search` 且带 `fixture` 键 → `FixtureApiClient`；否则 `new WebApiClient()`，再 `ctx.provide('connection', handle)`。[E: packages/client/connection/src/client/index.ts:86] [E: packages/client/connection/src/client/index.ts:88] [E: packages/client/connection/src/client/index.ts:143] 无 `location`（测试 / 非浏览器）也走 `WebApiClient`，`isLoopback` 为 true。测试钉死：`search: ''` 是 `WebApiClient`；`?fixture` 是 fixture。[E: packages/client/connection/tests/client-apply.client.spec.ts:69]

14. **unary 是 `POST /api/<method>`，mux/host 是 WS。** `AbstractApiClient.callUnary` 组 `ClientRequest`，`postJson(\`/api/${method}\`)`，`content-type: application/json`。[E: packages/host/apiproxy/src/fetch/client.ts:341] `WebApiClient` 覆盖 `openMux` / `openHost` 为 `readWebSocket`（http→`ws:`，https→`wss:`），**不**走基类 SSE。[E: packages/client/connection/src/client/web-api-client.ts:23] 测试看到的 URL 是 `ws://localhost:3080/api/events.mux` 与 `…/events.host`，且打开流时 `fetch` 不被调用。[E: packages/client/connection/tests/client-apply.client.spec.ts:215]

15. **`ConnectionController` 严格握手后才算 connected。** `host.describe` 证明 unary 通；mux 与 host 的 `onOpen` 证明两条物理流已建立；`streamOpenTimeoutMs`（缺省 3000）到点仍继续，靠后续 live-gap 补。[E: packages/client/connection/src/client/connection.ts:140] 然后 `onConnected(description)`。任一流结束或 describe 失败 → abort 本代、`reconnecting`、抖动 backoff。sink throw 只 `console.error`，不拖死 pump。

16. **runtime 是 `start` 的唯一消费者。** client runtime `inject = ['connection', …]`，`connection.start({ onMuxEnvelope, onHostEnvelope, onConnected, onStateChange })`。[E: packages/client/runtime/src/client/index.ts:183] [E: packages/client/runtime/src/client/index.ts:204] 第二次 `start` 抛错。[E: packages/client/connection/src/client/index.ts:116] mux 帧进 `Session.handleMuxEnvelope`；host 帧进 session/workspace，并把 `host/remote-event` 交给 `ctx.remote.$dispatch`。

17. **第一次普通提问只是本线上的一条 unary。** `Session.prompt` 调 `api.sessions.prompt` → `POST /api/session.prompt`。该方法**不在** `PRIVILEGED_METHODS`。host BFF 再 `followup`。client **不**执行模型 turn；slash 命令不经 `session.prompt`。端到端步骤在 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

## 设计动机

- **传输与合同切开。** `ApiProxy` / `toFetchHandler` 零 `node:http`；本包只拥有浏览器打开的那条物理面（Host 篱笆、body cap、WS downlink）。in-process 测试可以直接喂 `toFetchHandler`，不必挂 webserver。
- **`trustedHosts` 是 DNS-rebinding 篱笆，不是登录。** 浏览器把 `Host` 填成它以为在说话的权威； rebound 页带着攻击者域名，即使 socket 落到本机。plain HTTP 的读请求往往没有 Origin / Fetch-Metadata，所以不能靠「有没有浏览器标记」放行。网络可达性归 webserver bind；认证层尚不存在。
- **配置面钉 loopback。** settings / credentials 的 **读** 与写同等特权（`describe` 泄露命名空间与密钥来源）。`host.pickDirectory` / `openPath` 驱动本机桌面。`llm.discoverModels` 让 HOST 去打调用方选的 URL。LAN 上的匿名调用方不能碰这些。`session.create` 已经能挂默认工具面（含 bash），所以开会话本身不进特权表。
- **Web 的下行必须是 WS。** 浏览器对跨站 WS 有自己的握手；GET SSE 在本包被 426，避免「同一 path 两种语义」。基类 SSE 留给 `InProcessApiClient`。
- **图像 base64 会撑破默认 HTTP cap。** 默认聚合 100 MiB 编码后再 ×4/3，加上 RPC JSON 信封。cap 不够就在 load 抛，而不是第一张大图 413。
- **双面同一包。** node 半边扫进 `window.__DSH_BOOT__`；浏览器半边 `immediately: true` 先于 UI 插件。换 carrier 不必改 `Session` / composer。

## Gotcha

- **`trustedHosts` 命中 ≠ 特权方法放行。** 第二次篱笆传的是 `[]`，只认 loopback。[E: packages/client/connection/src/index.ts:147]
- **`session.create` / `session.prompt` / `agentPreset.list` / `agentPreset.select` / `llm.providers` / `llm.models` 不在特权集合。** LAN 客户端的 picker 需要 catalog；开会话已经等于能跑默认工具。
- **web-app yml 注释写「fetch/SSE client」，浏览器实现是 fetch + WebSocket。** 以 `WebApiClient.openMux` 为准。[E: packages/client/connection/src/client/web-api-client.ts:23]
- **GET `/api/events.mux` 在 Web 进程是 426。** 不要把 `toFetchHandler` 里的 SSE 当成 GUI 通道。[E: packages/client/connection/src/index.ts:152]
- **`maxRequestBodyBytes` 过小会让整插件 load 失败**（有 `attachments` + `apiProxy` 时）。调大图像上限必须同步抬 cap。[E: packages/client/connection/src/index.ts:38]
- **`rpc.handle('/api')` 非法**（`/api` 保留给共享 channel）。专用 channel 形如 `/rpc`。[E: packages/client/connection/src/rpc-host.ts:221]
- **共享 `/api` 只能有一个 interceptor。** 第二个 `intercept` 抛 `already has an interceptor`。
- **`start()` 单消费者。** runtime 拥有双流；别的插件再 `start` 会抛。
- **`?fixture` 整页脱离 HTTP。** 用于无 server 的 UI 开发；生产 URL 不要带这个 query。
- **`--host 0.0.0.0` 拒在 `web-startup`，不是本包。** 本包仍必须在 all-interfaces overlay 下按 `trustedHosts` 工作。
- **client 不跑模型 turn。** 403/426/413 都是 carrier；`session-not-found` 这类业务错误在 200 的 `RpcResult` 里。

## Seam 三角

| 缝 | Definition | Provider（base / web-app / headless） | Consumer |
|---|---|---|---|
| host `ctx.connection` | `HostConnectionHandle` / `HostConnectionRpc`（`rpc.handle` + `rpc.intercept`） | **web-app** `id: connection` → `HostConnectionService`。**base：无此行。headless：无此行。** | `TypertGatewayService` 的 `rpc.intercept('/api', …)`；专用 `/rpc` 类 channel |
| browser `ctx.connection` | `ConnectionHandle`（`api` / `start` / `rpc.call`） | 同一包 `./client` `apply`；`dsh.client.immediately: true`。无 connection 行则壳图里也没有这半边 | client runtime `inject: ['connection', …]` 的 `start`；`Session.prompt` 走 `api.sessions.*` |
| `/api` 信任篱笆 | `isTrustedApiRequest` + `assertTrustedAuthority`；`trustedHosts` = DNS-rebinding 篱笆 | **web-app** 行把 `trustedHosts` 绑到 `ctx.webRuntime.trustedHosts`。**base / headless：无 `/api`。** | 每条 `/api` HTTP 与 mux/host upgrade。未过篱笆不到 `bridge` / `toFetchHandler` |
| `PRIVILEGED_METHODS` | `index.ts` 里那张 `Set`（二次 `isTrustedApiRequest(request, [])`） | 本包 fallback，与 bundle 无关；只有挂上 connection 才生效 | settings / credentials / 部分 `agentPreset.*` / native dialog / `llm.discoverModels` |
| `ctx.apiProxy` | `ApiProxy` / `toFetchHandler` | **web-app** `id: api-gateway`。**base / headless：无。** | connection fallback。缺席则 unary 404；WS 整段 `inject(['apiProxy'])` 不登记 |
| `ctx.webServer` | `WebServer.register` / `registerUpgrade` | **web-app** `id: webserver`（`inject: [webStartup]`，缺省 `127.0.0.1:3080`）。**base / headless：无。** | connection 的 prefix `/api` 与两条 upgrade。apiproxy **不**登记路由 |
| `ctx.webRuntime` | `WebRuntimeValues.trustedHosts`（LAN 字面量 + `--trusted-host`） | **web-app** `id: web-runtime`。**base / headless：无。** | connection 行 `inject: [webRuntime]` 与 `!!js ctx.webRuntime.trustedHosts` |
| Typert `/api` intercept | `ConnectionRpcEndpointMatcher` + `authority: 'trusted-host'` | **base** 已有 `id: typert-gateway`；web 叠 base 后仍在。**headless 有 gateway 包、无 HTTP carrier。** | plugin-inventory 等 Remote。点分 `session.*` 不匹配，回落到 apiproxy |

换掉 web-app 的 `connection` 行：浏览器打不到 BFF，`typertGateway` 服务可以还在，但没有物理 `/api`。换掉 `api-gateway` 行、留下 connection：篱笆仍 403 不该来的 Host，放行后 unary 404。Definition（`/api` 路径、四象限信封、特权方法名）不变。

## Sources

- packages/client/connection/src/index.ts
- packages/client/connection/src/api-path.ts
- packages/client/connection/src/http-bridge.ts
- packages/client/connection/src/api-request-trust.ts
- packages/client/connection/src/loopback-hostname.ts
- packages/client/connection/src/rpc-host.ts
- packages/client/connection/src/rpc.ts
- packages/client/connection/src/websocket-downlink.ts
- packages/client/connection/src/client/index.ts
- packages/client/connection/src/client/web-api-client.ts
- packages/client/connection/src/client/rpc.ts
- packages/client/connection/src/client/connection.ts
- packages/client/connection/package.json
- packages/client/connection/tests/node-half.host.spec.ts
- packages/client/connection/tests/api-request-trust.host.spec.ts
- packages/client/connection/tests/http-bridge.host.spec.ts
- packages/client/connection/tests/client-apply.client.spec.ts
- packages/client/connection/tests/connection.client.spec.ts
- packages/client/connection/tests/loopback-hostname.client.spec.ts
- packages/client/connection/tests/websocket-downlink.host.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/tests/trusted-hosts.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/host/apiproxy/src/fetch/handler.ts
- packages/host/apiproxy/src/fetch/client.ts
- packages/api/gateway/src/index.ts
- packages/attachment/attachment-local/src/index.ts
- packages/client/runtime/src/client/index.ts
- vendor/loader/src/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一次 `POST /api/session.prompt`；本页是其中 `/api` + WS 那一段。
- [`subsys.host.webserver`](../host/webserver.md) — `listen` 与 `register` / `registerUpgrade`；本包是 prefix `/api` 的登记者。
- [`subsys.host.apiproxy`](../host/apiproxy.md) — `ctx.apiProxy` / `toFetchHandler` / `session.*`；本包是它的 HTTP/WS carrier。
- [`subsys.client.runtime`](runtime.md) — `connection.start` 的流消费者；`Session.prompt` 发 unary。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面：旗标、`--host 0.0.0.0` 拒在 `webStartup` 之前、host insert 全表。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 叠 `connection` 行、`webRuntime.trustedHosts`、旗标层拒 all-interfaces。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 无 webserver / 无 connection；工具留在 host。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — 共享 insert；有 `typert-gateway`、无 `/api` 物理面。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `rpc.intercept('/api', …)` 的 Typert Remote 分发。
