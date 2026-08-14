---
id: subsys.client.modules
title: client modules 表
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/modules/src/index.ts
  - packages/client/modules/src/client/manifest.ts
  - packages/client/modules/src/client/index.ts
  - packages/client/modules/src/client/system.ts
  - packages/client/modules/src/invariant.ts
  - packages/client/modules/package.json
  - packages/client/modules/tests/node-half.client.spec.ts
  - packages/client/modules/tests/loader.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/host/webserver/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/client/web/src/boot.tsx
  - packages/client/hmr/src/index.ts
  - packages/client/hmr/src/events.ts
  - packages/client/tsdown.client.ts
  - packages/client/runtime/package.json
  - packages/client/ui-conversation/package.json
  - apps/web/src/main.ts
  - apps/web/vite.config.ts
  - vendor/loader/src/config/tree.ts
symbols:
  - ClientModuleRegistry
  - ctx.clientModules
  - WebBootGraph
  - __DSH_BOOT__
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.web
  - subsys.client.hmr
  - subsys.host.webserver
  - subsys.host.frontend-static
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.vendor.loader
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-modules` 是 `dsh.client` **双面**包：node 半边把 host Loader 里声明 `dsh.client.platform: 'web'` 的包扫成 `window.__DSH_BOOT__` 图、登记 `/plugins/<id>/client.js`（及 `.map`），并用 `tapIndex` 把图插进 `<head>`；浏览器半边是壳内核在 cordis 出现之前静态建成的 lazy-CJS 模块表，**不**再经 `/plugins` 拉自己。本仓没有 shipped TUI；Web 是默认安装路径。client **不**执行模型 turn。

## 能回答的问题

- `dsh web` 打开的 HTML 里 `window.__DSH_BOOT__` 是谁写的？扫描是全量 rescan 还是增量 dirty + microtask flush？
- 缺 client bundle 时进程怎么响？文案为什么点名 `pnpm run build`？
- 浏览器半边为何不 `GET /plugins/@deepseek-ai/dsh-client-modules/client.js`？`ctx.modules` 和 `ctx.clientModules` 各在哪一面？
- 换 Loader 插件集会不会让 `package.json` 的「不是 client 包」缓存失效？bundle 内容变化只走哪条入口？
- `dsh-base` / `dsh-web-app` / `dsh-headless` 谁 insert `id: modules`？`--host 0.0.0.0` 被拒之后这行会不会激活？
- `client-hmr` 注释里的 `clientModuleHost` 是不是第二个 Context 键？

## 职责边界

本包拥有 **web 插件表**这一条缝的两端。node 半边是 `ClientModuleRegistry`，`Service` 名 `'clientModules'`，`inject = ['webServer', 'loader']`；浏览器半边是 `ClientModuleSystem`（实现 `ClientModuleLoader`），由壳内核构造后经 `./client` 的 `apply` `provide('modules')`。[E: packages/client/modules/src/index.ts:185] [E: packages/client/modules/src/index.ts:204] [E: packages/client/modules/src/client/index.ts:33]

本包**不**拥有：HTML 与 SPA fallback（[`subsys.host.frontend-static`](../host/frontend-static.md) 占 fallback 座，每次 index 调 `applyIndexTaps`）；listen 与路由表（[`subsys.host.webserver`](../host/webserver.md) 的 `register` / `tapIndex`）；壳的 prefetch / adopt / fiber sweep（[`subsys.client.web`](web.md) 的 `AppWebEntry`）；运行时装 UI 插件的 stat-poll 与 `/plugins/events` SSE（[`subsys.client.hmr`](hmr.md)）；`/api` 与会话 RPC（connection）；模型 turn（agent-loop）。HMR 注释把本服务叫 `clientModuleHost`，**没有**第二个 Context 键：HMR 的 `inject` 字面量是 `'clientModules'`。[E: packages/client/hmr/src/index.ts:28]

`dsh.client` 行是浏览器 roster。node 半边把它们扫进 `__DSH_BOOT__`；浏览器半边按图 arrival。本页不把每个 `ui-*` 写成独立子系统。图里出现哪些 id 是 **host 面 composition** 的结果，不是 session log 事件；这不是 model-visible 缝。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/modules/src/index.ts` | node 半边：增量扫描、`WebBootGraph`、`/plugins`、`tapIndex`、`rebuilt` |
| `packages/client/modules/src/client/manifest.ts` | 线合同：`WebBootEntry` / `WebBootGraph` / `parseBootManifest` / `ClientModuleLoader` |
| `packages/client/modules/src/client/system.ts` | `ClientModuleSystem`：prefetch / materialize / `require` 分支 / `invalidate` |
| `packages/client/modules/src/client/index.ts` | 浏览器插件面：读 `window.__DSH_MODULES__`，`provide('modules')` |
| `packages/client/modules/src/invariant.ts` | 图行必须能 `clientPath(id)`，否则 served `__DSH_BOOT__` 会 404 |
| `packages/client/modules/package.json` | 本包自己也是 `dsh.client`（`immediately: true`）；`exports["./client"]` |
| `packages/client/modules/tests/node-half.client.spec.ts` | 缺 bundle 聚合文案；source map 200 |
| `packages/client/modules/tests/loader.client.spec.ts` | prefetch 不跑 factory；双重 boot 响；`invalidate` 再拉 |
| `packages/bundle/web-app/cordis.patch.yml` | `id: modules` `name: '@deepseek-ai/dsh-client-modules'` |
| `packages/host/webserver/src/index.ts` | `register({ kind: 'prefix' })`、`tapIndex`、`applyIndexTaps` |
| `packages/host/frontend-static/src/index.ts` | fallback 发 index 前跑 taps |
| `packages/client/web/src/boot.tsx` | 解析 `__DSH_BOOT__`、静态采用本包、plugin-row 循环 skip 自己 |
| `packages/client/hmr/src/index.ts` | `inject: ['clientModules', 'webServer']`；`rebuilt(id)` |
| `packages/client/tsdown.client.ts` | 产物 banner 调 `window.__ModuleLoader__.load` |
| `vendor/loader/src/config/tree.ts` | `internal.import` 是 vendored Loader 的唯一到达点 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `DshClientDeclaration` | `package.json` `dsh.client`：必有 `platform: string`；可选 `inject: string[]`、`immediately: boolean`。只有 `platform === 'web'` 才入表。 |
| `PkgMeta` | 按 **package name** 缓存：`clientPath`、`inject?`、`immediately`。负判决（解析不到 / 不是 web client）缓存为 `null`，**永不失效**。 |
| `WebBootEntry` | 线行：`id`（== package name）、`url`（`/plugins/<id>/client.js?rev=<rev>`）、`rev`（bundle sha1 前 12 hex）、可选 `inject`、可选 `immediately: true`。`inject` 是包名边，给预检 / HMR diff；fiber 真正的 service `inject` 在各 client 插件源码里。 |
| `WebBootGraph` | `{ rev, entries }`。`rev` 是 `JSON.stringify(entries)` 的短 hash。`entries` 顺序无语义（激活靠 fiber inject waiting）。 |
| `BootManifest` | `parseBootManifest` 的两视图：`modules`（只要 `id/url/rev`）给模块表；`plugins`（`inject` 缺省 `[]`，`immediately` 缺省 `false`）给壳组 entry。 |
| `WebPluginRecord` | 表内一行：`entry` + 绝对 `clientPath`。fiber 重启复用行与 `rev`；只有 `rebuilt(id)` 再读磁盘。 |
| `MissingClientBundleError` | `ENOENT` 读 bundle。文案含 `run \`pnpm run build\` before launch` 以及 package / path。其它 fs 错（如 `EISDIR`）不走这条。 |
| `ClientPackageCompositionError` | 激活 flush 把失败聚成一个 `AggregateError`：先列缺 bundle，再列 other failures。 |
| `ClientModuleLoader` | `version: 'client'`；`import` / `prefetch` / `registerStatic` / `invalidate` / `loadCache`。vendored `EntryTree.import` 调 `internal.import`。 |
| `DshWindow` | `__DSH_BOOT__`（宿主注入的生图）、`__ModuleLoader__`（factory 登记槽）、`__DSH_MODULES__`（内核把实例交给 `./client` apply）。 |

`dsh.client.immediately` 缺省不是 `true`：`ui-conversation` 的 `dsh.client` 在 `inject` 之后只留 `platform: "web"`，没有 `immediately` 键。[E: packages/client/ui-conversation/package.json:42] `client-runtime` / 本包 / `client-hmr` / `connection` 显式 `immediately: true`。[E: packages/client/modules/package.json:36] [E: packages/client/runtime/package.json:40]

## 控制流

1. **只有 web overlay insert `id: modules`。** `PROFILE_TEMPLATES.web` 把 `@deepseek-ai/dsh-web-app` 叠在 `dsh-base` 上。web-app 第一段 `insert` 含 `id: modules` `name: '@deepseek-ai/dsh-client-modules'`。`dsh-base` 的 insert 从 `timer` / `hmr` / `llm` 起，没有 modules 行。`dsh-headless` 的 insert 是 `code-runtime` + `headless-startup` + `headless-runner`，没有 webserver，也没有 modules。本仓没有 shipped TUI 包。[E: packages/bundle/web-app/cordis.patch.yml:151] [E: packages/bundle/web-app/cordis.patch.yml:152] [E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **`modules` 行的激活门是 `webServer` + `loader`，不是 yml 行序。** `ClientModuleRegistry.static inject = ['webServer', 'loader']`。`webserver` 自己 `inject: [webStartup]`。launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`，于是 `webserver` pending，`modules` 也不激活：没有 `/plugins`，没有 `__DSH_BOOT__` tap。`client-hmr` 在 patch 里写在 `modules` **之前**，但它 `inject: ['clientModules', 'webServer']`，仍等本服务 provide。[E: packages/client/modules/src/index.ts:185] [E: packages/client/hmr/src/index.ts:28]

3. **构造即激活扫描。** `constructor` `super(ctx, 'clientModules')`。`ctx.baseUrl` 必须是 config 树锚点（`cordis.yml` 目录的 file URL）：用本包自己的 URL 在 pnpm isolated `node_modules` 下解析不到兄弟包。缺 `baseUrl` 立刻抛错。[E: packages/client/modules/src/index.ts:204] [E: packages/client/modules/src/index.ts:210]

4. **扫描是增量 dirty + 一次 flush，没有 full-rescan 函数。** 先 `ctx.on('internal/plugin')`：有 `fiber.entry.options.name` 则 `dirty.add`，再 `queueMicrotask` 调 `flush`（steady-state 失败只 `logger.warn`）。没有 entry 的 fiber（子插件 / 手工 mount）O(1) 丢掉。然后把当前 `ctx.loader.entries()` 的每个 `options.name` 放进同一 `dirty` 集，同步 `flush`。激活失败聚成 `ClientPackageCompositionError`，fiber FAILED。[E: packages/client/modules/src/index.ts:221] [E: packages/client/modules/src/index.ts:224] [E: packages/client/modules/src/index.ts:233] [E: packages/client/modules/src/index.ts:238]

5. **`processOne` 对一个 name 对活 Loader。** 活行条件：`options.name` 匹配、`fiber !== undefined`、`!disabled`。不活则 `table.delete`。已在表里则 **false**（fiber 重启不重读 bundle）。否则 `resolveMeta`。[E: packages/client/modules/src/index.ts:387] [E: packages/client/modules/src/index.ts:392] [E: packages/client/modules/src/index.ts:393]

6. **`resolveMeta` 读 `package.json`，按 name 永久缓存。** `require.resolve(spec + '/package.json')` 失败（`cordis:include`、subpath 行）→ `null`。`dsh.client` 缺或 `platform !== 'web'` → `null`。声明了 `dsh.client` 但没有 `exports["./client"]`（字符串或 `{ default: string }`）→ 抛。命中则记下绝对 `clientPath` 与 `inject` / `immediately`。负判决与正判决都 `pkgMeta.set`，之后同名不再读盘。换「这是不是 client 包」要 **重启进程**。[E: packages/client/modules/src/index.ts:341] [E: packages/client/modules/src/index.ts:350] [E: packages/client/modules/src/index.ts:356] [E: packages/client/modules/src/index.ts:363]

7. **激活读 bundle 算 `rev`；缺文件是 `MissingClientBundleError`。** `initialBundleRevision` 对 `ENOENT` 抛 `MissingClientBundleError`；其它 fs 错原样上抛。测试钉死两个缺文件合成一条「`client bundles not found; run \`pnpm run build\` before launch:`」清单；把 client 路径建成目录得到 `EISDIR` 时文案走 `other failures:`，**不含** `pnpm run build`。[E: packages/client/modules/src/index.ts:62] [E: packages/client/modules/src/index.ts:379] [E: packages/client/modules/tests/node-half.client.spec.ts:93] [E: packages/client/modules/tests/node-half.client.spec.ts:114]

8. **入表后 `compose` 出稳定 `WebBootGraph`。** `graphRow` 写出 `url: /plugins/<id>/client.js?rev=<rev>`。`id` 可以带 scope 斜杠（`@deepseek-ai/dsh-client-runtime`）。`flush` 若 `processOne` 改过表，重 `compose` 并 `onGraphChanged`（pull：订阅方自己再读 `graph()`）。订阅者抛错只 `logger.error`，不跳过后面的人。[E: packages/client/modules/src/index.ts:153] [E: packages/client/modules/src/index.ts:317]

9. **登记 `/plugins` 前缀 + index tap。** `ctx.webServer.register({ kind: 'prefix', path: '/plugins', handler: serveBundle })`。`tapIndex(html => injectBootManifest(html, this.composed))` —— 闭包每次读 **当前** `this.composed`，HMR 改 rev 后下一次 index 带新图。`injectBootManifest` 把 `JSON.stringify(graph)` 里的 `<` 换成 `\\u003c`，再写成 `<script>window.__DSH_BOOT__ = …</script>` 插进第一个 `<head>` 之后；没有 `<head>` 的 fixture 则前置整段，保证壳 bundle 读到图。[E: packages/client/modules/src/index.ts:242] [E: packages/client/modules/src/index.ts:246] [E: packages/client/modules/src/index.ts:169] [E: packages/client/modules/src/index.ts:170] [E: packages/host/webserver/src/index.ts:94] [E: packages/host/webserver/src/index.ts:139]

10. **fallback 发 index 时才跑 taps。** `frontend-static` 的 `renderIndex` 是 `ctx.webServer.applyIndexTaps(await readFile(distIndex, 'utf8'))`。`applyIndexTaps` 按登记顺序折叠。没有这份图，Vite 壳不是可独立跑的应用：`apps/web` 只找 `#root` 再 `new AppWebEntry(el).run()`；裸 `vite` `serve` 在 listen 前抛 `apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__`。[E: packages/host/frontend-static/src/index.ts:97] [E: packages/host/webserver/src/index.ts:259] [E: apps/web/src/main.ts:10] [E: apps/web/vite.config.ts:16]

11. **`serveBundle` 只认 GET/HEAD 的 `client.js` / `client.js.map`。** 其它 method 405。pathname 必须是 `/plugins/<id>/client.js` 或 `…/client.js.map`；`id` 取中间那段（可含 `/`）。未知 id 或读盘失败都是响亮 404（避免 SPA fallback 把 JS 请求回成 HTML）。命中则 200，`cache-control: no-cache`；map 的 content-type 是 `application/json`。测试对 fixture 写 `.map` 后 GET `/plugins/<name>/client.js.map` 钉 200。[E: packages/client/modules/src/index.ts:423] [E: packages/client/modules/src/index.ts:432] [E: packages/client/modules/src/index.ts:449] [E: packages/client/modules/tests/node-half.client.spec.ts:145]

12. **`/plugins/events` 不是本包的行。** HMR 用 **exact** `EVENTS_ENDPOINT = '/plugins/events'`。`WebServer.match` 先查 exact 再 longest-prefix，所以 SSE 不会落到 `serveBundle`。HMR 行缺席时 `/plugins/events` 会进本前缀并 404。[E: packages/client/hmr/src/events.ts:16] [E: packages/host/webserver/src/index.ts:243]

13. **bundle 内容变化只走 `rebuilt(id)`。** HMR 的 stat-poll 调 `ctx.clientModules.rebuilt(id)`：同步 `readFileSync` 再 hash；rev 没变则静默返回旧值；变了才换 `graphRow`、`compose`、`onRebuilt(id, rev)`、`onGraphChanged`。`rebuilt` 里订阅者抛错被吞，避免掐死 poll。未知 id 返回 `undefined`。插件集合变化靠步骤 4 的 dirty flush；**不会**因 bundle 字节变化去重读 `package.json`。[E: packages/client/modules/src/index.ts:274] [E: packages/client/hmr/src/index.ts:68] [E: packages/client/modules/src/index.ts:278]

14. **浏览器：壳先解析图，再建模块表。** `AppWebEntry.run` 第一句是 `parseBootManifest((globalThis).__DSH_BOOT__)`。缺对象 / `rev` 非字符串 / `entries` 非数组 / 行缺 `id|url|rev` 都抛——没有有效 manifest 就没有可 boot 的东西。然后 `new ClientModuleSystem({ modules, staticModules })`：构造函数登记 `window.__ModuleLoader__`，重复构造抛 `already installed (double boot?)`。[E: packages/client/web/src/boot.tsx:98] [E: packages/client/modules/src/client/manifest.ts:110] [E: packages/client/modules/src/client/system.ts:87]

15. **本包自己被静态采用，plugin-row 循环必须 skip。** 壳 `registerStatic('@deepseek-ai/dsh-client-modules', ModulesClient)`，并把实例写到 `window.__DSH_MODULES__`。`prefetch` 对已 static 的 id 直接 return，因此 `immediately: true` 也不会 `GET /plugins/@deepseek-ai/dsh-client-modules/client.js`。组 entry 时 `rows = [MODULES_ID, …plugins.filter(id !== MODULES_ID), APP_SHELL_ID]`：先 `loader.create({ name: MODULES_ID })`，`apply` 读槽 `provide('modules')`；循环再 create 同名会第二次 `provide('modules')`（vendored `Group.create` 不按 name 去重）。[E: packages/client/web/src/boot.tsx:111] [E: packages/client/web/src/boot.tsx:112] [E: packages/client/web/src/boot.tsx:189] [E: packages/client/modules/src/client/system.ts:186] [E: packages/client/modules/src/client/index.ts:31]

16. **其它图行走 `/plugins` arrival，不是第二次扫 host。** 壳把 `loader.internal = this.modules`。vendored `EntryTree.import` 有 `internal` 就只调 `internal.import(name, …)`，浏览器里不会 fallback 到裸 `import()`。`immediately` 行并行 `prefetch`（只 load script + `__ModuleLoader__.load`，**不**跑 factory）；单行 prefetch 失败被吞，create 侧 `import` 再响。产物 banner 是 `window.__ModuleLoader__.load({ id, factory: (require) => { … return module.exports; } })`。测试钉死：`prefetch` 之后 `ran === []` 且 `loadCache.size === 0`。[E: packages/client/web/src/boot.tsx:168] [E: vendor/loader/src/config/tree.ts:155] [E: packages/client/tsdown.client.ts:269] [E: packages/client/modules/tests/loader.client.spec.ts:69]

17. **`import` / `require` 的分支顺序是纯度门的运行时镜像。** seed 词（`react` 等）→ 已 materialize 的 `loadCache` → `registerStatic`（`app-shell`）→ 已登记 factory 则同步 `materialize` → 图行则 `arrive` 再 materialize → 否则抛。factory 拿到的同步 `require` **没有** load 分支：跨插件 value import 在构建期就是错。`/<id>/client` 与裸 id 同一份 exports。factory 再入同一 id 抛 cycle。`invalidate(id)` 丢掉 factory 与 record，供 HMR 再 prefetch。[E: packages/client/modules/src/client/system.ts:158] [E: packages/client/modules/src/client/system.ts:121] [E: packages/client/modules/src/client/system.ts:193]

## 设计动机

- **双面同一 package name。** host Loader 行的 `name`、图 `id`、`/plugins/<id>/…`、浏览器 entry name 是同一个字符串。扫的是「这棵树现在挂了谁」，不是另写一份 roster。
- **增量 dirty，不要 full-rescan。** `internal/plugin` 已经按 fiber 点名；对一个 name `processOne` 即可。激活扫描复用同一条路，只是同步 flush。
- **`package.json` 元数据永不失效。** 「不是 client 包」也是结论。插件集合变了本应重启；把负缓存做成 TTL 只会在热路径上反复 `stat` / `parse`。bundle **内容** 另走 `rebuilt`。
- **缺产物 fail-loud，并且把「没 build」从其它 fs 错里拆出来。** 源码启动仍消费 `exports["./client"]` 指向的构建物。一条聚合错误列出每个 package/path，避免只报第一个。
- **壳零 composition。** 图由 host 注入；壳只解析、prefetch、adopt。本包不能经自己到达自己，所以 class 打进壳 bundle，`./client` apply 只 enroll 已有实例。
- **lazy CJS：script 执行 ≠ 模块副作用。** CSS 与 `apply` 都在 `factory(require)`。prefetch 可以在旧 fiber 仍服务时登记新 factory（HMR 需要这一拍）。
- **`tapIndex` 而不是改 dist 文件。** 图是进程活状态（rev 随 `rebuilt` 变）。写进磁盘 index 会把一次 boot 的 hash 烤死。

## Gotcha

- **`clientModuleHost` 不是 Context 键。** 源码注释与 HMR 测试 fake 仍用这个词；运行时服务是 `ctx.clientModules`。HMR `inject` 写 `'clientModules'`。[E: packages/client/hmr/src/index.ts:28] [E: packages/client/modules/src/index.ts:204]
- **`dsh.client.inject`（包名）≠ client 插件 `export const inject`（service 名）。** 图上的 `inject` 是信息边。壳 `loader.create({ name })` 只传 name，不把图上的 inject 抄进 entry。[E: packages/client/web/src/boot.tsx:198]
- **`immediately` 缺省 false。** 省略该字段的包（多数 `ui-*`）要等 `loader.create` 才 fetch。`immediately: true` 的包在 entry 创建前登记 factory，因为 materialize 会同步 `require` 跨包（fiber inject 护不住这一拍）。
- **`pkgMeta` 永不失效。** 给一个非 client 包事后补上 `dsh.client` 再 HMR，图不会出现它。要重启 host。
- **fiber 重启不重读 bundle。** 只有 `rebuilt(id)` 换 `rev`。没有 `pnpm run dev:web` 时 HMR poll 看不到变化，链空闲。
- **裸 Vite HTTP 200 ≠ 应用就绪。** `__DSH_BOOT__` 只由完整 `dsh web` 注入。`apps/web` 的 Vite `serve` 在 listen 前被拒。[E: apps/web/vite.config.ts:16]
- **在 `root` 或 modules 行上再 `provide('modules')` 会炸。** 壳已经 skip 了图里的 modules 行；用户 overlay 若再挂一个同名 client 插件，会撞 duplicate factory 或 duplicate provide。
- **`cache-control: no-cache`。** URL 上的 `?rev=` 是一致性锚，不是长期 CDN 缓存键。HMR 可以只推 `rebuilt` 帧而不刷新整图 `rev`。
- **本包不跑模型 turn。** 图变化不是 session 事件。model-visible ⟺ logged 管的是 agent-preset / 工具集，不是 `__DSH_BOOT__`。

## Seam 三角

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|---|
| `dsh.client` 声明 | `package.json` `dsh.client`：`platform` / `inject?` / `immediately?`；`exports["./client"]` | 各双面包自己的 manifest（本包 `immediately: true`） | node 半边 `resolveMeta`；不是 client 或 `platform !== 'web'` → 永久 `null` | 无浏览器 roster，声明存在也不被扫 | 第一段 insert 的 `dsh.client` 行成为扫描输入 | 无 browser roster，声明不被扫 |
| `ctx.clientModules` | `ClientModuleRegistry`；Context 键 `'clientModules'` | **host** 行 `id: modules` `name: '@deepseek-ai/dsh-client-modules'`；`inject: ['webServer','loader']` | `client-hmr`（`rebuilt` / `graph` / `onRebuilt` / `onGraphChanged`）；invariant 同伴 | **无**此行 | **有**。`--host 0.0.0.0` 拒在 `webStartup` 之前则本行 pending | **无**。无 `webServer`，即使手工挂也过不了 inject |
| `window.__DSH_BOOT__` / `WebBootGraph` | `WebBootEntry` + `WebBootGraph`（`manifest.ts` 单源）；`parseBootManifest` | `injectBootManifest` ← `tapIndex` ← `applyIndexTaps`（frontend-static 发 index 时） | `AppWebEntry.run`；缺/畸形图抛错，loading 页停住 | 无 tap，无图 | 每个 index / SPA fallback 都带活图 | 无 HTTP index |
| `/plugins/<id>/client.js` | prefix `/plugins`；GET/HEAD + `.js` / `.js.map` | `ClientModuleRegistry.serveBundle` | 浏览器 `loadBundle`（默认 classic `<script src>`）；devtools 读 map | 无 | 有。exact `/plugins/events` 仍归 HMR | 无 |
| `ctx.modules` / `ClientModuleLoader` | `version: 'client'`；`import`/`prefetch`/`invalidate`/`registerStatic` | 壳内核 `new ClientModuleSystem` + `window.__DSH_MODULES__`；`./client` `apply` `provide('modules')` | vendored `EntryTree.import` → `internal.import`；HMR 浏览器半 `invalidate`/`prefetch` | 无浏览器 Loader | 有。本包行静态采用，**不** `/plugins` 自拉 | 无 |
| `rebuilt(id)` | `ClientModuleRegistry.rebuilt`：再 hash，rev 变才通知 | 本服务。HMR node 半在 stat 变化时调用 | HMR SSE `type: 'rebuilt'`；图 `rev` 与 url query | 无 | 无条件 insert `client-hmr`；无 `dev:web` 则空闲 | 无 |

换 Provider（删 `id: modules`、或让 `webStartup` 不出现）会带走全部 Consumer：页面没有 `__DSH_BOOT__`，壳 `parseBootManifest` 抛错，HMR 因缺 `clientModules` pending。Definition（线形与服务名）不变。`dsh-base` 与 `dsh-headless` 选择不提供这条缝：它们不是「装了但 dormant」，而是 composition 里没有这行。

## Sources

- packages/client/modules/src/index.ts
- packages/client/modules/src/client/manifest.ts
- packages/client/modules/src/client/index.ts
- packages/client/modules/src/client/system.ts
- packages/client/modules/src/invariant.ts
- packages/client/modules/package.json
- packages/client/modules/tests/node-half.client.spec.ts
- packages/client/modules/tests/loader.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/host/webserver/src/index.ts
- packages/host/frontend-static/src/index.ts
- packages/client/web/src/boot.tsx
- packages/client/hmr/src/index.ts
- packages/client/hmr/src/events.ts
- packages/client/tsdown.client.ts
- packages/client/runtime/package.json
- packages/client/ui-conversation/package.json
- apps/web/src/main.ts
- apps/web/vite.config.ts
- vendor/loader/src/config/tree.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。本页是 client 面如何拿到插件表。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一问；步骤 9 是本服务 `tapIndex` + `/plugins`。
- [`subsys.client.web`](web.md) — `AppWebEntry.run`：parse 图、prefetch `immediately`、adopt modules、fiber sweep。
- [`subsys.client.hmr`](hmr.md) — 运行时装 UI 插件：`rebuilt(id)` + SSE `/plugins/events`。与 web overlay 里 `disabled: true` 的共享 `hmr` 行不是同一条。
- [`subsys.host.webserver`](../host/webserver.md) — `register` / `tapIndex` / exact-before-prefix。本包是前缀 `/plugins` 与一份 index tap 的 Consumer。
- [`subsys.host.frontend-static`](../host/frontend-static.md) — fallback 发 dist；每个 index 调 `applyIndexTaps`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面与 host insert id 全表（含 `modules`）。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 谁 insert `id: modules`；`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.vendor.loader`](../vendor/loader.md) — vendored Loader 的 `internal` 合同；浏览器里必须先注入本表。
