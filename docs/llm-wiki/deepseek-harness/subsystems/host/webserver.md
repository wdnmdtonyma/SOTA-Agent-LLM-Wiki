---
id: subsys.host.webserver
title: HTTP 宿主
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/webserver/src/index.ts
  - packages/host/webserver/src/invariant.ts
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
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/fiber.ts
  - vendor/schemastery/src/index.ts
symbols:
  - WebServer
  - ctx.webServer
  - WebRoute
  - registerFallback
  - tapIndex
  - applyIndexTaps
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
updated: 47f943859b
---

> `@deepseek-ai/dsh-host-webserver` 的 `WebServer` 是 **host 面** HTTP **route-registration carrier**：`node:http` + Cordis service `ctx.webServer`。`[Service.init]` **立刻** `listen(config.port, config.host)`。本包不懂 harness、不发文件、不打印 URL。

## 能回答的问题

- `dsh web` 谁 `listen`？缺省 bind 是什么？`--host 0.0.0.0` 为何在 `provide('webStartup')` 之前被拒？
- `WebServer.Config.host` 为何仍承认 `'0.0.0.0'`？一条 overlay 整行改 `config` 会怎样？
- `register` / `registerUpgrade` 重复 `(kind, path)`、`registerFallback` 第二人，各抛什么？
- `match` 何时走 exact、何时最长前缀？无 named route 且无 fallback 回什么？
- `tapIndex` 只登记还是立刻改 HTML？谁调用 `applyIndexTaps`？
- `dsh-base` / `dsh-headless` 有没有 `id: webserver`？handler reject / upgrade 未命中 / teardown 各做什么？

## 职责边界

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`，capability seam 是 Definition / Provider / Consumer。`webserver` 只属于 **host 面**（进程级 listen 与路由表）。**agent-preset 面**（每会话 tools / persona / isolate）和 **client 面**（浏览器半边，不执行模型 turn）都不在本包。Web 是默认安装路径（`dsh web`）；本仓没有 shipped TUI 包。

本包拥有：`node:http` `Server` 的 bind；exact / prefix 两张 HTTP 表与一张 exact upgrade 表；唯一 fallback 座；`indexTaps` 列表；已 upgrade socket 的跟踪与销毁；单请求失败时的 log + 400 / `destroy`（不让未捕获 reject 拖垮进程）。

本包**不**拥有：

- 静态文件、SPA MIME、traversal 篱笆 — [`subsys.host.frontend-static`](frontend-static.md) 占 fallback 座。
- `/api` 信任篱笆、WHATWG `Request` 桥、WebSocket 帧协议 — [`subsys.client.connection`](../client/connection.md) `register` prefix `/api` 并 `registerUpgrade` `/api/events.mux` / `/api/events.host`。
- 传输无关 BFF / RPC 合同 — [`subsys.host.apiproxy`](apiproxy.md) **不**注册 HTTP 路由。
- `--host` / `--port` 旗标、`webStartup` 服务、就绪 URL 行、`ctx.plugin(FrontendStatic)` — [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) 的 `web-startup` / `web-app`。
- `window.__DSH_BOOT__` 图与 `/plugins` 前缀 — [`subsys.client.modules`](../client/modules.md)。
- `/plugins/events` SSE — [`subsys.client.hmr`](../client/hmr.md)。
- 模型 turn、session log、preset mount。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/webserver/src/index.ts` | `WebServer`：schema、`register*`、`match`、`listen`、teardown |
| `packages/host/webserver/src/invariant.ts` | 包级 companion：fiber teardown 上探测 `register` / `registerUpgrade` disposer 对称 |
| `packages/host/webserver/package.json` | npm 名 `@deepseek-ai/dsh-host-webserver`；export `.` 与 `./invariant` |
| `packages/host/webserver/tests/webserver.spec.ts` | 真 Loader：exact 胜 prefix、最长前缀、404/400、重复抛错、upgrade、EADDRINUSE、teardown |
| `packages/bundle/web-app/cordis.patch.yml` | `id: webserver`：`inject: [webStartup]`，`host` / `port` 表达式 |
| `packages/bundle/web-app/src/startup.ts` | `provide('webStartup')`；`--host 0.0.0.0` 在 provide **之前** `program.error` |
| `packages/bundle/web-app/src/index.ts` | `web-app`：挂 frontend-static、打印 `dsh web:` URL |
| `packages/bundle/web-app/tests/startup.spec.ts` | 无旗标回退 `127.0.0.1:3080`；`0.0.0.0` / `--help` 不 provide |
| `packages/bundle/base/cordis.patch.yml` | 共享 core insert；**无** `webserver` 行 |
| `packages/bundle/headless/cordis.patch.yml` | `code-runtime` + `headless-*`；**无** `webserver` 行 |
| `packages/host/frontend-static/src/index.ts` | 唯一 shipped fallback owner；index 响应调 `applyIndexTaps` |
| `packages/client/connection/src/index.ts` | `register` prefix `/api`；`registerUpgrade` mux / host |
| `packages/client/modules/src/index.ts` | `register` prefix `/plugins`；`tapIndex` 注入 boot 图 |
| `packages/client/hmr/src/index.ts` | `register` exact `/plugins/events` |
| `vendor/cordis/src/fiber.ts` | class plugin 构造后立刻跑 `[Service.init]` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `WebServer` | `Service` 子类。构造 `super(ctx, 'webServer')` 立刻 `provide`。augmentation 把 `Context.webServer` 钉成该实例。 |
| `Config.host` | `'127.0.0.1' \| '0.0.0.0'`。schema `z.union` 两枚 `z.const`，**required**，无第三字面量。 |
| `Config.port` | `z.natural().max(65535)`。`natural` = 整数且 `min(0)`。`0` = OS 选端口；对外 `port` getter 读的是 `listenedPort`（`address().port`）。 |
| `WebRoute` | `{ kind: 'exact' \| 'prefix', path, handler }`。`path` 约定绝对 pathname、无尾斜杠。handler 拥有完整 response 生命周期（可挂起，如 SSE）。 |
| `WebUpgradeRoute` | `{ path, handler }`。只走 exact pathname。 |
| 四张内部表 | `exact` / `prefixes`：`Map<path, WebRoute>`。`upgrades`：`Map<path, WebUpgradeRoute>`。`upgradedSockets`：`Set<Duplex>`。 |
| `fallback` | 至多一个 `handler`。未登记时 unmatched HTTP → 404。 |
| `indexTaps` | `(html: string) => string` 数组。`tapIndex` 只 `push`；真正折叠是 `applyIndexTaps`。 |

`WebServer` **没有** class-level `static inject`。shipped 行的 `inject: [webStartup]` 是 **Loader 挂载门**，不是 Cordis 事件 waterfall。

## 控制流

1. **模板把本包叠进 web，不叠进 base / headless。** `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`；`headless` 是 `dsh-base` + `dsh-headless`。对象字面量没有第三份 shipped 模板，也没有 TUI bundle。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]

2. **web-app 真树插入 `id: webserver`。** 行名 `@deepseek-ai/dsh-host-webserver`，`inject: [webStartup]`，`config.host` / `config.port` 写 `!!js ctx.webStartup.host ?? '127.0.0.1'` 与 `ctx.webStartup.port ?? 3080`。缺省 bind 是表达式回退，不是 `WebServer.Config` 的 schema default。[E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:116] [E: packages/bundle/web-app/cordis.patch.yml:117] [E: packages/bundle/web-app/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:120]

3. **base / headless 不 insert 这一行。** `dsh-base` 的 `insert` 从 `timer` / `hmr` / `llm` 起铺共享 core，文件里没有 `id: webserver` 或 `@deepseek-ai/dsh-host-webserver`。[E: packages/bundle/base/cordis.patch.yml:15] [E: packages/bundle/base/cordis.patch.yml:16] `dsh-headless` 的 `insert` 只有 `code-runtime`、`headless-startup`、`headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

4. **`--host 0.0.0.0` 在 `provide('webStartup')` 之前 fail-closed。** `apply@packages/bundle/web-app/src/startup.ts` 声明 `inject: ['cmdlineArgs']`。commander action 里若 `options.host === '0.0.0.0'` 则 `program.error(…intentionally not supported yet for safety…)`，**不会**执行后面的 `ctx.provide(WEB_STARTUP_SERVICE, …)`。非 `/^\d+$/` 的 `--port` 同样 error。[E: packages/bundle/web-app/src/startup.ts:17] [E: packages/bundle/web-app/src/startup.ts:69] [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/src/startup.ts:75]

5. **`parseCmdline` 把 `program.error` 收成 `appExit`，action 不再往下跑。** `parseCmdline@packages/boot/cmdline/src/index.ts` 捕获 `CommanderError` 后 `exit(error.exitCode)`。`--help` 也不跑 action，服务不出现。测试钉死：`--host 0.0.0.0` 时 `webStartup === undefined`、`inject` consumer 的 `readerConfig` 不出现、`appExit(1)`。[E: packages/boot/cmdline/src/index.ts:117] [E: packages/bundle/web-app/tests/startup.spec.ts:132] [E: packages/bundle/web-app/tests/startup.spec.ts:135] [E: packages/bundle/web-app/tests/startup.spec.ts:136] [E: packages/bundle/web-app/tests/startup.spec.ts:137]

6. **无旗标时服务值不含 host/port。** `bootProvider([])` 得到 `{ trustedHosts: [] }`；fixture consumer 用与 shipped yml 相同的 `??` 读成 `127.0.0.1:3080`。`inject: [webStartup]` 的行在服务缺失时 pending：`--help` 不 bind 端口。[E: packages/bundle/web-app/tests/startup.spec.ts:107] [E: packages/bundle/web-app/tests/startup.spec.ts:109] [E: packages/bundle/web-app/tests/startup.spec.ts:110] [E: packages/bundle/web-app/tests/startup.spec.ts:119]

7. **构造立刻 `provide('webServer')`，`[Service.init]` 立刻 `listen`。** `WebServer` 构造调用 `super(ctx, 'webServer')`；`Service` 构造里 `ctx.reflect.provide(name, self, …)`。Loader 对 class plugin `new callback(ctx, config)` 之后立刻 `instance[symbols.init]()`。`[Service.init]` 里 `this.server.listen(this.config.port, this.config.host, …)`，成功后把 `listenedPort` 写成 `address().port`。listen 失败（端口占用）reject init，fiber FAILED；测试匹配 `EADDRINUSE`。[E: packages/host/webserver/src/index.ts:75] [E: vendor/cordis/src/service.ts:57] [E: vendor/cordis/src/fiber.ts:257] [E: packages/host/webserver/src/index.ts:218] [E: packages/host/webserver/tests/webserver.spec.ts:218]

8. **HTTP 请求：pathname → `match` → named handler 或唯一 fallback。** `createServer` 回调把 `req.url` 交给 `new URL(…, 'http://x').pathname`（query 不参与匹配），再 `this.match(rawPath)`。命中则 `await route.handler`。未命中且 `fallback === undefined` 则 `writeHead(404)` + `end`；有 fallback 则 `await fallback(req, res)`。[E: packages/host/webserver/src/index.ts:152] [E: packages/host/webserver/src/index.ts:153] [E: packages/host/webserver/src/index.ts:160] [E: packages/host/webserver/src/index.ts:164] [E: packages/host/webserver/tests/webserver.spec.ts:119]

9. **`match`：exact 表先；miss 后 prefix 表最长前缀胜。** `exact.get(pathname)` 命中即返回。否则遍历 `prefixes`：`pathname === prefix` **或** `pathname.startsWith(prefix + '/')` 才算；`prefix.length` 更大者胜。因此 `/api/deep/leaf` 走更长的 `/api/deep`，`/api` 自身也由 prefix `/api` 回答；`/apifoo` 不会命中 `/api`。named route **不**按 method 分流——POST 打到已登记 prefix 仍是 200，405 是 fallback owner 的语义。[E: packages/host/webserver/src/index.ts:243] [E: packages/host/webserver/src/index.ts:247] [E: packages/host/webserver/src/index.ts:248] [E: packages/host/webserver/tests/webserver.spec.ts:110] [E: packages/host/webserver/tests/webserver.spec.ts:112] [E: packages/host/webserver/tests/webserver.spec.ts:113] [E: packages/host/webserver/tests/webserver.spec.ts:114]

10. **handler reject 不杀进程。** `handle().catch`：`ctx.logger.warn`；`res.headersSent` 则 `res.destroy()`，否则 `writeHead(400)` + `end`。测试用 fallback 里 `decodeURIComponent('/%zz')` 钉 400，随后 `/probe` 仍 200。[E: packages/host/webserver/src/index.ts:174] [E: packages/host/webserver/src/index.ts:177] [E: packages/host/webserver/tests/webserver.spec.ts:137] [E: packages/host/webserver/tests/webserver.spec.ts:138]

11. **upgrade：exact pathname，未命中 `socket.destroy()`。** `server.on('upgrade')` 用同一套 `URL(…).pathname` 查 `upgrades`（因此 `/events?stream=mux` 仍命中 `/events`）。查表抛错或 `route === undefined` 都 `socket.destroy()`。命中则加入 `upgradedSockets`，handler 的 sync throw 与 Promise reject 同样 log + destroy。[E: packages/host/webserver/src/index.ts:194] [E: packages/host/webserver/src/index.ts:197] [E: packages/host/webserver/src/index.ts:201] [E: packages/host/webserver/src/index.ts:204] [E: packages/host/webserver/tests/webserver.spec.ts:168]

12. **重复登记是 composition 错误，抛错而不是 last-wins。** `register`：`(kind, path)` 已在对应表 → `webserver: duplicate ${kind} route "${path}"`。`registerUpgrade`：path 已在 → `duplicate upgrade route`。`registerFallback`：`fallback !== undefined` → `fallback already registered`。各自 disposer 删表项 / 置 `undefined` 后可再登记。测试钉死第二 fallback 与 duplicate exact / upgrade。[E: packages/host/webserver/src/index.ts:97] [E: packages/host/webserver/src/index.ts:111] [E: packages/host/webserver/src/index.ts:127] [E: packages/host/webserver/tests/webserver.spec.ts:129] [E: packages/host/webserver/tests/webserver.spec.ts:143] [E: packages/host/webserver/tests/webserver.spec.ts:167]

13. **`tapIndex` 只登记变换；`applyIndexTaps` 由 fallback owner 调用。** `tapIndex` `push` 纯函数并返回 splice disposer。`applyIndexTaps` 按登记顺序折叠字符串。`frontend-static` 的 `renderIndex` 读 `index.html` 后立刻 `ctx.webServer.applyIndexTaps(...)`。modules 把 `window.__DSH_BOOT__` 插进 `<head>`；`ui-theme` 另挂一条 theme tap。没有人调 `applyIndexTaps`，tap 对线上响应为零效果。[E: packages/host/webserver/src/index.ts:139] [E: packages/host/webserver/src/index.ts:261] [E: packages/host/frontend-static/src/index.ts:97] [E: packages/client/modules/src/index.ts:246] [E: packages/client/ui-theme/src/index.ts:39]

14. **shipped named Consumer 挂在 host 树上，不是本包写死的路由。** `client-connection` `inject = ['webServer']`，`register` prefix `API_PATH`（`'/api'`），并在 `apiProxy` 出现后 `registerUpgrade` `MUX_EVENTS_PATH` / `HOST_EVENTS_PATH`。`ClientModuleRegistry` `register` prefix `'/plugins'`。`client-hmr` `register` exact `EVENTS_ENDPOINT`（`'/plugins/events'`）。[E: packages/client/connection/src/index.ts:47] [E: packages/client/connection/src/index.ts:163] [E: packages/client/connection/src/index.ts:173] [E: packages/client/connection/src/index.ts:181] [E: packages/client/connection/src/api-path.ts:8] [E: packages/client/modules/src/index.ts:242] [E: packages/client/hmr/src/events.ts:16] [E: packages/client/hmr/src/index.ts:166]

15. **fallback 座由 `web-app` 代码挂上，不是 yml 行。** `web-app` `export const inject = ['webServer']`。`apply` 在 `provide('webRuntime')` 之后 `ctx.plugin(FrontendStatic, { distIndex: internals.resolveDistIndex() })`。`frontend-static` `inject = ['webServer']`，`registerFallback` 占唯一座。`printUrl` 等 Loader `await()` 成功且 `webServer` 仍在，才 `console.log(\`dsh web: http://127.0.0.1:<port>\`)`——URL 行属于 `web-app`，不属于 `webserver`。[E: packages/bundle/web-app/src/index.ts:35] [E: packages/bundle/web-app/src/index.ts:138] [E: packages/bundle/web-app/src/index.ts:139] [E: packages/bundle/web-app/src/index.ts:168] [E: packages/host/frontend-static/src/index.ts:25] [E: packages/host/frontend-static/src/index.ts:98]

16. **teardown：`closeAllConnections` + 显式 destroy 已 upgrade 的 sockets。** `ctx.effect(..., 'webServer.listen')` 在 fiber dispose 时 `server.close`、`closeAllConnections`，并对 `upgradedSockets` 逐个 `destroy` 后等 `close`。Node 的 `closeAllConnections` **不含** 已 upgrade 的 socket，所以本服务自己记账。测试在仍挂着的 upgrade 上 `fiber.dispose()`，断言 server-side socket 关闭且后续 `fetch` reject。[E: packages/host/webserver/src/index.ts:232] [E: packages/host/webserver/src/index.ts:235] [E: packages/host/webserver/tests/webserver.spec.ts:197] [E: packages/host/webserver/tests/webserver.spec.ts:198] [E: packages/host/webserver/tests/webserver.spec.ts:200]

17. **schema 仍承认 all-interfaces。** `Config.host` 是 `'127.0.0.1' | '0.0.0.0'`。旗标路径拒的是 `web-startup` 字面量 `'0.0.0.0'`，**不是** schema。一条替换整行 `webserver.config` 的 overlay 仍可写出 `host: '0.0.0.0'` 并成功 listen。`--host 1.2.3.4` 能过 `web-startup`（只拦那一个字面量），会在本包 schema 上失败。`port` 的 `0` 合法：`Schema.natural` 是 `number().step(1).min(0)`。[E: packages/host/webserver/src/index.ts:47] [E: packages/host/webserver/src/index.ts:61] [E: packages/host/webserver/src/index.ts:62] [E: vendor/schemastery/src/index.ts:530]

18. **invariant companion 探测 disposer 对称，不是第二份路由表。** `@deepseek-ai/dsh-host-webserver/invariant` 在 `internal/plugin` 上对保留 path 做两次 `register(probe)()` / `registerUpgrade(probe)()`；第二次再抛 duplicate 就 `fail(...)`。它不改变 listen 行为，也不出现在 web-app yml。[E: packages/host/webserver/src/invariant.ts:41] [E: packages/host/webserver/src/invariant.ts:44] [E: packages/host/webserver/src/invariant.ts:47]

本包没有 Cordis `Events.waterfall`。注册 API 返回的是表项 disposer（通常再包进 `ctx.effect`）。waterfall 必须 `next()` 的规则属于 tools / prompt 等事件链，不要套到 `match` 上。

## 设计动机

- **薄 carrier，好换壳。** 本包只认 pathname 与 socket。Electron 可以走 `file://` + IPC，不必装这一行。harness / RPC / dist 都是别人的 Consumer。
- **重复路由当 misconfiguration。** 两个人抢同一 `(kind, path)` 或第二人抢 fallback，无法组合，必须 boot 期抛错，而不是运行时 last-wins。
- **旗标拒 all-interfaces，schema 留口。** 浏览器工作台暴露的是远程代码执行面；默认 `dsh web --host 0.0.0.0` 不得 listen。部署若整行改 `config.host`，那是 composition 选择，不是 CLI 旗标。
- **`inject: [webStartup]` 替代 launcher 特例。** `--help` / 非法旗标不 provide，依赖行 pending，进程不占端口。
- **单请求失败关在 400。** 坏的 `%-escape` 或 handler throw 不得变成 unhandled rejection。
- **index tap 与 fallback 解耦。** modules / theme 只登记变换；发文件的人决定何时跑。`tapIndex` 自己不写 socket。
- **upgrade socket 自己记账。** Node 关连接时漏掉它们；不显式 destroy，HMR / mux 会留下半开连接。

## Gotcha

- **旗标拒绝 ≠ schema 禁止。** `--host 0.0.0.0` 不 `provide('webStartup')`，默认 composition 不会 bind all-interfaces；overlay 仍可把 `Config.host` 写成 `'0.0.0.0'`。[E: packages/bundle/web-app/src/startup.ts:70] [E: packages/host/webserver/src/index.ts:61]
- **`--host 1.2.3.4` 死在 schema，不是 startup。** startup 只拦 `'0.0.0.0'` 这一个字面量。[E: packages/bundle/web-app/src/startup.ts:69]
- **`dsh --profile web --dump-config` 不 boot、不跑 `web-startup`**，看不到决议后的 host/port。
- **`tapIndex` 不是响应过滤器。** 没人调 `applyIndexTaps` 就等于没登记。
- **405 / MIME / SPA 回 `index.html` 都是 fallback owner 的事。** named route 自己决定 method；本包只在「无 route 且无 fallback」时写 404。
- **upgrade 没有 prefix 表。** HTTP `/api` 是 prefix；WS 必须登记完整 exact path。
- **`port: 0` 之后读 `ctx.webServer.port`，不要读 config 字面量。** getter 是 OS 分配值。[E: packages/host/webserver/src/index.ts:80]
- **本包不打印 URL。** 监督进程看到的 `dsh web: http://…` 来自 `web-app`。[E: packages/bundle/web-app/src/index.ts:168]
- **`frontend-static` 不是 web-app yml 行。** 在 `web-app` `apply` 里 `ctx.plugin`。[E: packages/bundle/web-app/src/index.ts:139]

## Seam 三角

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|---|
| `ctx.webServer` | `@deepseek-ai/dsh-host-webserver`：`WebServer`，`super(ctx, 'webServer')`；`Config.host` / `port` | **host** 行 `id: webserver` `name: '@deepseek-ai/dsh-host-webserver'`；`[Service.init]` `listen` | `web-app`（`inject: ['webServer']`）、`frontend-static`、`connection`、`modules`、`client-hmr`、`ui-theme` | **无此行** | `insert` + `inject: [webStartup]`；缺省 `127.0.0.1:3080` | **无此行** |
| `ctx.webStartup` | `WEB_STARTUP_SERVICE = 'webStartup'`；可选 `host` / `port`，必有 `trustedHosts` | **host** 行 `id: web-startup` `name: '@deepseek-ai/dsh-web-app/startup'`；`inject: ['cmdlineArgs']` | `webserver` / `web-runtime` 的 Loader `inject` 与 `!!js ctx.webStartup.*` | **无** | `insert`；`'0.0.0.0'` 不 provide | **无**（headless 用 `headlessStartup`） |
| fallback 座 | `registerFallback(handler)`；第二人抛 `fallback already registered` | shipped：`frontend-static` `apply`（由 `web-app` `ctx.plugin`，**不是** yml 行） | 未命中 named route 的 GET/HEAD（以及 owner 自己的 405） | **无** | 代码挂载 | **无** |
| named HTTP `register` | `WebRoute`：`exact` / `prefix`；重复 `(kind, path)` 抛错；`match` exact 先、最长前缀胜 | `connection` prefix `/api`；`modules` prefix `/plugins`；`client-hmr` exact `/plugins/events` | 浏览器 `fetch` / EventSource；监督进程打 `/api` | **无** | 对应 `connection` / `modules` / `client-hmr` insert | **无** |
| `registerUpgrade` | `WebUpgradeRoute`：exact pathname；重复 path 抛错；未命中 destroy socket | `connection`：`/api/events.mux`、`/api/events.host`（等 `apiProxy`） | 浏览器 mux / host WebSocket | **无** | `connection` 行（`inject: [webRuntime]`） | **无** |
| `tapIndex` / `applyIndexTaps` | tap 只登记；`applyIndexTaps` 按序折叠 | `modules`（boot 图）、`ui-theme`（初始 theme）登记 | **fallback owner** 在每个 index 响应上调用 | **无** | `modules` insert + frontend-static 调用 | **无** |

换掉 `webserver` Provider（删行、或 overlay 改 `host`）会带走全部 HTTP / upgrade Consumer：GUI 与 `/api` 一起消失，或绑到 all-interfaces。Definition（服务名与 `register*` 合同）不变。`dsh-headless` 走 `headless-runner`，不经过本缝。

## Sources

- packages/host/webserver/src/index.ts
- packages/host/webserver/src/invariant.ts
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
- vendor/cordis/src/service.ts
- vendor/cordis/src/fiber.ts
- vendor/schemastery/src/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮提问；本页是其中 `WebServer.listen` 那一段。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面：入口 alias、旗标表、host 插入 id。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` patch：`web-startup` / `webserver` / `web-runtime` 与 URL 行。
- [`subsys.host.frontend-static`](frontend-static.md) — 唯一 fallback owner：发 dist、SPA miss → `index.html`、跑 `applyIndexTaps`。
- [`subsys.host.apiproxy`](apiproxy.md) — 传输无关 BFF；**不**在本包登记 HTTP 路由。
- [`subsys.client.connection`](../client/connection.md) — `/api` prefix 与 mux/host upgrade 的物理 carrier。
- [`subsys.client.modules`](../client/modules.md) — `/plugins` prefix 与 `tapIndex` boot 图。
- [`subsys.client.hmr`](../client/hmr.md) — exact `/plugins/events` SSE。
