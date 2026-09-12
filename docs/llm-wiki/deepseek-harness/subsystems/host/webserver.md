---
id: subsys.host.webserver
title: HTTP 宿主
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/webserver/src/index.ts
  - packages/host/webserver/src/injections.ts
  - packages/host/webserver/package.json
  - packages/host/webserver/tests/webserver.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/cmdline/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/client/connection/src/index.ts
  - packages/client/connection/src/api-path.ts
  - packages/client/modules/src/index.ts
  - packages/client/hmr/src/index.ts
  - packages/client/hmr/src/events.ts
  - packages/client/ui-theme/src/index.ts
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/src/stream-protocol.ts
  - packages/webhook/webhook-github/src/index.ts
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/fiber.ts
  - vendor/schemastery/src/index.ts
  - apps/cli/src/args.ts
symbols:
  - WebServer
  - ctx.webServer
  - WebRoute
  - registerFallback
  - tapIndex
  - applyIndexTaps
  - renderIndex
  - collectIndexInjections
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.host.frontend-static
  - subsys.host.apiproxy
  - subsys.client.connection
  - subsys.client.modules
  - subsys.client.hmr
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-host-webserver` 的 `WebServer` 是 **host 面** HTTP **route-registration carrier**：`node:http` + Cordis service `ctx.webServer`。`[Service.init]` **立刻** `listen(config.port, config.host)`。本包不懂 harness、不发文件、不打印 URL。gzip / index inject / 唯一 fallback 座都在本包；dist 由组成应用拥有。[E: packages/host/webserver/package.json:2] [E: packages/host/webserver/src/index.ts:144] [E: packages/host/webserver/src/index.ts:294]

## 能回答的问题

- `dsh web` / `dsh --profile web` 谁 `listen`？缺省 bind 是什么？`--host 0.0.0.0` 为何在 `provide('webStartup')` 之前被拒？
- `WebServer.Config.host` 为何仍承认 `'0.0.0.0'`？一条 overlay 整行改 `config` 会怎样？
- `register` / `registerUpgrade` 重复 `(kind, path)`、`registerFallback` 第二人，各抛什么？
- `match` 何时走 exact、何时最长前缀？无 named route 且无 fallback 回什么？
- `tapIndex` 只登记还是立刻改 HTML？`renderIndex` / `webserver/index-inject` 谁先跑？谁调用它们？
- `dsh-base` / `dsh-headless` / `dsh-sdk-app` / `dsh-acp-app` 有没有 `id: webserver`？handler reject / upgrade 未命中 / teardown 各做什么？

## 职责边界

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`，capability seam 是 Definition / Provider / Consumer。`webserver` 只属于 **host 面**（进程级 listen 与路由表）。**agent-preset 面**（每会话 tools / persona / isolate）和 **client 面**（浏览器半边，不执行模型 turn）都不在本包。

五个 shipped profile：`web`（`patchReload: live`）以及 `headless` / `sdk` / `sdk-minimal` / `acp`（`startup`）。`dsh web` 是 launcher 上**唯一**硬编码的 profile alias；`sdk` / `sdk-minimal` / `acp` / `headless` 走 `dsh --profile <name>`，没有 `dsh sdk` 子命令。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:110] [E: apps/cli/src/args.ts:187] 本仓没有 shipped TUI 包。

本包拥有：`node:http` `Server` 的 bind；exact / prefix 两张 HTTP 表与一张 exact upgrade 表；唯一 fallback 座；`indexTaps` 列表与 `webserver/index-inject` 事件；可选 gzip 中间件；已 upgrade socket 的跟踪与销毁；单请求失败时的 log + 400 / `destroy`（不让未捕获 reject 拖垮进程）。

本包**不**拥有：

- 静态文件、SPA MIME、traversal 篱笆 — [`subsys.host.frontend-static`](frontend-static.md) 占 fallback 座。
- `/api` 浏览器信任篱笆、WHATWG `Request` 桥 — [`subsys.client.connection`](../client/connection.md) `register` prefix `/api`。
- Typert Remote HTTP/WS mux — [`subsys.host.apiproxy`](apiproxy.md) 现为三个 `packages/api/*-controller` + [`@deepseek-ai/dsh-api-gateway`](../../../deepseek-harness/packages/api/gateway/src/index.ts)；gateway **会** `registerUpgrade` `/api/remote.mux`。旧包 `packages/host/apiproxy` 已删除。
- `--host` / `--port` / `--no-open` / `--trusted-host`、`webStartup`、就绪 URL 行、`ctx.plugin(FrontendStatic)` — [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)。
- `window.__DSH_BOOT__` 图与 `/plugins` 前缀 — [`subsys.client.modules`](../client/modules.md) 经 `webserver/index-inject`。
- `/plugins/events` SSE — [`subsys.client.hmr`](../client/hmr.md)。
- 模型 turn、session log、preset mount。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/webserver/src/index.ts` | `WebServer`：schema、gzip、`register*`、`match`、`listen`、index render、teardown |
| `packages/host/webserver/src/injections.ts` | `IndexInjection` 行与 `renderIndexInjections` |
| `packages/host/webserver/package.json` | npm 名 `@deepseek-ai/dsh-host-webserver`；export `.` |
| `packages/host/webserver/tests/webserver.spec.ts` | 真 Loader：exact 胜 prefix、最长前缀、404/400、重复抛错、gzip、upgrade、EADDRINUSE、teardown |
| `packages/bundle/web-app/cordis.patch.yml` | `id: webserver`：`inject: [webStartup]`，`host` / `port` / gzip 表达式 |
| `packages/bundle/web-app/src/startup.ts` | `provide('webStartup')`；`--host 0.0.0.0` 在 provide **之前** `program.error` |
| `packages/bundle/web-app/src/index.ts` | `web-app`：挂 frontend-static、打印 `dsh web:` URL、`--no-open` |
| `packages/bundle/web-app/tests/startup.spec.ts` | 无旗标回退 `127.0.0.1:3080`；`0.0.0.0` / `--help` 不 provide |
| `packages/bundle/base/cordis.patch.yml` | 共享 core insert；**无** `webserver` 行 |
| `packages/bundle/headless/cordis.patch.yml` | `code-runtime` + `headless-*`；**无** `webserver` 行 |
| `packages/host/frontend-static/src/index.ts` | 唯一 shipped fallback owner；index 响应调 `renderIndex` |
| `packages/client/connection/src/index.ts` | `register` prefix `/api` |
| `packages/api/gateway/src/index.ts` | `registerUpgrade` `/api/remote.mux` |
| `packages/client/modules/src/index.ts` | `register` prefix `/plugins`；`webserver/index-inject` 注入 boot 图 |
| `packages/client/hmr/src/index.ts` | `register` exact `/plugins/events` |
| `packages/webhook/webhook-github/src/index.ts` | GitHub adapter 登记 **exact** `webServer` 路由 |
| `vendor/cordis/src/fiber.ts` | class plugin 构造后立刻跑 `[Service.init]` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `WebServer` | `Service` 子类。构造 `super(ctx, 'webServer')` 立刻 `provide`。augmentation 把 `Context.webServer` 钉成该实例。[E: packages/host/webserver/src/index.ts:144] |
| `Config.host` | `'127.0.0.1' \| '0.0.0.0'`。schema `z.union` 两枚 `z.const`，**required**，无第三字面量。[E: packages/host/webserver/src/index.ts:61] [E: packages/host/webserver/src/index.ts:126] |
| `Config.port` | `z.natural().max(65535)`。`natural` = 整数且 `min(0)`。`0` = OS 选端口；对外 `port` getter 读的是 `listenedPort`（`address().port`）。[E: packages/host/webserver/src/index.ts:127] [E: packages/host/webserver/src/index.ts:150] |
| `Config.compression` | `'none' \| 'gzip'`，default `'none'`。web-app 行写成 `gzip`。[E: packages/host/webserver/src/index.ts:128] [E: packages/bundle/web-app/cordis.patch.yml:136] |
| `WebRoute` | `{ kind: 'exact' \| 'prefix', path, handler }`。`path` 约定绝对 pathname、无尾斜杠。handler 拥有完整 response 生命周期（可挂起，如 SSE）。[E: packages/host/webserver/src/index.ts:42] |
| `WebUpgradeRoute` | `{ path, handler }`。只走 exact pathname。[E: packages/host/webserver/src/index.ts:51] |
| 四张内部表 | `exact` / `prefixes`：`Map<path, WebRoute>`。`upgrades`：`Map<path, WebUpgradeRoute>`。`upgradedSockets`：`Set<Duplex>`。[E: packages/host/webserver/src/index.ts:133] |
| `fallback` | 至多一个 `handler`。未登记时 unmatched HTTP → 404。[E: packages/host/webserver/src/index.ts:138] |
| `indexTaps` | `(html: string) => string` 数组。`tapIndex` 只 `push`；折叠是 `applyIndexTaps`。[E: packages/host/webserver/src/index.ts:137] |
| `IndexInjection` | `global` / `script` / `script-src` / `script-preload` / `style` / `html`。`collectIndexInjections` 发 `webserver/index-inject`。[E: packages/host/webserver/src/injections.ts:15] [E: packages/host/webserver/src/index.ts:349] |

`WebServer` **没有** class-level `static inject`。shipped 行的 `inject: [webStartup]` 是 **Loader 挂载门**，不是 Cordis 事件 waterfall。

## 控制流

1. **模板把本包叠进 web，不叠进 base / headless / sdk / acp。** `PROFILE_TEMPLATES.web` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`，`patchReload: 'live'`。`headless` / `sdk` / `acp` 叠 base + 各自 app；`sdk-minimal` **只**叠 `@deepseek-ai/dsh-sdk-minimal`。没有 TUI 模板。[E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:111] [E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:122]

2. **web-app 真树插入 `id: webserver`。** 行名 `@deepseek-ai/dsh-host-webserver`，`inject: [webStartup]`，`config.host` / `config.port` 写 `!!js ctx.webStartup.host ?? '127.0.0.1'` 与 `ctx.webStartup.port ?? 3080`，并打开 gzip。缺省 bind 是表达式回退，不是 `WebServer.Config` 的 schema default。[E: packages/bundle/web-app/cordis.patch.yml:128] [E: packages/bundle/web-app/cordis.patch.yml:135] [E: packages/bundle/web-app/cordis.patch.yml:135] [E: packages/bundle/web-app/cordis.patch.yml:135] [E: packages/bundle/web-app/cordis.patch.yml:135]

3. **base / headless 不 insert 这一行。** `dsh-base` 的 `insert` 从 `timer` / `hmr` 起铺共享 core，文件里没有 `id: webserver`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:21] `dsh-headless` 的 `insert` 只有 `code-runtime`、`headless-startup`、`headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27] sdk / acp overlay 同样没有 webserver 行。

4. **`--host 0.0.0.0` 在 `provide('webStartup')` 之前 fail-closed。** `apply@packages/bundle/web-app/src/startup.ts` 声明 `inject: ['cmdlineArgs']`。commander 登记 `--host` / `--no-open` / `--port` / `--trusted-host`。action 里若 `options.host === '0.0.0.0'` 则 `program.error(…intentionally not supported yet for safety…)`，**不会**执行后面的 `ctx.provide(WEB_STARTUP_SERVICE, …)`。非 `/^\d+$/` 的 `--port` 同样 error。[E: packages/bundle/web-app/src/startup.ts:17] [E: packages/bundle/web-app/src/startup.ts:51] [E: packages/bundle/web-app/src/startup.ts:74] [E: packages/bundle/web-app/src/startup.ts:80]

5. **`parseCmdline` 把 `program.error` 收成 `appExit`，action 不再往下跑。** `parseCmdline` 捕获 Commander 形状错误后 `exit(error.exitCode)`。`--help` 也不跑 action。测试钉死：`--host 0.0.0.0` 时 `webStartup === undefined`、`inject` consumer 的 `readerConfig` 不出现、`appExit(1)`。[E: packages/boot/cmdline/src/index.ts:184] [E: packages/bundle/web-app/tests/startup.spec.ts:137] [E: packages/bundle/web-app/tests/startup.spec.ts:139] [E: packages/bundle/web-app/tests/startup.spec.ts:142] [E: packages/bundle/web-app/tests/startup.spec.ts:142]

6. **无旗标时服务值不含 host/port。** `bootProvider([])` 得到 `{ openBrowser: true, trustedHosts: [] }`；fixture consumer 用与 shipped yml 相同的 `??` 读成 `127.0.0.1:3080`。`inject: [webStartup]` 的行在服务缺失时 pending：`--help` 不 bind 端口。[E: packages/bundle/web-app/tests/startup.spec.ts:109] [E: packages/bundle/web-app/tests/startup.spec.ts:110] [E: packages/bundle/web-app/tests/startup.spec.ts:110] [E: packages/bundle/web-app/tests/startup.spec.ts:114]

7. **构造立刻 `provide('webServer')`，`[Service.init]` 立刻 `listen`。** `WebServer` 构造调用 `super(ctx, 'webServer')`；`Service` 构造里 `ctx.reflect.provide(name, self, …)`。Loader 对 class plugin `new callback` 之后立刻 `instance[symbols.init]()`。`[Service.init]` 里 `this.server.listen(this.config.port, this.config.host, …)`，成功后把 `listenedPort` 写成 `address().port`。listen 失败（端口占用）reject init；测试匹配 `EADDRINUSE`。[E: packages/host/webserver/src/index.ts:144] [E: vendor/cordis/src/service.ts:57] [E: vendor/cordis/src/fiber.ts:257] [E: packages/host/webserver/src/index.ts:294] [E: packages/host/webserver/tests/webserver.spec.ts:373]

8. **HTTP 请求：pathname → `match` → named handler 或唯一 fallback。** `createServer` 回调把 `req.url` 交给 `new URL(…, 'http://x').pathname`（query 不参与匹配），再 `this.match(rawPath)`。命中则 `await route.handler`。未命中且 `fallback === undefined` 则 `writeHead(404)` + `end`；有 fallback 则 `await fallback(req, res)`。gzip 在 `handle` 之前包一层。[E: packages/host/webserver/src/index.ts:224] [E: packages/host/webserver/src/index.ts:225] [E: packages/host/webserver/src/index.ts:232] [E: packages/host/webserver/src/index.ts:236] [E: packages/host/webserver/src/index.ts:254] [E: packages/host/webserver/tests/webserver.spec.ts:222]

9. **`match`：exact 表先；miss 后 prefix 表最长前缀胜。** `exact.get(pathname)` 命中即返回。否则遍历 `prefixes`：`pathname === prefix` **或** `pathname.startsWith(prefix + '/')` 才算；`prefix.length` 更大者胜。因此 `/api/deep/leaf` 走更长的 `/api/deep`，`/api` 自身也由 prefix `/api` 回答；`/apifoo` 不会命中 `/api`。named route **不**按 method 分流——POST 打到已登记 prefix 仍是 200，405 是 fallback owner 的语义。[E: packages/host/webserver/src/index.ts:319] [E: packages/host/webserver/src/index.ts:323] [E: packages/host/webserver/src/index.ts:324] [E: packages/host/webserver/tests/webserver.spec.ts:213] [E: packages/host/webserver/tests/webserver.spec.ts:215] [E: packages/host/webserver/tests/webserver.spec.ts:216] [E: packages/host/webserver/tests/webserver.spec.ts:217]

10. **handler reject 不杀进程。** `handle().catch`：`ctx.logger.warn`；`res.headersSent` 则 `res.destroy()`，否则 `writeHead(400)` + `end`。测试用 fallback 里 `decodeURIComponent('/%zz')` 钉 400，随后 `/probe` 仍 200。[E: packages/host/webserver/src/index.ts:245] [E: packages/host/webserver/src/index.ts:250] [E: packages/host/webserver/tests/webserver.spec.ts:240] [E: packages/host/webserver/tests/webserver.spec.ts:241]

11. **upgrade：exact pathname，未命中 `socket.destroy()`。** `server.on('upgrade')` 用同一套 `URL(…).pathname` 查 `upgrades`（因此 `/events?stream=mux` 仍命中 `/events`）。查表抛错或 `route === undefined` 都 `socket.destroy()`。命中则加入 `upgradedSockets`，handler 的 sync throw 与 Promise reject 同样 log + destroy。[E: packages/host/webserver/src/index.ts:257] [E: packages/host/webserver/src/index.ts:270] [E: packages/host/webserver/src/index.ts:276] [E: packages/host/webserver/src/index.ts:280] [E: packages/host/webserver/tests/webserver.spec.ts:271]

12. **重复登记是 composition 错误，抛错而不是 last-wins。** `register`：`(kind, path)` 已在对应表 → `webserver: duplicate ${kind} route "${path}"`。`registerUpgrade`：path 已在 → `duplicate upgrade route`。`registerFallback`：`fallback !== undefined` → `fallback already registered`。各自 disposer 删表项 / 置 `undefined` 后可再登记。[E: packages/host/webserver/src/index.ts:168] [E: packages/host/webserver/src/index.ts:182] [E: packages/host/webserver/src/index.ts:198] [E: packages/host/webserver/tests/webserver.spec.ts:232] [E: packages/host/webserver/tests/webserver.spec.ts:246] [E: packages/host/webserver/tests/webserver.spec.ts:270]

13. **index 渲染两层：结构化行再 raw tap。** `tapIndex` `push` 纯函数并返回 splice disposer。`collectIndexInjections` 发 `webserver/index-inject`。`renderIndex` = `applyIndexTaps(renderIndexInjections(html, collect…))`。`frontend-static` 的 `renderIndex` 闭包读 `index.html` 后立刻 `ctx.webServer.renderIndex(...)`。modules / ui-theme 订阅 `webserver/index-inject` 推 boot 图 / theme 行，不再靠 `tapIndex`。没有人调 `renderIndex` / `applyIndexTaps`，tap 对线上响应为零效果。[E: packages/host/webserver/src/index.ts:211] [E: packages/host/webserver/src/index.ts:359] [E: packages/host/frontend-static/src/index.ts:121] [E: packages/client/modules/src/index.ts:545] [E: packages/client/ui-theme/src/index.ts:40]

14. **shipped named Consumer 挂在 host 树上，不是本包写死的路由。** `client-connection` 硬 `inject = ['credentials']`，`/api` 经 `ctx.inject(['webServer'], …)` 机会主义 `register` prefix `API_PATH`（`'/api'`）。`TypertGatewayService` 在 `inject(['connection', 'webServer'])` 后 `registerUpgrade` `REMOTE_STREAM_MUX_PATH`（`'/api/remote.mux'`），升级前再跑 `connection.requestRejection`。`ClientModuleRegistry` `register` prefix `'/plugins'`。`client-hmr` `register` exact `EVENTS_ENDPOINT`（`'/plugins/events'`）。GitHub webhook 另登记一条 exact path。[E: packages/client/connection/src/index.ts:69] [E: packages/client/connection/src/index.ts:119] [E: packages/client/connection/src/index.ts:126] [E: packages/client/connection/src/api-path.ts:7] [E: packages/api/gateway/src/stream-protocol.ts:6] [E: packages/api/gateway/src/index.ts:223] [E: packages/client/modules/src/index.ts:539] [E: packages/client/hmr/src/events.ts:44] [E: packages/client/hmr/src/index.ts:176] [E: packages/webhook/webhook-github/src/index.ts:50]

15. **fallback 座由 `web-app` 代码挂上，不是 yml 行。** `web-app` `export const inject = ['webServer']`。`apply` 在 `provide('webRuntime')` 之后 `ctx.plugin(FrontendStatic, { distIndex: internals.resolveDistIndex() })`。`frontend-static` `inject = ['webServer', 'connection']`，`registerFallback` 占唯一座。Loader `await()` 成功后才 `console.log(\`dsh web: ${authenticatedUrl}…\`)`——URL 行属于 `web-app`，不属于 `webserver`。[E: packages/bundle/web-app/src/index.ts:41] [E: packages/bundle/web-app/src/index.ts:231] [E: packages/bundle/web-app/src/index.ts:232] [E: packages/bundle/web-app/src/index.ts:271] [E: packages/host/frontend-static/src/index.ts:27] [E: packages/host/frontend-static/src/index.ts:124]

16. **teardown：`closeAllConnections` + 显式 destroy 已 upgrade 的 sockets。** `ctx.effect(..., 'webServer.listen')` 在 fiber dispose 时 `server.close`、`closeAllConnections`，并对 `upgradedSockets` 逐个 `destroy` 后等 `close`。Node 的 `closeAllConnections` **不含** 已 upgrade 的 socket。测试在仍挂着的 upgrade 上 `fiber.dispose()`，断言 server-side socket 关闭且后续 `fetch` reject。[E: packages/host/webserver/src/index.ts:308] [E: packages/host/webserver/src/index.ts:311] [E: packages/host/webserver/tests/webserver.spec.ts:300] [E: packages/host/webserver/tests/webserver.spec.ts:301] [E: packages/host/webserver/tests/webserver.spec.ts:303]

17. **schema 仍承认 all-interfaces。** `Config.host` 是 `'127.0.0.1' | '0.0.0.0'`。旗标路径拒的是 `web-startup` 字面量 `'0.0.0.0'`，**不是** schema。一条替换整行 `webserver.config` 的 overlay 仍可写出 `host: '0.0.0.0'` 并成功 listen。`--host 1.2.3.4` 能过 `web-startup`（只拦那一个字面量），会在本包 schema 上失败。`port` 的 `0` 合法：`Schema.natural` 是 `number().step(1).min(0)`。[E: packages/host/webserver/src/index.ts:61] [E: packages/host/webserver/src/index.ts:126] [E: vendor/schemastery/src/index.ts:530]

本包没有 Cordis `Events.waterfall`。注册 API 返回的是表项 disposer（通常再包进 `ctx.effect`）。waterfall 必须 `next()` 的规则属于 tools / prompt 等事件链，不要套到 `match` 上。

## 设计动机

- **薄 carrier，好换壳。** 本包只认 pathname 与 socket。Electron 可以走 `file://` + IPC，不必装这一行。harness / RPC / dist 都是别人的 Consumer。
- **重复路由当 misconfiguration。** 两个人抢同一 `(kind, path)` 或第二人抢 fallback，无法组合，必须 boot 期抛错，而不是运行时 last-wins。
- **旗标拒 all-interfaces，schema 留口。** 浏览器工作台暴露的是远程代码执行面；默认 `dsh web --host 0.0.0.0` 不得 listen。部署若整行改 `config.host`，那是 composition 选择，不是 CLI 旗标。
- **`inject: [webStartup]` 替代 launcher 特例。** `--help` / 非法旗标不 provide，依赖行 pending，进程不占端口。
- **单请求失败关在 400。** 坏的 `%-escape` 或 handler throw 不得变成 unhandled rejection。
- **index inject 与 fallback 解耦。** modules / theme 推结构化行；发文件的人决定何时 `renderIndex`。`tapIndex` 自己不写 socket。
- **upgrade socket 自己记账。** Node 关连接时漏掉它们；不显式 destroy，mux 会留下半开连接。

## Gotcha

- **旗标拒绝 ≠ schema 禁止。** `--host 0.0.0.0` 不 `provide('webStartup')`，默认 composition 不会 bind all-interfaces；overlay 仍可把 `Config.host` 写成 `'0.0.0.0'`。[E: packages/bundle/web-app/src/startup.ts:74] [E: packages/host/webserver/src/index.ts:61]
- **`--host 1.2.3.4` 死在 schema，不是 startup。** startup 只拦 `'0.0.0.0'` 这一个字面量。[E: packages/bundle/web-app/src/startup.ts:74]
- **`dsh --profile web --dump-config` 不 boot、不跑 `web-startup`**，看不到决议后的 host/port。
- **`tapIndex` 不是响应过滤器。** shipped SPA 路径走 `renderIndex`（先 inject 行再 tap）。没人调就等于没登记。
- **405 / MIME / SPA 回 `index.html` 都是 fallback owner 的事。** named route 自己决定 method；本包只在「无 route 且无 fallback」时写 404。
- **upgrade 没有 prefix 表。** HTTP `/api` 是 prefix；WS 必须登记完整 exact path（gateway 登记 `/api/remote.mux`）。
- **`port: 0` 之后读 `ctx.webServer.port`，不要读 config 字面量。** getter 是 OS 分配值。[E: packages/host/webserver/src/index.ts:150]
- **本包不打印 URL。** 监督进程看到的 `dsh web: http://…` 来自 `web-app`。[E: packages/bundle/web-app/src/index.ts:271]
- **`frontend-static` 不是 web-app yml 行。** 在 `web-app` `apply` 里 `ctx.plugin`。[E: packages/bundle/web-app/src/index.ts:232]
- **`dsh web` 不是唯一宿主入口。** 另有 `dsh --profile sdk|sdk-minimal|acp|headless`；那些 profile 不装本包。[E: packages/boot/app-boot/src/profile.ts:105]

## Seam 三角

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` / sdk / acp |
|---|---|---|---|---|---|---|
| `ctx.webServer` | `@deepseek-ai/dsh-host-webserver`：`WebServer`，`super(ctx, 'webServer')`；`Config.host` / `port` / gzip | **host** 行 `id: webserver` `name: '@deepseek-ai/dsh-host-webserver'`；`[Service.init]` `listen` | `web-app`（`inject: ['webServer']`）、`frontend-static`、`connection`、`modules`、`client-hmr`、`ui-theme`、`api-gateway`、`webhook-github` | **无此行** | `insert` + `inject: [webStartup]`；缺省 `127.0.0.1:3080` + gzip | **无此行** |
| `ctx.webStartup` | `WEB_STARTUP_SERVICE = 'webStartup'`；可选 `host` / `port`，必有 `trustedHosts` / `openBrowser` | **host** 行 `id: web-startup` `name: '@deepseek-ai/dsh-web-app/startup'`；`inject: ['cmdlineArgs']` | `webserver` / `web-runtime` 的 Loader `inject` 与 `!!js ctx.webStartup.*` | **无** | `insert`；`'0.0.0.0'` 不 provide | **无**（headless 用 `headlessStartup`） |
| fallback 座 | `registerFallback(handler)`；第二人抛 `fallback already registered` | shipped：`frontend-static` `apply`（由 `web-app` `ctx.plugin`，**不是** yml 行） | 未命中 named route 的 GET/HEAD（以及 owner 自己的 405） | **无** | 代码挂载 | **无** |
| named HTTP `register` | `WebRoute`：`exact` / `prefix`；重复 `(kind, path)` 抛错；`match` exact 先、最长前缀胜 | `connection` prefix `/api`；`modules` prefix `/plugins`；`client-hmr` exact `/plugins/events`；webhook-github exact 配置 path | 浏览器 `fetch` / EventSource；监督进程打 `/api` | **无** | 对应 insert | **无** |
| `registerUpgrade` | `WebUpgradeRoute`：exact pathname；重复 path 抛错；未命中 destroy socket | `api-gateway`：`/api/remote.mux`（等 `connection` + `webServer`） | 浏览器 Remote stream mux WebSocket | **无** | gateway 行 | **无** |
| `tapIndex` / `renderIndex` | tap 只登记；`renderIndex` 先 inject 行再 tap | `modules` / `ui-theme` 订阅 `webserver/index-inject` | **fallback owner** 在每个 index 响应上调用 `renderIndex` | **无** | modules insert + frontend-static 调用 | **无** |

换掉 `webserver` Provider（删行、或 overlay 改 `host`）会带走全部 HTTP / upgrade Consumer：GUI 与 `/api` 一起消失，或绑到 all-interfaces。Definition（服务名与 `register*` 合同）不变。`dsh --profile headless|sdk|sdk-minimal|acp` 不经过本缝。

## Sources

- packages/host/webserver/src/index.ts
- packages/host/webserver/src/injections.ts

- packages/host/webserver/package.json
- packages/host/webserver/tests/webserver.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/tests/startup.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/boot/cmdline/src/index.ts
- packages/host/frontend-static/src/index.ts
- packages/client/connection/src/index.ts
- packages/client/connection/src/api-path.ts
- packages/client/modules/src/index.ts
- packages/client/hmr/src/index.ts
- packages/client/hmr/src/events.ts
- packages/client/ui-theme/src/index.ts
- packages/api/gateway/src/index.ts
- packages/api/gateway/src/stream-protocol.ts
- packages/webhook/webhook-github/src/index.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/fiber.ts
- vendor/schemastery/src/index.ts
- apps/cli/src/args.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮提问；本页是其中 `WebServer.listen` 那一段。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面：入口 alias、旗标表、host 插入 id。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` patch：`web-startup` / `webserver` / `web-runtime` 与 URL 行。
- [`subsys.host.frontend-static`](frontend-static.md) — 唯一 fallback owner：发 dist、SPA miss → `index.html`、跑 `renderIndex`。
- [`subsys.host.apiproxy`](apiproxy.md) — Host HTTP API（三个 controller + gateway）；gateway 在本包登记 `/api/remote.mux` upgrade。
- [`subsys.client.connection`](../client/connection.md) — `/api` prefix 与浏览器信任篱笆的物理 carrier。
- [`subsys.client.modules`](../client/modules.md) — `/plugins` prefix 与 `webserver/index-inject` boot 图。
- [`subsys.client.hmr`](../client/hmr.md) — exact `/plugins/events` SSE。
