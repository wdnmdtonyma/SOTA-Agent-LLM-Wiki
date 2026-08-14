---
id: subsys.host.frontend-static
title: 前端静态资源
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/frontend-static/src/index.ts
  - packages/host/frontend-static/tests/frontend-static.spec.ts
  - packages/host/frontend-static/package.json
  - packages/host/frontend-static/src/invariant.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/tests/web-app.spec.ts
  - packages/bundle/web-app/package.json
  - packages/host/webserver/src/index.ts
  - packages/host/webserver/tests/webserver.spec.ts
  - packages/client/modules/src/index.ts
  - packages/client/ui-theme/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/web/package.json
symbols:
  - frontend-static
  - serveStatic
  - inject
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.host.webserver
  - subsys.composition.bundle-web-app
  - subsys.client.modules
  - surface.profiles.web
  - subsys.client.connection
  - subsys.composition.bundle-headless
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-host-frontend-static` 是 **host 面** SPA dist 服务器：插件名 `frontend-static`，`inject = ['webServer']`，占 `ctx.webServer` 的 **唯一 fallback 座**，按 `Config.distIndex` 的目录发已构建前端。shipped `dsh web` **没有** `id: frontend-static` 的 Loader 行；`web-runtime`（`@deepseek-ai/dsh-web-app`）在 `apply` 里 `ctx.plugin(FrontendStatic, { distIndex })`。本包不 listen、不打印 URL、不注册 `/api`、不执行模型 turn。

## 能回答的问题

- `frontend-static` 是不是 `dsh-web-app` 的 yml 行？谁在何时 `ctx.plugin` 挂上它？
- fallback 座是什么？第二人 `registerFallback` 会怎样？fiber dispose 之后谁回答 miss？
- `serveStatic` 如何判 traversal、405、SPA miss、未知扩展 MIME？Win32 为什么必须用 `sep` 而不是 `'/'`？
- 每个 `index.html` 响应为什么先跑 `webServer.applyIndexTaps`？谁 `tapIndex`？
- `--host 0.0.0.0` 被拒之后还会不会挂静态资源？缺 frontend dist 是静默空页还是 fail-loud？
- `dsh-base` / `dsh-headless` 有没有这条路径？

## 职责边界

本包拥有：fallback handler 的 GET/HEAD 静态语义、`serveStatic` 的路径篱笆与 MIME、把每个 index 响应当 `applyIndexTaps` 的调用点。插件导出 `name` / `inject` / `Config` / `apply` / `serveStatic`，**不** `provide` 名为 `frontendStatic` 的 Cordis service——浏览器是 HTTP Consumer，不是 `ctx.get`。[E: packages/host/frontend-static/src/index.ts:22] [E: packages/host/frontend-static/src/index.ts:25] [E: packages/host/frontend-static/src/index.ts:93]

本包**不**拥有：`node:http` listen 与 named route 表（[`subsys.host.webserver`](webserver.md)）；`--host` / `--port` 旗标与 `provide('webStartup')`（[`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)）；就绪 URL 行与 `DSH_WEB_URL`（同属 `web-app` `apply`）；`/api` 前缀与信任篱笆（[`subsys.client.connection`](../client/connection.md)）；`/plugins` 前缀与 boot-manifest 图结构（[`subsys.client.modules`](../client/modules.md)）；agent-preset 面上的 tools / persona / isolate。`dsh-base` 与 `dsh-headless` **不** insert `webserver`，因此也没有 fallback 座可占。

本仓没有 shipped TUI 包。默认安装路径是 `PROFILE_TEMPLATES.web`：`dsh-base` 再叠 `dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:115]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/frontend-static/src/index.ts` | `name` / `inject` / `Config` / `serveStatic` / `apply`：占座并发 dist |
| `packages/host/frontend-static/tests/frontend-static.spec.ts` | 真 Loader 两行 composition：MIME、live rebuild、SPA + taps、403、405、dispose 释座 |
| `packages/host/frontend-static/package.json` | npm 名 `@deepseek-ai/dsh-host-frontend-static`；peer `dsh-host-webserver` |
| `packages/host/frontend-static/src/invariant.ts` | companion 的 `install` 是空函数：座不能在 teardown 流上探测 |
| `packages/bundle/web-app/src/index.ts` | `web-app`：`resolveDistIndex` + `ctx.plugin(FrontendStatic, { distIndex })` |
| `packages/bundle/web-app/src/startup.ts` | `--host 0.0.0.0` 在 `provide('webStartup')` 之前 `program.error` |
| `packages/bundle/web-app/cordis.patch.yml` | insert `webserver` / `web-runtime`；**没有** `frontend-static` 行 |
| `packages/bundle/web-app/tests/web-app.spec.ts` | child 占座；缺 dist fail-loud |
| `packages/host/webserver/src/index.ts` | `registerFallback` / `tapIndex` / `applyIndexTaps` / named-route `match` |
| `packages/client/modules/src/index.ts` | `tapIndex` 把 boot manifest 写进 index（本页不展开图结构） |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `apps/web/package.json` | `@deepseek-ai/dsh-web-frontend` 的 `exports["./dist/*"]` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` | 字面量 `'frontend-static'`。 |
| `inject` | `['webServer']`。服务未 provide 则本插件 pending，不占座。 |
| `Config.distIndex` | **必填**字符串：`index.html` 的绝对路径。`distRoot = dirname(distIndex)`。 |
| `MIME` | 按 `extname(target)` 查表；缺键是 `'application/octet-stream'`。 |
| `renderIndex` | `readFile(distIndex, 'utf8')` 之后立刻 `webServer.applyIndexTaps`。 |
| `registerFallback` | `WebServer` 上只有一个 handler 槽。第二人抛 `webserver: fallback already registered`。返回的 disposer 把槽置回 `undefined`。 |

`MIME` 全表：

| 扩展 | `content-type` |
|---|---|
| `.html` | `text/html; charset=utf-8` |
| `.js` | `text/javascript; charset=utf-8` |
| `.css` | `text/css; charset=utf-8` |
| `.svg` | `image/svg+xml` |
| `.json` | `application/json` |
| `.map` | `application/json` |
| `.webmanifest` | `application/manifest+json` |
| 其它 | `application/octet-stream` |

[E: packages/host/frontend-static/src/index.ts:37] [E: packages/host/frontend-static/src/index.ts:38] [E: packages/host/frontend-static/src/index.ts:39] [E: packages/host/frontend-static/src/index.ts:44] [E: packages/host/frontend-static/src/index.ts:80]

## 控制流

1. **web profile 叠出 host HTTP，但不写出本包行。** `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`。`dsh-web-app` 的 patch 在 transport 层 insert `id: webserver`（`name: '@deepseek-ai/dsh-host-webserver'`，`inject: [webStartup]`）和 `id: web-runtime`（`name: '@deepseek-ai/dsh-web-app'`，同样 `inject: [webStartup]`）。整份 yml **没有** `name: '@deepseek-ai/dsh-host-frontend-static'` 的行。`dsh-base` 的 insert 从 `timer` / `hmr` / `llm` 起，不含 HTTP 宿主。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:117] [E: packages/bundle/web-app/cordis.patch.yml:130] [E: packages/bundle/web-app/cordis.patch.yml:132] [E: packages/bundle/base/cordis.patch.yml:16]

2. **`--host 0.0.0.0` 在 `provide('webStartup')` 之前被拒，静态资源根本挂不上。** `apply@packages/bundle/web-app/src/startup.ts` 若 `options.host === '0.0.0.0'` 则 `program.error(…intentionally not supported yet for safety…)`，action 不跑到 `ctx.provide`。`webserver` / `web-runtime` 因 `inject: [webStartup]` 保持 pending；`frontend-static` 再 `inject: ['webServer']`，listen 与 fallback 都不发生。`--help` 同样不 provide。`WebServer.Config.host` schema 仍是 `'127.0.0.1' | '0.0.0.0'`：一条替换整行 `webserver.config` 的 overlay 仍可能绑 all-interfaces，那不是 `--host` 旗标路径。[E: packages/bundle/web-app/src/startup.ts:69] [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/src/startup.ts:75] [E: packages/host/webserver/src/index.ts:61]

3. **缺省 bind 是表达式回退。** 合法 invocation 才 provide `webStartup`。`webserver.config` 写 `host: !!js ctx.webStartup.host ?? '127.0.0.1'`、`port: !!js ctx.webStartup.port ?? 3080`。`WebServer[Service.init]` **立刻** `listen(config.port, config.host)`。webserver 不懂 harness、不发文件、不打印 URL。[E: packages/bundle/web-app/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:120] [E: packages/host/webserver/src/index.ts:218]

4. **`web-runtime` 在 bind 之后用子插件挂本包。** `web-app` 自己的 `inject` 也是 `['webServer']`。`apply@packages/bundle/web-app/src/index.ts` 先 `provide('webRuntime', …)`，再 `ctx.plugin(FrontendStatic, { distIndex: internals.resolveDistIndex() })`。`resolveDistIndex` 用 `createRequire(import.meta.url).resolve('@deepseek-ai/dsh-web-frontend/dist/index.html')`。`@deepseek-ai/dsh-web-frontend`（`apps/web`）导出 `"./dist/*": "./dist/*"`。`require.resolve` 失败则抛 `web-app: frontend dist not built; run pnpm run build from the repository root first`——fail-loud，没有静默空页面。`internals.resolveDistIndex` 只给测试替换。[E: packages/bundle/web-app/src/index.ts:35] [E: packages/bundle/web-app/src/index.ts:119] [E: packages/bundle/web-app/src/index.ts:122] [E: packages/bundle/web-app/src/index.ts:139] [E: apps/web/package.json:15] [E: packages/bundle/web-app/tests/web-app.spec.ts:92]

5. **`apply@packages/host/frontend-static/src/index.ts` 用 `ctx.effect` 占唯一 fallback 座。** `distIndex = config.distIndex`，`distRoot = dirname(distIndex)`。`renderIndex` 每次从磁盘读 index，再 `ctx.webServer.applyIndexTaps`。`registerFallback` 的返回值交给 `ctx.effect`，fiber dispose 即释座。第二次 `registerFallback` 抛 `webserver: fallback already registered`。[E: packages/host/frontend-static/src/index.ts:94] [E: packages/host/frontend-static/src/index.ts:95] [E: packages/host/frontend-static/src/index.ts:97] [E: packages/host/frontend-static/src/index.ts:98] [E: packages/host/webserver/src/index.ts:127] [E: packages/host/webserver/tests/webserver.spec.ts:129]

6. **请求先走 named route，miss 才到 fallback。** `WebServer` 的 HTTP `handle`：`match(rawPath)` 命中 exact / 最长 prefix 则把完整生命周期交给该 handler（`/api`、`/plugins` 都是 prefix，方法由路由自己处理）。无名且无 fallback → 404。有 fallback → `await fallback(req, res)`。handler reject 或 `decodeURIComponent` 抛错：headers 未发则 400，已发则 `destroy`。upgrade 不走 fallback。[E: packages/host/webserver/src/index.ts:153] [E: packages/host/webserver/src/index.ts:164] [E: packages/host/webserver/src/index.ts:177] [E: packages/host/webserver/tests/webserver.spec.ts:137]

7. **fallback handler 只放行 GET/HEAD。** `req.method` 不是 `'GET'` 且不是 `'HEAD'` → `405` 空 body。这是 **fallback-only** 语义：named route 可以接受 POST。然后 `decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)`，交给 `serveStatic`。[E: packages/host/frontend-static/src/index.ts:101] [E: packages/host/frontend-static/src/index.ts:102] [E: packages/host/frontend-static/src/index.ts:108] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:123]

8. **`serveStatic`：traversal → 403；命中文件 → 200；miss / EISDIR → index 200。** `target = resolve(normalize(join(distRoot, pathname)))`。篱笆是 `target === distRoot` **或** `target.startsWith(distRoot + sep)`；否则 `403` 空 body。比较串用 `sep` 不是 `'/'`：Win32 上 `resolve()` 出反斜杠，用 `'/'` 后缀会把合法子路径全部判成 traversal。`target === distRoot` 或 `target === distIndex` 直接走 `serveIndex`。其它路径 `readFile(target)`：成功则按 `MIME[extname(target)] ?? 'application/octet-stream'` 写 200；`catch`（ENOENT / EISDIR 等）同样 `serveIndex`。`serveIndex` 调 `renderIndex()`，状态永远是 **200**（SPA 路由）。每次请求重新 `readFile`，下一次 GET 能读到刚写入的 rebuild。[E: packages/host/frontend-static/src/index.ts:60] [E: packages/host/frontend-static/src/index.ts:64] [E: packages/host/frontend-static/src/index.ts:65] [E: packages/host/frontend-static/src/index.ts:74] [E: packages/host/frontend-static/src/index.ts:80] [E: packages/host/frontend-static/src/index.ts:84] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:104] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:107] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:122]

9. **每个 index 响应先跑已登记的 `tapIndex`。** `applyIndexTaps` 按登记顺序把 html 字符串折过去。`ClientModuleRegistry` 用 `tapIndex` 注入 boot manifest（图结构在 [`subsys.client.modules`](../client/modules.md)）。`ui-theme` 的 node 半边也 `tapIndex` 写初始 theme。本包只保证 **调用点**：`/`、`/index.html`、以及任何 miss 的 SPA fallback 都走同一条 `renderIndex`。测试对 `/`、`/index.html`、`/no/such/route` 断言 tap 后的标记出现在 200 body 里；`untap()` 后标记消失。[E: packages/host/webserver/src/index.ts:261] [E: packages/host/frontend-static/src/index.ts:97] [E: packages/client/modules/src/index.ts:246] [E: packages/client/ui-theme/src/index.ts:39] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:111] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:115]

10. **释座是 HMR / 热替换安全阀。** 测试 dispose `id: frontend` 那一行的 fiber 后，`/no/such/route` 回到 webserver 的未占座 404，且 `registerFallback` 可以再登记。companion `host-frontend-static-invariant` 的 `install` 是空函数：`internal/plugin` 在 disposing fiber 的 effect 跑完之前触发，此时合法 owner 仍占座，探测第二次 `registerFallback` 会对正确 teardown 误报。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:130] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:131] [E: packages/host/frontend-static/src/invariant.ts:26]

11. **headless 没有这条链。** `dsh-headless` 的 insert 是 `code-runtime` + `headless-startup` + `headless-runner`，没有 `webserver`，因此没有 fallback 座，也没有人 `plugin(FrontendStatic)`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] [E: packages/boot/app-boot/src/profile.ts:116]

本页是 **route / Service** 控制流，不是 Cordis `Events.waterfall`。`tapIndex` 是同步 html→html 列表，没有 `next()`。

## 设计动机

- **fallback 座只能有一个 owner。** 两个 SPA / 两套 miss 语义无法组合；冲突必须在 composition 期抛错，而不是运行时抢最后一个 handler。
- **dist 位置是 bundle 的装配事实，不是用户 config。** `web-app` 用 `@deepseek-ai/dsh-web-frontend` 的 package exports 解析 `dist/index.html`。用户 overlay 改 `web-runtime.config` 也改不到路径；要换 dist 只能换挂载点或测试钩子 `internals.resolveDistIndex`。
- **disable 行解决不了「谁发文件」。** web overlay 可以把模型可见 `tool-*` `disabled: true`，但浏览器壳仍要一份 host 面静态入口。本包坐在 host 面，和每会话 agent-preset 的 tools / persona / isolate 切开。
- **index tap 把「改 html」从「发文件」拆开。** modules / theme 只登记变换；真正读盘和写 200 的是 fallback owner。webserver 自己不发文件。
- **traversal 用 `sep` 对齐 `path.resolve` 的平台路径。** 这是 Win32 正确性，不是风格选择。
- **miss → 200 而不是 404。** 浏览器 history 路由的深层 path 在磁盘上不存在，必须回 `index.html` 才能把壳交给 client。named `/api` / `/plugins` 不走这条。

## Gotcha

- **shipped 树里搜不到 `id: frontend-static`。** 包测试用两行 cordis.yml（`webserver` + `name: '@deepseek-ai/dsh-host-frontend-static'`）覆盖 HTTP 面；产品路径是 `web-runtime` 的 child `ctx.plugin`。`dsh --profile web --dump-config` 也看不到这个 child。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:47] [E: packages/bundle/web-app/src/index.ts:139]
- **`--host 0.0.0.0` 被拒 ≠ schema 禁止 all-interfaces。** 旗标路径不 provide `webStartup`，默认 composition 不 listen、不挂本包。overlay 整行改写 `webserver.config.host` 仍可能是 `'0.0.0.0'`。[E: packages/bundle/web-app/src/startup.ts:70] [E: packages/host/webserver/src/index.ts:61]
- **缺 dist 是 `web-app` 抛错，不是本包回退空 handler。** `resolveDistIndex` 失败则 `ctx.plugin(FrontendStatic, …)` 不会执行。[E: packages/bundle/web-app/src/index.ts:122]
- **`serveStatic` 不区分 HEAD 与 GET。** fallback 放行 HEAD，但实现仍 `readFile` + `res.end(body)`，会带上 body。响应头只写 `content-type`，没有 `ETag` / `If-None-Match` / `Cache-Control`。[E: packages/host/frontend-static/src/index.ts:80] [E: packages/host/frontend-static/src/index.ts:81]
- **畸形 `%` escape 是 400，不是 403。** `decodeURIComponent` 在 `serveStatic` 之前抛错，被 webserver 的 per-request `catch` 收成 400；`/%zz` 测的是 carrier，不是 traversal。[E: packages/host/webserver/tests/webserver.spec.ts:137]
- **`/..%2f..%2fetc%2fpasswd` 先 decode 再 `resolve`。** `%2f` 变成 `/` 之后才会走出 `distRoot`，得到 403。不要把「未 decode 的字面量仍像在 dist 下」当成安全。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:122]
- **目录命中是 SPA 200，不是 403 也不是 301。** 存在的子目录走 `readFile` 的 `EISDIR` → `serveIndex`。[E: packages/host/frontend-static/src/index.ts:84]
- **第二人占座抛错；dispose 之后必须能再占。** 把「HMR 换 owner」理解成「两个 fallback 并存」是错的。[E: packages/host/webserver/src/index.ts:127] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:131]
- **本包不打印 `dsh web: http://…`。** URL 行属于 `web-app` 在 `loader.await()` 之后的 `console.log`。[E: packages/bundle/web-app/src/index.ts:168]
- **`dsh-base` / `dsh-headless` 没有 dormant 的 frontend-static。** headless 不挂 Host HTTP；不是「插了行但 disabled」。[E: packages/bundle/headless/cordis.patch.yml:31]

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.webServer` listen | `@deepseek-ai/dsh-host-webserver` 的 `WebServer`；`Config.host` 为 `'127.0.0.1' \| '0.0.0.0'` | **web-app** 行 `id: webserver`，`inject: [webStartup]`，缺省 `127.0.0.1:3080`。**base / headless：无此行** | `web-app` 与 `frontend-static` 的 `inject: ['webServer']`；`connection` 的 `/api`；`modules` 的 `/plugins` |
| 唯一 fallback 座 | `WebServer.registerFallback`：一人；第二人抛错；disposer 清空槽 | **host** 插件 `frontend-static` 的 `apply`（`ctx.effect`）。**不是** yml 行。**web-app** 的 `web-runtime.apply` 才 `ctx.plugin(FrontendStatic, { distIndex })`。**base / headless：无 Provider** | 所有 `match` miss 的 HTTP 请求。无 owner 时 webserver 自己 404 |
| `Config.distIndex` | 必填绝对路径；`distRoot = dirname(distIndex)` | **web-app** `resolveDistIndex()` → `require.resolve('@deepseek-ai/dsh-web-frontend/dist/index.html')`。测试可换 `internals.resolveDistIndex`。**base / headless：无** | `serveStatic` / `renderIndex`。缺文件 fail-loud |
| index tap 列表 | `tapIndex(html => html)` + `applyIndexTaps`（登记序折） | **web-app** 树上的 `modules`（boot manifest）以及 `ui-theme` 等 `tapIndex` 调用方。webserver 只存列表 | **frontend-static** 的每个 `serveIndex`。本包不解释注入内容 |
| `inject` 挂载门 | `export const inject = ['webServer']`（本包）；yml `inject: [webStartup]`（`webserver` / `web-runtime`） | `webStartup`：**web-app** 行 `web-startup`。`--host 0.0.0.0` / `--help` 不 provide。**base / headless：无** | 服务缺失则下游行 pending：不 listen、不占座、不发文件 |

换一条缝的 Provider（删掉 `web-runtime`、另挂第二个 fallback、或把 `distIndex` 指到空目录）会带走它的 Consumer：浏览器拿不到壳，或第二次 `registerFallback` 在 boot 期炸掉。Definition（座只有一个、index 必须过 taps、traversal 用 `sep`）保持不变。

## Sources

- packages/host/frontend-static/src/index.ts
- packages/host/frontend-static/tests/frontend-static.spec.ts
- packages/host/frontend-static/package.json
- packages/host/frontend-static/src/invariant.ts
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/tests/web-app.spec.ts
- packages/bundle/web-app/package.json
- packages/host/webserver/src/index.ts
- packages/host/webserver/tests/webserver.spec.ts
- packages/client/modules/src/index.ts
- packages/client/ui-theme/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/web/package.json

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面边界。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮提问；本包对应 GET `/` 的 SPA + taps 那一步。
- [`subsys.host.webserver`](webserver.md) — `node:http` listen、named route、唯一 fallback 座、`tapIndex` 登记表。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` overlay：`web-startup` / `web-runtime` / 整表 disable 模型可见行。
- [`subsys.client.modules`](../client/modules.md) — `/plugins` 前缀与 boot-manifest `tapIndex`（本页不写图结构）。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `dsh web` alias、旗标表、host 插入 id。
- [`subsys.client.connection`](../client/connection.md) — `/api` prefix；named route 优先于本包 fallback。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 无 `webserver`，无静态资源座。
