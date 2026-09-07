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
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/host/webserver/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/client/web/src/boot.ts
  - packages/client/web/src/seed.ts
  - packages/client/hmr/src/index.ts
  - packages/client/hmr/src/events.ts
  - packages/client/tsdown.client.ts
  - packages/client/ui-conversation/package.json
  - packages/client/connection/package.json
  - packages/boot/app-boot/src/profile.ts
  - apps/web/src/main.ts
  - apps/web/vite.config.ts
  - vendor/loader/src/config/tree.ts
symbols:
  - ClientModuleRegistry
  - ctx.clientModules
  - ctx.modules
  - WebBootGraph
  - bootInjections
  - __DSH_BOOT__
  - createClientModuleSystem
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.web
  - subsys.client.hmr
  - subsys.client.runtime
  - subsys.host.webserver
  - subsys.host.frontend-static
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.vendor.loader
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-client-modules` 是 `dsh.client` **双面**包：node 半边把 host Loader 里声明 `dsh.client.platform: 'web'` 的包扫成 `window.__DSH_BOOT__` 图、登记 `/plugins` combo 路由，并用 `webserver/index-inject` 把队列脚本、combo preload、bootstrap 与图插进 index；浏览器半边由 HTML 安装的 `__ModuleLoader__` 门面物化本包 bootstrap combo，再 `createClientModuleSystem` 建成 lazy-CJS 表。`dsh web` 是唯一 shipped live Web 入口；`dsh --profile sdk|sdk-minimal|acp` 与 `headless` 不叠 `dsh-web-app`，因此不 insert `id: modules`。client **不**执行模型 turn。

## 能回答的问题

- `dsh web` 打开的 HTML 里 `window.__DSH_BOOT__` 是谁写的？扫描是全量 rescan 还是增量 dirty + microtask flush？
- 缺 client bundle 时进程怎么响？文案为什么点名 `pnpm run build`？
- 浏览器半边为何不单独 `GET /plugins/@deepseek-ai/dsh-client-modules/client.js`？`ctx.modules` 和 `ctx.clientModules` 各在哪一面？
- 换 Loader 插件集会不会让「不是 client 包」缓存失效？bundle 内容变化只走哪条入口？
- `dsh-base` / `dsh-web-app` / `dsh-headless` 谁 insert `id: modules`？五个 shipped profile 里谁叠 web-app？
- `client-hmr` 注释里的 `clientModuleHost` 是不是第二个 Context 键？combo URL 与 `/plugins/events` 如何共存？

## 职责边界

本包拥有 **web 插件表**这一条缝的两端。node 半边是 `ClientModuleRegistry`，`Service` 名 `'clientModules'`，`static inject = ['webServer', 'loader']`；浏览器半边是 `ClientModuleSystem`（实现 `ClientModuleLoader`），由 HTML 门面 `create()` 调 `createClientModuleSystem`，再由 `./client` 的 `apply` `provide('modules')`。[E: packages/client/modules/src/index.ts:534] [E: packages/client/modules/src/index.ts:558] [E: packages/client/modules/src/client/index.ts:61]

本包**不**拥有：HTML 与 SPA fallback（[`subsys.host.frontend-static`](../host/frontend-static.md) 占 fallback 座，每次 index 调 `ctx.webServer.renderIndex`）；listen 与路由表（[`subsys.host.webserver`](../host/webserver.md) 的 `register` / `renderIndex`）；壳的 prefetch / fiber sweep / `uiRenderer.mount`（[`subsys.client.web`](web.md) 的 `AppWebEntry`）；运行时装 UI 插件的 stat-poll 与 `/plugins/events` SSE（[`subsys.client.hmr`](hmr.md)）；会话 RPC（[`subsys.client.runtime`](runtime.md) 的 store + session-controller 客户端）；模型 turn（agent-loop）。HMR 注释把本服务叫 `clientModuleHost`，**没有**第二个 Context 键：HMR 的 `inject` 字面量是 `'clientModules'`。[E: packages/client/hmr/src/index.ts:28]

`dsh.client` 行是浏览器 roster。node 半边把它们扫进 `__DSH_BOOT__`；浏览器半边按图 arrival。本页不把每个 `ui-*` 写成独立子系统。图里出现哪些 id 是 **host 面 composition** 的结果，不是 session log 事件；这不是 model-visible 缝。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/modules/src/index.ts` | node 半边：增量扫描、combo 图、`/plugins`、`bootInjections`、`rebuilt` |
| `packages/client/modules/src/client/manifest.ts` | 线合同：`WebBootEntry` / `WebBootGraph` / `parseBootManifest` / `ClientModuleLoader` |
| `packages/client/modules/src/client/system.ts` | `ClientModuleSystem`：prefetch / materialize / `require` 分支 / `invalidate` |
| `packages/client/modules/src/client/index.ts` | `createClientModuleSystem` + `apply` `provide('modules')` |
| `packages/client/modules/src/invariant.ts` | 图行必须能 `clientPath(id)`，否则 served `__DSH_BOOT__` 会 404 |
| `packages/client/modules/package.json` | 本包自己也是 `dsh.client`（`immediately: true`）；`exports["./client"]` |
| `packages/client/modules/tests/node-half.client.spec.ts` | 缺 bundle 聚合文案 |
| `packages/client/modules/tests/loader.client.spec.ts` | prefetch 不跑 factory；bootstrap 不自拉 |
| `packages/bundle/web-app/cordis.patch.yml` | `id: modules` `name: '@deepseek-ai/dsh-client-modules'` |
| `packages/host/webserver/src/index.ts` | `register({ kind: 'prefix' })`、`webserver/index-inject`、`renderIndex` |
| `packages/host/frontend-static/src/index.ts` | fallback 发 index 前 `renderIndex` |
| `packages/client/web/src/boot.ts` | `AppWebEntry.run`：等 `__DSH_BOOT_READY__`，`__ModuleLoader__.create` |
| `packages/client/hmr/src/index.ts` | `inject: ['clientModules', 'webServer']`；`rebuilt(id)` |
| `packages/client/tsdown.client.ts` | 产物 banner 调 `window.__ModuleLoader__.load` |
| `vendor/loader/src/config/tree.ts` | `internal.import` 是 vendored Loader 的唯一到达点 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `DshClientDeclaration` | `package.json` `dsh.client`：必有 `platform: string`；可选 `inject`、`immediately`、`external`。只有 `platform === 'web'` 才入表。 |
| `PkgMeta` | 按 **sourceKey**（`baseUrl` + Loader specifier）缓存：`clientPath`、`inject?`、`external`、`immediately`。负判决缓存为 `null`，**永不失效**。 |
| `WebBootEntry` | 线行：`id`（== package name）、`url`（单资源 combo `/plugins/??<id>/client.js&rev=<rev>`）、`rev`、可选 `inject` / `immediately: true` / `external`。 |
| `WebBootBatch` | 初始 combo：`phase: 'bootstrap' \| 'application'`、`url`、`rev`、`entries`。 |
| `WebBootGraph` | `{ rev, entries, batches }`。`rev` 是 `{ entries, batches }` 的短 hash。`entries` 按 `orderByModuleGraph`（`external` 边）排序；激活仍靠 fiber inject waiting。 |
| `BootManifest` | `parseBootManifest` 的两视图：`modules`（含 `initialUrl`）给模块表；`plugins`（`inject` 缺省 `[]`，`immediately` 缺省 `false`）给壳组 entry。 |
| `WebPluginRecord` | 表内一行：`entry` + 绝对 `clientPath` + 启动时读入的 `bundle` / `baseline`。fiber 重启同 `sourceKey` 复用行；只有 `rebuilt(id)` 再读磁盘。 |
| `MissingClientBundleError` | `ENOENT` 读 bundle。文案含 `run \`pnpm run build\` before launch` 以及 package / path。其它 fs 错（如 `EISDIR`）不走这条。 |
| `ClientPackageCompositionError` | 激活 flush 把失败聚成一个 `AggregateError`：先列缺 bundle，再列 other failures。 |
| `ClientModuleLoader` | `version: 'client'`；`import` / `prefetch` / `invalidate` / `loadCache`。vendored `EntryTree.import` 调 `internal.import`。 |
| `DshWindow` | `__DSH_BOOT__`（宿主注入的生图）、`__ModuleLoader__`（队列门面再切 live）。没有 `__DSH_MODULES__`。 |

`dsh.client.immediately` 缺省不是 `true`：`ui-conversation` 的 `dsh.client` 在 `inject` 之后只留 `platform: "web"`，没有 `immediately` 键。[E: packages/client/ui-conversation/package.json:43] 本包与 `client-hmr` / `connection` 显式 `immediately: true`。[E: packages/client/modules/package.json:36] [E: packages/client/connection/package.json:36] 旧包 `packages/client/runtime` 已删除，不要再把它当 immediately 样例。

## 控制流

1. **只有 web overlay insert `id: modules`。** `PROFILE_TEMPLATES` 五个名字：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。只有 `web` 叠 `@deepseek-ai/dsh-web-app`（`patchReload: live`）。web-app 浏览器 roster 段 `insert` 含 `id: modules` `name: '@deepseek-ai/dsh-client-modules'`。`dsh-base` 的 insert 从 `timer` / `hmr` 起，没有 modules 行。`dsh-headless` 的 insert 是 `code-runtime` + `headless-startup` + `headless-runner`，没有 webserver，也没有 modules。本仓没有 shipped TUI 包。[E: packages/boot/app-boot/src/profile.ts:137] [E: packages/bundle/web-app/cordis.patch.yml:153] [E: packages/bundle/web-app/cordis.patch.yml:153] [E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/headless/cordis.patch.yml:22]

2. **`modules` 行的激活门是 `webServer` + `loader`，不是 yml 行序。** `ClientModuleRegistry.static inject = ['webServer', 'loader']`。`WebServer` 自身无 Cordis `inject`，constructor `super(ctx, 'webServer')`。CLI 有意不支持 `dsh web --host 0.0.0.0`（安全用法错误），但那是 launcher 层，不是本包 inject 门。`client-hmr` 在 patch 里可写在 `modules` 之前，但它 `inject: ['clientModules', 'webServer']`，仍等本服务 provide。[E: packages/client/modules/src/index.ts:534] [E: packages/host/webserver/src/index.ts:144] [E: packages/client/hmr/src/index.ts:28]

3. **构造即激活扫描。** `constructor` `super(ctx, 'clientModules')`。每条 Loader 行的 `baseUrl` 来自 `entry.parent.tree.ctx.baseUrl`；缺则抛 `loader entry … has no resolution base URL`。[E: packages/client/modules/src/index.ts:558] [E: packages/client/modules/src/index.ts:934]

4. **扫描是增量 dirty + 一次 flush，没有 full-rescan 函数。** 先 `ctx.on('internal/plugin')`：有 `fiber.entry.options.name` 则 `dirty.add`，再 `queueMicrotask` 调 `flush`（steady-state 失败只 `logger.warn`）。没有 entry 的 fiber（子插件 / 手工 mount）O(1) 丢掉。然后把当前 `ctx.loader.entries()` 的每个 `options.name` 放进同一 `dirty` 集，同步 `flush`。激活失败聚成 `ClientPackageCompositionError`，fiber FAILED。[E: packages/client/modules/src/index.ts:562] [E: packages/client/modules/src/index.ts:568] [E: packages/client/modules/src/index.ts:577] [E: packages/client/modules/src/index.ts:582]

5. **`processOne` 对一个 Loader specifier 对活源。** 活行条件：`options.name` 匹配、`fiber !== undefined`、`!disabled`。同一 `packageName` 若来自多个 `sourceKey` 抛 composition error。已在表且 `sourceKey` 相同则 **false**（fiber 重启不重读 bundle）。否则 `initialBundleSnapshot` + 不透明初始 `rev`。[E: packages/client/modules/src/index.ts:905] [E: packages/client/modules/src/index.ts:952] [E: packages/client/modules/src/index.ts:957]

6. **`resolveMeta` 读 `package.json`，按 sourceKey 永久缓存。** 解析不到包根（`cordis:`、非根 specifier）→ `null`。`dsh.client` 缺或 `platform !== 'web'` → `null`。声明了 `dsh.client` 但没有 `exports["./client"]` → 抛。命中则记下绝对 `clientPath` 与 `inject` / `external` / `immediately`。负判决与正判决都 `pkgMeta.set`，之后同 key 不再读盘。换「这是不是 client 包」要 **重启进程**。[E: packages/client/modules/src/index.ts:746] [E: packages/client/modules/src/index.ts:756] [E: packages/client/modules/src/index.ts:762]

7. **激活读 bundle；缺文件是 `MissingClientBundleError`。** `initialBundleSnapshot` 对 `ENOENT` 抛 `MissingClientBundleError`；其它 fs 错原样上抛。测试钉死两个缺文件合成一条「`client bundles not found; run \`pnpm run build\` before launch:`」清单；把 client 路径建成目录得到 `EISDIR` 时文案走 `other failures:`，**不含** `pnpm run build`。[E: packages/client/modules/src/index.ts:109] [E: packages/client/modules/src/index.ts:887] [E: packages/client/modules/tests/node-half.client.spec.ts:429] [E: packages/client/modules/tests/node-half.client.spec.ts:450]

8. **入表后 `compose` 出 `WebBootGraph` + combo 响应表。** `orderByModuleGraph` 让被 `external` 请求的包排在消费者前面。`PARSER_PRELOAD_IDS` 只有 `@deepseek-ai/dsh-client-modules`，进 `phase: 'bootstrap'` combo；其余进 `application`。单行 HMR URL 仍是 `/plugins/??<id>/client.js&rev=<rev>`。`flush` 若表变了，重 `compose` 并 `onGraphChanged`（pull）。订阅者抛错只 `logger.error`。[E: packages/client/modules/src/index.ts:254] [E: packages/client/modules/src/index.ts:473] [E: packages/client/modules/src/index.ts:679] [E: packages/client/modules/src/index.ts:723]

9. **登记 `/plugins` 前缀 + 结构化 index 注入。** `ctx.webServer.register({ kind: 'prefix', path: '/plugins', handler: serveBundle })`。`ctx.on('webserver/index-inject', table => table.push(...bootInjections(this.composed)))`：每次 emit 读 **当前** `this.composed`。`bootInjections` 顺序：inline 队列脚本（安装 `__ModuleLoader__`）→ application `script-preload` → bootstrap `script-src` → `global` `__DSH_BOOT__`。[E: packages/client/modules/src/index.ts:586] [E: packages/client/modules/src/index.ts:589] [E: packages/client/modules/src/index.ts:515] [E: packages/client/modules/src/index.ts:522] [E: packages/host/webserver/src/index.ts:165]

10. **fallback 发 index 时才收集注入。** `frontend-static` 的 `renderIndex` 是 `ctx.webServer.renderIndex(await readFile(distIndex, 'utf8'))`，再给 `<head>` 加 `<base href="/">`。`renderIndex` = 结构化注入 + `tapIndex` 折叠。没有这份图，Vite 壳不是可独立跑的应用：`apps/web` 只找 `#root` 再 `new AppWebEntry(el).run()`；裸 `vite` `serve` 在 config 阶段抛 `apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__`。[E: packages/host/frontend-static/src/index.ts:121] [E: packages/host/webserver/src/index.ts:360] [E: apps/web/src/main.ts:6] [E: apps/web/vite.config.ts:9]

11. **`serveBundle` 只认 GET/HEAD，且 URL 必须已在 `responses`（或上一轮 `previousBatchResponses`）里。** 其它 method 405。命中则 200，`cache-control: public, max-age=31536000, immutable`。未知 combo、未知 id、以及 HMR 缺席时的 `/plugins/events` 一律响亮 404（避免 SPA fallback 把 JS 请求回成 HTML）。[E: packages/client/modules/src/index.ts:180] [E: packages/client/modules/src/index.ts:1003] [E: packages/client/modules/src/index.ts:1015] [E: packages/client/modules/src/index.ts:1022]

12. **`/plugins/events` 不是本包的行。** HMR 用 **exact** `EVENTS_ENDPOINT = '/plugins/events'`。`WebServer.match` 先查 exact 再 longest-prefix，所以 SSE 不会落到 `serveBundle`。HMR 行缺席时 `/plugins/events` 会进本前缀并 404。[E: packages/client/hmr/src/events.ts:44] [E: packages/client/hmr/src/index.ts:178] [E: packages/host/webserver/src/index.ts:318]

13. **bundle 内容变化只走 `rebuilt(id)`。** HMR 的 stat-poll 调 `ctx.clientModules.rebuilt(id)`：同步 `readFileSync` 再 hash；rev 没变则静默返回旧值；变了才换 `graphRow`、`compose`、`onRebuilt(id, rev)`、`onGraphChanged`。`rebuilt` 里订阅者抛错被吞，避免掐死 poll。未知 id 返回 `undefined`。插件集合变化靠步骤 4 的 dirty flush；**不会**因 bundle 字节变化去重读 `package.json`。[E: packages/client/modules/src/index.ts:630] [E: packages/client/hmr/src/index.ts:79] [E: packages/client/modules/src/index.ts:638]

14. **浏览器：HTML 门面先物化本包，壳再 `create`。** `AppWebEntry.run` 先 `await __DSH_BOOT_READY__?.promise`，再要求 `window.__ModuleLoader__` 存在，然后 `moduleLoader.create({ boot: win.__DSH_BOOT__, staticModules, … })`。`createClientModuleSystem` 内部 `parseBootManifest`：缺对象 / `rev` 非字符串 / `entries` 或 `batches` 非数组 / 行缺 `id|url|rev` 都抛。`ClientModuleSystem` 构造若 `target.mode !== 'queue'` 抛 `create called after module-system boot`。[E: packages/client/web/src/boot.ts:54] [E: packages/client/web/src/boot.ts:69] [E: packages/client/modules/src/client/manifest.ts:169] [E: packages/client/modules/src/client/system.ts:103]

15. **本包 bootstrap combo 由 HTML `script-src` 预执行，plugin-row 循环不再 skip 自己。** 门面 `create()` 从 `pendingQueue` 取出本包 registration、同步 `factory`、调 `createClientModuleSystem`，并把已物化 exports 放进 `loadCache`。`prefetch` 对已 `loadCache` 的 id 直接 return，因此不会再拉本包 combo。`runPluginBoot` 对 `manifest.plugins` **每一个** id `loader.create({ name })`；`apply` 读闭包里的 `moduleSystem` 再 `provide('modules')`。重复 `create` 会因 mode 已是 `live` 而炸。[E: packages/client/modules/src/index.ts:507] [E: packages/client/modules/src/client/system.ts:94] [E: packages/client/web/src/boot.ts:129] [E: packages/client/modules/src/client/index.ts:58]

16. **其它图行走 combo arrival，不是第二次扫 host。** 壳把 `loader.internal = this.modules`。vendored `EntryTree.import` 有 `internal` 就只调 `internal.import(name, …)`，浏览器里不会 fallback 到裸 `import()`。`immediately` 行并行 `prefetch`（只 load script + `__ModuleLoader__.load`，**不**跑 factory）；单行 prefetch 失败被吞，create 侧 `import` 再响。产物 banner 是 `window.__ModuleLoader__.load({ id, factory: (require) => { … return module.exports; } })`。测试钉死：`prefetch` 之后 `ran === []` 且 `loadCache.has('a') === false`。[E: packages/client/web/src/boot.ts:116] [E: vendor/loader/src/config/tree.ts:155] [E: packages/client/tsdown.client.ts:566] [E: packages/client/modules/tests/loader.client.spec.ts:150]

17. **`import` / `require` 的分支顺序是纯度门的运行时镜像。** `import`：seed 词（`react`、`@deepseek-ai/dsh-client-store` 等，见 `getStaticModules`）→ 已 materialize 的 `loadCache` → 图行则 `arriveGraphRow` 再 materialize → 已登记 factory 则 materialize → 否则抛。factory 拿到的同步 `require` **没有** load 分支：跨插件 value import 在构建期就是错。`/<id>/client` 与裸 id 同一份 exports。factory 再入同一 id 抛 cycle。`invalidate(id)` 丢掉 factory 与 record（bootstrap id 除外），供 HMR 再 prefetch 单资源 combo。[E: packages/client/web/src/seed.ts:33] [E: packages/client/modules/src/client/system.ts:215] [E: packages/client/modules/src/client/system.ts:201] [E: packages/client/modules/src/client/system.ts:240]

## 设计动机

- **双面同一 package name。** host Loader 行的 `name`、图 `id`、combo 资源名、浏览器 entry name 是同一个字符串。扫的是「这棵树现在挂了谁」，不是另写一份 roster。
- **增量 dirty，不要 full-rescan。** `internal/plugin` 已经按 fiber 点名；对一个 specifier `processOne` 即可。激活扫描复用同一条路，只是同步 flush。
- **`package.json` 元数据永不失效。** 「不是 client 包」也是结论。插件集合变了本应重启；把负缓存做成 TTL 只会在热路径上反复 `stat` / `parse`。bundle **内容** 另走 `rebuilt`。
- **缺产物 fail-loud，并且把「没 build」从其它 fs 错里拆出来。** 源码启动仍消费 `exports["./client"]` 指向的构建物。一条聚合错误列出每个 package/path，避免只报第一个。
- **壳零 composition。** 图由 host 注入；HTML 负责 bootstrap combo 与门面；壳只 `create`、prefetch、fiber sweep。本包不能经自己到达自己，所以 bootstrap 必须先于模块表存在。
- **lazy CJS：script 执行 ≠ 模块副作用。** CSS 与 `apply` 都在 `factory(require)`。prefetch 可以在旧 fiber 仍服务时登记新 factory（HMR 需要这一拍）。
- **结构化 `index-inject` 而不是改 dist 文件。** 图是进程活状态（rev 随 `rebuilt` 变）。写进磁盘 index 会把一次 boot 的 hash 烤死。combo URL 用 content-addressed `rev`，所以响应可以 `immutable`。

## Gotcha

- **`clientModuleHost` 不是 Context 键。** 源码注释与 HMR 测试 fake 仍用这个词；运行时服务是 `ctx.clientModules`。HMR `inject` 写 `'clientModules'`。[E: packages/client/hmr/src/index.ts:28] [E: packages/client/modules/src/index.ts:558]
- **`dsh.client.inject`（包名）≠ client 插件 `export const inject`（service 名）。** 图上的 `inject` 是信息边 / arrival 边。壳 `loader.create({ name })` 只传 name，不把图上的 inject 抄进 entry。[E: packages/client/web/src/boot.ts:129]
- **`immediately` 缺省 false。** 省略该字段的包（多数 `ui-*`）要等 `loader.create` 才 fetch。`immediately: true` 的包在 entry 创建前登记 factory，因为 materialize 会同步 `require` 跨包（fiber inject 护不住这一拍）。
- **`pkgMeta` 永不失效。** 给一个非 client 包事后补上 `dsh.client` 再 HMR，图不会出现它。要重启 host。
- **fiber 重启不重读 bundle。** 只有 `rebuilt(id)` 换 `rev`。没有 `pnpm run dev:web` 时 HMR poll 看不到变化，链空闲。
- **裸 Vite HTTP 200 ≠ 应用就绪。** `__DSH_BOOT__` 只由完整 `dsh web`（web profile）注入。`apps/web` 的 Vite `serve` 在 listen 前被拒。[E: apps/web/vite.config.ts:35]
- **在 `root` 或 modules 行上再 `provide('modules')` 会炸。** `apply` 假定 `createClientModuleSystem` 已跑过；用户 overlay 若再挂一个同名 client 插件，会撞 duplicate factory 或 duplicate provide。
- **combo `cache-control: immutable`。** URL 上的 `&rev=` 是内容键。HMR 可以只推 `rebuilt` 帧而不刷新整图 `rev`；单资源 combo 用新 rev。
- **本包不跑模型 turn。** 图变化不是 session 事件。model-visible ⟺ logged 管的是 agent-preset / 工具集，不是 `__DSH_BOOT__`。
- **五个 profile 里只有 `web` 提供这条缝。** `headless` / `sdk` / `sdk-minimal` / `acp` 的 shipped 模板不叠 `dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:143]

## Seam 三角

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|---|
| `dsh.client` 声明 | `package.json` `dsh.client`：`platform` / `inject?` / `immediately?` / `external?`；`exports["./client"]` | 各双面包自己的 manifest（本包 `immediately: true`） | node 半边 `resolveMeta`；不是 client 或 `platform !== 'web'` → 永久 `null` | 无浏览器 roster，声明存在也不被扫 | 第一段 insert 的 `dsh.client` 行成为扫描输入 | 无 browser roster，声明不被扫 |
| `ctx.clientModules` | `ClientModuleRegistry`；Context 键 `'clientModules'` | **host** 行 `id: modules` `name: '@deepseek-ai/dsh-client-modules'`；`inject: ['webServer','loader']` | `client-hmr`（`rebuilt` / `graph` / `onRebuilt` / `onGraphChanged`）；invariant 同伴 | **无**此行 | **有** | **无**。无 `webServer`，即使手工挂也过不了 inject |
| `window.__DSH_BOOT__` / `WebBootGraph` | `WebBootEntry` + `batches`（`manifest.ts` 单源）；`parseBootManifest` | `bootInjections` ← `webserver/index-inject` ← `renderIndex`（frontend-static 发 index 时） | HTML 门面 + `AppWebEntry.run`；缺/畸形图抛错，boot 页停住 | 无 inject，无图 | 每个 index / SPA fallback 都带活图 | 无 HTTP index |
| `/plugins/??…` combo | prefix `/plugins`；GET/HEAD + 已登记 URL | `ClientModuleRegistry.serveBundle` | 浏览器 `loadBundle`（默认 classic `<script src>`）；devtools 读 indexed map | 无 | 有。exact `/plugins/events` 仍归 HMR | 无 |
| `ctx.modules` / `ClientModuleLoader` | `version: 'client'`；`import`/`prefetch`/`invalidate` | HTML 门面 `createClientModuleSystem`；`./client` `apply` `provide('modules')` | vendored `EntryTree.import` → `internal.import`；HMR 浏览器半 `invalidate`/`prefetch` | 无浏览器 Loader | 有。本包 bootstrap combo 预执行，**不**自拉 | 无 |
| `rebuilt(id)` | `ClientModuleRegistry.rebuilt`：再 hash，rev 变才通知 | 本服务。HMR node 半在 stat 变化时调用 | HMR SSE `type: 'rebuilt'`；图 `rev` 与 combo query | 无 | 无条件 insert `client-hmr`；无 `dev:web` 则空闲 | 无 |

换 Provider（删 `id: modules`）会带走全部 Consumer：页面没有 `__DSH_BOOT__`，壳 `create`/`parseBootManifest` 抛错，HMR 因缺 `clientModules` pending。Definition（线形与服务名）不变。`dsh-base` 与 `dsh-headless`（以及 shipped `sdk` / `sdk-minimal` / `acp`）选择不提供这条缝：它们不是「装了但 dormant」，而是 composition 里没有这行。

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
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/host/webserver/src/index.ts
- packages/host/frontend-static/src/index.ts
- packages/client/web/src/boot.ts
- packages/client/web/src/seed.ts
- packages/client/hmr/src/index.ts
- packages/client/hmr/src/events.ts
- packages/client/tsdown.client.ts
- packages/client/ui-conversation/package.json
- packages/client/connection/package.json
- packages/boot/app-boot/src/profile.ts
- apps/web/src/main.ts
- apps/web/vite.config.ts
- vendor/loader/src/config/tree.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。本页是 client 面如何拿到插件表。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一问；含本服务 index inject + `/plugins`。
- [`subsys.client.web`](web.md) — `AppWebEntry.run`：create 模块表、prefetch `immediately`、fiber sweep、`uiRenderer.mount`。
- [`subsys.client.hmr`](hmr.md) — 运行时装 UI 插件：`rebuilt(id)` + SSE `/plugins/events`。与 web overlay 里 `disabled: true` 的共享 `hmr` 行不是同一条。
- [`subsys.client.runtime`](runtime.md) — `dsh-client-store` + session-controller 客户端 + ui-renderer；旧 `packages/client/runtime` 已删除。
- [`subsys.host.webserver`](../host/webserver.md) — `register` / `renderIndex` / exact-before-prefix。本包是前缀 `/plugins` 与一份 `index-inject` 的 Consumer。
- [`subsys.host.frontend-static`](../host/frontend-static.md) — fallback 发 dist；每个 index 调 `renderIndex`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面与 host insert id 全表（含 `modules`）。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 谁 insert `id: modules`。
- [`subsys.vendor.loader`](../vendor/loader.md) — vendored Loader 的 `internal` 合同；浏览器里必须先注入本表。
