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
  - packages/client/connection/src/browser-auth.ts
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
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-host-frontend-static` 是 **host 面** SPA dist 服务器：插件名 `frontend-static`，`inject = ['webServer', 'connection']`，占 `ctx.webServer` 的 **唯一 fallback 座**，按 `Config.distIndex` 的目录发已构建前端。显式 index 入口（`/` 与配置的 `index.html`）先过 `connection.authorizeIndex`，再 `webServer.renderIndex`（结构化 injection + `tapIndex`），并在 `<head>` 插入 `<base href="/">`。**磁盘 miss 与 SPA 深层 path 一律 404**，不是回 index 的 200。shipped `dsh --profile web`（别名 `dsh web`）**没有** `id: frontend-static` 的 Loader 行；`web-runtime`（`@deepseek-ai/dsh-web-app`）在 `apply` 里 `ctx.plugin(FrontendStatic, { distIndex })`。本包不 listen、不打印 URL、不注册 `/api`、不执行模型 turn。五个 shipped profile 里只有 `web` 叠 `dsh-web-app`；`headless` / `sdk` / `sdk-minimal` / `acp` 没有这条路径。

## 能回答的问题

- `frontend-static` 是不是 `dsh-web-app` 的 yml 行？谁在何时 `ctx.plugin` 挂上它？
- fallback 座是什么？第二人 `registerFallback` 会怎样？fiber dispose 之后谁回答 miss？
- `serveStatic` 如何判 traversal、405、404 miss、未知扩展 MIME？Win32 为什么必须用 `sep`？
- 每个 index 响应为什么先 `authorizeIndex` 再 `renderIndex`？谁订阅 `webserver/index-inject`？
- `--host 0.0.0.0` 被拒之后还会不会挂静态资源？缺 frontend dist 是 boot fail-loud 还是请求期 404？
- `dsh-base` / `dsh-headless` / sdk / acp 有没有这条路径？

## 职责边界

本包拥有：fallback handler 的 GET/HEAD 静态语义、`serveStatic` 的路径篱笆与 MIME、把每个 **显式 index 入口** 当 `authorizeIndex` + `renderIndex` 的调用点。插件导出 `name` / `inject` / `Config` / `apply` / `serveStatic`，**不** `provide` 名为 `frontendStatic` 的 Cordis service——浏览器是 HTTP Consumer，不是 `ctx.get`。[E: packages/host/frontend-static/src/index.ts:24] [E: packages/host/frontend-static/src/index.ts:27] [E: packages/host/frontend-static/src/index.ts:113]

本包**不**拥有：`node:http` listen 与 named route 表（[`subsys.host.webserver`](webserver.md)）；`--host` / `--port` / `--no-open` / `--trusted-host` 与 `provide('webStartup')`（[`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)）；就绪 URL 行与 `DSH_WEB_URL`（同属 `web-app` `apply`）；`/api` 前缀、launch token cookie 与 `authorizeIndex` 实现（[`subsys.client.connection`](../client/connection.md)）；`/plugins` 前缀与 boot-manifest 图结构（[`subsys.client.modules`](../client/modules.md)）；agent-preset 面上的 tools / persona / isolate。`dsh-base` 与 `dsh-headless` **不** insert `webserver`，因此也没有 fallback 座可占。

没有 shipped TUI 模板。`PROFILE_TEMPLATES` 五个名字：`acp` / `web`（唯一 `live`）/ `headless` / `sdk` / `sdk-minimal`。只有 `web` 的 bundles 含 `@deepseek-ai/dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:143]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/frontend-static/src/index.ts` | `name` / `inject` / `Config` / `serveStatic` / `apply`：占座并发 dist |
| `packages/host/frontend-static/tests/frontend-static.spec.ts` | 真 Loader：MIME、live rebuild、显式 index + taps、401、404 miss、403、405、dispose 释座 |
| `packages/host/frontend-static/package.json` | npm 名 `@deepseek-ai/dsh-host-frontend-static`；peer `dsh-host-webserver` 与 `dsh-client-connection` |
| `packages/host/frontend-static/src/invariant.ts` | companion 的 `install` 是空函数：座不能在 teardown 流上探测 |
| `packages/bundle/web-app/src/index.ts` | `web-app`：`resolveDistIndex` + `ctx.plugin(FrontendStatic, { distIndex })` |
| `packages/bundle/web-app/src/startup.ts` | `--host 0.0.0.0` 在 `provide('webStartup')` 之前 `program.error`；另有 `--no-open` |
| `packages/bundle/web-app/cordis.patch.yml` | insert `webserver` / `web-runtime`；**没有** `frontend-static` 行 |
| `packages/host/webserver/src/index.ts` | `registerFallback` / `tapIndex` / `applyIndexTaps` / `renderIndex` / named-route `match` |
| `packages/client/connection/src/browser-auth.ts` | `authorizeIndex`：token 303、cookie 放行、否则 401 |
| `packages/client/modules/src/index.ts` | `webserver/index-inject` 写入 boot manifest |
| `packages/client/ui-theme/src/index.ts` | `webserver/index-inject` 写入初始 theme |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `apps/web/package.json` | `@deepseek-ai/dsh-web-frontend` 的 `exports["./dist/*"]` 与 `./package.json` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` | 字面量 `'frontend-static'`。 |
| `inject` | `['webServer', 'connection']`。任一服务未 provide 则本插件 pending，不占座。 |
| `Config.distIndex` | **必填**字符串：`index.html` 的绝对路径。`distRoot = dirname(distIndex)`。 |
| `MIME` | 按 `extname(target)` 查表；缺键是 `'application/octet-stream'`。含 `.gz` → `application/gzip`（packed VFS，不当 `Content-Encoding`）。 |
| `renderIndex`（本包闭包） | `readFile(distIndex)` → `webServer.renderIndex` → 给 `<head>` 加 `<base href="/">`。 |
| `WebServer.renderIndex` | 先 `collectIndexInjections` / `renderIndexInjections`，再 `applyIndexTaps`。 |
| `registerFallback` | `WebServer` 上只有一个 handler 槽。第二人抛 `webserver: fallback already registered`。返回的 disposer 把槽置回 `undefined`。 |
| `STATIC_MISS_CODES` | `ENOENT` / `EISDIR` / `ENOTDIR` → 空 404；其它 fs 错误上抛给 webserver 的 400 护栏。 |

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
| `.gz` | `application/gzip` |
| 其它 | `application/octet-stream` |

[E: packages/host/frontend-static/src/index.ts:41] [E: packages/host/frontend-static/src/index.ts:52] [E: packages/host/frontend-static/src/index.ts:94] [E: packages/host/frontend-static/src/index.ts:104]

## 控制流

1. **web profile 叠出 host HTTP，但不写出本包行。** `PROFILE_TEMPLATES.web` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`，`patchReload: 'live'`。`dsh-web-app` 的 patch 在 transport 层 insert `id: webserver`（`name: '@deepseek-ai/dsh-host-webserver'`，`inject: [webStartup]`）和 `id: web-runtime`（`name: '@deepseek-ai/dsh-web-app'`，同样 `inject: [webStartup]`）。整份 yml **没有** `name: '@deepseek-ai/dsh-host-frontend-static'` 的行。`dsh-base` 的 insert 从 `timer` / `hmr` 起，不含 HTTP 宿主。[E: packages/boot/app-boot/src/profile.ts:142] [E: packages/bundle/web-app/cordis.patch.yml:111] [E: packages/bundle/web-app/cordis.patch.yml:130] [E: packages/bundle/base/cordis.patch.yml:16]

2. **`--host 0.0.0.0` 在 `provide('webStartup')` 之前被拒，静态资源根本挂不上。** `apply@packages/bundle/web-app/src/startup.ts` 若 `options.host === '0.0.0.0'` 则 `program.error(…intentionally not supported yet for safety…)`，action 不跑到 `ctx.provide`。`webserver` / `web-runtime` 因 `inject: [webStartup]` 保持 pending；`frontend-static` 再 `inject: ['webServer', 'connection']`，listen 与 fallback 都不发生。`--help` 同样不 provide。`webCommand` 还登记 `--no-open` / `--port` / `--trusted-host`。`WebServer.Config.host` schema 仍是 `'127.0.0.1' | '0.0.0.0'`：一条替换整行 `webserver.config` 的 overlay 仍可能绑 all-interfaces，那不是 `--host` 旗标路径。[E: packages/bundle/web-app/src/startup.ts:52] [E: packages/bundle/web-app/src/startup.ts:74] [E: packages/bundle/web-app/src/startup.ts:75] [E: packages/host/webserver/src/index.ts:126]

3. **缺省 bind 是表达式回退。** 合法 invocation 才 provide `webStartup`。`webserver.config` 写 `host: !!js ctx.webStartup.host ?? '127.0.0.1'`、`port: !!js ctx.webStartup.port ?? 3080`。`WebServer[Service.init]` **立刻** `listen(config.port, config.host)`。webserver 不懂 harness、不发文件、不打印 URL。[E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:116] [E: packages/host/webserver/src/index.ts:294]

4. **`web-runtime` 在 bind 之后用子插件挂本包。** `web-app` 自己的 `inject` 是 `['webServer']`。`apply@packages/bundle/web-app/src/index.ts` 先 `provide('webRuntime', …)`，再 `ctx.plugin(FrontendStatic, { distIndex: internals.resolveDistIndex() })`。`resolveDistIndex` 用 `createRequire(import.meta.url).resolve('@deepseek-ai/dsh-web-frontend/package.json')` 再 `join(..., 'dist', 'index.html')`。`@deepseek-ai/dsh-web-frontend`（`apps/web`）导出 `"./dist/*"` 与 `"./package.json"`。包解析失败则抛 `web-app: @deepseek-ai/dsh-web-frontend is not resolvable from this composition`。注释写明：**dist 文件是否存在是请求期问题**——fallback 每请求读盘；没有 dist 仍可 boot（例如静态 worker preview 自带页面）。`internals.resolveDistIndex` 只给测试替换。[E: packages/bundle/web-app/src/index.ts:41] [E: packages/bundle/web-app/src/index.ts:174] [E: packages/bundle/web-app/src/index.ts:177] [E: packages/bundle/web-app/src/index.ts:241] [E: apps/web/package.json:15]

5. **`apply@packages/host/frontend-static/src/index.ts` 用 `ctx.effect` 占唯一 fallback 座。** `distIndex = config.distIndex`，`distRoot = dirname(distIndex)`。`renderIndex` 每次从磁盘读 index，调 `ctx.webServer.renderIndex`，再给 `<head>` 加 `<base href="/">`（相对 base 的 dist 在深层 URL 下也要锚到站点根）。`registerFallback` 的返回值交给 `ctx.effect`，fiber dispose 即释座。第二次 `registerFallback` 抛 `webserver: fallback already registered`。[E: packages/host/frontend-static/src/index.ts:120] [E: packages/host/frontend-static/src/index.ts:121] [E: packages/host/frontend-static/src/index.ts:122] [E: packages/host/frontend-static/src/index.ts:124] [E: packages/host/webserver/src/index.ts:198]

6. **请求先走 named route，miss 才到 fallback。** `WebServer` 的 HTTP `handle`：`match(rawPath)` 命中 exact / 最长 prefix 则把完整生命周期交给该 handler（`/api`、`/plugins` 都是 prefix，方法由路由自己处理）。无名且无 fallback → 404。有 fallback → `await fallback(req, res)`。handler reject 或 `decodeURIComponent` 抛错：headers 未发则 400，已发则 `destroy`。upgrade 不走 fallback。[E: packages/host/webserver/src/index.ts:225] [E: packages/host/webserver/src/index.ts:236] [E: packages/host/webserver/src/index.ts:250] [E: packages/host/webserver/tests/webserver.spec.ts:240]

7. **fallback handler 只放行 GET/HEAD。** `req.method` 不是 `'GET'` 且不是 `'HEAD'` → `405` 空 body。这是 **fallback-only** 语义：named route 可以接受 POST。然后 `decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)`，交给 `serveStatic`，`authorizeIndex` 绑定 `() => ctx.connection.authorizeIndex(req, res)`。[E: packages/host/frontend-static/src/index.ts:127] [E: packages/host/frontend-static/src/index.ts:128] [E: packages/host/frontend-static/src/index.ts:139] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:197]

8. **`serveStatic`：traversal → 403；显式 index → 鉴权后 200；文件命中 → 200；miss / 目录 → 404。** `target = resolve(normalize(join(distRoot, pathname)))`。篱笆是 `target === distRoot` **或** `target.startsWith(distRoot + sep)`；否则 `403` 空 body。比较串用 `sep` 不是 `'/'`：Win32 上 `resolve()` 出反斜杠。`target === distRoot` 或 `target === distIndex`：先 `authorizeIndex()`，false 则已经写了 303/401，本函数直接 return；true 则 `renderIndex()` + HTML MIME。其它路径 `readFile(target)`：成功则按 `MIME[extname(target)] ?? 'application/octet-stream'` 写 200；`STATIC_MISS_CODES` 则 **空 404**（含 `EISDIR` 的存在目录、不存在的 SPA 深层 path）。非 miss 的 fs 错误上抛。每次请求重新 `readFile`，下一次 GET 能读到刚写入的 rebuild。非 index 资产**不**走 `authorizeIndex`（公开静态）。[E: packages/host/frontend-static/src/index.ts:80] [E: packages/host/frontend-static/src/index.ts:88] [E: packages/host/frontend-static/src/index.ts:89] [E: packages/host/frontend-static/src/index.ts:100] [E: packages/host/frontend-static/src/index.ts:104] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:173] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:196]

9. **每个 index 响应：鉴权 → structured inject → taps → `<base>`。** `authorizeIndex`：根路径带合法 launch token 的 GET 写 cookie 并 **303 Location: `/`**；带有效 cookie 才允许读 index；其余 **401** 明文提示 reopen 打印的 URL。未鉴权的 `/` 在测试里是 401，不是壳 HTML。[E: packages/client/connection/src/browser-auth.ts:240] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:121] `WebServer.renderIndex` = `applyIndexTaps(renderIndexInjections(html, collectIndexInjections()))`。[E: packages/host/webserver/src/index.ts:359] `ClientModuleRegistry` 与 `ui-theme` 的 node 半边订阅 `webserver/index-inject`（boot manifest / 初始 theme），不再用 `tapIndex` 写主内容；测试仍用 `tapIndex` 打标验证折换顺序。[E: packages/client/modules/src/index.ts:589] [E: packages/client/ui-theme/src/index.ts:40] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:145] 本包只保证 **调用点**：`/`、`/index.html`（及 `/?…` 查询，pathname 仍是 `/`）走 `renderIndex`；`/no/such/route` **不**回壳。

10. **释座是 HMR / 热替换安全阀。** 测试 dispose `id: frontend` 那一行的 fiber 后，`/no/such/route` 仍是未占座 404，且 `registerFallback` 可以再登记。companion `host-frontend-static-invariant` 的 `install` 是空函数：`internal/plugin` 在 disposing fiber 的 effect 跑完之前触发，此时合法 owner 仍占座，探测第二次 `registerFallback` 会对正确 teardown 误报。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:205] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:206] [E: packages/host/frontend-static/src/invariant.ts:26]

11. **非 web profile 没有这条链。** `dsh-headless` 的 insert 是 `code-runtime` + `headless-startup` + `headless-runner`，没有 `webserver`，因此没有 fallback 座，也没有人 `plugin(FrontendStatic)`。`sdk` / `sdk-minimal` / `acp` 的 shipped overlay 同样不叠 `dsh-web-app`。[E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26] [E: packages/boot/app-boot/src/profile.ts:146]

本页是 **route / Service** 控制流，不是 Cordis `Events.waterfall`。`tapIndex` 与 `webserver/index-inject` 都是同步变换，没有 `next()`。

## 设计动机

- **fallback 座只能有一个 owner。** 两个 SPA / 两套 miss 语义无法组合；冲突必须在 composition 期抛错，而不是运行时抢最后一个 handler。
- **dist 位置是 bundle 的装配事实，不是用户 config。** `web-app` 用 `@deepseek-ai/dsh-web-frontend` 的 package exports 解析 `package.json` 再拼 `dist/index.html`。用户 overlay 改 `web-runtime.config` 也改不到路径；要换 dist 只能换挂载点或测试钩子 `internals.resolveDistIndex`。
- **disable 行解决不了「谁发文件」。** web overlay 可以把模型可见 `tool-*` `disabled: true`，但浏览器壳仍要一份 host 面静态入口。本包坐在 host 面，和每会话 agent-preset 的 tools / persona / isolate 切开。
- **index inject 把「改 html」从「发文件」拆开。** modules / theme 往 `webserver/index-inject` 推行；`tapIndex` 是 structured 行表达不了的 escape hatch。真正读盘和写 200 的是 fallback owner。webserver 自己不发文件。
- **traversal 用 `sep` 对齐 `path.resolve` 的平台路径。** 这是 Win32 正确性，不是风格选择。
- **miss → 404，不是 SPA 200。** 只有配置的 index 路径与 dist 根渲染壳；深层 history path 若磁盘上没有对应文件就是空 404。named `/api` / `/plugins` 不走这条。浏览器壳依赖显式入口加 `<base href="/">`，而不是把任意 URL 都当 index。
- **index 鉴权、资产公开。** 壳 HTML 带 boot token 面；`.js` / `.css` 等不经 `authorizeIndex`。

## Gotcha

- **shipped 树里搜不到 `id: frontend-static`。** 包测试用 Loader 行（`webserver` + `connection` + `name: '@deepseek-ai/dsh-host-frontend-static'`）覆盖 HTTP 面；产品路径是 `web-runtime` 的 child `ctx.plugin`。`dsh --profile web --dump-config` 也看不到这个 child。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:55] [E: packages/bundle/web-app/src/index.ts:241]
- **`--host 0.0.0.0` 被拒 ≠ schema 禁止 all-interfaces。** 旗标路径不 provide `webStartup`，默认 composition 不 listen、不挂本包。overlay 整行改写 `webserver.config.host` 仍可能是 `'0.0.0.0'`。[E: packages/bundle/web-app/src/startup.ts:75] [E: packages/host/webserver/src/index.ts:126]
- **缺 dist 文件不再是 boot 期 `web-app` fail-loud。** `resolveDistIndex` 只要求 frontend **包**可解析；缺 `index.html` 时鉴权通过的 `/` 走 `STATIC_MISS_CODES` → 404。[E: packages/bundle/web-app/src/index.ts:177] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:167]
- **`serveStatic` 不区分 HEAD 与 GET 的写盘路径。** fallback 放行 HEAD，实现仍 `readFile` + `res.end(body)`。fetch HEAD 客户端可能丢 body；响应头只写 `content-type`，没有 `ETag` / `If-None-Match` / `Cache-Control`。[E: packages/host/frontend-static/src/index.ts:104] [E: packages/host/frontend-static/src/index.ts:105] 测试对 HEAD `/app.js` 断言 body 为空（HTTP 客户端语义）。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:133]
- **畸形 `%` escape 是 400，不是 403。** `decodeURIComponent` 在 `serveStatic` 之前抛错，被 webserver 的 per-request `catch` 收成 400；`/%zz` 测的是 carrier，不是 traversal。[E: packages/host/webserver/tests/webserver.spec.ts:240] 本包测试用 `/bad%00path` 同样落到 400。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:198]
- **`/..%2f..%2fetc%2fpasswd` 先 decode 再 `resolve`。** `%2f` 变成 `/` 之后才会走出 `distRoot`，得到 403。[E: packages/host/frontend-static/tests/frontend-static.spec.ts:196]
- **目录命中是 404，不是 403、301，也不是 SPA 200。** 存在的子目录走 `readFile` 的 `EISDIR` → 空 404。[E: packages/host/frontend-static/src/index.ts:100] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:173]
- **第二人占座抛错；dispose 之后必须能再占。** 把「HMR 换 owner」理解成「两个 fallback 并存」是错的。[E: packages/host/webserver/src/index.ts:198] [E: packages/host/frontend-static/tests/frontend-static.spec.ts:206]
- **本包不打印 `dsh web: http://…`。** URL 行属于 `web-app` 在 Loader `await` 之后、经 `connection.authenticatedUrl` 的 `console.log`。[E: packages/bundle/web-app/src/index.ts:280]
- **`dsh-base` / `dsh-headless` / sdk / acp 没有 dormant 的 frontend-static。** 不是「插了行但 disabled」。宿主入口除 `dsh web` 外还有 `dsh --profile sdk|sdk-minimal|acp|headless`，那些 profile 不发这套 SPA。[E: packages/bundle/headless/cordis.patch.yml:26]
- **未带 cookie 的 GET `/` 是 401，不要当成「壳没 build」。** [E: packages/host/frontend-static/tests/frontend-static.spec.ts:121]

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.webServer` listen | `@deepseek-ai/dsh-host-webserver` 的 `WebServer`；`Config.host` 为 `'127.0.0.1' \| '0.0.0.0'` | **web-app** 行 `id: webserver`，`inject: [webStartup]`，缺省 `127.0.0.1:3080`。**base / headless / sdk / acp / sdk-minimal：无此行** | `web-app` 的 `inject: ['webServer']`；`frontend-static` 的 `inject` 含 `webServer`；`connection` 的 `/api`；`modules` 的 `/plugins` |
| 唯一 fallback 座 | `WebServer.registerFallback`：一人；第二人抛错；disposer 清空槽 | **host** 插件 `frontend-static` 的 `apply`（`ctx.effect`）。**不是** yml 行。**web-app** 的 `web-runtime.apply` 才 `ctx.plugin(FrontendStatic, { distIndex })`。**非 web profile：无 Provider** | 所有 `match` miss 的 HTTP 请求。无 owner 时 webserver 自己 404 |
| `Config.distIndex` | 必填绝对路径；`distRoot = dirname(distIndex)` | **web-app** `resolveDistIndex()` → `require.resolve('@deepseek-ai/dsh-web-frontend/package.json')` + `dist/index.html`。测试可换 `internals.resolveDistIndex`。**非 web：无** | `serveStatic` / 本包 `renderIndex`。包不可解析 fail-loud；文件缺失是请求 404 |
| index 渲染管线 | `authorizeIndex` + `renderIndex`（injections 然后 taps）+ `<base href="/">` | **connection** 拥有鉴权；**modules** / **ui-theme** 订阅 `webserver/index-inject`；webserver 存 taps 与 emit 表 | **frontend-static** 仅在显式 index 入口调用。本包不解释注入内容 |
| `inject` 挂载门 | 本包 `['webServer', 'connection']`；yml `inject: [webStartup]`（`webserver` / `web-runtime`） | `webStartup`：**web-app** 行 `web-startup`。`--host 0.0.0.0` / `--help` 不 provide。**非 web：无** | 服务缺失则下游 pending：不 listen、不占座、不发文件 |

换一条缝的 Provider（删掉 `web-runtime`、另挂第二个 fallback、或把 `distIndex` 指到空目录）会带走它的 Consumer：浏览器拿不到壳（空目录下 `/` 是 404），或第二次 `registerFallback` 在 boot 期炸掉。Definition（座只有一个、index 必须过鉴权与 inject、traversal 用 `sep`、miss 是 404）保持不变。

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
- packages/client/connection/src/browser-auth.ts
- packages/boot/app-boot/src/profile.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/web/package.json

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面边界。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮提问；本包对应 GET `/` 的鉴权 + SPA index + inject 那一步。
- [`subsys.host.webserver`](webserver.md) — `node:http` listen、named route、唯一 fallback 座、`renderIndex` / `tapIndex`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` overlay：`web-startup` / `web-runtime` / 整表 disable 模型可见行。
- [`subsys.client.modules`](../client/modules.md) — `/plugins` 前缀与 boot-manifest `webserver/index-inject`（本页不写图结构）。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `dsh web` alias、旗标表（含 `--no-open`）、host 插入 id。
- [`subsys.client.connection`](../client/connection.md) — `/api` prefix 与 `authorizeIndex`；named route 优先于本包 fallback。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 无 `webserver`，无静态资源座。
